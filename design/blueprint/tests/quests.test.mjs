// B43 quests.mjs: Forien's Quest Log statuses and objectives, BG3 journal updates, rewards
// with a DM-only secret reward delivered explicitly to a character's inventory, personal
// notes, registration of every contribution, and the quest log UI handlers. Real registry
// and store, synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { canControlActor } from "../character-access.mjs";
import { esc, icon } from "../ui.mjs";
import {
  createCampaignDraft,
  saveCampaignDraft,
  previewCampaignDraft,
  applyCampaignDraft,
} from "../campaign-content.mjs";
import * as J from "../journal-plus.mjs";
import * as Q from "../quests.mjs";

const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};
function harness({ role = "dm", lang = "it" } = {}) {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  registry.use("quests", Q.register);
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
    view: { page: "campaign", id: "", tab: "quests" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object" ? (value[ctx.lang] ?? value.it) : String(value ?? ""),
    esc,
    icon,
    toasts,
    dialogs,
    toast: (text, error = false) => toasts.push({ text, error }),
    render: () => {},
    navigate: (page, params = {}) =>
      (ctx.view = { page, id: params.id ?? "", tab: params.tab ?? "" }),
    dialog: (title, body, options = {}) => dialogs.push({ title, body, ...options }),
    closeDialog: () => {},
    canUndo: () => store.history.length > 0 && store.history.at(-1).controller === ctx.role,
    undoLabel: () => store.history.at(-1)?.label ?? "",
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
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
  return { ctx, store, registry };
}
const decode = (value = "") =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
function mount(html, bind) {
  const nodes = [
    ...html.matchAll(/<(input|button|select|textarea|form)\b([^>]*)(?:>([\s\S]*?)<\/\1>|>)/g),
  ].map(([, tag, attrsText, inner]) => {
    const attrs = Object.fromEntries(
      [...attrsText.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v)]),
    );
    return {
      tagName: tag.toUpperCase(),
      attrs,
      value: tag === "textarea" ? decode(inner ?? "") : (attrs.value ?? ""),
      checked: "checked" in attrs,
      dataset: Object.fromEntries(
        Object.entries(attrs)
          .filter(([k]) => k.startsWith("data-"))
          .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
      ),
      getAttribute: (key) => attrs[key] ?? null,
      addEventListener() {},
      focus() {},
    };
  });
  const matches = (node, selector) =>
    selector
      .split(",")
      .some((part) =>
        [...part.trim().matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)].every(
          ([, key, value]) =>
            key in node.attrs && (value === undefined || node.attrs[key] === value),
        ),
      );
  const root = {
    querySelectorAll: (selector) => nodes.filter((node) => matches(node, selector)),
    querySelector: (selector) => nodes.find((node) => matches(node, selector)) ?? null,
  };
  bind(root);
  return {
    root,
    node: (selector) => root.querySelector(selector),
    click(selector) {
      const node = root.querySelector(selector);
      assert.ok(node, `Missing ${selector}`);
      node.onclick({ preventDefault() {}, stopPropagation() {} });
    },
    change(selector, value) {
      const node = root.querySelector(selector);
      assert.ok(node, `Missing ${selector}`);
      if (typeof value === "boolean") node.checked = value;
      else node.value = value;
      node.onchange?.({ target: node });
    },
  };
}
const formData = (entries) => {
  const form = new FormData();
  for (const [key, value] of entries) form.append(key, value);
  return form;
};
const quest = (ctx, id = "quest-seal", role = ctx.role) => J.readPage(ctx.state, id, role);

// ---------------------------------------------------------------------------------------

test("register: slice, campaign sections, Table tab, sheet box, search, commands, settings", () => {
  const { ctx, registry } = harness();
  assert.ok(ctx.state.ext.quests.campaigns.lanterns.pages.length >= 10);
  for (const id of ["quests", "quests-archive"])
    assert.ok(registry.get("campaign-section", id, ctx), id);
  // The entry panel only appears on an entry page, never in the sidebar.
  assert.ok(registry.get("campaign-section", "quests.entry"));
  assert.equal(registry.get("campaign-section", "quests.entry", ctx), null);
  const tab = registry.get("table-panel", "quests-tracker", ctx);
  assert.equal(tab.placement, "sidebar-tab");
  assert.equal(tab.icon, "check");
  assert.equal(registry.get("sheet-section", "quests-reputation").tab, "story");
  assert.ok(registry.list("command", ctx).some((c) => c.id === "quests.open-log"));
  assert.ok(registry.get("draft-guard", "quests-editor"));
  assert.equal(registry.getSetting(ctx, "quests-links.suggest"), true);
});

test("quest flow: In corso → Completata with a BG3 update; the secret reward stays with the DM", () => {
  const { ctx } = harness();
  assert.throws(() =>
    ctx.commit("x", (d) => Q.setQuestStatus(d, "player", "quest-seal", "completed")),
  );
  ctx.commit("done", (d) => Q.setQuestStatus(d, "dm", "quest-seal", "completed"));
  const player = quest(ctx, "quest-seal", "player");
  assert.equal(player.status, "completed");
  assert.equal(player.updates[0].kind, "status", "latest update first");
  assert.ok(!player.rewards.some((r) => r.secret));
  assert.ok(!JSON.stringify(player).includes("Chiave d’ottone"));
  assert.deepEqual(
    Q.questsByStatus(ctx.state, "player")
      .completed.map((p) => p.id)
      .sort(),
    ["quest-seal", "quest-wagon"],
  );
  // Reopening is a correction and needs a reason.
  assert.throws(
    () => ctx.commit("x", (d) => Q.setQuestStatus(d, "dm", "quest-seal", "active")),
    /motivo|reason/i,
  );
  ctx.commit("reopen", (d) =>
    Q.setQuestStatus(d, "dm", "quest-seal", "active", "Chiusa per errore: manca il rapporto."),
  );
  assert.equal(quest(ctx).status, "active");
  assert.match(quest(ctx).updates[0].text, /Chiusa per errore/);
  assert.equal(Q.questsByStatus(ctx.state, "player").hidden, undefined);
  assert.deepEqual(
    Q.questsByStatus(ctx.state, "dm").hidden.map((p) => p.id),
    ["quest-mimic"],
  );
});

test("objectives and sub-objectives: toggled by the DM, hidden ones revealed on purpose", () => {
  const { ctx } = harness();
  assert.deepEqual(Q.questProgress(quest(ctx, "quest-seal", "player")), { done: 2, total: 6 });
  ctx.commit("tick", (d) => Q.toggleObjective(d, "dm", "quest-seal", "o2a", true));
  assert.deepEqual(Q.questProgress(quest(ctx, "quest-seal", "player")), { done: 3, total: 6 });
  let id;
  ctx.commit("add", (d) => {
    id = Q.addObjective(d, "dm", "quest-seal", {
      text: "Chiedere a Tessa del sigillo",
      parentId: "o2",
    });
  });
  const added = quest(ctx, "quest-seal", "player").objectives.find((o) => o.id === id);
  assert.equal(added.parentId, "o2");
  assert.throws(
    () =>
      ctx.commit("x", (d) => Q.addObjective(d, "dm", "quest-seal", { text: "x", parentId: id })),
    /livello|level/i,
  );
  assert.ok(!quest(ctx, "quest-seal", "player").objectives.some((o) => o.id === "o4"));
  ctx.commit("show", (d) => Q.setObjectiveHidden(d, "dm", "quest-seal", "o4", false));
  assert.ok(quest(ctx, "quest-seal", "player").objectives.some((o) => o.id === "o4"));
  assert.throws(() =>
    ctx.commit("x", (d) => Q.toggleObjective(d, "player", "quest-seal", "o2", true)),
  );
  ctx.commit("rm", (d) => Q.removeObjective(d, "dm", "quest-seal", "o2"));
  assert.ok(
    !quest(ctx).objectives.some((o) => ["o2", "o2a", "o2b", id].includes(o.id)),
    "children go too",
  );
});

test("reward delivery: the coins reach Livia's purse and the key her inventory; Undo returns them", () => {
  const { ctx } = harness();
  const before = ctx.state.actors.livia.inventory.length;
  ctx.commit("give", (d) => Q.deliverReward(d, "dm", "quest-seal", "r2", "livia"));
  const key = ctx.state.actors.livia.inventory.find(
    (i) => ctx.label(i.name) === "Chiave d’ottone della torre",
  );
  assert.ok(key, "the item is in Livia's inventory");
  assert.equal(ctx.state.actors.livia.inventory.length, before + 1);
  assert.deepEqual(
    quest(ctx)
      .rewards.find((r) => r.id === "r2")
      .deliveries.map((x) => x.actorId),
    ["livia"],
  );
  assert.throws(
    () => ctx.commit("again", (d) => Q.deliverReward(d, "dm", "quest-seal", "r2", "livia")),
    /già|already/i,
  );
  ctx.commit("coins", (d) => Q.deliverReward(d, "dm", "quest-seal", "r1", "livia"));
  assert.equal(ctx.state.actors.livia.currency.gp, 50);
  ctx.undo();
  assert.ok(!ctx.state.actors.livia.currency?.gp);
  assert.throws(() =>
    ctx.commit("npc", (d) => Q.deliverReward(d, "dm", "quest-seal", "r1", "goblin-1")),
  );
  assert.throws(() =>
    ctx.commit("p", (d) => Q.deliverReward(d, "player", "quest-seal", "r1", "livia")),
  );
});

test("updates, DM notes and personal notes keep their audiences; shared changes need the network", () => {
  const { ctx } = harness();
  ctx.commit("u", (d) =>
    Q.addQuestUpdate(d, "dm", "quest-seal", { text: "Tessa ha negato tutto.", visibility: "all" }),
  );
  ctx.commit("u", (d) =>
    Q.addQuestUpdate(d, "dm", "quest-seal", { text: "Tessa mente.", visibility: "dm" }),
  );
  const updates = quest(ctx, "quest-seal", "player").updates.map((u) => u.text);
  assert.equal(updates[0], "Tessa ha negato tutto.");
  assert.ok(!updates.includes("Tessa mente."));
  ctx.commit("n", (d) => Q.setDmNotes(d, "dm", "quest-seal", "Pronta la trappola al porto."));
  assert.equal(quest(ctx, "quest-seal", "player").dmNotes, undefined);
  ctx.offline = true;
  assert.throws(
    () =>
      ctx.commit("u", (d) =>
        Q.addQuestUpdate(d, "dm", "quest-seal", { text: "x", visibility: "all" }),
      ),
    /offline/,
  );
  ctx.role = "player";
  ctx.commit(
    "mine",
    (d) => J.setPersonalNote(d, "player", "quest-seal", "Chiedere a Mira del gatto."),
    { local: true },
  );
  assert.equal(J.personalNote(ctx.state, "player", "quest-seal"), "Chiedere a Mira del gatto.");
  assert.equal(J.personalNote(ctx.state, "dm", "quest-seal"), "");
});

test("core Journal objectives appear in the quest log with their recorded status", () => {
  const { ctx } = harness();
  ctx.commit(
    "draft",
    (d) => createCampaignDraft(d, { id: "d1", kind: "quest", campaignId: "lanterns" }, "dm"),
    { local: true },
  );
  ctx.commit("save", (d) =>
    saveCampaignDraft(
      d,
      "d1",
      {
        data: {
          ...d.campaignContent.drafts[0].data,
          title: "Trovare la chiave del pozzo",
          questStatus: "open",
        },
        access: { mode: "campaign", grants: [] },
      },
      "dm",
    ),
  );
  const review = previewCampaignDraft(ctx.state, "d1", "dm");
  ctx.commit("apply", (d) => applyCampaignDraft(d, "d1", { reviewKey: review.reviewKey }, "dm"));
  const core = Q.coreObjectives(ctx.state, "player");
  assert.deepEqual(
    core.map((c) => [c.title, c.status]),
    [["Trovare la chiave del pozzo", "active"]],
  );
});

test("quest log UI: the player never sees the secret reward; the DM ticks, completes and delivers", () => {
  const { ctx, registry } = harness({ role: "player" });
  const section = registry.get("campaign-section", "quests", ctx);
  ctx.view = { page: "campaign", tab: "quests", id: "q:quest-seal" };
  const html = registry.slot("campaign-section", section, ctx);
  assert.ok(html.includes("Il sigillo spezzato"));
  assert.ok(html.includes("50 monete d’oro"));
  assert.ok(!html.includes("Chiave d’ottone"));
  assert.ok(!html.includes("Smascherare Tessa"));
  assert.ok(!html.includes("data-q-toggle"), "players read objectives");
  ctx.role = "dm";
  const dmHtml = registry.slot("campaign-section", section, ctx);
  assert.ok(dmHtml.includes("Chiave d’ottone"));
  assert.ok(dmHtml.includes("Solo DM"));
  const ui = mount(dmHtml, (root) => section.bind(root, ctx));
  ui.change('[data-q-toggle="o2a"]', true);
  assert.equal(
    J.findPage(ctx.state, "quest-seal").objectives.find((o) => o.id === "o2a").done,
    true,
  );
  ui.click('[data-q-status="completed"]');
  assert.equal(J.findPage(ctx.state, "quest-seal").status, "completed");
  const again = mount(registry.slot("campaign-section", section, ctx), (root) =>
    section.bind(root, ctx),
  );
  again.change('[data-q-deliver-target="r2"]', "livia");
  again.click('[data-q-deliver="r2"]');
  assert.ok(
    ctx.state.actors.livia.inventory.some(
      (i) => ctx.label(i.name) === "Chiave d’ottone della torre",
    ),
  );
  // The Table tab lists the quests in progress for the same identity.
  const tab = registry.get("table-panel", "quests-tracker", ctx);
  const tableHtml = registry.slot("table-panel", tab, ctx, {});
  assert.ok(tableHtml.includes("La lanterna riaccesa"));
});

test("search respects privacy: hidden quests and secret text never match for players", () => {
  const { ctx, registry } = harness({ role: "player" });
  const titles = (q) => registry.search(ctx, q).map((r) => ctx.label(r.title));
  assert.ok(titles("sigillo").includes("Il sigillo spezzato"));
  assert.ok(!titles("forziere").includes("Il forziere che morde"));
  assert.ok(!titles("prigioniero").includes("Maestro Oben"), "secret block text");
  ctx.role = "dm";
  assert.ok(titles("prigioniero").includes("Maestro Oben"));
});
