// B36 — deep inventory. Real store and registry (seed, commit, Undo, reload) with the B26 loot
// area loaded (its identify record and purse), the same handler the bound controls call and
// the combat/speed hooks. Synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import { advanceGameTime } from "../rest-time.mjs";
import { listActions, previewAction, beginAttempt } from "../combat.mjs";
import { getEffectiveSpeed } from "../forms-companions.mjs";
import { identifyItem } from "../party-stash.mjs";
import * as loot from "../loot.mjs";
import * as inv from "../inventory-plus.mjs";
import * as D from "../inventory-plus-domain.mjs";

function memory() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
function form(fields = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields))
    for (const entry of [].concat(value)) data.append(key, String(entry));
  return data;
}
function harness({ role = "player", lang = "it", setup = null } = {}) {
  const storage = memory();
  const emitted = [];
  const boot = () => {
    const registry = createRegistry();
    registry.use("loot", loot.register);
    registry.use("inventory-plus", inv.register);
    registry.on("roll-accepted", (payload) => emitted.push(payload));
    const store = createStore({ storage });
    setup?.(store.state);
    if (registry.initState(store.state).changed) store.persist();
    return { registry, store };
  };
  let { registry, store } = boot();
  const toasts = [],
    dialogs = [];
  let faces = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    view: { page: "characters", id: "livia", tab: "inventory" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object"
        ? (value[ctx.lang] ?? value.it ?? value.en ?? "")
        : String(value ?? ""),
    esc,
    icon: () => "",
    rollDie: (sides) => faces.shift() ?? sides,
    toast: (text, error = false) => toasts.push({ text, error }),
    dialog: (title, body, options = {}) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {
      ctx.rendered = (ctx.rendered ?? 0) + 1;
    },
    openRest(id) {
      ctx.openedRest = id;
    },
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    canUndo: () => store.history.at(-1)?.controller === ctx.role,
    undoLabel: () => store.history.at(-1)?.label ?? "",
    commit(label, mutator, options = {}) {
      if (ctx.offline && !options.local)
        throw Object.assign(Error("You are offline"), {
          it: "Sei senza rete: questa modifica condivisa non può essere applicata.",
          en: "You are offline: this shared change cannot be applied.",
        });
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      if (options.afterCommit) {
        options.afterCommit(store.state);
        store.persist();
      }
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(ctx.role);
      registry.afterUndo(current, store.state);
      store.persist();
    },
  };
  Object.defineProperty(ctx, "registry", { get: () => registry });
  registry.attach?.(ctx);
  return {
    ctx,
    toasts,
    dialogs,
    emitted,
    get store() {
      return store;
    },
    get slice() {
      return store.state.ext[D.ID];
    },
    livia: () => store.state.actors.livia,
    doran: () => store.state.actors.doran,
    row: (actorId, rowId) => D.rowById(store.state.actors[actorId], rowId),
    faces(values) {
      faces = [...values];
    },
    reload() {
      ({ registry, store } = boot());
    },
    submit(fields) {
      const dialog = dialogs.at(-1);
      assert.ok(dialog, "no dialog open");
      return dialog.options.onSubmit(form(fields));
    },
    run: (action, id = null, actorId = "livia", event = null) =>
      inv.handleInventoryAction(ctx, actorId, action, id, event),
    as(value) {
      ctx.role = value;
      return this;
    },
  };
}
const errors = (h) => h.toasts.filter((row) => row.error).map((row) => row.text);
const advanceHours = (h, hours) => {
  const role = h.ctx.role;
  h.ctx.role = "dm";
  h.ctx.commit("Tempo narrativo", (s) =>
    advanceGameTime(
      s,
      {
        id: "adv-" + Math.random().toString(36).slice(2),
        campaignId: "lanterns",
        seconds: hours * 3600,
      },
      "dm",
    ),
  );
  h.ctx.role = role;
};

test("seed adds coherent sample rows once and hides the ring through B26's own record", () => {
  const h = harness();
  const ids = h.livia().inventory.map((row) => row.id);
  for (const id of [
    "invp-bag",
    "invp-backpack",
    "invp-arrows",
    "invp-wand",
    "invp-staff-fire",
    "invp-ring",
  ])
    assert.ok(ids.includes(id), id);
  assert.equal(new Set(ids).size, ids.length, "no duplicated rows");
  const ring = h.row("livia", "invp-ring");
  assert.equal(ring.unidentified, true);
  assert.equal(ring.name.it, "Anello d’argento inciso");
  assert.equal(ring.attunement, undefined, "attunement hidden from the player");
  assert.equal(ring.rarity, undefined);
  const secret = h.store.state.ext.loot.secrets[ring.lootId];
  assert.equal(secret.name.en, "Ring of Protection");
  assert.deepEqual(secret.fields.attunement, { required: true, by: null });
  assert.equal(h.doran().weaponSets.ranged, "invp-doran-longbow");
  assert.equal(h.slice.currencies[0].id, "bruma-scale");
  h.reload();
  assert.equal(
    h.livia().inventory.filter((r) => r.id === "invp-bag").length,
    1,
    "reload keeps one bag",
  );
});

test("containers: backpack inside the Bag of Holding is excluded; capacity exceeded is flagged", () => {
  const h = harness();
  const before = D.carriedWeight(h.livia(), h.store.state).kg;
  h.run("move", "invp-backpack");
  h.submit({ target: "self:invp-bag", quantity: 1, mode: "move" });
  assert.equal(h.row("livia", "invp-backpack").containerId, "invp-bag");
  const after = D.carriedWeight(h.livia(), h.store.state).kg;
  assert.equal(
    Math.round((before - after) * 100) / 100,
    7.5,
    "backpack 2.5 kg + 5 kg contents excluded",
  );
  assert.match(inv.renderTab(h.ctx, h.livia()), /Peso escluso: pesa sempre 2,5 kg/);
  // The lens crate goes in the backpack, now inside the bag: 25/15 kg, flagged, still excluded.
  h.run("move", "invp-crate");
  h.submit({ target: "self:invp-backpack", quantity: 1, mode: "move" });
  const cap = D.capacityOf(h.livia(), h.row("livia", "invp-backpack"));
  assert.equal(cap.over, true);
  assert.equal(cap.used, 25);
  assert.match(inv.renderTab(h.ctx, h.livia()), /data-invp-over>Capacità superata/);
  assert.equal(D.carriedWeight(h.livia(), h.store.state).kg, Math.round((after - 20) * 100) / 100);
  // Rules: no cycle, no bag inside another extradimensional space, depth ≤ 5.
  const livia = h.livia();
  assert.match(
    D.moveIssues(livia, h.row("livia", "invp-bag"), "invp-backpack")[0].it,
    /dentro sé stesso/,
  );
  const s = structuredClone(h.store.state);
  s.actors.livia.inventory.push({
    id: "bag2",
    name: "Bag",
    quantity: 1,
    weight: 2.5,
    container: { capacityKg: 250, fixedWeight: true, extradimensional: true },
  });
  assert.match(
    D.moveIssues(s.actors.livia, D.rowById(s.actors.livia, "bag2"), "invp-bag")[0].it,
    /spazio extradimensionale/,
  );
  // Undo restores the previous placement.
  h.ctx.undo();
  assert.equal(h.row("livia", "invp-crate").containerId, undefined);
});

test("variant encumbrance slows the Table speed with its reason; standard SRD does not", () => {
  const h = harness();
  assert.equal(D.encumbranceOf(h.livia(), h.store.state).status, "none");
  assert.equal(getEffectiveSpeed(h.livia()), 9);
  h.ctx.commit("x", (s) => D.setEncumbrance(s, "livia", { mode: "variant" }, "player"));
  const load = D.encumbranceOf(h.livia(), h.store.state);
  assert.equal(load.status, "encumbered");
  assert.equal(load.source.kind, "house-rule");
  assert.match(load.reason.it, /For × 2,5 kg \(25 kg\)\. Velocità −3 m/);
  assert.equal(getEffectiveSpeed(h.livia()), 6, "forms-companions speed hook");
  // Putting the crate in the bag removes the load.
  h.ctx.commit("x", (s) => D.moveWithin(s, "livia", "invp-crate", "invp-bag", 1, "player"));
  assert.equal(getEffectiveSpeed(h.livia()), 9);
  // Standard 2024: over carrying capacity caps Speed at 1.5 m.
  const s = structuredClone(h.store.state);
  s.actors.livia.encumbrance = { mode: "standard" };
  s.actors.livia.inventory.push({ id: "anvil", name: "Anvil", quantity: 1, weight: 60 });
  assert.equal(D.encumbranceOf(s.actors.livia, s).status, "over");
  assert.equal(getEffectiveSpeed(s.actors.livia), 1.5);
  s.actors.livia.encumbrance = { mode: "off" };
  assert.equal(getEffectiveSpeed(s.actors.livia), 9);
});

test("split 20 arrows; the player's move to Doran is an offer, copy is DM only; DM accepts", () => {
  const h = harness();
  h.run("split", "invp-arrows");
  h.submit({ quantity: 8 });
  const stacks = h.livia().inventory.filter((row) => row.ammunition === "arrow");
  assert.deepEqual(
    stacks.map((row) => row.quantity),
    [12, 8],
  );
  const part = stacks[1];
  assert.throws(
    () => h.ctx.commit("x", (s) => D.copyItem(s, "livia", "doran", part.id, 5, "player")),
    /Only the DM copies/,
  );
  h.run("move", part.id);
  assert.match(h.dialogs.at(-1).body, /value="copy" disabled/);
  h.submit({ target: "actor:doran", quantity: 8, mode: "move" });
  const offer = h.slice.offers.at(-1);
  assert.equal(offer.status, "pending");
  assert.equal(offer.to, "doran");
  assert.equal(h.row("livia", part.id).quantity, 8, "nothing reserved before acceptance");
  assert.match(h.toasts.at(-1).text, /Offerta inviata a Doran/);
  // The player cannot accept for Doran; the DM (Doran's controller) can.
  h.run("offer-accept", offer.id, "doran");
  assert.ok(errors(h).at(-1).includes("Non controlli"));
  h.as("dm").run("offer-accept", offer.id, "doran");
  assert.equal(h.slice.offers.at(-1).status, "accepted");
  assert.equal(h.row("livia", part.id), null);
  assert.equal(h.doran().inventory.find((row) => row.ammunition === "arrow").quantity, 8);
  // DM copy creates 5 more on Doran (stacked).
  h.run("move", "invp-arrows");
  h.submit({ target: "actor:doran", quantity: 5, mode: "copy" });
  assert.equal(h.doran().inventory.find((row) => row.ammunition === "arrow").quantity, 13);
  assert.equal(h.row("livia", "invp-arrows").quantity, 12, "a copy leaves the source intact");
});

test("an offer is revalidated: changed quantities make it unacceptable; withdraw and decline", () => {
  const h = harness();
  h.ctx.commit("x", (s) =>
    D.createOffer(
      s,
      "livia",
      "doran",
      { items: [{ rowId: "invp-arrows", quantity: 15 }] },
      "player",
    ),
  );
  const offer = h.slice.offers.at(-1);
  h.ctx.commit("x", (s) =>
    D.correctQuantity(s, "livia", "invp-arrows", 10, "Perse nel fiume", "player"),
  );
  assert.match(D.offerProblems(h.store.state, offer)[0].it, /15 offerti, 10 disponibili/);
  h.as("dm").run("offer-accept", offer.id, "doran");
  assert.match(errors(h).at(-1), /Non più accettabile/);
  h.as("player").run("offer-withdraw", offer.id, "livia");
  assert.equal(h.slice.offers.at(-1).status, "withdrawn");
  h.ctx.commit("x", (s) =>
    D.createOffer(
      s,
      "livia",
      "doran",
      { items: [{ rowId: "invp-arrows", quantity: 2 }] },
      "player",
    ),
  );
  h.as("dm").run("offer-decline", h.slice.offers.at(-1).id, "doran");
  assert.equal(h.slice.offers.at(-1).status, "declined");
  assert.equal(h.row("livia", "invp-arrows").quantity, 10);
});

test("coins: convert with change, custom currency, into a container, offer to Doran accepted", () => {
  const h = harness();
  h.run("coins-convert");
  h.submit({ from: "cp", to: "sp", amount: 120 });
  assert.deepEqual(h.livia().currency, { pp: 0, gp: 30, ep: 0, sp: 57, cp: 0 });
  h.run("coins-convert");
  h.submit({ from: "sp", to: "gp", amount: 57 });
  assert.deepEqual(h.livia().currency, { pp: 0, gp: 35, ep: 0, sp: 7, cp: 0 });
  h.run("coins-convert");
  h.submit({ from: "bruma-scale", to: "gp", amount: 12 });
  assert.equal(h.livia().customCoins["bruma-scale"], 0);
  assert.deepEqual(
    h.livia().currency,
    { pp: 0, gp: 37, ep: 0, sp: 11, cp: 0 },
    "240 cp = 2 gp + 4 sp",
  );
  assert.equal(D.previewConversion(h.store.state, h.livia(), "gp", "pp", 5).ok, false);
  h.run("container-coins", "invp-backpack");
  h.submit({ direction: "in", gp: 10 });
  assert.equal(h.row("livia", "invp-backpack").container.coins.gp, 10);
  assert.equal(h.livia().currency.gp, 27);
  assert.match(inv.renderTab(h.ctx, h.livia()), /data-invp-container-coins="invp-backpack">10 mo/);
  h.run("coins-give");
  h.submit({ to: "doran", gp: 5 });
  const offer = h.slice.offers.at(-1);
  assert.deepEqual(offer.coins.gp, 5);
  h.as("dm").run("offer-accept", offer.id, "doran");
  assert.equal(h.doran().currency.gp, 5);
  assert.equal(h.livia().currency.gp, 22);
});

test("attunement: three slots, the fourth refused with the SRD reason; DM identifies the ring", () => {
  const h = harness();
  assert.equal(D.attunedRows(h.livia()).length, 2);
  h.run("attune", "invp-amulet");
  assert.throws(() => h.submit({ method: "record", reason: "" }), /reason/);
  h.submit({ method: "record", reason: "Riposo breve alla torre, sessione 12" });
  assert.equal(D.attunedRows(h.livia()).length, 3);
  // The player cannot identify; the DM does it with B26's record, which restores our fields.
  assert.throws(
    () =>
      h.ctx.commit("x", (s) =>
        identifyItem(s, s.ext.loot, "player", h.row("livia", "invp-ring").lootId),
      ),
    /Only the DM/,
  );
  h.as("dm").run("identify", "invp-ring");
  const ring = h.row("livia", "invp-ring");
  assert.equal(ring.unidentified, undefined);
  assert.equal(ring.name.en, "Ring of Protection");
  assert.deepEqual(ring.attunement, { required: true, by: null });
  h.as("player").run("attune", "invp-ring");
  assert.match(h.dialogs.at(-1).body, /data-invp-attune-warning>Il tentativo fallisce/);
  assert.throws(
    () => h.submit({ method: "record", reason: "Provo" }),
    /already attuned to 3 items/,
  );
  h.run("unattune", "invp-cloak");
  h.submit({ method: "record", reason: "Riposo breve per lasciare il mantello" });
  h.run("attune", "invp-ring");
  h.submit({ method: "record", reason: "Riposo breve dedicato all’anello" });
  assert.equal(h.row("livia", "invp-ring").attuned, true);
  // Class prerequisite: Doran (Fighter) cannot attune to a Staff of Fire.
  const staff = structuredClone(h.row("livia", "invp-staff-fire"));
  delete staff.attuned;
  assert.match(D.attuneIssues(h.doran(), staff)[0].it, /Richiede sintonia da parte di/);
});

test("dawn recharge from the campaign clock with physical or digital dice; Undo reuses faces", () => {
  const h = harness();
  assert.equal(D.pendingDawns(h.store.state, h.row("livia", "invp-wand")), 0);
  advanceHours(h, 22); // 08:00 → 06:00 next day: one dawn
  assert.equal(D.pendingDawns(h.store.state, h.row("livia", "invp-wand")), 1);
  assert.ok(inv.collectNotifications(h.ctx).some((n) => n.id.startsWith("invp-recharge-livia")));
  h.run("recharge", "invp-wand");
  assert.throws(() => h.submit({ mode: "physical", face0: 9 }), /d6 faces/);
  h.faces([4]);
  h.submit({ mode: "digital" });
  assert.equal(h.row("livia", "invp-wand").charges.value, 7, "3 + (4 + 1), capped at 7");
  assert.equal(h.emitted.at(-1).roll.values[0], 4);
  assert.ok(h.store.state.log.at(-1).rolls?.length, "roll joins the log entry");
  h.ctx.undo();
  assert.equal(h.row("livia", "invp-wand").charges.value, 3);
  h.faces([1]);
  h.run("recharge", "invp-wand");
  h.submit({ mode: "digital" });
  assert.equal(h.row("livia", "invp-wand").charges.value, 7, "withdrawn face 4 reused, not 1");
});

test("activities: Staff of Fire has three with a usage dialog; wand scales; last charge d20", () => {
  const h = harness();
  h.run("use", "invp-staff-fire");
  const body = h.dialogs.at(-1).body;
  assert.equal((body.match(/name="activity"/g) ?? []).length, 3);
  assert.match(body, /Mani brucianti/);
  assert.match(body, /Palla di fuoco/);
  assert.match(body, /Muro di fuoco/);
  h.faces([1, 2, 3, 4, 5, 6, 1, 2]);
  h.submit({ activity: "fireball", consume: "on", mode: "digital" });
  assert.equal(h.row("livia", "invp-staff-fire").charges.value, 7);
  const roll = h.emitted.at(-1).roll;
  assert.equal(roll.total, 24);
  assert.deepEqual(roll.dice, [{ count: 8, sides: 6 }]);
  assert.match(h.toasts.at(-1).text, /TS CD 13/);
  // Shift+click opens the usage dialog on the primary activity.
  h.run("use", "invp-staff-fire", "livia", { shiftKey: true });
  assert.match(h.dialogs.at(-1).body, /value="burning-hands" checked/);
  // Wand: 2 charges = level 2 = four darts, 4d4 + 4, physical faces.
  const p = D.previewActivity(
    h.store.state,
    h.livia(),
    h.row("livia", "invp-wand"),
    "magic-missile",
    { charges: 2 },
  );
  assert.deepEqual([p.level, p.dice.count, p.modifier], [2, 4, 4]);
  h.run("use", "invp-wand");
  h.submit({
    activity: "magic-missile",
    charges: 3,
    consume: "on",
    mode: "physical",
    face0: 1,
    face1: 2,
    face2: 3,
    face3: 4,
    face4: 1,
  });
  const wand = h.row("livia", "invp-wand");
  assert.equal(wand.charges.value, 0);
  assert.equal(wand.charges.lastCharge, "pending");
  assert.equal(h.emitted.at(-1).roll.total, 16, "5 darts: 11 + 5");
  h.run("use", "invp-wand");
  assert.throws(
    () => h.submit({ activity: "magic-missile", charges: 1, consume: "on" }),
    /charges|d20/,
  );
  h.run("last-charge", "invp-wand");
  h.submit({ mode: "physical", face0: 1 });
  assert.equal(h.row("livia", "invp-wand"), null, "a 1 destroys the wand");
});

test("equip restriction explained (BG3); weapon-set swap; Doran's swap puts the shield away (P4 PG-74)", () => {
  const h = harness();
  h.run("equip", "invp-shortbow");
  assert.match(
    errors(h).at(-1),
    /Arco corto richiede due mani quando attacchi: hai già in mano Bastone/,
  );
  assert.equal(h.row("livia", "invp-shortbow").equipped, false);
  h.run("swap");
  assert.equal(h.row("livia", "invp-shortbow").equipped, true);
  assert.equal(h.row("livia", "staff").equipped, false);
  assert.equal(h.livia().weaponSets.active, "ranged");
  // PG-74 (BG3 one-button swap): the Shield that blocks the two-handed longbow is put away
  // by the same command, never refused with a pointer to the button just pressed.
  const before = errors(h).length;
  h.as("dm").run("swap", null, "doran");
  assert.equal(errors(h).length, before, "no refusal");
  assert.equal(h.row("doran", "invp-doran-longbow").equipped, true);
  assert.equal(h.row("doran", "invp-doran-shield").equipped, false);
});

test("a bow attack expends one arrow (FVT-140); half is recovered after the fight (SRD)", () => {
  const h = harness();
  h.run("swap");
  const s = h.store.state;
  assert.ok(listActions(s, "livia").some((a) => a.id === "invp-ranged-invp-shortbow"));
  h.ctx.commit("start", (draft) => {
    draft.combat = {
      active: true,
      round: 1,
      turn: 0,
      order: ["livia", "goblin-1"],
      encounterId: "enc-1",
    };
  });
  const actionId = D.rangedActionId("invp-shortbow");
  const preview = previewAction(
    h.store.state,
    "livia",
    actionId,
    { targetIds: ["goblin-1"] },
    "player",
  );
  assert.equal(preview.available, true, JSON.stringify(preview.reasons));
  assert.equal(preview.action.attackModifier, 4, "Dex +2 and Wizard Simple weapons +2");
  for (const id of ["a1", "a2", "a3"])
    h.ctx.commit("Attacco", (draft) => {
      beginAttempt(
        draft,
        {
          id,
          actorId: "livia",
          actionId,
          selection: { targetIds: ["goblin-1"] },
          mode: "physical",
        },
        "player",
      );
      draft.actors.livia.action = true; // test only: three attacks without new turns
      draft.combatAttempts = [];
    });
  assert.equal(h.row("livia", "invp-arrows").quantity, 17);
  assert.equal(D.ammoRecovery(h.store.state, "livia"), null, "not during the fight");
  h.ctx.commit("end", (draft) => {
    draft.combat.active = false;
  });
  const recovery = D.ammoRecovery(h.store.state, "livia");
  assert.deepEqual(
    [recovery.rows[0].used, recovery.rows[0].recover, recovery.rows[0].lost],
    [3, 1, 2],
  );
  h.run("recover");
  assert.equal(h.row("livia", "invp-arrows").quantity, 18);
  assert.equal(D.ammoRecovery(h.store.state, "livia"), null);
  // No arrows: the Table preview explains why.
  h.ctx.commit("x", (draft) =>
    D.correctQuantity(draft, "livia", "invp-arrows", 0, "Finite", "player"),
  );
  const empty = previewAction(
    h.store.state,
    "livia",
    actionId,
    { targetIds: ["goblin-1"] },
    "player",
  );
  assert.ok(empty.reasons.some((r) => r.code === "no-ammunition"));
});

test("search and filters by rarity and attunement never reveal the hidden ring", () => {
  const h = harness();
  const view = (fields) => ({ query: "", filter: "all", rarity: "", ...fields });
  const match = (fields) =>
    h
      .livia()
      .inventory.filter((row) => D.matchesFilter(h.livia(), row, view(fields)))
      .map((r) => r.id);
  assert.deepEqual(match({ query: "frecce" }), ["invp-arrows"]);
  assert.deepEqual(match({ query: "ARROWS" }), ["invp-arrows"]);
  assert.deepEqual(match({ filter: "attunement" }).sort(), [
    "invp-amulet",
    "invp-cloak",
    "invp-staff-fire",
  ]);
  assert.deepEqual(match({ rarity: "rare" }), ["invp-amulet"]);
  assert.deepEqual(
    match({ query: "protezione" }),
    ["invp-cloak"],
    "the ring's true name stays secret",
  );
  const v = inv.viewOf("livia");
  Object.assign(v, { query: "frecce" });
  const html = inv.renderTab(h.ctx, h.livia());
  assert.match(html, /data-invp-results="1"/);
  assert.match(html, /addosso/);
  Object.assign(v, { query: "", filter: "attunement" });
  assert.match(inv.renderTab(h.ctx, h.livia()), /data-invp-slot="3"/);
  inv.resetViews();
});

test("customise (DDB) and corrections with reason; DM sees the secret, the player does not", () => {
  const h = harness();
  h.run("customize", "invp-shortbow");
  h.submit({
    name: "Arco di Livia",
    weightKg: "0,8",
    costGp: "30",
    material: "silver",
    notes: "Corda nuova",
  });
  const bow = h.row("livia", "invp-shortbow");
  assert.equal(D.rowName(bow, "it"), "Arco di Livia");
  assert.equal(D.unitWeight(bow), 0.8);
  assert.equal(bow.custom.material, "silver");
  assert.equal(bow.name.it, "Arco corto", "original data kept");
  h.run("quantity", "invp-arrows");
  assert.throws(() => h.submit({ quantity: 18, reason: "" }), /reason/);
  h.submit({ quantity: 18, reason: "Due frecce spezzate" });
  assert.equal(h.slice.ledger.at(-1).reason, "Due frecce spezzate");
  assert.doesNotMatch(inv.renderTab(h.ctx, h.livia()), /Anello di protezione/);
  h.as("dm");
  assert.match(inv.renderTab(h.ctx, h.livia()), /in realtà: Anello di protezione/);
  // DM makes another item unidentified (Shard Hidden); players see only the apparent name.
  h.run("hide", "invp-amulet");
  h.submit({ apparentName: "Pendente opaco", apparentDescription: "" });
  const amulet = h.row("livia", "invp-amulet");
  assert.equal(amulet.unidentified, true);
  assert.equal(amulet.attunement, undefined);
  h.as("player");
  assert.match(inv.renderTab(h.ctx, h.livia()), /Pendente opaco/);
  assert.doesNotMatch(inv.renderTab(h.ctx, h.livia()), /Amuleto della salute/);
});

const privateSheet = (state) => {
  state.actors.iria ??= {
    ...structuredClone(state.actors.livia),
    id: "iria",
    name: "Iria",
    owner: "player",
    visibility: "private",
    campaignIds: [],
    inventory: [{ id: "iria-book", name: "Libro", quantity: 1, weight: 1.5, kind: "gear" }],
  };
};
test("persistence, direct transfer between sheets one player controls, private sheets, offline", () => {
  const h = harness({ setup: privateSheet });
  h.ctx.commit("x", (s) =>
    D.transfer(s, "livia", "mira", { items: [{ rowId: "invp-arrows", quantity: 5 }] }, "player"),
  );
  assert.equal(
    h.store.state.actors.mira.inventory.find((r) => r.ammunition === "arrow").quantity,
    5,
  );
  assert.ok(!D.transferTargets(h.store.state, "livia", "player").some((a) => a.id === "iria"));
  h.reload();
  assert.equal(h.row("livia", "invp-arrows").quantity, 15);
  assert.equal(
    h.store.state.actors.mira.inventory.find((r) => r.ammunition === "arrow").quantity,
    5,
  );
  h.ctx.offline = true;
  h.run("swap");
  assert.match(errors(h).at(-1), /senza rete/);
  // A private sheet changes locally, also offline.
  const iria = h.store.state.actors.iria;
  const row = iria.inventory.find((r) => r.quantity > 0);
  h.ctx.view = { page: "characters", id: "iria", tab: "inventory" };
  h.run("customize", row.id, "iria");
  h.submit({ name: "Libro di Iria" });
  assert.equal(
    D.rowName(
      h.store.state.actors.iria.inventory.find((r) => r.id === row.id),
      "it",
    ),
    "Libro di Iria",
  );
});

test("Table inspector, notifications and the DM-only campaign currency editor", () => {
  const h = harness();
  const html = inv.renderInspector(h.ctx, { selectedActorId: "livia" });
  assert.match(html, /Cambia set/);
  assert.equal(inv.renderInspector(h.ctx, { selectedActorId: "goblin-1" }), "");
  h.ctx.commit("x", (s) =>
    D.createOffer(
      s,
      "livia",
      "doran",
      { items: [{ rowId: "invp-arrows", quantity: 1 }] },
      "player",
    ),
  );
  assert.equal(
    inv.collectNotifications(h.ctx).filter((n) => n.id.startsWith("invp-offer")).length,
    0,
  );
  h.as("dm");
  const note = inv.collectNotifications(h.ctx).find((n) => n.id.startsWith("invp-offer"));
  assert.equal(note.target.params.id, "doran");
  assert.equal(note.by, "player");
  h.run("currencies");
  h.submit({
    nameIt: "Perla del lago",
    nameEn: "Lake pearl",
    abbrIt: "pl",
    abbrEn: "lp",
    perGp: "0.5",
    weightKg: "0.02",
  });
  assert.equal(h.slice.currencies.at(-1).perGp, 0.5);
  h.as("player");
  assert.throws(
    () =>
      h.ctx.commit("x", (s) => D.saveCurrency(s, { nameIt: "X", abbrIt: "x", perGp: 1 }, "player")),
    /Only the DM/,
  );
  h.ctx.lang = "en";
  assert.match(inv.renderTab(h.ctx, h.livia()), /Carried weight/);
});

test("attunement linked to a completed short rest; each rest serves one change", () => {
  const h = harness();
  h.ctx.commit("rest", (s) => {
    s.restTime ??= { version: 1, clocks: {}, rests: [], rolls: [], events: [] };
    s.restTime.rests.push({
      id: "rest-short-1",
      kind: "short",
      campaignId: "lanterns",
      participants: [{ actorId: "livia", status: "completed", benefits: [] }],
    });
  });
  assert.deepEqual(
    D.eligibleRests(h.store.state, "livia").map((r) => r.id),
    ["rest-short-1"],
  );
  h.run("attune", "invp-amulet");
  assert.match(h.dialogs.at(-1).body, /value="rest" checked/);
  h.submit({ method: "rest", restId: "rest-short-1" });
  assert.deepEqual(h.row("livia", "invp-amulet").attunedBy.restId, "rest-short-1");
  assert.equal(D.eligibleRests(h.store.state, "livia").length, 0, "the rest is used");
  h.run("unattune", "invp-cloak");
  assert.throws(() => h.submit({ method: "rest", restId: "rest-short-1" }), /short rest/);
});

// ---------------------------------------------------------------- review B36-rf (24/09/2026)

test("review: an offered container is revalidated by its contents, which the recipient reads", () => {
  const h = harness();
  h.ctx.commit("x", (s) =>
    D.createOffer(
      s,
      "livia",
      "doran",
      { items: [{ rowId: "invp-backpack", quantity: 1 }] },
      "player",
    ),
  );
  const offer = h.slice.offers.at(-1);
  assert.deepEqual(offer.items[0].contents.items.map((c) => c.rowId).sort(), [
    "invp-rations",
    "invp-star-notes",
    "invp-tinderbox",
  ]);
  h.as("dm");
  assert.match(inv.renderTab(h.ctx, h.doran()), /Zaino ×1 \(Razioni ×4, /);
  assert.match(inv.collectNotifications(h.ctx).at(-1).body.it, /Zaino ×1 \(Razioni ×4/);
  // The sender takes the rations out: the offer is no longer the one Doran would accept.
  h.as("player").ctx.commit("x", (s) =>
    D.moveWithin(s, "livia", "invp-rations", null, 4, "player"),
  );
  assert.match(D.offerProblems(h.store.state, offer)[0].it, /contenuto di Zaino è cambiato/);
  h.as("dm").run("offer-accept", offer.id, "doran");
  assert.match(errors(h).at(-1), /Non più accettabile/);
  assert.equal(h.row("doran", "invp-backpack"), null);
  // Coins put in the container after the offer change its contents too.
  h.as("player").ctx.commit("x", (s) =>
    D.createOffer(
      s,
      "livia",
      "doran",
      { items: [{ rowId: "invp-backpack", quantity: 1 }] },
      "player",
    ),
  );
  const second = h.slice.offers.at(-1);
  h.ctx.commit("x", (s) =>
    D.moveCoinsToContainer(s, "livia", "invp-backpack", { gp: 1 }, "in", "player"),
  );
  assert.equal(D.offerProblems(h.store.state, second).length, 1);
});

test("review: direct only for the recipient's only player (I-071); her player answers the DM's offer (I-070)", () => {
  const h = harness();
  h.as("dm").run("move", "invp-doran-longbow", "doran");
  const body = h.dialogs.at(-1).body;
  assert.match(body, /Livia · offerta da accettare/);
  assert.match(body, /Mira · offerta da accettare/);
  h.submit({ target: "actor:livia", quantity: 1, mode: "move" });
  const offer = h.slice.offers.at(-1);
  assert.equal(offer.status, "pending");
  assert.equal(h.row("doran", "invp-doran-longbow").quantity, 1, "nothing moves before the answer");
  assert.match(h.toasts.at(-1).text, /Offerta inviata a Livia/);
  // The DM controls Livia's sheet but does not play her: no bell, no Accept on her behalf.
  assert.ok(!inv.collectNotifications(h.ctx).some((n) => n.id === "invp-offer-" + offer.id));
  assert.doesNotMatch(inv.renderTab(h.ctx, h.livia()), /data-invp="offer-accept"/);
  h.run("offer-accept", offer.id, "livia");
  assert.match(errors(h).at(-1), /Solo chi gioca Livia/);
  assert.throws(
    () =>
      h.ctx.commit("x", (s) =>
        D.transfer(
          s,
          "doran",
          "livia",
          { items: [{ rowId: "invp-doran-longbow", quantity: 1 }] },
          "dm",
        ),
      ),
    /make an offer/,
  );
  // The DM does not withdraw the player's offers either: only the sender's side does.
  h.as("player").ctx.commit("x", (s) =>
    D.createOffer(
      s,
      "livia",
      "doran",
      { items: [{ rowId: "invp-arrows", quantity: 1 }] },
      "player",
    ),
  );
  const mine = h.slice.offers.at(-1);
  h.as("dm");
  assert.doesNotMatch(
    inv.renderTab(h.ctx, h.livia()),
    new RegExp(`data-invp="offer-withdraw" data-invp-id="${mine.id}"`),
  );
  h.run("offer-withdraw", mine.id, "livia");
  assert.match(errors(h).at(-1), /Solo chi ha fatto l’offerta per Livia/);
  // Livia's player gets the bell and accepts.
  h.as("player");
  assert.ok(inv.collectNotifications(h.ctx).some((n) => n.id === "invp-offer-" + offer.id));
  assert.match(inv.renderTab(h.ctx, h.livia()), /data-invp="offer-accept"/);
  h.run("offer-accept", offer.id, "livia");
  assert.equal(h.slice.offers.find((o) => o.id === offer.id).status, "accepted");
  assert.ok(h.livia().inventory.some((r) => r.srdId === "srd2024:item:longbow"));
  assert.equal(h.doran().weaponSets.ranged, null, "the given bow leaves Doran's set");
  // A sheet only the DM plays still receives directly; the player's own sheets too.
  h.as("dm").ctx.commit("x", (s) =>
    D.transfer(s, "livia", "doran", { items: [{ rowId: "invp-arrows", quantity: 2 }] }, "dm"),
  );
  assert.equal(h.doran().inventory.find((r) => r.ammunition === "arrow").quantity, 2);
  h.as("player").run("move", "invp-arrows");
  assert.match(h.dialogs.at(-1).body, /Mira · passaggio diretto/);
});

test("review: the bow reaches its long range with Disadvantage; Heavy with Dex under 13 (SRD EN 89–90 / IT 101–102)", () => {
  const h = harness();
  h.run("swap");
  const actionId = D.rangedActionId("invp-shortbow");
  const action = listActions(h.store.state, "livia").find((a) => a.id === actionId);
  assert.deepEqual([action.rangeMeters, action.longRangeMeters], [24, 96]);
  h.ctx.commit("start", (draft) => {
    draft.combat = {
      active: true,
      round: 1,
      turn: 0,
      order: ["livia", "goblin-1", "doran"],
      encounterId: "enc-long",
    };
    const scene = draft.scenes.find((s) => s.id === draft.activeSceneId);
    Object.assign(
      scene.tokens.find((t) => t.actorId === "livia"),
      { x: 25, y: 25 },
    );
    Object.assign(
      scene.tokens.find((t) => t.actorId === "goblin-1"),
      { x: 975, y: 625 },
    );
  });
  const far = previewAction(
    h.store.state,
    "livia",
    actionId,
    { targetIds: ["goblin-1"] },
    "player",
  );
  assert.ok(!far.reasons.some((r) => r.code === "out-of-range"), JSON.stringify(far.reasons));
  assert.ok(far.rollReasons.some((r) => r.code === "long-range" && r.mode === "disadvantage"));
  // Doran's Longbow is Heavy: with Dexterity 12 his ranged attacks have Disadvantage.
  h.as("dm").ctx.commit("x", (s) => {
    D.setEquipped(s, "doran", "invp-doran-shield", false, "dm");
    D.swapWeaponSet(s, "doran", "dm");
    s.actors.doran.abilities.dex = 12;
  });
  const heavy = previewAction(
    h.store.state,
    "doran",
    D.rangedActionId("invp-doran-longbow"),
    { targetIds: ["goblin-1"] },
    "dm",
  );
  const reason = heavy.rollReasons.find((r) => r.code === "heavy");
  assert.equal(reason?.mode, "disadvantage");
  assert.equal(reason.source.pages.en[0], 89);
  h.ctx.commit("x", (s) => {
    s.actors.doran.abilities.dex = 14;
  });
  assert.ok(
    !previewAction(
      h.store.state,
      "doran",
      D.rangedActionId("invp-doran-longbow"),
      { targetIds: ["goblin-1"] },
      "dm",
    ).rollReasons.some((r) => r.code === "heavy"),
  );
});

test("review: the last-charge d20 comes before a dawn recharge; a full container is not hidden", () => {
  const h = harness();
  h.ctx.commit("x", (s) => {
    const wand = D.rowById(s.actors.livia, "invp-wand");
    wand.charges.value = 0;
    wand.charges.lastCharge = "pending";
  });
  advanceHours(h, 22);
  assert.equal(D.pendingDawns(h.store.state, h.row("livia", "invp-wand")), 0);
  const html = inv.renderTab(h.ctx, h.livia());
  assert.match(html, /data-invp="last-charge" data-invp-id="invp-wand"/);
  assert.doesNotMatch(html, /data-invp="recharge" data-invp-id="invp-wand"/);
  assert.throws(
    () =>
      h.ctx.commit("x", (s) =>
        D.rollRecharge(s, "livia", "invp-wand", { mode: "physical", faces: [3] }, "player"),
      ),
    /last-charge d20 first/,
  );
  h.run("last-charge", "invp-wand");
  h.submit({ mode: "physical", face0: 12 });
  assert.equal(D.pendingDawns(h.store.state, h.row("livia", "invp-wand")), 1, "then the dawn");
  // Hiding a container with things inside would spill them: the DM empties it first.
  h.as("dm").run("hide", "invp-bag");
  assert.throws(
    () => h.submit({ apparentName: "Sacca di stoffa", apparentDescription: "" }),
    (error) => /Togli prima il contenuto di Borsa conservante/.test(error.it),
  );
  assert.equal(h.row("livia", "invp-bag").unidentified, undefined);
});

test("review: in a fight the equip toggle and the set swap say the 2024 timing they record", () => {
  const h = harness();
  h.run("equip", "invp-crate");
  assert.equal(h.toasts.length, 0, "outside a fight nothing to add");
  h.ctx.commit("start", (draft) => {
    draft.combat = { active: true, round: 1, turn: 0, order: ["livia", "doran"], encounterId: "e" };
  });
  h.run("swap");
  assert.match(h.toasts.at(-1).text, /una per attacco \(SRD EN 177 \/ IT 204\)/);
  h.as("dm").run("equip", "invp-doran-shield", "doran");
  assert.match(h.toasts.at(-1).text, /azione Utilizzo \(SRD EN 92 \/ IT 105\)/);
  h.run("use", "invp-staff-fire");
  assert.match(h.as("player").dialogs.at(-1).body, /data-invp-hold-note>/);
});
