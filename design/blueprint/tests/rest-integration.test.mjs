import test from "node:test";
import assert from "node:assert/strict";
import { createStore, startCombat, moveActor } from "../state.mjs";
import * as rest from "../rest-time.mjs";
import { beginAttempt, resolveRoll } from "../combat.mjs";
import { createCharacterDraft, previewCharacterDraft } from "../character-build.mjs";

function setup() {
  let value = null;
  const storage = {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    },
  };
  return { store: createStore({ storage }), storage };
}
function shortRest(store, ids = ["livia"]) {
  const input = { id: "short", kind: "short", campaignId: "lanterns", actorIds: ids };
  store.commit("Rest started", (s) => rest.startRest(s, input, "dm"), "dm");
  store.commit(
    "One hour passed",
    (s) => rest.advanceGameTime(s, { id: "hour", campaignId: "lanterns", seconds: 3600 }, "dm"),
    "dm",
  );
  store.commit(
    "Short Rest completed",
    (s) => rest.completeRest(s, "short", { id: "complete", actorIds: ids }, "dm"),
    "dm",
  );
  return rest
    .getRest(store.state, "short", "dm")
    .participants.find((p) => p.actorId === "livia")
    .benefits.at(-1).id;
}

test("real rest commands share actor resources and preserve the accepted face through Undo and reload", () => {
  const { store, storage } = setup();
  const benefitId = shortRest(store);
  const input = { id: "physical-hd", actorId: "livia", benefitId, die: "d6", mode: "physical" };
  store.commit(
    "Physical Hit Die attempted",
    (s) => rest.beginHitDie(s, "short", input, "player"),
    "player",
  );
  assert.equal(store.state.actors.livia.hitDice.d6.used, 2);
  const reloaded = createStore({ storage });
  assert.equal(rest.getRestRolls(reloaded.state, "player")[0].status, "pending");
  reloaded.commit(
    "Known face applied",
    (s) => rest.resolveHitDie(s, "physical-hd", { face: 3 }, "player"),
    "player",
  );
  assert.equal(reloaded.state.actors.livia.hp, 22);
  reloaded.undo("player");
  assert.equal(reloaded.state.actors.livia.hp, 18);
  assert.equal(rest.getRestRolls(reloaded.state, "player")[0].acceptedFace, 3);
  assert.throws(() =>
    reloaded.commit(
      "Different face",
      (s) => rest.resolveHitDie(s, "physical-hd", { face: 4 }, "player"),
      "player",
    ),
  );
  reloaded.commit(
    "Accepted face reapplied",
    (s) => rest.resolveHitDie(s, "physical-hd", {}, "player"),
    "player",
  );
  assert.equal(reloaded.state.actors.livia.hp, 22);
  assert.equal(
    reloaded.state.log.filter((e) => e.rolls.some((r) => r.source === "rest")).length,
    1,
  );
});

test("actual movement closes the recovery window without refunding an already attempted physical die", () => {
  const { store } = setup();
  const benefitId = shortRest(store);
  store.commit(
    "Physical Hit Die attempted",
    (s) =>
      rest.beginHitDie(
        s,
        "short",
        { id: "physical-hd", actorId: "livia", benefitId, die: "d6", mode: "physical" },
        "player",
      ),
    "player",
  );
  store.commit(
    "Movement executed",
    (s) => moveActor(s, "livia", { x: 300, y: 380 }, "player"),
    "player",
  );
  const participant = rest.getRest(store.state, "short", "player").participants[0];
  assert.equal(participant.benefits[0].closed, true);
  assert.equal(store.state.actors.livia.hitDice.d6.used, 2);
  store.commit(
    "Attempted face finished",
    (s) => rest.resolveHitDie(s, "physical-hd", { face: 1 }, "player"),
    "player",
  );
  assert.equal(store.state.actors.livia.hp, 21);
  assert.throws(() =>
    rest.beginHitDie(
      store.state,
      "short",
      { id: "too-late", actorId: "livia", benefitId, die: "d6", mode: "physical" },
      "player",
    ),
  );
});

test("entering initiative interrupts only those resting participants who enter the encounter", () => {
  const { store } = setup();
  store.commit(
    "Both rest",
    (s) =>
      rest.startRest(
        s,
        {
          id: "partial",
          kind: "long",
          campaignId: "lanterns",
          actorIds: ["livia", "doran"],
          activityByActor: { livia: "sleep", doran: "light" },
        },
        "dm",
      ),
    "dm",
  );
  store.commit(
    "Livia enters combat",
    (s) => {
      s.combat.order = ["livia", "goblin-1"];
      startCombat(s);
    },
    "dm",
  );
  const participants = rest.getRest(store.state, "partial", "dm").participants;
  assert.equal(participants.find((p) => p.actorId === "livia").status, "interrupted");
  assert.equal(participants.find((p) => p.actorId === "doran").status, "resting");
  assert.equal(store.state.actors.livia.hp, 18);
});

test("actual incoming damage interrupts a resting nonparticipant without borrowing that actor's controller", () => {
  const { store } = setup();
  store.commit(
    "Doran rests",
    (s) =>
      rest.startRest(
        s,
        { id: "doran-rest", kind: "long", campaignId: "lanterns", actorIds: ["doran"] },
        "dm",
      ),
    "dm",
  );
  store.commit(
    "Other actors enter combat",
    (s) => {
      s.combat.order = ["livia", "goblin-1"];
      startCombat(s);
    },
    "dm",
  );
  assert.equal(rest.getRest(store.state, "doran-rest", "dm").participants[0].status, "resting");
  store.commit(
    "Spell attempted",
    (s) =>
      beginAttempt(
        s,
        {
          id: "incoming-spell",
          actorId: "livia",
          actionId: "magic-missile",
          mode: "physical",
          selection: { allocations: [{ actorId: "doran", count: 3 }] },
        },
        "player",
      ),
    "player",
  );
  const request = store.state.combatAttempts.at(-1).requests[0];
  store.commit(
    "Damage applied",
    (s) => resolveRoll(s, "incoming-spell", request.id, [1, 1, 1], "player"),
    "player",
  );
  const participant = rest.getRest(store.state, "doran-rest", "dm").participants[0];
  assert.equal(participant.status, "interrupted");
  assert.equal(participant.interruptions.length, 1);
  assert.equal(participant.interruptions[0].cause, "damage");
  assert.equal(store.state.actors.doran.hp, 21);
});

test("an unresolved Hit Die blocks rebuilding only its own actor while keeping the draft recoverable", () => {
  const { store } = setup();
  const benefitId = shortRest(store);
  const s = store.state;
  createCharacterDraft(s, { id: "revise-livia", kind: "revise", actorId: "livia" }, "player");
  createCharacterDraft(s, { id: "revise-doran", kind: "revise", actorId: "doran" }, "dm");
  rest.beginHitDie(
    s,
    "short",
    { id: "unsettled", actorId: "livia", benefitId, die: "d6", mode: "physical" },
    "player",
  );
  assert.ok(
    previewCharacterDraft(s, "revise-livia", "player").errors.some(
      (e) => e.code === "pending-consequences",
    ),
  );
  assert.ok(
    !previewCharacterDraft(s, "revise-doran", "dm").errors.some(
      (e) => e.code === "pending-consequences",
    ),
  );
  rest.resolveHitDie(s, "unsettled", { face: 1 }, "player");
  assert.ok(
    !previewCharacterDraft(s, "revise-livia", "player").errors.some(
      (e) => e.code === "pending-consequences",
    ),
  );
  assert.equal(s.characterDrafts.find((d) => d.id === "revise-livia").status, "active");
});

test("earned deterministic short-rest benefits are available immediately in the encounter interrupting a Long Rest", () => {
  const { store } = setup();
  store.commit(
    "Doran rests",
    (s) =>
      rest.startRest(
        s,
        { id: "mature-long", kind: "long", campaignId: "lanterns", actorIds: ["doran"] },
        "dm",
      ),
    "dm",
  );
  store.commit(
    "An hour of rest",
    (s) =>
      rest.advanceGameTime(s, { id: "mature-hour", campaignId: "lanterns", seconds: 3600 }, "dm"),
    "dm",
  );
  store.commit(
    "Combat interrupts",
    (s) => {
      s.combat.order = ["doran", "goblin-1"];
      startCombat(s);
    },
    "dm",
  );
  assert.equal(
    store.state.actors.doran.features.find((f) => f.id === "sample-second-wind").used,
    1,
  );
  assert.equal(
    store.state.actors.doran.features.find((f) => f.id === "sample-action-surge").used,
    0,
  );
  assert.equal(store.state.actors.doran.hp, 27);
  const participant = rest.getRest(store.state, "mature-long", "dm").participants[0];
  assert.equal(participant.status, "interrupted");
  assert.equal(participant.benefits[0].applied, true);
  store.undo("dm");
  assert.equal(
    store.state.actors.doran.features.find((f) => f.id === "sample-second-wind").used,
    2,
  );
  assert.equal(rest.getRest(store.state, "mature-long", "dm").participants[0].status, "resting");
});
