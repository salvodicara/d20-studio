// B43 structured journal (journal-plus.mjs): typed pages, property kits, secret blocks with
// per-block reveal, links, backlinks and unlinked mentions, nested pages, cut-to-new-page,
// saved views, Monk's-style tabs and "Solo io" notes. Domain rules through the real
// registry and store, plus the archive's render/bind with a minimal element double.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { canControlActor } from "../character-access.mjs";
import { esc, icon } from "../ui.mjs";
import * as J from "../journal-plus.mjs";
import { register } from "../quests.mjs";

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
  registry.use("quests", register);
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
    view: { page: "campaign", id: "", tab: "quests-archive" },
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
const as = (ctx, role, fn) => {
  const previous = ctx.role;
  ctx.role = role;
  try {
    return fn();
  } finally {
    ctx.role = previous;
  }
};
const page = (ctx, id, role = ctx.role) => J.readPage(ctx.state, id, role);
const texts = (projected) => projected.blocks.map((b) => b.text).join("\n");
const decode = (value = "") =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
// Minimal element double for bind(): buttons, inputs, selects and textareas of the markup.
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
      selectionStart: 0,
      selectionEnd: 0,
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
    click(selector, event = {}) {
      const node = root.querySelector(selector);
      assert.ok(node, `Missing ${selector}`);
      node.onclick({ preventDefault() {}, stopPropagation() {}, ...event });
    },
  };
}
const formData = (entries) => {
  const form = new FormData();
  for (const [key, value] of entries) form.append(key, value);
  return form;
};

// ---------------------------------------------------------------------------------------

test("seed and normalize: synthetic 'lanterns' archive, idempotent, strict on newer versions", () => {
  const seed = J.seedQuests();
  const data = seed.campaigns.lanterns;
  for (const id of [
    "quest-seal",
    "quest-lantern",
    "quest-wagon",
    "quest-mimic",
    "page-guild",
    "page-varro",
    "page-tessa",
    "page-oben",
    "page-observatory",
    "page-goblins",
  ])
    assert.ok(
      data.pages.some((p) => p.id === id),
      id,
    );
  assert.equal(data.views[0].id, "view-open-quests");
  const once = J.normalizeQuests(seed, 1);
  assert.deepEqual(J.normalizeQuests(once, 1), once);
  assert.throws(() => J.normalizeQuests(seed, 2), /newer version/);
  // Garbage is dropped, never kept half-valid.
  const repaired = J.normalizeQuests({ campaigns: { lanterns: { pages: [null, { id: 3 }] } } }, 1);
  assert.deepEqual(repaired.campaigns.lanterns.pages, []);
  assert.deepEqual(repaired.campaigns.lanterns.standings, []);
});

test("projection: the player reads shared pages without secrets; the DM reads everything", () => {
  const { ctx } = harness();
  const player = J.listPages(ctx.state, "player").map((p) => p.id);
  assert.ok(player.includes("quest-seal") && player.includes("page-tessa"));
  assert.ok(!player.includes("quest-mimic"), "a hidden quest stays with the DM");
  const seal = page(ctx, "quest-seal", "player");
  assert.ok(!texts(seal).includes("Tessa"), "the secret block is not projected");
  assert.equal(seal.dmNotes, undefined);
  assert.ok(!seal.rewards.some((r) => r.secret), "the secret reward stays with the DM");
  assert.ok(!seal.objectives.some((o) => o.hidden), "hidden objectives stay with the DM");
  assert.ok(!seal.updates.some((u) => u.visibility === "dm"));
  const tessa = page(ctx, "page-tessa", "player");
  assert.ok(!tessa.properties.some((p) => p.secret), "secret properties stay with the DM");
  const dm = page(ctx, "quest-seal", "dm");
  assert.ok(texts(dm).includes("Tessa Varro"));
  assert.ok(dm.rewards.some((r) => r.secret));
  assert.equal(J.readPage(ctx.state, "quest-mimic", "player"), null);
});

test("secret block: revealed to Livia reaches her player, to Doran only it does not; hide again", () => {
  const { ctx } = harness();
  const blockId = J.findPage(ctx.state, "quest-seal").blocks.find((b) => b.kind === "secret").id;
  assert.throws(
    () =>
      ctx.commit("x", (d) =>
        J.revealBlock(d, "player", "quest-seal", blockId, { mode: "all", actorIds: [] }),
      ),
    /DM/,
  );
  ctx.commit("reveal", (d) =>
    J.revealBlock(d, "dm", "quest-seal", blockId, { mode: "some", actorIds: ["doran"] }),
  );
  assert.ok(!texts(page(ctx, "quest-seal", "player")).includes("Tessa"), "Doran is the DM's");
  ctx.commit("reveal", (d) =>
    J.revealBlock(d, "dm", "quest-seal", blockId, { mode: "some", actorIds: ["livia"] }),
  );
  const seen = page(ctx, "quest-seal", "player").blocks.find((b) => b.id === blockId);
  assert.ok(seen.text.includes("Tessa Varro") && seen.revealed === true);
  assert.equal(seen.reveal, undefined, "the player never gets the recipients list");
  ctx.commit("hide", (d) => J.hideBlock(d, "dm", "quest-seal", blockId));
  assert.ok(!texts(page(ctx, "quest-seal", "player")).includes("Tessa"));
  ctx.commit("all", (d) =>
    J.revealBlock(d, "dm", "quest-seal", blockId, { mode: "all", actorIds: [] }),
  );
  assert.ok(texts(page(ctx, "quest-seal", "player")).includes("Tessa"));
  assert.throws(() =>
    ctx.commit("bad", (d) =>
      J.revealBlock(d, "dm", "quest-seal", blockId, { mode: "some", actorIds: ["goblin-1"] }),
    ),
  );
});

test("links and backlinks: a link inside a secret block is a backlink only for who reads it", () => {
  const { ctx } = harness();
  assert.equal(J.resolveTitle(ctx.state, "tessa varro", "player")?.id, "page-tessa");
  assert.equal(J.resolveTitle(ctx.state, "Il forziere che morde", "player"), null);
  const dm = J.backlinks(ctx.state, "page-tessa", "dm").map((b) => b.id);
  assert.ok(dm.includes("quest-seal"), "the DM sees the mention in the secret block");
  assert.ok(dm.includes("page-varro"), "property values link too (Kanka attributes)");
  const player = J.backlinks(ctx.state, "page-tessa", "player").map((b) => b.id);
  assert.ok(!player.includes("quest-seal"));
  assert.ok(player.includes("page-varro"));
  const snippet = J.backlinks(ctx.state, "page-oben", "player").find(
    (b) => b.id === "page-observatory",
  ).snippets[0];
  assert.match(snippet, /Maestro Oben/);
});

test("unlinked mentions: suggested only to the DM, linked on confirmation or dismissed", () => {
  const { ctx } = harness();
  const suggestions = J.unlinkedMentions(ctx.state, "page-varro", "dm");
  const hit = suggestions.find((s) => s.sourceId === "page-observatory");
  assert.ok(hit && /Casa Varro/.test(hit.snippet));
  assert.deepEqual(J.unlinkedMentions(ctx.state, "page-varro", "player"), []);
  ctx.commit("link", (d) =>
    J.linkMention(d, "dm", {
      sourceId: hit.sourceId,
      blockId: hit.blockId,
      targetId: "page-varro",
    }),
  );
  const text = J.findPage(ctx.state, "page-observatory").blocks.find(
    (b) => b.id === hit.blockId,
  ).text;
  assert.match(text, /\[\[Casa Varro\]\]/);
  assert.ok(
    J.backlinks(ctx.state, "page-varro", "player").some((b) => b.id === "page-observatory"),
  );
  assert.ok(
    !J.unlinkedMentions(ctx.state, "page-varro", "dm").some((s) => s.sourceId === hit.sourceId),
  );
  // Dismissing is remembered for that pair only.
  const tessa = J.unlinkedMentions(ctx.state, "page-oben", "dm");
  assert.ok(tessa.length === 0 || tessa.every((s) => s.sourceId !== "page-observatory"));
  const created = { id: null };
  ctx.commit("new", (d) => {
    created.id = J.createPage(d, "dm", {
      type: "shop",
      title: "Taverna del Gufo Stanco",
      kitId: "tavern",
      access: { mode: "all", actorIds: [] },
    });
  });
  const tavern = J.unlinkedMentions(ctx.state, created.id, "dm");
  assert.equal(tavern[0].sourceId, "page-observatory");
  ctx.commit("dismiss", (d) =>
    J.dismissMention(d, "dm", { sourceId: "page-observatory", targetId: created.id }),
  );
  assert.deepEqual(J.unlinkedMentions(ctx.state, created.id, "dm"), []);
  assert.throws(() =>
    ctx.commit("x", (d) =>
      J.linkMention(d, "player", {
        sourceId: "page-observatory",
        blockId: hit.blockId,
        targetId: created.id,
      }),
    ),
  );
});

test("typed pages and kits: a Taverna kit on a shop, unique titles, DM authoring only", () => {
  const { ctx } = harness();
  let id;
  ctx.commit("new", (d) => {
    id = J.createPage(d, "dm", {
      type: "shop",
      title: "Taverna del Gufo Stanco",
      kitId: "tavern",
      access: { mode: "none", actorIds: [] },
    });
  });
  const shop = J.findPage(ctx.state, id);
  assert.equal(shop.type, "shop");
  assert.deepEqual(
    shop.properties.map((p) => p.label.it),
    ["Oste", "Prezzo di una stanza", "Specialità della casa", "Voci che girano"],
  );
  assert.equal(shop.properties.at(-1).secret, true, "rumours are the DM's until shared");
  assert.equal(J.readPage(ctx.state, id, "player"), null, "Solo DM by choice");
  assert.throws(
    () =>
      ctx.commit("dup", (d) =>
        J.createPage(d, "dm", { type: "place", title: "taverna del gufo stanco" }),
      ),
    /esiste già|already exists/i,
  );
  assert.throws(() =>
    ctx.commit("p", (d) => J.createPage(d, "player", { type: "page", title: "X" })),
  );
  for (const type of ["person", "organization", "shop", "place", "event", "page", "quest"])
    assert.ok(J.PAGE_TYPES.includes(type));
  // A kit adds only the fields a page does not have yet.
  const again = J.applyKit(shop.properties, "tavern");
  assert.equal(again.length, shop.properties.length);
});

test("nested pages: created from an unresolved link and by moving a selection", () => {
  const { ctx } = harness();
  let child;
  ctx.commit("child", (d) => {
    child = J.createChildFromLink(d, "dm", {
      parentId: "page-observatory",
      title: "Cripta del custode",
    });
  });
  const crypt = J.findPage(ctx.state, child);
  assert.equal(crypt.parentId, "page-observatory");
  assert.deepEqual(crypt.access, J.findPage(ctx.state, "page-observatory").access);
  // Sorted by title: the new crypt, then the seeded checklist of the tower's preparations.
  assert.deepEqual(
    J.children(ctx.state, "page-observatory", "player").map((p) => p.id),
    [child, "page-tower-prep"],
  );
  assert.deepEqual(
    J.ancestors(ctx.state, child, "player").map((p) => p.id),
    ["page-observatory"],
  );
  // LegendKeeper Cut-to-New-Page: the selection becomes a nested page and a link.
  const block = J.findPage(ctx.state, "page-guild").blocks[0];
  const start = block.text.indexOf("Custodisce");
  const end = block.text.indexOf(".") + 1;
  let moved;
  ctx.commit("cut", (d) => {
    moved = J.moveSelectionToNewPage(d, "dm", {
      pageId: "page-guild",
      blockId: block.id,
      start,
      end,
      title: "Storia della gilda",
    });
  });
  const after = J.findPage(ctx.state, "page-guild").blocks[0].text;
  assert.ok(after.includes("[[Storia della gilda]]"));
  assert.ok(!after.includes("tre generazioni"));
  const history = J.findPage(ctx.state, moved);
  assert.equal(history.parentId, "page-guild");
  assert.match(history.blocks[0].text, /tre generazioni/);
  assert.throws(() =>
    ctx.commit("empty", (d) =>
      J.moveSelectionToNewPage(d, "dm", {
        pageId: "page-guild",
        blockId: block.id,
        start: 3,
        end: 3,
        title: "Y",
      }),
    ),
  );
  // No cycles: a page cannot be moved under its own child.
  assert.throws(() =>
    ctx.commit("cycle", (d) => J.updatePage(d, "dm", "page-guild", { parentId: moved })),
  );
});

test("rename updates links; delete re-parents children and drops dangling references", () => {
  const { ctx } = harness();
  ctx.commit("rename", (d) => J.updatePage(d, "dm", "page-tessa", { title: "Tessa dei Varro" }));
  assert.match(J.findPage(ctx.state, "quest-seal").blocks[1].text, /\[\[Tessa dei Varro\]\]/);
  assert.equal(J.resolveTitle(ctx.state, "Tessa dei Varro", "dm").id, "page-tessa");
  ctx.commit("delete", (d) => J.deletePage(d, "dm", "page-varro"));
  assert.equal(J.findPage(ctx.state, "page-varro"), null);
  assert.equal(J.findPage(ctx.state, "page-tessa").parentId, null, "child moved up");
  const data = J.dataOf(ctx.state);
  assert.ok(!data.relations.some((r) => [r.from.id, r.to.id].includes("page-varro")));
  assert.ok(!data.standings.some((s) => s.targetId === "page-varro"));
  ctx.undo();
  assert.ok(J.findPage(ctx.state, "page-varro"), "Undo restores the deleted page");
});

test("saved views: 'Missioni aperte' as a table; a player's own view stays private", () => {
  const { ctx } = harness();
  const views = J.listViews(ctx.state, "player");
  const open = views.find((v) => v.id === "view-open-quests");
  assert.equal(open.layout, "table");
  const rows = J.runView(ctx.state, "player", open).map((p) => p.id);
  assert.deepEqual(rows.sort(), ["quest-lantern", "quest-seal"]);
  let id;
  ctx.commit(
    "view",
    (d) => {
      id = J.saveView(d, "player", {
        name: "Le mie persone",
        source: "person",
        layout: "cards",
        columns: ["title", "type"],
        shared: false,
      });
    },
    { local: true },
  );
  assert.ok(J.listViews(ctx.state, "player").some((v) => v.id === id));
  assert.ok(!J.listViews(ctx.state, "dm").some((v) => v.id === id), "not readable by the DM");
  assert.deepEqual(
    J.runView(
      ctx.state,
      "player",
      J.listViews(ctx.state, "player").find((v) => v.id === id),
    )
      .map((p) => p.id)
      .sort(),
    ["page-oben", "page-tessa"],
  );
  assert.throws(() => ctx.commit("x", (d) => J.deleteView(d, "dm", id)));
});

test("tabs: browser-like history per tab with back, forward, close and bookmarks", () => {
  let t = J.emptyTabs();
  t = J.visitPage(t, "page-guild");
  t = J.visitPage(t, "page-oben");
  t = J.visitPage(t, "page-tessa", { newTab: true });
  assert.equal(t.tabs.length, 2);
  assert.equal(J.currentPageId(t), "page-tessa");
  t = J.switchTab(t, t.tabs[0].id);
  assert.equal(J.currentPageId(t), "page-oben");
  t = J.stepTab(t, -1);
  assert.equal(J.currentPageId(t), "page-guild");
  t = J.stepTab(t, 1);
  assert.equal(J.currentPageId(t), "page-oben");
  t = J.stepTab(t, -1);
  t = J.visitPage(t, "page-varro");
  assert.deepEqual(t.tabs[0].history, ["page-guild", "page-varro"], "a new visit drops forward");
  t = J.toggleBookmark(t, "page-varro");
  assert.deepEqual(t.bookmarks, ["page-varro"]);
  t = J.closeTab(t, t.tabs[0].id);
  assert.equal(J.currentPageId(t), "page-tessa");
  const storage = memory();
  J.writeTabs(storage, "lanterns", "player", t);
  assert.deepEqual(J.readTabs(storage, "lanterns", "player"), t);
  assert.deepEqual(J.readTabs(storage, "lanterns", "dm"), J.emptyTabs(), "tabs are per identity");
  const broken = { getItem: () => "{", setItem() {} };
  assert.deepEqual(J.readTabs(broken, "lanterns", "player"), J.emptyTabs());
});

test("'Solo io' notes: each identity reads only its own, and they are local changes", () => {
  const { ctx } = harness();
  ctx.offline = true;
  as(ctx, "player", () =>
    ctx.commit("note", (d) => J.setPersonalNote(d, "player", "page-tessa", "Non mi fido."), {
      local: true,
    }),
  );
  assert.equal(J.personalNote(ctx.state, "player", "page-tessa"), "Non mi fido.");
  assert.equal(J.personalNote(ctx.state, "dm", "page-tessa"), "");
  assert.ok(!JSON.stringify(J.readPage(ctx.state, "page-tessa", "dm")).includes("Non mi fido"));
});

test("archive UI: the player's page never shows secrets; DM tabs, back and links bind", () => {
  const { ctx, registry } = harness({ role: "player" });
  const section = registry.get("campaign-section", "quests-archive", ctx);
  ctx.view = { page: "campaign", tab: "quests-archive", id: "p:page-tessa" };
  const html = registry.slot("campaign-section", section, ctx);
  assert.ok(html.includes("Tessa Varro"));
  assert.ok(!html.includes("Comprare la torre"), "secret property");
  assert.ok(!html.includes("Ha scritto la lettera"), "secret block");
  assert.ok(!html.includes("paga in segreto"), "secret connection");
  ctx.role = "dm";
  ctx.view = { page: "campaign", tab: "quests-archive", id: "p:page-oben" };
  const dmHtml = registry.slot("campaign-section", section, ctx);
  assert.ok(dmHtml.includes("È prigioniero nella torre"));
  const ui = mount(dmHtml, (root) => section.bind(root, ctx));
  ui.click('[data-jp-open="page-guild"]');
  assert.equal(ctx.view.id, "p:page-guild");
  const next = registry.slot("campaign-section", section, ctx);
  const ui2 = mount(next, (root) => section.bind(root, ctx));
  ui2.click("[data-jp-back]");
  assert.equal(ctx.view.id, "p:page-oben");
});

test("snippets never cut a [[link]] in half; plain text drops the brackets", () => {
  const { ctx } = harness();
  const long =
    "x".repeat(66) + "[[Maestro Oben]] " + "y".repeat(57) + " [[Casa Varro]] " + "z".repeat(80);
  ctx.commit("text", (d) =>
    J.updatePage(d, "dm", "page-goblins", { blocks: [{ id: "gob-b1", kind: "text", text: long }] }),
  );
  for (const row of J.backlinks(ctx.state, "page-varro", "dm").filter(
    (b) => b.id === "page-goblins",
  ))
    for (const text of row.snippets)
      assert.equal(
        (text.match(/\[\[/g) ?? []).length,
        (text.match(/\]\]/g) ?? []).length,
        "balanced brackets: " + text,
      );
  assert.equal(J.plainText("La lettera è di [[Tessa Varro]]."), "La lettera è di Tessa Varro.");
});
