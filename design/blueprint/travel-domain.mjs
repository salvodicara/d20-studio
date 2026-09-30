// B45 — Exploration, travel and camp: pure domain (no DOM).
//
// Adopted patterns (census IDs, changes/interview-01/market-census/*.md):
// - Fantasy Grounds Party Sheet › Order: numbered watch order and a formation grid filled
//   by dragging portraits, 1/2/3-column quick fill and facing; the party is placed on a
//   map keeping that formation (R20-080, R20-158).
// - BG3 party chain and "Group All" (CRP-123): one command gathers every party member.
// - Roll20 "Place Party Here" (R20-064): the party assembles at the chosen map point.
// - Solasta II travel (CRP-065/067): pace choice, travel that spends time, biome events
//   proposed to the host, some resolved with checks; dnd5e group actor travel skills that
//   account for pace (FVT-050).
// - Simple Weather (FVT-064): daily weather by climate and season, GM-only or public,
//   rule text per condition; Owlbear Weather overlay (VTL-181) for the map layer.
// - Rest Recovery food and water (FVT-033) with Solasta rations (CRP-066): consumption is
//   proposed and each owner consents; a shortage warns, never applies Exhaustion.
// - Fantasy Grounds LIGHT effect that follows the actor (R20-121) and BG3 light source
//   tooltip (CRP-147): a torch burns on the game clock and warns before going out.
// - BG3 Search (CRP-133): the result lists what was found, containers with their state.
//
// Rules (D&D 2024, SRD 5.2.1 EN/IT, PDF pages): Marching Order, Travel Pace and Finding
// Hidden Objects (EN 12, IT 12–13); Travel Terrain, Good Roads, Slower Travelers and
// Extended Travel (EN 192, IT 220); Environmental Effects (EN 195, IT 223); Obscured
// areas (EN 11, IT 12); Long Rest (EN 185, IT 213); Malnutrition (EN 185, IT 209);
// Dehydration (EN 181, IT 207); Search action (EN 187, IT 212); Torch (EN 100, IT 113);
// Rations (EN 99, IT 112) counted in days (Explorer's Pack, EN 97, IT 109).
// Event and weather tables are authored demo content, labelled as such; the DCs they
// quote come from the SRD Travel Terrain table. Visibility is a local projection by
// identity: no backend security is implied.

import { PACES, PACE_EFFECTS, TERRAINS, KM_PER_MILE } from "./world-map-domain.mjs";
import * as C from "./world-calendar.mjs";
import { advanceGameTime } from "./rest-time.mjs";
import { canControlActor, canViewActor } from "./character-access.mjs";
import { campaignMembers, isCampaignMember } from "./campaign-content.mjs";
import { partyMembers, giveItemToActor, itemFromCatalog } from "./party-stash.mjs";
import { getConditionMechanics } from "./conditions.mjs";
import { getEffectiveActor } from "./forms-companions.mjs";
import { classes as CLASSES } from "./character-rules.mjs";

export { PACES, PACE_EFFECTS, TERRAINS, KM_PER_MILE };
export const ID = "travel";
export const ROLLS = "travel-rolls";
export const VERSION = 1;
export const HOUR = 3600;
export const DAY = 86400;
const L = (it, en) => ({ it, en });
const copy = (value) => structuredClone(value);
const object = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const int = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
export const newId = (prefix) =>
  `${prefix}-${(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(16).slice(2)).replace(/-/g, "").slice(0, 12)}`;
/** A refusal the UI shows as it is (Italian and English). */
export function fail(it, en) {
  return Object.assign(new Error(it), { it, en });
}
export const pick = (value, lang) =>
  value && typeof value === "object" ? (value[lang] ?? value.it ?? value.en ?? "") : (value ?? "");

// ------------------------------------------------------------------ sources
const srd = (en, it) => ({
  kind: "srd",
  edition: "2024",
  revision: "5.2.1",
  en: {
    url: "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf",
    pages: en,
  },
  it: {
    url: "https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf",
    pages: it,
  },
});
export const SOURCES = Object.freeze({
  marching: srd([12], [12]),
  pace: srd([12], [13]),
  hidden: srd([12], [13]),
  terrain: srd([192], [220]),
  environment: srd([195], [223]),
  obscured: srd([11], [12]),
  longRest: srd([185], [213]),
  malnutrition: srd([185], [209]),
  dehydration: srd([181], [207]),
  rations: srd([97, 99], [109, 112]),
  search: srd([187], [212]),
  torch: srd([100], [113]),
  passive: srd([22], [24]),
  exhaustion: srd([181], [208]),
});
const authored = (revision, it, en) => ({ kind: "authored", edition: "2024", revision, it, en });
export const AUTHORED = Object.freeze({
  events: authored(
    "b45-travel-events-1",
    "Tabella dimostrativa degli eventi di viaggio (contenuto originale)",
    "Demo travel event table (original content)",
  ),
  weather: authored(
    "b45-weather-1",
    "Tabella dimostrativa del meteo per clima e stagione (contenuto originale)",
    "Demo weather table by climate and season (original content)",
  ),
  camp: authored(
    "b45-camp-events-1",
    "Tabella dimostrativa degli eventi dell’accampamento (contenuto originale)",
    "Demo camp event table (original content)",
  ),
  radius: authored(
    "b45-search-radius-1",
    "Raggio di ricerca del tavolo: 4,5 m attorno alla pedina",
    "Table search radius: 4.5 m around the token",
  ),
});

// ------------------------------------------------------------------ campaign and roles
export const campaignIdOf = (state) => state?.campaign?.id ?? null;
export const isDm = (state, role, cid = campaignIdOf(state)) =>
  campaignMembers(state, cid).some(
    (member) => member.id === role && (member.role === "dm" || member.role === "co-dm"),
  );
export const isMember = (state, role, cid = campaignIdOf(state)) =>
  isCampaignMember(state, cid, role);
function requireMember(state, role) {
  if (!isMember(state, role))
    throw fail(
      "Solo i membri della campagna usano viaggio e accampamento.",
      "Only campaign members use travel and camp.",
    );
}
function requireDm(state, role) {
  if (!isDm(state, role)) throw fail("Solo il DM può farlo.", "Only the DM can do this.");
}
/** Party characters of the campaign in play (the same list as the party stash, B26). */
export const members = (state) => partyMembers(state);
export const memberIds = (state) => members(state).map((actor) => actor.id);
function requireControl(state, actorId, role) {
  const actor = state.actors?.[actorId];
  if (!actor || !memberIds(state).includes(actorId))
    throw fail(
      "Il personaggio non fa parte del gruppo della campagna.",
      "The character is not in the campaign party.",
    );
  if (!canControlActor(actor, role, state))
    throw fail("Non controlli questo personaggio.", "You do not control this character.");
  return actor;
}

// ------------------------------------------------------------------ slice
export const FORMATION_COLS = 3;
export const FORMATION_ROWS = 4;
export const FACINGS = Object.freeze(["north", "east", "south", "west"]);
export function emptyFormation() {
  return {
    cols: FORMATION_COLS,
    rows: FORMATION_ROWS,
    facing: "north",
    cells: Array(FORMATION_COLS * FORMATION_ROWS).fill(null),
  };
}
export const SHIFTS = 4;
export function emptyCampaign() {
  return {
    formation: emptyFormation(),
    journey: null,
    events: [],
    weather: { climate: "temperate", season: null, days: {} },
    provisions: { days: {} },
    watch: { shifts: Array.from({ length: SHIFTS }, () => []) },
    camp: null,
    lights: [],
    checks: [],
    searches: [],
  };
}
// Synthetic, coherent with the demo: Doran leads in the courtyard, Livia and Mira follow;
// the party is ready to leave the observatory for Porto Grigio by the coast road (World
// map B42: Vecchio osservatorio → Ponte di pietra → Porto Grigio, about 143 km of hills).
function seedLanterns() {
  const c = emptyCampaign();
  c.formation.cells[1] = "doran";
  c.formation.cells[3] = "livia";
  c.formation.cells[5] = "mira";
  c.journey = {
    id: "journey-porto-grigio",
    from: "Vecchio osservatorio",
    to: "Porto Grigio",
    km: 143,
    travelledKm: 0,
    terrain: "hill",
    road: true,
    pace: "normal",
    status: "underway",
    hoursByDay: {},
    log: [],
  };
  c.watch.shifts = [["doran"], ["mira"], ["livia"], []];
  return c;
}
const rations = (quantity) => ({ srdId: "srd2024:item:rations", quantity });
const torch = (quantity) => ({ srdId: "srd2024:item:torch", quantity });
const rope = (quantity) => ({ srdId: "srd2024:item:rope", quantity });
// Search points of the observatory courtyard (scene "old-watch", 50 px = 1.5 m).
export function seedPoints() {
  const point = (id, kind, x, y, name, dc, items, note) => ({
    id,
    kind,
    x,
    y,
    name,
    dc,
    items,
    note,
    found: dc === null,
    foundBy: null,
  });
  return {
    "old-watch": [
      point(
        "crate",
        "container",
        300,
        310,
        L("Cassa sfondata", "Broken crate"),
        null,
        [],
        L("Qualcuno l’ha già svuotata.", "Someone already emptied it."),
      ),
      point(
        "niche",
        "hidden",
        195,
        430,
        L("Nicchia sotto il gradino", "Niche under the step"),
        13,
        [rations(2), torch(1)],
        L("Una scorta nascosta dal vecchio custode.", "A cache hidden by the old keeper."),
      ),
      point(
        "barrel",
        "container",
        560,
        480,
        L("Barile dell’acqua piovana", "Rain barrel"),
        null,
        [],
        L("Asciutto, con il fondo crepato.", "Dry, with a cracked bottom."),
      ),
      point(
        "drag-marks",
        "trace",
        700,
        300,
        L("Segni di trascinamento", "Drag marks"),
        12,
        [],
        L("Portano al cancello a est.", "They lead to the east gate."),
      ),
      point(
        "sentry-pack",
        "hidden",
        650,
        215,
        L("Fagotto della sentinella", "Sentry’s bundle"),
        15,
        [rope(1), rations(1)],
        L("Legato sotto l’impalcatura.", "Tied under the scaffolding."),
      ),
    ],
  };
}
export function seedSlice() {
  return { campaigns: { lanterns: seedLanterns() }, points: seedPoints() };
}
export function normalizeSlice(slice, fromVersion) {
  if (fromVersion > VERSION) throw Error("Travel data from a newer version");
  const next = object(slice) ? slice : {};
  if (!object(next.campaigns)) next.campaigns = {};
  if (!object(next.points)) next.points = {};
  for (const [id, c] of Object.entries(next.campaigns)) {
    if (!object(c)) {
      delete next.campaigns[id];
      continue;
    }
    const base = emptyCampaign();
    for (const key of Object.keys(base)) if (c[key] === undefined) c[key] = base[key];
    for (const key of ["events", "lights", "checks", "searches"])
      if (!Array.isArray(c[key])) c[key] = [];
    if (!object(c.formation) || !Array.isArray(c.formation.cells)) c.formation = emptyFormation();
    if (!object(c.weather?.days)) c.weather = base.weather;
    if (!object(c.provisions?.days)) c.provisions = base.provisions;
    if (!Array.isArray(c.watch?.shifts)) c.watch = base.watch;
  }
  for (const [id, list] of Object.entries(next.points))
    if (!Array.isArray(list)) delete next.points[id];
  return next;
}
export const seedRolls = () => ({ rolls: [] });
export function normalizeRolls(slice, fromVersion) {
  if (fromVersion > VERSION) throw Error("Travel roll data from a newer version");
  return { rolls: Array.isArray(slice?.rolls) ? slice.rolls : [] };
}
/** The campaign record inside a slice (created in a draft when missing). */
export function ensureCampaign(slice, cid) {
  if (!cid) throw fail("Nessuna campagna aperta.", "No campaign is open.");
  slice.campaigns ??= {};
  return (slice.campaigns[cid] ??= emptyCampaign());
}
export const campaignOf = (slice, cid) => slice?.campaigns?.[cid] ?? null;

// ------------------------------------------------------------------ clock and days
export const clockSeconds = (state, cid = campaignIdOf(state)) =>
  Number(state?.restTime?.clocks?.[cid]?.seconds) || 0;
const worldCalendar = (state, cid) => state?.ext?.["world-map"]?.campaigns?.[cid]?.calendar ?? null;
/**
 * "Now" on the shared clock: the World calendar date when B42 keeps one (the same date
 * the World tab shows), otherwise the day count since the clock started.
 */
export function now(state, cid = campaignIdOf(state), seconds = clockSeconds(state, cid)) {
  const cal = worldCalendar(state, cid);
  if (cal) {
    try {
      const at = C.nowFromClock(cal, seconds);
      return {
        seconds,
        day: at.absDay,
        hour: at.hour,
        minute: at.minute,
        date: C.formatDate(cal, at.date),
        season: C.seasonOf(cal, at.date.month)?.id ?? null,
        calendar: true,
      };
    } catch {
      /* an invalid calendar falls back to the day count */
    }
  }
  const day = Math.floor(seconds / DAY);
  return {
    seconds,
    day,
    hour: Math.floor((seconds % DAY) / HOUR),
    minute: Math.floor((seconds % HOUR) / 60),
    date: null,
    dayNumber: day + 1,
    season: null,
    calendar: false,
  };
}
export const timeText = (at) => `${C.pad2(at.hour)}:${C.pad2(at.minute)}`;
export function durationParts(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return { hours: Math.floor(s / HOUR), minutes: Math.floor((s % HOUR) / 60) };
}

// ------------------------------------------------------------------ formation (FG, BG3)
const cellOf = (formation, actorId) => formation.cells.indexOf(actorId);
export function formationMembers(formation) {
  return formation.cells.filter(Boolean);
}
/** Ranks front to back: [[actorId…], …] (the SRD marching order as rows). */
export function marchingOrder(formation) {
  const ranks = [];
  for (let r = 0; r < formation.rows; r++) {
    const rank = formation.cells
      .slice(r * formation.cols, (r + 1) * formation.cols)
      .filter(Boolean);
    if (rank.length) ranks.push(rank);
  }
  return ranks;
}
function cleanFormation(state, formation) {
  const ids = new Set(memberIds(state));
  formation.cells = formation.cells.map((id) => (id && ids.has(id) ? id : null));
}
/** Members not in the formation, in party order. */
export function unplaced(state, formation) {
  return memberIds(state).filter((id) => !formation.cells.includes(id));
}
/** Moves (or swaps) a member into a cell; `cell` null takes the member out. */
export function moveInFormation(state, slice, { actorId, cell }, role) {
  requireMember(state, role);
  const c = ensureCampaign(slice, campaignIdOf(state));
  const f = c.formation;
  cleanFormation(state, f);
  if (!memberIds(state).includes(actorId))
    throw fail(
      "Solo i personaggi del gruppo entrano nella formazione.",
      "Only party characters join the formation.",
    );
  const from = cellOf(f, actorId);
  if (cell === null) {
    if (from < 0) throw fail("Il personaggio non è in formazione.", "The character is not placed.");
    f.cells[from] = null;
    return f;
  }
  if (!int(cell, 0, f.cells.length - 1)) throw fail("Casella non valida.", "Invalid cell.");
  const other = f.cells[cell];
  if (from >= 0) f.cells[from] = other ?? null;
  f.cells[cell] = actorId;
  return f;
}
/** FG quick fill: 1, 2 or 3 per rank, keeping the current order, then the others. */
export function quickFill(state, slice, { columns }, role) {
  requireMember(state, role);
  if (![1, 2, 3].includes(columns))
    throw fail("Scegli 1, 2 o 3 colonne.", "Choose 1, 2 or 3 columns.");
  const c = ensureCampaign(slice, campaignIdOf(state));
  const f = c.formation;
  cleanFormation(state, f);
  const order = [...formationMembers(f), ...unplaced(state, f)];
  if (order.length > f.rows * columns)
    throw fail(
      `Con ${columns} ${columns === 1 ? "colonna" : "colonne"} entrano al massimo ${f.rows * columns} personaggi.`,
      `${columns} ${columns === 1 ? "column holds" : "columns hold"} at most ${f.rows * columns} characters.`,
    );
  const slots = { 1: [1], 2: [0, 1], 3: [0, 1, 2] }[columns];
  f.cells = Array(f.cells.length).fill(null);
  order.forEach((id, i) => {
    f.cells[Math.floor(i / columns) * f.cols + slots[i % columns]] = id;
  });
  return f;
}
/** BG3 "Group All": every party member not yet placed takes the first free cell. */
export function groupAll(state, slice, role) {
  requireMember(state, role);
  const c = ensureCampaign(slice, campaignIdOf(state));
  const f = c.formation;
  cleanFormation(state, f);
  const missing = unplaced(state, f);
  if (!missing.length)
    throw fail("Tutto il gruppo è già in formazione.", "The whole party is already placed.");
  for (const id of missing) {
    const free = f.cells.indexOf(null);
    if (free < 0) throw fail("La griglia è piena.", "The grid is full.");
    f.cells[free] = id;
  }
  return missing;
}
export function rotateFormation(state, slice, { turn }, role) {
  requireMember(state, role);
  const f = ensureCampaign(slice, campaignIdOf(state)).formation;
  const i = FACINGS.indexOf(f.facing);
  f.facing = FACINGS[(i + (turn < 0 ? 3 : 1)) % 4];
  return f.facing;
}
/** Token centres for each placed member around `point`, the front rank facing `facing`. */
export function formationLayout(formation, scene, point) {
  const g = scene.gridSize || 50;
  const snap = (v) => Math.floor(v / g) * g + g / 2;
  const cx = snap(point.x),
    cy = snap(point.y);
  const out = [];
  // Whole-cell offsets keep every token on a grid cell centre (Roll20 places snapped).
  const midCol = Math.floor((formation.cols - 1) / 2);
  const ranks = formation.cells
    .map((id, i) => (id ? Math.floor(i / formation.cols) : null))
    .filter((r) => r !== null);
  const midRow = ranks.length ? Math.floor((Math.min(...ranks) + Math.max(...ranks)) / 2) : 0;
  formation.cells.forEach((actorId, i) => {
    if (!actorId) return;
    const u = (i % formation.cols) - midCol; // left → right, facing north
    const v = Math.floor(i / formation.cols) - midRow; // front rank negative
    const [dx, dy] = {
      north: [u, v],
      east: [-v, u],
      south: [-u, -v],
      west: [v, -u],
    }[formation.facing] ?? [u, v];
    const clamp = (value, max) => Math.min(Math.max(value, g / 2), max - g / 2);
    out.push({
      actorId,
      x: clamp(Math.round(cx + dx * g), scene.width || 1000),
      y: clamp(Math.round(cy + dy * g), scene.height || 650),
    });
  });
  return out;
}
/** Roll20 "Place Party Here" with the FG formation: moves or adds the party's tokens. */
export function placeParty(state, slice, { sceneId, point }, role) {
  requireDm(state, role);
  if (state.combat?.active)
    throw fail(
      "Durante il combattimento le pedine si muovono a turno: posiziona il gruppo fuori dal combattimento.",
      "During combat tokens move on their turns: place the party outside combat.",
    );
  const scene = state.scenes?.find((s) => s.id === sceneId);
  if (!scene) throw fail("La scena non esiste più.", "The scene no longer exists.");
  if (
    !object(point) ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    point.x < 0 ||
    point.y < 0 ||
    point.x > (scene.width || 1000) ||
    point.y > (scene.height || 650)
  )
    throw fail("Scegli un punto dentro la scena.", "Choose a point inside the scene.");
  const f = ensureCampaign(slice, campaignIdOf(state)).formation;
  cleanFormation(state, f);
  const layout = formationLayout(f, scene, point);
  if (!layout.length)
    throw fail(
      "La formazione è vuota: metti almeno un personaggio nella griglia.",
      "The formation is empty: put at least one character in the grid.",
    );
  scene.tokens ??= [];
  const added = [];
  for (const spot of layout) {
    let token = scene.tokens.find((t) => t.actorId === spot.actorId);
    if (!token) {
      let id = `token-${spot.actorId}`;
      while (scene.tokens.some((t) => t.id === id)) id = newId(`token-${spot.actorId}`);
      token = { id, actorId: spot.actorId, x: spot.x, y: spot.y };
      scene.tokens.push(token);
      added.push(spot.actorId);
    }
    token.x = spot.x;
    token.y = spot.y;
  }
  return { layout, added };
}

// ------------------------------------------------------------------ checks and dice
const ABILITY = Object.freeze({
  str: L("Forza", "Strength"),
  dex: L("Destrezza", "Dexterity"),
  con: L("Costituzione", "Constitution"),
  int: L("Intelligenza", "Intelligence"),
  wis: L("Saggezza", "Wisdom"),
  cha: L("Carisma", "Charisma"),
});
const SKILL = Object.freeze({
  perception: { ability: "wis", name: L("Percezione", "Perception") },
  survival: { ability: "wis", name: L("Sopravvivenza", "Survival") },
  stealth: { ability: "dex", name: L("Furtività", "Stealth") },
});
export function checkName(check) {
  if (check.save)
    return L(
      `Tiro salvezza su ${ABILITY[check.ability].it}`,
      `${ABILITY[check.ability].en} saving throw`,
    );
  const skill = SKILL[check.skill];
  return skill
    ? L(
        `${ABILITY[check.ability].it} (${skill.name.it})`,
        `${ABILITY[check.ability].en} (${skill.name.en})`,
      )
    : L(`Prova di ${ABILITY[check.ability].it}`, `${ABILITY[check.ability].en} check`);
}
const mod = (score) => Math.floor((score - 10) / 2);
export function proficiencyBonus(actor) {
  if (Number.isInteger(actor?.proficiencyBonus)) return actor.proficiencyBonus;
  if (Number.isInteger(actor?.combatProfile?.proficiencyBonus))
    return actor.combatProfile.proficiencyBonus;
  return int(actor?.level, 1, 20) ? 2 + Math.floor((actor.level - 1) / 4) : 2;
}
/**
 * The check or save bonus as the sheet records it; otherwise ability modifier plus
 * Proficiency Bonus when proficient (skill list, or the first class's saves).
 */
export function checkBonus(raw, { ability, skill = null, save = false }) {
  const actor = getEffectiveActor(raw);
  if (save) {
    const recorded = actor?.savingThrows?.[ability];
    if (Number.isFinite(recorded)) return { bonus: recorded, from: "sheet" };
    const first = actor?.buildSeed?.levelOrder?.[0] ?? actor?.buildSeed?.classes?.[0]?.classId;
    const proficient = Boolean(
      CLASSES.find((row) => row.id === first)?.savingThrows?.includes(ability),
    );
    return {
      bonus: mod(actor?.abilities?.[ability] ?? 10) + (proficient ? proficiencyBonus(actor) : 0),
      from: proficient ? "proficient" : "ability",
    };
  }
  const recorded = skill ? actor?.skillModifiers?.[skill] : null;
  if (Number.isFinite(recorded)) return { bonus: recorded, from: "sheet" };
  const proficient = Boolean(skill && (actor?.skills ?? []).includes(skill));
  return {
    bonus: mod(actor?.abilities?.[ability] ?? 10) + (proficient ? proficiencyBonus(actor) : 0),
    from: proficient ? "proficient" : "ability",
  };
}
/** Passive score = 10 + the check's bonus (SRD Passive Perception). */
export const passiveScore = (actor, check) => 10 + checkBonus(actor, check).bonus;
/** Advantage/Disadvantage from the travel pace (SRD Travel Pace effects). */
export function paceReasons(pace, check) {
  if (check.save) return [];
  const out = [];
  const perceive = ["perception", "survival"].includes(check.skill);
  if (pace === "fast" && (perceive || check.skill === "stealth"))
    out.push({ mode: "disadvantage", label: L("Passo veloce", "Fast pace"), source: SOURCES.pace });
  if (pace === "normal" && check.skill === "stealth")
    out.push({
      mode: "disadvantage",
      label: L("Passo normale", "Normal pace"),
      source: SOURCES.pace,
    });
  if (pace === "slow" && perceive)
    out.push({ mode: "advantage", label: L("Passo lento", "Slow pace"), source: SOURCES.pace });
  return out;
}
/** The roll profile of a check: bonus with its Exhaustion penalty and the d20 mode. */
export function checkProfile(state, check) {
  const raw = state.actors?.[check.actorId];
  const base = checkBonus(raw, check);
  const mech = raw ? getConditionMechanics(raw) : null;
  const reasons = [...(check.reasons ?? [])];
  if (!check.save)
    for (const r of mech?.checkDisadvantage ?? [])
      if (!r.requires)
        reasons.push({
          mode: "disadvantage",
          label: r.name ?? L("Condizione", "Condition"),
          source: null,
        });
  const penalty = mech?.d20Penalty ?? 0;
  const adv = reasons.some((r) => r.mode === "advantage"),
    dis = reasons.some((r) => r.mode === "disadvantage");
  return {
    bonus: base.bonus - penalty,
    baseBonus: base.bonus,
    penalty,
    mode: adv === dis ? "normal" : adv ? "advantage" : "disadvantage",
    reasons,
  };
}
export function newCheck(
  { id, kind, actorId, ability, skill = null, save = false, dc = null, reasons = [], context = {} },
  role,
  at,
) {
  return {
    id,
    kind,
    actorId,
    ability,
    skill,
    save,
    dc,
    reasons,
    context,
    status: "pending",
    rollId: null,
    total: null,
    success: null,
    requestedBy: role,
    at,
  };
}
const diceFor = (mode) => (mode === "normal" ? 1 : 2);
export function validFace(face, sides) {
  return Number.isInteger(face) && face >= 1 && face <= sides;
}
/**
 * Records one accepted roll in the preserved roll slice. A digital retry of the same key
 * after an Undo reuses the faces the undone roll produced, once (I-229): an Undo is never
 * a way to roll again for a better result.
 */
function acceptRoll(rolls, { key, sides, count, mode, faces, rng, applied, meta }) {
  let values;
  let reusedFrom = null;
  if (mode === "physical") {
    values = (faces ?? []).map(Number);
    if (values.length !== count || values.some((face) => !validFace(face, sides)))
      throw fail(
        `Inserisci ${count === 1 ? "la faccia" : `le ${count} facce`} del d${sides} fisico (da 1 a ${sides}).`,
        `Enter the physical d${sides} ${count === 1 ? "face" : `${count} faces`} (1 to ${sides}).`,
      );
  } else if (mode === "digital") {
    const withdrawn = rolls.rolls.find(
      (r) =>
        r.key === key &&
        r.mode === "digital" &&
        !r.reusedBy &&
        !applied.has(r.id) &&
        r.values.length === count &&
        r.sides === sides,
    );
    if (withdrawn) {
      values = [...withdrawn.values];
      reusedFrom = withdrawn.id;
    } else values = Array.from({ length: count }, () => rng(sides));
  } else throw fail("Scegli dadi digitali o fisici.", "Choose digital or physical dice.");
  const roll = {
    id: newId("roll"),
    key,
    sides,
    mode,
    values,
    reusedFrom,
    reusedBy: null,
    corrections: [],
    ...meta,
  };
  if (reusedFrom) rolls.rolls.find((r) => r.id === reusedFrom).reusedBy = roll.id;
  rolls.rolls.push(roll);
  if (rolls.rolls.length > 300) rolls.rolls.splice(0, rolls.rolls.length - 300);
  return roll;
}
/** Roll ids the snapshot slice still uses: any other roll was undone (reversed). */
export function appliedRollIds(slice) {
  const ids = new Set();
  for (const c of Object.values(slice?.campaigns ?? {})) {
    for (const check of c.checks ?? []) if (check.rollId) ids.add(check.rollId);
    for (const event of c.events ?? []) if (event.rollId) ids.add(event.rollId);
    for (const day of Object.values(c.weather?.days ?? {})) if (day.rollId) ids.add(day.rollId);
    for (const event of c.camp?.events ?? []) if (event.rollId) ids.add(event.rollId);
    for (const camp of c.campHistory ?? [])
      for (const event of camp.events ?? []) if (event.rollId) ids.add(event.rollId);
  }
  return ids;
}
/** A table draw (event, weather, camp): one die, private to the DM who rolls it. */
export function acceptTableRoll(rolls, slice, { key, sides, mode, faces, rng, label, role }) {
  const roll = acceptRoll(rolls, {
    key,
    sides,
    count: 1,
    mode,
    faces,
    rng,
    applied: appliedRollIds(slice),
    meta: { kind: "table-draw", by: role, label, visibility: "private" },
  });
  roll.total = roll.values[0];
  return roll;
}
function d20Result(values, mode) {
  return mode === "advantage"
    ? Math.max(...values)
    : mode === "disadvantage"
      ? Math.min(...values)
      : values[0];
}
const findCheck = (c, id) => {
  const check = c.checks.find((x) => x.id === id);
  if (!check) throw fail("La prova non esiste più.", "The check no longer exists.");
  return check;
};
/** Rolls a pending check for a character the viewer controls (physical or digital). */
export function rollCheck(state, slice, rolls, { checkId, mode, faces }, role, rng) {
  requireMember(state, role);
  const c = ensureCampaign(slice, campaignIdOf(state));
  const check = findCheck(c, checkId);
  if (check.status !== "pending")
    throw fail("Questa prova ha già un risultato.", "This check already has a result.");
  requireControl(state, check.actorId, role);
  const profile = checkProfile(state, check);
  const roll = acceptRoll(rolls, {
    key: `check:${check.id}`,
    sides: 20,
    count: diceFor(profile.mode),
    mode,
    faces,
    rng,
    applied: appliedRollIds(slice),
    meta: {
      kind: check.save ? "save" : "check",
      checkId: check.id,
      actorId: check.actorId,
      by: role,
      rollMode: profile.mode,
      modifier: profile.bonus,
      dc: check.dc,
      label: checkName(check),
      visibility: "shared",
    },
  });
  roll.natural = d20Result(roll.values, profile.mode);
  roll.total = roll.natural + profile.bonus;
  roll.success = check.dc === null ? null : roll.total >= check.dc;
  Object.assign(check, {
    status: "rolled",
    rollId: roll.id,
    total: roll.total,
    success: roll.success,
    mode: roll.mode,
    rollMode: profile.mode,
    natural: roll.natural,
    bonus: profile.bonus,
  });
  return { check, roll };
}
/** DM: the passive score stands in for a roll (SRD Passive Perception). */
export function usePassive(state, slice, { checkId }, role) {
  requireDm(state, role);
  const c = ensureCampaign(slice, campaignIdOf(state));
  const check = findCheck(c, checkId);
  if (check.status !== "pending")
    throw fail("Questa prova ha già un risultato.", "This check already has a result.");
  if (check.save)
    throw fail("Un tiro salvezza non ha un valore passivo.", "A save has no passive score.");
  const actor = state.actors[check.actorId];
  const profile = checkProfile(state, check);
  // A passive check changes by 5 with Advantage or Disadvantage (SRD Passive Perception).
  const shift = profile.mode === "advantage" ? 5 : profile.mode === "disadvantage" ? -5 : 0;
  const total = 10 + profile.bonus + shift;
  Object.assign(check, {
    status: "passive",
    total,
    success: check.dc === null ? null : total >= check.dc,
    passive: { base: passiveScore(actor, check), shift },
  });
  return check;
}
/** The roller corrects physical faces typed wrong, with a reason; earlier faces stay. */
export function correctCheck(state, slice, rolls, { checkId, faces, reason }, role) {
  const c = ensureCampaign(slice, campaignIdOf(state));
  const check = findCheck(c, checkId);
  const roll = rolls.rolls.find((r) => r.id === check.rollId);
  if (!roll || check.status !== "rolled")
    throw fail("Questa prova non ha un tiro da correggere.", "This check has no roll to correct.");
  if (roll.by !== role)
    throw fail("Solo chi ha tirato corregge il tiro.", "Only the roller corrects the roll.");
  if (roll.mode !== "physical")
    throw fail("Le facce digitali non si modificano.", "Digital faces cannot be edited.");
  const why = String(reason ?? "")
    .trim()
    .slice(0, 200);
  if (!why)
    throw fail("Scrivi il motivo della correzione.", "Write the reason for the correction.");
  const next = (faces ?? []).map(Number);
  if (next.length !== roll.values.length || next.some((face) => !validFace(face, 20)))
    throw fail("Inserisci ogni faccia del d20 (da 1 a 20).", "Enter every d20 face (1 to 20).");
  if (JSON.stringify(next) === JSON.stringify(roll.values))
    throw fail("Le facce sono uguali a quelle registrate.", "These faces match the recorded ones.");
  roll.corrections.push({ values: [...roll.values], total: roll.total, reason: why, by: role });
  roll.values = next;
  roll.natural = d20Result(next, roll.rollMode);
  roll.total = roll.natural + roll.modifier;
  roll.success = roll.dc === null ? null : roll.total >= roll.dc;
  Object.assign(check, {
    total: roll.total,
    success: roll.success,
    natural: roll.natural,
    corrected: why,
  });
  return { check, roll, corrected: true };
}
/** Checks this viewer may read: the DM all, a player those of the characters it sees. */
export function visibleChecks(state, c, role) {
  return (c?.checks ?? []).filter(
    (check) => isDm(state, role) || canViewActor(state.actors?.[check.actorId], role, state),
  );
}
export const pendingChecksFor = (state, c, role) =>
  (c?.checks ?? []).filter(
    (check) =>
      check.status === "pending" &&
      state.actors?.[check.actorId] &&
      canControlActor(state.actors[check.actorId], role, state),
  );

// ------------------------------------------------------------------ travel (Solasta, SRD)
export const TERRAIN_DATA = Object.freeze({
  // SRD Travel Terrain: encounter distance (feet dice), Foraging, Navigation and Search DC.
  arctic: { distance: "6d6", foraging: 20, navigation: 10, search: 10 },
  coastal: { distance: "2d10", foraging: 10, navigation: 5, search: 15 },
  desert: { distance: "6d6", foraging: 20, navigation: 10, search: 10 },
  forest: { distance: "2d8", foraging: 10, navigation: 15, search: 15 },
  grassland: { distance: "6d6", foraging: 15, navigation: 5, search: 15 },
  hill: { distance: "2d10", foraging: 15, navigation: 10, search: 15 },
  mountain: { distance: "4d10", foraging: 20, navigation: 15, search: 20 },
  swamp: { distance: "2d8", foraging: 10, navigation: 15, search: 20 },
  underdark: { distance: "2d6", foraging: 20, navigation: 10, search: 20 },
  urban: { distance: "2d6", foraging: 20, navigation: 15, search: 15 },
  waterborne: { distance: "6d6", foraging: 15, navigation: 10, search: 15 },
});
export const MAX_TRAVEL_HOURS = 12;
export const terrainOf = (id) => TERRAINS.find((t) => t.id === id) ?? null;
export const paceOf = (id) => PACES.find((p) => p.id === id) ?? null;
/** The group's current Speed situation: a member at half Speed or less forces Slow. */
export function slowerTravelers(state) {
  return members(state)
    .map((actor) => {
      const base = Number(actor.speed);
      const speed = getConditionMechanics(actor).speed;
      return Number.isFinite(base) && base > 0 && Number.isFinite(speed) && speed <= base / 2
        ? { actorId: actor.id, speed, base }
        : null;
    })
    .filter(Boolean);
}
/** Each pace with whether it is allowed now and why not (terrain, roads, slower travelers). */
export function paceOptions(state, journey) {
  const t = terrainOf(journey?.terrain);
  const max = t ? (t.max === null ? -1 : Math.min(2, t.max + (journey.road ? 1 : 0))) : 2;
  const slow = slowerTravelers(state);
  return [...PACES]
    .sort((a, b) => a.rank - b.rank)
    .map((pace) => {
      let reason = null;
      if (t?.max === null)
        reason = L(
          "Sull’acqua conta la velocità del mezzo: nessun passo.",
          "Waterborne travel uses the vessel’s speed: no pace.",
        );
      else if (pace.rank > max)
        reason = L(
          `Il terreno (${t.it}) consente al massimo il passo ${PACES.find((p) => p.rank === max)?.it.toLowerCase()}${journey.road ? " anche con la strada" : ""}.`,
          `The terrain (${t.en}) allows at most a ${PACES.find((p) => p.rank === max)?.en.toLowerCase()} pace${journey.road ? " even with the road" : ""}.`,
        );
      else if (slow.length && pace.id !== "slow") {
        const names = slow.map((s) => state.actors[s.actorId].name).join(", ");
        reason = L(
          `Il gruppo deve andare lento: ${names} ${slow.length > 1 ? "hanno" : "ha"} la Velocità dimezzata o meno.`,
          `The group must move at a Slow pace: ${names} ${slow.length > 1 ? "have" : "has"} half Speed or less.`,
        );
      }
      return { pace, allowed: !reason, reason, effect: PACE_EFFECTS[pace.id] };
    });
}
export function validateJourneyInput(input) {
  const text = (v, max = 80) =>
    String(v ?? "")
      .trim()
      .slice(0, max);
  const from = text(input.from),
    to = text(input.to),
    km = Number(input.km);
  if (!from || !to)
    throw fail("Scrivi partenza e destinazione.", "Write the start and the destination.");
  if (!Number.isFinite(km) || km < 0.5 || km > 3000)
    throw fail(
      "La distanza va da 0,5 a 3000 km.",
      "Distance ranges from 0.5 to 3000 km (0.3 to 2000 mi).",
    );
  if (!terrainOf(input.terrain)) throw fail("Scegli il terreno.", "Choose the terrain.");
  return {
    from,
    to,
    km: Math.round(km * 10) / 10,
    terrain: input.terrain,
    road: Boolean(input.road),
  };
}
export function startJourney(state, slice, input, role) {
  requireDm(state, role);
  const c = ensureCampaign(slice, campaignIdOf(state));
  if (c.journey?.status === "underway")
    throw fail(
      "C’è già un viaggio in corso: concludilo o riassumilo prima.",
      "A journey is already underway: finish or summarise it first.",
    );
  const clean = validateJourneyInput(input);
  const allowed = paceOptions(state, clean).filter((o) => o.allowed);
  if (c.journey) c.journeyHistory = [...(c.journeyHistory ?? []), c.journey].slice(-10);
  c.journey = {
    id: input.id ?? newId("journey"),
    ...clean,
    travelledKm: 0,
    pace: allowed.find((o) => o.pace.id === "normal")?.pace.id ?? allowed[0]?.pace.id ?? "slow",
    status: "underway",
    hoursByDay: {},
    log: [],
  };
  return c.journey;
}
/** DM: the journey is abandoned (kept in the history with its reason). */
export function cancelJourney(state, slice, { reason }, role) {
  requireDm(state, role);
  const c = ensureCampaign(slice, campaignIdOf(state));
  if (c.journey?.status !== "underway")
    throw fail("Nessun viaggio in corso.", "No journey underway.");
  const why = String(reason ?? "")
    .trim()
    .slice(0, 200);
  if (!why) throw fail("Scrivi il motivo.", "Write the reason.");
  c.journey.status = "cancelled";
  c.journey.reason = why;
  return c.journey;
}
export function setPace(state, slice, { pace }, role) {
  requireDm(state, role);
  const c = ensureCampaign(slice, campaignIdOf(state));
  if (c.journey?.status !== "underway")
    throw fail("Nessun viaggio in corso.", "No journey underway.");
  const option = paceOptions(state, c.journey).find((o) => o.pace.id === pace);
  if (!option) throw fail("Passo sconosciuto.", "Unknown pace.");
  if (!option.allowed) throw fail(option.reason.it, option.reason.en);
  c.journey.pace = pace;
  return pace;
}
const resting = (state, ids) =>
  (state.restTime?.rests ?? []).some((r) =>
    r.participants.some((p) => ids.includes(p.actorId) && p.status === "resting"),
  );
/** What travelling `hours` more would do now: distance, arrival, clock and Extended Travel. */
/**
 * Distance covered in a day after `h` hours: the SRD Day column for the first 8 hours,
 * the Hour column below 8 hours and for each hour beyond (the same reading as the World
 * map estimate, B42 review).
 */
export const dayKm = (pace, h) =>
  h >= TRAVEL_DAY_HOURS - 1e-9
    ? pace.kmDay + (h - TRAVEL_DAY_HOURS) * pace.kmHour
    : h * pace.kmHour;
const TRAVEL_DAY_HOURS = 8;
/** Hours after `already` needed to cover `km` (the Day column counts at the 8th hour). */
function hoursFor(pace, already, km) {
  if (already >= TRAVEL_DAY_HOURS) return km / pace.kmHour;
  const beforeEight = (TRAVEL_DAY_HOURS - already) * pace.kmHour;
  if (km <= beforeEight + 1e-9) return km / pace.kmHour;
  const atEight = dayKm(pace, TRAVEL_DAY_HOURS) - dayKm(pace, already);
  if (km <= atEight + 1e-9) return TRAVEL_DAY_HOURS - already;
  return TRAVEL_DAY_HOURS - already + (km - atEight) / pace.kmHour;
}
export function travelPlan(state, journey, hours, cid = campaignIdOf(state)) {
  const pace = paceOf(journey.pace);
  const remaining = Math.max(0, journey.km - journey.travelledKm);
  const at = now(state, cid);
  const already = journey.hoursByDay?.[at.day] ?? 0;
  const reach = dayKm(pace, already + hours) - dayKm(pace, already);
  const arrives = remaining <= reach + 1e-9;
  const needed = arrives ? hoursFor(pace, already, remaining) : hours;
  const seconds = arrives ? Math.max(60, Math.ceil((needed * HOUR) / 60) * 60) : hours * HOUR;
  const travelled = seconds / HOUR;
  const lastHour = Math.floor(already + travelled + 1e-9);
  const saves = [];
  for (let h = Math.floor(Math.max(already, TRAVEL_DAY_HOURS)) + 1; h <= lastHour; h++)
    saves.push({ hour: h, dc: 10 + (h - TRAVEL_DAY_HOURS) });
  return {
    pace,
    remaining,
    km: arrives ? remaining : reach,
    arrives,
    seconds,
    hoursToday: already,
    saves,
    effect: PACE_EFFECTS[pace.id],
    after: now(state, cid, at.seconds + seconds),
  };
}
/** DM: the party travels. The shared clock advances through the rest engine (Inc. 8). */
export function travel(state, slice, { id, hours }, role, { online = true } = {}) {
  requireDm(state, role);
  const cid = campaignIdOf(state);
  const c = ensureCampaign(slice, cid);
  const j = c.journey;
  if (j?.status !== "underway") throw fail("Nessun viaggio in corso.", "No journey underway.");
  if (!int(hours, 1, MAX_TRAVEL_HOURS))
    throw fail(
      `Da 1 a ${MAX_TRAVEL_HOURS} ore di viaggio.`,
      `From 1 to ${MAX_TRAVEL_HOURS} hours of travel.`,
    );
  const ids = memberIds(state);
  if (resting(state, ids))
    throw fail(
      "Il gruppo sta riposando: concludi o interrompi prima il riposo.",
      "The party is resting: finish or interrupt the rest first.",
    );
  const option = paceOptions(state, j).find((o) => o.pace.id === j.pace);
  if (!option?.allowed) throw fail(option.reason.it, option.reason.en);
  if (state.combat?.active)
    throw fail("Fuori dal combattimento si viaggia.", "Travel happens outside combat.");
  const plan = travelPlan(state, j, hours, cid);
  const start = now(state, cid);
  advanceGameTime(state, { id: `travel:${id}`, campaignId: cid, seconds: plan.seconds }, role, {
    online,
  });
  j.travelledKm = Math.round((j.travelledKm + plan.km) * 10) / 10;
  j.hoursByDay = { ...(j.hoursByDay ?? {}), [start.day]: plan.hoursToday + plan.seconds / HOUR };
  const entry = {
    id,
    kind: "travel",
    at: start.seconds,
    seconds: plan.seconds,
    km: Math.round(plan.km * 10) / 10,
    pace: j.pace,
    extended: plan.saves.length,
  };
  j.log.push(entry);
  // SRD Extended Travel: each hour past 8 asks every traveler a Constitution save.
  for (const save of plan.saves)
    for (const actorId of ids)
      c.checks.push(
        newCheck(
          {
            id: newId("check"),
            kind: "extended",
            actorId,
            ability: "con",
            save: true,
            dc: save.dc,
            context: { journeyId: j.id, hour: save.hour, logId: id },
          },
          role,
          start.seconds,
        ),
      );
  if (plan.arrives || j.travelledKm >= j.km - 1e-9) {
    j.travelledKm = j.km;
    j.status = "arrived";
    j.log.push({ id: `${id}:arrived`, kind: "arrived", at: start.seconds + plan.seconds });
  }
  return { entry, plan };
}
/** DM: the SRD lets the GM summarise travel; time advances only by the stated days. */
export function summarizeJourney(state, slice, { id, days, note }, role, { online = true } = {}) {
  requireDm(state, role);
  const cid = campaignIdOf(state);
  const c = ensureCampaign(slice, cid);
  const j = c.journey;
  if (j?.status !== "underway") throw fail("Nessun viaggio in corso.", "No journey underway.");
  if (!int(days, 0, 60)) throw fail("Da 0 a 60 giorni.", "From 0 to 60 days.");
  if (resting(state, memberIds(state)))
    throw fail(
      "Il gruppo sta riposando: concludi o interrompi prima il riposo.",
      "The party is resting: finish or interrupt the rest first.",
    );
  const start = clockSeconds(state, cid);
  if (days > 0)
    advanceGameTime(state, { id: `summary:${id}`, campaignId: cid, seconds: days * DAY }, role, {
      online,
    });
  j.travelledKm = j.km;
  j.status = "arrived";
  j.log.push({
    id,
    kind: "summary",
    at: start,
    seconds: days * DAY,
    note: String(note ?? "")
      .trim()
      .slice(0, 280),
  });
  return j;
}

// ------------------------------------------------------------------ travel events
const row = (id, faces, title, text, extra = {}) => ({ id, faces, title, text, ...extra });
export const EVENT_TABLE = Object.freeze({
  sides: 8,
  source: AUTHORED.events,
  rows: [
    row(
      "quiet",
      [1, 2],
      L("Strada tranquilla", "A quiet road"),
      L("Nessun incontro: solo vento e passi.", "No encounter: only wind and footsteps."),
    ),
    row(
      "lost",
      [3],
      L("Sentiero incerto", "An uncertain trail"),
      L(
        "Un bivio senza segni: chi guida la marcia prova a orientarsi.",
        "An unmarked fork: whoever leads tries to find the way.",
      ),
      { check: { ability: "wis", skill: "survival", dc: "navigation" } },
    ),
    row(
      "forage",
      [4],
      L("Bacche e selvaggina", "Berries and game"),
      L(
        "Il terreno promette cibo per chi sa cercarlo.",
        "The land promises food for those who can find it.",
      ),
      { check: { ability: "wis", skill: "survival", dc: "foraging" } },
    ),
    row(
      "tracks",
      [5],
      L("Tracce recenti", "Fresh tracks"),
      L("Impronte di piccoli piedi incrociano la strada.", "Small footprints cross the road."),
      { check: { ability: "wis", skill: "perception", dc: "search" } },
    ),
    row(
      "travellers",
      [6],
      L("Viandanti", "Travellers"),
      L(
        "Un carro di sale diretto a Porto Grigio chiede notizie di Bruma.",
        "A salt cart bound for Porto Grigio asks for news of Bruma.",
      ),
    ),
    row(
      "hostile",
      [7],
      L("Creature ostili in vista", "Hostile creatures in sight"),
      L(
        "Qualcosa si muove tra le rocce: il DM decide chi e a quale distanza.",
        "Something moves among the rocks: the DM decides who and how far.",
      ),
      { distance: true },
    ),
    row(
      "weather",
      [8],
      L("Il tempo cambia", "The weather turns"),
      L(
        "Nubi basse dal mare: il DM può rigenerare il meteo del giorno.",
        "Low clouds from the sea: the DM may generate the day’s weather again.",
      ),
      { weather: true },
    ),
  ],
});
export const eventRow = (face) => EVENT_TABLE.rows.find((r) => r.faces.includes(face)) ?? null;
/** A suggested check of a row with the terrain's SRD DC. */
export function eventCheck(event, terrain) {
  const r = EVENT_TABLE.rows.find((x) => x.id === event.rowId);
  if (!r?.check) return null;
  return { ...r.check, dc: TERRAIN_DATA[terrain]?.[r.check.dc] ?? null, dcFrom: r.check.dc };
}
/** DM: rolls the event die; the result is a proposal, never applied by itself. */
export function drawEvent(state, slice, rolls, { id, mode, faces }, role, rng) {
  requireDm(state, role);
  const cid = campaignIdOf(state);
  const c = ensureCampaign(slice, cid);
  if (c.journey?.status !== "underway")
    throw fail("Nessun viaggio in corso.", "No journey underway.");
  if (c.events.some((e) => e.status === "proposed"))
    throw fail("Decidi prima l’evento già proposto.", "Decide the event already proposed first.");
  const roll = acceptTableRoll(rolls, slice, {
    key: `event:${c.journey.id}:${c.journey.log.length}`,
    sides: EVENT_TABLE.sides,
    mode,
    faces,
    rng,
    label: L("Evento di viaggio", "Travel event"),
    role,
  });
  const r = eventRow(roll.values[0]);
  const event = {
    id,
    journeyId: c.journey.id,
    terrain: c.journey.terrain,
    rollId: roll.id,
    face: roll.values[0],
    rowId: r.id,
    status: "proposed",
    at: clockSeconds(state, cid),
    checkIds: [],
  };
  c.events.push(event);
  return { event, roll };
}
/** DM decision on a proposed event: accept (optionally asking its check) or dismiss. */
export function decideEvent(state, slice, { eventId, accept, actorIds = [] }, role) {
  requireDm(state, role);
  const cid = campaignIdOf(state);
  const c = ensureCampaign(slice, cid);
  const event = c.events.find((e) => e.id === eventId);
  if (!event || event.status !== "proposed")
    throw fail("L’evento non è più in attesa.", "The event is no longer waiting.");
  event.status = accept ? "accepted" : "dismissed";
  event.decidedAt = clockSeconds(state, cid);
  if (!accept) return event;
  const check = eventCheck(event, event.terrain);
  if (check && actorIds.length) {
    const ids = memberIds(state);
    for (const actorId of actorIds) {
      if (!ids.includes(actorId))
        throw fail("Scegli personaggi del gruppo.", "Choose party characters.");
      const request = {
        id: newId("check"),
        kind: "travel",
        actorId,
        ability: check.ability,
        skill: check.skill,
        dc: check.dc,
        context: { eventId: event.id, pace: c.journey?.pace ?? null },
      };
      request.reasons = paceReasons(c.journey?.pace, request);
      c.checks.push(newCheck(request, role, event.decidedAt));
      event.checkIds.push(request.id);
    }
  }
  c.journey?.log.push({
    id: `${event.id}:log`,
    kind: "event",
    at: event.decidedAt,
    eventId: event.id,
  });
  return event;
}
/** Events a viewer may read: proposals and dismissals are the DM’s. */
export const visibleEvents = (state, c, role) =>
  (c?.events ?? []).filter((e) => isDm(state, role) || e.status === "accepted");

// ------------------------------------------------------------------ weather (Simple Weather)
const effect = (it, en, source, extra = {}) => ({ text: L(it, en), source, ...extra });
export const WEATHER = Object.freeze({
  clear: { name: L("Sereno", "Clear"), icon: "☀", effects: [] },
  cloudy: { name: L("Nuvoloso", "Overcast"), icon: "☁", effects: [] },
  fog: {
    name: L("Nebbia rada", "Patchy fog"),
    icon: "≋",
    effects: [
      effect(
        "Area leggermente oscurata: svantaggio alle prove di Saggezza (Percezione) basate sulla vista.",
        "Lightly Obscured: Disadvantage on Wisdom (Perception) checks that rely on sight.",
        SOURCES.obscured,
        { perception: true },
      ),
    ],
  },
  "light-rain": { name: L("Pioggia leggera", "Light rain"), icon: "☂", effects: [] },
  "heavy-rain": {
    name: L("Pioggia battente", "Heavy rain"),
    icon: "☔",
    effects: [
      effect(
        "Precipitazioni abbondanti: area leggermente oscurata, svantaggio a tutte le prove di Saggezza (Percezione); la pioggia battente spegne le fiamme scoperte.",
        "Heavy Precipitation: Lightly Obscured, Disadvantage on all Wisdom (Perception) checks; heavy rain extinguishes open flames.",
        SOURCES.environment,
        { perception: true, flames: true },
      ),
    ],
  },
  storm: {
    name: L("Temporale con vento forte", "Storm with strong wind"),
    icon: "⛈",
    effects: [
      effect(
        "Precipitazioni abbondanti: area leggermente oscurata, svantaggio a tutte le prove di Saggezza (Percezione); spegne le fiamme scoperte.",
        "Heavy Precipitation: Lightly Obscured, Disadvantage on all Wisdom (Perception) checks; extinguishes open flames.",
        SOURCES.environment,
        { perception: true, flames: true },
      ),
      effect(
        "Vento forte: svantaggio ai tiri per colpire a distanza con le armi; spegne le fiamme libere e disperde la nebbia; chi vola atterra a fine turno o cade.",
        "Strong Wind: Disadvantage on ranged weapon attack rolls; extinguishes open flames and disperses fog; flyers land at the end of their turn or fall.",
        SOURCES.environment,
        { flames: true },
      ),
    ],
  },
  "strong-wind": {
    name: L("Vento forte", "Strong wind"),
    icon: "≈",
    effects: [
      effect(
        "Vento forte: svantaggio ai tiri per colpire a distanza con le armi; spegne le fiamme libere e disperde la nebbia; chi vola atterra a fine turno o cade.",
        "Strong Wind: Disadvantage on ranged weapon attack rolls; extinguishes open flames and disperses fog; flyers land at the end of their turn or fall.",
        SOURCES.environment,
        { flames: true },
      ),
    ],
  },
  "light-snow": { name: L("Neve leggera", "Light snow"), icon: "❄", effects: [] },
  "heavy-snow": {
    name: L("Nevicata fitta", "Heavy snow"),
    icon: "❆",
    effects: [
      effect(
        "Precipitazioni abbondanti: area leggermente oscurata, svantaggio a tutte le prove di Saggezza (Percezione).",
        "Heavy Precipitation: Lightly Obscured, Disadvantage on all Wisdom (Perception) checks.",
        SOURCES.environment,
        { perception: true },
      ),
    ],
  },
  "extreme-cold": {
    name: L("Gelo estremo (−18 °C o meno)", "Extreme cold (0 °F or lower)"),
    icon: "✱",
    effects: [
      effect(
        "Freddo estremo: chi è esposto supera un tiro salvezza su Costituzione CD 10 alla fine di ogni ora o ottiene 1 livello di Indebolimento; resistenza o immunità al freddo lo supera automaticamente.",
        "Extreme Cold: an exposed creature succeeds on a DC 10 Constitution save at the end of each hour or gains 1 Exhaustion level; Cold resistance or immunity succeeds automatically.",
        SOURCES.environment,
      ),
    ],
  },
  "extreme-heat": {
    name: L("Caldo estremo (38 °C o più)", "Extreme heat (100 °F or higher)"),
    icon: "☼",
    effects: [
      effect(
        "Caldo estremo: senza acqua potabile, tiro salvezza su Costituzione alla fine di ogni ora (CD 5, +1 per ora) o 1 livello di Indebolimento; armatura media o pesante dà svantaggio.",
        "Extreme Heat: without drinkable water, a Constitution save at the end of each hour (DC 5, +1 per hour) or 1 Exhaustion level; Medium or Heavy armor gives Disadvantage.",
        SOURCES.environment,
      ),
    ],
  },
});
export const CLIMATES = Object.freeze([
  { id: "temperate", name: L("Temperato", "Temperate") },
  { id: "cold", name: L("Freddo", "Cold") },
  { id: "arid", name: L("Arido", "Arid") },
]);
export const SEASONS = Object.freeze([
  { id: "spring", name: L("Primavera", "Spring") },
  { id: "summer", name: L("Estate", "Summer") },
  { id: "autumn", name: L("Autunno", "Autumn") },
  { id: "winter", name: L("Inverno", "Winter") },
]);
// World calendar seasons (B42) mapped explicitly by id; any other id leaves the DM choosing.
const CALENDAR_SEASONS = Object.freeze({
  primavera: "spring",
  estate: "summer",
  autunno: "autumn",
  inverno: "winter",
  spring: "spring",
  summer: "summer",
  autumn: "autumn",
  winter: "winter",
});
const band = (...pairs) => pairs.map(([to, id]) => ({ to, id }));
// d20 bands per climate and season (authored demo table, Simple Weather-like).
export const WEATHER_TABLE = Object.freeze({
  temperate: {
    spring: band(
      [6, "clear"],
      [11, "cloudy"],
      [15, "light-rain"],
      [17, "heavy-rain"],
      [19, "fog"],
      [20, "storm"],
    ),
    summer: band(
      [10, "clear"],
      [14, "cloudy"],
      [16, "light-rain"],
      [18, "storm"],
      [19, "strong-wind"],
      [20, "extreme-heat"],
    ),
    autumn: band(
      [4, "clear"],
      [9, "cloudy"],
      [12, "fog"],
      [15, "light-rain"],
      [18, "heavy-rain"],
      [20, "strong-wind"],
    ),
    winter: band(
      [4, "clear"],
      [9, "cloudy"],
      [13, "light-snow"],
      [16, "heavy-snow"],
      [18, "strong-wind"],
      [20, "extreme-cold"],
    ),
  },
  cold: {
    spring: band(
      [5, "clear"],
      [10, "cloudy"],
      [14, "light-snow"],
      [17, "strong-wind"],
      [20, "heavy-snow"],
    ),
    summer: band(
      [8, "clear"],
      [13, "cloudy"],
      [16, "light-rain"],
      [19, "strong-wind"],
      [20, "fog"],
    ),
    autumn: band(
      [4, "clear"],
      [9, "cloudy"],
      [13, "light-snow"],
      [16, "heavy-snow"],
      [18, "strong-wind"],
      [20, "extreme-cold"],
    ),
    winter: band(
      [3, "clear"],
      [7, "cloudy"],
      [11, "heavy-snow"],
      [14, "strong-wind"],
      [20, "extreme-cold"],
    ),
  },
  arid: {
    spring: band([12, "clear"], [15, "cloudy"], [18, "strong-wind"], [20, "extreme-heat"]),
    summer: band([9, "clear"], [11, "cloudy"], [14, "strong-wind"], [20, "extreme-heat"]),
    autumn: band([12, "clear"], [16, "cloudy"], [19, "strong-wind"], [20, "light-rain"]),
    winter: band([10, "clear"], [15, "cloudy"], [18, "light-rain"], [20, "strong-wind"]),
  },
});
export const weatherFromFace = (climate, season, face) =>
  WEATHER_TABLE[climate]?.[season]?.find((b) => face <= b.to)?.id ?? null;
/** The season the generator uses: the DM's choice, else the World calendar's by id. */
export function weatherSeason(state, c, cid = campaignIdOf(state)) {
  if (c?.weather?.season) return c.weather.season;
  return CALENDAR_SEASONS[now(state, cid).season] ?? "autumn";
}
export function setClimate(state, slice, { climate, season }, role) {
  requireDm(state, role);
  const c = ensureCampaign(slice, campaignIdOf(state));
  if (climate !== undefined) {
    if (!CLIMATES.some((x) => x.id === climate))
      throw fail("Clima sconosciuto.", "Unknown climate.");
    c.weather.climate = climate;
  }
  if (season !== undefined) {
    if (season !== null && !SEASONS.some((x) => x.id === season))
      throw fail("Stagione sconosciuta.", "Unknown season.");
    c.weather.season = season;
  }
  return c.weather;
}
export function generateWeather(state, slice, rolls, { mode, faces }, role, rng) {
  requireDm(state, role);
  const cid = campaignIdOf(state);
  const c = ensureCampaign(slice, cid);
  const at = now(state, cid);
  const season = weatherSeason(state, c, cid);
  const previous = c.weather.days[at.day];
  const roll = acceptTableRoll(rolls, slice, {
    key: `weather:${at.day}:${previous?.changes?.length ?? 0}:${previous?.rollId ?? ""}`,
    sides: 20,
    mode,
    faces,
    rng,
    label: L("Meteo del giorno", "Weather of the day"),
    role,
  });
  const conditionId = weatherFromFace(c.weather.climate, season, roll.values[0]);
  c.weather.days[at.day] = {
    conditionId,
    climate: c.weather.climate,
    season,
    rollId: roll.id,
    face: roll.values[0],
    shared: previous?.shared ?? false,
    changes: previous
      ? [
          ...(previous.changes ?? []),
          {
            from: previous.conditionId,
            to: conditionId,
            reason: L("Rigenerato", "Generated again"),
            by: role,
            at: at.seconds,
          },
        ]
      : [],
    at: at.seconds,
  };
  return { day: c.weather.days[at.day], roll };
}
/** DM edit: any condition, with a reason when a recorded weather changes. */
export function setWeather(state, slice, { conditionId, reason }, role) {
  requireDm(state, role);
  if (!WEATHER[conditionId])
    throw fail("Condizione meteo sconosciuta.", "Unknown weather condition.");
  const cid = campaignIdOf(state);
  const c = ensureCampaign(slice, cid);
  const at = now(state, cid);
  const previous = c.weather.days[at.day];
  const why = String(reason ?? "")
    .trim()
    .slice(0, 200);
  if (previous && !why)
    throw fail(
      "Scrivi il motivo del cambio: resta nella cronologia del meteo.",
      "Write why it changes: it stays in the weather history.",
    );
  if (previous?.conditionId === conditionId)
    throw fail("È già il meteo di oggi.", "That is already today’s weather.");
  c.weather.days[at.day] = {
    conditionId,
    climate: c.weather.climate,
    season: weatherSeason(state, c, cid),
    rollId: null,
    face: null,
    shared: previous?.shared ?? false,
    changes: previous
      ? [
          ...(previous.changes ?? []),
          {
            from: previous.conditionId,
            to: conditionId,
            reason: L(why, why),
            by: role,
            at: at.seconds,
          },
        ]
      : [],
    at: at.seconds,
  };
  return c.weather.days[at.day];
}
export function shareWeather(state, slice, { shared }, role) {
  requireDm(state, role);
  const cid = campaignIdOf(state);
  const c = ensureCampaign(slice, cid);
  const day = c.weather.days[now(state, cid).day];
  if (!day) throw fail("Nessun meteo registrato oggi.", "No weather recorded today.");
  day.shared = Boolean(shared);
  return day;
}
/** DM: Owlbear Weather — today's rain, snow or fog drawn over the Table map. */
export function weatherOnMap(state, slice, { onMap }, role) {
  requireDm(state, role);
  const cid = campaignIdOf(state);
  const c = ensureCampaign(slice, cid);
  const day = c.weather.days[now(state, cid).day];
  if (!day) throw fail("Nessun meteo registrato oggi.", "No weather recorded today.");
  day.onMap = Boolean(onMap);
  return day;
}
export const MAP_WEATHER = Object.freeze({
  "light-rain": "rain",
  "heavy-rain": "rain",
  storm: "rain",
  "light-snow": "snow",
  "heavy-snow": "snow",
  fog: "fog",
});
/** Today's weather as this viewer may read it (a player only when shared). */
export function todayWeather(state, c, role, cid = campaignIdOf(state)) {
  const day = c?.weather?.days?.[now(state, cid).day];
  if (!day) return null;
  if (!isDm(state, role) && !day.shared) return { hidden: true };
  return day;
}

// ------------------------------------------------------------------ provisions (Rest Recovery)
const nameIs = (value, names) => {
  const text = (v) =>
    String(v ?? "")
      .trim()
      .toLowerCase();
  return typeof value === "object"
    ? names.includes(text(value?.en)) || names.includes(text(value?.it))
    : names.includes(text(value));
};
const isItem = (row, srdId, names) =>
  !!row && !row.unidentified && (row.srdId === srdId || (!row.srdId && nameIs(row.name, names)));
export const rationRows = (actor) =>
  (actor?.inventory ?? []).filter(
    (row) => isItem(row, "srd2024:item:rations", ["rations", "razioni"]) && row.quantity > 0,
  );
export const rationCount = (actor) => rationRows(actor).reduce((n, row) => n + row.quantity, 0);
const SIZE_FOOD = Object.freeze({
  tiny: 0.25,
  small: 1,
  medium: 1,
  large: 4,
  huge: 16,
  gargantuan: 64,
});
/** Days of Rations one day needs (1 lb of food, 1 Rations, for Small and Medium). */
export const rationsNeeded = (actor) => SIZE_FOOD[actor?.size ?? "medium"] ?? 1;
/** DM: proposes today's consumption; nothing leaves an inventory without consent. */
export function proposeProvisions(state, slice, { water }, role) {
  requireDm(state, role);
  const cid = campaignIdOf(state);
  const c = ensureCampaign(slice, cid);
  const at = now(state, cid);
  if (c.provisions.days[at.day])
    throw fail("Il consumo di oggi è già proposto.", "Today’s consumption is already proposed.");
  if (!["available", "scarce"].includes(water))
    throw fail("Indica se c’è acqua a sufficienza.", "Say whether there is enough water.");
  c.provisions.days[at.day] = {
    water,
    at: at.seconds,
    rows: Object.fromEntries(
      memberIds(state).map((id) => [id, { status: "pending", by: null, rations: null }]),
    ),
  };
  return c.provisions.days[at.day];
}
/** The owner (or the DM for its own characters) answers: eat, other food, or skip. */
export function answerProvisions(state, slice, { actorId, choice }, role) {
  requireMember(state, role);
  const cid = campaignIdOf(state);
  const c = ensureCampaign(slice, cid);
  const day = c.provisions.days[now(state, cid).day];
  if (!day?.rows?.[actorId])
    throw fail(
      "Nessun consumo proposto oggi per questo personaggio.",
      "No consumption proposed today for this character.",
    );
  const actor = requireControl(state, actorId, role);
  // Consent belongs to whoever plays the character; the DM answers for the DM's own.
  if (actor.owner !== role && !(role === "dm" && actor.owner === "dm"))
    throw fail(
      "Il consenso spetta a chi gioca il personaggio.",
      "Consent belongs to the character’s player.",
    );
  const current = day.rows[actorId];
  if (current.status !== "pending")
    throw fail(
      "Hai già risposto per oggi: usa Annulla per cambiare.",
      "Already answered today: use Undo to change it.",
    );
  if (!["eat", "other", "skip"].includes(choice))
    throw fail("Scelta non valida.", "Invalid choice.");
  if (choice === "eat") {
    const need = rationsNeeded(actor);
    if (!Number.isInteger(need))
      throw fail(
        "La razione di questa taglia non è modellata: scegli «Altra fonte» e decidi con il DM.",
        "This size’s ration is not modelled: choose “Other food” and agree with the DM.",
      );
    if (rationCount(actor) < need)
      throw fail(
        `Servono ${need} ${need === 1 ? "razione" : "razioni"}: nell’inventario ${rationCount(actor)}.`,
        `${need} ${need === 1 ? "Rations is" : "Rations are"} needed: ${rationCount(actor)} in the inventory.`,
      );
    let left = need;
    for (const row of rationRows(actor)) {
      const take = Math.min(left, row.quantity);
      row.quantity -= take;
      left -= take;
      if (!left) break;
    }
    actor.inventory = actor.inventory.filter(
      (row) => !(isItem(row, "srd2024:item:rations", ["rations", "razioni"]) && row.quantity <= 0),
    );
    current.rations = need;
  }
  current.status = choice;
  current.by = role;
  return current;
}
/** Warnings of a day: shortages quote the SRD hazard; Exhaustion is never applied here. */
export function provisionWarnings(state, c, day) {
  const record = c?.provisions?.days?.[day];
  const out = [];
  if (!record) return out;
  for (const [actorId, answer] of Object.entries(record.rows)) {
    const actor = state.actors?.[actorId];
    if (!actor) continue;
    const hungry =
      answer.status === "skip" ||
      (answer.status === "pending" && rationCount(actor) < rationsNeeded(actor));
    if (hungry)
      out.push({
        actorId,
        kind: "food",
        text: L(
          `${actor.name}: senza cibo oggi. Malnutrizione: chi mangia meno della metà del necessario supera un TS Costituzione CD 10 a fine giornata o ottiene 1 livello di Indebolimento; 5 giorni a digiuno danno Indebolimento automatico. Decide il DM: nulla viene applicato da solo.`,
          `${actor.name}: no food today. Malnutrition: eating less than half the requirement means a DC 10 Constitution save at the day’s end or 1 Exhaustion level; 5 days without food give Exhaustion automatically. The DM decides: nothing is applied by itself.`,
        ),
        source: SOURCES.malnutrition,
      });
  }
  if (record.water === "scarce")
    out.push({
      actorId: null,
      kind: "water",
      text: L(
        "Acqua scarsa: chi beve meno della metà del necessario ottiene 1 livello di Indebolimento a fine giornata (Disidratazione). Decide il DM: nulla viene applicato da solo.",
        "Scarce water: drinking less than half the requirement gives 1 Exhaustion level at the day’s end (Dehydration). The DM decides: nothing is applied by itself.",
      ),
      source: SOURCES.dehydration,
    });
  return out;
}

// ------------------------------------------------------------------ portable light (FG LIGHT)
export const TORCH = Object.freeze({
  seconds: HOUR,
  bright: 6,
  dim: 6,
  srdId: "srd2024:item:torch",
  names: ["torch", "torcia", "torches", "torce"],
  source: SOURCES.torch,
});
export const WARNING_SECONDS = 600;
export const torchRows = (actor) =>
  (actor?.inventory ?? []).filter(
    (row) => isItem(row, TORCH.srdId, TORCH.names) && row.quantity > 0,
  );
export const torchCount = (actor) => torchRows(actor).reduce((n, row) => n + row.quantity, 0);
/** A light's state at `seconds` on the clock: lit, warning (≤ 10 minutes), out or burnt. */
export function lightStatus(light, seconds) {
  const endsAt = light.litAt + light.seconds;
  if (light.outAt !== null && light.outAt !== undefined)
    return { state: "out", remaining: Math.max(0, endsAt - light.outAt), endsAt };
  const remaining = endsAt - seconds;
  if (remaining <= 0) return { state: "burnt", remaining: 0, endsAt };
  return { state: remaining <= WARNING_SECONDS ? "warning" : "lit", remaining, endsAt };
}
export const litLight = (c, actorId, seconds) =>
  (c?.lights ?? []).find(
    (light) =>
      light.actorId === actorId && ["lit", "warning"].includes(lightStatus(light, seconds).state),
  ) ?? null;
/** Lighting a torch uses one from the character's own inventory (it burns for 1 hour). */
export function lightTorch(state, slice, { id, actorId }, role) {
  requireMember(state, role);
  const actor = requireControl(state, actorId, role);
  const cid = campaignIdOf(state);
  const c = ensureCampaign(slice, cid);
  const seconds = clockSeconds(state, cid);
  if (litLight(c, actorId, seconds))
    throw fail(
      `${actor.name} ha già una torcia accesa.`,
      `${actor.name} already holds a lit torch.`,
    );
  const row = torchRows(actor)[0];
  if (!row)
    throw fail(
      `${actor.name} non ha torce nell’inventario: prendine una dalla scorta del gruppo.`,
      `${actor.name} has no torch in the inventory: take one from the party stash.`,
    );
  row.quantity -= 1;
  if (row.quantity <= 0) actor.inventory = actor.inventory.filter((r) => r !== row);
  const light = {
    id,
    actorId,
    kind: "torch",
    litAt: seconds,
    seconds: TORCH.seconds,
    outAt: null,
    by: role,
    rowName: copy(row.name),
  };
  c.lights.push(light);
  return light;
}
/**
 * Lit torches as light sources of a scene for the Table's vision (B35 lighting, through
 * its light-provider hook): Bright Light 6 m and Dim Light 6 m more, following the
 * bearer's token until the torch is put out or burns out on the clock.
 */
export function torchLights(state, scene) {
  const c = campaignOf(state?.ext?.[ID], campaignIdOf(state));
  if (!c || !scene) return [];
  const seconds = clockSeconds(state);
  return (c.lights ?? [])
    .filter(
      (light) =>
        ["lit", "warning"].includes(lightStatus(light, seconds).state) &&
        (scene.tokens ?? []).some((token) => token.actorId === light.actorId),
    )
    .map((light) => ({
      id: `travel:${light.id}`,
      preset: "torch",
      bright: TORCH.bright,
      dim: TORCH.dim,
      color: "#f2b25c",
      on: true,
      rotation: 0,
      attachedTo: light.actorId,
      source: TORCH.source,
    }));
}
export function extinguish(state, slice, { lightId }, role) {
  requireMember(state, role);
  const cid = campaignIdOf(state);
  const c = ensureCampaign(slice, cid);
  const light = c.lights.find((l) => l.id === lightId);
  if (!light) throw fail("La luce non esiste più.", "The light no longer exists.");
  requireControl(state, light.actorId, role);
  const seconds = clockSeconds(state, cid);
  const status = lightStatus(light, seconds);
  if (!["lit", "warning"].includes(status.state))
    throw fail("La torcia non è accesa.", "The torch is not lit.");
  light.outAt = seconds;
  return light;
}

// ------------------------------------------------------------------ search (BG3)
export const SEARCH_RADIUS_M = 4.5;
export const pointsOf = (slice, sceneId) => slice?.points?.[sceneId] ?? [];
/** Points a viewer may see: the DM every point, players those already found. */
export const visiblePoints = (state, slice, sceneId, role) =>
  pointsOf(slice, sceneId).filter((p) => isDm(state, role) || p.found);
const metersToPx = (scene, meters) =>
  (meters / (scene.metersPerCell || 1.5)) * (scene.gridSize || 50);
export function pointsNear(scene, points, token, meters = SEARCH_RADIUS_M) {
  const radius = metersToPx(scene, meters);
  return points.filter((p) => Math.hypot(p.x - token.x, p.y - token.y) <= radius + 0.5);
}
export const pointEmpty = (point) => !(point.items ?? []).some((item) => item.quantity > 0);
/** The Search action: a Wisdom (Perception) check; the result lists what is found nearby. */
export function search(state, slice, rolls, { id, actorId, mode, faces }, role, rng) {
  requireMember(state, role);
  requireControl(state, actorId, role);
  const cid = campaignIdOf(state);
  const c = ensureCampaign(slice, cid);
  if (state.combat?.active && state.combat.order?.includes(actorId))
    throw fail(
      "In combattimento Cercare costa l’azione del turno: usa il combattimento. Qui si cerca in esplorazione.",
      "In combat Search costs the turn's action: use combat. Here you search while exploring.",
    );
  const scene = state.scenes?.find((s) => s.id === state.activeSceneId);
  const token = scene?.tokens?.find((t) => t.actorId === actorId);
  if (!token)
    throw fail(
      "Il personaggio non ha una pedina nella scena.",
      "The character has no token in the scene.",
    );
  // The check id counts this character's Searches in the scene: an undone Search leaves the
  // count unchanged, so searching again reuses the undone faces (I-229), never a new roll.
  const nth = c.checks.filter(
    (x) => x.kind === "search" && x.actorId === actorId && x.context?.sceneId === scene.id,
  ).length;
  const check = newCheck(
    {
      id: `check-search-${actorId}-${scene.id}-${nth + 1}`,
      kind: "search",
      actorId,
      ability: "wis",
      skill: "perception",
      context: { searchId: id, sceneId: scene.id },
    },
    role,
    clockSeconds(state, cid),
  );
  c.checks.push(check);
  const { roll } = rollCheck(state, slice, rolls, { checkId: check.id, mode, faces }, role, rng);
  const near = pointsNear(scene, pointsOf(slice, scene.id), token);
  const found = [];
  for (const point of near)
    if (point.found || point.dc === null || roll.total >= point.dc) {
      if (!point.found) {
        point.found = true;
        point.foundBy = actorId;
      }
      found.push(point.id);
    }
  const record = {
    id,
    actorId,
    sceneId: scene.id,
    checkId: check.id,
    total: roll.total,
    found,
    at: check.at,
  };
  c.searches.push(record);
  if (c.searches.length > 40) c.searches.splice(0, c.searches.length - 40);
  return { record, roll, check };
}
/**
 * B62 — one Search action (SRD 5.2.1 "Search [Action]", EN 187 / IT 212: one Wisdom
 * (Perception) check for a concealed creature or object). The Table's single «Cerca» rolls
 * once (B46) and hands the accepted roll here: the search points within 4.5 m are compared
 * with that total, recorded as this area's search with the same faces (`sharedFrom`), with no
 * second roll. Exploration only, as before: a creature in the running initiative gets null.
 */
export function searchPointsWithRoll(state, slice, { id, actorId, roll }, role) {
  if (!slice) return null;
  if (state.combat?.active && state.combat.order?.includes(actorId)) return null;
  requireMember(state, role);
  requireControl(state, actorId, role);
  const scene = state.scenes?.find((s) => s.id === state.activeSceneId);
  const token = scene?.tokens?.find((t) => t.actorId === actorId);
  if (!token) return null;
  const values = (roll?.values ?? []).map(Number);
  if (!values.length || values.some((face) => !validFace(face, 20)) || !Number.isFinite(roll.total))
    throw fail("Tiro di ricerca non valido.", "Invalid search roll.");
  const cid = campaignIdOf(state);
  const c = ensureCampaign(slice, cid);
  const nth = c.checks.filter(
    (x) => x.kind === "search" && x.actorId === actorId && x.context?.sceneId === scene.id,
  ).length;
  const check = newCheck(
    {
      id: `check-search-${actorId}-${scene.id}-${nth + 1}`,
      kind: "search",
      actorId,
      ability: "wis",
      skill: "perception",
      context: { searchId: id, sceneId: scene.id, sharedFrom: roll.id ?? null },
    },
    role,
    clockSeconds(state, cid),
  );
  Object.assign(check, {
    status: "rolled",
    total: roll.total,
    success: null,
    mode: roll.mode === "physical" ? "physical" : "digital",
    rollMode: roll.rollMode ?? "normal",
    natural: roll.natural ?? values[0],
    bonus: roll.modifier ?? 0,
    values,
  });
  c.checks.push(check);
  const found = [];
  for (const point of pointsNear(scene, pointsOf(slice, scene.id), token))
    if (point.found || point.dc === null || roll.total >= point.dc) {
      if (!point.found) {
        point.found = true;
        point.foundBy = actorId;
      }
      found.push(point.id);
    }
  const record = {
    id,
    actorId,
    sceneId: scene.id,
    checkId: check.id,
    total: roll.total,
    found,
    at: check.at,
  };
  c.searches.push(record);
  if (c.searches.length > 40) c.searches.splice(0, c.searches.length - 40);
  return record;
}
/** Takes found items into the searching character's inventory (loot row model, B26). */
export function takeFound(state, slice, { sceneId, pointId, actorId }, role) {
  requireMember(state, role);
  const actor = requireControl(state, actorId, role);
  const point = pointsOf(slice, sceneId).find((p) => p.id === pointId);
  if (!point?.found) throw fail("Non ancora trovato.", "Not found yet.");
  const items = (point.items ?? []).filter((item) => item.quantity > 0);
  if (!items.length) throw fail("È vuoto.", "It is empty.");
  const scene = state.scenes?.find((s) => s.id === sceneId);
  const token = scene?.tokens?.find((t) => t.actorId === actorId);
  if (!token || !pointsNear(scene, [point], token).length)
    throw fail(
      `${actor.name} deve essere vicino (entro ${SEARCH_RADIUS_M} m) per prenderlo.`,
      `${actor.name} must be close (within 15 ft) to take it.`,
    );
  for (const item of items)
    giveItemToActor(actor, itemFromCatalog(item.srdId, { quantity: item.quantity }));
  point.items = [];
  point.takenBy = actorId;
  return items;
}
const POINT_KINDS = ["container", "hidden", "trace"];
/** DM: a searchable point (container, hidden object or trace) at a map position. */
export function savePoint(state, slice, { sceneId, point }, role) {
  requireDm(state, role);
  const scene = state.scenes?.find((s) => s.id === sceneId);
  if (!scene) throw fail("La scena non esiste più.", "The scene no longer exists.");
  const name = String(point?.name ?? "")
    .trim()
    .slice(0, 80);
  if (!name) throw fail("Scrivi un nome.", "Write a name.");
  if (!POINT_KINDS.includes(point.kind)) throw fail("Tipo non valido.", "Invalid type.");
  const dc =
    point.dc === "" || point.dc === null || point.dc === undefined ? null : Number(point.dc);
  if (dc !== null && !int(dc, 1, 30))
    throw fail("La CD va da 1 a 30.", "The DC ranges from 1 to 30.");
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y))
    throw fail("Posizione non valida.", "Invalid position.");
  const items = (point.items ?? []).filter((item) => item.quantity > 0);
  for (const item of items) {
    itemFromCatalog(item.srdId, { quantity: item.quantity }); // validates catalog id and quantity
  }
  slice.points ??= {};
  const list = (slice.points[sceneId] ??= []);
  const existing = list.find((p) => p.id === point.id);
  const next = {
    id: existing?.id ?? point.id ?? newId("point"),
    kind: point.kind,
    x: Math.round(point.x),
    y: Math.round(point.y),
    name: L(name, name),
    dc: point.kind === "container" && dc === null ? null : dc,
    items: items.map((item) => ({ srdId: item.srdId, quantity: item.quantity })),
    note: L(
      String(point.note ?? "")
        .trim()
        .slice(0, 200),
      String(point.note ?? "")
        .trim()
        .slice(0, 200),
    ),
    found: existing ? existing.found : dc === null,
    foundBy: existing?.foundBy ?? null,
  };
  if (existing) list[list.indexOf(existing)] = next;
  else list.push(next);
  return next;
}
export function removePoint(state, slice, { sceneId, pointId }, role) {
  requireDm(state, role);
  const list = pointsOf(slice, sceneId);
  const index = list.findIndex((p) => p.id === pointId);
  if (index < 0) throw fail("Punto non trovato.", "Point not found.");
  list.splice(index, 1);
}
