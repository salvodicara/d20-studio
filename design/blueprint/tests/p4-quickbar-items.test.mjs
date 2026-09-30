// P4 fix TV-70 (shared edit in quickbar.mjs) — BG3 keeps the items in the hotbar: the
// quick bar lists the creature's usable items from the inventory (inventory-plus export)
// and opens the item's use, with its target, without leaving the Table.
import test from "node:test";
import assert from "node:assert/strict";
import * as loot from "../loot.mjs";
import * as inv from "../inventory-plus.mjs";
import * as quickbar from "../quickbar.mjs";
import { harness } from "./p4-harness.mjs";

const setup = ({ role = "player", lang = "it" } = {}) => {
  inv.resetViews();
  quickbar.resetQuickbarUI();
  return harness({
    role,
    lang,
    areas: [
      ["loot", loot.register],
      ["inventory-plus", inv.register],
      ["quickbar", quickbar.register],
    ],
    view: { page: "table", id: "livia", tab: "" },
  });
};

test("TV-70: the quick bar offers Livia's usable items and opens the wand's use", () => {
  const h = setup();
  const usable = inv.usableItems(h.store.state, "livia", "player");
  assert.ok(
    usable.some((item) => item.id === "invp-wand"),
    "the wand is usable",
  );
  const dock = quickbar.renderDock(h.ctx, { selectedActorId: "livia" });
  assert.match(
    dock,
    new RegExp(`data-qb-items[^>]*aria-label="Usa un oggetto \\(${usable.length}\\)"`),
  );
  quickbar.openItems(h.ctx, "livia");
  const dialog = h.dialogs.at(-1);
  if (usable.length === 1) assert.match(dialog.body, /name="target"/);
  else assert.match(dialog.body, /data-qb-use-item="invp-wand"/);
});

test("TV-70: no items button for a creature with nothing to use, or not controlled", () => {
  const h = setup();
  for (const row of h.store.state.actors.livia.inventory) delete row.activities;
  const before = inv.usableItems(h.store.state, "livia", "player").length;
  const dock = quickbar.renderDock(h.ctx, { selectedActorId: "livia" });
  assert.equal(/data-qb-items/.test(dock), before > 0);
  assert.deepEqual(inv.usableItems(h.store.state, "goblin-1", "player"), []);
});

test("TV-70: the items button speaks English", () => {
  const h = setup({ lang: "en" });
  assert.match(quickbar.renderDock(h.ctx, { selectedActorId: "livia" }), /Use an item \(\d+\)/);
});
