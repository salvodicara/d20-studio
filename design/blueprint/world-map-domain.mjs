// B42 — World: maps, pins, calendar events and chronicle (pure domain, no DOM).
//
// Patterns (census IDs): Kanka Map Explorer — pins with a linked entry, groups, per-pin
// visibility, a searchable legend, draggable markers and waypoint measuring (CMP-41–48);
// World Anvil interactive maps linking articles and other maps (CMP-78); Foundry map
// notes (FVT-087); LegendKeeper nested maps world → region → town → dungeon, pins that
// open another element's map and pages created from the map (CMP-64/65/67); LegendKeeper
// "fantasy navigation" measuring (CMP-68); World Anvil Chronicles: events tied to map
// places, the marker shows its place's history (CMP-79); Kanka and LegendKeeper
// timelines with eras (CMP-40/69); Calendaria notes Visible / Hidden / Private with
// reminders fired by game time (FVT-062). Calendar math lives in world-calendar.mjs.
//
// Rules: travel estimates use the D&D 2024 SRD 5.2.1 Travel Pace table (EN p. 12,
// IT p. 13 "Passo di viaggio") and the Travel Terrain maximum pace with Good Roads
// (EN p. 192, IT p. 220). An estimate never advances the shared clock (F-021).
//
// Visibility is a local projection by identity ("dm" / "player"): DM-only maps, pins and
// events never reach the player; a player's private event ("Solo io") never reaches the
// DM. No backend security is implied.

import * as C from "./world-calendar.mjs";

export const SLICE = "world-map";
export const VERSION = 1;
export const ROLES = Object.freeze(["dm", "player"]);
export const ARTS = Object.freeze(["valley", "city", "crypt", "parchment"]);
export const MAX_BACKGROUND = 2 * 1024 * 1024; // bytes of the uploaded image
export const MAX_BACKGROUND_URL = Math.ceil((MAX_BACKGROUND * 4) / 3) + 64;

const clone = (v) => structuredClone(v);
const object = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const idOk = (v) => typeof v === "string" && /^[a-z0-9][a-z0-9-]{0,63}$/.test(v);
const str = (v, max) => typeof v === "string" && v.length <= max;
const name = (v, max = 80) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
export const newId = (prefix) =>
  `${prefix}-${(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(16).slice(2)).replace(/-/g, "").slice(0, 10)}`;

export function fail(it, en) {
  return Object.assign(new Error(it), { it, en });
}

// ------------------------------------------------------------------ rules (SRD 5.2.1)
const srd = (en, it) => ({
  kind: "srd",
  edition: "2024",
  revision: "5.2.1",
  en: {
    url: "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf",
    pages: [en],
  },
  it: {
    url: "https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf",
    pages: [it],
  },
});
export const SOURCES = Object.freeze({
  pace: srd(12, 13),
  terrain: srd(192, 220),
});
// Travel Pace: EN miles (p. 12), IT kilometres (p. 13). The Italian SRD uses 1.5 km per
// mile (30 miles = 45 km), the same factor used for every distance shown here.
export const KM_PER_MILE = 1.5;
export const PACES = Object.freeze([
  { id: "fast", rank: 2, it: "Veloce", en: "Fast", kmDay: 45, kmHour: 6, miDay: 30, miHour: 4 },
  {
    id: "normal",
    rank: 1,
    it: "Normale",
    en: "Normal",
    kmDay: 36,
    kmHour: 4.5,
    miDay: 24,
    miHour: 3,
  },
  { id: "slow", rank: 0, it: "Lento", en: "Slow", kmDay: 27, kmHour: 3, miDay: 18, miHour: 2 },
]);
export const PACE_EFFECTS = Object.freeze({
  fast: {
    it: "Svantaggio a Saggezza (Percezione o Sopravvivenza) e Destrezza (Furtività).",
    en: "Disadvantage on Wisdom (Perception or Survival) and Dexterity (Stealth) checks.",
  },
  normal: {
    it: "Svantaggio alle prove di Destrezza (Furtività).",
    en: "Disadvantage on Dexterity (Stealth) checks.",
  },
  slow: {
    it: "Vantaggio a Saggezza (Percezione o Sopravvivenza).",
    en: "Advantage on Wisdom (Perception or Survival) checks.",
  },
});
// Travel Terrain, Maximum Pace column (EN p. 192, IT p. 220).
export const TERRAINS = Object.freeze([
  { id: "arctic", it: "Artico", en: "Arctic", max: 2, note: true },
  { id: "coastal", it: "Costiero", en: "Coastal", max: 1 },
  { id: "desert", it: "Deserto", en: "Desert", max: 1 },
  { id: "forest", it: "Foresta", en: "Forest", max: 1 },
  { id: "grassland", it: "Prateria", en: "Grassland", max: 2 },
  { id: "hill", it: "Collina", en: "Hill", max: 1 },
  { id: "mountain", it: "Montagna", en: "Mountain", max: 0 },
  { id: "swamp", it: "Palude", en: "Swamp", max: 0 },
  { id: "underdark", it: "Sottosuolo", en: "Underdark", max: 1 },
  { id: "urban", it: "Urbano", en: "Urban", max: 1 },
  { id: "waterborne", it: "Sull’acqua", en: "Waterborne", max: null },
]);
export const TRAVEL_HOURS = 8; // "typically 8" hours of travel per day (EN p. 192, IT p. 220)

export function routeLegs(points, kmPerUnit) {
  const legs = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    legs.push({ from: a, to: b, km: Math.hypot(b.x - a.x, b.y - a.y) * kmPerUnit });
  }
  return { legs, km: legs.reduce((n, leg) => n + leg.km, 0) };
}
/**
 * Travel time per pace; paces above the terrain's maximum are marked. Whole days use the
 * table's Day column (Fast 30 mi = 45 km, Slow 18 mi = 27 km: not 8 × the Hour column),
 * the rest of the way its Hour column. The rest is shorter than a day's distance, so it
 * never takes more than one more travel day (B42 review).
 */
export function travelEstimate(km, { terrain = "", road = false } = {}) {
  const t = TERRAINS.find((row) => row.id === terrain) ?? null;
  const max = t ? (t.max === null ? -1 : Math.min(2, t.max + (road ? 1 : 0))) : 2;
  return PACES.map((pace) => {
    let days = Math.floor(km / pace.kmDay + 1e-9);
    let restHours = Math.max(0, km - days * pace.kmDay) / pace.kmHour;
    if (restHours >= TRAVEL_HOURS - 1e-9) {
      days += 1;
      restHours = 0;
    }
    if (restHours < 1e-9) restHours = 0;
    return {
      id: pace.id,
      pace,
      allowed: pace.rank <= max,
      hours: days * TRAVEL_HOURS + restHours,
      days,
      restHours,
    };
  });
}

// ------------------------------------------------------------------ seed
const seedCalendar = () => ({
  name: "Calendario di Bruma",
  months: [
    ["gelo", "Gelo", 30],
    ["disgelo", "Disgelo", 30],
    ["germoglio", "Germoglio", 31],
    ["fioritura", "Fioritura", 30],
    ["solleone", "Solleone", 31],
    ["messi", "Messi", 30],
    ["vendemmia", "Vendemmia", 31],
    ["nebbie", "Nebbie", 30],
    ["brume", "Brume", 30],
    ["lunganotte", "Lunganotte", 31],
  ].map(([id, n, days]) => ({ id, name: n, days })),
  weekdays: ["Alba", "Remo", "Fiera", "Vespro", "Lanterna", "Quiete"].map((n, i) => ({
    id: `wd-${i + 1}`,
    name: n,
  })),
  weekdayOffset: 0,
  moons: [
    { id: "vela", name: "Vela", cycle: 28, offset: 3, color: "#dfe6ea" },
    { id: "cinerea", name: "Cinerea", cycle: 11, offset: 0, color: "#e0946b" },
  ],
  seasons: [
    { id: "primavera", name: "Primavera", startMonth: "disgelo" },
    { id: "estate", name: "Estate", startMonth: "solleone" },
    { id: "autunno", name: "Autunno", startMonth: "vendemmia" },
    { id: "inverno", name: "Inverno", startMonth: "lunganotte" },
  ],
  eras: [
    { id: "silenzio", name: "Età del Silenzio", abbr: "E.S.", startYear: 1 },
    { id: "lanterne", name: "Età delle Lanterne", abbr: "E.L.", startYear: 1001 },
  ],
  epoch: { year: 1287, month: "nebbie", day: 14, hour: 8, minute: 0 },
  corrections: [],
});

function seedLanterns() {
  const calendar = seedCalendar();
  const armed = C.epochSeconds(calendar); // shared clock zero
  const pin = (id, mapId, x, y, n, groupId, description, extra = {}) => ({
    id,
    mapId,
    x,
    y,
    name: n,
    groupId,
    visibility: "all",
    entryId: null,
    childMapId: null,
    sceneId: null,
    description,
    ...extra,
  });
  const event = (id, title, date, extra = {}) => ({
    id,
    title,
    description: "",
    date,
    time: null,
    recurrence: "none",
    visibility: "all",
    owner: "dm",
    pinId: null,
    reminder: null,
    openedAt: null,
    corrections: [],
    ...extra,
  });
  return {
    rootMapId: "valle-di-bruma",
    maps: [
      {
        id: "valle-di-bruma",
        name: "Valle di Bruma",
        width: 1200,
        height: 800,
        kmPerUnit: 0.2,
        art: "valley",
        background: null,
        visibility: "all",
      },
      {
        id: "porto-grigio-citta",
        name: "Porto Grigio",
        width: 1000,
        height: 700,
        kmPerUnit: 0.0015,
        art: "city",
        background: null,
        visibility: "all",
      },
      {
        id: "cripte-del-faro",
        name: "Cripte del faro",
        width: 800,
        height: 600,
        kmPerUnit: 0.0001,
        art: "crypt",
        background: null,
        visibility: "dm",
      },
    ],
    groups: [
      { id: "citta", name: "Città", color: "#dfbd78" },
      { id: "luoghi", name: "Luoghi", color: "#8fc1d4" },
      { id: "pericoli", name: "Pericoli", color: "#f1a09a" },
      { id: "quartieri", name: "Quartieri", color: "#abd0a3" },
    ],
    pins: [
      pin(
        "porto-grigio",
        "valle-di-bruma",
        960,
        520,
        "Porto Grigio",
        "citta",
        "Città portuale alla foce del fiume, dove attraccano le chiatte del sale.",
        { childMapId: "porto-grigio-citta" },
      ),
      pin(
        "bruma",
        "valle-di-bruma",
        420,
        380,
        "Bruma",
        "citta",
        "Il villaggio delle lanterne, da dove è partito il gruppo.",
      ),
      pin(
        "osservatorio",
        "valle-di-bruma",
        300,
        240,
        "Vecchio osservatorio",
        "luoghi",
        "La torre sulla collina: qualcuno ha riacceso la sua lanterna.",
        { sceneId: "old-watch" },
      ),
      pin(
        "ponte-di-pietra",
        "valle-di-bruma",
        650,
        450,
        "Ponte di pietra",
        "luoghi",
        "L’unico guado sicuro sulla strada per la costa.",
      ),
      pin(
        "tana-goblin",
        "valle-di-bruma",
        720,
        170,
        "Tana dei goblin",
        "pericoli",
        "Da qui vengono la Sentinella e l’Esploratore.",
        { visibility: "dm" },
      ),
      pin(
        "molo-del-sale",
        "porto-grigio-citta",
        600,
        560,
        "Molo del sale",
        "quartieri",
        "Chiatte, magazzini e la capitaneria del porto.",
      ),
      pin(
        "mercato-coperto",
        "porto-grigio-citta",
        420,
        330,
        "Mercato coperto",
        "quartieri",
        "Botteghe e banchi sotto un unico tetto di ardesia.",
      ),
      pin(
        "tempio-della-marea",
        "porto-grigio-citta",
        690,
        240,
        "Tempio della Marea",
        "luoghi",
        "Le sacerdotesse annotano ogni notte le fasi di Vela e Cinerea.",
      ),
      pin("faro", "porto-grigio-citta", 890, 520, "Faro", "luoghi", "Spento da tre inverni."),
      pin(
        "ingresso-cripte",
        "porto-grigio-citta",
        760,
        300,
        "Ingresso delle cripte",
        "pericoli",
        "Una grata sotto l’altare porta alle cripte del faro.",
        { visibility: "dm", childMapId: "cripte-del-faro" },
      ),
      pin(
        "scala-del-tempio",
        "cripte-del-faro",
        130,
        110,
        "Scala verso il tempio",
        "luoghi",
        "Risale sotto l’altare del Tempio della Marea.",
      ),
      pin(
        "sala-lanterna-nera",
        "cripte-del-faro",
        520,
        330,
        "Sala della lanterna nera",
        "pericoli",
        "Qui qualcuno prepara la lanterna gemella di quella dell’osservatorio.",
        { visibility: "dm" },
      ),
    ],
    calendar,
    events: [
      event(
        "caduta-torri",
        "La caduta delle antiche torri",
        { year: 812, month: "brume", day: 1 },
        {
          description:
            "Finisce l’Età del Silenzio: le torri di segnalazione crollano in una notte.",
        },
      ),
      event(
        "fondazione-porto",
        "Fondazione di Porto Grigio",
        { year: 1034, month: "germoglio", day: 1 },
        { pinId: "porto-grigio", description: "I salinari costruiscono il primo molo." },
      ),
      event(
        "grande-incendio",
        "Il grande incendio del porto",
        { year: 1201, month: "solleone", day: 9 },
        { pinId: "porto-grigio", description: "Brucia metà del quartiere del molo." },
      ),
      event(
        "abbandono-osservatorio",
        "L’osservatorio viene abbandonato",
        { year: 1250, month: "brume", day: 3 },
        { pinId: "osservatorio" },
      ),
      event(
        "patto-sentinelle",
        "Il patto delle sentinelle",
        { year: 1280, month: "gelo", day: 20 },
        {
          pinId: "tana-goblin",
          visibility: "dm",
          description:
            "I goblin giurano di sorvegliare la valle per chi custodisce la lanterna nera.",
        },
      ),
      event(
        "lanterna-riaccesa",
        "La lanterna si riaccende",
        { year: 1287, month: "nebbie", day: 12 },
        {
          pinId: "osservatorio",
          time: { hour: 22, minute: 0 },
          description: "Dalla valle si vede di nuovo la luce sulla torre.",
        },
      ),
      event(
        "fiera-lanterne",
        "Fiera delle lanterne",
        { year: 1287, month: "nebbie", day: 16 },
        {
          pinId: "porto-grigio",
          recurrence: "yearly",
          reminder: { leadDays: 1, audience: "viewers", armedAt: armed },
          openedAt: armed,
          description: "Ogni anno le barche risalgono il fiume con le lanterne accese.",
        },
      ),
      event(
        "incontro-capitana",
        "Incontro con la capitana del porto",
        { year: 1287, month: "nebbie", day: 17 },
        {
          owner: "player",
          visibility: "private",
          pinId: "molo-del-sale",
          time: { hour: 10, minute: 0 },
          reminder: { leadDays: 1, audience: "owner", armedAt: armed },
          description: "Livia vuole chiederle chi ha noleggiato le chiatte di notte.",
        },
      ),
    ],
  };
}

export function emptyWorld() {
  return {
    rootMapId: null,
    maps: [],
    groups: [{ id: "luoghi", name: "Luoghi", color: "#8fc1d4" }],
    pins: [],
    calendar: seedCalendar(),
    events: [],
  };
}
export const seedWorld = () => ({ campaigns: { lanterns: seedLanterns() } });

export function normalizeWorld(slice, fromVersion) {
  if (fromVersion > VERSION) throw Error("Unknown world-map data version");
  if (!object(slice) || !object(slice.campaigns)) return seedWorld();
  const campaigns = {};
  for (const [id, world] of Object.entries(slice.campaigns)) {
    if (!object(world)) continue;
    const base = emptyWorld();
    campaigns[id] = {
      rootMapId: typeof world.rootMapId === "string" ? world.rootMapId : null,
      maps: Array.isArray(world.maps) ? world.maps.filter(object) : [],
      groups: Array.isArray(world.groups) ? world.groups.filter(object) : base.groups,
      pins: Array.isArray(world.pins) ? world.pins.filter(object) : [],
      calendar:
        object(world.calendar) && Array.isArray(world.calendar.months)
          ? world.calendar
          : base.calendar,
      events: Array.isArray(world.events) ? world.events.filter(object) : [],
    };
    campaigns[id].calendar.corrections ??= [];
  }
  return { campaigns };
}

// ------------------------------------------------------------------ access
export const campaignIdOf = (state) => state?.campaign?.id ?? null;
export function worldOf(slice, campaignId) {
  return (campaignId && slice?.campaigns?.[campaignId]) || null;
}
/** The mutable world of the current campaign inside a commit draft (created if absent). */
export function ensureWorld(slice, campaignId) {
  if (!campaignId) throw fail("Nessuna campagna aperta.", "No campaign is open.");
  slice.campaigns ??= {};
  return (slice.campaigns[campaignId] ??= emptyWorld());
}
export const clockSeconds = (state, campaignId) =>
  Number(state?.restTime?.clocks?.[campaignId]?.seconds) || 0;
export const worldNow = (state, world, campaignId = campaignIdOf(state)) =>
  C.nowFromClock(world.calendar, clockSeconds(state, campaignId));

export const canSeeMap = (map, role) => !!map && (role === "dm" || map.visibility === "all");
export function canSeePin(world, pin, role) {
  if (!pin || !(role === "dm" || pin.visibility === "all")) return false;
  return canSeeMap(
    world.maps.find((m) => m.id === pin.mapId),
    role,
  );
}
export const canSeeEvent = (event, role) =>
  !!event &&
  (event.visibility === "all" ||
    (event.visibility === "dm" && role === "dm") ||
    (event.visibility === "private" && event.owner === role));
export const canEditEvent = (event, role) => !!event && event.owner === role;

export const visibleMaps = (world, role) => (world?.maps ?? []).filter((m) => canSeeMap(m, role));
export const visiblePins = (world, role, mapId) =>
  (world?.pins ?? []).filter((p) => (!mapId || p.mapId === mapId) && canSeePin(world, p, role));
export const visibleEvents = (world, role) =>
  (world?.events ?? []).filter((e) => canSeeEvent(e, role));

export function rootMap(world, role) {
  const maps = visibleMaps(world, role);
  return maps.find((m) => m.id === world?.rootMapId) ?? maps[0] ?? null;
}
/** A visible pin on a visible map that opens this map (LegendKeeper nesting). */
export function parentPin(world, mapId, role) {
  return (
    (world?.pins ?? []).find((p) => p.childMapId === mapId && canSeePin(world, p, role)) ?? null
  );
}
/** Breadcrumb from the top map to this one, following visible linking pins. */
export function mapTrail(world, mapId, role) {
  const trail = [];
  const seen = new Set();
  let map = world.maps.find((m) => m.id === mapId);
  while (map && !seen.has(map.id)) {
    seen.add(map.id);
    trail.unshift({ map, via: null });
    const via = parentPin(world, map.id, role);
    if (!via) break;
    trail[0].via = via;
    map = world.maps.find((m) => m.id === via.mapId);
  }
  return trail;
}
/** Maps whose chain of linking pins leads down to `mapId` (to prevent cycles). */
function ancestors(world, mapId) {
  const out = new Set();
  const walk = (id) => {
    for (const p of world.pins.filter((pin) => pin.childMapId === id))
      if (!out.has(p.mapId)) {
        out.add(p.mapId);
        walk(p.mapId);
      }
  };
  walk(mapId);
  return out;
}

export function eventsForPin(world, pinId, role) {
  const cal = world.calendar;
  return visibleEvents(world, role)
    .filter((e) => e.pinId === pinId && C.validDate(cal, e.date))
    .sort((a, b) => C.absSeconds(cal, a.date, a.time) - C.absSeconds(cal, b.date, b.time));
}
export const pinsForEntry = (world, entryId, role) =>
  (world?.pins ?? []).filter((p) => p.entryId === entryId && canSeePin(world, p, role));

/** Everyone who reads the event and is a reminder recipient, with when they could see it. */
function readersSince(event, role) {
  if (!canSeeEvent(event, role)) return null;
  if (event.reminder?.audience === "owner" && event.owner !== role) return null;
  return event.owner === role ? null : (event.openedAt ?? null);
}
/** Reminders the reader received because the game time reached them. */
export function dueReminders(world, role, nowAbs) {
  const out = [];
  for (const event of visibleEvents(world, role)) {
    if (!event.reminder) continue;
    if (event.reminder.audience === "owner" && event.owner !== role) continue;
    const fired = C.firedReminder(world.calendar, event, nowAbs, readersSince(event, role));
    if (fired) out.push({ event, ...fired, key: `${event.id}@${fired.day}` });
  }
  return out.sort((a, b) => a.start - b.start);
}
/** Next visible occurrences from now on (a recurring event only once). */
export function upcoming(world, role, nowAbs, limit = 5, horizonDays = 3000) {
  const today = Math.floor(nowAbs / C.DAY);
  const rows = [];
  for (const event of visibleEvents(world, role)) {
    const day = C.occurrences(world.calendar, event, today, today + horizonDays).find(
      (d) => C.occurrenceStart(event, d) + (event.time ? 0 : C.DAY - 1) >= nowAbs,
    );
    if (day !== undefined) rows.push({ event, day, start: C.occurrenceStart(event, day) });
  }
  return rows.sort((a, b) => a.start - b.start).slice(0, limit);
}
export function eventsOnDay(world, role, day) {
  return visibleEvents(world, role)
    .filter((e) => C.occurrences(world.calendar, e, day, day).length)
    .sort((a, b) => C.timeSeconds(a.time) - C.timeSeconds(b.time));
}

export function searchWorld(world, role, query) {
  const q = String(query ?? "")
    .trim()
    .toLowerCase();
  if (!world || q.length < 2) return [];
  const hit = (...values) =>
    values.some((v) =>
      String(v ?? "")
        .toLowerCase()
        .includes(q),
    );
  const out = [];
  for (const map of visibleMaps(world, role))
    if (hit(map.name)) out.push({ kind: "map", id: map.id, title: map.name, mapId: map.id });
  for (const pin of visiblePins(world, role))
    if (hit(pin.name, pin.description))
      out.push({
        kind: "pin",
        id: pin.id,
        title: pin.name,
        mapId: pin.mapId,
        excerpt: pin.description,
      });
  for (const event of visibleEvents(world, role))
    if (hit(event.title, event.description))
      out.push({ kind: "event", id: event.id, title: event.title, excerpt: event.description });
  return out.slice(0, 20);
}

// ------------------------------------------------------------------ commands
const requireDm = (role) => {
  if (role !== "dm")
    throw fail(
      "Solo il DM modifica mappe e calendario.",
      "Only the DM edits maps and the calendar.",
    );
};
const getMap = (world, id) => {
  const map = world.maps.find((m) => m.id === id);
  if (!map) throw fail("Mappa non disponibile.", "Map unavailable.");
  return map;
};
const getPin = (world, id) => {
  const pin = world.pins.find((p) => p.id === id);
  if (!pin) throw fail("Spillo non disponibile.", "Pin unavailable.");
  return pin;
};
const getEvent = (world, id, role) => {
  const event = world.events.find((e) => e.id === id);
  if (!event || !canSeeEvent(event, role))
    throw fail("Evento non disponibile.", "Event unavailable.");
  return event;
};
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function checkPinInput(world, input, pinId = null) {
  if (!name(input.name, 80))
    throw fail(
      "Dai un nome allo spillo (massimo 80 caratteri).",
      "Name the pin (80 characters at most).",
    );
  if (!world.groups.some((g) => g.id === input.groupId))
    throw fail("Scegli un gruppo esistente.", "Choose an existing group.");
  if (!["all", "dm"].includes(input.visibility))
    throw fail("Visibilità non valida.", "Invalid visibility.");
  if (!str(input.description ?? "", 2000))
    throw fail("La descrizione supera 2000 caratteri.", "The description exceeds 2000 characters.");
  if (input.childMapId) {
    const own = pinId ? getPin(world, pinId).mapId : input.mapId;
    getMap(world, input.childMapId);
    if (input.childMapId === own || ancestors(world, own).has(input.childMapId))
      throw fail(
        "Uno spillo non può aprire la sua mappa o una mappa che la contiene.",
        "A pin cannot open its own map or a map that contains it.",
      );
  }
}
export function createPin(world, role, input) {
  requireDm(role);
  const map = getMap(world, input.mapId);
  checkPinInput(world, input);
  const pin = {
    id: newId("pin"),
    mapId: map.id,
    x: clamp(Math.round(Number(input.x) || 0), 0, map.width),
    y: clamp(Math.round(Number(input.y) || 0), 0, map.height),
    name: input.name.trim(),
    groupId: input.groupId,
    visibility: input.visibility,
    entryId: input.entryId || null,
    childMapId: input.childMapId || null,
    sceneId: input.sceneId || null,
    description: (input.description ?? "").trim(),
  };
  world.pins.push(pin);
  return pin;
}
export function updatePin(world, role, id, input) {
  requireDm(role);
  const pin = getPin(world, id);
  const map = getMap(world, pin.mapId);
  checkPinInput(world, { ...pin, ...input }, id);
  Object.assign(pin, {
    name: input.name.trim(),
    groupId: input.groupId,
    visibility: input.visibility,
    description: (input.description ?? "").trim(),
    entryId: input.entryId || null,
    childMapId: input.childMapId || null,
    sceneId: input.sceneId === undefined ? pin.sceneId : input.sceneId || null,
    x: input.x === undefined ? pin.x : clamp(Math.round(Number(input.x) || 0), 0, map.width),
    y: input.y === undefined ? pin.y : clamp(Math.round(Number(input.y) || 0), 0, map.height),
  });
  return pin;
}
export function movePin(world, role, id, x, y) {
  requireDm(role);
  const pin = getPin(world, id);
  const map = getMap(world, pin.mapId);
  if (!Number.isFinite(x) || !Number.isFinite(y))
    throw fail("Posizione non valida.", "Invalid position.");
  pin.x = clamp(Math.round(x), 0, map.width);
  pin.y = clamp(Math.round(y), 0, map.height);
  return pin;
}
export function duplicatePin(world, role, id) {
  requireDm(role);
  const pin = getPin(world, id);
  const map = getMap(world, pin.mapId);
  const copy = {
    ...clone(pin),
    id: newId("pin"),
    name: `${pin.name} (copia)`.slice(0, 80),
    x: clamp(pin.x + 30, 0, map.width),
    y: clamp(pin.y + 30, 0, map.height),
    entryId: null,
    childMapId: null,
  };
  world.pins.push(copy);
  return copy;
}
export function deletePin(world, role, id) {
  requireDm(role);
  getPin(world, id);
  world.pins = world.pins.filter((p) => p.id !== id);
  for (const event of world.events) if (event.pinId === id) event.pinId = null;
}
export function setPinVisibility(world, role, id, visibility) {
  requireDm(role);
  if (!["all", "dm"].includes(visibility))
    throw fail("Visibilità non valida.", "Invalid visibility.");
  getPin(world, id).visibility = visibility;
}
export function linkPinEntry(world, role, id, entryId) {
  requireDm(role);
  getPin(world, id).entryId = entryId || null;
}

function checkMapInput(input) {
  if (!name(input.name, 80))
    throw fail(
      "Dai un nome alla mappa (massimo 80 caratteri).",
      "Name the map (80 characters at most).",
    );
  if (!(Number.isFinite(input.widthKm) && input.widthKm > 0 && input.widthKm <= 100000))
    throw fail(
      "Indica la larghezza reale della mappa (più di 0 e fino a 100000 km).",
      "Enter the map’s real width (more than 0, up to 100000 km).",
    );
  if (!["all", "dm"].includes(input.visibility))
    throw fail("Visibilità non valida.", "Invalid visibility.");
  if (input.background) {
    if (!/^data:image\/(png|jpeg|webp);base64,/.test(input.background))
      throw fail("Usa un’immagine PNG, JPEG o WebP.", "Use a PNG, JPEG or WebP image.");
    if (input.background.length > MAX_BACKGROUND_URL)
      throw fail("L’immagine supera 2 MB.", "The image exceeds 2 MB.");
  } else if (!ARTS.includes(input.art)) throw fail("Scegli uno sfondo.", "Choose a background.");
}
export function createMap(world, role, input) {
  requireDm(role);
  checkMapInput(input);
  const width = Number(input.width) || 1000,
    height = Number(input.height) || 700;
  const map = {
    id: newId("map"),
    name: input.name.trim(),
    width,
    height,
    kmPerUnit: input.widthKm / width,
    art: input.background ? "parchment" : input.art,
    background: input.background || null,
    visibility: input.visibility,
  };
  world.maps.push(map);
  if (input.fromPinId) {
    const pin = getPin(world, input.fromPinId);
    if (pin.childMapId)
      throw fail("Questo spillo apre già una mappa.", "This pin already opens a map.");
    pin.childMapId = map.id;
  }
  if (!world.rootMapId) world.rootMapId = map.id;
  return map;
}
export function updateMap(world, role, id, input) {
  requireDm(role);
  const map = getMap(world, id);
  checkMapInput({ ...input, art: input.art ?? map.art });
  Object.assign(map, {
    name: input.name.trim(),
    kmPerUnit: input.widthKm / map.width,
    visibility: input.visibility,
    art: input.background ? map.art : (input.art ?? map.art),
    background: input.background === undefined ? map.background : input.background || null,
  });
  return map;
}
export function setRootMap(world, role, id) {
  requireDm(role);
  const map = getMap(world, id);
  if (map.visibility !== "all")
    throw fail(
      "La mappa principale deve essere visibile a tutti.",
      "The main map must be visible to everyone.",
    );
  world.rootMapId = id;
}
export function deleteMap(world, role, id) {
  requireDm(role);
  getMap(world, id);
  if (world.rootMapId === id && world.maps.length > 1)
    throw fail("Scegli prima un’altra mappa principale.", "Choose another main map first.");
  const removed = new Set(world.pins.filter((p) => p.mapId === id).map((p) => p.id));
  world.maps = world.maps.filter((m) => m.id !== id);
  world.pins = world.pins.filter((p) => p.mapId !== id);
  for (const pin of world.pins) if (pin.childMapId === id) pin.childMapId = null;
  for (const event of world.events) if (removed.has(event.pinId)) event.pinId = null;
  if (world.rootMapId === id) world.rootMapId = world.maps[0]?.id ?? null;
}

export function saveGroups(world, role, groups) {
  requireDm(role);
  if (!Array.isArray(groups) || !groups.length || groups.length > 20)
    throw fail("Servono da 1 a 20 gruppi.", "Use 1 to 20 groups.");
  for (const g of groups)
    if (!name(g.name, 40) || !/^#[0-9a-f]{6}$/i.test(g.color ?? ""))
      throw fail("Ogni gruppo ha un nome e un colore.", "Each group has a name and a colour.");
  const kept = new Set(groups.filter((g) => g.id).map((g) => g.id));
  const orphan = world.pins.find((p) => !kept.has(p.groupId));
  if (orphan)
    throw fail(
      `Il gruppo di «${orphan.name}» è ancora in uso: sposta prima i suoi spilli.`,
      `The group of “${orphan.name}” is still in use: move its pins first.`,
    );
  world.groups = groups.map((g) => ({
    id: g.id && idOk(g.id) ? g.id : newId("grp"),
    name: g.name.trim(),
    color: g.color.toLowerCase(),
  }));
}

// Events ---------------------------------------------------------------------------------
function checkEventInput(world, role, input) {
  const cal = world.calendar;
  if (!name(input.title, 120))
    throw fail(
      "Dai un titolo all’evento (massimo 120 caratteri).",
      "Give the event a title (120 characters at most).",
    );
  if (!C.validDate(cal, input.date))
    throw fail(
      "Questa data non esiste nel calendario.",
      "This date does not exist in the calendar.",
    );
  if (!C.validTime(input.time ?? null)) throw fail("Orario non valido.", "Invalid time.");
  if (!C.RECURRENCES.includes(input.recurrence ?? "none"))
    throw fail("Ricorrenza non valida.", "Invalid recurrence.");
  const allowed = role === "dm" ? ["all", "dm"] : ["all", "private"];
  if (!allowed.includes(input.visibility))
    throw fail("Visibilità non valida.", "Invalid visibility.");
  if (
    input.pinId &&
    !canSeePin(
      world,
      world.pins.find((p) => p.id === input.pinId),
      role,
    )
  )
    throw fail("Luogo non disponibile.", "Place unavailable.");
  if (
    input.reminder &&
    (!C.LEADS.includes(input.reminder.leadDays) ||
      !["viewers", "owner"].includes(input.reminder.audience))
  )
    throw fail("Promemoria non valido.", "Invalid reminder.");
  if (!str(input.description ?? "", 2000))
    throw fail("La descrizione supera 2000 caratteri.", "The description exceeds 2000 characters.");
}
export function createEvent(world, role, input, nowAbs) {
  checkEventInput(world, role, input);
  const event = {
    id: newId("ev"),
    title: input.title.trim(),
    description: (input.description ?? "").trim(),
    date: { year: input.date.year, month: input.date.month, day: input.date.day },
    time: input.time ? { hour: input.time.hour, minute: input.time.minute } : null,
    recurrence: input.recurrence ?? "none",
    visibility: input.visibility,
    owner: role,
    pinId: input.pinId || null,
    reminder: input.reminder ? { ...input.reminder, armedAt: nowAbs } : null,
    openedAt: input.visibility === "all" ? nowAbs : null,
    corrections: [],
  };
  world.events.push(event);
  return event;
}
const sameWhen = (a, b) =>
  a.date.year === b.date.year &&
  a.date.month === b.date.month &&
  a.date.day === b.date.day &&
  JSON.stringify(a.time ?? null) === JSON.stringify(b.time ?? null) &&
  (a.recurrence ?? "none") === (b.recurrence ?? "none");
/**
 * Editing a date others can already read is a correction: it needs a reason, kept with
 * the event and shown to its readers.
 */
export function needsReason(event, input) {
  return event.visibility === "all" && !sameWhen(event, input);
}
export function updateEvent(world, role, id, input, nowAbs) {
  const event = getEvent(world, id, role);
  if (!canEditEvent(event, role))
    throw fail(
      "Solo chi ha creato l’evento può modificarlo.",
      "Only the event’s author can edit it.",
    );
  checkEventInput(world, role, input);
  const reason = String(input.reason ?? "").trim();
  if (needsReason(event, input) && !reason)
    throw fail(
      "Chi legge l’evento vede già questa data: scrivi il motivo della correzione.",
      "Readers already see this date: write the reason for the correction.",
    );
  if (!str(reason, 300))
    throw fail("Il motivo supera 300 caratteri.", "The reason exceeds 300 characters.");
  if (!sameWhen(event, input))
    event.corrections.push({
      at: nowAbs,
      by: role,
      reason,
      from: { date: clone(event.date), time: clone(event.time) },
      to: { date: clone(input.date), time: clone(input.time ?? null) },
    });
  const whenChanged = !sameWhen(event, input);
  const reminderChanged =
    JSON.stringify(event.reminder && { l: event.reminder.leadDays, a: event.reminder.audience }) !==
    JSON.stringify(input.reminder && { l: input.reminder.leadDays, a: input.reminder.audience });
  if (event.visibility !== "all" && input.visibility === "all") event.openedAt = nowAbs;
  Object.assign(event, {
    title: input.title.trim(),
    description: (input.description ?? "").trim(),
    date: { year: input.date.year, month: input.date.month, day: input.date.day },
    time: input.time ? { hour: input.time.hour, minute: input.time.minute } : null,
    recurrence: input.recurrence ?? "none",
    visibility: input.visibility,
    pinId: input.pinId || null,
    reminder: input.reminder
      ? {
          ...input.reminder,
          armedAt:
            whenChanged || reminderChanged || !event.reminder ? nowAbs : event.reminder.armedAt,
        }
      : null,
  });
  return event;
}
export function deleteEvent(world, role, id) {
  const event = getEvent(world, id, role);
  if (!canEditEvent(event, role))
    throw fail(
      "Solo chi ha creato l’evento può eliminarlo.",
      "Only the event’s author can delete it.",
    );
  world.events = world.events.filter((e) => e.id !== id);
}
/** Calendaria: a hidden note becomes visible; readers' reminders start from here. */
export function revealEvent(world, role, id, nowAbs) {
  requireDm(role);
  const event = getEvent(world, id, role);
  if (event.owner !== "dm" || event.visibility !== "dm")
    throw fail("Questo evento è già visibile.", "This event is already visible.");
  event.visibility = "all";
  event.openedAt = nowAbs;
}
export function hideEvent(world, role, id) {
  requireDm(role);
  const event = getEvent(world, id, role);
  if (event.owner !== "dm" || event.visibility !== "all")
    throw fail("Questo evento è già nascosto.", "This event is already hidden.");
  event.visibility = "dm";
  event.openedAt = null;
}

// Calendar and eras ------------------------------------------------------------------------
// Every stored event date, named only for a reader who may read that event: a player's
// "Solo io" event reaches the DM's refusal as a count, never with its title (B42 review).
const datedRows = (world, role) =>
  world.events.map((e) => ({ label: canSeeEvent(e, role) ? e.title : null, date: e.date }));
/**
 * Instants stored with events are absolute seconds of the calendar (start date + campaign
 * clock). When the months or the start date change, they keep their place on the clock,
 * like "now": nothing fires or stops firing because the calendar was edited (B42 review).
 */
function rebaseInstants(world, shift) {
  if (!shift) return;
  const move = (v) => (Number.isFinite(v) ? v + shift : v);
  for (const event of world.events) {
    if (event.reminder) event.reminder.armedAt = move(event.reminder.armedAt);
    event.openedAt = move(event.openedAt);
    for (const c of event.corrections ?? []) c.at = move(c.at);
  }
  for (const c of world.calendar.corrections ?? []) c.at = move(c.at);
}
export function saveCalendar(world, role, next, { reason = "", nowAbs = 0 } = {}) {
  requireDm(role);
  const cal = clone(next);
  cal.eras = clone(world.calendar.eras);
  cal.corrections = clone(world.calendar.corrections ?? []);
  cal.months = (cal.months ?? []).map((m) => ({
    ...m,
    id: m.id && idOk(m.id) ? m.id : newId("mo"),
  }));
  const errors = C.validateCalendar(cal, datedRows(world, role));
  if (errors.length) throw fail(errors[0].it, errors[0].en);
  const prior = world.calendar.epoch;
  const moved = ["year", "month", "day", "hour", "minute"].some((k) => prior[k] !== cal.epoch[k]);
  const text = String(reason ?? "").trim();
  if (moved && !text)
    throw fail(
      "Cambiare la data d’inizio sposta la data di oggi: scrivi il motivo.",
      "Changing the start date moves today’s date: write the reason.",
    );
  if (moved)
    cal.corrections.push({
      at: nowAbs,
      by: role,
      reason: text.slice(0, 300),
      from: clone(prior),
      to: clone(cal.epoch),
    });
  const shift = C.epochSeconds(cal) - C.epochSeconds(world.calendar);
  world.calendar = cal;
  rebaseInstants(world, shift);
}
export function saveEras(world, role, eras) {
  requireDm(role);
  const cal = {
    ...clone(world.calendar),
    eras: eras.map((e) => ({ ...e, id: e.id && idOk(e.id) ? e.id : newId("era") })),
  };
  const errors = C.validateCalendar(cal, datedRows(world, role));
  if (errors.length) throw fail(errors[0].it, errors[0].en);
  if (new Set(cal.eras.map((e) => e.startYear)).size !== cal.eras.length)
    throw fail(
      "Due ere non possono iniziare nello stesso anno.",
      "Two eras cannot start in the same year.",
    );
  world.calendar.eras = cal.eras;
}

/** Chronicle view: visible events grouped by era, oldest first (Kanka/LegendKeeper). */
export function chronicle(world, role, { pinId = "" } = {}) {
  const cal = world.calendar;
  const events = visibleEvents(world, role)
    .filter((e) => C.validDate(cal, e.date) && (!pinId || e.pinId === pinId))
    .sort((a, b) => C.absSeconds(cal, a.date, a.time) - C.absSeconds(cal, b.date, b.time));
  const eras = [...(cal.eras ?? [])].sort((a, b) => a.startYear - b.startYear);
  const groups = eras.map((era, i) => ({
    era,
    endYear: eras[i + 1] ? eras[i + 1].startYear - 1 : null,
    events: [],
  }));
  const before = { era: null, endYear: eras[0] ? eras[0].startYear - 1 : null, events: [] };
  for (const event of events) {
    const group = [...groups].reverse().find((g) => g.era.startYear <= event.date.year) ?? before;
    group.events.push(event);
  }
  return [...(before.events.length ? [before] : []), ...groups];
}
