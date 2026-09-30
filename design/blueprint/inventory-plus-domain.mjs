// B36 — deep inventory: pure domain (no DOM, no registry).
//
// Extends the existing inventory row model (characters.mjs, INVENTORY_FLOW.md) and the B26
// loot/stash domain (party-stash.mjs) instead of replacing them. Patterns copied, with census
// IDs: dnd5e inventory search, filters and grouping (FVT-023), nested containers up to five
// levels (FVT-024), currency transfer dialog (FVT-025), split a stack (FVT-026), move vs copy
// with ownership (FVT-027), ammunition expended by the attack (FVT-140), activities and the
// usage dialog (FVT-017/018), dawn recovery (FVT-061); D&D Beyond containers and coins in
// containers (DDB-047/048), three attunement slots (DDB-049), item customisation and charges
// (DDB-050), encumbrance off/standard/variant with push/drag/lift (DDB-051); Shard hidden →
// identify (VTL-020) and custom currencies with a rate (VTL-021); Roll20 currency converter
// (R20-030); BG3 equip restrictions refused with a reason and weapon-set toggle (CRP-021,
// CRP-023); Solasta quiver that chooses the ammunition (CRP-024); BG3 rarity filter (CRP-025).
//
// Rules: SRD 5.2.1 (2024), EN/IT pages in SOURCES. Anything that is not an SRD rule (the
// variant encumbrance, the dawn hour of the prototype calendar) carries its own authored
// source and says so. Every command validates control with character-access.mjs and throws
// an Error carrying {it, en}; callers run it inside ctx.commit.

import { canControlActor, canViewActor, isCampaignActor } from "./character-access.mjs";
import { getEffectiveActor } from "./forms-companions.mjs";
import { getById, poundsToKg, LABELS } from "./srd-sample.mjs";
const ABILITY_NAMES = LABELS.ability;
import {
  COIN_IDS,
  emptyCoins,
  normalizeCoins,
  isEmptyCoins,
  addCoins,
  coinsFromCp,
  coinsValue,
  coinsWeightKg,
  formatCoins,
  purseOf,
  setPurse,
  itemFromCatalog,
  giveItemToActor,
  hideIdentity,
  identifyItem,
  catalogEntry,
  stackableRow,
  lootSlice,
} from "./party-stash.mjs";
import { DAY, HOUR } from "./world-calendar.mjs";
import { rollDie } from "./state.mjs";
import { policyOf, ID as SETTINGS } from "./campaign-settings-domain.mjs";
import { sampleDate } from "./sample-clock.mjs";

export const ID = "inventory-plus";
export const ROLLS = "inventory-plus-rolls";
export const VERSION = 1;
export const MAX_DEPTH = 5; // dnd5e nests containers up to five levels (FVT-024)
export const ATTUNEMENT_LIMIT = 3;
export const ENCUMBRANCE_MODES = Object.freeze(["off", "standard", "variant"]);
export const RARITIES = Object.freeze(["common", "uncommon", "rare", "very-rare", "legendary"]);
export const MATERIALS = Object.freeze(["silver", "adamantine"]);
export const DAWN_HOUR = 6;

export const L = (it, en) => ({ it, en });
const copy = (value) => structuredClone(value);
const round2 = (value) => Math.round(value * 100) / 100;
export function fail(it, en) {
  return Object.assign(new Error(en), { it, en });
}
export function newId(prefix) {
  const random =
    globalThis.crypto?.randomUUID?.() ??
    Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  return prefix + "-" + random;
}
export function label(value, lang = "it") {
  if (value && typeof value === "object") return value[lang] || value.it || value.en || "";
  return String(value ?? "");
}

// ---------------------------------------------------------------- sources

const EN_URL = "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf";
const IT_URL = "https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf";
const EN_SHA = "8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87";
const IT_SHA = "a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718";
export function srd(en, it) {
  return {
    kind: "srd",
    edition: "2024",
    revision: "5.2.1",
    sha256: EN_SHA,
    url: EN_URL,
    pages: { en: [].concat(en), it: [].concat(it) },
    en: { url: EN_URL, sha256: EN_SHA, pages: [].concat(en) },
    it: { url: IT_URL, sha256: IT_SHA, pages: [].concat(it) },
  };
}
// Printed page numbers of the local immutable SRD copies (EN/IT), read 24/09/2026.
export const SOURCES = Object.freeze({
  coins: srd(89, 101),
  ammunition: srd(89, 102),
  heavy: srd(89, 102),
  range: srd(90, 101),
  twoHanded: srd(90, 102),
  shortbow: srd(91, 103),
  armorOneAtATime: srd(92, 105),
  backpack: srd(96, 113),
  arrows: srd(96, 111),
  identify: srd(102, 115),
  attunement: srd(102, 116),
  equipWeapons: srd(177, 204),
  carrying: srd(178, 205),
  bagOfHolding: srd(212, 252),
  ringOfProtection: srd(238, 240),
  staffOfFire: srd(245, 249),
  wandOfMagicMissiles: srd(251, 247),
  // Class "Weapon Proficiencies" rows (Core Traits tables).
  wizardWeapons: srd(77, 59),
  fighterWeapons: srd(47, 53),
  variantEncumbrance: {
    kind: "house-rule",
    edition: "2024",
    revision: "invp-variant-encumbrance-1",
    title: L("Ingombro variante (regola facoltativa)", "Variant encumbrance (optional rule)"),
    note: "Optional table rule copied from D&D Beyond's Variant Encumbrance option (DDB-051) and dnd5e's variant setting (FVT-029): over Str × 2.5 kg Speed −3 m; over Str × 5 kg Speed −6 m. It is not part of SRD 5.2.1, whose only rule is Carrying Capacity (EN 178 / IT 205).",
  },
  dawn: {
    kind: "authored-demo",
    edition: "2024",
    revision: "invp-dawn-0600",
    title: L("Alba alle 06:00 del calendario", "Dawn at 06:00 of the calendar"),
    note: "The SRD says 'daily at dawn' without an hour: the prototype places dawn at 06:00 of the campaign calendar (B42), clock zero at the calendar start.",
  },
  demo: {
    kind: "authored-demo",
    edition: "2024",
    revision: "invp-seed-1",
    note: "Synthetic sample item of the demo campaign 'Le lanterne di Bruma'.",
  },
});

// Classes whose Core Traits grant Simple (and Martial) weapons, SRD 5.2.1. Only the classes
// of the demo characters are listed with their page; any other class stays unverified.
const CLASS_WEAPONS = Object.freeze({
  wizard: { simple: true, martial: false, source: SOURCES.wizardWeapons },
  fighter: { simple: true, martial: true, source: SOURCES.fighterWeapons },
});

// ---------------------------------------------------------------- slices

export function emptySlice() {
  return { currencies: [], offers: [], ammo: {}, uses: [], applied: [], ledger: [] };
}
export function normalizeSlice(slice, fromVersion) {
  if (fromVersion > VERSION) throw Error("Saved inventory data comes from a newer version");
  const base = emptySlice();
  const list = (value) => (Array.isArray(value) ? value : []);
  return {
    currencies: list(slice?.currencies).filter((c) => c && typeof c.id === "string"),
    offers: list(slice?.offers).filter((o) => o && typeof o.id === "string"),
    ammo: slice?.ammo && typeof slice.ammo === "object" ? slice.ammo : base.ammo,
    uses: list(slice?.uses),
    applied: list(slice?.applied).filter((id) => typeof id === "string"),
    ledger: list(slice?.ledger),
  };
}
export const emptyRolls = () => ({ rolls: [] });
export function normalizeRolls(slice, fromVersion) {
  if (fromVersion > VERSION) throw Error("Saved roll records come from a newer version");
  return { rolls: Array.isArray(slice?.rolls) ? slice.rolls.filter((r) => r?.id) : [] };
}
export const sliceOf = (state) => state?.ext?.[ID] ?? null;
export const rollsOf = (state) => state?.ext?.[ROLLS] ?? null;

// ---------------------------------------------------------------- seed

const catalogRow = (slug, id, extra = {}) => {
  const entry = itemFromCatalog("srd2024:item:" + slug, { quantity: extra.quantity ?? 1 });
  const { lootId: _loot, identified: _identified, id: _id, ...rest } = entry;
  const row = { ...rest, id, equipped: false, ...extra };
  if (!Number.isInteger(row.value)) delete row.value;
  const magic = getById(entry.srdId)?.magic;
  if (magic?.rarity && RARITIES.includes(magic.rarity)) row.rarity = magic.rarity;
  if (magic?.attunement?.required) row.attunement = { required: true, by: null };
  return row;
};
const authoredRow = (id, it, en, fields) => ({
  id,
  name: L(it, en),
  quantity: 1,
  weight: null,
  equipped: false,
  kind: "gear",
  description: "",
  source: SOURCES.demo,
  ...fields,
});
const container = (capacityKg, extra = {}) => ({
  capacityKg,
  fixedWeight: false,
  extradimensional: false,
  coins: emptyCoins(),
  ...extra,
});
const missing = (actor, id) => !(actor.inventory ?? []).some((row) => row.id === id);
// Fields of this area that reveal what an unidentified item is: they travel with B26's
// secret record and come back with its identification (INV-10, VTL-020).
export const IDENTITY_FIELDS = Object.freeze(["attunement", "charges", "activities", "rarity"]);

function seedLivia(state, livia) {
  const dawn = dawnIndex(state);
  const rows = [
    catalogRow("bag-of-holding", "invp-bag", {
      container: container(250, { fixedWeight: true, extradimensional: true }),
    }),
    catalogRow("backpack", "invp-backpack", { container: container(15) }),
    { ...catalogRow("rations", "invp-rations", { quantity: 4 }), containerId: "invp-backpack" },
    { ...catalogRow("tinderbox", "invp-tinderbox"), containerId: "invp-backpack" },
    authoredRow("invp-star-notes", "Taccuino delle stelle", "Star notebook", {
      weight: 0.5,
      containerId: "invp-backpack",
      description: L(
        "Appunti di Livia sulle costellazioni viste dall’osservatorio.",
        "Livia’s notes on the constellations seen from the observatory.",
      ),
    }),
    authoredRow("invp-sky-maps", "Mappe del cielo", "Sky charts", {
      weight: 1,
      containerId: "invp-bag",
      description: L(
        "Rotoli di pergamena trovati nella biblioteca della torre.",
        "Parchment scrolls found in the tower library.",
      ),
    }),
    authoredRow("invp-crate", "Cassa di lenti dell’osservatorio", "Observatory lens crate", {
      weight: 20,
      description: L(
        "Lenti di cristallo imballate nella paglia: pesanti e fragili.",
        "Crystal lenses packed in straw: heavy and fragile.",
      ),
    }),
    catalogRow("shortbow", "invp-shortbow"),
    authoredRow("invp-arrows", "Frecce", "Arrows", {
      srdId: null,
      quantity: 20,
      weight: 0.025,
      value: 5,
      ammunition: "arrow",
      description: L(
        "Munizioni per archi: 20 frecce pesano 0,5 kg (una faretra).",
        "Ammunition for bows: 20 arrows weigh 1 lb (one quiver).",
      ),
      source: SOURCES.arrows,
    }),
    {
      ...catalogRow("wand-of-magic-missiles", "invp-wand"),
      charges: {
        value: 3,
        max: 7,
        regain: "1d6+1",
        recharge: "dawn",
        destroyOnLast: true,
        dawn,
      },
      activities: [
        {
          id: "magic-missile",
          spellId: "srd2024:spell:magic-missile",
          name: L("Dardo incantato", "Magic Missile"),
          charges: { min: 1, max: 3 },
          scaling: "level-per-charge",
          baseLevel: 1,
        },
      ],
    },
    authoredRow("invp-staff-fire", "Bastone del fuoco", "Staff of Fire", {
      srdId: null,
      rarity: "very-rare",
      description: L(
        "Resistenza al fuoco mentre lo impugni. 10 cariche per lanciare Mani brucianti (1), Palla di fuoco (3) o Muro di fuoco (4) con la tua CD; all’alba recupera 1d6 + 4 cariche.",
        "Resistance to Fire damage while you hold it. 10 charges to cast Burning Hands (1), Fireball (3) or Wall of Fire (4) with your spell save DC; regains 1d6 + 4 charges at dawn.",
      ),
      source: SOURCES.staffOfFire,
      attunement: { required: true, by: ["druid", "sorcerer", "warlock", "wizard"] },
      attuned: true,
      attunedBy: {
        method: "record",
        reason: "In sintonia prima dell’inizio della campagna (dato di esempio).",
        at: sampleDate("2026-09-10T20:00:00.000Z"),
      },
      charges: { value: 10, max: 10, regain: "1d6+4", recharge: "dawn", destroyOnLast: true, dawn },
      activities: [
        {
          id: "burning-hands",
          spellId: "srd2024:spell:burning-hands",
          name: L("Mani brucianti", "Burning Hands"),
          charges: { min: 1, max: 1 },
          level: 1,
        },
        {
          id: "fireball",
          spellId: "srd2024:spell:fireball",
          name: L("Palla di fuoco", "Fireball"),
          charges: { min: 3, max: 3 },
          level: 3,
        },
        {
          id: "wall-of-fire",
          spellId: "srd2024:spell:wall-of-fire",
          name: L("Muro di fuoco", "Wall of Fire"),
          charges: { min: 4, max: 4 },
          level: 4,
        },
      ],
    }),
    {
      ...catalogRow("cloak-of-protection", "invp-cloak", { equipped: true }),
      attuned: true,
      attunedBy: {
        method: "record",
        reason: "In sintonia prima dell’inizio della campagna (dato di esempio).",
        at: sampleDate("2026-09-10T20:00:00.000Z"),
      },
    },
    { ...catalogRow("amulet-of-health", "invp-amulet"), containerId: "invp-bag" },
    catalogRow("ring-of-protection", "invp-ring"),
  ];
  livia.inventory ??= [];
  for (const row of rows) if (missing(livia, row.id)) livia.inventory.push(row);
  livia.weaponSets ??= { active: "melee", melee: "staff", ranged: "invp-shortbow" };
  if (!livia.currency) livia.currency = { pp: 0, gp: 30, ep: 0, sp: 45, cp: 120 };
  livia.customCoins ??= { "bruma-scale": 12 };
  // The engraved ring is still unknown to Livia: B26's own hide/identify record (INV-10).
  const ring = livia.inventory.find((row) => row.id === "invp-ring");
  const loot = state.ext?.loot;
  if (ring && !ring.unidentified && loot?.secrets && typeof loot.secrets === "object")
    hideRow(
      loot,
      ring,
      L("Anello d’argento inciso", "Engraved silver ring"),
      L(
        "Un anello d’argento inciso a stelle, trovato sotto la grande lente.",
        "A silver ring engraved with stars, found under the great lens.",
      ),
    );
}
function seedDoran(doran) {
  const rows = [
    catalogRow("longsword", "invp-doran-longsword", { equipped: true }),
    catalogRow("shield", "invp-doran-shield", { equipped: true }),
    catalogRow("longbow", "invp-doran-longbow"),
  ];
  doran.inventory ??= [];
  for (const row of rows) if (missing(doran, row.id)) doran.inventory.push(row);
  doran.weaponSets ??= {
    active: "melee",
    melee: "invp-doran-longsword",
    ranged: "invp-doran-longbow",
  };
}
// seed(state): own slice plus synthetic rows on the sample characters when absent (the
// registry's convention, like B21 Iria and B54 sparks); existing rows are never changed.
export function seedSlice(state) {
  const slice = emptySlice();
  slice.currencies.push({
    id: "bruma-scale",
    name: L("Scaglia di Bruma", "Bruma scale"),
    abbr: L("sb", "bs"),
    perGp: 5,
    weightKg: 0.01,
    note: L(
      "Valuta locale di Bruma: squame d’argento del lago, 5 per una moneta d’oro.",
      "Bruma's local currency: silver lake scales, 5 to a gold piece.",
    ),
    source: {
      kind: "campaign-rule",
      author: "dm",
      edition: "2024",
      revision: "bruma-scale-1",
      note: "Custom currency written by the DM (VTL-021 pattern), not an SRD coin.",
    },
  });
  if (state?.actors?.livia) seedLivia(state, state.actors.livia);
  if (state?.actors?.doran) seedDoran(state.actors.doran);
  return slice;
}

// ---------------------------------------------------------------- rows and access

export const rowsOf = (actor) => (Array.isArray(actor?.inventory) ? actor.inventory : []);
export const rowById = (actor, id) => rowsOf(actor).find((row) => row.id === id) ?? null;

// ---------------------------------------------------------------- potions (C7)

// Contract C7 (BG3 Custom Mode, Solasta presets): the campaign's rule for drinking a potion.
// SRD 5.2.1 Potion of Healing: a Bonus Action; a campaign's house rule can make it an Action.
export const potionCost = (state) =>
  policyOf(state?.ext?.[SETTINGS], state?.campaign?.id).potions === "action" ? "action" : "bonus";
/**
 * Why this potion cannot be drunk now, as one sentence «cause. remedy.» ({it, en}), or null.
 * Outside its turn the use can still be previewed (the dialog says so), so only a spent
 * resource of the creature's current combat blocks it here.
 */
export function potionBlock(state, actor, row) {
  if (!row || !actor) return null;
  if (!(row.quantity > 0))
    return L(
      "Nessuna pozione rimasta. Aggiungine una dall’Inventario.",
      "No potion left. Add one from the Inventory.",
    );
  if (actor.pendingHealing)
    return L(
      "Un tiro di pozione aspetta i dadi. Registralo prima con «Registra il tiro della pozione».",
      "A potion roll is waiting for its dice. Record it first with “Record the potion roll”.",
    );
  if (row.location === "ground")
    return L(
      "La pozione è a terra. Raccoglila prima con «Registra raccolto».",
      "The potion is on the ground. Pick it up first with “Record picked up”.",
    );
  if (row.availableInForm === false)
    return L(
      "La pozione è fusa nella forma attuale. Torna alla forma normale per berla.",
      "The potion is merged into the current form. Return to your normal form to drink it.",
    );
  const fighting = state?.combat?.active && (state.combat.order ?? []).includes(actor.id);
  const cost = potionCost(state);
  if (fighting && cost === "action" && actor.action === false)
    return L(
      "Azione già spesa in questo turno: per la regola della campagna bere una pozione è un’Azione. Bevi nel prossimo turno.",
      "Action already spent this turn: under the campaign’s rule drinking a potion is an Action. Drink on your next turn.",
    );
  if (fighting && cost === "bonus" && actor.bonus === false)
    return L(
      "Azione bonus già spesa in questo turno. Bevi nel prossimo turno.",
      "Bonus Action already spent this turn. Drink on your next turn.",
    );
  return null;
}
export function rowName(row, lang = "it") {
  const custom = row?.custom?.name;
  return custom ? String(custom) : label(row?.name, lang);
}
export const unitWeight = (row) => {
  const custom = row?.custom?.weightKg;
  if (Number.isFinite(custom)) return custom;
  return Number.isFinite(row?.weight) ? row.weight : null;
};
export const isContainer = (row) =>
  !!row?.container && typeof row.container === "object" && !row.unidentified;
// The parent a row really sits in: a dangling reference (the container left this inventory,
// for example deposited in the party stash) counts as carried loose.
export function parentOf(actor, row) {
  if (!row?.containerId) return null;
  const parent = rowById(actor, row.containerId);
  return parent && isContainer(parent) && parent.id !== row.id ? parent : null;
}
export const childrenOf = (actor, containerId) =>
  rowsOf(actor).filter((row) => parentOf(actor, row)?.id === containerId);
export function descendantsOf(actor, containerId) {
  const out = [];
  const walk = (id, seen) => {
    for (const child of childrenOf(actor, id)) {
      if (seen.has(child.id)) continue;
      seen.add(child.id);
      out.push(child);
      if (isContainer(child)) walk(child.id, seen);
    }
  };
  walk(containerId, new Set([containerId]));
  return out;
}
export function pathOf(actor, row) {
  const path = [];
  let parent = parentOf(actor, row);
  const seen = new Set();
  while (parent && !seen.has(parent.id)) {
    seen.add(parent.id);
    path.unshift(parent);
    parent = parentOf(actor, parent);
  }
  return path;
}
export const depthOf = (actor, row) => pathOf(actor, row).length;
export function rarityOf(row) {
  if (row?.unidentified) return null;
  if (RARITIES.includes(row?.rarity)) return row.rarity;
  const rarity = catalogEntry(row)?.magic?.rarity;
  return RARITIES.includes(rarity) ? rarity : null;
}
export const needsAttunement = (row) => !row?.unidentified && row?.attunement?.required === true;
export const attunedRows = (actor) => rowsOf(actor).filter((row) => row.attuned === true);
export const isAmmunition = (row) => typeof row?.ammunition === "string" && !row.unidentified;
export const isShield = (row) =>
  row?.armor?.category === "shield" || row?.srdId === "srd2024:item:shield";
export const isArmor = (row) => !!row?.armor && !isShield(row);
export const isWeapon = (row) => !!row?.weapon || row?.kind === "weapon";

function requireActor(state, actorId, role) {
  const actor = state.actors?.[actorId];
  if (!actor || !canViewActor(actor, role, state))
    throw fail("Scheda non disponibile.", "Sheet not available.");
  if (!canControlActor(actor, role, state))
    throw fail("Non controlli questa scheda.", "You do not control this sheet.");
  return actor;
}
function requireRow(actor, rowId) {
  const row = rowById(actor, rowId);
  if (!row) throw fail("L’oggetto non è più nell’inventario.", "The item is no longer there.");
  return row;
}
const shared = (actor) => actor?.visibility !== "private";
function ledger(state, entry) {
  const slice = sliceOf(state);
  if (!slice) return null;
  const record = { id: newId("invp-log"), at: new Date().toISOString(), ...copy(entry) };
  slice.ledger.push(record);
  if (slice.ledger.length > 200) slice.ledger.splice(0, slice.ledger.length - 200);
  return record;
}
function note(state, actor, role, it, en, extra = {}) {
  if (!shared(actor)) return null; // a private sheet keeps no shared record (like B26)
  return ledger(state, { by: role, actorIds: [actor.id], text: L(it, en), ...extra });
}

// ---------------------------------------------------------------- weight and capacity

const coinCount = (coins) => COIN_IDS.reduce((sum, id) => sum + (coins?.[id] ?? 0), 0);
export const containerCoins = (row) => row?.container?.coins ?? emptyCoins();
// Campaign currencies kept in a container (PG-75): {currencyId: count}.
export const containerCustomCoins = (row) => row?.container?.customCoins ?? {};
export function currenciesOf(state) {
  return sliceOf(state)?.currencies ?? [];
}
function customWeight(state, coins) {
  let kg = 0;
  for (const [id, count] of Object.entries(coins ?? {})) {
    const def = currenciesOf(state).find((c) => c.id === id);
    if (def && Number.isFinite(def.weightKg)) kg += def.weightKg * (Number(count) || 0);
  }
  return kg;
}
export function customCoinsWeight(state, actor) {
  return round2(customWeight(state, actor?.customCoins));
}
// Weight of what a container holds: its rows (a nested container adds its own contents,
// unless its weight is fixed like a Bag of Holding) and the coins inside it. With the state,
// campaign currencies inside it weigh too.
export function contentsWeight(actor, containerRow, state = null) {
  let kg = poundsToKg(coinCount(containerCoins(containerRow)) / 50);
  if (state) kg += customWeight(state, containerCustomCoins(containerRow));
  let incomplete = false;
  for (const child of childrenOf(actor, containerRow.id)) {
    const unit = unitWeight(child);
    if (unit == null && child.quantity > 0) incomplete = true;
    else kg += (unit ?? 0) * (child.quantity ?? 0);
    if (isContainer(child) && !child.container.fixedWeight) {
      const inner = contentsWeight(actor, child, state);
      kg += inner.kg;
      incomplete ||= inner.incomplete;
    }
  }
  return { kg: round2(kg), incomplete };
}
export function capacityOf(actor, containerRow, state = null) {
  const used = contentsWeight(actor, containerRow, state);
  const capacity = containerRow.container?.capacityKg;
  return {
    used: used.kg,
    incomplete: used.incomplete,
    capacity: Number.isFinite(capacity) ? capacity : null,
    over: Number.isFinite(capacity) && used.kg > capacity,
  };
}
// Carried weight: loose rows and top-level containers, coins in the purse (unless the
// character ignores coin weight, DDB-048) and custom coins. Items on the ground are not
// carried; unknown weights make the total incomplete, never zero (INV-03).
export function carriedWeight(actor, state = null) {
  let kg = 0;
  let incomplete = false;
  const excluded = [];
  for (const row of rowsOf(actor)) {
    if (parentOf(actor, row) || row.location === "ground") continue;
    const unit = unitWeight(row);
    if (unit == null && row.quantity > 0) incomplete = true;
    else kg += (unit ?? 0) * (row.quantity ?? 0);
    if (isContainer(row)) {
      const inner = contentsWeight(actor, row, state);
      if (row.container.fixedWeight) excluded.push({ id: row.id, kg: inner.kg });
      else {
        kg += inner.kg;
        incomplete ||= inner.incomplete;
      }
    }
  }
  const ignoreCoins = actor?.encumbrance?.ignoreCoins === true;
  const coins = ignoreCoins ? 0 : coinsWeightKg(purseOf(actor));
  const custom = ignoreCoins || !state ? 0 : customCoinsWeight(state, actor);
  return { kg: round2(kg + coins + custom), incomplete, coinsKg: round2(coins + custom), excluded };
}

// ---------------------------------------------------------------- encumbrance

// SRD 5.2.1 Carrying Capacity (EN 178 / IT 205), metric per the Italian SRD: Small/Medium
// carry Str × 7.5 kg and drag/lift/push Str × 15 kg; Tiny halves, Large ×2, Huge ×4,
// Gargantuan ×8.
const SIZE_FACTOR = { tiny: 0.5, small: 1, medium: 1, large: 2, huge: 4, gargantuan: 8 };
export function encumbranceOf(actor, state = null) {
  const mode = ENCUMBRANCE_MODES.includes(actor?.encumbrance?.mode)
    ? actor.encumbrance.mode
    : "standard";
  const eff = getEffectiveActor(actor) ?? actor;
  const str = eff?.abilities?.str;
  const factor = SIZE_FACTOR[eff?.size] ?? 1;
  const weight = carriedWeight(actor, state);
  const base = {
    mode,
    weightKg: weight.kg,
    incomplete: weight.incomplete,
    coinsKg: weight.coinsKg,
    excluded: weight.excluded,
    ignoreCoins: actor?.encumbrance?.ignoreCoins === true,
    carryKg: null,
    dragKg: null,
    status: "none",
    speedDelta: 0,
    speedCap: null,
    reason: null,
    source: mode === "variant" ? SOURCES.variantEncumbrance : SOURCES.carrying,
  };
  if (!Number.isFinite(str)) return { ...base, status: "unknown" };
  const carry = round2(str * 7.5 * factor);
  const drag = round2(str * 15 * factor);
  const out = { ...base, carryKg: carry, dragKg: drag };
  if (mode === "variant") {
    out.encumberedKg = round2(str * 2.5 * factor);
    out.heavyKg = round2(str * 5 * factor);
  }
  if (mode === "off") return out;
  const w = weight.kg;
  if (w > drag) {
    out.status = "immobile";
    out.speedCap = 0;
    out.reason = L(
      `Porti ${fmt(w, "it")} kg: oltre il massimo che puoi trascinare (For × 15 kg = ${fmt(drag, "it")} kg). Non puoi spostare questo carico: lascia qualcosa.`,
      `You carry ${fmt(w, "en")} kg: more than you can drag (Str × 15 kg = ${fmt(drag, "en")} kg). You cannot move this load: leave something behind.`,
    );
    out.source = SOURCES.carrying;
    return out;
  }
  if (w > carry) {
    out.status = "over";
    out.speedCap = 1.5;
    out.reason = L(
      `Porti ${fmt(w, "it")} kg, oltre la capacità di trasporto (For × 7,5 kg = ${fmt(carry, "it")} kg): mentre trascini un peso superiore la Velocità non supera 1,5 m.`,
      `You carry ${fmt(w, "en")} kg, over your carrying capacity (Str × 7.5 kg = ${fmt(carry, "en")} kg): while you drag more than that your Speed can be no more than 1.5 m.`,
    );
    out.source = SOURCES.carrying;
    return out;
  }
  if (mode === "variant" && w > out.heavyKg) {
    out.status = "heavily";
    out.speedDelta = -6;
    out.reason = L(
      `Pesantemente ingombrato: ${fmt(w, "it")} kg supera For × 5 kg (${fmt(out.heavyKg, "it")} kg). Velocità −6 m; regola della casa: svantaggio a prove, attacchi e TS di Forza, Destrezza e Costituzione (non calcolato dall’app).`,
      `Heavily encumbered: ${fmt(w, "en")} kg exceeds Str × 5 kg (${fmt(out.heavyKg, "en")} kg). Speed −6 m; house rule: Disadvantage on Strength, Dexterity and Constitution checks, attacks and saves (not computed by the app).`,
    );
  } else if (mode === "variant" && w > out.encumberedKg) {
    out.status = "encumbered";
    out.speedDelta = -3;
    out.reason = L(
      `Ingombrato: ${fmt(w, "it")} kg supera For × 2,5 kg (${fmt(out.encumberedKg, "it")} kg). Velocità −3 m.`,
      `Encumbered: ${fmt(w, "en")} kg exceeds Str × 2.5 kg (${fmt(out.encumberedKg, "en")} kg). Speed −3 m.`,
    );
  }
  return out;
}
export function fmt(value, lang) {
  if (!Number.isFinite(value)) return "—";
  const text = String(Math.abs(value) < 1 ? Math.round(value * 1000) / 1000 : round2(value));
  return lang === "it" ? text.replace(".", ",") : text;
}
// Speed adjuster for forms-companions.getEffectiveSpeed (registered by the entry module):
// the load changes the base walking speed before conditions apply. A form uses its own.
export function encumbranceSpeed(eff, speed, state = null) {
  if (!eff || eff.activeForm || !Number.isFinite(speed)) return null;
  if (!Array.isArray(eff.inventory)) return null;
  const load = encumbranceOf(eff, state);
  if (load.mode === "off" || !["encumbered", "heavily", "over", "immobile"].includes(load.status))
    return null;
  let next = Math.max(0, speed + load.speedDelta);
  if (load.speedCap != null) next = Math.min(next, load.speedCap);
  return next === speed ? null : { speed: next, reason: load.reason, source: load.source };
}
export function setEncumbrance(state, actorId, { mode, ignoreCoins }, role) {
  const actor = requireActor(state, actorId, role);
  if (!ENCUMBRANCE_MODES.includes(mode))
    throw fail("Modalità di ingombro non valida.", "Invalid encumbrance mode.");
  const before = actor.encumbrance?.mode ?? "standard";
  actor.encumbrance = { mode, ignoreCoins: ignoreCoins === true };
  if (before !== mode)
    note(
      state,
      actor,
      role,
      `${actor.name}: ingombro ${modeName(before, "it")} → ${modeName(mode, "it")}`,
      `${actor.name}: encumbrance ${modeName(before, "en")} → ${modeName(mode, "en")}`,
    );
  return actor.encumbrance;
}
export const modeName = (mode, lang) =>
  label(
    {
      off: L("disattivato", "off"),
      standard: L("standard (SRD 2024)", "standard (SRD 2024)"),
      variant: L("variante", "variant"),
    }[mode] ?? mode,
    lang,
  );

// ---------------------------------------------------------------- equipment rules

const hands = (row) => {
  if (isShield(row)) return 1;
  if (!isWeapon(row)) return 0;
  return row.weapon?.properties?.includes("two-handed") ? 2 : 1;
};
// BG3 refuses an incompatible slot with a message (CRP-021); the rules behind each refusal
// are the 2024 ones: Two-Handed (EN 90 / IT 102), one armor and one shield (EN 92 / IT 105).
export function equipIssues(actor, row, { ignore = [] } = {}) {
  const issues = [];
  if (!row) return [L("Oggetto non disponibile.", "Item unavailable.")];
  if (!(row.quantity > 0)) issues.push(L("Quantità esaurita.", "None left."));
  if (row.location === "ground")
    issues.push(L("L’oggetto è a terra: registralo raccolto.", "It is on the ground."));
  const others = rowsOf(actor).filter(
    (other) => other.id !== row.id && other.equipped && !ignore.includes(other.id),
  );
  if (isArmor(row)) {
    const armor = others.find(isArmor);
    if (armor)
      issues.push(
        L(
          `Una creatura indossa una sola armatura alla volta: togli prima ${rowName(armor, "it")}.`,
          `A creature wears only one suit of armor at a time: take off ${rowName(armor, "en")} first.`,
        ),
      );
  }
  if (isShield(row) && others.some(isShield))
    issues.push(L("Si impugna un solo scudo alla volta.", "You wield only one Shield at a time."));
  const need = hands(row);
  if (need) {
    const busy = others.filter((other) => hands(other) > 0);
    const used = busy.reduce((sum, other) => sum + hands(other), 0);
    if (used + need > 2) {
      const names = (lang) => busy.map((other) => rowName(other, lang)).join(", ");
      issues.push(
        need === 2
          ? L(
              `${rowName(row, "it")} richiede due mani quando attacchi: hai già in mano ${names("it")}. Usa «Cambia set» o riponi prima ${names("it")}.`,
              `${rowName(row, "en")} needs two hands when you attack: you already hold ${names("en")}. Use “Swap set” or unequip ${names("en")} first.`,
            )
          : L(
              `Hai già le mani occupate (${names("it")}): riponi prima qualcosa.`,
              `Your hands are full (${names("en")}): unequip something first.`,
            ),
      );
    }
  }
  return issues;
}
export function setEquipped(state, actorId, rowId, equipped, role) {
  const actor = requireActor(state, actorId, role);
  const row = requireRow(actor, rowId);
  if (equipped) {
    const issues = equipIssues(actor, row);
    if (issues.length) throw fail(issues[0].it, issues[0].en);
    // Equipping takes the item out of its bag (BG3 equips straight from the inventory).
    delete row.containerId;
    row.equipped = true;
    if (isWeapon(row) && row.weapon) {
      actor.weaponSets ??= { active: "melee", melee: null, ranged: null };
      const set = row.weapon.type === "ranged" ? "ranged" : "melee";
      if (!actor.weaponSets[set]) actor.weaponSets[set] = row.id;
    }
  } else row.equipped = false;
  note(
    state,
    actor,
    role,
    `${actor.name}: ${rowName(row, "it")} ${equipped ? "equipaggiato" : "riposto"}`,
    `${actor.name}: ${rowName(row, "en")} ${equipped ? "equipped" : "unequipped"}`,
  );
  return row;
}
// During a fight the equip toggle records a fact; the 2024 timing stays the table's call
// (the core «Registra equipaggiamento» said so, INV-04): armor takes minutes, a Shield the
// Utilize action (EN 92 / IT 105), a weapon one equip or unequip per attack (EN 177 / IT 204).
export function combatEquipNote(state, actorId, row) {
  if (!state?.combat?.active || !(state.combat.order ?? []).includes(actorId) || !row) return null;
  if (isShield(row))
    return L(
      "Registrato come fatto: in combattimento indossare o togliere uno scudo richiede l’azione Utilizzo (SRD EN 92 / IT 105).",
      "Recorded as a fact: in a fight donning or doffing a Shield takes the Utilize action (SRD EN 92 / IT 105).",
    );
  if (isArmor(row))
    return L(
      "Registrato come fatto: indossare o togliere un’armatura richiede minuti, non un turno (SRD EN 92 / IT 105).",
      "Recorded as a fact: donning or doffing armor takes minutes, not a turn (SRD EN 92 / IT 105).",
    );
  if (isWeapon(row))
    return L(
      "Registrato come fatto: puoi equipaggiare o riporre un’arma quando attacchi, una per attacco (SRD EN 177 / IT 204).",
      "Recorded as a fact: you can equip or unequip one weapon when you make an attack (SRD EN 177 / IT 204).",
    );
  return null;
}
export function weaponSetsOf(actor) {
  const sets = actor?.weaponSets ?? { active: "melee", melee: null, ranged: null };
  const row = (id) => (id ? rowById(actor, id) : null);
  return {
    active: sets.active === "ranged" ? "ranged" : "melee",
    melee: row(sets.melee),
    ranged: row(sets.ranged),
  };
}
export function assignWeaponSet(state, actorId, rowId, set, role) {
  const actor = requireActor(state, actorId, role);
  const row = requireRow(actor, rowId);
  if (!["melee", "ranged"].includes(set)) throw fail("Set non valido.", "Invalid set.");
  if (!isWeapon(row)) throw fail("Solo le armi entrano in un set.", "Only weapons go in a set.");
  actor.weaponSets ??= { active: "melee", melee: null, ranged: null };
  actor.weaponSets[set] = row.id;
  return actor.weaponSets;
}
// BG3 weapon-set toggle (CRP-023): one command unequips the active set's weapon and equips
// the other set's. Whatever else is in hand and blocks the other set (a dagger held apart,
// a Shield under a two-handed bow) is put away by the same command, as BG3's melee/ranged
// button does, and comes back when the set it went away with returns (the set's off hand).
// Recorded as a fact; the 2024 rule lets you equip or unequip one weapon as part of each
// attack (EN 177 / IT 204): the table settles the timing.
export function swapWeaponSet(state, actorId, role) {
  const actor = requireActor(state, actorId, role);
  const sets = weaponSetsOf(actor);
  const current = sets.active;
  const next = current === "melee" ? "ranged" : "melee";
  const from = sets[current];
  const to = sets[next];
  if (!to)
    throw fail(
      next === "ranged"
        ? "Nessuna arma nel set a distanza: assegnala dall’inventario."
        : "Nessuna arma nel set da mischia: assegnala dall’inventario.",
      next === "ranged"
        ? "No weapon in the ranged set: assign one from the inventory."
        : "No weapon in the melee set: assign one from the inventory.",
    );
  // What stops the other set: anything else held in the hands beside the active set's
  // weapon (an off-hand weapon, a Shield under a two-handed weapon), one item at a time.
  const ignore = from ? [from.id] : [];
  const stowed = [];
  let issues = equipIssues(actor, to, { ignore });
  for (const row of rowsOf(actor)) {
    if (!issues.length) break;
    if (row.id === to.id || !row.equipped || ignore.includes(row.id) || hands(row) === 0) continue;
    stowed.push(row);
    issues = equipIssues(actor, to, { ignore: [...ignore, ...stowed.map((r) => r.id)] });
  }
  if (issues.length) throw fail(issues[0].it, issues[0].en);
  if (from) from.equipped = false;
  for (const row of stowed) row.equipped = false;
  delete to.containerId;
  to.equipped = true;
  // The set that is leaving remembers what it had in the other hand; the returning set
  // takes back what it had (when it still fits).
  const offhand = { ...(actor.weaponSets?.offhand ?? {}) };
  offhand[current] = stowed.map((row) => row.id);
  const restored = [];
  for (const id of actor.weaponSets?.offhand?.[next] ?? []) {
    const row = rowById(actor, id);
    if (!row || row.equipped || row.location === "ground" || !(row.quantity > 0)) continue;
    if (equipIssues(actor, row).length) continue;
    delete row.containerId;
    row.equipped = true;
    restored.push(row);
  }
  offhand[next] = [];
  actor.weaponSets = { ...(actor.weaponSets ?? {}), active: next, offhand };
  const list = (rows, lang) => rows.map((row) => rowName(row, lang)).join(", ");
  note(
    state,
    actor,
    role,
    `${actor.name} cambia set: ${from ? rowName(from, "it") + " → " : ""}${rowName(to, "it")}${stowed.length ? `; ripone ${list(stowed, "it")}` : ""}${restored.length ? `; riprende ${list(restored, "it")}` : ""}`,
    `${actor.name} swaps set: ${from ? rowName(from, "en") + " → " : ""}${rowName(to, "en")}${stowed.length ? `; puts away ${list(stowed, "en")}` : ""}${restored.length ? `; takes back ${list(restored, "en")}` : ""}`,
  );
  return {
    from: from?.id ?? null,
    to: to.id,
    active: next,
    stowed: stowed.map((row) => row.id),
    restored: restored.map((row) => row.id),
  };
}
// Items that can be equipped (PG-62: D&D Beyond and BG3 offer «Equip» on weapons, armor,
// shields and wearable magic items, not on rations, rope or books). A custom row can say
// so itself (`equippable`); an equipped row can always be put away.
export function isEquippable(row) {
  if (!row || isContainer(row) || isAmmunition(row) || row.kind === "consumable") return false;
  if (row.equipped) return true;
  if (typeof row.equippable === "boolean") return row.equippable;
  if (isWeapon(row) || isArmor(row) || isShield(row)) return true;
  return !!(row.attunement || row.category === "magic-item" || row.rarity || row.unidentified);
}
// D&D Beyond «+ Add Items» (DDB inventory): an SRD catalogue item straight onto the sheet,
// stacked with an identical unequipped row. Owned items only: no purchase, no payment.
export function addCatalogItem(state, actorId, srdId, quantity, role) {
  const actor = requireActor(state, actorId, role);
  const item = itemFromCatalog(srdId, { quantity });
  const row = giveItemToActor(actor, item, quantity);
  note(
    state,
    actor,
    role,
    `${actor.name} aggiunge ${rowName(row, "it")} ×${quantity}`,
    `${actor.name} adds ${rowName(row, "en")} ×${quantity}`,
  );
  return row;
}
const CUSTOM_KINDS = Object.freeze(["gear", "weapon", "consumable"]);
export function addCustomItem(state, actorId, input, role) {
  const actor = requireActor(state, actorId, role);
  const name = String(input?.name ?? "").trim();
  if (!name || name.length > 100)
    throw fail(
      "Scrivi il nome dell’oggetto (massimo 100 caratteri).",
      "Write the item's name (100 characters at most).",
    );
  const kind = CUSTOM_KINDS.includes(input.kind) ? input.kind : "gear";
  const quantity = Number(input.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99999)
    throw fail("La quantità va da 1 a 99999.", "Quantity ranges from 1 to 99999.");
  const weight = Number(String(input.weight ?? "0").replace(",", ".") || 0);
  if (!Number.isFinite(weight) || weight < 0 || weight > 99999)
    throw fail("Peso non valido.", "Invalid weight.");
  const description = String(input.description ?? "")
    .trim()
    .slice(0, 2000);
  const row = {
    id: newId("item"),
    name,
    kind,
    quantity,
    weight: round2(weight),
    description,
    equipped: false,
    ...(input.healing ? { healing: 7 } : {}),
    ...(kind === "gear" && input.equippable ? { equippable: true } : {}),
  };
  actor.inventory ??= [];
  actor.inventory.push(row);
  note(
    state,
    actor,
    role,
    `${actor.name} registra ${name} ×${quantity}`,
    `${actor.name} records ${name} ×${quantity}`,
  );
  return row;
}
// Sort orders of the inventory (BG3 sort; dnd5e sorts each section): the stored order,
// name, weight (heaviest first), value (most valuable first), rarity (rarest first).
export const SORTS = Object.freeze(["manual", "name", "weight", "value", "rarity"]);
export function sortRows(rows, sort = "manual", lang = "it") {
  if (!SORTS.includes(sort) || sort === "manual") return [...rows];
  const byName = (a, b) => rowName(a, lang).localeCompare(rowName(b, lang), lang);
  const key = {
    name: () => 0,
    weight: (row) => unitWeight(row) ?? -1,
    value: (row) => (Number.isFinite(row.value) && !row.unidentified ? row.value : -1),
    rarity: (row) => RARITIES.indexOf(rarityOf(row) ?? ""),
  }[sort];
  return [...rows].sort((a, b) => key(b) - key(a) || byName(a, b));
}
// Items usable as an action (dnd5e Activities; BG3 items on the hotbar): rows with at
// least one activity, identified and carried.
export function usableRows(actor) {
  return rowsOf(actor).filter(
    (row) =>
      activitiesOf(row).length > 0 &&
      !row.unidentified &&
      row.location !== "ground" &&
      row.quantity > 0,
  );
}

// ---------------------------------------------------------------- split, move, copy

export function splitStack(state, actorId, rowId, quantity, role) {
  const actor = requireActor(state, actorId, role);
  const row = requireRow(actor, rowId);
  if (isContainer(row)) throw fail("Un contenitore non si divide.", "A container cannot split.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity >= row.quantity)
    throw fail(
      `Separa da 1 a ${Math.max(1, row.quantity - 1)}.`,
      `Split off 1 to ${Math.max(1, row.quantity - 1)}.`,
    );
  const part = { ...copy(row), id: newId("inv"), quantity, equipped: false };
  delete part.attuned;
  delete part.attunedBy;
  row.quantity -= quantity;
  actor.inventory.splice(actor.inventory.indexOf(row) + 1, 0, part);
  note(
    state,
    actor,
    role,
    `${actor.name} divide ${rowName(row, "it")}: ${row.quantity} + ${quantity}`,
    `${actor.name} splits ${rowName(row, "en")}: ${row.quantity} + ${quantity}`,
  );
  return part;
}
// Destination rules inside one inventory: no cycles, at most five levels, no Bag of Holding
// inside another extradimensional space (SRD EN 212 / IT 252), equipped items unequipped
// first, extradimensional capacity never exceeded (an overloaded bag is destroyed).
export function moveIssues(actor, row, targetId, quantity = row?.quantity) {
  if (!row) return [L("Oggetto non disponibile.", "Item unavailable.")];
  if (row.equipped) return [L("Riponi prima l’oggetto equipaggiato.", "Unequip the item first.")];
  if (row.location === "ground")
    return [L("L’oggetto è a terra: registralo raccolto.", "The item is on the ground.")];
  if (targetId == null) return [];
  const target = rowById(actor, targetId);
  if (!target || !isContainer(target))
    return [L("Il contenitore non esiste più.", "The container no longer exists.")];
  if (target.id === row.id || descendantsOf(actor, row.id).some((d) => d.id === target.id))
    return [
      L("Un contenitore non può stare dentro sé stesso.", "A container cannot go inside itself."),
    ];
  const depth = depthOf(actor, target) + 1 + (isContainer(row) ? subtreeDepth(actor, row) : 0);
  if (depth > MAX_DEPTH)
    return [
      L(
        `Al massimo ${MAX_DEPTH} livelli di contenitori.`,
        `At most ${MAX_DEPTH} levels of containers.`,
      ),
    ];
  const extradimensional = [target, ...pathOf(actor, target)].some(
    (c) => c.container?.extradimensional,
  );
  const carriesExtra =
    row.container?.extradimensional ||
    descendantsOf(actor, row.id).some((d) => d.container?.extradimensional);
  if (extradimensional && carriesExtra)
    return [
      L(
        "Una borsa conservante non va dentro un altro spazio extradimensionale: si distruggerebbero entrambi (SRD).",
        "A Bag of Holding never goes inside another extradimensional space: both would be destroyed (SRD).",
      ),
    ];
  if (target.container.extradimensional && Number.isFinite(target.container.capacityKg)) {
    const add =
      (unitWeight(row) ?? 0) * quantity +
      (isContainer(row) && !row.container.fixedWeight ? contentsWeight(actor, row).kg : 0);
    if (contentsWeight(actor, target).kg + add > target.container.capacityKg)
      return [
        L(
          `${rowName(target, "it")} contiene al massimo ${fmt(target.container.capacityKg, "it")} kg: sovraccaricata si distrugge (SRD).`,
          `${rowName(target, "en")} holds at most ${fmt(target.container.capacityKg, "en")} kg: overloaded, it is destroyed (SRD).`,
        ),
      ];
  }
  return [];
}
function subtreeDepth(actor, row) {
  let max = 0;
  for (const child of childrenOf(actor, row.id))
    if (isContainer(child)) max = Math.max(max, 1 + subtreeDepth(actor, child));
  return max;
}
export function moveWithin(state, actorId, rowId, targetId, quantity, role) {
  const actor = requireActor(state, actorId, role);
  const row = requireRow(actor, rowId);
  const amount = quantity ?? row.quantity;
  if (!Number.isInteger(amount) || amount < 1 || amount > row.quantity)
    throw fail(`Puoi spostarne da 1 a ${row.quantity}.`, `You can move 1 to ${row.quantity}.`);
  const issues = moveIssues(actor, row, targetId ?? null, amount);
  if (issues.length) throw fail(issues[0].it, issues[0].en);
  if ((parentOf(actor, row)?.id ?? null) === (targetId ?? null))
    throw fail("È già lì.", "It is already there.");
  const moving = amount < row.quantity ? splitStack(state, actorId, rowId, amount, role) : row;
  if (targetId) moving.containerId = targetId;
  else delete moving.containerId;
  const where = (lang) =>
    targetId ? rowName(rowById(actor, targetId), lang) : lang === "it" ? "addosso" : "carried";
  note(
    state,
    actor,
    role,
    `${actor.name} sposta ${rowName(moving, "it")} ×${amount} → ${where("it")}`,
    `${actor.name} moves ${rowName(moving, "en")} ×${amount} → ${where("en")}`,
  );
  return moving;
}
// Other creatures an inventory can reach: visible, non-private characters of the campaign.
export function transferTargets(state, fromId, role) {
  const from = state.actors?.[fromId];
  if (!from || !shared(from)) return [];
  const campaignId = state.campaign?.id;
  return Object.values(state.actors ?? {}).filter(
    (actor) =>
      actor.id !== fromId &&
      actor.kind === "character" &&
      !actor.companion &&
      shared(actor) &&
      isCampaignActor(actor, campaignId) &&
      canViewActor(actor, role, state),
  );
}
const sameStack = (a, b) =>
  stackableRow(a) &&
  stackableRow(b) &&
  !a.containerId &&
  !a.custom &&
  !b.custom &&
  ((a.srdId && a.srdId === b.srdId) ||
    (!a.srdId &&
      !b.srdId &&
      label(a.name, "en").trim().toLowerCase() === label(b.name, "en").trim().toLowerCase() &&
      (a.kind ?? "gear") === (b.kind ?? "gear") &&
      (a.ammunition ?? null) === (b.ammunition ?? null)));
function freeId(actor, id) {
  return rowById(actor, id) ? newId("inv") : id;
}
function detachFromSets(actor, ids) {
  const sets = actor.weaponSets;
  if (sets) for (const key of ["melee", "ranged"]) if (ids.includes(sets[key])) sets[key] = null;
  if (actor.ammoSelection)
    for (const [weapon, ammo] of Object.entries(actor.ammoSelection))
      if (ids.includes(weapon) || ids.includes(ammo)) delete actor.ammoSelection[weapon];
}
function transferBlock(from, row) {
  if (row.equipped) return L("Riponi prima l’oggetto equipaggiato.", "Unequip the item first.");
  if (row.attuned)
    return L(
      `Sei in sintonia con ${rowName(row, "it")}: termina prima la sintonia.`,
      `You are attuned to ${rowName(row, "en")}: end the attunement first.`,
    );
  if (row.location === "ground") return L("L’oggetto è a terra.", "The item is on the ground.");
  for (const inner of descendantsOf(from, row.id)) {
    if (inner.equipped || inner.attuned)
      return L(
        `${rowName(inner, "it")} dentro ${rowName(row, "it")} è equipaggiato o in sintonia.`,
        `${rowName(inner, "en")} inside ${rowName(row, "en")} is equipped or attuned.`,
      );
  }
  return null;
}
// Moves rows (a container with everything inside it) between two inventories.
function moveRows(from, to, rowId, quantity) {
  const row = rowById(from, rowId);
  if (!row || !(row.quantity > 0) || quantity > row.quantity)
    throw fail(
      "Un oggetto non è più disponibile nella quantità indicata.",
      "An item is no longer available in that quantity.",
    );
  const block = transferBlock(from, row);
  if (block) throw fail(block.it, block.en);
  to.inventory ??= [];
  if (isContainer(row)) {
    if (quantity !== row.quantity) throw fail("Un contenitore si passa intero.", "Whole only.");
    const moving = [row, ...descendantsOf(from, row.id)];
    const ids = new Map(moving.map((r) => [r.id, freeId(to, r.id)]));
    detachFromSets(
      from,
      moving.map((r) => r.id),
    );
    from.inventory = from.inventory.filter((r) => !ids.has(r.id));
    for (const r of moving) {
      const next = { ...copy(r), id: ids.get(r.id) };
      if (r === row) delete next.containerId;
      else next.containerId = ids.get(r.containerId) ?? next.containerId;
      next.equipped = false;
      to.inventory.push(next);
    }
    return rowById(to, ids.get(row.id));
  }
  const part = { ...copy(row), quantity, equipped: false };
  delete part.containerId;
  row.quantity -= quantity;
  if (row.quantity === 0) {
    from.inventory = from.inventory.filter((r) => r !== row);
    detachFromSets(from, [row.id]);
  }
  const stack = rowsOf(to).find((r) => sameStack(r, part));
  if (stack) {
    stack.quantity += quantity;
    return stack;
  }
  part.id = freeId(to, row.id);
  to.inventory.push(part);
  return part;
}
function moveCoins(from, to, coins, state, role) {
  const amount = normalizeCoins(coins);
  if (isEmptyCoins(amount)) return;
  const purse = purseOf(from);
  for (const id of COIN_IDS)
    if ((purse[id] ?? 0) < amount[id])
      throw fail(
        `Non hai abbastanza monete (${formatCoins(purse, "it")}).`,
        `Not enough coins (${formatCoins(purse, "en")}).`,
      );
  const loot = lootSlice(state);
  setPurse(
    loot,
    role,
    from,
    Object.fromEntries(COIN_IDS.map((id) => [id, purse[id] - amount[id]])),
  );
  setPurse(loot, role, to, addCoins(purseOf(to), amount));
}
function moveCustomCoins(from, to, custom = {}) {
  for (const [id, count] of Object.entries(custom ?? {})) {
    const n = Number(count) || 0;
    if (!n) continue;
    if (!Number.isInteger(n) || n < 0 || (from.customCoins?.[id] ?? 0) < n)
      throw fail("Monete insufficienti.", "Not enough coins.");
    from.customCoins[id] -= n;
    to.customCoins ??= {};
    to.customCoins[id] = (to.customCoins[id] ?? 0) + n;
  }
}
// What a container carries when it is offered: every row inside (nested containers too) and
// the coins in it and in its nested containers. INV-08: the offer is accepted only while the
// bag still holds exactly this; the recipient reads it before answering.
export function containerContents(actor, row) {
  const inner = descendantsOf(actor, row.id);
  let coins = normalizeCoins(containerCoins(row));
  for (const child of inner) if (isContainer(child)) coins = addCoins(coins, containerCoins(child));
  return {
    items: inner.map((child) => ({
      rowId: child.id,
      quantity: child.quantity ?? 0,
      name: L(rowName(child, "it"), rowName(child, "en")),
    })),
    coins,
  };
}
const contentsKey = (contents) =>
  JSON.stringify([
    (contents?.items ?? []).map((c) => [c.rowId, c.quantity]).sort(),
    COIN_IDS.map((id) => contents?.coins?.[id] ?? 0),
  ]);
const itemText = (item, lang) => {
  const inside = [
    ...(item.contents?.items ?? []).map((c) => `${label(c.name, lang)} ×${c.quantity}`),
    ...(item.contents && !isEmptyCoins(item.contents.coins)
      ? [formatCoins(item.contents.coins, lang)]
      : []),
  ];
  return `${label(item.name, lang)} ×${item.quantity}${inside.length ? ` (${inside.join(", ")})` : ""}`;
};
export const itemsText = (items, lang) => items.map((item) => itemText(item, lang)).join(", ");
function packetText(state, packet, lang) {
  const parts = [];
  if (packet.items?.length) parts.push(itemsText(packet.items, lang));
  if (packet.coins && !isEmptyCoins(packet.coins)) parts.push(formatCoins(packet.coins, lang));
  for (const [id, n] of Object.entries(packet.customCoins ?? {}))
    if (n) {
      const def = currenciesOf(state).find((c) => c.id === id);
      parts.push(`${n} ${label(def?.abbr ?? id, lang)}`);
    }
  return parts.join(" · ");
}
function validatePacket(state, from, packet) {
  const items = (packet.items ?? []).map((item) => {
    const row = rowById(from, item.rowId);
    const quantity = Number(item.quantity);
    if (!row) throw fail("Un oggetto non è più nell’inventario.", "An item is no longer there.");
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > row.quantity)
      throw fail(
        `${rowName(row, "it")}: da 1 a ${row.quantity}.`,
        `${rowName(row, "en")}: 1 to ${row.quantity}.`,
      );
    const block = transferBlock(from, row);
    if (block) throw fail(block.it, block.en);
    const valid = { rowId: row.id, quantity, name: L(rowName(row, "it"), rowName(row, "en")) };
    if (isContainer(row)) valid.contents = containerContents(from, row);
    return valid;
  });
  const coins = normalizeCoins(packet.coins ?? emptyCoins());
  const customCoins = {};
  for (const [id, count] of Object.entries(packet.customCoins ?? {})) {
    const n = Number(count) || 0;
    if (!Number.isInteger(n) || n < 0) throw fail("Monete non valide.", "Invalid coins.");
    if (n) customCoins[id] = n;
  }
  if (!items.length && isEmptyCoins(coins) && !Object.keys(customCoins).length)
    throw fail("Scegli almeno un oggetto o delle monete.", "Choose at least an item or coins.");
  return { items, coins, customCoins };
}
// The identities that play a sheet: its owner and any assigned controllers (character-access).
const playersOf = (actor) => [
  ...new Set(
    [actor?.owner, ...(Array.isArray(actor?.controllers) ? actor.controllers : [])].filter(Boolean),
  ),
];
// I-071: «Trasferisci» is direct only when the viewer controls the source and is the only
// identity that plays the recipient. The DM controls every campaign sheet but does not play
// Livia: a DM's item for her is an offer her player answers (I-070, Give Items R052).
export function isDirectTransfer(state, fromId, toId, role) {
  const from = state.actors?.[fromId];
  const to = state.actors?.[toId];
  if (!from || !to || !canControlActor(from, role, state) || !canControlActor(to, role, state))
    return false;
  const players = playersOf(to);
  return !players.length || players.every((id) => id === role);
}
// Who accepts or declines an offer: the recipient's players (I-070); a sheet nobody is
// assigned to falls back to whoever controls it. Never the silence of anyone else.
export function canAnswerOffer(state, offer, role) {
  const to = state.actors?.[offer?.to];
  if (!to || !canControlActor(to, role, state)) return false;
  const players = playersOf(to);
  return !players.length || players.includes(role);
}
// Withdrawing belongs to the sender's side: whoever made the offer or plays the sender.
export function canWithdrawOffer(state, offer, role) {
  const from = state.actors?.[offer?.from];
  if (!from || !canControlActor(from, role, state)) return false;
  return offer.createdBy === role || playersOf(from).includes(role) || !playersOf(from).length;
}
// Direct transfer (INV-07 «Trasferisci»): only for the recipient's only player (I-071).
export function transfer(state, fromId, toId, packet, role) {
  const from = requireActor(state, fromId, role);
  const to = state.actors?.[toId];
  if (!transferTargets(state, fromId, role).some((a) => a.id === toId))
    throw fail("Destinatario non disponibile.", "Recipient not available.");
  if (!isDirectTransfer(state, fromId, toId, role))
    throw fail(
      `Non giochi solo tu ${to.name}: fai un’offerta che dovrà accettare.`,
      `You are not ${to.name}'s only player: make an offer to be accepted.`,
    );
  const valid = validatePacket(state, from, packet);
  applyPacket(state, from, to, valid, role);
  note(
    state,
    from,
    role,
    `${from.name} passa a ${to.name}: ${packetText(state, valid, "it")}`,
    `${from.name} gives ${to.name}: ${packetText(state, valid, "en")}`,
    { actorIds: [from.id, to.id] },
  );
  return valid;
}
function applyPacket(state, from, to, packet, role) {
  for (const item of packet.items) moveRows(from, to, item.rowId, item.quantity);
  moveCoins(from, to, packet.coins, state, role);
  moveCustomCoins(from, to, packet.customCoins);
}
// Copy (dnd5e Ctrl/Alt drag, FVT-027): a copy creates an item from nothing, so only the DM
// makes one. A container, an unidentified item or a customised copy are refused.
export function copyItem(state, fromId, toId, rowId, quantity, role, { stack: merge = true } = {}) {
  if (role !== "dm")
    throw fail(
      "Solo il DM copia un oggetto: una copia crea un oggetto nuovo.",
      "Only the DM copies an item: a copy creates a new item.",
    );
  const from = requireActor(state, fromId, role);
  const to = toId === fromId ? from : requireActor(state, toId, role);
  const row = requireRow(from, rowId);
  if (isContainer(row))
    throw fail("Copia gli oggetti uno alla volta, non i contenitori.", "Copy single items only.");
  if (row.unidentified)
    throw fail("Identifica prima l’oggetto da copiare.", "Identify the item before copying it.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999)
    throw fail("La quantità va da 1 a 999.", "Quantity ranges from 1 to 999.");
  const next = { ...copy(row), id: newId("inv"), quantity, equipped: false };
  delete next.containerId;
  delete next.attuned;
  delete next.attunedBy;
  delete next.lootId;
  delete next.origin;
  const stack = merge ? rowsOf(to).find((r) => sameStack(r, next)) : null;
  if (stack) stack.quantity += quantity;
  else (to.inventory ??= []).push(next);
  note(
    state,
    to,
    role,
    `Il DM copia ${rowName(row, "it")} ×${quantity} a ${to.name}`,
    `The DM copies ${rowName(row, "en")} ×${quantity} to ${to.name}`,
    { actorIds: [...new Set([from.id, to.id])] },
  );
  return stack ?? next;
}

// ---------------------------------------------------------------- offers (INV-07/08)

export function createOffer(state, fromId, toId, packet, role) {
  const from = requireActor(state, fromId, role);
  const to = state.actors?.[toId];
  if (!transferTargets(state, fromId, role).some((a) => a.id === toId))
    throw fail("Destinatario non disponibile.", "Recipient not available.");
  const valid = validatePacket(state, from, packet);
  const slice = sliceOf(state);
  const offer = {
    id: newId("offer"),
    from: from.id,
    to: to.id,
    ...copy(valid),
    status: "pending",
    createdBy: role,
    at: new Date().toISOString(),
  };
  slice.offers.push(offer);
  note(
    state,
    from,
    role,
    `${from.name} offre a ${to.name}: ${packetText(state, valid, "it")}`,
    `${from.name} offers ${to.name}: ${packetText(state, valid, "en")}`,
    { actorIds: [from.id, to.id] },
  );
  return offer;
}
// What still stands between a pending offer and its acceptance, computed from the current
// state: the sender's inventory may have changed (INV-08 revalidation), never reserved.
export function offerProblems(state, offer) {
  const from = state.actors?.[offer.from];
  const problems = [];
  if (!from) return [L("Il mittente non esiste più.", "The sender no longer exists.")];
  for (const item of offer.items ?? []) {
    const row = rowById(from, item.rowId);
    if (!row || row.quantity < item.quantity)
      problems.push(
        L(
          `${label(item.name, "it")}: ${item.quantity} offerti, ${row?.quantity ?? 0} disponibili`,
          `${label(item.name, "en")}: ${item.quantity} offered, ${row?.quantity ?? 0} available`,
        ),
      );
    else {
      const block = transferBlock(from, row);
      if (block) problems.push(block);
      else if (
        item.contents &&
        (!isContainer(row) ||
          contentsKey(containerContents(from, row)) !== contentsKey(item.contents))
      )
        problems.push(
          L(
            `Il contenuto di ${label(item.name, "it")} è cambiato dopo l’offerta.`,
            `The contents of ${label(item.name, "en")} changed after the offer.`,
          ),
        );
    }
  }
  const purse = purseOf(from);
  if (COIN_IDS.some((id) => (purse[id] ?? 0) < (offer.coins?.[id] ?? 0)))
    problems.push(L("Le monete offerte non ci sono più.", "The offered coins are gone."));
  for (const [id, n] of Object.entries(offer.customCoins ?? {}))
    if ((from.customCoins?.[id] ?? 0) < n)
      problems.push(L("Le monete offerte non ci sono più.", "The offered coins are gone."));
  return problems;
}
function requireOffer(state, offerId) {
  const offer = sliceOf(state)?.offers.find((o) => o.id === offerId);
  if (!offer) throw fail("Offerta non trovata.", "Offer not found.");
  if (offer.status !== "pending")
    throw fail("L’offerta è già conclusa.", "The offer is already closed.");
  return offer;
}
function requireAnswer(state, offer, role) {
  const to = requireActor(state, offer.to, role);
  if (!canAnswerOffer(state, offer, role))
    throw fail(
      `Solo chi gioca ${to.name} può rispondere all’offerta.`,
      `Only ${to.name}'s player can answer the offer.`,
    );
  return to;
}
export function acceptOffer(state, offerId, role) {
  const offer = requireOffer(state, offerId);
  const to = requireAnswer(state, offer, role);
  const from = state.actors[offer.from];
  const problems = offerProblems(state, offer);
  if (problems.length)
    throw fail(
      "Non più accettabile: " + problems.map((p) => p.it).join("; "),
      "No longer acceptable: " + problems.map((p) => p.en).join("; "),
    );
  applyPacket(state, from, to, offer, role);
  Object.assign(offer, { status: "accepted", resolvedBy: role, resolvedAt: nowIso() });
  note(
    state,
    to,
    role,
    `${to.name} accetta da ${from.name}: ${packetText(state, offer, "it")}`,
    `${to.name} accepts from ${from.name}: ${packetText(state, offer, "en")}`,
    { actorIds: [from.id, to.id] },
  );
  return offer;
}
export function declineOffer(state, offerId, role) {
  const offer = requireOffer(state, offerId);
  const to = requireAnswer(state, offer, role);
  Object.assign(offer, { status: "declined", resolvedBy: role, resolvedAt: nowIso() });
  note(state, to, role, `${to.name} rifiuta un’offerta`, `${to.name} declines an offer`, {
    actorIds: [offer.from, offer.to],
  });
  return offer;
}
export function withdrawOffer(state, offerId, role) {
  const offer = requireOffer(state, offerId);
  const from = requireActor(state, offer.from, role);
  if (!canWithdrawOffer(state, offer, role))
    throw fail(
      `Solo chi ha fatto l’offerta per ${from.name} può ritirarla.`,
      `Only whoever made ${from.name}'s offer can withdraw it.`,
    );
  Object.assign(offer, { status: "withdrawn", resolvedBy: role, resolvedAt: nowIso() });
  note(state, from, role, `${from.name} ritira un’offerta`, `${from.name} withdraws an offer`, {
    actorIds: [offer.from, offer.to],
  });
  return offer;
}
const nowIso = () => new Date().toISOString();
export function offersFor(state, actorId, role) {
  return (sliceOf(state)?.offers ?? []).filter((offer) => {
    if (offer.from !== actorId && offer.to !== actorId) return false;
    const other = state.actors?.[offer.from === actorId ? offer.to : offer.from];
    const self = state.actors?.[actorId];
    return (
      canViewActor(self, role, state) &&
      (canControlActor(self, role, state) || (other && canControlActor(other, role, state)))
    );
  });
}

// ---------------------------------------------------------------- customisation, quantity

// D&D Beyond "Customize" (DDB-050): display name, notes, weight, cost and a material. The
// material is descriptive: SRD 5.2.1 has no silvered weapons, and Adamantine Armor is a
// magic item (EN 209 / IT 243); nothing is applied automatically.
export function customize(state, actorId, rowId, patch, role) {
  const actor = requireActor(state, actorId, role);
  const row = requireRow(actor, rowId);
  const custom = {};
  const name = String(patch.name ?? "").trim();
  if (name.length > 100) throw fail("Nome troppo lungo.", "Name too long.");
  if (name && name !== label(row.name, "it") && name !== label(row.name, "en")) custom.name = name;
  const notes = String(patch.notes ?? "").trim();
  if (notes.length > 500) throw fail("Note troppo lunghe.", "Notes too long.");
  if (notes) custom.notes = notes;
  const number = (value, it, en) => {
    if (value === "" || value == null) return null;
    const n = Number(String(value).replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > 100000) throw fail(it, en);
    return n;
  };
  const weight = number(patch.weightKg, "Peso non valido.", "Invalid weight.");
  if (weight != null && weight !== row.weight) custom.weightKg = weight;
  const cost = number(patch.costGp, "Costo non valido.", "Invalid cost.");
  if (cost != null) custom.costCp = Math.round(cost * 100);
  if (patch.material) {
    if (!MATERIALS.includes(patch.material))
      throw fail("Materiale non valido.", "Invalid material.");
    custom.material = patch.material;
  }
  if (Object.keys(custom).length) row.custom = custom;
  else delete row.custom;
  note(
    state,
    actor,
    role,
    `${actor.name} personalizza ${label(row.name, "it")}`,
    `${actor.name} customises ${label(row.name, "en")}`,
  );
  return row;
}
export function correctQuantity(state, actorId, rowId, quantity, reason, role) {
  const actor = requireActor(state, actorId, role);
  const row = requireRow(actor, rowId);
  const why = String(reason ?? "").trim();
  if (!why)
    throw fail("Scrivi il motivo della correzione.", "Write the reason for the correction.");
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 99999)
    throw fail("Quantità non valida.", "Invalid quantity.");
  if (isContainer(row) && quantity !== 1)
    throw fail("Un contenitore resta uno.", "A container stays one.");
  const before = row.quantity;
  if (before === quantity) throw fail("La quantità è già questa.", "Same quantity.");
  row.quantity = quantity;
  if (quantity === 0) row.equipped = false;
  note(
    state,
    actor,
    role,
    `Correzione: ${rowName(row, "it")} ${before} → ${quantity}`,
    `Correction: ${rowName(row, "en")} ${before} → ${quantity}`,
    { reason: why },
  );
  return row;
}

// ---------------------------------------------------------------- unidentified (VTL-020)

function hideRow(loot, row, apparentName, apparentDescription) {
  row.lootId ??= newId("loot");
  const mine = {};
  for (const field of IDENTITY_FIELDS)
    if (row[field] != null) {
      mine[field] = copy(row[field]);
      delete row[field];
    }
  hideIdentity(loot, row, apparentName, "");
  Object.assign(loot.secrets[row.lootId].fields, mine);
  if (apparentDescription)
    row.description =
      typeof apparentDescription === "object"
        ? copy(apparentDescription)
        : L(apparentDescription, apparentDescription);
  delete row.identified;
  row.unidentified = true;
  return row;
}
// Shard "Hidden" (VTL-020): inside a campaign only the DM hides and identifies; the true data
// goes to B26's DM-only record, so B26's Identify (and ours) restore it wherever it is.
export function markUnidentified(
  state,
  actorId,
  rowId,
  { apparentName, apparentDescription },
  role,
) {
  if (role !== "dm")
    throw fail("Solo il DM nasconde l’identità di un oggetto.", "Only the DM hides an item.");
  const actor = requireActor(state, actorId, role);
  if (!shared(actor)) throw fail("Solo per le schede della campagna.", "Only for campaign sheets.");
  const row = requireRow(actor, rowId);
  if (row.unidentified) throw fail("È già non identificato.", "Already unidentified.");
  if (row.attuned || row.equipped)
    throw fail("Riponi l’oggetto e termina la sintonia.", "Unequip it and end attunement.");
  // An unidentified item is not a usable container: hiding a full one would spill its
  // contents on the sheet (and reveal an extradimensional bag by its weight).
  if (
    isContainer(row) &&
    (childrenOf(actor, row.id).length ||
      !isEmptyCoins(containerCoins(row)) ||
      Object.keys(containerCustomCoins(row)).length)
  )
    throw fail(
      `Togli prima il contenuto di ${rowName(row, "it")}: nascondere un contenitore pieno lo svuoterebbe.`,
      `Empty ${rowName(row, "en")} first: hiding a full container would spill its contents.`,
    );
  const loot = lootSlice(state);
  if (!loot?.secrets)
    throw fail("Il bottino (B26) non è disponibile.", "The loot area (B26) is unavailable.");
  const name = String(apparentName ?? "").trim();
  if (!name) throw fail("Scrivi il nome apparente.", "Write the apparent name.");
  hideRow(loot, row, L(name, name), String(apparentDescription ?? "").trim());
  return row;
}
export function identify(state, actorId, rowId, role) {
  const actor = state.actors?.[actorId];
  const row = rowById(actor, rowId);
  if (!row?.unidentified || !row.lootId)
    throw fail("L’oggetto è già identificato.", "The item is already identified.");
  identifyItem(state, lootSlice(state), role, row.lootId);
  return row;
}
export const secretOf = (state, row, role) =>
  role === "dm" && row?.lootId ? (lootSlice(state)?.secrets?.[row.lootId] ?? null) : null;

// ---------------------------------------------------------------- attunement (DDB-049)

export function classIdsOf(actor) {
  const ids = (actor?.buildSeed?.classes ?? actor?.build?.classes ?? [])
    .map((c) => c?.classId)
    .filter(Boolean);
  return [...new Set(ids)];
}
export function attuneIssues(actor, row) {
  if (!row) return [L("Oggetto non disponibile.", "Item unavailable.")];
  if (row.unidentified)
    return [
      L(
        "Oggetto non identificato: il DM deve prima identificarlo.",
        "Unidentified item: the DM identifies it first.",
      ),
    ];
  if (!needsAttunement(row))
    return [L("Questo oggetto non richiede sintonia.", "This item needs no attunement.")];
  if (row.attuned) return [L("Sei già in sintonia.", "Already attuned.")];
  const attuned = attunedRows(actor);
  if (attuned.length >= ATTUNEMENT_LIMIT)
    return [
      L(
        `Il tentativo fallisce: sei già in sintonia con ${ATTUNEMENT_LIMIT} oggetti (${attuned.map((r) => rowName(r, "it")).join(", ")}). Termina prima una sintonia.`,
        `The attempt fails: you are already attuned to ${ATTUNEMENT_LIMIT} items (${attuned.map((r) => rowName(r, "en")).join(", ")}). End an attunement first.`,
      ),
    ];
  if (row.srdId && attuned.some((r) => r.srdId === row.srdId))
    return [
      L(
        "Non puoi essere in sintonia con più di una copia dello stesso oggetto.",
        "You cannot attune to more than one copy of an item.",
      ),
    ];
  const by = row.attunement?.by;
  if (Array.isArray(by) && by.length) {
    const classes = classIdsOf(actor);
    if (!classes.some((id) => by.includes(id)))
      return [
        L(
          `Richiede sintonia da parte di: ${by.join(", ")}. La classe registrata non lo permette.`,
          `Requires attunement by: ${by.join(", ")}. The recorded class does not qualify.`,
        ),
      ];
  }
  return [];
}
// Short rests of this character already completed: attuning needs one focused on the item
// (SRD EN 102 / IT 116). Each rest serves one attunement change.
export function eligibleRests(state, actorId) {
  const used = new Set(
    rowsOf(state.actors?.[actorId])
      .map((row) => row.attunedBy?.restId)
      .filter(Boolean),
  );
  return (state.restTime?.rests ?? []).filter(
    (rest) =>
      rest.kind === "short" &&
      !used.has(rest.id) &&
      rest.participants?.some((p) => p.actorId === actorId && p.status === "completed"),
  );
}
function attunementRecord(state, actorId, { method, restId, reason }) {
  if (method === "rest") {
    if (!eligibleRests(state, actorId).some((rest) => rest.id === restId))
      throw fail(
        "Scegli un riposo breve completato e non ancora usato.",
        "Choose a completed short rest not used yet.",
      );
    return { method, restId, at: nowIso() };
  }
  const why = String(reason ?? "").trim();
  if (method !== "record" || why.length < 3)
    throw fail(
      "Indica il riposo breve oppure registra il fatto con un motivo.",
      "Pick the short rest or record the fact with a reason.",
    );
  return { method: "record", reason: why, at: nowIso() };
}
export function attune(state, actorId, rowId, how, role) {
  const actor = requireActor(state, actorId, role);
  const row = requireRow(actor, rowId);
  const issues = attuneIssues(actor, row);
  if (issues.length) throw fail(issues[0].it, issues[0].en);
  row.attuned = true;
  row.attunedBy = attunementRecord(state, actorId, how);
  note(
    state,
    actor,
    role,
    `${actor.name} in sintonia con ${rowName(row, "it")} (${attunedRows(actor).length}/${ATTUNEMENT_LIMIT})`,
    `${actor.name} attuned to ${rowName(row, "en")} (${attunedRows(actor).length}/${ATTUNEMENT_LIMIT})`,
    how.reason ? { reason: String(how.reason).trim() } : {},
  );
  return row;
}
export function endAttunement(state, actorId, rowId, how, role) {
  const actor = requireActor(state, actorId, role);
  const row = requireRow(actor, rowId);
  if (!row.attuned) throw fail("Non sei in sintonia.", "Not attuned.");
  const record = attunementRecord(state, actorId, how);
  delete row.attuned;
  row.attunedBy = { ...record, ended: true };
  note(
    state,
    actor,
    role,
    `${actor.name} termina la sintonia con ${rowName(row, "it")}`,
    `${actor.name} ends attunement to ${rowName(row, "en")}`,
    how.reason ? { reason: String(how.reason).trim() } : {},
  );
  return row;
}

// ---------------------------------------------------------------- coins (FVT-025, VTL-021)

export const COIN_CP = Object.freeze({ cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 });
export function rateCp(state, coinId) {
  if (COIN_CP[coinId]) return COIN_CP[coinId];
  const def = currenciesOf(state).find((c) => c.id === coinId);
  return def && def.perGp > 0 ? 100 / def.perGp : null;
}
const holding = (actor, coinId) =>
  COIN_CP[coinId] ? (purseOf(actor)[coinId] ?? 0) : (actor.customCoins?.[coinId] ?? 0);
function setHolding(state, actor, coinId, value, role) {
  if (COIN_CP[coinId]) {
    const purse = purseOf(actor);
    purse[coinId] = value;
    setPurse(lootSlice(state), role, actor, purse);
  } else {
    actor.customCoins ??= {};
    actor.customCoins[coinId] = value;
  }
}
// Roll20's converter (R20-030) with exact change: the amount exchanged, the coins received,
// and the remaining value returned as gold, silver and copper (SRD rates, EN 89 / IT 101).
export function previewConversion(state, actor, from, to, amount) {
  const a = rateCp(state, from);
  const b = rateCp(state, to);
  if (!a || !b || from === to)
    return { ok: false, reason: L("Scegli due monete diverse.", "Choose two different coins.") };
  if (!Number.isInteger(amount) || amount < 1)
    return { ok: false, reason: L("Quantità non valida.", "Invalid amount.") };
  if (holding(actor, from) < amount)
    return {
      ok: false,
      reason: L(`Ne hai solo ${holding(actor, from)}.`, `You only have ${holding(actor, from)}.`),
    };
  const value = amount * a;
  const received = Math.floor(value / b + 1e-9);
  const changeCp = Math.round((value - received * b) * 1000) / 1000;
  if (!Number.isInteger(changeCp))
    return {
      ok: false,
      reason: L(
        "Il cambio non è esatto: scegli una quantità che dia monete intere.",
        "The exchange is not exact: choose an amount giving whole coins.",
      ),
    };
  if (received < 1)
    return {
      ok: false,
      reason: L("Non basta per una moneta.", "Not enough for one coin."),
    };
  return { ok: true, from, to, amount, received, change: coinsFromCp(changeCp), valueCp: value };
}
export function convertCoins(state, actorId, from, to, amount, role) {
  const actor = requireActor(state, actorId, role);
  const preview = previewConversion(state, actor, from, to, amount);
  if (!preview.ok) throw fail(preview.reason.it, preview.reason.en);
  setHolding(state, actor, from, holding(actor, from) - amount, role);
  setHolding(state, actor, to, holding(actor, to) + preview.received, role);
  if (!isEmptyCoins(preview.change))
    setPurse(lootSlice(state), role, actor, addCoins(purseOf(actor), preview.change));
  const name = (id, lang) =>
    COIN_CP[id]
      ? { cp: "mr/cp", sp: "ma/sp", ep: "me/ep", gp: "mo/gp", pp: "mp/pp" }[id].split("/")[
          lang === "it" ? 0 : 1
        ]
      : label(currenciesOf(state).find((c) => c.id === id)?.abbr, lang);
  note(
    state,
    actor,
    role,
    `${actor.name} cambia ${amount} ${name(from, "it")} → ${preview.received} ${name(to, "it")}${isEmptyCoins(preview.change) ? "" : " + resto " + formatCoins(preview.change, "it")}`,
    `${actor.name} exchanges ${amount} ${name(from, "en")} → ${preview.received} ${name(to, "en")}${isEmptyCoins(preview.change) ? "" : " + change " + formatCoins(preview.change, "en")}`,
  );
  return preview;
}
// DDB "Put Coins in Containers" (DDB-048): coins move between the purse and a container.
export function moveCoinsToContainer(
  state,
  actorId,
  containerId,
  coins,
  direction,
  role,
  customCoins = {},
) {
  const actor = requireActor(state, actorId, role);
  const bag = requireRow(actor, containerId);
  if (!isContainer(bag)) throw fail("Non è un contenitore.", "Not a container.");
  const amount = normalizeCoins(coins);
  // Campaign currencies travel in containers too (D&D Beyond Put Coins in Containers).
  const custom = Object.fromEntries(
    Object.entries(customCoins ?? {})
      .map(([id, n]) => [id, Number(n)])
      .filter(([id, n]) => n > 0 && currenciesOf(state).some((c) => c.id === id)),
  );
  for (const n of Object.values(custom))
    if (!Number.isInteger(n)) throw fail("Indica monete intere.", "Enter whole coins.");
  if (isEmptyCoins(amount) && !Object.keys(custom).length)
    throw fail("Indica quante monete.", "Enter how many coins.");
  bag.container.coins = { ...emptyCoins(), ...(bag.container.coins ?? {}) };
  const purse = purseOf(actor);
  const source = direction === "out" ? bag.container.coins : purse;
  for (const id of COIN_IDS)
    if ((source[id] ?? 0) < amount[id]) throw fail("Monete insufficienti.", "Not enough coins.");
  const customSource = direction === "out" ? containerCustomCoins(bag) : (actor.customCoins ?? {});
  for (const [id, n] of Object.entries(custom))
    if ((customSource[id] ?? 0) < n) throw fail("Monete insufficienti.", "Not enough coins.");
  if (Object.keys(custom).length) {
    bag.container.customCoins = { ...containerCustomCoins(bag) };
    actor.customCoins = { ...(actor.customCoins ?? {}) };
    const from = direction === "out" ? bag.container.customCoins : actor.customCoins;
    const to = direction === "out" ? actor.customCoins : bag.container.customCoins;
    for (const [id, n] of Object.entries(custom)) {
      from[id] -= n;
      if (!from[id]) delete from[id];
      to[id] = (to[id] ?? 0) + n;
    }
  }
  for (const id of COIN_IDS) {
    if (direction === "out") {
      bag.container.coins[id] -= amount[id];
      purse[id] += amount[id];
    } else {
      purse[id] -= amount[id];
      bag.container.coins[id] += amount[id];
    }
  }
  setPurse(lootSlice(state), role, actor, purse);
  const what = (lang) =>
    [
      isEmptyCoins(amount) ? "" : formatCoins(amount, lang),
      ...Object.entries(custom).map(
        ([id, n]) =>
          `${n} ${label(currenciesOf(state).find((c) => c.id === id)?.abbr ?? id, lang)}`,
      ),
    ]
      .filter(Boolean)
      .join(" · ");
  note(
    state,
    actor,
    role,
    direction === "out"
      ? `${actor.name} prende ${what("it")} da ${rowName(bag, "it")}`
      : `${actor.name} mette ${what("it")} in ${rowName(bag, "it")}`,
    direction === "out"
      ? `${actor.name} takes ${what("en")} from ${rowName(bag, "en")}`
      : `${actor.name} puts ${what("en")} in ${rowName(bag, "en")}`,
  );
  return bag.container.coins;
}
export function saveCurrency(state, def, role) {
  if (role !== "dm")
    throw fail("Solo il DM definisce le valute della campagna.", "Only the DM defines currencies.");
  const slice = sliceOf(state);
  const it = String(def.nameIt ?? "").trim();
  const en = String(def.nameEn ?? "").trim() || it;
  const abbrIt = String(def.abbrIt ?? "").trim();
  const abbrEn = String(def.abbrEn ?? "").trim() || abbrIt;
  const perGp = Number(String(def.perGp ?? "").replace(",", "."));
  const weightKg = Number(String(def.weightKg ?? "0").replace(",", "."));
  if (!it || it.length > 40 || !abbrIt || abbrIt.length > 5 || abbrEn.length > 5)
    throw fail(
      "Scrivi nome (fino a 40 caratteri) e sigla (fino a 5).",
      "Write a name (up to 40 characters) and a short name (up to 5).",
    );
  if (!Number.isFinite(perGp) || perGp <= 0 || perGp > 10000)
    throw fail("Indica quante ne vale una moneta d’oro.", "Enter how many make one gold piece.");
  if (!Number.isFinite(weightKg) || weightKg < 0 || weightKg > 10)
    throw fail("Peso per moneta non valido.", "Invalid weight per coin.");
  const id =
    def.id ||
    it
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30) ||
    newId("cur");
  if (!def.id && (COIN_CP[id] || slice.currencies.some((c) => c.id === id)))
    throw fail("Esiste già una valuta con questo nome.", "A currency with this name exists.");
  const entry = slice.currencies.find((c) => c.id === id);
  const values = {
    id,
    name: L(it, en),
    abbr: L(abbrIt, abbrEn),
    perGp,
    weightKg,
    note: L(String(def.noteIt ?? "").trim(), String(def.noteEn ?? def.noteIt ?? "").trim()),
    source: {
      kind: "campaign-rule",
      author: "dm",
      edition: "2024",
      revision: id + "-" + (Number(entry?.source?.revision?.split("-").at(-1)) + 1 || 1),
      note: "Custom currency written by the DM (VTL-021 pattern), not an SRD coin.",
    },
  };
  if (entry) Object.assign(entry, values);
  else slice.currencies.push(values);
  return values;
}
export function removeCurrency(state, currencyId, role) {
  if (role !== "dm") throw fail("Solo il DM.", "DM only.");
  const slice = sliceOf(state);
  if (Object.values(state.actors ?? {}).some((a) => (a.customCoins?.[currencyId] ?? 0) > 0))
    throw fail(
      "Qualcuno possiede ancora questa valuta: cambiala prima in monete.",
      "Someone still holds this currency: exchange it first.",
    );
  slice.currencies = slice.currencies.filter((c) => c.id !== currencyId);
}

// ---------------------------------------------------------------- charges, dawn, rolls

// Dawns passed since clock zero. Only the calendar's starting hour matters (08:00 in the
// B42 sample; the same hour without a calendar), so editing the calendar's date never
// invents or removes a recharge.
export function dawnIndex(state) {
  const epoch = state?.ext?.["world-map"]?.campaigns?.[state?.campaign?.id]?.calendar?.epoch;
  const start = epoch ? (epoch.hour ?? 0) * HOUR + (epoch.minute ?? 0) * 60 : 8 * HOUR;
  const clock = Number(state?.restTime?.clocks?.[state?.campaign?.id]?.seconds) || 0;
  return Math.floor((start + clock - DAWN_HOUR * HOUR) / DAY);
}
export function pendingDawns(state, row) {
  const c = row?.charges;
  if (!c || c.recharge !== "dawn" || row.unidentified) return 0;
  // The last-charge d20 decides first whether the item still exists (SRD wand/staff).
  if (c.value >= c.max || c.lastCharge === "pending") return 0;
  return Math.max(0, dawnIndex(state) - (Number.isInteger(c.dawn) ? c.dawn : dawnIndex(state)));
}
export function parseFormula(formula) {
  const match = /^(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?$/.exec(String(formula).replace(/\s/g, ""));
  if (!match) return null;
  const modifier = match[3] ? Number(match[4]) * (match[3] === "-" ? -1 : 1) : 0;
  return { count: Number(match[1]), sides: Number(match[2]), modifier };
}
// Faces from the table (physical) or from the core dice service (digital). After an Undo an
// identical retry reuses the withdrawn digital faces once: Undo never grants a free reroll.
function acceptFaces(state, { retryKey, dice, mode, faces, die = rollDie }) {
  const count = dice.count;
  const rolls = rollsOf(state);
  const applied = new Set(sliceOf(state)?.applied ?? []);
  let values;
  let reusedFrom = null;
  if (mode === "physical") {
    values = (faces ?? []).map(Number);
    if (
      values.length !== count ||
      values.some((v) => !Number.isInteger(v) || v < 1 || v > dice.sides)
    )
      throw fail(
        `Inserisci ${count} facce del d${dice.sides}, da 1 a ${dice.sides}.`,
        `Enter ${count} d${dice.sides} faces, from 1 to ${dice.sides}.`,
      );
  } else if (mode === "digital") {
    const withdrawn = rolls?.rolls.find(
      (r) =>
        r.retryKey === retryKey &&
        r.mode === "digital" &&
        !applied.has(r.id) &&
        !r.reusedBy &&
        r.values.length === count,
    );
    if (withdrawn) {
      values = [...withdrawn.values];
      reusedFrom = withdrawn.id;
    } else values = Array.from({ length: count }, () => die(dice.sides));
  } else throw fail("Scegli dadi fisici o digitali.", "Choose physical or digital dice.");
  return { values, reusedFrom };
}
function recordRoll(state, entry) {
  const record = { id: newId("invp-roll"), at: nowIso(), status: "accepted", ...entry };
  const rolls = rollsOf(state);
  if (rolls) {
    if (entry.reusedFrom) {
      const prior = rolls.rolls.find((r) => r.id === entry.reusedFrom);
      if (prior) prior.reusedBy = record.id;
      record.status = "reused";
    }
    rolls.rolls.push(record);
    if (rolls.rolls.length > 300) rolls.rolls.splice(0, rolls.rolls.length - 300);
  }
  sliceOf(state)?.applied.push(record.id);
  return record;
}
export function rollRecharge(state, actorId, rowId, { mode, faces, die }, role) {
  const actor = requireActor(state, actorId, role);
  const row = requireRow(actor, rowId);
  if (row.charges?.lastCharge === "pending")
    throw fail(
      "Tira prima il d20 dell’ultima carica: con 1 l’oggetto è distrutto.",
      "Roll the last-charge d20 first: on a 1 the item is destroyed.",
    );
  const pending = pendingDawns(state, row);
  if (!pending) throw fail("Nessuna ricarica all’alba in attesa.", "No dawn recharge pending.");
  const dice = parseFormula(row.charges.regain);
  if (!dice) throw fail("Formula di ricarica non valida.", "Invalid recharge formula.");
  const dawn = (Number.isInteger(row.charges.dawn) ? row.charges.dawn : dawnIndex(state)) + 1;
  const retryKey = ["recharge", actorId, rowId, dawn].join("|");
  const { values, reusedFrom } = acceptFaces(state, { retryKey, dice, mode, faces, die });
  const total = values.reduce((a, b) => a + b, 0) + dice.modifier;
  const before = row.charges.value;
  row.charges.value = Math.min(row.charges.max, before + total);
  row.charges.dawn = row.charges.value >= row.charges.max ? dawnIndex(state) : dawn;
  const record = recordRoll(state, {
    retryKey,
    kind: "recharge",
    actorId,
    rowId,
    mode,
    dice: [{ count: dice.count, sides: dice.sides }],
    values,
    modifier: dice.modifier,
    total,
    by: role,
    reusedFrom,
  });
  note(
    state,
    actor,
    role,
    `${rowName(row, "it")}: all’alba ${row.charges.regain} = ${total} → cariche ${before} → ${row.charges.value}/${row.charges.max}`,
    `${rowName(row, "en")}: at dawn ${row.charges.regain} = ${total} → charges ${before} → ${row.charges.value}/${row.charges.max}`,
  );
  return { record, before, after: row.charges.value, total };
}
// SRD: "If you expend the last charge, roll 1d20. On a 1, …" — the item is destroyed.
export function rollLastCharge(state, actorId, rowId, { mode, faces, die }, role) {
  const actor = requireActor(state, actorId, role);
  const row = requireRow(actor, rowId);
  if (row.charges?.lastCharge !== "pending")
    throw fail("Nessun tiro dell’ultima carica in attesa.", "No last-charge roll pending.");
  const retryKey = ["last", actorId, rowId, row.charges.spentTotal ?? 0].join("|");
  const dice = { count: 1, sides: 20, modifier: 0 };
  const { values, reusedFrom } = acceptFaces(state, { retryKey, dice, mode, faces, die });
  const destroyed = values[0] === 1;
  const record = recordRoll(state, {
    retryKey,
    kind: "last-charge",
    actorId,
    rowId,
    mode,
    dice: [{ count: 1, sides: 20 }],
    values,
    modifier: 0,
    total: values[0],
    by: role,
    reusedFrom,
    destroyed,
  });
  if (destroyed) {
    actor.inventory = actor.inventory.filter((r) => r !== row);
    detachFromSets(actor, [row.id]);
  } else delete row.charges.lastCharge;
  note(
    state,
    actor,
    role,
    `${rowName(row, "it")}: ultima carica, d20 = ${values[0]}${destroyed ? " → distrutto" : " → resta"}`,
    `${rowName(row, "en")}: last charge, d20 = ${values[0]}${destroyed ? " → destroyed" : " → it survives"}`,
  );
  return { record, destroyed };
}

// ---------------------------------------------------------------- activities (FVT-017/018)

export const activitiesOf = (row) =>
  row?.unidentified || !Array.isArray(row?.activities) ? [] : row.activities;
export function spellDc(actor) {
  const eff = getEffectiveActor(actor) ?? actor;
  const ability = eff?.combatProfile?.spellcastingAbility;
  const pb = eff?.combatProfile?.proficiencyBonus ?? eff?.proficiencyBonus;
  const score = eff?.abilities?.[ability];
  if (!ability || !Number.isFinite(score) || !Number.isFinite(pb)) return null;
  return 8 + Math.floor((score - 10) / 2) + pb;
}
// The usage dialog's facts before anything is spent: cost, level, dice, save and reasons.
export function previewActivity(state, actor, row, activityId, { charges } = {}) {
  const activity = activitiesOf(row).find((a) => a.id === activityId);
  const reasons = [];
  if (!activity)
    return { ok: false, reasons: [L("Attività non disponibile.", "Activity unavailable.")] };
  const min = activity.charges?.min ?? 0;
  const max = activity.charges?.max ?? min;
  const spend = activity.scaling === "level-per-charge" ? Number(charges ?? min) : min;
  if (!Number.isInteger(spend) || spend < min || spend > max)
    reasons.push(L(`Da ${min} a ${max} cariche.`, `${min} to ${max} charges.`));
  const value = row.charges?.value ?? 0;
  if (row.charges && spend > value)
    reasons.push(
      L(`Cariche insufficienti: ${value} rimaste.`, `Not enough charges: ${value} left.`),
    );
  if (row.charges?.lastCharge === "pending")
    reasons.push(L("Tira prima il d20 dell’ultima carica.", "Roll the last-charge d20 first."));
  if (needsAttunement(row) && !row.attuned)
    reasons.push(
      L(
        "Richiede sintonia: senza sintonia hai solo i benefici non magici (SRD).",
        "Requires attunement: without it you get only its nonmagical benefits (SRD).",
      ),
    );
  if (row.quantity < 1 || row.location === "ground")
    reasons.push(L("Devi avere l’oggetto con te.", "You must have the item with you."));
  const spell = activity.spellId ? getById(activity.spellId) : null;
  const level =
    activity.scaling === "level-per-charge"
      ? (activity.baseLevel ?? 1) + spend - min
      : (activity.level ?? spell?.level ?? null);
  let dice = null;
  let modifier = 0;
  const base = spell?.damage?.[0];
  if (base) {
    const parsed = parseFormula(base.dice);
    if (activity.spellId === "srd2024:spell:magic-missile" && parsed) {
      const darts = 3 + (level - 1);
      dice = { count: darts * parsed.count, sides: parsed.sides };
      modifier = darts * parsed.modifier;
    } else if (parsed) {
      dice = { count: parsed.count, sides: parsed.sides };
      modifier = parsed.modifier;
    }
  }
  return {
    ok: reasons.length === 0,
    reasons,
    activity,
    spell,
    spend,
    before: value,
    after: row.charges ? value - spend : null,
    level,
    dice,
    modifier,
    damageType: base?.types?.[0] ?? null,
    save: spell?.save ?? null,
    dc: spell?.save ? spellDc(actor) : null,
    lastCharge: !!row.charges?.destroyOnLast && value - spend === 0,
  };
}
export function useActivity(state, actorId, rowId, activityId, options, role) {
  const actor = requireActor(state, actorId, role);
  const row = requireRow(actor, rowId);
  const preview = previewActivity(state, actor, row, activityId, options);
  if (!preview.ok) throw fail(preview.reasons[0].it, preview.reasons[0].en);
  const consume = options.consume !== false;
  const slice = sliceOf(state);
  const before = row.charges?.value ?? null;
  if (row.charges && consume && preview.spend) {
    if (row.charges.value >= row.charges.max) row.charges.dawn = dawnIndex(state);
    row.charges.value -= preview.spend;
    row.charges.spentTotal = (row.charges.spentTotal ?? 0) + preview.spend;
    if (row.charges.value === 0 && row.charges.destroyOnLast) row.charges.lastCharge = "pending";
  }
  let record = null;
  if (preview.dice) {
    const retryKey = [
      "use",
      actorId,
      rowId,
      activityId,
      preview.spend,
      before,
      slice?.uses.length ?? 0,
    ].join("|");
    const { values, reusedFrom } = acceptFaces(state, {
      retryKey,
      dice: preview.dice,
      mode: options.mode,
      faces: options.faces,
      die: options.die,
    });
    record = recordRoll(state, {
      retryKey,
      kind: "activity",
      actorId,
      rowId,
      activityId,
      mode: options.mode,
      dice: [{ count: preview.dice.count, sides: preview.dice.sides }],
      values,
      modifier: preview.modifier,
      total: values.reduce((a, b) => a + b, 0) + preview.modifier,
      damageType: preview.damageType,
      by: role,
      reusedFrom,
    });
  }
  const use = {
    id: newId("invp-use"),
    at: nowIso(),
    actorId,
    rowId,
    activityId,
    spend: consume ? preview.spend : 0,
    level: preview.level,
    rollId: record?.id ?? null,
    by: role,
  };
  slice?.uses.push(use);
  const act = (lang) => label(preview.activity.name, lang);
  const dmg = (lang) =>
    record
      ? ` · ${preview.dice.count}d${preview.dice.sides}${preview.modifier ? " + " + preview.modifier : ""} = ${record.total}${preview.save ? (lang === "it" ? `, TS ${label(ABILITY_NAMES[preview.save.ability] ?? preview.save.ability, "it")} CD ${preview.dc ?? "?"}` : `, ${label(ABILITY_NAMES[preview.save.ability] ?? preview.save.ability, "en")} save DC ${preview.dc ?? "?"}`) : ""}`
      : "";
  note(
    state,
    actor,
    role,
    `${actor.name} usa ${rowName(row, "it")}: ${act("it")}${consume && row.charges ? ` (${preview.spend} cariche, ${before} → ${row.charges.value})` : consume ? "" : " (senza consumo)"}${dmg("it")}`,
    `${actor.name} uses ${rowName(row, "en")}: ${act("en")}${consume && row.charges ? ` (${preview.spend} charges, ${before} → ${row.charges.value})` : consume ? "" : " (no consumption)"}${dmg("en")}`,
  );
  return { use, record, preview, after: row.charges?.value ?? null };
}

// ---------------------------------------------------------------- ammunition (FVT-140)

export function ammoRowsFor(actor, weapon) {
  const kind = weapon?.weapon?.ammunition;
  if (!kind) return [];
  return rowsOf(actor).filter(
    (row) => row.ammunition === kind && !row.unidentified && row.location !== "ground",
  );
}
const plainAmmo = (row) => !rarityOf(row) && !row.custom?.material;
// Solasta's quiver (CRP-024): the chosen stack feeds the bow; without a choice the first
// ordinary stack with arrows left, never a rare one chosen automatically (INV-06).
export function selectedAmmo(actor, weapon) {
  const rows = ammoRowsFor(actor, weapon);
  const chosen = rows.find((row) => row.id === actor?.ammoSelection?.[weapon?.id]);
  if (chosen) return chosen;
  return rows.find((row) => row.quantity > 0 && plainAmmo(row)) ?? null;
}
export function selectAmmo(state, actorId, weaponId, ammoId, role) {
  const actor = requireActor(state, actorId, role);
  const weapon = requireRow(actor, weaponId);
  if (!ammoRowsFor(actor, weapon).some((row) => row.id === ammoId))
    throw fail("Munizione non adatta a quest’arma.", "Ammunition does not fit this weapon.");
  actor.ammoSelection = { ...(actor.ammoSelection ?? {}), [weaponId]: ammoId };
  return actor.ammoSelection;
}
export function weaponProficiency(actor, profile, row) {
  const slug = row?.weaponType ?? catalogEntry(row)?.slug;
  if (slug && profile?.weaponProficiencies?.includes(slug)) return { proficient: true };
  const category = row?.weapon?.category;
  for (const id of classIdsOf(actor)) {
    const grant = CLASS_WEAPONS[id];
    if (
      grant &&
      ((category === "simple" && grant.simple) || (category === "martial" && grant.martial))
    )
      return { proficient: true, source: grant.source };
  }
  return { proficient: false };
}
const ACTION_PREFIX = "invp-ranged-";
export const rangedActionId = (rowId) => ACTION_PREFIX + rowId;
export const isRangedAction = (action) => String(action?.id ?? "").startsWith(ACTION_PREFIX);
// Combat provider: an equipped weapon with the Ammunition property becomes a Table attack
// (Dex to hit and damage, proficiency from the class). Plain data for combat.mjs.
export function rangedActions(state, actor, profile) {
  const canonical = state.actors?.[actor?.id] ?? actor;
  const eff = getEffectiveActor(canonical) ?? canonical;
  const dex = eff?.abilities?.dex;
  if (!Number.isFinite(dex)) return [];
  const mod = Math.floor((dex - 10) / 2);
  const pb = Number.isFinite(profile?.proficiencyBonus) ? profile.proficiencyBonus : 0;
  return rowsOf(canonical)
    .filter(
      (row) =>
        row.equipped &&
        row.weapon?.type === "ranged" &&
        row.weapon.ammunition &&
        row.quantity > 0 &&
        row.location !== "ground" &&
        row.availableInForm !== false &&
        !row.unidentified,
    )
    .map((row) => {
      const ammo = selectedAmmo(canonical, row);
      const damage = parseFormula(row.weapon.damage?.dice ?? "1d6") ?? { count: 1, sides: 6 };
      const { proficient } = weaponProficiency(canonical, profile, row);
      const meters = (feet) => Math.round((feet ?? 0) * 3) / 10;
      const normal = meters(row.weapon.range?.normal);
      const long = Number.isFinite(row.weapon.range?.long) ? meters(row.weapon.range.long) : null;
      const ammoName = (lang) =>
        ammo ? `${rowName(ammo, lang)} ×${ammo.quantity}` : lang === "it" ? "nessuna" : "none";
      return {
        id: rangedActionId(row.id),
        itemId: row.id,
        name: L(rowName(row, "it"), rowName(row, "en")),
        shortDescription: L(
          `Attacco a distanza con arma: consuma 1 munizione (${ammoName("it")}). Gittata ${fmt(normal, "it")}${long ? "/" + fmt(long, "it") : ""} m${long ? ", svantaggio oltre la normale" : ""}.`,
          `Ranged weapon attack: expends 1 piece of ammunition (${ammoName("en")}). Range ${fmt(normal, "en")}${long ? "/" + fmt(long, "en") : ""} m${long ? ", Disadvantage beyond normal range" : ""}.`,
        ),
        kind: "attack",
        targetMode: "single",
        cost: { action: 1 },
        rangeMeters: normal,
        // SRD Range property (EN 90 / IT 101): beyond normal range with Disadvantage, never
        // beyond long range. The engine applies both (combat.mjs, B40 two-range weapons).
        ...(long ? { longRangeMeters: long } : {}),
        dice: [{ count: damage.count, sides: damage.sides }],
        damageType: row.weapon.damage?.type ?? "piercing",
        attackType: "ranged",
        attackModifier: mod + (proficient ? pb : 0),
        damageModifier: mod,
        ammunition: { kind: row.weapon.ammunition, rowId: ammo?.id ?? null },
        source: srd([89, 90, 91], [101, 102, 103]),
      };
    });
}
// SRD Heavy property (EN 89 / IT 102): a Ranged Heavy weapon has Disadvantage when the
// attacker's Dexterity score is under 13. A roll reason for combat.mjs provideRollReasons.
export function heavyRollReasons(state, attacker, action) {
  if (!isRangedAction(action) || action?.kind !== "attack") return [];
  const canonical = state.actors?.[attacker?.id] ?? attacker;
  const weapon = rowById(canonical, action.itemId);
  if (!weapon?.weapon?.properties?.includes("heavy")) return [];
  const dex = (getEffectiveActor(canonical) ?? canonical)?.abilities?.dex;
  if (!Number.isFinite(dex) || dex >= 13) return [];
  return [
    {
      code: "heavy",
      mode: "disadvantage",
      name: L(
        `Pesante: ${rowName(weapon, "it")} con Destrezza ${dex} (meno di 13)`,
        `Heavy: ${rowName(weapon, "en")} with Dexterity ${dex} (under 13)`,
      ),
      source: SOURCES.heavy,
    },
  ];
}
export function rangedPreviewReasons(state, actor, action) {
  if (!isRangedAction(action)) return [];
  const canonical = state.actors?.[actor?.id] ?? actor;
  const weapon = rowById(canonical, action.itemId);
  const reasons = [];
  const ammo = weapon ? selectedAmmo(canonical, weapon) : null;
  if (!ammo || !(ammo.quantity > 0))
    reasons.push({
      code: "no-ammunition",
      it: "Nessuna munizione disponibile: scegli o aggiungi le frecce (SRD, Munizioni).",
      en: "No ammunition left: choose or add arrows (SRD, Ammunition).",
    });
  if (weapon?.weapon?.properties?.includes("two-handed")) {
    const busy = rowsOf(canonical).filter((r) => r.equipped && r.id !== weapon.id && hands(r) > 0);
    if (busy.length)
      reasons.push({
        code: "two-handed",
        it: `${rowName(weapon, "it")} richiede due mani quando attacchi: ${busy.map((r) => rowName(r, "it")).join(", ")} occupa una mano.`,
        en: `${rowName(weapon, "en")} needs two hands when you attack: ${busy.map((r) => rowName(r, "en")).join(", ")} fills a hand.`,
      });
  }
  return reasons;
}
// Runs inside the accepted attempt, after its costs: one piece of ammunition per attack,
// recorded per fight so half of it can be recovered afterwards.
export function consumeAmmunition(state, attempt, action) {
  if (!isRangedAction(action)) return null;
  const actor = state.actors?.[attempt.actorId];
  const weapon = rowById(actor, action.itemId);
  const ammo = weapon ? selectedAmmo(actor, weapon) : null;
  if (!ammo || !(ammo.quantity > 0))
    throw fail("Nessuna munizione disponibile.", "No ammunition left.");
  ammo.quantity -= 1;
  attempt.ammunition = { rowId: ammo.id, name: copy(ammo.name), spent: 1 };
  const slice = sliceOf(state);
  if (slice) {
    const encounterId = state.combat?.encounterId ?? "demo";
    const record = slice.ammo[actor.id];
    const current =
      record && record.encounterId === encounterId && !record.recovered
        ? record
        : { encounterId, used: {}, names: {}, recovered: false };
    current.used[ammo.id] = (current.used[ammo.id] ?? 0) + 1;
    current.names[ammo.id] = L(rowName(ammo, "it"), rowName(ammo, "en"));
    slice.ammo[actor.id] = current;
  }
  return ammo;
}
// SRD Ammunition (EN 89 / IT 102): after a fight, 1 minute recovers half the ammunition
// used (round down); the rest is lost. Offered once the fight is over, until another starts.
export function ammoRecovery(state, actorId) {
  const record = sliceOf(state)?.ammo?.[actorId];
  if (!record || record.recovered) return null;
  const combat = state.combat ?? {};
  // During the fight nothing yet; once another fight has started the chance is gone.
  if (combat.active || (combat.encounterId ?? "demo") !== record.encounterId) return null;
  const rows = Object.entries(record.used).map(([rowId, used]) => ({
    rowId,
    used,
    recover: Math.floor(used / 2),
    lost: used - Math.floor(used / 2),
    name: record.names?.[rowId] ?? L("Munizioni", "Ammunition"),
  }));
  return { encounterId: record.encounterId, rows };
}
export function recoverAmmunition(state, actorId, role) {
  const actor = requireActor(state, actorId, role);
  const recovery = ammoRecovery(state, actorId);
  if (!recovery)
    throw fail(
      "Niente da recuperare: il recupero si fa dopo lo scontro.",
      "Nothing to recover: recovery happens after the fight.",
    );
  const back = [];
  for (const row of recovery.rows) {
    const target = rowById(actor, row.rowId);
    if (target && row.recover) {
      target.quantity += row.recover;
      back.push(row);
    }
  }
  sliceOf(state).ammo[actorId].recovered = true;
  const text = (lang) =>
    recovery.rows
      .map(
        (r) =>
          `${label(r.name, lang)}: ${lang === "it" ? "usate" : "used"} ${r.used}, ${lang === "it" ? "recuperate" : "recovered"} ${r.recover}, ${lang === "it" ? "perse" : "lost"} ${r.lost}`,
      )
      .join("; ");
  note(
    state,
    actor,
    role,
    `${actor.name} recupera le munizioni dopo lo scontro (1 minuto): ${text("it")}`,
    `${actor.name} recovers ammunition after the fight (1 minute): ${text("en")}`,
  );
  return back;
}

// ---------------------------------------------------------------- search and filters

export const FILTERS = Object.freeze([
  "all",
  "equipped",
  "attunement",
  "consumable",
  "ammunition",
  "magic",
  "containers",
]);
export function matchesFilter(
  actor,
  row,
  { query = "", filter = "all", rarity = "" } = {},
  lang = "it",
) {
  const needle = String(query).trim().toLocaleLowerCase();
  if (needle) {
    const names = [rowName(row, "it"), rowName(row, "en"), row.custom?.notes ?? ""]
      .join(" ")
      .toLocaleLowerCase();
    if (!names.includes(needle)) return false;
  }
  if (rarity && rarityOf(row) !== rarity) return false;
  switch (filter) {
    case "equipped":
      return !!row.equipped;
    case "attunement":
      return needsAttunement(row);
    case "consumable":
      return row.kind === "consumable" || !!row.charges;
    case "ammunition":
      return isAmmunition(row);
    case "magic":
      return !!rarityOf(row);
    case "containers":
      return isContainer(row);
    default:
      return true;
  }
}
export const filtering = (view) =>
  !!(String(view?.query ?? "").trim() || (view?.filter && view.filter !== "all") || view?.rarity);
