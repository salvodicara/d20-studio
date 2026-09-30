import test from "node:test";
import assert from "node:assert/strict";
const r = await import("../rest-time.mjs").catch(() => ({}));
const api = () => assert.equal(typeof r.previewRest, "function", "rest domain is implemented");
const source = { kind: "authored", revision: "test-1", title: "Explicit synthetic recovery" };
function state() {
  const actor = (id, owner = "player") => ({
    id,
    name: id,
    kind: "character",
    owner,
    visibility: "shared",
    campaignIds: ["camp"],
    hp: 5,
    maxHp: 20,
    tempHp: 4,
    exhaustion: 2,
    abilities: { con: 14 },
    hitDice: { d8: { max: 3, used: 0 } },
    spellSlots: { 1: { max: 4, used: 2 } },
    slots: { max: 4, used: 2 },
    pactSlots: { level: 2, max: 2, used: 1 },
    features: [{ id: "wind", resourceId: "wind-pool", max: 3, used: 2 }],
    inventory: [{ id: "potion", quantity: 2 }],
    notes: "unchanged",
    restProfile: {
      source,
      recoveries: [
        {
          id: "pact-short",
          target: { kind: "pactSlots" },
          trigger: "short",
          operation: "all",
          source,
        },
        {
          id: "pact-long",
          target: { kind: "pactSlots" },
          trigger: "long",
          operation: "all",
          source,
        },
        {
          id: "wind-short",
          target: { kind: "feature", id: "wind", resourceId: "wind-pool" },
          trigger: "short",
          operation: "reduce-used",
          amount: 1,
          source,
        },
        {
          id: "wind-long",
          target: { kind: "feature", id: "wind", resourceId: "wind-pool" },
          trigger: "long",
          operation: "all",
          source,
        },
        {
          id: "slots-long",
          target: { kind: "spellSlots" },
          trigger: "long",
          operation: "all",
          source,
        },
      ],
      arcaneRecovery: { wizardLevel: 3, used: 0, source },
    },
  });
  return {
    campaign: {
      id: "camp",
      members: [
        { id: "dm", role: "dm" },
        { id: "player", role: "player" },
        { id: "other", role: "player" },
      ],
    },
    actors: {
      hero: actor("hero"),
      other: actor("other", "other"),
      private: { ...actor("private"), visibility: "private", campaignIds: [] },
    },
    combat: { active: false, order: [], turn: 0 },
    combatAttempts: [],
    combatReactions: [],
    movements: [],
    log: [],
  };
}
function start(s, kind = "short", opts = {}) {
  api();
  const input = { id: "rest", kind, actorIds: ["hero"], campaignId: "camp", ...opts };
  const p = r.previewRest(s, input, "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  return r.startRest(s, input, "player", { reviewKey: p.reviewKey });
}
function advance(s, seconds, id = "time") {
  const input = { id, campaignId: "camp", seconds };
  const p = r.previewTimeAdvance(s, input, "dm");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  return r.advanceGameTime(s, input, "dm", { reviewKey: p.reviewKey });
}
function complete(s, input = {}) {
  const args = { id: "complete", actorIds: ["hero"], ...input };
  const p = r.previewRestCompletion(s, "rest", args, "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  return r.completeRest(s, "rest", args, "player", { reviewKey: p.reviewKey });
}
function short(s) {
  start(s);
  advance(s, 3600);
  complete(s);
  return r.getRest(s, "rest", "player").participants[0].benefits[0].id;
}

test("partial shared rest advances one clock and leaves nonparticipants unchanged", () => {
  const s = state(),
    other = structuredClone(s.actors.other);
  start(s);
  assert.equal(s.actors.hero.hp, 5);
  advance(s, 1800, "a");
  assert.equal(r.previewRestCompletion(s, "rest", {}, "player").canApply, false);
  advance(s, 1800, "b");
  complete(s);
  assert.equal(r.getGameTime(s, "camp", "player").seconds, 3600);
  assert.deepEqual(s.actors.other, other);
  assert.equal(s.actors.hero.pactSlots.used, 0);
  assert.equal(s.actors.hero.features[0].used, 1);
  assert.equal(s.actors.hero.spellSlots[1].used, 2);
  assert.equal(s.actors.hero.hp, 5);
});
test("rest eligibility, private authority, membership and offline rules are explicit", () => {
  api();
  const s = state();
  const input = { id: "x", kind: "short", actorIds: ["hero"], campaignId: "camp" };
  s.actors.hero.hp = 0;
  assert.equal(r.previewRest(s, input, "player").canApply, false);
  s.actors.hero.hp = 5;
  assert.throws(() => r.startRest(s, input, "other"));
  assert.throws(() => r.startRest(s, input, "player", { online: false }));
  assert.throws(() => r.startRest(s, { ...input, actorIds: ["private"], campaignId: null }, "dm"));
  r.startRest(s, { ...input, actorIds: ["private"], campaignId: null }, "player", {
    online: false,
  });
  assert.equal(r.listRests(s, "dm").length, 0);
  assert.equal(r.getRest(s, "x", "player").commit.local, true);
});
test("physical HD consumes once, survives JSON, validates natural face and resolves once", () => {
  let s = state();
  const benefitId = short(s);
  const args = { id: "die", actorId: "hero", benefitId, die: "d8", mode: "physical" };
  r.beginHitDie(s, "rest", args, "player");
  r.beginHitDie(s, "rest", args, "player");
  assert.equal(s.actors.hero.hitDice.d8.used, 1);
  assert.equal(s.actors.hero.hp, 5);
  s = JSON.parse(JSON.stringify(s));
  assert.throws(() => r.resolveHitDie(s, "die", { face: 9 }, "player"));
  r.resolveHitDie(s, "die", { face: 3 }, "player");
  r.resolveHitDie(s, "die", { face: 3 }, "player");
  assert.equal(s.actors.hero.hp, 10);
  assert.equal(r.getRestRolls(s, "player")[0].acceptedFace, 3);
  assert.throws(() => r.resolveHitDie(s, "die", { face: 4 }, "player"));
});
test("a Hit Die spent by a knocked-out creature ends the knockout through the domain; Prone remains", async () => {
  const c = await import("../conditions.mjs");
  const { applyConditionFollowUps } = await import("../combat.mjs");
  const s = state(),
    benefitId = short(s);
  r.beginHitDie(
    s,
    "rest",
    { id: "die", actorId: "hero", benefitId, die: "d8", mode: "physical" },
    "player",
  );
  // A melee knockout lands while the die is still being rolled (SRD EN 17 / IT 19).
  const hit = c.applyVitalityEvent(s, {
    eventId: "club",
    actorId: "hero",
    kind: "damage",
    amount: 9,
    knockout: { melee: true },
    source,
  });
  applyConditionFollowUps(s, hit);
  assert.equal(s.actors.hero.hp, 1);
  assert.equal(c.getConditionOverview(s, "hero", "player").vitality, "knocked-out");
  const result = r.resolveHitDie(s, "die", { face: 4 }, "player");
  assert.deepEqual([result.before, result.after, s.actors.hero.hp], [1, 7, 7]);
  // Regaining any HP ends the knockout's Unconscious; the Prone it caused remains.
  assert.equal(c.hasCondition(s.actors.hero, "unconscious"), false);
  assert.equal(c.hasCondition(s.actors.hero, "prone"), true);
  assert.equal(c.getConditionOverview(s, "hero", "player").vitality, "conscious");
  const healing = s.conditionEvents.find((e) => e.id === "die:healing");
  assert.equal(healing.kind, "healing");
  // Retrying the resolved roll changes nothing and records nothing new.
  const events = s.conditionEvents.length;
  r.resolveHitDie(s, "die", { face: 4 }, "player");
  assert.deepEqual([s.actors.hero.hp, s.conditionEvents.length], [7, events]);
});
test("undo-restored pending roll keeps accepted face and cannot reroll or apply a reversed result", () => {
  const s = state(),
    benefitId = short(s);
  r.beginHitDie(
    s,
    "rest",
    { id: "die", actorId: "hero", benefitId, die: "d8", mode: "digital" },
    "player",
  );
  const pending = structuredClone(s);
  r.resolveHitDie(s, "die", { face: 5 }, "player");
  pending.restTime.rolls[0].acceptedFace = 5;
  assert.throws(() => r.resolveHitDie(pending, "die", { face: 6 }, "player"));
  r.resolveHitDie(pending, "die", {}, "player");
  assert.equal(pending.actors.hero.hp, 12);
  pending.restTime.rolls[0].status = "reversed";
  assert.throws(() => r.resolveHitDie(pending, "die", { face: 5 }, "player"));
});
test("minimum healing and overflow remain separate from natural die and CON", () => {
  const s = state();
  s.actors.hero.abilities.con = 2;
  const benefitId = short(s);
  r.beginHitDie(
    s,
    "rest",
    { id: "die", actorId: "hero", benefitId, die: "d8", mode: "physical" },
    "player",
  );
  const result = r.resolveHitDie(s, "die", { face: 1 }, "player");
  assert.equal(result.healing, 1);
  assert.equal(s.actors.hero.hp, 6);
  s.actors.hero.abilities.con = 14;
  s.actors.hero.hp = 19;
  r.beginHitDie(
    s,
    "rest",
    { id: "die2", actorId: "hero", benefitId, die: "d8", mode: "physical" },
    "player",
  );
  const second = r.resolveHitDie(s, "die2", { face: 8 }, "player");
  assert.equal(second.applied, 1);
  assert.equal(second.overflow, 9);
});
test("quick recovery respects explicit cap, order and mean stop without generating dice", () => {
  const s = state(),
    benefitId = short(s);
  let input = { actorId: "hero", benefitId, diceOrder: ["d8"], maxDice: 1 };
  let p = r.previewQuickRecovery(s, "rest", input, "player");
  assert.equal(p.nextDie, "d8");
  r.beginHitDie(
    s,
    "rest",
    { id: "die", actorId: "hero", benefitId, die: "d8", mode: "digital" },
    "player",
  );
  r.resolveHitDie(s, "die", { face: 2 }, "player");
  p = r.previewQuickRecovery(s, "rest", input, "player");
  assert.equal(p.nextDie, null);
  assert.equal(p.stopReason, "cap");
  s.actors.hero.hp = 17;
  p = r.previewQuickRecovery(s, "rest", { ...input, maxDice: 3 }, "player");
  assert.equal(p.stopReason, "below-average");
  assert.equal(s.restTime.rolls.length, 1);
});
test("long sleep and light activity complete 2024 recoveries once, all hit dice not half", () => {
  const s = state();
  s.actors.hero.hitDice.d8.used = 3;
  s.actors.hero.concentration = { id: "focus", active: true };
  s.actors.other.combatEffects = [{ concentrationId: "focus" }];
  start(s, "long", { activityByActor: { hero: "sleep" } });
  assert.equal(s.actors.hero.concentration.active, false);
  assert.deepEqual(s.actors.other.combatEffects, []);
  advance(s, 21600, "sleep");
  r.setRestActivity(s, "rest", { actorId: "hero", activity: "light" }, "player");
  advance(s, 7200, "light");
  complete(s);
  r.completeRest(s, "rest", { id: "complete", actorIds: ["hero"] }, "player");
  assert.equal(s.actors.hero.hp, 20);
  // The HP recovery is a recorded healing event of the vitality domain.
  assert.deepEqual(
    s.conditionEvents
      .filter((e) => e.kind === "healing" && e.actorId === "hero")
      .map((e) => [e.id, e.result.breakdown.hpBefore, e.result.breakdown.hpAfter]),
    [["complete:hero:hp", 5, 20]],
  );
  assert.equal(s.actors.hero.tempHp, 0);
  assert.equal(s.actors.hero.hitDice.d8.used, 0);
  assert.equal(s.actors.hero.exhaustion, 1);
  // The Exhaustion recovery is a recorded conditions event, once (review 10).
  const exhaustionEvents = s.conditionEvents.filter(
    (e) => e.kind === "exhaustion" && e.actorId === "hero",
  );
  assert.deepEqual(
    exhaustionEvents.map((e) => e.rows.map((row) => [row.field, row.before, row.after])),
    [[["exhaustion", 2, 1]]],
  );
  assert.equal(s.actors.hero.spellSlots[1].used, 0);
  assert.equal(s.actors.hero.slots, s.actors.hero.spellSlots[1]);
  assert.deepEqual(s.actors.hero.inventory, [{ id: "potion", quantity: 2 }]);
  assert.equal(s.actors.hero.notes, "unchanged");
  assert.equal(
    r.previewRest(
      s,
      { id: "again", kind: "long", actorIds: ["hero"], campaignId: "camp" },
      "player",
    ).canApply,
    false,
  );
  advance(s, 57600, "later");
  assert.equal(
    r.previewRest(
      s,
      { id: "again", kind: "long", actorIds: ["hero"], campaignId: "camp" },
      "player",
    ).canApply,
    true,
  );
});
test("long light-only duration is insufficient; explicit trance profile permits four conscious hours", () => {
  const s = state();
  start(s, "long");
  advance(s, 28800);
  assert.equal(r.previewRestCompletion(s, "rest", {}, "player").canApply, false);
  const t = state();
  t.actors.hero.restProfile = {
    ...t.actors.hero.restProfile,
    trance: true,
    longRestSeconds: 14400,
    sleepRequiredSeconds: 0,
  };
  t.actors.hero.concentration = { active: true, id: "focus" };
  start(t, "long", { activityByActor: { hero: "trance" } });
  advance(t, 14400);
  complete(t);
  assert.equal(t.actors.hero.concentration.active, true);
});
test("interruption after 70 minutes offers one short benefit, adds an hour, and resumes individually", () => {
  const s = state();
  start(s, "long", { activityByActor: { hero: "sleep" } });
  advance(s, 4200);
  const args = { eventId: "damage", actorIds: ["hero"], cause: "damage" };
  r.interruptRest(s, "rest", args, "player");
  r.interruptRest(s, "rest", args, "player");
  let p = r.getRest(s, "rest", "player").participants[0];
  assert.equal(p.requiredSeconds, 32400);
  assert.equal(p.benefits.length, 1);
  const benefitId = p.benefits[0].id;
  assert.equal(p.benefits[0].applied, true);
  assert.equal(s.actors.hero.features[0].used, 1);
  r.resumeRest(s, "rest", { actorIds: ["hero"] }, "player");
  advance(s, 28200, "remainder");
  complete(s, { id: "long-complete" });
  assert.equal(s.actors.hero.hp, 20);
  assert.equal(s.actors.hero.features[0].used, 0);
});
test("short interrupt has no benefit; long interrupted before an hour has no short benefit", () => {
  for (const kind of ["short", "long"]) {
    const s = state();
    start(s, kind);
    advance(s, 2700);
    r.interruptRest(
      s,
      "rest",
      { eventId: "spell", actorIds: ["hero"], cause: "leveled-spell" },
      "player",
    );
    const p = r.getRest(s, "rest", "player").participants[0];
    assert.equal(p.benefits.length, 0);
    assert.equal(r.previewRestCompletion(s, "rest", {}, "player").canApply, false);
    assert.equal(s.actors.hero.features[0].used, 2);
  }
});
test("unknown counters permit verified total recovery, not an invented partial balance or absent resource", () => {
  const s = state();
  s.actors.hero.pactSlots.used = null;
  s.actors.hero.features[0].used = null;
  s.actors.hero.hitDice.d6 = { max: 0, used: 2 };
  short(s);
  assert.equal(s.actors.hero.pactSlots.used, 0);
  assert.equal(s.actors.hero.features[0].used, null);
  assert.equal(s.actors.hero.hitDice.d6.used, 2);
});
test("resource identity and textual recovery cannot accidentally authorize a refill", () => {
  const s = state();
  s.actors.hero.features[0].resourceId = "replacement";
  s.actors.hero.features.push({ id: "manual", max: 2, used: 2, recovery: "short-rest" });
  short(s);
  assert.equal(s.actors.hero.features[0].used, 2);
  assert.equal(s.actors.hero.features[1].used, 2);
});
test("arcane recovery is an explicit bounded selection and cannot be used twice per long-rest cycle", () => {
  const s = state(),
    benefitId = short(s),
    input = { id: "arcane", actorId: "hero", benefitId, slots: { 1: 2 } };
  let p = r.previewArcaneRecovery(s, "rest", input, "player");
  assert.equal(p.canApply, true);
  r.applyArcaneRecovery(s, "rest", input, "player", { reviewKey: p.reviewKey });
  r.applyArcaneRecovery(s, "rest", input, "player");
  assert.equal(s.actors.hero.spellSlots[1].used, 0);
  assert.equal(s.actors.hero.restProfile.arcaneRecovery.used, 1);
  assert.equal(
    r.previewArcaneRecovery(s, "rest", { ...input, id: "another", slots: { 6: 1 } }, "player")
      .canApply,
    false,
  );
});
test("recovery blocks its pending consequences, never erases them or blocks unrelated actors", () => {
  const s = state();
  start(s);
  advance(s, 3600);
  s.actors.hero.pendingHealing = { id: "potion" };
  assert.equal(r.previewRestCompletion(s, "rest", {}, "player").canApply, false);
  assert.deepEqual(s.actors.hero.pendingHealing, { id: "potion" });
  delete s.actors.hero.pendingHealing;
  s.actors.other.pendingHealing = { id: "other-potion" };
  complete(s);
});
test("pending HD blocks time-dependent closure and finish, while normal time closes the completed window", () => {
  const s = state(),
    benefitId = short(s);
  r.beginHitDie(
    s,
    "rest",
    { id: "die", actorId: "hero", benefitId, die: "d8", mode: "physical" },
    "player",
  );
  assert.equal(r.previewTimeAdvance(s, { campaignId: "camp", seconds: 60 }, "dm").canApply, false);
  assert.throws(() => r.finishRestRecovery(s, "rest", { actorId: "hero", benefitId }, "player"));
  r.resolveHitDie(s, "die", { face: 1 }, "player");
  advance(s, 60, "later");
  assert.throws(() =>
    r.beginHitDie(
      s,
      "rest",
      { id: "late", actorId: "hero", benefitId, die: "d8", mode: "physical" },
      "player",
    ),
  );
});
test("relevant mutations invalidate review, unrelated notes do not; all retry IDs preserve one application", () => {
  const s = state();
  start(s);
  const p = r.previewTimeAdvance(s, { campaignId: "camp", seconds: 3600 }, "dm");
  s.actors.hero.notes = "changed";
  r.advanceGameTime(s, { id: "once", campaignId: "camp", seconds: 3600 }, "dm", {
    reviewKey: p.reviewKey,
  });
  r.advanceGameTime(s, { id: "once", campaignId: "camp", seconds: 3600 }, "dm");
  assert.equal(r.getGameTime(s, "camp", "dm").seconds, 3600);
  const cp = r.previewRestCompletion(s, "rest", {}, "player");
  s.actors.hero.features[0].used = 3;
  assert.throws(() =>
    r.completeRest(s, "rest", { id: "complete" }, "player", { reviewKey: cp.reviewKey }),
  );
});
test("personal recorded elapsed time works offline and does not touch shared time or other actors", () => {
  const s = state();
  start(s, "short", { actorIds: ["private"], campaignId: null });
  r.recordPersonalRestTime(
    s,
    "rest",
    { id: "elapsed", actorId: "private", seconds: 3600 },
    "player",
    { online: false },
  );
  const p = r.previewRestCompletion(s, "rest", { actorIds: ["private"] }, "player");
  assert.equal(p.commit.local, true);
  r.completeRest(s, "rest", { id: "complete", actorIds: ["private"] }, "player", {
    online: false,
    reviewKey: p.reviewKey,
  });
  assert.equal(r.getGameTime(s, "camp", "player").seconds, 0);
  assert.equal(r.getRestRolls(s, "dm").length, 0);
});
test("explicit correction is delta-only, requires reason, keeps evidence and ignores unrelated inventory", () => {
  const s = state(),
    benefitId = short(s);
  r.beginHitDie(
    s,
    "rest",
    { id: "die", actorId: "hero", benefitId, die: "d8", mode: "physical" },
    "player",
  );
  r.resolveHitDie(s, "die", { face: 5 }, "player");
  const input = {
    id: "fix",
    restId: "rest",
    actorId: "hero",
    reason: "Mistyped current HP",
    patch: { hp: 8 },
  };
  const p = r.previewRestCorrection(s, input, "player");
  assert.equal(p.canApply, true);
  r.correctRestResult(s, input, "player", { reviewKey: p.reviewKey });
  r.correctRestResult(s, input, "player");
  assert.equal(s.actors.hero.hp, 8);
  assert.equal(s.restTime.rolls[0].acceptedFace, 5);
  assert.equal(
    r.previewRestCorrection(s, { ...input, reason: "", patch: { hp: 2 } }, "player").canApply,
    false,
  );
  assert.equal(
    r.previewRestCorrection(s, { ...input, patch: { inventory: [] } }, "player").canApply,
    false,
  );
  assert.deepEqual(s.actors.hero.inventory, [{ id: "potion", quantity: 2 }]);
  // 0 HP and Exhaustion belong to the conditions panel (review 10): refused here.
  for (const patch of [{ hp: 0 }, { exhaustion: 0 }]) {
    const refused = r.previewRestCorrection(s, { ...input, patch }, "player");
    assert.equal(refused.canApply, false, JSON.stringify(patch));
    assert.equal(refused.errors[0].code, "vitality");
  }
  s.actors.hero.hp = 0;
  assert.equal(
    r.previewRestCorrection(s, { ...input, patch: { hp: 3 } }, "player").errors[0].code,
    "vitality",
    "leaving 0 HP is healing or a vitality correction, not a rest correction",
  );
});
test("explicit timed effects expire without changing turn effects, unknown durations or dawn resources", () => {
  const s = state();
  api();
  s.actors.hero.combatEffects = [
    { id: "timed", expiresAtGameTime: { campaignId: "camp", seconds: 600 } },
    { id: "shield", expires: "start" },
    { id: "unknown" },
  ];
  s.actors.hero.features.push({ id: "dawn", max: 2, used: 2 });
  advance(s, 600);
  assert.deepEqual(
    s.actors.hero.combatEffects.map((x) => x.id),
    ["shield", "unknown"],
  );
  assert.equal(s.actors.hero.features.at(-1).used, 2);
});
test("queries and previews never expose another controller personal actors or rolls", () => {
  const s = state();
  api();
  r.startRest(
    s,
    { id: "secret", kind: "short", actorIds: ["private"], campaignId: null },
    "player",
  );
  assert.deepEqual(r.listRests(s, "dm"), []);
  assert.throws(() => r.getRest(s, "secret", "dm"));
  assert.throws(() => r.getRestRecoveryProfile(s, "private", "dm"));
  assert.equal(
    r.previewRest(s, { id: "bad", kind: "short", actorIds: ["private"], campaignId: null }, "dm")
      .participants.length,
    0,
  );
});
test("trusted combat events close old recovery windows and interrupt only involved participants once", () => {
  const s = state(),
    benefitId = short(s);
  r.beginHitDie(
    s,
    "rest",
    { id: "die", actorId: "hero", benefitId, die: "d8", mode: "physical" },
    "player",
  );
  r.observeRestEvent(s, { eventId: "move", actorIds: ["hero"], cause: "movement" });
  assert.equal(s.restTime.rolls[0].status, "pending");
  r.resolveHitDie(s, "die", { face: 4 }, "player");
  assert.throws(() =>
    r.beginHitDie(
      s,
      "rest",
      { id: "new", actorId: "hero", benefitId, die: "d8", mode: "physical" },
      "player",
    ),
  );
  const t = state();
  const input = {
    id: "group",
    kind: "long",
    actorIds: ["hero", "other"],
    campaignId: "camp",
    activityByActor: { hero: "sleep", other: "sleep" },
  };
  r.startRest(t, input, "dm");
  advance(t, 4200);
  r.observeRestEvent(t, { eventId: "hit", actorIds: ["hero"], cause: "damage" });
  r.observeRestEvent(t, { eventId: "hit", actorIds: ["hero"], cause: "damage" });
  const parts = r.getRest(t, "group", "dm").participants;
  assert.equal(parts[0].status, "interrupted");
  assert.equal(parts[0].interruptions.length, 1);
  assert.equal(parts[1].status, "resting");
});
test("round time advances once on the current actual round, not per actor or stale supplied round", () => {
  const s = state();
  api();
  s.combat = { active: true, order: ["other"], turn: 0, round: 2 };
  r.advanceRoundTime(s, { eventId: "combat-a-round-2", round: 2 });
  r.advanceRoundTime(s, { eventId: "combat-a-round-2", round: 2 });
  assert.equal(r.getGameTime(s, "camp", "player").seconds, 6);
  assert.throws(() => r.advanceRoundTime(s, { eventId: "wrong", round: 3 }));
  assert.throws(() => r.advanceRoundTime(s, { eventId: "offline", round: 2 }, { online: false }));
});
test("removed Arcane Recovery keeps spent history and feature IDs containing dots recover correctly", () => {
  const s = state();
  s.actors.hero.features[0].id = "feature.with.dot";
  for (const p of s.actors.hero.restProfile.recoveries)
    if (p.target.kind === "feature") p.target.id = "feature.with.dot";
  short(s);
  assert.equal(s.actors.hero.features[0].used, 1);
  const t = state();
  t.actors.hero.restProfile.arcaneRecovery = { wizardLevel: 0, used: 1, source };
  start(t, "long", { activityByActor: { hero: "sleep" } });
  advance(t, 28800);
  complete(t);
  assert.equal(t.actors.hero.restProfile.arcaneRecovery.used, 1);
});
test("personal repeated long rest requires explicit elapsed-time evidence, not a free immediate refill", () => {
  const s = state();
  start(s, "long", {
    actorIds: ["private"],
    campaignId: null,
    activityByActor: { private: "sleep" },
  });
  r.recordPersonalRestTime(
    s,
    "rest",
    { id: "sleep", actorId: "private", seconds: 28800 },
    "player",
  );
  r.completeRest(s, "rest", { id: "complete", actorIds: ["private"] }, "player");
  const input = {
    id: "next",
    kind: "long",
    actorIds: ["private"],
    campaignId: null,
    activityByActor: { private: "sleep" },
  };
  assert.equal(r.previewRest(s, input, "player").canApply, false);
  assert.equal(
    r.previewRest(s, { ...input, elapsedSinceLastLongSeconds: 57600 }, "player").canApply,
    true,
  );
});
test("a mature interrupted long rest grants deterministic short recovery at initiative, before resuming", () => {
  const s = state();
  start(s, "long", { activityByActor: { hero: "sleep" } });
  advance(s, 4200);
  s.combat = { active: true, round: 1, turn: 0, order: ["hero", "other"] };
  r.observeRestEvent(s, { eventId: "initiative", actorIds: ["hero"], cause: "initiative" });
  assert.equal(s.actors.hero.features[0].used, 1);
  assert.equal(s.actors.hero.pactSlots.used, 0);
  const b = r.getRest(s, "rest", "player").participants[0].benefits[0];
  assert.equal(b.applied, true);
  r.beginHitDie(
    s,
    "rest",
    { id: "earned-at-interruption", actorId: "hero", benefitId: b.id, die: "d8", mode: "physical" },
    "player",
  );
  r.resolveHitDie(s, "earned-at-interruption", { face: 2 }, "player");
  assert.equal(s.actors.hero.hp, 9);
  r.observeRestEvent(s, { eventId: "attack", actorIds: ["hero"], cause: "activity" });
  assert.throws(() =>
    r.beginHitDie(
      s,
      "rest",
      { id: "too-late", actorId: "hero", benefitId: b.id, die: "d8", mode: "physical" },
      "player",
    ),
  );
});
test("sleep has its own unconscious condition; waking preserves an independent condition", () => {
  const s = state();
  s.actors.hero.conditions = [{ id: "unconscious", source: "other-effect" }];
  start(s, "long", { activityByActor: { hero: "sleep" } });
  assert.equal(s.actors.hero.conditions.filter((c) => c.id === "unconscious").length, 2);
  const rows = r.previewRest(
    s,
    {
      id: "other",
      kind: "long",
      actorIds: ["other"],
      campaignId: "camp",
      activityByActor: { other: "sleep" },
    },
    "dm",
  ).rows;
  assert.deepEqual(
    rows.map((row) => [row.path, row.after === true ? true : "list"]),
    [
      ["conditions", "list"],
      ["conditions.prone", true],
    ],
    "the preview shows Unconscious and the Prone it leaves",
  );
  r.setRestActivity(s, "rest", { actorId: "hero", activity: "light" }, "player");
  // Waking ends only the sleep, through the conditions domain: the independent
  // Unconscious stays, and Prone remains as when any Unconscious ends (SRD EN 191).
  const unconscious = s.actors.hero.conditions.filter((c) => c.id === "unconscious");
  assert.deepEqual(
    unconscious.map((c) => [c.source, c.restId ?? null]),
    [["other-effect", null]],
  );
  assert.ok(
    s.actors.hero.conditions.some((c) => c.id === "prone" && c.cause === "unconscious-fall"),
  );
  assert.deepEqual(
    s.conditionEvents.filter((e) => e.actorId === "hero").map((e) => e.kind),
    ["apply", "end"],
  );
});
test("recovery profile projects explicit trance requirements and time expires only a known concentration", () => {
  const s = state();
  api();
  s.actors.hero.restProfile = {
    ...s.actors.hero.restProfile,
    trance: true,
    longRestSeconds: 14400,
    sleepRequiredSeconds: 0,
  };
  const p = r.getRestRecoveryProfile(s, "hero", "player");
  assert.equal(p.trance, true);
  assert.equal(p.longRestSeconds, 14400);
  assert.equal(p.sleepRequiredSeconds, 0);
  s.actors.hero.concentration = {
    id: "timed-focus",
    active: true,
    expiresAtGameTime: { campaignId: "camp", seconds: 60 },
  };
  s.actors.other.combatEffects = [{ concentrationId: "timed-focus", id: "linked" }];
  s.actors.other.concentration = { id: "unknown", active: true };
  advance(s, 60);
  assert.equal(s.actors.hero.concentration.active, false);
  assert.deepEqual(s.actors.other.combatEffects, []);
  assert.equal(s.actors.other.concentration.active, true);
});
test("a repeated real interruption after resume follows literal accumulated-rest reading, retry does not", () => {
  const s = state();
  start(s, "long", { activityByActor: { hero: "sleep" } });
  advance(s, 4200);
  const first = { eventId: "first", actorIds: ["hero"], cause: "damage" };
  r.interruptRest(s, "rest", first, "player");
  r.interruptRest(s, "rest", first, "player");
  assert.equal(s.actors.hero.features[0].used, 1);
  assert.equal(r.getRest(s, "rest", "player").participants[0].benefits[0].closed, false);
  r.resumeRest(s, "rest", { actorIds: ["hero"] }, "player");
  advance(s, 60, "minute");
  s.actors.hero.features[0].used = 2;
  r.interruptRest(s, "rest", { ...first, eventId: "second" }, "player");
  assert.equal(s.actors.hero.features[0].used, 1);
  const p = r.getRest(s, "rest", "player").participants[0];
  assert.equal(p.interruptions.length, 2);
  assert.equal(p.requiredSeconds, 36000);
});
test("Arcane Recovery uses the linked feature's canonical spent counter and ledger", () => {
  const s = state();
  s.actors.hero.features.push({ id: "arcane.instance", max: 1, used: 1 });
  s.actors.hero.featureUsageLedger = {
    "arcane.instance": { id: "arcane.instance", max: 1, used: 1 },
  };
  s.actors.hero.restProfile.arcaneRecovery.featureId = "arcane.instance";
  s.actors.hero.restProfile.arcaneRecovery.used = 0;
  const benefitId = short(s),
    input = { id: "recover", actorId: "hero", benefitId, slots: { 1: 1 } };
  assert.equal(r.getRestRecoveryProfile(s, "hero", "player").arcaneRecovery.used, 1);
  assert.equal(r.previewArcaneRecovery(s, "rest", input, "player").canApply, false);
  s.actors.hero.features[1].used = 0;
  r.applyArcaneRecovery(s, "rest", input, "player");
  assert.equal(s.actors.hero.features[1].used, 1);
  assert.equal(s.actors.hero.featureUsageLedger["arcane.instance"].used, 1);
  const t = state();
  t.actors.hero.features.push({ id: "arcane.instance", max: 1, used: 1 });
  t.actors.hero.restProfile.arcaneRecovery.featureId = "arcane.instance";
  t.actors.hero.restProfile.arcaneRecovery.used = 1;
  start(t, "long", { activityByActor: { hero: "sleep" } });
  advance(t, 28800);
  complete(t);
  assert.equal(t.actors.hero.features[1].used, 0);
  assert.equal(r.getRestRecoveryProfile(t, "hero", "player").arcaneRecovery.used, 0);
  assert.equal(t.actors.hero.restProfile.arcaneRecovery.used, 1);
});
test("membership revocation denies campaign rest queries and new consequences without erasing personal history", () => {
  const s = state();
  r.startRest(
    s,
    { id: "personal", kind: "short", actorIds: ["private"], campaignId: null },
    "player",
  );
  r.startRest(
    s,
    { id: "rest", kind: "short", actorIds: ["hero", "other"], campaignId: "camp" },
    "dm",
  );
  advance(s, 3600);
  const reviewed = r.previewRestCompletion(s, "rest", { actorIds: ["hero"] }, "player");
  s.campaign.members.find((m) => m.id === "player").active = false;
  assert.throws(() => r.getRest(s, "rest", "player"));
  assert.throws(() => r.getRestRecoveryProfile(s, "other", "player"));
  const deniedTime = r.previewTimeAdvance(s, { campaignId: "camp", seconds: 60 }, "player");
  assert.equal(deniedTime.before, null);
  assert.equal(deniedTime.after, null);
  assert.deepEqual(deniedTime.rows, []);
  assert.equal(deniedTime.reviewKey, "");
  assert.equal(
    r.previewRestCompletion(s, "rest", { actorIds: ["hero"] }, "player").canApply,
    false,
  );
  assert.throws(() =>
    r.completeRest(s, "rest", { id: "late", actorIds: ["hero"] }, "player", {
      reviewKey: reviewed.reviewKey,
    }),
  );
  assert.equal(s.actors.hero.features[0].used, 2);
  assert.deepEqual(
    r.listRests(s, "player").map((x) => x.id),
    ["personal"],
  );
  assert.equal(r.getRest(s, "personal", "player").participants[0].actorId, "private");
  assert.equal(r.getRestRecoveryProfile(s, "private", "player").hp, 5);
  s.campaign.members.find((m) => m.id === "dm").active = false;
  const denied = r.previewRest(
    s,
    { id: "leak", kind: "short", actorIds: ["other"], campaignId: "camp" },
    "dm",
  );
  assert.deepEqual(denied.participants, []);
  assert.deepEqual(denied.rows, []);
});
test("pending HD and its history cannot be read or resolved through revoked campaign membership", () => {
  const s = state(),
    benefitId = short(s);
  r.beginHitDie(
    s,
    "rest",
    { id: "pending", actorId: "hero", benefitId, die: "d8", mode: "physical" },
    "player",
  );
  s.campaign.members.find((m) => m.id === "player").active = false;
  assert.deepEqual(r.getRestRolls(s, "player"), []);
  assert.throws(() => r.resolveHitDie(s, "pending", { face: 5 }, "player"));
  assert.equal(s.restTime.rolls[0].status, "pending");
  assert.equal(s.actors.hero.hp, 5);
  s.campaign.members.find((m) => m.id === "player").active = true;
  r.resolveHitDie(s, "pending", { face: 5 }, "player");
  assert.equal(s.actors.hero.hp, 12);
});
test("Trance requires four actual meditation hours, not two plus two hours of light activity", () => {
  const s = state();
  s.actors.hero.restProfile = {
    ...s.actors.hero.restProfile,
    trance: true,
    longRestSeconds: 14400,
    sleepRequiredSeconds: 0,
  };
  assert.deepEqual(
    r.previewRest(
      s,
      {
        id: "rest",
        kind: "long",
        actorIds: ["hero"],
        campaignId: "camp",
        activityByActor: { hero: "trance" },
      },
      "player",
    ).participants[0].source,
    source,
  );
  start(s, "long", { activityByActor: { hero: "trance" } });
  advance(s, 7200, "meditation");
  r.setRestActivity(s, "rest", { actorId: "hero", activity: "light" }, "player");
  advance(s, 7200, "watch");
  assert.equal(r.previewRestCompletion(s, "rest", {}, "player").canApply, false);
  r.setRestActivity(s, "rest", { actorId: "hero", activity: "trance" }, "player");
  advance(s, 7200, "meditation2");
  assert.equal(r.getRest(s, "rest", "player").participants[0].tranceSeconds, 14400);
  complete(s);
  const normal = state();
  normal.actors.hero.restProfile = {
    ...normal.actors.hero.restProfile,
    trance: true,
    longRestSeconds: 14400,
    sleepRequiredSeconds: 0,
  };
  start(normal, "long", { activityByActor: { hero: "sleep" } });
  advance(normal, 28800);
  complete(normal);
});
test("long rest cooldown follows the actor across personal and campaign clocks without inventing an offset", () => {
  const s = state();
  start(s, "long", {
    actorIds: ["private"],
    campaignId: null,
    activityByActor: { private: "sleep" },
  });
  r.recordPersonalRestTime(
    s,
    "rest",
    { id: "sleep", actorId: "private", seconds: 28800 },
    "player",
  );
  r.completeRest(s, "rest", { id: "complete", actorIds: ["private"] }, "player");
  s.actors.private.visibility = "shared";
  s.actors.private.campaignIds = ["camp"];
  const next = {
    id: "next",
    kind: "long",
    actorIds: ["private"],
    campaignId: "camp",
    activityByActor: { private: "sleep" },
  };
  assert.equal(r.previewRest(s, next, "player").canApply, false);
  assert.ok(r.previewRest(s, next, "player").errors.some((e) => e.code === "long-context"));
  assert.equal(
    r.previewRest(s, { ...next, elapsedSinceLastLongSeconds: 57599 }, "player").canApply,
    false,
  );
  r.startRest(s, { ...next, elapsedSinceLastLongSeconds: 57600 }, "player");
  advance(s, 28800);
  r.completeRest(s, "next", { id: "complete2", actorIds: ["private"] }, "player");
  assert.equal(
    r.previewRest(s, { ...next, id: "again", elapsedSinceLastLongSeconds: 57600 }, "player")
      .canApply,
    false,
  );
  advance(s, 57600, "actual-later");
  assert.equal(r.previewRest(s, { ...next, id: "again" }, "player").canApply, true);
  assert.throws(() => r.getRest(s, "rest", "dm"));
});
test("personal rest previews keep history private after joining while shared actor writes still require online", () => {
  const s = state();
  start(s, "short", { actorIds: ["private"], campaignId: null });
  r.recordPersonalRestTime(s, "rest", { id: "time", actorId: "private", seconds: 3600 }, "player");
  s.actors.private.visibility = "shared";
  s.actors.private.campaignIds = ["camp"];
  const p = r.previewRestCompletion(s, "rest", { actorIds: ["private"] }, "player");
  assert.deepEqual(p.commit, { local: false, visibility: "private" });
  assert.throws(() =>
    r.completeRest(s, "rest", { id: "done", actorIds: ["private"] }, "player", { online: false }),
  );
  const result = r.completeRest(s, "rest", { id: "done", actorIds: ["private"] }, "player");
  const input = { actorId: "private", benefitId: result.benefitIds[0], slots: { 1: 1 } };
  assert.deepEqual(r.previewArcaneRecovery(s, "rest", input, "player").commit, p.commit);
  assert.deepEqual(
    r.previewQuickRecovery(s, "rest", { ...input, diceOrder: ["d8"], maxDice: 1 }, "player").commit,
    p.commit,
  );
  assert.deepEqual(
    r.previewRestCorrection(
      s,
      { restId: "rest", actorId: "private", reason: "Correction", patch: { hp: 4 } },
      "player",
    ).commit,
    p.commit,
  );
});
test("filtering rest list by an invisible actor does not reveal its participation via visible peers", () => {
  const s = state();
  s.actors.other.kind = "npc";
  s.actors.other.owner = "dm";
  r.startRest(
    s,
    { id: "group", kind: "short", actorIds: ["hero", "other"], campaignId: "camp" },
    "dm",
  );
  assert.equal(r.listRests(s, "player").length, 1);
  assert.deepEqual(r.listRests(s, "player", { actorId: "other" }), []);
  assert.equal(r.listRests(s, "dm", { actorId: "other" }).length, 1);
});
