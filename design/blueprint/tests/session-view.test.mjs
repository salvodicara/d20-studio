// B14 — Table: presentation, session state and presence. Domain rules and the UI command
// layer run against the real store and registry, with the same commit/undo hooks as
// app.mjs. Synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc, icon } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import { renderTable, resetTableView } from "../table.mjs";
import {
  listCampaignDrafts,
  getCampaignDraft,
  previewCampaignDraft,
} from "../campaign-content.mjs";
import * as sv from "../session-view.mjs";

const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
  };
};

/** A small host: real store, registry with the area, and the app's commit/undo hooks. */
function host({ storage = memory(), role = "dm", lang = "it", areas = {} } = {}) {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  registry.use("session-view", sv.register);
  for (const [id, register] of Object.entries(areas)) registry.use(id, register);
  const store = createStore({ storage });
  // These checks start from a calendar without the example's «Il sigillo della torre» (the coming
  // Thursday, sample-clock.mjs), so no evening is linked to it on the day it falls.
  store.state.campaign.sessions = [];
  if (registry.initState(store.state).changed) store.persist();
  const toasts = [];
  let currentRole = role;
  let offline = false;
  const ctx = {
    get state() {
      return store.state;
    },
    get role() {
      return currentRole;
    },
    set role(value) {
      currentRole = value;
    },
    get offline() {
      return offline;
    },
    set offline(value) {
      offline = value;
    },
    lang,
    view: { page: "table", id: "", tab: "" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      typeof value === "object" && value ? value[ctx.lang] || value.it : String(value ?? ""),
    esc,
    icon,
    toasts,
    canControl: (actor) => canControlActor(actor, currentRole, store.state),
    toast: (text, error = false) => toasts.push({ text, error }),
    render: () => {},
    navigate: () => {},
    dialog: () => {},
    closeDialog: () => {},
    openSheet: () => {},
    undoLabel: () => store.history.at(-1)?.label ?? "",
    commit(label, mutator, options = {}) {
      // As app.mjs: a closed access gate (a detached display) changes nothing.
      const gate = registry.accessGate(ctx);
      if (gate) throw Object.assign(Error(gate.message.en), { ...gate.message });
      if (offline && !options.local) {
        const it = "Sei senza rete: questa modifica condivisa non può essere applicata.";
        throw Object.assign(Error(it), {
          it,
          en: "You are offline: this shared change cannot be applied.",
        });
      }
      const before = store.state;
      store.commit(label, mutator, currentRole, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(currentRole);
      registry.afterUndo(current, store.state);
      store.persist();
      registry.emitStateEvents(current, store.state, { kind: "correction" });
    },
    registry,
  };
  registry.attach(ctx);
  return { ctx, store, registry, storage, toasts };
}
const slice = (app) => sv.readSession(app.store.state);
const refusal = (fn, pattern) =>
  assert.throws(fn, (error) => typeof error.it === "string" && pattern.test(error.it));
function addCrypt(app) {
  app.ctx.commit("Cripta", (d) => {
    d.scenes.push({
      ...structuredClone(d.scenes[0]),
      id: "crypt",
      name: "Cripta",
      description: "NOTA DM: il sarcofago è una trappola",
      revealed: false,
      tokens: [],
    });
  });
}

test("the area registers cleanly: slices, cover/drawer/HUD, display route, commands, settings", () => {
  const app = host();
  assert.equal(app.registry.report().failed.length, 0);
  assert.equal(app.store.state.extVersions["session-view"], 1);
  assert.equal(app.store.state.extVersions["session-view-stories"], 1);
  assert.ok(app.store.state.ext["session-view"].gate);
  assert.deepEqual(app.store.state.ext["session-view-stories"], { stories: [] });
  const panels = app.registry.list("table-panel", { ...app.ctx, role: "dm" });
  // B61: the DM's controls are a tab of the Table's right sidebar (the old "drawer").
  assert.ok(panels.some((c) => c.id === "session-view-controls" && c.placement === "sidebar-tab"));
  // The DM tab is invisible to players; the cover shows only when it has something to cover.
  assert.ok(
    !app.registry
      .list("table-panel", { ...app.ctx, role: "player" })
      .some((c) => c.placement === "sidebar-tab"),
  );
  assert.ok(
    !app.registry
      .list("table-panel", { ...app.ctx, role: "player" })
      .some((c) => c.placement === "cover"),
  );
  assert.equal(app.registry.get("map-layer", "session-view-hud").order, 95);
  assert.ok(app.registry.get("route", "session-view-display"));
  assert.equal(app.registry.get("route", "session-view-display").nav, undefined);
  const keys = app.registry
    .list("command", app.ctx)
    .map((c) => c.shortcut)
    .filter(Boolean);
  assert.deepEqual(keys.sort(), ["Home", "Mod+Shift+H", "Shift+Home"]);
  assert.equal(app.registry.conflicts().length, 0);
  assert.equal(app.registry.getSetting(app.ctx, "session-view-campaign.idle"), 55);
  assert.equal(app.registry.getSetting(app.ctx, "session-view-personal.center"), true);
});

test("normalize is idempotent, keeps valid data and refuses a newer version", () => {
  const raw = {
    gate: { hidden: true, message: "x".repeat(300) },
    pause: { active: true, since: 5 },
    sessions: [
      {
        id: "s1",
        number: 1,
        status: "ended",
        startedAt: 1,
        endedAt: 9,
        pauses: [{ from: 2, to: 3 }],
        scenes: [{ sceneId: "old-watch", name: "A", from: 1, to: 9 }],
        presence: [
          { memberId: "player", status: "away", message: "brb", at: 4 },
          { memberId: "x", status: "bogus" },
        ],
      },
    ],
    presence: {
      player: { status: "away", message: "torno subito", at: 3 },
      dm: { status: "nope" },
    },
    split: { doran: { sceneId: "crypt", home: { sceneId: "old-watch", x: 1, y: 2 } } },
    timer: { remainingMs: -5, running: true, endsAt: "bad" },
    clocks: [
      { id: "c1", label: "Rituale", segments: 6, filled: 9 },
      { id: "c2", segments: 5 },
    ],
    pin: { clockId: "c1", revision: 3 },
    display: { cellMm: 999, ppi: 5 },
  };
  const once = sv.normalizeSession(raw, 1);
  assert.equal(once.gate.message.length, 200);
  assert.equal(once.sessions[0].presence.length, 1);
  assert.deepEqual(Object.keys(once.presence), ["player"]);
  assert.equal(once.timer.running, false);
  assert.equal(once.timer.remainingMs, 0);
  assert.equal(once.clocks.length, 1);
  assert.equal(once.clocks[0].filled, 6);
  assert.equal(once.pinSeq, 3);
  assert.deepEqual(once.display, { cellMm: 60, ppi: 40, ruler: false });
  assert.deepEqual(sv.normalizeSession(once, 1), once);
  assert.throws(() => sv.normalizeSession(raw, 2), /newer version/);
  assert.deepEqual(sv.normalizeSession(undefined, 0), sv.seedSession());
});

test("presentation gate: hide, private scene change, show; each state has its own player message", () => {
  const app = host();
  addCrypt(app);
  assert.equal(sv.presentationFor(app.store.state, "player").kind, "table");
  sv.actions.hide(app.ctx);
  let gate = sv.presentationFor(app.store.state, "player");
  assert.deepEqual([gate.kind, gate.reason], ["waiting", "not-started"]);
  // Players cannot hide, show, pause or start.
  app.ctx.role = "player";
  refusal(() => sv.actions.show(app.ctx), /Solo il DM/);
  refusal(() => sv.actions.pause(app.ctx), /Solo il DM/);
  refusal(() => sv.actions.start(app.ctx), /Solo il DM/);
  app.ctx.role = "dm";
  sv.actions.start(app.ctx, { hidden: true });
  gate = sv.presentationFor(app.store.state, "player");
  assert.equal(gate.reason, "preparing");
  sv.actions.message(app.ctx, "Dieci minuti di pausa");
  sv.actions.switchScene(app.ctx, "crypt");
  const entry = app.store.state.log.at(-1);
  // The private switch names the scene only in a private audit entry.
  assert.equal(entry.visibility, "private");
  assert.match(entry.label, /Cripta/);
  assert.equal(app.store.state.activeSceneId, "crypt");
  assert.equal(sv.presentationFor(app.store.state, "player").message, "Dieci minuti di pausa");
  sv.actions.show(app.ctx);
  assert.equal(sv.presentationFor(app.store.state, "player").kind, "table");
  const session = sv.currentSession(slice(app));
  assert.deepEqual(
    session.scenes.map((s) => s.sceneId),
    ["old-watch", "crypt"],
  );
  // A shown switch is shared but does not name the scene.
  sv.actions.switchScene(app.ctx, "old-watch");
  assert.equal(app.store.state.log.at(-1).visibility, "shared");
  assert.doesNotMatch(app.store.state.log.at(-1).label, /Cripta|cortile/i);
  refusal(() => sv.actions.show(app.ctx), /già visibile/);
});

test("the player's Table is covered while hidden: no scene name, token or DM note in the markup", () => {
  const app = host();
  addCrypt(app);
  sv.actions.hide(app.ctx);
  sv.actions.switchScene(app.ctx, "crypt");
  resetTableView();
  app.ctx.role = "player";
  const html = renderTable(app.ctx);
  assert.match(html, /class="table-cover"/);
  assert.match(html, /Il DM non ha ancora avviato la sessione/);
  assert.match(html, /data-sv-tip-text/);
  assert.doesNotMatch(html, /Cripta|cortile|NOTA DM|data-actor=|battle-map/);
  // The DM keeps the real Table with the hidden notice on the map HUD.
  app.ctx.role = "dm";
  const dm = renderTable(app.ctx);
  assert.match(dm, /id="battle-map"/);
  assert.match(dm, /Scena nascosta ai giocatori/);
  assert.match(dm, /data-table-drawer="session-view-controls"/);
});

test("pause stops player movement (not the DM's) and records the pause in the session", () => {
  const app = host();
  sv.actions.start(app.ctx);
  sv.actions.pause(app.ctx, "Pausa caffè");
  assert.equal(sv.movementLocked(app.store.state, "player"), true);
  assert.equal(sv.movementLocked(app.store.state, "dm"), false);
  resetTableView();
  app.ctx.role = "player";
  const html = renderTable(app.ctx);
  assert.match(html, /session-view-paused/);
  assert.match(html, /In pausa/);
  assert.match(html, /Pausa caffè/);
  app.ctx.role = "dm";
  refusal(() => sv.actions.pause(app.ctx), /già in pausa/);
  sv.actions.resume(app.ctx);
  assert.equal(sv.movementLocked(app.store.state, "player"), false);
  const pauses = sv.currentSession(slice(app)).pauses;
  assert.equal(pauses.length, 1);
  assert.ok(Number.isFinite(pauses[0].to));
});

test("presence: own status only, visible to the party, recorded for attendance; on behalf is labelled", () => {
  const app = host();
  sv.actions.start(app.ctx);
  app.ctx.role = "player";
  refusal(() => sv.actions.presence(app.ctx, "dm", { status: "away" }), /solo il tuo stato/);
  refusal(() => sv.actions.presence(app.ctx, "player", { status: "gone" }), /Presente o Assente/);
  refusal(
    () => sv.actions.presence(app.ctx, "player", { status: "away", message: "x".repeat(81) }),
    /80 caratteri/,
  );
  sv.actions.presence(app.ctx, "player", { status: "away", message: "torno subito" });
  assert.equal(app.store.state.log.at(-1).label, "Livia: assente — torno subito");
  assert.equal(app.store.state.log.at(-1).visibility, "shared");
  app.ctx.role = "dm";
  assert.deepEqual(sv.presenceOf(slice(app), "player"), {
    status: "away",
    message: "torno subito",
    at: sv.presenceOf(slice(app), "player").at,
  });
  const hud = renderTable(app.ctx);
  assert.match(hud, /Livia: assente — torno subito/);
  // The DM may set it only as "view as", and the log says "DM per Livia".
  refusal(() => sv.actions.presence(app.ctx, "player", { status: "here" }), /solo il tuo stato/);
  sv.actions.presence(app.ctx, "player", { status: "here" }, { onBehalf: true });
  assert.equal(app.store.state.log.at(-1).label, "DM per Livia · Presente");
  const presence = sv
    .currentSession(slice(app))
    .presence.filter((row) => row.memberId === "player");
  assert.deepEqual(
    presence.map((row) => row.status),
    ["here", "away", "here"],
  );
});

test("split party: Doran to the Crypt with ribbons, refusals, Regroup back to the same spot, Undo", () => {
  const app = host();
  addCrypt(app);
  const start = app.store.state.scenes[0].tokens.find((t) => t.actorId === "doran");
  refusal(() => sv.actions.move(app.ctx, [], "crypt"), /almeno un personaggio/);
  refusal(() => sv.actions.move(app.ctx, ["goblin-1"], "crypt"), /non disponibile/);
  sv.actions.move(app.ctx, ["doran"], "crypt");
  assert.equal(app.store.state.log.at(-1).label, "Doran si separa dal gruppo");
  const courtyard = app.store.state.scenes.find((s) => s.id === "old-watch");
  const crypt = app.store.state.scenes.find((s) => s.id === "crypt");
  assert.ok(!courtyard.tokens.some((t) => t.actorId === "doran"));
  assert.equal(crypt.tokens.filter((t) => t.actorId === "doran").length, 1);
  const { ribbons } = sv.partyRibbons(app.store.state);
  assert.deepEqual(
    ribbons.map((r) => [r.sceneId, r.main, r.actorIds.join(",")]),
    [
      ["old-watch", true, "livia,mira"],
      ["crypt", false, "doran"],
    ],
  );
  // Players do not read the breakout scene's name for someone else's character.
  app.ctx.role = "player";
  resetTableView();
  const player = renderTable(app.ctx);
  // P10 TV-115: a ribbon per group on the map; another player's unrevealed scene stays unnamed.
  assert.match(player, /un’altra scena<\/strong>[\s\S]*?<span>Doran<\/span>/);
  assert.doesNotMatch(player, /Cripta/);
  app.ctx.role = "player";
  refusal(() => sv.actions.regroup(app.ctx), /Solo il DM/);
  app.ctx.role = "dm";
  sv.actions.regroup(app.ctx);
  const back = app.store.state.scenes[0].tokens.find((t) => t.actorId === "doran");
  assert.deepEqual([back.x, back.y, back.id], [start.x, start.y, start.id]);
  assert.ok(!app.store.state.scenes.find((s) => s.id === "crypt").tokens.length);
  refusal(() => sv.actions.regroup(app.ctx), /già riunito/);
  // Undo of the split restores token and ribbon together.
  sv.actions.move(app.ctx, ["doran"], "crypt");
  app.ctx.undo();
  assert.ok(app.store.state.scenes[0].tokens.some((t) => t.actorId === "doran"));
  assert.deepEqual(sv.readSession(app.store.state).split, {});
  // A combatant cannot be split away mid-encounter.
  app.ctx.commit("combat", (d) => {
    d.combat.active = true;
  });
  refusal(() => sv.actions.move(app.ctx, ["doran"], "crypt"), /ordine d’iniziativa/);
});

test("a player whose characters are all in another scene plays that scene: own tokens, sheet, party", () => {
  const app = host();
  addCrypt(app);
  sv.actions.move(app.ctx, ["livia", "mira"], "crypt");
  const view = sv.presentationFor(app.store.state, "player");
  assert.deepEqual([view.kind, view.sceneId, view.party], ["breakout", "crypt", false]);
  resetTableView();
  app.ctx.role = "player";
  const html = renderTable(app.ctx);
  assert.match(html, /session-view-breakout/);
  assert.match(html, /Cripta/);
  assert.doesNotMatch(html, /NOTA DM/);
  assert.doesNotMatch(html, /battle-map/);
  // Roll20 page: the player's own tokens, sheet (checks and saves with physical or digital
  // dice), party status and notes — no longer a picture without controls.
  for (const text of [
    "data-sv-behalf-map",
    'data-sv-move-mode="scene"',
    'data-sv-behalf-pick="livia"',
    'data-sv-behalf-pick="mira"',
    'data-sv-sheet="livia"',
    'data-sv="group"',
    'data-sv="notes"',
    'data-sv="behalf-confirm"',
  ])
    assert.ok(html.includes(text), text);
  const crypt = () => app.store.state.scenes.find((s) => s.id === "crypt");
  const before = crypt().tokens.find((t) => t.actorId === "livia");
  const preview = sv.previewSceneMove(app.store.state, "player", "livia", {
    x: before.x + 100,
    y: before.y,
  });
  assert.equal(preview.blocked, false);
  assert.equal(preview.sceneId, "crypt");
  sv.actions.moveInScene(app.ctx, "livia", { x: before.x + 100, y: before.y });
  assert.equal(crypt().tokens.find((t) => t.actorId === "livia").x, before.x + 100);
  assert.equal(app.store.state.log.at(-1).label, "Livia: movimento nella scena separata");
  // Only own characters, never at the Table's scene, never while paused.
  refusal(() => sv.actions.moveInScene(app.ctx, "doran", { x: 100, y: 100 }), /Non controlli/);
  app.ctx.role = "dm";
  sv.actions.pause(app.ctx);
  app.ctx.role = "player";
  refusal(() => sv.actions.moveInScene(app.ctx, "livia", { x: 300, y: 300 }), /in pausa/);
  app.ctx.role = "dm";
  sv.actions.resume(app.ctx);
  // The DM acting for the player ("view as") on that scene is labelled "DM per Livia".
  sv.actions.moveInScene(app.ctx, "mira", { x: 400, y: 300 }, { onBehalf: "player" });
  assert.equal(
    app.store.state.log.at(-1).label,
    "DM per Livia · Mira: movimento nella scena separata",
  );
  sv.uiState.viewAs = "player";
  resetTableView();
  const asPlayer = renderTable(app.ctx);
  assert.match(asPlayer, /Stai vedendo il Tavolo come Livia/);
  assert.match(asPlayer, /data-sv-for="player"/);
  assert.match(asPlayer, /Conferma movimento per Livia/);
  sv.resetUI();
});

test("countdown: add, subtract, start, pause, reset; remaining time hidden from players", () => {
  const app = host();
  const at = 1_000_000;
  sv.adjustTimer(app.store.state, "dm", 0, at); // no-op read on the live state is not a commit
  refusal(() => sv.startTimer(structuredClone(app.store.state), "dm", at), /Aggiungi del tempo/);
  app.ctx.commit("t", (d) => sv.adjustTimer(d, "dm", 5 * 60000, at));
  app.ctx.commit("t", (d) => sv.adjustTimer(d, "dm", -10000, at));
  assert.equal(slice(app).timer.remainingMs, 290000);
  app.ctx.commit("t", (d) => sv.adjustTimer(d, "dm", 20000, at));
  app.ctx.commit("t", (d) =>
    sv.configureTimer(d, "dm", { label: "La porta si chiude", hideRemaining: true }),
  );
  app.ctx.commit("t", (d) => sv.startTimer(d, "dm", at));
  assert.equal(sv.timerRemaining(slice(app).timer, at + 60000), 250000);
  assert.equal(sv.timerView(slice(app), "dm", at + 60000).remainingMs, 250000);
  const player = sv.timerView(slice(app), "player", at + 60000);
  assert.deepEqual(
    [player.hidden, player.remainingMs, player.label],
    [true, null, "La porta si chiude"],
  );
  assert.equal(sv.timerView(slice(app), "spectator", at).hidden, true);
  app.ctx.commit("t", (d) => sv.adjustTimer(d, "dm", 60000, at + 60000));
  assert.equal(sv.timerRemaining(slice(app).timer, at + 60000), 310000);
  app.ctx.commit("t", (d) => sv.pauseTimer(d, "dm", at + 120000));
  assert.equal(slice(app).timer.remainingMs, 250000);
  assert.equal(sv.timerView(slice(app), "player", at).running, false);
  app.ctx.commit("t", (d) => sv.startTimer(d, "dm", at + 200000));
  assert.equal(sv.timerView(slice(app), "player", at + 200000 + 249000).expired, false);
  const expired = sv.timerView(slice(app), "player", at + 200000 + 250000);
  assert.equal(expired.expired, true);
  app.ctx.commit("t", (d) => sv.resetTimer(d, "dm"));
  assert.equal(sv.timerView(slice(app), "dm", at), null);
  refusal(() => sv.configureTimer(structuredClone(app.store.state), "player", {}), /Solo il DM/);
  assert.equal(sv.formatDuration(65000), "1:05");
  assert.equal(sv.formatDuration(3723000), "1:02:03");
  // Adjustments are private in the log while the remaining time is hidden.
  sv.actions.timerAdd(app.ctx, 60000);
  assert.equal(app.store.state.log.at(-1).visibility, "private");
});

test("progress clocks: one pinned at a time, players can close it until it is pinned again", () => {
  const app = host();
  const ritual =
    sv.actions.clockAdd(app.ctx, { label: "Il rituale", segments: 6 }) && slice(app).clocks[0].id;
  sv.actions.clockAdd(app.ctx, { label: "Le guardie", segments: 4 });
  refusal(() => sv.actions.clockAdd(app.ctx, { label: "", segments: 6 }), /nome/);
  refusal(() => sv.actions.clockAdd(app.ctx, { label: "x", segments: 5 }), /4, 6 o 8/);
  sv.actions.clockFill(app.ctx, ritual, 3);
  // Unpinned clock edits stay private.
  assert.equal(app.store.state.log.at(-1).visibility, "private");
  refusal(() => sv.actions.clockFill(app.ctx, ritual, 7), /fuori/);
  sv.actions.clockPin(app.ctx, ritual);
  assert.equal(sv.pinnedClockFor(slice(app), "player").label, "Il rituale");
  sv.actions.clockPin(app.ctx, slice(app).clocks[1].id);
  assert.equal(sv.pinnedClockFor(slice(app), "player").label, "Le guardie");
  app.ctx.role = "player";
  app.ctx.offline = true; // closing is a personal, local choice
  sv.actions.clockDismiss(app.ctx);
  app.ctx.offline = false;
  assert.equal(sv.pinnedClockFor(slice(app), "player"), null);
  assert.equal(sv.pinnedClockFor(slice(app), "dm").label, "Le guardie");
  refusal(() => sv.actions.clockPin(app.ctx, ritual), /Solo il DM/);
  app.ctx.role = "dm";
  sv.actions.clockPin(app.ctx, slice(app).clocks[1].id);
  assert.equal(sv.pinnedClockFor(slice(app), "player").label, "Le guardie");
  sv.actions.clockRemove(app.ctx, slice(app).clocks[1].id);
  assert.equal(slice(app).pin, null);
  refusal(() => sv.actions.clockPin(app.ctx, null), /Nessun orologio/);
});

test("end of session writes a private DM story draft with attendance, duration and scenes", () => {
  const app = host();
  addCrypt(app);
  const t0 = Date.UTC(2026, 8, 24, 18, 0);
  const minute = 60000;
  app.ctx.commit("s", (d) => sv.startSession(d, "dm", t0));
  app.ctx.role = "player";
  app.ctx.commit("p", (d) =>
    sv.setPresence(
      d,
      "player",
      "player",
      { status: "away", message: "torno subito" },
      t0 + 30 * minute,
    ),
  );
  app.ctx.commit("p", (d) =>
    sv.setPresence(d, "player", "player", { status: "here" }, t0 + 40 * minute),
  );
  app.ctx.role = "dm";
  app.ctx.commit("p", (d) => sv.setPause(d, "dm", true, t0 + 50 * minute));
  app.ctx.commit("p", (d) => sv.setPause(d, "dm", false, t0 + 60 * minute));
  app.ctx.commit("c", (d) => sv.switchScene(d, "dm", "crypt", t0 + 70 * minute));
  let story;
  app.ctx.commit("end", (d) => {
    const session = sv.endSession(d, "dm", t0 + 95 * minute, { message: "Alla prossima!" });
    story = sv.writeStory(d, "dm", session.id, { kind: "recap", lang: "it", at: t0 + 95 * minute });
  });
  assert.equal(story.result, "created");
  const facts = sv.sessionFacts(app.store.state, sv.lastSession(slice(app)));
  assert.equal(facts.durationMs, 95 * minute);
  assert.equal(facts.pauseMs, 10 * minute);
  assert.deepEqual(
    facts.scenes.map((s) => [s.name, s.ms / minute]),
    [
      ["Il cortile dell’osservatorio", 70],
      ["Cripta", 25],
    ],
  );
  const livia = facts.attendance.find((row) => row.memberId === "player");
  assert.deepEqual([livia.present, livia.awayMs / minute, livia.note], [true, 10, "torno subito"]);
  const draft = getCampaignDraft(app.store.state, story.draftId, "dm");
  assert.equal(draft.kind, "recap");
  assert.equal(draft.data.title, "Racconto della sessione 1");
  assert.match(
    draft.data.body,
    /Presenze: Livia \(giocatore\): presente, assente per 10 min \(torno subito\); DM: presente/,
  );
  assert.match(draft.data.body, /Durata: 1 h 35 min, di cui in pausa 10 min/);
  assert.match(
    draft.data.body,
    /Scene: Il cortile dell’osservatorio \(1 h 10 min\); Cripta \(25 min\)/,
  );
  // Private until the DM publishes it; players never read the draft.
  assert.deepEqual(listCampaignDrafts(app.store.state, "player"), []);
  assert.equal(sv.presentationFor(app.store.state, "player").reason, "ended");
  assert.equal(sv.presentationFor(app.store.state, "player").message, "Alla prossima!");
  // The DM edits and publishes it through the campaign journal's own draft service.
  const preview = previewCampaignDraft(app.store.state, story.draftId, "dm");
  assert.ok(preview.canApply !== false);
});

test("reopen with a reason, Undo of the end keeps the story; a re-end refreshes only an untouched draft", () => {
  const app = host();
  sv.actions.start(app.ctx);
  const first = sv.actions.end(app.ctx, { story: true, destination: "journal" });
  assert.equal(first.result, "created");
  // Gameplay Undo reopens the session but the narrative draft stays (preserved slice).
  app.ctx.undo();
  assert.ok(sv.currentSession(slice(app)));
  assert.equal(app.store.state.ext["session-view-stories"].stories.length, 1);
  assert.ok(getCampaignDraft(app.store.state, first.draftId, "dm"));
  const second = sv.actions.end(app.ctx, { story: true });
  assert.equal(second.result, "updated");
  refusal(() => sv.actions.reopen(app.ctx, "x"), /motivo/);
  sv.actions.reopen(app.ctx, "Abbiamo giocato altri dieci minuti");
  assert.equal(sv.lastSession(slice(app)).reopened[0].reason, "Abbiamo giocato altri dieci minuti");
  assert.equal(sv.presentationFor(app.store.state, "player").kind, "table");
  // The DM edits the draft: a later end keeps the edit.
  app.ctx.commit("edit", (d) => {
    const row = d.campaignContent.drafts.find((x) => x.id === first.draftId);
    row.data.body += "Il gruppo ha trovato la chiave.";
    row.revision++;
  });
  const third = sv.actions.end(app.ctx, { story: true });
  assert.equal(third.result, "kept");
  assert.match(
    getCampaignDraft(app.store.state, first.draftId, "dm").data.body,
    /trovato la chiave/,
  );
});

test("the story can be turned off or kept in the DM's personal notes", () => {
  const app = host();
  sv.actions.start(app.ctx);
  assert.equal(sv.actions.end(app.ctx, { story: false }), null);
  assert.equal(listCampaignDrafts(app.store.state, "dm").length, 0);
  sv.actions.start(app.ctx);
  const note = sv.actions.end(app.ctx, { story: true, destination: "notes" });
  assert.equal(note.kind, "note");
  assert.equal(getCampaignDraft(app.store.state, note.draftId, "dm").kind, "note");
  // The DM sees a notification that opens the draft in personal notes.
  const entries = app.registry.notifications(app.ctx);
  assert.deepEqual(
    entries.map((e) => e.target.page),
    ["notes"],
  );
  app.ctx.role = "player";
  assert.deepEqual(app.registry.notifications(app.ctx), []);
});

test("spectator and view-as projections: no hidden, private or DM-only content", () => {
  const app = host();
  const ctx = app.ctx;
  ctx.commit("setup", (d) => {
    d.scenes[0].tokens.find((t) => t.actorId === "goblin-2").hidden = true;
    d.actors.secret = {
      ...structuredClone(d.actors.livia),
      id: "secret",
      name: "Segreta",
      visibility: "private",
      owner: "player",
    };
    d.scenes[0].tokens.push({ id: "token-secret", actorId: "secret", x: 100, y: 100 });
  });
  const scene = app.store.state.scenes[0];
  const ids = (viewer) =>
    sv
      .visibleTokens(app.store.state, scene, viewer)
      .map((t) => t.actorId)
      .sort();
  assert.deepEqual(ids("spectator"), ["doran", "goblin-1", "livia", "mira"]);
  // "View as" the player: never the player's private sheet, even though they own it.
  assert.deepEqual(ids("player"), ["doran", "goblin-1", "livia", "mira"]);
  sv.uiState.viewAs = "player";
  resetTableView();
  const html = renderTable(ctx);
  assert.match(html, /Stai vedendo il Tavolo come Livia/);
  assert.match(html, /DM per/);
  assert.doesNotMatch(html, /Segreta|Esploratore/);
  assert.match(html, /data-sv-behalf-pick="livia"/);
  sv.resetUI();
  assert.equal(sv.uiState.viewAs, null);
  assert.match(renderTable(ctx), /id="battle-map"/);
});

test("the DM moves Livia on her behalf with the real movement engine; the log says DM per Livia", () => {
  const app = host();
  const before = app.store.state.scenes[0].tokens.find((t) => t.actorId === "livia");
  sv.actions.moveOnBehalf(app.ctx, "player", "livia", { x: before.x + 100, y: before.y });
  const after = app.store.state.scenes[0].tokens.find((t) => t.actorId === "livia");
  assert.ok(after.x > before.x);
  assert.equal(app.store.state.log.at(-1).label, "DM per Livia · Livia: movimento confermato");
  assert.equal(app.store.state.log.at(-1).controller, "dm");
  refusal(
    () => sv.actions.moveOnBehalf(app.ctx, "player", "doran", { x: 10, y: 10 }),
    /non è del giocatore/,
  );
  app.ctx.role = "player";
  refusal(
    () => sv.actions.moveOnBehalf(app.ctx, "player", "livia", { x: 10, y: 10 }),
    /Solo il DM/,
  );
  app.ctx.role = "dm";
  app.ctx.undo();
  assert.equal(app.store.state.scenes[0].tokens.find((t) => t.actorId === "livia").x, before.x);
});

test("arrival centring: nothing at zoom 1, own tokens at the current zoom, Home zooms in", () => {
  const app = host();
  const scene = app.store.state.scenes[0];
  const own = sv.ownTokenPoints(app.store.state, scene, "player");
  assert.deepEqual(own.map((t) => t.actorId).sort(), ["livia", "mira"]);
  assert.equal(sv.focusView(scene, own, { zoom: 1, pan: { x: 0, y: 0 } }), null);
  const zoomed = sv.focusView(scene, own, { zoom: 2, pan: { x: 500, y: 325 } });
  const cx = (Math.min(...own.map((t) => t.x)) + Math.max(...own.map((t) => t.x))) / 2;
  assert.equal(zoomed.zoom, 2);
  assert.equal(zoomed.pan.x, Math.round(Math.max(0, cx - 250)));
  assert.ok(zoomed.pan.x + 500 <= scene.width && zoomed.pan.y + 325 <= scene.height);
  const home = sv.focusView(scene, own, { zoom: 1, pan: { x: 0, y: 0 } }, { force: true });
  assert.equal(home.zoom, 2);
  assert.equal(sv.focusView(scene, [], { zoom: 2 }), null);
});

test("inactivity keep-alive: warn after the set minutes, act five minutes later, input clears", () => {
  const m = 60000;
  assert.equal(
    sv.idleStep({ now: 54 * m, lastInput: 0, warnedAt: null, live: true, minutes: 55 }).action,
    "none",
  );
  assert.equal(
    sv.idleStep({ now: 55 * m, lastInput: 0, warnedAt: null, live: true, minutes: 55 }).action,
    "warn",
  );
  assert.equal(
    sv.idleStep({ now: 59 * m, lastInput: 0, warnedAt: 55 * m, live: true, minutes: 55 }).action,
    "none",
  );
  assert.equal(
    sv.idleStep({ now: 60 * m, lastInput: 0, warnedAt: 55 * m, live: true, minutes: 55 }).action,
    "expire",
  );
  assert.equal(
    sv.idleStep({ now: 60 * m, lastInput: 56 * m, warnedAt: 55 * m, live: true, minutes: 55 })
      .action,
    "clear",
  );
  assert.equal(
    sv.idleStep({ now: 99 * m, lastInput: 0, warnedAt: null, live: false, minutes: 55 }).action,
    "clear",
  );
});

test("a scene change made elsewhere during a live session is recorded privately, not after Undo", () => {
  const app = host();
  addCrypt(app);
  sv.actions.start(app.ctx);
  app.ctx.commit("Scena attivata al Tavolo", (d) => {
    d.activeSceneId = "crypt";
  });
  const session = sv.currentSession(slice(app));
  assert.deepEqual(
    session.scenes.map((s) => s.sceneId),
    ["old-watch", "crypt"],
  );
  assert.equal(app.store.state.log.at(-1).visibility, "private");
  // Undo of the activation restores the timeline with it; nothing is re-recorded.
  app.ctx.undo();
  assert.equal(app.store.state.activeSceneId, "old-watch");
  assert.deepEqual(
    sv.currentSession(slice(app)).scenes.map((s) => s.sceneId),
    ["old-watch"],
  );
});

test("shared session state survives reload; offline refuses shared session changes", () => {
  const storage = memory();
  const app = host({ storage });
  sv.actions.start(app.ctx);
  sv.actions.hide(app.ctx);
  sv.actions.clockAdd(app.ctx, { label: "Il rituale", segments: 8 });
  const reloaded = host({ storage });
  const s = sv.readSession(reloaded.store.state);
  assert.equal(s.gate.hidden, true);
  assert.equal(s.clocks[0].segments, 8);
  assert.equal(sv.currentSession(s).number, 1);
  reloaded.ctx.offline = true;
  assert.throws(() => sv.actions.show(reloaded.ctx), /offline|senza rete/i);
  assert.equal(sv.readSession(reloaded.store.state).gate.hidden, true);
});

test("display scale and story text in English", () => {
  const app = host({ lang: "en" });
  refusal(() => sv.actions.display(app.ctx, { cellMm: 5, ppi: 96 }), /10 e 60/);
  sv.actions.display(app.ctx, { cellMm: 25.4, ppi: 110, ruler: true });
  assert.equal(Math.round(sv.cellPixels(slice(app).display)), 110);
  const text = sv.storyText(
    {
      number: 2,
      startedAt: Date.UTC(2026, 8, 24, 18),
      endedAt: Date.UTC(2026, 8, 24, 19, 5),
      durationMs: 65 * 60000,
      pauseMs: 0,
      scenes: [{ name: "Crypt", ms: 65 * 60000 }],
      attendance: [{ role: "player", label: "Livia", present: true, awayMs: 0 }],
    },
    "en",
  );
  assert.equal(text.title, "Session 2 story");
  assert.match(text.body, /Attendance: Livia \(player\): present/);
  assert.match(text.body, /Duration: 1 h 05 min/);
});

test("rendered drawer and spectator route: controls for the DM, nothing private on the shared screen", () => {
  const app = host();
  addCrypt(app);
  sv.actions.start(app.ctx);
  sv.actions.move(app.ctx, ["doran"], "crypt");
  const drawer = app.registry.get("table-panel", "session-view-controls", app.ctx);
  const html = drawer.render(app.ctx);
  for (const text of [
    "Metti in pausa",
    "Termina sessione…",
    "Nascondi la scena ai giocatori",
    'data-sv-scene="crypt"',
    'data-sv-ribbon="crypt"',
    'data-sv-chip-actor="doran"',
    "Riunisci il gruppo",
    "Vedi come Livia",
    "Apri vista spettatore",
    'data-sv-timer-add="300000"',
    "Aggiungi orologio",
  ])
    assert.ok(html.includes(text), text);
  // The player never gets the drawer, and has no cover while the scene is shown.
  app.ctx.role = "player";
  assert.equal(app.registry.get("table-panel", "session-view-controls", app.ctx), null);
  // The spectator route: party view only; hidden tokens and DM descriptions never appear.
  app.ctx.role = "dm";
  app.ctx.commit("hide goblin", (d) => {
    d.scenes[0].tokens.find((t) => t.actorId === "goblin-2").hidden = true;
  });
  const route = app.registry.get("route", "session-view-display", app.ctx);
  const screen = route.render({ ...app.ctx, view: { page: "session-view-display", tab: "" } });
  assert.match(screen, /Sentinella/);
  assert.doesNotMatch(screen, /Esploratore|Un cortile aperto|NOTA DM|Doran/);
  assert.match(screen, /width="1890"/);
  sv.actions.hide(app.ctx);
  const waiting = route.render({ ...app.ctx, view: { page: "session-view-display", tab: "" } });
  assert.match(waiting, /Il DM sta preparando la scena/);
  assert.doesNotMatch(waiting, /Sentinella|cortile|Cripta/);
  const board = route.render({ ...app.ctx, view: { page: "session-view-display", tab: "hud" } });
  assert.match(board, /is-board/);
});

// ---------------------------------------------------------------------------------------
// Review fixes (changes/interview-01/blueprint-session-view-evidence.md, "Review fixes")
// ---------------------------------------------------------------------------------------

test("P1: a detached display is a locked read-only shell (gate, no commits, no commands)", () => {
  assert.equal(sv.detectDisplay({ location: { hash: "#table" }, name: "d20-spectator" }), null);
  assert.equal(sv.detectDisplay({ location: { hash: "#session-view-displayx" } }), null);
  assert.deepEqual(sv.detectDisplay({ location: { hash: "#session-view-display" } }), {
    mode: "map",
    as: null,
  });
  // Only the pop-out the DM opened (its window name) shows the DM's view.
  assert.deepEqual(
    sv.detectDisplay({
      location: { hash: "#session-view-display?tab=hud" },
      name: "d20-session-hud",
    }),
    { mode: "hud", as: "dm" },
  );
  assert.deepEqual(
    sv.detectDisplay({ location: { hash: "#session-view-display?tab=hud" }, name: "" }),
    { mode: "hud", as: null },
  );
  const app = host();
  sv.actions.clockAdd(app.ctx, { label: "Guardie in arrivo", segments: 6 });
  assert.equal(app.registry.accessGate(app.ctx), null);
  sv.displayState.detached = { mode: "map", as: null };
  try {
    const gate = app.registry.accessGate(app.ctx);
    assert.equal(gate.page, "session-view-display");
    assert.match(gate.message.it, /solo visione/);
    // Nothing this tab does reaches the shared state: every commit is refused...
    const before = JSON.stringify(app.store.state);
    for (const run of [
      () => sv.actions.presence(app.ctx, "dm", { status: "here" }),
      () => sv.actions.clockAdd(app.ctx, { label: "x", segments: 4 }),
      () => sv.actions.pause(app.ctx),
    ])
      assert.throws(run, /view only/);
    assert.equal(JSON.stringify(app.store.state), before);
    // ...and no area command or shortcut runs there (the palette's own are withheld by
    // the gate; this area's are not even listed).
    assert.deepEqual(
      app.registry.list("command", app.ctx).filter((c) => c.id.startsWith("session-view")),
      [],
    );
    assert.equal(app.registry.commandForKey("Mod+Shift+H", app.ctx), null);
  } finally {
    sv.displayState.detached = null;
  }
});

test("P2: the DM runs a breakout scene at the Table without re-homing the party; Regroup returns", () => {
  const app = host();
  addCrypt(app);
  sv.actions.move(app.ctx, ["livia"], "crypt");
  assert.equal(slice(app).party, "old-watch");
  const ribbons = () =>
    sv
      .partyRibbons(app.store.state)
      .ribbons.map((r) => [r.sceneId, r.main, r.atTable, r.actorIds.join(",")]);
  const before = ribbons();
  // "Guida al Tavolo": the Crypt comes to the Table, nobody else moves (Roll20 GM view).
  sv.actions.switchScene(app.ctx, "crypt");
  assert.equal(app.store.state.activeSceneId, "crypt");
  assert.deepEqual(ribbons(), [
    ["old-watch", true, false, "doran,mira"],
    ["crypt", false, true, "livia"],
  ]);
  assert.deepEqual(
    before.map((r) => r[3]),
    ["doran,mira", "livia"],
  );
  assert.equal(sv.locationOf(app.store.state, "doran"), "old-watch");
  // The player (Livia and Mira) plays at the Table where Livia is.
  assert.equal(sv.presentationFor(app.store.state, "player").kind, "table");
  // The DM's drawer keeps the split and Regroup; the HUD says where the party is.
  const drawer = app.registry.get("table-panel", "session-view-controls", app.ctx).render(app.ctx);
  assert.doesNotMatch(drawer, /data-sv="regroup"[^>]*disabled/);
  assert.match(drawer, /al Tavolo/);
  resetTableView();
  assert.match(
    renderTable(app.ctx),
    /Il cortile dell’osservatorio<\/strong> <small>· scena del gruppo<\/small>[\s\S]*?<span>Doran, Mira<\/span>/,
  );
  // Regroup brings Livia home and the Table back to the party scene.
  sv.actions.regroup(app.ctx);
  assert.equal(app.store.state.activeSceneId, "old-watch");
  assert.equal(slice(app).party, null);
  assert.ok(app.store.state.scenes[0].tokens.some((t) => t.actorId === "livia"));
  assert.match(app.toasts.at(-1).text, /il Tavolo torna a Il cortile/);
  // Everyone together: activating another scene moves the party with the Table.
  sv.actions.switchScene(app.ctx, "crypt");
  assert.equal(sv.locationOf(app.store.state, "doran"), "crypt");
  // With the party split and the Table on the party scene, the breakout player is told
  // the DM runs another part of the party when the Table is elsewhere.
  sv.actions.switchScene(app.ctx, "old-watch");
  sv.actions.move(app.ctx, ["livia", "mira"], "crypt");
  sv.actions.switchScene(app.ctx, "crypt");
  sv.actions.move(app.ctx, ["livia", "mira"], "old-watch");
  assert.equal(app.store.state.activeSceneId, "old-watch", "moving the last one back returns");
});

test("P2: projections draw other areas' shared layers and B12 audiences, never private items", () => {
  const drawing = (registry) =>
    registry.add("map-layer", {
      id: "fixture-draw-layer",
      label: { it: "Disegni di prova", en: "Test drawings" },
      order: 45,
      svg: (ctx) =>
        `<path class="fixture-shared" d="M0 0L9 9"/>${ctx.role === "player" ? '<path class="fixture-only-me" d="M1 1"/>' : ""}${ctx.role === "dm" ? '<path class="fixture-dm" d="M2 2"/>' : ""}`,
    });
  const app = host({ areas: { "fixture-draw": drawing } });
  app.ctx.commit("setup", (d) => {
    d.scenes[0].tokens.find((t) => t.actorId === "goblin-2").hidden = true;
    d.ext["token-menu"] = { tokens: { "token-goblin-2": { audience: ["livia"] } } };
  });
  const scene = app.store.state.scenes[0];
  const ids = (viewer) =>
    sv
      .visibleTokens(app.store.state, scene, viewer)
      .map((t) => t.actorId)
      .sort();
  // B12 "Visible only to… Livia": Livia's player (and the DM's view as her) sees it; the
  // shared screen shows only what all see.
  assert.ok(ids("player").includes("goblin-2"));
  assert.ok(!ids("spectator").includes("goblin-2"));
  sv.uiState.viewAs = "player";
  resetTableView();
  const asPlayer = renderTable(app.ctx);
  assert.match(asPlayer, /Esploratore/);
  assert.match(asPlayer, /data-sv-layer="fixture-draw-layer"/);
  assert.match(asPlayer, /fixture-shared/);
  // A player's "Only me" item never reaches the DM, nor DM-only items the player view.
  assert.doesNotMatch(asPlayer, /fixture-only-me|fixture-dm/);
  sv.resetUI();
  const screen = app.registry
    .get("route", "session-view-display", app.ctx)
    .render({ ...app.ctx, view: { page: "session-view-display", tab: "" } });
  assert.match(screen, /fixture-shared/);
  assert.doesNotMatch(screen, /fixture-only-me|fixture-dm|Esploratore/);
  assert.match(screen, /data-sv-locked[^>]*inert/);
});

test("P2: every HUD button is named (also icon-only on a phone); Session and Pause differ", () => {
  const app = host();
  const layer = app.registry.get("map-layer", "session-view-hud", app.ctx);
  const scene = app.store.state.scenes[0];
  const html = layer.svg(app.ctx, { scene, zoom: 1, pan: { x: 0, y: 0 } });
  const buttons = html.match(/<button[^>]*>/g);
  assert.ok(buttons.length >= 5);
  for (const tag of buttons) {
    assert.match(tag, /aria-label="[^"]+"/, tag);
    assert.match(tag, /title="[^"]+"/, tag);
  }
  const icon = (selector) => html.split(selector)[1].split("</svg>")[0];
  assert.notEqual(icon('data-table-drawer="session-view-controls"'), icon('data-sv="pause"'));
});

test("P2: the DM's pop-out shows the DM's view; the players' board keeps the time hidden", () => {
  const app = host();
  sv.actions.timerConfigure(app.ctx, { label: "La porta si chiude", hideRemaining: true });
  sv.actions.timerAdd(app.ctx, 300000);
  sv.actions.clockAdd(app.ctx, { label: "Il rituale", segments: 6 });
  const route = app.registry.get("route", "session-view-display", app.ctx);
  const board = () =>
    route.render({ ...app.ctx, view: { page: "session-view-display", tab: "hud" } });
  try {
    sv.displayState.detached = { mode: "hud", as: "dm" };
    const dm = board();
    assert.match(dm, /Vista del DM · sola lettura/);
    assert.match(dm, /5:00/);
    assert.match(dm, /I giocatori leggono solo «in corso»/);
    assert.match(dm, /Il rituale/);
    sv.displayState.detached = { mode: "hud", as: null };
    const players = board();
    assert.match(players, /Vista dei giocatori/);
    assert.doesNotMatch(players, /5:00|Il rituale/);
    assert.match(players, /in pausa|in corso/);
  } finally {
    sv.displayState.detached = null;
  }
});

test("P2: an evening is recorded in Campaign → Sessions and its story is linked to it", () => {
  const app = host();
  sv.actions.start(app.ctx);
  const story = sv.actions.end(app.ctx, { story: true });
  const played = app.store.state.campaign.sessions;
  assert.equal(played.length, 1);
  assert.equal(played[0].played, true);
  assert.match(played[0].title, /^Sessione 1 · /);
  assert.equal(sv.lastSession(slice(app)).campaignSessionId, played[0].id);
  assert.equal(getCampaignDraft(app.store.state, story.draftId, "dm").data.sessionId, played[0].id);
  // A gameplay Undo of the end keeps the campaign record; the re-end reuses it.
  app.ctx.undo();
  sv.actions.end(app.ctx, { story: true });
  assert.equal(app.store.state.campaign.sessions.length, 1);
  // The next evening is number 2, like the campaign's list.
  sv.actions.start(app.ctx);
  assert.equal(sv.currentSession(slice(app)).number, 2);
  sv.actions.end(app.ctx, { story: false });
  assert.match(app.store.state.campaign.sessions[1].title, /^Sessione 2 · /);
  // Today's agreed appointment is the evening itself: linked, not duplicated.
  const later = new Date();
  later.setHours(23, 0, 0, 0);
  app.ctx.commit("appointment", (d) =>
    d.campaign.sessions.push({
      id: "session-today",
      title: "La cripta",
      startsAt: later.toISOString(),
      timeZone: "UTC",
      localTime: "",
      status: "scheduled",
      played: false,
      revision: 1,
      history: [],
    }),
  );
  sv.actions.start(app.ctx);
  const live = sv.currentSession(slice(app));
  assert.equal(live.campaignSessionId, "session-today");
  assert.equal(live.number, 3);
  const drawer = app.registry.get("table-panel", "session-view-controls", app.ctx).render(app.ctx);
  assert.match(drawer, /Partita 3 · in Campagna → Sessioni: «La cripta»/);
  const third = sv.actions.end(app.ctx, { story: true });
  assert.equal(app.store.state.campaign.sessions.length, 3);
  assert.equal(
    getCampaignDraft(app.store.state, third.draftId, "dm").data.sessionId,
    "session-today",
  );
});

test("P3: the farewell does not outlive its evening; the player Home names no hidden scene", () => {
  const app = host();
  sv.actions.start(app.ctx);
  sv.actions.end(app.ctx, { story: false, message: "Alla prossima!" });
  assert.equal(sv.presentationFor(app.store.state, "player").message, "Alla prossima!");
  sv.actions.reopen(app.ctx, "Altri dieci minuti");
  assert.equal(slice(app).gate.message, "");
  sv.actions.hide(app.ctx);
  assert.equal(sv.presentationFor(app.store.state, "player").message, "");
  sv.actions.show(app.ctx);
  sv.actions.end(app.ctx, { story: false, message: "Ciao!" });
  sv.actions.start(app.ctx, { hidden: true });
  assert.equal(sv.presentationFor(app.store.state, "player").message, "");
  // A waiting message the DM writes on purpose (after the end) stays.
  sv.actions.end(app.ctx, { story: false });
  sv.actions.message(app.ctx, "Si riparte alle 21");
  sv.actions.start(app.ctx, { hidden: true });
  assert.equal(sv.presentationFor(app.store.state, "player").message, "Si riparte alle 21");
  // The player Home names no scene while it is hidden (the resume card is replaced).
  app.ctx.role = "player";
  const resume = app.registry.get("home-widget", "resume", app.ctx);
  assert.ok(resume);
  assert.doesNotMatch(resume.render(app.ctx), /cortile/);
  assert.match(resume.render(app.ctx), /Il DM sta preparando la scena/);
  app.ctx.role = "dm";
  assert.equal(app.registry.get("home-widget", "resume", app.ctx), null);
});

test("P3: after acting once, the keep-alive waits for input, then re-arms", () => {
  const m = 60000;
  const at = { lastInput: 0, warnedAt: 55 * m, live: true, minutes: 55 };
  assert.equal(sv.idleStep({ ...at, now: 60 * m }).action, "expire");
  assert.equal(sv.idleStep({ ...at, now: 99 * m, expired: true }).action, "none");
  assert.equal(
    sv.idleStep({ ...at, now: 99 * m, expired: true, lastInput: 98 * m }).action,
    "clear",
  );
});
