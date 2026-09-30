// R5: one encounter panel (PR-32, Foundry's per-scene encounters and D&D Beyond's «Run
// encounter»), the stale Preparation line (H-04), the palette commands for grid alignment
// and the encounter builder (H-07) and «Copia in un’altra campagna…» on a scene row (CA-88,
// C5). Synthetic sample data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc, icon } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import * as tokenMenu from "../token-menu.mjs";
import * as loot from "../loot.mjs";
import * as compendium from "../compendium.mjs";
import { register as registerSceneAssets } from "../scene-assets.mjs";
import * as D from "../encounter-builder-domain.mjs";
import * as UI from "../encounter-builder.mjs";
import * as P from "../command-palette.mjs";
import { renderPreparation, resetPreparationDraft } from "../preparation.mjs";
import { resetPrepUI } from "../scene-assets-prep.mjs";

const GOBLIN = { creatureId: "srd2024:creature:goblin-warrior" };
const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};
function harness({ builder = true, copyTo = false, lang = "it" } = {}) {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  registry.use("token-menu", tokenMenu.register);
  registry.use("loot", loot.register);
  registry.use("compendium", compendium.register);
  registry.use("scene-assets", registerSceneAssets);
  if (builder) registry.use("encounter-builder", UI.register);
  // The campaign data area's section (C5), as a stand-in with the same id.
  if (copyTo)
    registry.use("campaign-data", (r) =>
      r.add("campaign-section", {
        id: "campaign-data",
        label: { it: "Dati", en: "Data" },
        render: () => "",
      }),
    );
  const store = createStore({ storage: memory() });
  registry.initState(store.state);
  const toasts = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role: "dm",
    lang,
    offline: false,
    view: { page: "preparation", id: "", tab: "" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object" ? (value[ctx.lang] ?? value.it) : String(value ?? ""),
    esc,
    icon,
    toast: (text, error = false) => toasts.push({ text, error }),
    render: () => {},
    navigate: () => {},
    dialog: () => {},
    closeDialog: () => {},
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    canUndo: () => false,
    undoLabel: () => "",
    commit(label, mutator, options = {}) {
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
      });
      return { applied: true, persisted: true };
    },
    registry,
  };
  registry.attach(ctx);
  UI.resetUi();
  resetPrepUI();
  resetPreparationDraft();
  return { ctx, registry, store, toasts };
}
const sceneEditor = (h, id = "old-watch") => {
  h.ctx.view = { page: "preparation", id, tab: "edit" };
  return renderPreparation(h.ctx);
};
const slice = (h) => h.ctx.state.ext["encounter-builder"];

test("PR-32: the scene editor shows the builder, not a second «Incontro preparato» editor", () => {
  const h = harness();
  const empty = sceneEditor(h);
  assert.match(empty, /data-eb-scene="old-watch"/);
  assert.match(empty, /Nuovo incontro per questa scena/);
  assert.doesNotMatch(empty, /class="prep-encounter"/, "the old editor is gone");
  assert.doesNotMatch(empty, /Il bonus è dichiarato/, "H-04");
  let created;
  h.ctx.commit("new", (s) => {
    created = D.createEncounter(s.ext["encounter-builder"], "dm", { sceneId: "old-watch" });
    D.addCreature(s.ext["encounter-builder"], "dm", created.id, GOBLIN);
  });
  const html = sceneEditor(h);
  assert.match(html, new RegExp(`data-eb-open="${created.id}"`));
  assert.match(html, /data-eb-host="scene"/);
  assert.match(html, /Prepara nella scena/);
  assert.match(html, /Avvia combattimento|Prepara nella scena/);
  assert.doesNotMatch(html, /data-eb="back"/, "no way out to a second copy");
});

test("PR-32: a change made in the scene editor is the same object «Incontri» shows", () => {
  const h = harness();
  let created;
  h.ctx.commit("new", (s) => {
    created = D.createEncounter(s.ext["encounter-builder"], "dm", { sceneId: "old-watch" });
    D.addCreature(s.ext["encounter-builder"], "dm", created.id, GOBLIN);
  });
  const [row] = D.sceneEncounters(slice(h), "old-watch")[0].rows;
  // The count is changed where the scene editor shows it: the same encounter object.
  h.ctx.commit("count", (s) =>
    D.changeCount(s.ext["encounter-builder"], "dm", created.id, row.id, 2),
  );
  assert.match(sceneEditor(h), new RegExp(`data-eb-count-of="${row.id}">3<`));
  h.ctx.view = { page: "preparation", id: "", tab: "encounter-builder" };
  const list = UI.renderBuilder(h.ctx);
  assert.match(list, new RegExp(`data-eb-encounter="${created.id}"`));
  assert.match(
    list,
    /Scena: <button[^>]*data-eb="open-scene-of"[^>]*>Il cortile dell’osservatorio/,
  );
  assert.match(list, /non ancora preparato/);
  // Opening it in «Incontri» shows the same row count.
  UI.uiState(h.ctx).openId = created.id;
  assert.match(UI.renderBuilder(h.ctx), new RegExp(`data-eb-count-of="${row.id}">3<`));
});

test("PR-32: linking a draft encounter to a scene, and refusing one prepared elsewhere", () => {
  const h = harness();
  let draft;
  h.ctx.commit("new", (s) => {
    draft = D.createEncounter(s.ext["encounter-builder"], "dm", {});
  });
  assert.deepEqual(D.sceneEncounters(slice(h), "old-watch"), []);
  assert.match(sceneEditor(h), /Collega a questa scena/);
  h.ctx.commit("link", (s) =>
    D.linkToScene(s, s.ext["encounter-builder"], draft.id, "old-watch", "dm"),
  );
  assert.equal(D.sceneEncounters(slice(h), "old-watch")[0].id, draft.id);
  // The seeded lantern encounter, handed off to old-watch, cannot be linked to another scene.
  h.ctx.commit("handoff", (s) => {
    const sl = s.ext["encounter-builder"];
    D.addCreature(sl, "dm", draft.id, GOBLIN);
    D.handOff(s, sl, draft.id, { sceneId: "old-watch", hpMode: "average" }, "dm", {
      tokenMenuSlice: s.ext["token-menu"],
    });
  });
  const other = h.ctx.state.scenes.find((s) => s.id !== "old-watch");
  if (other)
    assert.throws(
      () =>
        h.ctx.commit("relink", (s) =>
          D.linkToScene(s, s.ext["encounter-builder"], draft.id, other.id, "dm"),
        ),
      /already prepared on another scene/,
    );
});

test("PR-32: without the encounter builder the scene keeps Preparation's own editor (H-04 gone)", () => {
  const h = harness({ builder: false });
  const html = sceneEditor(h);
  assert.doesNotMatch(html, /data-eb-scene/);
  assert.match(html, /Incontro preparato/);
  assert.doesNotMatch(html, /Il bonus è dichiarato, non ricavato da una scheda incompleta/);
  assert.doesNotMatch(html, /The bonus is entered, not inferred/);
});

test("PR-32: unsaved scene edits hold the hand-off with its reason (SV-37)", () => {
  const h = harness();
  let created;
  h.ctx.commit("new", (s) => {
    created = D.createEncounter(s.ext["encounter-builder"], "dm", { sceneId: "old-watch" });
  });
  const html = UI.renderSceneEncounter(h.ctx, "old-watch", { blocked: "Salva prima la scena." });
  assert.match(html, /data-eb="handoff" disabled aria-describedby="eb-handoff-why"/);
  assert.match(html, /id="eb-handoff-why">Serve almeno una creatura/);
  h.ctx.commit("add", (s) => D.addCreature(s.ext["encounter-builder"], "dm", created.id, GOBLIN));
  const held = UI.renderSceneEncounter(h.ctx, "old-watch", { blocked: "Salva prima la scena." });
  assert.match(held, /id="eb-handoff-why">Salva prima la scena\./);
  assert.match(
    UI.renderSceneEncounter(h.ctx, "old-watch", { saved: false }),
    /Salva la scena per preparare il suo incontro/,
  );
});

test("H-07: the palette finds grid alignment and the encounter builder, IT and EN", () => {
  for (const [lang, query, id] of [
    ["it", "allinea", "scene-assets.align-grid"],
    ["it", "calibra", "scene-assets.align-grid"],
    ["en", "align grid", "scene-assets.align-grid"],
    ["it", "costruttore di incontri", "encounter-builder.open"],
    ["it", "incontri", "encounter-builder.open"],
    ["en", "encounter builder", "encounter-builder.open"],
  ]) {
    const h = harness({ lang });
    h.ctx.view = { page: "table", id: "", tab: "" };
    const found = P.searchPalette(h.ctx, query).items.map((item) => item.key ?? item.id);
    assert.ok(
      found.slice(0, 5).some((key) => String(key).includes(id)),
      `${lang} «${query}» → ${id}: ${found.slice(0, 5).join(", ")}`,
    );
  }
  const h = harness();
  const navigations = [];
  h.ctx.navigate = (page, params) => navigations.push({ page, params });
  h.registry.run(h.registry.get("command", "scene-assets.align-grid", h.ctx), h.ctx);
  assert.deepEqual(navigations.at(-1), {
    page: "preparation",
    params: { id: "old-watch", tab: "grid" },
  });
});

test("CA-88: a scene row offers «Copia in un’altra campagna…» when the data area runs", () => {
  const without = harness();
  without.ctx.view = { page: "preparation", id: "", tab: "" };
  assert.doesNotMatch(renderPreparation(without.ctx), /data-prep-copy-to/);
  const h = harness({ copyTo: true });
  h.ctx.view = { page: "preparation", id: "", tab: "" };
  const html = renderPreparation(h.ctx);
  assert.match(html, /data-prep-copy-to="old-watch">Copia in un’altra campagna…/);
  h.ctx.lang = "en";
  assert.match(renderPreparation(h.ctx), /Copy to another campaign…/);
});
