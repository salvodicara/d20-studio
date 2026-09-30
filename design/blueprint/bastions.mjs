// B44 — Bases and bastions: a generic facility tracker whose rules the DM authors.
// Patterns: dnd5e Bastion tab (FVT-037: facilities, orders with a cost, the DM advances the
// bastion turn for everyone), Roll20 2024 Bastion tracker (R20-033: facilities on a sheet),
// Kanka Bastion Sheet (F-025 reference). The 2024 Bastion rules live in the DMG, which is
// not part of SRD 5.2.1: nothing here reproduces them. Facility types, orders, costs,
// durations, outcomes, the minimum level and the length of a turn are authored by the DM
// of this campaign; the sample rules below are synthetic and labelled as such.
// Pure domain (seed, projection, commands) plus the renderers/binders used by the party
// area (campaign › Party › Bases), the character sheet tab and the dashboard tile.
// Money (review fix): a character's bastion pays its orders from the owner's canonical
// purse (`actor.currency`, B26), as dnd5e deducts a craft order's cost from the
// character's currency (FVT-037) and as B54 crafting spends it; a sale's gold goes back to
// that purse. Only a party base keeps its own coffers, like the currency of a dnd5e group
// actor (FVT-050), funded and corrected by the DM with a reason.
import { canControlActor, canViewActor, isCampaignActor } from "./character-access.mjs";
import { campaignMembers, isCampaignMember } from "./campaign-content.mjs";
import { addCoins, coinsValue, formatCoins, purseOf, setPurse, spendCp } from "./party-stash.mjs";
import * as U from "./preferences-domain.mjs";

const L = (it, en) => ({ it, en });
const copy = (value) => structuredClone(value);
const uid = (prefix) =>
  prefix +
  "-" +
  (globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10));
const refuse = (it, en) => {
  throw Object.assign(new Error(it), { it, en });
};

export const BASTIONS_VERSION = 1;
export const RULES_SOURCE = Object.freeze({
  kind: "authored",
  author: "dm",
  edition: "2024",
  revision: "blueprint-b44-bases-1",
  note: L(
    "Regole di questa campagna scritte dal DM (esempio sintetico). Le regole dei Bastioni del 2024 sono nella Guida del Dungeon Master, non nel SRD 5.2.1: qui non sono riprodotte.",
    "This campaign's rules, written by the DM (synthetic sample). The 2024 Bastion rules are in the Dungeon Master's Guide, not in SRD 5.2.1: they are not reproduced here.",
  ),
});
// The one inventory row a sample order produces: the SRD 2024 Potion of Healing the sample
// characters already carry (2d4 + 2 HP, same shape as their rows).
const POTION = Object.freeze({
  name: L("Pozione di guarigione", "Potion of healing"),
  kind: "consumable",
  weight: 0.25,
  healing: 7,
  quantity: 1,
  description: L("Recuperi 2d4 + 2 punti ferita.", "Regain 2d4 + 2 hit points."),
});

export function seedBastions() {
  return {
    turn: 0,
    rules: {
      minLevel: 5,
      daysPerTurn: 7,
      source: copy(RULES_SOURCE),
      facilityTypes: [
        {
          id: "records",
          name: L("Sala dei registri", "Records room"),
          description: L(
            "Scaffali di registri di bordo e mappe della costa.",
            "Shelves of logbooks and coastal charts.",
          ),
          orders: [
            {
              id: "search-records",
              name: L("Consulta i registri", "Search the records"),
              cost: 5,
              turns: 1,
              outcome: {
                kind: "text",
                text: L(
                  "Il DM scrive che cosa emerge dai registri.",
                  "The DM writes what the records reveal.",
                ),
              },
            },
          ],
        },
        {
          id: "herb-workshop",
          name: L("Laboratorio d’erbe", "Herb workshop"),
          description: L(
            "Alambicchi e mazzi di erbe appesi ad asciugare.",
            "Stills and bundles of herbs hung to dry.",
          ),
          orders: [
            {
              id: "distil-healing",
              name: L("Distilla una pozione di guarigione", "Distil a potion of healing"),
              cost: 25,
              turns: 1,
              outcome: { kind: "item", item: copy(POTION) },
            },
          ],
        },
        {
          id: "beacon",
          name: L("Lanterna del faro", "Beacon lantern"),
          description: L("La grande lanterna sulla torre.", "The great lantern on the tower."),
          orders: [
            {
              id: "watch-coast",
              name: L("Veglia sulla costa", "Watch the coast"),
              cost: 0,
              turns: 1,
              outcome: {
                kind: "text",
                text: L(
                  "Il DM racconta che cosa hanno avvistato i guardiani.",
                  "The DM tells what the keepers sighted.",
                ),
              },
            },
          ],
        },
        {
          id: "market-stall",
          name: L("Banco al mercato", "Market stall"),
          description: L("Un banco preso in affitto al porto.", "A stall rented at the harbour."),
          orders: [
            {
              id: "sell-goods",
              name: L("Vendi le merci", "Sell goods"),
              cost: 10,
              turns: 2,
              outcome: { kind: "coins", gp: 30 },
            },
          ],
        },
      ],
    },
    bases: [
      {
        id: "bastion-iria",
        name: L("Faro di Capo Sale", "Capo Sale lighthouse"),
        owner: { kind: "character", actorId: "iria" },
        campaignId: "lanterns",
        facilities: [
          { id: "iria-records", typeId: "records" },
          { id: "iria-workshop", typeId: "herb-workshop" },
        ],
        orders: [],
        log: [],
      },
    ],
  };
}

const int = (value, min, max) => Number.isInteger(value) && value >= min && value <= max;
const label = (value) =>
  value && typeof value === "object"
    ? { it: String(value.it ?? value.en ?? ""), en: String(value.en ?? value.it ?? "") }
    : L(String(value ?? ""), String(value ?? ""));
function normalizeOutcome(outcome) {
  if (outcome?.kind === "item" && outcome.item)
    return {
      kind: "item",
      item: {
        name: label(outcome.item.name),
        kind: ["weapon", "consumable", "gear"].includes(outcome.item.kind)
          ? outcome.item.kind
          : "gear",
        weight: Number.isFinite(outcome.item.weight) ? Math.max(0, outcome.item.weight) : 0,
        quantity: int(outcome.item.quantity, 1, 99) ? outcome.item.quantity : 1,
        ...(int(outcome.item.healing, 1, 999) ? { healing: outcome.item.healing } : {}),
        description: label(outcome.item.description ?? ""),
      },
    };
  if (outcome?.kind === "coins")
    return { kind: "coins", gp: int(outcome.gp, 0, 1_000_000) ? outcome.gp : 0 };
  return { kind: "text", text: label(outcome?.text ?? "") };
}
export function normalizeBastions(raw) {
  const seed = seedBastions();
  if (!raw || typeof raw !== "object") return seed;
  const rules = raw.rules && typeof raw.rules === "object" ? raw.rules : seed.rules;
  const types = (Array.isArray(rules.facilityTypes) ? rules.facilityTypes : [])
    .filter((type) => type && typeof type.id === "string")
    .map((type) => ({
      id: type.id,
      name: label(type.name),
      description: label(type.description ?? ""),
      orders: (Array.isArray(type.orders) ? type.orders : [])
        .filter((order) => order && typeof order.id === "string")
        .map((order) => ({
          id: order.id,
          name: label(order.name),
          cost: int(order.cost, 0, 1_000_000) ? order.cost : 0,
          turns: int(order.turns, 1, 52) ? order.turns : 1,
          outcome: normalizeOutcome(order.outcome),
        })),
    }));
  const bases = (Array.isArray(raw.bases) ? raw.bases : [])
    .filter((base) => base && typeof base.id === "string")
    .map((base) => {
      const owner =
        base.owner?.kind === "character" && typeof base.owner.actorId === "string"
          ? { kind: "character", actorId: base.owner.actorId }
          : { kind: "party" };
      return {
        id: base.id,
        name: label(base.name),
        owner,
        campaignId: typeof base.campaignId === "string" ? base.campaignId : "lanterns",
        // Coffers only for a party base; a bastion's coins are its owner's purse.
        ...(owner.kind === "party"
          ? { treasury: int(base.treasury, 0, 100_000_000) ? base.treasury : 0 }
          : {}),
        facilities: (Array.isArray(base.facilities) ? base.facilities : []).filter(
          (f) => f && typeof f.id === "string" && typeof f.typeId === "string",
        ),
        orders: (Array.isArray(base.orders) ? base.orders : []).filter(
          (o) => o && typeof o.id === "string",
        ),
        log: (Array.isArray(base.log) ? base.log : []).filter((e) => e && typeof e.id === "string"),
      };
    });
  return {
    turn: int(raw.turn, 0, 100_000) ? raw.turn : 0,
    rules: {
      minLevel: int(rules.minLevel, 1, 20) ? rules.minLevel : 5,
      daysPerTurn: int(rules.daysPerTurn, 1, 365) ? rules.daysPerTurn : 7,
      source: copy(RULES_SOURCE),
      facilityTypes: types,
    },
    bases,
  };
}

// ---------------------------------------------------------------- access

export function isDm(state, viewer) {
  if (viewer === "dm") return true;
  const member = campaignMembers(state).find((m) => m.id === viewer);
  return member?.role === "dm" || member?.role === "co-dm";
}
export const ownerActor = (state, base) =>
  base.owner.kind === "character" ? (state.actors?.[base.owner.actorId] ?? null) : null;
export function canReadBase(state, base, viewer) {
  if (base.owner.kind === "party") return isCampaignMember(state, base.campaignId, viewer);
  const actor = ownerActor(state, base);
  return Boolean(actor) && canViewActor(actor, viewer, state);
}
// Facilities and the base itself: the DM for the party's base, the character's controller
// for a character's bastion (dnd5e: the bastion lives on the character).
export function canManageBase(state, base, viewer) {
  if (!canReadBase(state, base, viewer)) return false;
  if (base.owner.kind === "party") return isDm(state, viewer);
  return canControlActor(ownerActor(state, base), viewer, state);
}
// Orders: any member for the party's base, the controller for a bastion.
export function canOrderBase(state, base, viewer) {
  if (!canReadBase(state, base, viewer)) return false;
  if (base.owner.kind === "party") return isCampaignMember(state, base.campaignId, viewer);
  return canControlActor(ownerActor(state, base), viewer, state);
}
// A base is in play when the DM can run its turn: the party's base of this campaign, or the
// bastion of a character connected to it (a private sheet stays out of the DM's reach).
export function inPlay(state, base) {
  if (base.campaignId !== state.campaign?.id) return false;
  if (base.owner.kind === "party") return true;
  const actor = ownerActor(state, base);
  return (
    Boolean(actor) && actor.visibility !== "private" && isCampaignActor(actor, state.campaign.id)
  );
}
export const isPrivateBase = (state, base) => ownerActor(state, base)?.visibility === "private";
export const visibleBases = (state, slice, viewer) =>
  (slice?.bases ?? []).filter((base) => canReadBase(state, base, viewer));
export const facilityType = (slice, typeId) =>
  slice.rules.facilityTypes.find((type) => type.id === typeId) ?? null;
export const pendingOrder = (base, facilityId) =>
  base.orders.find((order) => order.facilityId === facilityId && order.status === "pending") ??
  null;
export const bastionOf = (slice, actorId) =>
  (slice?.bases ?? []).find(
    (base) => base.owner.kind === "character" && base.owner.actorId === actorId,
  ) ?? null;
function baseOf(slice, baseId) {
  return (
    slice.bases.find((base) => base.id === baseId) ?? refuse("Base non trovata.", "Base not found.")
  );
}
function readable(state, slice, baseId, viewer) {
  const base = baseOf(slice, baseId);
  if (!canReadBase(state, base, viewer)) refuse("Base non trovata.", "Base not found.");
  return base;
}
const record = (base, entry) => {
  const row = { id: uid("log"), at: new Date().toISOString(), corrections: [], ...entry };
  base.log.push(row);
  return row;
};
const checkName = (name) => {
  const value = String(name ?? "").trim();
  if (!value || value.length > 80)
    refuse("Scrivi un nome da 1 a 80 caratteri.", "Write a name of 1 to 80 characters.");
  return value;
};
const checkReason = (reason) => {
  const value = String(reason ?? "").trim();
  if (!value || value.length > 200)
    refuse(
      "Scrivi il motivo della correzione (fino a 200 caratteri).",
      "Write the reason for the correction (up to 200 characters).",
    );
  return value;
};

// ---------------------------------------------------------------- money

// Who pays: the owner's purse for a character's bastion, the coffers for a party base.
export const paysFromPurse = (base) => base.owner.kind === "character";
function pay(state, base, viewer, gp) {
  if (!gp) return;
  if (!paysFromPurse(base)) {
    if (base.treasury < gp)
      refuse(
        `Cassa insufficiente: servono ${gp} mo, ci sono ${base.treasury} mo.`,
        `Not enough in the treasury: ${gp} gp needed, ${base.treasury} gp available.`,
      );
    base.treasury -= gp;
    return;
  }
  const owner =
    ownerActor(state, base) ?? refuse("Personaggio non disponibile.", "Character unavailable.");
  const purse = purseOf(owner);
  if (coinsValue(purse) < gp * 100)
    refuse(
      `Monete insufficienti: servono ${gp} mo, ${owner.name} ha ${formatCoins(purse, "it")}. Registra le sue monete sulla scheda (Inventario › Monete).`,
      `Not enough coins: ${gp} gp needed, ${owner.name} has ${formatCoins(purse, "en")}. Record their coins on the sheet (Inventory › Coins).`,
    );
  setPurse(null, viewer, owner, spendCp(purse, gp * 100));
}
function receive(state, base, viewer, gp) {
  if (!gp) return null;
  if (!paysFromPurse(base)) {
    base.treasury += gp;
    return null;
  }
  const owner =
    ownerActor(state, base) ?? refuse("Personaggio non disponibile.", "Character unavailable.");
  setPurse(null, viewer, owner, addCoins(purseOf(owner), { gp }));
  return { actorId: owner.id, actorName: owner.name };
}

// ---------------------------------------------------------------- commands

export function createBase(state, slice, viewer, { name, actorId = null }) {
  const title = checkName(name);
  if (!actorId) {
    if (!isDm(state, viewer))
      refuse("Solo il DM crea una base del gruppo.", "Only the DM creates a party base.");
    const base = {
      id: uid("base"),
      name: L(title, title),
      owner: { kind: "party" },
      campaignId: state.campaign.id,
      treasury: 0,
      facilities: [],
      orders: [],
      log: [],
    };
    record(base, { kind: "founded", turn: slice.turn, by: viewer });
    slice.bases.push(base);
    return base;
  }
  const actor = state.actors?.[actorId];
  if (!actor || !canControlActor(actor, viewer, state) || actor.kind !== "character")
    refuse("Personaggio non disponibile.", "Character unavailable.");
  if (!(actor.level >= slice.rules.minLevel))
    refuse(
      `Il bastione si fonda dal livello ${slice.rules.minLevel} (regola del DM).`,
      `A bastion is founded from level ${slice.rules.minLevel} (DM rule).`,
    );
  if (bastionOf(slice, actorId))
    refuse(`${actor.name} ha già un bastione.`, `${actor.name} already has a bastion.`);
  const base = {
    id: uid("bastion"),
    name: L(title, title),
    owner: { kind: "character", actorId },
    campaignId: state.campaign.id,
    facilities: [],
    orders: [],
    log: [],
  };
  record(base, { kind: "founded", turn: slice.turn, by: viewer });
  slice.bases.push(base);
  return base;
}
export function addFacility(state, slice, viewer, { baseId, typeId }) {
  const base = readable(state, slice, baseId, viewer);
  if (!canManageBase(state, base, viewer))
    refuse("Non puoi modificare questa base.", "You cannot change this base.");
  const type =
    facilityType(slice, typeId) ??
    refuse("Struttura non prevista dalle regole.", "Facility not in the rules.");
  if (base.facilities.some((f) => f.typeId === typeId))
    refuse("La base ha già questa struttura.", "The base already has this facility.");
  const facility = { id: uid("facility"), typeId };
  base.facilities.push(facility);
  record(base, { kind: "facility", turn: slice.turn, by: viewer, facility: copy(type.name) });
  return facility;
}
export function removeFacility(state, slice, viewer, { baseId, facilityId }) {
  const base = readable(state, slice, baseId, viewer);
  if (!canManageBase(state, base, viewer))
    refuse("Non puoi modificare questa base.", "You cannot change this base.");
  const facility =
    base.facilities.find((f) => f.id === facilityId) ??
    refuse("Struttura non trovata.", "Facility not found.");
  if (pendingOrder(base, facilityId))
    refuse(
      "La struttura ha un ordine in corso: annullalo prima di rimuoverla.",
      "The facility has an order in progress: cancel it before removing the facility.",
    );
  base.facilities = base.facilities.filter((f) => f !== facility);
  record(base, {
    kind: "facility-removed",
    turn: slice.turn,
    by: viewer,
    facility: copy(facilityType(slice, facility.typeId)?.name ?? L("Struttura", "Facility")),
  });
}
export function issueOrder(state, slice, viewer, { baseId, facilityId, orderId }) {
  const base = readable(state, slice, baseId, viewer);
  if (!canOrderBase(state, base, viewer))
    refuse("Non puoi dare ordini a questa base.", "You cannot give orders to this base.");
  const facility =
    base.facilities.find((f) => f.id === facilityId) ??
    refuse("Struttura non trovata.", "Facility not found.");
  const type = facilityType(slice, facility.typeId);
  const definition =
    type?.orders.find((o) => o.id === orderId) ??
    refuse("Ordine non previsto.", "Order not in the rules.");
  // Tracker rule, not a DMG rule: a facility runs one order at a time.
  if (pendingOrder(base, facilityId))
    refuse(
      "La struttura sta già eseguendo un ordine.",
      "The facility is already carrying out an order.",
    );
  pay(state, base, viewer, definition.cost);
  const order = {
    id: uid("order"),
    facilityId,
    typeId: type.id,
    orderId,
    name: copy(definition.name),
    facilityName: copy(type.name),
    cost: definition.cost,
    turns: definition.turns,
    remaining: definition.turns,
    outcome: copy(definition.outcome),
    issuedTurn: slice.turn,
    issuedBy: viewer,
    status: "pending",
  };
  base.orders.push(order);
  record(base, {
    kind: "order",
    turn: slice.turn,
    by: viewer,
    orderId: order.id,
    order: copy(order.name),
    facility: copy(type.name),
    cost: definition.cost,
  });
  return order;
}
export function cancelOrder(state, slice, viewer, { baseId, orderId }) {
  const base = readable(state, slice, baseId, viewer);
  if (!canOrderBase(state, base, viewer))
    refuse("Non puoi dare ordini a questa base.", "You cannot give orders to this base.");
  const order =
    base.orders.find((o) => o.id === orderId && o.status === "pending") ??
    refuse("Ordine non in corso.", "Order not in progress.");
  order.status = "cancelled";
  receive(state, base, viewer, order.cost);
  record(base, {
    kind: "cancel",
    turn: slice.turn,
    by: viewer,
    orderId,
    order: copy(order.name),
    facility: copy(order.facilityName),
    cost: order.cost,
  });
}
// Items go to the bastion's character; a party base's item goes to the member the DM picks.
export function recipientsFor(state, base) {
  if (base.owner.kind === "character") {
    const actor = ownerActor(state, base);
    return actor ? [actor] : [];
  }
  return Object.values(state.actors ?? {}).filter(
    (actor) =>
      actor.kind === "character" &&
      !actor.companion &&
      actor.visibility !== "private" &&
      isCampaignActor(actor, base.campaignId),
  );
}
export function previewTurn(state, slice, viewer) {
  if (!isDm(state, viewer))
    refuse("Solo il DM avanza il turno delle basi.", "Only the DM advances the bases' turn.");
  return {
    turn: slice.turn + 1,
    daysPerTurn: slice.rules.daysPerTurn,
    bases: slice.bases
      .filter((base) => inPlay(state, base) && canReadBase(state, base, viewer))
      .map((base) => {
        const pending = base.orders.filter((o) => o.status === "pending");
        return {
          base,
          completing: pending.filter((o) => o.remaining <= 1),
          continuing: pending.filter((o) => o.remaining > 1),
          recipients: recipientsFor(state, base),
        };
      }),
  };
}
function sameName(a, b) {
  const x = label(a),
    y = label(b);
  return x.it === y.it && x.en === y.en;
}
export function deliverItem(actor, item, sourceId) {
  actor.inventory ??= [];
  const same = actor.inventory.find(
    (row) => !row.equipped && row.kind === item.kind && sameName(row.name, item.name),
  );
  if (same) {
    same.quantity = (same.quantity ?? 0) + item.quantity;
    return same;
  }
  const row = {
    id: "bastion-" + sourceId,
    name: copy(item.name),
    quantity: item.quantity,
    weight: item.weight,
    equipped: false,
    kind: item.kind,
    ...(item.healing ? { healing: item.healing } : {}),
    description: copy(item.description ?? ""),
  };
  actor.inventory.push(row);
  return row;
}
// The DM advances one turn for every base in play (dnd5e FVT-037). `decisions[orderId]`
// holds the DM's outcome for each completing order: free text, whether an item is
// delivered (and to whom, for a party base) and the gold a sale brings. DM discretion: the
// authored outcome is only the proposal. Game time is not advanced here (I-087).
export function advanceTurn(state, slice, viewer, decisions = {}) {
  const preview = previewTurn(state, slice, viewer);
  const turn = preview.turn;
  // Validate every decision first, so a refusal leaves no order half-advanced.
  for (const { completing } of preview.bases)
    for (const order of completing) {
      const gp = decisions[order.id]?.gp;
      if (order.outcome.kind === "coins" && gp !== undefined && !int(Number(gp), 0, 1_000_000))
        refuse("Scrivi le monete d’oro da 0 in su.", "Enter the gold pieces, 0 or more.");
    }
  let completed = 0;
  for (const { base, recipients } of preview.bases) {
    for (const order of base.orders.filter((o) => o.status === "pending")) {
      order.remaining -= 1;
      if (order.remaining > 0) continue;
      const decision = decisions[order.id] ?? {};
      const note = String(decision.text ?? "")
        .trim()
        .slice(0, 600);
      const entry = {
        kind: "outcome",
        turn,
        by: viewer,
        orderId: order.id,
        order: copy(order.name),
        facility: copy(order.facilityName),
        note,
      };
      if (order.outcome.kind === "item") {
        const deliver = decision.deliver !== false;
        if (deliver) {
          const target =
            recipients.find((actor) => actor.id === decision.recipientId) ?? recipients[0];
          if (!target)
            refuse(
              "Nessun personaggio può ricevere l’oggetto.",
              "No character can receive the item.",
            );
          const actor = state.actors[target.id];
          deliverItem(actor, order.outcome.item, order.id);
          entry.item = { ...copy(order.outcome.item), actorId: actor.id, actorName: actor.name };
        } else entry.withheld = copy(order.outcome.item);
      }
      if (order.outcome.kind === "coins") {
        const gp = decision.gp === undefined ? order.outcome.gp : Number(decision.gp);
        if (!int(gp, 0, 1_000_000))
          refuse("Scrivi le monete d’oro da 0 in su.", "Enter the gold pieces, 0 or more.");
        const to = receive(state, base, viewer, gp);
        entry.gp = gp;
        if (to) entry.coinsTo = to;
      }
      order.status = "completed";
      order.completedTurn = turn;
      record(base, entry);
      completed += 1;
    }
  }
  slice.turn = turn;
  return { turn, completed };
}
export function correctOutcome(state, slice, viewer, { baseId, logId, text: value, reason }) {
  if (!isDm(state, viewer))
    refuse("Solo il DM corregge un esito.", "Only the DM corrects an outcome.");
  const base = readable(state, slice, baseId, viewer);
  const entry =
    base.log.find((e) => e.id === logId && e.kind === "outcome") ??
    refuse("Esito non trovato.", "Outcome not found.");
  const note = String(value ?? "").trim();
  if (!note || note.length > 600)
    refuse(
      "Scrivi l’esito corretto (fino a 600 caratteri).",
      "Write the corrected outcome (up to 600 characters).",
    );
  entry.corrections.push({
    note,
    reason: checkReason(reason),
    by: viewer,
    at: new Date().toISOString(),
  });
}
export function correctTreasury(state, slice, viewer, { baseId, amount, reason }) {
  if (!isDm(state, viewer))
    refuse("Solo il DM corregge la cassa.", "Only the DM corrects the treasury.");
  const base = readable(state, slice, baseId, viewer);
  if (paysFromPurse(base)) {
    const name = ownerActor(state, base)?.name ?? "";
    refuse(
      `Il bastione usa le monete di ${name}: correggile dalla sua scheda (Inventario › Monete).`,
      `The bastion uses ${name}’s coins: correct them on the sheet (Inventory › Coins).`,
    );
  }
  if (!int(amount, 0, 100_000_000))
    refuse("Scrivi le monete d’oro da 0 in su.", "Enter the gold pieces, 0 or more.");
  const why = checkReason(reason);
  const from = base.treasury;
  base.treasury = amount;
  record(base, { kind: "treasury", turn: slice.turn, by: viewer, from, to: amount, reason: why });
}
export function setRules(state, slice, viewer, { minLevel, daysPerTurn }) {
  if (!isDm(state, viewer))
    refuse("Solo il DM scrive le regole delle basi.", "Only the DM writes the bases' rules.");
  if (!int(minLevel, 1, 20) || !int(daysPerTurn, 1, 365))
    refuse(
      "Livello da 1 a 20 e giorni per turno da 1 a 365.",
      "Level 1 to 20 and days per turn 1 to 365.",
    );
  slice.rules.minLevel = minLevel;
  slice.rules.daysPerTurn = daysPerTurn;
}
export function addFacilityType(state, slice, viewer, input) {
  if (!isDm(state, viewer))
    refuse("Solo il DM scrive le regole delle basi.", "Only the DM writes the bases' rules.");
  const name = checkName(input.name);
  const orderName = checkName(input.orderName);
  const cost = Number(input.cost),
    turns = Number(input.turns);
  if (!int(cost, 0, 1_000_000) || !int(turns, 1, 52))
    refuse(
      "Costo da 0 mo in su e durata da 1 a 52 turni.",
      "Cost of 0 gp or more and duration of 1 to 52 turns.",
    );
  let outcome;
  if (input.outcomeKind === "item") {
    const itemName = checkName(input.itemName);
    const weight = Number(input.itemWeight ?? 0);
    if (!Number.isFinite(weight) || weight < 0 || weight > 10_000)
      refuse("Peso dell’oggetto non valido.", "Invalid item weight.");
    outcome = {
      kind: "item",
      item: {
        name: L(itemName, itemName),
        kind: "gear",
        weight,
        quantity: 1,
        description: L("", ""),
      },
    };
  } else if (input.outcomeKind === "coins") {
    const gp = Number(input.gp);
    if (!int(gp, 0, 1_000_000)) refuse("Monete d’oro non valide.", "Invalid gold pieces.");
    outcome = { kind: "coins", gp };
  } else {
    const note = String(input.outcomeText ?? "")
      .trim()
      .slice(0, 300);
    outcome = { kind: "text", text: L(note, note) };
  }
  const type = {
    id: uid("type"),
    name: L(name, name),
    description: L(
      String(input.description ?? "")
        .trim()
        .slice(0, 200),
      String(input.description ?? "")
        .trim()
        .slice(0, 200),
    ),
    orders: [{ id: uid("order-def"), name: L(orderName, orderName), cost, turns, outcome }],
  };
  slice.rules.facilityTypes.push(type);
  return type;
}

// ---------------------------------------------------------------- presentation

// The viewer's unit system (B22 precedence: personal, table, then language); canonical
// weights stay in kilograms. Shared with party.mjs.
export function unitOf(ctx) {
  const read = (key) => {
    try {
      return ctx.registry?.getSetting?.(ctx, key);
    } catch {
      return undefined;
    }
  };
  return U.resolveUnits(read(U.KEYS.units), read(U.KEYS.tableUnits), ctx.lang).unit;
}
const weightUnit = (ctx) => (unitOf(ctx) === "imperial" ? "lb" : "kg");

const gp = (ctx, n) =>
  `${Number(n ?? 0).toLocaleString(ctx.lang === "en" ? "en-GB" : "it-IT")} ${ctx.t("mo", "gp")}`;
const turnsText = (ctx, n) =>
  n === 1 ? ctx.t("1 turno", "1 turn") : ctx.t(`${n} turni`, `${n} turns`);
// Where a sale's gold goes: the owner's purse for a bastion, the coffers for a party base
// (without a base, as in the rules list, both are named).
function coinsDestination(ctx, state, base) {
  if (!base) return ctx.t("al personaggio o alla cassa della base", "to the character or the base");
  if (!paysFromPurse(base)) return ctx.t("alla cassa", "to the treasury");
  const name = ownerActor(state, base)?.name ?? "";
  return ctx.t(`alle monete di ${name}`, `to ${name}’s coins`);
}
function outcomeText(ctx, outcome, state = null, base = null) {
  if (outcome.kind === "item")
    return (
      ctx.t("Oggetto: ", "Item: ") + `${ctx.label(outcome.item.name)} ×${outcome.item.quantity}`
    );
  if (outcome.kind === "coins")
    return `${ctx.t("Monete", "Gold")} ${coinsDestination(ctx, state, base)}: ${gp(ctx, outcome.gp)}`;
  return ctx.t("Esito scritto dal DM", "Outcome written by the DM");
}
// The money a base spends: its owner's purse (B26 coins) or its own coffers.
export function fundsText(ctx, state, base) {
  if (!paysFromPurse(base)) return `${ctx.t("Cassa", "Treasury")} ${gp(ctx, base.treasury)}`;
  const owner = ownerActor(state, base);
  return `${ctx.t(`Monete di ${owner?.name ?? ""}`, `${owner?.name ?? ""}’s coins`)} ${formatCoins(owner ? purseOf(owner) : {}, ctx.lang)}`;
}
function logLine(ctx, entry) {
  const L2 = (it, en) => ctx.t(it, en);
  const name = (value) => ctx.esc(ctx.label(value));
  switch (entry.kind) {
    case "founded":
      return L2("Base fondata", "Base founded");
    case "facility":
      return L2("Struttura aggiunta: ", "Facility added: ") + name(entry.facility);
    case "facility-removed":
      return L2("Struttura rimossa: ", "Facility removed: ") + name(entry.facility);
    case "order":
      return `${L2("Ordine", "Order")} · ${name(entry.facility)}: ${name(entry.order)} · ${ctx.esc(gp(ctx, entry.cost))}`;
    case "cancel":
      return `${L2("Ordine annullato", "Order cancelled")} · ${name(entry.order)} · ${L2("rimborso", "refund")} ${ctx.esc(gp(ctx, entry.cost))}`;
    case "treasury":
      return `${L2("Cassa corretta", "Treasury corrected")}: ${ctx.esc(gp(ctx, entry.from))} → ${ctx.esc(gp(ctx, entry.to))} · ${ctx.esc(entry.reason)}`;
    case "outcome": {
      const last = entry.corrections?.at(-1);
      const note = last ? last.note : entry.note;
      const parts = [
        `<strong>${L2("Esito", "Outcome")} · ${name(entry.facility)}: ${name(entry.order)}</strong>`,
      ];
      if (entry.item)
        parts.push(
          `${ctx.esc(ctx.label(entry.item.name))} ×${entry.item.quantity} → ${ctx.esc(entry.item.actorName)}`,
        );
      if (entry.withheld)
        parts.push(
          L2("Nessun oggetto consegnato (decisione del DM)", "No item delivered (DM decision)"),
        );
      if (Number.isInteger(entry.gp))
        parts.push(
          `+${ctx.esc(gp(ctx, entry.gp))} ${
            entry.coinsTo
              ? ctx.esc(ctx.t(`a ${entry.coinsTo.actorName}`, `to ${entry.coinsTo.actorName}`))
              : L2("alla cassa", "to the treasury")
          }`,
        );
      if (note) parts.push(`<span class="party-log-note">${ctx.esc(note)}</span>`);
      if (last)
        parts.push(
          `<span class="muted">${L2("Corretto", "Corrected")}: ${ctx.esc(last.reason)}</span>`,
        );
      return parts.join(" · ");
    }
    default:
      return ctx.esc(entry.kind);
  }
}
function renderLog(ctx, state, base) {
  const dm = isDm(state, ctx.role);
  const rows = [...base.log].reverse();
  return `<details class="party-base-log"${rows.some((e) => e.kind === "outcome") ? " open" : ""}><summary>${ctx.t("Registro della base", "Base log")} (${rows.length})</summary>${
    rows.length
      ? `<ol class="party-log">${rows
          .map(
            (entry) =>
              `<li data-bastion-log="${ctx.esc(entry.id)}"><span class="badge">${ctx.t("Turno", "Turn")} ${entry.turn}</span> <span>${logLine(ctx, entry)}</span>${
                dm && entry.kind === "outcome"
                  ? ` <button type="button" class="button quiet" data-bastion="correct-outcome" data-base="${ctx.esc(base.id)}" data-log="${ctx.esc(entry.id)}">${ctx.t("Correggi esito", "Correct outcome")}</button>`
                  : ""
              }</li>`,
          )
          .join("")}</ol>`
      : `<p class="muted">${ctx.t("Ancora nessuna voce.", "No entries yet.")}</p>`
  }</details>`;
}
export function renderBaseCard(ctx, state, slice, base) {
  const manage = canManageBase(state, base, ctx.role);
  const order = canOrderBase(state, base, ctx.role);
  const dm = isDm(state, ctx.role);
  const owner = ownerActor(state, base);
  const who =
    base.owner.kind === "party"
      ? ctx.t("Base del gruppo", "Party base")
      : ctx.t(`Bastione di ${owner?.name ?? ""}`, `${owner?.name ?? ""}’s bastion`);
  const playing = inPlay(state, base);
  const facilities = base.facilities
    .map((facility) => {
      const type = facilityType(slice, facility.typeId);
      if (!type) return "";
      const pending = pendingOrder(base, facility.id);
      const orders = pending
        ? `<p class="party-order-pending"><span class="badge">${ctx.t("In corso", "In progress")} · ${ctx.esc(turnsText(ctx, pending.remaining))}</span> ${ctx.esc(ctx.label(pending.name))} · ${ctx.esc(gp(ctx, pending.cost))}</p>${
            order
              ? `<button type="button" class="button quiet" data-bastion="cancel" data-base="${ctx.esc(base.id)}" data-order="${ctx.esc(pending.id)}">${ctx.t("Annulla ordine", "Cancel order")}</button>`
              : ""
          }`
        : type.orders
            .map((definition) =>
              order
                ? `<button type="button" class="button" data-bastion="order" data-base="${ctx.esc(base.id)}" data-facility="${ctx.esc(facility.id)}" data-order="${ctx.esc(definition.id)}">${ctx.t("Ordina", "Order")}: ${ctx.esc(ctx.label(definition.name))} · ${ctx.esc(gp(ctx, definition.cost))} · ${ctx.esc(turnsText(ctx, definition.turns))}</button><span class="muted party-order-outcome">${ctx.esc(outcomeText(ctx, definition.outcome, state, base))}</span>`
                : `<span class="muted">${ctx.esc(ctx.label(definition.name))} · ${ctx.esc(gp(ctx, definition.cost))}</span>`,
            )
            .join("");
      return `<li class="party-facility" data-facility="${ctx.esc(facility.id)}"><div><strong>${ctx.esc(ctx.label(type.name))}</strong>${ctx.label(type.description) ? `<p class="muted">${ctx.esc(ctx.label(type.description))}</p>` : ""}</div><div class="party-facility-orders">${orders}</div>${
        manage && !pending
          ? `<button type="button" class="button quiet" data-bastion="remove-facility" data-base="${ctx.esc(base.id)}" data-facility="${ctx.esc(facility.id)}" aria-label="${ctx.t("Rimuovi struttura", "Remove facility")}: ${ctx.esc(ctx.label(type.name))}">${ctx.t("Rimuovi", "Remove")}</button>`
          : ""
      }</li>`;
    })
    .join("");
  const addable = slice.rules.facilityTypes.filter(
    (type) => !base.facilities.some((f) => f.typeId === type.id),
  );
  // A bastion spends its owner's coins (B26 purse, Inventory › Coins); a party base its
  // coffers, which only the DM corrects.
  const funds = paysFromPurse(base)
    ? `${ctx.t(`Monete di ${owner?.name ?? ""}`, `${owner?.name ?? ""}’s coins`)} <strong data-bastion-purse>${ctx.esc(formatCoins(owner ? purseOf(owner) : {}, ctx.lang))}</strong>`
    : `${ctx.t("Cassa", "Treasury")} <strong data-bastion-treasury>${ctx.esc(gp(ctx, base.treasury))}</strong>`;
  const fundsCommand = paysFromPurse(base)
    ? owner
      ? `<button type="button" class="button quiet" data-party-sheet="${ctx.esc(owner.id)}" data-tab="inventory">${ctx.t("Monete sulla scheda", "Coins on the sheet")}</button>`
      : ""
    : dm
      ? `<button type="button" class="button quiet" data-bastion="treasury" data-base="${ctx.esc(base.id)}">${ctx.t("Correggi cassa", "Correct treasury")}</button>`
      : "";
  return `<article class="party-base" data-base="${ctx.esc(base.id)}"><header class="party-base-head"><div><h3>${ctx.esc(ctx.label(base.name))}</h3><p class="muted">${ctx.esc(who)} · ${funds}</p>${
    paysFromPurse(base)
      ? `<p class="muted party-funds-note">${ctx.t("Gli ordini si pagano con le monete del personaggio e l’oro guadagnato torna lì.", "Orders are paid with the character's coins and gold earned goes back there.")}</p>`
      : ""
  }</div>${fundsCommand}</header>${
    playing
      ? ""
      : `<p class="party-notice" data-bastion-private>${ctx.t("Questa scheda non è collegata alla campagna: solo tu vedi il bastione e il DM non può avanzarne il turno. Gli ordini restano in attesa finché la colleghi.", "This sheet is not connected to the campaign: only you see the bastion and the DM cannot advance its turn. Orders wait until you connect it.")}</p>`
  }${
    base.facilities.length
      ? `<ul class="party-facilities">${facilities}</ul>`
      : `<p class="muted">${ctx.t("Ancora nessuna struttura.", "No facilities yet.")}</p>`
  }${
    manage && addable.length
      ? `<form class="party-inline-form" data-bastion-form="add-facility" data-base="${ctx.esc(base.id)}"><label class="field">${ctx.t("Struttura dalle regole del DM", "Facility from the DM's rules")}<select name="typeId">${addable.map((type) => `<option value="${ctx.esc(type.id)}">${ctx.esc(ctx.label(type.name))}</option>`).join("")}</select></label><button class="button" type="submit">${ctx.t("Aggiungi struttura", "Add facility")}</button></form>`
      : ""
  }${renderLog(ctx, state, base)}</article>`;
}
function rulesSummary(ctx, slice) {
  return `<p class="party-rules-note" data-bastion-rules>${ctx.t("Regole della campagna scritte dal DM", "Campaign rules written by the DM")}: ${ctx.t("un turno delle basi dura", "a bases turn lasts")} ${slice.rules.daysPerTurn} ${ctx.t("giorni di gioco", "game days")} · ${ctx.t("bastione dal livello", "bastion from level")} ${slice.rules.minLevel}. <span class="muted">${ctx.esc(ctx.label(slice.rules.source.note))}</span></p>`;
}
function rulesEditor(ctx, slice) {
  const types = slice.rules.facilityTypes
    .map(
      (type) =>
        `<li><strong>${ctx.esc(ctx.label(type.name))}</strong> — ${type.orders.map((o) => `${ctx.esc(ctx.label(o.name))} · ${ctx.esc(gp(ctx, o.cost))} · ${ctx.esc(turnsText(ctx, o.turns))} · ${ctx.esc(outcomeText(ctx, o.outcome))}`).join("; ")}</li>`,
    )
    .join("");
  return `<details class="party-rules"><summary>${ctx.t("Regole delle basi (scritte dal DM)", "Bases rules (written by the DM)")}</summary><form class="party-inline-form" data-bastion-form="rules"><label class="field">${ctx.t("Livello minimo del bastione", "Bastion minimum level")}<input type="number" name="minLevel" min="1" max="20" value="${slice.rules.minLevel}"></label><label class="field">${ctx.t("Giorni di gioco per turno", "Game days per turn")}<input type="number" name="daysPerTurn" min="1" max="365" value="${slice.rules.daysPerTurn}"></label><button class="button" type="submit">${ctx.t("Salva regole", "Save rules")}</button></form><h4>${ctx.t("Strutture previste", "Facilities in the rules")}</h4><ul class="party-rule-list">${types}</ul><form class="party-rule-form" data-bastion-form="facility-type"><h4>${ctx.t("Nuova struttura", "New facility")}</h4><div class="form-grid"><label class="field">${ctx.t("Nome", "Name")}<input name="name" maxlength="80" required></label><label class="field">${ctx.t("Descrizione", "Description")}<input name="description" maxlength="200"></label><label class="field">${ctx.t("Ordine", "Order")}<input name="orderName" maxlength="80" required></label><label class="field">${ctx.t("Costo (mo)", "Cost (gp)")}<input type="number" name="cost" min="0" value="0"></label><label class="field">${ctx.t("Durata (turni)", "Duration (turns)")}<input type="number" name="turns" min="1" max="52" value="1"></label><label class="field">${ctx.t("Esito", "Outcome")}<select name="outcomeKind"><option value="text">${ctx.t("Testo scritto dal DM", "Text written by the DM")}</option><option value="item">${ctx.t("Oggetto al personaggio", "Item to the character")}</option><option value="coins">${ctx.t("Monete (al personaggio o alla cassa della base)", "Gold (to the character or the base's treasury)")}</option></select></label><label class="field">${ctx.t("Testo proposto", "Proposed text")}<input name="outcomeText" maxlength="300"></label><label class="field">${ctx.t("Oggetto (nome)", "Item (name)")}<input name="itemName" maxlength="80"></label><label class="field">${ctx.t("Peso dell’oggetto", "Item weight")} (${weightUnit(ctx)})<input type="number" name="itemWeight" min="0" step="0.25" value="0"></label><label class="field">${ctx.t("Monete (mo)", "Gold (gp)")}<input type="number" name="gp" min="0" value="0"></label></div><button class="button" type="submit">${ctx.t("Aggiungi alle regole", "Add to the rules")}</button></form></details>`;
}
export function renderBasesTab(ctx, state, slice) {
  const dm = isDm(state, ctx.role);
  const bases = visibleBases(state, slice, ctx.role);
  const pending = bases.reduce(
    (n, base) =>
      n + (inPlay(state, base) ? base.orders.filter((o) => o.status === "pending").length : 0),
    0,
  );
  return `<section class="party-bases"><div class="party-bases-top"><div><h2>${ctx.t("Basi e bastioni", "Bases and bastions")}</h2><p class="muted">${ctx.t("Turno delle basi", "Bases turn")} <strong data-bastion-turn>${slice.turn}</strong> · ${ctx.t("ordini in corso", "orders in progress")}: ${pending}</p></div>${
    dm
      ? `<button type="button" class="button primary" data-bastion="advance">${ctx.t("Avanza il turno delle basi", "Advance the bases turn")}</button>`
      : ""
  }</div>${rulesSummary(ctx, slice)}${
    dm
      ? `<form class="party-inline-form" data-bastion-form="create-party-base"><label class="field">${ctx.t("Nuova base del gruppo", "New party base")}<input name="name" maxlength="80" placeholder="${ctx.t("Es. Torre dell’osservatorio", "E.g. Observatory tower")}" required></label><button class="button" type="submit">${ctx.t("Crea base", "Create base")}</button></form>${rulesEditor(ctx, slice)}`
      : ""
  }${
    bases.length
      ? bases.map((base) => renderBaseCard(ctx, state, slice, base)).join("")
      : `<p class="campaign-empty">${ctx.t("Nessuna base visibile. Un personaggio dal livello indicato dal DM può fondare un bastione dalla sua scheda; il DM può creare una base del gruppo.", "No visible base. A character from the DM's level can found a bastion from their sheet; the DM can create a party base.")}</p>`
  }</section>`;
}
export function renderBastionSheet(ctx, state, slice, actor) {
  const base = bastionOf(slice, actor.id);
  if (base && canReadBase(state, base, ctx.role))
    return `<section class="party-sheet-bastion">${rulesSummary(ctx, slice)}${renderBaseCard(ctx, state, slice, base)}</section>`;
  return `<section class="party-sheet-bastion">${rulesSummary(ctx, slice)}${
    canControlActor(actor, ctx.role, state)
      ? `<form class="party-inline-form" data-bastion-form="found" data-actor="${ctx.esc(actor.id)}"><label class="field">${ctx.t("Nome del bastione", "Bastion name")}<input name="name" maxlength="80" required></label><button class="button primary" type="submit">${ctx.t("Fonda il bastione", "Found the bastion")}</button></form>`
      : `<p class="muted">${ctx.t("Nessun bastione registrato.", "No bastion recorded.")}</p>`
  }</section>`;
}
// The DM's turn dialog: every completing order with the authored outcome as a proposal the
// DM edits or withholds; continuing orders are listed with their remaining turns.
export function advanceDialogBody(ctx, state, slice) {
  const preview = previewTurn(state, slice, ctx.role);
  const blocks = preview.bases
    .filter((entry) => entry.completing.length || entry.continuing.length)
    .map(({ base, completing, continuing, recipients }) => {
      const rows = completing
        .map((order) => {
          const id = ctx.esc(order.id);
          // The authored text is a hint for the DM (placeholder), never an outcome by itself.
          const proposal = order.outcome.kind === "text" ? ctx.label(order.outcome.text) : "";
          let extra = "";
          if (order.outcome.kind === "item")
            extra = `<label class="check-field"><input type="checkbox" name="deliver-${id}" checked> ${ctx.t("Consegna", "Deliver")}: ${ctx.esc(ctx.label(order.outcome.item.name))} ×${order.outcome.item.quantity}</label>${
              recipients.length > 1
                ? `<label class="field">${ctx.t("A chi", "To whom")}<select name="recipient-${id}">${recipients.map((a) => `<option value="${ctx.esc(a.id)}">${ctx.esc(a.name)}</option>`).join("")}</select></label>`
                : recipients[0]
                  ? `<p class="muted">${ctx.t("A", "To")} ${ctx.esc(recipients[0].name)}</p>`
                  : ""
            }`;
          if (order.outcome.kind === "coins")
            extra = `<label class="field">${ctx.esc(`${ctx.t("Monete d’oro", "Gold pieces")} ${coinsDestination(ctx, state, base)}`)}<input type="number" name="gp-${id}" min="0" value="${order.outcome.gp}"></label>`;
          return `<div class="party-advance-order" data-advance-order="${id}"><p><strong>${ctx.esc(ctx.label(order.facilityName))}: ${ctx.esc(ctx.label(order.name))}</strong> · ${ctx.t("si completa", "completes")}</p>${extra}<label class="field">${ctx.t("Esito (a discrezione del DM)", "Outcome (DM's discretion)")}<textarea name="text-${id}" maxlength="600" rows="2" placeholder="${ctx.esc(proposal)}"></textarea></label></div>`;
        })
        .join("");
      const going = continuing
        .map(
          (order) =>
            `<p class="muted">${ctx.t("Prosegue", "Continues")}: ${ctx.esc(ctx.label(order.name))} · ${ctx.t("ancora", "still")} ${ctx.esc(turnsText(ctx, order.remaining - 1))}</p>`,
        )
        .join("");
      return `<fieldset class="party-advance-base"><legend>${ctx.esc(ctx.label(base.name))}</legend>${rows}${going}</fieldset>`;
    })
    .join("");
  return `<p>${ctx.t("Turno delle basi", "Bases turn")} ${slice.turn} → <strong>${preview.turn}</strong> · ${preview.daysPerTurn} ${ctx.t("giorni di gioco per turno (regola del DM). L’orologio di gioco non avanza da solo.", "game days per turn (DM rule). The game clock does not advance by itself.")}</p>${
    blocks ||
    `<p class="muted">${ctx.t("Nessun ordine in corso: il turno avanza senza esiti.", "No orders in progress: the turn advances with no outcomes.")}</p>`
  }`;
}
export function readDecisions(data) {
  const decisions = {};
  for (const [key, value] of data.entries()) {
    const match = /^(text|deliver|recipient|gp)-(.+)$/.exec(key);
    if (!match) continue;
    const entry = (decisions[match[2]] ??= {});
    if (match[1] === "text") entry.text = String(value);
    if (match[1] === "recipient") entry.recipientId = String(value);
    if (match[1] === "gp") entry.gp = Number(value);
  }
  // An unchecked delivery box sends nothing: every completing item order not listed as
  // delivered is withheld.
  for (const key of Object.keys(decisions)) decisions[key].deliver = data.has(`deliver-${key}`);
  return decisions;
}

// ---------------------------------------------------------------- binding

// `api.commit(ctx, label, mutate(draft, slice), {privateBase})` is the party area's commit
// helper (it shows refusals and remembers the label for its Undo bar).
export function bindBases(el, ctx, api) {
  const state = () => ctx.state;
  const slice = () => api.slice(ctx.state);
  const baseName = (id) => {
    const base = slice().bases.find((b) => b.id === id);
    return base ? ctx.label(base.name) : "";
  };
  const privateOf = (id) => {
    const base = slice().bases.find((b) => b.id === id);
    return base ? isPrivateBase(state(), base) : false;
  };
  el.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-bastion]");
    if (!button || !el.contains(button)) return;
    const { base: baseId, facility, order, log } = button.dataset;
    const action = button.dataset.bastion;
    if (action === "order") {
      const base = slice().bases.find((b) => b.id === baseId);
      const f = base?.facilities.find((x) => x.id === facility);
      const def = f && facilityType(slice(), f.typeId)?.orders.find((o) => o.id === order);
      api.commit(
        ctx,
        ctx.t(
          `Ordine a ${baseName(baseId)}: ${ctx.label(def?.name ?? "")}`,
          `Order to ${baseName(baseId)}: ${ctx.label(def?.name ?? "")}`,
        ),
        (draft, s) =>
          issueOrder(draft, s, ctx.role, { baseId, facilityId: facility, orderId: order }),
        { privateBase: privateOf(baseId) },
      );
    }
    if (action === "cancel")
      api.commit(
        ctx,
        ctx.t(`Ordine annullato a ${baseName(baseId)}`, `Order cancelled at ${baseName(baseId)}`),
        (draft, s) => cancelOrder(draft, s, ctx.role, { baseId, orderId: order }),
        { privateBase: privateOf(baseId) },
      );
    if (action === "remove-facility")
      api.commit(
        ctx,
        ctx.t(
          `Struttura rimossa da ${baseName(baseId)}`,
          `Facility removed from ${baseName(baseId)}`,
        ),
        (draft, s) => removeFacility(draft, s, ctx.role, { baseId, facilityId: facility }),
        { privateBase: privateOf(baseId) },
      );
    if (action === "advance") openAdvance(ctx, api);
    if (action === "treasury")
      ctx.dialog(
        ctx.t("Correggi la cassa", "Correct the treasury"),
        `<p>${ctx.esc(baseName(baseId))}</p><label class="field">${ctx.t("Monete d’oro nella cassa", "Gold in the treasury")}<input type="number" name="amount" min="0" required value="${slice().bases.find((b) => b.id === baseId)?.treasury ?? 0}"></label><label class="field">${ctx.t("Motivo", "Reason")}<input name="reason" maxlength="200" required></label>`,
        {
          submitLabel: ctx.t("Correggi", "Correct"),
          onSubmit: (data) =>
            api.commit(
              ctx,
              ctx.t(
                `Cassa corretta: ${baseName(baseId)}`,
                `Treasury corrected: ${baseName(baseId)}`,
              ),
              (draft, s) =>
                correctTreasury(draft, s, ctx.role, {
                  baseId,
                  amount: Number(data.get("amount")),
                  reason: data.get("reason"),
                }),
              { throwInDialog: true },
            ),
        },
      );
    if (action === "correct-outcome") {
      const entry = slice()
        .bases.find((b) => b.id === baseId)
        ?.log.find((e) => e.id === log);
      ctx.dialog(
        ctx.t("Correggi l’esito", "Correct the outcome"),
        `<p>${ctx.esc(ctx.label(entry?.order ?? ""))}</p><label class="field">${ctx.t("Esito corretto", "Corrected outcome")}<textarea name="text" maxlength="600" required>${ctx.esc(entry?.corrections?.at(-1)?.note ?? entry?.note ?? "")}</textarea></label><label class="field">${ctx.t("Motivo", "Reason")}<input name="reason" maxlength="200" required></label><p class="muted">${ctx.t("La correzione si aggiunge al registro; l’esito originale resta consultabile nei dati.", "The correction is appended to the log; the original outcome stays in the record.")}</p>`,
        {
          submitLabel: ctx.t("Registra correzione", "Record correction"),
          onSubmit: (data) =>
            api.commit(
              ctx,
              ctx.t("Esito corretto", "Outcome corrected"),
              (draft, s) =>
                correctOutcome(draft, s, ctx.role, {
                  baseId,
                  logId: log,
                  text: data.get("text"),
                  reason: data.get("reason"),
                }),
              { throwInDialog: true },
            ),
        },
      );
    }
  });
  el.addEventListener("submit", (event) => {
    const form = event.target.closest?.("[data-bastion-form]");
    if (!form || !el.contains(form)) return;
    event.preventDefault();
    const data = new FormData(form);
    const kind = form.dataset.bastionForm;
    if (kind === "add-facility")
      api.commit(
        ctx,
        ctx.t(
          `Struttura aggiunta a ${baseName(form.dataset.base)}`,
          `Facility added to ${baseName(form.dataset.base)}`,
        ),
        (draft, s) =>
          addFacility(draft, s, ctx.role, {
            baseId: form.dataset.base,
            typeId: data.get("typeId"),
          }),
        { privateBase: privateOf(form.dataset.base) },
      );
    if (kind === "create-party-base")
      api.commit(
        ctx,
        ctx.t(
          `Base del gruppo creata: ${data.get("name")}`,
          `Party base created: ${data.get("name")}`,
        ),
        (draft, s) => createBase(draft, s, ctx.role, { name: data.get("name") }),
      );
    if (kind === "found") {
      const actor = ctx.state.actors[form.dataset.actor];
      api.commit(
        ctx,
        ctx.t(`Bastione fondato: ${data.get("name")}`, `Bastion founded: ${data.get("name")}`),
        (draft, s) =>
          createBase(draft, s, ctx.role, { name: data.get("name"), actorId: form.dataset.actor }),
        { privateBase: actor?.visibility === "private" },
      );
    }
    if (kind === "rules")
      api.commit(ctx, ctx.t("Regole delle basi aggiornate", "Bases rules updated"), (draft, s) =>
        setRules(draft, s, ctx.role, {
          minLevel: Number(data.get("minLevel")),
          daysPerTurn: Number(data.get("daysPerTurn")),
        }),
      );
    if (kind === "facility-type")
      api.commit(
        ctx,
        ctx.t(
          `Nuova struttura nelle regole: ${data.get("name")}`,
          `New facility in the rules: ${data.get("name")}`,
        ),
        (draft, s) => {
          const input = Object.fromEntries(data.entries());
          if (unitOf(ctx) === "imperial" && input.itemWeight !== undefined)
            input.itemWeight = U.poundsToKg(Number(input.itemWeight));
          addFacilityType(draft, s, ctx.role, input);
        },
      );
  });
}
export function openAdvance(ctx, api) {
  let body;
  try {
    body = advanceDialogBody(ctx, ctx.state, api.slice(ctx.state));
  } catch (error) {
    ctx.toast(ctx.label(error.it ? error : error.message), true);
    return;
  }
  const next = api.slice(ctx.state).turn + 1;
  ctx.dialog(ctx.t("Avanza il turno delle basi", "Advance the bases turn"), body, {
    submitLabel: ctx.t(`Avanza al turno ${next}`, `Advance to turn ${next}`),
    onSubmit: (data) => {
      let summary = null;
      // The campaign log names what completes (the base log keeps the details).
      const completing = previewTurn(ctx.state, api.slice(ctx.state), ctx.role)
        .bases.flatMap(({ completing: list }) => list)
        .map((order) => ctx.label(order.name));
      const what = completing.length ? `: ${completing.join(", ")}` : "";
      const done = api.commit(
        ctx,
        ctx.t(`Turno delle basi ${next}${what}`, `Bases turn ${next}${what}`),
        (draft, s) => {
          summary = advanceTurn(draft, s, ctx.role, readDecisions(data));
        },
        { throwInDialog: true },
      );
      if (done && summary)
        ctx.toast(
          ctx.t(
            `Turno ${summary.turn}: ${summary.completed} esiti nel registro.`,
            `Turn ${summary.turn}: ${summary.completed} outcomes in the log.`,
          ),
        );
    },
  });
}

// ---------------------------------------------------------------- open a Bastion (H-07)

/**
 * Characters this identity can read whose sheet has a Bastion tab (the DM's minimum level,
 * or a bastion already founded), as dnd5e shows the Bastion tab on those characters.
 */
export function bastionTargets(state, slice, viewer) {
  if (!slice) return [];
  return Object.values(state.actors ?? {}).filter(
    (actor) =>
      actor?.kind === "character" &&
      !actor.companion &&
      canViewActor(actor, viewer, state) &&
      (actor.level >= slice.rules.minLevel || Boolean(bastionOf(slice, actor.id))),
  );
}
/**
 * H-07 (palette «Apri un Bastione…», also from Home without a character): the sheet in view
 * when it has a Bastion; else the only character with one; else a picker of those characters
 * beside the party's «Basi e bastioni»; with none, that party page itself.
 */
export function openBastion(ctx, slice) {
  const open = (actorId) => ctx.navigate("characters", { id: actorId, tab: "party-bastion" });
  const bases = () => ctx.navigate("campaign", { tab: "group", id: "bases" });
  const targets = bastionTargets(ctx.state, slice, ctx.role);
  const here = ctx.view?.page === "characters" ? ctx.view.id : null;
  if (here && targets.some((actor) => actor.id === here)) return open(here);
  if (!targets.length) return bases();
  if (targets.length === 1) return open(targets[0].id);
  ctx.dialog(
    ctx.t("Apri un Bastione", "Open a Bastion"),
    `<p class="muted">${ctx.t("Scegli il personaggio, oppure apri le basi del gruppo.", "Choose the character, or open the party’s bases.")}</p><div class="bastion-pick" role="group" aria-label="${ctx.esc(ctx.t("Bastioni", "Bastions"))}">${targets
      .map((actor) => {
        const base = bastionOf(slice, actor.id);
        return `<button type="button" class="button" data-bastion-open="${ctx.esc(actor.id)}">${ctx.esc(actor.name)}${base ? ` · ${ctx.esc(ctx.label(base.name))}` : ` · ${ctx.t("nessuna base ancora", "no base yet")}`}</button>`;
      })
      .join(
        "",
      )}<button type="button" class="button quiet" data-bastion-open="">${ctx.t("Basi del gruppo", "Party bases")}</button></div>`,
    { cancelLabel: ctx.t("Chiudi", "Close") },
  );
  globalThis.document?.querySelectorAll?.("#dialog [data-bastion-open]").forEach((button) =>
    button.addEventListener("click", () => {
      ctx.closeDialog();
      if (button.dataset.bastionOpen) open(button.dataset.bastionOpen);
      else bases();
    }),
  );
}
