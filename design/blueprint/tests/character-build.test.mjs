import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState, createStore } from "../state.mjs";
import {
  createCharacterDraft,
  getCharacterDraft,
  listCharacterDrafts,
  saveCharacterDraft,
  discardCharacterDraft,
  previewCharacterDraft,
  applyCharacterDraft,
  beginCharacterRoll,
  resolveCharacterRoll,
} from "../character-build.mjs";
import { getCharacterCatalog, calculateSpellSlots } from "../character-rules.mjs";
import { connectCharacterToCampaign } from "../character-access.mjs";

const abilities = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
function applyComplete(state, id = "draft") {
  complete(state, id);
  const p = previewCharacterDraft(state, id, "player");
  return state.actors[
    applyCharacterDraft(state, id, { operationId: "apply-" + id, reviewKey: p.reviewKey }, "player")
      .actorId
  ];
}
function complete(state, id = "draft", kind = "create", actorId) {
  const d = createCharacterDraft(state, { id, kind, actorId }, "player");
  saveCharacterDraft(
    state,
    id,
    {
      expectedRevision: d.revision,
      data: {
        identity: { ...d.data.identity, name: "Mira" },
        classes: [{ classId: "fighter", level: 1, subclassId: null }],
        origin: {
          backgroundId: "criminal",
          speciesId: "halfling",
          backgroundBonuses: { dex: 2, con: 1 },
          choices: {},
        },
        abilities: {
          method: "manual",
          scores: abilities,
          assignment: {},
          manualTotals: {},
          source: "Synthetic ability scores",
        },
        skills: {
          selected: ["athletics", "perception"],
          languages: ["elvish", "dwarvish"],
          tools: [],
          confirmed: true,
        },
        features: {
          selected: [
            { id: "defense", grantId: "class:fighter:fighting-style" },
            { id: "quarterstaff", grantId: "class:fighter:mastery" },
            { id: "dagger", grantId: "class:fighter:mastery" },
            { id: "longsword", grantId: "class:fighter:mastery" },
          ],
          custom: [],
          featOverride: false,
          confirmed: true,
        },
        spells: { selected: [], prepared: [], custom: [], confirmed: true },
        equipment: {
          mode: "manual",
          items: [
            {
              id: "staff",
              name: "Training staff",
              kind: "weapon",
              quantity: 1,
              weight: 2,
              equipped: false,
              source: { kind: "manual", revision: "test", label: "Original synthetic item" },
            },
          ],
          currency: { gp: 5 },
          confirmed: true,
        },
        hp: { mode: "calculated", perLevel: {}, currentKnown: false },
      },
    },
    "player",
  );
  return d;
}
test("advancement preserves live sharing, corrected name and effective ability/HP values", () => {
  const state = createInitialState(),
    actor = applyComplete(state);
  connectCharacterToCampaign(state, actor.id, "player");
  actor.name = "Corrected";
  actor.abilities.str = 18;
  actor.maxHp = 40;
  actor.hp = 2;
  const draft = createCharacterDraft(
    state,
    { id: "advance-live", kind: "advance", actorId: actor.id },
    "player",
  );
  draft.data.classes[0].level = 2;
  draft.data.hp.perLevel[2] = { method: "fixed" };
  const p = previewCharacterDraft(state, draft.id, "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  assert.equal(p.proposed.name, "Corrected");
  assert.equal(p.proposed.visibility, "shared");
  assert.equal(p.proposed.abilities.str, 18);
  assert.equal(p.proposed.maxHp, 48);
  applyCharacterDraft(
    state,
    draft.id,
    { operationId: "advance-live-op", reviewKey: p.reviewKey, allowIncomplete: true },
    "player",
  );
  assert.equal(actor.visibility, "shared");
  assert.equal(actor.hp, 2);
  assert.equal(actor.maxHp, 48);
});
test("advancement reuses accepted ability and HP evidence without rerolling and rejects reversed ancestors", () => {
  const state = createInitialState();
  complete(state);
  const d = state.characterDrafts[0];
  d.data.abilities.method = "roll";
  d.data.abilities.assignment = Object.fromEntries(
    Object.keys(abilities).map((key, i) => [key, i]),
  );
  for (let i = 0; i < 6; i++) {
    beginCharacterRoll(
      state,
      d.id,
      { id: "ability-" + i, kind: "abilities", index: i, mode: "physical" },
      "player",
    );
    resolveCharacterRoll(state, d.id, "ability-" + i, [6, 4, 3, 1], "player");
  }
  let p = previewCharacterDraft(state, d.id, "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  const actorId = applyCharacterDraft(
    state,
    d.id,
    { operationId: "rolled-create", reviewKey: p.reviewKey },
    "player",
  ).actorId;
  const advanced = createCharacterDraft(
    state,
    { id: "rolled-advance", kind: "advance", actorId },
    "player",
  );
  advanced.data.classes[0].level = 2;
  advanced.data.hp.perLevel[2] = { method: "fixed" };
  p = previewCharacterDraft(state, advanced.id, "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  assert.equal(p.proposed.abilities.str, 13);
  assert.equal(state.characterBuildRolls.length, 6);
  state.characterBuildRolls[0].status = "reversed";
  assert.ok(
    previewCharacterDraft(state, advanced.id, "player").errors.some(
      (e) => e.code === "ability-missing",
    ),
  );
});
test("pending consequences block applying structural changes without spending or resolving them", () => {
  const state = createInitialState(),
    actor = applyComplete(state);
  const d = createCharacterDraft(
    state,
    { id: "pending-advance", kind: "advance", actorId: actor.id },
    "player",
  );
  d.data.classes[0].level = 2;
  d.data.hp.perLevel[2] = { method: "fixed" };
  state.combatAttempts = [
    { id: "pending", actorId: actor.id, status: "pending", requests: [], outcomes: [] },
  ];
  const before = JSON.stringify(actor),
    p = previewCharacterDraft(state, d.id, "player");
  assert.ok(p.errors.some((e) => e.code === "pending-consequences"));
  assert.throws(() =>
    applyCharacterDraft(state, d.id, { operationId: "blocked", reviewKey: p.reviewKey }, "player"),
  );
  assert.equal(JSON.stringify(actor), before);
  assert.equal(state.combatAttempts[0].status, "pending");
});
test("earned feature identities keep separate counters through advancement and removal/reintroduction", () => {
  const state = createInitialState(),
    actor = applyComplete(state);
  const feature = actor.features.find((f) => f.definitionId === "defense");
  assert.ok(feature);
  feature.max = 3;
  feature.used = 2;
  feature.name = "Agreed table feature";
  feature.description = "DM-approved table-specific detail";
  let d = createCharacterDraft(
    state,
    { id: "resource-advance", kind: "advance", actorId: actor.id },
    "player",
  );
  d.data.classes[0].level = 2;
  d.data.hp.perLevel[2] = { method: "fixed" };
  let p = previewCharacterDraft(state, d.id, "player");
  assert.equal(p.proposed.features.find((f) => f.id === feature.id).used, 2);
  assert.equal(p.proposed.features.find((f) => f.id === feature.id).name, feature.name);
  assert.equal(
    p.proposed.features.find((f) => f.id === feature.id).description,
    feature.description,
  );
  applyCharacterDraft(
    state,
    d.id,
    { operationId: "resource-advance-op", reviewKey: p.reviewKey, allowIncomplete: true },
    "player",
  );
  d = createCharacterDraft(
    state,
    { id: "replace-style", kind: "revise", actorId: actor.id },
    "player",
  );
  d.data.features.selected.find((f) => f.id === "defense").id = "archery";
  p = previewCharacterDraft(state, d.id, "player");
  applyCharacterDraft(
    state,
    d.id,
    { operationId: "replace-style-op", reviewKey: p.reviewKey, allowIncomplete: true },
    "player",
  );
  assert.ok(!actor.features.some((f) => f.id === feature.id));
  d = createCharacterDraft(
    state,
    { id: "return-style", kind: "revise", actorId: actor.id },
    "player",
  );
  d.data.features.selected.find((f) => f.id === "archery").id = "defense";
  p = previewCharacterDraft(state, d.id, "player");
  const restored = p.proposed.features.find((f) => f.id === feature.id);
  assert.equal(restored.max, 3);
  assert.equal(restored.used, 2);
  assert.equal(restored.name, feature.name);
  assert.equal(restored.manualOverrides.description.source.kind, "manual");
});
test("a sheet preparation correction survives revision and live changes invalidate old review evidence", () => {
  const state = createInitialState(),
    d = complete(state);
  d.data.classes = [{ classId: "wizard", level: 1, subclassId: null }];
  d.data.skills.selected = ["arcana", "history"];
  d.data.features.selected = [];
  const ids = [
    "fire-bolt",
    "mage-hand",
    "light",
    "burning-hands",
    "magic-missile",
    "shield",
    "detect-magic",
    "mage-armor",
    "sleep",
  ];
  d.data.spells.selected = ids.map((id) => ({ id, grantId: "class:wizard" }));
  d.data.spells.prepared = ids.slice(3, 7).map((id) => ({ id, grantId: "class:wizard" }));
  let p = previewCharacterDraft(state, d.id, "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  const actor =
    state.actors[
      applyCharacterDraft(
        state,
        d.id,
        { operationId: "wizard-create", reviewKey: p.reviewKey },
        "player",
      ).actorId
    ];
  actor.spells.find((s) => s.catalogId === "burning-hands").prepared = false;
  const revision = createCharacterDraft(
    state,
    { id: "wizard-revise", kind: "revise", actorId: actor.id },
    "player",
  );
  p = previewCharacterDraft(state, revision.id, "player");
  assert.equal(p.proposed.spells.find((s) => s.catalogId === "burning-hands").prepared, false);
  const reviewed = p.reviewKey;
  actor.spells.find((s) => s.catalogId === "shield").prepared = false;
  assert.throws(
    () =>
      applyCharacterDraft(
        state,
        revision.id,
        { operationId: "wizard-revise-op", reviewKey: reviewed },
        "player",
      ),
    /changed/,
  );
  p = previewCharacterDraft(state, revision.id, "player");
  assert.equal(p.proposed.spells.find((s) => s.catalogId === "shield").prepared, false);
  applyCharacterDraft(
    state,
    revision.id,
    { operationId: "wizard-revise-op", reviewKey: p.reviewKey },
    "player",
  );
  assert.equal(actor.spells.find((s) => s.catalogId === "shield").prepared, false);
});
test("initial saving throw proficiencies are executable and later classes do not grant theirs", () => {
  const state = createInitialState(),
    actor = applyComplete(state);
  assert.equal(actor.savingThrows.str, 4);
  assert.equal(actor.savingThrows.con, 4);
  assert.equal(actor.savingThrows.dex, 3);
  const d = createCharacterDraft(
    state,
    { id: "save-revise", kind: "revise", actorId: actor.id },
    "player",
  );
  actor.savingThrows.con = 9;
  const p = previewCharacterDraft(state, d.id, "player");
  assert.equal(p.proposed.savingThrows.con, 9);
  d.data.classes.push({ classId: "wizard", level: 1 });
  d.data.levelOrder = ["fighter", "wizard"];
  const multiclass = previewCharacterDraft(state, d.id, "player");
  assert.equal(multiclass.proposed.savingThrows.int, 1);
  assert.equal(multiclass.proposed.savingThrows.dex, 3);
});
test("a higher-level class or magical species is explicitly partial until its remaining choices are recorded", () => {
  const state = createInitialState(),
    actor = applyComplete(state);
  const d = createCharacterDraft(
    state,
    { id: "partial-advance", kind: "advance", actorId: actor.id },
    "player",
  );
  // Level 3: the subclass's own features are catalogued by name only.
  d.data.classes[0].level = 3;
  d.data.classes[0].subclassId = "champion";
  d.data.hp.perLevel[2] = { method: "fixed" };
  d.data.hp.perLevel[3] = { method: "fixed" };
  const p = previewCharacterDraft(state, d.id, "player");
  assert.equal(p.incomplete, true);
  assert.ok(p.warnings.some((e) => e.code === "catalogue-partial"));
  assert.throws(
    () =>
      applyCharacterDraft(
        state,
        d.id,
        { operationId: "partial-op", reviewKey: p.reviewKey },
        "player",
      ),
    /explicitly/i,
  );
});
test("story edits merge distinct live fields and expose a conflict instead of replacing the same field", () => {
  const state = createInitialState(),
    actor = applyComplete(state);
  actor.description = "Live appearance";
  actor.backstory = "Live origin";
  actor.notes = "Shared notes";
  const d = createCharacterDraft(
    state,
    { id: "story-revise", kind: "revise", actorId: actor.id },
    "player",
  );
  assert.equal(d.data.story.description, "Live appearance");
  d.data.story.backstory = "Planned origin";
  actor.description = "Latest appearance";
  let p = previewCharacterDraft(state, d.id, "player");
  assert.equal(p.proposed.story.description, "Latest appearance");
  assert.equal(p.proposed.story.backstory, "Planned origin");
  actor.backstory = "Concurrent origin";
  p = previewCharacterDraft(state, d.id, "player");
  assert.ok(p.errors.some((e) => e.code === "story-conflict"));
  d.data.story.backstory = "Concurrent origin";
  p = previewCharacterDraft(state, d.id, "player");
  applyCharacterDraft(
    state,
    d.id,
    { operationId: "story-revise-op", reviewKey: p.reviewKey },
    "player",
  );
  assert.equal(actor.backstory, "Concurrent origin");
  assert.equal(actor.description, "Latest appearance");
  assert.equal(actor.notes, "Shared notes");
});
test("drafts persist privately by identity and cannot be read merely because the viewer is DM", () => {
  let state = createInitialState();
  createCharacterDraft(state, { id: "private", kind: "create" }, "player");
  state = JSON.parse(JSON.stringify(state));
  assert.equal(listCharacterDrafts(state, "player").length, 1);
  assert.equal(listCharacterDrafts(state, "dm").length, 0);
  assert.throws(() => getCharacterDraft(state, "private", "dm"), /private|owner|access/i);
  assert.throws(() =>
    saveCharacterDraft(state, "private", { data: { story: { backstory: "leaked" } } }, "dm"),
  );
  discardCharacterDraft(state, "private", "player");
  assert.equal(listCharacterDrafts(state, "player").length, 0);
});
test("point buy rejects overspending without inventing a zero for an empty score", () => {
  const s = createInitialState(),
    d = complete(s);
  saveCharacterDraft(
    s,
    d.id,
    {
      data: {
        abilities: {
          method: "point-buy",
          scores: { str: 15, dex: 15, con: 15, int: 9, wis: 8, cha: 8 },
          assignment: {},
          manualTotals: {},
        },
      },
    },
    "player",
  );
  let p = previewCharacterDraft(s, d.id, "player");
  assert.ok(p.errors.some((e) => e.code === "point-buy-budget"));
  saveCharacterDraft(
    s,
    d.id,
    {
      data: {
        abilities: {
          method: "point-buy",
          scores: { str: 15, dex: 15, con: 15, int: 8, wis: 8, cha: null },
          assignment: {},
          manualTotals: {},
        },
      },
    },
    "player",
  );
  p = previewCharacterDraft(s, d.id, "player");
  assert.ok(p.errors.some((e) => e.code === "ability-missing"));
  assert.equal(p.proposed.abilities.cha, null);
});
test("six rolled groups retain natural dice and a missing physical face cannot become a result", () => {
  let s = createInitialState();
  const d = createCharacterDraft(s, { id: "rolled", kind: "create" }, "player");
  beginCharacterRoll(
    s,
    d.id,
    { id: "r1", kind: "abilities", index: 0, mode: "physical" },
    "player",
  );
  assert.throws(() => resolveCharacterRoll(s, d.id, "r1", [6, 5, 2, null], "player"));
  assert.equal(getCharacterDraft(s, d.id, "player").rolls[0].status, "pending");
  resolveCharacterRoll(s, d.id, "r1", [6, 5, 2, 1], "player");
  s = JSON.parse(JSON.stringify(s));
  const r = getCharacterDraft(s, d.id, "player").rolls[0];
  assert.equal(r.total, 13);
  assert.deepEqual(r.values, [6, 5, 2, 1]);
  assert.equal(r.discarded, 1);
  resolveCharacterRoll(s, d.id, "r1", [6, 5, 2, 1], "player");
  assert.equal(getCharacterDraft(s, d.id, "player").rolls.length, 1);
  assert.throws(() => resolveCharacterRoll(s, d.id, "r1", [6, 6, 6, 6], "player"));
  assert.throws(() => saveCharacterDraft(s, d.id, { data: { rolls: [] } }, "player"));
});
test("background increases and manual effective totals remain distinct contributions", () => {
  const s = createInitialState(),
    d = complete(s);
  const a = structuredClone(d.data.abilities);
  a.manualTotals.dex = { value: 18, reason: "Known sheet total" };
  saveCharacterDraft(s, d.id, { data: { abilities: a } }, "player");
  const p = previewCharacterDraft(s, d.id, "player");
  assert.equal(p.breakdown.abilities.dex.base, 14);
  assert.equal(p.breakdown.abilities.dex.background, 2);
  assert.equal(p.breakdown.abilities.dex.calculated, 16);
  assert.equal(p.proposed.abilities.dex, 18);
  assert.equal(p.proposed.maxHp, 12);
});
test("new creation applies only once, stays personal and never autoequips or joins a scene", () => {
  const s = createInitialState(),
    d = complete(s),
    p = previewCharacterDraft(s, d.id, "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  const result = applyCharacterDraft(
    s,
    d.id,
    { operationId: "create-1", reviewKey: p.reviewKey },
    "player",
  );
  const actor = s.actors[result.actorId];
  assert.equal(actor.maxHp, 12);
  assert.equal(actor.hp, 12);
  assert.equal(actor.inventory.length, 1);
  assert.equal(actor.inventory[0].equipped, false);
  assert.deepEqual(actor.campaignIds, []);
  assert.ok(!s.scenes.some((scene) => scene.tokens.some((t) => t.actorId === actor.id)));
  assert.equal(
    applyCharacterDraft(s, d.id, { operationId: "create-1", reviewKey: p.reviewKey }, "player")
      .actorId,
    actor.id,
  );
  assert.equal(Object.values(s.actors).filter((a) => a.id === actor.id).length, 1);
});
test("advancement merges into live resources and rejects a materially stale review without healing or extra equipment", () => {
  const s = createInitialState(),
    d = complete(s),
    p = previewCharacterDraft(s, d.id, "player");
  const id = applyCharacterDraft(
    s,
    d.id,
    { operationId: "create", reviewKey: p.reviewKey },
    "player",
  ).actorId;
  const actor = s.actors[id];
  actor.hp = 4;
  actor.notes = "New live note";
  actor.inventory[0].quantity = 0;
  const adv = createCharacterDraft(s, { id: "advance", kind: "advance", actorId: id }, "player");
  saveCharacterDraft(
    s,
    adv.id,
    {
      data: {
        classes: [{ classId: "fighter", level: 2 }],
        hp: { ...adv.data.hp, perLevel: { 2: { method: "fixed" } } },
      },
    },
    "player",
  );
  const first = previewCharacterDraft(s, adv.id, "player");
  assert.equal(first.proposed.maxHp, 20);
  actor.hp = 2;
  assert.throws(
    () =>
      applyCharacterDraft(
        s,
        adv.id,
        { operationId: "advance-1", reviewKey: first.reviewKey },
        "player",
      ),
    /review|changed/i,
  );
  const latest = previewCharacterDraft(s, adv.id, "player");
  applyCharacterDraft(
    s,
    adv.id,
    { operationId: "advance-1", reviewKey: latest.reviewKey, allowIncomplete: true },
    "player",
  );
  assert.equal(actor.hp, 2);
  assert.equal(actor.maxHp, 20);
  assert.equal(actor.level, 2);
  assert.equal(actor.notes, "New live note");
  assert.equal(actor.inventory[0].quantity, 0);
  assert.equal(actor.inventory.length, 1);
});
test("multiclass slots use 2024 rounded-up half casters but retain Pact Magic separately", () => {
  const pools = calculateSpellSlots([
    { classId: "ranger", level: 3 },
    { classId: "sorcerer", level: 3 },
    { classId: "warlock", level: 2 },
  ]);
  assert.deepEqual(pools.spellSlots, { 1: 4, 2: 3, 3: 2 });
  assert.deepEqual(
    { level: pools.pactSlots.level, max: pools.pactSlots.max },
    { level: 1, max: 2 },
  );
});
test("catalog entries carry immutable rules and do not advertise every spell as automated", () => {
  const c = getCharacterCatalog();
  assert.equal(c.classes.length, 12);
  assert.equal(c.backgrounds.length, 4);
  assert.ok(c.classes.every((e) => e.source.revision === "5.2.1" && e.source.sha256));
  assert.equal(c.spells.find((e) => e.id === "fire-bolt").combatActionId, "fire-bolt");
  assert.equal(c.spells.find((e) => e.id === "mage-hand").combatActionId, undefined);
});

test("class choices and earned feat slots are validated independently from feat prerequisite override", () => {
  const s = createInitialState(),
    d = complete(s);
  saveCharacterDraft(
    s,
    d.id,
    { data: { features: { selected: [], custom: [], featOverride: true, confirmed: true } } },
    "player",
  );
  assert.ok(
    previewCharacterDraft(s, d.id, "player").errors.some(
      (e) => e.code === "required-feature-choice",
    ),
  );
  saveCharacterDraft(
    s,
    d.id,
    {
      data: {
        features: {
          selected: [{ id: "ability-score-improvement", grantId: "invented", bonuses: { str: 2 } }],
          custom: [],
          featOverride: true,
          confirmed: true,
        },
      },
    },
    "player",
  );
  const p = previewCharacterDraft(s, d.id, "player");
  assert.ok(p.errors.some((e) => e.code === "feature-grant"));
});

test("monoclass and combined half casters use their verified slot progression without double rounding", () => {
  assert.deepEqual(calculateSpellSlots([{ classId: "paladin", level: 2 }]).spellSlots, { 1: 2 });
  assert.deepEqual(
    calculateSpellSlots([
      { classId: "paladin", level: 1 },
      { classId: "ranger", level: 1 },
    ]).spellSlots,
    { 1: 2 },
  );
  assert.equal(
    getCharacterCatalog().equipmentOptions.find((e) => e.id === "fighter-gold").name.en,
    "Starting gold (option C)",
  );
  assert.ok(!getCharacterCatalog().feats.some((f) => ["dueling", "protection"].includes(f.id)));
});

test("reconstruction retains current resources and never creates full spell slots from missing values", () => {
  const s = createInitialState(),
    d = complete(s, "rebuild", "reconstruct");
  saveCharacterDraft(
    s,
    d.id,
    {
      data: {
        classes: [{ classId: "wizard", level: 1 }],
        hp: { mode: "manual", maxHp: 9, currentHp: 2, currentKnown: true, tempHp: 3, perLevel: {} },
        spells: { selected: [], prepared: [], custom: [], confirmed: true },
      },
    },
    "player",
  );
  const p = previewCharacterDraft(s, d.id, "player");
  assert.ok(p.errors.some((e) => e.code === "reconstructed-resource"));
  assert.equal(p.proposed.hp, 2);
  assert.equal(p.proposed.tempHp, 3);
});
test("a created character carries the explicit 2024 zero-HP policy, so 0 HP means dying, not a reconciliation", async () => {
  const { applyVitalityEvent, getConditionOverview, hasCondition } =
    await import("../conditions.mjs");
  const s = createInitialState(),
    actor = applyComplete(s);
  assert.equal(actor.vitalityPolicy.zeroHp, "death-saves");
  assert.deepEqual(
    [actor.vitalityPolicy.source.en.pages, actor.vitalityPolicy.source.it.pages],
    [
      [17, 18],
      [19, 20],
    ],
  );
  assert.equal(actor.vitalityPolicy.source.revision, "5.2.1");
  applyVitalityEvent(s, {
    eventId: "fall",
    actorId: actor.id,
    kind: "damage",
    amount: actor.hp,
    source: { kind: "authored", revision: "test" },
  });
  const o = getConditionOverview(s, actor.id, "player");
  assert.equal(o.vitality, "dying");
  assert.equal(hasCondition(actor, "unconscious"), true);
  assert.equal(
    o.reconciliation.some((r) => /policy/.test(r.code ?? r)),
    false,
    JSON.stringify(o.reconciliation),
  );
  // A recorded policy (a DM correction) survives a later advancement.
  actor.vitalityPolicy = { zeroHp: "manual", source: { kind: "authored", revision: "dm" } };
  const adv = createCharacterDraft(s, { id: "adv", kind: "advance", actorId: actor.id }, "player");
  saveCharacterDraft(
    s,
    adv.id,
    {
      data: {
        classes: [{ classId: "fighter", level: 2 }],
        hp: { ...adv.data.hp, perLevel: { 2: { method: "fixed" } } },
      },
    },
    "player",
  );
  const p = previewCharacterDraft(s, adv.id, "player");
  applyCharacterDraft(
    s,
    adv.id,
    { operationId: "adv-1", reviewKey: p.reviewKey, allowIncomplete: true },
    "player",
  );
  assert.equal(actor.level, 2);
  assert.equal(actor.vitalityPolicy.zeroHp, "manual");
});
test("builder spell names are the official SRD 5.2.1 names verified in the sample catalog", async () => {
  const { SPELLS } = await import("../srd-sample.mjs");
  for (const spell of getCharacterCatalog().spells) {
    const official = SPELLS.find((s) => s.slug === spell.id);
    assert.ok(official, spell.id);
    assert.deepEqual(spell.name, { it: official.name.it, en: official.name.en }, spell.id);
    assert.equal(spell.source.pages[0], official.source.en.pages[0], spell.id);
  }
});
test("builder feat names are the official Italian SRD 5.2.1 names (IT pp. 97–98)", () => {
  const it = Object.fromEntries(getCharacterCatalog().feats.map((f) => [f.id, f.name.it]));
  assert.deepEqual(it, {
    alert: "Allerta",
    "savage-attacker": "Aggressore selvaggio",
    skilled: "Abile",
    "magic-initiate-cleric": "Iniziato alla magia (chierico)",
    "magic-initiate-druid": "Iniziato alla magia (druido)",
    "magic-initiate-wizard": "Iniziato alla magia (mago)",
    "ability-score-improvement": "Aumento dei punteggi di caratteristica",
    grappler: "Lottatore",
    archery: "Tiro",
    defense: "Difesa",
    "great-weapon-fighting": "Combattere con armi possenti",
    "two-weapon-fighting": "Combattere con due armi",
  });
});
