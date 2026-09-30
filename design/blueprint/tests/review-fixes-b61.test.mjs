// B61 independent review (24/09/2026): where Table commands live, fixes found in the
// running app. P1: on a phone the action bar scrolled sideways and hid End turn, Undo and
// Cancel off-screen. P2: the sidebar tabs overflowed (phone bar: 8 of 13 DM tabs and 4 of
// 8 player tabs, Safety included, off-screen; laptop rail at 1366×768: Safety clipped) with
// no way to see them all; the selected tab also scrolled out of view at each render.
// Pattern copied: D&D Beyond's quick-jump list beside the swipeable sections (DDB-060),
// Quest Portal's short bottom bar (VTL-008), VS Code's "…" for views that do not fit.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createInitialState } from "../state.mjs";
import { esc, icon } from "../ui.mjs";
import { createRegistry } from "../registry.mjs";
import { canControlActor } from "../character-access.mjs";
import { renderTable, bindTable, resetTableView, sidebarFor, tablePanelsMenu } from "../table.mjs";
import { register as registerSample } from "./fixtures/sample-extension.mjs";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
// The phone rules of the Table (B61): the last "max-width: 720px" block of styles.css.
const phoneCss = css.slice(css.lastIndexOf("@media (max-width: 720px)"));
const rule = (source, selector) => {
  const at = source.indexOf(selector + " {");
  assert.ok(at >= 0, "missing rule " + selector);
  return source.slice(at, source.indexOf("}", at));
};

const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
  };
};
function makeCtx({ role = "player", registry, state = createInitialState() } = {}) {
  registry?.initState(state);
  const dialogs = [];
  const ctx = {
    state,
    role,
    lang: "it",
    view: { page: "table", id: "", tab: "" },
    dialogs,
    closed: 0,
    renders: 0,
    t: (it) => it,
    label: (value) => (typeof value === "object" && value ? value.it : String(value ?? "")),
    esc,
    icon,
    canControl: (actor) => canControlActor(actor, ctx.role, state),
    toast: () => {},
    render: () => ctx.renders++,
    navigate: () => {},
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    closeDialog: () => ctx.closed++,
    commit: () => ({ applied: true, persisted: true }),
  };
  if (registry) {
    ctx.registry = registry;
    registry.attach(ctx);
  }
  return ctx;
}
function sampleRegistry() {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  registry.use("sample-extension", registerSample);
  return registry;
}

test("B61 review P1: the phone action bar wraps instead of hiding End turn, Undo and Cancel", () => {
  // Before B61 the bar wrapped; B61 made it one row scrolling sideways (End turn at
  // x 491–580 of a 390 px screen in combat, Undo at 445–485 out of combat).
  const toolbar = rule(phoneCss, ".action-dock > .toolbar");
  assert.match(toolbar, /flex-wrap: wrap;/);
  assert.doesNotMatch(toolbar, /overflow-x: auto/);
  assert.doesNotMatch(toolbar, /flex-wrap: nowrap/);
  // Cancel preview shows its icon on a phone (like Roll dice and Undo); "Esc" is a
  // keyboard hint. The accessible name is unchanged.
  resetTableView();
  const html = renderTable(makeCtx());
  assert.match(
    html,
    /data-table="cancel">(<svg class="icon"[^]*?<\/svg>) <span class="dock-text">Esc · Annulla preparazione<\/span><\/button>/,
  );
  assert.ok(html.includes(`data-table="cancel">${icon("close")}`), "Cancel lacks its icon");
});

test("B61 review P2: an All panels button pinned in the rail lists every tab (quick jump)", () => {
  resetTableView();
  const dm = renderTable(makeCtx({ role: "dm", registry: sampleRegistry() }));
  const rail = dm.slice(dm.indexOf('<div class="table-sidebar-rail">'));
  const strip = rail.indexOf('<div class="table-tabs"');
  const all = rail.indexOf("data-table-panels");
  assert.ok(all > 0 && all < strip, "All panels is not in the rail, outside the tab strip");
  assert.match(
    rail,
    /<button type="button" class="table-panels-all" data-table-panels aria-haspopup="dialog" aria-label="Tutti i pannelli" title="Tutti i pannelli"><svg class="icon"[^]*?<\/svg><span class="table-tab-label" aria-hidden="true">Tutti<\/span><\/button>/,
  );
  // The list: one entry per tab, the open one marked, each with its icon and full name.
  const menu = tablePanelsMenu(makeCtx(), [
    { id: "creature", name: "Creatura: Livia", glyph: "<b>L</b>", current: true },
    { id: "safety", name: "Sicurezza", glyph: icon("shield"), current: false },
  ]);
  assert.match(menu, /^<div class="dialog-menu table-panels-menu">/);
  assert.match(
    menu,
    /<button type="button" class="button active" data-table-panel-jump="creature" aria-current="true"><b>L<\/b>Creatura: Livia<\/button>/,
  );
  assert.match(
    menu,
    /<button type="button" class="button" data-table-panel-jump="safety"><svg[^]*?<\/svg>Sicurezza<\/button>/,
  );
  // The tab strip scrolls, the rail does not: the map link, the collapse control and All
  // panels stay in place (the builder's rail scrolled "Map" away on a phone).
  assert.match(rule(css, ".table-layout > .table-sidebar-rail"), /overflow: hidden;/);
  assert.match(rule(css, ".table-tabs"), /overflow-y: auto;/);
  assert.match(rule(phoneCss, ".table-layout > .table-sidebar-rail"), /overflow: hidden;/);
  assert.match(rule(phoneCss, ".table-tabs"), /overflow-x: auto;/);
});

test("B61 review P2: with a larger interface the active group's tools stay reachable", () => {
  // B22 makes the map toolbar scroll inside the map when the interface is enlarged
  // (overflow-y: auto); B61's tools beside the group button were then cut off by that scroll
  // box (Plan path, Pan, Select several, Template, Pin unreachable at 110 % and more). In
  // that mode the active group's tools stand in the column under their group button.
  const prefs = readFileSync(new URL("../preferences.css", import.meta.url), "utf8");
  assert.match(
    rule(prefs, ":root[data-pref-scaled] .table-stage > .map-toolbar"),
    /overflow-y: auto;/,
  );
  assert.match(
    rule(prefs, ":root[data-pref-scaled] .table-stage > .map-toolbar .map-subtools"),
    /position: static;/,
  );
});

// Minimal browser stand-ins around the real bindTable (as registry-shell.test.mjs does).
const media = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.matchMedia = media;
globalThis.window = { matchMedia: media };
globalThis.ResizeObserver = class {
  observe() {}
  disconnect() {}
};
let dialogButtons = [];
globalThis.document = {
  addEventListener() {},
  removeEventListener() {},
  querySelector: () => null,
  querySelectorAll: (s) => (s === "#dialog [data-table-panel-jump]" ? dialogButtons : []),
};
const rect = (left, top, width, height) => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
  width,
  height,
});
function fakeRoot({ tabs, strip }) {
  const handlers = {};
  strip.addEventListener ??= () => {};
  const all = { addEventListener: (type, fn) => (handlers.all = fn) };
  const svg = {
    getScreenCTM: () => ({ a: 1, inverse: () => ({}) }),
    createSVGPoint: () => ({ matrixTransform: () => ({ x: 0, y: 0 }) }),
    querySelectorAll: () => [],
    focus() {},
  };
  const root = {
    isConnected: true,
    querySelector: (s) =>
      s === "#battle-map"
        ? svg
        : s === "#map-message"
          ? { textContent: "" }
          : s === "#preview-layer"
            ? { innerHTML: "" }
            : s === "[data-table-panels]"
              ? all
              : s === ".table-tabs"
                ? strip
                : null,
    querySelectorAll: (s) => (s === ".table-tabs [role=tab]" ? tabs : []),
  };
  return { root, handlers };
}
const fakeTab = (id, name, selected, box) => ({
  dataset: { tableTab: id },
  getAttribute: (a) =>
    a === "aria-label" ? name : a === "aria-selected" ? String(selected) : null,
  querySelector: () => ({ outerHTML: `<i>${id}</i>` }),
  getBoundingClientRect: () => box,
});

test("B61 review P2: choosing a panel from the list opens its tab, never toggles it closed", () => {
  const ctx = makeCtx({ role: "dm" });
  resetTableView({ forget: true });
  const strip = {
    scrollLeft: 0,
    scrollTop: 0,
    getBoundingClientRect: () => rect(70, 787, 250, 52),
  };
  const tabs = [
    fakeTab("creature", "Creatura: Livia", true, rect(70, 787, 58, 52)),
    fakeTab("safety", "Sicurezza", false, rect(931, 787, 61, 52)),
  ];
  const { root, handlers } = fakeRoot({ tabs, strip });
  bindTable(root, ctx);
  handlers.all();
  assert.equal(ctx.dialogs.length, 1);
  assert.equal(ctx.dialogs[0].title, "Pannelli del Tavolo");
  assert.match(ctx.dialogs[0].body, /data-table-panel-jump="creature" aria-current="true"/);
  assert.match(ctx.dialogs[0].body, /data-table-panel-jump="safety"><i>safety<\/i>Sicurezza/);
  // Choosing Safety closes the list and opens its tab; choosing it again keeps it open.
  const jump = { dataset: { tablePanelJump: "safety" } };
  dialogButtons = [jump];
  handlers.all();
  jump.onclick();
  assert.equal(sidebarFor("dm").tab, "safety");
  assert.ok(ctx.closed >= 1, "the list did not close");
  handlers.all();
  jump.onclick();
  assert.equal(sidebarFor("dm").tab, "safety", "choosing the open tab toggled it closed");
  dialogButtons = [];
});

test("B61 review P2: after each render the open tab is scrolled into view inside the strip", () => {
  const ctx = makeCtx({ role: "dm" });
  resetTableView({ forget: true });
  // Phone bar: the strip shows x 70–320; the open Safety tab sits at 931–992.
  const strip = {
    scrollLeft: 0,
    scrollTop: 0,
    getBoundingClientRect: () => rect(70, 787, 250, 52),
  };
  const tabs = [
    fakeTab("creature", "Creatura: Livia", false, rect(70, 787, 58, 52)),
    fakeTab("safety", "Sicurezza", true, rect(931, 787, 61, 52)),
  ];
  bindTable(fakeRoot({ tabs, strip }).root, ctx);
  assert.equal(strip.scrollLeft, 992 - 320);
  // Laptop rail: the strip shows y 200–700; the open tab at 720–760 is brought up.
  const column = {
    scrollLeft: 0,
    scrollTop: 0,
    getBoundingClientRect: () => rect(1391, 200, 44, 500),
  };
  const lower = [fakeTab("safety", "Sicurezza", true, rect(1391, 720, 44, 40))];
  bindTable(fakeRoot({ tabs: lower, strip: column }).root, ctx);
  assert.equal(column.scrollTop, 760 - 700);
  // A tab already in view does not move the strip.
  const still = { scrollLeft: 5, scrollTop: 0, getBoundingClientRect: () => rect(0, 0, 300, 52) };
  bindTable(
    fakeRoot({ tabs: [fakeTab("log", "Registro", true, rect(60, 0, 58, 52))], strip: still }).root,
    ctx,
  );
  assert.equal(still.scrollLeft, 5);
});
