// Two-dimensional, center-point geometry. Distance follows the scene's rule: by default the
// SRD 2024 square grid (a diagonal step costs one square, "Playing on a Grid"); a scene can
// choose the gridless straight line, the 5-10-5 variant, orthogonal steps or hexes.
const EPS = 1e-7;
const point = (p) => !!p && Number.isFinite(p.x) && Number.isFinite(p.y);
const same = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < EPS;
const copyPoint = (p) => ({ x: p.x, y: p.y });
const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const reason = (code, it, en) => ({ code, it, en });
const within = (scene, p) =>
  point(p) && p.x >= 0 && p.y >= 0 && p.x <= scene.width && p.y <= scene.height;
const authored = (entry) =>
  entry.source?.kind === "authored-demo" &&
  typeof entry.source.revision === "string" &&
  !!entry.source.revision.trim();
export const SPATIAL_SOURCES = Object.freeze({
  distance: Object.freeze({
    kind: "srd",
    edition: "2024",
    revision: "5.2.1",
    sha256: "8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87",
    url: "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf",
    pages: [13, 14],
    title: "Playing on a Grid (square grid default) with center-point collision",
  }),
  difficultTerrain: Object.freeze({
    kind: "srd",
    edition: "2024",
    revision: "5.2.1",
    sha256: "8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87",
    url: "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf",
    pages: [14, 181],
  }),
  crawling: Object.freeze({
    kind: "srd",
    edition: "2024",
    revision: "5.2.1",
    sha256: "8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87",
    url: "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf",
    pages: [179],
  }),
  coverAndSight: Object.freeze({
    kind: "srd",
    edition: "2024",
    revision: "5.2.1",
    sha256: "8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87",
    url: "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf",
    pages: [14, 15, 106, 177, 179],
  }),
});

export function validateSceneGeometry(scene) {
  const invalid = () => [
    reason(
      "invalid-geometry",
      "La geometria della scena richiede una correzione del DM.",
      "Scene geometry needs correction by the DM.",
    ),
  ];
  if (
    !scene ||
    ![scene.width, scene.height, scene.gridSize, scene.metersPerCell].every(
      (n) => Number.isFinite(n) && n > 0,
    )
  )
    return invalid();
  if (
    (scene.walls !== undefined && !Array.isArray(scene.walls)) ||
    (scene.terrain !== undefined && !Array.isArray(scene.terrain))
  )
    return invalid();
  const ids = new Set();
  for (const wall of scene.walls ?? []) {
    if (
      !wall ||
      typeof wall.id !== "string" ||
      !wall.id ||
      ids.has(wall.id) ||
      !["wall", "door"].includes(wall.kind) ||
      !within(scene, wall.a) ||
      !within(scene, wall.b) ||
      same(wall.a, wall.b) ||
      !["blocksMovement", "blocksSight", "blocksEffect", "secret"].every(
        (key) => typeof wall[key] === "boolean",
      ) ||
      // B35 (additive): a one-way barrier names the side it blocks from (FVT-075).
      (wall.blockSide !== undefined && !["left", "right"].includes(wall.blockSide)) ||
      // R3 PR-22 (additive): Foundry's sight restrictions, "limited" (terrain) and
      // "proximity" with its distance in metres.
      (wall.sightMode !== undefined && !SIGHT_MODES.includes(wall.sightMode)) ||
      (wall.proximityMeters !== undefined &&
        !(Number.isFinite(wall.proximityMeters) && wall.proximityMeters > 0)) ||
      !authored(wall)
    )
      return invalid();
    if (
      wall.kind === "door" &&
      (!["closed", "open", "locked"].includes(wall.doorState) ||
        typeof wall.playerOperable !== "boolean" ||
        !Number.isFinite(wall.interactionRangeMeters) ||
        wall.interactionRangeMeters <= 0)
    )
      return invalid();
    ids.add(wall.id);
  }
  for (const terrain of scene.terrain ?? []) {
    if (
      !terrain ||
      typeof terrain.id !== "string" ||
      !terrain.id ||
      ids.has(terrain.id) ||
      terrain.kind !== "difficult" ||
      !within(scene, terrain) ||
      !Number.isFinite(terrain.width) ||
      !Number.isFinite(terrain.height) ||
      terrain.width <= 0 ||
      terrain.height <= 0 ||
      !within(scene, { x: terrain.x + terrain.width, y: terrain.y + terrain.height }) ||
      !authored(terrain)
    )
      return invalid();
    ids.add(terrain.id);
  }
  return [];
}

// B40 (additive): the scene's distance rule (`scene.distanceRule`, Roll20 page setting
// R20-086; hexes after Solasta II CRP-121). P6 TV-10: absent or unknown = "grid-srd", SRD
// 5.2.1 "Playing on a Grid" (EN 13 / IT 14): an adjacent square, diagonal included, costs one
// square (Foundry's default 5/5/5 rule). "euclidean" is the gridless straight line (the old
// default, now an explicit choice); "grid-alternate" (5-10-5) and "manhattan" are optional
// table variants; "hex" counts pointy-top hexes as wide as a grid cell. Every rule is linear
// along a straight segment, so terrain pieces of one segment still add up to the whole segment.
export const DISTANCE_RULES = Object.freeze([
  "euclidean",
  "grid-srd",
  "grid-alternate",
  "manhattan",
  "hex",
]);
export function segmentMeters(scene, a, b) {
  const dx = (b.x - a.x) / scene.gridSize,
    dy = (b.y - a.y) / scene.gridSize;
  const x = Math.abs(dx),
    y = Math.abs(dy);
  const rule = distanceRuleOf(scene);
  let cells;
  if (rule === "euclidean") cells = Math.hypot(x, y);
  else if (rule === "grid-alternate") cells = Math.max(x, y) + Math.min(x, y) / 2;
  else if (rule === "manhattan") cells = x + y;
  else if (rule === "hex") {
    const q = dx - dy / Math.sqrt(3),
      r = (2 * dy) / Math.sqrt(3);
    cells = (Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2;
  } else cells = Math.max(x, y);
  return cells * scene.metersPerCell;
}
/** The scene's effective distance rule: its own, or the SRD 2024 grid by default. */
export const distanceRuleOf = (scene) =>
  DISTANCE_RULES.includes(scene?.distanceRule) ? scene.distanceRule : "grid-srd";

// P6 TV-10 (Solasta II hex paths CRP-121, Foundry hex rulers): on a hex scene a straight leg
// is walked through the centres of the hexes it crosses, so the path follows the cells. The
// hexes are pointy-top and as wide as a grid cell, laid out as the Table draws them (row 0
// centred at y = size, even rows starting at x = cell / 2).
function hexGeometry(scene) {
  const w = scene.gridSize,
    size = w / Math.sqrt(3);
  return { w, size };
}
function hexOf(scene, p) {
  const { w, size } = hexGeometry(scene);
  const r = (p.y - size) / (1.5 * size);
  const q = (p.x - w / 2) / w - r / 2;
  return cubeRound(q, r);
}
function cubeRound(q, r) {
  const s = -q - r;
  let rq = Math.round(q),
    rr = Math.round(r),
    rs = Math.round(s);
  const dq = Math.abs(rq - q),
    dr = Math.abs(rr - r),
    ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq, r: rr };
}
function hexCenter(scene, hex) {
  const { w, size } = hexGeometry(scene);
  return { x: w * (hex.q + hex.r / 2) + w / 2, y: 1.5 * size * hex.r + size };
}
function hexSteps(scene, a, b) {
  const p = hexOf(scene, a),
    q = hexOf(scene, b);
  return (Math.abs(p.q - q.q) + Math.abs(p.r - q.r) + Math.abs(p.q + p.r - q.q - q.r)) / 2;
}
/** Centres of the hexes strictly between the hexes of `a` and `b` (a hex line, Red Blob). */
export function hexCentersBetween(scene, a, b) {
  const from = hexOf(scene, a),
    to = hexOf(scene, b);
  const n = hexSteps(scene, a, b);
  const out = [];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    // A tiny nudge keeps the line off hex edges (Red Blob's epsilon), so rounding is stable.
    const hex = cubeRound(from.q + (to.q - from.q) * t + 1e-6, from.r + (to.r - from.r) * t + 2e-6);
    const c = hexCenter(scene, hex);
    if (c.x >= 0 && c.y >= 0 && c.x <= scene.width && c.y <= scene.height) out.push(c);
  }
  return out;
}

export function geometryKey(scene) {
  // An opaque local version key, not a serialization exposed to the player.
  // It detects changes; it is not an authentication or cryptographic primitive.
  const value = JSON.stringify([
    scene.id,
    scene.width,
    scene.height,
    scene.gridSize,
    scene.metersPerCell,
    scene.gridSnap,
    scene.gridOffsetX,
    scene.gridOffsetY,
    scene.walls ?? [],
    scene.terrain ?? [],
    // B40: a chosen distance rule changes costs; scenes without one keep their old key.
    ...(scene.distanceRule ? [scene.distanceRule] : []),
  ]);
  let hash = 2166136261,
    second = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
    second = Math.imul(second, 33) ^ value.charCodeAt(i);
  }
  return (
    "geometry-" +
    (hash >>> 0).toString(16).padStart(8, "0") +
    (second >>> 0).toString(16).padStart(8, "0")
  );
}

const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
function intersects(a, b, c, d) {
  const abC = cross(a, b, c),
    abD = cross(a, b, d),
    cdA = cross(c, d, a),
    cdB = cross(c, d, b);
  const on = (a, b, p) =>
    Math.abs(cross(a, b, p)) < EPS &&
    p.x >= Math.min(a.x, b.x) - EPS &&
    p.x <= Math.max(a.x, b.x) + EPS &&
    p.y >= Math.min(a.y, b.y) - EPS &&
    p.y <= Math.max(a.y, b.y) + EPS;
  return (
    (((abC > EPS && abD < -EPS) || (abC < -EPS && abD > EPS)) &&
      ((cdA > EPS && cdB < -EPS) || (cdA < -EPS && cdB > EPS))) ||
    on(a, b, c) ||
    on(a, b, d) ||
    on(c, d, a) ||
    on(c, d, b)
  );
}
function barriers(scene, channel, role) {
  return (scene.walls ?? []).filter(
    (wall) =>
      (role !== "player" || !wall.secret) &&
      wall[channel] &&
      !(wall.kind === "door" && wall.doorState === "open"),
  );
}
// B35 (additive): side of a point relative to a wall's A→B direction in map coordinates
// (y down): "right" when the cross product is positive, "left" when negative, "on" on the
// line. A one-way barrier (`blockSide`: Smoke & Spectre one-sided obstruction lines VTL-071,
// Foundry directional walls FVT-075) blocks sight only for what starts on that side (or on the
// line); its movement and line of effect stay blocked both ways. Walls without `blockSide`
// block both ways on every channel, as before.
export function wallSide(wall, p) {
  const value = cross(wall.a, wall.b, p);
  return value > EPS ? "right" : value < -EPS ? "left" : "on";
}
export function blocksFrom(wall, from) {
  if (!wall.blockSide || !point(from)) return true;
  const side = wallSide(wall, from);
  return side === "on" || side === wall.blockSide;
}
// R3 PR-22 (Foundry wall restrictions, FVT-075): on the sight channel (sight and light) a
// "limited" wall (terrain: tall grass, thin curtains) blocks only when a line crosses two or
// more of them; a "proximity" wall blocks unless the viewer (or light source) is within
// `proximityMeters` of it (3 m when absent). Movement and line of effect keep each wall's
// own flags: the restriction never changes them.
export const SIGHT_MODES = Object.freeze(["limited", "proximity"]);
export const DEFAULT_PROXIMITY_METERS = 3;
function metersToWall(scene, wall, p) {
  const dx = wall.b.x - wall.a.x,
    dy = wall.b.y - wall.a.y;
  const length = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - wall.a.x) * dx + (p.y - wall.a.y) * dy) / length));
  const d = Math.hypot(p.x - (wall.a.x + t * dx), p.y - (wall.a.y + t * dy));
  return (d / scene.gridSize) * scene.metersPerCell;
}
/** A proximity wall the viewer at `from` sees through (within its distance). */
export function proximityOpen(scene, wall, from) {
  return (
    wall.sightMode === "proximity" &&
    metersToWall(scene, wall, from) <= (wall.proximityMeters ?? DEFAULT_PROXIMITY_METERS) + 1e-6
  );
}
export function isSegmentBlocked(scene, from, to, channel = "blocksMovement", { role } = {}) {
  if (validateSceneGeometry(scene).length || !within(scene, from) || !within(scene, to))
    return true;
  if (same(from, to)) return false;
  const crossed = barriers(scene, channel, role).filter(
    (wall) =>
      (channel !== "blocksSight" || blocksFrom(wall, from)) && intersects(from, to, wall.a, wall.b),
  );
  if (channel !== "blocksSight") return crossed.length > 0;
  let limited = 0;
  for (const wall of crossed) {
    if (wall.sightMode === "limited") {
      limited += 1;
      if (limited >= 2) return true;
    } else if (!proximityOpen(scene, wall, from)) return true;
  }
  return false;
}
/**
 * B35 (additive): the visibility polygon seen from `origin` through the scene's barriers on
 * `channel` (default sight), by ray casting to every barrier end point (Foundry and Roll20
 * dynamic vision). Open doors let sight through; closed, locked and secret ones block (a
 * secret door is still a physical wall); one-way barriers block sight only from their side. The
 * scene rectangle bounds the result. Returns the polygon's points in angular order, or []
 * when the geometry or the origin is invalid.
 */
export function visibilityPolygon(scene, origin, { channel = "blocksSight" } = {}) {
  if (validateSceneGeometry(scene).length || !within(scene, origin)) return [];
  const w = scene.width,
    h = scene.height;
  const corners = [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: h },
    { x: 0, y: h },
  ];
  // R3 PR-22: on the sight channel a proximity wall near the origin lets sight through and a
  // limited (terrain) wall stops a ray only at the second one it meets.
  const sight = channel === "blocksSight";
  const segments = [
    ...corners.map((c, i) => [c, corners[(i + 1) % 4]]),
    ...barriers(scene, channel, "dm")
      .filter((wall) => !sight || (blocksFrom(wall, origin) && !proximityOpen(scene, wall, origin)))
      .map((wall) => [wall.a, wall.b, sight && wall.sightMode === "limited"]),
  ];
  const angles = [];
  for (const [a, b] of segments)
    for (const p of [a, b]) {
      const angle = Math.atan2(p.y - origin.y, p.x - origin.x);
      angles.push(angle - 1e-4, angle, angle + 1e-4);
    }
  const hits = [];
  for (const angle of angles) {
    const dx = Math.cos(angle),
      dy = Math.sin(angle);
    let best = Infinity;
    const limited = [];
    for (const [a, b, isLimited] of segments) {
      const sx = b.x - a.x,
        sy = b.y - a.y;
      const denominator = dx * sy - dy * sx;
      if (Math.abs(denominator) < 1e-12) continue;
      const t = ((a.x - origin.x) * sy - (a.y - origin.y) * sx) / denominator;
      const u = ((a.x - origin.x) * dy - (a.y - origin.y) * dx) / denominator;
      if (!(t > EPS && u >= -EPS && u <= 1 + EPS)) continue;
      if (isLimited) limited.push(t);
      else if (t < best) best = t;
    }
    if (limited.length >= 2) best = Math.min(best, limited.sort((p, q) => p - q)[1]);
    if (Number.isFinite(best))
      hits.push({ angle, x: origin.x + dx * best, y: origin.y + dy * best });
  }
  hits.sort((p, q) => p.angle - q.angle);
  return hits.map(({ x, y }) => ({ x, y }));
}
export const hasLineOfSight = (scene, from, to, options) =>
  !isSegmentBlocked(scene, from, to, "blocksSight", options);
export const hasLineOfEffect = (scene, from, to, options) =>
  !isSegmentBlocked(scene, from, to, "blocksEffect", options);

export function previewTokenPlacement(
  scene,
  destination,
  { origin, maxDistanceMeters, excludeActorId } = {},
) {
  const reasons = validateSceneGeometry(scene);
  const validDestination = !!scene && within(scene, destination);
  const ranged = maxDistanceMeters !== undefined;
  const validRange =
    !ranged ||
    (within(scene ?? {}, origin) && Number.isFinite(maxDistanceMeters) && maxDistanceMeters >= 0);
  if (!validDestination || !validRange)
    reasons.push(reason("invalid-placement", "Posizione non valida.", "Invalid position."));
  const distanceMeters =
    point(origin) && validDestination && !reasons.length
      ? (Math.hypot(destination.x - origin.x, destination.y - origin.y) * scene.metersPerCell) /
        scene.gridSize
      : null;
  if (!reasons.length) {
    if (ranged && distanceMeters > maxDistanceMeters + EPS)
      reasons.push(
        reason(
          "placement-range",
          "Scegli un punto entro la portata indicata.",
          "Choose a point within the indicated range.",
        ),
      );
    // Prototype adaptation: each token occupies one grid diameter around its center.
    // Full creature footprints and squeezing remain separate geometry work.
    const occupied = (scene.tokens ?? []).some(
      (token) =>
        token.actorId !== excludeActorId &&
        point(token) &&
        Math.hypot(token.x - destination.x, token.y - destination.y) < scene.gridSize - EPS,
    );
    const wallAtPoint = barriers(scene, "blocksMovement").some((wall) =>
      intersects(destination, destination, wall.a, wall.b),
    );
    if (occupied || wallAtPoint)
      reasons.push(
        reason(
          "placement-unavailable",
          "Questo spazio non è disponibile.",
          "This space is unavailable.",
        ),
      );
  }
  return {
    available: !reasons.length,
    point: point(destination) ? copyPoint(destination) : null,
    distanceMeters,
    reasons,
  };
}

function terrainPieces(scene, from, to, crawling) {
  const cuts = [0, 1],
    dx = to.x - from.x,
    dy = to.y - from.y;
  for (const rect of scene.terrain ?? []) {
    if (Math.abs(dx) > EPS)
      for (const x of [rect.x, rect.x + rect.width]) {
        const t = (x - from.x) / dx;
        if (t > EPS && t < 1 - EPS) cuts.push(t);
      }
    if (Math.abs(dy) > EPS)
      for (const y of [rect.y, rect.y + rect.height]) {
        const t = (y - from.y) / dy;
        if (t > EPS && t < 1 - EPS) cuts.push(t);
      }
  }
  const sorted = [...new Set(cuts)].sort((a, b) => a - b),
    pieces = [];
  for (let i = 1; i < sorted.length; i++) {
    const a = lerp(from, to, sorted[i - 1]),
      b = lerp(from, to, sorted[i]),
      middle = lerp(a, b, 0.5);
    const difficult = (scene.terrain ?? []).some(
      (r) =>
        middle.x >= r.x - EPS &&
        middle.x <= r.x + r.width + EPS &&
        middle.y >= r.y - EPS &&
        middle.y <= r.y + r.height + EPS,
    );
    // B40: the scene's distance rule (Euclidean when none is chosen).
    const distance = segmentMeters(scene, a, b);
    const multiplier = (difficult ? 2 : 1) + (crawling ? 1 : 0);
    if (distance > EPS)
      pieces.push({
        from: a,
        to: b,
        distance,
        cost: distance * multiplier,
        multiplier,
      });
  }
  return pieces;
}

export function tracePath(
  scene,
  start,
  points,
  { budget = Infinity, role, crawling = false } = {},
) {
  const reasons = validateSceneGeometry(scene);
  if (
    !within(scene, start) ||
    !Array.isArray(points) ||
    points.some((p) => !within(scene, p)) ||
    !(budget === Infinity || (Number.isFinite(budget) && budget >= 0))
  )
    reasons.push(reason("invalid-path", "Percorso non valido.", "Invalid path."));
  const validPoints = Array.isArray(points) ? points.filter(point).map(copyPoint) : [];
  // P6 TV-10: on hexes each leg walks through the centres of the hexes it crosses.
  const walked =
    distanceRuleOf(scene) === "hex" && !reasons.length && point(start)
      ? validPoints.flatMap((p, i) => [
          ...hexCentersBetween(scene, i ? validPoints[i - 1] : start, p),
          p,
        ])
      : validPoints;
  const result = {
    start: copyPoint(start),
    target: validPoints.at(-1) ?? copyPoint(start),
    end: copyPoint(start),
    path: [copyPoint(start), ...walked],
    reachablePath: [copyPoint(start)],
    distance: 0,
    totalCost: 0,
    cost: 0,
    limited: false,
    blocked: reasons.length > 0,
    reasons,
    segments: [],
    geometryKey: geometryKey(scene),
    metric: distanceRuleOf(scene),
    sources: structuredClone(SPATIAL_SOURCES),
  };
  if (reasons.length) return result;
  const pieces = [];
  const hex = distanceRuleOf(scene) === "hex";
  for (let i = 1; i < result.path.length; i++) {
    const from = result.path[i - 1],
      to = result.path[i];
    if (isSegmentBlocked(scene, from, to, "blocksMovement", { role })) result.blocked = true;
    const parts = terrainPieces(scene, from, to, crawling);
    // P6 TV-10: a step between neighbouring hexes costs one hex, wherever in its hex a token
    // stands (a token off the hex centre pays no extra for the zigzag through the centres).
    if (hex) {
      const cells = hexSteps(scene, from, to),
        raw = parts.reduce((sum, part) => sum + part.distance, 0);
      if (cells > 0 && raw > EPS) {
        const k = (cells * scene.metersPerCell) / raw;
        for (const part of parts) {
          part.distance *= k;
          part.cost *= k;
        }
      }
    }
    pieces.push(...parts);
  }
  result.distance = pieces.reduce((sum, p) => sum + p.distance, 0);
  result.totalCost = pieces.reduce((sum, p) => sum + p.cost, 0);
  if (result.blocked)
    reasons.push(
      reason(
        "path-blocked",
        "Il percorso non è percorribile. Modifica la destinazione o i punti intermedi.",
        "The path is blocked. Change the destination or waypoints.",
      ),
    );
  let remaining = result.blocked ? 0 : budget;
  for (const piece of pieces) {
    if (remaining >= piece.cost - EPS) {
      result.segments.push({ ...piece, reachable: true });
      result.end = copyPoint(piece.to);
      result.reachablePath.push(copyPoint(piece.to));
      result.cost += piece.cost;
      remaining = Math.max(0, remaining - piece.cost);
    } else if (remaining > EPS) {
      const fraction = remaining / piece.cost,
        split = lerp(piece.from, piece.to, fraction);
      result.segments.push(
        {
          ...piece,
          to: split,
          distance: piece.distance * fraction,
          cost: remaining,
          reachable: true,
        },
        {
          ...piece,
          from: split,
          distance: piece.distance * (1 - fraction),
          cost: piece.cost - remaining,
          reachable: false,
        },
      );
      result.end = split;
      result.reachablePath.push(split);
      result.cost += remaining;
      remaining = 0;
    } else result.segments.push({ ...piece, reachable: false });
  }
  result.limited = !result.blocked && result.totalCost > budget + EPS;
  return result;
}

export function findApproachPath(
  scene,
  start,
  target,
  reachPixels,
  { role, waypoints = [], crawling = false } = {},
) {
  if (
    validateSceneGeometry(scene).length ||
    !within(scene, start) ||
    !within(scene, target) ||
    !Number.isFinite(reachPixels) ||
    reachPixels <= 0 ||
    !Array.isArray(waypoints) ||
    waypoints.some((p) => !within(scene, p))
  )
    return null;
  const prefix = tracePath(scene, start, waypoints, { role, crawling });
  if (prefix.blocked) return null;
  const origin = waypoints.at(-1) ?? start,
    margin = 0.25;
  if (
    Math.hypot(origin.x - target.x, origin.y - target.y) <= reachPixels + EPS &&
    hasLineOfEffect(scene, origin, target, { role })
  )
    return waypoints.map(copyPoint);
  const candidates = [];
  const angle = Math.atan2(origin.y - target.y, origin.x - target.x);
  for (let i = 0; i < 32; i++) {
    const a = angle + (i * Math.PI) / 16,
      p = {
        x: target.x + Math.cos(a) * Math.max(0, reachPixels - margin),
        y: target.y + Math.sin(a) * Math.max(0, reachPixels - margin),
      };
    if (within(scene, p) && hasLineOfEffect(scene, p, target, { role })) candidates.push(p);
  }
  const nodes = [copyPoint(origin), ...candidates],
    goalCount = candidates.length;
  for (const wall of barriers(scene, "blocksMovement", role))
    for (const endpoint of [wall.a, wall.b])
      for (const dx of [-margin, margin])
        for (const dy of [-margin, margin]) {
          const p = { x: endpoint.x + dx, y: endpoint.y + dy };
          if (within(scene, p)) nodes.push(p);
        }
  // A small visibility graph suits authored sample scenes. No invented door opening,
  // collision-free shortcuts through secret geometry, or 3D navigation.
  const costs = nodes.map(() => Infinity),
    previous = nodes.map(() => -1),
    visited = new Set();
  costs[0] = 0;
  while (visited.size < nodes.length) {
    let current = -1;
    for (let i = 0; i < nodes.length; i++)
      if (!visited.has(i) && (current < 0 || costs[i] < costs[current])) current = i;
    if (current < 0 || !Number.isFinite(costs[current])) return null;
    if (current > 0 && current <= goalCount) {
      const path = [];
      for (let i = current; i > 0; i = previous[i]) path.unshift(copyPoint(nodes[i]));
      return [...waypoints.map(copyPoint), ...path];
    }
    visited.add(current);
    for (let next = 0; next < nodes.length; next++)
      if (
        !visited.has(next) &&
        next !== current &&
        !isSegmentBlocked(scene, nodes[current], nodes[next], "blocksMovement", { role })
      ) {
        const cost =
          costs[current] +
          tracePath(scene, nodes[current], [nodes[next]], { role, crawling }).totalCost;
        if (cost < costs[next] - EPS) {
          costs[next] = cost;
          previous[next] = current;
        }
      }
  }
  return null;
}

// ---------------------------------------------------------------- P6 TV-01 routing

// A small binary heap keyed by `f` (A* open list).
function heap() {
  const items = [];
  const up = (i) => {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[parent].f <= items[i].f) break;
      [items[parent], items[i]] = [items[i], items[parent]];
      i = parent;
    }
  };
  const down = (i) => {
    for (;;) {
      const l = 2 * i + 1,
        r = l + 1;
      let m = i;
      if (l < items.length && items[l].f < items[m].f) m = l;
      if (r < items.length && items[r].f < items[m].f) m = r;
      if (m === i) return;
      [items[m], items[i]] = [items[i], items[m]];
      i = m;
    }
  };
  return {
    get size() {
      return items.length;
    },
    push(item) {
      items.push(item);
      up(items.length - 1);
    },
    pop() {
      const top = items[0],
        last = items.pop();
      if (items.length) {
        items[0] = last;
        down(0);
      }
      return top;
    },
  };
}
/**
 * One leg from `a` to `b` around the scene's movement barriers: A* over a half-cell lattice
 * (8 neighbours, straight-line costs), then string-pulled so the path keeps only the corners
 * it needs (BG3 and Foundry pathfinding walk around walls; the Table draws the result).
 * Returns the points after `a` (ending with `b`), or null when no way exists.
 */
function routeLeg(scene, a, b, role) {
  const blocked = (p, q) => isSegmentBlocked(scene, p, q, "blocksMovement", { role });
  if (!blocked(a, b)) return [copyPoint(b)];
  const step = scene.gridSize / 2;
  const ox = (((scene.gridOffsetX || 0) % step) + step) % step || step / 2;
  const oy = (((scene.gridOffsetY || 0) % step) + step) % step || step / 2;
  const cols = Math.floor((scene.width - ox) / step) + 1,
    rows = Math.floor((scene.height - oy) / step) + 1;
  if (cols * rows > 40000) return null;
  const at = (i) => ({ x: ox + (i % cols) * step, y: oy + Math.floor(i / cols) * step });
  const START = -1,
    GOAL = -2;
  const node = (id) => (id === START ? a : id === GOAL ? b : at(id));
  // Lattice nodes near a free point, joined to it by a straight free segment.
  const near = (p) => {
    const c = Math.round((p.x - ox) / step),
      r = Math.round((p.y - oy) / step),
      out = [];
    for (let dr = -2; dr <= 2; dr++)
      for (let dc = -2; dc <= 2; dc++) {
        const cc = c + dc,
          rr = r + dr;
        if (cc < 0 || rr < 0 || cc >= cols || rr >= rows) continue;
        const id = rr * cols + cc;
        if (!blocked(p, at(id))) out.push(id);
      }
    return out;
  };
  const goalLinks = new Set(near(b));
  const g = new Map([[START, 0]]),
    from = new Map(),
    closed = new Set(),
    open = heap();
  const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
  open.push({ id: START, f: dist(a, b) });
  const relax = (current, next) => {
    const cost = g.get(current) + dist(node(current), node(next));
    if (cost < (g.get(next) ?? Infinity) - EPS) {
      g.set(next, cost);
      from.set(next, current);
      open.push({ id: next, f: cost + dist(node(next), b) });
    }
  };
  let found = false;
  while (open.size) {
    const { id } = open.pop();
    if (closed.has(id)) continue;
    if (id === GOAL) {
      found = true;
      break;
    }
    closed.add(id);
    if (id === START) {
      for (const next of near(a)) relax(START, next);
      continue;
    }
    if (goalLinks.has(id)) relax(id, GOAL);
    const c = id % cols,
      r = Math.floor(id / cols);
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        const cc = c + dc,
          rr = r + dr;
        if (cc < 0 || rr < 0 || cc >= cols || rr >= rows) continue;
        const next = rr * cols + cc;
        if (closed.has(next) || blocked(at(id), at(next))) continue;
        relax(id, next);
      }
  }
  if (!found) return null;
  const chain = [];
  for (let id = GOAL; id !== undefined && id !== START; id = from.get(id)) chain.unshift(node(id));
  // String pulling: from each kept point, jump to the farthest point still in straight sight.
  const pulled = [];
  let anchor = a,
    i = 0;
  while (i < chain.length) {
    let j = chain.length - 1;
    while (j > i && blocked(anchor, chain[j])) j--;
    pulled.push(copyPoint(chain[j]));
    anchor = chain[j];
    i = j + 1;
  }
  return pulled;
}
/**
 * P6 TV-01: the points of a move from `start` through `waypoints` to `target`, walking around
 * walls and closed doors when a straight leg is blocked (a free leg stays straight, as the
 * Foundry ruler draws it). Returns {points, routed}, or null when the destination cannot be
 * reached on foot. Open doors let the path through; secret walls stay hidden from players
 * (their collision is still checked when the move is confirmed).
 */
export function routePath(scene, start, target, { role, waypoints = [] } = {}) {
  if (validateSceneGeometry(scene).length || !within(scene, start) || !within(scene, target))
    return null;
  if (!Array.isArray(waypoints) || waypoints.some((p) => !within(scene, p))) return null;
  const legs = [...waypoints.map(copyPoint), copyPoint(target)];
  const points = [];
  let routed = false,
    from = start;
  for (const to of legs) {
    const leg = routeLeg(scene, from, to, role);
    if (!leg) return null;
    if (leg.length > 1) routed = true;
    points.push(...leg);
    from = to;
  }
  return { points, routed };
}
