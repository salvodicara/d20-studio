// IA regression after W2b1 and B62 (26/09/2026): on a 390 px phone with the largest text
// (150 %) and interface (125 %) sizes, the character sheet's Actions and Story categories
// widened the page (preferences journey, «overflow at 390 with 150% text + 125% interface»).
// Causes found in the running app: the sheet's tab content grid kept an automatic column that
// grew to its widest item's min-content (B40's generic actions table, B34's roll rows, B43's
// standing select); B37's generic actions grid asked for 300 px columns (375 px at 125 %) in a
// 337 px panel; B37's note headings kept «Aggiungi» beside a long one-word title. Patterns: a
// single `minmax(0, 1fr)` track, the intrinsic responsive grid `minmax(min(<size>, 100%), 1fr)`
// and a wrapping flex header, as the sheet already does below 720 px. Synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as B22 from "../preferences.mjs";

const css = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
// The first top-level rule for exactly this selector (not one nested in a media block).
const rule = (source, selector) => {
  const at = source.indexOf("\n" + selector + " {");
  assert.ok(at >= 0, "missing rule " + selector);
  return source.slice(at, source.indexOf("}", at));
};

test("the sheet's tab content is one column no wider than the page", () => {
  assert.match(
    rule(css("characters.css"), ".character-tab-content"),
    /grid-template-columns:\s*minmax\(0,\s*1fr\);/,
    "an automatic track grows to the widest item's min-content",
  );
});

test("B37 generic actions: columns never ask for more than the panel, also when scaled", () => {
  const value = "repeat(auto-fill, minmax(min(300px, 100%), 1fr))";
  assert.ok(
    rule(css("sheet-plus.css"), ".shp-generic").includes(`grid-template-columns: ${value};`),
    "300 px columns (375 px at 125 %) overflow a phone panel",
  );
  // Preferences scale the px length and keep the 100 % cap.
  assert.equal(
    B22.scaledValue("grid-template-columns", value),
    "repeat(auto-fill, minmax(min(calc(300px * var(--pref-ui-scale, 1)), 100%), 1fr))",
  );
});

test("B37 note headings wrap «Aggiungi» under a long title", () => {
  assert.match(rule(css("sheet-plus.css"), ".shp-note-head"), /flex-wrap:\s*wrap;/);
});
