// Regression tests for the increment-10 review and browser findings
// (changes/interview-01/blueprint-conditions-fixes.md). Each test names its finding.
import test from "node:test";
import assert from "node:assert/strict";
import * as c from "../conditions.mjs";
import { createInitialState } from "../state.mjs";
import { beginHealing, resolveHealing, patchCharacter } from "../characters.mjs";
import {
  previewAction,
  beginAttempt,
  resolveRoll,
  resolveAutomaticRolls,
  projectAttempts,
  advanceTurn,
} from "../combat.mjs";

const SRC = Object.freeze({ kind: "authored-demo", edition: "2024", revision: "review-10" });
let seq = 0;
const op = (prefix = "op") => `${prefix}-${++seq}`;

function creature(id, extra = {}) {
  return {
    id,
    name: id[0].toUpperCase() + id.slice(1),
    kind: "character",
    owner: "player",
    visibility: "shared",
    campaignIds: ["camp"],
    controllers: [],
    hp: 6,
    maxHp: 12,
    tempHp: 0,
    ac: 12,
    speed: 9,
    movement: 9,
    movementSpent: 0,
    dashCount: 0,
    action: true,
    bonus: true,
    reaction: true,
    abilities: { str: 10, dex: 12, con: 14, int: 10, wis: 14, cha: 8 },
    proficiencyBonus: 2,
    skills: [],
    conditions: [],
    exhaustion: 0,
    dead: false,
    vitalityPolicy: { zeroHp: "death-saves", source: SRC },
    deathSaves: { successes: 0, failures: 0, stable: false, recovery: null },
    conditionImmunities: [],
    conditionImmunitiesSource: SRC,
    heldItemIds: [],
    inventory: [],
    notes: "",
    ...extra,
  };
}
function world() {
  return {
    campaign: {
      id: "camp",
      name: "Camp",
      members: [
        { id: "player", role: "player" },
        { id: "other", role: "player" },
        { id: "dm", role: "dm" },
      ],
    },
    actors: {
      hero: creature("hero", {
        inventory: [{ id: "potion", name: "Potion", quantity: 1, healing: true }],
      }),
      ally: creature("ally", { hp: 10, maxHp: 10 }),
      rival: creature("rival", { owner: "other" }),
      caster: creature("caster", { owner: "dm" }),
    },
    combat: { active: false, round: 1, turn: 0, order: ["hero", "ally"], encounterId: "enc" },
    restTime: { version: 1, clocks: { camp: { seconds: 3600, revision: 1 } }, rests: [] },
  };
}
const damage = (s, actorId, amount, extra = {}) =>
  c.applyVitalityEvent(s, {
    eventId: op("dmg"),
    actorId,
    kind: "damage",
    amount,
    source: SRC,
    ...extra,
  });
function vital(s, id, selection, viewer = "player") {
  const p = c.previewVitalityChange(s, id, selection, viewer);
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  return c.applyVitalityChange(s, id, selection, viewer, {
    operationId: op(),
    reviewKey: p.reviewKey,
  });
}

// ---------------------------------------------------------------- P1 potion

test("P1 an Incapacitated creature cannot drink its own potion, in or out of combat", () => {
  for (const inCombat of [true, false]) {
    const s = world(),
      hero = s.actors.hero;
    Object.assign(s.combat, { active: inCombat, order: ["hero"], turn: 0 });
    damage(s, "hero", 6);
    assert.equal(c.hasCondition(hero, "incapacitated"), true);
    assert.throws(() => beginHealing(hero, "potion", { inCombat, canAct: true }));
    assert.equal(hero.inventory[0].quantity, 1, "no potion spent");
    assert.equal(hero.bonus, true, "no Bonus Action spent");
  }
  const s = world();
  s.actors.hero.conditions = ["stunned"];
  assert.throws(() => beginHealing(s.actors.hero, "potion", {}), /incapacitated/i);
  const ok = world();
  beginHealing(ok.actors.hero, "potion", {});
  assert.equal(resolveHealing(ok.actors.hero, [1, 1], ok).after, 10);
});

// ---------------------------------------------------------------- P2 descriptors

test("P2 applyVitalityRoll re-derives death saves and stable recovery instead of trusting them", () => {
  const s = world();
  damage(s, "rival", 6);
  assert.equal(s.actors.rival.hp, 0);
  const forged = {
    id: "death-save:hero:x",
    kind: "death-save",
    actorId: "hero",
    targetId: "rival",
    triggerId: "x",
    dice: [{ count: 1, sides: 20 }],
    dc: 10,
    modifier: 0,
    modifierSources: [],
    context: { outsideInitiative: true },
  };
  assert.throws(
    () => c.applyVitalityRoll(s, { eventId: "f1", descriptor: forged, values: [20] }, "player"),
    (e) => e.code === "descriptor",
  );
  assert.equal(s.actors.rival.hp, 0, "the other player's creature is untouched");
  const rivalSave = { ...forged, id: "death-save:rival:x", actorId: "rival", targetId: "rival" };
  assert.throws(
    () => c.applyVitalityRoll(s, { eventId: "f2", descriptor: rivalSave, values: [20] }, "player"),
    (e) => e.code === "permission",
  );
  damage(s, "hero", 6);
  const real = c.describeDeathSave(
    s,
    "hero",
    { triggerId: "q", outsideInitiative: true },
    "player",
  );
  const inflated = { ...real, modifier: 9, modifierSources: [{ kind: "x", value: 9 }] };
  const out = c.applyVitalityRoll(
    s,
    { eventId: "f3", descriptor: inflated, values: [2] },
    "player",
  );
  assert.equal(out.outcome.modifier, 0, "the modifier is recomputed, not trusted");
  assert.equal(out.outcome.success, false);
  assert.equal(s.actors.hero.deathSaves.failures, 1);
  const renamed = { ...real, id: "death-save:hero:other" };
  assert.throws(
    () => c.applyVitalityRoll(s, { eventId: "f4", descriptor: renamed, values: [15] }, "player"),
    (e) => e.code === "descriptor",
  );
  const turnBound = { ...real, context: { turnKey: "enc:1:hero", outsideInitiative: false } };
  assert.throws(
    () => c.applyVitalityRoll(s, { eventId: "f5", descriptor: turnBound, values: [15] }, "player"),
    (e) => e.code === "descriptor",
    "a turn save needs its turn trigger",
  );
  // Stable recovery: only the controller of the stable creature answers.
  s.actors.rival.deathSaves = {
    successes: 0,
    failures: 0,
    stable: true,
    recovery: { stabilityId: "st", clockId: "camp", startedAt: 3600, expiresAt: null },
  };
  const recovery = {
    id: "stable-recovery:rival:st",
    kind: "stable-recovery",
    actorId: "rival",
    targetId: "rival",
    triggerId: "st",
    dice: [{ count: 1, sides: 4 }],
    dc: null,
    modifier: 0,
    modifierSources: [],
    context: { stabilityId: "st" },
  };
  assert.throws(
    () => c.applyVitalityRoll(s, { eventId: "f6", descriptor: recovery, values: [1] }, "player"),
    (e) => e.code === "permission",
  );
  assert.equal(s.actors.rival.deathSaves.recovery.expiresAt, null);
});

test("P3 an expired vitality roll is recorded only by a controller of the roller", () => {
  const s = world();
  damage(s, "rival", 6);
  const d = c.describeDeathSave(s, "rival", { triggerId: "q", outsideInitiative: true }, "other");
  s.actors.rival.hp = 3;
  const before = s.conditionEvents.length;
  assert.throws(
    () => c.applyVitalityRoll(s, { eventId: "late", descriptor: d, values: [5] }, "player"),
    (e) => e.code === "permission",
  );
  assert.equal(s.conditionEvents.length, before, "a reader records nothing");
  assert.equal(
    c.applyVitalityRoll(s, { eventId: "late", descriptor: d, values: [5] }, "other").outcome.status,
    "expired",
  );
});

// ---------------------------------------------------------------- P2 turn identity

test("P2 removing an earlier companion keeps the turn identity, so next-turn terms do not expire early", () => {
  const s = world();
  s.actors.fam = creature("fam", { owner: "dm" });
  Object.assign(s.combat, { active: true, order: ["caster", "fam", "hero"], turn: 2 });
  const key = c.combatTurnKey(s.combat);
  assert.equal(key, "enc:1:hero");
  c.applyConditionEvent(s, {
    eventId: "poison",
    kind: "apply",
    actorId: "hero",
    conditionId: "poisoned",
    source: SRC,
    immunityConfirmed: true,
    term: { kind: "turn", actorId: "hero", phase: "end", when: "next" },
  });
  // The familiar drops out of initiative during the hero's turn.
  Object.assign(s.combat, { order: ["caster", "hero"], turn: 1 });
  assert.equal(c.combatTurnKey(s.combat), key, "same turn, same identity");
  const now = c.observeConditionEvent(s, {
    eventId: "end-now",
    kind: "turn-end",
    actorIds: ["hero"],
    turnKey: c.combatTurnKey(s.combat),
  });
  assert.equal(now.expired.length, 0, "the current turn is not the next one");
  s.combat.round = 2;
  const next = c.observeConditionEvent(s, {
    eventId: "end-next",
    kind: "turn-end",
    actorIds: ["hero"],
    turnKey: c.combatTurnKey(s.combat),
  });
  assert.equal(next.expired.length, 1);
});

test("P2 combat attempts and slot limits use the shared index-independent turn identity", () => {
  const s = createInitialState();
  Object.assign(s.combat, {
    active: true,
    order: ["goblin-2", "livia", "goblin-1"],
    turn: 1,
    encounterId: "e",
  });
  const attempt = beginAttempt(
    s,
    { id: "dodge", actorId: "livia", actionId: "dodge", selection: {}, mode: "digital" },
    "player",
  );
  assert.equal(attempt.turnKey, "e:1:livia");
  s.combat.order = ["livia", "goblin-1"];
  s.combat.turn = 0;
  assert.equal(c.combatTurnKey(s.combat), attempt.turnKey);
});

// ---------------------------------------------------------------- P3 projection and rules

test("P3 an end term never reveals a hidden source", () => {
  const s = world();
  s.actors.caster.concentration = { id: "hold", name: "Hold Person", active: true };
  c.applyConditionEvent(s, {
    eventId: "held",
    kind: "apply",
    actorId: "hero",
    conditionId: "paralyzed",
    source: SRC,
    owner: "dm",
    sourceVisibility: "private",
    origin: { actorId: "caster" },
    immunityConfirmed: true,
    term: { kind: "concentration", actorId: "caster", concentrationId: "hold" },
  });
  const seen = c.getConditionOverview(s, "hero", "player").instances[0];
  assert.equal(seen.sourceHidden, true);
  assert.equal(seen.origin, null);
  assert.equal(seen.term.actorId, undefined);
  assert.doesNotMatch(JSON.stringify(seen.term.label), /Caster/);
  const dm = c.getConditionOverview(s, "hero", "dm").instances[0];
  assert.equal(dm.term.actorId, "caster");
});

test("P3 a natural 20 regains 1 HP even when maximum HP is unrecorded", () => {
  const s = world(),
    hero = s.actors.hero;
  damage(s, "hero", 6);
  hero.maxHp = null;
  const d = c.describeDeathSave(s, "hero", { triggerId: "q", outsideInitiative: true }, "player");
  const r = c.applyVitalityRoll(s, { eventId: "n20", descriptor: d, values: [20] }, "player");
  assert.equal(r.outcome.result, "regain-hp");
  assert.equal(hero.hp, 1);
  assert.deepEqual(hero.deathSaves, { successes: 0, failures: 0, stable: false, recovery: null });
  assert.equal(c.getConditionOverview(s, "hero", "player").vitality, "conscious");
  assert.ok(r.outcome.rows.some((row) => row.field === "hp" && row.after === 1));
});

test("P3 a correction cannot leave three death-save failures or successes without their outcome", () => {
  const s = world();
  damage(s, "hero", 6);
  const correct = (patch) =>
    c.previewVitalityChange(
      s,
      "hero",
      { kind: "correct", patch, reason: "Fix", source: SRC },
      "player",
    );
  assert.equal(correct({ failures: 3 }).errors[0].code, "death-count");
  assert.equal(correct({ successes: 3 }).errors[0].code, "stable-count");
  assert.equal(correct({ failures: 3, dead: true }).canApply, true);
  assert.equal(correct({ failures: 2 }).canApply, true);
});

test("P3 Petrified suppresses an existing Poisoned instead of stacking its penalties", () => {
  const a = creature("stone", { conditions: ["poisoned", "petrified"] });
  const m = c.getConditionMechanics(a);
  assert.deepEqual(
    m.checkDisadvantage.map((r) => r.conditionId),
    [],
  );
  assert.ok(!m.attackDisadvantage.some((r) => r.conditionId === "poisoned"));
  assert.equal(c.hasCondition(a, "poisoned"), false);
  assert.equal(a.conditions.includes("poisoned"), true, "the record stays");
});

test("P3 initiative effects the app does not apply are declared manual in the catalog", () => {
  const rows = c.listConditionDefinitions();
  const codes = (id, list) => rows.find((r) => r.id === id)[list].map((e) => e.code);
  assert.ok(codes("incapacitated", "manual").includes("initiative-disadvantage"));
  assert.ok(!codes("incapacitated", "supported").includes("initiative-disadvantage"));
  assert.ok(codes("invisible", "manual").includes("initiative-advantage"));
  assert.ok(codes("exhaustion", "manual").includes("exhaustion-initiative"));
});

test("P3 known held items fall to the ground and stop being usable", () => {
  const s = createInitialState();
  const livia = s.actors.livia;
  livia.heldItemIds = ["staff"];
  c.applyVitalityEvent(s, {
    eventId: "drop",
    actorId: "livia",
    kind: "damage",
    amount: 20,
    source: SRC,
  });
  assert.equal(c.hasCondition(livia, "unconscious"), true);
  const staff = livia.inventory.find((i) => i.id === "staff");
  assert.equal(staff.location, "ground");
  assert.equal(staff.equipped, false);
  assert.deepEqual(livia.heldItemIds, []);
});

test("P3 the demo does not claim to know what a creature with items holds", () => {
  const s = createInitialState();
  assert.equal(s.actors.livia.heldItemIds, null, "unknown until a weapon is used");
  assert.deepEqual(s.actors["goblin-1"].heldItemIds, [], "no inventory: nothing to drop");
});

test("P3 a quarterstaff attack records the weapon as held", () => {
  const s = createInitialState();
  const scene = s.scenes.find((x) => x.id === s.activeSceneId);
  Object.assign(
    scene.tokens.find((t) => t.actorId === "goblin-1"),
    { x: 285, y: 380 },
  );
  Object.assign(s.combat, { active: true, order: ["livia", "goblin-1"], turn: 0 });
  beginAttempt(
    s,
    {
      id: "staff-hit",
      actorId: "livia",
      actionId: "quarterstaff",
      selection: { targetIds: ["goblin-1"] },
      mode: "physical",
    },
    "player",
  );
  assert.deepEqual(s.actors.livia.heldItemIds, ["staff"]);
});

test("P3 a private application applies everywhere with an anonymous reason for other viewers", () => {
  const s = world();
  c.applyConditionEvent(s, {
    eventId: "secret-poison",
    kind: "apply",
    actorId: "hero",
    conditionId: "poisoned",
    source: SRC,
    owner: "dm",
    visibility: "private",
    immunityConfirmed: true,
  });
  const player = c.getConditionOverview(s, "hero", "player");
  assert.equal(player.instances.length, 0, "the application itself stays private");
  assert.equal(player.mechanics.attackDisadvantage.length, 1, "its rule still applies");
  assert.equal(player.mechanics.attackDisadvantage[0].conditionId, null);
  assert.equal(player.mechanics.attackDisadvantage[0].name.en, "Private effect");
  assert.ok(!player.mechanics.conditionIds.includes("poisoned"));
  const rules = c.conditionAttackRules(s.actors.hero, s.actors.ally, { distanceMeters: 1.5 });
  assert.equal(rules.mode, "disadvantage");
  const projected = c.projectConditionReasons(rules, { attacker: s.actors.hero }, "player");
  assert.deepEqual(
    projected.disadvantage.map((r) => [r.conditionId, r.name.en]),
    [[null, "Private effect"]],
  );
  const dm = c.projectConditionReasons(rules, { attacker: s.actors.hero }, "dm");
  assert.equal(dm.disadvantage[0].conditionId, "poisoned");
  assert.equal(c.getConditionOverview(s, "hero", "dm").mechanics.conditionIds[0], "poisoned");
});

// ---------------------------------------------------------------- P3 preview rows and names

test("P3 the apply preview shows the chosen end, and a declared origin cites no SRD page", () => {
  const s = world();
  Object.assign(s.combat, { active: true, order: ["hero", "ally"], turn: 0 });
  const p = c.previewConditionChange(
    s,
    "hero",
    {
      kind: "apply",
      conditionId: "poisoned",
      source: c.listConditionDefinitions({ query: "poisoned" })[0].source,
      origin: { label: "Poisoned blade" },
      term: { kind: "turn", actorId: "hero", phase: "end", when: "next" },
      mode: "record",
    },
    "player",
  );
  const origin = p.rows.find((r) => r.field === "origin");
  assert.equal(origin.after, "Poisoned blade");
  assert.equal(origin.source, null);
  const term = p.rows.find((r) => r.field === "term");
  assert.ok(term, "a term row");
  assert.deepEqual(
    { kind: term.after.kind, actorId: term.after.actorId, when: term.after.when },
    { kind: "turn", actorId: "hero", when: "next" },
  );
});

test("P3 a player can name a visible hostile token as cause or turn, with its name only", () => {
  const s = createInitialState();
  Object.assign(s.combat, { active: true, order: ["livia", "goblin-1"], turn: 0 });
  const o = c.getConditionOverview(s, "livia", "player");
  const row = o.choices.actors.find((a) => a.id === "goblin-1");
  assert.deepEqual(row, { id: "goblin-1", name: "Sentinella", observable: true });
  const selection = {
    kind: "apply",
    conditionId: "frightened",
    source: SRC,
    origin: { actorId: "goblin-1" },
    term: { kind: "turn", actorId: "goblin-1", phase: "end", when: "next" },
    mode: "record",
  };
  const p = c.previewConditionChange(s, "livia", selection, "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  c.applyConditionChange(s, "livia", selection, "player", {
    operationId: "fear",
    reviewKey: p.reviewKey,
  });
  const inst = c.getConditionOverview(s, "livia", "player").instances[0];
  assert.equal(inst.origin.actorId, "goblin-1");
  assert.match(inst.term.label.it, /Sentinella/);
  assert.throws(() => c.getConditionOverview(s, "goblin-1", "player"), "no sheet access");
  const hidden = s.scenes.find((x) => x.id === s.activeSceneId).tokens;
  hidden.find((t) => t.actorId === "goblin-2").hidden = true;
  assert.ok(
    !c.getConditionOverview(s, "livia", "player").choices.actors.some((a) => a.id === "goblin-2"),
    "a hidden token is not offered",
  );
});

// ---------------------------------------------------------------- P2 temporary HP

test("P2 temporary HP have their own command: they do not stack and never heal", () => {
  const s = world(),
    hero = s.actors.hero;
  const grant = (amount, choice) =>
    c.previewVitalityChange(
      s,
      "hero",
      { kind: "temp-hp", amount, reason: "False Life", source: SRC, ...(choice ? { choice } : {}) },
      "player",
    );
  let p = grant(5);
  assert.equal(p.canApply, true);
  assert.deepEqual(
    p.rows.map((r) => [r.field, r.before, r.after]),
    [["tempHp", 0, 5]],
  );
  assert.equal(p.rows[0].source.pages[0], 18);
  vital(s, "hero", { kind: "temp-hp", amount: 5, reason: "False Life", source: SRC });
  assert.equal(hero.tempHp, 5);
  assert.equal(hero.hp, 6, "not healing");
  p = grant(8);
  assert.equal(p.errors[0].code, "temp-hp-choice");
  assert.equal(grant(8, "keep").errors[0].code, "temp-hp-keep");
  const r = vital(s, "hero", {
    kind: "temp-hp",
    amount: 8,
    choice: "replace",
    reason: "Heroism",
    source: SRC,
  });
  assert.equal(r.kind, "temp-hp");
  assert.equal(hero.tempHp, 8, "8, not 13");
  damage(s, "hero", 20);
  assert.equal(hero.hp, 0);
  const atZero = grant(4);
  assert.ok(atZero.warnings.some((w) => w.code === "temp-hp-zero"));
  vital(s, "hero", { kind: "temp-hp", amount: 4, reason: "Aid", source: SRC });
  assert.equal(c.getConditionOverview(s, "hero", "player").vitality, "dying");
});

test("P3 an invalid preview keeps its before/after rows while Apply stays disabled", () => {
  const s = world();
  const p = c.previewVitalityChange(
    s,
    "hero",
    { kind: "damage", amount: 30, reason: "", source: SRC },
    "player",
  );
  assert.equal(p.canApply, false);
  assert.equal(p.errors[0].code, "reason");
  assert.ok(p.rows.some((r) => r.field === "hp" && r.after === 0));
  assert.ok(p.breakdown);
});

// ---------------------------------------------------------------- P2 HP writers

test("P2 lowering maximum HP never silently drops a creature to 0 HP", () => {
  const s = createInitialState(),
    livia = s.actors.livia;
  livia.hp = 5;
  livia.concentration = { id: "c", name: "Shield", active: true };
  const patch = {
    name: "Livia",
    className: livia.className,
    level: 3,
    maxHp: 10,
    ac: livia.ac,
    speed: livia.speed,
    abilities: { ...livia.abilities },
  };
  patchCharacter(livia, patch);
  assert.equal(livia.maxHp, 10);
  assert.equal(livia.hp, 1, "a sheet correction clamps at 1 HP; 0 HP goes through the panel");
  assert.equal(livia.concentration.active, true);
});

// ---------------------------------------------------------------- combat rules and audience

function table({ goblinAt } = {}) {
  const s = createInitialState();
  const scene = s.scenes.find((x) => x.id === s.activeSceneId);
  if (goblinAt)
    Object.assign(
      scene.tokens.find((t) => t.actorId === "goblin-1"),
      goblinAt,
    );
  Object.assign(s.combat, { active: true, order: ["livia", "goblin-1", "goblin-2"], turn: 0 });
  return s;
}
const prone = (s, id) =>
  c.applyConditionEvent(s, {
    eventId: op("prone"),
    kind: "apply",
    actorId: id,
    conditionId: "prone",
    source: SRC,
    immunityConfirmed: true,
  });

test("P2 a ranged attack next to a seeing foe has Disadvantage, cancelling Prone's Advantage, and says why", () => {
  const s = table({ goblinAt: { x: 285, y: 380 } });
  prone(s, "goblin-1");
  const p = previewAction(s, "livia", "fire-bolt", { targetIds: ["goblin-1"] }, "player");
  assert.equal(p.available, true, JSON.stringify(p.reasons));
  assert.equal(p.rollMode, "normal", "Advantage and Disadvantage cancel");
  assert.deepEqual(
    p.conditionRules.advantage.map((r) => r.conditionId),
    ["prone"],
  );
  const close = p.rollReasons.find((r) => r.code === "close-combat");
  assert.equal(close.mode, "disadvantage");
  assert.deepEqual([close.source.en.pages, close.source.it.pages], [[15], [17]]);
  const attempt = beginAttempt(
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
  assert.equal(attempt.requests[0].rollMode, "normal");
  assert.deepEqual(attempt.requests[0].dice, [{ count: 1, sides: 20 }]);
  assert.ok(attempt.requests[0].rollReasons.some((r) => r.code === "close-combat"));
  // Far away, the same attack keeps Prone's Disadvantage only.
  const far = table();
  prone(far, "goblin-1");
  const distant = previewAction(far, "livia", "fire-bolt", { targetIds: ["goblin-1"] }, "player");
  assert.equal(distant.rollMode, "disadvantage");
  assert.ok(!distant.rollReasons.some((r) => r.code === "close-combat"));
});

test("P2 Frightened imposes Disadvantage while its known source is in line of sight", () => {
  const s = table();
  c.applyConditionEvent(s, {
    eventId: "fear",
    kind: "apply",
    actorId: "livia",
    conditionId: "frightened",
    source: SRC,
    origin: { actorId: "goblin-1" },
    immunityConfirmed: true,
  });
  const p = previewAction(s, "livia", "fire-bolt", { targetIds: ["goblin-2"] }, "player");
  assert.equal(p.rollMode, "disadvantage");
  assert.ok(p.conditionRules.disadvantage.some((r) => r.conditionId === "frightened"));
  assert.deepEqual(p.conditionRules.unresolved, []);
  // Unknown source: the roll waits for an explicit answer instead of rolling normal.
  const u = table();
  c.applyConditionEvent(u, {
    eventId: "fear-unknown",
    kind: "apply",
    actorId: "livia",
    conditionId: "frightened",
    source: SRC,
    immunityConfirmed: true,
  });
  const ask = previewAction(u, "livia", "fire-bolt", { targetIds: ["goblin-2"] }, "player");
  assert.equal(ask.available, false);
  assert.ok(ask.reasons.some((r) => r.code === "condition-fact"));
  assert.deepEqual(
    ask.conditionFacts.map((f) => f.code),
    ["source-sight"],
  );
  const yes = previewAction(
    u,
    "livia",
    "fire-bolt",
    { targetIds: ["goblin-2"], conditionFacts: { "source-sight": true } },
    "player",
  );
  assert.equal(yes.available, true);
  assert.equal(yes.rollMode, "disadvantage");
  const no = previewAction(
    u,
    "livia",
    "fire-bolt",
    { targetIds: ["goblin-2"], conditionFacts: { "source-sight": false } },
    "player",
  );
  assert.equal(no.rollMode, "normal");
  const attempt = beginAttempt(
    u,
    {
      id: "scared-bolt",
      actorId: "livia",
      actionId: "fire-bolt",
      selection: { targetIds: ["goblin-2"], conditionFacts: { "source-sight": true } },
      mode: "physical",
    },
    "player",
  );
  assert.equal(attempt.requests[0].rollMode, "disadvantage");
  assert.deepEqual(attempt.selection.conditionFacts, { "source-sight": true });
});

test("P3 each Magic Missile dart at 0 HP is its own damage instance, like its Concentration saves", () => {
  const s = table({ goblinAt: { x: 400, y: 380 } });
  const goblin = s.actors["goblin-1"];
  goblin.vitalityPolicy = { zeroHp: "death-saves", source: SRC };
  goblin.hp = 0;
  goblin.maxHp = 20;
  goblin.deathSaves = { successes: 0, failures: 0, stable: false, recovery: null };
  const attempt = beginAttempt(
    s,
    {
      id: "missiles",
      actorId: "livia",
      actionId: "magic-missile",
      selection: {
        allocations: [
          { actorId: "goblin-1", count: 2 },
          { actorId: "goblin-2", count: 1 },
        ],
      },
      mode: "physical",
    },
    "player",
  );
  resolveRoll(s, attempt.id, attempt.requests[0].id, [1, 1, 1], "player");
  assert.equal(goblin.deathSaves.failures, 2, "two darts, two failures");
  const outcome = attempt.outcomes.find((o) => o.actorId === "goblin-1");
  assert.equal(outcome.deathSaveFailures, 2);
  assert.equal(outcome.damage, 4);
  assert.equal(
    s.conditionEvents.filter((e) => e.id.startsWith("missiles:vitality:goblin-1:dart-")).length,
    2,
  );
});

test("P3 the Wolf Bite Prone keeps its private source readable to the wolf's controller", () => {
  const s = table({ goblinAt: { x: 285, y: 380 } });
  s.actors["goblin-1"].combatProfile = {
    team: "watch",
    meleeAttack: {
      name: { it: "Morso", en: "Bite" },
      reachMeters: 1.5,
      attackBonus: 4,
      damageDice: [{ count: 1, sides: 6 }],
      damageModifier: 2,
      damageType: "piercing",
      onHitProneMaxSize: "medium",
      source: SRC,
    },
  };
  s.scenes
    .find((x) => x.id === s.activeSceneId)
    .tokens.find((t) => t.actorId === "goblin-1").hidden = true;
  s.combat.turn = 1;
  s.actors.livia.reaction = false;
  const attempt = beginAttempt(
    s,
    {
      id: "bite",
      actorId: "goblin-1",
      actionId: "melee-attack",
      selection: { targetIds: ["livia"] },
      mode: "physical",
    },
    "dm",
  );
  const faces = (request, face) => request.dice.flatMap((g) => Array(g.count).fill(face));
  resolveRoll(s, attempt.id, attempt.requests[0].id, faces(attempt.requests[0], 15), "dm");
  const bite = attempt.requests.find((r) => r.kind === "damage");
  resolveRoll(s, attempt.id, bite.id, faces(bite, 1), "dm");
  const inst = s.actors.livia.conditions.find((i) => i.id === "prone");
  assert.equal(inst.owner, "dm");
  assert.equal(inst.sourceVisibility, "private");
  const dm = c.getConditionOverview(s, "livia", "dm").instances.find((i) => i.id === "prone");
  assert.equal(dm.sourceHidden, false);
  const player = c
    .getConditionOverview(s, "livia", "player")
    .instances.find((i) => i.id === "prone");
  assert.equal(player.sourceHidden, true);
});

test("P3 vitals have one audience: sheet readers see HP and death-save results, others none", () => {
  const s = table();
  const goblin = s.actors["goblin-1"];
  goblin.vitalityPolicy = { zeroHp: "death-saves", source: SRC };
  goblin.deathSaves = { successes: 0, failures: 0, stable: false, recovery: null };
  c.applyVitalityEvent(s, {
    eventId: "down",
    actorId: "goblin-1",
    kind: "damage",
    amount: goblin.hp,
    source: SRC,
  });
  s.combat.turn = 0;
  advanceTurn(s);
  const save = s.combatAttempts.find((a) => a.kind === "vitality");
  resolveRoll(s, save.id, save.requests[0].id, [7], "dm");
  const seen = (role) => projectAttempts(s, role).find((a) => a.id === save.id)?.outcomes[0];
  assert.equal(seen("dm").vitality.natural, 7);
  const player = seen("player");
  assert.ok(player, "the token is visible, so the attempt is");
  assert.equal(player.vitality, undefined, "a player cannot read the NPC's vitals");
  // Livia's own vital roll is readable by every campaign member who reads her sheet.
  const t = table();
  c.applyVitalityEvent(t, {
    eventId: "down-l",
    actorId: "livia",
    kind: "damage",
    amount: 18,
    source: SRC,
  });
  t.combat.turn = 2;
  advanceTurn(t);
  const own = t.combatAttempts.find((a) => a.kind === "vitality");
  resolveRoll(t, own.id, own.requests[0].id, [12], "player");
  assert.equal(
    projectAttempts(t, "dm").find((a) => a.id === own.id).outcomes[0].vitality.natural,
    12,
  );
});

test("P3 a Medicine request says the action is spent only when it was spent in initiative", async () => {
  const { beginVitalityRoll } = await import("../combat.mjs");
  const outside = createInitialState();
  outside.actors.livia.hp = 0;
  c.applyVitalityEvent(outside, {
    eventId: "d0",
    actorId: "livia",
    kind: "damage",
    amount: 1,
    source: SRC,
  });
  outside.actors.livia.hp = 0;
  const helper = "mira";
  const preview = c.previewAid(
    outside,
    { actorId: helper, targetId: "livia", kind: "stabilize" },
    "player",
  );
  const started = beginVitalityRoll(
    outside,
    {
      kind: "medicine",
      actorId: helper,
      targetId: "livia",
      aidKind: "stabilize",
      reviewKey: preview.reviewKey,
    },
    "player",
  );
  const request = outside.combatAttempts.find((a) => a.id === started.attemptId).requests[0];
  assert.equal(request.actionSpent, false);
  assert.equal(outside.actors.mira.action, true);
});

test("P2 an attempt withdrawn by Undo keeps its faces: an identical retry reuses them, never rerolls", async () => {
  const { createStore } = await import("../state.mjs");
  const store = createStore();
  store.commit(
    "setup",
    (s) => Object.assign(s.combat, { active: true, order: ["livia", "goblin-1"], turn: 0 }),
    "dm",
  );
  const attempt = (id) => (s) =>
    beginAttempt(
      s,
      {
        id,
        actorId: "livia",
        actionId: "fire-bolt",
        selection: { targetIds: ["goblin-1"] },
        mode: "digital",
      },
      "player",
    );
  const dice = (faces) => (sides) => faces.shift() ?? sides;
  store.commit("attempt", attempt("first"), "player");
  store.commit("dice", (s) => resolveAutomaticRolls(s, dice([18, 6])), "player");
  const first = store.state.combatAttempts.find((a) => a.id === "first");
  assert.deepEqual(
    first.requests.map((r) => r.values),
    [[18], [6]],
  );
  store.undo("player");
  const kept = store.state.combatAttempts.find((a) => a.id === "first");
  assert.ok(kept, "one Undo withdraws the dice, not the attempt");
  assert.equal(store.state.actors.livia.action, false, "the attempt stays spent");
  assert.deepEqual(kept.requests[0].acceptedValues, [18]);
  store.undo("player");
  assert.equal(
    (store.state.combatAttempts ?? []).some((a) => a.id === "first"),
    false,
  );
  assert.equal(store.state.actors.livia.action, true);
  store.commit("retry", attempt("second"), "player");
  const retry = store.state.combatAttempts.find((a) => a.id === "second");
  assert.deepEqual(retry.requests[0].acceptedValues, [18]);
  assert.ok(retry.requests[0].reusedFrom.startsWith("first-attack"));
  store.commit("dice", (s) => resolveAutomaticRolls(s, dice([2, 1])), "player");
  const done = store.state.combatAttempts.find((a) => a.id === "second");
  assert.deepEqual(
    done.requests.map((r) => r.values),
    [[18], [6]],
    "the same faces, no reroll",
  );
  const reused = store.state.log
    .flatMap((e) => e.rolls ?? [])
    .filter((r) => r.attemptId === "second");
  assert.deepEqual(
    reused.map((r) => [r.kind, r.status, r.values]),
    [
      ["attack", "reused", [18]],
      ["damage", "reused", [6]],
    ],
    "the history records the reused faces once each",
  );
  // A different target is a different attempt: new dice.
  store.undo("player");
  store.undo("player");
  store.commit(
    "other target",
    (s) =>
      beginAttempt(
        s,
        {
          id: "third",
          actorId: "livia",
          actionId: "fire-bolt",
          selection: { targetIds: ["goblin-2"] },
          mode: "digital",
        },
        "player",
      ),
    "player",
  );
  assert.equal(
    store.state.combatAttempts.find((a) => a.id === "third").requests[0].acceptedValues,
    undefined,
  );
});

// ---------------------------------------------------------------- Table and sheet UI

async function tableContext(state, role = "player", view = { page: "table" }) {
  const { canControlActor } = await import("../character-access.mjs");
  const { getEffectiveActor } = await import("../forms-companions.mjs");
  const { projectVitalityRolls, hasBlockingConsequences } = await import("../combat.mjs");
  const { esc, icon } = await import("../ui.mjs");
  return {
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
  };
}

test("P3 the Table puts vital status first, shows Italian decimals and disables an impossible Stand up with its reason", async () => {
  const { renderTable, resetTableView } = await import("../table.mjs");
  const s = createInitialState();
  c.applyVitalityEvent(s, {
    eventId: "down",
    actorId: "livia",
    kind: "damage",
    amount: 18,
    source: SRC,
  });
  resetTableView();
  const html = renderTable(await tableContext(s));
  assert.match(html, /Scala: 1,5 m \/ casella/);
  const vital = html.indexOf('data-conditions-summary="livia"');
  const forms = html.indexOf("forms-summary");
  assert.ok(vital >= 0);
  if (forms >= 0) assert.ok(vital < forms, "vital status before linked forms");
  assert.match(html, /data-table="stand" disabled aria-describedby="stand-why"/);
  assert.match(html, /id="stand-why">Velocità 0: non può rialzarsi\./);
});

test("P2 the sheet has one HP entry that opens the panel, and says when conditions change the speed", async () => {
  const { renderCharacters } = await import("../characters.mjs");
  const s = createInitialState();
  c.applyVitalityEvent(s, {
    eventId: "down",
    actorId: "livia",
    kind: "damage",
    amount: 18,
    source: SRC,
  });
  const html = renderCharacters(
    await tableContext(s, "player", { page: "characters", id: "livia" }),
  );
  assert.equal([...html.matchAll(/data-conditions-entry="livia"/g)].length, 1);
  assert.doesNotMatch(html, /data-character-action="hp"/);
  assert.doesNotMatch(html, /conditions-summary-hp/, "no repeated HP line");
  assert.match(html, /Danni, cure e condizioni/);
  assert.match(html, /ora 0 m per condizioni/);
});

test("P3 dropped items show on the ground and can be recorded as picked up", async () => {
  const { renderCharacters } = await import("../characters.mjs");
  const s = createInitialState();
  s.actors.livia.inventory.find((i) => i.id === "staff").location = "ground";
  const html = renderCharacters(
    await tableContext(s, "player", { page: "characters", id: "livia", tab: "inventory" }),
  );
  assert.match(html, /A terra/);
  assert.match(html, /data-character-action="pickup-item"/);
});

test("P3 path segments distinguish crawling (×2) from crawling on difficult terrain (×3)", async () => {
  const { renderMovementPath } = await import("../path-ui.mjs");
  const at = (x) => ({ x, y: 0 });
  const html = renderMovementPath({
    blocked: false,
    end: at(30),
    segments: [
      { from: at(0), to: at(10), reachable: true, multiplier: 1 },
      { from: at(10), to: at(20), reachable: true, multiplier: 2 },
      { from: at(20), to: at(30), reachable: true, multiplier: 3 },
    ],
  });
  assert.deepEqual(
    [...html.matchAll(/data-path-cost="(x\d)"/g)].map((m) => m[1]),
    ["x1", "x2", "x3"],
  );
});

test("P3 a shared application with a private origin keeps a shared log line that names no cause", () => {
  const s = world();
  const select = (extra) => ({
    kind: "apply",
    conditionId: "frightened",
    source: SRC,
    origin: { label: "DM-SECRET" },
    term: { kind: "manual" },
    mode: "record",
    ...extra,
  });
  const origin = c.previewConditionChange(s, "hero", select({ sourceVisibility: "private" }), "dm");
  assert.deepEqual(origin.commit, { local: false, visibility: "shared" });
  const whole = c.previewConditionChange(s, "hero", select({ visibility: "private" }), "dm");
  assert.deepEqual(whole.commit, { local: false, visibility: "private" });
  c.applyConditionChange(s, "hero", select({ sourceVisibility: "private" }), "dm", {
    operationId: "fear-log",
    reviewKey: origin.reviewKey,
  });
  const history = c.getConditionHistory(s, "hero", "player");
  assert.equal(history.length, 1, "the table sees that a condition was applied");
  assert.doesNotMatch(JSON.stringify(history), /DM-SECRET/);
  assert.equal(history[0].reason, null);
});
