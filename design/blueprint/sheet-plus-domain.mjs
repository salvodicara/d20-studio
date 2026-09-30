// B37 — Character sheet: derived values, reasoned overrides and conveniences (domain).
//
// Pure functions over the shared state; no DOM. The UI is sheet-plus.mjs.
// Patterns copied (census IDs in docs/interview/CAPABILITY_CENSUS.md and
// changes/interview-01/market-census/*.md):
// - dnd5e Play/Edit sheet modes (FVT-008): play shows effective values, edit the base
//   values and the construction controls.
// - Roll20 section cog with override modal (R20-024) and the Modifier Builder stacking
//   order set base → add → min/max → multiply → override (R20-023); several base formulas
//   keep the best one (dnd5e FVT-016). D&D Beyond AC components with a note (DDB-029).
// - D&D Beyond skills with "Additional Skills" and pinned favourites (DDB-028), custom
//   senses and speeds with the one shown in the header (DDB-030), Manage Defenses with an
//   asterisk on custom entries and collapsed duplicates (DDB-031), action-economy filter
//   chips (DDB-039), Notes sections (DDB-056), Manage Experience (DDB-024).
// - dnd5e favourites (FVT-009) and rich tooltips (FVT-010).
// - Beyond20 per-character roll toggles (VTL-013) and AboveVTT custom riders (VTL-015).
// - Shard reselect-after-rest prompt (VTL-017).
// Rules: D&D 2024, SRD 5.2.1 (EN/IT pages cited on each source). A rule the prototype does
// not model stays a visible, reasoned override: nothing is inferred from a name.

import { rollDie } from "./state.mjs";
import {
  canControlActor,
  canViewActor,
  isCampaignActor,
  hiddenFromPlayers,
} from "./character-access.mjs";
import {
  getEffectiveActor,
  getEffectiveSpeed,
  getEffectiveMovementBudget,
} from "./forms-companions.mjs";
import {
  skills as SKILL_LIST,
  classes as CLASS_LIST,
  requiredFeatureGrants,
  XP_THRESHOLDS,
  initiativeProficiency,
} from "./character-rules.mjs";
import {
  SPELLS,
  RULES_GLOSSARY,
  LABELS,
  activeItemModifiers,
  weaponDefinition,
} from "./srd-sample.mjs";
import {
  listConditionDefinitions,
  conditionSaveRules,
  conditionAttackRules,
  hasCondition,
} from "./conditions.mjs";
import { listActions } from "./combat.mjs";
import { defensesOf } from "./damage-domain.mjs";

export const ID = "sheet-plus";
export const ROLLS = "sheet-plus-rolls";
export const VERSION = 1;
const MAX_ROLLS = 300;
const MAX_RESULTS = 20;

const L = (it, en) => ({ it, en });
const copy = (value) => structuredClone(value);
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const newId = (prefix) => `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
const pick = (value, lang) =>
  isObject(value) ? (value[lang] ?? value.it ?? value.en ?? "") : String(value ?? "");
/** A refusal with its text in both languages (shown by the UI as a toast). */
export function fail(it, en) {
  return Object.assign(Error(en), { it, en });
}

// ------------------------------------------------------------------------------ sources

const EN_DOC = Object.freeze({
  url: "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf",
  sha256: "8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87",
});
const IT_DOC = Object.freeze({
  url: "https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf",
  sha256: "a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718",
});
/** An SRD 5.2.1 source with its English and Italian pages (verified on both PDFs). */
export const srd = (en, it) =>
  Object.freeze({
    kind: "srd",
    edition: "2024",
    revision: "5.2.1",
    sha256: EN_DOC.sha256,
    url: EN_DOC.url,
    pages: en,
    en: { ...EN_DOC, pages: en },
    it: { ...IT_DOC, pages: it },
  });
const glossary = (slug) => RULES_GLOSSARY.find((entry) => entry.slug === slug) ?? null;
const glossarySource = (slug, en, it) => glossary(slug)?.source ?? srd(en, it);
export const SOURCES = Object.freeze({
  actions: srd([9, 10], [10, 11]),
  bonusActions: glossarySource("bonus-action", [177], [205]),
  reaction: glossarySource("reaction", [186], [212]),
  acBase: srd([22], [25]),
  advancement: srd([23], [25, 26]),
  proficiency: glossarySource("proficiency", [186], [206]),
  skills: srd([9], [10]),
  expertise: srd([182], [209]),
  savingThrow: glossarySource("saving-throw", [187], [218]),
  initiative: glossarySource("initiative", [184], [208]),
  passivePerception: glossarySource("passive-perception", [186], [211]),
  speed: srd([188], [218]),
  flySpeed: srd([182], [219]),
  resistance: glossarySource("resistance", [187], [212]),
  vulnerability: glossarySource("vulnerability", [191], [219]),
  immunity: glossarySource("immunity", [183], [208]),
  bless: srd([113], [128]),
  bane: srd([112], [123]),
  weaponMastery: srd([48], [54]),
  knownForms: srd([42], [48]),
  blindsight: srd([177], [219]),
  darkvision: glossarySource("darkvision", [180], [215]),
  tremorsense: srd([190], [211]),
  truesight: srd([190], [219]),
});
/** "EN 113 / IT 128" for a source. */
export function pagesText(source) {
  if (!source?.en?.pages || !source?.it?.pages) return "";
  return `SRD 5.2.1 · EN ${source.en.pages.join("–")} / IT ${source.it.pages.join("–")}`;
}

// ------------------------------------------------------------------------------ catalogues

export const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];
export const ABILITY_NAMES = Object.freeze({
  str: L("Forza", "Strength"),
  dex: L("Destrezza", "Dexterity"),
  con: L("Costituzione", "Constitution"),
  int: L("Intelligenza", "Intelligence"),
  wis: L("Saggezza", "Wisdom"),
  cha: L("Carisma", "Charisma"),
});
export const ABILITY_SHORT = Object.freeze({
  str: L("FOR", "STR"),
  dex: L("DES", "DEX"),
  con: L("COS", "CON"),
  int: L("INT", "INT"),
  wis: L("SAG", "WIS"),
  cha: L("CAR", "CHA"),
});
export const SKILLS = SKILL_LIST.map((skill) => ({ ...skill }));
export const DAMAGE_TYPES = Object.keys(LABELS.damageType);
export const CONDITIONS = listConditionDefinitions().map((row) => ({
  id: row.id,
  name: row.name,
}));
export const SPEED_MODES = ["walk", "fly", "swim", "climb", "burrow"];
export const SPEED_NAMES = Object.freeze({
  walk: L("Camminare", "Walk"),
  fly: L("Volare", "Fly"),
  swim: L("Nuotare", "Swim"),
  climb: L("Scalare", "Climb"),
  burrow: L("Scavare", "Burrow"),
});
export const SENSES = ["darkvision", "blindsight", "tremorsense", "truesight"];
export const SENSE_NAMES = Object.freeze({
  darkvision: L("Scurovisione", "Darkvision"),
  blindsight: L("Vista cieca", "Blindsight"),
  tremorsense: L("Percezione tellurica", "Tremorsense"),
  truesight: L("Vista pura", "Truesight"),
});
export const DEFENSE_KINDS = ["resistance", "immunity", "vulnerability"];
export const DEFENSE_NAMES = Object.freeze({
  resistance: L("Resistenza", "Resistance"),
  immunity: L("Immunità", "Immunity"),
  vulnerability: L("Vulnerabilità", "Vulnerability"),
});
export const SOURCE_KINDS = ["item", "spell", "species", "feature", "custom"];
export const SOURCE_KIND_NAMES = Object.freeze({
  item: L("Oggetto", "Item"),
  spell: L("Incantesimo o effetto", "Spell or effect"),
  species: L("Specie", "Species"),
  feature: L("Privilegio o talento", "Feature or feat"),
  custom: L("Personalizzata (accordo del tavolo)", "Custom (table agreement)"),
});
export const NOTE_SECTIONS = ["organizations", "allies", "enemies", "backstory", "other"];
export const NOTE_SECTION_NAMES = Object.freeze({
  organizations: L("Organizzazioni", "Organizations"),
  allies: L("Alleati", "Allies"),
  enemies: L("Nemici", "Enemies"),
  backstory: L("Retroscena", "Backstory"),
  other: L("Altro", "Other"),
});
export const PROFICIENCY_LEVELS = ["none", "proficient", "expertise"];

/** Modifier operations in the order they stack (Roll20 Modifier Builder, R20-023). */
export const OPS = ["set-base", "add", "min", "max", "multiply", "override"];
export const OP_NAMES = Object.freeze({
  "set-base": L("Imposta la base", "Set the base"),
  add: L("Aggiungi o togli", "Add or subtract"),
  min: L("Almeno", "At least"),
  max: L("Al massimo", "At most"),
  multiply: L("Moltiplica", "Multiply"),
  override: L("Sostituisci il totale", "Override the total"),
});

/** Toggles that add a die to rolls while active (Beyond20 VTL-013; SRD 2024 spells). */
export const EFFECT_CATALOG = Object.freeze({
  bless: Object.freeze({
    id: "bless",
    name: L("Benedizione", "Bless"),
    sign: 1,
    dice: { count: 1, sides: 4 },
    flat: 0,
    appliesTo: ["attack", "save"],
    source: SOURCES.bless,
    summary: L(
      "+1d4 ai tiri per colpire e ai tiri salvezza finché dura l’incantesimo (concentrazione di chi lo lancia).",
      "+1d4 to attack rolls and saving throws while the spell lasts (the caster’s Concentration).",
    ),
  }),
  bane: Object.freeze({
    id: "bane",
    name: L("Anatema", "Bane"),
    sign: -1,
    dice: { count: 1, sides: 4 },
    flat: 0,
    appliesTo: ["attack", "save"],
    source: SOURCES.bane,
    summary: L(
      "−1d4 ai tiri per colpire e ai tiri salvezza finché dura l’incantesimo (concentrazione di chi lo lancia).",
      "−1d4 to attack rolls and saving throws while the spell lasts (the caster’s Concentration).",
    ),
  }),
});
export const ROLL_KIND_NAMES = Object.freeze({
  attack: L("tiri per colpire", "attack rolls"),
  save: L("tiri salvezza", "saving throws"),
  check: L("prove di caratteristica", "ability checks"),
});

// The 2024 generic actions (SRD "Actions" table, EN 9–10 / IT 10–11), with the glossary
// entry of each one (the Library shows the same entries).
export const GENERIC_ACTIONS = Object.freeze(
  [
    "attack",
    "dash",
    "disengage",
    "dodge",
    "help",
    "hide",
    "influence",
    "magic",
    "ready",
    "search",
    "study",
    "utilize",
  ].map((slug) => {
    const entry = glossary(slug);
    return Object.freeze({
      id: slug,
      name: entry?.name ?? L(slug, slug),
      summary: entry?.summary ?? L("", ""),
      source: entry?.source ?? SOURCES.actions,
      economy: "action",
    });
  }),
);
const OPPORTUNITY = glossary("opportunity-attacks");
export const GENERIC_REACTIONS = Object.freeze([
  Object.freeze({
    id: "opportunity-attack",
    name: OPPORTUNITY?.name ?? L("Attacco di opportunità", "Opportunity Attack"),
    summary:
      OPPORTUNITY?.summary ??
      L(
        "Quando una creatura che vedi esce dalla tua portata, un attacco in mischia come Reazione.",
        "When a creature you can see leaves your reach, one melee attack as a Reaction.",
      ),
    source: OPPORTUNITY?.source ?? SOURCES.reaction,
    economy: "reaction",
  }),
]);
// Economy of a few SRD features the sample sheets carry (definition id suffix → cost).
// Anything else stays "other": the name alone never decides the cost.
const FEATURE_ECONOMY = Object.freeze({
  "second-wind": "bonus",
  "wild-shape": "bonus",
  "action-surge": "other",
  "arcane-recovery": "other",
});
export const ACTION_FILTERS = ["all", "attack", "action", "bonus", "reaction", "other", "limited"];
export const ACTION_FILTER_NAMES = Object.freeze({
  all: L("Tutte", "All"),
  attack: L("Attacco", "Attack"),
  action: L("Azione", "Action"),
  bonus: L("Azione bonus", "Bonus Action"),
  reaction: L("Reazione", "Reaction"),
  other: L("Altro", "Other"),
  limited: L("Usi limitati", "Limited Use"),
});

// ------------------------------------------------------------------------------ slice

const emptyEntry = () => ({
  mods: {},
  applied: {},
  defenses: [],
  appliedDefenses: null,
  speedDisplay: "walk",
  senses: {},
  senseDisplay: null,
  customSkills: [],
  favorites: [],
  notes: [],
  effects: [],
  advancement: { mode: "xp", milestones: [], proposedLevel: null },
  reselect: [],
  results: [],
});
export function emptySlice() {
  return { actors: {} };
}
export function emptyRolls() {
  return { rolls: [] };
}
/** The latest completed rest benefit of a kind for an actor (rest-time.mjs records). */
export function latestRest(state, actorId, kinds = ["long"]) {
  let found = null;
  for (const rest of state?.restTime?.rests ?? [])
    for (const part of rest.participants ?? [])
      if (part.actorId === actorId)
        for (const benefit of part.benefits ?? [])
          if (benefit.applied && kinds.includes(benefit.kind))
            found = { restId: rest.id, benefitId: benefit.id, kind: benefit.kind };
  return found;
}
const restKey = (rest) => (rest ? `${rest.restId}:${rest.benefitId}` : null);
function masteryOptions() {
  const grant = requiredFeatureGrants([{ classId: "fighter", level: 3 }], null, []).find(
    (row) => row.id === "class:fighter:mastery",
  );
  return (grant?.options ?? []).map((row) => ({ id: row.id, name: copy(row.name) }));
}
/**
 * Seed (synthetic, coherent with the sample sheets): Doran the Fighter keeps his three
 * Weapon Mastery choices, one of which he may change after each Long Rest (SRD EN 48 /
 * IT 54). A rest already completed before the seed is not a pending prompt.
 */
export function seedSlice(state) {
  const slice = emptySlice();
  const doran = state?.actors?.doran;
  if (doran?.kind === "character") {
    const entry = (slice.actors.doran = emptyEntry());
    const options = masteryOptions();
    if (options.length)
      entry.reselect.push({
        id: "doran-weapon-mastery",
        name: L("Padronanza delle armi", "Weapon Mastery"),
        trigger: "long",
        count: 3,
        changeLimit: 1,
        options,
        chosen: ["longsword", "handaxe", "javelin"].filter((id) =>
          options.some((row) => row.id === id),
        ),
        source: SOURCES.weaponMastery,
        handled: restKey(latestRest(state, "doran", ["long"])),
        history: [],
      });
  }
  return slice;
}
export function normalizeSlice(slice, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw Error("Sheet data from a newer version");
  const next = isObject(slice) ? slice : emptySlice();
  if (!isObject(next.actors)) next.actors = {};
  for (const [id, entry] of Object.entries(next.actors)) {
    if (!isObject(entry)) {
      delete next.actors[id];
      continue;
    }
    const base = emptyEntry();
    for (const key of Object.keys(base))
      if (entry[key] === undefined || typeof entry[key] !== typeof base[key])
        entry[key] = base[key] === null ? (entry[key] ?? null) : base[key];
    for (const key of ["defenses", "customSkills", "favorites", "notes", "effects", "reselect"])
      if (!Array.isArray(entry[key])) entry[key] = [];
    if (!Array.isArray(entry.results)) entry.results = [];
    if (!isObject(entry.mods)) entry.mods = {};
    if (!isObject(entry.applied)) entry.applied = {};
    if (!isObject(entry.senses)) entry.senses = {};
    if (!isObject(entry.advancement)) entry.advancement = base.advancement;
    if (!Array.isArray(entry.advancement.milestones)) entry.advancement.milestones = [];
  }
  return next;
}
export function normalizeRolls(slice, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw Error("Sheet roll data from a newer version");
  const next = isObject(slice) ? slice : emptyRolls();
  if (!Array.isArray(next.rolls)) next.rolls = [];
  return next;
}
export const sliceOf = (state) => state?.ext?.[ID] ?? null;
export const rollsOf = (state) => state?.ext?.[ROLLS] ?? null;
export function entryOf(state, actorId) {
  return sliceOf(state)?.actors?.[actorId] ?? null;
}
/** The entry of an actor inside a draft, created on first write. */
export function ensureEntry(draft, actorId) {
  const slice = draft.ext?.[ID];
  if (!slice) throw fail("Dati della scheda non pronti.", "Sheet data not ready.");
  slice.actors ??= {};
  return (slice.actors[actorId] ??= emptyEntry());
}

// ------------------------------------------------------------------------------ access

export const isPersonal = (actor) => actor?.visibility === "private";
/** A readable actor for this identity, or a refusal. */
export function readable(state, actorId, role) {
  const actor = state?.actors?.[actorId];
  if (!actor || !canViewActor(actor, role, state))
    throw fail("Scheda non disponibile.", "Sheet unavailable.");
  return actor;
}
/** A controllable actor for this identity, or a refusal. */
export function controlled(state, actorId, role) {
  const actor = state?.actors?.[actorId];
  if (!actor || !canControlActor(actor, role, state))
    throw fail("Non puoi modificare questa scheda.", "You cannot edit this sheet.");
  return actor;
}

// ------------------------------------------------------------------------------ numbers

export const abilityMod = (score) => (Number.isFinite(score) ? Math.floor((score - 10) / 2) : null);
export const signed = (value) =>
  Number.isFinite(value) ? (value >= 0 ? "+" : "−") + Math.abs(value) : "—";
/** Proficiency Bonus: the recorded one, else by level (Character Advancement, EN 23 / IT 25). */
export function proficiencyBonus(actor) {
  const recorded = actor?.proficiencyBonus ?? actor?.combatProfile?.proficiencyBonus;
  if (Number.isInteger(recorded)) return { value: recorded, from: "recorded" };
  const level = Math.max(1, Math.min(20, Number.isInteger(actor?.level) ? actor.level : 1));
  return { value: 2 + Math.floor((level - 1) / 4), from: "level" };
}
function primaryClass(actor) {
  const id =
    actor?.classes?.[0]?.classId ??
    actor?.characterBuild?.data?.classes?.[0]?.classId ??
    actor?.buildSeed?.classes?.[0]?.classId ??
    null;
  return CLASS_LIST.find((row) => row.id === id) ?? null;
}
const partOf = (label, value, source = null, plain = false) => ({ label, value, source, plain });

/**
 * Applies modifiers in the declared stacking order: set base (the best one wins, FVT-016)
 * → add → at least (the highest floor) → at most (the lowest cap) → multiply (rounded down)
 * → override (the latest one). Returns every step with its effect.
 */
export function applyChain(base, mods = []) {
  const list = (mods ?? []).filter((row) => OPS.includes(row?.op) && Number.isFinite(row.value));
  const steps = [];
  let value = Number.isFinite(base) ? base : 0;
  const of = (op) => list.filter((row) => row.op === op);
  const bases = of("set-base");
  if (bases.length) {
    const best = Math.max(...bases.map((row) => row.value));
    let used = false;
    for (const row of bases) {
      const applies = !used && row.value === best;
      if (applies) used = true;
      steps.push({ ...row, before: value, after: applies ? best : value, applied: applies });
      if (applies) value = best;
    }
  }
  for (const row of of("add")) {
    steps.push({ ...row, before: value, after: value + row.value, applied: true });
    value += row.value;
  }
  const floors = of("min");
  if (floors.length) {
    const floor = Math.max(...floors.map((row) => row.value));
    for (const row of floors) {
      const applies = row.value === floor && value < floor;
      steps.push({ ...row, before: value, after: applies ? floor : value, applied: applies });
    }
    value = Math.max(value, floor);
  }
  const caps = of("max");
  if (caps.length) {
    const cap = Math.min(...caps.map((row) => row.value));
    for (const row of caps) {
      const applies = row.value === cap && value > cap;
      steps.push({ ...row, before: value, after: applies ? cap : value, applied: applies });
    }
    value = Math.min(value, cap);
  }
  for (const row of of("multiply")) {
    const after = Math.floor(value * row.value);
    steps.push({ ...row, before: value, after, applied: true });
    value = after;
  }
  const overrides = of("override");
  overrides.forEach((row, index) => {
    const applies = index === overrides.length - 1;
    steps.push({ ...row, before: value, after: applies ? row.value : value, applied: applies });
    if (applies) value = row.value;
  });
  return { base: Number.isFinite(base) ? base : 0, total: value, steps };
}

// ------------------------------------------------------------------------------ stats

// Stats a form replaces (SRD 5.2.1 Wild Shape, EN 48 / IT 54): changes wait for the return.
const FORM_KINDS = ["ac", "initiative", "save", "skill"];
/** Stat keys: "ac", "initiative", "passive-perception", "save:<ability>", "skill:<id>",
 *  "skill:custom:<id>". AC, Initiative, saves and standard skills are written through to the
 *  sheet fields other modules read (combat reads actor.ac and actor.savingThrows, the
 *  combat tracker's initiative roll actor.initiativeBonus). */
export function statKind(key) {
  if (key === "ac" || key === "initiative" || key === "passive-perception") return key;
  if (/^save:(str|dex|con|int|wis|cha)$/.test(key)) return "save";
  if (/^skill:custom:[a-z0-9-]+$/.test(key)) return "custom-skill";
  if (/^skill:[a-z-]+$/.test(key) && SKILLS.some((row) => row.id === key.slice(6))) return "skill";
  return null;
}
export const isWriteThrough = (key) =>
  ["ac", "initiative", "save", "skill"].includes(statKind(key));
function readField(actor, key) {
  const kind = statKind(key);
  if (kind === "ac") return Number.isFinite(actor?.ac) ? actor.ac : null;
  if (kind === "initiative")
    return Number.isFinite(actor?.initiativeBonus) ? actor.initiativeBonus : null;
  if (kind === "save") {
    const value = actor?.savingThrows?.[key.slice(5)];
    return Number.isFinite(value) ? value : null;
  }
  if (kind === "skill") {
    const value = actor?.skillModifiers?.[key.slice(6)];
    return Number.isFinite(value) ? value : null;
  }
  return null;
}
function writeField(actor, key, value) {
  const kind = statKind(key);
  if (kind === "ac") actor.ac = value;
  else if (kind === "initiative") actor.initiativeBonus = value;
  else if (kind === "save") (actor.savingThrows ??= {})[key.slice(5)] = value;
  else if (kind === "skill") (actor.skillModifiers ??= {})[key.slice(6)] = value;
}
function clearField(actor, key) {
  const kind = statKind(key);
  if (kind === "initiative") {
    delete actor.initiativeBonus;
    return;
  }
  const [bag, field] =
    kind === "save" ? ["savingThrows", key.slice(5)] : ["skillModifiers", key.slice(6)];
  if (!actor?.[bag]) return;
  delete actor[bag][field];
  if (!Object.keys(actor[bag]).length) delete actor[bag];
}
export function statName(key, state = null, actorId = null) {
  const kind = statKind(key);
  if (kind === "ac") return L("Classe armatura", "Armor class");
  if (kind === "initiative") return L("Iniziativa", "Initiative");
  if (kind === "passive-perception") return L("Percezione passiva", "Passive Perception");
  if (kind === "save") {
    const name = ABILITY_NAMES[key.slice(5)];
    return L(`Tiro salvezza su ${name.it}`, `${name.en} saving throw`);
  }
  if (kind === "skill") return copy(SKILLS.find((row) => row.id === key.slice(6)).name);
  if (kind === "custom-skill") {
    const row = entryOf(state, actorId)?.customSkills.find((s) => s.id === key.slice(13));
    return row ? L(row.name, row.name) : L("Abilità personalizzata", "Custom skill");
  }
  return L(key, key);
}

/**
 * The base of a stat before any modifier, with its parts (what "Edit" shows). `recorded`
 * is the sheet value to treat as the recorded base (default: the field as it is now; the
 * base kept when modifiers were first written, since the field then holds their total).
 */
export function naturalBase(state, actorId, key, recorded = undefined) {
  const canonical = state.actors[actorId];
  if (!canonical) throw fail("Scheda non disponibile.", "Sheet unavailable.");
  const actor = getEffectiveActor(canonical);
  const kind = statKind(key);
  const pb = proficiencyBonus(actor);
  const field = recorded === undefined ? readField(canonical, key) : recorded;
  if (kind === "ac") {
    const dex = abilityMod(actor.abilities?.dex);
    const value = field;
    const unarmored =
      Number.isFinite(value) && dex !== null && value === 10 + dex && !canonical.activeForm;
    return {
      value,
      parts: unarmored
        ? [
            partOf(L("Senza armatura", "Unarmored"), 10, SOURCES.acBase, true),
            partOf(ABILITY_NAMES.dex, dex),
          ]
        : [partOf(L("Valore della scheda", "Sheet value"), value, null, true)],
      source: SOURCES.acBase,
    };
  }
  if (kind === "initiative") {
    const dex = abilityMod(actor.abilities?.dex);
    // F13: Alert adds the Proficiency Bonus (SRD 5.2.1 EN 87 / IT 97).
    const alert = initiativeProficiency(canonical);
    const derived = (dex ?? 0) + alert;
    if (field !== null && field !== derived && field !== (dex ?? 0))
      return {
        value: field,
        parts: [partOf(L("Valore registrato sulla scheda", "Value recorded on the sheet"), field)],
        source: SOURCES.initiative,
      };
    return {
      value: derived,
      parts: [
        partOf(ABILITY_NAMES.dex, dex),
        ...(alert
          ? [partOf(L("Allerta (bonus di competenza)", "Alert (Proficiency Bonus)"), alert)]
          : []),
      ],
      source: SOURCES.initiative,
    };
  }
  if (kind === "passive-perception") {
    const perception = statValue(state, actorId, "skill:perception").total;
    return {
      value: 10 + perception,
      parts: [
        partOf(L("Base", "Base"), 10, SOURCES.passivePerception, true),
        partOf(L("Percezione", "Perception"), perception),
      ],
      source: SOURCES.passivePerception,
    };
  }
  if (kind === "save") {
    const ability = key.slice(5);
    const m = abilityMod(actor.abilities?.[ability]);
    const cls = primaryClass(canonical);
    const proficient = Boolean(cls?.savingThrows?.includes(ability));
    const computed = m === null ? null : m + (proficient ? pb.value : 0);
    const parts = [partOf(ABILITY_NAMES[ability], m)];
    if (proficient)
      parts.push(
        partOf(L(`Competenza (${cls.name.it})`, `Proficiency (${cls.name.en})`), pb.value),
      );
    if (field !== null && field !== computed)
      return {
        value: field,
        parts: [partOf(L("Valore registrato sulla scheda", "Value recorded on the sheet"), field)],
        source: SOURCES.savingThrow,
        proficient,
      };
    return { value: computed ?? 0, parts, source: SOURCES.savingThrow, proficient };
  }
  if (kind === "skill") {
    const id = key.slice(6);
    const def = SKILLS.find((row) => row.id === id);
    const m = abilityMod(actor.abilities?.[def.ability]);
    const proficient = Array.isArray(canonical.skills) && canonical.skills.includes(id);
    const computed = m === null ? null : m + (proficient ? pb.value : 0);
    const parts = [partOf(ABILITY_NAMES[def.ability], m)];
    if (proficient) parts.push(partOf(L("Competenza", "Proficiency"), pb.value, SOURCES.skills));
    if (field !== null && field !== computed)
      return {
        value: field,
        parts: [partOf(L("Valore registrato sulla scheda", "Value recorded on the sheet"), field)],
        source: SOURCES.skills,
        proficient: proficient || field > (m ?? 0),
      };
    return { value: computed ?? 0, parts, source: SOURCES.skills, proficient };
  }
  if (kind === "custom-skill") {
    const row = entryOf(state, actorId)?.customSkills.find((s) => s.id === key.slice(13));
    if (!row) return { value: 0, parts: [], source: null };
    const m = abilityMod(actor.abilities?.[row.ability]) ?? 0;
    const factor = row.proficiency === "expertise" ? 2 : row.proficiency === "proficient" ? 1 : 0;
    const parts = [partOf(ABILITY_NAMES[row.ability], m)];
    if (factor)
      parts.push(
        partOf(
          factor === 2 ? L("Maestria", "Expertise") : L("Competenza", "Proficiency"),
          pb.value * factor,
          factor === 2 ? SOURCES.expertise : SOURCES.skills,
        ),
      );
    if (row.bonus) parts.push(partOf(L("Bonus concordato", "Agreed bonus"), row.bonus));
    return { value: m + pb.value * factor + (row.bonus || 0), parts, source: null };
  }
  throw fail("Valore sconosciuto.", "Unknown value.");
}

/**
 * One stat for display: base (with parts), the modifier chain in stacking order, the total
 * the rest of the app uses, riders from active effects, and a drift when another command
 * changed the written field after these modifiers.
 */
export function statValue(state, actorId, key) {
  const canonical = state.actors[actorId];
  const entry = entryOf(state, actorId);
  const mods = entry?.mods?.[key] ?? [];
  const rec = entry?.applied?.[key] ?? null;
  const natural = naturalBase(
    state,
    actorId,
    key,
    rec ? (rec.present ? rec.base : null) : undefined,
  );
  const through = isWriteThrough(key);
  const base = natural.value;
  const chain = applyChain(base, mods);
  const field = through ? readField(canonical, key) : null;
  const form = Boolean(canonical?.activeForm) && FORM_KINDS.includes(statKind(key));
  // In a form the form's values apply: the written sheet value waits for the return.
  const drift = Boolean(rec && through && !form && field !== chain.total);
  const effective = form ? getEffectiveActor(canonical) : null;
  const formValue = !form
    ? null
    : statKind(key) === "ac"
      ? effective.ac
      : statKind(key) === "initiative"
        ? chain.total
        : (readField(effective, key) ?? chain.total);
  // PG-23 one engine: a D20 Test shows and rolls with what conditions add (Exhaustion −2
  // per level, SRD 5.2.1 EN 181 / IT 208), as D&D Beyond's boxed numbers. Never written
  // through: the combat engine reads the field and adds the same condition rules itself.
  const conditionParts = testConditions(state, actorId, testOfStat(key)).modifierSources.map(
    conditionPart,
  );
  const conditionTotal = conditionParts.reduce((sum, part) => sum + part.value, 0);
  // PG-25 (P2 shared edit): worn items with structured bonuses (Cloak of Protection +1 to
  // AC and saves, srd-sample activeItemModifiers) join the chain as D&D Beyond's AC
  // components. Never written through: getEffectiveActor adds the same bonus for the Table.
  const itemParts = form ? [] : itemModifierParts(canonical, key);
  const itemTotal = itemParts.reduce((sum, part) => sum + part.value, 0);
  return {
    key,
    kind: statKind(key),
    name: statName(key, state, actorId),
    base,
    baseParts: natural.parts,
    source: natural.source,
    proficient: natural.proficient ?? null,
    mods: copy(mods),
    steps: chain.steps,
    chainTotal: chain.total,
    field,
    drift,
    form,
    conditionParts,
    itemParts,
    total: (form ? formValue : drift ? field : chain.total) + conditionTotal + itemTotal,
    riders: [],
  };
}
function itemModifierParts(actor, key) {
  const kind = statKind(key);
  const target = kind === "ac" ? "ac" : kind === "save" ? "saves" : null;
  if (!target) return [];
  return activeItemModifiers(actor)
    .filter((mod) => mod.target === target)
    .map((mod) =>
      partOf(
        typeof mod.name === "object" ? copy(mod.name) : L(String(mod.name), String(mod.name)),
        mod.value,
        mod.source,
      ),
    );
}

function reconcileStat(draft, actorId, key) {
  if (!isWriteThrough(key)) return;
  const actor = draft.actors[actorId];
  const entry = ensureEntry(draft, actorId);
  const mods = entry.mods[key] ?? [];
  let rec = entry.applied[key];
  if (!rec && !mods.length) return;
  if (!rec) {
    const field = readField(actor, key);
    rec = entry.applied[key] = {
      present: field !== null,
      base: field ?? naturalBase(draft, actorId, key, null).value,
      total: null,
    };
  }
  const base = rec.present ? rec.base : naturalBase(draft, actorId, key, null).value;
  if (!mods.length) {
    if (rec.present) writeField(actor, key, rec.base);
    else clearField(actor, key);
    delete entry.applied[key];
    delete entry.mods[key];
    return;
  }
  rec.total = applyChain(base, mods).total;
  writeField(actor, key, rec.total);
}

function refuseInForm(actor, key) {
  if (actor.activeForm && FORM_KINDS.includes(statKind(key)))
    throw fail(
      "Durante una forma i valori sono quelli della forma: correggili dal pannello delle forme.",
      "While in a form the values are the form’s: correct them from the forms panel.",
    );
}
const OVERRIDE_REASON = L(
  "Scrivi il motivo: resta accanto al valore.",
  "Write the reason: it stays next to the value.",
);
/** Adds a reasoned modifier to a stat and writes the new total through (one commit). */
export function addModifier(draft, actorId, key, input, role, now = new Date().toISOString()) {
  const actor = controlled(draft, actorId, role);
  const kind = statKind(key);
  if (!kind) throw fail("Valore non modificabile.", "This value cannot be modified.");
  refuseInForm(actor, key);
  const op = String(input?.op ?? "");
  if (!OPS.includes(op)) throw fail("Scegli il tipo di modifica.", "Choose the kind of change.");
  const value = Number(input?.value);
  if (!Number.isFinite(value) || Math.abs(value) > 99 || (op === "multiply" && value <= 0))
    throw fail(
      "Inserisci un numero valido (fino a 99; per moltiplicare, maggiore di 0).",
      "Enter a valid number (up to 99; to multiply, greater than 0).",
    );
  if (op !== "multiply" && !Number.isInteger(value))
    throw fail("Inserisci un numero intero.", "Enter a whole number.");
  const note = String(input?.note ?? "").trim();
  if (!note || note.length > 120) throw fail(OVERRIDE_REASON.it, OVERRIDE_REASON.en);
  const entry = ensureEntry(draft, actorId);
  const row = { id: input?.id ?? newId("mod"), op, value, note, by: role, at: now };
  (entry.mods[key] ??= []).push(row);
  reconcileStat(draft, actorId, key);
  return row;
}
export function removeModifier(draft, actorId, key, modId, role) {
  refuseInForm(controlled(draft, actorId, role), key);
  const entry = ensureEntry(draft, actorId);
  const list = entry.mods[key] ?? [];
  const index = list.findIndex((row) => row.id === modId);
  if (index < 0) throw fail("Modifica già tolta.", "Change already removed.");
  const [removed] = list.splice(index, 1);
  reconcileStat(draft, actorId, key);
  return removed;
}
/**
 * After another command changed a written field (Correct values, an item, the builder):
 * a recorded base adopts the new sheet value; a computed base is written again.
 */
export function realignStat(draft, actorId, key, role) {
  const actor = controlled(draft, actorId, role);
  refuseInForm(actor, key);
  const entry = ensureEntry(draft, actorId);
  const rec = entry.applied[key];
  if (!rec) throw fail("Nulla da riallineare.", "Nothing to realign.");
  const field = readField(actor, key);
  if (rec.present && field !== null && field !== rec.total) rec.base = field;
  reconcileStat(draft, actorId, key);
  return entry.applied[key] ?? null;
}

// ------------------------------------------------------------------------------ riders

/** Active roll riders for a kind of roll (attack, save, check). */
export function activeRiders(state, actorId, rollKind) {
  return (entryOf(state, actorId)?.effects ?? [])
    .filter((row) => row.active && (row.appliesTo ?? []).includes(rollKind))
    .map((row) => {
      const def = EFFECT_CATALOG[row.kind] ?? null;
      return {
        id: row.id,
        kind: row.kind,
        name: def ? copy(def.name) : L(row.name, row.name),
        sign: def ? def.sign : row.sign === -1 ? -1 : 1,
        dice: def ? copy(def.dice) : row.dice ? copy(row.dice) : null,
        flat: def ? 0 : Number.isInteger(row.flat) ? row.flat : 0,
        source: def?.source ?? null,
      };
    });
}
/** Rows for the Table's attack detail (combat.mjs provider seam): one per active attack
 *  rider. R1 PG-47 (Beyond20 toggles, AboveVTT buffs): the Table's engine rolls a rider's
 *  die with the attack and adds a flat rider to its modifier, so the row says it is in the
 *  roll, never a note to apply by hand. */
export function attackRiderRows(state, attackerId) {
  if (!state?.actors?.[attackerId]) return [];
  return activeRiders(state, attackerId, "attack").map((rider) => {
    // "Benedizione +1d4" (name first, as the other reasons of the attack detail).
    const amount = riderText({ ...rider, name: "" }).trim();
    return {
      code: `${ID}-rider-${rider.id}`,
      mode: "info",
      name: L(
        `${rider.name.it} ${amount}: ${rider.sign < 0 ? "si sottrae al" : "si somma al"} tiro per colpire`,
        `${rider.name.en} ${amount}: ${rider.sign < 0 ? "subtracted from" : "added to"} the attack roll`,
      ),
      ...(rider.source ? { source: rider.source } : {}),
    };
  });
}
export function riderText(rider, lang = "it") {
  const sign = rider.sign < 0 ? "−" : "+";
  const dice = rider.dice ? `${rider.dice.count}d${rider.dice.sides}` : "";
  const flat = rider.flat
    ? `${dice ? " " + (rider.flat < 0 ? "−" : "+") + " " : ""}${Math.abs(rider.flat)}`
    : "";
  return `${sign}${dice}${flat} ${pick(rider.name, lang)}`.trim();
}
export function effectList(state, actorId) {
  const entry = entryOf(state, actorId);
  const rows = Object.values(EFFECT_CATALOG).map((def) => {
    const row = entry?.effects.find((e) => e.kind === def.id);
    return {
      id: row?.id ?? def.id,
      kind: def.id,
      name: copy(def.name),
      active: Boolean(row?.active),
      appliesTo: [...def.appliesTo],
      sign: def.sign,
      dice: copy(def.dice),
      flat: 0,
      summary: copy(def.summary),
      source: def.source,
      custom: false,
      since: row?.since ?? null,
    };
  });
  for (const row of entry?.effects ?? [])
    if (row.kind === "custom")
      rows.push({
        id: row.id,
        kind: "custom",
        name: L(row.name, row.name),
        active: Boolean(row.active),
        appliesTo: [...(row.appliesTo ?? [])],
        sign: row.sign === -1 ? -1 : 1,
        dice: row.dice ? copy(row.dice) : null,
        flat: Number.isInteger(row.flat) ? row.flat : 0,
        summary: L(row.note || "", row.note || ""),
        source: null,
        custom: true,
        since: row.since ?? null,
      });
  return rows;
}
/** Turns an effect on or off (catalogue ids or custom ids). */
export function toggleEffect(
  draft,
  actorId,
  effectId,
  active,
  role,
  now = new Date().toISOString(),
) {
  controlled(draft, actorId, role);
  const entry = ensureEntry(draft, actorId);
  if (EFFECT_CATALOG[effectId]) {
    let row = entry.effects.find((e) => e.kind === effectId);
    if (!row) {
      row = {
        id: effectId,
        kind: effectId,
        appliesTo: [...EFFECT_CATALOG[effectId].appliesTo],
        active: false,
      };
      entry.effects.push(row);
    }
    row.active = Boolean(active);
    row.since = row.active ? now : null;
    row.by = role;
    return row;
  }
  const row = entry.effects.find((e) => e.id === effectId && e.kind === "custom");
  if (!row) throw fail("Effetto non trovato.", "Effect not found.");
  row.active = Boolean(active);
  row.since = row.active ? now : null;
  row.by = role;
  return row;
}
export function addCustomEffect(draft, actorId, input, role, now = new Date().toISOString()) {
  controlled(draft, actorId, role);
  const name = String(input?.name ?? "").trim();
  if (!name || name.length > 60) throw fail("Dai un nome all’effetto.", "Name the effect.");
  const appliesTo = ["attack", "save", "check"].filter((kind) => input?.appliesTo?.includes(kind));
  if (!appliesTo.length)
    throw fail("Scegli a quali tiri si applica.", "Choose which rolls it applies to.");
  const sides = Number(input?.sides);
  const count = Number(input?.count ?? 1);
  const flat = Number(input?.flat ?? 0);
  const dice =
    [4, 6, 8, 10, 12].includes(sides) && Number.isInteger(count) && count >= 1 && count <= 4
      ? { count, sides }
      : null;
  if (!dice && (!Number.isInteger(flat) || flat === 0 || Math.abs(flat) > 10))
    throw fail(
      "Indica un dado (d4–d12) o un bonus fisso da −10 a +10.",
      "Enter a die (d4–d12) or a flat bonus from −10 to +10.",
    );
  const entry = ensureEntry(draft, actorId);
  const row = {
    id: input?.id ?? newId("effect"),
    kind: "custom",
    name,
    sign: input?.sign === -1 || input?.sign === "-1" ? -1 : 1,
    dice,
    flat: dice ? 0 : flat,
    appliesTo,
    note: String(input?.note ?? "")
      .trim()
      .slice(0, 200),
    active: true,
    since: now,
    by: role,
  };
  entry.effects.push(row);
  return row;
}
export function removeCustomEffect(draft, actorId, effectId, role) {
  controlled(draft, actorId, role);
  const entry = ensureEntry(draft, actorId);
  const index = entry.effects.findIndex((e) => e.id === effectId && e.kind === "custom");
  if (index < 0) throw fail("Effetto non trovato.", "Effect not found.");
  return entry.effects.splice(index, 1)[0];
}

// ------------------------------------------------------------------------------ one D20 Test engine

// PG-23/PG-47/PG-48 (D&D Beyond: one roll engine behind every clickable number). The sheet
// list, its favourites, the dice tray (sheet and Table), the DM's requests and the quick
// bar read the same modifier, parts, conditions, riders and per-character roll policy here.
const conditionName = (id) =>
  copy(listConditionDefinitions().find((row) => row.id === id)?.name ?? L(id, id));
/** The ability of a D20 Test: {kind: save|check|skill|initiative, ability, skill}. */
export function testAbility(state, actorId, { kind, ability, skill } = {}) {
  if (kind === "initiative") return "dex";
  if (kind === "skill") {
    const id = String(skill ?? "");
    if (id.startsWith("custom:"))
      return (
        entryOf(state, actorId)?.customSkills.find((row) => row.id === id.slice(7))?.ability ?? null
      );
    return SKILLS.find((row) => row.id === id)?.ability ?? null;
  }
  return ABILITIES.includes(ability) ? ability : null;
}
/** The D20 Test a stat key stands for (null for AC and passive scores). */
function testOfStat(key) {
  const kind = statKind(key);
  if (kind === "save") return { kind: "save", ability: key.slice(5) };
  if (kind === "skill" || kind === "custom-skill") return { kind: "skill", skill: key.slice(6) };
  if (kind === "initiative") return { kind: "initiative" };
  return {};
}
/**
 * What the creature's conditions do to one D20 Test, from the core's condition rules (the
 * same the combat engine applies; SRD 5.2.1 Conditions EN 179–183 / IT 206–216): Exhaustion
 * −2 per level on every D20 Test; Paralyzed, Petrified, Stunned and Unconscious fail
 * Strength and Dexterity saves; Restrained gives Disadvantage on Dexterity saves; Poisoned
 * on ability checks (Initiative is a Dexterity check). Frightened depends on the source
 * being in sight: the roller chooses Disadvantage explicitly (never inferred).
 */
export function testConditions(state, actorId, test = {}) {
  const none = { autoFail: [], advantage: [], disadvantage: [], modifierSources: [] };
  const actor = state?.actors?.[actorId];
  const ability = testAbility(state, actorId, test);
  if (!actor || !ability || !["check", "save", "skill", "initiative"].includes(test.kind))
    return none;
  const rules = conditionSaveRules(actor, ability);
  const save = test.kind === "save";
  const homebrew = homebrewRollModes(state, actorId, test);
  return {
    autoFail: save ? copy(rules.autoFailReasons) : [],
    advantage: [...(save ? copy(rules.advantage) : []), ...homebrew.advantage],
    disadvantage: [
      ...(save
        ? copy(rules.disadvantage)
        : hasCondition(actor, "poisoned")
          ? [{ conditionId: "poisoned", name: conditionName("poisoned") }]
          : []),
      ...homebrew.disadvantage,
    ],
    modifierSources: copy(rules.modifierSources),
  };
}
/** The attacker's own conditions on an attack roll without a target (sheet "to hit"). */
function attackConditions(state, actorId) {
  const none = { autoFail: [], advantage: [], disadvantage: [], modifierSources: [] };
  try {
    const rules = conditionAttackRules(state.actors[actorId], null, {});
    const homebrew = homebrewRollModes(state, actorId, { kind: "attack" });
    return {
      autoFail: [],
      advantage: [
        ...copy(rules.advantage.filter((r) => r.side === "attacker")),
        ...homebrew.advantage,
      ],
      disadvantage: [
        ...copy(rules.disadvantage.filter((r) => r.side === "attacker")),
        ...homebrew.disadvantage,
      ],
      modifierSources: copy(rules.modifierSources),
    };
  } catch {
    return none;
  }
}
// The homebrew modifier targets a D20 Test reads (homebrew-editor-domain MODIFIER_TARGETS):
// a skill check is also a check of its ability, Initiative is a Dexterity check and every
// save reads the "all saving throws" target too (SRD 5.2.1 "D20 Tests", EN 6–8 / IT 6–8).
function homebrewTargets(state, actorId, test) {
  if (test.kind === "attack") return ["attack"];
  const ability = testAbility(state, actorId, test);
  if (!ability) return [];
  if (test.kind === "save") return ["saves", `save:${ability}`];
  if (test.kind === "initiative") return ["initiative", `check:${ability}`];
  if (test.kind === "skill") return [`skill:${test.skill}`, `check:${ability}`];
  return test.kind === "check" ? [`check:${ability}`] : [];
}
/**
 * BI-18 (Roll20 Modifier Builder, DDB modifiers): the Advantage and Disadvantage that the
 * structured homebrew entries applied to this sheet give to one D20 Test (`test` as in
 * testConditions, or {kind: "attack"}). Read from the homebrew area's slice without importing
 * it (as conditions.mjs reads disguises): an entry suspended by the campaign's safe mode, a
 * modifier with a written condition (manual by design) and a timed modifier not active now
 * add nothing. Each reason is named "<entry> (homebrew)" with the entry's revision.
 */
export function homebrewRollModes(state, actorId, test = {}) {
  const out = { advantage: [], disadvantage: [] };
  const slice = state?.ext?.["homebrew-editor"];
  const actor = state?.actors?.[actorId];
  const entries = slice?.sheets?.[actorId]?.entries;
  if (!actor || !Array.isArray(entries)) return out;
  const targets = homebrewTargets(state, actorId, test);
  if (!targets.length) return out;
  const campaignId = state.campaign?.id;
  const campaign = slice.campaigns?.[campaignId];
  const suspended = (contentId) =>
    isCampaignActor(actor, campaignId) &&
    (campaign?.disabled === true || (campaign?.disabledContent ?? []).includes(contentId));
  const written = (value) => Boolean(pick(value, "it").trim() || pick(value, "en").trim());
  for (const entry of entries) {
    if (!entry || entry.pendingChoices || suspended(entry.contentId)) continue;
    for (const m of entry.modifiers ?? []) {
      if (!["advantage", "disadvantage"].includes(m?.mode) || !targets.includes(m.target)) continue;
      if (written(m.condition)) continue;
      const timed = Boolean(m.duration?.anchor) && m.duration.anchor !== "always";
      if (timed && !entry.activeTimed?.[m.id]) continue;
      const origin = m.source ?? entry.name ?? L("Homebrew", "Homebrew");
      out[m.mode].push({
        code: "homebrew",
        homebrew: true,
        contentId: entry.contentId,
        name: L(`${pick(origin, "it")} (homebrew)`, `${pick(origin, "en")} (homebrew)`),
        source: {
          kind: "homebrew",
          contentId: entry.contentId,
          revision: entry.revisionId ?? null,
        },
      });
    }
  }
  return out;
}
/** A condition's modifier as a named part ("Indebolimento 2 −4"). */
function conditionPart(m) {
  const label =
    m.kind === "exhaustion" && Number.isInteger(m.level)
      ? L(`${pick(m.label, "it")} ${m.level}`, `${pick(m.label, "en")} ${m.level}`)
      : copy(m.label ?? L("Condizione", "Condition"));
  return partOf(label, m.value, m.source ?? null);
}
/** Advantage and Disadvantage together cancel out (SRD 5.2.1 EN 7–8 / IT 8). */
export function combineModes(...modes) {
  const advantage = modes.includes("advantage");
  const disadvantage = modes.includes("disadvantage");
  return advantage && !disadvantage
    ? "advantage"
    : disadvantage && !advantage
      ? "disadvantage"
      : "normal";
}

// Per-character roll policy (PG-48; Roll20 "Manage Sheet" roll queries and whisper, Beyond20
// "Type of Roll"). It lives in the dice tray's slice (B34), which edits it; the engine reads
// it here so every surface applies it.
export const POLICY_D20 = Object.freeze(["normal", "ask", "advantage", "disadvantage"]);
export const POLICY_AUDIENCES = Object.freeze(["public", "gm", "blind", "self"]);
/** The character's roll policy, or nulls where the player's personal default applies. */
export function rollPolicy(state, actorId) {
  const raw = state?.ext?.["dice-tray"]?.policies?.[actorId] ?? null;
  return {
    d20: POLICY_D20.includes(raw?.d20) ? raw.d20 : null,
    audience: POLICY_AUDIENCES.includes(raw?.audience) ? raw.audience : null,
    autoDamage: raw?.autoDamage === true,
  };
}
/**
 * The mode a D20 Test is rolled with: the one chosen (or, when none is chosen, the
 * character's "always advantage/disadvantage"), joined with the conditions' reasons.
 */
export function effectiveRollMode(profile, chosen = "normal") {
  if (profile?.noD20) return "normal";
  const policy = profile?.policy?.d20;
  const base =
    chosen === "normal" && (policy === "advantage" || policy === "disadvantage") ? policy : chosen;
  const reasons = profile?.conditionReasons;
  return combineModes(
    base,
    reasons?.advantage?.length ? "advantage" : "normal",
    reasons?.disadvantage?.length ? "disadvantage" : "normal",
  );
}
/** The parts that name a condition's Advantage or Disadvantage ("Avvelenato: svantaggio"). */
function modeParts(cond) {
  const row = (reason, it, en) =>
    partOf(
      L(`${pick(reason.name, "it")}: ${it}`, `${pick(reason.name, "en")}: ${en}`),
      null,
      null,
      true,
    );
  return [
    ...cond.advantage.map((r) => row(r, "vantaggio", "advantage")),
    ...cond.disadvantage.map((r) => row(r, "svantaggio", "disadvantage")),
    ...cond.autoFail.map((r) => row(r, "fallimento automatico", "automatic failure")),
  ];
}
function withConditions(profile, cond, state, actorId) {
  const hasReasons = cond.advantage.length || cond.disadvantage.length;
  return {
    ...profile,
    parts: [...profile.parts, ...modeParts(cond)],
    conditionReasons: hasReasons
      ? { advantage: copy(cond.advantage), disadvantage: copy(cond.disadvantage) }
      : null,
    autoFail: copy(cond.autoFail),
    policy: rollPolicy(state, actorId),
  };
}
/** Riders of a D20 Test kind: saves read save riders, every other test check riders. */
export const riderKindOf = (kind) =>
  kind === "save" ? "save" : kind === "attack" ? "attack" : "check";
/**
 * The D20 Test as the dice tray and the requests describe it ({kind, ability, skill}):
 * modifier with its named sources (sheet parts, then conditions), riders, conditions and
 * policy. The same numbers as rollProfile, in the tray's vocabulary.
 */
export function testProfile(state, actorId, { kind, ability, skill } = {}) {
  const subject = kind === "skill" ? skill : kind === "initiative" ? "initiative" : ability;
  const profile = rollProfile(state, actorId, kind, subject);
  return {
    ...profile,
    ability: testAbility(state, actorId, { kind, ability, skill }),
    sources: profile.parts
      .filter((part) => Number.isFinite(part.value) && !part.plain)
      .map((part) => ({
        label: copy(part.label),
        value: part.value,
        ...(part.source ? { source: copy(part.source) } : {}),
      })),
  };
}

// ------------------------------------------------------------------------------ roll profiles

/** What a roll adds: modifier with parts, riders, label, conditions and roll policy. Kinds:
 *  save, skill, check, initiative, attack (a combat action or sheet attack). */
export function rollProfile(state, actorId, kind, subject) {
  const actor = getEffectiveActor(state.actors[actorId]);
  if (kind === "save") {
    const stat = statValue(state, actorId, "save:" + subject);
    return withConditions(
      {
        kind,
        subject,
        label: stat.name,
        modifier: stat.total,
        parts: summaryParts(stat),
        riders: activeRiders(state, actorId, "save"),
      },
      testConditions(state, actorId, { kind: "save", ability: subject }),
      state,
      actorId,
    );
  }
  if (kind === "skill") {
    const key = "skill:" + subject;
    const stat = statValue(state, actorId, key);
    const ability = testAbility(state, actorId, { kind, skill: subject });
    return withConditions(
      {
        kind,
        subject,
        label: L(
          `Prova di ${ABILITY_NAMES[ability]?.it ?? ""} (${pick(stat.name, "it")})`,
          `${ABILITY_NAMES[ability]?.en ?? ""} (${pick(stat.name, "en")}) check`,
        ),
        modifier: stat.total,
        parts: summaryParts(stat),
        riders: activeRiders(state, actorId, "check"),
      },
      testConditions(state, actorId, { kind: "skill", skill: subject }),
      state,
      actorId,
    );
  }
  if (kind === "check") {
    const m = abilityMod(actor.abilities?.[subject]) ?? 0;
    const cond = testConditions(state, actorId, { kind: "check", ability: subject });
    const extra = cond.modifierSources.map(conditionPart);
    return withConditions(
      {
        kind,
        subject,
        label: L(`Prova di ${ABILITY_NAMES[subject].it}`, `${ABILITY_NAMES[subject].en} check`),
        modifier: m + extra.reduce((sum, part) => sum + part.value, 0),
        parts: [partOf(ABILITY_NAMES[subject], m), ...extra],
        riders: activeRiders(state, actorId, "check"),
      },
      cond,
      state,
      actorId,
    );
  }
  if (kind === "initiative") {
    const stat = statValue(state, actorId, "initiative");
    return withConditions(
      {
        kind,
        subject: "initiative",
        label: L("Iniziativa", "Initiative"),
        modifier: stat.total,
        parts: summaryParts(stat),
        riders: activeRiders(state, actorId, "check"),
      },
      testConditions(state, actorId, { kind: "initiative" }),
      state,
      actorId,
    );
  }
  if (kind === "rider") {
    // The die of an active effect alone (a roll outside any test; the Table's engine and
    // the tray already add it to the attack or save it rides on).
    const rider = activeRiders(state, actorId, "attack")
      .concat(activeRiders(state, actorId, "save"), activeRiders(state, actorId, "check"))
      .find((row) => row.id === subject && row.dice);
    if (!rider) throw fail("Effetto non attivo.", "Effect not active.");
    return {
      kind,
      subject,
      label: L(`${rider.name.it}: dado dell’effetto`, `${rider.name.en}: effect die`),
      modifier: 0,
      parts: [],
      riders: [rider],
      noD20: true,
    };
  }
  if (kind === "attack") {
    const attack = sheetAttacks(state, actorId).find((row) => row.id === subject);
    if (!attack) throw fail("Attacco non disponibile.", "Attack unavailable.");
    const cond = attackConditions(state, actorId);
    const extra = cond.modifierSources.map(conditionPart);
    return withConditions(
      {
        kind,
        subject,
        label: L(`Tiro per colpire · ${attack.name.it}`, `Attack roll · ${attack.name.en}`),
        modifier: attack.toHit + extra.reduce((sum, part) => sum + part.value, 0),
        parts: [...attack.parts, ...extra],
        riders: activeRiders(state, actorId, "attack"),
        damage: {
          dice: copy(attack.dice),
          modifier: attack.damageModifier ?? 0,
          type: attack.damageType ?? null,
        },
      },
      cond,
      state,
      actorId,
    );
  }
  throw fail("Tiro sconosciuto.", "Unknown roll.");
}
function summaryParts(stat) {
  const parts = stat.baseParts.map((row) => ({ ...row }));
  for (const step of stat.steps)
    if (step.applied)
      parts.push(
        partOf(
          L(`${OP_NAMES[step.op].it}: ${step.note}`, `${OP_NAMES[step.op].en}: ${step.note}`),
          step.op === "add" ? step.value : step.after - step.before,
        ),
      );
  return [
    ...parts,
    ...(stat.itemParts ?? []).map((p) => ({ ...p })),
    ...(stat.conditionParts ?? []).map((p) => ({ ...p })),
  ];
}

/**
 * Attacks the sheet can roll without a target (D&D Beyond "to hit"): the attack actions the
 * combat engine lists for this actor, with the same base formula (ability + proficiency).
 * Hit and damage against a creature stay the Table's combat engine.
 */
export function sheetAttacks(state, actorId) {
  const actor = getEffectiveActor(state.actors[actorId]);
  let actions = [];
  try {
    actions = listActions(state, actorId);
  } catch {
    actions = [];
  }
  const pb = proficiencyBonus(actor).value;
  const casting = actor.combatProfile?.spellcastingAbility ?? null;
  return actions
    .filter((row) => row.kind === "attack")
    .map((row) => {
      let parts;
      if (Array.isArray(row.attackParts))
        // BI-24: an inventory weapon built by the combat engine names its own parts.
        parts = row.attackParts.map((part) => partOf(part.label, part.value, part.source ?? null));
      else if (Number.isFinite(row.attackModifier)) {
        // PG-37 (P2 shared edit): D&D Beyond names each part of a configured attack: the
        // ability (Strength, or the better of Strength and Dexterity for a Finesse weapon),
        // the Proficiency Bonus when the rest matches it, and what remains as another bonus.
        const def = weaponDefinition(
          (actor.inventory ?? []).find((item) => item.id === row.itemId) ?? null,
          row.id,
        );
        const str = abilityMod(actor.abilities?.str) ?? 0;
        const dex = abilityMod(actor.abilities?.dex) ?? 0;
        const finesse = def?.weapon?.properties?.includes("finesse");
        const ranged = def?.weapon?.type === "ranged" || row.attackType === "ranged";
        const key = ranged ? "dex" : finesse && dex > str ? "dex" : "str";
        const m = key === "dex" ? dex : str;
        const rest = row.attackModifier - m;
        parts = [partOf(ABILITY_NAMES[key], m)];
        if (rest === pb)
          parts.push(partOf(L("Competenza", "Proficiency"), pb, SOURCES.proficiency));
        else if (rest > pb) {
          parts.push(partOf(L("Competenza", "Proficiency"), pb, SOURCES.proficiency));
          parts.push(
            partOf(L("Bonus dell’arma o del profilo", "Weapon or profile bonus"), rest - pb),
          );
        } else if (rest !== 0) parts.push(partOf(L("Altri modificatori", "Other modifiers"), rest));
      } else if (row.spell) {
        const m = abilityMod(actor.abilities?.[casting]) ?? 0;
        parts = [
          partOf(ABILITY_NAMES[casting] ?? L("Caratteristica", "Ability"), m),
          partOf(L("Competenza", "Proficiency"), pb),
        ];
      } else {
        const m = abilityMod(actor.abilities?.str) ?? 0;
        const proficient = actor.combatProfile?.weaponProficiencies?.includes(row.id) ?? false;
        parts = [partOf(ABILITY_NAMES.str, m)];
        if (proficient) parts.push(partOf(L("Competenza", "Proficiency"), pb));
      }
      // BI-24 (FG Forge, dnd5e Enchant): the weapon item's own bonus (a forged +1) is named
      // in the attack and added to its damage, as the Table's engine does.
      const itemBonus = (target) =>
        (row.itemBonuses ?? []).filter((bonus) => bonus.target === target);
      for (const bonus of itemBonus("attack"))
        parts.push(partOf(copy(bonus.label), bonus.value, bonus.source ?? null));
      const damageBonus = itemBonus("damage").reduce((sum, bonus) => sum + bonus.value, 0);
      return {
        id: row.id,
        name: copy(row.name),
        summary: copy(row.shortDescription ?? L("", "")),
        economy: row.cost?.bonus ? "bonus" : row.cost?.reaction ? "reaction" : "action",
        toHit: parts.reduce((sum, part) => sum + (part.value ?? 0), 0),
        parts,
        dice: copy(row.dice ?? []),
        // Weapon damage adds the attack's ability modifier; a cantrip's does not (SRD 5.2.1
        // "Damage Rolls", EN 16 / IT 18). A configured profile's bonus is unknown here.
        damageModifier:
          damageBonus +
          (Array.isArray(row.attackParts)
            ? (row.damageModifier ?? 0)
            : Number.isFinite(row.attackModifier)
              ? 0
              : row.spell
                ? 0
                : (abilityMod(actor.abilities?.str) ?? 0)),
        damageType: row.damageType ?? null,
        rangeMeters: row.rangeMeters ?? null,
        source: row.source ?? null,
        itemId: row.itemId ?? null,
      };
    });
}

// ------------------------------------------------------------------------------ actions list

function spellEconomy(spell) {
  const def = SPELLS.find(
    (row) => row.slug === spell.catalogId || row.slug === spell.combatActionId,
  );
  const unit = def?.castingTime?.unit;
  return {
    economy:
      unit === "action"
        ? "action"
        : unit === "bonus-action" || unit === "bonus"
          ? "bonus"
          : unit === "reaction"
            ? "reaction"
            : "other",
    summary: def?.summary ?? null,
    source: def?.source ?? null,
  };
}
/**
 * The Actions tab list (D&D Beyond DDB-039): attacks the engine knows, other combat actions,
 * spells by casting time, potions (a Bonus Action to drink, as the sheet already applies),
 * features with limited uses, and the 2024 generic actions with their descriptions.
 */
export function actionList(state, actorId) {
  const actor = getEffectiveActor(state.actors[actorId]);
  const rows = [];
  const attacks = sheetAttacks(state, actorId);
  for (const attack of attacks)
    rows.push({
      ref: { kind: "attack", id: attack.id },
      name: attack.name,
      summary: attack.summary,
      economy: attack.economy,
      attack: true,
      limited: false,
      toHit: attack.toHit,
      source: attack.source,
    });
  let engine = [];
  try {
    engine = listActions(state, actorId);
  } catch {
    engine = [];
  }
  const attackIds = new Set(attacks.map((row) => row.id));
  const spellIds = new Set();
  for (const row of engine) {
    if (attackIds.has(row.id) || GENERIC_ACTIONS.some((g) => g.id === row.id)) continue;
    spellIds.add(row.id);
    rows.push({
      ref: { kind: "engine", id: row.id },
      name: copy(row.name),
      summary: copy(row.shortDescription ?? L("", "")),
      economy: row.cost?.bonus ? "bonus" : row.cost?.reaction ? "reaction" : "action",
      attack: false,
      limited: Boolean(row.cost?.slotLevel),
      source: row.source ?? null,
    });
  }
  for (const spell of actor.spells ?? []) {
    if (spell.level > 0 && spell.prepared === false) continue;
    if (spellIds.has(spell.combatActionId) || attackIds.has(spell.combatActionId)) continue;
    const info = spellEconomy(spell);
    rows.push({
      ref: { kind: "spell", id: spell.id },
      name: copy(spell.name),
      summary: info.summary ?? L("", ""),
      economy: info.economy,
      attack: false,
      limited: spell.level > 0,
      source: info.source,
    });
  }
  for (const item of actor.inventory ?? [])
    if (item.healing && item.quantity > 0 && item.location !== "ground")
      rows.push({
        ref: { kind: "item", id: item.id },
        name: copy(item.name),
        summary: L("Bevi: 2d4 + 2 PF, azione bonus.", "Drink: 2d4 + 2 HP, Bonus Action."),
        economy: "bonus",
        attack: false,
        limited: true,
        uses: { used: null, max: item.quantity },
        source: null,
      });
  for (const feature of actor.features ?? []) {
    if (!(Number.isInteger(feature.max) && feature.max > 0)) continue;
    const def = String(feature.definitionId ?? feature.id ?? "");
    const economy =
      Object.entries(FEATURE_ECONOMY).find(([suffix]) => def.endsWith(suffix))?.[1] ?? "other";
    rows.push({
      ref: { kind: "feature", id: feature.id },
      name: copy(feature.name),
      summary:
        typeof feature.description === "object" || typeof feature.description === "string"
          ? feature.description
          : L("", ""),
      economy,
      attack: false,
      limited: true,
      uses: { used: feature.used ?? 0, max: feature.max },
      source: feature.source ?? null,
    });
  }
  for (const generic of [...GENERIC_ACTIONS, ...GENERIC_REACTIONS])
    rows.push({
      ref: { kind: "generic", id: generic.id },
      name: copy(generic.name),
      summary: copy(generic.summary),
      economy: generic.economy,
      attack: generic.id === "attack",
      limited: false,
      generic: true,
      source: generic.source,
    });
  return rows;
}
export function filterActions(rows, filter) {
  if (filter === "attack") return rows.filter((row) => row.attack);
  if (filter === "limited") return rows.filter((row) => row.limited);
  if (["action", "bonus", "reaction", "other"].includes(filter))
    return rows.filter((row) => row.economy === filter);
  return rows;
}
/** Spends one use of a limited feature (the same counter "Manage" edits on the sheet). */
export function spendFeatureUse(draft, actorId, featureId, role) {
  const actor = controlled(draft, actorId, role);
  const feature = (actor.features ?? []).find((row) => row.id === featureId);
  if (!feature || !Number.isInteger(feature.max))
    throw fail("Capacità senza contatore.", "Feature without a counter.");
  if ((feature.used ?? 0) >= feature.max)
    throw fail(
      "Nessun uso rimasto: si recupera con il riposo indicato.",
      "No uses left: they come back with the stated rest.",
    );
  feature.used = (feature.used ?? 0) + 1;
  return feature;
}

// ------------------------------------------------------------------------------ favourites

export const FAVORITE_KINDS = [
  "skill",
  "save",
  "check",
  "attack",
  "engine",
  "spell",
  "item",
  "feature",
  "generic",
  "initiative",
];
const sameRef = (a, b) => a?.kind === b?.kind && a?.id === b?.id;
export function isFavorite(state, actorId, ref) {
  return (entryOf(state, actorId)?.favorites ?? []).some((row) => sameRef(row, ref));
}
export function toggleFavorite(draft, actorId, ref, role) {
  controlled(draft, actorId, role);
  if (!FAVORITE_KINDS.includes(ref?.kind) || typeof ref.id !== "string" || !ref.id)
    throw fail("Elemento non valido.", "Invalid entry.");
  const entry = ensureEntry(draft, actorId);
  const index = entry.favorites.findIndex((row) => sameRef(row, ref));
  if (index >= 0) {
    entry.favorites.splice(index, 1);
    return false;
  }
  if (entry.favorites.length >= 24) throw fail("Massimo 24 preferiti.", "At most 24 favourites.");
  entry.favorites.push({ kind: ref.kind, id: ref.id });
  return true;
}
export function moveFavorite(draft, actorId, ref, delta, role) {
  controlled(draft, actorId, role);
  const entry = ensureEntry(draft, actorId);
  const index = entry.favorites.findIndex((row) => sameRef(row, ref));
  const target = index + delta;
  if (index < 0 || target < 0 || target >= entry.favorites.length) return false;
  const [row] = entry.favorites.splice(index, 1);
  entry.favorites.splice(target, 0, row);
  return true;
}
/** Favourites resolved against the live sheet; a missing entry stays listed as unavailable
 *  (dnd5e keeps favourites whose item is still there, FVT-009). */
export function resolveFavorites(state, actorId) {
  const actor = getEffectiveActor(state.actors[actorId]);
  const entry = entryOf(state, actorId);
  const actions = actionList(state, actorId);
  return (entry?.favorites ?? []).map((ref) => {
    if (ref.kind === "skill") {
      if (ref.id.startsWith("custom:")) {
        const row = entry.customSkills.find((s) => s.id === ref.id.slice(7));
        return row
          ? {
              ref,
              name: L(row.name, row.name),
              value: statValue(state, actorId, "skill:" + ref.id).total,
              available: true,
            }
          : { ref, name: L("Abilità rimossa", "Removed skill"), available: false };
      }
      const def = SKILLS.find((s) => s.id === ref.id);
      return def
        ? {
            ref,
            name: copy(def.name),
            value: statValue(state, actorId, "skill:" + ref.id).total,
            available: true,
          }
        : { ref, name: L("Abilità", "Skill"), available: false };
    }
    if (ref.kind === "save")
      return ABILITIES.includes(ref.id)
        ? {
            ref,
            name: L(`TS ${ABILITY_SHORT[ref.id].it}`, `${ABILITY_SHORT[ref.id].en} save`),
            value: statValue(state, actorId, "save:" + ref.id).total,
            available: true,
          }
        : { ref, name: L("TS", "Save"), available: false };
    if (ref.kind === "check")
      return ABILITIES.includes(ref.id)
        ? {
            ref,
            name: copy(ABILITY_NAMES[ref.id]),
            // The one engine's number (conditions included), as the roll it starts.
            value: rollProfile(state, actorId, "check", ref.id).modifier,
            available: true,
          }
        : { ref, name: L("Prova", "Check"), available: false };
    if (ref.kind === "initiative")
      return {
        ref,
        name: L("Iniziativa", "Initiative"),
        value: statValue(state, actorId, "initiative").total,
        available: true,
      };
    const row = actions.find((a) => sameRef(a.ref, ref));
    if (row)
      return {
        ref,
        name: copy(row.name),
        value: row.attack && Number.isFinite(row.toHit) ? row.toHit : null,
        uses: row.uses ?? null,
        economy: row.economy,
        available: true,
      };
    return { ref, name: L("Non più disponibile", "No longer available"), available: false };
  });
}

// ------------------------------------------------------------------------------ skills

export function skillRows(state, actorId) {
  const entry = entryOf(state, actorId);
  const favorites = entry?.favorites ?? [];
  const rows = SKILLS.map((def) => {
    const stat = statValue(state, actorId, "skill:" + def.id);
    return {
      id: def.id,
      key: "skill:" + def.id,
      name: copy(def.name),
      ability: def.ability,
      total: stat.total,
      proficient: stat.proficient,
      modded: stat.mods.length > 0,
      drift: stat.drift,
      favorite: favorites.some((row) => row.kind === "skill" && row.id === def.id),
      custom: false,
    };
  });
  const custom = (entry?.customSkills ?? []).map((row) => {
    const stat = statValue(state, actorId, "skill:custom:" + row.id);
    return {
      id: "custom:" + row.id,
      key: "skill:custom:" + row.id,
      name: L(row.name, row.name),
      ability: row.ability,
      total: stat.total,
      proficient: row.proficiency !== "none",
      proficiency: row.proficiency,
      modded: stat.mods.length > 0,
      favorite: favorites.some((f) => f.kind === "skill" && f.id === "custom:" + row.id),
      custom: true,
      note: row.note,
    };
  });
  // D&D Beyond app pins favourite skills to the top (DDB-028), in favourite order.
  const order = (row) => {
    const index = favorites.findIndex((f) => f.kind === "skill" && f.id === row.id);
    return index < 0 ? Infinity : index;
  };
  const pinned = [...rows, ...custom]
    .filter((row) => row.favorite)
    .sort((a, b) => order(a) - order(b));
  return {
    pinned,
    standard: rows.filter((row) => !row.favorite),
    custom: custom.filter((row) => !row.favorite),
  };
}
export function addCustomSkill(draft, actorId, input, role) {
  controlled(draft, actorId, role);
  const name = String(input?.name ?? "").trim();
  if (!name || name.length > 60) throw fail("Dai un nome all’abilità.", "Name the skill.");
  if (!ABILITIES.includes(input?.ability))
    throw fail("Scegli la caratteristica.", "Choose the ability.");
  const proficiency = PROFICIENCY_LEVELS.includes(input?.proficiency) ? input.proficiency : "none";
  const bonus = Number(input?.bonus ?? 0);
  if (!Number.isInteger(bonus) || Math.abs(bonus) > 10)
    throw fail("Il bonus concordato va da −10 a +10.", "The agreed bonus goes from −10 to +10.");
  const entry = ensureEntry(draft, actorId);
  if (
    entry.customSkills.some((row) => row.name.toLocaleLowerCase() === name.toLocaleLowerCase()) ||
    SKILLS.some((row) =>
      [row.name.it, row.name.en].some((n) => n.toLocaleLowerCase() === name.toLocaleLowerCase()),
    )
  )
    throw fail("Esiste già un’abilità con questo nome.", "A skill with this name already exists.");
  const row = {
    id: input?.id ?? newId("skill"),
    name,
    ability: input.ability,
    proficiency,
    bonus,
    note: String(input?.note ?? "")
      .trim()
      .slice(0, 200),
    by: role,
  };
  entry.customSkills.push(row);
  return row;
}
export function removeCustomSkill(draft, actorId, skillId, role) {
  controlled(draft, actorId, role);
  const entry = ensureEntry(draft, actorId);
  const index = entry.customSkills.findIndex((row) => row.id === skillId);
  if (index < 0) throw fail("Abilità non trovata.", "Skill not found.");
  const [row] = entry.customSkills.splice(index, 1);
  delete entry.mods["skill:custom:" + skillId];
  entry.favorites = entry.favorites.filter(
    (f) => !(f.kind === "skill" && f.id === "custom:" + skillId),
  );
  return row;
}

// ------------------------------------------------------------------------------ defenses

const targetName = (target) => {
  if (target.startsWith("condition:")) {
    const row = CONDITIONS.find((c) => c.id === target.slice(10));
    return row ? copy(row.name) : L(target, target);
  }
  return copy(LABELS.damageType[target] ?? L(target, target));
};
export const defenseTargetName = targetName;
const validTarget = (kind, target) =>
  typeof target === "string" &&
  (DAMAGE_TYPES.includes(target) ||
    (kind === "immunity" &&
      target.startsWith("condition:") &&
      CONDITIONS.some((c) => c.id === target.slice(10))));
/** D&D Beyond Manage Defenses (DDB-031): duplicates collapse into one chip listing every
 *  source; an entry without a rule source (custom) carries an asterisk. */
export function collapsedDefenses(state, actorId) {
  const entry = entryOf(state, actorId);
  const groups = new Map();
  for (const row of entry?.defenses ?? []) {
    const key = row.kind + "|" + row.target;
    if (!groups.has(key))
      groups.set(key, {
        kind: row.kind,
        target: row.target,
        name: targetName(row.target),
        sources: [],
      });
    groups.get(key).sources.push({
      id: row.id,
      kind: row.source?.kind ?? "custom",
      name: row.source?.name ?? "",
      note: row.note ?? "",
      custom: (row.source?.kind ?? "custom") === "custom",
    });
  }
  // Defenses the Table already applies from elsewhere are listed too, with their origin
  // (damage-domain.mjs defensesOf): the DM's record, the sheet (builder, encounter builder)
  // or the SRD stat block linked from the compendium.
  const actor = state.actors[actorId];
  const mine = entry?.appliedDefenses?.added ?? {};
  const table = defensesOf(state, actorId);
  const origin =
    table.origin === "block" ? "block" : table.origin === "recorded" ? "dm-record" : "sheet";
  // Entries copied from the stat block when the sheet first wrote its own keep that origin.
  const seeded = entry?.appliedDefenses?.seeded ?? {};
  const blockName = table.blockName ?? entry?.appliedDefenses?.blockName ?? null;
  const external = [
    ...["resistances", "immunities", "vulnerabilities"].flatMap((bag) =>
      (table[bag] ?? [])
        .filter((target) => origin === "dm-record" || !(mine[bag] ?? []).includes(target))
        .map((target) => ({
          kind:
            bag === "resistances"
              ? "resistance"
              : bag === "immunities"
                ? "immunity"
                : "vulnerability",
          target,
          origin: origin === "sheet" && (seeded[bag] ?? []).includes(target) ? "block" : origin,
        })),
    ),
    ...(Array.isArray(actor?.conditionImmunities) ? actor.conditionImmunities : [])
      .filter((id) => !(mine.conditionImmunities ?? []).includes(id))
      .map((id) => ({ kind: "immunity", target: "condition:" + id, origin: "sheet" })),
  ];
  for (const row of external) {
    const key = row.kind + "|" + row.target;
    if (!groups.has(key))
      groups.set(key, {
        kind: row.kind,
        target: row.target,
        name: targetName(row.target),
        sources: [],
      });
    groups.get(key).sources.push({
      id: null,
      kind: row.origin,
      name: "",
      block: row.origin === "block" ? copy(blockName) : null,
      note: "",
      custom: false,
    });
  }
  return [...groups.values()].map((group) => ({
    ...group,
    custom: group.sources.every((s) => s.custom),
    marker: group.sources.every((s) => s.custom) ? "*" : "",
  }));
}
function reconcileDefenses(draft, actorId) {
  const actor = draft.actors[actorId];
  const entry = ensureEntry(draft, actorId);
  const want = { resistances: [], immunities: [], vulnerabilities: [], conditionImmunities: [] };
  for (const row of entry.defenses) {
    if (row.target.startsWith("condition:")) want.conditionImmunities.push(row.target.slice(10));
    else
      want[
        row.kind === "resistance"
          ? "resistances"
          : row.kind === "immunity"
            ? "immunities"
            : "vulnerabilities"
      ].push(row.target);
  }
  const previous = entry.appliedDefenses ?? { added: {}, conditionMissing: null, created: false };
  const added = {};
  let created = Boolean(previous.created);
  let seeded = previous.seeded ?? null;
  let blockName = previous.blockName ?? null;
  if (!isObject(actor.damageDefenses)) {
    // Written for the first time: start from what the Table applied so far (a linked SRD
    // stat block), so one added entry never drops the creature's own defenses.
    const table = defensesOf(draft, actorId);
    const fromBlock = table.origin === "block";
    actor.damageDefenses = Object.fromEntries(
      ["resistances", "immunities", "vulnerabilities"].map((bag) => [
        bag,
        fromBlock ? [...table[bag]] : [],
      ]),
    );
    created = true;
    if (fromBlock) {
      seeded = copy(actor.damageDefenses);
      blockName = copy(table.blockName ?? null);
    }
  }
  for (const bag of ["resistances", "immunities", "vulnerabilities"]) {
    const current = Array.isArray(actor.damageDefenses[bag]) ? actor.damageDefenses[bag] : [];
    const external = current.filter((v) => !(previous.added[bag] ?? []).includes(v));
    const mine = [...new Set(want[bag])];
    added[bag] = mine.filter((v) => !external.includes(v));
    actor.damageDefenses[bag] = [...external, ...added[bag]];
  }
  const conditionMissing = previous.conditionMissing ?? !Array.isArray(actor.conditionImmunities);
  const currentConditions = Array.isArray(actor.conditionImmunities)
    ? actor.conditionImmunities
    : [];
  const externalConditions = currentConditions.filter(
    (v) => !(previous.added.conditionImmunities ?? []).includes(v),
  );
  const mineConditions = [...new Set(want.conditionImmunities)];
  added.conditionImmunities = mineConditions.filter((v) => !externalConditions.includes(v));
  const nextConditions = [...externalConditions, ...added.conditionImmunities];
  if (!nextConditions.length && conditionMissing) delete actor.conditionImmunities;
  else actor.conditionImmunities = nextConditions;
  if (!entry.defenses.length) {
    // Nothing of ours left: a record we created goes, so the stat block applies again.
    if (created) delete actor.damageDefenses;
    entry.appliedDefenses = null;
  } else entry.appliedDefenses = { added, conditionMissing, created, seeded, blockName };
}
export function addDefense(draft, actorId, input, role, now = new Date().toISOString()) {
  controlled(draft, actorId, role);
  const kind = String(input?.kind ?? "");
  if (!DEFENSE_KINDS.includes(kind))
    throw fail("Scegli il tipo di difesa.", "Choose the kind of defense.");
  const target = String(input?.target ?? "");
  if (!validTarget(kind, target))
    throw fail(
      "Scegli un tipo di danno (o una condizione, solo per l’immunità).",
      "Choose a damage type (or a condition, for immunity only).",
    );
  const sourceKind = SOURCE_KINDS.includes(input?.sourceKind) ? input.sourceKind : "custom";
  const sourceName = String(input?.sourceName ?? "")
    .trim()
    .slice(0, 80);
  const note = String(input?.note ?? "")
    .trim()
    .slice(0, 200);
  if (sourceKind !== "custom" && !sourceName)
    throw fail(
      "Scrivi la fonte (oggetto, incantesimo, specie…).",
      "Write the source (item, spell, species…).",
    );
  if (sourceKind === "custom" && !note)
    throw fail(
      "Per una difesa personalizzata scrivi il motivo o l’accordo.",
      "For a custom defense write the reason or agreement.",
    );
  const entry = ensureEntry(draft, actorId);
  const row = {
    id: input?.id ?? newId("def"),
    kind,
    target,
    source: { kind: sourceKind, name: sourceName },
    note,
    by: role,
    at: now,
  };
  entry.defenses.push(row);
  reconcileDefenses(draft, actorId);
  return row;
}
export function removeDefense(draft, actorId, defenseId, role) {
  controlled(draft, actorId, role);
  const entry = ensureEntry(draft, actorId);
  const index = entry.defenses.findIndex((row) => row.id === defenseId);
  if (index < 0) throw fail("Difesa già tolta.", "Defense already removed.");
  const [row] = entry.defenses.splice(index, 1);
  reconcileDefenses(draft, actorId);
  return row;
}

// ------------------------------------------------------------------------------ speeds and senses

export function speedsOf(state, actorId) {
  const actor = getEffectiveActor(state.actors[actorId]);
  const canonical = state.actors[actorId];
  const out = { walk: Number.isFinite(canonical?.speed) ? canonical.speed : null };
  const special = actor?.activeForm ? (actor.speeds ?? {}) : (canonical?.speeds ?? {});
  if (actor?.activeForm && Number.isFinite(special.walk)) out.walk = special.walk;
  for (const mode of SPEED_MODES.slice(1))
    out[mode] = Number.isFinite(special[mode]) && special[mode] > 0 ? special[mode] : null;
  return out;
}
export function currentMovementMode(state, actorId) {
  const mode = state.actors[actorId]?.movementMode;
  const speeds = speedsOf(state, actorId);
  return mode && mode !== "walk" && Number.isFinite(speeds[mode]) ? mode : "walk";
}
/** D&D Beyond speed window (DDB-030): every movement mode in metres; 0 or empty removes it. */
export function setSpeeds(draft, actorId, input, role) {
  const actor = controlled(draft, actorId, role);
  // In a form the form's speeds apply (the dialog locks their fields): the sheet's own
  // special speeds are kept for the return, and only the one shown at the top may change.
  if (actor.activeForm) {
    if (SPEED_MODES.slice(1).some((mode) => ![undefined, null, ""].includes(input?.[mode])))
      throw fail(
        "Durante una forma valgono le velocità della forma: cambia quelle della scheda dopo il ritorno.",
        "While in a form the form’s speeds apply: change the sheet’s after returning.",
      );
    const entry = ensureEntry(draft, actorId);
    if (SPEED_MODES.includes(input?.display)) entry.speedDisplay = input.display;
    return { speeds: copy(actor.speeds ?? {}), display: entry.speedDisplay };
  }
  const next = {};
  for (const mode of SPEED_MODES.slice(1)) {
    const raw = input?.[mode];
    if (raw === "" || raw === null || raw === undefined) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 300 || Math.round(value * 2) !== value * 2)
      throw fail(
        "Le velocità vanno da 0 a 300 m, a mezzi metri.",
        "Speeds go from 0 to 300 m, in half metres.",
      );
    if (value > 0) next[mode] = value;
  }
  const before = getEffectiveSpeed(actor);
  if (Object.keys(next).length) actor.speeds = next;
  else delete actor.speeds;
  if (actor.movementMode && actor.movementMode !== "walk" && !next[actor.movementMode]) {
    delete actor.movementMode;
    if (draft.combat?.active)
      actor.movement = getEffectiveMovementBudget(actor, before, getEffectiveSpeed(actor));
  }
  const entry = ensureEntry(draft, actorId);
  const display = SPEED_MODES.includes(input?.display) ? input.display : entry.speedDisplay;
  entry.speedDisplay = display === "walk" || next[display] ? display : "walk";
  return { speeds: copy(next), display: entry.speedDisplay };
}
/**
 * Chooses the speed used to move (SRD "Speed", EN 188 / IT 218): switching during a move
 * subtracts the distance already moved from the new speed; with nothing left it is refused.
 */
export function setMovementMode(draft, actorId, mode, role) {
  const actor = controlled(draft, actorId, role);
  if (!SPEED_MODES.includes(mode)) throw fail("Velocità sconosciuta.", "Unknown speed.");
  const speeds = speedsOf(draft, actorId);
  if (mode !== "walk" && !Number.isFinite(speeds[mode]))
    throw fail("Questa velocità non è sulla scheda.", "This speed is not on the sheet.");
  const before = getEffectiveSpeed(actor);
  const previous = actor.movementMode;
  if (mode === "walk") delete actor.movementMode;
  else actor.movementMode = mode;
  const after = getEffectiveSpeed(actor);
  if (draft.combat?.active && Number.isFinite(before) && Number.isFinite(after)) {
    const budget = getEffectiveMovementBudget(actor, before, after);
    if (budget <= 0 && (actor.movementSpent ?? 0) > 0) {
      if (previous) actor.movementMode = previous;
      else delete actor.movementMode;
      throw fail(
        "Hai già percorso questa distanza: con la nuova velocità non resta movimento.",
        "You already moved that far: the new speed leaves no movement.",
      );
    }
    if (!Number.isFinite(actor.movementSpent))
      actor.movementSpent = Math.max(
        0,
        before * (1 + (actor.dashCount ?? 0)) - (actor.movement ?? before),
      );
    actor.movement = budget;
  }
  return { mode: actor.movementMode ?? "walk", speed: after };
}
export function sensesOf(state, actorId, tableSenses = null) {
  const entry = entryOf(state, actorId);
  const actor = getEffectiveActor(state.actors[actorId]);
  const out = {};
  for (const sense of SENSES) {
    const sheet = Number.isFinite(entry?.senses?.[sense]) ? entry.senses[sense] : null;
    const form =
      actor?.activeForm && Number.isFinite(actor.senses?.[sense]) ? actor.senses[sense] : null;
    const table =
      Number.isFinite(tableSenses?.[sense]) && tableSenses[sense] > 0 ? tableSenses[sense] : null;
    out[sense] = { sheet, form, table, value: form ?? sheet ?? table };
  }
  return out;
}
export function setSenses(draft, actorId, input, role) {
  controlled(draft, actorId, role);
  const entry = ensureEntry(draft, actorId);
  const next = {};
  for (const sense of SENSES) {
    const raw = input?.[sense];
    if (raw === "" || raw === null || raw === undefined) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 300)
      throw fail("I sensi vanno da 0 a 300 m.", "Senses go from 0 to 300 m.");
    if (value > 0) next[sense] = value;
  }
  entry.senses = next;
  entry.senseDisplay =
    SENSES.includes(input?.display) && next[input.display] ? input.display : null;
  return next;
}

// ------------------------------------------------------------------------------ notes

/** Notes this identity may read: sheet notes with the sheet, "Only me" notes to their author. */
export function readableNotes(state, actorId, role) {
  const actor = state.actors[actorId];
  if (!actor || !canViewActor(actor, role, state)) return [];
  return (entryOf(state, actorId)?.notes ?? []).filter(
    (row) => row.audience !== "me" || row.author === role,
  );
}
export function addNote(draft, actorId, input, role, now = new Date().toISOString()) {
  const actor = readable(draft, actorId, role);
  const audience = input?.audience === "me" ? "me" : "sheet";
  if (audience === "sheet" && !canControlActor(actor, role, draft))
    throw fail(
      "Sulla scheda altrui puoi scrivere solo note «Solo io».",
      "On someone else’s sheet you can only write “Only me” notes.",
    );
  const section = NOTE_SECTIONS.includes(input?.section) ? input.section : "other";
  const title = String(input?.title ?? "").trim();
  if (!title || title.length > 80)
    throw fail("Scrivi un titolo (fino a 80 caratteri).", "Write a title (up to 80 characters).");
  const text = String(input?.text ?? "")
    .trim()
    .slice(0, 4000);
  const entry = ensureEntry(draft, actorId);
  const row = {
    id: input?.id ?? newId("note"),
    section,
    title,
    text,
    audience,
    author: role,
    at: now,
  };
  entry.notes.push(row);
  return row;
}
export function updateNote(draft, actorId, noteId, input, role, now = new Date().toISOString()) {
  readable(draft, actorId, role);
  const entry = ensureEntry(draft, actorId);
  const row = entry.notes.find((n) => n.id === noteId);
  if (!row || (row.audience === "me" && row.author !== role))
    throw fail("Nota non disponibile.", "Note unavailable.");
  if (row.audience !== "me" && !canControlActor(draft.actors[actorId], role, draft))
    throw fail("Non puoi modificare questa nota.", "You cannot edit this note.");
  const title = String(input?.title ?? row.title).trim();
  if (!title || title.length > 80)
    throw fail("Scrivi un titolo (fino a 80 caratteri).", "Write a title (up to 80 characters).");
  row.title = title;
  row.text = String(input?.text ?? row.text)
    .trim()
    .slice(0, 4000);
  if (NOTE_SECTIONS.includes(input?.section)) row.section = input.section;
  row.updatedAt = now;
  return row;
}
export function removeNote(draft, actorId, noteId, role) {
  readable(draft, actorId, role);
  const entry = ensureEntry(draft, actorId);
  const index = entry.notes.findIndex((n) => n.id === noteId);
  const row = entry.notes[index];
  if (!row || (row.audience === "me" && row.author !== role))
    throw fail("Nota non disponibile.", "Note unavailable.");
  if (row.audience !== "me" && !canControlActor(draft.actors[actorId], role, draft))
    throw fail("Non puoi togliere questa nota.", "You cannot remove this note.");
  entry.notes.splice(index, 1);
  return row;
}

// ------------------------------------------------------------------------------ experience

export const xpThreshold = (level) => XP_THRESHOLDS[Math.min(20, Math.max(1, level)) - 1];
/** Experience for display (DDB-024 Manage Experience; SRD Character Advancement EN 23 / IT 25). */
export function xpView(state, actorId) {
  const actor = state.actors[actorId];
  const entry = entryOf(state, actorId);
  const level = Number.isInteger(actor?.level) ? actor.level : 1;
  const recorded = Number.isInteger(actor?.xp);
  const xp = recorded ? actor.xp : xpThreshold(level);
  const mode = entry?.advancement?.mode === "milestone" ? "milestone" : "xp";
  const floor = xpThreshold(level);
  const needed = level >= 20 ? null : xpThreshold(level + 1);
  const ready = mode === "xp" && needed !== null && xp >= needed;
  const proposed = entry?.advancement?.proposedLevel ?? null;
  // The level the sheet can reach with this XP (a big award may skip past one level).
  let reachable = level;
  while (reachable < 20 && xp >= xpThreshold(reachable + 1)) reachable++;
  return {
    mode,
    level,
    xp,
    recorded,
    floor,
    needed,
    ready,
    reachable,
    pct:
      needed === null
        ? 100
        : Math.max(
            0,
            Math.min(100, Math.round((100 * (xp - floor)) / Math.max(1, needed - floor))),
          ),
    milestones: copy(entry?.advancement?.milestones ?? []),
    proposedLevel: mode === "milestone" && proposed && proposed > level ? proposed : null,
  };
}
export function addXp(draft, actorId, amount, role) {
  const actor = controlled(draft, actorId, role);
  const value = Number(amount);
  if (!Number.isInteger(value) || value === 0 || Math.abs(value) > 400000)
    throw fail(
      "Inserisci un numero intero di PE, positivo o negativo.",
      "Enter a whole number of XP, positive or negative.",
    );
  const before = Number.isInteger(actor.xp) ? actor.xp : xpThreshold(actor.level ?? 1);
  const after = before + value;
  if (after < 0 || after > 1_000_000)
    throw fail("I PE non possono scendere sotto 0.", "XP cannot go below 0.");
  actor.xp = after;
  return { before, after, inferred: !Number.isInteger(draft.actors[actorId].xp) };
}
export function setXp(draft, actorId, value, reason, role) {
  const actor = controlled(draft, actorId, role);
  const xp = Number(value);
  if (!Number.isInteger(xp) || xp < 0 || xp > 1_000_000)
    throw fail(
      "I PE devono essere un intero non negativo.",
      "XP must be a non-negative whole number.",
    );
  const why = String(reason ?? "").trim();
  if (!why)
    throw fail("Scrivi il motivo della correzione.", "Write the reason for the correction.");
  const before = Number.isInteger(actor.xp) ? actor.xp : xpThreshold(actor.level ?? 1);
  actor.xp = xp;
  return { before, after: xp, reason: why };
}
export function setAdvancementMode(draft, actorId, mode, role) {
  controlled(draft, actorId, role);
  if (!["xp", "milestone"].includes(mode)) throw fail("Modalità sconosciuta.", "Unknown mode.");
  const entry = ensureEntry(draft, actorId);
  entry.advancement.mode = mode;
  if (mode === "xp") entry.advancement.proposedLevel = null;
  return mode;
}
/** Milestone levelling (I-123): the DM records a milestone and may propose the next level. */
export function recordMilestone(draft, actorId, input, role, now = new Date().toISOString()) {
  const actor = readable(draft, actorId, role);
  if (role !== "dm")
    throw fail(
      "I traguardi del gruppo li registra il DM.",
      "The DM records the group’s milestones.",
    );
  const title = String(input?.title ?? "").trim();
  if (!title || title.length > 100)
    throw fail("Scrivi il traguardo raggiunto.", "Write the milestone reached.");
  const entry = ensureEntry(draft, actorId);
  if (entry.advancement.mode !== "milestone")
    throw fail(
      "La scheda avanza a PE: passa ai traguardi prima.",
      "The sheet advances by XP: switch to milestones first.",
    );
  const propose = Boolean(input?.propose) && (actor.level ?? 1) < 20;
  const row = {
    id: input?.id ?? newId("milestone"),
    title,
    by: role,
    at: now,
    proposedLevel: propose ? (actor.level ?? 1) + 1 : null,
  };
  entry.advancement.milestones.push(row);
  if (propose) entry.advancement.proposedLevel = (actor.level ?? 1) + 1;
  return row;
}

// ------------------------------------------------------------------------------ reselect

/** Choices to reselect after a rest (Shard VTL-017), including the Druid's known-form
 *  replacement that the forms domain already opens after a Long Rest (SRD EN 42 / IT 48). */
export function reselectState(state, actorId) {
  const entry = entryOf(state, actorId);
  const rows = (entry?.reselect ?? []).map((row) => {
    const kinds = row.trigger === "short" ? ["short", "long"] : ["long"];
    const rest = latestRest(state, actorId, kinds);
    const key = restKey(rest);
    return { ...copy(row), pending: Boolean(key && key !== row.handled), restKey: key };
  });
  const forms = state.actors[actorId]?.formsProfile;
  const external =
    forms?.knownFormReplacement && !forms.knownFormReplacement.used
      ? [
          {
            id: "forms-known",
            external: "forms",
            name: L("Forme conosciute (Forma selvatica)", "Known forms (Wild Shape)"),
            trigger: "long",
            pending: true,
            source: SOURCES.knownForms,
          },
        ]
      : [];
  return [...rows, ...external];
}
export function pendingReselect(state, actorId) {
  return reselectState(state, actorId).filter((row) => row.pending);
}
export function addReselect(draft, actorId, input, role, now = new Date().toISOString()) {
  controlled(draft, actorId, role);
  const name = String(input?.name ?? "").trim();
  if (!name || name.length > 60) throw fail("Dai un nome alla scelta.", "Name the choice.");
  const trigger = input?.trigger === "short" ? "short" : "long";
  const options = [
    ...new Set(
      String(input?.options ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ].slice(0, 30);
  if (options.length < 2)
    throw fail(
      "Scrivi almeno due opzioni, separate da virgole.",
      "Write at least two options, separated by commas.",
    );
  const chosen = [
    ...new Set(
      String(input?.chosen ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
  if (!chosen.length || chosen.some((c) => !options.includes(c)))
    throw fail(
      "Le scelte attuali devono essere tra le opzioni.",
      "Current choices must be among the options.",
    );
  const changeLimit = Number(input?.changeLimit ?? 1);
  const entry = ensureEntry(draft, actorId);
  // One stable id per option text, unique even when two names slug alike or have no
  // Latin letters ("Città"/"Citt", "✦"); the current choices use the same ids.
  const ids = new Map();
  for (const text of options) {
    const slug =
      text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "option";
    const taken = new Set(ids.values());
    let id = slug;
    for (let n = 2; taken.has(id); n++) id = `${slug}-${n}`;
    ids.set(text, id);
  }
  const toId = (text) => ids.get(text);
  const row = {
    id: input?.id ?? newId("reselect"),
    name: L(name, name),
    trigger,
    count: chosen.length,
    changeLimit:
      Number.isInteger(changeLimit) && changeLimit >= 1 ? Math.min(changeLimit, chosen.length) : 1,
    options: options.map((text) => ({ id: toId(text), name: L(text, text) })),
    chosen: chosen.map(toId),
    source: null,
    note: String(input?.note ?? "")
      .trim()
      .slice(0, 200),
    handled: restKey(
      latestRest(draft, actorId, trigger === "short" ? ["short", "long"] : ["long"]),
    ),
    history: [],
    by: role,
    at: now,
  };
  entry.reselect.push(row);
  return row;
}
export function removeReselect(draft, actorId, reselectId, role) {
  controlled(draft, actorId, role);
  const entry = ensureEntry(draft, actorId);
  const index = entry.reselect.findIndex((row) => row.id === reselectId);
  if (index < 0) throw fail("Scelta non trovata.", "Choice not found.");
  return entry.reselect.splice(index, 1)[0];
}
/** Keeps or changes the choices after the rest; at most changeLimit of them change. */
export function resolveReselect(
  draft,
  actorId,
  reselectId,
  input,
  role,
  now = new Date().toISOString(),
) {
  controlled(draft, actorId, role);
  const entry = ensureEntry(draft, actorId);
  const row = entry.reselect.find((r) => r.id === reselectId);
  if (!row) throw fail("Scelta non trovata.", "Choice not found.");
  const kinds = row.trigger === "short" ? ["short", "long"] : ["long"];
  const key = restKey(latestRest(draft, actorId, kinds));
  if (!key || key === row.handled)
    throw fail(
      row.trigger === "short"
        ? "Serve un riposo completato dopo l’ultima scelta."
        : "Serve un riposo lungo completato dopo l’ultima scelta.",
      row.trigger === "short"
        ? "A rest completed after the last choice is required."
        : "A Long Rest completed after the last choice is required.",
    );
  const next = input?.keep ? [...row.chosen] : [...new Set(input?.chosen ?? [])];
  if (next.length !== row.count || next.some((id) => !row.options.some((o) => o.id === id)))
    throw fail(`Scegli esattamente ${row.count} opzioni.`, `Choose exactly ${row.count} options.`);
  const changed = next.filter((id) => !row.chosen.includes(id)).length;
  if (changed > row.changeLimit)
    throw fail(
      `Dopo il riposo puoi cambiare ${row.changeLimit === 1 ? "una sola scelta" : row.changeLimit + " scelte"}.`,
      `After the rest you can change ${row.changeLimit === 1 ? "only one choice" : row.changeLimit + " choices"}.`,
    );
  row.history.push({ at: now, by: role, from: [...row.chosen], to: [...next], restKey: key });
  row.chosen = next;
  row.handled = key;
  return { changed, row };
}

// ------------------------------------------------------------------------------ rolls

const d20Count = (rollMode) => (rollMode === "advantage" || rollMode === "disadvantage" ? 2 : 1);
/** The dice of a roll: d20 (two with advantage/disadvantage) and each rider's dice. */
export function rollDice(profile, rollMode = "normal") {
  const dice = [];
  if (!profile.noD20)
    for (let i = 0; i < d20Count(rollMode); i++) dice.push({ sides: 20, role: "d20" });
  for (const rider of profile.riders)
    if (rider.dice)
      for (let i = 0; i < rider.dice.count; i++)
        dice.push({ sides: rider.dice.sides, role: "rider", riderId: rider.id, sign: rider.sign });
  return dice;
}
/** The damage faces of the withdrawn roll whose faces this retry reuses (I-229). */
const withdrawnDamage = (records, retryKey, reusedFrom) =>
  reusedFrom ? (records.rolls.find((r) => r.id === reusedFrom)?.damage?.values ?? null) : null;
const retryKeyOf = (role, actorId, kind, subject, rollMode, riders) =>
  [role, actorId, kind, subject, rollMode, riders.map((r) => r.id).join("+")].join("|");
/** Records a roll: physical faces entered, or digital faces from the core dice service
 *  (state.mjs rollDie). After an Undo removed its result, an identical digital retry reuses
 *  the withdrawn faces once (I-229); accepted faces never change. */
export function recordRoll(
  draft,
  actorId,
  {
    kind,
    subject,
    mode,
    rollMode = "normal",
    faces = [],
    die = rollDie,
    id = newId("sroll"),
    now = new Date().toISOString(),
    audience: chosenAudience = null,
    faceModes = null,
    devices = null,
  },
  role,
) {
  const actor = controlled(draft, actorId, role);
  // Who sees it (PG-48): the audience chosen for this roll, else the character's policy;
  // a personal sheet stays its owner's. The DM's hidden roll is "self" (Solo DM).
  let audience = POLICY_AUDIENCES.includes(chosenAudience)
    ? chosenAudience
    : (rollPolicy(draft, actorId).audience ?? "public");
  // Close review 01/10 (privacy P1-3; Fantasy Grounds, Roll20 NPC whisper): a roll the DM
  // makes for a creature hidden from the players starts hidden unless one is chosen.
  if (
    !POLICY_AUDIENCES.includes(chosenAudience) &&
    actor.owner !== "player" &&
    role !== "player" &&
    hiddenFromPlayers(draft, actorId)
  )
    audience = "self";
  if (role === "dm" && (audience === "gm" || audience === "blind")) audience = "self";
  if (isPersonal(actor)) audience = "self";
  if (!["digital", "physical"].includes(mode))
    throw fail("Scegli dadi digitali o fisici.", "Choose digital or physical dice.");
  if (!["normal", "advantage", "disadvantage"].includes(rollMode)) rollMode = "normal";
  const profile = rollProfile(draft, actorId, kind, subject);
  if (profile.autoFail?.length) {
    const names = (lang) => profile.autoFail.map((r) => pick(r.name, lang)).join(", ");
    throw fail(
      `${actor.name} fallisce automaticamente questo tiro salvezza (${names("it")}): non serve tirare.`,
      `${actor.name} automatically fails this saving throw (${names("en")}): no roll is needed.`,
    );
  }
  if (profile.noD20) rollMode = "normal";
  const chosenMode = rollMode;
  // One engine (PG-23): the conditions and the character's roll policy join the chosen mode.
  rollMode = effectiveRollMode(profile, chosenMode);
  if (mode === "physical" && d20Count(rollMode) !== d20Count(chosenMode)) {
    const why = (lang) =>
      [
        ...(profile.conditionReasons?.advantage ?? []),
        ...(profile.conditionReasons?.disadvantage ?? []),
      ]
        .map((r) => pick(r.name, lang))
        .join(", ") || (lang === "it" ? "politica dei tiri" : "roll policy");
    const adv = rollMode === "advantage";
    throw fail(
      d20Count(rollMode) === 2
        ? `Questo tiro è ${adv ? "con vantaggio" : "con svantaggio"} (${why("it")}): scegli «${adv ? "Vantaggio" : "Svantaggio"}» e inserisci due d20.`
        : `Vantaggio e svantaggio si annullano (${why("it")}): scegli «Normale» e inserisci un solo d20.`,
      d20Count(rollMode) === 2
        ? `This roll has ${rollMode} (${why("en")}): choose “${adv ? "Advantage" : "Disadvantage"}” and enter two d20s.`
        : `Advantage and disadvantage cancel out (${why("en")}): choose “Normal” and enter one d20.`,
    );
  }
  const dice = rollDice(profile, rollMode);
  const records = draft.ext?.[ROLLS];
  if (!records) throw fail("Registro dei tiri non pronto.", "Roll log not ready.");
  const entry = ensureEntry(draft, actorId);
  const retryKey = retryKeyOf(role, actorId, kind, subject, rollMode, profile.riders);
  let values,
    status = "accepted",
    reusedFrom = null;
  if (mode === "physical") {
    values = dice.map((d, i) => Number(faces[i]));
    if (values.some((v, i) => !Number.isInteger(v) || v < 1 || v > dice[i].sides))
      throw fail(
        "Inserisci ogni faccia naturale dei dadi fisici (d20 da 1 a 20, d4 da 1 a 4…).",
        "Enter each natural face of the physical dice (d20 from 1 to 20, d4 from 1 to 4…).",
      );
  } else {
    const live = new Set(
      Object.values(draft.ext[ID].actors).flatMap((e) => (e.results ?? []).map((r) => r.rollId)),
    );
    const withdrawn = records.rolls.find(
      (r) =>
        r.retryKey === retryKey &&
        r.mode === "digital" &&
        !r.reusedBy &&
        !r.settled &&
        !live.has(r.id) &&
        r.status !== "reused-source",
    );
    if (withdrawn) {
      values = [...withdrawn.values];
      status = "reused";
      reusedFrom = withdrawn.id;
      withdrawn.reusedBy = id;
    } else values = dice.map((d) => die(d.sides));
    if (values.some((v, i) => !Number.isInteger(v) || v < 1 || v > dice[i].sides))
      throw Error("The dice service returned an invalid face");
  }
  const d20s = values.filter((_, i) => dice[i].role === "d20");
  const natural = !d20s.length
    ? null
    : rollMode === "advantage"
      ? Math.max(...d20s)
      : rollMode === "disadvantage"
        ? Math.min(...d20s)
        : d20s[0];
  const riderTotal =
    values.reduce((sum, v, i) => sum + (dice[i].role === "rider" ? dice[i].sign * v : 0), 0) +
    profile.riders.reduce((sum, r) => sum + (r.flat ? r.sign * r.flat : 0), 0);
  const total = (natural ?? 0) + profile.modifier + riderTotal;
  // PG-48 "critico automatico" (Beyond20 / Roll20 "auto roll damage & crit"): a digital sheet
  // attack also rolls its damage, with the damage dice rolled twice on a natural 20 (SRD
  // 5.2.1 Critical Hits, EN 16 / IT 18). Hit or miss is the target's AC: the DM decides.
  let damage = null;
  if (
    kind === "attack" &&
    mode === "digital" &&
    profile.policy?.autoDamage &&
    profile.damage?.dice?.length
  ) {
    const critical = natural === 20;
    const sides = profile.damage.dice.flatMap((d) =>
      Array.from({ length: d.count * (critical ? 2 : 1) }, () => d.sides),
    );
    const known = withdrawnDamage(records, retryKey, reusedFrom);
    const dvalues = sides.map((n, i) =>
      Number.isInteger(known?.[i]) && known[i] >= 1 && known[i] <= n ? known[i] : die(n),
    );
    damage = {
      sides,
      values: dvalues,
      modifier: profile.damage.modifier ?? 0,
      total: dvalues.reduce((sum, v) => sum + v, 0) + (profile.damage.modifier ?? 0),
      critical,
      type: profile.damage.type ?? null,
    };
  }
  const record = {
    id,
    at: now,
    by: role,
    actorId,
    actorName: actor.name,
    kind,
    subject,
    label: copy(profile.label),
    mode,
    rollMode,
    dice: dice.map((d) => ({
      sides: d.sides,
      role: d.role,
      riderId: d.riderId ?? null,
      sign: d.sign ?? 1,
    })),
    values,
    natural,
    modifier: profile.modifier,
    riders: profile.riders.map((r) => ({
      id: r.id,
      name: copy(r.name),
      sign: r.sign,
      dice: r.dice ? copy(r.dice) : null,
      flat: r.flat,
    })),
    riderTotal,
    total,
    status,
    retryKey,
    // What made it up (PG-23 / TV-87): the named parts, the chosen mode and why it changed.
    parts: copy(profile.parts ?? []),
    chosenMode,
    ...(profile.conditionReasons ? { conditionReasons: copy(profile.conditionReasons) } : {}),
    audience,
    visibility: audience === "public" ? "shared" : "private",
    ...(damage ? { damage } : {}),
    ...(reusedFrom ? { reusedFrom } : {}),
    // TV-95: the origin of each physical face and the connected dice that reported them.
    ...(mode === "physical" && Array.isArray(faceModes) && faceModes.length === values.length
      ? { faceModes: [...faceModes] }
      : {}),
    ...(mode === "physical" && Array.isArray(devices) && devices.length
      ? { devices: copy(devices) }
      : {}),
  };
  records.rolls.push(record);
  if (records.rolls.length > MAX_ROLLS) records.rolls.splice(0, records.rolls.length - MAX_ROLLS);
  entry.results.push({ rollId: id, at: now });
  // An accepted result that leaves the recent list stays accepted: marked settled, it is
  // neither shown as undone nor offered to a retry (only an Undo withdraws a result).
  if (entry.results.length > MAX_RESULTS)
    for (const old of entry.results.splice(0, entry.results.length - MAX_RESULTS)) {
      const row = records.rolls.find((r) => r.id === old.rollId);
      if (row) row.settled = true;
    }
  return record;
}
/** Whether this identity reads a sheet roll: public, its roller, the DM for "Io e il DM" and
 *  "Solo il DM" (Foundry roll modes); a blind roll is hidden from its roller too. */
export function canReadRoll(record, role) {
  const audience = record.audience ?? (record.visibility === "private" ? "self" : "public");
  if (audience === "public") return true;
  if (audience === "blind") return role === "dm";
  if (audience === "gm") return role === "dm" || record.by === role;
  return record.by === role;
}
/** Rolls of an actor visible to this identity, newest first, each marked live or withdrawn. */
export function visibleRolls(state, actorId, role, limit = 8) {
  const actor = state.actors[actorId];
  if (!actor || !canViewActor(actor, role, state)) return [];
  const live = new Set((entryOf(state, actorId)?.results ?? []).map((r) => r.rollId));
  return (rollsOf(state)?.rolls ?? [])
    .filter((r) => r.actorId === actorId && canReadRoll(r, role))
    .slice(-limit)
    .reverse()
    .map((r) => ({ ...copy(r), live: live.has(r.id) || Boolean(r.settled) }));
}
/** The roll as the session log and the dice overlay read it (projects' shape). The log card
 *  keeps the named parts, the dropped d20 and the audience (TV-87, Foundry chat log). */
export function logRollOf(record) {
  const groups = [];
  for (const d of record.dice) {
    const last = groups.at(-1);
    if (last && last.sides === d.sides && last.role === d.role) last.count++;
    else groups.push({ count: 1, sides: d.sides, role: d.role });
  }
  // The d20 kept with Advantage/Disadvantage; the other is struck (DDB, BG3 roll detail).
  let keptD20 = false;
  const kept = record.values.map((v, i) => {
    if (record.dice[i]?.role !== "d20") return true;
    if (!keptD20 && v === record.natural) {
      keptD20 = true;
      return true;
    }
    return false;
  });
  const audience = record.audience ?? (record.visibility === "private" ? "self" : "public");
  // The log's reader rule (registry rollVisibleTo): owner or controller reads a private roll.
  const [owner, controller] =
    audience === "blind"
      ? ["dm", "dm"]
      : audience === "gm"
        ? [record.by, "dm"]
        : [record.by, record.by];
  const riderNames = new Map(record.riders.map((r) => [r.id, r.name]));
  return {
    id: record.id,
    source: ID,
    kind: record.kind,
    actorId: record.actorId,
    actorName: record.actorName,
    actionName: copy(record.label),
    label: copy(record.label),
    formula: `${record.natural === null ? "" : `${d20Count(record.rollMode)}d20${record.rollMode === "advantage" ? "kh1" : record.rollMode === "disadvantage" ? "kl1" : ""}${record.modifier ? `${record.modifier < 0 ? "−" : "+"}${Math.abs(record.modifier)}` : ""}`}${record.riders.map((r) => (r.dice ? `${r.sign < 0 ? "−" : "+"}${r.dice.count}d${r.dice.sides}` : "")).join("")}`,
    controller,
    owner,
    visibility: audience === "public" ? "shared" : "private",
    audience,
    mode: record.mode,
    dice: groups.map(({ count, sides }) => ({ count, sides })),
    values: [...record.values],
    kept,
    faces: record.values.map((value, i) => ({
      value,
      sides: record.dice[i]?.sides ?? null,
      kept: kept[i],
      ...(record.dice[i]?.role === "rider"
        ? { label: copy(riderNames.get(record.dice[i].riderId) ?? null), sign: record.dice[i].sign }
        : {}),
    })),
    ...(record.natural === null ? {} : { natural: record.natural }),
    modifier: record.modifier,
    sources: (record.parts ?? [])
      .filter((p) => Number.isFinite(p.value) && !p.plain)
      .map((p) => ({ label: copy(p.label), value: p.value })),
    notes: (record.parts ?? [])
      .filter((p) => p.plain && !Number.isFinite(p.value))
      .map((p) => copy(p.label)),
    total: record.total,
    rollMode: record.rollMode,
    ...(record.damage ? { damage: copy(record.damage) } : {}),
    ...(record.faceModes ? { faceModes: [...record.faceModes] } : {}),
    ...(record.devices ? { devices: copy(record.devices) } : {}),
    status: record.status === "reused" ? "reused" : "accepted",
  };
}
