// Regression tests for the B11b (registry shell) and increment-10 (conditions) review
// findings fixed in changes/interview-01/blueprint-b11b-inc10-fixes.md. Each test names
// its finding. Synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState, createStore, startCombat } from "../state.mjs";
import { esc, icon } from "../ui.mjs";
import { createRegistry } from "../registry.mjs";
import { loadExtensions } from "../extensions.mjs";
import { canControlActor } from "../character-access.mjs";
import { renderTable, bindTable, resetTableView, leaveTable } from "../table.mjs";
import { renderCampaign, resetCampaignView } from "../campaign.mjs";
import {
  beginVitalityRoll,
  resolveRoll,
  advanceTurn,
  applyConditionFollowUps,
  projectAttempts,
  projectVitalityRolls,
  expireTurnEffects,
} from "../combat.mjs";
import {
  applyVitalityEvent,
  applyConditionEvent,
  previewAid,
  previewVitalityChange,
  combatTurnKey,
  hasCondition,
} from "../conditions.mjs";
import * as forms from "../forms-companions.mjs";
import { register as registerSample } from "./fixtures/sample-extension.mjs";
import { register as registerFailing } from "./fixtures/failing-extension.mjs";

const L = (it, en) => ({ it, en });
const SRC = Object.freeze({ kind: "authored-demo", edition: "2024", revision: "review-fixes" });
const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
  };
};

// ---------------------------------------------------------------- B11b: registry shell

function makeRegistry(...extensions) {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  for (const [id, register] of extensions) registry.use(id, register);
  return registry;
}
function makeCtx({ role = "player", view = {}, registry, state = createInitialState() } = {}) {
  registry?.initState(state);
  const toasts = [];
  const ctx = {
    state,
    role,
    lang: "it",
    view: { page: "home", id: "", tab: "", ...view },
    toasts,
    t: (it) => it,
    label: (value) => (typeof value === "object" && value ? value.it : String(value ?? "")),
    esc,
    icon,
    canControl: (actor) => canControlActor(actor, ctx.role, state),
    toast: (text, error = false) => toasts.push({ text, error }),
    render: () => {},
    navigate: () => {},
    dialog: () => {},
    closeDialog: () => {},
    commit: () => ({ applied: true, persisted: true }),
  };
  if (registry) {
    ctx.registry = registry;
    registry.attach(ctx);
  }
  return ctx;
}

test("B11b P2: a refusal from ctx.commit is shown as its reason, not as an area malfunction", () => {
  const registry = makeRegistry([
    "probe",
    (api) => {
      api.add("command", {
        id: "probe.offline",
        label: L("Scrittura sonda", "Probe write"),
        // What the shell's commit throws for a plain Error from a mutator.
        run: () => {
          throw Object.assign(Error("Regola: bersaglio fuori portata"), { refusal: true });
        },
      });
      api.add("command", {
        id: "probe.bug",
        label: L("Comando rotto", "Broken command"),
        run: () => {
          throw TypeError("undefined is not a function");
        },
      });
    },
  ]);
  const ctx = makeCtx({ registry });
  assert.equal(registry.run(registry.get("command", "probe.offline"), ctx), false);
  assert.deepEqual(ctx.toasts, [{ text: "Regola: bersaglio fuori portata", error: true }]);
  assert.deepEqual(registry.warnings(), [], "an expected refusal is no area warning");
  // A programming error still becomes a contained warning with the generic toast.
  registry.run(registry.get("command", "probe.bug"), ctx);
  assert.match(ctx.toasts[1].text, /Comando rotto non ha funzionato/);
  assert.equal(registry.warnings().length, 1);
});

test("B11b P2: the sample page button shows a commit refusal instead of throwing", () => {
  const registry = makeRegistry(["sample-extension", registerSample]);
  const ctx = makeCtx({ registry, view: { page: "sample-extension" } });
  ctx.commit = () => {
    throw Object.assign(Error("You are offline"), { it: "Sei senza rete", en: "You are offline" });
  };
  let click;
  const button = { addEventListener: (type, handler) => (click = handler) };
  registry.get("route", "sample-extension").bind({ querySelector: () => button }, ctx);
  assert.doesNotThrow(() => click());
  assert.deepEqual(ctx.toasts, [{ text: "Sei senza rete", error: true }]);
});

test("B11b P2: plain Enter/Space and clipboard shortcuts stay with the page", () => {
  const registry = makeRegistry([
    "probe",
    (api) => {
      const add = (id, shortcut, context) =>
        api.add("command", { id, label: L("Sonda", "Probe"), shortcut, context, run() {} });
      add("probe.enter", "Enter", "characters");
      add("probe.space", "Space");
      add("probe.select", "Mod+A");
      add("probe.copy", "Mod+C");
      add("probe.paste", "Mod+V", "notes");
      add("probe.cut", "Mod+X");
      add("probe.free", "Mod+Shift+Enter");
    },
  ]);
  assert.deepEqual(
    registry.conflicts().map((c) => c.dropped),
    ["probe/probe.enter", "probe/probe.space", "probe/probe.select", "probe/probe.copy"].concat([
      "probe/probe.paste",
      "probe/probe.cut",
    ]),
  );
  const ctx = { role: "player", view: { page: "characters" } };
  assert.equal(registry.commandForKey({ key: "Enter" }, ctx), null);
  assert.equal(registry.commandForKey({ key: "a", ctrlKey: true }, ctx), null);
  assert.equal(
    registry.commandForKey({ key: "Enter", ctrlKey: true, shiftKey: true }, ctx).id,
    "probe.free",
  );
});

// Minimal browser primitives around the real bindTable (as in registry-shell.test.mjs).
const media = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.matchMedia ??= media;
globalThis.window ??= { matchMedia: media };
globalThis.ResizeObserver ??= class {
  observe() {}
  disconnect() {}
};
globalThis.document ??= {
  addEventListener() {},
  removeEventListener() {},
  querySelector: () => null,
};
function fakeTable(ctx, { tools = [] } = {}) {
  const message = { textContent: "" };
  const svg = {
    getScreenCTM: () => ({ a: 1, inverse: () => ({}) }),
    createSVGPoint: () => ({ matrixTransform: () => ({ x: 10, y: 10 }) }),
    querySelectorAll: () => [],
    focus() {},
    setPointerCapture() {},
  };
  const root = {
    isConnected: true,
    querySelector: (s) =>
      s === "#battle-map"
        ? svg
        : s === "#map-message"
          ? message
          : s === "#preview-layer"
            ? { innerHTML: "" }
            : null,
    querySelectorAll: (s) => (s === "[data-tool]" ? tools : []),
  };
  bindTable(root, ctx);
  return { root, svg, message };
}

test("B11b P2: an area table tool is activated on the live table and deactivated when it stops", () => {
  const log = [];
  let kept = null;
  const registry = makeRegistry([
    "probe",
    (api) =>
      api.add("table-tool", {
        id: "probe-tool",
        label: L("Sonda", "Probe"),
        activate: (ctx, table) => {
          log.push("activate");
          kept = table;
          table.message("SONDA ATTIVA");
        },
        deactivate: (ctx, table) => log.push("deactivate:" + (table === kept)),
      }),
  ]);
  const ctx = makeCtx({ registry, view: { page: "table" } });
  const chip = { dataset: { tool: "probe-tool" } };
  let live;
  // The shell renders and binds a fresh table after every change.
  ctx.render = () => (live = fakeTable(ctx, { tools: [chip] }));
  resetTableView();
  ctx.render();
  chip.onclick();
  assert.deepEqual(log, ["activate"]);
  assert.equal(kept.root, live.root, "activate receives the table that stays on screen");
  assert.equal(live.message.textContent, "SONDA ATTIVA");
  ctx.render();
  assert.deepEqual(log, ["activate"], "a re-render is not a new activation");
  // Changing mode through the table services deactivates the tool.
  kept.setMode("move");
  assert.deepEqual(log, ["activate", "deactivate:false"]);
  // Leaving the Table and Reset/role change deactivate the active tool.
  chip.onclick();
  leaveTable();
  assert.deepEqual(log.slice(2), ["activate", "deactivate:true"]);
  ctx.render();
  assert.equal(log.at(-1), "activate", "returning to the Table re-activates the kept mode");
  resetTableView();
  assert.equal(log.at(-1), "deactivate:true");
  resetTableView();
  assert.equal(log.filter((entry) => entry.startsWith("deactivate")).length, 3);
});

test("B11b P3: a tool replacing measure shows its own label and icon on the map toolbar", () => {
  const registry = makeRegistry([
    "probe",
    (api) =>
      api.add("table-tool", {
        id: "measure",
        replaces: true,
        label: L("Righello", "Ruler"),
        icon: "dice",
        onClick() {},
      }),
  ]);
  resetTableView();
  const html = renderTable(makeCtx({ registry, view: { page: "table" } }));
  const chip = html.match(
    /<button class="map-tool [^"]*" data-tool="measure"[^>]*>.*?<\/button>/,
  )[0];
  assert.match(chip, /aria-label="Righello"/);
  assert.ok(chip.includes(icon("dice")), "replacement icon");
  resetTableView();
  const core = renderTable(makeCtx({ view: { page: "table" } }));
  assert.match(core, /data-tool="measure"[^>]*aria-label="Misura"/);
});

test("B11b P3: a campaign section hidden from this role says so instead of showing the Overview", () => {
  const registry = makeRegistry([
    "probe",
    (api) =>
      api.add("campaign-section", {
        id: "probe-dm",
        label: L("Sezione DM", "DM section"),
        roles: ["dm"],
        render: () => "<p data-probe-dm>DM</p>",
      }),
  ]);
  resetCampaignView();
  const player = renderCampaign(makeCtx({ registry, view: { page: "campaign", tab: "probe-dm" } }));
  assert.match(player, /Sezione non disponibile per questo ruolo/);
  assert.match(player, /data-campaign-route="[^"]*overview/, "a way back to the Overview");
  assert.doesNotMatch(player, /data-probe-dm|<h1[^>]*>Panoramica/);
  const dm = renderCampaign(
    makeCtx({ registry, role: "dm", view: { page: "campaign", tab: "probe-dm" } }),
  );
  assert.match(dm, /data-probe-dm/);
});

test("B11b P3: the report explains each contained warning in plain words under its area", () => {
  const registry = makeRegistry(["failing-extension", registerFailing]);
  const ctx = makeCtx({ registry, view: { page: "home" } });
  registry.slot("home-widget", "failing-extension-widget", ctx);
  const it = registry.reportHTML({ lang: "it" });
  const list = it.match(/<ul class="ext-warning-list">.*?<\/ul>/)[0];
  assert.match(
    list,
    /<li>Il riquadro della pagina iniziale «Riquadro guasto» non ha funzionato\.<small>Dettaglio tecnico: home render failed on purpose \(test fixture\)<\/small><\/li>/,
  );
  assert.match(list, /<li>Il salvataggio dei dati «failing-extension» non ha funzionato\./);
  const en = registry.reportHTML({ lang: "en" });
  assert.match(en, /The home page box “Broken box” did not work\./);
});

test("B11b P3: a stalled area probe is reported as failed instead of blocking the first render", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (href, { signal }) =>
    new Promise((resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason)));
  try {
    const registry = makeRegistry();
    const rows = await loadExtensions(registry, {
      entries: [{ id: "slow-area", backlog: "B99", title: L("Area lenta", "Slow area") }],
      base: "http://127.0.0.1:9/",
      probeTimeout: 20,
      importModule: () => {
        throw Error("a stalled area is not imported");
      },
    });
    assert.equal(rows[0].status, "failed");
    assert.match(rows[0].error, /did not answer/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ---------------------------------------------------------------- increment 10: vitality

function store() {
  return createStore({ storage: memory() });
}
function dropToZero(s, actorId = "livia") {
  applyConditionFollowUps(
    s,
    applyVitalityEvent(s, {
      eventId: "drop-" + actorId,
      actorId,
      kind: "damage",
      amount: s.actors[actorId].hp,
      source: SRC,
    }),
  );
}
const pendingVital = (s, kind) =>
  s.combatAttempts.find(
    (a) => a.kind === "vitality" && a.status === "pending" && a.descriptor.kind === kind,
  );
const lastCombatRoll = (s) =>
  s.log
    .flatMap((entry) => entry.rolls ?? [])
    .filter((roll) => roll.source === "combat")
    .at(-1);
function resolve(st, kind, faces, role = "player", options) {
  const a = pendingVital(st.state, kind);
  st.commit("resolve", (s) => resolveRoll(s, a.id, a.requests[0].id, faces, role, options), role);
}
function request(st, input, role = "player") {
  let started;
  st.commit("request", (s) => (started = beginVitalityRoll(s, input, role)), role);
  return st.state.combatAttempts.find((a) => a.id === started.attemptId).requests[0];
}
function aid(st, operation) {
  const p = previewAid(
    st.state,
    { actorId: "mira", targetId: "livia", kind: "stabilize" },
    "player",
    { effectiveActor: forms.getEffectiveActor(st.state.actors.mira) },
  );
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  let started;
  st.commit(
    operation,
    (s) =>
      (started = beginVitalityRoll(
        s,
        {
          kind: "medicine",
          actorId: "mira",
          targetId: "livia",
          aidKind: "stabilize",
          reviewKey: p.reviewKey,
        },
        "player",
        { operationId: operation },
      )),
    "player",
  );
  return st.state.combatAttempts.find((a) => a.id === started.attemptId).requests[0];
}
const saves = (st) =>
  st.state.actors.livia.deathSaves ?? { successes: 0, failures: 0, stable: false };
const refused = (fn) =>
  assert.throws(fn, (error) => error.code === "roll-face-already-accepted", "new faces refused");

test("inc10 P1: undoing an in-initiative death save and its turn start reuses the withdrawn face", () => {
  const st = store();
  st.commit(
    "setup",
    (s) => {
      Object.assign(s.combat, {
        active: true,
        round: 1,
        turn: 0,
        order: ["goblin-1", "livia", "doran", "goblin-2"],
        encounterId: "enc",
      });
      dropToZero(s);
    },
    "dm",
  );
  st.commit("end turn", (s) => advanceTurn(s), "dm");
  resolve(st, "death-save", [1]);
  assert.equal(saves(st).failures, 2);
  st.undo("player");
  st.undo("dm");
  st.commit("end turn again", (s) => advanceTurn(s), "dm");
  const again = pendingVital(st.state, "death-save").requests[0];
  assert.deepEqual(again.acceptedValues, [1]);
  assert.ok(again.reusedFrom, "the history can say where the faces come from");
  refused(() => resolve(st, "death-save", [20]));
  resolve(st, "death-save", [1]);
  assert.equal(saves(st).failures, 2);
  assert.equal(st.state.actors.livia.hp, 0);
  assert.equal(lastCombatRoll(st.state).status, "reused");
});

test("inc10 P1: an out-of-initiative death save retried after Undo reuses its face once", () => {
  const st = store();
  st.commit("setup", (s) => ((s.combat.active = false), dropToZero(s)), "player");
  request(st, { kind: "death-save", actorId: "livia" });
  resolve(st, "death-save", [1]);
  st.undo("player");
  st.undo("player");
  const retry = request(st, { kind: "death-save", actorId: "livia" });
  assert.deepEqual(retry.acceptedValues, [1]);
  refused(() => resolve(st, "death-save", [20]));
  resolve(st, "death-save", [1]);
  assert.equal(saves(st).failures, 2);
  assert.equal(lastCombatRoll(st.state).status, "reused");
  // The retry consumed the withdrawn face: the next save is a new roll.
  const next = request(st, { kind: "death-save", actorId: "livia" });
  assert.equal(next.acceptedValues, undefined);
  resolve(st, "death-save", [12]);
  assert.equal(saves(st).successes, 1);
});

test("inc10 P1: a Medicine check retried after Undo reuses the withdrawn face", () => {
  const st = store();
  st.commit("setup", (s) => ((s.combat.active = false), dropToZero(s)), "player");
  aid(st, "aid-1");
  resolve(st, "medicine", [2]);
  assert.equal(saves(st).stable, false);
  st.undo("player");
  st.undo("player");
  const retry = aid(st, "aid-2");
  assert.deepEqual(retry.acceptedValues, [2]);
  refused(() => resolve(st, "medicine", [18]));
  resolve(st, "medicine", [2]);
  assert.equal(saves(st).stable, false);
  const next = aid(st, "aid-3");
  assert.equal(next.acceptedValues, undefined, "a new attempt after the retry rolls anew");
});

test("inc10 P1: the stable-recovery d4 is reused after Undo recreates the same stability", () => {
  const st = store();
  st.commit("setup", (s) => ((s.combat.active = false), dropToZero(s)), "player");
  aid(st, "aid-1");
  resolve(st, "medicine", [15]);
  assert.equal(saves(st).stable, true);
  resolve(st, "stable-recovery", [4]);
  assert.ok(saves(st).recovery.expiresAt > 0);
  st.undo("player");
  st.undo("player");
  assert.equal(saves(st).stable, false);
  aid(st, "aid-2");
  resolve(st, "medicine", [15]);
  const d4 = pendingVital(st.state, "stable-recovery").requests[0];
  assert.deepEqual(d4.acceptedValues, [4]);
  refused(() => resolve(st, "stable-recovery", [1]));
  resolve(st, "stable-recovery", [4]);
  const recovery = saves(st).recovery;
  assert.equal(recovery.expiresAt - recovery.startedAt, 4 * 3600);
});

test("inc10 P2: a personal vital roll keeps its faces private after the sheet joins the campaign", () => {
  const s = createInitialState();
  s.combat.active = false;
  s.actors.solo = {
    ...structuredClone(s.actors.livia),
    id: "solo",
    name: "Solo",
    visibility: "private",
    campaignIds: [],
    owner: "player",
  };
  dropToZero(s, "solo");
  const started = beginVitalityRoll(s, { kind: "death-save", actorId: "solo" }, "player", {
    operationId: "solo-1",
  });
  resolveRoll(s, started.attemptId, started.requestId, [7], "player");
  Object.assign(s.actors.solo, { visibility: "shared", campaignIds: ["lanterns"] });
  const dm = projectAttempts(s, "dm").find((a) => a.id === started.attemptId);
  assert.equal(dm.requests.length, 0);
  assert.equal(dm.outcomes[0].vitality, undefined, "no natural, total or result for the DM");
  const owner = projectAttempts(s, "player").find((a) => a.id === started.attemptId);
  assert.equal(owner.outcomes[0].vitality.natural, 7);
});

test("inc10 P2: an out-of-initiative death save left pending does not add a second save in the first turn", () => {
  const s = createInitialState();
  s.combat.active = false;
  dropToZero(s);
  const stale = beginVitalityRoll(s, { kind: "death-save", actorId: "livia" }, "player", {
    operationId: "out-1",
  });
  Object.assign(s.combat, {
    active: true,
    round: 1,
    turn: 0,
    order: ["livia", "goblin-1", "doran", "goblin-2"],
    encounterId: "enc",
  });
  expireTurnEffects(s, "livia", "start");
  const pending = projectVitalityRolls(s, "livia", "player").filter((r) => r.status === "pending");
  assert.deepEqual(
    pending.map((r) => r.descriptorId),
    ["death-save:livia:turn:enc:1:livia"],
  );
  // The stale request expired when initiative reached the creature: it keeps no face.
  assert.equal(
    s.combatAttempts.find((a) => a.id === stale.attemptId).requests[0].status,
    "expired",
  );
  assert.throws(
    () => resolveRoll(s, stale.attemptId, stale.requestId, [15], "player"),
    (error) => error.code === "request-expired",
  );
  assert.equal(s.actors.livia.deathSaves?.successes ?? 0, 0);
});

test("inc10 P2: a turn-bound death save expires when its encounter is no longer active", () => {
  const s = createInitialState();
  Object.assign(s.combat, {
    active: true,
    round: 1,
    turn: 0,
    order: ["livia", "goblin-1"],
    encounterId: "enc",
  });
  dropToZero(s);
  expireTurnEffects(s, "livia", "start");
  const turn = s.combatAttempts.find((a) => a.kind === "vitality" && a.status === "pending");
  s.combat.active = false;
  resolveRoll(s, turn.id, turn.requests[0].id, [15], "player");
  assert.equal(turn.requests[0].status, "expired");
  assert.equal(turn.requests[0].values, undefined, "no face kept");
  assert.equal(s.actors.livia.deathSaves?.successes ?? 0, 0);
});

test("inc10 P2: the removed companion's current-turn term ends through the real store commit", () => {
  let saved = null;
  const st = createStore({ storage: { getItem: () => saved, setItem: (k, v) => (saved = v) } });
  const input = {
    mode: "wild-companion",
    profileId: "srd2024:cat",
    name: "Synthetic cat",
    cost: { kind: "wild-shape" },
    appearance: { kind: "map", sceneId: "old-watch", point: { x: 200, y: 450 } },
  };
  const p = forms.previewCompanionCreation(st.state, "mira", input, "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  let companion;
  st.commit(
    "summon",
    (s) =>
      (companion = forms.createCompanion(s, "mira", input, "player", {
        operationId: "summon",
        reviewKey: p.reviewKey,
      })),
    "player",
  );
  st.commit(
    "companion turn",
    (s) => {
      s.combat.order = ["mira", companion.actorId];
      startCombat(s);
      s.combat.encounterId = "enc";
      s.combat.round = 4;
      s.combat.turn = 1;
      s.actors.mira.conditionImmunities = [];
      for (const [eventId, conditionId, when] of [
        ["until-current", "poisoned", "current"],
        ["until-next", "frightened", "next"],
      ])
        applyConditionEvent(s, {
          eventId,
          kind: "apply",
          actorId: "mira",
          conditionId,
          source: SRC,
          immunityConfirmed: true,
          term: { kind: "turn", actorId: companion.actorId, phase: "end", when },
        });
    },
    "dm",
  );
  assert.equal(hasCondition(st.state.actors.mira, "poisoned"), true);
  st.commit("companion drops", (s) => (s.actors[companion.actorId].hp = 0), "dm");
  assert.equal(combatTurnKey(st.state.combat), "enc:5:mira", "the order moved on");
  assert.equal(hasCondition(st.state.actors.mira, "poisoned"), false, "current turn ended");
  assert.equal(hasCondition(st.state.actors.mira, "frightened"), true, "next turn not reached");
});

test("inc10 P2: Correct HP and status never drops a creature to 0 HP or a 0 HP maximum", () => {
  const s = createInitialState();
  const correct = (patch, actorId = "livia") =>
    previewVitalityChange(
      s,
      actorId,
      { kind: "correct", patch, reason: "wrong sheet", source: SRC },
      "player",
    );
  const zero = correct({ hp: 0 });
  assert.equal(zero.canApply, false);
  assert.deepEqual(
    zero.errors.map((e) => e.code),
    ["zero-by-correction"],
  );
  assert.match(zero.errors[0].it, /Danno/);
  assert.deepEqual(
    correct({ maxHp: 0, hp: 0 }).errors.map((e) => e.code),
    ["max-hp-zero", "zero-by-correction"],
  );
  assert.equal(correct({ maxHp: 0 }).canApply, false);
  assert.equal(correct({ hp: 5 }).canApply, true);
  // Already at 0 HP, other fields stay correctable (the HP field is not touched).
  dropToZero(s);
  assert.equal(correct({ failures: 1 }).canApply, true);
});
