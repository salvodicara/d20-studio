// Hand-offs of audit round 2 — rules and engine. A DM request with Bless: the Heroic
// Inspiration reroll scores the d20 and the rider through combat.requestScore, and the
// physical faces dialog asks the Bless d4 as a d4 (PG-47, SRD 5.2.1 Heroic Inspiration:
// reroll any die). Synthetic demo data only.
import test, { before, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createInitialState, createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { neighboursReady } from "../combat.mjs";
import * as SP from "../sheet-plus-domain.mjs";
import * as domain from "../dice-tray-domain.mjs";
import * as requests from "../roll-requests.mjs";
import * as tray from "../dice-tray.mjs";

before(async () => {
  await neighboursReady;
});
afterEach(() => tray.resetTrayUI());

const refusal = (fn, pattern) =>
  assert.throws(fn, (error) => {
    assert.match(error.it ?? error.message, pattern);
    return true;
  });
const blessed = () => {
  const s = createInitialState();
  s.ext ??= {};
  s.ext[SP.ID] = SP.seedSlice(s);
  SP.toggleEffect(s, "livia", "bless", true, "player");
  requests.createRequest(s, { kind: "save", ability: "dex", dc: 13, actorIds: ["livia"] }, "dm", {
    id: "g1",
  });
  return s;
};

test("PG-47: the Heroic Inspiration reroll of a blessed save scores the d20 and the d4 (combat.requestScore)", () => {
  const s = blessed();
  const slice = domain.seedSlice();
  const liv = s.combatAttempts[0];
  const request = liv.requests[0];
  assert.deepEqual(
    request.dice.map((d) => d.sides),
    [20, 4],
  );
  requests.answerRequest(s, liv.id, request.id, [8, 3], "player");
  assert.equal(request.total, 8 + 3 + 2);
  domain.setInspiration(slice, s, "livia", true, "player", "t");
  const reroll = requests.rerollRequest(slice, s, liv.id, request.id, 0, "player", { face: 12 });
  assert.deepEqual(
    [reroll.values, reroll.natural, reroll.total, reroll.success],
    [[12, 3], 12, 12 + 3 + 2, true],
  );
  assert.deepEqual(reroll.riderRolls?.[0]?.faces, [3]);
  // Any die may be rerolled (SRD 5.2.1): the Bless d4 keeps its own sides.
  const d4 = blessed();
  const d4Slice = domain.seedSlice();
  const attempt = d4.combatAttempts[0];
  requests.answerRequest(d4, attempt.id, attempt.requests[0].id, [8, 1], "player");
  domain.setInspiration(d4Slice, d4, "livia", true, "player", "t");
  refusal(
    () =>
      requests.rerollRequest(d4Slice, d4, attempt.id, attempt.requests[0].id, 1, "player", {
        face: 7,
      }),
    /tra 1 e 4/,
  );
  const again = requests.rerollRequest(
    d4Slice,
    d4,
    attempt.id,
    attempt.requests[0].id,
    1,
    "player",
    {
      face: 4,
    },
  );
  assert.deepEqual([again.values, again.natural, again.total], [[8, 4], 8, 8 + 4 + 2]);
});

test("PG-47: the physical faces of a blessed request ask a d20 and a d4 named «Benedizione»", () => {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const store = createStore({ storage });
  const registry = createRegistry({ document: undefined, logger: null, deviceStorage: storage });
  assert.equal(registry.use("dice-tray", tray.register).status, "built");
  registry.initState(store.state);
  const ctx = {
    get state() {
      return store.state;
    },
    role: "dm",
    lang: "it",
    offline: false,
    view: { page: "table", id: "", tab: "" },
    registry,
    esc,
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) => (typeof v === "object" && v ? v[ctx.lang] || v.it : String(v ?? "")),
    icon: () => "",
    toast() {},
    dialog(title, body, options = {}) {
      this.dialogState = { title, body, options };
    },
    closeDialog() {},
    canControl: () => true,
    commit(label, mutate, options = {}) {
      const before = store.state;
      store.commit(label, mutate, this.role, { visibility: options.visibility });
      registry.emitStateEvents(before, store.state);
      return { applied: true, persisted: true };
    },
    render() {},
  };
  registry.attach(ctx);
  ctx.commit("setup", (s) => {
    s.ext ??= {};
    s.ext[SP.ID] = SP.seedSlice(s);
    SP.toggleEffect(s, "livia", "bless", true, "player");
    requests.createRequest(s, { kind: "save", ability: "dex", dc: 13, actorIds: ["livia"] }, "dm", {
      id: "g1",
    });
  });
  ctx.role = "player";
  registry.setSetting(ctx, "dice-tray.dice", "physical");
  const requestId = store.state.combatAttempts[0].requests[0].id;
  tray.rollRequestFromCard(ctx, requestId);
  const body = ctx.dialogState.body;
  assert.match(body, /d20<input[^>]*name="face-0"[^>]*max="20"/);
  assert.match(body, /d4 \(Benedizione\)<input[^>]*name="face-1"[^>]*max="4"/);
  ctx.dialogState.options.onSubmit({ get: (k) => ({ "face-0": "9", "face-1": "2" })[k] ?? null });
  const request = store.state.combatAttempts[0].requests[0];
  assert.deepEqual([request.values, request.total], [[9, 2], 9 + 2 + 2]);
});

test("TV-95: the sheet's roll window offers «Dado connesso» with a paired d20 and records its faces as physical", async () => {
  const { harness } = await import("./p4-harness.mjs");
  const sheetPlus = await import("../sheet-plus.mjs");
  const h = harness({
    role: "player",
    areas: [["sheet-plus", sheetPlus.register]],
    view: { page: "characters", id: "livia", tab: "actions" },
  });
  // Without a paired die the window keeps «Digitali» and «Fisici» only.
  sheetPlus._test.setConnectedDice(null);
  sheetPlus._test.rollDialog(h.ctx, "livia", "save", "dex");
  assert.doesNotMatch(h.dialogs.at(-1).body, /value="connected"/);
  // C6 (dice-tray): a paired d20 answers the throw (Pixels, simulated).
  const asked = [];
  sheetPlus._test.setConnectedDice({
    hasConnectedDie: (ctx, sides) => sides === 20,
    awaitConnectedFaces: (ctx, input) => {
      asked.push(input);
      return Promise.resolve(
        Object.assign([14], {
          faceModes: ["connected"],
          devices: [{ it: "Pixels d20 Onice", en: "Pixels d20 Onyx" }],
        }),
      );
    },
  });
  sheetPlus._test.rollDialog(h.ctx, "livia", "save", "dex");
  const body = h.dialogs.at(-1).body;
  assert.match(body, /value="connected"/);
  assert.match(body, /Dado connesso/);
  await h.submit({ rollMode: "normal", mode: "connected" });
  assert.deepEqual(h.errors(), []);
  assert.deepEqual(
    asked.map((a) => [a.actorId, a.sides, a.count]),
    [["livia", 20, 1]],
  );
  const roll = h.store.state.ext["sheet-plus-rolls"].rolls.at(-1);
  assert.deepEqual([roll.mode, roll.values, roll.natural], ["physical", [14], 14]);
  // The log card the host attaches after the commit (app afterCommit) names the die.
  const logged = SP.logRollOf(roll);
  assert.equal(logged.mode, "physical");
  assert.deepEqual(logged.devices, [{ it: "Pixels d20 Onice", en: "Pixels d20 Onyx" }]);
  // A die that does not answer records nothing and says how to go on.
  sheetPlus._test.setConnectedDice({
    hasConnectedDie: () => true,
    awaitConnectedFaces: () => Promise.resolve(null),
  });
  const before = h.store.state.ext["sheet-plus-rolls"].rolls.length;
  sheetPlus._test.rollDialog(h.ctx, "livia", "save", "dex");
  await h.submit({ rollMode: "normal", mode: "connected" });
  assert.equal(h.store.state.ext["sheet-plus-rolls"].rolls.length, before);
  assert.match(h.errors().at(-1), /scegli «Fisici»/);
  sheetPlus._test.setConnectedDice(undefined);
});

test("PG-47: the Table panel no longer says the engine does not add Bless (it rolls it with the d20)", async () => {
  const { harness } = await import("./p4-harness.mjs");
  const sheetPlus = await import("../sheet-plus.mjs");
  const h = harness({
    role: "player",
    areas: [["sheet-plus", sheetPlus.register]],
    view: { page: "table", id: "", tab: "" },
  });
  h.ctx.commit("bless", (s) => SP.toggleEffect(s, "livia", "bless", true, "player"));
  const html = sheetPlus._test.renderTablePanel(h.ctx, { selectedActorId: "livia" });
  assert.match(html, /Benedizione/);
  assert.doesNotMatch(html, /non somma ancora/);
  assert.match(html, /si tira insieme al d20/);
});

test("TV-52: identical creatures that share an initiative key are one row and one d20 in «Avvia combattimento»", async () => {
  // The tracker first: encounter-builder-domain loads through it (R4's note on the cycle).
  const CT = await import("../combat-tracker-domain.mjs");
  const UI = await import("../combat-tracker.mjs");
  const { AMBUSH_SCENE_ID, AMBUSH_GOBLINS } = await import("../state.mjs");
  const { harness } = await import("./p5-harness.mjs");
  const h = harness({ role: "dm" });
  const state = () => h.ctx.state;
  const rows = CT.startCandidates(state(), AMBUSH_SCENE_ID);
  const goblins = rows.filter((r) => AMBUSH_GOBLINS.includes(r.actorId));
  assert.equal(goblins.length, 2);
  assert.equal(goblins[0].groupKey, goblins[1].groupKey);
  assert.ok(!goblins[0].groupKey.startsWith("actor:"));
  // One row in the dialog: «Goblin guerriero A, B», one d20 field and one roll button.
  UI.openTableInitiative(h.ctx, AMBUSH_SCENE_ID);
  const body = h.dialogs.at(-1).body;
  assert.match(body, /<strong>Goblin guerriero A, B<\/strong>/);
  assert.equal((body.match(/data-ct-start-natural="goblin-warrior-/g) ?? []).length, 1);
  assert.match(body, /data-ct-start-group="goblin-warrior-a goblin-warrior-b"/);
  // «Tira PNG»: one die for the group, recorded for each member.
  h.ctx.commit("npc", (draft) => {
    CT.rollStartRows(draft, AMBUSH_SCENE_ID, rows, "npc", "dm");
  });
  const [a, b] = AMBUSH_GOBLINS.map((id) => rows.find((r) => r.actorId === id));
  assert.ok(Number.isInteger(a.natural));
  assert.equal(a.natural, b.natural, "one d20 for the group");
  const ledger = state().initiativeRolls.filter((r) => AMBUSH_GOBLINS.includes(r.actorId));
  assert.equal(ledger.length, 2, "recorded for each member");
  assert.equal(ledger[0].natural, ledger[1].natural);
  // A roll asked for one member of the group rolls the group.
  const fresh = CT.startCandidates(state(), AMBUSH_SCENE_ID).map((r) =>
    AMBUSH_GOBLINS.includes(r.actorId) ? { ...r, natural: null, rollId: undefined } : r,
  );
  h.ctx.commit("one", (draft) => {
    CT.rollStartRows(draft, AMBUSH_SCENE_ID, fresh, [AMBUSH_GOBLINS[0]], "dm");
  });
  const [fa, fb] = AMBUSH_GOBLINS.map((id) => fresh.find((r) => r.actorId === id));
  assert.ok(Number.isInteger(fb.natural));
  assert.equal(fa.natural, fb.natural);
  // Individual initiative keeps two rows (PR-35): Livia and Doran are never grouped.
  const party = rows.filter((r) => ["livia", "doran"].includes(r.actorId));
  assert.notEqual(party[0].groupKey, party[1].groupKey);
});
