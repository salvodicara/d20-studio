// R2 test support (not a test file): the dice tray on the real store and registry with a
// small fake DOM, as dice-tray.test.mjs wires it. Synthetic data only.
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import * as tray from "../dice-tray.mjs";
import * as dice3d from "../dice-3d.mjs";

export const scripted = (...values) => {
  const queue = [...values];
  return (sides) => {
    const value = queue.shift();
    assert.ok(Number.isInteger(value), `No scripted face left for a d${sides}`);
    assert.ok(value >= 1 && value <= sides, `Scripted face ${value} outside d${sides}`);
    return value;
  };
};
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

export function fakeRoot(html) {
  const nodes = [
    ...html.matchAll(/<(input|button|select|textarea)\b([^>]*)(?:>([\s\S]*?)<\/\1>|>)/g),
    ...[...html.matchAll(/<(form|p|small|li|span|h4)\b([^>]*)>/g)].map((m) => [
      m[0],
      m[1],
      m[2],
      "",
    ]),
  ].map(([, tag, attrsText, inner]) => {
    const attrs = Object.fromEntries(
      [...attrsText.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v)]),
    );
    const events = {};
    return {
      attrs,
      events,
      inner,
      tagName: tag.toUpperCase(),
      dataset: Object.fromEntries(
        Object.entries(attrs)
          .filter(([k]) => k.startsWith("data-"))
          .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
      ),
      value: attrs.value ?? "",
      checked: "checked" in attrs,
      disabled: "disabled" in attrs,
      addEventListener(type, fn) {
        events[type] = fn;
      },
      setAttribute(k, v) {
        attrs[k] = v;
      },
      getAttribute(k) {
        return attrs[k] ?? null;
      },
      removeAttribute(k) {
        delete attrs[k];
      },
      closest: () => null,
      focus() {},
    };
  });
  const root = {
    html,
    nodes,
    // Attribute selectors only: "[a]", "[a="b"]" and several of them together.
    querySelectorAll(selector) {
      if (!/^(\[[^\]]+\])+$/.test(selector)) return [];
      const parts = [...selector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)].map((m) => [
        m[1],
        m[2],
      ]);
      return nodes.filter((n) =>
        parts.every(([k, v]) => k in n.attrs && (v === undefined || n.attrs[k] === v)),
      );
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
  };
  // A form reaches its fields (the whole fake root stands in for its subtree).
  for (const n of nodes)
    if (n.tagName === "FORM")
      Object.assign(n, {
        querySelectorAll: root.querySelectorAll.bind(root),
        querySelector: root.querySelector.bind(root),
      });
  return root;
}
export const node = (root, selector) => {
  const found = root.querySelector(selector);
  assert.ok(found, `No ${selector}`);
  return found;
};
export const click = (root, selector) => {
  const n = node(root, selector);
  (n.onclick ?? n.events.click)({ target: n, preventDefault() {}, currentTarget: n });
};
export const change = (root, selector, value) => {
  const n = node(root, selector);
  n.value = value;
  (n.events.change ?? n.events.input)({ target: n });
};

/** Real store + real registry with the tray (and B56) registered, as app.mjs wires them. */
export function trayHarness({ role = "player", lang = "it", die = null, extra = [] } = {}) {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const store = createStore({ storage });
  const registry = createRegistry({ document: undefined, logger: null, deviceStorage: storage });
  assert.equal(registry.use("dice-tray", tray.register).status, "built");
  assert.equal(registry.use("dice-3d", dice3d.register).status, "built");
  for (const [id, register] of extra) assert.equal(registry.use(id, register).status, "built");
  registry.initState(store.state);
  const emitted = [];
  const errors = [];
  const toasts = [];
  registry.on("roll-accepted", (payload) => emitted.push(payload));
  const panel = () => registry.get("table-panel", "dice-tray", ctx);
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    view: { page: "table", id: "", tab: "" },
    registry,
    esc,
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) => (typeof v === "object" && v ? v[ctx.lang] || v.it : String(v ?? "")),
    icon: () => "",
    rollDie: die,
    toast(text, error) {
      (error ? errors : toasts).push(text);
    },
    dialog(title, body, options = {}) {
      this.dialogState = { title, body, options };
    },
    closeDialog() {
      this.dialogState = null;
    },
    canControl: () => true,
    commit(label, mutate, options = {}) {
      if (this.offline && !options.local) {
        const it = "Sei senza rete: questa modifica condivisa non può essere applicata.";
        throw Object.assign(Error(it), { it, en: "You are offline." });
      }
      const before = store.state;
      store.commit(label, mutate, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      this.render();
      return { applied: true, persisted: true };
    },
    render() {
      const scene = store.state.scenes.find((s) => s.id === store.state.activeSceneId);
      this.html = panel().render(this, { scene, selectedActorId: this.selected ?? "livia" });
      this.root = fakeRoot(this.html);
      panel().bind(this.root, this, {});
    },
  };
  registry.attach(ctx);
  ctx.render();
  return {
    ctx,
    store,
    registry,
    emitted,
    errors,
    toasts,
    slice: () => store.state.ext["dice-tray"],
    section(name) {
      click(ctx.root, `[data-dtray-section="${name}"]`);
    },
    submitDialog(fields = {}) {
      const dialog = ctx.dialogState;
      assert.ok(dialog, "no dialog open");
      const data = new FormData();
      for (const [key, value] of Object.entries(fields)) data.append(key, value);
      return dialog.options.onSubmit(data);
    },
  };
}
