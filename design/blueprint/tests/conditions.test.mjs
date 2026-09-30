import test from "node:test";
import assert from "node:assert/strict";

const c = await import("../conditions.mjs").catch(() => ({}));
const ready = () =>
  assert.equal(typeof c.previewConditionChange, "function", "conditions domain exists");
const SRC = Object.freeze({
  kind: "authored-demo",
  edition: "2024",
  revision: "conditions-test-1",
});
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
  ready();
  return {
    campaign: { id: "camp", name: "Camp" },
    actors: {
      hero: creature("hero", {
        heldItemIds: ["sword"],
        inventory: [
          { id: "sword", name: "Sword", quantity: 1, equipped: true },
          { id: "armor", name: "Armor", quantity: 1, equipped: true },
        ],
        concentration: { id: "conc-1", name: "Bless", active: true, source: SRC },
      }),
      ally: creature("ally", { hp: 10, maxHp: 10, skills: ["medicine"] }),
      guard: creature("guard", { owner: "dm" }),
      ogre: creature("ogre", {
        kind: "npc",
        owner: "dm",
        hp: 30,
        maxHp: 30,
        vitalityPolicy: { zeroHp: "death", source: SRC },
      }),
      loner: creature("loner", { visibility: "private", campaignIds: [] }),
    },
    combat: {
      active: false,
      round: 1,
      turn: 0,
      order: ["hero", "ally", "ogre"],
      encounterId: "enc",
    },
    restTime: {
      version: 1,
      clocks: { camp: { seconds: 3600, revision: 1 } },
      rests: [],
      rolls: [],
      events: [],
    },
  };
}
const apply = (conditionId, extra = {}) => ({
  kind: "apply",
  conditionId,
  source: SRC,
  term: { kind: "manual" },
  mode: "record",
  ...extra,
});
function change(s, id, selection, viewer = "player", extra = {}) {
  const p = c.previewConditionChange(s, id, selection, viewer);
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  const r = c.applyConditionChange(s, id, selection, viewer, {
    operationId: op(),
    reviewKey: p.reviewKey,
    ...extra,
  });
  return { p, r };
}
function vital(s, id, selection, viewer = "player") {
  const p = c.previewVitalityChange(s, id, selection, viewer);
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  return {
    p,
    r: c.applyVitalityChange(s, id, selection, viewer, {
      operationId: op(),
      reviewKey: p.reviewKey,
    }),
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
const heal = (s, actorId, amount) =>
  c.applyVitalityEvent(s, { eventId: op("heal"), actorId, kind: "healing", amount, source: SRC });
const ids = (a) => a.conditions.map((x) => (typeof x === "string" ? x : x.id));
const causes = (a, id) =>
  a.conditions.filter((x) => typeof x === "object" && x.id === id).map((x) => x.cause ?? null);
// The turn identity is index-independent: encounter, round and acting creature.
const heroTurn = (s, round = 1) =>
  Object.assign(s.combat, { active: true, round, turn: 0 }) && `enc:${round}:hero`;
const strip = (rows) => rows.map(({ field, before, after }) => ({ field, before, after }));

test("catalog lists all fifteen SRD 2024 conditions with EN/IT names and immutable sources", () => {
  ready();
  const rows = c.listConditionDefinitions();
  assert.deepEqual(rows.map((r) => r.id).sort(), [
    "blinded",
    "charmed",
    "deafened",
    "exhaustion",
    "frightened",
    "grappled",
    "incapacitated",
    "invisible",
    "paralyzed",
    "petrified",
    "poisoned",
    "prone",
    "restrained",
    "stunned",
    "unconscious",
  ]);
  for (const row of rows) {
    assert.ok(row.name.it && row.name.en, row.id);
    assert.equal(row.source.kind, "srd");
    assert.equal(row.source.edition, "2024");
    assert.equal(row.source.revision, "5.2.1");
    assert.ok(row.source.en.pages.length && row.source.it.pages.length);
    assert.ok(Array.isArray(row.supported) && Array.isArray(row.manual));
    for (const effect of [...row.supported, ...row.manual])
      assert.ok(effect.code && effect.it && effect.en);
  }
  assert.equal(rows.find((r) => r.id === "unconscious").name.it, "Privo di sensi");
  assert.ok(rows.find((r) => r.id === "unconscious").manual.some((e) => e.code === "unaware"));
  rows[0].name.it = "MUTATED";
  rows[0].source.revision = "MUTATED";
  assert.notEqual(c.listConditionDefinitions()[0].name.it, "MUTATED");
  assert.equal(c.listConditionDefinitions()[0].source.revision, "5.2.1");
  assert.deepEqual(
    c.listConditionDefinitions({ query: "avvelen" }).map((r) => r.id),
    ["poisoned"],
  );
  assert.deepEqual(
    c.listConditionDefinitions({ query: "PRONE" }).map((r) => r.id),
    ["prone"],
  );
});

test("legacy strings and rest objects stay readable with stable ids and no invented provenance", () => {
  const s = world(),
    hero = s.actors.hero;
  hero.conditions = ["poisoned", { id: "unconscious", restId: "long-1", source: SRC }, "poisoned"];
  assert.equal(c.hasCondition(hero, "poisoned"), true);
  assert.equal(c.hasCondition(hero, "incapacitated"), true, "Unconscious includes Incapacitated");
  assert.equal(c.hasCondition(hero, "prone"), true, "Unconscious includes Prone");
  assert.equal(c.hasCondition({ blinded: true }, "blinded"), true);
  assert.equal(c.hasCondition({ incapacitated: true }, "incapacitated"), true);
  const view = c.getConditionOverview(s, "hero", "player");
  const instances = view.instances.map((i) => i.instanceId);
  assert.deepEqual(instances, [
    "legacy:poisoned:0",
    "rest:long-1:unconscious",
    "legacy:poisoned:1",
  ]);
  const legacy = view.instances[0];
  assert.equal(legacy.legacy, true);
  assert.equal(legacy.owner, null);
  assert.equal(legacy.source, null);
  assert.equal(legacy.origin, null);
  assert.equal(legacy.term.kind, "unknown");
  assert.equal(view.instances[1].cause, "sleep");
  assert.equal(view.instances[1].permissions.canEnd, false, "rest sleep ends through its rest");
  assert.equal(view.active.find((g) => g.id === "poisoned").count, 2);
  assert.deepEqual(
    c.getConditionOverview(s, "hero", "player").instances.map((i) => i.instanceId),
    instances,
  );
  change(s, "hero", { kind: "end", instanceId: "legacy:poisoned:0", reason: "Antidote" });
  assert.equal(hero.conditions.length, 2);
  assert.ok(hero.conditions.every((x) => typeof x === "object" && x.instanceId));
  assert.equal(hero.conditions.find((x) => x.id === "unconscious").restId, "long-1");
  assert.equal(c.hasCondition(hero, "poisoned"), true, "the other legacy origin remains");
  const p = c.previewConditionChange(
    s,
    "hero",
    { kind: "end", instanceId: "rest:long-1:unconscious", reason: "Wake" },
    "player",
  );
  assert.equal(p.canApply, false);
  assert.equal(p.errors[0].code, "rest-bound");
});

test("two origins impose one condition; ending one keeps the other and history keeps provenance", () => {
  const s = world(),
    hero = s.actors.hero;
  const first = change(s, "hero", apply("poisoned", { origin: { label: "Spoiled ration" } })).r;
  change(s, "hero", apply("poisoned", { origin: { label: "Snake bite" } }));
  let m = c.getConditionMechanics(hero);
  assert.equal(m.attackDisadvantage.filter((r) => r.conditionId === "poisoned").length, 1);
  assert.equal(
    c.getConditionOverview(s, "hero", "player").active.find((g) => g.id === "poisoned").count,
    2,
  );
  const firstId = first.instanceIds[0];
  const endSel = { kind: "end", instanceId: firstId, reason: "Cured the ration" };
  const p = c.previewConditionChange(s, "hero", endSel, "player");
  assert.ok(
    p.rows.some((r) => r.field === "conditions.poisoned" && r.before === true && r.after === true),
  );
  change(s, "hero", endSel);
  assert.equal(c.hasCondition(hero, "poisoned"), true);
  assert.equal(hero.conditions.length, 1);
  assert.equal(hero.conditions[0].origin.label, "Snake bite");
  m = c.getConditionMechanics(hero);
  assert.equal(m.attackDisadvantage.length, 1);
  const history = c.getConditionHistory(s, "hero", "player");
  const ended = history.find((h) => h.kind === "end");
  assert.equal(ended.reason, "Cured the ration");
  assert.equal(ended.owner, "player");
  assert.deepEqual(ended.source, SRC);
  assert.ok(ended.rows.some((r) => r.instanceId === firstId));
});

test("previews are pure; apply matches preview, retries are idempotent and conflicts are rejected", () => {
  const s = world();
  const selection = apply("restrained", { origin: { label: "Net" } });
  const before = structuredClone(s);
  const p = c.previewConditionChange(s, "hero", selection, "player");
  assert.deepEqual(s, before);
  assert.equal(p.canApply, true);
  assert.equal(p.actorId, "hero");
  assert.deepEqual(p.commit, { local: false, visibility: "shared" });
  assert.ok(p.rows.some((r) => r.field === "origin" && r.after === "Net"));
  assert.throws(
    () =>
      c.applyConditionChange(s, "hero", selection, "player", {
        operationId: "x-1",
        reviewKey: "stale",
      }),
    (e) => e.code === "conflict",
  );
  assert.deepEqual(s, before);
  const r = c.applyConditionChange(s, "hero", selection, "player", {
    operationId: "restrain-1",
    reviewKey: p.reviewKey,
  });
  assert.deepEqual(strip(r.rows), strip(p.rows));
  assert.equal(r.instanceIds[0], "restrain-1:restrained");
  const again = c.applyConditionChange(s, "hero", selection, "player", {
    operationId: "restrain-1",
    reviewKey: "anything",
  });
  assert.deepEqual(again, r);
  assert.equal(s.actors.hero.conditions.length, 1);
  assert.throws(
    () =>
      c.applyConditionChange(s, "hero", apply("poisoned"), "player", {
        operationId: "restrain-1",
        reviewKey: p.reviewKey,
      }),
    (e) => e.code === "id-conflict",
  );
  s.campaign.members = [{ id: "dm", name: "DM", role: "dm" }];
  assert.throws(
    () =>
      c.applyConditionChange(s, "hero", selection, "player", {
        operationId: "restrain-1",
        reviewKey: p.reviewKey,
      }),
    (e) => e.code === "unavailable",
    "a retry revalidates current membership",
  );
});

test("irrelevant note edits keep a vitality review key; relevant changes invalidate it", () => {
  const s = world();
  const selection = { kind: "damage", amount: 3, reason: "Trap", source: SRC };
  const key = c.previewVitalityChange(s, "hero", selection, "player").reviewKey;
  s.actors.hero.notes = "A new private note";
  assert.equal(c.previewVitalityChange(s, "hero", selection, "player").reviewKey, key);
  s.actors.hero.tempHp = 2;
  assert.notEqual(c.previewVitalityChange(s, "hero", selection, "player").reviewKey, key);
});

test("shared writes reject offline; a personal actor applies locally and privately", () => {
  const s = world();
  const p = c.previewConditionChange(s, "hero", apply("prone"), "player");
  assert.throws(
    () =>
      c.applyConditionChange(s, "hero", apply("prone"), "player", {
        operationId: op(),
        reviewKey: p.reviewKey,
        online: false,
      }),
    (e) => e.code === "offline",
  );
  assert.equal(s.actors.hero.conditions.length, 0);
  const local = c.previewConditionChange(s, "loner", apply("prone"), "player");
  assert.deepEqual(local.commit, { local: true, visibility: "private" });
  c.applyConditionChange(s, "loner", apply("prone"), "player", {
    operationId: op(),
    reviewKey: local.reviewKey,
    online: false,
  });
  assert.equal(c.hasCondition(s.actors.loner, "prone"), true);
  assert.throws(
    () => c.getConditionOverview(s, "loner", "dm"),
    (e) => e.code === "unavailable",
  );
  assert.throws(
    () => c.getConditionHistory(s, "loner", "dm"),
    (e) => e.code === "unavailable",
  );
});

test("authority: readers without control cannot manage, hidden actors are not readable", () => {
  const s = world();
  const p = c.previewConditionChange(s, "guard", apply("prone"), "player");
  assert.equal(p.canApply, false);
  assert.equal(p.errors[0].code, "permission");
  assert.equal(c.getConditionOverview(s, "guard", "player").permissions.canManage, false);
  assert.throws(
    () => c.previewConditionChange(s, "ogre", apply("prone"), "player"),
    (e) => e.code === "unavailable",
  );
  assert.equal(c.previewConditionChange(s, "ogre", apply("prone"), "dm").canApply, true);
  const origin = c.previewConditionChange(
    s,
    "hero",
    apply("frightened", { origin: { actorId: "ogre", label: "Roar" } }),
    "player",
  );
  assert.equal(origin.canApply, false);
  assert.equal(origin.errors[0].code, "origin");
  const choices = c.getConditionOverview(s, "hero", "player").choices;
  assert.ok(!choices.actors.some((a) => a.id === "ogre"));
  assert.deepEqual(choices.concentrations, [{ actorId: "hero", id: "conc-1", label: "Bless" }]);
  assert.deepEqual(choices.clock, { id: "camp", seconds: 3600 });
  assert.deepEqual(
    choices.heldItems.map((i) => [i.id, i.held]),
    [
      ["sword", true],
      ["armor", false],
    ],
  );
  assert.deepEqual(c.getConditionOverview(s, "guard", "player").choices.heldItems, []);
});

test("private sources and private applications never leak through overview or history", () => {
  const s = world();
  change(
    s,
    "hero",
    apply("frightened", {
      origin: { actorId: "ogre", label: "SECRET-ROAR" },
      sourceVisibility: "private",
      source: { kind: "homebrew", revision: "SECRET-REV" },
    }),
    "dm",
  );
  change(
    s,
    "hero",
    apply("charmed", { visibility: "private", origin: { label: "SECRET-CHARM" } }),
    "dm",
  );
  const player = c.getConditionOverview(s, "hero", "player");
  const text = JSON.stringify(player) + JSON.stringify(c.getConditionHistory(s, "hero", "player"));
  for (const secret of ["SECRET-ROAR", "SECRET-REV", "ogre", "SECRET-CHARM", "charmed"])
    assert.ok(!text.includes(secret), secret);
  const frightened = player.instances.find((i) => i.id === "frightened");
  assert.equal(frightened.sourceHidden, true);
  assert.equal(frightened.origin, null);
  assert.equal(frightened.source, null);
  const dm = c.getConditionOverview(s, "hero", "dm");
  assert.equal(dm.instances.find((i) => i.id === "frightened").origin.label, "SECRET-ROAR");
  assert.equal(dm.instances.find((i) => i.id === "frightened").origin.actorId, "ogre");
  assert.ok(dm.instances.some((i) => i.id === "charmed"));
  assert.ok(JSON.stringify(c.getConditionHistory(s, "hero", "dm")).includes("SECRET-CHARM"));
  assert.ok(c.hasCondition(s.actors.hero, "charmed"), "raw mechanics still see the application");
  const secret = world();
  change(secret, "hero", apply("stunned", { visibility: "private" }), "dm");
  assert.equal(secret.actors.hero.concentration.active, false);
  assert.deepEqual(
    c.getConditionHistory(secret, "hero", "player"),
    [],
    "consequences stay private",
  );
  assert.ok(
    c
      .getConditionHistory(secret, "hero", "dm")[0]
      .rows.some((r) => r.field === "concentration.active"),
  );
});

test("turn terms respect next-turn semantics, other creatures' turns and idempotent retries", () => {
  const s = world();
  const current = heroTurn(s);
  const next = change(
    s,
    "ally",
    apply("poisoned", { term: { kind: "turn", actorId: "hero", phase: "end", when: "next" } }),
  ).r.instanceIds[0];
  change(
    s,
    "ally",
    apply("poisoned", { term: { kind: "turn", actorId: "ally", phase: "end", when: "next" } }),
  );
  const stored = s.actors.ally.conditions.find((x) => x.instanceId === next);
  assert.equal(stored.term.excludeTurnKey, current);
  c.observeConditionEvent(s, {
    eventId: "end-hero-1",
    kind: "turn-end",
    actorIds: ["hero"],
    turnKey: current,
  });
  assert.equal(s.actors.ally.conditions.length, 2, "the current turn is not the next turn");
  c.observeConditionEvent(s, {
    eventId: "start-ally",
    kind: "turn-start",
    actorIds: ["ally"],
    turnKey: "enc:1:ally",
  });
  assert.equal(s.actors.ally.conditions.length, 2, "a start is not an end");
  const result = c.observeConditionEvent(s, {
    eventId: "end-hero-2",
    kind: "turn-end",
    actorIds: ["hero"],
    turnKey: "enc:2:hero",
  });
  assert.deepEqual(result.expired, [{ actorId: "ally", instanceId: next }]);
  assert.equal(s.actors.ally.conditions.length, 1);
  assert.equal(c.hasCondition(s.actors.ally, "poisoned"), true, "round end does not end both");
  const eventsBefore = s.conditionEvents.length;
  assert.deepEqual(
    c.observeConditionEvent(s, {
      eventId: "end-hero-2",
      kind: "turn-end",
      actorIds: ["hero"],
      turnKey: "enc:2:hero",
    }),
    result,
  );
  assert.equal(s.conditionEvents.length, eventsBefore);
  const bad = c.previewConditionChange(
    s,
    "ally",
    apply("prone", { term: { kind: "turn", actorId: "ally", phase: "end", when: "current" } }),
    "player",
  );
  assert.equal(bad.canApply, false);
  assert.equal(bad.errors[0].code, "term");
  const currentEnd = change(
    s,
    "ally",
    apply("prone", { term: { kind: "turn", actorId: "hero", phase: "end", when: "current" } }),
  ).r.instanceIds[0];
  c.observeConditionEvent(s, {
    eventId: "end-hero-3",
    kind: "turn-end",
    actorIds: ["hero"],
    turnKey: current,
  });
  assert.ok(!s.actors.ally.conditions.some((x) => x.instanceId === currentEnd));
});

test("clock, rest and concentration terms expire once from observed facts", () => {
  const s = world();
  const clock = change(
    s,
    "ally",
    apply("blinded", { term: { kind: "clock", clockId: "camp", expiresAt: 7200 } }),
  ).r.instanceIds[0];
  const rest = change(
    s,
    "ally",
    apply("deafened", { term: { kind: "rest", actorId: "ally", restKind: "long" } }),
  ).r.instanceIds[0];
  const conc = change(
    s,
    "ally",
    apply("charmed", {
      term: { kind: "concentration", actorId: "hero", concentrationId: "conc-1" },
    }),
  ).r.instanceIds[0];
  const past = c.previewConditionChange(
    s,
    "ally",
    apply("blinded", { term: { kind: "clock", clockId: "camp", expiresAt: 3000 } }),
    "player",
  );
  assert.equal(past.errors[0].code, "term");
  const wrongConc = c.previewConditionChange(
    s,
    "ally",
    apply("charmed", {
      term: { kind: "concentration", actorId: "hero", concentrationId: "other" },
    }),
    "player",
  );
  assert.equal(wrongConc.errors[0].code, "term");
  c.observeConditionEvent(s, { eventId: "clock-1", kind: "clock", clockId: "camp" });
  assert.equal(s.actors.ally.conditions.length, 3);
  s.restTime.clocks.camp.seconds = 7200;
  c.observeConditionEvent(s, { eventId: "clock-2", kind: "clock", clockId: "camp" });
  assert.ok(!s.actors.ally.conditions.some((x) => x.instanceId === clock));
  c.observeConditionEvent(s, {
    eventId: "rest-s",
    kind: "rest",
    restId: "r1",
    restKind: "short",
    actorIds: ["ally"],
  });
  assert.ok(
    s.actors.ally.conditions.some((x) => x.instanceId === rest),
    "a short rest is not a long rest",
  );
  c.observeConditionEvent(s, {
    eventId: "rest-l",
    kind: "rest",
    restId: "r2",
    restKind: "long",
    actorIds: ["ally"],
  });
  assert.ok(!s.actors.ally.conditions.some((x) => x.instanceId === rest));
  c.observeConditionEvent(s, {
    eventId: "conc-end",
    kind: "concentration-end",
    concentrationId: "conc-1",
    actorIds: ["hero"],
  });
  assert.ok(!s.actors.ally.conditions.some((x) => x.instanceId === conc));
  const history = c.getConditionHistory(s, "ally", "player");
  assert.ok(history.filter((h) => h.kind === "expired").length >= 3);
});

test("mechanics follow 2024 rules: incapacity is not speed zero; exhaustion scales d20 and speed", () => {
  ready();
  const stunned = c.getConditionMechanics({ speed: 9, conditions: ["stunned"] });
  assert.equal(stunned.incapacitated, true);
  assert.equal(stunned.cannotSpeak, true);
  assert.equal(stunned.speedZero, false);
  assert.equal(stunned.speed, 9);
  assert.deepEqual(stunned.autoFailSaves, ["str", "dex"]);
  assert.equal(c.getConditionMechanics({ speed: 9, conditions: ["incapacitated"] }).speed, 9);
  const paralyzed = c.getConditionMechanics({ speed: 9, conditions: ["paralyzed"] });
  assert.equal(paralyzed.speedZero, true);
  assert.equal(paralyzed.speed, 0);
  assert.equal(paralyzed.criticalWithinMeters, 1.5);
  const tired = c.getConditionMechanics({ speed: 9, conditions: [], exhaustion: 3 });
  assert.equal(tired.exhaustion, 3);
  assert.equal(tired.d20Penalty, 6);
  assert.equal(tired.speedPenalty, 4.5);
  assert.equal(tired.speed, 4.5);
  assert.equal(c.getConditionMechanics({ speed: 9, exhaustion: 2 }, { baseSpeed: 7.5 }).speed, 4.5);
  assert.equal(c.getConditionMechanics({ speed: 9, conditions: ["prone"] }).crawling, true);
  const bad = c.getConditionMechanics({ speed: 9, exhaustion: 9 });
  assert.ok(bad.reconciliation.some((r) => r.code === "exhaustion"));
  const custom = c.getConditionMechanics({
    speed: 9,
    conditions: [{ id: "custom", instanceId: "x", custom: true, label: "Poisoned" }],
  });
  assert.deepEqual(custom.attackDisadvantage, []);
});

test("attack and save rules use actual distance and explain unresolved context", () => {
  ready();
  const plain = { id: "a", conditions: [] };
  const prone = { id: "t", conditions: ["prone"] };
  assert.equal(c.conditionAttackRules(plain, prone, { distanceMeters: 1.5 }).mode, "advantage");
  assert.equal(c.conditionAttackRules(plain, prone, { distanceMeters: 3 }).mode, "disadvantage");
  const unknown = c.conditionAttackRules(plain, prone);
  assert.equal(unknown.mode, "normal");
  assert.ok(unknown.unresolved.some((u) => u.code === "distance"));
  const poisoned = { id: "p", conditions: ["poisoned"] };
  const cancel = c.conditionAttackRules(poisoned, prone, { distanceMeters: 1 });
  assert.equal(cancel.mode, "normal");
  assert.equal(cancel.advantage.length, 1);
  assert.equal(cancel.disadvantage.length, 1);
  const sleeper = { id: "u", conditions: ["unconscious"] };
  assert.equal(c.conditionAttackRules(plain, sleeper, { distanceMeters: 1.5 }).criticalOnHit, true);
  const far = c.conditionAttackRules(plain, sleeper, { distanceMeters: 9 });
  assert.equal(far.criticalOnHit, false);
  assert.equal(far.mode, "normal", "Unconscious advantage and Prone range disadvantage cancel");
  const scared = { id: "s", conditions: ["frightened"] };
  assert.ok(
    c.conditionAttackRules(scared, plain).unresolved.some((u) => u.conditionId === "frightened"),
  );
  assert.equal(c.conditionAttackRules(scared, plain, { canSeeSource: true }).mode, "disadvantage");
  const charmed = {
    id: "ch",
    conditions: [{ id: "charmed", instanceId: "i", origin: { actorId: "t" } }],
  };
  assert.equal(c.conditionAttackRules(charmed, prone, { distanceMeters: 1 }).canAttack, false);
  const tired = c.conditionAttackRules({ id: "x", exhaustion: 2 }, plain);
  assert.equal(tired.modifier, -4);
  const save = c.conditionSaveRules({ conditions: ["restrained"], exhaustion: 1 }, "dex");
  assert.equal(save.autoFail, false);
  assert.equal(save.disadvantage[0].conditionId, "restrained");
  assert.equal(save.modifier, -2);
  assert.equal(c.conditionSaveRules({ conditions: ["unconscious"] }, "str").autoFail, true);
  assert.equal(c.conditionSaveRules({ conditions: ["unconscious"] }, "con").autoFail, false);
  assert.throws(
    () => c.conditionSaveRules({}, "luck"),
    (e) => e.code === "ability",
  );
});

test("standing spends half effective Speed in feet, never actions or Dash", () => {
  const s = world(),
    hero = s.actors.hero;
  change(s, "hero", apply("prone", { origin: { label: "Trip" } }));
  change(s, "hero", apply("prone", { origin: { label: "Shove" } }));
  heroTurn(s);
  Object.assign(hero, { movement: 6, movementSpent: 3 });
  const before = structuredClone(s);
  const p = c.previewStand(s, "hero", "player");
  assert.deepEqual(s, before);
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  assert.deepEqual(
    p.costs.map(({ kind, amount, before, after }) => ({ kind, amount, before, after })),
    [{ kind: "movement", amount: 4.5, before: 6, after: 1.5 }],
  );
  c.standUp(s, "hero", "player", { operationId: op(), reviewKey: p.reviewKey });
  assert.equal(hero.movement, 1.5);
  assert.equal(hero.movementSpent, 7.5);
  assert.equal(hero.dashCount, 0);
  assert.equal(hero.action, true);
  assert.equal(c.hasCondition(hero, "prone"), false, "every Prone application ends");
  change(s, "hero", apply("prone"));
  hero.movement = 3;
  const short = c.previewStand(s, "hero", "player");
  assert.equal(short.canApply, false);
  assert.equal(short.errors[0].code, "movement");
  assert.throws(
    () => c.standUp(s, "hero", "player", { operationId: op(), reviewKey: short.reviewKey }),
    (e) => e.code === "movement",
  );
  assert.equal(hero.movement, 3);
  hero.movement = 9;
  const slow = c.previewStand(s, "hero", "player", { effectiveActor: { ...hero, speed: 7.5 } });
  assert.equal(slow.costs[0].amount, 3.6);
  assert.equal(c.previewStand(s, "hero", "player", { blocking: true }).errors[0].code, "pending");
  s.combat.turn = 1;
  assert.equal(c.previewStand(s, "hero", "player").errors[0].code, "turn");
  s.combat.active = false;
  hero.movement = 0;
  const outside = c.previewStand(s, "hero", "player");
  assert.equal(outside.canApply, true);
  c.standUp(s, "hero", "player", { operationId: op(), reviewKey: outside.reviewKey });
  assert.equal(hero.movement, 0, "outside initiative spends no stale budget");
  assert.equal(c.hasCondition(hero, "prone"), false);
  change(s, "hero", apply("prone"));
  change(s, "hero", apply("grappled"));
  assert.equal(c.previewStand(s, "hero", "player").errors[0].code, "speed-zero");
  const stunned = world();
  change(stunned, "hero", apply("prone"));
  change(stunned, "hero", apply("stunned"));
  assert.equal(
    c.previewStand(stunned, "hero", "player").canApply,
    true,
    "2024 Stunned keeps Speed",
  );
});

test("Unconscious creates a distinct Prone, ends concentration and drops only known held items", () => {
  const s = world(),
    hero = s.actors.hero;
  const armor = structuredClone(hero.inventory);
  const { p, r } = change(s, "hero", apply("unconscious", { origin: { label: "Sleep poison" } }));
  assert.ok(p.followUps.some((f) => f.kind === "end-concentration"));
  assert.deepEqual(ids(hero).sort(), ["prone", "unconscious"]);
  const prone = hero.conditions.find((x) => x.id === "prone");
  assert.equal(prone.parentInstanceId, r.instanceIds[0]);
  assert.equal(hero.concentration.active, false);
  assert.deepEqual(
    r.followUps.find((f) => f.kind === "end-concentration"),
    {
      kind: "end-concentration",
      actorId: "hero",
      concentrationId: "conc-1",
      reason: "unconscious",
    },
  );
  assert.ok(r.followUps.some((f) => f.kind === "reconcile-actor" && f.actorId === "hero"));
  assert.deepEqual(hero.heldItemIds, []);
  assert.deepEqual(
    hero.inventory.find((i) => i.id === "armor"),
    armor.find((i) => i.id === "armor"),
    "worn equipment is not dropped",
  );
  assert.deepEqual(
    hero.inventory.find((i) => i.id === "sword"),
    { ...armor.find((i) => i.id === "sword"), equipped: false, location: "ground" },
    "the known held sword falls to the ground",
  );
  assert.ok(r.rows.some((row) => row.field === "heldItemIds" && row.after.length === 0));
  change(s, "hero", { kind: "end", instanceId: r.instanceIds[0], reason: "Woke up" });
  assert.equal(c.hasCondition(hero, "unconscious"), false);
  assert.equal(c.hasCondition(hero, "prone"), true, "waking leaves Prone");

  const u = world();
  u.actors.hero.heldItemIds = null;
  const unknown = change(u, "hero", apply("unconscious")).r;
  const instanceId = unknown.instanceIds[0];
  assert.deepEqual(
    unknown.followUps.find((f) => f.kind === "held-items"),
    { kind: "held-items", actorId: "hero", instanceId },
  );
  let view = c.getConditionOverview(u, "hero", "player");
  assert.ok(
    view.instances.find((i) => i.instanceId === instanceId).permissions.canResolveHeldItems,
  );
  assert.ok(view.reconciliation.some((x) => x.code === "held-items"));
  change(u, "hero", { kind: "held-items", instanceId, itemIds: ["sword"], reason: "Sword fell" });
  assert.deepEqual(u.actors.hero.heldItemIds, []);
  view = c.getConditionOverview(u, "hero", "player");
  assert.ok(!view.reconciliation.some((x) => x.code === "held-items"));
});

test("ending one Unconscious cause keeps other causes and Prone", () => {
  const s = world(),
    hero = s.actors.hero;
  hero.conditions = [{ id: "unconscious", restId: "long-1", source: SRC }];
  const manual = change(s, "hero", apply("unconscious")).r.instanceIds[0];
  change(s, "hero", { kind: "end", instanceId: manual, reason: "Spell ended" });
  assert.equal(c.hasCondition(hero, "unconscious"), true);
  assert.equal(hero.conditions.find((x) => x.id === "unconscious").restId, "long-1");
  assert.ok(hero.conditions.some((x) => x.id === "prone"));
});

test("immunity: records warn when unknown, rule claims need data, known immunity blocks the rule", () => {
  const s = world(),
    hero = s.actors.hero;
  hero.conditionImmunities = null;
  const record = c.previewConditionChange(s, "hero", apply("poisoned"), "player");
  assert.equal(record.canApply, true);
  assert.ok(record.warnings.some((w) => w.code === "immunity-unknown"));
  const rule = c.previewConditionChange(s, "hero", apply("poisoned", { mode: "rule" }), "player");
  assert.equal(rule.canApply, false);
  assert.ok(rule.reconciliation.some((x) => x.code === "immunity-unknown"));
  assert.equal(
    c.previewConditionChange(
      s,
      "hero",
      apply("poisoned", { mode: "rule", immunityConfirmed: true }),
      "player",
    ).canApply,
    true,
  );
  hero.conditionImmunities = ["poisoned"];
  const blocked = c.previewConditionChange(
    s,
    "hero",
    apply("poisoned", { mode: "rule" }),
    "player",
  );
  assert.equal(blocked.errors[0].code, "immune");
  hero.conditionImmunities = [];
  change(s, "hero", apply("petrified"));
  assert.equal(
    c.previewConditionChange(s, "hero", apply("poisoned", { mode: "rule" }), "player").errors[0]
      .code,
    "immune",
    "Petrified grants Poisoned immunity",
  );
});

test("damage uses temporary HP first, then the explicit zero-HP policy and massive damage", () => {
  let s = world(),
    hero = s.actors.hero;
  hero.tempHp = 3;
  const hit = damage(s, "hero", 5);
  assert.deepEqual(
    [hit.breakdown.tempHpAbsorbed, hit.breakdown.hpLost, hero.hp, hero.tempHp],
    [3, 2, 4, 0],
  );
  s = world();
  hero = s.actors.hero;
  const down = damage(s, "hero", 17);
  assert.equal(hero.hp, 0);
  assert.equal(hero.dead, false);
  assert.deepEqual(causes(hero, "unconscious"), ["zero-hp"]);
  assert.ok(ids(hero).includes("prone"));
  assert.equal(hero.deathSaves.failures, 0, "the damage that drops to 0 is not a failure");
  assert.equal(hero.concentration.active, false);
  const endIndex = down.followUps.findIndex((f) => f.kind === "end-concentration");
  assert.ok(endIndex >= 0);
  assert.equal(down.breakdown.deadAfter, false);
  s = world();
  const massive = damage(s, "hero", 18);
  assert.equal(s.actors.hero.dead, true);
  assert.equal(massive.breakdown.massive, true);
  assert.ok(massive.followUps.some((f) => f.kind === "expire-vitality-requests"));
  s = world();
  damage(s, "ogre", 40);
  assert.equal(s.actors.ogre.dead, true, "the explicit monster policy dies at 0");
  s = world();
  delete s.actors.hero.vitalityPolicy;
  const unknown = damage(s, "hero", 6);
  assert.equal(s.actors.hero.hp, 0);
  assert.equal(s.actors.hero.dead, false);
  assert.ok(!ids(s.actors.hero).includes("unconscious"));
  assert.ok(unknown.reconciliation.some((x) => x.code === "zero-hp-policy"));
  for (const amount of ["5", -1, Number.NaN, 1.5])
    assert.throws(
      () => damage(s, "ally", amount),
      (e) => e.code === "amount",
    );
  assert.equal(s.actors.ally.hp, 10);
});

test("damage at zero adds failures once per event, critical two, even when temp HP absorb it", () => {
  const s = world(),
    hero = s.actors.hero;
  damage(s, "hero", 6);
  const event = { eventId: "at-zero-1", actorId: "hero", kind: "damage", amount: 1, source: SRC };
  const first = c.applyVitalityEvent(s, event);
  assert.equal(hero.deathSaves.failures, 1);
  assert.deepEqual(c.applyVitalityEvent(s, event), first);
  assert.equal(hero.deathSaves.failures, 1, "a retried event does not add another failure");
  assert.throws(
    () => c.applyVitalityEvent(s, { ...event, amount: 2 }),
    (e) => e.code === "id-conflict",
  );
  hero.tempHp = 5;
  damage(s, "hero", 2);
  assert.equal(hero.deathSaves.failures, 2);
  assert.equal(hero.tempHp, 3);
  damage(s, "hero", 1, { critical: true });
  assert.equal(hero.deathSaves.failures, 3, "counts stop at three");
  assert.equal(hero.dead, true);
  const zero = world();
  damage(zero, "hero", 6);
  damage(zero, "hero", 0);
  assert.equal(zero.actors.hero.deathSaves.failures, 0);
  damage(zero, "hero", 12);
  assert.equal(zero.actors.hero.dead, true, "damage at 0 equal to max HP kills");
});

// One death save per actual turn: the in-initiative trigger is bound to the turn identity.
const turnSave = (s, round) => {
  const turnKey = heroTurn(s, round);
  return c.describeDeathSave(s, "hero", { triggerId: "turn:" + turnKey, turnKey }, "player");
};
test("death saves are due at turn start, keep natural faces distinct and stabilize at three", () => {
  const s = world(),
    hero = s.actors.hero;
  damage(s, "hero", 6);
  const turn = heroTurn(s);
  assert.throws(
    () =>
      c.describeDeathSave(
        s,
        "hero",
        { triggerId: "turn:enc:9:hero", turnKey: "enc:9:hero" },
        "player",
      ),
    (e) => e.code === "not-due",
  );
  assert.throws(
    () => c.describeDeathSave(s, "hero", { triggerId: "t0", outsideInitiative: true }, "player"),
    (e) => e.code === "not-due",
  );
  assert.throws(
    () => c.describeDeathSave(s, "hero", { triggerId: "turn:" + turn, turnKey: turn }, "dm-x"),
    (e) => e.code === "unavailable",
  );
  assert.throws(
    () => c.describeDeathSave(s, "hero", { triggerId: "t1", turnKey: turn }, "player"),
    (e) => e.code === "not-due",
    "an in-initiative save is bound to its turn",
  );
  let d = turnSave(s, 1);
  assert.equal(d.kind, "death-save");
  assert.equal(d.triggerId, "turn:" + turn);
  assert.deepEqual(d.dice, [{ count: 1, sides: 20 }]);
  assert.equal(d.dc, 10);
  assert.equal(d.modifier, 0);
  assert.deepEqual(d.modifierSources, []);
  assert.equal(d.source.kind, "srd");
  assert.equal(d.originCampaignId, "camp");
  assert.deepEqual(c.getVitalityRollState(s, d, "player"), {
    needed: true,
    canResolve: true,
    reason: null,
    commit: { local: false, visibility: "shared" },
  });
  let r = c.applyVitalityRoll(s, { eventId: "roll-1", descriptor: d, values: [1] }, "player");
  assert.equal(r.outcome.natural, 1);
  assert.equal(hero.deathSaves.failures, 2, "natural 1 counts two failures");
  assert.deepEqual(
    c.applyVitalityRoll(s, { eventId: "roll-1", descriptor: d, values: [1] }, "player"),
    r,
  );
  assert.equal(hero.deathSaves.failures, 2);
  assert.equal(c.getVitalityRollState(s, d, "player").needed, false);
  assert.throws(
    () => turnSave(s, 1),
    (e) => e.code === "resolved",
    "one save per turn",
  );
  hero.deathSaves.failures = 0;
  hero.exhaustion = 2;
  d = turnSave(s, 2);
  assert.equal(d.modifier, -4);
  assert.equal(d.modifierSources[0].kind, "exhaustion");
  r = c.applyVitalityRoll(s, { eventId: "roll-2", descriptor: d, values: [12] }, "player");
  assert.deepEqual([r.outcome.natural, r.outcome.total, r.outcome.success], [12, 8, false]);
  assert.equal(hero.deathSaves.failures, 1);
  assert.throws(
    () =>
      c.applyVitalityRoll(
        s,
        { eventId: "roll-bad", descriptor: turnSave(s, 3), values: [21] },
        "player",
      ),
    (e) => e.code === "values",
  );
  hero.exhaustion = 0;
  for (const [i, face] of [14, 10, 19].entries()) {
    const next = turnSave(s, 4 + i);
    r = c.applyVitalityRoll(s, { eventId: "ok-" + i, descriptor: next, values: [face] }, "player");
  }
  assert.deepEqual(
    { ...hero.deathSaves, recovery: !!hero.deathSaves.recovery },
    { successes: 0, failures: 0, stable: true, recovery: true },
  );
  assert.equal(hero.hp, 0);
  assert.deepEqual(causes(hero, "unconscious"), ["zero-hp"], "stable keeps 0 HP Unconscious");
  const request = r.followUps.find((f) => f.kind === "request-stable-recovery");
  assert.equal(request.stabilityId, hero.deathSaves.recovery.stabilityId);
  assert.throws(
    () => turnSave(s, 7),
    (e) => e.code === "not-due",
  );
});

test("natural 20 restores 1 HP, ends only the zero-HP cause, and three failures kill", () => {
  const s = world(),
    hero = s.actors.hero;
  hero.conditions = [{ id: "unconscious", restId: "long-1", source: SRC }];
  damage(s, "hero", 6);
  const d = turnSave(s, 1);
  const r = c.applyVitalityRoll(s, { eventId: "n20-roll", descriptor: d, values: [20] }, "player");
  assert.equal(r.outcome.natural, 20);
  assert.equal(hero.hp, 1);
  assert.deepEqual(hero.deathSaves, { successes: 0, failures: 0, stable: false, recovery: null });
  assert.deepEqual(causes(hero, "unconscious"), ["sleep"]);
  assert.ok(ids(hero).includes("prone"));
  const dead = world();
  damage(dead, "hero", 6);
  dead.actors.hero.deathSaves.failures = 2;
  const last = turnSave(dead, 1);
  const out = c.applyVitalityRoll(
    dead,
    { eventId: "x-roll", descriptor: last, values: [3] },
    "player",
  );
  assert.equal(dead.actors.hero.dead, true);
  assert.ok(out.followUps.some((f) => f.kind === "expire-vitality-requests"));
});

test("healing before a pending death save expires it without inventing a face", () => {
  const s = world(),
    hero = s.actors.hero;
  damage(s, "hero", 6);
  const d = c.describeDeathSave(
    s,
    "hero",
    { triggerId: "outside", outsideInitiative: true },
    "player",
  );
  const healed = heal(s, "hero", 2);
  assert.ok(healed.followUps.some((f) => f.kind === "expire-vitality-requests"));
  assert.equal(hero.hp, 2);
  assert.deepEqual(causes(hero, "unconscious"), []);
  assert.ok(ids(hero).includes("prone"), "healing does not stand the creature up");
  const state = c.getVitalityRollState(s, d, "player");
  assert.equal(state.needed, false);
  assert.equal(state.reason.code, "not-at-zero");
  const r = c.applyVitalityRoll(s, { eventId: "late", descriptor: d, values: [15] }, "player");
  assert.equal(r.outcome.status, "expired");
  assert.equal(r.outcome.natural, null);
  assert.deepEqual(hero.deathSaves, { successes: 0, failures: 0, stable: false, recovery: null });
});

test("stable recovery uses a d4 of narrative hours and new damage cancels stability", () => {
  const s = world(),
    hero = s.actors.hero;
  damage(s, "hero", 6);
  Object.assign(hero.deathSaves, { successes: 2 });
  const d = c.describeDeathSave(s, "hero", { triggerId: "st", outsideInitiative: true }, "player");
  c.applyVitalityRoll(s, { eventId: "st-roll", descriptor: d, values: [11] }, "player");
  assert.equal(hero.deathSaves.stable, true);
  assert.deepEqual(
    { ...hero.deathSaves.recovery, stabilityId: undefined },
    {
      stabilityId: undefined,
      clockId: "camp",
      startedAt: 3600,
      expiresAt: null,
      originCampaignId: "camp",
      owner: "player",
    },
  );
  const recovery = c.describeStableRecovery(s, "hero", "player");
  assert.deepEqual(recovery.dice, [{ count: 1, sides: 4 }]);
  assert.equal(recovery.kind, "stable-recovery");
  c.applyVitalityRoll(s, { eventId: "d4", descriptor: recovery, values: [3] }, "player");
  assert.equal(hero.deathSaves.recovery.expiresAt, 3600 + 3 * 3600);
  assert.equal(c.getVitalityRollState(s, recovery, "player").needed, false);
  s.restTime.clocks.camp.seconds = 10000;
  c.observeConditionEvent(s, { eventId: "clk-a", kind: "clock", clockId: "camp" });
  assert.equal(hero.hp, 0);
  s.restTime.clocks.camp.seconds = 14400;
  c.observeConditionEvent(s, { eventId: "clk-b", kind: "clock", clockId: "camp" });
  assert.equal(hero.hp, 1);
  assert.deepEqual(hero.deathSaves, { successes: 0, failures: 0, stable: false, recovery: null });
  assert.deepEqual(causes(hero, "unconscious"), []);
  const hurt = world();
  damage(hurt, "hero", 6);
  Object.assign(hurt.actors.hero.deathSaves, { successes: 2 });
  const d2 = c.describeDeathSave(
    hurt,
    "hero",
    { triggerId: "st", outsideInitiative: true },
    "player",
  );
  c.applyVitalityRoll(hurt, { eventId: "st2", descriptor: d2, values: [11] }, "player");
  const again = damage(hurt, "hero", 1);
  assert.deepEqual(hurt.actors.hero.deathSaves, {
    successes: 0,
    failures: 1,
    stable: false,
    recovery: null,
  });
  assert.ok(again.followUps.some((f) => f.kind === "expire-vitality-requests"));
});

test("knockout 2024 leaves 1 HP, its own Unconscious cause and a short-rest follow-up", () => {
  const s = world(),
    hero = s.actors.hero;
  hero.conditions = [{ id: "unconscious", restId: "long-1", source: SRC }];
  const r = c.applyVitalityEvent(s, {
    eventId: "ko-1",
    actorId: "hero",
    kind: "damage",
    amount: 30,
    source: SRC,
    knockout: { melee: true },
  });
  assert.equal(hero.hp, 1);
  assert.equal(hero.dead, false);
  assert.equal(r.breakdown.knockout, true);
  assert.deepEqual(causes(hero, "unconscious").sort(), ["knockout", "sleep"]);
  const ko = hero.conditions.find((x) => x.cause === "knockout");
  assert.deepEqual(ko.term, {
    kind: "rest",
    actorId: "hero",
    restKind: "short",
    restId: "knockout:ko-1",
  });
  assert.deepEqual(
    r.followUps.find((f) => f.kind === "start-knockout-rest"),
    { kind: "start-knockout-rest", actorId: "hero", restId: "knockout:ko-1", clockId: "camp" },
  );
  assert.deepEqual(hero.deathSaves, { successes: 0, failures: 0, stable: false, recovery: null });
  c.observeConditionEvent(s, {
    eventId: "ko-rest",
    kind: "rest",
    restId: "knockout:ko-1",
    restKind: "short",
    actorIds: ["hero"],
  });
  assert.deepEqual(causes(hero, "unconscious"), ["sleep"]);
  assert.ok(ids(hero).includes("prone"));
  const h = world();
  c.applyVitalityEvent(h, {
    eventId: "ko-2",
    actorId: "hero",
    kind: "damage",
    amount: 9,
    source: SRC,
    knockout: { melee: true },
  });
  heal(h, "hero", 3);
  assert.equal(h.actors.hero.hp, 4);
  assert.deepEqual(causes(h.actors.hero, "unconscious"), []);
  assert.ok(ids(h.actors.hero).includes("prone"));
  const pub = world();
  const warn = c.previewVitalityChange(
    pub,
    "hero",
    { kind: "damage", amount: 2, reason: "Punch", source: SRC, knockout: true },
    "player",
  );
  assert.ok(warn.warnings.some((w) => w.code === "knockout-not-needed"));
});

test("ordinary healing cannot resurrect and correction is not damage, healing or resurrection", () => {
  const s = world(),
    hero = s.actors.hero;
  damage(s, "hero", 18);
  assert.equal(hero.dead, true);
  const p = c.previewVitalityChange(
    s,
    "hero",
    { kind: "heal", amount: 5, reason: "Potion", source: SRC },
    "player",
  );
  assert.equal(p.canApply, false);
  assert.equal(p.errors[0].code, "dead");
  assert.throws(
    () => heal(s, "hero", 5),
    (e) => e.code === "dead",
  );
  const missing = c.previewVitalityChange(
    s,
    "hero",
    { kind: "correct", patch: { dead: false }, reason: "", source: SRC },
    "player",
  );
  assert.equal(missing.errors[0].code, "reason");
  const events = s.conditionEvents.length;
  const { p: fix } = vital(s, "hero", {
    kind: "correct",
    patch: { dead: false, hp: 3 },
    reason: "Wrong target",
    source: SRC,
  });
  assert.ok(fix.warnings.some((w) => w.code === "correction-not-resurrection"));
  assert.equal(hero.dead, false);
  assert.equal(hero.hp, 3);
  assert.equal(hero.deathSaves.failures, 0);
  assert.equal(s.conditionEvents.length, events + 1);
  assert.equal(s.conditionEvents.at(-1).kind, "vitality-correct");
  const temp = world();
  damage(temp, "hero", 6);
  vital(temp, "hero", { kind: "correct", patch: { tempHp: 5 }, reason: "False Life", source: SRC });
  assert.equal(temp.actors.hero.hp, 0);
  assert.deepEqual(causes(temp.actors.hero, "unconscious"), ["zero-hp"], "temp HP do not wake");
  const view = c.getConditionOverview(temp, "hero", "player");
  assert.equal(view.vitality, "dying");
  assert.equal(view.permissions.canRequestDeathSave, true);
});

test("Medicine aid spends the Help action once and stabilizes without healing", () => {
  const s = world(),
    hero = s.actors.hero,
    ally = s.actors.ally;
  damage(s, "hero", 6);
  Object.assign(s.combat, { active: true, turn: 1 });
  const input = { actorId: "ally", targetId: "hero", kind: "stabilize" };
  const before = structuredClone(s);
  const p = c.previewAid(s, input, "player");
  assert.deepEqual(s, before);
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  assert.deepEqual(
    p.costs.map(({ kind, actorId, before, after }) => ({ kind, actorId, before, after })),
    [{ kind: "action", actorId: "ally", before: true, after: false }],
  );
  const r = c.beginAid(s, input, "player", { operationId: "aid-1", reviewKey: p.reviewKey });
  assert.equal(ally.action, false);
  assert.equal(r.descriptor.kind, "medicine");
  assert.equal(r.descriptor.dc, 10);
  assert.equal(r.descriptor.modifier, 4);
  assert.deepEqual(r.descriptor.dice, [{ count: 1, sides: 20 }]);
  const events = s.conditionEvents.length;
  assert.deepEqual(c.beginAid(s, input, "player", { operationId: "aid-1", reviewKey: "x" }), r);
  assert.equal(s.conditionEvents.length, events);
  const miss = c.applyVitalityRoll(
    s,
    { eventId: "med-1", descriptor: r.descriptor, values: [5] },
    "player",
  );
  assert.equal(miss.outcome.success, false);
  assert.equal(hero.deathSaves.stable, false);
  assert.equal(c.previewAid(s, input, "player").errors[0].code, "action");
  ally.action = true;
  const p2 = c.previewAid(s, input, "player");
  const r2 = c.beginAid(s, input, "player", { operationId: "aid-2", reviewKey: p2.reviewKey });
  const hit = c.applyVitalityRoll(
    s,
    { eventId: "med-2", descriptor: r2.descriptor, values: [6] },
    "player",
  );
  assert.deepEqual([hit.outcome.total, hit.outcome.success], [10, true]);
  assert.equal(hero.deathSaves.stable, true);
  assert.equal(hero.hp, 0, "stabilizing does not heal");
  assert.ok(hit.followUps.some((f) => f.kind === "request-stable-recovery"));
  const notTurn = c.previewAid(world(), input, "player");
  assert.equal(notTurn.errors[0].code, "not-dying");
  const nodata = world();
  damage(nodata, "hero", 6);
  delete nodata.actors.ally.skills;
  assert.equal(c.previewAid(nodata, input, "player").errors[0].code, "medicine-unknown");
  nodata.combat.active = true;
  nodata.actors.ally.skills = ["medicine"];
  assert.equal(c.previewAid(nodata, input, "player").errors[0].code, "turn");
});

test("first aid ends only the knockout cause", () => {
  const s = world(),
    hero = s.actors.hero;
  c.applyVitalityEvent(s, {
    eventId: "ko-9",
    actorId: "hero",
    kind: "damage",
    amount: 9,
    source: SRC,
    knockout: { melee: true },
  });
  const input = { actorId: "ally", targetId: "hero", kind: "wake-knockout" };
  const p = c.previewAid(s, input, "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  const r = c.beginAid(s, input, "player", { operationId: "wake-1", reviewKey: p.reviewKey });
  assert.equal(s.actors.ally.action, true, "outside initiative no action is spent");
  c.applyVitalityRoll(s, { eventId: "wake-roll", descriptor: r.descriptor, values: [8] }, "player");
  assert.deepEqual(causes(hero, "unconscious"), []);
  assert.ok(ids(hero).includes("prone"));
  assert.equal(hero.hp, 1);
});

test("exhaustion is one canonical level; level 6 kills with an explained event", () => {
  const s = world(),
    hero = s.actors.hero;
  const bad = c.previewConditionChange(
    s,
    "hero",
    { kind: "exhaustion", level: 7, reason: "x", source: SRC },
    "player",
  );
  assert.equal(bad.errors[0].code, "level");
  assert.equal(
    c.previewConditionChange(s, "hero", apply("exhaustion"), "player").errors[0].code,
    "exhaustion-level",
  );
  change(s, "hero", { kind: "exhaustion", level: 2, reason: "Forced march", source: SRC });
  assert.equal(hero.exhaustion, 2);
  assert.ok(!ids(hero).includes("exhaustion"));
  assert.equal(c.getConditionMechanics(hero).d20Penalty, 4);
  const { r } = change(s, "hero", {
    kind: "exhaustion",
    level: 6,
    reason: "No water",
    source: SRC,
  });
  assert.equal(hero.dead, true);
  assert.equal(hero.concentration.active, false);
  assert.ok(r.followUps.some((f) => f.kind === "end-concentration"));
  const history = c.getConditionHistory(s, "hero", "player").filter((h) => h.kind === "exhaustion");
  assert.deepEqual(
    history.map((h) => h.reason),
    ["Forced march", "No water"],
  );
  assert.ok(history[1].rows.some((row) => row.field === "dead" && row.after === true));
  assert.equal(c.getConditionOverview(s, "hero", "player").vitality, "dead");
});

test("custom labels carry no inferred rules and corrections keep the source", () => {
  const s = world(),
    hero = s.actors.hero;
  const { r } = change(s, "hero", {
    kind: "custom",
    label: "Poisoned",
    term: { kind: "manual" },
    source: SRC,
    reason: "Table marker",
  });
  assert.equal(c.hasCondition(hero, "poisoned"), false);
  assert.deepEqual(c.getConditionMechanics(hero).attackDisadvantage, []);
  const view = c.getConditionOverview(s, "hero", "player");
  const custom = view.instances.find((i) => i.custom);
  assert.equal(custom.name.en, "Poisoned");
  const id = r.instanceIds[0];
  change(s, "hero", {
    kind: "correct",
    instanceId: id,
    patch: { term: { kind: "clock", clockId: "camp", expiresAt: 5400 } },
    reason: "One more half hour",
  });
  const stored = hero.conditions.find((x) => x.instanceId === id);
  assert.deepEqual(stored.term, { kind: "clock", clockId: "camp", expiresAt: 5400 });
  assert.deepEqual(stored.source, SRC);
  const bad = c.previewConditionChange(
    s,
    "hero",
    { kind: "correct", instanceId: id, patch: {}, reason: "x" },
    "player",
  );
  assert.equal(bad.canApply, false);
});

test("trusted condition events apply sourced consequences once and end by rest or cause", () => {
  const s = world(),
    ogre = s.actors.ogre;
  const bite = {
    eventId: "bite-1",
    kind: "apply",
    actorId: "ogre",
    conditionId: "prone",
    source: SRC,
    origin: { actorId: "hero", label: "Wolf Bite" },
  };
  const r = c.applyConditionEvent(s, bite);
  assert.equal(r.applied, true);
  assert.deepEqual(r.instanceIds, ["bite-1:prone"]);
  assert.equal(c.hasCondition(ogre, "prone"), true);
  assert.equal(ogre.conditions[0].owner, "system");
  assert.equal(ogre.conditions[0].mode, "rule");
  assert.deepEqual(c.applyConditionEvent(s, bite), r);
  assert.equal(ogre.conditions.length, 1);
  assert.throws(
    () => c.applyConditionEvent(s, { ...bite, conditionId: "poisoned" }),
    (e) => e.code === "id-conflict",
  );
  ogre.conditionImmunities = null;
  const unknown = c.applyConditionEvent(s, { ...bite, eventId: "bite-2" });
  assert.equal(unknown.applied, false);
  assert.ok(unknown.reconciliation.some((x) => x.code === "immunity-unknown"));
  assert.equal(ogre.conditions.length, 1, "an unverified rule is not claimed as applied");
  ogre.conditionImmunities = ["prone"];
  assert.equal(
    c.applyConditionEvent(s, { ...bite, eventId: "bite-3" }).reconciliation[0].code,
    "immune",
  );
  const hero = s.actors.hero;
  const sleep = c.applyConditionEvent(s, {
    eventId: "sleep-1",
    kind: "apply",
    actorId: "hero",
    conditionId: "unconscious",
    source: SRC,
    restId: "long-9",
    cause: "sleep",
  });
  assert.deepEqual(ids(hero).sort(), ["prone", "unconscious"]);
  assert.ok(sleep.followUps.some((f) => f.kind === "end-concentration"));
  c.applyConditionEvent(s, {
    eventId: "wake-1",
    kind: "end",
    actorId: "hero",
    restId: "long-9",
    source: SRC,
    reason: "Woke",
  });
  assert.deepEqual(ids(hero), ["prone"], "waking ends only its rest cause and leaves Prone");
  assert.ok(
    c.getConditionHistory(s, "hero", "player").some((h) => h.kind === "end" && h.reason === "Woke"),
  );
});
