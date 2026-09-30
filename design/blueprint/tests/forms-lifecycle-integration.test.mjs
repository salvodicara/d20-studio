import test from "node:test";
import assert from "node:assert/strict";
import { createStore, startCombat, spendMovement } from "../state.mjs";
import { canControlActor } from "../character-access.mjs";
import { beginHealing } from "../characters.mjs";
import { placeSceneToken } from "../preparation.mjs";
import { bindTable, resetTableView } from "../table.mjs";
import * as forms from "../forms-companions.mjs";
import * as rest from "../rest-time.mjs";

function setup() {
  let saved = null;
  const storage = {
    getItem: () => saved,
    setItem: (_key, value) => {
      saved = value;
    },
  };
  return { store: createStore({ storage }), storage };
}
function command(store, preview, execute, id, input, operationId, role = "player") {
  const p = preview(store.state, id, input, role);
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  let result;
  store.commit(
    operationId,
    (s) => {
      result = execute(s, id, input, role, { operationId, reviewKey: p.reviewKey });
    },
    role,
  );
  return result;
}
function createCompanion(store, mode = "wild-companion") {
  return command(
    store,
    forms.previewCompanionCreation,
    forms.createCompanion,
    "mira",
    {
      mode,
      profileId: "srd2024:cat",
      name: "Synthetic familiar",
      ...(mode === "wild-companion"
        ? {
            cost: { kind: "wild-shape" },
            appearance: { kind: "map", sceneId: "old-watch", point: { x: 200, y: 450 } },
          }
        : {}),
    },
    "summon",
  );
}
const shapePool = (s) =>
  s.actors.mira.features.find((f) => f.id === s.actors.mira.formsProfile.wildShapeFeatureId);
function startAndAdvanceRest(store, kind, actorIds, id) {
  const input = {
    id,
    kind,
    campaignId: "lanterns",
    actorIds,
    activityByActor: Object.fromEntries(
      actorIds.map((a) => [a, kind === "long" ? "sleep" : "light"]),
    ),
  };
  store.commit("Start rest", (s) => rest.startRest(s, input, "dm"), "dm");
  store.commit(
    "Rest elapsed",
    (s) =>
      rest.advanceGameTime(
        s,
        { id: id + ":time", campaignId: "lanterns", seconds: kind === "long" ? 28800 : 3600 },
        "dm",
      ),
    "dm",
  );
}

test("partial Long Rest completion expires only the completing parent's Wild Companion and recovers its canonical pool atomically", () => {
  const { store, storage } = setup(),
    companion = createCompanion(store);
  store.commit(
    "Represent familiar",
    (s) =>
      placeSceneToken(
        s,
        "old-watch",
        companion.actorId,
        { x: 200, y: 450 },
        "familiar-token",
        "dm",
      ),
    "dm",
  );
  assert.equal(shapePool(store.state).used, 2);
  startAndAdvanceRest(store, "long", ["doran", "mira"], "group-long");
  store.commit(
    "Doran completes",
    (s) => rest.completeRest(s, "group-long", { id: "doran-complete", actorIds: ["doran"] }, "dm"),
    "dm",
  );
  assert.equal(store.state.actors[companion.actorId].companion.lifecycle, "available");
  assert.equal(shapePool(store.state).used, 2);
  assert.equal(
    store.state.scenes[0].tokens.some((t) => t.actorId === companion.actorId),
    true,
  );
  const input = { id: "mira-complete", actorIds: ["mira"] };
  store.commit("Mira completes", (s) => rest.completeRest(s, "group-long", input, "dm"), "dm");
  assert.equal(store.state.actors[companion.actorId].companion.lifecycle, "expired");
  assert.equal(shapePool(store.state).used, 0);
  assert.equal(
    store.state.scenes[0].tokens.some((t) => t.actorId === companion.actorId),
    false,
  );
  store.undo("dm");
  assert.equal(store.state.actors[companion.actorId].companion.lifecycle, "available");
  assert.equal(shapePool(store.state).used, 2);
  assert.equal(store.state.restTime.clocks.lanterns.seconds, 28800);
  store.commit(
    "Mira completes again",
    (s) => rest.completeRest(s, "group-long", input, "dm"),
    "dm",
  );
  const reloaded = createStore({ storage }),
    before = structuredClone(reloaded.state.restTime);
  reloaded.commit("Completion retry", (s) => rest.completeRest(s, "group-long", input, "dm"), "dm");
  assert.deepEqual(reloaded.state.restTime, before);
  assert.equal(shapePool(reloaded.state).used, 0);
  assert.equal(reloaded.state.actors[companion.actorId].companion.lifecycle, "expired");
});

test("a real Short Rest restores one canonical Wild Shape use without expiring its companion", () => {
  const { store } = setup(),
    companion = createCompanion(store);
  startAndAdvanceRest(store, "short", ["mira"], "mira-short");
  store.commit(
    "Short completed",
    (s) => rest.completeRest(s, "mira-short", { id: "short-complete", actorIds: ["mira"] }, "dm"),
    "dm",
  );
  assert.equal(shapePool(store.state).used, 1);
  assert.equal(store.state.actors[companion.actorId].companion.lifecycle, "available");
});

// Only browser primitives are supplied here. The click handler, turn transition, clocks,
// permissions, store, persistence and domain commands are the actual production functions.
function endTurnControl(store, context) {
  const keys = ["matchMedia", "window", "ResizeObserver", "document"];
  const descriptors = new Map(
    keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
  );
  const media = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  globalThis.matchMedia = media;
  globalThis.window = { matchMedia: media };
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  globalThis.document = {
    addEventListener() {},
    removeEventListener() {},
    querySelector: () => null,
  };
  context.after(() => {
    resetTableView();
    for (const key of keys) {
      const descriptor = descriptors.get(key);
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const button = { dataset: { table: "end-turn" } };
  // The map listens for the wheel (TV-05 zoom at the cursor): the fake accepts listeners.
  const svg = {
    getScreenCTM: () => ({ a: 1 }),
    querySelectorAll: () => [],
    addEventListener() {},
  };
  const root = {
    isConnected: true,
    querySelector: (s) => (s === "#battle-map" ? svg : null),
    querySelectorAll: (s) => (s === "[data-table]" ? [button] : []),
  };
  const ctx = {
    get state() {
      return store.state;
    },
    role: "player",
    offline: false,
    t: (_it, en) => en,
    esc: (value) => String(value),
    canControl: (actor) => canControlActor(actor, ctx.role),
    commit: (label, mutate) => store.commit(label, mutate, ctx.role),
    toast: (message) => {
      throw Error(message);
    },
  };
  resetTableView();
  bindTable(root, ctx);
  return (role) => {
    ctx.role = role;
    button.onclick();
  };
}

test("the real End Turn handler advances a personal casting clock only at a round boundary and round retry cannot add time", (context) => {
  const { store, storage } = setup();
  store.commit(
    "Personal caster enters initiative",
    (s) => {
      s.actors.livia.visibility = "private";
      s.actors.livia.campaignIds = [];
      s.combat.order = ["livia", "goblin-1"];
      startCombat(s);
    },
    "player",
  );
  const casting = command(
    store,
    forms.previewFamiliarCasting,
    forms.startFamiliarCasting,
    "livia",
    {
      profileId: "srd2024:cat",
      name: "Personal familiar",
      creatureType: "fey",
      mode: "slot",
      slotLevel: 1,
      material: {
        itemId: "sample-familiar-incense",
        quantity: 1,
        unitValueGp: 10,
        incenseConfirmed: true,
      },
    },
    "personal-cast",
  );
  const before = JSON.stringify(store.state);
  assert.throws(() =>
    store.commit(
      "Skip turns",
      (s) =>
        forms.recordPersonalFormsTime(s, "livia", 3600, "A narrative hour", "player", {
          operationId: "skip",
        }),
      "player",
    ),
  );
  assert.equal(JSON.stringify(store.state), before);
  const endTurn = endTurnControl(store, context);
  endTurn("player");
  assert.equal(store.state.combat.round, 1);
  assert.equal(
    forms.getFamiliarCasting(store.state, casting.castingId, "player").elapsedSeconds,
    0,
  );
  endTurn("dm");
  assert.equal(store.state.combat.round, 2);
  assert.equal(
    forms.getFamiliarCasting(store.state, casting.castingId, "player").elapsedSeconds,
    6,
  );
  assert.equal(store.state.restTime.clocks.lanterns.seconds, 6);
  const roundEvent = store.state.restTime.events.find((e) => e.kind === "round-time");
  assert.ok(roundEvent);
  const reloaded = createStore({ storage });
  reloaded.commit(
    "Same round event retry",
    (s) => rest.advanceRoundTime(s, { eventId: roundEvent.id, round: 2 }),
    "dm",
  );
  assert.equal(
    forms.getFamiliarCasting(reloaded.state, casting.castingId, "player").elapsedSeconds,
    6,
  );
  assert.equal(reloaded.state.restTime.clocks.lanterns.seconds, 6);
  assert.equal(reloaded.state.actors.livia.action, true);
  assert.equal(
    reloaded.state.actors.livia.inventory.find((i) => i.id === "sample-familiar-incense").quantity,
    1,
  );
});

test("removing the active last companion uses the real store hook to wrap the round and reset the next effective form only once", () => {
  const { store } = setup(),
    companion = createCompanion(store, "manual");
  command(
    store,
    forms.previewWildShape,
    forms.applyWildShape,
    "mira",
    {
      profileId: "srd2024:wolf",
      tempHpChoice: "replace",
      equipment: [{ itemId: "mira-staff", disposition: "merge" }],
    },
    "wolf",
  );
  store.commit(
    "Mid-round fixture",
    (s) => {
      s.combat.order = ["mira", companion.actorId];
      startCombat(s);
      s.combat.round = 5;
      s.combat.turn = 1;
      const a = s.actors.mira;
      spendMovement(a, 7, 12);
      a.action = false;
      a.bonus = false;
      a.reaction = false;
      a.objectInteractionUsed = true;
      a.combatEffects = [
        { id: "ending-at-start", type: "shield", actorId: "mira", expires: "start" },
      ];
    },
    "dm",
  );
  command(
    store,
    forms.previewCompanionCommand,
    forms.applyCompanionCommand,
    companion.actorId,
    { command: "archive", reason: "Remove this fixture from play" },
    "archive",
  );
  assert.deepEqual(store.state.combat.order, ["mira"]);
  assert.equal(store.state.combat.round, 6);
  assert.equal(store.state.combat.turn, 0);
  assert.equal(store.state.combat.pendingTurnStart, undefined);
  const a = store.state.actors.mira;
  assert.equal(a.movement, 12);
  assert.equal(a.movementSpent, 0);
  assert.equal(a.dashCount, 0);
  assert.equal(a.action, true);
  assert.equal(a.bonus, true);
  assert.equal(a.reaction, true);
  assert.equal(a.objectInteractionUsed, false);
  assert.deepEqual(a.combatEffects, []);
  assert.equal(store.state.restTime.clocks.lanterns.seconds, 6);
  store.commit(
    "New turn resource spent",
    (s) => {
      s.actors.mira.action = false;
      spendMovement(s.actors.mira, 3);
    },
    "player",
  );
  assert.equal(store.state.actors.mira.action, false);
  assert.equal(store.state.actors.mira.movement, 9);
  assert.equal(store.state.restTime.clocks.lanterns.seconds, 6);
});

for (const disposition of ["merge", "drop"])
  test(`the actual potion command rejects ${disposition === "merge" ? "merged equipment" : "equipment dropped on the ground"} without spending, including after form return`, () => {
    const { store } = setup();
    store.commit(
      "Owned potion fixture",
      (s) => {
        s.actors.mira.inventory.push(
          structuredClone(s.actors.livia.inventory.find((i) => i.id === "potion")),
        );
      },
      "player",
    );
    command(
      store,
      forms.previewWildShape,
      forms.applyWildShape,
      "mira",
      {
        profileId: "srd2024:cat",
        tempHpChoice: "replace",
        equipment: [
          { itemId: "mira-staff", disposition: "merge" },
          { itemId: "potion", disposition },
        ],
      },
      "shape",
    );
    const before = JSON.stringify(store.state);
    assert.throws(
      () =>
        store.commit(
          "Unavailable potion",
          (s) => beginHealing(s.actors.mira, "potion", { mode: "physical", id: "unavailable" }),
          "player",
        ),
      /Potion unavailable/,
    );
    assert.equal(JSON.stringify(store.state), before);
    command(
      store,
      forms.previewFormReturn,
      forms.returnToNormalForm,
      "mira",
      { mode: "normal" },
      "return",
    );
    if (disposition === "drop") {
      assert.throws(
        () =>
          store.commit(
            "Still on the ground",
            (s) => beginHealing(s.actors.mira, "potion", { id: "ground" }),
            "player",
          ),
        /Potion unavailable/,
      );
      assert.equal(store.state.actors.mira.inventory.find((i) => i.id === "potion").quantity, 3);
      assert.equal(store.state.actors.mira.pendingHealing, undefined);
    } else {
      store.commit(
        "Available after return",
        (s) => beginHealing(s.actors.mira, "potion", { id: "usable" }),
        "player",
      );
      assert.equal(store.state.actors.mira.inventory.find((i) => i.id === "potion").quantity, 2);
      assert.equal(store.state.actors.mira.pendingHealing.id, "usable");
    }
  });
