// B26 — coins, character purses, experience and the party stash (DDB Party Inventory,
// DDB-052; BG3 "equipped by" indicators, CRP-020; FG party sheet coins, R20-079).
// Pure domain functions operate on (state, slice, role, ...) and throw an Error carrying
// {it, en}; the UI half renders sheet sections and binds them through the registry.
// Coins given to a character land on the canonical actor (`actor.currency`), items in
// `actor.inventory` with the same row model characters.mjs renders.

import { COINS, ITEMS, getById, poundsToKg, costInCp } from "./srd-sample.mjs";
import { canControlActor, isCampaignActor, isActorAvailable } from "./character-access.mjs";
import { isCampaignMember } from "./campaign-content.mjs";
import { portraitArt, canSeeAsset, isDataUrl } from "./media-domain.mjs";

export const SLICE = "loot";
const L = (it, en) => ({ it, en });
export function lootError(it, en) {
  return Object.assign(new Error(en), { it, en });
}
export function newId(prefix) {
  const random =
    globalThis.crypto?.randomUUID?.() ??
    Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  return prefix + "-" + random;
}
const srdPages = (en, it) => ({
  kind: "srd",
  edition: "2024",
  revision: "5.2.1",
  pages: { en, it },
});
// Rule sources quoted in the UI and evidence (SRD 5.2.1, printed page numbers).
export const RULES = Object.freeze({
  coins: srdPages([89], [101]), // coins, 50 coins weigh 1 lb
  selling: srdPages([89], [101]), // "Equipment fetches half its cost when sold"
  magicValues: srdPages([205, 206], [233, 234]), // Magic Item Rarities and Values
  gear: srdPages([255], [291]), // monster Gear: retrieved items use Equipment rules
  xpAwarded: srdPages([182], [212]), // XP "awarded by the Game Master"
  advancement: srdPages([23], [25]), // Character Advancement table
});

// ---------------------------------------------------------------- coins

export const COIN_IDS = Object.freeze(["pp", "gp", "ep", "sp", "cp"]);
const COIN = Object.fromEntries(COINS.map((coin) => [coin.id, coin]));
const ASCENDING = ["cp", "sp", "ep", "gp", "pp"];
export const emptyCoins = () => ({ pp: 0, gp: 0, ep: 0, sp: 0, cp: 0 });
export function normalizeCoins(value) {
  const out = emptyCoins();
  for (const id of COIN_IDS) {
    const raw = value?.[id] ?? 0;
    const n = typeof raw === "string" && raw.trim() === "" ? 0 : Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > 10_000_000)
      throw lootError(
        "Le monete devono essere numeri interi non negativi.",
        "Coins must be non-negative whole numbers.",
      );
    out[id] = n;
  }
  return out;
}
export const coinsValue = (coins) =>
  COIN_IDS.reduce((sum, id) => sum + (coins?.[id] ?? 0) * COIN[id].valueInCp, 0);
export const isEmptyCoins = (coins) => COIN_IDS.every((id) => !coins?.[id]);
export function addCoins(target, coins) {
  for (const id of COIN_IDS) target[id] = (target[id] ?? 0) + (coins?.[id] ?? 0);
  return target;
}
// Change is given in gold, silver and copper only (no electrum or platinum).
export function coinsFromCp(cp) {
  const out = emptyCoins();
  out.gp = Math.floor(cp / 100);
  out.sp = Math.floor((cp % 100) / 10);
  out.cp = cp % 10;
  return out;
}
// Pays `amount` copper-value from a purse: first with the smallest coins that fit, then
// by breaking the smallest larger coin and taking the change. Mutates and returns purse.
export function spendCp(purse, amount) {
  if (!Number.isInteger(amount) || amount < 0)
    throw lootError("Importo non valido.", "Invalid amount.");
  const have = coinsValue(purse);
  if (have < amount)
    throw lootError(
      `Fondi insufficienti: mancano ${amount - have} mr.`,
      `Insufficient funds: ${amount - have} cp short.`,
    );
  let remaining = amount;
  for (const id of ASCENDING) {
    const use = Math.min(purse[id] ?? 0, Math.floor(remaining / COIN[id].valueInCp));
    purse[id] = (purse[id] ?? 0) - use;
    remaining -= use * COIN[id].valueInCp;
  }
  if (remaining > 0) {
    const coin = ASCENDING.find((id) => (purse[id] ?? 0) > 0);
    purse[coin] -= 1;
    addCoins(purse, coinsFromCp(COIN[coin].valueInCp - remaining));
  }
  return purse;
}
export function subtractCoins(target, coins) {
  for (const id of COIN_IDS)
    if ((target[id] ?? 0) < (coins?.[id] ?? 0))
      throw lootError(
        `Non ci sono abbastanza ${COIN[id].name.it.toLowerCase()}.`,
        `Not enough ${COIN[id].name.en.toLowerCase()}s.`,
      );
  for (const id of COIN_IDS) target[id] -= coins?.[id] ?? 0;
  return target;
}
// Even split per denomination; what cannot be divided stays as the remainder
// (FG "Distribute": the remainder stays on the party sheet, R20-079).
export function splitCoins(coins, count) {
  if (!Number.isInteger(count) || count < 1)
    throw lootError("Scegli almeno un destinatario.", "Choose at least one recipient.");
  const share = emptyCoins(),
    remainder = emptyCoins();
  for (const id of COIN_IDS) {
    share[id] = Math.floor((coins?.[id] ?? 0) / count);
    remainder[id] = (coins?.[id] ?? 0) % count;
  }
  return { share, remainder };
}
const group = (n, lang) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, lang === "it" ? "." : ",");
export function formatCoins(coins, lang = "it") {
  const parts = COIN_IDS.filter((id) => coins?.[id]).map(
    (id) => `${group(coins[id], lang)} ${COIN[id].abbreviation[lang === "it" ? "it" : "en"]}`,
  );
  return parts.length ? parts.join(" · ") : lang === "it" ? "0 mo" : "0 GP";
}
export const formatCp = (cp, lang = "it") => formatCoins(coinsFromCp(Math.max(0, cp)), lang);
export const coinAbbreviation = (id, lang) => COIN[id].abbreviation[lang === "it" ? "it" : "en"];
export const coinName = (id) => COIN[id].name;
// Short labels for coin fields ("Oro (mo)"), full SRD names stay in titles.
const COIN_SHORT = {
  pp: L("Platino", "Platinum"),
  gp: L("Oro", "Gold"),
  ep: L("Electrum", "Electrum"),
  sp: L("Argento", "Silver"),
  cp: L("Rame", "Copper"),
};
export const coinShortName = (id) => COIN_SHORT[id];
// SRD: fifty coins weigh 1 lb.
export const coinsWeightKg = (coins) =>
  Number(poundsToKg(COIN_IDS.reduce((sum, id) => sum + (coins?.[id] ?? 0), 0) / 50).toFixed(2));

// ---------------------------------------------------------------- catalog and items

const BY_EN_NAME = new Map(ITEMS.map((entry) => [entry.name.en.toLowerCase(), entry]));
const RARITY_GP = { common: 100, uncommon: 400, rare: 4000, "very-rare": 40000, legendary: 200000 };
export const catalogItems = () => ITEMS;
export function catalogEntry(item) {
  if (item?.srdId) return getById(item.srdId) ?? null;
  const en = typeof item?.name === "object" ? item.name?.en : item?.name;
  return en ? (BY_EN_NAME.get(String(en).trim().toLowerCase()) ?? null) : null;
}
// Market value in cp: the Equipment cost, else the Magic Item Rarities and Values table
// (halved for a consumable other than a Spell Scroll). Unknown value → null.
export function catalogValueCp(entry) {
  if (!entry) return null;
  if (entry.cost) return costInCp(entry.cost);
  const gp = RARITY_GP[entry.magic?.rarity];
  if (!gp) return null;
  return (entry.magic.consumable ? gp / 2 : gp) * 100;
}
const KIND_BY_CATEGORY = { weapon: "weapon" };
function rowKind(entry) {
  if (entry.magic?.consumable || entry.subcategory === "potion") return "consumable";
  return KIND_BY_CATEGORY[entry.category] ?? "gear";
}
const APPARENT = {
  ring: L("Anello non identificato", "Unidentified ring"),
  wand: L("Bacchetta non identificata", "Unidentified wand"),
  rod: L("Verga non identificata", "Unidentified rod"),
  potion: L("Pozione non identificata", "Unidentified potion"),
  weapon: L("Arma non identificata", "Unidentified weapon"),
  armor: L("Armatura non identificata", "Unidentified armor"),
  wondrous: L("Oggetto meraviglioso non identificato", "Unidentified wondrous item"),
};
export function defaultApparentName(entry) {
  return (
    APPARENT[entry?.magic?.type ?? entry?.category] ??
    L("Oggetto non identificato", "Unidentified item")
  );
}
// A loot row built from a catalog entry: SRD name, Equipment data, value and weight only.
export function itemFromCatalog(srdId, { quantity = 1 } = {}) {
  const entry = getById(srdId);
  if (!entry || entry.kind !== "item")
    throw lootError("Oggetto non presente nel catalogo.", "Item not in the catalog.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999)
    throw lootError("La quantità va da 1 a 999.", "Quantity ranges from 1 to 999.");
  const id = newId("item");
  return {
    id,
    lootId: id,
    srdId: entry.id,
    name: { ...entry.name },
    description: { ...entry.summary },
    kind: rowKind(entry),
    category: entry.category,
    quantity,
    weight: entry.weight == null ? null : poundsToKg(entry.weight),
    value: catalogValueCp(entry),
    identified: true,
    ...(entry.id === "srd2024:item:potion-of-healing" ? { healing: 7 } : {}),
    ...(entry.weapon ? { weaponType: entry.slug, weapon: structuredClone(entry.weapon) } : {}),
    ...(entry.armor ? { armor: structuredClone(entry.armor) } : {}),
    source: structuredClone(entry.source),
  };
}
// A custom item written by the DM (a gem, an art object, a letter). Valuables keep
// their full value when sold (SRD "Selling Equipment").
export function customItem({
  name,
  quantity = 1,
  valueGp = null,
  weightKg = null,
  valuable = false,
}) {
  const text = String(name ?? "").trim();
  if (!text || text.length > 120)
    throw lootError(
      "Scrivi un nome (massimo 120 caratteri).",
      "Write a name (120 characters at most).",
    );
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999)
    throw lootError("La quantità va da 1 a 999.", "Quantity ranges from 1 to 999.");
  const value = valueGp == null || valueGp === "" ? null : Math.round(Number(valueGp) * 100);
  if (value !== null && (!Number.isFinite(value) || value < 0))
    throw lootError("Il valore non è valido.", "The value is not valid.");
  const weight = weightKg == null || weightKg === "" ? null : Number(weightKg);
  if (weight !== null && (!Number.isFinite(weight) || weight < 0))
    throw lootError("Il peso non è valido.", "The weight is not valid.");
  const id = newId("item");
  return {
    id,
    lootId: id,
    srdId: null,
    name: L(text, text),
    description: "",
    kind: "gear",
    category: valuable ? "valuable" : "custom",
    quantity,
    weight,
    value,
    identified: true,
    source: { kind: "authored", revision: "dm-loot", note: "Written by the DM for this campaign." },
  };
}
// Fields that reveal what an item really is (catalog identity, use, attack or armor data,
// provenance). An unidentified row keeps none of them: the sheet would otherwise offer
// "Drink" or show "2d4 + 2" for a mystery vial (FG non-ID name and notes only; INV-10).
export const IDENTITY_FIELDS = Object.freeze([
  "srdId",
  "healing",
  "weaponType",
  "weapon",
  "armor",
  "source",
  "category",
  "clean",
  "kind",
]);
// Hides a row's identity: players see the apparent name, description and weight only;
// the true data stays in the slice's DM-only record, keyed by the stable loot identity
// (INV-10 "Informazioni note"). identifyItem restores it wherever the row is.
export function hideIdentity(slice, item, apparentName, apparentDescription = "") {
  const entry = catalogEntry(item);
  const apparent =
    typeof apparentName === "string" && apparentName.trim()
      ? L(apparentName.trim(), apparentName.trim())
      : apparentName?.it
        ? apparentName
        : defaultApparentName(entry);
  const fields = {};
  for (const field of IDENTITY_FIELDS)
    if (item[field] != null) fields[field] = structuredClone(item[field]);
  slice.secrets[item.lootId] = {
    name: structuredClone(item.name),
    description: structuredClone(item.description),
    value: item.value,
    srdId: item.srdId,
    fields,
  };
  for (const field of IDENTITY_FIELDS) delete item[field];
  Object.assign(item, {
    name: apparent,
    description: apparentDescription ? L(apparentDescription, apparentDescription) : "",
    value: null,
    srdId: null,
    kind: "gear",
    identified: false,
  });
  return item;
}
export function sellValueCp(item) {
  if (item?.identified === false || item?.unidentified) return null;
  if (Number.isInteger(item?.value)) return item.value;
  return catalogValueCp(catalogEntry(item));
}

// ---------------------------------------------------------------- party and access

export function partyMembers(state) {
  const campaignId = state.campaign?.id;
  return Object.values(state.actors ?? {}).filter(
    (actor) =>
      actor?.kind === "character" &&
      !actor.companion &&
      actor.visibility !== "private" &&
      isCampaignActor(actor, campaignId) &&
      isActorAvailable(actor),
  );
}
export const isPartyMember = (state, actorId) =>
  partyMembers(state).some((actor) => actor.id === actorId);
export const isMember = (state, role) => isCampaignMember(state, state.campaign?.id, role);
export function requireMember(state, role) {
  if (!isMember(state, role))
    throw lootError(
      "Solo i membri della campagna usano la scorta e il bottino.",
      "Only campaign members use the stash and the loot.",
    );
}
export function requireControlledMember(state, role, actorId) {
  const actor = state.actors?.[actorId];
  if (!actor || !isPartyMember(state, actorId))
    throw lootError(
      "Il personaggio non fa parte del gruppo della campagna.",
      "The character is not in the campaign party.",
    );
  if (!canControlActor(actor, role, state))
    throw lootError("Non controlli questo personaggio.", "You do not control this character.");
  return actor;
}
export const actorName = (state, id) => state.actors?.[id]?.name ?? "—";

// ---------------------------------------------------------------- actor inventory

const sameName = (a, b) => {
  const en = (value) => (typeof value === "object" ? value?.en : value);
  return !!en(a) && String(en(a)).trim().toLowerCase() === String(en(b)).trim().toLowerCase();
};
// Data other areas keep on one inventory row (a spellbook's spells, a homebrew or builder
// copy, a form restriction, a container): such a row is one of a kind and never stacks.
const UNIQUE_ROW_FIELDS = Object.freeze([
  "spellbook",
  "homebrewRef",
  "managedBy",
  "availableInForm",
  "containerId",
  "attuned",
  "charges",
]);
// A row that can absorb, or be absorbed into, another copy of the same item: not equipped
// (on the sheet or from the stash), not placed on the ground, identified, and plain.
export const stackableRow = (row) =>
  !!row &&
  !row.equipped &&
  !row.equippedBy &&
  !row.location &&
  !row.unidentified &&
  row.identified !== false &&
  UNIQUE_ROW_FIELDS.every((field) => row[field] == null);
const sameItem = (row, item) =>
  (item.srdId && row.srdId === item.srdId) ||
  (item.srdId && !row.srdId && catalogEntry(row)?.id === item.srdId) ||
  (!item.srdId && sameName(row.name, item.name) && row.kind === item.kind);
// Adds loot to a character inventory with the characters.mjs row model. A plain identified
// item stacks on a plain row of the same catalog item (or the same English name and kind);
// anything else keeps its own row. The row keeps every field the item carried (a row that
// left an inventory comes back whole, with its id when that id is free on the character);
// only loot, stash and merchant bookkeeping is dropped.
export function giveItemToActor(actor, item, quantity = item.quantity) {
  if (!Number.isInteger(quantity) || quantity < 1)
    throw lootError("Quantità non valida.", "Invalid quantity.");
  actor.inventory ??= [];
  const target = stackableRow(item)
    ? actor.inventory.find((row) => stackableRow(row) && sameItem(row, item))
    : null;
  if (target) {
    target.quantity += quantity;
    target.srdId ??= item.srdId ?? undefined;
    if (target.srdId === undefined) delete target.srdId;
    return target;
  }
  const {
    id: _loot,
    identified,
    unidentified,
    equippedBy: _by,
    origin,
    quantity: _quantity,
    equipped: _equipped,
    location: _location,
    ...rest
  } = structuredClone(item);
  const back =
    origin?.actorId === actor.id &&
    origin.rowId &&
    !actor.inventory.some((row) => row.id === origin.rowId);
  const row = {
    id: back ? origin.rowId : newId("inv"),
    ...rest,
    quantity,
    weight: rest.weight ?? null,
    equipped: false,
    kind: rest.kind ?? "gear",
    description: rest.description ?? "",
    ...(identified === false || unidentified ? { unidentified: true } : {}),
  };
  if (!row.srdId) delete row.srdId;
  if (!Number.isInteger(row.value)) delete row.value;
  if (!row.category) delete row.category;
  actor.inventory.push(row);
  return row;
}
// Removes `quantity` of an inventory row and returns the moved part as a loot row. The
// moved row keeps every field and remembers where it came from (`origin`), so it returns
// whole, with the same id, when the character takes it back.
export function takeItemFromActor(actor, rowId, quantity) {
  const row = actor.inventory?.find((entry) => entry.id === rowId);
  if (!row || !(row.quantity > 0))
    throw lootError(
      "L'oggetto non è più nell'inventario.",
      "The item is no longer in the inventory.",
    );
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > row.quantity)
    throw lootError(
      `Puoi spostarne da 1 a ${row.quantity}.`,
      `You can move from 1 to ${row.quantity}.`,
    );
  if (row.equipped)
    throw lootError("Riponi prima l'oggetto equipaggiato.", "Unequip the item first.");
  if (row.location === "ground")
    throw lootError("L'oggetto è a terra.", "The item is on the ground.");
  const { id, equipped, location, unidentified, ...rest } = row;
  const moved = structuredClone({
    ...rest,
    id: newId("item"),
    lootId: row.lootId ?? newId("loot"),
    quantity,
    identified: !unidentified,
    origin: { actorId: actor.id, rowId: row.id },
  });
  if (!Number.isInteger(moved.value)) {
    const value = unidentified ? null : catalogValueCp(catalogEntry(row));
    if (value === null) delete moved.value;
    else moved.value = value;
  }
  row.quantity -= quantity;
  if (row.quantity === 0) actor.inventory = actor.inventory.filter((entry) => entry !== row);
  return moved;
}
// A stored purse read by value: the character builder accepts fractional gold
// ({gp: 12.5}) and older sheets may hold odd amounts, so fractions become whole gp/sp/cp
// of the same value (12.5 gp → 12 gp 5 sp) instead of refusing the whole sheet; invalid
// or negative amounts count as none. `converted` says the stored value was not whole coins.
export function readPurse(value) {
  const coins = emptyCoins();
  let fractionCp = 0,
    converted = false;
  for (const id of COIN_IDS) {
    const raw = value?.[id];
    if (raw == null || raw === "") continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) {
      converted = true;
      continue;
    }
    coins[id] = Math.floor(n);
    if (coins[id] !== n) {
      converted = true;
      fractionCp += (n - coins[id]) * COIN[id].valueInCp;
    }
  }
  return { coins: addCoins(coins, coinsFromCp(Math.round(fractionCp))), converted };
}
export const purseOf = (actor) => readPurse(actor?.currency).coins;
const rawCoins = (value, lang) =>
  COIN_IDS.filter((id) => value?.[id] != null && value[id] !== "" && value[id] !== 0)
    .map(
      (id) =>
        `${String(value[id]).replace(".", lang === "it" ? "," : ".")} ${coinAbbreviation(id, lang)}`,
    )
    .join(" · ");
// Every B26 write to a purse goes through here: a stored purse that was not in whole coins
// is recorded in the loot log once, when it is rewritten in whole coins.
export function setPurse(slice, role, actor, coins) {
  const { coins: read, converted } = readPurse(actor.currency);
  if (converted && slice && actor.visibility !== "private")
    addLedger(slice, {
      kind: "purse-converted",
      by: role,
      actorIds: [actor.id],
      text: L(
        `Monete di ${actor.name} registrate come ${rawCoins(actor.currency, "it")}: convertite in monete intere, ${formatCoins(read, "it")}`,
        `${actor.name}'s coins recorded as ${rawCoins(actor.currency, "en")}: converted to whole coins, ${formatCoins(read, "en")}`,
      ),
    });
  actor.currency = coins;
  return coins;
}
export function givePurse(actor, coins, slice = null, role = "dm") {
  return setPurse(slice, role, actor, addCoins(purseOf(actor), coins));
}

// ---------------------------------------------------------------- experience

// Character Advancement (SRD 5.2.1 EN 23 / IT 25).
export const XP_THRESHOLDS = Object.freeze([
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000,
  195000, 225000, 265000, 305000, 355000,
]);
export const xpThreshold = (level) => XP_THRESHOLDS[Math.min(20, Math.max(1, level)) - 1];
// Recorded XP; a character with no record starts from the threshold of its current
// level, which is the least XP that level requires (never an invented surplus).
export function xpOf(actor) {
  return Number.isInteger(actor?.xp)
    ? { xp: actor.xp, recorded: true }
    : { xp: xpThreshold(actor?.level ?? 1), recorded: false };
}
export function nextLevelInfo(actor) {
  const { xp } = xpOf(actor);
  const level = actor?.level ?? 1;
  if (level >= 20) return { level, next: null, needed: null, ready: false };
  const needed = xpThreshold(level + 1);
  return { level, next: level + 1, needed, ready: xp >= needed };
}
export function giveXp(actor, amount) {
  const before = xpOf(actor);
  actor.xp = before.xp + amount;
  return { before: before.xp, after: actor.xp, inferredBase: !before.recorded };
}

// ---------------------------------------------------------------- ledger

export function addLedger(slice, entry) {
  const record = {
    id: newId("ledger"),
    time: new Date().toISOString(),
    ...structuredClone(entry),
  };
  slice.ledger.push(record);
  if (slice.ledger.length > 200) slice.ledger.splice(0, slice.ledger.length - 200);
  return record;
}
const names = (state, ids) => ids.map((id) => actorName(state, id)).join(", ");

// ---------------------------------------------------------------- stash domain

function stashItem(slice, id) {
  const item = slice.stash.items.find((entry) => entry.id === id);
  if (!item)
    throw lootError("L'oggetto non è più nella scorta.", "The item is no longer in the stash.");
  return item;
}
function blockedByOther(state, item, actorId) {
  if (item.equippedBy && item.equippedBy !== actorId)
    throw lootError(
      `Equipaggiato da ${actorName(state, item.equippedBy)}: non si sposta né si elimina.`,
      `Equipped by ${actorName(state, item.equippedBy)}: it cannot be moved or deleted.`,
    );
}
export function stashAdd(slice, item, quantity = item.quantity) {
  const target = stackableRow(item)
    ? slice.stash.items.find(
        (row) =>
          stackableRow(row) &&
          ((item.srdId && row.srdId === item.srdId) ||
            (!item.srdId && !row.srdId && sameName(row.name, item.name))),
      )
    : null;
  if (target) {
    target.quantity += quantity;
    return target;
  }
  const row = { ...structuredClone(item), id: newId("stash"), quantity, equippedBy: null };
  slice.stash.items.push(row);
  return row;
}
export function depositItem(state, slice, role, actorId, rowId, quantity) {
  requireMember(state, role);
  const actor = requireControlledMember(state, role, actorId);
  const moved = takeItemFromActor(actor, rowId, quantity);
  stashAdd(slice, moved, quantity);
  addLedger(slice, {
    kind: "stash-deposit",
    by: role,
    actorIds: [actorId],
    text: L(
      `${actor.name} mette nella scorta ${label(moved.name, "it")} ×${quantity}`,
      `${actor.name} puts ${label(moved.name, "en")} ×${quantity} in the stash`,
    ),
  });
}
export function takeFromStash(state, slice, role, stashId, actorId, quantity) {
  requireMember(state, role);
  const actor = requireControlledMember(state, role, actorId);
  const item = stashItem(slice, stashId);
  blockedByOther(state, item, actorId);
  if (item.equippedBy === actorId)
    throw lootError(
      "È equipaggiato dalla scorta: riponilo prima di prenderlo.",
      "It is equipped from the stash: unequip it before taking it.",
    );
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > item.quantity)
    throw lootError(
      `Puoi prenderne da 1 a ${item.quantity}.`,
      `You can take 1 to ${item.quantity}.`,
    );
  giveItemToActor(actor, item, quantity);
  item.quantity -= quantity;
  if (item.quantity === 0) slice.stash.items = slice.stash.items.filter((row) => row !== item);
  addLedger(slice, {
    kind: "stash-take",
    by: role,
    actorIds: [actorId],
    text: L(
      `${actor.name} prende dalla scorta ${label(item.name, "it")} ×${quantity}`,
      `${actor.name} takes ${label(item.name, "en")} ×${quantity} from the stash`,
    ),
  });
}
// DDB: a party item can be equipped while it stays in the party inventory; the list
// shows who equipped it. Equipping a stack equips one unit.
export function toggleStashEquip(state, slice, role, stashId, actorId) {
  requireMember(state, role);
  const actor = requireControlledMember(state, role, actorId);
  let item = stashItem(slice, stashId);
  blockedByOther(state, item, actorId);
  const equipping = item.equippedBy !== actorId;
  if (equipping && item.quantity > 1) {
    item.quantity -= 1;
    item = { ...structuredClone(item), id: newId("stash"), quantity: 1 };
    slice.stash.items.push(item);
  }
  item.equippedBy = equipping ? actorId : null;
  if (!equipping) {
    const twin = slice.stash.items.find(
      (row) =>
        row !== item &&
        stackableRow(row) &&
        stackableRow(item) &&
        row.srdId &&
        row.srdId === item.srdId,
    );
    if (twin) {
      twin.quantity += item.quantity;
      slice.stash.items = slice.stash.items.filter((row) => row !== item);
    }
  }
  addLedger(slice, {
    kind: equipping ? "stash-equip" : "stash-unequip",
    by: role,
    actorIds: [actorId],
    text: equipping
      ? L(
          `${actor.name} equipaggia ${label(item.name, "it")} dalla scorta`,
          `${actor.name} equips ${label(item.name, "en")} from the stash`,
        )
      : L(
          `${actor.name} ripone ${label(item.name, "it")} nella scorta`,
          `${actor.name} unequips ${label(item.name, "en")} in the stash`,
        ),
  });
}
// DDB: the DM can delete any item (it fixes items stuck on removed players); a player
// cannot delete what another character has equipped.
export function removeFromStash(state, slice, role, stashId, reason = "", actorId = null) {
  requireMember(state, role);
  const item = stashItem(slice, stashId);
  if (role !== "dm") {
    if (actorId) requireControlledMember(state, role, actorId);
    blockedByOther(state, item, actorId);
  }
  const why = String(reason ?? "").trim();
  if (!why)
    throw lootError(
      "Scrivi il motivo della rimozione (consumato, perso, venduto fuori scena…).",
      "Write the reason for removing it (used up, lost, sold off-screen…).",
    );
  slice.stash.items = slice.stash.items.filter((row) => row !== item);
  addLedger(slice, {
    kind: "stash-remove",
    by: role,
    actorIds: item.equippedBy ? [item.equippedBy] : [],
    reason: why,
    text: L(
      `Rimosso dalla scorta: ${label(item.name, "it")} ×${item.quantity}`,
      `Removed from the stash: ${label(item.name, "en")} ×${item.quantity}`,
    ),
  });
}
export function depositCoins(state, slice, role, actorId, coins) {
  requireMember(state, role);
  const actor = requireControlledMember(state, role, actorId);
  const amount = normalizeCoins(coins);
  if (isEmptyCoins(amount)) throw lootError("Indica quante monete.", "Enter how many coins.");
  setPurse(slice, role, actor, subtractCoins(purseOf(actor), amount));
  addCoins(slice.stash.coins, amount);
  addLedger(slice, {
    kind: "stash-coins-in",
    by: role,
    actorIds: [actorId],
    coins: amount,
    text: L(
      `${actor.name} deposita ${formatCoins(amount, "it")} nella scorta`,
      `${actor.name} deposits ${formatCoins(amount, "en")} in the stash`,
    ),
  });
}
export function withdrawCoins(state, slice, role, actorId, coins) {
  requireMember(state, role);
  const actor = requireControlledMember(state, role, actorId);
  const amount = normalizeCoins(coins);
  if (isEmptyCoins(amount)) throw lootError("Indica quante monete.", "Enter how many coins.");
  subtractCoins(slice.stash.coins, amount);
  givePurse(actor, amount, slice, role);
  addLedger(slice, {
    kind: "stash-coins-out",
    by: role,
    actorIds: [actorId],
    coins: amount,
    text: L(
      `${actor.name} prende ${formatCoins(amount, "it")} dalla scorta`,
      `${actor.name} takes ${formatCoins(amount, "en")} from the stash`,
    ),
  });
}
// Splits coins evenly among the chosen party members; the remainder is kept in the
// stash. `from` is the stash coins or a parcel's coins (emptied by the split).
export function splitCoinsTo(state, slice, role, from, recipients, context) {
  const ids = [...new Set(recipients)];
  for (const id of ids)
    if (!isPartyMember(state, id))
      throw lootError(
        "Un destinatario non fa parte del gruppo.",
        "A recipient is not in the party.",
      );
  if (isEmptyCoins(from))
    throw lootError("Non ci sono monete da dividere.", "There are no coins to split.");
  const total = { ...from };
  const { share, remainder } = splitCoins(from, ids.length);
  if (isEmptyCoins(share))
    throw lootError(
      "Le monete sono meno dei destinatari: mettile nella scorta.",
      "There are fewer coins than recipients: put them in the stash.",
    );
  for (const id of ids) givePurse(state.actors[id], share, slice, role);
  for (const coin of COIN_IDS) from[coin] = 0;
  addCoins(slice.stash.coins, remainder);
  return addLedger(slice, {
    kind: "coins-split",
    by: role,
    actorIds: ids,
    coins: total,
    share,
    remainder,
    text: L(
      `${context.it}: ${formatCoins(total, "it")} divise tra ${names(state, ids)} (${formatCoins(share, "it")} a testa)${isEmptyCoins(remainder) ? "" : `; resto nella scorta: ${formatCoins(remainder, "it")}`}`,
      `${context.en}: ${formatCoins(total, "en")} split among ${names(state, ids)} (${formatCoins(share, "en")} each)${isEmptyCoins(remainder) ? "" : `; remainder kept in the stash: ${formatCoins(remainder, "en")}`}`,
    ),
  });
}
export function splitStashCoins(state, slice, role, recipients) {
  requireMember(state, role);
  return splitCoinsTo(state, slice, role, slice.stash.coins, recipients, L("Scorta", "Stash"));
}
// Correction with a reason (I-028): the owner or DM records the purse actually held.
export function correctPurse(state, slice, role, actorId, coins, reason) {
  const actor = state.actors?.[actorId];
  if (!actor || !canControlActor(actor, role, state))
    throw lootError("Non puoi correggere questa scheda.", "You cannot correct this sheet.");
  const why = String(reason ?? "").trim();
  if (!why)
    throw lootError("Scrivi il motivo della correzione.", "Write the reason for the correction.");
  const before = purseOf(actor);
  setPurse(slice, role, actor, normalizeCoins(coins));
  if (actor.visibility === "private") return;
  addLedger(slice, {
    kind: "purse-correction",
    by: role,
    actorIds: [actorId],
    reason: why,
    text: L(
      `Correzione monete di ${actor.name}: ${formatCoins(before, "it")} → ${formatCoins(actor.currency, "it")}`,
      `${actor.name}'s coins corrected: ${formatCoins(before, "en")} → ${formatCoins(actor.currency, "en")}`,
    ),
  });
}
export function correctXp(state, slice, role, actorId, xp, reason) {
  const actor = state.actors?.[actorId];
  if (!actor || !canControlActor(actor, role, state))
    throw lootError("Non puoi correggere questa scheda.", "You cannot correct this sheet.");
  if (!Number.isInteger(xp) || xp < 0 || xp > 1_000_000)
    throw lootError(
      "I PE devono essere un numero intero non negativo.",
      "XP must be a non-negative whole number.",
    );
  const why = String(reason ?? "").trim();
  if (!why)
    throw lootError("Scrivi il motivo della correzione.", "Write the reason for the correction.");
  const before = xpOf(actor).xp;
  actor.xp = xp;
  if (actor.visibility === "private") return;
  addLedger(slice, {
    kind: "xp-correction",
    by: role,
    actorIds: [actorId],
    reason: why,
    text: L(
      `Correzione PE di ${actor.name}: ${before} → ${xp}`,
      `${actor.name}'s XP corrected: ${before} → ${xp}`,
    ),
  });
}

// DM identification: the true name replaces the apparent one wherever the item is now
// (parcel, stash, a character inventory or a merchant's buyback); the players then see it.
export function identifyItem(state, slice, role, lootId) {
  if (role !== "dm")
    throw lootError("Solo il DM identifica gli oggetti.", "Only the DM identifies items.");
  const secret = slice.secrets[lootId];
  if (!secret) throw lootError("L'oggetto è già identificato.", "The item is already identified.");
  let apparent = null;
  const reveal = (row, inventory = false) => {
    if (row?.lootId !== lootId) return;
    apparent ??= structuredClone(row.name);
    row.name = structuredClone(secret.name);
    row.description = structuredClone(secret.description);
    if (Number.isInteger(secret.value)) row.value = secret.value;
    // Records saved before identity fields were hidden only carry the catalog id.
    const fields = secret.fields ?? (secret.srdId ? { srdId: secret.srdId } : {});
    for (const [field, value] of Object.entries(fields)) row[field] = structuredClone(value);
    if (inventory) delete row.unidentified;
    else row.identified = true;
  };
  for (const parcel of slice.parcels) parcel.items.forEach((row) => reveal(row));
  slice.stash.items.forEach((row) => reveal(row));
  for (const merchant of slice.merchants) merchant.buyback.forEach((row) => reveal(row.item));
  for (const actor of Object.values(state.actors))
    (actor.inventory ?? []).forEach((row) => reveal(row, true));
  delete slice.secrets[lootId];
  // Identified while still in a hidden parcel: the players learn the name when it is shown.
  const dmOnly = slice.parcels.some(
    (parcel) => !parcel.revealed && parcel.items.some((row) => row.lootId === lootId),
  );
  addLedger(slice, {
    kind: "identify",
    by: role,
    ...(dmOnly ? { dmOnly: true } : {}),
    actorIds: Object.values(state.actors)
      .filter((actor) => actor.inventory?.some((row) => row.lootId === lootId))
      .map((actor) => actor.id),
    text: L(
      `Identificato: ${label(apparent, "it") || "?"} è ${label(secret.name, "it")}`,
      `Identified: ${label(apparent, "en") || "?"} is ${label(secret.name, "en")}`,
    ),
  });
}

// ---------------------------------------------------------------- UI helpers

function label(value, lang) {
  if (value && typeof value === "object") return value[lang] || value.it || value.en || "";
  return String(value ?? "");
}
export const text = label;
export function lootSlice(state) {
  return state?.ext?.[SLICE] ?? null;
}
// Runs a UI command: shows a refusal (offline, invalid operation) as a toast.
export function attempt(ctx, fn) {
  try {
    return fn();
  } catch (error) {
    if (error instanceof TypeError || error instanceof ReferenceError) throw error;
    ctx.toast(
      ctx.label(error?.it ? { it: error.it, en: error.en } : (error?.message ?? error)),
      true,
    );
    return false;
  }
}
// Shared or local commit: a private personal sheet changes locally (like characters.mjs).
// `hidden` keeps a shared change's audit label to its author (DM preparation, cart edits:
// the handouts pattern); `focus` lists selectors to refocus after the re-render, after the
// control that ran the command (or before it with `focusFirst`, e.g. a newly created item).
export function commitLoot(
  ctx,
  labelText,
  mutate,
  { actor = null, hidden = false, focus = null, focusFirst = false } = {},
) {
  if (focus)
    focusRequest = focusFirst
      ? [...[].concat(focus), ...(focusRequest ?? [])]
      : [...(focusRequest ?? []), ...[].concat(focus)];
  try {
    return ctx.commit(
      labelText,
      (draft) => mutate(draft, draft.ext[SLICE]),
      actor?.visibility === "private"
        ? { local: true, visibility: "private" }
        : hidden
          ? { visibility: "private" }
          : {},
    );
  } finally {
    settleFocus();
  }
}
// Keyboard focus survives the shell's full re-render: the command names where focus goes
// (the same control, else its parcel heading) and the re-bound area moves it there. After
// a dialog closes the browser may drop focus on <body>; the deferred pass catches that.
let focusRequest = null;
export function requestFocus(selectors) {
  focusRequest = selectors ? [].concat(selectors) : null;
}
export function restoreFocus(el) {
  if (!focusRequest || !el?.querySelector) return;
  for (const selector of focusRequest) {
    const target = el.querySelector(selector);
    if (!target || target.disabled) continue;
    focusRequest = null;
    focusTarget(target);
    return;
  }
}
function focusTarget(target) {
  target.focus?.();
  globalThis.setTimeout?.(() => {
    const active = globalThis.document?.activeElement;
    if (target.isConnected && (!active || active === globalThis.document.body)) target.focus();
  }, 0);
}
// After the command: when no re-bound loot area took the focus (the drawer closed because
// everything was handed out), the first target still on the page takes it, else the map.
function settleFocus() {
  const pending = focusRequest;
  focusRequest = null;
  const doc = globalThis.document;
  if (!pending || !doc?.querySelector) return;
  const active = doc.activeElement;
  if (active && active !== doc.body && active.isConnected) return;
  for (const selector of [...pending, "#battle-map", "#content"]) {
    const target = doc.querySelector(selector);
    if (target && !target.disabled) return focusTarget(target);
  }
}
export const cssId = (value) =>
  globalThis.CSS?.escape?.(value) ?? String(value).replace(/["\\]/g, "\\$&");
// "The same control" after a re-render, from its stable data attributes.
const STABLE = [
  "loot",
  "lootForm",
  "id",
  "item",
  "lootId",
  "kind",
  "ref",
  "cart",
  "line",
  "stock",
  "step",
];
export function sameControl(control) {
  const attrs = STABLE.filter((key) => control?.dataset?.[key] != null)
    .map(
      (key) =>
        `[data-${key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}="${cssId(control.dataset[key])}"]`,
    )
    .join("");
  return control?.tagName === "FORM" ? `form${attrs} [type="submit"]` : attrs;
}
// Runs a bound command with focus defaulting to the same control after the re-render.
export function withFocus(control, run) {
  requestFocus(sameControl(control));
  try {
    return run();
  } finally {
    settleFocus();
  }
}
export function coinInputs(ctx, values = emptyCoins(), prefix = "") {
  return `<div class="loot-coin-inputs">${COIN_IDS.map(
    (id) =>
      `<label class="field"><span title="${ctx.esc(ctx.label(coinName(id)))}">${ctx.esc(ctx.label(coinShortName(id)))} (${ctx.esc(coinAbbreviation(id, ctx.lang))})</span><input type="number" inputmode="numeric" min="0" step="1" name="${prefix}${id}" value="${values[id] ?? 0}"></label>`,
  ).join("")}</div>`;
}
export function readCoins(data, prefix = "") {
  return normalizeCoins(Object.fromEntries(COIN_IDS.map((id) => [id, data.get(prefix + id) ?? 0])));
}
export function itemName(ctx, item, slice) {
  const secret = ctx.role === "dm" && item.lootId ? slice?.secrets?.[item.lootId] : null;
  return secret
    ? `${ctx.esc(ctx.label(item.name))} <span class="loot-secret">(${ctx.t("in realtà", "actually")}: ${ctx.esc(ctx.label(secret.name))})</span>`
    : ctx.esc(ctx.label(item.name));
}
export function unidentifiedBadge(ctx, item) {
  return item.identified === false || item.unidentified
    ? `<span class="badge loot-badge-unknown">${ctx.t("Non identificato", "Unidentified")}</span>`
    : "";
}
export function ledgerList(ctx, entries, limit = 6) {
  const rows = entries
    .filter((entry) => !entry.dmOnly || ctx.role === "dm")
    .slice(-limit)
    .reverse();
  if (!rows.length)
    return `<p class="muted">${ctx.t("Nessun movimento registrato.", "No movements recorded yet.")}</p>`;
  const time = (iso) =>
    new Date(iso).toLocaleTimeString(ctx.lang === "it" ? "it-IT" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  return `<ol class="loot-ledger">${rows
    .map(
      (entry) =>
        `<li><small>${time(entry.time)} · ${entry.by === "dm" ? "DM" : ctx.t("Giocatore", "Player")}</small>${ctx.esc(ctx.label(entry.text))}${entry.reason ? `<small>${ctx.t("Motivo", "Reason")}: ${ctx.esc(entry.reason)}</small>` : ""}</li>`,
    )
    .join("")}</ol>`;
}
function undoButton(ctx) {
  return ctx.canUndo?.()
    ? `<button type="button" class="button quiet" data-loot="undo">${ctx.icon?.("undo") ?? ""} ${ctx.t("Annulla", "Undo")}: ${ctx.esc(ctx.undoLabel?.() ?? "")}</button>`
    : "";
}
export { undoButton };

// ---------------------------------------------------------------- sheet: coins

export function renderPurse(ctx, actor) {
  const slice = lootSlice(ctx.state);
  const purse = purseOf(actor);
  const converted = readPurse(actor.currency).converted
    ? `<p class="muted loot-note" data-loot-purse-converted>${ctx.t(`Registrate come ${ctx.esc(rawCoins(actor.currency, "it"))}: contate per valore in monete intere (1 mo = 10 ma = 100 mr). Alla prossima modifica restano così.`, `Recorded as ${ctx.esc(rawCoins(actor.currency, "en"))}: counted by value in whole coins (1 GP = 10 SP = 100 CP). The next change stores them this way.`)}</p>`
    : "";
  const control = ctx.canControl(actor);
  const moves = (slice?.ledger ?? []).filter((entry) => entry.actorIds?.includes(actor.id));
  return `<section class="panel loot-panel loot-purse" aria-labelledby="loot-purse-${ctx.esc(actor.id)}"><div class="section-heading"><h2 id="loot-purse-${ctx.esc(actor.id)}">${ctx.t("Monete", "Coins")}</h2>${control ? `<button type="button" class="button quiet" data-loot="purse-correct">${ctx.t("Correggi monete", "Correct coins")}</button>` : ""}</div><dl class="loot-coins">${COIN_IDS.map(
    (id) =>
      `<div class="loot-coin loot-coin-${id}"><dt title="${ctx.esc(ctx.label(coinName(id)))}">${ctx.esc(coinAbbreviation(id, ctx.lang))}</dt><dd data-loot-coin="${id}">${purse[id]}</dd></div>`,
  ).join(
    "",
  )}</dl><p class="muted">${ctx.t("Valore", "Value")}: ${ctx.esc(formatCp(coinsValue(purse), ctx.lang))} · ${ctx.t("peso", "weight")} ${String(coinsWeightKg(purse)).replace(".", ctx.lang === "it" ? "," : ".")} kg <small>(${ctx.t("50 monete = 0,5 kg, SRD 5.2.1", "50 coins = 1 lb, SRD 5.2.1")})</small></p>${converted}${moves.length ? `<details class="loot-details"><summary>${ctx.t("Ultimi movimenti", "Latest movements")}</summary>${ledgerList(ctx, moves, 5)}</details>` : ""}</section>`;
}
export function bindPurse(el, ctx, actor) {
  el.addEventListener("click", (event) => {
    const control = event.target.closest?.("[data-loot]");
    if (!control || !el.contains(control)) return;
    if (control.dataset.loot === "purse-correct") openPurseCorrection(ctx, actor.id);
  });
  restoreFocus(el);
}
export function openPurseCorrection(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  ctx.dialog(
    ctx.t(`Correggi le monete di ${actor.name}`, `Correct ${actor.name}'s coins`),
    `<p class="muted">${ctx.t("Registra le monete che il personaggio ha davvero. La correzione resta nel registro con il motivo.", "Record the coins the character actually has. The correction stays in the log with its reason.")}</p>${coinInputs(ctx, purseOf(actor))}<label class="field"><span>${ctx.t("Motivo", "Reason")}</span><input name="reason" required maxlength="200" placeholder="${ctx.t("Es. spese in città tra le sessioni", "E.g. town expenses between sessions")}"></label>`,
    {
      submitLabel: ctx.t("Salva correzione", "Save correction"),
      onSubmit: (data) => {
        const coins = readCoins(data);
        commitLoot(
          ctx,
          ctx.t(`Monete corrette: ${actor.name}`, `Coins corrected: ${actor.name}`),
          (draft, slice) =>
            correctPurse(draft, slice, ctx.role, actorId, coins, data.get("reason")),
          { actor, focus: '[data-loot="purse-correct"]' },
        );
      },
    },
  );
}

// ---------------------------------------------------------------- sheet: experience

export function renderXp(ctx, actor) {
  const slice = lootSlice(ctx.state);
  const { xp, recorded } = xpOf(actor);
  const next = nextLevelInfo(actor);
  const control = ctx.canControl(actor);
  const floor = xpThreshold(actor.level ?? 1);
  // Recorded XP can sit below the current level's threshold (a correction, a level set by
  // hand): the bar stays empty and says so; the sheet's level is not changed.
  const below = recorded && xp < floor;
  const pct = next.needed
    ? Math.max(0, Math.min(100, Math.round((100 * (xp - floor)) / (next.needed - floor))))
    : 100;
  const awards = (slice?.ledger ?? []).filter(
    (entry) => entry.actorIds?.includes(actor.id) && /xp|award/.test(entry.kind),
  );
  const fmt = (n) => group(n, ctx.lang);
  return `<section class="panel loot-panel loot-xp" aria-labelledby="loot-xp-${ctx.esc(actor.id)}"><div class="section-heading"><h2 id="loot-xp-${ctx.esc(actor.id)}">${ctx.t("Esperienza", "Experience")}</h2>${control ? `<button type="button" class="button quiet" data-loot="xp-correct">${ctx.t("Correggi PE", "Correct XP")}</button>` : ""}</div><p class="loot-xp-total"><strong data-loot-xp>${fmt(xp)} ${ctx.t("PE", "XP")}</strong> · ${ctx.t("livello", "level")} ${actor.level ?? 1}${recorded ? "" : ` <span class="badge">${ctx.t(`Non registrati: soglia del livello ${actor.level ?? 1}`, `Not recorded: level ${actor.level ?? 1} threshold`)}</span>`}</p>${below ? `<p class="muted loot-note" data-loot-xp-below>${ctx.t(`Sotto la soglia del livello ${actor.level ?? 1} (${fmt(floor)} PE): il livello della scheda non cambia.`, `Below the level ${actor.level ?? 1} threshold (${fmt(floor)} XP): the sheet's level does not change.`)}</p>` : ""}${
    next.next
      ? `<div class="loot-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-label="${ctx.t("Verso il livello", "Towards level")} ${next.next}"><span style="width:${pct}%"></span></div><p class="muted">${
          next.ready
            ? control
              ? ctx.t(
                  `Soglia del livello ${next.next} raggiunta (${fmt(next.needed)} PE): usa «Avanza di livello» in alto.`,
                  `Level ${next.next} threshold reached (${fmt(next.needed)} XP): use “Level up” above.`,
                )
              : ctx.t(
                  `Soglia del livello ${next.next} raggiunta (${fmt(next.needed)} PE): chi controlla il personaggio può avanzare di livello.`,
                  `Level ${next.next} threshold reached (${fmt(next.needed)} XP): the character's controller can level up.`,
                )
            : ctx.t(
                `Livello ${next.next} a ${fmt(next.needed)} PE (mancano ${fmt(next.needed - xp)}).`,
                `Level ${next.next} at ${fmt(next.needed)} XP (${fmt(next.needed - xp)} to go).`,
              )
        } <small>${ctx.t("Tabella Avanzamento del personaggio, SRD 5.2.1", "Character Advancement table, SRD 5.2.1")}</small></p>`
      : ""
  }${awards.length ? `<details class="loot-details" open><summary>${ctx.t("Assegnazioni e correzioni", "Awards and corrections")}</summary>${ledgerList(ctx, awards, 6)}</details>` : ""}</section>`;
}
export function bindXp(el, ctx, actor) {
  el.addEventListener("click", (event) => {
    const control = event.target.closest?.("[data-loot]");
    if (!control || !el.contains(control) || control.dataset.loot !== "xp-correct") return;
    const current = ctx.state.actors[actor.id];
    ctx.dialog(
      ctx.t(`Correggi i PE di ${current.name}`, `Correct ${current.name}'s XP`),
      `<label class="field"><span>${ctx.t("Punti esperienza totali", "Total experience points")}</span><input type="number" name="xp" min="0" step="1" inputmode="numeric" value="${xpOf(current).xp}"></label><label class="field"><span>${ctx.t("Motivo", "Reason")}</span><input name="reason" required maxlength="200"></label>`,
      {
        submitLabel: ctx.t("Salva correzione", "Save correction"),
        onSubmit: (data) =>
          commitLoot(
            ctx,
            ctx.t(`PE corretti: ${current.name}`, `XP corrected: ${current.name}`),
            (draft, slice) =>
              correctXp(
                draft,
                slice,
                ctx.role,
                actor.id,
                Number(data.get("xp")),
                data.get("reason"),
              ),
            { actor: current, focus: '[data-loot="xp-correct"]' },
          ),
      },
    );
  });
  restoreFocus(el);
}

// ---------------------------------------------------------------- sheet and campaign: stash

export function stashVisibleTo(ctx, actor = null) {
  if (!isMember(ctx.state, ctx.role)) return false;
  return !actor || isPartyMember(ctx.state, actor.id);
}
function stashRow(ctx, slice, item, actor) {
  const equippedBy = item.equippedBy ? ctx.state.actors[item.equippedBy] : null;
  const mine = actor && item.equippedBy === actor.id;
  const control = actor && ctx.canControl(actor);
  const lockedReason =
    equippedBy && !mine
      ? ctx.t(
          `Equipaggiato da ${equippedBy.name}: non si sposta né si elimina.`,
          `Equipped by ${equippedBy.name}: it cannot be moved or deleted.`,
        )
      : "";
  const canRemove = ctx.role === "dm" || !equippedBy || mine;
  const reasonId = `loot-lock-${ctx.esc(item.id)}`;
  const disabled = lockedReason ? ` disabled aria-describedby="${reasonId}"` : "";
  const identify =
    ctx.role === "dm" && item.identified === false
      ? `<button type="button" class="button" data-loot="identify" data-loot-id="${ctx.esc(item.lootId)}">${ctx.t("Identifica", "Identify")}</button>`
      : "";
  return `<li class="loot-row" data-stash-item="${ctx.esc(item.id)}"><div class="loot-row-copy"><strong>${itemName(ctx, item, slice)}</strong> <span class="muted">×${item.quantity}</span> ${unidentifiedBadge(ctx, item)}${equippedBy ? ` <span class="badge loot-badge-equipped" data-loot-equipped-by="${ctx.esc(equippedBy.id)}">${holderPortrait(ctx, equippedBy)}${mine ? ctx.t("Equipaggiato da te", "Equipped by you") : ctx.t(`Equipaggiato da ${ctx.esc(equippedBy.name)}`, `Equipped by ${ctx.esc(equippedBy.name)}`)}</span>` : ""}${lockedReason ? `<small id="${reasonId}">${lockedReason}</small>` : ""}</div>${
    control
      ? `<div class="toolbar loot-row-actions">${identify}<button type="button" class="button" data-loot="stash-take" data-id="${ctx.esc(item.id)}"${disabled || (mine ? ` disabled aria-describedby="${reasonId}-mine"` : "")}>${ctx.t("Prendi", "Take")}</button><button type="button" class="button" data-loot="stash-equip" data-id="${ctx.esc(item.id)}"${disabled}>${mine ? ctx.t("Riponi", "Unequip") : ctx.t("Equipaggia", "Equip")}</button>${canRemove ? `<button type="button" class="button quiet" data-loot="stash-remove" data-id="${ctx.esc(item.id)}">${ctx.t("Rimuovi", "Remove")}</button>` : `<button type="button" class="button quiet" data-loot="stash-remove" data-id="${ctx.esc(item.id)}" disabled aria-describedby="${reasonId}">${ctx.t("Rimuovi", "Remove")}</button>`}${mine ? `<small id="${reasonId}-mine" class="muted">${ctx.t("Riponilo per prenderlo nel tuo inventario.", "Unequip it to take it into your inventory.")}</small>` : ""}</div>`
      : ctx.role === "dm"
        ? `<div class="toolbar loot-row-actions">${identify}<button type="button" class="button quiet" data-loot="stash-remove" data-id="${ctx.esc(item.id)}">${ctx.t("Rimuovi", "Remove")}</button></div>`
        : ""
  }</li>`;
}
// BG3 "equipped by" (CRP-020): the holder's portrait beside a shared item, else the
// initial the token shows.
export function holderPortrait(ctx, actor) {
  const art = actor ? portraitArt(ctx.state, actor.id) : null;
  const asset = art?.asset;
  if (
    asset &&
    asset.kind !== "pdf" &&
    isDataUrl(asset.dataUrl) &&
    canSeeAsset(ctx.state, asset, ctx.role)
  )
    return `<span class="loot-holder has-image" aria-hidden="true"><img src="${ctx.esc(asset.dataUrl)}" alt=""></span>`;
  return `<span class="loot-holder" aria-hidden="true">${ctx.esc(String(actor?.name ?? "?").slice(0, 1))}</span>`;
}
// The campaign's «Inventario del gruppo» (D&D Beyond campaign Party Inventory, DDB-052):
// the shared stash with who holds what (BG3 portraits), the party's purses and experience,
// and the log. A player acts as one of their own party characters (take, equip, deposit);
// the DM manages, awards XP and coins, and edits the campaign currencies.
const partyUi = { actorId: null };
export function resetPartyInventoryUI() {
  partyUi.actorId = null;
}
export function partyInventoryActor(ctx) {
  if (ctx.role === "dm") return { actor: null, mine: [] };
  const mine = partyMembers(ctx.state).filter((actor) => ctx.canControl(actor));
  if (!mine.some((actor) => actor.id === partyUi.actorId)) partyUi.actorId = mine[0]?.id ?? null;
  return { actor: mine.find((actor) => actor.id === partyUi.actorId) ?? null, mine };
}
export function renderPartyInventory(ctx) {
  const slice = lootSlice(ctx.state);
  if (!slice || !isMember(ctx.state, ctx.role))
    return `<p class="empty-state">${ctx.t("L’inventario del gruppo è riservato ai membri della campagna.", "The party inventory is for campaign members.")}</p>`;
  const { actor, mine } = partyInventoryActor(ctx);
  const members = partyMembers(ctx.state);
  const holders = members
    .map((member) => ({ member, items: stashEquippedBy(slice, member.id) }))
    .filter((row) => row.items.length);
  const heading = `<header class="page-heading loot-party-heading"><div><p class="loot-crumb"><button type="button" class="text-button" data-loot-party-crumb>${ctx.t("Gruppo", "Party")}</button> <span aria-hidden="true">›</span></p><h1 tabindex="-1" data-campaign-heading>${ctx.t("Inventario del gruppo", "Party inventory")}</h1><p class="muted">${ctx.esc(ctx.label(ctx.state.campaign?.name ?? ""))} · ${ctx.t("scorta comune, monete e tesoro", "shared stash, coins and treasure")}</p></div>${ctx.role === "dm" ? `<div class="toolbar"><button type="button" class="button primary" data-loot="award-open">${ctx.t("Assegna PE e monete", "Award XP and coins")}</button><button type="button" class="button quiet" data-loot="currencies-open">${ctx.t("Valute della campagna", "Campaign currencies")}</button></div>` : ""}</header>`;
  const pick =
    mine.length > 1
      ? `<label class="field loot-inline-select"><span>${ctx.t("Agisci come", "Act as")}</span><select data-loot-party-actor>${mine.map((m) => `<option value="${ctx.esc(m.id)}"${m.id === actor?.id ? " selected" : ""}>${ctx.esc(m.name)}</option>`).join("")}</select></label>`
      : actor
        ? `<p class="muted">${ctx.t("Agisci come", "Act as")}: <strong>${ctx.esc(actor.name)}</strong></p>`
        : "";
  const holdersHtml = `<section class="panel loot-panel loot-party-holders" data-loot-party-holders aria-labelledby="loot-party-holders-title"><div class="section-heading"><h2 id="loot-party-holders-title">${ctx.t("Chi ha equipaggiato cosa", "Who has equipped what")}</h2></div>${
    holders.length
      ? `<ul class="loot-holder-list">${holders
          .map(
            ({ member, items }) =>
              `<li class="loot-holder-row">${holderPortrait(ctx, member)}<div><strong>${ctx.esc(member.name)}</strong><small>${items.map((item) => itemName(ctx, item, slice)).join(", ")}</small></div></li>`,
          )
          .join("")}</ul>`
      : `<p class="muted">${ctx.t("Nessun oggetto della scorta è equipaggiato.", "No stash item is equipped.")}</p>`
  }</section>`;
  const membersHtml = `<section class="panel loot-panel"><div class="section-heading"><h2>${ctx.t("Il gruppo", "The party")}</h2></div><ul class="loot-list">${members
    .map((member) => {
      const purse = member.currency
        ? formatCoins(purseOf(member), ctx.lang)
        : ctx.t("nessuna moneta registrata", "no coins recorded");
      const controlled = canControlActor(member, ctx.role, ctx.state);
      return `<li class="loot-row">${holderPortrait(ctx, member)}<div class="loot-row-copy"><strong>${ctx.esc(member.name)}</strong><small>${ctx.esc(purse)} · ${Number.isInteger(member.xp) ? member.xp + " " + ctx.t("PE", "XP") : ctx.t("PE non registrati", "XP not recorded")}</small></div>${controlled || ctx.role === "dm" ? `<button type="button" class="button quiet" data-loot="open-sheet" data-id="${ctx.esc(member.id)}">${ctx.t("Apri inventario", "Open inventory")}</button>` : ""}</li>`;
    })
    .join("")}</ul></section>`;
  return `<section class="loot-treasury loot-party-page">${heading}${pick}<div class="loot-treasury-grid">${renderStash(ctx, actor, { heading: 2 })}<div class="loot-party-side">${holdersHtml}${membersHtml}</div></div><section class="panel loot-panel"><div class="section-heading"><h2>${ctx.t("Registro", "Log")}</h2></div>${ledgerList(ctx, slice.ledger, 20)}${undoButton(ctx)}</section></section>`;
}
// The page's own controls (the loot area binds its award and sheet buttons).
export function bindPartyInventory(el, ctx) {
  el.querySelector("[data-loot-party-crumb]")?.addEventListener("click", () =>
    ctx.navigate("campaign", { tab: "group" }),
  );
  el.querySelector("[data-loot-party-actor]")?.addEventListener("change", (event) => {
    partyUi.actorId = event.target.value;
    requestFocus("[data-loot-party-actor]");
    try {
      ctx.render();
    } finally {
      requestFocus(null);
    }
  });
  const stashEl = el.querySelector(".loot-stash");
  if (stashEl) bindStash(stashEl, ctx, partyInventoryActor(ctx).actor);
  restoreFocus(el);
}
export function renderStash(ctx, actor = null, { heading = 2, compact = false } = {}) {
  const slice = lootSlice(ctx.state);
  if (!slice || !stashVisibleTo(ctx, actor)) return "";
  const control = actor && ctx.canControl(actor);
  const h = `h${heading}`;
  const inventory = (actor?.inventory ?? []).filter(
    (row) => row.quantity > 0 && !row.equipped && row.location !== "ground",
  );
  const items = slice.stash.items;
  return `<section class="panel loot-panel loot-stash" aria-labelledby="loot-stash-title${actor ? "-" + ctx.esc(actor.id) : ""}"><div class="section-heading"><${h} id="loot-stash-title${actor ? "-" + ctx.esc(actor.id) : ""}" tabindex="-1">${ctx.t("Scorta del gruppo", "Party stash")}</${h}><span class="muted">${ctx.esc(ctx.state.campaign?.name ?? "")}</span></div><div class="loot-stash-coins"><p><strong data-loot-stash-coins>${ctx.esc(formatCoins(slice.stash.coins, ctx.lang))}</strong> <span class="muted">${ctx.t("monete comuni", "shared coins")}</span></p><div class="toolbar">${control ? `<button type="button" class="button" data-loot="stash-withdraw">${ctx.t("Prendi monete", "Take coins")}</button><button type="button" class="button" data-loot="stash-deposit-coins">${ctx.t("Deposita monete", "Deposit coins")}</button>` : ""}${!isEmptyCoins(slice.stash.coins) && (control || ctx.role === "dm") ? `<button type="button" class="button quiet" data-loot="stash-split">${ctx.t("Dividi tra il gruppo", "Split among the party")}</button>` : ""}</div></div>${
    items.length
      ? `<ul class="loot-list">${items.map((item) => stashRow(ctx, slice, item, actor)).join("")}</ul>`
      : `<p class="muted">${ctx.t("La scorta è vuota.", "The stash is empty.")}</p>`
  }${
    control && !compact
      ? inventory.length
        ? `<form class="loot-inline-form" data-loot-form="stash-deposit"><label class="field"><span>${ctx.t("Metti nella scorta dal tuo inventario", "Put in the stash from your inventory")}</span><select name="row">${inventory
            .map(
              (row) =>
                `<option value="${ctx.esc(row.id)}">${ctx.esc(ctx.label(row.name))} ×${row.quantity}</option>`,
            )
            .join(
              "",
            )}</select></label><label class="field loot-qty"><span>${ctx.t("Quantità", "Quantity")}</span><input type="number" name="quantity" min="1" step="1" value="1" inputmode="numeric"></label><button class="button" type="submit">${ctx.t("Metti nella scorta", "Put in stash")}</button></form>`
        : `<p class="muted loot-deposit-empty">${ctx.t("Niente da mettere nella scorta: gli oggetti equipaggiati restano al personaggio.", "Nothing to put in the stash: equipped items stay with the character.")}</p>`
      : ""
  }<p class="muted loot-source">${ctx.t("Come la Party Inventory di D&D Beyond: chi equipaggia un oggetto comune lo blocca per gli altri e lo vede tra le proprie Azioni; l'oggetto resta nella scorta. Gli effetti degli oggetti non sono calcolati automaticamente.", "Like D&D Beyond's Party Inventory: whoever equips a shared item locks it for the others and sees it in their Actions; the item stays in the stash. Item effects are not calculated automatically.")}</p></section>`;
}
const DAMAGE_TYPE = {
  slashing: L("taglienti", "Slashing"),
  piercing: L("perforanti", "Piercing"),
  bludgeoning: L("contundenti", "Bludgeoning"),
};
export const weaponDamage = (ctx, weapon) =>
  weapon?.damage?.dice
    ? `${weapon.damage.dice} ${ctx.label(DAMAGE_TYPE[weapon.damage.type] ?? weapon.damage.type)}`
    : "";
export const stashEquippedBy = (slice, actorId) =>
  (slice?.stash?.items ?? []).filter((item) => item.equippedBy === actorId);
// DDB-052: a party item someone equipped counts as theirs. The character's Actions list
// it (read only, "from the stash"); it stays in the stash, where it is unequipped or taken.
export function renderStashEquipped(ctx, actor) {
  const slice = lootSlice(ctx.state);
  const items = stashEquippedBy(slice, actor.id);
  return `<section class="panel loot-panel loot-stash-equipped" aria-labelledby="loot-equipped-${ctx.esc(actor.id)}"><div class="section-heading"><h2 id="loot-equipped-${ctx.esc(actor.id)}">${ctx.t("Equipaggiati dalla scorta del gruppo", "Equipped from the party stash")}</h2></div><ul class="loot-list">${items
    .map(
      (item) =>
        `<li class="loot-row"><div class="loot-row-copy"><strong>${itemName(ctx, item, slice)}</strong> <span class="badge loot-badge-equipped">${ctx.t("dalla scorta", "from the stash")}</span> ${unidentifiedBadge(ctx, item)}<small>${item.weapon ? ctx.t("Arma equipaggiata", "Equipped weapon") + " · " + ctx.esc(weaponDamage(ctx, item.weapon)) : item.armor ? ctx.t("Armatura o scudo equipaggiato", "Equipped armor or shield") : ctx.t("Oggetto equipaggiato", "Equipped item")}</small></div></li>`,
    )
    .join(
      "",
    )}</ul><p class="muted">${ctx.t("Restano nella scorta: riponili o prendili da Inventario → Scorta del gruppo. Tiri ed effetti di questi oggetti non sono calcolati automaticamente.", "They stay in the stash: unequip or take them from Inventory → Party stash. Their rolls and effects are not calculated automatically.")}</p>${ctx.canControl(actor) ? `<button type="button" class="button quiet" data-loot="open-inventory">${ctx.t("Vai alla scorta", "Go to the stash")}</button>` : ""}</section>`;
}
export function bindStash(el, ctx, actor = null) {
  el.addEventListener("click", (event) => {
    const control = event.target.closest?.("[data-loot]");
    if (!control || !el.contains(control) || control.disabled) return;
    withFocus(control, () =>
      handleStashAction(ctx, control.dataset.loot, control.dataset, actor?.id ?? null),
    );
  });
  el.addEventListener("submit", (event) => {
    const form = event.target.closest?.("form[data-loot-form]");
    if (!form || !el.contains(form)) return;
    event.preventDefault();
    withFocus(form, () =>
      handleStashAction(
        ctx,
        form.dataset.lootForm,
        form.dataset,
        actor?.id ?? null,
        new FormData(form),
      ),
    );
  });
  restoreFocus(el);
}
const STASH_HEADING = '[id^="loot-stash-title"]';
// Exported for tests: the same handler the bound controls call.
export function handleStashAction(ctx, action, data, actorId, form = null) {
  const actor = actorId ? ctx.state.actors[actorId] : null;
  const who = actor?.name ?? "";
  return attempt(ctx, () => {
    switch (action) {
      case "undo":
        return ctx.undo();
      case "open-inventory":
        return ctx.openSheet(actorId, "inventory");
      case "stash-take": {
        const item = lootSlice(ctx.state).stash.items.find((row) => row.id === data.id);
        if (!item) return;
        if (item.quantity > 1)
          return openQuantity(
            ctx,
            ctx.t("Prendi dalla scorta", "Take from the stash"),
            item,
            (quantity) =>
              commitLoot(
                ctx,
                ctx.t(`${who} prende dalla scorta`, `${who} takes from the stash`),
                (draft, slice) => takeFromStash(draft, slice, ctx.role, data.id, actorId, quantity),
                { focus: STASH_HEADING },
              ),
          );
        return commitLoot(
          ctx,
          ctx.t(`${who} prende dalla scorta`, `${who} takes from the stash`),
          (draft, slice) => takeFromStash(draft, slice, ctx.role, data.id, actorId, 1),
          { focus: STASH_HEADING },
        );
      }
      case "identify":
        return commitLoot(ctx, ctx.t("Oggetto identificato", "Item identified"), (draft, slice) =>
          identifyItem(draft, slice, ctx.role, data.lootId),
        );
      case "stash-equip":
        return commitLoot(
          ctx,
          ctx.t(`Scorta: equipaggiamento di ${who}`, `Stash: ${who}'s equipment`),
          (draft, slice) => toggleStashEquip(draft, slice, ctx.role, data.id, actorId),
        );
      case "stash-remove":
        return ctx.dialog(
          ctx.t("Rimuovi dalla scorta", "Remove from the stash"),
          `<p>${ctx.t("L'oggetto esce dal gioco (consumato, perso, distrutto). Resta traccia nel registro.", "The item leaves play (used up, lost, destroyed). The log keeps a trace.")}</p><label class="field"><span>${ctx.t("Motivo", "Reason")}</span><input name="reason" required maxlength="200"></label>`,
          {
            submitLabel: ctx.t("Rimuovi", "Remove"),
            onSubmit: (formData) =>
              commitLoot(
                ctx,
                ctx.t("Oggetto rimosso dalla scorta", "Item removed from the stash"),
                (draft, slice) =>
                  removeFromStash(draft, slice, ctx.role, data.id, formData.get("reason"), actorId),
                { focus: STASH_HEADING },
              ),
          },
        );
      case "stash-deposit": {
        const quantity = Number(form.get("quantity"));
        return commitLoot(
          ctx,
          ctx.t(`${who} mette nella scorta`, `${who} puts in the stash`),
          (draft, slice) => depositItem(draft, slice, ctx.role, actorId, form.get("row"), quantity),
          { focus: STASH_HEADING },
        );
      }
      case "stash-withdraw":
      case "stash-deposit-coins": {
        const withdraw = action === "stash-withdraw";
        return ctx.dialog(
          withdraw
            ? ctx.t("Prendi monete dalla scorta", "Take coins from the stash")
            : ctx.t("Deposita monete nella scorta", "Deposit coins in the stash"),
          `<p class="muted">${withdraw ? ctx.t("Nella scorta", "In the stash") + ": " + ctx.esc(formatCoins(lootSlice(ctx.state).stash.coins, ctx.lang)) : ctx.t("Nella borsa di ", "In the purse of ") + ctx.esc(who) + ": " + ctx.esc(formatCoins(purseOf(actor), ctx.lang))}</p>${coinInputs(ctx)}`,
          {
            submitLabel: withdraw ? ctx.t("Prendi", "Take") : ctx.t("Deposita", "Deposit"),
            onSubmit: (formData) => {
              const coins = readCoins(formData);
              commitLoot(
                ctx,
                withdraw
                  ? ctx.t(`${who} prende monete dalla scorta`, `${who} takes coins from the stash`)
                  : ctx.t(`${who} deposita monete`, `${who} deposits coins`),
                (draft, slice) =>
                  (withdraw ? withdrawCoins : depositCoins)(draft, slice, ctx.role, actorId, coins),
                { focus: [`[data-loot="${action}"]`, STASH_HEADING] },
              );
            },
          },
        );
      }
      case "stash-split":
        return openSplit(
          ctx,
          lootSlice(ctx.state).stash.coins,
          ctx.t("Dividi le monete della scorta", "Split the stash coins"),
          (recipients) =>
            commitLoot(
              ctx,
              ctx.t("Monete della scorta divise", "Stash coins split"),
              (draft, slice) => splitStashCoins(draft, slice, ctx.role, recipients),
              { focus: STASH_HEADING },
            ),
        );
    }
  });
}
export function openQuantity(ctx, title, item, done) {
  ctx.dialog(
    title,
    `<p><strong>${ctx.esc(ctx.label(item.name))}</strong> · ${ctx.t("disponibili", "available")}: ${item.quantity}</p><label class="field"><span>${ctx.t("Quantità", "Quantity")}</span><input type="number" name="quantity" min="1" max="${item.quantity}" step="1" value="${item.quantity}" inputmode="numeric"></label>`,
    {
      submitLabel: ctx.t("Conferma", "Confirm"),
      onSubmit: (data) => done(Number(data.get("quantity"))),
    },
  );
}
// Split dialog with the party members checked (FG "Distribute"); the live preview shows
// each share and the remainder that stays in the stash.
export function openSplit(ctx, coins, title, done) {
  const members = partyMembers(ctx.state);
  const preview = (count) => {
    if (!count) return ctx.t("Scegli almeno un destinatario.", "Choose at least one recipient.");
    const { share, remainder } = splitCoins(coins, count);
    return (
      ctx.t("A testa", "Each") +
      ": " +
      formatCoins(share, ctx.lang) +
      (isEmptyCoins(remainder)
        ? ""
        : " · " +
          ctx.t("resto nella scorta", "remainder to the stash") +
          ": " +
          formatCoins(remainder, ctx.lang))
    );
  };
  ctx.dialog(
    title,
    `<p><strong>${ctx.esc(formatCoins(coins, ctx.lang))}</strong></p><fieldset class="loot-recipients"><legend>${ctx.t("Destinatari", "Recipients")}</legend>${members
      .map(
        (actor) =>
          `<label class="loot-check"><input type="checkbox" name="recipient" value="${ctx.esc(actor.id)}" checked> ${ctx.esc(actor.name)}</label>`,
      )
      .join(
        "",
      )}</fieldset><p class="loot-preview" data-loot-split-preview aria-live="polite">${ctx.esc(preview(members.length))}</p><p class="muted">${ctx.t("Ogni moneta è divisa in parti uguali; ciò che non si divide resta nella scorta del gruppo.", "Each coin type is split evenly; what cannot be divided stays in the party stash.")}</p>`,
    {
      submitLabel: ctx.t("Dividi", "Split"),
      onSubmit: (data) => done(data.getAll("recipient")),
    },
  );
  const form = globalThis.document?.querySelector?.("#dialog form");
  form?.addEventListener("change", () => {
    const count = form.querySelectorAll('[name="recipient"]:checked').length;
    const out = form.querySelector("[data-loot-split-preview]");
    if (out) out.textContent = preview(count);
  });
}
