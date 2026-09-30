// P4 fixes PR-56 and TV-144 — the shop cart is visible at once after «Compra» (BG3 trade
// screen and D&D Beyond: immediate cart feedback), a player never has a cart hidden from
// them, and the buyer can propose a price backed by a Persuasion roll that the DM accepts
// or refuses (Game Master's Grimoire cart with a DM-edited total). Real store and registry,
// the handlers the bound controls call, clean seed state.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import * as loot from "../loot.mjs";
import * as shop from "../merchants.mjs";
import * as stash from "../party-stash.mjs";

function form(fields = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields))
    for (const entry of [].concat(value)) data.append(key, String(entry));
  return data;
}
function harness(role = "dm") {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry();
  registry.use("loot", loot.register);
  const store = createStore({ storage });
  registry.initState(store.state);
  const toasts = [],
    dialogs = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang: "it",
    registry,
    view: { page: "table" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) => (v && typeof v === "object" ? (v[ctx.lang] ?? v.it) : String(v ?? "")),
    esc,
    icon: () => "",
    toast: (text, error = false) => toasts.push({ text, error }),
    dialog: (title, body, options = {}) => dialogs.push({ title, body, options }),
    render() {},
    navigate() {},
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    canUndo: () => false,
    undoLabel: () => "",
    commit(label, mutator, options = {}) {
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
      });
      return { applied: true, persisted: true };
    },
    undo() {},
  };
  shop.resetMerchantUI();
  return {
    ctx,
    store,
    toasts,
    dialogs,
    registry,
    get slice() {
      return store.state.ext.loot;
    },
    run: (action, data = {}, fields = null) =>
      shop.handleMerchantAction(ctx, action, data, fields ? form(fields) : null),
    submit: (fields) => dialogs.at(-1).options.onSubmit(form(fields)),
    errors: () => toasts.filter((t) => t.error).map((t) => t.text),
    cart: (buyer = "livia") => shop.cartFor(store.state.ext.loot, "tessa", buyer),
  };
}
function openShop(h) {
  const role = h.ctx.role;
  h.ctx.role = "dm";
  h.run(
    "merchant-save",
    { id: "tessa" },
    { name: "Carro di Tessa", sceneId: "old-watch", open: "on", fundsGp: 60, buyRate: 50 },
  );
  h.ctx.role = role;
}
function giveLiviaCoins(h) {
  const role = h.ctx.role;
  h.ctx.role = "player";
  stash.openPurseCorrection(h.ctx, "livia");
  h.submit({ gp: 40, sp: 8, reason: "Parte del forziere" });
  h.ctx.role = role;
}

test("PR-56 cart-add visibility: a player's «Compra» from a clean state shows the cart at once", () => {
  const h = harness("player");
  openShop(h);
  // Before any purchase the summary already holds its place (no layout shift under the
  // pointer on the first «Compra»): an empty cart, nothing to view.
  let html = shop.renderShop(h.ctx);
  assert.match(html, /data-loot-cart-bar[\s\S]*Il carrello è vuoto/);
  assert.doesNotMatch(html, /data-loot="cart-show"/);
  for (let i = 0; i < 3; i++) h.run("cart-add", { kind: "buy", ref: "tessa-rations" });
  assert.deepEqual(h.errors(), [], "no refusal");
  assert.equal(h.cart().lines[0].quantity, 3, "each click adds one, nothing queued elsewhere");
  html = shop.renderShop(h.ctx);
  // The summary bar is at the top of the trade window, not under the fold after two lists.
  const bar = html.indexOf("data-loot-cart-bar");
  assert.ok(bar > -1, "the cart summary bar is rendered");
  assert.ok(bar < html.indexOf('id="loot-wares-title"'), "the bar comes before the wares");
  assert.match(html, /data-loot-cart-bar[^>]*role="status"/, "announced politely");
  assert.match(html, /3 articoli/);
  assert.match(html, /Paghi<\/span> <strong[^>]*>1 mo · 5 ma</);
  assert.match(html, /data-loot="cart-show"[^>]*>Vedi carrello</);
  // The ware row itself says how many are in the cart (BG3 / DDB immediate feedback).
  assert.match(html, /Razioni<\/strong>[\s\S]*?data-loot-in-cart[^>]*>Nel carrello: 3</);
  // «Vedi carrello» is a UI command: it changes no state.
  const before = h.store.history.length;
  h.run("cart-show", {});
  assert.equal(h.store.history.length, before);
  // EN
  h.ctx.lang = "en";
  html = shop.renderShop(h.ctx);
  assert.match(html, /3 items/);
  assert.match(html, />View cart</);
  assert.match(html, />In cart: 3</);
});

test("PR-56: a cart the player opened for another of their characters is never hidden", () => {
  const h = harness("player");
  openShop(h);
  shop.selectBarterer("mira");
  shop.renderShop(h.ctx);
  h.run("cart-add", { kind: "buy", ref: "tessa-rope" });
  assert.equal(h.cart("mira").lines.length, 1);
  shop.selectBarterer("livia");
  const html = shop.renderShop(h.ctx);
  assert.match(html, /Altri carrelli aperti/);
  assert.match(html, /data-loot="barter-show" data-id="mira"/);
});

test("TV-144 haggle: the buyer proposes a price with a Persuasion roll, the DM accepts it", () => {
  const h = harness("player");
  giveLiviaCoins(h);
  openShop(h);
  h.ctx.role = "player";
  shop.selectBarterer("livia");
  shop.renderShop(h.ctx);
  h.run("cart-add", { kind: "buy", ref: "tessa-healers-kit" });
  assert.match(shop.renderShop(h.ctx), /data-loot="cart-offer"[^>]*>Proponi un prezzo</);
  h.run("cart-offer", { cart: h.cart().id });
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.title, /Proponi un prezzo/);
  assert.match(dialog.body, /name="amountGp"/);
  assert.match(dialog.body, /name="roll"/, "optional haggle roll");
  h.submit({ amountGp: 4, note: "Ho già comprato la corda", roll: "persuasion" });
  const offer = h.cart().offer;
  assert.equal(offer.finalCp, 400);
  assert.equal(offer.status, "pending");
  assert.equal(offer.roll.subject, "persuasion");
  assert.ok(Number.isInteger(offer.roll.total), "the roll total is kept with the offer");
  // The player sees it waiting; the list price still applies until the DM answers.
  assert.match(shop.renderShop(h.ctx), /In attesa del DM/);
  assert.equal(shop.cartTotals(h.store.state, h.slice, h.cart()).finalCp, 500);
  // The DM is notified and accepts: the offer becomes the corrected total.
  h.ctx.role = "dm";
  const notes = h.registry.notifications(h.ctx);
  assert.ok(
    notes.some((n) => /Offerta di Livia/.test(n.title?.it ?? n.title)),
    "the DM gets a notification",
  );
  shop.selectBarterer("livia");
  assert.match(shop.renderShop(h.ctx), /data-loot="offer-accept"/);
  h.run("offer-accept", { cart: h.cart().id });
  assert.equal(h.cart().offer, null);
  assert.equal(h.cart().override.finalCp, 400);
  assert.match(h.cart().override.reason, /Offerta accettata/);
  h.ctx.role = "player";
  h.run("checkout", { cart: h.cart().id });
  assert.deepEqual(h.errors(), []);
  assert.equal(h.store.state.actors.livia.currency.gp, 36);
});

test("TV-144 haggle: a refused offer stays visible; any cart change voids the offer", () => {
  const h = harness("player");
  giveLiviaCoins(h);
  openShop(h);
  h.ctx.role = "player";
  shop.selectBarterer("livia");
  shop.renderShop(h.ctx);
  h.run("cart-add", { kind: "buy", ref: "tessa-rope" });
  h.run("cart-offer", { cart: h.cart().id });
  h.submit({ amountGp: 0.5, note: "" });
  assert.equal(h.cart().offer.roll, null, "no roll unless asked");
  h.ctx.role = "dm";
  h.run("offer-refuse", { cart: h.cart().id });
  assert.equal(h.cart().offer.status, "refused");
  h.ctx.role = "player";
  assert.match(shop.renderShop(h.ctx), /Offerta rifiutata/);
  h.run("cart-add", { kind: "buy", ref: "tessa-rope" });
  assert.equal(h.cart().offer, null, "a changed cart voids the offer");
  // Only the DM answers offers.
  h.run("cart-offer", { cart: h.cart().id });
  h.submit({ amountGp: 1 });
  h.run("offer-accept", { cart: h.cart().id });
  assert.match(h.errors().at(-1), /Solo il DM/);
  // A negative or invalid offer is refused.
  assert.throws(
    () =>
      shop.proposeOffer(h.store.state, structuredClone(h.slice), "player", h.cart().id, {
        finalCp: 1.5,
      }),
    /Invalid offer/,
  );
});
