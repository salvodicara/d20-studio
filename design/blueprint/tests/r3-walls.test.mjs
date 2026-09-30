// R3 PR-22 — Foundry's wall sight restrictions: «Terreno (limitata)» blocks sight and light
// only when a line crosses two or more terrain walls; «Prossimità» blocks sight unless the
// viewer is within the wall's distance. Movement keeps each wall's own movement flag.
import test from "node:test";
import assert from "node:assert/strict";
import {
  hasLineOfSight,
  isSegmentBlocked,
  validateSceneGeometry,
  visibilityPolygon,
} from "../spatial.mjs";
import { BARRIER_TYPES, barrierType, setBarrierType } from "../fog-vision-domain.mjs";
import { wallTypeFlags } from "../spatial-editor.mjs";
import { createInitialState } from "../state.mjs";

const source = { kind: "authored-demo", revision: "r3-walls" };
const wall = (id, x, extra = {}) => ({
  id,
  kind: "wall",
  a: { x, y: 100 },
  b: { x, y: 500 },
  blocksMovement: false,
  blocksSight: true,
  blocksEffect: false,
  secret: false,
  source,
  ...extra,
});
const sceneWith = (walls) => ({
  id: "r3",
  width: 1000,
  height: 650,
  gridSize: 50,
  metersPerCell: 1.5,
  walls,
});
// Whether the ray from `origin` towards `target` reaches it in the visibility polygon: the
// polygon point on that bearing is at least as far as the target.
function polygonReaches(scene, origin, target) {
  const poly = visibilityPolygon(scene, origin);
  const bearing = Math.atan2(target.y - origin.y, target.x - origin.x);
  const hit = poly
    .map((p) => ({ p, d: Math.abs(Math.atan2(p.y - origin.y, p.x - origin.x) - bearing) }))
    .sort((a, b) => a.d - b.d)[0].p;
  return (
    Math.hypot(hit.x - origin.x, hit.y - origin.y) + 1 >=
    Math.hypot(target.x - origin.x, target.y - origin.y)
  );
}

test("R3 PR-22: the barrier lists offer Terreno (limitata) and Prossimità with their description", () => {
  const ids = BARRIER_TYPES.map(([id]) => id);
  assert.ok(ids.includes("terrain") && ids.includes("proximity"));
  const terrain = BARRIER_TYPES.find(([id]) => id === "terrain");
  assert.equal(terrain[1].it, "Terreno (limitata)");
  assert.match(terrain[3].it, /due o più/);
  const proximity = BARRIER_TYPES.find(([id]) => id === "proximity");
  assert.equal(proximity[1].it, "Prossimità");
  assert.equal(wallTypeFlags("terrain").sightMode, "limited");
  assert.equal(wallTypeFlags("proximity").sightMode, "proximity");
  assert.equal(barrierType(wall("t", 300, { sightMode: "limited" })), "terrain");
  assert.equal(
    barrierType(wall("p", 300, { sightMode: "proximity", proximityMeters: 3 })),
    "proximity",
  );
  assert.equal(
    validateSceneGeometry(sceneWith([wall("t", 300, { sightMode: "limited" })])).length,
    0,
  );
  assert.equal(
    validateSceneGeometry(sceneWith([wall("t", 300, { sightMode: "sometimes" })])).length,
    1,
    "an unknown restriction is invalid geometry",
  );
});

test("R3 PR-22: sight passes one terrain wall and stops at the second (line and polygon)", () => {
  const from = { x: 100, y: 300 };
  const beyondOne = { x: 450, y: 300 };
  const beyondTwo = { x: 800, y: 300 };
  const one = sceneWith([wall("t1", 300, { sightMode: "limited" })]);
  assert.equal(hasLineOfSight(one, from, beyondOne), true);
  assert.equal(polygonReaches(one, from, beyondOne), true);
  const two = sceneWith([
    wall("t1", 300, { sightMode: "limited" }),
    wall("t2", 600, { sightMode: "limited" }),
  ]);
  assert.equal(hasLineOfSight(two, from, beyondOne), true, "one wall crossed: visible");
  assert.equal(hasLineOfSight(two, from, beyondTwo), false, "two walls crossed: hidden");
  assert.equal(polygonReaches(two, from, beyondOne), true);
  assert.equal(polygonReaches(two, from, beyondTwo), false);
  // Movement keeps the wall's own flag: a terrain wall of tall grass is walked through.
  assert.equal(isSegmentBlocked(two, from, beyondTwo, "blocksMovement"), false);
  // A normal wall still blocks at once.
  const normal = sceneWith([wall("w", 300)]);
  assert.equal(hasLineOfSight(normal, from, beyondOne), false);
});

test("R3 PR-22: a proximity wall blocks sight unless the viewer is within its distance", () => {
  const scene = sceneWith([
    wall("p", 300, { sightMode: "proximity", proximityMeters: 3, blocksMovement: true }),
  ]);
  const target = { x: 500, y: 300 };
  // 200 px = 4 squares = 6 m from the wall: blocked.
  assert.equal(hasLineOfSight(scene, { x: 100, y: 300 }, target), false);
  assert.equal(polygonReaches(scene, { x: 100, y: 300 }, target), false);
  // 50 px = 1.5 m from the wall: within 3 m, sees through.
  assert.equal(hasLineOfSight(scene, { x: 250, y: 300 }, target), true);
  assert.equal(polygonReaches(scene, { x: 250, y: 300 }, target), true);
  // Movement still stops at it.
  assert.equal(isSegmentBlocked(scene, { x: 250, y: 300 }, target, "blocksMovement"), true);
});

test("R3 PR-22: the DM sets Terreno and Prossimità at the Table; other types clear the restriction", () => {
  const state = createInitialState();
  const scene = state.scenes[0];
  scene.walls = [wall("w1", 300, { blocksMovement: true, blocksEffect: true })];
  setBarrierType(state, "dm", scene.id, "w1", "terrain");
  assert.equal(scene.walls[0].sightMode, "limited");
  assert.equal(barrierType(scene.walls[0]), "terrain");
  setBarrierType(state, "dm", scene.id, "w1", "proximity", null, 4.5);
  assert.deepEqual([scene.walls[0].sightMode, scene.walls[0].proximityMeters], ["proximity", 4.5]);
  setBarrierType(state, "dm", scene.id, "w1", "wall");
  assert.equal(scene.walls[0].sightMode, undefined);
  assert.equal(scene.walls[0].proximityMeters, undefined);
  assert.equal(barrierType(scene.walls[0]), "wall");
  assert.throws(() => setBarrierType(state, "player", scene.id, "w1", "terrain"));
});
