// B21 — character sheet projection, file export/import, printable PDF and QR code.
// Pure functions: no DOM, no state mutation. Used by character-library.mjs.
//
// Patterns (IDs from docs/interview/CAPABILITY_CENSUS.md and market-census/*.md):
// - Read-only sheet for non-owners: renders fully, no commands, no game log (D&D Beyond
//   DDB-062); public sheet readable by URL (DDB-061).
// - "Export to PDF": a form-fillable PDF including notes and the concentration and ritual
//   flags of spells (D&D Beyond DDB-065; Fight Club CMP-11, Demiplane CMP-15).
// - Export Data / Import Data of one document as JSON (Foundry VTT FVT-205; Fantasy Grounds
//   /exportchar R20-047). Import never silently replaces an existing sheet (F-028/I-116):
//   it creates a new one after a preview of recognized, missing and ignored data.
// - QR code of the character for quick sharing at the table (Demiplane CMP-14).
//
// Rules baseline: D&D 2024, SRD 5.2.1 (EN/IT). Spell flags come from the SRD sample
// catalog (srd-sample.mjs) with its page source; nothing is inferred from a name.

import { SPELLS } from "./srd-sample.mjs";
import {
  abilities as ABILITIES,
  skills as SKILLS,
  getCharacterCatalog,
} from "./character-rules.mjs";

export const FILE_FORMAT = "d20-studio.character";
export const FILE_VERSION = 1;
export const MAX_IMPORT_BYTES = 512 * 1024;
export const RULES = Object.freeze({ edition: "2024", srd: "5.2.1" });

const ABILITY_IDS = ["str", "dex", "con", "int", "wis", "cha"];
const SHORT = {
  str: ["FOR", "STR"],
  dex: ["DES", "DEX"],
  con: ["COS", "CON"],
  int: ["INT", "INT"],
  wis: ["SAG", "WIS"],
  cha: ["CAR", "CHA"],
};
const copy = (value) => (value === undefined ? undefined : structuredClone(value));
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const pick = (value, lang) =>
  isObject(value) ? String(value[lang] ?? value.it ?? value.en ?? "") : String(value ?? "");
export const modifier = (score) => (Number.isFinite(score) ? Math.floor((score - 10) / 2) : null);
export const signed = (value) => (Number.isFinite(value) ? (value >= 0 ? "+" : "") + value : "—");

// ---------------------------------------------------------------- spell flags

const SPELL_BY_SLUG = new Map(SPELLS.map((spell) => [spell.slug, spell]));
const SPELL_BY_NAME = new Map(
  SPELLS.flatMap((spell) => [
    [spell.name.en.toLocaleLowerCase(), spell],
    [spell.name.it.toLocaleLowerCase(), spell],
  ]),
);
/** The SRD catalog entry of an actor spell, by its catalog/combat id or exact name. */
export function catalogSpell(spell) {
  for (const key of [spell?.catalogId, spell?.combatActionId, spell?.srdSlug])
    if (typeof key === "string" && SPELL_BY_SLUG.has(key.replace(/^srd2024:spell:/, "")))
      return SPELL_BY_SLUG.get(key.replace(/^srd2024:spell:/, ""));
  for (const lang of ["en", "it"]) {
    const name = pick(spell?.name, lang).toLocaleLowerCase();
    if (name && SPELL_BY_NAME.has(name)) return SPELL_BY_NAME.get(name);
  }
  return null;
}
/** Concentration and ritual: the catalog's SRD values, else explicit values on the row. */
export function spellFlags(spell) {
  const entry = catalogSpell(spell);
  if (entry)
    return {
      concentration: entry.concentration,
      ritual: entry.ritual,
      known: true,
      pages: entry.source,
    };
  return {
    concentration: spell?.concentration === true,
    ritual: spell?.ritual === true,
    known: typeof spell?.concentration === "boolean" || typeof spell?.ritual === "boolean",
    pages: null,
  };
}

// ---------------------------------------------------------------- sheet data

// Durable sheet fields: what a copy, a revision, an export and an import carry. Identity
// (id, owner, controllers), campaign membership, tokens, turn state, active effects,
// private plans and the build history stay with the original sheet.
export const SHEET_FIELDS = Object.freeze([
  "name",
  "className",
  "level",
  "speciesId",
  "hp",
  "maxHp",
  "tempHp",
  "ac",
  "speed",
  "abilities",
  "savingThrows",
  "skills",
  "skillModifiers",
  "proficiencyBonus",
  "size",
  "creatureType",
  "hitDice",
  "spellSlots",
  "pactSlots",
  "inventory",
  "spells",
  "features",
  "description",
  "backstory",
  "notes",
  "buildSeed",
  "combatProfile",
  "vitalityPolicy",
]);
export function sheetData(actor) {
  const out = {};
  for (const key of SHEET_FIELDS) if (actor?.[key] !== undefined) out[key] = copy(actor[key]);
  return out;
}

export function speciesOf(actor) {
  const id = actor?.characterBuild?.data?.origin?.speciesId ?? actor?.speciesId ?? null;
  if (!id) return null;
  const row = getCharacterCatalog().species.find((entry) => entry.id === id);
  return row ? { id, name: copy(row.name) } : null;
}
/** Class rows with catalog names, from the build seed or the builder data. */
export function classesOf(actor) {
  const rows =
    actor?.characterBuild?.data?.classes ??
    actor?.buildSeed?.classes ??
    (actor?.className ? [{ classId: null, level: actor.level }] : []);
  const catalog = getCharacterCatalog().classes;
  return rows.map((row) => ({
    classId: row.classId ?? null,
    level: row.level ?? null,
    name: copy(catalog.find((entry) => entry.id === row.classId)?.name ?? null),
  }));
}

/**
 * What a reader of the sheet sees, without commands: the same projection feeds the public
 * link, the print view and the PDF. Private plans, personal notes, drafts and the game log
 * are never part of it (DDB-062, I-174).
 */
export function readSheet(actor, { log = [], campaigns = [] } = {}) {
  const pools = isObject(actor.spellSlots)
    ? Object.entries(actor.spellSlots)
        .filter(([, pool]) => isObject(pool) && Number(pool.max) > 0)
        .map(([level, pool]) => ({
          level: Number(level),
          max: Number(pool.max) || 0,
          used: Math.min(Number(pool.used) || 0, Number(pool.max) || 0),
        }))
        .sort((a, b) => a.level - b.level)
    : actor.slots
      ? [{ level: 1, max: actor.slots.max ?? 0, used: actor.slots.used ?? 0 }]
      : [];
  return {
    id: actor.id,
    name: String(actor.name ?? ""),
    className: copy(actor.className ?? ""),
    classes: classesOf(actor),
    level: actor.level ?? null,
    species: speciesOf(actor),
    hp: actor.hp ?? null,
    maxHp: actor.maxHp ?? null,
    tempHp: actor.tempHp ?? 0,
    ac: actor.ac ?? null,
    speed: actor.speed ?? null,
    proficiencyBonus: actor.proficiencyBonus ?? actor.combatProfile?.proficiencyBonus ?? null,
    abilities: ABILITY_IDS.map((id) => ({
      id,
      short: { it: SHORT[id][0], en: SHORT[id][1] },
      name: copy(ABILITIES.find((row) => row.id === id)?.name ?? { it: id, en: id }),
      score: actor.abilities?.[id] ?? null,
      mod: modifier(actor.abilities?.[id]),
    })),
    savingThrows: isObject(actor.savingThrows)
      ? ABILITY_IDS.filter((id) => Number.isFinite(actor.savingThrows[id])).map((id) => ({
          id,
          short: { it: SHORT[id][0], en: SHORT[id][1] },
          value: actor.savingThrows[id],
        }))
      : [],
    skills: (Array.isArray(actor.skills) ? actor.skills : []).map((id) => ({
      id,
      name: copy(SKILLS.find((row) => row.id === id)?.name ?? id),
      value: Number.isFinite(actor.skillModifiers?.[id]) ? actor.skillModifiers[id] : null,
    })),
    hitDice: isObject(actor.hitDice)
      ? Object.entries(actor.hitDice)
          .filter(([, die]) => isObject(die))
          .map(([die, row]) => ({ die, max: row.max ?? 0, used: row.used ?? 0 }))
      : [],
    slots: pools,
    pactSlots: isObject(actor.pactSlots) ? copy(actor.pactSlots) : null,
    inventory: (actor.inventory ?? []).map((item) => ({
      name: copy(item.name ?? ""),
      quantity: item.quantity ?? 1,
      weight: item.weight ?? null,
      equipped: item.equipped === true,
      kind: item.kind ?? "gear",
    })),
    spells: (actor.spells ?? [])
      .map((spell) => {
        const flags = spellFlags(spell);
        return {
          name: copy(spell.name ?? ""),
          level: Number.isFinite(spell.level) ? spell.level : null,
          prepared: spell.prepared !== false,
          concentration: flags.concentration,
          ritual: flags.ritual,
          flagsKnown: flags.known,
        };
      })
      .sort((a, b) => (a.level ?? 99) - (b.level ?? 99)),
    features: (actor.features ?? []).map((feature) => ({
      name: copy(feature.name ?? ""),
      level: feature.level ?? null,
    })),
    story: {
      description: String(actor.description ?? ""),
      backstory: String(actor.backstory ?? ""),
      notes: String(actor.notes ?? ""),
    },
    log: copy(log),
    campaigns: copy(campaigns),
  };
}

// ---------------------------------------------------------------- JSON export

export function exportFileName(actor) {
  const slug =
    String(actor?.name ?? "character")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "character";
  return `d20-studio-${slug}.json`;
}
/** The file this app writes: durable sheet data plus the adventure log. */
export function exportCharacter(actor, { log = [], now = Date.now(), exportedBy = null } = {}) {
  return {
    format: FILE_FORMAT,
    formatVersion: FILE_VERSION,
    exportedAt: new Date(now).toISOString(),
    exportedBy,
    rules: { ...RULES },
    character: sheetData(actor),
    adventureLog: copy(log),
    excluded: [
      "identity-and-owner",
      "campaign-membership-and-tokens",
      "turn-state-and-active-effects",
      "private-plans-and-personal-notes",
      "build-history",
    ],
  };
}

// ---------------------------------------------------------------- JSON import

const fail = (kind, it, en, extra = {}) => ({ ok: false, kind, it, en, ...extra });
const text = (value, max = 200) => {
  if (typeof value === "string") return value.trim().slice(0, max);
  if (isObject(value) && (typeof value.it === "string" || typeof value.en === "string")) {
    const out = {};
    if (typeof value.it === "string") out.it = value.it.trim().slice(0, max);
    if (typeof value.en === "string") out.en = value.en.trim().slice(0, max);
    return out;
  }
  return null;
};
const filled = (value) =>
  typeof value === "string" ? value.length > 0 : isObject(value) && Boolean(value.it || value.en);
const int = (value, min, max) =>
  Number.isInteger(value) && value >= min && value <= max ? value : null;
const num = (value, min, max) =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    ? value
    : null;
const idText = (value) =>
  typeof value === "string" && /^[A-Za-z0-9:._-]{1,80}$/.test(value) ? value : null;

// ---------------------------------------------------------------- Foundry dnd5e (PG-92)

// ddb-importer / Foundry «Import Data» in reverse: a Foundry VTT dnd5e actor JSON
// («Export Data» of a character) is mapped to this app's character file, then read by the
// same checks as our own files. The mapping, field by field:
//   name                                   → name
//   items[type=class] name + system.levels → className, level, buildSeed.classes (SRD ids)
//   items[type=class] system.hitDice/Used  → hitDice (d6…d12, spent)
//   system.abilities.<ab>.value            → abilities
//   system.abilities.<ab>.proficient       → saving-throw proficiencies (as modifiers)
//   system.attributes.hp.value/max/temp    → hp, maxHp (fixed-method estimate if max absent), tempHp
//   system.attributes.ac.flat|value        → ac (10 + DEX if absent)
//   system.attributes.movement.walk (ft/m) → speed in metres (feet × 0.3)
//   system.skills.<key>.value ≥ 1          → skills (acr → acrobatics …)
//   system.spells.spellN.max/value         → spellSlots (used = max − value)
//   system.details.biography.value         → backstory (text, HTML removed)
//   system.details.appearance              → description
//   system.details.trait/ideal/bond/flaw   → personality (one entry per line)
//   items[weapon|equipment|consumable|tool|loot|container] → inventory
//   items[spell] name, system.level, preparation.prepared  → spells
//   items[feat] name, description                         → features
// Everything else (effects, flags, currency, token, race/background items…) is listed as
// not imported. Only a character actor is accepted; no Foundry content is copied beyond
// the owner's own sheet.
const FOUNDRY_SKILLS = {
  acr: "acrobatics",
  ani: "animal-handling",
  arc: "arcana",
  ath: "athletics",
  dec: "deception",
  his: "history",
  ins: "insight",
  itm: "intimidation",
  inv: "investigation",
  med: "medicine",
  nat: "nature",
  prc: "perception",
  prf: "performance",
  per: "persuasion",
  rel: "religion",
  slt: "sleight-of-hand",
  ste: "stealth",
  sur: "survival",
};
const FOUNDRY_ITEM_KIND = {
  weapon: "weapon",
  consumable: "consumable",
  tool: "tool",
  loot: "treasure",
  container: "gear",
  backpack: "gear",
};
const plainText = (value) =>
  String(value ?? "")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
export const isFoundryActor = (data) =>
  isObject(data) && isObject(data.system) && typeof data.type === "string";
/** A Foundry dnd5e character actor as this app's character file, with the mapping report. */
export function fromFoundryActor(data) {
  if (!isFoundryActor(data) || data.type !== "character")
    return {
      ok: false,
      it: "È un documento di Foundry VTT, ma non un personaggio (attore di tipo «character»).",
      en: "This is a Foundry VTT document, but not a character (an actor of type “character”).",
    };
  const sys = data.system,
    items = Array.isArray(data.items) ? data.items : [];
  const mapped = [],
    unmapped = [];
  const classIds = getCharacterCatalog().classes.map((row) => row.id);
  const classItems = items.filter((row) => row?.type === "class");
  const classes = classItems
    .map((row) => ({
      name: String(row.name ?? "").slice(0, 60),
      id: String(row.system?.identifier ?? row.name ?? "")
        .toLowerCase()
        .replace(/[^a-z]/g, ""),
      level: Number(row.system?.levels ?? 1),
      die: String(row.system?.hitDice ?? row.system?.hd?.denomination ?? ""),
      used: Number(row.system?.hitDiceUsed ?? row.system?.hd?.spent ?? 0),
    }))
    .filter((row) => Number.isInteger(row.level) && row.level > 0);
  const level = classes.reduce((sum, row) => sum + row.level, 0);
  if (classes.length) mapped.push("items[class]");
  const abilities = {};
  const saves = {};
  for (const id of ABILITY_IDS) {
    const row = sys.abilities?.[id];
    if (Number.isInteger(row?.value)) abilities[id] = row.value;
    if (Number(row?.proficient) >= 1) saves[id] = true;
  }
  if (Object.keys(abilities).length) mapped.push("system.abilities");
  const con = modifier(abilities.con) ?? 0,
    dex = modifier(abilities.dex) ?? 0;
  const hp = sys.attributes?.hp ?? {};
  let maxHp = Number.isInteger(hp.max) && hp.max > 0 ? hp.max : null;
  let hpEstimated = false;
  if (maxHp === null && classes.length) {
    // Foundry leaves max empty when it computes it: the 2024 fixed method (SRD «Hit Points»).
    const die = (row) => Number(String(row.die).replace(/\D/g, "")) || 8;
    maxHp = classes.reduce(
      (sum, row, index) =>
        sum +
        (index === 0
          ? die(row) + (row.level - 1) * (die(row) / 2 + 1)
          : row.level * (die(row) / 2 + 1)),
      0,
    );
    maxHp = Math.max(1, maxHp + con * level);
    hpEstimated = true;
  }
  if (maxHp !== null) mapped.push("system.attributes.hp");
  const acValue = Number.isInteger(sys.attributes?.ac?.flat)
    ? sys.attributes.ac.flat
    : Number.isInteger(sys.attributes?.ac?.value)
      ? sys.attributes.ac.value
      : 10 + dex;
  mapped.push("system.attributes.ac");
  const walk = Number(sys.attributes?.movement?.walk);
  const units = String(sys.attributes?.movement?.units ?? "ft");
  const speed =
    Number.isFinite(walk) && walk > 0
      ? units === "m"
        ? walk
        : Math.round(walk * 0.3 * 10) / 10
      : 9;
  if (Number.isFinite(walk)) mapped.push("system.attributes.movement");
  const skills = Object.entries(sys.skills ?? {})
    .filter(([key, row]) => FOUNDRY_SKILLS[key] && Number(row?.value) >= 1)
    .map(([key]) => FOUNDRY_SKILLS[key]);
  if (isObject(sys.skills)) mapped.push("system.skills");
  const spellSlots = {};
  for (let n = 1; n <= 9; n++) {
    const row = sys.spells?.[`spell${n}`];
    const max = Number(row?.override ?? row?.max);
    if (Number.isInteger(max) && max > 0)
      spellSlots[n] = { max, used: Math.max(0, max - (Number(row?.value) || 0)) };
  }
  if (Object.keys(spellSlots).length) mapped.push("system.spells");
  const hitDice = {};
  for (const row of classes) {
    const key = /^d(6|8|10|12)$/.test(row.die) ? row.die : null;
    if (!key) continue;
    hitDice[key] ??= { max: 0, used: 0 };
    hitDice[key].max += row.level;
    hitDice[key].used += Number.isInteger(row.used) ? row.used : 0;
  }
  const details = sys.details ?? {};
  const lines = (value) =>
    plainText(value)
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 12);
  const personality = {
    traits: lines(details.trait),
    ideals: lines(details.ideal),
    bonds: lines(details.bond),
    flaws: lines(details.flaw),
  };
  if (["trait", "ideal", "bond", "flaw"].some((key) => details[key]))
    mapped.push("system.details.trait/ideal/bond/flaw");
  if (details.biography) mapped.push("system.details.biography");
  const inventory = [],
    spells = [],
    features = [];
  items.forEach((row, index) => {
    if (!isObject(row)) return;
    const name = String(row.name ?? "")
      .trim()
      .slice(0, 120);
    if (!name) return;
    const description = plainText(row.system?.description?.value).slice(0, 2000);
    if (row.type === "spell")
      spells.push({
        id: `foundry-spell-${index + 1}`,
        name,
        level: Number.isInteger(row.system?.level) ? Math.min(9, Math.max(0, row.system.level)) : 0,
        prepared: row.system?.preparation?.prepared !== false,
        ...(description ? { description } : {}),
        source: "Foundry VTT (dnd5e)",
      });
    else if (row.type === "feat")
      features.push({
        id: `foundry-feature-${index + 1}`,
        name,
        ...(description ? { description } : {}),
        source: "Foundry VTT (dnd5e)",
      });
    else if (row.type === "equipment" || FOUNDRY_ITEM_KIND[row.type])
      inventory.push({
        id: `foundry-item-${index + 1}`,
        name,
        quantity: Number.isInteger(row.system?.quantity) ? row.system.quantity : 1,
        kind:
          row.type === "equipment"
            ? isObject(row.system?.armor) && row.system.armor.value
              ? "armor"
              : "gear"
            : FOUNDRY_ITEM_KIND[row.type],
        ...(typeof row.system?.equipped === "boolean" ? { equipped: row.system.equipped } : {}),
        ...(Number.isFinite(Number(row.system?.weight?.value ?? row.system?.weight))
          ? { weight: Number(row.system?.weight?.value ?? row.system?.weight) }
          : {}),
        ...(description ? { description } : {}),
        source: "Foundry VTT (dnd5e)",
      });
    else if (!["class", "subclass"].includes(row.type)) unmapped.push(`items[${row.type}] ${name}`);
  });
  if (spells.length) mapped.push("items[spell]");
  if (features.length) mapped.push("items[feat]");
  if (inventory.length) mapped.push("items[weapon/equipment/…]");
  for (const key of Object.keys(data))
    if (!["name", "type", "system", "items", "_id", "img"].includes(key)) unmapped.push(key);
  for (const key of Object.keys(sys))
    if (!["abilities", "attributes", "skills", "spells", "details"].includes(key))
      unmapped.push(`system.${key}`);
  const buildClasses = classes
    .filter((row) => classIds.includes(row.id))
    .map((row) => ({ classId: row.id, level: row.level }));
  return {
    ok: true,
    sourceId: typeof data._id === "string" ? data._id.slice(0, 40) : null,
    mapped,
    unmapped: [...new Set(unmapped)].slice(0, 60),
    hpEstimated,
    file: {
      format: FILE_FORMAT,
      formatVersion: FILE_VERSION,
      character: {
        name: String(data.name ?? "").trim(),
        className: classes.map((row) => `${row.name} ${row.level}`).join(" / "),
        level: level || null,
        abilities,
        maxHp,
        hp: Number.isInteger(hp.value) ? hp.value : maxHp,
        tempHp: Number.isInteger(hp.temp) ? hp.temp : 0,
        ac: acValue,
        speed,
        inventory,
        spells,
        features,
        description: plainText(details.appearance).slice(0, 20000),
        backstory: plainText(details.biography?.value ?? details.biography).slice(0, 20000),
        notes: "",
        skills,
        ...(Object.keys(hitDice).length ? { hitDice } : {}),
        ...(Object.keys(spellSlots).length ? { spellSlots } : {}),
        ...(buildClasses.length === classes.length && buildClasses.length
          ? { buildSeed: { classes: buildClasses } }
          : {}),
        ...(Object.keys(saves).length
          ? {
              savingThrows: Object.fromEntries(
                ABILITY_IDS.map((id) => [
                  id,
                  (modifier(abilities[id]) ?? 0) +
                    (saves[id] ? 2 + Math.floor((Math.max(1, level) - 1) / 4) : 0),
                ]),
              ),
            }
          : {}),
        personality,
      },
    },
  };
}
function guessFormat(data) {
  if (isObject(data) && data.format === "d20-studio-library")
    return {
      it: "È un file della Biblioteca di d20 Studio, non un personaggio: importalo dalla Biblioteca.",
      en: "This is a d20 Studio Library file, not a character: import it from the Library.",
    };
  if (isObject(data) && isObject(data.system) && typeof data.type === "string")
    return {
      it: "Sembra un documento esportato da Foundry VTT: qui si importa solo il formato di d20 Studio.",
      en: "This looks like a Foundry VTT document: only the d20 Studio format can be imported here.",
    };
  if (isObject(data) && (isObject(data.data?.stats) || Array.isArray(data.data?.classes)))
    return {
      it: "Sembra un personaggio di un altro servizio: qui si importa solo il formato di d20 Studio.",
      en: "This looks like a character from another service: only the d20 Studio format can be imported here.",
    };
  return {
    it: "Il file non è un personaggio esportato da d20 Studio.",
    en: "The file is not a character exported by d20 Studio.",
  };
}

// Provenance travels with a row as data: kind, edition, revision, hash, pages (SRD, authored).
function importSource(value, depth = 0) {
  if (typeof value === "string") return value.slice(0, 300);
  if (!isObject(value) || depth > 1) return undefined;
  const out = {};
  for (const key of ["kind", "edition", "revision", "sha256", "url", "note"])
    if (typeof value[key] === "string") out[key] = value[key].slice(0, 300);
  if (filled(text(value.title, 120))) out.title = text(value.title, 120);
  if (Array.isArray(value.pages))
    out.pages = value.pages.filter((n) => Number.isInteger(n) && n > 0 && n < 5000).slice(0, 20);
  for (const lang of ["en", "it"]) {
    const nested = importSource(value[lang], depth + 1);
    if (isObject(nested)) out[lang] = nested;
  }
  return Object.keys(out).length ? out : undefined;
}
// Optional fields are kept only when present and valid, so the app's own file round-trips.
function optional(target, row, key, value) {
  if (value !== null && value !== undefined && row[key] !== undefined) target[key] = value;
}
function importItem(row, index) {
  if (!isObject(row)) return null;
  const name = text(row.name, 120);
  if (!filled(name)) return null;
  const item = {
    id: idText(row.id) ?? `item-${index + 1}`,
    name,
    quantity: int(row.quantity, 0, 9999) ?? 1,
    kind: ["weapon", "consumable", "gear", "armor", "tool", "treasure"].includes(row.kind)
      ? row.kind
      : "gear",
  };
  optional(item, row, "weight", num(row.weight, 0, 10000));
  optional(item, row, "equipped", typeof row.equipped === "boolean" ? row.equipped : null);
  optional(item, row, "description", text(row.description, 2000));
  optional(item, row, "healing", int(row.healing, 1, 999));
  optional(item, row, "weaponType", idText(row.weaponType));
  optional(item, row, "source", importSource(row.source));
  return item;
}
function importSpell(row, index) {
  if (!isObject(row)) return null;
  const name = text(row.name, 120);
  if (!filled(name)) return null;
  const spell = {
    id: idText(row.id) ?? `spell-${index + 1}`,
    name,
    level: int(row.level, 0, 9) ?? 0,
    prepared: row.prepared !== false,
  };
  optional(spell, row, "description", text(row.description, 4000));
  for (const key of ["catalogId", "combatActionId"]) optional(spell, row, key, idText(row[key]));
  optional(spell, row, "source", importSource(row.source));
  for (const key of ["concentration", "ritual"])
    optional(spell, row, key, typeof row[key] === "boolean" ? row[key] : null);
  return spell;
}
function importFeature(row, index) {
  if (!isObject(row)) return null;
  const name = text(row.name, 120);
  if (!filled(name)) return null;
  const feature = { id: idText(row.id) ?? `feature-${index + 1}`, name };
  optional(feature, row, "description", text(row.description, 4000));
  optional(feature, row, "level", int(row.level, 1, 20));
  optional(feature, row, "used", int(row.used, 0, 99));
  for (const key of ["definitionId", "grantId", "automation"])
    optional(feature, row, key, idText(row[key]));
  optional(feature, row, "source", importSource(row.source));
  return feature;
}
function importPools(value, maxLevel) {
  if (!isObject(value)) return null;
  const out = {};
  for (const [level, pool] of Object.entries(value)) {
    const n = Number(level);
    if (!Number.isInteger(n) || n < 1 || n > maxLevel || !isObject(pool)) continue;
    const max = int(pool.max, 0, 20);
    if (max === null) continue;
    out[n] = { max, used: Math.min(int(pool.used, 0, 20) ?? 0, max) };
  }
  return Object.keys(out).length ? out : null;
}
function importLog(rows) {
  return (Array.isArray(rows) ? rows : [])
    .slice(0, 200)
    .map((row) => (isObject(row) ? sanitizeLogEntry(row) : null))
    .filter(Boolean);
}
/** One adventure-log row (Fantasy Grounds Log tab, R20-044): strict, bounded fields. */
export function sanitizeLogEntry(row) {
  const title = text(row.title, 120);
  if (typeof title !== "string" || !title) return null;
  const date = typeof row.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.date) ? row.date : "";
  return {
    id: idText(row.id) ?? `log-${Math.random().toString(36).slice(2, 10)}`,
    date,
    title,
    dm: typeof row.dm === "string" ? row.dm.trim().slice(0, 80) : "",
    levels: int(row.levels, 0, 20) ?? 0,
    gold: num(row.gold, -1_000_000, 1_000_000) ?? 0,
    downtime: int(row.downtime, -365, 365) ?? 0,
    items: typeof row.items === "string" ? row.items.trim().slice(0, 300) : "",
    notes: typeof row.notes === "string" ? row.notes.trim().slice(0, 1000) : "",
  };
}

/**
 * Reads a character file. Returns {ok:false, kind, it, en} for a file that is too large,
 * malformed, of another format, from a newer version or with insufficient data (each with
 * its own message), otherwise {ok:true, character, adventureLog, preview}.
 */
export function parseCharacterFile(textValue, { bytes = null } = {}) {
  const size = bytes ?? new TextEncoder().encode(String(textValue ?? "")).length;
  if (size > MAX_IMPORT_BYTES)
    return fail(
      "too-large",
      "Il file supera 512 KB: nessuna modifica.",
      "The file is larger than 512 KB: nothing changed.",
    );
  let data;
  try {
    data = JSON.parse(String(textValue ?? ""));
  } catch {
    return fail(
      "malformed",
      "Il file non è un JSON leggibile: nessuna modifica.",
      "The file is not readable JSON: nothing changed.",
    );
  }
  let foundry = null;
  if (isFoundryActor(data)) {
    foundry = fromFoundryActor(data);
    if (!foundry.ok) return fail("unsupported", foundry.it, foundry.en);
    data = foundry.file;
  }
  if (!isObject(data) || data.format !== FILE_FORMAT) {
    const guess = guessFormat(data);
    return fail("unsupported", guess.it, guess.en);
  }
  if (!Number.isInteger(data.formatVersion) || data.formatVersion < 1)
    return fail(
      "malformed",
      "Versione del file mancante: nessuna modifica.",
      "The file version is missing: nothing changed.",
    );
  if (data.formatVersion > FILE_VERSION)
    return fail(
      "newer",
      "Il file viene da una versione più recente di d20 Studio: nessuna modifica.",
      "The file comes from a newer d20 Studio version: nothing changed.",
    );
  const source = isObject(data.character) ? data.character : null;
  const problems = [];
  const name = source ? text(source.name, 80) : null;
  if (typeof name !== "string" || !name)
    problems.push({ it: "manca il nome", en: "the name is missing" });
  const level = source ? int(source.level, 1, 20) : null;
  if (level === null)
    problems.push({ it: "livello assente o fuori da 1–20", en: "level missing or outside 1–20" });
  const abilities = {};
  for (const id of ABILITY_IDS) {
    const score = source ? int(source.abilities?.[id], 1, 30) : null;
    if (score === null) {
      problems.push({
        it: "caratteristiche incomplete (sei valori interi fra 1 e 30)",
        en: "incomplete abilities (six whole scores from 1 to 30)",
      });
      break;
    }
    abilities[id] = score;
  }
  const maxHp = source ? int(source.maxHp, 1, 999) : null;
  if (maxHp === null) problems.push({ it: "PF massimi assenti", en: "maximum hit points missing" });
  if (problems.length)
    return fail(
      "insufficient",
      (foundry
        ? "Personaggio di Foundry VTT (dnd5e) con dati insufficienti: "
        : "Dati insufficienti per una scheda: ") +
        problems.map((p) => p.it).join("; ") +
        ".",
      (foundry
        ? "Foundry VTT (dnd5e) character with too little data: "
        : "Not enough data for a sheet: ") +
        problems.map((p) => p.en).join("; ") +
        ".",
      { problems },
    );
  const character = {
    name,
    className: filled(text(source.className, 80)) ? text(source.className, 80) : "",
    level,
    abilities,
    maxHp,
    hp: Math.min(int(source.hp, 0, 999) ?? maxHp, maxHp),
    tempHp: int(source.tempHp, 0, 999) ?? 0,
    ac: int(source.ac, 0, 40) ?? 10,
    speed: num(source.speed, 0, 100) ?? 9,
    inventory: (Array.isArray(source.inventory) ? source.inventory : [])
      .slice(0, 300)
      .map(importItem)
      .filter(Boolean),
    spells: (Array.isArray(source.spells) ? source.spells : [])
      .slice(0, 300)
      .map(importSpell)
      .filter(Boolean),
    features: (Array.isArray(source.features) ? source.features : [])
      .slice(0, 300)
      .map(importFeature)
      .filter(Boolean),
    description: text(source.description, 20000) ?? "",
    backstory: text(source.backstory, 20000) ?? "",
    notes: text(source.notes, 20000) ?? "",
  };
  // Traits, ideals, bonds and flaws (the builder's actor.personality contract).
  if (isObject(source.personality)) {
    const list = (value) =>
      (Array.isArray(value) ? value : [])
        .filter((row) => typeof row === "string" && row.trim())
        .map((row) => row.trim().slice(0, 300))
        .slice(0, 12);
    character.personality = {
      traits: list(source.personality.traits),
      ideals: list(source.personality.ideals),
      bonds: list(source.personality.bonds),
      flaws: list(source.personality.flaws),
    };
  }
  const recognized = [
    "name",
    "className",
    "level",
    "abilities",
    "maxHp",
    "hp",
    "tempHp",
    "ac",
    "speed",
    "inventory",
    "spells",
    "features",
    "description",
    "backstory",
    "notes",
  ];
  const catalogSpecies = getCharacterCatalog().species.map((row) => row.id);
  if (catalogSpecies.includes(source.speciesId)) {
    character.speciesId = source.speciesId;
    recognized.push("speciesId");
  }
  if (isObject(source.savingThrows)) {
    const saves = {};
    for (const id of ABILITY_IDS)
      if (int(source.savingThrows[id], -10, 30) !== null) saves[id] = source.savingThrows[id];
    if (Object.keys(saves).length) {
      character.savingThrows = saves;
      recognized.push("savingThrows");
    }
  }
  const skillIds = SKILLS.map((row) => row.id);
  if (Array.isArray(source.skills)) {
    character.skills = source.skills.filter((id) => skillIds.includes(id));
    recognized.push("skills");
  }
  if (isObject(source.skillModifiers)) {
    character.skillModifiers = Object.fromEntries(
      Object.entries(source.skillModifiers).filter(
        ([id, value]) => skillIds.includes(id) && int(value, -10, 30) !== null,
      ),
    );
    recognized.push("skillModifiers");
  }
  if (int(source.proficiencyBonus, 2, 6) !== null) {
    character.proficiencyBonus = source.proficiencyBonus;
    recognized.push("proficiencyBonus");
  }
  if (["tiny", "small", "medium", "large", "huge", "gargantuan"].includes(source.size)) {
    character.size = source.size;
    recognized.push("size");
  }
  if (typeof source.creatureType === "string" && /^[a-z]{3,20}$/.test(source.creatureType)) {
    character.creatureType = source.creatureType;
    recognized.push("creatureType");
  }
  if (isObject(source.hitDice)) {
    const dice = {};
    for (const die of ["d6", "d8", "d10", "d12"]) {
      const row = source.hitDice[die];
      const max = isObject(row) ? int(row.max, 0, 20) : null;
      if (max) dice[die] = { max, used: Math.min(int(row.used, 0, 20) ?? 0, max) };
    }
    if (Object.keys(dice).length) {
      character.hitDice = dice;
      recognized.push("hitDice");
    }
  }
  const slots = importPools(source.spellSlots, 9);
  if (slots) {
    character.spellSlots = slots;
    recognized.push("spellSlots");
  }
  if (
    isObject(source.pactSlots) &&
    int(source.pactSlots.level, 1, 5) &&
    int(source.pactSlots.max, 0, 4) !== null
  ) {
    character.pactSlots = {
      level: source.pactSlots.level,
      max: source.pactSlots.max,
      used: Math.min(int(source.pactSlots.used, 0, 4) ?? 0, source.pactSlots.max),
      source:
        typeof source.pactSlots.source === "string"
          ? source.pactSlots.source.slice(0, 200)
          : "imported",
    };
    recognized.push("pactSlots");
  }
  if (isObject(source.buildSeed) && Array.isArray(source.buildSeed.classes)) {
    const classIds = getCharacterCatalog().classes.map((row) => row.id);
    const classes = source.buildSeed.classes
      .filter((row) => isObject(row) && classIds.includes(row.classId) && int(row.level, 1, 20))
      .map((row) => ({
        classId: row.classId,
        level: row.level,
        ...(idText(row.subclassId) ? { subclassId: row.subclassId } : {}),
      }));
    if (classes.length) {
      character.buildSeed = {
        classes,
        ...(Array.isArray(source.buildSeed.levelOrder)
          ? {
              levelOrder: source.buildSeed.levelOrder
                .filter((id) => classIds.includes(id))
                .slice(0, 20),
            }
          : {}),
        source: { kind: "imported", revision: "file", title: { it: "Da file", en: "From file" } },
      };
      recognized.push("buildSeed");
    }
  }
  if (isObject(source.combatProfile)) {
    const profile = source.combatProfile;
    const clean = {
      team: ["party", "watch", "neutral"].includes(profile.team) ? profile.team : "party",
      proficiencyBonus: int(profile.proficiencyBonus, 2, 6) ?? character.proficiencyBonus ?? 2,
      weaponProficiencies: (Array.isArray(profile.weaponProficiencies)
        ? profile.weaponProficiencies
        : []
      )
        .map(idText)
        .filter(Boolean),
      spells: (Array.isArray(profile.spells) ? profile.spells : []).map(idText).filter(Boolean),
      componentsAvailable: profile.componentsAvailable !== false,
    };
    if (ABILITY_IDS.includes(profile.spellcastingAbility))
      clean.spellcastingAbility = profile.spellcastingAbility;
    character.combatProfile = clean;
    recognized.push("combatProfile");
  }
  if (["death-saves", "death", "disappear", "manual"].includes(source.vitalityPolicy?.zeroHp)) {
    character.vitalityPolicy = copy(source.vitalityPolicy);
    recognized.push("vitalityPolicy");
  }
  if (character.personality) recognized.push("personality");
  const ignored = foundry
    ? foundry.unmapped
    : Object.keys(source).filter((key) => !recognized.includes(key));
  const adventureLog = importLog(data.adventureLog);
  const missing = [];
  if (foundry?.hpEstimated)
    missing.push({
      it: "PF massimi: Foundry li calcola da sé; qui sono stimati con il valore fisso di ogni livello. Controllali.",
      en: "Maximum HP: Foundry computes them itself; here they are estimated with each level's fixed value. Check them.",
    });
  if (!character.buildSeed)
    missing.push({
      it: "Classi e livelli strutturati: la scheda non si potrà far avanzare finché non la ricostruisci.",
      en: "Structured classes and levels: the sheet cannot level up until you reconstruct it.",
    });
  missing.push({
    it: "Storia della creazione e dadi di creazione: non fanno parte del file.",
    en: "Creation history and creation dice: not part of the file.",
  });
  if (!character.combatProfile)
    missing.push({
      it: "Profilo di combattimento: attacchi e incantesimi al Tavolo vanno registrati a mano.",
      en: "Combat profile: attacks and spells at the Table must be recorded manually.",
    });
  return {
    ok: true,
    character,
    adventureLog,
    ...(foundry ? { origin: { format: "foundry-dnd5e", sourceId: foundry.sourceId } } : {}),
    preview: {
      format: foundry ? "foundry-dnd5e" : FILE_FORMAT,
      mapped: foundry ? foundry.mapped : [],
      exportedAt: typeof data.exportedAt === "string" ? data.exportedAt.slice(0, 40) : null,
      name: character.name,
      className: character.className,
      level: character.level,
      hp: character.hp,
      maxHp: character.maxHp,
      ac: character.ac,
      counts: {
        inventory: character.inventory.length,
        spells: character.spells.length,
        features: character.features.length,
        log: adventureLog.length,
      },
      recognized,
      ignored,
      missing,
    },
  };
}

// ---------------------------------------------------------------- PDF

// WinAnsiEncoding bytes for the standard 14 fonts (Italian accents, typographic quotes).
const WIN_ANSI = {
  "€": 0x80,
  "‚": 0x82,
  "„": 0x84,
  "…": 0x85,
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "•": 0x95,
  "–": 0x96,
  "—": 0x97,
  "™": 0x99,
};
function winAnsi(value) {
  let out = "";
  for (const char of String(value ?? "")) {
    const code = char.codePointAt(0);
    if (code >= 32 && code <= 126) out += char;
    else if (WIN_ANSI[char]) out += String.fromCharCode(WIN_ANSI[char]);
    else if (code >= 0xa0 && code <= 0xff) out += char;
    else if (char === "\n" || char === "\t") out += " ";
    else out += "?";
  }
  return out;
}
// PDF literal string, ASCII-only file: non-ASCII bytes become octal escapes.
function pdfString(value) {
  let out = "(";
  for (const char of winAnsi(value)) {
    const code = char.charCodeAt(0);
    if (char === "(" || char === ")" || char === "\\") out += "\\" + char;
    else if (code < 32 || code > 126) out += "\\" + code.toString(8).padStart(3, "0");
    else out += char;
  }
  return out + ")";
}
// Text strings outside content streams (field values): UTF-16BE with BOM, hex.
function pdfText(value) {
  let hex = "FEFF";
  for (const char of String(value ?? ""))
    for (const unit of char.split(""))
      hex += unit.charCodeAt(0).toString(16).padStart(4, "0").toUpperCase();
  return "<" + hex + ">";
}
const round = (value) => Math.round(value * 100) / 100;
// Average Helvetica advance (per point of size) for wrapping; conservative.
const AVG_WIDTH = 0.53;
export function wrapText(value, width, size) {
  const max = Math.max(8, Math.floor(width / (size * AVG_WIDTH)));
  const lines = [];
  for (const paragraph of String(value ?? "").split(/\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (!line) line = word;
      else if ((line + " " + word).length <= max) line += " " + word;
      else {
        lines.push(line);
        line = word;
      }
      while (line.length > max) {
        lines.push(line.slice(0, max));
        line = line.slice(max);
      }
    }
    lines.push(line);
  }
  return lines;
}

/**
 * A minimal PDF 1.4 writer: pages of text, rules and AcroForm text fields (with their own
 * appearance streams, so the values show in every viewer and stay editable).
 * page = {ops: [{t:"text"|"line"|"rect", ...}], fields: [{name, value, x, y, w, h, size}]}.
 */
export function buildPdf(pages, { title = "", width = 595.28, height = 841.89 } = {}) {
  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };
  const catalogId = add(null);
  const pagesId = add(null);
  const fontRegular = add(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  );
  const fontBold = add(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
  );
  const infoId = add(
    `<< /Title ${pdfText(title)} /Producer (d20 Studio blueprint) /Creator (d20 Studio) >>`,
  );
  const pageIds = [];
  const fieldIds = [];
  const stream = (dict, content) =>
    `<< ${dict} /Length ${content.length} >>\nstream\n${content}\nendstream`;
  for (const page of pages) {
    const pageId = add(null);
    pageIds.push(pageId);
    let content = "";
    for (const op of page.ops ?? []) {
      if (op.t === "text")
        content += `BT /${op.bold ? "F2" : "F1"} ${round(op.size ?? 10)} Tf ${op.gray ? `${op.gray} g ` : "0 g "}${round(op.x)} ${round(op.y)} Td ${pdfString(op.text)} Tj ET\n`;
      else if (op.t === "line")
        content += `${op.width ?? 0.5} w 0.55 G ${round(op.x1)} ${round(op.y1)} m ${round(op.x2)} ${round(op.y2)} l S\n`;
      else if (op.t === "rect")
        content += `${op.width ?? 0.6} w 0.55 G ${round(op.x)} ${round(op.y)} ${round(op.w)} ${round(op.h)} re S\n`;
    }
    const contentId = add(stream("", content));
    const annots = [];
    for (const field of page.fields ?? []) {
      const size = field.size ?? 10;
      const appearance = `/Tx BMC q BT /Helv ${size} Tf 0 g 3 ${round((field.h - size) / 2 + 1.5)} Td ${pdfString(field.value)} Tj ET Q EMC`;
      const apId = add(
        stream(
          `/Type /XObject /Subtype /Form /BBox [0 0 ${round(field.w)} ${round(field.h)}] /Resources << /Font << /Helv ${fontRegular} 0 R >> >>`,
          appearance,
        ),
      );
      const fieldId = add(
        `<< /Type /Annot /Subtype /Widget /FT /Tx /F 4 /T ${pdfString(field.name)} /V ${pdfText(field.value)} /DA (/Helv ${size} Tf 0 g) /Rect [${round(field.x)} ${round(field.y)} ${round(field.x + field.w)} ${round(field.y + field.h)}] /P ${pageId} 0 R /MK << /BG [0.96 0.95 0.9] /BC [0.55 0.55 0.55] >> /AP << /N ${apId} 0 R >> >>`,
      );
      annots.push(fieldId);
      fieldIds.push(fieldId);
    }
    objects[pageId - 1] =
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentId} 0 R` +
      (annots.length ? ` /Annots [${annots.map((id) => id + " 0 R").join(" ")}]` : "") +
      " >>";
  }
  objects[pagesId - 1] =
    `<< /Type /Pages /Kids [${pageIds.map((id) => id + " 0 R").join(" ")}] /Count ${pageIds.length} >>`;
  objects[catalogId - 1] =
    `<< /Type /Catalog /Pages ${pagesId} 0 R` +
    (fieldIds.length
      ? ` /AcroForm << /Fields [${fieldIds.map((id) => id + " 0 R").join(" ")}] /NeedAppearances true /DA (/Helv 0 Tf 0 g) /DR << /Font << /Helv ${fontRegular} 0 R >> >> >>`
      : "") +
    " >>";
  let out = "%PDF-1.4\n%âãÏÓ\n";
  const offsets = [];
  objects.forEach((body, index) => {
    offsets.push(out.length);
    out += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) out += String(offset).padStart(10, "0") + " 00000 n \n";
  out += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i += 1) bytes[i] = out.charCodeAt(i) & 0xff;
  return bytes;
}

/**
 * The character PDF (DDB-065): identity and statistics as fillable fields; inventory,
 * features, spells with Concentration/Ritual columns, the story with shared annotations,
 * and the adventure log. `sheet` is a readSheet() projection.
 */
export function characterPdf(sheet, lang = "it", { now = Date.now() } = {}) {
  const t = (it, en) => (lang === "it" ? it : en);
  const L = (value) => pick(value, lang);
  const W = 595.28;
  const H = 841.89;
  const M = 40;
  const pages = [];
  let page;
  let y;
  const newPage = () => {
    page = { ops: [], fields: [] };
    pages.push(page);
    y = H - M;
  };
  const need = (space) => {
    if (y - space < M + 20) newPage();
  };
  const textAt = (x, yy, value, size = 10, bold = false, gray = null) =>
    page.ops.push({ t: "text", x, y: yy, text: value, size, bold, gray });
  const heading = (value) => {
    need(34);
    y -= 8;
    textAt(M, y, value, 13, true);
    y -= 6;
    page.ops.push({ t: "line", x1: M, y1: y, x2: W - M, y2: y });
    y -= 14;
  };
  const para = (value, size = 10) => {
    for (const line of wrapText(value, W - 2 * M, size)) {
      need(size + 4);
      textAt(M, y, line, size);
      y -= size + 4;
    }
  };
  const field = (label, name, value, x, w, h = 20) => {
    textAt(x, y, label, 8, false, 0.35);
    page.fields.push({ name, value: String(value ?? ""), x, y: y - h - 3, w, h, size: 10 });
  };
  newPage();
  textAt(
    M,
    y,
    t("d20 Studio · Scheda del personaggio", "d20 Studio · Character sheet"),
    9,
    false,
    0.35,
  );
  y -= 22;
  textAt(M, y, sheet.name, 20, true);
  y -= 26;
  // One class: the sheet's own label and level ("Maga 3"); several: "Guerriero 2 / Mago 3".
  const classLine =
    (sheet.classes.filter((row) => row.name).length > 1
      ? sheet.classes.map((row) => `${L(row.name)} ${row.level ?? ""}`.trim()).join(" / ")
      : `${L(sheet.className)} ${sheet.level ?? ""}`.trim()) || "—";
  field(t("Nome", "Name"), "name", sheet.name, M, 170);
  field(t("Classe e livello", "Class and level"), "class_level", classLine, M + 180, 190);
  field(
    t("Specie", "Species"),
    "species",
    sheet.species ? L(sheet.species.name) : "",
    M + 380,
    W - 2 * M - 380,
  );
  y -= 44;
  const stats = [
    [t("CA", "AC"), "ac", sheet.ac],
    [t("PF attuali", "Current HP"), "hp", sheet.hp],
    [t("PF massimi", "Max HP"), "max_hp", sheet.maxHp],
    [t("PF temporanei", "Temp HP"), "temp_hp", sheet.tempHp],
    [t("Velocità (m)", "Speed (m)"), "speed", sheet.speed],
    [t("Bonus comp.", "Prof. bonus"), "proficiency", signed(sheet.proficiencyBonus)],
  ];
  const statWidth = (W - 2 * M - 5 * 8) / 6;
  stats.forEach(([label, name, value], index) =>
    field(label, name, value ?? "", M + index * (statWidth + 8), statWidth),
  );
  y -= 44;
  const abilityWidth = (W - 2 * M - 5 * 8) / 6;
  sheet.abilities.forEach((row, index) =>
    field(
      L(row.short),
      `ability_${row.id}`,
      row.score === null ? "" : `${row.score} (${signed(row.mod)})`,
      M + index * (abilityWidth + 8),
      abilityWidth,
    ),
  );
  y -= 40;
  if (sheet.savingThrows.length) {
    heading(t("Tiri salvezza", "Saving throws"));
    para(sheet.savingThrows.map((row) => `${L(row.short)} ${signed(row.value)}`).join("   "));
  }
  if (sheet.skills.length) {
    heading(t("Abilità competenti", "Proficient skills"));
    para(
      sheet.skills
        .map((row) => `${L(row.name)} ${row.value === null ? "" : signed(row.value)}`.trim())
        .join(" · "),
    );
  }
  if (sheet.hitDice.length || sheet.slots.length) {
    heading(t("Risorse", "Resources"));
    if (sheet.hitDice.length)
      para(
        t("Dadi Vita: ", "Hit Dice: ") +
          sheet.hitDice.map((row) => `${row.max - row.used}/${row.max} ${row.die}`).join(", "),
      );
    if (sheet.slots.length)
      para(
        t("Slot incantesimo disponibili: ", "Spell slots available: ") +
          sheet.slots.map((row) => `${row.level}° ${row.max - row.used}/${row.max}`).join(" · "),
      );
  }
  heading(t("Equipaggiamento", "Equipment"));
  if (!sheet.inventory.length) para(t("Nessun oggetto registrato.", "No items recorded."));
  for (const item of sheet.inventory)
    para(
      `${item.equipped ? "• " : "  "}${L(item.name)} × ${item.quantity}${item.weight ? ` · ${item.weight} kg` : ""}${item.equipped ? t(" · equipaggiato", " · equipped") : ""}`,
    );
  if (sheet.features.length) {
    heading(t("Capacità", "Features"));
    para(sheet.features.map((row) => L(row.name)).join(" · "));
  }
  heading(t("Incantesimi", "Spells"));
  if (!sheet.spells.length) para(t("Nessun incantesimo registrato.", "No spells recorded."));
  else {
    need(30);
    const cols = [M, M + 44, M + 330, M + 380, M + 430];
    [t("Liv.", "Lvl"), t("Nome", "Name"), "C", "R", t("Preparato", "Prepared")].forEach(
      (label, index) => textAt(cols[index], y, label, 9, true),
    );
    y -= 14;
    for (const spell of sheet.spells) {
      need(16);
      textAt(cols[0], y, spell.level === 0 ? t("Truc.", "Cant.") : String(spell.level ?? "—"), 10);
      textAt(cols[1], y, L(spell.name), 10);
      textAt(cols[2], y, spell.concentration ? "C" : "–", 10, spell.concentration);
      textAt(cols[3], y, spell.ritual ? "R" : "–", 10, spell.ritual);
      textAt(cols[4], y, spell.prepared ? t("sì", "yes") : t("no", "no"), 10);
      y -= 15;
    }
    y -= 4;
    para(
      t(
        "C = Concentrazione · R = Rituale (valori dell’SRD 5.2.1 per gli incantesimi del catalogo).",
        "C = Concentration · R = Ritual (SRD 5.2.1 values for catalog spells).",
      ),
      8,
    );
  }
  const story = [
    [t("Aspetto e descrizione", "Appearance and description"), sheet.story.description],
    [t("Storia e legami", "Story and bonds"), sheet.story.backstory],
    [t("Annotazioni condivise", "Shared annotations"), sheet.story.notes],
  ].filter(([, value]) => value);
  if (story.length) {
    heading(t("Note e storia", "Notes and story"));
    for (const [label, value] of story) {
      need(30);
      textAt(M, y, label, 10, true);
      y -= 14;
      para(value);
      y -= 4;
    }
  }
  if (sheet.log.length) {
    heading(t("Registro delle avventure", "Adventure log"));
    for (const row of sheet.log) {
      need(30);
      textAt(M, y, `${row.date || "—"} · ${row.title}`, 10, true);
      y -= 14;
      para(
        [
          row.dm ? `DM: ${row.dm}` : "",
          row.levels ? t(`Livelli +${row.levels}`, `Levels +${row.levels}`) : "",
          row.gold
            ? t(
                `Oro ${row.gold > 0 ? "+" : ""}${row.gold} mo`,
                `Gold ${row.gold > 0 ? "+" : ""}${row.gold} gp`,
              )
            : "",
          row.downtime ? t(`Tempo libero ${row.downtime} g`, `Downtime ${row.downtime} d`) : "",
          row.items ? t(`Oggetti: ${row.items}`, `Items: ${row.items}`) : "",
          row.notes,
        ]
          .filter(Boolean)
          .join(" · "),
        9,
      );
    }
  }
  pages.forEach((row, index) =>
    row.ops.push({
      t: "text",
      x: M,
      y: 22,
      size: 7.5,
      gray: 0.4,
      text: t(
        `d20 Studio (prototipo) · dati sintetici · D&D 2024, SRD 5.2.1 · ${new Date(now).toISOString().slice(0, 10)} · pagina ${index + 1}/${pages.length}`,
        `d20 Studio (prototype) · synthetic data · D&D 2024, SRD 5.2.1 · ${new Date(now).toISOString().slice(0, 10)} · page ${index + 1}/${pages.length}`,
      ),
    }),
  );
  return buildPdf(pages, { title: sheet.name });
}

// ---------------------------------------------------------------- QR code

// QR Code model 2, byte mode, error correction level M, versions 1–10 (ISO/IEC 18004).
// [data codewords per block group 1 count, size; group 2 count, size; ECC per block]
const QR_M = {
  1: [1, 16, 0, 0, 10],
  2: [1, 28, 0, 0, 16],
  3: [1, 44, 0, 0, 26],
  4: [2, 32, 0, 0, 18],
  5: [2, 43, 0, 0, 24],
  6: [4, 27, 0, 0, 16],
  7: [4, 31, 0, 0, 18],
  8: [2, 38, 2, 39, 22],
  9: [3, 36, 2, 37, 22],
  10: [4, 43, 1, 44, 26],
};
const ALIGN = {
  1: [],
  2: [6, 18],
  3: [6, 22],
  4: [6, 26],
  5: [6, 30],
  6: [6, 34],
  7: [6, 22, 38],
  8: [6, 24, 42],
  9: [6, 26, 46],
  10: [6, 28, 50],
};
const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    GF_EXP[i] = x;
    GF_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) GF_EXP[i] = GF_EXP[i - 255];
}
const gfMul = (a, b) => (a === 0 || b === 0 ? 0 : GF_EXP[GF_LOG[a] + GF_LOG[b]]);
function rsGenerator(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], GF_EXP[i]);
    }
    poly = next;
  }
  return poly;
}
function rsRemainder(data, degree) {
  const gen = rsGenerator(degree);
  const rem = new Array(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ rem.shift();
    rem.push(0);
    for (let i = 0; i < degree; i += 1) rem[i] ^= gfMul(gen[i + 1], factor);
  }
  return rem;
}
// BCH code of the format (poly 0x537, 15 bits) and version (0x1F25, 18 bits) information.
function bchBits(value, poly, totalBits) {
  const degree = Math.floor(Math.log2(poly));
  let rem = value << degree;
  for (let i = totalBits - 1; i >= degree; i -= 1) if ((rem >>> i) & 1) rem ^= poly << (i - degree);
  return (value << degree) | rem;
}
const MASKS = [
  (x, y) => (x + y) % 2 === 0,
  (x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/** Boolean matrix (true = dark) of a QR code for `value` (UTF-8 bytes), level M. */
export function qrMatrix(value) {
  const bytes = [...new TextEncoder().encode(String(value ?? ""))];
  let version = 0;
  for (let v = 1; v <= 10; v += 1) {
    const [c1, s1, c2, s2] = QR_M[v];
    const capacityBits = (c1 * s1 + c2 * s2) * 8;
    if (4 + (v < 10 ? 8 : 16) + bytes.length * 8 <= capacityBits) {
      version = v;
      break;
    }
  }
  if (!version) throw Error("QR payload too long");
  const [c1, s1, c2, s2, ecc] = QR_M[version];
  const dataCapacity = c1 * s1 + c2 * s2;
  // Bit stream: mode 0100, character count, data, terminator, padding.
  const bits = [];
  const put = (val, len) => {
    for (let i = len - 1; i >= 0; i -= 1) bits.push((val >>> i) & 1);
  };
  put(0b0100, 4);
  put(bytes.length, version < 10 ? 8 : 16);
  for (const byte of bytes) put(byte, 8);
  put(0, Math.min(4, dataCapacity * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8)
    data.push(bits.slice(i, i + 8).reduce((acc, bit) => (acc << 1) | bit, 0));
  for (let pad = 0; data.length < dataCapacity; pad += 1) data.push(pad % 2 ? 0x11 : 0xec);
  // Blocks, ECC and interleaving.
  const blocks = [];
  let offset = 0;
  for (const [count, size] of [
    [c1, s1],
    [c2, s2],
  ])
    for (let i = 0; i < count; i += 1) {
      const block = data.slice(offset, offset + size);
      offset += size;
      blocks.push({ data: block, ecc: rsRemainder(block, ecc) });
    }
  const codewords = [];
  const longest = Math.max(...blocks.map((block) => block.data.length));
  for (let i = 0; i < longest; i += 1)
    for (const block of blocks) if (i < block.data.length) codewords.push(block.data[i]);
  for (let i = 0; i < ecc; i += 1) for (const block of blocks) codewords.push(block.ecc[i]);
  // Function patterns.
  const size = version * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array(size).fill(false));
  const fixed = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x, y, dark) => {
    modules[y][x] = dark;
    fixed[y][x] = true;
  };
  for (let i = 0; i < size; i += 1) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  const finder = (cx, cy) => {
    for (let dy = -4; dy <= 4; dy += 1)
      for (let dx = -4; dx <= 4; dx += 1) {
        const x = cx + dx;
        const y = cy + dy;
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        set(x, y, d !== 2 && d !== 4);
      }
  };
  finder(3, 3);
  finder(size - 4, 3);
  finder(3, size - 4);
  const align = ALIGN[version];
  for (const ay of align)
    for (const ax of align) {
      if (
        (ax === 6 && ay === 6) ||
        (ax === 6 && ay === align.at(-1)) ||
        (ax === align.at(-1) && ay === 6)
      )
        continue;
      for (let dy = -2; dy <= 2; dy += 1)
        for (let dx = -2; dx <= 2; dx += 1)
          set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  const drawFormat = (mask) => {
    const bitsValue = bchBits((0b00 << 3) | mask, 0x537, 15) ^ 0x5412;
    const bit = (i) => ((bitsValue >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i += 1) set(8, i, bit(i));
    set(8, 7, bit(6));
    set(8, 8, bit(7));
    set(7, 8, bit(8));
    for (let i = 9; i < 15; i += 1) set(14 - i, 8, bit(i));
    for (let i = 0; i < 8; i += 1) set(size - 1 - i, 8, bit(i));
    for (let i = 8; i < 15; i += 1) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
  };
  drawFormat(0);
  if (version >= 7) {
    const versionBits = bchBits(version, 0x1f25, 18);
    for (let i = 0; i < 18; i += 1) {
      const dark = ((versionBits >>> i) & 1) === 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(a, b, dark);
      set(b, a, dark);
    }
  }
  // Data placement (zigzag).
  let index = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert += 1)
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!fixed[y][x] && index < codewords.length * 8) {
          modules[y][x] = ((codewords[index >>> 3] >>> (7 - (index & 7))) & 1) === 1;
          index += 1;
        }
      }
  }
  // Mask choice by the standard penalty rules.
  const apply = (mask) => {
    for (let y = 0; y < size; y += 1)
      for (let x = 0; x < size; x += 1)
        if (!fixed[y][x] && MASKS[mask](x, y)) modules[y][x] = !modules[y][x];
  };
  let best = 0;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask += 1) {
    apply(mask);
    drawFormat(mask);
    const score = penalty(modules);
    if (score < bestScore) {
      bestScore = score;
      best = mask;
    }
    apply(mask);
  }
  apply(best);
  drawFormat(best);
  return modules;
}
function penalty(m) {
  const size = m.length;
  let score = 0;
  const line = (get) => {
    let s = 0;
    let run = 1;
    for (let i = 1; i < size; i += 1) {
      if (get(i) === get(i - 1)) run += 1;
      else {
        if (run >= 5) s += 3 + run - 5;
        run = 1;
      }
    }
    if (run >= 5) s += 3 + run - 5;
    const seq = Array.from({ length: size }, (_, i) => (get(i) ? 1 : 0)).join("");
    for (const pattern of ["10111010000", "00001011101"]) {
      let at = seq.indexOf(pattern);
      while (at !== -1) {
        s += 40;
        at = seq.indexOf(pattern, at + 1);
      }
    }
    return s;
  };
  for (let i = 0; i < size; i += 1) {
    score += line((j) => m[i][j]);
    score += line((j) => m[j][i]);
  }
  let dark = 0;
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      if (m[y][x]) dark += 1;
      if (y < size - 1 && x < size - 1) {
        const c = m[y][x];
        if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) score += 3;
      }
    }
  score += Math.floor(Math.abs((dark * 100) / (size * size) - 50) / 5) * 10;
  return score;
}
/** An accessible SVG of the QR code with a 4-module quiet zone. */
export function qrSvg(value, { label = "QR", pixels = 200 } = {}) {
  const matrix = qrMatrix(value);
  const size = matrix.length + 8;
  let path = "";
  matrix.forEach((row, y) =>
    row.forEach((dark, x) => {
      if (dark) path += `M${x + 4} ${y + 4}h1v1h-1z`;
    }),
  );
  const safe = String(label).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${pixels}" height="${pixels}" role="img" aria-label="${safe}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
}
