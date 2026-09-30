// P8 fixes — adventures: world entries in a package (BI-40), the DM's Universe (BI-40),
// «Parti da un'avventura» (BI-41) and «Importa documento» (BI-44). Real store and registry
// with the neighbouring areas; synthetic demo data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc, icon } from "../ui.mjs";
import * as adv from "../adventures.mjs";
import * as cm from "../campaign-members.mjs";
import * as handouts from "../handouts.mjs";
import * as rt from "../random-tables.mjs";
import * as eb from "../encounter-builder.mjs";
import { createCampaignEntryNow, listCampaignEntries } from "../campaign-content.mjs";

afterEach(adv.resetAdventuresUI);

const AREAS = [
  ["campaign-members", cm.register],
  ["handouts", handouts.register],
  ["random-tables", rt.register],
  ["encounter-builder", eb.register],
  ["adventures", adv.register],
];

/** Real store + registry with the areas, and a ctx whose commit/undo follow app.mjs. */
function harness({ role = "dm", lang = "it", areas = AREAS } = {}) {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const store = createStore({ storage });
  const registry = createRegistry({ document: undefined, logger: null, deviceStorage: storage });
  for (const [id, register] of areas) {
    const row = registry.use(id, register);
    assert.equal(row.status, "built", `${id}: ${row.error ?? ""}`);
  }
  registry.initState(store.state);
  store.persist();
  const toasts = [];
  const dialogs = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    view: { page: "adventures", id: "", tab: "" },
    t: (it, en) => (ctx.lang === "en" ? en : it),
    label: (v) =>
      typeof v === "object" && v ? v[ctx.lang] || v.it || v.en || "" : String(v ?? ""),
    esc,
    icon,
    registry,
    toast: (text, error = false) => toasts.push({ text, error }),
    navigate: (page, params = {}) => {
      ctx.view = { page, id: params.id ?? "", tab: params.tab ?? "" };
    },
    render() {},
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    commit(label, mutator, options = {}) {
      const before = store.state;
      try {
        store.commit(label, mutator, ctx.role, {
          shared: !options.local,
          visibility: options.visibility,
          undoable: options.undoable,
        });
      } catch (error) {
        if (error?.constructor === Error) error.refusal = true;
        throw error;
      }
      if (options.newUndoVisit) store.history.length = 0;
      if (options.rebaseHistory)
        for (const entry of store.history) options.rebaseHistory(entry.before);
      registry.emitStateEvents(before, store.state);
      if (options.afterCommit) options.afterCommit(store.state);
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(ctx.role);
      registry.afterUndo(current, store.state);
      store.persist();
    },
    canUndo: () => store.history.at(-1)?.controller === ctx.role,
    undoLabel: () => store.history.at(-1)?.label ?? "",
  };
  const specs = Object.fromEntries(
    registry.slices().map((d) => [d.name, { version: d.version, normalize: d.normalize }]),
  );
  return { store, registry, ctx, toasts, dialogs, specs };
}
const slice = (state) => state.ext[adv.ID];
const refusal = (fn, pattern) =>
  assert.throws(fn, (error) => Boolean(error.it) && (!pattern || pattern.test(error.it)));
const CRYPT_PICKS = [
  "scene:old-watch",
  "material:material-crypt",
  "material:material-notice",
  "table:swamp-encounters",
  "encounter:enc-lantern",
];
function createCrypt(h) {
  return adv.submitCreate(h.ctx, {
    title: "La cripta",
    summary: "Il cortile, la cripta e chi ha riacceso la lanterna.",
    startSceneKey: "scene:old-watch",
    introKey: "material:material-notice",
    picks: CRYPT_PICKS,
  });
}

function worldEntry(h, title, worldType = "place") {
  let id;
  h.ctx.commit("fixture: world entry", (draft) => {
    id = createCampaignEntryNow(
      draft,
      { id: `w-${title.length}-${worldType}`, kind: "world", worldType, title, body: `${title}: testo.` },
      "dm",
    ).entryId;
  });
  return id;
}
function secondCampaign(h, name = "Gruppo del giovedì") {
  let id;
  h.ctx.commit("create", (draft) => {
    id = cm.createCampaign(draft, { name }, "dm");
  });
  return id;
}
const worldTitles = (h, campaignId) =>
  listCampaignEntries(h.store.state, { campaignId, kind: "world" }, "dm").map((e) => e.data.title);

test("BI-40: an adventure carries the World's places and factions into the campaign in play", () => {
  const h = harness();
  const origin = h.store.state.campaign.id;
  const place = worldEntry(h, "Il faro di Bruma", "place");
  const faction = worldEntry(h, "I Custodi della lanterna", "faction");
  const catalog = adv.sourceCatalog(h.store.state, origin, h.specs);
  assert.deepEqual(
    catalog.world.map((w) => w.name).sort(),
    ["I Custodi della lanterna", "Il faro di Bruma"],
  );
  const id = adv.submitCreate(h.ctx, {
    title: "Il faro",
    summary: "Un faro e i suoi custodi.",
    picks: ["scene:old-watch", `world:${place}`, `world:${faction}`],
  });
  const version = adv.latest(adv.adventureOf(h.store.state, id));
  assert.deepEqual(
    version.items.filter((i) => i.type === "world").map((i) => i.data.worldType).sort(),
    ["faction", "place"],
  );
  // A parked campaign cannot receive World entries yet: the rows say so.
  const other = secondCampaign(h);
  const plan = adv.planImport(h.store.state, id, { campaignId: other, types: adv.TYPES }, "dm", h.specs);
  assert.deepEqual(
    plan.rows.filter((r) => r.type === "world").map((r) => r.action),
    ["unavailable", "unavailable"],
  );
  // Launched, it receives them (private to the DM) with the rest of the package.
  h.ctx.commit("launch", (draft) => cm.launchCampaign(draft, other, "dm"));
  h.ctx.commit("launch end", (draft) => cm.completeLaunch(draft));
  assert.equal(h.store.state.campaign.id, other);
  h.ctx.commit("import", (draft) =>
    adv.applyImport(draft, id, { campaignId: other, types: adv.TYPES }, "dm", h.specs),
  );
  assert.deepEqual(worldTitles(h, other).sort(), ["I Custodi della lanterna", "Il faro di Bruma"]);
  const record = adv.recordOf(h.store.state, other, id);
  const target = record.items[`world:${place}`].targetId;
  assert.ok(listCampaignEntries(h.store.state, { campaignId: other, kind: "world" }, "dm").some((e) => e.id === target));
  // The book export has a World chapter for the DM.
  assert.match(adv.adventureHTML(adv.adventureOf(h.store.state, id), version, { dmNotes: true }), /<h2>Mondo<\/h2>/);
});

test("BI-40: the Universe keeps world entries for every campaign and copies them into the World", () => {
  const h = harness();
  const campaignId = h.store.state.campaign.id;
  const place = worldEntry(h, "La palude", "place");
  h.ctx.commit("universe", (draft) => {
    adv.addUniverseEntries(draft, [{ worldType: "event", title: "La caduta di Bruma", body: "Cent'anni fa." }], "dm");
    adv.universeFromCampaign(draft, [place], "dm");
  });
  const universe = adv.universeOf(h.store.state);
  assert.deepEqual(universe.map((e) => e.title), ["La caduta di Bruma", "La palude"]);
  assert.throws(() => adv.addUniverseEntries(h.store.state, [{ title: "x" }], "player"), /DM/);
  const other = secondCampaign(h);
  h.ctx.commit("launch", (draft) => cm.launchCampaign(draft, other, "dm"));
  h.ctx.commit("launch end", (draft) => cm.completeLaunch(draft));
  h.ctx.commit("use", (draft) => adv.useUniverseEntries(draft, [universe[0].id], "dm"));
  assert.deepEqual(worldTitles(h, other), ["La caduta di Bruma"]);
  assert.ok(adv.universeOf(h.store.state)[0].usedIn[other]);
  assert.ok(!worldTitles(h, campaignId).includes("La caduta di Bruma"), "the first campaign is untouched");
  // The list page shows the Universe with «Usa in questa campagna».
  h.ctx.view = { page: "adventures", id: "", tab: "" };
  const html = h.registry.get("library-section", adv.ID).render(h.ctx);
  assert.match(html, /Universo/);
  assert.match(html, /Già nel Mondo di questa campagna/);
  assert.match(html, /Importa documento…/);
});

test("BI-44: «Importa documento» reads Markdown and HTML (Word web page) into World or Universe entries", () => {
  const md = adv.parseDocument(
    "# La cripta\nIntro.\n\n## Il cancello\nUn **cancello** di [ferro](https://x).\n\n## La sala\n- uno\n",
    "markdown",
    "cripta.md",
  );
  assert.deepEqual(md.sections.map((s) => s.title), ["La cripta", "Il cancello", "La sala"]);
  assert.equal(md.sections[1].body, "Un cancello di ferro.");
  const html = adv.parseDocument(
    '<html><head><title>Libro</title><style>p{color:red}</style></head><body><h1>Capitolo</h1><p>Perch&eacute; &egrave; <b>buio</b></p><script>alert(1)</script><img src="x.png" onerror="alert(2)"><h2>Stanza</h2><p>Due<br>righe</p></body></html>',
    "html",
    "libro.htm",
  );
  assert.deepEqual(html.sections, [
    { title: "Capitolo", body: "Perché è buio" },
    { title: "Stanza", body: "Due\nrighe" },
  ]);
  assert.equal(adv.documentKind("x.HTM"), "html");
  assert.throws(() => adv.documentKind("x.docx"), (e) => /Pagina Web/.test(e.it));
  const h = harness();
  const campaignId = h.store.state.campaign.id;
  h.ctx.commit("doc", (draft) => adv.importDocument(draft, md, "campaign", "dm"));
  assert.deepEqual(worldTitles(h, campaignId).sort(), ["Il cancello", "La cripta", "La sala"]);
  h.ctx.commit("doc", (draft) => adv.importDocument(draft, html, "universe", "dm"));
  assert.deepEqual(adv.universeOf(h.store.state).map((e) => e.title), ["Capitolo", "Stanza"]);
  // The dialog lists the sections and the destination.
  adv.openDocumentImport(h.ctx, md, "cripta.md");
  assert.match(h.dialogs.at(-1).body, /3 sezioni, una voce per titolo/);
});

test("BI-41: a new campaign starts from an adventure (the create-campaign dialog's choice)", () => {
  const h = harness();
  const id = adv.submitCreate(h.ctx, {
    title: "La cripta",
    summary: "Il cortile e la cripta.",
    startSceneKey: "scene:old-watch",
    picks: ["scene:old-watch"],
  });
  assert.ok(adv.campaignStartChoices(h.store.state).some((c) => c.id === id && c.title === "La cripta"));
  const cmd = h.registry.get("command", "adventures.create-campaign", h.ctx);
  assert.ok(cmd, "the create-campaign command is registered for the DM");
  const result = adv.startCampaignFromAdventure(h.ctx, { adventureId: id, name: "Gruppo del venerdì" });
  assert.ok(result?.campaignId);
  assert.equal(h.store.state.ext[cm.ID].campaigns[result.campaignId] ? true : Boolean(cm.metaOf(h.store.state, result.campaignId)), true);
  assert.equal(adv.recordOf(h.store.state, result.campaignId, id).version, 1);
});
