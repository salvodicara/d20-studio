// P1 PG-92 (ddb-importer / Foundry «Import Data»): a Foundry VTT dnd5e actor JSON is mapped
// through a documented mapper, previewed with mapped and unmapped fields, then imported as
// a new sheet or used to update the sheet imported earlier from the same actor.
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import { parseCharacterFile, fromFoundryActor } from "../character-export.mjs";
import * as L from "../character-library.mjs";
import { createRegistry } from "../registry.mjs";

// Synthetic actor shaped like a Foundry dnd5e «Export Data» of a character.
export function foundryActor(overrides = {}) {
  return {
    _id: "fvttSyntheticKael",
    name: "Kael",
    type: "character",
    img: "icons/svg/mystery-man.svg",
    system: {
      abilities: {
        str: { value: 16, proficient: 1 },
        dex: { value: 12, proficient: 0 },
        con: { value: 14, proficient: 1 },
        int: { value: 10, proficient: 0 },
        wis: { value: 11, proficient: 0 },
        cha: { value: 8, proficient: 0 },
      },
      attributes: {
        hp: { value: 18, max: 20, temp: 0 },
        ac: { flat: 16, calc: "flat" },
        movement: { walk: 30, units: "ft" },
      },
      skills: { ath: { value: 1 }, prc: { value: 1 }, ste: { value: 0 } },
      spells: {},
      details: {
        biography: { value: "<p>Veterano del ponte.</p><p>Cerca il fratello.</p>" },
        appearance: "Cicatrice sul mento",
        trait: "Parlo poco.",
        ideal: "Lealtà",
        bond: "Mio fratello",
        flaw: "Testardo",
      },
      currency: { gp: 12 },
      traits: { size: "med" },
    },
    items: [
      {
        name: "Fighter",
        type: "class",
        system: { identifier: "fighter", levels: 2, hitDice: "d10", hitDiceUsed: 1 },
      },
      {
        name: "Longsword",
        type: "weapon",
        system: { quantity: 1, equipped: true, weight: { value: 3 } },
      },
      { name: "Chain Mail", type: "equipment", system: { quantity: 1, armor: { value: 16 } } },
      {
        name: "Second Wind",
        type: "feat",
        system: { description: { value: "<p>Recover HP.</p>" } },
      },
      { name: "Human", type: "race", system: {} },
    ],
    effects: [],
    flags: {},
    ...overrides,
  };
}

test("PG-92: the Foundry mapper reports mapped and unmapped fields", () => {
  const mapped = fromFoundryActor(foundryActor());
  assert.equal(mapped.ok, true);
  assert.ok(mapped.mapped.includes("system.abilities"));
  assert.ok(mapped.mapped.includes("items[class]"));
  assert.ok(mapped.unmapped.includes("system.currency"));
  assert.ok(mapped.unmapped.some((row) => row.startsWith("items[race]")));
  const c = mapped.file.character;
  assert.equal(c.level, 2);
  assert.equal(c.maxHp, 20);
  assert.equal(c.speed, 9);
  assert.deepEqual(c.skills.sort(), ["athletics", "perception"]);
  assert.deepEqual(c.buildSeed.classes, [{ classId: "fighter", level: 2 }]);
  assert.deepEqual(c.hitDice, { d10: { max: 2, used: 1 } });
  assert.deepEqual(c.personality.traits, ["Parlo poco."]);
  assert.match(c.backstory, /Veterano del ponte\.\nCerca il fratello\./);
  // Not a character: refused with its own reason.
  assert.equal(fromFoundryActor({ ...foundryActor(), type: "npc" }).ok, false);
});

test("PG-92: a Foundry actor imports as a new sheet, and a newer export updates it", () => {
  const state = createInitialState();
  const registry = createRegistry({ logger: null, document: null });
  registry.use("character-library", L.register);
  registry.initState(state);
  const parsed = parseCharacterFile(JSON.stringify(foundryActor()));
  assert.equal(parsed.ok, true, parsed.it);
  assert.equal(parsed.preview.format, "foundry-dnd5e");
  assert.ok(parsed.preview.mapped.length > 3);
  assert.ok(parsed.preview.ignored.includes("system.currency"));
  const id = L.importCharacter(state, parsed, "player", { fileName: "kael.json" });
  const actor = state.actors[id];
  assert.equal(actor.imported.format, "foundry-dnd5e");
  assert.equal(actor.imported.sourceId, "fvttSyntheticKael");
  assert.equal(actor.maxHp, 20);
  assert.equal(actor.inventory.length, 2);
  assert.equal(actor.personality.bonds[0], "Mio fratello");
  // A later export of the same actor: level 3, more HP.
  const newer = foundryActor();
  newer.items[0].system.levels = 3;
  newer.system.attributes.hp = { value: 18, max: 28, temp: 0 };
  const again = parseCharacterFile(JSON.stringify(newer));
  assert.deepEqual(
    L.importedFrom(state, again, "player").map((row) => row.id),
    [id],
  );
  L.updateFromFile(state, id, again, "player", { fileName: "kael-3.json" });
  assert.equal(actor.level, 3);
  assert.equal(actor.maxHp, 28);
  assert.equal(actor.hp, 18, "current HP is not healed by an update");
  // Hit points computed by Foundry (max empty) are estimated with the fixed method.
  const computed = foundryActor();
  computed.system.attributes.hp = { value: 12, max: null, temp: 0 };
  const estimate = parseCharacterFile(JSON.stringify(computed));
  assert.equal(estimate.character.maxHp, 10 + 6 + 2 * 2);
  assert.ok(estimate.preview.missing.some((row) => /stimati|estimated/.test(row.it + row.en)));
});
