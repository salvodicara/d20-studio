// SRD 5.2.1 sample catalog (B11 part A): spells, creatures, items, rules glossary,
// conditions index, coins and the 2024 encounter tables. Pure data and pure
// functions only: no state, no DOM, no imports.
//
// Names are the official English and Italian SRD 5.2.1 names (Italian casing kept as
// printed in the Italian SRD). Summaries are short paraphrases written for this app;
// they are not SRD rules text and never replace it. Every entry carries the same source
// descriptor shape used by conditions.mjs (kind, edition, revision, sha256, url, pages,
// plus per-language url/sha256/pages). Page numbers are the printed page numbers, which
// equal the PDF page index in both official files.

const text = (it, en) => ({ it, en });
const words = (value) => (value ? value.split(" ").filter(Boolean) : []);
// Pipe-separated table rows (as in conditions.mjs); "-" marks an empty cell.
const rows = (block) =>
  block
    .trim()
    .split("\n")
    .map((line) => line.split("|").map((cell) => (cell.trim() === "-" ? null : cell.trim())));
function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

// ---------------------------------------------------------------- sources

const EN_URL = "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf";
const EN_SHA = "8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87";
const IT_URL = "https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf";
const IT_SHA = "a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718";

export const SRD_DOCUMENTS = deepFreeze({
  en: { title: "System Reference Document 5.2.1", url: EN_URL, sha256: EN_SHA, pageCount: 364 },
  it: { title: "System Reference Document 5.2.1", url: IT_URL, sha256: IT_SHA, pageCount: 405 },
});
export const SRD_LICENSE = deepFreeze({
  id: "CC-BY-4.0",
  url: "https://creativecommons.org/licenses/by/4.0/legalcode",
});
// Attribution statements exactly as required on page 1 of each official file.
export const SRD_ATTRIBUTION = deepFreeze(
  text(
    "Quest'opera include materiale tratto dal System Reference Document 5.2.1 (\"SRD 5.2.1\") di Wizards of the Coast LLC, disponibile all'indirizzo https://www.dndbeyond.com/srd. Il SRD 5.2.1 è concesso in licenza ai sensi della licenza di attribuzione 4.0 Internazionale di Creative Commons, disponibile all'indirizzo https://creativecommons.org/licenses/by/4.0/legalcode.",
    "This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.",
  ),
);
export const SUMMARY_POLICY = deepFreeze(
  text(
    "Nomi ufficiali SRD 5.2.1 EN/IT; i riassunti sono parafrasi brevi dell'app, non testo delle regole.",
    "Official SRD 5.2.1 EN/IT names; summaries are short app paraphrases, not rules text.",
  ),
);

export function srdSource(en, it) {
  return deepFreeze({
    kind: "srd",
    edition: "2024",
    revision: "5.2.1",
    sha256: EN_SHA,
    url: EN_URL,
    pages: [...en],
    en: { url: EN_URL, sha256: EN_SHA, pages: [...en] },
    it: { url: IT_URL, sha256: IT_SHA, pages: [...it] },
  });
}
const OFFICIAL = deepFreeze({ it: "official" });

// ---------------------------------------------------------------- labels

export const LABELS = deepFreeze({
  kind: {
    spell: text("Incantesimo", "Spell"),
    creature: text("Creatura", "Creature"),
    item: text("Oggetto", "Item"),
    rule: text("Regola", "Rule"),
    condition: text("Condizione", "Condition"),
  },
  ability: {
    str: text("Forza", "Strength"),
    dex: text("Destrezza", "Dexterity"),
    con: text("Costituzione", "Constitution"),
    int: text("Intelligenza", "Intelligence"),
    wis: text("Saggezza", "Wisdom"),
    cha: text("Carisma", "Charisma"),
  },
  school: {
    abjuration: text("Abiurazione", "Abjuration"),
    conjuration: text("Evocazione", "Conjuration"),
    divination: text("Divinazione", "Divination"),
    enchantment: text("Ammaliamento", "Enchantment"),
    evocation: text("Invocazione", "Evocation"),
    illusion: text("Illusione", "Illusion"),
    necromancy: text("Necromanzia", "Necromancy"),
    transmutation: text("Trasmutazione", "Transmutation"),
  },
  spellClass: {
    bard: text("Bardo", "Bard"),
    cleric: text("Chierico", "Cleric"),
    druid: text("Druido", "Druid"),
    paladin: text("Paladino", "Paladin"),
    ranger: text("Ranger", "Ranger"),
    sorcerer: text("Stregone", "Sorcerer"),
    warlock: text("Warlock", "Warlock"),
    wizard: text("Mago", "Wizard"),
  },
  damageType: {
    acid: text("Acido", "Acid"),
    bludgeoning: text("Contundente", "Bludgeoning"),
    cold: text("Freddo", "Cold"),
    fire: text("Fuoco", "Fire"),
    force: text("Forza", "Force"),
    lightning: text("Fulmine", "Lightning"),
    necrotic: text("Necrotico", "Necrotic"),
    piercing: text("Perforante", "Piercing"),
    poison: text("Veleno", "Poison"),
    psychic: text("Psichico", "Psychic"),
    radiant: text("Radioso", "Radiant"),
    slashing: text("Tagliente", "Slashing"),
    thunder: text("Tuono", "Thunder"),
  },
  size: {
    tiny: text("Minuscola", "Tiny"),
    small: text("Piccola", "Small"),
    medium: text("Media", "Medium"),
    large: text("Grande", "Large"),
    huge: text("Enorme", "Huge"),
    gargantuan: text("Mastodontica", "Gargantuan"),
  },
  creatureType: {
    aberration: text("Aberrazione", "Aberration"),
    beast: text("Bestia", "Beast"),
    celestial: text("Celestiale", "Celestial"),
    construct: text("Costrutto", "Construct"),
    dragon: text("Drago", "Dragon"),
    elemental: text("Elementale", "Elemental"),
    fey: text("Folletto", "Fey"),
    fiend: text("Immondo", "Fiend"),
    giant: text("Gigante", "Giant"),
    humanoid: text("Umanoide", "Humanoid"),
    monstrosity: text("Mostruosità", "Monstrosity"),
    ooze: text("Melma", "Ooze"),
    plant: text("Vegetale", "Plant"),
    undead: text("Non morto", "Undead"),
  },
  creatureTag: {
    goblinoid: text("goblinoide", "Goblinoid"),
    chromatic: text("cromatico", "Chromatic"),
    cleric: text("chierico", "Cleric"),
    wizard: text("mago", "Wizard"),
  },
  alignment: {
    unaligned: text("senza allineamento", "Unaligned"),
    n: text("neutrale", "Neutral"),
    cn: text("caotico neutrale", "Chaotic Neutral"),
    ce: text("caotico malvagio", "Chaotic Evil"),
    le: text("legale malvagio", "Lawful Evil"),
    ne: text("neutrale malvagio", "Neutral Evil"),
  },
  rarity: {
    common: text("Comune", "Common"),
    uncommon: text("Non comune", "Uncommon"),
    rare: text("Raro", "Rare"),
    "very-rare": text("Molto raro", "Very Rare"),
    legendary: text("Leggendario", "Legendary"),
    artifact: text("Manufatto", "Artifact"),
    varies: text("Rarità variabile", "Rarity Varies"),
  },
  itemCategory: {
    weapon: text("Armi", "Weapons"),
    armor: text("Armature", "Armor"),
    gear: text("Equipaggiamento d'avventura", "Adventuring Gear"),
    tool: text("Strumenti", "Tools"),
    "magic-item": text("Oggetti magici", "Magic Items"),
  },
  weaponCategory: {
    "simple-melee": text("Armi da mischia semplici", "Simple Melee Weapons"),
    "simple-ranged": text("Armi a distanza semplici", "Simple Ranged Weapons"),
    "martial-melee": text("Armi da mischia da guerra", "Martial Melee Weapons"),
    "martial-ranged": text("Armi a distanza da guerra", "Martial Ranged Weapons"),
  },
  weaponProperty: {
    ammunition: text("Munizioni", "Ammunition"),
    finesse: text("Accurata", "Finesse"),
    heavy: text("Pesante", "Heavy"),
    light: text("Leggera", "Light"),
    loading: text("Ricarica", "Loading"),
    range: text("Gittata", "Range"),
    reach: text("Portata", "Reach"),
    thrown: text("Lancio", "Thrown"),
    "two-handed": text("Due mani", "Two-Handed"),
    versatile: text("Versatile", "Versatile"),
  },
  mastery: {
    cleave: text("Doppio fendente", "Cleave"),
    graze: text("Colpo di striscio", "Graze"),
    nick: text("Graffio", "Nick"),
    push: text("Spinta", "Push"),
    sap: text("Fiaccare", "Sap"),
    slow: text("Lentezza", "Slow"),
    topple: text("Rovesciamento", "Topple"),
    vex: text("Vessazione", "Vex"),
  },
  armorCategory: {
    light: text("Armatura leggera", "Light Armor"),
    medium: text("Armatura media", "Medium Armor"),
    heavy: text("Armatura pesante", "Heavy Armor"),
    shield: text("Scudo", "Shield"),
  },
  magicItemType: {
    wondrous: text("Oggetto meraviglioso", "Wondrous Item"),
    potion: text("Pozione", "Potion"),
    ring: text("Anello", "Ring"),
    rod: text("Verga", "Rod"),
    wand: text("Bacchetta", "Wand"),
    weapon: text("Arma", "Weapon"),
    armor: text("Armatura", "Armor"),
  },
  encounterDifficulty: {
    low: text("Facile", "Low"),
    moderate: text("Media", "Moderate"),
    high: text("Difficile", "High"),
  },
  ruleTag: {
    action: text("azione", "Action"),
    "area-of-effect": text("area di effetto", "Area of Effect"),
    condition: text("condizione", "Condition"),
  },
});

// Pages where each label is printed in the official files (LABELS.kind is app-authored).
// Class names: class chapter headings. Creature tags and "Unaligned": stat block pages.
export const LABEL_SOURCES = deepFreeze({
  ability: srdSource([5], [5]),
  school: srdSource([105], [119]),
  spellClass: srdSource([31, 36, 41, 53, 57, 64, 70, 77], [35, 41, 46, 59, 70, 75, 79, 85]),
  damageType: srdSource([180], [217]),
  size: srdSource([188], [217]),
  creatureType: srdSource([179], [218]),
  creatureTag: srdSource([290, 293, 305, 316], [327, 340, 350, 369]),
  alignment: srdSource([176, 254], [202, 289]),
  rarity: srdSource([205, 206, 236], [233, 234, 276]),
  itemCategory: srdSource([89, 92, 93, 94, 204], [101, 104, 105, 107, 232]),
  weaponCategory: srdSource([91], [103, 104]),
  weaponProperty: srdSource([89, 90], [101, 102]),
  mastery: srdSource([90], [102, 103]),
  armorCategory: srdSource([92], [104]),
  magicItemType: srdSource([204, 212], [232, 252]),
  encounterDifficulty: srdSource([202], [230]),
  ruleTag: srdSource([176], [202]),
});

// Damage phrases for generated summaries ("5 (1d6 + 2) Slashing" / "taglienti").
const DAMAGE_PHRASE = {
  acid: text("da acido", "Acid"),
  bludgeoning: text("contundenti", "Bludgeoning"),
  cold: text("da freddo", "Cold"),
  fire: text("da fuoco", "Fire"),
  force: text("da forza", "Force"),
  lightning: text("da fulmine", "Lightning"),
  necrotic: text("necrotici", "Necrotic"),
  piercing: text("perforanti", "Piercing"),
  poison: text("da veleno", "Poison"),
  psychic: text("psichici", "Psychic"),
  radiant: text("radiosi", "Radiant"),
  slashing: text("taglienti", "Slashing"),
  thunder: text("da tuono", "Thunder"),
};

// ---------------------------------------------------------------- units

// The Italian SRD converts 5 feet to 1.5 metres and 1 pound to 0.5 kg throughout.
export function feetToMeters(feet) {
  return Math.round(feet * 3) / 10;
}
export function poundsToKg(pounds) {
  return pounds / 2;
}
const decimal = (value, lang) => (lang === "it" ? String(value).replace(".", ",") : String(value));
export function formatDistance(feet, lang = "it") {
  return lang === "it" ? `${decimal(feetToMeters(feet), "it")} m` : `${feet} ft`;
}
export function formatWeight(pounds, lang = "it") {
  if (pounds == null) return "—";
  return lang === "it" ? `${decimal(poundsToKg(pounds), "it")} kg` : `${pounds} lb`;
}

// ---------------------------------------------------------------- coins

const COIN_SOURCE = srdSource([89], [101]);
export const COINS = deepFreeze(
  [
    ["cp", "Moneta di rame", "Copper Piece", "mr", "CP", 1, "1/100"],
    ["sp", "Moneta d'argento", "Silver Piece", "ma", "SP", 10, "1/10"],
    ["ep", "Moneta di electrum", "Electrum Piece", "me", "EP", 50, "1/2"],
    ["gp", "Moneta d'oro", "Gold Piece", "mo", "GP", 100, "1"],
    ["pp", "Moneta di platino", "Platinum Piece", "mp", "PP", 1000, "10"],
  ].map(([id, it, en, abbrIt, abbrEn, valueInCp, gpValue]) => ({
    id,
    kind: "coin",
    name: text(it, en),
    abbreviation: text(abbrIt, abbrEn),
    valueInCp,
    gpValue,
    coinsPerPound: 50,
    source: COIN_SOURCE,
  })),
);
const COIN_BY_ID = new Map(COINS.map((c) => [c.id, c]));

// A cost is {cp|sp|ep|gp|pp: amount}; returns its value in copper pieces.
export function costInCp(cost) {
  if (!cost) return null;
  let total = 0;
  for (const [coin, amount] of Object.entries(cost)) {
    const def = COIN_BY_ID.get(coin);
    if (!def || !Number.isFinite(amount)) throw new Error(`Unknown coin or amount: ${coin}`);
    total += def.valueInCp * amount;
  }
  return total;
}
export function formatCost(cost, lang = "it") {
  if (!cost) return "—";
  return Object.entries(cost)
    .map(([coin, amount]) => {
      // Thousands grouped as printed in each SRD ("1.500 mo" / "1,500 GP"), not via ICU.
      const n = String(amount).replace(/\B(?=(\d{3})+(?!\d))/g, lang === "it" ? "." : ",");
      return `${n} ${COIN_BY_ID.get(coin).abbreviation[lang === "it" ? "it" : "en"]}`;
    })
    .join(" + ");
}

// ---------------------------------------------------------------- challenge and XP

const CR_SOURCE = srdSource([256], [291]);
// Experience Points by Challenge Rating, "CR:XP" pairs.
const XP_ROWS = words(
  "0:10 1/8:25 1/4:50 1/2:100 1:200 2:450 3:700 4:1100 5:1800 6:2300 7:2900 8:3900 9:5000 10:5900 11:7200 12:8400 13:10000 14:11500 15:13000 16:15000 17:18000 18:20000 19:22000 20:25000 21:33000 22:41000 23:50000 24:62000 25:75000 26:90000 27:105000 28:120000 29:135000 30:155000",
).map((pair) => {
  const [cr, xp] = pair.split(":");
  return [cr, Number(xp)];
});
export function crToNumber(cr) {
  const value = String(cr).trim();
  if (/^\d+\/\d+$/.test(value)) {
    const [a, b] = value.split("/").map(Number);
    return a / b;
  }
  if (/^\d+$/.test(value)) return Number(value);
  return Number.NaN;
}
const pbForCrValue = (value) => (value <= 4 ? 2 : Math.min(9, 2 + Math.ceil((value - 4) / 4)));
// CR 0 is worth 0 or 10 XP (stat block decides); the table lists 10 with alternative 0.
export const XP_BY_CR = deepFreeze(
  XP_ROWS.map(([cr, xp]) => ({
    cr,
    value: crToNumber(cr),
    xp,
    ...(cr === "0" ? { xpAlternatives: [0, 10] } : {}),
    proficiencyBonus: pbForCrValue(crToNumber(cr)),
  })),
);
export const XP_BY_CR_SOURCE = CR_SOURCE;
const XP_BY_CR_KEY = new Map(XP_BY_CR.map((r) => [r.cr, r]));
export function xpForCr(cr) {
  const row = XP_BY_CR_KEY.get(String(cr).trim());
  if (!row) throw new Error(`Unknown Challenge Rating: ${cr}`);
  return row.xp;
}
export function proficiencyBonusForCr(cr) {
  const row = XP_BY_CR_KEY.get(String(cr).trim());
  if (!row) throw new Error(`Unknown Challenge Rating: ${cr}`);
  return row.proficiencyBonus;
}

// XP Budget per Character (2024), multiplied by the number of characters.
export const ENCOUNTER_DIFFICULTIES = deepFreeze(["low", "moderate", "high"]);
export const ENCOUNTER_BUDGET_SOURCE = srdSource([202], [230, 231]);
// One row per character level 1-20: Low|Moderate|High.
export const ENCOUNTER_XP_BUDGET = deepFreeze(
  rows(`
50|75|100
100|150|200
150|225|400
250|375|500
500|750|1100
600|1000|1400
750|1300|1700
1000|1700|2100
1300|2000|2600
1600|2300|3100
1900|2900|4100
2200|3700|4700
2600|4200|5400
2900|4900|6200
3300|5400|7800
3800|6100|9800
4500|7200|11700
5000|8700|14200
5500|10700|17200
6400|13200|22000
`).map(([low, moderate, high], i) => ({
    level: i + 1,
    low: Number(low),
    moderate: Number(moderate),
    high: Number(high),
  })),
);

// partyLevels: array of character levels (1-20). Returns the summed budget per difficulty.
export function encounterBudget(partyLevels) {
  if (!Array.isArray(partyLevels) || partyLevels.length === 0) {
    throw new Error("A party needs at least one character level.");
  }
  const total = { low: 0, moderate: 0, high: 0 };
  for (const level of partyLevels) {
    const row = ENCOUNTER_XP_BUDGET[level - 1];
    if (!Number.isInteger(level) || !row) throw new Error(`Invalid character level: ${level}`);
    for (const d of ENCOUNTER_DIFFICULTIES) total[d] += row[d];
  }
  return total;
}

// monsters: [{id, count}] or [id]. 2024 rules add stat block XP with no multiplier.
export function encounterXp(monsters) {
  let total = 0;
  for (const raw of monsters ?? []) {
    const { id, count = 1 } = typeof raw === "string" ? { id: raw } : raw;
    const creature = getById(id);
    if (!creature || creature.kind !== "creature") throw new Error(`Unknown creature: ${id}`);
    if (!Number.isInteger(count) || count < 0) throw new Error(`Invalid count for ${id}`);
    total += creature.xp * count;
  }
  return total;
}

// App inference, not an SRD rule: the band is the lowest difficulty whose budget the
// encounter does not exceed ("above-high" beyond it). The SRD only describes how to
// spend a chosen budget without going over.
export function rateEncounter(partyLevels, monsters) {
  const budget = encounterBudget(partyLevels);
  const xp = encounterXp(monsters);
  const band =
    xp === 0 ? "empty" : (ENCOUNTER_DIFFICULTIES.find((d) => xp <= budget[d]) ?? "above-high");
  return { xp, budget, band, inference: true, source: ENCOUNTER_BUDGET_SOURCE };
}

// ---------------------------------------------------------------- spells

// Spells whose ids already exist in character-rules.mjs (same slug).
const CHARACTER_RULE_SPELLS = new Set(
  words(
    "fire-bolt mage-hand light ray-of-frost prestidigitation guidance sacred-flame spare-the-dying druidcraft produce-flame vicious-mockery eldritch-blast burning-hands magic-missile shield detect-magic feather-fall mage-armor sleep thunderwave cure-wounds healing-word bless guiding-bolt sanctuary entangle faerie-fire goodberry speak-with-animals hunters-mark heroism searing-smite hex charm-person",
  ),
);
const spellId = (slug) => `srd2024:spell:${slug}`;

function castingTime(value) {
  const unit = { action: "action", bonus: "bonus-action", reaction: "reaction" }[value];
  if (unit) return { unit, amount: 1 };
  const [amount, time] = value.split(" ");
  return { unit: time.replace(/s$/, ""), amount: Number(amount) };
}
function spellRange(value) {
  if (value === "self" || value === "touch") return { kind: value };
  return { kind: "feet", feet: value };
}
function spellDuration(value, upTo) {
  if (value === "instant") return { kind: "instantaneous" };
  const [amount, unit] = value.split(" ");
  return { kind: "timed", amount: Number(amount), unit: unit.replace(/s$/, ""), upTo: !!upTo };
}
function damageList(value) {
  if (!value) return [];
  return value.split(",").map((part) => {
    const [dice, types] = part.trim().split(" ");
    return { dice, types: types.split("|") };
  });
}

function sp(slug, it, en, level, school, classes, enPages, itPages, spec, summaryIt, summaryEn) {
  const damage = damageList(spec.damage);
  const cast = castingTime(spec.cast);
  const components = {
    verbal: spec.comp.includes("v"),
    somatic: spec.comp.includes("s"),
    material: spec.comp.includes("m"),
    materialCostGp: spec.cost ?? null,
    materialConsumed: !!spec.consumed,
  };
  const conditions = words(spec.conditions);
  const tags = [
    "spell",
    level === 0 ? "cantrip" : `level-${level}`,
    school,
    ...words(classes),
    ...damage.flatMap((d) => d.types),
    ...(spec.conc ? ["concentration"] : []),
    ...(spec.ritual ? ["ritual"] : []),
    ...(cast.unit === "bonus-action" || cast.unit === "reaction" ? [cast.unit] : []),
    ...(spec.attack ? ["attack-roll"] : []),
    ...(spec.save ? ["saving-throw"] : []),
    ...(spec.heal ? ["healing"] : []),
    ...(damage.length ? ["damage"] : []),
    ...conditions,
    ...words(spec.tags),
  ];
  return {
    id: spellId(slug),
    kind: "spell",
    slug,
    name: text(it, en),
    translation: OFFICIAL,
    level,
    school,
    classes: words(classes),
    castingTime: cast,
    ritual: !!spec.ritual,
    range: spellRange(spec.range),
    // Area size as the SRD states it: radius (sphere, cylinder), length (cone, line),
    // side (cube, square) or distance (emanation), in feet.
    area: spec.area
      ? { shape: spec.area.split(" ")[0], feet: Number(spec.area.split(" ")[1]) }
      : null,
    components,
    duration: spellDuration(spec.dur, spec.upTo),
    concentration: !!spec.conc,
    attack: spec.attack ?? null,
    save: spec.save ? { ability: spec.save, halfOnSuccess: !!spec.half } : null,
    damage,
    // "on-hit": extra damage added to a weapon hit; dice are per instance (dart, ray, beam).
    damageMode: damage.length ? (spec.rider ? "on-hit" : "direct") : null,
    healing: spec.heal ? { dice: spec.heal, addsSpellcastingModifier: !spec.flatHeal } : null,
    conditions,
    scaling: spec.scaling ?? null,
    summary: text(summaryIt, summaryEn),
    tags: [...new Set(tags)],
    source: srdSource(enPages, itPages),
    links: CHARACTER_RULE_SPELLS.has(slug) ? { characterRules: slug } : {},
    aliases: [],
  };
}

const SPELL_DEFS = [
  // Cantrips
  sp(
    "fire-bolt",
    "Dardo di fuoco",
    "Fire Bolt",
    0,
    "evocation",
    "sorcerer wizard",
    [132],
    [140],
    {
      cast: "action",
      range: 120,
      comp: "vs",
      dur: "instant",
      attack: "ranged",
      damage: "1d10 fire",
      scaling: "cantrip",
    },
    "Attacco con incantesimo a distanza: 1d10 danni da fuoco; gli oggetti infiammabili non indossati prendono fuoco. I dadi aumentano ai livelli 5, 11 e 17.",
    "Ranged spell attack for 1d10 Fire damage; unattended flammable objects catch fire. Dice increase at levels 5, 11 and 17.",
  ),
  sp(
    "mage-hand",
    "Mano magica",
    "Mage Hand",
    0,
    "conjuration",
    "bard sorcerer warlock wizard",
    [145],
    [164],
    { cast: "action", range: 30, comp: "vs", dur: "1 minute", tags: "utility" },
    "Una mano spettrale entro 9 m manipola oggetti leggeri (fino a 5 kg); non attacca e non attiva oggetti magici. Si comanda con l'azione Magia.",
    "A spectral hand within 30 ft handles light objects (up to 10 lb); it can't attack or activate magic items. Control it with a Magic action.",
  ),
  sp(
    "light",
    "Luce",
    "Light",
    0,
    "evocation",
    "bard cleric sorcerer wizard",
    [144],
    [162],
    { cast: "action", range: "touch", comp: "vm", dur: "1 hour", tags: "utility light" },
    "Un oggetto toccato emette luce intensa in un raggio di 6 m e luce fioca per altri 6 m per 1 ora.",
    "A touched object sheds Bright Light in a 20-ft radius and Dim Light for 20 ft more, for 1 hour.",
  ),
  sp(
    "ray-of-frost",
    "Raggio di gelo",
    "Ray of Frost",
    0,
    "evocation",
    "sorcerer wizard",
    [157],
    [177, 178],
    {
      cast: "action",
      range: 60,
      comp: "vs",
      dur: "instant",
      attack: "ranged",
      damage: "1d8 cold",
      scaling: "cantrip",
      tags: "control",
    },
    "Attacco con incantesimo a distanza: 1d8 danni da freddo e Velocità ridotta di 3 m fino al tuo prossimo turno.",
    "Ranged spell attack: 1d8 Cold damage and Speed reduced by 10 ft until your next turn.",
  ),
  sp(
    "prestidigitation",
    "Prestidigitazione",
    "Prestidigitation",
    0,
    "transmutation",
    "bard sorcerer warlock wizard",
    [154],
    [175],
    { cast: "action", range: 10, comp: "vs", dur: "1 hour", upTo: true, tags: "utility" },
    "Piccoli effetti magici innocui (scintille, pulire, scaldare, piccoli segni o ninnoli); fino a tre effetti attivi insieme.",
    "Small harmless magical effects (sparks, cleaning, warming, marks or trinkets); up to three effects active at once.",
  ),
  sp(
    "guidance",
    "Guida",
    "Guidance",
    0,
    "divination",
    "cleric druid",
    [138],
    [153],
    { cast: "action", range: "touch", comp: "vs", dur: "1 minute", conc: true, tags: "buff" },
    "Una creatura consenziente aggiunge 1d4 alle prove di caratteristica con l'abilità scelta finché dura la concentrazione.",
    "A willing creature adds 1d4 to ability checks with a chosen skill while your Concentration lasts.",
  ),
  sp(
    "sacred-flame",
    "Fiamma sacra",
    "Sacred Flame",
    0,
    "evocation",
    "cleric",
    [159],
    [148],
    {
      cast: "action",
      range: 60,
      comp: "vs",
      dur: "instant",
      save: "dex",
      damage: "1d8 radiant",
      scaling: "cantrip",
    },
    "Tiro salvezza su Destrezza o 1d8 danni radiosi; la mezza copertura e la copertura tre quarti non aiutano.",
    "Dexterity save or 1d8 Radiant damage; Half and Three-Quarters Cover give no benefit.",
  ),
  sp(
    "spare-the-dying",
    "Salvare i morenti",
    "Spare the Dying",
    0,
    "necromancy",
    "cleric druid",
    [163],
    [182, 183],
    { cast: "action", range: 15, comp: "vs", dur: "instant", scaling: "cantrip", tags: "support" },
    "Una creatura a 0 PF entro 4,5 m diventa stabile; la gittata raddoppia ai livelli 5, 11 e 17.",
    "A creature at 0 HP within 15 ft becomes Stable; the range doubles at levels 5, 11 and 17.",
  ),
  sp(
    "druidcraft",
    "Artificio druidico",
    "Druidcraft",
    0,
    "transmutation",
    "druid",
    [126],
    [126],
    { cast: "action", range: 30, comp: "vs", dur: "instant", tags: "utility" },
    "Piccoli effetti naturali: prevedere il tempo, far sbocciare un fiore, effetti sensoriali, accendere o spegnere piccole fiamme.",
    "Small nature effects: forecast the weather, make a bud bloom, sensory effects, light or snuff small flames.",
  ),
  sp(
    "produce-flame",
    "Produrre fiamma",
    "Produce Flame",
    0,
    "conjuration",
    "druid",
    [156],
    [175, 176],
    {
      cast: "bonus",
      range: "self",
      comp: "vs",
      dur: "10 minutes",
      attack: "ranged",
      damage: "1d8 fire",
      scaling: "cantrip",
      tags: "light",
    },
    "Una fiamma in mano fa luce (6 m + 6 m); con l'azione Magia la scagli entro 18 m: attacco a distanza, 1d8 danni da fuoco.",
    "A flame in your hand gives light (20 ft + 20 ft); a Magic action hurls it within 60 ft: ranged spell attack, 1d8 Fire damage.",
  ),
  sp(
    "vicious-mockery",
    "Beffa crudele",
    "Vicious Mockery",
    0,
    "enchantment",
    "bard",
    [171, 172],
    [128],
    {
      cast: "action",
      range: 60,
      comp: "v",
      dur: "instant",
      save: "wis",
      damage: "1d6 psychic",
      scaling: "cantrip",
      tags: "debuff",
    },
    "Tiro salvezza su Saggezza o 1d6 danni psichici e svantaggio al prossimo tiro per colpire del bersaglio.",
    "Wisdom save or 1d6 Psychic damage and Disadvantage on the target's next attack roll.",
  ),
  sp(
    "eldritch-blast",
    "Deflagrazione occulta",
    "Eldritch Blast",
    0,
    "evocation",
    "warlock",
    [127],
    [140],
    {
      cast: "action",
      range: 120,
      comp: "vs",
      dur: "instant",
      attack: "ranged",
      damage: "1d10 force",
      scaling: "cantrip",
    },
    "Attacco con incantesimo a distanza: 1d10 danni da forza; raggi aggiuntivi ai livelli 5, 11 e 17, ognuno con il proprio tiro.",
    "Ranged spell attack: 1d10 Force damage; extra beams at levels 5, 11 and 17, each with its own roll.",
  ),
  sp(
    "shocking-grasp",
    "Stretta folgorante",
    "Shocking Grasp",
    0,
    "evocation",
    "sorcerer wizard",
    [162],
    [192],
    {
      cast: "action",
      range: "touch",
      comp: "vs",
      dur: "instant",
      attack: "melee",
      damage: "1d8 lightning",
      scaling: "cantrip",
    },
    "Attacco con incantesimo in mischia: 1d8 danni da fulmine e il bersaglio non può effettuare attacchi di opportunità fino al suo prossimo turno.",
    "Melee spell attack: 1d8 Lightning damage, and the target can't make Opportunity Attacks until its next turn.",
  ),
  sp(
    "minor-illusion",
    "Illusione minore",
    "Minor Illusion",
    0,
    "illusion",
    "bard sorcerer warlock wizard",
    [149],
    [153, 154],
    { cast: "action", range: 30, comp: "sm", dur: "1 minute", tags: "utility illusion" },
    "Crea un suono o l'immagine di un oggetto entro 9 m per 1 minuto; l'azione Studio con una prova di Indagare può smascherarla.",
    "Creates a sound or an object image within 30 ft for 1 minute; a Study action with an Investigation check can reveal it.",
  ),
  // Level 1
  sp(
    "burning-hands",
    "Mani brucianti",
    "Burning Hands",
    1,
    "evocation",
    "sorcerer wizard",
    [114],
    [163],
    {
      cast: "action",
      range: "self",
      area: "cone 15",
      comp: "vs",
      dur: "instant",
      save: "dex",
      half: true,
      damage: "3d6 fire",
      scaling: "slot",
    },
    "Cono di 4,5 m: tiro salvezza su Destrezza, 3d6 danni da fuoco (metà se riesce). +1d6 per ogni slot superiore al 1º.",
    "15-ft Cone: Dexterity save, 3d6 Fire damage (half on a success). +1d6 per slot level above 1.",
  ),
  sp(
    "magic-missile",
    "Dardo incantato",
    "Magic Missile",
    1,
    "evocation",
    "sorcerer wizard",
    [146],
    [140],
    {
      cast: "action",
      range: 120,
      comp: "vs",
      dur: "instant",
      damage: "1d4+1 force",
      scaling: "slot",
      tags: "auto-hit",
    },
    "Tre dardi che colpiscono sempre, 1d4 + 1 danni da forza ciascuno, sulle creature scelte; un dardo in più per ogni slot superiore.",
    "Three darts that always hit, 1d4 + 1 Force damage each, split as you like; one more dart per higher slot level.",
  ),
  sp(
    "shield",
    "Scudo",
    "Shield",
    1,
    "abjuration",
    "sorcerer wizard",
    [161, 162],
    [186],
    { cast: "reaction", range: "self", comp: "vs", dur: "1 round", tags: "defense" },
    "Reazione quando vieni colpito o bersagliato da Dardo incantato: +5 alla CA fino al tuo prossimo turno, anche contro l'attacco che l'ha innescato; nessun danno da Dardo incantato.",
    "Reaction when hit or targeted by Magic Missile: +5 AC until your next turn, including against the triggering attack; no damage from Magic Missile.",
  ),
  sp(
    "detect-magic",
    "Individuazione del magico",
    "Detect Magic",
    1,
    "divination",
    "bard cleric druid paladin ranger sorcerer warlock wizard",
    [123],
    [157],
    {
      cast: "action",
      ritual: true,
      range: "self",
      comp: "vs",
      dur: "10 minutes",
      conc: true,
      tags: "utility detection",
    },
    "Percepisci la magia entro 9 m; con l'azione Magia vedi le aure e la scuola degli incantesimi. Anche come rituale.",
    "Sense magic within 30 ft; a Magic action shows auras and spell schools. Can be cast as a Ritual.",
  ),
  sp(
    "feather-fall",
    "Caduta morbida",
    "Feather Fall",
    1,
    "transmutation",
    "bard sorcerer wizard",
    [130],
    [129],
    { cast: "reaction", range: 60, comp: "vm", dur: "1 minute", tags: "utility movement" },
    "Reazione: fino a cinque creature in caduta scendono di 18 m per round e non subiscono danni da caduta.",
    "Reaction: up to five falling creatures descend 60 ft per round and take no falling damage.",
  ),
  sp(
    "mage-armor",
    "Armatura magica",
    "Mage Armor",
    1,
    "abjuration",
    "sorcerer wizard",
    [145],
    [126],
    { cast: "action", range: "touch", comp: "vsm", dur: "8 hours", tags: "defense" },
    "Una creatura senza armatura ha CA base 13 + modificatore di Destrezza per 8 ore.",
    "A creature not wearing armor has base AC 13 + its Dexterity modifier for 8 hours.",
  ),
  sp(
    "sleep",
    "Sonno",
    "Sleep",
    1,
    "enchantment",
    "bard sorcerer wizard",
    [163],
    [191],
    {
      cast: "action",
      range: 60,
      area: "sphere 5",
      comp: "vsm",
      dur: "1 minute",
      conc: true,
      save: "wis",
      conditions: "incapacitated unconscious",
      tags: "control",
    },
    "Sfera di 1,5 m di raggio: tiro salvezza su Saggezza o incapacitato; un secondo fallimento lo rende privo di sensi. Termina con i danni o se viene scosso.",
    "5-ft-radius Sphere: Wisdom save or Incapacitated; a second failure makes it Unconscious. Ends on damage or when shaken awake.",
  ),
  sp(
    "thunderwave",
    "Onda tonante",
    "Thunderwave",
    1,
    "evocation",
    "bard druid sorcerer wizard",
    [169],
    [170],
    {
      cast: "action",
      range: "self",
      area: "cube 15",
      comp: "vs",
      dur: "instant",
      save: "con",
      half: true,
      damage: "2d8 thunder",
      scaling: "slot",
      tags: "push",
    },
    "Cubo di 4,5 m: tiro salvezza su Costituzione, 2d8 danni da tuono e spinta di 3 m (metà danni e nessuna spinta se riesce).",
    "15-ft Cube: Constitution save, 2d8 Thunder damage and a 10-ft push (half damage and no push on a success).",
  ),
  sp(
    "cure-wounds",
    "Cura ferite",
    "Cure Wounds",
    1,
    "abjuration",
    "bard cleric druid paladin ranger",
    [121],
    [139],
    { cast: "action", range: "touch", comp: "vs", dur: "instant", heal: "2d8", scaling: "slot" },
    "Una creatura toccata recupera 2d8 + modificatore da incantatore PF; +2d8 per ogni slot superiore.",
    "A touched creature regains 2d8 + your spellcasting modifier HP; +2d8 per higher slot level.",
  ),
  sp(
    "healing-word",
    "Parola guaritrice",
    "Healing Word",
    1,
    "abjuration",
    "bard cleric druid",
    [139],
    [173],
    { cast: "bonus", range: 60, comp: "v", dur: "instant", heal: "2d4", scaling: "slot" },
    "Azione bonus: una creatura visibile entro 18 m recupera 2d4 + modificatore da incantatore PF; +2d4 per ogni slot superiore.",
    "Bonus Action: a creature you can see within 60 ft regains 2d4 + your spellcasting modifier HP; +2d4 per higher slot level.",
  ),
  sp(
    "bless",
    "Benedizione",
    "Bless",
    1,
    "enchantment",
    "cleric paladin",
    [113],
    [128],
    {
      cast: "action",
      range: 30,
      comp: "vsm",
      cost: 5,
      dur: "1 minute",
      conc: true,
      scaling: "slot",
      tags: "buff",
    },
    "Fino a tre creature aggiungono 1d4 ai tiri per colpire e ai tiri salvezza; un bersaglio in più per ogni slot superiore.",
    "Up to three creatures add 1d4 to attack rolls and saving throws; one more target per higher slot level.",
  ),
  sp(
    "guiding-bolt",
    "Dardo tracciante",
    "Guiding Bolt",
    1,
    "evocation",
    "cleric",
    [138],
    [140],
    {
      cast: "action",
      range: 120,
      comp: "vs",
      dur: "1 round",
      attack: "ranged",
      damage: "4d6 radiant",
      scaling: "slot",
    },
    "Attacco con incantesimo a distanza: 4d6 danni radiosi e il prossimo attacco contro il bersaglio ha vantaggio.",
    "Ranged spell attack: 4d6 Radiant damage, and the next attack roll against the target has Advantage.",
  ),
  sp(
    "sanctuary",
    "Santuario",
    "Sanctuary",
    1,
    "abjuration",
    "cleric",
    [159],
    [183],
    { cast: "bonus", range: 30, comp: "vsm", dur: "1 minute", save: "wis", tags: "defense" },
    "Chi bersaglia la creatura protetta supera un tiro salvezza su Saggezza o deve cambiare bersaglio; termina se il protetto attacca, lancia incantesimi o infligge danni.",
    "Anyone targeting the warded creature must pass a Wisdom save or choose another target; ends if the ward attacks, casts a spell or deals damage.",
  ),
  sp(
    "entangle",
    "Intralciare",
    "Entangle",
    1,
    "conjuration",
    "druid ranger",
    [128],
    [158, 159],
    {
      cast: "action",
      range: 90,
      area: "square 20",
      comp: "vs",
      dur: "1 minute",
      conc: true,
      save: "str",
      conditions: "restrained",
      tags: "control terrain",
    },
    "Un quadrato di 6 m diventa terreno difficile; chi vi si trova supera un tiro salvezza su Forza o è trattenuto.",
    "A 20-ft square becomes Difficult Terrain; creatures in it pass a Strength save or are Restrained.",
  ),
  sp(
    "faerie-fire",
    "Luminescenza",
    "Faerie Fire",
    1,
    "evocation",
    "bard druid",
    [129],
    [163],
    {
      cast: "action",
      range: 60,
      area: "cube 20",
      comp: "v",
      dur: "1 minute",
      conc: true,
      save: "dex",
      tags: "debuff light",
    },
    "Cubo di 6 m: oggetti e creature che falliscono un tiro salvezza su Destrezza brillano, non possono essere invisibili e subiscono attacchi con vantaggio.",
    "20-ft Cube: objects and creatures failing a Dexterity save glow, can't be Invisible and are attacked with Advantage.",
  ),
  sp(
    "goodberry",
    "Bacche benefiche",
    "Goodberry",
    1,
    "conjuration",
    "druid ranger",
    [137],
    [127],
    {
      cast: "action",
      range: "self",
      comp: "vsm",
      dur: "24 hours",
      heal: "1",
      flatHeal: true,
      tags: "food",
    },
    "Dieci bacche per 24 ore; mangiarne una (azione bonus) fa recuperare 1 PF e nutre per un giorno.",
    "Ten berries for 24 hours; eating one (Bonus Action) restores 1 HP and nourishes for a day.",
  ),
  sp(
    "speak-with-animals",
    "Parlare con gli animali",
    "Speak with Animals",
    1,
    "divination",
    "bard druid ranger warlock",
    [164],
    [171],
    { cast: "action", ritual: true, range: "self", comp: "vs", dur: "10 minutes", tags: "social" },
    "Per 10 minuti comprendi e parli con le bestie e puoi usare con loro l'azione Influenza. Anche come rituale.",
    "For 10 minutes you understand and speak with Beasts and can use the Influence action with them. Can be cast as a Ritual.",
  ),
  sp(
    "hunters-mark",
    "Marchio del cacciatore",
    "Hunter’s Mark",
    1,
    "divination",
    "ranger",
    [141],
    [164],
    {
      cast: "bonus",
      range: 90,
      comp: "v",
      dur: "1 hour",
      conc: true,
      damage: "1d6 force",
      rider: true,
      tags: "buff",
    },
    "Marchi una creatura: +1d6 danni da forza quando la colpisci e vantaggio per trovarla; se scende a 0 PF puoi spostare il marchio.",
    "Mark a creature: +1d6 Force damage when you hit it and Advantage to find it; move the mark if it drops to 0 HP.",
  ),
  sp(
    "heroism",
    "Eroismo",
    "Heroism",
    1,
    "enchantment",
    "bard paladin",
    [140],
    [144],
    {
      cast: "action",
      range: "touch",
      comp: "vs",
      dur: "1 minute",
      conc: true,
      scaling: "slot",
      tags: "buff temporary-hit-points",
    },
    "Una creatura è immune a spaventato e a ogni suo turno ottiene PF temporanei pari al tuo modificatore da incantatore.",
    "A creature is immune to Frightened and gains Temporary HP equal to your spellcasting modifier each turn.",
  ),
  sp(
    "searing-smite",
    "Punizione incandescente",
    "Searing Smite",
    1,
    "evocation",
    "paladin",
    [160],
    [177],
    {
      cast: "bonus",
      range: "self",
      comp: "v",
      dur: "1 minute",
      save: "con",
      damage: "1d6 fire",
      rider: true,
      scaling: "slot",
      tags: "smite",
    },
    "Dopo un colpo in mischia: +1d6 danni da fuoco, poi 1d6 a ogni turno del bersaglio finché non supera un tiro salvezza su Costituzione.",
    "After a melee hit: +1d6 Fire damage, then 1d6 on each of the target's turns until it passes a Constitution save.",
  ),
  sp(
    "hex",
    "Sortilegio",
    "Hex",
    1,
    "enchantment",
    "warlock",
    [140],
    [191],
    {
      cast: "bonus",
      range: 90,
      comp: "vsm",
      dur: "1 hour",
      conc: true,
      damage: "1d6 necrotic",
      rider: true,
      tags: "curse debuff",
    },
    "Maledici una creatura: +1d6 danni necrotici quando la colpisci e svantaggio alle sue prove con una caratteristica scelta.",
    "Curse a creature: +1d6 Necrotic damage when you hit it and Disadvantage on its checks with a chosen ability.",
  ),
  sp(
    "charm-person",
    "Charme su persone",
    "Charm Person",
    1,
    "enchantment",
    "bard druid sorcerer warlock wizard",
    [115],
    [132],
    {
      cast: "action",
      range: 30,
      comp: "vs",
      dur: "1 hour",
      save: "wis",
      conditions: "charmed",
      scaling: "slot",
      tags: "social",
    },
    "Un umanoide supera un tiro salvezza su Saggezza (con vantaggio se lo state combattendo) o è affascinato per 1 ora; poi sa di esserlo stato.",
    "A Humanoid passes a Wisdom save (with Advantage if you're fighting it) or is Charmed for 1 hour; afterward it knows.",
  ),
  sp(
    "find-familiar",
    "Trova famiglio",
    "Find Familiar",
    1,
    "conjuration",
    "wizard",
    [130],
    [198, 199],
    {
      cast: "1 hour",
      ritual: true,
      range: 10,
      comp: "vsm",
      cost: 10,
      consumed: true,
      dur: "instant",
      tags: "summon familiar",
    },
    "Lancio di 1 ora o rituale (incenso da 10 mo consumato): ottieni un famiglio spirito con la forma di una bestia di GS 0 e comunichi telepaticamente entro 30 m.",
    "1-hour casting or Ritual (10 GP incense, consumed): gain a spirit familiar shaped as a CR 0 Beast, with telepathy within 100 ft.",
  ),
  sp(
    "shield-of-faith",
    "Scudo della fede",
    "Shield of Faith",
    1,
    "abjuration",
    "cleric paladin",
    [162],
    [186],
    { cast: "bonus", range: 60, comp: "vsm", dur: "10 minutes", conc: true, tags: "defense buff" },
    "Una creatura scelta ottiene +2 alla CA finché dura la concentrazione.",
    "A creature of your choice gains +2 AC while your Concentration lasts.",
  ),
  sp(
    "divine-smite",
    "Punizione divina",
    "Divine Smite",
    1,
    "evocation",
    "paladin",
    [125],
    [177],
    {
      cast: "bonus",
      range: "self",
      comp: "v",
      dur: "instant",
      damage: "2d8 radiant",
      rider: true,
      scaling: "slot",
      tags: "smite",
    },
    "Dopo un colpo in mischia: +2d8 danni radiosi (+1d8 contro immondi e non morti); +1d8 per ogni slot superiore.",
    "After a melee hit: +2d8 Radiant damage (+1d8 against Fiends and Undead); +1d8 per higher slot level.",
  ),
  sp(
    "command",
    "Comando",
    "Command",
    1,
    "enchantment",
    "bard cleric paladin",
    [116],
    [134],
    {
      cast: "action",
      range: 60,
      comp: "v",
      dur: "instant",
      save: "wis",
      scaling: "slot",
      tags: "control",
    },
    "Ordine di una parola: tiro salvezza su Saggezza o nel suo turno il bersaglio si avvicina, lascia cadere, fugge, si prostra o si ferma.",
    "One-word command: Wisdom save or on its turn the target approaches, drops, flees, grovels or halts.",
  ),
  // Level 2
  sp(
    "misty-step",
    "Passo velato",
    "Misty Step",
    2,
    "conjuration",
    "sorcerer warlock wizard",
    [150],
    [173],
    { cast: "bonus", range: "self", comp: "v", dur: "instant", tags: "movement teleportation" },
    "Azione bonus: ti teletrasporti fino a 9 m in uno spazio libero che vedi.",
    "Bonus Action: teleport up to 30 ft to an unoccupied space you can see.",
  ),
  sp(
    "hold-person",
    "Blocca persone",
    "Hold Person",
    2,
    "enchantment",
    "bard cleric druid sorcerer warlock wizard",
    [141],
    [128],
    {
      cast: "action",
      range: 60,
      comp: "vsm",
      dur: "1 minute",
      conc: true,
      save: "wis",
      conditions: "paralyzed",
      scaling: "slot",
      tags: "control",
    },
    "Un umanoide supera un tiro salvezza su Saggezza o è paralizzato; ripete il tiro alla fine di ogni suo turno.",
    "A Humanoid passes a Wisdom save or is Paralyzed; it repeats the save at the end of each of its turns.",
  ),
  sp(
    "spiritual-weapon",
    "Arma spirituale",
    "Spiritual Weapon",
    2,
    "evocation",
    "cleric",
    [165],
    [125, 126],
    {
      cast: "bonus",
      range: 60,
      comp: "vs",
      dur: "1 minute",
      conc: true,
      attack: "melee",
      damage: "1d8 force",
      scaling: "slot",
    },
    "Un'arma spettrale: attacco in mischia con incantesimo per 1d8 + modificatore danni da forza; con un'azione bonus la muovi di 6 m e attacchi di nuovo.",
    "A spectral weapon: melee spell attack for 1d8 + modifier Force damage; a Bonus Action moves it 20 ft and attacks again.",
  ),
  sp(
    "lesser-restoration",
    "Ristorare inferiore",
    "Lesser Restoration",
    2,
    "abjuration",
    "bard cleric druid paladin ranger",
    [144],
    [182],
    { cast: "bonus", range: "touch", comp: "vs", dur: "instant", tags: "support cure-condition" },
    "Azione bonus: termina accecato, assordato, paralizzato o avvelenato su una creatura toccata.",
    "Bonus Action: end Blinded, Deafened, Paralyzed or Poisoned on a creature you touch.",
  ),
  sp(
    "aid",
    "Aiuto",
    "Aid",
    2,
    "abjuration",
    "bard cleric druid paladin ranger",
    [107],
    [121],
    {
      cast: "action",
      range: 30,
      comp: "vsm",
      dur: "8 hours",
      scaling: "slot",
      tags: "buff hit-points",
    },
    "Fino a tre creature ottengono +5 ai PF massimi e attuali per 8 ore; +5 per ogni slot superiore.",
    "Up to three creatures gain +5 to their HP maximum and current HP for 8 hours; +5 per higher slot level.",
  ),
  sp(
    "invisibility",
    "Invisibilità",
    "Invisibility",
    2,
    "illusion",
    "bard sorcerer warlock wizard",
    [143],
    [159],
    {
      cast: "action",
      range: "touch",
      comp: "vsm",
      dur: "1 hour",
      conc: true,
      conditions: "invisible",
      scaling: "slot",
      tags: "stealth",
    },
    "Una creatura toccata è invisibile finché non effettua un tiro per colpire, infligge danni o lancia un incantesimo.",
    "A touched creature is Invisible until it makes an attack roll, deals damage or casts a spell.",
  ),
  sp(
    "scorching-ray",
    "Raggio rovente",
    "Scorching Ray",
    2,
    "evocation",
    "sorcerer wizard",
    [159],
    [178],
    {
      cast: "action",
      range: 120,
      comp: "vs",
      dur: "instant",
      attack: "ranged",
      damage: "2d6 fire",
      scaling: "slot",
    },
    "Tre raggi, ognuno un attacco a distanza da 2d6 danni da fuoco; un raggio in più per ogni slot superiore.",
    "Three rays, each a ranged spell attack for 2d6 Fire damage; one more ray per higher slot level.",
  ),
  sp(
    "moonbeam",
    "Bagliore lunare",
    "Moonbeam",
    2,
    "evocation",
    "druid",
    [150, 151],
    [127],
    {
      cast: "action",
      range: 120,
      area: "cylinder 5",
      comp: "vsm",
      dur: "1 minute",
      conc: true,
      save: "con",
      half: true,
      damage: "2d10 radiant",
      scaling: "slot",
    },
    "Cilindro di luce (raggio 1,5 m): tiro salvezza su Costituzione, 2d10 danni radiosi; lo sposti di 18 m con l'azione Magia e annulla i mutaforma.",
    "Cylinder of light (5-ft radius): Constitution save, 2d10 Radiant damage; a Magic action moves it 60 ft, and it reverts shape-shifters.",
  ),
  sp(
    "web",
    "Ragnatela",
    "Web",
    2,
    "conjuration",
    "sorcerer wizard",
    [174],
    [178],
    {
      cast: "action",
      range: 60,
      area: "cube 20",
      comp: "vsm",
      dur: "1 hour",
      conc: true,
      save: "dex",
      conditions: "restrained",
      tags: "control terrain",
    },
    "Cubo di 6 m di ragnatele: terreno difficile e leggermente oscurato; tiro salvezza su Destrezza o trattenuto. Le ragnatele bruciano.",
    "20-ft Cube of webs: Difficult Terrain and Lightly Obscured; Dexterity save or Restrained. The webs burn.",
  ),
  sp(
    "pass-without-trace",
    "Passare senza tracce",
    "Pass without Trace",
    2,
    "abjuration",
    "druid ranger",
    [151],
    [173],
    {
      cast: "action",
      range: "self",
      area: "emanation 30",
      comp: "vsm",
      dur: "1 hour",
      conc: true,
      tags: "stealth buff",
    },
    "Emanazione di 9 m: tu e le creature scelte avete +10 alle prove di Destrezza (Furtività) e non lasciate tracce.",
    "30-ft Emanation: you and chosen creatures get +10 to Dexterity (Stealth) checks and leave no tracks.",
  ),
  // Level 3
  sp(
    "fireball",
    "Palla di fuoco",
    "Fireball",
    3,
    "evocation",
    "sorcerer wizard",
    [131],
    [171],
    {
      cast: "action",
      range: 150,
      area: "sphere 20",
      comp: "vsm",
      dur: "instant",
      save: "dex",
      half: true,
      damage: "8d6 fire",
      scaling: "slot",
    },
    "Sfera di 6 m di raggio entro 45 m: tiro salvezza su Destrezza, 8d6 danni da fuoco (metà se riesce); +1d6 per ogni slot superiore.",
    "20-ft-radius Sphere within 150 ft: Dexterity save, 8d6 Fire damage (half on a success); +1d6 per higher slot level.",
  ),
  sp(
    "counterspell",
    "Controincantesimo",
    "Counterspell",
    3,
    "abjuration",
    "sorcerer warlock wizard",
    [120],
    [136],
    { cast: "reaction", range: 60, comp: "s", dur: "instant", save: "con", tags: "counter" },
    "Reazione: chi lancia un incantesimo entro 18 m supera un tiro salvezza su Costituzione o l'incantesimo fallisce senza spendere lo slot.",
    "Reaction: a creature casting a spell within 60 ft passes a Constitution save or the spell fails without spending its slot.",
  ),
  sp(
    "revivify",
    "Rinascita",
    "Revivify",
    3,
    "necromancy",
    "cleric druid paladin ranger",
    [159],
    [181],
    {
      cast: "action",
      range: "touch",
      comp: "vsm",
      cost: 300,
      consumed: true,
      dur: "instant",
      tags: "resurrection",
    },
    "Riporta in vita con 1 PF una creatura morta da meno di 1 minuto (diamante da 300 mo consumato).",
    "Returns a creature that died within the last minute to life with 1 HP (300 GP diamond, consumed).",
  ),
  sp(
    "dispel-magic",
    "Dissolvi magie",
    "Dispel Magic",
    3,
    "abjuration",
    "bard cleric druid paladin ranger sorcerer warlock wizard",
    [124],
    [142],
    { cast: "action", range: 120, comp: "vs", dur: "instant", scaling: "slot", tags: "counter" },
    "Termina gli incantesimi di livello 3 o inferiore su un bersaglio; per quelli superiori serve una prova (CD 10 + livello).",
    "Ends spells of level 3 or lower on one target; higher ones need a check (DC 10 + the spell's level).",
  ),
  sp(
    "lightning-bolt",
    "Fulmine",
    "Lightning Bolt",
    3,
    "evocation",
    "sorcerer wizard",
    [144],
    [150],
    {
      cast: "action",
      range: "self",
      area: "line 100",
      comp: "vsm",
      dur: "instant",
      save: "dex",
      half: true,
      damage: "8d6 lightning",
      scaling: "slot",
    },
    "Linea di 30 m per 1,5 m: tiro salvezza su Destrezza, 8d6 danni da fulmine (metà se riesce).",
    "100-ft by 5-ft Line: Dexterity save, 8d6 Lightning damage (half on a success).",
  ),
  sp(
    "spirit-guardians",
    "Guardiani spirituali",
    "Spirit Guardians",
    3,
    "conjuration",
    "cleric",
    [164, 165],
    [152],
    {
      cast: "action",
      range: "self",
      area: "emanation 15",
      comp: "vsm",
      dur: "10 minutes",
      conc: true,
      save: "wis",
      half: true,
      damage: "3d8 radiant|necrotic",
      scaling: "slot",
    },
    "Emanazione di 4,5 m: le altre creature hanno Velocità dimezzata e tiro salvezza su Saggezza per 3d8 danni radiosi o necrotici.",
    "15-ft Emanation: other creatures have halved Speed and make a Wisdom save for 3d8 Radiant or Necrotic damage.",
  ),
  sp(
    "haste",
    "Velocità",
    "Haste",
    3,
    "transmutation",
    "sorcerer wizard",
    [139],
    [200],
    { cast: "action", range: 30, comp: "vsm", dur: "1 minute", conc: true, tags: "buff" },
    "Velocità raddoppiata, +2 alla CA, vantaggio ai TS su Destrezza e un'azione extra limitata; al termine il bersaglio perde un turno.",
    "Doubled Speed, +2 AC, Advantage on Dexterity saves and a limited extra action; when it ends the target loses a turn.",
  ),
  sp(
    "fly",
    "Volare",
    "Fly",
    3,
    "transmutation",
    "sorcerer warlock wizard",
    [133],
    [201],
    {
      cast: "action",
      range: "touch",
      comp: "vsm",
      dur: "10 minutes",
      conc: true,
      scaling: "slot",
      tags: "movement",
    },
    "Una creatura toccata ottiene Velocità di volo di 18 m e può fluttuare; un bersaglio in più per ogni slot superiore.",
    "A touched creature gains a 60-ft Fly Speed and can hover; one more target per higher slot level.",
  ),
  // Level 4
  sp(
    "polymorph",
    "Metamorfosi",
    "Polymorph",
    4,
    "transmutation",
    "bard druid sorcerer wizard",
    [153, 154],
    [164],
    {
      cast: "action",
      range: 60,
      comp: "vsm",
      dur: "1 hour",
      conc: true,
      save: "wis",
      tags: "control shape-shifting",
    },
    "Tiro salvezza su Saggezza o la creatura diventa una bestia di GS pari o inferiore e ottiene PF temporanei pari ai PF di quella forma.",
    "Wisdom save or the creature becomes a Beast of equal or lower CR and gains Temporary HP equal to that form's HP.",
  ),
  sp(
    "banishment",
    "Esilio",
    "Banishment",
    4,
    "abjuration",
    "cleric paladin sorcerer warlock wizard",
    [112],
    [144, 145],
    {
      cast: "action",
      range: 30,
      comp: "vsm",
      dur: "1 minute",
      conc: true,
      save: "cha",
      conditions: "incapacitated",
      scaling: "slot",
      tags: "control",
    },
    "Tiro salvezza su Carisma o il bersaglio finisce in un semipiano (incapacitato); le creature extraplanari non tornano se dura 1 minuto.",
    "Charisma save or the target is sent to a demiplane (Incapacitated); extraplanar creatures don't return if it lasts 1 minute.",
  ),
  sp(
    "greater-invisibility",
    "Invisibilità superiore",
    "Greater Invisibility",
    4,
    "illusion",
    "bard sorcerer wizard",
    [137],
    [159],
    {
      cast: "action",
      range: "touch",
      comp: "vs",
      dur: "1 minute",
      conc: true,
      conditions: "invisible",
      tags: "stealth",
    },
    "Una creatura toccata resta invisibile anche mentre attacca o lancia incantesimi.",
    "A touched creature stays Invisible even while it attacks or casts spells.",
  ),
  sp(
    "wall-of-fire",
    "Muro di fuoco",
    "Wall of Fire",
    4,
    "evocation",
    "druid sorcerer wizard",
    [172],
    [167],
    {
      cast: "action",
      range: 120,
      comp: "vsm",
      dur: "1 minute",
      conc: true,
      save: "dex",
      half: true,
      damage: "5d8 fire",
      scaling: "slot",
      tags: "terrain",
    },
    "Muro di fuoco opaco: 5d8 danni da fuoco con tiro salvezza su Destrezza quando appare, poi a chi entra o resta vicino al lato scelto.",
    "Opaque wall of fire: 5d8 Fire damage with a Dexterity save when it appears, then to creatures entering it or staying near the chosen side.",
  ),
  sp(
    "dimension-door",
    "Porta dimensionale",
    "Dimension Door",
    4,
    "conjuration",
    "bard sorcerer warlock wizard",
    [123, 124],
    [174],
    { cast: "action", range: 500, comp: "v", dur: "instant", tags: "movement teleportation" },
    "Ti teletrasporti fino a 150 m portando con te una creatura consenziente entro 1,5 m.",
    "Teleport up to 500 ft, taking one willing creature within 5 ft with you.",
  ),
  // Level 5
  sp(
    "cone-of-cold",
    "Cono di freddo",
    "Cone of Cold",
    5,
    "evocation",
    "druid sorcerer wizard",
    [117],
    [135],
    {
      cast: "action",
      range: "self",
      area: "cone 60",
      comp: "vsm",
      dur: "instant",
      save: "con",
      half: true,
      damage: "8d8 cold",
      scaling: "slot",
    },
    "Cono di 18 m: tiro salvezza su Costituzione, 8d8 danni da freddo (metà se riesce).",
    "60-ft Cone: Constitution save, 8d8 Cold damage (half on a success).",
  ),
  sp(
    "mass-cure-wounds",
    "Cura ferite di massa",
    "Mass Cure Wounds",
    5,
    "abjuration",
    "bard cleric druid",
    [147],
    [139],
    {
      cast: "action",
      range: 60,
      area: "sphere 30",
      comp: "vs",
      dur: "instant",
      heal: "5d8",
      scaling: "slot",
    },
    "Fino a sei creature in una sfera di 9 m di raggio recuperano 5d8 + modificatore da incantatore PF.",
    "Up to six creatures in a 30-ft-radius Sphere regain 5d8 + your spellcasting modifier HP.",
  ),
  sp(
    "raise-dead",
    "Rianimare morti",
    "Raise Dead",
    5,
    "necromancy",
    "bard cleric paladin",
    [157],
    [180],
    {
      cast: "1 hour",
      range: "touch",
      comp: "vsm",
      cost: 500,
      consumed: true,
      dur: "instant",
      tags: "resurrection",
    },
    "Riporta in vita con 1 PF chi è morto da non più di 10 giorni (diamante da 500 mo consumato); −4 alle prove con d20, che cala a ogni riposo lungo.",
    "Revives a creature dead for up to 10 days with 1 HP (500 GP diamond, consumed); −4 to D20 Tests, easing with each Long Rest.",
  ),
  sp(
    "hold-monster",
    "Blocca mostri",
    "Hold Monster",
    5,
    "enchantment",
    "bard sorcerer warlock wizard",
    [140, 141],
    [128],
    {
      cast: "action",
      range: 90,
      comp: "vsm",
      dur: "1 minute",
      conc: true,
      save: "wis",
      conditions: "paralyzed",
      scaling: "slot",
      tags: "control",
    },
    "Come Blocca persone ma su qualsiasi creatura: tiro salvezza su Saggezza o paralizzata, ripetuto a fine turno.",
    "Like Hold Person but for any creature: Wisdom save or Paralyzed, repeated at the end of each turn.",
  ),
  sp(
    "greater-restoration",
    "Ristorare superiore",
    "Greater Restoration",
    5,
    "abjuration",
    "bard cleric druid paladin ranger",
    [137],
    [182],
    {
      cast: "action",
      range: "touch",
      comp: "vsm",
      cost: 100,
      consumed: true,
      dur: "instant",
      tags: "support cure-condition",
    },
    "Rimuove un livello di indebolimento, affascinato o pietrificato, una maledizione o una riduzione di caratteristiche o PF massimi.",
    "Removes one Exhaustion level, Charmed or Petrified, a curse, or a reduction to ability scores or HP maximum.",
  ),
];

// ---------------------------------------------------------------- items

const itemId = (slug) => `srd2024:item:${slug}`;
const cost = (value) => {
  const [amount, coin] = value.split(" ");
  return { [coin]: Number(amount) };
};
const baseItem = (slug, it, en, category, enPages, itPages, extra) => ({
  id: itemId(slug),
  kind: "item",
  slug,
  name: text(it, en),
  translation: OFFICIAL,
  category,
  source: srdSource(enPages, itPages),
  links: {},
  aliases: [],
  ...extra,
});

// slug|it|en|category|dice|damage type|properties|range|ammunition|versatile|mastery|lb|cost|IT page
const WEAPON_ROWS = rows(`
club|Randello|Club|simple-melee|1d4|bludgeoning|light|-|-|-|slow|2|1 sp|103
dagger|Pugnale|Dagger|simple-melee|1d4|piercing|finesse light thrown|20/60|-|-|nick|1|2 gp|103
greatclub|Randello pesante|Greatclub|simple-melee|1d8|bludgeoning|two-handed|-|-|-|push|10|2 sp|103
handaxe|Ascia|Handaxe|simple-melee|1d6|slashing|light thrown|20/60|-|-|vex|2|5 gp|103
javelin|Giavellotto|Javelin|simple-melee|1d6|piercing|thrown|30/120|-|-|slow|2|5 sp|103
light-hammer|Martello leggero|Light Hammer|simple-melee|1d4|bludgeoning|light thrown|20/60|-|-|nick|2|2 gp|103
mace|Mazza|Mace|simple-melee|1d6|bludgeoning|-|-|-|-|sap|4|5 gp|103
quarterstaff|Bastone ferrato|Quarterstaff|simple-melee|1d6|bludgeoning|versatile|-|-|1d8|topple|4|2 sp|103
sickle|Falcetto|Sickle|simple-melee|1d4|slashing|light|-|-|-|nick|2|1 gp|103
spear|Lancia|Spear|simple-melee|1d6|piercing|thrown versatile|20/60|-|1d8|sap|3|1 gp|103
light-crossbow|Balestra leggera|Light Crossbow|simple-ranged|1d8|piercing|ammunition loading two-handed|80/320|bolt|-|slow|5|25 gp|103
shortbow|Arco corto|Shortbow|simple-ranged|1d6|piercing|ammunition two-handed|80/320|arrow|-|vex|2|25 gp|103
battleaxe|Ascia da battaglia|Battleaxe|martial-melee|1d8|slashing|versatile|-|-|1d10|topple|4|10 gp|103
greataxe|Ascia bipenne|Greataxe|martial-melee|1d12|slashing|heavy two-handed|-|-|-|cleave|7|30 gp|103
greatsword|Spadone|Greatsword|martial-melee|2d6|slashing|heavy two-handed|-|-|-|graze|6|50 gp|104
longsword|Spada lunga|Longsword|martial-melee|1d8|slashing|versatile|-|-|1d10|sap|3|15 gp|103
rapier|Stocco|Rapier|martial-melee|1d8|piercing|finesse|-|-|-|vex|2|25 gp|104
scimitar|Scimitarra|Scimitar|martial-melee|1d6|slashing|finesse light|-|-|-|nick|3|25 gp|103
shortsword|Spada corta|Shortsword|martial-melee|1d6|piercing|finesse light|-|-|-|vex|2|10 gp|103
warhammer|Martello da guerra|Warhammer|martial-melee|1d8|bludgeoning|versatile|-|-|1d10|push|5|15 gp|103
heavy-crossbow|Balestra pesante|Heavy Crossbow|martial-ranged|1d10|piercing|ammunition heavy loading two-handed|100/400|bolt|-|push|18|50 gp|104
longbow|Arco lungo|Longbow|martial-ranged|1d8|piercing|ammunition heavy two-handed|150/600|arrow|-|slow|2|50 gp|104
pistol|Pistola|Pistol|martial-ranged|1d10|piercing|ammunition loading|30/90|bullet|-|vex|3|250 gp|104
`);
const WEAPONS = WEAPON_ROWS.map(
  ([
    slug,
    it,
    en,
    cat,
    dice,
    type,
    props,
    rangeValue,
    ammo,
    versatile,
    mastery,
    lb,
    price,
    itPage,
  ]) => {
    const properties = words(props);
    const range = rangeValue ? rangeValue.split("/").map(Number) : null;
    const [group, reachKind] = cat.split("-");
    const rangeText = range
      ? `${decimal(feetToMeters(range[0]), "it")}/${decimal(feetToMeters(range[1]), "it")} m`
      : "";
    const rangeTextEn = range ? `${range[0]}/${range[1]} ft` : "";
    const propIt = properties.map((p) => LABELS.weaponProperty[p].it.toLowerCase()).join(", ");
    const propEn = properties.map((p) => LABELS.weaponProperty[p].en).join(", ");
    return baseItem(slug, it, en, "weapon", [91], [Number(itPage)], {
      subcategory: cat,
      weapon: {
        category: group,
        type: reachKind,
        damage: { dice, type },
        properties,
        versatile,
        range: range ? { normal: range[0], long: range[1] } : null,
        ammunition: ammo,
        mastery,
      },
      cost: cost(price),
      weight: Number(lb),
      summary: text(
        `${dice} danni ${DAMAGE_PHRASE[type].it}${propIt ? `; ${propIt}` : ""}${versatile ? ` (${versatile} a due mani)` : ""}${rangeText ? `; gittata ${rangeText}` : ""}. Padronanza: ${LABELS.mastery[mastery].it}.`,
        `${dice} ${DAMAGE_PHRASE[type].en} damage${propEn ? `; ${propEn}` : ""}${versatile ? ` (${versatile} two-handed)` : ""}${rangeTextEn ? `; range ${rangeTextEn}` : ""}. Mastery: ${LABELS.mastery[mastery].en}.`,
      ),
      tags: ["item", "weapon", group, reachKind, cat, type, mastery, ...properties],
    });
  },
);

// slug|it|en|category|AC (shield: bonus)|Dex cap (all, 0 or n)|Strength|Stealth disadvantage|lb|cost
const ARMOR_ROWS = rows(`
leather-armor|Armatura di cuoio|Leather Armor|light|11|all|-|no|10|10 gp
studded-leather-armor|Armatura di cuoio borchiato|Studded Leather Armor|light|12|all|-|no|13|45 gp
hide-armor|Armatura di pelle|Hide Armor|medium|12|2|-|no|12|10 gp
chain-shirt|Giaco di maglia|Chain Shirt|medium|13|2|-|no|20|50 gp
breastplate|Corazza di piastre|Breastplate|medium|14|2|-|no|20|400 gp
half-plate-armor|Mezza armatura|Half Plate Armor|medium|15|2|-|yes|40|750 gp
chain-mail|Cotta di maglia|Chain Mail|heavy|16|0|13|yes|55|75 gp
plate-armor|Armatura a piastre|Plate Armor|heavy|18|0|15|yes|65|1500 gp
shield|Scudo|Shield|shield|2|-|-|no|6|10 gp
`);
const DON_DOFF = {
  light: { don: "1 minute", doff: "1 minute" },
  medium: { don: "5 minutes", doff: "1 minute" },
  heavy: { don: "10 minutes", doff: "5 minutes" },
  shield: { don: "utilize-action", doff: "utilize-action" },
};
const ARMOR = ARMOR_ROWS.map(([slug, it, en, cat, acValue, cap, str, stealthValue, lb, price]) => {
  const isShield = cat === "shield";
  const ac = Number(acValue);
  const dexCap = cap === "all" || cap == null ? null : Number(cap);
  const strength = str ? Number(str) : null;
  const stealth = stealthValue === "yes";
  const acIt = isShield
    ? `+${ac} alla CA`
    : dexCap === 0
      ? `CA ${ac}`
      : `CA ${ac} + Destrezza${dexCap ? ` (max ${dexCap})` : ""}`;
  const acEn = isShield
    ? `+${ac} AC`
    : dexCap === 0
      ? `AC ${ac}`
      : `AC ${ac} + Dex${dexCap ? ` (max ${dexCap})` : ""}`;
  return baseItem(slug, it, en, "armor", [92], [104], {
    subcategory: cat,
    armor: {
      category: cat,
      baseAc: isShield ? null : ac,
      acBonus: isShield ? ac : null,
      addsDex: !isShield && dexCap !== 0,
      dexCap: isShield || dexCap === 0 ? null : dexCap,
      strength,
      stealthDisadvantage: stealth,
      ...DON_DOFF[cat],
    },
    cost: cost(price),
    weight: Number(lb),
    summary: text(
      `${LABELS.armorCategory[cat].it}: ${acIt}${strength ? `; For ${strength} o −3 m di Velocità` : ""}${stealth ? "; svantaggio a Furtività" : ""}.`,
      `${LABELS.armorCategory[cat].en}: ${acEn}${strength ? `; Str ${strength} or −10 ft Speed` : ""}${stealth ? "; Stealth Disadvantage" : ""}.`,
    ),
    tags: ["item", "armor", cat, ...(stealth ? ["stealth-disadvantage"] : [])],
  });
});

const TOOL_ROWS = [
  [
    "thieves-tools",
    "Arnesi da scasso",
    "Thieves’ Tools",
    "dex",
    1,
    "25 gp",
    [94],
    [106],
    "Scassinare una serratura (CD 15) o disattivare una trappola (CD 15).",
    "Pick a lock (DC 15) or disarm a trap (DC 15).",
  ],
  [
    "herbalism-kit",
    "Borsa da erborista",
    "Herbalism Kit",
    "int",
    3,
    "5 gp",
    [94],
    [106],
    "Identificare una pianta (CD 10); serve a creare antitossina, candele, borse del guaritore e pozioni di guarigione.",
    "Identify a plant (DC 10); used to craft Antitoxin, Candles, Healer's Kits and Potions of Healing.",
  ],
  [
    "smiths-tools",
    "Strumenti da fabbro",
    "Smith’s Tools",
    "str",
    8,
    "20 gp",
    [93, 94],
    [106],
    "Forzare una porta o un contenitore (CD 20); serve a forgiare armi da mischia, armature medie e pesanti e oggetti di metallo.",
    "Pry open a door or container (DC 20); used to forge melee weapons, Medium and Heavy armor and metal goods.",
  ],
  [
    "alchemists-supplies",
    "Scorte da alchimista",
    "Alchemist’s Supplies",
    "int",
    8,
    "50 gp",
    [93],
    [105],
    "Identificare una sostanza o accendere un fuoco (CD 15); serve a creare acido, fuoco dell'alchimista, olio e altro.",
    "Identify a substance or start a fire (DC 15); used to craft Acid, Alchemist's Fire, Oil and more.",
  ],
  [
    "disguise-kit",
    "Trucchi per il camuffamento",
    "Disguise Kit",
    "cha",
    3,
    "25 gp",
    [94],
    [106, 107],
    "Applicare un trucco (CD 10); serve a creare costumi.",
    "Apply makeup (DC 10); used to craft Costumes.",
  ],
];
const TOOLS = TOOL_ROWS.map(([slug, it, en, ability, lb, price, enPages, itPages, sIt, sEn]) =>
  baseItem(slug, it, en, "tool", enPages, itPages, {
    subcategory:
      slug === "thieves-tools" || slug === "herbalism-kit" || slug === "disguise-kit"
        ? "other-tool"
        : "artisans-tools",
    tool: { ability },
    cost: cost(price),
    weight: lb,
    summary: text(`${LABELS.ability[ability].it}. ${sIt}`, `${LABELS.ability[ability].en}. ${sEn}`),
    tags: ["item", "tool", ability],
  }),
);

const GEAR_ROWS = [
  [
    "backpack",
    "Zaino",
    "Backpack",
    5,
    "2 gp",
    [95, 96],
    [108, 113],
    "container",
    "Contiene fino a 15 kg in circa 30 dm³; può fare da bisaccia.",
    "Holds up to 30 lb within 1 cubic foot; can serve as a saddlebag.",
  ],
  [
    "bedroll",
    "Giaciglio",
    "Bedroll",
    7,
    "1 gp",
    [95, 96],
    [108, 110],
    "camp",
    "Per una creatura Piccola o Media; al suo interno supera automaticamente i TS contro il freddo estremo.",
    "Sleeps one Small or Medium creature; inside it you automatically succeed on saves against extreme cold.",
  ],
  [
    "rope",
    "Corda",
    "Rope",
    5,
    "1 gp",
    [95, 99],
    [108, 109],
    "utility",
    "Nodi con Rapidità di Mano (CD 10), si spezza con Atletica (CD 20); può legare una creatura afferrata, incapacitata o trattenuta.",
    "Tie knots with Sleight of Hand (DC 10), burst with Athletics (DC 20); can bind a Grappled, Incapacitated or Restrained creature.",
  ],
  [
    "torch",
    "Torcia",
    "Torch",
    1,
    "1 cp",
    [95, 100],
    [108, 113],
    "light",
    "Brucia 1 ora: luce intensa per 6 m e fioca per altri 6 m; può colpire come arma semplice per 1 danno da fuoco.",
    "Burns 1 hour: Bright Light 20 ft and Dim Light 20 ft more; can strike as a Simple weapon for 1 Fire damage.",
  ],
  [
    "rations",
    "Razioni",
    "Rations",
    2,
    "5 sp",
    [95, 99],
    [108, 112],
    "food",
    "Cibo da viaggio per un giorno.",
    "Travel food for one day.",
  ],
  [
    "healers-kit",
    "Borsa del guaritore",
    "Healer’s Kit",
    3,
    "5 gp",
    [95, 97],
    [107, 108],
    "healing",
    "Dieci utilizzi; con l'azione Utilizzo stabilizzi una creatura a 0 PF senza prova di Medicina.",
    "Ten uses; a Utilize action stabilizes a creature at 0 HP without a Medicine check.",
  ],
  [
    "hooded-lantern",
    "Lanterna schermabile",
    "Lantern, Hooded",
    2,
    "5 gp",
    [95, 98],
    [108, 110],
    "light",
    "Brucia olio: luce intensa per 9 m e fioca per altri 9 m; con un'azione bonus la abbassi a luce fioca per 1,5 m.",
    "Burns Oil: Bright Light 30 ft and Dim Light 30 ft more; a Bonus Action lowers it to Dim Light in 5 ft.",
  ],
  [
    "tinderbox",
    "Acciarino e pietra focaia",
    "Tinderbox",
    1,
    "5 sp",
    [95, 100],
    [107, 108],
    "light",
    "Accende una torcia, una lampada o una candela con un'azione bonus; qualsiasi altro fuoco richiede 1 minuto.",
    "Lights a Torch, Lamp or Candle as a Bonus Action; any other fire takes 1 minute.",
  ],
  [
    "component-pouch",
    "Borsa per componenti",
    "Component Pouch",
    2,
    "25 gp",
    [95, 97],
    [107, 108],
    "spellcasting",
    "Contiene tutte le componenti materiali gratuite dei tuoi incantesimi.",
    "Holds all the free Material components of your spells.",
  ],
  [
    "crowbar",
    "Piede di porco",
    "Crowbar",
    5,
    "2 gp",
    [95, 97],
    [108, 111],
    "utility",
    "Vantaggio alle prove di Forza in cui si può fare leva.",
    "Advantage on Strength checks where leverage applies.",
  ],
  [
    "caltrops",
    "Triboli",
    "Caltrops",
    2,
    "1 gp",
    [95, 96],
    [108, 113],
    "trap",
    "Coprono un quadrato di 1,5 m: TS su Destrezza CD 15 o 1 danno perforante e Velocità 0 fino al turno successivo.",
    "Cover a 5-ft square: DC 15 Dexterity save or 1 Piercing damage and Speed 0 until the next turn.",
  ],
  [
    "alchemists-fire",
    "Fuoco dell'alchimista",
    "Alchemist’s Fire",
    1,
    "50 gp",
    [94, 95],
    [108, 110],
    "thrown",
    "Al posto di un attacco lo lanci entro 6 m: TS su Destrezza o 1d4 danni da fuoco e il bersaglio va in fiamme.",
    "Replaces an attack, thrown within 20 ft: Dexterity save or 1d4 Fire damage and the target starts burning.",
  ],
  [
    "holy-water",
    "Acqua santa",
    "Holy Water",
    1,
    "25 gp",
    [95, 97],
    [107, 108],
    "thrown",
    "Al posto di un attacco la lanci entro 6 m: TS su Destrezza o 2d8 danni radiosi a immondi e non morti.",
    "Replaces an attack, thrown within 20 ft: Dexterity save or 2d8 Radiant damage to a Fiend or Undead.",
  ],
  [
    "antitoxin",
    "Antitossina",
    "Antitoxin",
    null,
    "50 gp",
    [95, 96],
    [107, 108],
    "healing",
    "Azione bonus: per 1 ora vantaggio ai TS per evitare o terminare la condizione avvelenato.",
    "Bonus Action: for 1 hour, Advantage on saves to avoid or end the Poisoned condition.",
  ],
  [
    "acid",
    "Acido",
    "Acid",
    1,
    "25 gp",
    [94, 95],
    [107, 108],
    "thrown",
    "Al posto di un attacco lo lanci entro 6 m: TS su Destrezza o 2d6 danni da acido.",
    "Replaces an attack, thrown within 20 ft: Dexterity save or 2d6 Acid damage.",
  ],
  [
    "explorers-pack",
    "Dotazione da esploratore",
    "Explorer’s Pack",
    55,
    "10 gp",
    [95, 97],
    [108, 109],
    "pack",
    "Zaino, giaciglio, 2 ampolle d'olio, 10 giorni di razioni, corda, acciarino, 10 torce e otre.",
    "Backpack, Bedroll, 2 flasks of Oil, 10 days of Rations, Rope, Tinderbox, 10 Torches and Waterskin.",
  ],
];
const GEAR = GEAR_ROWS.map(([slug, it, en, lb, price, enPages, itPages, sub, sIt, sEn]) =>
  baseItem(slug, it, en, "gear", enPages, itPages, {
    subcategory: sub,
    cost: cost(price),
    weight: lb,
    summary: text(sIt, sEn),
    tags: ["item", "gear", sub],
    ...(slug === "tinderbox" ? { altNames: { it: ["Acciarino con pietra focaia"], en: [] } } : {}),
    ...(slug === "explorers-pack"
      ? {
          contents: [
            { itemId: itemId("backpack"), quantity: 1 },
            { itemId: itemId("bedroll"), quantity: 1 },
            { name: text("Olio (ampolla)", "Oil (flask)"), quantity: 2 },
            { itemId: itemId("rations"), quantity: 10 },
            { itemId: itemId("rope"), quantity: 1 },
            { itemId: itemId("tinderbox"), quantity: 1 },
            { itemId: itemId("torch"), quantity: 10 },
            { name: text("Otre", "Waterskin"), quantity: 1 },
          ],
        }
      : {}),
  }),
);

// Structured bonuses an item gives "while you wear it" (Cloak/Ring of Protection, SRD EN
// 216/238, IT 264/240): the sheet's stat chain reads them (AC and every saving throw).
const WORN_PROTECTION = [
  { target: "ac", value: 1 },
  { target: "saves", value: 1 },
];
const MAGIC_ROWS = [
  // slug, it, en, type, rarity, attunement, enPages, itPages, extra, summary it, summary en
  [
    "potion-of-healing",
    "Pozione di guarigione",
    "Potion of Healing",
    "potion",
    "common",
    false,
    [95, 99, 236],
    [108, 111, 276],
    { cost: cost("50 gp"), weight: 0.5, healing: "2d4+2", consumable: true },
    "Recuperi 2d4 + 2 PF; con un'azione bonus la bevi o la fai bere a una creatura entro 1,5 m.",
    "Regain 2d4 + 2 HP; as a Bonus Action you drink it or give it to a creature within 5 ft.",
  ],
  [
    "potion-of-healing-greater",
    "Pozione di guarigione (maggiore)",
    "Potion of Healing (greater)",
    "potion",
    "uncommon",
    false,
    [236],
    [276],
    { healing: "4d4+4", consumable: true },
    "Recuperi 4d4 + 4 PF.",
    "Regain 4d4 + 4 HP.",
  ],
  [
    "potion-of-healing-superior",
    "Pozione di guarigione (superiore)",
    "Potion of Healing (superior)",
    "potion",
    "rare",
    false,
    [236],
    [276],
    { healing: "8d4+8", consumable: true },
    "Recuperi 8d4 + 8 PF.",
    "Regain 8d4 + 8 HP.",
  ],
  [
    "potion-of-climbing",
    "Pozione di scalare",
    "Potion of Climbing",
    "potion",
    "common",
    false,
    [235],
    [275],
    { consumable: true },
    "Per 1 ora ottieni Velocità di scalata pari alla tua Velocità e vantaggio alle prove di Forza (Atletica) per scalare.",
    "For 1 hour you gain a Climb Speed equal to your Speed and Advantage on Strength (Athletics) checks to climb.",
  ],
  [
    "bead-of-nourishment",
    "Perla nutriente",
    "Bead of Nourishment",
    "wondrous",
    "common",
    false,
    [213],
    [271],
    { consumable: true },
    "Si scioglie in bocca e nutre quanto un giorno di razioni.",
    "Dissolves on the tongue and nourishes like one day of Rations.",
  ],
  [
    "bag-of-holding",
    "Borsa conservante",
    "Bag of Holding",
    "wondrous",
    "uncommon",
    false,
    [212],
    [252],
    { weight: 5 },
    "Contiene fino a 250 kg e circa 1,8 m³ ma pesa sempre 2,5 kg; estrarre un oggetto richiede l'azione Utilizzo. Mai dentro un altro spazio extradimensionale.",
    "Holds up to 500 lb and 64 cubic feet but always weighs 5 lb; retrieving an item takes a Utilize action. Never place it in another extradimensional space.",
  ],
  [
    "boots-of-elvenkind",
    "Stivali elfici",
    "Boots of Elvenkind",
    "wondrous",
    "uncommon",
    false,
    [213],
    [283],
    {},
    "Passi silenziosi e vantaggio alle prove di Destrezza (Furtività).",
    "Silent steps and Advantage on Dexterity (Stealth) checks.",
  ],
  [
    "cloak-of-protection",
    "Mantello della protezione",
    "Cloak of Protection",
    "wondrous",
    "uncommon",
    true,
    [216],
    [264],
    { modifiers: WORN_PROTECTION },
    "+1 alla CA e ai tiri salvezza mentre lo indossi.",
    "+1 bonus to AC and saving throws while you wear it.",
  ],
  [
    "gauntlets-of-ogre-power",
    "Guanti del potere orchesco",
    "Gauntlets of Ogre Power",
    "wondrous",
    "uncommon",
    true,
    [223],
    [263],
    {},
    "La tua Forza diventa 19 mentre li indossi (nessun effetto se è già 19 o più).",
    "Your Strength is 19 while you wear them (no effect if it is already 19 or higher).",
  ],
  [
    "immovable-rod",
    "Verga inamovibile",
    "Immovable Rod",
    "rod",
    "uncommon",
    false,
    [227],
    [287, 288],
    {},
    "Con l'azione Utilizzo si blocca a mezz'aria e regge fino a 4.000 kg; spostarla richiede Atletica CD 30.",
    "A Utilize action fixes it in place, holding up to 8,000 lb; moving it takes a DC 30 Athletics check.",
  ],
  [
    "wand-of-magic-missiles",
    "Bacchetta di dardi incantati",
    "Wand of Magic Missiles",
    "wand",
    "uncommon",
    false,
    [251],
    [247],
    {
      charges: { max: 7, perUse: 3, regain: "1d6+1", recharge: "dawn", destroyOnLast: true },
      castsSpellId: spellId("magic-missile"),
    },
    "7 cariche: fino a 3 per lanciare Dardo incantato (livello 1 + 1 per carica extra); ne recupera 1d6 + 1 all'alba.",
    "7 charges: up to 3 to cast Magic Missile (level 1 + 1 per extra charge); regains 1d6 + 1 at dawn.",
  ],
  [
    "weapon-plus",
    "Arma +1, +2 o +3",
    "Weapon, +1, +2, or +3",
    "weapon",
    "varies",
    false,
    [253],
    [243],
    {
      variants: [
        { bonus: 1, rarity: "uncommon" },
        { bonus: 2, rarity: "rare" },
        { bonus: 3, rarity: "very-rare" },
      ],
    },
    "Bonus ai tiri per colpire e ai danni: +1 non comune, +2 raro, +3 molto raro.",
    "Bonus to attack and damage rolls: +1 uncommon, +2 rare, +3 very rare.",
  ],
  [
    "pearl-of-power",
    "Perla del potere",
    "Pearl of Power",
    "wondrous",
    "uncommon",
    "spellcaster",
    [234],
    [271],
    { recharge: "dawn" },
    "Con l'azione Magia recuperi uno slot incantesimo di livello 3 o inferiore; una volta per alba.",
    "A Magic action regains one spell slot of level 3 or lower; once per dawn.",
  ],
  [
    "ring-of-protection",
    "Anello di protezione",
    "Ring of Protection",
    "ring",
    "rare",
    true,
    [238],
    [240],
    { modifiers: WORN_PROTECTION },
    "+1 alla CA e ai tiri salvezza mentre lo indossi.",
    "+1 bonus to AC and saving throws while you wear it.",
  ],
  [
    "flame-tongue",
    "Lingua di fiamme",
    "Flame Tongue",
    "weapon",
    "rare",
    true,
    [223],
    [264],
    {},
    "Con un'azione bonus l'arma prende fuoco: luce intensa per 12 m e fioca per altri 12 m, +2d6 danni da fuoco a ogni colpo.",
    "A Bonus Action sets the weapon ablaze: Bright Light 40 ft and Dim Light 40 ft more, +2d6 Fire damage on a hit.",
  ],
  [
    "amulet-of-health",
    "Amuleto della salute",
    "Amulet of Health",
    "wondrous",
    "rare",
    true,
    [209],
    [238],
    {},
    "La tua Costituzione diventa 19 mentre lo indossi (nessun effetto se è già 19 o più).",
    "Your Constitution is 19 while you wear it (no effect if it is already 19 or higher).",
  ],
  [
    "wand-of-fireballs",
    "Bacchetta delle palle di fuoco",
    "Wand of Fireballs",
    "wand",
    "rare",
    "spellcaster",
    [250, 251],
    [247],
    {
      charges: { max: 7, perUse: 3, regain: "1d6+1", recharge: "dawn", destroyOnLast: true },
      castsSpellId: spellId("fireball"),
      saveDc: 15,
    },
    "7 cariche: fino a 3 per lanciare Palla di fuoco (CD 15; livello 3 + 1 per carica extra); ne recupera 1d6 + 1 all'alba.",
    "7 charges: up to 3 to cast Fireball (DC 15; level 3 + 1 per extra charge); regains 1d6 + 1 at dawn.",
  ],
  [
    "armor-plus",
    "Armatura +1, +2 o +3",
    "Armor, +1, +2, or +3",
    "armor",
    "varies",
    false,
    [210],
    [243],
    {
      variants: [
        { bonus: 1, rarity: "rare" },
        { bonus: 2, rarity: "very-rare" },
        { bonus: 3, rarity: "legendary" },
      ],
    },
    "Bonus alla CA: +1 raro, +2 molto raro, +3 leggendario.",
    "Bonus to AC: +1 rare, +2 very rare, +3 legendary.",
  ],
];
const MAGIC_ITEMS = MAGIC_ROWS.map(
  ([slug, it, en, type, rarity, attune, enPages, itPages, extra, sIt, sEn]) => {
    const { cost: price = null, weight = null, ...magicExtra } = extra;
    const rarities = magicExtra.variants ? magicExtra.variants.map((v) => v.rarity) : [rarity];
    return baseItem(slug, it, en, "magic-item", enPages, itPages, {
      subcategory: type,
      magic: {
        type,
        rarity,
        attunement:
          attune === false ? false : { required: true, by: attune === true ? null : attune },
        ...magicExtra,
      },
      cost: price,
      weight,
      summary: text(sIt, sEn),
      tags: [
        "item",
        "magic-item",
        type,
        ...rarities,
        ...(attune ? ["attunement"] : []),
        ...(magicExtra.charges ? ["charges"] : []),
        ...(magicExtra.consumable ? ["consumable"] : []),
        ...(magicExtra.healing ? ["healing"] : []),
      ],
    });
  },
);

// ---------------------------------------------------------------- creatures

const creatureId = (slug) => `srd2024:creature:${slug}`;
const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
const signed = (n) => (n >= 0 ? `+${n}` : `−${Math.abs(n)}`);
// Machine dice use ASCII without spaces ("1d6+2"); display adds spaces like the SRD.
const normalizeDice = (value) => value.replace(/\s+/g, "").replace(/−/g, "-");
const displayDice = (value) => value.replace(/([+-])/g, " $1 ").replace(/-/g, "−");
const SINGULAR_IT = {
  taglienti: "tagliente",
  perforanti: "perforante",
  contundenti: "contundente",
  necrotici: "necrotico",
  psichici: "psichico",
  radiosi: "radioso",
};
const hitText = (damage, lang) =>
  damage
    .map((d) => {
      const amount = `${d.average}${d.dice ? ` (${displayDice(d.dice)})` : ""}`;
      if (lang !== "it") return `${amount} ${DAMAGE_PHRASE[d.type].en} damage`;
      const phrase = DAMAGE_PHRASE[d.type].it;
      return d.average === 1 && !d.dice
        ? `1 danno ${SINGULAR_IT[phrase] ?? phrase}`
        : `${amount} danni ${phrase}`;
    })
    .join(lang === "it" ? " più " : " plus ");
const dmg = (spec) =>
  spec.split(",").map((part) => {
    const [average, dice, type] = part.trim().split(" ");
    return { average: Number(average), dice: dice === "-" ? null : normalizeDice(dice), type };
  });

// Attack action. kind: melee | ranged | both. reach/range in feet.
function atk(
  slug,
  it,
  en,
  kind,
  bonus,
  { reach = null, range = null } = {},
  damage,
  noteIt = "",
  noteEn = "",
) {
  const hits = dmg(damage);
  const kindIt = {
    melee: "Attacco in mischia",
    ranged: "Attacco a distanza",
    both: "Attacco in mischia o a distanza",
  }[kind];
  const kindEn = { melee: "Melee attack", ranged: "Ranged attack", both: "Melee or ranged attack" }[
    kind
  ];
  const whereIt = [
    reach ? `portata ${formatDistance(reach, "it")}` : "",
    range
      ? `gittata ${range[1] ? `${decimal(feetToMeters(range[0]), "it")}/${decimal(feetToMeters(range[1]), "it")} m` : formatDistance(range[0], "it")}`
      : "",
  ]
    .filter(Boolean)
    .join(" o ");
  const whereEn = [
    reach ? `reach ${reach} ft` : "",
    range ? `range ${range[1] ? `${range[0]}/${range[1]}` : range[0]} ft` : "",
  ]
    .filter(Boolean)
    .join(" or ");
  return {
    id: slug,
    name: text(it, en),
    kind: "attack",
    attack: {
      type: kind === "both" ? "melee-or-ranged" : kind,
      bonus,
      reach,
      range: range ? { normal: range[0], long: range[1] ?? null } : null,
    },
    damage: hits,
    summary: text(
      `${kindIt} ${signed(bonus)}, ${whereIt}: ${hitText(hits, "it")}.${noteIt ? ` ${noteIt}` : ""}`,
      `${kindEn} ${signed(bonus)}, ${whereEn}: ${hitText(hits, "en")}.${noteEn ? ` ${noteEn}` : ""}`,
    ),
  };
}
// Saving-throw action.
function save(
  slug,
  it,
  en,
  ability,
  dc,
  damage,
  { recharge = null, halfOnSuccess = false } = {},
  sIt,
  sEn,
) {
  return {
    id: slug,
    name: text(it, en),
    kind: "save",
    save: { ability, dc, halfOnSuccess },
    damage: damage ? dmg(damage) : [],
    recharge,
    summary: text(sIt, sEn),
  };
}
function special(slug, it, en, sIt, sEn, extra = {}) {
  return {
    id: slug,
    name: text(it, en),
    kind: extra.kind ?? "special",
    ...extra,
    summary: text(sIt, sEn),
  };
}
const multi = (sIt, sEn) =>
  special("multiattack", "Multiattacco", "Multiattack", sIt, sEn, { kind: "multiattack" });
const packTactics = (sIt, sEn) =>
  special("pack-tactics", "Tattiche del branco", "Pack Tactics", sIt, sEn);
const PACK_IT =
  "Vantaggio agli attacchi contro una creatura se un alleato non incapacitato è entro 1,5 m da essa.";
const PACK_EN =
  "Advantage on attacks against a creature if a non-Incapacitated ally is within 5 ft of it.";
const nimbleEscape = special(
  "nimble-escape",
  "Fuga agile",
  "Nimble Escape",
  "Effettua l'azione di Disimpegno o Nascondersi.",
  "Takes the Disengage or Hide action.",
);
const parry = (who) =>
  special(
    "parry",
    "Parata",
    "Parry",
    `Reazione quando ${who} è colpito da un attacco in mischia mentre impugna un'arma: +2 alla CA contro quell'attacco.`,
    "Reaction when hit by a melee attack roll while holding a weapon: +2 AC against that attack.",
    { kind: "reaction" },
  );
const spellList = (slugs) => words(slugs).map((slug) => ({ spellId: spellId(slug) }));

function mon(slug, it, en, enPages, itPages, spec) {
  const [hpAverage, hpFormula] = spec.hp;
  const abilities = Object.fromEntries(ABILITY_KEYS.map((k, i) => [k, spec.abilities[i]]));
  const sizes = words(spec.size);
  const traits = spec.traits ?? [];
  const actions = spec.actions ?? [];
  const bonusActions = spec.bonus ?? [];
  const reactions = spec.reactions ?? [];
  const damageTypes = new Set(
    [...traits, ...actions, ...bonusActions, ...reactions].flatMap((a) =>
      (a.damage ?? []).map((d) => d.type),
    ),
  );
  return {
    id: creatureId(slug),
    kind: "creature",
    slug,
    name: text(it, en),
    translation: OFFICIAL,
    size: sizes,
    type: spec.type,
    typeTags: words(spec.typeTags),
    alignment: spec.alignment,
    ac: spec.ac,
    initiative: { bonus: spec.init, score: 10 + spec.init },
    hp: { average: hpAverage, formula: normalizeDice(hpFormula) },
    speed: spec.speed,
    abilities,
    saves: spec.saves ?? {},
    skills: spec.skills ?? {},
    vulnerabilities: words(spec.vulnerable),
    resistances: words(spec.resist),
    immunities: words(spec.immune),
    conditionImmunities: words(spec.conditionImmune),
    gear: (spec.gear ?? []).map((g) => (typeof g === "string" ? { itemId: itemId(g) } : g)),
    senses: { passivePerception: spec.pp, ...(spec.senses ?? {}) },
    languages: spec.languages,
    cr: spec.cr,
    crValue: crToNumber(spec.cr),
    xp: spec.xp,
    proficiencyBonus: spec.pb,
    traits,
    actions,
    bonusActions,
    reactions,
    summary: spec.summary,
    tags: [
      ...new Set([
        "creature",
        spec.type,
        ...sizes,
        ...words(spec.typeTags),
        `cr-${spec.cr.replace("/", "-")}`,
        ...damageTypes,
        ...(spec.speed.fly ? ["flying"] : []),
        ...(spec.speed.swim ? ["swimming"] : []),
        ...(actions.some((a) => a.kind === "spellcasting") ? ["spellcaster"] : []),
        ...words(spec.tags),
      ]),
    ],
    source: srdSource(enPages, itPages),
    links: spec.links ?? {},
    aliases: spec.aliases ?? [],
  };
}

const NO_LANGUAGES = text("nessuna", "None");
const COMMON = text("Comune", "Common");
const COMMON_GOBLIN = text("Comune, Goblin", "Common, Goblin");
const COMMON_PLUS_ONE = text("Comune più un'altra lingua", "Common plus one other language");
const UNDERSTANDS_COMMON = text(
  "capisce il Comune più un'altra lingua ma non le parla",
  "Understands Common plus one other language but can’t speak",
);
const GIANT = text("Gigante", "Giant");
const DV = (ft) => ({ darkvision: ft });

const CREATURE_DEFS = [
  mon("cat", "Gatto", "Cat", [346], [391, 392], {
    size: "tiny",
    type: "beast",
    alignment: "unaligned",
    ac: 12,
    init: 2,
    hp: [2, "1d4"],
    speed: { walk: 40, climb: 40 },
    abilities: [3, 15, 10, 3, 12, 7],
    saves: { dex: 4 },
    skills: { perception: 3, stealth: 4 },
    senses: DV(60),
    pp: 13,
    languages: NO_LANGUAGES,
    cr: "0",
    xp: 10,
    pb: 2,
    tags: "familiar-form",
    aliases: ["srd2024:cat"],
    links: { formsCompanions: "srd2024:cat" },
    traits: [
      special(
        "jumper",
        "Saltatore",
        "Jumper",
        "Usa la Destrezza invece della Forza per calcolare la distanza dei salti.",
        "Uses Dexterity instead of Strength to determine its jump distance.",
      ),
    ],
    actions: [atk("scratch", "Graffio", "Scratch", "melee", 4, { reach: 5 }, "1 - slashing")],
    summary: text(
      "Piccolo felino agile e silenzioso; forma comune di famiglio.",
      "Small, agile and quiet feline; a common familiar form.",
    ),
  }),
  mon("rat", "Topo", "Rat", [359], [405], {
    size: "tiny",
    type: "beast",
    alignment: "unaligned",
    ac: 10,
    init: 0,
    hp: [1, "1d4 − 1"],
    speed: { walk: 20, climb: 20 },
    abilities: [2, 11, 9, 2, 10, 4],
    skills: { perception: 2 },
    senses: DV(30),
    pp: 12,
    languages: NO_LANGUAGES,
    cr: "0",
    xp: 10,
    pb: 2,
    tags: "familiar-form",
    aliases: ["srd2024:rat"],
    links: { formsCompanions: "srd2024:rat" },
    traits: [
      special(
        "agile",
        "Agile",
        "Agile",
        "Non provoca attacchi di opportunità quando esce dalla portata di un nemico.",
        "Doesn't provoke Opportunity Attacks when it leaves an enemy's reach.",
      ),
    ],
    actions: [atk("bite", "Morso", "Bite", "melee", 2, { reach: 5 }, "1 - piercing")],
    summary: text(
      "Roditore sfuggente; forma comune di famiglio.",
      "Elusive rodent; a common familiar form.",
    ),
  }),
  mon("owl", "Gufo", "Owl", [358], [392, 393], {
    size: "tiny",
    type: "beast",
    alignment: "unaligned",
    ac: 11,
    init: 1,
    hp: [1, "1d4 − 1"],
    speed: { walk: 5, fly: 60 },
    abilities: [3, 13, 8, 2, 12, 7],
    skills: { perception: 5, stealth: 5 },
    senses: DV(120),
    pp: 15,
    languages: NO_LANGUAGES,
    cr: "0",
    xp: 10,
    pb: 2,
    tags: "familiar-form",
    traits: [
      special(
        "flyby",
        "Volo sfuggente",
        "Flyby",
        "Non provoca attacchi di opportunità quando vola fuori dalla portata di un nemico.",
        "Doesn't provoke Opportunity Attacks when it flies out of an enemy's reach.",
      ),
    ],
    actions: [atk("talons", "Speroni", "Talons", "melee", 3, { reach: 5 }, "1 - slashing")],
    summary: text(
      "Rapace notturno con ottima vista al buio; esploratore ideale.",
      "Nocturnal raptor with keen darkvision; an ideal scout.",
    ),
  }),
  mon("commoner", "Popolano", "Commoner", [275], [365, 366], {
    size: "medium small",
    type: "humanoid",
    alignment: "n",
    ac: 10,
    init: 0,
    hp: [4, "1d8"],
    speed: { walk: 30 },
    abilities: [10, 10, 10, 10, 10, 10],
    gear: ["club"],
    pp: 10,
    languages: COMMON,
    cr: "0",
    xp: 10,
    pb: 2,
    tags: "npc",
    traits: [
      special(
        "training",
        "Addestramento",
        "Training",
        "Competente in un'abilità scelta dal GM, con vantaggio alle prove che la usano.",
        "Proficient in one skill of the GM's choice, with Advantage on checks using it.",
      ),
    ],
    actions: [atk("club", "Randello", "Club", "melee", 2, { reach: 5 }, "2 1d4 bludgeoning")],
    summary: text(
      "Persona comune: contadino, servitore o cittadino.",
      "An ordinary person: farmer, servant or townsfolk.",
    ),
  }),
  mon("bandit", "Bandito", "Bandit", [261], [297], {
    size: "medium small",
    type: "humanoid",
    alignment: "n",
    ac: 12,
    init: 1,
    hp: [11, "2d8 + 2"],
    speed: { walk: 30 },
    abilities: [11, 12, 12, 10, 10, 10],
    gear: ["leather-armor", "light-crossbow", "scimitar"],
    pp: 10,
    languages: text("Comune, Gergo ladresco", "Common, Thieves’ Cant"),
    cr: "1/8",
    xp: 25,
    pb: 2,
    tags: "npc outlaw",
    actions: [
      atk("scimitar", "Scimitarra", "Scimitar", "melee", 3, { reach: 5 }, "4 1d6+1 slashing"),
      atk(
        "light-crossbow",
        "Balestra leggera",
        "Light Crossbow",
        "ranged",
        3,
        { range: [80, 320] },
        "5 1d8+1 piercing",
      ),
    ],
    summary: text(
      "Fuorilegge armato alla leggera, spesso in gruppo.",
      "Lightly armed outlaw, usually in a gang.",
    ),
  }),
  mon("guard", "Guardia", "Guard", [296], [344], {
    size: "medium small",
    type: "humanoid",
    alignment: "n",
    ac: 16,
    init: 1,
    hp: [11, "2d8 + 2"],
    speed: { walk: 30 },
    abilities: [13, 12, 12, 10, 11, 10],
    skills: { perception: 2 },
    gear: ["chain-shirt", "shield", "spear"],
    pp: 12,
    languages: COMMON,
    cr: "1/8",
    xp: 25,
    pb: 2,
    tags: "npc",
    actions: [
      atk("spear", "Lancia", "Spear", "both", 3, { reach: 5, range: [20, 60] }, "4 1d6+1 piercing"),
    ],
    summary: text(
      "Sentinella con scudo e lancia di città o castelli.",
      "Shield-and-spear sentry of towns and keeps.",
    ),
  }),
  mon("cultist", "Cultista", "Cultist", [278], [305], {
    size: "medium small",
    type: "humanoid",
    alignment: "n",
    ac: 12,
    init: 1,
    hp: [9, "2d8"],
    speed: { walk: 30 },
    abilities: [11, 12, 10, 10, 11, 10],
    saves: { wis: 2 },
    skills: { deception: 2, religion: 2 },
    gear: ["leather-armor", "sickle"],
    pp: 10,
    languages: COMMON,
    cr: "1/8",
    xp: 25,
    pb: 2,
    tags: "npc",
    actions: [
      atk(
        "ritual-sickle",
        "Falcetto rituale",
        "Ritual Sickle",
        "melee",
        3,
        { reach: 5 },
        "3 1d4+1 slashing, 1 - necrotic",
      ),
    ],
    summary: text(
      "Devoto di un culto oscuro, fedele e spendibile.",
      "Devotee of a dark cult, loyal and expendable.",
    ),
  }),
  mon("giant-rat", "Topo gigante", "Giant Rat", [353], [405], {
    size: "small",
    type: "beast",
    alignment: "unaligned",
    ac: 13,
    init: 3,
    hp: [7, "2d6"],
    speed: { walk: 30, climb: 30 },
    abilities: [7, 16, 11, 2, 10, 4],
    saves: { dex: 5 },
    skills: { perception: 2 },
    senses: DV(60),
    pp: 12,
    languages: NO_LANGUAGES,
    cr: "1/8",
    xp: 25,
    pb: 2,
    tags: "vermin",
    traits: [packTactics(PACK_IT, PACK_EN)],
    actions: [atk("bite", "Morso", "Bite", "melee", 5, { reach: 5 }, "5 1d4+3 piercing")],
    summary: text(
      "Ratto delle fogne grande come un cane, caccia in branco.",
      "Dog-sized sewer rat that hunts in packs.",
    ),
  }),
  mon("goblin-minion", "Goblin tirapiedi", "Goblin Minion", [290], [340], {
    size: "small",
    type: "fey",
    typeTags: "goblinoid",
    alignment: "cn",
    ac: 12,
    init: 2,
    hp: [7, "2d6"],
    speed: { walk: 30 },
    abilities: [8, 15, 10, 10, 8, 8],
    skills: { stealth: 6 },
    gear: [{ itemId: itemId("dagger"), quantity: 3 }],
    senses: DV(60),
    pp: 9,
    languages: COMMON_GOBLIN,
    cr: "1/8",
    xp: 25,
    pb: 2,
    tags: "goblin",
    actions: [
      atk(
        "dagger",
        "Pugnale",
        "Dagger",
        "both",
        4,
        { reach: 5, range: [20, 60] },
        "4 1d4+2 piercing",
      ),
    ],
    bonus: [nimbleEscape],
    summary: text(
      "Goblin di basso rango armato di pugnali.",
      "Low-ranking goblin armed with daggers.",
    ),
  }),
  mon("goblin-warrior", "Goblin guerriero", "Goblin Warrior", [290], [340], {
    size: "small",
    type: "fey",
    typeTags: "goblinoid",
    alignment: "cn",
    ac: 15,
    init: 2,
    hp: [10, "3d6"],
    speed: { walk: 30 },
    abilities: [8, 15, 10, 10, 8, 8],
    skills: { stealth: 6 },
    gear: ["leather-armor", "scimitar", "shield", "shortbow"],
    senses: DV(60),
    pp: 9,
    languages: COMMON_GOBLIN,
    cr: "1/4",
    xp: 50,
    pb: 2,
    tags: "goblin sample-encounter",
    actions: [
      atk(
        "scimitar",
        "Scimitarra",
        "Scimitar",
        "melee",
        4,
        { reach: 5 },
        "5 1d6+2 slashing",
        "Più 2 (1d4) taglienti se il tiro aveva vantaggio.",
        "Plus 2 (1d4) Slashing if the roll had Advantage.",
      ),
      atk(
        "shortbow",
        "Arco corto",
        "Shortbow",
        "ranged",
        4,
        { range: [80, 320] },
        "5 1d6+2 piercing",
        "Più 2 (1d4) perforanti se il tiro aveva vantaggio.",
        "Plus 2 (1d4) Piercing if the roll had Advantage.",
      ),
    ],
    bonus: [nimbleEscape],
    summary: text(
      "Il goblin tipico: rapido, furtivo, colpisce e sparisce.",
      "The typical goblin: quick, sneaky, hits and vanishes.",
    ),
  }),
  mon("wolf", "Lupo", "Wolf", [364], [394], {
    size: "medium",
    type: "beast",
    alignment: "unaligned",
    ac: 12,
    init: 2,
    hp: [11, "2d8 + 2"],
    speed: { walk: 40 },
    abilities: [14, 15, 12, 3, 12, 6],
    skills: { perception: 5, stealth: 4 },
    senses: DV(60),
    pp: 15,
    languages: NO_LANGUAGES,
    cr: "1/4",
    xp: 50,
    pb: 2,
    tags: "wild-shape-form",
    aliases: ["srd2024:wolf"],
    links: { formsCompanions: "srd2024:wolf" },
    traits: [packTactics(PACK_IT, PACK_EN)],
    actions: [
      atk(
        "bite",
        "Morso",
        "Bite",
        "melee",
        4,
        { reach: 5 },
        "5 1d6+2 piercing",
        "Un bersaglio di taglia Media o inferiore cade prono.",
        "A Medium or smaller target has the Prone condition.",
      ),
    ],
    summary: text(
      "Predatore di branco che atterra le prede.",
      "Pack predator that knocks prey down.",
    ),
  }),
  mon("skeleton", "Scheletro", "Skeleton", [325, 326], [371], {
    size: "medium",
    type: "undead",
    alignment: "le",
    ac: 14,
    init: 3,
    hp: [13, "2d8 + 4"],
    speed: { walk: 30 },
    abilities: [10, 16, 15, 6, 8, 5],
    vulnerable: "bludgeoning",
    immune: "poison",
    conditionImmune: "exhaustion poisoned",
    gear: ["shortbow", "shortsword"],
    senses: DV(60),
    pp: 9,
    languages: UNDERSTANDS_COMMON,
    cr: "1/4",
    xp: 50,
    pb: 2,
    actions: [
      atk("shortsword", "Spada corta", "Shortsword", "melee", 5, { reach: 5 }, "6 1d6+3 piercing"),
      atk(
        "shortbow",
        "Arco corto",
        "Shortbow",
        "ranged",
        5,
        { range: [80, 320] },
        "6 1d6+3 piercing",
      ),
    ],
    summary: text(
      "Ossa animate che obbediscono a chi le ha rianimate; fragili ai colpi contundenti.",
      "Animated bones obeying their creator; vulnerable to bludgeoning blows.",
    ),
  }),
  mon("zombie", "Zombi", "Zombie", [343, 344], [384], {
    size: "medium",
    type: "undead",
    alignment: "ne",
    ac: 8,
    init: -2,
    hp: [15, "2d8 + 6"],
    speed: { walk: 20 },
    abilities: [13, 6, 16, 3, 6, 5],
    saves: { wis: 0 },
    immune: "poison",
    conditionImmune: "exhaustion poisoned",
    senses: DV(60),
    pp: 8,
    languages: UNDERSTANDS_COMMON,
    cr: "1/4",
    xp: 50,
    pb: 2,
    traits: [
      special(
        "undead-fortitude",
        "Tempra dei non morti",
        "Undead Fortitude",
        "Se i danni lo portano a 0 PF, TS su Costituzione con CD 5 + danni subiti (non contro danni radiosi o colpi critici): se riesce resta a 1 PF.",
        "If damage drops it to 0 HP, it makes a Constitution save (DC 5 + damage taken) unless the damage is Radiant or a Critical Hit; on a success it stays at 1 HP.",
      ),
    ],
    actions: [atk("slam", "Schianto", "Slam", "melee", 3, { reach: 5 }, "5 1d8+1 bludgeoning")],
    summary: text(
      "Cadavere lento e ostinato, difficile da abbattere.",
      "Slow, stubborn corpse that is hard to put down.",
    ),
  }),
  mon("scout", "Esploratore", "Scout", [322], [333], {
    size: "medium small",
    type: "humanoid",
    alignment: "n",
    ac: 13,
    init: 2,
    hp: [16, "3d8 + 3"],
    speed: { walk: 30 },
    abilities: [11, 14, 12, 11, 13, 11],
    skills: { nature: 4, perception: 5, stealth: 6, survival: 5 },
    gear: ["leather-armor", "longbow", "shortsword"],
    pp: 15,
    languages: COMMON_PLUS_ONE,
    cr: "1/2",
    xp: 100,
    pb: 2,
    tags: "npc",
    actions: [
      multi(
        "Due attacchi, con Spada corta e Arco lungo in qualsiasi combinazione.",
        "Two attacks, using Shortsword and Longbow in any combination.",
      ),
      atk("shortsword", "Spada corta", "Shortsword", "melee", 4, { reach: 5 }, "5 1d6+2 piercing"),
      atk(
        "longbow",
        "Arco lungo",
        "Longbow",
        "ranged",
        4,
        { range: [150, 600] },
        "6 1d8+2 piercing",
      ),
    ],
    summary: text("Cacciatore e guida delle terre selvagge.", "Wilderness hunter and guide."),
  }),
  mon("black-bear", "Orso nero", "Black Bear", [345], [396], {
    size: "medium",
    type: "beast",
    alignment: "unaligned",
    ac: 11,
    init: 1,
    hp: [19, "3d8 + 6"],
    speed: { walk: 30, climb: 30, swim: 30 },
    abilities: [15, 12, 14, 2, 12, 7],
    skills: { perception: 5 },
    senses: DV(60),
    pp: 15,
    languages: NO_LANGUAGES,
    cr: "1/2",
    xp: 100,
    pb: 2,
    tags: "wild-shape-form",
    actions: [
      multi("Due attacchi Squarcio.", "Two Rend attacks."),
      atk("rend", "Squarcio", "Rend", "melee", 4, { reach: 5 }, "5 1d6+2 slashing"),
    ],
    summary: text(
      "Orso dei boschi che si arrampica e nuota.",
      "Forest bear that climbs and swims.",
    ),
  }),
  mon("hobgoblin-warrior", "Hobgoblin guerriero", "Hobgoblin Warrior", [298, 299], [345, 346], {
    size: "medium",
    type: "fey",
    typeTags: "goblinoid",
    alignment: "le",
    ac: 18,
    init: 3,
    hp: [11, "2d8 + 2"],
    speed: { walk: 30 },
    abilities: [13, 12, 12, 10, 10, 9],
    gear: ["half-plate-armor", "longbow", "longsword", "shield"],
    senses: DV(60),
    pp: 10,
    languages: COMMON_GOBLIN,
    cr: "1/2",
    xp: 100,
    pb: 2,
    tags: "goblin",
    traits: [packTactics(PACK_IT, PACK_EN)],
    actions: [
      atk("longsword", "Spada lunga", "Longsword", "melee", 3, { reach: 5 }, "12 2d10+1 slashing"),
      atk(
        "longbow",
        "Arco lungo",
        "Longbow",
        "ranged",
        3,
        { range: [150, 600] },
        "5 1d8+1 piercing, 7 3d4 poison",
      ),
    ],
    summary: text(
      "Soldato disciplinato in armatura pesante, combatte in formazione.",
      "Disciplined soldier in heavy armor who fights in formation.",
    ),
  }),
  mon("goblin-boss", "Goblin capo", "Goblin Boss", [290], [340, 341], {
    size: "small",
    type: "fey",
    typeTags: "goblinoid",
    alignment: "cn",
    ac: 17,
    init: 2,
    hp: [21, "6d6"],
    speed: { walk: 30 },
    abilities: [10, 15, 10, 10, 8, 10],
    skills: { stealth: 6 },
    gear: ["chain-shirt", "scimitar", "shield", "shortbow"],
    senses: DV(60),
    pp: 9,
    languages: COMMON_GOBLIN,
    cr: "1",
    xp: 200,
    pb: 2,
    tags: "goblin leader",
    actions: [
      multi(
        "Due attacchi, con Scimitarra o Arco corto in qualsiasi combinazione.",
        "Two attacks, using Scimitar or Shortbow in any combination.",
      ),
      atk(
        "scimitar",
        "Scimitarra",
        "Scimitar",
        "melee",
        4,
        { reach: 5 },
        "5 1d6+2 slashing",
        "Più 2 (1d4) taglienti se il tiro aveva vantaggio.",
        "Plus 2 (1d4) Slashing if the roll had Advantage.",
      ),
      atk(
        "shortbow",
        "Arco corto",
        "Shortbow",
        "ranged",
        4,
        { range: [80, 320] },
        "5 1d6+2 piercing",
        "Più 2 (1d4) perforanti se il tiro aveva vantaggio.",
        "Plus 2 (1d4) Piercing if the roll had Advantage.",
      ),
    ],
    bonus: [nimbleEscape],
    reactions: [
      special(
        "redirect-attack",
        "Sviare attacco",
        "Redirect Attack",
        "Reazione quando una creatura che vede lo attacca: si scambia di posto con un alleato Piccolo o Medio entro 1,5 m, che diventa il bersaglio.",
        "Reaction when a creature it can see attacks it: swaps places with a Small or Medium ally within 5 ft, who becomes the target.",
        { kind: "reaction" },
      ),
    ],
    summary: text(
      "Capobanda goblin che usa i suoi come scudo.",
      "Goblin chief who uses its underlings as shields.",
    ),
  }),
  mon("bugbear-warrior", "Bugbear guerriero", "Bugbear Warrior", [272], [299, 300], {
    size: "medium",
    type: "fey",
    typeTags: "goblinoid",
    alignment: "ce",
    ac: 14,
    init: 2,
    hp: [33, "6d8 + 6"],
    speed: { walk: 30 },
    abilities: [15, 14, 13, 8, 11, 9],
    skills: { stealth: 6, survival: 2 },
    gear: ["hide-armor", { itemId: itemId("light-hammer"), quantity: 3 }],
    senses: DV(60),
    pp: 10,
    languages: COMMON_GOBLIN,
    cr: "1",
    xp: 200,
    pb: 2,
    tags: "goblin",
    traits: [
      special(
        "abduct",
        "Rapimento",
        "Abduct",
        "Non spende movimento extra per spostare una creatura che sta afferrando.",
        "Needn't spend extra movement to move a creature it is grappling.",
      ),
    ],
    actions: [
      atk(
        "grab",
        "Presa",
        "Grab",
        "melee",
        4,
        { reach: 10 },
        "9 2d6+2 bludgeoning",
        "Un bersaglio Medio o inferiore è afferrato (fuga CD 12).",
        "A Medium or smaller target is Grappled (escape DC 12).",
      ),
      atk(
        "light-hammer",
        "Martello leggero",
        "Light Hammer",
        "both",
        4,
        { reach: 10, range: [20, 60] },
        "9 3d4+2 bludgeoning",
        "Vantaggio se il bersaglio è afferrato dal bugbear.",
        "Advantage if the target is Grappled by the bugbear.",
      ),
    ],
    summary: text(
      "Goblinoide grosso e furtivo che afferra e trascina le prede.",
      "Big, stealthy goblinoid that grabs and drags its prey.",
    ),
  }),
  mon("dire-wolf", "Lupo feroce", "Dire Wolf", [347], [394, 395], {
    size: "large",
    type: "beast",
    alignment: "unaligned",
    ac: 14,
    init: 2,
    hp: [22, "3d10 + 6"],
    speed: { walk: 50 },
    abilities: [17, 15, 15, 3, 12, 7],
    skills: { perception: 5, stealth: 4 },
    senses: DV(60),
    pp: 15,
    languages: NO_LANGUAGES,
    cr: "1",
    xp: 200,
    pb: 2,
    tags: "wild-shape-form mount",
    traits: [packTactics(PACK_IT, PACK_EN)],
    actions: [
      atk(
        "bite",
        "Morso",
        "Bite",
        "melee",
        5,
        { reach: 5 },
        "8 1d10+3 piercing",
        "Un bersaglio di taglia Grande o inferiore cade prono.",
        "A Large or smaller target has the Prone condition.",
      ),
    ],
    summary: text(
      "Lupo enorme, a volte cavalcatura dei goblinoidi.",
      "Huge wolf, sometimes a goblinoid mount.",
    ),
  }),
  mon("ghoul", "Ghoul", "Ghoul", [288], [336, 337], {
    size: "medium",
    type: "undead",
    alignment: "ce",
    ac: 12,
    init: 2,
    hp: [22, "5d8"],
    speed: { walk: 30 },
    abilities: [13, 15, 10, 7, 10, 6],
    immune: "poison",
    conditionImmune: "charmed exhaustion poisoned",
    senses: DV(60),
    pp: 10,
    languages: COMMON,
    cr: "1",
    xp: 200,
    pb: 2,
    actions: [
      multi("Due attacchi Morso.", "Two Bite attacks."),
      atk("bite", "Morso", "Bite", "melee", 4, { reach: 5 }, "5 1d6+2 piercing, 3 1d6 necrotic"),
      atk(
        "claw",
        "Artiglio",
        "Claw",
        "melee",
        4,
        { reach: 5 },
        "4 1d4+2 slashing",
        "Un bersaglio non morto e non elfo supera un TS su Costituzione CD 10 o è paralizzato fino alla fine del suo turno successivo.",
        "A target that isn't Undead or an elf passes a DC 10 Constitution save or is Paralyzed until the end of its next turn.",
      ),
    ],
    summary: text(
      "Divoratore di cadaveri il cui artiglio paralizza.",
      "Corpse-eater whose claws paralyze.",
    ),
  }),
  mon("giant-spider", "Ragno gigante", "Giant Spider", [353, 354], [399], {
    size: "large",
    type: "beast",
    alignment: "unaligned",
    ac: 14,
    init: 3,
    hp: [26, "4d10 + 4"],
    speed: { walk: 30, climb: 30 },
    abilities: [14, 16, 12, 2, 11, 4],
    skills: { perception: 4, stealth: 7 },
    senses: DV(60),
    pp: 14,
    languages: NO_LANGUAGES,
    cr: "1",
    xp: 200,
    pb: 2,
    traits: [
      special(
        "spider-climb",
        "Movimenti del ragno",
        "Spider Climb",
        "Scala superfici difficili e soffitti senza prove.",
        "Climbs difficult surfaces and ceilings without checks.",
      ),
      special(
        "web-walker",
        "Andatura sulla ragnatela",
        "Web Walker",
        "Ignora le restrizioni delle ragnatele e sente chi le tocca.",
        "Ignores web movement restrictions and senses anything touching its web.",
      ),
    ],
    actions: [
      atk("bite", "Morso", "Bite", "melee", 5, { reach: 5 }, "7 1d8+3 piercing, 7 2d6 poison"),
      save(
        "web",
        "Ragnatela",
        "Web",
        "dex",
        13,
        null,
        { recharge: "5-6" },
        "Ricarica 5–6. Una creatura entro 18 m: TS su Destrezza CD 13 o trattenuta finché la ragnatela (CA 10, 5 PF) non viene distrutta.",
        "Recharge 5–6. One creature within 60 ft: DC 13 Dexterity save or Restrained until the web (AC 10, 5 HP) is destroyed.",
      ),
    ],
    summary: text(
      "Ragno da agguato che immobilizza con la tela.",
      "Ambush spider that pins prey with webbing.",
    ),
  }),
  mon("ogre", "Ogre", "Ogre", [312], [362], {
    size: "large",
    type: "giant",
    alignment: "ce",
    ac: 11,
    init: -1,
    hp: [68, "8d10 + 24"],
    speed: { walk: 40 },
    abilities: [19, 8, 16, 5, 7, 7],
    gear: ["greatclub", { itemId: itemId("javelin"), quantity: 3 }],
    senses: DV(60),
    pp: 8,
    languages: text("Comune, Gigante", "Common, Giant"),
    cr: "2",
    xp: 450,
    pb: 2,
    actions: [
      atk(
        "greatclub",
        "Randello pesante",
        "Greatclub",
        "melee",
        6,
        { reach: 5 },
        "13 2d8+4 bludgeoning",
      ),
      atk(
        "javelin",
        "Giavellotto",
        "Javelin",
        "both",
        6,
        { reach: 5, range: [30, 120] },
        "11 2d6+4 piercing",
      ),
    ],
    summary: text(
      "Bruto affamato e rissoso: un solo colpo può abbattere un personaggio di 1º livello.",
      "Hungry, brawling brute: one blow can fell a level 1 character.",
    ),
  }),
  mon("bandit-captain", "Capo dei banditi", "Bandit Captain", [261, 262], [297], {
    size: "medium small",
    type: "humanoid",
    alignment: "n",
    ac: 15,
    init: 3,
    hp: [52, "8d8 + 16"],
    speed: { walk: 30 },
    abilities: [15, 16, 14, 14, 11, 14],
    saves: { str: 4, dex: 5, wis: 2 },
    skills: { athletics: 4, deception: 4 },
    gear: ["pistol", "scimitar", "studded-leather-armor"],
    pp: 10,
    languages: text("Comune, Gergo ladresco", "Common, Thieves’ Cant"),
    cr: "2",
    xp: 450,
    pb: 2,
    tags: "npc outlaw leader",
    actions: [
      multi(
        "Due attacchi, con Scimitarra e Pistola in qualsiasi combinazione.",
        "Two attacks, using Scimitar and Pistol in any combination.",
      ),
      atk("scimitar", "Scimitarra", "Scimitar", "melee", 5, { reach: 5 }, "6 1d6+3 slashing"),
      atk("pistol", "Pistola", "Pistol", "ranged", 5, { range: [30, 90] }, "8 1d10+3 piercing"),
    ],
    reactions: [parry("il bandito")],
    summary: text(
      "Capobanda carismatico con pistola e scimitarra.",
      "Charismatic gang leader with pistol and scimitar.",
    ),
  }),
  mon("priest", "Sacerdote", "Priest", [316], [369, 370], {
    size: "medium small",
    type: "humanoid",
    typeTags: "cleric",
    alignment: "n",
    ac: 13,
    init: 0,
    hp: [38, "7d8 + 7"],
    speed: { walk: 30 },
    abilities: [16, 10, 12, 13, 16, 13],
    skills: { medicine: 7, perception: 5, religion: 5 },
    gear: ["chain-shirt", { name: text("Simbolo sacro", "Holy Symbol") }, "mace"],
    pp: 15,
    languages: COMMON_PLUS_ONE,
    cr: "2",
    xp: 450,
    pb: 2,
    tags: "npc healer",
    actions: [
      multi(
        "Due attacchi, con Mazza o Fiamma radiosa in qualsiasi combinazione.",
        "Two attacks, using Mace or Radiant Flame in any combination.",
      ),
      atk("mace", "Mazza", "Mace", "melee", 5, { reach: 5 }, "6 1d6+3 bludgeoning, 5 2d4 radiant"),
      atk(
        "radiant-flame",
        "Fiamma radiosa",
        "Radiant Flame",
        "ranged",
        5,
        { range: [60] },
        "11 2d10 radiant",
      ),
      special(
        "spellcasting",
        "Incantesimi",
        "Spellcasting",
        "Saggezza, CD 13. A volontà: Luce, Taumaturgia. 1/giorno: Guardiani spirituali.",
        "Wisdom, DC 13. At will: Light, Thaumaturgy. 1/day: Spirit Guardians.",
        {
          kind: "spellcasting",
          ability: "wis",
          saveDc: 13,
          spells: {
            atWill: [{ spellId: spellId("light") }, { name: text("Taumaturgia", "Thaumaturgy") }],
            perDay: { 1: spellList("spirit-guardians") },
          },
        },
      ),
    ],
    bonus: [
      special(
        "divine-aid",
        "Aiuto divino",
        "Divine Aid",
        "3/giorno: lancia Benedizione, Dissolvi magie, Parola guaritrice o Ristorare inferiore.",
        "3/day: casts Bless, Dispel Magic, Healing Word or Lesser Restoration.",
        {
          uses: { perDay: 3 },
          spells: spellList("bless dispel-magic healing-word lesser-restoration"),
        },
      ),
    ],
    summary: text("Guida religiosa che combatte e cura.", "Religious leader who fights and heals."),
  }),
  mon("owlbear", "Orsogufo", "Owlbear", [313], [363], {
    size: "large",
    type: "monstrosity",
    alignment: "unaligned",
    ac: 13,
    init: 1,
    hp: [59, "7d10 + 21"],
    speed: { walk: 40, climb: 40 },
    abilities: [20, 12, 17, 3, 12, 7],
    skills: { perception: 5 },
    senses: DV(60),
    pp: 15,
    languages: NO_LANGUAGES,
    cr: "3",
    xp: 700,
    pb: 2,
    actions: [
      multi("Due attacchi Squarcio.", "Two Rend attacks."),
      atk("rend", "Squarcio", "Rend", "melee", 7, { reach: 5 }, "14 2d8+5 slashing"),
    ],
    summary: text(
      "Predatore feroce metà orso e metà gufo.",
      "Ferocious half-bear, half-owl predator.",
    ),
  }),
  mon("knight", "Cavaliere", "Knight", [302], [301], {
    size: "medium small",
    type: "humanoid",
    alignment: "n",
    ac: 18,
    init: 0,
    hp: [52, "8d8 + 16"],
    speed: { walk: 30 },
    abilities: [16, 11, 14, 11, 11, 15],
    saves: { con: 4, wis: 2 },
    conditionImmune: "frightened",
    gear: ["greatsword", "heavy-crossbow", "plate-armor"],
    pp: 10,
    languages: COMMON_PLUS_ONE,
    cr: "3",
    xp: 700,
    pb: 2,
    tags: "npc",
    actions: [
      multi(
        "Due attacchi, con Spadone o Balestra pesante in qualsiasi combinazione.",
        "Two attacks, using Greatsword or Heavy Crossbow in any combination.",
      ),
      atk(
        "greatsword",
        "Spadone",
        "Greatsword",
        "melee",
        5,
        { reach: 5 },
        "10 2d6+3 slashing, 4 1d8 radiant",
      ),
      atk(
        "heavy-crossbow",
        "Balestra pesante",
        "Heavy Crossbow",
        "ranged",
        2,
        { range: [100, 400] },
        "11 2d10 piercing, 4 1d8 radiant",
      ),
    ],
    reactions: [parry("il cavaliere")],
    summary: text(
      "Guerriero giurato in armatura a piastre, immune alla paura.",
      "Sworn warrior in plate armor, immune to fear.",
    ),
  }),
  mon("ghost", "Fantasma", "Ghost", [287, 288], [334], {
    size: "medium",
    type: "undead",
    alignment: "n",
    ac: 11,
    init: 1,
    hp: [45, "10d8"],
    speed: { walk: 5, fly: 40, hover: true },
    abilities: [7, 13, 10, 10, 12, 17],
    resist: "acid bludgeoning cold fire lightning piercing slashing thunder",
    immune: "necrotic poison",
    conditionImmune:
      "charmed exhaustion frightened grappled paralyzed petrified poisoned prone restrained",
    senses: DV(60),
    pp: 11,
    languages: COMMON_PLUS_ONE,
    cr: "4",
    xp: 1100,
    pb: 2,
    tags: "incorporeal",
    traits: [
      special(
        "ethereal-sight",
        "Vista eterea",
        "Ethereal Sight",
        "Dal Piano Materiale vede per 18 m nel Piano Etereo.",
        "Sees 60 ft into the Ethereal Plane from the Material Plane.",
      ),
      special(
        "incorporeal-movement",
        "Movimento incorporeo",
        "Incorporeal Movement",
        "Attraversa creature e oggetti come terreno difficile; subisce 5 (1d10) danni da forza se finisce il turno in un oggetto.",
        "Moves through creatures and objects as Difficult Terrain; takes 5 (1d10) Force damage if it ends its turn inside an object.",
      ),
    ],
    actions: [
      multi("Due attacchi Tocco inaridente.", "Two Withering Touch attacks."),
      atk(
        "withering-touch",
        "Tocco inaridente",
        "Withering Touch",
        "melee",
        5,
        { reach: 5 },
        "19 3d10+3 necrotic",
      ),
      special(
        "etherealness",
        "Forma eterea",
        "Etherealness",
        "Lancia Forma eterea senza componenti (Carisma) e passa al Confine Etereo.",
        "Casts Etherealness with no components (Charisma), shifting to the Border Ethereal.",
        { spells: [{ name: text("Forma eterea", "Etherealness") }] },
      ),
      save(
        "horrific-visage",
        "Volto terrificante",
        "Horrific Visage",
        "wis",
        13,
        "10 2d6+3 psychic",
        {},
        "Cono di 18 m, solo chi lo vede e non è non morto: TS su Saggezza CD 13 o 10 (2d6 + 3) psichici e spaventato fino al suo prossimo turno; se riesce è immune per 24 ore.",
        "60-ft Cone, creatures that see it and aren't Undead: DC 13 Wisdom save or 10 (2d6 + 3) Psychic and Frightened until its next turn; on a success, immune for 24 hours.",
      ),
      save(
        "possession",
        "Possessione",
        "Possession",
        "cha",
        13,
        null,
        { recharge: "6" },
        "Ricarica 6. Un umanoide entro 1,5 m: TS su Carisma CD 13 o il fantasma ne prende il controllo finché il corpo non scende a 0 PF o lo abbandona.",
        "Recharge 6. One Humanoid within 5 ft: DC 13 Charisma save or the ghost takes control of it until the body drops to 0 HP or it leaves.",
      ),
    ],
    summary: text(
      "Anima inquieta che terrorizza e possiede i vivi.",
      "Restless soul that terrifies and possesses the living.",
    ),
  }),
  mon("troll", "Troll", "Troll", [333], [378], {
    size: "large",
    type: "giant",
    alignment: "ce",
    ac: 15,
    init: 1,
    hp: [94, "9d10 + 45"],
    speed: { walk: 30 },
    abilities: [18, 13, 20, 7, 9, 7],
    skills: { perception: 5 },
    senses: DV(60),
    pp: 15,
    languages: GIANT,
    cr: "5",
    xp: 1800,
    pb: 3,
    traits: [
      special(
        "loathsome-limbs",
        "Arti abominevoli",
        "Loathsome Limbs",
        "4/giorno: se finisce un turno sanguinante dopo aver subito 15 o più danni taglienti, perde un arto che diventa un arto di troll autonomo.",
        "4/day: if it ends a turn Bloodied after taking 15+ Slashing damage, a limb is severed and becomes an independent Troll Limb.",
        { uses: { perDay: 4 } },
      ),
      special(
        "regeneration",
        "Rigenerazione",
        "Regeneration",
        "Recupera 15 PF all'inizio di ogni suo turno; acido o fuoco la bloccano per il turno successivo. Muore solo se inizia il turno a 0 PF senza rigenerarsi.",
        "Regains 15 HP at the start of each turn; Acid or Fire stops it on its next turn. It dies only if it starts a turn at 0 HP and doesn't regenerate.",
      ),
    ],
    actions: [
      multi("Tre attacchi Squarcio.", "Three Rend attacks."),
      atk("rend", "Squarcio", "Rend", "melee", 7, { reach: 10 }, "11 2d6+4 slashing"),
    ],
    bonus: [
      special(
        "charge",
        "Carica",
        "Charge",
        "Si muove fino a metà Velocità in linea retta verso un nemico che vede.",
        "Moves up to half its Speed straight toward an enemy it can see.",
      ),
    ],
    summary: text(
      "Gigante vorace che si rigenera; servono fuoco o acido.",
      "Ravenous regenerating giant; bring fire or acid.",
    ),
  }),
  mon("hill-giant", "Gigante delle colline", "Hill Giant", [298], [337, 338], {
    size: "huge",
    type: "giant",
    alignment: "ce",
    ac: 13,
    init: 2,
    hp: [105, "10d12 + 40"],
    speed: { walk: 40 },
    abilities: [21, 8, 19, 5, 9, 6],
    skills: { perception: 2 },
    pp: 12,
    languages: GIANT,
    cr: "5",
    xp: 1800,
    pb: 3,
    actions: [
      multi(
        "Due attacchi, con Tronco d'albero o Lancio di rifiuti in qualsiasi combinazione.",
        "Two attacks, using Tree Club or Trash Lob in any combination.",
      ),
      atk(
        "tree-club",
        "Tronco d'albero",
        "Tree Club",
        "melee",
        8,
        { reach: 10 },
        "18 3d8+5 bludgeoning",
        "Un bersaglio Grande o inferiore cade prono.",
        "A Large or smaller target has the Prone condition.",
      ),
      atk(
        "trash-lob",
        "Lancio di rifiuti",
        "Trash Lob",
        "ranged",
        8,
        { range: [60, 240] },
        "16 2d10+5 bludgeoning",
        "Il bersaglio è avvelenato fino alla fine del suo turno successivo.",
        "The target is Poisoned until the end of its next turn.",
      ),
    ],
    summary: text(
      "Gigante rozzo e ingordo che lancia rifiuti.",
      "Crude, gluttonous giant that hurls garbage.",
    ),
  }),
  mon("mage", "Mago", "Mage", [305], [350], {
    size: "medium small",
    type: "humanoid",
    typeTags: "wizard",
    alignment: "n",
    ac: 15,
    init: 2,
    hp: [81, "18d8"],
    speed: { walk: 30 },
    abilities: [9, 14, 11, 17, 12, 11],
    saves: { int: 6, wis: 4 },
    skills: { arcana: 6, history: 6, perception: 4 },
    gear: [{ name: text("Bacchetta", "Wand") }],
    pp: 14,
    languages: text("Comune più altre tre lingue", "Common plus three other languages"),
    cr: "6",
    xp: 2300,
    pb: 3,
    tags: "npc",
    actions: [
      multi("Tre attacchi Esplosione arcana.", "Three Arcane Burst attacks."),
      atk(
        "arcane-burst",
        "Esplosione arcana",
        "Arcane Burst",
        "both",
        6,
        { reach: 5, range: [120] },
        "16 3d8+3 force",
      ),
      special(
        "spellcasting",
        "Incantesimi",
        "Spellcasting",
        "Intelligenza, CD 14. A volontà: Individuazione del magico, Luce, Armatura magica, Mano magica, Prestidigitazione. 2/giorno: Palla di fuoco (4º livello), Invisibilità. 1/giorno: Cono di freddo, Volare.",
        "Intelligence, DC 14. At will: Detect Magic, Light, Mage Armor, Mage Hand, Prestidigitation. 2/day: Fireball (level 4), Invisibility. 1/day: Cone of Cold, Fly.",
        {
          kind: "spellcasting",
          ability: "int",
          saveDc: 14,
          spells: {
            atWill: spellList("detect-magic light mage-armor mage-hand prestidigitation"),
            perDay: { 2: spellList("fireball invisibility"), 1: spellList("cone-of-cold fly") },
          },
        },
      ),
    ],
    bonus: [
      special(
        "misty-step",
        "Passo velato",
        "Misty Step",
        "3/giorno: lancia Passo velato.",
        "3/day: casts Misty Step.",
        { uses: { perDay: 3 }, spells: spellList("misty-step") },
      ),
    ],
    reactions: [
      special(
        "protective-magic",
        "Magia di protezione",
        "Protective Magic",
        "3/giorno: lancia Controincantesimo o Scudo quando se ne verifica l'innesco.",
        "3/day: casts Counterspell or Shield in response to its trigger.",
        { kind: "reaction", uses: { perDay: 3 }, spells: spellList("counterspell shield") },
      ),
    ],
    summary: text(
      "Incantatore arcano esperto con palle di fuoco e difese magiche.",
      "Seasoned arcane caster with fireballs and magical defenses.",
    ),
  }),
  mon("stone-giant", "Gigante delle pietre", "Stone Giant", [330], [338], {
    size: "huge",
    type: "giant",
    alignment: "n",
    ac: 17,
    init: 5,
    hp: [126, "11d12 + 55"],
    speed: { walk: 40 },
    abilities: [23, 15, 20, 10, 12, 9],
    saves: { dex: 5, con: 8, wis: 4 },
    skills: { athletics: 12, perception: 4, stealth: 5 },
    senses: DV(60),
    pp: 14,
    languages: GIANT,
    cr: "7",
    xp: 2900,
    pb: 3,
    actions: [
      multi(
        "Due attacchi, con Randello di pietra o Macigno in qualsiasi combinazione.",
        "Two attacks, using Stone Club or Boulder in any combination.",
      ),
      atk(
        "stone-club",
        "Randello di pietra",
        "Stone Club",
        "melee",
        9,
        { reach: 15 },
        "22 3d10+6 bludgeoning",
      ),
      atk(
        "boulder",
        "Macigno",
        "Boulder",
        "ranged",
        9,
        { range: [60, 240] },
        "15 2d8+6 bludgeoning",
        "Un bersaglio Grande o inferiore cade prono.",
        "A Large or smaller target has the Prone condition.",
      ),
    ],
    reactions: [
      special(
        "deflect-missile",
        "Deviare proiettili",
        "Deflect Missile",
        "Ricarica 5–6. Quando un attacco a distanza lo colpisce riduce i danni di 11 (1d10 + 6); se li azzera, rilancia: TS su Destrezza CD 17 o 11 (1d10 + 6) danni da forza.",
        "Recharge 5–6. When hit by a ranged attack it reduces the damage by 11 (1d10 + 6); if reduced to 0, it redirects: DC 17 Dexterity save or 11 (1d10 + 6) Force damage.",
        { kind: "reaction", recharge: "5-6", damage: dmg("11 1d10+6 force") },
      ),
    ],
    summary: text(
      "Gigante solitario e artistico che scaglia macigni.",
      "Solitary, artistic giant who hurls boulders.",
    ),
  }),
  mon("young-green-dragon", "Drago verde giovane", "Young Green Dragon", [293, 294], [327], {
    size: "large",
    type: "dragon",
    typeTags: "chromatic",
    alignment: "le",
    ac: 18,
    init: 4,
    hp: [136, "16d10 + 48"],
    speed: { walk: 40, fly: 80, swim: 40 },
    abilities: [19, 12, 17, 16, 13, 15],
    saves: { dex: 4, wis: 4 },
    skills: { deception: 5, perception: 7, stealth: 4 },
    immune: "poison",
    conditionImmune: "poisoned",
    senses: { blindsight: 30, darkvision: 120 },
    pp: 17,
    languages: text("Comune, Draconico", "Common, Draconic"),
    cr: "8",
    xp: 3900,
    pb: 3,
    traits: [
      special(
        "amphibious",
        "Anfibio",
        "Amphibious",
        "Respira aria e acqua.",
        "Can breathe air and water.",
      ),
    ],
    actions: [
      multi("Tre attacchi Squarcio.", "Three Rend attacks."),
      atk("rend", "Squarcio", "Rend", "melee", 7, { reach: 10 }, "11 2d6+4 slashing, 7 2d6 poison"),
      save(
        "poison-breath",
        "Soffio di veleno",
        "Poison Breath",
        "con",
        14,
        "42 12d6 poison",
        { recharge: "5-6", halfOnSuccess: true },
        "Ricarica 5–6. Cono di 9 m: TS su Costituzione CD 14, 42 (12d6) danni da veleno, metà se riesce.",
        "Recharge 5–6. 30-ft Cone: DC 14 Constitution save, 42 (12d6) Poison damage, half on a success.",
      ),
    ],
    summary: text(
      "Drago astuto e manipolatore delle foreste, dal soffio velenoso.",
      "Cunning, manipulative forest dragon with a poison breath.",
    ),
  }),
];

// ---------------------------------------------------------------- rules glossary

const ruleId = (slug) => `srd2024:rule:${slug}`;
const GLOSSARY_ROWS = [
  // slug, it, en, tag, enPages, itPages, related, summary it, summary en
  [
    "attack",
    "Attacco",
    "Attack",
    "action",
    [177],
    [204],
    "unarmed-strike critical-hit",
    "Un tiro per colpire con un'arma o un colpo senz'armi; durante l'attacco puoi impugnare o riporre un'arma.",
    "One attack roll with a weapon or an Unarmed Strike; you can equip or unequip one weapon as part of it.",
  ],
  [
    "dash",
    "Scatto",
    "Dash",
    "action",
    [180],
    [214],
    "",
    "Ottieni movimento extra pari alla tua Velocità per il turno in corso.",
    "Gain extra movement equal to your Speed for the current turn.",
  ],
  [
    "disengage",
    "Disimpegno",
    "Disengage",
    "action",
    [181],
    [207],
    "opportunity-attacks",
    "Il tuo movimento non provoca attacchi di opportunità per il resto del turno.",
    "Your movement doesn't provoke Opportunity Attacks for the rest of the turn.",
  ],
  [
    "dodge",
    "Schivata",
    "Dodge",
    "action",
    [181],
    [215],
    "",
    "Fino al tuo prossimo turno gli attacchi contro di te hanno svantaggio se vedi chi attacca e hai vantaggio ai TS su Destrezza.",
    "Until your next turn, attacks against you have Disadvantage if you see the attacker, and you have Advantage on Dexterity saves.",
  ],
  [
    "help",
    "Aiuto",
    "Help",
    "action",
    [182, 183],
    [203],
    "advantage",
    "Dai vantaggio alla prossima prova di un alleato con una tua competenza, o al suo prossimo attacco contro un nemico entro 1,5 m da te.",
    "Give an ally Advantage on their next check with one of your proficiencies, or on their next attack against an enemy within 5 ft of you.",
  ],
  [
    "hide",
    "Nascondersi",
    "Hide",
    "action",
    [183],
    [210],
    "",
    "Prova di Destrezza (Furtività) CD 15 mentre sei oscurato o coperto e fuori vista: se riesci sei invisibile finché non vieni trovato o fai rumore, attacchi o lanci con componente verbale.",
    "DC 15 Dexterity (Stealth) check while obscured or behind cover and out of sight: on a success you're Invisible until found, noisy, attacking or casting a Verbal spell.",
  ],
  [
    "influence",
    "Influenza",
    "Influence",
    "action",
    [184],
    [208],
    "",
    "Esorti un mostro a fare qualcosa; il GM stabilisce se è ben disposto, maldisposto o esitante e se serve una prova.",
    "Urge a monster to do something; the GM decides whether it's willing, unwilling or hesitant and whether a check is needed.",
  ],
  [
    "magic",
    "Magia",
    "Magic",
    "action",
    [185],
    [209],
    "concentration",
    "Lanci un incantesimo con tempo di lancio di un'azione o usi un privilegio o un oggetto magico che la richiede.",
    "Cast a spell with a casting time of an action, or use a feature or magic item that requires this action.",
  ],
  [
    "ready",
    "Prepararsi",
    "Ready",
    "action",
    [186, 187],
    [211],
    "reaction",
    "Scegli un innesco percepibile e un'azione o un movimento; quando accade puoi usare la reazione per eseguirli.",
    "Choose a perceivable trigger and an action or a move; when it happens you can use your Reaction to do it.",
  ],
  [
    "search",
    "Ricerca",
    "Search",
    "action",
    [187],
    [212, 213],
    "passive-perception",
    "Prova di Saggezza per notare qualcosa di non evidente (Intuizione, Medicina, Percezione o Sopravvivenza).",
    "Wisdom check to discern something not obvious (Insight, Medicine, Perception or Survival).",
  ],
  [
    "study",
    "Studio",
    "Study",
    "action",
    [189],
    [216],
    "",
    "Prova di Intelligenza per ricordare o dedurre informazioni (Arcano, Storia, Indagare, Natura o Religione).",
    "Intelligence check to recall or work out information (Arcana, History, Investigation, Nature or Religion).",
  ],
  [
    "utilize",
    "Utilizzo",
    "Utilize",
    "action",
    [191],
    [218],
    "",
    "Usi un oggetto che richiede un'azione per funzionare.",
    "Use an object that requires an action to work.",
  ],
  [
    "advantage",
    "Vantaggio",
    "Advantage",
    null,
    [176],
    [218],
    "disadvantage d20-test",
    "Tira due d20 e tieni il più alto; più fonti non si sommano e vantaggio e svantaggio si annullano.",
    "Roll two d20s and keep the higher; multiple sources don't stack, and Advantage and Disadvantage cancel out.",
  ],
  [
    "disadvantage",
    "Svantaggio",
    "Disadvantage",
    null,
    [181],
    [217],
    "advantage d20-test",
    "Tira due d20 e tieni il più basso; si annulla con il vantaggio.",
    "Roll two d20s and keep the lower; it cancels out with Advantage.",
  ],
  [
    "d20-test",
    "Prova con D20",
    "D20 Test",
    null,
    [180],
    [212],
    "saving-throw",
    "Nome comune per prove di caratteristica, tiri per colpire e tiri salvezza.",
    "Umbrella term for ability checks, attack rolls and saving throws.",
  ],
  [
    "bloodied",
    "Sanguinante",
    "Bloodied",
    null,
    [177],
    [214],
    "",
    "Una creatura è sanguinante quando le resta metà dei PF o meno.",
    "A creature is Bloodied while it has half its Hit Points or fewer.",
  ],
  [
    "concentration",
    "Concentrazione",
    "Concentration",
    null,
    [179],
    [206],
    "",
    "Alcuni effetti durano solo finché ti concentri; se subisci danni fai un TS su Costituzione (CD 10 o metà danni, massimo 30).",
    "Some effects last only while you concentrate; taking damage calls for a Constitution save (DC 10 or half the damage, up to 30).",
  ],
  [
    "difficult-terrain",
    "Terreno difficile",
    "Difficult Terrain",
    null,
    [181],
    [217],
    "",
    "Ogni tratto di movimento costa il doppio; non è cumulativo.",
    "Every foot of movement costs 1 extra foot; it doesn't stack.",
  ],
  [
    "opportunity-attacks",
    "Attacchi di opportunità",
    "Opportunity Attacks",
    null,
    [185],
    [204],
    "reaction disengage",
    "Quando una creatura che vedi esce dalla tua portata, puoi usare la reazione per un attacco in mischia.",
    "When a creature you can see leaves your reach, you can use your Reaction for one melee attack.",
  ],
  [
    "bonus-action",
    "Azione bonus",
    "Bonus Action",
    null,
    [177],
    [205],
    "",
    "Azione speciale nello stesso turno dell'azione, solo se una regola la concede; al massimo una per turno.",
    "A special action on the same turn as your action, only when a rule grants one; at most one per turn.",
  ],
  [
    "reaction",
    "Reazione",
    "Reaction",
    null,
    [186],
    [212],
    "opportunity-attacks ready",
    "Azione speciale in risposta a un innesco, anche nel turno altrui; una sola fino all'inizio del tuo prossimo turno.",
    "A special action in response to a trigger, even on another creature's turn; one until the start of your next turn.",
  ],
  [
    "heroic-inspiration",
    "Ispirazione eroica",
    "Heroic Inspiration",
    null,
    [183],
    [209],
    "",
    "Spendila per ritirare un dado appena tirato e usare il nuovo risultato; non se ne possono avere due.",
    "Spend it to reroll a die right after rolling and use the new roll; you can't hold two.",
  ],
  [
    "proficiency",
    "Competenza",
    "Proficiency",
    null,
    [186],
    [206],
    "d20-test",
    "Aggiungi il bonus di competenza alle prove con d20 fatte con ciò in cui sei competente.",
    "Add your Proficiency Bonus to D20 Tests made with something you're proficient in.",
  ],
  [
    "cover",
    "Copertura",
    "Cover",
    null,
    [179],
    [206],
    "",
    "Mezza copertura +2, tre quarti +5 alla CA e ai TS su Destrezza; la copertura totale impedisce di essere bersagliati direttamente.",
    "Half Cover +2 and Three-Quarters Cover +5 to AC and Dexterity saves; Total Cover prevents direct targeting.",
  ],
  [
    "critical-hit",
    "Colpo critico",
    "Critical Hit",
    null,
    [179],
    [205],
    "attack",
    "Un 20 sul d20 del tiro per colpire colpisce sempre e fa tirare due volte i dadi dei danni.",
    "A 20 on the attack roll's d20 always hits and rolls the damage dice twice.",
  ],
  [
    "temporary-hit-points",
    "Punti ferita temporanei",
    "Temporary Hit Points",
    null,
    [190, 18],
    [212, 20],
    "",
    "Cuscinetto che si perde prima dei PF reali; non si somma ad altri PF temporanei e non è una cura.",
    "A buffer lost before real Hit Points; it doesn't stack with other Temporary HP and isn't healing.",
  ],
  [
    "resistance",
    "Resistenza",
    "Resistance",
    null,
    [187],
    [212],
    "vulnerability immunity",
    "I danni di quel tipo sono dimezzati (per difetto), una sola volta per istanza.",
    "Damage of that type is halved (round down), once per instance.",
  ],
  [
    "vulnerability",
    "Vulnerabilità",
    "Vulnerability",
    null,
    [191],
    [219],
    "resistance",
    "I danni di quel tipo sono raddoppiati, una sola volta per istanza.",
    "Damage of that type is doubled, once per instance.",
  ],
  [
    "immunity",
    "Immunità",
    "Immunity",
    null,
    [183],
    [208],
    "resistance",
    "Quel tipo di danno o quella condizione non ha alcun effetto.",
    "That damage type or condition doesn't affect you at all.",
  ],
  [
    "long-rest",
    "Riposo lungo",
    "Long Rest",
    null,
    [185],
    [213],
    "short-rest hit-point-dice",
    "Almeno 8 ore (6 di sonno): recuperi tutti i PF e i Dadi Vita e riduci l'indebolimento di 1; poi attendi 16 ore.",
    "At least 8 hours (6 asleep): regain all HP and Hit Point Dice and reduce Exhaustion by 1; then wait 16 hours.",
  ],
  [
    "short-rest",
    "Riposo breve",
    "Short Rest",
    null,
    [187],
    [213],
    "long-rest hit-point-dice",
    "1 ora di pausa: puoi spendere Dadi Vita per recuperare PF.",
    "1 hour of downtime: you can spend Hit Point Dice to regain HP.",
  ],
  [
    "initiative",
    "Iniziativa",
    "Initiative",
    null,
    [184],
    [208],
    "surprise",
    "Stabilisce l'ordine dei turni; il punteggio fisso è 10 + Destrezza (±5 con vantaggio o svantaggio).",
    "Sets the turn order; the static score is 10 + Dexterity (±5 with Advantage or Disadvantage).",
  ],
  [
    "surprise",
    "Sorpresa",
    "Surprise",
    null,
    [189],
    [216],
    "initiative",
    "Chi è colto alla sprovvista all'inizio del combattimento tira l'iniziativa con svantaggio.",
    "A creature caught unaware when combat starts has Disadvantage on its Initiative roll.",
  ],
  [
    "unarmed-strike",
    "Colpo senz'armi",
    "Unarmed Strike",
    null,
    [190],
    [205],
    "attack",
    "Colpo in mischia con il corpo: danni (1 + Forza, contundenti), afferrare o spingere.",
    "A melee blow with your body: damage (1 + Strength, Bludgeoning), grapple or shove.",
  ],
  [
    "darkvision",
    "Scurovisione",
    "Darkvision",
    null,
    [180],
    [215],
    "",
    "Entro la gittata vedi la luce fioca come intensa e l'oscurità come luce fioca, in scala di grigi.",
    "Within range you see Dim Light as Bright Light and Darkness as Dim Light, in shades of gray.",
  ],
  [
    "passive-perception",
    "Percezione passiva",
    "Passive Perception",
    null,
    [186],
    [211],
    "search",
    "10 + bonus alle prove di Saggezza (Percezione), ±5 con vantaggio o svantaggio.",
    "10 + your Wisdom (Perception) bonus, ±5 with Advantage or Disadvantage.",
  ],
  [
    "saving-throw",
    "Tiro salvezza",
    "Saving Throw",
    null,
    [187],
    [218],
    "d20-test",
    "Prova con d20 per evitare o resistere a una minaccia; puoi scegliere di fallirla.",
    "A D20 Test to avoid or resist a threat; you can choose to fail it.",
  ],
  [
    "hit-point-dice",
    "Dadi Vita",
    "Hit Point Dice",
    null,
    [183],
    [207],
    "short-rest long-rest",
    "Determinano i PF massimi e si spendono nei riposi brevi per recuperare PF.",
    "They set your HP maximum and are spent on Short Rests to regain HP.",
  ],
  [
    "emanation",
    "Emanazione",
    "Emanation",
    "area-of-effect",
    [181],
    [207],
    "",
    "Area che si estende in ogni direzione da una creatura o un oggetto e si muove con essa.",
    "An area that extends in every direction from a creature or object and moves with it.",
  ],
];
const GLOSSARY = GLOSSARY_ROWS.map(([slug, it, en, tag, enPages, itPages, related, sIt, sEn]) => ({
  id: ruleId(slug),
  kind: "rule",
  slug,
  name: text(it, en),
  // Headings as printed carry the tag, e.g. "Hide [Action]" / "Nascondersi [azione]".
  heading: tag
    ? text(`${it} [${LABELS.ruleTag[tag].it}]`, `${en} [${LABELS.ruleTag[tag].en}]`)
    : text(it, en),
  translation: OFFICIAL,
  tag,
  related: words(related).map(ruleId),
  summary: text(sIt, sEn),
  tags: ["rule", ...(tag ? [tag] : ["definition"])],
  source: srdSource(enPages, itPages),
  links: {},
  aliases: [],
}));

// Conditions: index entries only. conditions.mjs owns the mechanics; links point to it.
const CONDITION_ROWS = [
  [
    "blinded",
    "Accecato",
    "Blinded",
    177,
    202,
    "Non vede; gli attacchi contro di lei hanno vantaggio e i suoi hanno svantaggio.",
    "Can't see; attacks against it have Advantage and its attacks have Disadvantage.",
  ],
  [
    "charmed",
    "Affascinato",
    "Charmed",
    178,
    202,
    "Non può attaccare né danneggiare chi l'ha affascinata, che ha vantaggio nelle interazioni sociali con lei.",
    "Can't attack or harm the charmer, who has Advantage on social checks with it.",
  ],
  [
    "deafened",
    "Assordato",
    "Deafened",
    181,
    204,
    "Non sente e fallisce le prove che richiedono l'udito.",
    "Can't hear and fails checks that require hearing.",
  ],
  [
    "exhaustion",
    "Indebolimento",
    "Exhaustion",
    181,
    208,
    "Cumulativa: −2 alle prove con d20 e −1,5 m di Velocità per livello; al 6º livello si muore.",
    "Cumulative: −2 to D20 Tests and −5 ft Speed per level; death at level 6.",
  ],
  [
    "frightened",
    "Spaventato",
    "Frightened",
    182,
    216,
    "Svantaggio a prove e attacchi mentre vede la fonte; non può avvicinarsi a essa di sua volontà.",
    "Disadvantage on checks and attacks while the source is in sight; can't willingly move closer to it.",
  ],
  [
    "grappled",
    "Afferrato",
    "Grappled",
    182,
    203,
    "Velocità 0; svantaggio agli attacchi contro chiunque non sia chi afferra, che può trascinarla.",
    "Speed 0; Disadvantage on attacks against anyone but the grappler, who can drag it.",
  ],
  [
    "incapacitated",
    "Incapacitato",
    "Incapacitated",
    184,
    208,
    "Nessuna azione, azione bonus o reazione; perde la concentrazione, non parla e ha svantaggio all'iniziativa.",
    "No actions, Bonus Actions or Reactions; loses Concentration, can't speak and has Disadvantage on Initiative.",
  ],
  [
    "invisible",
    "Invisibile",
    "Invisible",
    184,
    209,
    "Vantaggio all'iniziativa e agli attacchi; gli attacchi contro di lei hanno svantaggio, salvo che venga vista.",
    "Advantage on Initiative and attacks; attacks against it have Disadvantage unless it can be seen.",
  ],
  [
    "paralyzed",
    "Paralizzato",
    "Paralyzed",
    186,
    210,
    "Incapacitata e con Velocità 0; fallisce i TS su Forza e Destrezza e i colpi da entro 1,5 m sono critici.",
    "Incapacitated with Speed 0; fails Strength and Dexterity saves, and hits from within 5 ft are Critical Hits.",
  ],
  [
    "petrified",
    "Pietrificato",
    "Petrified",
    186,
    211,
    "Trasformata in sostanza inerte: incapacitata, resistente a tutti i danni e immune al veleno.",
    "Turned into inert substance: Incapacitated, Resistance to all damage and immune to poison.",
  ],
  [
    "poisoned",
    "Avvelenato",
    "Poisoned",
    186,
    204,
    "Svantaggio ai tiri per colpire e alle prove di caratteristica.",
    "Disadvantage on attack rolls and ability checks.",
  ],
  [
    "prone",
    "Prono",
    "Prone",
    186,
    212,
    "Striscia o si rialza con metà movimento; svantaggio ai suoi attacchi, vantaggio per chi attacca da vicino.",
    "Crawls or stands using half its movement; Disadvantage on its attacks, Advantage for nearby attackers.",
  ],
  [
    "restrained",
    "Trattenuto",
    "Restrained",
    187,
    218,
    "Velocità 0, svantaggio ai suoi attacchi e ai TS su Destrezza; gli attacchi contro di lei hanno vantaggio.",
    "Speed 0, Disadvantage on its attacks and Dexterity saves; attacks against it have Advantage.",
  ],
  [
    "stunned",
    "Stordito",
    "Stunned",
    189,
    216,
    "Incapacitata, fallisce i TS su Forza e Destrezza; gli attacchi contro di lei hanno vantaggio.",
    "Incapacitated, fails Strength and Dexterity saves; attacks against it have Advantage.",
  ],
  [
    "unconscious",
    "Privo di sensi",
    "Unconscious",
    191,
    212,
    "Incapacitata e prona, lascia cadere ciò che tiene e fallisce i TS su Forza e Destrezza; i colpi da vicino sono critici.",
    "Incapacitated and Prone, drops what it holds and fails Strength and Dexterity saves; nearby hits are Critical Hits.",
  ],
];
const CONDITIONS = CONDITION_ROWS.map(([slug, it, en, enPage, itPage, sIt, sEn]) => ({
  id: `srd2024:condition:${slug}`,
  kind: "condition",
  slug,
  name: text(it, en),
  heading: text(`${it} [condizione]`, `${en} [Condition]`),
  translation: OFFICIAL,
  summary: text(sIt, sEn),
  tags: ["condition"],
  source: srdSource([enPage], [itPage]),
  links: { conditions: slug },
  aliases: [],
}));

// ---------------------------------------------------------------- catalog

export const SPELLS = deepFreeze(SPELL_DEFS);
export const CREATURES = deepFreeze(CREATURE_DEFS);
export const ITEMS = deepFreeze([...WEAPONS, ...ARMOR, ...GEAR, ...TOOLS, ...MAGIC_ITEMS]);
export const RULES_GLOSSARY = deepFreeze(GLOSSARY);
export const CONDITION_INDEX = deepFreeze(CONDITIONS);
export const ALL_ENTRIES = deepFreeze([
  ...SPELLS,
  ...CREATURES,
  ...ITEMS,
  ...RULES_GLOSSARY,
  ...CONDITION_INDEX,
]);

const BY_ID = new Map();
for (const entry of ALL_ENTRIES) {
  if (BY_ID.has(entry.id)) throw new Error(`Duplicate SRD sample id: ${entry.id}`);
  BY_ID.set(entry.id, entry);
}
for (const entry of ALL_ENTRIES) {
  for (const alias of entry.aliases) {
    if (BY_ID.has(alias)) throw new Error(`Alias collides with an id: ${alias}`);
    BY_ID.set(alias, entry);
  }
}

export function getById(id) {
  return BY_ID.get(id);
}
// What each weapon property and mastery does, in short (SRD 5.2.1 "Weapons", EN 89–90 /
// IT 101–103): the sheet's property chips and the mastery explanation (PG-37).
export const WEAPON_PROPERTY_RULES = deepFreeze({
  ammunition: text(
    "Ogni attacco usa una munizione, estratta come parte dell’attacco; dopo lo scontro recuperi metà delle munizioni usate.",
    "Each attack uses one piece of ammunition, drawn as part of the attack; after the fight you recover half of what you used.",
  ),
  finesse: text(
    "Per il tiro per colpire e i danni usi Forza o Destrezza, a tua scelta (la stessa per entrambi).",
    "Use your choice of Strength or Dexterity for the attack and damage rolls (the same for both).",
  ),
  heavy: text(
    "Svantaggio ai tiri per colpire se la tua Forza (mischia) o Destrezza (distanza) è inferiore a 13.",
    "Disadvantage on attack rolls if your Strength (melee) or Dexterity (ranged) is below 13.",
  ),
  light: text(
    "Dopo un attacco con un’arma leggera nell’azione Attacco, puoi attaccare con un’altra arma leggera come azione bonus, senza sommare ai danni un modificatore positivo.",
    "After attacking with a Light weapon as part of the Attack action, you can attack with a different Light weapon as a Bonus Action, without adding a positive ability modifier to its damage.",
  ),
  loading: text(
    "Spari una sola munizione per azione, azione bonus o reazione, qualunque sia il numero dei tuoi attacchi.",
    "You fire only one piece of ammunition per action, Bonus Action or Reaction, whatever your number of attacks.",
  ),
  range: text(
    "Due gittate: oltre la normale hai svantaggio, oltre la lunga non puoi attaccare.",
    "Two ranges: beyond the normal one you have Disadvantage, beyond the long one you can’t attack.",
  ),
  reach: text(
    "Aggiunge 1,5 m alla tua portata, anche per gli attacchi di opportunità.",
    "Adds 5 feet to your reach, Opportunity Attacks included.",
  ),
  thrown: text(
    "Puoi lanciarla per un attacco a distanza con lo stesso modificatore della mischia; estrarla fa parte dell’attacco.",
    "You can throw it for a ranged attack with the same modifier as a melee attack; drawing it is part of the attack.",
  ),
  "two-handed": text(
    "Serve impugnarla con due mani per attaccare.",
    "It requires two hands when you attack with it.",
  ),
  versatile: text(
    "Si usa a una o due mani; a due mani usa il dado di danno indicato.",
    "Usable with one or two hands; two-handed it uses the listed damage die.",
  ),
});
export const MASTERY_RULES = deepFreeze({
  cleave: text(
    "Se colpisci, puoi fare un altro attacco con la stessa arma contro una seconda creatura entro 1,5 m dalla prima e alla tua portata, senza sommare ai danni un modificatore positivo. Una volta per turno.",
    "If you hit, you can make another attack with the same weapon against a second creature within 5 feet of the first and within your reach, without adding a positive ability modifier to its damage. Once per turn.",
  ),
  graze: text(
    "Se manchi, la creatura subisce comunque danni pari al modificatore di caratteristica usato per l’attacco (dello stesso tipo).",
    "If you miss, the creature still takes damage equal to the ability modifier you used for the attack (of the same type).",
  ),
  nick: text(
    "L’attacco extra della proprietà Leggera fa parte dell’azione Attacco invece di richiedere l’azione bonus. Una volta per turno.",
    "The extra attack of the Light property is part of the Attack action instead of a Bonus Action. Once per turn.",
  ),
  push: text(
    "Se colpisci, puoi spingere la creatura, se Grande o più piccola, fino a 3 m lontano da te in linea retta.",
    "If you hit, you can push the creature, if Large or smaller, up to 10 feet straight away from you.",
  ),
  sap: text(
    "Se colpisci, la creatura ha svantaggio al suo prossimo tiro per colpire prima dell’inizio del tuo prossimo turno.",
    "If you hit, the creature has Disadvantage on its next attack roll before the start of your next turn.",
  ),
  slow: text(
    "Se colpisci e infliggi danni, la Velocità della creatura cala di 3 m fino all’inizio del tuo prossimo turno (non si somma con sé stessa).",
    "If you hit and deal damage, the creature’s Speed drops by 10 feet until the start of your next turn (it doesn’t stack).",
  ),
  topple: text(
    "Se colpisci, la creatura supera un TS su Costituzione (CD 8 + modificatore usato + competenza) o cade Prona.",
    "If you hit, the creature makes a Constitution save (DC 8 + the modifier you used + Proficiency Bonus) or has the Prone condition.",
  ),
  vex: text(
    "Se colpisci e infliggi danni, hai vantaggio al tuo prossimo tiro per colpire contro quella creatura prima della fine del tuo prossimo turno.",
    "If you hit and deal damage, you have Advantage on your next attack roll against that creature before the end of your next turn.",
  ),
});
// PG-41: the class and species features the sample sheets carry, by definition id: the
// official Italian name where the app already uses it (else the English name, marked), a
// short summary of the SRD 5.2.1 text. The page comes from each feature's own source.
const feature = (it, en, sumIt, sumEn, itVerified = true) =>
  deepFreeze({ name: text(it, en), itVerified, summary: text(sumIt, sumEn) });
export const FEATURE_TEXTS = deepFreeze({
  "wizard:spellcasting": feature(
    "Incantesimi",
    "Spellcasting",
    "Prepari e lanci incantesimi da mago con l’Intelligenza; il libro degli incantesimi raccoglie quelli che conosci.",
    "You prepare and cast wizard spells with Intelligence; your spellbook holds the spells you know.",
  ),
  "wizard:ritual-adept": feature(
    "Adepto dei rituali",
    "Ritual Adept",
    "Puoi lanciare come rituale ogni incantesimo con l’etichetta Rituale presente nel tuo libro, anche se non è preparato, leggendolo dal libro.",
    "You can cast any spell with the Ritual tag in your spellbook as a Ritual, even if it isn’t prepared, reading it from the book.",
  ),
  "wizard:arcane-recovery": feature(
    "Recupero arcano",
    "Arcane Recovery",
    "Una volta per riposo lungo, finito un riposo breve recuperi slot incantesimo spesi di livello totale fino a metà del tuo livello da mago (per eccesso), nessuno di livello 6 o più.",
    "Once per Long Rest, when you finish a Short Rest you regain expended spell slots with a combined level up to half your wizard level (round up), none of level 6 or higher.",
  ),
  "fighter:second-wind": feature(
    "Recuperare energie",
    "Second Wind",
    "Azione bonus: recuperi 1d10 + il tuo livello da guerriero in punti ferita. Un uso torna con un riposo breve, tutti con un riposo lungo.",
    "Bonus Action: you regain 1d10 + your fighter level in Hit Points. You regain one use on a Short Rest and all uses on a Long Rest.",
  ),
  "druid:wild-shape": feature(
    "Forma selvatica",
    "Wild Shape",
    "Azione bonus: assumi la forma di una bestia che conosci; torni con un’azione bonus, a 0 PF o allo scadere del tempo.",
    "Bonus Action: you shape-shift into a Beast form you know; you return as a Bonus Action, at 0 Hit Points or when the time ends.",
  ),
  "elf:darkvision": feature(
    "Scurovisione",
    "Darkvision",
    "Entro 18 m vedi nella penombra come in luce intensa e nell’oscurità come in penombra, solo in sfumature di grigio.",
    "Within 60 feet you see in Dim Light as if it were Bright Light and in Darkness as if it were Dim Light, only in shades of gray.",
  ),
  "elf:elven-lineage": feature(
    "Retaggio elfico",
    "Elven Lineage",
    "Il retaggio scelto (drow, alto elfo o elfo silvano) dà un beneficio e trucchetti o incantesimi via via che sali di livello.",
    "Your chosen lineage (drow, high elf or wood elf) grants a benefit and cantrips or spells as you gain levels.",
  ),
  "elf:fey-ancestry": feature(
    "Fey Ancestry",
    "Fey Ancestry",
    "Hai vantaggio ai tiri salvezza per evitare o terminare la condizione Affascinato.",
    "You have Advantage on saving throws you make to avoid or end the Charmed condition.",
    false,
  ),
  "elf:keen-senses": feature(
    "Sensi acuti",
    "Keen Senses",
    "Hai competenza in Intuizione, Percezione o Sopravvivenza, a tua scelta.",
    "You have proficiency in the Insight, Perception or Survival skill, your choice.",
  ),
  "elf:trance": feature(
    "Trance",
    "Trance",
    "Non dormi e la magia non può farti addormentare; completi un riposo lungo in 4 ore di meditazione restando cosciente.",
    "You don’t need to sleep and magic can’t put you to sleep; you finish a Long Rest in 4 hours of trancelike meditation, staying conscious.",
  ),
});
/** The SRD weapon behind an inventory row or an attack id ("quarterstaff"), or null. */
export function weaponDefinition(row = null, attackId = "") {
  const byRow = row?.srdId ? BY_ID.get(row.srdId) : null;
  if (byRow?.weapon) return byRow;
  const bySlug = attackId ? BY_ID.get("srd2024:item:" + attackId) : null;
  return bySlug?.weapon ? bySlug : null;
}
/**
 * The structured bonuses an actor's worn items give now (D&D Beyond's "AC components"):
 * an item counts while equipped, carried (not on the ground or out of reach in a form) and,
 * when it requires attunement, attuned. A row's own `modifiers` (a customised copy) win over
 * its SRD definition. Returns [{rowId, name, target, value, source}] where target is "ac" or
 * "saves" (every roll of the wearer) or, BI-24, "attack" or "damage" (only the rolls made
 * with that row's weapon). With `library` (the state's Library) a forged homebrew weapon
 * (FG Forge, dnd5e Enchant) adds its revision's attack and damage bonus the same way.
 */
export function activeItemModifiers(actor, library = null) {
  const out = [];
  for (const row of actor?.inventory ?? []) {
    if (!row || !row.equipped || !(row.quantity > 0) || row.location === "ground") continue;
    if (row.availableInForm === false || row.unidentified) continue;
    const def = row.srdId ? BY_ID.get(row.srdId) : null;
    const needsAttunement = row.attunement?.required === true || Boolean(def?.magic?.attunement);
    if (needsAttunement && row.attuned !== true) continue;
    const list = Array.isArray(row.modifiers)
      ? [...row.modifiers]
      : [...(def?.magic?.modifiers ?? [])];
    const forged = library ? forgedWeapon(row, library) : null;
    if (forged && !list.some((mod) => ["attack", "damage"].includes(mod?.target)))
      list.push(
        { target: "attack", value: forged.weapon.attackBonus },
        { target: "damage", value: forged.weapon.damageBonus },
      );
    for (const mod of list)
      if (ITEM_TARGETS.includes(mod?.target) && Number.isFinite(mod.value) && mod.value)
        out.push({
          rowId: row.id,
          name: row.name ?? def?.name ?? "",
          target: mod.target,
          value: mod.value,
          source: def?.source ?? (forged ? (row.source ?? null) : null),
        });
  }
  return out;
}
const ITEM_TARGETS = Object.freeze(["ac", "saves", "attack", "damage"]);
// The forged weapon behind a homebrew inventory copy: its revision's structured item in the
// Library (the Forge writes the base weapon's id, damage, properties and +N bonuses there).
function forgedWeapon(row, library) {
  const ref = row?.homebrewRef;
  if (!ref || !Array.isArray(library)) return null;
  const content = library.find((entry) => entry?.id === ref.contentId);
  const revision = content?.revisions?.find((entry) => entry?.id === ref.revisionId);
  const item = revision?.data?.structured?.item;
  return item?.weapon && typeof item.weapon === "object" ? item : null;
}
/**
 * BI-24 (dnd5e: each weapon item carries its attack): the weapon an inventory row carries, or
 * null. An SRD row reads its catalogue entry (srdId, or the weaponType slug); a forged
 * homebrew copy reads its revision's weapon over the SRD base weapon it was forged from.
 * Returns {slug, weapon: {category, type, damage, versatile, properties, mastery, range,
 * ammunition}, source}. The forge's +N is read by activeItemModifiers with the Library.
 */
export function rowWeapon(row, library = null) {
  if (!row) return null;
  const forged = forgedWeapon(row, library);
  if (forged) {
    const base = forged.baseId ? BY_ID.get(forged.baseId) : null;
    const w = forged.weapon;
    if (!/^\d+d\d+$/.test(String(w.damage?.dice ?? ""))) return null;
    return {
      slug: base?.slug ?? null,
      weapon: {
        category: base?.weapon?.category ?? "simple",
        type: base?.weapon?.type ?? "melee",
        damage: { dice: w.damage.dice, type: w.damage.type ?? base?.weapon?.damage?.type },
        versatile: w.versatile || base?.weapon?.versatile || null,
        properties: [...(Array.isArray(w.properties) ? w.properties : [])],
        mastery: w.mastery ?? base?.weapon?.mastery ?? null,
        range: base?.weapon?.range ?? null,
        ammunition: base?.weapon?.ammunition ?? null,
      },
      source: row.source ?? null,
    };
  }
  const def = weaponDefinition(row, row.weaponType ?? "");
  return def ? { slug: def.slug, weapon: def.weapon, source: def.source } : null;
}
export function translationStatus(entry) {
  return entry?.name?.it ? (entry.translation?.it ?? "official") : "missing";
}

// Case- and accent-insensitive normalisation for search.
export function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’`]/g, "'")
    .toLowerCase()
    .trim();
}
const KIND_ORDER = { spell: 0, creature: 1, item: 2, rule: 3, condition: 4 };
const ITEM_ORDER = { weapon: 0, armor: 1, gear: 2, tool: 3, "magic-item": 4 };
const RARITY_ORDER = ["common", "uncommon", "rare", "very-rare", "legendary", "artifact"];

function haystack(entry, includeSummary) {
  const parts = [
    entry.name.it,
    entry.name.en,
    ...(entry.altNames?.it ?? []),
    ...(entry.altNames?.en ?? []),
  ];
  if (includeSummary) parts.push(entry.summary.it, entry.summary.en);
  return normalizeSearchText(parts.join(" \u0001 "));
}
const entryRarities = (entry) =>
  entry.magic
    ? entry.magic.variants
      ? entry.magic.variants.map((v) => v.rarity)
      : [entry.magic.rarity]
    : [];
const inRange = (value, min, max) =>
  value != null && (min == null || value >= min) && (max == null || value <= max);

// Filters combine with AND. `text` matches names (and summaries when includeSummary).
// level/minLevel/maxLevel/classId/school -> spells; cr/minCr/maxCr/type/size -> creatures;
// category/rarity/attunement -> items. Unknown filter keys throw to surface typos.
const FILTER_KEYS = new Set(
  words(
    "text kind kinds tags level minLevel maxLevel classId school cr minCr maxCr type size category rarity attunement includeSummary lang",
  ),
);
export function searchCatalog(filters = {}) {
  for (const key of Object.keys(filters)) {
    if (!FILTER_KEYS.has(key)) throw new Error(`Unknown search filter: ${key}`);
  }
  const f = filters;
  const needle = normalizeSearchText(f.text);
  const kinds = f.kinds ?? (f.kind ? [f.kind] : null);
  const tags = f.tags ? (Array.isArray(f.tags) ? f.tags : words(f.tags)) : [];
  const exactCr = f.cr != null ? crToNumber(f.cr) : null;
  const minCr = f.minCr != null ? crToNumber(f.minCr) : null;
  const maxCr = f.maxCr != null ? crToNumber(f.maxCr) : null;
  const lang = f.lang === "en" ? "en" : "it";
  const results = ALL_ENTRIES.filter((e) => {
    if (kinds && !kinds.includes(e.kind)) return false;
    if (tags.some((t) => !e.tags.includes(t))) return false;
    if (needle && !haystack(e, f.includeSummary).includes(needle)) return false;
    if (f.level != null && e.level !== f.level) return false;
    if ((f.minLevel != null || f.maxLevel != null) && !inRange(e.level, f.minLevel, f.maxLevel))
      return false;
    if (f.classId && !e.classes?.includes(f.classId)) return false;
    if (f.school && e.school !== f.school) return false;
    if (exactCr != null && e.crValue !== exactCr) return false;
    if ((minCr != null || maxCr != null) && !inRange(e.crValue, minCr, maxCr)) return false;
    if (f.type && e.type !== f.type) return false;
    if (f.size && !e.size?.includes(f.size)) return false;
    if (f.category && e.category !== f.category) return false;
    if (f.rarity && !entryRarities(e).includes(f.rarity)) return false;
    if (f.attunement != null && (!e.magic || !!e.magic.attunement !== !!f.attunement)) return false;
    return true;
  });
  const secondary = (e) =>
    e.kind === "spell"
      ? e.level
      : e.kind === "creature"
        ? e.crValue
        : e.kind === "item"
          ? ITEM_ORDER[e.category] * 10 +
            Math.max(0, RARITY_ORDER.indexOf(entryRarities(e)[0] ?? ""))
          : 0;
  return results.sort(
    (a, b) =>
      KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
      secondary(a) - secondary(b) ||
      a.name[lang].localeCompare(b.name[lang], lang),
  );
}

export function getCatalogSummary() {
  return {
    spells: SPELLS.length,
    creatures: CREATURES.length,
    items: ITEMS.length,
    rules: RULES_GLOSSARY.length,
    conditions: CONDITION_INDEX.length,
    coins: COINS.length,
    revision: "5.2.1",
    edition: "2024",
  };
}
