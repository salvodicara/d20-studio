// B25 — Random tables and decks (PR-57…PR-62). Entry module registered by extensions.mjs.
//
// Copied patterns (source IDs from docs/interview/CAPABILITY_CENSUS.md and
// changes/interview-01/market-census/*.md):
// - Foundry Roll Tables (FVT-097): weights, Normalize (formula 1d<total weight>, contiguous
//   ranges), draw with or without replacement with a drawn mark and Reset, "Draw This
//   Result" (here: Choose entry), subtable results drawn recursively, rerolls when a face
//   lands on an unavailable result (Foundry retries up to 100 times).
// - Chartopia (CMP-129…133): ranges implied by the rows (here from weights), input
//   variables shown before rolling with the author's first value as default (an "Any"
//   value exists only when the author adds it), values propagated by variable name to
//   linked subcharts, a text filter on chosen columns (filter / filter_cols), a roll
//   history with notes.
// - Fantasy Grounds tables (R20-115): multi-column rows with a column choice for the
//   output; a result has an output target (chat, story/journal, parcel, encounter); story
//   templates (R20-116) with [Table] references and Generate.
// - Better Rolltables (FVT-098): loot into an actor with a quantity; broken references
//   highlighted. Owlbear Tables+ (VTL-092): multi-column tables, share result, last results.
// - Roll20 rollable tables (R20-104): "players can use" and a multi-sided token whose sides
//   are the table entries (random or chosen side), moved by dragging like any token and
//   hidden from players on request. Decks live in decks.mjs (FVT-099, R20-105/149, VTL-098).
//
// Dice: digital faces come from state.mjs rollDie (the one dice source of the app); a
// physical face is typed and validated; "Choose entry" is recorded as a choice, never as a
// roll (F-043: Draw, Enter physical roll and Choose entry stay distinct). A result changes
// nothing in the game until someone sends it to chat, journal, loot or an encounter.

import { rollDie } from "./state.mjs";
// R8 CA-88: «Copia in un’altra campagna…» from a saved table's or deck's own actions (C5).
import { canCopyToCampaign, copyToCampaign } from "./ui.mjs";
import * as content from "./campaign-content.mjs";
import * as media from "./media-domain.mjs";
import { addTableLoot } from "./loot.mjs";
import * as encounters from "./encounter-builder-domain.mjs";
import { uiState as encounterUi } from "./encounter-builder.mjs";
import * as chat from "./chat-domain.mjs";
import {
  seedDecks,
  normalizeDeck,
  renderDeckPanel,
  bindDeckPanel,
  renderDeckEditor,
  bindDeckEditor,
  renderHandSection,
  deckDraft,
  applyDeckDraft,
  deleteDeck,
  deckRecipients,
  ownsActor,
  refuse,
  visibleDecks,
  deckShown,
  deckCommitOptions,
  cardsText,
} from "./decks.mjs";

export const ID = "random-tables";
export const HISTORY = "random-tables-history";
export const ANY = "any";
// Route tabs that open the Table drawer on one of its tabs (notifications, player search).
export const ROUTE_TAB = { tables: `${ID}-tables`, decks: `${ID}-decks` };
const LOOT_SLICE = "loot";
const ENCOUNTER_SLICE = encounters.ID;
const L = (it, en) => ({ it, en });
const clone = (value) => structuredClone(value);
const arr = (value) => (Array.isArray(value) ? value : []);
const now = () => new Date().toISOString();
const newId = (prefix) => `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
export const labelIn = (value, lang = "it") =>
  typeof value === "object" && value
    ? value[lang] || value.it || value.en || ""
    : String(value ?? "");
const namesOf = (value) =>
  (typeof value === "object" && value ? [value.it, value.en] : [value])
    .filter((name) => typeof name === "string" && name.trim())
    .map((name) => name.trim().toLowerCase());
const slug = (text) =>
  String(text ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "v";

export const STANDARD_DICE = Object.freeze([4, 6, 8, 10, 12, 20, 100]);
export const LIMITS = Object.freeze({
  name: 80,
  text: 300,
  rows: 100,
  weight: 100,
  sides: 1000,
  variables: 4,
  options: 12,
  optionText: 40,
  templateText: 2000,
  note: 500,
  depth: 4,
  rerolls: 100,
  history: 300,
  columns: 4,
  filter: 40,
});

// ---------------------------------------------------------------------------------------
// Synthetic, original demo content for the campaign "Le lanterne di Bruma".

const SEASON = {
  id: "season",
  name: L("Stagione", "Season"),
  // The author put "Any" first (Chartopia: the first value is the default).
  any: true,
  options: [
    { value: "spring", label: L("Primavera", "Spring") },
    { value: "summer", label: L("Estate", "Summer") },
    { value: "autumn", label: L("Autunno", "Autumn") },
    { value: "winter", label: L("Inverno", "Winter") },
  ],
};
const row = (id, weight, text, extra = {}) => ({
  id,
  text,
  weight,
  drawn: false,
  subtableId: null,
  values: {},
  cells: {},
  ...extra,
});
// A multi-column row (FG / Tables+): the first column is the row text, the others cells.
const traveller = (id, who, wants, knows) =>
  row(`traveller-${id}`, 1, who, { cells: { wants, knows } });
export function seedTables() {
  const tables = [
    {
      id: "swamp-encounters",
      name: L("Incontri nella palude", "Swamp encounters"),
      origin: "authored-demo",
      sides: 8,
      replacement: false,
      playersCanUse: false,
      variables: [clone(SEASON)],
      results: [
        row(
          "swamp-fog",
          2,
          L("Nebbia fitta: si vede a pochi passi", "Thick fog: you see a few paces ahead"),
        ),
        row(
          "swamp-heron",
          1,
          L(
            "Un airone immobile osserva il gruppo dalle canne",
            "A motionless heron watches the party from the reeds",
          ),
        ),
        row("swamp-patrol", 2, L("Pattuglia di goblin", "Goblin patrol"), {
          subtableId: "patrol-strength",
        }),
        row(
          "swamp-lantern",
          1,
          L(
            "Una lanterna spenta galleggia tra le canne",
            "An unlit lantern floats among the reeds",
          ),
        ),
        row("swamp-ice", 1, L("Ghiaccio sottile sulle pozze", "Thin ice over the pools"), {
          values: { season: "winter" },
        }),
        row("swamp-midges", 1, L("Sciame di zanzare al tramonto", "A swarm of midges at dusk"), {
          values: { season: "summer" },
        }),
      ],
    },
    {
      id: "patrol-strength",
      name: L("Consistenza della pattuglia", "Patrol strength"),
      origin: "authored-demo",
      sides: 4,
      replacement: true,
      playersCanUse: false,
      variables: [],
      results: [
        row("patrol-two", 1, L("due esploratori goblin", "two goblin scouts")),
        row("patrol-three", 2, L("tre goblin e un lupo", "three goblins and a wolf")),
        row("patrol-five", 1, L("cinque goblin guidati da un capo", "five goblins led by a boss")),
      ],
    },
    {
      id: "lantern-rumours",
      name: L("Voci alla Lanterna", "Rumours at the Lantern"),
      origin: "authored-demo",
      sides: 6,
      replacement: true,
      playersCanUse: true,
      variables: [],
      results: [
        row(
          "rumour-keeper",
          1,
          L(
            "Il guardiano dell’osservatorio non si vede da tre notti.",
            "The observatory keeper has not been seen for three nights.",
          ),
        ),
        row(
          "rumour-lights",
          1,
          L(
            "Qualcuno accende lanterne nella palude dopo mezzanotte.",
            "Someone lights lanterns in the marsh after midnight.",
          ),
        ),
        row(
          "rumour-coins",
          1,
          L("I goblin pagano in monete antiche.", "The goblins pay in old coins."),
        ),
        row(
          "rumour-ford",
          1,
          L("Il guado a nord cede con il gelo.", "The northern ford gives way in frost."),
        ),
        row(
          "rumour-map",
          1,
          L(
            "Una mappa del vecchio osservatorio circola al mercato.",
            "A map of the old observatory is sold at the market.",
          ),
        ),
        row(
          "rumour-bells",
          1,
          L("Le campane di Bruma hanno suonato da sole.", "The bells of Bruma rang by themselves."),
        ),
      ],
    },
    {
      id: "marsh-weather",
      name: L("Meteo sulla palude", "Marsh weather"),
      origin: "authored-demo",
      sides: 4,
      replacement: true,
      playersCanUse: false,
      variables: [],
      results: [
        row("weather-mist", 1, L("Nebbia bassa", "Low mist")),
        row("weather-drizzle", 1, L("Pioggia fine", "Drizzle")),
        row("weather-wind", 1, L("Vento freddo", "Cold wind")),
        row("weather-clear", 1, L("Cielo terso", "Clear sky")),
      ],
    },
    {
      // Multi-column table (FG R20-115, Tables+ VTL-092): one roll picks a row; the result
      // shows every column or only the chosen one.
      id: "ford-travellers",
      name: L("Viandanti al guado", "Travellers at the ford"),
      origin: "authored-demo",
      sides: 6,
      replacement: true,
      playersCanUse: false,
      variables: [],
      mainColumn: L("Chi", "Who"),
      columns: [
        { id: "wants", name: L("Cosa vuole", "Wants") },
        { id: "knows", name: L("Cosa sa", "Knows") },
      ],
      results: [
        traveller(
          "eel",
          L("Una pescatrice di anguille", "An eel fisher"),
          L("scambiare pesce con sale", "to trade fish for salt"),
          L("il guado a nord cede con il gelo", "the northern ford gives way in frost"),
        ),
        traveller(
          "boy",
          L("Un ragazzo con una lanterna spenta", "A boy with an unlit lantern"),
          L("ritrovare il fratello", "to find his brother"),
          L("luci nella palude dopo mezzanotte", "lights in the marsh after midnight"),
        ),
        traveller(
          "rope",
          L("Un mercante di corde", "A rope merchant"),
          L("compagnia fino a Bruma", "company as far as Bruma"),
          L("i goblin pagano in monete antiche", "the goblins pay in old coins"),
        ),
        traveller(
          "guard",
          L("Una guardia in congedo", "A guard on leave"),
          L("un passaggio sul carro", "a ride on the cart"),
          L("il guardiano dell’osservatorio è sparito", "the observatory keeper has disappeared"),
        ),
        traveller(
          "pilgrims",
          L("Due pellegrini infreddoliti", "Two chilled pilgrims"),
          L("un fuoco per la notte", "a fire for the night"),
          L("le campane di Bruma hanno suonato da sole", "the bells of Bruma rang by themselves"),
        ),
        traveller(
          "raven",
          L("Un vecchio con un corvo", "An old man with a raven"),
          L("nulla, per ora", "nothing, for now"),
          L(
            "i goblin hanno una mappa dell’osservatorio",
            "the goblins have a map of the observatory",
          ),
        ),
      ],
    },
  ];
  return tables.map((table) => ({ mainColumn: null, columns: [], ...table }));
}
export function seedTemplates() {
  return [
    {
      id: "marsh-hook",
      name: L("Spunto per la palude", "Marsh hook"),
      origin: "authored-demo",
      text: L(
        "Lungo il guado: [Incontri nella palude]. Più tardi, alla locanda, qualcuno sussurra: «[Voci alla Lanterna]»",
        "Along the ford: [Swamp encounters]. Later, at the inn, someone whispers: “[Rumours at the Lantern]”",
      ),
    },
  ];
}
export function seedSlice() {
  return {
    tables: seedTables(),
    templates: seedTemplates(),
    decks: seedDecks(),
    tokens: [],
    applied: [],
  };
}

// Tolerant readers: saved data keeps its values; malformed entries are dropped.
const isText = (value) =>
  typeof value === "string" ||
  (Boolean(value) && typeof value === "object" && !Array.isArray(value));
function normalizeTableShape(table) {
  if (!table || typeof table.id !== "string") return null;
  const variables = arr(table.variables)
    .filter((v) => v && typeof v.id === "string")
    .map((v) => ({
      id: v.id,
      name: v.name ?? v.id,
      // Saved before the "any" flag existed: those variables had "Any" first.
      any: v.any !== false,
      options: arr(v.options).filter((o) => o && typeof o.value === "string" && o.value !== ANY),
    }));
  const columns = arr(table.columns)
    .filter((c) => c && typeof c.id === "string" && isText(c.name))
    .slice(0, LIMITS.columns)
    .map((c) => ({ id: c.id, name: c.name }));
  return {
    id: table.id,
    name: table.name ?? table.id,
    origin: table.origin ?? "user",
    sides: Number.isInteger(table.sides) && table.sides > 0 ? table.sides : 1,
    replacement: table.replacement !== false,
    playersCanUse: table.playersCanUse === true,
    variables,
    mainColumn: isText(table.mainColumn) ? table.mainColumn : null,
    columns,
    results: arr(table.results)
      .filter((r) => r && typeof r.id === "string")
      .map((r) => ({
        id: r.id,
        text: r.text ?? "",
        weight: Number.isInteger(r.weight) && r.weight > 0 ? r.weight : 1,
        drawn: r.drawn === true,
        subtableId: typeof r.subtableId === "string" ? r.subtableId : null,
        values: r.values && typeof r.values === "object" ? { ...r.values } : {},
        cells: Object.fromEntries(
          columns.filter((c) => isText(r.cells?.[c.id])).map((c) => [c.id, r.cells[c.id]]),
        ),
      })),
  };
}
export function normalizeSlice(slice, fromVersion) {
  if (fromVersion > 1) throw Error("Saved random tables come from a newer version");
  return {
    tables: arr(slice?.tables).map(normalizeTableShape).filter(Boolean),
    templates: arr(slice?.templates).filter((t) => t && typeof t.id === "string"),
    decks: arr(slice?.decks).map(normalizeDeck).filter(Boolean),
    tokens: arr(slice?.tokens)
      .filter((t) => t && typeof t.id === "string" && Number.isFinite(t.x) && Number.isFinite(t.y))
      .map((t) => ({ ...t, hidden: t.hidden === true })),
    applied: arr(slice?.applied).filter((id) => typeof id === "string"),
  };
}
export function normalizeHistory(slice, fromVersion) {
  if (fromVersion > 1) throw Error("Saved draw history comes from a newer version");
  return {
    entries: arr(slice?.entries).filter(
      (e) => e && typeof e.id === "string" && Array.isArray(e.steps) && Array.isArray(e.visibleTo),
    ),
  };
}

// ---------------------------------------------------------------------------------------
// Tables: implied ranges, normalization, variables and faces.

export const getTable = (slice, id) => slice.tables.find((table) => table.id === id) ?? null;
export const getTemplate = (slice, id) =>
  slice.templates.find((template) => template.id === id) ?? null;

/** Ranges implied by the weights, in row order (Chartopia implied ranges, CMP-129). */
export function impliedRanges(table) {
  let next = 1;
  return table.results.map((result) => {
    const from = next;
    next += result.weight;
    return { id: result.id, from, to: next - 1 };
  });
}
export const rangeText = (range) =>
  range.from === range.to ? String(range.from) : `${range.from}–${range.to}`;

/** Whether the die covers exactly the weights (Foundry: normalized). */
export function tableStatus(table) {
  const ranges = impliedRanges(table);
  const total = ranges.length ? ranges.at(-1).to : 0;
  return {
    total,
    sides: table.sides,
    normalized: total === table.sides,
    unreachable: ranges.filter((r) => r.from > table.sides).map((r) => r.id),
    partial: ranges.filter((r) => r.from <= table.sides && r.to > table.sides).map((r) => r.id),
    uncovered: total < table.sides ? { from: total + 1, to: table.sides } : null,
  };
}
/** Foundry "Normalize": the formula becomes 1d<total weight>; ranges stay contiguous. */
export function normalizeTable(table) {
  const { total } = tableStatus(table);
  if (!total) throw refuse("Aggiungi almeno una voce.", "Add at least one result.");
  if (total > LIMITS.sides)
    throw refuse(`I pesi superano ${LIMITS.sides}.`, `Weights exceed ${LIMITS.sides}.`);
  table.sides = total;
  return table;
}

/**
 * The value a variable filters with (Chartopia input variables, CMP-132). Without a choice
 * it is the author's first value ("Any" only when the author put it first). A value that
 * arrives by name from a parent table but is not one of this table's values filters
 * nothing here.
 */
export function variableValue(variable, variables) {
  const given = variables && Object.hasOwn(variables, variable.id);
  const chosen = given ? variables[variable.id] : undefined;
  if (chosen === ANY) return ANY;
  if (given) return variable.options.some((o) => o.value === chosen) ? chosen : ANY;
  return variable.any ? ANY : (variable.options[0]?.value ?? ANY);
}
/** Chartopia filter: a row matches when it is for any value or for the chosen one. */
export function rowMatches(table, result, variables = {}) {
  return table.variables.every((variable) => {
    const chosen = variableValue(variable, variables);
    const value = result.values?.[variable.id] ?? ANY;
    return chosen === ANY || value === ANY || value === chosen;
  });
}
/** A cell of a row: "main" is the row text, otherwise a column id. */
export const cellOf = (result, column) =>
  column === "main" ? result.text : (result.cells?.[column] ?? "");
/**
 * Chartopia filter / filter_cols (CMP-131): a row qualifies when the text appears in the
 * chosen column ("all" = any column), in either language, ignoring case.
 */
export function textMatches(table, result, filter) {
  const key = String(filter?.text ?? "")
    .trim()
    .toLowerCase();
  if (!key) return true;
  const columns =
    !filter.column || filter.column === "all"
      ? ["main", ...table.columns.map((c) => c.id)]
      : [filter.column];
  return columns.some((column) =>
    namesOf(cellOf(result, column)).some((text) => text.includes(key)),
  );
}
export function availableRows(table, variables = {}, taken = new Set(), filter = null) {
  const ranges = impliedRanges(table);
  return table.results.filter(
    (result, i) =>
      ranges[i].from <= table.sides &&
      rowMatches(table, result, variables) &&
      textMatches(table, result, filter) &&
      (table.replacement || (!result.drawn && !taken.has(result.id))),
  );
}
/** The row a face lands on, or why it cannot be used (then the face is rolled again). */
export function faceOutcome(table, face, variables = {}, taken = new Set(), filter = null) {
  const range = impliedRanges(table).find((r) => face >= r.from && face <= r.to);
  if (!range) return { row: null, reason: "none" };
  const result = table.results.find((r) => r.id === range.id);
  if (!rowMatches(table, result, variables))
    return { row: null, reason: "filtered", rowId: result.id };
  if (!textMatches(table, result, filter)) return { row: null, reason: "text", rowId: result.id };
  if (!table.replacement && (result.drawn || taken.has(result.id)))
    return { row: null, reason: "drawn", rowId: result.id };
  return { row: result, reason: "ok" };
}
/** A table and every subtable it can reach. */
export function reachableTables(slice, tableId, seen = new Set()) {
  const table = getTable(slice, tableId);
  if (!table || seen.has(tableId)) return seen;
  seen.add(tableId);
  for (const result of table.results)
    if (result.subtableId) reachableTables(slice, result.subtableId, seen);
  return seen;
}
/** Variables of the tables a draw can touch, once per id (values propagate, CMP-132). */
export function sourceVariables(slice, tableIds) {
  const seen = new Map();
  for (const root of tableIds)
    for (const id of reachableTables(slice, root))
      for (const variable of getTable(slice, id)?.variables ?? [])
        if (!seen.has(variable.id)) seen.set(variable.id, variable);
  return [...seen.values()];
}

// ---------------------------------------------------------------------------------------
// Templates (FG story templates, R20-116): text with [Table name] references.

export function parseTemplate(text) {
  const source = String(text ?? "");
  const parts = [];
  let last = 0;
  for (const match of source.matchAll(/\[([^[\]\n]{1,80})\]/g)) {
    if (match.index > last) parts.push({ kind: "text", value: source.slice(last, match.index) });
    parts.push({ kind: "ref", name: match[1].trim() });
    last = match.index + match[0].length;
  }
  if (last < source.length) parts.push({ kind: "text", value: source.slice(last) });
  return parts;
}
export function findTableByName(slice, name) {
  const key = String(name ?? "")
    .trim()
    .toLowerCase();
  return slice.tables.find((table) => namesOf(table.name).includes(key)) ?? null;
}
export function templateRefs(slice, template, lang) {
  return parseTemplate(labelIn(template.text, lang))
    .filter((part) => part.kind === "ref")
    .map((part) => ({ name: part.name, table: findTableByName(slice, part.name) }));
}

// ---------------------------------------------------------------------------------------
// Draw sessions. A session is transient until it is recorded; physical faces are entered
// step by step, digital faces are rolled with the shared dice source.

const takenSet = (session, tableId) => new Set(session.taken[tableId] ?? []);
// A multi-sided token shows any side at any time (Roll20 Multi-Sided "Choose side" /
// "Random side", R20-104): its draws use the whole table, ignore replacement and drawn
// results, and never change the table.
const drawTable = (session, table) =>
  session.kind === "token" && table && !table.replacement ? { ...table, replacement: true } : table;
// The text filter applies to the table the draw starts from (Chartopia filters the chart
// being rolled), not to its subtables.
const filterFor = (session, tableId) =>
  session.kind === "table" && tableId === session.tableId ? session.filter : null;
/** Every variable the draw can touch, resolved once: defaults become explicit values. */
export function resolveVariables(slice, tableIds, chosen = {}) {
  return Object.fromEntries(
    sourceVariables(slice, tableIds).map((v) => [v.id, variableValue(v, chosen)]),
  );
}
function cleanFilter(filter) {
  const text = String(filter?.text ?? "").trim();
  return text ? { text: text.slice(0, LIMITS.filter), column: filter.column || "all" } : null;
}

export function beginSession(slice, spec, lang = "it") {
  const kind = spec.kind ?? "table";
  const session = {
    id: newId("draw"),
    kind,
    tableId: spec.tableId ?? null,
    templateId: spec.templateId ?? null,
    tokenId: spec.tokenId ?? null,
    lang,
    variables: { ...(spec.variables ?? {}) },
    column: kind === "table" ? spec.column || "all" : "main",
    filter: kind === "table" ? cleanFilter(spec.filter) : null,
    queue: [],
    steps: [],
    rerolls: [],
    taken: {},
    templateParts: null,
    done: false,
  };
  if (session.kind === "template") {
    const template = getTemplate(slice, session.templateId);
    if (!template) throw refuse("Il modello non esiste più.", "The template no longer exists.");
    const langs =
      typeof template.text === "object" && template.text
        ? ["it", "en"].filter((code) => template.text[code])
        : [lang];
    const parsed = Object.fromEntries(
      langs.map((code) => [code, parseTemplate(labelIn(template.text, code))]),
    );
    const primary = parsed[lang] ? lang : langs[0];
    const refs = parsed[primary].filter((part) => part.kind === "ref");
    const missing = refs.filter((ref) => !findTableByName(slice, ref.name)).map((ref) => ref.name);
    if (missing.length)
      throw refuse(
        `Tabelle non trovate nel modello: ${missing.join(", ")}.`,
        `Tables not found in the template: ${missing.join(", ")}.`,
      );
    const ids = refs.map((ref) => findTableByName(slice, ref.name).id);
    // Another language joins only when its references name the same tables in order.
    session.templateParts = Object.fromEntries(
      Object.entries(parsed).filter(([, parts]) => {
        const other = parts.filter((part) => part.kind === "ref");
        return (
          other.length === ids.length &&
          other.every((part, i) => findTableByName(slice, part.name)?.id === ids[i])
        );
      }),
    );
    session.lang = primary;
    session.queue = ids.map((tableId, ref) => ({ tableId, parent: null, ref, depth: 0 }));
  } else {
    const table = getTable(slice, session.tableId);
    if (!table) throw refuse("La tabella non esiste più.", "The table no longer exists.");
    session.queue = [{ tableId: table.id, parent: null, ref: null, depth: 0 }];
    if (session.column !== "all" && session.column !== "main")
      if (!table.columns.some((c) => c.id === session.column)) session.column = "all";
  }
  session.variables = resolveVariables(
    slice,
    session.queue.map((entry) => entry.tableId),
    // A token's sides are never filtered by input variables.
    kind === "token"
      ? Object.fromEntries(
          sourceVariables(slice, [session.tableId]).map((variable) => [variable.id, ANY]),
        )
      : session.variables,
  );
  skipEmpty(slice, session);
  if (session.kind !== "template" && session.steps.some((step) => step.empty))
    throw refuse(
      "Nessuna voce disponibile: reimposta le voci estratte o cambia variabili e filtro.",
      "No result available: reset drawn results or change the variables and filter.",
    );
  return session;
}
export function pendingStep(slice, session) {
  const pending = session.queue[0];
  if (!pending) return null;
  const table = getTable(slice, pending.tableId);
  return table ? { ...pending, table, sides: table.sides } : null;
}
// A pending table with no usable row is recorded as empty instead of rolling forever.
function skipEmpty(slice, session) {
  while (session.queue.length) {
    const pending = session.queue[0];
    const table = getTable(slice, pending.tableId);
    if (
      table &&
      availableRows(
        drawTable(session, table),
        session.variables,
        takenSet(session, table.id),
        filterFor(session, table.id),
      ).length
    )
      break;
    session.queue.shift();
    session.steps.push({
      tableId: pending.tableId,
      tableName: clone(table?.name ?? pending.tableId),
      sides: table?.sides ?? null,
      face: null,
      mode: null,
      resultId: null,
      text: null,
      empty: true,
      missing: !table,
      rerolls: [],
      parent: pending.parent,
      ref: pending.ref,
      depth: pending.depth,
    });
  }
  session.done = session.queue.length === 0;
}
function acceptRow(slice, session, table, result, { face, mode }) {
  const pending = session.queue.shift();
  const index = session.steps.length;
  session.steps.push({
    tableId: table.id,
    tableName: clone(table.name),
    sides: table.sides,
    face,
    mode,
    resultId: result.id,
    text: clone(result.text),
    // Multi-column rows keep every column with its name, as drawn (FG, Tables+).
    mainColumn: clone(table.mainColumn ?? null),
    cells: table.columns.map((c) => ({
      id: c.id,
      name: clone(c.name),
      value: clone(result.cells?.[c.id] ?? ""),
    })),
    rerolls: session.rerolls,
    parent: pending.parent,
    ref: pending.ref,
    depth: pending.depth,
  });
  session.rerolls = [];
  if (!drawTable(session, table).replacement) (session.taken[table.id] ??= []).push(result.id);
  if (result.subtableId && session.kind !== "token" && pending.depth < LIMITS.depth)
    session.queue.unshift({
      tableId: result.subtableId,
      parent: index,
      ref: pending.ref,
      depth: pending.depth + 1,
    });
  skipEmpty(slice, session);
}
/** A face of the current die, physical (typed) or digital (rolled). */
export function resolveFace(slice, session, face, mode = "physical") {
  const pending = pendingStep(slice, session);
  if (!pending) throw refuse("L’estrazione è già completa.", "The draw is already complete.");
  const { table } = pending;
  if (!Number.isInteger(face) || face < 1 || face > table.sides)
    throw refuse(
      `Inserisci un valore da 1 a ${table.sides} per il d${table.sides}.`,
      `Enter a value from 1 to ${table.sides} for the d${table.sides}.`,
    );
  const outcome = faceOutcome(
    drawTable(session, table),
    face,
    session.variables,
    takenSet(session, table.id),
    filterFor(session, table.id),
  );
  if (!outcome.row) {
    if (session.rerolls.length >= LIMITS.rerolls)
      throw refuse(
        "Troppi tiri a vuoto: controlla dado e variabili.",
        "Too many unusable rolls: check the die and variables.",
      );
    session.rerolls.push({ face, mode, reason: outcome.reason, rowId: outcome.rowId ?? null });
    return { status: "reroll", reason: outcome.reason, rowId: outcome.rowId ?? null };
  }
  acceptRow(slice, session, table, outcome.row, { face, mode });
  return { status: "accepted", row: outcome.row };
}
/** Foundry "Draw This Result": the choice is recorded as a choice, not as a face. */
export function chooseRow(slice, session, rowId) {
  const pending = pendingStep(slice, session);
  if (!pending) throw refuse("L’estrazione è già completa.", "The draw is already complete.");
  const result = availableRows(
    drawTable(session, pending.table),
    session.variables,
    takenSet(session, pending.tableId),
    filterFor(session, pending.tableId),
  ).find((r) => r.id === rowId);
  if (!result)
    throw refuse("Questa voce non è disponibile ora.", "This result is not available now.");
  acceptRow(slice, session, pending.table, result, { face: null, mode: "chosen" });
  return result;
}
export function rollCurrent(slice, session, roll = rollDie) {
  for (let i = 0; i <= LIMITS.rerolls; i++) {
    const pending = pendingStep(slice, session);
    if (!pending) return session;
    const outcome = resolveFace(slice, session, roll(pending.sides), "digital");
    if (outcome.status === "accepted") return session;
  }
  throw refuse("Troppi tiri a vuoto.", "Too many unusable rolls.");
}
export function rollAll(slice, session, roll = rollDie) {
  while (!session.done) rollCurrent(slice, session, roll);
  return session;
}
export const sessionHasDigital = (session) =>
  session.steps.some((s) => s.mode === "digital") ||
  session.rerolls.some((r) => r.mode === "digital");

/**
 * The text of one step. A multi-column row drawn directly from a table shows the chosen
 * column, or every column as "main · Column: value" (FG output by column, R20-115);
 * subtables, templates and tokens use the first column.
 */
export function stepText(session, step, lang = session.lang) {
  const main = labelIn(step.text, lang);
  const cells = step.cells ?? [];
  if (!cells.length || session.kind !== "table" || step.parent !== null) return main;
  const column = session.column ?? "all";
  if (column === "main") return main;
  if (column !== "all") {
    const cell = cells.find((c) => c.id === column);
    return cell ? labelIn(cell.value, lang) || "—" : main;
  }
  const extra = cells
    .filter((c) => labelIn(c.value, lang))
    .map((c) => `${labelIn(c.name, lang)}: ${labelIn(c.value, lang)}`);
  return [main, ...extra].join(" · ");
}
function composeStep(session, index, lang) {
  const step = session.steps[index];
  const own = step.empty
    ? labelIn(L("nessuna voce disponibile", "no result available"), lang)
    : stepText(session, step, lang);
  const children = session.steps
    .map((s, i) => (s.parent === index ? composeStep(session, i, lang) : null))
    .filter(Boolean);
  return [own, ...children].join(": ");
}
export function sessionText(session, lang = session.lang) {
  if (session.kind === "template") {
    const parts = session.templateParts[lang] ?? session.templateParts[session.lang];
    let ref = 0;
    return parts
      .map((part) => {
        if (part.kind === "text") return part.value;
        const current = ref++;
        const index = session.steps.findIndex((s) => s.parent === null && s.ref === current);
        return index < 0 ? "…" : composeStep(session, index, lang);
      })
      .join("");
  }
  const top = session.steps.findIndex((s) => s.parent === null);
  return top < 0 ? "" : composeStep(session, top, lang);
}
function sessionTitle(slice, session) {
  if (session.kind === "template") return clone(getTemplate(slice, session.templateId)?.name ?? "");
  return clone(getTable(slice, session.tableId)?.name ?? "");
}
function bilingualText(session) {
  if (session.kind === "template" && Object.keys(session.templateParts).length < 2)
    return sessionText(session);
  return { it: sessionText(session, "it"), en: sessionText(session, "en") };
}

/**
 * Records a finished (or interrupted) session in the history and, when finished, marks
 * results drawn without replacement and turns a multi-sided token. Revalidates the rows
 * against the current tables: a table edited meanwhile refuses the stale draw.
 */
export function recordSession(slice, history, session, { role, status = "complete" }) {
  if (status === "complete") {
    if (!session.done) throw refuse("L’estrazione non è completa.", "The draw is not complete.");
    for (const step of session.steps) {
      if (step.empty) continue;
      const table = drawTable(session, getTable(slice, step.tableId));
      const result = table?.results.find((r) => r.id === step.resultId);
      if (!result || (!table.replacement && result.drawn))
        throw refuse(
          "La tabella è cambiata durante l’estrazione: ricomincia.",
          "The table changed during the draw: start again.",
        );
      if (!table.replacement) result.drawn = true;
    }
    if (session.kind === "token") {
      const token = slice.tokens.find((t) => t.id === session.tokenId);
      if (!token)
        throw refuse("La pedina non è più sul Tavolo.", "The token is no longer on the Table.");
      token.resultId =
        session.steps.find((s) => s.parent === null && s.resultId)?.resultId ?? token.resultId;
    }
  }
  const variables = sourceVariables(slice, [...new Set(session.steps.map((s) => s.tableId))])
    .filter((v) => variableValue(v, session.variables) !== ANY)
    .map((v) => ({
      id: v.id,
      name: clone(v.name),
      value: clone(v.options.find((o) => o.value === variableValue(v, session.variables)).label),
    }));
  const entry = {
    id: session.id,
    at: now(),
    by: role,
    kind: session.kind,
    status,
    tableId: session.tableId,
    templateId: session.templateId,
    tokenId: session.tokenId,
    title: sessionTitle(slice, session),
    text: bilingualText(session),
    variables,
    column: session.steps.some((step) => step.cells?.length) ? session.column : null,
    filter: clone(session.filter),
    steps: clone(session.steps),
    pendingRerolls: status === "complete" ? [] : clone(session.rerolls),
    visibleTo: role === "dm" ? ["dm"] : [role, "dm"],
    outputs: [],
    notes: [],
  };
  history.entries.push(entry);
  if (status === "complete") slice.applied.push(entry.id);
  if (history.entries.length > LIMITS.history) {
    const removed = history.entries.splice(0, history.entries.length - LIMITS.history);
    const ids = new Set(removed.flatMap((e) => [e.id, ...e.outputs.map((o) => o.id)]));
    slice.applied = slice.applied.filter((id) => !ids.has(id));
  }
  return entry;
}

// ---------------------------------------------------------------------------------------
// History: status derived from the undoable slice, visibility per identity, outputs.

export function entryStatus(slice, entry) {
  if (entry.status === "incomplete") return "incomplete";
  return slice.applied.includes(entry.id) ? "accepted" : "reversed";
}
export function outputStatus(slice, output) {
  // Journal entries are narrative content with their own revisions, and a message posted
  // in the B17 chat is corrected in the chat (retract, delete with a trace): never undone
  // here.
  if (output.kind === "journal" || (output.kind === "chat" && output.messageId)) return "applied";
  return slice.applied.includes(output.id) ? "applied" : "reversed";
}
// DM preparation outputs: the journal destination, encounters and hidden loot parcels.
const dmOnlyOutput = (output) =>
  output.kind === "journal" ||
  output.kind === "encounter" ||
  (output.kind === "loot" && output.target === "parcel");
// A chat output is public (no readers) or a whisper read by its readers (B17, VTL-092).
const chatOutputs = (slice, entry) =>
  entry.outputs.filter((o) => o.kind === "chat" && outputStatus(slice, o) === "applied");
const sharedInChat = (slice, entry) => chatOutputs(slice, entry).some((o) => !o.readers);
const whisperedTo = (slice, entry, role) =>
  chatOutputs(slice, entry).some((o) => o.readers?.includes(role));
export function canReadEntry(slice, entry, role) {
  return (
    entry.visibleTo.includes(role) || sharedInChat(slice, entry) || whisperedTo(slice, entry, role)
  );
}
/** Entries this identity may read, newest first; notes are always personal. */
export function projectHistory(slice, history, role) {
  return history.entries
    .filter((entry) => canReadEntry(slice, entry, role))
    .map((entry) => ({
      ...clone(entry),
      status: entryStatus(slice, entry),
      shared: sharedInChat(slice, entry),
      notes: entry.notes.filter((note) => note.by === role),
      outputs: entry.outputs
        .filter((output) => role === "dm" || !dmOnlyOutput(output))
        .filter((output) => !output.readers || output.readers.includes(role))
        .map((output) => ({ ...clone(output), status: outputStatus(slice, output) })),
    }))
    .reverse();
}
function readableEntry(slice, history, entryId, role) {
  const entry = history.entries.find((e) => e.id === entryId);
  if (!entry || !canReadEntry(slice, entry, role))
    throw refuse("Estrazione non disponibile.", "Draw unavailable.");
  return entry;
}
function acceptedEntry(slice, history, entryId, role) {
  const entry = readableEntry(slice, history, entryId, role);
  if (entryStatus(slice, entry) !== "accepted")
    throw refuse(
      "Questa estrazione è stata annullata o non è completa.",
      "This draw was undone or is not complete.",
    );
  return entry;
}
/**
 * Chat output. Owlbear Tables+ (VTL-092) shares a result with everyone, the GM only or
 * chosen players; B17 whispers carry the recipients. `to` is a B17 target id ("dm",
 * "actor:<id>") with its `readers`, or null for everyone.
 */
export function shareToChat(
  slice,
  history,
  entryId,
  role,
  { to = null, readers = null, messageId = null } = {},
) {
  const entry = acceptedEntry(slice, history, entryId, role);
  if (role !== "dm" && entry.by !== role)
    throw refuse("Puoi condividere solo le tue estrazioni.", "You can share only your own draws.");
  if (sharedInChat(slice, entry)) throw refuse("Già inviata in chat.", "Already sent to chat.");
  if (to && chatOutputs(slice, entry).some((o) => o.to?.id === to.id))
    throw refuse("Già inviata a questo destinatario.", "Already sent to this recipient.");
  const output = {
    id: newId("out"),
    kind: "chat",
    at: now(),
    by: role,
    to: to ? clone(to) : null,
    readers: to ? [...new Set([role, ...(readers ?? [])])] : null,
    messageId,
  };
  entry.outputs.push(output);
  if (!messageId) slice.applied.push(output.id);
  return output;
}
/**
 * Loot output. FG parcel (R20-115): by default the item joins the hidden "from random
 * tables" parcel of the active scene through the loot area (B26), so it appears in Table ›
 * Loot and Campaign › Treasure and is shared with the players only when the DM shows the
 * parcel. Better Rolltables (FVT-098): `destination: "actor:<id>"` gives it to a sheet.
 */
export function addLoot(state, slice, history, entryId, input, role) {
  if (role !== "dm") throw refuse("Solo il DM assegna il bottino.", "Only the DM assigns loot.");
  const entry = acceptedEntry(slice, history, entryId, role);
  const { name, quantity, valueGp = null } = input;
  const destination = input.destination ?? (input.actorId ? `actor:${input.actorId}` : "parcel");
  const itemName = String(name ?? "").trim();
  if (!itemName || itemName.length > LIMITS.name)
    throw refuse(
      "Dai all’oggetto un nome fino a 80 caratteri.",
      "Give the item a name up to 80 characters.",
    );
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99)
    throw refuse("Quantità da 1 a 99.", "Quantity from 1 to 99.");
  if (destination === "parcel") {
    const loot = state.ext?.[LOOT_SLICE];
    if (!loot)
      throw refuse(
        "Il bottino della campagna non è disponibile in questa versione.",
        "Campaign loot is not available in this version.",
      );
    const item = addTableLoot(state, loot, role, {
      sceneId: state.activeSceneId,
      name: itemName,
      quantity,
      valueGp: valueGp === "" ? null : valueGp,
    });
    const parcel = loot.parcels.find((p) => p.items.some((i) => i.id === item.id));
    const output = {
      id: newId("out"),
      kind: "loot",
      target: "parcel",
      at: now(),
      by: role,
      parcelId: parcel.id,
      parcelName: parcel.name,
      itemId: item.id,
      name: itemName,
      quantity,
    };
    entry.outputs.push(output);
    slice.applied.push(output.id);
    return output;
  }
  const actorId = String(destination).startsWith("actor:") ? destination.slice(6) : null;
  const actor = deckRecipients(state).find((a) => a.id === actorId);
  if (!actor) throw refuse("Scegli un personaggio della campagna.", "Choose a campaign character.");
  const output = {
    id: newId("out"),
    kind: "loot",
    target: "actor",
    at: now(),
    by: role,
    actorId,
    name: itemName,
    quantity,
  };
  output.itemId = `rt-${output.id}`;
  (actor.inventory ??= []).push({
    id: output.itemId,
    name: itemName,
    quantity,
    weight: 0,
    equipped: false,
    kind: "gear",
    description: {
      it: `Da «${labelIn(entry.title, "it")}»: ${labelIn(entry.text, "it")}`,
      en: `From “${labelIn(entry.title, "en")}”: ${labelIn(entry.text, "en")}`,
    },
  });
  entry.outputs.push(output);
  slice.applied.push(output.id);
  return output;
}
export function addJournalOutput(slice, history, entryId, { campaignEntryId, access }, role) {
  if (role !== "dm")
    throw refuse(
      "Solo il DM scrive nel diario da qui.",
      "Only the DM writes to the journal from here.",
    );
  const entry = acceptedEntry(slice, history, entryId, role);
  const output = {
    id: newId("out"),
    kind: "journal",
    at: now(),
    by: role,
    campaignEntryId,
    access,
  };
  entry.outputs.push(output);
  return output;
}
/**
 * FG output target "Encounter" (R20-115): the result becomes a new encounter in the
 * encounter builder (B19), or is appended to an existing one, as its summary note. No
 * creature is inferred from the text (F-043): the DM adds them in the builder.
 */
export function addEncounterOutput(state, slice, history, entryId, input, role) {
  if (role !== "dm")
    throw refuse("Solo il DM prepara gli incontri.", "Only the DM prepares encounters.");
  const entry = acceptedEntry(slice, history, entryId, role);
  const builder = state.ext?.[ENCOUNTER_SLICE];
  if (!builder)
    throw refuse(
      "Il costruttore d’incontri non è disponibile in questa versione.",
      "The encounter builder is not available in this version.",
    );
  const summary = String(input.summary ?? "").trim();
  if (!summary) throw refuse("Scrivi la nota dell’incontro.", "Write the encounter note.");
  let encounter;
  if (input.encounterId) {
    encounter = encounters.encounterById(builder, input.encounterId);
    const before = encounter.notes?.summary ?? "";
    encounters.setNotes(builder, role, encounter.id, {
      summary: before ? `${before}\n\n${summary}` : summary,
    });
  } else {
    const name = String(input.name ?? "").trim();
    if (!name || name.length > 100)
      throw refuse(
        "Dai all’incontro un nome fino a 100 caratteri.",
        "Give the encounter a name up to 100 characters.",
      );
    encounter = encounters.createEncounter(builder, role, { name, lang: input.lang ?? "it" });
    encounters.setNotes(builder, role, encounter.id, { summary });
  }
  const output = {
    id: newId("out"),
    kind: "encounter",
    at: now(),
    by: role,
    encounterId: encounter.id,
    name: encounter.name,
    created: !input.encounterId,
  };
  entry.outputs.push(output);
  slice.applied.push(output.id);
  return output;
}
export function addNote(slice, history, entryId, text, role) {
  const entry = readableEntry(slice, history, entryId, role);
  const value = String(text ?? "").trim();
  if (!value || value.length > LIMITS.note)
    throw refuse("Scrivi una nota fino a 500 caratteri.", "Write a note up to 500 characters.");
  const note = { id: newId("note"), at: now(), by: role, text: value };
  entry.notes.push(note);
  return note;
}
export function resetDrawn(slice, tableId, role) {
  if (role !== "dm")
    throw refuse("Solo il DM reimposta la tabella.", "Only the DM resets the table.");
  const table = getTable(slice, tableId);
  if (!table) throw refuse("La tabella non esiste più.", "The table no longer exists.");
  const count = table.results.filter((r) => r.drawn).length;
  table.results.forEach((r) => (r.drawn = false));
  return count;
}

// ---------------------------------------------------------------------------------------
// Authoring (Preparation, DM): validation, save, delete.

export function tableDraft(table, lang = "it") {
  if (table)
    return {
      kind: "table",
      id: table.id,
      lang,
      name: labelIn(table.name, lang),
      nameValue: clone(table.name),
      sides: table.sides,
      replacement: table.replacement,
      playersCanUse: table.playersCanUse,
      variables: clone(table.variables),
      mainColumn: clone(table.mainColumn ?? null),
      columns: clone(table.columns ?? []),
      results: clone(table.results),
    };
  return null;
}
/** Chartopia starts a new chart as a d12 with one row per face; so does this editor. */
export function newTableDraft(name, sides, lang = "it") {
  return {
    kind: "table",
    id: null,
    lang,
    name,
    sides,
    replacement: true,
    playersCanUse: false,
    variables: [],
    mainColumn: null,
    columns: [],
    results: Array.from({ length: sides }, (_, i) =>
      row(newId("row"), 1, labelIn(L(`Voce ${i + 1}`, `Result ${i + 1}`), lang)),
    ),
  };
}
const nameClash = (list, id, name) =>
  list.some((item) => item.id !== id && namesOf(item.name).includes(name.toLowerCase()));
function wouldCycle(slice, draft, subtableId) {
  const tables = new Map(slice.tables.map((t) => [t.id, t]));
  const stack = [subtableId];
  const seen = new Set();
  while (stack.length) {
    const id = stack.pop();
    if (id === draft.id) return true;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    for (const r of tables.get(id)?.results ?? []) if (r.subtableId) stack.push(r.subtableId);
  }
  return false;
}
export function validateTableDraft(slice, draft) {
  const name = String(draft.name ?? "").trim();
  if (!name || name.length > LIMITS.name)
    throw refuse(
      "Dai alla tabella un nome fino a 80 caratteri.",
      "Give the table a name up to 80 characters.",
    );
  if (nameClash(slice.tables, draft.id, name))
    throw refuse(
      "Esiste già una tabella con questo nome (i modelli la cercano per nome).",
      "A table with this name already exists (templates look tables up by name).",
    );
  if (!Number.isInteger(draft.sides) || draft.sides < 1 || draft.sides > LIMITS.sides)
    throw refuse(
      `Il dado va da d1 a d${LIMITS.sides}.`,
      `The die goes from d1 to d${LIMITS.sides}.`,
    );
  if (!draft.results.length || draft.results.length > LIMITS.rows)
    throw refuse("Servono da 1 a 100 voci.", "1 to 100 results are needed.");
  if (draft.variables.length > LIMITS.variables)
    throw refuse("Al massimo 4 variabili.", "At most 4 variables.");
  const variableNames = new Set();
  for (const variable of draft.variables) {
    const vname = labelIn(variable.name, draft.lang).trim();
    if (!vname || vname.length > LIMITS.optionText)
      throw refuse(
        "Ogni variabile ha un nome fino a 40 caratteri.",
        "Each variable has a name up to 40 characters.",
      );
    if (variableNames.has(vname.toLowerCase()))
      throw refuse(
        `Due variabili si chiamano «${vname}»: i valori passano alle sottotabelle per nome.`,
        `Two variables are called “${vname}”: values reach subtables by name.`,
      );
    variableNames.add(vname.toLowerCase());
    if (!variable.options.length || variable.options.length > LIMITS.options)
      throw refuse(
        `La variabile «${vname}» ha bisogno di 1–12 valori.`,
        `Variable “${vname}” needs 1–12 values.`,
      );
  }
  const columns = draft.columns ?? [];
  if (columns.length > LIMITS.columns)
    throw refuse(
      `Al massimo ${LIMITS.columns} colonne oltre alla prima.`,
      `At most ${LIMITS.columns} columns besides the first.`,
    );
  const columnNames = new Set();
  for (const name of [draft.mainColumn, ...columns.map((c) => c.name)]) {
    if (name === null || name === undefined) continue;
    const cname = labelIn(name, draft.lang).trim();
    if ((!cname && name !== draft.mainColumn) || cname.length > LIMITS.optionText)
      throw refuse(
        "Ogni colonna ha un nome fino a 40 caratteri.",
        "Each column has a name up to 40 characters.",
      );
    if (cname && columnNames.has(cname.toLowerCase()))
      throw refuse(`Due colonne si chiamano «${cname}».`, `Two columns are called “${cname}”.`);
    columnNames.add(cname.toLowerCase());
  }
  draft.results.forEach((result, i) => {
    const text = labelIn(result.text, draft.lang).trim();
    if (!text || text.length > LIMITS.text)
      throw refuse(
        `La voce ${i + 1} ha bisogno di un testo (max 300).`,
        `Result ${i + 1} needs a text (max 300).`,
      );
    for (const column of columns)
      if (labelIn(result.cells?.[column.id], draft.lang).length > LIMITS.text)
        throw refuse(
          `La colonna «${labelIn(column.name, draft.lang)}» della voce ${i + 1} supera 300 caratteri.`,
          `Column “${labelIn(column.name, draft.lang)}” of result ${i + 1} exceeds 300 characters.`,
        );
    if (!Number.isInteger(result.weight) || result.weight < 1 || result.weight > LIMITS.weight)
      throw refuse(
        `Il peso della voce ${i + 1} va da 1 a 100.`,
        `Result ${i + 1} weight goes from 1 to 100.`,
      );
    if (result.subtableId) {
      if (!getTable(slice, result.subtableId))
        throw refuse(
          `La sottotabella della voce ${i + 1} non esiste.`,
          `Result ${i + 1} subtable does not exist.`,
        );
      if (wouldCycle(slice, draft, result.subtableId))
        throw refuse(
          `La voce ${i + 1} creerebbe un giro di sottotabelle.`,
          `Result ${i + 1} would create a subtable loop.`,
        );
    }
    for (const variable of draft.variables) {
      const value = result.values?.[variable.id] ?? ANY;
      if (value !== ANY && !variable.options.some((o) => o.value === value))
        throw refuse(
          `La voce ${i + 1} ha un valore sconosciuto.`,
          `Result ${i + 1} has an unknown value.`,
        );
    }
  });
}
const keepText = (draft, original, edited) =>
  original && labelIn(original, draft.lang) === String(edited).trim()
    ? clone(original)
    : String(edited).trim();
const trimText = (value) => (typeof value === "string" ? value.trim() : clone(value));
/**
 * Variable ids follow the names the DM types, so a value reaches a subtable by name
 * (Chartopia input variables propagate by name, CMP-132): a variable named like one of
 * another table adopts its id; otherwise a new or colliding variable gets an id from its
 * own name. Returns old id → new id.
 */
function variableIds(slice, draft, existing) {
  const others = slice.tables.filter((t) => t.id !== draft.id).flatMap((t) => t.variables);
  const taken = new Set(others.map((v) => v.id));
  const used = new Set();
  const remap = {};
  for (const variable of draft.variables) {
    const names = namesOf(variable.name);
    const same = others.find((other) => namesOf(other.name).some((n) => names.includes(n)));
    let id = variable.id;
    if (same) id = same.id;
    else if (taken.has(id) || used.has(id) || !existing?.variables.some((v) => v.id === id)) {
      const base = slug(labelIn(variable.name, draft.lang));
      id = base;
      for (let n = 2; taken.has(id) || used.has(id); n++) id = `${base}-${n}`;
    }
    used.add(id);
    remap[variable.id] = id;
  }
  return remap;
}
function columnIds(draft) {
  const used = new Set();
  const remap = {};
  for (const column of draft.columns ?? []) {
    let id = column.id || `col-${slug(labelIn(column.name, draft.lang))}`;
    for (let n = 2; used.has(id); n++) id = `${column.id || "col"}-${n}`;
    used.add(id);
    remap[column.id ?? ""] = id;
  }
  return remap;
}
const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/**
 * A renamed table keeps working in the text templates that reference it by name: every
 * `[Old name]` (in any language) becomes `[New name]`. Returns the templates updated.
 */
export function renameTemplateRefs(slice, oldNames, newName) {
  const updated = [];
  if (!oldNames.length) return updated;
  const pattern = new RegExp(`\\[\\s*(?:${oldNames.map(escapeRegExp).join("|")})\\s*\\]`, "gi");
  for (const template of slice.templates) {
    const rewrite = (text) => String(text).replace(pattern, `[${newName}]`);
    const next =
      typeof template.text === "object" && template.text
        ? Object.fromEntries(Object.entries(template.text).map(([k, v]) => [k, rewrite(v)]))
        : rewrite(template.text);
    if (JSON.stringify(next) !== JSON.stringify(template.text)) {
      template.text = next;
      updated.push(template);
    }
  }
  return updated;
}
export function applyTableDraft(slice, draft, role) {
  if (role !== "dm") throw refuse("Solo il DM modifica le tabelle.", "Only the DM edits tables.");
  validateTableDraft(slice, draft);
  const existing = draft.id ? getTable(slice, draft.id) : null;
  if (draft.id && !existing)
    throw refuse("La tabella non esiste più.", "The table no longer exists.");
  const variableRemap = variableIds(slice, draft, existing);
  const columnRemap = columnIds(draft);
  const oldNames = existing ? namesOf(existing.name) : [];
  const table = existing ?? { id: newId("table"), origin: "user" };
  table.name = keepText(draft, draft.nameValue, draft.name);
  table.sides = draft.sides;
  table.replacement = draft.replacement;
  table.playersCanUse = draft.playersCanUse;
  table.variables = draft.variables.map((v) => ({
    id: variableRemap[v.id],
    name: trimText(v.name),
    any: v.any === true,
    options: clone(v.options),
  }));
  const main = draft.mainColumn === null ? "" : labelIn(draft.mainColumn, draft.lang).trim();
  table.mainColumn = main ? trimText(draft.mainColumn) : null;
  table.columns = (draft.columns ?? []).map((c) => ({
    id: columnRemap[c.id ?? ""],
    name: trimText(c.name),
  }));
  table.results = draft.results.map((r) => ({
    id: r.id ?? newId("row"),
    text: trimText(r.text),
    weight: r.weight,
    drawn: r.drawn === true,
    subtableId: r.subtableId || null,
    values: Object.fromEntries(
      Object.entries(r.values ?? {})
        .filter(([id, value]) => value !== ANY && variableRemap[id])
        .map(([id, value]) => [variableRemap[id], value]),
    ),
    cells: Object.fromEntries(
      (draft.columns ?? [])
        .filter((c) => labelIn(r.cells?.[c.id ?? ""], draft.lang).trim())
        .map((c) => [columnRemap[c.id ?? ""], trimText(r.cells[c.id ?? ""])]),
    ),
  }));
  if (!existing) slice.tables.push(table);
  const newNames = namesOf(table.name);
  const renamed = renameTemplateRefs(
    slice,
    oldNames.filter((name) => !newNames.includes(name)),
    labelIn(table.name, draft.lang),
  );
  Object.defineProperty(table, "renamedTemplates", { value: renamed.length, enumerable: false });
  return table;
}
export function tableReferences(slice, tableId) {
  const table = getTable(slice, tableId);
  const refs = [];
  for (const other of slice.tables)
    if (other.id !== tableId && other.results.some((r) => r.subtableId === tableId))
      refs.push({ kind: "table", name: other.name });
  for (const template of slice.templates)
    if (
      ["it", "en"].some((lang) =>
        templateRefs(slice, template, lang).some((ref) => ref.table?.id === tableId),
      )
    )
      refs.push({ kind: "template", name: template.name });
  if (slice.tokens.some((t) => t.tableId === tableId))
    refs.push({ kind: "token", name: L("pedina sul Tavolo", "token on the Table") });
  return table ? refs : [];
}
export function deleteTable(slice, tableId, role) {
  if (role !== "dm") throw refuse("Solo il DM elimina le tabelle.", "Only the DM deletes tables.");
  if (!getTable(slice, tableId))
    throw refuse("La tabella non esiste più.", "The table no longer exists.");
  const refs = tableReferences(slice, tableId);
  if (refs.length)
    throw refuse(
      `È usata da: ${refs.map((r) => labelIn(r.name, "it")).join(", ")}.`,
      `It is used by: ${refs.map((r) => labelIn(r.name, "en")).join(", ")}.`,
    );
  slice.tables = slice.tables.filter((t) => t.id !== tableId);
}
export function templateDraft(template, lang = "it") {
  return template
    ? {
        kind: "template",
        id: template.id,
        lang,
        name: labelIn(template.name, lang),
        nameValue: clone(template.name),
        text: labelIn(template.text, lang),
        textValue: clone(template.text),
      }
    : { kind: "template", id: null, lang, name: "", text: "" };
}
export function applyTemplateDraft(slice, draft, role) {
  if (role !== "dm") throw refuse("Solo il DM modifica i modelli.", "Only the DM edits templates.");
  const name = String(draft.name ?? "").trim();
  if (!name || name.length > LIMITS.name)
    throw refuse(
      "Dai al modello un nome fino a 80 caratteri.",
      "Give the template a name up to 80 characters.",
    );
  if (nameClash(slice.templates, draft.id, name))
    throw refuse(
      "Esiste già un modello con questo nome.",
      "A template with this name already exists.",
    );
  const text = String(draft.text ?? "").trim();
  if (!text || text.length > LIMITS.templateText)
    throw refuse("Scrivi il testo del modello (max 2000).", "Write the template text (max 2000).");
  const existing = draft.id ? getTemplate(slice, draft.id) : null;
  if (draft.id && !existing)
    throw refuse("Il modello non esiste più.", "The template no longer exists.");
  const template = existing ?? { id: newId("template"), origin: "user" };
  template.name = keepText(draft, draft.nameValue, name);
  template.text = keepText(draft, draft.textValue, text);
  if (!existing) slice.templates.push(template);
  return template;
}
export function deleteTemplate(slice, templateId, role) {
  if (role !== "dm")
    throw refuse("Solo il DM elimina i modelli.", "Only the DM deletes templates.");
  if (!getTemplate(slice, templateId))
    throw refuse("Il modello non esiste più.", "The template no longer exists.");
  slice.templates = slice.templates.filter((t) => t.id !== templateId);
}

// Multi-sided tokens (Roll20 R20-104): one side per table entry, random or chosen. Like
// any token they are dragged to move and can be hidden from players (Roll20 GM layer,
// Owlbear Hide).
export function placeToken(slice, { tableId, sceneId, x, y, hidden = false }, role) {
  if (role !== "dm")
    throw refuse("Solo il DM posiziona queste pedine.", "Only the DM places these tokens.");
  const table = getTable(slice, tableId);
  if (!table) throw refuse("Scegli una tabella.", "Choose a table.");
  const token = {
    id: newId("side-token"),
    tableId,
    sceneId,
    x: Math.round(x),
    y: Math.round(y),
    resultId: table.results[0]?.id ?? null,
    hidden: hidden === true,
  };
  slice.tokens.push(token);
  return token;
}
function ownToken(slice, tokenId, role) {
  if (role !== "dm")
    throw refuse("Solo il DM gestisce queste pedine.", "Only the DM manages these tokens.");
  const token = slice.tokens.find((t) => t.id === tokenId);
  if (!token) throw refuse("La pedina non c’è più.", "The token is gone.");
  return token;
}
/** Drag or arrow keys: the token moves inside its scene. */
export function moveToken(slice, tokenId, { x, y }, role, scene = null) {
  const token = ownToken(slice, tokenId, role);
  if (!Number.isFinite(x) || !Number.isFinite(y))
    throw refuse("Posizione non valida.", "Invalid position.");
  const maxX = scene?.width ?? Infinity;
  const maxY = scene?.height ?? Infinity;
  token.x = Math.round(Math.min(Math.max(x, 0), maxX));
  token.y = Math.round(Math.min(Math.max(y, 0), maxY));
  return token;
}
export function setTokenHidden(slice, tokenId, hidden, role) {
  const token = ownToken(slice, tokenId, role);
  token.hidden = hidden === true;
  return token;
}
/** Tokens of a scene that this identity sees: hidden ones only for the DM. */
export const visibleTokens = (slice, sceneId, role) =>
  slice.tokens.filter((t) => t.sceneId === sceneId && (role === "dm" || !t.hidden));
export function removeToken(slice, tokenId, role) {
  if (role !== "dm")
    throw refuse("Solo il DM rimuove queste pedine.", "Only the DM removes these tokens.");
  const before = slice.tokens.length;
  slice.tokens = slice.tokens.filter((t) => t.id !== tokenId);
  if (slice.tokens.length === before) throw refuse("La pedina non c’è più.", "The token is gone.");
}

// ---------------------------------------------------------------------------------------
// UI state (per visit, never persisted) and shared helpers.

const uiDefaults = () => ({
  drawerTab: "tables",
  source: null,
  variables: {},
  // Output column and text filter belong to one table (its columns), never to another.
  column: { tableId: null, value: "all" },
  filter: { tableId: null, text: "", column: "all" },
  session: null,
  sessionRole: null,
  lastEntryId: null,
  notice: "",
  deckId: null,
  prepSelection: null,
  editor: null,
  focus: null,
  openDrawer: false,
  placing: false,
  prepHistory: false,
  prepRoot: null,
  routeView: null,
  prepRouteView: null,
  tokenFocus: null,
});
const ui = uiDefaults();
// Labels of this visit's draw commits (entry id → label). The undo stack is per visit too,
// so the drawer can tell which draw "Undo last change" would reverse.
const drawLabels = new Map();
let area = null;
export function resetRandomTablesUI() {
  Object.assign(ui, uiDefaults());
  drawLabels.clear();
}
export const uiState = () => ui;

const tablesOf = (state) => state.ext[ID];
const historyOf = (state) => state.ext[HISTORY];
const dice = (ctx) => ctx.rollDie ?? rollDie;
const errorText = (ctx, error) =>
  ctx.label(error?.it ? { it: error.it, en: error.en } : String(error?.message ?? error));
function focusSoon(selector) {
  ui.focus = selector;
}
function applyFocus(root) {
  if (!ui.focus) return;
  const target = root.querySelector(ui.focus);
  if (target) {
    ui.focus = null;
    target.focus?.();
  }
}
/** The editor header says "Unsaved changes" and enables Discard as soon as a field changes. */
function showDirty(ctx, root) {
  if (!ctx || !root) return;
  const flag = root.querySelector("[data-rt-dirty]");
  if (flag) flag.textContent = ctx.t("Modifiche non salvate", "Unsaved changes");
  root.querySelectorAll("[data-rt-discard]").forEach((b) => (b.disabled = false));
}
/** One commit with a visible refusal; `throwErrors` hands the error to a dialog instead. */
function act(ctx, label, mutator, { focus, throwErrors, ...options } = {}) {
  const previous = ui.focus;
  if (focus) ui.focus = focus;
  try {
    ctx.commit(String(label).slice(0, 220), mutator, options);
    return true;
  } catch (error) {
    ui.focus = previous;
    if (throwErrors) throw error;
    ctx.toast(errorText(ctx, error), true);
    return false;
  }
}
const deckApi = {
  slice: tablesOf,
  act,
  get rollDie() {
    return (sides) => (area?.ctx?.rollDie ?? rollDie)(sides);
  },
  deckId: () => ui.deckId,
  setDeckId: (id) => (ui.deckId = id),
  editor: () => ui.editor,
  markDirty: (structural) => {
    if (ui.editor) {
      ui.editor.dirty = true;
      ui.editor.error = "";
    }
    showDirty(area?.ctx, ui.prepRoot);
    return structural;
  },
  focus: focusSoon,
};
const timeText = (ctx, at) =>
  new Date(at).toLocaleTimeString(ctx.lang === "it" ? "it-IT" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
const whoText = (ctx, by) =>
  by === ctx.role ? ctx.t("Tu", "You") : by === "dm" ? "DM" : ctx.t("Giocatore", "Player");
const modeText = (ctx, mode) =>
  ({
    digital: ctx.t("dado digitale", "digital die"),
    physical: ctx.t("dado fisico", "physical die"),
    chosen: ctx.t("scelta", "chosen"),
  })[mode] ?? "";
const REASONS = {
  drawn: ["già estratta", "already drawn"],
  filtered: ["esclusa dalle variabili", "excluded by the variables"],
  text: ["esclusa dal filtro", "excluded by the filter"],
  none: ["nessuna voce su questa faccia", "no result on this face"],
};
const reasonText = (ctx, reason) => (REASONS[reason] ? ctx.t(...REASONS[reason]) : reason);
const columnName = (ctx, table, column) =>
  column === "main"
    ? ctx.label(table.mainColumn) || ctx.t("Voce", "Result")
    : ctx.label(table.columns.find((c) => c.id === column)?.name ?? "");

// Sources a role may draw from: the DM every table and template; players shared tables.
function sourcesFor(ctx) {
  const slice = tablesOf(ctx.state);
  const tables = slice.tables.filter((t) => ctx.role === "dm" || t.playersCanUse);
  const templates = ctx.role === "dm" ? slice.templates : [];
  return { tables, templates };
}
function currentSource(ctx, fixed) {
  const { tables, templates } = sourcesFor(ctx);
  const wanted = fixed ?? ui.source;
  const [kind, id] = String(wanted ?? "").split(":");
  if (kind === "table" && tables.some((t) => t.id === id)) return { kind, id };
  if (kind === "template" && templates.some((t) => t.id === id)) return { kind, id };
  if (fixed) return null;
  return tables[0] ? { kind: "table", id: tables[0].id } : null;
}
/** The table the DM explicitly chose for a multi-sided token (never a silent default). */
function chosenTokenTable(ctx) {
  const [kind, id] = String(ui.source ?? "").split(":");
  return kind === "table" && ctx.role === "dm" ? getTable(tablesOf(ctx.state), id) : null;
}
function sourceTableIds(slice, source, lang) {
  if (!source) return [];
  if (source.kind === "table") return [source.id];
  const template = getTemplate(slice, source.id);
  return template
    ? templateRefs(slice, template, lang)
        .map((ref) => ref.table?.id)
        .filter(Boolean)
    : [];
}
/** A filter only applies with a column of the table in view. */
function effectiveFilter(table) {
  if (!table || ui.filter.tableId !== table.id || !ui.filter.text.trim()) return null;
  const column =
    ui.filter.column === "main" || table.columns.some((c) => c.id === ui.filter.column)
      ? ui.filter.column
      : "all";
  return { text: ui.filter.text.trim(), column };
}
function effectiveColumn(table) {
  if (!table?.columns.length) return "all";
  if (ui.column.tableId !== table.id) return "all";
  const value = ui.column.value;
  return value === "main" || table.columns.some((c) => c.id === value) ? value : "all";
}
/** A player's draw, or any draw touching a table players use, is shared data. */
function drawIsShared(ctx, slice, tableIds) {
  if (ctx.role !== "dm") return true;
  return tableIds.some((root) =>
    [...reachableTables(slice, root)].some((id) => getTable(slice, id)?.playersCanUse),
  );
}
function drawOptions(ctx, session) {
  const slice = tablesOf(ctx.state);
  const touched = new Set(session.steps.map((s) => s.tableId));
  const shared = [...touched].some((id) => getTable(slice, id)?.playersCanUse);
  // A DM's draw on private tables is personal preparation (allowed offline); a draw on
  // a table the players use is shared data. Either way its label stays private.
  return ctx.role === "dm" && !shared
    ? { local: true, visibility: "private" }
    : { visibility: "private" };
}
/** Offline, a shared draw is refused before any digital die is rolled or shown. */
/** Offline, a digital die of a session is not rolled when its draw will be shared. */
function sessionBlocked(ctx, session) {
  if (!ctx.offline || !session) return false;
  const slice = tablesOf(ctx.state);
  const tables = [...session.steps, ...session.queue].map((s) => s.tableId);
  return ctx.role !== "dm" || tables.some((id) => getTable(slice, id)?.playersCanUse);
}
function offlineBlocked(ctx, source) {
  const slice = tablesOf(ctx.state);
  return Boolean(
    ctx.offline && source && drawIsShared(ctx, slice, sourceTableIds(slice, source, ctx.lang)),
  );
}
const OFFLINE_DRAW = L(
  "Senza rete: questa estrazione è condivisa e attende la connessione. I tiri digitali non partono finché non si può registrarli.",
  "Offline: this draw is shared and waits for the connection. Digital dice are not rolled until the draw can be recorded.",
);
function emitRolls(ctx, entry) {
  const logId = ctx.state.log.at(-1)?.id ?? null;
  for (const step of entry.steps) {
    // Only the face that selected a result; rerolled faces stay in the entry's chain.
    const faces = Number.isInteger(step.face) && step.mode !== "chosen" ? [step] : [];
    for (const face of faces)
      area?.emit("roll-accepted", {
        logId,
        roll: {
          id: `${entry.id}:${entry.steps.indexOf(step)}`,
          source: "random-table",
          kind: "table-draw",
          drawId: entry.id,
          tableId: step.tableId,
          controller: ctx.role,
          owner: ctx.role,
          visibility: "private",
          mode: face.mode,
          dice: [{ count: 1, sides: step.sides }],
          values: [face.face],
          natural: face.face,
          total: face.face,
        },
      });
  }
}
function finishSession(ctx) {
  const session = ui.session;
  let entry = null;
  const text = sessionText(session, ctx.lang);
  const label =
    `${ctx.t("Estrazione", "Draw")}: ${ctx.label(sessionTitle(tablesOf(ctx.state), session))} → ${text}`.slice(
      0,
      220,
    );
  // The committed render already shows the result card; on a refusal the finished
  // session stays on screen with a retry button.
  Object.assign(ui, { session: null, sessionRole: null, notice: "", lastEntryId: session.id });
  const done = act(
    ctx,
    label,
    (draft) => {
      entry = recordSession(tablesOf(draft), historyOf(draft), session, { role: ctx.role });
    },
    { ...drawOptions(ctx, session), focus: "[data-rt-result-focus]" },
  );
  if (!done) {
    Object.assign(ui, { session, sessionRole: ctx.role, lastEntryId: null });
    focusSoon("[data-rt-finish]");
    ctx.render();
    return false;
  }
  drawLabels.set(entry.id, label);
  emitRolls(ctx, entry);
  return true;
}
function cancelSession(ctx) {
  const session = ui.session;
  if (!session) return;
  Object.assign(ui, { session: null, sessionRole: null, notice: "" });
  focusSoon("[data-rt-start]");
  if (!sessionHasDigital(session)) {
    ctx.render();
    return;
  }
  // Digital faces already shown stay on record, finished or not: the draw is kept as
  // "Interrupted: not used". If it cannot be recorded (offline), it stays on screen.
  let entry = null;
  try {
    ctx.commit(
      ctx.t("Estrazione interrotta", "Draw interrupted"),
      (draft) => {
        entry = recordSession(tablesOf(draft), historyOf(draft), session, {
          role: ctx.role,
          status: "incomplete",
        });
      },
      drawOptions(ctx, session),
    );
    emitRolls(ctx, entry);
  } catch {
    Object.assign(ui, { session, sessionRole: ctx.role });
    focusSoon("[data-rt-finish], [data-rt-face]");
    ctx.toast(
      ctx.t(
        "I dadi digitali già mostrati restano: l’estrazione si registra quando torni in rete.",
        "Digital dice already shown stay: the draw is recorded when you are back online.",
      ),
      true,
    );
    ctx.render();
  }
}
function startSession(ctx, mode, fixed) {
  const slice = tablesOf(ctx.state);
  const source = currentSource(ctx, fixed);
  if (!source) return;
  if (offlineBlocked(ctx, source)) {
    ctx.toast(ctx.label(OFFLINE_DRAW), true);
    return;
  }
  const table = source.kind === "table" ? getTable(slice, source.id) : null;
  try {
    const session = beginSession(
      slice,
      source.kind === "template"
        ? { kind: "template", templateId: source.id, variables: ui.variables }
        : {
            kind: "table",
            tableId: source.id,
            variables: ui.variables,
            column: effectiveColumn(table),
            filter: effectiveFilter(table),
          },
      ctx.lang,
    );
    ui.lastEntryId = null;
    ui.notice = "";
    ui.session = session;
    ui.sessionRole = ctx.role;
    if (mode === "digital") {
      rollAll(slice, session, dice(ctx));
      finishSession(ctx);
      return;
    }
    focusSoon(mode === "choose" ? "[data-rt-choose-row]" : "[data-rt-face]");
    ctx.render();
  } catch (error) {
    ui.session = null;
    ctx.toast(errorText(ctx, error), true);
  }
}
function stepSession(ctx, action) {
  const slice = tablesOf(ctx.state);
  const session = ui.session;
  if (!session) return;
  try {
    const outcome = action(slice, session);
    if (outcome?.status === "reroll") {
      const step = pendingStep(slice, session);
      ui.notice = ctx.t(
        `Faccia ${session.rerolls.at(-1).face}: ${reasonText(ctx, outcome.reason)}. Tira di nuovo il d${step.sides}.`,
        `Face ${session.rerolls.at(-1).face}: ${reasonText(ctx, outcome.reason)}. Roll the d${step.sides} again.`,
      );
      ctx.toast(ui.notice);
      focusSoon("[data-rt-face]");
      ctx.render();
      return;
    }
    ui.notice = "";
    if (session.done) finishSession(ctx);
    else {
      focusSoon("[data-rt-face]");
      ctx.render();
    }
  } catch (error) {
    ctx.toast(errorText(ctx, error), true);
  }
}
/**
 * The drawer's Undo shows what it would reverse. It refuses a draw already written to the
 * campaign journal: the recap is narrative with its own history and would stay published
 * for a result that no longer counts; it is corrected from the Journal.
 */
function undoLast(ctx) {
  const label = ctx.undoLabel?.() ?? "";
  const entry = label
    ? projectHistory(tablesOf(ctx.state), historyOf(ctx.state), ctx.role).find(
        (e) => e.status === "accepted" && drawLabels.get(e.id) === label,
      )
    : null;
  if (entry?.outputs.some((o) => o.kind === "journal")) {
    ctx.toast(
      ctx.t(
        `L’ultima modifica è l’estrazione «${ctx.label(entry.title)}», già nel diario della campagna: annullarla lascerebbe pubblicato il resoconto di un esito annullato. Correggi il resoconto dal Diario.`,
        `The last change is the draw “${ctx.label(entry.title)}”, already in the campaign journal: undoing it would leave a recap of a cancelled result published. Correct the recap from the Journal.`,
      ),
      true,
    );
    return false;
  }
  ctx.undo();
  return true;
}

// ---------------------------------------------------------------------------------------
// Rendering: draw panel, result card, history.

function chainHTML(ctx, steps, pendingRerolls = [], view = { kind: "table", column: "all" }) {
  const { t, esc } = ctx;
  const items = steps.map((step) => {
    const rerolls = (step.rerolls ?? [])
      .map(
        (r) =>
          `<li class="rt-reroll">${esc(t(`Faccia ${r.face} (${modeText(ctx, r.mode)}): ${reasonText(ctx, r.reason)}, ritirata`, `Face ${r.face} (${modeText(ctx, r.mode)}): ${reasonText(ctx, r.reason)}, rerolled`))}</li>`,
      )
      .join("");
    const head = `<span class="rt-die">${step.sides ? `d${step.sides}` : "—"}</span> ${esc(ctx.label(step.tableName))}`;
    const text = esc(stepText(view, step, ctx.lang));
    const body = step.empty
      ? `<span class="muted">${step.missing ? t("sottotabella mancante", "missing subtable") : t("nessuna voce disponibile", "no result available")}</span>`
      : step.mode === "chosen"
        ? `<strong>${t("voce scelta", "chosen entry")}</strong> <span class="muted">(${t("nessun dado", "no die")})</span> → ${text}`
        : `<strong>${esc(String(step.face))}</strong> <span class="muted">(${esc(modeText(ctx, step.mode))})</span> → ${text}`;
    return `${rerolls}<li class="rt-step" style="--rt-depth:${step.depth ?? 0}">${head} · ${body}</li>`;
  });
  const waiting = pendingRerolls
    .map(
      (r) =>
        `<li class="rt-reroll">${esc(t(`Faccia ${r.face} (${modeText(ctx, r.mode)}): ${reasonText(ctx, r.reason)}`, `Face ${r.face} (${modeText(ctx, r.mode)}): ${reasonText(ctx, r.reason)}`))}</li>`,
    )
    .join("");
  return `<ol class="rt-chain">${items.join("")}${waiting}</ol>`;
}
function variableControls(ctx, variables, disabled) {
  const { t, esc } = ctx;
  return variables
    .map((variable) => {
      const value = variableValue(variable, ui.variables);
      const any = variable.any
        ? `<option value="${ANY}" ${value === ANY ? "selected" : ""}>${t("Qualsiasi", "Any")}</option>`
        : "";
      return `<label class="field rt-inline-field">${esc(ctx.label(variable.name))}<select data-rt-var="${esc(variable.id)}" ${disabled ? 'disabled aria-describedby="rt-busy-why"' : ""}>${any}${variable.options.map((o) => `<option value="${esc(o.value)}" ${value === o.value ? "selected" : ""}>${esc(ctx.label(o.label))}</option>`).join("")}</select></label>`;
    })
    .join("");
}
/** FG output by column and Chartopia filter_cols, shown before rolling. */
function columnControls(ctx, table, disabled) {
  const { t, esc } = ctx;
  const off = disabled ? 'disabled aria-describedby="rt-busy-why"' : "";
  const columns = [
    ["main", columnName(ctx, table, "main")],
    ...table.columns.map((c) => [c.id, ctx.label(c.name)]),
  ];
  const column = effectiveColumn(table);
  const filter = effectiveFilter(table);
  const ownFilter = ui.filter.tableId === table.id;
  const filterColumn = filter?.column ?? (ownFilter ? ui.filter.column : "all");
  const output = table.columns.length
    ? `<label class="field rt-inline-field">${t("Colonna del risultato", "Result column")}<select data-rt-column ${off}><option value="all" ${column === "all" ? "selected" : ""}>${t("Tutte le colonne", "All columns")}</option>${columns.map(([id, name]) => `<option value="${esc(id)}" ${column === id ? "selected" : ""}>${esc(name)}</option>`).join("")}</select></label>`
    : "";
  const within = table.columns.length
    ? `<label class="field rt-inline-field">${t("nella colonna", "in column")}<select data-rt-filter-column ${off}><option value="all">${t("Tutte", "All")}</option>${columns.map(([id, name]) => `<option value="${esc(id)}" ${filterColumn === id ? "selected" : ""}>${esc(name)}</option>`).join("")}</select></label>`
    : "";
  return `<div class="rt-draw-controls rt-filter">${output}<label class="field rt-inline-field">${t("Filtra per testo", "Filter by text")}<input type="search" data-rt-filter-text maxlength="${LIMITS.filter}" value="${esc(ownFilter ? ui.filter.text : "")}" placeholder="${esc(t("es. goblin", "e.g. goblin"))}" ${off}></label>${within}<button type="button" class="button quiet" data-rt-filter-clear ${off} ${filter ? "" : "hidden"}>${t("Togli filtro", "Clear filter")}</button></div>`;
}
function rowsHTML(ctx, table, { compact = false } = {}) {
  const { t, esc } = ctx;
  const slice = tablesOf(ctx.state);
  const ranges = impliedRanges(table);
  const status = tableStatus(table);
  const taken = ui.session ? takenSet(ui.session, table.id) : new Set();
  const filter = effectiveFilter(table);
  const rows = table.results.map((result, i) => {
    const range = ranges[i];
    const filtered = !rowMatches(table, result, ui.variables);
    const textOut = !textMatches(table, result, filter);
    const drawn = !table.replacement && (result.drawn || taken.has(result.id));
    const unreachable = range.from > table.sides;
    const sub = result.subtableId ? getTable(slice, result.subtableId) : null;
    const tags = [
      drawn ? `<span class="badge rt-badge-drawn">${t("Estratta", "Drawn")}</span>` : "",
      filtered
        ? `<span class="badge">${t("Esclusa dalle variabili", "Excluded by variables")}</span>`
        : "",
      textOut
        ? `<span class="badge">${t("Esclusa dal filtro", "Excluded by the filter")}</span>`
        : "",
      unreachable
        ? `<span class="badge rt-badge-warn">${t("Irraggiungibile", "Unreachable")}</span>`
        : "",
    ].join("");
    const classes = `${drawn ? "is-drawn" : ""} ${filtered || textOut ? "is-filtered" : ""}`;
    const main = `${esc(ctx.label(result.text))}${sub ? ` <small class="muted">→ ${esc(ctx.label(sub.name))} (d${sub.sides})</small>` : ""}`;
    return { range, tags, classes, main, result };
  });
  const warning = status.normalized
    ? ""
    : `<p class="rt-warning" role="note">${esc(
        status.uncovered
          ? t(
              `Le facce ${rangeText(status.uncovered)} del d${table.sides} non hanno voci: si ritira.`,
              `Faces ${rangeText(status.uncovered)} of the d${table.sides} have no result: roll again.`,
            )
          : t(
              `I pesi sommano ${status.total} ma il dado è d${table.sides}: alcune voci non si possono ottenere.`,
              `Weights add up to ${status.total} but the die is d${table.sides}: some results cannot come up.`,
            ),
      )}</p>`;
  const list = table.columns.length
    ? `<div class="table-wrap rt-col-wrap"><table class="rt-col-table"><thead><tr><th scope="col">d${table.sides}</th><th scope="col">${esc(columnName(ctx, table, "main"))}</th>${table.columns.map((c) => `<th scope="col">${esc(ctx.label(c.name))}</th>`).join("")}<th scope="col"><span class="rt-visually-hidden">${t("Stato", "Status")}</span></th></tr></thead><tbody>${rows
        .map(
          (r) =>
            `<tr class="${r.classes}"><td class="rt-range">${rangeText(r.range)}</td><td>${r.main}</td>${table.columns.map((c) => `<td>${esc(ctx.label(r.result.cells?.[c.id] ?? ""))}</td>`).join("")}<td>${r.tags ? `<span class="rt-tags">${r.tags}</span>` : ""}</td></tr>`,
        )
        .join("")}</tbody></table></div>`
    : `<ol class="rt-range-list">${rows.map((r) => `<li class="${r.classes}"><span class="rt-range">${rangeText(r.range)}</span><span>${r.main}</span>${r.tags ? `<span class="rt-tags">${r.tags}</span>` : ""}</li>`).join("")}</ol>`;
  return `<div class="rt-rows ${compact ? "is-compact" : ""}"><p class="muted">d${table.sides} · ${table.results.length} ${t("voci", "results")}${table.columns.length ? ` · ${table.columns.length + 1} ${t("colonne", "columns")}` : ""} · ${table.replacement ? t("con reinserimento", "with replacement") : t("senza reinserimento", "without replacement")}${table.playersCanUse ? " · " + t("usabile dai giocatori", "players can use") : ""}</p>${warning}${list}</div>`;
}
function outputHTML(ctx, entry, o) {
  const { t, esc } = ctx;
  const reversed = o.status === "reversed" ? ` · ${t("annullato", "undone")}` : "";
  if (o.kind === "chat")
    return `<li>${o.to ? esc(t("Sussurrata in chat ", "Whispered in chat ") + toWhom(ctx, o.to)) : t("Inviata in chat", "Sent to chat")} · ${timeText(ctx, o.at)}${reversed}</li>`;
  if (o.kind === "loot" && o.target === "parcel")
    return `<li>${esc(t(`Bottino: ${o.name} ×${o.quantity} nel pacchetto «${o.parcelName}» (nascosto finché non lo mostri)`, `Loot: ${o.name} ×${o.quantity} in the parcel “${o.parcelName}” (hidden until you show it)`))}${reversed}${o.status === "reversed" ? "" : ` <button type="button" class="button quiet" data-rt-open-loot>${t("Apri il bottino", "Open loot")}</button>`}</li>`;
  if (o.kind === "loot")
    return `<li>${esc(t(`Bottino: ${o.name} ×${o.quantity} a ${ctx.state.actors[o.actorId]?.name ?? "?"}`, `Loot: ${o.name} ×${o.quantity} to ${ctx.state.actors[o.actorId]?.name ?? "?"}`))}${reversed}</li>`;
  if (o.kind === "encounter")
    return `<li>${esc(o.created ? t(`Nuovo incontro: «${o.name}»`, `New encounter: “${o.name}”`) : t(`Nota nell’incontro «${o.name}»`, `Note in the encounter “${o.name}”`))}${reversed}${o.status === "reversed" ? "" : ` <button type="button" class="button quiet" data-rt-open-encounter="${esc(o.encounterId)}">${t("Apri", "Open")}</button>`}</li>`;
  const stale =
    entry.status === "reversed"
      ? ` <small class="rt-warning-text">${t("L’estrazione è annullata: correggi il resoconto dal Diario.", "The draw was undone: correct the recap from the Journal.")}</small>`
      : "";
  return `<li>${t("Nel diario della campagna", "In the campaign journal")} <button type="button" class="button quiet" data-rt-open-journal="${esc(o.campaignEntryId)}">${t("Apri", "Open")}</button>${stale}</li>`;
}
/** B17 whisper targets for a shared result: the DM, or characters the sender does not play. */
function chatTargets(ctx) {
  if (!ctx.state.ext?.[chat.CHAT_ID]) return [];
  return chat
    .whisperTargets(ctx.state, ctx.role)
    .filter(
      (target) =>
        target.type === "dm" ||
        (target.type === "actor" && !ownsActor(ctx.state.actors?.[target.actorId], ctx.role)),
    );
}
/** "al DM" / "a Livia" (to the DM / to Livia) for whisper badges and output lines. */
const toWhom = (ctx, to) =>
  to?.type === "dm"
    ? ctx.t("al DM", "to the DM")
    : ctx.t(`a ${chatTargetName(ctx, to)}`, `to ${chatTargetName(ctx, to)}`);
const chatTargetName = (ctx, to) =>
  to?.type === "dm"
    ? ctx.t("DM", "DM")
    : (ctx.state.actors?.[to?.actorId]?.name ?? to?.name ?? "?");
/**
 * The chat card of a result (Foundry draw card FVT-097, Roll20 table roll R20-104): table,
 * die, faces with their mode, then the result.
 */
export function chatCardText(ctx, entry) {
  // The title already names the table drawn from: a subtable or template step names its own.
  const steps = entry.steps
    .filter((step) => !step.empty)
    .map((step) => {
      const own =
        entry.kind !== "template" && step.parent === null ? "" : `${ctx.label(step.tableName)} `;
      return step.mode === "chosen"
        ? `${own}${ctx.t("voce scelta, nessun dado", "chosen entry, no die")}`
        : `${own}d${step.sides}: ${step.face} (${modeText(ctx, step.mode)})`;
    });
  return `${ctx.label(entry.title)} · ${steps.join(" · ")} → ${ctx.label(entry.text)}`.slice(
    0,
    chat.MAX_TEXT,
  );
}
/** Sends a result to chat: a B17 message (public or whispered) when the chat exists. */
function sendToChat(ctx, entryId, toId = "all") {
  const entry = projectHistory(tablesOf(ctx.state), historyOf(ctx.state), ctx.role).find(
    (e) => e.id === entryId,
  );
  if (!entry) return false;
  const room = Boolean(ctx.state.ext?.[chat.CHAT_ID]);
  const target = toId !== "all" ? chatTargets(ctx).find((c) => c.id === toId) : null;
  if (toId !== "all" && !target) {
    ctx.toast(ctx.t("Destinatario non disponibile.", "Recipient unavailable."), true);
    return false;
  }
  const text = chatCardText(ctx, entry);
  const to = target
    ? {
        id: target.id,
        type: target.type,
        actorId: target.actorId ?? null,
        name: target.name ?? "DM",
      }
    : null;
  const readers = target ? chat.whisperReaders(ctx.state, ctx.role, target) : null;
  const label = `${ctx.label(entry.title)}: ${ctx.label(entry.text)}`;
  return act(
    ctx,
    // With the B17 chat the message is the trace (its "Chat · " label is not repeated as
    // an event); a whisper's label stays with its sender.
    room ? chat.LABEL_PREFIX + label : label,
    (draft) => {
      const store = draft.ext?.[chat.CHAT_ID];
      const message = store
        ? chat.postMessage(
            store,
            chat.composeMessage(draft, ctx.role, { text, mode: "ooc", to: toId }, { now: now() }),
          )
        : null;
      shareToChat(tablesOf(draft), historyOf(draft), entryId, ctx.role, {
        to,
        readers,
        messageId: message?.id ?? null,
      });
    },
    room
      ? { visibility: target ? "private" : "shared", undoable: false }
      : { visibility: "shared" },
  );
}
/** "Send to chat…": recipients like Owlbear Tables+ (everyone, the DM, chosen players). */
function openChatDialog(ctx, entryId) {
  const { t, esc } = ctx;
  const entry = projectHistory(tablesOf(ctx.state), historyOf(ctx.state), ctx.role).find(
    (e) => e.id === entryId,
  );
  if (!entry) return;
  const sent = new Set(entry.outputs.filter((o) => o.kind === "chat" && o.to).map((o) => o.to.id));
  const targets = chatTargets(ctx).filter((target) => !sent.has(target.id));
  ctx.dialog(
    t("Invia in chat", "Send to chat"),
    `<p class="rt-chat-preview">${esc(chatCardText(ctx, entry))}</p><label class="field">${t("A", "To")}<select name="to"><option value="all">${t("Tutti", "Everyone")}</option>${targets.map((target) => `<option value="${esc(target.id)}">${esc(target.type === "dm" ? t("Solo il DM", "The DM only") : target.name)}</option>`).join("")}</select></label><p class="muted">${t("Un sussurro lo leggono solo il destinatario e chi lo invia, in chat e nello storico. Un messaggio inviato si corregge dalla chat.", "A whisper is read only by its recipient and its sender, in chat and in the history. A sent message is corrected from the chat.")}</p>`,
    {
      submitLabel: t("Invia", "Send"),
      onSubmit: (data) => {
        if (!sendToChat(ctx, entryId, String(data.get("to") ?? "all"))) return false;
      },
    },
  );
}
function entryHTML(ctx, entry, { card = false } = {}) {
  const { t, esc } = ctx;
  const statusBadge =
    entry.status === "reversed"
      ? `<span class="badge rt-badge-warn">${t("Annullata con correzione", "Undone with correction")}</span>`
      : entry.status === "incomplete"
        ? `<span class="badge rt-badge-warn">${t("Interrotta: non usata", "Interrupted: not used")}</span>`
        : "";
  const whispers = entry.outputs.filter((o) => o.kind === "chat" && o.to && o.status === "applied");
  const visibility = entry.shared
    ? `<span class="badge">${t("Condivisa in chat", "Shared in chat")}</span>`
    : whispers.length
      ? `<span class="badge">${esc(t("Sussurrata ", "Whispered ") + whispers.map((o) => toWhom(ctx, o.to)).join(", "))}</span>`
      : `<span class="badge">${entry.visibleTo.length === 1 ? t("Solo DM", "DM only") : ctx.role === "dm" ? t("Giocatore e DM", "Player and DM") : t("Tu e il DM", "You and the DM")}</span>`;
  const outputs = entry.outputs.map((o) => outputHTML(ctx, entry, o)).join("");
  const accepted = entry.status === "accepted";
  const canChat = accepted && !entry.shared && (ctx.role === "dm" || entry.by === ctx.role);
  const dm = ctx.role === "dm";
  const encounterReady = Boolean(ctx.state.ext?.[ENCOUNTER_SLICE]);
  const actions = accepted
    ? `<div class="toolbar rt-outputs-actions">${canChat ? `<button type="button" class="button primary" data-rt-chat="${esc(entry.id)}" ${card ? "data-rt-result-focus" : ""} ${ctx.state.ext?.[chat.CHAT_ID] ? 'aria-haspopup="dialog"' : ""}>${ctx.state.ext?.[chat.CHAT_ID] ? t("Invia in chat…", "Send to chat…") : t("Invia in chat", "Send to chat")}</button>` : ""}${dm ? `<button type="button" class="button" data-rt-journal="${esc(entry.id)}" ${card && !canChat ? "data-rt-result-focus" : ""}>${t("Aggiungi al diario…", "Add to journal…")}</button><button type="button" class="button" data-rt-loot="${esc(entry.id)}">${t("Aggiungi al bottino…", "Add to loot…")}</button>${encounterReady ? `<button type="button" class="button" data-rt-encounter="${esc(entry.id)}">${t("Aggiungi a un incontro…", "Add to an encounter…")}</button>` : ""}` : ""}</div>`
    : "";
  const root = entry.steps.find((s) => s.parent === null && s.cells?.length);
  const meta = [
    ...entry.variables.map((v) => `${esc(ctx.label(v.name))}: ${esc(ctx.label(v.value))}`),
    entry.column && entry.column !== "all" && root
      ? esc(
          t("Colonna", "Column") +
            ": " +
            (entry.column === "main"
              ? ctx.label(root.mainColumn) || t("Voce", "Result")
              : ctx.label(root.cells.find((c) => c.id === entry.column)?.name ?? "")),
        )
      : "",
    entry.filter
      ? esc(
          t(`Filtro «${entry.filter.text}»`, `Filter “${entry.filter.text}”`) +
            (entry.filter.column && entry.filter.column !== "all" && root
              ? ` (${entry.filter.column === "main" ? ctx.label(root.mainColumn) || t("Voce", "Result") : ctx.label(root.cells.find((c) => c.id === entry.filter.column)?.name ?? "")})`
              : ""),
        )
      : "",
  ].filter(Boolean);
  const vars = meta.length ? `<p class="muted">${meta.join(" · ")}</p>` : "";
  const notes = `<div class="rt-notes">${entry.notes.map((n) => `<p class="rt-note"><small>${timeText(ctx, n.at)} · ${t("nota personale", "personal note")}</small>${esc(n.text)}</p>`).join("")}<div class="rt-note-form"><label class="field">${t("Nota personale", "Personal note")}<input data-rt-note-input="${esc(entry.id)}" maxlength="${LIMITS.note}" placeholder="${esc(t("Visibile solo a te", "Visible only to you"))}"></label><button type="button" class="button" data-rt-note="${esc(entry.id)}">${t("Aggiungi nota", "Add note")}</button></div></div>`;
  const view = { kind: entry.kind, column: entry.column ?? "all" };
  return `<article class="rt-entry ${card ? "rt-result" : ""}" data-status="${esc(entry.status)}" data-entry="${esc(entry.id)}"><header><div><strong>${esc(ctx.label(entry.title))}</strong><small class="muted">${timeText(ctx, entry.at)} · ${esc(whoText(ctx, entry.by))}${entry.kind === "template" ? " · " + t("modello", "template") : entry.kind === "token" ? " · " + t("pedina a più facce", "multi-sided token") : ""}</small></div><div class="rt-tags">${visibility}${statusBadge}</div></header><p class="rt-entry-text">${esc(ctx.label(entry.text))}</p>${chainHTML(ctx, entry.steps, entry.pendingRerolls, view)}${vars}${outputs ? `<ul class="rt-outputs">${outputs}</ul>` : ""}${card && accepted && !entry.outputs.length ? `<p class="muted">${dm ? t("Registrata nello storico. Nulla cambia nel gioco finché non scegli chat, diario, bottino o incontro.", "Recorded in the history. Nothing changes in the game until you choose chat, journal, loot or an encounter.") : t("Registrata nello storico. Nulla cambia nel gioco finché non la invii in chat.", "Recorded in the history. Nothing changes in the game until you send it to chat.")}</p>` : ""}${actions}${notes}</article>`;
}
function pendingHTML(ctx) {
  const { t, esc } = ctx;
  const slice = tablesOf(ctx.state);
  const session = ui.session;
  const step = pendingStep(slice, session);
  const blocked = sessionBlocked(ctx, session);
  const offlineNote = blocked
    ? `<p class="rt-notice" role="status" id="rt-offline-session">${esc(ctx.label(OFFLINE_DRAW))}</p>`
    : "";
  if (!step)
    return `<div class="rt-pending" role="group" aria-labelledby="rt-pending-title"><h3 id="rt-pending-title">${t("Estrazione completa, non ancora registrata", "Draw complete, not recorded yet")}</h3>${chainHTML(ctx, session.steps, session.rerolls, session)}<p class="rt-entry-text">${esc(sessionText(session, ctx.lang))}</p>${offlineNote}<div class="toolbar"><button type="button" class="button primary" data-rt-finish>${t("Registra l’estrazione", "Record the draw")}</button><button type="button" class="button quiet" data-rt-cancel>${sessionHasDigital(session) ? t("Non usarla (resta nello storico)", "Do not use it (stays in the history)") : t("Annulla estrazione", "Cancel draw")}</button></div></div>`;
  const choices =
    ctx.role === "dm"
      ? availableRows(
          step.table,
          session.variables,
          takenSet(session, step.tableId),
          session.kind === "table" && step.tableId === session.tableId ? session.filter : null,
        )
      : [];
  const ranges = impliedRanges(step.table);
  return `<div class="rt-pending" role="group" aria-labelledby="rt-pending-title"><h3 id="rt-pending-title">${esc(t(`Ora: d${step.sides} · ${ctx.label(step.table.name)}`, `Now: d${step.sides} · ${ctx.label(step.table.name)}`))}</h3>${session.steps.length || session.rerolls.length ? chainHTML(ctx, session.steps, session.rerolls, session) : ""}${ui.notice ? `<p class="rt-notice" role="status">${esc(ui.notice)}</p>` : ""}${offlineNote}
    <div class="rt-pending-grid"><div class="rt-physical"><label class="field">${esc(t(`Valore del dado fisico (1–${step.sides})`, `Physical die value (1–${step.sides})`))}<input type="number" inputmode="numeric" min="1" max="${step.sides}" data-rt-face></label><button type="button" class="button primary" data-rt-physical>${t("Registra tiro fisico", "Record physical roll")}</button></div>
    <div class="toolbar"><button type="button" class="button" data-rt-digital ${blocked ? 'disabled aria-describedby="rt-offline-session"' : ""}>${ctx.icon("dice")} ${esc(t(`Tira il d${step.sides} in digitale`, `Roll the d${step.sides} digitally`))}</button></div>
    ${choices.length ? `<div class="rt-choose"><label class="field">${t("Scegli voce", "Choose entry")}<select data-rt-choose-row>${choices.map((r) => `<option value="${esc(r.id)}">${esc(rangeText(ranges[step.table.results.indexOf(r)]))} · ${esc(ctx.label(r.text))}</option>`).join("")}</select></label><button type="button" class="button" data-rt-choose>${t("Usa questa voce", "Use this entry")}</button></div>` : ""}</div>
    <button type="button" class="button quiet" data-rt-cancel>${t("Annulla estrazione", "Cancel draw")}</button></div>`;
}
/** Draw panel shared by the Table drawer and Preparation (`fixed` = "table:<id>"). */
function renderDrawPanel(ctx, fixed = null) {
  const { t, esc } = ctx;
  const slice = tablesOf(ctx.state);
  const source = currentSource(ctx, fixed);
  const { tables, templates } = sourcesFor(ctx);
  if (!source)
    return `<div class="empty-state"><h3>${t("Nessuna tabella disponibile", "No table available")}</h3><p>${ctx.role === "dm" ? t("Crea una tabella in Preparazione › Tabelle e mazzi.", "Create a table in Preparation › Tables and decks.") : t("Il DM non ha ancora condiviso tabelle con i giocatori.", "The DM has not shared any table with players yet.")}</p></div>`;
  const busy = Boolean(ui.session && ui.sessionRole === ctx.role);
  const value = `${source.kind}:${source.id}`;
  const select = fixed
    ? ""
    : `<label class="field rt-inline-field">${t("Estrai da", "Draw from")}<select data-rt-source ${busy ? 'disabled aria-describedby="rt-busy-why"' : ""}><optgroup label="${esc(t("Tabelle", "Tables"))}">${tables.map((tb) => `<option value="table:${esc(tb.id)}" ${value === `table:${tb.id}` ? "selected" : ""}>${esc(ctx.label(tb.name))} (d${tb.sides})</option>`).join("")}</optgroup>${templates.length ? `<optgroup label="${esc(t("Modelli di testo", "Text templates"))}">${templates.map((tp) => `<option value="template:${esc(tp.id)}" ${value === `template:${tp.id}` ? "selected" : ""}>${esc(ctx.label(tp.name))}</option>`).join("")}</optgroup>` : ""}</select></label>`;
  const variables = sourceVariables(slice, sourceTableIds(slice, source, ctx.lang));
  const table = source.kind === "table" ? getTable(slice, source.id) : null;
  const template = source.kind === "template" ? getTemplate(slice, source.id) : null;
  const refs = template ? templateRefs(slice, template, ctx.lang) : [];
  const missing = refs.filter((ref) => !ref.table);
  const latest = ui.lastEntryId
    ? projectHistory(slice, historyOf(ctx.state), ctx.role).find((e) => e.id === ui.lastEntryId)
    : null;
  // The last result card belongs to the source it was drawn from.
  const last =
    latest &&
    (source.kind === "table" ? latest.tableId === source.id : latest.templateId === source.id)
      ? latest
      : null;
  const blocked = offlineBlocked(ctx, source);
  const off = missing.length || blocked ? "disabled" : "";
  const described = blocked
    ? 'aria-describedby="rt-offline-draw"'
    : missing.length
      ? 'aria-describedby="rt-missing-why"'
      : "";
  const start = busy
    ? ""
    : `${blocked ? `<p class="rt-notice" role="status" id="rt-offline-draw">${esc(ctx.label(OFFLINE_DRAW))}</p>` : ""}<div class="toolbar rt-start"><button type="button" class="button primary" data-rt-start="digital" ${off} ${described}>${ctx.icon("dice")} ${template ? t("Genera con dadi digitali", "Generate with digital dice") : t("Estrai con dadi digitali", "Draw with digital dice")}</button><button type="button" class="button" data-rt-start="physical" ${off} ${described}>${t("Inserisci tiro fisico", "Enter physical roll")}</button>${ctx.role === "dm" ? `<button type="button" class="button" data-rt-start="choose" ${off} ${described}>${t("Scegli voce", "Choose entry")}</button>` : ""}</div>`;
  const templatePreview = template
    ? `<div class="rt-template-preview"><p class="rt-template-text">${esc(ctx.label(template.text))}</p>${missing.length ? `<p class="error" role="alert" id="rt-missing-why">${esc(t(`Riferimenti non trovati: ${missing.map((m) => m.name).join(", ")}. Correggi i nomi tra parentesi quadre nel modello o crea quelle tabelle.`, `References not found: ${missing.map((m) => m.name).join(", ")}. Fix the names in square brackets in the template or create those tables.`))}</p>` : `<p class="muted">${esc(t(`Tabelle usate: ${refs.map((r) => ctx.label(r.table.name)).join(", ")}`, `Tables used: ${refs.map((r) => ctx.label(r.table.name)).join(", ")}`))}</p>`}</div>`
    : "";
  const busyWhy =
    busy && (select || variables.length || table)
      ? `<p class="muted rt-why" id="rt-busy-why">${t("Estrazione in corso: registrala o annullala qui sotto per cambiare tabella, variabili o filtri.", "Draw in progress: record or cancel it below to change table, variables or filters.")}</p>`
      : "";
  const drawn = table?.results.some((r) => r.drawn);
  return `<section class="rt-draw" aria-label="${esc(t("Estrazione", "Draw"))}"><div class="rt-draw-controls">${select}${variableControls(ctx, variables, busy)}</div>${table ? columnControls(ctx, table, busy) : ""}${busyWhy}${templatePreview}${start}${busy ? pendingHTML(ctx) : ""}${last ? entryHTML(ctx, last, { card: true }) : ""}${table ? rowsHTML(ctx, table) : ""}${table && ctx.role === "dm" && !fixed ? `<div class="toolbar">${!table.replacement ? `<button type="button" class="button" data-rt-reset="${esc(table.id)}" ${drawn ? "" : 'disabled aria-describedby="rt-reset-why"'}>${t("Reimposta voci estratte", "Reset drawn results")}</button>` : ""}<button type="button" class="button" data-rt-place="${esc(table.id)}">${t("Metti sul Tavolo come pedina a più facce", "Place on the Table as a multi-sided token")}</button></div>${!table.replacement && !drawn ? `<p class="muted rt-why" id="rt-reset-why">${t("Nessuna voce estratta: non c’è niente da reimpostare.", "No result drawn: there is nothing to reset.")}</p>` : ""}` : ""}</section>`;
}
function historyHTML(ctx) {
  const { t } = ctx;
  const entries = projectHistory(tablesOf(ctx.state), historyOf(ctx.state), ctx.role);
  if (!entries.length)
    return `<div class="empty-state"><h3>${t("Nessuna estrazione", "No draws yet")}</h3><p>${t("Le estrazioni restano qui con dadi, variabili, destinazioni e note personali.", "Draws stay here with dice, variables, destinations and personal notes.")}</p></div>`;
  return `<div class="rt-history">${entries
    .slice(0, 40)
    .map((entry) => entryHTML(ctx, entry))
    .join("")}</div>`;
}
/** Undo with its target written out (touch users never see a hover title). */
function undoHTML(ctx) {
  const can = Boolean(ctx.canUndo?.());
  const label = can ? (ctx.undoLabel?.() ?? "") : "";
  return `<div class="rt-undo"><button type="button" class="button quiet" data-rt-undo ${can ? "" : "disabled"} aria-describedby="rt-undo-target">${ctx.icon("undo")} ${ctx.t("Annulla ultima modifica", "Undo last change")}</button><small class="muted rt-undo-target" id="rt-undo-target" data-rt-undo-target>${ctx.esc(label ? ctx.t("Annullerebbe: ", "Would undo: ") + label : ctx.t("Niente da annullare: qui compare la tua prossima modifica.", "Nothing to undo: your next change shows here."))}</small></div>`;
}
function offlineHTML(ctx) {
  return ctx.offline
    ? `<p class="rt-notice" role="status">${ctx.t("Senza rete: le estrazioni del DM su tabelle private restano possibili; chat, bottino, mazzi e tabelle condivise attendono la connessione.", "Offline: DM draws on private tables still work; chat, loot, decks and shared tables wait for the connection.")}</p>`
    : "";
}

export function renderDrawer(ctx) {
  const { t } = ctx;
  if (ui.sessionRole && ui.sessionRole !== ctx.role) ui.session = null;
  const tabs = [
    ["tables", t("Tabelle", "Tables")],
    ["decks", t("Mazzi", "Decks")],
    ["history", t("Storico", "History")],
  ];
  const body =
    ui.drawerTab === "decks"
      ? renderDeckPanel(ctx, deckApi)
      : ui.drawerTab === "history"
        ? historyHTML(ctx)
        : renderDrawPanel(ctx) + tokensListHTML(ctx);
  return `<div class="rt-drawer"><div class="rt-drawer-top"><nav class="tabs rt-tabs" aria-label="${t("Tabelle e mazzi", "Tables and decks")}">${tabs.map(([id, name]) => `<button type="button" class="${ui.drawerTab === id ? "active" : ""}" data-rt-tab="${id}" ${ui.drawerTab === id ? 'aria-current="page"' : ""}>${name}</button>`).join("")}</nav>${undoHTML(ctx)}</div>${offlineHTML(ctx)}${body}</div>`;
}

// ---------------------------------------------------------------------------------------
// Binding (drawer and Preparation share the draw and history handlers).

function openLootDialog(ctx, entryId) {
  const { t, esc } = ctx;
  const entry = projectHistory(tablesOf(ctx.state), historyOf(ctx.state), ctx.role).find(
    (e) => e.id === entryId,
  );
  if (!entry) return;
  const recipients = deckRecipients(ctx.state);
  const parcels = Boolean(ctx.state.ext?.[LOOT_SLICE]);
  const scene = ctx.state.scenes?.find((s) => s.id === ctx.state.activeSceneId);
  const leaf =
    [...entry.steps].reverse().find((s) => !s.empty && s.parent === null) ?? entry.steps[0];
  const options = [
    parcels
      ? `<option value="parcel">${esc(t(`Pacchetto nascosto della scena «${scene?.name ?? ""}»`, `Hidden parcel of the scene “${scene?.name ?? ""}”`))}</option>`
      : "",
    ...recipients.map(
      (a) =>
        `<option value="actor:${esc(a.id)}">${esc(t(`Inventario di ${a.name}`, `${a.name}'s inventory`))}</option>`,
    ),
  ].join("");
  ctx.dialog(
    t("Aggiungi al bottino", "Add to loot"),
    `<p class="muted">${esc(ctx.label(entry.text))}</p><label class="field">${t("Destinazione", "Destination")}<select name="destination">${options}</select></label><div class="form-grid"><label class="field">${t("Quantità", "Quantity")}<input type="number" name="quantity" min="1" max="99" value="1" required></label><label class="field">${t("Valore in mo (facoltativo, pacchetto)", "Value in gp (optional, parcel)")}<input type="number" name="value" min="0" step="0.01" inputmode="decimal"></label></div><label class="field">${t("Nome dell’oggetto", "Item name")}<input name="name" maxlength="${LIMITS.name}" required value="${esc(ctx.label(leaf?.text ?? entry.text).slice(0, LIMITS.name))}"></label><p class="muted">${parcels ? t("Nel pacchetto l’oggetto resta nascosto ai giocatori finché non mostri il pacchetto da Bottino; da lì si distribuisce. ", "In the parcel the item stays hidden from players until you show the parcel from Loot; it is handed out from there. ") : ""}${t("Nell’inventario entra subito nella scheda. Annulla ultima modifica lo toglie.", "An inventory item enters the sheet at once. Undo last change removes it.")}</p>`,
    {
      submitLabel: t("Aggiungi al bottino", "Add to loot"),
      onSubmit: (data) => {
        const destination = String(data.get("destination") ?? "");
        const quantity = Number(data.get("quantity"));
        const name = String(data.get("name") ?? "").trim();
        const value = String(data.get("value") ?? "").trim();
        const actor = destination.startsWith("actor:")
          ? ctx.state.actors[destination.slice(6)]
          : null;
        act(
          ctx,
          actor
            ? t(
                `Bottino a ${actor.name}: ${name} ×${quantity}`,
                `Loot to ${actor.name}: ${name} ×${quantity}`,
              )
            : t(
                `Bottino nel pacchetto della scena: ${name} ×${quantity}`,
                `Loot in the scene parcel: ${name} ×${quantity}`,
              ),
          (draft) =>
            addLoot(
              draft,
              tablesOf(draft),
              historyOf(draft),
              entryId,
              { destination, name, quantity, valueGp: value === "" ? null : Number(value) },
              ctx.role,
            ),
          // A hidden parcel is DM preparation: its audit label stays private.
          { throwErrors: true, visibility: actor ? "shared" : "private" },
        );
      },
    },
  );
}
function openEncounterDialog(ctx, entryId) {
  const { t, esc } = ctx;
  const entry = projectHistory(tablesOf(ctx.state), historyOf(ctx.state), ctx.role).find(
    (e) => e.id === entryId,
  );
  const builder = ctx.state.ext?.[ENCOUNTER_SLICE];
  if (!entry || !builder) return;
  const summary = `${ctx.label(entry.text)}\n(${ctx.label(entry.title)}: ${entry.steps
    .filter((s) => !s.empty)
    .map((s) => `d${s.sides} ${s.mode === "chosen" ? t("scelta", "chosen") : s.face}`)
    .join(", ")})`;
  ctx.dialog(
    t("Aggiungi a un incontro", "Add to an encounter"),
    `<label class="field">${t("Incontro", "Encounter")}<select name="encounter"><option value="">${t("Nuovo incontro", "New encounter")}</option>${builder.encounters.map((e) => `<option value="${esc(e.id)}">${esc(t(`Aggiungi la nota a «${e.name}»`, `Add the note to “${e.name}”`))}</option>`).join("")}</select></label><label class="field">${t("Nome del nuovo incontro", "New encounter name")}<input name="name" maxlength="100" value="${esc(ctx.label(entry.text).slice(0, 100))}"></label><label class="field">${t("Nota dell’incontro (riassunto)", "Encounter note (summary)")}<textarea name="summary" rows="4" maxlength="1500">${esc(summary)}</textarea></label><p class="muted">${t("Nessuna creatura viene aggiunta in automatico: le scegli nel costruttore d’incontri. Annulla ultima modifica toglie l’incontro creato o la nota.", "No creature is added automatically: you choose them in the encounter builder. Undo last change removes the created encounter or the note.")}</p>`,
    {
      submitLabel: t("Aggiungi all’incontro", "Add to the encounter"),
      onSubmit: (data) => {
        const encounterId = String(data.get("encounter") ?? "");
        const name = String(data.get("name") ?? "").trim();
        let output = null;
        act(
          ctx,
          encounterId
            ? t("Esito nella nota di un incontro", "Result in an encounter note")
            : t(`Nuovo incontro da una tabella: ${name}`, `New encounter from a table: ${name}`),
          (draft) =>
            (output = addEncounterOutput(
              draft,
              tablesOf(draft),
              historyOf(draft),
              entryId,
              { encounterId, name, summary: data.get("summary"), lang: ctx.lang },
              ctx.role,
            )),
          // Encounter preparation is the DM's own (like the encounter builder's drafts).
          { throwErrors: true, local: true, visibility: "private" },
        );
        ctx.toast(
          output.created
            ? t(`Incontro creato: ${output.name}.`, `Encounter created: ${output.name}.`)
            : t(`Nota aggiunta a ${output.name}.`, `Note added to ${output.name}.`),
        );
      },
    },
  );
}
const ACCESS = {
  private: ["Solo io", "Only me"],
  dms: ["Io e i DM", "Me and the DMs"],
  campaign: ["Gruppo della campagna", "Campaign group"],
};
function journalRun(state, ctx, entryId, { title, body, access }, draftId) {
  content.createCampaignDraft(
    state,
    { id: draftId, kind: "recap", campaignId: state.campaign.id },
    ctx.role,
  );
  const draft = content.getCampaignDraft(state, draftId, ctx.role);
  content.saveCampaignDraft(
    state,
    draftId,
    { data: { ...draft.data, title, body }, access: { mode: access, grants: [] } },
    ctx.role,
  );
  const preview = content.previewCampaignDraft(state, draftId, ctx.role);
  if (!preview.canApply) throw refuse(preview.errors[0].it, preview.errors[0].en);
  const result = content.applyCampaignDraft(
    state,
    draftId,
    { reviewKey: preview.reviewKey },
    ctx.role,
    {
      online: !ctx.offline,
    },
  );
  addJournalOutput(
    tablesOf(state),
    historyOf(state),
    entryId,
    { campaignEntryId: result.entryId, access },
    ctx.role,
  );
  return { result, commit: preview.commit };
}
/** FG output to story (R20-115): a campaign recap entry through the campaign content API. */
export function sendToJournal(ctx, entryId, fields) {
  const draftId = `rt-${entryId}-${globalThis.crypto.randomUUID().slice(0, 6)}`;
  const dry = journalRun(clone(ctx.state), ctx, entryId, fields, draftId);
  let result = null;
  ctx.commit(
    ctx.t(`Esito nel diario: ${fields.title}`, `Result in the journal: ${fields.title}`),
    (draft) => {
      result = journalRun(draft, ctx, entryId, fields, draftId).result;
    },
    dry.commit,
  );
  return result;
}
function openJournalDialog(ctx, entryId) {
  const { t, esc } = ctx;
  const entry = projectHistory(tablesOf(ctx.state), historyOf(ctx.state), ctx.role).find(
    (e) => e.id === entryId,
  );
  if (!entry) return;
  const body = `${ctx.label(entry.text)}\n\n${entry.steps
    .filter((s) => !s.empty)
    .map(
      (s) =>
        `d${s.sides} ${ctx.label(s.tableName)}: ${s.mode === "chosen" ? t("scelta", "chosen") : s.face} → ${ctx.label(s.text)}`,
    )
    .join("\n")}`;
  ctx.dialog(
    t("Aggiungi al diario", "Add to journal"),
    `<label class="field">${t("Titolo", "Title")}<input name="title" maxlength="120" required value="${esc(ctx.label(entry.title))}"></label><label class="field">${t("Testo", "Text")}<textarea name="body" rows="5">${esc(body)}</textarea></label><label class="field">${t("Chi può leggerlo", "Who can read it")}<select name="access">${Object.entries(
      ACCESS,
    )
      .map(([value, [it, en]]) => `<option value="${value}">${t(it, en)}</option>`)
      .join(
        "",
      )}</select></label><p class="muted">${t("Diventa un resoconto nel Diario della campagna, con cronologia e condivisione proprie. Da quel momento l’estrazione non si annulla da qui: il resoconto si corregge dal Diario.", "It becomes a recap in the campaign Journal, with its own history and sharing. From then on the draw is not undone from here: the recap is corrected from the Journal.")}</p>`,
    {
      submitLabel: t("Aggiungi al diario", "Add to journal"),
      onSubmit: (data) => {
        sendToJournal(ctx, entryId, {
          title: String(data.get("title") ?? "").trim(),
          body: String(data.get("body") ?? "").trim(),
          access: Object.hasOwn(ACCESS, data.get("access")) ? data.get("access") : "private",
        });
        ctx.toast(t("Esito aggiunto al diario.", "Result added to the journal."));
      },
    },
  );
}
function bindDraw(root, ctx, fixed = null) {
  const on = (selector, event, handler) =>
    root.querySelectorAll(selector).forEach((el) => el.addEventListener(event, () => handler(el)));
  const source = currentSource(ctx, fixed);
  const tableId = source?.kind === "table" ? source.id : null;
  const ownFilter = () =>
    ui.filter.tableId === tableId ? ui.filter : { tableId, text: "", column: "all" };
  on("[data-rt-source]", "change", (el) => {
    ui.source = el.value;
    ui.lastEntryId = null;
    ctx.render();
  });
  // Choices made before rolling update the draw state and patch the range list in place.
  // A full re-render on "change" (fired on blur, while the pointer is already down on the
  // next button) would replace that button and lose its click, and send Tab back.
  const patchRows = () => {
    const table = tableId ? getTable(tablesOf(ctx.state), tableId) : null;
    const rows = root.querySelector(".rt-draw .rt-rows");
    if (table && rows) rows.outerHTML = rowsHTML(ctx, table);
    root
      .querySelectorAll("[data-rt-filter-clear]")
      .forEach((button) => (button.hidden = !effectiveFilter(table)));
  };
  on("[data-rt-var]", "change", (el) => {
    ui.variables = { ...ui.variables, [el.dataset.rtVar]: el.value };
    patchRows();
  });
  on("[data-rt-column]", "change", (el) => {
    ui.column = { tableId, value: el.value };
  });
  const applyFilter = (el) => {
    const text = String(el.value ?? "").slice(0, LIMITS.filter);
    if (text === ownFilter().text) return;
    ui.filter = { ...ownFilter(), text };
    patchRows();
  };
  on("[data-rt-filter-text]", "input", applyFilter);
  on("[data-rt-filter-text]", "change", applyFilter);
  root.querySelectorAll("[data-rt-filter-text]").forEach((el) =>
    el.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      applyFilter(el);
    }),
  );
  on("[data-rt-filter-column]", "change", (el) => {
    ui.filter = { ...ownFilter(), column: el.value };
    patchRows();
  });
  on("[data-rt-filter-clear]", "click", () => {
    ui.filter = { tableId, text: "", column: "all" };
    focusSoon("[data-rt-filter-text]");
    ctx.render();
  });
  on("[data-rt-start]", "click", (el) => startSession(ctx, el.dataset.rtStart, fixed));
  on("[data-rt-physical]", "click", () => {
    const value = root.querySelector("[data-rt-face]")?.value;
    stepSession(ctx, (slice, session) =>
      resolveFace(slice, session, Number(value === "" ? NaN : value), "physical"),
    );
  });
  root.querySelectorAll("[data-rt-face]").forEach((el) =>
    el.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      stepSession(ctx, (slice, session) =>
        resolveFace(slice, session, Number(el.value === "" ? NaN : el.value), "physical"),
      );
    }),
  );
  on("[data-rt-digital]", "click", () => {
    if (sessionBlocked(ctx, ui.session)) {
      ctx.toast(ctx.label(OFFLINE_DRAW), true);
      return;
    }
    stepSession(
      ctx,
      (slice, session) => rollCurrent(slice, session, dice(ctx)) && { status: "accepted" },
    );
  });
  on("[data-rt-choose]", "click", () => {
    const rowId = root.querySelector("[data-rt-choose-row]")?.value;
    stepSession(
      ctx,
      (slice, session) => chooseRow(slice, session, rowId) && { status: "accepted" },
    );
  });
  on("[data-rt-cancel]", "click", () => cancelSession(ctx));
  on("[data-rt-finish]", "click", () => ui.session?.done && finishSession(ctx));
  on("[data-rt-reset]", "click", (el) => {
    const table = getTable(tablesOf(ctx.state), el.dataset.rtReset);
    act(
      ctx,
      ctx.t(
        `Voci estratte reimpostate: ${ctx.label(table?.name)}`,
        `Drawn results reset: ${ctx.label(table?.name)}`,
      ),
      (draft) => resetDrawn(tablesOf(draft), el.dataset.rtReset, ctx.role),
      {
        ...(table?.playersCanUse ? {} : { local: true, visibility: "private" }),
        focus: "[data-rt-start]",
      },
    );
  });
  bindHistory(root, ctx);
}
function bindHistory(root, ctx) {
  const on = (selector, handler) =>
    root
      .querySelectorAll(selector)
      .forEach((el) => el.addEventListener("click", () => handler(el)));
  // With the B17 chat a recipient is chosen first; without it the result goes to everyone.
  on("[data-rt-chat]", (el) =>
    ctx.state.ext?.[chat.CHAT_ID]
      ? openChatDialog(ctx, el.dataset.rtChat)
      : sendToChat(ctx, el.dataset.rtChat),
  );
  on("[data-rt-loot]", (el) => openLootDialog(ctx, el.dataset.rtLoot));
  on("[data-rt-journal]", (el) => openJournalDialog(ctx, el.dataset.rtJournal));
  on("[data-rt-encounter]", (el) => openEncounterDialog(ctx, el.dataset.rtEncounter));
  on("[data-rt-open-journal]", (el) =>
    ctx.navigate("campaign", { tab: "entry", id: el.dataset.rtOpenJournal }),
  );
  on("[data-rt-open-encounter]", (el) => {
    encounterUi(ctx).openId = el.dataset.rtOpenEncounter;
    ctx.navigate("preparation", { tab: encounters.ID });
  });
  on("[data-rt-open-loot]", () => ctx.navigate("preparation", { tab: LOOT_SLICE }));
  on("[data-rt-note]", (el) => {
    const input = root.querySelector(`[data-rt-note-input="${el.dataset.rtNote}"]`);
    act(
      ctx,
      ctx.t("Nota personale sull’estrazione", "Personal note on a draw"),
      (draft) =>
        addNote(tablesOf(draft), historyOf(draft), el.dataset.rtNote, input?.value, ctx.role),
      {
        local: true,
        visibility: "private",
        undoable: false,
        focus: `[data-rt-note-input="${el.dataset.rtNote}"]`,
      },
    );
  });
  on("[data-rt-undo]", () => undoLast(ctx));
}
export function bindDrawer(root, ctx, table) {
  root.querySelectorAll("[data-rt-tab]").forEach((el) =>
    el.addEventListener("click", () => {
      ui.drawerTab = el.dataset.rtTab;
      focusSoon(`[data-rt-tab="${el.dataset.rtTab}"]`);
      ctx.render();
    }),
  );
  if (ui.drawerTab === "decks") {
    bindDeckPanel(root, ctx, deckApi);
    root
      .querySelectorAll("[data-rt-undo]")
      .forEach((el) => el.addEventListener("click", () => undoLast(ctx)));
  } else if (ui.drawerTab === "history") bindHistory(root, ctx);
  else {
    bindDraw(root, ctx);
    bindTokenList(root, ctx, table);
  }
  applyFocus(root);
}

// ---------------------------------------------------------------------------------------
// Multi-sided tokens on the map (map layer + DM tool + dialog).

function tokenSide(slice, token) {
  const table = getTable(slice, token.tableId);
  const index = table?.results.findIndex((r) => r.id === token.resultId) ?? -1;
  return { table, result: index >= 0 ? table.results[index] : null, index };
}
function tokensSVG(ctx, scene) {
  const slice = tablesOf(ctx.state);
  return visibleTokens(slice, scene.id, ctx.role)
    .map((token) => {
      const { table, result, index } = tokenSide(slice, token);
      const face = result ? ctx.label(result.text) : ctx.t("lato mancante", "missing side");
      const short = face.length > 16 ? face.slice(0, 15) + "…" : face;
      const name = ctx.label(table?.name ?? "?");
      const hidden = token.hidden
        ? ctx.t(" (nascosta ai giocatori)", " (hidden from players)")
        : "";
      const aria = ctx.t(
        `Pedina a più facce ${name}, lato ${index + 1}: ${face}${hidden}. Trascina o usa le frecce per spostarla, Invio o clic destro per i lati.`,
        `Multi-sided token ${name}, side ${index + 1}: ${face}${hidden}. Drag or use the arrow keys to move it, Enter or right-click for the sides.`,
      );
      const dm = ctx.role === "dm";
      const interactive = dm
        ? ` tabindex="0" role="button" data-rt-token="${ctx.esc(token.id)}"`
        : "";
      return `<g class="rt-token ${dm ? "is-interactive" : ""} ${token.hidden ? "is-hidden" : ""}" transform="translate(${token.x} ${token.y})"${interactive} aria-label="${ctx.esc(dm ? aria : `${name}: ${face}`)}"><title>${ctx.esc(dm ? aria : `${name}: ${face}`)}</title>${dm ? '<rect class="rt-token-hit" x="-84" y="-52" width="168" height="104"></rect>' : ""}<rect x="-78" y="-30" width="156" height="60" rx="12"></rect><text class="rt-token-face" y="-2" text-anchor="middle">${ctx.esc(short)}</text><text class="rt-token-table" y="18" text-anchor="middle">${ctx.esc(name.length > 20 ? name.slice(0, 19) + "…" : name)} · ${index + 1}/${table?.results.length ?? 0}${token.hidden ? " · " + ctx.t("nascosta", "hidden") : ""}</text></g>`;
    })
    .join("");
}
const tokenOptions = (token) => ({ visibility: token?.hidden ? "private" : "shared" });
function toggleTokenHidden(ctx, tokenId) {
  const slice = tablesOf(ctx.state);
  const token = slice.tokens.find((t) => t.id === tokenId);
  if (!token) return false;
  const name = ctx.label(getTable(slice, token.tableId)?.name ?? "");
  // Hiding or showing is a shared change with a private label: players only see the token
  // appear or disappear.
  return act(
    ctx,
    token.hidden
      ? ctx.t(`Pedina mostrata ai giocatori: ${name}`, `Token shown to players: ${name}`)
      : ctx.t(`Pedina nascosta ai giocatori: ${name}`, `Token hidden from players: ${name}`),
    (draft) => setTokenHidden(tablesOf(draft), tokenId, !token.hidden, ctx.role),
    { visibility: "private" },
  );
}
function moveTokenTo(ctx, tokenId, x, y, scene) {
  const slice = tablesOf(ctx.state);
  const token = slice.tokens.find((t) => t.id === tokenId);
  const name = ctx.label(getTable(slice, token?.tableId)?.name ?? "");
  const done = act(
    ctx,
    ctx.t(`Pedina a più facce spostata: ${name}`, `Multi-sided token moved: ${name}`),
    (draft) => moveToken(tablesOf(draft), tokenId, { x, y }, ctx.role, scene),
    tokenOptions(token),
  );
  // A refused move (offline) redraws the token where it was.
  if (!done) ctx.render();
  return done;
}
function tokenDialog(ctx, tokenId) {
  const { t, esc } = ctx;
  const slice = tablesOf(ctx.state);
  const token = slice.tokens.find((entry) => entry.id === tokenId);
  if (!token) return;
  const { table, result } = tokenSide(slice, token);
  if (!table) return;
  const ranges = impliedRanges(table);
  const off = ctx.offline ? 'disabled aria-describedby="rt-token-offline"' : "";
  ctx.dialog(
    t(`Pedina: ${ctx.label(table.name)}`, `Token: ${ctx.label(table.name)}`),
    `<p>${t("Lato attuale", "Current side")}: <strong>${esc(result ? ctx.label(result.text) : "—")}</strong>${token.hidden ? ` · <span class="badge rt-badge-warn">${t("Nascosta ai giocatori", "Hidden from players")}</span>` : ""}</p>${ctx.offline ? `<p class="rt-notice" role="status" id="rt-token-offline">${t("Senza rete: la pedina è condivisa e i lati attendono la connessione.", "Offline: the token is shared and its sides wait for the connection.")}</p>` : ""}<div class="rt-dialog-actions"><button type="button" class="button primary" data-rt-token-roll="digital" ${off}>${ctx.icon("dice")} ${esc(t(`Lato casuale (d${table.sides} digitale)`, `Random side (digital d${table.sides})`))}</button><div class="rt-physical"><label class="field">${esc(t(`Dado fisico (1–${table.sides})`, `Physical die (1–${table.sides})`))}<input type="number" min="1" max="${table.sides}" data-rt-token-face></label><button type="button" class="button" data-rt-token-roll="physical" ${off}>${t("Registra tiro fisico", "Record physical roll")}</button></div><div class="rt-choose"><label class="field">${t("Scegli lato", "Choose side")}<select data-rt-token-side>${table.results.map((r, i) => `<option value="${esc(r.id)}" ${r.id === token.resultId ? "selected" : ""}>${esc(rangeText(ranges[i]))} · ${esc(ctx.label(r.text))}</option>`).join("")}</select></label><button type="button" class="button" data-rt-token-roll="chosen" ${off}>${t("Mostra questo lato", "Show this side")}</button></div><div class="toolbar"><button type="button" class="button" data-rt-token-hide ${off}>${token.hidden ? t("Mostra ai giocatori", "Show to players") : t("Nascondi ai giocatori", "Hide from players")}</button><button type="button" class="button danger" data-rt-token-remove ${off}>${t("Togli dal Tavolo", "Remove from the Table")}</button></div></div><p class="dialog-error error" data-rt-token-error hidden></p>`,
    { cancelLabel: t("Chiudi", "Close") },
  );
  const dialog = globalThis.document?.querySelector("#dialog");
  if (!dialog) return;
  const fail = (error) => {
    const el = dialog.querySelector("[data-rt-token-error]");
    el.textContent = errorText(ctx, error);
    el.hidden = false;
  };
  dialog.querySelectorAll("[data-rt-token-roll]").forEach((button) =>
    button.addEventListener("click", () => {
      try {
        // Offline the side is refused before any digital die is rolled or shown.
        if (ctx.offline)
          throw refuse(
            "Senza rete: i lati della pedina attendono la connessione.",
            "Offline: the token's sides wait for the connection.",
          );
        const current = tablesOf(ctx.state);
        const session = beginSession(
          current,
          { kind: "token", tableId: table.id, tokenId },
          ctx.lang,
        );
        const mode = button.dataset.rtTokenRoll;
        if (mode === "digital") rollAll(current, session, dice(ctx));
        else if (mode === "chosen")
          chooseRow(current, session, dialog.querySelector("[data-rt-token-side]").value);
        else {
          const value = dialog.querySelector("[data-rt-token-face]").value;
          const outcome = resolveFace(
            current,
            session,
            Number(value === "" ? NaN : value),
            "physical",
          );
          if (outcome.status === "reroll")
            throw refuse(
              `Faccia ${value}: ${REASONS[outcome.reason][0]}. Tira di nuovo.`,
              `Face ${value}: ${REASONS[outcome.reason][1]}. Roll again.`,
            );
        }
        let entry = null;
        const label = t(
          `Pedina ${ctx.label(table.name)}: ${sessionText(session, ctx.lang)}`,
          `Token ${ctx.label(table.name)}: ${sessionText(session, ctx.lang)}`,
        ).slice(0, 220);
        ctx.commit(
          label,
          (draft) => {
            entry = recordSession(tablesOf(draft), historyOf(draft), session, { role: ctx.role });
          },
          tokenOptions(token),
        );
        drawLabels.set(entry.id, label);
        emitRolls(ctx, entry);
        ctx.closeDialog();
      } catch (error) {
        fail(error);
      }
    }),
  );
  dialog.querySelector("[data-rt-token-hide]")?.addEventListener("click", () => {
    if (toggleTokenHidden(ctx, tokenId)) ctx.closeDialog();
  });
  dialog.querySelector("[data-rt-token-remove]")?.addEventListener("click", () => {
    try {
      ctx.commit(
        t(`Pedina tolta: ${ctx.label(table.name)}`, `Token removed: ${ctx.label(table.name)}`),
        (draft) => removeToken(tablesOf(draft), tokenId, ctx.role),
        tokenOptions(token),
      );
      ctx.closeDialog();
    } catch (error) {
      fail(error);
    }
  });
}
/** A route tab (notification, player search) opens the drawer on that tab once. */
function applyRouteTab(ctx) {
  const view = ctx.view;
  if (!view || view === ui.routeView) return;
  ui.routeView = view;
  const tab = Object.entries(ROUTE_TAB).find(([, value]) => value === view.tab)?.[0];
  if (view.page === "table" && tab) {
    ui.drawerTab = tab;
    ui.openDrawer = true;
  }
}
const ARROWS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
function bindTokens(el, ctx, table) {
  applyRouteTab(ctx);
  if (ui.openDrawer && table?.root) {
    ui.openDrawer = false;
    const button = table.root.querySelector('[data-table-drawer="random-tables"]');
    if (button && button.getAttribute("aria-expanded") !== "true")
      queueMicrotask(() => button.click());
    else if (button) queueMicrotask(() => ctx.render());
  }
  if (ctx.role !== "dm") return;
  const scene = table?.scene ?? ctx.state.scenes?.find((s) => s.id === ctx.state.activeSceneId);
  el.querySelectorAll("[data-rt-token]").forEach((node) => {
    const id = node.dataset.rtToken;
    const token = tablesOf(ctx.state).tokens.find((t) => t.id === id);
    if (!token) return;
    let drag = null;
    let dragged = false;
    // Roll20 / Owlbear: press and drag moves the token; a press without moving opens it.
    node.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
      if (event.button !== undefined && event.button !== 0) return;
      if (!table?.point) return;
      drag = { x: event.clientX, y: event.clientY, from: table.point(event), moved: false };
      node.setPointerCapture?.(event.pointerId);
    });
    node.addEventListener("pointermove", (event) => {
      if (!drag) return;
      if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 6) return;
      drag.moved = true;
      const p = table.point(event);
      node.setAttribute(
        "transform",
        `translate(${token.x + p.x - drag.from.x} ${token.y + p.y - drag.from.y})`,
      );
      node.classList.add("is-dragging");
    });
    const drop = (event, commit) => {
      if (!drag) return;
      const { moved, from } = drag;
      drag = null;
      node.releasePointerCapture?.(event.pointerId);
      if (!moved) return;
      dragged = true;
      if (!commit) {
        ctx.render();
        return;
      }
      const p = table.point(event);
      moveTokenTo(ctx, id, token.x + p.x - from.x, token.y + p.y - from.y, scene);
    };
    node.addEventListener("pointerup", (event) => drop(event, true));
    node.addEventListener("pointercancel", (event) => drop(event, false));
    node.addEventListener("click", (event) => {
      event.stopPropagation();
      event.preventDefault?.();
      if (dragged) {
        dragged = false;
        return;
      }
      tokenDialog(ctx, id);
    });
    // Roll20 multi-sided token: right-click › Multi-Sided › Random side / Choose side
    // (R20-104). The sides dialog opens instead of the scene menu of the empty map (B12).
    node.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      tokenDialog(ctx, id);
    });
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.stopPropagation();
        event.preventDefault?.();
        tokenDialog(ctx, id);
        return;
      }
      const arrow = ARROWS[event.key];
      if (!arrow) return;
      event.stopPropagation();
      event.preventDefault?.();
      const step = scene?.gridSize ?? 50;
      ui.tokenFocus = id;
      moveTokenTo(ctx, id, token.x + arrow[0] * step, token.y + arrow[1] * step, scene);
    });
  });
  if (ui.tokenFocus) {
    el.querySelector(`[data-rt-token="${ui.tokenFocus}"]`)?.focus?.();
    ui.tokenFocus = null;
  }
}
function tokensListHTML(ctx) {
  if (ctx.role !== "dm") return "";
  const { t, esc } = ctx;
  const slice = tablesOf(ctx.state);
  const tokens = visibleTokens(slice, ctx.state.activeSceneId, ctx.role);
  if (!tokens.length) return "";
  return `<section class="rt-token-list"><h3>${t("Pedine a più facce sulla scena", "Multi-sided tokens on the scene")}</h3><p class="muted">${t("Sulla mappa: trascina o frecce per spostarle; clic, clic destro o Invio per i lati.", "On the map: drag or arrow keys to move them; click, right-click or Enter for the sides.")}</p><ul>${tokens
    .map((token) => {
      const { table, result, index } = tokenSide(slice, token);
      return `<li><span>${esc(ctx.label(table?.name ?? "?"))} · ${t("lato", "side")} ${index + 1}: ${esc(result ? ctx.label(result.text) : "—")}${token.hidden ? ` <span class="badge rt-badge-warn">${t("nascosta", "hidden")}</span>` : ""}</span><span class="toolbar"><button type="button" class="button" data-rt-token-open="${esc(token.id)}">${t("Lato…", "Side…")}</button><button type="button" class="button quiet" data-rt-token-toggle="${esc(token.id)}">${token.hidden ? t("Mostra ai giocatori", "Show to players") : t("Nascondi ai giocatori", "Hide from players")}</button></span></li>`;
    })
    .join("")}</ul></section>`;
}
function bindTokenList(root, ctx, table) {
  root
    .querySelectorAll("[data-rt-token-open]")
    .forEach((el) => el.addEventListener("click", () => tokenDialog(ctx, el.dataset.rtTokenOpen)));
  root.querySelectorAll("[data-rt-token-toggle]").forEach((el) =>
    el.addEventListener("click", () => {
      focusSoon(`[data-rt-token-toggle="${el.dataset.rtTokenToggle}"]`);
      toggleTokenHidden(ctx, el.dataset.rtTokenToggle);
    }),
  );
  root.querySelectorAll("[data-rt-place]").forEach((el) =>
    el.addEventListener("click", () => {
      ui.source = `table:${el.dataset.rtPlace}`;
      if (table?.setMode) table.setMode("random-tables-place");
    }),
  );
}
const CHOOSE_TOKEN_TABLE = L(
  "Scegli prima la tabella: l’elenco si apre con lo strumento «Pedina a più facce» (o da Tabelle e mazzi › Tabelle).",
  "First choose the table: the list opens with the “Multi-sided token” tool (or from Tables and decks › Tables).",
);
// PR-62 (Roll20 multi-sided token from a rollable table): the tool opens the table picker
// at once; choosing a table arms the click that places its token.
function openTokenTablePicker(ctx, table) {
  const tables = tablesOf(ctx.state).tables ?? [];
  if (!tables.length) {
    table?.message?.(
      ctx.t(
        "Nessuna tabella: creane una in Preparazione › Tabelle casuali.",
        "No table yet: create one in Preparation › Random tables.",
      ),
    );
    return false;
  }
  const current = chosenTokenTable(ctx)?.id ?? tables[0].id;
  ctx.dialog(
    ctx.t("Pedina a più facce", "Multi-sided token"),
    `<p class="muted">${ctx.t("Come le pedine a più facce di Roll20: ogni voce della tabella è un lato. Scegli la tabella, poi clicca sulla mappa (o Invio per il centro).", "Like Roll20's multi-sided tokens: each entry of the table is a side. Choose the table, then click the map (or Enter for the centre).")}</p><fieldset class="rt-token-picker" data-rt-token-picker><legend>${ctx.t("Tabella", "Table")}</legend>${tables
      .map(
        (row) =>
          `<label class="rt-check"><input type="radio" name="table" value="${ctx.esc(row.id)}"${row.id === current ? " checked" : ""}> ${ctx.esc(ctx.label(row.name))} <span class="muted">· d${row.sides} · ${row.results.length} ${ctx.t("lati", "sides")}</span></label>`,
      )
      .join("")}</fieldset>`,
    {
      submitLabel: ctx.t("Scegli e posiziona", "Choose and place"),
      onSubmit: (data) => {
        const chosen = getTable(tablesOf(ctx.state), String(data.get("table") ?? ""));
        if (!chosen) return false;
        ui.source = `table:${chosen.id}`;
        table?.message?.(
          ctx.t(
            `Clicca sulla mappa per posizionare «${ctx.label(chosen.name)}», oppure Invio al centro della scena.`,
            `Click the map to place “${ctx.label(chosen.name)}”, or press Enter for the centre of the scene.`,
          ),
        );
      },
    },
  );
  return true;
}
// PR-62 (Roll20 multi-sided token: right-click › Multi-sided › random or chosen side): a
// creature token with several images turns to one of them; its images are its sides.
function creatureSides(state, actorId) {
  const look = media.lookOf(state, actorId);
  if (!look) return [];
  return [
    ...(look.portrait ? [{ id: "portrait", label: L("Ritratto", "Portrait") }] : []),
    ...(look.token?.variants ?? []).map((v) => ({ id: v.id, label: L(v.label, v.label) })),
  ];
}
function openCreatureSides(ctx, target) {
  const actor = ctx.state.actors[target.actorId];
  const sides = creatureSides(ctx.state, target.actorId);
  if (!actor || sides.length < 2) return false;
  const active = media.lookOf(ctx.state, actor.id)?.token?.active ?? "portrait";
  ctx.dialog(
    ctx.t(`Lati: ${actor.name}`, `Sides: ${actor.name}`),
    `<p class="muted">${ctx.t("Come le pedine a più facce di Roll20: scegli un lato o tira per un lato a caso. Le immagini si aggiungono da Aspetto › Immagini della pedina.", "Like Roll20's multi-sided tokens: choose a side or roll a random one. Images are added from Appearance › Token images.")}</p><fieldset class="rt-token-picker" data-rt-creature-sides><legend>${ctx.t("Lato", "Side")}</legend>${sides
      .map(
        (side, i) =>
          `<label class="rt-check"><input type="radio" name="side" value="${ctx.esc(side.id)}"${side.id === active ? " checked" : ""}> ${i + 1}. ${ctx.esc(ctx.label(side.label))}${side.id === active ? ` <span class="muted">(${ctx.t("ora", "now")})</span>` : ""}</label>`,
      )
      .join(
        "",
      )}<label class="rt-check"><input type="radio" name="side" value="random"> ${ctx.t(`Lato a caso (d${sides.length})`, `Random side (d${sides.length})`)}</label></fieldset><label class="field">${ctx.t("Dado fisico: faccia (vuoto = digitale)", "Physical die: face (empty = digital)")}<input type="number" name="face" min="1" max="${sides.length}" inputmode="numeric"></label>`,
    {
      submitLabel: ctx.t("Gira la pedina", "Turn the token"),
      onSubmit: (data) => {
        let id = String(data.get("side") ?? "");
        if (id === "random") {
          const typed = String(data.get("face") ?? "").trim();
          const face = typed
            ? Number(typed)
            : (area?.ctx?.rollDie ?? ctx.rollDie ?? rollDie)(sides.length);
          if (!Number.isInteger(face) || face < 1 || face > sides.length)
            throw refuse(
              `Scrivi una faccia da 1 a ${sides.length}.`,
              `Enter a face from 1 to ${sides.length}.`,
            );
          id = sides[face - 1].id;
        }
        const side = sides.find((row) => row.id === id);
        if (!side) return false;
        return act(
          ctx,
          ctx.t(
            `${actor.name}: lato «${ctx.label(side.label)}»`,
            `${actor.name}: side “${ctx.label(side.label)}”`,
          ),
          (draft) => media.setActiveToken(draft, ctx.role, actor.id, id),
          { throwErrors: true },
        )
          ? undefined
          : false;
      },
    },
  );
  return true;
}
export { openTokenTablePicker, openCreatureSides };
/** Places the chosen table's token at a map point; the new token then has the focus. */
function placeChosenToken(ctx, table, point) {
  const chosen = chosenTokenTable(ctx);
  if (!chosen) {
    table.message(ctx.label(CHOOSE_TOKEN_TABLE));
    return false;
  }
  const name = ctx.label(chosen.name);
  let placed = null;
  ui.tokenFocus = null;
  const done = act(
    ctx,
    ctx.t(`Pedina a più facce sul Tavolo: ${name}`, `Multi-sided token on the Table: ${name}`),
    (draft) => {
      placed = placeToken(
        tablesOf(draft),
        { tableId: chosen.id, sceneId: draft.activeSceneId, x: point.x, y: point.y },
        ctx.role,
      );
    },
    { visibility: "shared" },
  );
  if (done) {
    // Keyboard users land on the new token (arrows move it, Enter opens its sides): the
    // Move tool's render focuses it.
    ui.tokenFocus = placed?.id ?? null;
    table.setMode("move");
  }
  return done;
}
const placeTool = {
  id: "random-tables-place",
  label: L("Pedina a più facce", "Multi-sided token"),
  // A die, not a flag: the pointer already uses the flag (Roll20 shows a multi-sided
  // token by its current side; the tool picks a random or chosen side).
  icon: "dice",
  group: "dm",
  roles: ["dm"],
  order: 58,
  activate(ctx, table) {
    ui.placing = true;
    const chosen = chosenTokenTable(ctx);
    table.message(
      chosen
        ? ctx.t(
            `Clicca sulla mappa per posizionare «${ctx.label(chosen.name)}», oppure Invio al centro della scena.`,
            `Click the map to place “${ctx.label(chosen.name)}”, or press Enter for the centre of the scene.`,
          )
        : ctx.label(CHOOSE_TOKEN_TABLE),
    );
    // No table chosen yet: the picker opens at once (the tool never does nothing).
    if (!chosen) openTokenTablePicker(ctx, table);
  },
  deactivate() {
    ui.placing = false;
  },
  onClick(ctx, event, table) {
    placeChosenToken(ctx, table, table.point(event));
  },
  // Same keyboard path as the handouts pin (B24): Enter on the map, not on a token, places
  // at the centre of the scene; the arrow keys then move the focused token.
  onKeyDown(ctx, event, table) {
    if (event.key === "Escape") {
      table.setMode("move");
      return;
    }
    if (event.key !== "Enter" || event.target?.closest?.("[data-actor],[data-rt-token]")) return;
    event.preventDefault?.();
    const scene = table.scene;
    placeChosenToken(ctx, table, {
      x: (scene?.width ?? 1000) / 2,
      y: (scene?.height ?? 700) / 2,
    });
  },
};

// ---------------------------------------------------------------------------------------
// Preparation section (DM): directory, editors and a draw panel for the selected item.

/**
 * A search hit carries the item in the route (`id=table:<id>`, `deck:<id>`,
 * `template:<id>`): Preparation opens that item once per navigation (the shell creates a
 * new view for every navigation, also to the same address; re-renders keep it).
 */
function applyPrepRoute(ctx) {
  const view = ctx.view;
  if (!view || view === ui.prepRouteView) return;
  ui.prepRouteView = view;
  const id = view.id ?? "";
  if (!id) return;
  const slice = tablesOf(ctx.state);
  const [kind, itemId] = id.split(":");
  const exists =
    kind === "table"
      ? getTable(slice, itemId)
      : kind === "deck"
        ? slice.decks.some((d) => d.id === itemId)
        : kind === "template"
          ? getTemplate(slice, itemId)
          : null;
  if (!exists || ui.editor?.dirty) return;
  ui.prepSelection = id;
  ui.editor = null;
  ui.lastEntryId = null;
  if (kind !== "deck") ui.source = id;
}
function selection(ctx) {
  const slice = tablesOf(ctx.state);
  const [kind, id] = String(ui.prepSelection ?? "").split(":");
  if (ui.editor && !ui.editor.draft.id && kind === "new") return { kind: ui.editor.kind, id: null };
  if (kind === "table" && getTable(slice, id)) return { kind, id };
  if (kind === "deck" && slice.decks.some((d) => d.id === id)) return { kind, id };
  if (kind === "template" && getTemplate(slice, id)) return { kind, id };
  return slice.tables[0] ? { kind: "table", id: slice.tables[0].id } : null;
}
function ensureEditor(ctx, current) {
  if (!current) return null;
  // A new unsaved item, or unsaved edits, stay; otherwise the editor always mirrors the
  // saved version (after Undo, another save or a language change).
  if (ui.editor && !current.id) return ui.editor;
  if (ui.editor?.dirty && ui.editor.kind === current.kind && ui.editor.draft.id === current.id)
    return ui.editor;
  const slice = tablesOf(ctx.state);
  const draft =
    current.kind === "table"
      ? tableDraft(getTable(slice, current.id), ctx.lang)
      : current.kind === "deck"
        ? deckDraft(
            slice.decks.find((d) => d.id === current.id),
            ctx.lang,
          )
        : templateDraft(getTemplate(slice, current.id), ctx.lang);
  const error =
    ui.editor?.kind === current.kind && ui.editor.draft.id === current.id ? ui.editor.error : "";
  ui.editor = { kind: current.kind, lang: ctx.lang, draft, dirty: false, error };
  return ui.editor;
}
function directoryHTML(ctx, current) {
  const { t, esc } = ctx;
  const slice = tablesOf(ctx.state);
  const item = (kind, id, name, meta) => {
    const active = current?.kind === kind && current.id === id;
    return `<li><button type="button" class="rt-dir-item ${active ? "active" : ""}" data-rt-select="${kind}:${esc(id)}" ${active ? 'aria-current="true"' : ""}><span>${esc(ctx.label(name))}</span><small>${esc(meta)}</small></button></li>`;
  };
  const group = (kind, title, newLabel, items) =>
    `<section class="rt-dir-group"><div class="rt-dir-head"><h2>${title}</h2><button type="button" class="button quiet" data-rt-new="${kind}">${ctx.icon("plus")} ${newLabel}</button></div><ul>${items}</ul></section>`;
  return `<nav class="rt-directory" aria-label="${esc(t("Tabelle, mazzi e modelli", "Tables, decks and templates"))}">${group(
    "table",
    t("Tabelle casuali", "Random tables"),
    t("Nuova tabella", "New table"),
    slice.tables
      .map((tb) =>
        item(
          "table",
          tb.id,
          tb.name,
          `d${tb.sides} · ${tb.results.length} ${t("voci", "results")}${tb.replacement ? "" : " · " + t("senza reinserimento", "no replacement")}${tb.playersCanUse ? " · " + t("giocatori", "players") : ""}`,
        ),
      )
      .join(""),
  )}${group(
    "deck",
    t("Mazzi", "Decks"),
    t("Nuovo mazzo", "New deck"),
    slice.decks
      .map((d) =>
        item(
          "deck",
          d.id,
          d.name,
          `${cardsText(ctx, d.cards.length)} · ${deckShown(d) ? t("mostrato ai giocatori", "shown to players") : t("nascosto", "hidden")}`,
        ),
      )
      .join(""),
  )}${group(
    "template",
    t("Modelli di testo", "Text templates"),
    t("Nuovo modello", "New template"),
    slice.templates
      .map((tp) =>
        item(
          "template",
          tp.id,
          tp.name,
          `${templateRefs(slice, tp, ctx.lang).length} ${t("tabelle", "tables")}`,
        ),
      )
      .join(""),
  )}</nav>`;
}
function tableEditorHTML(ctx, editor) {
  const { t, esc } = ctx;
  const slice = tablesOf(ctx.state);
  const draft = editor.draft;
  const ranges = impliedRanges(draft);
  const status = tableStatus(draft);
  const dice = [...new Set([...STANDARD_DICE, draft.sides])].sort((a, b) => a - b);
  const others = slice.tables.filter((tb) => tb.id !== draft.id);
  const variables = draft.variables
    .map(
      (v, i) =>
        `<div class="rt-var-edit"><label class="field">${t("Variabile", "Variable")}<input data-rt-var-name="${i}" maxlength="${LIMITS.optionText}" value="${esc(ctx.label(v.name))}"></label><label class="field">${t("Valori, separati da virgole", "Values, comma separated")}<input data-rt-var-options="${i}" value="${esc(v.options.map((o) => ctx.label(o.label)).join(", "))}"></label><label class="check-field"><input type="checkbox" data-rt-var-any="${i}" ${v.any ? "checked" : ""}> ${t("«Qualsiasi» come primo valore", "“Any” as the first value")}</label><button type="button" class="button quiet" data-rt-var-remove="${i}" aria-label="${esc(t(`Rimuovi la variabile ${ctx.label(v.name)}`, `Remove variable ${ctx.label(v.name)}`))}">${ctx.icon("close")}</button></div>`,
    )
    .join("");
  const columns = draft.columns ?? [];
  const columnEditors = `<div class="rt-col-edit"><label class="field">${t("Prima colonna (il testo della voce)", "First column (the result text)")}<input data-rt-main-column maxlength="${LIMITS.optionText}" value="${esc(ctx.label(draft.mainColumn ?? ""))}" placeholder="${esc(t("Voce", "Result"))}"></label></div>${columns
    .map(
      (c, i) =>
        `<div class="rt-col-edit"><label class="field">${t("Colonna", "Column")} ${i + 2}<input data-rt-col-name="${i}" maxlength="${LIMITS.optionText}" value="${esc(ctx.label(c.name))}"></label><button type="button" class="button quiet" data-rt-col-remove="${i}" aria-label="${esc(t(`Rimuovi la colonna ${ctx.label(c.name)}`, `Remove column ${ctx.label(c.name)}`))}">${ctx.icon("close")}</button></div>`,
    )
    .join(
      "",
    )}<button type="button" class="button quiet" data-rt-col-add ${columns.length >= LIMITS.columns ? 'disabled aria-describedby="rt-col-limit"' : ""}>${ctx.icon("plus")} ${t("Aggiungi colonna", "Add column")}</button>${columns.length >= LIMITS.columns ? `<p class="muted rt-why" id="rt-col-limit">${esc(t(`Al massimo ${LIMITS.columns} colonne oltre la prima: rimuovine una per aggiungerne un’altra.`, `At most ${LIMITS.columns} columns besides the first: remove one to add another.`))}</p>` : ""}`;
  const rows = draft.results
    .map((r, i) => {
      const unreachable = ranges[i].from > draft.sides;
      return `<li class="rt-edit-row ${unreachable ? "is-unreachable" : ""}"><span class="rt-range" data-rt-range="${i}" aria-label="${esc(t("Intervallo", "Range"))}">${rangeText(ranges[i])}</span><label class="field rt-row-text">${t("Voce", "Result")} ${i + 1}<input data-rt-row-field="text" data-index="${i}" maxlength="${LIMITS.text}" value="${esc(ctx.label(r.text))}"></label><label class="field rt-row-weight">${t("Peso", "Weight")}<input type="number" min="1" max="${LIMITS.weight}" data-rt-row-field="weight" data-index="${i}" value="${r.weight}"></label><div class="rt-row-extra">${columns.map((c) => `<label class="field rt-row-cell">${esc(ctx.label(c.name) || t("Colonna", "Column"))}<input data-rt-row-cell="${esc(c.id)}" data-index="${i}" maxlength="${LIMITS.text}" value="${esc(ctx.label(r.cells?.[c.id] ?? ""))}"></label>`).join("")}${draft.variables.map((v) => `<label class="field">${esc(ctx.label(v.name))}<select data-rt-row-var="${esc(v.id)}" data-index="${i}">${rowVarOptionsHTML(ctx, v, r)}</select></label>`).join("")}<label class="field">${t("Sottotabella", "Subtable")}<select data-rt-row-field="subtableId" data-index="${i}"><option value="">${t("Nessuna", "None")}</option>${others.map((tb) => `<option value="${esc(tb.id)}" ${r.subtableId === tb.id ? "selected" : ""}>${esc(ctx.label(tb.name))}</option>`).join("")}</select></label><label class="check-field"><input type="checkbox" data-rt-row-field="drawn" data-index="${i}" ${r.drawn ? "checked" : ""}> ${t("Estratta", "Drawn")}</label><div class="rt-row-actions"><button type="button" class="button quiet" data-rt-row-move="up" data-index="${i}" ${i === 0 ? 'disabled aria-describedby="rt-move-first"' : ""} aria-label="${esc(t(`Sposta su la voce ${i + 1}`, `Move result ${i + 1} up`))}">↑</button><button type="button" class="button quiet" data-rt-row-move="down" data-index="${i}" ${i === draft.results.length - 1 ? 'disabled aria-describedby="rt-move-last"' : ""} aria-label="${esc(t(`Sposta giù la voce ${i + 1}`, `Move result ${i + 1} down`))}">↓</button><button type="button" class="button quiet" data-rt-row-remove="${i}" aria-label="${esc(t(`Rimuovi la voce ${i + 1}`, `Remove result ${i + 1}`))}">${ctx.icon("close")}</button></div></div></li>`;
    })
    .join("");
  return `<div class="rt-editor-body"><div class="form-grid"><label class="field">${t("Nome della tabella", "Table name")}<input data-rt-field="name" maxlength="${LIMITS.name}" required value="${esc(draft.name)}"></label><label class="field">${t("Dado", "Die")}<select data-rt-field="sides">${dice.map((s) => `<option value="${s}" ${s === draft.sides ? "selected" : ""}>d${s}</option>`).join("")}</select></label></div>
    <div class="rt-checks"><label class="check-field"><input type="checkbox" data-rt-field="replacement" ${draft.replacement ? "checked" : ""}> ${t("Estrai con reinserimento", "Draw with replacement")}</label><label class="check-field"><input type="checkbox" data-rt-field="playersCanUse" ${draft.playersCanUse ? "checked" : ""}> ${t("I giocatori possono usarla", "Players can use it")}</label></div>
    <p class="rt-status ${status.normalized ? "" : "rt-warning"}" data-rt-status role="status">${esc(statusText(ctx, draft))}</p>
    <div class="toolbar"><button type="button" class="button" data-rt-normalize ${status.normalized ? "" : 'aria-describedby="rt-status"'}>${t("Normalizza", "Normalize")}</button><button type="button" class="button" data-rt-editor-reset ${draft.results.some((r) => r.drawn) ? "" : 'disabled aria-describedby="rt-editor-reset-why"'}>${t("Reimposta estratte", "Reset drawn")}</button></div>${draft.results.some((r) => r.drawn) ? "" : `<p class="muted rt-why" id="rt-editor-reset-why">${t("Nessuna voce è segnata come estratta: non c’è niente da reimpostare.", "No result is marked drawn: there is nothing to reset.")}</p>`}
    <h3>${t("Variabili d’ingresso", "Input variables")}</h3><p class="muted">${t("Prima del tiro si sceglie un valore; senza scelta vale il primo. «Qualsiasi» (nessun filtro) c’è solo se lo metti come primo valore. Le voci di altri valori vengono escluse, anche nelle sottotabelle con una variabile dello stesso nome.", "Before rolling you pick a value; without a choice the first one applies. “Any” (no filter) exists only if you make it the first value. Results for other values are excluded, also in subtables with a variable of the same name.")}</p>${variables}<button type="button" class="button quiet" data-rt-var-add ${draft.variables.length >= LIMITS.variables ? 'disabled aria-describedby="rt-var-limit"' : ""}>${ctx.icon("plus")} ${t("Aggiungi variabile", "Add variable")}</button>${draft.variables.length >= LIMITS.variables ? `<p class="muted rt-why" id="rt-var-limit">${esc(t(`Al massimo ${LIMITS.variables} variabili: rimuovine una per aggiungerne un’altra.`, `At most ${LIMITS.variables} variables: remove one to add another.`))}</p>` : ""}
    <h3>${t("Colonne", "Columns")}</h3><p class="muted">${t("Una voce può avere più colonne: al tiro si mostrano tutte o solo quella scelta, e il filtro cerca nelle colonne.", "A result can have several columns: a draw shows them all or only the chosen one, and the filter searches the columns.")}</p>${columnEditors}
    <h3>${t("Voci", "Results")} (${draft.results.length})</h3><p class="rt-visually-hidden" id="rt-move-first">${t("È già la prima voce: spostala giù o sposta su un’altra.", "It is already the first result: move it down or move another one up.")}</p><p class="rt-visually-hidden" id="rt-move-last">${t("È già l’ultima voce: spostala su o sposta giù un’altra.", "It is already the last result: move it up or move another one down.")}</p><ol class="rt-edit-rows">${rows}</ol><button type="button" class="button" data-rt-row-add>${ctx.icon("plus")} ${t("Aggiungi voce", "Add result")}</button></div>`;
}
/** The options of a row's variable select: "Any" or one of the variable's values. */
function rowVarOptionsHTML(ctx, variable, result) {
  const { t, esc } = ctx;
  return `<option value="${ANY}">${t("Qualsiasi", "Any")}</option>${variable.options.map((o) => `<option value="${esc(o.value)}" ${result?.values?.[variable.id] === o.value ? "selected" : ""}>${esc(ctx.label(o.label))}</option>`).join("")}`;
}
function statusText(ctx, draft) {
  const s = tableStatus(draft);
  if (s.normalized)
    return ctx.t(
      `Pesi ${s.total} = d${s.sides}: ogni faccia ha una voce.`,
      `Weights ${s.total} = d${s.sides}: every face has a result.`,
    );
  if (s.uncovered)
    return ctx.t(
      `Pesi ${s.total} su d${s.sides}: le facce ${rangeText(s.uncovered)} non hanno voci e si ritirano. Normalizza per usare d${s.total}.`,
      `Weights ${s.total} on d${s.sides}: faces ${rangeText(s.uncovered)} have no result and are rerolled. Normalize to use d${s.total}.`,
    );
  return ctx.t(
    `Pesi ${s.total} su d${s.sides}: le voci oltre ${s.sides} non si possono ottenere. Normalizza per usare d${s.total}.`,
    `Weights ${s.total} on d${s.sides}: results beyond ${s.sides} cannot come up. Normalize to use d${s.total}.`,
  );
}
function templateRefsHTML(ctx, text) {
  const { t, esc } = ctx;
  const slice = tablesOf(ctx.state);
  const refs = parseTemplate(text)
    .filter((p) => p.kind === "ref")
    .map((p) => ({ name: p.name, table: findTableByName(slice, p.name) }));
  return refs.length
    ? refs
        .map(
          (r) =>
            `<li class="${r.table ? "" : "error"}">[${esc(r.name)}] → ${r.table ? esc(`${ctx.label(r.table.name)} (d${r.table.sides})`) : t("tabella non trovata", "table not found")}</li>`,
        )
        .join("")
    : `<li class="muted">${t("Nessun riferimento: il testo resta fisso.", "No references: the text stays fixed.")}</li>`;
}
function templateEditorHTML(ctx, editor) {
  const { t, esc } = ctx;
  return `<div class="rt-editor-body"><label class="field">${t("Nome del modello", "Template name")}<input data-rt-field="name" maxlength="${LIMITS.name}" required value="${esc(editor.draft.name)}"></label><label class="field">${t("Testo: [Nome tabella] estrae da quella tabella", "Text: [Table name] draws from that table")}<textarea data-rt-field="text" rows="5" maxlength="${LIMITS.templateText}">${esc(editor.draft.text)}</textarea></label><h3>${t("Riferimenti", "References")}</h3><ul class="rt-refs" data-rt-refs aria-live="polite">${templateRefsHTML(ctx, editor.draft.text)}</ul></div>`;
}
export function renderPrep(ctx) {
  const { t, esc } = ctx;
  if (ctx.role !== "dm") return `<p>${t("Riservato ai DM.", "DM only.")}</p>`;
  applyPrepRoute(ctx);
  const current = selection(ctx);
  const editor = ensureEditor(ctx, current);
  const kindName = {
    table: t("Tabella", "Table"),
    deck: t("Mazzo", "Deck"),
    template: t("Modello di testo", "Text template"),
  };
  const title = editor ? editor.draft.name || t("Senza nome", "Untitled") : "";
  const body = !editor
    ? `<div class="empty-state"><h2>${t("Nessuna tabella", "No tables")}</h2><p>${t("Crea una tabella, un mazzo o un modello.", "Create a table, a deck or a template.")}</p></div>`
    : `<div class="rt-editor-head"><div><p class="muted">${kindName[editor.kind]}${editor.draft.id ? "" : " · " + t("non ancora salvato", "not saved yet")}</p><h2>${esc(title)}</h2><p class="rt-dirty" role="status" id="rt-discard-why" data-rt-dirty>${editor.dirty ? t("Modifiche non salvate", "Unsaved changes") : t("Versione salvata: nessuna modifica da annullare.", "Saved version: no change to discard.")}</p></div><div class="toolbar"><button type="button" class="button quiet" data-rt-discard ${editor.dirty ? "" : 'disabled aria-describedby="rt-discard-why"'}>${t("Annulla modifiche", "Discard changes")}</button><button type="button" class="button primary" data-rt-save>${t("Salva", "Save")}</button></div></div>${editor.error ? `<p class="error" role="alert">${esc(editor.error)}</p>` : ""}${
        editor.kind === "table"
          ? tableEditorHTML(ctx, editor)
          : editor.kind === "deck"
            ? renderDeckEditor(ctx, deckApi, editor)
            : templateEditorHTML(ctx, editor)
      }${editor.draft.id ? `<div class="toolbar rt-danger-zone">${editor.kind !== "template" && canCopyToCampaign(ctx) ? `<button type="button" class="button" data-rt-copy-to="${esc(`${editor.kind}:${editor.draft.id}`)}">${t("Copia in un’altra campagna…", "Copy to another campaign…")}</button>` : ""}<button type="button" class="button danger" data-rt-delete>${t("Elimina…", "Delete…")}</button></div>` : ""}`;
  const tryPanel =
    editor?.draft.id && editor.kind !== "deck"
      ? `<section class="rt-try panel"><h2>${editor.kind === "template" ? t("Genera dal modello salvato", "Generate from the saved template") : t("Estrai dalla versione salvata", "Draw from the saved version")}</h2>${renderDrawPanel(ctx, `${editor.kind}:${editor.draft.id}`)}</section>`
      : editor?.kind === "deck" && editor.draft.id
        ? `<section class="rt-try panel"><h2>${t("Al tavolo", "At the table")}</h2><p class="muted">${t("Mescola, distribuisci e gioca le carte dal pannello Tabelle e mazzi del Tavolo.", "Shuffle, deal and play cards from the Table's Tables and decks panel.")}</p><button type="button" class="button" data-rt-open-table="decks">${t("Apri i mazzi al Tavolo", "Open decks at the Table")}</button></section>`
        : "";
  return `<div class="rt-prep"><div class="rt-prep-bar">${offlineHTML(ctx)}<div class="toolbar">${undoHTML(ctx)}<button type="button" class="button" data-rt-open-table="tables">${ctx.icon("play")} ${t("Usa al Tavolo", "Use at the Table")}</button><button type="button" class="button quiet" data-rt-open-history>${t("Storico delle estrazioni", "Draw history")}</button></div></div><div class="rt-prep-layout">${directoryHTML(ctx, current)}<div class="rt-workspace"><section class="rt-editor panel">${body}</section>${tryPanel}${ui.prepHistory ? `<section class="rt-try panel"><h2>${t("Storico delle estrazioni", "Draw history")}</h2>${historyHTML(ctx)}</section>` : ""}</div></div></div>`;
}
function editorCommitOptions(ctx, before, after) {
  // Private preparation is personal (local); a table the players use is shared data.
  return before?.playersCanUse || after?.playersCanUse
    ? {}
    : { local: true, visibility: "private" };
}
function saveEditor(ctx) {
  const editor = ui.editor;
  if (!editor) return;
  const slice = tablesOf(ctx.state);
  const label = (it, en) =>
    ctx.t(`${it}: ${editor.draft.name.trim()}`, `${en}: ${editor.draft.name.trim()}`);
  let saved = null;
  try {
    if (editor.kind === "table") {
      const before = editor.draft.id ? getTable(slice, editor.draft.id) : null;
      ctx.commit(
        label("Tabella salvata", "Table saved"),
        (draft) => (saved = applyTableDraft(tablesOf(draft), clone(editor.draft), ctx.role)),
        editorCommitOptions(ctx, before, editor.draft),
      );
    } else if (editor.kind === "deck") {
      const before = editor.draft.id ? slice.decks.find((d) => d.id === editor.draft.id) : null;
      // A hidden deck's name can be a spoiler: its audit label stays private.
      ctx.commit(
        label("Mazzo salvato", "Deck saved"),
        (draft) => (saved = applyDeckDraft(tablesOf(draft), clone(editor.draft), ctx.role, draft)),
        deckShown(before) || editor.draft.settings?.showToPlayers ? {} : { visibility: "private" },
      );
    } else {
      ctx.commit(
        label("Modello salvato", "Template saved"),
        (draft) => (saved = applyTemplateDraft(tablesOf(draft), clone(editor.draft), ctx.role)),
        { local: true, visibility: "private" },
      );
    }
  } catch (error) {
    editor.error = errorText(ctx, error);
    ctx.render();
    return;
  }
  ui.prepSelection = `${editor.kind}:${saved.id}`;
  ui.editor = null;
  focusSoon("[data-rt-save]");
  if (saved.renamedTemplates)
    ctx.toast(
      ctx.t(
        `Nome aggiornato anche nei modelli di testo (${saved.renamedTemplates}).`,
        `Name also updated in the text templates (${saved.renamedTemplates}).`,
      ),
    );
  ctx.render();
}
function confirmDiscard(ctx, next) {
  if (!ui.editor?.dirty) {
    next();
    return;
  }
  ctx.dialog(
    ctx.t("Scartare le modifiche?", "Discard changes?"),
    `<p>${ctx.t("Le modifiche non salvate saranno scartate. La versione salvata resta invariata; le estrazioni già registrate restano nello storico.", "Unsaved changes will be discarded. The saved version stays unchanged; draws already recorded stay in the history.")}</p>`,
    {
      submitLabel: ctx.t("Scarta modifiche", "Discard changes"),
      onSubmit: () => {
        ui.editor = null;
        next();
      },
    },
  );
}
function openNewTable(ctx) {
  ctx.dialog(
    ctx.t("Nuova tabella", "New table"),
    `<div class="form-grid"><label class="field">${ctx.t("Nome", "Name")}<input name="name" maxlength="${LIMITS.name}" required value="${ctx.esc(ctx.t("Nuova tabella", "New table"))}"></label><label class="field">${ctx.t("Dado", "Die")}<select name="sides">${STANDARD_DICE.filter(
      (s) => s <= 20,
    )
      .map((s) => `<option value="${s}" ${s === 12 ? "selected" : ""}>d${s}</option>`)
      .join(
        "",
      )}</select></label></div><p class="muted">${ctx.t("Parte con una voce per faccia; poi puoi cambiare pesi, unire voci e normalizzare.", "It starts with one result per face; then change weights, merge results and normalize.")}</p>`,
    {
      submitLabel: ctx.t("Crea bozza", "Create draft"),
      onSubmit: (data) => {
        const name = String(data.get("name") ?? "").trim();
        if (!name) return false;
        ui.editor = {
          kind: "table",
          lang: ctx.lang,
          draft: newTableDraft(name, Number(data.get("sides")), ctx.lang),
          dirty: true,
          error: "",
        };
        ui.prepSelection = "new:table";
        focusSoon('[data-rt-field="name"]');
        ctx.render();
      },
    },
  );
}
function startNew(ctx, kind) {
  if (kind === "table") return openNewTable(ctx);
  ui.editor = {
    kind,
    lang: ctx.lang,
    draft: kind === "deck" ? deckDraft(null, ctx.lang) : templateDraft(null, ctx.lang),
    dirty: true,
    error: "",
  };
  if (kind === "deck") ui.editor.draft.name = ctx.t("Nuovo mazzo", "New deck");
  else ui.editor.draft.name = ctx.t("Nuovo modello", "New template");
  ui.prepSelection = `new:${kind}`;
  focusSoon('[data-rt-field="name"]');
  ctx.render();
}
function bindTableEditor(root, ctx) {
  const editor = ui.editor;
  const draft = editor.draft;
  const dirty = () => {
    editor.dirty = true;
    editor.error = "";
    showDirty(ctx, root);
  };
  const refresh = (selector) => {
    focusSoon(selector);
    ctx.render();
  };
  // Weights change ranges, unreachable rows and the status in place: no re-render, so
  // the next click (Save) and Tab land where the user aims.
  const liveRanges = () => {
    impliedRanges(draft).forEach((range, i) => {
      const cell = root.querySelector(`[data-rt-range="${i}"]`);
      if (!cell) return;
      cell.textContent = rangeText(range);
      cell.closest?.(".rt-edit-row")?.classList.toggle("is-unreachable", range.from > draft.sides);
    });
    const status = root.querySelector("[data-rt-status]");
    if (!status) return;
    status.textContent = statusText(ctx, draft);
    status.classList?.toggle("rt-warning", !tableStatus(draft).normalized);
  };
  root.querySelectorAll("[data-rt-field]").forEach((el) => {
    const field = el.dataset.rtField;
    el.addEventListener(
      el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input",
      () => {
        if (field === "sides") draft.sides = Number(el.value);
        else if (el.type === "checkbox") draft[field] = el.checked;
        else draft[field] = el.value;
        dirty();
        if (field === "sides") refresh('[data-rt-field="sides"]');
      },
    );
  });
  root.querySelectorAll("[data-rt-row-field]").forEach((el) => {
    const i = Number(el.dataset.index);
    const field = el.dataset.rtRowField;
    el.addEventListener(field === "text" || field === "weight" ? "input" : "change", () => {
      const result = draft.results[i];
      if (field === "weight") {
        result.weight = Number(el.value);
        dirty();
        if (Number.isInteger(result.weight) && result.weight > 0) liveRanges();
        return;
      }
      if (field === "drawn") result.drawn = el.checked;
      else if (field === "subtableId") result.subtableId = el.value || null;
      else result.text = el.value;
      dirty();
    });
  });
  root.querySelectorAll("[data-rt-row-var]").forEach((el) =>
    el.addEventListener("change", () => {
      const result = draft.results[Number(el.dataset.index)];
      result.values = { ...result.values, [el.dataset.rtRowVar]: el.value };
      if (el.value === ANY) delete result.values[el.dataset.rtRowVar];
      dirty();
    }),
  );
  root.querySelectorAll("[data-rt-row-move]").forEach((el) =>
    el.addEventListener("click", () => {
      const i = Number(el.dataset.index);
      const j = el.dataset.rtRowMove === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= draft.results.length) return;
      [draft.results[i], draft.results[j]] = [draft.results[j], draft.results[i]];
      dirty();
      refresh(`[data-rt-row-move="${el.dataset.rtRowMove}"][data-index="${j}"]`);
    }),
  );
  root.querySelectorAll("[data-rt-row-remove]").forEach((el) =>
    el.addEventListener("click", () => {
      draft.results.splice(Number(el.dataset.rtRowRemove), 1);
      dirty();
      refresh("[data-rt-row-add]");
    }),
  );
  root.querySelectorAll("[data-rt-row-add]").forEach((el) =>
    el.addEventListener("click", () => {
      draft.results.push(row(newId("row"), 1, ""));
      dirty();
      refresh(`[data-rt-row-field="text"][data-index="${draft.results.length - 1}"]`);
    }),
  );
  root.querySelectorAll("[data-rt-normalize]").forEach((el) =>
    el.addEventListener("click", () => {
      try {
        normalizeTable(draft);
        dirty();
        refresh("[data-rt-normalize]");
      } catch (error) {
        ctx.toast(errorText(ctx, error), true);
      }
    }),
  );
  root.querySelectorAll("[data-rt-editor-reset]").forEach((el) =>
    el.addEventListener("click", () => {
      draft.results.forEach((r) => (r.drawn = false));
      dirty();
      refresh("[data-rt-save]");
    }),
  );
  root.querySelectorAll("[data-rt-var-add]").forEach((el) =>
    el.addEventListener("click", () => {
      const name = ctx.t("Variabile", "Variable") + " " + (draft.variables.length + 1);
      // A draft id only: the saved id follows the name the DM types (variableIds).
      draft.variables.push({
        id: newId("var"),
        name,
        any: false,
        options: [{ value: "a", label: "A" }],
      });
      dirty();
      refresh(`[data-rt-var-name="${draft.variables.length - 1}"]`);
    }),
  );
  root.querySelectorAll("[data-rt-var-any]").forEach((el) =>
    el.addEventListener("change", () => {
      draft.variables[Number(el.dataset.rtVarAny)].any = el.checked;
      dirty();
    }),
  );
  root.querySelectorAll("[data-rt-main-column]").forEach((el) =>
    el.addEventListener("input", () => {
      draft.mainColumn = el.value;
      dirty();
    }),
  );
  root.querySelectorAll("[data-rt-col-add]").forEach((el) =>
    el.addEventListener("click", () => {
      draft.columns = draft.columns ?? [];
      draft.columns.push({
        id: newId("col"),
        name: ctx.t("Colonna", "Column") + " " + (draft.columns.length + 2),
      });
      dirty();
      refresh(`[data-rt-col-name="${draft.columns.length - 1}"]`);
    }),
  );
  root.querySelectorAll("[data-rt-col-remove]").forEach((el) =>
    el.addEventListener("click", () => {
      const [removed] = draft.columns.splice(Number(el.dataset.rtColRemove), 1);
      draft.results.forEach((r) => delete r.cells?.[removed.id]);
      dirty();
      refresh("[data-rt-col-add]");
    }),
  );
  root.querySelectorAll("[data-rt-col-name]").forEach((el) =>
    el.addEventListener("input", () => {
      draft.columns[Number(el.dataset.rtColName)].name = el.value;
      dirty();
    }),
  );
  root.querySelectorAll("[data-rt-row-cell]").forEach((el) =>
    el.addEventListener("input", () => {
      const result = draft.results[Number(el.dataset.index)];
      result.cells = { ...(result.cells ?? {}), [el.dataset.rtRowCell]: el.value };
      dirty();
    }),
  );
  root.querySelectorAll("[data-rt-var-remove]").forEach((el) =>
    el.addEventListener("click", () => {
      const [removed] = draft.variables.splice(Number(el.dataset.rtVarRemove), 1);
      draft.results.forEach((r) => delete r.values?.[removed.id]);
      dirty();
      refresh("[data-rt-var-add]");
    }),
  );
  root.querySelectorAll("[data-rt-var-name]").forEach((el) =>
    el.addEventListener("input", () => {
      draft.variables[Number(el.dataset.rtVarName)].name = el.value;
      dirty();
    }),
  );
  root.querySelectorAll("[data-rt-var-options]").forEach((el) =>
    el.addEventListener("change", () => {
      const variable = draft.variables[Number(el.dataset.rtVarOptions)];
      const labels = [
        ...new Set(
          el.value
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ].slice(0, LIMITS.options);
      variable.options = labels.map((text) => {
        const existing = variable.options.find(
          (o) => ctx.label(o.label).toLowerCase() === text.toLowerCase(),
        );
        if (existing) return existing;
        let value = slug(text);
        while (value === ANY || variable.options.some((o) => o.value === value)) value += "-2";
        return { value, label: text };
      });
      for (const r of draft.results)
        if (
          r.values?.[variable.id] &&
          !variable.options.some((o) => o.value === r.values[variable.id])
        )
          delete r.values[variable.id];
      dirty();
      // In place: the field shows the values as saved, each row's select offers them.
      el.value = variable.options.map((o) => ctx.label(o.label)).join(", ");
      root.querySelectorAll(`[data-rt-row-var="${variable.id}"]`).forEach((select) => {
        select.innerHTML = rowVarOptionsHTML(
          ctx,
          variable,
          draft.results[Number(select.dataset.index)],
        );
      });
    }),
  );
}
function bindTemplateEditor(root, ctx) {
  const editor = ui.editor;
  root.querySelectorAll("[data-rt-field]").forEach((el) => {
    el.addEventListener("input", () => {
      editor.draft[el.dataset.rtField] = el.value;
      editor.dirty = true;
      editor.error = "";
      showDirty(ctx, root);
      // The references follow the text as it is typed, in place (no re-render on blur).
      const refs = el.dataset.rtField === "text" && root.querySelector("[data-rt-refs]");
      if (refs) refs.innerHTML = templateRefsHTML(ctx, el.value);
    });
  });
}
function openTable(ctx, tab) {
  ui.drawerTab = tab;
  ui.openDrawer = true;
  ctx.navigate("table");
}
export function bindPrep(root, ctx) {
  ui.prepRoot = root;
  const on = (selector, handler) =>
    root
      .querySelectorAll(selector)
      .forEach((el) => el.addEventListener("click", () => handler(el)));
  on("[data-rt-select]", (el) =>
    confirmDiscard(ctx, () => {
      if (ui.editor && !ui.editor.dirty) ui.editor = null;
      ui.prepSelection = el.dataset.rtSelect;
      const [kind, id] = el.dataset.rtSelect.split(":");
      if (kind !== "deck") ui.source = `${kind}:${id}`;
      ui.lastEntryId = null;
      focusSoon(`[data-rt-select="${el.dataset.rtSelect}"]`);
      ctx.render();
    }),
  );
  on("[data-rt-new]", (el) => confirmDiscard(ctx, () => startNew(ctx, el.dataset.rtNew)));
  on("[data-rt-save]", () => saveEditor(ctx));
  on("[data-rt-discard]", () =>
    confirmDiscard(ctx, () => {
      if (ui.prepSelection?.startsWith("new:")) ui.prepSelection = null;
      ui.editor = null;
      ctx.render();
    }),
  );
  on("[data-rt-delete]", () => {
    const editor = ui.editor;
    if (!editor?.draft.id) return;
    const kind = editor.kind;
    const id = editor.draft.id;
    ctx.dialog(
      ctx.t("Eliminare?", "Delete?"),
      `<p>${ctx.esc(ctx.t(`«${editor.draft.name}» sarà eliminato. Puoi correggere con Annulla ultima modifica; lo storico delle estrazioni resta.`, `“${editor.draft.name}” will be deleted. You can correct this with Undo last change; the draw history stays.`))}</p>`,
      {
        submitLabel: ctx.t("Elimina", "Delete"),
        onSubmit: () => {
          const slice = tablesOf(ctx.state);
          const before = kind === "table" ? getTable(slice, id) : null;
          ctx.commit(
            ctx.t(`Eliminato: ${editor.draft.name}`, `Deleted: ${editor.draft.name}`),
            (draft) =>
              kind === "table"
                ? deleteTable(tablesOf(draft), id, ctx.role)
                : kind === "deck"
                  ? deleteDeck(tablesOf(draft), id, ctx.role)
                  : deleteTemplate(tablesOf(draft), id, ctx.role),
            kind === "deck"
              ? deckCommitOptions(slice.decks.find((d) => d.id === id))
              : editorCommitOptions(ctx, before, before),
          );
          ui.editor = null;
          ui.prepSelection = null;
          ctx.render();
        },
      },
    );
  });
  on("[data-rt-open-table]", (el) => openTable(ctx, el.dataset.rtOpenTable));
  on("[data-rt-copy-to]", (el) => {
    // Unsaved changes stay in the editor: the copy takes the saved version.
    copyToCampaign(ctx, el.dataset.rtCopyTo);
  });
  on("[data-rt-open-history]", () => {
    ui.prepHistory = !ui.prepHistory;
    ctx.render();
  });
  if (ui.editor?.kind === "table") bindTableEditor(root, ctx);
  else if (ui.editor?.kind === "deck") bindDeckEditor(root, ctx, deckApi);
  else if (ui.editor?.kind === "template") bindTemplateEditor(root, ctx);
  const current = selection(ctx);
  bindDraw(
    root,
    ctx,
    ui.editor?.draft.id && ui.editor.kind !== "deck"
      ? `${ui.editor.kind}:${ui.editor.draft.id}`
      : current && current.kind !== "deck"
        ? `${current.kind}:${current.id}`
        : null,
  );
  applyFocus(root);
}

// ---------------------------------------------------------------------------------------
// Registration.

export function register(registry) {
  area = registry;
  registry.registerStateSlice(ID, { version: 1, seed: seedSlice, normalize: normalizeSlice });
  registry.registerStateSlice(HISTORY, {
    version: 1,
    // Draw evidence survives gameplay Undo (like accepted dice in the log); a reverted draw
    // shows as reversed because its id leaves the undoable slice's `applied` list.
    undo: "preserve",
    seed: () => ({ entries: [] }),
    normalize: normalizeHistory,
  });
  registry.registerStyles(new URL("./tables-decks.css", import.meta.url));
  registry.add("preparation-section", {
    id: ID,
    group: "materials",
    label: L("Tabelle e mazzi", "Tables and decks"),
    roles: ["dm"],
    order: 30,
    render: (ctx) => `<div class="rt-root">${renderPrep(ctx)}</div>`,
    bind: (el, ctx) => bindPrep(el, ctx),
  });
  registry.add("table-panel", {
    id: ID,
    section: "tables",
    label: L("Tabelle e mazzi", "Tables and decks"),
    placement: "sidebar-tab",
    icon: "cards",
    order: 40,
    render: (ctx) => `<div class="rt-root">${renderDrawer(ctx)}</div>`,
    bind: (el, ctx, table) => bindDrawer(el, ctx, table),
  });
  registry.add("table-tool", placeTool);
  registry.add("token-menu", {
    id: `${ID}-sides`,
    submenu: "look",
    label: L("Lati (pedina a più facce)…", "Sides (multi-sided token)…"),
    icon: "dice",
    group: "appearance",
    when: (ctx, target) => {
      const actor = ctx.state.actors[target?.actorId];
      return Boolean(
        actor && ctx.canControl?.(actor) && creatureSides(ctx.state, actor.id).length > 1,
      );
    },
    run: (ctx, target) => openCreatureSides(ctx, target),
  });
  registry.add("map-layer", {
    id: `${ID}-tokens`,
    label: L("Pedine a più facce", "Multi-sided tokens"),
    order: 66,
    interactive: true,
    svg: (ctx, tableView) => tokensSVG(ctx, tableView.scene),
    bind: (el, ctx, table) => bindTokens(el, ctx, table),
  });
  registry.add("sheet-section", {
    id: `${ID}-hand`,
    tab: "extras",
    label: L("Carte in mano", "Cards in hand"),
    when: (ctx, actor) =>
      actor?.kind === "character" &&
      tablesOf(ctx.state).decks.some((deck) => (deck.hands[actor.id] ?? []).length),
    render: (ctx, actor) => `<div class="rt-root">${renderHandSection(ctx, actor, deckApi)}</div>`,
    bind: (el, ctx) =>
      el
        .querySelectorAll("[data-rt-hand-table]")
        .forEach((button) => button.addEventListener("click", () => openTable(ctx, "decks"))),
  });
  registry.add("command", {
    id: `${ID}.open`,
    label: L("Apri tabelle casuali e mazzi", "Open random tables and decks"),
    group: "preparation",
    run: (ctx) =>
      ctx.role === "dm" && ctx.view.page !== "table"
        ? ctx.navigate("preparation", { tab: ID })
        : openTable(ctx, "tables"),
  });
  registry.add("search", {
    id: `${ID}-search`,
    label: L("Tabelle e mazzi", "Tables and decks"),
    search: (ctx, query) => {
      const key = String(query ?? "")
        .trim()
        .toLowerCase();
      if (!key) return [];
      const slice = tablesOf(ctx.state);
      const match = (value) => namesOf(value).some((name) => name.includes(key));
      const dm = ctx.role === "dm";
      // The DM lands on the matched item in Preparation; a player on the Table drawer tab.
      const target = (kind, id) =>
        dm
          ? { page: "preparation", params: { tab: ID, id: `${kind}:${id}` } }
          : {
              page: "table",
              params: { tab: kind === "deck" ? ROUTE_TAB.decks : ROUTE_TAB.tables },
            };
      return [
        ...slice.tables
          .filter((tb) => (dm || tb.playersCanUse) && match(tb.name))
          .map((tb) => ({
            title: tb.name,
            excerpt: L(`Tabella casuale d${tb.sides}`, `Random table d${tb.sides}`),
            ...target("table", tb.id),
          })),
        ...visibleDecks(ctx.state, slice.decks, ctx.role)
          .filter((d) => match(d.name))
          .map((d) => ({
            title: d.name,
            excerpt: L("Mazzo di carte", "Card deck"),
            ...target("deck", d.id),
          })),
        ...(dm ? slice.templates : [])
          .filter((tp) => match(tp.name))
          .map((tp) => ({
            title: tp.name,
            excerpt: L("Modello di testo", "Text template"),
            ...target("template", tp.id),
          })),
      ];
    },
  });
  registry.add("notifications", {
    id: `${ID}-cards`,
    label: L("Carte ricevute", "Cards received"),
    collect: (ctx) =>
      tablesOf(ctx.state).decks.flatMap((deck) =>
        deck.events
          .filter(
            (event) =>
              ["deal", "pass"].includes(event.kind) &&
              event.by !== ctx.role &&
              ownsActor(ctx.state.actors[event.actorId], ctx.role),
          )
          .slice(-5)
          .map((event) => ({
            id: event.id,
            title: L(
              `${ctx.state.actors[event.actorId]?.name}: ${event.count} ${event.count === 1 ? "carta" : "carte"} (${labelIn(deck.name, "it")})`,
              `${ctx.state.actors[event.actorId]?.name}: ${event.count} ${event.count === 1 ? "card" : "cards"} (${labelIn(deck.name, "en")})`,
            ),
            body: L("Nella tua mano privata al Tavolo.", "In your private hand at the Table."),
            time: event.at,
            category: "cards",
            // Opens the Table with the Decks tab of the drawer, where the hand is.
            target: { page: "table", params: { tab: ROUTE_TAB.decks } },
          })),
      ),
  });
  registry.add("draft-guard", {
    id: `${ID}-editor`,
    label: L("Tabella o mazzo non salvato", "Unsaved table or deck"),
    hasDraft: (ctx, next) =>
      Boolean(ui.editor?.dirty) &&
      !(next?.page === "preparation" && next?.tab === ID && !next?.role && !next?.id),
    confirm: (ctx, proceed) => confirmDiscard(ctx, proceed),
  });
  registry.on("role-changed", () => {
    ui.session = null;
    ui.sessionRole = null;
    ui.lastEntryId = null;
    ui.notice = "";
    ui.editor = null;
  });
  registry.on("reset", () => resetRandomTablesUI());
}
