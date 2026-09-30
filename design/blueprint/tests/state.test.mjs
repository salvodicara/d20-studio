import test from "node:test";
import assert from "node:assert/strict";
import { beginAttempt, resolveRoll } from "../combat.mjs";
import {
  createInitialState,
  createStore,
  previewMovement,
  moveActor,
  startCombat,
} from "../state.mjs";
const memory = () => {
  const values = new Map();
  return { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
};

test("movement preview preserves state and identifies reachable stop before execution", () => {
  const state = createInitialState();
  state.combat.active = true;
  const scene = state.scenes[0];
  const token = scene.tokens.find((t) => t.actorId === "livia");
  const original = JSON.stringify(state);
  const preview = previewMovement(state, "livia", { x: token.x + 500, y: token.y });
  assert.equal(JSON.stringify(state), original);
  assert.equal(preview.distance, 15);
  assert.equal(preview.cost, 9);
  assert.equal(preview.end.x, token.x + 300);
  assert.equal(preview.limited, true);
});
test("movement consumes only confirmed budget; a player cannot move a DM creature", () => {
  const s = createInitialState();
  s.combat.active = true;
  const token = s.scenes[0].tokens.find((t) => t.actorId === "livia");
  moveActor(s, "livia", { x: token.x + 100, y: token.y }, "player");
  assert.equal(s.actors.livia.movement, 6);
  assert.throws(() => moveActor(s, "goblin-1", { x: 200, y: 200 }, "player"), /control/i);
});
test("consumption stays shared across routes/reload and undo restores quantities with a correction log", () => {
  const storage = memory();
  const store = createStore({ storage });
  const itemId = store.state.actors.livia.inventory.find((i) => i.kind === "consumable").id;
  const before = store.state.actors.livia.inventory.find((i) => i.id === itemId).quantity;
  store.commit(
    "Use potion",
    (draft) => {
      draft.actors.livia.inventory.find((i) => i.id === itemId).quantity--;
    },
    "player",
  );
  assert.equal(
    createStore({ storage }).state.actors.livia.inventory.find((i) => i.id === itemId).quantity,
    before - 1,
  );
  store.undo("player");
  assert.equal(store.state.actors.livia.inventory.find((i) => i.id === itemId).quantity, before);
  assert.equal(store.state.log.at(-1).kind, "correction");
});
test("failed mutation is atomic and role switching cannot undo another controller", () => {
  const store = createStore({ storage: memory() });
  const hp = store.state.actors.livia.hp;
  assert.throws(() =>
    store.commit(
      "Bad",
      (s) => {
        s.actors.livia.hp = 0;
        throw Error("Invalid");
      },
      "player",
    ),
  );
  assert.equal(store.state.actors.livia.hp, hp);
  store.commit("DM edit", (s) => (s.actors.livia.hp = 10), "dm");
  assert.throws(() => store.undo("player"), /control/i);
  assert.equal(store.state.actors.livia.hp, 10);
});
test("storage failure keeps memory usable and reports unsaved state; corrupt data is recoverable", () => {
  const broken = {
    getItem: () => "{bad",
    setItem: () => {
      throw Error("Quota");
    },
  };
  const store = createStore({ storage: broken });
  assert.equal(store.state.actors.livia.name, "Livia");
  assert.ok(store.storageError);
  store.commit("Edit", (s) => (s.actors.livia.hp = 11), "player");
  assert.equal(store.state.actors.livia.hp, 11);
  assert.ok(store.storageError);
});
test("private local changes keep explicit visibility metadata for logs and undo", () => {
  const store = createStore({ storage: memory() });
  store.commit(
    "Private plan",
    (s) => {
      s.actors.livia.privatePlans = { player: "Secret" };
    },
    "player",
    {
      shared: false,
    },
  );
  assert.equal(store.state.log.at(-1).visibility, "private");
  assert.equal(store.history.at(-1).shared, false);
  store.undo("player");
  assert.equal(store.state.log.at(-1).visibility, "private");
});
test("unreadable saved data is preserved until an explicit reset, not overwritten by a new edit", () => {
  const storage = memory();
  storage.setItem("d20-studio-blueprint-v1", "{corrupt");
  const store = createStore({ storage });
  store.commit("Local draft", (s) => (s.actors.livia.hp = 13), "player");
  assert.equal(storage.getItem("d20-studio-blueprint-v1"), "{corrupt");
  assert.equal(store.storageError, "read");
  store.reset();
  assert.equal(JSON.parse(storage.getItem("d20-studio-blueprint-v1")).actors.livia.hp, 18);
});
test("unavailable storage is reported instead of claiming persisted data", () => {
  const store = createStore();
  store.commit("Edit", (s) => (s.actors.livia.hp = 11), "player");
  assert.equal(store.storageError, "unavailable");
});

test("starting combat refreshes the starting creature, not reactions of other creatures", () => {
  const state = createInitialState();
  state.actors["goblin-1"].reaction = false;
  state.actors.livia.reaction = false;
  startCombat(state);
  assert.equal(state.combat.active, true);
  assert.equal(state.actors.livia.reaction, true);
  assert.equal(state.actors["goblin-1"].reaction, false);
});
test("configured grid snapping uses the same scene offsets as preparation", () => {
  const s = createInitialState();
  s.scenes[0].gridSnap = true;
  s.scenes[0].gridOffsetX = 10;
  s.scenes[0].gridOffsetY = 20;
  const p = previewMovement(s, "livia", { x: 333, y: 302 });
  assert.deepEqual(p.target, { x: 335, y: 295 });
});
test("a private shared mutation keeps its authority and private audit through undo", () => {
  const store = createStore({ storage: { getItem: () => null, setItem: () => {} } });
  store.commit(
    "Private initiative",
    (s) => {
      s.initiativeRolls = [{ natural: 15 }];
    },
    "dm",
    { shared: true, visibility: "private" },
  );
  assert.equal(store.history.at(-1).shared, true);
  assert.equal(store.state.log.at(-1).visibility, "private");
  store.undo("dm");
  assert.equal(store.state.log.at(-1).visibility, "private");
});

const initiativeEntry = (id, natural) => ({
  id,
  sceneId: "old-watch",
  sceneName: "Courtyard",
  actorId: "livia",
  actorName: "Livia",
  natural,
  bonus: 2,
  total: natural + 2,
  mode: "physical",
  controller: "dm",
  visibility: "private",
});

test("accepted initiative faces survive undo, repeated undo and reload without duplicate evidence", () => {
  const storage = memory();
  const store = createStore({ storage });
  store.commit(
    "First result",
    (state) => {
      state.initiativeRolls = [initiativeEntry("roll-1", 14)];
    },
    "dm",
    { visibility: "private" },
  );
  const firstCommit = store.state.log.at(-1);
  assert.equal(firstCommit.rolls?.length, 1);
  assert.deepEqual(firstCommit.rolls[0].values, [14]);
  assert.equal(firstCommit.rolls[0].modifier, 2);
  assert.equal(firstCommit.rolls[0].total, 16);
  assert.equal(firstCommit.rolls[0].visibility, "private");
  assert.equal(firstCommit.rolls[0].controller, "dm");
  assert.deepEqual(store.history.at(-1).rolls, firstCommit.rolls);
  store.commit(
    "Metadata",
    (state) => {
      state.scenes[0].name = "Renamed";
    },
    "dm",
  );
  assert.deepEqual(store.state.log.at(-1).rolls, []);
  store.commit(
    "Reroll",
    (state) => {
      state.initiativeRolls.push(initiativeEntry("roll-2", 8));
    },
    "dm",
    { visibility: "private" },
  );
  const rerollId = store.state.log.at(-1).id;
  store.undo("dm");
  assert.equal(store.state.log.at(-1).revertsId, rerollId);
  assert.equal(store.state.initiativeRolls.length, 2);
  assert.equal(store.state.initiativeRolls[1].status, "reversed");
  assert.equal(store.state.initiativeRolls[1].natural, 8);
  assert.equal(store.state.initiativeRolls[1].reversedBy, "dm");
  assert.equal(store.state.initiativeRolls[1].reversedByLogId, store.state.log.at(-1).id);
  store.undo("dm");
  assert.equal(store.state.initiativeRolls[1].status, "reversed");
  assert.equal(store.state.scenes[0].name, "Il cortile dell’osservatorio");
  store.undo("dm");
  assert.deepEqual(
    store.state.initiativeRolls.map((entry) => entry.status),
    ["reversed", "reversed"],
  );
  assert.deepEqual(
    store.state.log.find((entry) => entry.id === firstCommit.id).rolls,
    firstCommit.rolls,
  );
  const reloaded = createStore({ storage });
  assert.deepEqual(reloaded.state.initiativeRolls, store.state.initiativeRolls);
  assert.equal(reloaded.state.log.flatMap((entry) => entry.rolls || []).length, 2);
  reloaded.commit(
    "Keep records",
    (state) => {
      state.initiativeRolls[0].natural = 20;
      state.initiativeRolls[0].status = "accepted";
      state.initiativeRolls.push(initiativeEntry("roll-2", 20));
    },
    "dm",
  );
  assert.equal(reloaded.state.initiativeRolls[0].natural, 14);
  assert.equal(reloaded.state.initiativeRolls[0].status, "reversed");
  assert.equal(reloaded.state.initiativeRolls.length, 2);
  assert.deepEqual(reloaded.state.log.at(-1).rolls, []);
});

function combatStore(storage = memory()) {
  const store = createStore({ storage });
  store.state.combat.active = true;
  store.state.actors["goblin-1"].hp = 40;
  store.state.actors["goblin-1"].maxHp = 40;
  Object.assign(
    store.state.scenes[0].tokens.find((token) => token.actorId === "goblin-1"),
    { x: 280, y: 380 },
  );
  return store;
}

test("undo restores a combat request to pending but retains the accepted roll and its breakdown", () => {
  const storage = memory();
  const store = combatStore(storage);
  store.commit("Attempt", (state) =>
    beginAttempt(
      state,
      {
        id: "attack-1",
        actorId: "livia",
        actionId: "quarterstaff",
        selection: { targetIds: ["goblin-1"] },
        mode: "physical",
      },
      "player",
    ),
  );
  const attackId = store.state.combatAttempts[0].requests[0].id;
  assert.deepEqual(store.state.log.at(-1).rolls, []);
  assert.throws(() =>
    store.commit("Invalid dice", (state) =>
      resolveRoll(state, "attack-1", attackId, [99], "player"),
    ),
  );
  assert.equal(store.state.log.flatMap((entry) => entry.rolls || []).length, 0);
  store.commit("Attack result", (state) =>
    resolveRoll(state, "attack-1", attackId, [20], "player"),
  );
  const accepted = structuredClone(store.state.log.at(-1));
  assert.deepEqual(accepted.rolls[0].values, [20]);
  assert.equal(accepted.rolls[0].requestId, attackId);
  assert.equal(accepted.rolls[0].attemptId, "attack-1");
  assert.equal(accepted.rolls[0].kind, "attack");
  assert.equal(accepted.rolls[0].owner, "player");
  store.commit("Same response retry", (state) =>
    resolveRoll(state, "attack-1", attackId, [20], "player"),
  );
  assert.deepEqual(store.state.log.at(-1).rolls, []);
  store.undo("player");
  store.undo("player");
  assert.equal(store.state.combatAttempts[0].requests[0].status, "pending");
  assert.equal(store.state.combatAttempts[0].requests[0].values, undefined);
  assert.equal(store.state.actors.livia.action, false);
  assert.deepEqual(store.state.log.find((entry) => entry.id === accepted.id).rolls, accepted.rolls);
  assert.equal(store.state.log.at(-1).revertsId, accepted.id);
  const reloaded = createStore({ storage });
  assert.equal(reloaded.state.combatAttempts[0].requests[0].status, "pending");
  assert.deepEqual(
    reloaded.state.log.find((entry) => entry.id === accepted.id).rolls,
    accepted.rolls,
  );
  reloaded.commit("Replacement result", (state) =>
    resolveRoll(state, "attack-1", attackId, [12], "player", { correctionReason: "Correct physical transcription" }),
  );
  assert.deepEqual(
    reloaded.state.log.flatMap((entry) => entry.rolls || []).map((roll) => roll.values),
    [[20], [12]],
  );
  assert.notEqual(reloaded.state.log.at(-1).rolls[0].id, accepted.rolls[0].id);
});

test("combat roll evidence retains the proper owner and never makes NPC defenses public", () => {
  const store = combatStore();
  store.commit("Spell attempt", (state) =>
    beginAttempt(
      state,
      {
        id: "cone-1",
        actorId: "livia",
        actionId: "burning-hands",
        selection: { point: { x: 450, y: 380 } },
        mode: "physical",
      },
      "player",
    ),
  );
  const save = store.state.combatAttempts[0].requests.find(
    (request) => request.kind === "save" && request.actorId === "goblin-1",
  );
  store.commit("Save accepted", (state) => resolveRoll(state, "cone-1", save.id, [15], "dm"), "dm");
  const evidence = store.state.log.at(-1).rolls?.[0];
  assert.equal(evidence?.owner, "dm");
  assert.equal(evidence?.visibility, "private");
  assert.equal(evidence?.controller, "dm");
  assert.equal(evidence?.modifier, 2);
  assert.equal(evidence?.total, 17);
  assert.equal(evidence?.saveDC, undefined);
  assert.equal(evidence?.targetAC, undefined);
  const damage = store.state.combatAttempts[0].requests.find(
    (request) => request.kind === "damage",
  );
  store.state.actors.livia.hidden = true;
  store.commit(
    "Player dice accepted by DM",
    (state) => resolveRoll(state, "cone-1", damage.id, [1, 2, 3], "dm"),
    "dm",
  );
  const ownEvidence = store.state.log.at(-1).rolls[0];
  assert.equal(ownEvidence.owner, "player");
  assert.equal(ownEvidence.controller, "dm");
  assert.equal(ownEvidence.visibility, "private");
  assert.deepEqual(ownEvidence.values, [1, 2, 3]);
});

test("reversing applied damage restores hit points while retaining both accepted rolls", () => {
  const store = combatStore();
  store.commit("Attempt", (state) =>
    beginAttempt(
      state,
      {
        id: "damage-1",
        actorId: "livia",
        actionId: "quarterstaff",
        selection: { targetIds: ["goblin-1"] },
        mode: "physical",
      },
      "player",
    ),
  );
  const attack = store.state.combatAttempts[0].requests[0];
  store.commit("Hit", (state) => resolveRoll(state, "damage-1", attack.id, [20], "player"));
  const damage = store.state.combatAttempts[0].requests.find(
    (request) => request.kind === "damage",
  );
  store.commit("Damage", (state) => resolveRoll(state, "damage-1", damage.id, [4, 5], "player"));
  assert.equal(store.state.actors["goblin-1"].hp, 31);
  const damageEvidence = structuredClone(store.state.log.at(-1).rolls[0]);
  store.undo("player");
  assert.equal(store.state.actors["goblin-1"].hp, 40);
  assert.equal(store.state.actors.livia.action, false);
  assert.equal(
    store.state.combatAttempts[0].requests.find((request) => request.kind === "damage").status,
    "pending",
  );
  const rolls = store.state.log.flatMap((entry) => entry.rolls || []);
  assert.equal(rolls.length, 2);
  assert.deepEqual(rolls[1], damageEvidence);
  assert.deepEqual(rolls[1].dice, [{ count: 2, sides: 6 }]);
  assert.deepEqual(rolls[1].values, [4, 5]);
  assert.equal(rolls[1].modifier, 0);
  assert.equal(rolls[1].total, 9);
});
test("accepted build dice stay private and immutable after draft changes, undo and reload", () => {
  let persisted;
  const store = createStore({
    storage: {
      getItem: () => persisted ?? null,
      setItem: (_, value) => {
        persisted = value;
      },
    },
  });
  store.commit(
    "Draft",
    (state) => {
      state.characterDrafts = [{ id: "build", owner: "player", rolls: [] }];
    },
    "player",
    { shared: false },
  );
  const roll = {
    id: "build-roll",
    draftId: "build",
    owner: "player",
    controller: "player",
    kind: "abilities",
    status: "resolved",
    mode: "physical",
    dice: [{ count: 4, sides: 6 }],
    values: [6, 4, 3, 1],
    discarded: [1],
    total: 13,
  };
  store.commit(
    "Ability roll",
    (state) => {
      state.characterBuildRolls = [structuredClone(roll)];
      state.characterDrafts[0].rolls.push(structuredClone(roll));
    },
    "player",
    { shared: false },
  );
  assert.equal(store.state.log.at(-1).rolls[0].visibility, "private");
  store.commit(
    "Remove draft roll",
    (state) => {
      state.characterBuildRolls = [];
      state.characterDrafts[0].rolls = [];
    },
    "player",
    { shared: false },
  );
  assert.deepEqual(store.state.characterBuildRolls[0].values, [6, 4, 3, 1]);
  store.undo("player");
  assert.equal(store.state.characterBuildRolls[0].status, "resolved");
  store.undo("player");
  assert.equal(store.state.characterBuildRolls[0].status, "reversed");
  assert.deepEqual(store.state.log.flatMap((entry) => entry.rolls)[0].values, [6, 4, 3, 1]);
  const reloaded = createStore({ storage: { getItem: () => persisted, setItem: () => {} } });
  assert.equal(reloaded.state.characterBuildRolls[0].status, "reversed");
});
