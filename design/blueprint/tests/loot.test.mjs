// B26 — treasure parcels, distribution, party stash, awards, clean NPC copies. Uses the
// real store and registry (seed, commit, undo, reload) and the same handlers the bound
// controls call. Synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import * as loot from "../loot.mjs";
import * as stash from "../party-stash.mjs";
import { renderCharacters } from "../characters.mjs";
import { setNameHidden } from "../token-menu.mjs";
import { getFamiliarCastingAccess } from "../forms-profile.mjs";

function memory() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
export function form(fields = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields))
    for (const entry of [].concat(value)) data.append(key, String(entry));
  return data;
}
export function harness({ role = "dm", lang = "it" } = {}) {
  const storage = memory();
  const boot = () => {
    const registry = createRegistry();
    registry.use("loot", loot.register);
    const store = createStore({ storage });
    if (registry.initState(store.state).changed) store.persist();
    return { registry, store };
  };
  let { registry, store } = boot();
  const toasts = [],
    dialogs = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object"
        ? (value[ctx.lang] ?? value.it ?? value.en ?? "")
        : String(value ?? ""),
    esc,
    icon: () => "",
    toast: (text, error = false) => toasts.push({ text, error }),
    dialog: (title, body, options = {}) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {},
    navigate(page, params) {
      ctx.navigated = { page, params };
    },
    openSheet(id, tab) {
      ctx.opened = { id, tab };
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
  return {
    ctx,
    toasts,
    dialogs,
    get store() {
      return store;
    },
    get slice() {
      return store.state.ext.loot;
    },
    reload() {
      ({ registry, store } = boot());
    },
    // Submits the latest dialog as its form would.
    submit(fields) {
      const dialog = dialogs.at(-1);
      assert.ok(dialog, "no dialog open");
      return dialog.options.onSubmit(form(fields));
    },
    run: (action, data = {}, fields = null) =>
      loot.handleLootAction(ctx, action, data, fields ? form(fields) : null),
  };
}
const inv = (state, id) => state.actors[id].inventory;
const row = (state, actorId, en) =>
  inv(state, actorId).find((entry) => (entry.name?.en ?? entry.name) === en);
const errorsOf = (h) => h.toasts.filter((entry) => entry.error).map((entry) => entry.text);

// Builds the acceptance chest through the real handlers, as the DM does in Preparation.
function prepareChest(h) {
  h.ctx.role = "dm";
  h.run("parcel-create", {}, { name: "Forziere" });
  const parcel = h.slice.parcels.at(-1);
  h.run(
    "parcel-coins",
    { id: parcel.id },
    { "coin-pp": 0, "coin-gp": 120, "coin-ep": 0, "coin-sp": 25, "coin-cp": 0 },
  );
  h.run(
    "parcel-item-add",
    { id: parcel.id },
    { srdId: "srd2024:item:potion-of-healing", quantity: 1 },
  );
  h.run(
    "parcel-item-add",
    { id: parcel.id },
    {
      srdId: "srd2024:item:ring-of-protection",
      quantity: 1,
      unidentified: "on",
      apparentName: "Anello d'argento inciso",
    },
  );
  return h.slice.parcels.find((entry) => entry.id === parcel.id);
}

test("seed: party stash, SRD-priced pedlar and slice survive reload", () => {
  const h = harness();
  assert.deepEqual(h.slice.stash.coins, { pp: 0, gp: 15, ep: 0, sp: 0, cp: 0 });
  assert.equal(h.slice.stash.items[0].srdId, "srd2024:item:torch");
  const tessa = h.slice.merchants[0];
  assert.equal(tessa.open, false);
  assert.equal(tessa.buyRate, 50);
  assert.equal(tessa.stock.find((s) => s.id === "tessa-healers-kit").priceCp, 500);
  assert.equal(tessa.stock.find((s) => s.id === "tessa-potion-of-healing").priceCp, 5000);
  h.run("parcel-create", {}, { name: "Borsello" });
  h.reload();
  assert.equal(h.slice.parcels[0].name, "Borsello");
  assert.equal(h.store.state.extVersions.loot, 1);
  assert.throws(() => loot.normalizeLoot({}, 2), /newer version/);
  assert.deepEqual(
    loot.normalizeLoot({ stash: { coins: { gp: -1 } } }, 1).stash.coins,
    stash.emptyCoins(),
  );
});

test("coins: change-making, even split with remainder and localized format", () => {
  const purse = { pp: 0, gp: 40, ep: 0, sp: 8, cp: 0 };
  stash.spendCp(purse, 420);
  assert.deepEqual(purse, { pp: 0, gp: 36, ep: 0, sp: 6, cp: 0 });
  assert.equal(stash.coinsValue(purse), 3660);
  assert.throws(
    () => stash.spendCp({ gp: 1 }, 101),
    (e) => e.it.startsWith("Fondi insufficienti"),
  );
  const { share, remainder } = stash.splitCoins({ gp: 120, sp: 25 }, 3);
  assert.equal(share.gp, 40);
  assert.equal(share.sp, 8);
  assert.equal(remainder.sp, 1);
  assert.equal(stash.formatCoins({ gp: 1500, sp: 3 }, "it"), "1.500 mo · 3 ma");
  assert.equal(stash.formatCoins({ gp: 1500, sp: 3 }, "en"), "1,500 GP · 3 SP");
  assert.equal(stash.formatCp(0, "it"), "0 mo");
  assert.throws(
    () => stash.subtractCoins({ gp: 1 }, { gp: 2 }),
    (e) => e.en.includes("gold"),
  );
  assert.equal(stash.coinsWeightKg({ gp: 50 }), 0.5);
});

test("PR-54 chest: DM prepares coins, potion and unidentified ring tied to the scene", () => {
  const h = harness();
  const chest = prepareChest(h);
  assert.equal(chest.sceneId, "old-watch");
  assert.equal(chest.revealed, false);
  assert.deepEqual(chest.coins, { pp: 0, gp: 120, ep: 0, sp: 25, cp: 0 });
  const ring = chest.items[1];
  assert.equal(ring.name.it, "Anello d'argento inciso");
  assert.equal(ring.identified, false);
  assert.equal(ring.value, null);
  assert.equal(h.slice.secrets[ring.lootId].name.it, "Anello di protezione");
  // DM preparation shows the true identity; a player's Table view shows nothing yet.
  assert.match(loot.renderTreasurePrep(h.ctx), /in realtà: Anello di protezione/);
  h.ctx.role = "player";
  assert.doesNotMatch(loot.renderLootDrawer(h.ctx), /Forziere/);
  h.run("assign", { id: chest.id, item: chest.items[0].id }, { target: "livia", quantity: 1 });
  assert.match(errorsOf(h).at(-1), /non è visibile/);
  assert.throws(
    () => loot.createParcel(h.store.state, h.slice, "player", { name: "X" }),
    /Only the DM/,
  );
});

test("TV-143 at the Table: potion to Livia, ring to the stash, split coins with remainder, Undo", () => {
  const h = harness();
  const chest = prepareChest(h);
  h.run("parcel-reveal", { id: chest.id });
  h.ctx.role = "player";
  const drawer = loot.renderLootDrawer(h.ctx);
  assert.match(drawer, /Forziere/);
  assert.match(drawer, /Anello d&#39;argento inciso/);
  assert.doesNotMatch(drawer, /Anello di protezione/, "true name leaked to the player");
  const [potion, ring] = h.slice.parcels[0].items;
  // A player can assign only to a character they control or to the stash.
  h.run("assign", { id: chest.id, item: potion.id }, { target: "doran", quantity: 1 });
  assert.match(errorsOf(h).at(-1), /solo ai tuoi personaggi/);
  h.run("assign", { id: chest.id, item: potion.id }, { target: "livia", quantity: 1 });
  assert.equal(
    row(h.store.state, "livia", "Potion of healing").quantity,
    4,
    "stacks on Livia's potions",
  );
  h.run("assign", { id: chest.id, item: ring.id }, { target: "stash", quantity: 1 });
  assert.equal(h.slice.stash.items.at(-1).name.it, "Anello d'argento inciso");
  // Second attempt on the same unit finds it gone (one valid assignment).
  h.run("assign", { id: chest.id, item: ring.id }, { target: "stash", quantity: 1 });
  assert.match(errorsOf(h).at(-1), /già stato assegnato/);
  h.run("parcel-split", { id: chest.id });
  assert.match(h.dialogs.at(-1).body, /A testa: 40 mo · 8 ma · resto nella scorta: 1 ma/);
  h.submit({ recipient: ["livia", "doran", "mira"] });
  for (const id of ["livia", "doran", "mira"])
    assert.deepEqual(h.store.state.actors[id].currency, { pp: 0, gp: 40, ep: 0, sp: 8, cp: 0 });
  assert.deepEqual(h.slice.stash.coins, { pp: 0, gp: 15, ep: 0, sp: 1, cp: 0 });
  assert.equal(loot.parcelStatus(h.slice.parcels[0]), "emptied");
  const entry = h.slice.ledger.at(-1);
  assert.equal(entry.kind, "coins-split");
  assert.match(entry.text.it, /resto nella scorta: 1 ma/);
  // Sheet shows the same purse; Undo reverts the split atomically.
  assert.match(stash.renderPurse(h.ctx, h.store.state.actors.livia), /data-loot-coin="gp">40</);
  h.ctx.undo();
  assert.equal(h.store.state.actors.livia.currency, undefined);
  assert.deepEqual(h.slice.parcels[0].coins, { pp: 0, gp: 120, ep: 0, sp: 25, cp: 0 });
  assert.deepEqual(h.slice.stash.coins, { pp: 0, gp: 15, ep: 0, sp: 0, cp: 0 });
  assert.equal(h.store.state.log.at(-1).kind, "correction");
  // Everything to the stash (BG3 "Take all").
  h.run("parcel-all-stash", { id: chest.id });
  assert.deepEqual(h.slice.stash.coins, { pp: 0, gp: 135, ep: 0, sp: 25, cp: 0 });
});

test("PG-72 stash: equipped by Livia blocks Mira; DM removes with a reason; identify reaches the sheet", () => {
  const h = harness();
  const chest = prepareChest(h);
  h.run("parcel-reveal", { id: chest.id });
  h.run("assign", { id: chest.id, item: chest.items[1].id }, { target: "stash", quantity: 1 });
  h.ctx.role = "player";
  const ring = h.slice.stash.items.find((entry) => entry.identified === false);
  stash.handleStashAction(h.ctx, "stash-equip", { id: ring.id }, "livia");
  assert.equal(h.slice.stash.items.find((e) => e.id === ring.id).equippedBy, "livia");
  // Mira (same player, another character) cannot take, equip or remove it.
  for (const action of ["stash-take", "stash-equip"]) {
    stash.handleStashAction(h.ctx, action, { id: ring.id }, "mira");
    assert.match(errorsOf(h).at(-1), /Equipaggiato da Livia/);
  }
  assert.throws(
    () => stash.removeFromStash(h.store.state, h.slice, "player", ring.id, "perso", "mira"),
    /Equipped by Livia/,
  );
  const miraView = stash.renderStash(h.ctx, h.store.state.actors.mira);
  assert.match(miraView, /Equipaggiato da Livia/);
  assert.match(miraView, /data-loot="stash-remove"[^>]*disabled/);
  assert.match(stash.renderStash(h.ctx, h.store.state.actors.livia), /Equipaggiato da te/);
  // Livia unequips, then takes it: the unidentified ring lands on her sheet.
  stash.handleStashAction(h.ctx, "stash-equip", { id: ring.id }, "livia");
  stash.handleStashAction(h.ctx, "stash-take", { id: ring.id }, "livia");
  const onSheet = inv(h.store.state, "livia").find((entry) => entry.unidentified);
  assert.equal(onSheet.name.it, "Anello d'argento inciso");
  // DM identifies from the sheet box: the name changes where the item is now.
  h.ctx.role = "dm";
  assert.match(
    loot.renderIdentify(h.ctx, h.store.state.actors.livia),
    /in realtà: Anello di protezione/,
  );
  h.run("identify", { lootId: onSheet.lootId });
  const identified = inv(h.store.state, "livia").find((entry) => entry.lootId === onSheet.lootId);
  assert.equal(identified.name.it, "Anello di protezione");
  assert.equal(identified.unidentified, undefined);
  assert.equal(h.slice.secrets[onSheet.lootId], undefined);
  assert.match(
    h.slice.ledger.at(-1).text.it,
    /Identificato: Anello d'argento inciso è Anello di protezione/,
  );
  // Deposit from the inventory and DM removal with a mandatory reason.
  h.ctx.role = "player";
  stash.handleStashAction(h.ctx, "stash-deposit", {}, "livia", form({ row: "rope", quantity: 1 }));
  const rope = h.slice.stash.items.find((entry) => entry.name.en === "Rope");
  assert.ok(rope && !inv(h.store.state, "livia").some((entry) => entry.id === "rope"));
  h.ctx.role = "dm";
  stash.handleStashAction(h.ctx, "stash-remove", { id: rope.id }, null);
  // The dialog keeps the refusal inline (the shell shows the thrown message in it).
  assert.throws(
    () => h.submit({ reason: "" }),
    (e) => /motivo/.test(e.it),
  );
  h.submit({ reason: "Usata per legare il prigioniero" });
  assert.ok(!h.slice.stash.items.some((entry) => entry.id === rope.id));
  assert.equal(h.slice.ledger.at(-1).reason, "Usata per legare il prigioniero");
});

test("stash coins: withdraw, deposit, split among the party with remainder", () => {
  const h = harness({ role: "player" });
  stash.handleStashAction(h.ctx, "stash-withdraw", {}, "mira");
  h.submit({ pp: 0, gp: 5, ep: 0, sp: 0, cp: 0 });
  assert.equal(h.store.state.actors.mira.currency.gp, 5);
  assert.equal(h.slice.stash.coins.gp, 10);
  stash.handleStashAction(h.ctx, "stash-deposit-coins", {}, "mira");
  assert.throws(() => h.submit({ gp: 9 }), /Not enough gold/);
  h.submit({ gp: 2 });
  assert.equal(h.slice.stash.coins.gp, 12);
  stash.handleStashAction(h.ctx, "stash-split", {}, "mira");
  h.submit({ recipient: ["livia", "doran", "mira"] });
  assert.equal(h.store.state.actors.doran.currency.gp, 4);
  assert.equal(h.slice.stash.coins.gp, 0);
  // Offline: a shared change is refused with a readable message and no mutation.
  h.ctx.offline = true;
  stash.handleStashAction(h.ctx, "stash-deposit", {}, "livia", form({ row: "rope", quantity: 1 }));
  assert.match(errorsOf(h).at(-1), /senza rete/);
  assert.ok(inv(h.store.state, "livia").some((entry) => entry.id === "rope"));
});

test("CA-79 awards: split or each, XP from the level threshold, remainder to the stash, ledger", () => {
  const h = harness();
  h.run("award-open");
  assert.match(h.dialogs.at(-1).body, /Da dividere tra i destinatari/);
  h.submit({
    xp: 150,
    "coin-gp": 10,
    mode: "split",
    recipient: ["livia", "doran", "mira"],
    reason: "Goblin sconfitti",
  });
  const livia = h.store.state.actors.livia;
  assert.equal(livia.xp, 950, "900 (level 3 threshold, SRD) + 50");
  assert.equal(livia.currency.gp, 3);
  assert.equal(h.slice.stash.coins.gp, 16, "1 gp remainder kept");
  const award = h.slice.awards.at(-1);
  assert.equal(award.perXp, 50);
  assert.equal(award.results[0].xp.inferredBase, true);
  assert.match(
    h.slice.ledger.at(-1).text.it,
    /50 PE \+ 3 mo a testa a Livia, Doran, Mira; resto nella scorta: 1 mo/,
  );
  assert.match(stash.renderXp(h.ctx, livia), /950 PE/);
  assert.match(stash.renderXp(h.ctx, livia), /Livello 4 a 2\.700 PE/);
  h.run("award-open");
  h.submit({ xp: 100, mode: "each", recipient: ["doran"], reason: "" });
  assert.equal(h.store.state.actors.doran.xp, 1050);
  h.ctx.role = "player";
  assert.throws(
    () => loot.awardParty(h.store.state, h.slice, "player", { xp: 1, recipients: ["livia"] }),
    /Only the DM/,
  );
  h.ctx.role = "dm";
  assert.throws(
    () => loot.awardParty(h.store.state, h.slice, "dm", { xp: 0, recipients: ["livia"] }),
    /XP or coins/,
  );
  assert.throws(
    () => loot.awardParty(h.store.state, h.slice, "dm", { xp: 5, recipients: ["goblin-1"] }),
    /not in the party/,
  );
});

test("PR-47 NPC loot uses clean catalog copies without stat-block bonuses", () => {
  const items = loot.cleanGearFromStatBlock("srd2024:creature:goblin-warrior");
  assert.deepEqual(
    items.map((item) => item.name.en),
    ["Leather Armor", "Scimitar", "Shield", "Shortbow"],
  );
  const scimitar = items[1];
  assert.equal(scimitar.weapon.damage.dice, "1d6");
  assert.equal(scimitar.value, 2500);
  assert.ok(!JSON.stringify(scimitar.weapon).includes("1d6+2"));
  assert.match(scimitar.clean.dropped.it, /\+4/, "the dropped stat-block attack is shown");
  const h = harness();
  h.run("parcel-create", {}, { name: "Bottino della Sentinella" });
  const parcel = h.slice.parcels.at(-1);
  h.run(
    "parcel-save",
    { id: parcel.id },
    { name: "Bottino della Sentinella", sceneId: "old-watch", sourceActorId: "goblin-1", note: "" },
  );
  h.run(
    "parcel-statblock-add",
    { id: parcel.id },
    { creatureId: "srd2024:creature:goblin-warrior" },
  );
  assert.equal(h.slice.parcels[0].items.length, 4);
  assert.match(loot.renderTreasurePrep(h.ctx), /Non copiato dal blocco/);
  const item = h.slice.parcels[0].items.find((entry) => entry.name.en === "Scimitar");
  h.run("assign", { id: parcel.id, item: item.id }, { target: "doran", quantity: 1 });
  const onDoran = row(h.store.state, "doran", "Scimitar");
  assert.equal(onDoran.weapon.damage.dice, "1d6");
  assert.equal(onDoran.srdId, "srd2024:item:scimitar");
  assert.equal(onDoran.equipped, false);
  // An NPC inventory row with bonuses becomes a clean copy.
  h.store.state.actors["goblin-1"].inventory.push({
    id: "g-blade",
    name: { it: "Lama seghettata", en: "Serrated blade" },
    quantity: 1,
    weight: 1,
    kind: "weapon",
    attackBonus: 4,
    damageBonus: 2,
    equipped: true,
  });
  const copy = loot.cleanCopyOfNpcRow(
    h.store.state.actors["goblin-1"],
    h.store.state.actors["goblin-1"].inventory[0],
  );
  assert.equal(copy.attackBonus, undefined);
  assert.equal(copy.damageBonus, undefined);
  assert.deepEqual(copy.clean.dropped, ["attackBonus", "damageBonus"]);
  // The creature's map marker appears for the DM (hidden) and players once shown.
  const view = { scene: h.store.state.scenes[0] };
  assert.match(loot.renderMarkers(h.ctx, view), /is-hidden/);
  h.ctx.role = "player";
  assert.equal(loot.renderMarkers(h.ctx, view), "");
  h.ctx.role = "dm";
  h.run("parcel-reveal", { id: parcel.id });
  h.ctx.role = "player";
  assert.match(loot.renderMarkers(h.ctx, view), /data-loot-marker/);
});

test("purse and XP corrections need a reason; a private sheet corrects locally", () => {
  const h = harness({ role: "player" });
  stash.openPurseCorrection(h.ctx, "livia");
  assert.throws(() => h.submit({ gp: 12, reason: "" }), /reason/);
  h.submit({ gp: 12, sp: 4, reason: "Spese in città" });
  assert.equal(h.store.state.actors.livia.currency.gp, 12);
  assert.equal(h.slice.ledger.at(-1).reason, "Spese in città");
  assert.equal(h.store.history.at(-1).shared, true);
  h.store.state.actors.livia.visibility = "private";
  stash.openPurseCorrection(h.ctx, "livia");
  const ledgerLength = h.slice.ledger.length;
  h.submit({ gp: 1, reason: "Scheda personale" });
  assert.equal(h.store.history.at(-1).shared, false, "private sheet commits locally");
  assert.equal(h.slice.ledger.length, ledgerLength, "no shared ledger entry for a private sheet");
  assert.throws(
    () => stash.correctXp(h.store.state, h.slice, "player", "doran", 10, "x"),
    /cannot correct/,
  );
});

test("registration: contributions, notifications for players and role visibility", () => {
  const h = harness();
  const { registry } = h.ctx;
  const ids = (point, ...args) => registry.list(point, h.ctx, ...args).map((c) => c.id);
  const livia = h.store.state.actors.livia;
  assert.deepEqual(ids("sheet-section", livia).sort(), ["loot-purse", "loot-stash", "loot-xp"]);
  assert.deepEqual(ids("preparation-section"), ["loot", "loot-merchants"]);
  assert.deepEqual(ids("table-panel", { selectedActorId: "goblin-1" }), ["loot", "loot-shop"]);
  assert.ok(ids("table-panel", { selectedActorId: "livia" }).includes("loot-purse"));
  assert.ok(ids("campaign-section").includes("loot"));
  assert.ok(ids("map-layer", {}).includes("loot-markers"));
  h.ctx.role = "player";
  assert.deepEqual(ids("preparation-section"), []);
  assert.deepEqual(ids("table-panel", {}), [], "no loot or open shop yet for players");
  assert.deepEqual(ids("sheet-section", h.store.state.actors["goblin-1"]), []);
  h.ctx.role = "dm";
  const chest = prepareChest(h);
  h.run("parcel-reveal", { id: chest.id });
  h.ctx.role = "player";
  assert.deepEqual(ids("table-panel", {}), ["loot"]);
  const notes = registry.notifications(h.ctx);
  assert.equal(notes[0].title.it, "Bottino da dividere: Forziere");
  assert.equal(notes[0].target.page, "table");
});

test("PR-55 treasure totals: value still to find and value already with the party", () => {
  const h = harness();
  const chest = prepareChest(h);
  // 120 gp + 25 sp + Potion of Healing 50 gp + Ring of Protection (Rare) 4,000 gp.
  assert.deepEqual(loot.treasureTotals(h.slice), { remainingCp: 417250, distributedCp: 0 });
  assert.match(loot.renderTreasurePrep(h.ctx), /da trovare 4\.172 mo · 5 ma · già al gruppo 0 mo/);
  h.run("parcel-reveal", { id: chest.id });
  h.run("assign", { id: chest.id, item: chest.items[0].id }, { target: "livia", quantity: 1 });
  h.run("parcel-coins-stash", { id: chest.id });
  assert.deepEqual(loot.treasureTotals(h.slice), { remainingCp: 400000, distributedCp: 17250 });
  assert.equal(h.slice.stash.coins.gp, 135);
  h.run("parcel-all-stash", { id: chest.id });
  assert.deepEqual(loot.treasureTotals(h.slice, "old-watch"), {
    remainingCp: 0,
    distributedCp: 417250,
  });
});

// ---------------------------------------------------------------- review fixes (B26)

// The character sheet as its owner sees it (characters.mjs renders the real rows).
function sheetRow(h, actorId, name, tab = "inventory") {
  h.ctx.view = { page: "characters", id: actorId, tab };
  const html = renderCharacters(h.ctx);
  const rows = html.split("<article").filter((part) => part.includes(name));
  return { html, row: rows[0] ?? "" };
}

test("INV-10 review: an unidentified potion or weapon reaches the sheet without its identity", () => {
  const h = harness();
  h.run("parcel-create", {}, { name: "Forziere" });
  const parcel = h.slice.parcels.at(-1);
  const add = (srdId, apparentName) =>
    h.run(
      "parcel-item-add",
      { id: parcel.id },
      { srdId, quantity: 1, unidentified: "on", apparentName },
    );
  add("srd2024:item:potion-of-healing", "Fiala torbida");
  add("srd2024:item:longsword", "Lama brunita");
  const [vial, blade] = h.slice.parcels[0].items;
  for (const item of [vial, blade]) {
    assert.equal(item.srdId, null);
    assert.equal(item.kind, "gear", "a neutral kind: no Drink, no sword icon");
    for (const field of ["healing", "weapon", "weaponType", "armor", "source", "category"])
      assert.equal(item[field], undefined, `${field} leaks on the parcel row`);
  }
  assert.equal(h.slice.secrets[vial.lootId].fields.healing, 7);
  assert.equal(h.slice.secrets[blade.lootId].fields.weapon.damage.dice, "1d8");
  h.run("parcel-reveal", { id: parcel.id });
  h.ctx.role = "player";
  h.run("assign", { id: parcel.id, item: vial.id }, { target: "livia", quantity: 1 });
  h.run("assign", { id: parcel.id, item: blade.id }, { target: "livia", quantity: 1 });
  const stored = inv(h.store.state, "livia").filter((entry) => entry.unidentified);
  assert.equal(stored.length, 2);
  for (const entry of stored) {
    for (const field of ["srdId", "healing", "weapon", "weaponType", "source", "category"])
      assert.equal(entry[field], undefined, `${field} leaks on the inventory row`);
    assert.equal(entry.kind, "gear");
  }
  assert.ok(!JSON.stringify(stored).includes("potion-of-healing"));
  assert.ok(!JSON.stringify(stored).includes("longsword"));
  // Livia's own sheet: the vial offers no Drink and shows no healing dice.
  const { row } = sheetRow(h, "livia", "Fiala torbida");
  assert.ok(row, "the vial is on the sheet");
  assert.doesNotMatch(row, /use-healing|Bevi/);
  assert.doesNotMatch(row, /2d4/);
  // The DM identifies it: name, use and catalog identity return where the row is now.
  h.ctx.role = "dm";
  h.run("identify", { lootId: vial.lootId });
  const known = inv(h.store.state, "livia").find((entry) => entry.lootId === vial.lootId);
  assert.equal(known.name.it, "Pozione di guarigione");
  assert.equal(known.healing, 7);
  assert.equal(known.kind, "consumable");
  assert.equal(known.srdId, "srd2024:item:potion-of-healing");
  assert.equal(known.unidentified, undefined);
  h.ctx.role = "player";
  assert.match(sheetRow(h, "livia", "Pozione di guarigione").html, /use-healing/);
  h.ctx.role = "dm";
  h.run("identify", { lootId: blade.lootId });
  const sword = inv(h.store.state, "livia").find((entry) => entry.lootId === blade.lootId);
  assert.equal(sword.kind, "weapon");
  assert.equal(sword.weapon.damage.dice, "1d8");
});

test("fractional gold from the builder is read by value; awards to the whole party work", () => {
  const h = harness();
  h.store.state.actors.mira.currency = { gp: 12.5 };
  assert.deepEqual(stash.purseOf(h.store.state.actors.mira), {
    pp: 0,
    gp: 12,
    ep: 0,
    sp: 5,
    cp: 0,
  });
  assert.deepEqual(stash.readPurse({ gp: 1.25, sp: -2 }), {
    coins: { pp: 0, gp: 1, ep: 0, sp: 2, cp: 5 },
    converted: true,
  });
  assert.equal(stash.readPurse({ gp: 3 }).converted, false);
  // The sheet section renders (it used to fail) and says how the value was read.
  const purse = stash.renderPurse(h.ctx, h.store.state.actors.mira);
  assert.match(purse, /data-loot-coin="gp">12</);
  assert.match(purse, /data-loot-coin="sp">5</);
  assert.match(purse, /Registrate come 12,5 mo/);
  assert.match(loot.renderTreasury(h.ctx), /Mira<\/strong><small>12 mo · 5 ma/);
  h.run("award-open");
  h.submit({ xp: 0, "coin-gp": 30, mode: "split", recipient: ["livia", "doran", "mira"] });
  assert.equal(errorsOf(h).length, 0, errorsOf(h).join(" "));
  assert.deepEqual(h.store.state.actors.mira.currency, { pp: 0, gp: 22, ep: 0, sp: 5, cp: 0 });
  assert.equal(h.store.state.actors.livia.currency.gp, 10);
  const converted = h.slice.ledger.find((entry) => entry.kind === "purse-converted");
  assert.match(converted.text.it, /Monete di Mira registrate come 12,5 mo: .* 12 mo · 5 ma/);
});

test("PR-55 review: deleting a handed-out parcel keeps the treasure already with the party", () => {
  const h = harness();
  const chest = prepareChest(h);
  h.run("parcel-reveal", { id: chest.id });
  h.run("assign", { id: chest.id, item: chest.items[1].id }, { target: "stash", quantity: 1 });
  assert.equal(loot.treasureTotals(h.slice).distributedCp, 400000);
  h.run("parcel-delete", { id: chest.id });
  assert.match(h.dialogs.at(-1).body, /tesoro accumulato/);
  h.submit({});
  assert.equal(h.slice.parcels.length, 0);
  assert.deepEqual(loot.treasureTotals(h.slice), { remainingCp: 0, distributedCp: 400000 });
  assert.equal(loot.treasureTotals(h.slice, "old-watch").distributedCp, 400000);
  assert.match(loot.renderTreasurePrep(h.ctx), /già al gruppo 4\.000 mo/);
  h.reload();
  assert.equal(loot.treasureTotals(h.slice).distributedCp, 400000, "kept across reload");
  // A parcel deleted before anything was handed out leaves no trace in the totals.
  h.run("parcel-create", {}, { name: "Vuoto" });
  h.run("parcel-delete", { id: h.slice.parcels.at(-1).id });
  h.submit({});
  assert.equal(h.slice.retired.length, 1);
});

test("DM preparation stays out of the players' log; showing and trades stay shared", () => {
  const h = harness();
  const chest = prepareChest(h);
  const entries = () => h.store.state.log.filter((entry) => entry.kind === "change");
  const visibleTo = (role) =>
    entries()
      .filter((entry) => entry.visibility !== "private" || entry.controller === role)
      .map((entry) => entry.label);
  for (const label of [
    "Pacchetto di tesoro creato",
    "Monete del pacchetto",
    "Oggetto aggiunto al pacchetto",
  ])
    assert.ok(!visibleTo("player").includes(label), `${label} reached the players`);
  assert.ok(visibleTo("dm").includes("Pacchetto di tesoro creato"));
  h.run("identify", { lootId: chest.items[1].lootId });
  assert.equal(entries().at(-1).visibility, "private", "identify inside a hidden parcel");
  assert.equal(h.slice.ledger.at(-1).dmOnly, true);
  assert.match(stash.ledgerList(h.ctx, h.slice.ledger), /Anello di protezione/);
  h.ctx.role = "player";
  assert.doesNotMatch(
    stash.ledgerList(h.ctx, h.slice.ledger),
    /Anello di protezione/,
    "the loot log does not tell players what a hidden item is",
  );
  h.ctx.role = "dm";
  h.run("parcel-reveal", { id: chest.id });
  assert.ok(visibleTo("player").includes("Forziere: mostrato ai giocatori"));
  h.run("parcel-item-add", { id: chest.id }, { srdId: "srd2024:item:torch", quantity: 1 });
  assert.equal(entries().at(-1).visibility, "shared", "a shown parcel changes in view");
});

test("GMG token loot: the DM starts loot from a creature's token; players reach shown loot", () => {
  const h = harness();
  const target = { actorId: "goblin-2", tokenId: "t", sceneId: "old-watch" };
  const menu = () => h.ctx.registry.list("token-menu", h.ctx, target).map((c) => c.id);
  assert.ok(menu().includes("loot-open"), "DM: Loot on any creature, even with no parcel");
  assert.ok(
    !h.ctx.registry
      .list("token-menu", h.ctx, { ...target, actorId: "livia" })
      .some((c) => c.id === "loot-open"),
    "not on a party character",
  );
  h.ctx.role = "player";
  assert.ok(!menu().includes("loot-open"), "players: nothing until loot is shown");
  h.ctx.role = "dm";
  h.ctx.registry.run(h.ctx.registry.get("token-menu", "loot-open", h.ctx, target), h.ctx, target);
  const parcel = h.slice.parcels.at(-1);
  assert.equal(parcel.name, "Bottino: Esploratore");
  assert.equal(parcel.sourceActorId, "goblin-2");
  assert.equal(parcel.sceneId, "old-watch");
  assert.equal(parcel.revealed, false);
  // Running it again opens the same parcel rather than creating another.
  h.ctx.registry.run(h.ctx.registry.get("token-menu", "loot-open", h.ctx, target), h.ctx, target);
  assert.equal(h.slice.parcels.length, 1);
  // The drawer card lets the DM fill it where the fight ended (GMG loot window).
  const drawer = loot.renderLootDrawer(h.ctx);
  assert.match(drawer, /Aggiungi monete e oggetti/);
  assert.match(drawer, /data-loot-form="parcel-item-add"/);
  assert.match(drawer, /id="loot-parcel-[^"]+" tabindex="-1"/, "focusable parcel heading");
  h.run("parcel-coins", { id: parcel.id }, { "coin-gp": 7 });
  h.run("parcel-reveal", { id: parcel.id });
  h.ctx.role = "player";
  assert.ok(menu().includes("loot-open"));
  assert.doesNotMatch(loot.renderLootDrawer(h.ctx), /Aggiungi monete e oggetti/);
});

test("PG-72 review: an item equipped from the stash appears in that character's Actions", () => {
  const h = harness({ role: "player" });
  const torches = h.slice.stash.items[0];
  stash.handleStashAction(h.ctx, "stash-equip", { id: torches.id }, "livia");
  const ids = (actor) =>
    h.ctx.registry.list("sheet-section", h.ctx, h.store.state.actors[actor]).map((c) => c.id);
  assert.ok(ids("livia").includes("loot-stash-equipped"));
  assert.ok(!ids("mira").includes("loot-stash-equipped"));
  const { html } = sheetRow(h, "livia", "Torcia", "actions");
  assert.match(html, /Equipaggiati dalla scorta del gruppo/);
  assert.match(html, /Torcia.*dalla scorta/s);
  stash.handleStashAction(h.ctx, "open-inventory", {}, "livia");
  assert.deepEqual(h.ctx.opened, { id: "livia", tab: "inventory" });
});

test("B25 hook: random-table loot enters a hidden parcel of the scene", () => {
  const h = harness();
  const item = loot.addTableLoot(h.store.state, h.slice, "dm", {
    sceneId: "old-watch",
    name: "Statuetta d'avorio",
    valueGp: 25,
  });
  loot.addTableLoot(h.store.state, h.slice, "dm", { sceneId: "old-watch", name: "Corda" });
  const parcel = h.slice.parcels.at(-1);
  assert.equal(h.slice.parcels.length, 1, "one table parcel per scene until shown");
  assert.equal(parcel.revealed, false);
  assert.equal(parcel.items[0].id, item.id);
  assert.equal(loot.treasureTotals(h.slice).remainingCp, 2500);
  assert.throws(
    () => loot.addTableLoot(h.store.state, h.slice, "player", { sceneId: "old-watch", name: "X" }),
    /Only the DM/,
  );
});

// ---------------------------------------------------------------- review fixes, round 2 (B26)

// The DM's "Loot" entry of a creature's token menu (GMG), as the Table runs it.
function tokenLoot(h, actorId = "goblin-1") {
  const target = { actorId, tokenId: "token-" + actorId, sceneId: "old-watch" };
  h.ctx.registry.run(h.ctx.registry.get("token-menu", "loot-open", h.ctx, target), h.ctx, target);
  return h.slice.parcels.at(-1);
}
const watchView = (h) => ({ scene: h.store.state.scenes.find((s) => s.id === "old-watch") });
const parcelCards = (html) => html.split('<aside class="loot-side"')[0];
const playerLabels = (h) =>
  h.store.state.log
    .filter((entry) => entry.kind === "change" && entry.visibility !== "private")
    .map((entry) => entry.label);

test("review 2 P1: no loot marker on a token hidden from the players; a Spectre audience sees it", () => {
  const h = harness();
  const parcel = tokenLoot(h);
  h.run("parcel-coins", { id: parcel.id }, { "coin-gp": 12 });
  h.run("parcel-reveal", { id: parcel.id });
  const token = watchView(h).scene.tokens.find((entry) => entry.actorId === "goblin-1");
  token.hidden = true; // B12 "Nascondi ai giocatori"
  h.ctx.role = "player";
  assert.equal(loot.renderMarkers(h.ctx, watchView(h)), "");
  const target = { actorId: "goblin-1", tokenId: token.id, sceneId: "old-watch" };
  assert.ok(!h.ctx.registry.list("token-menu", h.ctx, target).some((c) => c.id === "loot-open"));
  const cards = parcelCards(loot.renderLootDrawer(h.ctx));
  assert.match(cards, /data-parcel=/, "the shown parcel stays in the drawer");
  assert.doesNotMatch(cards, /Sentinella|Sulla creatura/, "nothing about the hidden creature");
  // VTL-143 Spectre: the DM shows the hidden token to Livia's player only.
  h.store.state.ext["token-menu"] = {
    tokens: { [token.id]: { audience: ["livia"] } },
    groups: {},
    names: {},
  };
  assert.match(loot.renderMarkers(h.ctx, watchView(h)), /data-loot-marker/);
  h.ctx.role = "dm";
  assert.match(loot.renderMarkers(h.ctx, watchView(h)), /data-loot-marker/);
});

test("review 2 P2: a creature parcel follows the creature's hidden name wherever players read it", () => {
  const h = harness();
  const parcel = tokenLoot(h);
  h.run("parcel-coins", { id: parcel.id }, { "coin-gp": 5 });
  const names = { tokens: {}, groups: {}, names: {} };
  h.store.state.ext["token-menu"] = names;
  setNameHidden(h.store.state, names, "goblin-1", true, "dm", "it"); // B12 "Nascondi il nome"
  h.run("parcel-reveal", { id: parcel.id });
  h.ctx.role = "player";
  const drawer = loot.renderLootDrawer(h.ctx);
  assert.doesNotMatch(drawer, /Sentinella/);
  assert.match(drawer, /Bottino: Creatura sconosciuta 1/);
  const marker = loot.renderMarkers(h.ctx, watchView(h));
  assert.match(marker, /aria-label="Bottino: Creatura sconosciuta 1"/);
  assert.doesNotMatch(marker, /Sentinella|Bottino: Bottino/);
  const notes = h.ctx.registry.notifications(h.ctx);
  assert.equal(notes[0].title.it, "Bottino da dividere: Creatura sconosciuta 1");
  assert.ok(!playerLabels(h).some((label) => label.includes("Sentinella")));
  assert.ok(!h.slice.ledger.some((entry) => /Sentinella/.test(entry.text.it + entry.text.en)));
  // The DM keeps the parcel on the creature; B12 adds the true name beside the alias.
  h.ctx.role = "dm";
  assert.match(loot.renderLootDrawer(h.ctx), /Sulla creatura: Creatura sconosciuta 1/);
  // Saving the details unchanged keeps the parcel named after the creature.
  h.run(
    "parcel-save",
    { id: parcel.id },
    { name: "Bottino: Sentinella", sceneId: "old-watch", sourceActorId: "goblin-1", note: "" },
  );
  h.ctx.role = "player";
  assert.doesNotMatch(loot.renderLootDrawer(h.ctx), /Sentinella/);
  // A name the DM writes is the DM's own.
  h.ctx.role = "dm";
  h.run(
    "parcel-save",
    { id: parcel.id },
    { name: "Borsa sporca", sceneId: "old-watch", sourceActorId: "goblin-1", note: "" },
  );
  assert.match(loot.renderMarkers(h.ctx, watchView(h)), /aria-label="Bottino: Borsa sporca"/);
});

test("review 2 P1: stash round trip keeps every inventory field and the row id", () => {
  const h = harness({ role: "player" });
  const livia = () => h.store.state.actors.livia;
  assert.equal(getFamiliarCastingAccess(livia()).ritualFromBook, true);
  for (const [rowId, field] of [
    ["sample-readable-spellbook", "spellbook"],
    ["sample-familiar-incense", "materialValueGp"],
  ]) {
    const before = structuredClone(livia().inventory.find((entry) => entry.id === rowId));
    stash.handleStashAction(h.ctx, "stash-deposit", {}, "livia", form({ row: rowId, quantity: 1 }));
    assert.ok(!livia().inventory.some((entry) => entry.id === rowId), rowId + " deposited");
    const kept = h.slice.stash.items.find((entry) => entry.name.en === before.name.en);
    assert.deepEqual(kept[field], before[field]);
    stash.handleStashAction(h.ctx, "stash-take", { id: kept.id }, "livia");
    const back = livia().inventory.find((entry) => entry.name.en === before.name.en);
    assert.equal(back.id, rowId, "the row keeps its id");
    assert.deepEqual(back[field], before[field]);
    assert.deepEqual(back.source, before.source);
    assert.equal(back.quantity, 1);
    assert.equal(back.equipped, false);
    assert.equal(back.identified, undefined);
    assert.equal(back.equippedBy, undefined);
  }
  assert.deepEqual(errorsOf(h), []);
  assert.equal(getFamiliarCastingAccess(livia()).ritualFromBook, true, "Find Familiar ritual");
});

test("review 2 P2: loot never merges into an equipped or special row", () => {
  const h = harness();
  h.run("parcel-create", {}, { name: "Rastrelliera" });
  const parcel = h.slice.parcels.at(-1);
  h.run("parcel-item-add", { id: parcel.id }, { srdId: "srd2024:item:quarterstaff", quantity: 1 });
  h.run("parcel-reveal", { id: parcel.id });
  const item = h.slice.parcels[0].items[0];
  h.run("assign", { id: parcel.id, item: item.id }, { target: "livia", quantity: 1 });
  const staffs = inv(h.store.state, "livia").filter((entry) => entry.name.en === "Quarterstaff");
  assert.deepEqual(
    staffs.map((entry) => [entry.id === "staff", entry.quantity, entry.equipped]),
    [
      [true, 1, true],
      [false, 1, false],
    ],
  );
  h.ctx.role = "player";
  const fresh = staffs[1];
  stash.handleStashAction(
    h.ctx,
    "stash-deposit",
    {},
    "livia",
    form({ row: fresh.id, quantity: 1 }),
  );
  assert.deepEqual(errorsOf(h), []);
  assert.ok(h.slice.stash.items.some((entry) => entry.srdId === "srd2024:item:quarterstaff"));
  // Two different spellbooks never become one stack in the stash.
  const book = (spell) => ({
    id: "b-" + spell,
    lootId: "b-" + spell,
    name: { it: "Libro", en: "Spellbook" },
    quantity: 1,
    kind: "gear",
    identified: true,
    spellbook: { spellIds: [spell], readable: true },
  });
  stash.stashAdd(h.slice, book("shield"), 1);
  stash.stashAdd(h.slice, book("sleep"), 1);
  assert.equal(h.slice.stash.items.filter((entry) => entry.spellbook).length, 2);
});

test("review 2 P2: a shown parcel with nothing handed out can be hidden again (Owlbear Loot!)", () => {
  const h = harness();
  h.run("parcel-create", {}, { name: "Forziere" });
  const parcel = h.slice.parcels.at(-1);
  h.run("parcel-coins", { id: parcel.id }, { "coin-gp": 10 });
  h.run("parcel-reveal", { id: parcel.id });
  h.run("parcel-reveal", { id: parcel.id });
  assert.deepEqual(errorsOf(h), []);
  assert.equal(h.slice.parcels[0].revealed, false);
  assert.equal(h.slice.ledger.at(-1).kind, "parcel-hidden");
  h.ctx.role = "player";
  assert.ok(!h.ctx.registry.list("table-panel", h.ctx, {}).some((c) => c.id === "loot"));
  h.ctx.role = "dm";
  h.run("parcel-reveal", { id: parcel.id });
  h.run("parcel-item-add", { id: parcel.id }, { srdId: "srd2024:item:torch", quantity: 2 });
  const torch = h.slice.parcels[0].items[0];
  h.run("assign", { id: parcel.id, item: torch.id }, { target: "livia", quantity: 1 });
  h.run("parcel-reveal", { id: parcel.id });
  assert.match(errorsOf(h).at(-1), /già stato distribuito/);
  assert.equal(h.slice.parcels[0].revealed, true);
});

test("review 2 P2: players see the item's Equipment data, never the stat block it came from", () => {
  const h = harness();
  h.run("parcel-create", {}, { name: "Tasche" });
  const parcel = h.slice.parcels.at(-1);
  h.run("parcel-statblock-add", { id: parcel.id }, { creatureId: "srd2024:creature:commoner" });
  h.run("parcel-reveal", { id: parcel.id });
  assert.match(loot.renderLootDrawer(h.ctx), /Copia pulita dal catalogo SRD: da Popolano/);
  h.ctx.role = "player";
  const cards = parcelCards(loot.renderLootDrawer(h.ctx));
  assert.doesNotMatch(cards, /Popolano|Non copiato|Copia pulita|Attacco/);
  assert.match(cards, /Randello/);
  assert.match(cards, /1d4 contundenti/, "the weapon's own Equipment damage");
});

test("review 2 P2: every stat block with Gear adds its gear, entries outside the catalog too", () => {
  for (const creature of loot.statBlocksWithGear()) {
    const items = loot.cleanGearFromStatBlock(creature.id);
    const count = creature.gear.length;
    assert.equal(items.length, count, creature.id);
    for (const item of items) assert.ok(item.name.it && item.name.en, creature.id);
  }
  const priest = loot.cleanGearFromStatBlock("srd2024:creature:priest");
  assert.deepEqual(
    priest.map((item) => item.name.en),
    ["Chain Shirt", "Holy Symbol", "Mace"],
  );
  assert.equal(priest[1].value, null, "value unknown");
  assert.equal(priest[1].srdId, null);
  assert.equal(priest[1].clean.from, "stat-block");
  const h = harness();
  h.run("parcel-create", {}, { name: "Tempio" });
  const parcel = h.slice.parcels.at(-1);
  const prep = loot.renderTreasurePrep(h.ctx);
  assert.match(prep, /Sacerdote · Giaco di maglia, Simbolo sacro, Mazza/);
  assert.match(prep, /Mago · Bacchetta/);
  h.run("parcel-statblock-add", { id: parcel.id }, { creatureId: "srd2024:creature:mage" });
  assert.deepEqual(errorsOf(h), []);
  assert.equal(h.slice.parcels[0].items[0].name.it, "Bacchetta");
});

test("review 2 P3: the XP bar stays within 0–100 below the level threshold", () => {
  const h = harness();
  const livia = h.store.state.actors.livia;
  livia.xp = 100;
  const html = stash.renderXp(h.ctx, livia);
  assert.match(html, /aria-valuenow="0"/);
  assert.match(html, /width:0%/);
  assert.match(html, /Sotto la soglia del livello 3 \(900 PE\)/);
  livia.xp = 5000;
  assert.match(stash.renderXp(h.ctx, livia), /aria-valuenow="100"/);
});

test("review 2 P3: markers name the parcel once; the notification opens its drawer", () => {
  const h = harness();
  const parcel = tokenLoot(h, "goblin-2");
  h.run("parcel-coins", { id: parcel.id }, { "coin-gp": 3 });
  h.run("parcel-reveal", { id: parcel.id });
  assert.match(loot.renderMarkers(h.ctx, watchView(h)), /aria-label="Bottino: Esploratore"/);
  h.ctx.lang = "en";
  assert.match(loot.renderMarkers(h.ctx, watchView(h)), /aria-label="Loot: Esploratore"/);
  h.ctx.lang = "it";
  h.ctx.role = "player";
  const [note] = h.ctx.registry.notifications(h.ctx);
  assert.deepEqual(note.target, { page: "table", params: { tab: loot.parcelRoute(parcel.id) } });
  assert.equal(loot.routedParcelId({ page: "table", tab: note.target.params.tab }), parcel.id);
  // Loot on a scene the party is not on cannot be reached from the Table: no notification.
  h.store.state.scenes.push({
    ...structuredClone(watchView(h).scene),
    id: "cellar",
    name: "Cantina",
  });
  h.ctx.role = "dm";
  h.run(
    "parcel-save",
    { id: parcel.id },
    { name: parcel.name, sceneId: "cellar", sourceActorId: "goblin-2", note: "" },
  );
  h.ctx.role = "player";
  assert.deepEqual(h.ctx.registry.notifications(h.ctx), []);
});
