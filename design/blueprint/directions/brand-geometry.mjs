// Phase C (visual-01, I-251): the geometry of the d20 mark that every direction's brand.mjs
// draws in its own language. Dev-only: nothing in the app imports it; directions/<id>/brand.mjs
// does (contract: directions/README.md «brand.mjs»).
//
// A TRUE regular icosahedron (d20) seen face-on, looking straight down the axis through the
// centre of one face. The silhouette is a pointy-top regular hexagon; the front hemisphere
// shows exactly 10 of the 20 triangular faces:
//   - the central upward «20» face (A B C);
//   - the three faces that share an edge with it: the two upper flanks and the inverted bottom
//     face dropping to the lowest vertex;
//   - the six faces that share one vertex with it: the two-triangle roof meeting at the top
//     vertex, the two side faces and the two lower flanks.
// Every inner vertex meets five faces and the front face's circumradius is 1/φ (0.618) of the
// silhouette's, as on a real die photographed face-on.
//
// Vertices: the owner's d20 Folio derivation, kept as they are (D20Mark in
// ~/Workspace/d20-folio/src/components/ui/brand-mark.tsx: «circumradius ~43, centre 50,50;
// computed in /tmp/d20.py»). Checked again on 01/10/2026 from the icosahedron
// (0, ±1, ±φ) and its cyclic permutations: the exact projection puts the hexagon's side
// vertices at x = 12.76 / 87.24 and the front face at (26.98, 63.29) (73.02, 63.29)
// (50, 23.42); d20 Folio's rounding to 13 / 87, 27 / 73, 63.3 and 23.4 is under 0.3 units.
// The face normals below are exact (unit vectors, x right, y down, z toward the viewer).

/** The viewBox every mark uses: the die is centred on 50,50, 86 units tall and 74 wide. */
export const VIEWBOX = "0 0 100 100";

/** Named vertices in viewBox units (y down): the hexagon, then the front face A B C. */
export const V = Object.freeze({
  T: Object.freeze([50, 7]), // top vertex (behind the equator)
  UR: Object.freeze([87, 28.5]),
  LR: Object.freeze([87, 71.5]), // behind the equator
  BOT: Object.freeze([50, 93]),
  LL: Object.freeze([13, 71.5]), // behind the equator
  UL: Object.freeze([13, 28.5]),
  A: Object.freeze([50, 23.4]), // apex of the «20» face
  B: Object.freeze([73, 63.3]), // its lower right corner
  C: Object.freeze([27, 63.3]), // its lower left corner
});

const pts = (...names) => names.map((n) => V[n].join(",")).join(" ");

/** The silhouette, a pointy-top hexagon (polygon points, clockwise from the top). */
export const OUTLINE = pts("T", "UR", "LR", "BOT", "LL", "UL");
/** The front «20» face (polygon points). */
export const CENTER_FACE = pts("A", "B", "C");
/** The 12 inner seams (path d): spokes from A, B and C to the hexagon, and the front face. */
export const SEAMS = [
  ["A", "T"],
  ["A", "UL"],
  ["A", "UR"],
  ["A", "B"],
  ["A", "C"],
  ["B", "C"],
  ["B", "UR"],
  ["B", "LR"],
  ["B", "BOT"],
  ["C", "UL"],
  ["C", "LL"],
  ["C", "BOT"],
]
  .map(([a, b]) => `M${V[a].join(",")} ${V[b].join(",")}`)
  .join(" ");

// Light from the upper left, in front of the die (x right, y down, z toward the viewer).
export const LIGHT = Object.freeze([-0.35, -0.6, 0.72]);

// Painter's order (they never overlap; the front face last, so its edge stroke is on top).
const RAW = [
  ["roof-left", "top", ["A", "T", "UL"], [-0.3568, -0.8726, 0.3333]],
  ["roof-right", "top", ["A", "T", "UR"], [0.3568, -0.8726, 0.3333]],
  ["upper-left", "flank", ["A", "C", "UL"], [-0.5774, -0.3333, 0.7454]],
  ["upper-right", "flank", ["A", "B", "UR"], [0.5774, -0.3333, 0.7454]],
  ["side-left", "flank", ["C", "UL", "LL"], [-0.9342, 0.1273, 0.3333]],
  ["side-right", "flank", ["B", "UR", "LR"], [0.9342, 0.1273, 0.3333]],
  ["lower-left", "flank", ["C", "LL", "BOT"], [-0.5774, 0.7454, 0.3333]],
  ["lower-right", "flank", ["B", "LR", "BOT"], [0.5774, 0.7454, 0.3333]],
  ["bottom", "bottom", ["B", "C", "BOT"], [0, 0.6667, 0.7454]],
  ["front", "front", ["A", "B", "C"], [0, 0, 1]],
];

/**
 * Lambert tones for a light direction, one per face in FACES order: 0 the darkest of the ten
 * faces, 1 the brightest (rounded to 3 decimals).
 */
export function shade(light = LIGHT) {
  const len = Math.hypot(...light) || 1;
  const cos = RAW.map(([, , , n]) => n.reduce((sum, v, i) => sum + (v * light[i]) / len, 0));
  const lo = Math.min(...cos);
  const hi = Math.max(...cos);
  return cos.map((c) => (hi > lo ? Math.round(((c - lo) / (hi - lo)) * 1000) / 1000 : 1));
}

const tones = shade();
/**
 * The ten visible faces: { id, role: 'top'|'front'|'flank'|'bottom', vertices: [[x,y]×3],
 * points (for <polygon points>), normal [x,y,z], tone (0..1 under LIGHT) }.
 */
export const FACES = Object.freeze(
  RAW.map(([id, role, names, normal], i) =>
    Object.freeze({
      id,
      role,
      vertices: names.map((n) => [...V[n]]),
      points: pts(...names),
      normal: Object.freeze(normal),
      tone: tones[i],
    }),
  ),
);

const escAttr = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
function attributes(value) {
  if (!value) return "";
  if (typeof value === "string") return value.trim() ? ` ${value.trim()}` : "";
  return Object.entries(value)
    .filter(([, v]) => v !== null && v !== undefined && v !== false)
    .map(([k, v]) => ` ${k}="${escAttr(v)}"`)
    .join("");
}

/**
 * The ten faces as <polygon> elements. `style(face, index)` returns the attributes of each
 * one: a string ('fill="…" stroke="…"'), an object ({ fill: "…" }, values escaped) or null.
 */
export function svgFaces(style = () => null) {
  return FACES.map(
    (face, i) => `<polygon points="${face.points}"${attributes(style(face, i))}/>`,
  ).join("");
}

/**
 * The «20» numeral: centred on the front face's axis with its alphabetic baseline at y 60,
 * 3.3 units above the face's lower edge. Lining figures of NUMERAL.size (up to NUMERAL.max)
 * clear all three edges for a «20» up to 1.15 em wide; narrow it or step down for a wider face.
 */
export const NUMERAL = Object.freeze({ x: 50, y: 60, size: 18, max: 19 });
export function numeral(attrs = "", size = NUMERAL.size) {
  return `<text x="${NUMERAL.x}" y="${NUMERAL.y}" font-size="${size}" text-anchor="middle"${attributes(attrs)}>20</text>`;
}

let serial = 0;
/** A fresh suffix per mark, so two marks on one page never share gradient or filter ids. */
export const uniqueSuffix = () => `d20-${(++serial).toString(36)}`;

/** The header mark's root, in the contract's shape: class, viewBox, extras, aria-hidden. */
export function logoSvg(className, inner, attrs = "") {
  return `<svg class="${escAttr(className)}" viewBox="${VIEWBOX}"${attributes(attrs)} aria-hidden="true">${inner}</svg>`;
}
/** A standalone favicon document (xmlns, no CSS context: literal colours only). */
export function faviconSvg(inner, attrs = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEWBOX}"${attributes(attrs)}>${inner}</svg>`;
}
