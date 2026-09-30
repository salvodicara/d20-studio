// R4 (fix round 2) — SV-37 part (Roll20's errors name the cause and the fix): every disabled
// command in the package's files carries one sentence «cause. remedy.» beside it, linked by
// aria-describedby; a control that cannot be enabled for this viewer reads as text instead.
// A source scan of the package's modules plus rendered states. Synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderCharacters } from "../characters.mjs";
import * as sheetPlus from "../sheet-plus.mjs";
import * as SD from "../sheet-plus-domain.mjs";
import * as inv from "../inventory-plus.mjs";
import * as loot from "../loot.mjs";
import * as quickbar from "../quickbar.mjs";
import * as QD from "../quickbar-domain.mjs";
import * as diceTray from "../dice-tray.mjs";
import { harness } from "./p4-harness.mjs";

const FILES = [
  "characters.mjs",
  "sheet-plus.mjs",
  "quickbar.mjs",
  "inventory-plus.mjs",
  "merchants.mjs",
  "party-stash.mjs",
  "projects.mjs",
  "rest-ui.mjs",
  "travel.mjs",
  "generators.mjs",
  "loot.mjs",
  "camp.mjs",
  "bastions.mjs",
];
// Where a module writes the attribute through its own helper (the reason travels with it).
const HELPERS = [
  /const disabled = lockedReason/,
  /\$\{disabled/,
  /disabled = false, icon/,
  /\$\{disabled \? " disabled" : ""\}\$\{describedBy/,
  /disabled: [^,]+,\s*describedBy/,
];

test("SV-37: no disabled attribute in the package's markup without its described reason", () => {
  const missing = [];
  for (const file of FILES) {
    const source = readFileSync(new URL("../" + file, import.meta.url), "utf8");
    for (const match of source.matchAll(/disabled/g)) {
      const at = match.index;
      const around = source.slice(Math.max(0, at - 60), at + 160);
      const line = source.slice(source.lastIndexOf("\n", at) + 1, source.indexOf("\n", at));
      if (source[at - 1] === "." || source[at - 1] === "-") continue; // .disabled, aria-disabled
      if (/^\s*(\/\/|\*)/.test(line)) continue; // comments
      if (/:not\(\[disabled\]\)/.test(around)) continue;
      if (HELPERS.some((re) => re.test(around))) continue;
      if (/aria-describedby/.test(source.slice(at, at + 140))) continue;
      missing.push(`${file}:${source.slice(0, at).split("\n").length}`);
    }
  }
  assert.deepEqual(missing, []);
});

// Controls of other packages rendered inside the same page (the dice tray's Inspiration
// switch, R2) are checked by their own package.
const FOREIGN = /data-dtray-|data-conditions-/;
/** Every disabled control of this package in `html` names a reason element with text. */
function assertDescribed(html, where) {
  const tags = (
    html.match(/<(button|input|select|textarea)\b[^>]*\sdisabled\b[^>]*>/g) ?? []
  ).filter((tag) => !FOREIGN.test(tag));
  for (const tag of tags) {
    const ids = tag.match(/aria-describedby="([^"]+)"/)?.[1];
    assert.ok(ids, `${where}: ${tag}`);
    for (const id of ids.split(/\s+/)) {
      const at = html.indexOf(`id="${id}"`);
      assert.ok(at >= 0, `${where}: no element #${id}`);
      const text = html
        .slice(html.indexOf(">", at) + 1, html.indexOf(">", at) + 400)
        .replace(/<[^>]+>/g, " ")
        .trim();
      assert.ok(text.length > 3, `${where}: empty reason #${id}`);
    }
  }
  return tags.length;
}

const sheet = (role = "player", view = { page: "characters", id: "livia", tab: "actions" }) =>
  harness({
    role,
    areas: [
      ["loot", loot.register],
      ["dice-tray", diceTray.register],
      ["inventory-plus", inv.register],
      ["sheet-plus", sheetPlus.register],
      ["quickbar", quickbar.register],
    ],
    view,
  });

test("SV-37: the sheet's level-up, checks and features say why they are off", () => {
  const h = sheet("dm", { page: "characters", id: "doran", tab: "features" });
  h.ctx.commit("dati", (s) => {
    s.actors.doran.level = 20;
    s.actors.doran.abilities.str = null;
  });
  let html = renderCharacters(h.ctx);
  assert.ok(assertDescribed(html, "Doran features") >= 2);
  assert.match(html, /Livello massimo raggiunto \(20\)/);
  assert.match(html, /Nessun uso rimasto: si recupera con il riposo indicato/);
  // The fallback Actions tab (no sheet-plus area) lists the ability checks itself.
  const bare = harness({ role: "dm", view: { page: "characters", id: "doran", tab: "actions" } });
  bare.ctx.commit("dati", (s) => (s.actors.doran.abilities.str = null));
  html = renderCharacters(bare.ctx);
  assert.ok(assertDescribed(html, "Doran actions") >= 1);
  assert.match(html, /Un punteggio non è registrato/);
});

test("SV-37: a read-only viewer reads Inspiration and effects as text, not inert controls", () => {
  const h = sheet("player", { page: "characters", id: "doran", tab: "actions" });
  h.ctx.commit("benedizione", (s) => SD.toggleEffect(s, "doran", "bless", true, "dm"));
  const html = renderCharacters(h.ctx);
  assertDescribed(html, "Doran read-only");
  assert.doesNotMatch(html, /data-shp="effect"[^>]*disabled/);
  assert.match(html, /shp-switch is-static is-on/);
  assert.doesNotMatch(html, /data-character-action="inspiration"[^>]*disabled/);
});

test("SV-37: Wild Shape with no use left and a missing favourite carry their reasons", () => {
  const h = sheet("player", { page: "characters", id: "mira", tab: "actions" });
  h.ctx.commit("usi", (s) => {
    const mira = s.actors.mira;
    mira.features.find((f) => f.id === mira.formsProfile.wildShapeFeatureId).used = 2;
    SD.toggleFavorite(s, "livia", { kind: "item", id: "potion" }, "player");
    s.actors.livia.inventory = s.actors.livia.inventory.filter((row) => row.id !== "potion");
  });
  h.ctx.openForms = () => {};
  const actions = sheetPlus._test.renderActions(h.ctx, h.store.state.actors.mira);
  assert.ok(assertDescribed(actions, "Mira actions") >= 1);
  assert.match(actions, /Nessun uso rimasto/);
  const bar = sheetPlus._test.renderBar(h.ctx, h.store.state.actors.livia);
  assert.ok(assertDescribed(bar, "Livia favourites") >= 1);
  assert.match(bar, /Non più sulla scheda/);
});

test("SV-37: inventory «Bevi» and «Equipaggia» say why they are off", () => {
  const h = sheet("player", { page: "characters", id: "livia", tab: "inventory" });
  h.ctx.commit("stato", (s) => {
    s.combat.active = true;
    s.combat.turn = 0;
    s.actors.livia.bonus = false;
    s.actors.livia.inventory.find((row) => row.id === "staff").quantity = 0;
  });
  const html = inv.renderTab(h.ctx, h.store.state.actors.livia);
  assert.ok(assertDescribed(html, "Livia inventory") >= 2);
  assert.match(html, /Azione bonus già spesa in questo turno\. Bevi nel prossimo turno\./);
  assert.match(html, /Quantità zero: non c’è niente da equipaggiare/);
});

test("SV-37: the quick bar menu explains a full bar and the last page", () => {
  const h = sheet("player", { page: "table", id: "", tab: "" });
  quickbar.resetQuickbarUI();
  quickbar.openMenu(h.ctx, "livia");
  let body = h.dialogs.at(-1).body;
  assert.ok(assertDescribed(body, "one page") >= 1);
  assert.match(body, /È l’unica pagina/);
  h.ctx.commit("pagine", (s) => {
    for (let i = 1; i < QD.MAX_PAGES; i++) QD.addPage(s, s.ext[QD.ID], "player", "livia", `P${i}`);
  });
  quickbar.openMenu(h.ctx, "livia");
  body = h.dialogs.at(-1).body;
  assert.ok(assertDescribed(body, "five pages") >= 2);
  assert.match(body, /già 5 pagine, il massimo/);
  const dock = quickbar.renderDock(h.ctx, { selectedActorId: "mira" });
  assertDescribed(dock, "Mira dock");
});
