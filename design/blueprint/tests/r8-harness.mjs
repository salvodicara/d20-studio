// R8 test support (not a test file): every area loaded as in the app, on the real store,
// with a recording shell ctx. Synthetic data only.
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { loadExtensions } from "../extensions.mjs";
import { esc, icon } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";

export const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};

export async function app({ role = "dm", lang = "it" } = {}) {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  const rows = await loadExtensions(registry);
  assert.deepEqual(
    rows.filter((row) => row.status !== "built").map((row) => `${row.id}: ${row.error}`),
    [],
  );
  const store = createStore({ storage: memory() });
  registry.initState(store.state);
  const log = { dialogs: [], toasts: [], navigations: [] };
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    view: { page: "home", id: "", tab: "" },
    t: (it, en) => (ctx.lang === "en" ? en : it),
    label: (v) => (typeof v === "object" && v ? (v[ctx.lang] ?? v.it) : String(v ?? "")),
    esc,
    icon,
    registry,
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    toast: (text, error = false) => log.toasts.push({ text, error }),
    render: () => {},
    navigate(page, params = {}) {
      log.navigations.push({ page, params });
      ctx.view = { page, id: "", tab: "", ...params };
    },
    dialog: (title, body, options = {}) => log.dialogs.push({ title, body, options }),
    closeDialog: () => {},
    openSheet: () => {},
    openConditions: () => {},
    commit(label, mutator, options = {}) {
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      return { applied: true, persisted: true };
    },
    undo: () => store.undo(ctx.role),
    canUndo: () => store.history.at(-1)?.controller === ctx.role,
    undoLabel: () => store.history.at(-1)?.label ?? "",
  };
  registry.attach(ctx);
  return { registry, store, ctx, log };
}

// Every disabled form control must point at an element with a non-empty reason (SV-37).
export function described(html, label) {
  const controls = [...html.matchAll(/<(button|input|select|textarea)\b([^>]*)>/g)].filter(
    ([, , attrs]) => /\sdisabled(\s|=|$)/.test(attrs),
  );
  assert.ok(controls.length, `${label}: the case renders a disabled control`);
  for (const [whole, , attrs] of controls) {
    const id = attrs.match(/aria-describedby="([^"]+)"/)?.[1];
    assert.ok(id, `${label}: no reason for ${whole.slice(0, 180)}`);
    const at = html.indexOf(`id="${id}"`);
    assert.ok(at >= 0, `${label}: reason #${id} missing`);
    const text = html
      .slice(html.indexOf(">", at) + 1, html.indexOf("</", at))
      .replace(/<[^>]+>/g, "")
      .trim();
    assert.ok(text.length > 8, `${label}: reason #${id} is empty`);
  }
  return controls.length;
}

const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
/** A string DOM of the rendered controls: attribute selectors, click and change events. */
export function fakeRoot(html) {
  const nodes = [...html.matchAll(/<(input|button|select|textarea|form|details)\b([^>]*)>/g)].map(
    ([, tag, attrsText]) => {
      const attrs = Object.fromEntries(
        [...attrsText.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v)]),
      );
      const events = {};
      return {
        attrs,
        events,
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
          (events[type] ??= []).push(fn);
        },
        setAttribute(k, v) {
          attrs[k] = v;
        },
        getAttribute: (k) => attrs[k] ?? null,
        removeAttribute(k) {
          delete attrs[k];
        },
        closest: () => null,
        focus() {},
        querySelector: () => null,
        querySelectorAll: () => [],
        classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
        click() {
          for (const fn of events.click ?? [])
            fn({ preventDefault() {}, target: this, currentTarget: this });
          this.onclick?.({ preventDefault() {}, target: this, currentTarget: this });
        },
      };
    },
  );
  const matches = (node, selector) =>
    [...selector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)].every(
      ([, k, v]) => k in node.attrs && (v === undefined || node.attrs[k] === v),
    );
  return {
    nodes,
    querySelectorAll(selector) {
      if (!/^(\[[^\]]+\])+$/.test(selector)) return [];
      return nodes.filter((node) => matches(node, selector));
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] ?? null;
    },
  };
}
