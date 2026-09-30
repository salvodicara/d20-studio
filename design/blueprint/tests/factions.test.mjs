// B43 factions.mjs: reputation of the party and of single characters with a faction
// (Bondsmith tiers with a reasoned history, DOS2 GM attitude screen), SRD 2024 attitudes
// of important NPCs (dnd5e important NPC), Kanka relations and Scabard secret connections,
// and the relations projection B58 will draw. Real registry and store; synthetic data.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc, icon } from "../ui.mjs";
import * as F from "../factions.mjs";
import { register } from "../quests.mjs";

const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};
function harness({ role = "dm" } = {}) {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  registry.use("quests", register);
  const store = createStore({ storage: memory() });
  registry.initState(store.state);
  const dialogs = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang: "it",
    offline: false,
    view: { page: "campaign", id: "", tab: "quests-archive" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object" ? (value[ctx.lang] ?? value.it) : String(value ?? ""),
    esc,
    icon,
    toast() {},
    render() {},
    navigate: (page, params = {}) =>
      (ctx.view = { page, id: params.id ?? "", tab: params.tab ?? "" }),
    dialog: (title, body, options = {}) => dialogs.push({ title, body, ...options }),
    dialogs,
    closeDialog() {},
    canUndo: () => false,
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
  return { ctx, store, registry };
}
const change = (ctx, input, role = "dm") =>
  ctx.commit("rep", (d) => F.changeStanding(d, role, input));
const track = (ctx, role, targetId, subject) =>
  F.standingsFor(ctx.state, role, { targetId }).find((s) => s.subject === subject);

test("tiers and attitudes: authored reputation bands and the three SRD 5.2.1 attitudes", () => {
  assert.deepEqual(
    [-10, -6, -5, -2, -1, 0, 1, 2, 5, 6, 10].map((v) => F.tierOf(v).id),
    [
      "hostile",
      "hostile",
      "wary",
      "wary",
      "neutral",
      "neutral",
      "neutral",
      "trusted",
      "trusted",
      "allied",
      "allied",
    ],
  );
  assert.deepEqual(
    F.ATTITUDES.map((a) => a.id),
    ["friendly", "indifferent", "hostile"],
  );
  // Rules Glossary: Attitude EN 177 / IT 204, Friendly EN 182 / IT 203, Hostile EN 183 / IT 210,
  // Indifferent EN 184 / IT 208.
  assert.deepEqual(F.ATTITUDE_SOURCE.en.pages, [10, 177, 182, 183, 184]);
  assert.deepEqual(F.ATTITUDE_SOURCE.it.pages, [11, 203, 204, 208, 210]);
  assert.equal(F.REPUTATION_SOURCE.kind, "authored-demo");
});

test("party reputation: DM only, reason required, clamped, reasoned history", () => {
  const { ctx } = harness();
  assert.throws(
    () =>
      change(
        ctx,
        { targetId: "page-guild", subject: "party", kind: "reputation", value: 4, reason: "x" },
        "player",
      ),
    /DM/,
  );
  assert.throws(
    () =>
      change(ctx, {
        targetId: "page-guild",
        subject: "party",
        kind: "reputation",
        value: 4,
        reason: " ",
      }),
    /motivo|reason/i,
  );
  change(ctx, {
    targetId: "page-guild",
    subject: "party",
    kind: "reputation",
    value: 40,
    reason: "Hanno riportato la chiave alla gilda.",
  });
  const party = track(ctx, "dm", "page-guild", "party");
  assert.equal(party.value, 10);
  assert.equal(party.history.at(-1).reason, "Hanno riportato la chiave alla gilda.");
  assert.equal(party.history.at(-1).from, 3);
  assert.equal(party.history.length, 3);
  // The player sees the shared track with its reasons.
  const seen = track(ctx, "player", "page-guild", "party");
  assert.equal(seen.value, 10);
  assert.equal(seen.tier.id, "allied");
  assert.equal(seen.history.length, 3);
});

test("Livia's reputation at Casa Varro: hidden until shared, then tier only or full", () => {
  const { ctx } = harness();
  change(ctx, {
    targetId: "page-varro",
    subject: "livia",
    kind: "reputation",
    value: -3,
    reason: "Livia ha accusato Tessa davanti al porto.",
  });
  assert.equal(track(ctx, "player", "page-varro", "livia"), undefined, "new tracks are hidden");
  const id = track(ctx, "dm", "page-varro", "livia").id;
  ctx.commit("vis", (d) => F.setStandingVisibility(d, "dm", id, "tier"));
  const tier = track(ctx, "player", "page-varro", "livia");
  assert.equal(tier.tier.id, "wary");
  assert.equal(tier.value, undefined, "the number stays hidden");
  assert.ok(tier.history.every((h) => h.from === undefined && h.to === undefined));
  assert.equal(tier.history[0].reason, "Livia ha accusato Tessa davanti al porto.");
  ctx.commit("vis", (d) => F.setStandingVisibility(d, "dm", id, "full"));
  assert.equal(track(ctx, "player", "page-varro", "livia").value, -3);
  // The sheet box of Livia lists her own and the party's shared tracks.
  const sheet = F.standingsForActor(ctx.state, "player", "livia").map((s) => s.targetId);
  assert.ok(sheet.includes("page-varro") && sheet.includes("page-guild"));
  assert.throws(() =>
    change(ctx, {
      targetId: "page-varro",
      subject: "goblin-1",
      kind: "reputation",
      value: 1,
      reason: "x",
    }),
  );
});

test("correction with reason reverts the last change and keeps both entries", () => {
  const { ctx } = harness();
  const id = track(ctx, "dm", "page-guild", "party").id;
  ctx.commit("fix", (d) =>
    F.correctStanding(d, "dm", id, "Il giuramento era di Doran, non del gruppo."),
  );
  const party = track(ctx, "dm", "page-guild", "party");
  assert.equal(party.value, 2);
  assert.equal(party.history.at(-1).correction, true);
  assert.equal(party.history.length, 3);
  assert.throws(() => ctx.commit("fix", (d) => F.correctStanding(d, "dm", id, "")));
});

test("important NPC attitude: SRD values on person pages only, shared or hidden", () => {
  const { ctx } = harness();
  const tessa = track(ctx, "player", "page-tessa", "party");
  assert.equal(tessa.value, "indifferent");
  change(ctx, {
    targetId: "page-tessa",
    subject: "livia",
    kind: "attitude",
    value: "hostile",
    reason: "Livia ha visto l’anello con il sigillo.",
  });
  assert.equal(track(ctx, "player", "page-tessa", "livia"), undefined);
  assert.throws(() =>
    change(ctx, {
      targetId: "page-guild",
      subject: "party",
      kind: "attitude",
      value: "friendly",
      reason: "x",
    }),
  );
  assert.throws(() =>
    change(ctx, {
      targetId: "page-tessa",
      subject: "party",
      kind: "attitude",
      value: "loyal",
      reason: "x",
    }),
  );
  const important = F.importantNpcs(ctx.state, "dm").map((p) => p.id);
  assert.deepEqual(important.sort(), ["page-oben", "page-tessa"]);
});

test("secret connection: hidden from players until revealed to Livia; graph data for B58", () => {
  const { ctx } = harness();
  const labels = (role) =>
    F.relationsFor(ctx.state, role, { kind: "page", id: "page-tessa" }).map((r) => r.id);
  assert.ok(labels("dm").includes("rel-tessa-goblins"));
  assert.ok(!labels("player").includes("rel-tessa-goblins"));
  assert.ok(labels("player").includes("rel-tessa-varro"));
  ctx.commit("reveal", (d) =>
    F.revealRelation(d, "dm", "rel-tessa-goblins", { mode: "some", actorIds: ["doran"] }),
  );
  assert.ok(!labels("player").includes("rel-tessa-goblins"));
  ctx.commit("reveal", (d) =>
    F.revealRelation(d, "dm", "rel-tessa-goblins", { mode: "some", actorIds: ["livia"] }),
  );
  assert.ok(labels("player").includes("rel-tessa-goblins"));
  const graph = F.relationsGraph(ctx.state, "player");
  assert.ok(graph.nodes.some((n) => n.id === "page:page-tessa" && n.label === "Tessa Varro"));
  assert.ok(graph.edges.some((e) => e.id === "rel-tessa-goblins" && e.secret === true));
  assert.ok(!graph.edges.some((e) => e.id === "rel-varro-guild"), "unrevealed secret");
  assert.ok(!graph.nodes.some((n) => n.id === "page:quest-mimic"));
  // Actor endpoints respect sheet visibility: players do not read NPC actors.
  let id;
  ctx.commit("add", (d) => {
    id = F.addRelation(d, "dm", {
      from: { kind: "page", id: "page-goblins" },
      to: { kind: "actor", id: "goblin-1" },
      label: "comandata da",
      secret: false,
    });
  });
  assert.ok(
    F.relationsFor(ctx.state, "dm", { kind: "page", id: "page-goblins" }).some((r) => r.id === id),
  );
  assert.ok(
    !F.relationsFor(ctx.state, "player", { kind: "page", id: "page-goblins" }).some(
      (r) => r.id === id,
    ),
  );
  assert.throws(() =>
    ctx.commit("bad", (d) =>
      F.addRelation(d, "dm", {
        from: { kind: "page", id: "page-tessa" },
        to: { kind: "page", id: "nope" },
        label: "x",
      }),
    ),
  );
  ctx.commit("remove", (d) => F.removeRelation(d, "dm", id));
  assert.ok(
    !F.relationsFor(ctx.state, "dm", { kind: "page", id: "page-goblins" }).some((r) => r.id === id),
  );
});

test("reputation screen UI: DM change dialog records the reason; the player sees shared tiers only", () => {
  const { ctx, registry } = harness({ role: "player" });
  const section = registry.get("campaign-section", "quests-archive", ctx);
  ctx.view = { page: "campaign", tab: "quests-archive", id: "reputation" };
  const html = registry.slot("campaign-section", section, ctx);
  assert.ok(html.includes("Gilda delle lanterne"));
  assert.ok(html.includes("Neutrale"), "Casa Varro tier");
  assert.ok(!html.includes("data-jp-standing-change"), "no DM controls for the player");
  ctx.role = "dm";
  const dmHtml = registry.slot("campaign-section", section, ctx);
  assert.match(dmHtml, /data-jp-standing-change data-target="page-guild" data-subject="party"/);
  assert.ok(dmHtml.includes("Tessa Varro"), "important NPCs are on the DM's attitude screen");
});
