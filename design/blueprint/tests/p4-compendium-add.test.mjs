// P4 fix PG-62 (shared edit in compendium.mjs) — D&D Beyond «Add» on each search result
// while shopping for a sheet: «Sfoglia la biblioteca» from Livia's inventory lists items
// with «Aggiungi» on the row itself, which opens the add-to-sheet confirmation for her.
// Real store and registry; a minimal root that hands the bound buttons to the test.
import test from "node:test";
import assert from "node:assert/strict";
import * as compendium from "../compendium.mjs";
import { harness } from "./p4-harness.mjs";

const setup = (lang = "it", tab = "inventory") =>
  harness({
    role: "player",
    lang,
    areas: [["compendium", compendium.register]],
    view: {
      page: "library",
      tab: "compendium",
      id: "",
      revision: "",
      returnTo: JSON.stringify({ page: "characters", actorId: "livia", tab }),
    },
  });
// Only the buttons this test presses: [data-compendium-add="…"].
function mount(ctx) {
  const html = compendium.renderCompendium(ctx);
  const nodes = [...html.matchAll(/<button\b[^>]*data-compendium-add="([^"]+)"[^>]*>/g)].map(
    ([, id]) => ({ dataset: { compendiumAdd: id } }),
  );
  const el = {
    isConnected: true,
    querySelectorAll: (selector) => (selector === "[data-compendium-add]" ? nodes : []),
    querySelector: () => null,
    addEventListener() {},
    contains: () => true,
  };
  compendium.bindCompendium(el, ctx);
  return { html, nodes };
}

test("PG-62: result rows offer «Aggiungi» for the sheet being chosen for", () => {
  compendium.resetUiState?.();
  const h = setup();
  const { html, nodes } = mount(h.ctx);
  assert.match(html, /Scegli per <strong>Livia<\/strong>/);
  const dagger = nodes.find((n) => n.dataset.compendiumAdd === "srd2024:item:dagger");
  assert.ok(dagger, "the dagger row has its own «Aggiungi»");
  assert.match(html, /aria-label="Aggiungi Pugnale a Livia"/);
  dagger.onclick({ preventDefault() {} });
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.body, /<option value="livia" selected>/);
  h.submit({ actor: "livia", quantity: "1" });
  assert.deepEqual(h.errors(), []);
  assert.ok(
    h.store.state.actors.livia.inventory.some((r) => r.compendiumRef?.id === "srd2024:item:dagger"),
    "added to Livia",
  );
  assert.deepEqual(h.ctx.navigated, {
    page: "characters",
    params: { id: "livia", tab: "inventory" },
  });
});

test("PG-62: no «Aggiungi» on the rows without a sheet to choose for", () => {
  compendium.resetUiState?.();
  const h = harness({
    role: "player",
    areas: [["compendium", compendium.register]],
    view: { page: "library", tab: "compendium", id: "", revision: "", returnTo: "" },
  });
  assert.doesNotMatch(compendium.renderCompendium(h.ctx), /data-compendium-add=/);
});

test("PG-62: the row button speaks English", () => {
  compendium.resetUiState?.();
  const h = setup("en");
  assert.match(compendium.renderCompendium(h.ctx), /aria-label="Add Dagger to Livia"/);
});
