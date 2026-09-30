// P7 fixes (triage 25/09/2026): one scene list and one scene editor (PR-03/06/08…15), typed
// delete confirmation (PR-05), basements (PR-09), prefab locks (PR-11), off-map from the
// bestiary (PR-13), oversize maps (PR-16), wall chains, wall kinds and door locks
// (PR-20/21/22), scene conditions (PR-31) and the palette synonyms (PR-07/15/41).
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { canControlActor } from "../character-access.mjs";
import { esc, icon } from "../ui.mjs";
import { register as registerFog } from "../fog-vision.mjs";
import { register as registerRegions } from "../regions.mjs";
import { register as registerSceneAssets } from "../scene-assets.mjs";
import * as D from "../scene-assets-domain.mjs";
import * as LV from "../scene-levels.mjs";
import * as RD from "../regions-domain.mjs";
import { renderPanel } from "../scene-assets-table.mjs";
import {
  renderPreparation,
  normalizeTypedName,
  sameTypedName,
  editorTab,
  resetPreparationDraft,
} from "../preparation.mjs";
import {
  resetPrepUI,
  stageFromBestiary,
  oversizeError,
  fileSizeText,
  noteUndoable,
  sceneUndoLabel,
} from "../scene-assets-prep.mjs";
import {
  createSpatialDraft,
  placeSegment,
  wallTypeFlags,
  cleanLock,
  addSpatialShape,
  dropForeignChain,
} from "../spatial-editor.mjs";
import { barrierType } from "../fog-vision-domain.mjs";
import * as FV from "../fog-vision-domain.mjs";

const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};
function harness({ role = "dm", lang = "it" } = {}) {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  registry.use("fog-vision", registerFog);
  registry.use("regions", registerRegions);
  registry.use("scene-assets", registerSceneAssets);
  const store = createStore({ storage: memory() });
  registry.initState(store.state);
  const toasts = [];
  const navigations = [];
  let undoLabel = "";
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    view: { page: "preparation", id: "", tab: "" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object" ? (value[ctx.lang] ?? value.it) : String(value ?? ""),
    esc,
    icon,
    toasts,
    navigations,
    toast: (text, error = false) => toasts.push({ text, error }),
    render: () => {},
    navigate: (page, params = {}) => navigations.push({ page, params }),
    dialog: () => {},
    closeDialog: () => {},
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    undoLabel: () => undoLabel,
    commit(label, mutator, options = {}) {
      const before = store.state;
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
      });
      registry.emitStateEvents(before, store.state);
      undoLabel = label;
      return { applied: true, persisted: true };
    },
    undo() {
      store.undo(ctx.role);
    },
    registry,
  };
  registry.attach(ctx);
  resetPrepUI();
  resetPreparationDraft();
  return { ctx, store, registry };
}
const sceneOf = (ctx, id) => ctx.state.scenes.find((s) => s.id === id);

// ------------------------------------------------------------------ PR-05 typed name

test("PR-05: the typed scene name ignores typographic quotes, dashes, spacing and case", () => {
  const name = "Cima dell’osservatorio — copia";
  assert.equal(sameTypedName("Cima dell'osservatorio - copia", name), true, "ASCII ' and -");
  assert.equal(sameTypedName("  cima  DELL'osservatorio – copia ", name), true);
  assert.equal(sameTypedName("Cima dell’osservatorio — copia", name), true, "the exact name");
  assert.equal(sameTypedName("Cima dell'osservatori - copia", name), false, "a missing letter");
  assert.equal(sameTypedName("", name), false, "empty never matches");
  assert.equal(normalizeTypedName("«Rovine»  “nord”"), '"rovine" "nord"');
});

test("PR-05: the list offers Undo only for a scene change, never for another last change", () => {
  const { ctx } = harness();
  ctx.commit("Riposo aggiornato", () => {});
  assert.equal(sceneUndoLabel(ctx), "");
  noteUndoable("Scena eliminata");
  ctx.commit("Scena eliminata", () => {});
  assert.equal(sceneUndoLabel(ctx), "Scena eliminata");
  const html = renderPreparation(ctx);
  assert.match(html, /data-sa-undo/);
  const command = ctx.registry.get("command", "scene-assets.undo", ctx);
  assert.equal(command.shortcut, "Mod+Z");
  assert.equal(command.context, "preparation");
});

// ------------------------------------------------------------------ PR-03/06/08…15 one place

test("PR-06: one scene list with folders, breadcrumb, archive and search; no separate section", () => {
  const { ctx, registry } = harness();
  // A section of another group, so the strip shows its group tabs as in the app.
  registry.use("p7-probe", (area) =>
    area.add("preparation-section", {
      id: "p7-probe",
      group: "encounters",
      label: { it: "Prova", en: "Probe" },
      render: () => "",
    }),
  );
  const html = renderPreparation(ctx);
  assert.doesNotMatch(html, /data-prep-section="scene-assets"/);
  assert.doesNotMatch(html, /Scene avanzate/);
  assert.match(html, /data-sa-open-folder="ch1"/, "folders of the page menu");
  assert.match(html, /class="sa-crumbs"/, "breadcrumb");
  assert.match(html, /data-sa-archive-view/, "archive");
  assert.match(html, /data-sa-search/, "search in every folder");
  assert.match(html, /data-sa-new-folder/);
  assert.match(html, /data-prep-new/, "«Nuova scena» stays the one create button");
  // The Scenes tab count is the number of scenes, not of sub-sections.
  const count = html.match(/data-prep-group="scenes"[^>]*>Scene <span class="prep-group-count"[^>]*>(\d+)</);
  assert.equal(Number(count?.[1]), ctx.state.scenes.length);
  // A search hit on a folder opens the one list in that folder.
  ctx.view = { page: "preparation", id: "folder:ch1-tower", tab: "" };
  const folder = renderPreparation(ctx);
  assert.match(folder, /data-sa-crumb="ch1-tower"/);
  assert.match(folder, /data-prep-open="lantern-tower-top"/);
  // Each row's menu moves, duplicates with objects and archives.
  assert.match(folder, /data-sa-move-scene="lantern-tower-top"/);
  assert.match(folder, /data-sa-archive="lantern-tower-top"/);
});

test("PR-03/08/09/10/13: the one editor has Oggetti, Livelli, Varianti and the grid alignment", () => {
  const { ctx } = harness();
  ctx.view = { page: "preparation", id: "forest-clearing", tab: "edit" };
  const edit = renderPreparation(ctx);
  for (const tab of ["edit", "objects", "levels", "variants", "preview"])
    assert.match(edit, new RegExp(`data-prep-view="${tab}"`), tab);
  assert.match(edit, /data-prep-align/, "«Allinea la griglia» inside «Griglia e misure»");
  ctx.view.tab = "objects";
  const objects = renderPreparation(ctx);
  assert.match(objects, /data-sa-canvas/);
  assert.match(objects, /data-sa-sticker="tree"/, "sticker browser in the editor");
  assert.match(objects, /data-sa-stage-new/, "off-map staging in the editor");
  assert.match(objects, /id="sa-prefab-title"/, "prefabs in the editor");
  ctx.view.tab = "levels";
  assert.match(renderPreparation(ctx), /data-sa-stack-new/);
  ctx.view.tab = "variants";
  assert.match(renderPreparation(ctx), /data-sa-variant-form/);
  ctx.view.tab = "grid";
  const grid = renderPreparation(ctx);
  assert.match(grid, /Allinea la griglia alla mappa/);
  assert.match(grid, /class="active" data-prep-view="edit"/, "alignment keeps Modifica active");
  assert.match(grid, /data-sa-canvas[^>]*is-aligning|is-aligning[^>]*data-sa-canvas/);
  // The old route of the removed section lands on the editor's Oggetti tab.
  assert.equal(editorTab({ tab: "scene-assets" }), "objects");
});

test("PR-07/15/41: palette synonyms for theatre of the mind, dd2vtt and «Crea PNG»", () => {
  const { ctx, registry } = harness();
  const text = (id) => {
    const c = registry.get("command", id, ctx);
    return `${ctx.label(c.label)} ${ctx.label(c.description)}`.toLowerCase();
  };
  assert.match(text("scene-assets.import-uvtt"), /dd2vtt/);
  assert.match(text("scene-assets.create-npc"), /crea png/);
  assert.match(text("scene-assets.create-npc"), /nuovo png/);
  assert.ok(registry.get("command", "regions.scene-conditions", ctx));
  assert.match(text("regions.scene-conditions"), /bufera/);
});

// ------------------------------------------------------------------ PR-09 basements

test("PR-09: a basement at −3 m sorts below the ground floor and is reached with «▼ Piano sotto»", () => {
  const { ctx } = harness();
  let stack;
  ctx.commit("building", (s) => {
    stack = LV.createStack(s, "dm", "old-watch", { name: "Osservatorio" });
    LV.addFloor(s, "dm", stack.id, { sceneId: "old-watch-crypt", name: "Cripta", elevation: -3 });
  });
  const found = LV.stackOf(ctx.state, "old-watch");
  assert.deepEqual(
    found.floors.map((f) => [f.sceneId, f.elevation]),
    [
      ["old-watch-crypt", -3],
      ["old-watch", 0],
    ],
  );
  assert.equal(found.index, 1, "the ground floor is above the basement");
  const panel = renderPanel(ctx, {
    scene: sceneOf(ctx, "old-watch"),
    selectedActorId: "livia",
    mode: "move",
    zoom: 1,
    pan: { x: 0, y: 0 },
  });
  assert.match(panel, /data-sa-step="1"[^>]*disabled/, "no floor above");
  assert.doesNotMatch(panel, /data-sa-step="-1"[^>]*disabled/, "the basement below");
  assert.match(panel, /−3 m|-3 m/);
  ctx.commit("down", (s) => LV.stepFloor(s, "dm", -1));
  assert.equal(ctx.state.activeSceneId, "old-watch-crypt");
});

// ------------------------------------------------------------------ PR-11 prefab locks

test("PR-11: inserting a prefab keeps each object's lock (Owlbear Prefabs)", () => {
  const { ctx } = harness();
  ctx.commit("lock", (s) =>
    D.updateProps(s, "dm", "forest-clearing", ["fc-tree-1"], { locked: true }),
  );
  let prefab;
  ctx.commit("prefab", (s) => {
    prefab = D.createPrefab(s, "dm", "forest-clearing", ["fc-tree-1", "fc-tree-2"], {
      name: "Boschetto",
    });
  });
  assert.deepEqual(
    prefab.props.map((p) => p.locked),
    [true, false],
  );
  let inserted;
  ctx.commit("insert", (s) => {
    inserted = D.insertPrefab(s, "dm", prefab.id, "old-watch", { x: 500, y: 300 });
  });
  assert.deepEqual(
    inserted.props.map((p) => p.locked),
    [true, false],
  );
});

// ------------------------------------------------------------------ PR-13 bestiary

test("PR-13: a creature from the bestiary waits off the map, hidden from players", () => {
  const { ctx } = harness();
  const id = stageFromBestiary(ctx, "old-watch", "srd2024:creature:cat");
  assert.ok(id);
  const actor = ctx.state.actors[id];
  assert.equal(actor.kind, "npc");
  assert.match(actor.name, /Gatto/);
  const staged = D.stagedOn(ctx.state, "old-watch", "dm");
  assert.ok(staged.some((row) => row.actorId === id));
  assert.equal(D.stagedOn(ctx.state, "old-watch", "player").length, 0);
  assert.ok(!sceneOf(ctx, "old-watch").tokens.some((t) => t.actorId === id), "not on the map");
});

// ------------------------------------------------------------------ PR-16 oversize

test("PR-16: an oversized map names its weight and the limit and offers WebP", () => {
  const error = oversizeError({ name: "mappa.png", size: 4.3 * 1024 * 1024 });
  assert.match(error.it, /4,3 MB/);
  assert.match(error.it, /1 MB/);
  assert.match(error.it, /WebP/);
  assert.match(error.en, /4\.3 MB/);
  assert.equal(error.code, "size");
  assert.equal(fileSizeText(512 * 1024, "it"), "512 KB");
});

// ------------------------------------------------------------------ PR-21/22 walls

const blank = () => ({
  id: "s",
  width: 1000,
  height: 650,
  gridSize: 50,
  metersPerCell: 1.5,
  walls: [],
  terrain: [],
});
test("PR-21: each click continues the wall from the last point until the same point or Escape", () => {
  const scene = blank();
  const ui = createSpatialDraft();
  ui.tool = "wall";
  placeSegment(scene, ui, { x: 100, y: 100 }, { x: 300, y: 100 });
  assert.deepEqual(ui.anchor, { x: 300, y: 100 }, "the chain continues from the end");
  placeSegment(scene, ui, ui.anchor, { x: 300, y: 300 });
  placeSegment(scene, ui, ui.anchor, { x: 100, y: 300 });
  assert.equal(scene.walls.length, 3);
  assert.deepEqual(scene.walls[1].a, { x: 300, y: 100 }, "joined to the previous piece");
  // A double-click clicks the same point again: the chain ends, nothing is added.
  placeSegment(scene, ui, ui.anchor, { x: 101, y: 301 });
  assert.equal(scene.walls.length, 3);
  assert.equal(ui.anchor, null);
  assert.equal(ui.tool, "wall", "the tool stays selected (Foundry)");
  // A dragged piece stands alone; Ctrl/Cmd chains it, also for doors.
  placeSegment(scene, ui, { x: 500, y: 100 }, { x: 600, y: 100 }, { drag: true });
  assert.equal(ui.anchor, null);
  ui.tool = "door";
  placeSegment(scene, ui, { x: 500, y: 200 }, { x: 560, y: 200 }, { drag: true, ctrl: true });
  assert.deepEqual(ui.anchor, { x: 560, y: 200 });
  // Another tool never inherits the chain.
  ui.tool = "difficult";
  dropForeignChain(ui);
  assert.equal(ui.anchor, null);
});

test("PR-22: a new wall takes the chosen kind, with the flags of the Table's barriers", () => {
  const scene = blank();
  const ui = createSpatialDraft();
  ui.tool = "wall";
  for (const [type, flags] of [
    ["window", { blocksMovement: true, blocksSight: false, blocksEffect: true }],
    ["illusory", { blocksMovement: false, blocksSight: true, blocksEffect: false }],
    ["invisible", { blocksMovement: true, blocksSight: false, blocksEffect: false }],
  ]) {
    ui.wallType = type;
    const wall = placeSegment(scene, ui, { x: 10, y: 10 + scene.walls.length * 20 }, { x: 200, y: 10 + scene.walls.length * 20 }, { drag: true });
    assert.deepEqual(
      { blocksMovement: wall.blocksMovement, blocksSight: wall.blocksSight, blocksEffect: wall.blocksEffect },
      flags,
      type,
    );
    assert.equal(barrierType(wall), type);
  }
  ui.wallType = "one-way";
  const oneWay = placeSegment(scene, ui, { x: 10, y: 400 }, { x: 200, y: 400 }, { drag: true });
  assert.equal(oneWay.blockSide, "right");
  assert.equal(barrierType(oneWay), "one-way");
  assert.deepEqual(wallTypeFlags("nonsense"), wallTypeFlags("wall"));
});

// ------------------------------------------------------------------ PR-20 door locks

test("PR-20: a lock has a DC, a check, a key and a cost; the key opens it without a roll", () => {
  assert.equal(cleanLock({ dc: "", key: "" }), null);
  assert.deepEqual(cleanLock({ dc: "15", check: "lockpick", key: " Chiave di ferro ", cost: "bonus" }), {
    dc: 15,
    check: "lockpick",
    key: "Chiave di ferro",
    cost: "bonus",
  });
  assert.throws(() => cleanLock({ dc: 40 }), (e) => /5 a 30/.test(e.it));
  const { ctx } = harness({ role: "player" });
  // The tower's stair door is locked in the example: give it a lock and bring Mira next to it.
  ctx.commit("setup", (s) => {
    s.activeSceneId = "lantern-tower";
    const scene = s.scenes.find((x) => x.id === "lantern-tower");
    const door = scene.walls.find((w) => w.id === "tower-stair-door");
    door.lock = { dc: 12, check: "both", key: "Chiave della torre", cost: "action" };
    const mid = { x: (door.a.x + door.b.x) / 2, y: (door.a.y + door.b.y) / 2 };
    const token = scene.tokens.find((t) => t.actorId === "mira");
    if (token) Object.assign(token, { x: mid.x + 10, y: mid.y + 10 });
    else scene.tokens.push({ id: "t-mira", actorId: "mira", x: mid.x + 10, y: mid.y + 10 });
  });
  const near = RD.lockedDoorsNear(ctx.state, "mira", "player");
  assert.equal(near.length, 1);
  assert.equal(near[0].lock.dc, 12);
  assert.equal(near[0].hasKey, false);
  assert.throws(() =>
    ctx.commit("key", (s) => RD.openLock(s, { actorId: "mira", doorId: "tower-stair-door", method: "key" }, "player")),
  );
  let check;
  ctx.commit("pick", (s) => {
    check = RD.openLock(
      s,
      { actorId: "mira", doorId: "tower-stair-door", method: "lockpick", mode: "digital", rng: () => 20 },
      "player",
    );
  });
  assert.equal(check.success, true);
  assert.equal(check.dc, 12);
  const door = sceneOf(ctx, "lantern-tower").walls.find((w) => w.id === "tower-stair-door");
  assert.equal(door.doorState, "closed", "unlocked, still closed");
  // With the key in the inventory the door unlocks without a roll.
  ctx.commit("relock", (s) => {
    s.scenes.find((x) => x.id === "lantern-tower").walls.find((w) => w.id === "tower-stair-door").doorState = "locked";
    s.actors.mira.inventory.push({ id: "k1", name: { it: "Chiave della torre", en: "Tower key" }, quantity: 1, weight: 0, kind: "gear" });
  });
  assert.equal(RD.lockedDoorsNear(ctx.state, "mira", "player")[0].hasKey, true);
  ctx.commit("key", (s) =>
    RD.openLock(s, { actorId: "mira", doorId: "tower-stair-door", method: "key" }, "player"),
  );
  assert.equal(
    sceneOf(ctx, "lantern-tower").walls.find((w) => w.id === "tower-stair-door").doorState,
    "closed",
  );
});

test("PR-20: a door keeps its lock through the scene editor's shapes", () => {
  const scene = blank();
  const ui = createSpatialDraft();
  const door = addSpatialShape(scene, ui, "door", { x: 10, y: 10 }, { x: 60, y: 10 });
  assert.equal(door.kind, "door");
  assert.equal(door.doorState, "closed");
});

// ------------------------------------------------------------------ PR-31 scene conditions

test("PR-31: «Condizioni della scena» adds a map-wide hazard acting at each turn start", () => {
  const { ctx } = harness();
  const scene = sceneOf(ctx, "old-watch");
  let region;
  ctx.commit("blizzard", (s) => {
    region = RD.createRegion(s, RD.sceneConditionInput(scene, "blizzard", "it"), "dm");
  });
  assert.deepEqual(region.shape, { x: 0, y: 0, width: scene.width, height: scene.height });
  assert.equal(region.trigger.event, "turn-start");
  assert.equal(region.trigger.who, "all");
  assert.equal(region.kind, "hazard");
  assert.deepEqual(region.actions[0].dice, { count: 1, sides: 4, bonus: 0 });
  assert.equal(region.actions[0].damageType, "cold");
  assert.match(region.name, /Bufera/);
  const custom = RD.sceneConditionInput(scene, "custom", "en");
  assert.deepEqual(custom.actions, []);
  assert.match(custom.name, /Scene condition/);
});

// ------------------------------------------------------------------ PR-23/25 lights and time

test("PR-23: the scene editor's «Luci» tab lists and places the scene's lights", () => {
  const { ctx } = harness();
  ctx.view = { page: "preparation", id: "forest-clearing", tab: "lights" };
  const before = FV.sceneConfig(ctx.state, "forest-clearing").lights.length;
  const html = renderPreparation(ctx);
  assert.match(html, /data-prep-view="lights"/);
  assert.match(html, /class="active" data-prep-view="lights"/);
  assert.match(html, /data-pl-canvas/);
  assert.match(html, /data-pl-preset/);
  assert.match(html, /Posa al centro/);
  assert.match(html, /Le luci restano tue finché non attivi la scena/);
  ctx.commit("light", (s) => FV.addLight(s, "dm", "forest-clearing", { preset: "torch", x: 300, y: 300 }));
  assert.equal(FV.sceneConfig(ctx.state, "forest-clearing").lights.length, before + 1);
  assert.match(renderPreparation(ctx), /data-pl-light="/);
  ctx.lang = "en";
  assert.match(renderPreparation(ctx), /Place in the centre/);
});

test("PR-25: the time of day follows the narrative clock; colour and intensity of the night", () => {
  const { ctx } = harness();
  assert.equal(FV.phaseAtHour(8), "day");
  assert.equal(FV.phaseAtHour(18.5), "dusk");
  assert.equal(FV.phaseAtHour(20), "night");
  assert.equal(FV.phaseAtHour(3), "night");
  assert.equal(FV.phaseAtHour(6), "dawn");
  ctx.commit("follow", (s) => FV.setSceneOptions(s, "dm", "old-watch", { followTime: true }));
  const hour = FV.narrativeHour(ctx.state);
  assert.equal(FV.effectivePhase(ctx.state, "old-watch"), FV.phaseAtHour(hour));
  // Twelve hours later the scene shows the other half of the day, with nobody touching it.
  ctx.commit("clock", (s) => {
    s.restTime ??= { version: 1, clocks: {}, rests: [], rolls: [], events: [] };
    const id = s.campaign.id;
    s.restTime.clocks[id] ??= { seconds: 0, revision: 0 };
    s.restTime.clocks[id].seconds += 12 * 3600;
  });
  assert.equal(FV.effectivePhase(ctx.state, "old-watch"), FV.phaseAtHour(hour + 12));
  assert.notEqual(FV.effectivePhase(ctx.state, "old-watch"), FV.phaseAtHour(hour));
  // A manual step takes the scene off the clock.
  ctx.commit("next", (s) => FV.advancePhase(s, "dm", "old-watch"));
  assert.equal(FV.sceneConfig(ctx.state, "old-watch").followTime, false);
  ctx.commit("tint", (s) =>
    FV.setSceneOptions(s, "dm", "old-watch", { ambientTint: "#0b1b3f", ambientIntensity: "125" }),
  );
  assert.equal(FV.sceneConfig(ctx.state, "old-watch").ambientTint, "#0b1b3f");
  assert.equal(FV.sceneConfig(ctx.state, "old-watch").ambientIntensity, 125);
  assert.throws(() =>
    ctx.commit("bad", (s) => FV.setSceneOptions(s, "dm", "old-watch", { ambientIntensity: 300 })),
  );
});

// ------------------------------------------------------------------ BI-33 drop on the map

test("BI-33: a token image dropped on the map becomes a token there; a prop image an object", async () => {
  const { register: registerMedia } = await import("../media.mjs");
  const { placeDroppedToken, placeDroppedProp } = await import("../media-table.mjs");
  const { ctx, registry } = harness();
  registry.use("media", registerMedia);
  registry.initState(ctx.state);
  const scene = sceneOf(ctx, "old-watch");
  const goblin = ctx.state.ext.media.assets.find((a) => a.id === "m-goblin");
  const id = placeDroppedToken(ctx, scene, goblin, { x: 420, y: 310 });
  const token = sceneOf(ctx, "old-watch").tokens.find((t) => t.actorId === id);
  assert.ok(token, "a token where the image was dropped");
  assert.ok(Math.abs(token.x - 420) <= 25 && Math.abs(token.y - 310) <= 25);
  assert.equal(ctx.state.actors[id].kind, "npc");
  const letter = ctx.state.ext.media.assets.find((a) => a.id === "m-letter");
  const prop = placeDroppedProp(ctx, sceneOf(ctx, "old-watch"), letter, { x: 600, y: 200 });
  assert.equal(prop.assetId, "m-letter");
  assert.deepEqual([prop.x, prop.y], [600, 200]);
  assert.ok(D.sliceOf(ctx.state).props["old-watch"].some((row) => row.id === prop.id));
});

// ------------------------------------------------------------------ PR-12 one outliner

test("PR-12: one list of objects, tokens, walls, doors and lights with bulk actions", () => {
  const { ctx } = harness();
  const all = D.sceneElements(ctx.state, "lantern-tower");
  const kinds = new Set(all.map((r) => r.kind));
  for (const k of ["token", "wall", "door", "light"]) assert.ok(kinds.has(k), k);
  const doors = D.sceneElements(ctx.state, "lantern-tower", { kind: "door" });
  assert.ok(doors.length >= 2);
  ctx.commit("doors", (s) =>
    D.bulkEditElements(s, "dm", "lantern-tower", doors, "door-open"),
  );
  assert.ok(
    sceneOf(ctx, "lantern-tower").walls.filter((w) => w.kind === "door").every((w) => w.doorState === "open"),
  );
  const lights = D.sceneElements(ctx.state, "lantern-tower", { kind: "light" });
  ctx.commit("off", (s) => D.bulkEditElements(s, "dm", "lantern-tower", lights, "off"));
  assert.ok(FV.sceneConfig(ctx.state, "lantern-tower").lights.every((l) => l.on === false));
  const tokens = D.sceneElements(ctx.state, "lantern-tower", { kind: "token" }).slice(0, 1);
  ctx.commit("hide", (s) => D.bulkEditElements(s, "dm", "lantern-tower", tokens, "hide"));
  assert.equal(sceneOf(ctx, "lantern-tower").tokens.find((t) => t.id === tokens[0].id).hidden, true);
  assert.throws(() =>
    ctx.commit("x", (s) => D.bulkEditElements(s, "dm", "lantern-tower", tokens, "on")),
  );
  assert.throws(() =>
    ctx.commit("x", (s) => D.bulkEditElements(s, "player", "lantern-tower", tokens, "show")),
  );
  ctx.view = { page: "preparation", id: "lantern-tower", tab: "objects" };
  const html = renderPreparation(ctx);
  assert.match(html, /Elenco della scena/);
  assert.match(html, /data-sa-kind="door"/);
  assert.match(html, /data-sa-pick="door:tower-stair-door"/);
});
