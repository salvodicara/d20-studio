// B46 — cover and line of sight geometry (cover.mjs): the nine-point measure, the degrees of
// SRD 5.2.1 "Cover" (EN 15 / IT 16), creatures as Half cover, doors, secret walls and the
// sight area. Synthetic geometry only.
import test from "node:test";
import assert from "node:assert/strict";
import * as C from "../cover.mjs";

const src = { kind: "authored-demo", revision: "test-cover" };
const wall = (id, ax, ay, bx, by, extra = {}) => ({
  id,
  kind: "wall",
  a: { x: ax, y: ay },
  b: { x: bx, y: by },
  blocksMovement: true,
  blocksSight: true,
  blocksEffect: true,
  secret: false,
  source: src,
  ...extra,
});
const scene = (walls = []) => ({
  id: "cover-test",
  width: 1000,
  height: 650,
  gridSize: 50,
  metersPerCell: 1.5,
  tokens: [],
  walls,
});
const A = { x: 100, y: 300, half: 25 };
const T = { x: 500, y: 300, half: 25 };

test("degrees follow the share of the target that stays reachable", () => {
  assert.equal(C.degreeFromClear(9), "none");
  assert.equal(C.degreeFromClear(5), "none");
  assert.equal(C.degreeFromClear(4), "half");
  assert.equal(C.degreeFromClear(3), "half");
  assert.equal(C.degreeFromClear(2), "three-quarters");
  assert.equal(C.degreeFromClear(1), "three-quarters");
  assert.equal(C.degreeFromClear(0), "total");
  assert.deepEqual(Object.fromEntries(C.DEGREES.map((d) => [d, C.DEGREE[d].acBonus])), {
    none: 0,
    half: 2,
    "three-quarters": 5,
    total: null,
  });
  assert.equal(C.moreProtective("half", "three-quarters"), "three-quarters");
  assert.equal(C.moreProtective("total", "half"), "total");
  assert.deepEqual(C.COVER_SOURCE.en.pages, [15]);
  assert.deepEqual(C.COVER_SOURCE.it.pages, [16]);
});

test("nine sample points inside the space, five attack origins, sizes by SRD space", () => {
  const points = C.samplePoints(scene(), T);
  assert.equal(points.length, 9);
  assert.deepEqual(points[0], { x: 500, y: 300 });
  assert.ok(points.every((p) => Math.abs(p.x - 500) <= 20 && Math.abs(p.y - 300) <= 20));
  assert.equal(C.originPoints(scene(), A).length, 5);
  assert.equal(C.footprint(scene(), { x: 0, y: 0 }, { size: "large" }).half, 50);
  assert.equal(C.footprint(scene(), { x: 0, y: 0 }, { size: "tiny" }).half, 12.5);
  // Near an edge the samples stay inside the scene (no false "blocked" from the border).
  assert.ok(C.samplePoints(scene(), { x: 5, y: 5, half: 25 }).every((p) => p.x > 0 && p.y > 0));
});

test("open ground: no cover, every line clear (Peekaboo white)", () => {
  const r = C.coverBetween(scene(), A, T);
  assert.equal(r.degree, "none");
  assert.equal(r.clear, 9);
  assert.equal(r.acBonus, 0);
  assert.ok(r.rays.every((ray) => ray.status === "clear"));
  assert.equal(C.checkColour(r.degree), "clear");
});

test("a wall across the whole line gives Total cover (red lines)", () => {
  const r = C.coverBetween(scene([wall("w", 300, 0, 300, 650)]), A, T);
  assert.equal(r.degree, "total");
  assert.equal(r.clear, 0);
  assert.ok(r.rays.every((ray) => ray.status === "blocked"));
  assert.equal(C.checkColour(r.degree), "blocked");
});

test("a low wall hiding half the target gives Half, an arrow slit Three-Quarters", () => {
  const half = C.coverBetween(scene([wall("low", 460, 650, 460, 290)]), A, T);
  assert.equal(half.degree, "half");
  assert.equal(half.acBonus, 2);
  assert.equal(C.checkColour(half.degree), "partial");
  // A slit between two walls leaves one or two of the nine lines open.
  const slit = C.coverBetween(
    scene([wall("a", 460, 0, 460, 282), wall("b", 460, 286, 460, 650)]),
    A,
    T,
  );
  assert.equal(slit.degree, "three-quarters");
  assert.ok(slit.clear >= 1 && slit.clear <= 2);
  assert.equal(slit.acBonus, 5);
  // The attacker picks its best corner: a wall that only the centre line touches is no cover.
  const corner = C.coverBetween(scene([wall("c", 480, 0, 480, 300)]), A, T);
  assert.equal(corner.degree, "none");
  assert.notDeepEqual(corner.origin, { x: 100, y: 300 });
});

test("another creature on the line gives Half cover, never more (yellow lines)", () => {
  const blocker = { id: "goblin-1", x: 300, y: 305, half: 25 };
  const r = C.coverBetween(scene(), A, T, { blockers: [blocker] });
  assert.equal(r.degree, "half");
  assert.deepEqual(r.creatures, ["goblin-1"]);
  assert.ok(r.rays.some((ray) => ray.status === "partial"));
  // Behind a creature and a Three-Quarters wall: only the most protective degree applies.
  const both = C.coverBetween(
    scene([wall("a", 460, 0, 460, 282), wall("b", 460, 286, 460, 650)]),
    A,
    T,
    { blockers: [blocker] },
  );
  assert.equal(both.degree, "three-quarters");
  // A creature off the line gives nothing.
  const off = C.coverBetween(scene(), A, T, {
    blockers: [{ id: "far", x: 300, y: 450, half: 25 }],
  });
  assert.equal(off.degree, "none");
});

test("doors: open lets the attack through, closed and locked block; secret walls hidden from players", () => {
  const door = (state) =>
    wall("d", 300, 0, 300, 650, {
      kind: "door",
      doorState: state,
      playerOperable: true,
      interactionRangeMeters: 1.5,
    });
  assert.equal(C.coverBetween(scene([door("open")]), A, T).degree, "none");
  assert.equal(C.coverBetween(scene([door("closed")]), A, T).degree, "total");
  assert.equal(C.coverBetween(scene([door("locked")]), A, T).degree, "total");
  const secret = scene([wall("s", 300, 0, 300, 650, { secret: true })]);
  assert.equal(C.coverBetween(secret, A, T, { role: "dm" }).degree, "total");
  assert.equal(C.coverBetween(secret, A, T, { role: "player" }).degree, "none");
});

test("invalid geometry is 'unknown', never a silent 'none'; sight area stops at walls", () => {
  const broken = { ...scene([{ id: "x" }]) };
  assert.equal(C.coverBetween(broken, A, T).degree, "unknown");
  const polygon = C.sightArea(scene([wall("w", 300, 0, 300, 650)]), { x: 100, y: 300 });
  assert.ok(polygon.length >= 4);
  assert.ok(polygon.every((p) => p.x <= 300.5));
  assert.deepEqual(C.sightArea(scene(), null), []);
});
