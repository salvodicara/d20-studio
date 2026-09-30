import test from "node:test";
import assert from "node:assert/strict";
import {
  ALL_ENTRIES,
  COINS,
  CONDITION_INDEX,
  CREATURES,
  ENCOUNTER_BUDGET_SOURCE,
  ENCOUNTER_DIFFICULTIES,
  ENCOUNTER_XP_BUDGET,
  ITEMS,
  LABELS,
  LABEL_SOURCES,
  RULES_GLOSSARY,
  SPELLS,
  SRD_ATTRIBUTION,
  SRD_DOCUMENTS,
  XP_BY_CR,
  XP_BY_CR_SOURCE,
  costInCp,
  crToNumber,
  encounterBudget,
  encounterXp,
  feetToMeters,
  formatCost,
  formatDistance,
  formatWeight,
  getById,
  getCatalogSummary,
  normalizeSearchText,
  poundsToKg,
  proficiencyBonusForCr,
  rateEncounter,
  searchCatalog,
  srdSource,
  translationStatus,
  xpForCr,
} from "../srd-sample.mjs";
import { getCharacterCatalog } from "../character-rules.mjs";

const EN_SHA = "8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87";
const IT_SHA = "a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718";
const isText = (v) =>
  v && typeof v.it === "string" && v.it.trim() && typeof v.en === "string" && v.en.trim();
const isPages = (pages, max) =>
  Array.isArray(pages) &&
  pages.length > 0 &&
  pages.every((p) => Number.isInteger(p) && p >= 1 && p <= max);
const diceAverage = (formula) => {
  const m = /^(\d+)d(\d+)([+-]\d+)?$/.exec(formula);
  assert.ok(m, `dice formula ${formula}`);
  return Math.floor((Number(m[1]) * (Number(m[2]) + 1)) / 2 + Number(m[3] ?? 0));
};
const mod = (score) => Math.floor((score - 10) / 2);

function assertSource(source, label) {
  assert.equal(source.kind, "srd", label);
  assert.equal(source.edition, "2024", label);
  assert.equal(source.revision, "5.2.1", label);
  assert.equal(source.sha256, EN_SHA, label);
  assert.equal(source.url, SRD_DOCUMENTS.en.url, label);
  assert.deepEqual(source.pages, source.en.pages, label);
  assert.equal(source.en.sha256, EN_SHA, label);
  assert.equal(source.it.sha256, IT_SHA, label);
  assert.equal(source.it.url, SRD_DOCUMENTS.it.url, label);
  assert.ok(isPages(source.en.pages, SRD_DOCUMENTS.en.pageCount), `${label} EN pages`);
  assert.ok(isPages(source.it.pages, SRD_DOCUMENTS.it.pageCount), `${label} IT pages`);
}

test("catalog meets the sample size targets", () => {
  const summary = getCatalogSummary();
  assert.ok(summary.spells >= 45, "spells");
  assert.ok(summary.creatures >= 30, "creatures");
  assert.ok(summary.items >= 50, "items");
  assert.ok(summary.rules >= 30, "glossary terms");
  assert.equal(summary.conditions, 15);
  assert.equal(summary.coins, 5);
  assert.equal(ALL_ENTRIES.length, summary.spells + summary.creatures + summary.items + 54);
});

test("every entry has a stable id, names, tags, summary and an SRD source", () => {
  const kinds = new Set(["spell", "creature", "item", "rule", "condition"]);
  for (const e of ALL_ENTRIES) {
    assert.ok(kinds.has(e.kind), e.id);
    assert.match(e.id, /^srd2024:(spell|creature|item|rule|condition):[a-z0-9-]+$/, e.id);
    assert.equal(e.id.split(":")[2], e.slug, e.id);
    assert.ok(isText(e.name), `${e.id} name`);
    assert.ok(isText(e.summary), `${e.id} summary`);
    // Own-words summaries stay short; they never carry SRD rules text.
    assert.ok(e.summary.it.length <= 260 && e.summary.en.length <= 260, `${e.id} summary length`);
    assert.ok(Array.isArray(e.tags) && e.tags.length > 0, `${e.id} tags`);
    assert.equal(new Set(e.tags).size, e.tags.length, `${e.id} duplicate tags`);
    assert.ok(Array.isArray(e.aliases), `${e.id} aliases`);
    assert.equal(translationStatus(e), "official", `${e.id} translation`);
    assertSource(e.source, e.id);
    assert.ok(Object.isFrozen(e) && Object.isFrozen(e.source) && Object.isFrozen(e.name), e.id);
  }
});

test("ids and aliases are unique and resolve through getById", () => {
  const ids = ALL_ENTRIES.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const e of ALL_ENTRIES) {
    assert.equal(getById(e.id), e);
    for (const alias of e.aliases) assert.equal(getById(alias), e);
  }
  // Existing forms-companions profile ids resolve to the catalog creatures.
  assert.equal(getById("srd2024:cat").slug, "cat");
  assert.equal(getById("srd2024:rat").slug, "rat");
  assert.equal(getById("srd2024:wolf").slug, "wolf");
  assert.equal(getById("srd2024:spell:nope"), undefined);
  assert.equal(translationStatus({ name: { it: null, en: "X" } }), "missing");
});

test("spells cover levels 0-5 and every spellcasting class with valid structure", () => {
  const classes = new Set(Object.keys(LABELS.spellClass));
  const seenClasses = new Set();
  const seenLevels = new Set();
  for (const s of SPELLS) {
    assert.ok(Number.isInteger(s.level) && s.level >= 0 && s.level <= 5, s.id);
    assert.ok(LABELS.school[s.school], `${s.id} school`);
    assert.ok(s.classes.length > 0 && s.classes.every((c) => classes.has(c)), `${s.id} classes`);
    assert.ok(
      ["action", "bonus-action", "reaction", "minute", "hour"].includes(s.castingTime.unit),
      s.id,
    );
    assert.ok(["self", "touch", "feet"].includes(s.range.kind), s.id);
    if (s.range.kind === "feet") assert.ok(s.range.feet > 0, s.id);
    assert.ok(s.components.verbal || s.components.somatic || s.components.material, s.id);
    if (s.components.materialConsumed) assert.ok(s.components.materialCostGp > 0, s.id);
    assert.ok(["instantaneous", "timed"].includes(s.duration.kind), s.id);
    for (const d of s.damage) {
      assert.match(d.dice, /^\d+d\d+(\+\d+)?$/, s.id);
      assert.ok(
        d.types.every((t) => LABELS.damageType[t]),
        `${s.id} damage type`,
      );
    }
    if (s.save) assert.ok(LABELS.ability[s.save.ability], s.id);
    assert.ok(s.tags.includes("spell") && s.tags.includes(s.school), s.id);
    assert.equal(s.tags.includes("concentration"), s.concentration, s.id);
    s.classes.forEach((c) => seenClasses.add(c));
    seenLevels.add(s.level);
  }
  assert.deepEqual([...seenClasses].sort(), [...classes].sort());
  assert.deepEqual([...seenLevels].sort(), [0, 1, 2, 3, 4, 5]);
  for (const slug of "fire-bolt magic-missile burning-hands shield find-familiar cure-wounds healing-word aid".split(
    " ",
  )) {
    assert.ok(getById(`srd2024:spell:${slug}`), slug);
  }
  const fireball = getById("srd2024:spell:fireball");
  assert.deepEqual(fireball.area, { shape: "sphere", feet: 20 });
  assert.deepEqual(fireball.save, { ability: "dex", halfOnSuccess: true });
  assert.deepEqual(fireball.damage, [{ dice: "8d6", types: ["fire"] }]);
  const familiar = getById("srd2024:spell:find-familiar");
  assert.equal(familiar.ritual, true);
  assert.deepEqual(familiar.castingTime, { unit: "hour", amount: 1 });
  assert.equal(familiar.components.materialCostGp, 10);
  assert.deepEqual(familiar.classes, ["wizard"]);
});

test("spells linked to character-rules agree on level, classes, EN name and page", () => {
  const byId = new Map(getCharacterCatalog().spells.map((s) => [s.id, s]));
  // Known divergences: character-rules uses non-SRD Italian names for these two spells.
  const itDivergence = new Set(["spare-the-dying", "druidcraft"]);
  const linked = SPELLS.filter((s) => s.links.characterRules);
  assert.ok(linked.length >= 30);
  for (const s of linked) {
    const rule = byId.get(s.links.characterRules);
    assert.ok(rule, s.id);
    assert.equal(rule.level, s.level, s.id);
    assert.deepEqual([...rule.classes].sort(), [...s.classes].sort(), s.id);
    assert.equal(rule.name.en, s.name.en, s.id);
    assert.equal(rule.source.pages[0], s.source.en.pages[0], s.id);
    if (!itDivergence.has(s.slug)) {
      assert.equal(rule.name.it.toLowerCase(), s.name.it.toLowerCase(), s.id);
    }
  }
});

test("creatures span CR 0-8 with consistent stat block numbers", () => {
  const conditionIds = new Set(CONDITION_INDEX.map((c) => c.slug));
  const crs = new Set();
  for (const c of CREATURES) {
    assert.ok(c.crValue >= 0 && c.crValue <= 8, c.id);
    crs.add(c.cr);
    assert.equal(c.xp, xpForCr(c.cr), `${c.id} xp`);
    assert.equal(c.proficiencyBonus, proficiencyBonusForCr(c.cr), `${c.id} pb`);
    assert.ok(c.size.length > 0 && c.size.every((s) => LABELS.size[s]), c.id);
    assert.ok(LABELS.creatureType[c.type] && LABELS.alignment[c.alignment], c.id);
    assert.ok(
      c.typeTags.every((t) => LABELS.creatureTag[t]),
      c.id,
    );
    assert.equal(c.hp.average, diceAverage(c.hp.formula), `${c.id} hp`);
    assert.equal(c.initiative.score, 10 + c.initiative.bonus, c.id);
    assert.ok(c.ac >= 5 && c.ac <= 25, c.id);
    assert.ok(c.speed.walk >= 0, c.id);
    const abilities = Object.values(c.abilities);
    assert.equal(abilities.length, 6, c.id);
    assert.ok(
      abilities.every((v) => Number.isInteger(v) && v >= 1 && v <= 30),
      c.id,
    );
    for (const [ability, bonus] of Object.entries(c.saves)) {
      assert.ok(bonus > mod(c.abilities[ability]), `${c.id} save ${ability}`);
    }
    const perception = c.skills.perception ?? mod(c.abilities.wis);
    assert.equal(c.senses.passivePerception, 10 + perception, `${c.id} passive perception`);
    for (const t of [...c.vulnerabilities, ...c.resistances, ...c.immunities]) {
      assert.ok(LABELS.damageType[t], `${c.id} ${t}`);
    }
    for (const t of c.conditionImmunities) assert.ok(conditionIds.has(t), `${c.id} ${t}`);
    for (const g of c.gear) {
      if (g.itemId) assert.equal(getById(g.itemId)?.kind, "item", `${c.id} gear ${g.itemId}`);
      else assert.ok(isText(g.name), `${c.id} gear name`);
    }
    assert.ok(isText(c.languages), c.id);
    assert.ok(c.actions.length > 0, c.id);
    for (const a of [...c.traits, ...c.actions, ...c.bonusActions, ...c.reactions]) {
      assert.ok(a.id && isText(a.name) && isText(a.summary), `${c.id} ${a.id}`);
      for (const d of a.damage ?? []) {
        assert.ok(LABELS.damageType[d.type], `${c.id} ${a.id}`);
        if (d.dice) assert.equal(d.average, diceAverage(d.dice), `${c.id} ${a.id} average`);
      }
      if (a.kind === "attack") assert.ok(a.attack.reach || a.attack.range, `${c.id} ${a.id}`);
      if (a.kind === "save") assert.ok(LABELS.ability[a.save.ability] && a.save.dc >= 8, a.id);
      const spells = [
        ...(a.spells?.atWill ?? []),
        ...Object.values(a.spells?.perDay ?? {}).flat(),
        ...(Array.isArray(a.spells) ? a.spells : []),
      ];
      for (const ref of spells) {
        if (ref.spellId) assert.equal(getById(ref.spellId)?.kind, "spell", ref.spellId);
        else assert.ok(isText(ref.name));
      }
    }
  }
  for (const cr of ["0", "1/8", "1/4", "1/2", "1", "2", "3", "4", "5", "6", "7", "8"]) {
    assert.ok(crs.has(cr), `CR ${cr}`);
  }
  for (const slug of ["goblin-warrior", "wolf", "cat", "rat"]) {
    assert.ok(getById(`srd2024:creature:${slug}`), slug);
  }
  const goblin = getById("srd2024:creature:goblin-warrior");
  assert.equal(goblin.name.it, "Goblin guerriero");
  assert.deepEqual(goblin.hp, { average: 10, formula: "3d6" });
  assert.equal(goblin.actions[0].attack.bonus, 4);
  assert.deepEqual(goblin.actions[0].damage, [{ average: 5, dice: "1d6+2", type: "slashing" }]);
  assert.match(goblin.actions[1].summary.it, /gittata 24\/96 m/);
});

test("items carry valid weapon, armor, tool, gear and magic data", () => {
  const categories = new Set(Object.keys(LABELS.itemCategory));
  const rarities = new Set();
  for (const i of ITEMS) {
    assert.ok(categories.has(i.category), i.id);
    assert.ok(i.tags.includes(i.category), i.id);
    if (i.cost) assert.ok(costInCp(i.cost) > 0, i.id);
    if (i.weight != null) assert.ok(i.weight > 0, i.id);
    if (i.category === "weapon") {
      const w = i.weapon;
      assert.ok(LABELS.mastery[w.mastery], i.id);
      assert.ok(
        w.properties.every((p) => LABELS.weaponProperty[p]),
        i.id,
      );
      assert.ok(LABELS.damageType[w.damage.type], i.id);
      assert.equal(w.properties.includes("versatile"), !!w.versatile, i.id);
      assert.equal(
        w.properties.includes("thrown") || w.properties.includes("ammunition"),
        !!w.range,
        i.id,
      );
      assert.equal(w.properties.includes("ammunition"), !!w.ammunition, i.id);
    }
    if (i.category === "armor") {
      const a = i.armor;
      assert.ok(LABELS.armorCategory[a.category], i.id);
      if (a.category === "shield") assert.equal(a.acBonus, 2);
      else assert.ok(a.baseAc >= 11 && a.baseAc <= 18, i.id);
      if (a.category === "heavy") assert.equal(a.addsDex, false, i.id);
      if (a.category === "medium") assert.equal(a.dexCap, 2, i.id);
    }
    if (i.category === "tool") assert.ok(LABELS.ability[i.tool.ability], i.id);
    if (i.category === "magic-item") {
      const m = i.magic;
      assert.ok(LABELS.magicItemType[m.type] && LABELS.rarity[m.rarity], i.id);
      if (m.rarity === "varies") assert.ok(m.variants.length > 0, i.id);
      (m.variants ?? [{ rarity: m.rarity }]).forEach((v) => rarities.add(v.rarity));
      if (m.attunement) assert.equal(m.attunement.required, true, i.id);
      if (m.charges) assert.ok(m.charges.max > 0 && getById(m.castsSpellId), i.id);
    }
    for (const part of i.contents ?? []) {
      if (part.itemId) assert.ok(getById(part.itemId), `${i.id} contents`);
    }
  }
  for (const r of ["common", "uncommon", "rare"]) assert.ok(rarities.has(r), r);
  const longsword = getById("srd2024:item:longsword");
  assert.deepEqual(longsword.weapon.damage, { dice: "1d8", type: "slashing" });
  assert.equal(longsword.weapon.mastery, "sap");
  assert.equal(longsword.weapon.versatile, "1d10");
  assert.deepEqual(longsword.cost, { gp: 15 });
  const plate = getById("srd2024:item:plate-armor");
  assert.equal(plate.armor.baseAc, 18);
  assert.equal(plate.armor.strength, 15);
  assert.equal(plate.armor.stealthDisadvantage, true);
  assert.equal(costInCp(plate.cost), 150000);
  const potion = getById("srd2024:item:potion-of-healing");
  assert.equal(potion.magic.healing, "2d4+2");
  assert.equal(potion.magic.rarity, "common");
  const wand = getById("srd2024:item:wand-of-magic-missiles");
  assert.equal(wand.magic.charges.max, 7);
  assert.equal(wand.magic.castsSpellId, "srd2024:spell:magic-missile");
});

test("glossary covers the core 2024 actions and rules and links conditions", () => {
  const required =
    "advantage disadvantage bloodied concentration difficult-terrain opportunity-attacks ready help hide influence study search utilize attack dash disengage dodge magic";
  for (const slug of required.split(" ")) assert.ok(getById(`srd2024:rule:${slug}`), slug);
  for (const r of RULES_GLOSSARY) {
    assert.ok(r.tag === null || LABELS.ruleTag[r.tag], r.id);
    assert.ok(isText(r.heading), r.id);
    for (const rel of r.related) assert.equal(getById(rel)?.kind, "rule", `${r.id} -> ${rel}`);
  }
  assert.equal(getById("srd2024:rule:hide").heading.it, "Nascondersi [azione]");
  assert.equal(getById("srd2024:rule:hide").heading.en, "Hide [Action]");
  assert.equal(RULES_GLOSSARY.filter((r) => r.tag === "action").length, 12);
  for (const c of CONDITION_INDEX) {
    assert.equal(c.links.conditions, c.slug);
    assert.match(c.heading.en, / \[Condition\]$/);
  }
});

test("XP by CR table and proficiency bonuses match the 2024 values", () => {
  assert.equal(XP_BY_CR.length, 34);
  assertSource(XP_BY_CR_SOURCE, "xp");
  for (let i = 1; i < XP_BY_CR.length; i += 1) {
    assert.ok(XP_BY_CR[i].value > XP_BY_CR[i - 1].value, "CR increases");
    assert.ok(XP_BY_CR[i].xp > XP_BY_CR[i - 1].xp, "XP increases");
  }
  assert.deepEqual(XP_BY_CR[0].xpAlternatives, [0, 10]);
  const spot = {
    "1/8": 25,
    "1/4": 50,
    "1/2": 100,
    1: 200,
    5: 1800,
    8: 3900,
    20: 25000,
    30: 155000,
  };
  for (const [cr, xp] of Object.entries(spot)) assert.equal(xpForCr(cr), xp, cr);
  const pb = { 0: 2, 4: 2, 5: 3, 8: 3, 9: 4, 13: 5, 17: 6, 21: 7, 25: 8, 29: 9, 30: 9 };
  for (const [cr, bonus] of Object.entries(pb)) assert.equal(proficiencyBonusForCr(cr), bonus, cr);
  assert.equal(crToNumber("1/4"), 0.25);
  assert.ok(Number.isNaN(crToNumber("x")));
  assert.throws(() => xpForCr("31"), /Unknown Challenge Rating/);
});

test("encounter budgets reproduce the SRD worked examples", () => {
  assertSource(ENCOUNTER_BUDGET_SOURCE, "budget");
  assert.equal(ENCOUNTER_XP_BUDGET.length, 20);
  ENCOUNTER_XP_BUDGET.forEach((row, i) => {
    assert.equal(row.level, i + 1);
    assert.ok(row.low < row.moderate && row.moderate < row.high, `level ${row.level}`);
    if (i > 0) {
      for (const d of ENCOUNTER_DIFFICULTIES) assert.ok(row[d] > ENCOUNTER_XP_BUDGET[i - 1][d]);
    }
  });
  // Example 1: four level 1 characters, Low = 200 XP; one Bugbear Warrior or six Giant Rats fit.
  assert.equal(encounterBudget([1, 1, 1, 1]).low, 200);
  assert.equal(encounterXp(["srd2024:creature:bugbear-warrior"]), 200);
  assert.equal(encounterXp([{ id: "srd2024:creature:giant-rat", count: 6 }]), 150);
  // Example 2 and 3 budgets.
  assert.equal(encounterBudget([3, 3, 3, 3, 3]).moderate, 1125);
  assert.equal(encounterBudget(Array(6).fill(15)).high, 46800);
  // Mixed party levels sum per character.
  assert.deepEqual(encounterBudget([1, 2]), { low: 150, moderate: 225, high: 300 });
  const rating = rateEncounter([1, 1, 1, 1], [{ id: "srd2024:creature:goblin-warrior", count: 4 }]);
  assert.equal(rating.xp, 200);
  assert.equal(rating.band, "low");
  assert.equal(rating.inference, true);
  assert.equal(rateEncounter([1], [{ id: "srd2024:creature:ogre", count: 1 }]).band, "above-high");
  assert.equal(rateEncounter([1], []).band, "empty");
  assert.throws(() => encounterBudget([]), /at least one/);
  assert.throws(() => encounterBudget([21]), /Invalid character level/);
  assert.throws(() => encounterXp(["srd2024:item:club"]), /Unknown creature/);
});

test("coins, units and cost helpers", () => {
  assert.deepEqual(
    COINS.map((c) => [c.id, c.valueInCp]),
    [
      ["cp", 1],
      ["sp", 10],
      ["ep", 50],
      ["gp", 100],
      ["pp", 1000],
    ],
  );
  COINS.forEach((c) => assertSource(c.source, c.id));
  assert.equal(getById("srd2024:item:club").cost.sp, 1);
  assert.equal(costInCp({ gp: 2, sp: 5 }), 250);
  assert.throws(() => costInCp({ zz: 1 }), /Unknown coin/);
  assert.equal(formatCost({ gp: 1500 }, "en"), "1,500 GP");
  assert.equal(formatCost({ gp: 1500 }, "it"), "1.500 mo");
  assert.equal(feetToMeters(5), 1.5);
  assert.equal(feetToMeters(30), 9);
  assert.equal(feetToMeters(500), 150);
  assert.equal(formatDistance(15, "it"), "4,5 m");
  assert.equal(formatDistance(15, "en"), "15 ft");
  assert.equal(poundsToKg(3), 1.5);
  assert.equal(formatWeight(0.5, "it"), "0,25 kg");
  assert.equal(formatWeight(null, "en"), "—");
});

test("label groups have sources and attribution matches the official statements", () => {
  for (const [group, labels] of Object.entries(LABELS)) {
    for (const [key, label] of Object.entries(labels)) assert.ok(isText(label), `${group}.${key}`);
    if (group !== "kind") assertSource(LABEL_SOURCES[group], group);
  }
  assert.match(SRD_ATTRIBUTION.en, /System Reference Document 5\.2\.1/);
  assert.match(SRD_ATTRIBUTION.en, /creativecommons\.org\/licenses\/by\/4\.0\/legalcode/);
  assert.match(SRD_ATTRIBUTION.it, /^Quest'opera include materiale tratto dal System Reference/);
  const custom = srdSource([1], [1]);
  assert.deepEqual(custom.it.pages, [1]);
  assert.ok(Object.isFrozen(custom.en.pages));
});

test("searchCatalog filters by text, kind, level, class, CR, rarity and tags", () => {
  assert.equal(normalizeSearchText(" Invisibilità "), "invisibilita");
  const fire = searchCatalog({ text: "palla di fuoco" });
  assert.deepEqual(
    fire.map((e) => e.id),
    ["srd2024:spell:fireball"],
  );
  assert.ok(searchCatalog({ text: "fireball" }).some((e) => e.id === "srd2024:spell:fireball"));
  assert.ok(searchCatalog({ text: "invisibilita" }).length >= 2);
  assert.ok(searchCatalog({ text: "hunter's mark" }).some((e) => e.slug === "hunters-mark"));
  const alt = searchCatalog({ text: "acciarino con pietra" });
  assert.deepEqual(
    alt.map((e) => e.slug),
    ["tinderbox"],
  );
  // Summary text is searched only on request.
  assert.equal(searchCatalog({ text: "telepatic" }).length, 0);
  assert.ok(searchCatalog({ text: "telepatic", includeSummary: true }).length > 0);

  const cantrips = searchCatalog({ kind: "spell", level: 0 });
  assert.ok(cantrips.length >= 10 && cantrips.every((s) => s.level === 0));
  const paladin = searchCatalog({ kind: "spell", classId: "paladin", minLevel: 1, maxLevel: 2 });
  assert.ok(paladin.length > 0 && paladin.every((s) => s.classes.includes("paladin")));
  assert.ok(
    paladin.every((s, i) => i === 0 || paladin[i - 1].level <= s.level),
    "sorted by level",
  );

  const low = searchCatalog({ kind: "creature", minCr: "1/4", maxCr: "1" });
  assert.ok(low.every((c) => c.crValue >= 0.25 && c.crValue <= 1));
  assert.ok(
    low.every((c, i) => i === 0 || low[i - 1].crValue <= c.crValue),
    "sorted by CR",
  );
  assert.ok(searchCatalog({ cr: "1/4" }).every((c) => c.cr === "1/4"));
  assert.ok(searchCatalog({ kind: "creature", type: "undead" }).length >= 4);

  const veryRare = searchCatalog({ rarity: "very-rare" }).map((e) => e.slug);
  assert.deepEqual(veryRare.sort(), ["armor-plus", "weapon-plus"]);
  assert.ok(
    searchCatalog({ category: "magic-item", attunement: true }).every((i) => i.magic.attunement),
  );
  assert.ok(
    searchCatalog({ tags: "weapon vex" }).every(
      (i) => i.category === "weapon" && i.weapon.mastery === "vex",
    ),
  );
  const mixed = searchCatalog({ kinds: ["rule", "condition"], text: "prono" });
  assert.deepEqual(
    mixed.map((e) => e.id),
    ["srd2024:condition:prone"],
  );
  const english = searchCatalog({ kind: "item", category: "armor", lang: "en" });
  assert.equal(english[0].category, "armor");
  assert.throws(() => searchCatalog({ lvl: 1 }), /Unknown search filter/);
  assert.equal(searchCatalog().length, ALL_ENTRIES.length);
});
