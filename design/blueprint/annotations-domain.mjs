// B18 — Table annotations: pure domain (no DOM, no registry).
//
// Persistent shared data lives in state.ext.annotations (gameplay Undo restores it, except
// shared measurements, which are not game actions: preserveMeasures):
// drawings with an owning author (Foundry Drawings FVT-100, DDB Draw DDB-122), persistent
// area templates with colour, damage pattern, hidden and locked flags (DDB Overlays
// DDB-123, DDB lock DDB-118), shared measurements (Roll20 broadcast R20-136, Owlbear pinned
// ruler VTL-135), auras that follow a token (Auras and Emanations VTL-140, Roll20 R20-133),
// token tooltips (Owlbear Tooltips VTL-106) and token elevations (Character Distances
// VTL-137). Transient signals (pings, alert pings, laser trail, recall-view proposals) are
// not game state: createSignalBus() keeps them in memory with a lifetime, like a broadcast
// that reaches whoever is looking at the Table (Foundry pings FVT-157, Owlbear pointer
// VTL-146, Pulpscape opt-in recentring VTL-183).
//
// Rules: areas of effect follow SRD 5.2.1 (EN/IT) glossary definitions; distances use the
// prototype's straight-line convention (combat.mjs `distance`), extended with elevation.

import { canControlActor, canViewActor, isActorAvailable } from "./character-access.mjs";
import { sampleDate } from "./sample-clock.mjs";

export const ID = "annotations";
export const VERSION = 1;

const L = (it, en) => Object.freeze({ it, en });
const fail = (it, en) => {
  throw Object.assign(new Error(en), { it, en });
};
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const str = (value) => (typeof value === "string" ? value : "");
const num = (value) => (typeof value === "number" && Number.isFinite(value) ? value : null);
const round = (value, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;
const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36);

// SRD 5.2.1 glossary pages (EN / IT). Checked on the local copies whose sha256 match
// combat.mjs SOURCE (EN 8974902d…, IT a7b88b0c…).
export const SRD = Object.freeze({
  kind: "srd",
  edition: "2024",
  revision: "5.2.1",
  en: "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf",
  it: "https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf",
  pages: Object.freeze({
    cone: [179, 206],
    cube: [179, 206],
    cylinder: [180, 205],
    emanation: [181, 207],
    line: [184, 209],
    sphere: [188, 216],
    damageTypes: [180, 217],
  }),
});

// DDB Draw offers twelve colours (DDB-122); the same twelve serve overlays and auras.
export const COLOURS = Object.freeze([
  ["gold", "#e2c17b", L("Oro", "Gold")],
  ["red", "#e0625c", L("Rosso", "Red")],
  ["orange", "#ec9a4c", L("Arancione", "Orange")],
  ["yellow", "#f2da5a", L("Giallo", "Yellow")],
  ["green", "#79c27b", L("Verde", "Green")],
  ["teal", "#46c0b0", L("Verde acqua", "Teal")],
  ["blue", "#63a4e0", L("Blu", "Blue")],
  ["purple", "#a58ae0", L("Viola", "Purple")],
  ["pink", "#ec98c0", L("Rosa", "Pink")],
  ["white", "#f6f1e6", L("Bianco", "White")],
  ["grey", "#98a3a8", L("Grigio", "Grey")],
  ["black", "#161b1f", L("Nero", "Black")],
]);
export const colourHex = (id) => COLOURS.find(([key]) => key === id)?.[1] ?? COLOURS[0][1];
const colourIds = new Set(COLOURS.map(([id]) => id));

// Identity colours for pings and the pointer (Foundry: the user's colour, FVT-157).
export const IDENTITY_COLOURS = Object.freeze({ player: "#63a4e0", dm: "#e2c17b" });
export const identityColour = (id) => IDENTITY_COLOURS[id] ?? "#46c0b0";
export const ALERT_COLOUR = "#ff5a4f";

// The thirteen SRD 5.2.1 damage types (EN 180 / IT 217) as overlay patterns (DDB-123).
export const DAMAGE_TYPES = Object.freeze([
  ["acid", L("Acido", "Acid")],
  ["bludgeoning", L("Contundente", "Bludgeoning")],
  ["cold", L("Freddo", "Cold")],
  ["fire", L("Fuoco", "Fire")],
  ["force", L("Forza", "Force")],
  ["lightning", L("Fulmine", "Lightning")],
  ["necrotic", L("Necrotico", "Necrotic")],
  ["piercing", L("Perforante", "Piercing")],
  ["poison", L("Veleno", "Poison")],
  ["psychic", L("Psichico", "Psychic")],
  ["radiant", L("Radioso", "Radiant")],
  ["slashing", L("Tagliente", "Slashing")],
  ["thunder", L("Tuono", "Thunder")],
]);
const patternIds = new Set(["none", ...DAMAGE_TYPES.map(([id]) => id)]);
export const damageLabel = (id) => DAMAGE_TYPES.find(([key]) => key === id)?.[1] ?? null;

export const MARK_KINDS = Object.freeze(["free", "arrow", "rect", "ellipse", "text"]);
// DDB Overlays: square/cube, circle/sphere/cylinder, cone, line (5 ft wide by default).
export const TEMPLATE_SHAPES = Object.freeze(["cone", "circle", "square", "line"]);
export const MEASURE_SHAPES = Object.freeze(["line", "circle", "cone", "square", "rings"]);
export const SHAPE_LABELS = Object.freeze({
  line: L("Linea", "Line"),
  circle: L("Cerchio", "Circle"),
  cone: L("Cono", "Cone"),
  square: L("Quadrato", "Square"),
  rings: L("Anelli", "Rings"),
});
// The SRD area each template shape stands for (labels and citation).
export const SHAPE_RULE = Object.freeze({
  cone: ["cone", L("Cono", "Cone")],
  circle: ["sphere", L("Sfera o cilindro", "Sphere or cylinder")],
  square: ["cube", L("Cubo", "Cube")],
  line: ["line", L("Linea", "Line")],
});

// Owlbear Ranges ships three colour-blind themes (VTL-136). Palettes adapted from the
// Okabe-Ito set; every ring also has its own dash and a text label, so colour is never
// the only cue. Not validated with colour-blind users.
export const RING_THEMES = Object.freeze({
  standard: {
    label: L("Standard", "Standard"),
    colours: ["#e0625c", "#f2da5a", "#79c27b", "#63a4e0", "#a58ae0", "#f6f1e6"],
  },
  deuteranopia: {
    label: L("Deuteranopia", "Deuteranopia"),
    colours: ["#e69f00", "#56b4e9", "#f0e442", "#0072b2", "#f6f1e6", "#cc79a7"],
  },
  protanopia: {
    label: L("Protanopia", "Protanopia"),
    colours: ["#f0e442", "#0072b2", "#e69f00", "#56b4e9", "#f6f1e6", "#999999"],
  },
  tritanopia: {
    label: L("Tritanopia", "Tritanopia"),
    colours: ["#d55e00", "#009e73", "#cc79a7", "#f6f1e6", "#882255", "#999999"],
  },
});
export const RING_DASHES = Object.freeze(["", "10 6", "3 5", "14 5 3 5", "6 3", "1 4"]);
export const DEFAULT_RING_PRESETS = "1,5; 9; 18; 36";

/**
 * "1,5; 9; 18" or "1.5, 9, 18" → [1.5, 9, 18]: up to six rings between 0.5 and 300 m,
 * sorted. A comma inside a number is the Italian decimal mark; a comma before a space
 * separates values.
 */
export function parseRingPresets(text) {
  const values = String(text ?? "")
    .split(/[;\s]+|,(?=\s)/)
    .map((part) => Number(part.replace(",", ".")))
    .filter((value) => Number.isFinite(value) && value >= 0.5 && value <= 300);
  const unique = [...new Set(values.map((value) => round(value, 2)))].sort((a, b) => a - b);
  return unique.length ? unique.slice(0, 6) : [1.5, 9, 18, 36];
}

// ---------------------------------------------------------------- units and geometry

export const sceneOf = (state, sceneId = state?.activeSceneId) =>
  state?.scenes?.find((scene) => scene.id === sceneId) ?? null;
const cellPx = (scene) => scene?.gridSize || 50;
const cellM = (scene) => scene?.metersPerCell || 1.5;
export const mToPx = (scene, meters) => (meters / cellM(scene)) * cellPx(scene);
export const pxToM = (scene, px) => (px / cellPx(scene)) * cellM(scene);
export const distanceM = (scene, a, b) => pxToM(scene, Math.hypot(b.x - a.x, b.y - a.y));
const unit = (deg) => ({ x: Math.cos((deg * Math.PI) / 180), y: Math.sin((deg * Math.PI) / 180) });
export const angleOf = (from, to) =>
  round((Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI, 2);
const along = (p, dir, d) => ({ x: p.x + dir.x * d, y: p.y + dir.y * d });

/**
 * Geometry of an area (template or measurement) in scene pixels:
 * {kind:"polygon", points} or {kind:"circle", cx, cy, r}, plus the far `tip` handle.
 * Cone: width at any distance equals that distance (SRD EN 179 / IT 206).
 * Cube: origin at the centre of a face (EN 179 / IT 206). Line: length × width (EN 184 /
 * IT 209). Sphere/cylinder: radius from the origin (EN 188 / IT 216, EN 180 / IT 205).
 */
export function areaGeometry(scene, area) {
  const origin = area.origin;
  const length = mToPx(scene, area.size);
  const dir = unit(area.angle ?? 0);
  const perp = { x: -dir.y, y: dir.x };
  const tip = along(origin, dir, length);
  if (area.shape === "circle")
    return { kind: "circle", cx: origin.x, cy: origin.y, r: length, tip, origin };
  const half =
    area.shape === "cone"
      ? length / 2
      : area.shape === "square"
        ? length / 2
        : mToPx(scene, area.width ?? cellM(scene)) / 2;
  const nearHalf = area.shape === "cone" ? 0 : half;
  const points = [
    along(origin, perp, nearHalf),
    along(tip, perp, half),
    along(tip, perp, -half),
    along(origin, perp, -nearHalf),
  ];
  return {
    kind: "polygon",
    points: area.shape === "cone" ? [origin, points[1], points[2]] : points,
    tip,
    origin,
  };
}
function insidePolygon(points, p) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i],
      b = points[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
      inside = !inside;
  }
  return inside;
}
export function areaContains(scene, area, p) {
  const g = areaGeometry(scene, area);
  return g.kind === "circle"
    ? Math.hypot(p.x - g.cx, p.y - g.cy) <= g.r
    : insidePolygon(g.points, p);
}
export function segmentDistance(p, a, b) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
export function polylineLengthM(scene, points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distanceM(scene, points[i - 1], points[i]);
  return total;
}
/** Font size of a text drawing in scene pixels (markSvg draws it at this size). */
export const markFontSize = (mark) => 14 + (mark.width ?? 2) * 3;
/**
 * Box of a text drawing: SVG text starts at its anchor and runs to the right, with the
 * baseline on the anchor (an estimate of the bold UI font: half an em per character).
 */
export function textBox(mark) {
  const size = markFontSize(mark);
  const [a] = mark.points;
  return {
    x1: a.x,
    x2: a.x + str(mark.text).length * size * 0.5,
    y1: a.y - size,
    y2: a.y + size * 0.3,
  };
}
/** Whether a scene point is on a drawing (for the eraser); `slack` in scene pixels. */
export function markContains(mark, p, slack = 10) {
  const pts = mark.points;
  const reach = slack + (mark.width ?? 2) * 2;
  if (mark.kind === "text") {
    const box = textBox(mark);
    const pad = Math.min(slack, 6);
    return p.x >= box.x1 - pad && p.x <= box.x2 + pad && p.y >= box.y1 - pad && p.y <= box.y2 + pad;
  }
  if (mark.kind === "rect" || mark.kind === "ellipse") {
    const [a, b] = pts;
    const x1 = Math.min(a.x, b.x) - reach,
      x2 = Math.max(a.x, b.x) + reach,
      y1 = Math.min(a.y, b.y) - reach,
      y2 = Math.max(a.y, b.y) + reach;
    return p.x >= x1 && p.x <= x2 && p.y >= y1 && p.y <= y2;
  }
  for (let i = 1; i < pts.length; i++)
    if (segmentDistance(p, pts[i - 1], pts[i]) <= reach) return true;
  return pts.length === 1 && Math.hypot(p.x - pts[0].x, p.y - pts[0].y) <= reach;
}

// ---------------------------------------------------------------- slice

export function seedAnnotations() {
  return {
    marks: [],
    templates: [],
    measures: [],
    auras: [],
    // A DM-only reminder on the Sentinella (the audience "me" never reaches players).
    tooltips: [
      {
        id: "tip-sentinella",
        actorId: "goblin-1",
        author: "dm",
        text: "Sonnecchia sull'impalcatura: si sveglia al primo rumore forte.",
        audience: "me",
        updatedAt: sampleDate("2026-09-17T19:40:00.000Z"),
      },
    ],
    // The Sentinella stands on the scaffolding, 3 m above the courtyard.
    elevations: { "token-goblin-1": 3 },
  };
}
const point = (raw) =>
  num(raw?.x) !== null && num(raw?.y) !== null ? { x: round(raw.x, 1), y: round(raw.y, 1) } : null;
const points = (raw) => (Array.isArray(raw) ? raw.map(point).filter(Boolean) : []);
const identity = (value) => (typeof value === "string" && value ? value : null);
const at = (value) =>
  typeof value === "string" && !Number.isNaN(Date.parse(value)) ? value : null;

function normalizeMark(raw) {
  if (!isObject(raw) || !MARK_KINDS.includes(raw.kind) || !identity(raw.author)) return null;
  const pts = points(raw.points);
  if (!pts.length || !str(raw.sceneId)) return null;
  return {
    id: str(raw.id) || uid(),
    sceneId: raw.sceneId,
    kind: raw.kind,
    points: pts,
    text: raw.kind === "text" ? str(raw.text).slice(0, 140) : "",
    color: colourIds.has(raw.color) ? raw.color : "gold",
    width: Number.isInteger(raw.width) && raw.width >= 1 && raw.width <= 5 ? raw.width : 2,
    author: raw.author,
    asActorId: identity(raw.asActorId),
    hidden: raw.hidden === true,
    createdAt: at(raw.createdAt),
  };
}
function normalizeArea(raw, shapes) {
  if (!isObject(raw) || !shapes.includes(raw.shape) || !identity(raw.author)) return null;
  const origin = point(raw.origin);
  const size = num(raw.size);
  if (!origin || size === null || size <= 0 || !str(raw.sceneId)) return null;
  return {
    id: str(raw.id) || uid(),
    sceneId: raw.sceneId,
    shape: raw.shape,
    origin,
    angle: num(raw.angle) ?? 0,
    size: round(size, 2),
    width: num(raw.width) && raw.width > 0 ? round(raw.width, 2) : 1.5,
    author: raw.author,
    asActorId: identity(raw.asActorId),
    createdAt: at(raw.createdAt),
  };
}
function normalizeTemplate(raw) {
  const base = normalizeArea(raw, TEMPLATE_SHAPES);
  if (!base) return null;
  return {
    ...base,
    color: colourIds.has(raw.color) ? raw.color : "orange",
    pattern: patternIds.has(raw.pattern) ? raw.pattern : "none",
    label: str(raw.label).slice(0, 60),
    hidden: raw.hidden === true,
    locked: raw.locked === true,
    // Who locked it: a DM lock stays until the DM removes it (DDB-118, the DM decides).
    lockedBy: raw.locked === true ? identity(raw.lockedBy) : null,
  };
}
function normalizeMeasure(raw) {
  if (!isObject(raw) || !MEASURE_SHAPES.includes(raw.shape)) return null;
  if (raw.shape === "line") {
    const pts = points(raw.points);
    if (pts.length < 2 || !identity(raw.author) || !str(raw.sceneId)) return null;
    return {
      id: str(raw.id) || uid(),
      sceneId: raw.sceneId,
      shape: "line",
      points: pts,
      author: raw.author,
      asActorId: identity(raw.asActorId),
      createdAt: at(raw.createdAt),
    };
  }
  if (raw.shape === "rings") {
    const origin = point(raw.origin);
    const radii = Array.isArray(raw.radii)
      ? raw.radii
          .map(num)
          .filter((v) => v > 0)
          .slice(0, 6)
      : [];
    if (!origin || !radii.length || !identity(raw.author) || !str(raw.sceneId)) return null;
    return {
      id: str(raw.id) || uid(),
      sceneId: raw.sceneId,
      shape: "rings",
      origin,
      radii,
      theme: Object.hasOwn(RING_THEMES, raw.theme) ? raw.theme : "standard",
      actorId: identity(raw.actorId),
      author: raw.author,
      asActorId: identity(raw.asActorId),
      createdAt: at(raw.createdAt),
    };
  }
  return normalizeArea(raw, ["circle", "cone", "square"]);
}
function normalizeAura(raw) {
  if (!isObject(raw) || !str(raw.actorId) || !identity(raw.author)) return null;
  const radius = num(raw.radius);
  if (radius === null || radius <= 0 || radius > 60) return null;
  return {
    id: str(raw.id) || uid(),
    actorId: raw.actorId,
    author: raw.author,
    radius: round(radius, 2),
    shape: raw.shape === "square" ? "square" : "circle",
    color: colourIds.has(raw.color) ? raw.color : "teal",
    opacity: num(raw.opacity) !== null ? Math.min(0.6, Math.max(0.1, raw.opacity)) : 0.25,
    audience: raw.audience === "me" ? "me" : "all",
    label: str(raw.label).slice(0, 40),
  };
}
function normalizeTooltip(raw) {
  if (!isObject(raw) || !str(raw.actorId) || !identity(raw.author) || !str(raw.text).trim())
    return null;
  return {
    id: str(raw.id) || uid(),
    actorId: raw.actorId,
    author: raw.author,
    // The character the author played when writing it (its label never changes later).
    asActorId: identity(raw.asActorId),
    text: str(raw.text).trim().slice(0, 280),
    audience: raw.audience === "me" ? "me" : "all",
    updatedAt: at(raw.updatedAt),
  };
}
export function normalizeAnnotations(slice, fromVersion = 0) {
  if (fromVersion > VERSION) throw Error("Annotations data comes from a newer version");
  const list = (raw, fn) => (Array.isArray(raw) ? raw.map(fn).filter(Boolean) : []);
  const elevations = {};
  for (const [tokenId, value] of Object.entries(
    isObject(slice?.elevations) ? slice.elevations : {},
  ))
    if (num(value) !== null && Math.abs(value) <= 300) elevations[tokenId] = round(value, 2);
  return {
    marks: list(slice?.marks, normalizeMark),
    templates: list(slice?.templates, normalizeTemplate),
    measures: list(slice?.measures, normalizeMeasure),
    auras: list(slice?.auras, normalizeAura),
    tooltips: list(slice?.tooltips, normalizeTooltip),
    elevations,
  };
}
export function sliceOf(state) {
  const slice = state?.ext?.[ID];
  if (!slice) throw Error("Annotations state is not initialized");
  return slice;
}
const readSlice = (state) => state?.ext?.[ID] ?? seedAnnotations();

// ---------------------------------------------------------------- permissions and people

/** Campaign permissions (DDB Game Settings toggle for player drawing, DDB-122/DDB-118). */
export const DEFAULT_PERMISSIONS = Object.freeze({
  playersDraw: true,
  playersPointer: true,
  playersTemplates: true,
});
export function permissionReason(kind, role, perms = DEFAULT_PERMISSIONS) {
  if (role === "dm") return null;
  const off = {
    draw: perms.playersDraw === false,
    pointer: perms.playersPointer === false,
    template: perms.playersTemplates === false,
  }[kind];
  if (!off) return null;
  return {
    draw: L(
      "Il DM ha disattivato i disegni dei giocatori in questa campagna.",
      "The DM has turned off player drawings in this campaign.",
    ),
    pointer: L(
      "Il DM ha disattivato puntatore e segnali dei giocatori in questa campagna.",
      "The DM has turned off the player pointer and pings in this campaign.",
    ),
    template: L(
      "Il DM ha disattivato le sagome dei giocatori in questa campagna.",
      "The DM has turned off player templates in this campaign.",
    ),
  }[kind];
}
function requirePermission(kind, role, perms) {
  const reason = permissionReason(kind, role, perms);
  if (reason) fail(reason.it, reason.en);
}
const assigned = (actor, role) =>
  actor?.owner === role || (Array.isArray(actor?.controllers) && actor.controllers.includes(role));

/**
 * The character an identity acts as for an annotation's author label: the selected token
 * when it is a character this identity controls, else a player's own first character.
 * The DM without a selected character is simply "DM".
 */
export function actingAs(state, role, selectedActorId = null) {
  const selected = selectedActorId && state.actors?.[selectedActorId];
  // Assigned control only: the DM's universal control of sheets is not "playing as" them.
  if (
    selected?.kind === "character" &&
    canControlActor(selected, role, state) &&
    assigned(selected, role)
  )
    return selected.id;
  if (role === "dm") return null;
  const scene = sceneOf(state);
  const own = Object.values(state.actors ?? {}).filter(
    (actor) => actor?.kind === "character" && assigned(actor, role) && isActorAvailable(actor),
  );
  const onScene = own.find((actor) => scene?.tokens?.some((t) => t.actorId === actor.id));
  return (onScene ?? own[0])?.id ?? null;
}
export function authorName(state, entry, lang = "it") {
  const actor = entry?.asActorId && state.actors?.[entry.asActorId];
  if (actor && canViewActor(actor, "player", state)) return actor.name;
  if (entry?.author === "dm") return "DM";
  return lang === "en" ? "Player" : "Giocatore";
}

/** Same public rule as the Table's canObserve: hidden tokens reach only their controllers. */
export function observable(state, scene, actorId, role) {
  const actor = state.actors?.[actorId];
  const token = scene?.tokens?.find((entry) => entry.actorId === actorId);
  return Boolean(
    actor &&
    token &&
    isActorAvailable(actor) &&
    (!actor.companion || canViewActor(actor, role, state)) &&
    (actor.visibility !== "private" || canViewActor(actor, role, state)) &&
    (canControlActor(actor, role, state) ||
      (!actor.hidden && !token.hidden && token.visible !== false)),
  );
}

// ---------------------------------------------------------------- drawings (TV-122)

function onScene(state, sceneId) {
  const scene = sceneOf(state, sceneId);
  if (!scene) fail("Scena non trovata.", "Scene not found.");
  return scene;
}
const clampPoint = (scene, p) => ({
  x: round(Math.max(0, Math.min(scene.width, p.x)), 1),
  y: round(Math.max(0, Math.min(scene.height, p.y)), 1),
});
const MAX_FREE_POINTS = 400;

export function addMark(state, role, input, { perms = DEFAULT_PERMISSIONS, now } = {}) {
  requirePermission("draw", role, perms);
  const scene = onScene(state, input?.sceneId);
  if (!MARK_KINDS.includes(input?.kind))
    fail("Tipo di disegno non valido.", "Invalid drawing kind.");
  const pts = points(input.points).map((p) => clampPoint(scene, p));
  const text = str(input.text).trim();
  if (input.kind === "text") {
    if (!text) fail("Scrivi un testo.", "Write some text.");
    if (text.length > 140)
      fail("Il testo supera 140 caratteri.", "The text exceeds 140 characters.");
    if (pts.length !== 1) fail("Il testo ha bisogno di un punto.", "Text needs one point.");
  } else if (input.kind === "free") {
    if (pts.length < 2) fail("Tratto troppo corto.", "Stroke too short.");
  } else {
    if (pts.length !== 2 || Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) < 4)
      fail("Trascina per disegnare la forma.", "Drag to draw the shape.");
  }
  const width =
    Number.isInteger(input.width) && input.width >= 1 && input.width <= 5 ? input.width : 2;
  if (!colourIds.has(input.color)) fail("Colore non disponibile.", "Colour not available.");
  const mark = {
    id: uid(),
    sceneId: scene.id,
    kind: input.kind,
    points: input.kind === "free" ? thin(pts) : pts,
    text: input.kind === "text" ? text : "",
    color: input.color,
    width,
    author: role,
    asActorId: identity(input.asActorId),
    hidden: false,
    createdAt: now ?? new Date().toISOString(),
  };
  sliceOf(state).marks.push(mark);
  return mark;
}
// Keep a freehand stroke light: drop points closer than 2 px, cap the count.
function thin(pts) {
  const out = [pts[0]];
  for (const p of pts.slice(1))
    if (Math.hypot(p.x - out.at(-1).x, p.y - out.at(-1).y) >= 2) out.push(p);
  if (out.length < 2) out.push(pts.at(-1));
  if (out.length <= MAX_FREE_POINTS) return out;
  const step = out.length / MAX_FREE_POINTS;
  return Array.from({ length: MAX_FREE_POINTS }, (_, i) => out[Math.floor(i * step)]).concat(
    out.at(-1),
  );
}
const canEditOwn = (entry, role) => role === "dm" || entry.author === role;
function findMark(state, id) {
  const mark = sliceOf(state).marks.find((entry) => entry.id === id);
  if (!mark) fail("Disegno non trovato.", "Drawing not found.");
  return mark;
}
export function removeMark(state, role, id) {
  const mark = findMark(state, id);
  if (!canEditOwn(mark, role))
    fail(
      "Puoi cancellare solo i tuoi disegni: l'autore ne è il proprietario.",
      "You can erase only your own drawings: the author owns them.",
    );
  const slice = sliceOf(state);
  slice.marks = slice.marks.filter((entry) => entry.id !== id);
  return mark;
}
/** Foundry "Clear": removes only this identity's drawings on the scene. */
export function clearMine(state, role, sceneId) {
  const slice = sliceOf(state);
  const mine = slice.marks.filter((entry) => entry.sceneId === sceneId && entry.author === role);
  if (!mine.length) fail("Non hai disegni su questa scena.", "You have no drawings on this scene.");
  slice.marks = slice.marks.filter((entry) => !mine.includes(entry));
  return mine.length;
}
/** DDB "Clear All": the DM removes every drawing on the scene. */
export function clearAll(state, role, sceneId) {
  if (role !== "dm")
    fail("Solo il DM può cancellare tutti i disegni.", "Only the DM can clear all drawings.");
  const slice = sliceOf(state);
  const count = slice.marks.filter((entry) => entry.sceneId === sceneId).length;
  if (!count) fail("Nessun disegno su questa scena.", "No drawings on this scene.");
  slice.marks = slice.marks.filter((entry) => entry.sceneId !== sceneId);
  return count;
}
/** Foundry: the GM hides a drawing (right-click); hidden drawings reach only the DM. */
export function setMarkHidden(state, role, id, hidden) {
  if (role !== "dm") fail("Solo il DM può nascondere i disegni.", "Only the DM can hide drawings.");
  const mark = findMark(state, id);
  mark.hidden = hidden === true;
  return mark;
}
export function visibleMarks(state, sceneId, role) {
  return readSlice(state)
    .marks.filter((mark) => mark.sceneId === sceneId && (!mark.hidden || role === "dm"))
    .map((mark) => ({ ...mark, own: mark.author === role, canErase: canEditOwn(mark, role) }));
}

// ---------------------------------------------------------------- templates (TV-41)

const MAX_AREA_M = 150;
function validArea(scene, input, shapes) {
  if (!shapes.includes(input?.shape)) fail("Forma non valida.", "Invalid shape.");
  const origin = point(input.origin);
  if (!origin || origin.x < 0 || origin.y < 0 || origin.x > scene.width || origin.y > scene.height)
    fail("Punto d'origine fuori dalla scena.", "Point of origin outside the scene.");
  const size = num(input.size);
  if (size === null || size < 0.5 || size > MAX_AREA_M)
    fail("Dimensione fra 0,5 e 150 m.", "Size between 0.5 and 150 m.");
  const width = num(input.width) ?? 1.5;
  if (width < 0.5 || width > 30) fail("Larghezza fra 0,5 e 30 m.", "Width between 0.5 and 30 m.");
  return {
    shape: input.shape,
    origin,
    angle: round((((num(input.angle) ?? 0) % 360) + 360) % 360, 2),
    size: round(size, 2),
    width: round(width, 2),
  };
}
export function addTemplate(state, role, input, { perms = DEFAULT_PERMISSIONS, now } = {}) {
  requirePermission("template", role, perms);
  const scene = onScene(state, input?.sceneId);
  const area = validArea(scene, input, TEMPLATE_SHAPES);
  if (input.hidden === true && role !== "dm")
    fail("Solo il DM può nascondere una sagoma.", "Only the DM can hide a template.");
  if (!colourIds.has(input.color)) fail("Colore non disponibile.", "Colour not available.");
  const template = {
    id: uid(),
    sceneId: scene.id,
    ...area,
    color: input.color,
    pattern: patternIds.has(input.pattern) ? input.pattern : "none",
    label: str(input.label).trim().slice(0, 60),
    hidden: input.hidden === true,
    locked: false,
    author: role,
    asActorId: identity(input.asActorId),
    createdAt: now ?? new Date().toISOString(),
  };
  sliceOf(state).templates.push(template);
  return template;
}
export function findTemplate(state, id) {
  const template = sliceOf(state).templates.find((entry) => entry.id === id);
  if (!template) fail("Sagoma non trovata.", "Template not found.");
  return template;
}
const TEMPLATE_KEYS = [
  "origin",
  "angle",
  "size",
  "width",
  "color",
  "pattern",
  "label",
  "hidden",
  "locked",
];
/** A DM lock stays until the DM removes it (DDB-118: the DM decides about locks). */
export const lockedByDm = (template, role) =>
  template.locked === true && template.lockedBy === "dm" && role !== "dm";
/**
 * DDB per-overlay menu: visibility, colour, pattern; handles; Shift+L lock (DDB-118).
 * With the campaign's player templates switched off a player can no longer change a
 * template (deleting their own stays possible).
 */
export function updateTemplate(state, role, id, patch, { perms = DEFAULT_PERMISSIONS } = {}) {
  const template = findTemplate(state, id);
  if (template.hidden && role !== "dm") fail("Sagoma non trovata.", "Template not found.");
  if (!canEditOwn(template, role))
    fail(
      "Solo chi l'ha creata o il DM può modificare questa sagoma.",
      "Only its creator or the DM can change this template.",
    );
  const keys = Object.keys(patch ?? {}).filter((key) => TEMPLATE_KEYS.includes(key));
  if (!keys.length) return template;
  requirePermission("template", role, perms);
  if (keys.includes("locked") && lockedByDm(template, role))
    fail(
      "Bloccata dal DM: solo il DM può sbloccarla.",
      "Locked by the DM: only the DM can unlock it.",
    );
  if (template.locked && keys.some((key) => key !== "locked"))
    fail("Sagoma bloccata: sbloccala per modificarla.", "Template locked: unlock it to change it.");
  if (keys.includes("hidden") && role !== "dm")
    fail(
      "Solo il DM può nascondere o rivelare una sagoma.",
      "Only the DM can hide or reveal a template.",
    );
  if (keys.includes("color") && !colourIds.has(patch.color))
    fail("Colore non disponibile.", "Colour not available.");
  if (keys.includes("pattern") && !patternIds.has(patch.pattern))
    fail("Motivo non disponibile.", "Pattern not available.");
  const scene = onScene(state, template.sceneId);
  const area = validArea(
    scene,
    { ...template, ...pick(patch, ["origin", "angle", "size", "width"]) },
    TEMPLATE_SHAPES,
  );
  Object.assign(template, area);
  if (keys.includes("color")) template.color = patch.color;
  if (keys.includes("pattern")) template.pattern = patch.pattern;
  if (keys.includes("label")) template.label = str(patch.label).trim().slice(0, 60);
  if (keys.includes("hidden")) template.hidden = patch.hidden === true;
  if (keys.includes("locked")) {
    template.locked = patch.locked === true;
    template.lockedBy = template.locked ? role : null;
  }
  return template;
}
/**
 * A dragged template size in D&D steps: a multiple of one grid cell (1,5 m / 5 ft), at
 * least one cell, as templates snap to the grid in Foundry (FVT-116). `free` keeps the
 * dragged value (tenths of a metre).
 */
export function snapSize(scene, meters, free = false) {
  if (free) return Math.max(0.5, round(meters, 1));
  const cell = cellM(scene);
  return round(Math.max(1, Math.round(meters / cell)) * cell, 2);
}
const pick = (object, keys) =>
  Object.fromEntries(
    keys.filter((key) => object?.[key] !== undefined).map((key) => [key, object[key]]),
  );
export function removeTemplate(state, role, id) {
  const template = findTemplate(state, id);
  if (template.hidden && role !== "dm") fail("Sagoma non trovata.", "Template not found.");
  if (!canEditOwn(template, role))
    fail(
      "Solo chi l'ha creata o il DM può eliminarla.",
      "Only its creator or the DM can delete it.",
    );
  if (template.locked)
    fail(
      "Sagoma bloccata: sbloccala prima di eliminarla.",
      "Template locked: unlock it before deleting it.",
    );
  const slice = sliceOf(state);
  slice.templates = slice.templates.filter((entry) => entry.id !== id);
  return template;
}
export function visibleTemplates(state, sceneId, role) {
  return readSlice(state)
    .templates.filter((entry) => entry.sceneId === sceneId && (!entry.hidden || role === "dm"))
    .map((entry) => ({ ...entry, canEdit: canEditOwn(entry, role) }));
}
export function templateAt(state, sceneId, role, p) {
  const scene = sceneOf(state, sceneId);
  return (
    visibleTemplates(state, sceneId, role)
      .reverse()
      .find((entry) => areaContains(scene, entry, p)) ?? null
  );
}

// ---------------------------------------------------------------- shared measurements (TV-37/38)

/** Roll20 broadcast: one shared measurement per author and scene; the newest replaces it. */
export function shareMeasure(state, role, input, { now } = {}) {
  const scene = onScene(state, input?.sceneId);
  let measure;
  if (input.shape === "line") {
    const pts = points(input.points).map((p) => clampPoint(scene, p));
    if (pts.length < 2 || polylineLengthM(scene, pts) <= 0)
      fail(
        "Misura vuota: trascina o aggiungi un punto.",
        "Empty measurement: drag or add a point.",
      );
    measure = { shape: "line", points: pts.slice(0, 20) };
  } else if (input.shape === "rings") {
    const origin = point(input.origin);
    if (!origin) fail("Anelli senza centro.", "Rings without a centre.");
    measure = {
      shape: "rings",
      origin: clampPoint(scene, origin),
      radii: parseRingPresets((input.radii ?? []).join(";")),
      theme: Object.hasOwn(RING_THEMES, input.theme) ? input.theme : "standard",
      actorId: identity(input.actorId),
    };
  } else measure = validArea(scene, input, ["circle", "cone", "square"]);
  const slice = sliceOf(state);
  slice.measures = slice.measures.filter(
    (entry) => !(entry.sceneId === scene.id && entry.author === role),
  );
  const shared = {
    id: uid(),
    sceneId: scene.id,
    ...measure,
    author: role,
    asActorId: identity(input.asActorId),
    createdAt: now ?? new Date().toISOString(),
  };
  slice.measures.push(shared);
  return shared;
}
export function removeSharedMeasure(state, role, id) {
  const slice = sliceOf(state);
  const measure = slice.measures.find((entry) => entry.id === id);
  if (!measure) fail("Misura non trovata.", "Measurement not found.");
  if (!canEditOwn(measure, role))
    fail("Puoi togliere solo le tue misure.", "You can remove only your own measurements.");
  slice.measures = slice.measures.filter((entry) => entry.id !== id);
  return measure;
}
/**
 * Shared measurements are not game actions (Roll20's broadcast is transient): their
 * commands are not undoable and a gameplay Undo keeps the current ones (slice afterUndo).
 */
export function preserveMeasures(current, restored) {
  const now = current?.ext?.[ID];
  const back = restored?.ext?.[ID];
  if (!now || !back) return;
  back.measures = structuredClone(now.measures ?? []);
}
export function ownSharedMeasure(state, sceneId, role) {
  return (
    readSlice(state).measures.find((entry) => entry.sceneId === sceneId && entry.author === role) ??
    null
  );
}
export function visibleMeasures(state, sceneId, role) {
  return readSlice(state)
    .measures.filter((entry) => entry.sceneId === sceneId)
    .map((entry) => ({ ...entry, own: entry.author === role }));
}

/** Label of a measurement or template in metres: "Cono 4,5 m", "7,5 m · 2 tratti". */
export function measureSummary(scene, measure, lang = "it") {
  const nf = (value) =>
    new Intl.NumberFormat(lang === "it" ? "it-IT" : "en-GB", { maximumFractionDigits: 1 }).format(
      value,
    );
  const t = (it, en) => (lang === "it" ? it : en);
  if (measure.shape === "line") {
    const legs = measure.points.length - 1;
    const total = polylineLengthM(scene, measure.points);
    return legs > 1
      ? `${nf(total)} m · ${legs} ${t("tratti", "legs")}`
      : `${t("Misura diretta", "Direct measurement")}: ${nf(total)} m`;
  }
  if (measure.shape === "rings") return measure.radii.map((r) => nf(r) + " m").join(" · ");
  const name = SHAPE_LABELS[measure.shape]?.[lang] ?? measure.shape;
  const what =
    measure.shape === "circle"
      ? t("raggio", "radius")
      : measure.shape === "square"
        ? t("lato", "side")
        : t("lunghezza", "length");
  return `${name} · ${what} ${nf(measure.size)} m`;
}

// ---------------------------------------------------------------- auras (TV-23)

// SRD 5.2.1 creature space (EN 13 / IT 14) in cells; B12 stores a token size override.
const SPACE_CELLS = { tiny: 0.5, small: 1, medium: 1, large: 2, huge: 3, gargantuan: 4 };
export function tokenSpaceCells(state, token) {
  const size = state?.ext?.["token-menu"]?.tokens?.[token?.id]?.size;
  return SPACE_CELLS[size] ?? 1;
}
/**
 * An Emanation extends from the creature in every direction and moves with it (SRD EN 181 /
 * IT 207): the drawn radius is the distance plus half the creature's space.
 */
export function auraRadiusPx(state, scene, token, meters) {
  return mToPx(scene, meters) + (tokenSpaceCells(state, token) * cellPx(scene)) / 2;
}
export const MAX_AURAS_PER_TOKEN = 2; // Roll20 Token Features: two auras (R20-133)
export function setAura(state, role, input) {
  const actor = state.actors?.[input?.actorId];
  if (!actor || !canControlActor(actor, role, state))
    fail(
      "Puoi aggiungere aure solo alle creature che controlli.",
      "You can add auras only to creatures you control.",
    );
  const radius = num(Number(input.radius));
  if (radius === null || radius < 0.5 || radius > 60)
    fail("Distanza dell'aura fra 0,5 e 60 m.", "Aura distance between 0.5 and 60 m.");
  if (!colourIds.has(input.color)) fail("Colore non disponibile.", "Colour not available.");
  const slice = sliceOf(state);
  const existing = input.id ? slice.auras.find((entry) => entry.id === input.id) : null;
  if (input.id && (!existing || (existing.audience === "me" && existing.author !== role)))
    fail("Aura non trovata.", "Aura not found.");
  if (existing && !canEditOwn(existing, role))
    fail(
      "Solo chi l'ha creata o il DM può cambiarla.",
      "Only its creator or the DM can change it.",
    );
  // The limit counts the auras this identity sees: another identity's "Only me" aura
  // neither counts nor gets revealed by a refusal.
  if (!existing && aurasOf(state, actor.id, role).length >= MAX_AURAS_PER_TOKEN)
    fail(
      "Al massimo due aure per pedina: modificane o rimuovine una.",
      "At most two auras per token: change or remove one.",
    );
  const aura = existing ?? { id: uid(), actorId: actor.id, author: role };
  Object.assign(aura, {
    radius: round(radius, 2),
    shape: input.shape === "square" ? "square" : "circle",
    color: input.color,
    opacity: Math.min(0.6, Math.max(0.1, Number(input.opacity) || 0.25)),
    audience: input.audience === "me" ? "me" : "all",
    label: str(input.label).trim().slice(0, 40),
  });
  if (!existing) slice.auras.push(aura);
  return aura;
}
export function removeAura(state, role, id) {
  const slice = sliceOf(state);
  const aura = slice.auras.find((entry) => entry.id === id);
  if (!aura) fail("Aura non trovata.", "Aura not found.");
  if (!canEditOwn(aura, role) || (aura.audience === "me" && aura.author !== role))
    fail(
      "Solo chi l'ha creata o il DM può toglierla.",
      "Only its creator or the DM can remove it.",
    );
  slice.auras = slice.auras.filter((entry) => entry.id !== id);
  return aura;
}
/** Auras to draw, each at its token's current position ("follows the token"). */
export function visibleAuras(state, sceneId, role) {
  const scene = sceneOf(state, sceneId);
  if (!scene) return [];
  return readSlice(state).auras.flatMap((aura) => {
    if (aura.audience === "me" && aura.author !== role) return [];
    if (!observable(state, scene, aura.actorId, role)) return [];
    const token = scene.tokens.find((entry) => entry.actorId === aura.actorId);
    return [{ ...aura, x: token.x, y: token.y, r: auraRadiusPx(state, scene, token, aura.radius) }];
  });
}
export function aurasOf(state, actorId, role) {
  return readSlice(state).auras.filter(
    (aura) => aura.actorId === actorId && (aura.audience === "all" || aura.author === role),
  );
}

// ---------------------------------------------------------------- tooltips (TV-123)

/** One note per token and author (Owlbear Tooltips); "Solo io" never reaches others. */
export function setTooltip(state, role, input, { now } = {}) {
  const scene = sceneOf(state);
  const actor = state.actors?.[input?.actorId];
  if (!actor || !observable(state, scene, actor.id, role))
    fail("Pedina non disponibile.", "Token not available.");
  const text = str(input.text).trim();
  if (!text) fail("Scrivi la nota o usa Rimuovi.", "Write the note or use Remove.");
  if (text.length > 280) fail("La nota supera 280 caratteri.", "The note exceeds 280 characters.");
  const slice = sliceOf(state);
  const existing = slice.tooltips.find(
    (entry) => entry.actorId === actor.id && entry.author === role,
  );
  const tooltip = existing ?? { id: uid(), actorId: actor.id, author: role };
  Object.assign(tooltip, {
    text,
    audience: input.audience === "me" ? "me" : "all",
    // The character played when writing (Livia, or Mira if selected): kept as written.
    asActorId: identity(input.asActorId),
    updatedAt: now ?? new Date().toISOString(),
  });
  if (!existing) slice.tooltips.push(tooltip);
  return tooltip;
}
export function removeTooltip(state, role, id) {
  const slice = sliceOf(state);
  const tooltip = slice.tooltips.find((entry) => entry.id === id);
  if (!tooltip || (tooltip.audience === "me" && tooltip.author !== role))
    fail("Nota non trovata.", "Note not found.");
  if (!canEditOwn(tooltip, role))
    fail("Puoi togliere solo le tue note.", "You can remove only your own notes.");
  slice.tooltips = slice.tooltips.filter((entry) => entry.id !== id);
  return tooltip;
}
export function visibleTooltips(state, actorId, role) {
  const scene = sceneOf(state);
  if (!observable(state, scene, actorId, role)) return [];
  return readSlice(state)
    .tooltips.filter(
      (entry) => entry.actorId === actorId && (entry.audience === "all" || entry.author === role),
    )
    .map((entry) => ({ ...entry, own: entry.author === role, canRemove: canEditOwn(entry, role) }));
}

// ---------------------------------------------------------------- elevation and distances (TV-39)

export function elevationOf(state, tokenId) {
  return readSlice(state).elevations?.[tokenId] ?? 0;
}
export function setElevation(state, role, { sceneId, tokenId, meters }) {
  const scene = onScene(state, sceneId);
  const token = scene.tokens.find((entry) => entry.id === tokenId);
  const actor = token && state.actors?.[token.actorId];
  if (!actor || !canControlActor(actor, role, state))
    fail(
      "Puoi impostare la quota solo delle creature che controlli.",
      "You can set the elevation only of creatures you control.",
    );
  const value = num(Number(meters));
  if (value === null || Math.abs(value) > 300)
    fail("Quota fra −300 e 300 m.", "Elevation between −300 and 300 m.");
  const slice = sliceOf(state);
  if (value === 0) delete slice.elevations[tokenId];
  else slice.elevations[tokenId] = round(value, 2);
  return value;
}
/**
 * Battle Board list (VTL-137): straight-line distances from one token to every other token
 * this identity can observe, elevation included, nearest first; "touch" when within one
 * cell (1,5 m, the 5-foot reach). Centre to centre, as combat ranges in this prototype.
 */
export function distanceRows(state, sceneId, fromActorId, role) {
  const scene = sceneOf(state, sceneId);
  const from = scene?.tokens?.find((entry) => entry.actorId === fromActorId);
  if (!from || !observable(state, scene, fromActorId, role)) return [];
  const fromZ = elevationOf(state, from.id);
  return scene.tokens
    .filter(
      (token) => token.actorId !== fromActorId && observable(state, scene, token.actorId, role),
    )
    .map((token) => {
      const horizontal = distanceM(scene, from, token);
      const dz = elevationOf(state, token.id) - fromZ;
      const meters = Math.hypot(horizontal, dz);
      return {
        actorId: token.actorId,
        tokenId: token.id,
        name: state.actors[token.actorId].name,
        meters: round(meters, 2),
        horizontal: round(horizontal, 2),
        dz: round(dz, 2),
        touch: meters <= cellM(scene) + 0.01,
      };
    })
    .sort((a, b) => a.meters - b.meters || a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------- transient signals (TV-118/120/121)

// Lifetimes. The pointer trail and a broadcast drag measurement are renewed while the
// button is held and hide shortly after release (Roll20 pointer auto-hides, R20-137;
// Owlbear/DDB drag rulers go on release, VTL-135/DDB-124). Pings: the census gives no
// duration, 30 s leave time to switch "Visit as" in this two-identity demo.
export const SIGNAL_TTL = Object.freeze({
  ping: 30000,
  alert: 30000,
  laser: 2000,
  measure: 2000,
  recall: 120000,
  tooltip: 10000,
});
const SIGNAL_KINDS = Object.keys(SIGNAL_TTL);
const MAX_SIGNALS = 40;

/**
 * In-memory broadcast of short-lived signals: pings and alert pings in the author's colour
 * (Foundry FVT-157), the laser trail (Owlbear VTL-146, DDB Point DDB-125), recall-view
 * proposals the recipient accepts or ignores (VTL-183 opt-in; never forced: F-051 boundary),
 * and a tooltip shown to everyone briefly (VTL-106). Nothing is persisted or undone.
 */
export function createSignalBus({ clock = () => Date.now() } = {}) {
  let list = [];
  const prune = () => {
    const now = clock();
    list = list.filter((signal) => signal.expiresAt > now).slice(-MAX_SIGNALS);
  };
  return {
    send(input) {
      if (!SIGNAL_KINDS.includes(input?.kind)) fail("Segnale non valido.", "Invalid signal.");
      if (input.kind === "recall" && input.from !== "dm")
        fail("Solo il DM può proporre di guardare un punto.", "Only the DM can propose a view.");
      const p = point(input);
      if (input.kind !== "tooltip" && !p)
        fail("Segnale senza posizione.", "Signal without a position.");
      // A broadcast drag measurement (Roll20 Measure broadcast, R20-136): the same shapes
      // as a shared measurement, valid for this scene.
      const measure =
        input.kind === "measure"
          ? normalizeMeasure({ ...input.measure, author: input.from, sceneId: input.sceneId })
          : null;
      if (input.kind === "measure" && !measure) fail("Misura non valida.", "Invalid measurement.");
      prune();
      const now = clock();
      const signal = {
        id: uid(),
        kind: input.kind,
        from: input.from,
        name: str(input.name) || (input.from === "dm" ? "DM" : "?"),
        colour: input.kind === "alert" ? ALERT_COLOUR : identityColour(input.from),
        sceneId: str(input.sceneId),
        x: p?.x ?? 0,
        y: p?.y ?? 0,
        trail: input.kind === "laser" ? points(input.trail).slice(-120) : [],
        measure,
        zoom: num(input.zoom) ?? 1,
        actorId: identity(input.actorId),
        tooltipId: identity(input.tooltipId),
        at: now,
        expiresAt: now + SIGNAL_TTL[input.kind],
        answers: {},
      };
      if (input.kind === "laser" || input.kind === "measure")
        list = list.filter((s) => !(s.kind === input.kind && s.from === signal.from));
      if (input.kind === "recall")
        list = list.filter((s) => !(s.kind === "recall" && s.from === signal.from));
      list.push(signal);
      return { ...signal };
    },
    /** Signals this viewer receives on this scene (a proposal goes to the others). */
    live(sceneId, viewer) {
      prune();
      return list
        .filter((signal) => signal.sceneId === sceneId || signal.kind === "tooltip")
        .filter(
          (signal) => signal.kind !== "recall" || signal.from === viewer || !signal.answers[viewer],
        )
        .map((signal) => ({
          ...signal,
          answers: { ...signal.answers },
          own: signal.from === viewer,
        }));
    },
    pendingRecall(viewer) {
      prune();
      return (
        list.find(
          (signal) => signal.kind === "recall" && signal.from !== viewer && !signal.answers[viewer],
        ) ?? null
      );
    },
    lastRecallBy(viewer) {
      prune();
      return list.findLast((signal) => signal.kind === "recall" && signal.from === viewer) ?? null;
    },
    respond(id, viewer, answer) {
      const signal = list.find((entry) => entry.id === id && entry.kind === "recall");
      if (!signal) fail("La proposta è scaduta.", "The proposal has expired.");
      if (signal.from === viewer) fail("È la tua proposta.", "This is your own proposal.");
      if (!["accepted", "declined"].includes(answer))
        fail("Risposta non valida.", "Invalid answer.");
      signal.answers[viewer] = answer;
      return { ...signal, answers: { ...signal.answers } };
    },
    clear() {
      list = [];
    },
    size: () => list.length,
  };
}
