// B44 — bases and bastions: the generic facility tracker whose rules the DM authors
// (dnd5e Bastion tab FVT-037, Roll20 tracker R20-033). Domain only; synthetic data.
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import { makeIria } from "../character-library.mjs";
import { connectCharacterToCampaign } from "../character-access.mjs";
import { purseOf } from "../party-stash.mjs";
import * as B from "../bastions.mjs";

// Iria's canonical purse (B26 `actor.currency`): a character's bastion pays from it.
function world({ connect = false, gp = 40 } = {}) {
  const state = createInitialState();
  state.actors.iria = makeIria();
  if (gp !== null) state.actors.iria.currency = { gp };
  if (connect) connectCharacterToCampaign(state, "iria", "player");
  const slice = B.seedBastions();
  return { state, slice, base: () => slice.bases.find((b) => b.id === "bastion-iria") };
}
const refusal = (fn, pattern) =>
  assert.throws(fn, (error) => pattern.test(error.it) && typeof error.en === "string");
const gold = (state, id = "iria") => purseOf(state.actors[id]).gp;
const potions = (state) =>
  state.actors.iria.inventory.find((row) => row.name?.en === "Potion of healing")?.quantity;

test("seed: DM-authored sample rules, labelled as not from the DMG; normalize is idempotent", () => {
  const seed = B.seedBastions();
  assert.equal(seed.rules.source.kind, "authored");
  assert.equal(seed.rules.source.author, "dm");
  assert.match(seed.rules.source.note.it, /non nel SRD 5\.2\.1/);
  assert.equal(seed.rules.minLevel, 5);
  assert.equal(seed.turn, 0);
  const iria = seed.bases[0];
  assert.deepEqual(iria.owner, { kind: "character", actorId: "iria" });
  assert.equal("treasury" in iria, false, "a bastion is paid from its owner's purse");
  assert.deepEqual(
    iria.facilities.map((f) => f.typeId),
    ["records", "herb-workshop"],
  );
  const once = B.normalizeBastions(seed);
  assert.deepEqual(B.normalizeBastions(once), once);
  assert.deepEqual(B.normalizeBastions(null), B.seedBastions());
  // Tampered values fall back to safe ones.
  const bad = B.normalizeBastions({
    turn: -3,
    rules: {
      minLevel: 99,
      daysPerTurn: 0,
      facilityTypes: [{ id: "x", orders: [{ id: "o", cost: -1, turns: 0 }] }],
    },
    bases: [
      { id: "b", treasury: -5, owner: { kind: "weird" } },
      { id: "c", treasury: 12, owner: { kind: "character", actorId: "iria" } },
    ],
  });
  assert.equal(bad.turn, 0);
  assert.equal(bad.rules.minLevel, 5);
  assert.equal(bad.rules.daysPerTurn, 7);
  assert.equal(bad.rules.facilityTypes[0].orders[0].cost, 0);
  assert.equal(bad.rules.facilityTypes[0].orders[0].turns, 1);
  assert.equal(bad.bases[0].treasury, 0);
  assert.deepEqual(bad.bases[0].owner, { kind: "party" });
  assert.equal("treasury" in bad.bases[1], false, "no second money pool beside the purse");
});

test("a private sheet's bastion: only its owner reads it, the DM cannot run its turn", () => {
  const { state, slice, base } = world();
  assert.equal(B.canReadBase(state, base(), "player"), true);
  assert.equal(B.canManageBase(state, base(), "player"), true);
  assert.equal(B.canReadBase(state, base(), "dm"), false);
  assert.equal(B.inPlay(state, base()), false);
  assert.equal(B.isPrivateBase(state, base()), true);
  assert.deepEqual(B.visibleBases(state, slice, "dm"), []);
  // The player can still plan an order; it waits until the sheet joins the campaign.
  B.issueOrder(state, slice, "player", {
    baseId: "bastion-iria",
    facilityId: "iria-workshop",
    orderId: "distil-healing",
  });
  const preview = B.previewTurn(state, slice, "dm");
  assert.equal(preview.bases.length, 0);
  B.advanceTurn(state, slice, "dm", {});
  assert.equal(base().orders[0].status, "pending");
  assert.equal(base().orders[0].remaining, 1);
  assert.equal(potions(state), 1);
  refusal(
    () =>
      B.issueOrder(state, slice, "dm", {
        baseId: "bastion-iria",
        facilityId: "iria-records",
        orderId: "search-records",
      }),
    /Base non trovata/,
  );
});

test("order with a cost, the DM advances the turn, the outcome is logged and the item reaches the sheet", () => {
  const { state, slice, base } = world({ connect: true });
  assert.equal(B.inPlay(state, base()), true);
  assert.equal(B.canReadBase(state, base(), "dm"), true);
  const order = B.issueOrder(state, slice, "player", {
    baseId: "bastion-iria",
    facilityId: "iria-workshop",
    orderId: "distil-healing",
  });
  assert.equal(gold(state), 15, "dnd5e: the craft order's cost leaves Iria's purse");
  assert.equal(order.remaining, 1);
  refusal(
    () =>
      B.issueOrder(state, slice, "player", {
        baseId: "bastion-iria",
        facilityId: "iria-workshop",
        orderId: "distil-healing",
      }),
    /già eseguendo/,
  );
  B.issueOrder(state, slice, "player", {
    baseId: "bastion-iria",
    facilityId: "iria-records",
    orderId: "search-records",
  });
  assert.equal(gold(state), 10);
  // Only the DM advances; the preview proposes each completing order.
  refusal(() => B.advanceTurn(state, slice, "player", {}), /Solo il DM/);
  const preview = B.previewTurn(state, slice, "dm");
  assert.equal(preview.turn, 1);
  assert.equal(preview.bases[0].completing.length, 2);
  const records = base().orders.find((o) => o.orderId === "search-records");
  const result = B.advanceTurn(state, slice, "dm", {
    [order.id]: { deliver: true, text: "" },
    [records.id]: { text: "Una rotta di contrabbandieri passa sotto il faro." },
  });
  assert.deepEqual(result, { turn: 1, completed: 2 });
  assert.equal(slice.turn, 1);
  assert.equal(potions(state), 2, "the crafted potion joins Iria's existing row");
  const outcomes = base().log.filter((e) => e.kind === "outcome");
  assert.equal(outcomes.length, 2);
  assert.equal(outcomes[0].item.actorId, "iria");
  assert.equal(outcomes[1].note, "Una rotta di contrabbandieri passa sotto il faro.");
  assert.ok(base().orders.every((o) => o.status === "completed" && o.completedTurn === 1));
  // A completed facility takes a new order.
  B.issueOrder(state, slice, "player", {
    baseId: "bastion-iria",
    facilityId: "iria-records",
    orderId: "search-records",
  });
  assert.equal(gold(state), 5);
  refusal(
    () =>
      B.issueOrder(state, slice, "player", {
        baseId: "bastion-iria",
        facilityId: "iria-workshop",
        orderId: "distil-healing",
      }),
    /Monete insufficienti: servono 25 mo, Iria ha 5 mo/,
  );
  assert.equal(gold(state), 5, "a refused order spends nothing");
});

test("DM discretion: an item can be withheld, gold changed, a two-turn order continues", () => {
  const { state, slice, base } = world({ connect: true });
  B.addFacility(state, slice, "player", { baseId: "bastion-iria", typeId: "market-stall" });
  refusal(
    () => B.addFacility(state, slice, "player", { baseId: "bastion-iria", typeId: "market-stall" }),
    /già questa struttura/,
  );
  const stall = base().facilities.find((f) => f.typeId === "market-stall");
  const sale = B.issueOrder(state, slice, "player", {
    baseId: "bastion-iria",
    facilityId: stall.id,
    orderId: "sell-goods",
  });
  const potion = B.issueOrder(state, slice, "player", {
    baseId: "bastion-iria",
    facilityId: "iria-workshop",
    orderId: "distil-healing",
  });
  assert.equal(gold(state), 5);
  B.advanceTurn(state, slice, "dm", {
    [potion.id]: { deliver: false, text: "Gli alambicchi si sono incrinati." },
  });
  assert.equal(potions(state), 1, "no potion when the DM withholds it");
  assert.equal(
    base().log.find((e) => e.orderId === potion.id && e.kind === "outcome").withheld.name.it,
    "Pozione di guarigione",
  );
  assert.equal(base().orders.find((o) => o.id === sale.id).status, "pending");
  assert.equal(B.previewTurn(state, slice, "dm").bases[0].completing[0].id, sale.id);
  refusal(() => B.advanceTurn(state, slice, "dm", { [sale.id]: { gp: -2 } }), /Scrivi le monete/);
  B.advanceTurn(state, slice, "dm", { [sale.id]: { gp: 24 } });
  assert.equal(gold(state), 29, "the sale's gold reaches Iria's purse");
  assert.equal(base().log.at(-1).coinsTo.actorId, "iria");
  assert.equal(slice.turn, 2);
});

test("cancel refunds; corrections need a reason and are appended, never rewritten", () => {
  const { state, slice, base } = world({ connect: true });
  const order = B.issueOrder(state, slice, "player", {
    baseId: "bastion-iria",
    facilityId: "iria-records",
    orderId: "search-records",
  });
  B.cancelOrder(state, slice, "player", { baseId: "bastion-iria", orderId: order.id });
  assert.equal(gold(state), 40, "the refund goes back to the purse");
  assert.equal(base().orders[0].status, "cancelled");
  refusal(
    () => B.cancelOrder(state, slice, "player", { baseId: "bastion-iria", orderId: order.id }),
    /non in corso/,
  );
  const again = B.issueOrder(state, slice, "player", {
    baseId: "bastion-iria",
    facilityId: "iria-records",
    orderId: "search-records",
  });
  B.advanceTurn(state, slice, "dm", { [again.id]: { text: "Nulla." } });
  const entry = base().log.find((e) => e.kind === "outcome");
  refusal(
    () =>
      B.correctOutcome(state, slice, "player", {
        baseId: "bastion-iria",
        logId: entry.id,
        text: "x",
        reason: "y",
      }),
    /Solo il DM/,
  );
  refusal(
    () =>
      B.correctOutcome(state, slice, "dm", {
        baseId: "bastion-iria",
        logId: entry.id,
        text: "Una mappa.",
        reason: " ",
      }),
    /motivo/,
  );
  B.correctOutcome(state, slice, "dm", {
    baseId: "bastion-iria",
    logId: entry.id,
    text: "Una mappa.",
    reason: "Dimenticata al tavolo",
  });
  assert.equal(entry.note, "Nulla.");
  assert.equal(entry.corrections.at(-1).note, "Una mappa.");
  // A bastion has no coffers of its own: its coins are corrected on the sheet (B26).
  refusal(
    () =>
      B.correctTreasury(state, slice, "dm", {
        baseId: "bastion-iria",
        amount: 50,
        reason: "Rendita del faro",
      }),
    /Inventario › Monete/,
  );
  const tower = B.createBase(state, slice, "dm", { name: "Torre" });
  refusal(
    () => B.correctTreasury(state, slice, "dm", { baseId: tower.id, amount: 50, reason: "" }),
    /motivo/,
  );
  B.correctTreasury(state, slice, "dm", {
    baseId: tower.id,
    amount: 50,
    reason: "Fondi del consiglio",
  });
  assert.equal(tower.treasury, 50);
  const log = tower.log.at(-1);
  assert.deepEqual(
    [log.kind, log.from, log.to, log.reason],
    ["treasury", 0, 50, "Fondi del consiglio"],
  );
});

test("founding and managing bases, the DM's rules and the party base's recipient", () => {
  const { state, slice } = world({ connect: true });
  refusal(() => B.createBase(state, slice, "player", { name: "Torre" }), /Solo il DM/);
  const tower = B.createBase(state, slice, "dm", { name: "Torre dell’osservatorio" });
  assert.deepEqual(tower.owner, { kind: "party" });
  assert.equal(B.canReadBase(state, tower, "player"), true);
  assert.equal(B.canManageBase(state, tower, "player"), false);
  assert.equal(B.canOrderBase(state, tower, "player"), true);
  refusal(
    () => B.createBase(state, slice, "player", { name: "Rifugio", actorId: "livia" }),
    /dal livello 5/,
  );
  refusal(
    () => B.createBase(state, slice, "player", { name: "Altro", actorId: "iria" }),
    /già un bastione/,
  );
  refusal(() => B.createBase(state, slice, "dm", { name: "" }), /nome/);
  refusal(() => B.setRules(state, slice, "player", { minLevel: 3, daysPerTurn: 7 }), /Solo il DM/);
  refusal(
    () => B.setRules(state, slice, "dm", { minLevel: 0, daysPerTurn: 7 }),
    /Livello da 1 a 20/,
  );
  B.setRules(state, slice, "dm", { minLevel: 3, daysPerTurn: 10 });
  const livia = B.createBase(state, slice, "player", {
    name: "Rifugio di Livia",
    actorId: "livia",
  });
  assert.equal(livia.owner.actorId, "livia");
  const type = B.addFacilityType(state, slice, "dm", {
    name: "Officina",
    orderName: "Forgia una lanterna",
    cost: "12",
    turns: "1",
    outcomeKind: "item",
    itemName: "Lanterna di Bruma",
    itemWeight: "1",
  });
  assert.equal(type.orders[0].outcome.item.name.it, "Lanterna di Bruma");
  refusal(
    () =>
      B.addFacilityType(state, slice, "dm", { name: "X", orderName: "Y", cost: "-1", turns: "1" }),
    /Costo/,
  );
  refusal(
    () => B.addFacility(state, slice, "player", { baseId: tower.id, typeId: type.id }),
    /Non puoi modificare/,
  );
  const workshop = B.addFacility(state, slice, "dm", { baseId: tower.id, typeId: type.id });
  refusal(
    () =>
      B.issueOrder(state, slice, "player", {
        baseId: tower.id,
        facilityId: workshop.id,
        orderId: type.orders[0].id,
      }),
    /Cassa insufficiente/,
  );
  B.correctTreasury(state, slice, "dm", {
    baseId: tower.id,
    amount: 20,
    reason: "Fondi del consiglio",
  });
  const order = B.issueOrder(state, slice, "player", {
    baseId: tower.id,
    facilityId: workshop.id,
    orderId: type.orders[0].id,
  });
  refusal(
    () => B.removeFacility(state, slice, "dm", { baseId: tower.id, facilityId: workshop.id }),
    /ordine in corso/,
  );
  const recipients = B.previewTurn(state, slice, "dm").bases.find(
    (b) => b.base.id === tower.id,
  ).recipients;
  assert.ok(["doran", "livia", "mira", "iria"].every((id) => recipients.some((a) => a.id === id)));
  B.advanceTurn(state, slice, "dm", { [order.id]: { deliver: true, recipientId: "mira" } });
  assert.equal(
    state.actors.mira.inventory.find((i) => i.name.it === "Lanterna di Bruma").quantity,
    1,
  );
  B.removeFacility(state, slice, "dm", { baseId: tower.id, facilityId: workshop.id });
  assert.equal(tower.facilities.length, 0);
});

test("readDecisions reads the advance dialog: unchecked delivery means withheld", () => {
  const data = new FormData();
  data.append("text-o1", "Esito");
  data.append("deliver-o2", "on");
  data.append("text-o2", "");
  data.append("recipient-o2", "mira");
  data.append("gp-o3", "12");
  const decisions = B.readDecisions(data);
  assert.deepEqual(decisions.o1, { text: "Esito", deliver: false });
  assert.deepEqual(decisions.o2, { deliver: true, text: "", recipientId: "mira" });
  assert.deepEqual(decisions.o3, { gp: 12, deliver: false });
});

test("review: a bastion without recorded coins points to the sheet's purse; a free order still runs", () => {
  const { state, slice, base } = world({ connect: true, gp: null });
  refusal(
    () =>
      B.issueOrder(state, slice, "player", {
        baseId: "bastion-iria",
        facilityId: "iria-records",
        orderId: "search-records",
      }),
    /Monete insufficienti: servono 5 mo, Iria ha 0 mo.*Inventario › Monete/,
  );
  assert.equal(state.actors.iria.currency, undefined, "a refusal writes no purse");
  B.addFacility(state, slice, "player", { baseId: "bastion-iria", typeId: "beacon" });
  const beacon = base().facilities.find((f) => f.typeId === "beacon");
  B.issueOrder(state, slice, "player", {
    baseId: "bastion-iria",
    facilityId: beacon.id,
    orderId: "watch-coast",
  });
  assert.equal(state.actors.iria.currency, undefined, "a 0 gp order touches no purse");
  // Mixed coins: the change comes back in smaller coins (B26 spendCp).
  state.actors.iria.currency = { sp: 70 };
  B.issueOrder(state, slice, "player", {
    baseId: "bastion-iria",
    facilityId: "iria-records",
    orderId: "search-records",
  });
  assert.equal(purseOf(state.actors.iria).sp, 20);
});
