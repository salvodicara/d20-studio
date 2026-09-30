import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import {
  beginAttempt,
  resolveRoll,
  resolveAutomaticRolls,
  projectAttempts,
  knownEvidence,
} from "../combat.mjs";
import { renderRollHistory } from "../combat-ui.mjs";

function memoryStorage() {
  let saved;
  return {
    getItem: () => saved,
    setItem: (_key, value) => {
      saved = value;
    },
  };
}

function setup(mode = "physical", prepare = () => {}) {
  const storage = memoryStorage();
  const store = createStore({ storage });
  store.commit("Fixture", (s) => {
    s.combat.active = true;
    s.combat.order = ["livia", "goblin-1"];
    s.combat.turn = 0;
    s.scenes[0].tokens = [
      { actorId: "livia", x: 100, y: 100 },
      { actorId: "goblin-1", x: 140, y: 100 },
    ];
    prepare(s);
  });
  store.commit("Attempt", (s) =>
    beginAttempt(
      s,
      {
        id: "evidence-attempt",
        actorId: "livia",
        actionId: "quarterstaff",
        selection: { targetIds: ["goblin-1"] },
        mode,
      },
      "player",
    ),
  );
  return { store, storage, requestId: store.state.combatAttempts[0].requests[0].id };
}

function setupHidden() {
  const storage = memoryStorage();
  const store = createStore({ storage });
  store.commit(
    "Hidden fixture",
    (s) => {
      s.combat.active = true;
      s.combat.order = ["goblin-1", "livia"];
      s.combat.turn = 0;
      s.scenes[0].tokens = [
        { actorId: "goblin-1", x: 100, y: 100 },
        { actorId: "livia", x: 140, y: 100 },
      ];
      s.actors["goblin-1"].hidden = true;
      s.actors["goblin-1"].combatProfile = {
        team: "watch",
        meleeAttack: {
          name: { it: "Lama", en: "Blade" },
          reachMeters: 1.5,
          attackBonus: 4,
          damageDice: [{ count: 1, sides: 6 }],
          damageModifier: 2,
          damageType: "slashing",
          source: { kind: "authored-demo", edition: "2024", revision: "evidence-case" },
        },
      };
      s.actors.livia.reaction = false;
      s.actors.livia.hp = 30;
      s.actors.livia.maxHp = 30;
    },
    "dm",
  );
  store.commit(
    "Hidden attempt",
    (s) =>
      beginAttempt(
        s,
        {
          id: "hidden-attempt",
          actorId: "goblin-1",
          actionId: "melee-attack",
          selection: { targetIds: ["livia"] },
          mode: "digital",
        },
        "dm",
      ),
    "dm",
  );
  return { store, storage };
}

test("Undo restores an unresolved application but cannot replace an already accepted attack face", () => {
  const { store, storage, requestId } = setup();
  store.commit("Natural one", (s) => resolveRoll(s, "evidence-attempt", requestId, [1], "player"));
  assert.equal(store.state.combatAttempts[0].outcomes[0].status, "missed");
  store.undo();
  assert.equal(store.state.combatAttempts[0].requests[0].status, "pending");
  assert.equal(store.state.actors.livia.action, false);
  const reloaded = createStore({ storage });
  assert.throws(
    () =>
      reloaded.commit("Replace known face", (s) =>
        resolveRoll(s, "evidence-attempt", requestId, [20], "player"),
      ),
    /accepted|recorded/i,
  );
  reloaded.commit("Reapply known face", (s) =>
    resolveRoll(s, "evidence-attempt", requestId, [1], "player"),
  );
  assert.equal(reloaded.state.combatAttempts[0].outcomes[0].status, "missed");
  assert.equal(reloaded.state.log.flatMap((entry) => entry.rolls ?? []).length, 1);
});

test("automatic continuation after Undo reuses accepted dice without generating new random faces", () => {
  const { store, requestId } = setup("digital");
  store.commit("Digital one", (s) => resolveAutomaticRolls(s, () => 1));
  store.undo();
  let calls = 0;
  const roll = (sides) => {
    calls++;
    return sides;
  };
  // Undo withdrew the application: an unrelated automatic continuation does not
  // silently apply it again (review 10, digital Undo).
  store.commit("Another command", (s) => resolveAutomaticRolls(s, roll));
  assert.equal(calls, 0);
  assert.equal(store.state.combatAttempts[0].requests[0].withdrawn, true);
  assert.equal(store.state.combatAttempts[0].outcomes[0].status, "pending");
  store.commit("Reapply known result", (s) => {
    resolveRoll(s, "evidence-attempt", requestId, [1], "player");
    resolveAutomaticRolls(s, roll);
  });
  assert.equal(calls, 0);
  assert.equal(store.state.combatAttempts[0].outcomes[0].status, "missed");
  assert.equal(store.state.log.flatMap((entry) => entry.rolls ?? []).length, 1);
});

test("a damage request recreated after Undo retains the faces accepted in the original digital batch", () => {
  const { store, storage } = setup("digital");
  store.commit("Attack and damage", (s) =>
    resolveAutomaticRolls(s, (sides) => (sides === 20 ? 19 : 3)),
  );
  const hp = store.state.actors["goblin-1"].hp;
  const original = store.state.combatAttempts[0].requests.map((request) => request.values);
  assert.equal(original.length, 2);
  store.undo();
  const resumed = createStore({ storage });
  let calls = 0;
  const attack = resumed.state.combatAttempts[0].requests[0];
  assert.deepEqual(attack.acceptedValues, original[0]);
  // The explicit Reapply of the known attack face continues the batch with the
  // recreated damage request's known faces; nothing is rolled again.
  resumed.commit("Resume the batch", (s) => {
    resolveRoll(s, "evidence-attempt", attack.id, attack.acceptedValues, "player");
    resolveAutomaticRolls(s, () => {
      calls++;
      return 1;
    });
  });
  assert.equal(calls, 0);
  assert.equal(resumed.state.actors["goblin-1"].hp, hp);
  assert.deepEqual(
    resumed.state.combatAttempts[0].requests.map((request) => request.values),
    original,
  );
  assert.equal(resumed.state.log.flatMap((entry) => entry.rolls ?? []).length, 2);
});

test("a reasoned physical-face correction after Undo preserves both original and corrected evidence", () => {
  const { store, requestId } = setup();
  store.commit("Mistyped result", (s) =>
    resolveRoll(s, "evidence-attempt", requestId, [1], "player"),
  );
  store.undo();
  store.commit("Correct written face", (s) =>
    resolveRoll(s, "evidence-attempt", requestId, [12], "player", {
      correctionReason: "The physical die showed twelve, not one",
    }),
  );
  assert.deepEqual(store.state.combatAttempts[0].requests[0].acceptedValues, [12]);
  const evidence = store.state.log.flatMap((entry) => entry.rolls ?? []);
  assert.deepEqual(
    evidence.map((entry) => entry.values),
    [[1], [12]],
  );
  assert.match(evidence[1].correctionReason, /physical die/);
  assert.deepEqual(evidence[1].previousValues, [1]);
});

// --- Recomputed dice profiles after Undo (normal/critical damage) ---

const reason = "The d20 face was transcribed wrongly";
const combatRolls = (state) => state.log.flatMap((entry) => entry.rolls ?? []);
const damageOf = (state) =>
  state.combatAttempts[0].requests.find((request) => request.kind === "damage");
function sturdyTarget(store) {
  store.commit("Sturdy target", (s) => {
    s.actors["goblin-1"].hp = 30;
    s.actors["goblin-1"].maxHp = 30;
  });
}
function faces(list) {
  const queue = [...list];
  return (sides) => (sides === 20 ? queue.shift() : queue.shift());
}

test("correcting a digital hit into a critical keeps the known damage face and rolls only the missing die", () => {
  const { store, storage, requestId } = setup("digital");
  sturdyTarget(store);
  store.commit("Attack and damage", (s) => resolveAutomaticRolls(s, faces([19, 3])));
  assert.equal(store.state.actors["goblin-1"].hp, 27);
  store.undo();
  const resumed = createStore({ storage });
  const rolled = [];
  resumed.commit("Correct attack face", (s) => {
    resolveRoll(s, "evidence-attempt", requestId, [20], "player", { correctionReason: reason });
    resolveAutomaticRolls(s, (sides) => {
      rolled.push(sides);
      return 5;
    });
  });
  assert.deepEqual(rolled, [6], "only the second critical die is new");
  const damage = damageOf(resumed.state);
  assert.deepEqual(damage.dice, [{ count: 2, sides: 6 }]);
  assert.deepEqual(damage.values, [3, 5]);
  assert.equal(resumed.state.actors["goblin-1"].hp, 22);
  const evidence = combatRolls(resumed.state);
  assert.deepEqual(
    evidence.map((roll) => [roll.kind, roll.status ?? "resolved", roll.values]),
    [
      ["attack", "resolved", [19]],
      ["damage", "resolved", [3]],
      ["attack", "resolved", [20]],
      ["damage", "resolved", [3, 5]],
    ],
  );
  assert.deepEqual(evidence[2].previousValues, [19]);
  assert.equal(evidence[2].correctionReason, reason);
  assert.deepEqual(evidence[3].knownValues, [3, null]);
  assert.deepEqual(evidence[3].recomputedFrom.dice, [{ count: 1, sides: 6 }]);
});

test("correcting a digital critical into a hit reuses the first known face and supersedes the extra die", () => {
  const { store, storage, requestId } = setup("digital");
  sturdyTarget(store);
  store.commit("Critical batch", (s) => resolveAutomaticRolls(s, faces([20, 3, 4])));
  assert.equal(store.state.actors["goblin-1"].hp, 23);
  store.undo();
  const resumed = createStore({ storage });
  let calls = 0;
  resumed.commit("Correct attack face", (s) => {
    resolveRoll(s, "evidence-attempt", requestId, [19], "player", { correctionReason: reason });
    resolveAutomaticRolls(s, () => {
      calls++;
      return 6;
    });
  });
  assert.equal(calls, 0, "no implicit reroll");
  const damage = damageOf(resumed.state);
  assert.deepEqual(damage.dice, [{ count: 1, sides: 6 }]);
  assert.deepEqual(damage.values, [3]);
  assert.equal(resumed.state.actors["goblin-1"].hp, 27);
  const superseded = combatRolls(resumed.state).filter((roll) => roll.status === "superseded");
  assert.equal(superseded.length, 1);
  assert.deepEqual(superseded[0].values, [3, 4]);
  assert.deepEqual(superseded[0].supersededValues, [4]);
  assert.deepEqual(superseded[0].keptValues, [3]);
  assert.deepEqual(superseded[0].dice, [{ count: 2, sides: 6 }]);
  assert.deepEqual(superseded[0].newDice, [{ count: 1, sides: 6 }]);
  assert.equal(superseded[0].visibility, "shared");
  // The original critical batch stays in history with every face.
  assert.deepEqual(
    combatRolls(resumed.state)
      .filter((roll) => roll.kind === "damage" && roll.status !== "superseded")
      .map((roll) => roll.values),
    [[3, 4], [3]],
  );
});

test("a physical recomputed damage request asks only for the missing typed face", () => {
  const { store, requestId } = setup("physical");
  sturdyTarget(store);
  store.commit("Attack", (s) => resolveRoll(s, "evidence-attempt", requestId, [19], "player"));
  const damageId = damageOf(store.state).id;
  store.commit("Damage", (s) => resolveRoll(s, "evidence-attempt", damageId, [3], "player"));
  store.undo();
  store.undo();
  store.commit("Correct attack face", (s) =>
    resolveRoll(s, "evidence-attempt", requestId, [20], "player", { correctionReason: reason }),
  );
  const pending = damageOf(store.state);
  assert.equal(pending.status, "pending");
  assert.deepEqual(pending.dice, [{ count: 2, sides: 6 }]);
  assert.deepEqual(pending.knownValues, [3, null]);
  assert.equal(pending.acceptedValues, undefined);
  assert.throws(
    () =>
      store.commit("Replace known face", (s) =>
        resolveRoll(s, "evidence-attempt", damageId, [4, 5], "player"),
      ),
    /accepted|recorded/i,
  );
  store.commit("Missing face", (s) =>
    resolveRoll(s, "evidence-attempt", damageId, [3, 5], "player"),
  );
  assert.equal(damageOf(store.state).total, 8);
  assert.equal(store.state.actors["goblin-1"].hp, 22);
});

test("Undo keeps a completed recomputed profile known so a repeated correction never rerolls", () => {
  const { store, storage, requestId } = setup("digital");
  sturdyTarget(store);
  store.commit("Attack and damage", (s) => resolveAutomaticRolls(s, faces([19, 3])));
  store.undo();
  store.commit("Correct attack face", (s) => {
    resolveRoll(s, "evidence-attempt", requestId, [20], "player", { correctionReason: reason });
    resolveAutomaticRolls(s, () => 5);
  });
  store.undo();
  const resumed = createStore({ storage });
  assert.deepEqual(resumed.state.combatAttempts[0].requests[0].acceptedValues, [20]);
  let calls = 0;
  resumed.commit("Reapply the corrected critical", (s) => {
    resolveRoll(s, "evidence-attempt", requestId, [20], "player");
    resolveAutomaticRolls(s, () => {
      calls++;
      return 1;
    });
  });
  assert.equal(calls, 0);
  assert.deepEqual(damageOf(resumed.state).values, [3, 5]);
  assert.equal(resumed.state.actors["goblin-1"].hp, 22);
  // Correcting back to a normal hit keeps the first face and supersedes the second.
  resumed.undo();
  resumed.commit("Correct back to a hit", (s) => {
    resolveRoll(s, "evidence-attempt", requestId, [19], "player", { correctionReason: reason });
    resolveAutomaticRolls(s, () => {
      calls++;
      return 1;
    });
  });
  assert.equal(calls, 0);
  assert.deepEqual(damageOf(resumed.state).values, [3]);
  const evidence = combatRolls(resumed.state);
  const corrections = evidence.filter((roll) => roll.kind === "attack" && roll.correctionReason);
  assert.deepEqual(
    corrections.map((roll) => [roll.previousValues, roll.values]),
    [
      [[19], [20]],
      [[20], [19]],
    ],
  );
  assert.deepEqual(
    evidence.filter((roll) => roll.status === "superseded").map((roll) => roll.supersededValues),
    [[5]],
  );
});

test("reapplying known faces revalidates the current authority of the roller", () => {
  const { store, requestId } = setup("digital");
  sturdyTarget(store);
  store.commit("Attack and damage", (s) => resolveAutomaticRolls(s, faces([19, 3])));
  store.undo();
  store.commit("Reassign Livia", (s) => (s.actors.livia.owner = "dm"), "dm");
  assert.throws(
    () =>
      store.commit("Player reapplies", (s) =>
        resolveRoll(s, "evidence-attempt", requestId, [19], "player"),
      ),
    /cannot answer/i,
  );
  store.commit(
    "Unrelated continuation",
    (s) =>
      resolveAutomaticRolls(s, () => {
        throw Error("No die may be rolled");
      }),
    "dm",
  );
  assert.equal(store.state.combatAttempts[0].requests[0].status, "pending");
  assert.equal(store.state.actors["goblin-1"].hp, 30);
});

test("faces accepted for a personal sheet stay personal when the request is recreated after joining", () => {
  const { store, storage, requestId } = setup("digital", (s) => {
    s.actors.livia.visibility = "private";
  });
  sturdyTarget(store);
  store.commit("Attack and damage", (s) => resolveAutomaticRolls(s, faces([19, 3])));
  store.undo();
  store.commit("Join campaign", (s) => (s.actors.livia.visibility = "shared"));
  const resumed = createStore({ storage });
  resumed.commit("Reapply known result", (s) => {
    resolveRoll(s, "evidence-attempt", requestId, [19], "player");
    resolveAutomaticRolls(s, () => 6);
  });
  const damage = damageOf(resumed.state);
  assert.deepEqual(damage.values, [3]);
  assert.equal(damage.personal, true);
  const dmView = JSON.stringify(projectAttempts(resumed.state, "dm"));
  assert.doesNotMatch(dmView, /"acceptedValues"|"values"|"knownValues"/);
  assert.ok(combatRolls(resumed.state).every((roll) => roll.personal === true));
});

test("a hidden creature's superseded faces stay out of the player's projection and history", () => {
  const { store, storage } = setupHidden();
  // An unseen attacker rolls with advantage: max(20, 1) is a critical hit.
  store.commit("Hidden critical", (s) => resolveAutomaticRolls(s, faces([20, 1, 3, 4])), "dm");
  store.undo("dm");
  const resumed = createStore({ storage });
  const attackId = resumed.state.combatAttempts[0].requests[0].id;
  resumed.commit(
    "Correct hidden attack",
    (s) => {
      resolveRoll(s, "hidden-attempt", attackId, [15, 1], "dm", { correctionReason: reason });
      resolveAutomaticRolls(s, () => 6);
    },
    "dm",
  );
  const superseded = combatRolls(resumed.state).find((roll) => roll.status === "superseded");
  assert.equal(superseded.visibility, "private");
  const playerView = JSON.stringify(projectAttempts(resumed.state, "player"));
  assert.doesNotMatch(playerView, /recomputedFrom|knownValues|acceptedValues|supersededValues/);
  const ctx = (role) => ({
    role,
    state: resumed.state,
    t: (_it, en) => en,
    esc: (value) => String(value),
    label: (value) => (typeof value === "object" ? value.en : value),
  });
  assert.doesNotMatch(renderRollHistory(ctx("player")), /Blade|Superseded|Sentinella/);
  assert.match(renderRollHistory(ctx("dm")), /Superseded/);
});

test("known evidence maps faces per die group and never guesses for legacy profiles", () => {
  const request = (dice) => ({ owner: "player", dice });
  const critical = request([
    { count: 2, sides: 6 },
    { count: 2, sides: 4 },
  ]);
  const mapped = knownEvidence(
    {
      acceptedValues: [5, 2],
      mode: "digital",
      dice: [
        { count: 1, sides: 6 },
        { count: 1, sides: 4 },
      ],
    },
    critical,
  );
  assert.deepEqual(mapped.knownValues, [5, null, 2, null]);
  assert.equal(mapped.acceptedValues, undefined);
  assert.deepEqual(mapped.recomputedFrom.supersededValues, []);
  // Evidence saved before dice profiles were recorded is reused only when it still fits.
  assert.deepEqual(
    knownEvidence({ acceptedValues: [4] }, request([{ count: 1, sides: 6 }])).acceptedValues,
    [4],
  );
  const legacy = knownEvidence({ acceptedValues: [4] }, request([{ count: 2, sides: 6 }]));
  assert.equal(legacy.knownValues, undefined);
  assert.deepEqual(legacy.recomputedFrom.supersededValues, [4]);
  assert.equal(
    knownEvidence(
      { acceptedValues: [6], personal: true, owner: "player" },
      request([{ count: 1, sides: 6 }]),
    ).personal,
    true,
  );
});
