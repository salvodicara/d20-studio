// R4 (fix round 2) — X-04: the sheet's Inventory tab widened a 390 px phone at 150 % text and
// 125 % interface (scrollWidth 406, `.invp-col small`): the phone rule gave the columns a full
// width plus the icon's 52 px margin. DEVELOPMENT «IA regression»: tracks and rows shrink and
// wrap instead. The browser probe (fix2-R4 evidence, probe-r4-phone.js) measures 390 in IT/EN
// for the player and the DM; this guards the rule itself.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../inventory-plus.css", import.meta.url), "utf8");
const block = (selector, from = 0) => {
  const at = css.indexOf(selector + " {", from);
  assert.ok(at >= 0, `${selector} not found`);
  return css.slice(at, css.indexOf("}", at));
};

test("X-04: on a phone the inventory columns wrap on their own line, never wider than the row", () => {
  const phone = css.indexOf("@media (max-width: 560px)");
  assert.ok(phone >= 0);
  const cols = block("  .invp-cols", phone);
  assert.match(cols, /flex: 1 1 100%/);
  assert.match(cols, /min-width: 0/);
  assert.match(cols, /margin-left: 0/);
  assert.match(cols, /flex-wrap: wrap/);
  assert.doesNotMatch(cols, /width: 100%|margin-left: 52px/);
  const col = block("  .invp-col", phone);
  assert.match(col, /min-width: 0/);
  assert.match(col, /overflow-wrap: anywhere/);
  // On a wide screen each column keeps its 52 px (a percentage there would let the columns'
  // box shrink below its content and clip the last column).
  assert.match(block(".invp-col"), /min-width: 52px/);
});
