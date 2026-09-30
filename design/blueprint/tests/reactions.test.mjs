import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import {
  beginAttempt,
  resolveRoll,
  projectAttempts,
  expireTurnEffects,
  beginMovement,
  projectMovements,
  projectReactions,
  resolveReaction,
  resumeMovement,
  changeMovement,
  setReactionOrder,
  hasBlockingConsequences,
  isValidMeleeProfile,
  refreshConsequences,
  resolveAutomaticRolls,
} from "../combat.mjs";

const melee = () => ({
  name: { it: "Lama di prova", en: "Sample blade" },
  reachMeters: 1.5,
  attackBonus: 4,
  damageDice: [{ count: 1, sides: 6 }],
  damageModifier: 2,
  damageType: "slashing",
  source: {
    kind: "authored-demo",
    edition: "2024",
    revision: "test-melee-v1",
    title: "Original synthetic weapon",
  },
});
function fixture() {
  const state = createInitialState();
  state.combat.active = true;
  state.actors.livia.ac = 14;
  state.actors.livia.combatProfile = {
    spellcastingAbility: "int",
    proficiencyBonus: 2,
    weaponProficiencies: ["quarterstaff"],
    spells: ["fire-bolt", "burning-hands", "magic-missile", "shield"],
    componentsAvailable: true,
    team: "party",
  };
  for (const id of ["goblin-1", "goblin-2"]) {
    state.actors[id].combatProfile = { team: "watch", meleeAttack: melee() };
    state.actors[id].hp = 40;
  }
  state.scenes[0].tokens = [
    { actorId: "livia", x: 200, y: 200 },
    { actorId: "goblin-1", x: 200, y: 200 },
  ];
  return state;
}
function attackLivia(state, natural = 14) {
  state.combat.turn = 1;
  const attempt = beginAttempt(
    state,
    {
      id: "enemy-attack",
      actorId: "goblin-1",
      actionId: "melee-attack",
      selection: { targetIds: ["livia"] },
      mode: "physical",
    },
    "dm",
  );
  resolveRoll(state, attempt.id, attempt.requests[0].id, [natural], "dm");
  return attempt;
}
const pending = (state, type, role = "player") =>
  projectReactions(state, role).find((entry) => entry.type === type && entry.status === "pending");
const damageRequest = (attempt) => attempt.requests.find((request) => request.kind === "damage");

test("a verified melee profile enables an attack and Shield waits before damage without spending on offer", () => {
  const state = fixture();
  assert.equal(isValidMeleeProfile(melee()), true);
  assert.equal(isValidMeleeProfile({ ...melee(), attackBonus: NaN }), false);
  const attempt = attackLivia(state);
  const shield = pending(state, "shield");
  assert.ok(shield);
  assert.equal(state.actors.livia.slots.used, 1);
  assert.equal(state.actors.livia.reaction, true);
  assert.equal(state.actors.livia.hp, 18);
  assert.equal(damageRequest(attempt), undefined);
  assert.equal(hasBlockingConsequences(state, "livia"), true);
  assert.equal(hasBlockingConsequences(state, "doran"), false);
  const snapshot = JSON.stringify(state);
  projectReactions(state, "player");
  assert.equal(JSON.stringify(state), snapshot);
  assert.throws(() => resolveReaction(state, shield.id, { use: true }, "stranger"));
  resolveReaction(state, shield.id, { use: true, slotLevel: 1 }, "player");
  assert.equal(state.actors.livia.slots.used, 2);
  assert.equal(state.actors.livia.reaction, false);
  assert.equal(state.actors.livia.ac, 14);
  assert.equal(attempt.outcomes[0].status, "missed");
  assert.equal(attempt.status, "resolved");
  resolveReaction(state, shield.id, { use: true, slotLevel: 1 }, "player");
  assert.equal(state.actors.livia.slots.used, 2);
  assert.throws(() => resolveReaction(state, shield.id, { use: false }, "player"));
  expireTurnEffects(state, "goblin-1");
  assert.ok(state.actors.livia.combatEffects.some((effect) => effect.type === "shield"));
  expireTurnEffects(state, "livia");
  assert.equal(
    state.actors.livia.combatEffects.some((effect) => effect.type === "shield"),
    false,
  );
});

test("declining Shield spends nothing; a natural 20 still hits through Shield and doubles damage dice", () => {
  for (const use of [false, true]) {
    const state = fixture();
    const attempt = attackLivia(state, use ? 20 : 14);
    resolveReaction(state, pending(state, "shield").id, { use, slotLevel: 1 }, "player");
    assert.equal(state.actors.livia.reaction, !use);
    assert.equal(state.actors.livia.slots.used, use ? 2 : 1);
    const damage = damageRequest(attempt);
    assert.deepEqual(damage.dice, [{ count: use ? 2 : 1, sides: 6 }]);
    resolveRoll(state, attempt.id, damage.id, use ? [3, 4] : [3], "dm");
    assert.equal(state.actors.livia.hp, use ? 9 : 13);
  }
});

test("Shield is offered for Magic Missile before damage and blocks every assigned dart", () => {
  const state = fixture();
  state.combat.turn = 1;
  // A caster needs its slots (final review F13: the sample goblin has none).
  state.actors["goblin-1"].slots = { used: 0, max: 4 };
  Object.assign(state.actors["goblin-1"].combatProfile, {
    spellcastingAbility: "int",
    proficiencyBonus: 2,
    spells: ["magic-missile"],
    componentsAvailable: true,
  });
  const attempt = beginAttempt(
    state,
    {
      id: "missiles",
      actorId: "goblin-1",
      actionId: "magic-missile",
      selection: { allocations: [{ actorId: "livia", count: 3 }] },
      mode: "physical",
    },
    "dm",
  );
  assert.ok(pending(state, "shield"));
  resolveReaction(state, pending(state, "shield").id, { use: true, slotLevel: 1 }, "player");
  assert.equal(state.actors.livia.hp, 18);
  assert.equal(attempt.outcomes[0].blockedByShield, true);
  assert.equal(attempt.outcomes[0].damage, 0);
});

test("movement stops at the actual reach boundary, spends only distance traveled and resumes after a miss", () => {
  let state = fixture();
  const movement = beginMovement(
    state,
    { id: "move-1", actorId: "livia", point: { x: 400, y: 200 } },
    "player",
  );
  assert.equal(movement.status, "pending");
  assert.equal(state.scenes[0].tokens[0].x, 250);
  assert.equal(state.actors.livia.movement, 7.5);
  assert.equal(state.actors["goblin-1"].reaction, true);
  assert.equal(projectMovements(state, "player")[0].remainingPathMeters, 4.5);
  assert.equal(pending(state, "opportunity"), undefined);
  const opportunity = pending(state, "opportunity", "dm");
  state = JSON.parse(JSON.stringify(state));
  resolveReaction(state, opportunity.id, { use: true, mode: "physical" }, "dm");
  assert.equal(state.actors["goblin-1"].reaction, false);
  const attempt = state.combatAttempts.at(-1);
  assert.equal(attempt.requests[0].status, "pending");
  resolveRoll(state, attempt.id, attempt.requests[0].id, [1], "dm");
  assert.equal(state.scenes[0].tokens[0].x, 400);
  assert.equal(state.actors.livia.movement, 3);
  assert.equal(state.movements[0].status, "resolved");
  assert.equal(state.actors.livia.action, true);
});

test("nested opportunity then Shield resumes the same confirmed path without a second movement consent", () => {
  const state = fixture();
  beginMovement(state, { id: "nested", actorId: "livia", point: { x: 400, y: 200 } }, "player");
  resolveReaction(
    state,
    pending(state, "opportunity", "dm").id,
    { use: true, mode: "physical" },
    "dm",
  );
  const attempt = state.combatAttempts.at(-1);
  resolveRoll(state, attempt.id, attempt.requests[0].id, [14], "dm");
  assert.equal(state.scenes[0].tokens[0].x, 250);
  resolveReaction(state, pending(state, "shield").id, { use: true, slotLevel: 1 }, "player");
  assert.equal(state.scenes[0].tokens[0].x, 400);
  assert.equal(state.actors.livia.hp, 18);
  assert.equal(state.actors.livia.movement, 3);
});

test("opportunity damage requires Continue or Change and never refunds already traveled movement", () => {
  for (const change of [false, true]) {
    const state = fixture();
    beginMovement(state, { id: "damaged", actorId: "livia", point: { x: 400, y: 200 } }, "player");
    resolveReaction(
      state,
      pending(state, "opportunity", "dm").id,
      { use: true, mode: "physical" },
      "dm",
    );
    const attempt = state.combatAttempts.at(-1);
    resolveRoll(state, attempt.id, attempt.requests[0].id, [14], "dm");
    resolveReaction(state, pending(state, "shield").id, { use: false }, "player");
    resolveRoll(state, attempt.id, damageRequest(attempt).id, [3], "dm");
    assert.equal(state.movements[0].status, "awaiting-choice");
    assert.equal(state.actors.livia.hp, 13);
    assert.equal(state.scenes[0].tokens[0].x, 250);
    assert.equal(state.actors.livia.movement, 7.5);
    if (change) changeMovement(state, "damaged", "player");
    else resumeMovement(state, "damaged", "player");
    assert.equal(state.scenes[0].tokens[0].x, change ? 250 : 400);
    assert.equal(state.actors.livia.movement, change ? 7.5 : 3);
    assert.equal(state.actors.livia.hp, 13);
  }
});

test("simultaneous opportunities require an explicit order from the current turn controller", () => {
  const state = fixture();
  state.scenes[0].tokens.push({ actorId: "goblin-2", x: 200, y: 200 });
  beginMovement(state, { id: "multiple", actorId: "livia", point: { x: 400, y: 200 } }, "player");
  const movement = projectMovements(state, "player")[0];
  assert.equal(movement.phase, "order");
  assert.equal(movement.orderCandidates.length, 2);
  const ids = movement.orderCandidates.map((entry) => entry.reactionId).reverse();
  assert.throws(() => resolveReaction(state, ids[0], { use: false }, "dm"));
  assert.throws(() => setReactionOrder(state, "multiple", ids, "stranger"));
  setReactionOrder(state, "multiple", ids, "player");
  assert.throws(() => resolveReaction(state, ids[1], { use: false }, "dm"));
  resolveReaction(state, ids[0], { use: false }, "dm");
  resolveReaction(state, ids[1], { use: false }, "dm");
  assert.equal(state.scenes[0].tokens[0].x, 400);
  assert.equal(state.actors["goblin-1"].reaction, true);
  assert.equal(state.actors["goblin-2"].reaction, true);
});

test("Disengage prevents opportunities and Dash integrates interrupted distance without losing its cost", () => {
  const free = fixture();
  beginAttempt(free, { id: "disengage", actorId: "livia", actionId: "disengage" }, "player");
  beginMovement(free, { id: "safe", actorId: "livia", point: { x: 400, y: 200 } }, "player");
  assert.equal(projectReactions(free, "dm").length, 0);
  assert.equal(free.scenes[0].tokens[0].x, 400);
  const dash = fixture();
  dash.actors.livia.movement = 1;
  const attempt = beginAttempt(
    dash,
    { id: "dash", actorId: "livia", actionId: "dash", selection: { point: { x: 500, y: 200 } } },
    "player",
  );
  assert.equal(dash.actors.livia.action, false);
  assert.equal(dash.actors.livia.movement, 8.5);
  assert.equal(attempt.status, "pending");
  resolveReaction(dash, pending(dash, "opportunity", "dm").id, { use: false }, "dm");
  assert.equal(dash.actors.livia.movement, 1);
  assert.equal(attempt.status, "resolved");
});

test("damage causes a mandatory concentration save after hit points change and delays movement choice", () => {
  const state = fixture();
  state.actors.livia.concentration = {
    id: "focus",
    name: { it: "Effetto di prova", en: "Sample effect" },
    active: true,
    source: { kind: "authored-demo", revision: "focus-v1" },
  };
  state.actors.livia.combatEffects = [{ type: "test-bonus", concentrationId: "focus" }];
  beginMovement(state, { id: "focus-move", actorId: "livia", point: { x: 400, y: 200 } }, "player");
  resolveReaction(
    state,
    pending(state, "opportunity", "dm").id,
    { use: true, mode: "physical" },
    "dm",
  );
  const attempt = state.combatAttempts.at(-1);
  resolveRoll(state, attempt.id, attempt.requests[0].id, [14], "dm");
  resolveReaction(state, pending(state, "shield").id, { use: false }, "player");
  resolveRoll(state, attempt.id, damageRequest(attempt).id, [3], "dm");
  assert.equal(state.actors.livia.hp, 13);
  const concentration = attempt.requests.find((request) => request.kind === "concentration");
  assert.equal(concentration.dc, 10);
  assert.equal(concentration.modifier, 2);
  assert.equal(concentration.status, "pending");
  assert.throws(() => resumeMovement(state, "focus-move", "player"));
  assert.throws(() => resolveRoll(state, attempt.id, concentration.id, [15], "dm-not-authorized"));
  resolveRoll(state, attempt.id, concentration.id, [1], "player");
  assert.equal(state.actors.livia.concentration.active, false);
  assert.equal(
    state.actors.livia.combatEffects.some((effect) => effect.concentrationId === "focus"),
    false,
  );
  assert.equal(state.movements[0].status, "awaiting-choice");
});

test("zero hit points alone do not invent concentration loss; incapacitation ends it without a fake roll", () => {
  for (const incapacitated of [false, true]) {
    const state = fixture();
    // A legacy sheet without a declared zero-HP policy: 0 HP alone invents nothing.
    delete state.actors.livia.vitalityPolicy;
    state.actors.livia.hp = 1;
    state.actors.livia.reaction = false;
    state.actors.livia.concentration = { id: "focus", name: "Effect", active: true };
    const attempt = attackLivia(state);
    state.actors.livia.incapacitated = incapacitated;
    resolveRoll(state, attempt.id, damageRequest(attempt).id, [3], "dm");
    assert.equal(state.actors.livia.hp, 0);
    assert.equal(
      !!attempt.requests.find((request) => request.kind === "concentration"),
      !incapacitated,
    );
    assert.equal(state.actors.livia.concentration.active, !incapacitated);
  }
  // With the declared death-save policy, 0 HP means Unconscious (so Incapacitated):
  // Concentration ends at once and no pointless Constitution save is requested.
  const state = fixture();
  assert.equal(state.actors.livia.vitalityPolicy.zeroHp, "death-saves");
  state.actors.livia.hp = 1;
  state.actors.livia.reaction = false;
  state.actors.livia.concentration = { id: "focus", name: "Effect", active: true };
  const attempt = attackLivia(state);
  resolveRoll(state, attempt.id, damageRequest(attempt).id, [3], "dm");
  assert.equal(state.actors.livia.hp, 0);
  assert.equal(
    attempt.requests.some((request) => request.kind === "concentration"),
    false,
  );
  assert.equal(state.actors.livia.concentration.active, false);
});

test("digital continuation uses the original accepted authority and never rolls saves or concentration", () => {
  const state = fixture();
  state.combat.turn = 1;
  const attempt = beginAttempt(
    state,
    {
      id: "automatic",
      actorId: "goblin-1",
      actionId: "melee-attack",
      selection: { targetIds: ["livia"] },
      mode: "digital",
    },
    "dm",
  );
  const first = resolveAutomaticRolls(state, () => 14);
  assert.equal(first.length, 1);
  assert.equal(attempt.requests[0].resolvedBy, "dm");
  assert.ok(pending(state, "shield"));
  state.actors.livia.concentration = { id: "focus", name: "Effect", active: true };
  resolveReaction(state, pending(state, "shield").id, { use: false }, "player");
  const second = resolveAutomaticRolls(state, () => 3);
  assert.equal(second.length, 1);
  assert.equal(state.actors.livia.hp, 13);
  const concentration = attempt.requests.find((request) => request.kind === "concentration");
  assert.equal(concentration.status, "pending");
  assert.deepEqual(
    resolveAutomaticRolls(state, () => {
      throw Error("Must not roll a mandatory save automatically");
    }),
    [],
  );
});

test("a replaced concentration expires its old request without ending the new effect or inventing dice", () => {
  const state = fixture();
  state.actors.livia.reaction = false;
  state.actors.livia.concentration = { id: "old", name: "Old", active: true };
  const attempt = attackLivia(state);
  resolveRoll(state, attempt.id, damageRequest(attempt).id, [3], "dm");
  const request = attempt.requests.find((request) => request.kind === "concentration");
  state.actors.livia.concentration = { id: "new", name: "New", active: true };
  refreshConsequences(state);
  assert.equal(request.status, "expired");
  assert.equal(request.values, undefined);
  assert.equal(state.actors.livia.concentration.active, true);
  assert.equal(state.actors.livia.concentration.id, "new");
  assert.equal(attempt.status, "resolved");
  assert.throws(() => resolveRoll(state, attempt.id, request.id, [1], "player"));
});

test("Shield respects the turn slot limit and stale resources cannot be spent twice", () => {
  const state = fixture();
  const attempt = attackLivia(state);
  const shield = pending(state, "shield");
  state.actors.livia.lastSlotTurn = "demo:1:goblin-1";
  const before = JSON.stringify(state);
  assert.throws(() => resolveReaction(state, shield.id, { use: true, slotLevel: 1 }, "player"));
  assert.equal(JSON.stringify(state), before);
  resolveReaction(state, shield.id, { use: false }, "player");
  assert.equal(state.actors.livia.slots.used, 1);
  assert.ok(damageRequest(attempt));
});

test("a path crossing into then out of reach still interrupts and unavailable sight prevents the opportunity", () => {
  for (const blinded of [false, true]) {
    const state = fixture();
    state.scenes[0].tokens[0].x = 100;
    state.actors["goblin-1"].blinded = blinded;
    beginMovement(state, { id: "crossing", actorId: "livia", point: { x: 350, y: 200 } }, "player");
    assert.equal(state.scenes[0].tokens[0].x, blinded ? 350 : 250);
    assert.equal(state.actors.livia.movement, blinded ? 1.5 : 4.5);
  }
});

test("hidden opportunity sources never appear in player requests or expose their private attack total", () => {
  const state = fixture();
  state.actors["goblin-1"].hidden = true;
  beginMovement(state, { id: "hidden-oa", actorId: "livia", point: { x: 400, y: 200 } }, "player");
  assert.equal(projectReactions(state, "player").length, 0);
  const opportunity = pending(state, "opportunity", "dm");
  resolveReaction(state, opportunity.id, { use: true, mode: "physical" }, "dm");
  const attempt = state.combatAttempts.at(-1);
  assert.equal(attempt.requests[0].rollMode, "advantage");
  resolveRoll(state, attempt.id, attempt.requests[0].id, [14, 14], "dm");
  const shield = pending(state, "shield");
  assert.ok(shield);
  assert.equal(shield.attackTotal, undefined);
  assert.equal(shield.attackerId, undefined);
  const projected = projectAttempts(state, "player")[0];
  assert.equal(projected.actorId, null);
  assert.equal(projected.requests.length, 0);
  assert.doesNotMatch(
    JSON.stringify({
      reactions: projectReactions(state, "player"),
      attempts: projectAttempts(state, "player"),
    }),
    /goblin-1|Sample blade|Lama di prova/,
  );
});

test("changing after damage closes unused opportunities in the abandoned movement", () => {
  const state = fixture();
  state.scenes[0].tokens.push({ actorId: "goblin-2", x: 200, y: 200 });
  beginMovement(state, { id: "abandon", actorId: "livia", point: { x: 400, y: 200 } }, "player");
  const ids = projectMovements(state, "player")[0].orderCandidates.map((entry) => entry.reactionId);
  setReactionOrder(state, "abandon", ids, "player");
  resolveReaction(state, ids[0], { use: true, mode: "physical" }, "dm");
  const attack = state.combatAttempts.at(-1);
  resolveRoll(state, attack.id, attack.requests[0].id, [14], "dm");
  resolveReaction(state, pending(state, "shield").id, { use: false }, "player");
  resolveRoll(state, attack.id, damageRequest(attack).id, [3], "dm");
  changeMovement(state, "abandon", "player");
  assert.equal(state.combatReactions.find((reaction) => reaction.id === ids[1]).status, "expired");
  assert.equal(hasBlockingConsequences(state, "goblin-2"), false);
  assert.equal(state.actors["goblin-2"].reaction, true);
  assert.equal(state.actors.livia.movement, 7.5);
});

test("concentration DC caps at thirty and natural twenty does not replace the saving throw total", () => {
  const state = fixture();
  state.actors.livia.reaction = false;
  state.actors.livia.hp = 1000;
  state.actors.livia.concentration = { id: "focus", name: "Focus", active: true };
  state.actors["goblin-1"].combatProfile.meleeAttack.damageDice = [{ count: 20, sides: 20 }];
  state.actors["goblin-1"].combatProfile.meleeAttack.damageModifier = 0;
  const attempt = attackLivia(state);
  resolveRoll(state, attempt.id, damageRequest(attempt).id, Array(20).fill(20), "dm");
  const save = attempt.requests.find((request) => request.kind === "concentration");
  assert.equal(save.dc, 30);
  resolveRoll(state, attempt.id, save.id, [20], "player");
  assert.equal(save.total, 22);
  assert.equal(save.success, false);
  assert.equal(state.actors.livia.concentration.active, false);
});

test("missing concentration data stays pending until corrected, never silently counting null as zero", () => {
  const state = fixture();
  state.actors.livia.reaction = false;
  state.actors.livia.concentration = { id: "focus", name: "Focus", active: true };
  delete state.actors.livia.abilities.con;
  const attempt = attackLivia(state);
  resolveRoll(state, attempt.id, damageRequest(attempt).id, [3], "dm");
  const save = attempt.requests.find((request) => request.kind === "concentration");
  assert.equal(save.needsData, true);
  assert.throws(() => resolveRoll(state, attempt.id, save.id, [15], "player"));
  assert.equal(save.status, "pending");
  state.actors.livia.abilities.con = 14;
  refreshConsequences(state);
  assert.equal(save.needsData, false);
  assert.equal(save.modifier, 2);
  resolveRoll(state, attempt.id, save.id, [8], "player");
  assert.equal(save.success, true);
});

test("a reaction made unavailable by an explicit correction expires without spending or a fictitious decline", () => {
  const state = fixture();
  const attempt = attackLivia(state);
  const shield = pending(state, "shield");
  state.actors.livia.reaction = false;
  refreshConsequences(state);
  assert.equal(
    state.combatReactions.find((reaction) => reaction.id === shield.id).status,
    "expired",
  );
  assert.equal(state.actors.livia.slots.used, 1);
  assert.ok(damageRequest(attempt));
});

test("explicit incapacitation clears an active concentration and its linked effects without inventing a request", () => {
  const state = fixture();
  state.actors.livia.concentration = { id: "focus", name: "Focus", active: true };
  state.actors.doran.combatEffects = [{ type: "sample", concentrationId: "focus" }];
  state.actors.livia.incapacitated = true;
  refreshConsequences(state);
  assert.equal(state.actors.livia.concentration.active, false);
  assert.deepEqual(state.actors.doran.combatEffects, []);
  assert.equal(state.combatAttempts, undefined);
});

test("explicit neutral NPCs never become enemies merely because their team differs", () => {
  const state = fixture();
  state.actors["goblin-1"].combatProfile.team = "neutral";
  beginMovement(state, { id: "neutral", actorId: "livia", point: { x: 400, y: 200 } }, "player");
  assert.equal(projectReactions(state, "dm").length, 0);
  assert.equal(state.scenes[0].tokens[0].x, 400);
});

test("partial sample profiles retain their declared team without treating new NPCs as hostile", () => {
  for (const sample of [true, false]) {
    const state = fixture();
    state.actors["goblin-1"].combatProfile = { meleeAttack: melee() };
    if (!sample) {
      state.actors.custom = { ...state.actors["goblin-1"], id: "custom" };
      delete state.actors["goblin-1"];
      state.scenes[0].tokens[1].actorId = "custom";
    }
    beginMovement(state, { id: "partial", actorId: "livia", point: { x: 400, y: 200 } }, "player");
    assert.equal(projectReactions(state, "dm").length, sample ? 1 : 0);
  }
});

test("explicit death prevents a new movement and blocks an interrupted path without inferring death from zero HP", () => {
  const state = fixture();
  state.actors.livia.dead = true;
  assert.throws(() =>
    beginMovement(state, { id: "dead", actorId: "livia", point: { x: 400, y: 200 } }, "player"),
  );
  assert.equal(state.scenes[0].tokens[0].x, 200);
  state.actors.livia.dead = false;
  beginMovement(state, { id: "alive", actorId: "livia", point: { x: 400, y: 200 } }, "player");
  state.actors.livia.dead = true;
  refreshConsequences(state);
  assert.equal(state.movements[0].status, "blocked");
  assert.equal(state.scenes[0].tokens[0].x, 250);
  changeMovement(state, "alive", "player");
  assert.equal(state.movements[0].status, "changed");
});
