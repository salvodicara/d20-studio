// P1 BI-22 (Roll20 custom class in the builder) and BI-21 (dnd5e Advancement applied on
// level up): a homebrew class the builder offers, with its grants, scale value, ASI and
// feature choice applied level by level.
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import {
  createHomebrewDraft,
  saveHomebrewDraft,
  previewHomebrewDraft,
  applyHomebrewDraft,
} from "../homebrew.mjs";
import {
  createCharacterDraft,
  saveCharacterDraft,
  previewCharacterDraft,
  applyCharacterDraft,
  getDraftCatalog,
} from "../character-build.mjs";

function lanternKeeper(state, role = "player") {
  const d = createHomebrewDraft(state, { id: "keeper", type: "class" }, role);
  const f = (id, it, en) => ({ id, name: { it, en }, description: { it: "Testo", en: "Text" } });
  saveHomebrewDraft(
    state,
    d.id,
    {
      expectedRevision: d.revision,
      data: {
        ...d.data,
        name: { it: "Custode delle lanterne", en: "Lantern Keeper" },
        description: { it: "Classe homebrew", en: "Homebrew class" },
        source: { ...d.data.source, label: "Original synthetic homebrew" },
        structured: {
          version: 1,
          type: "class",
          template: null,
          prerequisites: [],
          options: [],
          modifiers: [],
          activities: [],
          advancement: [
            { id: "a1", type: "grant", level: 1, features: [f("f1", "Lanterna", "Lantern")] },
            {
              id: "a2",
              type: "scale",
              level: 2,
              scale: {
                name: { it: "Dado della lanterna", en: "Lantern die" },
                values: { 2: "1d6", 5: "1d8" },
              },
            },
            { id: "a4", type: "asi", level: 4, asi: { points: 2, limit: 20 } },
            {
              id: "a3",
              type: "choice",
              level: 3,
              choice: {
                name: { it: "Via della luce", en: "Path of light" },
                from: [f("c1", "Fiamma", "Flame"), f("c2", "Ombra", "Shadow")],
              },
            },
          ],
          class: { hitDie: 8, primary: ["wis"], saves: ["wis", "cha"], caster: "none" },
          subclass: null,
          item: null,
          creature: null,
          origin: null,
          automation: null,
        },
      },
    },
    role,
  );
  const p = previewHomebrewDraft(state, d.id, role);
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  return applyHomebrewDraft(state, d.id, { reviewKey: p.reviewKey }, role).ref;
}

test("BI-22: the builder catalog offers a usable homebrew class", () => {
  const state = createInitialState();
  const ref = lanternKeeper(state);
  const draft = createCharacterDraft(state, { id: "c" }, "player");
  const catalog = getDraftCatalog(state, draft.id, "player");
  const keeper = catalog.classes.find((c) => c.homebrewRef?.contentId === ref.contentId);
  assert.ok(keeper, "homebrew class offered");
  assert.equal(keeper.hitDie, 8);
  assert.equal(keeper.name.it, "Custode delle lanterne");
  // The DM, who cannot read the private homebrew, is not offered it.
  const dmDraft = createCharacterDraft(state, { id: "dm-c" }, "dm");
  assert.ok(!getDraftCatalog(state, dmDraft.id, "dm").classes.some((c) => c.homebrew));
});

test("BI-21: leveling a homebrew class applies grants, scale value, feature choice and ASI", () => {
  const state = createInitialState();
  const ref = lanternKeeper(state);
  const id = `hb-class:${ref.contentId}`;
  const d = createCharacterDraft(state, { id: "c" }, "player");
  saveCharacterDraft(
    state,
    "c",
    {
      expectedRevision: d.revision,
      data: {
        identity: { ...d.data.identity, name: "Lume" },
        classes: [{ classId: id, level: 1, subclassId: null }],
        origin: {
          backgroundId: "soldier",
          speciesId: "halfling",
          backgroundBonuses: { dex: 2, con: 1 },
          choices: {},
        },
        abilities: {
          method: "manual",
          scores: { str: 8, dex: 14, con: 13, int: 12, wis: 15, cha: 10 },
          assignment: {},
          manualTotals: {},
          source: "Synthetic",
        },
        skills: {
          selected: ["insight", "perception"],
          languages: ["elvish", "dwarvish"],
          tools: [],
          confirmed: true,
        },
        features: { selected: [], custom: [], featOverride: false, confirmed: true },
        spells: { selected: [], prepared: [], custom: [], confirmed: true },
        equipment: { mode: "manual", items: [], currency: { gp: 0 }, confirmed: true },
        hp: { mode: "calculated", perLevel: {}, currentKnown: false },
      },
    },
    "player",
  );
  let p = previewCharacterDraft(state, "c", "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  // CON 14 → +2: d8 + 2 = 10.
  assert.equal(p.proposed.maxHp, 10);
  assert.ok(p.proposed.features.some((f) => f.name.en === "Lantern"));
  assert.deepEqual(p.proposed.savingThrows.wis > p.proposed.savingThrows.str, true);
  // Level 4: the scale value, the choice (still to make) and the ASI grant.
  const draft = state.characterDrafts.find((row) => row.id === "c");
  draft.data.classes[0].level = 4;
  for (const level of [2, 3, 4]) draft.data.hp.perLevel[level] = { method: "fixed" };
  p = previewCharacterDraft(state, "c", "player");
  assert.ok(p.proposed.features.some((f) => /Lantern die: 1d6/.test(f.name.en)));
  const grantIds = p.choices.grants.map((g) => g.id);
  assert.ok(grantIds.includes(`class:${id}:choice:a3`));
  assert.ok(grantIds.includes(`class:${id}:asi:4`));
  assert.ok(p.errors.some((e) => e.code === "required-feature-choice"));
  draft.data.features.selected = [
    { id: "c1", grantId: `class:${id}:choice:a3` },
    { id: "ability-score-improvement", grantId: `class:${id}:asi:4`, bonuses: { wis: 2 } },
  ];
  p = previewCharacterDraft(state, "c", "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  assert.ok(p.proposed.features.some((f) => f.name.en === "Flame"));
  assert.equal(p.proposed.abilities.wis, 17);
  // No subclass is demanded by a homebrew class without subclasses.
  assert.ok(!p.errors.some((e) => e.code === "subclass"));
  const { actorId } = applyCharacterDraft(
    state,
    "c",
    { operationId: "op-c", reviewKey: p.reviewKey, allowIncomplete: p.incomplete },
    "player",
  );
  assert.equal(state.actors[actorId].level, 4);
  assert.equal(state.actors[actorId].hitDice.d8.max, 4);
});
