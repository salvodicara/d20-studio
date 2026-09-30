// B41 — Regions, traps and behaviours: domain and UI handlers (synthetic data).
import test from "node:test";
import assert from "node:assert/strict";
import { createStore, previewMovement } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { canControlActor } from "../character-access.mjs";
import { esc, icon } from "../ui.mjs";
import { validateSceneGeometry } from "../spatial.mjs";
import {
  advanceTurn,
  beginMovement,
  hasBlockingConsequences,
  projectAttempts,
  resolveRoll,
} from "../combat.mjs";
import * as D from "../regions-domain.mjs";
import {
  register,
  regionTool,
  panel,
  bindPanel,
  renderPrep,
  regionShapes,
  regionMarks,
  collect,
  readConfig,
  configBody,
  resetRegionsView,
  announce,
} from "../regions.mjs";

const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};
function harness({ role = "dm", lang = "it" } = {}) {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  registry.use("regions", register);
  // Review: a listener like the dice areas (B34, B56) that hear every accepted roll.
  const heard = [];
  registry.use("regions-probe", (area) =>
    area.on("roll-accepted", (payload) => heard.push(payload)),
  );
  const store = createStore({ storage: memory() });
  registry.initState(store.state);
  const toasts = [];
  const dialogs = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    view: { page: "table", id: "", tab: "" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object" ? (value[ctx.lang] ?? value.it) : String(value ?? ""),
    esc,
    icon,
    toasts,
    dialogs,
    toast: (text, error = false) => toasts.push({ text, error }),
    render: () => {},
    navigate: () => {},
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    closeDialog: () => {},
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    commit(label, mutator, options = {}) {
      if (ctx.offline && !options.local)
        throw Object.assign(Error("offline"), { it: "Sei senza rete", en: "You are offline" });
      const before = store.state;
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      // As app.mjs: a command may finish its accepted transition on the committed state.
      if (options.afterCommit) options.afterCommit(store.state);
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(ctx.role);
      registry.afterUndo(current, store.state);
      registry.emitStateEvents(current, store.state, { kind: "correction" });
    },
    registry,
  };
  registry.attach(ctx);
  resetRegionsView();
  return { ctx, store, registry, heard };
}
// A fake bound element: the handlers bindPanel attaches, by selector.
function fakeElement(buttons) {
  const handlers = [];
  return {
    handlers,
    querySelector: () => null,
    querySelectorAll: (selector) =>
      (buttons[selector] ?? []).map((dataset) => ({
        dataset,
        getAttribute: () => null,
        addEventListener: (_type, fn) => handlers.push({ selector, dataset, fn }),
      })),
  };
}
const formData = (entries) => {
  const data = new Map(Object.entries(entries));
  return { get: (k) => data.get(k) ?? null, has: (k) => data.has(k) };
};
const scene = (ctx, id = "old-watch") => ctx.state.scenes.find((s) => s.id === id);
const token = (ctx, actorId, id = "old-watch") =>
  scene(ctx, id)?.tokens.find((t) => t.actorId === actorId);
const move = (ctx, actorId, point, id = crypto.randomUUID()) =>
  ctx.commit("Movimento confermato", (s) => {
    const preview = previewMovement(s, actorId, point, { role: ctx.role });
    beginMovement(s, { id, actorId, point, geometryKey: preview.geometryKey }, ctx.role);
  });
const events = (ctx) => D.sliceOf(ctx.state).events;
const faces =
  (...values) =>
  () =>
    values.shift();
const plateTrigger = (h) => {
  h.ctx.role = "player";
  move(h.ctx, "livia", { x: 550, y: 380 });
  return events(h.ctx).at(-1);
};
const execute = (ctx, eventId, input) =>
  ctx.commit("Evento eseguito", (s) => D.executeEvent(s, eventId, input, "dm", faces(3, 3, 3)));

test("the seed adds the crypt, sample regions, reusable traps, Mira's tools and region terrain", () => {
  const { ctx } = harness();
  const slice = D.sliceOf(ctx.state);
  assert.deepEqual(
    slice.regions.map((r) => r.id),
    ["region-plate", "region-embers", "region-stairs-down", "region-stairs-up"],
  );
  assert.deepEqual(
    slice.library.map((t) => t.name),
    ["Lastra a pressione", "Rete che cade"],
  );
  assert.ok(scene(ctx, D.CRYPT_SCENE_ID), "crypt scene seeded");
  assert.ok(
    ctx.state.actors.mira.inventory.some((i) => i.srdId === "srd2024:item:thieves-tools"),
    "Mira carries Thieves' Tools",
  );
  const terrain = scene(ctx).terrain.find((t) => t.regionId === "region-embers");
  assert.equal(terrain.width, 100);
  assert.deepEqual(validateSceneGeometry(scene(ctx)), []);
  assert.deepEqual(validateSceneGeometry(scene(ctx, D.CRYPT_SCENE_ID)), []);
  const plate = D.regionOf(ctx.state, "region-plate");
  assert.equal(plate.trigger.event, "enter");
  assert.equal(plate.trigger.once, true);
  assert.equal(plate.trigger.stopMovement, true);
  assert.deepEqual(plate.actions[0], {
    id: "save",
    type: "save",
    ability: "dex",
    dc: 13,
    dice: { count: 2, sides: 6, bonus: 0 },
    damageType: "piercing",
    onSuccess: "none",
    conditionId: null,
  });
  // Review (F2): 2d6 Piercing comes from the card, not the SRD: the sample trap is an
  // authored adaptation that names its SRD basis, never an SRD citation of its own.
  assert.equal(plate.source.kind, "authored-demo");
  assert.equal(plate.source.basis.kind, "srd");
  assert.deepEqual(plate.source.basis.it.pages, [227, 228]);
});

test("registration: DM tool in the DM group, layers, inspector panel, preparation section", () => {
  const { ctx, registry } = harness();
  const tool = registry.get("table-tool", "regions", ctx);
  assert.equal(tool.group, "dm");
  assert.deepEqual(tool.roles, ["dm"]);
  assert.equal(registry.get("preparation-section", "regions", ctx).label.it, "Regioni e trappole");
  assert.ok(registry.get("map-layer", "regions"));
  assert.ok(registry.get("map-layer", "regions-marks"));
  assert.equal(registry.get("table-panel", "regions-panel").placement, "inspector");
  ctx.role = "player";
  assert.equal(registry.get("table-tool", "regions", ctx), null, "players have no region tool");
  assert.equal(registry.get("preparation-section", "regions", ctx), null);
  // No new sidebar tab (B61): only an inspector section.
  assert.ok(!registry.list("table-panel", ctx, {}).some((c) => c.placement === "sidebar-tab"));
});

test("(1)(2)(6) Livia stops on the plate's edge; nothing applies until the DM runs it", () => {
  const h = harness();
  const hp = h.ctx.state.actors.livia.hp;
  const event = plateTrigger(h);
  assert.equal(token(h.ctx, "livia").x, 400, "stopped on the region edge");
  assert.equal(event.status, "awaiting-dm");
  assert.equal(event.cause, "enter");
  assert.equal(h.ctx.state.actors.livia.hp, hp, "no silent execution");
  const attempt = h.ctx.state.combatAttempts.find((a) => a.id === event.attemptId);
  assert.equal(attempt.requests.length, 0, "no save requested before the DM decides");
  assert.ok(hasBlockingConsequences(h.ctx.state, "livia"), "the event holds the creature");
  assert.throws(() => move(h.ctx, "livia", { x: 500, y: 500 }), /pending consequences/);
  // The player's queue shows a neutral action name before the DM runs the event.
  const projected = projectAttempts(h.ctx.state, "player").find((a) => a.id === attempt.id);
  assert.match(projected.actionName.it, /decide il DM/);
  assert.throws(
    () => h.ctx.commit("x", (s) => D.executeEvent(s, event.id, {}, "player", Math.random)),
    /Only the DM/,
  );
  // DM runs it with physical damage dice; the save goes to Livia's player.
  h.ctx.role = "dm";
  execute(h.ctx, event.id, { damage: { save: { mode: "physical", faces: [4, 5] } } });
  const running = events(h.ctx).at(-1);
  assert.equal(running.status, "awaiting-roll");
  const save = h.ctx.state.combatAttempts
    .find((a) => a.id === event.attemptId)
    .requests.find((r) => r.kind === "save");
  assert.equal(save.modifier, 2, "Livia: Dexterity +2, wizards are not proficient");
  assert.equal(save.actorId, "livia");
  assert.equal(h.ctx.state.actors.livia.hp, hp, "damage waits for the saving throw");
  h.ctx.role = "player";
  h.ctx.commit("Tiro registrato", (s) => resolveRoll(s, event.attemptId, save.id, [7], "player"));
  assert.equal(h.ctx.state.actors.livia.hp, hp - 9, "failed save: full 2d6 (4 + 5)");
  const done = events(h.ctx).at(-1);
  assert.equal(done.status, "applied");
  assert.equal(done.result.saveSuccess, false);
  assert.equal(done.result.damage, 9);
  assert.ok(!hasBlockingConsequences(h.ctx.state, "livia"));
  const plate = D.regionOf(h.ctx.state, "region-plate");
  assert.equal(plate.status.spent, true, "once: spent after running");
  assert.equal(plate.status.revealed, true);
  // Spent: stepping on it again does nothing.
  move(h.ctx, "livia", { x: 460, y: 380 });
  assert.equal(events(h.ctx).length, 1);
  // Riarma (Roll20 "Reaction ready").
  h.ctx.role = "dm";
  h.ctx.commit("Riarma", (s) => D.rearmRegion(s, "region-plate", "dm"), { visibility: "private" });
  assert.equal(D.regionOf(h.ctx.state, "region-plate").status.spent, false);
  assert.equal(h.ctx.state.log.at(-1).visibility, "private", "DM authoring stays private");
});

test("a successful save deals no damage, or half when the region says so", () => {
  for (const [onSuccess, expected] of [
    ["none", 0],
    ["half", 4],
  ]) {
    const h = harness();
    h.ctx.commit("edit", (s) => {
      const plate = D.regionOf(s, "region-plate");
      D.updateRegion(
        s,
        plate.id,
        { ...plate, actions: [{ ...plate.actions[0], onSuccess }] },
        "dm",
      );
    });
    const hp = h.ctx.state.actors.livia.hp;
    const event = plateTrigger(h);
    h.ctx.role = "dm";
    execute(h.ctx, event.id, { damage: { save: { mode: "physical", faces: [4, 5] } } });
    const save = h.ctx.state.combatAttempts
      .find((a) => a.id === event.attemptId)
      .requests.find((r) => r.kind === "save");
    h.ctx.role = "player";
    h.ctx.commit("roll", (s) => resolveRoll(s, event.attemptId, save.id, [15], "player"));
    assert.equal(h.ctx.state.actors.livia.hp, hp - expected, onSuccess);
    assert.equal(events(h.ctx).at(-1).result.saveSuccess, true);
  }
});

test("(6) the DM cancels a pending event: nothing applies, the trap stays armed", () => {
  const h = harness();
  const event = plateTrigger(h);
  assert.throws(
    () => h.ctx.commit("x", (s) => D.cancelEvent(s, event.id, "", "player")),
    /Only the DM/,
  );
  h.ctx.role = "dm";
  // Offline: a shared decision is refused, the event keeps waiting.
  h.ctx.offline = true;
  assert.throws(
    () => execute(h.ctx, event.id, { damage: { save: { mode: "digital" } } }),
    /offline/,
  );
  assert.equal(events(h.ctx).at(-1).status, "awaiting-dm");
  h.ctx.offline = false;
  h.ctx.commit("cancel", (s) => D.cancelEvent(s, event.id, "Doran la scavalca", "dm"));
  const cancelled = events(h.ctx).at(-1);
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.reason, "Doran la scavalca");
  assert.ok(!hasBlockingConsequences(h.ctx.state, "livia"));
  const plate = D.regionOf(h.ctx.state, "region-plate");
  assert.equal(plate.status.spent, false);
  assert.equal(plate.status.pendingEventId, null);
  const attempt = h.ctx.state.combatAttempts.find((a) => a.id === event.attemptId);
  assert.equal(attempt.status, "resolved");
  assert.equal(attempt.outcomes[0].status, "cancelled");
});

test("Undo of the DM's run keeps the damage faces: running again reuses them (I-229)", () => {
  const h = harness();
  const event = plateTrigger(h);
  h.ctx.role = "dm";
  execute(h.ctx, event.id, { damage: { save: { mode: "digital" } } });
  const rolled = h.ctx.state.combatAttempts
    .find((a) => a.id === event.attemptId)
    .requests.find((r) => r.kind === "damage").values;
  assert.deepEqual(rolled, [3, 3]);
  h.ctx.undo();
  assert.equal(events(h.ctx).at(-1).status, "awaiting-dm");
  assert.deepEqual(D.knownDamageFaces(h.ctx.state, event.id, "save").values, [3, 3]);
  h.ctx.commit("again", (s) =>
    D.executeEvent(s, event.id, { damage: { save: { mode: "digital" } } }, "dm", () => 6),
  );
  const again = h.ctx.state.combatAttempts
    .find((a) => a.id === event.attemptId)
    .requests.find((r) => r.kind === "damage");
  assert.deepEqual(again.values, [3, 3], "no new damage roll after Undo");
});

test("(4) Difficult Terrain costs double and the embers burn 1d4 at the start of a turn", () => {
  const h = harness();
  const s = h.ctx.state;
  const through = previewMovement(s, "livia", { x: 250, y: 540 }, { role: "player" });
  assert.ok(through.totalCost > through.distance + 1, "difficult terrain inside the embers");
  h.ctx.role = "player";
  move(h.ctx, "livia", { x: 250, y: 540 });
  assert.equal(events(h.ctx).length, 0, "entering the embers is not the trigger");
  h.ctx.role = "dm";
  h.ctx.commit("combat", (draft) => {
    draft.combat = { active: true, round: 1, turn: 0, order: ["goblin-1", "livia"] };
  });
  const hp = h.ctx.state.actors.livia.hp;
  h.ctx.commit("end turn", (draft) => advanceTurn(draft));
  const burn = events(h.ctx).at(-1);
  assert.equal(burn.cause, "turn-start");
  assert.equal(burn.actorId, "livia");
  assert.equal(burn.status, "awaiting-dm");
  assert.ok(hasBlockingConsequences(h.ctx.state, "livia"), "Livia settles the fire first");
  execute(h.ctx, burn.id, { damage: { burn: { mode: "physical", faces: [3] } } });
  assert.equal(h.ctx.state.actors.livia.hp, hp - 3);
  assert.equal(events(h.ctx).at(-1).status, "applied");
  assert.equal(D.regionOf(h.ctx.state, "region-embers").status.spent, false, "repeats");
  // Same turn, same observer call: never a second event for one turn start.
  D.onTurnPhase(h.ctx.state, {
    actorId: "livia",
    phase: "start",
    turnKey: burn.key.split(":").slice(1, -2).join(":"),
  });
  assert.equal(events(h.ctx).filter((e) => e.cause === "turn-start").length, 1);
});

test("(3) Search finds the hidden trap for the party; a physical roll is corrected with a reason", () => {
  const h = harness({ role: "player" });
  // Mira walks next to the plate (within 3 m).
  move(h.ctx, "mira", { x: 360, y: 390 });
  assert.deepEqual(
    D.searchable(h.ctx.state, "mira").map((r) => r.id),
    ["region-plate"],
  );
  let check;
  h.ctx.commit("search", (s) => {
    check = D.searchForTraps(s, { actorId: "mira", mode: "physical", faces: [3] }, "player");
  });
  assert.equal(check.total, 8, "Mira: Perception +5");
  assert.deepEqual(check.found, []);
  assert.equal(D.regionOf(h.ctx.state, "region-plate").status.discovered, false);
  assert.equal(
    D.visibleRegions(h.ctx.state, "player", "old-watch").some((r) => r.id === "region-plate"),
    false,
  );
  assert.throws(
    () =>
      h.ctx.commit("fix", (s) =>
        D.correctCheck(s, { checkId: check.id, faces: [12], reason: " " }, "player"),
      ),
    /reason/,
  );
  h.ctx.commit("fix", (s) =>
    D.correctCheck(s, { checkId: check.id, faces: [12], reason: "Letto male il dado" }, "player"),
  );
  const plate = D.regionOf(h.ctx.state, "region-plate");
  assert.equal(plate.status.discovered, true);
  const seen = D.visibleRegions(h.ctx.state, "player", "old-watch").find(
    (r) => r.id === "region-plate",
  );
  assert.equal(seen.publicName, "Lastra a pressione");
  assert.equal(seen.trigger, undefined, "players never receive the configuration");
  assert.equal(seen.actions, undefined);
  const roll = D.rollsOf(h.ctx.state).rolls.at(-1);
  assert.equal(roll.corrections[0].reason, "Letto male il dado");
});

test("(3) Disarming needs Thieves' Tools and reach; a disarmed trap never fires", () => {
  const h = harness({ role: "player" });
  h.ctx.commit("found", (s) => {
    D.regionOf(s, "region-plate").status.discovered = true;
  });
  move(h.ctx, "mira", { x: 360, y: 390 });
  move(h.ctx, "livia", { x: 360, y: 330 });
  assert.throws(
    () =>
      h.ctx.commit("x", (s) =>
        D.disarmTrap(
          s,
          { actorId: "livia", regionId: "region-plate", mode: "physical", faces: [20] },
          "player",
        ),
      ),
    /Thieves/,
  );
  let check;
  h.ctx.commit("disarm", (s) => {
    check = D.disarmTrap(
      s,
      { actorId: "mira", regionId: "region-plate", mode: "physical", faces: [13] },
      "player",
    );
  });
  assert.equal(check.total, 15, "Dexterity +2, no tool proficiency");
  assert.equal(check.success, true);
  assert.equal(D.regionOf(h.ctx.state, "region-plate").status.disarmed, true);
  move(h.ctx, "mira", { x: 470, y: 390 });
  assert.equal(events(h.ctx).length, 0, "the disarmed plate does not fire");
});

test("(5) stairs: the mover confirms; the token arrives in the crypt, not during combat", () => {
  const h = harness({ role: "player" });
  move(h.ctx, "livia", { x: 900, y: 560 });
  const stairs = events(h.ctx).at(-1);
  assert.equal(stairs.status, "awaiting-mover");
  assert.equal(stairs.attemptId, null, "a passage alone holds nobody");
  assert.equal(token(h.ctx, "livia").x, 860, "stopped on the stairs");
  assert.equal(collect(h.ctx).length, 1, "a notification asks the player");
  h.ctx.commit("declined", (s) => D.answerPassage(s, stairs.id, false, "player"));
  assert.equal(events(h.ctx).at(-1).status, "declined");
  // Moving out and back in asks again; this time Livia takes the stairs.
  move(h.ctx, "livia", { x: 800, y: 560 });
  move(h.ctx, "livia", { x: 900, y: 560 });
  const again = events(h.ctx).at(-1);
  assert.notEqual(again.id, stairs.id);
  h.ctx.role = "dm";
  h.ctx.commit("combat", (s) => {
    s.combat = { active: true, round: 1, turn: 0, order: ["livia"] };
  });
  h.ctx.role = "player";
  assert.throws(
    () => h.ctx.commit("take", (s) => D.answerPassage(s, again.id, true, "player")),
    /combat/,
  );
  h.ctx.role = "dm";
  h.ctx.commit("end", (s) => {
    s.combat.active = false;
  });
  h.ctx.role = "player";
  h.ctx.commit("take", (s) => D.answerPassage(s, again.id, true, "player"));
  assert.equal(token(h.ctx, "livia"), undefined, "left the courtyard");
  assert.deepEqual(
    { x: token(h.ctx, "livia", D.CRYPT_SCENE_ID).x, y: token(h.ctx, "livia", D.CRYPT_SCENE_ID).y },
    { x: 120, y: 120 },
  );
  assert.equal(events(h.ctx).at(-1).result.passage.toSceneId, D.CRYPT_SCENE_ID);
});

test("moving on without answering expires the passage question", () => {
  const h = harness({ role: "player" });
  move(h.ctx, "livia", { x: 900, y: 560 });
  const stairs = events(h.ctx).at(-1);
  move(h.ctx, "livia", { x: 820, y: 500 });
  assert.equal(events(h.ctx).find((e) => e.id === stairs.id).status, "expired");
});

test("exit and message regions record their event without stopping; chance may fizzle", () => {
  const h = harness();
  h.ctx.commit("create", (s) =>
    D.createRegion(
      s,
      {
        sceneId: "old-watch",
        name: "Soglia",
        kind: "area",
        shape: { x: 150, y: 300, width: 200, height: 160 },
        visibility: "hidden",
        trigger: { event: "exit", who: "players", chance: 50, once: false, stopMovement: true },
        actions: [{ type: "message", text: "Un brivido ti segue." }],
      },
      "dm",
      "region-threshold",
    ),
  );
  assert.equal(D.regionOf(h.ctx.state, "region-threshold").trigger.stopMovement, false);
  h.ctx.role = "player";
  move(h.ctx, "livia", { x: 250, y: 600 });
  assert.equal(token(h.ctx, "livia").y, 600, "an exit does not stop the movement");
  const event = events(h.ctx).at(-1);
  assert.equal(event.cause, "exit");
  assert.equal(event.status, "awaiting-dm");
  h.ctx.role = "dm";
  h.ctx.commit("run", (s) =>
    D.executeEvent(s, event.id, { chance: { mode: "physical", faces: [80] } }, "dm", Math.random),
  );
  assert.equal(events(h.ctx).at(-1).status, "fizzled", "80 > 50%");
  assert.equal(events(h.ctx).at(-1).result, null, "no message delivered");
});

test("validation refuses what the region cannot do", () => {
  const h = harness();
  const base = {
    sceneId: "old-watch",
    name: "Test",
    kind: "trap",
    shape: { x: 10, y: 10, width: 50, height: 50 },
    visibility: "hidden",
    trigger: { event: "enter", who: "all", chance: 100, once: true, stopMovement: true },
    actions: [],
  };
  const bad = (patch, pattern) =>
    assert.throws(() => D.validateRegion(h.ctx.state, { ...base, ...patch }), pattern);
  bad({ shape: { x: 990, y: 10, width: 50, height: 50 } }, /inside the scene/);
  bad({ name: " " }, /name/);
  bad({ trigger: { ...base.trigger, chance: 0 } }, /Chance/);
  bad(
    { actions: [{ type: "save", ability: "dex", dc: 40, dice: null, onSuccess: "none" }] },
    /DC ranges/,
  );
  bad(
    { actions: [{ type: "save", ability: "dex", dc: 12, dice: null, onSuccess: "none" }] },
    /damage or a condition/,
  );
  bad({ actions: [{ type: "door", doorId: "none", doorState: "open" }] }, /door of this scene/);
  bad(
    {
      trigger: { ...base.trigger, event: "turn-start" },
      actions: [{ type: "teleport", targetRegionId: "region-stairs-up" }],
    },
    /Stairs are taken/,
  );
  bad(
    { actions: [{ type: "damage", dice: { count: 2, sides: 7 }, damageType: "fire" }] },
    /d4–d20/,
  );
  assert.throws(() => h.ctx.commit("x", (s) => D.createRegion(s, base, "player")), /Only the DM/);
  assert.throws(
    () => h.ctx.commit("x", (s) => D.deleteRegion(s, "region-stairs-up", "dm")),
    /where «Scale per la cripta» leads/,
  );
});

test("reusable traps: save a region, place it in another scene, remove it", () => {
  const h = harness();
  let template;
  h.ctx.commit("save", (s) => {
    template = D.saveAsTemplate(s, "region-stairs-down", "dm");
  });
  assert.ok(!template.actions.some((a) => a.type === "teleport"), "scene links stay behind");
  let placed;
  h.ctx.commit("place", (s) => {
    placed = D.placeTemplate(s, "trap-pressure-plate", D.CRYPT_SCENE_ID, { x: 600, y: 400 }, "dm");
  });
  assert.equal(placed.sceneId, D.CRYPT_SCENE_ID);
  assert.deepEqual(placed.shape, { x: 575, y: 370, width: 50, height: 60 });
  assert.equal(placed.actions[0].dc, 13);
  h.ctx.commit("remove", (s) => D.deleteTemplate(s, template.id, "dm"));
  assert.ok(!D.sliceOf(h.ctx.state).library.some((t) => t.id === template.id));
});

test("UI: the DM previews and runs; the player sees consequences, never the trap's setup", () => {
  const h = harness();
  const tv = () => ({
    scene: scene(h.ctx),
    selectedActorId: "livia",
    mode: "move",
    zoom: 1,
    pan: { x: 0, y: 0 },
  });
  // Player map: no hidden plate in the markup; DM map: the plate and its label.
  h.ctx.role = "player";
  assert.ok(!regionShapes(h.ctx, tv()).includes("region-plate"));
  assert.ok(regionShapes(h.ctx, tv()).includes("region-embers"), "a shared hazard is drawn");
  h.ctx.role = "dm";
  assert.ok(regionShapes(h.ctx, tv()).includes('data-region="region-plate"'));
  const event = plateTrigger(h);
  const playerPanel = panel(h.ctx, tv());
  assert.match(playerPanel, /Il DM sta decidendo/);
  assert.ok(!playerPanel.includes("Lastra a pressione"), "no trap name before the DM runs it");
  assert.ok(!playerPanel.includes("CD 13"));
  assert.match(playerPanel, /Cerca trappole/);
  h.ctx.role = "dm";
  const dmPanel = panel(h.ctx, tv());
  assert.match(dmPanel, /Lastra a pressione/);
  assert.match(dmPanel, /TS Destrezza CD 13 → 2d6 perforanti/);
  assert.match(dmPanel, /data-regions-run=/);
  assert.match(regionMarks(h.ctx, tv()), /regions-pulse/);
  assert.equal(collect(h.ctx)[0].category, "requests");
  // Clicking Run opens the preview dialog with the damage dice (digital or physical).
  const buttons = [];
  const el = {
    querySelectorAll: (selector) =>
      selector === "[data-regions-run]"
        ? [
            {
              dataset: { regionsRun: event.id },
              addEventListener: (_type, fn) => buttons.push(fn),
            },
          ]
        : [],
  };
  bindPanel(el, h.ctx, { scene: scene(h.ctx) });
  buttons[0]();
  const dialog = h.ctx.dialogs.at(-1);
  assert.match(dialog.title, /Esegui «Lastra a pressione»/);
  assert.match(dialog.body, /damage-save-mode/);
  const data = new Map([
    ["damage-save-mode", "physical"],
    ["damage-save-face0", "6"],
    ["damage-save-face1", "6"],
  ]);
  dialog.options.onSubmit({ get: (k) => data.get(k) ?? null, has: (k) => data.has(k) });
  assert.equal(events(h.ctx).at(-1).status, "awaiting-roll");
  h.ctx.role = "player";
  const after = panel(h.ctx, tv());
  assert.match(after, /Lastra a pressione/, "the public name once it went off");
  assert.match(after, /Tira il tiro salvezza/);
  // Announcement for the player after the next commit.
  resetRegionsView();
  announce(h.ctx);
  assert.equal(h.ctx.toasts.length >= 1, true);
});

test("UI: config dialog reads the curated action list; the tool draws and moves regions", () => {
  const h = harness();
  const plate = D.regionOf(h.ctx.state, "region-plate");
  const body = configBody(h.ctx, plate);
  for (const name of [
    "act-save",
    "act-damage",
    "act-condition",
    "act-door",
    "act-message",
    "act-teleport",
  ])
    assert.match(body, new RegExp(`name="${name}"`));
  const data = new Map(
    Object.entries({
      name: "Rete",
      publicName: "Rete",
      kind: "trap",
      visibility: "hidden",
      x: "600",
      y: "100",
      width: "100",
      height: "100",
      event: "enter",
      who: "all",
      chance: "100",
      once: "on",
      stopMovement: "on",
      "act-save": "on",
      "save-ability": "dex",
      "save-dc": "10",
      "save-success": "none",
      "save-type": "piercing",
      "save-condition": "restrained",
      "is-trap": "on",
      "detect-dc": "11",
      "disarm-dc": "10",
    }),
  );
  const input = readConfig({ get: (k) => data.get(k) ?? null, has: (k) => data.has(k) }, plate);
  h.ctx.commit("save", (s) => D.updateRegion(s, plate.id, input, "dm"));
  const saved = D.regionOf(h.ctx.state, plate.id);
  assert.equal(saved.actions[0].dice, null);
  assert.equal(saved.actions[0].conditionId, "restrained");
  assert.equal(saved.trap.detectDC, 11);
  // Table tool: drag on empty map → a new region and its configuration dialog.
  const messages = [];
  const table = {
    scene: scene(h.ctx),
    svg: { setPointerCapture() {}, querySelector: () => null },
    point: (e) => e.p,
    message: (t) => messages.push(t),
    render() {},
  };
  const count = D.regionsIn(h.ctx.state, "old-watch").length;
  regionTool.onPointerDown(h.ctx, { button: 0, p: { x: 700, y: 450 }, pointerId: 1 }, table);
  regionTool.onPointerMove(h.ctx, { p: { x: 800, y: 520 } }, table);
  regionTool.onPointerUp(h.ctx, { p: { x: 800, y: 520 } }, table);
  const created = D.regionsIn(h.ctx.state, "old-watch");
  assert.equal(created.length, count + 1);
  assert.deepEqual(created.at(-1).shape, { x: 700, y: 450, width: 100, height: 70 });
  assert.match(h.ctx.dialogs.at(-1).title, /Regione: Regione/);
  assert.equal(h.ctx.state.log.at(-1).visibility, "private");
  // Drag the selected region by 50 px; arrows nudge it by a cell.
  regionTool.onPointerDown(h.ctx, { button: 0, p: { x: 750, y: 480 }, pointerId: 1 }, table);
  regionTool.onPointerMove(h.ctx, { p: { x: 800, y: 480 } }, table);
  regionTool.onPointerUp(h.ctx, { p: { x: 800, y: 480 } }, table);
  assert.equal(D.regionOf(h.ctx.state, created.at(-1).id).shape.x, 750);
  const key = { key: "ArrowUp", shiftKey: false, preventDefault() {} };
  regionTool.onKeyDown(h.ctx, key, table);
  assert.equal(D.regionOf(h.ctx.state, created.at(-1).id).shape.y, 400);
  // Undo removes the move, then another Undo the region.
  h.ctx.undo();
  h.ctx.undo();
  h.ctx.undo();
  assert.equal(D.regionsIn(h.ctx.state, "old-watch").length, count);
});

test("UI: the Preparation section lists regions, reusable traps and recent events", () => {
  const h = harness();
  const html = renderPrep(h.ctx);
  assert.match(html, /Lastra a pressione/);
  assert.match(html, /Trappole riutilizzabili/);
  assert.match(html, /Rete che cade/);
  assert.match(html, /data-regions-prep-map/);
  h.ctx.lang = "en";
  assert.match(renderPrep(h.ctx), /Reusable traps/);
});

// ---------------------------------------------------------------- independent review (B41-rf)

test("review F1: search, correction and disarm rolls join the Log and are announced", () => {
  const h = harness({ role: "player" });
  move(h.ctx, "mira", { x: 360, y: 390 });
  const el = fakeElement({ "[data-regions-search]": [{ regionsSearch: "mira" }] });
  bindPanel(el, h.ctx, { scene: scene(h.ctx) });
  el.handlers.find((x) => x.selector === "[data-regions-search]").fn();
  h.ctx.dialogs.at(-1).options.onSubmit(formData({ "check-mode": "physical", "check-face0": "3" }));
  const entry = h.ctx.state.log.at(-1);
  const logged = (entry.rolls ?? []).find((r) => r.source === "regions");
  assert.ok(logged, "the search roll is in its commit's Log entry");
  // The shared roll kinds (chat, dice): an ability check named by its action.
  assert.equal(logged.kind, "check");
  assert.equal(logged.regionKind, "search");
  assert.equal(logged.actionName.it, "Cercare (trappole)");
  assert.deepEqual(logged.values, [3]);
  assert.equal(logged.mode, "physical");
  assert.equal(logged.total, 8);
  assert.equal(logged.visibility, "shared");
  assert.equal(logged.dc, null, "a hidden trap's DC never travels with the roll");
  assert.equal(h.heard.at(-1).roll.id, logged.id, "announced with roll-accepted");
  assert.equal(h.heard.at(-1).logId, entry.id);
  // The reasoned correction of the physical face is announced as a corrected roll.
  const check = D.sliceOf(h.ctx.state).checks.at(-1);
  const fix = fakeElement({ "[data-regions-correct]": [{ regionsCorrect: check.id }] });
  bindPanel(fix, h.ctx, { scene: scene(h.ctx) });
  fix.handlers.find((x) => x.selector === "[data-regions-correct]").fn();
  h.ctx.dialogs.at(-1).options.onSubmit(formData({ face0: "12", reason: "Letto male il dado" }));
  const corrected = h.ctx.state.log.at(-1).rolls.find((r) => r.source === "regions");
  assert.equal(corrected.status, "corrected");
  assert.deepEqual(corrected.values, [12]);
  assert.equal(corrected.correctionReason, "Letto male il dado");
  assert.equal(h.heard.at(-1).roll.status, "corrected");
  // Disarm: the Thieves' Tools check is logged and announced too.
  const tools = fakeElement({
    "[data-regions-disarm]": [{ regionsDisarm: "region-plate", actor: "mira" }],
  });
  bindPanel(tools, h.ctx, { scene: scene(h.ctx) });
  tools.handlers.find((x) => x.selector === "[data-regions-disarm]").fn();
  h.ctx.dialogs
    .at(-1)
    .options.onSubmit(formData({ "check-mode": "physical", "check-face0": "13" }));
  const disarm = h.ctx.state.log.at(-1).rolls.find((r) => r.source === "regions");
  assert.equal(disarm.regionKind, "disarm");
  assert.equal(disarm.success, true);
  assert.equal(h.heard.at(-1).roll.regionKind, "disarm");
});

test("review F1/F4: the DM's d100 is a private logged roll; players never read the chance", () => {
  const h = harness();
  h.ctx.commit("create", (s) =>
    D.createRegion(
      s,
      {
        sceneId: "old-watch",
        name: "Spifferi",
        publicName: "Corrente d’aria",
        kind: "area",
        shape: { x: 150, y: 300, width: 200, height: 160 },
        visibility: "hidden",
        trigger: { event: "exit", who: "players", chance: 50, once: false, stopMovement: false },
        actions: [{ type: "message", text: "Un brivido ti segue." }],
      },
      "dm",
      "region-draught",
    ),
  );
  h.ctx.role = "player";
  move(h.ctx, "livia", { x: 250, y: 600 });
  const event = events(h.ctx).at(-1);
  h.ctx.role = "dm";
  const el = fakeElement({ "[data-regions-run]": [{ regionsRun: event.id }] });
  bindPanel(el, h.ctx, { scene: scene(h.ctx) });
  el.handlers.find((x) => x.selector === "[data-regions-run]").fn();
  h.ctx.dialogs
    .at(-1)
    .options.onSubmit(formData({ "chance-mode": "physical", "chance-face0": "30" }));
  assert.equal(events(h.ctx).at(-1).status, "applied", "30 ≤ 50: it goes off");
  const chance = h.ctx.state.log.at(-1).rolls.find((r) => r.source === "regions");
  assert.equal(chance.regionKind, "chance");
  assert.equal(chance.actionName.en, "Region chance (d100)");
  assert.deepEqual(chance.values, [30]);
  assert.equal(chance.visibility, "private", "the DM's d100 for a region stays private");
  assert.equal(h.heard.at(-1).roll.id, chance.id);
  h.ctx.role = "player";
  const tv = { scene: scene(h.ctx), selectedActorId: "livia", mode: "move" };
  const html = panel(h.ctx, tv);
  assert.match(html, /Un brivido ti segue/, "the player reads the message");
  assert.doesNotMatch(html, /d100|50%/, "the region's chance is DM configuration");
});

test("review F5: after a run the player's request card carries only the public name", () => {
  const h = harness();
  let placed;
  h.ctx.commit("place", (s) => {
    placed = D.placeTemplate(s, "trap-falling-net", "old-watch", { x: 700, y: 150 }, "dm");
  });
  let event;
  h.ctx.commit("trigger", (s) => {
    event = D.triggerRegion(s, placed.id, "livia", { cause: "enter" });
  });
  execute(h.ctx, event.id, {});
  const attempt = projectAttempts(h.ctx.state, "player").find((a) => a.id === event.attemptId);
  assert.equal(attempt.actionName.it, "Rete");
  assert.ok(
    !JSON.stringify(attempt).includes("Rete che cade"),
    "the DM's name of the trap never reaches the player's projection",
  );
});

test("review F6: with the region tool the Creature tab lists the scene's regions (Region Legend)", () => {
  const h = harness();
  const tv = { scene: scene(h.ctx), selectedActorId: null, mode: "regions" };
  const html = panel(h.ctx, tv);
  for (const id of ["region-plate", "region-embers", "region-stairs-down"])
    assert.match(html, new RegExp(`data-regions-choose="${id}"`));
  assert.doesNotMatch(html, /data-regions-choose="region-stairs-up"/, "other scenes stay out");
  const el = fakeElement({ "[data-regions-choose]": [{ regionsChoose: "region-embers" }] });
  bindPanel(el, h.ctx, { scene: scene(h.ctx) });
  el.handlers.find((x) => x.selector === "[data-regions-choose]").fn();
  const after = panel(h.ctx, tv);
  assert.match(after, /data-regions-selected="region-embers"/, "a keyboard pick selects it");
  assert.match(after, /data-regions-choose="region-embers" aria-pressed="true"/);
});
