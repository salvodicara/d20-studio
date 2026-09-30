import test from "node:test";
import assert from "node:assert/strict";
import { ruleSource } from "../character-rules.mjs";
const p = await import("../forms-profile.mjs").catch(() => ({}));
const api = () => assert.equal(typeof p.updateCharacterFormsProfile, "function");
const druid = (level) => ({ classes: [{ classId: "druid", level }] });

test("builder form metadata adds one canonical pool and sourced rest recoveries without restoring spent uses", () => {
  api();
  const a = { id: "new", features: [], skills: ["perception"], restProfile: { recoveries: [] } };
  p.updateCharacterFormsProfile(a, druid(2), { newCharacter: true });
  const resource = a.features.find((f) => f.definitionId === "druid:wild-shape");
  assert.equal(resource.max, 2);
  assert.equal(resource.used, 0);
  assert.equal(a.formsProfile.wildShapeFeatureId, resource.id);
  assert.deepEqual(a.formsProfile.savingThrowProficiencies, ["int", "wis"]);
  assert.deepEqual(a.formsProfile.knownForms, []);
  assert.equal(a.formsProfile.knownFormsInitialized, false);
  resource.used = 2;
  p.updateCharacterFormsProfile(a, druid(6), { advancement: true });
  assert.equal(resource.max, 3);
  assert.equal(resource.used, 2);
  assert.equal(a.restProfile.recoveries.filter((r) => r.managedBy === "forms-profile").length, 2);
  const short = a.restProfile.recoveries.find((r) => r.trigger === "short");
  assert.equal(short.amount, 1);
  assert.equal(short.target.id, resource.id);
  p.updateCharacterFormsProfile(a, druid(17), { advancement: true });
  assert.equal(resource.max, 4);
  assert.equal(resource.used, 2);
});

test("reconstructed and removed resources preserve unknown or spent history, never granting a respec refill", () => {
  api();
  const a = { id: "old", features: [], skills: [], restProfile: { recoveries: [] } };
  p.updateCharacterFormsProfile(a, druid(3));
  const resource = a.features[0];
  assert.equal(resource.used, null);
  resource.used = 2;
  p.updateCharacterFormsProfile(a, { classes: [{ classId: "fighter", level: 3 }] });
  assert.equal(a.formsProfile.druidLevel, 0);
  assert.equal(resource.max, 0);
  assert.equal(resource.used, 2);
  p.updateCharacterFormsProfile(a, druid(3), { advancement: true });
  assert.equal(resource.max, 2);
  assert.equal(resource.used, 2);
  const b = {
    id: "ledger",
    features: [],
    skills: [],
    featureUsageLedger: {
      "prior-shape": {
        id: "prior-shape",
        definitionId: "druid:wild-shape",
        source: ruleSource(42, 43),
        max: 2,
        used: 1,
      },
    },
  };
  p.updateCharacterFormsProfile(b, druid(3), { advancement: true });
  assert.equal(b.features[0].id, "prior-shape");
  assert.equal(b.features[0].used, 1);
});

test("Find Familiar availability needs an acquired sourced spell; book ritual also needs Ritual Adept and a readable owned book", () => {
  api();
  const a = {
    id: "wizard",
    className: "Wizard",
    features: [],
    spells: [],
    inventory: [],
    skills: [],
  };
  p.updateCharacterFormsProfile(
    a,
    { classes: [{ classId: "wizard", level: 3 }] },
    { newCharacter: true },
  );
  assert.equal(a.formsProfile.familiarCasting, null);
  a.spells = [{ id: "ff", catalogId: "find-familiar", prepared: true, source: ruleSource(130) }];
  p.updateCharacterFormsProfile(a, { classes: [{ classId: "wizard", level: 3 }] });
  assert.equal(a.formsProfile.familiarCasting.prepared, true);
  assert.equal(a.formsProfile.familiarCasting.ritualFromBook, false);
  a.spells[0].prepared = false;
  a.features.push({ id: "ritual", definitionId: "wizard:ritual-adept", source: ruleSource(78) });
  a.inventory.push({
    id: "book",
    quantity: 1,
    spellbook: { spellIds: ["find-familiar"], readable: true },
  });
  p.updateCharacterFormsProfile(a, { classes: [{ classId: "wizard", level: 3 }] });
  assert.equal(a.formsProfile.familiarCasting.ritualFromBook, true);
  a.inventory[0].spellbook.readable = false;
  p.updateCharacterFormsProfile(a, { classes: [{ classId: "wizard", level: 3 }] });
  assert.equal(a.formsProfile.familiarCasting.ritualFromBook, false);
});

test("seed creates separate synthetic Mira, leaves Livia's class unchanged and does not recreate consumed material on retry", () => {
  api();
  const state = {
    campaign: { id: "camp" },
    actors: {
      livia: {
        id: "livia",
        name: "Livia",
        className: { it: "Maga", en: "Wizard" },
        buildSeed: { classes: [{ classId: "wizard", level: 3 }] },
        features: [],
        spells: [],
        inventory: [],
        skills: [],
      },
    },
  };
  const beforeClass = structuredClone(state.actors.livia.className);
  p.seedDemoFormsActors(state);
  assert.deepEqual(state.actors.livia.className, beforeClass);
  assert.equal(state.actors.mira.hp, 12);
  assert.equal(state.actors.mira.maxHp, 24);
  assert.equal(state.actors.mira.tempHp, 0);
  assert.equal(state.actors.mira.formsProfile.druidLevel, 3);
  assert.equal(state.actors.mira.formsProfile.knownForms.length, 3);
  assert.equal(
    state.actors.mira.features.find((f) => f.definitionId === "druid:wild-shape").used,
    1,
  );
  const incense = state.actors.livia.inventory.find((i) => i.id === "sample-familiar-incense");
  assert.equal(incense.materialValueGp, 10);
  incense.quantity = 0;
  state.actors.mira.hp = 7;
  p.seedDemoFormsActors(state);
  assert.equal(state.actors.mira.hp, 7);
  assert.equal(incense.quantity, 0);
});

test("explicit custom profile and uncertain multiclass starting proficiencies are not overwritten or guessed", () => {
  api();
  const profile = { source: { kind: "authored", revision: "private-custom" }, druidLevel: 4 };
  const a = { formsProfile: structuredClone(profile), features: [] };
  p.updateCharacterFormsProfile(a, druid(8));
  assert.deepEqual(a.formsProfile, profile);
  const b = { features: [], skills: [] };
  p.updateCharacterFormsProfile(b, {
    classes: [
      { classId: "druid", level: 3 },
      { classId: "fighter", level: 1 },
    ],
  });
  assert.equal(b.formsProfile.savingThrowProficiencies, null);
});

test("live familiar access is a pure projection of acquisition, preparation, feat and current readable book", () => {
  api();
  assert.equal(typeof p.getFamiliarCastingAccess, "function");
  const a = {
    formsProfile: { managedBy: "character-build", familiarCasting: { prepared: true } },
    spells: [{ catalogId: "find-familiar", prepared: false, source: ruleSource(130) }],
    features: [{ definitionId: "wizard:ritual-adept", source: ruleSource(78) }],
    inventory: [{ quantity: 1, spellbook: { spellIds: ["find-familiar"], readable: true } }],
  };
  const before = JSON.stringify(a);
  assert.equal(p.getFamiliarCastingAccess(a).prepared, false);
  assert.equal(p.getFamiliarCastingAccess(a).ritualFromBook, true);
  assert.equal(JSON.stringify(a), before);
  a.inventory[0].quantity = 0;
  assert.equal(p.getFamiliarCastingAccess(a).ritualFromBook, false);
  a.spells = [];
  assert.equal(p.getFamiliarCastingAccess(a), null);
  const custom = {
    formsProfile: {
      familiarCasting: {
        spellId: "find-familiar",
        prepared: true,
        source: { kind: "authored", revision: "manual" },
      },
    },
  };
  assert.deepEqual(p.getFamiliarCastingAccess(custom), custom.formsProfile.familiarCasting);
});

test("the explicit initial demo places Mira once without enrolling initiative or respawning a removed token", () => {
  api();
  const state = {
    actors: {},
    campaign: { id: "camp" },
    scenes: [{ id: "first", tokens: [] }],
    activeSceneId: "first",
    combat: { active: false, order: [] },
  };
  p.seedDemoFormsActors(state);
  assert.deepEqual(
    state.scenes[0].tokens.find((row) => row.actorId === "mira"),
    { id: "token-mira", actorId: "mira", x: 150, y: 450, hidden: false },
  );
  assert.deepEqual(state.combat.order, []);
  state.scenes[0].tokens = [];
  p.seedDemoFormsActors(state);
  assert.deepEqual(state.scenes[0].tokens, []);
});

test("a prepared acquired grant authorizes familiar casting independently of duplicate grant order", () => {
  api();
  const a = {
    formsProfile: { managedBy: "character-build" },
    spells: [
      { id: "first", catalogId: "find-familiar", prepared: false, source: ruleSource(130) },
      { id: "second", catalogId: "find-familiar", prepared: true, source: ruleSource(130) },
    ],
  };
  assert.equal(p.getFamiliarCastingAccess(a).prepared, true);
  a.spells.reverse();
  assert.equal(p.getFamiliarCastingAccess(a).prepared, true);
  a.spells.find((row) => row.id === "second").source = {
    kind: "authored",
    revision: "different-spell",
  };
  assert.equal(p.getFamiliarCastingAccess(a).prepared, false);
});

test("explicit corrected Wild Shape maximum survives revise, advancement and removal without refilling the pool", () => {
  api();
  const a = { features: [], skills: [] };
  p.updateCharacterFormsProfile(a, druid(3), { newCharacter: true });
  const feature = a.features[0];
  feature.max = 5;
  feature.used = 3;
  p.updateCharacterFormsProfile(a, druid(3));
  assert.equal(feature.max, 5);
  assert.equal(feature.used, 3);
  p.updateCharacterFormsProfile(a, druid(6), { advancement: true });
  assert.equal(feature.max, 5);
  assert.equal(feature.used, 3);
  p.updateCharacterFormsProfile(a, { classes: [{ classId: "fighter", level: 6 }] });
  assert.equal(feature.max, 0);
  assert.equal(feature.used, 3);
  p.updateCharacterFormsProfile(a, druid(6), { advancement: true });
  assert.equal(feature.max, 5);
  assert.equal(feature.used, 3);
  const restored = {
    features: [],
    skills: [],
    featureUsageLedger: { [feature.id]: structuredClone(feature) },
  };
  p.updateCharacterFormsProfile(restored, druid(6));
  assert.equal(restored.features[0].max, 5);
  assert.equal(restored.features[0].used, 3);
  assert.equal(a.features.length, 1);
});
