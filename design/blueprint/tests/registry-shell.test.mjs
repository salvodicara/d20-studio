// B11 part B: the host hooks in the area modules. With no area loaded the markup is
// byte-identical to the core; with the sample fixture every contribution appears in its
// place; with the failing fixture every failure stays inside its own contribution.
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import { esc, icon } from "../ui.mjs";
import { createRegistry } from "../registry.mjs";
import { canControlActor } from "../character-access.mjs";
import { renderTable, bindTable, resetTableView } from "../table.mjs";
import { renderCharacters } from "../characters.mjs";
import { renderPreparation } from "../preparation.mjs";
import { renderLibrary, resetLibraryView } from "../library.mjs";
import { renderCampaign, resetCampaignView } from "../campaign.mjs";
import { register as registerSample } from "./fixtures/sample-extension.mjs";
import { register as registerFailing } from "./fixtures/failing-extension.mjs";

const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
  };
};
function makeRegistry(...extensions) {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  for (const [id, register] of extensions) registry.use(id, register);
  return registry;
}
function makeCtx({ role = "player", view = {}, registry, state = createInitialState() } = {}) {
  registry?.initState(state);
  const toasts = [];
  const ctx = {
    state,
    role,
    lang: "it",
    view: { page: "home", id: "", tab: "", ...view },
    toasts,
    t: (it) => it,
    label: (value) => (typeof value === "object" && value ? value.it : String(value ?? "")),
    esc,
    icon,
    canControl: (actor) => canControlActor(actor, ctx.role, state),
    toast: (text, error = false) => toasts.push({ text, error }),
    render: () => {},
    navigate: () => {},
    dialog: () => {},
    closeDialog: () => {},
    commit: () => ({ applied: true, persisted: true }),
  };
  if (registry) {
    ctx.registry = registry;
    registry.attach(ctx);
  }
  return ctx;
}
const pages = [
  ["table", { page: "table" }, "player", () => (resetTableView(), renderTable)],
  ["table (DM)", { page: "table" }, "dm", () => (resetTableView(), renderTable)],
  ["sheet", { page: "characters", id: "livia", tab: "actions" }, "player", () => renderCharacters],
  [
    "sheet extras",
    { page: "characters", id: "livia", tab: "extras" },
    "player",
    () => renderCharacters,
  ],
  ["collection", { page: "characters" }, "player", () => renderCharacters],
  ["preparation", { page: "preparation" }, "dm", () => renderPreparation],
  ["library", { page: "library" }, "player", () => (resetLibraryView(), renderLibrary)],
  ["campaign", { page: "campaign" }, "player", () => (resetCampaignView(), renderCampaign)],
  ["journal", { page: "campaign", tab: "journal" }, "dm", () => renderCampaign],
];

test("with no area loaded every hooked page renders exactly as the core does", () => {
  for (const [name, view, role, pick] of pages) {
    const without = pick()(makeCtx({ role, view }));
    const withEmpty = pick()(makeCtx({ role, view, registry: makeRegistry() }));
    assert.equal(withEmpty, without, name);
  }
});

test("sample contributions appear in the sheet, preparation, library and campaign", () => {
  const registry = makeRegistry(["sample-extension", registerSample]);
  // Sheet tab only for characters (its when predicate), sheet box only on its tab.
  const sheet = renderCharacters(
    makeCtx({ registry, view: { page: "characters", id: "livia", tab: "actions" } }),
  );
  assert.match(sheet, /data-character-tab="sample-extension-tab"[^>]*>Scheda di prova</);
  assert.doesNotMatch(sheet, /sheet-section:sample-extension-extras/);
  const goblin = renderCharacters(
    makeCtx({ registry, role: "dm", view: { page: "characters", id: "goblin-1", tab: "" } }),
  );
  assert.doesNotMatch(goblin, /sample-extension-tab/);
  const tab = renderCharacters(
    makeCtx({ registry, view: { page: "characters", id: "livia", tab: "sample-extension-tab" } }),
  );
  assert.match(tab, /data-ext-slot="sheet-tab:sample-extension-tab"[^>]*><p>Livia<\/p>/);
  assert.match(tab, /class="active" data-character-tab="sample-extension-tab"/);
  const extras = renderCharacters(
    makeCtx({ registry, view: { page: "characters", id: "livia", tab: "extras" } }),
  );
  assert.match(extras, /data-ext-slot="sheet-section:sample-extension-extras"/);

  // Preparation: DM-only section and tabs; the player still sees the reserved page.
  const prep = renderPreparation(makeCtx({ registry, role: "dm", view: { page: "preparation" } }));
  assert.match(prep, /data-prep-section="scenes"/);
  assert.match(prep, /data-prep-section="sample-extension-prep"[^>]*>Preparazione di prova/);
  const prepSection = renderPreparation(
    makeCtx({ registry, role: "dm", view: { page: "preparation", tab: "sample-extension-prep" } }),
  );
  assert.match(prepSection, /data-ext-slot="preparation-section:sample-extension-prep"/);
  assert.match(prepSection, /aria-current="page">Preparazione di prova/);
  const playerPrep = renderPreparation(
    makeCtx({ registry, view: { page: "preparation", tab: "sample-extension-prep" } }),
  );
  assert.match(playerPrep, /Preparazione riservata ai DM/);
  assert.doesNotMatch(playerPrep, /data-ext-slot/);

  // Library: area collection beside the three core scopes.
  resetLibraryView();
  const library = renderLibrary(makeCtx({ registry, view: { page: "library" } }));
  assert.match(library, /data-library-scope="sample-extension-library"/);
  const collection = renderLibrary(
    makeCtx({ registry, view: { page: "library", tab: "sample-extension-library" } }),
  );
  assert.match(collection, /data-ext-slot="library-section:sample-extension-library"/);
  assert.match(collection, /aria-current="page">Raccolta di prova/);

  // Campaign: the section renders in the page for a member.
  resetCampaignView();
  const section = renderCampaign(
    makeCtx({ registry, view: { page: "campaign", tab: "sample-extension-section" } }),
  );
  assert.match(section, /data-ext-slot="campaign-section:sample-extension-section"/);
  assert.match(section, /Sezione della campagna/);
});

test("table tools, panels and map layers join the scene by role and order", () => {
  const registry = makeRegistry(["sample-extension", registerSample]);
  const state = createInitialState();
  resetTableView();
  const player = renderTable(makeCtx({ registry, state, view: { page: "table" } }));
  assert.match(player, /data-tool="sample-extension-ping"[^>]*aria-label="Segnale di prova"/);
  assert.doesNotMatch(player, /data-table-drawer/);
  // Order 65 draws above the tokens, before the door controls; nothing pinned yet.
  assert.match(
    player,
    /<\/g><g data-ext-slot="map-layer:sample-extension-marks" pointer-events="none"><\/g><g class="door-controls">/,
  );
  state.ext["sample-extension"].pinned = "livia";
  resetTableView();
  const dm = renderTable(makeCtx({ registry, state, role: "dm", view: { page: "table" } }));
  // B61: the DM's panel is a sidebar tab, closed (the Creature tab is open by default).
  assert.match(
    dm,
    /role="tab" id="table-tab-sample-extension-panel" class="table-tab" data-table-drawer="sample-extension-panel" data-table-tab="sample-extension-panel" aria-selected="false" aria-expanded="false"/,
  );
  // The sample tool joins the Ping group beside the pointer: a group button, its tools beside.
  assert.match(dm, /data-tool-group="ping"/);
  assert.match(
    dm,
    /data-tool-group-tools="ping" role="group"[^>]*hidden>[^]*data-tool="sample-extension-ping"/,
  );
  assert.match(dm, /map-layer:sample-extension-marks" pointer-events="none"><circle cx="250"/);
  assert.doesNotMatch(dm, /id="table-drawer"/);
});

// Minimal browser primitives around the real bindTable: the handlers, tool delegation,
// registry and table services are the production code. The table keeps its mode between
// renders, like the shell does; this file runs in its own process, so the stand-in browser
// globals stay defined for all of its tests.
const media = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
globalThis.matchMedia ??= media;
globalThis.window ??= { matchMedia: media };
globalThis.ResizeObserver ??= class {
  observe() {}
  disconnect() {}
};
globalThis.document ??= {
  addEventListener() {},
  removeEventListener() {},
  querySelector: () => null,
};
function fakeTable(ctx, { slots = [], tools = [] } = {}) {
  const message = { textContent: "" };
  const svg = {
    getScreenCTM: () => ({ a: 1, inverse: () => ({}) }),
    createSVGPoint: () => ({ matrixTransform: () => ({ x: 120.4, y: 80 }) }),
    querySelectorAll: () => [],
    focus() {},
    setPointerCapture() {},
  };
  const root = {
    isConnected: true,
    querySelector: (s) =>
      s === "#battle-map"
        ? svg
        : s === "#map-message"
          ? message
          : s === "#preview-layer"
            ? { innerHTML: "" }
            : null,
    querySelectorAll: (s) => (s === "[data-ext-slot]" ? slots : s === "[data-tool]" ? tools : []),
  };
  bindTable(root, ctx);
  return { svg, message };
}
const click = { target: { closest: () => null }, clientX: 3, clientY: 4, button: 0 };

test("the active area tool receives map clicks and the token menu list is exposed", () => {
  let captured = null;
  const registry = makeRegistry(
    ["sample-extension", registerSample],
    [
      "probe",
      (api) =>
        api.add("map-layer", {
          id: "probe",
          label: { it: "Sonda", en: "Probe" },
          svg: () => "",
          bind: (el, ctx, table) => (captured = table),
        }),
    ],
  );
  const ctx = makeCtx({ registry, view: { page: "table" } });
  const slot = {
    attrs: new Map([["data-ext-slot", "map-layer:probe"]]),
    getAttribute(name) {
      return this.attrs.get(name) ?? null;
    },
    hasAttribute(name) {
      return this.attrs.has(name);
    },
    setAttribute(name, value) {
      this.attrs.set(name, value);
    },
  };
  const tool = { dataset: { tool: "sample-extension-ping" } };
  resetTableView();
  fakeTable(ctx, { slots: [slot], tools: [tool] });
  assert.equal(captured.mode, "move");
  assert.deepEqual(captured.menuTarget("livia"), {
    actorId: "livia",
    tokenId: "token-livia",
    sceneId: "old-watch",
  });
  assert.deepEqual(
    captured.tokenMenu("livia").map((item) => item.id),
    ["sample-extension-mark"],
  );
  tool.onclick();
  assert.equal(captured.mode, "sample-extension-ping");
  // The next render binds a fresh table with the tool active: its click is delegated.
  const second = fakeTable(ctx, { tools: [tool] });
  second.svg.onclick(click);
  assert.equal(second.message.textContent, "Segnale 120");
  assert.deepEqual(ctx.toasts, []);
});

test("a failing area stays inside its own contributions", () => {
  const registry = makeRegistry(["failing-extension", registerFailing]);
  const state = createInitialState();
  const seeded = registry.initState(state);
  assert.deepEqual(seeded.failed, ["failing-extension"]);
  assert.equal(Object.hasOwn(state.ext, "failing-extension"), false);

  const sheet = renderCharacters(
    makeCtx({ registry, state, view: { page: "characters", id: "livia", tab: "actions" } }),
  );
  assert.doesNotMatch(sheet, /failing-extension-tab/, "a throwing when() hides the tab");
  assert.match(sheet, /data-ext-error="failing-extension"/);
  assert.match(sheet, /Riquadro della scheda guasto non è disponibile in questo momento/);
  assert.match(sheet, /data-character-tab="inventory"/, "the core sheet is intact");

  const prep = renderPreparation(
    makeCtx({
      registry,
      state,
      role: "dm",
      view: { page: "preparation", tab: "failing-extension-prep" },
    }),
  );
  assert.match(prep, /Preparazione guasta non è disponibile/);
  assert.match(prep, /data-prep-section="scenes"/);
  const library = renderLibrary(
    makeCtx({ registry, state, view: { page: "library", tab: "failing-extension-library" } }),
  );
  assert.match(library, /Raccolta guasta non è disponibile/);
  assert.match(library, /data-library-scope="available"/);

  resetTableView();
  const ctx = makeCtx({ registry, state, view: { page: "table" } });
  const table = renderTable(ctx);
  assert.match(table, /<g data-ext-slot="map-layer:failing-extension-layer" data-ext-failed><\/g>/);
  assert.match(table, /<section class="table-ext-panel"><h3>Pannello guasto<\/h3>/);
  assert.match(table, /Pannello guasto non è disponibile/);
  assert.match(table, /data-actor="livia"/, "tokens still render");

  // Activating and clicking with the broken tool: a toast, no crash, the tool stays usable.
  const tool = { dataset: { tool: "failing-extension-tool" } };
  fakeTable(ctx, { tools: [tool] });
  tool.onclick();
  const again = fakeTable(ctx, { tools: [tool] });
  again.svg.onclick(click);
  assert.deepEqual(
    ctx.toasts.map((entry) => entry.error),
    [true, true],
  );
  assert.match(ctx.toasts[1].text, /Strumento guasto non ha funzionato/);

  // Queries fall back: no search result, no notification, no draft blocking navigation.
  assert.deepEqual(registry.search(ctx, "x"), []);
  assert.deepEqual(registry.notifications(ctx), []);
  assert.equal(registry.pendingDraft(ctx, { page: "home" }), null);
  assert.equal(registry.emit("commit", {}), 0);
  const phases = new Set(registry.warnings().map((w) => w.phase));
  for (const phase of ["seed", "when", "render", "svg", "activate", "onClick", "search"])
    assert.ok(phases.has(phase), phase);
  const report = registry.reportHTML(ctx);
  assert.match(report, /Pronte/);
  assert.match(report, /avvisi circoscritti/);
});

test("the owner report groups areas by status in plain words", () => {
  const registry = makeRegistry(["sample-extension", registerSample]);
  registry.recordExtension("token-menu", "not-built", {
    backlog: "B12",
    title: { it: "Tavolo: menu della pedina", en: "Table: token menu" },
  });
  registry.recordExtension("chat", "failed", {
    backlog: "B17",
    title: { it: "Tavolo: chat", en: "Table: chat" },
    error: "Unexpected token",
  });
  const it = registry.reportHTML({ lang: "it" });
  assert.match(it, /1 pronte · 1 da costruire · 1 con errori/);
  assert.match(it, /Con errori · non caricate<\/h4><ul><li><strong>B17 · Tavolo: chat<\/strong>/);
  assert.match(it, /resta escluso e il resto dell’app funziona/);
  assert.match(it, /Dettaglio tecnico: Unexpected token/);
  assert.match(
    it,
    /Ancora da costruire \(1\)<\/summary><ul><li><strong>B12 · Tavolo: menu della pedina/,
  );
  const en = registry.reportHTML({ lang: "en" });
  assert.match(en, /With errors · not loaded/);
  assert.match(en, /sample-extension<\/strong> — active · 21 contributions/);
});
