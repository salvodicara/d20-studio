import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState, createStore } from "../state.mjs";

function setup() {
  const initial = createInitialState();
  initial.actors.livia.hitDice = { d6: { max: 3, used: 0 } };
  initial.restTime = {
    version: 1,
    clocks: { lanterns: { seconds: 3600, revision: 1 } },
    rests: [{ id: "rest-1", participants: [{ actorId: "livia", status: "completed" }] }],
    rolls: [],
    events: [],
  };
  let saved = JSON.stringify(initial);
  const storage = {
    getItem: () => saved,
    setItem: (_key, value) => {
      saved = value;
    },
  };
  return { store: createStore({ storage }), storage };
}

// These fixtures isolate the store contract; domain journeys verify rule eligibility.
function begin(state) {
  state.actors.livia.hitDice.d6.used++;
  state.restTime.rolls.push({
    id: "hd-1",
    restId: "rest-1",
    benefitId: "short-1",
    actorId: "livia",
    owner: "player",
    die: "d6",
    sides: 6,
    mode: "physical",
    modifier: 2,
    status: "pending",
    acceptedFace: null,
    source: { kind: "authored", revision: "store-test" },
  });
}
function resolve(state) {
  const roll = state.restTime.rolls[0];
  roll.acceptedFace = 3;
  roll.status = "resolved";
  roll.result = { natural: 3, modifier: 2, total: 5, healed: 4 };
  state.actors.livia.hp = 22;
}

test("Undo keeps accepted Hit Die face on the restored pending attempt without refunding its die", () => {
  const { store, storage } = setup();
  store.commit("Hit Die attempted", begin, "player");
  store.commit("Healing applied", resolve, "player");
  const audit = store.state.log.at(-1).rolls;
  assert.equal(audit.length, 1);
  assert.equal(audit[0].source, "rest");
  assert.deepEqual(audit[0].values, [3]);
  store.undo("player");
  assert.equal(store.state.actors.livia.hp, 18);
  assert.equal(store.state.actors.livia.hitDice.d6.used, 1);
  assert.equal(store.state.restTime.rolls[0].status, "pending");
  assert.equal(store.state.restTime.rolls[0].acceptedFace, 3);
  assert.equal(createStore({ storage }).state.restTime.rolls[0].acceptedFace, 3);
  store.commit("Known result reapplied", resolve, "player");
  assert.equal(store.state.log.at(-1).rolls.length, 0, "Reapplication is not another throw");
  assert.throws(
    () =>
      store.commit(
        "Different face",
        (s) => {
          s.restTime.rolls[0].acceptedFace = 5;
        },
        "player",
      ),
    /face|result/i,
  );
  assert.equal(store.state.restTime.rolls[0].acceptedFace, 3);
});

test("Undo of the Hit Die attempt restores usage but keeps the removed throw as reversed evidence", () => {
  const { store, storage } = setup();
  store.commit("Hit Die attempted", begin, "player");
  store.commit("Healing applied", resolve, "player");
  store.undo("player");
  store.undo("player");
  assert.equal(store.state.actors.livia.hitDice.d6.used, 0);
  assert.equal(store.state.actors.livia.hp, 18);
  assert.equal(store.state.restTime.rolls[0].status, "reversed");
  assert.equal(store.state.restTime.rolls[0].acceptedFace, 3);
  assert.equal(createStore({ storage }).state.restTime.rolls[0].status, "reversed");
  assert.equal(store.state.log.filter((e) => e.rolls.some((r) => r.source === "rest")).length, 1);
});

test("Undo restores clock, participant and resource changes atomically while preserving later private writing", () => {
  const { store } = setup();
  store.commit(
    "Rest and time completed",
    (state) => {
      state.restTime.clocks.lanterns.seconds += 28800;
      state.restTime.rests[0].participants[0].status = "resting";
      state.actors.livia.hp = 22;
    },
    "dm",
  );
  store.commit(
    "Independent private text",
    (state) => {
      state.campaignContent.drafts.push({
        id: "private-note",
        ownerId: "player",
        data: { body: "Kept" },
      });
    },
    "player",
    { shared: false, undoable: false },
  );
  store.undo("dm");
  assert.equal(store.state.restTime.clocks.lanterns.seconds, 3600);
  assert.equal(store.state.restTime.rests[0].participants[0].status, "completed");
  assert.equal(store.state.actors.livia.hp, 18);
  assert.equal(store.state.campaignContent.drafts.at(-1).data.body, "Kept");
});

test("a personal rest roll keeps its original privacy after the actor joins a campaign", () => {
  const { store } = setup();
  store.commit(
    "Attempt",
    (state) => {
      begin(state);
      state.restTime.rolls[0].campaignId = null;
    },
    "player",
    { visibility: "private" },
  );
  store.commit(
    "Result",
    (state) => {
      state.actors.livia.visibility = "shared";
      resolve(state);
    },
    "player",
  );
  assert.equal(store.state.actors.livia.visibility, "shared");
  assert.equal(store.state.log.at(-1).rolls[0].visibility, "private");
});
