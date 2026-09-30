// B35: fog, vision and barriers. Domain rules (SRD 5.2.1 vision and light, walls of
// increment 4) plus the area's contributions and tool handlers through the real registry
// and store: DM fog painting, player preview, per-player and shared explored memory,
// update on drop, view as a token, barrier types, controlled tokens above the darkness.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { canControlActor } from "../character-access.mjs";
import { esc, icon } from "../ui.mjs";
import {
  validateSceneGeometry,
  isSegmentBlocked,
  hasLineOfSight,
  visibilityPolygon,
  wallSide,
} from "../spatial.mjs";
import * as D from "../fog-vision-domain.mjs";
import { renderSpatialOverlay } from "../spatial-editor.mjs";
import {
  createCharacterDraft,
  saveCharacterDraft,
  previewCharacterDraft,
  applyCharacterDraft,
} from "../character-build.mjs";
import { claimPremade, composeBuild } from "../builder-plus-domain.mjs";
import {
  register,
  fogTool,
  barrierTool,
  teleportTool,
  followUp,
  model,
  fogLayer,
  topLayer,
  hudLayer,
  panel,
  fogVisionView,
  resetFogVisionView,
  openVisionDialog,
  cancelGestures,
  FOG_TOOL,
  BARRIER_TOOL,
} from "../fog-vision.mjs";

const TOWER = D.TOWER_SCENE_ID;
const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};
function harness({ role = "dm", lang = "it", scene = TOWER } = {}) {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  registry.use("fog-vision", register);
  const store = createStore({ storage: memory() });
  registry.initState(store.state);
  store.state.activeSceneId = scene;
  const toasts = [];
  const dialogs = [];
  let renders = 0;
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    view: { page: "table", id: "", tab: "" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object" ? (value[ctx.lang] ?? value.it) : String(value ?? ""),
    esc,
    icon,
    toasts,
    dialogs,
    get renders() {
      return renders;
    },
    toast: (text, error = false) => toasts.push({ text, error }),
    render: () => renders++,
    navigate: () => {},
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    closeDialog: () => {},
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    commit(label, mutator, options = {}) {
      if (ctx.offline && !options.local)
        throw Object.assign(Error("offline"), { it: "Sei senza rete", en: "You are offline" });
      const before = store.state;
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(ctx.role);
      registry.afterUndo(current, store.state);
      registry.emitStateEvents(current, store.state, { kind: "correction" });
    },
    registry,
  };
  registry.attach(ctx);
  resetFogVisionView();
  return { ctx, store, registry };
}
const sceneOf = (ctx, id = TOWER) => ctx.state.scenes.find((s) => s.id === id);
function fakeTable(ctx, { selected = "livia", mode = FOG_TOOL } = {}) {
  const messages = [];
  const table = {
    get scene() {
      return sceneOf(ctx, ctx.state.activeSceneId);
    },
    svg: { setPointerCapture() {}, querySelector: () => null, addEventListener() {} },
    point: (e) => e.p,
    message: (text) => messages.push(text),
    messages,
    selectedActorId: selected,
    mode,
    view: { zoom: 1, pan: { x: 0, y: 0 } },
    select(id) {
      table.selectedActorId = id;
    },
    setMode(next) {
      table.mode = next;
    },
  };
  return table;
}
const ev = (x, y, extra = {}) => ({
  button: 0,
  pointerId: 1,
  p: { x, y },
  altKey: extra.alt === true,
  shiftKey: extra.shift === true,
  key: extra.key,
  target: {
    closest: (sel) =>
      extra.actor && sel === "[data-actor]" ? { dataset: { actor: extra.actor } } : null,
  },
  defaultPrevented: false,
  preventDefault() {
    this.defaultPrevented = true;
  },
});
const tv = (ctx, mode = "move", selected = "livia") => ({
  scene: sceneOf(ctx, ctx.state.activeSceneId),
  selectedActorId: selected,
  mode,
  zoom: 1,
  pan: { x: 0, y: 0 },
});
const slice = (ctx) => D.sliceOf(ctx.state);
const openStoreDoor = (ctx) => {
  ctx.commit("door", (s) => {
    s.scenes.find((x) => x.id === TOWER).walls.find((w) => w.id === "tower-store-door").doorState =
      "open";
  });
};
const moveToken = (ctx, actorId, x, y) =>
  ctx.commit("move " + actorId, (s) => {
    const token = s.scenes
      .find((x) => x.id === s.activeSceneId)
      .tokens.find((t) => t.actorId === actorId);
    token.x = x;
    token.y = y;
  });

// ------------------------------------------------------------------------------ seed

test("the area seeds the Lantern tower once, with valid increment 4 geometry and its lights", () => {
  const { ctx, registry, store } = harness();
  const towers = ctx.state.scenes.filter((s) => s.id === TOWER);
  assert.equal(towers.length, 1);
  assert.equal(ctx.state.scenes[0].id, "old-watch", "the first scene stays the courtyard");
  assert.deepEqual(validateSceneGeometry(towers[0]), []);
  const cfg = D.sceneConfig(ctx.state, TOWER);
  assert.equal(cfg.vision, true);
  assert.equal(cfg.phase, "night");
  assert.deepEqual(
    cfg.lights.map((l) => [l.id, l.bright, l.dim, l.on]),
    [
      ["tower-torch", 6, 6, true],
      ["tower-store-lantern", 9, 9, false],
      ["tower-stair-torch", 6, 6, true],
    ],
  );
  // The courtyard keeps its behaviour: no vision, no fog.
  assert.equal(D.sceneConfig(ctx.state, "old-watch").vision, false);
  // A second initialisation (reload) never adds the scene again.
  registry.initState(store.state);
  assert.equal(ctx.state.scenes.filter((s) => s.id === TOWER).length, 1);
  assert.deepEqual(D.normalizeSlice(structuredClone(slice(ctx)), 1), slice(ctx));
  assert.throws(() => D.normalizeSlice({}, 99));
});

test("registration: DM tools in the fog group, the Vision tab for both roles, layers above token decorations", () => {
  const dm = harness();
  const tools = dm.registry.list("table-tool", dm.ctx);
  assert.deepEqual(
    tools.filter((t) => t.group === "fog").map((t) => t.id),
    ["fog-vision", "fog-vision-lights", "fog-vision-barriers"],
  );
  assert.equal(tools.find((t) => t.id === "fog-vision-teleport").group, "dm");
  const player = harness({ role: "player" });
  assert.equal(
    player.registry.list("table-tool", player.ctx).filter((t) => t.id.startsWith("fog-vision"))
      .length,
    0,
    "players have no fog tools (Owlbear: fog is the GM's)",
  );
  const panels = player.registry.list("table-panel", player.ctx, tv(player.ctx));
  assert.equal(panels.find((p) => p.id === "fog-vision-panel").placement, "sidebar-tab");
  const layers = dm.registry.list("map-layer", dm.ctx, tv(dm.ctx));
  const order = Object.fromEntries(layers.map((l) => [l.id, l.order]));
  assert.ok(order["fog-vision-lighting"] < 60, "lighting under the tokens");
  assert.ok(order["fog-vision-fog"] >= 60 && order["fog-vision-fog"] < 70);
  assert.ok(order["fog-vision-top"] > order["fog-vision-fog"]);
});

// ------------------------------------------------------------------------------ geometry

test("visibility polygon and barrier types: open door, wall, window, one-way mirror", () => {
  const { ctx } = harness();
  const scene = sceneOf(ctx);
  const hall = { x: 450, y: 175 };
  const storeroom = { x: 700, y: 170 };
  assert.equal(hasLineOfSight(scene, hall, storeroom), false, "closed door blocks sight");
  openStoreDoor(ctx);
  const open = sceneOf(ctx);
  assert.equal(hasLineOfSight(open, hall, storeroom), true, "open door lets sight through");
  assert.equal(hasLineOfSight(open, hall, { x: 700, y: 290 }), false, "the wall still blocks");
  const polygon = visibilityPolygon(open, hall);
  assert.ok(D.pointInPolygon(storeroom, polygon));
  assert.ok(!D.pointInPolygon({ x: 700, y: 290 }, polygon));
  // Grate (window): sight passes, movement does not.
  const inStore = { x: 750, y: 250 };
  const inStairs = { x: 750, y: 380 };
  assert.equal(hasLineOfSight(open, inStore, inStairs), true);
  assert.equal(isSegmentBlocked(open, inStore, inStairs, "blocksMovement"), true);
  // One-way mirror blocks from the hall (its right side), not from the stair room.
  const mirror = open.walls.find((w) => w.id === "tower-mirror");
  assert.equal(wallSide(mirror, { x: 400, y: 380 }), "right");
  assert.equal(hasLineOfSight(open, { x: 400, y: 380 }, { x: 650, y: 380 }), false);
  assert.equal(hasLineOfSight(open, { x: 650, y: 380 }, { x: 400, y: 380 }), true);
  // One-way for sight only: nobody walks or casts through the mirror, from either side.
  for (const [a, b] of [
    [
      { x: 650, y: 380 },
      { x: 400, y: 380 },
    ],
    [
      { x: 400, y: 380 },
      { x: 650, y: 380 },
    ],
  ]) {
    assert.equal(isSegmentBlocked(open, a, b, "blocksMovement"), true);
    assert.equal(isSegmentBlocked(open, a, b, "blocksEffect"), true);
  }
  const invalid = { ...open, walls: [{ ...mirror, blockSide: "up" }] };
  assert.equal(validateSceneGeometry(invalid).length, 1, "an unknown side is invalid geometry");
});

test("DM sets barrier types on a wall; doors and players are refused", () => {
  const { ctx } = harness();
  const wallId = "tower-store-west-2";
  D.setBarrierType(ctx.state, "dm", TOWER, wallId, "window");
  let wall = sceneOf(ctx).walls.find((w) => w.id === wallId);
  assert.deepEqual([wall.blocksMovement, wall.blocksSight, wall.blocksEffect], [true, false, true]);
  assert.equal(D.barrierType(wall), "window");
  D.setBarrierType(ctx.state, "dm", TOWER, wallId, "one-way", "left");
  wall = sceneOf(ctx).walls.find((w) => w.id === wallId);
  assert.equal(wall.blockSide, "left");
  assert.equal(D.barrierType(wall), "one-way");
  D.setBarrierType(ctx.state, "dm", TOWER, wallId, "illusory");
  wall = sceneOf(ctx).walls.find((w) => w.id === wallId);
  assert.equal(wall.blockSide, undefined);
  assert.deepEqual([wall.blocksMovement, wall.blocksSight], [false, true]);
  D.setBarrierType(ctx.state, "dm", TOWER, wallId, "invisible");
  assert.equal(D.barrierType(sceneOf(ctx).walls.find((w) => w.id === wallId)), "invisible");
  assert.deepEqual(validateSceneGeometry(sceneOf(ctx)), []);
  assert.throws(
    () => D.setBarrierType(ctx.state, "dm", TOWER, "tower-store-door", "window"),
    /Doors/,
  );
  assert.throws(() => D.setBarrierType(ctx.state, "player", TOWER, wallId, "wall"), /Only the DM/);
});

// ------------------------------------------------------------------------------ vision

test("SRD vision: Livia's darkvision sees past the open door but not the wall; Doran sees less", () => {
  const { ctx } = harness();
  openStoreDoor(ctx);
  moveToken(ctx, "livia", 450, 175);
  moveToken(ctx, "doran", 450, 230);
  const scene = sceneOf(ctx);
  const lit = D.buildLighting(ctx.state, scene);
  const livia = D.buildViewer(ctx.state, scene, "livia");
  const doran = D.buildViewer(ctx.state, scene, "doran");
  assert.equal(livia.senses.darkvision, 18);
  assert.equal(livia.senses.origin, "token");
  assert.equal(doran.senses.darkvision, 0);
  const goblin = { x: 700, y: 130 };
  assert.deepEqual(D.lightLevelAt(lit, goblin), { level: "dark", magical: false, sources: [] });
  const seen = D.canSee(livia, lit, goblin);
  assert.equal(seen.visible, true);
  assert.equal(seen.perceived, "grey", "darkvision in darkness: shades of grey");
  assert.equal(D.canSee(doran, lit, goblin).reason, "dark");
  assert.equal(D.canSee(livia, lit, { x: 700, y: 290 }).reason, "wall");
  // Lighting the storeroom lantern lets Doran see the goblin too.
  D.toggleLight(ctx.state, "dm", TOWER, "tower-store-lantern");
  const lit2 = D.buildLighting(ctx.state, sceneOf(ctx));
  assert.equal(
    D.canSee(D.buildViewer(ctx.state, sceneOf(ctx), "doran"), lit2, goblin).visible,
    true,
  );
  const cells = (id, l) =>
    D.countBits(D.visibleCells(sceneOf(ctx), D.buildViewer(ctx.state, sceneOf(ctx), id), l));
  assert.ok(cells("livia", lit) > cells("doran", lit), "Doran without darkvision sees less");
});

test("senses from the sheet (species), Blinded and blindsight", () => {
  const { ctx } = harness();
  ctx.state.actors.mira.speciesId = "dwarf";
  ctx.state.actors.mira.features = [
    ...(ctx.state.actors.mira.features ?? []),
    { id: "species:dwarf:darkvision", definitionId: "dwarf:darkvision" },
  ];
  const mira = D.resolveSenses(ctx.state, "mira");
  assert.deepEqual([mira.darkvision, mira.origin], [36, "sheet"]);
  assert.equal(mira.source, D.SOURCES.speciesDarkvision);
  D.setTokenVision(ctx.state, "dm", "doran", { blindsight: 3 });
  ctx.state.actors.doran.conditions = [{ id: "blinded", definitionId: "blinded" }];
  const scene = sceneOf(ctx);
  const lit = D.buildLighting(ctx.state, scene);
  const doran = D.buildViewer(ctx.state, scene, "doran");
  assert.equal(doran.senses.blinded, true);
  assert.equal(D.canSee(doran, lit, { x: 330, y: 200 }).reason, "blinded");
  assert.equal(D.canSee(doran, lit, { x: 360, y: 525 }).reason, "blindsight");
  assert.throws(
    () => D.setTokenVision(ctx.state, "player", "livia", { darkvision: 36 }),
    /Only the DM/,
  );
  D.setTokenVision(ctx.state, "dm", "livia", { useSheet: true });
  assert.equal(D.resolveSenses(ctx.state, "livia").darkvision, 0, "Livia's sheet has no species");
});

test("day and night cycle: day → dusk → night → dawn, ambient levels, DM only", () => {
  const { ctx } = harness({ scene: "old-watch" });
  const phases = [];
  for (let i = 0; i < 4; i++) {
    D.advancePhase(ctx.state, "dm", "old-watch");
    const cfg = D.sceneConfig(ctx.state, "old-watch");
    phases.push([cfg.phase, cfg.ambient]);
  }
  assert.deepEqual(phases, [
    ["dusk", "dim"],
    ["night", "dark"],
    ["dawn", "dim"],
    ["day", "bright"],
  ]);
  assert.throws(() => D.advancePhase(ctx.state, "player", "old-watch"), /Only the DM/);
  assert.throws(() => D.setSceneOptions(ctx.state, "dm", "old-watch", { phase: "noon" }));
});

// ------------------------------------------------------------------------------ fog

test("manual fog: cover all, reveal a room with a polygon and a Medium brush; preview opaque, DM through", () => {
  const { ctx } = harness({ scene: "old-watch" });
  const scene = sceneOf(ctx, "old-watch");
  D.addFogOp(ctx.state, "dm", "old-watch", { op: "cover", shape: "all" });
  assert.equal(
    D.fogHiddenAt(scene, D.sceneConfig(ctx.state, "old-watch").fog, { x: 500, y: 300 }),
    true,
  );
  // The courtyard's top-left room, by polygon.
  D.addFogOp(ctx.state, "dm", "old-watch", {
    op: "reveal",
    shape: "polygon",
    points: [
      { x: 90, y: 70 },
      { x: 340, y: 70 },
      { x: 340, y: 200 },
      { x: 90, y: 200 },
    ],
  });
  // A Medium brush stroke (1.5 m = one 50 px square) along the courtyard.
  D.addFogOp(ctx.state, "dm", "old-watch", {
    op: "reveal",
    shape: "brush",
    size: "medium",
    points: [
      { x: 250, y: 380 },
      { x: 450, y: 380 },
    ],
  });
  const fog = D.sceneConfig(ctx.state, "old-watch").fog;
  assert.equal(fog.length, 3);
  assert.ok(fog[2].points.length > 2, "brush samples are densified");
  const hidden = (p) => D.fogHiddenAt(scene, fog, p);
  assert.equal(hidden({ x: 200, y: 130 }), false, "the room is revealed");
  assert.equal(hidden({ x: 350, y: 390 }), false, "brushed path revealed");
  assert.equal(hidden({ x: 350, y: 420 }), true, "beyond the 25 px brush radius stays hidden");
  assert.equal(hidden({ x: 700, y: 300 }), true);
  // Player preview: the goblins are hidden; the DM's normal view hides nothing.
  const ui = fogVisionView();
  ui.preview = true;
  let m = model(ctx, scene);
  assert.equal(m.view.mode, "preview");
  assert.ok(m.hiddenTokens.includes("goblin-1") && m.hiddenTokens.includes("goblin-2"));
  assert.match(fogLayer(ctx, tv(ctx)), /fv-fog is-opaque/);
  ui.preview = false;
  m = model(ctx, scene);
  assert.equal(m.view.mode, "dm");
  assert.deepEqual(m.hiddenTokens, []);
  assert.match(fogLayer(ctx, tv(ctx)), /fv-fog is-dm/);
  // Reveal all empties the list; players cannot paint fog.
  D.addFogOp(ctx.state, "dm", "old-watch", { op: "reveal", shape: "all" });
  assert.deepEqual(D.sceneConfig(ctx.state, "old-watch").fog, []);
  assert.throws(
    () => D.addFogOp(ctx.state, "player", "old-watch", { op: "cover", shape: "all" }),
    /Only the DM/,
  );
  assert.throws(
    () =>
      D.addFogOp(ctx.state, "dm", "old-watch", {
        op: "cover",
        shape: "polygon",
        points: [{ x: 1, y: 1 }],
      }),
    /Invalid shape/,
  );
});

test("fog tool handlers: brush drag, Alt inverts, polygon by clicks and double-click, rectangle, keyboard", () => {
  const { ctx, store } = harness({ scene: "old-watch" });
  const table = fakeTable(ctx);
  fogTool.onPointerDown(ctx, ev(200, 300), table);
  fogTool.onPointerMove(ctx, ev(260, 300), table);
  fogTool.onPointerMove(ctx, ev(320, 300), table);
  fogTool.onPointerUp(ctx, ev(320, 300), table);
  let fog = D.sceneConfig(ctx.state, "old-watch").fog;
  assert.equal(fog.length, 1);
  assert.deepEqual([fog[0].op, fog[0].shape, fog[0].size], ["cover", "brush", "medium"]);
  assert.match(store.state.log.at(-1).label, /Nebbia coperta \(pennello\)/);
  // Alt inverts cover into reveal (Owlbear cut).
  fogTool.onPointerDown(ctx, ev(260, 300, { alt: true }), table);
  fogTool.onPointerUp(ctx, ev(260, 300), table);
  fog = D.sceneConfig(ctx.state, "old-watch").fog;
  assert.equal(fog[1].op, "reveal");
  // Polygon: three clicks, then a click on the first point closes it.
  const ui = fogVisionView();
  ui.fog = { ...ui.fog, shape: "polygon", op: "reveal" };
  for (const [x, y] of [
    [600, 100],
    [800, 100],
    [800, 250],
  ])
    fogTool.onPointerDown(ctx, ev(x, y), table);
  assert.equal(ui.polygon.length, 3);
  fogTool.onPointerDown(ctx, ev(602, 102), table);
  fog = D.sceneConfig(ctx.state, "old-watch").fog;
  assert.equal(fog.at(-1).shape, "polygon");
  assert.equal(ui.polygon.length, 0);
  // Rectangle by drag.
  ui.fog = { ...ui.fog, shape: "rect", op: "cover" };
  fogTool.onPointerDown(ctx, ev(100, 500), table);
  fogTool.onPointerMove(ctx, ev(300, 600), table);
  fogTool.onPointerUp(ctx, ev(300, 600), table);
  assert.deepEqual(D.sceneConfig(ctx.state, "old-watch").fog.at(-1).points, [
    { x: 100, y: 500 },
    { x: 300, y: 600 },
  ]);
  // Keyboard: arrows move the cursor from the selected token, Enter stamps the brush.
  ui.fog = { ...ui.fog, shape: "brush", op: "reveal" };
  const count = D.sceneConfig(ctx.state, "old-watch").fog.length;
  const right = ev(0, 0, { key: "ArrowRight" });
  fogTool.onKeyDown(ctx, right, table);
  assert.ok(right.defaultPrevented, "the core does not also move the token");
  fogTool.onKeyDown(ctx, ev(0, 0, { key: "Enter" }), table);
  const last = D.sceneConfig(ctx.state, "old-watch").fog;
  assert.equal(last.length, count + 1);
  assert.deepEqual(last.at(-1).points, [{ x: 275, y: 380 }]);
  // Undo removes the last fog operation with a correction record.
  ctx.undo();
  assert.equal(D.sceneConfig(ctx.state, "old-watch").fog.length, count);
  assert.equal(store.state.log.at(-1).kind, "correction");
  // Offline: the shared change is refused with a toast, nothing painted.
  ctx.offline = true;
  fogTool.onPointerDown(ctx, ev(500, 300), table);
  fogTool.onPointerUp(ctx, ev(500, 300), table);
  assert.equal(D.sceneConfig(ctx.state, "old-watch").fog.length, count);
  assert.ok(ctx.toasts.at(-1).error);
});

// ------------------------------------------------------------------------------ memory

test("explored memory per player, shared by option, editable and resettable", () => {
  const { ctx } = harness();
  followUp(ctx);
  const mem = () => slice(ctx).memory[TOWER] ?? {};
  assert.ok(mem().livia && mem().doran && mem().mira, "each party character has its memory");
  const share = (id) => D.exploredShare(ctx.state, TOWER, id);
  assert.ok(share("livia") > share("doran"));
  // Livia goes into the storeroom: her memory grows, Doran's does not.
  openStoreDoor(ctx);
  moveToken(ctx, "livia", 700, 175);
  const store = { x: 800, y: 250 };
  const scene = sceneOf(ctx);
  const inMemory = (id, p) =>
    D.bitAt(D.memoryBits(ctx.state, TOWER, [id]), D.cellIndex(scene, p)) === 1;
  assert.equal(inMemory("livia", store), true);
  assert.equal(inMemory("doran", store), false);
  // Livia leaves: the player (Livia and Mira) still sees the storeroom as explored...
  moveToken(ctx, "livia", 250, 450);
  ctx.role = "player";
  let m = model(ctx, sceneOf(ctx));
  assert.deepEqual(m.view.memoryActors.sort(), ["livia", "mira"]);
  assert.equal(D.bitAt(m.memory, D.cellIndex(scene, store)), 1);
  // Explored areas show the remembered drawing and walls only, never current creatures.
  const layer = fogLayer(ctx, tv(ctx));
  assert.match(layer, /class="fv-remembered"/);
  const remembered = layer.slice(
    layer.indexOf("fv-remembered"),
    layer.indexOf('class="fv-explored"'),
  );
  assert.match(remembered, /spatial-overlay/, "the remembered walls are drawn");
  assert.doesNotMatch(remembered, /data-actor=|map-token/);
  ctx.role = "dm";
  // ...while Doran's own view (the DM checks it) does not include it.
  const ui = fogVisionView();
  ui.viewAs = "doran";
  m = model(ctx, sceneOf(ctx));
  assert.equal(m.view.mode, "as-token");
  assert.equal(D.bitAt(m.memory, D.cellIndex(scene, store)), 0);
  // Shared memory (campaign option, C7): Doran's check now includes Livia's exploration.
  ctx.registry.setSetting(ctx, "fog-vision.shared-memory", true);
  m = model(ctx, sceneOf(ctx));
  assert.equal(D.bitAt(m.memory, D.cellIndex(scene, store)), 1);
  ctx.registry.setSetting(ctx, "fog-vision.shared-memory", false);
  ui.viewAs = null;
  // The DM edits Doran's memory (reveal a rectangle) and resets Livia's.
  D.editMemory(ctx.state, "dm", TOWER, "doran", {
    op: "reveal",
    shape: "rect",
    points: [
      { x: 560, y: 60 },
      { x: 890, y: 290 },
    ],
  });
  assert.equal(inMemory("doran", store), true);
  D.editMemory(ctx.state, "dm", TOWER, "doran", {
    op: "cover",
    shape: "brush",
    size: "large",
    points: [store],
  });
  assert.equal(inMemory("doran", store), false);
  D.resetMemory(ctx.state, "dm", TOWER, "livia");
  assert.equal(slice(ctx).memory[TOWER].livia, undefined);
  assert.throws(() => D.resetMemory(ctx.state, "player", TOWER, null), /Only the DM/);
});

test("the exploration follow-up is not undoable by itself; Undo of a move reverts what it revealed", () => {
  const { ctx, store } = harness();
  followUp(ctx);
  openStoreDoor(ctx);
  const before = D.exploredShare(ctx.state, TOWER, "livia");
  moveToken(ctx, "livia", 700, 175); // the commit event records the exploration
  const after = D.exploredShare(ctx.state, TOWER, "livia");
  assert.ok(after > before);
  const labels = store.state.log.slice(-2).map((l) => l.label);
  assert.deepEqual(labels, ["move livia", "Aree esplorate aggiornate"]);
  assert.equal(store.state.log.at(-1).visibility, "private");
  assert.equal(store.history.at(-1).label, "move livia", "the follow-up is not in the Undo stack");
  ctx.undo();
  assert.equal(D.tokenOf(sceneOf(ctx), "livia").x, 250);
  assert.ok(D.exploredShare(ctx.state, TOWER, "livia") < after);
});

test("update on drop at night: the storeroom crossed in darkness is revealed only when the path counts", () => {
  const explored = (updateOnDrop) => {
    const { ctx } = harness();
    D.setSceneOptions(ctx.state, "dm", TOWER, { updateOnDrop });
    followUp(ctx);
    const table = fakeTable(ctx, { mode: "fog-vision-teleport" });
    // Livia teleports from the hall into the stair room (through the walls): her path crosses
    // the dark storeroom corner, which her darkvision sees only if the walk is sampled.
    moveToken(ctx, "livia", 450, 175);
    teleportTool.onPointerDown(ctx, ev(450, 175, { actor: "livia" }), table);
    teleportTool.onPointerDown(ctx, ev(820, 520), table);
    assert.deepEqual(
      [D.tokenOf(sceneOf(ctx), "livia").x, D.tokenOf(sceneOf(ctx), "livia").y],
      [820, 520],
    );
    const scene = sceneOf(ctx);
    return D.bitAt(
      D.memoryBits(ctx.state, TOWER, ["livia"]),
      D.cellIndex(scene, { x: 640, y: 260 }),
    );
  };
  assert.equal(explored(false), 1, "without update on drop the crossed storeroom is explored");
  assert.equal(explored(true), 0, "with update on drop the path is not revealed");
});

// ------------------------------------------------------------------------------ views

test("view as a token: opaque fog of that token only; players cannot use it", () => {
  const { ctx } = harness();
  const ui = fogVisionView();
  ui.viewAs = "doran";
  const m = model(ctx, sceneOf(ctx));
  assert.equal(m.view.mode, "as-token");
  assert.deepEqual(
    m.viewers.map((v) => v.actorId),
    ["doran"],
  );
  assert.ok(m.hiddenTokens.includes("goblin-1"));
  // TV-30: the banner and the tool options are in the HUD layer above every map layer.
  assert.match(hudLayer(ctx, tv(ctx)), /data-fv-banner="as-token"/);
  ctx.registry.setSetting(ctx, "fog-vision.shared-vision", true);
  ctx.role = "player";
  ui.viewAs = null;
  resetFogVisionView();
  ctx.registry.setSetting(ctx, "fog-vision-view.controlled-on-top", true);
  const shared = model(ctx, sceneOf(ctx));
  assert.deepEqual(shared.viewers.map((v) => v.actorId).sort(), ["doran", "livia", "mira"]);
  ctx.role = "dm";
  ctx.registry.setSetting(ctx, "fog-vision.shared-vision", false);
  ctx.role = "player";
  const own = model(ctx, sceneOf(ctx));
  assert.equal(own.view.mode, "player");
  assert.deepEqual(own.viewers.map((v) => v.actorId).sort(), ["livia", "mira"]);
});

test("controlled tokens stay above the darkness (clone), unseen tokens and doors are hidden", () => {
  const { ctx } = harness();
  // In the dark hall (torch out), Mira stands beyond Livia's darkvision (18 m = 600 px).
  moveToken(ctx, "mira", 130, 90);
  moveToken(ctx, "livia", 520, 580);
  ctx.commit("torch off", (s) => D.toggleLight(s, "dm", TOWER, "tower-torch"));
  ctx.role = "player";
  const m = model(ctx, sceneOf(ctx));
  assert.ok(m.hiddenTokens.includes("goblin-2"));
  const layer = fogLayer(ctx, tv(ctx));
  assert.match(layer, /\.map-token\[data-actor="goblin-2"\]/);
  assert.doesNotMatch(layer, /data-fv-hidden-doors="[^"]*tower-store-door/, "seen from the hall");
  // Mira stands beyond Livia's darkvision in the dark: her token is drawn above.
  assert.ok(m.clones.includes("mira"), JSON.stringify(m.clones));
  assert.match(topLayer(ctx, tv(ctx)), /data-fv-clone="mira"/);
  ctx.registry.setSetting(ctx, "fog-vision-view.controlled-on-top", false);
  assert.doesNotMatch(topLayer(ctx, tv(ctx)), /data-fv-clone="mira"/);
  // Blinded Livia and Mira see nothing: the doors of the hall disappear too.
  ctx.role = "dm";
  ctx.commit("blinded", (s) => {
    s.actors.livia.conditions = ["blinded"];
  });
  ctx.role = "player";
  const blind = model(ctx, sceneOf(ctx));
  assert.ok(blind.hiddenDoors.includes("tower-store-door"));
  assert.ok(blind.hiddenTokens.includes("doran"));
});

test("panel for the DM and the player, EN labels, token vision dialog", () => {
  const { ctx } = harness();
  const html = panel(ctx, tv(ctx));
  for (const text of [
    "Visione dinamica dai muri e dai sensi",
    "Anteprima giocatori",
    "Vedi come Livia",
    "Diagnostica luci",
    "Pedine con visione",
    "Aree esplorate",
    "Memoria dell’esplorato condivisa dal gruppo",
  ])
    assert.ok(html.includes(text), text);
  ctx.role = "player";
  ctx.lang = "en";
  const p = panel(ctx, tv(ctx));
  assert.match(p, /What your characters see/);
  assert.match(p, /Darkvision 18 m \(token setting\)/);
  assert.doesNotMatch(p, /Player preview/);
  ctx.role = "dm";
  ctx.lang = "it";
  openVisionDialog(ctx, "doran");
  const dialog = ctx.dialogs.at(-1);
  assert.match(dialog.body, /name="darkvision"/);
  const data = new Map([
    ["vision", "on"],
    ["darkvision", "18"],
    ["blindsight", ""],
    ["truesight", ""],
    ["carried", "torch"],
  ]);
  dialog.options.onSubmit({ get: (k) => data.get(k) ?? null, has: (k) => data.has(k) });
  assert.equal(D.resolveSenses(ctx.state, "doran").darkvision, 18);
  assert.equal(D.carriedLight(ctx.state, TOWER, "doran").preset, "torch");
  // The player lights or puts out the light Livia carries, not the DM's wall torch.
  ctx.commit("carry", (s) => D.setCarriedLight(s, "dm", TOWER, "livia", "hooded-lantern"));
  const carried = D.carriedLight(ctx.state, TOWER, "livia");
  ctx.role = "player";
  openVisionDialog(ctx, "livia");
  ctx.dialogs.at(-1).options.onSubmit();
  ctx.role = "dm";
  assert.equal(D.carriedLight(ctx.state, TOWER, "livia").on, false);
  assert.equal(carried.on, true);
  assert.throws(
    () => D.toggleLight(ctx.state, "player", TOWER, "tower-torch", () => true),
    /carried by your character/,
  );
});

test("barrier tool selects the nearest wall and cycles with [ and ]; types from the bar", () => {
  const { ctx } = harness();
  const table = fakeTable(ctx, { mode: BARRIER_TOOL });
  barrierTool.onPointerDown(ctx, ev(551, 380), table);
  const ui = fogVisionView();
  assert.equal(ui.wall, "tower-mirror");
  const html = topLayer(ctx, tv(ctx, BARRIER_TOOL)) + hudLayer(ctx, tv(ctx, BARRIER_TOOL));
  assert.match(html, /data-fv-wall-type="window"/);
  assert.match(html, /aria-pressed="true"[^>]*><span>Unidirezionale/);
  barrierTool.onKeyDown(ctx, ev(0, 0, { key: "]" }), table);
  assert.notEqual(ui.wall, "tower-mirror");
  barrierTool.onPointerDown(ctx, ev(560, 175), table);
  assert.equal(ui.wall, null, "a door is not a barrier to retype");
});

// ------------------------------------------------------------------------------ review fixes

// A character made by the real builder keeps its species in the build record
// (characterBuild.data.origin), never in a top-level speciesId: the sheet senses must read it.
function builtCharacter(state, spec) {
  const { data } = composeBuild(spec);
  const id = "draft-" + spec.name;
  createCharacterDraft(state, { id, kind: "create" }, "dm");
  saveCharacterDraft(state, id, { data, section: "review" }, "dm");
  const preview = previewCharacterDraft(state, id, "dm");
  const result = applyCharacterDraft(
    state,
    id,
    { operationId: id, reviewKey: preview.reviewKey, allowIncomplete: true },
    "dm",
  );
  return result.actorId;
}

test("review: darkvision comes from a real builder sheet (species, Drow lineage)", () => {
  const { ctx } = harness();
  const state = ctx.state;
  const brann = claimPremade(state, "brann", "dm", {
    operationId: "rf-brann",
    allowIncomplete: true,
  });
  assert.equal(state.actors[brann].speciesId, undefined, "the builder keeps no top-level species");
  const dwarf = D.resolveSenses(state, brann);
  assert.deepEqual([dwarf.darkvision, dwarf.origin, dwarf.speciesId], [36, "sheet", "dwarf"]);
  assert.equal(dwarf.source, D.SOURCES.speciesDarkvision);
  const base = {
    classes: [{ classId: "wizard", level: 1 }],
    backgroundId: "sage",
    speciesId: "elf",
  };
  const drow = builtCharacter(state, {
    ...base,
    name: "Nyx",
    speciesChoices: { lineage: "drow", skill: "perception", spellcastingAbility: "int" },
  });
  const high = builtCharacter(state, {
    ...base,
    name: "Aelar",
    speciesChoices: { lineage: "high", skill: "perception", spellcastingAbility: "int" },
  });
  // SRD 5.2.1 Elven Lineage: Drow darkvision 120 ft (36 m); other elves 60 ft (18 m).
  assert.equal(D.resolveSenses(state, drow).darkvision, 36);
  assert.equal(D.resolveSenses(state, high).darkvision, 18);
  // The panel and the dialog name the sheet as the origin.
  ctx.lang = "en";
  openVisionDialog(ctx, brann);
  assert.match(ctx.dialogs.at(-1).body, /The sheet gives darkvision 36 m/);
});

test("review: the player's view also hides the unseen creature's name, distance and badges", () => {
  const { ctx } = harness();
  ctx.role = "player";
  const m = model(ctx, sceneOf(ctx));
  assert.ok(m.hiddenTokens.includes("goblin-1"));
  const layer = fogLayer(ctx, tv(ctx));
  // B18 distances in the Creature tab, B20 health words, B12 condition marks, B32 out marker.
  for (const selector of [
    'li:has(> [data-annot-dist="goblin-1"])',
    '[data-cs-health="goblin-1"]',
    '[data-token-menu-deco="goblin-1"]',
    '[data-ct-out="goblin-1"]',
  ])
    assert.ok(layer.includes(selector), selector);
  assert.doesNotMatch(layer, /data-annot-dist="livia"/, "a seen creature keeps its row");
});

test("review: an invisible barrier is not drawn for players; the DM still sees it", () => {
  const { ctx } = harness();
  const id = "tower-store-west-2";
  // Every drawn wall names itself, so a projection can hide one (additive attribute).
  assert.match(
    renderSpatialOverlay(sceneOf(ctx), ctx, { players: true }),
    new RegExp(`data-spatial-wall="${id}"`),
  );
  // Without fog or dynamic vision the layer still hides the invisible barrier.
  ctx.commit("no vision", (s) => D.setSceneOptions(s, "dm", TOWER, { vision: false }));
  ctx.commit("invisible", (s) => D.setBarrierType(s, "dm", TOWER, id, "invisible"));
  const hides = new RegExp(`\\[data-spatial-wall="${id}"\\]`);
  assert.doesNotMatch(fogLayer(ctx, tv(ctx)), hides, "the DM's own view keeps it");
  ctx.role = "player";
  assert.match(fogLayer(ctx, tv(ctx)), hides);
  ctx.role = "dm";
  fogVisionView().preview = true;
  assert.match(fogLayer(ctx, tv(ctx)), hides, "the player preview hides it too");
  resetFogVisionView();
  // A plain wall is never hidden; with nothing to hide the layer is empty.
  ctx.commit("wall", (s) => D.setBarrierType(s, "dm", TOWER, id, "wall"));
  ctx.role = "player";
  assert.equal(fogLayer(ctx, tv(ctx)), "");
});

test("review: a one-way wall made see-through in the scene editor is no longer called one-way", () => {
  const { ctx } = harness();
  const mirror = sceneOf(ctx).walls.find((w) => w.id === "tower-mirror");
  assert.equal(D.barrierType(mirror), "one-way");
  assert.equal(D.barrierType({ ...mirror, blocksSight: false }), "window");
});

test("review: F opens the Fog tool (D&D Beyond Maps), Z removes the last polygon point (Smoke)", () => {
  const { ctx, registry } = harness({ scene: "old-watch" });
  const command = registry.list("command", ctx).find((c) => c.id === "fog-vision.fog-tool");
  assert.ok(command, "the Fog tool command is registered");
  assert.equal(command.shortcut, "F");
  assert.equal(
    registry.commandForKey({ key: "f", code: "KeyF" }, { ...ctx, view: { page: "table" } })?.id,
    "fog-vision.fog-tool",
  );
  const player = harness({ role: "player" });
  assert.ok(
    !player.registry.list("command", player.ctx).some((c) => c.id === "fog-vision.fog-tool"),
    "players have no Fog tool key",
  );
  // The command needs the Table; there it selects the tool on the scene fog.
  assert.throws(() => command.run(ctx), /Open the Table|Apri il Tavolo/);
  const table = fakeTable(ctx, { mode: "move" });
  fogVisionView().table = table;
  fogVisionView().fog = { ...fogVisionView().fog, target: "memory:livia" };
  command.run(ctx);
  assert.equal(table.mode, FOG_TOOL);
  assert.equal(fogVisionView().fog.target, "scene");
  // Z (Smoke & Spectre) and Backspace remove the last polygon point.
  const ui = fogVisionView();
  ui.fog = { ...ui.fog, shape: "polygon", op: "reveal" };
  for (const [x, y] of [
    [600, 100],
    [800, 100],
    [800, 250],
  ])
    fogTool.onPointerDown(ctx, ev(x, y), table);
  const z = ev(0, 0, { key: "z" });
  fogTool.onKeyDown(ctx, z, table);
  assert.ok(z.defaultPrevented);
  assert.equal(ui.polygon.length, 2);
  fogTool.onKeyDown(ctx, ev(0, 0, { key: "Backspace" }), table);
  assert.equal(ui.polygon.length, 1);
});

test("review: a keyboard rectangle's first corner does not survive Escape or a shape change", () => {
  const { ctx } = harness({ scene: "old-watch" });
  const table = fakeTable(ctx);
  const ui = fogVisionView();
  ui.fog = { ...ui.fog, shape: "rect", op: "cover" };
  const count = D.sceneConfig(ctx.state, "old-watch").fog.length;
  fogTool.onKeyDown(ctx, ev(0, 0, { key: "ArrowRight" }), table);
  fogTool.onKeyDown(ctx, ev(0, 0, { key: "Enter" }), table);
  assert.ok(ui.rectStart, "first corner set");
  cancelGestures();
  assert.equal(ui.rectStart, null, "Escape forgets the first corner");
  fogTool.onKeyDown(ctx, ev(0, 0, { key: "ArrowRight" }), table);
  fogTool.onKeyDown(ctx, ev(0, 0, { key: "Enter" }), table);
  fogTool.deactivate();
  assert.equal(ui.rectStart, null, "leaving the tool forgets it too");
  assert.equal(D.sceneConfig(ctx.state, "old-watch").fog.length, count, "nothing painted");
});
