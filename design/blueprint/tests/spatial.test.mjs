import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState, previewMovement, moveActor } from "../state.mjs";
import {
  validateSceneGeometry,
  geometryKey,
  tracePath,
  hasLineOfSight,
  hasLineOfEffect,
  findApproachPath,
} from "../spatial.mjs";

const source = { kind: "authored-demo", revision: "spatial-test-v1" };
const scene = () => ({
  width: 1000,
  height: 650,
  gridSize: 50,
  metersPerCell: 1.5,
  walls: [],
  terrain: [],
});
const wall = (extra = {}) => ({
  id: "wall-1",
  a: { x: 200, y: 50 },
  b: { x: 200, y: 250 },
  kind: "wall",
  blocksMovement: true,
  blocksSight: true,
  blocksEffect: true,
  secret: false,
  source,
  ...extra,
});
test("invalid geometry fails closed and its reason does not reveal coordinates", () => {
  const s = scene();
  s.walls = [wall({ a: { x: NaN, y: 987654 }, secret: true })];
  assert.ok(validateSceneGeometry(s).length);
  const p = tracePath(s, { x: 100, y: 100 }, [{ x: 300, y: 100 }], { role: "player" });
  assert.equal(p.blocked, true);
  assert.equal(p.cost, 0);
  assert.ok(!JSON.stringify(p).includes("987654"));
});
test("terrain costs accumulate across waypoints, split budget precisely and overlap only doubles", () => {
  const s = scene();
  s.terrain = [
    { id: "t1", x: 150, y: 50, width: 100, height: 200, kind: "difficult", source },
    { id: "t2", x: 175, y: 50, width: 50, height: 200, kind: "difficult", source },
  ];
  const p = tracePath(
    s,
    { x: 100, y: 100 },
    [
      { x: 200, y: 100 },
      { x: 300, y: 100 },
    ],
    { budget: 6 },
  );
  assert.equal(p.distance, 6);
  assert.equal(p.totalCost, 9);
  assert.equal(p.cost, 6);
  assert.deepEqual(p.end, { x: 225, y: 100 });
  assert.equal(p.limited, true);
  assert.equal(
    p.segments.filter((s) => s.reachable).reduce((n, s) => n + s.cost, 0),
    6,
  );
});
test("wall flags remain independent and an open door stops blocking all three channels", () => {
  const s = scene(),
    a = { x: 100, y: 100 },
    b = { x: 300, y: 100 };
  s.walls = [wall({ blocksSight: false })];
  assert.equal(hasLineOfSight(s, a, b), true);
  assert.equal(hasLineOfEffect(s, a, b), false);
  assert.equal(tracePath(s, a, [b]).blocked, true);
  s.walls = [
    wall({ kind: "door", doorState: "open", playerOperable: true, interactionRangeMeters: 1.5 }),
  ];
  assert.equal(tracePath(s, a, [b]).blocked, false);
  assert.equal(hasLineOfEffect(s, a, b), true);
  s.walls = [wall({ blocksMovement: false, blocksEffect: false })];
  assert.equal(hasLineOfSight(s, a, b), false);
  assert.equal(hasLineOfEffect(s, a, b), true);
  assert.equal(tracePath(s, a, [b]).blocked, false);
});

test("crawling adds distance cost to terrain without multiplying overlapping difficult ground", () => {
  const s = scene();
  s.terrain = [
    { id: "t1", x: 150, y: 50, width: 100, height: 200, kind: "difficult", source },
    { id: "t2", x: 175, y: 50, width: 50, height: 200, kind: "difficult", source },
  ];
  const before = structuredClone(s);
  const p = tracePath(s, { x: 100, y: 100 }, [{ x: 300, y: 100 }], {
    crawling: true,
    budget: 9,
  });
  assert.equal(p.distance, 6);
  assert.equal(p.totalCost, 15);
  assert.equal(p.cost, 9);
  assert.ok(Math.abs(p.end.x - (150 + 200 / 3)) < 1e-7);
  assert.equal(p.end.y, 100);
  assert.equal(p.limited, true);
  assert.deepEqual([...new Set(p.segments.map((entry) => entry.multiplier))].sort(), [2, 3]);
  assert.equal(p.sources.crawling.edition, "2024");
  assert.equal(p.sources.crawling.revision, "5.2.1");
  assert.deepEqual(s, before);
  const ordinary = tracePath(s, { x: 100, y: 100 }, [{ x: 300, y: 100 }]);
  assert.equal(ordinary.totalCost, 9);
});
test("secret walls do not surface in player preview, but authority blocks and key is opaque", () => {
  const s = scene();
  s.walls = [wall({ secret: true })];
  const before = geometryKey(s);
  assert.equal(
    tracePath(s, { x: 100, y: 100 }, [{ x: 300, y: 100 }], { role: "player" }).blocked,
    false,
  );
  assert.equal(tracePath(s, { x: 100, y: 100 }, [{ x: 300, y: 100 }]).blocked, true);
  assert.ok(!before.includes("200"));
  s.walls[0].b.y = 260;
  assert.notEqual(geometryKey(s), before);
});
test("approach routes around a known wall, but never uses secret geometry to suggest a route", () => {
  const s = scene();
  s.walls = [wall()];
  const p = findApproachPath(s, { x: 100, y: 100 }, { x: 300, y: 100 }, 50, { role: "player" });
  assert.ok(p);
  assert.ok(p.length > 1);
  assert.equal(tracePath(s, { x: 100, y: 100 }, p).blocked, false);
  assert.ok(Math.hypot(p.at(-1).x - 300, p.at(-1).y - 100) <= 50.001);
  s.walls[0].secret = true;
  const hidden = findApproachPath(s, { x: 100, y: 100 }, { x: 300, y: 100 }, 50, {
    role: "player",
  });
  assert.equal(hidden.length, 1);
});
test("state preview preserves old fields and exposes waypoint cost separately from distance", () => {
  const state = createInitialState();
  state.combat.active = true;
  const s = state.scenes[0];
  s.tokens = [{ actorId: "livia", x: 100, y: 100 }];
  s.terrain = [{ id: "t1", x: 150, y: 50, width: 100, height: 200, kind: "difficult", source }];
  state.actors.livia.movement = 6;
  const p = previewMovement(
    state,
    "livia",
    { x: 300, y: 100 },
    { waypoints: [{ x: 200, y: 100 }], role: "player" },
  );
  assert.equal(p.totalCost, 9);
  assert.equal(p.cost, 6);
  assert.equal(p.end.x, 225);
  assert.ok(p.path.length >= 3);
  assert.equal(p.geometryKey, geometryKey(s));
});

test("legacy movement delegate still enforces the actor controller and authoritative hidden geometry", () => {
  const s = createInitialState();
  s.scenes[0].tokens = [{ actorId: "livia", x: 100, y: 100 }];
  assert.throws(() => moveActor(s, "livia", { x: 150, y: 100 }, "stranger"), /control/);
  s.scenes[0].walls = [wall({ secret: true })];
  assert.throws(
    () => moveActor(s, "livia", { x: 300, y: 100 }, "player", { role: "player" }),
    /path/,
  );
  assert.equal(s.scenes[0].tokens[0].x, 100);
});

test("appearance placement validates range, unoccupied center space and geometry without revealing occupants", async () => {
  const { previewTokenPlacement } = await import("../spatial.mjs");
  const s = scene();
  s.tokens = [{ actorId: "secret-creature", x: 300, y: 300, hidden: true }];
  const original = structuredClone(s);
  const origin = { x: 100, y: 100 };
  const allowed = previewTokenPlacement(s, { x: 200, y: 100 }, { origin, maxDistanceMeters: 3 });
  assert.equal(allowed.available, true);
  assert.equal(allowed.distanceMeters, 3);
  assert.equal(
    previewTokenPlacement(s, { x: 201, y: 100 }, { origin, maxDistanceMeters: 3 }).available,
    false,
  );
  const occupied = previewTokenPlacement(s, { x: 300, y: 300 });
  assert.equal(occupied.available, false);
  assert.ok(!JSON.stringify(occupied).includes("secret-creature"));
  assert.equal(
    previewTokenPlacement(s, { x: 300, y: 300 }, { excludeActorId: "secret-creature" }).available,
    true,
  );
  assert.equal(previewTokenPlacement(s, { x: 350, y: 300 }).available, true);
  assert.equal(previewTokenPlacement(s, { x: -1, y: 0 }).available, false);
  assert.equal(previewTokenPlacement(s, { x: NaN, y: 0 }).available, false);
  assert.equal(previewTokenPlacement(s, origin, { maxDistanceMeters: 3 }).available, false);
  assert.deepEqual(s, original);
  s.walls = [wall({ secret: true })];
  assert.equal(previewTokenPlacement(s, { x: 200, y: 100 }).available, false);
  // Appearance is not travel: a wall between origin and point is not a path prohibition.
  assert.equal(
    previewTokenPlacement(s, { x: 250, y: 100 }, { origin, maxDistanceMeters: 9 }).available,
    true,
  );
  s.walls[0] = wall({
    kind: "door",
    doorState: "open",
    playerOperable: true,
    interactionRangeMeters: 1.5,
  });
  assert.equal(previewTokenPlacement(s, { x: 200, y: 100 }).available, true);
});
