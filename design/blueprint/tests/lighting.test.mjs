// B35: lights and magical darkness. SRD 5.2.1 radii (Torch 6 + 6 m, Lamp 4.5 + 9 m, Hooded
// Lantern 9 + 9 m, Bullseye Lantern cone 18 + 18 m, Darkness 4.5 m sphere), permissions,
// carried lights that follow the token, the Lights tool handlers and the diagnostics.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { canControlActor } from "../character-access.mjs";
import { esc, icon } from "../ui.mjs";
import * as D from "../fog-vision-domain.mjs";
import {
  register,
  lightingLayer,
  resetFogVisionView,
  fogVisionView,
  model,
  fogLayer,
} from "../fog-vision.mjs";
import {
  lightsTool,
  lighting,
  lightsBar,
  diagnosticsSection,
  toggleLightById,
} from "../lighting-editor.mjs";

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
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object" ? (value[ctx.lang] ?? value.it) : String(value ?? ""),
    esc,
    icon,
    toasts,
    toast: (text, error = false) => toasts.push({ text, error }),
    render: () => {},
    dialog: () => {},
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
    },
    undo() {
      const current = store.state;
      store.undo(ctx.role);
      registry.afterUndo(current, store.state);
    },
    registry,
  };
  registry.attach(ctx);
  resetFogVisionView();
  return { ctx, store };
}
const sceneOf = (ctx) => ctx.state.scenes.find((s) => s.id === ctx.state.activeSceneId);
const px = (ctx, m) => D.metersToPx(sceneOf(ctx), m);
const table = (ctx, selected = "livia") => {
  const messages = [];
  return {
    get scene() {
      return sceneOf(ctx);
    },
    svg: { setPointerCapture() {}, querySelector: () => null },
    point: (e) => e.p,
    message: (text) => messages.push(text),
    messages,
    selectedActorId: selected,
    view: { zoom: 1 },
  };
};
const ev = (x, y, extra = {}) => ({
  button: 0,
  pointerId: 1,
  p: { x, y },
  key: extra.key,
  target: {
    closest: (sel) =>
      extra.light && sel === "[data-fv-light]"
        ? { dataset: { fvLight: extra.light }, setAttribute() {} }
        : null,
  },
  preventDefault() {
    this.defaultPrevented = true;
  },
});

test("SRD presets: torch, lamp, lanterns, darkness; metres and pixels", () => {
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(D.LIGHT_PRESETS).map(([id, p]) => [
        id,
        [p.bright, p.dim, !!p.magical, !!p.cone],
      ]),
    ),
    {
      torch: [6, 6, false, false],
      lamp: [4.5, 9, false, false],
      "hooded-lantern": [9, 9, false, false],
      "bullseye-lantern": [18, 18, false, true],
      darkness: [4.5, 0, true, false],
      custom: [3, 3, false, false],
    },
  );
  assert.deepEqual(D.LIGHT_PRESETS.torch.source.en.pages, [100]);
  assert.deepEqual(D.LIGHT_PRESETS.torch.source.it.pages, [113]);
  assert.deepEqual(D.LIGHT_PRESETS.darkness.source.it.pages, [170]);
  assert.ok(Math.abs(D.CONE_ANGLE - 53.13) < 0.01, "SRD cone: width equals distance");
  const { ctx } = harness();
  assert.equal(px(ctx, 6), 200, "6 m = 4 squares of 50 px");
});

test("a torch lights 6 m bright and 6 m dim; off it gives nothing; walls stop it", () => {
  const { ctx } = harness({ scene: "old-watch" });
  D.setSceneOptions(ctx.state, "dm", "old-watch", { phase: "night" });
  const torch = D.addLight(ctx.state, "dm", "old-watch", { preset: "torch", x: 500, y: 325 });
  const at = (x, y) => D.lightLevelAt(D.buildLighting(ctx.state, sceneOf(ctx)), { x, y }).level;
  assert.equal(at(500 + 199, 325), "bright");
  assert.equal(at(500 + 201, 325), "dim");
  assert.equal(at(500 + 399, 325), "dim");
  assert.equal(at(500 + 401, 325), "dark");
  D.toggleLight(ctx.state, "dm", "old-watch", torch.id);
  assert.equal(at(520, 325), "dark", "a torch put out gives no light");
  D.toggleLight(ctx.state, "dm", "old-watch", torch.id);
  // A wall drawn with the scene editor (increment 4 model) stops the light.
  const scene = sceneOf(ctx);
  scene.walls = [
    {
      id: "w1",
      kind: "wall",
      a: { x: 600, y: 200 },
      b: { x: 600, y: 450 },
      blocksMovement: true,
      blocksSight: true,
      blocksEffect: true,
      secret: false,
      source: { kind: "authored-demo", revision: "test" },
    },
  ];
  assert.equal(at(650, 325), "dark", "behind the wall");
  assert.equal(at(580, 325), "bright");
});

test("magical darkness suppresses a torch inside it and defeats darkvision; truesight pierces it", () => {
  const { ctx } = harness();
  const scene = sceneOf(ctx);
  // Darkness cast on the hall torch (320, 85).
  const dark = D.addLight(ctx.state, "dm", TOWER, { preset: "darkness", x: 320, y: 100 });
  assert.equal(dark.magical, true);
  assert.equal(dark.dim, 0);
  const lit = D.buildLighting(ctx.state, scene);
  assert.equal(lit.lights.find((l) => l.id === "tower-torch").suppressed, true);
  assert.deepEqual(D.lightLevelAt(lit, { x: 320, y: 110 }).magical, true);
  assert.equal(
    D.lightLevelAt(lit, { x: 320, y: 300 }).level,
    "dark",
    "the suppressed torch gives no light",
  );
  const livia = D.buildViewer(ctx.state, scene, "livia", { x: 320, y: 300 });
  assert.equal(D.canSee(livia, lit, { x: 320, y: 110 }).reason, "magical-darkness");
  assert.equal(D.canSee(livia, lit, { x: 250, y: 400 }).perceived, "grey");
  D.setTokenVision(ctx.state, "dm", "livia", { truesight: 9 });
  const seer = D.buildViewer(ctx.state, scene, "livia", { x: 320, y: 300 });
  assert.equal(D.canSee(seer, lit, { x: 320, y: 110 }).reason, "truesight");
  const d = D.diagnostics(ctx.state, TOWER);
  assert.deepEqual(d.counts, { vision: 3, lights: 3, on: 2, darkness: 1 });
  assert.ok(d.warnings.some((w) => w.kind === "suppressed" && w.lightId === "tower-torch"));
  // Removing the darkness brings the torch back.
  D.removeLight(ctx.state, "dm", TOWER, dark.id);
  assert.equal(
    D.lightLevelAt(D.buildLighting(ctx.state, scene), { x: 320, y: 110 }).level,
    "bright",
  );
});

test("review: magical darkness is opaque — nothing is seen through it but by truesight", () => {
  const { ctx } = harness();
  const scene = sceneOf(ctx);
  // Darkness (4.5 m = 150 px sphere) in the middle of the hall, far from both torches.
  const dark = D.addLight(ctx.state, "dm", TOWER, { preset: "darkness", x: 320, y: 300 });
  // By day the hall is bright: Doran, below the sphere, looks past it.
  D.setSceneOptions(ctx.state, "dm", TOWER, { phase: "day" });
  let lit = D.buildLighting(ctx.state, scene);
  const doran = () => D.buildViewer(ctx.state, scene, "doran", { x: 320, y: 560 });
  const behind = { x: 320, y: 100 };
  assert.equal(D.lightLevelAt(lit, behind).level, "bright", "the far side itself is lit");
  assert.deepEqual(
    [D.canSee(doran(), lit, behind).visible, D.canSee(doran(), lit, behind).reason],
    [false, "magical-darkness"],
    "SRD Darkness: a heavily obscured sphere nobody sees through",
  );
  assert.equal(D.canSee(doran(), lit, { x: 130, y: 480 }).visible, true, "beside it: seen");
  // A viewer inside the sphere still sees out into the light.
  const inside = D.buildViewer(ctx.state, scene, "doran", { x: 320, y: 300 });
  assert.equal(D.canSee(inside, lit, behind).visible, true);
  // At night, darkvision cannot see through it either (SRD: "Darkvision can't see through it").
  D.setSceneOptions(ctx.state, "dm", TOWER, { phase: "night" });
  D.toggleLight(ctx.state, "dm", TOWER, "tower-torch");
  lit = D.buildLighting(ctx.state, scene);
  const livia = D.buildViewer(ctx.state, scene, "livia", { x: 320, y: 560 });
  assert.equal(D.canSee(livia, lit, { x: 320, y: 120 }).reason, "magical-darkness");
  assert.equal(D.canSee(livia, lit, { x: 130, y: 480 }).perceived, "grey");
  // Truesight within range sees through magical darkness.
  D.setTokenVision(ctx.state, "dm", "livia", { truesight: 30 });
  const seer = D.buildViewer(ctx.state, scene, "livia", { x: 320, y: 560 });
  assert.equal(D.canSee(seer, lit, { x: 320, y: 120 }).visible, true);
  D.setTokenVision(ctx.state, "dm", "livia", { truesight: null });
  // The map agrees: the view as Doran hides Mira behind the sphere and paints its shadow.
  D.setSceneOptions(ctx.state, "dm", TOWER, { phase: "day" });
  ctx.commit("place", (s) => {
    const tokens = s.scenes.find((x) => x.id === TOWER).tokens;
    Object.assign(
      tokens.find((t) => t.actorId === "doran"),
      { x: 320, y: 560 },
    );
    Object.assign(
      tokens.find((t) => t.actorId === "mira"),
      { x: 320, y: 100 },
    );
  });
  fogVisionView().viewAs = "doran";
  const m = model(ctx, sceneOf(ctx));
  assert.ok(m.hiddenTokens.includes("mira"), JSON.stringify(m.hiddenTokens));
  assert.match(fogLayer(ctx, { scene: sceneOf(ctx), zoom: 1 }), /class="fv-shadow"/);
  resetFogVisionView();
  D.removeLight(ctx.state, "dm", TOWER, dark.id);
});

test("bullseye lantern lights a cone only; lights are validated and DM only", () => {
  const { ctx } = harness({ scene: "old-watch" });
  D.setSceneOptions(ctx.state, "dm", "old-watch", { phase: "night" });
  D.addLight(ctx.state, "dm", "old-watch", {
    preset: "bullseye-lantern",
    x: 200,
    y: 325,
    rotation: 0,
  });
  const lit = D.buildLighting(ctx.state, sceneOf(ctx));
  assert.equal(D.lightLevelAt(lit, { x: 500, y: 325 }).level, "bright");
  assert.equal(D.lightLevelAt(lit, { x: 200, y: 500 }).level, "dark", "outside the cone");
  assert.throws(
    () => D.addLight(ctx.state, "player", "old-watch", { preset: "torch", x: 1, y: 1 }),
    /Only the DM/,
  );
  assert.throws(
    () => D.addLight(ctx.state, "dm", "old-watch", { preset: "torch", x: 5000, y: 1 }),
    /inside the scene/,
  );
  const light = D.addLight(ctx.state, "dm", "old-watch", { preset: "custom", x: 100, y: 100 });
  assert.throws(
    () => D.updateLight(ctx.state, "dm", "old-watch", light.id, { bright: 99 }),
    /between 0 and 36/,
  );
  D.updateLight(ctx.state, "dm", "old-watch", light.id, { preset: "lamp" });
  const lamp = D.sceneConfig(ctx.state, "old-watch").lights.find((l) => l.id === light.id);
  assert.deepEqual([lamp.bright, lamp.dim], [4.5, 9], "a new preset brings its SRD radii");
});

test("a carried light follows its token; the player toggles only their character's light", () => {
  const { ctx } = harness();
  D.setCarriedLight(ctx.state, "dm", TOWER, "livia", "torch");
  const carried = D.carriedLight(ctx.state, TOWER, "livia");
  assert.equal(carried.attachedTo, "livia");
  const scene = sceneOf(ctx);
  const token = D.tokenOf(scene, "livia");
  token.x = 700;
  token.y = 450;
  const lit = D.buildLighting(ctx.state, scene);
  assert.deepEqual(lit.lights.find((l) => l.id === carried.id).at, { x: 700, y: 450 });
  assert.throws(
    () => D.setCarriedLight(ctx.state, "dm", TOWER, "livia", "darkness"),
    /not darkness/,
  );
  ctx.role = "player";
  assert.ok(toggleLightById(ctx, TOWER, carried.id), JSON.stringify(ctx.toasts));
  assert.equal(D.carriedLight(ctx.state, TOWER, "livia").on, false);
  assert.equal(toggleLightById(ctx, TOWER, "tower-torch"), false);
  assert.match(ctx.toasts.at(-1).text, /personaggio/);
  // Doran is played by the DM identity in the demo: the player cannot light his lantern.
  ctx.role = "dm";
  D.setCarriedLight(ctx.state, "dm", TOWER, "doran", "hooded-lantern");
  ctx.role = "player";
  assert.equal(toggleLightById(ctx, TOWER, D.carriedLight(ctx.state, TOWER, "doran").id), false);
});

test("Lights tool: click places the chosen preset, drag moves, keys nudge and delete, Undo restores", () => {
  const { ctx, store } = harness();
  const t = table(ctx);
  lighting.preset = "lamp";
  lightsTool.onPointerDown(ctx, ev(300, 500), t);
  const placed = D.sceneConfig(ctx.state, TOWER).lights.at(-1);
  assert.deepEqual(
    [placed.preset, placed.x, placed.y, placed.bright, placed.dim],
    ["lamp", 300, 500, 4.5, 9],
  );
  assert.equal(lighting.selected, placed.id);
  assert.ok(store.state.log.some((l) => /Luce aggiunta: Lampada/.test(l.label)));
  // Drag the handle.
  lightsTool.onPointerDown(ctx, ev(300, 500, { light: placed.id }), t);
  lightsTool.onPointerMove(ctx, ev(330, 520), t);
  lightsTool.onPointerUp(ctx, ev(330, 520), t);
  let light = D.sceneConfig(ctx.state, TOWER).lights.find((l) => l.id === placed.id);
  assert.deepEqual([light.x, light.y], [330, 520]);
  // Keyboard: arrow nudges half a square, Enter confirms.
  const right = ev(0, 0, { key: "ArrowRight" });
  lightsTool.onKeyDown(ctx, right, t);
  assert.ok(right.defaultPrevented);
  lightsTool.onKeyDown(ctx, ev(0, 0, { key: "Enter" }), t);
  light = D.sceneConfig(ctx.state, TOWER).lights.find((l) => l.id === placed.id);
  assert.equal(light.x, 355);
  // The bar shows the selected light with its SRD source and controls.
  const bar = lightsBar(ctx, { scene: sceneOf(ctx), selectedActorId: "livia" });
  assert.match(bar, /Luce selezionata/);
  assert.match(bar, /SRD 5\.2\.1 · IT p\. 110/);
  assert.match(bar, /data-fv-light-field="dim"/);
  assert.match(bar, /Fai seguire Livia/);
  // Delete, then Undo restores it.
  lightsTool.onKeyDown(ctx, ev(0, 0, { key: "Delete" }), t);
  assert.equal(
    D.sceneConfig(ctx.state, TOWER).lights.some((l) => l.id === placed.id),
    false,
  );
  ctx.undo();
  assert.equal(
    D.sceneConfig(ctx.state, TOWER).lights.some((l) => l.id === placed.id),
    true,
  );
});

test("lighting layer and diagnostics section: glows, night veil, counts and hover rules", () => {
  const { ctx } = harness();
  const html = lightingLayer(ctx, {
    scene: sceneOf(ctx),
    selectedActorId: "livia",
    mode: "move",
    zoom: 1,
    pan: { x: 0, y: 0 },
  });
  assert.match(html, /data-fv-phase="night"/);
  assert.match(
    html,
    /class="fv-ambient" data-fv-ambient="0.36"/,
    "the DM sees through a lighter veil",
  );
  assert.equal((html.match(/class="fv-glow"/g) ?? []).length, 2, "two lights on, the lantern off");
  const diag = diagnosticsSection(ctx, TOWER);
  assert.match(diag, /Pedine con visione: <strong>3<\/strong>/);
  assert.match(diag, /Fonti di luce: <strong>3<\/strong> \(2 accese\)/);
  assert.match(diag, /data-fv-diag="tower-store-lantern"/);
  assert.match(
    diag,
    /:has\(\[data-fv-diag="livia"\]:is\(:hover,:focus-visible\)\) \[data-fv-mark="livia"\]/,
  );
  assert.match(diag, /Doran è al buio/);
  ctx.lang = "en";
  assert.match(diagnosticsSection(ctx, TOWER), /Vision tokens: <strong>3<\/strong>/);
});
