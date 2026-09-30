// B18: Table annotations, persistent templates, extended measuring and signals. Domain rules
// plus the area's contributions and tool handlers through the real registry and store.
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState, createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { canControlActor } from "../character-access.mjs";
import { esc, icon } from "../ui.mjs";
import { renderTable, resetTableView } from "../table.mjs";
import * as D from "../annotations-domain.mjs";
import {
  register,
  bus,
  annotationsView,
  annotationsAction,
  resetAnnotationsView,
  pref,
  permissions,
  ringTheme,
  openAuraDialog,
} from "../annotations.mjs";

const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};
function stateWithSlice() {
  const state = createInitialState();
  state.ext = { annotations: D.seedAnnotations() };
  return state;
}
/** A ctx backed by the real store: commits, private/local options, snapshot Undo. */
function harness({ role = "player", lang = "it", device = memory() } = {}) {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: device });
  registry.use("annotations", register);
  const store = createStore({ storage: memory() });
  registry.initState(store.state);
  const toasts = [];
  const dialogs = [];
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
    toast: (text, error = false) => toasts.push({ text, error }),
    render: () => {},
    navigate: () => {},
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    closeDialog: () => {},
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    canUndo: () => store.history.at(-1)?.controller === ctx.role,
    undoLabel: () => store.history.at(-1)?.label ?? "",
    commit(label, mutator, options = {}) {
      if (ctx.offline && !options.local)
        throw Object.assign(Error("offline"), { it: "Sei senza rete", en: "You are offline" });
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(ctx.role);
      registry.afterUndo(current, store.state);
    },
    registry,
  };
  registry.attach(ctx);
  return { ctx, store, registry, device };
}
/** Minimal Table services and pointer events for the tool handlers. */
function fakeTable(ctx, { selected = "livia" } = {}) {
  const messages = [];
  const table = {
    scene: ctx.state.scenes.find((s) => s.id === ctx.state.activeSceneId),
    svg: { setPointerCapture() {}, querySelector: () => null },
    point: (e) => e.p,
    message: (text) => messages.push(text),
    messages,
    selectedActorId: selected,
    mode: "move",
    view: { zoom: 1, pan: { x: 0, y: 0 } },
    setView(next) {
      table.view = next;
    },
    setMode(mode) {
      table.mode = mode;
    },
  };
  annotationsView().table = table;
  return table;
}
const ev = (x, y, extra = {}) => ({
  button: 0,
  pointerId: 1,
  p: { x, y },
  target: {
    closest: (sel) =>
      extra.actor && sel === "[data-actor]" ? { dataset: { actor: extra.actor } } : null,
  },
  altKey: false,
  shiftKey: false,
  defaultPrevented: false,
  preventDefault() {
    this.defaultPrevented = true;
  },
  ...extra,
});
function drag(tool, ctx, table, from, to, extra = {}) {
  tool.onPointerDown(ctx, ev(from.x, from.y, extra), table);
  tool.onPointerMove(ctx, ev((from.x + to.x) / 2, (from.y + to.y) / 2, extra), table);
  tool.onPointerMove(ctx, ev(to.x, to.y, extra), table);
  tool.onPointerUp(ctx, ev(to.x, to.y, extra), table);
}
const click = (tool, ctx, table, p, extra = {}) => {
  tool.onPointerDown(ctx, ev(p.x, p.y, extra), table);
  tool.onPointerUp(ctx, ev(p.x, p.y, extra), table);
};
const tool = (registry, id) => registry.get("table-tool", id);
test.beforeEach(() => {
  resetAnnotationsView();
  bus.clear();
});

// ---------------------------------------------------------------- domain

test("seed and normalize: a DM-only note and the Sentinella's elevation; invalid rows dropped", () => {
  const seed = D.seedAnnotations();
  assert.equal(seed.tooltips[0].audience, "me");
  assert.equal(seed.elevations["token-goblin-1"], 3);
  const normalized = D.normalizeAnnotations(
    {
      marks: [
        {
          kind: "arrow",
          author: "player",
          sceneId: "old-watch",
          points: [
            { x: 1, y: 2 },
            { x: 40, y: 2 },
          ],
          color: "nope",
        },
        { kind: "bogus" },
      ],
      templates: [
        {
          shape: "cone",
          author: "dm",
          sceneId: "old-watch",
          origin: { x: 1, y: 1 },
          size: 4.5,
          pattern: "fire",
        },
        { shape: "cone", size: -1 },
      ],
      elevations: { a: 2, b: "x" },
    },
    1,
  );
  assert.equal(normalized.marks.length, 1);
  assert.equal(normalized.marks[0].color, "gold", "unknown colour falls back");
  assert.equal(normalized.templates.length, 1);
  assert.equal(normalized.templates[0].pattern, "fire");
  assert.deepEqual(normalized.elevations, { a: 2 });
  assert.throws(() => D.normalizeAnnotations({}, 2), /newer version/);
});

test("drawings: Livia draws, the DM sees them; the DM's Clear mine keeps Livia's; the DM hides them", () => {
  const s = stateWithSlice();
  const arrow = D.addMark(s, "player", {
    sceneId: "old-watch",
    kind: "arrow",
    points: [
      { x: 250, y: 380 },
      { x: 600, y: 260 },
    ],
    color: "blue",
    width: 3,
    asActorId: "livia",
  });
  D.addMark(s, "player", {
    sceneId: "old-watch",
    kind: "text",
    points: [{ x: 300, y: 330 }],
    text: "Porta nord",
    color: "blue",
    width: 2,
    asActorId: "livia",
  });
  D.addMark(s, "dm", {
    sceneId: "old-watch",
    kind: "ellipse",
    points: [
      { x: 600, y: 200 },
      { x: 700, y: 300 },
    ],
    color: "red",
    width: 2,
    asActorId: "doran",
  });
  const dmView = D.visibleMarks(s, "old-watch", "dm");
  assert.equal(dmView.length, 3);
  assert.equal(D.authorName(s, arrow), "Livia");
  assert.equal(D.authorName(s, dmView[2]), "Doran");
  assert.throws(() => D.removeMark(s, "player", dmView[2].id), /only your own/);
  assert.equal(D.clearMine(s, "dm", "old-watch"), 1, "only the DM's own drawing");
  assert.equal(D.visibleMarks(s, "old-watch", "player").length, 2);
  assert.throws(() => D.setMarkHidden(s, "player", arrow.id, true), /Only the DM/);
  for (const mark of D.visibleMarks(s, "old-watch", "dm")) D.setMarkHidden(s, "dm", mark.id, true);
  assert.equal(
    D.visibleMarks(s, "old-watch", "player").length,
    0,
    "hidden from players, author included",
  );
  assert.equal(D.visibleMarks(s, "old-watch", "dm").filter((m) => m.hidden).length, 2);
  assert.throws(() => D.clearAll(s, "player", "old-watch"), /Only the DM/);
  assert.throws(
    () =>
      D.addMark(
        s,
        "player",
        {
          sceneId: "old-watch",
          kind: "free",
          points: [
            { x: 1, y: 1 },
            { x: 9, y: 9 },
          ],
          color: "blue",
        },
        { perms: { playersDraw: false } },
      ),
    /turned off player drawings/,
  );
  assert.throws(
    () =>
      D.addMark(s, "player", {
        sceneId: "old-watch",
        kind: "text",
        points: [{ x: 1, y: 1 }],
        text: " ",
        color: "blue",
      }),
    /Write some text/,
  );
});

test("templates: a hidden trap cone, revealed with the fire pattern; locked it does not move", () => {
  const s = stateWithSlice();
  const trap = D.addTemplate(s, "dm", {
    sceneId: "old-watch",
    shape: "cone",
    origin: { x: 500, y: 330 },
    angle: 0,
    size: 4.5,
    color: "red",
    hidden: true,
    label: "Trappola",
  });
  assert.equal(
    D.visibleTemplates(s, "old-watch", "player").length,
    0,
    "hidden trap: players see nothing",
  );
  assert.throws(
    () => D.updateTemplate(s, "player", trap.id, { origin: { x: 1, y: 1 } }),
    /not found/,
  );
  assert.throws(
    () =>
      D.addTemplate(s, "player", {
        sceneId: "old-watch",
        shape: "circle",
        origin: { x: 1, y: 1 },
        size: 3,
        color: "red",
        hidden: true,
      }),
    /Only the DM/,
  );
  D.updateTemplate(s, "dm", trap.id, { hidden: false, pattern: "fire" });
  const seen = D.visibleTemplates(s, "old-watch", "player");
  assert.equal(seen.length, 1);
  assert.equal(seen[0].pattern, "fire");
  assert.equal(seen[0].canEdit, false, "the player cannot change the DM's template");
  D.updateTemplate(s, "dm", trap.id, { locked: true });
  assert.throws(() => D.updateTemplate(s, "dm", trap.id, { origin: { x: 100, y: 100 } }), /locked/);
  assert.throws(() => D.removeTemplate(s, "dm", trap.id), /locked/);
  assert.deepEqual(D.sliceOf(s).templates[0].origin, { x: 500, y: 330 });
  D.updateTemplate(s, "dm", trap.id, { locked: false });
  D.updateTemplate(s, "dm", trap.id, { origin: { x: 520, y: 330 } });
  assert.equal(D.sliceOf(s).templates[0].origin.x, 520);
  assert.throws(
    () => D.updateTemplate(s, "dm", trap.id, { pattern: "sonic" }),
    /Pattern not available/,
  );
});

test("SRD 5.2.1 areas: cone width equals its distance; cube from a face; line length × width", () => {
  const scene = { gridSize: 50, metersPerCell: 1.5, width: 1000, height: 650 };
  const cone = D.areaGeometry(scene, {
    shape: "cone",
    origin: { x: 0, y: 0 },
    angle: 0,
    size: 4.5,
  });
  const [, a, b] = cone.points;
  assert.equal(
    Math.round(Math.hypot(a.x - b.x, a.y - b.y)),
    150,
    "15 ft wide at 15 ft (4,5 m = 150 px)",
  );
  assert.ok(
    D.areaContains(
      scene,
      { shape: "cone", origin: { x: 0, y: 0 }, angle: 0, size: 4.5 },
      { x: 100, y: 40 },
    ),
  );
  assert.ok(
    !D.areaContains(
      scene,
      { shape: "cone", origin: { x: 0, y: 0 }, angle: 0, size: 4.5 },
      { x: 40, y: 40 },
    ),
  );
  const cube = D.areaGeometry(scene, {
    shape: "square",
    origin: { x: 0, y: 0 },
    angle: 0,
    size: 3,
  });
  assert.deepEqual(
    cube.points.map((p) => [Math.round(p.x), Math.round(p.y)]).sort(),
    [
      [0, -50],
      [0, 50],
      [100, -50],
      [100, 50],
    ].sort(),
  );
  const line = D.areaGeometry(scene, {
    shape: "line",
    origin: { x: 0, y: 0 },
    angle: 90,
    size: 9,
    width: 1.5,
  });
  assert.equal(Math.round(line.tip.y), 300);
  assert.deepEqual(D.SRD.pages.cone, [179, 206]);
  assert.deepEqual(D.SRD.pages.emanation, [181, 207]);
});

test("shared measurements: one per author, replaced by the next; only the author or the DM removes it", () => {
  const s = stateWithSlice();
  const first = D.shareMeasure(s, "player", {
    sceneId: "old-watch",
    shape: "cone",
    origin: { x: 250, y: 380 },
    angle: 0,
    size: 4.5,
  });
  D.shareMeasure(s, "player", {
    sceneId: "old-watch",
    shape: "line",
    points: [
      { x: 250, y: 380 },
      { x: 400, y: 380 },
    ],
  });
  assert.equal(D.visibleMeasures(s, "old-watch", "dm").length, 1);
  assert.ok(!D.visibleMeasures(s, "old-watch", "dm").some((m) => m.id === first.id));
  const scene = D.sceneOf(s);
  assert.equal(
    D.measureSummary(scene, D.visibleMeasures(s, "old-watch", "dm")[0], "it"),
    "Misura diretta: 4,5 m",
  );
  assert.equal(
    D.measureSummary(scene, { shape: "cone", origin: { x: 0, y: 0 }, size: 4.5 }, "en"),
    "Cone · length 4.5 m",
  );
  const own = D.ownSharedMeasure(s, "old-watch", "player");
  D.shareMeasure(s, "dm", {
    sceneId: "old-watch",
    shape: "rings",
    origin: { x: 1, y: 1 },
    radii: [9, 1.5],
  });
  assert.throws(
    () => D.removeSharedMeasure(s, "player", D.ownSharedMeasure(s, "old-watch", "dm").id),
    /only your own/,
  );
  D.removeSharedMeasure(s, "dm", own.id);
  assert.equal(D.visibleMeasures(s, "old-watch", "player").length, 1);
  assert.deepEqual(D.parseRingPresets("1,5; 9;18 36; x; 999"), [1.5, 9, 18, 36]);
  assert.deepEqual(D.parseRingPresets(""), [1.5, 9, 18, 36]);
});

test("auras: 3 m on Livia follows her token; the radius adds half her space; two per token at most", () => {
  const s = stateWithSlice();
  assert.throws(
    () => D.setAura(s, "player", { actorId: "goblin-1", radius: 3, color: "teal" }),
    /control/,
  );
  const aura = D.setAura(s, "player", {
    actorId: "livia",
    radius: 3,
    color: "teal",
    audience: "all",
  });
  const scene = D.sceneOf(s);
  let drawn = D.visibleAuras(s, "old-watch", "dm")[0];
  assert.equal(drawn.x, 250);
  assert.equal(drawn.r, 100 + 25, "3 m = 100 px plus half a Medium space");
  scene.tokens.find((t) => t.actorId === "livia").x = 400;
  drawn = D.visibleAuras(s, "old-watch", "dm")[0];
  assert.equal(drawn.x, 400, "the aura moves with the token");
  D.setAura(s, "player", { actorId: "livia", radius: 9, color: "blue", audience: "me" });
  assert.equal(
    D.visibleAuras(s, "old-watch", "dm").length,
    1,
    "the private aura never reaches the DM",
  );
  assert.throws(
    () => D.setAura(s, "player", { actorId: "livia", radius: 1, color: "red" }),
    /two auras/,
    "Livia's player sees two auras: the third is refused",
  );
  // The DM does not see the player's private aura: it neither counts nor is revealed.
  D.setAura(s, "dm", { actorId: "livia", radius: 1, color: "red" });
  assert.equal(D.aurasOf(s, "livia", "dm").length, 2);
  assert.throws(
    () => D.setAura(s, "dm", { actorId: "livia", radius: 1, color: "red" }),
    /two auras/,
  );
  const privateAura = D.sliceOf(s).auras.find((a) => a.audience === "me");
  assert.throws(
    () => D.setAura(s, "dm", { id: privateAura.id, actorId: "livia", radius: 2, color: "red" }),
    /not found/,
  );
  D.setAura(s, "player", { id: aura.id, actorId: "livia", radius: 4.5, color: "teal" });
  assert.equal(D.sliceOf(s).auras.find((a) => a.id === aura.id).radius, 4.5);
});

test("tooltips: Only me stays private both ways; one note per token and author", () => {
  const s = stateWithSlice();
  assert.equal(
    D.visibleTooltips(s, "goblin-1", "player").length,
    0,
    "the DM's private note on the Sentinella",
  );
  assert.equal(D.visibleTooltips(s, "goblin-1", "dm").length, 1);
  D.setTooltip(s, "player", { actorId: "doran", text: "Ha la chiave del pozzo", audience: "all" });
  D.setTooltip(s, "player", {
    actorId: "doran",
    text: "Ha la chiave del pozzo nord",
    audience: "all",
  });
  D.setTooltip(s, "player", { actorId: "goblin-1", text: "Sembra addormentata", audience: "me" });
  assert.equal(D.visibleTooltips(s, "doran", "dm")[0].text, "Ha la chiave del pozzo nord");
  assert.equal(D.sliceOf(s).tooltips.filter((t) => t.actorId === "doran").length, 1);
  assert.equal(D.visibleTooltips(s, "goblin-1", "dm").length, 1, "DM sees only its own note");
  assert.equal(D.visibleTooltips(s, "goblin-1", "player").length, 1);
  const privateNote = D.sliceOf(s).tooltips.find(
    (t) => t.author === "player" && t.audience === "me",
  );
  assert.throws(() => D.removeTooltip(s, "dm", privateNote.id), /not found/);
  assert.throws(
    () => D.setTooltip(s, "player", { actorId: "doran", text: "x".repeat(281) }),
    /280/,
  );
});

test("distances: nearest first, the Sentinella's 3 m elevation counts; hidden tokens only for the DM", () => {
  const s = stateWithSlice();
  const rows = D.distanceRows(s, "old-watch", "livia", "player");
  assert.deepEqual(
    rows.map((r) => r.actorId),
    ["doran", "mira", "goblin-1", "goblin-2"].filter((id) => rows.some((r) => r.actorId === id)),
  );
  const sentinella = rows.find((r) => r.actorId === "goblin-1");
  assert.equal(sentinella.dz, 3);
  assert.ok(sentinella.meters > sentinella.horizontal);
  const scene = D.sceneOf(s);
  scene.tokens.find((t) => t.actorId === "doran").x = 280;
  scene.tokens.find((t) => t.actorId === "doran").y = 380;
  assert.equal(D.distanceRows(s, "old-watch", "livia", "player")[0].touch, true, "within 1,5 m");
  scene.tokens.find((t) => t.actorId === "goblin-2").hidden = true;
  assert.ok(
    !D.distanceRows(s, "old-watch", "livia", "player").some((r) => r.actorId === "goblin-2"),
  );
  assert.ok(D.distanceRows(s, "old-watch", "livia", "dm").some((r) => r.actorId === "goblin-2"));
  assert.throws(
    () =>
      D.setElevation(s, "player", { sceneId: "old-watch", tokenId: "token-goblin-1", meters: 0 }),
    /control/,
  );
  D.setElevation(s, "dm", { sceneId: "old-watch", tokenId: "token-goblin-1", meters: 0 });
  assert.equal(D.elevationOf(s, "token-goblin-1"), 0);
});

test("signal bus: pings expire, only the DM proposes a view, the recipient answers", () => {
  let now = 1000;
  const b = D.createSignalBus({ clock: () => now });
  const ping = b.send({
    kind: "ping",
    from: "player",
    name: "Livia",
    sceneId: "old-watch",
    x: 10,
    y: 20,
  });
  assert.equal(ping.colour, D.identityColour("player"));
  assert.equal(
    b.send({ kind: "alert", from: "player", sceneId: "old-watch", x: 1, y: 1 }).colour,
    D.ALERT_COLOUR,
  );
  assert.throws(
    () => b.send({ kind: "recall", from: "player", sceneId: "old-watch", x: 1, y: 1 }),
    /Only the DM/,
  );
  const recall = b.send({
    kind: "recall",
    from: "dm",
    name: "DM",
    sceneId: "old-watch",
    x: 900,
    y: 600,
    zoom: 2,
  });
  assert.equal(b.pendingRecall("player").id, recall.id);
  assert.equal(b.pendingRecall("dm"), null, "not proposed to its sender");
  b.respond(recall.id, "player", "accepted");
  assert.equal(b.pendingRecall("player"), null);
  assert.equal(b.lastRecallBy("dm").answers.player, "accepted");
  b.send({ kind: "laser", from: "dm", sceneId: "old-watch", x: 5, y: 5, trail: [{ x: 1, y: 1 }] });
  b.send({ kind: "laser", from: "dm", sceneId: "old-watch", x: 6, y: 6, trail: [{ x: 1, y: 1 }] });
  assert.equal(b.live("old-watch", "player").filter((s) => s.kind === "laser").length, 1);
  now += D.SIGNAL_TTL.ping + 1;
  assert.equal(b.live("old-watch", "player").filter((s) => s.kind === "ping").length, 0, "expired");
});

// ---------------------------------------------------------------- registry, UI and tools

test("contributions: Measure and Pointer replaced, Draw and Template tools, layers, panels, menu, settings", () => {
  const { ctx, registry } = harness();
  assert.ok(tool(registry, "measure").replaces);
  assert.ok(tool(registry, "pointer").replaces);
  assert.ok(tool(registry, "annotations-draw"));
  assert.ok(tool(registry, "annotations-template"));
  assert.deepEqual(
    registry.list("map-layer", ctx, {}).map((c) => c.id),
    ["annotations-areas", "annotations-signals"],
  );
  assert.deepEqual(
    registry.list("token-menu", ctx, { actorId: "livia", sceneId: "old-watch" }).map((c) => c.id),
    ["annotations-aura", "annotations-tooltip", "annotations-elevation"],
  );
  assert.deepEqual(
    registry
      .list("token-menu", ctx, { actorId: "goblin-1", sceneId: "old-watch" })
      .map((c) => c.id),
    ["annotations-tooltip"],
  );
  assert.deepEqual(
    registry.list("command", ctx).map((c) => [c.id, c.shortcut ?? null]),
    [
      ["annotations.measure", "R"],
      ["annotations.pointer", "X"],
      ["annotations.template", "O"],
      ["annotations.draw", null],
      ["annotations.aura", "E"],
      ["annotations.clear-mine", null],
    ],
  );
  resetTableView();
  const html = renderTable(ctx);
  assert.match(html, /data-tool="measure"[^>]*aria-label="Misura"/);
  assert.ok(html.includes(icon("ruler")), "ruler icon on the replaced chip");
  assert.match(html, /data-tool="annotations-draw"[^>]*aria-label="Disegna"/);
  assert.match(html, /data-tool="annotations-template"[^>]*aria-label="Sagoma"/);
  assert.match(html, /data-annot-distances/);
  assert.match(html, /data-table-drawer="annotations-list"/);
  resetTableView();
});

test("tool memory: the last colour and shape survive a new registry on the same device (reload)", () => {
  const device = memory();
  const first = harness({ device });
  assert.equal(pref(first.ctx, "draw-color"), "gold");
  first.registry.setSetting(first.ctx, "annotations-tools.draw-color", "red");
  first.registry.setSetting(first.ctx, "annotations-tools.template-pattern", "fire");
  first.registry.setSetting(first.ctx, "annotations-tools.ring-theme", "tritanopia");
  const second = harness({ device });
  assert.equal(pref(second.ctx, "draw-color"), "red");
  assert.equal(pref(second.ctx, "template-pattern"), "fire");
  assert.equal(pref(second.ctx, "ring-theme"), "tritanopia");
  assert.equal(second.store.state.log.length, 0, "tool memory is not game state");
});

test("draw tool: a dragged arrow commits as Livia; Undo removes it; the eraser keeps others' drawings", () => {
  const { ctx, registry, store } = harness();
  const table = fakeTable(ctx);
  ctx.registry.setSetting(ctx, "annotations-tools.draw-mode", "arrow");
  drag(tool(registry, "annotations-draw"), ctx, table, { x: 250, y: 380 }, { x: 600, y: 260 });
  const marks = D.sliceOf(store.state).marks;
  assert.equal(marks.length, 1);
  assert.equal(marks[0].kind, "arrow");
  assert.equal(marks[0].asActorId, "livia");
  assert.match(store.state.log.at(-1).label, /Disegno aggiunto: freccia/);
  ctx.undo();
  assert.equal(D.sliceOf(store.state).marks.length, 0);
  // The DM's ellipse cannot be erased by the player.
  ctx.role = "dm";
  ctx.registry.setSetting(ctx, "annotations-tools.draw-mode", "rect");
  drag(tool(registry, "annotations-draw"), ctx, table, { x: 600, y: 200 }, { x: 700, y: 300 });
  ctx.role = "player";
  ctx.registry.setSetting(ctx, "annotations-tools.draw-mode", "erase");
  click(tool(registry, "annotations-draw"), ctx, table, { x: 600, y: 250 });
  assert.equal(D.sliceOf(store.state).marks.length, 1);
  assert.match(table.messages.at(-1), /l'autore ne è il proprietario/);
  // Text mode on a token writes the token's note (Owlbear Tooltips).
  ctx.registry.setSetting(ctx, "annotations-tools.draw-mode", "text");
  click(tool(registry, "annotations-draw"), ctx, table, { x: 350, y: 450 }, { actor: "doran" });
  assert.match(ctx.dialogs.at(-1).title, /Nota sulla pedina · Doran/);
});

test("template tool: DM drags a hidden cone, names it, reveals it with fire; locked, a drag does not move it", () => {
  const { ctx, registry, store } = harness({ role: "dm" });
  const table = fakeTable(ctx, { selected: "doran" });
  const tpl = tool(registry, "annotations-template");
  annotationsView().newHidden = true;
  drag(tpl, ctx, table, { x: 500, y: 330 }, { x: 650, y: 330 });
  const [trap] = D.sliceOf(store.state).templates;
  assert.equal(trap.shape, "cone");
  assert.equal(trap.size, 4.5);
  assert.equal(trap.hidden, true);
  assert.equal(
    store.state.log.at(-1).visibility,
    "private",
    "a hidden trap stays out of the shared log",
  );
  assert.equal(annotationsView().selectedTemplate, trap.id);
  ctx.commit("rename", (s) => D.updateTemplate(s, "dm", trap.id, { label: "Trappola" }), {
    visibility: "private",
  });
  // The player's Table markup carries nothing of the hidden trap.
  const player = harness({ role: "player" });
  player.store.state.ext = store.state.ext;
  resetTableView();
  assert.doesNotMatch(renderTable(player.ctx), /Trappola/);
  resetTableView();
  ctx.registry.setSetting(ctx, "annotations-tools.template-pattern", "fire");
  ctx.commit("reveal", (s) =>
    D.updateTemplate(s, "dm", trap.id, { hidden: false, pattern: "fire" }),
  );
  assert.equal(D.visibleTemplates(store.state, "old-watch", "player")[0].pattern, "fire");
  // Shift+L locks the selected template; a drag on it then leaves it where it was.
  tpl.onKeyDown(ctx, { ...ev(0, 0), key: "L", shiftKey: true }, table);
  assert.equal(D.sliceOf(store.state).templates[0].locked, true);
  drag(tpl, ctx, table, { x: 560, y: 330 }, { x: 700, y: 500 });
  assert.deepEqual(D.sliceOf(store.state).templates[0].origin, { x: 500, y: 330 });
  assert.match(table.messages.at(-1), /bloccata/);
  tpl.onKeyDown(ctx, { ...ev(0, 0), key: "Delete" }, table);
  assert.equal(D.sliceOf(store.state).templates.length, 1, "locked: not deleted");
});

test("measure tool: hover reads Direct measurement; clicks add legs; a dragged cone goes on release; a pinned one is shared", () => {
  const { ctx, registry, store } = harness();
  const table = fakeTable(ctx);
  const measure = tool(registry, "measure");
  measure.onPointerMove(ctx, ev(550, 380), table);
  assert.equal(table.messages.at(-1), "Misura diretta: 9 m");
  click(measure, ctx, table, { x: 400, y: 380 });
  click(measure, ctx, table, { x: 400, y: 530 });
  assert.equal(annotationsView().measure.points.length, 3);
  measure.onKeyDown(ctx, { ...ev(0, 0), key: "Backspace", target: { closest: () => null } }, table);
  assert.equal(annotationsView().measure.points.length, 2);
  assert.equal(store.state.log.length, 0, "a private measurement changes no shared state");
  // Owlbear/DDB: a drag measurement is removed on release (VTL-135, DDB-124).
  annotationsView().measure = null;
  ctx.registry.setSetting(ctx, "annotations-tools.measure-shape", "cone");
  drag(measure, ctx, table, { x: 250, y: 380 }, { x: 400, y: 380 });
  assert.equal(annotationsView().measure, null, "the dragged cone does not stay");
  assert.match(table.messages.at(-1), /^Cono · lunghezza 4,5 m · temporanea/);
  assert.equal(bus.size(), 0, "private: nothing broadcast");
  // Arrow keys + Enter from the selected token pin a cone.
  const key = (k) =>
    measure.onKeyDown(ctx, { ...ev(0, 0), key: k, target: { closest: () => null } }, table);
  for (let i = 0; i < 3; i++) key("ArrowRight");
  key("Enter");
  assert.equal(annotationsView().measure.shape, "cone");
  assert.equal(annotationsView().measure.frozen, true);
  assert.equal(
    D.visibleMeasures(store.state, "old-watch", "dm").length,
    0,
    "private: the DM sees nothing",
  );
  // A game action, then "Condivisa": the pinned cone is published outside the gameplay Undo.
  ctx.commit("Livia si sposta", (s) => {
    s.scenes[0].tokens.find((t) => t.actorId === "livia").x = 260;
  });
  const history = store.history.length;
  annotationsAction(ctx, table, "share");
  const shared = D.visibleMeasures(store.state, "old-watch", "dm");
  assert.equal(shared.length, 1);
  assert.equal(shared[0].shape, "cone");
  assert.match(store.state.log.at(-1).label, /Misura condivisa: Cono · lunghezza 4,5 m/);
  assert.equal(store.state.log.at(-1).visibility, "private", "not in the others' log");
  assert.equal(store.history.length, history, "not an undo step");
  ctx.undo();
  assert.equal(
    store.state.scenes[0].tokens.find((t) => t.actorId === "livia").x,
    250,
    "Undo reverts the game action",
  );
  assert.equal(D.visibleMeasures(store.state, "old-watch", "dm").length, 1, "the measure stays");
  // Shared drag: broadcast while dragging and on release (Roll20 R20-136), never stored.
  drag(measure, ctx, table, { x: 250, y: 380 }, { x: 250, y: 530 });
  const signal = bus.live("old-watch", "dm").find((s) => s.kind === "measure");
  assert.equal(signal.measure.shape, "cone");
  assert.equal(signal.name, "Livia");
  assert.equal(D.SIGNAL_TTL.measure, 2000);
  assert.equal(D.visibleMeasures(store.state, "old-watch", "dm").length, 1, "still one stored");
  // Offline: the broadcast is refused with a reason, the reading stays for the author.
  ctx.offline = true;
  bus.clear();
  drag(measure, ctx, table, { x: 250, y: 380 }, { x: 250, y: 530 });
  assert.equal(ctx.toasts.at(-1).error, true);
  assert.equal(bus.size(), 0);
  assert.match(table.messages.at(-1), /senza rete/);
});

test("measure rings: themed rings stay in place when the token moves; distances update", () => {
  const { ctx, registry, store } = harness();
  const table = fakeTable(ctx);
  const measure = tool(registry, "measure");
  ctx.registry.setSetting(ctx, "annotations-tools.measure-shape", "rings");
  ctx.registry.setSetting(ctx, "annotations-tools.ring-theme", "deuteranopia");
  click(measure, ctx, table, { x: 250, y: 380 }, { actor: "livia" });
  const rings = annotationsView().rings;
  assert.deepEqual(rings.radii, [1.5, 9, 18, 36]);
  assert.equal(rings.theme, "deuteranopia");
  assert.equal(rings.actorId, "livia");
  const before = D.distanceRows(store.state, "old-watch", "livia", "player").find(
    (r) => r.actorId === "goblin-2",
  ).meters;
  ctx.commit("move", (s) => (s.scenes[0].tokens.find((t) => t.actorId === "livia").x = 430));
  assert.deepEqual(
    annotationsView().rings.origin,
    { x: 250, y: 380 },
    "rings stay where they were placed",
  );
  const after = D.distanceRows(store.state, "old-watch", "livia", "player").find(
    (r) => r.actorId === "goblin-2",
  ).meters;
  assert.ok(after < before);
  resetTableView();
  const html = renderTable(ctx);
  assert.match(html, /data-annot-rings data-theme="deuteranopia"/);
  assert.match(html, /Livia: spostata di 5,4 m/);
  resetTableView();
});

test("P6 TV-38: a tap places the rings; changing the colour theme recolours rings already placed", () => {
  const { ctx, registry } = harness();
  const table = fakeTable(ctx);
  const measure = tool(registry, "measure");
  ctx.registry.setSetting(ctx, "annotations-tools.measure-shape", "rings");
  ctx.registry.setSetting(ctx, "annotations-tools.ring-theme", "standard");
  // A tap (press and release on the same spot) places them: no long press needed.
  click(measure, ctx, table, { x: 400, y: 300 });
  assert.equal(annotationsView().rings?.theme, "standard");
  resetTableView();
  assert.match(renderTable(ctx), /data-annot-rings data-theme="standard"/);
  ctx.registry.setSetting(ctx, "annotations-tools.ring-theme", "deuteranopia");
  resetTableView();
  const html = renderTable(ctx);
  assert.match(
    html,
    /data-annot-rings data-theme="deuteranopia"/,
    "the placed rings follow the theme",
  );
  resetTableView();
});

test("ring theme 'auto' follows the colour-vision preference when that area is loaded", () => {
  const device = memory();
  const registry = createRegistry({ logger: null, document: null, deviceStorage: device });
  registry.use("annotations", register);
  registry.use("preferences", (api) =>
    api.add("settings", {
      id: "preferences-access",
      label: { it: "Accessibilità", en: "Accessibility" },
      scope: "device",
      fields: [
        {
          id: "color-vision",
          label: { it: "Visione", en: "Vision" },
          type: "choice",
          default: "standard",
          options: ["standard", "protanopia", "deuteranopia", "tritanopia"].map((value) => ({
            value,
            label: { it: value, en: value },
          })),
        },
      ],
    }),
  );
  const ctx = { role: "player", lang: "it", render() {}, state: createInitialState() };
  registry.attach(ctx);
  assert.equal(ringTheme(ctx), "standard");
  registry.setSetting(ctx, "preferences-access.color-vision", "protanopia");
  assert.equal(ringTheme(ctx), "protanopia", "auto follows the vision preference");
  registry.setSetting(ctx, "annotations-tools.ring-theme", "tritanopia");
  assert.equal(ringTheme(ctx), "tritanopia", "an explicit choice wins");
});

test("pointer tool: click pings in the user's colour, Alt+click alerts, the DM's Shift+click proposes the view", () => {
  const { ctx, registry } = harness();
  const table = fakeTable(ctx);
  const pointer = tool(registry, "pointer");
  click(pointer, ctx, table, { x: 900, y: 600 });
  click(pointer, ctx, table, { x: 950, y: 100 }, { altKey: true });
  let live = bus.live("old-watch", "dm");
  assert.deepEqual(
    live.map((s) => [s.kind, s.name]),
    [
      ["ping", "Livia"],
      ["alert", "Livia"],
    ],
  );
  assert.equal(live[1].colour, D.ALERT_COLOUR);
  click(pointer, ctx, table, { x: 100, y: 100 }, { shiftKey: true });
  assert.equal(
    bus.live("old-watch", "dm").filter((s) => s.kind === "recall").length,
    0,
    "a player's Shift+click is a ping",
  );
  ctx.role = "dm";
  click(pointer, ctx, table, { x: 900, y: 600 }, { shiftKey: true });
  assert.equal(bus.pendingRecall("player").name, "DM");
  const notes = registry.notifications({ ...ctx, role: "player" });
  assert.equal(notes.length, 1);
  assert.match(notes[0].title.it, /propone di guardare/);
  // Permission off: the player's pointer is refused with its reason.
  ctx.registry.setSetting(ctx, "annotations-table.players-pointer", false);
  assert.equal(permissions(ctx).playersPointer, false);
  ctx.role = "player";
  const count = bus.size();
  click(pointer, ctx, table, { x: 10, y: 10 });
  assert.equal(bus.size(), count);
  assert.match(table.messages.at(-1), /disattivato puntatore/);
  // Offline: no signal leaves.
  ctx.role = "dm";
  ctx.offline = true;
  click(pointer, ctx, table, { x: 10, y: 10 });
  assert.equal(bus.size(), count);
});

test("dialogs: aura, token note and elevation commit through the shared store with the right audience", () => {
  const { ctx, registry, store } = harness();
  fakeTable(ctx);
  registry
    .get("token-menu", "annotations-aura")
    .run(ctx, { actorId: "livia", sceneId: "old-watch" });
  const aura = ctx.dialogs.at(-1);
  const form = (fields) => ({ get: (key) => fields[key] ?? null });
  aura.options.onSubmit(
    form({
      radius: "3",
      shape: "circle",
      color: "teal",
      opacity: "25",
      audience: "all",
      label: "Aura",
    }),
  );
  assert.equal(D.sliceOf(store.state).auras[0].radius, 3);
  assert.equal(store.state.log.at(-1).visibility, "shared");
  registry
    .get("token-menu", "annotations-tooltip")
    .run(ctx, { actorId: "goblin-1", sceneId: "old-watch" });
  ctx.dialogs.at(-1).options.onSubmit(form({ text: "Sembra addormentata", audience: "me" }));
  assert.equal(
    store.state.log.at(-1).visibility,
    "private",
    "a Solo io note is a private local change",
  );
  assert.equal(
    D.visibleTooltips(store.state, "goblin-1", "dm").length,
    1,
    "DM: only its own seed note",
  );
  registry
    .get("token-menu", "annotations-elevation")
    .run(ctx, { actorId: "livia", sceneId: "old-watch" });
  ctx.dialogs.at(-1).options.onSubmit(form({ meters: "4,5" }));
  assert.equal(D.elevationOf(store.state, "token-livia"), 4.5);
  // English labels.
  ctx.lang = "en";
  resetTableView();
  const html = renderTable(ctx);
  assert.match(html, /aria-label="Measure"/);
  assert.match(html, /Distances|From/);
  resetTableView();
});

// ---------------------------------------------------------------- review fixes (B18)

/** Markup of one of this area's map layers, as the Table or a projection draws it. */
const layer = (registry, ctx, id, tv) => registry.get("map-layer", id).svg(ctx, tv);
const tableView = (ctx, extra = {}) => ({
  scene: ctx.state.scenes.find((s) => s.id === ctx.state.activeSceneId),
  selectedActorId: null,
  mode: "move",
  zoom: 1,
  pan: { x: 0, y: 0 },
  ...extra,
});

test("review P1: shared rings never reveal the name or position of a token the DM hides", () => {
  const { ctx, registry, store } = harness({ role: "dm" });
  const table = fakeTable(ctx, { selected: "goblin-2" });
  ctx.registry.setSetting(ctx, "annotations-tools.measure-shape", "rings");
  ctx.registry.setSetting(ctx, "annotations-tools.measure-share", true);
  click(tool(registry, "measure"), ctx, table, { x: 740, y: 340 }, { actor: "goblin-2" });
  assert.equal(D.visibleMeasures(store.state, "old-watch", "player")[0].actorId, "goblin-2");
  ctx.commit("hide and move", (s) => {
    const token = s.scenes[0].tokens.find((t) => t.actorId === "goblin-2");
    Object.assign(token, { hidden: true, x: 890, y: 520 });
  });
  const dm = layer(registry, ctx, "annotations-areas", tableView(ctx));
  assert.match(dm, /Esploratore: spostata di 7 m/, "the DM still reads the moved distance");
  ctx.role = "player";
  const player = layer(registry, ctx, "annotations-areas", tableView(ctx));
  assert.match(player, /data-annot-rings/, "the rings the DM shared stay visible");
  assert.doesNotMatch(player, /Esploratore|annotations-moved|x2="890"/);
  // The same for the read-only projection (B14 spectator display, "view as").
  const spectator = Object.create(ctx, { role: { value: "spectator" } });
  assert.doesNotMatch(
    layer(registry, spectator, "annotations-areas", tableView(ctx)),
    /Esploratore|annotations-moved/,
  );
});

test("review P2: one players' pointer switch: the campaign setting the core toolbar reads", () => {
  const { ctx, store } = harness({ role: "dm" });
  ctx.registry.setSetting(ctx, "annotations-table.players-pointer", false);
  // table.mjs (chip lock) and B20 (campaign-settings) read this very key.
  assert.equal(
    store.state.ext["core-settings"].campaign["annotations-table.players-pointer"],
    false,
  );
  assert.equal(permissions(ctx).playersPointer, false);
  ctx.role = "player";
  resetTableView();
  const html = renderTable(ctx);
  assert.match(html, /data-tool="pointer" aria-disabled="true"/);
  resetTableView();
  ctx.role = "dm";
  ctx.registry.setSetting(ctx, "annotations-table.players-pointer", true);
  assert.equal(permissions(ctx).playersPointer, true);
});

test("review P2: the Aura dialog adds a new aura while fewer than two; editing starts from a row", () => {
  const { ctx, store } = harness();
  fakeTable(ctx);
  const form = (fields) => ({ get: (key) => fields[key] ?? null });
  const fields = (extra) => ({
    radius: "3",
    shape: "circle",
    color: "teal",
    opacity: "25",
    audience: "all",
    label: "",
    ...extra,
  });
  openAuraDialog(ctx, "livia");
  let dialog = ctx.dialogs.at(-1);
  assert.match(dialog.body, /<option value="" selected>Nuova aura<\/option>/);
  assert.equal(dialog.options.submitLabel, "Aggiungi aura");
  dialog.options.onSubmit(form(fields({ id: "", label: "Protezione" })));
  // Reopening (E) again starts from "New aura": the first one is not overwritten.
  openAuraDialog(ctx, "livia");
  dialog = ctx.dialogs.at(-1);
  assert.match(dialog.body, /<option value="" selected>Nuova aura<\/option>/);
  assert.match(dialog.body, /data-annot-aura-pick=/, "each aura row has its own Edit");
  dialog.options.onSubmit(form(fields({ id: "", radius: "6", label: "Luce" })));
  assert.deepEqual(
    D.sliceOf(store.state).auras.map((a) => [a.label, a.radius]),
    [
      ["Protezione", 3],
      ["Luce", 6],
    ],
  );
  // Two auras: "New aura" is disabled and the dialog edits one explicitly.
  openAuraDialog(ctx, "livia");
  dialog = ctx.dialogs.at(-1);
  assert.match(dialog.body, /<option value="" disabled>Nuova aura \(massimo due/);
  assert.equal(dialog.options.submitLabel, "Salva aura");
  const luce = D.sliceOf(store.state).auras.find((a) => a.label === "Luce");
  openAuraDialog(ctx, "livia", { auraId: luce.id });
  dialog = ctx.dialogs.at(-1);
  assert.match(dialog.body, new RegExp(`<option value="${luce.id}" selected>`));
  assert.match(dialog.body, /name="radius"[^>]*value="6"/);
});

test("review P2: projections (spectator, view as) draw only shared annotations", () => {
  const { ctx, registry, store } = harness({ role: "dm" });
  const table = fakeTable(ctx);
  ctx.commit("drawing", (s) =>
    D.addMark(s, "player", {
      sceneId: "old-watch",
      kind: "arrow",
      points: [
        { x: 280, y: 360 },
        { x: 560, y: 290 },
      ],
      color: "blue",
    }),
  );
  ctx.commit("trap", (s) =>
    D.addTemplate(s, "dm", {
      sceneId: "old-watch",
      shape: "cone",
      origin: { x: 500, y: 330 },
      size: 4.5,
      color: "red",
      hidden: true,
      label: "Trappola",
    }),
  );
  ctx.commit("cone", (s) =>
    D.addTemplate(s, "player", {
      sceneId: "old-watch",
      shape: "circle",
      origin: { x: 450, y: 520 },
      size: 3,
      color: "orange",
    }),
  );
  // This browser's private measurement, rings, cursor and a view proposal.
  annotationsView().measure = {
    sceneId: "old-watch",
    shape: "line",
    points: [
      { x: 1, y: 1 },
      { x: 90, y: 90 },
    ],
    frozen: true,
  };
  annotationsView().cursor = { x: 10, y: 10 };
  bus.send({ kind: "recall", from: "dm", name: "DM", sceneId: "old-watch", x: 5, y: 5 });
  bus.send({ kind: "ping", from: "player", name: "Livia", sceneId: "old-watch", x: 9, y: 9 });
  const spectator = Object.create(ctx, { role: { value: "spectator" } });
  const tv = tableView(ctx, { mode: "view" });
  const areas = layer(registry, spectator, "annotations-areas", tv);
  assert.equal((areas.match(/data-annot-mark=/g) ?? []).length, 1, "the shared arrow");
  assert.equal((areas.match(/data-annot-template=/g) ?? []).length, 1, "the public circle only");
  assert.doesNotMatch(areas, /Trappola|data-annot-measure="local"|data-annot-live/);
  const signals = layer(registry, spectator, "annotations-signals", tv);
  assert.match(signals, /data-annot-signal="ping"/);
  assert.doesNotMatch(signals, /data-annot-signal="recall"|annotations-cursor|foreignObject/);
  // On the DM's own Table the private items are still there.
  assert.match(layer(registry, ctx, "annotations-areas", tv), /data-annot-measure="local"/);
  assert.ok(table);
  assert.equal(store.state.log.length, 3);
});

test("review P2: token to token the Measure readout adds the elevation; Distances label the flat value", () => {
  const { ctx, registry, store } = harness();
  const table = fakeTable(ctx);
  ctx.commit("Livia next to the Sentinella", (s) => {
    Object.assign(
      s.scenes[0].tokens.find((t) => t.actorId === "livia"),
      { x: 570, y: 250 },
    );
  });
  table.scene = store.state.scenes[0];
  tool(registry, "measure").onPointerMove(ctx, ev(620, 250, { actor: "goblin-1" }), table);
  assert.equal(table.messages.at(-1), "Misura diretta: 1,5 m · 3,4 m con la quota (↑ 3 m)");
  resetTableView();
  const html = renderTable(ctx);
  assert.match(html, /↑ 3 m · in pianta 1,5 m/);
  assert.match(html, /misurano ancora in pianta/);
  resetTableView();
});

test("review P3: the eraser hits a text drawing on its words, not on the empty map to its left", () => {
  const text = {
    kind: "text",
    points: [{ x: 430, y: 170 }],
    text: "Porta nord verso il pozzo",
    width: 2,
  };
  assert.ok(D.markContains(text, { x: 430 + 231 * 0.9, y: 165 }), "right part of the words");
  assert.ok(D.markContains(text, { x: 440, y: 160 }), "first letters");
  assert.ok(!D.markContains(text, { x: 380, y: 165 }), "50 px to the left");
  assert.ok(!D.markContains(text, { x: 520, y: 220 }), "below the line");
});

test("review P3: offline, a shared token note or aura cannot be withdrawn to Only me", () => {
  const { ctx, store } = harness();
  fakeTable(ctx);
  const form = (fields) => ({ get: (key) => fields[key] ?? null });
  ctx.commit("note", (s) =>
    D.setTooltip(s, "player", { actorId: "doran", text: "Ha la chiave", audience: "all" }),
  );
  ctx.commit("aura", (s) =>
    D.setAura(s, "player", { actorId: "livia", radius: 3, color: "teal", audience: "all" }),
  );
  ctx.offline = true;
  ctx.registry.get("token-menu", "annotations-tooltip").run(ctx, { actorId: "doran" });
  assert.throws(
    () => ctx.dialogs.at(-1).options.onSubmit(form({ text: "Ha la chiave", audience: "me" })),
    /offline/,
  );
  const aura = D.sliceOf(store.state).auras[0];
  openAuraDialog(ctx, "livia", { auraId: aura.id });
  assert.throws(
    () =>
      ctx.dialogs.at(-1).options.onSubmit(
        form({
          id: aura.id,
          radius: "3",
          shape: "circle",
          color: "teal",
          opacity: "25",
          audience: "me",
        }),
      ),
    /offline/,
  );
  assert.equal(D.sliceOf(store.state).tooltips.find((t) => t.actorId === "doran").audience, "all");
  assert.equal(D.sliceOf(store.state).auras[0].audience, "all");
  // A new private note stays possible offline (a local change).
  ctx.dialogs.length = 0;
  ctx.registry.get("token-menu", "annotations-tooltip").run(ctx, { actorId: "goblin-2" });
  ctx.dialogs.at(-1).options.onSubmit(form({ text: "Zoppica", audience: "me" }));
  assert.equal(store.state.log.at(-1).visibility, "private");
});

test("review P3: dragged template sizes snap to 1,5 m steps (Shift: free); the laser hides soon", () => {
  const { ctx, registry, store } = harness({ role: "dm" });
  const table = fakeTable(ctx);
  const tpl = tool(registry, "annotations-template");
  drag(tpl, ctx, table, { x: 500, y: 330 }, { x: 590, y: 330 });
  assert.equal(D.sliceOf(store.state).templates[0].size, 3, "90 px = 2,7 m → 3 m");
  annotationsView().selectedTemplate = null;
  drag(tpl, ctx, table, { x: 500, y: 500 }, { x: 590, y: 500 }, { shiftKey: true });
  assert.equal(D.sliceOf(store.state).templates[1].size, 2.7, "Shift keeps the free size");
  assert.equal(D.snapSize({ metersPerCell: 1.5 }, 0.4), 1.5, "at least one cell");
  assert.equal(D.SIGNAL_TTL.laser, 2000, "Roll20 pointer: auto-hides shortly after release");
});

test("review P3: a DM lock stays until the DM removes it; player templates off freezes theirs", () => {
  const { ctx, registry, store } = harness();
  const table = fakeTable(ctx);
  const tpl = tool(registry, "annotations-template");
  drag(tpl, ctx, table, { x: 450, y: 520 }, { x: 560, y: 520 });
  const [mine] = D.sliceOf(store.state).templates;
  ctx.role = "dm";
  annotationsAction(ctx, table, "tpl-lock");
  assert.equal(D.sliceOf(store.state).templates[0].lockedBy, "dm");
  ctx.role = "player";
  annotationsView().selectedTemplate = mine.id;
  let html = layer(
    registry,
    ctx,
    "annotations-signals",
    tableView(ctx, { mode: "annotations-template" }),
  );
  assert.match(html, /data-annot-swatches="selected"[^>]*disabled/, "colour disabled when locked");
  assert.match(html, /data-annot-act="tpl-lock"[^>]*disabled/, "a DM lock cannot be removed");
  annotationsAction(ctx, table, "tpl-lock");
  assert.equal(D.sliceOf(store.state).templates[0].locked, true);
  assert.match(table.messages.at(-1), /solo il DM può sbloccarla/);
  // The DM unlocks and turns player templates off: Livia's own template no longer moves.
  ctx.role = "dm";
  annotationsAction(ctx, table, "tpl-lock");
  ctx.registry.setSetting(ctx, "annotations-table.players-templates", false);
  ctx.role = "player";
  drag(tpl, ctx, table, { x: 500, y: 520 }, { x: 600, y: 600 });
  assert.deepEqual(D.sliceOf(store.state).templates[0].origin, mine.origin);
  assert.match(table.messages.at(-1), /disattivato le sagome/);
  assert.throws(
    () =>
      D.updateTemplate(
        store.state,
        "player",
        mine.id,
        { color: "red" },
        { perms: permissions(ctx) },
      ),
    /turned off player templates/,
  );
  html = layer(
    registry,
    ctx,
    "annotations-signals",
    tableView(ctx, { mode: "annotations-template" }),
  );
  assert.match(html, /disattivato le sagome/);
});

test("review P3: EN ring presets, a note keeps the character it was written as, Undo names what it undoes", () => {
  const { ctx, registry, store } = harness({ role: "dm", lang: "en" });
  const table = fakeTable(ctx);
  resetTableView();
  const drawer = registry
    .get("table-panel", "annotations-list")
    .render(ctx, tableView(ctx, { mode: "move" }));
  assert.match(drawer, /value="1\.5; 9; 18; 36"/);
  resetTableView();
  // Player acting as Mira (selected) writes a note on Doran: it stays Mira's.
  ctx.role = "player";
  ctx.lang = "it";
  table.selectedActorId = "mira";
  ctx.registry.get("token-menu", "annotations-tooltip").run(ctx, { actorId: "doran" });
  const form = (fields) => ({ get: (key) => fields[key] ?? null });
  ctx.dialogs.at(-1).options.onSubmit(form({ text: "Parla con Mira", audience: "all" }));
  assert.equal(
    D.sliceOf(store.state).tooltips.find((t) => t.actorId === "doran").asActorId,
    "mira",
  );
  table.selectedActorId = "livia";
  assert.equal(D.authorName(store.state, D.visibleTooltips(store.state, "doran", "dm")[0]), "Mira");
  // The bar's Undo button names the change it reverts (maybe not an annotation).
  ctx.commit("Danni a Doran", () => {});
  const bar = layer(
    registry,
    ctx,
    "annotations-signals",
    tableView(ctx, { mode: "annotations-draw" }),
  );
  assert.match(bar, /data-annot-act="undo" aria-label="Annulla: Danni a Doran"/);
});
