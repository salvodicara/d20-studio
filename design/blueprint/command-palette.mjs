// B23 — global search, command palette, quick create and keyboard shortcuts.
//
// Adopted patterns (census IDs):
// - Command palette with prefixes `>` commands, `@` filters, `?` help and a filter chosen
//   by the context it is opened from (Quick Insert, a Foundry module, FVT-187).
// - Cmd/Ctrl+K opens the search; arrows and Enter pick; Esc closes (Alchemy OmniSearch,
//   VTL-211; Kobold+ Ctrl/Cmd+K, CMP-108).
// - N opens a quick creator with minimal fields for any entry type (Kanka, CMP-237/238).
// - Live fuzzy search that tolerates typos (TaleSpire, VTL-203); results grouped by type
//   with short descriptions and filters (D&D Beyond, announced, DDB-164); full-text match
//   (LegendKeeper, CMP-242).
// - One command registry for palette, guide and keys (Improved Initiative, CMP-155–157);
//   generated keyboard guide (Kobold+, CMP-239); Configure Controls with conflicts and
//   Reset Defaults (Foundry core, FVT-191) — see shortcuts.mjs.
// Every result is a projection the current identity may already read: personal notes
// ("Solo io") and private sheets never reach another identity, revoked entries disappear.
import { normalizeShortcut } from "./registry.mjs";
import * as S from "./shortcuts.mjs";
import { actionToast, insertAtCaret } from "./ui.mjs";
import * as content from "./campaign-content.mjs";
import { canViewActor } from "./character-access.mjs";
import * as hb from "./homebrew.mjs";
import * as srd from "./srd-compendium.mjs";
import { runsSession } from "./table-spatial.mjs";

const ID = "command-palette";
const L = (it, en) => Object.freeze({ it, en });
const PRIVATE = Object.freeze({ local: true, visibility: "private", undoable: false });
const MEMORY_KEY = "d20-studio-palette:v1";
const MAX_RESULTS = 50;
const MAX_COMMANDS = 300;
const MAX_RECENT = 8;
const localized = (it, en) => Object.assign(new Error(en), { it, en });
const textOf = (value, lang) =>
  value && typeof value === "object"
    ? value[lang] || value.it || value.en || ""
    : String(value ?? "");
const cssEscape = (value) =>
  globalThis.CSS?.escape ? globalThis.CSS.escape(value) : String(value).replace(/["\\]/g, "\\$&");
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

let api = null; // this area's registry object (set by register)
let session = null; // the open palette, if any
let keysInstalled = false;
const memoryFallback = new Map();

// ------------------------------------------------------------------ text and fuzzy match

/** Lower case without accents, same length as the input (so match offsets stay valid). */
export function fold(value) {
  return [...String(value ?? "")]
    .map((c) => {
      const f = c.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase();
      return f.length === 1 ? f : (f[0] ?? " ");
    })
    .join("");
}
/** Folded text with punctuation collapsed to single spaces: the matching form. */
export const normalizeText = (value) =>
  fold(value)
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();

/** Optimal string alignment distance (Damerau–Levenshtein with adjacent swaps). */
export function osa(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}
const allowedErrors = (length) => (length >= 8 ? 2 : length >= 4 ? 1 : 0);
// A word may be typed only in part: compare with the word and with its prefix.
const distanceTo = (q, word) =>
  word.length > q.length ? Math.min(osa(q, word), osa(q, word.slice(0, q.length))) : osa(q, word);
// A typo keeps the first letter (people rarely mistype it): "lvia" still finds Livia, while a
// short query no longer drifts to unrelated words (SV-03: "ical", "api").
const typoDistance = (q, word) => (q[0] === word[0] ? distanceTo(q, word) : 99);
// Text inside a word counts only from five letters: "api" is not "Stocco" (rapier), "ical"
// is not "Colpo critico" (critical); "blivi" still finds Oblivion (DDB/Alchemy word search).
const MID_WORD = 5;

// Italian elision (H-07): «costruttore d’incontri» and «costruttore di incontri» are the same
// words. Articles and prepositions, elided or full, map to one form for matching only, as
// Google and Algolia normalise them; a lone word keeps its meaning («la» still starts «Lanterne»).
const ELIDED = new Map(
  Object.entries({
    di: ["d"],
    l: ["il", "lo", "la", "i", "gli", "le"],
    del: ["dell", "dello", "della", "dei", "degli", "delle"],
    al: ["all", "allo", "alla", "ai", "agli", "alle"],
    nel: ["nell", "nello", "nella", "nei", "negli", "nelle"],
    sul: ["sull", "sullo", "sulla", "sui", "sugli", "sulle"],
    dal: ["dall", "dallo", "dalla", "dai", "dagli", "dalle"],
    un: ["uno", "una", "un"],
  }).flatMap(([canon, forms]) => [[canon, canon], ...forms.map((form) => [form, canon])]),
);
const canonical = (words) => words.map((word) => ELIDED.get(word) ?? word);
// A phrase of several words against a text, articles and prepositions in either form:
// 1000 the same words, 900 at the start, 850 whole words inside, 800 the last word typed in
// part; 0 when the phrase is not there.
function phraseScore(words, tokens) {
  if (tokens.length < 2) return 0;
  const q = canonical(tokens).join(" ");
  const text = canonical(words).join(" ");
  if (text === q) return 1000;
  if (text.startsWith(q + " ")) return 900;
  if ((" " + text + " ").includes(" " + q + " ")) return 850;
  if ((" " + text).includes(" " + q)) return 800;
  return 0;
}

// {score, typo}: `typo` is true when the name matches only with a spelling error.
function nameMatch(raw, q, tokens) {
  const name = normalizeText(raw);
  if (!name) return { score: 0, typo: false };
  const hit = (score) => ({ score, typo: false });
  const words = name.split(" ");
  if (name === q) return hit(1000);
  if (words.includes(q)) return hit(name.startsWith(q + " ") ? 900 : 850);
  // One or two letters starting a word are a weak hint ("pe" is not "Perla"): a whole
  // word elsewhere, even in a description, ranks above them.
  const weak = q.length <= 2;
  if (name.startsWith(q)) return hit(weak ? 520 : 900);
  if (words.some((w) => w.startsWith(q))) return hit(weak ? 500 : 800);
  let score = phraseScore(words, tokens);
  const canonWords = canonical(words);
  if (
    !score &&
    tokens.length > 1 &&
    canonical(tokens).every((tk) => canonWords.some((w) => w.startsWith(tk)))
  )
    score = 650;
  if (q.length >= MID_WORD && name.includes(q)) score = Math.max(score, 600);
  if (score) return hit(score);
  const allowed = allowedErrors(q.length);
  const d = allowed
    ? Math.min(q[0] === name[0] ? osa(q, name) : 99, ...words.map((w) => typoDistance(q, w)))
    : 99;
  if (d <= allowed) return { score: 500 - 100 * d, typo: true };
  if (
    tokens.length > 1 &&
    tokens.every((tk) => {
      const a = allowedErrors(tk.length);
      return words.some((w) => w.startsWith(tk) || (a && typoDistance(tk, w) <= a));
    })
  )
    return { score: 450, typo: true };
  return { score: 0, typo: false };
}
// A command's description is read word by word (its synonyms: "PE, punti esperienza"): a
// short query must be a whole word, a longer one may start a word (Alchemy OmniSearch).
function wordsScore(raw, q, tokens) {
  const text = normalizeText(raw);
  if (!text) return 0;
  const words = text.split(" ");
  if (words.includes(q)) return 600;
  if (tokens.length > 1 && phraseScore(words, tokens) >= 850) return 580;
  const starts = (tk) => words.some((w) => w === tk || (tk.length >= 3 && w.startsWith(tk)));
  if (tokens.length === 1 && starts(q)) return 540;
  if (tokens.length > 1 && tokens.every(starts)) return 520;
  if (tokens.length > 1 && phraseScore(words, tokens)) return 520;
  return 0;
}

/**
 * Relevance of an item for a query, with whether it is only a typo: exact, prefix, word
 * prefix, a phrase with articles in either form, all words, text inside a word (five letters
 * or more), then typo-tolerant (1 error from 4 letters, 2 from 8, first letter kept).
 * Keywords (explicit synonyms) score just below the same match on the name; words of a
 * description below any name match; then a match in the full text. Score 0 means no match.
 */
export function matchDetail(item, query) {
  const q = normalizeText(query);
  if (!q) return { score: 1, typo: false };
  const tokens = q.split(" ");
  let best = { score: 0, typo: false };
  const take = (found) => {
    if (found.score > best.score || (found.score === best.score && best.typo && !found.typo))
      best = found;
  };
  for (const raw of item.names ?? []) take(nameMatch(raw, q, tokens));
  for (const raw of item.keywords ?? []) {
    const found = nameMatch(raw, q, tokens);
    take({ score: Math.round(found.score * 0.9), typo: found.typo });
  }
  if (best.score < 600)
    for (const raw of item.words ?? []) take({ score: wordsScore(raw, q, tokens), typo: false });
  if (best.score < 300 && q.length >= 2 && item.text && normalizeText(item.text).includes(q))
    best = { score: 300, typo: false };
  return best;
}
/** The relevance alone (see matchDetail). */
export const matchScore = (item, query) => matchDetail(item, query).score;

/** Text around the first match, split for highlighting: {before, match, after}. */
export function snippet(text, query, width = 110) {
  const source = String(text ?? "").replace(/\s+/g, " ");
  const q = fold(String(query ?? "").trim());
  const at = q ? fold(source).indexOf(q) : -1;
  if (at < 0)
    return {
      before: source.slice(0, width) + (source.length > width ? "…" : ""),
      match: "",
      after: "",
    };
  const start = Math.max(0, at - 36);
  const end = Math.min(source.length, at + q.length + (width - 36 - q.length));
  return {
    before: (start > 0 ? "…" : "") + source.slice(start, at),
    match: source.slice(at, at + q.length),
    after: source.slice(at + q.length, end) + (end < source.length ? "…" : ""),
  };
}
const marked = (parts) =>
  escape(parts.before) +
  (parts.match ? `<mark>${escape(parts.match)}</mark>` : "") +
  escape(parts.after);

// ------------------------------------------------------------------ types, scopes, filters

const TYPES = {
  character: [L("Personaggio", "Character"), 0],
  companion: [L("Compagno", "Companion"), 0],
  npc: [L("PNG", "NPC"), 1],
  note: [L("Nota", "Note"), 2],
  person: [L("Persona", "Person"), 2],
  place: [L("Luogo", "Place"), 2],
  faction: [L("Fazione", "Faction"), 2],
  world: [L("Voce del mondo", "World entry"), 2],
  quest: [L("Missione", "Quest"), 2],
  recap: [L("Resoconto", "Recap"), 3],
  scene: [L("Scena", "Scene"), 3],
  spell: [L("Incantesimo", "Spell"), 4],
  item: [L("Oggetto", "Item"), 4],
  rule: [L("Regola", "Rule"), 5],
  condition: [L("Condizione", "Condition"), 5],
  creature: [L("Creatura", "Creature"), 5],
  class: [L("Classe", "Class"), 5],
  page: [L("Pagina", "Page"), 6],
  command: [L("Comando", "Command"), 7],
  control: [L("Su questa pagina", "On this page"), 7],
  provider: [L("Contenuto", "Content"), 8],
  filter: [L("Filtro", "Filter"), 9],
  help: [L("Guida", "Guide"), 9],
  gone: [L("Non disponibile", "Unavailable"), 9],
};
const typeRank = (type) => TYPES[type]?.[1] ?? 8;
const WORLD_TYPES = { person: "person", place: "place", faction: "faction", other: "world" };

/** Filters for `@`: core categories plus one per area search provider (Quick Insert). */
export const CORE_FILTERS = Object.freeze([
  {
    id: "characters",
    label: L("Personaggi", "Characters"),
    types: ["character", "companion", "npc"],
    aliases: ["pg", "pc", "png", "npc"],
  },
  { id: "notes", label: L("Note", "Notes"), types: ["note"], aliases: ["appunti"] },
  {
    id: "world",
    label: L("Mondo", "World"),
    types: ["person", "place", "faction", "world"],
    aliases: ["luoghi", "places", "persone", "mappa", "calendario", "map", "calendar"],
    providers: ["world-map-search"],
  },
  {
    id: "quests",
    label: L("Missioni e archivio", "Quests and archive"),
    types: ["quest"],
    aliases: ["missioni", "quests", "archivio", "archive"],
    providers: ["quests-search"],
  },
  {
    id: "journal",
    label: L("Diario", "Journal"),
    types: ["recap"],
    aliases: ["resoconti", "recaps"],
  },
  {
    id: "spells",
    label: L("Incantesimi", "Spells"),
    types: ["spell"],
    aliases: ["magie", "incantesimo"],
  },
  {
    id: "items",
    label: L("Oggetti", "Items"),
    types: ["item"],
    aliases: ["inventario", "inventory"],
  },
  {
    id: "rules",
    label: L("Regole", "Rules"),
    types: ["rule", "condition"],
    aliases: ["condizioni", "conditions", "glossario", "regole della tavola", "table rules"],
    providers: ["campaign-settings-search"],
  },
  {
    id: "creatures",
    label: L("Creature", "Creatures"),
    types: ["creature", "npc"],
    aliases: ["mostri", "monsters"],
  },
  {
    id: "scenes",
    label: L("Scene", "Scenes"),
    types: ["scene"],
    aliases: ["cartelle", "prefabbricati", "folders", "prefabs"],
    providers: ["scene-assets-search"],
  },
  {
    id: "pages",
    label: L("Pagine e aiuto", "Pages and help"),
    types: ["page"],
    aliases: ["vai", "go", "pagine", "pages", "aiuto", "help", "account", "offline"],
    providers: ["account-pages", "offline-page", "home-search"],
  },
  { id: "commands", label: L("Comandi", "Commands"), types: ["command"], aliases: [] },
]);
// A provider whose results already belong to a core category joins it instead of adding
// an overlapping filter (SV-03: «Missioni» and «Missioni e archivio», «Regole» and
// «Regole della tavola», «Mondo» and «Mappa e calendario» were separate choices).
const MERGED = new Set(CORE_FILTERS.flatMap((f) => f.providers ?? []));
function availableFilters(ctx) {
  const providers = providersFor(ctx)
    .filter((c) => !MERGED.has(c.id))
    .map((c) => ({
      id: "p-" + c.id,
      label: c.label,
      types: [],
      provider: c.id,
      providers: [c.id],
      aliases: [c.id],
    }));
  return [...CORE_FILTERS, ...providers];
}
/** Whether a result belongs to a category (its types or its merged providers). */
const inFilter = (filter, item) =>
  item.provider
    ? (filter.providers ?? []).includes(item.provider)
    : (filter.types ?? []).includes(item.type);
/** The filter an `@token` names (id, Italian or English label, alias; prefix allowed). */
export function matchFilter(token, filters = CORE_FILTERS) {
  const q = normalizeText(token);
  if (!q) return null;
  const names = (f) => [f.id, f.label.it, f.label.en, ...(f.aliases ?? [])].map(normalizeText);
  return (
    filters.find((f) => names(f).some((n) => n === q)) ??
    filters.find((f) => names(f).some((n) => n.split(" ").some((w) => w.startsWith(q)))) ??
    null
  );
}
/**
 * Prefix grammar (Quick Insert): `>` commands, `?` help, `@filter rest` filtered search,
 * a bare `@tok` lists matching filters; anything else searches everything.
 */
export function parseQuery(text, filters = CORE_FILTERS) {
  const raw = String(text ?? "").replace(/^\s+/, "");
  if (raw.startsWith(">")) return { mode: "commands", query: raw.slice(1).trim() };
  if (raw.startsWith("?")) return { mode: "help", query: raw.slice(1).trim() };
  if (raw.startsWith("@")) {
    const match = /^@(\S*)(\s+)?([\s\S]*)$/.exec(raw);
    const token = match[1];
    const filter = match[2] ? matchFilter(token, filters) : null;
    return filter
      ? { mode: "search", query: match[3].trim(), filter, consumed: raw.length - match[3].length }
      : { mode: "filters", query: token };
  }
  return { mode: "search", query: raw.trim() };
}

// ------------------------------------------------------------------ index of readable content

const reg = (ctx) => ctx?.registry ?? api;
const campaignReadable = (ctx) =>
  content.getCampaignHub(ctx.state, ctx.state.campaign?.id, ctx.role).permissions.canRead;
const actorLabel = (ctx, actor) =>
  `${textOf(actor.className, ctx.lang)}${actor.level ? ` · ${ctx.t("Livello", "Level")} ${actor.level}` : ""}`;

/** Destinations of the core navigation plus area pages and sections for this identity. */
export function pageEntries(ctx) {
  const r = reg(ctx);
  const campaign = campaignReadable(ctx);
  const dm = ctx.role === "dm";
  // B20 campaign policy (campaign-settings.mjs, Kanka CMP-24): a section the DM turned off
  // is no destination.
  const hidden =
    ctx.state.ext?.["campaign-settings"]?.campaigns?.[ctx.state.campaign?.id]?.policy
      ?.hiddenSections ?? [];
  const page = (key, target, label, extra = {}) => ({ key, target, label, ...extra });
  const pages = [
    page("home", { page: "home" }, L("Inizio", "Home"), { aliases: ["home", "dashboard"] }),
    page("characters", { page: "characters" }, L("Personaggi", "Characters"), {
      aliases: ["schede", "sheets"],
    }),
    page("campaigns", { page: "campaigns" }, L("Campagne", "Campaigns")),
    page("library", { page: "library" }, L("Biblioteca", "Library"), { aliases: ["compendio"] }),
    page("notes", { page: "notes" }, L("Appunti personali", "Personal notes"), {
      aliases: ["note"],
    }),
  ];
  if (campaign) {
    pages.push(
      page("table", { page: "table" }, L("Tavolo", "Table"), { aliases: ["mappa", "map"] }),
    );
    for (const [id, it, en, onlyDm] of [
      ["overview", "Panoramica", "Overview"],
      ["group", "Gruppo", "Party"],
      ["sessions", "Sessioni", "Sessions"],
      ["journal", "Diario", "Journal"],
      ["world", "Mondo", "World"],
      ["preparation", "Preparazione", "Preparation", true],
      ["settings", "Impostazioni", "Settings", true],
    ])
      if ((!onlyDm || dm) && !hidden.includes(id))
        pages.push(
          page(
            "campaign." + id,
            id === "preparation"
              ? { page: "preparation" }
              : { page: "campaign", params: { tab: id } },
            L("Campagna · " + it, "Campaign · " + en),
            { aliases: [it, en] },
          ),
        );
  }
  const list = (point) => {
    try {
      return r?.list(point, ctx) ?? [];
    } catch {
      return [];
    }
  };
  for (const route of list("route").filter((c) => c.nav && !c.replaces))
    pages.push(page("route." + route.id, { page: route.id }, route.label));
  if (campaign)
    for (const section of list("campaign-section").filter(
      (c) => !c.replaces && !hidden.includes(c.id),
    ))
      pages.push(
        page(
          "campaign." + section.id,
          { page: "campaign", params: { tab: section.id } },
          L("Campagna · " + section.label.it, "Campaign · " + section.label.en),
          { aliases: [section.label.it, section.label.en] },
        ),
      );
  if (dm)
    for (const section of list("preparation-section"))
      pages.push(
        page(
          "preparation." + section.id,
          { page: "preparation", params: { tab: section.id } },
          L("Preparazione · " + section.label.it, "Preparation · " + section.label.en),
          { aliases: [section.label.it, section.label.en] },
        ),
      );
  for (const section of list("library-section"))
    pages.push(
      page(
        "library." + section.id,
        { page: "library", params: { tab: section.id } },
        L("Biblioteca · " + section.label.it, "Library · " + section.label.en),
        { aliases: [section.label.it, section.label.en] },
      ),
    );
  return pages;
}

function visibleActors(ctx) {
  const campaign = campaignReadable(ctx);
  return Object.values(ctx.state.actors ?? {}).filter(
    (a) =>
      (a.kind === "character" || a.companion) &&
      canViewActor(a, ctx.role, ctx.state) &&
      (campaign || a.owner === ctx.role),
  );
}
const compendiumReady = (ctx) => {
  try {
    return Boolean(reg(ctx)?.get("library-section", "compendium", ctx));
  } catch {
    return false;
  }
};
const SRD_TYPES = {
  spell: "spell",
  creature: "creature",
  item: "item",
  rule: "rule",
  condition: "condition",
  class: "class",
};
// Homebrew types as search categories (the badge keeps the Library's own type name).
const HOMEBREW_TYPES = {
  ...SRD_TYPES,
  subclass: "class",
  weapon: "item",
  armor: "item",
  consumable: "item",
};

/**
 * Every readable destination for this identity from the core data: pages, characters,
 * their spells and inventory, campaign entries, scenes, NPCs (DM), readable Library
 * homebrew and the SRD compendium. A source that fails is named in `failed`.
 */
// Final review SV-02/SV-03 (Alchemy OmniSearch aliases, Kanka search words): the natural
// Italian and English words people type for functions whose labels say it differently. A
// command gains them as keywords; a destination without a command is a page row of its own.
const COMMAND_ALIASES = Object.freeze({
  "scene-assets.view-1": ["posizioni della camera", "posizione della camera", "camera positions"],
  "community.recruit": [
    "candidatura",
    "candidature",
    "lista d’attesa",
    "lista d'attesa",
    "waitlist",
  ],
  "community.find": ["candidatura", "lista d’attesa", "lista d'attesa", "cerco un gruppo"],
  "account.open": [
    "elimina account",
    "cancella account",
    "elimina il mio account",
    "delete account",
  ],
  "encounter-builder.open": ["rinforzi", "ondate di nemici", "reinforcements"],
  "special-moves.tray": [
    "saltare",
    "salto",
    "cadere",
    "caduta",
    "arrampicarsi",
    "nuotare",
    "jump",
    "fall",
    "climb",
  ],
  "party.overview": [
    "magie condivise",
    "veicoli",
    "veicolo del gruppo",
    "shared spells",
    "vehicles",
  ],
  "media.open": ["immagini alternative", "immagini della pedina", "alternate images"],
  "travel.open": ["turni di guardia", "guardia notturna", "watch shifts"],
  "session-view.spectator": ["schermo fisico", "televisore", "proiettore", "physical screen"],
  "token-menu.add-creature": ["pedine numerate", "numera le pedine", "numbered tokens"],
  "chat.snapshot": ["istantanea della scena", "foto della scena", "scene snapshot"],
  "preferences.open": ["dadi 3d", "animazione dei dadi", "3d dice"],
  // Close review 01/10 (completeness F4): the natural words that found nothing.
  "random-tables.open": [
    "incontro casuale",
    "incontri casuali",
    "random encounter",
    "mazzo di carte",
    "mazzi di carte",
    "pesca una carta",
    "deck of cards",
    "draw a card",
  ],
  "generators.names": ["nome casuale", "nomi casuali", "nome a caso", "random name"],
  "quickbar.slot-1": ["macro", "macro della barra", "hotbar macro"],
});
const aliasesOf = (id) => COMMAND_ALIASES[id] ?? [];
function aliasPages(ctx) {
  const state = ctx.state;
  const own =
    Object.values(state.actors ?? {}).find(
      (a) => a?.kind === "character" && !a.companion && a.owner === ctx.role,
    ) ??
    Object.values(state.actors ?? {}).find(
      (a) => a?.kind === "character" && !a.companion && ctx.canControl?.(a),
    );
  const rows = [];
  const add = (key, title, words, target) =>
    rows.push({
      key: "alias:" + key,
      type: "page",
      title,
      names: [title.it, title.en],
      keywords: words,
      target,
    });
  if (own) {
    const sheet = (tab) => ({ page: "characters", params: { id: own.id, tab } });
    add(
      "inventory",
      L(`Inventario di ${own.name}`, `${own.name}’s inventory`),
      [
        "sintonia",
        "contenitore",
        "contenitori",
        "non identificato",
        "attunement",
        "container",
        "unidentified",
      ],
      sheet("inventory"),
    );
    add(
      "spells",
      L(`Magie di ${own.name}`, `${own.name}’s spells`),
      ["trascrivi", "trascrivere", "libro degli incantesimi", "copy spells"],
      sheet("spells"),
    );
    add(
      "story",
      L(
        `Storia di ${own.name}: tratti, ideali, legami, difetti`,
        `${own.name}’s story: traits, ideals, bonds, flaws`,
      ),
      ["legame", "legami", "ideali", "difetti", "tratti", "bonds", "ideals", "flaws"],
      sheet("story"),
    );
    add(
      "level",
      L(`Avanza di livello · ${own.name}`, `Level up · ${own.name}`),
      ["salire di livello", "avanza di livello", "multiclasse", "level up", "multiclass"],
      sheet("actions"),
    );
  }
  if (campaignReadable(ctx)) {
    add(
      "sessions",
      L("Campagna · Sessioni: sondaggi e presenze", "Campaign · Sessions: polls and attendance"),
      ["sondaggio", "presenze", "disponibilità", "poll", "attendance"],
      { page: "campaign", params: { tab: "sessions" } },
    );
    add(
      "safety",
      L("Campagna · Sicurezza: linee e veli", "Campaign · Safety: lines and veils"),
      ["linee e veli", "linee", "veli", "lines and veils"],
      { page: "campaign", params: { tab: "safety" } },
    );
    add(
      "table-actions",
      L("Tavolo · azioni: Aiuto, Preparare", "Table · actions: Help, Ready"),
      [
        "aiutare",
        "aiuto",
        "preparare un’azione",
        "preparare un'azione",
        "help action",
        "ready an action",
      ],
      { page: "table" },
    );
    if (ctx.role === "dm")
      add(
        "legendary",
        L("Tavolo · Combattimento: azioni leggendarie", "Table · Combat: legendary actions"),
        ["azioni leggendarie", "azioni di tana", "legendary actions"],
        { page: "table" },
      );
  }
  return rows;
}
export function coreItems(ctx, failed = null) {
  const items = [];
  const push = (item) => items.push(item);
  for (const row of aliasPages(ctx)) push(row);
  const sheetActor = ctx.view?.page === "characters" ? ctx.view.id : "";
  for (const p of pageEntries(ctx))
    push({
      key: "page:" + p.key,
      type: "page",
      title: p.label,
      names: [p.label.it, p.label.en, ...(p.aliases ?? [])],
      target: p.target,
    });
  for (const actor of visibleActors(ctx)) {
    const own = actor.visibility === "private";
    push({
      key: "character:" + actor.id,
      type: actor.companion ? "companion" : "character",
      title: actor.name,
      names: [actor.name],
      excerpt: actorLabel(ctx, actor),
      scope: own ? L("Personale", "Personal") : L("Campagna", "Campaign"),
      target: { page: "characters", params: { id: actor.id, tab: "actions" } },
    });
    // A spell on a sheet opens that sheet's Spells tab; the SRD text is its own row.
    for (const spell of actor.spells ?? [])
      push({
        key: `spell:${actor.id}:${spell.id}`,
        type: "spell",
        title: spell.name,
        names: [textOf(spell.name, "it"), textOf(spell.name, "en")],
        text: textOf(spell.description, ctx.lang),
        excerpt: L(
          `Nella scheda di ${actor.name} · ${spell.level ? `livello ${spell.level}` : "trucchetto"}${spell.prepared ? " · preparato" : ""}`,
          `On ${actor.name}’s sheet · ${spell.level ? `level ${spell.level}` : "cantrip"}${spell.prepared ? " · prepared" : ""}`,
        ),
        scope: L("Scheda di " + actor.name, actor.name + "’s sheet"),
        contextual: actor.id === sheetActor,
        target: { page: "characters", params: { id: actor.id, tab: "spells" } },
      });
    for (const entry of actor.inventory ?? [])
      push({
        key: `item:${actor.id}:${entry.id}`,
        type: "item",
        title: entry.name,
        names: [textOf(entry.name, "it"), textOf(entry.name, "en")],
        text: textOf(entry.description, ctx.lang),
        excerpt: L(
          `Inventario di ${actor.name} · ×${entry.quantity ?? 1}`,
          `${actor.name}’s inventory · ×${entry.quantity ?? 1}`,
        ),
        scope: L("Scheda di " + actor.name, actor.name + "’s sheet"),
        contextual: actor.id === sheetActor,
        target: { page: "characters", params: { id: actor.id, tab: "inventory" } },
      });
  }
  let entries = [];
  try {
    entries = content.listCampaignEntries(ctx.state, {}, ctx.role);
  } catch {
    failed?.add(textOf(L("Voci della campagna e note", "Campaign entries and notes"), ctx.lang));
  }
  const current = ctx.state.campaign?.id ?? null;
  for (const entry of entries) {
    const data = entry.data ?? {};
    const type = entry.kind === "world" ? (WORLD_TYPES[data.worldType] ?? "world") : entry.kind;
    const body = [data.body, ...(data.sections ?? []).flatMap((s) => [s.title, s.body])]
      .filter(Boolean)
      .join(" ");
    const title = data.title || textOf(L("Voce senza titolo", "Untitled entry"), ctx.lang);
    const personal = entry.ownerId === ctx.role && entry.access?.mode === "private";
    push({
      key: "entry:" + entry.id,
      type: TYPES[type] ? type : "world",
      title,
      names: [data.title || ""],
      text: body,
      excerpt: body,
      scope: personal
        ? L("Solo io", "Only me")
        : entry.campaignId && entry.campaignId !== current
          ? L("Altra campagna", "Another campaign")
          : L("Campagna", "Campaign"),
      target: {
        page: entry.kind === "note" ? "notes" : "campaign",
        params: { id: entry.id, tab: "entry" },
      },
    });
  }
  const campaign = campaignReadable(ctx);
  for (const scene of ctx.state.scenes ?? []) {
    if (ctx.role === "dm")
      push({
        key: "scene:" + scene.id,
        type: "scene",
        title: scene.name,
        names: [scene.name],
        text: scene.description,
        excerpt:
          scene.id === ctx.state.activeSceneId
            ? L("Scena attiva", "Active scene")
            : L("Preparazione", "Preparation"),
        target: { page: "preparation", params: { id: scene.id } },
      });
    else if (campaign && scene.revealed && scene.id === ctx.state.activeSceneId)
      push({
        key: "scene:" + scene.id,
        type: "scene",
        title: scene.name,
        names: [scene.name],
        text: scene.publicDescription,
        excerpt: L("Scena attiva sul Tavolo", "Active scene on the Table"),
        target: { page: "table" },
      });
  }
  if (ctx.role === "dm" && campaign) {
    const active = (ctx.state.scenes ?? []).find((s) => s.id === ctx.state.activeSceneId);
    for (const actor of Object.values(ctx.state.actors ?? {}))
      if (actor.kind === "npc" && !actor.companion && canViewActor(actor, ctx.role, ctx.state))
        push({
          key: "npc:" + actor.id,
          type: "npc",
          title: actor.name,
          names: [actor.name],
          excerpt: active?.tokens?.some((tk) => tk.actorId === actor.id)
            ? L("Sul Tavolo: seleziona la pedina", "On the Table: selects the token")
            : L("Non nella scena attiva", "Not in the active scene"),
          target: { page: "table", params: { id: actor.id } },
        });
  }
  // Library homebrew: the latest revision this identity may read (owner, reader, editor).
  let homebrew = [];
  try {
    homebrew = hb.listHomebrew(ctx.state, ctx.role);
  } catch {
    failed?.add(textOf(L("Biblioteca", "Library"), ctx.lang));
  }
  const hbTypes = hb.getHomebrewTypes();
  for (const entry of homebrew) {
    const kind = hbTypes.find((type) => type.id === entry.type)?.name ?? L("Contenuto", "Content");
    push({
      key: "homebrew:" + entry.id,
      type: HOMEBREW_TYPES[entry.type] ?? "rule",
      badge: kind,
      title: entry.name,
      names: [textOf(entry.name, "it"), textOf(entry.name, "en")],
      excerpt: L(`Biblioteca · ${textOf(kind, "it")}`, `Library · ${textOf(kind, "en")}`),
      scope: entry.owner === ctx.role ? L("Personale", "Personal") : L("Condiviso", "Shared"),
      target: {
        page: "library",
        params: { id: entry.id, revision: entry.latestRef.revisionId, tab: "available" },
      },
    });
  }
  if (compendiumReady(ctx))
    for (const category of srd.CATEGORIES)
      for (const entry of srd.categoryEntries(category.id))
        push({
          key: "srd:" + entry.id,
          type: SRD_TYPES[entry.kind] ?? "rule",
          title: entry.name,
          names: [
            entry.name.it,
            entry.name.en,
            ...(entry.altNames?.it ?? []),
            ...(entry.altNames?.en ?? []),
          ],
          excerpt: L(
            `${srd.kindLabel(entry).it}${srd.entryMeta(entry, "it") ? " · " + srd.entryMeta(entry, "it") : ""}`,
            `${srd.kindLabel(entry).en}${srd.entryMeta(entry, "en") ? " · " + srd.entryMeta(entry, "en") : ""}`,
          ),
          scope: L(`SRD ${srd.REVISION}`, `SRD ${srd.REVISION}`),
          target: {
            page: "library",
            params: {
              tab: "compendium",
              revision: entry.kind === "class" ? `class:${entry.classId}` : entry.id,
            },
          },
        });
  return items;
}

function providersFor(ctx) {
  try {
    const all = reg(ctx)?.list("search", ctx, "") ?? [];
    // The SRD is indexed directly (typo tolerance, type filters): its provider would repeat it.
    return compendiumReady(ctx) ? all.filter((c) => c.id !== "compendium") : all;
  } catch {
    return [];
  }
}
// Pages that show the campaign in play: only its members open them (app.mjs gate), so an
// area result leading there is withheld from a former member (revocation, F-062).
const CAMPAIGN_PAGES = new Set(["campaign", "table", "preparation", "session-view-display"]);
const FAILED = Symbol("failed");
const isLabelOrText = (value) =>
  (typeof value === "string" && value.trim()) || (value && typeof value === "object" && value.it);
/**
 * One probe through every visible area provider, each isolated by the registry (a
 * failure stays a contained warning) and named in `failed` so the palette can say that a
 * source did not answer instead of "no results" (I-184).
 */
function searchProviders(ctx, probe, only, failed) {
  const r = reg(ctx);
  // Without the host registry (no per-provider calls): its combined, contained search.
  if (typeof r?.call !== "function")
    return (r?.search?.(ctx, probe) ?? []).filter(
      (result) =>
        providersFor(ctx).some((c) => c.id === result.provider) &&
        (!only || [].concat(only).includes(result.provider)),
    );
  let gate = null;
  try {
    gate = r?.accessGate?.(ctx) ?? null;
  } catch {}
  const out = [];
  for (const c of providersFor(ctx)) {
    if ((only && ![].concat(only).includes(c.id)) || (gate && gate.extension !== c.extension))
      continue;
    const results = r.call(c, "search", FAILED, ctx, probe);
    if (results === FAILED || !Array.isArray(results)) {
      failed?.add(textOf(c.label, ctx.lang));
      continue;
    }
    out.push(
      ...results
        .filter((result) => isLabelOrText(result?.title) && typeof result?.page === "string")
        .slice(0, 20)
        .map((result) => ({ ...result, provider: c.id, providerLabel: c.label })),
    );
  }
  return out;
}
/**
 * Area results (chat, materials, tables...) through their own permitted search. A longer
 * query is also probed by its first letters so a later typo still finds candidates.
 */
export function providerItems(ctx, query, { only = null, failed = null } = {}) {
  const q = String(query ?? "").trim();
  if (!q) return [];
  const probes = [...new Set([q, ...(q.length >= 5 ? [q.slice(0, 4), q.slice(0, 3)] : [])])];
  const member = campaignReadable(ctx);
  const seen = new Set();
  const out = [];
  for (const probe of probes) {
    for (const r of searchProviders(ctx, probe, only, failed)) {
      if (!member && CAMPAIGN_PAGES.has(r.page)) continue;
      const title = textOf(r.title, ctx.lang);
      const key = `provider:${r.provider}:${r.page}:${JSON.stringify(r.params ?? {})}:${title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        key,
        type: "provider",
        provider: r.provider,
        badge: r.providerLabel,
        title: r.title,
        names: [textOf(r.title, "it"), textOf(r.title, "en")],
        text: textOf(r.excerpt, ctx.lang),
        excerpt: r.excerpt ?? "",
        // A provider may state who can read the result ("Solo io", "Campagna"...).
        scope: isLabelOrText(r.scope) ? r.scope : null,
        target: { page: r.page, params: r.params ?? {} },
        probe: title,
      });
    }
  }
  return out;
}

// ------------------------------------------------------------------ one command catalogue

const pressCore = (selector, it, en) => {
  const el = globalThis.document?.querySelector?.(`#content ${selector}`);
  if (!el) throw localized(it, en);
  el.click();
};
// Palette-owned commands. Defaults are copied from their sources: Mod+K Alchemy/Kobold+,
// N Kanka quick creator, ? Improved Initiative/Kobold+ help, Alt+R Improved Initiative
// start encounter, Y BG3 rest. Improved Initiative's quick edit "e" is not taken: the
// Table's aura tool (B18) already uses E, and the registry keeps the first one loaded.
const OWN_COMMANDS = [
  {
    id: "command-palette.open",
    label: L("Apri ricerca e comandi", "Open search and commands"),
    shortcut: "Mod+K",
    group: "palette",
    run: (ctx) => openPalette(ctx),
  },
  {
    id: "command-palette.create",
    label: L("Creazione rapida", "Quick create"),
    description: L(
      "Nota, persona, luogo, fazione, negozio, evento, elenco, missione, resoconto, oggetto, mostro, incantesimo, materiale, sessione, personaggio: nuova voce",
      "Note, person, place, faction, shop, event, checklist, quest, recap, item, monster, spell, material, session, character: new entry",
    ),
    shortcut: "N",
    group: "palette",
    run: (ctx) => openQuickCreate(ctx),
  },
  // D&D Beyond Quick Jot (J): a note written over the Table, which stays open (CA-11).
  {
    id: "command-palette.jot",
    label: L("Appunto rapido", "Quick jot"),
    description: L(
      "annota, appunti, nota veloce, scrivi un appunto senza lasciare il Tavolo",
      "jot, notes, quick note, write a note without leaving the Table",
    ),
    shortcut: "J",
    group: "palette",
    run: (ctx) => openQuickCreate(ctx, { kind: "note", jot: true }),
  },
  {
    id: "command-palette.guide",
    label: L("Guida alle scorciatoie", "Keyboard shortcut guide"),
    shortcut: "?",
    group: "palette",
    run: (ctx) => openGuide(ctx),
  },
  {
    id: "command-palette.controls",
    label: L("Configura le scorciatoie", "Configure shortcuts"),
    group: "palette",
    run: (ctx) => openControls(ctx),
  },
  {
    id: "command-palette.undo",
    label: L("Annulla la tua ultima modifica", "Undo your last change"),
    group: "navigation",
    run: (ctx) => {
      if (!ctx.canUndo?.())
        throw localized(
          "Non c’è una tua modifica recente da annullare.",
          "There is no recent change of yours to undo.",
        );
      ctx.undo();
    },
  },
  {
    id: "command-palette.rests",
    label: L("Riposi (breve o lungo)", "Rests (short or long)"),
    shortcut: "Y",
    group: "table",
    run: (ctx) =>
      ctx.openRest?.(ctx.view?.page === "characters" && ctx.view.id ? ctx.view.id : undefined),
  },
  {
    id: "command-palette.end-turn",
    label: L("Termina turno", "End turn"),
    context: "table",
    group: "table",
    run: (ctx) => {
      if (!ctx.state.combat?.active)
        throw localized("Nessun combattimento in corso.", "No combat in progress.");
      pressCore(
        '[data-table="end-turn"]',
        "Non è il tuo turno: può terminarlo chi agisce o il DM.",
        "It is not your turn: the acting player or the DM can end it.",
      );
    },
  },
  {
    id: "command-palette.status",
    label: L(
      "Condizioni e stato della pedina selezionata",
      "Conditions and status of the selected token",
    ),
    context: "table",
    group: "table",
    run: () =>
      pressCore(
        "[data-conditions-summary] [data-conditions-entry]",
        "Seleziona una pedina che controlli.",
        "Select a token you control.",
      ),
  },
  {
    id: "command-palette.log",
    label: L("Mostra o nascondi il registro", "Show or hide the log"),
    context: "table",
    group: "table",
    run: () => pressCore('[data-table="log"]', "Registro non disponibile.", "Log unavailable."),
  },
  {
    id: "command-palette.encounter",
    label: L("Avvia o concludi il combattimento", "Start or end combat"),
    shortcut: "Alt+R",
    context: "table",
    roles: ["dm"],
    group: "table",
    run: () =>
      pressCore(
        '[data-table="combat"]',
        "Comando non disponibile qui.",
        "Command unavailable here.",
      ),
  },
];
const GROUPS = {
  palette: L("Ricerca e comandi", "Search and commands"),
  navigation: L("Navigazione", "Navigation"),
  table: L("Tavolo", "Table"),
  "token-menu": L("Pedine", "Tokens"),
  services: L("Servizi", "Services"),
  library: L("Biblioteca", "Library"),
  campaign: L("Campagna", "Campaign"),
  chat: L("Chat", "Chat"),
  handouts: L("Materiali", "Materials"),
  preparation: L("Preparazione", "Preparation"),
  safety: L("Sicurezza", "Safety"),
  account: L("Account", "Account"),
};

/**
 * Registry commands visible to this identity (roles and `when`) plus navigation to every
 * page it can open, each runnable, with its registered default key.
 */
export function catalogue(ctx) {
  const r = reg(ctx);
  let registered = [];
  try {
    registered = r?.list("command", ctx) ?? [];
  } catch {
    registered = [];
  }
  return [
    ...registered.map((c) => ({
      id: c.id,
      label: c.label,
      description: c.description,
      keywords: c.keywords,
      context: c.context ?? "global",
      shortcut: c.shortcut ?? null,
      shortcutConflict: c.shortcutConflict ?? null,
      group: c.group ?? c.extension,
      extension: c.extension,
      run: (context) => r.run(c, context),
    })),
    ...pageEntries(ctx).map((p) => ({
      id: "page:" + p.key,
      label: L("Vai a: " + p.label.it, "Go to: " + p.label.en),
      context: "global",
      shortcut: null,
      group: "navigation",
      extension: ID,
      page: true,
      run: (context) => context.navigate(p.target.page, p.target.params ?? {}),
    })),
  ];
}
function overridesFor(ctx) {
  try {
    return api.slice(ctx.state).bindings?.[ctx.role] ?? {};
  } catch {
    return {};
  }
}
/** Rows of the catalogue with this identity's effective keys and conflicts. */
export const rowsFor = (ctx) => S.bindingRows(catalogue(ctx), overridesFor(ctx));
const isMac = () => S.isMacPlatform();
const keyText = (ctx, shortcut, mac = isMac()) =>
  S.formatShortcut(shortcut, { lang: ctx.lang, mac });
const kbd = (ctx, shortcut) =>
  shortcut
    ? `<kbd class="cmdk-kbd">${S.shortcutParts(shortcut, { lang: ctx.lang, mac: isMac() })
        .map(escape)
        .join('</kbd><kbd class="cmdk-kbd">')}</kbd>`
    : "";
// Where a command works, with the page's own name ("Nella pagina Biblioteca").
function contextLabel(ctx, context) {
  if (context === "global") return L("Ovunque", "Everywhere");
  if (context === "table") return L("Sul Tavolo", "At the Table");
  let page = null;
  try {
    const pages = pageEntries(ctx).filter((p) => p.target.page === context);
    page = (pages.find((p) => !p.target.params?.tab) ?? pages[0])?.label ?? null;
  } catch {}
  const name = (lang) => (page ? textOf(page, lang).split(" · ")[0] : context);
  return L("Nella pagina " + name("it"), "On page " + name("en"));
}
const contextName = (ctx, context) => textOf(contextLabel(ctx, context), ctx.lang);

/** This identity's key for a command now (its own choice or the default), or null. */
export const effectiveShortcut = (ctx, id) =>
  rowsFor(ctx).find((row) => row.id === id)?.shortcut ?? null;

// Visible controls that run a registered command (X-08: one registry → control tooltip
// and key; Roll20 R20-197 shows the key in the tooltip). `[data-command]` lets any area
// mark its own control.
const CONTROLS = [
  ["command-palette.open", '.service-nav [data-service="search"]'],
  ["home.help", '.service-nav [data-service="home-help"]'],
  ["notifications.open", '.service-nav [data-service="requests"]'],
  ["command-palette.rests", '[data-table="rests"]'],
  ["command-palette.end-turn", '[data-table="end-turn"]'],
  ["command-palette.log", '[data-table="log"]'],
  ["command-palette.encounter", '[data-table="combat"]'],
  ["annotations.measure", '[data-tool="measure"]'],
  ["annotations.pointer", '[data-tool="pointer"]'],
  ["annotations.template", '[data-tool="annotations-template"]'],
  ["annotations.draw", '[data-tool="annotations-draw"]'],
  ["token-menu.select-tool", '[data-tool="token-menu-select"]'],
];
/**
 * Writes each command's current key into its visible control: `title` gains "(key)" and
 * `aria-keyshortcuts` names it; a command without a key gets its plain title back.
 * Idempotent, so it can follow every render.
 */
export function decorateControls(root, ctx, { mac = isMac() } = {}) {
  if (!root?.querySelectorAll || !ctx) return;
  const keys = new Map(rowsFor(ctx).map((row) => [row.id, row.shortcut]));
  const pairs = [...CONTROLS];
  for (const el of root.querySelectorAll("[data-command]"))
    pairs.push([el.dataset?.command ?? el.getAttribute("data-command"), el]);
  for (const [id, target] of pairs) {
    if (!keys.has(id)) continue;
    const shortcut = keys.get(id);
    const list = typeof target === "string" ? root.querySelectorAll(target) : [target];
    for (const el of list) {
      // A title lent to the styled tooltip (ui.mjs, SV-22) is written back where it waits.
      const attr = el.hasAttribute("data-tip-title") ? "data-tip-title" : "title";
      if (el.dataset.cmdkBase === undefined) el.dataset.cmdkBase = el.getAttribute(attr) ?? "";
      const plain = el.dataset.cmdkBase;
      const base =
        plain ||
        String(el.textContent ?? "")
          .replace(/\s+/g, " ")
          .trim();
      if (shortcut) {
        const text = keyText(ctx, shortcut, mac);
        el.setAttribute(attr, base ? `${base} (${text})` : text);
        el.setAttribute("aria-keyshortcuts", S.ariaKeyshortcuts(shortcut, { mac }));
      } else {
        if (plain) el.setAttribute(attr, plain);
        else el.removeAttribute(attr);
        el.removeAttribute("aria-keyshortcuts");
      }
    }
  }
}
// Re-decorates after each render (the shell replaces #app's markup), once per frame.
function installDecorations() {
  const doc = globalThis.document;
  if (!doc?.body || !globalThis.MutationObserver) return;
  let queued = false;
  const run = () => {
    queued = false;
    try {
      decorateControls(doc, api?.ctx);
    } catch (error) {
      globalThis.console?.warn?.(`[extension ${ID}] key hints: ${error?.message ?? error}`);
    }
  };
  new MutationObserver((mutations) => {
    // The tooltip bubble changing its text is not a new render.
    if (mutations.every((m) => m.target?.closest?.(".ui-tip, .ui-action-toast"))) return;
    if (queued) return;
    queued = true;
    (globalThis.requestAnimationFrame ?? setTimeout)(run);
  }).observe(doc.body, { childList: true, subtree: true });
  run();
}

function runRow(row, ctx) {
  const command = row.command ?? row;
  try {
    const done = command.run(ctx);
    return done !== false;
  } catch (error) {
    ctx.toast?.(error?.it ? textOf(error, ctx.lang) : String(error?.message ?? error), true);
    return false;
  }
}
// Search synonyms of a command (registry `keywords`, SV-02), in both languages.
const keywordsOf = (command) =>
  (command.keywords ?? []).flatMap((word) =>
    typeof word === "string" ? [word] : [word.it, word.en].filter(Boolean),
  );
// Where a command acts, in the words of the interface ("Tavolo", "Campagna"), never an
// area's internal build title (SV-02: «Editor homebrew profondo» was a subtitle).
const PLACES = {
  palette: GROUPS.palette,
  navigation: GROUPS.navigation,
  table: GROUPS.table,
  "token-menu": L("Tavolo · pedine", "Table · tokens"),
  services: L("Servizi", "Services"),
  library: GROUPS.library,
  campaign: GROUPS.campaign,
  chat: L("Tavolo · chat", "Table · chat"),
  handouts: GROUPS.handouts,
  preparation: GROUPS.preparation,
  safety: GROUPS.safety,
  account: GROUPS.account,
  preferences: L("Preferenze", "Preferences"),
  help: L("Aiuto", "Help"),
  combat: L("Tavolo · combattimento", "Table · combat"),
  dice: L("Tiri e dadi", "Rolls and dice"),
  "damage-tray": L("Punti ferita e danni", "Hit points and damage"),
  "fog-vision": L("Tavolo · nebbia e visione", "Table · fog and vision"),
  annotations: L("Tavolo · disegni e misure", "Table · drawings and measures"),
  knowledge: L("Tavolo · creature", "Table · creatures"),
  regions: L("Preparazione · regioni", "Preparation · regions"),
  "scene-assets": L("Scene e mappe", "Scenes and maps"),
  sessions: L("Campagna · sessioni", "Campaign · sessions"),
  offline: L("Offline", "Offline"),
  quickbar: L("Tavolo · barra rapida", "Table · quick bar"),
  community: L("Tavoli pubblici", "Public tables"),
  assistant: L("Assistente", "Assistant"),
  // Areas that register without a group, by where their commands lead.
  quests: L("Campagna · missioni e archivio", "Campaign · quests and archive"),
  "world-map": L("Campagna · mondo", "Campaign · world"),
  "relations-graph": L("Campagna · relazioni", "Campaign · relations"),
  "homebrew-editor": GROUPS.library,
  "sheet-plus": L("Scheda del personaggio", "Character sheet"),
  "builder-plus": L("Personaggi", "Characters"),
  "special-moves": GROUPS.table,
  "inventory-plus": L("Inventario e monete", "Inventory and coins"),
  loot: L("Tesori e bottino", "Treasure and loot"),
  party: L("Campagna · gruppo", "Campaign · party"),
  projects: L("Scheda · tempo libero", "Sheet · downtime"),
  "session-view": GROUPS.table,
  integrations: L("Campagna · integrazioni", "Campaign · integrations"),
  generators: GROUPS.preparation,
  "random-tables": GROUPS.preparation,
  "campaign-data": GROUPS.campaign,
  "campaign-settings": GROUPS.campaign,
  "campaign-members": GROUPS.campaign,
  notifications: L("Notifiche", "Notifications"),
};
function placeName(ctx, command) {
  const place = PLACES[command.group] ?? PLACES[command.extension];
  return place ?? (GROUPS[command.group] || L("Comando", "Command"));
}
// ------------------------------------------------------------------ every visible label

// Close review 01/10 (SV-02/SV-03; Alchemy OmniSearch and Kanka index every command, tab and
// panel label, Foundry and Obsidian every tool): what the interface shows by name is found by
// that name, without a hand-written synonym list. Table panels and map tools, the core scene
// commands, sheet sections, token-menu commands and open shops come from the registry; the
// controls on screen come from the page itself.
const later = (fn, tries = 0) =>
  setTimeout(() => {
    if (fn() === false && tries < 12) later(fn, tries + 1);
  }, 60);
function pressOnPage(ctx, page, selector, params = {}) {
  if (ctx.view?.page !== page) ctx.navigate(page, params);
  later(() => {
    const el = globalThis.document?.querySelector?.(`#content ${selector}`);
    if (!el) return false;
    el.click();
    return true;
  });
  return true;
}
/** Opens a Table panel without closing it when it is already the open one. */
function openTablePanel(ctx, id) {
  if (ctx.view?.page !== "table") ctx.navigate("table");
  later(() => {
    const doc = globalThis.document;
    const open = doc?.querySelector?.(`#content #table-sidebar-panel[data-table-panel="${id}"]`);
    if (open && !open.hidden) return true;
    const handle = doc?.querySelector?.(`#content [data-table-drawer="${id}"]`);
    if (!handle) return false;
    handle.click();
    return true;
  });
  return true;
}
/** Right-clicks a token (its menu) and opens a submenu, as a person would. */
function openTokenMenu(ctx, actorId, submenu) {
  if (ctx.view?.page !== "table") ctx.navigate("table");
  later(() => {
    const doc = globalThis.document;
    const token = doc?.querySelector?.(`#content #battle-map .map-token[data-actor="${actorId}"]`);
    if (!token) return false;
    const box = token.getBoundingClientRect();
    token.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        clientX: box.x + box.width / 2,
        clientY: box.y + box.height / 2,
        button: 2,
      }),
    );
    if (submenu)
      later(() => {
        const category = doc.querySelector(`[data-token-menu-category="${submenu}"]`);
        if (!category) return false;
        category.click();
        return true;
      });
    return true;
  });
  return true;
}
const SAFE_KEY = /^[A-Za-z0-9_.:-]{1,80}$/;
export function labelIndex(ctx) {
  const r = reg(ctx);
  const list = (point, ...args) => {
    try {
      return r?.list(point, ctx, ...args) ?? [];
    } catch {
      return [];
    }
  };
  const items = [];
  const add = (key, title, where, run, words = []) =>
    items.push({
      key: "label:" + key,
      type: "command",
      title,
      names: [title.it, title.en],
      keywords: words.flatMap((w) => (typeof w === "string" ? [w] : [w.it, w.en])),
      excerpt: where,
      row: { id: "label:" + key, command: { label: title, run } },
    });
  const labelOf = (c) =>
    typeof c.label === "string" ? L(c.label, c.label) : L(c.label?.it ?? "", c.label?.en ?? "");
  const runner = runsSession(ctx.state, ctx.role);
  if (campaignReadable(ctx)) {
    const table = L("Tavolo", "Table");
    for (const panel of list("table-panel").filter(
      (c) => ["sidebar-tab", "drawer"].includes(c.placement) && SAFE_KEY.test(c.id),
    ))
      add("panel:" + panel.id, labelOf(panel), L("Tavolo · pannello", "Table · panel"), (c) =>
        openTablePanel(c, panel.id),
      );
    for (const tool of list("table-tool").filter((c) => SAFE_KEY.test(c.id) && c.label))
      add(
        "tool:" + tool.id,
        labelOf(tool),
        L("Tavolo · strumento della mappa", "Table · map tool"),
        (c) => pressOnPage(c, "table", `[data-tool="${tool.id}"]`),
      );
    // The core scene commands at the top of the Table (B61).
    add(
      "rests",
      L("Riposi: riposo breve o lungo", "Rests: short or long rest"),
      table,
      (c) => (c.openRest ? (c.openRest(), true) : pressOnPage(c, "table", '[data-table="rests"]')),
      ["riposo breve", "riposo lungo", "dadi vita", "short rest", "long rest", "hit dice"],
    );
    if (runner) {
      add(
        "time",
        L(
          "Tempo di gioco: tempo narrativo, riposi e tempo",
          "Game time: narrative time, rests and time",
        ),
        table,
        (c) =>
          c.openGameTime
            ? (c.openGameTime(), true)
            : pressOnPage(c, "table", '[data-table="time"]'),
        [
          "tempo narrativo",
          "riposi e tempo",
          "avanza tempo",
          "avanza il tempo",
          "passa il tempo",
          "orologio di gioco",
          "advance time",
          "pass time",
        ],
      );
      add(
        "combat",
        ctx.state.combat?.active
          ? L("Concludi incontro: fine del combattimento", "End encounter: end of combat")
          : L("Avvia combattimento", "Start combat"),
        table,
        (c) => pressOnPage(c, "table", '[data-table="combat"]'),
        ctx.state.combat?.active
          ? ["fine combattimento", "termina combattimento", "concludi incontro", "end combat"]
          : ["inizia combattimento", "tira iniziativa", "start combat", "roll initiative"],
      );
    }
    // Open shops (findability P2; Foundry and Obsidian list what is open as a result): the
    // player finds «Bottega: <name>» by «compra», «bottega» or «mercante»; the DM also finds
    // the closed ones, which open in Preparation.
    const merchants = ctx.state.ext?.loot?.merchants ?? [];
    for (const merchant of merchants) {
      if (!merchant?.id || !SAFE_KEY.test(merchant.id)) continue;
      const here = !merchant.sceneId || merchant.sceneId === ctx.state.activeSceneId;
      const open = merchant.open === true && here;
      if (!open && !runner) continue;
      const words = [
        "compra",
        "comprare",
        "vendi",
        "mercante",
        "negozio",
        "bottega",
        "buy",
        "shop",
        "merchant",
      ];
      add(
        "shop:" + merchant.id,
        L(`Bottega: ${merchant.name}`, `Shop: ${merchant.name}`),
        open
          ? L("Tavolo · Oggetti · bottega aperta", "Table · Items · open shop")
          : L("Preparazione · Mercanti · bottega chiusa", "Preparation · Merchants · closed shop"),
        (c) =>
          open
            ? openTablePanel(c, "loot-shop")
            : (c.navigate("preparation", { tab: "loot-merchants" }), true),
        words,
      );
    }
    // Token-menu commands (B12, Foundry Token HUD): found by name, opened on a token.
    const scene = ctx.state.scenes?.find((entry) => entry.id === ctx.state.activeSceneId);
    const ownToken = scene?.tokens?.find((t) => {
      const actor = ctx.state.actors?.[t.actorId];
      return actor?.kind === "character" && ctx.canControl?.(actor);
    });
    const npcToken = runner
      ? scene?.tokens?.find((t) => ctx.state.actors?.[t.actorId]?.kind === "npc")
      : null;
    const seen = new Set();
    for (const token of [ownToken, npcToken].filter(Boolean)) {
      const target = { actorId: token.actorId, tokenId: token.id, sceneId: scene.id };
      for (const entry of list("token-menu", target)) {
        if (seen.has(entry.id) || !entry.label || !SAFE_KEY.test(entry.id)) continue;
        seen.add(entry.id);
        const sub = TOKEN_SUBMENUS[entry.submenu];
        const name = ctx.state.actors[token.actorId]?.name ?? "";
        add(
          "token:" + entry.id,
          labelOf(entry),
          L(
            `Menu della pedina (${name})${sub ? " › " + sub.it : ""}`,
            `Token menu (${name})${sub ? " › " + sub.en : ""}`,
          ),
          (c) => openTokenMenu(c, token.actorId, entry.submenu ?? null),
        );
      }
    }
  }
  // Sheet sections of the viewer's own character (D&D Beyond's categories, B62).
  const own = Object.values(ctx.state.actors ?? {}).find(
    (a) => a?.kind === "character" && !a.companion && a.owner === ctx.role,
  );
  if (own)
    for (const tab of list("sheet-tab", own).filter((c) => SAFE_KEY.test(c.id) && c.label))
      add(
        "sheet:" + tab.id,
        L(`${labelOf(tab).it} · ${own.name}`, `${labelOf(tab).en} · ${own.name}`),
        L("Scheda del personaggio", "Character sheet"),
        (c) => (c.navigate("characters", { id: own.id, tab: tab.id }), true),
      );
  return items;
}
const TOKEN_SUBMENUS = {
  actions: L("Azioni", "Actions"),
  look: L("Aspetto", "Appearance"),
  visibility: L("Visibilità", "Visibility"),
  items: L("Oggetti", "Items"),
  dm: L("Strumenti DM", "DM tools"),
};
/**
 * The named controls on screen now (Obsidian and Alchemy find the command in front of you):
 * choosing one brings it into view and focuses it, and a tab or a fold opens at once; any
 * other control waits for Enter, so a search never presses a button by itself.
 */
export function pageControls(ctx, doc = globalThis.document) {
  const root = doc?.querySelector?.("#content");
  if (!root) return [];
  const items = [];
  const seen = new Set();
  for (const old of root.querySelectorAll("[data-cmdk-control]"))
    old.removeAttribute("data-cmdk-control");
  const nodes = root.querySelectorAll(
    'button, [role="tab"], [role="menuitem"], summary, a[href^="#"], [data-tool]',
  );
  let index = 0;
  for (const el of nodes) {
    if (items.length >= 120) break;
    if (el.closest?.("[hidden], dialog, .table-panel-index")) continue;
    if (el.disabled || el.getAttribute?.("aria-disabled") === "true") continue;
    const box = el.getBoundingClientRect?.();
    if (!box || (!box.width && !box.height)) continue;
    const label = String(
      el.getAttribute("aria-label") || el.textContent || el.getAttribute("title") || "",
    )
      .replace(/\s+/g, " ")
      .trim();
    if (label.length < 3 || label.length > 70 || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    const mark = `cmdk-${index++}`;
    el.setAttribute("data-cmdk-control", mark);
    const opens =
      el.matches('[role="tab"], summary, [aria-haspopup], [data-tool], a[href^="#"]') ||
      el.hasAttribute("data-table-drawer");
    items.push({
      key: "control:" + label,
      type: "control",
      title: L(label, label),
      names: [label],
      excerpt: opens
        ? L("Su questa pagina · si apre", "On this page · opens")
        : L("Su questa pagina · premi Invio per usarlo", "On this page · press Enter to use it"),
      row: {
        id: "control:" + mark,
        command: {
          label: L(label, label),
          run: () => {
            later(() => {
              const target = doc.querySelector(`[data-cmdk-control="${mark}"]`);
              if (!target) return false;
              target.scrollIntoView?.({ block: "center" });
              target.focus?.({ preventScroll: true });
              target.classList.add("cmdk-found");
              setTimeout(() => target.classList.remove("cmdk-found"), 2400);
              if (opens) target.click();
              return true;
            });
            return true;
          },
        },
      },
    });
  }
  return items;
}
function commandItems(ctx, { withPages = false } = {}) {
  return rowsFor(ctx)
    .filter((row) => withPages || !row.command.page)
    .map((row) => ({
      key: "command:" + row.id,
      type: "command",
      title: row.command.label,
      names: [row.command.label.it, row.command.label.en],
      keywords: [...keywordsOf(row.command), ...aliasesOf(row.id)],
      words: row.command.description
        ? [row.command.description.it, row.command.description.en]
        : [],
      excerpt: row.command.description ?? placeName(ctx, row.command),
      scope: row.context === "global" ? null : contextLabel(ctx, row.context),
      shortcut: row.shortcut,
      contextual: row.context !== "global" && row.context === ctx.view?.page,
      row,
    }));
}

// ------------------------------------------------------------------ device memory (per identity)

function storage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
/** Recent destinations, last query and way back for one identity on this device. */
export function loadMemory(role) {
  let all = memoryFallback.get(MEMORY_KEY) ?? {};
  try {
    const raw = storage()?.getItem(MEMORY_KEY);
    if (raw) all = JSON.parse(raw) ?? {};
  } catch {}
  const mine = all[role] ?? {};
  return {
    recent: Array.isArray(mine.recent) ? mine.recent.slice(0, MAX_RECENT) : [],
    text: typeof mine.text === "string" ? mine.text : "",
    filter: typeof mine.filter === "string" ? mine.filter : null,
    filterPage: typeof mine.filterPage === "string" ? mine.filterPage : null,
    origin: mine.origin && typeof mine.origin.page === "string" ? mine.origin : null,
  };
}
export function saveMemory(role, memory) {
  let all = memoryFallback.get(MEMORY_KEY) ?? {};
  try {
    const raw = storage()?.getItem(MEMORY_KEY);
    if (raw) all = JSON.parse(raw) ?? {};
  } catch {}
  all = { ...all, [role]: memory };
  memoryFallback.set(MEMORY_KEY, all);
  try {
    storage()?.setItem(MEMORY_KEY, JSON.stringify(all));
  } catch {}
}
export function clearMemory() {
  memoryFallback.delete(MEMORY_KEY);
  try {
    storage()?.removeItem(MEMORY_KEY);
  } catch {}
}
function remember(ctx, item) {
  const memory = loadMemory(ctx.role);
  const entry = {
    key: item.key,
    type: item.type,
    title: textOf(item.title, ctx.lang),
    probe: item.probe ?? null,
    provider: item.provider ?? null,
  };
  memory.recent = [entry, ...memory.recent.filter((r) => r.key !== item.key)].slice(0, MAX_RECENT);
  saveMemory(ctx.role, memory);
}
/**
 * Recent destinations re-checked against what this identity can read now: a revoked or
 * deleted one is shown as unavailable, never with its old title (I-184, revocations).
 */
export function resolveRecent(ctx, items = coreItems(ctx)) {
  const byKey = new Map(items.map((item) => [item.key, item]));
  return loadMemory(ctx.role).recent.map((entry) => {
    let item = byKey.get(entry.key);
    if (!item && entry.provider && entry.probe)
      item = providerItems(ctx, entry.probe).find((candidate) => candidate.key === entry.key);
    return item
      ? { ...item, group: "recent" }
      : {
          key: entry.key,
          type: "gone",
          title: L("Voce non più disponibile", "Entry no longer available"),
          names: [],
          excerpt: L("Scegli per toglierla dai recenti", "Choose to remove it from recents"),
          group: "recent",
          gone: true,
        };
  });
}

// ------------------------------------------------------------------ the palette search

const FILTER_FOR_CONTEXT = [
  [(v) => v.page === "characters" && v.id && v.tab === "spells", "spells"],
  [(v) => v.page === "characters" && v.id && v.tab === "inventory", "items"],
  [(v) => v.page === "campaign" && v.tab === "world", "world"],
  [(v) => v.page === "campaign" && v.tab === "journal", "journal"],
  [(v) => v.page === "notes" && !v.id, "notes"],
];
/** The filter the palette starts with in this view (Quick Insert opened from a sheet). */
export const contextFilter = (view = {}) =>
  FILTER_FOR_CONTEXT.find(([test]) => test(view))?.[1] ?? null;

const byRank = (lang) => (a, b) =>
  b.score - a.score ||
  Number(Boolean(b.contextual)) - Number(Boolean(a.contextual)) ||
  typeRank(a.type) - typeRank(b.type) ||
  // Equally good matches: the shorter title is the closer one ("Vai a: Tavolo" first).
  textOf(a.title, lang).length - textOf(b.title, lang).length ||
  textOf(a.title, lang).localeCompare(textOf(b.title, lang));
// A category listed without a query keeps the source order (the sheet's own spells first).
const byListing = (a, b) =>
  Number(Boolean(b.contextual)) - Number(Boolean(a.contextual)) ||
  typeRank(a.type) - typeRank(b.type);
// `>` with nothing typed: this page's commands, then the others by label in the interface
// language, then page navigation.
const byCommandList = (lang) => (a, b) =>
  Number(Boolean(b.contextual)) - Number(Boolean(a.contextual)) ||
  Number(Boolean(a.row.command.page)) - Number(Boolean(b.row.command.page)) ||
  textOf(a.title, lang).localeCompare(textOf(b.title, lang));

/**
 * Results for the text typed in the palette. Returns {mode, filter, items, query,
 * consumed?}: `consumed` means a leading `@filter ` was recognised and applied.
 */
export function searchPalette(ctx, text, { filter = null } = {}) {
  const filters = availableFilters(ctx);
  const parsed = parseQuery(text, filters);
  const active = parsed.filter ?? filters.find((f) => f.id === filter) ?? null;
  const base = {
    mode: parsed.mode,
    query: parsed.query,
    filter: active,
    consumed: parsed.consumed ?? 0,
  };
  if (parsed.mode === "filters") {
    const q = normalizeText(parsed.query);
    return {
      ...base,
      filter: null,
      items: filters
        .filter((f) => !q || matchFilter(q, [f]))
        .map((f) => ({
          key: "filter:" + f.id,
          type: "filter",
          title: f.label,
          names: [f.label.it, f.label.en],
          excerpt: L(
            "@" + normalizeText(f.label.it).split(" ")[0],
            "@" + normalizeText(f.label.en).split(" ")[0],
          ),
          filter: f.id,
        })),
    };
  }
  if (parsed.mode === "help") return { ...base, items: helpItems(ctx) };
  if (parsed.mode === "commands") {
    const items = commandItems(ctx, { withPages: true })
      .map((item) => ({ ...item, score: matchScore(item, parsed.query) }))
      .filter((item) => item.score > 0)
      .sort(normalizeText(parsed.query) ? byRank(ctx.lang) : byCommandList(ctx.lang))
      .slice(0, MAX_COMMANDS);
    return { ...base, filter: null, items };
  }
  const failed = new Set();
  const core = [...coreItems(ctx, failed), ...commandItems(ctx)];
  const every = [
    ...core,
    ...(parsed.query ? [...labelIndex(ctx), ...pageControls(ctx)] : []),
    ...providerItems(ctx, parsed.query, { failed }),
  ];
  const pool = active ? every.filter((item) => inFilter(active, item)) : every;
  if (!parsed.query) {
    if (active)
      return {
        ...base,
        items: pool
          .map((item) => ({ ...item, score: 1 }))
          .sort(byListing)
          .slice(0, MAX_RESULTS),
        failed: [...failed],
      };
    return { ...base, items: suggestions(ctx, core), failed: [...failed] };
  }
  const items = rank(ctx, pool, parsed.query);
  // A category that hides every match offers the whole search in one step (Quick Insert's
  // removable chip; the filter never silently swallows results, SV-03).
  if (active && !items.length) {
    const elsewhere = rank(ctx, every, parsed.query).length;
    if (elsewhere)
      items.push({
        key: "unfilter",
        type: "filter",
        title: L(
          `Cerca «${parsed.query}» in tutte le categorie`,
          `Search “${parsed.query}” in every category`,
        ),
        names: [],
        excerpt: L(
          `${elsewhere} risultati fuori da «${active.label.it}»`,
          `${elsewhere} results outside “${active.label.en}”`,
        ),
        unfilter: true,
      });
  }
  return { ...base, items: grouped(ctx, items), failed: [...failed] };
}
// The context only reorders real matches: text that matches nothing finds nothing, so
// Enter after a typo never runs the first command of the page.
function rank(ctx, pool, query) {
  return pool
    .map((item) => {
      const { score: raw, typo } = matchDetail(item, query);
      return {
        ...item,
        exact: raw >= 1000,
        typo,
        score: raw > 1 ? raw + (item.contextual ? 50 : 0) : 0,
      };
    })
    .filter((item) => item.score > 1)
    .sort(byRank(ctx.lang))
    .slice(0, MAX_RESULTS);
}
// Results grouped by type, the group with the best match first and an exact title always
// on top (D&D Beyond and Alchemy grouped results, SV-03).
const RESULT_GROUPS = [
  ["commands", L("Comandi", "Commands"), ["command"]],
  ["here", L("Su questa pagina", "On this page"), ["control"]],
  ["characters", L("Personaggi e PNG", "Characters and NPCs"), ["character", "companion", "npc"]],
  [
    "campaign",
    L("Campagna: diario, mondo e note", "Campaign: journal, world and notes"),
    ["note", "person", "place", "faction", "world", "quest", "recap"],
  ],
  ["spells", L("Incantesimi", "Spells"), ["spell"]],
  ["items", L("Oggetti", "Items"), ["item"]],
  ["creatures", L("Creature", "Creatures"), ["creature"]],
  [
    "rules",
    L("Regole, condizioni e classi", "Rules, conditions and classes"),
    ["rule", "condition", "class"],
  ],
  ["scenes", L("Scene", "Scenes"), ["scene"]],
  ["pages", L("Pagine", "Pages"), ["page"]],
];
// Typo matches beside real ones form the last group (Google «Did you mean», Algolia's typo
// ranking), so «invita» shows «Invita giocatori» and not «Invia Stop anonimo» next to it.
const TYPO_GROUP = ["typo", L("Forse cercavi", "Did you mean")];
function groupOf(item, typos = false) {
  if (item.unfilter) return ["more", L("Altre categorie", "Other categories")];
  if (item.exact) return ["exact", L("Corrispondenza esatta", "Exact match")];
  if (typos && item.typo) return TYPO_GROUP;
  if (item.provider) return ["p:" + item.provider, item.badge ?? TYPES.provider[0]];
  const row = RESULT_GROUPS.find(([, , types]) => types.includes(item.type));
  return row ? [row[0], row[1]] : ["other", L("Altro", "Other")];
}
function grouped(ctx, items) {
  const groups = new Map();
  const typos = items.some((item) => !item.typo && !item.unfilter);
  for (const item of items) {
    const [key, title] = groupOf(item, typos);
    if (!groups.has(key)) groups.set(key, { key, title, best: item.score, items: [] });
    groups.get(key).items.push({ ...item, group: key, groupTitle: title });
  }
  const order = (key) => (key === "exact" ? 0 : key === "typo" ? 2 : key === "more" ? 3 : 1);
  return [...groups.values()]
    .sort((a, b) => order(a.key) - order(b.key) || b.best - a.best)
    .flatMap((group) => group.items);
}
function suggestions(ctx, core) {
  const memory = loadMemory(ctx.role);
  const out = [];
  const origin = memory.origin;
  if (
    origin &&
    !(origin.page === ctx.view?.page && (origin.params?.id ?? "") === (ctx.view?.id ?? ""))
  )
    out.push({
      key: "origin",
      type: "page",
      title: L(
        `Torna a: ${origin.label?.it ?? origin.page}`,
        `Back to: ${origin.label?.en ?? origin.page}`,
      ),
      names: [],
      excerpt: L(
        "Dove eri prima di aprire l’ultimo risultato",
        "Where you were before opening the last result",
      ),
      target: { page: origin.page, params: origin.params ?? {} },
      group: "back",
      origin: true,
    });
  out.push(...resolveRecent(ctx, core));
  const here = commandItems(ctx).filter(
    (item) =>
      item.contextual || ["command-palette.create", "command-palette.guide"].includes(item.row.id),
  );
  out.push(...here.map((item) => ({ ...item, group: "context" })));
  return out;
}
function helpItems(ctx) {
  const row = (id, title, excerpt, extra) => ({
    key: "help:" + id,
    type: "help",
    title,
    names: [],
    excerpt,
    ...extra,
  });
  return [
    row(
      "commands",
      L("> Comandi", "> Commands"),
      L(
        "Scrivi > per elencare solo i comandi che puoi usare qui",
        "Type > to list only the commands you can use here",
      ),
      { insert: ">" },
    ),
    row(
      "filters",
      L("@ Filtri", "@ Filters"),
      L(
        "Scrivi @ e una categoria, per esempio @incantesimi",
        "Type @ and a category, for example @spells",
      ),
      { insert: "@" },
    ),
    row(
      "guide",
      L("Guida alle scorciatoie", "Keyboard shortcut guide"),
      L(
        "Tutti i tasti, generati dai comandi registrati",
        "Every key, generated from the registered commands",
      ),
      { action: "guide" },
    ),
    row(
      "controls",
      L("Configura le scorciatoie", "Configure shortcuts"),
      L("Cambia, togli o ripristina i tasti", "Change, remove or restore keys"),
      { action: "controls" },
    ),
    row(
      "create",
      L("Creazione rapida", "Quick create"),
      L(
        "Nota, voce del mondo, missione, oggetto, mostro, incantesimo, sessione, personaggio…",
        "Note, world entry, quest, item, monster, spell, session, character…",
      ),
      { action: "create" },
    ),
  ];
}

// ------------------------------------------------------------------ quick create (Kanka N)

// Every entry type in one quick creator (Kanka's quick creator with «Crea e apri»; Monk's
// Enhanced Journal typed pages; SV-04, CA-19). Journal and World entries are created at
// once, private ("Solo io"); Library content, materials, sessions and characters need their
// own editor, so «Crea» opens it with the title already written.
const Q = (id, it, en, extra = {}) => Object.freeze({ id, label: L(it, en), ...extra });
export const QUICK_KINDS = Object.freeze([
  Q("note", "Nota personale", "Personal note", { group: "journal", entryKind: "note" }),
  Q("person", "Persona", "Person", {
    group: "world",
    entryKind: "world",
    worldType: "person",
    campaign: true,
  }),
  Q("place", "Luogo", "Place", {
    group: "world",
    entryKind: "world",
    worldType: "place",
    campaign: true,
  }),
  Q("faction", "Fazione", "Faction", {
    group: "world",
    entryKind: "world",
    worldType: "faction",
    campaign: true,
  }),
  Q("shop", "Negozio", "Shop", {
    group: "world",
    entryKind: "world",
    worldType: "shop",
    campaign: true,
  }),
  Q("event", "Evento", "Event", {
    group: "world",
    entryKind: "world",
    worldType: "event",
    campaign: true,
  }),
  Q("list", "Elenco", "Checklist", {
    group: "world",
    entryKind: "world",
    worldType: "list",
    campaign: true,
  }),
  Q("quest", "Missione", "Quest", { group: "journal", entryKind: "quest", campaign: true }),
  Q("recap", "Resoconto", "Recap", { group: "journal", entryKind: "recap", campaign: true }),
  Q("item", "Oggetto", "Item", { group: "library", open: "homebrew", hbType: "item" }),
  Q("monster", "Mostro", "Monster", { group: "library", open: "homebrew", hbType: "creature" }),
  Q("spell", "Incantesimo", "Spell", { group: "library", open: "homebrew", hbType: "spell" }),
  Q("handout", "Materiale (handout)", "Material (handout)", {
    group: "table",
    open: "handout",
    campaign: true,
    dm: true,
  }),
  Q("session", "Sessione", "Session", {
    group: "table",
    open: "session",
    campaign: true,
    organizer: true,
  }),
  Q("character", "Personaggio", "Character", { group: "table", open: "character" }),
]);
const QUICK_GROUPS = [
  ["journal", L("Diario e appunti", "Journal and notes")],
  ["world", L("Mondo", "World")],
  ["library", L("Biblioteca (homebrew)", "Library (homebrew)")],
  ["table", L("Tavolo e gruppo", "Table and party")],
];
const isMember = (state, role) =>
  Boolean(state.campaign?.id) && content.isCampaignMember(state, state.campaign.id, role);
const isOrganizer = (state, role) =>
  isMember(state, role) && content.canOrganizeSessions(state, state.campaign.id, role);
const isDmRole = (state, role) =>
  isMember(state, role) &&
  content
    .campaignMembers(state)
    .some((member) => member.id === role && ["dm", "co-dm"].includes(member.role));
/** Kinds this identity may create now (a campaign, the DM or the organizer where needed). */
export function quickKindsFor(state, role) {
  const member = isMember(state, role);
  return QUICK_KINDS.filter(
    (k) =>
      (member || !k.campaign) &&
      (!k.dm || isDmRole(state, role)) &&
      (!k.organizer || isOrganizer(state, role)),
  );
}

/**
 * Creates one private ("Solo io") entry through the campaign-content domain in a single
 * mutation: draft, save, review and apply. Returns {draftId, entryId, revisionId}.
 */
export function createQuickEntry(
  state,
  { kind = "note", title = "", body = "", id },
  role,
  { online = true } = {},
) {
  const def = QUICK_KINDS.find((k) => k.id === kind);
  if (!def || !def.entryKind) throw localized("Tipo di voce non valido.", "Invalid entry type.");
  const name = String(title).trim();
  const text = String(body).trim();
  if (!name) throw localized("Scrivi un titolo.", "Write a title.");
  if (name.length > 200) throw localized("Il titolo è troppo lungo.", "The title is too long.");
  if (text.length > 4000) throw localized("Il testo è troppo lungo.", "The text is too long.");
  const member = isMember(state, role);
  if (def.campaign && !member)
    throw localized(
      "Serve una campagna per creare questa voce.",
      "A campaign is needed to create this entry.",
    );
  return content.createCampaignEntryNow(
    state,
    {
      id: "quick-" + String(id ?? Date.now().toString(36)),
      kind: def.entryKind,
      worldType: def.worldType,
      title: name,
      body: text,
      campaignId: member ? state.campaign.id : null,
    },
    role,
    { online },
  );
}

const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  Date.now().toString(36) + Math.random().toString(36).slice(2);

export function openQuickCreate(ctx, { title = "", kind, jot = false } = {}) {
  const t = ctx.t;
  const member = isMember(ctx.state, ctx.role);
  const kinds = quickKindsFor(ctx.state, ctx.role);
  const chosen = kinds.find((k) => k.id === kind) ?? kinds[0];
  const groups = QUICK_GROUPS.map(([id, label]) => [
    label,
    kinds.filter((k) => k.group === id),
  ]).filter(([, list]) => list.length);
  const radios = jot
    ? `<input type="hidden" name="kind" value="note">`
    : groups
        .map(
          ([label, list]) =>
            `<fieldset class="cmdk-kinds"><legend>${escape(textOf(label, ctx.lang))}</legend>${list
              .map(
                (k) =>
                  `<label class="cmdk-kind"><input type="radio" name="kind" value="${escape(k.id)}"${k === chosen ? " checked" : ""}><span>${escape(textOf(k.label, ctx.lang))}</span></label>`,
              )
              .join("")}</fieldset>`,
        )
        .join("");
  ctx.dialog(
    jot ? t("Appunto rapido", "Quick jot") : t("Creazione rapida", "Quick create"),
    `<div class="cmdk-create" data-cmdk-create-form>${radios}<label class="field">${jot ? t("Titolo (facoltativo)", "Title (optional)") : t("Titolo", "Title")}<input name="title" maxlength="200" ${jot ? "" : "required"} autofocus autocomplete="off" value="${escape(title)}"></label><label class="field">${jot ? t("Appunto", "Note") : t("Testo (facoltativo)", "Text (optional)")}<textarea name="body" rows="${jot ? 5 : 3}" maxlength="4000" ${jot ? "required" : ""}></textarea></label><p class="muted">${
      jot
        ? t(
            "Solo tu lo leggi. Resti al Tavolo: lo ritrovi in Appunti personali.",
            "Only you read it. You stay at the Table: find it in Personal notes.",
          )
        : t(
            "Diario e Mondo: la voce nasce visibile solo a te («Solo io») e resti in questa pagina. Biblioteca, materiali, sessioni e personaggi aprono il loro editor con il titolo già scritto.",
            "Journal and World: the entry starts visible to you only (“Only me”) and you stay on this page. Library content, materials, sessions and characters open their editor with the title already written.",
          )
    }${member ? "" : " " + t("Senza campagna puoi creare note personali, homebrew e personaggi.", "Without a campaign you can create personal notes, homebrew and characters.")}</p></div>`,
    {
      submitLabel: jot ? t("Salva appunto", "Save note") : t("Crea", "Create"),
      onSubmit: (data) => submitQuickCreate(ctx, data, { jot }),
    },
  );
}
// Opens the editor a kind needs, with the title written (Kanka «Crea e apri»).
async function openEditorFor(ctx, def, name) {
  if (def.open === "homebrew") {
    const [hb, D] = await Promise.all([
      import("./homebrew.mjs"),
      import("./homebrew-editor-domain.mjs"),
    ]);
    const id = "draft-quick-" + uid();
    ctx.commit(
      ctx.t("Creazione rapida: ", "Quick create: ") + textOf(def.label, ctx.lang),
      (draft) => {
        const built = D.buildFromTemplate(def.hbType, "scratch", ctx.lang);
        built.name = { it: name, en: name };
        hb.createHomebrewDraft(draft, { id, kind: "create", type: def.hbType }, ctx.role);
        hb.saveHomebrewDraft(draft, id, { data: built }, ctx.role);
      },
      PRIVATE,
    );
    return ctx.navigate("homebrew-editor", { id, tab: "identity" });
  }
  if (def.open === "session") {
    const sessions = await import("./campaign-sessions.mjs");
    const id = "quick-session-" + uid();
    ctx.commit(
      ctx.t("Bozza di sessione iniziata", "Session draft started"),
      (draft) => {
        const d = sessions.createSessionDraft(
          draft,
          { id, kind: "direct", returnTo: { page: "campaign", tab: "sessions" } },
          ctx.role,
        );
        sessions.saveSessionDraft(
          draft,
          id,
          { data: { ...d.data, title: name }, expectedDraftRevision: d.revision },
          ctx.role,
        );
      },
      PRIVATE,
    );
    return ctx.navigate("campaign", { tab: "edit", id });
  }
  if (def.open === "handout") {
    const command = reg(ctx)?.get("command", "handouts.new-handout", ctx);
    if (!command)
      throw localized("I materiali non sono disponibili qui.", "Materials are not available here.");
    reg(ctx).run(command, ctx);
    const field = globalThis.document?.querySelector?.('#dialog [name="title"]');
    if (field) field.value = name;
    return;
  }
  if (def.open === "character") {
    const builder = await import("./character-builder.mjs");
    builder.startCharacterBuilder(ctx, { kind: "create" });
    // The builder opens on its identity section: the name goes where it is typed.
    const input = globalThis.document?.querySelector?.(
      '#content [data-builder-path="identity.name"]',
    );
    if (input) {
      input.value = name;
      input.dispatchEvent(new globalThis.Event("input", { bubbles: true }));
      input.focus?.();
    } else
      ctx.toast(
        ctx.t(
          `Scrivi «${name}» come nome nella prima sezione.`,
          `Enter “${name}” as the name in the first section.`,
        ),
      );
  }
}
/** Submit handler of the quick creator: one private commit, then back to the same view. */
export function submitQuickCreate(ctx, data, { jot = false } = {}) {
  const body = String(data.get("body") ?? "");
  const input = {
    kind: String(data.get("kind") ?? "note"),
    title: String(data.get("title") ?? "") || (jot ? body.trim().split("\n")[0].slice(0, 60) : ""),
    body,
    id: uid(),
  };
  const def = QUICK_KINDS.find((k) => k.id === input.kind);
  if (!def) throw localized("Tipo di voce non valido.", "Invalid entry type.");
  if (def.open) {
    if (!input.title.trim()) throw localized("Scrivi un titolo.", "Write a title.");
    ctx.closeDialog?.();
    openEditorFor(ctx, def, input.title.trim()).catch((error) =>
      ctx.toast(error?.it ? textOf(error, ctx.lang) : String(error?.message ?? error), true),
    );
    return { opened: def.open };
  }
  let result;
  ctx.commit(
    ctx.t("Creazione rapida: ", "Quick create: ") + textOf(def?.label, ctx.lang),
    (draft) => {
      result = createQuickEntry(draft, input, ctx.role, { online: !ctx.offline });
    },
    PRIVATE,
  );
  const item = coreItems(ctx).find((entry) => entry.key === "entry:" + result.entryId);
  if (item) remember(ctx, item);
  const key = keyText(ctx, shortcutOf(ctx, "command-palette.open"));
  const phone = Boolean(globalThis.matchMedia?.("(pointer: coarse)")?.matches);
  const text = ctx.t(
    `«${input.title.trim()}» creata: solo tu la vedi. La ritrovi nella ricerca${key && !phone ? ` (${key})` : ""}.`,
    `“${input.title.trim()}” created: only you can see it. Find it in the search${key && !phone ? ` (${key})` : ""}.`,
  );
  const open = () =>
    ctx.navigate(def.entryKind === "note" ? "notes" : "campaign", {
      tab: "entry",
      id: result.entryId,
    });
  if (
    !actionToast(text, [{ label: ctx.t("Apri", "Open"), run: open }], {
      closeLabel: ctx.t("Chiudi l’avviso", "Close the notice"),
    })
  )
    ctx.toast(text);
  return result;
}

// ------------------------------------------------------------------ palette controller

/**
 * The open palette's state and actions, independent of the DOM so handlers can be tested:
 * setText, setFilter, move, choose.
 */
export function createPalette(ctx, { text, filter, insert = false } = {}) {
  const memory = loadMemory(ctx.role);
  // Opened from a context (the Spells tab) with no explicit start: a scoped search that
  // neither starts from nor overwrites the remembered one.
  // While inserting a link every kind of entry is a candidate: no context category.
  const fromContext =
    text === undefined && filter === undefined && !insert ? contextFilter(ctx.view) : null;
  const p = {
    text: text ?? (fromContext || insert ? "" : memory.text),
    // A category is never sticky (SV-03): it applies to this opening only, shown as a
    // removable chip; the page's own context (the Spells tab) may start one. The text comes
    // back anywhere, selected, so typing replaces it.
    filter: filter !== undefined ? filter : fromContext,
    active: 0,
    result: null,
    // Quick Insert (Foundry, SV-02): opened while writing, a chosen entry becomes a link in
    // the text instead of a navigation; `inserted` holds the text to put at the cursor.
    insert: Boolean(insert),
    inserted: null,
  };
  const refresh = () => {
    p.result = searchPalette(ctx, p.text, { filter: p.filter });
    if (p.result.consumed) {
      p.filter = p.result.filter.id;
      p.text = p.text.replace(/^\s+/, "").slice(p.result.consumed);
      p.result = searchPalette(ctx, p.text, { filter: p.filter });
    }
    const choosable = p.result.items.length;
    p.active = choosable ? Math.min(Math.max(0, p.active), choosable - 1) : -1;
    return p;
  };
  const persist = () => {
    if (fromContext) return;
    const current = loadMemory(ctx.role);
    saveMemory(ctx.role, { ...current, text: p.text, filter: null, filterPage: null });
  };
  const controller = {
    state: p,
    refresh,
    setText(value) {
      p.text = String(value ?? "");
      p.active = 0;
      refresh();
      persist();
      return p;
    },
    setFilter(id) {
      p.filter = id || null;
      p.active = 0;
      refresh();
      persist();
      return p;
    },
    move(delta) {
      const n = p.result.items.length;
      if (!n) return p;
      p.active = (p.active + delta + n) % n;
      return p;
    },
    /** Opens the chosen result. Returns "stay" when the palette stays open. */
    choose(index = p.active) {
      const item = p.result.items[index];
      if (!item) return "stay";
      if (item.unfilter) {
        p.filter = null;
        p.active = 0;
        refresh();
        return "stay";
      }
      if (item.type === "filter") {
        p.filter = item.filter;
        p.text = "";
        p.active = 0;
        refresh();
        persist();
        return "stay";
      }
      if (item.insert) {
        p.text = item.insert;
        p.active = 0;
        refresh();
        return "stay";
      }
      if (item.gone) {
        const memory = loadMemory(ctx.role);
        memory.recent = memory.recent.filter((r) => r.key !== item.key);
        saveMemory(ctx.role, memory);
        refresh();
        return "stay";
      }
      if (p.insert && linkable(item)) {
        remember(ctx, item);
        p.inserted = `[[${textOf(item.title, ctx.lang)
          .replace(/[[\]\n]/g, " ")
          .trim()}]]`;
        session = null;
        return "insert";
      }
      persist();
      session = null;
      if (item.action === "guide") return void openGuide(ctx);
      if (item.action === "controls") return void openControls(ctx);
      if (item.action === "create") return void openQuickCreate(ctx);
      if (item.row) {
        if (
          item.row.id !== "command-palette.guide" &&
          item.row.id !== "command-palette.controls" &&
          item.row.id !== "command-palette.create"
        )
          ctx.closeDialog?.();
        runRow(item.row, ctx);
        return "run";
      }
      if (!item.origin) {
        remember(ctx, item);
        const memory = loadMemory(ctx.role);
        memory.origin = originOf(ctx);
        saveMemory(ctx.role, memory);
      }
      ctx.navigate(item.target.page, item.target.params ?? {});
      return "open";
    },
  };
  refresh();
  return controller;
}
// Results a [[link]] can name: journal, world, archive pages, characters and the SRD
// (commands, pages and area results such as chat lines are not link targets).
const LINKABLE = new Set([
  "character",
  "companion",
  "npc",
  "note",
  "person",
  "place",
  "faction",
  "world",
  "quest",
  "recap",
  "spell",
  "item",
  "rule",
  "condition",
  "creature",
  "class",
]);
const linkable = (item) =>
  !item.row &&
  !item.gone &&
  (LINKABLE.has(item.type) || item.provider === "quests-search") &&
  Boolean(textOf(item.title, "it").trim());
function originOf(ctx) {
  const view = ctx.view ?? {};
  const params = Object.fromEntries(
    ["id", "tab", "revision"].filter((key) => view[key]).map((key) => [key, view[key]]),
  );
  const pages = pageEntries(ctx);
  const page =
    pages.find(
      (p) => p.target.page === view.page && (p.target.params?.tab ?? "") === (view.tab ?? ""),
    ) ?? pages.find((p) => p.target.page === view.page);
  const actor = view.page === "characters" && view.id ? ctx.state.actors?.[view.id] : null;
  const label = actor ? L(actor.name, actor.name) : (page?.label ?? L(view.page, view.page));
  return { page: view.page, params, label: { it: label.it, en: label.en } };
}
/** The controller of the palette open now (tests and the binder use it). */
export const paletteSession = () => session;

// ------------------------------------------------------------------ palette UI

const GROUP_TITLES = {
  back: L("Indietro", "Back"),
  recent: L("Recenti", "Recent"),
  context: L("In questa pagina", "On this page"),
};
function optionHTML(ctx, item, index, active, query) {
  const badge = item.badge ?? TYPES[item.type]?.[0] ?? TYPES.provider[0];
  const title = textOf(item.title, ctx.lang);
  const excerptText = textOf(item.excerpt, ctx.lang);
  const titleParts = snippet(title, normalizeText(query) ? query : "", 200);
  const excerpt =
    item.text &&
    query &&
    !fold(title).includes(fold(query).trim()) &&
    fold(item.text).includes(fold(query).trim())
      ? marked(snippet(item.text, query))
      : escape(excerptText.length > 120 ? excerptText.slice(0, 118) + "…" : excerptText);
  return `<li class="cmdk-option${item.gone ? " is-gone" : ""}" role="option" id="cmdk-opt-${index}" aria-selected="${index === active}" data-cmdk-option="${index}" data-type="${escape(item.type)}"><span class="cmdk-type">${escape(textOf(badge, ctx.lang))}</span><span class="cmdk-main"><span class="cmdk-title search-result">${query ? marked(titleParts) : escape(title)}</span>${excerpt ? `<small class="cmdk-excerpt">${excerpt}</small>` : ""}</span>${item.scope ? `<span class="cmdk-scope">${escape(textOf(item.scope, ctx.lang))}</span>` : ""}${item.shortcut ? `<span class="cmdk-keys">${kbd(ctx, item.shortcut)}</span>` : ""}</li>`;
}
export function listHTML(ctx, p) {
  const { items, mode, query } = p.result;
  const failed = p.result.failed ?? [];
  if (!items.length)
    return `<li class="cmdk-empty" role="presentation">${
      mode === "filters"
        ? ctx.t("Nessun filtro con questo nome.", "No filter with this name.")
        : failed.length
          ? escape(
              ctx.t(
                `Nessun risultato tra le fonti che hanno risposto; non hanno risposto: ${failed.join(", ")}. Riprova tra poco.`,
                `No results in the sources that answered; these did not answer: ${failed.join(", ")}. Try again shortly.`,
              ),
            )
          : p.filter && !query
            ? ctx.t("Scrivi per cercare in questa categoria.", "Type to search this category.")
            : ctx.t(
                "Nessun risultato. Prova un’altra parola o togli il filtro.",
                "No results. Try another word or remove the filter.",
              )
    }</li>`;
  let group = null;
  return items
    .map((item, i) => {
      const heading =
        item.group && item.group !== group
          ? `<li class="cmdk-group" role="presentation">${escape(textOf(item.groupTitle ?? GROUP_TITLES[item.group], ctx.lang))}</li>`
          : "";
      group = item.group ?? group;
      return (
        heading +
        optionHTML(ctx, item, i, p.active, mode === "commands" || mode === "search" ? query : "")
      );
    })
    .join("");
}
export function statusText(ctx, p) {
  const n = p.result.items.length;
  const filter = p.result.filter ?? availableFilters(ctx).find((f) => f.id === p.filter);
  const parts = [
    p.result.mode === "commands"
      ? ctx.t(`${n} comandi permessi`, `${n} permitted commands`)
      : p.result.mode === "filters"
        ? ctx.t(`${n} filtri`, `${n} filters`)
        : ctx.t(`${n} risultati`, `${n} results`),
  ];
  if (filter && p.result.mode === "search")
    parts.push(ctx.t("filtro: ", "filter: ") + textOf(filter.label, ctx.lang));
  if (p.result.failed?.length)
    parts.push(
      ctx.t("alcune fonti non hanno risposto: ", "some sources did not answer: ") +
        p.result.failed.join(", "),
    );
  if (ctx.offline)
    parts.push(
      ctx.t(
        "senza rete: solo ciò che è su questo dispositivo",
        "offline: only what is on this device",
      ),
    );
  return parts.join(" · ");
}
// The active category as a removable chip (Quick Insert filter chips, SV-03).
function chipHTML(ctx, id) {
  const filter = id ? availableFilters(ctx).find((f) => f.id === id) : null;
  if (!filter) return "";
  const name = textOf(filter.label, ctx.lang);
  return `<button type="button" class="cmdk-chip" data-cmdk-chip aria-label="${escape(ctx.t(`Togli il filtro ${name}`, `Remove the ${name} filter`))}">${escape(name)}<span aria-hidden="true">×</span></button>`;
}
function filterOptions(ctx, selected) {
  return [
    `<option value="">${ctx.t("Tutto", "Everything")}</option>`,
    ...availableFilters(ctx).map(
      (f) =>
        `<option value="${escape(f.id)}"${f.id === selected ? " selected" : ""}>${escape(textOf(f.label, ctx.lang))}</option>`,
    ),
  ].join("");
}
export function paletteHTML(ctx, p) {
  const t = ctx.t;
  return `<div class="cmdk" data-cmdk><div class="cmdk-bar"><label class="cmdk-field"><span class="cmdk-label">${t("Cerca", "Search")}</span><span class="cmdk-chip-slot" data-cmdk-chip-slot>${chipHTML(ctx, p.filter)}</span><input type="search" name="query" data-cmdk-input role="combobox" aria-expanded="true" aria-controls="search-results" aria-autocomplete="list" aria-describedby="cmdk-help" aria-activedescendant="${p.active >= 0 ? "cmdk-opt-" + p.active : ""}" autocomplete="off" spellcheck="false" autofocus placeholder="${t("Personaggi, note, regole, comandi…", "Characters, notes, rules, commands…")}" value="${escape(p.text)}"></label><label class="cmdk-filter"><span class="cmdk-label">${t("Categoria", "Category")}</span><select data-cmdk-filter>${filterOptions(ctx, p.filter)}</select></label></div>${p.insert ? `<p class="cmdk-insert" data-cmdk-insert-note>${t("Stai scrivendo: Invio inserisce un collegamento nel testo, al posto del cursore. I comandi funzionano come sempre.", "You are writing: Enter inserts a link into the text at the cursor. Commands work as usual.")}</p>` : ""}<p class="cmdk-help" id="cmdk-help">${t("↑ ↓ scegli · Invio apre · Esc chiude · <b>&gt;</b> comandi · <b>@</b> filtri · <b>?</b> guida", "↑ ↓ choose · Enter opens · Esc closes · <b>&gt;</b> commands · <b>@</b> filters · <b>?</b> guide")}</p><ul class="cmdk-list" id="search-results" role="listbox" aria-label="${t("Risultati", "Results")}" data-cmdk-list>${listHTML(ctx, p)}</ul><p class="cmdk-status" role="status" aria-live="polite" data-cmdk-status>${escape(statusText(ctx, p))}</p><div class="cmdk-foot"><button type="button" class="button quiet" data-cmdk-create${ariaKeys(shortcutOf(ctx, "command-palette.create"))}>${ctx.icon?.("plus") ?? ""}<span>${t("Creazione rapida", "Quick create")}</span>${kbd(ctx, shortcutOf(ctx, "command-palette.create"))}</button><button type="button" class="button quiet" data-cmdk-guide${ariaKeys(shortcutOf(ctx, "command-palette.guide"))}>${ctx.icon?.("help") ?? ""}<span>${t("Scorciatoie", "Shortcuts")}</span>${kbd(ctx, shortcutOf(ctx, "command-palette.guide"))}</button></div></div>`;
}
const shortcutOf = (ctx, id) => effectiveShortcut(ctx, id);
const ariaKeys = (shortcut) =>
  shortcut ? ` aria-keyshortcuts="${escape(S.ariaKeyshortcuts(shortcut, { mac: isMac() }))}"` : "";

/** Opens the palette (header Search, Ctrl/Cmd+K, a command). */
/** The text field being written in when the palette opens (Quick Insert target), or null. */
export function writingField(doc = globalThis.document) {
  const el = doc?.activeElement;
  if (
    !el?.matches?.('textarea, input[type="text"], input:not([type])') ||
    el.closest?.("#dialog") ||
    el.readOnly ||
    el.disabled ||
    typeof el.selectionStart !== "number"
  )
    return null;
  return { el, start: el.selectionStart, end: el.selectionEnd };
}
/** Opens the palette (header Search, Ctrl/Cmd+K, a command). */
export function openPalette(ctx, options = {}) {
  const target = options.target === undefined ? writingField() : options.target;
  const controller = createPalette(ctx, { ...options, insert: Boolean(target) });
  session = controller;
  const finish = (result) => {
    if (result === "stay") return (draw(ctx, controller, { keepInput: false }), false);
    if (result === "insert") {
      ctx.closeDialog?.();
      insertAtCaret(target.el, controller.state.inserted, target);
    }
    return undefined;
  };
  controller.finish = finish;
  ctx.dialog(ctx.t("Cerca e comandi", "Search and commands"), paletteHTML(ctx, controller.state), {
    submitLabel: controller.state.insert ? ctx.t("Inserisci", "Insert") : ctx.t("Apri", "Open"),
    cancelLabel: ctx.t("Chiudi", "Close"),
    onSubmit: () => finish(controller.choose()),
  });
  bindPalette(globalThis.document?.querySelector?.("#dialog [data-cmdk]"), ctx, controller);
  return controller;
}
function draw(ctx, controller, { keepInput = true } = {}) {
  const root = globalThis.document?.querySelector?.("#dialog [data-cmdk]");
  if (!root) return;
  const p = controller.state;
  const input = root.querySelector("[data-cmdk-input]");
  if (!keepInput || input.value !== p.text) input.value = p.text;
  root.querySelector("[data-cmdk-filter]").innerHTML = filterOptions(ctx, p.filter);
  root.querySelector("[data-cmdk-chip-slot]").innerHTML = chipHTML(ctx, p.filter);
  root.querySelector("[data-cmdk-list]").innerHTML = listHTML(ctx, p);
  root.querySelector("[data-cmdk-status]").textContent = statusText(ctx, p);
  input.setAttribute("aria-activedescendant", p.active >= 0 ? "cmdk-opt-" + p.active : "");
  root.querySelector(`#cmdk-opt-${p.active}`)?.scrollIntoView?.({ block: "nearest" });
}
function bindPalette(root, ctx, controller) {
  if (!root) return;
  const input = root.querySelector("[data-cmdk-input]");
  const select = root.querySelector("[data-cmdk-filter]");
  input.addEventListener("input", () => {
    controller.setText(input.value);
    draw(ctx, controller, { keepInput: false });
  });
  input.addEventListener("keydown", (event) => {
    const moves = { ArrowDown: 1, ArrowUp: -1, PageDown: 5, PageUp: -5 };
    if (moves[event.key]) {
      event.preventDefault();
      controller.move(moves[event.key]);
      draw(ctx, controller);
    } else if (event.key === "Enter" && !event.isComposing) {
      event.preventDefault();
      const result = controller.choose();
      if (controller.finish) controller.finish(result);
      else if (result === "stay") draw(ctx, controller, { keepInput: false });
    } else if (event.key === "Escape" && !event.isComposing) {
      // Esc closes the palette at once (Alchemy), instead of first clearing the field.
      event.preventDefault();
      session = null;
      ctx.closeDialog();
    } else if (event.key === "Backspace" && !input.value && controller.state.filter) {
      event.preventDefault();
      controller.setFilter(null);
      draw(ctx, controller);
    }
  });
  select.addEventListener("change", () => {
    controller.setFilter(select.value);
    draw(ctx, controller);
    input.focus();
  });
  root.querySelector("[data-cmdk-chip-slot]").addEventListener("click", (event) => {
    if (!event.target.closest?.("[data-cmdk-chip]")) return;
    controller.setFilter(null);
    draw(ctx, controller);
    input.focus();
  });
  root.querySelector("[data-cmdk-list]").addEventListener("click", (event) => {
    const option = event.target.closest?.("[data-cmdk-option]");
    if (!option) return;
    const result = controller.choose(Number(option.dataset.cmdkOption));
    if (result === "stay") {
      draw(ctx, controller, { keepInput: false });
      input.focus();
    } else controller.finish?.(result);
  });
  root.querySelector("[data-cmdk-create]").addEventListener("click", () => {
    session = null;
    const query = controller.state.result.mode === "search" ? controller.state.result.query : "";
    openQuickCreate(ctx, { title: query });
  });
  root.querySelector("[data-cmdk-guide]").addEventListener("click", () => {
    session = null;
    openGuide(ctx);
  });
  // The last search comes back selected: Enter reopens it, typing replaces it (I-184).
  input.focus();
  input.select?.();
}

// ------------------------------------------------------------------ generated guide (Kobold+)

const rowLabel = (ctx, row) => textOf(row.command.label, ctx.lang);
// Category of a command: its group, or the title of the area that registered it.
const groupName = (ctx, command) => {
  if (GROUPS[command.group]) return textOf(GROUPS[command.group], ctx.lang);
  const place = PLACES[command.group] ?? PLACES[command.extension];
  if (place) return textOf(place, ctx.lang);
  let title = null;
  try {
    title = ctx.registry?.extensions?.().find((row) => row.id === command.extension)?.title;
  } catch {}
  return textOf(title, ctx.lang) || command.group || command.extension || "";
};
export function guideHTML(ctx) {
  const t = ctx.t;
  const rows = rowsFor(ctx);
  const groups = S.guideGroups(
    rows,
    (row) => rowLabel(ctx, row),
    (context) => contextName(ctx, context),
  );
  // The core's fixed keys join their sections as read-only rows (Foundry locked binds);
  // a context with only fixed keys still gets its section.
  const locked = S.lockedKeys();
  for (const context of ["table", "global"])
    if (locked.some((row) => row.context === context) && !groups.some((g) => g.context === context))
      groups.unshift({ context, title: contextName(ctx, context), rows: [] });
  groups.sort(
    (a, b) =>
      (a.context === "global" ? 0 : a.context === "table" ? 1 : 2) -
      (b.context === "global" ? 0 : b.context === "table" ? 1 : 2),
  );
  const lockedHTML = (context) =>
    locked
      .filter((row) => row.context === context)
      .map(
        (row) =>
          `<div data-guide-locked="${escape(row.id)}" class="is-locked"><dt>${row.shortcuts
            .map((shortcut) => kbd(ctx, shortcut))
            .join(
              '<span class="cmdk-or" aria-hidden="true">/</span>',
            )}</dt><dd>${escape(textOf(row.label, ctx.lang))} <span class="cmdk-mark">${t("fisso", "fixed")}</span></dd></div>`,
      )
      .join("");
  const unbound = rows.filter((row) => !row.shortcut && !row.command.page).length;
  const conflicts = conflictLines(ctx, rows);
  return `<div class="cmdk-guide" data-cmdk-guide-body><p class="muted">${t("Guida generata dai comandi che puoi usare con questa identità. Le lettere singole funzionano quando non stai scrivendo in un campo.", "Guide generated from the commands this identity can use. Single letters work when you are not typing in a field.")}</p><section><h3>${t("Nella ricerca", "In the search")}</h3><dl class="cmdk-keys-list"><div><dt><kbd class="cmdk-kbd">&gt;</kbd></dt><dd>${t("solo i comandi permessi", "permitted commands only")}</dd></div><div><dt><kbd class="cmdk-kbd">@</kbd></dt><dd>${t("filtra per categoria (@incantesimi, @note, @mondo…)", "filter by category (@spells, @notes, @world…)")}</dd></div><div><dt><kbd class="cmdk-kbd">?</kbd></dt><dd>${t("questa guida e i prefissi", "this guide and the prefixes")}</dd></div><div><dt><kbd class="cmdk-kbd">↑</kbd><kbd class="cmdk-kbd">↓</kbd> <kbd class="cmdk-kbd">${t("Invio", "Enter")}</kbd></dt><dd>${t("scegli e apri; Indietro del browser torna dove eri", "choose and open; the browser’s Back returns where you were")}</dd></div></dl></section>${groups
    .map(
      (group) =>
        `<section data-guide-context="${escape(group.context)}"><h3>${escape(group.title)}</h3><dl class="cmdk-keys-list">${group.rows
          .map(
            (row) =>
              `<div data-guide-row="${escape(row.id)}"><dt>${kbd(ctx, row.shortcut)}</dt><dd>${escape(rowLabel(ctx, row))}${row.status === "custom" ? ` <span class="cmdk-mark">${t("personalizzata", "custom")}</span>` : ""}${row.conflicts.length ? ` <span class="cmdk-mark is-warning">${t("conflitto", "conflict")}</span>` : ""}</dd></div>`,
          )
          .join("")}${lockedHTML(group.context)}</dl></section>`,
    )
    .join(
      "",
    )}<section data-guide-conflicts><h3>${t("Conflitti", "Conflicts")}</h3>${conflicts.length ? `<ul>${conflicts.map((line) => `<li>${line}</li>`).join("")}</ul>` : `<p>${t("Nessun conflitto.", "No conflicts.")}</p>`}</section><p class="muted">${t(`${unbound} comandi non hanno una scorciatoia: puoi assegnarla.`, `${unbound} commands have no shortcut: you can assign one.`)}</p><button type="button" class="button primary" data-cmdk-configure>${t("Modifica le scorciatoie", "Edit shortcuts")}</button></div>`;
}
function conflictLines(ctx, rows) {
  const name = (id) => {
    const row = rows.find((r) => r.id === id);
    return row ? `«${escape(rowLabel(ctx, row))}»` : escape(id);
  };
  const lines = S.conflictGroups(rows).map(
    (group) =>
      `${kbd(ctx, group.shortcut)} ${ctx.t("è usata da", "is used by")} ${group.ids.map(name).join(", ")} ${ctx.t("nello stesso contesto: vale la scorciatoia che hai scelto tu, altrimenti quella del comando caricato per primo.", "in the same context: the shortcut you chose applies, otherwise the one of the command loaded first.")}`,
  );
  for (const row of rows)
    if (row.droppedDefault)
      lines.push(
        `${name(row.id)} ${ctx.t("non ha la scorciatoia predefinita", "lost its default shortcut")} ${kbd(ctx, row.droppedDefault)}: ${ctx.t("era già usata da un’area caricata prima.", "an area loaded earlier already used it.")}`,
      );
  return lines;
}
export function openGuide(ctx) {
  ctx.dialog(ctx.t("Scorciatoie da tastiera", "Keyboard shortcuts"), guideHTML(ctx), {
    cancelLabel: ctx.t("Chiudi", "Close"),
  });
  globalThis.document
    ?.querySelector?.("#dialog [data-cmdk-configure]")
    ?.addEventListener("click", () => openControls(ctx));
}

// ------------------------------------------------------------------ Configure Controls (Foundry)

const controls = { capture: null, pending: null, notice: null, confirmReset: false, query: "" };
const cancelBound = new WeakSet();
/** State of the shortcut editor (tests and binder). */
export const controlsState = () => controls;

export function controlsHTML(ctx) {
  const t = ctx.t;
  const rows = rowsFor(ctx);
  const q = normalizeText(controls.query);
  const visible = rows.filter(
    (row) =>
      !q ||
      normalizeText(rowLabel(ctx, row)).includes(q) ||
      normalizeText(keyText(ctx, row.shortcut)).includes(q),
  );
  // Categories (BG3, Foundry): everywhere, Table, other pages, then page navigation folded.
  const sectionOf = (row) => (row.command.page ? "pages" : row.context);
  const rank = (a) => (a === "global" ? 0 : a === "table" ? 1 : a === "pages" ? 3 : 2);
  const sections = [...new Set(visible.map(sectionOf))].sort(
    (a, b) => rank(a) - rank(b) || a.localeCompare(b),
  );
  const custom = rows.filter((row) => row.status === "custom").length;
  const status = (row) =>
    row.conflicts.length
      ? `<span class="cmdk-mark is-warning">${t("conflitto", "conflict")}</span>`
      : row.status === "custom"
        ? `<span class="cmdk-mark">${t("personalizzata", "custom")}</span>`
        : "";
  const rowHTML = (row) => {
    const name = rowLabel(ctx, row);
    const capturing = controls.capture === row.id;
    return `<li class="cmdk-control" data-control-row="${escape(row.id)}"><span class="cmdk-control-name"><strong>${escape(name)}</strong><small>${escape(groupName(ctx, row.command))}${row.defaultShortcut ? ` · ${t("predefinita", "default")} ${escape(keyText(ctx, row.defaultShortcut))}` : ""}</small>${status(row)}</span><span class="cmdk-control-actions"><button type="button" class="button cmdk-key${capturing ? " is-capturing" : ""}" data-control-capture="${escape(row.id)}" aria-label="${escape(keyButtonLabel(ctx, row, capturing))}">${keyButtonContent(ctx, row, capturing)}</button>${row.shortcut ? `<button type="button" class="button quiet" data-control-clear="${escape(row.id)}">${t("Togli", "Remove")}</button>` : ""}${row.status === "custom" ? `<button type="button" class="button quiet" data-control-reset="${escape(row.id)}">${t("Predefinita", "Default")}</button>` : ""}</span></li>`;
  };
  const notice = controls.notice
    ? `<div class="cmdk-notice${controls.notice.error ? " is-error" : ""}" role="${controls.notice.error ? "alert" : "status"}" data-controls-notice>${controls.notice.html}${controls.pending ? `<div class="toolbar"><button type="button" class="button primary" data-control-confirm>${t("Assegna e sposta", "Assign and move")}</button><button type="button" class="button" data-control-cancel>${t("Annulla", "Cancel")}</button></div>` : ""}</div>`
    : `<div data-controls-notice role="status" aria-live="polite"></div>`;
  return `<div class="cmdk-controls" data-cmdk-controls><p class="muted">${t(`Scorciatoie personali di ${ctx.role === "dm" ? "DM" : "Giocatore"}: restano dopo il ricaricamento e non cambiano quelle degli altri. Sul telefono serve una tastiera collegata.`, `Personal shortcuts for ${ctx.role === "dm" ? "DM" : "Player"}: they survive a reload and do not change anyone else’s. On a phone you need a connected keyboard.`)}</p><label class="field"><span>${t("Cerca un comando o un tasto", "Search a command or key")}</span><input type="search" data-controls-search value="${escape(controls.query)}" autocomplete="off"></label>${notice}${sections
    .map((section) => {
      const list = visible
        .filter((row) => sectionOf(row) === section)
        .sort((a, b) => rowLabel(ctx, a).localeCompare(rowLabel(ctx, b)));
      const items = `<ul>${list.map(rowHTML).join("")}</ul>`;
      if (section !== "pages")
        return `<section class="cmdk-control-group" data-controls-section="${escape(section)}"><h3>${escape(contextName(ctx, section))}</h3>${items}</section>`;
      const open = q || list.some((row) => row.shortcut || row.id === controls.capture);
      return `<details class="cmdk-control-group" data-controls-section="pages"${open ? " open" : ""}><summary>${t("Vai a una pagina", "Go to a page")} (${list.length})</summary>${items}</details>`;
    })
    .join(
      "",
    )}<div class="cmdk-reset">${controls.confirmReset ? `<div class="cmdk-notice" role="alert"><p>${t(`Ripristinare tutte le scorciatoie predefinite? Le tue ${custom} scelte verranno tolte.`, `Restore every default shortcut? Your ${custom} choices will be removed.`)}</p><div class="toolbar"><button type="button" class="button danger" data-controls-reset-confirm>${t("Ripristina tutte", "Restore all")}</button><button type="button" class="button" data-controls-reset-cancel>${t("Annulla", "Cancel")}</button></div></div>` : `<button type="button" class="button" data-controls-reset-all${custom ? "" : ' disabled aria-describedby="cmdk-reset-why"'}>${t("Ripristina predefinite", "Restore defaults")}${custom ? ` (${custom})` : ""}</button>${custom ? "" : `<p class="muted cmdk-why" id="cmdk-reset-why">${t("Usi già le scorciatoie predefinite: niente da ripristinare.", "You already use the default shortcuts: nothing to restore.")}</p>`}`}</div></div>`;
}

// The key button of an editor row: its accessible name and its content.
const keyButtonLabel = (ctx, row, capturing) =>
  `${rowLabel(ctx, row)}: ${row.shortcut ? keyText(ctx, row.shortcut) : ctx.t("nessuna", "none")}. ${capturing ? ctx.t("Premi la nuova combinazione, Esc annulla", "Press the new combination, Esc cancels") : ctx.t("Premi per cambiarla", "Press to change it")}`;
const keyButtonContent = (ctx, row, capturing) =>
  capturing ? ctx.t("Premi i tasti…", "Press keys…") : row.shortcut ? kbd(ctx, row.shortcut) : "—";
/**
 * Stops capturing without a redraw, so focus stays where Tab or a click moved it: the
 * key button shows the key again and the "press the new combination" notice goes.
 */
function stopCapture(ctx, id) {
  controls.capture = null;
  controls.notice = null;
  const root = globalThis.document?.querySelector?.("#dialog [data-cmdk-controls]");
  if (!root) return;
  const row = rowsFor(ctx).find((r) => r.id === id);
  const button = root.querySelector(`[data-control-capture="${cssEscape(id)}"]`);
  if (button && row) {
    button.classList.remove("is-capturing");
    button.innerHTML = keyButtonContent(ctx, row, false);
    button.setAttribute("aria-label", keyButtonLabel(ctx, row, false));
  }
  const notice = root.querySelector("[data-controls-notice]");
  if (notice)
    notice.outerHTML = `<div data-controls-notice role="status" aria-live="polite"></div>`;
}

const commitBindings = (ctx, label, mutate) =>
  ctx.commit(label, (draft) => mutate(api.slice(draft)), PRIVATE);

/** Handles a key pressed while a row is capturing. Returns the outcome for tests. */
export function captureKey(ctx, event) {
  const id = controls.capture;
  if (!id) return "idle";
  if (["Control", "Meta", "Alt", "Shift", "OS", "AltGraph"].includes(event.key)) return "waiting";
  if (
    event.key === "Escape" &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !event.shiftKey
  ) {
    controls.capture = null;
    controls.notice = { html: escape(ctx.t("Modifica annullata.", "Change cancelled.")) };
    return "cancelled";
  }
  const shortcut = eventShortcut(event);
  if (!shortcut) return "waiting";
  const rows = rowsFor(ctx);
  const row = rows.find((r) => r.id === id);
  const check = S.checkBinding(rows, id, shortcut);
  controls.capture = null;
  if (check.reserved) {
    const why = {
      browser: [
        "è del browser (ricarica, cerca, stampa, salva, schede): scegli un’altra combinazione.",
        "belongs to the browser (reload, find, print, save, tabs): choose another combination.",
      ],
      element: [
        "sul Tavolo toglie le pedine selezionate (DM): scegli un’altra combinazione.",
        "removes the selected tokens at the Table (DM): choose another combination.",
      ],
    }[check.reserved.kind] ?? [
      "è riservata all’app (Esc, Tab, Invio, Spazio, frecce, Ctrl+A/C/V/X/Z): scegli un’altra combinazione.",
      "is reserved by the app (Esc, Tab, Enter, Space, arrows, Ctrl+A/C/V/X/Z): choose another combination.",
    ];
    controls.notice = {
      error: true,
      html: `${kbd(ctx, check.shortcut)} ${escape(ctx.t(...why))}`,
    };
    return "reserved";
  }
  if (check.conflicts) {
    controls.pending = { id, shortcut: check.shortcut, displace: check.conflicts.map((r) => r.id) };
    controls.notice = {
      error: true,
      html: `${kbd(ctx, check.shortcut)} ${escape(ctx.t("è già usata da", "is already used by"))} ${check.conflicts
        .map((r) => `«${escape(rowLabel(ctx, r))}» (${escape(contextName(ctx, r.context))})`)
        .join(
          ", ",
        )}. ${escape(ctx.t(`Assegnandola a «${rowLabel(ctx, row)}», l’altro comando resterà senza scorciatoia.`, `If you assign it to “${rowLabel(ctx, row)}”, the other command will have no shortcut.`))}`,
    };
    return "conflict";
  }
  saveBinding(ctx, id, check.shortcut, []);
  return "saved";
}
function saveBinding(ctx, id, shortcut, displace) {
  const rows = rowsFor(ctx);
  const row = rows.find((r) => r.id === id);
  let moved = [];
  commitBindings(
    ctx,
    ctx.t(
      `Scorciatoia di «${rowLabel(ctx, row)}»: ${keyText(ctx, shortcut)}`,
      `Shortcut for “${rowLabel(ctx, row)}”: ${keyText(ctx, shortcut)}`,
    ),
    (slice) => {
      moved = S.setBinding(slice, ctx.role, rows, id, shortcut, { displace });
    },
  );
  controls.pending = null;
  controls.notice = {
    html: `${escape(rowLabel(ctx, row))}: ${kbd(ctx, shortcut)}${
      moved.length
        ? ` · ${escape(ctx.t("tolta a", "removed from"))} ${moved
            .map(
              (m) =>
                `«${escape(
                  rowLabel(
                    ctx,
                    rows.find((r) => r.id === m),
                  ),
                )}»`,
            )
            .join(", ")}`
        : ""
    }`,
  };
}
export function confirmPending(ctx) {
  const pending = controls.pending;
  if (!pending) return false;
  saveBinding(ctx, pending.id, pending.shortcut, pending.displace);
  return true;
}
export function cancelPending(ctx) {
  controls.pending = null;
  controls.notice = { html: escape(ctx.t("Nessuna modifica.", "No change.")) };
}
export function clearRowBinding(ctx, id) {
  const row = rowsFor(ctx).find((r) => r.id === id);
  commitBindings(
    ctx,
    ctx.t(
      `Scorciatoia tolta: «${rowLabel(ctx, row)}»`,
      `Shortcut removed: “${rowLabel(ctx, row)}”`,
    ),
    (slice) => S.clearBinding(slice, ctx.role, id),
  );
  controls.notice = {
    html: escape(
      ctx.t(
        `«${rowLabel(ctx, row)}» è senza scorciatoia.`,
        `“${rowLabel(ctx, row)}” has no shortcut.`,
      ),
    ),
  };
}
export function resetRowBinding(ctx, id) {
  const row = rowsFor(ctx).find((r) => r.id === id);
  commitBindings(
    ctx,
    ctx.t(
      `Scorciatoia predefinita: «${rowLabel(ctx, row)}»`,
      `Default shortcut: “${rowLabel(ctx, row)}”`,
    ),
    (slice) => S.resetBinding(slice, ctx.role, id),
  );
  controls.notice = {
    html: escape(
      ctx.t(
        `«${rowLabel(ctx, row)}» è tornata alla predefinita.`,
        `“${rowLabel(ctx, row)}” is back to its default.`,
      ),
    ),
  };
}
export function resetAll(ctx) {
  let count = 0;
  commitBindings(
    ctx,
    ctx.t("Scorciatoie predefinite ripristinate", "Default shortcuts restored"),
    (slice) => {
      count = S.resetAllBindings(slice, ctx.role);
    },
  );
  controls.confirmReset = false;
  controls.notice = {
    html: escape(
      ctx.t(
        `Ripristinate le predefinite (${count} scelte tolte).`,
        `Defaults restored (${count} choices removed).`,
      ),
    ),
  };
  return count;
}
export function openControls(ctx) {
  Object.assign(controls, {
    capture: null,
    pending: null,
    notice: null,
    confirmReset: false,
    query: "",
  });
  ctx.dialog(ctx.t("Configura le scorciatoie", "Configure shortcuts"), controlsHTML(ctx), {
    cancelLabel: ctx.t("Chiudi", "Close"),
  });
  const dialog = globalThis.document?.querySelector?.("#dialog");
  if (!dialog) return;
  // Esc while capturing cancels the capture, not the whole editor (bound once per element).
  if (!cancelBound.has(dialog)) {
    cancelBound.add(dialog);
    dialog.addEventListener("cancel", (event) => {
      if (controls.capture && dialog.querySelector("[data-cmdk-controls]")) {
        event.preventDefault();
        captureKey(controls.ctx, { key: "Escape" });
        redrawControls(controls.ctx, "[data-controls-notice]");
      }
    });
  }
  controls.ctx = ctx;
  bindControls(dialog.querySelector("[data-cmdk-controls]"), ctx);
}
function redrawControls(ctx, focusSelector) {
  const dialog = globalThis.document?.querySelector?.("#dialog");
  const old = dialog?.querySelector("[data-cmdk-controls]");
  if (!old) return;
  const search = old.querySelector("[data-controls-search]");
  const hadSearchFocus = globalThis.document.activeElement === search;
  old.outerHTML = controlsHTML(ctx);
  const root = dialog.querySelector("[data-cmdk-controls]");
  bindControls(root, ctx);
  const target = hadSearchFocus
    ? root.querySelector("[data-controls-search]")
    : focusSelector && root.querySelector(focusSelector);
  target?.focus?.();
  if (hadSearchFocus) target.setSelectionRange?.(target.value.length, target.value.length);
}
function bindControls(root, ctx) {
  if (!root) return;
  const guard = (fn, focus) => (event) => {
    try {
      fn(event);
    } catch (error) {
      controls.notice = {
        error: true,
        html: escape(error?.it ? textOf(error, ctx.lang) : String(error?.message ?? error)),
      };
    }
    redrawControls(ctx, typeof focus === "function" ? focus(event) : focus);
  };
  root.querySelector("[data-controls-search]").addEventListener("input", (event) => {
    controls.query = event.target.value;
    redrawControls(ctx);
  });
  for (const button of root.querySelectorAll("[data-control-capture]")) {
    const id = button.dataset.controlCapture;
    button.addEventListener(
      "click",
      guard(
        () => {
          controls.capture = controls.capture === id ? null : id;
          controls.pending = null;
          controls.notice = controls.capture
            ? {
                html: escape(
                  ctx.t(
                    "Premi la nuova combinazione. Esc annulla.",
                    "Press the new combination. Esc cancels.",
                  ),
                ),
              }
            : null;
        },
        `[data-control-capture="${cssEscape(id)}"]`,
      ),
    );
    button.addEventListener("keydown", (event) => {
      if (controls.capture !== id) return;
      if (event.key === "Tab") {
        stopCapture(ctx, id);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      let outcome;
      guard(
        () => {
          outcome = captureKey(ctx, event);
        },
        () =>
          outcome === "conflict"
            ? "[data-control-confirm]"
            : `[data-control-capture="${cssEscape(id)}"]`,
      )();
    });
    // Leaving the key field stops capturing (a redraw moves focus to its replacement).
    button.addEventListener("blur", () => {
      if (controls.capture === id)
        setTimeout(() => {
          if (
            controls.capture === id &&
            globalThis.document.activeElement?.dataset?.controlCapture !== id
          )
            stopCapture(ctx, id);
        }, 0);
    });
  }
  const sel = (id) => `[data-control-capture="${cssEscape(id)}"]`;
  root.querySelector("[data-control-confirm]")?.addEventListener(
    "click",
    guard(
      () => confirmPending(ctx),
      () => (controls.notice ? "[data-controls-notice]" : null),
    ),
  );
  root.querySelector("[data-control-cancel]")?.addEventListener(
    "click",
    guard(() => cancelPending(ctx), "[data-controls-notice]"),
  );
  for (const button of root.querySelectorAll("[data-control-clear]"))
    button.addEventListener(
      "click",
      guard(
        () => clearRowBinding(ctx, button.dataset.controlClear),
        sel(button.dataset.controlClear),
      ),
    );
  for (const button of root.querySelectorAll("[data-control-reset]"))
    button.addEventListener(
      "click",
      guard(
        () => resetRowBinding(ctx, button.dataset.controlReset),
        sel(button.dataset.controlReset),
      ),
    );
  root.querySelector("[data-controls-reset-all]")?.addEventListener(
    "click",
    guard(() => {
      controls.confirmReset = true;
    }, "[data-controls-reset-cancel]"),
  );
  root.querySelector("[data-controls-reset-confirm]")?.addEventListener(
    "click",
    guard(() => resetAll(ctx), "[data-controls-notice]"),
  );
  root.querySelector("[data-controls-reset-cancel]")?.addEventListener(
    "click",
    guard(() => {
      controls.confirmReset = false;
    }, "[data-controls-reset-all]"),
  );
}

// ------------------------------------------------------------------ key dispatch

const EDITING_KEYS = ["Mod+A", "Mod+C", "Mod+V", "Mod+X", "Mod+Z", "Mod+Y", "Mod+Shift+Z"];
/** Canonical key of an event; Alt+letter uses the physical key (⌥ changes the character on Mac). */
export function eventShortcut(event) {
  if (event.altKey && /^Key[A-Z]$/.test(event.code ?? "") && !/^[a-z]$/i.test(event.key ?? ""))
    return normalizeShortcut({ ...pickModifiers(event), key: event.code.slice(3) });
  return normalizeShortcut(pickModifiers(event, event.key));
}
const pickModifiers = (event, key) => ({
  ctrlKey: event.ctrlKey,
  metaKey: event.metaKey,
  altKey: event.altKey,
  shiftKey: event.shiftKey,
  key,
});

/**
 * One dispatcher for every command key, with this identity's choices. It runs before the
 * shell's own listener (registered earlier on the document) and marks handled keys, so a
 * default moved elsewhere no longer reaches the shell. Same guards as the shell: no key
 * while a dialog is open, plain letters never while typing, editing keys stay editing.
 */
export function handleKeydown(event, ctx = api?.ctx) {
  if (!ctx || event.defaultPrevented || event.isComposing) return null;
  const doc = globalThis.document;
  if (doc?.querySelector?.("#dialog")?.open) return null;
  const target = event.target;
  const typing = target?.closest?.("input,textarea,select,[contenteditable=true]");
  if (typing && !(event.ctrlKey || event.metaKey || event.altKey)) return null;
  const key = eventShortcut(event);
  if (!key) return null;
  if (typing && EDITING_KEYS.includes(key)) return null;
  if (
    ["Enter", "Space"].includes(key) &&
    target?.closest?.("button,a[href],summary,[role=button],input,select,textarea")
  )
    return null;
  const rows = rowsFor(ctx);
  const page = ctx.view?.page;
  const holder = S.keyHolder(rows, key, page);
  if (holder) {
    event.preventDefault();
    runRow(holder, ctx);
    return holder.id;
  }
  if (
    rows.some(
      (row) =>
        row.defaultShortcut === key &&
        row.shortcut !== key &&
        (row.context === "global" || row.context === page),
    )
  ) {
    event.preventDefault();
    return "suppressed";
  }
  return null;
}
function installKeys() {
  const doc = globalThis.document;
  if (keysInstalled || !doc?.addEventListener) return;
  keysInstalled = true;
  doc.addEventListener("keydown", (event) => {
    try {
      handleKeydown(event);
    } catch (error) {
      globalThis.console?.warn?.(`[extension ${ID}] key dispatch: ${error?.message ?? error}`);
    }
  });
}

// ------------------------------------------------------------------ registration

export function register(registry) {
  api = registry;
  registry.registerStateSlice(ID, {
    version: S.SLICE_VERSION,
    undo: "preserve",
    seed: S.seedBindings,
    normalize: (value, fromVersion) => S.normalizeBindings(value, fromVersion || S.SLICE_VERSION),
  });
  registry.registerStyles(new URL("./command-palette.css", import.meta.url));
  registry.add("service", {
    id: "search",
    replaces: true,
    // Same name as the core Search it replaces; the key is shown in the palette and guide.
    label: L("Cerca", "Search"),
    icon: "search",
    header: true,
    run: (ctx) => openPalette(ctx),
  });
  // The header's «Appunti personali» keeps the player at the Table: there it opens the quick
  // jot over the map (D&D Beyond Quick Jot, CA-11); elsewhere it opens the notes page.
  registry.add("service", {
    id: "notes",
    replaces: true,
    label: L("Appunti personali", "Personal notes"),
    icon: "note",
    header: true,
    run: (ctx) => {
      if (ctx.view?.page === "table") return void openQuickCreate(ctx, { kind: "note", jot: true });
      const view = ctx.view ?? {};
      // Same return as the core service: the whole route, nested Library returns included.
      const origin = Object.fromEntries(
        ["id", "tab", "revision", "returnTo"]
          .filter((key) => view[key])
          .map((key) => [key, view[key]]),
      );
      const returnTo =
        view.page === "notes"
          ? view.returnTo
          : JSON.stringify({ page: view.page ?? "home", ...origin });
      ctx.navigate("notes", returnTo ? { returnTo } : {});
    },
  });
  for (const command of OWN_COMMANDS) registry.add("command", command);
  installDecorations();
  registry.on("reset", () => {
    clearMemory();
    session = null;
  });
  registry.on("role-changed", () => {
    session = null;
    Object.assign(controls, {
      capture: null,
      pending: null,
      notice: null,
      confirmReset: false,
      query: "",
    });
  });
  installKeys();
}
