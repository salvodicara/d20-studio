// P5 fix package — a small shared harness: the real store, registry and combat tracker,
// a ctx double that records toasts and dialogs, and helpers for synthetic NPCs.
// Synthetic data only (the lantern campaign sample).
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc, icon } from "../ui.mjs";
import { createSceneNPC, placeSceneToken } from "../preparation.mjs";
import * as data from "../srd-compendium.mjs";
import * as D from "../combat-tracker-domain.mjs";
import * as UI from "../combat-tracker.mjs";
import { register as registerTokenMenu } from "../token-menu.mjs";
import { register as registerSettings } from "../campaign-settings.mjs";
import { register as registerLoot } from "../loot.mjs";

export function harness({ lang = "it", role = "dm" } = {}) {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry({ logger: null });
  for (const [name, fn] of [
    ["token-menu", registerTokenMenu],
    ["campaign-settings", registerSettings],
    ["loot", registerLoot],
    ["combat-tracker", UI.register],
  ])
    assert.equal(registry.use(name, fn).status, "built", name);
  let store = createStore({ storage });
  registry.initState(store.state);
  const toasts = [];
  const dialogs = [];
  const ctx = {
    role,
    lang,
    offline: false,
    view: { page: "table", id: "", tab: "" },
    get state() {
      return store.state;
    },
    esc,
    icon,
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      typeof value === "object" && value
        ? value[ctx.lang] || value.it || value.en || ""
        : String(value ?? ""),
    canControl: (actor) =>
      !!actor && actor.visibility !== "private" && (ctx.role === "dm" || actor.owner === ctx.role),
    toast: (text, error = false) => toasts.push({ text, error }),
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {},
    navigate() {},
    openSheet() {},
    startEncounter() {},
    commit(label, mutator, options = {}) {
      if (this.offline && !options.local)
        throw Object.assign(Error("offline"), { it: "offline", en: "offline" });
      const before = store.state;
      store.commit(label, mutator, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      return { applied: true, persisted: true };
    },
    registry,
  };
  registry.attach(ctx);
  return {
    ctx,
    registry,
    toasts,
    dialogs,
    store: () => store,
    slice: () => D.sliceOf(store.state),
    reload() {
      store = createStore({ storage });
      registry.initState(store.state);
    },
  };
}
export function addGoblin(s, id, name, point, { hidden = false } = {}) {
  const entry = data.getEntry("srd2024:creature:goblin-warrior");
  const { input, patch } = data.npcFromCreature(entry, { id, name, team: "watch" });
  const actor = createSceneNPC(s, input, "dm");
  Object.assign(actor, patch);
  actor.combatProfile = { ...actor.combatProfile, meleeAttack: data.srdMeleeProfile(entry) };
  placeSceneToken(s, "old-watch", id, point, "token-" + id, "dm");
  if (hidden) s.scenes[0].tokens.find((t) => t.actorId === id).hidden = true;
  return actor;
}
export const row = (actorId, natural, bonus = 0) => ({
  actorId,
  natural,
  bonus,
  mode: "physical",
});
export const cmd = (h, label, fn, options) =>
  h.ctx.commit(label, (s) => fn(s, D.sliceOf(s)), options);
export const current = (h) => h.ctx.state.combat.order[h.ctx.state.combat.turn];
