// P2 fix package — shared test harness: the real store and registry with the sheet areas
// the character sheet uses, and a fake ctx that records dialogs, toasts and navigation.
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import * as sheetPlus from "../sheet-plus.mjs";

function memory() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

/** A cloak row as the inventory seed writes it: equipped and attuned. */
export const cloakRow = (extra = {}) => ({
  id: "invp-cloak",
  srdId: "srd2024:item:cloak-of-protection",
  name: { it: "Mantello della protezione", en: "Cloak of Protection" },
  kind: "gear",
  quantity: 1,
  weight: 0.5,
  equipped: true,
  attunement: { required: true, by: null },
  attuned: true,
  ...extra,
});

export function harness({
  role = "player",
  lang = "it",
  setup = null,
  areas = [["sheet-plus", sheetPlus.register]],
  view = { page: "characters", id: "livia", tab: "actions" },
} = {}) {
  const storage = memory();
  const device = memory();
  const registry = createRegistry({ deviceStorage: device });
  for (const [id, register] of areas) registry.use(id, register);
  const store = createStore({ storage });
  setup?.(store.state);
  if (registry.initState(store.state).changed) store.persist();
  const dialogs = [];
  const toasts = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    view: { ...view },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object"
        ? (value[ctx.lang] ?? value.it ?? value.en ?? "")
        : String(value ?? ""),
    esc,
    icon: () => "",
    toast: (text, error = false) => toasts.push({ text, error }),
    dialog(title, body, options = {}) {
      dialogs.push({ title, body, options });
    },
    closeDialog() {},
    render() {},
    navigate(page, params) {
      ctx.navigated = { page, params };
    },
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    commit(label, mutator, options = {}) {
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      if (options.afterCommit) {
        options.afterCommit(store.state);
        store.persist();
      }
      return { applied: true, persisted: true };
    },
    undo() {
      store.undo(ctx.role);
    },
  };
  Object.defineProperty(ctx, "registry", { get: () => registry });
  registry.attach(ctx);
  return {
    ctx,
    dialogs,
    toasts,
    registry,
    get state() {
      return store.state;
    },
    lastDialog: () => dialogs.at(-1),
  };
}
