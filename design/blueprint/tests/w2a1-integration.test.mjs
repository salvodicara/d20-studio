// W2a1 integration: interactions between the wave's areas (B32 combat tracker, B35 fog and
// vision, B39, B42, B43, B44, B45) and the areas that were already built. Synthetic data only:
// the lantern campaign, Livia, Doran and the sample goblins.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc, icon } from "../ui.mjs";
import * as notifications from "../notifications.mjs";
import * as tracker from "../combat-tracker.mjs";
import { register as registerTokenMenu } from "../token-menu.mjs";
import { register as registerSettings } from "../campaign-settings.mjs";
import { register as registerLoot } from "../loot.mjs";

function memory() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function bell() {
  notifications.setNotificationsStorage(memory());
  notifications.resetNotificationsMemory();
  const registry = createRegistry({ logger: null });
  for (const [name, fn] of [
    ["notifications", notifications.register],
    ["token-menu", registerTokenMenu],
    ["campaign-settings", registerSettings],
    ["loot", registerLoot],
    ["combat-tracker", tracker.register],
  ])
    assert.equal(registry.use(name, fn).status, "built", name);
  const store = createStore({ storage: memory() });
  registry.initState(store.state);
  const ctx = {
    role: "player",
    lang: "it",
    view: { page: "table", id: "", tab: "" },
    get state() {
      return store.state;
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
    registry,
  };
  registry.attach(ctx);
  const turnOf = (actorId, offset = 0) =>
    store.commit(
      "turn",
      (s) => {
        s.combat.active = true;
        const order = s.combat.order;
        s.combat.turn = (order.indexOf(actorId) + offset + order.length) % order.length;
      },
      "dm",
      { shared: true },
    );
  const titles = () => registry.notifications(ctx).map((n) => ctx.label(n.title));
  return { ctx, turnOf, titles };
}

test("B24 × B32: the player's bell lists one “your turn” notice, not two", () => {
  const h = bell();
  h.turnOf("livia");
  const titles = h.titles();
  assert.equal(
    titles.filter((t) => t === "È il tuo turno: Livia").length,
    1,
    `turn notices: ${JSON.stringify(titles)}`,
  );
  h.ctx.lang = "en";
  assert.equal(h.titles().filter((t) => t === "Your turn: Livia").length, 1);
});

test("B24 × B32: “you're next” stays in the bell (only the tracker announces it)", () => {
  const h = bell();
  h.turnOf("livia", -1);
  const titles = h.titles();
  assert.equal(titles.filter((t) => t === "Il prossimo turno è tuo: Livia").length, 1);
  assert.equal(titles.filter((t) => /È il tuo turno/.test(t)).length, 0);
});
