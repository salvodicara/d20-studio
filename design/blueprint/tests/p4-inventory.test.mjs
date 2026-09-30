// P4 inventory fixes: PG-62 (D&D Beyond «+ Add Items»: a searchable catalogue inside the
// inventory, «Aggiungi» per row, a «Personalizzato» tab; Equip only on equippable items),
// PG-64 (dnd5e columns, BG3 sort), PG-74 (BG3 one-button weapon-set swap that stows what
// blocks it), PG-75 (Foundry dnd5e campaign currencies from the campaign, custom coins in
// containers), TV-70 (dnd5e Activities / BG3 hotbar items usable at the Table with targets).
// Real store and registry, the handlers the bound controls call. Synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import * as loot from "../loot.mjs";
import * as inv from "../inventory-plus.mjs";
import * as D from "../inventory-plus-domain.mjs";
import * as damageTray from "../damage-tray.mjs";
import { itemFromCatalog } from "../party-stash.mjs";
import { harness, form } from "./p4-harness.mjs";

const setup = ({ role = "player", lang = "it", extra = [], view } = {}) => {
  inv.resetViews();
  return harness({
    role,
    lang,
    areas: [["loot", loot.register], ["inventory-plus", inv.register], ...extra],
    view: view ?? { page: "characters", id: "livia", tab: "inventory" },
  });
};
const livia = (h) => h.store.state.actors.livia;
const tab = (h, id = "livia") => inv.renderTab(h.ctx, h.store.state.actors[id]);
const rowOrder = (html) => [...html.matchAll(/data-invp-row="([^"]+)"/g)].map((m) => m[1]);

// ---------------------------------------------------------------- PG-62

test("PG-62: «Aggiungi oggetto» opens the catalogue; one «Aggiungi» adds an SRD dagger", () => {
  const h = setup();
  assert.match(tab(h), /data-invp="add"[^>]*>[^<]*Aggiungi oggetto</);
  inv.handleInventoryAction(h.ctx, "livia", "add");
  const dialog = h.dialogs.at(-1);
  assert.equal(dialog.title, "Aggiungi oggetto");
  assert.match(dialog.body, /data-invp-add-search/, "search field");
  assert.match(dialog.body, /data-invp-add-tab="catalog"[^>]*aria-pressed="true"/);
  assert.match(dialog.body, /data-invp-add-tab="custom"[^>]*>Personalizzato</);
  assert.match(dialog.body, /data-invp-add-srd="srd2024:item:dagger"[^>]*>Aggiungi</);
  assert.match(dialog.body, /Pugnale/);
  const before = livia(h).inventory.length;
  inv.addFromCatalog(h.ctx, "livia", "srd2024:item:dagger");
  const dagger = livia(h).inventory.find((row) => row.srdId === "srd2024:item:dagger");
  assert.ok(dagger, "the dagger is on the sheet");
  assert.equal(livia(h).inventory.length, before + 1);
  assert.equal(dagger.quantity, 1);
  assert.ok(dagger.weapon, "an SRD weapon keeps its weapon data");
  inv.addFromCatalog(h.ctx, "livia", "srd2024:item:dagger");
  assert.equal(
    livia(h).inventory.filter((row) => row.srdId === "srd2024:item:dagger").length,
    1,
    "a second one stacks",
  );
  assert.equal(livia(h).inventory.find((row) => row.srdId === "srd2024:item:dagger").quantity, 2);
  assert.deepEqual(h.errors(), []);
  // The catalogue's rows can be searched in either language.
  assert.ok(inv.catalogRows(h.ctx, "livia").some((row) => row.search.includes("dagger")));
  // EN
  h.ctx.lang = "en";
  inv.handleInventoryAction(h.ctx, "livia", "add");
  assert.equal(h.dialogs.at(-1).title, "Add item");
  assert.match(h.dialogs.at(-1).body, />Custom</);
  assert.match(h.dialogs.at(-1).body, /Dagger/);
});

test("PG-62: the «Personalizzato» tab records an owned item; Enter adds the top catalogue match", () => {
  const h = setup();
  inv.handleInventoryAction(h.ctx, "livia", "add");
  h.submit({
    tab: "custom",
    name: "Lanterna rotta",
    kind: "gear",
    quantity: 1,
    weight: 1,
    description: "",
  });
  const lantern = livia(h).inventory.find((row) => D.rowName(row, "it") === "Lanterna rotta");
  assert.ok(lantern, "custom item saved");
  assert.equal(lantern.kind, "gear");
  assert.equal(D.isEquippable(lantern), false);
  inv.handleInventoryAction(h.ctx, "livia", "add");
  h.submit({
    tab: "custom",
    name: "Diadema di famiglia",
    kind: "gear",
    quantity: 1,
    weight: 0.1,
    equippable: "on",
  });
  const diadem = livia(h).inventory.find((row) => D.rowName(row, "it") === "Diadema di famiglia");
  assert.equal(D.isEquippable(diadem), true, "a worn custom item can be equipped");
  // A custom item needs a name: the dialog stays open with the message.
  inv.handleInventoryAction(h.ctx, "livia", "add");
  assert.throws(() => h.submit({ tab: "custom", name: "", kind: "gear", quantity: 1, weight: 0 }));
  // Enter in the catalogue search adds the first match (the picker's top result).
  inv.handleInventoryAction(h.ctx, "livia", "add");
  const kept = h.submit({ tab: "catalog", query: "corda di canapa", first: "srd2024:item:rope" });
  assert.equal(kept, false, "the catalogue stays open for the next item");
  assert.ok(livia(h).inventory.some((row) => row.srdId === "srd2024:item:rope"));
});

test("PG-62: campaign-enabled homebrew items are offered and go through the Library review", () => {
  const h = setup();
  const content = {
    id: "hb-lens",
    owner: "player",
    type: "item",
    revisions: [
      {
        id: "hb-lens-r1",
        createdAt: "2026-09-20T10:00:00.000Z",
        data: {
          name: { it: "Lente di Bruma", en: "Bruma Lens" },
          source: { rights: { share: true, modify: true, export: true } },
          dependencies: [],
          fields: { kind: "gear", weight: 0.1, value: 0 },
        },
      },
    ],
    // The DM reads it too: a campaign sheet's content must be readable by its audience.
    accessByRevision: { "hb-lens-r1": { readers: ["dm"], editors: [] } },
  };
  h.store.commit(
    "seed homebrew",
    (draft) => {
      draft.library = [content];
      draft.campaign.enabledContent = [{ contentId: "hb-lens", revisionId: "hb-lens-r1" }];
    },
    "player",
    { shared: true },
  );
  const rows = inv.catalogRows(h.ctx, "livia");
  const lens = rows.find((row) => row.homebrew);
  assert.ok(lens, "the enabled homebrew item is listed");
  assert.match(lens.search, /lente di bruma/);
  inv.handleInventoryAction(h.ctx, "livia", "add");
  assert.match(h.dialogs.at(-1).body, /data-invp-add-homebrew="hb-lens"/);
  inv.addHomebrew(h.ctx, "livia", "hb-lens", "hb-lens-r1");
  assert.equal(h.ctx.navigated.page, "library", "reviewed in the Library, as every homebrew");
  assert.equal(h.ctx.navigated.params.id, "hb-lens");
  assert.match(h.ctx.navigated.params.returnTo, /"actorId":"livia"/);
});

test("PG-62: «Equipaggia» only on equippable items (not rations, rope, incense, books)", () => {
  const h = setup();
  const html = tab(h);
  const equip = (id) => new RegExp(`data-invp="equip" data-invp-id="${id}"`).test(html);
  for (const id of ["invp-rations", "rope", "sample-familiar-incense", "sample-readable-spellbook"])
    assert.equal(equip(id), false, id);
  for (const id of ["invp-shortbow", "invp-cloak"]) assert.equal(equip(id), true, id);
  // The wand's first button is «Usa»; it can still be equipped from «Altro».
  assert.equal(D.isEquippable(D.rowById(livia(h), "invp-wand")), true);
  assert.equal(
    D.isEquippable({ kind: "gear", equipped: true }),
    true,
    "an equipped row can be put away",
  );
});

// ---------------------------------------------------------------- PG-64

test("PG-64: sort by name, weight, value and rarity; optional columns", () => {
  const h = setup();
  inv.handleInventoryAction(h.ctx, "livia", "sort", "name");
  let html = tab(h);
  assert.match(html, /data-invp-sort[^>]*>[\s\S]*value="name" selected/);
  const byName = rowOrder(html)
    .map((id) => D.rowName(D.rowById(livia(h), id), "it"))
    .filter(Boolean);
  // Top level (carried) rows are alphabetical.
  const top = rowOrder(html)
    .map((id) => D.rowById(livia(h), id))
    .filter((row) => !D.parentOf(livia(h), row))
    .map((row) => D.rowName(row, "it"));
  assert.deepEqual(
    top,
    [...top].sort((a, b) => a.localeCompare(b, "it")),
  );
  assert.ok(byName.length > 5);
  inv.handleInventoryAction(h.ctx, "livia", "sort", "weight");
  const weights = rowOrder(tab(h))
    .map((id) => D.rowById(livia(h), id))
    .filter((row) => !D.parentOf(livia(h), row))
    .map((row) => D.unitWeight(row) ?? -1);
  assert.deepEqual(
    weights,
    [...weights].sort((a, b) => b - a),
    "heaviest first",
  );
  inv.handleInventoryAction(h.ctx, "livia", "sort", "rarity");
  const rarities = rowOrder(tab(h))
    .map((id) => D.rowById(livia(h), id))
    .filter((row) => !D.parentOf(livia(h), row))
    .map((row) => D.RARITIES.indexOf(D.rarityOf(row) ?? ""));
  assert.deepEqual(
    rarities,
    [...rarities].sort((a, b) => b - a),
    "rarest first",
  );
  inv.handleInventoryAction(h.ctx, "livia", "sort", "value");
  const values = rowOrder(tab(h))
    .map((id) => D.rowById(livia(h), id))
    .filter((row) => !D.parentOf(livia(h), row))
    .map((row) => (Number.isFinite(row.value) ? row.value : -1));
  assert.deepEqual(
    values,
    [...values].sort((a, b) => b - a),
    "most valuable first",
  );
  // Columns (dnd5e): weight and quantity by default, value and charges on request.
  html = tab(h);
  assert.match(html, /data-invp-col="weight"/);
  assert.doesNotMatch(html, /data-invp-col="value"/);
  inv.handleInventoryAction(h.ctx, "livia", "column", "value");
  html = tab(h);
  assert.match(html, /data-invp-col="value"/);
  assert.match(html, /data-invp-column="value"[^>]*aria-pressed="true"/);
  inv.handleInventoryAction(h.ctx, "livia", "column", "weight");
  assert.doesNotMatch(tab(h), /data-invp-col="weight"/);
  // EN labels
  h.ctx.lang = "en";
  assert.match(tab(h), />Sort by</);
});

// ---------------------------------------------------------------- PG-74

test("PG-74 set swap auto-stow: «Cambia set» puts away what blocks the other set (BG3)", () => {
  const h = setup();
  // A silver dagger held outside the sets, as in the audit.
  h.store.commit(
    "dagger in hand",
    (draft) => {
      const dagger = itemFromCatalog("srd2024:item:dagger");
      dagger.id = "silver-dagger";
      dagger.name = { it: "Pugnale d’argento", en: "Silver dagger" };
      dagger.equipped = true;
      draft.actors.livia.inventory.push(dagger);
    },
    "player",
    { shared: true },
  );
  assert.equal(D.weaponSetsOf(livia(h)).active, "melee");
  inv.handleInventoryAction(h.ctx, "livia", "swap");
  assert.deepEqual(h.errors(), [], "no refusal");
  const rows = Object.fromEntries(livia(h).inventory.map((row) => [row.id, row]));
  assert.equal(rows["invp-shortbow"].equipped, true, "the bow is in hand");
  assert.equal(rows["silver-dagger"].equipped, false, "the dagger was stowed");
  assert.equal(rows.staff.equipped, false, "the staff left the hands");
  assert.equal(D.weaponSetsOf(livia(h)).active, "ranged");
  assert.match(
    D.sliceOf(h.store.state).ledger.at(-1).text.it,
    /ripone Pugnale d’argento/,
    "the log says what was put away",
  );
  // Back to melee: the staff returns, and the dagger the melee set held comes back with it
  // (BG3: the melee set is main hand and off hand).
  inv.handleInventoryAction(h.ctx, "livia", "swap");
  const back = Object.fromEntries(livia(h).inventory.map((row) => [row.id, row]));
  assert.equal(back.staff.equipped, true);
  assert.equal(back["silver-dagger"].equipped, true, "the off-hand dagger is back");
  assert.equal(back["invp-shortbow"].equipped, false);
  assert.match(D.sliceOf(h.store.state).ledger.at(-1).text.it, /riprende Pugnale d’argento/);
});

test("PG-74: Doran's shield goes away with the longbow and comes back with the sword", () => {
  const h = setup({ role: "dm", view: { page: "characters", id: "doran", tab: "inventory" } });
  const doran = () => h.store.state.actors.doran;
  const eq = (id) => doran().inventory.find((row) => row.id === id).equipped;
  assert.equal(eq("invp-doran-shield"), true);
  inv.handleInventoryAction(h.ctx, "doran", "swap");
  assert.deepEqual(h.errors(), []);
  assert.equal(eq("invp-doran-longbow"), true);
  assert.equal(eq("invp-doran-shield"), false);
  assert.equal(eq("invp-doran-longsword"), false);
  inv.handleInventoryAction(h.ctx, "doran", "swap");
  assert.equal(eq("invp-doran-longsword"), true);
  assert.equal(eq("invp-doran-shield"), true, "BG3: the melee set brings its shield back");
  assert.equal(eq("invp-doran-longbow"), false);
});

test("PG-74: a refusal of «Cambia set» never tells to press «Cambia set»", () => {
  const h = setup();
  h.store.commit(
    "no ranged set",
    (draft) => {
      draft.actors.livia.weaponSets.ranged = null;
    },
    "player",
    { shared: true },
  );
  inv.handleInventoryAction(h.ctx, "livia", "swap");
  assert.equal(h.errors().length, 1);
  assert.doesNotMatch(h.errors()[0], /Cambia set/);
});

// ---------------------------------------------------------------- PG-75

test("PG-75: campaign currencies live in the campaign (section and palette command)", () => {
  const h = setup({ role: "dm", view: { page: "campaign", tab: "inventory-plus-currencies" } });
  const section = h.registry
    .list("campaign-section", h.ctx)
    .find((c) => c.id === "inventory-plus-currencies");
  assert.ok(section, "DM section");
  assert.equal(section.group, "manage");
  const html = section.render(h.ctx);
  assert.match(html, /data-campaign-heading[^>]*>Valute della campagna</);
  assert.match(html, /Scaglia di Bruma|Scaglia/, "the sample currency is listed");
  assert.match(html, /data-invp-currency-new/);
  const command = h.registry
    .list("command", h.ctx)
    .find((c) => c.id === "inventory-plus-currencies");
  assert.ok(command);
  assert.match(command.label.it, /Valute/);
  assert.match(command.label.it, /monete/);
  for (const word of ["valuta", "moneta", "monete"])
    assert.ok(command.description.it.includes(word), word);
  command.run(h.ctx);
  assert.deepEqual(h.ctx.navigated, {
    page: "campaign",
    params: { tab: "inventory-plus-currencies" },
  });
  // Players read the currencies but do not edit them.
  h.ctx.role = "player";
  assert.ok(
    !h.registry.list("command", h.ctx).some((c) => c.id === "inventory-plus-currencies"),
    "no DM command for players",
  );
});

test("PG-75: custom currencies can go into a container and weigh there", () => {
  const h = setup();
  const def = D.currenciesOf(h.store.state)[0];
  assert.ok(def, "a sample currency exists");
  inv.handleInventoryAction(h.ctx, "livia", "container-coins", "invp-backpack");
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.body, new RegExp(`name="custom-${def.id}"`), "custom coins offered");
  const before = livia(h).customCoins[def.id];
  dialog.options.onSubmit(form({ direction: "in", [`custom-${def.id}`]: 5 }));
  assert.equal(livia(h).customCoins[def.id], before - 5);
  const bag = D.rowById(livia(h), "invp-backpack");
  assert.equal(D.containerCustomCoins(bag)[def.id], 5);
  const weight = D.contentsWeight(livia(h), bag, h.store.state).kg;
  const without = D.contentsWeight(livia(h), bag).kg;
  assert.ok(weight > without || def.weightKg === 0, "custom coins weigh in the container");
  assert.match(tab(h), new RegExp(`data-invp-container-coins="invp-backpack"[^>]*>[^<]*5`));
  // And back out.
  inv.handleInventoryAction(h.ctx, "livia", "container-coins", "invp-backpack");
  h.dialogs.at(-1).options.onSubmit(form({ direction: "out", [`custom-${def.id}`]: 5 }));
  assert.equal(livia(h).customCoins[def.id], before);
});

// ---------------------------------------------------------------- TV-70

test("TV-70: usable items are listed for the Table and used there with targets", () => {
  const h = setup({
    role: "player",
    extra: [["damage-tray", damageTray.register]],
    view: { page: "table" },
  });
  const usable = inv.usableItems(h.store.state, "livia", "player");
  assert.ok(
    usable.some((row) => row.id === "invp-wand"),
    "the wand is usable",
  );
  assert.ok(!usable.some((row) => row.id === "invp-rations"));
  const panel = inv.renderInspector(h.ctx, { selectedActorId: "livia" });
  assert.match(panel, /data-invp-use-item="invp-wand"/);
  // At the Table the dialog asks for targets (visible creatures on the scene).
  inv.openItemUse(h.ctx, "livia", "invp-wand");
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.body, /data-invp-targets/);
  assert.match(dialog.body, /name="target" value="goblin-1"|name="target" value="goblin-2"/);
  const target = /name="target" value="(goblin-[12])"/.exec(dialog.body)[1];
  h.ctx.rollDie = () => 3;
  dialog.options.onSubmit(
    form({ activity: "magic-missile", charges: 1, consume: "on", mode: "digital", target }),
  );
  assert.equal(D.rowById(livia(h), "invp-wand").charges.value, 2, "one charge spent");
  const proposals = h.store.state.ext["damage-tray"].proposals;
  assert.equal(proposals.length, 1, "the damage goes to the DM for the chosen target");
  assert.equal(proposals[0].actorId, target);
  assert.equal(proposals[0].amount, 12, "three darts of 1d4 + 1 = 3 × 4");
  assert.equal(proposals[0].type, "force");
});

test("TV-70: the DM using an item applies the damage to the targets directly", () => {
  const h = setup({
    role: "dm",
    extra: [["damage-tray", damageTray.register]],
    view: { page: "table" },
  });
  const goblin = h.store.state.actors["goblin-1"];
  const hp = goblin.hp;
  h.ctx.rollDie = () => 1;
  inv.openItemUse(h.ctx, "livia", "invp-wand");
  h.dialogs.at(-1).options.onSubmit(
    form({
      activity: "magic-missile",
      charges: 1,
      consume: "on",
      mode: "digital",
      target: "goblin-1",
    }),
  );
  assert.equal(h.store.state.actors["goblin-1"].hp, Math.max(0, hp - 6), "3 darts × (1 + 1)");
});
