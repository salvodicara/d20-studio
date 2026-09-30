// B58 relations-graph.mjs: the relationship graph of the campaign (Kanka relations
// explorer, Obsidian graph view, LegendKeeper boards). Real registry, real store and the
// real B43 area; synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc, icon } from "../ui.mjs";
import { register as registerQuests } from "../quests.mjs";
import * as G from "../relations-graph.mjs";
import { revealRelation, hideRelation } from "../factions.mjs";
import { deviceStorage, revealBlock } from "../journal-plus.mjs";
import {
  applyCampaignDraft,
  createCampaignDraft,
  previewCampaignDraft,
  saveCampaignDraft,
} from "../campaign-content.mjs";

const memory = (values = new Map()) => ({
  values,
  getItem: (key) => (values.has(key) ? values.get(key) : null),
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: (key) => values.delete(key),
});
function harness({ role = "dm", withGraph = true, storage = memory() } = {}) {
  G.clearPrefs(deviceStorage());
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  registry.use("quests", registerQuests);
  if (withGraph) registry.use("relations-graph", G.register);
  const store = createStore({ storage });
  registry.initState(store.state);
  const dialogs = [];
  const toasts = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang: "it",
    offline: false,
    view: { page: "campaign", id: "relations", tab: "quests-archive" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object" ? (value[ctx.lang] ?? value.it) : String(value ?? ""),
    esc,
    icon,
    toast: (text, error = false) => toasts.push({ text, error }),
    toasts,
    renders: 0,
    render() {
      ctx.renders++;
    },
    navigate: (page, params = {}) => (ctx.view = { page, ...params }),
    dialog: (title, body, options = {}) => dialogs.push({ title, body, ...options }),
    dialogs,
    closeDialog() {},
    canUndo: () => store.history.length > 0,
    undoLabel: () => "",
    commit(label, mutator, options = {}) {
      if (ctx.offline && !options.local)
        throw Object.assign(Error("offline"), { it: "Sei senza rete", en: "You are offline" });
      store.commit(label, mutator, ctx.role, { shared: !options.local, ...options });
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
  return { ctx, store, registry, storage };
}
const ids = (list) => list.map((row) => row.id);
const edgeIds = (state, role, mode = "related") => ids(G.collectGraph(state, role, { mode }).edges);
const nodeIds = (state, role, mode = "related") => ids(G.collectGraph(state, role, { mode }).nodes);
const form = (entries) => {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
};
function archiveHTML(ctx, registry) {
  const section = registry.get("campaign-section", "quests-archive", ctx);
  return registry.slot("campaign-section", section, ctx);
}

test("projection: the DM reads secret connections and the hidden quest, the player does not", () => {
  const { ctx } = harness();
  const dm = G.collectGraph(ctx.state, "dm", { mode: "related" });
  const player = G.collectGraph(ctx.state, "player", { mode: "related" });
  const secret = dm.edges.find((e) => e.id === "rel:rel-tessa-goblins");
  assert.equal(secret.secret, true);
  assert.equal(secret.revealed, false);
  assert.ok(ids(dm.nodes).includes("page:quest-mimic"), "DM sees the hidden quest");
  assert.ok(ids(dm.nodes).includes("actor:goblin-1"), "DM sees the goblin sheets");
  for (const id of ["rel:rel-tessa-goblins", "rel:rel-varro-guild"])
    assert.ok(!ids(player.edges).includes(id), `player reads ${id}`);
  assert.ok(!ids(player.nodes).includes("page:quest-mimic"), "player sees the hidden quest");
  assert.ok(!ids(player.nodes).includes("actor:goblin-1"), "player reads a DM-only sheet");
  // Absent, not masked: nothing of the secret remains in the player's graph.
  assert.ok(!JSON.stringify(player).includes("paga in segreto"));
  assert.ok(!JSON.stringify(player).includes("debiti"));
  assert.deepEqual(
    player.edges.find((e) => e.id === "rel:rel-oben-doran"),
    {
      secret: false,
      revealed: false,
      id: "rel:rel-oben-doran",
      kind: "relation",
      relationId: "rel-oben-doran",
      label: { it: "maestro d’armi di", en: "weapons master of" },
      from: "page:page-oben",
      to: "actor:doran",
    },
  );
  // Non-members see nothing.
  assert.deepEqual(G.collectGraph(ctx.state, "stranger"), { nodes: [], edges: [] });
});

test("secret connection revealed to Livia reaches her player only; hidden again it leaves", () => {
  const { ctx } = harness();
  ctx.commit("to Doran", (d) =>
    revealRelation(d, "dm", "rel-tessa-goblins", { mode: "some", actorIds: ["doran"] }),
  );
  assert.ok(
    !edgeIds(ctx.state, "player").includes("rel:rel-tessa-goblins"),
    "revealed to Doran, yet the player (Livia) reads it",
  );
  ctx.commit("to Livia", (d) =>
    revealRelation(d, "dm", "rel-tessa-goblins", { mode: "some", actorIds: ["livia"] }),
  );
  const edge = G.collectGraph(ctx.state, "player").edges.find(
    (e) => e.id === "rel:rel-tessa-goblins",
  );
  assert.equal(edge.revealed, true);
  assert.equal(edge.reveal, undefined, "the player never gets the recipients list");
  const dmEdge = G.collectGraph(ctx.state, "dm").edges.find(
    (e) => e.id === "rel:rel-tessa-goblins",
  );
  assert.deepEqual(dmEdge.reveal, { mode: "some", actorIds: ["livia"] });
  ctx.commit("hide", (d) => hideRelation(d, "dm", "rel-tessa-goblins"));
  assert.ok(!edgeIds(ctx.state, "player").includes("rel:rel-tessa-goblins"));
});

test("Kanka explorer modes; no relation is inferred from text, [[links]] only", () => {
  const { ctx } = harness();
  const only = edgeIds(ctx.state, "dm", "relations");
  assert.ok(
    only.every((id) => id.startsWith("rel:")),
    "relations mode draws only relations",
  );
  const related = edgeIds(ctx.state, "dm", "related");
  for (const id of [
    "giver:quest-seal",
    "parent:page-tessa",
    "element:quest-seal:scene:old-watch",
    "element:page-goblins:actor:goblin-1",
    "element:quest-lantern:entry:legacy-recap-summary",
  ])
    assert.ok(related.includes(id), `related mode misses ${id}`);
  assert.ok(!related.some((id) => id.startsWith("mention:")), "related mode draws [[links]]");
  const mentions = G.collectGraph(ctx.state, "dm", { mode: "mentions" }).edges;
  assert.ok(ids(mentions).includes("mention:page-guild:page-oben"));
  // «L’olio arriva da Casa Varro» names Casa Varro without [[ ]]: no line, in any mode.
  for (const mode of ["relations", "related", "mentions"])
    assert.ok(
      !G.collectGraph(ctx.state, "dm", { mode }).edges.some(
        (e) =>
          [e.from, e.to].includes("page:page-observatory") &&
          [e.from, e.to].includes("page:page-varro"),
      ),
      "a plain mention became a line in mode " + mode,
    );
  // A [[link]] inside an unrevealed secret block: the DM's line is marked, the player has none.
  assert.equal(mentions.find((e) => e.id === "mention:quest-seal:page-tessa").secret, true);
  assert.ok(!edgeIds(ctx.state, "player", "mentions").includes("mention:quest-seal:page-tessa"));
  ctx.commit("reveal block", (d) =>
    revealBlock(d, "dm", "quest-seal", "seal-b2", { mode: "all", actorIds: [] }),
  );
  assert.ok(edgeIds(ctx.state, "player", "mentions").includes("mention:quest-seal:page-tessa"));
  assert.equal(
    G.collectGraph(ctx.state, "dm", { mode: "mentions" }).edges.find(
      (e) => e.id === "mention:quest-seal:page-tessa",
    ).secret,
    false,
  );
});

function saveEntry(ctx, role, { id, kind, title, links, access, worldType = "other" }) {
  const previous = ctx.role;
  ctx.role = role;
  ctx.commit("entry", (d) => {
    createCampaignDraft(d, { id, kind, campaignId: "lanterns" }, role);
    saveCampaignDraft(
      d,
      id,
      {
        data: {
          title,
          body: "Testo sintetico.",
          worldType,
          questStatus: "open",
          sessionId: null,
          narratorActorId: null,
          links,
          sections: [],
        },
        access,
      },
      role,
    );
    const { reviewKey } = previewCampaignDraft(d, id, role);
    return applyCampaignDraft(d, id, { reviewKey }, role);
  });
  ctx.role = previous;
  return ctx.state.campaignContent.entries.at(-1).id;
}

test("campaign entries: a World entry and its links join the graph; «Solo io» never reaches the DM", () => {
  const { ctx } = harness();
  const place = saveEntry(ctx, "dm", {
    id: "draft-world-ford",
    kind: "world",
    title: "Il guado delle lanterne",
    worldType: "place",
    links: [
      { kind: "actor", id: "doran" },
      { kind: "entry", id: "legacy-recap-summary" },
    ],
    access: { mode: "campaign", grants: [] },
  });
  for (const role of ["dm", "player"]) {
    const graph = G.collectGraph(ctx.state, role, { mode: "related" });
    const node = graph.nodes.find((n) => n.id === "entry:" + place);
    assert.equal(node?.type, "place", `${role}: World place entry missing`);
    assert.equal(node.world, true);
    assert.ok(ids(graph.edges).includes(`link:${place}:actor:doran`));
    assert.ok(ids(graph.edges).includes(`link:${place}:entry:legacy-recap-summary`));
  }
  const note = saveEntry(ctx, "player", {
    id: "draft-note-livia",
    kind: "note",
    title: "Sospetti di Livia",
    links: [{ kind: "actor", id: "livia" }],
    access: { mode: "private", grants: [] },
  });
  assert.ok(nodeIds(ctx.state, "player").includes("entry:" + note), "the author reads her note");
  assert.ok(edgeIds(ctx.state, "player").includes(`link:${note}:actor:livia`));
  assert.ok(!nodeIds(ctx.state, "dm").includes("entry:" + note), "the DM reads a «Solo io» note");
  assert.ok(
    !JSON.stringify(G.collectGraph(ctx.state, "dm", { mode: "mentions" })).includes("Sospetti"),
  );
});

test("view: type filter, orphans, local graph with depth, lanes of parallel lines", () => {
  const { ctx } = harness();
  const graph = G.collectGraph(ctx.state, "dm", { mode: "related" });
  const noQuests = G.viewGraph(graph, { hidden: ["quest"] });
  assert.ok(!noQuests.nodes.some((n) => n.type === "quest"));
  assert.ok(!noQuests.edges.some((e) => e.id.startsWith("giver:")));
  const all = G.viewGraph(graph, {});
  assert.ok(ids(all.nodes).includes("page:quest-wagon"), "orphans shown by default");
  const linked = G.viewGraph(graph, { orphans: false });
  assert.ok(!ids(linked.nodes).includes("page:quest-wagon"), "orphan kept with orphans off");
  const local1 = G.viewGraph(graph, { focus: "page:page-tessa", depth: 1 });
  assert.deepEqual(
    ids(local1.nodes).sort(),
    ["page:page-goblins", "page:page-tessa", "page:page-varro"].sort(),
  );
  const local2 = G.viewGraph(graph, { focus: "page:page-tessa", depth: 2 });
  assert.ok(ids(local2.nodes).includes("page:page-guild") && local2.nodes.length > 3);
  // The centre stays visible even when its type is filtered out.
  const hiddenCentre = G.viewGraph(graph, { focus: "page:page-tessa", hidden: ["person"] });
  assert.ok(ids(hiddenCentre.nodes).includes("page:page-tessa"));
  // Tessa → Casa Varro twice (relation and nested page): two lanes, never on one line.
  const lanes = local1.edges
    .filter((e) => [e.from, e.to].sort().join() === "page:page-tessa,page:page-varro")
    .map((e) => e.lane)
    .sort();
  assert.deepEqual(lanes, [-0.5, 0.5]);
  assert.equal(local1.nodes.find((n) => n.id === "page:page-tessa").degree, 3);
});

test("layout: deterministic, inside the board, names apart, arranged entries stay put", () => {
  const { ctx } = harness();
  const view = G.viewGraph(G.collectGraph(ctx.state, "dm", { mode: "mentions" }), {});
  const box = { width: 860, height: 600 };
  const first = G.layoutGraph(view.nodes, view.edges, box);
  const second = G.layoutGraph(view.nodes, view.edges, box);
  assert.deepEqual([...first], [...second]);
  for (const [, p] of first) {
    assert.ok(p.x >= 92 && p.x <= 860 - 92, "x inside the board " + p.x);
    assert.ok(p.y >= 34 && p.y <= 600 - 50, "y inside the board " + p.y);
  }
  // No two nodes share a spot (the separation pass keeps nodes and names apart).
  const points = [...first.values()];
  for (let i = 0; i < points.length; i++)
    for (let j = i + 1; j < points.length; j++)
      assert.ok(
        Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y) > 30,
        "two entries overlap",
      );
  const pin = { x: 0.1, y: 0.9 };
  const pinned = G.layoutGraph(view.nodes, view.edges, {
    ...box,
    pinned: { "page:page-tessa": pin },
  });
  assert.deepEqual(pinned.get("page:page-tessa"), G.toBox(pin, box));
  assert.deepEqual(G.toFraction(G.toBox(pin, box), box), pin);
});

test("arrangement: personal, persistent after reload, undoable, offline allowed", () => {
  const storage = memory();
  const { ctx, store } = harness({ role: "player", storage });
  G.updatePrefs(ctx, { view: "graph" });
  const model = G.buildModel(ctx, G.prefsFor(ctx));
  assert.equal(model.editable, true);
  ctx.offline = true; // an arrangement is a local change of this identity
  G.dropNode(ctx, model, "page:page-tessa", { x: 150, y: 120 });
  const mine = G.layoutOf(ctx.state, "player");
  assert.equal(Object.keys(mine).length, model.view.nodes.length, "the whole board is kept");
  assert.deepEqual(mine["page:page-tessa"], G.toFraction({ x: 150, y: 120 }, model.box));
  assert.deepEqual(G.layoutOf(ctx.state, "dm"), {}, "the DM does not get the player's board");
  const after = G.buildModel(ctx, G.prefsFor(ctx));
  assert.deepEqual(after.positions.get("page:page-tessa"), { x: 150, y: 120 });
  for (const node of model.view.nodes.filter((n) => n.id !== "page:page-tessa"))
    assert.deepEqual(
      after.positions.get(node.id),
      G.toBox(G.toFraction(model.positions.get(node.id), model.box), model.box),
      "an entry moved by itself: " + node.id,
    );
  // Reload: a new store on the same storage keeps the arrangement.
  const reloaded = createStore({ storage });
  assert.deepEqual(G.layoutOf(reloaded.state, "player"), mine);
  assert.equal(store.state.log.at(-1).visibility, "private");
  ctx.offline = false;
  ctx.undo();
  assert.deepEqual(G.layoutOf(ctx.state, "player"), {}, "Undo puts the entry back");
  // Refusals: an entry the player cannot read, an invalid position, nothing to reset.
  assert.throws(
    () =>
      ctx.commit("x", (d) => G.placeNodes(d, "player", { "page:quest-mimic": { x: 0.5, y: 0.5 } })),
    /non è nel tuo grafo/,
  );
  assert.throws(
    () =>
      ctx.commit("x", (d) => G.placeNodes(d, "player", { "page:page-tessa": { x: "a", y: 1 } })),
    /Posizione non valida/,
  );
  assert.throws(() => G.relayout(ctx), /già disposto/);
  G.dropNode(ctx, model, "page:page-tessa", { x: 150, y: 120 });
  G.relayout(ctx);
  assert.deepEqual(G.layoutOf(ctx.state, "player"), {});
  // Each board format keeps its own arrangement: a phone board is not the computer's.
  ctx.commit(
    "narrow",
    (d) => G.placeNodes(d, "player", { "page:page-oben": { x: 0.5, y: 0.5 } }, "narrow"),
    { local: true },
  );
  assert.deepEqual(G.layoutOf(ctx.state, "player"), {}, "the wide board changed");
  assert.deepEqual(G.layoutOf(ctx.state, "player", "narrow"), {
    "page:page-oben": { x: 0.5, y: 0.5 },
  });
  assert.throws(
    () =>
      ctx.commit("x", (d) =>
        G.placeNodes(d, "player", { "page:page-oben": { x: 0.5, y: 0.5 } }, "square"),
      ),
    /Formato/,
  );
  G.relayout(ctx, "narrow");
  assert.deepEqual(G.layoutOf(ctx.state, "player", "narrow"), {});
  // A local graph arranges itself: dropping there saves nothing.
  const local = G.buildModel(ctx, { ...G.prefsFor(ctx), focus: "page:page-tessa" });
  assert.equal(local.editable, false);
  assert.equal(G.dropNode(ctx, local, "page:page-tessa", { x: 1, y: 1 }), false);
});

test("slice and preferences normalize: invalid data dropped, a newer version refused", () => {
  const value = G.normalizeGraphState(
    {
      layouts: {
        lanterns: {
          dm: {
            wide: { "page:page-tessa": { x: 0.2, y: 0.3 }, "bad id": { x: 0.1, y: 0.1 } },
            square: { "page:page-tessa": { x: 0.2, y: 0.3 } },
          },
          player: { narrow: { "page:page-oben": { x: 2, y: 0.3 } } },
        },
        broken: "x",
      },
    },
    1,
  );
  assert.deepEqual(value, {
    layouts: { lanterns: { dm: { wide: { "page:page-tessa": { x: 0.2, y: 0.3 } } } } },
  });
  assert.throws(() => G.normalizeGraphState({}, 2), /newer version/);
  assert.deepEqual(
    G.normalizePrefs({ view: "graph", mode: "x", hidden: ["quest", "zzz"], depth: 7 }),
    {
      view: "graph",
      mode: "related",
      hidden: ["quest"],
      orphans: true,
      labels: true,
      focus: "",
      depth: 1,
    },
  );
});

test("UI: the Archive's Relations part keeps the B43 list and adds «Elenco | Grafo»", () => {
  const { ctx, registry } = harness();
  const listHTML = archiveHTML(ctx, registry);
  assert.match(listHTML, /data-rg-view="graph" aria-pressed="false"/);
  assert.match(listHTML, /jp-relations-screen/, "the B43 list is still there");
  // Hidden from the campaign sidebar (sections listed without an argument).
  assert.ok(
    !registry.list("campaign-section", ctx).some((c) => c.id.startsWith("relations-graph")),
  );
  G.setView(ctx, "graph");
  const dmHTML = archiveHTML(ctx, registry);
  assert.match(dmHTML, /data-rg-svg/);
  assert.match(dmHTML, /data-rg-node="page:page-tessa"/);
  assert.match(dmHTML, /data-rg-edge="rel:rel-tessa-goblins"/);
  assert.match(dmHTML, /rg-edge rg-edge-relation is-secret/);
  assert.match(dmHTML, /data-rg-add/, "the DM's «Aggiungi relazione»");
  assert.doesNotMatch(dmHTML, /jp-relations-screen/, "graph mode replaces the list on screen");
  ctx.role = "player";
  G.setView(ctx, "graph");
  const playerHTML = archiveHTML(ctx, registry);
  assert.match(playerHTML, /data-rg-svg/);
  for (const secret of ["rel-tessa-goblins", "paga in segreto", "quest-mimic", "data-rg-add"])
    assert.ok(!playerHTML.includes(secret), "player markup contains " + secret);
  ctx.lang = "en";
  const english = archiveHTML(ctx, registry);
  assert.match(english, />List</);
  assert.match(english, />Relations and related entries</);
  assert.match(english, /Relationship graph: \d+ entries and \d+ links/);
  // Without the B58 area the Relations part is the B43 list alone.
  const bare = harness({ withGraph: false });
  const plain = archiveHTML(bare.ctx, bare.registry);
  assert.match(plain, /jp-relations-screen/);
  assert.doesNotMatch(plain, /data-rg/);
});

test("UI handlers: filters, focus, open, add, reveal, hide, remove with Undo; roles and offline", () => {
  const { ctx } = harness();
  G.toggleType(ctx, "quest");
  assert.deepEqual(G.prefsFor(ctx).hidden, ["quest"]);
  G.toggleType(ctx, "quest");
  assert.deepEqual(G.prefsFor(ctx).hidden, []);
  G.focusOn(ctx, "page:page-tessa", 2);
  assert.equal(G.prefsFor(ctx).focus, "page:page-tessa");
  assert.equal(G.prefsFor(ctx).depth, 2);
  // Click opens the entry (Obsidian): quest log, archive page, sheet, Journal entry.
  const graph = G.collectGraph(ctx.state, "dm", { mode: "related" });
  const node = (id) => graph.nodes.find((n) => n.id === id);
  G.openNode(ctx, node("page:quest-seal"));
  assert.deepEqual(ctx.view, { page: "campaign", tab: "quests", id: "q:quest-seal" });
  G.openNode(ctx, node("page:page-tessa"));
  assert.deepEqual(ctx.view, { page: "campaign", tab: "quests-archive", id: "p:page-tessa" });
  G.openNode(ctx, node("actor:doran"));
  assert.deepEqual(ctx.view, { page: "characters", id: "doran" });
  G.openNode(ctx, node("entry:legacy-recap-summary"));
  assert.deepEqual(ctx.view, { page: "campaign", tab: "entry", id: "legacy-recap-summary" });
  // The DM's "+": a secret relation from Maestro Oben to Livia's sheet.
  const id = G.submitNewRelation(
    ctx,
    form([
      ["from", "page:page-oben"],
      ["label", "ha addestrato in segreto"],
      ["to", "actor:livia"],
      ["secret", "on"],
    ]),
  );
  assert.ok(edgeIds(ctx.state, "dm").includes("rel:" + id));
  assert.ok(!edgeIds(ctx.state, "player").includes("rel:" + id));
  G.submitReveal(
    ctx,
    id,
    form([
      ["mode", "some"],
      ["actor", "livia"],
    ]),
  );
  assert.ok(edgeIds(ctx.state, "player").includes("rel:" + id), "revealed to Livia");
  G.hideConnection(ctx, id);
  assert.ok(!edgeIds(ctx.state, "player").includes("rel:" + id), "hidden again");
  G.removeConnection(ctx, id);
  assert.ok(!edgeIds(ctx.state, "dm").includes("rel:" + id));
  assert.match(ctx.toasts.at(-1).text, /Annulla ultima modifica/);
  ctx.undo();
  assert.ok(edgeIds(ctx.state, "dm").includes("rel:" + id), "Undo restores the relation");
  // A player cannot add relations; offline the DM's shared change is refused.
  ctx.role = "player";
  assert.throws(
    () =>
      G.submitNewRelation(
        ctx,
        form([
          ["from", "page:page-oben"],
          ["label", "x"],
          ["to", "actor:livia"],
        ]),
      ),
    /Solo il DM/,
  );
  ctx.role = "dm";
  ctx.offline = true;
  assert.throws(
    () =>
      G.submitNewRelation(
        ctx,
        form([
          ["from", "page:page-oben"],
          ["label", "x"],
          ["to", "actor:livia"],
        ]),
      ),
    (error) => /senza rete/.test(error.it),
  );
  assert.equal(
    G.hideConnection(ctx, "rel-tessa-goblins"),
    false,
    "offline refusal shown as a toast",
  );
  assert.equal(ctx.toasts.at(-1).error, true);
});

test("entry page: local graph of a Journal entry, «Apri nel grafo» and the palette command", () => {
  const { ctx, registry } = harness({ role: "player" });
  const entry = { id: "legacy-recap-summary", kind: "recap", data: { title: "" } };
  const panel = registry.get("campaign-section", "relations-graph.entry", ctx, entry);
  assert.ok(panel, "the recap listed as an element of «La lanterna riaccesa» has a local graph");
  const html = registry.slot("campaign-section", panel, ctx, entry);
  assert.match(html, /data-rg-entry="legacy-recap-summary"/);
  assert.match(html, /data-rg-node="page:quest-lantern"/);
  assert.match(html, /aria-label="Resoconto · Voce del Diario/);
  // An entry nothing links to has no panel; a draft never matches.
  assert.equal(
    registry.get("campaign-section", "relations-graph.entry", ctx, {
      id: "x",
      kind: "note",
      data: {},
    }),
    null,
  );
  const command = registry.get("command", "relations-graph.open", ctx);
  registry.run(command, ctx);
  assert.deepEqual(ctx.view, { page: "campaign", tab: "quests-archive", id: "relations" });
  assert.equal(G.prefsFor(ctx).view, "graph");
  G.openGraph(ctx, "entry:legacy-recap-summary");
  assert.equal(G.prefsFor(ctx).focus, "entry:legacy-recap-summary");
  // Reset example forgets this device's graph choices.
  registry.emit("reset", {});
  assert.equal(G.prefsFor(ctx).view, "list");
});

// ---- Independent review (B58-rf): findings fixed test-first.

test("review: an archive page shows its own local graph (Kanka «View web», Obsidian local graph)", () => {
  const { ctx, registry } = harness();
  ctx.view = { page: "campaign", tab: "quests-archive", id: "p:page-tessa" };
  const dmHTML = archiveHTML(ctx, registry);
  assert.match(dmHTML, /data-rg-page="page-tessa"/, "Tessa's page has no local graph");
  assert.match(dmHTML, /data-rg-local="page:page-tessa"/);
  assert.match(dmHTML, /data-rg-node="page:page-varro"/);
  assert.match(
    dmHTML,
    /data-rg-edge="rel:rel-tessa-goblins"/,
    "the DM's local graph has the secret",
  );
  assert.match(dmHTML, /data-rg-open-graph="page:page-tessa"/);
  // The same slot binds: its model is the page's local graph.
  const panel = registry.get("campaign-section", "relations-graph.archive-page", ctx, {
    kind: "archive-page",
    page: { id: "page-tessa" },
  });
  assert.ok(panel, "the archive-page block is registered");
  // Hidden from the campaign sidebar (sections listed without an argument).
  assert.ok(
    !registry.list("campaign-section", ctx).some((c) => c.id === "relations-graph.archive-page"),
  );
  ctx.role = "player";
  const playerHTML = archiveHTML(ctx, registry);
  assert.match(playerHTML, /data-rg-page="page-tessa"/);
  for (const secret of ["rel-tessa-goblins", "paga in segreto", "data-rg-add"])
    assert.ok(!playerHTML.includes(secret), "player page panel contains " + secret);
  // A page nothing readable links to has no panel (the wagon quest is an orphan).
  assert.equal(
    registry.get("campaign-section", "relations-graph.archive-page", ctx, {
      kind: "archive-page",
      page: { id: "quest-wagon" },
    }),
    null,
  );
  // Without the B58 area the archive page is unchanged.
  const bare = harness({ withGraph: false });
  bare.ctx.view = { page: "campaign", tab: "quests-archive", id: "p:page-tessa" };
  const plain = archiveHTML(bare.ctx, bare.registry);
  assert.match(plain, /jp-page-title/);
  assert.doesNotMatch(plain, /data-rg/);
});

test("review: «Aggiungi relazione» starts empty unless a valid endpoint is previewed (Kanka form)", () => {
  const { ctx } = harness();
  const fromPart = (body) => body.split('name="to"')[0];
  const toPart = (body) => body.split('name="to"')[1];
  const blank = G.addDialogBody(ctx, "");
  assert.match(fromPart(blank), /<option value="" selected>/, "«Da» preselects an entry");
  assert.match(toPart(blank), /<option value="" selected>/, "«Con» preselects an entry");
  const oben = G.addDialogBody(ctx, "page:page-oben");
  assert.match(fromPart(oben), /value="page:page-oben" selected/);
  assert.doesNotMatch(fromPart(oben), /<option value="" selected>/);
  // A Journal/World entry is not an endpoint of a B43 relation: nothing silently replaces it.
  const recap = G.addDialogBody(ctx, "entry:legacy-recap-summary");
  assert.match(fromPart(recap), /<option value="" selected>/);
  assert.equal((fromPart(recap).match(/ selected>/g) ?? []).length, 1);
  ctx.lang = "en";
  assert.match(G.addDialogBody(ctx, ""), /Choose an entry/);
});

test("review: English quotation marks and touch instructions in the graph copy", () => {
  const { ctx } = harness();
  ctx.lang = "en";
  G.setView(ctx, "graph");
  const model = G.buildModel(ctx, G.prefsFor(ctx));
  const line = G.detailsHTML(ctx, model, { kind: "edge", id: "rel:rel-tessa-goblins" });
  assert.doesNotMatch(line, /[«»]/, "Italian guillemets in English");
  assert.match(line, /Open “Tessa Varro”/);
  const summary = G.detailsHTML(ctx, model, null);
  assert.match(summary, /press and hold/i, "touch users are not told how to preview");
  const part = G.renderRelationsPart(ctx, { list: "" });
  assert.match(part, /the \+ and − buttons/, "the hint only names Ctrl or Cmd and the wheel");
  ctx.lang = "it";
  const it = G.detailsHTML(ctx, G.buildModel(ctx, G.prefsFor(ctx)), null);
  assert.match(it, /tienila premuta/i);
  assert.ok(G.PREVIEW_DELAY >= 200, "a passing pointer must not replace the details");
});
