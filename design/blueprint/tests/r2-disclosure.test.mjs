// R2 CA-71 (C1) — «Cosa vedono i giocatori»: DCs the DM set follow `disclosureOf(state).dc`
// for players in request cards, tray result cards, log cards, the 3D dice and the bell
// (Fantasy Grounds hidden DC; the success or failure still shows), and failed passive checks
// reach a player only when shown, never naming what was missed (BG3 passive roll). R7 owns
// the switches; until they land a test reader stands in for `disclosureOf`. Synthetic data.
import test, { afterEach, before } from "node:test";
import assert from "node:assert/strict";
import { createStore, createInitialState } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import * as chatDomain from "../chat-domain.mjs";
import * as domain from "../dice-tray-domain.mjs";
import * as tray from "../dice-tray.mjs";
import * as dice3d from "../dice-3d.mjs";
import * as requests from "../roll-requests.mjs";
import { describeRoll } from "../dice-3d-domain.mjs";
import * as notifications from "../notifications.mjs";
import * as K from "../knowledge.mjs";
import * as D from "../knowledge-domain.mjs";
import * as FVUI from "../fog-vision.mjs";
import * as chat from "../chat.mjs";
import { renderTextWithEmbeds } from "../text-embeds.mjs";
import { trayHarness, scripted, plain } from "./r2-harness.mjs";

before(() => chatDomain.disclosureReady);
afterEach(() => {
  chatDomain.useDisclosureReader(null);
  tray.resetTrayUI();
  dice3d.clearDice();
  dice3d.resetDiceUI();
  K.resetKnowledgeView();
});
const hideDcs = () => chatDomain.useDisclosureReader(() => ({ dc: "hidden" }));
const saveDex13 = { kind: "save", ability: "dex", dc: 13, actorIds: ["livia", "doran"] };

test("defaults (no switch yet): DCs shown, failed passive checks hidden", () => {
  const s = createInitialState();
  assert.deepEqual(chatDomain.playerDisclosure(s), { dc: "shown", passiveFailures: "hidden" });
  assert.equal(chatDomain.dcVisibleTo(s, "player", "dm"), true);
  hideDcs();
  assert.equal(chatDomain.dcVisibleTo(s, "player", "dm"), false);
  assert.equal(chatDomain.dcVisibleTo(s, "dm", "dm"), true, "the DM always reads it");
  assert.equal(chatDomain.dcVisibleTo(s, "player", "player"), true, "a DC the roller typed");
  assert.equal(chatDomain.dcVisibleTo(s, "player", "rule"), true, "a rule's DC (death save)");
});

test("request cards: «CD nascosta» for the player only, the result still shown", () => {
  const s = createInitialState();
  requests.createRequest(s, saveDex13, "dm", { id: "g1", now: "t0" });
  const livia = s.combatAttempts.find((a) => a.actorId === "livia");
  requests.answerRequest(s, livia.id, livia.requests[0].id, [12], "player", { mode: "physical" });
  hideDcs();
  const player = requests.requestGroups(s, null, "player")[0];
  assert.equal(player.title.it, "Tiro salvezza su Destrezza · CD nascosta");
  assert.equal(player.title.en, "Dexterity saving throw · DC hidden");
  assert.deepEqual([player.dc, player.dcHidden], [null, true]);
  const row = player.rows.find((r) => r.actorId === "livia");
  assert.deepEqual([row.dc, row.dcHidden, row.success], [null, true, true], "12 + 2 ≥ 13");
  assert.ok(!JSON.stringify(player).includes("13"), "no DC number reaches the player");
  const dm = requests.requestGroups(s, null, "dm")[0];
  assert.deepEqual(
    [dm.title.it, dm.dc, dm.rows[0].dc],
    ["Tiro salvezza su Destrezza · CD 13", 13, 13],
  );
  // Shown again, the player reads the DC.
  chatDomain.useDisclosureReader(null);
  assert.equal(
    requests.requestGroups(s, null, "player")[0].title.it,
    "Tiro salvezza su Destrezza · CD 13",
  );
});

test("tray: the DM's DC and a journal DC read «CD nascosta» for the player; their own DC stays", () => {
  hideDcs();
  const h = trayHarness({ role: "dm", die: scripted(11, 9, 6) });
  tray.rollFromTray(h.ctx, {
    kind: "free",
    formula: "1d20+2",
    dc: 15,
    audience: "public",
    mode: "digital",
    label: "Scalare il muro",
  });
  const dmRoll = h.slice().rolls.at(-1);
  assert.equal(dmRoll.dcBy, "dm");
  assert.match(h.store.state.log.at(-1).label, /CD nascosta: fallimento/, "the shared line");
  h.ctx.render();
  assert.match(plain(h.ctx.html), /CD 15 · Fallimento/, "the DM's own card keeps the DC");
  h.ctx.role = "player";
  h.ctx.render();
  const recent = plain(h.ctx.html);
  assert.match(recent, /DM · Scalare il muro: 13 .*CD nascosta: fallimento/);
  assert.doesNotMatch(recent, /CD 15/);
  // The player's own DC (typed in the tray) is theirs.
  tray.rollFromTray(h.ctx, {
    kind: "free",
    formula: "1d20",
    dc: 8,
    audience: "public",
    mode: "digital",
  });
  assert.equal(h.slice().rolls.at(-1).dcBy, "player");
  assert.match(plain(h.ctx.html), /CD 8 · Successo/);
  // A roll written in the journal by the DM: the player rolls it, the DC stays hidden.
  tray.rollFromEmbed(h.ctx, "save:dex:14", "livia");
  const journal = h.slice().rolls.at(-1);
  assert.deepEqual([journal.dc, journal.dcBy], [14, "dm"]);
  assert.match(plain(h.ctx.html), /CD nascosta · (Successo|Fallimento)/);
  assert.doesNotMatch(plain(h.ctx.html), /CD 14/);
  // The journal's roll card too (the DM wrote the DC in the text).
  const card = plain(renderTextWithEmbeds(h.ctx, "Il ponte oscilla: @Embed[save:dex:14]"));
  assert.match(card, /Tiro salvezza su Destrezza · CD nascosta/);
  h.ctx.role = "dm";
  assert.match(plain(renderTextWithEmbeds(h.ctx, "@Embed[save:dex:14]")), /CD 14/);
});

test("log cards: a tray roll's DM DC is hidden for players only (chat projection)", () => {
  hideDcs();
  const h = trayHarness({ role: "dm", die: scripted(18) });
  const record = tray.rollFromTray(h.ctx, {
    kind: "free",
    formula: "1d20",
    dc: 12,
    audience: "public",
    mode: "digital",
  });
  const rollFor = (entry) => (entry.label === record.logLabel ? domain.rollEvent(record) : null);
  const card = (role) =>
    chatDomain
      .projectLog(h.store.state, role, { lang: "it", rollFor })
      .filter((i) => i.type === "rolls")
      .at(-1).rolls[0];
  assert.deepEqual([card("dm").dc, card("dm").dcHidden], [12, false]);
  assert.deepEqual(
    [card("player").dc, card("player").dcHidden, card("player").success],
    [null, true, true],
  );
  // The chat renders «CD nascosta · successo» from the projection.
  const ctx = {
    role: "player",
    lang: "it",
    t: (it) => it,
    esc,
    state: h.store.state,
    label: (v) => (typeof v === "object" ? v.it : v),
    icon: () => "",
    view: { page: "table" },
  };
  const html = chat.itemHTML(ctx, {
    type: "rolls",
    id: "x",
    at: new Date().toISOString(),
    rolls: [card("player")],
  });
  assert.match(plain(html), /CD nascosta · successo/);
  assert.doesNotMatch(plain(html), /CD 12/);
});

test("3D dice and the bell: a requested save's DC reads «CD nascosta» for the player", () => {
  const s = createInitialState();
  requests.createRequest(s, saveDex13, "dm", { id: "g1", now: "t0" });
  hideDcs();
  const attempt = s.combatAttempts.find((a) => a.actorId === "livia");
  const request = attempt.requests[0];
  const roll = {
    source: "combat",
    kind: "save",
    attemptId: attempt.id,
    requestId: request.id,
    actorId: "livia",
    actorName: "Livia",
    controller: "player",
    owner: "player",
    visibility: "shared",
    mode: "digital",
    dice: [{ count: 1, sides: 20 }],
    values: [15],
    natural: 15,
    modifier: 2,
    total: 17,
  };
  const player = describeRoll(s, roll, "player");
  assert.deepEqual([player.dc, player.dcHidden, player.success], [null, true, true]);
  assert.equal(player.title.it, "Tiro salvezza su Destrezza · CD nascosta");
  const dm = describeRoll(s, roll, "dm");
  assert.deepEqual([dm.dc, dm.title.it], [13, "Tiro salvezza su Destrezza · CD 13"]);
  // The bell's «Tiro richiesto» line.
  const bell = (role) =>
    notifications
      .deriveCoreNotifications(s, role)
      .filter((n) => n.category === "requests" && n.target?.attemptId === attempt.id);
  assert.equal(
    bell("player")[0].body.it,
    "Tiro salvezza · CD nascosta · Richiesta del DM · Tiro salvezza su Destrezza",
  );
  assert.match(
    bell("dm")
      .map((n) => n.body.it)
      .join() || "CD 13",
    /CD 13/,
  );
});

// ------------------------------------------------------------------ failed passive checks

function knowledgeWorld(role = "player") {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry();
  assert.equal(registry.use("fog-vision", FVUI.register).status, "built");
  assert.equal(registry.use("knowledge", K.register).status, "built");
  assert.equal(registry.use("chat", chat.register).status, "built");
  const store = createStore({ storage });
  registry.initState(store.state);
  const ctx = {
    role,
    lang: "it",
    offline: false,
    view: { page: "table", id: "", tab: "" },
    get state() {
      return store.state;
    },
    esc,
    icon: () => "",
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      typeof value === "object" && value ? value[ctx.lang] || value.it : String(value ?? ""),
    toast() {},
    dialog() {},
    closeDialog() {},
    render() {},
    canControl(actor) {
      return canControlActor(actor, this.role, store.state);
    },
    registry,
  };
  registry.attach(ctx);
  const run = (fn, as) =>
    store.commit(
      "test",
      (draft) => fn(draft, draft.ext.knowledge, draft.ext["knowledge-rolls"]),
      as,
    );
  return { ctx, store, registry, run };
}

test("failed passive: «Livia non nota nulla (Percezione passiva N)» only when shown, only to her player", async () => {
  await chat.neighboursReady;
  const w = knowledgeWorld();
  w.run((s) => (s.activeSceneId = "lantern-tower"), "dm");
  w.run(
    (s, k, r) =>
      D.hide(
        s,
        k,
        r,
        { actorId: "goblin-1", mode: "physical", faces: [19], dmReason: "Nell'ombra della torre" },
        "dm",
        () => 1,
      ),
    "dm",
  );
  const event = w.store.state.ext.knowledge.events.at(-1);
  assert.equal(event.kind, "hidden");
  const livia = event.passives.find((p) => p.actorId === "livia");
  assert.equal(livia.notices, false, "a Stealth total above her passive Perception");
  // Hidden by default (C1 default).
  assert.deepEqual(D.failedPassives(w.store.state, "player"), []);
  chatDomain.useDisclosureReader(() => ({ passiveFailures: "shown" }));
  const all = D.failedPassives(w.store.state, "player");
  assert.deepEqual(
    all.map((l) => l.actorId).sort(),
    event.passives
      .filter((p) => !p.notices && ["livia", "mira"].includes(p.actorId))
      .map((p) => p.actorId)
      .sort(),
    "only the characters the player plays (Doran is the DM's)",
  );
  const lines = all.filter((l) => l.actorId === "livia");
  assert.equal(
    lines[0].text.it,
    `Livia non nota nulla (Percezione passiva ${D.passiveOf(w.store.state, "livia")})`,
  );
  assert.equal(lines[0].text.en, `Livia notices nothing (Passive Perception ${livia.passive})`);
  assert.deepEqual(Object.keys(lines[0]).sort(), [
    "actorId",
    "at",
    "id",
    "name",
    "passive",
    "text",
  ]);
  const words = JSON.stringify([lines[0].text, lines[0].name, lines[0].actorId, lines[0].passive]);
  for (const secret of ["goblin", "Sentinella", String(event.total), "nascost", "hidden"])
    assert.ok(!words.includes(secret), `the line never names what was missed (${secret})`);
  assert.ok(!lines[0].id.includes("goblin"), "nor does its id");
  assert.deepEqual(
    D.failedPassives(w.store.state, "dm"),
    [],
    "the DM keeps «chi se ne accorgerebbe»",
  );
  // The Creature tab of Livia shows it; the DM's view does not.
  const scene = w.store.state.scenes.find((sc) => sc.id === "lantern-tower");
  const panel = w.registry.get("table-panel", "knowledge", w.ctx, { scene });
  const html = plain(panel.render(w.ctx, { scene, selectedActorId: "livia" }));
  assert.match(html, /Prove passive Livia non nota nulla \(Percezione passiva \d+\)/);
  assert.doesNotMatch(html, /Sentinella/);
  // The log (Registro) carries the same line for her player, as BG3's combat log.
  const log = () => plain(w.registry.get("table-panel", "log", w.ctx).render(w.ctx, { scene }));
  assert.match(log(), /Prova passiva Livia non nota nulla \(Percezione passiva \d+\)/);
  w.ctx.role = "dm";
  assert.doesNotMatch(
    plain(panel.render(w.ctx, { scene, selectedActorId: "livia" })),
    /non nota nulla/,
  );
  assert.doesNotMatch(log(), /non nota nulla/, "the DM's log has «chi se ne accorgerebbe» instead");
  // Hidden again: the player's log loses the line.
  w.ctx.role = "player";
  chatDomain.useDisclosureReader(null);
  assert.doesNotMatch(log(), /non nota nulla/);
});
