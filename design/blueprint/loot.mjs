// B26 entry module — treasure parcels, loot distribution, party stash, merchants and
// XP/coin awards. Patterns: FG treasure parcels and party-sheet "Distribute" with the
// remainder kept (R20-117, R20-079); Owlbear Loot! prepared packages shared with the
// players (VTL-094); Game Master's Grimoire loot on a token (VTL-095) and shop with cart
// (VTL-096, merchants.mjs); BG3 loot window "Take all" and trade screen (CRP-157,
// CRP-159); D&D Beyond Party Inventory (DDB-052, party-stash.mjs); dnd5e `/award` each or
// party split (FVT-051); dnd5e NPC "Gear" copied clean from the compendium (FVT-092).
// Rules: SRD 5.2.1 monster Gear (EN 255 / IT 291), XP awarded by the GM (EN 182 /
// IT 212), Character Advancement (EN 23 / IT 25), coins (EN 89 / IT 101).

import { CREATURES, getById } from "./srd-sample.mjs";
import { canControlActor } from "./character-access.mjs";
// The Table's own visibility rule (B12): a marker or a creature's name reaches a player
// only where that player sees the token (also as a Spectre audience, VTL-143).
import { observesToken, seesAsAudience } from "./token-menu.mjs";
import {
  SLICE,
  lootError,
  newId,
  lootSlice,
  attempt,
  commitLoot,
  partyMembers,
  isPartyMember,
  isMember,
  requireMember,
  normalizeCoins,
  isEmptyCoins,
  coinsValue,
  addCoins,
  emptyCoins,
  splitCoins,
  formatCoins,
  formatCp,
  itemFromCatalog,
  customItem,
  catalogEntry,
  hideIdentity,
  giveItemToActor,
  givePurse,
  purseOf,
  giveXp,
  stashAdd,
  splitCoinsTo,
  addLedger,
  coinInputs,
  readCoins,
  itemName,
  unidentifiedBadge,
  ledgerList,
  undoButton,
  openSplit,
  openQuantity,
  renderPurse,
  bindPurse,
  renderXp,
  bindXp,
  renderStash,
  bindStash,
  stashVisibleTo,
  handleStashAction,
  identifyItem,
  text,
  weaponDamage,
  renderStashEquipped,
  stashEquippedBy,
  renderPartyInventory,
  bindPartyInventory,
  resetPartyInventoryUI,
  withFocus,
  requestFocus,
  restoreFocus,
  cssId,
} from "./party-stash.mjs";
import {
  renderMerchantsPrep,
  bindMerchantsPrep,
  renderShop,
  bindShop,
  merchantsOnScene,
  resetMerchantUI,
  catalogOptions,
  selectShop,
  selectBarterer,
  pendingOffers,
  DEFAULT_BUY_RATE,
} from "./merchants.mjs";

const L = (it, en) => ({ it, en });

// ---------------------------------------------------------------- seed

// Synthetic, coherent with the demo: the party already shares a few torches and coins,
// and a travelling pedlar waits (closed) in the observatory courtyard. SRD 2024 prices.
export function seedLoot() {
  const stock = (slug, quantity) => {
    const item = itemFromCatalog("srd2024:item:" + slug, { quantity: 1 });
    return {
      id: "tessa-" + slug,
      srdId: item.srdId,
      name: item.name,
      quantity,
      priceCp: item.value,
      srdPriceCp: item.value,
    };
  };
  const torches = itemFromCatalog("srd2024:item:torch", { quantity: 5 });
  Object.assign(torches, { id: "stash-torches", lootId: "seed-torches", equippedBy: null });
  return {
    parcels: [],
    stash: { coins: { ...emptyCoins(), gp: 15 }, items: [torches] },
    merchants: [
      {
        id: "tessa",
        name: "Carro di Tessa",
        sceneId: "old-watch",
        open: false,
        fundsCp: 6000,
        buyRate: DEFAULT_BUY_RATE,
        discount: 0,
        actorId: null,
        stock: [
          stock("healers-kit", 3),
          stock("rope", 4),
          stock("rations", 10),
          stock("antitoxin", 2),
          stock("hooded-lantern", 1),
          stock("potion-of-healing", 2),
          stock("dagger", 4),
          stock("shield", 1),
        ],
        buyback: [],
      },
    ],
    carts: [],
    awards: [],
    ledger: [],
    secrets: {},
    retired: [],
  };
}
export function normalizeLoot(slice, fromVersion) {
  if (fromVersion > 1) throw Error("Saved loot data comes from a newer version");
  const list = (value) => (Array.isArray(value) ? value : []);
  return {
    parcels: list(slice?.parcels),
    stash: {
      coins: (() => {
        try {
          return normalizeCoins(slice?.stash?.coins ?? {});
        } catch {
          return emptyCoins();
        }
      })(),
      items: list(slice?.stash?.items),
    },
    merchants: list(slice?.merchants),
    carts: list(slice?.carts),
    awards: list(slice?.awards),
    ledger: list(slice?.ledger),
    secrets: slice?.secrets && typeof slice.secrets === "object" ? slice.secrets : {},
    retired: list(slice?.retired),
  };
}

// ---------------------------------------------------------------- parcels domain

function requireDm(role) {
  if (role !== "dm")
    throw lootError("Solo il DM prepara i tesori.", "Only the DM prepares treasure.");
}
export function parcelById(slice, id) {
  const parcel = slice.parcels.find((entry) => entry.id === id);
  if (!parcel) throw lootError("Pacchetto non trovato.", "Parcel not found.");
  return parcel;
}
export const parcelEmpty = (parcel) => isEmptyCoins(parcel.coins) && !parcel.items.length;
export function parcelStatus(parcel) {
  if (!parcel.revealed) return "prepared";
  return parcelEmpty(parcel) ? "emptied" : "revealed";
}

// ---------------------------------------------------------------- parcel titles

const TOKEN_MENU = "token-menu";
const LOOT_PREFIX = Object.freeze({ it: "Bottino", en: "Loot" });
const prefixOf = (lang) => (lang === "en" ? LOOT_PREFIX.en : LOOT_PREFIX.it);
const PREFIXES = Object.values(LOOT_PREFIX);
const startsWithPrefix = (title) =>
  PREFIXES.some((prefix) => title === prefix || title.startsWith(prefix + ": "));
const withoutPrefix = (title) => {
  const prefix = PREFIXES.find((entry) => title.startsWith(entry + ": "));
  return prefix ? title.slice(prefix.length + 2) : PREFIXES.includes(title) ? "" : title;
};
// Every name the creature has had here: current (maybe a B12 alias), hidden true name and
// the original before a rename.
function creatureNames(state, actorId) {
  const record = state.ext?.[TOKEN_MENU]?.names?.[actorId];
  return [state.actors?.[actorId]?.name, record?.trueName, record?.original].filter(
    (name) => typeof name === "string" && name,
  );
}
// How a parcel is named after its creature: "prefixed" ("Bottino: X", from the token menu),
// "plain" ("X", from the encounter builder) or null (a name the DM wrote).
function namedAfterCreature(state, parcel) {
  if (!parcel?.sourceActorId || !state.actors?.[parcel.sourceActorId]) return null;
  if (parcel.autoName === false) return null;
  if (parcel.autoName) return "prefixed";
  for (const name of creatureNames(state, parcel.sourceActorId)) {
    if (parcel.name === name) return "plain";
    if (PREFIXES.some((prefix) => parcel.name === `${prefix}: ${name}`)) return "prefixed";
  }
  return null;
}
// The Table's visibility rule for a token (B12), with the Spectre audience (VTL-143).
function tokenSeen(state, token, role) {
  return (
    role === "dm" ||
    observesToken(state, token, role) ||
    seesAsAudience(state, state.ext?.[TOKEN_MENU], token, role)
  );
}
// A player cannot see the parcel's creature: the creature is hidden, or its token on the
// parcel's scene is hidden from this player.
export function creatureConcealed(state, parcel, role) {
  if (role === "dm" || !parcel?.sourceActorId) return false;
  const actor = state.actors?.[parcel.sourceActorId];
  if (!actor) return false;
  if (actor.hidden) return true;
  const scene = state.scenes?.find((entry) => entry.id === (parcel.sceneId ?? state.activeSceneId));
  const token = scene?.tokens?.find((entry) => entry.actorId === parcel.sourceActorId);
  return !!token && !tokenSeen(state, token, role);
}
// A viewer's title for a parcel. A parcel named after its creature reads the creature's
// current name, so a name the DM hides later (B12 alias) never leaks through a stored
// copy; a player who cannot see the creature reads only "Loot". A DM-written name is kept.
export function parcelTitle(state, parcel, lang = "it", role = "dm") {
  const mode = namedAfterCreature(state, parcel);
  if (!mode) return parcel.name;
  if (creatureConcealed(state, parcel, role)) return prefixOf(lang);
  const name = state.actors[parcel.sourceActorId].name;
  return mode === "plain" ? name : `${prefixOf(lang)}: ${name}`;
}
// Shared texts (the loot log, audit labels) are read by everyone: the players' title.
const sharedTitle = (state, parcel) =>
  L(parcelTitle(state, parcel, "it", "player"), parcelTitle(state, parcel, "en", "player"));
const titleOf = (ctx, parcel) => parcelTitle(ctx.state, parcel, ctx.lang, ctx.role);
export function createParcel(state, slice, role, { name, sceneId = null, sourceActorId = null }) {
  requireDm(role);
  const title = String(name ?? "").trim();
  if (!title || title.length > 80)
    throw lootError(
      "Scrivi un nome (massimo 80 caratteri).",
      "Write a name (80 characters at most).",
    );
  if (sceneId && !state.scenes.some((scene) => scene.id === sceneId))
    throw lootError("Scena non trovata.", "Scene not found.");
  if (sourceActorId && !state.actors[sourceActorId])
    throw lootError("Creatura non trovata.", "Creature not found.");
  const parcel = {
    id: newId("parcel"),
    name: title,
    sceneId,
    sourceActorId: sourceActorId || null,
    revealed: false,
    coins: emptyCoins(),
    items: [],
    note: "",
  };
  slice.parcels.push(parcel);
  return parcel;
}
export function updateParcel(state, slice, role, id, { name, sceneId, sourceActorId, note = "" }) {
  requireDm(role);
  const parcel = parcelById(slice, id);
  const title = String(name ?? "").trim();
  if (!title || title.length > 80)
    throw lootError(
      "Scrivi un nome (massimo 80 caratteri).",
      "Write a name (80 characters at most).",
    );
  if (sceneId && !state.scenes.some((scene) => scene.id === sceneId))
    throw lootError("Scena non trovata.", "Scene not found.");
  if (sourceActorId && !state.actors[sourceActorId])
    throw lootError("Creatura non trovata.", "Creature not found.");
  // Saving the shown title unchanged keeps a parcel named after its creature; a different
  // name (or another creature) makes it the DM's own name.
  const keepsCreatureName =
    (sourceActorId || null) === parcel.sourceActorId &&
    !!namedAfterCreature(state, parcel) &&
    [parcel.name, parcelTitle(state, parcel, "it"), parcelTitle(state, parcel, "en")].includes(
      title,
    );
  Object.assign(parcel, {
    ...(keepsCreatureName ? {} : { name: title }),
    sceneId: sceneId || null,
    sourceActorId: sourceActorId || null,
    note: String(note ?? "").slice(0, 500),
  });
  if (!keepsCreatureName && parcel.autoName) parcel.autoName = false;
}
export function setParcelCoins(state, slice, role, id, coins) {
  requireDm(role);
  parcelById(slice, id).coins = normalizeCoins(coins);
}
// What a deleted parcel already handed out stays in the campaign's accumulated treasure
// (PR-55): the items and coins are still with the party.
export function deleteParcel(state, slice, role, id) {
  requireDm(role);
  const parcel = parcelById(slice, id);
  for (const item of parcel.items) delete slice.secrets[item.lootId];
  if (parcel.distributedCp)
    slice.retired.push({
      id: parcel.id,
      name: parcel.name,
      sceneId: parcel.sceneId,
      distributedCp: parcel.distributedCp,
    });
  slice.parcels = slice.parcels.filter((entry) => entry !== parcel);
}
// Adds a row to a parcel; `unidentified` hides its identity from the players.
export function addParcelItem(
  state,
  slice,
  role,
  id,
  item,
  { unidentified = false, apparentName = "", apparentDescription = "" } = {},
) {
  requireDm(role);
  const parcel = parcelById(slice, id);
  if (unidentified) hideIdentity(slice, item, apparentName, apparentDescription);
  parcel.items.push(item);
  return item;
}
export function removeParcelItem(state, slice, role, id, itemId) {
  requireDm(role);
  const parcel = parcelById(slice, id);
  const item = parcel.items.find((entry) => entry.id === itemId);
  if (!item) throw lootError("Oggetto non trovato.", "Item not found.");
  delete slice.secrets[item.lootId];
  parcel.items = parcel.items.filter((entry) => entry !== item);
}
// Something of the parcel already reached the party. `handedOut` is set by every hand-out;
// the value and the log cover parcels saved before that flag. Showing or hiding is not.
const VISIBILITY_KINDS = ["parcel-revealed", "parcel-hidden"];
export function parcelHandedOut(slice, parcel) {
  return (
    !!parcel.handedOut ||
    (parcel.distributedCp ?? 0) > 0 ||
    slice.ledger.some(
      (entry) => entry.parcelId === parcel.id && !VISIBILITY_KINDS.includes(entry.kind),
    )
  );
}
// Owlbear Loot! (VTL-094): a prepared package is shared ("play") with the players and can
// be unshared again while nothing has been handed out.
export function setParcelRevealed(state, slice, role, id, revealed) {
  requireDm(role);
  const parcel = parcelById(slice, id);
  if (!!revealed === !!parcel.revealed) return;
  if (!revealed && parcelHandedOut(slice, parcel))
    throw lootError(
      "Qualcosa è già stato distribuito: il pacchetto resta visibile.",
      "Something was already handed out: the parcel stays visible.",
    );
  parcel.revealed = !!revealed;
  // "Loot shown to the players: Explorer", not "…: Loot: Explorer".
  const title = sharedTitle(state, parcel);
  const name = (lang) => (withoutPrefix(title[lang]) ? ": " + withoutPrefix(title[lang]) : "");
  addLedger(slice, {
    kind: revealed ? "parcel-revealed" : "parcel-hidden",
    by: role,
    parcelId: id,
    actorIds: [],
    text: revealed
      ? L(`Bottino mostrato ai giocatori${name("it")}`, `Loot shown to the players${name("en")}`)
      : L(
          `Bottino nascosto ai giocatori${name("it")}`,
          `Loot hidden from the players${name("en")}`,
        ),
  });
}
function requireParcelAccess(state, role, parcel) {
  requireMember(state, role);
  if (role !== "dm" && !parcel.revealed)
    throw lootError("Questo bottino non è visibile.", "This loot is not visible.");
}
function targetFor(state, role, target) {
  if (target === "stash") return null;
  const actor = state.actors[target];
  if (!actor || !isPartyMember(state, target))
    throw lootError("Destinatario non valido.", "Invalid recipient.");
  if (!canControlActor(actor, role, state))
    throw lootError(
      "Puoi assegnare solo ai tuoi personaggi o alla scorta del gruppo.",
      "You can only assign to your own characters or to the party stash.",
    );
  return actor;
}
// Market value of loot rows (the DM-only value for an unidentified item), for the
// treasure totals: what is still to be found and what the party already received (PR-55).
export function itemValueCp(slice, item, quantity = item.quantity) {
  const value = item.identified === false ? slice.secrets?.[item.lootId]?.value : item.value;
  return Number.isInteger(value) ? value * quantity : 0;
}
export function parcelValueCp(slice, parcel) {
  return (
    coinsValue(parcel.coins) + parcel.items.reduce((sum, item) => sum + itemValueCp(slice, item), 0)
  );
}
export function treasureTotals(slice, sceneId = null) {
  const here = (parcel) => !sceneId || parcel.sceneId === sceneId;
  const parcels = slice.parcels.filter(here);
  return {
    remainingCp: parcels.reduce((sum, parcel) => sum + parcelValueCp(slice, parcel), 0),
    distributedCp: [...parcels, ...(slice.retired ?? []).filter(here)].reduce(
      (sum, parcel) => sum + (parcel.distributedCp ?? 0),
      0,
    ),
  };
}
const credit = (parcel, cp) => {
  parcel.handedOut = true;
  parcel.distributedCp = (parcel.distributedCp ?? 0) + cp;
};
// BG3 loot window / GMG "transfer to party inventory or a member" / INV-09 "Prendi per il
// personaggio": one valid assignment of a given unit; the second attempt finds it gone.
export function assignParcelItem(state, slice, role, parcelId, itemId, target, quantity) {
  const parcel = parcelById(slice, parcelId);
  requireParcelAccess(state, role, parcel);
  const item = parcel.items.find((entry) => entry.id === itemId);
  if (!item)
    throw lootError("L'oggetto è già stato assegnato.", "The item has already been assigned.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > item.quantity)
    throw lootError(
      `Puoi assegnarne da 1 a ${item.quantity}.`,
      `You can assign 1 to ${item.quantity}.`,
    );
  const actor = targetFor(state, role, target);
  const title = sharedTitle(state, parcel);
  credit(parcel, itemValueCp(slice, item, quantity));
  if (actor) giveItemToActor(actor, item, quantity);
  else stashAdd(slice, item, quantity);
  item.quantity -= quantity;
  if (item.quantity === 0) parcel.items = parcel.items.filter((entry) => entry !== item);
  addLedger(slice, {
    kind: "loot-assign",
    by: role,
    parcelId,
    actorIds: actor ? [actor.id] : [],
    text: L(
      `${title.it}: ${text(item.name, "it")} ×${quantity} → ${actor ? actor.name : "scorta del gruppo"}`,
      `${title.en}: ${text(item.name, "en")} ×${quantity} → ${actor ? actor.name : "party stash"}`,
    ),
  });
}
export function splitParcelCoins(state, slice, role, parcelId, recipients) {
  const parcel = parcelById(slice, parcelId);
  requireParcelAccess(state, role, parcel);
  const value = coinsValue(parcel.coins);
  const entry = splitCoinsTo(
    state,
    slice,
    role,
    parcel.coins,
    recipients,
    sharedTitle(state, parcel),
  );
  credit(parcel, value);
  entry.parcelId = parcelId;
  return entry;
}
export function parcelToStash(state, slice, role, parcelId) {
  const parcel = parcelById(slice, parcelId);
  requireParcelAccess(state, role, parcel);
  if (parcelEmpty(parcel)) throw lootError("Il pacchetto è vuoto.", "The parcel is empty.");
  const title = sharedTitle(state, parcel);
  credit(parcel, parcelValueCp(slice, parcel));
  const coins = { ...parcel.coins };
  addCoins(slice.stash.coins, coins);
  parcel.coins = emptyCoins();
  const moved = parcel.items.map((item) => `${text(item.name, "it")} ×${item.quantity}`);
  const movedEn = parcel.items.map((item) => `${text(item.name, "en")} ×${item.quantity}`);
  for (const item of parcel.items) stashAdd(slice, item, item.quantity);
  parcel.items = [];
  addLedger(slice, {
    kind: "loot-take-all",
    by: role,
    parcelId,
    actorIds: [],
    text: L(
      `${title.it}: tutto nella scorta${isEmptyCoins(coins) ? "" : ` (${formatCoins(coins, "it")})`}${moved.length ? "; " + moved.join(", ") : ""}`,
      `${title.en}: everything to the stash${isEmptyCoins(coins) ? "" : ` (${formatCoins(coins, "en")})`}${movedEn.length ? "; " + movedEn.join(", ") : ""}`,
    ),
  });
}
export function parcelCoinsToStash(state, slice, role, parcelId) {
  const parcel = parcelById(slice, parcelId);
  requireParcelAccess(state, role, parcel);
  if (isEmptyCoins(parcel.coins)) throw lootError("Non ci sono monete.", "There are no coins.");
  const coins = { ...parcel.coins };
  const title = sharedTitle(state, parcel);
  credit(parcel, coinsValue(coins));
  addCoins(slice.stash.coins, coins);
  parcel.coins = emptyCoins();
  addLedger(slice, {
    kind: "loot-coins-stash",
    by: role,
    parcelId,
    actorIds: [],
    text: L(
      `${title.it}: ${formatCoins(coins, "it")} nella scorta`,
      `${title.en}: ${formatCoins(coins, "en")} to the stash`,
    ),
  });
}
// Game Master's Grimoire (VTL-095): select a creature's token → Loot → the loot window
// starts on it. A hidden parcel on the creature, on its scene, named after the creature:
// its title always reads the creature's current name (parcelTitle), so a name hidden
// before or after (B12) never leaks into a parcel that will be shown.
export function parcelOnCreature(slice, actorId, sceneId) {
  return (
    slice.parcels.find(
      (parcel) =>
        parcel.sourceActorId === actorId &&
        parcel.sceneId === sceneId &&
        parcelStatus(parcel) !== "emptied",
    ) ?? null
  );
}
export function startCreatureLoot(state, slice, role, { actorId, sceneId, label = "Bottino" }) {
  requireDm(role);
  const actor = state.actors[actorId];
  if (!actor || actor.kind !== "npc")
    throw lootError(
      "Il bottino si prepara sulle creature del DM.",
      "Loot is prepared on DM creatures.",
    );
  const existing = parcelOnCreature(slice, actorId, sceneId);
  if (existing) return existing;
  const parcel = createParcel(state, slice, role, {
    name: `${label}: ${actor.name}`.slice(0, 80),
    sceneId,
    sourceActorId: actorId,
  });
  parcel.autoName = true;
  return parcel;
}
// Random-table loot (B25) enters a hidden parcel of the scene instead of a sheet, so it
// joins the loot log, the treasure totals and "hidden until shown". Ready for B25 to call.
export function addTableLoot(state, slice, role, { sceneId, name, quantity = 1, valueGp = null }) {
  requireDm(role);
  let parcel = slice.parcels.find(
    (entry) => entry.fromTables && entry.sceneId === sceneId && !entry.revealed,
  );
  if (!parcel) {
    parcel = createParcel(state, slice, role, { name: "Da tabelle casuali", sceneId });
    parcel.fromTables = true;
  }
  return addParcelItem(state, slice, role, parcel.id, customItem({ name, quantity, valueGp }));
}

// ---------------------------------------------------------------- NPC gear (clean copies)

// SRD 5.2.1 monster Gear: "When used by someone else, a retrievable item uses its
// Equipment rules, ignoring any special flourishes in the stat block" (EN 255 / IT 291).
// dnd5e (FVT-092) copies NPC gear fresh from the compendium for the same reason.
export function statBlocksWithGear() {
  return CREATURES.filter((creature) => creature.gear?.length);
}
export function cleanGearFromStatBlock(creatureId) {
  const creature = getById(creatureId);
  if (!creature?.gear?.length)
    throw lootError("Questo blocco non elenca equipaggiamento.", "This stat block lists no gear.");
  return creature.gear.map((gear) => {
    const quantity = gear.quantity ?? 1;
    const item = gear.itemId
      ? itemFromCatalog(gear.itemId, { quantity })
      : gearOutsideCatalog(creature, gear, quantity);
    const action =
      gear.itemId && creature.actions?.find((entry) => "srd2024:item:" + entry.id === gear.itemId);
    item.clean = {
      from: "stat-block",
      creature: structuredClone(creature.name),
      creatureId,
      dropped: action ? structuredClone(action.summary) : null,
    };
    return item;
  });
}
// A Gear entry the sample catalog does not hold (the Priest's Holy Symbol, the Mage's Wand):
// the entry's own name, with no value, weight or rules the stat block does not give.
function gearOutsideCatalog(creature, gear, quantity) {
  const name = typeof gear.name === "object" ? gear.name : { it: gear.name, en: gear.name };
  const it = String(name?.it || name?.en || "").trim();
  const en = String(name?.en || name?.it || "").trim();
  if (!it) throw lootError("Voce di equipaggiamento senza nome.", "Gear entry without a name.");
  const item = customItem({ name: en, quantity });
  item.name = { it, en };
  item.source = {
    ...structuredClone(creature.source ?? {}),
    note: "Stat block Gear entry outside the sample item catalog: value unknown.",
  };
  return item;
}
// The Gear entry's item names, for the choice list.
export function gearNames(creature) {
  return (creature.gear ?? []).map((gear) =>
    gear.itemId
      ? (getById(gear.itemId)?.name ?? null)
      : typeof gear.name === "string"
        ? { it: gear.name, en: gear.name }
        : (gear.name ?? null),
  );
}
const COMBAT_FIELDS = [
  "attackBonus",
  "damageBonus",
  "magicBonus",
  "bonus",
  "combat",
  "profile",
  "equipped",
  "heldItem",
  "location",
  "availableInForm",
];
// An NPC inventory row becomes a clean copy: the catalog item when known, otherwise
// only its name, quantity, weight and description (no attack or damage bonuses).
export function cleanCopyOfNpcRow(actor, row) {
  const entry = catalogEntry(row);
  const quantity = Math.max(1, row.quantity ?? 1);
  const item = entry
    ? itemFromCatalog(entry.id, { quantity })
    : {
        id: newId("item"),
        lootId: newId("loot"),
        srdId: null,
        name: typeof row.name === "object" ? structuredClone(row.name) : L(row.name, row.name),
        description: structuredClone(row.description ?? ""),
        kind: row.kind === "weapon" ? "weapon" : row.kind === "consumable" ? "consumable" : "gear",
        category: "custom",
        quantity,
        weight: Number.isFinite(row.weight) ? row.weight : null,
        value: null,
        identified: true,
        source: {
          kind: "authored",
          revision: "npc-inventory",
          note: "Copied without stat-block data.",
        },
      };
  item.clean = {
    from: "npc-inventory",
    creature: L(actor.name, actor.name),
    actorId: actor.id,
    dropped: COMBAT_FIELDS.filter((field) => field in row && field !== "equipped"),
  };
  return item;
}

// ---------------------------------------------------------------- awards

// dnd5e `/award` (FVT-051): XP and coins to each recipient ("each") or divided among
// them ("party"). Split coins keep their remainder in the stash; XP is whole numbers.
export function awardParty(
  state,
  slice,
  role,
  { xp = 0, coins = {}, mode = "split", recipients = [], reason = "" },
) {
  if (role !== "dm")
    throw lootError(
      "Solo il DM assegna PE e monete al gruppo.",
      "Only the DM awards XP and coins to the party.",
    );
  const ids = [...new Set(recipients)];
  if (!ids.length)
    throw lootError("Scegli almeno un destinatario.", "Choose at least one recipient.");
  for (const id of ids)
    if (!isPartyMember(state, id))
      throw lootError(
        "Un destinatario non fa parte del gruppo.",
        "A recipient is not in the party.",
      );
  if (!Number.isInteger(xp) || xp < 0 || xp > 1_000_000)
    throw lootError(
      "I PE devono essere un numero intero non negativo.",
      "XP must be a non-negative whole number.",
    );
  const total = normalizeCoins(coins);
  if (!xp && isEmptyCoins(total))
    throw lootError("Indica PE o monete da assegnare.", "Enter XP or coins to award.");
  if (!["each", "split"].includes(mode)) throw lootError("Modalità non valida.", "Invalid mode.");
  const perXp = mode === "each" ? xp : Math.floor(xp / ids.length);
  const xpRemainder = mode === "each" ? 0 : xp % ids.length;
  const { share, remainder } =
    mode === "each" ? { share: total, remainder: emptyCoins() } : splitCoins(total, ids.length);
  const results = ids.map((id) => {
    const actor = state.actors[id];
    const xpResult = perXp ? giveXp(actor, perXp) : null;
    if (!isEmptyCoins(share)) givePurse(actor, share, slice, role);
    return { actorId: id, xp: xpResult };
  });
  addCoins(slice.stash.coins, remainder);
  const why = String(reason ?? "")
    .trim()
    .slice(0, 200);
  const award = {
    id: newId("award"),
    time: new Date().toISOString(),
    mode,
    xp,
    coins: total,
    perXp,
    xpRemainder,
    share,
    remainder,
    recipients: ids,
    results,
    reason: why,
  };
  slice.awards.push(award);
  const who = ids.map((id) => state.actors[id].name).join(", ");
  const parts = (lang) =>
    [
      xp ? `${perXp} ${lang === "it" ? "PE" : "XP"}` : "",
      isEmptyCoins(share) ? "" : formatCoins(share, lang),
    ]
      .filter(Boolean)
      .join(" + ");
  addLedger(slice, {
    kind: "award",
    by: role,
    actorIds: ids,
    awardId: award.id,
    reason: why,
    text: L(
      `Assegnazione ${mode === "each" ? "a ciascuno" : "divisa"}: ${parts("it")} a testa a ${who}${xpRemainder ? ` (resto di ${xpRemainder} PE non assegnato)` : ""}${isEmptyCoins(remainder) ? "" : `; resto nella scorta: ${formatCoins(remainder, "it")}`}`,
      `Award ${mode === "each" ? "to each" : "divided"}: ${parts("en")} each to ${who}${xpRemainder ? ` (${xpRemainder} XP remainder not assigned)` : ""}${isEmptyCoins(remainder) ? "" : `; remainder kept in the stash: ${formatCoins(remainder, "en")}`}`,
    ),
  });
  return award;
}

// ---------------------------------------------------------------- UI state

// quickAdd: the DM's open/closed choice for each parcel card's quick add (kept across
// re-renders; by default open while the parcel is empty).
const ui = { prepParcelId: null, focusParcelId: null, quickAdd: {} };
// PR-55: a generated treasure opens in Preparation › Treasure on its new parcel.
export function selectPrepParcel(parcelId) {
  ui.prepParcelId = parcelId;
}
// PG-17 (Fantasy Grounds «Award XP» from the combat tracker, Foundry dnd5e award after
// combat): when an encounter ends the DM's bell offers «Assegna PE e monete», prefilled with
// the defeated creatures and the SRD XP of the stat blocks they come from. Session memory,
// like FG's prompt: it clears with the award, a new encounter or a reset.
let combatAward = null;
const AWARD_ROUTE = "loot-award";
/** DM creatures at 0 HP on the active scene, with the XP of a known SRD stat block. */
export function defeatedFoes(state) {
  const scene = state.scenes?.find((entry) => entry.id === state.activeSceneId);
  const onScene = new Set((scene?.tokens ?? []).map((token) => token.actorId));
  return Object.values(state.actors ?? {})
    .filter(
      (actor) =>
        onScene.has(actor.id) && actor.kind === "npc" && !actor.companion && Number(actor.hp) <= 0,
    )
    .map((actor) => {
      const creature = getById(actor.encounterBlock?.creatureId ?? actor.compendiumRef?.id ?? "");
      const xp = creature?.kind === "creature" && Number.isFinite(creature.xp) ? creature.xp : null;
      return { id: actor.id, name: actor.name, xp };
    });
}
/** The award dialog's prefill for the encounter that just ended (null when none). */
export function combatAwardPrefill(ctx) {
  if (!combatAward || ctx.role !== "dm") return null;
  const names = combatAward.foes.map((foe) => foe.name).join(", ");
  return {
    xp: combatAward.foes.reduce((sum, foe) => sum + (foe.xp ?? 0), 0),
    reason: names ? ctx.t(`Incontro concluso: ${names}`, `Encounter over: ${names}`) : "",
  };
}
function combatAwardNotice(ctx) {
  if (!combatAward || ctx.role !== "dm") return [];
  const { foes } = combatAward;
  const xp = foes.reduce((sum, foe) => sum + (foe.xp ?? 0), 0);
  const unknown = foes.filter((foe) => foe.xp === null).length;
  const body = (lang) => {
    const it = lang === "it";
    if (!foes.length)
      return it
        ? "Nessuna creatura a 0 PF sulla scena: scegli tu PE e monete."
        : "No creature at 0 HP on the scene: choose the XP and coins.";
    const names = foes.map((foe) => foe.name).join(", ");
    const known = xp ? ` · ${xp} ${it ? "PE (SRD)" : "XP (SRD)"}` : "";
    const rest = unknown
      ? it
        ? ` · ${unknown} senza blocco SRD: PE da aggiungere`
        : ` · ${unknown} without an SRD block: XP to add`
      : "";
    return `${it ? "Sconfitti" : "Defeated"}: ${names}${known}${rest}`;
  };
  return [
    {
      id: "loot-award-" + combatAward.id,
      title: L("Incontro concluso: assegna PE e monete", "Encounter over: award XP and coins"),
      body: L(body("it"), body("en")),
      target: { page: "table", params: { tab: AWARD_ROUTE } },
    },
  ];
}
function resetUI() {
  combatAward = null;
  ui.prepParcelId = null;
  ui.focusParcelId = null;
  ui.quickAdd = {};
  resetMerchantUI();
  resetPartyInventoryUI();
}
const sceneName = (ctx, id) =>
  ctx.state.scenes.find((scene) => scene.id === id)?.name ?? ctx.t("Nessuna scena", "No scene");
const money = (ctx, coins) => ctx.esc(formatCoins(coins, ctx.lang));
function statusBadge(ctx, parcel) {
  const status = parcelStatus(parcel);
  const label = {
    prepared: ctx.t("Nascosto ai giocatori", "Hidden from players"),
    revealed: ctx.t("Visibile al gruppo", "Visible to the party"),
    emptied: ctx.t("Distribuito", "Handed out"),
  }[status];
  return `<span class="badge loot-status loot-status-${status}">${label}</span>`;
}
function itemMeta(ctx, item, slice) {
  const secret = ctx.role === "dm" ? slice.secrets[item.lootId] : null;
  const value = item.identified === false ? secret?.value : item.value;
  const bits = [
    Number.isInteger(value)
      ? ctx.esc(formatCp(value, ctx.lang)) +
        (item.identified === false
          ? " (" + ctx.t("valore noto al DM", "value known to the DM") + ")"
          : "")
      : "",
    item.weight == null
      ? ""
      : String(item.weight).replace(".", ctx.lang === "it" ? "," : ".") + " kg",
    item.category === "valuable" ? ctx.t("oggetto di valore", "valuable") : "",
    // The item's own Equipment data (SRD 5.2.1 monster Gear): what everyone may read.
    item.identified !== false && item.weapon ? ctx.esc(weaponDamage(ctx, item.weapon)) : "",
  ].filter(Boolean);
  return bits.join(" · ");
}
// Where a clean copy came from and what was left out of it is DM preparation: which stat
// block the DM used (under a hidden name too) never reaches the players. For an
// unidentified row the DM reads it from the row's hidden identity.
function cleanNote(ctx, row, slice) {
  if (ctx.role !== "dm") return "";
  const hidden = row.identified === false;
  const item = hidden ? (slice?.secrets?.[row.lootId]?.fields ?? {}) : row;
  if (!item.clean) return "";
  if (item.clean.from === "stat-block" && !item.srdId)
    return `<small class="loot-clean">${ctx.t("Voce Attrezzatura del blocco", "Stat block Gear entry")}: ${ctx.esc(ctx.label(item.clean.creature))} · ${ctx.t("fuori dal catalogo, valore sconosciuto", "not in the catalog, value unknown")}</small>`;
  const dropped =
    item.clean.from === "stat-block" && item.clean.dropped
      ? `<small class="loot-clean-dropped">${ctx.t("Non copiato dal blocco", "Not copied from the stat block")}: ${ctx.esc(ctx.label(item.clean.dropped))}</small>`
      : item.clean.from === "npc-inventory" && item.clean.dropped?.length
        ? `<small class="loot-clean-dropped">${ctx.t("Campi del PNG non copiati", "NPC fields not copied")}: ${ctx.esc(item.clean.dropped.join(", "))}</small>`
        : "";
  return `<small class="loot-clean">${ctx.t("Copia pulita dal catalogo SRD: da", "Clean SRD catalog copy: from")} ${ctx.esc(ctx.label(item.clean.creature))}${hidden && item.weapon ? ` · ${ctx.esc(weaponDamage(ctx, item.weapon))}` : ""}</small>${dropped}`;
}

// ---------------------------------------------------------------- Preparation: treasure

function renderTreasurePrep(ctx) {
  const slice = lootSlice(ctx.state);
  const parcels = slice.parcels;
  if (!parcels.some((entry) => entry.id === ui.prepParcelId))
    ui.prepParcelId = parcels.at(-1)?.id ?? null;
  const current = parcels.find((entry) => entry.id === ui.prepParcelId) ?? null;
  const totals = treasureTotals(slice);
  return `<div class="loot-prep"><div class="loot-prep-intro"><p class="loot-totals-line" data-loot-treasure-totals><strong>${ctx.t("Tesoro della campagna", "Campaign treasure")}</strong>: ${ctx.t("da trovare", "still to find")} ${ctx.esc(formatCp(totals.remainingCp, ctx.lang))} · ${ctx.t("già al gruppo", "already with the party")} ${ctx.esc(formatCp(totals.distributedCp, ctx.lang))} <small class="muted">${ctx.t("(costo dell'Equipaggiamento e valori per rarità, SRD 5.2.1; valori sconosciuti esclusi)", "(Equipment cost and rarity values, SRD 5.2.1; unknown values excluded)")}</small></p><p class="muted">${ctx.t("Pacchetti di tesoro legati a una scena o a una creatura: monete, oggetti del catalogo SRD, oggetti non identificati. Restano nascosti finché non li mostri al Tavolo.", "Treasure parcels tied to a scene or a creature: coins, SRD catalog items, unidentified items. They stay hidden until you show them at the Table.")}</p>${ctx.registry?.get?.("command", "generators.treasure", ctx) ? `<div class="toolbar"><button type="button" class="button" data-loot="treasure-generate">${ctx.icon("dice")} ${ctx.t("Genera tesoro per GS…", "Generate treasure by CR…")}</button></div>` : ""}</div><div class="loot-prep-layout"><nav class="loot-prep-list" aria-label="${ctx.t("Pacchetti di tesoro", "Treasure parcels")}">${parcels
    .map(
      (parcel) =>
        `<button type="button" class="loot-prep-pick ${parcel.id === ui.prepParcelId ? "active" : ""}" data-loot="parcel-pick" data-id="${ctx.esc(parcel.id)}" aria-current="${parcel.id === ui.prepParcelId}"><strong>${ctx.esc(titleOf(ctx, parcel))}</strong><small>${ctx.esc(sceneName(ctx, parcel.sceneId))} · ${ctx.esc(formatCp(parcelValueCp(slice, parcel), ctx.lang))}</small><small>${statusBadge(ctx, parcel)}</small></button>`,
    )
    .join(
      "",
    )}<form class="loot-inline-form" data-loot-form="parcel-create"><label class="field"><span>${ctx.t("Nuovo pacchetto", "New parcel")}</span><input name="name" required maxlength="80" placeholder="${ctx.t("Es. Forziere", "E.g. Chest")}"></label><button class="button" type="submit">${ctx.icon("plus")} ${ctx.t("Crea", "Create")}</button></form></nav>${current ? parcelEditor(ctx, slice, current) : `<p class="empty-state">${ctx.t("Nessun pacchetto. Crea il primo tesoro della scena.", "No parcels. Create the first treasure of the scene.")}</p>`}</div></div>`;
}
function coinForm(ctx, parcel, heading = 3) {
  return `<form class="loot-coin-form" data-loot-form="parcel-coins" data-id="${ctx.esc(parcel.id)}"><h${heading}>${ctx.t("Monete", "Coins")}</h${heading}>${coinInputs(ctx, parcel.coins, "coin-")}<button class="button" type="submit">${ctx.t("Salva monete", "Save coins")}</button></form>`;
}
function catalogAddForm(ctx, parcel) {
  return `<form class="loot-inline-form loot-add-form" data-loot-form="parcel-item-add" data-id="${ctx.esc(parcel.id)}"><label class="field loot-grow"><span>${ctx.t("Oggetto dal catalogo SRD", "Item from the SRD catalog")}</span><select name="srdId">${catalogOptions(ctx)}</select></label><label class="field loot-qty"><span>${ctx.t("Quantità", "Quantity")}</span><input type="number" name="quantity" min="1" max="999" step="1" value="1" inputmode="numeric"></label><label class="loot-check"><input type="checkbox" name="unidentified"> ${ctx.t("Non identificato", "Unidentified")}</label><label class="field loot-grow"><span>${ctx.t("Nome apparente (se non identificato)", "Apparent name (if unidentified)")}</span><input name="apparentName" maxlength="80" placeholder="${ctx.t("Es. Anello d'argento inciso", "E.g. Engraved silver ring")}"></label><button class="button" type="submit">${ctx.icon("plus")} ${ctx.t("Aggiungi", "Add")}</button></form>`;
}
function parcelEditor(ctx, slice, parcel) {
  const npcs = Object.values(ctx.state.actors).filter((actor) => actor.kind === "npc");
  const npcRows = npcs.filter((actor) => (actor.inventory ?? []).some((row) => row.quantity > 0));
  return `<section class="panel loot-panel loot-parcel-editor" aria-labelledby="loot-parcel-title"><div class="section-heading"><h2 id="loot-parcel-title" tabindex="-1">${ctx.esc(titleOf(ctx, parcel))} ${statusBadge(ctx, parcel)}</h2><div class="toolbar"><button type="button" class="button" data-loot="parcel-reveal" data-id="${ctx.esc(parcel.id)}">${parcel.revealed ? ctx.t("Nascondi ai giocatori", "Hide from players") : ctx.t("Mostra ai giocatori", "Show to players")}</button><button type="button" class="button danger" data-loot="parcel-delete" data-id="${ctx.esc(parcel.id)}">${ctx.t("Elimina", "Delete")}</button></div></div><form class="loot-form-grid" data-loot-form="parcel-save" data-id="${ctx.esc(parcel.id)}"><label class="field"><span>${ctx.t("Nome", "Name")}</span><input name="name" required maxlength="80" value="${ctx.esc(titleOf(ctx, parcel))}"></label><label class="field"><span>${ctx.t("Scena", "Scene")}</span><select name="sceneId"><option value="">${ctx.t("Nessuna scena", "No scene")}</option>${ctx.state.scenes.map((scene) => `<option value="${ctx.esc(scene.id)}"${scene.id === parcel.sceneId ? " selected" : ""}>${ctx.esc(scene.name)}</option>`).join("")}</select></label><label class="field"><span>${ctx.t("Sulla creatura (facoltativo)", "On a creature (optional)")}</span><select name="sourceActorId"><option value="">${ctx.t("Nessuna", "None")}</option>${npcs.map((actor) => `<option value="${ctx.esc(actor.id)}"${actor.id === parcel.sourceActorId ? " selected" : ""}>${ctx.esc(actor.name)}</option>`).join("")}</select></label><label class="field loot-span"><span>${ctx.t("Nota del DM", "DM note")}</span><input name="note" maxlength="500" value="${ctx.esc(parcel.note ?? "")}"></label><button class="button" type="submit">${ctx.t("Salva dettagli", "Save details")}</button></form>${coinForm(ctx, parcel)}<h3>${ctx.t("Oggetti", "Items")}</h3>${
    parcel.items.length
      ? `<ul class="loot-list">${parcel.items
          .map(
            (item) =>
              `<li class="loot-row"><div class="loot-row-copy"><strong>${itemName(ctx, item, slice)}</strong> <span class="muted">×${item.quantity}</span> ${unidentifiedBadge(ctx, item)}<small>${itemMeta(ctx, item, slice)}</small>${cleanNote(ctx, item, slice)}</div><div class="toolbar">${item.identified === false ? `<button type="button" class="button" data-loot="identify" data-loot-id="${ctx.esc(item.lootId)}">${ctx.t("Identifica", "Identify")}</button>` : ""}<button type="button" class="button quiet" data-loot="parcel-item-remove" data-id="${ctx.esc(parcel.id)}" data-item="${ctx.esc(item.id)}">${ctx.t("Rimuovi", "Remove")}</button></div></li>`,
          )
          .join("")}</ul>`
      : `<p class="muted">${ctx.t("Nessun oggetto.", "No items.")}</p>`
  }${catalogAddForm(ctx, parcel)}<details class="loot-details"><summary>${ctx.t("Oggetto personalizzato (gemma, opera d'arte, lettera…)", "Custom item (gem, art object, letter…)")}</summary><form class="loot-inline-form loot-add-form" data-loot-form="parcel-custom-add" data-id="${ctx.esc(parcel.id)}"><label class="field loot-grow"><span>${ctx.t("Nome", "Name")}</span><input name="name" required maxlength="120"></label><label class="field loot-qty"><span>${ctx.t("Quantità", "Quantity")}</span><input type="number" name="quantity" min="1" max="999" step="1" value="1" inputmode="numeric"></label><label class="field loot-qty"><span>${ctx.t("Valore (mo)", "Value (GP)")}</span><input type="number" name="valueGp" min="0" step="0.01" inputmode="decimal"></label><label class="field loot-qty"><span>${ctx.t("Peso (kg)", "Weight (kg)")}</span><input type="number" name="weightKg" min="0" step="0.01" inputmode="decimal"></label><label class="loot-check"><input type="checkbox" name="valuable"> ${ctx.t("Oggetto di valore: si vende a valore pieno", "Valuable: sells at full value")}</label><button class="button" type="submit">${ctx.t("Aggiungi", "Add")}</button></form></details><details class="loot-details"${parcel.sourceActorId ? " open" : ""}><summary>${ctx.t("Equipaggiamento di una creatura (copie pulite)", "A creature's gear (clean copies)")}</summary><p class="muted">${ctx.t("SRD 5.2.1: un oggetto recuperato da un mostro usa le regole dell'Equipaggiamento, senza i bonus o gli effetti speciali del blocco statistiche.", "SRD 5.2.1: an item retrieved from a monster uses its Equipment rules, without the stat block's bonuses or special flourishes.")}</p><form class="loot-inline-form loot-add-form" data-loot-form="parcel-statblock-add" data-id="${ctx.esc(parcel.id)}"><label class="field loot-grow"><span>${ctx.t("Voce Attrezzatura del blocco", "Stat block Gear entry")}</span><select name="creatureId">${statBlocksWithGear()
    .map(
      (creature) =>
        `<option value="${ctx.esc(creature.id)}">${ctx.esc(ctx.label(creature.name))} · ${gearNames(
          creature,
        )
          .filter(Boolean)
          .map((name) => ctx.esc(ctx.label(name)))
          .join(", ")}</option>`,
    )
    .join(
      "",
    )}</select></label><button class="button" type="submit">${ctx.t("Aggiungi l'equipaggiamento", "Add the gear")}</button></form>${
    npcRows.length
      ? `<form class="loot-inline-form loot-add-form" data-loot-form="parcel-npc-add" data-id="${ctx.esc(parcel.id)}"><label class="field loot-grow"><span>${ctx.t("Dall'inventario di un PNG", "From an NPC inventory")}</span><select name="row">${npcRows
          .flatMap((actor) =>
            actor.inventory
              .filter((row) => row.quantity > 0)
              .map(
                (row) =>
                  `<option value="${ctx.esc(actor.id + "::" + row.id)}">${ctx.esc(actor.name)}: ${ctx.esc(ctx.label(row.name))} ×${row.quantity}</option>`,
              ),
          )
          .join(
            "",
          )}</select></label><button class="button" type="submit">${ctx.t("Copia pulita", "Clean copy")}</button></form>`
      : ""
  }</details></section>`;
}

// ---------------------------------------------------------------- Table: loot drawer

function parcelsHere(ctx) {
  const slice = lootSlice(ctx.state);
  return (slice?.parcels ?? []).filter(
    (parcel) =>
      (parcel.sceneId === ctx.state.activeSceneId || !parcel.sceneId) &&
      (ctx.role === "dm" || parcel.revealed),
  );
}
function assignTargets(ctx) {
  return partyMembers(ctx.state).filter(
    (actor) => ctx.role === "dm" || canControlActor(actor, ctx.role, ctx.state),
  );
}
function renderParcelCard(ctx, slice, parcel) {
  const status = parcelStatus(parcel);
  const targets = assignTargets(ctx);
  // "On the creature" only where the viewer sees it (never a token hidden from players).
  const source =
    parcel.sourceActorId && !creatureConcealed(ctx.state, parcel, ctx.role)
      ? ctx.state.actors[parcel.sourceActorId]
      : null;
  return `<article class="loot-parcel loot-parcel-${status}${ui.focusParcelId === parcel.id ? " is-focused" : ""}" data-parcel="${ctx.esc(parcel.id)}" aria-labelledby="loot-parcel-${ctx.esc(parcel.id)}"><header class="loot-parcel-head"><h3 id="loot-parcel-${ctx.esc(parcel.id)}" tabindex="-1">${ctx.icon("bag")} ${ctx.esc(titleOf(ctx, parcel))}</h3>${statusBadge(ctx, parcel)}${ctx.role === "dm" && status !== "emptied" ? `<button type="button" class="button ${parcel.revealed ? "quiet" : ""}" data-loot="parcel-reveal" data-id="${ctx.esc(parcel.id)}">${parcel.revealed ? ctx.t("Nascondi", "Hide") : ctx.t("Mostra ai giocatori", "Show to players")}</button>` : ""}</header>${source ? `<p class="muted">${ctx.t("Sulla creatura", "On the creature")}: ${ctx.esc(source.name)}</p>` : ""}${
    status === "emptied"
      ? `<p class="muted">${ctx.t("Tutto è stato distribuito.", "Everything has been handed out.")}</p>`
      : `${
          isEmptyCoins(parcel.coins)
            ? ""
            : `<div class="loot-coin-line"><p><strong data-loot-parcel-coins>${money(ctx, parcel.coins)}</strong></p><div class="toolbar"><button type="button" class="button" data-loot="parcel-split" data-id="${ctx.esc(parcel.id)}">${ctx.t("Dividi monete", "Split coins")}</button><button type="button" class="button quiet" data-loot="parcel-coins-stash" data-id="${ctx.esc(parcel.id)}">${ctx.t("Monete nella scorta", "Coins to the stash")}</button></div></div>`
        }${parcelEmpty(parcel) ? `<p class="muted">${ctx.t("Ancora vuoto.", "Still empty.")}</p>` : ""}<ul class="loot-list">${parcel.items
          .map(
            (item) =>
              `<li class="loot-row loot-parcel-item"><div class="loot-row-copy"><strong>${itemName(ctx, item, slice)}</strong> <span class="muted">×${item.quantity}</span> ${unidentifiedBadge(ctx, item)}<small>${itemMeta(ctx, item, slice)}</small>${cleanNote(ctx, item, slice)}</div><form class="loot-assign" data-loot-form="assign" data-id="${ctx.esc(parcel.id)}" data-item="${ctx.esc(item.id)}"><label class="field"><span>${ctx.t("Assegna a", "Assign to")}</span><select name="target">${targets.map((actor) => `<option value="${ctx.esc(actor.id)}">${ctx.esc(actor.name)}</option>`).join("")}<option value="stash">${ctx.t("Scorta del gruppo", "Party stash")}</option></select></label>${item.quantity > 1 ? `<label class="field loot-qty"><span>${ctx.t("Quantità", "Quantity")}</span><input type="number" name="quantity" min="1" max="${item.quantity}" step="1" value="${item.quantity}" inputmode="numeric"></label>` : `<input type="hidden" name="quantity" value="1">`}<button class="button" type="submit" aria-label="${ctx.t("Assegna", "Assign")}: ${ctx.esc(ctx.label(item.name))}">${ctx.t("Assegna", "Assign")}</button>${ctx.role === "dm" && item.identified === false ? `<button type="button" class="button quiet" data-loot="identify" data-loot-id="${ctx.esc(item.lootId)}">${ctx.t("Identifica", "Identify")}</button>` : ""}</form></li>`,
          )
          .join(
            "",
          )}</ul>${parcelEmpty(parcel) ? "" : `<div class="toolbar"><button type="button" class="button quiet" data-loot="parcel-all-stash" data-id="${ctx.esc(parcel.id)}">${ctx.t("Tutto nella scorta", "Everything to the stash")}</button></div>`}`
  }${
    ctx.role === "dm" && status !== "emptied"
      ? `<details class="loot-details loot-quick-add" data-id="${ctx.esc(parcel.id)}"${(ui.quickAdd[parcel.id] ?? parcelEmpty(parcel)) ? " open" : ""}><summary>${ctx.t("Aggiungi monete e oggetti", "Add coins and items")}</summary>${coinForm(ctx, parcel, 4)}${catalogAddForm(ctx, parcel)}<div class="toolbar"><button type="button" class="button quiet" data-loot="parcel-edit" data-id="${ctx.esc(parcel.id)}">${ctx.t("Altro in Preparazione", "More in Preparation")}</button></div></details>`
      : ""
  }</article>`;
}
function renderLootDrawer(ctx) {
  const slice = lootSlice(ctx.state);
  if (!slice || !isMember(ctx.state, ctx.role))
    return `<p class="muted">${ctx.t("Il bottino è riservato ai membri della campagna.", "Loot is for campaign members.")}</p>`;
  const parcels = parcelsHere(ctx).sort(
    (a, b) => (parcelStatus(a) === "emptied") - (parcelStatus(b) === "emptied"),
  );
  const stash = slice.stash;
  return `<div class="loot-drawer"><section class="loot-parcels" aria-label="${ctx.t("Bottino della scena", "Scene loot")}">${ctx.role === "dm" ? `<div class="loot-drawer-tools"><p class="muted">${ctx.t("I pacchetti nascosti restano invisibili ai giocatori finché non li mostri.", "Hidden parcels stay invisible to players until you show them.")}</p><div class="toolbar"><button type="button" class="button" data-loot="award-open">${ctx.t("Assegna PE e monete", "Award XP and coins")}</button><button type="button" class="button quiet" data-loot="prep-open">${ctx.t("Prepara tesori", "Prepare treasure")}</button></div></div>` : ""}${
    parcels.length
      ? parcels.map((parcel) => renderParcelCard(ctx, slice, parcel)).join("")
      : `<p class="empty-state">${ctx.t("Nessun bottino in questa scena.", "No loot in this scene.")}</p>`
  }</section><aside class="loot-side" aria-labelledby="loot-side-stash"><h3 id="loot-side-stash">${ctx.t("Scorta del gruppo", "Party stash")}</h3><p><strong data-loot-stash-coins>${money(ctx, stash.coins)}</strong></p>${
    stash.items.length
      ? `<ul class="loot-mini">${stash.items
          .map(
            (item) =>
              `<li>${itemName(ctx, item, slice)} ×${item.quantity}${ctx.role === "dm" && item.identified === false ? ` <button type="button" class="button quiet" data-loot="identify" data-loot-id="${ctx.esc(item.lootId)}">${ctx.t("Identifica", "Identify")}</button>` : ""}${item.equippedBy ? ` <span class="badge loot-badge-equipped">${ctx.t("Equipaggiato da", "Equipped by")} ${ctx.esc(ctx.state.actors[item.equippedBy]?.name ?? "—")}</span>` : ""}</li>`,
          )
          .join("")}</ul>`
      : `<p class="muted">${ctx.t("Vuota.", "Empty.")}</p>`
  }<p class="muted">${ctx.t("Prendi o equipaggia dalla scheda: Inventario → Scorta del gruppo.", "Take or equip from the sheet: Inventory → Party stash.")}</p><h3>${ctx.t("Registro del bottino", "Loot log")}</h3>${ledgerList(ctx, slice.ledger, 6)}${undoButton(ctx)}</aside></div>`;
}

// ---------------------------------------------------------------- campaign section

function renderTreasury(ctx) {
  return renderPartyInventory(ctx);
}

// ---------------------------------------------------------------- awards dialog

// C12 (H-06, Foundry `/award`): the reward's coins fill the award's own fields; only whole,
// positive amounts of the five coins count.
function awardCoins(prefill) {
  const coins = emptyCoins();
  for (const [id, amount] of Object.entries(prefill?.coins ?? {}))
    if (Object.hasOwn(coins, id) && Number.isInteger(Number(amount)) && Number(amount) > 0)
      coins[id] = Number(amount);
  return coins;
}
export function openAward(ctx, prefill = null) {
  const members = partyMembers(ctx.state);
  ctx.dialog(
    ctx.t("Assegna PE e monete al gruppo", "Award XP and coins to the party"),
    `<p class="muted">${ctx.t("Come «/award» di Foundry: a ciascuno oppure da dividere tra i destinatari. Le monete che non si dividono restano nella scorta.", "Like Foundry's “/award”: to each, or divided among the recipients. Coins that cannot be divided stay in the stash.")}</p><label class="field"><span>${ctx.t("Punti esperienza", "Experience points")}</span><input type="number" name="xp" min="0" step="1" value="${Number(prefill?.xp) || 0}" inputmode="numeric"></label>${coinInputs(ctx, awardCoins(prefill), "coin-")}<fieldset class="loot-recipients"><legend>${ctx.t("Modalità", "Mode")}</legend><label class="loot-check"><input type="radio" name="mode" value="split" checked> ${ctx.t("Da dividere tra i destinatari", "Divide among the recipients")}</label><label class="loot-check"><input type="radio" name="mode" value="each"> ${ctx.t("A ciascuno", "To each")}</label></fieldset><fieldset class="loot-recipients"><legend>${ctx.t("Destinatari", "Recipients")}</legend>${members.map((actor) => `<label class="loot-check"><input type="checkbox" name="recipient" value="${ctx.esc(actor.id)}" checked> ${ctx.esc(actor.name)}</label>`).join("")}</fieldset><label class="field"><span>${ctx.t("Motivo (facoltativo)", "Reason (optional)")}</span><input name="reason" maxlength="200" value="${ctx.esc(prefill?.reason ?? "")}" placeholder="${ctx.t("Es. goblin dell'osservatorio sconfitti", "E.g. observatory goblins defeated")}"></label><p class="loot-preview" data-loot-award-preview aria-live="polite"></p><p class="muted">${ctx.t("SRD 5.2.1: i PE sono assegnati dal Game Master; il valore di un mostro dipende dal suo GS.", "SRD 5.2.1: XP is awarded by the Game Master; a monster's value depends on its CR.")}</p>`,
    {
      submitLabel: ctx.t("Assegna", "Award"),
      onSubmit: (data) => {
        const input = {
          xp: Number(data.get("xp") || 0),
          coins: readCoins(data, "coin-"),
          mode: data.get("mode"),
          recipients: data.getAll("recipient"),
          reason: data.get("reason"),
        };
        commitLoot(
          ctx,
          ctx.t("PE e monete assegnati al gruppo", "XP and coins awarded to the party"),
          (draft, slice) => awardParty(draft, slice, ctx.role, input),
        );
        combatAward = null;
      },
    },
  );
  const form = globalThis.document?.querySelector?.("#dialog form");
  const preview = () => {
    const out = form?.querySelector("[data-loot-award-preview]");
    if (!out) return;
    try {
      const data = new FormData(form);
      const count = data.getAll("recipient").length;
      const xp = Number(data.get("xp") || 0);
      const coins = readCoins(data, "coin-");
      if (!count)
        return (out.textContent = ctx.t(
          "Scegli almeno un destinatario.",
          "Choose at least one recipient.",
        ));
      const each = data.get("mode") === "each";
      const { share, remainder } = each
        ? { share: coins, remainder: emptyCoins() }
        : splitCoins(coins, count);
      const perXp = each ? xp : Math.floor(xp / count);
      out.textContent =
        ctx.t("A testa", "Each") +
        `: ${perXp} ${ctx.t("PE", "XP")}` +
        (isEmptyCoins(share) ? "" : " + " + formatCoins(share, ctx.lang)) +
        (isEmptyCoins(remainder)
          ? ""
          : " · " +
            ctx.t("resto nella scorta", "remainder to the stash") +
            ": " +
            formatCoins(remainder, ctx.lang));
    } catch {
      out.textContent = "";
    }
  };
  form?.addEventListener("input", preview);
  form?.addEventListener("change", preview);
  preview();
}

// ---------------------------------------------------------------- handlers

function bindLoot(el, ctx) {
  el.addEventListener("click", (event) => {
    const control = event.target.closest?.("[data-loot]");
    if (!control || !el.contains(control) || control.disabled) return;
    // A stash box inside this element has its own bound handler.
    if (control.closest(".loot-stash") && el.querySelector(".loot-stash") !== el) return;
    withFocus(control, () => handleLootAction(ctx, control.dataset.loot, { ...control.dataset }));
  });
  el.addEventListener("submit", (event) => {
    const form = event.target.closest?.("form[data-loot-form]");
    if (!form || !el.contains(form) || form.closest(".loot-stash")) return;
    event.preventDefault();
    withFocus(form, () =>
      handleLootAction(ctx, form.dataset.lootForm, { ...form.dataset }, new FormData(form)),
    );
  });
  // <details> toggle does not bubble: listen in the capture phase.
  el.addEventListener(
    "toggle",
    (event) => {
      const details = event.target;
      if (details?.matches?.("details.loot-quick-add"))
        ui.quickAdd[details.dataset.id] = details.open;
    },
    true,
  );
  // Opened from the map marker or the token menu: the parcel scrolls into view and its
  // heading takes the keyboard focus.
  const card = ui.focusParcelId
    ? el.querySelector?.(`[data-parcel="${cssId(ui.focusParcelId)}"]`)
    : null;
  if (card) {
    card.scrollIntoView?.({ block: "nearest" });
    card.querySelector("h3")?.focus?.();
    ui.focusParcelId = null;
  }
  restoreFocus(el);
}
// Exported for tests: the same handler the bound controls call.
export function handleLootAction(ctx, action, data, form = null) {
  const slice = lootSlice(ctx.state);
  // DM preparation of a parcel the players cannot see yet stays out of their log
  // (handouts pattern: DM prep commits are private).
  const hidden = (id) => !slice.parcels.find((parcel) => parcel.id === id)?.revealed;
  const heading = (id) => [`#loot-parcel-${cssId(id)}`, "#loot-parcel-title"];
  const prep = (labelText, mutate, focus = null) =>
    commitLoot(ctx, labelText, mutate, { hidden: hidden(data.id), focus });
  return attempt(ctx, () => {
    switch (action) {
      case "undo":
        return ctx.undo();
      case "prep-open":
        return ctx.navigate("preparation", { tab: "loot" });
      case "parcel-edit":
        ui.prepParcelId = data.id;
        return ctx.navigate("preparation", { tab: "loot" });
      case "open-sheet":
        return ctx.openSheet(data.id, "inventory");
      case "award-open":
        return openAward(ctx);
      // PR-55: the treasure generator (generators area) from Preparation › Treasure.
      case "treasure-generate": {
        const command = ctx.registry?.get?.("command", "generators.treasure", ctx);
        return command ? ctx.registry.run(command, ctx) : null;
      }
      // PG-75: the campaign currencies page (inventory-plus), from the party inventory.
      case "currencies-open":
        return ctx.navigate("campaign", { tab: "inventory-plus-currencies" });
      case "parcel-pick":
        ui.prepParcelId = data.id;
        return ctx.render();
      case "parcel-create":
        return commitLoot(
          ctx,
          ctx.t("Pacchetto di tesoro creato", "Treasure parcel created"),
          (draft, s) => {
            ui.prepParcelId = createParcel(draft, s, ctx.role, {
              name: form.get("name"),
              sceneId: draft.activeSceneId,
            }).id;
          },
          { hidden: true, focus: "#loot-parcel-title", focusFirst: true },
        );
      case "parcel-save":
        return prep(ctx.t("Pacchetto aggiornato", "Parcel updated"), (draft, s) =>
          updateParcel(draft, s, ctx.role, data.id, {
            name: form.get("name"),
            sceneId: form.get("sceneId"),
            sourceActorId: form.get("sourceActorId"),
            note: form.get("note"),
          }),
        );
      case "parcel-coins": {
        const coins = readCoins(form, "coin-");
        return prep(ctx.t("Monete del pacchetto", "Parcel coins"), (draft, s) =>
          setParcelCoins(draft, s, ctx.role, data.id, coins),
        );
      }
      case "parcel-item-add": {
        const item = itemFromCatalog(form.get("srdId"), { quantity: Number(form.get("quantity")) });
        return prep(
          ctx.t("Oggetto aggiunto al pacchetto", "Item added to the parcel"),
          (draft, s) =>
            addParcelItem(draft, s, ctx.role, data.id, item, {
              unidentified: form.get("unidentified") === "on",
              apparentName: form.get("apparentName") ?? "",
            }),
        );
      }
      case "parcel-custom-add": {
        const item = customItem({
          name: form.get("name"),
          quantity: Number(form.get("quantity")),
          valueGp: form.get("valueGp"),
          weightKg: form.get("weightKg"),
          valuable: form.get("valuable") === "on",
        });
        return prep(
          ctx.t("Oggetto aggiunto al pacchetto", "Item added to the parcel"),
          (draft, s) => addParcelItem(draft, s, ctx.role, data.id, item),
        );
      }
      case "parcel-statblock-add": {
        const items = cleanGearFromStatBlock(form.get("creatureId"));
        return prep(
          ctx.t("Equipaggiamento del PNG aggiunto (copie pulite)", "NPC gear added (clean copies)"),
          (draft, s) => {
            for (const item of items) addParcelItem(draft, s, ctx.role, data.id, item);
          },
        );
      }
      case "parcel-npc-add": {
        const [actorId, rowId] = String(form.get("row")).split("::");
        const actor = ctx.state.actors[actorId];
        const row = actor?.inventory?.find((entry) => entry.id === rowId);
        if (!row) throw lootError("Oggetto non trovato.", "Item not found.");
        const item = cleanCopyOfNpcRow(actor, row);
        return prep(ctx.t("Copia pulita aggiunta", "Clean copy added"), (draft, s) =>
          addParcelItem(draft, s, ctx.role, data.id, item),
        );
      }
      case "parcel-item-remove":
        return prep(
          ctx.t("Oggetto tolto dal pacchetto", "Item removed from the parcel"),
          (draft, s) => removeParcelItem(draft, s, ctx.role, data.id, data.item),
          heading(data.id),
        );
      case "parcel-reveal": {
        // Showing (or hiding again) is the players' concern: a shared log entry.
        const parcel = parcelById(slice, data.id);
        const title = sharedTitle(ctx.state, parcel);
        return commitLoot(
          ctx,
          parcel.revealed
            ? ctx.t(`${title.it}: nascosto`, `${title.en}: hidden`)
            : ctx.t(`${title.it}: mostrato ai giocatori`, `${title.en}: shown to players`),
          (draft, s) => setParcelRevealed(draft, s, ctx.role, data.id, !parcel.revealed),
          { focus: heading(data.id) },
        );
      }
      case "parcel-delete":
        return ctx.dialog(
          ctx.t("Elimina pacchetto", "Delete parcel"),
          `<p>${ctx.t("Il pacchetto e il suo contenuto non distribuito spariscono. Quanto già assegnato resta ai personaggi e nel tesoro accumulato.", "The parcel and its undistributed content disappear. What was already assigned stays with the characters and in the accumulated treasure.")}</p>`,
          {
            submitLabel: ctx.t("Elimina", "Delete"),
            onSubmit: () =>
              prep(
                ctx.t("Pacchetto eliminato", "Parcel deleted"),
                (draft, s) => deleteParcel(draft, s, ctx.role, data.id),
                [".loot-prep-pick.active", 'form[data-loot-form="parcel-create"] [name="name"]'],
              ),
          },
        );
      case "assign": {
        const target = form.get("target");
        const quantity = Number(form.get("quantity") || 1);
        const who =
          target === "stash" ? ctx.t("scorta", "stash") : (ctx.state.actors[target]?.name ?? "");
        // Keyboard users hand out item after item: the next item's "Assign to" takes focus.
        const items = slice.parcels.find((parcel) => parcel.id === data.id)?.items ?? [];
        const index = items.findIndex((item) => item.id === data.item);
        const next =
          items[index]?.quantity > quantity ? items[index] : (items[index + 1] ?? items[index - 1]);
        return commitLoot(
          ctx,
          ctx.t(`Bottino assegnato: ${who}`, `Loot assigned: ${who}`),
          (draft, s) => assignParcelItem(draft, s, ctx.role, data.id, data.item, target, quantity),
          {
            focus: [
              ...(next ? [`form[data-item="${cssId(next.id)}"] [name="target"]`] : []),
              ...heading(data.id),
            ],
          },
        );
      }
      case "parcel-split": {
        const parcel = parcelById(slice, data.id);
        const title = sharedTitle(ctx.state, parcel);
        return openSplit(
          ctx,
          parcel.coins,
          ctx.t(
            `Dividi le monete: ${titleOf(ctx, parcel)}`,
            `Split the coins: ${titleOf(ctx, parcel)}`,
          ),
          (recipients) =>
            commitLoot(
              ctx,
              ctx.t(`Monete divise: ${title.it}`, `Coins split: ${title.en}`),
              (draft, s) => splitParcelCoins(draft, s, ctx.role, data.id, recipients),
              { focus: heading(data.id) },
            ),
        );
      }
      case "parcel-coins-stash":
        return commitLoot(
          ctx,
          ctx.t("Monete nella scorta", "Coins to the stash"),
          (draft, s) => parcelCoinsToStash(draft, s, ctx.role, data.id),
          { focus: heading(data.id) },
        );
      case "parcel-all-stash":
        return commitLoot(
          ctx,
          ctx.t("Tutto nella scorta", "Everything to the stash"),
          (draft, s) => parcelToStash(draft, s, ctx.role, data.id),
          { focus: heading(data.id) },
        );
      case "identify": {
        const owner = slice.parcels.find((parcel) =>
          parcel.items.some((item) => item.lootId === data.lootId),
        );
        return commitLoot(
          ctx,
          ctx.t("Oggetto identificato", "Item identified"),
          (draft, s) => identifyItem(draft, s, ctx.role, data.lootId),
          { hidden: !!owner && !owner.revealed, focus: owner ? heading(owner.id) : null },
        );
      }
    }
  });
}

// DM-only box on a sheet: the true identity of the character's unidentified items.
function renderIdentify(ctx, actor) {
  const slice = lootSlice(ctx.state);
  const rows = (actor.inventory ?? []).filter(
    (row) => row.unidentified && slice?.secrets[row.lootId],
  );
  return `<section class="panel loot-panel" aria-labelledby="loot-identify-${ctx.esc(actor.id)}"><div class="section-heading"><h2 id="loot-identify-${ctx.esc(actor.id)}">${ctx.t("Oggetti non identificati", "Unidentified items")}</h2><span class="badge">${ctx.t("Solo DM", "DM only")}</span></div><ul class="loot-list">${rows
    .map(
      (row) =>
        `<li class="loot-row"><div class="loot-row-copy"><strong>${itemName(ctx, row, slice)}</strong></div><button type="button" class="button" data-loot="identify" data-loot-id="${ctx.esc(row.lootId)}">${ctx.t("Identifica", "Identify")}</button></li>`,
    )
    .join("")}</ul></section>`;
}

// ---------------------------------------------------------------- map and token menu

function openDrawer(ctx, drawer) {
  const button = globalThis.document?.querySelector?.(`#content [data-table-drawer="${drawer}"]`);
  if (!button) return;
  if (button.getAttribute("aria-expanded") === "true") ctx.render();
  else button.click();
}
function openDrawerFor(ctx, parcelId) {
  ui.focusParcelId = parcelId;
  try {
    openDrawer(ctx, "loot");
  } finally {
    ui.focusParcelId = null;
  }
}
// A marker sits on a creature's token only where the viewer sees that token (the Table's
// own rule, Spectre audiences included): a player never learns where a hidden creature is.
function markerParcels(ctx, scene) {
  return (lootSlice(ctx.state)?.parcels ?? []).filter((parcel) => {
    if (!parcel.sourceActorId || parcel.sceneId !== scene.id) return false;
    if (parcelStatus(parcel) === "emptied" || (ctx.role !== "dm" && !parcel.revealed)) return false;
    const token = scene.tokens.find((entry) => entry.actorId === parcel.sourceActorId);
    return !!token && tokenSeen(ctx.state, token, ctx.role);
  });
}
// "Bottino: Esploratore", never "Bottino: Bottino: Esploratore".
function markerLabel(ctx, parcel) {
  const title = titleOf(ctx, parcel);
  return startsWithPrefix(title) ? title : `${prefixOf(ctx.lang)}: ${title}`;
}
function renderMarkers(ctx, tableView) {
  if (!isMember(ctx.state, ctx.role)) return "";
  return markerParcels(ctx, tableView.scene)
    .map((parcel) => {
      const token = tableView.scene.tokens.find((entry) => entry.actorId === parcel.sourceActorId);
      const label = markerLabel(ctx, parcel);
      return `<g class="loot-marker${parcel.revealed ? "" : " is-hidden"}" data-loot-marker="${ctx.esc(parcel.id)}" transform="translate(${token.x + 40},${token.y + 10})" role="button" tabindex="0" aria-label="${ctx.esc(label)}"><title>${ctx.esc(label)}</title><rect x="-17" y="-15" width="34" height="30" rx="7"/><path transform="scale(1.35)" d="M-7 -2h14l1 9h-16Z M-4 -2v-2a4 4 0 0 1 8 0v2" fill="none"/></g>`;
    })
    .join("");
}
// A route that opens the Loot drawer on one parcel (the players' "Loot to share"
// notification), like B25's route tab: #table?tab=loot:<parcel id>.
const ROUTE_PREFIX = "loot:";
export const parcelRoute = (parcelId) => ROUTE_PREFIX + parcelId;
// The shop on one merchant and bartering character: #table?tab=shop:<merchant>:<buyer>.
const SHOP_PREFIX = "shop:";
export const shopRoute = (merchantId, buyerId = "") =>
  SHOP_PREFIX + merchantId + (buyerId ? ":" + buyerId : "");
export function routedParcelId(view) {
  const tab = String(view?.tab ?? "");
  return view?.page === "table" && tab.startsWith(ROUTE_PREFIX)
    ? tab.slice(ROUTE_PREFIX.length)
    : null;
}
// Once per navigation: the drawer opens after the Table is on screen.
let routeView = null;
function applyParcelRoute(ctx) {
  const view = ctx.view;
  if (!view || view === routeView) return;
  routeView = view;
  const parcelId = routedParcelId(view);
  if (parcelId) globalThis.queueMicrotask?.(() => openDrawerFor(ctx, parcelId));
  const tab = String(view.tab ?? "");
  if (view.page === "table" && tab === AWARD_ROUTE && ctx.role === "dm")
    globalThis.queueMicrotask?.(() => openAward(ctx, combatAwardPrefill(ctx)));
  if (view.page === "table" && tab.startsWith(SHOP_PREFIX)) {
    const [merchantId, buyerId] = tab.slice(SHOP_PREFIX.length).split(":");
    selectShop(merchantId);
    if (buyerId) selectBarterer(buyerId);
    globalThis.queueMicrotask?.(() => {
      requestFocus("#loot-cart-title");
      try {
        openDrawer(ctx, "loot-shop");
      } finally {
        requestFocus(null);
      }
    });
  }
}
function bindMarkers(el, ctx) {
  applyParcelRoute(ctx);
  const open = (event) => {
    const marker = event.target.closest?.("[data-loot-marker]");
    if (!marker) return;
    event.preventDefault();
    event.stopPropagation();
    openDrawerFor(ctx, marker.dataset.lootMarker);
  };
  el.addEventListener("click", open);
  el.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") open(event);
  });
}

// ---------------------------------------------------------------- registration

export function register(registry) {
  registry.registerStateSlice(SLICE, { version: 1, seed: seedLoot, normalize: normalizeLoot });
  registry.registerStyles(new URL("./loot.css", import.meta.url));

  const campaignCharacter = (ctx, actor) =>
    actor?.kind === "character" && isPartyMember(ctx.state, actor.id);
  registry.add("sheet-section", {
    id: "loot-purse",
    tab: "inventory",
    label: L("Monete", "Coins"),
    order: 10,
    when: (ctx, actor) => actor?.kind === "character" && !actor.companion,
    render: (ctx, actor) => renderPurse(ctx, actor),
    bind: (el, ctx, actor) => bindPurse(el, ctx, actor),
  });
  registry.add("sheet-section", {
    id: "loot-stash",
    tab: "inventory",
    label: L("Scorta del gruppo", "Party stash"),
    order: 20,
    when: (ctx, actor) => campaignCharacter(ctx, actor) && stashVisibleTo(ctx, actor),
    render: (ctx, actor) => renderStash(ctx, actor),
    bind: (el, ctx, actor) => {
      bindStash(el, ctx, actor);
    },
  });
  registry.add("sheet-section", {
    id: "loot-identify",
    tab: "inventory",
    label: L("Oggetti non identificati", "Unidentified items"),
    order: 30,
    roles: ["dm"],
    when: (ctx, actor) =>
      (actor?.inventory ?? []).some(
        (row) => row.unidentified && lootSlice(ctx.state)?.secrets[row.lootId],
      ),
    render: (ctx, actor) => renderIdentify(ctx, actor),
    bind: (el, ctx) => bindLoot(el, ctx),
  });
  registry.add("sheet-section", {
    id: "loot-stash-equipped",
    tab: "actions",
    label: L("Dalla scorta del gruppo", "From the party stash"),
    order: 20,
    when: (ctx, actor) =>
      campaignCharacter(ctx, actor) &&
      stashVisibleTo(ctx, actor) &&
      stashEquippedBy(lootSlice(ctx.state), actor.id).length > 0,
    render: (ctx, actor) => renderStashEquipped(ctx, actor),
    bind: (el, ctx, actor) => bindStash(el, ctx, actor),
  });
  registry.add("sheet-section", {
    id: "loot-xp",
    tab: "features",
    label: L("Esperienza", "Experience"),
    order: 10,
    when: (ctx, actor) => actor?.kind === "character" && !actor.companion,
    render: (ctx, actor) => renderXp(ctx, actor),
    bind: (el, ctx, actor) => bindXp(el, ctx, actor),
  });
  registry.add("preparation-section", {
    id: "loot",
    group: "materials",
    label: L("Tesori", "Treasure"),
    order: 30,
    roles: ["dm"],
    render: renderTreasurePrep,
    bind: bindLoot,
  });
  registry.add("preparation-section", {
    id: "loot-merchants",
    group: "materials",
    label: L("Mercanti", "Merchants"),
    order: 31,
    roles: ["dm"],
    render: renderMerchantsPrep,
    bind: bindMerchantsPrep,
  });
  // PG-72: D&D Beyond's campaign «Party Inventory» tab (DDB-052): the shared stash with
  // «equipaggiato da» portraits (BG3), purses, experience and the treasure log.
  registry.add("campaign-section", {
    id: "loot",
    group: "play",
    label: L("Inventario del gruppo", "Party inventory"),
    description: L(
      "Scorta comune, oggetti condivisi, equipaggiato da, monete e tesoro del gruppo",
      "Party stash, shared items, equipped by, party coins and treasure",
    ),
    order: 55,
    when: (ctx) => isMember(ctx.state, ctx.role),
    render: renderTreasury,
    bind: (el, ctx) => {
      bindLoot(el, ctx);
      bindPartyInventory(el, ctx);
    },
  });
  // PG-17: the DM's award as a first-class command (D&D Beyond «Manage Experience»,
  // Foundry /award, FVT-051); also on «Inventario del gruppo», in the Treasury and in the
  // Table's Loot panel. Encounter XP is awarded from «Concludi incontro» (combat tracker).
  registry.add("command", {
    id: "loot-award",
    label: L("Assegna PE e monete", "Award XP and coins"),
    description: L(
      "PE, punti esperienza, esperienza, ricompense e monete al gruppo: divisi o a ciascuno",
      "XP, experience points, experience, rewards and coins to the party: divided or to each",
    ),
    // Final review F16: «bottino» finds the award (Alchemy OmniSearch aliases).
    keywords: [L("bottino", "loot"), L("ricompensa", "reward"), L("tesoro", "treasure")],
    roles: ["dm"],
    when: (ctx) => isMember(ctx.state, ctx.role) && partyMembers(ctx.state).length > 0,
    run: (ctx) => openAward(ctx),
  });
  registry.add("command", {
    id: "loot-party-open",
    label: L("Apri l'inventario del gruppo", "Open the party inventory"),
    description: L(
      "Scorta del gruppo, oggetti comuni, chi ha equipaggiato cosa",
      "Party stash, shared items, who has equipped what",
    ),
    when: (ctx) => isMember(ctx.state, ctx.role),
    run: (ctx) => ctx.navigate("campaign", { tab: "loot" }),
  });
  registry.add("table-panel", {
    id: "loot",
    section: "items",
    label: L("Bottino", "Loot"),
    placement: "sidebar-tab",
    icon: "bag",
    order: 50,
    when: (ctx) =>
      isMember(ctx.state, ctx.role) &&
      (ctx.role === "dm" || parcelsHere(ctx).some((parcel) => parcelStatus(parcel) === "revealed")),
    render: (ctx) => renderLootDrawer(ctx),
    bind: (el, ctx) => bindLoot(el, ctx),
  });
  registry.add("table-panel", {
    id: "loot-shop",
    section: "items",
    label: L("Bottega", "Shop"),
    placement: "sidebar-tab",
    icon: "coins",
    order: 51,
    when: (ctx) => isMember(ctx.state, ctx.role) && merchantsOnScene(ctx).length > 0,
    render: (ctx) => renderShop(ctx),
    bind: (el, ctx) => bindShop(el, ctx),
  });
  // The selected character's purse at the Table, next to its inventory button.
  registry.add("table-panel", {
    id: "loot-purse",
    label: L("Monete", "Coins"),
    placement: "inspector",
    order: 40,
    when: (ctx, view) => {
      const actor = ctx.state.actors[view?.selectedActorId];
      return actor?.kind === "character" && !actor.companion && ctx.canControl(actor);
    },
    render: (ctx, view) => {
      const actor = ctx.state.actors[view.selectedActorId];
      return `<p class="loot-inspector-purse"><strong data-loot-table-purse>${ctx.esc(actor.currency ? formatCoins(purseOf(actor), ctx.lang) : ctx.t("Nessuna moneta registrata", "No coins recorded"))}</strong> <button type="button" class="button quiet" data-loot="open-sheet" data-id="${ctx.esc(actor.id)}">${ctx.t("Monete e scorta", "Coins and stash")}</button></p>`;
    },
    bind: (el, ctx) => bindLoot(el, ctx),
  });
  registry.add("map-layer", {
    id: "loot-markers",
    label: L("Bottino sulle creature", "Loot on creatures"),
    // Above tokens and other area pins: a small badge at the creature's lower right.
    order: 67,
    interactive: true,
    svg: (ctx, tableView) => renderMarkers(ctx, tableView),
    bind: (el, ctx) => bindMarkers(el, ctx),
  });
  // GMG (VTL-095): the DM selects a creature's token → Loot; the loot window starts on it
  // (a hidden parcel) or opens the one already there. Players reach shown loot the same way.
  registry.add("token-menu", {
    id: "loot-open",
    submenu: "items",
    label: L("Bottino", "Loot"),
    icon: "bag",
    group: "loot",
    when: (ctx, target) => {
      const scene = ctx.state.scenes.find((entry) => entry.id === target?.sceneId);
      if (!scene || !isMember(ctx.state, ctx.role)) return false;
      if (ctx.role === "dm") return ctx.state.actors[target.actorId]?.kind === "npc";
      return markerParcels(ctx, scene).some((parcel) => parcel.sourceActorId === target.actorId);
    },
    run: (ctx, target) => {
      const scene = ctx.state.scenes.find((entry) => entry.id === target.sceneId);
      let parcel = markerParcels(ctx, scene).find(
        (entry) => entry.sourceActorId === target.actorId,
      );
      if (!parcel && ctx.role === "dm") {
        const name = ctx.state.actors[target.actorId]?.name ?? "";
        commitLoot(
          ctx,
          ctx.t(`Bottino preparato: ${name}`, `Loot started: ${name}`),
          (draft, s) => {
            parcel = startCreatureLoot(draft, s, ctx.role, {
              ...target,
              label: ctx.t("Bottino", "Loot"),
            });
          },
          { hidden: true },
        );
      }
      if (parcel) openDrawerFor(ctx, parcel.id);
    },
  });
  // GMG (VTL-096): a merchant bound to a creature opens its shop from the token.
  registry.add("token-menu", {
    id: "loot-shop-open",
    submenu: "items",
    label: L("Bottega", "Shop"),
    icon: "bag",
    group: "loot",
    when: (ctx, target) =>
      isMember(ctx.state, ctx.role) &&
      merchantsOnScene(ctx).some((merchant) => merchant.actorId === target?.actorId),
    run: (ctx, target) => {
      const merchant = merchantsOnScene(ctx).find((entry) => entry.actorId === target.actorId);
      if (!merchant) return;
      selectShop(merchant.id);
      requestFocus("#loot-wares-title");
      try {
        openDrawer(ctx, "loot-shop");
      } finally {
        requestFocus(null);
      }
    },
  });
  registry.add("notifications", {
    id: "loot-available",
    label: L("Bottino disponibile", "Loot available"),
    roles: ["player"],
    // Only loot the party can take now (this scene, or no scene); the notification opens
    // the Loot drawer on that parcel.
    collect: (ctx) =>
      isMember(ctx.state, ctx.role)
        ? (lootSlice(ctx.state)?.parcels ?? [])
            .filter(
              (parcel) =>
                parcelStatus(parcel) === "revealed" &&
                (!parcel.sceneId || parcel.sceneId === ctx.state.activeSceneId),
            )
            .map((parcel) => {
              const name = (lang) => {
                const title = withoutPrefix(parcelTitle(ctx.state, parcel, lang, ctx.role));
                return title ? ": " + title : "";
              };
              return {
                id: "loot-" + parcel.id,
                title: L(`Bottino da dividere${name("it")}`, `Loot to share${name("en")}`),
                body: sceneName(ctx, parcel.sceneId),
                target: { page: "table", params: { tab: parcelRoute(parcel.id) } },
              };
            })
        : [],
  });
  // TV-144: a buyer's offer waits for the DM (GMG cart with a DM-edited price); the bell
  // opens the shop on that merchant.
  registry.add("notifications", {
    id: "loot-offers",
    label: L("Offerte al mercante", "Offers to a merchant"),
    roles: ["dm"],
    collect: (ctx) =>
      pendingOffers(lootSlice(ctx.state)).map((cart) => {
        const buyer = ctx.state.actors[cart.buyerId]?.name ?? "—";
        const merchant =
          lootSlice(ctx.state).merchants.find((entry) => entry.id === cart.merchantId)?.name ?? "";
        const amount = (lang) =>
          `${cart.offer.finalCp >= 0 ? (lang === "it" ? "paga" : "pays") : lang === "it" ? "riceve" : "receives"} ${formatCp(Math.abs(cart.offer.finalCp), lang)}`;
        return {
          id: "loot-offer-" + cart.id,
          title: L(`Offerta di ${buyer} a ${merchant}`, `${buyer}'s offer to ${merchant}`),
          body: L(amount("it"), amount("en")),
          target: { page: "table", params: { tab: shopRoute(cart.merchantId, cart.buyerId) } },
        };
      }),
  });
  registry.add("notifications", {
    id: "loot-combat-award",
    label: L("Premi dopo l’incontro", "Awards after the encounter"),
    roles: ["dm"],
    collect: combatAwardNotice,
  });
  registry.on("combat-start", () => {
    combatAward = null;
  });
  registry.on("combat-end", (payload, { ctx } = {}) => {
    combatAward =
      payload?.correction || !ctx?.state
        ? null
        : { id: String(Date.now()), foes: defeatedFoes(ctx.state) };
  });
  registry.on("reset", resetUI);
  registry.on("role-changed", resetUI);
}

// Re-exported so tests and other areas (B25 random tables) use one API.
export {
  identifyItem,
  handleStashAction,
  openQuantity,
  renderLootDrawer,
  renderTreasury,
  renderTreasurePrep,
  renderIdentify,
  renderMarkers,
};
