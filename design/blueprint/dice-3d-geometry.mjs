// B56 animated dice: pure geometry, resting orientation, motion path and Canvas 2D drawing.
// No dependency and no DOM access at import time. Every die is a real convex polyhedron
// (tetrahedron, cube, octahedron, pentagonal trapezohedron, dodecahedron, icosahedron);
// the percentile die is two d10s (tens and units), as on a physical table.
//
// Coordinates: die space is right-handed; view space has x to the right, y up and z toward
// the viewer (the camera looks down on the table). Screen space is CSS pixels, y down.

const PHI = (1 + Math.sqrt(5)) / 2;

export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const length = (a) => Math.hypot(a[0], a[1], a[2]);
export const normalize = (a) => {
  const l = length(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
// The part of `a` perpendicular to the unit vector `n`.
const reject = (a, n) => sub(a, scale(n, dot(a, n)));
const average = (points) => scale(points.reduce(add, [0, 0, 0]), 1 / points.length);

// 3×3 matrices as three rows; M·v maps die space to view space.
export const matVec = (m, v) => [dot(m[0], v), dot(m[1], v), dot(m[2], v)];
export function matMul(a, b) {
  const col = (j) => [b[0][j], b[1][j], b[2][j]];
  return a.map((row) => [dot(row, col(0)), dot(row, col(1)), dot(row, col(2))]);
}
export function rotZ(angle) {
  const c = Math.cos(angle),
    s = Math.sin(angle);
  return [
    [c, -s, 0],
    [s, c, 0],
    [0, 0, 1],
  ];
}
// Rodrigues rotation about a unit axis.
export function rotAxis(axis, angle) {
  const [x, y, z] = normalize(axis);
  const c = Math.cos(angle),
    s = Math.sin(angle),
    t = 1 - c;
  return [
    [t * x * x + c, t * x * y - s * z, t * x * z + s * y],
    [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
    [t * x * z - s * y, t * y * z + s * x, t * z * z + c],
  ];
}

// Every sign combination of a template such as [0, a, b]; zeros keep a single sign.
function signed(template) {
  let out = [[]];
  for (const value of template)
    out = out.flatMap((head) =>
      value === 0
        ? [[...head, 0]]
        : [
            [...head, value],
            [...head, -value],
          ],
    );
  return out;
}
const cyclic = (a, b) => [...signed([0, a, b]), ...signed([a, b, 0]), ...signed([b, 0, a])];

// Orders a face's vertices counter-clockwise around its outward normal and derives the
// exact normal with Newell's method.
function orderFace(vertices, indices, outward) {
  const center = average(indices.map((i) => vertices[i]));
  const a = normalize(reject(sub(vertices[indices[0]], center), normalize(outward)));
  const b = cross(normalize(outward), a);
  const angle = (i) => {
    const d = sub(vertices[i], center);
    return Math.atan2(dot(d, b), dot(d, a));
  };
  const ordered = [...indices].sort((i, j) => angle(i) - angle(j));
  let n = [0, 0, 0];
  for (let k = 0; k < ordered.length; k++) {
    const p = vertices[ordered[k]],
      q = vertices[ordered[(k + 1) % ordered.length]];
    n = add(n, [
      (p[1] - q[1]) * (p[2] + q[2]),
      (p[2] - q[2]) * (p[0] + q[0]),
      (p[0] - q[0]) * (p[1] + q[1]),
    ]);
  }
  n = normalize(n);
  if (dot(n, center) < 0) {
    ordered.reverse();
    n = scale(n, -1);
  }
  return { indices: ordered, normal: n, center };
}
// Faces of a convex polyhedron from its face directions: the vertices farthest along a
// direction form that face.
function facesFromNormals(vertices, normals) {
  return normals.map((direction) => {
    const n = normalize(direction);
    const far = Math.max(...vertices.map((v) => dot(v, n)));
    const indices = vertices.flatMap((v, i) => (dot(v, n) > far - 1e-6 ? [i] : []));
    return orderFace(vertices, indices, n);
  });
}
function fitRadius(vertices, radius) {
  const max = Math.max(...vertices.map(length));
  return vertices.map((v) => scale(v, radius / max));
}
// Pairs each face with the face on the opposite side (parallel, opposite normal).
function oppositePairs(faces) {
  const pairs = [];
  const used = new Set();
  faces.forEach((face, i) => {
    if (used.has(i)) return;
    const j = faces.findIndex(
      (other, k) => k !== i && !used.has(k) && dot(other.normal, face.normal) < -0.999,
    );
    if (j < 0) throw Error("Face without an opposite face");
    used.add(i).add(j);
    pairs.push([i, j]);
  });
  return pairs;
}

// Real dice number opposite faces to a constant sum: n + 1 (d6, d8, d12, d20) or 9 for the
// ten digits of a d10.
function numberFaces(faces, sides) {
  const pairs = oppositePairs(faces);
  pairs.forEach(([i, j], k) => {
    if (sides === 10) {
      faces[i].value = k;
      faces[j].value = 9 - k;
    } else {
      faces[i].value = k + 1;
      faces[j].value = sides - k;
    }
  });
}

const SHAPES = {
  d4() {
    const vertices = fitRadius(
      [
        [1, 1, 1],
        [1, -1, -1],
        [-1, 1, -1],
        [-1, -1, 1],
      ],
      1.18,
    );
    const faces = facesFromNormals(
      vertices,
      vertices.map((v) => scale(v, -1)),
    );
    // Top-read d4: each vertex carries one value, printed near that vertex on its three
    // faces; the result is the value of the vertex pointing up.
    const vertexValues = [1, 2, 3, 4];
    for (const face of faces) {
      face.up = normalize(reject(sub(vertices[face.indices[0]], face.center), face.normal));
      face.value = null;
    }
    return { vertices, faces, vertexValues, labelSize: 30 };
  },
  d6() {
    const vertices = fitRadius(signed([1, 1, 1]), 0.95);
    const faces = facesFromNormals(vertices, [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ]);
    // Numerals aligned with the square's edges.
    for (const face of faces) {
      const [p, q] = face.indices;
      face.up = normalize(
        reject(sub(average([vertices[p], vertices[q]]), face.center), face.normal),
      );
    }
    numberFaces(faces, 6);
    return { vertices, faces, labelSize: 60 };
  },
  d8() {
    const vertices = fitRadius(
      [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1],
      ],
      1.02,
    );
    const faces = facesFromNormals(vertices, signed([1, 1, 1]));
    for (const face of faces)
      face.up = normalize(reject(sub(vertices[face.indices[0]], face.center), face.normal));
    numberFaces(faces, 8);
    return { vertices, faces, labelSize: 40 };
  },
  d10() {
    // Pentagonal trapezohedron: two rings of five vertices at ±a, offset by 36°, and
    // apexes at ±h. h = a(1 + cos 36°)/(1 − cos 36°) makes every kite planar.
    const a = 0.105;
    const c36 = Math.cos(Math.PI / 5);
    const h = (a * (1 + c36)) / (1 - c36);
    const ring = (offset, z) =>
      Array.from({ length: 5 }, (_, k) => {
        const angle = ((72 * k + offset) * Math.PI) / 180;
        return [Math.cos(angle), Math.sin(angle), z];
      });
    const raw = [[0, 0, h], ...ring(0, a), ...ring(36, -a), [0, 0, -h]];
    const vertices = fitRadius(raw, 1.02);
    const U = (k) => 1 + (k % 5);
    const L = (k) => 6 + (k % 5);
    const sets = [];
    for (let k = 0; k < 5; k++) {
      sets.push({ indices: [0, U(k), L(k), U(k + 1)], apex: 0 });
      sets.push({ indices: [11, L(k), U(k + 1), L(k + 1)], apex: 11 });
    }
    const faces = sets.map(({ indices, apex }) => {
      const face = orderFace(vertices, indices, average(indices.map((i) => vertices[i])));
      // Numerals point toward the apex; the label sits in the wide half of the kite.
      face.up = normalize(reject(sub(vertices[apex], face.center), face.normal));
      face.labelCenter = add(face.center, scale(face.up, -0.08));
      return face;
    });
    numberFaces(faces, 10);
    return { vertices, faces, labelSize: 30 };
  },
  d12() {
    const vertices = fitRadius([...signed([1, 1, 1]), ...cyclic(1 / PHI, PHI)], 1.02);
    const faces = facesFromNormals(vertices, cyclic(PHI, 1));
    for (const face of faces)
      face.up = normalize(reject(sub(vertices[face.indices[0]], face.center), face.normal));
    numberFaces(faces, 12);
    return { vertices, faces, labelSize: 34 };
  },
  d20() {
    const vertices = fitRadius(cyclic(1, PHI), 1.06);
    const faces = facesFromNormals(vertices, [...signed([1, 1, 1]), ...cyclic(PHI, 1 / PHI)]);
    for (const face of faces)
      face.up = normalize(reject(sub(vertices[face.indices[0]], face.center), face.normal));
    numberFaces(faces, 20);
    return { vertices, faces, labelSize: 27 };
  },
};

const meshes = new Map();
/** One cached mesh per kind: "d4", "d6", "d8", "d10", "d12" or "d20". */
export function getMesh(kind) {
  if (!SHAPES[kind]) throw Error(`No 3D shape for ${kind}`);
  if (!meshes.has(kind)) {
    const mesh = { kind, ...SHAPES[kind]() };
    for (const face of mesh.faces) face.right = cross(face.up, face.normal);
    meshes.set(kind, Object.freeze(mesh));
  }
  return meshes.get(kind);
}

export const MESH_SIDES = Object.freeze([4, 6, 8, 10, 12, 20, 100]);

/**
 * The physical dice that show one recorded die result. A d100 is two d10s: tens
 * ("00"–"90") and units ("0"–"9"); 100 reads "00" + "0". A plain d10 prints 1–10.
 * Returns [] for a die with no real 3D shape (for example a d3), which is shown flat.
 */
export function physicalDice(sides, value) {
  if (!Number.isInteger(value) || value < 1 || value > sides) return [];
  if (sides === 100) {
    const units = value % 10;
    const tens = Math.floor((value % 100) / 10);
    return [
      { kind: "d10", face: tens, labels: "tens" },
      { kind: "d10", face: units, labels: "units" },
    ];
  }
  if (sides === 10) return [{ kind: "d10", face: value % 10, labels: "d10" }];
  if ([4, 6, 8, 12, 20].includes(sides))
    return [{ kind: "d" + sides, face: value, labels: "plain" }];
  return [];
}
/** Text printed on a face (or a d4 vertex) for a label scheme. */
export function faceLabel(value, labels = "plain") {
  if (labels === "tens") return value === 0 ? "00" : value + "0";
  if (labels === "units") return String(value);
  if (labels === "d10") return value === 0 ? "10" : String(value);
  return String(value);
}
/** Value of a percentile pair or a single die read back from its physical dice. */
export function readPhysical(sides, faces) {
  if (sides === 100) {
    const total = faces[0] * 10 + faces[1];
    return total === 0 ? 100 : total;
  }
  if (sides === 10) return faces[0] === 0 ? 10 : faces[0];
  return faces[0];
}

/**
 * Orientation (die → view) that rests the die with `face` up, the numeral upright, then
 * turned by `yaw` about the view axis. For a d4, `face` names the vertex pointing up.
 */
export function restingMatrix(mesh, face, yaw = 0) {
  let e3, e2;
  if (mesh.kind === "d4") {
    const index = mesh.vertexValues.indexOf(face);
    if (index < 0) throw Error(`No d4 vertex ${face}`);
    e3 = normalize(mesh.vertices[index]);
    e2 = normalize(reject(mesh.vertices[(index + 1) % 4], e3));
  } else {
    const target = mesh.faces.find((f) => f.value === face);
    if (!target) throw Error(`No ${mesh.kind} face ${face}`);
    e3 = target.normal;
    e2 = target.up;
  }
  return matMul(rotZ(yaw), [cross(e2, e3), e2, e3]);
}
/** The value a die shows to the viewer in an orientation: top face, or top d4 vertex. */
export function upValue(mesh, matrix) {
  if (mesh.kind === "d4") {
    let best = -Infinity,
      value = null;
    mesh.vertices.forEach((v, i) => {
      const z = matVec(matrix, v)[2];
      if (z > best) [best, value] = [z, mesh.vertexValues[i]];
    });
    return value;
  }
  let best = -Infinity,
    value = null;
  for (const face of mesh.faces) {
    const z = matVec(matrix, face.normal)[2];
    if (z > best) [best, value] = [z, face.value];
  }
  return value;
}

// ---------------------------------------------------------------- motion

export const easeOutCubic = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

/** Small deterministic generator, so a replay of the same roll moves the same way. */
export function seeded(seedText) {
  let h = 2166136261;
  for (const ch of String(seedText)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  let s = h >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A roll along the table: the die travels from `from` to `to`, rolling about the axis
 * perpendicular to its travel and bouncing lower each time, and settles exactly in
 * `final` (t = 1 returns `final` unchanged). Motion only presents the recorded face.
 */
export function tumblePath({ from, to, final, turns = 3, spin = 1, bounces = 3, lift = 1 }) {
  const dx = to[0] - from[0],
    dy = to[1] - from[1];
  // Screen y grows downward; the rolling axis is up × travel in view space (y up).
  const axis = Math.hypot(dx, dy) > 1e-6 ? [dy, dx, 0] : [1, 0, 0];
  const total = turns * 2 * Math.PI;
  return (t) => {
    const clamped = Math.min(1, Math.max(0, t));
    const e = easeOutCubic(clamped);
    const rest = 1 - e;
    const matrix =
      rest < 1e-9 ? final : matMul(rotZ(spin * rest), matMul(rotAxis(axis, -total * rest), final));
    const height =
      lift * Math.pow(1 - clamped, 1.7) * Math.abs(Math.cos(Math.PI * bounces * clamped));
    return {
      x: from[0] + dx * e,
      y: from[1] + dy * e,
      height,
      matrix,
      done: clamped >= 1,
    };
  };
}

// ---------------------------------------------------------------- drawing

/** "#rrggbb" → [r, g, b]. */
export function hexRGB(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return [200, 160, 80];
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgb = (c, alpha = 1) =>
  `rgba(${c.map((x) => Math.round(Math.min(255, Math.max(0, x)))).join(",")},${alpha})`;
const LIGHT = normalize([-0.45, 0.6, 0.85]);
const HALF = normalize(add(LIGHT, [0, 0, 1]));

/**
 * Projects a die: returns screen points, and every face facing the viewer with its
 * shading factor, ordered back to front (a convex die only needs back-face culling).
 */
export function projectDie(mesh, { matrix, x, y, size, height = 0 }) {
  const focal = size * 7;
  // A die in the air looks closer (larger) and a little higher on screen.
  const lifted = 1 + height / (size * 6);
  const toScreen = (v) => {
    const r = scale(matVec(matrix, v), size);
    const k = (focal / (focal - r[2])) * lifted;
    return [x + r[0] * k, y - height * 0.2 - r[1] * k, r[2]];
  };
  const points = mesh.vertices.map(toScreen);
  const faces = [];
  for (const face of mesh.faces) {
    const poly = face.indices.map((i) => points[i]);
    let area = 0;
    for (let k = 0; k < poly.length; k++) {
      const p = poly[k],
        q = poly[(k + 1) % poly.length];
      area += p[0] * q[1] - q[0] * p[1];
    }
    // Counter-clockwise in view space (y up) is clockwise on screen (y down).
    if (area >= -1e-6) continue;
    const n = matVec(matrix, face.normal);
    faces.push({ face, poly, normal: n, depth: average(poly)[2] });
  }
  faces.sort((a, b) => a.depth - b.depth);
  return { points, faces, toScreen };
}

/**
 * Affine frame of a numeral: text x (right) follows `xAxis`, text y (down, as in canvas)
 * follows `yAxis`; both are the screen images of 1/100 of the die radius.
 */
export function labelTransform({ origin, xAxis, yAxis, dpr = 1 }) {
  return [
    dpr * xAxis[0],
    dpr * xAxis[1],
    dpr * yAxis[0],
    dpr * yAxis[1],
    dpr * origin[0],
    dpr * origin[1],
  ];
}
function drawLabel(g, text, { origin, xAxis, yAxis, dpr, size, ink, alpha, underline }) {
  g.save();
  g.setTransform(...labelTransform({ origin, xAxis, yAxis, dpr }));
  g.fillStyle = rgb(ink, alpha);
  g.font = `700 ${size}px "Times New Roman", Times, serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, 0, 0);
  if (underline) {
    const w = Math.max(size * 0.45, g.measureText?.(text)?.width ?? size * 0.5);
    g.fillRect(-w / 2, size * 0.46, w, Math.max(2, size * 0.08));
  }
  g.restore();
}

/**
 * Draws one die on a 2D canvas context (CSS pixel coordinates, device pixel ratio `dpr`).
 * `colors` is {body: "#rrggbb", ink: "#rrggbb", edge?}. `labels` picks the numeral scheme.
 */
export function drawDie(g, mesh, options) {
  const { size, dpr = 1, colors, labels = "plain", dim = false } = options;
  const body = hexRGB(colors?.body);
  const ink = hexRGB(colors?.ink ?? "#1b140a");
  const { faces, toScreen } = projectDie(mesh, options);
  const alpha = dim ? 0.38 : 1;
  g.save();
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.lineJoin = "round";
  g.lineWidth = Math.max(1, size * 0.035);
  for (const { face, poly, normal } of faces) {
    const lambert = Math.max(0, dot(normal, LIGHT));
    const shine = Math.pow(Math.max(0, dot(normal, HALF)), 24) * 0.45;
    const k = 0.5 + 0.62 * lambert;
    const fill = body.map((c) => c * k + 255 * shine);
    g.beginPath();
    poly.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.closePath();
    g.fillStyle = rgb(fill, alpha);
    g.fill();
    g.strokeStyle = rgb(
      body.map((c) => c * 0.42),
      alpha,
    );
    g.stroke();
    const facing = normal[2];
    if (facing < 0.08) continue;
    const labelAlpha = alpha * Math.min(1, (facing - 0.08) * 3);
    const step = 0.01;
    const frame = (center) => {
      const origin = toScreen(center);
      const xs = toScreen(add(center, scale(face.right, step)));
      const ys = toScreen(add(center, scale(face.up, step)));
      return {
        origin,
        xAxis: [xs[0] - origin[0], xs[1] - origin[1]],
        // Screen y points down; the numeral's up is the face's up.
        yAxis: [-(ys[0] - origin[0]), -(ys[1] - origin[1])],
      };
    };
    if (mesh.kind === "d4") {
      // Three numerals per face, each near its vertex and pointing at it.
      for (const index of face.indices) {
        const corner = mesh.vertices[index];
        const toward = normalize(reject(sub(corner, face.center), face.normal));
        const center = add(face.center, scale(sub(corner, face.center), 0.46));
        const origin = toScreen(center);
        const right = cross(toward, face.normal);
        const xs = toScreen(add(center, scale(right, step)));
        const ys = toScreen(add(center, scale(toward, step)));
        drawLabel(g, faceLabel(mesh.vertexValues[index]), {
          origin,
          xAxis: [xs[0] - origin[0], xs[1] - origin[1]],
          yAxis: [-(ys[0] - origin[0]), -(ys[1] - origin[1])],
          dpr,
          size: mesh.labelSize,
          ink,
          alpha: labelAlpha,
        });
      }
      continue;
    }
    const text = faceLabel(face.value, labels);
    drawLabel(g, text, {
      ...frame(face.labelCenter ?? face.center),
      dpr,
      size: mesh.labelSize * (text.length > 1 && mesh.kind === "d10" ? 0.82 : 1),
      ink,
      alpha: labelAlpha,
      underline: mesh.kind !== "d6" && (text === "6" || text === "9"),
    });
  }
  g.restore();
}

/**
 * Small value badge under a die at rest, in the die's colours: a d4's vertex numerals
 * are too small to read at table size, so its recorded value is also printed here.
 */
export function drawValueBadge(g, { x, y, size, dpr = 1, text, colors }) {
  const body = hexRGB(colors?.body);
  const ink = hexRGB(colors?.ink ?? "#1b140a");
  const font = Math.max(14, Math.round(size * 0.5));
  const h = font + 8;
  const w = Math.max(h, String(text).length * font * 0.62 + 14);
  const top = y + size * 0.78;
  const r = h / 2;
  g.save();
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.beginPath();
  g.moveTo(x - w / 2 + r, top);
  g.lineTo(x + w / 2 - r, top);
  g.arc?.(x + w / 2 - r, top + r, r, -Math.PI / 2, Math.PI / 2);
  g.lineTo(x - w / 2 + r, top + h);
  g.arc?.(x - w / 2 + r, top + r, r, Math.PI / 2, (Math.PI * 3) / 2);
  g.closePath();
  g.fillStyle = rgb(body);
  g.fill();
  g.lineWidth = 1.5;
  g.strokeStyle = rgb(ink, 0.55);
  g.stroke();
  g.fillStyle = rgb(ink);
  g.font = `700 ${font}px "Times New Roman", Times, serif`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(String(text), x, top + h / 2 + 1);
  g.restore();
}

/** Soft contact shadow under a die; it shrinks and fades while the die is in the air. */
export function drawShadow(g, { x, y, size, height = 0, dpr = 1 }) {
  const lift = Math.min(1, height / (size * 4));
  g.save();
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = `rgba(0,0,0,${0.34 * (1 - lift * 0.7)})`;
  g.beginPath();
  g.ellipse(
    x + size * 0.18 + height * 0.2,
    y + size * 0.42 + height * 0.1,
    size * (0.92 - lift * 0.25),
    size * (0.38 - lift * 0.1),
    0,
    0,
    Math.PI * 2,
  );
  g.fill();
  g.restore();
}
