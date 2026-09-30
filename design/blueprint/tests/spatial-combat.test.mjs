import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState, previewMovement } from "../state.mjs";
import { geometryKey } from "../spatial.mjs";
import {
  beginMovement,
  beginAttempt,
  previewAction,
  projectApproaches,
  confirmApproachAttack,
  resolveRoll,
  projectReactions,
  resolveReaction,
  resumeMovement,
  changeMovement,
  resolveAutomaticRolls,
  cancelApproach,
  projectAttempts,
} from "../combat.mjs";

const source = { kind: "authored-demo", revision: "spatial-combat-v1" };
const wall = (extra = {}) => ({
  id: "wall",
  a: { x: 200, y: 50 },
  b: { x: 200, y: 250 },
  kind: "wall",
  blocksMovement: true,
  blocksSight: true,
  blocksEffect: true,
  secret: false,
  source,
  ...extra,
});
const melee = {
  name: { it: "Lama", en: "Blade" },
  reachMeters: 1.5,
  attackBonus: 4,
  damageDice: [{ count: 1, sides: 6 }],
  damageModifier: 2,
  damageType: "slashing",
  source: { ...source, edition: "2024" },
};
function fixture() {
  const s = createInitialState();
  s.combat.active = true;
  s.scenes[0].tokens = [
    { actorId: "livia", x: 100, y: 100 },
    { actorId: "goblin-1", x: 300, y: 100 },
  ];
  s.actors["goblin-1"].combatProfile = { team: "watch", meleeAttack: structuredClone(melee) };
  s.actors["goblin-1"].hp = 40;
  s.actors.livia.combatProfile.spells = s.actors.livia.combatProfile.spells.filter(
    (id) => id !== "shield",
  );
  return s;
}
const move = (point, extra = {}) => ({ id: "move", actorId: "livia", point, ...extra });
const attack = (extra = {}) => ({
  id: "attack",
  actorId: "livia",
  actionId: "quarterstaff",
  selection: { targetIds: ["goblin-1"] },
  mode: "physical",
  ...extra,
});
test("movement authority rejects hidden blockage or stale geometry before any cost", () => {
  const s = fixture();
  s.scenes[0].walls = [wall({ secret: true })];
  const p = previewMovement(s, "livia", { x: 300, y: 100 }, { role: "player" });
  const before = JSON.stringify(s);
  assert.equal(p.blocked, false);
  assert.throws(
    () => beginMovement(s, move({ x: 300, y: 100 }, { geometryKey: p.geometryKey }), "player"),
    /path|percorso/i,
  );
  assert.equal(JSON.stringify(s), before);
  s.scenes[0].walls = [];
  const key = geometryKey(s.scenes[0]);
  s.scenes[0].terrain = [
    { id: "t", x: 150, y: 50, width: 100, height: 200, kind: "difficult", source },
  ];
  assert.throws(
    () => beginMovement(s, move({ x: 300, y: 100 }, { geometryKey: key }), "player"),
    /changed|cambi/i,
  );
  assert.equal(s.actors.livia.movement, 9);
});
test("waypoint movement pays terrain cost along the accepted path and resumes the residual path after OA", () => {
  const s = fixture();
  s.scenes[0].tokens[1] = { actorId: "goblin-1", x: 100, y: 100 };
  s.scenes[0].terrain = [
    { id: "t", x: 100, y: 50, width: 100, height: 200, kind: "difficult", source },
  ];
  const m = beginMovement(
    s,
    move({ x: 200, y: 200 }, { waypoints: [{ x: 200, y: 100 }] }),
    "player",
  );
  assert.equal(m.position.x, 150);
  assert.equal(s.actors.livia.movement, 6);
  assert.equal(m.traveledMeters, 1.5);
  assert.equal(m.traveledCost, 3);
  const reaction = projectReactions(s, "dm").find((r) => r.status === "pending");
  resolveReaction(s, reaction.id, { use: false }, "dm");
  assert.deepEqual(m.position, { x: 200, y: 150 });
  assert.equal(m.status, "resolved");
  assert.equal(s.actors.livia.movement, 0);
  assert.equal(m.traveledCost, 9);
});
test("a changed scene after interruption blocks without silently changing the accepted route", () => {
  const s = fixture();
  s.scenes[0].tokens[1] = { actorId: "goblin-1", x: 100, y: 100 };
  const m = beginMovement(s, move({ x: 300, y: 100 }), "player");
  s.scenes[0].walls = [wall({ a: { x: 220, y: 0 }, b: { x: 220, y: 650 } })];
  const r = projectReactions(s, "dm").find((r) => r.status === "pending");
  resolveReaction(s, r.id, { use: false }, "dm");
  assert.equal(m.status, "blocked");
  assert.equal(m.position.x, 150);
  changeMovement(s, m.id, "player");
  assert.equal(m.status, "changed");
});
test("physical melee approach reaches range without an attack cost and survives reload until the real throw", () => {
  let s = fixture();
  const p = previewAction(s, "livia", "quarterstaff", { targetIds: ["goblin-1"] }, "player");
  assert.equal(p.available, true);
  assert.equal(p.approach.required, true);
  const a = beginAttempt(s, attack(), "player");
  assert.equal(a.requests.length, 0);
  assert.equal(s.actors.livia.action, true);
  assert.equal(projectApproaches(s, "player")[0].status, "awaiting-throw");
  assert.ok(s.scenes[0].tokens[0].x >= 250);
  assert.equal(projectApproaches(s, "stranger").length, 0);
  s = JSON.parse(JSON.stringify(s));
  confirmApproachAttack(s, a.id, "player");
  assert.equal(s.actors.livia.action, false);
  const active = s.combatAttempts[0];
  assert.equal(active.requests[0].kind, "attack");
  confirmApproachAttack(s, a.id, "player");
  assert.equal(active.requests.length, 1);
});

test("a direct physical throw never silently changes into an approach when its target moves", () => {
  const state = fixture();
  state.scenes[0].tokens[1].x = 140;
  const selection = { targetIds: ["goblin-1"], allowApproach: false };
  const initial = previewAction(state, "livia", "quarterstaff", selection, "player");
  assert.equal(initial.available, true);
  assert.equal(initial.approach, undefined);
  state.scenes[0].tokens[1].x = 300;
  const before = JSON.stringify(state);
  assert.throws(
    () => beginAttempt(state, attack({ selection }), "player"),
    (error) => error.code === "approach-not-authorized" && !!error.it && !!error.en,
  );
  assert.equal(JSON.stringify(state), before);
  state.scenes[0].tokens[1].x = 140;
  const attempt = beginAttempt(state, attack({ selection }), "player");
  assert.equal(attempt.approach, undefined);
  assert.equal(attempt.requests[0].kind, "attack");
  assert.equal(state.actors.livia.action, false);
  assert.equal(state.actors.livia.movement, 9);
  assert.equal(state.scenes[0].tokens[0].x, 100);
  assert.equal(beginAttempt(state, attack({ selection }), "player"), attempt);
  assert.throws(() => beginAttempt(state, attack(), "player"), /different choices/);
});
test("an unreachable melee sequence never moves partially, spends action or auto-Dashes", () => {
  const s = fixture();
  s.actors.livia.movement = 1;
  const before = JSON.stringify(s),
    p = previewAction(s, "livia", "quarterstaff", { targetIds: ["goblin-1"] }, "player");
  assert.equal(p.available, false);
  assert.throws(() => beginAttempt(s, attack(), "player"));
  assert.equal(JSON.stringify(s), before);
});
test("digital approach uses the original authorization and starts the attack on arrival once", () => {
  const s = fixture();
  const a = beginAttempt(s, attack({ mode: "digital" }), "player");
  assert.equal(s.actors.livia.action, false);
  assert.equal(a.requests[0].kind, "attack");
  resolveAutomaticRolls(s, () => 1);
  assert.equal(a.status, "resolved");
  assert.equal(projectApproaches(s, "player")[0].status, "resolved");
  beginAttempt(s, attack({ mode: "digital" }), "player");
  assert.equal(s.movements.length, 1);
});
test("sight and effect stay separate: mutual unseen bonuses cancel, one-way blindness disadvantages, total cover blocks", () => {
  const s = fixture();
  s.scenes[0].walls = [wall({ blocksMovement: false, blocksEffect: false })];
  const p = previewAction(s, "livia", "fire-bolt", { targetIds: ["goblin-1"] }, "player");
  assert.equal(p.available, true);
  assert.equal(p.rollMode, "normal");
  assert.equal(
    previewAction(
      s,
      "livia",
      "magic-missile",
      { allocations: [{ actorId: "goblin-1", count: 3 }] },
      "player",
    ).available,
    false,
  );
  s.scenes[0].walls = [];
  s.actors.livia.blinded = true;
  assert.equal(
    previewAction(s, "livia", "fire-bolt", { targetIds: ["goblin-1"] }, "player").rollMode,
    "disadvantage",
  );
  s.actors.livia.blinded = false;
  s.scenes[0].walls = [wall()];
  s.scenes[0].walls[0].blocksEffect = true;
  s.scenes[0].walls[0].blocksSight = false;
  assert.equal(
    previewAction(s, "livia", "fire-bolt", { targetIds: ["goblin-1"] }, "player").available,
    false,
  );
  s.scenes[0].tokens[1].x = 240;
  const cone = previewAction(s, "livia", "burning-hands", { point: { x: 300, y: 100 } }, "player");
  assert.equal(cone.targets.length, 0);
});

test("an interrupted physical approach resumes after a miss but damage permits cancelling the residual attack", () => {
  for (const continueAfterDamage of [false, true]) {
    const s = fixture();
    s.scenes[0].tokens.push({ actorId: "goblin-2", x: 100, y: 100 });
    s.actors["goblin-2"].combatProfile = { team: "watch", meleeAttack: structuredClone(melee) };
    const a = beginAttempt(s, attack(), "player");
    assert.equal(a.approach.status, "moving");
    assert.equal(a.requests.length, 0);
    const offer = projectReactions(s, "dm").find(
      (r) => r.type === "opportunity" && r.status === "pending",
    );
    resolveReaction(s, offer.id, { use: true, mode: "physical" }, "dm");
    const oa = s.combatAttempts.find((a) => a.reactionId === offer.id);
    resolveRoll(s, oa.id, oa.requests[0].id, [18], "dm");
    resolveRoll(s, oa.id, oa.requests.find((r) => r.kind === "damage").id, [2], "dm");
    const m = s.movements.find((m) => m.id === a.approach.movementId);
    assert.equal(m.status, "awaiting-choice");
    assert.equal(s.actors.livia.action, true);
    const spent = s.actors.livia.movement;
    if (continueAfterDamage) {
      resumeMovement(s, m.id, "player");
      assert.equal(a.approach.status, "awaiting-throw");
      assert.equal(s.actors.livia.action, true);
      assert.ok(s.actors.livia.movement < spent);
      confirmApproachAttack(s, a.id, "player");
      assert.equal(s.actors.livia.action, false);
    } else {
      changeMovement(s, m.id, "player");
      assert.equal(a.approach.status, "cancelled");
      assert.equal(s.actors.livia.movement, spent);
      assert.equal(a.requests.length, 0);
      assert.equal(s.actors.livia.action, true);
    }
  }
});

test("a target changed after the approach never causes a second automatic chase or consumes the physical attack", () => {
  const s = fixture(),
    a = beginAttempt(s, attack(), "player");
  const position = structuredClone(s.scenes[0].tokens[0]),
    remaining = s.actors.livia.movement;
  s.scenes[0].tokens[1].x = 600;
  confirmApproachAttack(s, a.id, "player");
  assert.equal(a.approach.status, "blocked");
  assert.equal(a.requests.length, 0);
  assert.equal(s.actors.livia.action, true);
  assert.deepEqual(s.scenes[0].tokens[0], position);
  assert.equal(s.actors.livia.movement, remaining);
  cancelApproach(s, a.id, "player");
  assert.equal(a.status, "resolved");
  assert.equal(s.actors.livia.movement, remaining);
});

test("accepted approach follows its waypoints, does not leak a secret wall and never starts at zero speed", () => {
  const s = fixture();
  s.scenes[0].walls = [wall({ secret: true })];
  const selection = {
    targetIds: ["goblin-1"],
    waypoints: [
      { x: 100, y: 300 },
      { x: 300, y: 300 },
    ],
  };
  const p = previewAction(s, "livia", "quarterstaff", selection, "player");
  assert.equal(p.available, false); // longer manual path exceeds the ordinary budget.
  s.actors.livia.movement = 30;
  const a = beginAttempt(s, attack({ selection }), "player");
  assert.equal(a.approach.status, "awaiting-throw");
  assert.deepEqual(s.movements[0].path[1], { x: 100, y: 300 });
  assert.equal(projectAttempts(s, "player")[0].status, "pending");
  assert.ok(!JSON.stringify(projectApproaches(s, "player")).includes("wall"));
  const fresh = fixture();
  fresh.actors.livia.speed = 0;
  assert.equal(
    previewAction(fresh, "livia", "quarterstaff", { targetIds: ["goblin-1"] }, "player").available,
    false,
  );
  assert.throws(() => beginAttempt(fresh, attack(), "player"));
  assert.equal(fresh.scenes[0].tokens[0].x, 100);
});

test("an opportunity requires sight at the actual exit point, and total cover prevents the melee reaction", () => {
  for (const blockSight of [false, true]) {
    const s = fixture();
    s.scenes[0].tokens[1] = { actorId: "goblin-1", x: 100, y: 100 };
    s.scenes[0].walls = [
      wall({
        a: { x: 125, y: 0 },
        b: { x: 125, y: 650 },
        blocksMovement: false,
        blocksSight: blockSight,
        blocksEffect: !blockSight,
      }),
    ];
    const m = beginMovement(s, move({ x: 250, y: 100 }), "player");
    assert.equal(m.status, "resolved");
    assert.equal(projectReactions(s, "dm").length, 0);
    assert.equal(s.actors["goblin-1"].reaction, true);
  }
});

test("approach preview calculates attack visibility from the proposed arrival position", () => {
  const s = fixture();
  s.scenes[0].walls = [wall({ blocksMovement: false, blocksEffect: false })];
  s.actors["goblin-1"].combatEffects = [{ type: "dodge" }];
  const p = previewAction(s, "livia", "quarterstaff", { targetIds: ["goblin-1"] }, "player");
  assert.equal(p.available, true);
  assert.equal(p.rollMode, "disadvantage");
  const a = beginAttempt(s, attack({ mode: "digital" }), "player");
  assert.equal(a.requests[0].rollMode, p.rollMode);
});
