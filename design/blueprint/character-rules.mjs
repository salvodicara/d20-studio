// Verified structural rules and a bounded, explicitly identified content catalogue.
// Reading a feature here never means its gameplay effect is automated.
const text = (it, en) => ({ it, en });
export const RULE_SOURCE = Object.freeze({
  kind: "srd",
  edition: "2024",
  revision: "5.2.1",
  sha256: "8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87",
  url: "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf",
});
export const ruleSource = (...pages) => ({ ...RULE_SOURCE, pages });
const IT_RULE_DOCUMENT = Object.freeze({
  url: "https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf",
  sha256: "a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718",
});
// SRD 5.2.1 Alert (EN 87 / IT 97, Origin feat): Initiative Proficiency — when you roll
// Initiative you add your Proficiency Bonus. Final review F13: the one derived bonus every
// surface reads (sheet, start dialog, Table), as D&D Beyond derives it once.
export function initiativeProficiency(actor) {
  const alert = (actor?.features ?? []).some(
    (f) => f?.definitionId === "alert" || f?.id === "alert" || /:alert$/.test(String(f?.id ?? "")),
  );
  if (!alert) return 0;
  const recorded = actor?.proficiencyBonus ?? actor?.combatProfile?.proficiencyBonus;
  if (Number.isInteger(recorded)) return recorded;
  const level = Math.max(1, Math.min(20, Number.isInteger(actor?.level) ? actor.level : 1));
  return 2 + Math.floor((level - 1) / 4);
}
// A player character dropping to 0 HP falls Unconscious and makes Death Saving Throws
// (SRD 2024 "Dropping to 0 Hit Points", EN 17–18 / IT 19–20). Every character the
// builder creates carries this explicit policy, so 0 HP never needs a reconciliation.
export const characterZeroHpPolicy = () => ({
  zeroHp: "death-saves",
  source: {
    ...ruleSource(17, 18),
    en: { url: RULE_SOURCE.url, sha256: RULE_SOURCE.sha256, pages: [17, 18] },
    it: { ...IT_RULE_DOCUMENT, pages: [19, 20] },
  },
});
export const ABILITY_IDS = ["str", "dex", "con", "int", "wis", "cha"];
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
export const POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
export const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000,
  195000, 225000, 265000, 305000, 355000,
];
export const abilities = [
  ["str", "Forza", "Strength"],
  ["dex", "Destrezza", "Dexterity"],
  ["con", "Costituzione", "Constitution"],
  ["int", "Intelligenza", "Intelligence"],
  ["wis", "Saggezza", "Wisdom"],
  ["cha", "Carisma", "Charisma"],
].map(([id, it, en]) => ({ id, name: text(it, en) }));
export const skills = [
  ["acrobatics", "Acrobazia", "Acrobatics", "dex"],
  ["animal-handling", "Addestrare Animali", "Animal Handling", "wis"],
  ["arcana", "Arcano", "Arcana", "int"],
  ["athletics", "Atletica", "Athletics", "str"],
  ["deception", "Inganno", "Deception", "cha"],
  ["history", "Storia", "History", "int"],
  ["insight", "Intuizione", "Insight", "wis"],
  ["intimidation", "Intimidire", "Intimidation", "cha"],
  ["investigation", "Indagare", "Investigation", "int"],
  ["medicine", "Medicina", "Medicine", "wis"],
  ["nature", "Natura", "Nature", "int"],
  ["perception", "Percezione", "Perception", "wis"],
  ["performance", "Intrattenere", "Performance", "cha"],
  ["persuasion", "Persuasione", "Persuasion", "cha"],
  ["religion", "Religione", "Religion", "int"],
  ["sleight-of-hand", "Rapidità di Mano", "Sleight of Hand", "dex"],
  ["stealth", "Furtività", "Stealth", "dex"],
  ["survival", "Sopravvivenza", "Survival", "wis"],
].map(([id, it, en, ability]) => ({ id, name: text(it, en), ability }));
const skillList = (value) => (value === "any" ? skills.map((s) => s.id) : value.split(" "));
const classRows = [
  [
    "barbarian",
    "Barbaro",
    "Barbarian",
    12,
    ["str"],
    ["str", "con"],
    2,
    "animal-handling athletics intimidation nature perception survival",
    "none",
    null,
    28,
    "berserker",
    "Berserker",
  ],
  [
    "bard",
    "Bardo",
    "Bard",
    8,
    ["cha"],
    ["dex", "cha"],
    3,
    "any",
    "full",
    "cha",
    31,
    "lore",
    "Collegio della Sapienza",
  ],
  [
    "cleric",
    "Chierico",
    "Cleric",
    8,
    ["wis"],
    ["wis", "cha"],
    2,
    "history insight medicine persuasion religion",
    "full",
    "wis",
    36,
    "life",
    "Dominio della Vita",
  ],
  [
    "druid",
    "Druido",
    "Druid",
    8,
    ["wis"],
    ["int", "wis"],
    2,
    "animal-handling arcana insight medicine nature perception religion survival",
    "full",
    "wis",
    41,
    "land",
    "Circolo della Terra",
  ],
  [
    "fighter",
    "Guerriero",
    "Fighter",
    10,
    ["str", "dex"],
    ["str", "con"],
    2,
    "acrobatics animal-handling athletics history insight intimidation persuasion perception survival",
    "none",
    null,
    47,
    "champion",
    "Campione",
  ],
  [
    "monk",
    "Monaco",
    "Monk",
    8,
    ["dex", "wis"],
    ["str", "dex"],
    2,
    "acrobatics athletics history insight religion stealth",
    "none",
    null,
    49,
    "open-hand",
    "Mano Aperta",
  ],
  [
    "paladin",
    "Paladino",
    "Paladin",
    10,
    ["str", "cha"],
    ["wis", "cha"],
    2,
    "athletics insight intimidation medicine persuasion religion",
    "half",
    "cha",
    53,
    "devotion",
    "Giuramento di Devozione",
  ],
  [
    "ranger",
    "Ranger",
    "Ranger",
    10,
    ["dex", "wis"],
    ["str", "dex"],
    3,
    "animal-handling athletics insight investigation nature perception stealth survival",
    "half",
    "wis",
    57,
    "hunter",
    "Cacciatore",
  ],
  [
    "rogue",
    "Ladro",
    "Rogue",
    8,
    ["dex"],
    ["dex", "int"],
    4,
    "acrobatics athletics deception insight intimidation investigation perception persuasion sleight-of-hand stealth",
    "none",
    null,
    61,
    "thief",
    "Furfante",
  ],
  [
    "sorcerer",
    "Stregone",
    "Sorcerer",
    6,
    ["cha"],
    ["con", "cha"],
    2,
    "arcana deception insight intimidation persuasion religion",
    "full",
    "cha",
    64,
    "draconic",
    "Stregoneria Draconica",
  ],
  [
    "warlock",
    "Warlock",
    "Warlock",
    8,
    ["cha"],
    ["wis", "cha"],
    2,
    "arcana deception history intimidation investigation nature religion",
    "pact",
    "cha",
    70,
    "fiend",
    "Immondo",
  ],
  [
    "wizard",
    "Mago",
    "Wizard",
    6,
    ["int"],
    ["int", "wis"],
    2,
    "arcana history insight investigation medicine nature religion",
    "full",
    "int",
    77,
    "evoker",
    "Invocatore",
  ],
];
const levelOneFeatures = {
  barbarian: ["Rage", "Unarmored Defense", "Weapon Mastery"],
  bard: ["Bardic Inspiration", "Spellcasting"],
  cleric: ["Spellcasting", "Divine Order"],
  druid: ["Spellcasting", "Druidic", "Primal Order"],
  fighter: ["Fighting Style", "Second Wind", "Weapon Mastery"],
  monk: ["Martial Arts", "Unarmored Defense"],
  paladin: ["Lay On Hands", "Spellcasting", "Weapon Mastery"],
  ranger: ["Spellcasting", "Favored Enemy", "Weapon Mastery"],
  rogue: ["Expertise", "Sneak Attack", "Thieves’ Cant", "Weapon Mastery"],
  sorcerer: ["Spellcasting", "Innate Sorcery"],
  warlock: ["Eldritch Invocations", "Pact Magic"],
  wizard: ["Spellcasting", "Ritual Adept", "Arcane Recovery"],
};
// SRD 5.2.1 «<Class> Features» table, printed on each class's first page: the base-class
// features gained after level 1 (dnd5e Advancement / BG3 Level Up list exactly these).
// Ability Score Improvement, Epic Boon and subclass levels are feat and subclass grants
// handled by requiredFeatureGrants; Wild Shape is kept by forms-profile. A feature whose
// uses grow keeps one record with `uses` [[fromLevel, max], …]; a name repeated at a later
// level (Metamagic 10, Expertise 9…) is its own record with that level in its id.
const laterFeatures = {
  barbarian: [
    [2, "Danger Sense"],
    [2, "Reckless Attack"],
    [3, "Primal Knowledge"],
    [5, "Extra Attack"],
    [5, "Fast Movement"],
    [7, "Feral Instinct"],
    [7, "Instinctive Pounce"],
    [9, "Brutal Strike"],
    [11, "Relentless Rage"],
    [13, "Improved Brutal Strike"],
    [15, "Persistent Rage"],
    [17, "Improved Brutal Strike"],
    [18, "Indomitable Might"],
    [20, "Primal Champion"],
  ],
  bard: [
    [2, "Expertise"],
    [2, "Jack of All Trades"],
    [5, "Font of Inspiration"],
    [7, "Countercharm"],
    [9, "Expertise"],
    [10, "Magical Secrets"],
    [18, "Superior Inspiration"],
    [20, "Words of Creation"],
  ],
  cleric: [
    [2, "Channel Divinity"],
    [5, "Sear Undead"],
    [7, "Blessed Strikes"],
    [10, "Divine Intervention"],
    [14, "Improved Blessed Strikes"],
    [20, "Greater Divine Intervention"],
  ],
  druid: [
    [2, "Wild Companion"],
    [5, "Wild Resurgence"],
    [7, "Elemental Fury"],
    [15, "Improved Elemental Fury"],
    [18, "Beast Spells"],
    [20, "Archdruid"],
  ],
  fighter: [
    [
      2,
      "Action Surge",
      [
        [2, 1],
        [17, 2],
      ],
    ],
    [2, "Tactical Mind"],
    [5, "Extra Attack"],
    [5, "Tactical Shift"],
    [
      9,
      "Indomitable",
      [
        [9, 1],
        [13, 2],
        [17, 3],
      ],
    ],
    [9, "Tactical Master"],
    [11, "Two Extra Attacks"],
    [13, "Studied Attacks"],
    [20, "Three Extra Attacks"],
  ],
  monk: [
    [2, "Monk’s Focus"],
    [2, "Unarmored Movement"],
    [2, "Uncanny Metabolism"],
    [3, "Deflect Attacks"],
    [4, "Slow Fall"],
    [5, "Extra Attack"],
    [5, "Stunning Strike"],
    [6, "Empowered Strikes"],
    [7, "Evasion"],
    [9, "Acrobatic Movement"],
    [10, "Heightened Focus"],
    [10, "Self-Restoration"],
    [13, "Deflect Energy"],
    [14, "Disciplined Survivor"],
    [15, "Perfect Focus"],
    [18, "Superior Defense"],
    [20, "Body and Mind"],
  ],
  paladin: [
    [2, "Fighting Style"],
    [2, "Paladin’s Smite"],
    [3, "Channel Divinity"],
    [5, "Extra Attack"],
    [5, "Faithful Steed"],
    [6, "Aura of Protection"],
    [9, "Abjure Foes"],
    [10, "Aura of Courage"],
    [11, "Radiant Strikes"],
    [14, "Restoring Touch"],
    [18, "Aura Expansion"],
  ],
  ranger: [
    [2, "Deft Explorer"],
    [2, "Fighting Style"],
    [5, "Extra Attack"],
    [6, "Roving"],
    [9, "Expertise"],
    [10, "Tireless"],
    [13, "Relentless Hunter"],
    [14, "Nature’s Veil"],
    [17, "Precise Hunter"],
    [18, "Feral Senses"],
    [20, "Foe Slayer"],
  ],
  rogue: [
    [2, "Cunning Action"],
    [3, "Steady Aim"],
    [5, "Cunning Strike"],
    [5, "Uncanny Dodge"],
    [6, "Expertise"],
    [7, "Evasion"],
    [7, "Reliable Talent"],
    [11, "Improved Cunning Strike"],
    [14, "Devious Strikes"],
    [15, "Slippery Mind"],
    [18, "Elusive"],
    [20, "Stroke of Luck"],
  ],
  sorcerer: [
    [2, "Font of Magic"],
    [2, "Metamagic"],
    [5, "Sorcerous Restoration"],
    [7, "Sorcery Incarnate"],
    [10, "Metamagic"],
    [17, "Metamagic"],
    [20, "Arcane Apotheosis"],
  ],
  warlock: [
    [2, "Magical Cunning"],
    [9, "Contact Patron"],
    [11, "Mystic Arcanum"],
    [13, "Mystic Arcanum"],
    [15, "Mystic Arcanum"],
    [17, "Mystic Arcanum"],
    [20, "Eldritch Master"],
  ],
  wizard: [
    [2, "Scholar"],
    [5, "Memorize Spell"],
    [18, "Spell Mastery"],
    [20, "Signature Spells"],
  ],
};
// Uses of level-1 features that the class table grows (Second Wind 2/3/4).
const levelOneUses = {
  "fighter:second-wind": [
    [1, 2],
    [4, 3],
    [10, 4],
  ],
};
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
// X-A2: the Italian names of the class-table features, as printed in the Italian SRD 5.2.1
// («Livello N: …» headings of each class chapter; e.g. Ritual Adept → Adepto dei rituali).
const FEATURE_NAMES_IT = Object.freeze({
  "Abjure Foes": "Abiurare nemici",
  "Acrobatic Movement": "Movimento acrobatico",
  "Action Surge": "Azione impetuosa",
  "Arcane Apotheosis": "Apoteosi arcana",
  "Arcane Recovery": "Recupero arcano",
  Archdruid: "Arcidruido",
  "Aura Expansion": "Ampliamento dell’aura",
  "Aura of Courage": "Aura di coraggio",
  "Aura of Protection": "Aura di protezione",
  "Bardic Inspiration": "Ispirazione bardica",
  "Beast Spells": "Incantesimi bestiali",
  "Blessed Strikes": "Colpi benedetti",
  "Body and Mind": "Corpo e mente",
  "Brutal Strike": "Colpo brutale",
  "Channel Divinity": "Incanalare divinità",
  "Contact Patron": "Contatta patrono",
  Countercharm: "Controfascino",
  "Cunning Action": "Azione scaltra",
  "Cunning Strike": "Colpo astuto",
  "Danger Sense": "Percezione del pericolo",
  "Deflect Attacks": "Devia attacchi",
  "Deflect Energy": "Deviare energia",
  "Deft Explorer": "Esploratore esperto",
  "Devious Strikes": "Colpi infidi",
  "Disciplined Survivor": "Esperto di sopravvivenza disciplinato",
  "Divine Intervention": "Intervento divino",
  "Divine Order": "Ordine divino",
  Druidic: "Druidico",
  "Eldritch Invocations": "Suppliche occulte",
  "Eldritch Master": "Maestro dell’occulto",
  "Elemental Fury": "Furia elementale",
  Elusive: "Inafferrabile",
  "Empowered Strikes": "Colpi potenziati",
  Evasion: "Elusione",
  Expertise: "Maestria",
  "Extra Attack": "Attacco extra",
  "Faithful Steed": "Fido destriero",
  "Fast Movement": "Movimento veloce",
  "Favored Enemy": "Nemico prescelto",
  "Feral Instinct": "Istinto ferino",
  "Feral Senses": "Sensi ferini",
  "Fighting Style": "Stile di combattimento",
  "Foe Slayer": "Sterminatore di nemici",
  "Font of Inspiration": "Fonte di ispirazione",
  "Font of Magic": "Fonte di magia",
  "Greater Divine Intervention": "Intervento divino superiore",
  "Heightened Focus": "Concentrazione superiore",
  "Improved Blessed Strikes": "Colpi benedetti migliorati",
  "Improved Brutal Strike": "Colpo brutale migliorato",
  "Improved Cunning Strike": "Colpo astuto migliorato",
  "Improved Elemental Fury": "Furia elementale migliorata",
  Indomitable: "Indomabile",
  "Indomitable Might": "Potenza indomabile",
  "Innate Sorcery": "Stregoneria innata",
  "Instinctive Pounce": "Balzo istintivo",
  "Jack of All Trades": "Factotum",
  "Lay On Hands": "Imposizione delle mani",
  "Magical Cunning": "Scaltrezza magica",
  "Magical Secrets": "Segreti magici",
  "Martial Arts": "Arti marziali",
  "Memorize Spell": "Memorizzare incantesimi",
  Metamagic: "Metamagia",
  "Monk’s Focus": "Concentrazione da monaco",
  "Mystic Arcanum": "Arcanum mistico",
  "Nature’s Veil": "Velo della natura",
  "Pact Magic": "Magia del patto",
  "Paladin’s Smite": "Punizione del paladino",
  "Perfect Focus": "Concentrazione perfetta",
  "Persistent Rage": "Ira persistente",
  "Precise Hunter": "Precisione del cacciatore",
  "Primal Champion": "Campione primordiale",
  "Primal Knowledge": "Conoscenza primordiale",
  "Primal Order": "Ordine primordiale",
  "Radiant Strikes": "Colpi radiosi",
  Rage: "Ira",
  "Reckless Attack": "Attacco irruento",
  "Relentless Hunter": "Cacciatore implacabile",
  "Relentless Rage": "Ira implacabile",
  "Reliable Talent": "Dote affidabile",
  "Restoring Touch": "Tocco rigenerante",
  "Ritual Adept": "Adepto dei rituali",
  Roving: "Girovago",
  Scholar: "Studioso",
  "Sear Undead": "Bruciare i non morti",
  "Second Wind": "Recuperare energie",
  "Self-Restoration": "Autorigenerazione",
  "Signature Spells": "Incantesimi personali",
  "Slippery Mind": "Mente sfuggente",
  "Slow Fall": "Caduta lenta",
  "Sneak Attack": "Attacco furtivo",
  "Sorcerous Restoration": "Ripristino stregonesco",
  "Sorcery Incarnate": "Stregoneria incarnata",
  "Spell Mastery": "Maestria negli incantesimi",
  Spellcasting: "Incantesimi",
  "Steady Aim": "Mira ferma",
  "Stroke of Luck": "Colpo di fortuna",
  "Studied Attacks": "Attacchi studiati",
  "Stunning Strike": "Colpo stordente",
  "Superior Defense": "Difesa superiore",
  "Superior Inspiration": "Ispirazione superiore",
  "Tactical Master": "Signore delle tattiche",
  "Tactical Mind": "Mente tattica",
  "Tactical Shift": "Spostamento tattico",
  "Thieves’ Cant": "Gergo ladresco",
  "Three Extra Attacks": "Tre attacchi extra",
  Tireless: "Instancabile",
  "Two Extra Attacks": "Due attacchi extra",
  "Unarmored Defense": "Difesa senza armatura",
  "Unarmored Movement": "Movimento senza armatura",
  "Uncanny Dodge": "Schivata prodigiosa",
  "Uncanny Metabolism": "Metabolismo straordinario",
  "Weapon Mastery": "Padronanza d’armi",
  "Wild Companion": "Compagno selvatico",
  "Wild Resurgence": "Rinascita selvatica",
  "Words of Creation": "Parole della creazione",
});
const classFeature = (page, level, name, uses, id) => ({
  id,
  name: text(FEATURE_NAMES_IT[name] ?? name, name),
  level,
  automation: "manual",
  ...(uses ? { uses: structuredClone(uses) } : {}),
  description: text(
    "Capacità registrata con la sua fonte; la risoluzione specifica resta manuale.",
    "Recorded feature with its source; its specific resolution remains manual.",
  ),
  source: ruleSource(page, page + 1),
});
/** Uses at `level` for a table feature with growing uses, or undefined. */
export const featureUsesAt = (feature, level) =>
  feature?.uses
    ? ([...feature.uses].reverse().find(([from]) => level >= from)?.[1] ?? 0)
    : undefined;
/** Every base-class feature of the class table up to `level` (dnd5e Advancement), each
 *  with its current maximum uses where the table grows them. */
export function classFeaturesAt(classId, level) {
  const c = classes.find((row) => row.id === classId);
  if (!c) return [];
  return [...c.features, ...(c.advancement ?? [])]
    .filter((f) => f.level <= level)
    .map((f) => {
      const row = structuredClone(f);
      if (row.uses) {
        row.max = featureUsesAt(row, level);
        row.catalogUses = true;
        delete row.uses;
      }
      return row;
    });
}
export const classes = classRows.map(
  ([
    id,
    it,
    en,
    hitDie,
    primaryAbilities,
    savingThrows,
    skillCount,
    skillIds,
    caster,
    spellcastingAbility,
    page,
    subclassId,
    subclassIt,
  ]) => ({
    id,
    name: text(it, en),
    hitDie,
    primaryAbilities,
    primaryMode: id === "fighter" ? "any" : "all",
    savingThrows,
    skillCount,
    skills: skillList(skillIds),
    caster,
    spellcastingAbility,
    source: ruleSource(page),
    subclasses: [
      {
        id: subclassId,
        name: text(
          subclassIt,
          subclassId === "lore"
            ? "College of Lore"
            : subclassId === "land"
              ? "Circle of the Land"
              : subclassId === "life"
                ? "Life Domain"
                : subclassId === "open-hand"
                  ? "Warrior of the Open Hand"
                  : subclassId === "devotion"
                    ? "Oath of Devotion"
                    : subclassId === "draconic"
                      ? "Draconic Sorcery"
                      : subclassId === "fiend"
                        ? "Fiend"
                        : subclassId[0].toUpperCase() + subclassId.slice(1),
        ),
        source: ruleSource(page),
      },
    ],
    features: levelOneFeatures[id].map((name) =>
      classFeature(page, 1, name, levelOneUses[id + ":" + slug(name)], id + ":" + slug(name)),
    ),
    // Later levels of the class table; kept apart so level-1 readers stay unchanged.
    advancement: (laterFeatures[id] ?? []).map(([level, name, uses], index, all) =>
      classFeature(
        page,
        level,
        name,
        uses,
        id +
          ":" +
          slug(name) +
          (all.findIndex((row) => row[1] === name) < index || levelOneFeatures[id].includes(name)
            ? "-" + level
            : ""),
      ),
    ),
    coverage: text(
      "Struttura, PF, competenze iniziali e slot verificati. Catalogo privilegi iniziali e alcune scelte; livelli successivi e sottoclasse richiedono riconciliazione manuale, non sono completati dal nome.",
      "Verified structure, HP, initial proficiencies and slots. Initial feature catalogue and selected choices; later levels and subclasses need manual reconciliation, not completion from their names.",
    ),
  }),
);
export const backgrounds = [
  [
    "acolyte",
    "Accolito",
    "Acolyte",
    ["int", "wis", "cha"],
    ["insight", "religion"],
    "magic-initiate-cleric",
    "calligraphers-supplies",
  ],
  [
    "criminal",
    "Criminale",
    "Criminal",
    ["dex", "con", "int"],
    ["sleight-of-hand", "stealth"],
    "alert",
    "thieves-tools",
  ],
  [
    "sage",
    "Sapiente",
    "Sage",
    ["con", "int", "wis"],
    ["arcana", "history"],
    "magic-initiate-wizard",
    "calligraphers-supplies",
  ],
  [
    "soldier",
    "Soldato",
    "Soldier",
    ["str", "dex", "con"],
    ["athletics", "intimidation"],
    "savage-attacker",
    "gaming-set",
  ],
].map(([id, it, en, abilities, skills, featId, tool]) => ({
  id,
  name: text(it, en),
  abilities,
  skills,
  featId,
  tool,
  source: ruleSource(83),
}));
export const species = [
  [
    "dragonborn",
    "Dragonide",
    "Dragonborn",
    9,
    "medium",
    ["Draconic Ancestry", "Breath Weapon", "Damage Resistance", "Darkvision"],
    84,
  ],
  [
    "dwarf",
    "Nano",
    "Dwarf",
    9,
    "medium",
    ["Darkvision", "Dwarven Resilience", "Dwarven Toughness", "Stonecunning"],
    84,
  ],
  [
    "elf",
    "Elfo",
    "Elf",
    9,
    "medium",
    ["Darkvision", "Elven Lineage", "Fey Ancestry", "Keen Senses", "Trance"],
    84,
  ],
  ["gnome", "Gnomo", "Gnome", 9, "small", ["Darkvision", "Gnomish Cunning", "Gnomish Lineage"], 85],
  ["goliath", "Goliath", "Goliath", 10.5, "medium", ["Giant Ancestry", "Powerful Build"], 85],
  [
    "halfling",
    "Halfling",
    "Halfling",
    9,
    "small",
    ["Brave", "Halfling Nimbleness", "Luck", "Naturally Stealthy"],
    86,
  ],
  ["human", "Umano", "Human", 9, "choice", ["Resourceful", "Skillful", "Versatile"], 86],
  [
    "orc",
    "Orco",
    "Orc",
    9,
    "medium",
    ["Adrenaline Rush", "Darkvision", "Relentless Endurance"],
    86,
  ],
  [
    "tiefling",
    "Tiefling",
    "Tiefling",
    9,
    "choice",
    ["Darkvision", "Fiendish Legacy", "Otherworldly Presence"],
    86,
  ],
].map(([id, it, en, speed, size, names, page]) => ({
  id,
  name: text(it, en),
  speed,
  size,
  source: ruleSource(page),
  features: names.map((name) => ({
    id: id + ":" + name.toLowerCase().replaceAll(" ", "-"),
    name: text(name, name),
    automation: "manual",
    source: ruleSource(page),
  })),
  choices: [],
}));
const option = (id, it, en) => ({ id, name: text(it, en ?? it) });
species.find((s) => s.id === "human").choices = [
  {
    id: "size",
    name: text("Taglia", "Size"),
    options: [option("small", "Piccola", "Small"), option("medium", "Media", "Medium")],
  },
  { id: "skill", name: text("Abilità a scelta", "Chosen skill"), options: skills },
];
species.find((s) => s.id === "elf").choices = [
  {
    id: "lineage",
    name: text("Retaggio elfico", "Elven lineage"),
    options: [
      option("drow", "Drow"),
      option("high", "Elfo alto", "High Elf"),
      option("wood", "Elfo dei boschi", "Wood Elf"),
    ],
  },
  {
    id: "spellcastingAbility",
    name: text("Caratteristica di lancio", "Spellcasting ability"),
    options: abilities.filter((a) => ["int", "wis", "cha"].includes(a.id)),
  },
  {
    id: "skill",
    name: text("Sensi acuti", "Keen Senses"),
    options: skills.filter((s) => ["insight", "perception", "survival"].includes(s.id)),
  },
];
species.find((s) => s.id === "gnome").choices = [
  {
    id: "lineage",
    name: text("Retaggio gnomesco", "Gnomish lineage"),
    options: [option("forest", "Foresta", "Forest"), option("rock", "Rocce", "Rock")],
  },
  {
    id: "spellcastingAbility",
    name: text("Caratteristica di lancio", "Spellcasting ability"),
    options: abilities.filter((a) => ["int", "wis", "cha"].includes(a.id)),
  },
];
species.find((s) => s.id === "tiefling").choices = [
  {
    id: "size",
    name: text("Taglia", "Size"),
    options: [option("small", "Piccola", "Small"), option("medium", "Media", "Medium")],
  },
  {
    id: "legacy",
    name: text("Eredità immonda", "Fiendish legacy"),
    options: [
      option("abyssal", "Abissale", "Abyssal"),
      option("chthonic", "Ctonia", "Chthonic"),
      option("infernal", "Infernale", "Infernal"),
    ],
  },
  {
    id: "spellcastingAbility",
    name: text("Caratteristica di lancio", "Spellcasting ability"),
    options: abilities.filter((a) => ["int", "wis", "cha"].includes(a.id)),
  },
];
species.find((s) => s.id === "dragonborn").choices = [
  {
    id: "ancestry",
    name: text("Discendenza draconica", "Draconic ancestry"),
    options: [
      "black",
      "blue",
      "brass",
      "bronze",
      "copper",
      "gold",
      "green",
      "red",
      "silver",
      "white",
    ].map((id) => option(id, id)),
  },
];
species.find((s) => s.id === "goliath").choices = [
  {
    id: "ancestry",
    name: text("Discendenza gigante", "Giant ancestry"),
    options: ["cloud", "fire", "frost", "hill", "stone", "storm"].map((id) => option(id, id)),
  },
];
export const feats = [
  ["alert", "Allerta", "Alert", "origin", {}],
  ["savage-attacker", "Aggressore selvaggio", "Savage Attacker", "origin", {}],
  ["skilled", "Abile", "Skilled", "origin", {}],
  [
    "magic-initiate-cleric",
    "Iniziato alla magia (chierico)",
    "Magic Initiate (Cleric)",
    "origin",
    {},
  ],
  ["magic-initiate-druid", "Iniziato alla magia (druido)", "Magic Initiate (Druid)", "origin", {}],
  ["magic-initiate-wizard", "Iniziato alla magia (mago)", "Magic Initiate (Wizard)", "origin", {}],
  [
    "ability-score-improvement",
    "Aumento dei punteggi di caratteristica",
    "Ability Score Improvement",
    "general",
    { level: 4 },
  ],
  [
    "grappler",
    "Lottatore",
    "Grappler",
    "general",
    { level: 4, anyAbility: ["str", "dex"], minimum: 13 },
  ],
  ["archery", "Tiro", "Archery", "fighting-style", { feature: "fighting-style" }],
  ["defense", "Difesa", "Defense", "fighting-style", { feature: "fighting-style" }],
  [
    "great-weapon-fighting",
    "Combattere con armi possenti",
    "Great Weapon Fighting",
    "fighting-style",
    { feature: "fighting-style" },
  ],
  [
    "two-weapon-fighting",
    "Combattere con due armi",
    "Two-Weapon Fighting",
    "fighting-style",
    { feature: "fighting-style" },
  ],
].map(([id, it, en, category, requirements]) => ({
  id,
  name: text(it, en),
  category,
  requirements,
  source: ruleSource(category === "fighting-style" && id !== "archery" ? 88 : 87),
  automation: "manual",
}));
export const languages = [
  "common",
  "common-sign",
  "draconic",
  "dwarvish",
  "elvish",
  "giant",
  "gnomish",
  "goblin",
  "halfling",
  "orc",
].map((id) =>
  option(
    id,
    {
      common: "Comune",
      "common-sign": "Lingua dei Segni Comune",
      draconic: "Draconico",
      dwarvish: "Nanico",
      elvish: "Elfico",
      giant: "Gigante",
      gnomish: "Gnomesco",
      goblin: "Goblin",
      halfling: "Halfling",
      orc: "Orchesco",
    }[id],
    id.replaceAll("-", " "),
  ),
);
const FULL_SLOTS = [
  [],
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];
export function calculateSpellSlots(classLevels) {
  let casterLevel = 0,
    warlockLevel = 0,
    halfLevels = 0;
  for (const row of classLevels) {
    const c = classes.find((c) => c.id === row.classId);
    if (!c || !Number.isInteger(row.level) || row.level < 1 || row.level > 20)
      throw Error("Invalid class level");
    if (c.caster === "full") casterLevel += row.level;
    if (c.caster === "half") halfLevels += row.level;
    if (c.caster === "pact") warlockLevel += row.level;
  }
  casterLevel += Math.ceil(halfLevels / 2);
  if (casterLevel > 20 || warlockLevel > 20) throw Error("Invalid combined spellcasting level");
  const spellSlots = Object.fromEntries(
    FULL_SLOTS[casterLevel].map((max, index) => [index + 1, max]),
  );
  const pactSlots = warlockLevel
    ? {
        level: Math.min(5, Math.ceil(warlockLevel / 2)),
        max: warlockLevel === 1 ? 1 : warlockLevel < 11 ? 2 : warlockLevel < 17 ? 3 : 4,
        source: ruleSource(71),
      }
    : null;
  return { spellSlots, pactSlots, casterLevel, source: ruleSource(25, 26) };
}
// Explicit class table columns, indexed by class level minus one. Always-prepared
// feature spells and multiclass slot capacity are separate from these quotas.
const preparedFull = [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22];
const preparedHalf = [2, 3, 4, 5, 6, 6, 7, 7, 9, 9, 10, 10, 11, 11, 12, 12, 14, 14, 15, 15];
const cantripsTwo = [2, 2, 2, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
const cantripsThree = [3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
export const SPELL_PROGRESSION = {
  bard: { cantrips: cantripsTwo, prepared: preparedFull },
  cleric: { cantrips: cantripsThree, prepared: preparedFull },
  druid: { cantrips: cantripsTwo, prepared: preparedFull },
  sorcerer: {
    cantrips: [4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6],
    prepared: [2, 4, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 17, 18, 18, 19, 20, 21, 22],
  },
  wizard: {
    cantrips: cantripsThree,
    prepared: [4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 16, 17, 18, 19, 21, 22, 23, 24, 25],
  },
  paladin: { cantrips: Array(20).fill(0), prepared: preparedHalf },
  ranger: { cantrips: Array(20).fill(0), prepared: preparedHalf },
  warlock: {
    cantrips: cantripsTwo,
    prepared: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
  },
};
const spellRows = [
  ["fire-bolt", "Dardo di fuoco", "Fire Bolt", 0, ["wizard", "sorcerer"], 132, "fire-bolt"],
  ["mage-hand", "Mano magica", "Mage Hand", 0, ["bard", "sorcerer", "warlock", "wizard"], 145],
  ["light", "Luce", "Light", 0, ["bard", "cleric", "sorcerer", "wizard"], 144],
  ["ray-of-frost", "Raggio di gelo", "Ray of Frost", 0, ["sorcerer", "wizard"], 157],
  [
    "prestidigitation",
    "Prestidigitazione",
    "Prestidigitation",
    0,
    ["bard", "sorcerer", "warlock", "wizard"],
    154,
  ],
  ["guidance", "Guida", "Guidance", 0, ["cleric", "druid"], 138],
  ["sacred-flame", "Fiamma sacra", "Sacred Flame", 0, ["cleric"], 159],
  ["spare-the-dying", "Salvare i morenti", "Spare the Dying", 0, ["cleric", "druid"], 163],
  ["druidcraft", "Artificio druidico", "Druidcraft", 0, ["druid"], 126],
  ["produce-flame", "Produrre fiamma", "Produce Flame", 0, ["druid"], 156],
  ["vicious-mockery", "Beffa crudele", "Vicious Mockery", 0, ["bard"], 171],
  ["eldritch-blast", "Deflagrazione occulta", "Eldritch Blast", 0, ["warlock"], 127],
  [
    "burning-hands",
    "Mani brucianti",
    "Burning Hands",
    1,
    ["sorcerer", "wizard"],
    114,
    "burning-hands",
  ],
  [
    "magic-missile",
    "Dardo incantato",
    "Magic Missile",
    1,
    ["sorcerer", "wizard"],
    146,
    "magic-missile",
  ],
  ["shield", "Scudo", "Shield", 1, ["sorcerer", "wizard"], 161, "shield"],
  [
    "detect-magic",
    "Individuazione del magico",
    "Detect Magic",
    1,
    ["bard", "cleric", "druid", "paladin", "ranger", "sorcerer", "warlock", "wizard"],
    123,
  ],
  ["feather-fall", "Caduta morbida", "Feather Fall", 1, ["bard", "sorcerer", "wizard"], 130],
  ["mage-armor", "Armatura magica", "Mage Armor", 1, ["sorcerer", "wizard"], 145],
  ["sleep", "Sonno", "Sleep", 1, ["bard", "sorcerer", "wizard"], 163],
  ["thunderwave", "Onda tonante", "Thunderwave", 1, ["bard", "druid", "sorcerer", "wizard"], 169],
  [
    "cure-wounds",
    "Cura ferite",
    "Cure Wounds",
    1,
    ["bard", "cleric", "druid", "paladin", "ranger"],
    121,
  ],
  ["healing-word", "Parola guaritrice", "Healing Word", 1, ["bard", "cleric", "druid"], 139],
  ["bless", "Benedizione", "Bless", 1, ["cleric", "paladin"], 113],
  ["guiding-bolt", "Dardo tracciante", "Guiding Bolt", 1, ["cleric"], 138],
  ["sanctuary", "Santuario", "Sanctuary", 1, ["cleric"], 159],
  ["entangle", "Intralciare", "Entangle", 1, ["druid", "ranger"], 128],
  ["faerie-fire", "Luminescenza", "Faerie Fire", 1, ["bard", "druid"], 129],
  ["goodberry", "Bacche benefiche", "Goodberry", 1, ["druid", "ranger"], 137],
  [
    "speak-with-animals",
    "Parlare con gli animali",
    "Speak with Animals",
    1,
    ["bard", "druid", "ranger", "warlock"],
    164,
  ],
  ["hunters-mark", "Marchio del cacciatore", "Hunter’s Mark", 1, ["ranger"], 141],
  ["heroism", "Eroismo", "Heroism", 1, ["bard", "paladin"], 140],
  ["searing-smite", "Punizione incandescente", "Searing Smite", 1, ["paladin"], 160],
  ["hex", "Sortilegio", "Hex", 1, ["warlock"], 140],
  [
    "charm-person",
    "Charme su persone",
    "Charm Person",
    1,
    ["bard", "druid", "sorcerer", "warlock", "wizard"],
    115,
  ],
];
export const spells = spellRows.map(([id, it, en, level, classes, page, combatActionId]) => ({
  id,
  name: text(it, en),
  level,
  classes,
  source: ruleSource(page),
  ...(combatActionId ? { combatActionId } : {}),
  automation: combatActionId ? "table" : "manual",
}));
export const equipmentOptions = [
  ...classes.map((c) => ({
    id: c.id + "-gold",
    classId: c.id,
    name: text(
      "Oro iniziale (alternativa " + (c.id === "fighter" ? "C" : "B") + ")",
      "Starting gold (option " + (c.id === "fighter" ? "C" : "B") + ")",
    ),
    items: [],
    currency: {
      gp: {
        barbarian: 75,
        bard: 90,
        cleric: 110,
        druid: 50,
        fighter: 155,
        monk: 50,
        paladin: 150,
        ranger: 150,
        rogue: 100,
        sorcerer: 50,
        warlock: 100,
        wizard: 55,
      }[c.id],
    },
    source: c.source,
  })),
  ...backgrounds.map((b) => ({
    id: b.id + "-gold",
    backgroundId: b.id,
    name: text("Oro del background (alternativa B)", "Background gold (option B)"),
    items: [],
    currency: { gp: 50 },
    source: b.source,
  })),
];
export function getCharacterCatalog() {
  return structuredClone({
    abilities,
    classes,
    backgrounds,
    species,
    skills,
    languages,
    feats,
    spells,
    equipmentOptions,
    templates: [],
    coverage: [
      text(
        "Catalogo SRD selezionato: gli incantesimi non elencati si registrano manualmente; quattro hanno già comandi al Tavolo.",
        "Selected SRD catalogue: unlisted spells are recorded manually; four already have Table commands.",
      ),
    ],
  });
}

export function requiredFeatureGrants(rows, race, proficientSkills) {
  const grants = [];
  const add = (id, it, en, count, options, kind = "choice", level = 1) =>
    grants.push({ id, name: text(it, en), count, options: structuredClone(options), kind, level });
  const weapons = [
    ["quarterstaff", "Bastone ferrato", "Quarterstaff"],
    ["dagger", "Pugnale", "Dagger"],
    ["club", "Randello", "Club"],
    ["spear", "Lancia", "Spear"],
    ["handaxe", "Ascia", "Handaxe"],
    ["javelin", "Giavellotto", "Javelin"],
    ["shortbow", "Arco corto", "Shortbow"],
    ["light-crossbow", "Balestra leggera", "Light Crossbow"],
    ["longsword", "Spada lunga", "Longsword"],
    ["greatsword", "Spadone", "Greatsword"],
    ["greataxe", "Ascia bipenne", "Greataxe"],
    ["rapier", "Stocco", "Rapier"],
    ["scimitar", "Scimitarra", "Scimitar"],
    ["shortsword", "Spada corta", "Shortsword"],
    ["longbow", "Arco lungo", "Longbow"],
  ].map(([id, it, en]) => ({
    ...option(id, it, en),
    source: ruleSource(90, 91),
    automation: "manual",
  }));
  for (const row of rows) {
    const id = row.classId,
      level = row.level;
    if (id === "fighter" || (["paladin", "ranger"].includes(id) && level >= 2))
      add(
        "class:" + id + ":fighting-style",
        "Stile di combattimento",
        "Fighting Style",
        1,
        feats.filter((f) => f.category === "fighting-style"),
        "feat",
        id === "fighter" ? 1 : 2,
      );
    if (["fighter", "barbarian", "paladin", "ranger", "rogue"].includes(id)) {
      let count = id === "fighter" ? 3 : 2;
      if (["fighter", "barbarian"].includes(id)) {
        if (level >= 4) count++;
        if (level >= 10) count++;
        if (id === "fighter" && level >= 16) count++;
      }
      const options =
        id === "barbarian"
          ? weapons.filter((w) => !["shortbow", "light-crossbow", "longbow"].includes(w.id))
          : id === "rogue"
            ? weapons.filter(
                (w) => !["longsword", "greatsword", "greataxe", "longbow"].includes(w.id),
              )
            : weapons;
      add(
        "class:" + id + ":mastery",
        "Padronanza delle armi",
        "Weapon Mastery",
        count,
        options,
        "mastery",
      );
    }
    if (id === "cleric")
      add("class:cleric:divine-order", "Ordine divino", "Divine Order", 1, [
        { ...option("protector", "Protettore", "Protector"), source: ruleSource(37) },
        { ...option("thaumaturge", "Taumaturgo", "Thaumaturge"), source: ruleSource(37) },
      ]);
    if (id === "druid")
      add("class:druid:primal-order", "Ordine primordiale", "Primal Order", 1, [
        { ...option("warden", "Custode", "Warden"), source: ruleSource(42) },
        { ...option("magician", "Mago della natura", "Magician"), source: ruleSource(42) },
      ]);
    if (id === "rogue" || (id === "bard" && level >= 2) || (id === "wizard" && level >= 2)) {
      const count =
        id === "wizard"
          ? 1
          : (id === "rogue" && level >= 6) || (id === "bard" && level >= 9)
            ? 4
            : 2;
      const options = skills
        .filter(
          (s) =>
            proficientSkills.includes(s.id) &&
            (id !== "wizard" ||
              ["arcana", "history", "investigation", "medicine", "nature", "religion"].includes(
                s.id,
              )),
        )
        .map((s) => ({ ...s, source: ruleSource(id === "wizard" ? 78 : id === "bard" ? 32 : 61) }));
      add(
        "class:" + id + ":expertise",
        "Maestria",
        "Expertise",
        count,
        options,
        "expertise",
        id === "rogue" ? 1 : 2,
      );
    }
    if (id === "warlock")
      add(
        "class:warlock:invocation",
        "Invocazioni occulte",
        "Eldritch Invocations",
        level === 1
          ? 1
          : level < 5
            ? 3
            : level < 7
              ? 5
              : level < 9
                ? 6
                : level < 12
                  ? 7
                  : level < 15
                    ? 8
                    : level < 18
                      ? 9
                      : 10,
        [{ ...option("eldritch-mind", "Mente Occulta", "Eldritch Mind"), source: ruleSource(72) }],
      );
    const levels =
      id === "fighter"
        ? [4, 6, 8, 12, 14, 16, 19]
        : id === "rogue"
          ? [4, 8, 10, 12, 16, 19]
          : [4, 8, 12, 16, 19];
    for (const at of levels)
      if (level >= at)
        add(
          "class:" + id + ":feat:" + at,
          at === 19 ? "Talento del livello 19" : "Talento del livello " + at,
          "Level " + at + " feat",
          1,
          feats.filter((f) => f.category !== "fighting-style"),
          "feat",
          at,
        );
  }
  if (race?.id === "human")
    add(
      "species:human:origin-feat",
      "Talento di origine umano",
      "Human Origin feat",
      1,
      feats.filter((f) => f.category === "origin"),
      "feat",
    );
  return grants;
}
