// B35 — Fog, lights and vision: pure domain (no DOM).
//
// Manual fog (D&D Beyond Maps fog DDB-121, Owlbear fog tools VTL-066/067), lights and
// magical darkness (Foundry FVT-077/159, Roll20 R20-093–095), vision from the sheet's
// senses (Fantasy Grounds R20-122, Smoke & Spectre VTL-142, AboveVTT VTL-144), barrier
// types (Foundry FVT-075, FG R20-120) and explored memory per player or shared (census C7).
// Rules: SRD 5.2.1 (2024) "Vision and Light", Darkvision, Blinded, Torch, lanterns, Darkness.
// Geometry comes from the scene's walls and doors (increment 4, spatial.mjs).
import { visibilityPolygon, validateSceneGeometry, previewTokenPlacement } from "./spatial.mjs";
import { hasCondition } from "./conditions.mjs";
import { isActorAvailable, isCampaignActor } from "./character-access.mjs";
import { runsSession } from "./table-spatial.mjs";

export const ID = "fog-vision";
export const VERSION = 1;
export const TOWER_SCENE_ID = "lantern-tower";

const L = (it, en) => Object.freeze({ it, en });
const copy = (value) => structuredClone(value);
const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36);
const fail = (it, en) => {
  throw Object.assign(new Error(en), { it, en });
};
const EPS = 1e-6;

// ------------------------------------------------------------------------------ sources

const EN_URL = "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf";
const IT_URL = "https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf";
const EN_SHA = "8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87";
const IT_SHA = "a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718";
const srd = (en, it) =>
  Object.freeze({
    kind: "srd",
    edition: "2024",
    revision: "5.2.1",
    sha256: EN_SHA,
    url: EN_URL,
    pages: Object.freeze(en),
    en: Object.freeze({ url: EN_URL, sha256: EN_SHA, pages: Object.freeze(en) }),
    it: Object.freeze({ url: IT_URL, sha256: IT_SHA, pages: Object.freeze(it) }),
  });
// Pages checked on the local copies whose sha256 are above (24/09/2026).
export const SOURCES = Object.freeze({
  visionAndLight: srd([11], [12]),
  creatureSize: srd([14], [16]),
  speciesDarkvision: srd([84, 85, 86], [94, 95, 96, 97]),
  lanterns: srd([98], [110]),
  torch: srd([100], [113]),
  darkness: srd([122], [170]),
  blinded: srd([177], [202]),
  cone: srd([179], [206]),
  darkvision: srd([180], [215]),
  truesight: srd([190], [219]),
});
const AUTHORED = Object.freeze({
  kind: "authored-demo",
  edition: "2024",
  revision: "blueprint-b35-v1",
  note: "Synthetic example data; not a real campaign.",
});
export const sourcePages = (source, lang = "it") =>
  source?.kind === "srd"
    ? `SRD 5.2.1 · ${lang === "it" ? "IT p. " + source.it.pages.join("–") : "EN p. " + source.en.pages.join("–")}`
    : lang === "it"
      ? "Dati d’esempio"
      : "Example data";

// ------------------------------------------------------------------------------ tables

/** Brush sizes as creature sizes (DDB-121), SRD 5.2.1 Creature Size and Space (m). */
export const BRUSH_SIZES = Object.freeze([
  ["tiny", 0.75, L("Minuscola", "Tiny")],
  ["medium", 1.5, L("Media", "Medium")],
  ["large", 3, L("Grande", "Large")],
  ["huge", 4.5, L("Enorme", "Huge")],
  ["gargantuan", 6, L("Mastodontica", "Gargantuan")],
]);
export const brushMeters = (size) => BRUSH_SIZES.find(([id]) => id === size)?.[1] ?? 1.5;

// SRD light sources (2024; metres as in the Italian SRD, 20 ft = 6 m). `dim` is the
// additional ring beyond the bright radius. The Bullseye Lantern casts a Cone (SRD cone:
// width equal to the distance, about 53°). Darkness: 15-ft (4.5 m) Sphere, magical.
export const CONE_ANGLE = (2 * Math.atan(0.5) * 180) / Math.PI;
export const LIGHT_PRESETS = Object.freeze({
  torch: Object.freeze({
    name: L("Torcia", "Torch"),
    bright: 6,
    dim: 6,
    color: "#f2b25c",
    source: SOURCES.torch,
  }),
  lamp: Object.freeze({
    name: L("Lampada", "Lamp"),
    bright: 4.5,
    dim: 9,
    color: "#f4c877",
    source: SOURCES.lanterns,
  }),
  "hooded-lantern": Object.freeze({
    name: L("Lanterna schermabile", "Hooded lantern"),
    bright: 9,
    dim: 9,
    color: "#f4c877",
    source: SOURCES.lanterns,
  }),
  "bullseye-lantern": Object.freeze({
    name: L("Lanterna a lente sporgente", "Bullseye lantern"),
    bright: 18,
    dim: 18,
    cone: true,
    color: "#f7d58f",
    source: SOURCES.lanterns,
  }),
  darkness: Object.freeze({
    name: L("Oscurità (incantesimo)", "Darkness (spell)"),
    bright: 4.5,
    dim: 0,
    magical: true,
    color: "#2a1d3d",
    source: SOURCES.darkness,
  }),
  custom: Object.freeze({
    name: L("Luce personalizzata", "Custom light"),
    bright: 3,
    dim: 3,
    color: "#9fd0ff",
    source: AUTHORED,
  }),
});
export const LIGHT_COLOURS = Object.freeze([
  ["#f2b25c", L("Fiamma", "Flame")],
  ["#f4c877", L("Olio", "Oil")],
  ["#9fd0ff", L("Luna", "Moon")],
  ["#b7f0a0", L("Fuoco fatuo", "Will-o’-wisp")],
  ["#e58cff", L("Arcano", "Arcane")],
]);

/** Day/night cycle (Foundry transitions FVT-159, FG ambient presets R20-121). */
export const PHASES = Object.freeze([
  ["day", "bright", L("Giorno", "Day")],
  ["dusk", "dim", L("Crepuscolo", "Dusk")],
  ["night", "dark", L("Notte", "Night")],
  ["dawn", "dim", L("Alba", "Dawn")],
]);
// PR-25 (Foundry's darkness linked to the world time, Fantasy Grounds lighting presets): a
// scene may follow the campaign's narrative clock, and the night's veil has a colour and an
// intensity. Colour and intensity change the look only: the SRD light levels (bright, dim,
// darkness) still come from the time of day.
export const AMBIENT_TINTS = Object.freeze([
  ["#050912", L("Notte neutra", "Neutral night")],
  ["#0b1b3f", L("Chiaro di luna", "Moonlight")],
  ["#3a1d08", L("Tramonto", "Sunset")],
  ["#0d2616", L("Palude", "Swamp")],
  ["#2e0707", L("Inferno", "Hellish")],
]);
export const AMBIENT_INTENSITIES = Object.freeze([50, 75, 100, 125, 150]);
/** The time of day at an hour (0–24) of game time. */
export function phaseAtHour(hour) {
  const h = ((Number(hour) % 24) + 24) % 24;
  if (h >= 5 && h < 7) return "dawn";
  if (h >= 7 && h < 18) return "day";
  if (h >= 18 && h < 20) return "dusk";
  return "night";
}
/** The hour of the campaign's narrative clock (rest-time), from the calendar's start. */
export function narrativeHour(state) {
  const id = state?.campaign?.id;
  const seconds = Number(state?.restTime?.clocks?.[id]?.seconds) || 0;
  const epoch = state?.ext?.["world-map"]?.campaigns?.[id]?.calendar?.epoch;
  const start = epoch ? (epoch.hour ?? 0) * 3600 + (epoch.minute ?? 0) * 60 : 8 * 3600;
  return ((((start + seconds) % 86400) + 86400) % 86400) / 3600;
}
/** The time of day a scene shows: its own, or the narrative clock's when it follows it. */
export function effectivePhase(state, sceneId) {
  const cfg = sceneConfig(state, sceneId);
  return cfg.followTime ? phaseAtHour(narrativeHour(state)) : cfg.phase;
}
export const LEVEL_NAMES = Object.freeze({
  bright: L("Luce intensa", "Bright light"),
  dim: L("Luce fioca", "Dim light"),
  dark: L("Oscurità", "Darkness"),
});

/** Barrier types (Foundry wall types FVT-075, Fantasy Grounds LOS modes R20-120). */
export const BARRIER_TYPES = Object.freeze([
  [
    "wall",
    L("Muro", "Wall"),
    { blocksMovement: true, blocksSight: true, blocksEffect: true },
    L("Blocca movimento, vista e linea d’effetto.", "Blocks movement, sight and line of effect."),
  ],
  [
    "window",
    L("Finestra", "Window"),
    { blocksMovement: true, blocksSight: false, blocksEffect: true },
    L(
      "Si vede attraverso, non si passa e non si attacca attraverso.",
      "See through it; no passing or attacking through it.",
    ),
  ],
  [
    "one-way",
    L("Unidirezionale", "One-way"),
    { blocksMovement: true, blocksSight: true, blocksEffect: true },
    L(
      "Blocca la vista da un lato solo: dall’altro si vede attraverso. Non si passa né si attacca attraverso.",
      "Blocks sight from one side only: from the other you see through it. No passing or attacking through it.",
    ),
  ],
  [
    "illusory",
    L("Illusoria", "Illusory"),
    { blocksMovement: false, blocksSight: true, blocksEffect: false },
    L("Nasconde la vista ma si attraversa.", "Hides sight but can be walked through."),
  ],
  [
    "invisible",
    L("Invisibile", "Invisible"),
    { blocksMovement: true, blocksSight: false, blocksEffect: false },
    L("Non si vede: ferma solo il movimento.", "Cannot be seen: it only stops movement."),
  ],
  // R3 PR-22 (Foundry wall restrictions: Limited and Proximity sight). The restriction is a
  // sight rule only (spatial.mjs): movement and line of effect keep the flags below.
  [
    "terrain",
    L("Terreno (limitata)", "Terrain (limited)"),
    { blocksMovement: false, blocksSight: true, blocksEffect: false, sightMode: "limited" },
    L(
      "Blocca vista e luce solo se la linea ne attraversa due o più (erba alta, tende sottili). Si attraversa.",
      "Blocks sight and light only when a line crosses two or more (tall grass, thin curtains). Can be walked through.",
    ),
  ],
  [
    "proximity",
    L("Prossimità", "Proximity"),
    {
      blocksMovement: true,
      blocksSight: true,
      blocksEffect: true,
      sightMode: "proximity",
      proximityMeters: 3,
    },
    L(
      "Blocca la vista, salvo a chi è entro la distanza indicata (una grata, una siepe fitta). Non si passa.",
      "Blocks sight unless the viewer is within the set distance (a grille, a thick hedge). No passing.",
    ),
  ],
]);
const RESTRICTED = { limited: "terrain", proximity: "proximity" };
export function barrierType(wall) {
  if (wall.kind === "door") return "door";
  // A side only matters while the wall blocks sight (the scene editor can clear it).
  if (wall.blockSide && wall.blocksSight !== false) return "one-way";
  if (RESTRICTED[wall.sightMode] && wall.blocksSight !== false) return RESTRICTED[wall.sightMode];
  const match = BARRIER_TYPES.find(
    ([id, , flags]) =>
      id !== "one-way" &&
      !flags.sightMode &&
      Object.entries(flags).every(([key, value]) => wall[key] === value),
  );
  if (match) return match[0];
  return "custom";
}

// Darkvision granted by the species on a builder sheet (SRD 5.2.1 EN 84–86 / IT 94–97);
// the Drow elven lineage raises it to 120 ft (36 m).
const SPECIES_DARKVISION = Object.freeze({
  dragonborn: 18,
  dwarf: 36,
  elf: 18,
  gnome: 18,
  orc: 36,
  tiefling: 18,
});
// The builder records the species in the build (characterBuild.data.origin); library
// samples such as Iria carry a top-level speciesId.
const speciesOf = (actor) =>
  actor?.speciesId ?? actor?.characterBuild?.data?.origin?.speciesId ?? null;
const lineageOf = (actor) =>
  actor?.characterBuild?.data?.origin?.choices?.lineage ?? actor?.speciesChoices?.lineage ?? null;
function sheetDarkvision(actor) {
  const species = speciesOf(actor);
  const listed = actor?.features?.some((f) =>
    /(^|:)darkvision$/.test(f.definitionId ?? f.id ?? ""),
  );
  if (!SPECIES_DARKVISION[species] || !listed) return 0;
  return species === "elf" && lineageOf(actor) === "drow" ? 36 : SPECIES_DARKVISION[species];
}

// ------------------------------------------------------------------------------ slice

const sceneDefaults = () => ({
  fog: [],
  vision: false,
  phase: "day",
  ambient: "bright",
  updateOnDrop: false,
  lights: [],
});
export function seedSlice() {
  return {
    scenes: {},
    tokens: {
      // Livia's darkvision is a token setting of the synthetic example (her sample sheet has
      // no species); a builder sheet with a darkvision species supplies it by itself.
      livia: { darkvision: 18, source: copy(AUTHORED) },
    },
    memory: {},
    positions: {},
  };
}
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
export function normalizeSlice(slice, fromVersion) {
  if (fromVersion > VERSION) throw Error("Fog and vision data from a newer version");
  const next = isObject(slice) ? slice : {};
  for (const key of ["scenes", "tokens", "memory", "positions"])
    if (!isObject(next[key])) next[key] = {};
  for (const [id, cfg] of Object.entries(next.scenes)) {
    if (!isObject(cfg)) {
      delete next.scenes[id];
      continue;
    }
    const base = sceneDefaults();
    for (const key of Object.keys(base)) if (cfg[key] === undefined) cfg[key] = base[key];
    if (!Array.isArray(cfg.fog)) cfg.fog = [];
    if (!Array.isArray(cfg.lights)) cfg.lights = [];
  }
  return next;
}
export const sliceOf = (state) => state?.ext?.[ID];
export function sceneConfig(state, sceneId) {
  const cfg = sliceOf(state)?.scenes?.[sceneId];
  return cfg ? { ...sceneDefaults(), ...cfg } : sceneDefaults();
}
function mutableScene(state, sceneId) {
  const slice = sliceOf(state);
  if (!slice) throw Error("Fog and vision state is not initialized");
  if (!state.scenes.some((s) => s.id === sceneId))
    fail("La scena non esiste più.", "The scene no longer exists.");
  slice.scenes[sceneId] = { ...sceneDefaults(), ...(slice.scenes[sceneId] ?? {}) };
  return slice.scenes[sceneId];
}
// C3 (CA-57): the runner of a DM hand-off has the DM's fog, light and vision powers.
const requireDM = (role, state = null) => {
  if (!runsSession(state, role))
    fail(
      "Solo il DM può cambiare nebbia, luci e visione.",
      "Only the DM can change fog, lights and vision.",
    );
};
export const sceneOf = (state, sceneId = state.activeSceneId) =>
  state.scenes.find((scene) => scene.id === sceneId) ?? null;

// ------------------------------------------------------------------------------ geometry

export const metersToPx = (scene, meters) =>
  (Number(meters) / (scene.metersPerCell || 1.5)) * (scene.gridSize || 50);
export const pxToMeters = (scene, px) =>
  (Number(px) * (scene.metersPerCell || 1.5)) / (scene.gridSize || 50);
export function pointInPolygon(p, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)
      inside = !inside;
  }
  return inside;
}
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function segmentDistance(p, a, b) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
const within = (scene, p) =>
  p &&
  Number.isFinite(p.x) &&
  Number.isFinite(p.y) &&
  p.x >= 0 &&
  p.y >= 0 &&
  p.x <= scene.width &&
  p.y <= scene.height;
export const tokenOf = (scene, actorId) =>
  scene?.tokens?.find((token) => token.actorId === actorId) ?? null;

// ------------------------------------------------------------------------------ fog

/** Whether a fog operation covers a point (brush strokes include their segments). */
export function opContains(scene, op, p) {
  if (op.shape === "all") return true;
  if (op.shape === "rect") {
    const [a, b] = op.points;
    return (
      p.x >= Math.min(a.x, b.x) &&
      p.x <= Math.max(a.x, b.x) &&
      p.y >= Math.min(a.y, b.y) &&
      p.y <= Math.max(a.y, b.y)
    );
  }
  if (op.shape === "polygon") return pointInPolygon(p, op.points);
  const half = metersToPx(scene, brushMeters(op.size)) / 2;
  if (op.brush === "square")
    return op.points.some((q) => Math.abs(p.x - q.x) <= half && Math.abs(p.y - q.y) <= half);
  if (op.points.length === 1) return dist(p, op.points[0]) <= half;
  for (let i = 1; i < op.points.length; i++)
    if (segmentDistance(p, op.points[i - 1], op.points[i]) <= half) return true;
  return false;
}
/** Manual fog at a point: the last operation containing it decides (painting order). */
export function fogHiddenAt(scene, fog, p) {
  for (let i = fog.length - 1; i >= 0; i--)
    if (opContains(scene, fog[i], p)) return fog[i].op === "cover";
  return false;
}
function cleanPoints(scene, points, min) {
  if (!Array.isArray(points) || points.length < min || points.length > 2000)
    fail("Forma non valida.", "Invalid shape.");
  return points.map((p) => {
    if (!within(scene, p)) fail("La forma esce dalla scena.", "The shape leaves the scene.");
    return { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 };
  });
}
/** Brush samples no further apart than a quarter of the brush, so stamps join up. */
export function densify(points, spacing) {
  const out = [];
  for (const p of points) {
    const last = out.at(-1);
    if (last) {
      const d = dist(last, p);
      if (d < 0.5) continue;
      const steps = Math.ceil(d / spacing);
      for (let i = 1; i < steps; i++)
        out.push({
          x: last.x + ((p.x - last.x) * i) / steps,
          y: last.y + ((p.y - last.y) * i) / steps,
        });
    }
    out.push({ x: p.x, y: p.y });
  }
  return out;
}
export function makeFogOp(scene, input) {
  const op = input.op === "cover" ? "cover" : input.op === "reveal" ? "reveal" : null;
  if (!op) fail("Scegli Copri o Rivela.", "Choose Cover or Reveal.");
  const shape = input.shape;
  const base = { id: input.id ?? uid(), op, shape, at: input.at ?? new Date().toISOString() };
  if (shape === "all") return { ...base, points: [] };
  if (shape === "rect") {
    const points = cleanPoints(scene, input.points, 2);
    const [a, b] = points;
    if (Math.abs(a.x - b.x) < 2 || Math.abs(a.y - b.y) < 2)
      fail("Trascina un rettangolo più grande.", "Drag a larger rectangle.");
    return { ...base, points: [a, b] };
  }
  if (shape === "polygon") {
    const points = cleanPoints(scene, input.points, 3);
    let area = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++)
      area += (points[j].x + points[i].x) * (points[j].y - points[i].y);
    if (Math.abs(area) / 2 < 25)
      fail(
        "Il poligono è troppo piccolo: aggiungi almeno tre punti distinti.",
        "The polygon is too small: add at least three distinct points.",
      );
    return { ...base, points };
  }
  if (shape === "brush") {
    const size = BRUSH_SIZES.some(([id]) => id === input.size) ? input.size : "medium";
    const brush = input.brush === "square" ? "square" : "circle";
    const spacing = Math.max(2, metersToPx(scene, brushMeters(size)) / 4);
    const points = densify(cleanPoints(scene, input.points, 1), spacing).slice(0, 2000);
    return { ...base, size, brush, points };
  }
  fail("Forma non valida.", "Invalid shape.");
}
/** DM: paints one fog operation (Cover All and Reveal All restart the list). */
export function addFogOp(state, role, sceneId, input) {
  requireDM(role, state);
  const scene = sceneOf(state, sceneId);
  const cfg = mutableScene(state, sceneId);
  const op = makeFogOp(scene, input);
  if (op.shape === "all") {
    cfg.fog = op.op === "cover" ? [op] : [];
    return op;
  }
  if (cfg.fog.length >= 400)
    fail(
      "Troppe aree di nebbia: usa Copri tutto o Rivela tutto per ripartire.",
      "Too many fog areas: use Cover all or Reveal all to start again.",
    );
  cfg.fog.push(op);
  return op;
}

// ------------------------------------------------------------------------------ vision

/**
 * The senses a token sees with. Order: the DM's token setting, then the sheet's species
 * (FG reads senses from the sheet, R20-122), then none. Blinded comes from the conditions.
 */
export function resolveSenses(state, actorId) {
  const actor = state.actors?.[actorId];
  const setting = sliceOf(state)?.tokens?.[actorId] ?? null;
  const fromSheet = sheetDarkvision(actor);
  const number = (value) =>
    Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0;
  const darkvision =
    setting && setting.darkvision !== undefined ? number(setting.darkvision) : fromSheet;
  return {
    enabled: setting?.vision !== undefined ? setting.vision !== false : actor?.kind === "character",
    darkvision,
    blindsight: number(setting?.blindsight),
    truesight: number(setting?.truesight),
    origin: setting && setting.darkvision !== undefined ? "token" : fromSheet ? "sheet" : "none",
    sheetDarkvision: fromSheet,
    speciesId: speciesOf(actor),
    blinded: Boolean(actor && hasCondition(actor, "blinded")),
    source:
      setting && setting.darkvision !== undefined
        ? (setting.source ?? null)
        : fromSheet
          ? SOURCES.speciesDarkvision
          : null,
  };
}
/** Where a light is: its own point, or the token it follows (a carried torch). */
export function lightPoint(scene, light) {
  if (light.attachedTo) {
    const token = tokenOf(scene, light.attachedTo);
    return token ? { x: token.x, y: token.y } : null;
  }
  return { x: light.x, y: light.y };
}
function inCone(light, origin, p) {
  if (!light.cone) return true;
  const angle = (Math.atan2(p.y - origin.y, p.x - origin.x) * 180) / Math.PI;
  let delta = Math.abs(((angle - (light.rotation ?? 0)) % 360) + 360) % 360;
  if (delta > 180) delta = 360 - delta;
  return delta <= CONE_ANGLE / 2 + EPS;
}
// Additive hook (B45 review): lights another area keeps by its own rules, such as a
// character's torch that burns on the game clock (travel-domain.mjs). A provider returns
// records shaped like this scene's lights (`attachedTo` follows a token); they light the
// scene and the vision here but stay out of the scene's editable lights. A provider that
// throws adds nothing.
const lightProviders = new Set();
export function addLightProvider(provider) {
  if (typeof provider === "function") lightProviders.add(provider);
}
function providedLights(state, scene) {
  const out = [];
  for (const provider of lightProviders) {
    try {
      const lights = provider(state, scene);
      if (Array.isArray(lights)) out.push(...lights);
    } catch {
      /* the scene keeps its own lights */
    }
  }
  return out;
}
/** Light sources, magical darkness and ambient level of a scene, with their polygons. */
export function buildLighting(state, scene, cfg = sceneConfig(state, scene.id)) {
  const lights = [],
    darkness = [];
  for (const light of [...cfg.lights, ...providedLights(state, scene)]) {
    const at = lightPoint(scene, light);
    if (!at || !within(scene, at)) continue;
    const entry = {
      ...light,
      at,
      brightPx: metersToPx(scene, light.bright),
      dimPx: metersToPx(scene, light.dim),
      // Light stops at walls that block sight; a magical darkness area spreads like an
      // area of effect, stopped by what blocks line of effect.
      polygon: visibilityPolygon(scene, at, {
        channel: light.magical ? "blocksEffect" : "blocksSight",
      }),
    };
    entry.radiusPx = entry.brightPx + entry.dimPx;
    if (light.magical) {
      if (light.on !== false) darkness.push(entry);
    } else lights.push(entry);
  }
  for (const entry of lights)
    entry.suppressed = entry.on !== false && darkness.some((d) => covers(d, entry.at, d.brightPx));
  return {
    sceneId: scene.id,
    ambient:
      PHASES.find(([id]) => id === effectivePhase(state, scene.id))?.[1] ?? cfg.ambient ?? "bright",
    lights,
    darkness,
  };
}
function covers(entry, p, radius) {
  return (
    dist(entry.at, p) <= radius + EPS &&
    pointInPolygon(p, entry.polygon) &&
    inCone(entry, entry.at, p)
  );
}
const RANK = { dark: 0, dim: 1, bright: 2 };
/** Light level at a point (SRD Vision and Light): ambient, lights, magical darkness. */
export function lightLevelAt(lighting, p) {
  const inDarkness = lighting.darkness.filter((d) => covers(d, p, d.brightPx)).map((d) => d.id);
  if (inDarkness.length) return { level: "dark", magical: true, sources: inDarkness };
  let level = lighting.ambient;
  const sources = [];
  for (const light of lighting.lights) {
    // A light whose source stands in magical Darkness gives no light: nonmagical light
    // can't illuminate the Darkness it would have to cross (SRD Darkness; B35 inference).
    if (light.on === false || light.suppressed) continue;
    if (covers(light, p, light.brightPx)) {
      level = "bright";
      sources.push(light.id);
    } else if (covers(light, p, light.radiusPx)) {
      if (RANK[level] < RANK.dim) level = "dim";
      sources.push(light.id);
    }
  }
  return { level, magical: false, sources };
}
/** One viewer: a token's position, its line-of-sight polygon and its senses in pixels. */
export function buildViewer(state, scene, actorId, at = null) {
  const token = tokenOf(scene, actorId);
  const point = at ?? (token ? { x: token.x, y: token.y } : null);
  const senses = resolveSenses(state, actorId);
  if (!point || !within(scene, point)) return null;
  return {
    actorId,
    at: point,
    senses,
    darkvisionPx: metersToPx(scene, senses.darkvision),
    blindsightPx: metersToPx(scene, senses.blindsight),
    truesightPx: metersToPx(scene, senses.truesight),
    polygon: visibilityPolygon(scene, point),
  };
}
/**
 * Magical Darkness is a Heavily Obscured sphere (SRD 5.2.1 Vision and Light; Darkness:
 * "Darkvision can't see through it"): from outside, nothing whose line of sight crosses it is
 * seen. Blueprint reading, stated: a viewer inside the sphere still sees out, and only where
 * its darkness spreads (its line-of-effect polygon, walls cut it) does it cast the shadow.
 */
export function throughDarkness(lighting, from, to) {
  return lighting.darkness.some(
    (d) =>
      dist(from, d.at) > d.brightPx + EPS &&
      segmentDistance(d.at, from, to) <= d.brightPx &&
      pointInPolygon(to, d.polygon),
  );
}
/**
 * Whether a viewer sees a point (SRD 5.2.1): in its line of sight, then lit (bright or dim),
 * or dark within Darkvision (seen as dim, shades of grey). Magical Darkness defeats
 * Darkvision; Truesight pierces it; Blinded sees nothing but what Blindsight reaches.
 * `perceived`: bright, dim or grey (darkvision in darkness).
 */
export function canSee(viewer, lighting, p) {
  if (!viewer) return { visible: false, reason: "absent" };
  const d = dist(viewer.at, p);
  const inSight = d < 1 || pointInPolygon(p, viewer.polygon);
  if (viewer.blindsightPx && d <= viewer.blindsightPx && inSight)
    return { visible: true, perceived: "blindsight", reason: "blindsight" };
  if (viewer.senses.blinded) return { visible: false, reason: "blinded" };
  if (!inSight) return { visible: false, reason: "wall" };
  const light = lightLevelAt(lighting, p);
  if (light.magical)
    return viewer.truesightPx && d <= viewer.truesightPx
      ? { visible: true, perceived: "grey", reason: "truesight" }
      : { visible: false, reason: "magical-darkness" };
  if (throughDarkness(lighting, viewer.at, p) && !(viewer.truesightPx && d <= viewer.truesightPx))
    return { visible: false, reason: "magical-darkness" };
  if (light.level === "bright") return { visible: true, perceived: "bright", reason: "light" };
  if (light.level === "dim")
    return {
      visible: true,
      perceived: viewer.darkvisionPx && d <= viewer.darkvisionPx ? "bright" : "dim",
      reason: "light",
    };
  if (viewer.darkvisionPx && d <= viewer.darkvisionPx)
    return { visible: true, perceived: "grey", reason: "darkvision" };
  if (viewer.truesightPx && d <= viewer.truesightPx)
    return { visible: true, perceived: "grey", reason: "truesight" };
  return { visible: false, reason: "dark" };
}

// ------------------------------------------------------------------------------ who sees

/** Characters of the campaign in play with a token and vision on this scene. */
export function partyViewers(state, scene) {
  return (scene?.tokens ?? [])
    .map((token) => token.actorId)
    .filter((id) => {
      const actor = state.actors?.[id];
      return (
        actor &&
        actor.kind === "character" &&
        !actor.companion &&
        isActorAvailable(actor) &&
        actor.visibility !== "private" &&
        isCampaignActor(actor, state.campaign?.id) &&
        resolveSenses(state, id).enabled
      );
    });
}
/** Every token with vision on this scene (party and any creature given vision). */
export function visionTokens(state, scene) {
  return (scene?.tokens ?? [])
    .map((token) => token.actorId)
    .filter((id) => state.actors?.[id] && resolveSenses(state, id).enabled);
}

/**
 * What an identity sees on a scene. `mode`: "dm" (everything; fog drawn translucent),
 * "player", "preview" (the DM's Fog Preview, VTL-067: every player's view) or "as-token"
 * (the DM checks one token's view, VTL-144/R20-093: opaque like a player).
 * `controls(actorId)` tells whether the identity controls a creature.
 */
export function viewFor(state, sceneId, options) {
  const { role, controls = () => false, viewAs = null, preview = false } = options;
  const sharedVision = options.sharedVision === true;
  const sharedMemory = options.sharedMemory === true;
  const scene = sceneOf(state, sceneId);
  const cfg = sceneConfig(state, sceneId);
  const party = partyViewers(state, scene);
  let mode = "player";
  let own = [];
  if (runsSession(state, role)) {
    if (viewAs && tokenOf(scene, viewAs) && resolveSenses(state, viewAs).enabled) {
      mode = "as-token";
      own = [viewAs];
    } else if (preview) {
      mode = "preview";
      own = party;
    } else mode = "dm";
  } else own = party.filter((id) => controls(id));
  const viewers = mode === "dm" ? [] : mode === "player" && sharedVision ? party : own;
  const memoryActors =
    mode === "dm"
      ? []
      : mode === "preview" || sharedMemory || (mode === "player" && sharedVision)
        ? party
        : own;
  return {
    mode,
    scene,
    cfg,
    vision: cfg.vision === true,
    viewers: [...new Set(viewers)],
    memoryActors: [...new Set(memoryActors)],
    controlled: mode === "player" ? own : mode === "as-token" ? own : [],
  };
}

// ------------------------------------------------------------------------------ memory

export function gridOf(scene) {
  const cell = Math.max(5, (scene.gridSize || 50) / 4);
  return { cell, cols: Math.ceil(scene.width / cell), rows: Math.ceil(scene.height / cell) };
}
export function emptyBits(scene) {
  const { cols, rows } = gridOf(scene);
  return new Uint8Array(Math.ceil((cols * rows) / 8));
}
export function encodeBits(bits) {
  let text = "";
  for (let i = 0; i < bits.length; i++) text += String.fromCharCode(bits[i]);
  return btoa(text);
}
export function decodeBits(scene, value) {
  const bits = emptyBits(scene);
  if (typeof value !== "string" || !value) return bits;
  try {
    const text = atob(value);
    for (let i = 0; i < Math.min(text.length, bits.length); i++) bits[i] = text.charCodeAt(i);
  } catch {
    /* unreadable memory: start empty */
  }
  return bits;
}
export const bitAt = (bits, index) => (bits[index >> 3] >> (index & 7)) & 1;
const setBit = (bits, index, on = true) =>
  on ? (bits[index >> 3] |= 1 << (index & 7)) : (bits[index >> 3] &= ~(1 << (index & 7)));
export function countBits(bits) {
  let n = 0;
  for (const byte of bits) for (let v = byte; v; v &= v - 1) n++;
  return n;
}
export function cellCenter(scene, index) {
  const { cell, cols } = gridOf(scene);
  return { x: ((index % cols) + 0.5) * cell, y: (Math.floor(index / cols) + 0.5) * cell };
}
export function cellIndex(scene, p) {
  const { cell, cols, rows } = gridOf(scene);
  const col = Math.min(cols - 1, Math.max(0, Math.floor(p.x / cell)));
  const row = Math.min(rows - 1, Math.max(0, Math.floor(p.y / cell)));
  return row * cols + col;
}
/** The cells a viewer sees now (cell centres), as a bit set. */
export function visibleCells(scene, viewer, lighting) {
  const bits = emptyBits(scene);
  if (!viewer) return bits;
  const { cols, rows } = gridOf(scene);
  for (let i = 0; i < cols * rows; i++)
    if (canSee(viewer, lighting, cellCenter(scene, i)).visible) setBit(bits, i);
  return bits;
}
export function memoryBits(state, sceneId, actorIds) {
  const scene = sceneOf(state, sceneId);
  const bits = emptyBits(scene);
  const stored = sliceOf(state)?.memory?.[sceneId] ?? {};
  for (const id of actorIds) {
    const own = decodeBits(scene, stored[id]);
    for (let i = 0; i < bits.length; i++) bits[i] |= own[i];
  }
  return bits;
}
export function exploredShare(state, sceneId, actorId) {
  const scene = sceneOf(state, sceneId);
  const bits = decodeBits(scene, sliceOf(state)?.memory?.[sceneId]?.[actorId]);
  const { cols, rows } = gridOf(scene);
  return countBits(bits) / (cols * rows);
}
// The walked path since the last recorded position: the movement record's reachable path
// when it ends here (combat.mjs), otherwise the straight line (a drag without a record).
function walkedPath(state, actorId, from, to) {
  const movement = [...(state.movements ?? [])]
    .reverse()
    .find((m) => m.actorId === actorId && m.position && dist(m.position, to) < 1);
  const path = movement?.path?.length
    ? [...movement.path.slice(0, Math.max(1, movement.pathIndex ?? movement.path.length)), to]
    : [from, to];
  return path;
}
function samples(path, step) {
  const out = [];
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1],
      b = path[i];
    const n = Math.max(1, Math.ceil(dist(a, b) / step));
    for (let k = 0; k < n; k++)
      out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
}
/**
 * Adds what each party character sees now to its explored memory (Roll20 Explorer mode,
 * Smoke persistence). With "update on drop" off the walked path is revealed too; with it
 * on only the arrival counts (R20-095: a teleport never reveals the path).
 */
export function recordExploration(state, sceneId = state.activeSceneId) {
  const slice = sliceOf(state);
  const scene = sceneOf(state, sceneId);
  const cfg = sceneConfig(state, sceneId);
  if (!slice || !scene || !cfg.vision || validateSceneGeometry(scene).length)
    return { changed: false, actors: [] };
  const lighting = buildLighting(state, scene, cfg);
  const memory = (slice.memory[sceneId] ??= {});
  const positions = (slice.positions[sceneId] ??= {});
  const changedActors = [];
  let changed = false;
  for (const actorId of partyViewers(state, scene)) {
    const token = tokenOf(scene, actorId);
    const here = { x: token.x, y: token.y };
    const before = positions[actorId];
    const moved = !before || dist(before, here) > 0.5;
    const points =
      moved && before && !cfg.updateOnDrop
        ? [...samples(walkedPath(state, actorId, before, here), (scene.gridSize || 50) / 2), here]
        : [here];
    const bits = decodeBits(scene, memory[actorId]);
    for (const at of points) {
      const seen = visibleCells(scene, buildViewer(state, scene, actorId, at), lighting);
      for (let i = 0; i < bits.length; i++) bits[i] |= seen[i];
    }
    const encoded = encodeBits(bits);
    if (encoded !== memory[actorId]) {
      memory[actorId] = encoded;
      changed = true;
      changedActors.push(actorId);
    }
    if (moved) {
      positions[actorId] = here;
      changed = true;
    }
  }
  return { changed, actors: changedActors };
}
/** DM: edits one character's explored memory with a fog shape (Roll20 "Edit explored"). */
export function editMemory(state, role, sceneId, actorId, input) {
  requireDM(role, state);
  const scene = sceneOf(state, sceneId);
  if (!tokenOf(scene, actorId))
    fail("Questa pedina non è sulla scena.", "This token is not on the scene.");
  const op = makeFogOp(scene, input);
  const slice = sliceOf(state);
  const memory = (slice.memory[sceneId] ??= {});
  const bits = decodeBits(scene, memory[actorId]);
  const { cols, rows } = gridOf(scene);
  for (let i = 0; i < cols * rows; i++)
    if (opContains(scene, op, cellCenter(scene, i))) setBit(bits, i, op.op === "reveal");
  memory[actorId] = encodeBits(bits);
  return op;
}
/** DM: forgets the explored areas of one character, or of everyone (Smoke, Roll20 Reset). */
export function resetMemory(state, role, sceneId, actorId = null) {
  requireDM(role, state);
  const slice = sliceOf(state);
  const memory = (slice.memory[sceneId] ??= {});
  if (actorId) delete memory[actorId];
  else slice.memory[sceneId] = {};
  // The current view is added again at the next change, as in Roll20 after a reset.
  const positions = (slice.positions[sceneId] ??= {});
  if (actorId) delete positions[actorId];
  else slice.positions[sceneId] = {};
}

// ------------------------------------------------------------------------------ commands

export function setSceneOptions(state, role, sceneId, patch) {
  requireDM(role, state);
  const cfg = mutableScene(state, sceneId);
  if (patch.vision !== undefined) cfg.vision = patch.vision === true;
  if (patch.updateOnDrop !== undefined) cfg.updateOnDrop = patch.updateOnDrop === true;
  if (patch.phase !== undefined) {
    const phase = PHASES.find(([id]) => id === patch.phase);
    if (!phase) fail("Momento del giorno non valido.", "Invalid time of day.");
    cfg.phase = phase[0];
    cfg.ambient = phase[1];
  }
  if (patch.followTime !== undefined) {
    cfg.followTime = patch.followTime === true;
    if (cfg.followTime) {
      const phase = phaseAtHour(narrativeHour(state));
      cfg.phase = phase;
      cfg.ambient = PHASES.find(([id]) => id === phase)[1];
    }
  }
  if (patch.ambientTint !== undefined) {
    if (!AMBIENT_TINTS.some(([hex]) => hex === patch.ambientTint))
      fail("Colore della luce ambientale non valido.", "Invalid ambient light colour.");
    cfg.ambientTint = patch.ambientTint;
  }
  if (patch.ambientIntensity !== undefined) {
    const value = Number(patch.ambientIntensity);
    if (!AMBIENT_INTENSITIES.includes(value)) fail("Intensità non valida.", "Invalid intensity.");
    cfg.ambientIntensity = value;
  }
  return cfg;
}
/** Day → dusk → night → dawn → day (Foundry transition buttons, FG presets). */
export function advancePhase(state, role, sceneId) {
  const index = PHASES.findIndex(([id]) => id === effectivePhase(state, sceneId));
  // A manual step takes the scene off the clock (Foundry: a manual darkness change).
  return setSceneOptions(state, role, sceneId, {
    followTime: false,
    phase: PHASES[(index + 1) % PHASES.length][0],
  });
}
function cleanLight(scene, light, patch) {
  const next = { ...light, ...patch };
  const preset = LIGHT_PRESETS[next.preset] ? next.preset : "custom";
  next.preset = preset;
  next.magical = LIGHT_PRESETS[preset].magical === true;
  next.cone = LIGHT_PRESETS[preset].cone === true;
  for (const key of ["bright", "dim"]) {
    const value = Number(next[key]);
    if (!Number.isFinite(value) || value < 0 || value > 36)
      fail("Il raggio va da 0 a 36 m.", "Radius must be between 0 and 36 m.");
    next[key] = Math.round(value * 100) / 100;
  }
  if (next.bright + next.dim <= 0)
    fail("Una luce ha bisogno di un raggio.", "A light needs a radius.");
  if (next.magical) next.dim = 0;
  next.rotation = ((Math.round(Number(next.rotation) || 0) % 360) + 360) % 360;
  if (!/^#[0-9a-f]{6}$/i.test(next.color ?? "")) next.color = LIGHT_PRESETS[preset].color;
  next.on = next.on !== false;
  next.name = String(next.name ?? "").slice(0, 60);
  if (next.attachedTo) {
    if (!tokenOf(scene, next.attachedTo))
      fail("La pedina da seguire non è sulla scena.", "The token to follow is not on the scene.");
    delete next.x;
    delete next.y;
  } else {
    next.attachedTo = null;
    if (!within(scene, next))
      fail("La luce deve stare nella scena.", "The light must be inside the scene.");
    next.x = Math.round(next.x * 10) / 10;
    next.y = Math.round(next.y * 10) / 10;
  }
  return next;
}
export function addLight(state, role, sceneId, input) {
  requireDM(role, state);
  const scene = sceneOf(state, sceneId);
  const cfg = mutableScene(state, sceneId);
  if (cfg.lights.length >= 40)
    fail(
      "Troppe luci in questa scena (massimo 40).",
      "Too many lights in this scene (40 at most).",
    );
  const preset = LIGHT_PRESETS[input.preset] ? input.preset : "torch";
  const light = cleanLight(
    scene,
    {
      id: input.id ?? uid(),
      preset,
      bright: LIGHT_PRESETS[preset].bright,
      dim: LIGHT_PRESETS[preset].dim,
      color: LIGHT_PRESETS[preset].color,
      on: true,
      rotation: 0,
    },
    input,
  );
  cfg.lights.push(light);
  return light;
}
function findLight(state, sceneId, lightId) {
  const cfg = mutableScene(state, sceneId);
  const light = cfg.lights.find((entry) => entry.id === lightId);
  if (!light) fail("Luce non trovata.", "Light not found.");
  return { cfg, light };
}
export function updateLight(state, role, sceneId, lightId, patch) {
  requireDM(role, state);
  const { cfg, light } = findLight(state, sceneId, lightId);
  const next = cleanLight(sceneOf(state, sceneId), light, patch);
  if (patch.preset && patch.preset !== light.preset && patch.bright === undefined) {
    next.bright = LIGHT_PRESETS[next.preset].bright;
    next.dim = LIGHT_PRESETS[next.preset].magical ? 0 : LIGHT_PRESETS[next.preset].dim;
  }
  cfg.lights[cfg.lights.indexOf(light)] = next;
  return next;
}
export function removeLight(state, role, sceneId, lightId) {
  requireDM(role, state);
  const { cfg, light } = findLight(state, sceneId, lightId);
  cfg.lights.splice(cfg.lights.indexOf(light), 1);
  return light;
}
/**
 * Light or put out a light. The DM any light; a player the light carried by a creature
 * they control (Foundry token HUD light, R20-094). `controls(actorId)` checks control.
 */
export function toggleLight(state, role, sceneId, lightId, controls = () => false) {
  const { light } = findLight(state, sceneId, lightId);
  if (!runsSession(state, role) && !(light.attachedTo && controls(light.attachedTo)))
    fail(
      "Puoi accendere o spegnere solo una luce portata da un tuo personaggio.",
      "You can only light or put out a light carried by your character.",
    );
  light.on = light.on === false;
  return light;
}
/** DM: the token's vision setting (Foundry token config, Roll20 token settings R20-094). */
export function setTokenVision(state, role, actorId, patch) {
  requireDM(role, state);
  if (!state.actors?.[actorId]) fail("Creatura non trovata.", "Creature not found.");
  const slice = sliceOf(state);
  const current = { ...(slice.tokens[actorId] ?? {}) };
  if (patch.vision !== undefined) current.vision = patch.vision !== false;
  for (const key of ["darkvision", "blindsight", "truesight"]) {
    if (patch[key] === undefined) continue;
    if (patch[key] === null || patch[key] === "") {
      delete current[key];
      continue;
    }
    const value = Number(patch[key]);
    if (!Number.isFinite(value) || value < 0 || value > 300)
      fail("Distanza dei sensi da 0 a 300 m.", "Sense range from 0 to 300 m.");
    current[key] = Math.round(value * 100) / 100;
  }
  current.source = {
    kind: "authored",
    revision: "token-setting-" + uid(),
    note: "DM token setting",
  };
  if (patch.useSheet === true) {
    delete current.darkvision;
    delete current.blindsight;
    delete current.truesight;
  }
  slice.tokens[actorId] = current;
  return current;
}
/** DM: a creature carries (or stops carrying) a light that follows its token. */
export function setCarriedLight(state, role, sceneId, actorId, preset) {
  requireDM(role, state);
  const scene = sceneOf(state, sceneId);
  if (!tokenOf(scene, actorId))
    fail("Questa pedina non è sulla scena.", "This token is not on the scene.");
  if (preset && LIGHT_PRESETS[preset]?.magical)
    fail(
      "Una creatura porta una fonte di luce, non l’oscurità.",
      "A creature carries a light source, not darkness.",
    );
  const cfg = mutableScene(state, sceneId);
  cfg.lights = cfg.lights.filter((light) => light.attachedTo !== actorId);
  if (!preset) return null;
  return addLight(state, role, sceneId, { preset, attachedTo: actorId });
}
export const carriedLight = (state, sceneId, actorId) =>
  sceneConfig(state, sceneId).lights.find((light) => light.attachedTo === actorId) ?? null;

/** DM: the barrier type of a scene wall (not a door): the wall's own flags change. */
export function setBarrierType(state, role, sceneId, wallId, type, side, meters) {
  requireDM(role, state);
  const scene = sceneOf(state, sceneId);
  const wall = scene?.walls?.find((entry) => entry.id === wallId);
  if (!wall) fail("Barriera non trovata.", "Barrier not found.");
  if (wall.kind === "door")
    fail(
      "Le porte si modificano con il loro dettaglio o nell’editor della scena.",
      "Doors are changed from their details or in the scene editor.",
    );
  const entry = BARRIER_TYPES.find(([id]) => id === type);
  if (!entry) fail("Tipo di barriera non valido.", "Invalid barrier type.");
  const next = { ...wall, ...entry[2] };
  if (type === "one-way")
    next.blockSide = side === "left" || side === "right" ? side : (wall.blockSide ?? "right");
  else delete next.blockSide;
  if (!entry[2].sightMode) {
    delete next.sightMode;
    delete next.proximityMeters;
  } else if (type === "proximity") {
    const value = Number(meters ?? wall.proximityMeters ?? entry[2].proximityMeters);
    if (!(Number.isFinite(value) && value >= 0.5 && value <= 120))
      fail(
        "La distanza della prossimità va da 0,5 a 120 m.",
        "The proximity distance goes from 0.5 to 120 m.",
      );
    next.proximityMeters = value;
  } else delete next.proximityMeters;
  next.source = {
    kind: "authored-demo",
    revision: "fog-vision-" + uid(),
    title: "Barrier type set at the Table",
  };
  const walls = scene.walls.map((item) => (item.id === wallId ? next : item));
  if (validateSceneGeometry({ ...scene, walls }).length)
    fail("La barriera non è valida.", "The barrier is not valid.");
  scene.walls = walls;
  return next;
}
/** DM: moves a token without a path (Foundry/Roll20 GM drag; Misty Step at the table). */
export function teleportToken(state, role, sceneId, actorId, point) {
  requireDM(role, state);
  const scene = sceneOf(state, sceneId);
  const token = tokenOf(scene, actorId);
  if (!token) fail("Questa pedina non è sulla scena.", "This token is not on the scene.");
  const preview = previewTokenPlacement(scene, point, { excludeActorId: actorId });
  if (!preview.available) {
    const reason = preview.reasons[0];
    fail(reason?.it ?? "Posizione non valida.", reason?.en ?? "Invalid position.");
  }
  const from = { x: token.x, y: token.y };
  token.x = Math.round(point.x * 10) / 10;
  token.y = Math.round(point.y * 10) / 10;
  return { from, to: { x: token.x, y: token.y } };
}

// ------------------------------------------------------------------------------ diagnostics

/** Roll20 lighting panel footer (R20-093): counts of vision tokens and light sources. */
export function diagnostics(state, sceneId) {
  const scene = sceneOf(state, sceneId);
  const cfg = sceneConfig(state, sceneId);
  const lighting = buildLighting(state, scene, cfg);
  const tokens = visionTokens(state, scene).map((actorId) => {
    const viewer = buildViewer(state, scene, actorId);
    const here = viewer ? lightLevelAt(lighting, viewer.at) : null;
    const self = viewer ? canSee(viewer, lighting, viewer.at) : { visible: false };
    let cells = 0;
    if (cfg.vision && viewer) cells = countBits(visibleCells(scene, viewer, lighting));
    const { cols, rows } = gridOf(scene);
    return {
      actorId,
      senses: viewer?.senses ?? resolveSenses(state, actorId),
      level: here?.level ?? "dark",
      magical: here?.magical ?? false,
      seesOwnSpace: self.visible,
      share: cells / (cols * rows),
    };
  });
  const lights = cfg.lights.map((light) => {
    const lit = lighting.lights.find((entry) => entry.id === light.id);
    return {
      ...light,
      at: lightPoint(scene, light),
      suppressed: Boolean(lit?.suppressed),
    };
  });
  const warnings = [];
  if (cfg.vision)
    for (const row of tokens)
      if (!row.seesOwnSpace && !row.senses.blinded)
        warnings.push({ kind: "dark-token", actorId: row.actorId });
      else if (row.senses.blinded) warnings.push({ kind: "blinded", actorId: row.actorId });
  for (const light of lights)
    if (light.suppressed) warnings.push({ kind: "suppressed", lightId: light.id });
  return {
    vision: cfg.vision,
    ambient: lighting.ambient,
    phase: cfg.followTime ? phaseAtHour(narrativeHour(state)) : cfg.phase,
    tokens,
    lights,
    counts: {
      vision: tokens.length,
      lights: lights.filter((l) => !l.magical).length,
      on: lights.filter((l) => !l.magical && l.on !== false).length,
      darkness: lights.filter((l) => l.magical && l.on !== false).length,
    },
    warnings,
  };
}
export const lightName = (light, lang = "it") =>
  light.name || LIGHT_PRESETS[light.preset]?.name?.[lang] || LIGHT_PRESETS.custom.name[lang];
