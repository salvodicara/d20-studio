// B57 — Assisted procedural generators: pure domain (no DOM).
//
// Every generator returns a DRAFT: a plain object reproducible from its visible seed and
// options. Nothing here writes to the game; the explicit saves hand the draft to the area
// that owns the destination (B19 encounters, Preparation scenes, campaign World entries).
//
// Copied patterns (IDs from docs/interview/CAPABILITY_CENSUS.md and
// changes/interview-01/market-census/*.md):
// - Kobold+ Fight Club "Generate" (CMP-110, source observed 2026-09-24:
//   src/js/constants.js ENCOUNTER_TYPES, src/js/strategy.js DnD2024): the 2024 XP target
//   of the chosen difficulty × fudge factor 1.15, a random template of the chosen encounter
//   type (Random, Boss, Boss with minions, Duo, Trio, Horde), each group's share of the
//   target divided by its count, the nearest Challenge Rating by XP, a random monster of
//   that CR searched downwards then upwards, no monster twice, sorted by CR.
//   5e.tools "Adjust to <Difficulty>" (CMP-117): the same fill against a target band.
// - Fantasy Grounds random encounters (R20-112): each line's count is a dice expression
//   and `N*$PC` multiplies by the party size; Generate turns them into concrete numbers.
//   Kobold+ count ranges ("players-players*2") are written here as `$PC..2*$PC`.
// - donjon dungeon generator (CMP-137/138) and Watabou One Page Dungeon (CMP-140/141):
//   options (size, rooms, room size, corridors, doors, secret doors), a visible seed that
//   reproduces the map, reroll, numbered rooms with a key, labelled or unlabelled map.
// - Owlbear Rodeo Forecast (VTL-065): the map image is analysed and proposes walls; small
//   rooms may be missed, so every proposal is confirmed or discarded by the DM.
// - donjon towns, inns and demographics (CMP-105) drawn through the B25 random tables
//   engine (random-tables.mjs beginSession/rollAll/resolveFace), Foundry/Chartopia style.
//
// Rules baseline: D&D 2024 SRD 5.2.1 XP Budget per Character and XP by CR
// (srd-sample.mjs encounterBudget / XP_BY_CR, EN p. 202 / IT p. 230–231). The difficulty
// bands shown are B19's Kobold+ bands (CMP-106). Dungeon, town and name contents are
// original authored demo data, not SRD rules.

import * as srd from "./srd-sample.mjs";
import * as EB from "./encounter-builder-domain.mjs";
import * as RT from "./random-tables.mjs";
import * as content from "./campaign-content.mjs";
import { rollDie } from "./state.mjs";
import { catalogValueCp } from "./party-stash.mjs";

export const ID = "generators";
const L = (it, en) => ({ it, en });
const clone = (value) => structuredClone(value);
export const refuse = (it, en) => Object.assign(new Error(`${it} / ${en}`), { it, en });
const textOf = (value, lang = "it") =>
  value && typeof value === "object"
    ? (value[lang] ?? value.it ?? value.en ?? "")
    : String(value ?? "");

export const SOURCES = Object.freeze({
  kobold: { id: "CMP-110", title: "Kobold+ Fight Club · Generate (D&D 2024 strategy)" },
  adjust: { id: "CMP-117", title: "5e.tools encounter builder · Adjust to difficulty" },
  fg: { id: "R20-112", title: "Fantasy Grounds · random encounters, N*$PC" },
  donjon: { id: "CMP-137", title: "donjon · random dungeon generator (seed, options)" },
  watabou: { id: "CMP-140", title: "Watabou One Page Dungeon · reroll, seed" },
  forecast: { id: "VTL-065", title: "Owlbear Rodeo · Forecast wall/fog detection" },
  towns: { id: "CMP-105", title: "donjon · town, inn and demographics generators" },
  budget: srd.ENCOUNTER_BUDGET_SOURCE,
});

// ---------------------------------------------------------------- seeds

const SEED_WORDS = [
  "BRUMA",
  "LANTERNA",
  "GUADO",
  "NEBBIA",
  "CORVO",
  "TORRE",
  "PALUDE",
  "AIRONE",
  "CANNETO",
  "FARO",
];
/** Seeds are short visible words: upper case letters, digits and hyphens (Watabou, donjon). */
export function normalizeSeed(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}
export function requireSeed(value) {
  const seed = normalizeSeed(value);
  if (!seed)
    throw refuse(
      "Scrivi un seme: lettere e numeri, fino a 24 caratteri.",
      "Enter a seed: letters and digits, up to 24 characters.",
    );
  return seed;
}
/** A new seed from the app's one dice source (state.mjs rollDie). */
export function newSeed(roll = rollDie) {
  const word = SEED_WORDS[roll(SEED_WORDS.length) - 1];
  const digits = Array.from({ length: 4 }, () => roll(10) - 1).join("");
  return `${word}-${digits}`;
}
function hashText(text) {
  let hash = 2166136261;
  for (const char of text) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
/** Deterministic stream for a seed (mulberry32); `stream` keeps generators independent. */
export function randomFor(seed, stream = "") {
  let a = hashText(`${normalizeSeed(seed)}|${stream}`);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const between = (random, min, max) => min + Math.floor(random() * (max - min + 1));
export const pickFrom = (random, list) => list[Math.floor(random() * list.length)];
/** A die rolled from a seeded stream (the seed is the generation's visible source). */
export const seededDie = (random) => (sides) => 1 + Math.floor(random() * sides);

// ---------------------------------------------------------------- count expressions

// FG `N*$PC` and dice terms, plus the Kobold+ range `A..B` (uniform, as a single die).
const badCount = () =>
  refuse(
    "Quantità non valida: usa per esempio 3, 1d4+1, 2*$PC o $PC..2*$PC.",
    "Invalid count: use for example 3, 1d4+1, 2*$PC or $PC..2*$PC.",
  );
function parseSum(text) {
  const source = text.replace(/\s+/g, "");
  if (!source) throw badCount();
  const parts = source.match(/[+-]?[^+-]+/g);
  if (!parts || parts.join("") !== source) throw badCount();
  return parts.map((part) => {
    const sign = part.startsWith("-") ? -1 : 1;
    const body = part.replace(/^[+-]/, "");
    let m;
    if ((m = /^(\d*)d(\d+)$/i.exec(body))) {
      const count = Number(m[1] || 1);
      const sides = Number(m[2]);
      if (sign < 0 || count < 1 || count > 10 || sides < 2 || sides > 100) throw badCount();
      return { kind: "dice", count, sides };
    }
    if ((m = /^(\d+)\*\$PC$/i.exec(body)) || (m = /^\$PC\*(\d+)$/i.exec(body)))
      return { kind: "pc", factor: sign * Number(m[1]) };
    if (/^\$PC$/i.test(body)) return { kind: "pc", factor: sign };
    if (/^\d+$/.test(body)) return { kind: "const", value: sign * Number(body) };
    throw badCount();
  });
}
export function parseCount(text) {
  const source = String(text ?? "").trim();
  if (!source || source.length > 40) throw badCount();
  const pieces = source.split("..");
  if (pieces.length > 2) throw badCount();
  if (pieces.length === 1) return { text: source, range: null, terms: parseSum(pieces[0]) };
  const range = pieces.map(parseSum);
  if (range.flat().some((term) => term.kind === "dice")) throw badCount();
  return { text: source, range, terms: null };
}
/** The dice a count needs for a party of `pc` characters: {dice:[sides…], constant}. */
export function countDice(parsed, pc) {
  const fixed = (terms) =>
    terms.reduce(
      (sum, t) => sum + (t.kind === "const" ? t.value : t.kind === "pc" ? t.factor * pc : 0),
      0,
    );
  if (parsed.range) {
    let [low, high] = parsed.range.map(fixed);
    if (low > high) [low, high] = [high, low];
    return low === high
      ? { dice: [], constant: low }
      : { dice: [high - low + 1], constant: low - 1 };
  }
  return {
    dice: parsed.terms.flatMap((t) => (t.kind === "dice" ? Array(t.count).fill(t.sides) : [])),
    constant: fixed(parsed.terms),
  };
}
export function diceText(form) {
  const groups = new Map();
  for (const sides of form.dice) groups.set(sides, (groups.get(sides) ?? 0) + 1);
  const dice = [...groups].map(([sides, n]) => `${n}d${sides}`).join("+");
  if (!dice) return String(form.constant);
  return form.constant ? `${dice}${form.constant > 0 ? "+" : ""}${form.constant}` : dice;
}
/**
 * A Kobold+ range is one uniform die of any size (4–8 → d5+3). At the table a physical die
 * of that size may not exist: the smallest standard die rolled again above `sides` gives
 * the same odds. Null when the die is a standard one.
 */
export function physicalDieFor(sides) {
  if (RT.STANDARD_DICE.includes(sides)) return null;
  const die = RT.STANDARD_DICE.find((n) => n > sides);
  return die ? { die, rerollAbove: sides } : null;
}
export const MAX_COUNT = 20; // B19: at most 20 copies per row.
/** Count from faces (one per die, in order); clamped to 1–20 with a visible flag. */
export function countFromFaces(form, faces) {
  if (!Array.isArray(faces) || faces.length !== form.dice.length)
    throw refuse("Inserisci una faccia per ogni dado.", "Enter one face for each die.");
  faces.forEach((face, i) => {
    if (!Number.isInteger(face) || face < 1 || face > form.dice[i])
      throw refuse(
        `Il d${form.dice[i]} va da 1 a ${form.dice[i]}.`,
        `The d${form.dice[i]} goes from 1 to ${form.dice[i]}.`,
      );
  });
  const raw = faces.reduce((sum, face) => sum + face, form.constant);
  const count = Math.max(1, Math.min(MAX_COUNT, raw));
  return { count, raw, clamped: count !== raw };
}

// ---------------------------------------------------------------- encounters (Kobold+)

export const KOBOLD_FUDGE = 1.15; // Kobold+ DnD2024.fudge_factor
const group = (count, ratio = null, extra = {}) => ({ count: String(count), ratio, ...extra });
export const ENCOUNTER_TYPES = Object.freeze([
  {
    id: "random",
    label: L("Casuale", "Random"),
    samples: [
      [group(1, 1)],
      [group(1, 1 / 2), group(1, 1 / 2)],
      [group(1, 1 / 3), group(2, 2 / 3)],
      [group(1, 1 / 6), group(5, 5 / 6)],
      [group(1, 1 / 3), group(1, 1 / 3), group(1, 1 / 3)],
      [group(1, 1 / 4), group(1, 1 / 4), group(2, 2 / 4)],
      [group(1, 1 / 5), group(1, 1 / 5), group(3, 3 / 5)],
      [group(2, 1 / 2), group(2, 1 / 2)],
      [group(2, 2 / 6), group(4, 4 / 6)],
      [group(8, 1)],
    ],
  },
  { id: "boss", label: L("Boss", "Boss"), samples: [[group(1, 1)]] },
  {
    id: "boss-minions",
    label: L("Boss con seguaci", "Boss with minions"),
    samples: [
      [group(1, [0.5, 0.6], { leader: true }), group("$PC..2*$PC")],
      [group(1, [0.5, 0.6], { leader: true }), group("1..3", 0.25), group("$PC..2*$PC")],
    ],
  },
  {
    id: "duo",
    label: L("Coppia", "Duo"),
    samples: [
      [group(1, 0.5), group(1, 0.5)],
      [group(1, 0.6), group(1, 0.4)],
    ],
  },
  {
    id: "trio",
    label: L("Trio", "Trio"),
    samples: [
      [group(1, 0.33), group(1, 0.33), group(1, 0.33)],
      [group(1, 0.4), group(1, 0.3), group(1, 0.3)],
      [group(1, 0.5), group(1, 0.3), group(1, 0.2)],
    ],
  },
  {
    id: "horde",
    label: L("Orda", "Horde"),
    samples: [
      [group("2..4", [0.25, 0.35]), group("$PC+3..3*$PC", 0.2), group("$PC+3..3*$PC")],
      [group("2..$PC", [0.4, 0.6]), group("$PC+4..3*$PC")],
      [group("3*$PC..5*$PC", 1)],
    ],
  },
]);
export const DIFFICULTIES = srd.ENCOUNTER_DIFFICULTIES;
export const emptyEncounterFilters = () => ({ type: "", crMin: "", crMax: "" });

const crValueOf = (block) =>
  Number.isFinite(block?.crValue) ? block.crValue : srd.crToNumber(block?.cr);
/** Monster pool: SRD catalogue plus the DM's B19 custom blocks, with the Kobold+ filters. */
export function encounterPool(ebSlice, filters = {}) {
  return EB.pickerResults(ebSlice, { ...EB.emptyFilters(), ...filters, q: "", size: "" })
    .filter(({ block }) => EB.xpOfBlock(block) > 0 && Number.isFinite(crValueOf(block)))
    .map(({ ref, block, custom }) => ({ ref, block, custom, key: EB.blockKey(ref) }));
}
// Kobold+ getBestMonster + getMonstersFromCR: nearest CR by XP, then down, then up.
function bestMonster(pool, targetXp, taken, random) {
  const list = srd.XP_BY_CR;
  let index = list.length - 1;
  for (let i = 0; i < list.length - 1; i++)
    if (list[i + 1].xp > targetXp) {
      index = targetXp - list[i].xp < list[i + 1].xp - targetXp ? i : i + 1;
      break;
    }
  const at = (i) => pool.filter((m) => crValueOf(m.block) === list[i].value && !taken.has(m.key));
  let found = at(index);
  for (let i = index - 1; !found.length && i >= 0; i--) found = at(i);
  for (let i = index + 1; !found.length && i < list.length; i++) found = at(i);
  return found.length ? pickFrom(random, found) : null;
}
function rowFromPick(pick, extra) {
  return {
    ref: clone(pick.ref),
    key: pick.key,
    name: clone(pick.block.name),
    cr: String(pick.block.cr),
    crValue: crValueOf(pick.block),
    xp: EB.xpOfBlock(pick.block),
    custom: Boolean(pick.custom),
    ...extra,
  };
}
export function rateEncounterDraft(draft) {
  const xp = draft.rows.reduce((sum, row) => sum + row.xp * row.count, 0);
  return { xp, band: EB.bandFor(xp, draft.budget) };
}
function withRating(draft) {
  Object.assign(draft, rateEncounterDraft(draft));
  return draft;
}
/**
 * Kobold+ Generate on the 2024 budget. `levels` are the characters' levels (the budget and
 * `$PC`); `ebSlice` gives the DM's custom stat blocks. Returns a draft, never a saved row.
 */
export function generateEncounter({
  seed,
  levels,
  difficulty = "moderate",
  type = "random",
  filters = {},
  ebSlice = null,
  party = { mode: "campaign" },
}) {
  const clean = requireSeed(seed);
  if (!Array.isArray(levels) || !levels.length)
    throw refuse(
      "Serve almeno un personaggio per calcolare il budget.",
      "At least one character is needed for the budget.",
    );
  if (!DIFFICULTIES.includes(difficulty))
    throw refuse("Difficoltà non valida.", "Invalid difficulty.");
  const kind = ENCOUNTER_TYPES.find((t) => t.id === type);
  if (!kind) throw refuse("Tipo d’incontro non valido.", "Invalid encounter type.");
  const budget = srd.encounterBudget(levels);
  const target = budget[difficulty] * KOBOLD_FUDGE;
  const random = randomFor(clean, `encounter:${type}:${difficulty}`);
  const sample = Math.floor(random() * kind.samples.length);
  const pc = levels.length;
  const roll = seededDie(random);
  const groups = kind.samples[sample].map((g, index) => {
    const form = countDice(parseCount(g.count), pc);
    const faces = form.dice.map((sides) => roll(sides));
    const ratio = Array.isArray(g.ratio)
      ? g.ratio[0] + random() * (g.ratio[1] - g.ratio[0])
      : g.ratio;
    return {
      index,
      expr: g.count,
      form,
      faces,
      ratio,
      leader: g.leader === true,
      ...countFromFaces(form, faces),
    };
  });
  // A group without a share takes what the explicit shares leave (at least 10%).
  const explicit = groups.reduce((sum, g) => sum + (g.ratio ?? 0), 0);
  const open = groups.filter((g) => g.ratio === null);
  for (const g of open) g.ratio = Math.max(0.1, 1 - explicit) / open.length;
  const pool = encounterPool(ebSlice, filters);
  const taken = new Set();
  const rows = [];
  // Kobold+ fills the template from the last group to the first.
  for (const g of [...groups].reverse()) {
    const targetXp = (target * g.ratio) / g.count;
    const pick = bestMonster(pool, targetXp, taken, random);
    if (!pick)
      throw refuse(
        "Nessuna creatura adatta con questi filtri: allarga i filtri (Kobold+).",
        "No suitable monster with these filters: widen the filters (Kobold+).",
      );
    taken.add(pick.key);
    rows.push(
      rowFromPick(pick, {
        group: g.index,
        leader: g.leader,
        expr: g.expr,
        form: g.form,
        faces: g.faces,
        source: "seed",
        count: g.count,
        clamped: g.clamped,
        ratio: g.ratio,
        targetXp: Math.round(targetXp),
      }),
    );
  }
  rows.sort((a, b) => b.crValue - a.crValue || a.group - b.group);
  rows.forEach((row, i) => (row.id = `row-${i + 1}`));
  return withRating({
    kind: "encounter",
    seed: clean,
    options: { difficulty, type, filters: { ...emptyEncounterFilters(), ...filters } },
    party: clone(party),
    levels: [...levels],
    pc,
    budget,
    target: Math.round(target),
    sample,
    rows,
  });
}
function findRow(draft, rowId) {
  const row = draft.rows.find((r) => r.id === rowId);
  if (!row) throw refuse("Riga non trovata.", "Row not found.");
  return row;
}
/** The XP window of a target difficulty in B19's Kobold+ bands: [start, next band). */
export function bandWindow(budget, difficulty) {
  const next = { low: budget.moderate, moderate: budget.high, high: budget.high * 1.5 };
  return [budget[difficulty], next[difficulty]];
}
/**
 * 5e.tools "Adjust to <Difficulty>" (CMP-117) on a draft: adds a copy of the strongest
 * monster that still fits while the total is under the target band, removes a copy of the
 * strongest multiple while it is over.
 * Changed rows are marked "adjusted"; a new draft is returned with the number of steps.
 */
export function adjustEncounterDraft(draft) {
  const next = clone(draft);
  const [low, high] = bandWindow(next.budget, next.options.difficulty);
  let changed = 0;
  for (let guard = 0; guard < 80; guard++) {
    const { xp } = rateEncounterDraft(next);
    let pick = null;
    // Raising: the strongest monster whose extra copy still fits under the next band.
    if (xp < low)
      pick = next.rows
        .filter((r) => r.count < MAX_COUNT && xp + r.xp < high)
        .sort((a, b) => b.xp - a.xp)[0];
    else if (xp >= high) {
      const over = next.rows.filter((r) => r.count > 1).sort((a, b) => b.xp - a.xp);
      pick = over.find((r) => xp - r.xp >= low) ?? over.at(-1);
    }
    if (!pick) break;
    pick.count += xp < low ? 1 : -1;
    pick.source = "adjusted";
    pick.clamped = false;
    changed++;
  }
  withRating(next);
  if (!changed || next.band !== next.options.difficulty)
    throw refuse(
      "Non riesco a portarlo alla difficoltà scelta: cambia tipo, filtri o seme.",
      "It cannot reach the chosen difficulty: change the type, filters or seed.",
    );
  return next;
}
/**
 * Count corrections on a draft row (a new draft is returned):
 * manual value (DM discretion), digital dice (rollDie), physical faces, or a new
 * FG/Kobold+ expression rolled from the seed.
 */
export function editEncounterRow(draft, rowId, change, roll = rollDie) {
  const next = clone(draft);
  const row = findRow(next, rowId);
  if (change.mode === "manual") {
    const value = Number(change.value);
    if (!Number.isInteger(value) || value < 1 || value > MAX_COUNT)
      throw refuse("Da 1 a 20 copie per riga.", "From 1 to 20 copies per row.");
    Object.assign(row, { count: value, source: "manual", clamped: false });
  } else if (change.mode === "expr") {
    const form = countDice(parseCount(change.expr), next.pc);
    const random = randomFor(next.seed, `row:${row.id}:${change.expr}`);
    const faces = form.dice.map((sides) => seededDie(random)(sides));
    Object.assign(
      row,
      { expr: String(change.expr).trim(), form, faces, source: "seed" },
      countFromFaces(form, faces),
    );
  } else if (change.mode === "digital" || change.mode === "physical") {
    if (!row.form.dice.length)
      throw refuse("Questa quantità non ha dadi da tirare.", "This count has no dice to roll.");
    const faces =
      change.mode === "digital" ? row.form.dice.map((sides) => roll(sides)) : change.faces;
    Object.assign(row, { faces: [...faces], source: change.mode }, countFromFaces(row.form, faces));
  } else throw refuse("Modifica non valida.", "Invalid change.");
  return withRating(next);
}
export function removeEncounterRow(draft, rowId) {
  const next = clone(draft);
  findRow(next, rowId);
  next.rows = next.rows.filter((r) => r.id !== rowId);
  return withRating(next);
}
export function encounterSummary(draft, lang = "it") {
  const type = ENCOUNTER_TYPES.find((t) => t.id === draft.options.type);
  const band = srd.LABELS.encounterDifficulty[draft.options.difficulty];
  return lang === "it"
    ? `Generato: ${type.label.it} · obiettivo ${band.it} · seme ${draft.seed} (Kobold+ CMP-110, quantità FG R20-112).`
    : `Generated: ${type.label.en} · target ${band.en} · seed ${draft.seed} (Kobold+ CMP-110, FG counts R20-112).`;
}
export function defaultEncounterName(draft, lang = "it") {
  const type = ENCOUNTER_TYPES.find((t) => t.id === draft.options.type);
  const first = draft.rows[0];
  return `${textOf(type.label, lang)}: ${first ? textOf(first.name, lang) : "—"}`.slice(0, 100);
}
/**
 * B19 hand-off: a new encounter (party, rows, counts, summary) or rows appended to an
 * existing one. Uses only B19's own domain commands; returns the encounter id.
 */
export function saveEncounterDraft(
  ebSlice,
  draft,
  role,
  { name = "", lang = "it", into = null, campaignLevels = null } = {},
) {
  if (role !== "dm")
    throw refuse("Solo il DM prepara gli incontri.", "Only the DM prepares encounters.");
  if (!draft?.rows?.length) throw refuse("La bozza non ha creature.", "The draft has no monsters.");
  let encounter;
  if (into) encounter = EB.encounterById(ebSlice, into);
  else {
    encounter = EB.createEncounter(ebSlice, role, {
      name: String(name).trim() || defaultEncounterName(draft, lang),
      lang,
      id: EB.newId("enc-gen"),
    });
    // The party of the budget goes with the encounter, so B19 rates it the same: a typical
    // party, or the open encounter's party when it is not the campaign's own.
    const sorted = (levels) => JSON.stringify([...levels].sort((a, b) => a - b));
    const campaignParty =
      Array.isArray(campaignLevels) && sorted(campaignLevels) === sorted(draft.levels);
    if (draft.party?.mode === "custom" || (draft.party?.mode === "encounter" && !campaignParty))
      EB.setParty(ebSlice, role, encounter.id, { mode: "custom", levels: draft.levels });
    EB.setNotes(ebSlice, role, encounter.id, { summary: encounterSummary(draft, lang) });
  }
  for (const row of draft.rows) {
    const { row: added } = EB.addCreature(ebSlice, role, encounter.id, row.ref);
    if (row.count > 1) EB.changeCount(ebSlice, role, encounter.id, added.id, row.count - 1);
  }
  return encounter.id;
}

// ---------------------------------------------------------------- dungeons (donjon/Watabou)

export const CELL_PX = 50;
export const METERS_PER_CELL = 1.5;
export const DUNGEON_SIZES = Object.freeze({
  small: { cols: 24, rows: 16, rooms: 7, label: L("Piccolo", "Small") },
  medium: { cols: 32, rows: 20, rooms: 10, label: L("Medio", "Medium") },
  large: { cols: 40, rows: 26, rooms: 13, label: L("Grande", "Large") },
});
export const ROOM_DENSITY = Object.freeze({
  few: { factor: 0.6, label: L("Poche", "Few") },
  normal: { factor: 1, label: L("Normali", "Normal") },
  many: { factor: 1.35, label: L("Molte", "Many") },
});
export const ROOM_SIZES = Object.freeze({
  small: { range: [3, 5], label: L("Piccole", "Small") },
  medium: { range: [3, 7], label: L("Medie", "Medium") },
  large: { range: [4, 9], label: L("Grandi", "Large") },
});
export const CORRIDORS = Object.freeze({
  straight: L("Dritti", "Straight"),
  errant: L("Tortuosi", "Errant"),
});
export const DOORS = Object.freeze({
  none: L("Archi aperti", "Open arches"),
  basic: L("Porte chiuse", "Closed doors"),
  secure: L("Porte robuste (alcune a chiave)", "Secure doors (some locked)"),
});
export const defaultDungeonOptions = () => ({
  size: "medium",
  rooms: "normal",
  roomSize: "medium",
  corridors: "straight",
  loops: true,
  doors: "basic",
  secret: false,
  numbers: false,
  // PR-17: furniture and props by room type (Dungeon Alchemist), placed on save.
  furnish: true,
});
const DUNGEON_NAMES = [
  [
    L("Cripta", "Crypt"),
    L("Cantine", "Cellars"),
    L("Segrete", "Dungeons"),
    L("Rovine", "Ruins"),
    L("Tana", "Lair"),
  ],
  [
    L("della Lanterna", "of the Lantern"),
    L("del Guado", "of the Ford"),
    L("dell’Osservatorio", "under the Observatory"),
    L("di Bruma", "of Bruma"),
    L("dei Corvi", "of the Ravens"),
    L("della Palude", "of the Marsh"),
  ],
];
const ROOM_CONTENTS = [
  [40, "empty", L("Vuota", "Empty")],
  [25, "monster", L("Creature", "Monsters")],
  [15, "trap", L("Trappola", "Trap")],
  [10, "treasure", L("Tesoro nascosto", "Hidden treasure")],
  [10, "curio", L("Curiosità", "Curiosity")],
];
const ROOM_FEATURES = [
  L("colonne crollate", "collapsed pillars"),
  L("una pozza d’acqua ferma", "a pool of still water"),
  L("un altare spezzato", "a broken altar"),
  L("nicchie piene di ossa", "niches full of bones"),
  L("tappeti marciti", "rotten rugs"),
  L("funghi luminescenti", "glowing fungi"),
  L("graffiti sulle pareti", "graffiti on the walls"),
  L("botti sfondate", "stove-in barrels"),
  L("una lanterna spenta appesa al soffitto", "an unlit lantern hanging from the ceiling"),
  L("catene arrugginite", "rusted chains"),
];
const weighted = (random, rows) => {
  let roll = random() * rows.reduce((sum, [w]) => sum + w, 0);
  for (const row of rows) if ((roll -= row[0]) < 0) return row;
  return rows.at(-1);
};
const cellKey = (x, y) => `${x},${y}`;
/**
 * donjon/Watabou style rooms and corridors on a square grid. Regions: 0 rock, >0 room id,
 * -1 corridor. Walls separate different regions except where a corridor enters a room
 * (a door, or an open arch). Returns a draft with walls and doors in scene pixels.
 */
export function generateDungeon({ seed, ...input }) {
  const clean = requireSeed(seed);
  const options = { ...defaultDungeonOptions(), ...input };
  const size = DUNGEON_SIZES[options.size];
  const density = ROOM_DENSITY[options.rooms];
  const roomSize = ROOM_SIZES[options.roomSize];
  if (!size || !density || !roomSize || !CORRIDORS[options.corridors] || !DOORS[options.doors])
    throw refuse("Opzioni del dungeon non valide.", "Invalid dungeon options.");
  const random = randomFor(clean, "dungeon");
  const { cols, rows } = size;
  const region = Array.from({ length: rows }, () => Array(cols).fill(0));
  const target = Math.max(2, Math.round(size.rooms * density.factor));
  const [minSide, maxSide] = roomSize.range;
  const rooms = [];
  for (let attempt = 0; attempt < 600 && rooms.length < target; attempt++) {
    const w = between(random, minSide, maxSide);
    const h = between(random, minSide, Math.max(minSide, maxSide - 1));
    if (w > cols - 2 || h > rows - 2) continue;
    const x = between(random, 1, cols - w - 1);
    const y = between(random, 1, rows - h - 1);
    // One cell of rock and one of corridor between rooms (donjon keeps rooms apart).
    if (
      rooms.some(
        (o) => x < o.x + o.w + 2 && o.x < x + w + 2 && y < o.y + o.h + 2 && o.y < y + h + 2,
      )
    )
      continue;
    rooms.push({ x, y, w, h });
  }
  if (rooms.length < 2)
    throw refuse(
      "Non c’è spazio per due stanze: scegli stanze più piccole o un dungeon più grande.",
      "There is no room for two rooms: choose smaller rooms or a larger dungeon.",
    );
  rooms.sort((a, b) => a.y - b.y || a.x - b.x);
  rooms.forEach((room, i) => {
    room.id = i + 1;
    for (let y = room.y; y < room.y + room.h; y++)
      for (let x = room.x; x < room.x + room.w; x++) region[y][x] = room.id;
  });
  const center = (room) => ({
    x: room.x + Math.floor(room.w / 2),
    y: room.y + Math.floor(room.h / 2),
  });
  const distance = (a, b) => {
    const p = center(a),
      q = center(b);
    return Math.abs(p.x - q.x) + Math.abs(p.y - q.y);
  };
  // Minimum spanning tree between room centres (Prim), then a few loops (donjon "loops").
  const edges = [];
  const joined = new Set([0]);
  while (joined.size < rooms.length) {
    let best = null;
    for (const i of joined)
      for (let j = 0; j < rooms.length; j++)
        if (!joined.has(j)) {
          const d = distance(rooms[i], rooms[j]);
          if (!best || d < best.d) best = { i, j, d };
        }
    edges.push([best.i, best.j]);
    joined.add(best.j);
  }
  if (options.loops) {
    const extra = Math.max(1, Math.ceil(rooms.length / 4));
    let added = 0;
    for (let i = 0; i < rooms.length && added < extra; i++) {
      const others = rooms
        .map((_, j) => j)
        .filter(
          (j) => j !== i && !edges.some(([a, b]) => (a === i && b === j) || (a === j && b === i)),
        )
        .sort((a, b) => distance(rooms[i], rooms[a]) - distance(rooms[i], rooms[b]));
      if (others.length && random() < 0.45) {
        edges.push([i, others[0]]);
        added++;
      }
    }
  }
  const inside = (room) => ({
    x: between(random, room.x, room.x + room.w - 1),
    y: between(random, room.y, room.y + room.h - 1),
  });
  const steps = [];
  const carve = (from, to) => {
    const horizontalFirst = random() < 0.5;
    const corner = horizontalFirst ? { x: to.x, y: from.y } : { x: from.x, y: to.y };
    let at = { ...from };
    for (const goal of [corner, to])
      while (at.x !== goal.x || at.y !== goal.y) {
        const next = {
          x: at.x + Math.sign(goal.x - at.x),
          y: at.x !== goal.x ? at.y : at.y + Math.sign(goal.y - at.y),
        };
        steps.push([at, next]);
        if (region[next.y][next.x] === 0) region[next.y][next.x] = -1;
        at = next;
      }
  };
  for (const [i, j] of edges) {
    const a = inside(rooms[i]);
    const b = inside(rooms[j]);
    const via =
      options.corridors === "errant"
        ? [
            {
              x: Math.max(
                1,
                Math.min(cols - 2, between(random, Math.min(a.x, b.x) - 3, Math.max(a.x, b.x) + 3)),
              ),
              y: Math.max(
                1,
                Math.min(rows - 2, between(random, Math.min(a.y, b.y) - 3, Math.max(a.y, b.y) + 3)),
              ),
            },
          ]
        : [];
    const points = [a, ...via, b];
    for (let k = 0; k < points.length - 1; k++) carve(points[k], points[k + 1]);
  }
  const at = (x, y) => (x < 0 || y < 0 || x >= cols || y >= rows ? 0 : region[y][x]);
  // An edge between cells (x1,y1)-(x2,y2): "h:y:x" on grid line y, "v:x:y" on grid line x.
  const edgeOf = (p, q) =>
    p.y !== q.y ? `h:${Math.max(p.y, q.y)}:${p.x}` : `v:${Math.max(p.x, q.x)}:${p.y}`;
  const openings = new Map();
  for (const [p, q] of steps) {
    const a = at(p.x, p.y),
      b = at(q.x, q.y);
    if (a !== b && a !== 0 && b !== 0) {
      const key = edgeOf(p, q);
      if (!openings.has(key)) openings.set(key, { key, rooms: [a, b].filter((v) => v > 0) });
    }
  }
  const wallEdges = { h: new Map(), v: new Map() };
  const addEdge = (key) => {
    const [axis, line, pos] = key.split(":");
    const lines = wallEdges[axis];
    if (!lines.has(Number(line))) lines.set(Number(line), new Set());
    lines.get(Number(line)).add(Number(pos));
  };
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const here = region[y][x];
      if (!here) continue;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const there = at(x + dx, y + dy);
        if (there === here) continue;
        const key = edgeOf({ x, y }, { x: x + dx, y: y + dy });
        if (there !== 0 && openings.has(key)) continue;
        addEdge(key);
      }
    }
  const prefix = `gen-${clean.toLowerCase()}`;
  const source = {
    kind: "authored-demo",
    revision: `generator-dungeon-${clean}`,
    title: "Procedural dungeon (B57, donjon/Watabou pattern)",
  };
  const barrier = (id, a, b, extra = {}) => ({
    id,
    kind: "wall",
    a,
    b,
    blocksMovement: true,
    blocksSight: true,
    blocksEffect: true,
    secret: false,
    source: { ...source },
    ...extra,
  });
  const walls = [];
  for (const axis of ["h", "v"])
    for (const [line, set] of [...wallEdges[axis]].sort((a, b) => a[0] - b[0])) {
      const positions = [...set].sort((a, b) => a - b);
      let start = positions[0];
      for (let k = 0; k < positions.length; k++) {
        const end = positions[k];
        if (positions[k + 1] === end + 1) continue;
        const a =
          axis === "h"
            ? { x: start * CELL_PX, y: line * CELL_PX }
            : { x: line * CELL_PX, y: start * CELL_PX };
        const b =
          axis === "h"
            ? { x: (end + 1) * CELL_PX, y: line * CELL_PX }
            : { x: line * CELL_PX, y: (end + 1) * CELL_PX };
        walls.push(barrier(`${prefix}-w${walls.length + 1}`, a, b));
        start = positions[k + 1];
      }
    }
  const doors = [];
  const arches = [];
  for (const opening of [...openings.values()].sort((a, b) => a.key.localeCompare(b.key))) {
    const [axis, line, pos] = opening.key.split(":").map((v, i) => (i ? Number(v) : v));
    const a =
      axis === "h"
        ? { x: pos * CELL_PX, y: line * CELL_PX }
        : { x: line * CELL_PX, y: pos * CELL_PX };
    const b =
      axis === "h"
        ? { x: (pos + 1) * CELL_PX, y: line * CELL_PX }
        : { x: line * CELL_PX, y: (pos + 1) * CELL_PX };
    if (options.doors === "none") {
      arches.push({ a, b, rooms: opening.rooms });
      continue;
    }
    const locked = options.doors === "secure" && random() < 0.3;
    const secret = options.secret && !opening.rooms.includes(1) && random() < 0.2;
    doors.push(
      barrier(`${prefix}-d${doors.length + 1}`, a, b, {
        kind: "door",
        secret,
        doorState: locked ? "locked" : "closed",
        playerOperable: true,
        interactionRangeMeters: METERS_PER_CELL,
        rooms: opening.rooms,
      }),
    );
  }
  const roomKey = rooms.map((room) => {
    const exits = [...openings.values()].filter((o) => o.rooms.includes(room.id)).length;
    if (room.id === 1)
      return {
        ...room,
        exits,
        content: "entrance",
        contentLabel: L("Ingresso", "Entrance"),
        feature: L("una scala che sale in superficie", "stairs up to the surface"),
      };
    const [, content, contentLabel] = weighted(random, ROOM_CONTENTS);
    return { ...room, exits, content, contentLabel, feature: pickFrom(random, ROOM_FEATURES) };
  });
  const name = {
    it: `${pickFrom(random, DUNGEON_NAMES[0]).it}`,
    en: "",
  };
  const suffix = pickFrom(random, DUNGEON_NAMES[1]);
  const noun = DUNGEON_NAMES[0].find((n) => n.it === name.it);
  name.it = `${noun.it} ${suffix.it}`;
  name.en = `${noun.en} ${suffix.en}`;
  return {
    kind: "dungeon",
    seed: clean,
    options,
    name,
    cols,
    rows,
    cell: CELL_PX,
    width: cols * CELL_PX,
    height: rows * CELL_PX,
    region,
    rooms: roomKey,
    walls,
    doors,
    arches,
    corridorCells: region.flat().filter((v) => v === -1).length,
  };
}
export function dungeonStats(dungeon) {
  return {
    rooms: dungeon.rooms.length,
    walls: dungeon.walls.length,
    doors: dungeon.doors.length,
    locked: dungeon.doors.filter((d) => d.doorState === "locked").length,
    secret: dungeon.doors.filter((d) => d.secret).length,
    arches: dungeon.arches.length,
  };
}
const meters = (cells, lang) =>
  new Intl.NumberFormat(lang === "it" ? "it-IT" : "en-GB", { maximumFractionDigits: 1 }).format(
    cells * METERS_PER_CELL,
  );
// ---------------------------------------------------------------- furnishing (PR-17)

// Dungeon Alchemist auto-furnish: each room gets furniture and props that fit its content,
// drawn from the scene-object stickers (scene-assets-art.mjs ids) and placed on free floor
// cells, reproducible from the seed. A trap stays a DM-only marker. Authored demo content.
const FURNISHING = Object.freeze({
  entrance: [["lantern"], ["crate"]],
  monster: [["bedroll"], ["bedroll"], ["campfire"], ["crate", "barrel"]],
  trap: [["trap"], ["rock"]],
  treasure: [["chest"], ["barrel", "crate"]],
  curio: [["table"], ["lantern"], ["crate"]],
  empty: [
    ["barrel", "crate", "rock"],
    ["barrel", "crate", "rock"],
  ],
});
const STICKER_NAMES = Object.freeze({
  lantern: L("Lanterna", "Lantern"),
  crate: L("Cassa", "Crate"),
  barrel: L("Barile", "Barrel"),
  bedroll: L("Giaciglio", "Bedroll"),
  campfire: L("Fuoco da campo", "Campfire"),
  trap: L("Trappola", "Trap"),
  rock: L("Macerie", "Rubble"),
  chest: L("Forziere", "Chest"),
  table: L("Tavolo", "Table"),
});
export function furnishDungeon(dungeon) {
  const random = randomFor(dungeon.seed, "furnish");
  const c = dungeon.cell;
  const doorCells = new Set(
    [...dungeon.doors, ...dungeon.arches].map((d) =>
      cellKey(Math.floor((d.a.x + d.b.x) / 2 / c), Math.floor((d.a.y + d.b.y) / 2 / c)),
    ),
  );
  const props = [];
  for (const room of dungeon.rooms) {
    const list = FURNISHING[room.content] ?? FURNISHING.empty;
    // Free floor cells, away from the walls when the room is large enough.
    const inset = room.w > 2 && room.h > 2 ? 1 : 0;
    const cells = [];
    for (let y = room.y + inset; y < room.y + room.h - inset; y++)
      for (let x = room.x + inset; x < room.x + room.w - inset; x++)
        if (!doorCells.has(cellKey(x, y))) cells.push([x, y]);
    const count = room.content === "empty" ? Math.floor(random() * 3) : list.length;
    for (let i = 0; i < count && cells.length; i++) {
      const choices = list[i % list.length];
      const sticker = pickFrom(random, choices);
      const [x, y] = cells.splice(Math.floor(random() * cells.length), 1)[0];
      props.push({
        room: room.id,
        sticker,
        name: clone(STICKER_NAMES[sticker] ?? L(sticker, sticker)),
        x: x * c + c / 2,
        y: y * c + c / 2,
        hidden: sticker === "trap",
      });
    }
    // An empty room still shows it has been furnished: at least one piece of rubble.
    if (room.content === "empty" && !props.some((p) => p.room === room.id) && cells.length) {
      const [x, y] = cells[Math.floor(random() * cells.length)];
      props.push({
        room: room.id,
        sticker: "rock",
        name: clone(STICKER_NAMES.rock),
        x: x * c + c / 2,
        y: y * c + c / 2,
        hidden: false,
      });
    }
  }
  return props;
}

// ---------------------------------------------------------------- treasure by CR (PR-55)

// AideDD / donjon treasure generators: individual treasure per creature or a hoard, by
// Challenge Rating band, with magic items of the band's rarities. The dice are this demo's
// own authored tables in that model, NOT an SRD table; item values follow the SRD's
// Magic Item Rarities and Values (EN 206 / IT 234, via the catalogue).
export const TREASURE_SOURCE = Object.freeze({
  kind: "authored",
  revision: "treasure-by-cr-1",
  title: L(
    "Tesoro per GS della dimostrazione (modello AideDD/donjon, non SRD)",
    "Demo treasure by CR (AideDD/donjon model, not SRD)",
  ),
});
export const TREASURE_BANDS = Object.freeze([
  {
    id: "0-4",
    max: 4,
    individual: { count: 3, sides: 6, times: 1, coin: "gp" },
    hoard: { count: 2, sides: 4, times: 100, coin: "gp" },
    items: { sides: 4, minus: 1 },
    rarities: ["common", "uncommon"],
  },
  {
    id: "5-10",
    max: 10,
    individual: { count: 2, sides: 8, times: 10, coin: "gp" },
    hoard: { count: 8, sides: 10, times: 100, coin: "gp" },
    items: { sides: 3, minus: 0 },
    rarities: ["uncommon", "rare"],
  },
  {
    id: "11-16",
    max: 16,
    individual: { count: 2, sides: 10, times: 10, coin: "pp" },
    hoard: { count: 8, sides: 8, times: 1000, coin: "gp" },
    items: { sides: 4, minus: 0 },
    rarities: ["rare", "very-rare"],
  },
  {
    id: "17+",
    max: 30,
    individual: { count: 2, sides: 8, times: 100, coin: "pp" },
    hoard: { count: 6, sides: 10, times: 10000, coin: "gp" },
    items: { sides: 6, minus: 0 },
    rarities: ["very-rare", "legendary"],
  },
]);
export const TREASURE_CRS = Object.freeze(srd.XP_BY_CR.map((row) => row.cr));
const RARITY_ORDER = ["common", "uncommon", "rare", "very-rare", "legendary"];
const COIN_CP = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 };
function crValue(cr) {
  const text = String(cr ?? "").trim();
  const value = text.includes("/")
    ? Number(text.split("/")[0]) / Number(text.split("/")[1])
    : Number(text);
  if (!TREASURE_CRS.includes(text) || !Number.isFinite(value))
    throw refuse("Scegli un GS da 0 a 30.", "Choose a CR from 0 to 30.");
  return value;
}
export function generateTreasure({ seed, cr = "3", mode = "hoard", count = 1 }) {
  const clean = requireSeed(seed);
  const value = crValue(cr);
  const band = TREASURE_BANDS.find((b) => value <= b.max);
  const kind = mode === "individual" ? "individual" : "hoard";
  const random = randomFor(clean, `treasure:${cr}:${kind}`);
  const die = seededDie(random);
  const rolls = [];
  const roll = (label, n, sides) => {
    const values = Array.from({ length: n }, () => die(sides));
    const total = values.reduce((a, b) => a + b, 0);
    rolls.push({ label, dice: `${n}d${sides}`, values, total });
    return total;
  };
  const coins = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
  const items = [];
  let fallback = false;
  const creatures = kind === "individual" ? Math.max(1, Math.min(20, Number(count) || 1)) : 1;
  if (kind === "individual")
    for (let i = 0; i < creatures; i++) {
      const t = band.individual;
      coins[t.coin] +=
        roll(L(`Creatura ${i + 1}`, `Creature ${i + 1}`), t.count, t.sides) * t.times;
    }
  else {
    const t = band.hoard;
    coins[t.coin] += roll(L("Monete del gruzzolo", "Hoard coins"), t.count, t.sides) * t.times;
    const wanted = Math.max(
      0,
      roll(L("Oggetti magici", "Magic items"), 1, band.items.sides) - band.items.minus,
    );
    const catalogue = srd.ITEMS.filter(
      (entry) => entry.category === "magic-item" && RARITY_ORDER.includes(entry.magic?.rarity),
    );
    let pool = catalogue.filter((entry) => band.rarities.includes(entry.magic.rarity));
    if (!pool.length) {
      // The prototype catalogue lacks the band's rarities: the rarest available stands in.
      const best = Math.max(...catalogue.map((e) => RARITY_ORDER.indexOf(e.magic.rarity)));
      pool = catalogue.filter((e) => RARITY_ORDER.indexOf(e.magic.rarity) === best);
      fallback = pool.length > 0;
    }
    for (let i = 0; i < wanted && pool.length; i++) {
      const entry = pickFrom(random, pool);
      items.push({
        srdId: entry.id,
        name: clone(entry.name),
        rarity: entry.magic.rarity,
        valueCp: catalogValueCp(entry),
      });
    }
  }
  const valueCp =
    Object.entries(coins).reduce((sum, [coin, n]) => sum + n * COIN_CP[coin], 0) +
    items.reduce((sum, item) => sum + (item.valueCp ?? 0), 0);
  return {
    kind: "treasure",
    seed: clean,
    cr: String(cr),
    band: band.id,
    mode: kind,
    count: creatures,
    coins,
    items,
    rolls,
    valueCp,
    fallback,
    source: clone(TREASURE_SOURCE),
  };
}

/** The numbered room key (donjon) as DM notes in one language. */
export function dungeonKey(dungeon, lang = "it") {
  const it = lang === "it";
  const head = it
    ? `Generato con seme ${dungeon.seed} (stanze e corridoi, donjon/Watabou CMP-137/140). Numeri solo per il DM.`
    : `Generated with seed ${dungeon.seed} (rooms and corridors, donjon/Watabou CMP-137/140). Numbers are for the DM only.`;
  const lines = dungeon.rooms.map(
    (room) =>
      `${room.id}. ${textOf(room.contentLabel, lang)} — ${room.w}×${room.h} ${it ? "celle" : "cells"} (${meters(room.w, lang)}×${meters(room.h, lang)} m), ${room.exits} ${it ? (room.exits === 1 ? "uscita" : "uscite") : room.exits === 1 ? "exit" : "exits"}. ${textOf(room.feature, lang).replace(/^./, (c) => c.toUpperCase())}.`,
  );
  return [head, ...lines].join("\n");
}
/**
 * The scene draft for Preparation's editor (existing scene model: walls + doors,
 * authored-demo source). `background` is an optional PNG data URL rendered by the UI.
 */
export function dungeonScene(dungeon, { id, lang = "it", name = "", background = null } = {}) {
  return {
    id:
      id ??
      `gen-dungeon-${dungeon.seed.toLowerCase()}-${globalThis.crypto.randomUUID().slice(0, 6)}`,
    name: (String(name).trim() || textOf(dungeon.name, lang)).slice(0, 100),
    description: dungeonKey(dungeon, lang),
    publicDescription: "",
    template: "blank",
    width: dungeon.width,
    height: dungeon.height,
    gridSize: CELL_PX,
    metersPerCell: METERS_PER_CELL,
    gridOffsetX: 0,
    gridOffsetY: 0,
    gridVisible: true,
    gridSnap: true,
    background,
    imageName: background ? `dungeon-${dungeon.seed.toLowerCase()}.png` : "",
    imageWidth: background ? dungeon.width : 0,
    imageHeight: background ? dungeon.height : 0,
    tokens: [],
    walls: [...dungeon.walls, ...dungeon.doors].map(({ rooms, ...wall }) => clone(wall)),
    terrain: [],
    revealed: false,
  };
}

// ---------------------------------------------------------------- wall detection (Forecast)

/** Mean luminance per block of an RGBA image (0–255, Rec. 709 weights). */
export function lumaBlocks(data, width, height, block) {
  const cols = Math.floor(width / block);
  const rows = Math.floor(height / block);
  const values = new Float32Array(cols * rows);
  const step = Math.max(1, Math.floor(block / 5));
  for (let by = 0; by < rows; by++)
    for (let bx = 0; bx < cols; bx++) {
      let sum = 0,
        n = 0;
      for (let y = by * block; y < (by + 1) * block; y += step)
        for (let x = bx * block; x < (bx + 1) * block; x += step) {
          const i = (y * width + x) * 4;
          sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          n++;
        }
      values[by * cols + bx] = n ? sum / n : 0;
    }
  return { cols, rows, block, values };
}
/** Otsu's threshold on the block luminances (automatic split between floor and rock). */
export function otsuThreshold(values) {
  const histogram = new Array(256).fill(0);
  for (const v of values) histogram[Math.max(0, Math.min(255, Math.round(v)))]++;
  const total = values.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];
  let back = 0,
    weight = 0,
    best = 0,
    threshold = 128;
  for (let i = 0; i < 256; i++) {
    weight += histogram[i];
    if (!weight) continue;
    const front = total - weight;
    if (!front) break;
    back += i * histogram[i];
    const meanBack = back / weight;
    const meanFront = (sum - back) / front;
    const between = weight * front * (meanBack - meanFront) ** 2;
    if (between > best) {
      best = between;
      threshold = i + 0.5;
    }
  }
  return threshold;
}
const overlapLength = (a0, a1, b0, b1) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
/** Whether an axis-aligned proposal is already covered (≥ half) by an existing barrier. */
function coveredByExisting(proposal, existing) {
  const horizontal = proposal.a.y === proposal.b.y;
  const [p0, p1] = horizontal
    ? [Math.min(proposal.a.x, proposal.b.x), Math.max(proposal.a.x, proposal.b.x)]
    : [Math.min(proposal.a.y, proposal.b.y), Math.max(proposal.a.y, proposal.b.y)];
  const covered = (existing ?? []).reduce((sum, wall) => {
    const sameLine = horizontal
      ? Math.abs(wall.a.y - proposal.a.y) <= 2 && Math.abs(wall.b.y - proposal.a.y) <= 2
      : Math.abs(wall.a.x - proposal.a.x) <= 2 && Math.abs(wall.b.x - proposal.a.x) <= 2;
    if (!sameLine) return sum;
    const [w0, w1] = horizontal
      ? [Math.min(wall.a.x, wall.b.x), Math.max(wall.a.x, wall.b.x)]
      : [Math.min(wall.a.y, wall.b.y), Math.max(wall.a.y, wall.b.y)];
    return sum + overlapLength(p0, p1, w0, w1);
  }, 0);
  return covered >= (p1 - p0) / 2;
}
/**
 * Proposed walls on the boundaries between light (floor) and dark (rock/wall) blocks,
 * merged into straight axis-aligned runs of at least `minBlocks` blocks. Coordinates are in
 * scene pixels (`scale` = scene px per image px). Ids are stable for the same geometry, so a
 * decision survives a new analysis that finds the same wall.
 */
export function detectWalls(grid, { threshold, minBlocks = 2, scale = 1, existing = [] } = {}) {
  const { cols, rows, block, values } = grid;
  const t = Number.isFinite(threshold) ? threshold : otsuThreshold(values);
  const floor = (x, y) => values[y * cols + x] >= t;
  const runs = [];
  const collect = (axis, line, count, differs) => {
    let start = null;
    for (let k = 0; k <= count; k++) {
      const edge = k < count && differs(k);
      if (edge && start === null) start = k;
      if (!edge && start !== null) {
        if (k - start >= minBlocks) runs.push({ axis, line, start, end: k });
        start = null;
      }
    }
  };
  for (let y = 1; y < rows; y++) collect("h", y, cols, (x) => floor(x, y - 1) !== floor(x, y));
  for (let x = 1; x < cols; x++) collect("v", x, rows, (y) => floor(x - 1, y) !== floor(x, y));
  const px = (v) => Math.round(v * block * scale * 100) / 100;
  return runs.map((run, i) => {
    const a =
      run.axis === "h"
        ? { x: px(run.start), y: px(run.line) }
        : { x: px(run.line), y: px(run.start) };
    const b =
      run.axis === "h" ? { x: px(run.end), y: px(run.line) } : { x: px(run.line), y: px(run.end) };
    const proposal = {
      id: `p-${run.axis}-${a.x}-${a.y}-${b.x}-${b.y}`,
      index: i + 1,
      axis: run.axis,
      a,
      b,
      length: Math.hypot(b.x - a.x, b.y - a.y),
    };
    proposal.existing = coveredByExisting(proposal, existing);
    return proposal;
  });
}
/** Confirmed proposals as scene walls (the existing wall model, authored-demo source). */
export function proposalsToWalls(proposals, decisions, sceneId) {
  return proposals
    .filter((p) => !p.existing && decisions[p.id] === "accepted")
    .map((p) => ({
      id: `det-${sceneId}-${p.id}`.slice(0, 120),
      kind: "wall",
      a: { ...p.a },
      b: { ...p.b },
      blocksMovement: true,
      blocksSight: true,
      blocksEffect: true,
      secret: false,
      source: {
        kind: "authored-demo",
        revision: `generator-detected-${p.id}`,
        title: "Wall proposal confirmed by the DM (B57, Forecast pattern)",
      },
    }));
}

// ---------------------------------------------------------------- towns, inns, names

const row = (id, text, weight = 1) => ({
  id,
  text,
  weight,
  drawn: false,
  subtableId: null,
  values: {},
  cells: {},
});
const table = (id, name, rows) => ({
  id,
  name,
  origin: "authored-demo",
  sides: rows.reduce((sum, r) => sum + r.weight, 0),
  replacement: true,
  playersCanUse: false,
  variables: [],
  mainColumn: null,
  columns: [],
  results: rows,
});
const rowsOf = (prefix, pairs) => pairs.map(([it, en], i) => row(`${prefix}-${i + 1}`, L(it, en)));
// Original synthetic content for "Le lanterne di Bruma" (not SRD, not donjon text).
export const GENERATOR_TABLES = Object.freeze([
  table(
    "gen-inn-first",
    L("Generatore · Locanda: primo nome", "Generator · Inn: first name"),
    rowsOf("inn-first", [
      ["Il Grifone", "The Griffin"],
      ["La Lanterna", "The Lantern"],
      ["Il Corvo", "The Raven"],
      ["La Rana", "The Frog"],
      ["Il Cinghiale", "The Boar"],
      ["La Botte", "The Barrel"],
      ["L’Airone", "The Heron"],
      ["Il Guado", "The Ford"],
      ["La Civetta", "The Owl"],
      ["Il Fanale", "The Beacon"],
      ["La Chiatta", "The Barge"],
      ["Il Mulino", "The Mill"],
    ]),
  ),
  table(
    "gen-inn-second",
    L("Generatore · Locanda: secondo nome", "Generator · Inn: second name"),
    rowsOf("inn-second", [
      ["la Nebbia", "the Fog"],
      ["il Pescatore", "the Fisher"],
      ["la Campana", "the Bell"],
      ["il Salice", "the Willow"],
      ["la Luna", "the Moon"],
      ["il Barcaiolo", "the Boatman"],
      ["la Canna", "the Reed"],
      ["il Lupo", "the Wolf"],
    ]),
  ),
  table(
    "gen-inn-keeper",
    L("Generatore · Locanda: oste", "Generator · Inn: innkeeper"),
    rowsOf("inn-keeper", [
      ["ex guardia con una gamba di legno", "former guard with a wooden leg"],
      ["vedova che non dimentica un debito", "widow who never forgets a debt"],
      ["gnomo che colleziona lanterne", "gnome who collects lanterns"],
      ["mezzorco che canta mentre cucina", "half-orc who sings while cooking"],
      ["gemelli che litigano su tutto", "twins who argue about everything"],
      ["halfling sospettoso verso i forestieri", "halfling wary of strangers"],
      ["ex barcaiolo con mille storie", "former boatman with a thousand stories"],
      ["nana che tiene un registro di ogni ospite", "dwarf who keeps a ledger of every guest"],
    ]),
  ),
  table(
    "gen-inn-special",
    L("Generatore · Locanda: specialità", "Generator · Inn: speciality"),
    rowsOf("inn-special", [
      ["zuppa d’anguilla", "eel soup"],
      ["sidro di mele selvatiche", "wild apple cider"],
      ["pane nero con miele di brughiera", "black bread with heather honey"],
      ["stufato di rana piccante", "spicy frog stew"],
      ["birra scura del guado", "dark ford ale"],
      ["pesce affumicato sulle canne", "fish smoked over reeds"],
      ["vino caldo con chiodi di garofano", "mulled wine with cloves"],
      ["torta di castagne", "chestnut pie"],
    ]),
  ),
  table(
    "gen-inn-patrons",
    L("Generatore · Locanda: clientela", "Generator · Inn: patrons"),
    rowsOf("inn-patrons", [
      ["barcaioli del guado", "boatmen from the ford"],
      ["pellegrini infreddoliti", "chilled pilgrims"],
      ["guardie fuori servizio", "off-duty guards"],
      ["mercanti di sale e corde", "salt and rope merchants"],
      ["cacciatori di anguille", "eel hunters"],
      ["studiosi diretti all’osservatorio", "scholars bound for the observatory"],
    ]),
  ),
  table(
    "gen-inn-quirk",
    L("Generatore · Locanda: particolarità", "Generator · Inn: quirk"),
    rowsOf("inn-quirk", [
      [
        "una lanterna che non si spegne mai sopra il bancone",
        "a lantern above the bar that never goes out",
      ],
      ["le stanze si pagano in racconti", "rooms are paid for with stories"],
      ["un corvo parlante sulla trave", "a talking raven on the beam"],
      ["la cantina si allaga con la luna piena", "the cellar floods at full moon"],
      [
        "un tavolo riservato a un ospite che non arriva mai",
        "a table kept for a guest who never comes",
      ],
      ["il pavimento pende verso il fiume", "the floor slopes towards the river"],
    ]),
  ),
  table(
    "gen-given-names",
    L("Generatore · Nomi propri", "Generator · Given names"),
    rowsOf(
      "given",
      [
        "Aldo",
        "Brina",
        "Corrado",
        "Dalia",
        "Elmo",
        "Fiora",
        "Gualtiero",
        "Ilde",
        "Lapo",
        "Mirta",
        "Nevio",
        "Ottavia",
        "Pia",
        "Rinaldo",
        "Selva",
        "Tebaldo",
        "Ugo",
        "Vanna",
        "Zeno",
        "Orsola",
      ].map((n) => [n, n]),
    ),
  ),
  table(
    "gen-family-names",
    L("Generatore · Cognomi", "Generator · Family names"),
    rowsOf(
      "family",
      [
        "del Guado",
        "Brumavecchia",
        "Lanternari",
        "Cordaio",
        "da Palude",
        "Corvino",
        "Salici",
        "Torrenera",
        "Anguillara",
        "Canneti",
        "Farolfi",
        "Nebbioli",
      ].map((n) => [n, n]),
    ),
  ),
  table(
    "gen-npc-role",
    L("Generatore · Ruolo di un PNG", "Generator · NPC role"),
    rowsOf("npc-role", [
      ["fabbro", "blacksmith"],
      ["guaritrice", "healer"],
      ["capo dei barcaioli", "head of the boatmen"],
      ["sacerdote del faro", "priest of the lighthouse"],
      ["mercante di sale", "salt merchant"],
      ["cacciatrice di taglie", "bounty hunter"],
      ["archivista dell’osservatorio", "observatory archivist"],
      ["contrabbandiere", "smuggler"],
    ]),
  ),
  table(
    "gen-town-name",
    L("Generatore · Nome del centro abitato", "Generator · Settlement name"),
    rowsOf("town-name", [
      ["Acquanera", "Blackwater"],
      ["Pontegrigio", "Greybridge"],
      ["Salicevecchio", "Oldwillow"],
      ["Fossalupo", "Wolfditch"],
      ["Campolume", "Lightfield"],
      ["Torrebassa", "Lowtower"],
      ["Canneto", "Reedmere"],
      ["Guadorotto", "Brokenford"],
    ]),
  ),
  table(
    "gen-town-size",
    L("Generatore · Dimensione del centro abitato", "Generator · Settlement size"),
    [
      row("town-size-hamlet", L("Borgo", "Hamlet"), 2),
      row("town-size-village", L("Villaggio", "Village"), 2),
      row("town-size-town", L("Cittadina", "Small town"), 1),
      row("town-size-market", L("Città mercato", "Market town"), 1),
    ],
  ),
  table(
    "gen-town-feature",
    L("Generatore · Tratto del centro abitato", "Generator · Settlement feature"),
    rowsOf("town-feature", [
      ["un ponte di pietra sul fiume", "a stone bridge over the river"],
      ["mura di legno annerite", "blackened wooden walls"],
      ["un mercato ogni luna nuova", "a market every new moon"],
      ["case su palafitte", "houses on stilts"],
      ["un faro spento da anni", "a lighthouse dark for years"],
      ["un mulino ad acqua che non si ferma", "a watermill that never stops"],
      ["campane in ogni torre", "bells in every tower"],
      ["un cimitero sull’isolotto", "a graveyard on the islet"],
    ]),
  ),
  table(
    "gen-town-power",
    L("Generatore · Chi comanda", "Generator · Who rules"),
    rowsOf("town-power", [
      ["un consiglio di pescatori", "a council of fishers"],
      ["la badessa del faro", "the abbess of the lighthouse"],
      ["un capitano della guardia", "a captain of the guard"],
      ["la gilda del sale", "the salt guild"],
      ["un anziano che nessuno contraddice", "an elder nobody contradicts"],
      ["nessuno, e si vede", "nobody, and it shows"],
    ]),
  ),
  table(
    "gen-town-trouble",
    L("Generatore · Guaio attuale", "Generator · Current trouble"),
    rowsOf("town-trouble", [
      ["i pozzi sono salati da una settimana", "the wells have been salty for a week"],
      ["una pattuglia goblin taglieggia i barcaioli", "a goblin patrol extorts the boatmen"],
      ["le campane suonano da sole di notte", "the bells ring by themselves at night"],
      ["il guado è impraticabile per il gelo", "the ford is impassable with frost"],
      ["qualcuno ruba le lanterne dalle case", "someone steals lanterns from the houses"],
      [
        "un mercante è sparito con i risparmi di tutti",
        "a merchant vanished with everyone’s savings",
      ],
    ]),
  ),
]);
// donjon-style demographics (authored demo ranges, not a rule): population by size.
export const TOWN_SIZES = Object.freeze({
  "town-size-hamlet": { population: [20, 80], inns: 1 },
  "town-size-village": { population: [81, 400], inns: 1 },
  "town-size-town": { population: [401, 1500], inns: 2 },
  "town-size-market": { population: [1501, 5000], inns: 4 },
});
export const RUMOUR_TABLE = "lantern-rumours"; // B25 seed table "Voci alla Lanterna"

/** Tables the draws use: this area's, replaced by same-id copies the DM keeps in B25. */
export function drawSlice(rtSlice) {
  const own = rtSlice?.tables ?? [];
  const ids = new Set(own.map((t) => t.id));
  return {
    tables: [...GENERATOR_TABLES.filter((t) => !ids.has(t.id)).map(clone), ...clone(own)],
    templates: [],
  };
}
export const installedTables = (rtSlice) =>
  GENERATOR_TABLES.filter((t) => (rtSlice?.tables ?? []).some((own) => own.id === t.id)).map(
    (t) => t.id,
  );
/** Copies the generator tables into B25's collection so the DM can edit them there. */
export function installGeneratorTables(rtSlice, role) {
  if (role !== "dm") throw refuse("Solo il DM modifica le tabelle.", "Only the DM edits tables.");
  let added = 0;
  for (const t of GENERATOR_TABLES)
    if (!rtSlice.tables.some((own) => own.id === t.id)) {
      rtSlice.tables.push(clone(t));
      added++;
    }
  return added;
}
/** One B25 draw: digital from the seed stream, or a physical face typed by the DM. */
export function drawStep(slice, tableId, { roll = rollDie, face = null, mode = "digital" } = {}) {
  const session = RT.beginSession(slice, { kind: "table", tableId }, "it");
  if (face !== null) {
    const outcome = RT.resolveFace(slice, session, Number(face), "physical");
    if (outcome.status !== "accepted")
      throw refuse("Questa faccia non corrisponde a una voce.", "This face matches no result.");
  } else RT.rollAll(slice, session, roll);
  const step = session.steps.find((s) => s.parent === null);
  return {
    tableId,
    tableName: clone(step.tableName),
    sides: step.sides,
    face: step.face,
    mode: face !== null ? "physical" : mode,
    resultId: step.resultId,
    text: { it: RT.sessionText(session, "it"), en: RT.sessionText(session, "en") },
  };
}
const FIELD_LABELS = {
  name: L("Nome", "Name"),
  keeper: L("Oste", "Innkeeper"),
  special: L("Specialità", "Speciality"),
  patrons: L("Clientela", "Patrons"),
  quirk: L("Particolarità", "Quirk"),
  rumour: L("Voce che gira", "Rumour"),
  size: L("Dimensione", "Size"),
  feature: L("Tratto", "Feature"),
  power: L("Chi comanda", "Who rules"),
  trouble: L("Guaio attuale", "Current trouble"),
  npc: L("PNG di spicco", "Notable NPC"),
  inn: L("Locanda", "Inn"),
};
const FIELDS = {
  inn: [
    ["name", "inn-name", ["gen-inn-first", "gen-inn-second"]],
    ["keeper", "person-role", ["gen-given-names", "gen-family-names", "gen-inn-keeper"]],
    ["special", "plain", ["gen-inn-special"]],
    ["patrons", "plain", ["gen-inn-patrons"]],
    ["quirk", "plain", ["gen-inn-quirk"]],
    ["rumour", "plain", [RUMOUR_TABLE]],
  ],
  town: [
    ["name", "plain", ["gen-town-name"]],
    ["size", "size", ["gen-town-size"]],
    ["feature", "plain", ["gen-town-feature"]],
    ["power", "plain", ["gen-town-power"]],
    ["trouble", "plain", ["gen-town-trouble"]],
    ["npc", "person-role", ["gen-given-names", "gen-family-names", "gen-npc-role"]],
    ["inn", "inn-name", ["gen-inn-first", "gen-inn-second"]],
  ],
};
export const NAME_COUNT = 8;
function population(seed, fieldId, resultId) {
  const range = TOWN_SIZES[resultId]?.population;
  if (!range) return null;
  return between(randomFor(seed, `population:${fieldId}:${resultId}`), range[0], range[1]);
}
/** The text of a field from its steps (or the DM's own edit). */
export function composeField(field, seed) {
  if (field.missing) return L("—", "—");
  const [a, b, c] = field.steps.map((s) => s.text);
  const both = (make) => ({ it: make("it"), en: make("en") });
  switch (field.compose) {
    case "inn-name":
      return both((lang) => `${a[lang]} ${lang === "it" ? "e" : "and"} ${b[lang]}`);
    case "person":
      return both((lang) => `${a[lang]} ${b[lang]}`);
    case "person-role":
      return both((lang) => `${a[lang]} ${b[lang]}, ${c[lang]}`);
    case "size": {
      const people = population(seed, field.id, field.steps[0].resultId);
      const format = (lang) =>
        new Intl.NumberFormat(lang === "it" ? "it-IT" : "en-GB").format(people ?? 0);
      return both((lang) =>
        people === null
          ? a[lang]
          : `${a[lang]} · ${format(lang)} ${lang === "it" ? "abitanti" : "inhabitants"}`,
      );
    }
    default:
      return clone(a);
  }
}
function makeField(slice, seed, id, compose, tableIds, roll) {
  const field = {
    id,
    label: clone(FIELD_LABELS[id] ?? L(id, id)),
    compose,
    tables: [...tableIds],
    edited: null,
  };
  if (tableIds.some((t) => !RT.getTable(slice, t))) {
    field.missing = tableIds.filter((t) => !RT.getTable(slice, t));
    field.steps = [];
  } else field.steps = tableIds.map((tableId) => drawStep(slice, tableId, { roll, mode: "seed" }));
  field.value = composeField(field, seed);
  return field;
}
/** donjon-like inn, town or list of names drawn through the B25 tables engine. */
export function generateSettlement(kind, { seed, rtSlice = null }) {
  const clean = requireSeed(seed);
  const slice = drawSlice(rtSlice);
  const random = randomFor(clean, `settlement:${kind}`);
  const roll = seededDie(random);
  let fields;
  if (kind === "names")
    fields = Array.from({ length: NAME_COUNT }, (_, i) => {
      const field = makeField(
        slice,
        clean,
        `name-${i + 1}`,
        "person",
        ["gen-given-names", "gen-family-names"],
        roll,
      );
      field.label = L(`Nome ${i + 1}`, `Name ${i + 1}`);
      return field;
    });
  else if (FIELDS[kind])
    fields = FIELDS[kind].map(([id, compose, tables]) =>
      makeField(slice, clean, id, compose, tables, roll),
    );
  else throw refuse("Generatore non valido.", "Invalid generator.");
  return { kind, seed: clean, fields, selected: kind === "names" ? fields.map((f) => f.id) : [] };
}
function fieldOf(draft, fieldId) {
  const field = draft.fields.find((f) => f.id === fieldId);
  if (!field) throw refuse("Voce non trovata.", "Field not found.");
  return field;
}
/**
 * Corrections on a settlement draft: a physical face (or a digital reroll with rollDie) for
 * one step, or the DM's own text. A new draft is returned.
 */
export function editSettlementField(draft, rtSlice, fieldId, change, roll = rollDie) {
  const next = clone(draft);
  const field = fieldOf(next, fieldId);
  if (change.mode === "text") {
    const text = String(change.text ?? "").trim();
    if (text.length > 200) throw refuse("Al massimo 200 caratteri.", "At most 200 characters.");
    field.edited = text || null;
    return next;
  }
  const index = Number(change.step);
  const step = field.steps[index];
  if (!step) throw refuse("Tiro non trovato.", "Roll not found.");
  if (!["physical", "digital"].includes(change.mode))
    throw refuse("Modifica non valida.", "Invalid change.");
  const slice = drawSlice(rtSlice);
  field.steps[index] =
    change.mode === "physical"
      ? drawStep(slice, step.tableId, { face: change.face })
      : drawStep(slice, step.tableId, { roll, mode: "digital" });
  field.value = composeField(field, next.seed);
  field.edited = null;
  return next;
}
export const fieldText = (field, lang = "it") => field.edited ?? textOf(field.value, lang);
export function toggleName(draft, fieldId, selected) {
  const next = clone(draft);
  fieldOf(next, fieldId);
  next.selected = selected
    ? [...new Set([...next.selected, fieldId])]
    : next.selected.filter((id) => id !== fieldId);
  return next;
}
/** World entries a settlement draft becomes: one place, or one person per chosen name. */
export function settlementEntries(draft, lang = "it") {
  const it = lang === "it";
  const origin = it
    ? `Generato con seme ${draft.seed} tramite le tabelle casuali (donjon CMP-105, motore B25).`
    : `Generated with seed ${draft.seed} through the random tables (donjon CMP-105, B25 engine).`;
  if (draft.kind === "names")
    return draft.fields
      .filter((f) => draft.selected.includes(f.id))
      .map((f) => ({ title: fieldText(f, lang), body: origin, worldType: "person" }));
  const [name, ...rest] = draft.fields;
  const lines = rest
    .filter((f) => !f.missing)
    .map((f) => `${textOf(f.label, lang)}: ${fieldText(f, lang)}`);
  const kindLine =
    draft.kind === "inn" ? (it ? "Locanda." : "Inn.") : it ? "Centro abitato." : "Settlement.";
  return [
    {
      title: fieldText(name, lang),
      body: [kindLine, ...lines, "", origin].join("\n"),
      worldType: "place",
    },
  ];
}
export const WORLD_ACCESS = Object.freeze({
  dms: L("Io e i DM", "Me and the DMs"),
  campaign: L("Gruppo della campagna", "Campaign group"),
  private: L("Solo io", "Only me"),
});
/**
 * Campaign World entries through the campaign content API (draft → review → apply), the
 * same path B25 uses for the journal. Returns the new entry ids and the commit options.
 */
export function saveWorldEntries(
  state,
  entries,
  access,
  viewer,
  { online = true, prefix = "gen" } = {},
) {
  if (viewer !== "dm")
    throw refuse("Solo il DM salva i generatori.", "Only the DM saves generators.");
  if (!entries.length)
    throw refuse("Scegli almeno una voce da salvare.", "Choose at least one entry to save.");
  if (!Object.hasOwn(WORLD_ACCESS, access)) throw refuse("Accesso non valido.", "Invalid access.");
  const ids = [];
  let commit = null;
  for (const [i, entry] of entries.entries()) {
    const draftId = `${prefix}-${i + 1}`;
    content.createCampaignDraft(
      state,
      { id: draftId, kind: "world", campaignId: state.campaign.id },
      viewer,
    );
    const current = content.getCampaignDraft(state, draftId, viewer);
    content.saveCampaignDraft(
      state,
      draftId,
      {
        data: {
          ...current.data,
          title: entry.title.slice(0, 120),
          body: entry.body,
          worldType: entry.worldType,
        },
        access: { mode: access, grants: [] },
      },
      viewer,
    );
    const preview = content.previewCampaignDraft(state, draftId, viewer);
    if (!preview.canApply) throw refuse(preview.errors[0].it, preview.errors[0].en);
    commit = preview.commit;
    ids.push(
      content.applyCampaignDraft(state, draftId, { reviewKey: preview.reviewKey }, viewer, {
        online,
      }).entryId,
    );
  }
  return { ids, commit };
}
