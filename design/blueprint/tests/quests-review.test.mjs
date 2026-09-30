// B43 independent review: regressions for the findings fixed after the build (see the
// "Review and fixes" section of changes/interview-01/blueprint-quests-evidence.md).
// Real registry and store, synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { canControlActor } from "../character-access.mjs";
import { esc, icon } from "../ui.mjs";
import * as J from "../journal-plus.mjs";
import * as F from "../factions.mjs";
import * as Q from "../quests.mjs";
import {
  createCampaignDraft,
  saveCampaignDraft,
  previewCampaignDraft,
  applyCampaignDraft,
} from "../campaign-content.mjs";

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
  const dialogs = [];
  const toasts = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    view: { page: "campaign", id: "", tab: "quests-archive" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object" ? (value[ctx.lang] ?? value.it) : String(value ?? ""),
    esc,
    icon,
    dialogs,
    toasts,
    toast: (text, error = false) => toasts.push({ text, error }),
    render() {},
    navigate: (page, params = {}) =>
      (ctx.view = { page, id: params.id ?? "", tab: params.tab ?? "" }),
    dialog: (title, body, options = {}) => dialogs.push({ title, body, ...options }),
    closeDialog() {},
    canUndo: () => false,
    undoLabel: () => "",
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
    click(selector, event = {}) {
      const node = root.querySelector(selector);
      assert.ok(node, `Missing ${selector}`);
      node.onclick({ preventDefault() {}, stopPropagation() {}, ...event });
    },
    change(selector, value) {
      const node = root.querySelector(selector);
      assert.ok(node, `Missing ${selector}`);
      if (typeof value === "boolean") node.checked = value;
      else node.value = value;
      node.onchange?.({ target: node });
    },
    submit(selector, entries) {
      const node = root.querySelector(selector);
      assert.ok(node, `Missing ${selector}`);
      node.onsubmit({ preventDefault() {} }, entries);
    },
  };
}
const formData = (entries) => {
  const form = new FormData();
  for (const [key, value] of entries) form.append(key, value);
  return form;
};
const section = (ctx, registry, id, view) => {
  ctx.view = { page: "campaign", tab: id, id: "", ...view };
  const def = registry.get("campaign-section", id, ctx);
  return { def, html: registry.slot("campaign-section", def, ctx) };
};

// ---------------------------------------------------------------------------------------

test("R1 SRD 5.2.1 citations: the Italian Attitude entry is on page 204, not 202", () => {
  // Checked on IT_SRD_CC_v5.2.1.pdf (SHA-256 a7b88b0c…): p. 202 only lists the glossary
  // descriptors; "Atteggiamento" is on p. 204, Amichevole 203, Indifferente 208, Ostile 210.
  assert.deepEqual(F.ATTITUDE_SOURCE.it.pages, [11, 203, 204, 208, 210]);
  assert.deepEqual(F.ATTITUDE_SOURCE.en.pages, [10, 177, 182, 183, 184]);
  const { ctx, registry } = harness();
  const { html } = section(ctx, registry, "quests-archive", { id: "p:page-tessa" });
  assert.ok(html.includes("IT 11, 203, 204, 208, 210"));
});

test("R2 English reputation screen names the party in English in recent changes", () => {
  const { ctx } = harness({ lang: "en" });
  // Authored reasons stay in Italian (synthetic content); the subject label is the UI's.
  const html = F.reputationScreen(ctx);
  assert.ok(html.includes("</strong> · The party ·"));
  assert.ok(!html.includes("· Il gruppo ·"), "Italian party label in the English screen");
  ctx.role = "player";
  assert.ok(!F.reputationScreen(ctx).includes("· Il gruppo ·"));
});

test("R3 the Story tab box belongs to party characters: a private character shows none", () => {
  const { ctx, registry } = harness({ role: "player" });
  // Iria as the character library seeds her: the player's private, campaign-free character.
  ctx.commit(
    "iria",
    (d) =>
      (d.actors.iria = {
        ...structuredClone(d.actors.livia),
        id: "iria",
        name: "Iria",
        owner: "player",
        visibility: "private",
        campaignIds: [],
      }),
    { local: true },
  );
  const ids = (actor) => registry.list("sheet-section", ctx, actor).map((row) => row.id);
  assert.ok(ids(ctx.state.actors.livia).includes("quests-reputation"));
  assert.ok(
    !ids(ctx.state.actors.iria).includes("quests-reputation"),
    "Iria is private and outside the campaign: the party's standings are not hers",
  );
  ctx.role = "dm";
  assert.ok(!ids(ctx.state.actors["goblin-1"]).includes("quests-reputation"));
});

test("R4 'important NPC' is the DM's prep flag: players see shared attitudes, not the flag", () => {
  const { ctx, registry } = harness({ role: "player" });
  assert.equal(J.readPage(ctx.state, "page-tessa", "player").important, false);
  assert.equal(J.readPage(ctx.state, "page-tessa", "dm").important, true);
  const { html } = section(ctx, registry, "quests-archive", { id: "p:page-tessa" });
  assert.ok(!html.includes("PNG importante"), "flag badge on the player's page");
  const screen = F.reputationScreen(ctx);
  assert.ok(!screen.includes("PNG importanti"), "flag in the player's table caption");
  // The shared attitudes stay readable: Tessa and Oben are Indifferent / Friendly.
  assert.ok(screen.includes("Tessa Varro") && screen.includes("Indifferente"));
  assert.ok(screen.includes("Maestro Oben") && screen.includes("Amichevole"));
  // An attitude the DM keeps hidden does not add the NPC to the player's table.
  ctx.role = "dm";
  ctx.commit("hide", (d) => F.setStandingVisibility(d, "dm", "st-tessa-party", "hidden"));
  ctx.role = "player";
  assert.ok(!F.reputationScreen(ctx).includes("Tessa Varro"));
  ctx.role = "dm";
  const dmScreen = F.reputationScreen(ctx);
  assert.ok(dmScreen.includes("PNG importanti") && dmScreen.includes("Tessa Varro"));
});

test("R5 a nested page created from a link inside a secret block starts DM only", () => {
  const { ctx, registry } = harness();
  ctx.commit("secret link", (d) =>
    J.updatePage(d, "dm", "page-observatory", {
      blocks: [
        { id: "obs-b1", kind: "text", text: "Torre e cortile. [[Pozzo del cortile]]" },
        { id: "obs-b2", kind: "secret", text: "Sotto la torre c’è [[La cella di Oben]]." },
      ],
    }),
  );
  const { def, html } = section(ctx, registry, "quests-archive", { id: "p:page-observatory" });
  assert.match(html, /data-jp-create-child="La cella di Oben"[^>]*data-jp-secret="true"/);
  assert.match(html, /data-jp-create-child="Pozzo del cortile"[^>]*data-jp-secret="false"/);
  const ui = mount(html, (root) => def.bind(root, ctx));
  ui.click('[data-jp-create-child="La cella di Oben"]');
  const dialog = ctx.dialogs.at(-1);
  assert.match(dialog.body, /name="mode" value="none" checked/, "DM only preselected");
  dialog.onSubmit(
    formData([
      ["title", "La cella di Oben"],
      ["type", "place"],
      ["mode", "none"],
    ]),
  );
  const cell = J.dataOf(ctx.state).pages.find((p) => p.title === "La cella di Oben");
  assert.equal(cell.access.mode, "none");
  assert.equal(J.readPage(ctx.state, cell.id, "player"), null, "a secret title never leaks");
  // A link in ordinary text still inherits the page's readers (LegendKeeper nesting).
  ui.click('[data-jp-create-child="Pozzo del cortile"]');
  const open = ctx.dialogs.at(-1);
  assert.match(open.body, /name="mode" value="all" checked/);
  open.onSubmit(
    formData([
      ["title", "Pozzo del cortile"],
      ["type", "place"],
      ["mode", "all"],
    ]),
  );
  const well = J.dataOf(ctx.state).pages.find((p) => p.title === "Pozzo del cortile");
  assert.ok(J.readPage(ctx.state, well.id, "player"));
  // Domain: an explicit audience wins over the parent's; players cannot author.
  assert.throws(() =>
    ctx.commit("x", (d) =>
      J.createChildFromLink(d, "player", { parentId: "page-guild", title: "X" }),
    ),
  );
});

test("R6 Checklist pages (Monk's Checklist, CA-19): DM ticks items, players read them", () => {
  const { ctx, registry } = harness();
  assert.ok(J.PAGE_TYPES.includes("checklist"));
  assert.equal(ctx.label(J.TYPE_LABELS.checklist), "Elenco");
  assert.ok(J.KITS.event, "an Event kit gives event pages their fields");
  // The seed has one: the party's preparations for the tower, inside the observatory.
  const seeded = J.readPage(ctx.state, "page-tower-prep", "player");
  assert.equal(seeded.type, "checklist");
  assert.equal(seeded.parentId, "page-observatory");
  assert.equal(seeded.items.filter((row) => row.done).length, 1);
  const id = (() => {
    let created;
    ctx.commit("list", (d) => {
      created = J.createPage(d, "dm", {
        type: "checklist",
        title: "Scorte per il viaggio",
        access: { mode: "all", actorIds: [] },
      });
      J.addChecklistItem(d, "dm", created, "Comprare olio per le lanterne");
      J.addChecklistItem(d, "dm", created, "Chiedere a [[Maestro Oben]] della chiave");
    });
    return created;
  })();
  const page = J.findPage(ctx.state, id);
  assert.equal(page.items.length, 2);
  assert.throws(() => J.addChecklistItem(structuredClone(ctx.state), "dm", id, "   "));
  assert.throws(() => J.addChecklistItem(structuredClone(ctx.state), "player", id, "Nope"));
  // DM view: checkboxes, add form, remove buttons; clicking ticks the item.
  const { def, html } = section(ctx, registry, "quests-archive", { id: "p:" + id });
  assert.ok(html.includes("data-jp-item-toggle"));
  const ui = mount(html, (root) => def.bind(root, ctx));
  ui.change(`[data-jp-item-toggle="${page.items[0].id}"]`, true);
  assert.equal(J.findPage(ctx.state, id).items[0].done, true);
  ui.submit(`[data-jp-add-item="${id}"]`);
  // Player view: the items, their state and the link, read only.
  ctx.role = "player";
  const projected = J.readPage(ctx.state, id, "player");
  assert.deepEqual(
    projected.items.map((row) => [row.text, row.done]),
    [
      ["Comprare olio per le lanterne", true],
      ["Chiedere a [[Maestro Oben]] della chiave", false],
    ],
  );
  const view = section(ctx, registry, "quests-archive", { id: "p:" + id }).html;
  assert.ok(!view.includes("data-jp-item-toggle"), "players read the checklist");
  assert.ok(view.includes("Comprare olio per le lanterne"));
  assert.ok(J.backlinks(ctx.state, "page-oben", "player").some((row) => row.id === id));
  // Normalize keeps valid items and drops malformed ones.
  const slice = structuredClone(ctx.state.ext.quests);
  slice.campaigns.lanterns.pages.find((p) => p.id === id).items.push({ nope: true });
  const again = J.normalizeQuests(slice, 1).campaigns.lanterns.pages.find((p) => p.id === id);
  assert.equal(again.items.length, 2);
  // Remove an item.
  ctx.role = "dm";
  ctx.commit("rm", (d) => J.removeChecklistItem(d, "dm", id, again.items[1].id));
  assert.equal(J.findPage(ctx.state, id).items.length, 1);
});

test("R7 the DM's own notes do not claim to be hidden from the DM", () => {
  const { ctx, registry } = harness();
  const { html } = section(ctx, registry, "quests", { id: "q:quest-seal" });
  assert.ok(!html.includes("nemmeno il DM"));
  ctx.role = "player";
  const player = section(ctx, registry, "quests", { id: "q:quest-seal" }).html;
  assert.ok(player.includes("nemmeno il DM"));
});

test("R8 Table tracker lists every visible objective and marks the DM's hidden ones", () => {
  const { ctx, registry } = harness();
  ctx.commit("many", (d) => {
    for (let i = 1; i <= 12; i += 1)
      Q.addObjective(d, "dm", "quest-lantern", { text: `Controllare la lanterna ${i}` });
  });
  const tab = registry.get("table-panel", "quests-tracker", ctx);
  const html = registry.slot("table-panel", tab, ctx, {});
  assert.ok(html.includes("Controllare la lanterna 12"), "objectives beyond ten");
  assert.match(html, /Smascherare Tessa Varro davanti alla gilda[\s\S]*?Nascosto/);
  ctx.role = "player";
  const player = registry.slot("table-panel", tab, ctx, {});
  assert.ok(player.includes("Controllare la lanterna 12"));
  assert.ok(!player.includes("Smascherare"));
});

test("R9 keyboard focus: a control keeps a stable selector across re-renders", () => {
  const element = (tag, attrs, extra = {}) => ({
    tagName: tag.toUpperCase(),
    attributes: Object.entries(attrs).map(([name, value]) => ({ name, value })),
    getAttribute: (name) => attrs[name] ?? null,
    closest: () => null,
    ...extra,
  });
  assert.equal(
    J.focusKey(
      element("input", { type: "checkbox", "data-q-toggle": "o2", "data-q-page": "quest-seal" }),
    ),
    'input[data-q-toggle="o2"][data-q-page="quest-seal"]',
  );
  // Values that flip with the command (hide/show, secret/shared) are not part of the key.
  assert.equal(
    J.focusKey(
      element("button", {
        "data-q-objective-hidden": "o3",
        "data-q-page": "quest-seal",
        "data-hidden": "true",
      }),
    ),
    'button[data-q-objective-hidden="o3"][data-q-page="quest-seal"]',
  );
  const form = element("form", { "data-q-add-objective": "quest-seal" });
  assert.equal(
    J.focusKey(element("input", { name: "text" }, { name: "text", closest: () => form })),
    'form[data-q-add-objective="quest-seal"] [name="text"]',
  );
  assert.equal(
    J.focusKey(element("button", { type: "submit" }, { closest: () => form })),
    'form[data-q-add-objective="quest-seal"] [type="submit"]',
  );
  assert.equal(J.focusKey(null), null);
});

test("R10 the archive index also lists the core World entries, read only", () => {
  const { ctx, registry } = harness();
  const empty = section(ctx, registry, "quests-archive", { id: "" }).html;
  assert.ok(!empty.includes("data-jp-world-entry"), "no World entry in the seed");
  ctx.commit(
    "draft",
    (d) => createCampaignDraft(d, { id: "w1", kind: "world", campaignId: "lanterns" }, "dm"),
    { local: true },
  );
  ctx.commit("save", (d) =>
    saveCampaignDraft(
      d,
      "w1",
      {
        data: { ...d.campaignContent.drafts[0].data, title: "Porto Grigio", worldType: "place" },
        access: { mode: "campaign", grants: [] },
      },
      "dm",
    ),
  );
  const review = previewCampaignDraft(ctx.state, "w1", "dm");
  ctx.commit("apply", (d) => applyCampaignDraft(d, "w1", { reviewKey: review.reviewKey }, "dm"));
  const { def, html } = section(ctx, registry, "quests-archive", { id: "" });
  assert.match(html, /data-jp-world-entry[^>]*>[\s\S]*?Porto Grigio/);
  const ui = mount(html, (root) => def.bind(root, ctx));
  ui.click("[data-jp-world-entry]");
  assert.equal(ctx.view.tab, "entry");
  ctx.role = "player";
  assert.ok(section(ctx, registry, "quests-archive", { id: "" }).html.includes("Porto Grigio"));
});
