// B47: advanced scenes. Domain rules (folders and archive, variants, levels and stairs,
// objects with lock/visibility/roof fade, bulk edit and outliner, prefabs, off-map area,
// starting and saved views, grid alignment) and the area's contributions and handlers
// through the real registry and store, for the DM and the player.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { canControlActor } from "../character-access.mjs";
import { esc, icon } from "../ui.mjs";
import { validateSceneGeometry } from "../spatial.mjs";
import { validateSceneDraft } from "../preparation.mjs";
import { register as registerFog } from "../fog-vision.mjs";
import * as FV from "../fog-vision-domain.mjs";
import { register } from "../scene-assets.mjs";
import * as D from "../scene-assets-domain.mjs";
import * as LV from "../scene-levels.mjs";
import { searchStickers, STICKERS } from "../scene-assets-art.mjs";
import { usagesOf } from "../media-domain.mjs";
import { register as registerMedia } from "../media.mjs";
import {
  mapLayerSvg,
  roofLayerSvg,
  offMapLayerSvg,
  renderPanel,
  actions,
  tableUI,
  resetTableUI,
  stairsMenuTargets,
} from "../scene-assets-table.mjs";
import { renderPrep, prepActions, ui as prepUI, resetPrepUI } from "../scene-assets-prep.mjs";

const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};
function harness({ role = "dm", lang = "it", fog = true, media = false } = {}) {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  if (fog) registry.use("fog-vision", registerFog);
  if (media) registry.use("media", registerMedia);
  registry.use("scene-assets", register);
  const store = createStore({ storage: memory() });
  registry.initState(store.state);
  const toasts = [];
  const dialogs = [];
  const navigations = [];
  let renders = 0;
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    view: { page: "preparation", id: "", tab: D.ID },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object" ? (value[ctx.lang] ?? value.it) : String(value ?? ""),
    esc,
    icon,
    toasts,
    dialogs,
    navigations,
    get renders() {
      return renders;
    },
    toast: (text, error = false) => toasts.push({ text, error }),
    render: () => renders++,
    navigate: (page, params = {}) => navigations.push({ page, params }),
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
  resetTableUI();
  resetPrepUI();
  return { ctx, store, registry };
}
const sceneOf = (ctx, id) => ctx.state.scenes.find((s) => s.id === id);
const slice = (ctx) => D.sliceOf(ctx.state);
const tv = (ctx, id = ctx.state.activeSceneId) => ({
  scene: sceneOf(ctx, id),
  selectedActorId: "livia",
  mode: "move",
  zoom: 1,
  pan: { x: 0, y: 0 },
});
function fakeTable(ctx, view = { zoom: 1, pan: { x: 0, y: 0 } }) {
  const table = {
    get scene() {
      return sceneOf(ctx, ctx.state.activeSceneId);
    },
    view: structuredClone(view),
    views: [],
    setView(next) {
      table.view = structuredClone(next);
      table.views.push(structuredClone(next));
    },
    point: (e) => e.p,
  };
  return table;
}
const refusal = (fn, pattern) =>
  assert.throws(fn, (error) => {
    assert.ok(error.it && error.en, "a refusal carries both languages");
    if (pattern) assert.match(error.en, pattern);
    return true;
  });

// ------------------------------------------------------------------------------ seed

test("the area seeds its scenes once, with valid geometry, folders, variants and objects", () => {
  const { ctx, registry, store } = harness();
  // The core's own sample scenes come first (their number is the sample data's, R4 TV-52
  // adds the road ambush); this area appends its three scenes once, in this order.
  const ids = ctx.state.scenes.map((s) => s.id);
  const core = createStore({ storage: null }).state.scenes.map((s) => s.id);
  assert.deepEqual(ids, [...core, "lantern-tower", "forest-clearing", "lantern-tower-top"]);
  assert.equal(core[0], "old-watch");
  for (const scene of ctx.state.scenes) {
    assert.deepEqual(validateSceneGeometry(scene), [], scene.id);
    assert.deepEqual(validateSceneDraft(scene), [], scene.id);
  }
  const value = slice(ctx);
  assert.deepEqual(
    value.folders.map((f) => [f.id, f.parentId]),
    [
      ["ch1", null],
      ["ch1-tower", "ch1"],
      ["ch2", null],
    ],
  );
  assert.equal(D.sceneFolder(ctx.state, "lantern-tower-top"), "ch1-tower");
  assert.deepEqual(
    D.folderPath(ctx.state, "ch1-tower").map((p) => p.name),
    ["Capitolo 1 · L’osservatorio", "La torre"],
  );
  assert.deepEqual(
    D.variantsOf(ctx.state, "old-watch").list.map((v) => [v.id, v.active]),
    [
      ["day", true],
      ["night", false],
    ],
  );
  const trees = value.props["forest-clearing"].filter((p) => p.sticker === "tree");
  assert.equal(trees.length, 5, "five trees for the bulk edit");
  const trap = value.props["forest-clearing"].find((p) => p.id === "fc-trap");
  assert.equal(trap.hidden && trap.locked, true);
  assert.equal(value.prefabs[0].name, "Accampamento goblin");
  assert.equal(value.staged["forest-clearing"][0].actorId, "goblin-1");
  // The tower: B35 ground floor + upper floor, joined by the spiral stair.
  const found = LV.stackOf(ctx.state, "lantern-tower-top");
  assert.deepEqual(
    found.floors.map((f) => [f.sceneId, f.elevation]),
    [
      ["lantern-tower", 0],
      ["lantern-tower-top", 6],
    ],
  );
  // "Someone lit the lantern on the tower again": the upper floor's B35 light.
  assert.equal(FV.sceneConfig(ctx.state, "lantern-tower-top").lights[0].name, "La grande lanterna");
  // A reload never adds anything twice; normalize keeps the data.
  registry.initState(store.state);
  assert.equal(ctx.state.scenes.filter((s) => s.id === "forest-clearing").length, 1);
  assert.deepEqual(D.normalizeSlice(structuredClone(value), 1), value);
  assert.throws(() => D.normalizeSlice({}, 99));
  assert.deepEqual(D.normalizeSlice(null, 0).folders, []);
});

test("without the fog area the tower's upper floor is not invented", () => {
  const { ctx } = harness({ fog: false });
  assert.equal(sceneOf(ctx, "lantern-tower-top"), undefined);
  assert.equal(LV.stackOf(ctx.state, "lantern-tower"), null);
  assert.ok(sceneOf(ctx, "forest-clearing"));
});

// ------------------------------------------------------------------------------ folders

test("folders: nest, breadcrumb, move without cycles, delete moves contents up; DM only", () => {
  const { ctx } = harness();
  let folder;
  ctx.commit("f", (s) => {
    folder = D.createFolder(s, "dm", { name: "Mappe di riserva", parentId: "ch2" });
  });
  ctx.commit("m", (s) => D.moveScene(s, "dm", "forest-clearing", folder.id));
  assert.deepEqual(
    D.folderPath(ctx.state, D.sceneFolder(ctx.state, "forest-clearing")).map((p) => p.name),
    ["Capitolo 2 · Il bosco di Bruma", "Mappe di riserva"],
  );
  assert.equal(D.folderCount(ctx.state, "ch2"), 1, "counts at any depth");
  refusal(() => ctx.commit("x", (s) => D.moveFolder(s, "dm", "ch2", folder.id)), /inside itself/);
  refusal(() => ctx.commit("x", (s) => D.createFolder(s, "player", { name: "X" })), /Only the DM/);
  refusal(() => ctx.commit("x", (s) => D.createFolder(s, "dm", { name: "  " })));
  ctx.commit("d", (s) => D.deleteFolder(s, "dm", "ch2"));
  assert.equal(slice(ctx).folders.find((f) => f.id === folder.id).parentId, null);
  assert.equal(D.sceneFolder(ctx.state, "forest-clearing"), folder.id, "nothing is lost");
  const root = D.folderContents(ctx.state, null);
  assert.deepEqual(
    root.folders.map((f) => f.name),
    ["Capitolo 1 · L’osservatorio", "Mappe di riserva"],
  );
});

test("search looks in every folder but never in the archive; archive and restore", () => {
  const { ctx } = harness();
  assert.deepEqual(
    D.searchScenes(ctx.state, "radura").map((r) => [r.scene.id, r.path.map((p) => p.id)]),
    [["forest-clearing", ["ch2"]]],
  );
  ctx.commit("a", (s) => D.archiveScene(s, "dm", "forest-clearing", "2026-09-25T10:00:00.000Z"));
  assert.equal(sceneOf(ctx, "forest-clearing"), undefined, "it leaves the scene list");
  assert.deepEqual(D.searchScenes(ctx.state, "radura"), []);
  assert.equal(D.archivedScenes(ctx.state, "radura")[0].path[0].id, "ch2");
  // Its objects wait, keyed by scene, for the restore.
  assert.equal(slice(ctx).props["forest-clearing"].length > 0, true);
  ctx.commit("r", (s) => D.restoreScene(s, "dm", "forest-clearing"));
  assert.ok(sceneOf(ctx, "forest-clearing"));
  assert.equal(D.sceneFolder(ctx.state, "forest-clearing"), "ch2");
  refusal(() => ctx.commit("x", (s) => D.archiveScene(s, "dm", "old-watch")), /at the Table/);
  refusal(() => ctx.commit("x", (s) => D.archiveScene(s, "dm", "lantern-tower-top")), /floor/);
  refusal(() => ctx.commit("x", (s) => D.archiveScene(s, "player", "forest-clearing")));
  // Undo corrects an archive like any other change.
  ctx.commit("a", (s) => D.archiveScene(s, "dm", "forest-clearing"));
  ctx.undo();
  assert.ok(sceneOf(ctx, "forest-clearing"));
});

// ------------------------------------------------------------------------------ variants

test("a variant changes only the look: walls, tokens, pins and lights stay", () => {
  const { ctx } = harness();
  const before = structuredClone(sceneOf(ctx, "old-watch"));
  ctx.commit("v", (s) => D.switchVariant(s, "dm", "old-watch", "night"));
  const night = sceneOf(ctx, "old-watch");
  assert.match(night.background, /^data:image\/webp;base64,/);
  assert.equal(night.template, "blank");
  for (const key of ["id", "tokens", "walls", "gridSize", "width", "height", "name"])
    assert.deepEqual(night[key], before[key], key);
  // The day look is kept in its variant, then comes back exactly.
  ctx.commit("v", (s) => D.switchVariant(s, "dm", "old-watch", "day"));
  assert.equal(sceneOf(ctx, "old-watch").background, null);
  assert.equal(sceneOf(ctx, "old-watch").template, "courtyard");
  refusal(() => ctx.commit("x", (s) => D.deleteVariant(s, "dm", "old-watch", "day")), /in use/);
  refusal(() => ctx.commit("x", (s) => D.switchVariant(s, "player", "old-watch", "night")));
  refusal(() =>
    ctx.commit("x", (s) =>
      D.addVariant(s, "dm", "old-watch", {
        name: "Rotto",
        look: { background: "data:text/plain;base64,AA" },
      }),
    ),
  );
  refusal(
    () =>
      ctx.commit("x", (s) =>
        D.addVariant(s, "dm", "old-watch", { name: "notte", look: { template: "camp" } }),
      ),
    /already exists/,
  );
  ctx.commit("v", (s) =>
    D.addVariant(s, "dm", "old-watch", { name: "Crollo", look: { template: "camp" }, id: "fall" }),
  );
  ctx.commit("v", (s) => D.switchVariant(s, "dm", "old-watch", "fall"));
  assert.equal(sceneOf(ctx, "old-watch").template, "camp");
  ctx.undo();
  assert.equal(sceneOf(ctx, "old-watch").template, "courtyard", "Undo restores the look");
});

// ------------------------------------------------------------------------------ levels

test("floors: the stair sends a token up with or without the Table's view; DM discretion", () => {
  const { ctx } = harness();
  ctx.commit("activate", (s) => {
    s.activeSceneId = "lantern-tower";
  });
  const on = LV.tokensOnStairs(ctx.state, "lantern-tower");
  assert.deepEqual(
    on.map((r) => [r.actorId, r.targets[0].sceneId, r.targets[0].direction]),
    [["goblin-1", "lantern-tower-top", "up"]],
  );
  // The player cannot move the DM's sentinel.
  refusal(
    () =>
      ctx.commit("x", (s) =>
        LV.climb(s, "player", { actorId: "goblin-1", toSceneId: "lantern-tower-top" }),
      ),
    /creature you control/,
  );
  ctx.commit("up", (s) =>
    LV.climb(s, "dm", { actorId: "goblin-1", toSceneId: "lantern-tower-top", follow: true }),
  );
  assert.equal(ctx.state.activeSceneId, "lantern-tower-top", "the Table follows");
  assert.equal(
    sceneOf(ctx, "lantern-tower").tokens.some((t) => t.actorId === "goblin-1"),
    false,
  );
  const arrived = sceneOf(ctx, "lantern-tower-top").tokens.find((t) => t.actorId === "goblin-1");
  assert.deepEqual([arrived.x, arrived.y], [700, 480], "same spot on the stair");
  // Tokens per floor: the party is on the ground floor, out of view.
  assert.deepEqual(
    LV.partyElsewhere(ctx.state).map((r) => [r.actorId, r.floor.sceneId]),
    [
      ["livia", "lantern-tower"],
      ["doran", "lantern-tower"],
      ["mira", "lantern-tower"],
    ],
  );
  // XCOM keys: one floor down, the lowest floor refuses another step.
  ctx.commit("down", (s) => LV.stepFloor(s, "dm", -1));
  assert.equal(ctx.state.activeSceneId, "lantern-tower");
  refusal(() => ctx.commit("x", (s) => LV.stepFloor(s, "dm", -1)), /lowest/);
  refusal(() => ctx.commit("x", (s) => LV.switchFloor(s, "player", "lantern-tower-top")));
});

test("a player takes their own character up the stairs; nobody climbs during combat", () => {
  const { ctx } = harness({ role: "player" });
  ctx.commit(
    "setup",
    (s) => {
      s.activeSceneId = "lantern-tower";
      const livia = s.scenes
        .find((x) => x.id === "lantern-tower")
        .tokens.find((t) => t.actorId === "livia");
      livia.x = 800;
      livia.y = 520;
    },
    {},
  );
  assert.equal(stairsMenuTargets(ctx, { actorId: "livia", sceneId: "lantern-tower" }).length, 1);
  assert.equal(stairsMenuTargets(ctx, { actorId: "goblin-1", sceneId: "lantern-tower" }).length, 0);
  assert.equal(
    actions.climb(ctx, "livia", "lantern-tower-top", { fromSceneId: "lantern-tower" }),
    true,
  );
  assert.equal(ctx.state.activeSceneId, "lantern-tower", "a player never moves the party's view");
  assert.match(ctx.toasts.at(-1).text, /il DM mostra quel piano/);
  assert.equal(LV.floorOfActor(ctx.state, "livia").sceneId, "lantern-tower-top");
  // The player's panel says where Livia is, not in view.
  const html = renderPanel(ctx, tv(ctx));
  assert.match(html, /Livia<\/span><span class="sa-warn">Cella della lanterna · non in vista/);
  assert.doesNotMatch(html, /data-sa-floor=/, "no floor switch for the player");
  ctx.commit("combat", (s) => {
    s.combat.active = true;
  });
  refusal(
    () =>
      LV.climb(structuredClone(ctx.state), "dm", { actorId: "livia", toSceneId: "lantern-tower" }),
    /combat/,
  );
});

test("building editing: footprint, elevations, stairs inside the map", () => {
  const { ctx } = harness();
  let stack;
  ctx.commit("s", (s) => {
    stack = LV.createStack(s, "dm", "forest-clearing", { name: "Radura", floorName: "Terra" });
  });
  refusal(
    () =>
      ctx.commit("x", (s) =>
        LV.addFloor(s, "dm", stack.id, { sceneId: "old-watch", elevation: 0 }),
      ),
    /elevation/,
  );
  const small = D.newSceneRecord({ id: "tiny", name: "Soppalco", width: 500, height: 400 });
  refusal(
    () =>
      ctx.commit("x", (s) =>
        LV.addFloor(s, "dm", stack.id, { create: small, name: "Soppalco", elevation: 3 }),
      ),
    /footprint/,
  );
  ctx.commit("f", (s) =>
    LV.addFloor(s, "dm", stack.id, { sceneId: "old-watch", name: "Sopra", elevation: 3 }),
  );
  refusal(
    () =>
      ctx.commit("x", (s) =>
        LV.addStair(s, "dm", stack.id, {
          x: 1200,
          y: 10,
          floors: ["forest-clearing", "old-watch"],
        }),
      ),
    /inside the map/,
  );
  ctx.commit("st", (s) =>
    LV.addStair(s, "dm", stack.id, {
      name: "Scala",
      x: 500,
      y: 300,
      radius: 60,
      floors: ["forest-clearing", "old-watch"],
    }),
  );
  assert.equal(LV.stairsOn(ctx.state, "old-watch").length, 1);
  ctx.commit("rm", (s) => LV.removeFloor(s, "dm", stack.id, "old-watch"));
  assert.equal(LV.stairsOn(ctx.state, "forest-clearing").length, 0, "its stairs go with it");
});

// ------------------------------------------------------------------------------ objects

test("stickers: locked objects stay put; hidden and off-map objects never reach players", () => {
  const { ctx } = harness();
  refusal(
    () => ctx.commit("x", (s) => D.moveProps(s, "dm", "forest-clearing", ["fc-trap"], 10, 0)),
    /Locked/,
  );
  refusal(
    () => ctx.commit("x", (s) => D.deleteProps(s, "dm", "forest-clearing", ["fc-trap"])),
    /Locked/,
  );
  // The lock and visibility toggles always work.
  ctx.commit("u", (s) => D.updateProps(s, "dm", "forest-clearing", ["fc-trap"], { locked: false }));
  ctx.commit("m", (s) => D.moveProps(s, "dm", "forest-clearing", ["fc-trap"], 10, 0));
  let added;
  ctx.commit("add", (s) => {
    added = D.addProp(s, "dm", "forest-clearing", { sticker: "barrel", x: 1100, y: 100 });
  });
  assert.equal(added.width, 33.3, "1 m at 1,5 m per 50 px cell");
  const players = D.visibleProps(ctx.state, "forest-clearing", "player").map((p) => p.id);
  assert.equal(players.includes("fc-trap"), false, "hidden");
  assert.equal(players.includes(added.id), false, "off the map");
  assert.equal(D.visibleProps(ctx.state, "forest-clearing", "dm").length, players.length + 2);
  refusal(() =>
    ctx.commit("x", (s) =>
      D.addProp(s, "dm", "forest-clearing", { sticker: "tree", x: 5000, y: 0 }),
    ),
  );
  refusal(() =>
    ctx.commit("x", (s) => D.addProp(s, "player", "forest-clearing", { sticker: "tree" })),
  );
  // The player's map layer: no trap, no staged sentinel, no off-map frame.
  const { ctx: player } = harness({ role: "player" });
  player.commit(
    "act",
    (s) => {
      s.activeSceneId = "forest-clearing";
    },
    { local: true },
  );
  const svg = mapLayerSvg(player, tv(player));
  assert.doesNotMatch(svg, /Trappola|sa-offmap-frame/);
  assert.match(svg, /data-sa-prop="fc-tree-1"/);
  assert.equal(offMapLayerSvg(player, tv(player)), "");
});

test("roofs fade while a controlled token stands under them (Roll20 foreground)", () => {
  const { ctx } = harness({ role: "player" });
  ctx.commit("act", (s) => {
    s.activeSceneId = "forest-clearing";
  });
  assert.equal(D.fadedRoofs(ctx.state, "forest-clearing", "player").size, 0);
  assert.match(roofLayerSvg(ctx, tv(ctx)), /data-sa-faded=""/);
  ctx.commit("walk in", (s) => {
    const t = s.scenes
      .find((x) => x.id === "forest-clearing")
      .tokens.find((x) => x.actorId === "livia");
    t.y = 200;
  });
  assert.deepEqual([...D.fadedRoofs(ctx.state, "forest-clearing", "player")], ["fc-hut-roof"]);
  assert.match(
    roofLayerSvg(ctx, tv(ctx)),
    /data-sa-faded="fc-hut-roof"[\s\S]*is-faded" [^>]*style="opacity:0.2"/,
  );
  // A goblin under the roof fades it for the DM, not for the player.
  const { ctx: dm } = harness();
  dm.commit("g", (s) => {
    s.activeSceneId = "forest-clearing";
    s.scenes
      .find((x) => x.id === "forest-clearing")
      .tokens.push({ id: "g", actorId: "goblin-2", x: 700, y: 150 });
  });
  assert.equal(D.fadedRoofs(dm.state, "forest-clearing", "dm").size, 1);
  assert.equal(D.fadedRoofs(dm.state, "forest-clearing", "player").size, 0);
  // Personal switch (Roll20: players toggle the foreground).
  assert.equal(actions.toggleRoofs(ctx), true);
  assert.equal(roofLayerSvg(ctx, tv(ctx)), "");
  assert.equal(D.foregroundHidden(ctx.state, "dm"), false, "only for this identity");
});

test("five trees edited together from the outliner search (Foundry palette, Owlbear outliner)", () => {
  const { ctx } = harness();
  const found = D.outline(ctx.state, "forest-clearing", "dm", "albero");
  assert.equal(found.map.length, 5);
  assert.equal(
    D.outline(ctx.state, "forest-clearing", "dm", "forest").map.length,
    5,
    "English tag",
  );
  const ids = found.map.map((row) => row.id);
  assert.equal(
    prepActions.bulk(ctx, "forest-clearing", ids, {
      width: "4.5",
      rotation: "30",
      visible: "no",
      locked: "",
    }),
    true,
  );
  const trees = slice(ctx).props["forest-clearing"].filter((p) => ids.includes(p.id));
  assert.deepEqual(new Set(trees.map((t) => t.width)), new Set([150]), "4,5 m = 150 px");
  assert.equal(
    trees.every((t) => t.rotation === 30 && t.hidden && t.height === 150),
    true,
  );
  assert.equal(ctx.state.log.at(-1).label, "5 oggetti modificati insieme");
  // A locked tree blocks a geometry change for the group, not a visibility change.
  ctx.commit("lock", (s) => D.updateProps(s, "dm", "forest-clearing", [ids[0]], { locked: true }));
  assert.equal(prepActions.bulk(ctx, "forest-clearing", ids, { width: "3" }), false);
  assert.match(ctx.toasts.at(-1).text, /Bloccato/);
  assert.equal(prepActions.bulk(ctx, "forest-clearing", ids, { visible: "yes" }), true);
  ctx.undo();
  assert.equal(slice(ctx).props["forest-clearing"].find((p) => p.id === ids[1]).hidden, true);
});

// ------------------------------------------------------------------------------ prefabs

test("the Goblin camp prefab goes into another scene; a new prefab from a selection", () => {
  const { ctx } = harness();
  const result = prepActions.insertPrefab(ctx, "goblin-camp", "old-watch", { x: 500, y: 325 });
  assert.equal(result.props.length, 7);
  const camp = slice(ctx).props["old-watch"];
  assert.equal(camp.length, 7);
  assert.equal(
    camp.every((p) => p.prefab.id === "goblin-camp" && p.prefab.instance === result.instance),
    true,
  );
  const fire = camp.find((p) => p.sticker === "campfire");
  const template = slice(ctx).prefabs[0];
  const source = template.props.find((p) => p.sticker === "campfire");
  assert.deepEqual(
    [fire.x, fire.y],
    [500 - template.width / 2 + source.x, 325 - template.height / 2 + source.y].map(
      (n) => Math.round(n * 10) / 10,
    ),
    "relative placement",
  );
  assert.equal(
    template.props.every(
      (p) =>
        p.x - Math.max(p.width, p.height) / 2 >= 0 &&
        p.x + Math.max(p.width, p.height) / 2 <= template.width &&
        p.y - Math.max(p.width, p.height) / 2 >= 0 &&
        p.y + Math.max(p.width, p.height) / 2 <= template.height,
    ),
    true,
    "the seeded prefab's objects sit inside its own box",
  );
  assert.deepEqual(prepUI.selected, new Set(result.props.map((p) => p.id)));
  refusal(() =>
    ctx.commit("x", (s) => D.insertPrefab(s, "dm", "goblin-camp", "old-watch", { x: 9000, y: 0 })),
  );
  let prefab;
  ctx.commit("p", (s) => {
    prefab = D.createPrefab(s, "dm", "forest-clearing", ["fc-tree-1", "fc-tree-2"], {
      name: "Boschetto",
      collection: "Natura",
    });
  });
  assert.equal(prefab.props.length, 2);
  assert.equal(
    prefab.props.every((p) => p.x >= 0 && p.y >= 0 && !p.locked),
    true,
  );
  assert.deepEqual(
    D.prefabCollections(ctx.state).map((g) => g.collection),
    ["Accampamenti", "Natura"],
  );
  // A prefab is itself an editable scene (Owlbear): objects move inside it.
  ctx.commit("edit", (s) =>
    D.moveProps(s, "dm", "prefab:" + prefab.id, [prefab.props[0].id], 5, 5),
  );
  refusal(() =>
    ctx.commit("x", (s) =>
      D.insertPrefab(s, "dm", prefab.id, "prefab:" + prefab.id, { x: 1, y: 1 }),
    ),
  );
});

// ------------------------------------------------------------------------------ off-map

test("off-map creatures: DM only, dragged in as a token, never in initiative by themselves", () => {
  const { ctx } = harness();
  assert.equal(D.stagedOn(ctx.state, "forest-clearing", "player").length, 0);
  const [row] = D.stagedOn(ctx.state, "forest-clearing", "dm");
  // A drop still outside only moves it.
  ctx.commit("m", (s) => D.dropStaged(s, "dm", "forest-clearing", row.id, { x: 1150, y: 500 }));
  assert.equal(D.stagedOn(ctx.state, "forest-clearing", "dm")[0].y, 500);
  ctx.commit("in", (s) => D.dropStaged(s, "dm", "forest-clearing", row.id, { x: 900, y: 400 }));
  const token = sceneOf(ctx, "forest-clearing").tokens.find((t) => t.actorId === "goblin-1");
  assert.deepEqual([token.x, token.y], [900, 400]);
  assert.equal(ctx.state.combat.order.length, 4, "the initiative order is untouched");
  ctx.commit("out", (s) => D.sendOffMap(s, "dm", "forest-clearing", "goblin-1"));
  assert.equal(
    sceneOf(ctx, "forest-clearing").tokens.some((t) => t.actorId === "goblin-1"),
    false,
  );
  refusal(
    () => ctx.commit("x", (s) => D.stageCreature(s, "dm", "forest-clearing", "goblin-1")),
    /already off/,
  );
  refusal(() =>
    ctx.commit("x", (s) => D.stageCreature(s, "player", "forest-clearing", "goblin-2")),
  );
  ctx.commit("combat", (s) => {
    s.combat.active = true;
  });
  refusal(
    () => ctx.commit("x", (s) => D.sendOffMap(s, "dm", "old-watch", "goblin-2")),
    /initiative/,
  );
});

// ------------------------------------------------------------------------------ views

test("starting view for everyone (DM) and three personal saved views", async () => {
  const { ctx } = harness();
  const table = fakeTable(ctx, { zoom: 1.6, pan: { x: 120, y: 80 } });
  assert.equal(actions.setDefault(ctx, table), true);
  assert.deepEqual(D.defaultView(ctx.state, "old-watch"), { zoom: 1.6, pan: { x: 120, y: 80 } });
  // On arrival the camera starts there (applied after the bind, like Owlbear).
  const { ctx: player } = harness({ role: "player" });
  player.commit("copy", (s) => {
    s.ext[D.ID].views.default["old-watch"] = { zoom: 1.6, pan: { x: 120, y: 80 } };
  });
  const seen = fakeTable(player);
  resetTableUI();
  const { bindMapLayer } = await import("../scene-assets-table.mjs");
  bindMapLayer({}, player, seen);
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.deepEqual(seen.view, { zoom: 1.6, pan: { x: 120, y: 80 } });
  // Saved views are personal and local (allowed offline).
  player.offline = true;
  assert.equal(
    actions.saveView(player, 2, fakeTable(player, { zoom: 2, pan: { x: 300, y: 200 } })),
    true,
  );
  assert.deepEqual(D.savedViews(player.state, "player", "old-watch")[1], {
    zoom: 2,
    pan: { x: 300, y: 200 },
  });
  assert.deepEqual(D.savedViews(player.state, "dm", "old-watch"), [null, null, null]);
  const other = fakeTable(player);
  assert.equal(actions.loadView(player, 2, other), true);
  assert.deepEqual(other.view, { zoom: 2, pan: { x: 300, y: 200 } });
  assert.equal(actions.loadView(player, 1, other), false);
  assert.match(player.toasts.at(-1).text, /Maiusc\+F2/);
  // The starting view is a shared DM choice: refused to players and offline.
  refusal(() =>
    player.commit(
      "x",
      (s) => D.setDefaultView(s, "player", "old-watch", { zoom: 1, pan: { x: 0, y: 0 } }),
      { local: true },
    ),
  );
  refusal(() => D.cleanView(sceneOf(ctx, "old-watch"), { zoom: 9, pan: { x: 0, y: 0 } }));
});

test("grid alignment result: cell and whole offsets inside one cell; Undo restores", () => {
  const { ctx } = harness();
  ctx.commit("a", (s) =>
    D.applyGridAlignment(s, "dm", "old-watch", { gridSize: 56.5, offsetX: 130, offsetY: -8 }),
  );
  const scene = sceneOf(ctx, "old-watch");
  assert.deepEqual([scene.gridSize, scene.gridOffsetX, scene.gridOffsetY], [56.5, 17, 49]);
  assert.deepEqual(validateSceneDraft(scene), []);
  refusal(() =>
    ctx.commit("x", (s) =>
      D.applyGridAlignment(s, "dm", "old-watch", { gridSize: 4, offsetX: 0, offsetY: 0 }),
    ),
  );
  ctx.undo();
  assert.equal(sceneOf(ctx, "old-watch").gridSize, 50);
});

// ------------------------------------------------------------------------------ registry

test("contributions: placement, keys without conflicts, notifications, search", () => {
  const { ctx, registry } = harness();
  assert.deepEqual(registry.conflicts(), []);
  const commands = registry.list("command", ctx).filter((c) => c.group === "scene-assets");
  assert.deepEqual(
    commands
      .filter((c) => c.shortcut)
      .map((c) => c.shortcut)
      .sort(),
    ["F2", "F3", "F4", "Shift+F2", "Shift+F3", "Shift+F4"].sort(),
    "floor keys only inside a building",
  );
  ctx.commit("tower", (s) => {
    s.activeSceneId = "lantern-tower";
  });
  assert.equal(
    registry.commandForKey({ key: "PageUp" }, { ...ctx, view: { page: "table" } })?.id,
    "scene-assets.floor-up",
  );
  const panel = registry
    .list("table-panel", ctx, tv(ctx))
    .find((c) => c.id === "scene-assets-panel");
  assert.equal(panel.placement, "sidebar-tab");
  // PR-03/06: no separate "advanced scenes" section; the one list and editor carry it.
  assert.equal(registry.list("preparation-section", ctx).length, 0);
  assert.ok(registry.get("command", "scene-assets.import-uvtt", ctx));
  ctx.commit("up", (s) =>
    LV.climb(s, "dm", { actorId: "goblin-1", toSceneId: "lantern-tower-top", follow: true }),
  );
  const notes = registry.notifications(ctx).filter((n) => n.category === "scene-assets");
  assert.equal(notes.length, 3);
  assert.equal(notes[0].title.it, "Livia è su un altro piano: Piano terra");
  const hits = registry.search(ctx, "accampamento");
  assert.ok(hits.some((h) => h.params?.id === "prefab:goblin-camp"));
});

test("the Table panel: DM floor switch and variants; the player sees no hidden detail", () => {
  const { ctx } = harness();
  ctx.commit("tower", (s) => {
    s.activeSceneId = "lantern-tower";
  });
  const dm = renderPanel(ctx, tv(ctx));
  assert.match(dm, /data-sa-floor="lantern-tower-top"/);
  assert.match(dm, /data-sa-climb="goblin-1" data-sa-to="lantern-tower-top"/);
  assert.match(dm, /PagSu/);
  ctx.commit("court", (s) => {
    s.activeSceneId = "old-watch";
  });
  const court = renderPanel(ctx, tv(ctx));
  assert.match(court, /data-sa-variant="night"/);
  assert.equal(actions.variant(ctx, "old-watch", "night"), true);
  assert.match(sceneOf(ctx, "old-watch").background, /^data:image\/webp/);
  const { ctx: player } = harness({ role: "player", lang: "en" });
  player.commit("clearing", (s) => {
    s.activeSceneId = "forest-clearing";
  });
  const html = renderPanel(player, tv(player));
  assert.doesNotMatch(html, /Trappola|Snare|Sentinella|data-sa-variant|data-sa-bring|data-sa-flag/);
  assert.match(html, /Roofs and canopies/);
  assert.match(html, /Personal views: only you see them/);
});

test("Preparation renders the page menu and the workspace; offline refuses shared edits", () => {
  const { ctx } = harness();
  const menu = renderPrep(ctx);
  assert.match(menu, /data-sa-open-folder="ch1"/);
  assert.match(menu, /Archivio \(0\)/);
  ctx.view = { page: "preparation", tab: D.ID, id: "folder:ch1-tower" };
  const tower = renderPrep(ctx);
  assert.match(tower, /data-sa-scene-card="lantern-tower-top"/);
  assert.match(tower, /La torre<\/button>/);
  ctx.view = { page: "preparation", tab: D.ID, id: "forest-clearing" };
  const ws = renderPrep(ctx);
  assert.match(ws, /data-sa-canvas/);
  assert.match(ws, /Accampamento goblin/);
  assert.match(ws, /data-sa-staged="stage-goblin-1"/);
  ctx.offline = true;
  assert.equal(prepActions.addSticker(ctx, "forest-clearing", "tree", { x: 100, y: 100 }), null);
  assert.equal(ctx.toasts.at(-1).error, true);
  ctx.offline = false;
  const added = prepActions.addSticker(ctx, "forest-clearing", "tree", { x: 100, y: 100 });
  assert.equal(added.name, "Albero");
  assert.equal(renderPrep({ ...ctx, role: "player" }), "");
  assert.equal(searchStickers("TETTO").length, 2);
  assert.equal(searchStickers("roof").length, 2);
  assert.equal(new Set(STICKERS.map((s) => s.id)).size, STICKERS.length);
});

test("a library image used as a variant shows in the library's 'used in' (B28); duplicate with objects", () => {
  const { ctx } = harness({ media: true });
  const asset = ctx.state.ext.media.assets.find((a) => a.id === "m-courtyard");
  ctx.commit("v", (s) =>
    D.addVariant(s, "dm", "old-watch", {
      name: "Tramonto",
      look: { background: asset.dataUrl, assetId: asset.id, imageName: asset.fileName },
    }),
  );
  const uses = usagesOf(ctx.state, "m-courtyard", "dm");
  assert.ok(
    uses.rows.some((r) => r.area === D.ID && r.label.it.includes("Variante «Tramonto»")),
    JSON.stringify(uses.rows.map((r) => r.label?.it)),
  );
  assert.equal(
    usagesOf(ctx.state, "m-courtyard", "player").rows.some((r) => r.area === D.ID),
    false,
  );
  let copy;
  ctx.commit("dup", (s) => {
    copy = D.duplicateWithAssets(s, "dm", "forest-clearing", { name: "Radura — copia" });
  });
  assert.equal(slice(ctx).props[copy.id].length, slice(ctx).props["forest-clearing"].length);
  assert.equal(copy.tokens.length, 0, "tokens are not copied");
  assert.equal(D.sceneFolder(ctx.state, copy.id), "ch2", "same folder");
  assert.notEqual(slice(ctx).props[copy.id][0].id, slice(ctx).props["forest-clearing"][0].id);
});

// ------------------------------------------------------------------------------ review (B47-rf)

test("review: personal saved views and the roofs choice survive Undo of an earlier change", () => {
  const { ctx } = harness();
  ctx.commit("move", (s) => D.moveProps(s, "dm", "forest-clearing", ["fc-tree-1"], 10, 0));
  assert.equal(actions.saveView(ctx, 1, fakeTable(ctx, { zoom: 2, pan: { x: 40, y: 30 } })), true);
  assert.equal(actions.toggleRoofs(ctx), true);
  ctx.undo();
  assert.equal(
    slice(ctx).props["forest-clearing"].find((p) => p.id === "fc-tree-1").x,
    110,
    "the shared change is undone",
  );
  assert.deepEqual(
    D.savedViews(ctx.state, "dm", "old-watch")[0],
    { zoom: 2, pan: { x: 40, y: 30 } },
    "a personal view is not a gameplay change",
  );
  assert.equal(D.foregroundHidden(ctx.state, "dm"), true, "nor is the roofs choice");
});

test("review: keyboard places an armed prefab or stair at the map centre; stairs are editable", () => {
  const { ctx } = harness();
  // Prefab armed with «Inserisci…», then Enter on the focused canvas.
  prepUI.placing = { prefab: "goblin-camp" };
  const result = prepActions.placeArmed(ctx, "old-watch");
  assert.equal(result.props.length, 7);
  assert.equal(prepUI.placing, null, "disarmed after placing");
  const template = slice(ctx).prefabs[0];
  const fire = slice(ctx).props["old-watch"].find((p) => p.sticker === "campfire");
  const source = template.props.find((p) => p.sticker === "campfire");
  assert.equal(fire.x, Math.round((500 - template.width / 2 + source.x) * 10) / 10);
  // Stair armed with «Aggiungi scala…»: Enter opens the dialog at the centre, whose
  // position is editable in metres.
  prepUI.stairPick = { move: null };
  prepActions.placeArmed(ctx, "lantern-tower");
  assert.equal(prepUI.stairPick, null);
  const add = ctx.dialogs.at(-1);
  assert.match(add.body, /name="x"[^>]*value="15"/);
  assert.match(add.body, /name="y"[^>]*value="9[.,]8"/);
  const form = new FormData();
  form.set("name", "Botola");
  form.set("to", "lantern-tower-top");
  form.set("radius", "1.5");
  form.set("x", "3");
  form.set("y", "4.5");
  add.options.onSubmit(form);
  const stack = LV.stackOf(ctx.state, "lantern-tower").stack;
  const hatch = stack.stairs.find((s) => s.name === "Botola");
  assert.deepEqual([hatch.x, hatch.y, hatch.radius], [100, 150, 50]);
  // «Modifica…» (and Enter while «Sposta…» is armed) edits name, radius and position.
  prepUI.stairPick = { move: hatch.id };
  prepActions.placeArmed(ctx, "lantern-tower");
  const edit = ctx.dialogs.at(-1);
  assert.match(edit.body, /name="name"[^>]*value="Botola"/);
  const change = new FormData();
  change.set("name", "Botola del magazzino");
  change.set("radius", "3");
  change.set("x", "6");
  change.set("y", "6");
  edit.options.onSubmit(change);
  const moved = LV.stackOf(ctx.state, "lantern-tower").stack.stairs.find((s) => s.id === hatch.id);
  assert.deepEqual(
    [moved.name, moved.x, moved.y, moved.radius],
    ["Botola del magazzino", 200, 200, 100],
  );
  assert.equal(ctx.state.log.at(-1).label, "Scala modificata");
  // The levels tab offers «Modifica…» for every stair.
  prepUI.tab = "levels";
  ctx.view = { page: "preparation", tab: D.ID, id: "lantern-tower" };
  assert.match(renderPrep(ctx), new RegExp(`data-sa-stair-edit="${hatch.id}"`));
  // Nothing armed: Enter does nothing.
  assert.equal(prepActions.placeArmed(ctx, "old-watch"), null);
});

test("review: right-click on objects offers create prefab, visibility, lock and delete", async () => {
  const { propMenu } = await import("../scene-assets-prep.mjs");
  const { ctx } = harness();
  const box = D.containerOf(ctx.state, "forest-clearing");
  assert.deepEqual(
    propMenu(ctx, box, ["fc-trap"]).map((item) => item.action),
    ["prefab", "show", "unlock", "delete"],
  );
  assert.deepEqual(
    propMenu(ctx, box, ["fc-tree-1", "fc-tree-2"]).map((item) => item.action),
    ["prefab", "hide", "lock", "delete"],
  );
  assert.match(propMenu(ctx, box, ["fc-tree-1", "fc-tree-2"])[0].label, /2/);
  assert.equal(prepActions.propMenuAction(ctx, "forest-clearing", ["fc-trap"], "unlock"), true);
  assert.equal(prepActions.propMenuAction(ctx, "forest-clearing", ["fc-trap"], "show"), true);
  const trap = slice(ctx).props["forest-clearing"].find((p) => p.id === "fc-trap");
  assert.deepEqual([trap.locked, trap.hidden], [false, false]);
  prepActions.propMenuAction(ctx, "forest-clearing", ["fc-tree-1", "fc-tree-2"], "prefab");
  assert.equal(ctx.dialogs.at(-1).title, "Crea prefabbricato");
  assert.deepEqual(prepUI.selected, new Set(["fc-tree-1", "fc-tree-2"]));
  assert.equal(prepActions.propMenuAction(ctx, "forest-clearing", ["fc-trap"], "delete"), true);
  assert.equal(
    slice(ctx).props["forest-clearing"].some((p) => p.id === "fc-trap"),
    false,
  );
  // Inside a prefab there is no «Create prefab».
  const prefab = D.containerOf(ctx.state, "prefab:goblin-camp");
  assert.deepEqual(
    propMenu(ctx, prefab, [prefab.props[0].id]).map((item) => item.action),
    ["hide", "lock", "delete"],
  );
});

test("review: a player's own token on another floor can come back down the stairs", () => {
  const { ctx } = harness({ role: "player" });
  ctx.commit("setup", (s) => {
    s.activeSceneId = "lantern-tower";
    const livia = s.scenes
      .find((x) => x.id === "lantern-tower")
      .tokens.find((t) => t.actorId === "livia");
    livia.x = 800;
    livia.y = 520;
  });
  assert.equal(
    actions.climb(ctx, "livia", "lantern-tower-top", { fromSceneId: "lantern-tower" }),
    true,
  );
  const html = renderPanel(ctx, tv(ctx));
  assert.match(
    html,
    /data-sa-climb="livia" data-sa-to="lantern-tower" data-sa-from="lantern-tower-top"/,
    "the way back from the floor out of view",
  );
  assert.doesNotMatch(html, /data-sa-climb="goblin-1"/, "never another's creature");
  assert.equal(
    actions.climb(ctx, "livia", "lantern-tower", { fromSceneId: "lantern-tower-top" }),
    true,
  );
  assert.equal(LV.floorOfActor(ctx.state, "livia").sceneId, "lantern-tower");
});

test("review: the floor steps are disabled at the top and bottom floors", () => {
  const { ctx } = harness();
  ctx.commit("tower", (s) => {
    s.activeSceneId = "lantern-tower";
  });
  const ground = renderPanel(ctx, tv(ctx));
  assert.match(ground, /data-sa-step="-1"[^>]*disabled/);
  assert.doesNotMatch(ground, /data-sa-step="1"[^>]*disabled/);
  ctx.commit("up", (s) => LV.stepFloor(s, "dm", 1));
  const top = renderPanel(ctx, tv(ctx));
  assert.match(top, /data-sa-step="1"[^>]*disabled/);
  assert.doesNotMatch(top, /data-sa-step="-1"[^>]*disabled/);
});

test("review: moving a folder keeps its subfolders within four levels", () => {
  const { ctx } = harness();
  let a, b, c;
  ctx.commit("tree", (s) => {
    a = D.createFolder(s, "dm", { name: "A" });
    b = D.createFolder(s, "dm", { name: "B", parentId: a.id });
    c = D.createFolder(s, "dm", { name: "C", parentId: b.id });
  });
  // ch1 (1) › La torre (2) › A (3) › B (4) › C (5): too deep.
  refusal(() => ctx.commit("x", (s) => D.moveFolder(s, "dm", a.id, "ch1-tower")), /four levels/);
  ctx.commit("ok", (s) => D.moveFolder(s, "dm", a.id, "ch1"));
  assert.deepEqual(
    D.folderPath(ctx.state, c.id).map((p) => p.name),
    ["Capitolo 1 · L’osservatorio", "A", "B", "C"],
  );
});
