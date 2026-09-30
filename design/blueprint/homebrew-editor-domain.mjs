// B48 — Deep homebrew editor: pure domain (no DOM). The UI is homebrew-editor.mjs.
//
// Structured behaviour lives in `revision.data.structured` of the existing Library
// (homebrew.mjs owns immutable revisions, drafts, sharing, campaign enablement and sheet
// copies; B48 added only the optional `structured` field to its schema). This module adds:
// - sub-forms after the base form (D&D Beyond DDB-173): prerequisites as AND of OR groups,
//   options "choose N of M", modifiers with Roll20's explicit stacking order (R20-023);
// - dnd5e activities (Identity / Activation / Effect, FVT-180) and effects whose duration
//   is picked from Fantasy Grounds-style anchors (R20-161, FVT-182) mapped onto the
//   existing condition terms (conditions.mjs), so the Table expires them;
// - dnd5e advancement (grants, scale values, ASI, choices, FVT-181) applied level by level;
// - a monster creator with D&D Beyond sections and toggles (DDB-174), Tetra-cube presets
//   (CMP-152) and rollable blocks (DDB-110); a Kobold+ style CSV/JSON importer (CMP-112);
// - the Fantasy Grounds Forge (base item + template, R20-118) and copy-to-edit with
//   "revert to source" (R20-114);
// - campaign safe mode and Find the Culprit bisection (FVT-198), automation level per
//   entry (R20-185) and simulated publishing with immutable versions (DDB-175/176/177/178,
//   SVC-136).
// Rules baseline: D&D 2024, SRD 5.2.1 (EN/IT). Nothing here infers a rule from prose.

import * as hb from "./homebrew.mjs";
import * as srd from "./srd-sample.mjs";
import {
  feats as RULE_FEATS,
  classes as RULE_CLASSES,
  skills as RULE_SKILLS,
  species as RULE_SPECIES,
  backgrounds as RULE_BACKGROUNDS,
  ruleSource,
} from "./character-rules.mjs";
import { canControlActor, canViewActor, isCampaignActor } from "./character-access.mjs";
import {
  applyConditionEvent,
  combatTurnKey,
  conditionSaveRules,
  listConditionDefinitions,
} from "./conditions.mjs";
import { applyConditionFollowUps } from "./combat.mjs";
import { getEffectiveActor } from "./forms-companions.mjs";
import { createSceneNPC, placeSceneToken } from "./preparation.mjs";
import { parseDice } from "./srd-compendium.mjs";

export const ID = "homebrew-editor";
export const ROLLS = "homebrew-editor-rolls";
export const VERSION = 1;
export const L = (it, en) => ({ it, en });
const copy = (value) => structuredClone(value);
const object = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const list = (value) => (Array.isArray(value) ? value : []);
const now = () => new Date().toISOString();
const int = (value, min = -Infinity, max = Infinity) =>
  Number.isInteger(value) && value >= min && value <= max;
const text = (value) => (typeof value === "string" ? value : "");
const bilingual = (value) =>
  object(value) ? { it: text(value.it), en: text(value.en) } : { it: "", en: "" };
const pick = (value, lang = "it") =>
  object(value) ? value[lang] || value.it || value.en || "" : String(value ?? "");
export const newId = (prefix = "hb") =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)}`;

// A refusal with both languages; the UI shows the current one.
export function refusal(it, en) {
  return Object.assign(new Error(`${it} / ${en}`), { it, en });
}
const fail = (it, en) => {
  throw refusal(it, en);
};

// ---------------------------------------------------------------- sources

export const SRD = Object.freeze({
  savingThrow: srd.srdSource([187], [218]),
  // Save DC = 8 + ability modifier + Proficiency Bonus (the page combat.mjs cites for the
  // save-based Burning Hands and its caster's save DC).
  // EN page only (the one combat.mjs cites); the IT page is not verified here.
  saveDc: ruleSource(105),
  monsterDeath: srd.srdSource([17], [19]),
  weaponPlus: srd.srdSource([253], [243]),
  armorPlus: srd.srdSource([210], [243]),
});
export function homebrewSource(ref, name) {
  return {
    kind: "homebrew",
    edition: "2024",
    revision: ref.revisionId,
    contentId: ref.contentId,
    label: name || ref.contentId,
  };
}

// ---------------------------------------------------------------- catalogues

export const ABILITIES = Object.freeze(["str", "dex", "con", "int", "wis", "cha"]);
export const ABILITY_SHORT = Object.freeze({
  str: L("For", "Str"),
  dex: L("Des", "Dex"),
  con: L("Cos", "Con"),
  int: L("Int", "Int"),
  wis: L("Sag", "Wis"),
  cha: L("Car", "Cha"),
});
export const abilityName = (id) => srd.LABELS.ability[id] ?? L(id, id);

// D&D Beyond "Create" links (DDB-171) plus a full class (Roll20 R20-022, Shard).
export const CREATE_KINDS = Object.freeze([
  { id: "feat", type: "feat", name: L("Talento", "Feat") },
  { id: "subclass", type: "subclass", name: L("Sottoclasse", "Subclass") },
  { id: "class", type: "class", name: L("Classe", "Class") },
  { id: "species", type: "species", name: L("Specie", "Species") },
  { id: "background", type: "background", name: L("Background", "Background") },
  { id: "spell", type: "spell", name: L("Incantesimo", "Spell") },
  { id: "magic-item", type: "weapon", name: L("Oggetto magico", "Magic item"), forge: true },
  { id: "monster", type: "creature", name: L("Mostro", "Monster") },
]);

export const SUBFORMS = Object.freeze({
  identity: L("Identità e fonte", "Identity and source"),
  prerequisites: L("Prerequisiti", "Prerequisites"),
  options: L("Opzioni", "Options"),
  modifiers: L("Modificatori", "Modifiers"),
  activities: L("Attività", "Activities"),
  advancement: L("Avanzamento", "Advancement"),
  item: L("Oggetto", "Item"),
  statblock: L("Blocco statistiche", "Stat block"),
});
const TYPE_SUBFORMS = {
  feat: ["identity", "prerequisites", "options", "modifiers", "activities"],
  feature: ["identity", "prerequisites", "options", "modifiers", "activities"],
  species: ["identity", "options", "modifiers", "advancement", "activities"],
  background: ["identity", "options", "modifiers", "advancement"],
  class: ["identity", "advancement", "activities"],
  subclass: ["identity", "advancement", "modifiers", "activities"],
  spell: ["identity", "activities"],
  weapon: ["identity", "item", "modifiers", "activities"],
  armor: ["identity", "item", "modifiers", "activities"],
  item: ["identity", "item", "modifiers", "activities"],
  consumable: ["identity", "item", "activities"],
  creature: ["identity", "statblock"],
};
export const subformsFor = (type) => TYPE_SUBFORMS[type] ?? ["identity", "modifiers", "activities"];

// Roll20 Modifier Builder targets (R20-023). Automated targets change the live sheet;
// the others are declared and shown as manual (never a pretend automation).
export const MODIFIER_TARGETS = Object.freeze([
  { id: "ac", name: L("Classe Armatura", "Armor Class"), automated: true },
  { id: "speed", name: L("Velocità (m)", "Speed (m)"), automated: true },
  ...ABILITIES.map((id) => ({ id, name: abilityName(id), automated: true })),
  { id: "initiative", name: L("Iniziativa", "Initiative"), automated: false },
  { id: "saves", name: L("Tiri salvezza", "Saving throws"), automated: false },
  { id: "attack", name: L("Tiri per colpire", "Attack rolls"), automated: false },
  { id: "damage", name: L("Danni", "Damage"), automated: false },
  { id: "maxHp", name: L("Punti ferita massimi", "Hit point maximum"), automated: false },
  { id: "passive", name: L("Percezione passiva", "Passive Perception"), automated: false },
  // BI-18 (Roll20 Modifier Builder, DDB modifiers): a skill, an ability's checks or saves,
  // for a bonus or for Advantage/Disadvantage («vantaggio alle prove di Percezione»).
  ...RULE_SKILLS.map((k) => ({
    id: `skill:${k.id}`,
    name: L(`Prove di ${k.name.it}`, `${k.name.en} checks`),
    automated: false,
    d20: true,
  })),
  ...ABILITIES.map((a) => ({
    id: `check:${a}`,
    name: L(`Prove di ${abilityName(a).it}`, `${abilityName(a).en} checks`),
    automated: false,
    d20: true,
  })),
  ...ABILITIES.map((a) => ({
    id: `save:${a}`,
    name: L(`Tiri salvezza su ${abilityName(a).it}`, `${abilityName(a).en} saving throws`),
    automated: false,
    d20: true,
  })),
]);
// d20 targets: where Advantage and Disadvantage make sense.
const D20_TARGETS = new Set(["initiative", "saves", "attack"]);
export const isD20Target = (id) => D20_TARGETS.has(id) || Boolean(targetInfo(id)?.d20);
const targetInfo = (id) => MODIFIER_TARGETS.find((t) => t.id === id);
// Explicit stacking order of the Roll20 Modifier Builder: set base → add → min/max →
// multiply → override.
export const MODIFIER_MODES = Object.freeze([
  { id: "set-base", name: L("Imposta base", "Set base") },
  { id: "add", name: L("Somma", "Add") },
  { id: "min", name: L("Valore minimo", "Minimum value") },
  { id: "max", name: L("Valore massimo", "Maximum value") },
  { id: "multiply", name: L("Moltiplica", "Multiply") },
  { id: "override", name: L("Sostituisci", "Override") },
  { id: "advantage", name: L("Vantaggio", "Advantage") },
  { id: "disadvantage", name: L("Svantaggio", "Disadvantage") },
]);
export const ROLL_MODES = Object.freeze(["advantage", "disadvantage"]);
// BI-18 (DDB «feats can scale»): a bonus fixed or multiplied by the character's level,
// half level or Proficiency Bonus.
export const MODIFIER_SCALES = Object.freeze([
  { id: "fixed", name: L("Valore fisso", "Fixed value") },
  { id: "level", name: L("× livello del personaggio", "× character level") },
  { id: "half-level", name: L("× metà livello (per difetto)", "× half level (rounded down)") },
  { id: "proficiency", name: L("× bonus di competenza", "× Proficiency Bonus") },
]);
export function resolveModifierValue(m, sheet = {}) {
  const level = Math.max(1, Number(sheet.level) || 1);
  const pb = sheet.proficiencyBonus ?? proficiencyFor(level);
  const factor =
    m?.scale === "level"
      ? level
      : m?.scale === "half-level"
        ? Math.floor(level / 2)
        : m?.scale === "proficiency"
          ? pb
          : 1;
  return (Number(m?.value) || 0) * factor;
}

// dnd5e activity types (FVT-180) and how far this prototype runs them.
export const ACTIVITY_TYPES = Object.freeze([
  { id: "save", name: L("Tiro salvezza", "Saving throw"), automation: "full" },
  { id: "attack", name: L("Attacco", "Attack"), automation: "partial" },
  { id: "damage", name: L("Danno", "Damage"), automation: "partial" },
  { id: "heal", name: L("Cura", "Heal"), automation: "partial" },
  { id: "summon", name: L("Evoca", "Summon"), automation: "manual" },
  { id: "transform", name: L("Trasforma", "Transform"), automation: "manual" },
  { id: "utility", name: L("Utilità", "Utility"), automation: "manual" },
]);
export const ACTIVATIONS = Object.freeze([
  { id: "action", name: L("Azione", "Action"), resource: "action" },
  { id: "bonus", name: L("Azione bonus", "Bonus action"), resource: "bonus" },
  { id: "reaction", name: L("Reazione", "Reaction"), resource: "reaction" },
  { id: "none", name: L("Nessun costo", "No cost"), resource: null },
]);
// Duration anchors offered as choices (Fantasy Grounds R20-161; Foundry 6.0 durations
// such as "until the start of the target's next turn", FVT-182), mapped onto the
// existing condition terms that the Table expires (conditions.mjs termFor).
export const DURATION_ANCHORS = Object.freeze([
  {
    id: "start-next-self",
    name: L("Fino all’inizio del tuo prossimo turno", "Until the start of your next turn"),
  },
  {
    id: "end-next-self",
    name: L("Fino alla fine del tuo prossimo turno", "Until the end of your next turn"),
  },
  { id: "end-current-self", name: L("Fino alla fine del tuo turno", "Until the end of your turn") },
  {
    id: "start-next-target",
    name: L(
      "Fino all’inizio del prossimo turno del bersaglio",
      "Until the start of the target’s next turn",
    ),
  },
  {
    id: "end-next-target",
    name: L(
      "Fino alla fine del prossimo turno del bersaglio",
      "Until the end of the target’s next turn",
    ),
  },
  {
    id: "short-rest",
    name: L(
      "Fino a un riposo breve o lungo del bersaglio",
      "Until the target finishes a Short or Long Rest",
    ),
  },
  {
    id: "long-rest",
    name: L("Fino a un riposo lungo del bersaglio", "Until the target finishes a Long Rest"),
  },
  { id: "manual", name: L("Finché non viene rimossa", "Until removed") },
]);
// The anchor with the creatures' names, for messages read by someone else than the caster.
export function anchorWithNames(id, casterName, targetName) {
  const map = {
    "start-next-self": L(
      `fino all’inizio del prossimo turno di ${casterName}`,
      `until the start of ${casterName}’s next turn`,
    ),
    "end-next-self": L(
      `fino alla fine del prossimo turno di ${casterName}`,
      `until the end of ${casterName}’s next turn`,
    ),
    "end-current-self": L(
      `fino alla fine del turno di ${casterName}`,
      `until the end of ${casterName}’s turn`,
    ),
    "start-next-target": L(
      `fino all’inizio del prossimo turno di ${targetName}`,
      `until the start of ${targetName}’s next turn`,
    ),
    "end-next-target": L(
      `fino alla fine del prossimo turno di ${targetName}`,
      `until the end of ${targetName}’s next turn`,
    ),
  };
  const base = anchorName(id);
  return map[id] ?? L(base.it.toLocaleLowerCase(), base.en.toLocaleLowerCase());
}
export const anchorName = (id) => DURATION_ANCHORS.find((a) => a.id === id)?.name ?? L(id, id);
// BI-20 (Foundry Active Effects durations, FG anchors as choices): how long a modifier
// lasts once activated (by using one of the entry's activities or «Attiva» on the sheet).
export const MODIFIER_DURATIONS = Object.freeze([
  { id: "always", name: L("Sempre attivo", "Always on") },
  { id: "rounds", name: L("Per un numero di round", "For a number of rounds") },
  ...DURATION_ANCHORS.filter((a) => !a.id.endsWith("-target")),
]);
export const isTimed = (m) => Boolean(m?.duration?.anchor) && m.duration.anchor !== "always";
export function durationText(m) {
  if (!isTimed(m)) return MODIFIER_DURATIONS[0].name;
  if (m.duration.anchor === "rounds")
    return L(`Per ${m.duration.rounds} round`, `For ${m.duration.rounds} rounds`);
  return anchorName(m.duration.anchor);
}
export const CONDITIONS = Object.freeze(
  listConditionDefinitions()
    .filter((c) => c.id !== "exhaustion")
    .map((c) => ({ id: c.id, name: c.name, source: c.source })),
);
export const conditionName = (id) => CONDITIONS.find((c) => c.id === id)?.name ?? L(id, id);

// dnd5e advancement types (FVT-181).
export const ADVANCEMENT_TYPES = Object.freeze([
  { id: "grant", name: L("Concessione di privilegi", "Feature grant") },
  { id: "scale", name: L("Valore di scala", "Scale value") },
  { id: "asi", name: L("Aumento dei punteggi di caratteristica", "Ability Score Improvement") },
  { id: "choice", name: L("Scelta di un privilegio", "Feature choice") },
]);
// Subclass feature levels of the 2024 class tables (SRD 5.2.1 class chapters, Features
// column). D&D Beyond requires published subclasses to use them (DDB-178).
export const SUBCLASS_LEVELS = Object.freeze({
  barbarian: [3, 6, 10, 14],
  bard: [3, 6, 14],
  cleric: [3, 6, 17],
  druid: [3, 6, 10, 14],
  fighter: [3, 7, 10, 15, 18],
  monk: [3, 6, 11, 17],
  paladin: [3, 7, 15, 20],
  ranger: [3, 7, 11, 15],
  rogue: [3, 9, 13, 17],
  sorcerer: [3, 6, 14, 18],
  warlock: [3, 6, 10, 14],
  wizard: [3, 6, 10, 14],
});
export const CLASS_OPTIONS = Object.freeze(
  RULE_CLASSES.map((c) => ({ id: c.id, name: c.name, source: c.source, hitDie: c.hitDie })),
);
export const className = (id) => CLASS_OPTIONS.find((c) => c.id === id)?.name ?? L(id, id);

export const labelFor = (group, id) => srd.LABELS[group]?.[id] ?? L(id, id);
export const damageName = (id) => labelFor("damageType", id);
// "EN p.x / IT p.y" for an SRD source (both documents), or the pages alone.
export function sourcePages(src) {
  if (!src) return "";
  if (src.en?.pages && src.it?.pages)
    return `EN p.${src.en.pages.join("–")} / IT p.${src.it.pages.join("–")}`;
  return Array.isArray(src.pages) ? `EN p.${src.pages.join("–")}` : "";
}
export const SIZES = Object.freeze(Object.keys(srd.LABELS.size));
export const CREATURE_TYPES = Object.freeze(Object.keys(srd.LABELS.creatureType));
export const DAMAGE_TYPES = Object.freeze(Object.keys(srd.LABELS.damageType));
export const CR_LIST = Object.freeze(srd.XP_BY_CR.map((row) => row.cr));
// Names D&D Beyond lists as protected in published homebrew (DDB-178, Homebrew Content
// and Copyright): a short sample checked before a simulated publication.
export const PROTECTED_NAMES = Object.freeze([
  "beholder",
  "mind flayer",
  "illithid",
  "displacer beast",
  "githyanki",
  "githzerai",
  "yuan-ti",
  "carrion crawler",
  "umber hulk",
  "kuo-toa",
]);
export const AI_METHODS = Object.freeze([
  { id: "human", name: L("Scritto da persone", "Written by people") },
  { id: "assisted", name: L("Assistito da IA, rivisto da persone", "AI-assisted, human-reviewed") },
  { id: "generated", name: L("Generato in prevalenza da IA", "Mostly AI-generated") },
]);

// ---------------------------------------------------------------- slice

export function seedSlice() {
  return { campaigns: {}, sheets: {}, uses: [], publications: {}, subscriptions: {} };
}
export function normalizeSlice(value, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw Error(`Unknown ${ID} version ${fromVersion}`);
  const v = object(value) ? value : {};
  return {
    campaigns: object(v.campaigns) ? copy(v.campaigns) : {},
    sheets: object(v.sheets) ? copy(v.sheets) : {},
    uses: list(v.uses).filter((u) => object(u) && typeof u.id === "string"),
    publications: object(v.publications) ? copy(v.publications) : {},
    subscriptions: object(v.subscriptions) ? copy(v.subscriptions) : {},
  };
}
// Accepted save rolls survive gameplay Undo (evidence, I-229): an Undo of the outcome
// never lets the same save be rolled again for a better result.
export function seedRolls() {
  return { saves: {} };
}
export function normalizeRolls(value, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw Error(`Unknown ${ROLLS} version ${fromVersion}`);
  return { saves: object(value?.saves) ? copy(value.saves) : {} };
}

// ---------------------------------------------------------------- structured schema

const emptyCreature = () => ({
  preset: null,
  size: "medium",
  type: "undead",
  alignment: L("", ""),
  ac: 12,
  acNote: L("", ""),
  hp: { average: 11, dice: "2d8+2" },
  speedMeters: 9,
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  saves: {},
  skills: L("", ""),
  senses: L("", ""),
  languages: L("", ""),
  cr: "1",
  sections: {
    traits: [],
    actions: [],
    bonusActions: [],
    reactions: [],
    legendary: { enabled: false, uses: 3, intro: L("", ""), actions: [] },
    lair: { enabled: false, intro: L("", ""), actions: [] },
  },
});
const emptyItem = (type) => ({
  baseId: null,
  templates: [],
  rarity: "common",
  magical: false,
  attunement: false,
  weapon:
    type === "weapon"
      ? {
          damage: { dice: "1d8", type: "slashing" },
          versatile: "",
          properties: [],
          attackBonus: 0,
          damageBonus: 0,
        }
      : null,
  armor: type === "armor" ? { ac: 11, category: "light", acBonus: 0 } : null,
});
export function emptyStructured(type) {
  return {
    version: 1,
    type,
    template: null,
    prerequisites: [],
    options: [],
    modifiers: [],
    activities: [],
    advancement: [],
    class:
      type === "class"
        ? { hitDie: 8, primary: ["wis"], saves: ["int", "wis"], caster: "none" }
        : null,
    subclass: type === "subclass" ? { classId: "" } : null,
    // PG-06 (D&D Beyond homebrew origins): what the character builder reads.
    species: type === "species" ? { size: "medium", speed: 9 } : null,
    background: type === "background" ? { abilities: [], skills: [], featId: "" } : null,
    item: ["weapon", "armor", "item", "consumable"].includes(type) ? emptyItem(type) : null,
    creature: type === "creature" ? emptyCreature() : null,
    origin: null,
    automation: null,
  };
}
export function emptyDefinition(type) {
  return {
    name: L("", ""),
    description: L("", ""),
    source: {
      kind: "authored",
      edition: "2024",
      label: "",
      reference: "",
      rights: { modify: true, share: true, export: true },
    },
    fields: {
      level: 0,
      school: "",
      kind: ["weapon", "armor", "consumable"].includes(type) ? type : "gear",
      weight: 0,
      value: null,
    },
    resource: null,
    activities: [],
    dependencies: [],
    structured: emptyStructured(type),
  };
}
export const newRule = (kind = "ability") =>
  kind === "ability"
    ? { id: newId("rule"), kind, ability: "str", min: 13 }
    : kind === "level"
      ? { id: newId("rule"), kind, min: 4 }
      : kind === "class"
        ? { id: newId("rule"), kind, classId: "fighter" }
        : { id: newId("rule"), kind: "text", text: L("", "") };
export const newModifier = (target = "ac", mode = "add", value = 1) => ({
  id: newId("mod"),
  target,
  mode,
  value,
  limit: null,
  condition: L("", ""),
});
export const newOption = () => ({
  id: newId("opt"),
  name: L("", ""),
  choose: 1,
  from: [
    { id: newId("choice"), name: L("", ""), modifiers: [] },
    { id: newId("choice"), name: L("", ""), modifiers: [] },
  ],
});
export function newActivity(type = "save") {
  return {
    id: newId("act"),
    type,
    name: L("", ""),
    description: L("", ""),
    activation: { type: "action", rangeMeters: 9, targets: 1 },
    save: { ability: "wis", dc: { mode: "ability", ability: "cha", value: 13 } },
    attack: { bonus: 5 },
    damage: { dice: "", type: "fire", onSave: "half" },
    heal: { dice: "2d4+2" },
    effect: { conditionId: "", duration: "start-next-self" },
  };
}
export const newFeature = () => ({ id: newId("feature"), name: L("", ""), description: L("", "") });
export function newAdvancement(type = "grant", level = 3) {
  return {
    id: newId("adv"),
    type,
    level,
    features: type === "grant" ? [newFeature()] : [],
    scale: type === "scale" ? { name: L("", ""), values: { [level]: "1d6" } } : null,
    asi: type === "asi" ? { points: 2, limit: 20 } : null,
    choice: type === "choice" ? { name: L("", ""), from: [newFeature(), newFeature()] } : null,
  };
}
export const newBlock = () => ({ id: newId("block"), name: L("", ""), text: L("", "") });

const MAX = {
  rules: 12,
  groups: 6,
  options: 8,
  choices: 12,
  modifiers: 24,
  activities: 12,
  advancement: 40,
  blocks: 30,
};
// Validates structured behaviour; returns reasons (never throws). Private homebrew is
// unrestricted beyond well-formed values; publishing adds its own checks.
export function validateStructured(type, s) {
  const errors = [];
  const add = (code, path, it, en) => errors.push({ code, path, it, en });
  if (!object(s)) {
    add(
      "structured",
      "structured",
      "Comportamento strutturato mancante.",
      "Structured behaviour missing.",
    );
    return errors;
  }
  const groups = list(s.prerequisites);
  if (groups.length > MAX.groups)
    add(
      "prerequisites",
      "prerequisites",
      "Troppi gruppi di prerequisiti.",
      "Too many prerequisite groups.",
    );
  groups.forEach((g, gi) => {
    if (!["any", "all"].includes(g?.mode) || !list(g.rules).length || g.rules.length > MAX.rules)
      add(
        "prerequisites",
        `prerequisites.${gi}`,
        `Gruppo ${gi + 1}: indica «uno tra» o «tutti» e almeno un requisito.`,
        `Group ${gi + 1}: choose “any of” or “all of” and at least one requirement.`,
      );
    list(g?.rules).forEach((r, ri) => {
      const ok =
        (r?.kind === "ability" && ABILITIES.includes(r.ability) && int(r.min, 1, 30)) ||
        (r?.kind === "level" && int(r.min, 1, 20)) ||
        (r?.kind === "class" && CLASS_OPTIONS.some((c) => c.id === r.classId)) ||
        (r?.kind === "text" && (text(r.text?.it).trim() || text(r.text?.en).trim()));
      if (!ok)
        add(
          "prerequisite",
          `prerequisites.${gi}.${ri}`,
          `Gruppo ${gi + 1}, requisito ${ri + 1}: valore non valido.`,
          `Group ${gi + 1}, requirement ${ri + 1}: invalid value.`,
        );
    });
  });
  const checkModifier = (m, path) => {
    if (
      !object(m) ||
      !targetInfo(m.target) ||
      !MODIFIER_MODES.some((x) => x.id === m.mode) ||
      !Number.isFinite(m.value)
    )
      add(
        "modifier",
        path,
        "Modificatore non valido: scegli valore, operazione e numero.",
        "Invalid modifier: choose value, operation and number.",
      );
    else if (m.mode === "multiply" && (m.value <= 0 || m.value > 10))
      add(
        "modifier",
        path,
        "Il moltiplicatore va da 0 a 10.",
        "The multiplier ranges from 0 to 10.",
      );
    else if (m.limit != null && !int(m.limit, 1, 30))
      add(
        "modifier",
        path,
        "Il limite massimo deve essere un intero tra 1 e 30.",
        "The cap must be an integer from 1 to 30.",
      );
    else if (ROLL_MODES.includes(m.mode) && !isD20Target(m.target))
      add(
        "modifier",
        path,
        "Vantaggio e svantaggio valgono per prove, tiri salvezza, iniziativa e attacchi.",
        "Advantage and Disadvantage apply to checks, saving throws, initiative and attacks.",
      );
    else if (m.scale != null && !MODIFIER_SCALES.some((x) => x.id === m.scale))
      add("modifier", path, "Scala del valore non valida.", "Invalid value scaling.");
    else if (
      m.duration != null &&
      (!MODIFIER_DURATIONS.some((x) => x.id === m.duration?.anchor) ||
        (m.duration.anchor === "rounds" && !int(m.duration.rounds, 1, 100)))
    )
      add(
        "modifier",
        path,
        "Durata non valida: scegli un’ancora o da 1 a 100 round.",
        "Invalid duration: choose an anchor or 1 to 100 rounds.",
      );
  };
  if (list(s.modifiers).length > MAX.modifiers)
    add("modifiers", "modifiers", "Troppi modificatori.", "Too many modifiers.");
  list(s.modifiers).forEach((m, i) => checkModifier(m, `modifiers.${i}`));
  list(s.options).forEach((o, oi) => {
    const from = list(o?.from);
    if (
      !(text(o?.name?.it).trim() || text(o?.name?.en).trim()) ||
      !int(o?.choose, 1, 6) ||
      from.length < 2 ||
      from.length > MAX.choices ||
      o.choose >= from.length + 1
    )
      add(
        "option",
        `options.${oi}`,
        `Opzione ${oi + 1}: nome, «scegli N» e almeno due alternative.`,
        `Option ${oi + 1}: name, “choose N” and at least two alternatives.`,
      );
    from.forEach((c, ci) => {
      if (!(text(c?.name?.it).trim() || text(c?.name?.en).trim()))
        add(
          "option-choice",
          `options.${oi}.${ci}`,
          `Opzione ${oi + 1}: dai un nome all’alternativa ${ci + 1}.`,
          `Option ${oi + 1}: name alternative ${ci + 1}.`,
        );
      list(c?.modifiers).forEach((m, mi) => checkModifier(m, `options.${oi}.${ci}.${mi}`));
    });
  });
  if (list(s.activities).length > MAX.activities)
    add("activities", "activities", "Troppe attività.", "Too many activities.");
  list(s.activities).forEach((a, i) => {
    const name = `${i + 1}`;
    if (
      !ACTIVITY_TYPES.some((t) => t.id === a?.type) ||
      !(text(a?.name?.it).trim() || text(a?.name?.en).trim())
    )
      return add(
        "activity",
        `activities.${i}`,
        `Attività ${name}: tipo e nome sono necessari.`,
        `Activity ${name}: type and name are required.`,
      );
    if (
      !ACTIVATIONS.some((x) => x.id === a.activation?.type) ||
      !Number.isFinite(a.activation?.rangeMeters) ||
      a.activation.rangeMeters < 0 ||
      !int(a.activation?.targets, 0, 10)
    )
      add(
        "activity",
        `activities.${i}.activation`,
        `Attività ${name}: attivazione, portata e bersagli non validi.`,
        `Activity ${name}: invalid activation, range or targets.`,
      );
    if (a.type === "save") {
      const dc = a.save?.dc;
      if (
        !ABILITIES.includes(a.save?.ability) ||
        !(dc?.mode === "fixed"
          ? int(dc.value, 1, 30)
          : dc?.mode === "ability" && ABILITIES.includes(dc.ability))
      )
        add(
          "activity",
          `activities.${i}.save`,
          `Attività ${name}: caratteristica del tiro salvezza e CD non valide.`,
          `Activity ${name}: invalid saving throw ability or DC.`,
        );
      if (
        a.effect?.conditionId &&
        (!CONDITIONS.some((c) => c.id === a.effect.conditionId) ||
          !DURATION_ANCHORS.some((d) => d.id === a.effect.duration))
      )
        add(
          "activity",
          `activities.${i}.effect`,
          `Attività ${name}: scegli condizione e durata dall’elenco.`,
          `Activity ${name}: choose condition and duration from the list.`,
        );
      if (!a.effect?.conditionId && !a.damage?.dice)
        add(
          "activity",
          `activities.${i}.effect`,
          `Attività ${name}: un tiro salvezza deve avere un effetto o dei danni.`,
          `Activity ${name}: a saving throw needs an effect or damage.`,
        );
    }
    if (a.type === "attack" && !int(a.attack?.bonus, -5, 20))
      add(
        "activity",
        `activities.${i}.attack`,
        `Attività ${name}: bonus di attacco non valido.`,
        `Activity ${name}: invalid attack bonus.`,
      );
    if (
      ["attack", "damage", "save"].includes(a.type) &&
      a.damage?.dice &&
      !parseDice(a.damage.dice)
    )
      add(
        "activity",
        `activities.${i}.damage`,
        `Attività ${name}: dadi dei danni non validi (es. 2d6+3).`,
        `Activity ${name}: invalid damage dice (e.g. 2d6+3).`,
      );
    if (a.type === "damage" && !parseDice(a.damage?.dice ?? ""))
      add(
        "activity",
        `activities.${i}.damage`,
        `Attività ${name}: indica i dadi dei danni.`,
        `Activity ${name}: enter the damage dice.`,
      );
    if (a.type === "heal" && !parseDice(a.heal?.dice ?? ""))
      add(
        "activity",
        `activities.${i}.heal`,
        `Attività ${name}: dadi della cura non validi.`,
        `Activity ${name}: invalid healing dice.`,
      );
  });
  list(s.advancement).forEach((a, i) => {
    if (!ADVANCEMENT_TYPES.some((t) => t.id === a?.type) || !int(a?.level, 1, 20))
      return add(
        "advancement",
        `advancement.${i}`,
        `Avanzamento ${i + 1}: tipo e livello (1–20) necessari.`,
        `Advancement ${i + 1}: type and level (1–20) required.`,
      );
    if (
      a.type === "grant" &&
      (!list(a.features).length ||
        a.features.some((f) => !(text(f?.name?.it).trim() || text(f?.name?.en).trim())))
    )
      add(
        "advancement",
        `advancement.${i}`,
        `Livello ${a.level}: ogni privilegio concesso ha un nome.`,
        `Level ${a.level}: every granted feature needs a name.`,
      );
    if (
      a.type === "scale" &&
      (!(text(a.scale?.name?.it).trim() || text(a.scale?.name?.en).trim()) ||
        !object(a.scale?.values) ||
        !Object.keys(a.scale.values).length ||
        Object.keys(a.scale.values).some((k) => !int(Number(k), 1, 20)))
    )
      add(
        "advancement",
        `advancement.${i}`,
        `Livello ${a.level}: il valore di scala ha un nome e valori per livello.`,
        `Level ${a.level}: the scale value needs a name and per-level values.`,
      );
    if (a.type === "asi" && (!int(a.asi?.points, 1, 4) || !int(a.asi?.limit, 10, 30)))
      add(
        "advancement",
        `advancement.${i}`,
        `Livello ${a.level}: punti e limite dell’aumento non validi.`,
        `Level ${a.level}: invalid improvement points or cap.`,
      );
    if (
      a.type === "choice" &&
      (list(a.choice?.from).length < 2 ||
        a.choice.from.some((f) => !(text(f?.name?.it).trim() || text(f?.name?.en).trim())))
    )
      add(
        "advancement",
        `advancement.${i}`,
        `Livello ${a.level}: la scelta ha almeno due privilegi con nome.`,
        `Level ${a.level}: the choice needs at least two named features.`,
      );
  });
  if (type === "subclass" && !CLASS_OPTIONS.some((c) => c.id === s.subclass?.classId))
    add(
      "subclass",
      "subclass.classId",
      "Collega la sottoclasse alla sua classe.",
      "Link the subclass to its class.",
    );
  if (
    type === "species" &&
    object(s.species) &&
    (!SPECIES_SIZES.includes(s.species.size) ||
      !(Number.isFinite(s.species.speed) && s.species.speed >= 1.5 && s.species.speed <= 30))
  )
    add(
      "species",
      "species",
      "Indica taglia e velocità della specie (da 1,5 a 30 m).",
      "Set the species’ size and speed (1.5 to 30 m).",
    );
  if (type === "background" && object(s.background)) {
    const b = s.background;
    if (new Set(list(b.abilities).filter((a) => ABILITIES.includes(a))).size !== 3)
      add(
        "background",
        "background.abilities",
        "Scegli le tre caratteristiche che il background può aumentare.",
        "Choose the three abilities the background can increase.",
      );
    if (new Set(list(b.skills).filter((k) => RULE_SKILLS.some((x) => x.id === k))).size !== 2)
      add(
        "background",
        "background.skills",
        "Scegli le due abilità del background.",
        "Choose the background’s two skills.",
      );
    if (!ORIGIN_FEATS.some((f) => f.id === b.featId))
      add(
        "background",
        "background.featId",
        "Scegli il talento di origine del background.",
        "Choose the background’s origin feat.",
      );
  }
  if (
    type === "class" &&
    (![6, 8, 10, 12].includes(s.class?.hitDie) || !list(s.class?.saves).length)
  )
    add(
      "class",
      "class",
      "Indica Dado Vita e tiri salvezza della classe.",
      "Set the class Hit Die and saving throws.",
    );
  if (s.creature) {
    const c = s.creature;
    if (
      !SIZES.includes(c.size) ||
      !CREATURE_TYPES.includes(c.type) ||
      !int(c.ac, 1, 30) ||
      !int(c.hp?.average, 1, 5000) ||
      (c.hp?.dice && !parseHitDice(c.hp.dice)) ||
      !Number.isFinite(c.speedMeters) ||
      c.speedMeters < 0 ||
      !CR_LIST.includes(c.cr) ||
      ABILITIES.some((k) => !int(c.abilities?.[k], 1, 30))
    )
      add(
        "creature",
        "creature",
        "Blocco: controlla taglia, tipo, CA, PF, velocità, caratteristiche e GS.",
        "Stat block: check size, type, AC, HP, speed, abilities and CR.",
      );
    const blocks = ["traits", "actions", "bonusActions", "reactions"].flatMap((k) =>
      list(c.sections?.[k]),
    );
    if (
      blocks.length +
        list(c.sections?.legendary?.actions).length +
        list(c.sections?.lair?.actions).length >
      MAX.blocks
    )
      add(
        "creature",
        "creature.sections",
        "Troppe voci nel blocco.",
        "Too many stat block entries.",
      );
    for (const b of [
      ...blocks,
      ...list(c.sections?.legendary?.actions),
      ...list(c.sections?.lair?.actions),
    ])
      if (!(text(b?.name?.it).trim() || text(b?.name?.en).trim()))
        add(
          "creature",
          "creature.sections",
          "Ogni voce del blocco ha un nome.",
          "Every stat block entry needs a name.",
        );
    for (const b of [
      ...blocks,
      ...list(c.sections?.legendary?.actions),
      ...list(c.sections?.lair?.actions),
    ])
      for (const seg of [...parseRollables(b?.text?.it), ...parseRollables(b?.text?.en)])
        if (seg.rollable && !seg.rollable.valid)
          add(
            "rollable",
            "creature.sections",
            `Blocco tirabile non valido: ${seg.rollable.raw}`,
            `Invalid rollable block: ${seg.rollable.raw}`,
          );
    if (c.sections?.legendary?.enabled && !int(c.sections.legendary.uses, 1, 5))
      add(
        "creature",
        "creature.legendary",
        "Le azioni leggendarie vanno da 1 a 5 usi.",
        "Legendary actions range from 1 to 5 uses.",
      );
  }
  if (
    s.item?.weapon &&
    (!parseDice(s.item.weapon.damage?.dice ?? "") ||
      !int(s.item.weapon.attackBonus, 0, 3) ||
      !int(s.item.weapon.damageBonus, 0, 3))
  )
    add(
      "item",
      "item.weapon",
      "Arma: dadi dei danni e bonus (0–3) non validi.",
      "Weapon: invalid damage dice or bonus (0–3).",
    );
  return errors;
}
export const parseHitDice = (value) =>
  /^\s*\d{1,3}\s*d\s*(4|6|8|10|12|20)\s*([+−-]\s*\d{1,4})?\s*$/i.test(String(value ?? ""));

// ---------------------------------------------------------------- automation level (R20-185)

// Declared per entry: what runs in the app and what stays manual. "full" means every
// structured part runs; "partial" mixes automated and manual parts; "text" is reading only.
export function automationOf(type, s) {
  const automated = [],
    manual = [];
  if (!object(s))
    return {
      level: "text",
      automated,
      manual: [L("Solo testo descrittivo.", "Descriptive text only.")],
    };
  const rules = list(s.prerequisites).flatMap((g) => list(g.rules));
  if (rules.some((r) => r.kind !== "text"))
    automated.push(L("Prerequisiti verificati sulla scheda", "Prerequisites checked on the sheet"));
  if (rules.some((r) => r.kind === "text"))
    manual.push(L("Prerequisiti testuali: verifica manuale", "Text prerequisites: manual check"));
  if (list(s.options).length)
    automated.push(
      L("Scelte «scegli N» registrate sulla scheda", "“Choose N” options recorded on the sheet"),
    );
  const mods = [
    ...list(s.modifiers),
    ...list(s.options).flatMap((o) => list(o.from).flatMap((c) => list(c.modifiers))),
  ];
  const numeric = mods.filter((m) => !ROLL_MODES.includes(m.mode));
  if (numeric.some((m) => targetInfo(m.target)?.automated && !conditionText(m)))
    automated.push(
      L("Modificatori applicati con ordine di cumulo", "Modifiers applied in stacking order"),
    );
  if (numeric.some((m) => targetInfo(m.target)?.automated && !conditionText(m) && isTimed(m)))
    automated.push(
      L(
        "Modificatori a tempo: si attivano con l’uso e scadono da soli (round, turni, riposo)",
        "Timed modifiers: they start on use and end on their own (rounds, turns, rest)",
      ),
    );
  if (numeric.some((m) => targetInfo(m.target)?.automated && m.scale && m.scale !== "fixed"))
    automated.push(L("Valori che crescono con il livello", "Values that scale with level"));
  if (numeric.some((m) => !targetInfo(m.target)?.automated || conditionText(m)))
    manual.push(
      L(
        "Modificatori con condizione o su valori non collegati: manuali",
        "Conditional modifiers or unconnected values: manual",
      ),
    );
  // C11 (R1 BI-18, Roll20 Modifier Builder): the roll engine applies a homebrew Advantage or
  // Disadvantage to the checks, saves, initiative and attacks it targets and names it in the
  // roll's breakdown; one with a written condition stays a choice made when rolling.
  const rollModes = mods.filter((m) => ROLL_MODES.includes(m.mode));
  if (rollModes.some((m) => !conditionText(m)))
    automated.push(
      L(
        "Vantaggio o svantaggio applicato al tiro, con il nome di questa voce nel dettaglio",
        "Advantage or Disadvantage applied to the roll, with this entry’s name in the breakdown",
      ),
    );
  if (rollModes.some((m) => conditionText(m)))
    manual.push(
      L(
        "Vantaggio o svantaggio con condizione: scegli Vantaggio o Svantaggio quando tiri",
        "Conditional Advantage or Disadvantage: choose Advantage or Disadvantage when you roll",
      ),
    );
  for (const a of list(s.activities)) {
    const t = ACTIVITY_TYPES.find((x) => x.id === a.type);
    const name = a.name;
    if (t?.automation === "full") {
      automated.push(
        L(
          `Attività «${pick(name, "it")}»: richiesta di TS, esito ed effetto con durata`,
          `Activity “${pick(name, "en")}”: save request, outcome and timed effect`,
        ),
      );
      // The save's damage is rolled from the use's row, then applied by hand: said so.
      if (a.damage?.dice)
        manual.push(
          L(
            `Attività «${pick(name, "it")}»: danni ${a.damage.dice} tirati dalla riga dell’uso, applicati a mano`,
            `Activity “${pick(name, "en")}”: ${a.damage.dice} damage rolled from the use’s row, applied by hand`,
          ),
        );
    } else if (t?.automation === "partial")
      manual.push(
        L(
          `Attività «${pick(name, "it")}»: tiri registrati, applicazione manuale`,
          `Activity “${pick(name, "en")}”: rolls recorded, manual application`,
        ),
      );
    else
      manual.push(
        L(
          `Attività «${pick(name, "it")}»: promemoria manuale`,
          `Activity “${pick(name, "en")}”: manual reminder`,
        ),
      );
  }
  // P1 BI-21/22, R6: a class and a subclass are offered by the character builder, which
  // applies their advancement (grants, scale values, ASI and feature choices) when the
  // character levels; a species brings its level-1 traits, a background its numbers.
  if (list(s.advancement).length && (type === "subclass" || type === "class"))
    automated.push(
      L("Avanzamento applicato livello per livello", "Advancement applied level by level"),
    );
  else if (list(s.advancement).length)
    manual.push(
      type === "species"
        ? L(
            "Tratti oltre il 1° livello: registrati, da aggiungere a mano quando il personaggio sale",
            "Traits beyond level 1: recorded, added by hand when the character levels",
          )
        : L(
            "Avanzamento registrato: il costruttore dei personaggi non lo applica ancora",
            "Advancement recorded: the character builder does not apply it yet",
          ),
    );
  if (type === "class")
    automated.push(
      L(
        "Classe nel costruttore dei personaggi: la offre a chi può usarla",
        "Class in the character builder: offered to whoever may use it",
      ),
    );
  if (type === "subclass")
    automated.push(
      L(
        "Sottoclasse nella scelta del costruttore dei personaggi, per la sua classe",
        "Subclass in the character builder’s choice, for its class",
      ),
    );
  if (type === "species" || type === "background")
    automated.push(
      type === "species"
        ? L(
            "Specie nel costruttore: taglia, velocità e tratti del 1° livello",
            "Species in the builder: size, speed and level 1 traits",
          )
        : L(
            "Background nel costruttore: aumenti, abilità e talento di origine",
            "Background in the builder: increases, skills and origin feat",
          ),
    );
  if (s.creature) {
    const blocks = creatureBlocks(s.creature);
    if (
      blocks.some((b) =>
        [...parseRollables(b.text?.it), ...parseRollables(b.text?.en)].some(
          (x) => x.rollable?.valid,
        ),
      )
    )
      automated.push(
        L("Blocchi tirabili nel blocco statistiche", "Rollable blocks in the stat block"),
      );
    if (meleeProfileFrom(s.creature, { contentId: "x", revisionId: "x" }))
      automated.push(
        L("Attacco in mischia collegato al Tavolo", "Melee attack connected to the Table"),
      );
    manual.push(
      L(
        "Tratti, leggendarie e tana: il DM li risolve",
        "Traits, legendary and lair actions: resolved by the DM",
      ),
    );
  }
  if (s.item?.armor?.acBonus > 0)
    automated.push(
      L(
        "Bonus alla CA aggiunto alla scheda e al Tavolo mentre l’armatura è indossata",
        "AC bonus added on the sheet and at the Table while the armor is worn",
      ),
    );
  // C11 (R1 BI-24, FG Forge and dnd5e Enchant): an equipped forged weapon is its own attack
  // at the Table, its bonus added to the attack and damage rolls and named in the breakdown.
  if (s.item?.weapon && (s.item.weapon.attackBonus || s.item.weapon.damageBonus))
    automated.push(
      L(
        "Bonus dell’arma aggiunto al tiro per colpire e ai danni al Tavolo mentre è equipaggiata",
        "Weapon bonus added to the attack and damage rolls at the Table while it is equipped",
      ),
    );
  const level = !automated.length ? "text" : manual.length ? "partial" : "full";
  return { level, automated, manual };
}
export const AUTOMATION_LEVELS = Object.freeze({
  full: L("Automazione completa", "Fully automated"),
  partial: L("Automazione parziale", "Partly automated"),
  text: L("Solo testo", "Text only"),
});
const conditionText = (m) => text(m?.condition?.it).trim() || text(m?.condition?.en).trim();

// ---------------------------------------------------------------- templates (DDB-172, CMP-152)

const featSummary = {
  grappler: L(
    "Talento di lotta. Scrivi qui il testo della tua variante.",
    "Grappling feat. Write your variant’s text here.",
  ),
  defense: L(
    "Stile difensivo. Scrivi qui il testo della tua variante.",
    "Defensive style. Write your variant’s text here.",
  ),
  alert: L(
    "Talento d’allerta. Scrivi qui il testo della tua variante.",
    "Alertness feat. Write your variant’s text here.",
  ),
};
// Starting points for a new entry: from scratch, an SRD structure (copied as an editable
// copy that remembers its source) or the author's own Library content.
export const SPECIES_SIZES = Object.freeze(["small", "medium", "choice"]);
export const SKILL_OPTIONS = Object.freeze(
  RULE_SKILLS.map((k) => ({ id: k.id, name: copy(k.name) })),
);
export const ORIGIN_FEATS = Object.freeze(RULE_FEATS.filter((f) => f.category === "origin"));
export function templatesFor(type) {
  const out = [{ id: "scratch", name: L("Da zero", "From scratch"), kind: "scratch" }];
  // PG-06: a variant of an SRD species or background starts from its numbers.
  if (type === "species")
    for (const x of RULE_SPECIES)
      out.push({
        id: `srd-species:${x.id}`,
        name: L(`${x.name.it} (SRD)`, `${x.name.en} (SRD)`),
        kind: "srd",
      });
  if (type === "background")
    for (const x of RULE_BACKGROUNDS)
      out.push({
        id: `srd-background:${x.id}`,
        name: L(`${x.name.it} (SRD)`, `${x.name.en} (SRD)`),
        kind: "srd",
      });
  if (type === "feat")
    for (const f of RULE_FEATS.filter((f) =>
      ["grappler", "defense", "alert", "ability-score-improvement"].includes(f.id),
    ))
      out.push({
        id: `srd-feat:${f.id}`,
        name: L(`${f.name.it} (SRD)`, `${f.name.en} (SRD)`),
        kind: "srd",
      });
  if (type === "creature")
    for (const c of srd.CREATURES)
      out.push({
        id: `srd-creature:${c.slug}`,
        name: L(`${c.name.it} (SRD, GS ${c.cr})`, `${c.name.en} (SRD, CR ${c.cr})`),
        kind: "srd",
      });
  // P1 BI-22: the Italian article follows the name («dello Stregone», «del Mago»).
  const ofClass = (name) =>
    /^(s[^aeiouàèéìòù]|z|gn|ps|x|y)/i.test(name)
      ? `dello ${name}`
      : /^[aeiouàèéìòùh]/i.test(name)
        ? `dell’${name}`
        : `del ${name}`;
  if (type === "subclass" || type === "class")
    for (const c of CLASS_OPTIONS)
      out.push({
        id: `class-levels:${c.id}`,
        name:
          type === "subclass"
            ? L(`Livelli di sottoclasse ${ofClass(c.name.it)}`, `${c.name.en} subclass levels`)
            : L(`Struttura ${ofClass(c.name.it)} (SRD)`, `${c.name.en} structure (SRD)`),
        kind: "srd",
      });
  if (type === "spell")
    for (const s of srd.SPELLS.filter((s) => s.save || s.attack || s.healing).slice(0, 40))
      out.push({
        id: `srd-spell:${s.slug}`,
        name: L(`${s.name.it} (SRD, liv. ${s.level})`, `${s.name.en} (SRD, lvl ${s.level})`),
        kind: "srd",
      });
  return out;
}
// Builds the draft data for a template. Never copies SRD prose into the description:
// the structure is copied, the author writes the text; the source stays recorded.
export function buildFromTemplate(type, templateId, lang = "it") {
  const data = emptyDefinition(type);
  const s = data.structured;
  if (!templateId || templateId === "scratch") return data;
  const [kind, slug] = templateId.split(":");
  if (kind === "srd-feat") {
    const f = RULE_FEATS.find((x) => x.id === slug);
    if (!f) fail("Modello non disponibile.", "Template unavailable.");
    data.name = L(`${f.name.it} (variante)`, `${f.name.en} (variant)`);
    data.description = copy(featSummary[slug] ?? L("", ""));
    data.source = {
      ...data.source,
      kind: "authored",
      label: "SRD 5.2.1",
      reference: `SRD 5.2.1 EN p.${f.source.pages.join("–")} · ${f.name.en}`,
    };
    s.template = { kind: "srd", id: `feat:${f.id}`, name: copy(f.name), source: copy(f.source) };
    if (f.requirements.level)
      s.prerequisites.push({
        id: newId("group"),
        mode: "all",
        rules: [{ id: newId("rule"), kind: "level", min: f.requirements.level }],
      });
    if (f.requirements.anyAbility)
      s.prerequisites.push({
        id: newId("group"),
        mode: "any",
        rules: f.requirements.anyAbility.map((ability) => ({
          id: newId("rule"),
          kind: "ability",
          ability,
          min: f.requirements.minimum,
        })),
      });
    if (f.requirements.feature === "fighting-style")
      s.prerequisites.push({
        id: newId("group"),
        mode: "all",
        rules: [
          {
            id: newId("rule"),
            kind: "text",
            text: L("Privilegio Stile di combattimento", "Fighting Style feature"),
          },
        ],
      });
    if (slug === "grappler")
      s.options.push({
        id: newId("opt"),
        name: L("Aumento di caratteristica", "Ability Score Increase"),
        choose: 1,
        from: ["str", "dex"].map((ability) => ({
          id: newId("choice"),
          name: L(`${abilityName(ability).it} +1`, `${abilityName(ability).en} +1`),
          modifiers: [{ ...newModifier(ability, "add", 1), limit: 20 }],
        })),
      });
    if (slug === "ability-score-improvement")
      s.options.push({
        id: newId("opt"),
        name: L("Caratteristica da aumentare", "Ability to increase"),
        choose: 1,
        from: ABILITIES.map((ability) => ({
          id: newId("choice"),
          name: L(`${abilityName(ability).it} +2`, `${abilityName(ability).en} +2`),
          modifiers: [{ ...newModifier(ability, "add", 2), limit: 20 }],
        })),
      });
    if (slug === "defense")
      s.modifiers.push({
        ...newModifier("ac", "add", 1),
        condition: L("Mentre indossi un’armatura", "While wearing armor"),
      });
    if (slug === "alert")
      s.modifiers.push({
        ...newModifier("initiative", "add", 2),
        condition: L("Bonus di competenza", "Proficiency Bonus"),
      });
  } else if (kind === "srd-creature") {
    const c = srd.CREATURES.find((x) => x.slug === slug);
    if (!c) fail("Modello non disponibile.", "Template unavailable.");
    data.name = L(`${c.name.it} (variante)`, `${c.name.en} (variant)`);
    data.description = L("", "");
    data.source = {
      ...data.source,
      label: "SRD 5.2.1",
      reference: `SRD 5.2.1 EN p.${c.source.en.pages.join("–")} / IT p.${c.source.it.pages.join("–")} · ${c.name.en}`,
    };
    s.template = { kind: "srd", id: c.id, name: copy(c.name), source: copy(c.source) };
    s.creature = creatureFromSrd(c);
  } else if (kind === "srd-species" || kind === "srd-background") {
    const list = kind === "srd-species" ? RULE_SPECIES : RULE_BACKGROUNDS;
    const x = list.find((row) => row.id === slug);
    if (!x) fail("Modello non disponibile.", "Template unavailable.");
    // Structure and names only: the author writes the text (SRD prose is never copied).
    data.name = L(`${x.name.it} (variante)`, `${x.name.en} (variant)`);
    data.source = {
      ...data.source,
      label: "SRD 5.2.1",
      reference: `SRD 5.2.1 EN p.${x.source.pages.join("–")} · ${x.name.en}`,
    };
    s.template = { kind: "srd", id: kind + ":" + x.id, name: copy(x.name), source: copy(x.source) };
    if (kind === "srd-species") {
      s.species = { size: x.size, speed: x.speed };
      const grant = newAdvancement("grant", 1);
      grant.features = x.features.map((f) => ({
        id: newId("feature"),
        name: copy(f.name),
        description: L("", ""),
      }));
      s.advancement = [grant];
    } else
      s.background = {
        abilities: [...x.abilities],
        skills: [...x.skills],
        featId: ORIGIN_FEATS.some((f) => f.id === x.featId) ? x.featId : "",
      };
  } else if (kind === "class-levels") {
    const c = CLASS_OPTIONS.find((x) => x.id === slug);
    if (!c) fail("Modello non disponibile.", "Template unavailable.");
    s.template = { kind: "srd", id: `class:${c.id}`, name: copy(c.name), source: copy(c.source) };
    if (type === "subclass") {
      s.subclass = { classId: c.id };
      s.advancement = SUBCLASS_LEVELS[c.id].map((level) => ({ ...newAdvancement("grant", level) }));
    } else {
      const rule = RULE_CLASSES.find((x) => x.id === c.id);
      data.name = L(`${c.name.it} (variante)`, `${c.name.en} (variant)`);
      // PG-06: a class variant names the SRD structure it starts from, as a feat variant does.
      data.source = {
        ...data.source,
        label: "SRD 5.2.1",
        reference: `SRD 5.2.1 EN p.${rule.source.pages.join("–")} · ${c.name.en}`,
      };
      s.class = {
        hitDie: rule.hitDie,
        primary: [...rule.primaryAbilities],
        saves: [...rule.savingThrows],
        caster: rule.caster === "none" ? "none" : rule.caster,
      };
      // X-A3 (dnd5e class advancement, D&D Beyond class template): the SRD class table's
      // feature names, level by level — names and numbers only, the author writes the text —
      // so the first «Salva» works; the first Ability Score Improvement at level 4.
      const byLevel = new Map();
      for (const f of [...rule.features, ...(rule.advancement ?? [])])
        byLevel.set(f.level, [...(byLevel.get(f.level) ?? []), f]);
      s.advancement = [...byLevel]
        .sort((a, b) => a[0] - b[0])
        .map(([level, features]) => ({
          ...newAdvancement("grant", level),
          features: features.map((f) => ({
            id: newId("feature"),
            name: copy(f.name),
            description: L("", ""),
          })),
        }));
      s.advancement.push(newAdvancement("asi", 4));
      s.advancement.sort((a, b) => a.level - b.level);
    }
  } else if (kind === "srd-spell") {
    const sp = srd.SPELLS.find((x) => x.slug === slug);
    if (!sp) fail("Modello non disponibile.", "Template unavailable.");
    data.name = L(`${sp.name.it} (variante)`, `${sp.name.en} (variant)`);
    data.fields.level = sp.level;
    data.fields.school = pick(srd.LABELS.school[sp.school], lang);
    data.source = {
      ...data.source,
      label: "SRD 5.2.1",
      reference: `SRD 5.2.1 EN p.${sp.source.en.pages.join("–")} / IT p.${sp.source.it.pages.join("–")} · ${sp.name.en}`,
    };
    s.template = { kind: "srd", id: sp.id, name: copy(sp.name), source: copy(sp.source) };
    const a = newActivity(
      sp.save ? "save" : sp.attack ? "attack" : sp.healing ? "heal" : "utility",
    );
    a.name = copy(sp.name);
    a.activation.type =
      sp.castingTime?.unit === "bonus-action"
        ? "bonus"
        : sp.castingTime?.unit === "reaction"
          ? "reaction"
          : "action";
    a.activation.rangeMeters = Number(sp.range?.feet ? srd.feetToMeters(sp.range.feet) : 0) || 0;
    if (sp.save) {
      a.save = { ability: sp.save.ability, dc: { mode: "ability", ability: "int", value: 13 } };
      a.effect = {
        conditionId: sp.conditions?.find((id) => CONDITIONS.some((c) => c.id === id)) ?? "",
        duration: "manual",
      };
    }
    if (sp.attack) a.attack = { bonus: 5 };
    const dmg = sp.damage?.[0];
    if (dmg?.dice)
      a.damage = {
        dice: String(dmg.dice).replace(/\s+/g, ""),
        type: dmg.types?.[0] ?? "fire",
        onSave: sp.save?.halfOnSuccess ? "half" : "none",
      };
    if (sp.healing) a.heal = { dice: String(sp.healing.dice).replace(/\s+/g, "") };
    if (a.type === "save" && !a.effect.conditionId && !a.damage.dice)
      a.effect = { conditionId: "", duration: "manual" };
    s.activities.push(a);
  } else fail("Modello non disponibile.", "Template unavailable.");
  s.origin = originOf(type, data);
  return data;
}

// ---------------------------------------------------------------- source baseline (R20-114)

// The values an editable copy started from, to mark modified fields and revert them.
const TRACKED = [
  "name",
  "description",
  "fields",
  "structured.prerequisites",
  "structured.options",
  "structured.modifiers",
  "structured.activities",
  "structured.advancement",
  "structured.item",
  "structured.creature",
  "structured.subclass",
  "structured.class",
  "structured.species",
  "structured.background",
];
const getPath = (data, path) => path.split(".").reduce((value, key) => value?.[key], data);
function setPath(data, path, value) {
  const keys = path.split(".");
  let parent = data;
  for (const key of keys.slice(0, -1)) parent = parent[key] ??= {};
  parent[keys.at(-1)] = copy(value);
}
export function originOf(type, data) {
  return {
    kind: data.structured?.template?.kind ?? "scratch",
    id: data.structured?.template?.id ?? null,
    values: Object.fromEntries(TRACKED.map((path) => [path, copy(getPath(data, path) ?? null)])),
  };
}
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
export function modifiedFields(data) {
  const origin = data?.structured?.origin;
  if (!origin?.values || origin.kind === "scratch") return [];
  return TRACKED.filter(
    (path) =>
      Object.hasOwn(origin.values, path) && !same(origin.values[path], getPath(data, path) ?? null),
  );
}
// BI-13 (DDB errata per entry): the fields one revision changed from the previous one.
export function changedFields(before, after) {
  return [...TRACKED, "source"].filter(
    (path) => !same(getPath(before ?? {}, path) ?? null, getPath(after ?? {}, path) ?? null),
  );
}
export const FIELD_NAMES = Object.freeze({
  source: L("Fonte", "Source"),
  name: L("Nome", "Name"),
  description: L("Descrizione", "Description"),
  fields: L("Dati del tipo", "Type data"),
  "structured.prerequisites": L("Prerequisiti", "Prerequisites"),
  "structured.options": L("Opzioni", "Options"),
  "structured.modifiers": L("Modificatori", "Modifiers"),
  "structured.activities": L("Attività", "Activities"),
  "structured.advancement": L("Avanzamento", "Advancement"),
  "structured.item": L("Dati dell’oggetto", "Item data"),
  "structured.creature": L("Blocco statistiche", "Stat block"),
  "structured.subclass": L("Classe collegata", "Linked class"),
  "structured.class": L("Dati della classe", "Class data"),
  "structured.species": L("Taglia e velocità", "Size and speed"),
  "structured.background": L("Caratteristiche, abilità e talento", "Abilities, skills and feat"),
});
// Returns a copy of `data` with the chosen fields (all modified ones by default) put back
// to the values of the source it was copied or forged from.
export function revertToSource(data, paths = null) {
  const origin = data?.structured?.origin;
  if (!origin?.values || origin.kind === "scratch")
    fail("Questa voce non ha una fonte da ripristinare.", "This entry has no source to revert to.");
  const out = copy(data);
  const targets = (paths ?? modifiedFields(data)).filter((p) => Object.hasOwn(origin.values, p));
  if (!targets.length)
    fail("Nessun campo modificato rispetto alla fonte.", "No field differs from the source.");
  for (const path of targets) setPath(out, path, origin.values[path]);
  return out;
}

// ---------------------------------------------------------------- forge (R20-118, FVT-036)

export const forgeBases = () =>
  srd.ITEMS.filter((i) => i.category === "weapon" || i.category === "armor").map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
  }));
export const FORGE_TEMPLATES = Object.freeze([
  ...[1, 2, 3].map((bonus) => ({
    id: `weapon-plus-${bonus}`,
    category: "weapon",
    bonus,
    rarity: ["uncommon", "rare", "very-rare"][bonus - 1],
    name: L(`Arma +${bonus}`, `Weapon +${bonus}`),
    source: SRD.weaponPlus,
  })),
  ...[1, 2, 3].map((bonus) => ({
    id: `armor-plus-${bonus}`,
    category: "armor",
    bonus,
    rarity: ["rare", "very-rare", "legendary"][bonus - 1],
    name: L(`Armatura +${bonus}`, `Armor +${bonus}`),
    source: SRD.armorPlus,
  })),
]);
// Compatibility by type only, as in the Fantasy Grounds Forge.
export const forgeTemplatesFor = (baseId) => {
  const base = srd.getById(baseId);
  return base ? FORGE_TEMPLATES.filter((t) => t.category === base.category) : [];
};
export function forgeItem(baseId, templateIds, lang = "en") {
  const base = srd.getById(baseId);
  if (!base || !["weapon", "armor"].includes(base.category))
    fail("Scegli un’arma o un’armatura di base.", "Choose a base weapon or armor.");
  const templates = list(templateIds).map((id) => FORGE_TEMPLATES.find((t) => t.id === id));
  if (!templates.length || templates.some((t) => !t || t.category !== base.category))
    fail(
      "Scegli un modello compatibile con l’oggetto di base.",
      "Choose a template compatible with the base item.",
    );
  if (templates.length > 1) fail("Un solo bonus magico per oggetto.", "One magic bonus per item.");
  const t = templates[0];
  const type = base.category === "weapon" ? "weapon" : "armor";
  const data = emptyDefinition(type);
  data.name = L(`${base.name.it} +${t.bonus}`, `${base.name.en} +${t.bonus}`);
  data.description =
    type === "weapon"
      ? L(
          `Hai un bonus di +${t.bonus} ai tiri per colpire e ai danni effettuati con quest’arma magica.`,
          `You have a +${t.bonus} bonus to attack and damage rolls made with this magic weapon.`,
        )
      : L(
          `Hai un bonus di +${t.bonus} alla Classe Armatura mentre indossi quest’armatura.`,
          `You have a +${t.bonus} bonus to Armor Class while wearing this armor.`,
        );
  data.source = {
    ...data.source,
    label: "SRD 5.2.1",
    // X-A2: the provenance line reads in the author's language (the names are the SRD's).
    reference:
      lang === "it"
        ? `SRD 5.2.1 · ${base.name.it} + ${t.name.it} (IT p.${t.source.it.pages.join("–")} / EN p.${t.source.en.pages.join("–")})`
        : `SRD 5.2.1 · ${base.name.en} + ${t.name.en} (EN p.${t.source.en.pages.join("–")} / IT p.${t.source.it.pages.join("–")})`,
  };
  data.fields = {
    level: 0,
    school: "",
    kind: type,
    weight: Math.round(srd.poundsToKg(base.weight ?? 0) * 100) / 100,
    value: null,
  };
  const s = data.structured;
  s.template = {
    kind: "forge",
    id: `${base.id}+${t.id}`,
    name: copy(data.name),
    source: copy(t.source),
  };
  s.item = {
    baseId: base.id,
    templates: [t.id],
    rarity: t.rarity,
    magical: true,
    attunement: false,
    weapon:
      type === "weapon"
        ? {
            damage: { dice: base.weapon.damage.dice, type: base.weapon.damage.type },
            versatile: base.weapon.versatile ?? "",
            properties: [...base.weapon.properties],
            mastery: base.weapon.mastery,
            attackBonus: t.bonus,
            damageBonus: t.bonus,
          }
        : null,
    armor:
      type === "armor"
        ? {
            ac: base.armor?.ac ?? null,
            category: base.armor?.category ?? base.subcategory ?? "",
            acBonus: t.bonus,
          }
        : null,
  };
  s.origin = originOf(type, data);
  s.origin.kind = "forge";
  s.origin.id = s.template.id;
  return { type, data };
}
// BI-26 (Fantasy Grounds «copy from module» + Revert): an SRD entry's editable copy gets
// its structure (spell activity, stat block, weapon or armor data) and remembers every
// field as it was copied, so «Ripristina alla fonte» can bring any of them back. `data`
// is the copy the caller already filled (name, text, source, fields).
export function structuredFromSrd(type, entryId, data) {
  const e = srd.getById(entryId);
  if (!e) return copy(data);
  let s;
  if (type === "spell" && e.kind === "spell") {
    s = buildFromTemplate("spell", `srd-spell:${e.slug}`).structured;
    // A save with neither a listed condition nor damage stays a described activity.
    for (const a of s.activities)
      if (a.type === "save" && !a.effect?.conditionId && !a.damage?.dice) a.type = "utility";
  } else if (type === "creature" && e.kind === "creature")
    s = buildFromTemplate("creature", `srd-creature:${e.slug}`).structured;
  else {
    s = emptyStructured(type);
    s.template = { kind: "srd", id: e.id, name: copy(e.name), source: copy(e.source) };
    if (s.item) {
      s.item.baseId = e.id;
      s.item.rarity = e.rarity ?? "common";
      s.item.magical = Boolean(e.magic);
      s.item.attunement = Boolean(e.magic?.attunement);
      s.item.weapon =
        type === "weapon" && parseDice(e.weapon?.damage?.dice ?? "")
          ? {
              damage: { dice: e.weapon.damage.dice, type: e.weapon.damage.type },
              versatile: e.weapon.versatile ?? "",
              properties: [...(e.weapon.properties ?? [])],
              mastery: e.weapon.mastery,
              attackBonus: 0,
              damageBonus: 0,
            }
          : null;
      s.item.armor =
        type === "armor" && e.armor
          ? {
              ac: e.armor.ac ?? null,
              category: e.armor.category ?? e.subcategory ?? "",
              acBonus: 0,
            }
          : null;
    }
  }
  const out = { ...copy(data), structured: s };
  out.structured.origin = originOf(type, out);
  out.structured.origin.kind = "srd";
  out.structured.origin.id = e.id;
  return out;
}

// ---------------------------------------------------------------- prerequisites and stacking

export const proficiencyFor = (level) => 2 + Math.floor((Math.max(1, level) - 1) / 4);
export const modOf = (score) => Math.floor((Number(score) - 10) / 2);
export function actorClassIds(actor) {
  const rows = actor?.characterBuild?.data?.classes ?? actor?.buildSeed?.classes ?? [];
  return rows.map((r) => r.classId).filter(Boolean);
}
// A fictitious or live sheet as the evaluator reads it.
export function sheetOf(actor) {
  return {
    name: actor?.name ?? "",
    level: actor?.level ?? 1,
    classIds: actorClassIds(actor),
    abilities: { ...(actor?.abilities ?? {}) },
    ac: actor?.ac ?? 10,
    speed: actor?.speed ?? 9,
    proficiencyBonus:
      actor?.proficiencyBonus ??
      actor?.combatProfile?.proficiencyBonus ??
      proficiencyFor(actor?.level ?? 1),
  };
}
const ruleLabel = (r) =>
  r.kind === "ability"
    ? L(`${ABILITY_SHORT[r.ability].it} ${r.min}+`, `${ABILITY_SHORT[r.ability].en} ${r.min}+`)
    : r.kind === "level"
      ? L(`Livello ${r.min}+`, `Level ${r.min}+`)
      : r.kind === "class"
        ? L(`Classe: ${className(r.classId).it}`, `Class: ${className(r.classId).en}`)
        : copy(r.text);
export function describePrerequisites(s) {
  return list(s?.prerequisites).map((g) => {
    const parts = list(g.rules).map(ruleLabel);
    const join = (lang) =>
      parts
        .map((p) => pick(p, lang))
        .join(
          g.mode === "any" ? (lang === "it" ? " o " : " or ") : lang === "it" ? " e " : " and ",
        );
    return L(join("it"), join("en"));
  });
}
// AND of groups; inside a group "any" (OR) or "all" (AND). Text rules stay manual.
export function evaluatePrerequisites(s, sheet) {
  const groups = list(s?.prerequisites).map((g) => {
    const rules = list(g.rules).map((r) => {
      const ok =
        r.kind === "ability"
          ? (sheet.abilities?.[r.ability] ?? 0) >= r.min
          : r.kind === "level"
            ? (sheet.level ?? 0) >= r.min
            : r.kind === "class"
              ? list(sheet.classIds).includes(r.classId)
              : null;
      return { id: r.id, label: ruleLabel(r), ok, manual: r.kind === "text" };
    });
    const checked = rules.filter((r) => !r.manual);
    const ok = !checked.length
      ? null
      : g.mode === "any"
        ? checked.some((r) => r.ok)
        : checked.every((r) => r.ok);
    return { id: g.id, mode: g.mode, rules, ok };
  });
  const checked = groups.filter((g) => g.ok !== null);
  return {
    ok: checked.every((g) => g.ok),
    groups,
    manual: groups.flatMap((g) => g.rules.filter((r) => r.manual).map((r) => r.label)),
  };
}
export function validateChoices(s, choices = {}) {
  const errors = [];
  for (const o of list(s?.options)) {
    const picked = list(choices[o.id]);
    if (
      picked.length !== o.choose ||
      new Set(picked).size !== picked.length ||
      picked.some((id) => !o.from.some((c) => c.id === id))
    )
      errors.push({
        code: "choice",
        it: `Scegli ${o.choose} tra le alternative di «${pick(o.name, "it")}».`,
        en: `Choose ${o.choose} of the alternatives in “${pick(o.name, "en")}”.`,
      });
  }
  return errors;
}
// Modifiers the entry brings with the given choices, each tagged with its origin.
export function modifiersFor(s, choices = {}, sourceName = L("", "")) {
  const out = list(s?.modifiers).map((m) => ({ ...copy(m), source: copy(sourceName) }));
  for (const o of list(s?.options))
    for (const c of o.from.filter((c) => list(choices[o.id]).includes(c.id)))
      for (const m of list(c.modifiers))
        out.push({
          ...copy(m),
          source: L(
            `${pick(sourceName, "it")} · ${pick(c.name, "it")}`,
            `${pick(sourceName, "en")} · ${pick(c.name, "en")}`,
          ),
        });
  return out;
}
// Roll20 stacking: set base (highest) → add (a capped add never goes past its cap nor
// lowers the value) → minimum → maximum → multiply (rounded down) → override (last).
export function computeStack(base, modifiers) {
  let value = base;
  const steps = [{ mode: "base", value, entries: [] }];
  const of = (mode) => modifiers.filter((m) => m.mode === mode);
  const stage = (mode, apply) => {
    const entries = of(mode);
    if (!entries.length) return;
    value = apply(entries, value);
    steps.push({
      mode,
      value,
      entries: entries.map((m) => ({ value: m.value, limit: m.limit ?? null, source: m.source })),
    });
  };
  stage("set-base", (e) => Math.max(...e.map((m) => m.value)));
  stage("add", (e, v) =>
    e.reduce(
      (acc, m) =>
        m.limit != null ? (acc >= m.limit ? acc : Math.min(acc + m.value, m.limit)) : acc + m.value,
      v,
    ),
  );
  stage("min", (e, v) => Math.max(v, ...e.map((m) => m.value)));
  stage("max", (e, v) => Math.min(v, ...e.map((m) => m.value)));
  stage("multiply", (e, v) => Math.floor(e.reduce((acc, m) => acc * m.value, v)));
  stage("override", (e) => e.at(-1).value);
  return { base, value, steps };
}
const readTarget = (sheet, key) =>
  key === "ac" ? sheet.ac : key === "speed" ? sheet.speed : sheet.abilities?.[key];
// "Prova" on a fictitious sheet: no commit, no log, no roll (HOMEBREW_FLOW HB-06).
export function testOnSheet(type, s, sheet, choices = {}, name = L("", "")) {
  const prerequisites = evaluatePrerequisites(s, sheet);
  const choiceErrors = validateChoices(s, choices);
  const mods = modifiersFor(s, choices, name)
    .filter((m) => appliesToSheet(m))
    .map((m) => ({ ...m, value: resolveModifierValue(m, sheet) }));
  const byTarget = new Map();
  for (const m of mods) byTarget.set(m.target, [...(byTarget.get(m.target) ?? []), m]);
  const values = [...byTarget.entries()].map(([target, entries]) => ({
    target,
    ...computeStack(readTarget(sheet, target) ?? 0, entries),
  }));
  const manual = modifiersFor(s, choices, name).filter((m) => !appliesToSheet(m));
  const activities = list(s?.activities).map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    dc: a.type === "save" ? saveDcFor(a, sheet) : null,
    effect: a.effect?.conditionId
      ? { condition: conditionName(a.effect.conditionId), duration: anchorName(a.effect.duration) }
      : null,
  }));
  const advancement = list(s?.advancement)
    .filter((a) => a.level <= sheet.level)
    .map((a) => ({ level: a.level, type: a.type, names: advancementNames(a, sheet.level) }));
  // A subclass needs its class on the sheet.
  const classOk =
    type === "subclass" && s?.subclass?.classId
      ? list(sheet.classIds).includes(s.subclass.classId)
      : null;
  return {
    prerequisites,
    choiceErrors,
    values,
    manual,
    activities,
    advancement,
    classOk,
    eligible: prerequisites.ok && !choiceErrors.length && classOk !== false,
  };
}
export function saveDcFor(activity, sheet) {
  const dc = activity.save?.dc;
  if (dc?.mode === "fixed")
    return { value: dc.value, formula: L(`CD fissa ${dc.value}`, `Fixed DC ${dc.value}`) };
  const pb = sheet.proficiencyBonus ?? proficiencyFor(sheet.level ?? 1);
  const m = modOf(sheet.abilities?.[dc?.ability] ?? 10);
  const value = 8 + pb + m;
  return {
    value,
    formula: L(
      `8 + competenza ${pb} + ${ABILITY_SHORT[dc?.ability]?.it ?? "?"} ${m >= 0 ? "+" : "−"}${Math.abs(m)} = ${value}`,
      `8 + proficiency ${pb} + ${ABILITY_SHORT[dc?.ability]?.en ?? "?"} ${m >= 0 ? "+" : "−"}${Math.abs(m)} = ${value}`,
    ),
  };
}
function advancementNames(a, level) {
  if (a.type === "grant") return list(a.features).map((f) => copy(f.name));
  if (a.type === "scale") {
    const keys = Object.keys(a.scale?.values ?? {})
      .map(Number)
      .filter((k) => k <= level)
      .sort((x, y) => x - y);
    const value = keys.length ? a.scale.values[keys.at(-1)] : "—";
    return [L(`${pick(a.scale?.name, "it")}: ${value}`, `${pick(a.scale?.name, "en")}: ${value}`)];
  }
  if (a.type === "asi")
    return [
      L(
        `Aumento di ${a.asi?.points ?? 2} punti (max ${a.asi?.limit ?? 20})`,
        `Increase of ${a.asi?.points ?? 2} points (max ${a.asi?.limit ?? 20})`,
      ),
    ];
  return [L(`Scelta: ${pick(a.choice?.name, "it")}`, `Choice: ${pick(a.choice?.name, "en")}`)];
}

// ---------------------------------------------------------------- campaign safe mode (FVT-198)

export function campaignRecord(slice, campaignId) {
  return (
    slice.campaigns?.[campaignId] ?? {
      disabled: false,
      disabledContent: [],
      savedEnabled: [],
      culprit: null,
    }
  );
}
function editableCampaign(slice, campaignId) {
  slice.campaigns[campaignId] ??= {
    disabled: false,
    disabledContent: [],
    savedEnabled: [],
    culprit: null,
  };
  return slice.campaigns[campaignId];
}
// Whether an entry's effects and activities run for this actor now. Safe mode and the
// per-entry switch belong to the campaign; a personal sheet outside it is unaffected.
export function contentActive(state, slice, contentId, actor) {
  if (!actor || !isCampaignActor(actor, state.campaign?.id)) return true;
  const rec = campaignRecord(slice, state.campaign.id);
  return !rec.disabled && !list(rec.disabledContent).includes(contentId);
}
const requireDm = (role) => {
  if (role !== "dm")
    fail(
      "Solo il DM gestisce l’homebrew della campagna.",
      "Only the DM manages the campaign’s homebrew.",
    );
};
// Safe mode: every homebrew revision stops being a campaign option and its effects and
// activities are suspended on campaign sheets; re-enabling restores the same revisions.
export function setHomebrewDisabled(state, slice, disabled, role) {
  requireDm(role);
  const rec = editableCampaign(slice, state.campaign.id);
  if (rec.disabled === disabled)
    fail(
      disabled ? "L’homebrew è già disattivato." : "L’homebrew è già attivo.",
      disabled ? "Homebrew is already disabled." : "Homebrew is already active.",
    );
  if (disabled) {
    rec.savedEnabled = copy(state.campaign.enabledContent ?? []);
    state.campaign.enabledContent = [];
  } else {
    const current = state.campaign.enabledContent ?? [];
    const merged = [...current];
    for (const ref of list(rec.savedEnabled))
      if (!merged.some((r) => r.contentId === ref.contentId && r.revisionId === ref.revisionId))
        merged.push(copy(ref));
    state.campaign.enabledContent = merged;
    rec.savedEnabled = [];
  }
  rec.disabled = disabled;
  recomputeAll(state, slice);
  return rec;
}
export function setContentDisabled(state, slice, contentId, disabled, role) {
  requireDm(role);
  const rec = editableCampaign(slice, state.campaign.id);
  const set = new Set(rec.disabledContent);
  if (disabled) set.add(contentId);
  else set.delete(contentId);
  rec.disabledContent = [...set];
  recomputeAll(state, slice);
  return rec;
}
// Content in play in this campaign: enabled revisions plus entries on campaign sheets.
export function campaignContentIds(state, slice) {
  const ids = new Set((state.campaign.enabledContent ?? []).map((r) => r.contentId));
  for (const r of list(campaignRecord(slice, state.campaign.id).savedEnabled)) ids.add(r.contentId);
  for (const [actorId, rec] of Object.entries(slice.sheets ?? {}))
    if (isCampaignActor(state.actors[actorId], state.campaign.id))
      for (const e of list(rec.entries)) ids.add(e.contentId);
  // BI-28: a copy added through the Library (no structured entry) is in play too.
  for (const actor of Object.values(state.actors ?? {}))
    if (isCampaignActor(actor, state.campaign.id))
      for (const k of ["features", "inventory", "spells"])
        for (const r of list(actor[k]))
          if (r.homebrewRef?.contentId) ids.add(r.homebrewRef.contentId);
  return [...ids].filter((id) => (state.library ?? []).some((c) => c.id === id));
}
// Find the Culprit: disable half of the suspects, ask whether the problem persists,
// keep the half that must contain the culprit, until one entry remains.
export function startCulprit(state, slice, role) {
  requireDm(role);
  const rec = editableCampaign(slice, state.campaign.id);
  if (rec.disabled)
    fail(
      "Riattiva l’homebrew prima di cercare il colpevole.",
      "Re-enable homebrew before looking for the culprit.",
    );
  const suspects = campaignContentIds(state, slice).filter(
    (id) => !rec.disabledContent.includes(id),
  );
  if (suspects.length < 2)
    fail(
      "Servono almeno due voci homebrew attive nella campagna.",
      "At least two active homebrew entries are needed in the campaign.",
    );
  rec.culprit = {
    suspects,
    testing: suspects.slice(0, Math.ceil(suspects.length / 2)),
    step: 1,
    history: [],
    found: null,
    before: [...rec.disabledContent],
  };
  rec.disabledContent = [...new Set([...rec.culprit.before, ...rec.culprit.testing])];
  recomputeAll(state, slice);
  return rec.culprit;
}
export function answerCulprit(state, slice, problemPersists, role) {
  requireDm(role);
  const rec = editableCampaign(slice, state.campaign.id);
  const c = rec.culprit;
  if (!c || c.found) fail("Nessuna ricerca in corso.", "No search in progress.");
  const active = c.suspects.filter((id) => !c.testing.includes(id));
  c.history.push({ disabled: [...c.testing], problemPersists: !!problemPersists });
  c.suspects = problemPersists ? active : [...c.testing];
  c.step++;
  if (c.suspects.length === 1) {
    c.found = c.suspects[0];
    c.testing = [];
    rec.disabledContent = [...new Set([...c.before, c.found])];
  } else {
    c.testing = c.suspects.slice(0, Math.ceil(c.suspects.length / 2));
    rec.disabledContent = [...new Set([...c.before, ...c.testing])];
  }
  recomputeAll(state, slice);
  return c;
}
export function endCulprit(state, slice, { keepDisabled = false } = {}, role) {
  requireDm(role);
  const rec = editableCampaign(slice, state.campaign.id);
  const c = rec.culprit;
  if (!c) fail("Nessuna ricerca in corso.", "No search in progress.");
  rec.disabledContent = [...new Set([...c.before, ...(keepDisabled && c.found ? [c.found] : [])])];
  rec.culprit = null;
  recomputeAll(state, slice);
  return rec;
}

// ---------------------------------------------------------------- sheet application

const AUTOMATED_KEYS = ["ac", "speed", ...ABILITIES];
function readActor(actor, key) {
  if (key === "ac") return actor.ac;
  if (key === "speed") return actor.speed;
  return actor.abilities?.[key];
}
function writeActor(actor, key, value) {
  if (key === "ac") actor.ac = value;
  else if (key === "speed") actor.speed = value;
  else (actor.abilities ??= {})[key] = value;
}
// A modifier the sheet applies by itself: an automated value, no written condition, not
// a roll mode (BI-18), and, when timed, only while active (BI-20).
const appliesToSheet = (m) =>
  Boolean(targetInfo(m?.target)?.automated) && !conditionText(m) && !ROLL_MODES.includes(m.mode);
function sheetModifiers(state, slice, actorId) {
  const rec = slice.sheets?.[actorId];
  const actor = state.actors?.[actorId];
  const byTarget = new Map();
  if (!rec || !actor) return byTarget;
  const sheet = sheetOf(actor);
  for (const entry of list(rec.entries)) {
    if (!contentActive(state, slice, entry.contentId, actor) || entry.pendingChoices) continue;
    for (const m of list(entry.modifiers))
      if (
        AUTOMATED_KEYS.includes(m.target) &&
        appliesToSheet(m) &&
        (!isTimed(m) || entry.activeTimed?.[m.id])
      )
        byTarget.set(m.target, [
          ...(byTarget.get(m.target) ?? []),
          { ...m, value: resolveModifierValue(m, sheet) },
        ]);
  }
  return byTarget;
}
export function sheetRecord(slice, actorId) {
  return slice.sheets?.[actorId] ?? null;
}
// Recomputes every automated value an entry touches from its recorded base. A value a
// person corrected by hand since the last computation moves the base by the same amount
// (the correction is kept, the homebrew modifier stays on top).
export function recomputeSheet(state, slice, actorId) {
  const rec = slice.sheets?.[actorId];
  const actor = state.actors?.[actorId];
  if (!rec || !actor) return null;
  rec.base ??= {};
  rec.last ??= {};
  const byTarget = sheetModifiers(state, slice, actorId);
  const keys = new Set([...Object.keys(rec.base), ...byTarget.keys()]);
  const report = {};
  for (const key of keys) {
    const current = readActor(actor, key);
    if (!Number.isFinite(current)) continue;
    if (!Object.hasOwn(rec.base, key)) {
      rec.base[key] = current;
      rec.last[key] = current;
    } else if (Number.isFinite(rec.last[key]) && current !== rec.last[key])
      rec.base[key] += current - rec.last[key];
    const result = computeStack(rec.base[key], byTarget.get(key) ?? []);
    writeActor(actor, key, result.value);
    report[key] = result;
    if (byTarget.has(key)) rec.last[key] = result.value;
    else {
      delete rec.base[key];
      delete rec.last[key];
    }
  }
  if (!list(rec.entries).length) delete slice.sheets[actorId];
  return report;
}
export function recomputeAll(state, slice) {
  for (const actorId of Object.keys(slice.sheets ?? {})) recomputeSheet(state, slice, actorId);
}
export function stackReport(state, slice, actorId) {
  const rec = slice.sheets?.[actorId];
  const actor = state.actors?.[actorId];
  if (!rec || !actor) return [];
  const byTarget = sheetModifiers(state, slice, actorId);
  return [...byTarget.entries()].map(([target, mods]) => ({
    target,
    ...computeStack(rec.base?.[target] ?? readActor(actor, target), mods),
  }));
}
function readableRevision(state, ref, role) {
  try {
    return hb.getHomebrewRevision(state, ref, role);
  } catch {
    fail(
      "Revisione non disponibile per questa identità.",
      "Revision unavailable to this identity.",
    );
  }
}
function controlled(state, actorId, role) {
  const actor = state.actors?.[actorId];
  if (!actor || !canControlActor(actor, role, state))
    fail("Non controlli questa scheda.", "You do not control this sheet.");
  return actor;
}
// Adds a structured feat/feature/item/species/background to a sheet: the Library's own
// sheet copy (same permissions, campaign enablement and row shape) plus the choices and
// effects this area applies. Prerequisites must pass unless the DM overrides with a reason.
export function applyToSheet(
  state,
  slice,
  { actorId, ref, choices = {}, rowId, override = null },
  role,
) {
  const actor = controlled(state, actorId, role);
  const revision = readableRevision(state, ref, role);
  const s = revision.data.structured;
  if (!object(s))
    fail(
      "Questa voce non ha comportamento strutturato.",
      "This entry has no structured behaviour.",
    );
  if (revision.type === "subclass" || revision.type === "class" || revision.type === "creature")
    fail(
      "Questo tipo si applica dal suo percorso (avanzamento o scena).",
      "This type is applied through its own flow (advancement or scene).",
    );
  if (list(slice.sheets?.[actorId]?.entries).some((e) => e.contentId === ref.contentId))
    fail(
      "La scheda ha già questa voce: aggiornala dalla Biblioteca.",
      "The sheet already has this entry: update it from the Library.",
    );
  const check = evaluatePrerequisites(s, sheetOf(actor));
  if (!check.ok) {
    if (!(role === "dm" && typeof override === "string" && override.trim()))
      fail(
        "I prerequisiti non sono soddisfatti su questa scheda.",
        "The prerequisites are not met on this sheet.",
      );
  }
  const choiceErrors = validateChoices(s, choices);
  if (choiceErrors.length) fail(choiceErrors[0].it, choiceErrors[0].en);
  // X-A1: a campaign sheet needs the campaign's enablement and readers; name what is missing.
  const steps = hb.homebrewUseSteps(state, ref, { actorId }, role);
  if (steps.length)
    fail(
      `Prima di applicarla a ${actor.name}: ${steps.map((x) => `«${x.it}»`).join(" · ")}.`,
      `Before applying it to ${actor.name}: ${steps.map((x) => `“${x.en}”`).join(" · ")}.`,
    );
  const built = hb.materializeHomebrewCopy(state, ref, role, { id: rowId, actorId });
  (actor[built.targetKind] ??= []).push(built.row);
  const entry = {
    rowId,
    targetKind: built.targetKind,
    contentId: ref.contentId,
    revisionId: ref.revisionId,
    type: revision.type,
    name: copy(revision.data.name),
    choices: copy(choices),
    modifiers: modifiersFor(s, choices, revision.data.name),
    activities: copy(list(s.activities)),
    appliedAt: now(),
    appliedBy: role,
    ...(check.ok ? {} : { override: { reason: override.trim(), by: role } }),
    pendingChoices: false,
  };
  slice.sheets[actorId] ??= { base: {}, last: {}, entries: [] };
  slice.sheets[actorId].entries.push(entry);
  recomputeSheet(state, slice, actorId);
  return entry;
}
// A structured entry added through the Library's generic "add to sheet" arrives without
// choices: the sheet box offers to complete them here.
export function adoptSheetRow(state, slice, { actorId, rowId, choices = {} }, role) {
  const actor = controlled(state, actorId, role);
  const row = ["features", "inventory", "spells"]
    .flatMap((k) => list(actor[k]).map((r) => ({ r, k })))
    .find((x) => x.r.id === rowId);
  if (!row?.r.homebrewRef) fail("Riga della scheda non trovata.", "Sheet row not found.");
  if (list(slice.sheets?.[actorId]?.entries).some((e) => e.rowId === rowId))
    fail("Scelte già registrate.", "Choices already recorded.");
  const revision = readableRevision(state, row.r.homebrewRef, role);
  const s = revision.data.structured;
  const choiceErrors = validateChoices(s, choices);
  if (choiceErrors.length) fail(choiceErrors[0].it, choiceErrors[0].en);
  slice.sheets[actorId] ??= { base: {}, last: {}, entries: [] };
  const entry = {
    rowId,
    targetKind: row.k,
    contentId: row.r.homebrewRef.contentId,
    revisionId: row.r.homebrewRef.revisionId,
    type: revision.type,
    name: copy(revision.data.name),
    choices: copy(choices),
    modifiers: modifiersFor(s, choices, revision.data.name),
    activities: copy(list(s.activities)),
    appliedAt: now(),
    appliedBy: role,
    pendingChoices: false,
  };
  slice.sheets[actorId].entries.push(entry);
  recomputeSheet(state, slice, actorId);
  return entry;
}
// Rows of homebrew with structured behaviour on the sheet that this area has not yet
// connected (added through the generic Library flow).
export function unconnectedRows(state, slice, actorId, role) {
  const actor = state.actors?.[actorId];
  if (!actor) return [];
  const known = new Set(list(slice.sheets?.[actorId]?.entries).map((e) => e.rowId));
  const out = [];
  for (const k of ["features", "inventory", "spells"])
    for (const r of list(actor[k])) {
      if (!r.homebrewRef || known.has(r.id) || r.grantId?.startsWith?.("homebrew-advancement:"))
        continue;
      try {
        const rev = hb.getHomebrewRevision(state, r.homebrewRef, role);
        if (
          object(rev.data.structured) &&
          (list(rev.data.structured.options).length ||
            list(rev.data.structured.modifiers).length ||
            list(rev.data.structured.activities).length)
        )
          out.push({
            rowId: r.id,
            targetKind: k,
            ref: copy(r.homebrewRef),
            name: rev.data.name,
            structured: rev.data.structured,
          });
      } catch {}
    }
  return out;
}
// Removes an entry and its effects; the sheet row goes with it when it is still there.
// `rowId` "subclass" removes the homebrew subclass and the features it granted (as
// changing the subclass in D&D Beyond's builder removes the old subclass's features).
export function removeFromSheet(state, slice, { actorId, rowId }, role) {
  const actor = controlled(state, actorId, role);
  const rec = slice.sheets?.[actorId];
  const entry =
    rowId === "subclass"
      ? subclassEntry(slice, actorId)
      : list(rec?.entries).find((e) => e.rowId === rowId);
  if (!entry) fail("Voce non trovata sulla scheda.", "Entry not found on the sheet.");
  rec.entries = rec.entries.filter((e) => e !== entry);
  if (entry.targetKind)
    actor[entry.targetKind] = list(actor[entry.targetKind]).filter((r) => r.id !== rowId);
  for (const id of list(entry.grantedRowIds))
    actor.features = list(actor.features).filter((r) => r.id !== id);
  recomputeSheet(state, slice, actorId);
  if (!list(rec.entries).length) delete slice.sheets[actorId];
  return entry;
}
// Entries whose sheet row a person removed elsewhere: their effects are still applied
// until cleared here (never silently).
export function orphanEntries(state, slice, actorId) {
  const actor = state.actors?.[actorId];
  return list(slice.sheets?.[actorId]?.entries).filter(
    (e) => e.targetKind && !list(actor?.[e.targetKind]).some((r) => r.id === e.rowId),
  );
}
// Entries whose sheet row the Library's own update flow moved to another revision: the
// effects still come from the old one until they follow it here (never silently).
export function staleEntries(state, slice, actorId) {
  const actor = state.actors?.[actorId];
  return list(slice.sheets?.[actorId]?.entries).flatMap((e) => {
    const row = e.targetKind && list(actor?.[e.targetKind]).find((r) => r.id === e.rowId);
    const ref = row?.homebrewRef;
    return ref?.contentId === e.contentId && ref.revisionId !== e.revisionId
      ? [{ ...e, toRef: copy(ref) }]
      : [];
  });
}
// Makes an entry's choices, effects and activities follow the revision its row now holds.
// Earlier choices are kept when the new revision still offers them; otherwise pass new ones.
export function refreshEntry(state, slice, { actorId, rowId, choices = null }, role) {
  controlled(state, actorId, role);
  const stale = staleEntries(state, slice, actorId).find((e) => e.rowId === rowId);
  if (!stale)
    fail(
      "Gli effetti seguono già la revisione della scheda.",
      "The effects already follow the sheet's revision.",
    );
  const revision = readableRevision(state, stale.toRef, role);
  const s = revision.data.structured;
  if (!object(s))
    fail(
      "Questa revisione non ha comportamento strutturato.",
      "This revision has no structured behaviour.",
    );
  const picked = choices ?? stale.choices ?? {};
  const choiceErrors = validateChoices(s, picked);
  if (choiceErrors.length) fail(choiceErrors[0].it, choiceErrors[0].en);
  const entry = slice.sheets[actorId].entries.find((e) => e.rowId === rowId);
  Object.assign(entry, {
    revisionId: stale.toRef.revisionId,
    name: copy(revision.data.name),
    choices: copy(picked),
    modifiers: modifiersFor(s, picked, revision.data.name),
    activities: copy(list(s.activities)),
    refreshedAt: now(),
    refreshedBy: role,
  });
  recomputeSheet(state, slice, actorId);
  return entry;
}

// BI-16 (DDB "Create New Version"; Foundry keeps the sheet copy independent): after the
// Library adds or updates a sheet row, its structured behaviour follows the row's revision
// in the same change, exactly as «Applica a una scheda» would. Choices already made are
// kept when the new revision still offers them; otherwise (or when a first choice is due)
// the sheet box asks («Completa le scelte» / «Aggiorna gli effetti»). A revision without
// structure clears the old effects instead of leaving them silently applied.
export function followLibraryRow(state, slice, { actorId, rowId }, role) {
  const actor = state.actors?.[actorId];
  const row = ["features", "inventory", "spells"]
    .flatMap((k) => list(actor?.[k]))
    .find((r) => r.id === rowId);
  if (!row?.homebrewRef) return null;
  let revision;
  try {
    revision = hb.getHomebrewRevision(state, row.homebrewRef, role);
  } catch {
    return null;
  }
  const s = revision.data.structured;
  const entry = list(slice.sheets?.[actorId]?.entries).find((e) => e.rowId === rowId);
  if (entry) {
    if (entry.revisionId === row.homebrewRef.revisionId) return entry;
    if (!object(s)) {
      Object.assign(entry, {
        revisionId: row.homebrewRef.revisionId,
        name: copy(revision.data.name),
        choices: {},
        modifiers: [],
        activities: [],
        refreshedAt: now(),
        refreshedBy: role,
      });
      recomputeSheet(state, slice, actorId);
      return entry;
    }
    if (validateChoices(s, entry.choices ?? {}).length) return null;
    return refreshEntry(state, slice, { actorId, rowId, choices: entry.choices ?? {} }, role);
  }
  if (
    !object(s) ||
    list(s.options).length ||
    !(list(s.modifiers).length || list(s.activities).length)
  )
    return null;
  return adoptSheetRow(state, slice, { actorId, rowId, choices: {} }, role);
}
// ---------------------------------------------------------------- timed modifiers (BI-20)

// Foundry Active Effects with a duration: an entry's timed modifiers start together (its
// activity is used, or «Attiva» on the sheet) and each ends at its own anchor; the values
// are written and taken back in the same change that starts or ends them.
export const timedModifiers = (entry) => list(entry?.modifiers).filter(isTimed);
function entryOf(slice, actorId, rowId) {
  const entry = list(slice.sheets?.[actorId]?.entries).find((e) => e.rowId === rowId);
  if (!entry) fail("Voce non trovata sulla scheda.", "Entry not found on the sheet.");
  return entry;
}
function startTimed(state, entry) {
  const since = state.combat?.active ? combatTurnKey(state.combat) : null;
  entry.activeTimed = Object.fromEntries(
    timedModifiers(entry).map((m) => [
      m.id,
      {
        since,
        round: state.combat?.active ? state.combat.round : null,
        seenStart: false,
        at: now(),
      },
    ]),
  );
}
export function activateTimed(state, slice, { actorId, rowId }, role) {
  controlled(state, actorId, role);
  const entry = entryOf(slice, actorId, rowId);
  if (!timedModifiers(entry).length)
    fail("Questa voce non ha effetti a tempo.", "This entry has no timed effects.");
  startTimed(state, entry);
  recomputeSheet(state, slice, actorId);
  return entry;
}
export function endTimed(state, slice, { actorId, rowId }, role) {
  controlled(state, actorId, role);
  const entry = entryOf(slice, actorId, rowId);
  delete entry.activeTimed;
  recomputeSheet(state, slice, actorId);
  return entry;
}
// Turn anchors, called inside the combat transaction (combat.mjs observeTurnPhases).
export function expireTimedOnTurn(state, slice, { actorId, phase, turnKey }) {
  const entries = list(slice.sheets?.[actorId]?.entries).filter((e) => e.activeTimed);
  if (!entries.length) return [];
  const ended = [];
  for (const entry of entries) {
    for (const m of timedModifiers(entry)) {
      const st = entry.activeTimed[m.id];
      if (!st) continue;
      const anchor = m.duration.anchor;
      const later = turnKey !== st.since;
      let expire = false;
      if (phase === "start") {
        if (anchor === "start-next-self" && later) expire = true;
        if (anchor === "rounds" && later && st.round != null)
          expire = (state.combat?.round ?? 0) >= st.round + m.duration.rounds;
        if (anchor === "end-next-self" && later) st.seenStart = true;
      } else if (phase === "end") {
        if (anchor === "end-current-self") expire = true;
        if (anchor === "end-next-self" && st.seenStart) expire = true;
      }
      if (expire) {
        delete entry.activeTimed[m.id];
        ended.push({ contentId: entry.contentId, modifierId: m.id, name: copy(entry.name) });
      }
    }
    if (!Object.keys(entry.activeTimed).length) delete entry.activeTimed;
  }
  if (ended.length) recomputeSheet(state, slice, actorId);
  return ended;
}
// Rest anchors: a short-rest anchor ends on any rest, a long-rest anchor on a Long Rest.
const endsOnRest = (m, kind) =>
  m.duration.anchor === "short-rest" || (m.duration.anchor === "long-rest" && kind === "long");
export function timedEndingOnRest(slice, { actorId, kind }) {
  return list(slice.sheets?.[actorId]?.entries).some((e) =>
    timedModifiers(e).some((m) => e.activeTimed?.[m.id] && endsOnRest(m, kind)),
  );
}
export function expireTimedOnRest(state, slice, { actorId, kind }) {
  let changed = false;
  for (const e of list(slice.sheets?.[actorId]?.entries))
    for (const m of timedModifiers(e))
      if (e.activeTimed?.[m.id] && endsOnRest(m, kind)) {
        delete e.activeTimed[m.id];
        if (!Object.keys(e.activeTimed).length) delete e.activeTimed;
        changed = true;
      }
  if (changed) recomputeSheet(state, slice, actorId);
  return changed;
}
// Using one of an entry's activities starts its timed modifiers (Foundry: apply on use).
function startTimedOnUse(state, slice, actorId, contentId) {
  const entry = list(slice.sheets?.[actorId]?.entries).find((e) => e.contentId === contentId);
  if (!entry || !timedModifiers(entry).length) return;
  startTimed(state, entry);
  recomputeSheet(state, slice, actorId);
}

// DDB update notice: sheet rows whose content has a later revision this sheet may use.
export function updatesFor(state, actorId, role) {
  const actor = state.actors?.[actorId];
  if (!actor) return [];
  const out = [];
  for (const k of ["features", "inventory", "spells"])
    for (const r of list(actor[k])) {
      if (!r.homebrewRef) continue;
      const content = (state.library ?? []).find((c) => c.id === r.homebrewRef.contentId);
      const at = content?.revisions.findIndex((x) => x.id === r.homebrewRef.revisionId) ?? -1;
      if (!content || at < 0) continue;
      const next = content.revisions
        .slice(at + 1)
        .map((x) => ({ contentId: content.id, revisionId: x.id }))
        .filter((ref) => hb.homebrewAvailability(state, ref, { actorId }, role).canUse)
        .at(-1);
      if (next)
        out.push({
          rowId: r.id,
          targetKind: k,
          name: copy(r.name),
          from: at + 1,
          to: content.revisions.findIndex((x) => x.id === next.revisionId) + 1,
          ref: next,
        });
    }
  return out;
}
// BI-28 (Roll20 list of fully automated books): every sheet holding a copy of a content,
// whichever path added it (the editor's «Applica», the Library, the builder), with the
// revision it holds.
export function sheetsHolding(state, contentId) {
  const out = [];
  for (const actor of Object.values(state.actors ?? {}))
    for (const k of ["features", "inventory", "spells"])
      for (const r of list(actor[k]))
        if (r.homebrewRef?.contentId === contentId)
          out.push({ actorId: actor.id, name: actor.name, revisionId: r.homebrewRef.revisionId });
  return out;
}
// The automation of a revision: declared when saved by this editor, computed otherwise.
export function revisionAutomation(type, revision) {
  const s = revision?.data?.structured;
  return object(s?.automation) ? s.automation : automationOf(type, s);
}

// ---------------------------------------------------------------- subclass advancement

export function subclassCandidates(state, actorId, role) {
  const actor = state.actors?.[actorId];
  const classIds = actorClassIds(actor);
  return hb
    .listHomebrew(state, role)
    .filter((e) => e.type === "subclass")
    .flatMap((e) => {
      const ref = e.latestRef;
      try {
        const rev = hb.getHomebrewRevision(state, ref, role);
        const classId = rev.data.structured?.subclass?.classId;
        if (!classIds.includes(classId)) return [];
        const available = hb.homebrewAvailability(state, ref, { actorId }, role);
        return [
          {
            ref,
            name: rev.data.name,
            classId,
            canUse: available.canUse,
            structured: rev.data.structured,
          },
        ];
      } catch {
        return [];
      }
    });
}
const subclassEntry = (slice, actorId) =>
  list(slice.sheets?.[actorId]?.entries).find((e) => e.type === "subclass");
export function chooseSubclass(state, slice, { actorId, ref }, role) {
  const actor = controlled(state, actorId, role);
  const revision = readableRevision(state, ref, role);
  const s = revision.data.structured;
  if (revision.type !== "subclass" || !object(s))
    fail("Scegli una sottoclasse.", "Choose a subclass.");
  if (!actorClassIds(actor).includes(s.subclass?.classId))
    fail("La sottoclasse è di un’altra classe.", "The subclass belongs to another class.");
  if (!hb.homebrewAvailability(state, ref, { actorId }, role).canUse)
    fail(
      "Questa revisione non è disponibile per la scheda: condividila e falla abilitare dal DM.",
      "This revision is unavailable for the sheet: share it and have the DM enable it.",
    );
  if (subclassEntry(slice, actorId))
    fail(
      "La scheda ha già una sottoclasse homebrew.",
      "The sheet already has a homebrew subclass.",
    );
  const first = Math.min(...list(s.advancement).map((a) => a.level), 99);
  if (actor.level < Math.min(first, 3))
    fail(
      `La sottoclasse si sceglie dal livello ${Math.min(first, 3)}.`,
      `The subclass is chosen from level ${Math.min(first, 3)}.`,
    );
  slice.sheets[actorId] ??= { base: {}, last: {}, entries: [] };
  const entry = {
    rowId: null,
    targetKind: null,
    contentId: ref.contentId,
    revisionId: ref.revisionId,
    type: "subclass",
    classId: s.subclass.classId,
    name: copy(revision.data.name),
    advancement: copy(list(s.advancement)),
    modifiers: modifiersFor(s, {}, revision.data.name),
    activities: copy(list(s.activities)),
    granted: [],
    grantedRowIds: [],
    asi: {},
    choices: {},
    appliedAt: now(),
    appliedBy: role,
    pendingChoices: false,
  };
  slice.sheets[actorId].entries.push(entry);
  recomputeSheet(state, slice, actorId);
  return entry;
}
// Advancement steps due at the sheet's current level and not yet applied (dnd5e: the
// Advancement flow runs when the level rises, whatever flow raised it).
export function pendingAdvancement(state, slice, actorId) {
  const actor = state.actors?.[actorId];
  const entry = subclassEntry(slice, actorId);
  if (!actor || !entry) return [];
  return list(entry.advancement).filter(
    (a) => a.level <= actor.level && !entry.granted.includes(a.id),
  );
}
export function futureAdvancement(state, slice, actorId) {
  const actor = state.actors?.[actorId];
  const entry = subclassEntry(slice, actorId);
  if (!actor || !entry) return [];
  return list(entry.advancement).filter((a) => a.level > actor.level);
}
export const subclassOf = subclassEntry;
export function applyAdvancement(state, slice, { actorId, asi = {}, choices = {} }, role) {
  const actor = controlled(state, actorId, role);
  const entry = subclassEntry(slice, actorId);
  if (!entry)
    fail("Nessuna sottoclasse homebrew sulla scheda.", "No homebrew subclass on the sheet.");
  if (!contentActive(state, slice, entry.contentId, actor))
    fail("L’homebrew è disattivato per la campagna.", "Homebrew is disabled for the campaign.");
  const due = pendingAdvancement(state, slice, actorId).sort((a, b) => a.level - b.level);
  if (!due.length)
    fail("Nessun avanzamento da applicare a questo livello.", "No advancement due at this level.");
  const ref = { contentId: entry.contentId, revisionId: entry.revisionId };
  const source = homebrewSource(ref, pick(entry.name, "en"));
  for (const a of due) {
    const grant = (feature, suffix = "") => {
      const id = `hb-${entry.contentId.slice(0, 40)}-${a.id}-${feature.id}${suffix}`.slice(0, 190);
      if (list(actor.features).some((r) => r.id === id)) return;
      (actor.features ??= []).push({
        id,
        name: copy(feature.name),
        description: copy(feature.description ?? L("", "")),
        level: a.level,
        source: copy(source),
        homebrewRef: copy(ref),
        grantId: `homebrew-advancement:${entry.contentId}`,
      });
      entry.grantedRowIds.push(id);
    };
    if (a.type === "grant") list(a.features).forEach((f) => grant(f));
    if (a.type === "choice") {
      const picked = a.choice.from.find((f) => f.id === choices[a.id]);
      if (!picked)
        fail(`Livello ${a.level}: scegli un privilegio.`, `Level ${a.level}: choose a feature.`);
      entry.choices[a.id] = picked.id;
      grant(picked);
    }
    if (a.type === "asi") {
      const spread = asi[a.id] ?? {};
      const total = Object.values(spread).reduce((x, y) => x + y, 0);
      if (
        total !== a.asi.points ||
        Object.entries(spread).some(([k, v]) => !ABILITIES.includes(k) || !int(v, 0, 2))
      )
        fail(
          `Livello ${a.level}: distribuisci ${a.asi.points} punti (massimo 2 per caratteristica).`,
          `Level ${a.level}: assign ${a.asi.points} points (at most 2 per ability).`,
        );
      entry.asi[a.id] = copy(spread);
      for (const [ability, value] of Object.entries(spread))
        if (value)
          entry.modifiers.push({
            ...newModifier(ability, "add", value),
            limit: a.asi.limit,
            source: L(
              `${pick(entry.name, "it")} · livello ${a.level}`,
              `${pick(entry.name, "en")} · level ${a.level}`,
            ),
          });
    }
    entry.granted.push(a.id);
  }
  recomputeSheet(state, slice, actorId);
  return due;
}
export function scaleValues(entry, level) {
  return list(entry?.advancement)
    .filter((a) => a.type === "scale")
    .map((a) => {
      const keys = Object.keys(a.scale.values)
        .map(Number)
        .filter((k) => k <= level)
        .sort((x, y) => x - y);
      return { name: a.scale.name, value: keys.length ? a.scale.values[keys.at(-1)] : null };
    });
}

// ---------------------------------------------------------------- activities at the Table

export function actorActivities(state, slice, actorId) {
  const actor = state.actors?.[actorId];
  if (!actor) return [];
  return list(slice.sheets?.[actorId]?.entries).flatMap((entry) =>
    list(entry.activities).map((activity) => ({
      key: `${entry.contentId}:${activity.id}`,
      contentId: entry.contentId,
      revisionId: entry.revisionId,
      entryName: entry.name,
      activity,
      active: contentActive(state, slice, entry.contentId, actor) && !entry.pendingChoices,
    })),
  );
}
const sceneOf = (state) => state.scenes?.find((s) => s.id === state.activeSceneId);
export function tokenDistance(state, fromId, toId) {
  const scene = sceneOf(state);
  const a = scene?.tokens?.find((t) => t.actorId === fromId);
  const b = scene?.tokens?.find((t) => t.actorId === toId);
  if (!scene || !a || !b) return null;
  return (Math.hypot(a.x - b.x, a.y - b.y) / (scene.gridSize || 50)) * (scene.metersPerCell || 1.5);
}
// Token visibility as the combat module targets: the DM sees every token; others see
// tokens that are not hidden (and a private actor only its controller).
function tokenVisible(state, token, role) {
  const actor = state.actors?.[token.actorId];
  if (!actor) return false;
  if (actor.visibility === "private") return canControlActor(actor, role, state);
  return role === "dm" || (!actor.hidden && !token.hidden && token.visible !== false);
}
export function targetOptions(state, actorId, activity, role) {
  const scene = sceneOf(state);
  return list(scene?.tokens)
    .filter((t) => t.actorId !== actorId && tokenVisible(state, t, role))
    .map((t) => {
      const distance = tokenDistance(state, actorId, t.actorId);
      return {
        actorId: t.actorId,
        name: state.actors[t.actorId].name,
        distance,
        inRange: distance != null && distance <= (activity.activation?.rangeMeters ?? 0) + 0.01,
      };
    });
}
const currentTurnActor = (state) =>
  state.combat?.active ? state.combat.order?.[state.combat.turn] : null;
// The rolls an activity offers once used, as the buttons of a dnd5e activity chat card
// (FVT-180: Attack, Damage, Healing). The cost is paid once, on use; these never pay it.
export function activityRolls(a) {
  const out = [];
  if (a?.type === "attack")
    out.push({
      kind: "attack",
      dice: `1d20${Number(a.attack?.bonus) >= 0 ? "+" : ""}${Number(a.attack?.bonus) || 0}`,
      type: null,
    });
  if (["attack", "damage", "save"].includes(a?.type) && text(a.damage?.dice).trim())
    out.push({ kind: "damage", dice: a.damage.dice.trim(), type: a.damage.type ?? null });
  if (a?.type === "heal" && text(a.heal?.dice).trim())
    out.push({ kind: "heal", dice: a.heal.dice.trim(), type: null });
  return out;
}
function usableActivity(state, slice, actorId, contentId, activityId) {
  const found = actorActivities(state, slice, actorId).find(
    (x) => x.contentId === contentId && x.activity.id === activityId,
  );
  if (!found) fail("Attività non trovata sulla scheda.", "Activity not found on the sheet.");
  if (!found.active)
    fail(
      "L’homebrew di questa attività è disattivato per la campagna.",
      "This activity’s homebrew is disabled for the campaign.",
    );
  return found;
}
// In combat the activation is paid on the creature's own turn (a reaction at any time).
function payActivation(state, actor, a) {
  const activation = ACTIVATIONS.find((x) => x.id === a.activation?.type);
  if (!state.combat?.active || !activation?.resource) return null;
  if (activation.resource !== "reaction" && currentTurnActor(state) !== actor.id)
    fail("Non è il turno di questa creatura.", "It is not this creature’s turn.");
  if (actor[activation.resource] === false)
    fail(
      `${pick(activation.name, "it")} già usata in questo turno.`,
      `${pick(activation.name, "en")} already used this turn.`,
    );
  actor[activation.resource] = false;
  return activation.resource;
}
const useRecord = (state, found, { id, actorId, by, cost }) => ({
  id,
  contentId: found.contentId,
  revisionId: found.revisionId,
  activityId: found.activity.id,
  type: found.activity.type,
  name: copy(found.activity.name),
  actorId,
  by,
  rolls: activityRolls(found.activity),
  cost,
  turnKey: state.combat?.active ? `${state.combat.round}:${currentTurnActor(state)}` : null,
  targets: [],
  createdAt: now(),
});
const keepUses = (slice) => {
  if (slice.uses.length > 60) slice.uses.splice(0, slice.uses.length - 60);
};
// Uses an attack, damage, heal, summon, transform or utility activity: the cost is paid
// and the use is recorded; its rolls are then made from the use (never paying again).
export function recordActivityUse(state, slice, { id, actorId, contentId, activityId }, role) {
  const actor = controlled(state, actorId, role);
  const found = usableActivity(state, slice, actorId, contentId, activityId);
  if (found.activity.type === "save")
    fail(
      "Il tiro salvezza si usa scegliendo i bersagli.",
      "The saving throw is used by choosing its targets.",
    );
  const cost = payActivation(state, actor, found.activity);
  const use = useRecord(state, found, { id, actorId, by: role, cost });
  slice.uses.push(use);
  keepUses(slice);
  startTimedOnUse(state, slice, actorId, contentId);
  return use;
}
// The latest use of an activity by this creature: its card with the remaining rolls.
export function lastUseOf(slice, actorId, contentId, activityId) {
  return list(slice.uses).findLast(
    (u) => u.actorId === actorId && u.contentId === contentId && u.activityId === activityId,
  );
}
// Roll request for one roll of a recorded use; only the creature's controller rolls it.
export function useRoll(state, slice, useId, index, role) {
  const use = list(slice.uses).find((u) => u.id === useId);
  const roll = list(use?.rolls)[Number(index)];
  if (!use || !roll) fail("Tiro dell’attività non trovato.", "Activity roll not found.");
  const actor = state.actors?.[use.actorId];
  if (!actor || !canControlActor(actor, role, state))
    fail("Non controlli questa creatura.", "You do not control this creature.");
  return { use, roll, actor };
}
// Starts a save activity: the cost is paid now (in combat, on your turn), each target's
// controller rolls the save afterwards through the shared roll service.
export function startActivity(
  state,
  slice,
  { id, actorId, contentId, activityId, targetIds },
  role,
) {
  const actor = controlled(state, actorId, role);
  const found = usableActivity(state, slice, actorId, contentId, activityId);
  const a = found.activity;
  if (a.type !== "save")
    fail(
      "Questa attività si registra come promemoria: il tiro salvezza è l’unica automatizzata.",
      "This activity is recorded as a reminder: only saving throws are automated.",
    );
  const ids = [...new Set(list(targetIds))];
  if (!ids.length || ids.length > Math.max(1, a.activation.targets))
    fail(
      `Scegli da 1 a ${Math.max(1, a.activation.targets)} bersagli.`,
      `Choose 1 to ${Math.max(1, a.activation.targets)} targets.`,
    );
  const options = targetOptions(state, actorId, a, role);
  for (const t of ids) {
    const o = options.find((x) => x.actorId === t);
    if (!o) fail("Bersaglio non visibile sulla scena.", "Target not visible on the scene.");
    if (!o.inRange)
      fail(
        `${o.name} è fuori portata (${Math.round(o.distance * 10) / 10} m).`,
        `${o.name} is out of range (${Math.round(o.distance * 10) / 10} m).`,
      );
  }
  const cost = payActivation(state, actor, a);
  const dc = saveDcFor(a, sheetOf(actor));
  const use = {
    ...useRecord(state, found, { id, actorId, by: role, cost }),
    ability: a.save.ability,
    dc: dc.value,
    dcFormula: dc.formula,
    effect: a.effect?.conditionId
      ? { conditionId: a.effect.conditionId, duration: a.effect.duration }
      : null,
    damage: a.damage?.dice ? copy(a.damage) : null,
    targets: ids.map((targetId) => ({ actorId: targetId, status: "pending" })),
  };
  slice.uses.push(use);
  keepUses(slice);
  startTimedOnUse(state, slice, actorId, contentId);
  return use;
}
export function pendingSavesFor(state, slice, role, actorId = null) {
  return list(slice.uses).flatMap((use) =>
    list(use.targets)
      .filter(
        (t) =>
          t.status === "pending" &&
          (!actorId || t.actorId === actorId || use.actorId === actorId) &&
          state.actors[t.actorId],
      )
      .map((t) => ({
        use,
        target: t,
        canRoll: canControlActor(state.actors[t.actorId], role, state),
      })),
  );
}
// Save profile of a target: bonus, conditions that force a failure or disadvantage.
export function saveProfile(state, slice, useId, targetId) {
  const use = list(slice.uses).find((u) => u.id === useId);
  const target = state.actors?.[targetId];
  if (!use || !target)
    fail("Richiesta di tiro salvezza non trovata.", "Saving throw request not found.");
  // The effective actor, as the combat engine reads it (a Wild Shape uses the form's
  // physical scores and the better of the saving throw bonuses).
  const effective = getEffectiveActor(target);
  const listed = effective.savingThrows?.[use.ability];
  const bonus = Number.isFinite(listed) ? listed : modOf(effective.abilities?.[use.ability] ?? 10);
  const rules = conditionSaveRules(target, use.ability);
  return {
    use,
    bonus: bonus + rules.modifier,
    mode: rules.disadvantage.length ? "disadvantage" : "normal",
    autoFail: rules.autoFail,
    reasons: [
      ...rules.autoFailReasons.map((r) => r.name),
      ...rules.disadvantage.map((r) => r.name),
      ...rules.modifierSources.map((m) => m.label),
    ],
  };
}
function termFor(state, use, targetId) {
  const self = use.actorId;
  switch (use.effect?.duration) {
    case "start-next-self":
      return { kind: "turn", actorId: self, phase: "start", when: "next" };
    case "end-next-self":
      return { kind: "turn", actorId: self, phase: "end", when: "next" };
    case "end-current-self":
      return currentTurnActor(state) === self
        ? { kind: "turn", actorId: self, phase: "end", when: "current" }
        : { kind: "turn", actorId: self, phase: "end", when: "next" };
    case "start-next-target":
      return { kind: "turn", actorId: targetId, phase: "start", when: "next" };
    case "end-next-target":
      return { kind: "turn", actorId: targetId, phase: "end", when: "next" };
    case "short-rest":
      return { kind: "rest", actorId: targetId, restKind: "any" };
    case "long-rest":
      return { kind: "rest", actorId: targetId, restKind: "long" };
    default:
      return { kind: "manual" };
  }
}
// Records a target's save and applies the outcome. The accepted roll is also kept in the
// Undo-preserved roll slice, so after an Undo the same roll is reused, never rerolled.
export function resolveSave(state, slice, rolls, { useId, targetId, roll }, role) {
  const use = list(slice.uses).find((u) => u.id === useId);
  const target = use?.targets.find((t) => t.actorId === targetId);
  if (!use || !target)
    fail("Richiesta di tiro salvezza non trovata.", "Saving throw request not found.");
  if (target.status !== "pending")
    fail("Questo tiro salvezza è già risolto.", "This saving throw is already resolved.");
  if (!canControlActor(state.actors[targetId], role, state))
    fail("Tira chi controlla il bersaglio.", "The target’s controller rolls.");
  const key = `${useId}:${targetId}`;
  const evidence = rolls.saves[key] ?? null;
  const accepted = evidence ?? roll;
  if (!accepted || !(accepted.autoFail || Number.isInteger(accepted.total)))
    fail("Registra il tiro salvezza.", "Record the saving throw.");
  rolls.saves[key] ??= { ...copy(accepted), at: now(), by: role };
  const success = !accepted.autoFail && accepted.total >= use.dc;
  Object.assign(target, {
    status: success ? "saved" : "failed",
    total: accepted.total ?? null,
    natural: accepted.natural ?? null,
    mode: accepted.mode ?? null,
    rollId: accepted.rollId ?? null,
    autoFail: !!accepted.autoFail,
    reused: !!evidence,
    resolvedAt: now(),
  });
  let condition = null;
  if (!success && use.effect?.conditionId) {
    const result = applyConditionEvent(state, {
      eventId: `hb-${use.id}-${targetId}`.slice(0, 190),
      kind: "apply",
      actorId: targetId,
      conditionId: use.effect.conditionId,
      term: termFor(state, use, targetId),
      origin: { actorId: use.actorId, label: pick(use.name, "it").slice(0, 120) || "Homebrew" },
      source: homebrewSource(
        { contentId: use.contentId, revisionId: use.revisionId },
        pick(use.name, "en"),
      ),
      owner: use.by,
      visibility: "shared",
      reason: "homebrew activity",
    });
    applyConditionFollowUps(state, result);
    condition = {
      applied: result.applied,
      instanceIds: result.instanceIds,
      reconciliation: result.reconciliation,
    };
    target.condition = condition;
  }
  return { use, target, success, condition };
}

// ---------------------------------------------------------------- stat blocks and rollables (DDB-110)

// `[rollable]DISPLAY|DICE|KIND|DAMAGE TYPE[/rollable]`: KIND is attack, damage, check or
// save; DICE uses NdS±M (a d20 roll for attack/check/save).
const ROLLABLE = /\[rollable\]([\s\S]*?)\[\/rollable\]/g;
export function parseRollables(value) {
  const input = typeof value === "string" ? value : "";
  const out = [];
  let last = 0;
  for (const m of input.matchAll(ROLLABLE)) {
    if (m.index > last) out.push({ text: input.slice(last, m.index) });
    const [display = "", dice = "", kind = "damage", type = ""] = m[1]
      .split("|")
      .map((x) => x.trim());
    const parsed = parseDice(dice);
    const valid =
      !!parsed &&
      ["attack", "damage", "check", "save", "heal"].includes(kind) &&
      (kind === "damage" || kind === "heal" || parsed.sides === 20) &&
      (!type || DAMAGE_TYPES.includes(type));
    out.push({
      rollable: { raw: m[0], display: display || dice, dice, kind, type: type || null, valid },
    });
    last = m.index + m[0].length;
  }
  if (last < input.length) out.push({ text: input.slice(last) });
  return out;
}
const TYPE_WORDS = {
  slashing: ["taglient", "slashing"],
  piercing: ["perforant", "piercing"],
  bludgeoning: ["contundent", "bludgeoning"],
  fire: ["fuoco", "fire"],
  cold: ["freddo", "cold"],
  necrotic: ["necrotic", "necrotic"],
  radiant: ["radios", "radiant"],
  psychic: ["psichic", "psychic"],
  poison: ["veleno", "poison"],
  acid: ["acido", "acid"],
  lightning: ["fulmin", "lightning"],
  thunder: ["tuono", "thunder"],
  force: ["forza", "force"],
};
const typeAfter = (tail) => {
  const lower = tail.toLowerCase().slice(0, 40);
  return (
    Object.entries(TYPE_WORDS).find(
      ([id, words]) => DAMAGE_TYPES.includes(id) && words.some((w) => lower.includes(w)),
    )?.[0] ?? ""
  );
};
// D&D Beyond's editor button: turns dice written in the text into rollable blocks
// (to-hit bonuses into d20 attacks, dice expressions into damage). Existing blocks stay.
export function autoRollables(value) {
  const input = typeof value === "string" ? value : "";
  const parts = input.split(ROLLABLE);
  // split with a capture group interleaves plain text (even) and block bodies (odd).
  return parts
    .map((part, i) => {
      if (i % 2) return `[rollable]${part}[/rollable]`;
      const hit = (sign, n) =>
        `[rollable]${sign === "+" ? "+" : "−"}${n}|1d20${sign === "+" ? "+" : "-"}${n}|attack[/rollable]`;
      // "+5 to hit" / "+5 al tiro per colpire", and the stat block wording
      // "Attacco in mischia +4" / "Melee Attack Roll: +4".
      let out = part.replace(
        /([+−-])\s?(\d{1,2})(\s+(?:al tiro per colpire|per colpire|to hit|al colpire))/gi,
        (_, sign, n, rest) => hit(sign, n) + rest,
      );
      out = out.replace(
        /((?:attacco|attack)(?:\s+roll)?(?:\s+(?:in mischia|a distanza|melee|ranged|o a distanza|or ranged)){0,2}\s*:?\s*)([+−-])\s?(\d{1,2})(?![\d|]|\s?[dD]\d)/gi,
        (_, lead, sign, n) => lead + hit(sign, n),
      );
      out = out.replace(
        /(?<![\w[|])(\d{1,2})\s?[dD]\s?(\d{1,3})(?:\s?([+−-])\s?(\d{1,3}))?(?![\w|\]])/g,
        (match, count, sides, sign, mod, offset, whole) => {
          const dice = `${count}d${sides}${sign ? (sign === "+" ? "+" : "-") + mod : ""}`;
          if (!parseDice(dice)) return match;
          const tail = whole.slice(offset + match.length);
          const type = typeAfter(tail);
          return `[rollable]${match.trim()}|${dice}|damage${type ? "|" + type : ""}[/rollable]`;
        },
      );
      return out;
    })
    .join("");
}
export function creatureBlocks(c) {
  return [
    ...list(c?.sections?.traits),
    ...list(c?.sections?.actions),
    ...list(c?.sections?.bonusActions),
    ...list(c?.sections?.reactions),
    ...(c?.sections?.legendary?.enabled ? list(c.sections.legendary.actions) : []),
    ...(c?.sections?.lair?.enabled ? list(c.sections.lair.actions) : []),
  ];
}
const blockFromAction = (a) => {
  const summary = a.summary ?? L("", "");
  return {
    id: newId("block"),
    name: copy(a.name),
    text: L(autoRollables(summary.it), autoRollables(summary.en)),
  };
};
export function creatureFromSrd(c) {
  return {
    preset: c.id,
    size: list(c.size)[0] ?? "medium",
    type: c.type,
    alignment: srd.LABELS.alignment?.[c.alignment]
      ? copy(srd.LABELS.alignment[c.alignment])
      : L("", ""),
    ac: c.ac,
    acNote: L("", ""),
    hp: { average: c.hp.average, dice: c.hp.formula },
    speedMeters: srd.feetToMeters(c.speed?.walk ?? 0),
    abilities: { ...c.abilities },
    saves: { ...(c.saves ?? {}) },
    skills: L("", ""),
    senses: L(
      c.senses?.passivePerception ? `Percezione passiva ${c.senses.passivePerception}` : "",
      c.senses?.passivePerception ? `Passive Perception ${c.senses.passivePerception}` : "",
    ),
    languages: L("", ""),
    cr: c.cr,
    sections: {
      traits: list(c.traits).map(blockFromAction),
      actions: list(c.actions).map(blockFromAction),
      bonusActions: list(c.bonusActions).map(blockFromAction),
      reactions: list(c.reactions).map(blockFromAction),
      legendary: { enabled: false, uses: 3, intro: L("", ""), actions: [] },
      lair: { enabled: false, intro: L("", ""), actions: [] },
    },
  };
}
// A melee attack the core combat engine can run: the first block whose text says melee
// and holds one to-hit block and one damage block. Never inferred from other prose.
export function meleeProfileFrom(c, ref) {
  for (const b of list(c?.sections?.actions)) {
    for (const lang of ["it", "en"]) {
      const body = b?.text?.[lang] ?? "";
      if (!/mischia|melee/i.test(body)) continue;
      const segs = parseRollables(body).filter((x) => x.rollable?.valid);
      const hit = segs.find((x) => x.rollable.kind === "attack");
      const dmg = segs.find((x) => x.rollable.kind === "damage");
      if (!hit || !dmg) continue;
      const hitDice = parseDice(hit.rollable.dice);
      const d = parseDice(dmg.rollable.dice);
      if (!hitDice || !d || d.count > 20 || ![4, 6, 8, 10, 12, 20].includes(d.sides)) continue;
      const reach = /(\d+(?:[.,]\d+)?)\s?m\b/i.exec(body);
      return {
        name: L(b.name.it || b.name.en, b.name.en || b.name.it),
        reachMeters: reach ? Number(reach[1].replace(",", ".")) || 1.5 : 1.5,
        attackBonus: hitDice.modifier,
        damageDice: [{ count: d.count, sides: d.sides }],
        damageModifier: d.modifier,
        damageType: dmg.rollable.type || "bludgeoning",
        source: {
          kind: "authored-demo",
          edition: "2024",
          revision: `homebrew:${ref.contentId}@${ref.revisionId}`,
          title: `Homebrew · ${b.name.en || b.name.it}`,
        },
      };
    }
  }
  return null;
}
// Compendium roll request (the shared roll service) for a rollable block.
export function rollRequestFor(entryId, name, rollable, lang = "it") {
  const d = parseDice(rollable.dice);
  if (!d) fail("Dadi non validi.", "Invalid dice.");
  const who = (l) => `${pick(name, l)}`;
  if (["attack", "check", "save"].includes(rollable.kind))
    return {
      entry: { id: entryId },
      kind: "d20",
      rollKind: rollable.kind,
      bonus: d.modifier,
      label: L(
        `${who("it")} · ${rollable.kind === "attack" ? "tiro per colpire" : rollable.kind === "save" ? "tiro salvezza" : "prova"}`,
        `${who("en")} · ${rollable.kind === "attack" ? "attack roll" : rollable.kind === "save" ? "saving throw" : "check"}`,
      ),
    };
  return {
    entry: { id: entryId },
    kind: "damage",
    rollKind: rollable.kind === "heal" ? "healing" : "damage",
    healing: rollable.kind === "heal",
    terms: [{ dice: rollable.dice, type: rollable.type }],
    canCritical: false,
    label: L(
      `${who("it")} · ${rollable.kind === "heal" ? "cura" : "danni"}`,
      `${who("en")} · ${rollable.kind === "heal" ? "healing" : "damage"}`,
    ),
  };
}
// Places a homebrew monster on the active scene with Preparation's own commands.
export function placeCreature(state, { ref, actorId, tokenId, name }, role) {
  if (role !== "dm")
    fail("Solo il DM mette creature sulla scena.", "Only the DM places creatures on the scene.");
  const revision = readableRevision(state, ref, role);
  const c = revision.data.structured?.creature;
  if (revision.type !== "creature" || !c) fail("Scegli un mostro.", "Choose a monster.");
  const scene = sceneOf(state);
  if (!scene) fail("Nessuna scena attiva.", "No active scene.");
  const label =
    (name ?? "").trim() || pick(revision.data.name, "it") || pick(revision.data.name, "en");
  const actor = createSceneNPC(
    state,
    {
      id: actorId,
      name: label.slice(0, 100),
      hp: c.hp.average,
      ac: c.ac,
      speed: c.speedMeters,
      team: "watch",
    },
    role,
  );
  Object.assign(actor, {
    abilities: { ...c.abilities },
    savingThrows: Object.fromEntries(
      ABILITIES.map((k) => [
        k,
        Number.isInteger(c.saves?.[k]) ? c.saves[k] : modOf(c.abilities[k]),
      ]),
    ),
    className: L(
      pick(revision.data.name, "it") || pick(revision.data.name, "en"),
      pick(revision.data.name, "en") || pick(revision.data.name, "it"),
    ),
    size: c.size,
    conditionImmunities: [],
    conditionImmunitiesSource: {
      kind: "authored-demo",
      edition: "2024",
      revision: `homebrew:${ref.contentId}@${ref.revisionId}`,
    },
    vitalityPolicy: { zeroHp: "death", source: copy(SRD.monsterDeath) },
    provenance: {
      kind: "authored-demo",
      edition: "2024",
      revision: `homebrew:${ref.contentId}@${ref.revisionId}`,
    },
    homebrewCreature: copy(ref),
  });
  const melee = meleeProfileFrom(c, ref);
  if (melee) actor.combatProfile = { ...actor.combatProfile, meleeAttack: melee };
  let x = 520,
    y = 520;
  for (let i = 0; i < 40 && scene.tokens.some((t) => Math.hypot(t.x - x, t.y - y) < 45); i++) {
    x += 60;
    if (x > scene.width - 60) {
      x = 120;
      y -= 60;
    }
  }
  placeSceneToken(state, scene.id, actorId, { x, y }, tokenId, role);
  return actor;
}

// ---------------------------------------------------------------- CSV / JSON import (CMP-112)

export const CSV_COLUMNS = Object.freeze([
  "name",
  "size",
  "type",
  "ac",
  "hp",
  "hit_dice",
  "speed_m",
  "str",
  "dex",
  "con",
  "int",
  "wis",
  "cha",
  "cr",
  "senses",
  "languages",
  "traits",
  "actions",
]);
export const EXAMPLE_CSV = [
  CSV_COLUMNS.join(","),
  'Lanterniere spettrale,medium,undead,13,22,5d8,9,8,14,12,10,12,14,1,Scurovisione 18 m,Comune,"Luce fredda: la lanterna illumina 3 m.","Colpo di lanterna: Attacco in mischia +4, portata 1,5 m. Colpito: 5 (1d6 + 2) danni da fuoco."',
  'Falena di brace,tiny,beast,12,4,1d4+2,3,3,15,10,2,10,5,1/8,Vista cieca 3 m,-,,"Morso: Attacco in mischia +4, portata 1,5 m. Colpito: 3 (1d4 + 1) danni da fuoco."',
  'Guardiano del faro,large,construct,16,60,8d10+16,9,18,8,15,6,10,3,4,Scurovisione 18 m,-,"Corpo di ferro: non dorme e non respira.","Pugno di ferro: Attacco in mischia +6, portata 1,5 m. Colpito: 13 (2d8 + 4) danni contundenti."',
].join("\n");
// RFC 4180 subset: commas, double quotes, escaped quotes and newlines inside quotes.
export function parseCsv(textValue) {
  const rows = [];
  let row = [],
    field = "",
    quoted = false;
  const input = String(textValue ?? "").replace(/\r\n?/g, "\n");
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}
// Rows as objects keyed by column, from CSV text or a JSON array (Clash!/Kobold+ JSON).
export function monsterRowsFrom(textValue) {
  const trimmed = String(textValue ?? "").trim();
  if (!trimmed) fail("Incolla il CSV o il JSON dei mostri.", "Paste the monsters’ CSV or JSON.");
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      fail("Il JSON non è valido.", "The JSON is not valid.");
    }
    const rows = Array.isArray(parsed) ? parsed : parsed?.monsters;
    if (!Array.isArray(rows))
      fail("Il JSON deve essere un elenco di mostri.", "The JSON must be a list of monsters.");
    return rows.map((r) =>
      Object.fromEntries(CSV_COLUMNS.map((k) => [k, r?.[k] == null ? "" : String(r[k])])),
    );
  }
  const [header, ...rows] = parseCsv(trimmed);
  const cols = header.map((h) => h.trim().toLowerCase());
  const missing = ["name", "ac", "hp"].filter((k) => !cols.includes(k));
  if (missing.length)
    fail(`Colonne mancanti: ${missing.join(", ")}.`, `Missing columns: ${missing.join(", ")}.`);
  return rows.map((r) => Object.fromEntries(cols.map((k, i) => [k, (r[i] ?? "").trim()])));
}
const splitBlocks = (value) =>
  String(value ?? "")
    .split(/\s*\|\s*/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const at = part.indexOf(":");
      const name = at > 0 ? part.slice(0, at).trim() : part;
      const body = at > 0 ? part.slice(at + 1).trim() : "";
      return {
        id: newId("block"),
        name: L(name, name),
        text: L(autoRollables(body), autoRollables(body)),
      };
    });
export function checkMonsterRows(rows) {
  return rows.map((row, index) => {
    const errors = [];
    const bad = (column, it, en) => errors.push({ column, it, en });
    const num = (k) =>
      row[k] === "" || row[k] == null ? NaN : Number(String(row[k]).replace(",", "."));
    const name = String(row.name ?? "").trim();
    if (!name) bad("name", "Nome mancante.", "Missing name.");
    const size = String(row.size || "medium")
      .trim()
      .toLowerCase();
    if (!SIZES.includes(size))
      bad("size", `Taglia sconosciuta «${row.size}».`, `Unknown size “${row.size}”.`);
    const type = String(row.type || "beast")
      .trim()
      .toLowerCase();
    if (!CREATURE_TYPES.includes(type))
      bad("type", `Tipo sconosciuto «${row.type}».`, `Unknown type “${row.type}”.`);
    const ac = num("ac"),
      hp = num("hp"),
      speed = row.speed_m === "" || row.speed_m == null ? 9 : num("speed_m");
    if (!int(ac, 1, 30))
      bad(
        "ac",
        `CA non valida «${row.ac}»: un intero da 1 a 30.`,
        `Invalid AC “${row.ac}”: an integer from 1 to 30.`,
      );
    if (!int(hp, 1, 5000)) bad("hp", `PF non validi «${row.hp}».`, `Invalid HP “${row.hp}”.`);
    if (row.hit_dice && !parseHitDice(row.hit_dice))
      bad(
        "hit_dice",
        `Dadi Vita non validi «${row.hit_dice}» (es. 5d8+5).`,
        `Invalid hit dice “${row.hit_dice}” (e.g. 5d8+5).`,
      );
    if (!Number.isFinite(speed) || speed < 0 || speed > 100)
      bad(
        "speed_m",
        `Velocità in metri non valida «${row.speed_m}».`,
        `Invalid speed in metres “${row.speed_m}”.`,
      );
    const abilities = {};
    for (const k of ABILITIES) {
      const v = row[k] === "" || row[k] == null ? 10 : num(k);
      if (!int(v, 1, 30))
        bad(
          k,
          `${ABILITY_SHORT[k].it} non valida «${row[k]}».`,
          `Invalid ${ABILITY_SHORT[k].en} “${row[k]}”.`,
        );
      abilities[k] = v;
    }
    const cr = String(row.cr || "0").trim();
    if (!CR_LIST.includes(cr))
      bad("cr", `Grado di sfida sconosciuto «${row.cr}».`, `Unknown challenge rating “${row.cr}”.`);
    if (errors.length) return { index, line: index + 2, name, errors, data: null };
    const data = emptyDefinition("creature");
    data.name = L(name, name);
    data.source = { ...data.source, label: "CSV", reference: `import · row ${index + 2}` };
    const c = data.structured.creature;
    Object.assign(c, {
      size,
      type,
      ac,
      hp: { average: hp, dice: row.hit_dice ? String(row.hit_dice).replace(/\s+/g, "") : "" },
      speedMeters: speed,
      abilities,
      cr,
      senses: L(
        row.senses === "-" ? "" : String(row.senses ?? ""),
        row.senses === "-" ? "" : String(row.senses ?? ""),
      ),
      languages: L(
        row.languages === "-" ? "" : String(row.languages ?? ""),
        row.languages === "-" ? "" : String(row.languages ?? ""),
      ),
    });
    c.sections.traits = splitBlocks(row.traits);
    c.sections.actions = splitBlocks(row.actions);
    data.structured.automation = automationOf("creature", data.structured);
    return { index, line: index + 2, name, errors: [], data };
  });
}
// Imports the valid rows as private Library monsters (one revision each).
export function importMonsters(state, checked, role, idFor = () => newId("import")) {
  const refs = [];
  for (const row of checked.filter((r) => !r.errors.length && r.data)) {
    const id = idFor(row);
    hb.createHomebrewDraft(state, { id, kind: "create", type: "creature" }, role);
    hb.saveHomebrewDraft(state, id, { data: row.data }, role);
    const preview = hb.previewHomebrewDraft(state, id, role);
    if (!preview.canApply)
      fail(preview.errors[0]?.it ?? "Riga non valida.", preview.errors[0]?.en ?? "Invalid row.");
    refs.push(hb.applyHomebrewDraft(state, id, { reviewKey: preview.reviewKey }, role).ref);
  }
  if (!refs.length) fail("Nessuna riga valida da importare.", "No valid row to import.");
  return refs;
}

// ---------------------------------------------------------------- saving content

// Saves the draft as a new immutable Library revision with its declared automation.
export function saveContent(state, draftId, role) {
  const draft = hb.getHomebrewDraft(state, draftId, role);
  const s = draft.data.structured;
  if (object(s)) {
    const errors = validateStructured(draft.type, s);
    if (errors.length) fail(errors[0].it, errors[0].en);
    const data = copy(draft.data);
    data.structured.automation = automationOf(draft.type, s);
    hb.saveHomebrewDraft(state, draftId, { data }, role);
  }
  const preview = hb.previewHomebrewDraft(state, draftId, role);
  if (!preview.canApply)
    fail(preview.errors[0]?.it ?? "Bozza non valida.", preview.errors[0]?.en ?? "Invalid draft.");
  return hb.applyHomebrewDraft(state, draftId, { reviewKey: preview.reviewKey }, role);
}

// ---------------------------------------------------------------- publishing (DDB-175/176/177/178)

export function publicationOf(slice, contentId) {
  return slice.publications?.[contentId] ?? null;
}
// Only authored text is checked (names, descriptions, entries), never recorded sources.
function allText(data) {
  const s = data.structured ?? {};
  const parts = [data.name, data.description, data.source?.label];
  for (const g of list(s.prerequisites)) for (const r of list(g.rules)) parts.push(r.text);
  for (const o of list(s.options)) parts.push(o.name, ...list(o.from).map((c) => c.name));
  for (const a of list(s.activities)) parts.push(a.name, a.description);
  for (const a of list(s.advancement))
    parts.push(
      ...list(a.features).flatMap((f) => [f.name, f.description]),
      a.scale?.name,
      a.choice?.name,
      ...list(a.choice?.from).map((f) => f.name),
    );
  if (s.creature)
    parts.push(
      s.creature.senses,
      s.creature.languages,
      s.creature.sections?.legendary?.intro,
      s.creature.sections?.lair?.intro,
      ...creatureBlocks(s.creature).flatMap((b) => [b.name, b.text]),
    );
  return JSON.stringify(parts).toLowerCase();
}
export function publicationChecks(state, ref, aiMethod, role) {
  const revision = readableRevision(state, ref, role);
  const data = revision.data;
  const haystack = allText(data);
  const s = data.structured;
  const checks = [
    {
      id: "owner",
      ok: revision.owner === role,
      it: "Pubblica solo chi ha creato il contenuto.",
      en: "Only the author publishes the content.",
    },
    {
      id: "original",
      ok: data.source?.kind !== "reconstruction",
      it: "Si pubblica solo contenuto originale, non ricostruzioni.",
      en: "Only original content is published, not reconstructions.",
    },
    {
      id: "rights",
      ok: data.source?.rights?.share === true,
      it: "La fonte deve consentire la condivisione.",
      en: "The source must allow sharing.",
    },
    {
      id: "links",
      ok: !/(https?:\/\/|www\.)/i.test(haystack),
      it: "Nessun collegamento ipertestuale nel testo.",
      en: "No hyperlinks in the text.",
    },
    {
      id: "protected",
      ok: !PROTECTED_NAMES.some((n) => haystack.includes(n)),
      it: "Nessun nome protetto (es. Beholder, Mind Flayer).",
      en: "No protected names (e.g. Beholder, Mind Flayer).",
    },
    {
      id: "ai",
      ok: ["human", "assisted"].includes(aiMethod),
      it: "Indica il metodo di creazione: i contenuti generati in prevalenza da IA non sono accettati.",
      en: "State the creation method: mostly AI-generated content is not accepted.",
    },
  ];
  if (revision.type === "subclass") {
    const levels = SUBCLASS_LEVELS[s?.subclass?.classId] ?? [];
    const used = list(s?.advancement).map((a) => a.level);
    checks.push({
      id: "subclass-levels",
      ok: used.length > 0 && used.every((l) => levels.includes(l)),
      it: `I privilegi della sottoclasse stanno ai livelli di sottoclasse della classe (${levels.join(", ")}).`,
      en: `Subclass features sit at the class’s subclass levels (${levels.join(", ")}).`,
    });
  }
  return checks;
}
// Submits a revision: automated checks now, then the (simulated) moderation queue.
export function submitPublication(state, slice, { ref, aiMethod }, role) {
  const checks = publicationChecks(state, ref, aiMethod, role);
  const failed = checks.filter((c) => !c.ok);
  if (failed.length) fail(failed[0].it, failed[0].en);
  const pub = (slice.publications[ref.contentId] ??= {
    owner: role,
    versions: [],
    ratings: {},
    reports: [],
  });
  if (pub.versions.some((v) => v.revisionId === ref.revisionId))
    fail("Questa revisione è già stata inviata.", "This revision was already submitted.");
  if (pub.versions.some((v) => v.status === "queued"))
    fail("Una versione è già in moderazione.", "A version is already in moderation.");
  const version = {
    number:
      pub.versions.filter((v) => v.status === "published" || v.status === "withdrawn").length + 1,
    revisionId: ref.revisionId,
    status: "queued",
    aiMethod,
    submittedAt: now(),
    checks: checks.map((c) => c.id),
  };
  pub.versions.push(version);
  return version;
}
// Moderation is a simulation in this prototype: the outcome is chosen explicitly.
export function moderate(state, slice, { contentId, decision, reason = "" }, role) {
  const pub = slice.publications?.[contentId];
  const version = pub?.versions.find((v) => v.status === "queued");
  if (!version) fail("Nessuna versione in moderazione.", "No version in moderation.");
  if (decision === "approve") {
    const others = pub.versions.filter((v) => v.status === "published");
    version.status = "published";
    version.number =
      others.length + pub.versions.filter((v) => v.status === "withdrawn").length + 1;
    version.decidedAt = now();
    const content = (state.library ?? []).find((c) => c.id === contentId);
    const access = (content.accessByRevision[version.revisionId] ??= { readers: [], editors: [] });
    version.previousReaders = [...access.readers];
    access.readers = [
      ...new Set([...access.readers, "player", "dm"].filter((r) => r !== content.owner)),
    ];
  } else if (decision === "reject") {
    if (!String(reason).trim())
      fail("Scrivi il motivo del rifiuto.", "Write the reason for the rejection.");
    version.status = "rejected";
    version.reason = String(reason).trim().slice(0, 300);
    version.decidedAt = now();
  } else fail("Decisione non valida.", "Invalid decision.");
  return version;
}
export function publishedVersions(slice, contentId) {
  return list(slice.publications?.[contentId]?.versions).filter((v) => v.status === "published");
}
export function catalogEntries(state, slice, role) {
  return Object.entries(slice.publications ?? {}).flatMap(([contentId, pub]) => {
    const versions = pub.versions.filter((v) => v.status === "published");
    if (!versions.length) return [];
    const latest = versions.at(-1);
    let data = null,
      type = null;
    try {
      const rev = hb.getHomebrewRevision(state, { contentId, revisionId: latest.revisionId }, role);
      data = rev.data;
      type = rev.type;
    } catch {
      return [];
    }
    const ratings = Object.values(pub.ratings ?? {});
    const followed = slice.subscriptions?.[role]?.[contentId] ?? null;
    return [
      {
        contentId,
        owner: pub.owner,
        type,
        name: data.name,
        latest,
        versions,
        automation: data.structured?.automation ?? automationOf(type, data.structured),
        rating: ratings.length
          ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
          : null,
        ratings: ratings.length,
        myRating: pub.ratings?.[role] ?? null,
        followed,
        updateAvailable:
          !!followed &&
          followed.revisionId !== latest.revisionId &&
          followed.dismissed !== latest.revisionId,
        reports: list(pub.reports).filter((r) => r.status === "open").length,
      },
    ];
  });
}
// Following a version (D&D Beyond: users choose whether to move to a new version): the
// follower's collection points to the chosen revision; sheet copies keep their own.
export function followVersion(state, slice, { contentId, revisionId }, role) {
  const version = publishedVersions(slice, contentId).find((v) => v.revisionId === revisionId);
  if (!version) fail("Versione pubblicata non trovata.", "Published version not found.");
  const pub = slice.publications[contentId];
  if (pub.owner === role)
    fail(
      "È un tuo contenuto: lo trovi già nella tua Biblioteca.",
      "It is your own content: it is already in your Library.",
    );
  const previous = slice.subscriptions?.[role]?.[contentId];
  if (previous?.revisionId)
    hb.collectHomebrewRevision(
      state,
      { contentId, revisionId: previous.revisionId },
      { collected: false },
      role,
    );
  hb.collectHomebrewRevision(state, { contentId, revisionId }, { collected: true }, role);
  (slice.subscriptions[role] ??= {})[contentId] = { revisionId, number: version.number, at: now() };
  return slice.subscriptions[role][contentId];
}
export function stayOnVersion(state, slice, { contentId }, role) {
  const sub = slice.subscriptions?.[role]?.[contentId];
  const latest = publishedVersions(slice, contentId).at(-1);
  if (!sub || !latest) fail("Non segui questo contenuto.", "You do not follow this content.");
  sub.dismissed = latest.revisionId;
  return sub;
}
export function rateContent(state, slice, { contentId, stars }, role) {
  const pub = slice.publications?.[contentId];
  if (!publishedVersions(slice, contentId).length)
    fail("Contenuto non pubblicato.", "Content not published.");
  if (pub.owner === role)
    fail("Non puoi valutare un tuo contenuto.", "You cannot rate your own content.");
  if (!int(stars, 1, 5)) fail("Valutazione da 1 a 5.", "Rating from 1 to 5.");
  pub.ratings[role] = stars;
  return stars;
}
export function reportContent(state, slice, { contentId, reason }, role) {
  const pub = slice.publications?.[contentId];
  if (!publishedVersions(slice, contentId).length)
    fail("Contenuto non pubblicato.", "Content not published.");
  if (pub.owner === role)
    fail("Non puoi segnalare un tuo contenuto.", "You cannot report your own content.");
  if (!String(reason ?? "").trim())
    fail("Scrivi il motivo della segnalazione.", "Write the reason for the report.");
  const report = {
    id: newId("report"),
    by: role,
    reason: String(reason).trim().slice(0, 300),
    status: "open",
    at: now(),
  };
  pub.reports.push(report);
  return report;
}
// A valid report sends the published versions back to private (D&D Beyond DDB-177);
// copies already on sheets stay as they are.
export function resolveReport(state, slice, { contentId, reportId, upheld }, role) {
  const pub = slice.publications?.[contentId];
  const report = list(pub?.reports).find((r) => r.id === reportId && r.status === "open");
  if (!report) fail("Segnalazione non trovata.", "Report not found.");
  report.status = upheld ? "upheld" : "dismissed";
  report.decidedAt = now();
  if (upheld) {
    const content = (state.library ?? []).find((c) => c.id === contentId);
    for (const v of pub.versions.filter((v) => v.status === "published")) {
      v.status = "withdrawn";
      const access = content?.accessByRevision?.[v.revisionId];
      if (access) access.readers = [...list(v.previousReaders)];
    }
  }
  return report;
}
