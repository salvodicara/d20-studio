// P1 PG-12: duplicate proficiencies name their source and a clash between two of the
// player's own choices asks which one to replace (DDB duplicate-proficiency detection).
import test from "node:test";
import assert from "node:assert/strict";
import * as D from "../builder-plus-domain.mjs";

test("PG-12: a class pick of the Elf's Keen Senses skill asks, naming Elfo (Sensi acuti)", () => {
  const data = {
    classes: [{ classId: "fighter", level: 1 }],
    origin: {
      backgroundId: "sage",
      speciesId: "elf",
      choices: { lineage: "high", skill: "perception" },
    },
    skills: { selected: ["athletics", "perception"], confirmed: true },
  };
  const [row] = D.duplicateSkills(data);
  assert.equal(row.ask, true);
  assert.equal(row.skillId, "perception");
  assert.deepEqual(row.grantedBy.name, { it: "Elfo (Sensi acuti)", en: "Elf (Keen Senses)" });
  assert.deepEqual(row.alsoBy.name, { it: "Guerriero", en: "Fighter" });
  // Nothing is cleared silently.
  assert.deepEqual(D.releaseDuplicates(data), []);
  assert.equal(data.origin.choices.skill, "perception");
  assert.deepEqual(data.skills.selected, ["athletics", "perception"]);
  // The player chooses: replace the class pick.
  D.replaceDuplicate(data, "perception", "class", { now: Date.UTC(2026, 8, 26) });
  assert.deepEqual(data.skills.selected, ["athletics"]);
  assert.equal(data.origin.choices.skill, "perception");
  assert.equal(data.skills.released.at(-1).from, "class");
  assert.deepEqual(D.duplicateSkills(data), []);
});

test("PG-12: replacing the species choice frees it and records the class as the source", () => {
  const data = {
    classes: [{ classId: "fighter", level: 1 }],
    origin: { backgroundId: "sage", speciesId: "elf", choices: { skill: "perception" } },
    skills: { selected: ["perception"], confirmed: true },
  };
  D.replaceDuplicate(data, "perception", "species");
  assert.equal(data.origin.choices.skill, undefined);
  assert.deepEqual(data.skills.selected, ["perception"]);
  assert.equal(data.skills.released.at(-1).grantedBy.name.it, "Guerriero");
});

test("PG-12: a background duplicate is still released automatically, naming the background", () => {
  const data = {
    classes: [{ classId: "fighter", level: 1 }],
    origin: { backgroundId: "soldier", speciesId: "elf", choices: { skill: "perception" } },
    skills: { selected: ["athletics"], confirmed: true },
  };
  const [row] = D.releaseDuplicates(data);
  assert.equal(row.grantedBy.name.it, "Soldato");
  assert.deepEqual(data.skills.selected, []);
});

test("PG-10: personality suggestions per background, random picks skip what is listed", () => {
  assert.ok(D.PERSONALITY_SUGGESTIONS.soldier.ideals.length >= 4);
  for (const key of ["traits", "ideals", "bonds", "flaws"]) {
    const all = D.personalitySuggestions("sage", key);
    assert.ok(
      all.every((entry) => entry.it && entry.en),
      key,
    );
  }
  const first = D.randomPersonality("soldier", "flaws", [], "it", () => 0);
  assert.equal(typeof first, "string");
  const second = D.randomPersonality("soldier", "flaws", [first], "it", () => 0);
  assert.notEqual(second, first);
  const everything = D.personalitySuggestions("soldier", "flaws").map((e) => e.it);
  assert.equal(D.randomPersonality("soldier", "flaws", everything, "it"), null);
});

test("PG-10: the builder stores actor.personality as four string arrays on apply", async () => {
  const { createInitialState } = await import("../state.mjs");
  const B = await import("../character-build.mjs");
  const state = createInitialState();
  const d = B.createCharacterDraft(state, { id: "p1" }, "player");
  assert.deepEqual(d.data.story.personality, { traits: [], ideals: [], bonds: [], flaws: [] });
  d.data.story.personality = {
    traits: ["Parlo poco.", "  "],
    ideals: ["Libertà"],
    bonds: [],
    flaws: [3],
  };
  const p = B.previewCharacterDraft(state, "p1", "player");
  assert.deepEqual(p.proposed.story.personality, {
    traits: ["Parlo poco."],
    ideals: ["Libertà"],
    bonds: [],
    flaws: [],
  });
});
