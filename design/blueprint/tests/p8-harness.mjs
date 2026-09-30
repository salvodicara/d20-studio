// Shared harness of the P8 tests: real store and registry with the compendium and the
// homebrew editor, the handlers the bound controls call. Synthetic demo data only.
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import * as compendium from "../compendium.mjs";
import * as UI from "../homebrew-editor.mjs";

export function memory() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
function form(fields = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields))
    for (const entry of [].concat(value)) data.append(key, String(entry));
  return data;
}
export function harness({ role = "dm", lang = "it" } = {}) {
  const storage = memory();
  const registry = createRegistry();
  registry.use("compendium", compendium.register);
  registry.use("homebrew-editor", UI.register);
  const store = createStore({ storage });
  if (registry.initState(store.state).changed) store.persist();
  const toasts = [],
    dialogs = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    view: { page: "library", tab: "homebrew-editor", id: "", revision: "" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object"
        ? value[ctx.lang] || value.it || value.en || ""
        : String(value ?? ""),
    esc,
    icon: () => "",
    toast: (text, error = false) => toasts.push({ text, error }),
    dialog: (title, body, options = {}) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {},
    navigate(page, params = {}) {
      ctx.view = { id: "", tab: "", revision: "", ...params, page };
    },
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    commit(label, mutator, options = {}) {
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
      });
      return { applied: true, persisted: true };
    },
  };
  Object.defineProperty(ctx, "registry", { get: () => registry });
  registry.attach(ctx);
  return {
    ctx,
    toasts,
    dialogs,
    store,
    get slice() {
      return store.state.ext["homebrew-editor"];
    },
    as(value) {
      ctx.role = value;
      UI.resetView();
    },
    run: (action, data = {}, fields = null) =>
      UI.handleAction(ctx, action, data, fields ? form(fields) : null),
    submit(fields = {}) {
      const dialog = dialogs.at(-1);
      assert.ok(dialog, "no dialog open");
      return dialog.options.onSubmit(form(fields));
    },
    edit(id, tab = "identity") {
      ctx.navigate("homebrew-editor", { id, tab });
      return UI.renderRoute(ctx);
    },
    errors: () => toasts.filter((x) => x.error).map((x) => x.text),
  };
}
