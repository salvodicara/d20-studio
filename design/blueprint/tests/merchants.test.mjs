// B26 — merchants: SRD prices and selling rule, cart with net total, DM price correction,
// insufficient funds, checkout into the real inventories, buyback and Undo. Real store,
// real registry, the same handlers the bound controls call. Synthetic demo data only.
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
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) => (v && typeof v === "object" ? (v[ctx.lang] ?? v.it) : String(v ?? "")),
    esc,
    icon: () => "",
    toast: (text, error = false) => toasts.push({ text, error }),
    dialog: (title, body, options = {}) => dialogs.push({ title, body, options }),
    render() {},
    navigate(page, params) {
      ctx.navigated = { page, params };
    },
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    canUndo: () => store.history.at(-1)?.controller === ctx.role,
    undoLabel: () => store.history.at(-1)?.label ?? "",
    commit(label, mutator, options = {}) {
      store.commit(label, mutator, ctx.role, { shared: !options.local });
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(ctx.role);
      registry.afterUndo(current, store.state);
    },
  };
  const h = {
    ctx,
    store,
    toasts,
    dialogs,
    get slice() {
      return store.state.ext.loot;
    },
    get tessa() {
      return store.state.ext.loot.merchants.find((m) => m.id === "tessa");
    },
    run: (action, data = {}, fields = null) =>
      shop.handleMerchantAction(ctx, action, data, fields ? form(fields) : null),
    submit: (fields) => dialogs.at(-1).options.onSubmit(form(fields)),
    errors: () => toasts.filter((t) => t.error).map((t) => t.text),
    livia: () => store.state.actors.livia,
    cart: () => shop.cartFor(store.state.ext.loot, "tessa", "livia"),
  };
  return h;
}
// Livia's purse as after the chest split (40 gp 8 sp), recorded through the correction.
function giveLiviaCoins(h) {
  const role = h.ctx.role;
  h.ctx.role = "player";
  stash.openPurseCorrection(h.ctx, "livia");
  h.submit({ gp: 40, sp: 8, reason: "Parte del forziere" });
  h.ctx.role = role;
}
function openShop(h, rate = 50) {
  h.ctx.role = "dm";
  h.run(
    "merchant-save",
    { id: "tessa" },
    { name: "Carro di Tessa", sceneId: "old-watch", open: "on", fundsGp: 60, buyRate: rate },
  );
}

test("SRD baseline: prices from Equipment and magic item values; selling at half cost", () => {
  const h = harness();
  const rope = { name: { it: "Corda", en: "Rope" }, kind: "gear", quantity: 1 };
  assert.equal(shop.sellUnitCp(h.tessa, rope), 50, "1 gp rope sells for 5 sp (SRD half)");
  const ring = stash.itemFromCatalog("srd2024:item:ring-of-protection");
  assert.equal(ring.value, 400000, "Rare magic item: 4,000 GP");
  assert.equal(stash.itemFromCatalog("srd2024:item:potion-of-healing").value, 5000);
  const gem = stash.customItem({ name: "Gemma", valueGp: 50, valuable: true });
  assert.equal(shop.sellUnitCp(h.tessa, gem), 5000, "valuables keep their full value");
  const created = shop.createMerchant(h.store.state, h.slice, "dm", { name: "Nuova bottega" });
  assert.equal(created.buyRate, shop.DEFAULT_BUY_RATE);
  assert.equal(created.buyRate, 50);
  assert.throws(
    () => shop.createMerchant(h.store.state, h.slice, "player", { name: "X" }),
    /Only the DM/,
  );
  assert.match(shop.sellProblem(h.tessa, { ...rope, equipped: true }).it, /Equipaggiato/);
  assert.match(shop.sellProblem(h.tessa, { ...rope, unidentified: true }).it, /Non identificato/);
});

test("DM prepares stock with SRD or DM prices; closed shop refuses players", () => {
  const h = harness("dm");
  h.run("merchant-create", {}, { name: "Armeria di Bruma" });
  const armory = h.slice.merchants.at(-1);
  assert.equal(armory.sceneId, "old-watch");
  h.run(
    "stock-add",
    { id: armory.id },
    { srdId: "srd2024:item:chain-shirt", quantity: 2, priceGp: "" },
  );
  h.run(
    "stock-add",
    { id: armory.id },
    { srdId: "srd2024:item:longsword", quantity: 1, priceGp: 18 },
  );
  const [shirt, sword] = h.slice.merchants.at(-1).stock;
  assert.equal(shirt.priceCp, 5000);
  assert.equal(sword.priceCp, 1800);
  assert.equal(sword.srdPriceCp, 1500);
  assert.match(shop.renderMerchantsPrep(h.ctx), /corretto dal DM/);
  h.run("stock-save", { id: armory.id, stock: shirt.id }, { quantity: 1, priceGp: 45 });
  assert.equal(h.slice.merchants.at(-1).stock[0].priceCp, 4500);
  h.ctx.role = "player";
  h.run("cart-add", { kind: "buy", ref: "tessa-rope" });
  assert.ok(h.errors().length, "closed shop refuses a player's cart");
  assert.equal(shop.merchantsOnScene(h.ctx).length, 0);
  h.run("stock-save", { id: armory.id, stock: shirt.id }, { quantity: 1, priceGp: 1 });
  assert.match(h.errors().at(-1), /Solo il DM/);
});

test("TV-144 cart: insufficient funds block, sale at 80%, net total, DM correction, checkout", () => {
  const h = harness();
  giveLiviaCoins(h);
  openShop(h, 80);
  assert.equal(h.tessa.buyRate, 80);
  h.ctx.role = "player";
  assert.equal(shop.merchantsOnScene(h.ctx).length, 1);
  shop.renderShop(h.ctx); // selects Tessa and Livia as bartering character
  h.run("cart-add", { kind: "buy", ref: "tessa-antitoxin" });
  let totals = shop.cartTotals(h.store.state, h.slice, h.cart());
  assert.equal(totals.finalCp, 5000);
  assert.equal(totals.canCheckout, false);
  assert.match(totals.problems[0].it, /Fondi insufficienti: Livia ha 40 mo · 8 ma, servono 50 mo/);
  assert.match(shop.renderShop(h.ctx), /data-loot="checkout"[^>]*disabled/);
  h.run("checkout", { cart: h.cart().id });
  assert.match(h.errors().at(-1), /Fondi insufficienti/);
  assert.equal(h.livia().currency.gp, 40, "nothing paid");
  // Replace the antitoxin with a healer's kit, and sell the rope at the 80% rate.
  const antitoxin = h.cart().lines[0];
  h.run("cart-line", { cart: h.cart().id, line: antitoxin.id, quantity: 0 });
  assert.equal(h.cart(), null, "an empty cart disappears");
  h.run("cart-add", { kind: "buy", ref: "tessa-healers-kit" });
  h.run("cart-add", { kind: "sell", ref: "rope" });
  totals = shop.cartTotals(h.store.state, h.slice, h.cart());
  assert.equal(totals.buyCp, 500);
  assert.equal(totals.sellCp, 80, "1 gp rope at 80% = 8 sp");
  assert.equal(totals.netCp, 420);
  assert.match(shop.renderShop(h.ctx), /Totale netto: paghi<\/dt><dd data-loot-net>4 mo · 2 ma/);
  // DM haggle: corrected total with a reason; a later cart change voids it.
  h.ctx.role = "dm";
  h.run("cart-override", { cart: h.cart().id });
  h.submit({ direction: "pay", amountGp: 4, reason: "Sconto per la lanterna ritrovata" });
  assert.equal(h.cart().override.finalCp, 400);
  h.ctx.role = "player";
  assert.match(shop.renderShop(h.ctx), /<s>4 mo · 2 ma<\/s> 4 mo/);
  assert.match(
    shop.renderShop(h.ctx),
    /Prezzo corretto dal DM: paghi 4 mo · motivo: Sconto per la lanterna ritrovata/,
  );
  h.run("checkout", { cart: h.cart().id });
  const livia = h.livia();
  assert.deepEqual(livia.currency, { pp: 0, gp: 36, ep: 0, sp: 8, cp: 0 });
  assert.equal(h.tessa.fundsCp, 6400);
  assert.equal(h.tessa.stock.find((s) => s.id === "tessa-healers-kit").quantity, 2);
  const kit = livia.inventory.find((row) => row.srdId === "srd2024:item:healers-kit");
  assert.equal(kit.quantity, 1);
  assert.equal(kit.name.it, "Borsa del guaritore");
  assert.ok(!livia.inventory.some((row) => row.id === "rope"), "rope sold");
  const buyback = h.tessa.buyback[0];
  assert.equal(buyback.priceCp, 80);
  assert.equal(buyback.item.name.en, "Rope");
  assert.match(
    h.slice.ledger.at(-1).text.it,
    /Livia da Carro di Tessa: compra Borsa del guaritore ×1; vende Corda ×1 — paga 4 mo \(prezzo corretto dal DM, era 4 mo · 2 ma\)/,
  );
  assert.equal(h.cart(), null);
});

test("buyback at the sold price; a cart change voids the DM price; Undo restores the trade", () => {
  const h = harness();
  giveLiviaCoins(h);
  openShop(h, 80);
  h.ctx.role = "player";
  shop.renderShop(h.ctx);
  h.run("cart-add", { kind: "sell", ref: "rope" });
  h.run("checkout", { cart: h.cart().id });
  assert.equal(h.livia().currency.sp, 16, "received 8 sp");
  const back = h.tessa.buyback[0];
  h.run("cart-add", { kind: "buyback", ref: back.id });
  h.ctx.role = "dm";
  h.run("cart-override", { cart: h.cart().id });
  h.submit({ direction: "pay", amountGp: 0.5, reason: "Prova" });
  h.ctx.role = "player";
  h.run("cart-add", { kind: "buy", ref: "tessa-rations" });
  assert.equal(h.cart().override, null, "content changed: correction voided");
  const rations = h.cart().lines.find((line) => line.kind === "buy");
  h.run("cart-line", { cart: h.cart().id, line: rations.id, quantity: 0 });
  assert.equal(shop.cartTotals(h.store.state, h.slice, h.cart()).finalCp, 80);
  h.run("checkout", { cart: h.cart().id });
  const rope = h.livia().inventory.find((row) => row.name?.en === "Rope");
  assert.ok(rope, "rope bought back");
  assert.equal(h.tessa.buyback.length, 0);
  assert.equal(h.livia().currency.sp, 8);
  // Undo of the checkout restores purse, inventory, till and buyback together.
  h.ctx.undo();
  assert.equal(h.livia().currency.sp, 16);
  assert.equal(h.tessa.buyback.length, 1);
  assert.ok(!h.livia().inventory.some((row) => row.name?.en === "Rope"));
});

test("merchant till too small blocks checkout; DM sees other open carts", () => {
  const h = harness();
  openShop(h, 80);
  h.run(
    "merchant-save",
    { id: "tessa" },
    { name: "Carro di Tessa", sceneId: "old-watch", open: "on", fundsGp: 10, buyRate: 80 },
  );
  h.ctx.role = "player";
  shop.renderShop(h.ctx);
  h.run("cart-add", { kind: "sell", ref: "potion" });
  const totals = shop.cartTotals(h.store.state, h.slice, h.cart());
  assert.equal(totals.finalCp, -4000, "potion of healing 50 gp at 80%");
  assert.match(totals.problems.at(-1).it, /Il mercante ha solo 10 mo in cassa/);
  h.ctx.role = "dm";
  shop.selectBarterer("mira");
  const dmView = shop.renderShop(h.ctx);
  assert.match(dmView, /Altri carrelli aperti/);
  assert.match(dmView, /Livia/);
  assert.match(dmView, /Chiudi bottega/);
  h.run("merchant-toggle", { id: "tessa" });
  assert.equal(h.tessa.open, false);
  h.ctx.role = "player";
  assert.equal(shop.merchantsOnScene(h.ctx).length, 0, "players no longer see a closed shop");
});

// ---------------------------------------------------------------- review fixes (B26)

test("a merchant with no scene follows the party; the DM is warned about a shop elsewhere", () => {
  const h = harness();
  const save = (patch) =>
    h.run(
      "merchant-save",
      { id: "tessa" },
      { name: "Carro di Tessa", sceneId: "", open: "on", fundsGp: 60, buyRate: 50, ...patch },
    );
  save({});
  assert.equal(h.tessa.sceneId, null);
  h.ctx.role = "player";
  assert.deepEqual(
    shop.merchantsOnScene(h.ctx).map((m) => m.id),
    ["tessa"],
    "no scene: available on every scene, like a parcel with no scene",
  );
  assert.ok(h.ctx.registry.list("table-panel", h.ctx, {}).some((c) => c.id === "loot-shop"));
  // Bound to another scene: players cannot reach it here; the DM sees why and can move it.
  h.ctx.role = "dm";
  h.store.state.scenes.push({
    ...h.store.state.scenes[0],
    id: "market",
    name: "Il mercato",
    tokens: [],
  });
  save({ sceneId: "market" });
  h.ctx.role = "player";
  assert.equal(shop.merchantsOnScene(h.ctx).length, 0);
  h.ctx.role = "dm";
  const dmView = shop.renderShop(h.ctx);
  assert.match(dmView, /Non visibile ai giocatori in questa scena: la bottega è in «Il mercato»/);
  h.run("merchant-here", { id: "tessa" });
  assert.equal(h.tessa.sceneId, "old-watch");
  assert.doesNotMatch(shop.renderShop(h.ctx), /data-loot-elsewhere/);
  h.ctx.role = "player";
  assert.equal(shop.merchantsOnScene(h.ctx).length, 1);
});

test("R20-103 discount: wares show the struck SRD price and the cart charges the discounted one", () => {
  const h = harness();
  giveLiviaCoins(h);
  h.ctx.role = "dm";
  h.run(
    "merchant-save",
    { id: "tessa" },
    {
      name: "Carro di Tessa",
      sceneId: "old-watch",
      open: "on",
      fundsGp: 60,
      buyRate: 50,
      discount: 10,
    },
  );
  assert.equal(h.tessa.discount, 10);
  assert.match(shop.renderMerchantsPrep(h.ctx), /name="discount"[^>]*value="10"/);
  assert.throws(
    () =>
      shop.updateMerchant(h.store.state, h.slice, "dm", "tessa", {
        ...h.tessa,
        fundsGp: 60,
        discount: 120,
      }),
    /discount ranges/,
  );
  h.ctx.role = "player";
  shop.selectBarterer("livia");
  const view = shop.renderShop(h.ctx);
  assert.match(
    view,
    /<s>5 mo<\/s> <span data-loot-price>4 mo · 5 ma<\/span>/,
    "healer's kit 5 gp → 4.5 gp",
  );
  assert.match(view, /sconto <span data-loot-discount>10%/);
  h.run("cart-add", { kind: "buy", ref: "tessa-healers-kit" });
  const totals = shop.cartTotals(h.store.state, h.slice, h.cart());
  assert.equal(totals.buyCp, 450);
  h.run("checkout", { cart: h.cart().id });
  assert.deepEqual(h.livia().currency, { pp: 0, gp: 36, ep: 0, sp: 3, cp: 0 });
  assert.equal(h.tessa.fundsCp, 6450);
});

test("GMG shop on a token: a merchant bound to a creature opens from the token menu", () => {
  const h = harness();
  h.ctx.role = "dm";
  h.run(
    "merchant-save",
    { id: "tessa" },
    {
      name: "Carro di Tessa",
      sceneId: "old-watch",
      open: "",
      fundsGp: 60,
      buyRate: 50,
      actorId: "goblin-2",
    },
  );
  assert.equal(h.tessa.actorId, "goblin-2");
  assert.match(shop.renderShop(h.ctx), /sulla pedina Esploratore/);
  const target = { actorId: "goblin-2", tokenId: "t", sceneId: "old-watch" };
  const entries = () => h.ctx.registry.list("token-menu", h.ctx, target).map((c) => c.id);
  assert.ok(entries().includes("loot-shop-open"), "the DM opens it even while closed");
  h.ctx.role = "player";
  assert.ok(!entries().includes("loot-shop-open"), "closed: not offered to players");
  h.ctx.role = "dm";
  h.run("merchant-toggle", { id: "tessa" });
  h.ctx.role = "player";
  assert.ok(entries().includes("loot-shop-open"));
  assert.throws(
    () =>
      shop.updateMerchant(h.store.state, h.slice, "dm", "tessa", {
        ...h.tessa,
        fundsGp: 60,
        actorId: "livia",
      }),
    /DM creature/,
  );
});

test("cart edits are private to the buyer; the checkout is shared", () => {
  const h = harness();
  giveLiviaCoins(h);
  openShop(h);
  h.ctx.commit = (label, mutator, options = {}) => {
    h.store.commit(label, mutator, h.ctx.role, {
      shared: !options.local,
      visibility: options.visibility,
    });
    return { applied: true, persisted: true };
  };
  h.ctx.role = "player";
  shop.selectBarterer("livia");
  shop.renderShop(h.ctx);
  h.run("cart-add", { kind: "buy", ref: "tessa-rope" });
  h.run("cart-add", { kind: "buy", ref: "tessa-rope" });
  const log = () => h.store.state.log.filter((entry) => entry.kind === "change");
  assert.deepEqual(
    log()
      .slice(-2)
      .map((entry) => entry.visibility),
    ["private", "private"],
  );
  h.run("checkout", { cart: h.cart().id });
  assert.equal(log().at(-1).visibility, "shared");
  assert.match(log().at(-1).label, /Scambio concluso: Livia/);
  // Merchant preparation is DM-only too.
  h.ctx.role = "dm";
  h.run("stock-add", { id: "tessa" }, { srdId: "srd2024:item:torch", quantity: 3, priceGp: "" });
  assert.equal(log().at(-1).visibility, "private");
});

// ---------------------------------------------------------------- review fixes, round 2 (B26)

test("review 2 P1: selling and buying back returns the whole row with its id", () => {
  const h = harness();
  giveLiviaCoins(h);
  openShop(h);
  const rope = h.livia().inventory.find((row) => row.id === "rope");
  rope.knot = { kind: "bowline" }; // another area's data on the row
  h.ctx.role = "player";
  shop.renderShop(h.ctx);
  h.run("cart-add", { kind: "sell", ref: "rope" });
  h.run("checkout", { cart: h.cart().id });
  assert.ok(!h.livia().inventory.some((row) => row.id === "rope"));
  h.run("cart-add", { kind: "buyback", ref: h.tessa.buyback[0].id });
  h.run("checkout", { cart: h.cart().id });
  assert.deepEqual(h.errors(), []);
  const back = h.livia().inventory.find((row) => row.name?.en === "Rope");
  assert.equal(back.id, "rope", "the row keeps its id");
  assert.deepEqual(back.knot, { kind: "bowline" });
  assert.equal(back.description.en, "15 metres, tied to the backpack.");
  assert.equal(back.equipped, false);
});

test("review 2 P2: a purchase never merges into an equipped row", () => {
  const h = harness();
  giveLiviaCoins(h);
  openShop(h);
  h.livia().inventory.push({
    id: "old-shield",
    name: { it: "Scudo", en: "Shield" },
    quantity: 1,
    weight: 3,
    equipped: true,
    kind: "gear",
    srdId: "srd2024:item:shield",
  });
  h.ctx.role = "player";
  shop.renderShop(h.ctx);
  h.run("cart-add", { kind: "buy", ref: "tessa-shield" });
  h.run("checkout", { cart: h.cart().id });
  const shields = h.livia().inventory.filter((row) => row.srdId === "srd2024:item:shield");
  assert.deepEqual(
    shields.map((row) => [row.id === "old-shield", row.quantity, row.equipped]),
    [
      [true, 1, true],
      [false, 1, false],
    ],
  );
  assert.equal(shop.sellProblem(h.tessa, shields[1]), null, "the new shield can be sold");
});

test("review 2 P3: an empty ware price means the SRD price; an empty till is refused", () => {
  const h = harness();
  const kit = () => h.tessa.stock.find((row) => row.id === "tessa-healers-kit");
  h.run("stock-save", { id: "tessa", stock: "tessa-healers-kit" }, { quantity: 3, priceGp: 9 });
  assert.equal(kit().priceCp, 900);
  h.run("stock-save", { id: "tessa", stock: "tessa-healers-kit" }, { quantity: 3, priceGp: "" });
  assert.equal(kit().priceCp, 500, "back to the SRD price, never free");
  assert.deepEqual(h.errors(), []);
  h.run(
    "merchant-save",
    { id: "tessa" },
    { name: "Carro di Tessa", sceneId: "old-watch", fundsGp: "", buyRate: 50 },
  );
  assert.match(h.errors().at(-1), /cassa/);
  assert.equal(h.tessa.fundsCp, 6000);
  const prep = shop.renderMerchantsPrep(h.ctx);
  assert.match(prep, /name="fundsGp"[^>]*required/);
  assert.match(prep, /name="priceGp"[^>]*placeholder="SRD"/);
});

test("review 2 P3: the party stash trades at the shop: sell its items, pay or cash in with its coins (CRP-159)", () => {
  const h = harness();
  openShop(h);
  stash.stashAdd(h.slice, stash.itemFromCatalog("srd2024:item:dagger", { quantity: 2 }), 2);
  const dagger = h.slice.stash.items.find((row) => row.srdId === "srd2024:item:dagger");
  h.ctx.role = "player";
  const html = shop.renderShop(h.ctx);
  assert.match(html, /Scorta del gruppo/);
  assert.match(html, new RegExp(`data-kind="sell-stash" data-ref="${dagger.id}"`));
  h.run("cart-add", { kind: "sell-stash", ref: dagger.id });
  h.run("cart-add", { kind: "buy", ref: "tessa-rations" });
  h.run("cart-pay", { cart: h.cart().id, payFrom: "stash" });
  assert.equal(h.cart().payFrom, "stash");
  const totals = shop.cartTotals(h.store.state, h.slice, h.cart());
  assert.equal(totals.sellCp, 100, "a 2 gp dagger at 50%");
  assert.equal(totals.netCp, -50);
  assert.match(shop.renderShop(h.ctx), /<option value="stash" selected>/);
  const purse = structuredClone(h.livia().currency ?? null);
  h.run("checkout", { cart: h.cart().id });
  assert.deepEqual(h.errors(), []);
  assert.deepEqual(h.slice.stash.coins, { pp: 0, gp: 15, ep: 0, sp: 5, cp: 0 });
  assert.deepEqual(h.livia().currency ?? null, purse, "Livia's purse untouched");
  assert.equal(h.slice.stash.items.find((row) => row.id === dagger.id).quantity, 1);
  assert.ok(h.livia().inventory.some((row) => row.srdId === "srd2024:item:rations"));
  assert.equal(h.tessa.buyback[0].fromStash, true);
  assert.match(h.slice.ledger.at(-1).text.it, /vende Pugnale ×1 \(dalla scorta\)/);
  assert.match(h.slice.ledger.at(-1).text.it, /riceve 5 ma nella scorta del gruppo/);
  // The stash pays only what it holds; an item equipped from the stash is not for sale.
  h.run("cart-add", { kind: "buy", ref: "tessa-potion-of-healing" });
  h.run("cart-pay", { cart: h.cart().id, payFrom: "stash" });
  assert.match(
    shop.cartTotals(h.store.state, h.slice, h.cart()).problems[0].it,
    /Fondi insufficienti: la scorta del gruppo ha 15 mo · 5 ma, servono 50 mo/,
  );
  stash.handleStashAction(h.ctx, "stash-equip", { id: dagger.id }, "livia");
  const equipped = h.slice.stash.items.find((row) => row.equippedBy === "livia");
  assert.ok(shop.sellProblem(h.tessa, equipped));
  h.run("cart-add", { kind: "sell-stash", ref: equipped.id });
  assert.match(h.errors().at(-1), /Equipaggiato/);
});
