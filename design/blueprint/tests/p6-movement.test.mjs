// P6 — Table map movement: walls of every kind block walking and a move walks around them
// (TV-01), the SRD 2024 grid is the default distance rule and hex paths follow the hexes
// (TV-10), the camera zooms at the cursor (TV-05) and a door clicked from afar is walked to
// (TV-04). Synthetic data only: the lantern campaign's courtyard and a test scene.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore, createInitialState } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { beginMovement } from "../combat.mjs";
import {
  tracePath,
  routePath,
  segmentMeters,
  distanceRuleOf,
  isSegmentBlocked,
} from "../spatial.mjs";
import {
  movementTarget,
  plannedWaypoints,
  zoomAt,
  doorApproach,
  previewDoorInteraction,
} from "../table-spatial.mjs";
import * as SM from "../special-moves-domain.mjs";
import * as SMUI from "../special-moves.mjs";

const source = { kind: "authored-demo", revision: "p6-test-v1" };
const wall = (id, a, b, extra = {}) => ({
  id,
  kind: "wall",
  a,
  b,
  blocksMovement: true,
  blocksSight: true,
  blocksEffect: true,
  secret: false,
  source,
  ...extra,
});
const plainScene = (walls = []) => ({
  id: "p6",
  width: 1000,
  height: 650,
  gridSize: 50,
  metersPerCell: 1.5,
  walls,
  terrain: [],
});
// The app's state: the core seed plus the special-moves area (its courtyard features).
function courtyard() {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry({ logger: null });
  assert.equal(registry.use(SM.ID, SMUI.register).status, "built");
  const store = createStore({ storage });
  registry.initState(store.state);
  return store.state;
}
const sceneOf = (s) => s.scenes.find((x) => x.id === s.activeSceneId);
const tokenOf = (s, id) => sceneOf(s).tokens.find((t) => t.actorId === id);
// Whether a polyline crosses a movement barrier anywhere.
const crosses = (scene, points) =>
  points.some((p, i) => i > 0 && isSegmentBlocked(scene, points[i - 1], p, "blocksMovement"));

test("TV-10: a scene without a rule measures on the SRD 2024 grid; the straight line is a choice", () => {
  const scene = plainScene();
  assert.equal(distanceRuleOf(scene), "grid-srd");
  // One diagonal square is one square: 1.5 m, not 2.12 m.
  assert.equal(segmentMeters(scene, { x: 25, y: 25 }, { x: 75, y: 75 }), 1.5);
  assert.equal(tracePath(scene, { x: 25, y: 25 }, [{ x: 175, y: 175 }]).totalCost, 4.5);
  const line = { ...scene, distanceRule: "euclidean" };
  assert.equal(
    Math.round(segmentMeters(line, { x: 25, y: 25 }, { x: 75, y: 75 }) * 100) / 100,
    2.12,
  );
});

test("TV-10: on hexes the path goes through the hex centres and each hex costs one cell", () => {
  const hex = { ...plainScene(), distanceRule: "hex" };
  const size = 50 / Math.sqrt(3);
  const centre = (q, r) => ({ x: 50 * (q + r / 2) + 25, y: 1.5 * size * r + size });
  const path = tracePath(hex, centre(1, 1), [centre(1, 4)]);
  assert.equal(path.path.length, 4, "three hex steps, through two hex centres");
  for (const p of path.path) {
    const r = Math.round((p.y - size) / (1.5 * size));
    assert.ok(Math.abs(p.y - (1.5 * size * r + size)) < 0.01, "every point is a hex centre");
  }
  assert.equal(Math.round(path.totalCost * 100) / 100, 4.5);
  // Stopped by the movement left: at a hex centre, never between two hexes.
  const short = tracePath(hex, centre(1, 1), [centre(1, 4)], { budget: 3 });
  assert.deepEqual(
    [Math.round(short.end.x), Math.round(short.end.y)],
    [Math.round(centre(1, 3).x), Math.round(centre(1, 3).y)],
  );
});

test("TV-01: a free move stays straight; a wall in the way is walked around; an enclosed spot is refused", () => {
  const scene = plainScene([wall("w", { x: 500, y: 100 }, { x: 500, y: 550 })]);
  const start = { x: 300, y: 300 };
  assert.deepEqual(routePath(scene, start, { x: 450, y: 300 }), {
    points: [{ x: 450, y: 300 }],
    routed: false,
  });
  assert.equal(tracePath(scene, start, [{ x: 700, y: 300 }]).blocked, true);
  const route = routePath(scene, start, { x: 700, y: 300 });
  assert.equal(route.routed, true);
  assert.deepEqual(route.points.at(-1), { x: 700, y: 300 });
  assert.equal(crosses(scene, [start, ...route.points]), false);
  const walked = tracePath(scene, start, route.points);
  assert.equal(walked.blocked, false);
  assert.ok(walked.totalCost > segmentMeters(scene, start, { x: 700, y: 300 }));
  // A closed room: no way in on foot.
  const room = plainScene([
    wall("n", { x: 600, y: 200 }, { x: 800, y: 200 }),
    wall("e", { x: 800, y: 200 }, { x: 800, y: 400 }),
    wall("s", { x: 800, y: 400 }, { x: 600, y: 400 }),
    wall("w", { x: 600, y: 400 }, { x: 600, y: 200 }),
  ]);
  assert.equal(routePath(room, start, { x: 700, y: 300 }), null);
  // An open door lets the path through; a closed one is walked around or refused.
  const door = {
    ...wall("d", { x: 600, y: 280 }, { x: 600, y: 320 }),
    kind: "door",
    doorState: "open",
    playerOperable: true,
    interactionRangeMeters: 1.5,
  };
  const withDoor = plainScene([
    ...room.walls.filter((w) => w.id !== "w"),
    wall("w1", { x: 600, y: 200 }, { x: 600, y: 280 }),
    wall("w2", { x: 600, y: 320 }, { x: 600, y: 400 }),
    door,
  ]);
  assert.ok(routePath(withDoor, start, { x: 700, y: 300 }));
  door.doorState = "closed";
  assert.equal(routePath(withDoor, start, { x: 700, y: 300 }), null);
});

test("TV-01: the courtyard's walls block walking, in exploration and in combat; doors open the way", () => {
  const s = courtyard();
  const scene = sceneOf(s);
  const byId = new Map(scene.walls.map((w) => [w.id, w]));
  for (const id of ["sm-curtain-west", "sm-curtain-north", "sm-curtain-east", "sm-curtain-south"])
    assert.ok(byId.has(id), id);
  // The climbable walls name their feature; walls block movement only.
  assert.equal(byId.get("sm-curtain-west").climb, "sm-west-wall");
  assert.equal(byId.get("sm-north-wall").climb, "sm-north-wall");
  for (const w of scene.walls)
    assert.deepEqual([w.blocksMovement, w.blocksSight, w.blocksEffect], [true, false, false]);
  assert.equal(byId.get("sm-north-room-door").doorState, "closed");
  assert.equal(byId.get("sm-south-room-door").doorState, "open");
  const livia = { ...tokenOf(s, "livia") };
  const outside = { x: 50, y: 380 };
  const northRoom = { x: 200, y: 140 };
  // Straight through the curtain wall or the low north wall: refused, the token stays.
  assert.equal(tracePath(scene, livia, [outside]).blocked, true);
  assert.equal(tracePath(scene, livia, [northRoom]).blocked, true);
  assert.throws(
    () => beginMovement(s, { id: "through", actorId: "livia", point: outside }, "player"),
    /percorribile|blocked|available/i,
  );
  assert.deepEqual([tokenOf(s, "livia").x, tokenOf(s, "livia").y], [livia.x, livia.y]);
  // Outside the walls: no way on foot. The north room: only through its door, once open.
  assert.equal(plannedWaypoints(s, "livia", outside, { role: "player" }).reachable, false);
  assert.equal(plannedWaypoints(s, "livia", northRoom, { role: "player" }).reachable, false);
  byId.get("sm-north-room-door").doorState = "open";
  const plan = plannedWaypoints(s, "livia", northRoom, { role: "player" });
  assert.equal(plan.reachable, true);
  assert.equal(plan.routed, true);
  assert.equal(crosses(scene, [livia, ...plan.waypoints, northRoom]), false);
  beginMovement(
    s,
    { id: "around", actorId: "livia", point: northRoom, waypoints: plan.waypoints },
    "player",
  );
  assert.deepEqual(
    [tokenOf(s, "livia").x, tokenOf(s, "livia").y],
    [northRoom.x, northRoom.y],
    "exploration: Livia walks into the north room through its door",
  );
  // Combat: 9 m of movement; the route ends where the movement runs out, never across a wall.
  const c = courtyard();
  sceneOf(c).walls.find((w) => w.id === "sm-north-room-door").doorState = "open";
  c.combat = { active: true, round: 1, turn: 0, order: ["livia", "goblin-1", "doran", "goblin-2"] };
  Object.assign(c.actors.livia, { movement: 9, movementSpent: 0, dashCount: 0 });
  const start = { ...tokenOf(c, "livia") };
  const far = plannedWaypoints(c, "livia", northRoom, { role: "player" });
  assert.equal(far.reachable, true);
  const preview = tracePath(sceneOf(c), start, [...far.waypoints, northRoom], { budget: 9 });
  assert.equal(preview.blocked, false);
  assert.equal(preview.limited, true);
  beginMovement(
    c,
    { id: "combat-around", actorId: "livia", point: northRoom, waypoints: far.waypoints },
    "player",
  );
  const end = { ...tokenOf(c, "livia") };
  assert.deepEqual([end.x, end.y], [preview.end.x, preview.end.y]);
  assert.equal(crosses(sceneOf(c), preview.reachablePath), false);
  assert.equal(c.actors.livia.movement, 0);
  assert.throws(() =>
    beginMovement(c, { id: "combat-through", actorId: "livia", point: outside }, "player"),
  );
});

test("TV-01: the core seed without the special-moves area keeps its open courtyard", () => {
  const s = createInitialState();
  assert.equal((sceneOf(s).walls ?? []).length, 0);
});

test("TV-05: zooming keeps the scene point under the cursor where it was on screen", () => {
  const scene = { width: 1000, height: 650 };
  const rect = { left: 0, top: 0, width: 1200, height: 700 };
  // The SVG's default "xMidYMid meet": the scale and the letterbox of a view.
  const toScreen = (view, p) => {
    const w = scene.width / view.zoom,
      h = scene.height / view.zoom;
    const k = Math.min(rect.width / w, rect.height / h);
    const offX = (rect.width - w * k) / 2,
      offY = (rect.height - h * k) / 2;
    return { x: offX + (p.x - view.pan.x) * k, y: offY + (p.y - view.pan.y) * k };
  };
  const view = { zoom: 1.2, pan: { x: 40, y: 30 } };
  const anchor = { x: 612, y: 233 };
  const before = toScreen(view, anchor);
  const next = zoomAt(view, scene, 1.25, anchor);
  assert.equal(next.zoom, 1.5);
  const after = toScreen(next, anchor);
  assert.ok(Math.abs(after.x - before.x) < 1e-6 && Math.abs(after.y - before.y) < 1e-6);
  // Limits: never beyond 3× or below 0.6×.
  assert.equal(zoomAt({ zoom: 2.9, pan: { x: 0, y: 0 } }, scene, 2, anchor).zoom, 3);
  assert.equal(zoomAt({ zoom: 0.7, pan: { x: 0, y: 0 } }, scene, 0.5, anchor).zoom, 0.6);
});

test("TV-01: a destination is planned where the move is checked (clamped, snapped)", () => {
  const scene = { ...plainScene(), gridSnap: true };
  assert.deepEqual(movementTarget(scene, { x: 3, y: 640 }), { x: 25, y: 625 });
  assert.deepEqual(movementTarget(plainScene(), { x: 3, y: 640 }), { x: 20, y: 630 });
});

test("TV-04: a door out of reach is walked to, then opened with its interaction cost", () => {
  const s = createInitialState();
  const scene = sceneOf(s);
  scene.walls = [
    wall("room-n", { x: 600, y: 200 }, { x: 800, y: 200 }),
    wall("room-s", { x: 600, y: 400 }, { x: 800, y: 400 }),
    {
      ...wall("door", { x: 600, y: 250 }, { x: 600, y: 350 }),
      kind: "door",
      doorState: "closed",
      playerOperable: true,
      interactionRangeMeters: 1.5,
    },
    wall("room-w1", { x: 600, y: 200 }, { x: 600, y: 250 }),
    wall("room-w2", { x: 600, y: 350 }, { x: 600, y: 400 }),
  ];
  assert.equal(previewDoorInteraction(s, "door", "livia", "player").available, false);
  const approach = doorApproach(s, "door", "livia", "player");
  assert.ok(approach, "a spot in reach of the door can be walked to");
  assert.ok(approach.point.x < 600, "on Livia's side of the door");
  assert.equal(crosses(scene, [tokenOf(s, "livia"), ...approach.waypoints, approach.point]), false);
  beginMovement(
    s,
    { id: "to-door", actorId: "livia", point: approach.point, waypoints: approach.waypoints },
    "player",
  );
  const near = previewDoorInteraction(s, "door", "livia", "player");
  assert.equal(near.available, true, JSON.stringify(near.reasons));
  assert.equal(near.cost, "none");
});
