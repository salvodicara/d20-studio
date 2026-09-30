// B26 — merchants: stock, prices, carts, trade and buyback. Patterns: Game Master's
// Grimoire shop token with cart, net "You pay / You receive", GM-edited total and shop
// funds that block checkout (VTL-096); BG3 trade screen with trader and party side by
// side and buyback at the sold price (CRP-159); Roll20 shop sheet (R20-103); Shard shop
// from a list (VTL-097); Roll20 shop "discount" (R20-103); GMG shop on a token (VTL-096).
// The party's inventories trade too (BG3 CRP-159): the party stash (DDB-052) sells its
// items and can pay or cash in with its shared coins. Rules: SRD 5.2.1 "Selling Equipment"
// (half the cost; trade goods and valuables keep their value) EN 89 / IT 101; Magic Item
// Rarities and Values EN 206 / IT 234. Merchants are optional (F-019): nothing else
// depends on them.

import { ITEMS, getById } from "./srd-sample.mjs";
import {
  lootError,
  newId,
  lootSlice,
  attempt,
  commitLoot,
  partyMembers,
  requireControlledMember,
  requireMember,
  itemFromCatalog,
  catalogValueCp,
  sellValueCp,
  giveItemToActor,
  takeItemFromActor,
  purseOf,
  setPurse,
  spendCp,
  coinsFromCp,
  coinsValue,
  formatCp,
  addLedger,
  unidentifiedBadge,
  undoButton,
  ledgerList,
  withFocus,
  requestFocus,
  restoreFocus,
} from "./party-stash.mjs";
import { canControlActor } from "./character-access.mjs";
import { rollProfile, recordRoll, ROLLS } from "./sheet-plus-domain.mjs";
import { rollDie } from "./state.mjs";

// SV-37 (Roll20's errors name the cause and the fix): a command disabled because the whole
// quantity is already in the cart says so beside it (aria-describedby).
const fullId = (kind, id) => `loot-full-${kind}-${String(id).replace(/[^a-z0-9_-]/gi, "-")}`;
const fullNote = (ctx, kind, id) =>
  `<small class="loot-why" id="${fullId(kind, id)}">${ctx.t("Tutta la quantità è già nel carrello: cambiala dal carrello.", "The whole quantity is already in the cart: change it from the cart.")}</small>`;
const L = (it, en) => ({ it, en });
export const DEFAULT_BUY_RATE = 50; // SRD: equipment fetches half its cost when sold

// ---------------------------------------------------------------- domain

function requireDm(role) {
  if (role !== "dm")
    throw lootError(
      "Solo il DM prepara e modifica i mercanti.",
      "Only the DM prepares and edits merchants.",
    );
}
export function merchantById(slice, id) {
  const merchant = slice.merchants.find((entry) => entry.id === id);
  if (!merchant) throw lootError("Mercante non trovato.", "Merchant not found.");
  return merchant;
}
const toCp = (gp) => {
  const value = Math.round(Number(gp) * 100);
  if (!Number.isFinite(value) || value < 0 || value > 1_000_000_000)
    throw lootError("Importo in monete d'oro non valido.", "Invalid gold amount.");
  return value;
};
const cleanName = (name) => {
  const value = String(name ?? "").trim();
  if (!value || value.length > 80)
    throw lootError(
      "Scrivi un nome (massimo 80 caratteri).",
      "Write a name (80 characters at most).",
    );
  return value;
};
export function createMerchant(state, slice, role, { name, sceneId = null }) {
  requireDm(role);
  const merchant = {
    id: newId("merchant"),
    name: cleanName(name),
    sceneId: sceneId && state.scenes.some((scene) => scene.id === sceneId) ? sceneId : null,
    open: false,
    fundsCp: 0,
    buyRate: DEFAULT_BUY_RATE,
    discount: 0,
    actorId: null,
    stock: [],
    buyback: [],
  };
  slice.merchants.push(merchant);
  return merchant;
}
export function updateMerchant(state, slice, role, id, patch) {
  requireDm(role);
  const merchant = merchantById(slice, id);
  const rate = Number(patch.buyRate);
  if (!Number.isInteger(rate) || rate < 0 || rate > 100)
    throw lootError("La percentuale va da 0 a 100.", "The percentage ranges from 0 to 100.");
  if (patch.sceneId && !state.scenes.some((scene) => scene.id === patch.sceneId))
    throw lootError("Scena non trovata.", "Scene not found.");
  // Roll20 shop sheet "discount" (R20-103): a percentage off every ware's price.
  const discount =
    patch.discount == null || patch.discount === ""
      ? (merchant.discount ?? 0)
      : Number(patch.discount);
  if (!Number.isInteger(discount) || discount < 0 || discount > 100)
    throw lootError("Lo sconto va da 0 a 100.", "The discount ranges from 0 to 100.");
  const actorId = patch.actorId === undefined ? (merchant.actorId ?? null) : patch.actorId || null;
  if (actorId && state.actors[actorId]?.kind !== "npc")
    throw lootError("Scegli una creatura del DM.", "Choose a DM creature.");
  // An empty till is a missing value, never "0": the DM writes 0 for an empty till.
  if (patch.fundsGp == null || String(patch.fundsGp).trim() === "")
    throw lootError(
      "Indica la cassa del mercante in mo (0 se è vuota).",
      "Enter the merchant's till in GP (0 if it is empty).",
    );
  Object.assign(merchant, {
    name: cleanName(patch.name),
    sceneId: patch.sceneId || null,
    open: patch.open === true,
    fundsCp: toCp(patch.fundsGp),
    buyRate: rate,
    discount,
    actorId,
  });
  for (const cart of slice.carts.filter((entry) => entry.merchantId === id)) voidPrice(cart);
  return merchant;
}
export function setMerchantOpen(state, slice, role, id, open) {
  requireDm(role);
  merchantById(slice, id).open = !!open;
}
// The DM's Shop drawer offers to bring a merchant from another scene to this one.
export function moveMerchantHere(state, slice, role, id) {
  requireDm(role);
  merchantById(slice, id).sceneId = state.activeSceneId;
}
// A merchant with no scene travels with the party: like a parcel with no scene, it is
// available on every scene.
export const merchantHere = (state, merchant) =>
  !merchant.sceneId || merchant.sceneId === state.activeSceneId;
export const visibleToPlayers = (state, merchant) => merchant.open && merchantHere(state, merchant);
// The price a buyer pays for one unit of a ware, after the merchant's discount.
export const buyUnitCp = (merchant, row) =>
  Math.round((row.priceCp * (100 - (merchant.discount ?? 0))) / 100);
export function deleteMerchant(state, slice, role, id) {
  requireDm(role);
  merchantById(slice, id);
  slice.merchants = slice.merchants.filter((entry) => entry.id !== id);
  slice.carts = slice.carts.filter((entry) => entry.merchantId !== id);
}
export function addStock(state, slice, role, merchantId, { srdId, quantity, priceGp = "" }) {
  requireDm(role);
  const merchant = merchantById(slice, merchantId);
  const entry = getById(srdId);
  if (!entry || entry.kind !== "item")
    throw lootError("Oggetto non presente nel catalogo.", "Item not in the catalog.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999)
    throw lootError("La quantità va da 1 a 999.", "Quantity ranges from 1 to 999.");
  const srdPrice = catalogValueCp(entry);
  const priceCp = priceGp === "" || priceGp == null ? srdPrice : toCp(priceGp);
  if (priceCp == null)
    throw lootError(
      "Questo oggetto non ha un prezzo nel catalogo: indica tu il prezzo.",
      "This item has no catalog price: enter the price yourself.",
    );
  const existing = merchant.stock.find((row) => row.srdId === entry.id);
  if (existing) {
    existing.quantity += quantity;
    if (priceGp !== "" && priceGp != null) existing.priceCp = priceCp;
    return existing;
  }
  const row = {
    id: newId("stock"),
    srdId: entry.id,
    name: { ...entry.name },
    quantity,
    priceCp,
    srdPriceCp: srdPrice,
  };
  merchant.stock.push(row);
  return row;
}
export function updateStock(state, slice, role, merchantId, stockId, { quantity, priceGp }) {
  requireDm(role);
  const row = merchantById(slice, merchantId).stock.find((entry) => entry.id === stockId);
  if (!row) throw lootError("Merce non trovata.", "Ware not found.");
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 999)
    throw lootError("La quantità va da 0 a 999.", "Quantity ranges from 0 to 999.");
  // As when adding a ware: an empty price is the SRD price, never "free".
  const empty = priceGp == null || String(priceGp).trim() === "";
  if (empty && row.srdPriceCp == null)
    throw lootError(
      "Questa merce non ha un prezzo nel catalogo: indica tu il prezzo.",
      "This ware has no catalog price: enter the price yourself.",
    );
  row.quantity = quantity;
  row.priceCp = empty ? row.srdPriceCp : toCp(priceGp);
  for (const cart of slice.carts.filter((entry) => entry.merchantId === merchantId))
    voidPrice(cart);
}
export function removeStock(state, slice, role, merchantId, stockId) {
  requireDm(role);
  const merchant = merchantById(slice, merchantId);
  merchant.stock = merchant.stock.filter((row) => row.id !== stockId);
  for (const cart of slice.carts.filter((entry) => entry.merchantId === merchantId)) {
    cart.lines = cart.lines.filter((line) => !(line.kind === "buy" && line.ref === stockId));
    voidPrice(cart);
  }
}

// What the merchant pays for one unit: the item's value at the merchant's rate, full
// value for trade goods and valuables (SRD "Selling Equipment").
export function sellUnitCp(merchant, row) {
  const value = sellValueCp(row);
  if (value === null) return null;
  const rate = row.category === "valuable" ? 100 : merchant.buyRate;
  return Math.floor((value * rate) / 100);
}
export function cartFor(slice, merchantId, buyerId) {
  return (
    slice.carts.find((cart) => cart.merchantId === merchantId && cart.buyerId === buyerId) ?? null
  );
}
function ensureCart(state, slice, role, merchantId, buyerId) {
  requireMember(state, role);
  const merchant = merchantById(slice, merchantId);
  if (!merchant.open && role !== "dm")
    throw lootError("La bottega è chiusa.", "The shop is closed.");
  requireControlledMember(state, role, buyerId);
  let cart = cartFor(slice, merchantId, buyerId);
  if (!cart) {
    cart = { id: newId("cart"), merchantId, buyerId, lines: [], override: null };
    slice.carts.push(cart);
  }
  return cart;
}
// A changed cart or price list voids the agreed price: the DM's correction and the buyer's
// offer both referred to the previous content (INV-08, GMG cart).
function voidPrice(cart) {
  cart.override = null;
  cart.offer = null;
}
// Adds one unit (or `quantity`) to the cart. Any change voids a DM price correction:
// the corrected total referred to the previous content (INV-08).
// Line kinds: a ware to buy, an inventory row or a party stash row to sell (BG3's trade
// screen lists the party's inventories, CRP-159; the stash is the party inventory,
// DDB-052), or a sold item to buy back.
const LINE_KINDS = ["buy", "sell", "sell-stash", "buyback"];
const isSale = (kind) => kind === "sell" || kind === "sell-stash";
export function addToCart(state, slice, role, { merchantId, buyerId, kind, ref, quantity = 1 }) {
  if (!LINE_KINDS.includes(kind)) throw lootError("Riga non valida.", "Invalid line.");
  const cart = ensureCart(state, slice, role, merchantId, buyerId);
  const merchant = merchantById(slice, merchantId);
  if (isSale(kind)) {
    const row =
      kind === "sell"
        ? state.actors[buyerId].inventory?.find((entry) => entry.id === ref)
        : slice.stash.items.find((entry) => entry.id === ref);
    if (!row)
      throw kind === "sell"
        ? lootError("Oggetto non trovato nell'inventario.", "Item not found in the inventory.")
        : lootError("L'oggetto non è più nella scorta.", "The item is no longer in the stash.");
    const reason = sellProblem(merchant, row);
    if (reason) throw lootError(reason.it, reason.en);
  }
  const line = cart.lines.find((entry) => entry.kind === kind && entry.ref === ref);
  if (line) line.quantity += quantity;
  else cart.lines.push({ id: newId("line"), kind, ref, quantity });
  voidPrice(cart);
  return cart;
}
export function setCartLine(state, slice, role, cartId, lineId, quantity) {
  requireMember(state, role);
  const cart = slice.carts.find((entry) => entry.id === cartId);
  if (!cart) throw lootError("Carrello non trovato.", "Cart not found.");
  requireControlledMember(state, role, cart.buyerId);
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 999)
    throw lootError("Quantità non valida.", "Invalid quantity.");
  const line = cart.lines.find((entry) => entry.id === lineId);
  if (!line) throw lootError("Riga non trovata.", "Line not found.");
  if (quantity === 0) cart.lines = cart.lines.filter((entry) => entry !== line);
  else line.quantity = quantity;
  voidPrice(cart);
  if (!cart.lines.length) slice.carts = slice.carts.filter((entry) => entry !== cart);
}
// Where the trade's coins come from and go to: the bartering character's purse or the
// party stash's shared coins (any party member may already take those, DDB-052).
export const PAY_SOURCES = Object.freeze(["purse", "stash"]);
export function setCartPayment(state, slice, role, cartId, payFrom) {
  requireMember(state, role);
  const cart = slice.carts.find((entry) => entry.id === cartId);
  if (!cart) throw lootError("Carrello non trovato.", "Cart not found.");
  requireControlledMember(state, role, cart.buyerId);
  if (!PAY_SOURCES.includes(payFrom))
    throw lootError("Scegli con quali monete pagare.", "Choose which coins pay.");
  cart.payFrom = payFrom;
}
export function clearCart(state, slice, role, cartId) {
  requireMember(state, role);
  const cart = slice.carts.find((entry) => entry.id === cartId);
  if (!cart) return;
  requireControlledMember(state, role, cart.buyerId);
  slice.carts = slice.carts.filter((entry) => entry !== cart);
}
export function sellProblem(merchant, row) {
  if (row.equipped)
    return L("Equipaggiato: riponilo prima di venderlo.", "Equipped: unequip it before selling.");
  if (row.equippedBy)
    return L(
      "Equipaggiato dalla scorta: va riposto prima di venderlo.",
      "Equipped from the stash: it must be unequipped before selling.",
    );
  if (row.location === "ground") return L("È a terra.", "It is on the ground.");
  if (row.unidentified || row.identified === false)
    return L("Non identificato: valore sconosciuto.", "Unidentified: value unknown.");
  if (sellUnitCp(merchant, row) === null)
    return L(
      "Valore non noto: non ha un prezzo di vendita.",
      "Value unknown: it has no selling price.",
    );
  return null;
}
// Totals with the lines' availability rechecked against current state.
export function cartTotals(state, slice, cart) {
  const merchant = slice.merchants.find((entry) => entry.id === cart.merchantId);
  const buyer = state.actors[cart.buyerId];
  const problems = [];
  let buyCp = 0,
    sellCp = 0;
  const lines = cart.lines.map((line) => {
    let unitCp = null,
      name = L("—", "—"),
      available = 0,
      problem = null;
    if (!merchant) problem = L("Mercante non disponibile.", "Merchant unavailable.");
    else if (line.kind === "buy") {
      const row = merchant.stock.find((entry) => entry.id === line.ref);
      if (row) {
        ({ name, quantity: available } = row);
        unitCp = buyUnitCp(merchant, row);
      } else problem = L("Merce non più in vendita.", "Ware no longer for sale.");
    } else if (line.kind === "buyback") {
      const row = merchant.buyback.find((entry) => entry.id === line.ref);
      if (row) {
        name = row.item.name;
        unitCp = row.priceCp;
        available = row.quantity;
      } else problem = L("Non più riacquistabile.", "No longer available to buy back.");
    } else {
      const row =
        line.kind === "sell-stash"
          ? slice.stash?.items?.find((entry) => entry.id === line.ref)
          : buyer?.inventory?.find((entry) => entry.id === line.ref);
      if (row) {
        name = row.name;
        available = row.quantity;
        problem = sellProblem(merchant, row);
        unitCp = problem ? null : sellUnitCp(merchant, row);
      } else
        problem =
          line.kind === "sell-stash"
            ? L("Non è più nella scorta.", "No longer in the stash.")
            : L("Non è più nell'inventario.", "No longer in the inventory.");
    }
    if (!problem && line.quantity > available)
      problem = L(`Disponibili solo ${available}.`, `Only ${available} available.`);
    if (problem) problems.push(problem);
    const totalCp = unitCp === null ? 0 : unitCp * line.quantity;
    if (isSale(line.kind)) sellCp += totalCp;
    else buyCp += totalCp;
    return { ...line, name, unitCp, totalCp, available, problem };
  });
  const netCp = buyCp - sellCp; // positive: the buyer pays; negative: the merchant pays
  const finalCp = cart.override ? cart.override.finalCp : netCp;
  if (merchant && !merchant.open) problems.push(L("La bottega è chiusa.", "The shop is closed."));
  if (!lines.length) problems.push(L("Il carrello è vuoto.", "The cart is empty."));
  const payFrom = cart.payFrom === "stash" ? "stash" : "purse";
  const walletCp =
    payFrom === "stash" ? coinsValue(slice.stash?.coins) : buyer ? coinsValue(purseOf(buyer)) : 0;
  if (finalCp > 0 && walletCp < finalCp)
    problems.push(
      payFrom === "stash"
        ? L(
            `Fondi insufficienti: la scorta del gruppo ha ${formatCp(walletCp, "it")}, servono ${formatCp(finalCp, "it")}.`,
            `Insufficient funds: the party stash has ${formatCp(walletCp, "en")}, needs ${formatCp(finalCp, "en")}.`,
          )
        : L(
            `Fondi insufficienti: ${buyer?.name ?? "—"} ha ${formatCp(walletCp, "it")}, servono ${formatCp(finalCp, "it")}.`,
            `Insufficient funds: ${buyer?.name ?? "—"} has ${formatCp(walletCp, "en")}, needs ${formatCp(finalCp, "en")}.`,
          ),
    );
  if (merchant && finalCp < 0 && merchant.fundsCp < -finalCp)
    problems.push(
      L(
        `Il mercante ha solo ${formatCp(merchant.fundsCp, "it")} in cassa.`,
        `The merchant has only ${formatCp(merchant.fundsCp, "en")} in the till.`,
      ),
    );
  return {
    lines,
    buyCp,
    sellCp,
    netCp,
    finalCp,
    override: cart.override,
    payFrom,
    walletCp,
    problems,
    canCheckout: !problems.length,
  };
}
// The DM's haggle: a corrected total with a reason (GMG "edit the selling total").
export function overrideCartTotal(state, slice, role, cartId, finalCp, reason) {
  requireDm(role);
  const cart = slice.carts.find((entry) => entry.id === cartId);
  if (!cart) throw lootError("Carrello non trovato.", "Cart not found.");
  if (finalCp === null) {
    cart.override = null;
    return;
  }
  if (!Number.isInteger(finalCp) || Math.abs(finalCp) > 1_000_000_000)
    throw lootError("Totale non valido.", "Invalid total.");
  const why = String(reason ?? "").trim();
  if (!why)
    throw lootError("Scrivi il motivo della correzione.", "Write the reason for the correction.");
  const { netCp } = cartTotals(state, slice, { ...cart, override: null });
  cart.override = { finalCp, reason: why, baseCp: netCp, by: role };
  // The DM's own figure answers any offer still waiting.
  cart.offer = null;
}
// The buyer's haggle (TV-144; BG3 trade, GMG cart with a DM-edited price): a proposed
// total, optionally backed by a Charisma check the buyer rolled. The list price applies
// until the DM accepts it (it becomes the corrected total) or refuses it.
export const HAGGLE_SKILLS = Object.freeze(["persuasion", "deception", "intimidation"]);
function cartById(slice, cartId) {
  const cart = slice.carts.find((entry) => entry.id === cartId);
  if (!cart) throw lootError("Carrello non trovato.", "Cart not found.");
  return cart;
}
export function proposeOffer(state, slice, role, cartId, { finalCp, note = "", roll = null }) {
  requireMember(state, role);
  const cart = cartById(slice, cartId);
  requireControlledMember(state, role, cart.buyerId);
  if (!Number.isInteger(finalCp) || Math.abs(finalCp) > 1_000_000_000)
    throw lootError("Offerta non valida.", "Invalid offer.");
  if (!cart.lines.length) throw lootError("Il carrello è vuoto.", "The cart is empty.");
  cart.offer = {
    finalCp,
    note: String(note ?? "")
      .trim()
      .slice(0, 200),
    roll: roll
      ? {
          subject: roll.subject,
          label: roll.label,
          total: roll.total,
          natural: roll.natural ?? null,
          mode: roll.mode ?? "digital",
        }
      : null,
    by: role,
    status: "pending",
  };
  return cart.offer;
}
export function answerOffer(state, slice, role, cartId, accept, reason) {
  requireDm(role);
  const cart = cartById(slice, cartId);
  if (cart.offer?.status !== "pending")
    throw lootError("Nessuna offerta in attesa.", "No pending offer.");
  if (!accept) {
    cart.offer.status = "refused";
    return cart;
  }
  overrideCartTotal(state, slice, role, cartId, cart.offer.finalCp, reason);
  return cart;
}
// Pending offers the DM has to answer.
export const pendingOffers = (slice) =>
  (slice?.carts ?? []).filter((cart) => cart.offer?.status === "pending");
export function checkout(state, slice, role, cartId) {
  requireMember(state, role);
  const cart = slice.carts.find((entry) => entry.id === cartId);
  if (!cart) throw lootError("Carrello non trovato.", "Cart not found.");
  const buyer = requireControlledMember(state, role, cart.buyerId);
  const merchant = merchantById(slice, cart.merchantId);
  const totals = cartTotals(state, slice, cart);
  if (!totals.canCheckout) {
    const problem = totals.problems[0];
    throw lootError(problem.it, problem.en);
  }
  const fromStash = totals.payFrom === "stash";
  const purse = fromStash ? { ...slice.stash.coins } : purseOf(buyer);
  if (totals.finalCp > 0) {
    spendCp(purse, totals.finalCp);
    merchant.fundsCp += totals.finalCp;
  } else if (totals.finalCp < 0) {
    merchant.fundsCp -= -totals.finalCp;
    const received = coinsFromCp(-totals.finalCp);
    for (const id of Object.keys(received)) purse[id] = (purse[id] ?? 0) + received[id];
  }
  if (fromStash) slice.stash.coins = purse;
  else setPurse(slice, role, buyer, purse);
  const bought = [],
    sold = [];
  for (const line of totals.lines) {
    if (line.kind === "buy") {
      const row = merchant.stock.find((entry) => entry.id === line.ref);
      row.quantity -= line.quantity;
      giveItemToActor(
        buyer,
        itemFromCatalog(row.srdId, { quantity: line.quantity }),
        line.quantity,
      );
      bought.push(line);
    } else if (line.kind === "buyback") {
      const row = merchant.buyback.find((entry) => entry.id === line.ref);
      row.quantity -= line.quantity;
      giveItemToActor(buyer, { ...row.item, quantity: line.quantity }, line.quantity);
      if (row.quantity === 0) merchant.buyback = merchant.buyback.filter((entry) => entry !== row);
      bought.push(line);
    } else if (line.kind === "sell-stash") {
      // The stash row leaves the party inventory whole (minus stash bookkeeping).
      const row = slice.stash.items.find((entry) => entry.id === line.ref);
      row.quantity -= line.quantity;
      if (row.quantity === 0)
        slice.stash.items = slice.stash.items.filter((entry) => entry !== row);
      const { id: _stash, equippedBy: _by, ...rest } = row;
      merchant.buyback.push({
        id: newId("buyback"),
        item: { ...structuredClone(rest), id: newId("item"), quantity: line.quantity },
        quantity: line.quantity,
        priceCp: line.unitCp,
        soldBy: buyer.id,
        fromStash: true,
      });
      sold.push(line);
    } else {
      const item = takeItemFromActor(buyer, line.ref, line.quantity);
      merchant.buyback.push({
        id: newId("buyback"),
        item,
        quantity: line.quantity,
        priceCp: line.unitCp,
        soldBy: buyer.id,
      });
      sold.push(line);
    }
  }
  const list = (lines, lang) =>
    lines
      .map(
        (line) =>
          `${line.name[lang] ?? line.name.it} ×${line.quantity}${line.kind === "sell-stash" ? (lang === "it" ? " (dalla scorta)" : " (from the stash)") : ""}`,
      )
      .join(", ");
  const wallet = (lang) =>
    fromStash ? (lang === "it" ? " dalla scorta del gruppo" : " from the party stash") : "";
  const into = (lang) =>
    fromStash ? (lang === "it" ? " nella scorta del gruppo" : " into the party stash") : "";
  const pay = (lang) =>
    totals.finalCp > 0
      ? `${lang === "it" ? "paga" : "pays"} ${formatCp(totals.finalCp, lang)}${wallet(lang)}`
      : totals.finalCp < 0
        ? `${lang === "it" ? "riceve" : "receives"} ${formatCp(-totals.finalCp, lang)}${into(lang)}`
        : lang === "it"
          ? "pari"
          : "even";
  addLedger(slice, {
    kind: "trade",
    by: role,
    actorIds: [buyer.id],
    merchantId: merchant.id,
    reason: totals.override?.reason,
    text: L(
      `${buyer.name} da ${merchant.name}: ${bought.length ? "compra " + list(bought, "it") : ""}${bought.length && sold.length ? "; " : ""}${sold.length ? "vende " + list(sold, "it") : ""} — ${pay("it")}${totals.override ? ` (prezzo corretto dal DM, era ${formatCp(Math.abs(totals.override.baseCp), "it")})` : ""}`,
      `${buyer.name} at ${merchant.name}: ${bought.length ? "buys " + list(bought, "en") : ""}${bought.length && sold.length ? "; " : ""}${sold.length ? "sells " + list(sold, "en") : ""} — ${pay("en")}${totals.override ? ` (DM-corrected price, was ${formatCp(Math.abs(totals.override.baseCp), "en")})` : ""}`,
    ),
  });
  slice.carts = slice.carts.filter((entry) => entry !== cart);
  return totals;
}

// ---------------------------------------------------------------- UI state

const ui = { prepId: null, shopId: null, barterId: null };
export function resetMerchantUI() {
  ui.prepId = null;
  ui.shopId = null;
  ui.barterId = null;
}
const money = (ctx, cp) => ctx.esc(formatCp(cp, ctx.lang));
const gpValue = (cp) => (cp == null ? "" : String(cp / 100));
function catalogOptions(ctx, selected = "") {
  const groups = [
    ["weapon", L("Armi", "Weapons")],
    ["armor", L("Armature", "Armor")],
    ["gear", L("Equipaggiamento d'avventura", "Adventuring gear")],
    ["tool", L("Strumenti", "Tools")],
    ["magic-item", L("Oggetti magici", "Magic items")],
  ];
  return groups
    .map(
      ([category, title]) =>
        `<optgroup label="${ctx.esc(ctx.label(title))}">${ITEMS.filter(
          (entry) => entry.category === category,
        )
          .map((entry) => {
            const price = catalogValueCp(entry);
            return `<option value="${ctx.esc(entry.id)}"${entry.id === selected ? " selected" : ""}>${ctx.esc(ctx.label(entry.name))}${price == null ? "" : " · " + money(ctx, price)}</option>`;
          })
          .join("")}</optgroup>`,
    )
    .join("");
}
export { catalogOptions };
const sceneName = (ctx, id) =>
  ctx.state.scenes.find((scene) => scene.id === id)?.name ?? ctx.t("Nessuna scena", "No scene");

// ---------------------------------------------------------------- Preparation: merchants

export function renderMerchantsPrep(ctx) {
  const slice = lootSlice(ctx.state);
  const merchants = slice.merchants;
  if (!merchants.some((entry) => entry.id === ui.prepId)) ui.prepId = merchants[0]?.id ?? null;
  const current = merchants.find((entry) => entry.id === ui.prepId) ?? null;
  return `<div class="loot-prep"><div class="loot-prep-intro"><p class="muted">${ctx.t("Mercanti facoltativi: assortimento, prezzi, cassa e percentuale pagata per le merci. Aprili al Tavolo quando il gruppo arriva.", "Optional merchants: stock, prices, till and the rate paid for goods. Open them at the Table when the party arrives.")}</p></div><div class="loot-prep-layout"><nav class="loot-prep-list" aria-label="${ctx.t("Mercanti", "Merchants")}">${merchants
    .map(
      (merchant) =>
        `<button type="button" class="loot-prep-pick ${merchant.id === ui.prepId ? "active" : ""}" data-loot="merchant-pick" data-id="${ctx.esc(merchant.id)}" aria-current="${merchant.id === ui.prepId}"><strong>${ctx.esc(merchant.name)}</strong><small>${ctx.esc(sceneName(ctx, merchant.sceneId))} · ${merchant.open ? ctx.t("Aperto", "Open") : ctx.t("Chiuso", "Closed")} · ${merchant.stock.length} ${ctx.t("merci", "wares")}</small></button>`,
    )
    .join(
      "",
    )}<form class="loot-inline-form" data-loot-form="merchant-create"><label class="field"><span>${ctx.t("Nuovo mercante", "New merchant")}</span><input name="name" required maxlength="80" placeholder="${ctx.t("Nome della bottega", "Shop name")}"></label><button class="button" type="submit">${ctx.icon("plus")} ${ctx.t("Crea", "Create")}</button></form></nav>${current ? merchantEditor(ctx, current) : `<p class="empty-state">${ctx.t("Nessun mercante. Creane uno solo se serve: si può anche scambiare senza negozio.", "No merchants. Create one only if needed: trades also work without a shop.")}</p>`}</div></div>`;
}
function merchantEditor(ctx, merchant) {
  return `<section class="panel loot-panel loot-merchant-editor" aria-labelledby="loot-merchant-title"><div class="section-heading"><h2 id="loot-merchant-title" tabindex="-1">${ctx.esc(merchant.name)}</h2><button type="button" class="button danger" data-loot="merchant-delete" data-id="${ctx.esc(merchant.id)}">${ctx.t("Elimina mercante", "Delete merchant")}</button></div><form class="loot-form-grid" data-loot-form="merchant-save" data-id="${ctx.esc(merchant.id)}"><label class="field"><span>${ctx.t("Nome", "Name")}</span><input name="name" required maxlength="80" value="${ctx.esc(merchant.name)}"></label><label class="field"><span>${ctx.t("Scena", "Scene")}</span><select name="sceneId"><option value="">${ctx.t("Nessuna scena", "No scene")}</option>${ctx.state.scenes
    .map(
      (scene) =>
        `<option value="${ctx.esc(scene.id)}"${scene.id === merchant.sceneId ? " selected" : ""}>${ctx.esc(scene.name)}</option>`,
    )
    .join(
      "",
    )}</select></label><label class="field"><span>${ctx.t("Cassa del mercante (mo)", "Merchant till (GP)")}</span><input type="number" name="fundsGp" min="0" step="0.01" inputmode="decimal" required value="${gpValue(merchant.fundsCp)}"></label><label class="field"><span>${ctx.t("Paga le merci al (%)", "Pays for goods at (%)")}</span><input type="number" name="buyRate" min="0" max="100" step="1" inputmode="numeric" value="${merchant.buyRate}" aria-describedby="loot-rate-note"></label><label class="field"><span>${ctx.t("Sconto sulle merci (%)", "Discount on wares (%)")}</span><input type="number" name="discount" min="0" max="100" step="1" inputmode="numeric" value="${merchant.discount ?? 0}"></label><label class="field"><span>${ctx.t("Sulla pedina (facoltativo)", "On a token (optional)")}</span><select name="actorId" aria-describedby="loot-token-note"><option value="">${ctx.t("Nessuna", "None")}</option>${Object.values(
    ctx.state.actors,
  )
    .filter((actor) => actor.kind === "npc")
    .map(
      (actor) =>
        `<option value="${ctx.esc(actor.id)}"${actor.id === merchant.actorId ? " selected" : ""}>${ctx.esc(actor.name)}</option>`,
    )
    .join(
      "",
    )}</select></label><label class="loot-check loot-open-toggle"><input type="checkbox" name="open"${merchant.open ? " checked" : ""}> ${ctx.t("Bottega aperta ai giocatori", "Shop open to players")}</label><p class="muted loot-note" id="loot-rate-note">${ctx.t("SRD 5.2.1: l'equipaggiamento si rivende a metà del prezzo (50%); merci e oggetti di valore mantengono il loro valore. Una percentuale diversa è una scelta del DM per questo mercante.", "SRD 5.2.1: equipment sells for half its cost (50%); trade goods and valuables keep their value. A different rate is the DM's choice for this merchant.")}</p><p class="muted loot-note" id="loot-token-note">${ctx.t("Senza scena la bottega segue il gruppo in ogni scena. Sulla pedina: la voce «Bottega» del menu della pedina apre il negozio.", "With no scene the shop follows the party to every scene. On a token: the token menu's “Shop” entry opens the shop.")}</p><button class="button primary" type="submit">${ctx.t("Salva mercante", "Save merchant")}</button></form><h3>${ctx.t("Merci", "Wares")}</h3>${
    merchant.stock.length
      ? `<ul class="loot-list">${merchant.stock
          .map(
            (row) =>
              `<li class="loot-row"><div class="loot-row-copy"><strong>${ctx.esc(ctx.label(row.name))}</strong><small>${row.srdPriceCp == null ? ctx.t("Prezzo del DM", "DM price") : ctx.t("Prezzo SRD", "SRD price") + ": " + money(ctx, row.srdPriceCp)}${row.srdPriceCp != null && row.priceCp !== row.srdPriceCp ? " · " + ctx.t("corretto dal DM", "set by the DM") : ""}</small></div><form class="loot-inline-form loot-stock-form" data-loot-form="stock-save" data-id="${ctx.esc(merchant.id)}" data-stock="${ctx.esc(row.id)}"><label class="field loot-qty"><span>${ctx.t("Prezzo (mo)", "Price (GP)")}</span><input type="number" name="priceGp" min="0" step="0.01" inputmode="decimal" value="${gpValue(row.priceCp)}"${row.srdPriceCp == null ? " required" : ' placeholder="SRD"'}></label><label class="field loot-qty"><span>${ctx.t("Quantità", "Quantity")}</span><input type="number" name="quantity" min="0" max="999" step="1" inputmode="numeric" value="${row.quantity}"></label><button class="button" type="submit">${ctx.t("Salva", "Save")}</button><button class="button quiet" type="button" data-loot="stock-remove" data-id="${ctx.esc(merchant.id)}" data-stock="${ctx.esc(row.id)}">${ctx.t("Rimuovi", "Remove")}</button></form></li>`,
          )
          .join("")}</ul>`
      : `<p class="muted">${ctx.t("Nessuna merce.", "No wares.")}</p>`
  }<form class="loot-inline-form loot-add-form" data-loot-form="stock-add" data-id="${ctx.esc(merchant.id)}"><label class="field loot-grow"><span>${ctx.t("Aggiungi dal catalogo SRD", "Add from the SRD catalog")}</span><select name="srdId">${catalogOptions(ctx)}</select></label><label class="field loot-qty"><span>${ctx.t("Quantità", "Quantity")}</span><input type="number" name="quantity" min="1" max="999" step="1" value="1" inputmode="numeric"></label><label class="field loot-qty"><span>${ctx.t("Prezzo (mo, facoltativo)", "Price (GP, optional)")}</span><input type="number" name="priceGp" min="0" step="0.01" inputmode="decimal" placeholder="SRD"></label><button class="button" type="submit">${ctx.icon("plus")} ${ctx.t("Aggiungi alle merci", "Add to wares")}</button></form>${
    merchant.buyback.length
      ? `<h3>${ctx.t("Riacquistabili", "Buyback")}</h3><ul class="loot-list">${merchant.buyback
          .map(
            (row) =>
              `<li class="loot-row"><div class="loot-row-copy"><strong>${ctx.esc(ctx.label(row.item.name))}</strong> <span class="muted">×${row.quantity} · ${money(ctx, row.priceCp)} · ${ctx.t("venduto da", "sold by")} ${ctx.esc(ctx.state.actors[row.soldBy]?.name ?? "—")}${row.fromStash ? " " + ctx.t("(dalla scorta)", "(from the stash)") : ""}</span></div></li>`,
          )
          .join("")}</ul>`
      : ""
  }</section>`;
}
export function bindMerchantsPrep(el, ctx) {
  bindActions(el, ctx);
}

// ---------------------------------------------------------------- Table: trade window

// Players see open merchants on the active scene (or with no scene). The DM sees every
// merchant, those the players can reach here first, and a warning on the others.
export function merchantsOnScene(ctx) {
  const slice = lootSlice(ctx.state);
  if (!slice) return [];
  if (ctx.role !== "dm")
    return slice.merchants.filter((merchant) => visibleToPlayers(ctx.state, merchant));
  const rank = (merchant) =>
    visibleToPlayers(ctx.state, merchant) ? 0 : merchantHere(ctx.state, merchant) ? 1 : 2;
  return [...slice.merchants].sort((a, b) => rank(a) - rank(b));
}
function barterers(ctx) {
  return partyMembers(ctx.state).filter((actor) => canControlActor(actor, ctx.role, ctx.state));
}
// The cart's running balance stays in view at the top of the trade window (BG3 trade
// screen; D&D Beyond's immediate cart): every «Compra» shows its effect at once, even
// in the Table's narrow column where the cart itself is far below.
function cartBar(ctx, totals) {
  const count = totals ? totals.lines.reduce((sum, line) => sum + line.quantity, 0) : 0;
  const what = !count
    ? ctx.t("Il carrello è vuoto", "The cart is empty")
    : count === 1
      ? ctx.t("1 articolo", "1 item")
      : ctx.t(`${count} articoli`, `${count} items`);
  const balance = count
    ? ` · <span>${totals.finalCp >= 0 ? ctx.t("Paghi", "You pay") : ctx.t("Ricevi", "You receive")}</span> <strong data-loot-cart-bar-total>${money(ctx, Math.abs(totals.finalCp))}</strong>`
    : "";
  return `<div class="loot-cart-bar${count ? " has-items" : ""}" data-loot-cart-bar role="status"><p><span class="loot-cart-bar-label">${ctx.icon("bag")} ${ctx.t("Carrello", "Cart")}:</span> <span data-loot-cart-count>${what}</span>${balance}</p>${count ? `<button type="button" class="button${totals.canCheckout ? " primary" : ""}" data-loot="cart-show">${ctx.t("Vedi carrello", "View cart")}</button>` : ""}</div>`;
}
// The buyer's offer, as the buyer and the DM see it.
function offerHtml(ctx, cart) {
  const offer = cart.offer;
  if (!offer) return "";
  const amount = `${offer.finalCp >= 0 ? ctx.t("paghi", "you pay") : ctx.t("ricevi", "you receive")} ${money(ctx, Math.abs(offer.finalCp))}`;
  const roll = offer.roll
    ? ` · ${ctx.esc(ctx.label(offer.roll.label))}: <strong>${offer.roll.total}</strong>`
    : "";
  const note = offer.note ? ` · «${ctx.esc(offer.note)}»` : "";
  if (offer.status === "refused")
    return `<p class="loot-offer is-refused" data-loot-offer>${ctx.t("Offerta rifiutata dal DM", "Offer refused by the DM")} (${amount}). ${ctx.t("Vale il prezzo pieno; puoi proporre un altro prezzo.", "The full price applies; you can propose another price.")}</p>`;
  return `<div class="loot-offer" data-loot-offer><p><strong>${ctx.t("Offerta", "Offer")}</strong>: ${amount}${roll}${note} · ${ctx.role === "dm" ? ctx.t("da accettare o rifiutare", "to accept or refuse") : ctx.t("In attesa del DM", "Waiting for the DM")}</p>${
    ctx.role === "dm"
      ? `<div class="toolbar"><button type="button" class="button primary" data-loot="offer-accept" data-cart="${ctx.esc(cart.id)}">${ctx.t("Accetta offerta", "Accept offer")}</button><button type="button" class="button" data-loot="offer-refuse" data-cart="${ctx.esc(cart.id)}">${ctx.t("Rifiuta", "Refuse")}</button></div>`
      : ""
  }</div>`;
}
export function renderShop(ctx) {
  const slice = lootSlice(ctx.state);
  const merchants = merchantsOnScene(ctx);
  if (!merchants.length)
    return `<p class="muted">${ctx.t("Nessuna bottega aperta in questa scena.", "No shop open in this scene.")}</p>`;
  if (!merchants.some((entry) => entry.id === ui.shopId)) ui.shopId = merchants[0].id;
  const merchant = merchants.find((entry) => entry.id === ui.shopId);
  const people = barterers(ctx);
  if (!people.some((actor) => actor.id === ui.barterId)) ui.barterId = people[0]?.id ?? null;
  const buyer = ui.barterId ? ctx.state.actors[ui.barterId] : null;
  const cart = buyer ? cartFor(slice, merchant.id, buyer.id) : null;
  const totals = cart ? cartTotals(ctx.state, slice, cart) : null;
  const inCart = (kind, ref) =>
    cart?.lines.find((line) => line.kind === kind && line.ref === ref)?.quantity ?? 0;
  // The DM sees every open cart; a player sees the carts of their other characters, so a
  // cart is never left out of sight when the bartering character changes (PR-56).
  const otherCarts = slice.carts.filter(
    (entry) =>
      entry.merchantId === merchant.id &&
      entry !== cart &&
      (ctx.role === "dm" || people.some((actor) => actor.id === entry.buyerId)),
  );
  const inCartBadge = (count) =>
    count > 0
      ? ` <span class="badge loot-in-cart" data-loot-in-cart>${ctx.t("Nel carrello", "In cart")}: ${count}</span>`
      : "";
  const header = `<div class="loot-shop-head"><div>${
    merchants.length > 1
      ? `<label class="field loot-inline-select"><span>${ctx.t("Mercante", "Merchant")}</span><select data-loot-select="shop">${merchants.map((entry) => `<option value="${ctx.esc(entry.id)}"${entry.id === merchant.id ? " selected" : ""}>${ctx.esc(entry.name)}</option>`).join("")}</select></label>`
      : `<h3>${ctx.esc(merchant.name)}</h3>`
  }<p class="muted"><span class="badge ${merchant.open ? "loot-badge-open" : ""}">${merchant.open ? ctx.t("Aperto", "Open") : ctx.t("Chiuso ai giocatori", "Closed to players")}</span> · ${ctx.t("Cassa", "Till")}: <span data-loot-funds>${money(ctx, merchant.fundsCp)}</span> · ${ctx.t("paga le merci al", "pays for goods at")} <span data-loot-rate>${merchant.buyRate}%</span>${merchant.discount ? ` · ${ctx.t("sconto", "discount")} <span data-loot-discount>${merchant.discount}%</span>` : ""}${merchant.actorId && ctx.state.actors[merchant.actorId] ? ` · ${ctx.t("sulla pedina", "on the token")} ${ctx.esc(ctx.state.actors[merchant.actorId].name)}` : ""}</p>${ctx.role === "dm" && !merchantHere(ctx.state, merchant) ? `<p class="loot-warning" data-loot-elsewhere>${ctx.t(`Non visibile ai giocatori in questa scena: la bottega è in «${ctx.esc(sceneName(ctx, merchant.sceneId))}».`, `Not visible to players in this scene: the shop is in “${ctx.esc(sceneName(ctx, merchant.sceneId))}”.`)} <button type="button" class="button" data-loot="merchant-here" data-id="${ctx.esc(merchant.id)}">${ctx.t("Sposta in questa scena", "Move to this scene")}</button></p>` : ""}</div><div class="toolbar">${ctx.role === "dm" ? `<button type="button" class="button" data-loot="merchant-toggle" data-id="${ctx.esc(merchant.id)}">${merchant.open ? ctx.t("Chiudi bottega", "Close shop") : ctx.t("Apri bottega", "Open shop")}</button><button type="button" class="button quiet" data-loot="merchant-prep" data-id="${ctx.esc(merchant.id)}">${ctx.t("Modifica in Preparazione", "Edit in Preparation")}</button>` : ""}</div></div>`;
  if (!buyer)
    return (
      header +
      `<p class="muted">${ctx.t("Nessun personaggio del gruppo sotto il tuo controllo.", "No party character under your control.")}</p>`
    );
  const wares = merchant.stock
    .map((row) => {
      const left = row.quantity - inCart("buy", row.id);
      return `<li class="loot-row"><div class="loot-row-copy"><strong>${ctx.esc(ctx.label(row.name))}</strong>${inCartBadge(inCart("buy", row.id))}<small>${merchant.discount ? `<s>${money(ctx, row.priceCp)}</s> ` : ""}<span data-loot-price>${money(ctx, buyUnitCp(merchant, row))}</span> · ${ctx.t("disponibili", "available")} ${row.quantity}</small></div><button type="button" class="button" data-loot="cart-add" data-kind="buy" data-ref="${ctx.esc(row.id)}"${left < 1 ? ` disabled aria-describedby="${fullId("buy", row.id)}"` : ""} aria-label="${ctx.t("Aggiungi al carrello", "Add to cart")}: ${ctx.esc(ctx.label(row.name))}">${ctx.t("Compra", "Buy")}</button>${left < 1 ? fullNote(ctx, "buy", row.id) : ""}</li>`;
    })
    .join("");
  const buyback = merchant.buyback
    .map((row) => {
      const left = row.quantity - inCart("buyback", row.id);
      return `<li class="loot-row"><div class="loot-row-copy"><strong>${ctx.esc(ctx.label(row.item.name))}</strong>${inCartBadge(inCart("buyback", row.id))}<small>${money(ctx, row.priceCp)} · ${ctx.t("venduto da", "sold by")} ${ctx.esc(ctx.state.actors[row.soldBy]?.name ?? "—")}${row.fromStash ? " " + ctx.t("(dalla scorta)", "(from the stash)") : ""} · ×${row.quantity}</small></div><button type="button" class="button" data-loot="cart-add" data-kind="buyback" data-ref="${ctx.esc(row.id)}"${left < 1 ? ` disabled aria-describedby="${fullId("buyback", row.id)}"` : ""} aria-label="${ctx.t("Riacquista", "Buy back")}: ${ctx.esc(ctx.label(row.item.name))}">${ctx.t("Riacquista", "Buy back")}</button>${left < 1 ? fullNote(ctx, "buyback", row.id) : ""}</li>`;
    })
    .join("");
  const inventory = (buyer.inventory ?? [])
    .filter((row) => row.quantity > 0)
    .map((row) => {
      const problem = sellProblem(merchant, row);
      const unit = problem ? null : sellUnitCp(merchant, row);
      const left = row.quantity - inCart("sell", row.id);
      const why = `loot-sell-why-${ctx.esc(row.id)}`;
      return `<li class="loot-row"><div class="loot-row-copy"><strong>${ctx.esc(ctx.label(row.name))}</strong> <span class="muted">×${row.quantity}</span> ${unidentifiedBadge(ctx, row)}${inCartBadge(inCart("sell", row.id))}<small${problem ? ` id="${why}"` : ""}>${problem ? ctx.esc(ctx.label(problem)) : ctx.t("Il mercante paga", "Merchant pays") + " " + money(ctx, unit) + (row.category === "valuable" ? " · " + ctx.t("valore pieno", "full value") : "")}</small></div><button type="button" class="button" data-loot="cart-add" data-kind="sell" data-ref="${ctx.esc(row.id)}"${problem ? ` disabled aria-describedby="${why}"` : left < 1 ? ` disabled aria-describedby="${fullId("sell", row.id)}"` : ""} aria-label="${ctx.t("Vendi", "Sell")}: ${ctx.esc(ctx.label(row.name))}">${ctx.t("Vendi", "Sell")}</button>${!problem && left < 1 ? fullNote(ctx, "sell", row.id) : ""}</li>`;
    })
    .join("");
  // The party stash is the party's shared inventory: its items are for sale too.
  const stashItems = (slice.stash?.items ?? []).filter((row) => row.quantity > 0);
  const stashList = stashItems
    .map((row) => {
      const problem = sellProblem(merchant, row);
      const unit = problem ? null : sellUnitCp(merchant, row);
      const left = row.quantity - inCart("sell-stash", row.id);
      const why = `loot-sell-stash-why-${ctx.esc(row.id)}`;
      return `<li class="loot-row"><div class="loot-row-copy"><strong>${ctx.esc(ctx.label(row.name))}</strong> <span class="muted">×${row.quantity}</span> ${unidentifiedBadge(ctx, row)}${inCartBadge(inCart("sell-stash", row.id))}<small${problem ? ` id="${why}"` : ""}>${problem ? ctx.esc(ctx.label(problem)) : ctx.t("Il mercante paga", "Merchant pays") + " " + money(ctx, unit) + (row.category === "valuable" ? " · " + ctx.t("valore pieno", "full value") : "")}</small></div><button type="button" class="button" data-loot="cart-add" data-kind="sell-stash" data-ref="${ctx.esc(row.id)}"${problem ? ` disabled aria-describedby="${why}"` : left < 1 ? ` disabled aria-describedby="${fullId("sell-stash", row.id)}"` : ""} aria-label="${ctx.t("Vendi dalla scorta", "Sell from the stash")}: ${ctx.esc(ctx.label(row.name))}">${ctx.t("Vendi", "Sell")}</button>${!problem && left < 1 ? fullNote(ctx, "sell-stash", row.id) : ""}</li>`;
    })
    .join("");
  const stashHtml = `<h4 id="loot-shop-stash-title">${ctx.t("Scorta del gruppo", "Party stash")}</h4><p class="muted">${ctx.t("Monete comuni", "Shared coins")}: <strong data-loot-shop-stash-coins>${money(ctx, coinsValue(slice.stash?.coins))}</strong></p>${stashList ? `<ul class="loot-list" aria-labelledby="loot-shop-stash-title">${stashList}</ul>` : `<p class="muted">${ctx.t("La scorta è vuota.", "The stash is empty.")}</p>`}`;
  const payHtml = totals
    ? `<label class="field loot-inline-select"><span>${ctx.t("Monete dello scambio", "Coins for this trade")}</span><select data-loot-select="pay" data-cart="${ctx.esc(cart.id)}"><option value="purse"${totals.payFrom === "purse" ? " selected" : ""}>${ctx.t("Borsa di", "Purse of")} ${ctx.esc(buyer.name)} (${money(ctx, coinsValue(purseOf(buyer)))})</option><option value="stash"${totals.payFrom === "stash" ? " selected" : ""}>${ctx.t("Scorta del gruppo", "Party stash")} (${money(ctx, coinsValue(slice.stash?.coins))})</option></select></label>`
    : "";
  const checkoutWhy =
    totals && !totals.canCheckout
      ? totals.problems.map((p) => ctx.esc(ctx.label(p))).join(" ")
      : "";
  const cartHtml = totals
    ? `<ul class="loot-list loot-cart-lines">${totals.lines
        .map(
          (line) =>
            `<li class="loot-row"><div class="loot-row-copy"><strong>${line.kind === "sell" ? ctx.t("Vendi", "Sell") : line.kind === "sell-stash" ? ctx.t("Vendi dalla scorta", "Sell from the stash") : line.kind === "buyback" ? ctx.t("Riacquisto", "Buyback") : ctx.t("Compra", "Buy")}: ${ctx.esc(ctx.label(line.name))}</strong><small>${line.unitCp == null ? "—" : money(ctx, line.unitCp)} × ${line.quantity} = ${money(ctx, line.totalCp)}${line.problem ? ` · <span class="error">${ctx.esc(ctx.label(line.problem))}</span>` : ""}</small></div><div class="toolbar loot-stepper"><button type="button" class="button quiet" data-loot="cart-line" data-cart="${ctx.esc(cart.id)}" data-line="${ctx.esc(line.id)}" data-quantity="${line.quantity - 1}" data-step="minus" aria-label="${ctx.t("Uno in meno", "One fewer")}: ${ctx.esc(ctx.label(line.name))}">−</button><button type="button" class="button quiet" data-loot="cart-line" data-cart="${ctx.esc(cart.id)}" data-line="${ctx.esc(line.id)}" data-quantity="${line.quantity + 1}" data-step="plus" aria-label="${ctx.t("Uno in più", "One more")}: ${ctx.esc(ctx.label(line.name))}"${line.quantity >= line.available ? ` disabled aria-describedby="${fullId("line", line.id)}"` : ""}>+</button></div>${line.quantity >= line.available ? `<small class="loot-why" id="${fullId("line", line.id)}">${ctx.t(`Nel carrello c’è già tutta la quantità disponibile (×${line.available}).`, `The cart already holds all the available quantity (×${line.available}).`)}</small>` : ""}</li>`,
        )
        .join(
          "",
        )}</ul>${payHtml}<dl class="loot-totals"><div><dt>${ctx.t("Compri", "You buy")}</dt><dd>${money(ctx, totals.buyCp)}</dd></div><div><dt>${ctx.t("Vendi", "You sell")}</dt><dd>${money(ctx, totals.sellCp)}</dd></div><div class="loot-net"><dt>${totals.netCp >= 0 ? ctx.t("Totale netto: paghi", "Net total: you pay") : ctx.t("Totale netto: ricevi", "Net total: you receive")}</dt><dd data-loot-net>${totals.override ? `<s>${money(ctx, Math.abs(totals.netCp))}</s> ` : ""}${money(ctx, Math.abs(totals.finalCp))}</dd></div></dl>${offerHtml(ctx, cart)}${totals.override ? `<p class="loot-override" data-loot-override>${totals.finalCp >= 0 ? ctx.t("Prezzo corretto dal DM: paghi", "DM-corrected price: you pay") : ctx.t("Prezzo corretto dal DM: ricevi", "DM-corrected price: you receive")} ${money(ctx, Math.abs(totals.finalCp))} · ${ctx.t("motivo", "reason")}: ${ctx.esc(totals.override.reason)}</p>` : ""}<div class="toolbar"><button type="button" class="button primary" data-loot="checkout" data-cart="${ctx.esc(cart.id)}"${totals.canCheckout ? "" : ' disabled aria-describedby="loot-checkout-why"'}>${ctx.t("Conferma scambio", "Confirm trade")}</button>${ctx.role === "dm" ? `<button type="button" class="button" data-loot="cart-override" data-cart="${ctx.esc(cart.id)}">${ctx.t("Correggi totale", "Correct total")}</button>` : `<button type="button" class="button" data-loot="cart-offer" data-cart="${ctx.esc(cart.id)}">${ctx.t("Proponi un prezzo", "Propose a price")}</button>`}<button type="button" class="button quiet" data-loot="cart-clear" data-cart="${ctx.esc(cart.id)}">${ctx.t("Svuota carrello", "Empty cart")}</button></div>${checkoutWhy ? `<p class="error" id="loot-checkout-why" role="status">${checkoutWhy}</p>` : ""}`
    : `<p class="muted">${ctx.t("Il carrello è vuoto: scegli merci da comprare o oggetti da vendere.", "The cart is empty: pick wares to buy or items to sell.")}</p>`;
  return `${header}${cartBar(ctx, totals)}<div class="loot-shop-grid"><section class="loot-shop-col" aria-labelledby="loot-wares-title"><h3 id="loot-wares-title" tabindex="-1">${ctx.t("Merci", "Wares")}</h3>${wares ? `<ul class="loot-list">${wares}</ul>` : `<p class="muted">${ctx.t("Nessuna merce.", "No wares.")}</p>`}${buyback ? `<h4>${ctx.t("Riacquista", "Buy back")}</h4><ul class="loot-list">${buyback}</ul>` : ""}</section><section class="loot-shop-col" aria-labelledby="loot-barter-title"><h3 id="loot-barter-title">${ctx.t("Inventario di", "Inventory of")} ${ctx.esc(buyer.name)}</h3><label class="field loot-inline-select"><span>${ctx.t("Chi contratta", "Bartering character")}</span><select data-loot-select="barter">${people.map((actor) => `<option value="${ctx.esc(actor.id)}"${actor.id === buyer.id ? " selected" : ""}>${ctx.esc(actor.name)}</option>`).join("")}</select></label><p class="muted">${ctx.t("Borsa", "Purse")}: <strong data-loot-purse>${money(ctx, coinsValue(purseOf(buyer)))}</strong></p>${inventory ? `<ul class="loot-list">${inventory}</ul>` : `<p class="muted">${ctx.t("Inventario vuoto.", "Empty inventory.")}</p>`}${stashHtml}</section><section class="loot-shop-col loot-cart" aria-labelledby="loot-cart-title"><h3 id="loot-cart-title" tabindex="-1">${ctx.t("Carrello", "Cart")}</h3>${cartHtml}${
    otherCarts.length
      ? `<h4>${ctx.t("Altri carrelli aperti", "Other open carts")}</h4><ul class="loot-list">${otherCarts
          .map((entry) => {
            const t = cartTotals(ctx.state, slice, entry);
            return `<li class="loot-row"><div class="loot-row-copy"><strong>${ctx.esc(ctx.state.actors[entry.buyerId]?.name ?? "—")}</strong><small>${t.finalCp >= 0 ? ctx.t("paga", "pays") : ctx.t("riceve", "receives")} ${money(ctx, Math.abs(t.finalCp))}</small></div><button type="button" class="button quiet" data-loot="barter-show" data-id="${ctx.esc(entry.buyerId)}">${ctx.t("Mostra", "Show")}</button></li>`;
          })
          .join("")}</ul>`
      : ""
  }</section></div><div class="loot-foot">${undoButton(ctx)}<details class="loot-details"><summary>${ctx.t("Registro degli scambi", "Trade log")}</summary>${ledgerList(
    ctx,
    slice.ledger.filter((entry) => entry.kind === "trade" && entry.merchantId === merchant.id),
    8,
  )}</details></div>`;
}
export function bindShop(el, ctx) {
  bindActions(el, ctx);
}

// ---------------------------------------------------------------- shared handlers

function bindActions(el, ctx) {
  el.addEventListener("click", (event) => {
    const control = event.target.closest?.("[data-loot]");
    if (!control || !el.contains(control) || control.disabled) return;
    withFocus(control, () =>
      handleMerchantAction(ctx, control.dataset.loot, { ...control.dataset }),
    );
  });
  el.addEventListener("submit", (event) => {
    const form = event.target.closest?.("form[data-loot-form]");
    if (!form || !el.contains(form)) return;
    event.preventDefault();
    withFocus(form, () =>
      handleMerchantAction(ctx, form.dataset.lootForm, { ...form.dataset }, new FormData(form)),
    );
  });
  el.addEventListener("change", (event) => {
    const select = event.target.closest?.("[data-loot-select]");
    if (!select || !el.contains(select)) return;
    if (select.dataset.lootSelect === "pay")
      return handleMerchantAction(ctx, "cart-pay", {
        cart: select.dataset.cart,
        payFrom: select.value,
      });
    if (select.dataset.lootSelect === "shop") ui.shopId = select.value;
    if (select.dataset.lootSelect === "barter") ui.barterId = select.value;
    requestFocus(`[data-loot-select="${select.dataset.lootSelect}"]`);
    try {
      ctx.render();
    } finally {
      requestFocus(null);
    }
  });
  restoreFocus(el);
}
export function selectShop(id) {
  ui.shopId = id;
}
export function selectBarterer(id) {
  ui.barterId = id;
}
// Exported for tests: the same handler the bound controls call.
export function handleMerchantAction(ctx, action, data, form = null) {
  const slice = lootSlice(ctx.state);
  const name = (id) => ctx.state.actors[id]?.name ?? "";
  // DM preparation stays out of the players' log (handouts pattern).
  const prep = (labelText, mutate, focus = null, focusFirst = false) =>
    commitLoot(ctx, labelText, mutate, { hidden: true, focus, focusFirst });
  return attempt(ctx, () => {
    switch (action) {
      case "undo":
        return ctx.undo();
      case "merchant-pick":
        ui.prepId = data.id;
        return ctx.render();
      case "merchant-create":
        return prep(
          ctx.t("Mercante creato", "Merchant created"),
          (draft, s) => {
            ui.prepId = createMerchant(draft, s, ctx.role, {
              name: form.get("name"),
              sceneId: draft.activeSceneId,
            }).id;
          },
          "#loot-merchant-title",
          true,
        );
      case "merchant-save":
        return prep(ctx.t("Mercante aggiornato", "Merchant updated"), (draft, s) =>
          updateMerchant(draft, s, ctx.role, data.id, {
            name: form.get("name"),
            sceneId: form.get("sceneId"),
            open: form.get("open") === "on",
            fundsGp: form.get("fundsGp"),
            buyRate: Number(form.get("buyRate")),
            discount: form.get("discount"),
            actorId: form.get("actorId") ?? undefined,
          }),
        );
      case "merchant-delete":
        return ctx.dialog(
          ctx.t("Elimina mercante", "Delete merchant"),
          `<p>${ctx.t("Il mercante, le sue merci e i carrelli aperti spariscono. Gli scambi già conclusi restano nel registro.", "The merchant, its wares and open carts disappear. Completed trades stay in the log.")}</p>`,
          {
            submitLabel: ctx.t("Elimina", "Delete"),
            onSubmit: () =>
              prep(
                ctx.t("Mercante eliminato", "Merchant deleted"),
                (draft, s) => deleteMerchant(draft, s, ctx.role, data.id),
                [".loot-prep-pick.active", 'form[data-loot-form="merchant-create"] [name="name"]'],
              ),
          },
        );
      case "merchant-toggle": {
        // Opening or closing is the players' concern: a shared log entry.
        const merchant = merchantById(slice, data.id);
        return commitLoot(
          ctx,
          merchant.open
            ? ctx.t(`${merchant.name}: bottega chiusa`, `${merchant.name}: shop closed`)
            : ctx.t(`${merchant.name}: bottega aperta`, `${merchant.name}: shop open`),
          (draft, s) => setMerchantOpen(draft, s, ctx.role, data.id, !merchant.open),
        );
      }
      case "merchant-here":
        return prep(
          ctx.t("Mercante spostato in questa scena", "Merchant moved to this scene"),
          (draft, s) => moveMerchantHere(draft, s, ctx.role, data.id),
          '[data-loot="merchant-toggle"]',
        );
      case "merchant-prep":
        ui.prepId = data.id;
        return ctx.navigate("preparation", { tab: "loot-merchants" });
      case "stock-add":
        return prep(ctx.t("Merce aggiunta", "Ware added"), (draft, s) =>
          addStock(draft, s, ctx.role, data.id, {
            srdId: form.get("srdId"),
            quantity: Number(form.get("quantity")),
            priceGp: form.get("priceGp") ?? "",
          }),
        );
      case "stock-save":
        return prep(ctx.t("Merce aggiornata", "Ware updated"), (draft, s) =>
          updateStock(draft, s, ctx.role, data.id, data.stock, {
            quantity: Number(form.get("quantity")),
            priceGp: form.get("priceGp"),
          }),
        );
      case "stock-remove":
        return prep(
          ctx.t("Merce rimossa", "Ware removed"),
          (draft, s) => removeStock(draft, s, ctx.role, data.id, data.stock),
          "#loot-merchant-title",
        );
      // Cart edits stay out of everyone else's log: only the checkout is shared.
      case "cart-add":
        return commitLoot(
          ctx,
          ctx.t(
            `Carrello di ${name(ui.barterId)} aggiornato`,
            `${name(ui.barterId)}'s cart updated`,
          ),
          (draft, s) =>
            addToCart(draft, s, ctx.role, {
              merchantId: ui.shopId,
              buyerId: ui.barterId,
              kind: data.kind,
              ref: data.ref,
            }),
          { hidden: true, focus: "#loot-cart-title" },
        );
      case "cart-line":
        return commitLoot(
          ctx,
          ctx.t(
            `Carrello di ${name(ui.barterId)} aggiornato`,
            `${name(ui.barterId)}'s cart updated`,
          ),
          (draft, s) =>
            setCartLine(draft, s, ctx.role, data.cart, data.line, Number(data.quantity)),
          { hidden: true, focus: "#loot-cart-title" },
        );
      case "cart-clear":
        return commitLoot(
          ctx,
          ctx.t("Carrello svuotato", "Cart emptied"),
          (draft, s) => clearCart(draft, s, ctx.role, data.cart),
          { hidden: true, focus: "#loot-cart-title" },
        );
      case "cart-pay":
        return commitLoot(
          ctx,
          ctx.t(
            `Carrello di ${name(ui.barterId)} aggiornato`,
            `${name(ui.barterId)}'s cart updated`,
          ),
          (draft, s) => setCartPayment(draft, s, ctx.role, data.cart, data.payFrom),
          { hidden: true, focus: '[data-loot-select="pay"]' },
        );
      case "barter-show":
        ui.barterId = data.id;
        return ctx.render();
      case "checkout": {
        const cart = slice.carts.find((entry) => entry.id === data.cart);
        return commitLoot(
          ctx,
          ctx.t(
            `Scambio concluso: ${name(cart?.buyerId)}`,
            `Trade completed: ${name(cart?.buyerId)}`,
          ),
          (draft, s) => checkout(draft, s, ctx.role, data.cart),
          { focus: "#loot-cart-title" },
        );
      }
      case "cart-override":
        return openOverride(ctx, data.cart);
      // «Vedi carrello»: a view command, no state change.
      case "cart-show": {
        const title = globalThis.document?.querySelector?.("#loot-cart-title");
        if (!title) return;
        title.scrollIntoView?.({ block: "start", behavior: "smooth" });
        title.focus?.({ preventScroll: true });
        requestFocus(null);
        return;
      }
      case "cart-offer":
        return openOffer(ctx, data.cart);
      case "offer-accept":
      case "offer-refuse": {
        const cart = slice.carts.find((entry) => entry.id === data.cart);
        const accept = action === "offer-accept";
        return commitLoot(
          ctx,
          accept
            ? ctx.t(
                `Offerta di ${name(cart?.buyerId)} accettata`,
                `${name(cart?.buyerId)}'s offer accepted`,
              )
            : ctx.t(
                `Offerta di ${name(cart?.buyerId)} rifiutata`,
                `${name(cart?.buyerId)}'s offer refused`,
              ),
          (draft, s) =>
            answerOffer(draft, s, ctx.role, data.cart, accept, offerReason(ctx, cart?.offer)),
          { focus: "#loot-cart-title" },
        );
      }
    }
  });
}
function offerReason(ctx, offer) {
  if (!offer) return "";
  const roll = offer.roll ? ` (${ctx.label(offer.roll.label)} ${offer.roll.total})` : "";
  return (
    ctx.t(`Offerta accettata${roll}`, `Offer accepted${roll}`) +
    (offer.note ? `: ${offer.note}` : "")
  );
}
// The buyer proposes a price (TV-144): an amount in the cart's direction, an optional note
// and an optional Charisma check rolled now (digital, or the face of a physical d20).
function openOffer(ctx, cartId) {
  const slice = lootSlice(ctx.state);
  const cart = slice.carts.find((entry) => entry.id === cartId);
  if (!cart) return;
  const totals = cartTotals(ctx.state, slice, cart);
  const pays = totals.netCp >= 0;
  const skills = HAGGLE_SKILLS.map((id) => {
    let label = id;
    try {
      label = ctx.label(rollProfile(ctx.state, cart.buyerId, "skill", id).label);
    } catch {
      /* the list keeps the id */
    }
    return [id, label];
  });
  ctx.dialog(
    ctx.t("Proponi un prezzo", "Propose a price"),
    `<p>${ctx.t("Prezzo di listino", "List price")}: <strong>${pays ? ctx.t("paghi", "you pay") : ctx.t("ricevi", "you receive")} ${money(ctx, Math.abs(totals.netCp))}</strong>. ${ctx.t("Il DM accetta o rifiuta la tua offerta; finché non risponde vale il listino.", "The DM accepts or refuses your offer; until then the list price applies.")}</p><label class="field"><span>${pays ? ctx.t("Vorrei pagare (mo)", "I would pay (GP)") : ctx.t("Vorrei ricevere (mo)", "I would receive (GP)")}</span><input type="number" name="amountGp" min="0" step="0.01" inputmode="decimal" required value="${Math.abs(totals.netCp) / 100}"></label><label class="field"><span>${ctx.t("Argomento (facoltativo)", "Argument (optional)")}</span><input name="note" maxlength="200" placeholder="${ctx.t("Es. compro tre oggetti insieme", "E.g. I am buying three items together")}"></label><fieldset class="loot-recipients"><legend>${ctx.t("Tiro per contrattare (facoltativo)", "Haggle roll (optional)")}</legend><label class="loot-check"><input type="radio" name="roll" value="" checked> ${ctx.t("Nessun tiro", "No roll")}</label>${skills.map(([id, label]) => `<label class="loot-check"><input type="radio" name="roll" value="${ctx.esc(id)}"> ${ctx.esc(label)}</label>`).join("")}<label class="field loot-qty"><span>${ctx.t("Dado fisico: faccia del d20 (vuoto = digitale)", "Physical die: d20 face (empty = digital)")}</span><input type="number" name="face" min="1" max="20" step="1" inputmode="numeric"></label></fieldset>`,
    {
      submitLabel: ctx.t("Invia offerta", "Send offer"),
      onSubmit: (data) =>
        commitLoot(
          ctx,
          ctx.t("Offerta inviata al DM", "Offer sent to the DM"),
          (draft, s) => {
            const amount = Math.round(Number(data.get("amountGp")) * 100);
            if (!Number.isFinite(amount) || amount < 0)
              throw lootError("Offerta non valida.", "Invalid offer.");
            const skill = String(data.get("roll") ?? "");
            let roll = null;
            if (skill) {
              if (!HAGGLE_SKILLS.includes(skill))
                throw lootError("Tiro non valido.", "Invalid roll.");
              roll = haggleRoll(draft, cart.buyerId, skill, data.get("face"), ctx.role);
            }
            proposeOffer(draft, s, ctx.role, cartId, {
              finalCp: pays ? amount : -amount,
              note: data.get("note"),
              roll,
            });
          },
          { focus: "#loot-cart-title" },
        ),
    },
  );
}
// The Charisma check through the sheet's one roll engine: recorded in the roll log when the
// sheet's roll area is present, else built from the same profile (demo harness).
function haggleRoll(draft, actorId, skill, face, role) {
  const physical = face != null && String(face).trim() !== "";
  if (draft.ext?.[ROLLS]) {
    const record = recordRoll(
      draft,
      actorId,
      {
        kind: "skill",
        subject: skill,
        mode: physical ? "physical" : "digital",
        faces: physical ? [Number(face)] : [],
      },
      role,
    );
    return { ...record, subject: skill };
  }
  const profile = rollProfile(draft, actorId, "skill", skill);
  const natural = physical ? Number(face) : rollDie(20);
  if (!Number.isInteger(natural) || natural < 1 || natural > 20)
    throw lootError("Scrivi una faccia del d20 da 1 a 20.", "Enter a d20 face from 1 to 20.");
  return {
    subject: skill,
    label: profile.label,
    natural,
    total: natural + profile.modifier,
    mode: physical ? "physical" : "digital",
  };
}
function openOverride(ctx, cartId) {
  const slice = lootSlice(ctx.state);
  const cart = slice.carts.find((entry) => entry.id === cartId);
  if (!cart) return;
  const totals = cartTotals(ctx.state, slice, cart);
  const pays = totals.finalCp >= 0;
  ctx.dialog(
    ctx.t("Correggi il totale (contrattazione)", "Correct the total (haggling)"),
    `<p>${ctx.t("Totale calcolato", "Calculated total")}: <strong>${totals.netCp >= 0 ? ctx.t("il personaggio paga", "the character pays") : ctx.t("il mercante paga", "the merchant pays")} ${money(ctx, Math.abs(totals.netCp))}</strong></p><fieldset class="loot-recipients"><legend>${ctx.t("Chi paga", "Who pays")}</legend><label class="loot-check"><input type="radio" name="direction" value="pay"${pays ? " checked" : ""}> ${ctx.esc(ctx.state.actors[cart.buyerId]?.name ?? "")}</label><label class="loot-check"><input type="radio" name="direction" value="receive"${pays ? "" : " checked"}> ${ctx.t("Il mercante", "The merchant")}</label></fieldset><label class="field"><span>${ctx.t("Importo corretto (mo)", "Corrected amount (GP)")}</span><input type="number" name="amountGp" min="0" step="0.01" inputmode="decimal" required value="${Math.abs(totals.finalCp) / 100}"></label><label class="field"><span>${ctx.t("Motivo", "Reason")}</span><input name="reason" required maxlength="200" placeholder="${ctx.t("Es. sconto dopo una prova di Persuasione", "E.g. discount after a Persuasion check")}"></label>${totals.override ? `<label class="loot-check"><input type="checkbox" name="clear"> ${ctx.t("Togli la correzione e torna al totale calcolato", "Remove the correction and return to the calculated total")}</label>` : ""}<p class="muted">${ctx.t("Qualsiasi modifica al carrello annulla la correzione: il prezzo concordato vale solo per questo contenuto.", "Any change to the cart voids the correction: the agreed price only applies to this content.")}</p>`,
    {
      submitLabel: ctx.t("Applica prezzo", "Apply price"),
      onSubmit: (data) =>
        commitLoot(
          ctx,
          ctx.t("Totale corretto dal DM", "Total corrected by the DM"),
          (draft, s) => {
            if (data.get("clear") === "on")
              return overrideCartTotal(draft, s, ctx.role, cartId, null);
            const amount = Math.round(Number(data.get("amountGp")) * 100);
            if (!Number.isFinite(amount) || amount < 0)
              throw lootError("Importo non valido.", "Invalid amount.");
            overrideCartTotal(
              draft,
              s,
              ctx.role,
              cartId,
              data.get("direction") === "receive" ? -amount : amount,
              data.get("reason"),
            );
          },
          { focus: '[data-loot="cart-override"]' },
        ),
    },
  );
}
