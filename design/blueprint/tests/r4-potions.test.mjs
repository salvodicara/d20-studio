// R4 (fix round 2) — H-01 part, contract C7 (BG3 Custom Mode, Solasta presets): drinking a
// potion costs what the campaign's rule says. SRD 5.2.1 Potion of Healing: a Bonus Action;
// the house rule «Azione» makes it an Action, and a spent resource greys the control out
// with its reason. The real store and areas; synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import { beginHealing, usePotion } from "../characters.mjs";
import * as ID from "../inventory-plus-domain.mjs";
import * as inv from "../inventory-plus.mjs";
import * as loot from "../loot.mjs";
import * as sheetPlus from "../sheet-plus.mjs";
import * as settings from "../campaign-settings.mjs";
import { policyOf, ID as SETTINGS } from "../campaign-settings-domain.mjs";
import { harness } from "./p4-harness.mjs";

const setup = (role = "player") =>
  harness({
    role,
    areas: [
      ["campaign-settings", settings.register],
      ["loot", loot.register],
      ["inventory-plus", inv.register],
      ["sheet-plus", sheetPlus.register],
    ],
    view: { page: "characters", id: "livia", tab: "inventory" },
  });
const setPotions = (h, value) =>
  h.ctx.commit("regola", (s) => {
    const slice = s.ext[SETTINGS];
    slice.campaigns[s.campaign.id] ??= {};
    slice.campaigns[s.campaign.id].policy = {
      ...(slice.campaigns[s.campaign.id].policy ?? {}),
      potions: value,
    };
  });
const livTurn = (h, patch = {}) =>
  h.ctx.commit("turno", (s) => {
    s.combat.active = true;
    s.combat.turn = 0; // Livia
    Object.assign(s.actors.livia, { action: true, bonus: true }, patch);
  });

test("C7: the SRD Bonus Action by default, the campaign's Action when its rule says so", () => {
  const h = setup();
  assert.equal(ID.potionCost(h.store.state), "bonus");
  setPotions(h, "action");
  assert.equal(policyOf(h.store.state.ext[SETTINGS], "lanterns").potions, "action");
  assert.equal(ID.potionCost(h.store.state), "action");
});

test("C7: beginHealing spends the Action under the house rule and refuses it when spent", () => {
  const actor = {
    hp: 5,
    maxHp: 20,
    action: true,
    bonus: true,
    inventory: [{ id: "p", healing: 7, quantity: 2 }],
  };
  beginHealing(actor, "p", { inCombat: true, canAct: true, cost: "action", mode: "digital" });
  assert.equal(actor.action, false, "the Action is spent");
  assert.equal(actor.bonus, true, "the Bonus Action stays");
  actor.pendingHealing = null;
  assert.throws(
    () => beginHealing(actor, "p", { inCombat: true, canAct: true, cost: "action" }),
    /Action unavailable/,
  );
  // The SRD default still spends the Bonus Action.
  const other = { ...actor, action: true, bonus: true, pendingHealing: null };
  beginHealing(other, "p", { inCombat: true, canAct: true });
  assert.deepEqual([other.action, other.bonus], [true, false]);
});

test("C7: «Bevi» under the house rule says Action and spends the Action at the Table", () => {
  const h = setup();
  setPotions(h, "action");
  livTurn(h);
  usePotion(h.ctx, "livia", "potion");
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.body, /1 pozione \+ azione</);
  assert.match(dialog.body, /regola della campagna/);
  h.submit({ mode: "digital" });
  const livia = h.store.state.actors.livia;
  assert.equal(livia.action, false);
  assert.equal(livia.bonus, true);
  assert.equal(livia.inventory.find((row) => row.id === "potion").quantity, 2);
});

test("C7: a spent resource greys «Bevi» out with its reason (inventory and sheet actions)", () => {
  const h = setup();
  livTurn(h, { bonus: false });
  const block = ID.potionBlock(h.store.state, h.store.state.actors.livia, { quantity: 3 });
  assert.match(block.it, /Azione bonus già spesa/);
  let html = inv.renderTab(h.ctx, h.store.state.actors.livia);
  const button = html.match(/<button[^>]*data-character-action="use-healing"[^>]*>/)[0];
  assert.match(button, /disabled/);
  const describedBy = button.match(/aria-describedby="([^"]+)"/)[1];
  assert.match(html, new RegExp(`id="${describedBy}"[^>]*>[^<]*Azione bonus già spesa`));
  // Under the house rule the Bonus Action does not matter; the Action does.
  setPotions(h, "action");
  html = inv.renderTab(h.ctx, h.store.state.actors.livia);
  assert.doesNotMatch(
    html.match(/<button[^>]*data-character-action="use-healing"[^>]*>/)[0],
    /disabled/,
  );
  livTurn(h, { action: false });
  html = inv.renderTab(h.ctx, h.store.state.actors.livia);
  assert.match(html, /Azione già spesa in questo turno/);
});

test("C7: the sheet lists the potion under the economy of the campaign's rule", () => {
  const h = setup();
  const render = () => sheetPlus._test.renderActions(h.ctx, h.store.state.actors.livia);
  const group = (html, economy) =>
    html.split(`data-shp-economy="${economy}"`)[1]?.split("data-shp-economy=")[0] ?? "";
  assert.match(group(render(), "bonus"), /data-shp-action="item:potion"/);
  setPotions(h, "action");
  const html = render();
  assert.match(group(html, "action"), /data-shp-action="item:potion"/);
  assert.doesNotMatch(group(html, "bonus"), /data-shp-action="item:potion"/);
  assert.match(html, /Azione \(regola della casa\)/);
});
