// P6 — tokens at the Table: filtered box select and the list of every selected token (TV-15),
// fixed-size labels and lockable handles (TV-19), groups that move together (TV-20), the DM's
// «Aggiungi creatura qui» and bestiary (TV-21), rings in the current colour theme (TV-38),
// cover written in words (TV-44), the «Trovato» list (TV-138) and «Borseggia» visible but
// unavailable out of reach (TV-142). Real store and registry; synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { esc, icon } from "../ui.mjs";
import { createRegistry } from "../registry.mjs";
import { canControlActor } from "../character-access.mjs";
import { renderTable, resetTableView } from "../table.mjs";
import {
  register,
  resetTokenMenu,
  boxFilterKeeps,
  tokensInBox,
  sizeForRadius,
  rotationFor,
  groupTokens,
  followGroup,
  creatureMatches,
  addCreatureAt,
  menuMarkup,
  setLocked,
} from "../token-menu.mjs";
import { coverText } from "../cover.mjs";
import * as KD from "../knowledge-domain.mjs";
import * as K from "../knowledge.mjs";
import * as SM from "../special-moves-domain.mjs";
import * as SMUI from "../special-moves.mjs";

const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
  };
};
function makeApp({ role = "dm", lang = "it", areas = [] } = {}) {
  resetTokenMenu();
  resetTableView();
  const store = createStore({ storage: memory() });
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  registry.use("token-menu", register);
  for (const [id, fn] of areas) registry.use(id, fn);
  registry.initState(store.state);
  const toasts = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    view: { page: "table", id: "", tab: "" },
    t: (it, en) => (ctx.lang === "en" ? en : it),
    label: (v) => (typeof v === "object" && v ? (v[ctx.lang] ?? v.it) : String(v ?? "")),
    esc,
    icon,
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    toast: (text, error = false) => toasts.push({ text, error }),
    render: () => {},
    navigate: () => {},
    dialog: () => {},
    closeDialog: () => {},
    commit(label, mutator, options = {}) {
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      return { applied: true, persisted: true };
    },
    undo: () => store.undo(ctx.role),
    canUndo: () => store.history.at(-1)?.controller === ctx.role,
    registry,
  };
  registry.attach(ctx);
  return { store, registry, ctx, toasts };
}
const scene = (app) => app.store.state.scenes.find((s) => s.id === app.store.state.activeSceneId);
const token = (app, id) => scene(app).tokens.find((t) => t.actorId === id);

test("TV-15: a box keeps only enemies or only mine when filtered (Alt / Ctrl or the chips)", () => {
  const app = makeApp();
  const all = tokensInBox(app.ctx.state, null, { x1: 0, y1: 0, x2: 1000, y2: 650 }, "dm");
  const keep = (filter, role) =>
    all.filter((id) =>
      boxFilterKeeps(app.ctx.state, id, filter, (a) => canControlActor(a, role, app.ctx.state)),
    );
  assert.deepEqual(keep("enemies", "dm").sort(), ["goblin-1", "goblin-2"]);
  assert.ok(keep("mine", "player").includes("livia"));
  assert.ok(!keep("mine", "player").includes("goblin-1"));
  assert.equal(keep("all", "dm").length, all.length);
});

test("TV-15: with several tokens selected the panel lists every one of them", () => {
  const app = makeApp();
  const view = { scene: scene(app), selectedActorId: "livia", mode: "move" };
  const panel = app.registry.get("table-panel", "token-menu-panel");
  groupTokens(
    app.store.state.ext["token-menu"],
    "old-watch",
    ["token-livia", "token-doran", "token-mira"],
    "dm",
  );
  const table = { svg: null, scene: view.scene, selectedActorId: "livia", point: (p) => p };
  // The press on a grouped token picks the whole group (as the map does).
  const map = app.registry.get("map-layer", "token-menu-marks");
  assert.ok(map);
  const html = panel.render(app.ctx, view);
  assert.doesNotMatch(html, /token-menu-picked-list/);
  // Select the group through the select tool's click handler.
  const tool = app.registry.get("table-tool", "token-menu-select");
  tool.onPointerDown(
    app.ctx,
    {
      button: 0,
      target: {
        closest: (s) => (s.includes("data-actor") ? { getAttribute: () => "livia" } : null),
      },
    },
    table,
  );
  tool.onPointerUp(app.ctx, {}, { ...table, select: () => {} });
  const listed = panel.render(app.ctx, view);
  for (const name of ["Livia", "Doran", "Mira"]) assert.match(listed, new RegExp(name));
  assert.match(listed, /token-menu-picked-list/);
  // Filter chips while the select tool is on.
  const chips = panel.render(app.ctx, { ...view, mode: "token-menu-select" });
  assert.match(chips, /Solo nemici/);
  assert.match(chips, /Solo mie/);
});

test("TV-19: a larger token keeps its name at the same size; handles resize and rotate unless locked", () => {
  const app = makeApp();
  const slice = app.store.state.ext["token-menu"];
  app.ctx.commit("size", (s) => {
    s.ext["token-menu"].tokens["token-goblin-1"] = { size: "large" };
  });
  const marks = app.registry.get("map-layer", "token-menu-marks");
  const css = marks
    .svg(app.ctx, { scene: scene(app), selectedActorId: "goblin-1", mode: "move" })
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">");
  assert.match(css, /\[data-actor="goblin-1"\] > \.token-display > \.token-name\{font-size:6\.5px/);
  const handles = app.registry.get("map-layer", "token-menu-handles");
  const view = {
    scene: scene(app),
    selectedActorId: "goblin-1",
    mapSelection: "goblin-1",
    mode: "move",
  };
  const svg = handles.svg(app.ctx, view);
  assert.match(svg, /data-token-handle="rotate"/);
  assert.match(svg, /data-token-handle="resize"/);
  // Locked: no handles (the lock locks the handles too).
  app.ctx.commit("lock", (s) => setLocked(s.ext["token-menu"], ["token-goblin-1"], true, "dm"));
  assert.equal(handles.svg(app.ctx, view), "");
  // A player gets handles only on the token they control.
  app.ctx.role = "player";
  assert.equal(handles.svg(app.ctx, view), "");
  assert.match(
    handles.svg(app.ctx, { ...view, selectedActorId: "livia", mapSelection: "livia" }),
    /data-token-handle/,
  );
  assert.equal(handles.svg(app.ctx, { ...view, selectedActorId: "livia", mapSelection: null }), "");
  // The drag snaps to the SRD sizes and to 15° steps.
  assert.equal(sizeForRadius(28), "medium");
  assert.equal(sizeForRadius(58), "large");
  assert.equal(sizeForRadius(110), "gargantuan");
  assert.equal(rotationFor({ x: 0, y: 0 }, { x: 10, y: 0 }), 90);
  assert.equal(rotationFor({ x: 0, y: 0 }, { x: -10, y: -10 }), 315);
  assert.ok(slice);
});

test("TV-20: dragging a grouped token moves the whole group by the same offset", () => {
  const app = makeApp();
  const members = ["token-livia", "token-doran", "token-mira"];
  app.ctx.commit("group", (s) => groupTokens(s.ext["token-menu"], "old-watch", members, "dm"));
  const before = Object.fromEntries(["doran", "mira"].map((id) => [id, { ...token(app, id) }]));
  const from = { ...token(app, "livia") };
  // The Table moved Livia by (+50, -50); the others follow.
  app.ctx.commit("lead", (s) => {
    const t = s.scenes[0].tokens.find((x) => x.actorId === "livia");
    t.x += 50;
    t.y -= 50;
  });
  const out = followGroup(app.ctx, { actorId: "livia", tokenId: "token-livia", from, members });
  assert.deepEqual(out.moved.sort(), ["doran", "mira"]);
  for (const id of ["doran", "mira"]) {
    assert.equal(token(app, id).x, before[id].x + 50);
    assert.equal(token(app, id).y, before[id].y - 50);
  }
});

test("TV-21: the DM's scene menu adds a creature here: search, pick, placed hostile at the point", async () => {
  const app = makeApp();
  // A name that starts with the search comes first.
  assert.deepEqual(
    creatureMatches("goblin guer", "it").map((e) => e.name.it),
    ["Goblin guerriero", "Hobgoblin guerriero"],
  );
  assert.ok(creatureMatches("wolf", "en").some((e) => e.name.en === "Wolf"));
  const main = menuMarkup(app.ctx, {
    kind: "scene",
    sceneId: "old-watch",
    view: "main",
    point: { x: 450, y: 180 },
  });
  assert.match(main, /data-token-menu-scene="add-creature"/);
  assert.match(main, /Aggiungi creatura qui…/);
  const picker = menuMarkup(app.ctx, {
    kind: "scene",
    sceneId: "old-watch",
    view: "cat:creatures",
    query: "goblin",
    point: { x: 450, y: 180 },
  });
  assert.match(picker, /id="token-menu-creature-search"/);
  assert.match(picker, /data-token-menu-creature="[^"]+"[^>]*>.*Goblin guerriero/);
  const entry = creatureMatches("goblin guerriero", "it")[0];
  const before = scene(app).tokens.length;
  const result = await addCreatureAt(app.ctx, entry.id, { x: 450, y: 180 });
  assert.ok(result, JSON.stringify(app.toasts));
  assert.equal(scene(app).tokens.length, before + 1);
  const placed = scene(app).tokens.at(-1);
  assert.deepEqual([placed.x, placed.y], [450, 180]);
  const actor = app.store.state.actors[placed.actorId];
  assert.match(actor.name, /Goblin guerriero/);
  assert.equal(actor.combatProfile?.team, "watch");
  // Players have no «Aggiungi creatura qui».
  app.ctx.role = "player";
  assert.doesNotMatch(
    menuMarkup(app.ctx, { kind: "scene", sceneId: "old-watch", view: "main", point: null }),
    /add-creature/,
  );
  // The bestiary drawer and the command found by «pedina».
  app.ctx.role = "dm";
  const drawer = app.registry.get("table-panel", "token-menu-creatures", app.ctx, {});
  assert.equal(drawer.section, "scene");
  assert.match(drawer.render(app.ctx, {}), /draggable="true"/);
  const command = app.registry
    .list("command", app.ctx)
    .find((c) => c.id === "token-menu.add-creature");
  assert.match(command.label.it + command.description.it, /pedina/);
  assert.match(command.description.it, /mostro/);
  assert.match(command.description.it, /PNG/);
});

test("TV-44: the cover result is written with its effect (IT, EN)", () => {
  assert.equal(coverText("half", "it"), "Mezza copertura, +2 CA");
  assert.equal(coverText("three-quarters", "it"), "Copertura dei tre quarti, +5 CA");
  assert.equal(coverText("total", "it"), "Copertura totale: non bersagliabile");
  assert.equal(coverText("none", "it"), "Nessuna copertura");
  assert.equal(coverText("half", "en"), "Half Cover, +2 AC");
});

test("TV-138: what a search finds stays listed for the scene, with finder and total", () => {
  const slice = { events: [] };
  slice.events.push({
    kind: "search",
    actorId: "livia",
    sceneId: "old-watch",
    total: 21,
    found: ["goblin-2"],
    at: "2026-09-25T10:00:00Z",
  });
  KD.recordFinds(slice, "livia", { traps: ["region-plate"], points: ["point-crate"] });
  slice.events.push({
    kind: "search",
    actorId: "mira",
    sceneId: "lantern-tower",
    total: 9,
    found: [],
  });
  const rows = KD.foundOn(slice, "old-watch");
  assert.deepEqual(
    rows.map((r) => [r.kind, r.id, r.finderId, r.total]),
    [
      ["creature", "goblin-2", "livia", 21],
      ["trap", "region-plate", "livia", 21],
      ["point", "point-crate", "livia", 21],
    ],
  );
  assert.deepEqual(KD.foundOn(slice, "lantern-tower"), []);
});

test("TV-142: «Borseggia» stays in the token menu out of reach, greyed with the reason", () => {
  const app = makeApp({ role: "player", areas: [[KD.ID, K.register]] });
  const html = menuMarkup(app.ctx, {
    kind: "token",
    actorId: "goblin-1",
    sceneId: "old-watch",
    view: "cat:actions",
    hp: null,
  });
  const main = menuMarkup(app.ctx, {
    kind: "token",
    actorId: "goblin-1",
    sceneId: "old-watch",
    view: "main",
    hp: null,
  });
  const both = html + main;
  assert.match(both, /data-token-menu-item="knowledge-pickpocket"[^>]*aria-disabled="true"/);
  assert.match(both, /Avvicinati: serve un tuo personaggio adiacente/);
  // Adjacent: available (no reason).
  app.ctx.commit("near", (s) => {
    const t = s.scenes[0].tokens;
    Object.assign(
      t.find((x) => x.actorId === "livia"),
      {
        x: t.find((x) => x.actorId === "goblin-1").x - 50,
        y: t.find((x) => x.actorId === "goblin-1").y,
      },
    );
  });
  const near =
    menuMarkup(app.ctx, {
      kind: "token",
      actorId: "goblin-1",
      sceneId: "old-watch",
      view: "cat:actions",
      hp: null,
    }) +
    menuMarkup(app.ctx, {
      kind: "token",
      actorId: "goblin-1",
      sceneId: "old-watch",
      view: "main",
      hp: null,
    });
  assert.match(near, /data-token-menu-item="knowledge-pickpocket"/);
  assert.doesNotMatch(near, /data-token-menu-item="knowledge-pickpocket"[^>]*aria-disabled/);
});

test("TV-142: Mosse speciali offers «Borseggia» with the reason when nobody is adjacent", () => {
  const app = makeApp({
    role: "player",
    areas: [
      [KD.ID, K.register],
      [SM.ID, SMUI.register],
    ],
  });
  const status = SMUI.moveStatus(app.ctx, "pickpocket", "livia");
  assert.notEqual(status.shown, false);
  assert.equal(status.available, false);
  assert.match(status.reason.it, /Avvicinati/);
});

test("TV-106: the Table's «Scene» opens the scene list; no header jump to Preparation", () => {
  const app = makeApp();
  resetTableView();
  const html = renderTable(app.ctx);
  assert.match(html, /data-table="scenes"/);
  assert.doesNotMatch(html, /class="button quiet" data-table="prepare"/);
});
