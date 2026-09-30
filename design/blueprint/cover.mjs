// B46 — Cover and line of sight on the Table: pure geometry, no DOM and no state writes.
//
// Rules (D&D 2024, SRD 5.2.1): "Cover" (EN 15 / IT 16): walls, creatures and other
// obstacles give Half (+2 AC and Dexterity saves), Three-Quarters (+5) or Total cover (can't
// be targeted directly); another creature gives at most Half cover; only the most protective
// degree applies, never a sum; a target benefits only when the attack comes from the other
// side of the obstacle.
//
// How the degree is measured here is this app's declared adaptation (the SRD 2024 gives no
// grid procedure): like the Peekaboo "precise" check (VTL-138) the target's space is sampled
// with nine points (centre, corners, edge midpoints) and the attacker picks its best corner
// or centre, as the 2014 grid procedure let it choose a corner. Lines stopped by a barrier
// that blocks effects (walls, closed or locked doors; open doors let it through) count as
// covered: 0 clear lines → Total, 1–2 → Three-Quarters, 3–4 → Half, 5+ → none. A creature
// whose space crosses the line between the two centres gives Half cover. The DM keeps the
// last word (the combat preview is a proposal; the Table's corrections apply as usual).
//
// Patterns: XCOM 2 shields at the destination (CRP-116, adapted to ½, ¾ and total);
// Owlbear Peekaboo lines white (clear) / yellow (partial) / red (blocked) (VTL-138).

import { isSegmentBlocked, visibilityPolygon, validateSceneGeometry } from "./spatial.mjs";
import { srdSource } from "./srd-sample.mjs";

const L = (it, en) => Object.freeze({ it, en });

export const COVER_SOURCE = srdSource([15], [16]);
export const METHOD_SOURCE = Object.freeze({
  kind: "authored-demo",
  edition: "2024",
  revision: "b46-cover-nine-points-v1",
  title: L(
    "Copertura misurata con nove punti del bersaglio (adattamento dichiarato dell'app)",
    "Cover measured on nine points of the target (the app's declared adaptation)",
  ),
});

export const DEGREES = Object.freeze(["none", "half", "three-quarters", "total"]);
export const DEGREE = Object.freeze({
  none: Object.freeze({ acBonus: 0, name: L("Nessuna copertura", "No cover"), short: "0" }),
  half: Object.freeze({ acBonus: 2, name: L("Mezza copertura", "Half Cover"), short: "½" }),
  "three-quarters": Object.freeze({
    acBonus: 5,
    name: L("Copertura dei tre quarti", "Three-Quarters Cover"),
    short: "¾",
  }),
  total: Object.freeze({
    acBonus: null,
    name: L("Copertura totale", "Total Cover"),
    short: "■",
  }),
});
export const rankOf = (degree) => Math.max(0, DEGREES.indexOf(degree));
export const moreProtective = (a, b) => (rankOf(a) >= rankOf(b) ? a : b);

// Space occupied by each size, in grid cells per side (SRD 5.2.1 "Creature Size").
export const SIZE_CELLS = Object.freeze({
  tiny: 0.5,
  small: 1,
  medium: 1,
  large: 2,
  huge: 3,
  gargantuan: 4,
});
const SAMPLE_INSET = 0.8;

const finite = (p) => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
const clampInto = (scene, p) => ({
  x: Math.min(scene.width - 0.5, Math.max(0.5, p.x)),
  y: Math.min(scene.height - 0.5, Math.max(0.5, p.y)),
});

/** A creature's square space on the map: centre and half side in pixels. */
export function footprint(scene, token, actor = null) {
  if (!finite(token)) return null;
  const cells = SIZE_CELLS[actor?.size] ?? 1;
  return { x: token.x, y: token.y, half: (cells * (scene?.gridSize || 50)) / 2 };
}

/** Centre, four corners and four edge midpoints of a space (inset, inside the scene). */
export function samplePoints(scene, space) {
  const h = space.half * SAMPLE_INSET;
  const offsets = [
    [0, 0],
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  return offsets.map(([dx, dy]) => clampInto(scene, { x: space.x + dx * h, y: space.y + dy * h }));
}
/** Where an attack can start from inside a space: its centre and its four corners. */
export function originPoints(scene, space) {
  return samplePoints(scene, space).slice(0, 5);
}

function segmentDistance(a, b, p) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0;
  return Math.hypot(a.x + t * dx - p.x, a.y + t * dy - p.y);
}

/** Degree from the number of the nine target points an attacker can reach. */
export function degreeFromClear(clear, total = 9) {
  if (clear <= 0) return "total";
  const blocked = (total - clear) / total;
  if (blocked >= 0.75) return "three-quarters";
  if (blocked >= 0.5) return "half";
  return "none";
}

/**
 * Cover of `target` against an attack from `attacker` (both spaces from `footprint`).
 * `blockers`: other creatures' spaces [{id, x, y, half}] that may give Half cover.
 * `role`: "player" ignores secret walls the player does not know (a preview never leaks
 * them); the resolution uses the DM's full geometry.
 * Returns {degree, acBonus, clear, origin, rays: [{from, to, status}], creatures: [ids],
 * walls: boolean, source, method} — `status` is "clear", "partial" (through a creature) or
 * "blocked" (a barrier).
 */
export function coverBetween(scene, attacker, target, { blockers = [], role = "dm" } = {}) {
  if (!scene || !attacker || !target || validateSceneGeometry(scene).length)
    return {
      degree: "unknown",
      acBonus: 0,
      clear: 0,
      origin: null,
      rays: [],
      creatures: [],
      walls: false,
      source: COVER_SOURCE,
      method: METHOD_SOURCE,
    };
  const points = samplePoints(scene, target);
  let best = null;
  for (const origin of originPoints(scene, attacker)) {
    const rays = points.map((to) => ({
      from: origin,
      to,
      blocked: isSegmentBlocked(scene, origin, to, "blocksEffect", { role }),
    }));
    const clear = rays.filter((ray) => !ray.blocked).length;
    if (!best || clear > best.clear) best = { origin, rays, clear };
    if (clear === points.length) break;
  }
  const wallDegree = degreeFromClear(best.clear, points.length);
  const centreLine = [
    { x: attacker.x, y: attacker.y },
    { x: target.x, y: target.y },
  ];
  const creatures = blockers
    .filter((space) => space && finite(space))
    .filter((space) => segmentDistance(centreLine[0], centreLine[1], space) < space.half * 0.9)
    .map((space) => space.id);
  const degree = moreProtective(wallDegree, creatures.length ? "half" : "none");
  const rays = best.rays.map((ray) => ({
    from: ray.from,
    to: ray.to,
    status: ray.blocked
      ? "blocked"
      : blockers.some(
            (space) =>
              creatures.includes(space.id) && segmentDistance(ray.from, ray.to, space) < space.half,
          )
        ? "partial"
        : "clear",
  }));
  return {
    degree,
    acBonus: DEGREE[degree].acBonus ?? 0,
    clear: best.clear,
    origin: best.origin,
    rays,
    creatures,
    walls: rankOf(wallDegree) > 0,
    source: COVER_SOURCE,
    method: METHOD_SOURCE,
  };
}

/**
 * P6 TV-44 (Peekaboo writes the result on the map): the degree with its effect, in words,
 * e.g. «Mezza copertura, +2 CA» / "Half Cover, +2 AC".
 */
export function coverText(degree, lang = "it") {
  const it = lang !== "en";
  if (degree === "none") return it ? "Nessuna copertura" : "No cover";
  if (degree === "total")
    return it ? "Copertura totale: non bersagliabile" : "Total Cover: can’t be targeted";
  const row = DEGREE[degree];
  if (!row) return it ? "Copertura sconosciuta" : "Unknown cover";
  return `${row.name[it ? "it" : "en"]}, +${row.acBonus} ${it ? "CA" : "AC"}`;
}
/** Peekaboo colour of a whole check: white (none), yellow (½ or ¾), red (total). */
export function checkColour(degree) {
  return degree === "total" ? "blocked" : degree === "none" ? "clear" : "partial";
}

/** What a point sees through barriers that block sight (BG3-style sight area of a creature). */
export function sightArea(scene, origin) {
  if (!scene || !finite(origin)) return [];
  return visibilityPolygon(scene, clampInto(scene, origin));
}
