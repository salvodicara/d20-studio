import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState, createStore } from "../state.mjs";
import {
  listActions,
  previewAction,
  beginAttempt,
  resolveRoll,
  projectAttempts,
  expireTurnEffects,
} from "../combat.mjs";

function fixture() {
  const state = createInitialState();
  state.combat.active = true;
  const scene = state.scenes[0];
  Object.assign(
    scene.tokens.find((t) => t.actorId === "livia"),
    { x: 100, y: 100 },
  );
  Object.assign(
    scene.tokens.find((t) => t.actorId === "goblin-1"),
    { x: 140, y: 100 },
  );
  Object.assign(
    scene.tokens.find((t) => t.actorId === "goblin-2"),
    { x: 175, y: 125 },
  );
  Object.assign(
    scene.tokens.find((t) => t.actorId === "doran"),
    { x: 160, y: 80 },
  );
  for (const actor of Object.values(state.actors)) {
    actor.hp = 40;
    actor.maxHp = 40;
  }
  return state;
}
const payload = (actionId, selection = {}, id = "attempt-1") => ({
  id,
  actorId: "livia",
  actionId,
  selection,
  mode: "physical",
});
const request = (attempt, kind, actorId) =>
  attempt.requests.find((r) => r.kind === kind && (!actorId || r.actorId === actorId));

test("action definitions carry immutable 2024 sources and an explicit sample repertoire", () => {
  const state = fixture();
  const actions = listActions(state, "livia");
  assert.ok(actions.some((a) => a.id === "fire-bolt"));
  for (const action of actions) {
    assert.equal(action.source.edition, "2024");
    assert.equal(action.source.revision, "5.2.1");
    assert.match(action.source.sha256, /^[a-f0-9]{64}$/);
  }
  assert.ok(!listActions(state, "doran").some((a) => a.id === "fire-bolt"));
});

test("casting after JSON reload keeps the legacy first-level alias synchronized with the canonical pool", () => {
  const state = JSON.parse(JSON.stringify(fixture()));
  const previous = state.actors.livia.spellSlots[1].used;
  const beforePreview = JSON.stringify(state);
  previewAction(
    state,
    "livia",
    "magic-missile",
    { allocations: [{ actorId: "goblin-1", count: 3 }] },
    "player",
  );
  assert.equal(JSON.stringify(state), beforePreview);
  beginAttempt(
    state,
    payload("magic-missile", { allocations: [{ actorId: "goblin-1", count: 3 }] }),
    "player",
  );
  assert.equal(state.actors.livia.spellSlots[1].used, previous + 1);
  assert.equal(state.actors.livia.slots.used, previous + 1);
});

test("preview is pure and off-turn cannot execute a hostile action; outside combat an attack needs no initiative", () => {
  const state = fixture();
  state.combat.turn = 1;
  const before = structuredClone(state);
  const preview = previewAction(state, "livia", "fire-bolt", { targetIds: ["goblin-1"] }, "player");
  assert.equal(preview.available, false);
  assert.ok(preview.reasons.some((r) => r.code === "not-your-turn"));
  assert.deepEqual(state, before);
  assert.throws(() =>
    beginAttempt(state, payload("fire-bolt", { targetIds: ["goblin-1"] }), "player"),
  );
  assert.deepEqual(state, before);
  // PG-69 (dnd5e and DDB roll an attack at any time): no initiative is asked outside combat.
  state.combat.active = false;
  const outside = previewAction(state, "livia", "fire-bolt", { targetIds: ["goblin-1"] }, "player");
  assert.ok(!outside.reasons.some((r) => r.code === "prepare-initiative"));
  assert.equal(outside.available, true);
  const attempt = beginAttempt(state, payload("fire-bolt", { targetIds: ["goblin-1"] }), "player");
  assert.equal(attempt.requests[0].kind, "attack");
  assert.equal(state.actors.livia.action, true, "no action economy outside combat");
});

test("physical attack spends once, survives serialization, and never substitutes missing dice", () => {
  let state = fixture();
  const attempt = beginAttempt(
    state,
    payload("quarterstaff", { targetIds: ["goblin-1"] }),
    "player",
  );
  assert.equal(state.actors.livia.action, false);
  assert.equal(attempt.status, "pending");
  assert.equal(state.actors["goblin-1"].hp, 40);
  assert.equal(state.actors.livia.slots.used, 1);
  assert.equal(
    beginAttempt(state, payload("quarterstaff", { targetIds: ["goblin-1"] }), "player").id,
    attempt.id,
  );
  assert.equal(state.combatAttempts.length, 1);
  state = JSON.parse(JSON.stringify(state));
  const roll = request(state.combatAttempts[0], "attack");
  const before = structuredClone(state);
  assert.throws(() => resolveRoll(state, attempt.id, roll.id, [], "player"));
  assert.deepEqual(state, before);
  resolveRoll(state, attempt.id, roll.id, [1], "player");
  assert.equal(state.combatAttempts[0].status, "resolved");
  assert.equal(state.combatAttempts[0].outcomes[0].hit, false);
  assert.equal(state.actors["goblin-1"].hp, 40);
});

test("critical weapon attack doubles dice, applies damage once and rejects a changed retry", () => {
  const state = fixture();
  const attempt = beginAttempt(
    state,
    payload("quarterstaff", { targetIds: ["goblin-1"] }),
    "player",
  );
  resolveRoll(state, attempt.id, request(attempt, "attack").id, [20], "player");
  const damage = request(attempt, "damage");
  assert.equal(damage.dice[0].count, 2);
  resolveRoll(state, attempt.id, damage.id, [3, 4], "player");
  assert.equal(state.actors["goblin-1"].hp, 33);
  resolveRoll(state, attempt.id, damage.id, [3, 4], "player");
  assert.equal(state.actors["goblin-1"].hp, 33);
  assert.throws(() => resolveRoll(state, attempt.id, damage.id, [4, 4], "player"));
  assert.equal(state.actors["goblin-1"].hp, 33);
});

test("cone includes allies and uses one common damage with individually pending saves", () => {
  const state = fixture();
  state.actors.doran.owner = "player";
  const selection = { point: { x: 250, y: 100 } };
  const preview = previewAction(state, "livia", "burning-hands", selection, "player");
  assert.deepEqual(
    new Set(preview.targets.map((t) => t.actorId)),
    new Set(["goblin-1", "goblin-2", "doran"]),
  );
  const attempt = beginAttempt(state, payload("burning-hands", selection), "player");
  assert.equal(state.actors.livia.slots.used, 2);
  assert.equal(attempt.requests.filter((r) => r.kind === "damage").length, 1);
  resolveRoll(state, attempt.id, request(attempt, "damage").id, [4, 4, 3], "player");
  assert.equal(state.actors["goblin-1"].hp, 40);
  const save1 = request(attempt, "save", "goblin-1");
  assert.throws(() => resolveRoll(state, attempt.id, save1.id, [8], "player"));
  resolveRoll(state, attempt.id, save1.id, [8], "dm");
  resolveRoll(state, attempt.id, request(attempt, "save", "goblin-2").id, [14], "dm");
  assert.equal(state.actors["goblin-1"].hp, 29);
  assert.equal(state.actors["goblin-2"].hp, 35);
  assert.equal(state.actors.doran.hp, 40);
  assert.equal(attempt.status, "pending");
  resolveRoll(state, attempt.id, request(attempt, "save", "doran").id, [15], "player");
  assert.equal(state.actors.doran.hp, 35);
  assert.equal(attempt.status, "resolved");
});

test("projection strips other controllers pending dice and NPC thresholds without hiding permitted waiting state", () => {
  const state = fixture();
  const attempt = beginAttempt(
    state,
    payload("burning-hands", { point: { x: 250, y: 100 } }),
    "player",
  );
  const projected = projectAttempts(state, "player")[0];
  assert.ok(projected.waiting.some((w) => w.owner === "dm"));
  assert.ok(!projected.requests.some((r) => r.actorId === "goblin-1"));
  assert.ok(!JSON.stringify(projected).includes("targetAC"));
  assert.ok(!JSON.stringify(projected).includes("saveModifier"));
  assert.equal(projectAttempts(state, "dm")[0].requests.length, attempt.requests.length);
});

test("no-target actions require no dice and Dodge expires at its actor next turn, not another turn", () => {
  const state = fixture();
  const attempt = beginAttempt(state, payload("dodge"), "player");
  assert.equal(attempt.status, "resolved");
  assert.equal(attempt.requests.length, 0);
  assert.ok(state.actors.livia.combatEffects.some((e) => e.type === "dodge"));
  expireTurnEffects(state, "doran", "start");
  assert.ok(state.actors.livia.combatEffects.some((e) => e.type === "dodge"));
  expireTurnEffects(state, "livia", "start");
  assert.ok(!state.actors.livia.combatEffects.some((e) => e.type === "dodge"));
});

test("Dash keeps movement cost explicit and Disengage expires at the end of the same turn", () => {
  const state = fixture();
  state.actors.livia.movement = 4;
  beginAttempt(state, payload("dash", { point: { x: 300, y: 100 } }), "player");
  assert.equal(state.actors.livia.movement, 7);
  assert.equal(state.scenes[0].tokens.find((t) => t.actorId === "livia").x, 300);
  state.actors.livia.action = true;
  beginAttempt(state, payload("disengage", {}, "attempt-2"), "player");
  assert.ok(state.actors.livia.combatEffects.some((e) => e.type === "disengage"));
  expireTurnEffects(state, "livia", "end");
  assert.ok(!state.actors.livia.combatEffects.some((e) => e.type === "disengage"));
});

test("distributed missiles fix assignments before separate dart dice and consume one slot", () => {
  const state = fixture();
  const selection = {
    allocations: [
      { actorId: "goblin-1", count: 2 },
      { actorId: "goblin-2", count: 1 },
    ],
  };
  const attempt = beginAttempt(state, payload("magic-missile", selection), "player");
  const roll = request(attempt, "damage");
  assert.deepEqual(roll.dice, [{ count: 3, sides: 4 }]);
  assert.equal(roll.modifier, 3);
  resolveRoll(state, attempt.id, roll.id, [1, 2, 4], "player");
  assert.equal(roll.total, 10);
  assert.equal(state.actors["goblin-1"].hp, 35);
  assert.equal(state.actors["goblin-2"].hp, 35);
  assert.equal(attempt.requests.length, 1);
  assert.equal(state.actors.livia.slots.used, 2);
  assert.throws(() =>
    beginAttempt(
      state,
      payload("magic-missile", { allocations: [{ actorId: "goblin-2", count: 3 }] }),
      "player",
    ),
  );
  assert.equal(state.actors["goblin-1"].hp, 35);
});

test("spell slot level is explicit, upgrades dice and enforces one slot per turn rather than one spell", () => {
  const state = fixture();
  state.actors.livia.spellSlots = { 1: { max: 4, used: 1 }, 2: { max: 2, used: 0 } };
  const first = beginAttempt(
    state,
    payload("magic-missile", { slotLevel: 2, allocations: [{ actorId: "goblin-1", count: 4 }] }),
    "player",
  );
  resolveRoll(state, first.id, request(first, "damage").id, [1, 1, 1, 1], "player");
  assert.equal(state.actors.livia.spellSlots[2].used, 1);
  assert.equal(state.actors.livia.slots.used, 1);
  state.actors.livia.action = true;
  assert.ok(
    previewAction(
      state,
      "livia",
      "burning-hands",
      { point: { x: 250, y: 100 } },
      "player",
    ).reasons.some((r) => r.code === "slot-used-this-turn"),
  );
  assert.ok(
    !previewAction(state, "livia", "fire-bolt", { targetIds: ["goblin-2"] }, "player").reasons.some(
      (r) => r.code === "slot-used-this-turn",
    ),
  );
  expireTurnEffects(state, "doran", "start");
  state.combat.turn = 2;
  assert.equal(state.actors.livia.lastSlotTurn, undefined);
});

test("ranged proximity uses an enemy who sees the attacker, not an ally or an incapacitated enemy", () => {
  const state = fixture();
  const preview = () =>
    previewAction(state, "livia", "fire-bolt", { targetIds: ["goblin-2"] }, "player");
  assert.equal(preview().rollMode, "disadvantage");
  state.actors["goblin-1"].incapacitated = true;
  assert.equal(preview().rollMode, "normal");
  state.actors["goblin-1"].incapacitated = false;
  state.actors["goblin-1"].blinded = true;
  assert.equal(preview().rollMode, "normal");
  state.actors["goblin-1"].blinded = false;
  assert.equal(
    previewAction(
      state,
      "livia",
      "fire-bolt",
      { targetIds: ["goblin-2"], rollMode: "advantage" },
      "player",
    ).rollMode,
    "normal",
  );
});

test("Dodge affects attack and Dexterity save dice, but not when speed is zero", () => {
  const state = fixture();
  state.actors["goblin-1"].combatEffects = [
    { type: "dodge", actorId: "goblin-1", expires: "start" },
  ];
  let attempt = beginAttempt(state, payload("quarterstaff", { targetIds: ["goblin-1"] }), "player");
  assert.equal(request(attempt, "attack").rollMode, "disadvantage");
  assert.equal(request(attempt, "attack").dice[0].count, 2);
  resolveRoll(state, attempt.id, request(attempt, "attack").id, [20, 1], "player");
  assert.equal(attempt.outcomes[0].hit, false);
  state.actors.livia.action = true;
  attempt = beginAttempt(
    state,
    payload("burning-hands", { point: { x: 250, y: 100 } }, "second"),
    "player",
  );
  assert.equal(request(attempt, "save", "goblin-1").rollMode, "advantage");
  const next = fixture();
  next.actors["goblin-1"].combatEffects = [
    { type: "dodge", actorId: "goblin-1", expires: "start" },
  ];
  next.actors["goblin-1"].speed = 0;
  assert.equal(
    previewAction(next, "livia", "quarterstaff", { targetIds: ["goblin-1"] }, "player").rollMode,
    "normal",
  );
});

test("a hidden cone victim does not leak a name, count or private pending request to the player", () => {
  const state = fixture();
  state.actors["goblin-2"].hidden = true;
  const selection = { point: { x: 250, y: 100 } };
  assert.ok(
    !previewAction(state, "livia", "burning-hands", selection, "player").targets.some(
      (t) => t.actorId === "goblin-2",
    ),
  );
  const attempt = beginAttempt(state, payload("burning-hands", selection), "player");
  assert.ok(request(attempt, "save", "goblin-2"));
  const projected = projectAttempts(state, "player")[0];
  assert.ok(!JSON.stringify(projected).includes("goblin-2"));
  assert.ok(!JSON.stringify(projected).includes("Esploratore"));
});

test("missing defensive data never becomes a guessed miss or failed save", () => {
  const state = fixture();
  delete state.actors["goblin-1"].ac;
  const before = structuredClone(state);
  const preview = previewAction(
    state,
    "livia",
    "quarterstaff",
    { targetIds: ["goblin-1"] },
    "player",
  );
  assert.equal(preview.available, false);
  assert.throws(() =>
    beginAttempt(state, payload("quarterstaff", { targetIds: ["goblin-1"] }), "player"),
  );
  assert.deepEqual(state, before);
  const area = fixture();
  delete area.actors["goblin-1"].abilities.dex;
  assert.throws(() =>
    beginAttempt(area, payload("burning-hands", { point: { x: 250, y: 100 } }), "player"),
  );
  assert.equal(area.actors.livia.action, true);
  assert.equal(area.actors.livia.slots.used, 1);
});

test("player projection of a DM-triggered attack does not leak hidden selection ids", () => {
  const state = fixture();
  state.actors["goblin-1"].hidden = true;
  beginAttempt(state, payload("quarterstaff", { targetIds: ["goblin-1"] }), "dm");
  const playerView = JSON.stringify(projectAttempts(state, "player"));
  assert.ok(!playerView.includes("goblin-1"));
  assert.ok(!playerView.includes("Sentinella"));
});

test("offensive ability and proficiency must be numeric before any attack resource is consumed", () => {
  for (const invalid of [undefined, NaN, Infinity, "14"]) {
    const state = fixture();
    state.actors.livia.abilities.str = invalid;
    const before = structuredClone(state);
    const preview = previewAction(
      state,
      "livia",
      "quarterstaff",
      { targetIds: ["goblin-1"] },
      "player",
    );
    assert.equal(preview.available, false);
    assert.ok(preview.reasons.some((reason) => reason.code === "offensive-data-missing"));
    assert.throws(() =>
      beginAttempt(state, payload("quarterstaff", { targetIds: ["goblin-1"] }), "player"),
    );
    assert.deepEqual(state, before);
    assert.equal(state.actors["goblin-1"].hp, 40);
  }
  for (const actionId of ["quarterstaff", "fire-bolt", "burning-hands"]) {
    const state = fixture();
    state.actors.livia.combatProfile = {
      weaponProficiencies: ["quarterstaff"],
      spells: ["fire-bolt", "burning-hands"],
      spellcastingAbility: "int",
      proficiencyBonus: NaN,
      team: "party",
    };
    const before = structuredClone(state);
    assert.throws(() =>
      beginAttempt(
        state,
        payload(actionId, { targetIds: ["goblin-1"], point: { x: 250, y: 100 } }),
        "player",
      ),
    );
    assert.deepEqual(state, before);
  }
  const missingHP = fixture();
  delete missingHP.actors["goblin-1"].hp;
  assert.throws(() =>
    beginAttempt(missingHP, payload("quarterstaff", { targetIds: ["goblin-1"] }), "player"),
  );
  assert.equal(missingHP.actors.livia.action, true);
});

test("a controller retains their own hidden physical attempt and can complete its queue", () => {
  const state = fixture();
  state.actors.livia.hidden = true;
  const attempt = beginAttempt(
    state,
    payload("quarterstaff", { targetIds: ["goblin-1"] }),
    "player",
  );
  const projected = projectAttempts(state, "player");
  assert.equal(projected.length, 1);
  assert.equal(projected[0].actorId, "livia");
  assert.equal(projected[0].requests[0].id, request(attempt, "attack").id);
  assert.equal(projected[0].requests[0].rollMode, "advantage");
  resolveRoll(state, attempt.id, projected[0].requests[0].id, [1, 1], "player");
  assert.equal(projectAttempts(state, "player")[0].status, "resolved");
});

test("a hidden uncontrolled caster cannot bury an authorized save or reveal their identity", () => {
  const state = fixture();
  state.combat.turn = 1;
  state.actors["goblin-1"].hidden = true;
  // A caster needs its slots (final review F13: the sample goblin has none).
  state.actors["goblin-1"].slots = { used: 0, max: 4 };
  state.actors["goblin-1"].combatProfile = {
    spellcastingAbility: "int",
    proficiencyBonus: 2,
    spells: ["burning-hands"],
    componentsAvailable: true,
    team: "watch",
  };
  const attempt = beginAttempt(
    state,
    {
      id: "unknown-source-attempt",
      actorId: "goblin-1",
      actionId: "burning-hands",
      selection: { point: { x: -10, y: 100 } },
      mode: "physical",
    },
    "dm",
  );
  const projected = projectAttempts(state, "player");
  assert.equal(projected.length, 1);
  assert.equal(projected[0].actorId, null);
  assert.ok(!JSON.stringify(projected).includes("goblin-1"));
  assert.ok(!JSON.stringify(projected).includes("Sentinella"));
  assert.equal(projected[0].requests.length, 1);
  assert.equal(projected[0].requests[0].actorId, "livia");
  assert.equal(projected[0].requests[0].kind, "save");
  resolveRoll(state, attempt.id, projected[0].requests[0].id, [12], "player");
  assert.equal(request(attempt, "save", "livia").status, "resolved");
  assert.equal(request(attempt, "damage").status, "pending");
});

test("saving throw data cannot coerce null or text into a numerical defense", () => {
  for (const invalid of [null, "14", NaN]) {
    const state = fixture();
    state.actors["goblin-1"].abilities.dex = invalid;
    const before = structuredClone(state);
    assert.throws(() =>
      beginAttempt(state, payload("burning-hands", { point: { x: 250, y: 100 } }), "player"),
    );
    assert.deepEqual(state, before);
  }
  const state = fixture();
  state.actors["goblin-1"].savingThrows = { dex: "2" };
  assert.throws(() =>
    beginAttempt(state, payload("burning-hands", { point: { x: 250, y: 100 } }), "player"),
  );
  assert.equal(state.actors.livia.action, true);
});

test("selected Dash within ordinary movement spends neither action nor extra movement, even after acting", () => {
  for (const action of [true, false]) {
    const state = fixture();
    state.actors.livia.movement = 4;
    state.actors.livia.action = action;
    const selection = { point: { x: 200, y: 100 } };
    const preview = previewAction(state, "livia", "dash", selection, "player");
    assert.equal(preview.available, true);
    assert.equal(preview.cost.action, 0);
    assert.equal(preview.effectiveDash, false);
    const attempt = beginAttempt(state, payload("dash", selection), "player");
    assert.equal(attempt.effectiveDash, false);
    assert.equal(attempt.cost.action, 0);
    assert.equal(state.actors.livia.action, action);
    assert.equal(state.actors.livia.movement, 1);
    assert.equal(state.actors.livia.speed, 9);
    assert.equal(state.scenes[0].tokens.find((t) => t.actorId === "livia").x, 200);
  }
});

test("Dash consumes action only beyond ordinary budget and stops at the expanded budget", () => {
  const state = fixture();
  state.actors.livia.movement = 4;
  const selection = { point: { x: 900, y: 100 } };
  const preview = previewAction(state, "livia", "dash", selection, "player");
  assert.equal(preview.effectiveDash, true);
  assert.equal(preview.cost.action, 1);
  assert.equal(preview.movement.cost, 13);
  assert.equal(preview.movement.limited, true);
  const attempt = beginAttempt(state, payload("dash", selection), "player");
  assert.equal(attempt.effectiveDash, true);
  assert.equal(state.actors.livia.action, false);
  assert.equal(state.actors.livia.movement, 0);
  assert.equal(state.actors.livia.speed, 9);
  const token = state.scenes[0].tokens.find((t) => t.actorId === "livia");
  assert.equal(token.x, preview.movement.end.x);
  assert.equal(token.y, preview.movement.end.y);
  const alreadyActed = fixture();
  alreadyActed.actors.livia.movement = 4;
  alreadyActed.actors.livia.action = false;
  assert.ok(
    previewAction(alreadyActed, "livia", "dash", selection, "player").reasons.some(
      (r) => r.code === "action-spent",
    ),
  );
});

test("temporary HP absorb damage first while concentration uses damage received and observers do not learn private pools", () => {
  for (const temporary of [5, 20]) {
    const state = fixture();
    const target = state.actors["goblin-1"];
    target.tempHp = temporary;
    target.concentration = {
      id: "focused",
      active: true,
      name: { it: "Effetto sintetico", en: "Synthetic effect" },
    };
    target.savingThrows = { con: 2 };
    const attempt = beginAttempt(
      state,
      payload("magic-missile", { allocations: [{ actorId: target.id, count: 3 }] }),
      "player",
    );
    resolveRoll(state, attempt.id, request(attempt, "damage").id, [2, 2, 2], "player");
    const absorbed = Math.min(temporary, 9),
      outcome = attempt.outcomes[0];
    assert.equal(target.hp, 40 - (9 - absorbed));
    assert.equal(target.tempHp, temporary - absorbed);
    assert.equal(outcome.tempHpAbsorbed, absorbed);
    assert.equal(outcome.tempHpBefore, temporary);
    assert.equal(outcome.tempHpAfter, temporary - absorbed);
    assert.equal(outcome.damage, 9);
    const concentration = attempt.requests.filter((r) => r.kind === "concentration");
    assert.equal(concentration.length, 3);
    assert.ok(concentration.every((r) => r.damage === 3 && r.dc === 10));
    const publicOutcome = projectAttempts(state, "player")[0].outcomes[0];
    assert.equal(publicOutcome.tempHpBefore, undefined);
    assert.equal(publicOutcome.tempHpAfter, undefined);
    assert.equal(publicOutcome.tempHpAbsorbed, undefined);
    assert.equal(projectAttempts(state, "dm")[0].outcomes[0].tempHpAbsorbed, absorbed);
  }
});

test("Dash and traveled movement retain actual spent budget for later speed changes", () => {
  const state = fixture();
  state.actors.livia.movement = 1;
  const attempt = beginAttempt(state, payload("dash", { point: { x: 300, y: 100 } }), "player");
  assert.equal(attempt.effectiveDash, true);
  assert.equal(state.actors.livia.movement, 4);
  assert.equal(state.actors.livia.dashCount, 1);
  assert.equal(state.actors.livia.movementSpent, 14);
});

test("sourced fixed damage resolves on the attack roll without inventing a damage die or critical multiplier", () => {
  for (const face of [15, 20]) {
    const state = fixture();
    const actor = state.actors.livia;
    const source = listActions(state, actor.id).find((a) => a.id === "fire-bolt").source;
    actor.combatProfile.meleeAttack = {
      name: { it: "Artigli", en: "Claws" },
      reachMeters: 1.5,
      attackBonus: 4,
      damageModifier: 0,
      damageDice: [],
      fixedDamage: 1,
      damageType: "slashing",
      source,
    };
    const preview = previewAction(
      state,
      actor.id,
      "melee-attack",
      { targetIds: ["goblin-1"] },
      "player",
    );
    assert.equal(preview.available, true, JSON.stringify(preview.reasons));
    const attempt = beginAttempt(
      state,
      payload("melee-attack", { targetIds: ["goblin-1"] }),
      "player",
    );
    resolveRoll(state, attempt.id, request(attempt, "attack").id, [face], "player");
    assert.equal(attempt.requests.length, 1);
    assert.equal(attempt.status, "resolved");
    assert.equal(attempt.outcomes[0].damage, 1);
    assert.equal(state.actors["goblin-1"].hp, 39);
    assert.equal(attempt.outcomes[0].critical, face === 20);
  }
});
