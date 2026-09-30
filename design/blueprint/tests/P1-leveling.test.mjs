// P1 fixes PG-16 and PG-08: the class table drives level up and level down (dnd5e
// Advancement / Level Down, BG3 Level Up and respec).
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import {
  createCharacterDraft,
  saveCharacterDraft,
  previewCharacterDraft,
  applyCharacterDraft,
} from "../character-build.mjs";
import { classFeaturesAt } from "../character-rules.mjs";

// A level-1 Fighter with CON 16 (+3): 10 + 3 = 13 HP; level 2 fixed 6 + 3 → 22 HP.
function fighter(state) {
  const d = createCharacterDraft(state, { id: "f1" }, "player");
  saveCharacterDraft(
    state,
    "f1",
    {
      expectedRevision: d.revision,
      data: {
        identity: { ...d.data.identity, name: "Bruna" },
        classes: [{ classId: "fighter", level: 1, subclassId: null }],
        origin: {
          backgroundId: "criminal",
          speciesId: "halfling",
          backgroundBonuses: { dex: 2, con: 1 },
          choices: {},
        },
        abilities: {
          method: "manual",
          scores: { str: 15, dex: 13, con: 15, int: 8, wis: 12, cha: 10 },
          assignment: {},
          manualTotals: {},
          source: "Synthetic ability scores",
        },
        skills: {
          selected: ["acrobatics", "perception"],
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
        equipment: { mode: "manual", items: [], currency: { gp: 0 }, confirmed: true },
        hp: { mode: "calculated", perLevel: {}, currentKnown: false },
      },
    },
    "player",
  );
  const p = previewCharacterDraft(state, "f1", "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  const { actorId } = applyCharacterDraft(
    state,
    "f1",
    { operationId: "op-f1", reviewKey: p.reviewKey, allowIncomplete: p.incomplete },
    "player",
  );
  return state.actors[actorId];
}
const ids = (actor) => actor.features.map((f) => f.definitionId ?? f.id);

test("the class table grants Fighter 2 Action Surge and Tactical Mind, with uses", () => {
  const two = classFeaturesAt("fighter", 2).map((f) => f.id);
  assert.ok(two.includes("fighter:action-surge") && two.includes("fighter:tactical-mind"));
  assert.ok(!classFeaturesAt("fighter", 1).some((f) => f.id === "fighter:action-surge"));
  assert.equal(classFeaturesAt("fighter", 2).find((f) => f.id === "fighter:action-surge").max, 1);
  assert.equal(classFeaturesAt("fighter", 17).find((f) => f.id === "fighter:action-surge").max, 2);
  assert.equal(classFeaturesAt("fighter", 4).find((f) => f.id === "fighter:second-wind").max, 3);
  // Repeated names at a later level keep distinct identities.
  const meta = classFeaturesAt("sorcerer", 17).filter((f) => f.name.en === "Metamagic");
  assert.equal(new Set(meta.map((f) => f.id)).size, 3);
});

test("level up to Fighter 2 adds Action Surge and Tactical Mind without an incomplete flag", () => {
  const state = createInitialState(),
    actor = fighter(state);
  assert.equal(actor.maxHp, 13);
  const d = createCharacterDraft(state, { id: "up", kind: "advance", actorId: actor.id }, "player");
  d.data.classes[0].level = 2;
  d.data.hp.perLevel[2] = { method: "fixed" };
  const p = previewCharacterDraft(state, "up", "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  assert.equal(p.incomplete, false, JSON.stringify(p.warnings));
  assert.equal(p.proposed.maxHp, 22);
  applyCharacterDraft(state, "up", { operationId: "op-up", reviewKey: p.reviewKey }, "player");
  assert.ok(ids(actor).includes("fighter:action-surge"));
  assert.ok(ids(actor).includes("fighter:tactical-mind"));
  const surge = actor.features.find((f) => f.definitionId === "fighter:action-surge");
  assert.equal(surge.max, 1);
  assert.equal(surge.used, 0);
});

test("PG-16: revising Guerriero 2 back to 1 recomputes HP 22 → 13 and removes level-2 features", () => {
  const state = createInitialState(),
    actor = fighter(state);
  const up = createCharacterDraft(
    state,
    { id: "up", kind: "advance", actorId: actor.id },
    "player",
  );
  up.data.classes[0].level = 2;
  up.data.hp.perLevel[2] = { method: "fixed" };
  let p = previewCharacterDraft(state, "up", "player");
  applyCharacterDraft(state, "up", { operationId: "op-up", reviewKey: p.reviewKey }, "player");
  assert.equal(actor.maxHp, 22);
  const down = createCharacterDraft(
    state,
    { id: "down", kind: "revise", actorId: actor.id },
    "player",
  );
  // Derived HP is never reported as a declared manual total.
  assert.notEqual(down.data.hp.mode, "manual");
  down.data.classes[0].level = 1;
  p = previewCharacterDraft(state, "down", "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  assert.equal(p.proposed.maxHp, 13);
  assert.ok(!p.proposed.features.some((f) => f.definitionId === "fighter:action-surge"));
  applyCharacterDraft(
    state,
    "down",
    { operationId: "op-down", reviewKey: p.reviewKey, allowIncomplete: p.incomplete },
    "player",
  );
  assert.equal(actor.level, 1);
  assert.equal(actor.maxHp, 13);
  assert.ok(!ids(actor).includes("fighter:action-surge"));
  assert.ok(!ids(actor).includes("fighter:tactical-mind"));
});

test("a sheet correction survives a level down as an offset, not a manual total", () => {
  const state = createInitialState(),
    actor = fighter(state);
  const up = createCharacterDraft(
    state,
    { id: "up", kind: "advance", actorId: actor.id },
    "player",
  );
  up.data.classes[0].level = 2;
  up.data.hp.perLevel[2] = { method: "fixed" };
  let p = previewCharacterDraft(state, "up", "player");
  applyCharacterDraft(state, "up", { operationId: "op-up", reviewKey: p.reviewKey }, "player");
  actor.maxHp = 25; // +3 from a DM-agreed correction on the sheet
  const down = createCharacterDraft(
    state,
    { id: "down", kind: "revise", actorId: actor.id },
    "player",
  );
  down.data.classes[0].level = 1;
  p = previewCharacterDraft(state, "down", "player");
  assert.equal(p.proposed.maxHp, 16);
  // Revising without changing levels keeps the live maximum.
  const same = createCharacterDraft(
    state,
    { id: "same", kind: "revise", actorId: actor.id },
    "player",
  );
  assert.equal(previewCharacterDraft(state, same.id, "player").proposed.maxHp, 25);
});

test("PG-08: Home «Avanza» prepares the next level with the fixed HP value and a full comparison", async () => {
  const { prepareLevelUp } = await import("../character-build.mjs");
  const { levelChanges } = await import("../character-builder.mjs");
  const state = createInitialState(),
    actor = fighter(state);
  createCharacterDraft(state, { id: "up", kind: "advance", actorId: actor.id }, "player");
  const d = prepareLevelUp(state, "up", "player");
  assert.equal(d.data.classes[0].level, 2);
  assert.deepEqual(d.data.hp.perLevel[2], { method: "fixed" });
  // Preparing twice never skips a level.
  assert.equal(prepareLevelUp(state, "up", "player").data.classes[0].level, 2);
  const p = previewCharacterDraft(state, "up", "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  assert.equal(p.incomplete, false);
  const changes = levelChanges(actor, p.proposed);
  assert.deepEqual(changes.level, { from: 1, to: 2 });
  assert.deepEqual(changes.maxHp, { from: 13, to: 22 });
  assert.deepEqual(changes.gained.map((f) => f.name.en).sort(), ["Action Surge", "Tactical Mind"]);
  assert.deepEqual(changes.dice, [{ die: "d10", from: 1, to: 2 }]);
  assert.ok(changes.uses.some((row) => row.name.en === "Action Surge" && row.to === 1));
});

test("PG-03: empty background increases are one precise origin error; missing abilities once", () => {
  const state = createInitialState();
  const d = createCharacterDraft(state, { id: "c" }, "player");
  d.data.classes = [{ classId: "fighter", level: 1, subclassId: null }];
  d.data.origin.backgroundId = "soldier";
  const p = previewCharacterDraft(state, "c", "player");
  const bg = p.errors.filter((e) => e.code === "background-increases");
  assert.equal(bg.length, 1);
  assert.equal(bg[0].section, "origin");
  assert.match(bg[0].path, /^origin\.backgroundBonuses\.(str|dex|con)$/);
  assert.equal(p.sections.find((s) => s.id === "origin").status, "incomplete");
  const abilities = p.errors.filter((e) => e.code === "ability-missing");
  assert.equal(abilities.length, 1);
  assert.equal(abilities[0].path, "abilities.assignment.str");
  // Level 1 HP has no field of its own: the message points at Constitution.
  const hp = p.errors.find((e) => e.code === "hp-needs-con");
  assert.equal(hp.section, "abilities");
  assert.equal(hp.path, "abilities.assignment.con");
  assert.ok(!p.errors.some((e) => e.code === "hp-missing"));
});

test("PG-05: a High Elf knows Prestidigitation or a chosen Wizard cantrip; a Wood Elf Druidcraft", () => {
  const state = createInitialState();
  const d = createCharacterDraft(state, { id: "elf" }, "player");
  d.data.classes = [{ classId: "fighter", level: 1, subclassId: null }];
  d.data.origin.speciesId = "elf";
  d.data.origin.choices = { lineage: "high", spellcastingAbility: "int", skill: "perception" };
  let p = previewCharacterDraft(state, "elf", "player");
  let grant = p.choices.spellGrants.find((g) => g.id === "species:elf:lineage");
  assert.equal(grant.spellId, "prestidigitation");
  assert.ok(
    p.proposed.spells.some(
      (s) => s.catalogId === "prestidigitation" || s.id?.includes("prestidigitation"),
    ),
  );
  // A non-caster elf is not asked to confirm a spells section for a granted cantrip.
  assert.ok(!p.errors.some((e) => e.code === "spells-review"));
  d.data.origin.choices.lineageCantrip = "fire-bolt";
  p = previewCharacterDraft(state, "elf", "player");
  grant = p.choices.spellGrants.find((g) => g.id === "species:elf:lineage");
  assert.equal(grant.spellId, "fire-bolt");
  d.data.origin.choices.lineageCantrip = "guidance"; // not a Wizard cantrip
  p = previewCharacterDraft(state, "elf", "player");
  assert.ok(p.errors.some((e) => e.code === "lineage-cantrip" && e.section === "origin"));
  d.data.origin.choices = { lineage: "wood", spellcastingAbility: "wis", skill: "perception" };
  p = previewCharacterDraft(state, "elf", "player");
  assert.equal(
    p.choices.spellGrants.find((g) => g.id === "species:elf:lineage").spellId,
    "druidcraft",
  );
});

test("level up keeps spent uses and raises only the class-table maximum", () => {
  const state = createInitialState(),
    actor = fighter(state);
  const wind = actor.features.find((f) => f.definitionId === "fighter:second-wind");
  assert.equal(wind.max, 2);
  wind.used = 1;
  const d = createCharacterDraft(state, { id: "up", kind: "advance", actorId: actor.id }, "player");
  d.data.classes[0].level = 4;
  for (const level of [2, 3, 4]) d.data.hp.perLevel[level] = { method: "fixed" };
  d.data.classes[0].subclassId = "champion";
  d.data.features.selected.push({
    id: "ability-score-improvement",
    grantId: "class:fighter:feat:4",
    bonuses: { str: 1, con: 1 },
  });
  const p = previewCharacterDraft(state, "up", "player");
  const next = p.proposed.features.find((f) => f.definitionId === "fighter:second-wind");
  assert.equal(next.used, 1, "spent use kept");
  assert.equal(next.max, 3, "Second Wind grows to 3 at level 4");
});
