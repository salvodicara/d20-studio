// Root integration of conditions and survival (increment 10): one state, the existing
// request queue, and the same projections on the sheet and at the Table.
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState, createStore, previewMovement, resetTurnMovement } from "../state.mjs";
import {
  beginAttempt,
  resolveRoll,
  resolveAutomaticRolls,
  expireTurnEffects,
  hasBlockingConsequences,
  previewAction,
  beginMovement,
  advanceTurn,
  beginVitalityRoll,
  projectVitalityRolls,
  standContextFor,
  applyConditionFollowUps,
} from "../combat.mjs";
import {
  hasCondition,
  applyConditionEvent,
  applyVitalityEvent,
  applyVitalityChange,
  previewVitalityChange,
  previewStand,
  standUp,
  previewAid,
} from "../conditions.mjs";
import {
  getEffectiveActor,
  getEffectiveSpeed,
  createCompanion,
  previewCompanionCreation,
} from "../forms-companions.mjs";
import { beginHealing, resolveHealing, renderCharacters } from "../characters.mjs";
import { renderTable, resetTableView } from "../table.mjs";
import { startRest, advanceGameTime, completeRest } from "../rest-time.mjs";
import { canControlActor } from "../character-access.mjs";
import { esc, icon } from "../ui.mjs";

const SRC = { kind: "authored", revision: "integration-test-1" };
const melee = () => ({
  name: { it: "Lama di prova", en: "Sample blade" },
  reachMeters: 1.5,
  attackBonus: 4,
  damageDice: [{ count: 1, sides: 6 }],
  damageModifier: 2,
  damageType: "slashing",
  source: { kind: "authored-demo", edition: "2024", revision: "test-melee-v1" },
});
const place = (s, id, x, y) =>
  Object.assign(
    s.scenes[0].tokens.find((t) => t.actorId === id),
    { x, y },
  );
function fight() {
  const s = createInitialState();
  s.combat = {
    active: true,
    round: 1,
    turn: 0,
    order: ["livia", "goblin-1", "doran", "goblin-2"],
    encounterId: "enc",
  };
  for (const id of ["goblin-1", "goblin-2"])
    s.actors[id].combatProfile = { team: "watch", meleeAttack: melee() };
  s.actors.livia.reaction = false;
  place(s, "livia", 250, 380);
  place(s, "goblin-1", 280, 380);
  place(s, "doran", 350, 450);
  place(s, "goblin-2", 740, 340);
  return s;
}
const fill = (request, face) => request.dice.flatMap((g) => Array(g.count).fill(face));
function strike(s, { id = "g1", attacker = "goblin-1", target = "livia", natural = 15, face = 3 }) {
  s.combat.turn = s.combat.order.indexOf(attacker);
  s.actors[attacker].action = true;
  const attempt = beginAttempt(
    s,
    { id, actorId: attacker, actionId: "melee-attack", selection: { targetIds: [target] } },
    "dm",
  );
  attempt.mode = "physical";
  resolveRoll(s, id, attempt.requests[0].id, fill(attempt.requests[0], natural), "dm");
  const damage = attempt.requests.find((r) => r.kind === "damage");
  if (damage) resolveRoll(s, id, damage.id, fill(damage, face), "dm");
  return attempt;
}
function dropLivia(s) {
  s.actors.livia.hp = 3;
  return strike(s, { id: "drop", face: 3 });
}
const ctxFor = (state, role = "player", view = { page: "table" }) => ({
  state,
  role,
  lang: "it",
  view,
  offline: false,
  canControl: (a) => canControlActor(a, role, state),
  conditionActor: (id, st = state) => getEffectiveActor(st.actors[id]),
  conditionRolls: (id) => projectVitalityRolls(state, id, role),
  conditionBlocking: (id, st = state) => hasBlockingConsequences(st, id),
  t: (it) => it,
  label: (v) => (typeof v === "object" && v ? v.it : String(v ?? "")),
  esc,
  icon,
});

test("demo fixtures declare zero-HP policy, condition immunities, size and held items explicitly", () => {
  const s = createInitialState();
  for (const id of ["livia", "doran", "mira"]) {
    assert.equal(s.actors[id].vitalityPolicy.zeroHp, "death-saves", id);
    assert.equal(s.actors[id].vitalityPolicy.source.kind, "srd");
    assert.deepEqual(s.actors[id].conditionImmunities, [], id);
    assert.ok(s.actors[id].conditionImmunitiesSource, id);
  }
  // What a creature with items holds is unknown until recorded (review 10, finding on
  // held items); an empty inventory holds nothing.
  assert.equal(s.actors.livia.heldItemIds, null);
  assert.equal(s.actors.mira.heldItemIds, null);
  assert.deepEqual(s.actors.doran.heldItemIds, []);
  for (const id of ["goblin-1", "goblin-2"]) {
    assert.equal(s.actors[id].vitalityPolicy.zeroHp, "death", id);
    assert.equal(s.actors[id].size, "small");
  }
  assert.ok(Array.isArray(s.actors.livia.skills), "Medicine uses Wisdom without proficiency");
});

test("combat damage goes through the vitality adapter exactly once", () => {
  const s = fight();
  strike(s, { face: 3 });
  assert.equal(s.actors.livia.hp, 13);
  const damage = s.conditionEvents.filter((e) => e.kind === "damage" && e.actorId === "livia");
  assert.equal(damage.length, 1);
  assert.equal(damage[0].result.breakdown.hpBefore, 18);
});

test("dropping to 0 HP resolves the policy before any concentration request", () => {
  const s = fight();
  s.actors.livia.concentration = { id: "focus", name: "Effect", active: true };
  const attempt = dropLivia(s);
  const livia = s.actors.livia;
  assert.equal(livia.hp, 0);
  assert.equal(hasCondition(livia, "unconscious"), true);
  assert.equal(
    livia.conditions.some((c) => c.id === "prone" && c.cause === "unconscious-fall"),
    true,
  );
  assert.equal(livia.concentration.active, false);
  assert.equal(
    attempt.requests.some((r) => r.kind === "concentration"),
    false,
  );
  assert.deepEqual(
    { s: livia.deathSaves?.successes ?? 0, f: livia.deathSaves?.failures ?? 0 },
    { s: 0, f: 0 },
  );
});

test("a critical hit, or any hit within 1.5 m on an Unconscious creature, adds two failures", () => {
  const s = fight();
  dropLivia(s);
  const crit = strike(s, { id: "crit", natural: 20, face: 1 });
  assert.equal(crit.outcomes[0].critical, true);
  assert.equal(s.actors.livia.deathSaves.failures, 2);
  const s2 = fight();
  dropLivia(s2);
  const near = strike(s2, { id: "near", natural: 12, face: 1 });
  assert.equal(near.requests[0].rollMode, "advantage");
  assert.equal(near.outcomes[0].critical, true);
  assert.equal(s2.actors.livia.deathSaves.failures, 2);
});

test("a declared melee knockout leaves 1 HP, its own Unconscious cause and a short rest", () => {
  const s = fight();
  s.actors["goblin-1"].hp = 4;
  const attempt = beginAttempt(
    s,
    {
      id: "ko",
      actorId: "livia",
      actionId: "quarterstaff",
      selection: { targetIds: ["goblin-1"], knockout: true },
    },
    "player",
  );
  resolveRoll(s, "ko", attempt.requests[0].id, [15], "player");
  const damage = attempt.requests.find((r) => r.kind === "damage");
  resolveRoll(s, "ko", damage.id, [6], "player");
  const goblin = s.actors["goblin-1"];
  assert.equal(goblin.hp, 1);
  assert.notEqual(goblin.dead, true);
  const ko = goblin.conditions.find((c) => c.cause === "knockout");
  assert.equal(ko.id, "unconscious");
  const rest = s.restTime.rests.find((r) => r.id === ko.term.restId);
  assert.equal(rest.kind, "short");
  assert.equal(rest.participants[0].actorId, "goblin-1");
  assert.equal(rest.participants[0].status, "resting");
  s.combat.active = false;
  advanceGameTime(s, { id: "hour", campaignId: "lanterns", seconds: 3600 }, "dm");
  completeRest(s, rest.id, { id: "ko-done", actorIds: ["goblin-1"] }, "dm");
  assert.equal(hasCondition(s.actors["goblin-1"], "unconscious"), false);
  assert.equal(hasCondition(s.actors["goblin-1"], "prone"), true);

  const lethal = fight();
  lethal.actors["goblin-1"].hp = 4;
  const plain = beginAttempt(
    lethal,
    {
      id: "kill",
      actorId: "livia",
      actionId: "quarterstaff",
      selection: { targetIds: ["goblin-1"] },
    },
    "player",
  );
  resolveRoll(lethal, "kill", plain.requests[0].id, [15], "player");
  resolveRoll(lethal, "kill", plain.requests.find((r) => r.kind === "damage").id, [6], "player");
  assert.equal(lethal.actors["goblin-1"].dead, true);
});

test("an actual turn start queues one death save in the existing request queue", () => {
  const s = fight();
  dropLivia(s);
  s.combat.turn = 3;
  advanceTurn(s);
  assert.equal(s.combat.order[s.combat.turn], "livia");
  const saves = () => s.combatAttempts.filter((a) => a.kind === "vitality");
  assert.equal(saves().length, 1);
  const [attempt] = saves();
  assert.equal(attempt.requests[0].kind, "death-save");
  assert.deepEqual(attempt.requests[0].dice, [{ count: 1, sides: 20 }]);
  assert.equal(attempt.requests[0].dc, 10);
  assert.equal(hasBlockingConsequences(s, "livia"), true);
  assert.deepEqual(
    resolveAutomaticRolls(s, () => 20),
    [],
  );
  expireTurnEffects(s, "livia", "start");
  assert.equal(saves().length, 1, "a retried turn start does not queue a second save");
  assert.equal(projectVitalityRolls(s, "livia", "player")[0].kind, "death-save");
  assert.throws(() => resolveRoll(s, attempt.id, attempt.requests[0].id, [20], "stranger"));
  resolveRoll(s, attempt.id, attempt.requests[0].id, [20], "player");
  assert.equal(s.actors.livia.hp, 1);
  assert.equal(hasCondition(s.actors.livia, "unconscious"), false);
  assert.equal(hasCondition(s.actors.livia, "prone"), true);
  assert.equal(attempt.outcomes[0].vitality.result, "regain-hp");
  assert.equal(attempt.status, "resolved");
});

test("natural 1 counts twice and the third failure makes death visible on token and sheet", () => {
  const s = fight();
  dropLivia(s);
  const nextSave = () => {
    s.combat.turn = 3;
    advanceTurn(s);
    return s.combatAttempts.filter((a) => a.kind === "vitality").at(-1);
  };
  let save = nextSave();
  resolveRoll(s, save.id, save.requests[0].id, [1], "player");
  assert.equal(s.actors.livia.deathSaves.failures, 2);
  save = nextSave();
  resolveRoll(s, save.id, save.requests[0].id, [4], "player");
  assert.equal(s.actors.livia.dead, true);
  resetTableView();
  const table = renderTable(ctxFor(s, "player"));
  assert.match(table, /data-token-status="dead"/);
  const sheet = renderCharacters(ctxFor(s, "player", { page: "characters", id: "livia" }));
  assert.match(sheet, /data-conditions-summary="livia"/);
  assert.match(sheet, /data-vital="dead"/);
});

test("healing before the roll expires a pending death save without inventing a face", () => {
  const s = fight();
  dropLivia(s);
  s.combat.turn = 3;
  advanceTurn(s);
  const save = s.combatAttempts.find((a) => a.kind === "vitality");
  s.actors.livia.bonus = true;
  // A dying creature is Incapacitated: it cannot drink its own potion.
  assert.throws(() =>
    beginHealing(s.actors.livia, "potion", { inCombat: false, mode: "physical", id: "sip" }),
  );
  // An ally's healing (a trusted, already authorized fact) arrives before the roll.
  applyConditionFollowUps(
    s,
    applyVitalityEvent(s, {
      eventId: "ally-cure",
      actorId: "livia",
      kind: "healing",
      amount: 6,
      source: { kind: "authored-demo", revision: "ally-cure" },
    }),
  );
  assert.equal(s.actors.livia.hp, 6);
  assert.equal(hasCondition(s.actors.livia, "unconscious"), false);
  assert.equal(save.requests[0].status, "expired");
  assert.equal(save.requests[0].values, undefined);
  assert.equal(hasBlockingConsequences(s, "livia"), false);
});

test("roll evidence, correction and Undo keep conditions, HP and death saves in one transaction", () => {
  const store = createStore();
  store.commit(
    "setup",
    (s) => {
      Object.assign(s, fight());
    },
    "dm",
  );
  const before = structuredClone(store.state.actors.livia);
  const events = store.state.conditionEvents?.length ?? 0;
  store.commit("drop", (s) => dropLivia(s), "dm");
  assert.equal(store.state.actors.livia.hp, 0);
  store.undo("dm");
  assert.equal(store.state.actors.livia.hp, before.hp);
  assert.deepEqual(store.state.actors.livia.conditions ?? [], before.conditions ?? []);
  assert.equal(store.state.conditionEvents?.length ?? 0, events);
  store.commit("drop again", (s) => dropLivia(s), "dm");
  store.commit("next", (s) => ((s.combat.turn = 3), advanceTurn(s)), "dm");
  const save = store.state.combatAttempts.find((a) => a.kind === "vitality");
  store.commit(
    "roll",
    (s) => resolveRoll(s, save.id, save.requests[0].id, [12], "player"),
    "player",
  );
  const roll = store.state.log.at(-1).rolls.find((r) => r.kind === "death-save");
  assert.deepEqual(
    { values: roll.values, natural: roll.natural, total: roll.total },
    { values: [12], natural: 12, total: 12 },
  );
  assert.equal(store.state.actors.livia.deathSaves.successes, 1);
  store.undo("player");
  assert.equal(store.state.actors.livia.deathSaves?.successes ?? 0, 0);
  const pending = store.state.combatAttempts.find((a) => a.id === save.id).requests[0];
  assert.equal(pending.status, "pending");
  assert.deepEqual(pending.acceptedValues, [12]);
  assert.ok(store.state.log.some((l) => l.rolls?.some((r) => r.kind === "death-save")));
  store.commit(
    "reapply",
    (s) => resolveRoll(s, save.id, save.requests[0].id, [12], "player"),
    "player",
  );
  assert.equal(store.state.actors.livia.deathSaves.successes, 1);
});

test("Stand up spends half the effective speed; moving while Prone crawls at double cost", () => {
  const s = fight();
  applyConditionEvent(s, {
    eventId: "trip",
    kind: "apply",
    actorId: "livia",
    conditionId: "prone",
    source: SRC,
  });
  const moved = previewMovement(s, "livia", { x: 350, y: 380 });
  assert.equal(Math.round(moved.distance * 10) / 10, 3);
  assert.equal(Math.round(moved.totalCost * 10) / 10, 6);
  resetTableView();
  assert.match(renderTable(ctxFor(s, "player")), /data-table="stand"/);
  const context = standContextFor(s, "livia");
  const p = previewStand(s, "livia", "player", context);
  assert.equal(p.canApply, true);
  standUp(s, "livia", "player", {
    ...context,
    operationId: "stand-1",
    reviewKey: p.reviewKey,
    online: true,
  });
  assert.equal(s.actors.livia.movement, 4.5);
  assert.equal(s.actors.livia.action, true);
  assert.equal(s.actors.livia.dashCount ?? 0, 0);
  assert.equal(hasCondition(s.actors.livia, "prone"), false);
});

test("a pending causal request blocks Stand up through the root context", () => {
  const s = fight();
  applyConditionEvent(s, {
    eventId: "trip",
    kind: "apply",
    actorId: "livia",
    conditionId: "prone",
    source: SRC,
  });
  beginAttempt(
    s,
    {
      id: "bolt",
      actorId: "livia",
      actionId: "fire-bolt",
      selection: { targetIds: ["goblin-1"] },
      mode: "physical",
    },
    "player",
  );
  const context = standContextFor(s, "livia");
  assert.equal(context.blocking, true);
  assert.equal(previewStand(s, "livia", "player", context).canApply, false);
});

test("condition speed sizes the movement budget and speed 0 blocks movement", () => {
  const s = fight();
  s.actors.livia.exhaustion = 2;
  assert.equal(getEffectiveSpeed(s.actors.livia), 6);
  resetTurnMovement(s.actors.livia);
  assert.equal(s.actors.livia.movement, 6);
  applyConditionEvent(s, {
    eventId: "grab",
    kind: "apply",
    actorId: "livia",
    conditionId: "grappled",
    source: SRC,
    origin: { actorId: "goblin-1" },
  });
  assert.equal(getEffectiveSpeed(s.actors.livia), 0);
  assert.throws(() =>
    beginMovement(s, { id: "m", actorId: "livia", point: { x: 300, y: 450 } }, "player"),
  );
});

test("Wolf Bite applies Prone through the domain on a known Medium-or-smaller target", () => {
  const s = fight();
  const choice = { mode: "manual", name: "Lupo", profileId: "srd2024:wolf" };
  const preview = previewCompanionCreation(s, "livia", choice, "player");
  const { actorId } = createCompanion(s, "livia", choice, "player", {
    operationId: "wolf",
    reviewKey: preview.reviewKey,
  });
  s.scenes[0].tokens.push({ id: "token-wolf", actorId, x: 310, y: 380 });
  s.combat.order.push(actorId);
  s.combat.turn = s.combat.order.indexOf(actorId);
  const wolf = s.actors[actorId];
  assert.equal(wolf.vitalityPolicy.zeroHp, "manual");
  assert.deepEqual(wolf.conditionImmunities, []);
  const bite = beginAttempt(
    s,
    { id: "bite", actorId, actionId: "melee-attack", selection: { targetIds: ["goblin-1"] } },
    "player",
  );
  resolveRoll(s, "bite", bite.requests[0].id, fill(bite.requests[0], 15), "player");
  const damage = bite.requests.find((r) => r.kind === "damage");
  resolveRoll(s, "bite", damage.id, fill(damage, 1), "player");
  const prone = s.actors["goblin-1"].conditions.find((c) => c.id === "prone");
  assert.ok(prone, "Bite knocks the target Prone");
  assert.equal(prone.origin.actorId, actorId);
  assert.deepEqual(prone.source.pages, [364]);
  assert.equal(bite.outcomes[0].conditions[0].conditionId, "prone");

  const unknown = fight();
  delete unknown.actors["goblin-1"].size;
  const p2 = previewCompanionCreation(unknown, "livia", choice, "player");
  const created = createCompanion(unknown, "livia", choice, "player", {
    operationId: "wolf",
    reviewKey: p2.reviewKey,
  });
  unknown.scenes[0].tokens.push({ id: "token-wolf", actorId: created.actorId, x: 310, y: 380 });
  unknown.combat.order.push(created.actorId);
  unknown.combat.turn = unknown.combat.order.indexOf(created.actorId);
  const b2 = beginAttempt(
    unknown,
    {
      id: "bite",
      actorId: created.actorId,
      actionId: "melee-attack",
      selection: { targetIds: ["goblin-1"] },
    },
    "player",
  );
  resolveRoll(unknown, "bite", b2.requests[0].id, fill(b2.requests[0], 15), "player");
  resolveRoll(
    unknown,
    "bite",
    b2.requests.find((r) => r.kind === "damage").id,
    fill(
      b2.requests.find((r) => r.kind === "damage"),
      1,
    ),
    "player",
  );
  assert.equal(hasCondition(unknown.actors["goblin-1"], "prone"), false);
  assert.equal(b2.outcomes[0].conditions[0].reconciliation, "size-unknown");
});

test("concentration end removes only the conditions it sustained", () => {
  const s = fight();
  s.actors.livia.concentration = { id: "c1", name: "Hold", active: true };
  applyConditionEvent(s, {
    eventId: "hold",
    kind: "apply",
    actorId: "goblin-2",
    conditionId: "restrained",
    source: SRC,
    term: { kind: "concentration", actorId: "livia", concentrationId: "c1" },
  });
  applyConditionEvent(s, {
    eventId: "sick",
    kind: "apply",
    actorId: "goblin-2",
    conditionId: "poisoned",
    source: SRC,
  });
  dropLivia(s);
  assert.equal(hasCondition(s.actors["goblin-2"], "restrained"), false);
  assert.equal(hasCondition(s.actors["goblin-2"], "poisoned"), true);
});

test("turn, clock and rest terms expire once at their observed events", () => {
  const s = fight();
  s.combat.turn = 1;
  applyConditionEvent(s, {
    eventId: "daze",
    kind: "apply",
    actorId: "goblin-1",
    conditionId: "poisoned",
    source: SRC,
    term: { kind: "turn", actorId: "goblin-1", phase: "end", when: "current" },
  });
  advanceTurn(s);
  assert.equal(hasCondition(s.actors["goblin-1"], "poisoned"), false);
  const expired = () => s.conditionEvents.filter((e) => e.kind === "expired").length;
  assert.equal(expired(), 1);
  expireTurnEffects(s, "goblin-1", "end", { turnKey: "enc:1:goblin-1" });
  assert.equal(expired(), 1);

  const calm = createInitialState();
  applyConditionEvent(calm, {
    eventId: "timed",
    kind: "apply",
    actorId: "livia",
    conditionId: "frightened",
    source: SRC,
    term: { kind: "clock", clockId: "lanterns", expiresAt: 60 },
  });
  applyConditionEvent(calm, {
    eventId: "until-rest",
    kind: "apply",
    actorId: "livia",
    conditionId: "poisoned",
    source: SRC,
    term: { kind: "rest", actorId: "livia", restKind: "short" },
  });
  startRest(
    calm,
    { id: "sr", kind: "short", actorIds: ["livia"], campaignId: "lanterns" },
    "player",
  );
  advanceGameTime(calm, { id: "hour", campaignId: "lanterns", seconds: 3600 }, "dm");
  assert.equal(hasCondition(calm.actors.livia, "frightened"), false);
  assert.equal(hasCondition(calm.actors.livia, "poisoned"), true);
  completeRest(calm, "sr", { id: "sr-done", actorIds: ["livia"] }, "player");
  assert.equal(hasCondition(calm.actors.livia, "poisoned"), false);
});

test("attack previews show condition reasons at the real distance", () => {
  const s = fight();
  applyConditionEvent(s, {
    eventId: "trip",
    kind: "apply",
    actorId: "goblin-1",
    conditionId: "prone",
    source: SRC,
  });
  const staff = previewAction(s, "livia", "quarterstaff", { targetIds: ["goblin-1"] }, "player");
  assert.equal(staff.rollMode, "advantage");
  assert.equal(staff.conditionRules.advantage[0].conditionId, "prone");
  place(s, "goblin-1", 450, 380);
  const bolt = previewAction(s, "livia", "fire-bolt", { targetIds: ["goblin-1"] }, "player");
  assert.equal(bolt.rollMode, "disadvantage");
  assert.equal(bolt.conditionRules.disadvantage[0].conditionId, "prone");
  applyConditionEvent(s, {
    eventId: "sick",
    kind: "apply",
    actorId: "livia",
    conditionId: "poisoned",
    source: SRC,
  });
  s.actors.livia.exhaustion = 1;
  const worse = previewAction(s, "livia", "fire-bolt", { targetIds: ["goblin-1"] }, "player");
  assert.equal(
    worse.conditionRules.disadvantage.some((r) => r.conditionId === "poisoned"),
    true,
  );
  const attempt = beginAttempt(
    s,
    { id: "b", actorId: "livia", actionId: "fire-bolt", selection: { targetIds: ["goblin-1"] } },
    "player",
  );
  assert.equal(attempt.requests[0].modifier, 5 - 2);
  assert.equal(attempt.requests[0].modifierSources[0].kind, "exhaustion");
});

test("an automatic Dexterity failure creates no save die and takes full damage", () => {
  const s = fight();
  s.actors["goblin-1"].hp = 40;
  applyConditionEvent(s, {
    eventId: "stun",
    kind: "apply",
    actorId: "goblin-1",
    conditionId: "stunned",
    source: SRC,
  });
  const attempt = beginAttempt(
    s,
    {
      id: "burn",
      actorId: "livia",
      actionId: "burning-hands",
      selection: { point: { x: 300, y: 380 }, slotLevel: 1 },
    },
    "player",
  );
  assert.equal(
    attempt.requests.some((r) => r.kind === "save" && r.actorId === "goblin-1"),
    false,
  );
  const outcome = attempt.outcomes.find((o) => o.actorId === "goblin-1");
  assert.equal(outcome.autoFailSave, true);
  resolveRoll(s, "burn", attempt.requests[0].id, [2, 2, 2], "player");
  assert.equal(s.actors["goblin-1"].hp, 34);
});

test("Medicine, stability and the 1d4 recovery all use the same request queue", () => {
  const s = fight();
  dropLivia(s);
  s.combat.turn = 2;
  s.actors.doran.action = true;
  place(s, "doran", 250, 410);
  const input = { actorId: "doran", targetId: "livia", kind: "stabilize" };
  const aid = previewAid(s, input, "dm", { effectiveActor: getEffectiveActor(s.actors.doran) });
  assert.equal(aid.canApply, true);
  const started = beginVitalityRoll(
    s,
    {
      kind: "medicine",
      actorId: "doran",
      targetId: "livia",
      aidKind: "stabilize",
      reviewKey: aid.reviewKey,
    },
    "dm",
    { operationId: "aid-1" },
  );
  assert.equal(s.actors.doran.action, false);
  const medicine = s.combatAttempts.find((a) => a.descriptor?.id === started.descriptorId);
  assert.equal(medicine.requests[0].kind, "medicine");
  assert.equal(medicine.requests[0].modifier, 1);
  resolveRoll(s, medicine.id, medicine.requests[0].id, [15], "dm");
  assert.equal(s.actors.livia.deathSaves.stable, true);
  const recovery = s.combatAttempts.find(
    (a) => a.kind === "vitality" && a.requests[0].kind === "stable-recovery",
  );
  assert.ok(recovery, "stability queues its own 1d4 request");
  assert.equal(hasBlockingConsequences(s, "livia"), false, "the d4 does not block turns");
  resolveRoll(s, recovery.id, recovery.requests[0].id, [2], "player");
  assert.equal(
    s.actors.livia.deathSaves.recovery.expiresAt,
    s.actors.livia.deathSaves.recovery.startedAt + 7200,
  );
});

test("death saves outside initiative are explicit requests with owner authority and commit scope", () => {
  const s = createInitialState();
  s.actors.livia.hp = 3;
  const drop = applyVitalityEvent(s, {
    eventId: "fall",
    actorId: "livia",
    kind: "damage",
    amount: 5,
    source: SRC,
  });
  applyConditionFollowUps(s, drop);
  assert.equal(s.actors.livia.hp, 0);
  assert.throws(() => beginVitalityRoll(s, { kind: "death-save", actorId: "goblin-1" }, "player"));
  const started = beginVitalityRoll(s, { kind: "death-save", actorId: "livia" }, "player");
  const again = projectVitalityRolls(s, "livia", "player");
  assert.equal(again.length, 1);
  assert.equal(again[0].descriptorId, started.descriptorId);
  assert.equal(again[0].status, "pending");
  assert.deepEqual(projectVitalityRolls(s, "livia", "stranger"), []);
});

test("manual damage from the panel keeps rest and concentration consequences coherent", () => {
  const s = fight();
  s.actors.livia.concentration = { id: "focus", name: "Effect", active: true };
  const selection = { kind: "damage", amount: 4, reason: "trap", source: SRC };
  const p = previewVitalityChange(s, "livia", selection, "player");
  const result = applyVitalityChange(s, "livia", selection, "player", {
    operationId: "trap-1",
    reviewKey: p.reviewKey,
  });
  applyConditionFollowUps(s, result, { manual: true });
  assert.equal(s.actors.livia.hp, 14);
  const request = s.combatAttempts
    .flatMap((a) => a.requests)
    .find((r) => r.kind === "concentration");
  assert.equal(request.dc, 10);
  assert.equal(request.status, "pending");
});
