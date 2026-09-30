// R3 test harness (not a test file): the real store and registry with the areas a test
// names, a ctx like the shell's, and helpers to commit as a role and to answer requests.
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc, icon } from "../ui.mjs";
import { resolveRoll } from "../combat.mjs";
import { canControlActor } from "../character-access.mjs";

export function harness({ lang = "it", role = "player", areas = [] } = {}) {
  const values = new Map();
  const storage = {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
  };
  const registry = createRegistry({ logger: null });
  for (const [id, register] of areas) assert.equal(registry.use(id, register).status, "built");
  let store = createStore({ storage });
  registry.initState(store.state);
  store.persist();
  const toasts = [];
  const dialogs = [];
  const history = [];
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
    canControl(actor) {
      return canControlActor(actor, this.role, store.state);
    },
    toast: (text, error = false) => toasts.push({ text, error }),
    dialog(title, body, options = {}) {
      dialogs.push({ title, body, options });
    },
    closeDialog() {},
    render() {},
    navigate(page) {
      this.view = { page, id: "", tab: "" };
    },
    openForms(actorId, tab) {
      this.formsOpened = { actorId, tab };
    },
    undoLabel: () => (history.at(-1)?.controller === ctx.role ? history.at(-1).label : ""),
    commit(label, mutator, options = {}) {
      if (this.offline && !options.local)
        throw Object.assign(Error("offline"), { it: "offline", en: "offline" });
      const before = store.state;
      store.commit(label, mutator, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      history.push({ label, controller: this.role });
      registry.emitStateEvents(before, store.state);
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(this.role);
      history.pop();
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
    get s() {
      return store.state;
    },
    cmd(label, fn, as = ctx.role) {
      const previous = ctx.role;
      ctx.role = as;
      let out;
      try {
        ctx.commit(label, (draft) => {
          out = fn(draft);
        });
      } finally {
        ctx.role = previous;
      }
      return out;
    },
    as(role, fn) {
      const previous = ctx.role;
      ctx.role = role;
      try {
        return fn();
      } finally {
        ctx.role = previous;
      }
    },
  };
}
export const op = (id) => ({ operationId: id });
export const token = (s, id) =>
  s.scenes.find((x) => x.id === s.activeSceneId).tokens.find((t) => t.actorId === id);
export const place = (s, id, x, y) => Object.assign(token(s, id), { x, y });
export function startCombat(s, order) {
  s.combat = { active: true, round: 1, turn: 0, order, encounterId: "enc-r3" };
  for (const id of order) {
    const a = s.actors[id];
    a.movement = a.speed;
    a.movementSpent = 0;
    a.dashCount = 0;
    a.action = true;
    a.bonus = true;
    a.reaction = true;
  }
}
/** Answers the first pending request of an attempt with the given faces. */
export function answer(s, attemptId, faces, role) {
  const request = s.combatAttempts
    .find((a) => a.id === attemptId)
    .requests.find((r) => r.status === "pending");
  return resolveRoll(s, attemptId, request.id, faces, role);
}
