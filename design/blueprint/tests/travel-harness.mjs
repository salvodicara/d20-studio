// B45 — shared test harness for the travel and camp tests: the real store and registry,
// a ctx like the app's (commit with afterCommit, undo, dialogs captured) and a minimal
// element double for the UI handlers. Synthetic data only.
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import * as T from "../travel.mjs";

export const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
export const plain = (html) =>
  decode(String(html).replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

export function harness({ lang = "it", role = "dm", dice = [] } = {}) {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry();
  assert.equal(registry.use("travel", T.register).status, "built");
  let store = createStore({ storage });
  registry.initState(store.state);
  const toasts = [],
    dialogs = [],
    navigations = [],
    events = [];
  registry.on?.("roll-accepted", (payload) => events.push(payload));
  const faces = [...dice];
  const ctx = {
    role,
    lang,
    offline: false,
    view: { page: "table", id: "", tab: "" },
    get state() {
      return store.state;
    },
    esc,
    icon: (name) => `<i data-icon="${name}"></i>`,
    t(it, en) {
      return this.lang === "it" ? it : en;
    },
    label(value) {
      return typeof value === "object" && value
        ? value[this.lang] || value.it || value.en || ""
        : String(value ?? "");
    },
    rollDie: (sides) => {
      const face = faces.shift();
      assert.ok(face !== undefined, "test ran out of scripted dice");
      assert.ok(face >= 1 && face <= sides);
      return face;
    },
    toast: (text, error = false) => toasts.push({ text, error }),
    navigate: (page, params = {}) => navigations.push({ page, ...params }),
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {},
    canUndo: () => {
      const last = store.history.at(-1);
      return !!last && last.controller === ctx.role;
    },
    undoLabel: () => {
      const last = store.history.at(-1);
      return last && last.controller === ctx.role ? last.label : "";
    },
    commit(label, mutator, options = {}) {
      if (this.offline && !options.local) {
        const it = "Sei senza rete: questa modifica condivisa non può essere applicata.";
        throw Object.assign(Error(it), { it, en: "You are offline." });
      }
      const before = store.state;
      store.commit(label, mutator, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      if (options.afterCommit) {
        options.afterCommit(store.state);
        store.persist();
      }
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(this.role);
      registry.afterUndo(current, store.state);
      store.persist();
    },
    registry,
  };
  registry.attach(ctx);
  return {
    ctx,
    registry,
    toasts,
    dialogs,
    navigations,
    events,
    dice: faces,
    store: () => store,
    slice: () => store.state.ext.travel,
    camp: () => store.state.ext.travel.campaigns.lanterns,
    rolls: () => store.state.ext["travel-rolls"],
    reload() {
      store = createStore({ storage });
      registry.initState(store.state);
    },
    /** Runs one domain command as a commit, like the UI does. */
    run(fn, role = ctx.role) {
      let out;
      const saved = ctx.role;
      ctx.role = role;
      try {
        ctx.commit("test", (draft) => {
          out = fn(draft, draft.ext.travel, draft.ext["travel-rolls"]);
        });
      } finally {
        ctx.role = saved;
      }
      return out;
    },
    /** Submits the last dialog with form fields. */
    submit(fields = {}) {
      const dialog = dialogs.at(-1);
      assert.ok(dialog, "no dialog open");
      const data = new FormData();
      for (const [key, value] of Object.entries(fields))
        for (const v of [].concat(value)) data.append(key, v);
      return dialog.options.onSubmit(data);
    },
  };
}

// Minimal element double: buttons/inputs/forms/selects from markup, own listeners.
export function mount(html, bind, ...args) {
  const nodes = [
    ...html.matchAll(/<(input|button|select|textarea|form)\b([^>]*)(?:>([\s\S]*?)<\/\1>|>)/g),
  ].map(([, tag, attrsText, inner]) => {
    const attrs = Object.fromEntries(
      [...attrsText.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v)]),
    );
    const node = {
      tagName: tag.toUpperCase(),
      attrs,
      inner: inner ?? "",
      listeners: {},
      checked: "checked" in attrs,
      value:
        attrs.value ??
        (tag === "select"
          ? decode(
              /<option value="([^"]*)"[^>]*selected/.exec(inner ?? "")?.[1] ??
                /<option value="([^"]*)"/.exec(inner ?? "")?.[1] ??
                "",
            )
          : ""),
      dataset: Object.fromEntries(
        Object.entries(attrs)
          .filter(([k]) => k.startsWith("data-"))
          .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
      ),
      addEventListener(type, fn) {
        (node.listeners[type] ??= []).push(fn);
      },
      getAttribute: (k) => attrs[k] ?? null,
      closest: () => null,
    };
    return node;
  });
  const matches = (node, selector) =>
    selector.split(",").some((part) => {
      const tag = /^([a-z]+)/.exec(part.trim())?.[1];
      return (
        (!tag || node.tagName === tag.toUpperCase()) &&
        [...part.trim().matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)].every(
          ([, key, value]) =>
            key in node.attrs && (value === undefined || node.attrs[key] === value),
        )
      );
    });
  const root = {
    querySelectorAll: (selector) => nodes.filter((node) => matches(node, selector)),
    querySelector: (selector) => nodes.find((node) => matches(node, selector)) ?? null,
    addEventListener() {},
  };
  bind(root, ...args);
  const fire = (node, type, extra = {}) => {
    const event = { target: node, preventDefault() {}, stopPropagation() {}, ...extra };
    for (const fn of node.listeners[type] ?? []) fn(event);
  };
  return {
    root,
    nodes,
    has: (selector) => Boolean(root.querySelector(selector)),
    click(selector) {
      const node = root.querySelector(selector);
      assert.ok(node, `Missing ${selector}`);
      fire(node, "click");
    },
    change(selector, value) {
      const node = root.querySelector(selector);
      assert.ok(node, `Missing ${selector}`);
      if (typeof value === "boolean") node.checked = value;
      else node.value = value;
      fire(node, "change");
    },
  };
}
/** The Table view the registry passes to panels and layers. */
export const tableView = (h, selectedActorId = "livia", mode = "move") => ({
  scene: h.ctx.state.scenes.find((s) => s.id === h.ctx.state.activeSceneId),
  selectedActorId,
  mode,
  zoom: 1,
  pan: { x: 0, y: 0 },
});
/** A Table double for panel binds and tools. */
export function tableDouble(h, mode = "move") {
  const table = {
    mode,
    scene: h.ctx.state.scenes.find((s) => s.id === h.ctx.state.activeSceneId),
    messages: [],
    message: (text) => table.messages.push(text),
    setMode: (id) => (table.mode = id),
    point: (event) => ({ x: event.x, y: event.y }),
    root: null,
    svg: null,
  };
  return table;
}
