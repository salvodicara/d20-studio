// Shared test harness for B30 (home.test.mjs, help.test.mjs): the real store and registry
// with the home area (and optionally the B13 campaigns, B15 materials and B21 characters
// areas), a ctx shaped like the shell's
// and a minimal element double for bind(). Synthetic data only.
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc, icon } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import { register } from "../home.mjs";
import { useBookStorage, BOOK_KEY } from "../help.mjs";
import { normalizeBook } from "../home-domain.mjs";

export async function harness({
  lang = "it",
  role = "player",
  campaigns = false,
  handouts = false,
  library = false,
} = {}) {
  const values = new Map();
  const storage = {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
  };
  // The personal book (news read, tips, tours, first steps, reports) is device storage.
  useBookStorage(storage);
  const registry = createRegistry({ deviceStorage: storage });
  if (handouts) {
    const ho = await import("../handouts.mjs");
    assert.equal(registry.use("handouts", ho.register).status, "built");
  }
  if (campaigns) {
    const cm = await import("../campaign-members.mjs");
    assert.equal(registry.use(cm.ID, cm.register).status, "built");
  }
  if (library) {
    const lib = await import("../character-library.mjs");
    assert.equal(registry.use(lib.ID, lib.register).status, "built");
  }
  assert.equal(registry.use("home", register).status, "built");
  let store = createStore({ storage });
  registry.initState(store.state);
  const toasts = [];
  const navigations = [];
  const dialogs = [];
  const ctx = {
    role,
    lang,
    offline: false,
    view: { page: "home", id: "", tab: "", returnTo: "" },
    get state() {
      return store.state;
    },
    get storageError() {
      return store.storageError;
    },
    esc,
    icon,
    t(it, en) {
      return this.lang === "it" ? it : en;
    },
    label(value) {
      return typeof value === "object" && value
        ? value[this.lang] || value.it || value.en || ""
        : String(value ?? "");
    },
    toast: (text, error = false) => toasts.push({ text, error }),
    navigate(page, params = {}) {
      navigations.push({ page, ...params });
      this.view = {
        page,
        id: params.id ?? "",
        tab: params.tab ?? "",
        returnTo: params.returnTo ?? "",
      };
    },
    dialog: (title, body, options = {}) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {},
    canControl(actor) {
      return canControlActor(actor, this.role, store.state);
    },
    commit(label, mutator, options = {}) {
      if (this.offline && !options.local) {
        const it = "Sei senza rete: questa modifica condivisa non può essere applicata.";
        throw Object.assign(Error(it), {
          it,
          en: "You are offline: this shared change cannot be applied.",
        });
      }
      const before = store.state;
      store.commit(label, mutator, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      return { applied: true, persisted: !store.storageError };
    },
    undo() {
      const current = store.state;
      store.undo(this.role);
      registry.afterUndo(current, store.state);
      store.persist();
      registry.emitStateEvents(current, store.state, { kind: "correction" });
    },
    registry,
  };
  registry.attach(ctx);
  return {
    ctx,
    registry,
    toasts,
    navigations,
    dialogs,
    storage,
    home: () => store.state.ext.home,
    // This device's personal book, as stored.
    book: () => normalizeBook(JSON.parse(storage.getItem(BOOK_KEY) ?? "null")),
    store: () => store,
    reload() {
      store = createStore({ storage });
      registry.initState(store.state);
      useBookStorage(storage);
    },
    mutate(fn) {
      // Explicit fixture setup (not a product path): edits the stored state directly.
      fn(store.state);
      store.persist();
    },
  };
}

const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

// Minimal element double: parses the rendered markup into a tree of nodes that answer
// attribute selectors (descendant selectors included), dataset, events and scoped queries.
const VOID = new Set([
  "input",
  "br",
  "img",
  "hr",
  "meta",
  "link",
  "source",
  "path",
  "polygon",
  "circle",
  "rect",
  "line",
]);
export function mount(html, bind, ctx) {
  const nodes = [];
  const stack = [];
  for (const [, closing, tag, attrsText = "", selfClosing] of html.matchAll(
    /<(\/)?([a-z][a-z0-9]*)\b([^>]*?)(\/)?>/g,
  )) {
    if (closing) {
      const at = stack.map((n) => n.tagName).lastIndexOf(tag.toUpperCase());
      if (at >= 0) stack.length = at;
      continue;
    }
    const attrs = Object.fromEntries(
      [...attrsText.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v ?? "")]),
    );
    const events = {};
    const node = {
      tagName: tag.toUpperCase(),
      parent: stack.at(-1) ?? null,
      attrs,
      events,
      value: attrs.value ?? "",
      checked: "checked" in attrs,
      hidden: "hidden" in attrs,
      dataset: Object.fromEntries(
        Object.entries(attrs)
          .filter(([k]) => k.startsWith("data-"))
          .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
      ),
      addEventListener(type, fn) {
        (events[type] ??= []).push(fn);
      },
      setAttribute(k, v) {
        attrs[k] = String(v);
      },
      getAttribute: (k) => attrs[k] ?? null,
      hasAttribute: (k) => k in attrs,
      removeAttribute: (k) => delete attrs[k],
      querySelectorAll: (selector) => nodes.filter((n) => inside(n, node) && matches(n, selector)),
      querySelector: (selector) =>
        nodes.find((n) => inside(n, node) && matches(n, selector)) ?? null,
      focus() {},
      scrollIntoView() {},
      isConnected: true,
    };
    nodes.push(node);
    if (!VOID.has(tag) && !selfClosing) stack.push(node);
  }
  const inside = (node, ancestor) => {
    for (let p = node.parent; p; p = p.parent) if (p === ancestor) return true;
    return false;
  };
  const compound = (node, text) => {
    const attrs = [...text.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)];
    return (
      attrs.length > 0 &&
      attrs.every(
        ([, key, value]) => key in node.attrs && (value === undefined || node.attrs[key] === value),
      )
    );
  };
  const matches = (node, selector) =>
    selector.split(",").some((part) => {
      const chain = part.trim().split(/\s+/);
      if (!compound(node, chain.at(-1))) return false;
      let p = node.parent;
      for (const text of chain.slice(0, -1).reverse()) {
        while (p && !compound(p, text)) p = p.parent;
        if (!p) return false;
        p = p.parent;
      }
      return true;
    });
  const root = {
    querySelectorAll: (selector) => nodes.filter((node) => matches(node, selector)),
    querySelector: (selector) => nodes.find((node) => matches(node, selector)) ?? null,
    isConnected: true,
  };
  bind(root, ctx);
  const fire = (selector, type, patch = {}) => {
    const node = root.querySelector(selector);
    assert.ok(node, `Missing ${selector}`);
    Object.assign(node, patch);
    for (const fn of node.events[type] ?? [])
      fn({
        currentTarget: node,
        target: node,
        preventDefault() {},
        stopPropagation() {},
        key: patch.key,
      });
    return node;
  };
  return {
    root,
    nodes,
    click: (selector) => fire(selector, "click"),
    change: (selector, patch) => fire(selector, "change", patch),
    key: (selector, key) => fire(selector, "keydown", { key }),
  };
}
export const formData = (entries) => {
  const form = new FormData();
  for (const [key, value] of entries) form.append(key, value);
  return form;
};
// Renders a registered contribution, unwrapping the registry slot.
export function slotHTML(registry, point, id, ctx, ...args) {
  return registry.slot(point, registry.get(point, id, ctx, ...args), ctx, ...args);
}
