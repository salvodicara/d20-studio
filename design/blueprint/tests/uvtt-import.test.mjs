// B47: Universal VTT import (Roll20 UVTT R20-089, Dungeondraft export CMP-147). The sample
// file becomes a scene whose image, walls, doors and lights stay editable (increment 4 walls,
// B35 lights); a file that cannot be imported is refused with a readable reason and nothing
// changes.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { canControlActor } from "../character-access.mjs";
import { esc, icon } from "../ui.mjs";
import { validateSceneGeometry, isSegmentBlocked } from "../spatial.mjs";
import { validateSceneDraft } from "../preparation.mjs";
import { updateSpatialShape, createSpatialDraft } from "../spatial-editor.mjs";
import { register as registerFog } from "../fog-vision.mjs";
import * as FV from "../fog-vision-domain.mjs";
import { register } from "../scene-assets.mjs";
import * as D from "../scene-assets-domain.mjs";
import { parseUVTT, buildUVTTScene, sniffImage, UVTT_MAX_IMAGE_BYTES } from "../uvtt-import.mjs";
import { UVTT_SAMPLE, UVTT_SAMPLE_NAME, uvttSampleText } from "../uvtt-sample.mjs";
import { loadUVTT, importBuilt, ui } from "../scene-assets-prep.mjs";

const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};
function harness({ fog = true, role = "dm" } = {}) {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  if (fog) registry.use("fog-vision", registerFog);
  registry.use("scene-assets", register);
  const store = createStore({ storage: memory() });
  registry.initState(store.state);
  const toasts = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang: "it",
    offline: false,
    view: { page: "preparation", id: "", tab: D.ID },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object" ? (value[ctx.lang] ?? value.it) : String(value ?? ""),
    esc,
    icon,
    toast: (text, error = false) => toasts.push({ text, error }),
    render: () => {},
    navigate: () => {},
    dialog: () => {},
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    commit(label, mutator, options = {}) {
      if (ctx.offline && !options.local)
        throw Object.assign(Error("offline"), { it: "Sei senza rete", en: "You are offline" });
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        undoable: options.undoable,
      });
    },
    undo: () => store.undo(ctx.role),
    registry,
    toasts,
  };
  registry.attach(ctx);
  return { ctx, store };
}
const refused = (fn, code) =>
  assert.throws(fn, (error) => {
    assert.equal(error.code, code);
    assert.ok(error.it && error.en);
    return true;
  });
const tinyPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

test("the sample file: image, walls, doors and lights in the scene's units", () => {
  const parsed = parseUVTT(uvttSampleText(), { fileName: UVTT_SAMPLE_NAME });
  assert.equal(parsed.format, 0.3);
  assert.match(parsed.image, /^data:image\/webp;base64,/);
  assert.deepEqual(parsed.cells, { x: 20, y: 13 });
  const built = buildUVTTScene(parsed, { id: "crypt", revision: "test" });
  const { scene, lights, report } = built;
  assert.deepEqual([scene.width, scene.height, scene.gridSize], [1000, 650, 50]);
  // 12 polylines of the sample: 25 wall segments; 2 portals, one open; 3 lights.
  assert.deepEqual([report.walls, report.doors, report.openDoors, report.lights], [25, 2, 1, 3]);
  assert.equal(report.skipped, 0);
  assert.deepEqual(validateSceneGeometry(scene), []);
  assert.deepEqual(validateSceneDraft(scene), []);
  const door = scene.walls.find((w) => w.id === "uvtt-door-1");
  assert.deepEqual(
    [door.a, door.b, door.doorState],
    [{ x: 150, y: 325 }, { x: 200, y: 325 }, "closed"],
  );
  // The closed door blocks, the open one lets through (increment 4 movement rules).
  assert.equal(isSegmentBlocked(scene, { x: 175, y: 280 }, { x: 175, y: 370 }), true);
  assert.equal(isSegmentBlocked(scene, { x: 675, y: 420 }, { x: 675, y: 480 }), false);
  assert.equal(isSegmentBlocked(scene, { x: 175, y: 200 }, { x: 175, y: 400 }), true);
  // A 4-cell light: 6 m radius, half bright and half dim, colour from ARGB.
  assert.deepEqual(
    [lights[0].x, lights[0].y, lights[0].bright, lights[0].dim, lights[0].color],
    [650, 100, 3, 3, "#eb9c4a"],
  );
  assert.equal(scene.walls[0].source.kind, "authored-demo");
  assert.match(scene.walls[0].source.title, /cripta-sotto-la-torre\.dd2vtt/);
  // Walls stay editable with the scene editor's own command.
  const ui2 = createSpatialDraft();
  const wall = scene.walls[0];
  updateSpatialShape(scene, ui2, wall.id, { ...wall, secret: true });
  assert.equal(scene.walls[0].secret, true);
});

test("bad files are refused with the reason; nothing is built", () => {
  refused(() => parseUVTT("not json", { fileName: "mappa.dd2vtt" }), "not-json");
  refused(() => parseUVTT(uvttSampleText(), { fileName: "mappa.png" }), "extension");
  refused(() => parseUVTT("[1,2]", { fileName: "mappa.uvtt" }), "not-object");
  refused(
    () =>
      parseUVTT({ ...UVTT_SAMPLE, resolution: { map_size: { x: 0, y: 5 }, pixels_per_grid: 50 } }),
    "resolution",
  );
  refused(() => parseUVTT({ ...UVTT_SAMPLE, resolution: undefined }), "resolution");
  refused(() => parseUVTT({ ...UVTT_SAMPLE, image: "" }), "image");
  refused(() => parseUVTT({ ...UVTT_SAMPLE, image: btoa("GIF89a......") }), "image-type");
  refused(() => parseUVTT({ ...UVTT_SAMPLE, image: tinyPng }, { maxImageBytes: 10 }), "image-size");
  refused(() => parseUVTT({ ...UVTT_SAMPLE, line_of_sight: [[{ x: 1 }]] }), "shape");
  refused(() => parseUVTT({ ...UVTT_SAMPLE, portals: [{ bounds: [{ x: 1, y: 1 }] }] }), "shape");
  refused(() => parseUVTT({ ...UVTT_SAMPLE, lights: "x" }), "shape");
  refused(
    () =>
      buildUVTTScene(
        parseUVTT({
          ...UVTT_SAMPLE,
          resolution: { map_size: { x: 4, y: 4 }, pixels_per_grid: 50 },
        }),
      ),
    "too-small",
  );
  assert.equal(UVTT_MAX_IMAGE_BYTES, 1024 * 1024);
  assert.equal(sniffImage(tinyPng), "image/png");
  assert.equal(sniffImage("/9j/4AAQSkZJRg"), "image/jpeg");
});

test("large exports scale into the scene limits; origin and edge rounding are respected", () => {
  const big = parseUVTT({
    ...UVTT_SAMPLE,
    resolution: { map_origin: { x: 1, y: 1 }, map_size: { x: 60, y: 30 }, pixels_per_grid: 256 },
    line_of_sight: [
      [
        { x: 1, y: 1 },
        { x: 61.02, y: 1 },
      ],
      [
        { x: 70, y: 1 },
        { x: 80, y: 1 },
      ],
    ],
    portals: [],
    lights: [{ position: { x: 11, y: 11 }, range: 50, color: "ff9fd0ff" }],
  });
  const built = buildUVTTScene(big, { id: "big", metersPerCell: 1.5 });
  assert.equal(built.scene.width, 4000);
  assert.equal(built.scene.height, 2000);
  assert.equal(built.report.scale < 1, true);
  assert.equal(built.report.walls, 1, "the wall beyond the map is skipped");
  assert.equal(built.report.skipped, 1);
  assert.deepEqual(built.scene.walls[0].a, { x: 0, y: 0 }, "origin subtracted");
  assert.equal(built.scene.walls[0].b.x, 4000, "a hair outside is pulled onto the edge");
  assert.deepEqual([built.lights[0].bright, built.lights[0].dim], [36, 36], "capped at 36 m");
});

test("import through Preparation: scene in its folder, lights in B35, all editable and undoable", () => {
  const { ctx } = harness();
  const result = loadUVTT(ctx, uvttSampleText(), UVTT_SAMPLE_NAME);
  assert.ok(result.built);
  const id = importBuilt(ctx, result.built, { name: "La cripta sotto la torre", folderId: "ch1" });
  const scene = ctx.state.scenes.find((s) => s.id === id);
  assert.equal(scene.name, "La cripta sotto la torre");
  assert.equal(D.sceneFolder(ctx.state, id), "ch1");
  const lights = FV.sceneConfig(ctx.state, id).lights;
  assert.equal(lights.length, 3);
  // Editable with the B35 commands.
  ctx.commit("light", (s) => FV.updateLight(s, "dm", id, lights[0].id, { bright: 4.5 }));
  assert.equal(FV.sceneConfig(ctx.state, id).lights[0].bright, 4.5);
  ctx.undo();
  ctx.undo();
  assert.equal(
    ctx.state.scenes.some((s) => s.id === id),
    false,
    "Undo removes the import",
  );
  // A bad file leaves a readable error and imports nothing.
  const bad = loadUVTT(ctx, "{}", "rotta.dd2vtt");
  assert.equal(bad.error.code, "resolution");
  assert.equal(ui.uvtt, bad);
  // Players cannot import; offline refuses the shared change.
  const { ctx: player } = harness({ role: "player" });
  assert.throws(() => importBuilt(player, result.built, {}), /Only the DM/);
  ctx.offline = true;
  assert.throws(
    () => importBuilt(ctx, loadUVTT(ctx, uvttSampleText(), UVTT_SAMPLE_NAME).built),
    /offline/,
  );
});

test("without the lights area the file's lights wait with the scene", () => {
  const { ctx } = harness({ fog: false });
  const built = loadUVTT(ctx, uvttSampleText(), UVTT_SAMPLE_NAME).built;
  const id = importBuilt(ctx, built, {});
  assert.equal(D.sliceOf(ctx.state).pendingLights[id].length, 3);
});

test("review: the imported scene's generated texts follow the DM's language", () => {
  const parsed = parseUVTT(uvttSampleText(), { fileName: UVTT_SAMPLE_NAME });
  const en = buildUVTTScene(parsed, { id: "crypt-en", lang: "en" });
  assert.match(en.scene.description, /^Imported from .*: \d+ walls, \d+ doors, \d+ lights\./);
  assert.match(en.lights[0].name, /^Light 1 \(/);
  const it = buildUVTTScene(parsed, { id: "crypt-it" });
  assert.match(it.scene.description, /^Importata da /);
  assert.match(it.lights[0].name, /^Luce 1 \(/);
  ui.uvtt = null;
  const loaded = loadUVTT({ lang: "en" }, uvttSampleText(), UVTT_SAMPLE_NAME);
  assert.match(loaded.built.scene.description, /^Imported from /);
});
