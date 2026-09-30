import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  CORE,
  EVENTS,
  POINTS,
  createRegistry,
  deriveStateEvents,
  normalizeShortcut,
  rollVisibleTo,
} from "../registry.mjs";
import { PLANNED_EXTENSIONS, loadExtensions } from "../extensions.mjs";
import { register as registerSample } from "./fixtures/sample-extension.mjs";

const SAMPLE = "sample-extension";
const memory = () => {
  const values = new Map();
  return {
    values,
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
  };
};
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => "&#" + c.charCodeAt(0) + ";");
const makeRegistry = (options = {}) =>
  createRegistry({ logger: null, document: null, deviceStorage: memory(), ...options });
const baseState = () => ({
  version: 1,
  actors: {
    livia: { id: "livia", name: "Livia", kind: "character", conditions: [] },
    "goblin-1": { id: "goblin-1", name: "Sentinella", kind: "npc", conditions: [] },
  },
  scenes: [
    {
      id: "old-watch",
      name: "Cortile",
      tokens: [{ id: "token-livia", actorId: "livia", x: 250, y: 380 }],
    },
  ],
  activeSceneId: "old-watch",
  combat: { active: false, round: 1, turn: 0, order: ["livia", "goblin-1"] },
  log: [],
});
// A ctx shaped like the shell's, backed by any store exposing state/commit.
function makeCtx(store, role = "dm", extra = {}) {
  const ctx = {
    role,
    lang: "it",
    view: { page: "home", id: "", tab: "" },
    toasts: [],
    dialogs: [],
    get state() {
      return store.state;
    },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    esc,
    commit: (label, mutator, options) => store.commit(label, mutator, options, role),
    toast: (text, error = false) => ctx.toasts.push({ text, error }),
    dialog: (title, body) => ctx.dialogs.push({ title, body }),
    render: () => {},
    ...extra,
  };
  return ctx;
}
// Minimal store with the core store's semantics: commit clones and snapshots, Undo
// restores the snapshot, reset reseeds, every change is persisted as JSON. The registry
// calls are exactly the host hooks planned for app.mjs (see the plan document).
function makeStore(registry, storage, key = "blueprint") {
  let state;
  const history = [];
  const persist = () => storage.setItem(key, JSON.stringify(state));
  const store = {
    get state() {
      return state;
    },
    load() {
      const saved = storage.getItem(key);
      state = saved ? JSON.parse(saved) : baseState();
      history.length = 0;
      if (registry.initState(state).changed) persist();
      return store;
    },
    commit(label, mutator, options = {}) {
      const before = state;
      const draft = structuredClone(state);
      mutator(draft);
      draft.log = [...before.log, { id: "c" + (before.log.length + 1), label, kind: "change" }];
      if (options.undoable !== false) history.push(before);
      state = draft;
      persist();
      registry.emitStateEvents(before, state);
      return { applied: true, persisted: true };
    },
    undo() {
      const current = state;
      state = structuredClone(history.pop());
      registry.afterUndo(current, state);
      state.log = [...current.log, { id: "c" + (current.log.length + 1), kind: "correction" }];
      persist();
      registry.emitStateEvents(current, state, { kind: "correction" });
    },
    reset() {
      state = baseState();
      history.length = 0;
      registry.initState(state);
      persist();
      registry.emit("reset", {});
    },
  };
  return store.load();
}
// Enough DOM for bindSlots: elements are found from the rendered slot attributes.
function fakeRoot(html) {
  const clicks = [];
  const elements = [...html.matchAll(/data-ext-slot="([^"]+)"([^>]*)>/g)].map(([, slot, rest]) => {
    const attrs = new Map([["data-ext-slot", slot]]);
    if (rest.includes("data-ext-failed")) attrs.set("data-ext-failed", "");
    return {
      innerHTML: "",
      getAttribute: (name) => attrs.get(name) ?? null,
      hasAttribute: (name) => attrs.has(name),
      setAttribute: (name, value) => attrs.set(name, value),
      querySelector: () => ({ addEventListener: (type, handler) => clicks.push(handler) }),
    };
  });
  return { elements, clicks, querySelectorAll: () => elements };
}
const withSample = (options) => {
  const registry = makeRegistry(options);
  assert.equal(registry.use(SAMPLE, registerSample).status, "built");
  return registry;
};

test("the fixture contributes to every extension point, a state slice, styles and handlers", () => {
  const registry = withSample();
  const ids = {
    route: SAMPLE,
    service: SAMPLE + "-info",
    "campaign-section": SAMPLE + "-section",
    "sheet-tab": SAMPLE + "-tab",
    "sheet-section": SAMPLE + "-extras",
    "preparation-section": SAMPLE + "-prep",
    "library-section": SAMPLE + "-library",
    "home-widget": SAMPLE + "-widget",
    "table-tool": SAMPLE + "-ping",
    "table-panel": SAMPLE + "-panel",
    "token-menu": SAMPLE + "-mark",
    "map-layer": SAMPLE + "-marks",
    search: SAMPLE + "-notes",
    command: SAMPLE + ".add-note",
    settings: SAMPLE + "-display",
    notifications: SAMPLE + "-alerts",
    "draft-guard": SAMPLE + "-guard",
  };
  assert.deepEqual(Object.keys(ids).sort(), Object.keys(POINTS).sort());
  for (const [point, id] of Object.entries(ids)) {
    const c = registry.get(point, id);
    assert.ok(c, point);
    assert.equal(c.extension, SAMPLE);
    assert.deepEqual(c.label.it && c.label.en && true, true);
  }
  assert.deepEqual(
    registry.slices().map((slice) => [slice.name, slice.version, slice.undo]),
    [
      ["core-settings", 1, "preserve"],
      [SAMPLE, 2, "snapshot"],
      [SAMPLE + "-log", 1, "preserve"],
    ],
  );
  assert.equal(registry.styles()[0].extension, SAMPLE);
  const [row] = registry.extensions();
  assert.equal(row.id, SAMPLE);
  assert.equal(row.contributions, 21);
});

test("role visibility and when predicates filter contributions", () => {
  const registry = withSample();
  const store = makeStore(registry, memory());
  const dm = makeCtx(store, "dm");
  const player = makeCtx(store, "player");
  const table = { scene: store.state.scenes[0] };
  assert.equal(registry.list("preparation-section", dm).length, 1);
  assert.equal(registry.list("preparation-section", player).length, 0);
  assert.equal(registry.list("table-panel", player, table).length, 0);
  assert.equal(registry.get("table-panel", SAMPLE + "-panel", player, table), null);
  assert.ok(registry.get("table-panel", SAMPLE + "-panel", dm, table));
  const livia = store.state.actors.livia;
  const goblin = store.state.actors["goblin-1"];
  assert.equal(registry.list("sheet-tab", player, livia).length, 1);
  assert.equal(registry.list("sheet-tab", player, goblin).length, 0);
  assert.equal(registry.list("token-menu", player, { actorId: "livia" }).length, 1);
  assert.equal(registry.list("token-menu", player, { actorId: "missing" }).length, 0);
});

test("ordering merges core items and contributions deterministically", () => {
  const registry = withSample();
  registry.use("later", (api) => {
    api.add("route", {
      id: "later-page",
      label: { it: "Dopo", en: "Later" },
      nav: true,
      order: 25,
      render: () => "",
    });
    api.add("route", {
      id: "campaigns",
      replaces: true,
      roles: ["dm"],
      label: { it: "Campagne", en: "Campaigns" },
      render: () => "<p>replaced</p>",
    });
  });
  const nav = CORE.route.filter((item) => item.nav);
  const ctx = (role) => ({ role, state: {} });
  const ids = (role) =>
    registry
      .merge("route", nav, ctx(role))
      .filter((item) => item.core || item.nav || item.replaces)
      .map((item) => (item.core ? "core:" : "ext:") + item.id);
  assert.deepEqual(ids("dm"), [
    "core:home",
    "core:characters",
    "ext:sample-extension",
    "ext:later-page",
    "ext:campaigns",
    "core:library",
  ]);
  // The DM-only replacement keeps the core position; players still get the core page.
  assert.equal(registry.get("route", "campaigns").order, 30);
  assert.deepEqual(ids("player"), [
    "core:home",
    "core:characters",
    "ext:sample-extension",
    "ext:later-page",
    "core:campaigns",
    "core:library",
  ]);
  const sections = registry.merge("campaign-section", CORE["campaign-section"], ctx("player"));
  assert.ok(!sections.some((item) => item.id === "settings"));
  assert.equal(
    sections.findIndex((item) => item.id === SAMPLE + "-section"),
    4,
  );
});

test("registration is validated and transactional", () => {
  const registry = makeRegistry();
  const label = { it: "Voce", en: "Item" };
  const cases = {
    "missing-english": (api) =>
      api.add("route", { id: "missing-english", label: { it: "Solo" }, render: () => "" }),
    "unknown-field": (api) =>
      api.add("route", { id: "unknown-field", label, render: () => "", rendr: 1 }),
    "foreign-id": (api) => api.add("route", { id: "someone-else", label, render: () => "" }),
    "core-id": (api) => api.add("route", { id: "home", label, render: () => "" }),
    "reserved-id": (api) =>
      api.add("route", { id: "table", replaces: true, label, render: () => "" }),
    "bad-roles": (api) =>
      api.add("service", { id: "bad-roles", label, roles: ["admin"], run: () => {} }),
    "bad-point": (api) => api.add("toolbar", { id: "bad-point", label }),
    "bad-slice": (api) => api.registerStateSlice("bad-slice", { version: 1, seed: () => ({}) }),
    "bad-style": (api) => api.registerStyles("bad-style.js"),
    "bad-event": (api) => api.on("turn-started", () => {}),
    "async-register": async (api) =>
      api.add("route", { id: "async-register", label, render: () => "" }),
    partial: (api) => {
      api.add("service", { id: "partial", label, run: () => {} });
      api.registerStyles("partial.css");
      api.on("commit", () => {});
      api.registerStateSlice("partial", { version: 1, seed: () => ({}), normalize: (v) => v });
      throw Error("stops halfway");
    },
  };
  for (const [id, register] of Object.entries(cases)) {
    const row = registry.use(id, register);
    assert.equal(row.status, "failed", id);
    assert.ok(row.error, id);
  }
  assert.match(registry.extensions().find((row) => row.id === "missing-english").error, /en/);
  assert.match(registry.extensions().find((row) => row.id === "core-id").error, /replaces/);
  // Nothing from a failed extension leaks: no contributions, slices, styles or handlers.
  for (const point of Object.keys(POINTS)) assert.deepEqual(registry.list(point), [], point);
  assert.deepEqual(registry.styles(), []);
  assert.deepEqual(
    registry.slices().map((slice) => slice.name),
    ["core-settings"],
  );
  assert.equal(registry.emit("commit", {}), 0);
  // Contributions are registered synchronously only.
  let api;
  registry.use("late", (value) => (api = value));
  assert.throws(() => api.add("service", { id: "late", label, run: () => {} }), /synchronously/);
  assert.throws(() => registry.use("late", () => {}), /already loaded/);
  assert.equal(registry.use("no-register", undefined).status, "failed");
});

test("state slices seed, migrate, persist, undo and reset through a store-like adapter", () => {
  const storage = memory();
  const registry = withSample();
  const store = makeStore(registry, storage);
  assert.deepEqual(store.state.ext[SAMPLE].notes, [{ id: "n1", text: "Prima nota" }]);
  assert.equal(store.state.extVersions[SAMPLE], 2);
  const ctx = makeCtx(store);
  assert.equal(registry.run(registry.get("command", SAMPLE + ".add-note"), ctx), true);
  assert.equal(store.state.ext[SAMPLE].notes.length, 2);
  assert.equal(store.state.ext[SAMPLE + "-log"].entries.length, 1);
  // Reload: the persisted slice comes back unchanged.
  const reloaded = makeStore(withSample(), storage);
  assert.equal(reloaded.state.ext[SAMPLE].notes[1].text, "Comando");
  // Undo restores the snapshot slice and keeps the preserved one.
  store.undo();
  assert.equal(store.state.ext[SAMPLE].notes.length, 1);
  assert.deepEqual(store.state.ext[SAMPLE + "-log"].entries, [{ id: "log-n2", noteId: "n2" }]);
  assert.equal(store.state.log.at(-1).kind, "correction");
  // Reset reseeds every slice.
  store.reset();
  assert.deepEqual(store.state.ext[SAMPLE + "-log"].entries, []);
  assert.equal(store.state.ext[SAMPLE].notes.length, 1);
  // Version 1 data saved by an older build is migrated once on load.
  const old = baseState();
  old.ext = { [SAMPLE]: { notes: ["Vecchia"], pinned: 7 }, retired: { kept: true } };
  old.extVersions = { [SAMPLE]: 1, retired: 3 };
  storage.setItem("blueprint", JSON.stringify(old));
  const migrated = makeStore(withSample(), storage);
  assert.deepEqual(migrated.state.ext[SAMPLE], {
    notes: [{ id: "legacy-1", text: "Vecchia" }],
    pinned: null,
  });
  assert.equal(migrated.state.extVersions[SAMPLE], 2);
  // A slice with no registered owner (area not loaded now) is never dropped.
  assert.deepEqual(migrated.state.ext.retired, { kept: true });
  assert.equal(JSON.parse(storage.getItem("blueprint")).extVersions[SAMPLE], 2);
});

test("a failing normalize keeps the saved slice untouched and reports a warning", () => {
  const storage = memory();
  const future = baseState();
  future.ext = { [SAMPLE]: { notes: [{ id: "x", text: "Futuro" }], extra: 1 } };
  future.extVersions = { [SAMPLE]: 3 };
  storage.setItem("blueprint", JSON.stringify(future));
  const registry = withSample();
  const store = makeStore(registry, storage);
  assert.deepEqual(store.state.ext[SAMPLE], future.ext[SAMPLE]);
  assert.equal(store.state.extVersions[SAMPLE], 3);
  const [warning] = registry.warnings();
  assert.equal(warning.extension, SAMPLE);
  assert.equal(warning.phase, "normalize");
  assert.match(warning.message, /newer version/);
});

test("the real store keeps slices through commit, reload, undo and reset with the planned hooks", async () => {
  const { createStore } = await import("../state.mjs");
  const storage = memory();
  const events = [];
  // The same calls the plan adds to app.mjs around createStore, commit, undo and reset.
  function host(registry) {
    const store = createStore({ storage });
    if (registry.initState(store.state).changed) store.persist();
    return {
      store,
      commit(label, mutator) {
        const before = store.state;
        store.commit(label, mutator, "dm");
        registry.emitStateEvents(before, store.state);
      },
      undo() {
        const current = store.state;
        store.undo("dm");
        registry.afterUndo(current, store.state);
        store.persist();
        registry.emitStateEvents(current, store.state, { kind: "correction" });
      },
      reset() {
        store.reset();
        registry.initState(store.state);
        store.persist();
      },
    };
  }
  const registry = withSample();
  registry.on("commit", (payload) => events.push(payload.kind));
  const app = host(registry);
  assert.equal(app.store.state.ext[SAMPLE].notes.length, 1);
  app.commit("add", (draft) => {
    registry.slice(draft, SAMPLE).notes.push({ id: "n2", text: "Reale" });
    registry.slice(draft, SAMPLE + "-log").entries.push({ id: "log-n2", noteId: "n2" });
  });
  const reloaded = host(withSample());
  assert.equal(reloaded.store.state.ext[SAMPLE].notes[1].text, "Reale");
  app.undo();
  assert.equal(app.store.state.ext[SAMPLE].notes.length, 1);
  assert.equal(app.store.state.ext[SAMPLE + "-log"].entries.length, 1);
  assert.equal(JSON.parse(storage.getItem("d20-studio-blueprint-v1")).ext[SAMPLE].notes.length, 1);
  assert.deepEqual(events, ["change", "correction"]);
  app.reset();
  assert.deepEqual(app.store.state.ext[SAMPLE + "-log"].entries, []);
  assert.equal(host(withSample()).store.state.ext[SAMPLE + "-log"].entries.length, 0);
});

test("command shortcuts are normalized and conflicts are detected", () => {
  assert.equal(normalizeShortcut("ctrl+shift+n"), "Mod+Shift+N");
  assert.equal(normalizeShortcut("Cmd+K"), "Mod+K");
  assert.equal(normalizeShortcut("shift+/"), "/");
  assert.equal(normalizeShortcut("Mod++"), "Mod++");
  assert.equal(normalizeShortcut("esc"), "Escape");
  assert.equal(normalizeShortcut({ key: "k", metaKey: true }), "Mod+K");
  assert.equal(normalizeShortcut({ key: "?", shiftKey: true }), "?");
  assert.equal(normalizeShortcut({ key: "Shift", shiftKey: true }), null);
  assert.equal(normalizeShortcut("Hyper+K"), null);
  assert.equal(normalizeShortcut("Mod+Banana"), null);
  const registry = withSample();
  const label = { it: "Comando", en: "Command" };
  registry.use("rival", (api) => {
    api.add("command", { id: "rival.same", label, shortcut: "Ctrl+Shift+n", run: () => {} });
    api.add("command", { id: "rival.undo", label, shortcut: "Mod+Z", context: "table", run() {} });
    api.add("command", {
      id: "rival.sheet",
      label,
      shortcut: "Mod+Z",
      context: "characters",
      run() {},
    });
    api.add("command", { id: "rival.dm", label, shortcut: "G", roles: ["dm"], run: () => {} });
    api.add("command", { id: "rival.player", label, shortcut: "G", roles: ["player"], run() {} });
  });
  assert.deepEqual(
    registry.conflicts().map((c) => [c.shortcut, c.kept, c.dropped]),
    [
      ["Mod+Shift+N", "sample-extension/sample-extension.add-note", "rival/rival.same"],
      ["Mod+Z", "core/undo", "rival/rival.undo"],
    ],
  );
  // The dropped command stays available (for a palette) without its shortcut.
  assert.equal(registry.get("command", "rival.same").shortcut, null);
  assert.equal(registry.get("command", "rival.same").shortcutConflict, "Mod+Shift+N");
  const ctx = (role, page) => ({ role, view: { page } });
  const key = { key: "N", ctrlKey: true, shiftKey: true };
  assert.equal(registry.commandForKey(key, ctx("player", "home")).id, SAMPLE + ".add-note");
  assert.equal(registry.commandForKey("Mod+Z", ctx("dm", "characters")).id, "rival.sheet");
  assert.equal(registry.commandForKey("Mod+Z", ctx("dm", "table")), null);
  assert.equal(registry.commandForKey("g", ctx("dm", "home")).id, "rival.dm");
  assert.equal(registry.commandForKey("g", ctx("player", "home")).id, "rival.player");
});

test("the event bus delivers core and namespaced events and isolates failing handlers", () => {
  const registry = withSample();
  const received = [];
  registry.use("listener", (api) => {
    api.on("sample-extension:draft-opened", (payload, meta) =>
      received.push([meta.emitter, payload.commits]),
    );
    api.on("turn-start", () => {
      throw Error("listener broke");
    });
    api.on("turn-start", (payload) => received.push(["turn", payload.actorId]));
    assert.throws(() => api.emit("sample-extension:draft-opened", {}), /can emit/);
    assert.throws(() => api.on("bogus", () => {}), /Unknown event/);
  });
  assert.throws(() => registry.emit("turn-started", {}), /Unknown event/);
  assert.equal(registry.emit("turn-start", { actorId: "livia" }), 2);
  const store = makeStore(registry, memory());
  const ctx = makeCtx(store, "dm", { view: { page: "table" } });
  registry.run(registry.commandForKey("Mod+Shift+N", ctx), ctx);
  registry.run(registry.get("command", SAMPLE + ".draft"), ctx);
  assert.deepEqual(received, [
    ["turn", "livia"],
    [SAMPLE, 1],
  ]);
  const warning = registry.warnings().find((entry) => entry.extension === "listener");
  assert.deepEqual([warning.point, warning.id, warning.phase], ["event", "turn-start", "handler"]);
  registry.run(registry.get("service", SAMPLE + "-stats"), ctx);
  assert.equal(ctx.toasts.at(-1).text, "1/livia");
  // Handlers receive the attached host context.
  let seenCtx;
  registry.on("navigate", (payload, meta) => (seenCtx = meta.ctx));
  registry.attach(ctx).emit("navigate", { page: "table" });
  assert.equal(seenCtx, ctx);
  // A runaway chain of events is cut instead of freezing the app.
  let depth = 0;
  registry.use("loop", (api) => api.on("loop:again", () => (depth++, api.emit("loop:again"))));
  registry.emit("loop:again");
  assert.equal(depth, 8);
  assert.ok(registry.warnings().some((entry) => /too deep/.test(entry.message)));
  assert.ok(EVENTS.includes("roll-accepted"));
});

test("committed transitions derive the core domain events", () => {
  const before = baseState();
  before.restTime = {
    rests: [{ id: "r1", participants: [{ actorId: "livia", benefits: [] }] }],
  };
  const after = structuredClone(before);
  after.combat.active = true;
  after.activeSceneId = "camp";
  after.actors.livia.conditions = [{ id: "prone" }];
  after.restTime.rests[0].participants[0].benefits.push({ id: "b1", kind: "short", applied: true });
  after.log = [
    {
      id: "c1",
      label: "Avvio",
      kind: "change",
      controller: "dm",
      visibility: "shared",
      rolls: [
        { id: "c1:0", source: "initiative", visibility: "private", owner: "dm" },
        { id: "c1:1", source: "combat", status: "superseded" },
      ],
    },
  ];
  const events = deriveStateEvents(before, after);
  assert.deepEqual(
    events.map(([event]) => event),
    [
      "commit",
      "roll-accepted",
      "combat-start",
      "turn-start",
      "scene-activated",
      "rest-completed",
      "condition-changed",
    ],
  );
  const payload = (name) => events.find(([event]) => event === name)[1];
  assert.equal(payload("turn-start").actorId, "livia");
  assert.deepEqual(payload("rest-completed"), {
    restId: "r1",
    actorId: "livia",
    kind: "short",
    benefitId: "b1",
    correction: false,
  });
  // Payloads are copies: a listener cannot mutate committed state.
  payload("roll-accepted").roll.visibility = "shared";
  assert.equal(after.log[0].rolls[0].visibility, "private");
  assert.equal(rollVisibleTo(after.log[0].rolls[0], "player"), false);
  assert.equal(rollVisibleTo(after.log[0].rolls[0], "dm"), true);
  const next = structuredClone(after);
  next.combat.turn = 1;
  next.log.push({ id: "c2", label: "Turno", kind: "change", rolls: [] });
  assert.deepEqual(
    deriveStateEvents(after, next).map(([event, data]) => [event, data.actorId]),
    [
      ["commit", undefined],
      ["turn-end", "livia"],
      ["turn-start", "goblin-1"],
    ],
  );
  const undone = deriveStateEvents(next, before, { kind: "correction" });
  assert.ok(undone.every(([, data]) => data.correction === true));
  assert.ok(undone.some(([event]) => event === "combat-end"));
  // The store adapter feeds the same events to extension handlers.
  const registry = withSample();
  const store = makeStore(registry, memory());
  store.commit("start", (draft) => (draft.combat.active = true));
  const ctx = makeCtx(store);
  registry.run(registry.get("service", SAMPLE + "-stats"), ctx);
  assert.equal(ctx.toasts.at(-1).text, "1/livia");
});

test("failures in render, bind, run, search and notifications stay circumscribed", () => {
  const registry = withSample();
  const label = { it: "Rotto", en: "Broken" };
  registry.use("broken", (api) => {
    api.add("home-widget", { id: "broken-render", label, render: () => missing.value });
    api.add("home-widget", {
      id: "broken-bind",
      label,
      render: () => "<p>ok</p>",
      bind() {
        throw Error("bind failed");
      },
    });
    api.add("home-widget", { id: "broken-type", label, render: () => 42 });
    api.add("map-layer", { id: "broken-layer", label, svg: () => null.x });
    api.add("service", {
      id: "broken-run",
      label,
      run: () => {
        throw Error("run failed");
      },
    });
    api.add("service", {
      id: "broken-user",
      label,
      run: () => {
        throw Object.assign(Error("Not allowed"), { it: "Non ammesso", en: "Not allowed" });
      },
    });
    api.add("search", {
      id: "broken-search",
      label,
      search: () => {
        throw Error("search failed");
      },
    });
    api.add("search", { id: "broken-results", label, search: () => [{ title: "no page" }] });
    api.add("notifications", { id: "broken-collect", label, collect: () => "nope" });
    api.add("sheet-tab", {
      id: "broken-when",
      label,
      when: () => {
        throw Error("when failed");
      },
      render: () => "",
    });
  });
  const store = makeStore(registry, memory());
  const ctx = makeCtx(store, "player");
  const html = registry
    .list("home-widget", ctx)
    .map((c) => registry.slot("home-widget", c, ctx))
    .join("");
  assert.match(
    html,
    /data-ext-slot="home-widget:sample-extension-widget" style="display:contents"><p>1<\/p>/,
  );
  assert.equal((html.match(/data-ext-error="broken"/g) ?? []).length, 2);
  assert.match(html, /Rotto non è disponibile in questo momento/);
  assert.equal(
    registry.slot("map-layer", "broken-layer", ctx, { scene: store.state.scenes[0] }),
    '<g data-ext-slot="map-layer:broken-layer" data-ext-failed></g>',
  );
  const root = fakeRoot(html);
  registry.bindSlots(root, ctx);
  const bound = root.elements.find(
    (el) => el.getAttribute("data-ext-slot") === "home-widget:broken-bind",
  );
  assert.ok(bound.hasAttribute("data-ext-failed"));
  assert.match(bound.innerHTML, /non è disponibile/);
  assert.equal(registry.run(registry.get("service", "broken-run"), ctx), false);
  assert.match(ctx.toasts.at(-1).text, /Rotto non ha funzionato/);
  assert.equal(registry.run(registry.get("service", "broken-user"), ctx), false);
  assert.equal(ctx.toasts.at(-1).text, "Non ammesso");
  const results = registry.search(ctx, "prima");
  assert.deepEqual(
    results.map((r) => [r.provider, r.title]),
    [[SAMPLE + "-notes", "Prima nota"]],
  );
  assert.deepEqual(registry.notifications(ctx), []);
  assert.deepEqual(
    registry.list("sheet-tab", ctx, store.state.actors.livia).map((c) => c.id),
    [SAMPLE + "-tab"],
  );
  const phases = registry
    .warnings()
    .filter((w) => w.extension === "broken")
    .map((w) => w.phase);
  assert.deepEqual(phases.sort(), [
    "bind",
    "collect",
    "render",
    "render",
    "result",
    "run",
    "search",
    "svg",
    "when",
  ]);
  // The same failure is reported once, not on every render.
  registry.slot("home-widget", "broken-render", ctx);
  assert.equal(registry.warnings().filter((w) => w.id === "broken-render").length, 1);
  const report = registry.reportHTML(ctx);
  assert.match(report, /2 pronte · 0 da costruire · 0 con errori/);
  assert.match(report, /Avvisi circoscritti/);
});

test("slots render, bind and run through the host context", () => {
  const registry = withSample();
  const store = makeStore(registry, memory());
  const ctx = makeCtx(store, "dm", { view: { page: SAMPLE } });
  const html = registry.slot("route", SAMPLE, ctx);
  assert.match(html, /Pagina di prova/);
  const root = fakeRoot(html);
  registry.bindSlots(root, ctx, { points: ["map-layer"] });
  assert.equal(root.clicks.length, 0);
  registry.bindSlots(root, ctx, { points: ["route"] });
  registry.bindSlots(root, ctx);
  assert.equal(root.clicks.length, 1);
  root.clicks[0]();
  assert.equal(store.state.ext[SAMPLE].notes.at(-1).text, "Nota");
  const table = {
    scene: store.state.scenes[0],
    point: (event) => ({ x: event.clientX, y: event.clientY }),
    message: (text) => (table.text = text),
  };
  registry.run(registry.get("token-menu", SAMPLE + "-mark"), ctx, { actorId: "livia" });
  assert.match(registry.slot("map-layer", SAMPLE + "-marks", ctx, table), /cx="250"/);
  assert.match(registry.slot("map-layer", SAMPLE + "-marks", ctx, table), /pointer-events="none"/);
  const tool = registry.get("table-tool", SAMPLE + "-ping", ctx);
  assert.equal(registry.invoke(tool, "onClick", ctx, { clientX: 99.6, clientY: 1 }, table), true);
  assert.equal(table.text, "Segnale 100");
  assert.equal(registry.invoke(tool, "onPointerDown", ctx, {}, table), false);
  registry.run(registry.get("service", SAMPLE + "-info"), ctx);
  assert.equal(ctx.dialogs[0].title, "Prova");
  assert.deepEqual(
    registry.notifications(ctx).map((n) => [n.id, n.source, n.target.params.id]),
    [["log-n2", SAMPLE + "-alerts", "n2"]],
  );
  // Draft guards: the shell asks before leaving and continues after confirmation.
  assert.equal(registry.pendingDraft(ctx), null);
  registry.run(registry.commandForKey("Mod+Shift+N", ctx), ctx);
  registry.run(registry.get("command", SAMPLE + ".draft"), ctx);
  const guard = registry.pendingDraft(ctx, { page: "home" });
  let left = false;
  registry.call(guard, "confirm", null, ctx, () => (left = true));
  assert.equal(left, true);
  assert.equal(registry.pendingDraft(ctx), null);
});

test("settings honour device, personal and campaign scopes", () => {
  const device = memory();
  const registry = withSample({ deviceStorage: device });
  const store = makeStore(registry, memory());
  const dm = makeCtx(store, "dm");
  const player = makeCtx(store, "player");
  const commits = [];
  const spy = (ctx) => {
    const commit = ctx.commit;
    ctx.commit = (label, mutator, options) => (
      commits.push(options),
      commit(label, mutator, options)
    );
    return ctx;
  };
  spy(dm);
  spy(player);
  assert.equal(registry.getSetting(player, SAMPLE + "-display.size"), "m");
  registry.setSetting(player, SAMPLE + "-display.size", "s");
  assert.equal(device.getItem("d20-studio-setting:" + SAMPLE + "-display.size"), '"s"');
  assert.equal(registry.getSetting(dm, SAMPLE + "-display.size"), "s");
  assert.throws(
    () => registry.setSetting(player, SAMPLE + "-display.size", "xl"),
    (e) => e.it === "Valore non valido per questa impostazione.",
  );
  registry.setSetting(player, SAMPLE + "-personal.nickname", "Liv");
  assert.equal(registry.getSetting(player, SAMPLE + "-personal.nickname"), "Liv");
  assert.equal(registry.getSetting(dm, SAMPLE + "-personal.nickname"), "");
  assert.deepEqual(commits.at(-1), { local: true, visibility: "private", undoable: false });
  assert.throws(
    () => registry.setSetting(player, SAMPLE + "-rules.radius", 5),
    (e) => /DM/.test(e.en),
  );
  assert.throws(() => registry.setSetting(dm, SAMPLE + "-rules.radius", 12), /Invalid value/);
  registry.setSetting(dm, SAMPLE + "-rules.radius", 5);
  assert.deepEqual(commits.at(-1), { undoable: false });
  assert.equal(registry.getSetting(player, SAMPLE + "-rules.radius"), 5);
  assert.throws(() => registry.getSetting(dm, "missing.value"), /Unknown setting/);
  // Settings survive gameplay Undo, like the other preserved slices.
  store.commit("gameplay", (draft) => (draft.activeSceneId = "camp"));
  store.undo();
  assert.equal(registry.getSetting(player, SAMPLE + "-rules.radius"), 5);
  // A corrupted stored value falls back to the declared default.
  device.setItem("d20-studio-setting:" + SAMPLE + "-display.compact", "{not json");
  assert.equal(registry.getSetting(dm, SAMPLE + "-display.compact"), false);
  const invalid = makeRegistry().use("bad-settings", (api) =>
    api.add("settings", {
      id: "bad-settings",
      label: { it: "X", en: "X" },
      scope: "device",
      fields: [{ id: "n", label: { it: "N", en: "N" }, type: "number", default: 12, max: 9 }],
    }),
  );
  assert.equal(invalid.status, "failed");
});

test("styles are injected only for extensions that register successfully", () => {
  const head = [];
  const document = {
    head: { append: (el) => head.push(el) },
    createElement: (tag) => ({
      tag,
      attrs: {},
      setAttribute(k, v) {
        this.attrs[k] = v;
      },
    }),
  };
  const registry = makeRegistry({ document });
  registry.use(SAMPLE, registerSample);
  registry.use("fails", (api) => {
    api.registerStyles(new URL("https://example.test/fails.css"));
    throw Error("no");
  });
  registry.use("styled", (api) => {
    api.registerStyles(new URL("https://example.test/styled.css?v=1"));
    api.registerStyles("https://example.test/styled.css?v=1");
  });
  assert.deepEqual(
    head.map((el) => [el.tag, el.attrs.rel, el.attrs["data-extension"]]),
    [
      ["link", "stylesheet", SAMPLE],
      ["link", "stylesheet", "styled"],
    ],
  );
});

test("the loader reports built, not-built and failed entry modules in plan order", async () => {
  const base = new URL("./", import.meta.url).href;
  const dependency = new URL("./fixtures/registry-missing-dependency.mjs", import.meta.url).href;
  const data = (source) => "data:text/javascript," + encodeURIComponent(source);
  const registry = makeRegistry();
  const report = await loadExtensions(registry, {
    base,
    entries: [
      { id: "missing", backlog: "B98", file: "./fixtures/registry-not-built.mjs" },
      {
        id: SAMPLE,
        backlog: "B99",
        title: { it: "Prova", en: "Sample" },
        file: "./fixtures/sample-extension.mjs",
      },
      { id: "throws-on-load", href: data("throw new Error('load failed')") },
      {
        id: "throws-on-register",
        href: data("export function register() { throw new Error('register failed') }"),
      },
      {
        id: "missing-dependency",
        href: data(`import ${JSON.stringify(dependency)}; export function register() {}`),
      },
      { id: "no-register", href: data("export const value = 1") },
      { id: "syntax", href: data("export const = ;") },
    ],
  });
  assert.deepEqual(
    report.map((row) => [row.id, row.status]),
    [
      ["missing", "not-built"],
      [SAMPLE, "built"],
      ["throws-on-load", "failed"],
      ["throws-on-register", "failed"],
      ["missing-dependency", "failed"],
      ["no-register", "failed"],
      ["syntax", "failed"],
    ],
  );
  assert.equal(report[0].error, null);
  assert.equal(report[0].backlog, "B98");
  assert.match(report[2].error, /load failed/);
  assert.match(report[3].error, /register failed/);
  assert.match(report[4].error, /registry-missing-dependency/);
  assert.match(report[5].error, /register\(registry\)/);
  assert.equal(registry.report().built[0].contributions, 21);
  // Not-built areas are silent; failures are circumscribed warnings.
  assert.deepEqual(
    registry.warnings().map((w) => w.extension),
    ["throws-on-load", "throws-on-register", "missing-dependency", "no-register", "syntax"],
  );
  const html = registry.reportHTML({ lang: "en" });
  assert.match(html, /1 ready · 1 to build · 5 with errors/);
  assert.match(html, /B99 · Sample/);
});

test("in the browser a missing entry is probed and never imported", async () => {
  const registry = makeRegistry();
  const imported = [];
  const report = await loadExtensions(registry, {
    base: "http://127.0.0.1:8879/extensions.mjs",
    entries: [{ id: "absent" }, { id: "broken" }, { id: "unknown" }],
    importModule: (href) => {
      imported.push(href.split("/").pop());
      return Promise.reject(new TypeError("Failed to fetch dynamically imported module"));
    },
    probe: async (href) =>
      ({ absent: false, broken: true, unknown: null })[href.split("/").pop().slice(0, -4)],
  });
  assert.deepEqual(
    report.map((row) => row.status),
    ["not-built", "failed", "failed"],
  );
  assert.deepEqual(imported, ["broken.mjs", "unknown.mjs"]);
});

test("the plan loads every planned area once and missing files are not built", async () => {
  const ids = PLANNED_EXTENSIONS.map((entry) => entry.id);
  assert.equal(ids.length, 48);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(PLANNED_EXTENSIONS.every((entry) => /^B\d\d$/.test(entry.backlog)));
  assert.ok(PLANNED_EXTENSIONS.every((entry) => entry.title.it && entry.title.en));
  const report = await loadExtensions(makeRegistry());
  assert.deepEqual(
    report.map((row) => row.id),
    ids,
  );
  for (const row of report) {
    const file = fileURLToPath(new URL(`../${row.id}.mjs`, import.meta.url));
    if (!existsSync(file)) assert.equal(row.status, "not-built", row.id);
    else assert.notEqual(row.status, "not-built", row.id);
  }
});
