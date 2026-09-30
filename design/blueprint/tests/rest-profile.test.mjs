import test from "node:test";
import assert from "node:assert/strict";
import { updateCharacterRestProfile } from "../rest-profile.mjs";
import { ruleSource } from "../character-rules.mjs";

test("builder recovery metadata follows verified identities and preserves current and unknown use counts", () => {
  const actor = {
    spellSlots: { 1: { max: 4, used: 2 } },
    pactSlots: { max: 2, used: 1 },
    features: [
      { id: "wind", definitionId: "fighter:second-wind", source: ruleSource(48), max: 2, used: 2 },
      { id: "fake", name: "Second Wind", source: { kind: "authored" }, max: 10, used: 5 },
    ],
  };
  updateCharacterRestProfile(actor, {
    classes: [
      { classId: "wizard", level: 3 },
      { classId: "warlock", level: 2 },
      { classId: "fighter", level: 1 },
    ],
    origin: { speciesId: "elf" },
  });
  assert.equal(actor.restProfile.longRestSeconds, 14400);
  assert.equal(actor.restProfile.arcaneRecovery.wizardLevel, 3);
  assert.equal(actor.restProfile.arcaneRecovery.used, null);
  assert.ok(
    actor.restProfile.recoveries.some(
      (r) => r.target.id === "wind" && r.trigger === "short" && r.amount === 1,
    ),
  );
  assert.ok(!actor.restProfile.recoveries.some((r) => r.target.id === "fake"));
  assert.equal(actor.spellSlots[1].used, 2);
  assert.equal(actor.pactSlots.used, 1);
  assert.equal(actor.features[0].used, 2);
  actor.restProfile.arcaneRecovery.used = 1;
  updateCharacterRestProfile(actor, {
    classes: [{ classId: "fighter", level: 3 }],
    origin: { speciesId: "human" },
  });
  assert.equal(actor.restProfile.arcaneRecovery.wizardLevel, 0);
  updateCharacterRestProfile(actor, {
    classes: [{ classId: "wizard", level: 4 }],
    origin: { speciesId: "human" },
  });
  assert.equal(actor.restProfile.arcaneRecovery.used, 1);
  assert.equal(actor.restProfile.longRestSeconds, 28800);
});

test("a new wizard starts with known recovery availability but a custom explicit profile is not overwritten", () => {
  const data = { classes: [{ classId: "wizard", level: 1 }], origin: { speciesId: "human" } };
  const fresh = {};
  updateCharacterRestProfile(fresh, data, { newCharacter: true });
  assert.equal(fresh.restProfile.arcaneRecovery.used, 0);
  const custom = {
    restProfile: { source: { kind: "authored", revision: "house1" }, longRestSeconds: 14400 },
  };
  const before = structuredClone(custom);
  updateCharacterRestProfile(custom, data);
  assert.deepEqual(custom, before);
});

test("Arcane Recovery binds to the sheet's one canonical counter and retains it through removal and return", () => {
  const feature = {
    id: "arcane",
    definitionId: "wizard:arcane-recovery",
    source: ruleSource(78),
    buildManaged: true,
  };
  const actor = { features: [feature] };
  const data = { classes: [{ classId: "wizard", level: 2 }] };
  updateCharacterRestProfile(actor, data, { newCharacter: true });
  assert.equal(feature.max, 1);
  assert.equal(feature.used, 0);
  assert.equal(actor.restProfile.arcaneRecovery.featureId, "arcane");
  assert.equal(Object.hasOwn(actor.restProfile.arcaneRecovery, "used"), false);
  feature.used = 1;
  actor.featureUsageLedger = { arcane: structuredClone(feature) };
  actor.features = [];
  updateCharacterRestProfile(actor, { classes: [{ classId: "fighter", level: 2 }] });
  assert.equal(actor.restProfile.arcaneRecovery.used, 1);
  const restored = {
    id: "arcane",
    definitionId: "wizard:arcane-recovery",
    source: ruleSource(78),
    buildManaged: true,
  };
  actor.features = [restored];
  updateCharacterRestProfile(actor, data);
  assert.equal(restored.used, 1);
  assert.equal(Object.hasOwn(actor.restProfile.arcaneRecovery, "used"), false);
});
