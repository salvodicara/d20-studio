// Reconciliation after the audit fix packages (interview-01, 27/09/2026): two regressions
// found by the browser journeys once every package was integrated.
//
// 1. The phone journey of the handouts area opened a scene row's «Altre azioni» at 390 px:
//    the menu hung from the left edge of its summary, the third button of a wrapped actions
//    row, and ran 105 px past the right edge; the page widened, the phone zoomed out and the
//    tap on «Attiva per il gruppo» missed once the menu closed. On a phone the menu now spans
//    the row's actions (the actions block is its anchor), so it can never leave the screen.
// 2. B62 invariant broken by P5's cost filter (TV-67): at 1366 × 768 and 1440 × 900 Livia's
//    seven actions keep two rows beside «Mosse». The filter «Tutte · Solo azioni · Reazioni»
//    took 111 px of the first row and pushed Disengage into a third row that only scrolled
//    into view; «Solo azioni» filtered nothing (every one of her actions costs an action). A
//    cost filter now appears only when it narrows the list, «Tutte» only beside two or more
//    filters, and a lone filter is a toggle (press again for every action): D&D Beyond's
//    action filters.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerActionProvider } from "../combat.mjs";
import { renderCombatBar, bindCombatUI, resetCombatUI } from "../combat-ui.mjs";
import { harness } from "./p5-harness.mjs";

const css = readFileSync(new URL("../preparation.css", import.meta.url), "utf8");
const phoneBlock = () => {
  const start = css.indexOf("@media (max-width: 760px) {");
  assert.ok(start >= 0, "phone block of preparation.css");
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(start, i + 1);
  }
  throw Error("unclosed phone block");
};

test("phone: a scene row's «Altre azioni» menu spans the actions row, inside the screen", () => {
  const phone = phoneBlock();
  assert.match(phone, /\.prep-scene-actions \{[^}]*position: relative;/);
  assert.match(phone, /\.prep-menu \{\s*position: static;\s*\}/);
  const menu = phone.match(/\.prep-menu > div \{([^}]*)\}/)?.[1] ?? "";
  assert.match(menu, /left: 0;/);
  assert.match(menu, /right: 0;/);
  assert.match(menu, /width: auto;/);
  assert.match(menu, /min-width: 0;/);
  assert.match(menu, /max-width: none;/);
  assert.doesNotMatch(menu, /right: auto;/, "the menu no longer hangs from its summary's left");
});

const filtersOf = (html) =>
  [...html.matchAll(/data-combat-filter="([a-z]+)" aria-pressed="(true|false)"/g)].map(
    (m) => `${m[1]}:${m[2]}`,
  );
const press = (h, actorId, id) => {
  let html = "";
  const button = { dataset: { combatFilter: id } };
  bindCombatUI(
    {
      querySelectorAll: (selector) => (selector === "[data-combat-filter]" ? [button] : []),
      querySelector: () => null,
    },
    { ...h.ctx, render: () => (html = renderCombatBar(h.ctx, actorId)) },
    actorId,
  );
  button.onclick();
  return html;
};

test("action bar: only filters that narrow the list; a lone filter toggles back to every action", () => {
  resetCombatUI();
  const h = harness({ role: "player" });
  const html = renderCombatBar(h.ctx, "livia");
  assert.deepEqual(filtersOf(html), ["reaction:false"], "no «Tutte», no «Solo azioni»");
  assert.match(html, /data-combat-action="disengage"/);
  const reactions = press(h, "livia", "reaction");
  assert.deepEqual(filtersOf(reactions), ["reaction:true"]);
  assert.match(reactions, /data-combat-reaction="shield"/);
  assert.doesNotMatch(reactions, /data-combat-action="disengage"/);
  const back = press(h, "livia", "reaction");
  assert.deepEqual(filtersOf(back), ["reaction:false"]);
  assert.match(back, /data-combat-action="disengage"/);
  assert.doesNotMatch(back, /data-combat-reaction=/);
  resetCombatUI();
});

test("action bar: with actions and bonus actions the filter keeps «Tutte» and each cost", () => {
  resetCombatUI();
  const off = registerActionProvider({
    list: (state, actor) =>
      actor.id === "livia"
        ? [
            {
              id: "reconcile-offhand",
              name: { it: "Pugnale (mano secondaria)", en: "Dagger (off hand)" },
              kind: "self",
              targetMode: "self",
              cost: { bonus: 1 },
              rangeMeters: 0,
              dice: [],
            },
          ]
        : [],
  });
  try {
    const h = harness({ role: "player" });
    const html = renderCombatBar(h.ctx, "livia");
    assert.deepEqual(filtersOf(html), [
      "all:true",
      "action:false",
      "bonus:false",
      "reaction:false",
    ]);
    const bonus = press(h, "livia", "bonus");
    assert.match(bonus, /data-combat-action="reconcile-offhand"/);
    assert.doesNotMatch(bonus, /data-combat-action="disengage"/);
    // Pressing the active filter again also returns to every action.
    const all = press(h, "livia", "bonus");
    assert.deepEqual(filtersOf(all).slice(0, 1), ["all:true"]);
    assert.match(all, /data-combat-action="disengage"/);
  } finally {
    off();
    resetCombatUI();
  }
});

// B62 × PG-46 (P6): the hit points row and the spell-slot pips grew the hotbar identity to
// 104 px and the combat hotbar to 125 px, so the Table scrolled 4 px at 1440 × 900 (B62: one
// bar of at most 120 px, no page scroll). From 721 px the identity's small lines (turn line,
// slot pips, resources) keep their order with a tighter line height and spacing.
test("hotbar identity: HP, turn line, slot pips and resources fit the one-height bar", () => {
  const styles = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const at = styles.indexOf("/* Reconcile (27/09): hotbar identity");
  assert.ok(at > 0, "the reconcile rule block");
  const block = styles.slice(at, styles.indexOf("\n}\n", at) + 3);
  assert.match(block, /^@media \(min-width: 721px\) \{/m);
  assert.match(
    block,
    /\.action-dock\.table-hotbar > \.hotbar-identity > div > span \{\s*margin-top: 0;\s*line-height: 1\.3;\s*\}/,
  );
  assert.match(
    block,
    /\.table-hotbar \.hotbar-slots \{\s*margin-top: 1px;\s*line-height: 1\.3;\s*\}/,
  );
  assert.match(
    block,
    /\.action-dock\.table-hotbar \.resources \{\s*padding-top: 2px;\s*line-height: 1\.3;\s*\}/,
  );
  // It comes after the PG-46 rules it tightens.
  assert.ok(at > styles.indexOf(".hotbar-slots {"), "after the PG-46 block");
});
