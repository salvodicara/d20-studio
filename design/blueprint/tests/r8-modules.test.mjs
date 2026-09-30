// R8 SV-42 (delegated simulation, I-233): Integrazioni › Moduli lists the app's optional
// feature areas beside the integrations, like Foundry's Manage Modules (per world, with
// dependency prompts, a filter and «Deactivate All») and Owlbear's room extensions. One
// module gate in the registry, beside the B29 access gate, hides a switched-off area's
// contributions for everyone in that campaign; its data stays and returns when switched on.
// Only integrated app functions, no third-party code. Every area loaded; synthetic data.
import test from "node:test";
import assert from "node:assert/strict";
import { createRegistry } from "../registry.mjs";
import * as D from "../integrations-domain.mjs";
import { integrationsActions, renderSection, resetIntegrationsView } from "../integrations.mjs";
import { app, memory } from "./r8-harness.mjs";

const ids = (list) => list.map((entry) => entry.id);
const target = (ctx, actorId) => ({
  actorId,
  tokenId:
    ctx.state.scenes
      .find((s) => s.id === ctx.state.activeSceneId)
      ?.tokens.find((t) => t.actorId === actorId)?.id ?? null,
  sceneId: ctx.state.activeSceneId,
});
function switchOff(h, areas) {
  const cid = h.ctx.state.campaign.id;
  h.ctx.commit("Moduli", (draft) => D.saveFeatures(draft.ext.integrations, cid, { areas }, "dm"));
}

test("the module gate hides a switched-off area's command, section, panel and token-menu entry; data stays", async () => {
  const h = await app({ role: "dm" });
  const { registry, ctx } = h;
  const goblin = Object.values(ctx.state.actors).find((a) => a.kind === "npc").id;
  const before = {
    command: ids(registry.list("command", ctx)).includes("random-tables.open"),
    prep: ids(registry.list("preparation-section", ctx)).includes("random-tables"),
    panel: ids(registry.list("table-panel", ctx)).includes("random-tables"),
    archive: ids(registry.list("campaign-section", ctx)).includes("quests-archive"),
    menu: ids(registry.list("token-menu", ctx, target(ctx, goblin))).includes(
      "handouts-reveal-art",
    ),
  };
  assert.deepEqual(Object.values(before), [true, true, true, true, true], JSON.stringify(before));
  const tables = structuredClone(ctx.state.ext["random-tables"]);
  switchOff(h, {
    "random-tables": false,
    handouts: false,
    quests: false,
    "relations-graph": false,
  });
  assert.deepEqual(registry.switchedOff(ctx).sort(), [
    "handouts",
    "quests",
    "random-tables",
    "relations-graph",
  ]);
  for (const role of ["dm", "player"]) {
    ctx.role = role;
    assert.ok(
      !ids(registry.list("command", ctx)).some((id) => id.startsWith("random-tables")),
      role,
    );
    assert.ok(!ids(registry.list("preparation-section", ctx)).includes("random-tables"), role);
    assert.ok(!ids(registry.list("table-panel", ctx)).includes("random-tables"), role);
    assert.ok(!ids(registry.list("campaign-section", ctx)).includes("quests-archive"), role);
    assert.equal(registry.get("command", "random-tables.open", ctx), null, role);
    assert.ok(
      !ids(registry.list("token-menu", ctx, target(ctx, goblin))).includes("handouts-reveal-art"),
    );
  }
  ctx.role = "dm";
  // A stale handle runs nothing: the area is off.
  const stale = registry.get("command", "random-tables.open");
  assert.equal(registry.run(stale, ctx), false);
  assert.match(h.log.toasts.at(-1).text, /spenta in questa campagna/);
  // Search and the palette follow the gate too.
  assert.ok(
    !registry.search(ctx, "tabelle").some((row) => row.provider === "random-tables-search"),
  );
  // Data kept: the slice is untouched and returns with the area.
  assert.deepEqual(ctx.state.ext["random-tables"], tables);
  switchOff(h, { "random-tables": true, handouts: true, quests: true, "relations-graph": true });
  assert.deepEqual(registry.switchedOff(ctx), []);
  assert.ok(ids(registry.list("command", ctx)).includes("random-tables.open"));
  assert.ok(ids(registry.list("campaign-section", ctx)).includes("quests-archive"));
  assert.deepEqual(ctx.state.ext["random-tables"], tables);
});

test("dependencies, protected core and history: Foundry's dependency prompt per campaign", async () => {
  const h = await app({ role: "dm" });
  const cid = h.ctx.state.campaign.id;
  // The relationship graph needs the archive: switching quests off asks for both.
  assert.deepEqual(D.areaDependencyChanges({ quests: false }, "quests", false), [
    "relations-graph",
  ]);
  assert.deepEqual(
    D.areaDependencyChanges({ quests: false, "relations-graph": true }, "relations-graph", true),
    ["quests"],
  );
  assert.throws(
    () =>
      h.ctx.commit("x", (draft) =>
        D.saveFeatures(draft.ext.integrations, cid, { areas: { quests: false } }, "dm"),
      ),
    (error) => /Grafo delle relazioni/.test(error.it ?? error.message),
  );
  // Only the DM saves; a player refusal changes nothing.
  assert.throws(
    () =>
      D.saveFeatures(
        structuredClone(h.ctx.state.ext.integrations),
        cid,
        { areas: { assistant: false } },
        "player",
      ),
    (error) => /Solo il DM/.test(error.it),
  );
  // Protected core areas are never switched: a gate cannot hide them even if asked.
  assert.ok(!D.FEATURE_AREA_IDS.includes("safety"));
  assert.ok(!D.FEATURE_AREA_IDS.includes("integrations"));
  assert.ok(!D.FEATURE_AREA_IDS.includes("token-menu"));
  const slice = structuredClone(h.ctx.state.ext.integrations);
  slice.campaigns[cid].areas.safety = false;
  assert.deepEqual(D.disabledAreas(D.normalizeSlice(slice), cid), []);
  // History says what was switched and that data is kept.
  switchOff(h, { assistant: false });
  const last = h.ctx.state.ext.integrations.campaigns[cid].history.at(-1);
  assert.match(last.it, /Funzione spenta \(dati conservati\): Assistente/);
  // Another campaign keeps its own switches (per campaign, like Foundry worlds).
  assert.equal(D.areaOn(h.ctx.state.ext.integrations, "another-campaign", "assistant"), true);
});

test("the Modules page: areas beside integrations, search, Deactivate all, core list, reasons", async () => {
  const h = await app({ role: "dm", lang: "it" });
  resetIntegrationsView();
  h.ctx.view = { page: "campaign", tab: "integrations", id: "modules" };
  let html = renderSection(h.ctx);
  assert.match(html, /Funzioni dell’app/);
  assert.match(html, /data-int-area="random-tables"[^>]*checked/);
  assert.match(html, /Tabelle casuali e mazzi di carte/);
  assert.match(html, /Richiede: Missioni, fazioni e archivio/);
  assert.match(html, /data-int-module-search/);
  assert.match(html, /Sempre attive \(\d+\)/);
  assert.match(html, /Sicurezza del tavolo/);
  assert.match(html, /nessun codice di terze parti/);
  // Nothing changed yet: Save and Discard say why they are disabled.
  assert.match(html, /data-int-modules-save disabled aria-describedby="int-why-save"/);
  assert.match(html, /id="int-why-save">Nessuna modifica da salvare/);
  // «Disattiva tutti» switches everything off, still to be saved.
  integrationsActions.deactivateAll(h.ctx);
  html = renderSection(h.ctx);
  assert.match(html, /data-int-area="random-tables"(?![^>]*checked)/);
  assert.match(html, /data-int-modules-off disabled aria-describedby="int-why-off"/);
  assert.equal(h.registry.switchedOff(h.ctx).length, 0, "nothing applies before Save");
  integrationsActions.saveModules(h.ctx);
  assert.ok(h.registry.switchedOff(h.ctx).includes("random-tables"));
  // The player sees the same page read-only, and the switched-off areas are gone for them.
  h.ctx.role = "player";
  html = renderSection(h.ctx);
  assert.doesNotMatch(html, /data-int-area=/);
  assert.match(html, /data-int-module-row="random-tables"/);
  assert.ok(!ids(h.registry.list("command", h.ctx)).includes("random-tables.open"));
  // The palette finds the Modules page by the words a new user types.
  h.ctx.role = "dm";
  const command = h.registry.get("command", "integrations.modules", h.ctx);
  assert.ok(command);
  h.registry.run(command, h.ctx);
  assert.deepEqual(h.ctx.view.id, "modules");
});

test("registry: a switched-off area hears lifecycle events only; its tool teardown still runs", () => {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  const heard = [];
  let off = [];
  registry.use("gatekeeper", (api) => api.registerModuleGate({ disabled: () => off }));
  registry.use("probe", (api) => {
    api.on("turn-start", () => heard.push("turn-start"));
    api.on("reset", () => heard.push("reset"));
    api.add("command", {
      id: "probe.run",
      label: { it: "Prova", en: "Probe" },
      run: () => heard.push("run"),
    });
  });
  const ctx = { role: "dm", lang: "it", state: { campaign: { id: "c1" } }, toast: () => {} };
  registry.attach(ctx);
  registry.emit("turn-start", {});
  off = ["probe", "gatekeeper", "core"];
  ctx.state = { campaign: { id: "c1" } }; // a new state object, as after a commit
  registry.emit("turn-start", {});
  registry.emit("reset", {});
  assert.deepEqual(heard, ["turn-start", "reset"]);
  assert.deepEqual(registry.switchedOff(ctx), ["probe"], "never itself nor the core");
  assert.equal(registry.list("command", ctx).length, 0);
  assert.equal(registry.run(registry.get("command", "probe.run"), ctx), false);
  // One gate per area; a gate needs disabled(ctx).
  const twice = registry.use("double", (api) => {
    api.registerModuleGate({ disabled: () => [] });
    api.registerModuleGate({ disabled: () => [] });
  });
  assert.equal(twice.status, "failed");
  assert.equal(registry.use("broken", (api) => api.registerModuleGate({})).status, "failed");
});
