import test from "node:test";
import assert from "node:assert/strict";
import { ruleSource } from "../character-rules.mjs";
const f = await import("../forms-companions.mjs").catch(() => ({}));
const api = () => assert.equal(typeof f.previewWildShape, "function", "forms domain exists");
const source = { kind: "authored-demo", edition: "2024", revision: "forms-test" };
function state() {
  const hero = {
    id: "hero",
    name: "Druid",
    kind: "character",
    owner: "player",
    visibility: "shared",
    campaignIds: ["camp"],
    controllers: [],
    hp: 12,
    maxHp: 24,
    tempHp: 0,
    ac: 14,
    speed: 9,
    movement: 3,
    movementSpent: 6,
    dashCount: 0,
    action: true,
    bonus: true,
    reaction: false,
    level: 5,
    proficiencyBonus: 3,
    size: "medium",
    creatureType: "humanoid",
    abilities: { str: 10, dex: 12, con: 14, int: 11, wis: 16, cha: 8 },
    savingThrows: { str: 0, dex: 1, con: 2, int: 3, wis: 6, cha: -1 },
    conditions: [],
    notes: "private plan",
    spellSlots: { 1: { max: 4, used: 2 } },
    features: [{ id: "shape", definitionId: "druid:wild-shape", max: 2, used: 1, source }],
    inventory: [
      { id: "incense", name: "Incense", quantity: 2 },
      { id: "staff", name: "Staff", quantity: 1, equipped: true },
    ],
    combatProfile: { team: "party", spells: ["fire-bolt"], weaponProficiencies: ["quarterstaff"] },
    formsProfile: {
      druidLevel: 3,
      wildShapeFeatureId: "shape",
      knownForms: ["srd2024:wolf", "srd2024:cat", "srd2024:rat"],
      knownFormsInitialized: true,
      savingThrowProficiencies: ["int", "wis"],
      skillProficiencies: [{ id: "perception", ability: "wis", multiplier: 1 }],
      familiarCasting: { spellId: "find-familiar", prepared: true, ritualFromBook: false, source },
      source,
    },
  };
  hero.slots = hero.spellSlots[1];
  return {
    campaign: {
      id: "camp",
      members: [
        { id: "player", role: "player" },
        { id: "reader", role: "player" },
        { id: "dm", role: "dm" },
      ],
    },
    actors: { hero },
    scenes: [{ id: "scene", tokens: [], gridSize: 50, metersPerCell: 1.5 }],
    activeSceneId: "scene",
    combat: {
      active: false,
      order: [],
      turn: 0,
      round: 1,
      attempts: [],
      movements: [],
      reactions: [],
    },
    restTime: {
      version: 1,
      clocks: { camp: { seconds: 0, revision: 0 } },
      rests: [],
      rolls: [],
      events: [],
    },
  };
}
const selectShape = (profileId = "srd2024:wolf") => ({
  profileId,
  tempHpChoice: "replace",
  equipment: [
    { itemId: "incense", disposition: "merge" },
    { itemId: "staff", disposition: "drop" },
  ],
});
function apply(s, preview, mutation, id, selection, op = "op", viewer = "player") {
  const p = preview(s, id, selection, viewer);
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  return mutation(s, id, selection, viewer, { reviewKey: p.reviewKey, operationId: op });
}
const castSelection = (mode = "slot") => ({
  profileId: "srd2024:cat",
  name: "Moss",
  creatureType: "fey",
  mode,
  slotLevel: 1,
  material: { itemId: "incense", quantity: 1, unitValueGp: 10, incenseConfirmed: true },
});
function elapse(s, seconds) {
  s.restTime.clocks.camp.seconds += seconds;
  s.restTime.clocks.camp.revision += 1;
  f.observeFormsEvent(s, {
    eventId: "time-" + s.restTime.clocks.camp.seconds,
    cause: "time",
    actorIds: ["hero"],
  });
}

test("shape preview is pure; physical overlay retains mental stats, proficiencies and canonical resources", () => {
  api();
  const s = state(),
    before = JSON.stringify(s),
    selection = selectShape();
  const p = f.previewWildShape(s, "hero", selection, "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  assert.equal(JSON.stringify(s), before);
  apply(s, f.previewWildShape, f.applyWildShape, "hero", selection);
  const live = s.actors.hero,
    effective = f.getEffectiveActor(live);
  assert.equal(live.ac, 14);
  assert.equal(live.speed, 9);
  assert.equal(live.abilities.con, 14);
  assert.equal(effective.ac, 12);
  assert.equal(effective.speed, 12);
  assert.equal(effective.abilities.con, 12);
  assert.equal(effective.abilities.wis, 16);
  assert.equal(effective.savingThrows.wis, 6);
  assert.equal(effective.skillModifiers.perception, 6);
  assert.equal(live.hp, 12);
  assert.equal(live.tempHp, 3);
  assert.equal(live.features[0].used, 2);
  assert.equal(live.movement, 6);
  assert.equal(live.reaction, false);
  assert.equal(effective.combatProfile.spells.length, 0);
});

test("ordinary return retains damage, spent slots, corrections, notes, conditions and concentration", () => {
  api();
  const s = state();
  apply(s, f.previewWildShape, f.applyWildShape, "hero", selectShape());
  const a = s.actors.hero;
  a.hp = 10;
  a.tempHp = 0;
  a.slots.used = 3;
  a.ac = 17;
  a.notes = "new";
  a.conditions.push("poisoned");
  a.concentration = { id: "focus", active: true };
  a.inventory[0].quantity = 1;
  apply(s, f.previewFormReturn, f.returnToNormalForm, "hero", { mode: "normal" }, "return");
  assert.equal(a.activeForm, null);
  assert.equal(a.hp, 10);
  assert.equal(a.ac, 17);
  assert.equal(a.slots.used, 3);
  assert.equal(a.features[0].used, 2);
  assert.equal(a.notes, "new");
  assert.deepEqual(a.conditions, ["poisoned"]);
  assert.equal(a.concentration.active, true);
  assert.equal(a.inventory[0].quantity, 1);
  assert.equal(a.inventory[1].location, "ground");
  assert.equal(a.movement, 3);
});

test("temporary HP choice is explicit, not additive, and remaining Wild Shape HP survive return", () => {
  api();
  const s = state();
  s.actors.hero.tempHp = 8;
  s.actors.hero.tempHpSource = { id: "prior" };
  const selection = selectShape();
  delete selection.tempHpChoice;
  assert.equal(f.previewWildShape(s, "hero", selection, "player").canApply, false);
  selection.tempHpChoice = "keep";
  apply(s, f.previewWildShape, f.applyWildShape, "hero", selection);
  assert.equal(s.actors.hero.tempHp, 8);
  assert.equal(s.actors.hero.tempHpSource.id, "prior");
  apply(s, f.previewFormReturn, f.returnToNormalForm, "hero", { mode: "normal" }, "back");
  assert.equal(s.actors.hero.tempHp, 8);
});

test("shape uses druid level, known forms, explicit equipment and current turn resources", () => {
  api();
  const s = state();
  s.actors.hero.formsProfile.knownForms = ["srd2024:cat"];
  assert.equal(f.previewWildShape(s, "hero", selectShape(), "player").canApply, false);
  const sel = selectShape("srd2024:cat");
  sel.equipment[1] = { itemId: "staff", disposition: "wear" };
  assert.equal(f.previewWildShape(s, "hero", sel, "player").canApply, false);
  sel.equipment[1].wearApproved = true;
  s.combat = { ...s.combat, active: true, order: ["hero"], turn: 0 };
  s.actors.hero.bonus = false;
  assert.equal(f.previewWildShape(s, "hero", sel, "player").canApply, false);
  s.actors.hero.bonus = true;
  apply(s, f.previewWildShape, f.applyWildShape, "hero", sel);
  assert.equal(s.actors.hero.bonus, false);
  assert.equal(s.actors.hero.activeForm.expiresAt, 3600);
});

test("movement spent survives low-speed clamp, Dash and later restoration", () => {
  api();
  const a = state().actors.hero;
  a.movementSpent = 15;
  a.dashCount = 1;
  assert.equal(f.getEffectiveMovementBudget(a, 9, 6), 0);
  assert.equal(f.getEffectiveMovementBudget(a, 6, 12), 9);
});

test("clock/incapacity ends only form and preserves tempHP; hp zero alone is not death", () => {
  api();
  const s = state();
  apply(s, f.previewWildShape, f.applyWildShape, "hero", selectShape());
  s.actors.hero.hp = 0;
  f.observeFormsEvent(s, { eventId: "zero", cause: "actor-status", actorIds: ["hero"] });
  assert.ok(s.actors.hero.activeForm);
  s.actors.hero.conditions.push("incapacitated");
  f.observeFormsEvent(s, { eventId: "incap", cause: "actor-status", actorIds: ["hero"] });
  assert.equal(s.actors.hero.activeForm, null);
  assert.equal(s.actors.hero.tempHp, 3);
  const t = state();
  apply(t, f.previewWildShape, f.applyWildShape, "hero", selectShape());
  elapse(t, 3600);
  assert.equal(t.actors.hero.activeForm, null);
});

test("manual companions have independent identity, no automatic token/initiative and no parent leak", () => {
  api();
  const s = state(),
    selection = { mode: "manual", profileId: "srd2024:cat", name: "Cat" };
  const one = apply(s, f.previewCompanionCreation, f.createCompanion, "hero", selection, "first");
  const two = apply(s, f.previewCompanionCreation, f.createCompanion, "hero", selection, "second");
  assert.notEqual(one.actorId, two.actorId);
  s.actors[one.actorId].hp = 1;
  assert.equal(s.actors[two.actorId].hp, 2);
  assert.equal(s.scenes[0].tokens.length, 0);
  assert.deepEqual(s.combat.order, []);
  assert.equal(s.actors[one.actorId].notes, "");
  assert.equal(
    JSON.stringify(f.getCompanion(s, one.actorId, "player")).includes("private plan"),
    false,
  );
});

test("Wild Companion spends only selected resource once and ends only on parent's long rest", () => {
  api();
  const s = state(),
    selection = {
      mode: "wild-companion",
      profileId: "srd2024:cat",
      name: "Moss",
      cost: { kind: "wild-shape" },
      appearance: { kind: "attested", confirmed: true },
    };
  const p = f.previewCompanionCreation(s, "hero", selection, "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  const opt = { reviewKey: p.reviewKey, operationId: "wild" };
  const result = f.createCompanion(s, "hero", selection, "player", opt);
  f.createCompanion(s, "hero", selection, "player", opt);
  assert.equal(s.actors.hero.features[0].used, 2);
  assert.equal(s.actors.hero.slots.used, 2);
  assert.equal(s.actors[result.actorId].companion.attacksAllowed, false);
  f.observeFormsEvent(s, {
    eventId: "other-rest",
    cause: "long-rest",
    actorIds: ["other"],
    restId: "r1",
  });
  assert.equal(s.actors[result.actorId].companion.lifecycle, "available");
  f.observeFormsEvent(s, {
    eventId: "own-rest",
    cause: "long-rest",
    actorIds: ["hero"],
    restId: "r2",
  });
  assert.equal(s.actors[result.actorId].companion.lifecycle, "expired");
});

test("ordinary casting is long, costs only on completion, retry/reload creates a single familiar", () => {
  api();
  let s = state();
  const start = apply(
    s,
    f.previewFamiliarCasting,
    f.startFamiliarCasting,
    "hero",
    castSelection(),
    "cast",
  );
  assert.equal(s.actors.hero.slots.used, 2);
  assert.equal(s.actors.hero.inventory[0].quantity, 2);
  assert.equal(s.actors.hero.concentration.active, true);
  assert.equal(
    f.previewFamiliarCompletion(
      s,
      start.castingId,
      { appearance: { kind: "attested", confirmed: true } },
      "player",
    ).canApply,
    false,
  );
  elapse(s, 3600);
  s = JSON.parse(JSON.stringify(s));
  const p = f.previewFamiliarCompletion(
    s,
    start.castingId,
    { appearance: { kind: "attested", confirmed: true } },
    "player",
  );
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  const options = { reviewKey: p.reviewKey, operationId: "finish" };
  const result = f.completeFamiliarCasting(
    s,
    start.castingId,
    { appearance: { kind: "attested", confirmed: true } },
    "player",
    options,
  );
  f.completeFamiliarCasting(
    s,
    start.castingId,
    { appearance: { kind: "attested", confirmed: true } },
    "player",
    options,
  );
  assert.equal(s.actors.hero.spellSlots[1].used, 3);
  assert.equal(s.actors.hero.slots.used, 3);
  assert.equal(s.actors.hero.inventory[0].quantity, 1);
  assert.equal(s.actors.hero.concentration.active, false);
  assert.equal(f.listCompanions(s, "hero", "player").length, 1);
  assert.equal(s.actors[result.actorId].hp, 2);
});

test("concentration failure loses progress without slot/material payment; ritual takes 70 minutes", () => {
  api();
  const s = state();
  const r = apply(
    s,
    f.previewFamiliarCasting,
    f.startFamiliarCasting,
    "hero",
    castSelection(),
    "cast",
  );
  elapse(s, 1800);
  s.actors.hero.concentration.active = false;
  f.observeFormsEvent(s, { eventId: "lost", cause: "concentration", actorIds: ["hero"] });
  assert.equal(f.getFamiliarCasting(s, r.castingId, "player").status, "failed");
  assert.equal(s.actors.hero.slots.used, 2);
  assert.equal(s.actors.hero.inventory[0].quantity, 2);
  const next = apply(
    s,
    f.previewFamiliarCasting,
    f.startFamiliarCasting,
    "hero",
    castSelection("ritual"),
    "ritual",
  );
  elapse(s, 3600);
  assert.equal(
    f.previewFamiliarCompletion(
      s,
      next.castingId,
      { appearance: { kind: "attested", confirmed: true } },
      "player",
    ).canApply,
    false,
  );
  elapse(s, 600);
  apply(
    s,
    f.previewFamiliarCompletion,
    f.completeFamiliarCasting,
    next.castingId,
    { appearance: { kind: "attested", confirmed: true } },
    "done",
  );
  assert.equal(s.actors.hero.slots.used, 2);
  assert.equal(s.actors.hero.inventory[0].quantity, 1);
});

test("familiar dismiss/reappear preserves life, destruction requires a cast, no resource refill on recast", () => {
  api();
  const s = state();
  const selection = {
    mode: "wild-companion",
    profileId: "srd2024:cat",
    name: "Moss",
    cost: { kind: "slot", level: 1 },
    appearance: { kind: "attested", confirmed: true },
  };
  const r = apply(s, f.previewCompanionCreation, f.createCompanion, "hero", selection, "summon");
  const a = s.actors[r.actorId];
  a.hp = 1;
  a.reaction = false;
  apply(
    s,
    f.previewCompanionCommand,
    f.applyCompanionCommand,
    a.id,
    { command: "dismiss" },
    "dismiss",
  );
  apply(
    s,
    f.previewCompanionCommand,
    f.applyCompanionCommand,
    a.id,
    { command: "reappear", appearance: { kind: "attested", confirmed: true } },
    "back",
  );
  assert.equal(a.hp, 1);
  assert.equal(a.reaction, false);
  a.hp = 0;
  f.observeFormsEvent(s, { eventId: "dead", cause: "actor-status", actorIds: [a.id] });
  assert.equal(a.companion.lifecycle, "destroyed");
  assert.equal(
    f.previewCompanionCommand(
      s,
      a.id,
      { command: "reappear", appearance: { kind: "attested", confirmed: true } },
      "player",
    ).canApply,
    false,
  );
});

test("current membership, private ownership, offline and stale resource review are revalidated", () => {
  api();
  const s = state(),
    sel = selectShape();
  const p = f.previewWildShape(s, "hero", sel, "player");
  assert.throws(() =>
    f.applyWildShape(s, "hero", sel, "player", {
      operationId: "offline",
      reviewKey: p.reviewKey,
      online: false,
    }),
  );
  s.actors.hero.features[0].used = 2;
  assert.throws(() =>
    f.applyWildShape(s, "hero", sel, "player", { operationId: "stale", reviewKey: p.reviewKey }),
  );
  s.campaign.members[0].active = false;
  assert.throws(() => f.getFormsOverview(s, "hero", "player"));
  s.actors.hero.visibility = "private";
  s.actors.hero.campaignIds = [];
  assert.throws(() => f.getFormsOverview(s, "hero", "dm"));
  assert.equal(f.getFormsOverview(s, "hero", "player").commit.local, true);
});

test("known form replacement requires a personal long-rest opportunity, not a different actor's rest", () => {
  api();
  const s = state();
  s.actors.hero.formsProfile.knownForms = ["srd2024:cat"];
  const selection = { mode: "replace", profileIds: ["srd2024:wolf"] };
  assert.equal(f.previewKnownForms(s, "hero", selection, "player").canApply, false);
  f.observeFormsEvent(s, { eventId: "rest", cause: "long-rest", actorIds: ["hero"], restId: "r1" });
  apply(s, f.previewKnownForms, f.setKnownForms, "hero", selection, "learn");
  assert.deepEqual(s.actors.hero.formsProfile.knownForms, ["srd2024:wolf"]);
  assert.equal(
    f.previewKnownForms(s, "hero", { mode: "replace", profileIds: ["srd2024:rat"] }, "player")
      .canApply,
    false,
  );
  f.observeFormsEvent(s, {
    eventId: "rest-retry-new-id",
    cause: "long-rest",
    actorIds: ["hero"],
    restId: "r1",
  });
  assert.equal(
    f.previewKnownForms(s, "hero", { mode: "replace", profileIds: ["srd2024:rat"] }, "player")
      .canApply,
    false,
  );
});

test("acquired beast proficiencies use the actor's proficiency bonus; combat profile uses canonical meleeAttack", () => {
  api();
  const s = state();
  s.actors.hero.formsProfile.skillProficiencies = [];
  apply(s, f.previewWildShape, f.applyWildShape, "hero", selectShape("srd2024:cat"));
  const e = f.getEffectiveActor(s.actors.hero);
  assert.equal(e.savingThrows.dex, 5);
  assert.equal(e.skillModifiers.perception, 6);
  assert.equal(e.combatProfile.meleeAttack.fixedDamage, 1);
  assert.equal(e.combatProfile.meleeAttack.source.sha256.length, 64);
});

test("owning a creature does not grant the delegate its private parent; revoked controller cannot retry", () => {
  api();
  const s = state();
  const c = apply(
    s,
    f.previewCompanionCreation,
    f.createCompanion,
    "hero",
    { mode: "manual", profileId: "srd2024:cat", name: "Cat" },
    "cat",
  );
  apply(
    s,
    f.previewCompanionCommand,
    f.applyCompanionCommand,
    c.actorId,
    { command: "controllers", controllers: ["reader"] },
    "delegate",
  );
  const a = s.actors[c.actorId];
  assert.equal(a.owner, "player");
  s.actors.hero.visibility = "private";
  s.actors.hero.campaignIds = [];
  const projected = f.getCompanion(s, c.actorId, "reader");
  assert.equal(projected.parentActorId, null);
  assert.equal(projected.permissions.canControl, true);
  const sel = { command: "correct", patch: { hp: 1 }, reason: "Observed damage" };
  const p = f.previewCompanionCommand(s, c.actorId, sel, "reader"),
    opt = { operationId: "damage", reviewKey: p.reviewKey };
  f.applyCompanionCommand(s, c.actorId, sel, "reader", opt);
  a.controllers = [];
  assert.throws(() => f.applyCompanionCommand(s, c.actorId, sel, "reader", opt));
});

test("a map token forbids narrative attestation as a range bypass; validation does not mutate", () => {
  api();
  const s = state();
  s.scenes[0].width = 1000;
  s.scenes[0].height = 800;
  s.scenes[0].tokens = [{ id: "hero-token", actorId: "hero", x: 100, y: 100, visible: true }];
  const sel = {
    mode: "wild-companion",
    profileId: "srd2024:cat",
    name: "Cat",
    cost: { kind: "wild-shape" },
    appearance: { kind: "attested", confirmed: true },
  };
  const before = JSON.stringify(s);
  const p = f.previewCompanionCreation(s, "hero", sel, "player");
  assert.equal(p.canApply, false);
  assert.ok(p.errors.some((e) => e.code === "appearance-map"));
  assert.equal(JSON.stringify(s), before);
});

test("casting requires each combat turn's Magic action and retains original private history after joining", () => {
  api();
  const s = state();
  s.actors.hero.visibility = "private";
  s.actors.hero.campaignIds = [];
  const r = apply(
    s,
    f.previewFamiliarCasting,
    f.startFamiliarCasting,
    "hero",
    castSelection(),
    "private-cast",
  );
  f.recordPersonalFormsTime(s, "hero", 1800, "Casting uninterrupted", "player", {
    operationId: "personal-time",
  });
  assert.equal(f.getFamiliarCasting(s, r.castingId, "player").elapsedSeconds, 1800);
  assert.equal(s.restTime.clocks.camp.seconds, 0);
  s.actors.hero.visibility = "shared";
  s.actors.hero.campaignIds = ["camp"];
  assert.throws(() => f.getFamiliarCasting(s, r.castingId, "dm"));
  s.combat.active = true;
  s.combat.order = ["hero"];
  s.combat.turn = 0;
  f.observeFormsEvent(s, {
    eventId: "missed-turn",
    cause: "turn-end",
    actorIds: ["hero"],
    turnKey: "new-turn",
  });
  assert.equal(f.getFamiliarCasting(s, r.castingId, "player").status, "failed");
  assert.equal(JSON.stringify(f.getFormsHistory(s, "hero", "dm")).includes("private-cast"), false);
});

test("shape cannot bypass this actor's unfinished cast or physical consequence", () => {
  api();
  const s = state();
  apply(s, f.previewFamiliarCasting, f.startFamiliarCasting, "hero", castSelection(), "cast");
  assert.equal(f.previewWildShape(s, "hero", selectShape(), "player").canApply, false);
  const t = state();
  t.actors.hero.pendingHealing = { id: "physical-heal" };
  assert.equal(f.previewWildShape(t, "hero", selectShape(), "player").canApply, false);
});

test("personal form expiry after joining does not publish its historic operation", () => {
  api();
  const s = state();
  s.actors.hero.visibility = "private";
  s.actors.hero.campaignIds = [];
  apply(s, f.previewWildShape, f.applyWildShape, "hero", selectShape(), "private-shape");
  s.actors.hero.visibility = "shared";
  s.actors.hero.campaignIds = ["camp"];
  f.recordPersonalFormsTime(s, "hero", 3600, "Travel elapsed", "player", {
    operationId: "personal-end",
  });
  assert.equal(s.actors.hero.activeForm, null);
  assert.equal(f.getFormsHistory(s, "hero", "dm").length, 0);
});

test("UI projections expose owner/controller choices and concentration without leaking private notes", () => {
  api();
  const s = state();
  s.actors.hero.concentration = { id: "focus", active: true };
  const r = apply(
    s,
    f.previewCompanionCreation,
    f.createCompanion,
    "hero",
    { mode: "manual", profileId: "srd2024:cat", name: "Cat" },
    "cat",
  );
  const c = f.getCompanion(s, r.actorId, "player"),
    overview = f.getFormsOverview(s, "hero", "player");
  assert.equal(c.controllerChoices.find((x) => x.id === "player").isOwner, true);
  assert.equal(c.permissions.canArchive, true);
  assert.equal(overview.concentrationActive, true);
  assert.equal(overview.profile.knownFormsLimit, 4);
  assert.equal(JSON.stringify(overview).includes("private plan"), false);
});

test("actual store Undo of return restores only that command, then reload preserves live damage and resource use", async () => {
  api();
  const { createStore } = await import("../state.mjs");
  let saved = null;
  const storage = {
    getItem: () => saved,
    setItem: (_k, value) => {
      saved = value;
    },
  };
  const store = createStore({ storage });
  store.commit(
    "fixture",
    (s) => {
      const a = state().actors.hero;
      a.campaignIds = [s.campaign.id];
      s.actors.hero = a;
    },
    "player",
    { undoable: false },
  );
  store.commit("shape", (s) =>
    apply(s, f.previewWildShape, f.applyWildShape, "hero", selectShape(), "form"),
  );
  store.commit("damage and spending", (s) => {
    s.actors.hero.hp = 10;
    s.actors.hero.tempHp = 0;
    s.actors.hero.spellSlots[1].used = 3;
  });
  store.commit("return", (s) =>
    apply(s, f.previewFormReturn, f.returnToNormalForm, "hero", { mode: "normal" }, "return"),
  );
  store.undo("player");
  assert.ok(store.state.actors.hero.activeForm);
  assert.equal(store.state.actors.hero.hp, 10);
  assert.equal(store.state.actors.hero.spellSlots[1].used, 3);
  const restored = createStore({ storage });
  assert.ok(restored.state.actors.hero.activeForm);
  assert.equal(restored.state.actors.hero.hp, 10);
  assert.equal(restored.state.actors.hero.features[0].used, 2);
});

test("removing the active last companion advances round with an explicit unconsumed turn-start marker", () => {
  api();
  const s = state();
  const r = apply(
    s,
    f.previewCompanionCreation,
    f.createCompanion,
    "hero",
    {
      mode: "wild-companion",
      profileId: "srd2024:cat",
      name: "Cat",
      cost: { kind: "wild-shape" },
      appearance: { kind: "attested", confirmed: true },
    },
    "cat",
  );
  s.combat.active = true;
  s.combat.order = ["hero", r.actorId];
  s.combat.turn = 1;
  s.combat.round = 4;
  s.actors.hero.action = false;
  s.actors[r.actorId].hp = 0;
  f.observeFormsEvent(s, {
    eventId: "familiar-zero",
    cause: "actor-status",
    actorIds: [r.actorId],
  });
  assert.equal(s.combat.turn, 0);
  assert.equal(s.combat.round, 5);
  assert.equal(s.actors.hero.action, false);
  assert.deepEqual(s.combat.pendingTurnStart, {
    actorId: "hero",
    previousActorId: r.actorId,
    previousTurnKey: "demo:4:" + r.actorId,
    reason: "companion-removed",
    roundAdvanced: true,
  });
});

test("the removed companion's turn ends under its own identity: its current-turn and next-turn terms stay correct", async () => {
  api();
  const c = await import("../conditions.mjs");
  const { expireTurnEffects } = await import("../combat.mjs");
  const s = state();
  const r = apply(
    s,
    f.previewCompanionCreation,
    f.createCompanion,
    "hero",
    {
      mode: "wild-companion",
      profileId: "srd2024:cat",
      name: "Cat",
      cost: { kind: "wild-shape" },
      appearance: { kind: "attested", confirmed: true },
    },
    "cat",
  );
  Object.assign(s.combat, { active: true, order: ["hero", r.actorId], turn: 1, round: 4 });
  s.actors.hero.conditionImmunities = [];
  const poison = (eventId, when) =>
    c.applyConditionEvent(s, {
      eventId,
      kind: "apply",
      actorId: "hero",
      conditionId: when === "current" ? "poisoned" : "frightened",
      source,
      immunityConfirmed: true,
      term: { kind: "turn", actorId: r.actorId, phase: "end", when },
    });
  poison("until-current", "current");
  poison("until-next", "next");
  s.actors[r.actorId].hp = 0;
  f.observeFormsEvent(s, { eventId: "cat-zero", cause: "actor-status", actorIds: [r.actorId] });
  const pending = s.combat.pendingTurnStart;
  assert.equal(pending.previousTurnKey, "demo:4:" + r.actorId);
  assert.equal(c.combatTurnKey(s.combat), "demo:5:hero", "the order moved on");
  // The root ends the removed turn with the recorded identity.
  expireTurnEffects(s, pending.previousActorId, "end", { turnKey: pending.previousTurnKey });
  assert.equal(c.hasCondition(s.actors.hero, "poisoned"), false, "end of current turn expired");
  assert.equal(
    c.hasCondition(s.actors.hero, "frightened"),
    true,
    "the ongoing turn is not the companion's next turn",
  );
});

test("malformed manual values or controller identity do not mutate and operation collisions cannot replace unrelated actors", () => {
  api();
  const s = state();
  const sel = {
    mode: "manual",
    profileId: "srd2024:cat",
    name: "Cat",
    manual: { abilities: { con: "unknown" }, reason: "Recorded" },
  };
  assert.equal(f.previewCompanionCreation(s, "hero", sel, "player").canApply, false);
  delete sel.manual;
  s.actors["collision:companion"] = { id: "collision:companion", name: "Keep" };
  const p = f.previewCompanionCreation(s, "hero", sel, "player"),
    before = JSON.stringify(s);
  assert.throws(() =>
    f.createCompanion(s, "hero", sel, "player", {
      reviewKey: p.reviewKey,
      operationId: "collision",
    }),
  );
  assert.equal(JSON.stringify(s), before);
});

test("form comparison projects derived statistics and the offered temporary HP even when keeping an empty pool", () => {
  api();
  const s = state(),
    sel = selectShape();
  sel.tempHpChoice = "keep";
  const p = f.previewWildShape(s, "hero", sel, "player");
  assert.equal(p.proposed.ac, 12);
  assert.equal(p.proposed.abilities.con, 12);
  assert.equal(p.proposed.savingThrows.wis, 6);
  assert.equal(p.tempHp.after, 3);
  assert.ok(
    p.changes.some(
      (row) => row.field === "ac" && row.before === 14 && row.after === 12 && row.label.en,
    ),
  );
});

test("an explicit form correction changes effective AC/speed with authored provenance while preserving the SRD profile and live base", () => {
  api();
  const s = state();
  apply(s, f.previewWildShape, f.applyWildShape, "hero", selectShape());
  const selection = { patch: { ac: 15, speed: 15 }, reason: "DM ruled the worn item applies" };
  apply(s, f.previewFormCorrection, f.applyFormCorrection, "hero", selection, "form-correction");
  assert.equal(s.actors.hero.ac, 14);
  assert.equal(s.actors.hero.activeForm.profile.ac, 12);
  assert.equal(f.getEffectiveActor(s.actors.hero).ac, 15);
  assert.equal(s.actors.hero.movement, 9);
  assert.equal(s.actors.hero.activeForm.overrides.source.kind, "authored");
  apply(s, f.previewFormReturn, f.returnToNormalForm, "hero", { mode: "normal" }, "return");
  assert.equal(s.actors.hero.ac, 14);
  assert.equal(s.actors.hero.movement, 3);
});

test("Wild Companion waives material only and cannot bypass unavailable Verbal or Somatic components", () => {
  api();
  const s = state();
  s.actors.hero.combatProfile.componentsAvailable = false;
  const sel = {
    mode: "wild-companion",
    profileId: "srd2024:cat",
    name: "Cat",
    cost: { kind: "wild-shape" },
    appearance: { kind: "attested", confirmed: true },
  };
  const p = f.previewCompanionCreation(s, "hero", sel, "player"),
    before = JSON.stringify(s);
  assert.equal(p.canApply, false);
  assert.ok(p.errors.some((e) => e.code === "components"));
  assert.throws(() =>
    f.createCompanion(s, "hero", sel, "player", {
      reviewKey: p.reviewKey,
      operationId: "invalid-cast",
    }),
  );
  assert.equal(JSON.stringify(s), before);
});

test("personal narrative time cannot skip Magic actions during initiative and previews accurately describe concentration", () => {
  api();
  const s = state();
  s.actors.hero.visibility = "private";
  s.actors.hero.campaignIds = [];
  s.combat.active = true;
  s.combat.order = ["hero"];
  s.combat.turn = 0;
  const sel = castSelection(),
    p = f.previewFamiliarCasting(s, "hero", sel, "player");
  assert.equal(p.retained.includes("concentration"), false);
  const r = apply(s, f.previewFamiliarCasting, f.startFamiliarCasting, "hero", sel, "cast");
  assert.throws(() =>
    f.recordPersonalFormsTime(s, "hero", 3600, "Skip turns", "player", { operationId: "skip" }),
  );
  assert.equal(f.getFamiliarCasting(s, r.castingId, "player").elapsedSeconds, 0);
  assert.equal(
    f
      .previewFamiliarCompletion(
        s,
        r.castingId,
        { appearance: { kind: "attested", confirmed: true } },
        "player",
      )
      .retained.includes("concentration"),
    false,
  );
});

test("unknown retained mental scores never become zero ability modifiers in a form", () => {
  api();
  const s = state();
  delete s.actors.hero.abilities.wis;
  delete s.actors.hero.savingThrows.wis;
  const p = f.previewWildShape(s, "hero", selectShape(), "player");
  assert.equal(p.canApply, false);
  assert.equal(p.proposed.savingThrows.wis, null);
  assert.equal(p.proposed.skillModifiers.perception, null);
});

test("partial companion overrides validate the merged HP maximum both at creation and correction", () => {
  api();
  const s = state();
  const sel = {
    mode: "manual",
    profileId: "srd2024:cat",
    name: "Cat",
    manual: { hp: 10, reason: "Recorded" },
  };
  assert.equal(f.previewCompanionCreation(s, "hero", sel, "player").canApply, false);
  delete sel.manual;
  const c = apply(s, f.previewCompanionCreation, f.createCompanion, "hero", sel, "cat");
  assert.equal(
    f.previewCompanionCommand(
      s,
      c.actorId,
      { command: "correct", patch: { hp: 10 }, reason: "Recorded" },
      "player",
    ).canApply,
    false,
  );
});

test("terminal release and repeated archive cannot consume a new action or create a duplicate event", () => {
  api();
  const s = state();
  const sel = {
    mode: "wild-companion",
    profileId: "srd2024:cat",
    name: "Cat",
    cost: { kind: "wild-shape" },
    appearance: { kind: "attested", confirmed: true },
  };
  const c = apply(s, f.previewCompanionCreation, f.createCompanion, "hero", sel, "cat");
  s.combat.active = true;
  s.combat.order = ["hero"];
  s.actors.hero.action = true;
  const release = { command: "release" };
  const first = apply(
    s,
    f.previewCompanionCommand,
    f.applyCompanionCommand,
    c.actorId,
    release,
    "release",
  );
  s.actors.hero.action = true;
  assert.equal(f.getCompanion(s, c.actorId, "player").permissions.canRelease, false);
  const before = JSON.stringify(s),
    p = f.previewCompanionCommand(s, c.actorId, release, "player");
  assert.equal(p.canApply, false);
  assert.throws(() =>
    f.applyCompanionCommand(s, c.actorId, release, "player", {
      reviewKey: p.reviewKey,
      operationId: "release-again",
    }),
  );
  assert.equal(JSON.stringify(s), before);
  assert.deepEqual(
    f.applyCompanionCommand(s, c.actorId, release, "player", { operationId: "release" }),
    first,
  );
  assert.equal(s.actors.hero.action, true);
  apply(
    s,
    f.previewCompanionCommand,
    f.applyCompanionCommand,
    c.actorId,
    { command: "archive", reason: "Done" },
    "archive",
  );
  assert.equal(f.getCompanion(s, c.actorId, "player").permissions.canArchive, false);
  assert.equal(
    f.previewCompanionCommand(s, c.actorId, { command: "archive", reason: "Again" }, "player")
      .canApply,
    false,
  );
  s.actors[c.actorId].companion.lifecycle = "expired";
  assert.equal(f.getCompanion(s, c.actorId, "player").permissions.canRelease, false);
});

test("builder familiar permissions use live preparation and book access, not cached profile authorization", () => {
  api();
  const s = state(),
    a = s.actors.hero;
  a.formsProfile.managedBy = "character-build";
  a.spells = [{ catalogId: "find-familiar", prepared: true, source: ruleSource(130) }];
  a.features.push({ definitionId: "wizard:ritual-adept", source: ruleSource(78) });
  a.inventory.push({
    id: "book",
    quantity: 1,
    spellbook: { spellIds: ["find-familiar"], readable: true },
  });
  assert.equal(f.previewFamiliarCasting(s, "hero", castSelection(), "player").canApply, true);
  a.spells[0].prepared = false;
  assert.equal(f.previewFamiliarCasting(s, "hero", castSelection(), "player").canApply, false);
  assert.equal(
    f.previewFamiliarCasting(s, "hero", castSelection("ritual"), "player").canApply,
    true,
  );
  const before = JSON.stringify(s);
  assert.equal(f.getFormsOverview(s, "hero", "player").profile.familiarCasting.prepared, false);
  assert.equal(JSON.stringify(s), before);
  a.inventory.find((row) => row.id === "book").quantity = 0;
  assert.equal(
    f.previewFamiliarCasting(s, "hero", castSelection("ritual"), "player").canApply,
    false,
  );
  assert.equal(f.getFormsOverview(s, "hero", "player").permissions.canCastFamiliar, false);
});
