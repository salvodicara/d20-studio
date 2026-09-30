import test from "node:test";
import assert from "node:assert/strict";
import { beginHealing, resolveHealing, patchCharacter, saveInventoryItem } from "../characters.mjs";

const actor = () => ({
  id: "livia",
  hp: 10,
  maxHp: 18,
  bonus: true,
  slots: { used: 2, max: 3 },
  inventory: [{ id: "potion", name: "Potion", quantity: 2, healing: 2 }],
  abilities: { str: 10, dex: 14, con: 12, int: 10, wis: 10, cha: 10 },
});

test("physical healing spends once at the attempt and stays pending until valid dice arrive", () => {
  const a = actor();
  beginHealing(a, "potion", { inCombat: true, mode: "physical", id: "attempt-1" });
  assert.equal(a.hp, 10);
  assert.equal(a.inventory[0].quantity, 1);
  assert.equal(a.bonus, false);
  assert.equal(a.pendingHealing.id, "attempt-1");
  assert.throws(() => resolveHealing(a, [0, 2]), /dice/i);
  assert.equal(a.hp, 10);
  assert.equal(a.inventory[0].quantity, 1);
  resolveHealing(a, [1, 2]);
  assert.equal(a.hp, 15);
  assert.equal(a.inventory[0].quantity, 1);
  assert.equal(a.pendingHealing, null);
  assert.deepEqual(a.lastHealing.faces, [1, 2]);
  assert.throws(() => resolveHealing(a, [4, 4]), /pending/i);
});

test("healing preview is not an attempt; unavailable action and duplicate pending attempt cannot consume", () => {
  const a = actor();
  a.bonus = false;
  assert.throws(() => beginHealing(a, "potion", { inCombat: true, mode: "digital" }), /bonus/i);
  assert.equal(a.inventory[0].quantity, 2);
  beginHealing(a, "potion", { inCombat: false, mode: "physical" });
  assert.throws(() => beginHealing(a, "potion", { inCombat: false, mode: "physical" }), /pending/i);
  assert.equal(a.inventory[0].quantity, 1);
});

test("healing caps hit points and retains the actual roll breakdown", () => {
  const a = actor();
  a.hp = 17;
  beginHealing(a, "potion", { mode: "digital", inCombat: false });
  const result = resolveHealing(a, [4, 4]);
  assert.equal(a.hp, 18);
  assert.equal(result.total, 10);
  assert.equal(result.applied, 1);
  assert.equal(result.overflow, 9);
});

test("editing identity and maximum hit points preserves damage, consumed slots and inventory", () => {
  const a = actor();
  patchCharacter(a, {
    name: "Livia II",
    className: "Wizard",
    level: 4,
    maxHp: 24,
    ac: 13,
    speed: 9,
    abilities: a.abilities,
  });
  assert.equal(a.hp, 16);
  assert.equal(a.slots.used, 2);
  assert.equal(a.inventory[0].quantity, 2);
  assert.equal(a.maxHp, 24);
  assert.throws(() => patchCharacter(a, { name: "", level: 0, maxHp: -1 }), /name/i);
});

test("inventory corrections reject negative amounts and preserve unrelated items", () => {
  const a = actor();
  assert.throws(
    () =>
      saveInventoryItem(a, {
        id: "potion",
        name: "Potion",
        quantity: -1,
        weight: 0,
        kind: "consumable",
      }),
    /quantity/i,
  );
  assert.equal(a.inventory[0].quantity, 2);
  saveInventoryItem(a, {
    id: "rope",
    name: "Rope",
    quantity: 1,
    weight: 2,
    kind: "gear",
    equipped: false,
    description: "Plain rope",
  });
  assert.equal(a.inventory.length, 2);
  assert.equal(a.inventory[0].quantity, 2);
});

test("a potion cannot be executed outside the creature turn", () => {
  const a = actor();
  assert.throws(() => beginHealing(a, "potion", { inCombat: true, canAct: false }), /turn/i);
  assert.equal(a.inventory[0].quantity, 2);
  assert.equal(a.bonus, true);
});

test("editing maximum HP does not revive a character at zero HP", () => {
  const a = actor();
  a.hp = 0;
  patchCharacter(a, {
    name: "Livia",
    className: "Wizard",
    level: 4,
    maxHp: 24,
    ac: 13,
    speed: 9,
    abilities: a.abilities,
  });
  assert.equal(a.hp, 0);
  assert.equal(a.maxHp, 24);
});

test("sheet rendering escapes authored content and hides NPCs from player collection", async () => {
  const { renderCharacters } = await import("../characters.mjs");
  const { createInitialState } = await import("../state.mjs");
  const { esc, icon } = await import("../ui.mjs");
  const state = createInitialState();
  state.actors.livia.inventory.push({
    id: "bad",
    name: "<img src=x onerror=alert(1)>",
    quantity: 1,
    weight: 0,
    kind: "gear",
    description: "<script>attack()</script>",
  });
  const ctx = {
    state,
    view: { page: "characters", id: "livia", tab: "inventory" },
    role: "player",
    lang: "it",
    t: (it) => it,
    esc,
    icon,
    label: (value) => (typeof value === "object" ? value.it : value),
    canControl: (a) => a.owner === "player",
  };
  const html = renderCharacters(ctx);
  assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"));
  assert.ok(!html.includes("<img src=x"));
  ctx.view = { page: "characters" };
  assert.ok(!renderCharacters(ctx).includes("Sentinella"));
  ctx.view = { page: "characters", id: "doran", tab: "inventory" };
  assert.ok(!renderCharacters(ctx).includes('data-character-action="add-item"'));
  assert.ok(!renderCharacters(ctx).includes('data-character-action="hp"'));
  ctx.view = { page: "characters", id: "goblin-1" };
  assert.ok(renderCharacters(ctx).includes("Scheda non disponibile"));
});

test("shared undo of physical result leaves the spent potion pending; next undo corrects the attempt", async () => {
  const { createStore } = await import("../state.mjs");
  const store = createStore();
  const before = structuredClone(store.state.actors.livia);
  store.commit("Drink", (s) =>
    beginHealing(s.actors.livia, "potion", { inCombat: true, mode: "physical" }),
  );
  store.commit("Record", (s) => resolveHealing(s.actors.livia, [1, 2]));
  store.undo();
  assert.equal(
    store.state.actors.livia.inventory.find((i) => i.id === "potion").quantity,
    before.inventory.find((i) => i.id === "potion").quantity - 1,
  );
  assert.ok(store.state.actors.livia.pendingHealing);
  assert.equal(store.state.actors.livia.hp, before.hp);
  store.undo();
  assert.equal(
    store.state.actors.livia.inventory.find((i) => i.id === "potion").quantity,
    before.inventory.find((i) => i.id === "potion").quantity,
  );
  assert.equal(store.state.actors.livia.bonus, true);
});

test("a recorded cantrip does not acquire a universal preparation toggle", async () => {
  const { renderCharacters } = await import("../characters.mjs");
  const { createInitialState } = await import("../state.mjs");
  const { esc, icon } = await import("../ui.mjs");
  const state = createInitialState();
  state.actors.livia.spells = [
    {
      id: "light",
      name: "Luce",
      level: 0,
      source: "Recorded grant",
      description: "",
      prepared: false,
    },
  ];
  const ctx = {
    state,
    view: { page: "characters", id: "livia", tab: "spells" },
    role: "player",
    t: (it) => it,
    esc,
    icon,
    label: (value) => (typeof value === "object" ? value.it : value),
    canControl: (a) => a.owner === "player",
  };
  assert.ok(!renderCharacters(ctx).includes('data-character-action="prepare-spell"'));
});

test("future plans remain private by demo identity, including DM control and legacy plans", async () => {
  const { renderCharacters, bindCharacters } = await import("../characters.mjs");
  const { createInitialState } = await import("../state.mjs");
  const { esc, icon } = await import("../ui.mjs");
  const state = createInitialState();
  state.actors.livia.futurePlan = "Legacy player secret";
  state.actors.doran.futurePlan = "Legacy DM secret";
  let dialog, click, commitOptions;
  const ctx = {
    state,
    view: { page: "characters", id: "livia", tab: "extras" },
    role: "player",
    t: (it) => it,
    esc,
    icon,
    label: (value) => (typeof value === "object" ? value.it : value),
    canControl: (a) => ctx.role === "dm" || a.owner === "player",
    dialog: (title, body, options) => {
      dialog = { title, body, options };
    },
    commit: (title, mutate, options) => {
      mutate(state);
      commitOptions = options;
    },
    toast: () => {},
  };
  bindCharacters(
    {
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: (type, handler) => {
        if (type === "click") click = handler;
      },
    },
    ctx,
  );
  const openPlan = () =>
    click({
      target: {
        closest: (selector) =>
          selector === "[data-character-action]"
            ? { dataset: { characterAction: "future-plan" } }
            : null,
      },
    });
  assert.ok(renderCharacters(ctx).includes("Legacy player secret"));
  ctx.role = "dm";
  assert.ok(!renderCharacters(ctx).includes("Legacy player secret"));
  openPlan();
  assert.ok(!dialog.body.includes("Legacy player secret"));
  let form = new FormData();
  form.set("text", "DM private intention");
  dialog.options.onSubmit(form);
  assert.equal(state.actors.livia.personalPlans.dm, "DM private intention");
  assert.equal(state.actors.livia.futurePlan, "Legacy player secret");
  assert.equal(commitOptions.local, true);
  ctx.role = "player";
  assert.ok(!renderCharacters(ctx).includes("DM private intention"));
  openPlan();
  assert.ok(dialog.body.includes("Legacy player secret"));
  form = new FormData();
  form.set("text", "Player private intention");
  dialog.options.onSubmit(form);
  assert.equal(state.actors.livia.personalPlans.player, "Player private intention");
  assert.equal(state.actors.livia.personalPlans.dm, "DM private intention");
  assert.ok(renderCharacters(ctx).includes("Player private intention"));
  ctx.role = "dm";
  assert.ok(renderCharacters(ctx).includes("DM private intention"));
  assert.ok(!renderCharacters(ctx).includes("Player private intention"));
  ctx.view.id = "doran";
  assert.ok(renderCharacters(ctx).includes("Legacy DM secret"));
  ctx.role = "player";
  assert.ok(!renderCharacters(ctx).includes("Legacy DM secret"));
  assert.ok(!renderCharacters(ctx).includes('data-character-action="future-plan"'));
});
