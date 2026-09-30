// P4 generator fixes: PR-55 (treasure by CR, individual or hoard, like AideDD / donjon, with
// «Metti nel bottino» into a Treasure parcel; palette words bottino, tesoro, gruzzolo,
// ricompensa) and PR-17 (Dungeon Alchemist auto-furnish: furniture and props by room type,
// placed as scene objects when the drafted scene is saved). Real store and registry with the
// areas they cooperate with, the handlers the panel calls. Synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import { resetPreparationDraft, saveSceneDraft } from "../preparation.mjs";
import * as tokenMenu from "../token-menu.mjs";
import * as loot from "../loot.mjs";
import * as compendium from "../compendium.mjs";
import * as ebUI from "../encounter-builder.mjs";
import * as rt from "../random-tables.mjs";
import * as sceneAssets from "../scene-assets.mjs";
import * as SA from "../scene-assets-domain.mjs";
import * as G from "../generators-domain.mjs";
import * as UI from "../generators.mjs";

function memory() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
function harness({ role = "dm", lang = "it" } = {}) {
  const storage = memory();
  const registry = createRegistry({ document: undefined, logger: null, deviceStorage: storage });
  registry.use("token-menu", tokenMenu.register);
  registry.use("loot", loot.register);
  registry.use("compendium", compendium.register);
  registry.use("encounter-builder", ebUI.register);
  registry.use("random-tables", rt.register);
  registry.use("scene-assets", sceneAssets.register);
  const row = registry.use("generators", UI.register);
  assert.equal(row.status, "built", row.error ?? "");
  const store = createStore({ storage });
  if (registry.initState(store.state).changed) store.persist();
  const toasts = [];
  const dialogs = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    rollDie: null,
    view: { page: "preparation", tab: "", id: "" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object"
        ? (value[ctx.lang] ?? value.it ?? value.en ?? "")
        : String(value ?? ""),
    esc,
    icon: () => "",
    toast: (text, error = false) => toasts.push({ text, error }),
    dialog: (title, body, options = {}) => dialogs.push({ title, body, options, open: true }),
    closeDialog() {
      const last = dialogs.at(-1);
      if (last) last.open = false;
    },
    render() {},
    navigate(page, params = {}) {
      ctx.view = { id: "", tab: "", ...params, page };
    },
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    canUndo: () => store.history.at(-1)?.controller === ctx.role,
    undoLabel: () => store.history.at(-1)?.label ?? "",
    commit(label, mutator, options = {}) {
      const before = store.state;
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      return { applied: true, persisted: true };
    },
    undo() {},
  };
  Object.defineProperty(ctx, "registry", { get: () => registry });
  registry.attach(ctx);
  UI.resetUi();
  resetPreparationDraft();
  return { ctx, toasts, dialogs, store, registry };
}

// ---------------------------------------------------------------- PR-55

test("PR-55: treasure by CR is reproducible from the seed; hoard and individual bands", () => {
  const a = G.generateTreasure({ seed: "LANTERNA-1", cr: "3", mode: "hoard" });
  const b = G.generateTreasure({ seed: "LANTERNA-1", cr: "3", mode: "hoard" });
  assert.deepEqual(a, b, "same seed, same hoard");
  assert.equal(a.band, "0-4");
  assert.ok(a.coins.gp >= 200 && a.coins.gp <= 800, "2d4 × 100 GP");
  assert.ok(a.items.length <= 3);
  for (const item of a.items) assert.ok(["common", "uncommon"].includes(item.rarity), item.rarity);
  assert.ok(a.valueCp >= a.coins.gp * 100);
  assert.equal(a.source.kind, "authored", "not presented as an SRD table");
  const rich = G.generateTreasure({ seed: "LANTERNA-2", cr: "12", mode: "individual", count: 2 });
  assert.equal(rich.band, "11-16");
  assert.ok(rich.coins.pp >= 40 && rich.coins.pp <= 400, "2 × 2d10 × 10 PP");
  assert.equal(rich.items.length, 0, "individual treasure is coins");
  assert.ok(rich.rolls.length >= 2, "each die roll is shown");
  const high = G.generateTreasure({ seed: "DRAGO-9", cr: "17", mode: "hoard" });
  assert.ok(high.items.length >= 1);
  // The prototype's SRD catalogue has no very rare or legendary item: the rarest there is
  // stands in, and the draft says so (never a silent substitution).
  for (const item of high.items)
    assert.ok(["very-rare", "legendary", "rare"].includes(item.rarity), item.rarity);
  if (high.items.some((item) => item.rarity === "rare")) assert.ok(high.fallback);
  assert.throws(() => G.generateTreasure({ seed: "X1", cr: "99", mode: "hoard" }), /GS|CR/);
});

test("PR-55: «Genera…» › Tesoro puts the hoard into a hidden Treasure parcel (IT/EN)", () => {
  const h = harness();
  UI.openGenerator(h.ctx, "treasure");
  let html = UI.panelHTML(h.ctx);
  assert.match(html, /data-gen-kind="treasure"[^>]*>[\s\S]*?Tesoro/);
  assert.match(html, /data-gen-opt="treasure.cr"/);
  assert.match(html, /data-gen-act="treasure-loot"[^>]*>[\s\S]*?Metti nel bottino/);
  const draft = UI.regenerate(h.ctx, { seed: "BRUMA-7" });
  assert.equal(draft.kind, "treasure");
  const parcelId = UI.putTreasureInLoot(h.ctx);
  const parcel = h.store.state.ext.loot.parcels.find((p) => p.id === parcelId);
  assert.ok(parcel, "a parcel in Treasure");
  assert.equal(parcel.revealed, false, "hidden until shown at the Table");
  assert.equal(parcel.coins.gp, draft.coins.gp);
  assert.equal(parcel.items.length, draft.items.length);
  assert.equal(parcel.sceneId, h.store.state.activeSceneId);
  assert.deepEqual(h.ctx.view, { id: "", tab: "loot", page: "preparation" });
  // Preparation › Treasure opens on the new parcel.
  assert.match(
    loot.renderTreasurePrep(h.ctx),
    new RegExp(`data-loot="parcel-pick" data-id="${parcelId}" aria-current="true"`),
  );
  // The palette finds it by the words a DM searches for.
  const command = h.registry.list("command", h.ctx).find((c) => c.id === "generators.treasure");
  assert.ok(command);
  for (const word of ["bottino", "tesoro", "gruzzolo", "ricompensa"])
    assert.ok(`${command.label.it} ${command.description.it}`.toLowerCase().includes(word), word);
  command.run(h.ctx);
  assert.equal(UI.uiState(h.ctx).kind, "treasure");
  h.ctx.lang = "en";
  html = UI.panelHTML(h.ctx);
  assert.match(html, /Put in the loot/);
  assert.match(html, /Treasure/);
});

// ---------------------------------------------------------------- PR-17

test("PR-17: the dungeon is furnished by room type (Dungeon Alchemist), reproducibly", () => {
  const dungeon = G.generateDungeon({ seed: "CORVO-2468", ...G.defaultDungeonOptions() });
  const props = G.furnishDungeon(dungeon);
  assert.deepEqual(props, G.furnishDungeon(dungeon), "same seed, same furniture");
  assert.ok(props.length >= dungeon.rooms.length, "every room gets something");
  const byRoom = (id) => props.filter((p) => p.room === id);
  for (const room of dungeon.rooms) {
    for (const p of byRoom(room.id)) {
      assert.ok(p.x > room.x * dungeon.cell && p.x < (room.x + room.w) * dungeon.cell, "inside");
      assert.ok(p.y > room.y * dungeon.cell && p.y < (room.y + room.h) * dungeon.cell, "inside");
    }
    const stickers = byRoom(room.id).map((p) => p.sticker);
    if (room.content === "treasure") assert.ok(stickers.includes("chest"), "a chest");
    if (room.content === "trap") {
      assert.ok(stickers.includes("trap"));
      assert.equal(byRoom(room.id).find((p) => p.sticker === "trap").hidden, true, "DM only");
    }
    if (room.content === "monster") assert.ok(stickers.includes("bedroll"), "a lair");
  }
});

test("PR-17: the furnished draft's objects become scene objects when the scene is saved", () => {
  const h = harness();
  UI.openGenerator(h.ctx, "dungeon");
  UI.regenerate(h.ctx, { seed: "CORVO-2468" });
  const html = UI.panelHTML(h.ctx);
  assert.match(html, /data-gen-opt="dungeon.furnish"[^>]*checked/, "on by default");
  assert.match(html, /class="gen-prop"/, "the preview shows the furniture");
  const draft = UI.uiState(h.ctx).drafts.dungeon;
  const id = UI.openDungeonDraft(h.ctx);
  assert.equal(SA.sliceOf(h.store.state).props[id], undefined, "nothing before the save");
  // The editor's save (the function its button calls) creates the scene: the objects follow.
  const scene = G.dungeonScene(draft, { id, lang: "it" });
  h.ctx.commit("save", (state) => saveSceneDraft(state, scene, "dm", null));
  const props = SA.sliceOf(h.store.state).props[id] ?? [];
  assert.equal(props.length, G.furnishDungeon(draft).length);
  assert.ok(props.some((p) => p.sticker === "chest" || p.sticker === "barrel"));
  assert.ok(props.filter((p) => p.sticker === "trap").every((p) => p.hidden));
});
