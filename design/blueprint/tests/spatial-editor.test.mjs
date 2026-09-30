import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import {
  createSpatialDraft,
  addSpatialShape,
  updateSpatialShape,
  deleteSpatialShape,
  undoSpatialDraft,
  calibrateSceneScale,
  applyScaleCalibration,
  renderSpatialOverlay,
  bindSpatialEditor,
  spatialPreviewScene,
} from "../spatial-editor.mjs";
import {
  saveSceneDraft,
  renderPreparation,
  bindPreparation,
  resetPreparationDraft,
} from "../preparation.mjs";

const scene = () => structuredClone(createInitialState().scenes[0]);
const ctx = {
  t: (it, en) => en,
  esc: (value) =>
    String(value ?? "")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;"),
};

test("drawn geometry is explicit draft data; undo preserves unrelated live-like token edits", () => {
  const s = scene(),
    ui = createSpatialDraft();
  const wall = addSpatialShape(s, ui, "wall", { x: 80, y: 90 }, { x: 250, y: 90 }, "wall-a");
  assert.equal(wall.blocksMovement, true);
  assert.equal(wall.blocksSight, true);
  assert.equal(wall.source.kind, "authored-demo");
  s.tokens[0].x = 333;
  updateSpatialShape(s, ui, "wall-a", { ...wall, blocksSight: false });
  assert.equal(s.walls[0].blocksMovement, true);
  assert.equal(s.walls[0].blocksSight, false);
  undoSpatialDraft(s, ui);
  assert.equal(s.walls[0].blocksSight, true);
  assert.equal(s.tokens[0].x, 333);
  deleteSpatialShape(s, ui, "wall-a");
  assert.equal(s.walls.length, 0);
  undoSpatialDraft(s, ui);
  assert.equal(s.walls[0].id, "wall-a");
});

test("door properties and reversed terrain box survive a scene save without resetting actors", () => {
  const state = createInitialState(),
    original = structuredClone(state.scenes[0]),
    draft = structuredClone(original),
    ui = createSpatialDraft();
  const door = addSpatialShape(draft, ui, "door", { x: 200, y: 100 }, { x: 200, y: 160 }, "door-a");
  updateSpatialShape(draft, ui, door.id, {
    ...door,
    doorState: "locked",
    secret: true,
    playerOperable: false,
    blocksSight: false,
  });
  addSpatialShape(draft, ui, "difficult", { x: 420, y: 340 }, { x: 300, y: 200 }, "terrain-a");
  state.actors.livia.hp = 7;
  state.actors.livia.slots.used = 2;
  state.scenes[0].tokens[0].x = 321;
  saveSceneDraft(state, draft, "dm", original);
  assert.equal(state.scenes[0].walls[0].doorState, "locked");
  assert.equal(state.scenes[0].walls[0].blocksSight, false);
  assert.deepEqual(
    {
      x: state.scenes[0].terrain[0].x,
      y: state.scenes[0].terrain[0].y,
      width: state.scenes[0].terrain[0].width,
      height: state.scenes[0].terrain[0].height,
    },
    { x: 300, y: 200, width: 120, height: 140 },
  );
  assert.equal(state.scenes[0].tokens[0].x, 321);
  assert.equal(state.actors.livia.hp, 7);
  assert.equal(state.actors.livia.slots.used, 2);
});

test("calibration is a pure visible proposal until applied; physical pixel positions remain unchanged", () => {
  const s = scene(),
    ui = createSpatialDraft();
  addSpatialShape(s, ui, "wall", { x: 100, y: 90 }, { x: 200, y: 90 }, "wall");
  const before = structuredClone(s);
  const proposal = calibrateSceneScale(s, { x: 100, y: 100 }, { x: 301, y: 100 }, 6, 1.5);
  assert.equal(proposal.gridSize, 50.25);
  assert.deepEqual(s, before);
  s.gridVisible = false;
  ui.calibration = { a: proposal.a, b: proposal.b, knownMeters: 6, cellMeters: 1.5 };
  assert.equal(spatialPreviewScene(s, ui).gridVisible, true);
  assert.equal(s.gridVisible, false);
  applyScaleCalibration(s, ui, proposal);
  assert.equal(s.gridVisible, false);
  assert.equal(s.gridSize, 50.25);
  assert.equal(s.metersPerCell, 1.5);
  assert.deepEqual(s.tokens, before.tokens);
  assert.deepEqual(s.walls, before.walls);
  undoSpatialDraft(s, ui);
  assert.equal(s.gridSize, before.gridSize);
  assert.throws(() => calibrateSceneScale(s, { x: 1, y: 1 }, { x: 1, y: 1 }, 6, 1.5));
  assert.throws(() => calibrateSceneScale(s, { x: 1, y: 1 }, { x: 200, y: 1 }, 0, 1.5));
});

test("invalid edit is atomic and secret segments are absent from player preview markup", () => {
  const s = scene(),
    ui = createSpatialDraft();
  const door = addSpatialShape(
    s,
    ui,
    "door",
    { x: 100, y: 100 },
    { x: 100, y: 180 },
    "secret-marker",
  );
  updateSpatialShape(s, ui, door.id, { ...door, secret: true });
  const before = JSON.stringify(s);
  assert.throws(() => updateSpatialShape(s, ui, door.id, { ...s.walls[0], b: { x: -5, y: 2 } }));
  assert.equal(JSON.stringify(s), before);
  assert.doesNotMatch(renderSpatialOverlay(s, ctx, { players: true }), /secret-marker|100,180/);
  assert.match(renderSpatialOverlay(s, ctx, { players: false, editable: true }), /secret-marker/);
});

test("geometry conflicts reject a competing edit while metadata-only save preserves a live door state", () => {
  const state = createInitialState(),
    ui = createSpatialDraft();
  addSpatialShape(state.scenes[0], ui, "door", { x: 100, y: 100 }, { x: 100, y: 180 }, "door");
  const original = structuredClone(state.scenes[0]),
    draft = structuredClone(original);
  draft.name = "New name";
  state.scenes[0].walls[0].doorState = "open";
  saveSceneDraft(state, draft, "dm", original);
  assert.equal(state.scenes[0].walls[0].doorState, "open");
  const nextOriginal = structuredClone(state.scenes[0]),
    next = structuredClone(nextOriginal);
  next.walls[0].b.y = 210;
  state.scenes[0].walls[0].doorState = "locked";
  assert.throws(() => saveSceneDraft(state, next, "dm", nextOriginal), /geometry-conflict/);
});

test("active pending consequences block geometry or scale replacement, preserving metadata edits", () => {
  const state = createInitialState(),
    original = structuredClone(state.scenes[0]),
    draft = structuredClone(original),
    ui = createSpatialDraft();
  state.movements = [{ actorId: "livia", status: "pending" }];
  addSpatialShape(draft, ui, "wall", { x: 600, y: 80 }, { x: 600, y: 180 }, "wall");
  const before = JSON.stringify(state);
  assert.throws(() => saveSceneDraft(state, draft, "dm", original), /geometry-pending/);
  assert.equal(JSON.stringify(state), before);
  const scale = structuredClone(original);
  scale.gridSize = 75;
  assert.throws(() => saveSceneDraft(state, scale, "dm", original), /geometry-pending/);
  const metadata = structuredClone(original);
  metadata.name = "Updated note";
  saveSceneDraft(state, metadata, "dm", original);
  assert.equal(state.scenes[0].name, "Updated note");
});

function gestureHarness(s, ui) {
  const listeners = {},
    errors = [],
    focusOptions = [];
  const svg = {
    createSVGPoint: () => ({
      x: 0,
      y: 0,
      matrixTransform() {
        return { x: this.x, y: this.y };
      },
    }),
    getScreenCTM: () => ({ inverse: () => ({}) }),
    focus(options) {
      focusOptions.push(options);
    },
    querySelector: () => null,
    insertAdjacentHTML() {},
  };
  let capture = false;
  const container = {
    querySelector: (selector) => (selector === "svg.prep-map" ? svg : null),
    addEventListener: (type, callback) => {
      listeners[type] = callback;
    },
    setPointerCapture: () => {
      capture = true;
    },
    hasPointerCapture: () => capture,
    releasePointerCapture: () => {
      capture = false;
    },
  };
  const root = {
    querySelectorAll: () => [],
    querySelector: (selector) => (selector === "[data-prep-map]" ? container : null),
    ownerDocument: { querySelector: () => svg },
  };
  bindSpatialEditor(
    root,
    {
      ...ctx,
      role: "dm",
      label: (v) => (typeof v === "object" ? v.en : v),
      toast: (message) => errors.push(message),
    },
    { scene: s, ui, capture() {}, redraw() {}, render() {}, onTool() {} },
  );
  return {
    errors,
    focusOptions,
    fire(type, values = {}) {
      listeners[type]({
        button: 0,
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        target: { closest: () => null },
        preventDefault() {},
        ...values,
      });
    },
  };
}

test("two-click and drag gestures only author on completion; Escape cancels a captured gesture", () => {
  const s = scene(),
    ui = createSpatialDraft();
  ui.tool = "wall";
  const h = gestureHarness(s, ui);
  h.fire("pointerdown");
  assert.deepEqual(h.focusOptions.at(-1), { preventScroll: true });
  h.fire("pointerup");
  assert.equal(s.walls.length, 0);
  h.fire("pointermove", { clientX: 220 });
  assert.equal(s.walls.length, 0);
  h.fire("keydown", { key: "Escape" });
  h.fire("pointerup", { clientX: 220 });
  assert.equal(s.walls.length, 0);
  assert.equal(ui.anchor, null);
  h.fire("pointerdown");
  h.fire("pointerup");
  h.fire("pointerdown", { clientX: 250 });
  h.fire("pointerup", { clientX: 250 });
  assert.equal(s.walls.length, 1);
  assert.deepEqual(s.walls[0].b, { x: 250, y: 100 });
  ui.tool = "difficult";
  h.fire("pointerdown", { clientX: 400, clientY: 300 });
  h.fire("pointermove", { clientX: 280, clientY: 200 });
  h.fire("pointerup", { clientX: 280, clientY: 200 });
  assert.equal(s.terrain.length, 1);
  assert.equal(s.terrain[0].width, 120);
  assert.deepEqual(h.errors, []);
});

test("keyboard defines calibration points without applying a scale or moving tokens", () => {
  const s = scene(),
    before = structuredClone(s),
    ui = createSpatialDraft();
  ui.tool = "scale";
  const h = gestureHarness(s, ui);
  h.fire("keydown", { key: "Enter" });
  for (let i = 0; i < 10; i++) h.fire("keydown", { key: "ArrowRight" });
  h.fire("keydown", { key: "Enter" });
  assert.ok(ui.calibration);
  assert.equal(ui.calibration.b.x - ui.calibration.a.x, 100);
  assert.deepEqual(s, before);
  h.fire("keydown", { key: "Escape" });
  assert.equal(ui.calibration, null);
  assert.deepEqual(s, before);
});

test("starting a token drag focuses the map without scrolling its coordinates", () => {
  const state = createInitialState(),
    token = state.scenes[0].tokens[0],
    focusOptions = [],
    listeners = {};
  const svg = {
    focus: (options) => focusOptions.push(options),
    createSVGPoint: () => ({
      x: 0,
      y: 0,
      matrixTransform() {
        return { x: this.x, y: this.y };
      },
    }),
    getScreenCTM: () => ({ inverse: () => ({}) }),
  };
  const container = {
    querySelector: () => svg,
    setPointerCapture() {},
    addEventListener(type, callback) {
      (listeners[type] ||= []).push(callback);
    },
  };
  const root = {
    querySelectorAll: () => [],
    querySelector: (selector) => (selector === "[data-prep-map]" ? container : null),
  };
  const context = {
    ...ctx,
    state,
    role: "dm",
    view: { id: state.scenes[0].id, tab: "edit" },
    label: (value) => (typeof value === "object" ? value.en : value),
  };
  try {
    renderPreparation(context);
    bindPreparation(root, context);
    const event = {
      button: 0,
      pointerId: 1,
      clientX: token.x,
      clientY: token.y,
      preventDefault() {},
      target: {
        closest: (selector) =>
          selector === "[data-prep-token]" ? { dataset: { prepToken: token.id } } : null,
      },
    };
    for (const handler of listeners.pointerdown) handler(event);
    assert.deepEqual(focusOptions, [{ preventScroll: true }]);
  } finally {
    resetPreparationDraft();
  }
});
