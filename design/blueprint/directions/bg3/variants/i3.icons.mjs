// Variant «i3 · Dipinti» of the bg3 direction (round 2, icon axis, 03/10/2026).
//
// elemento → prodotto → fonte
// - every UI glyph outside the painted slots, and the glyph inside a slot whose art is not
//   painted yet → BG3 keeps line/filled glyphs for chrome and class actions → facts A1
//   «Iconography (actions)»: the «i1 · Glifi dorati» voice, unchanged (i1.icons.mjs).
// - the painted art of the hotbar's spell and weapon slots is CSS (i3.css), keyed on the
//   action id, because the icon hook only knows the glyph name («sword», «book», «dice»).
// Licences: directions/bg3/variants/ICONS-LICENSE.md.
import { gildedIcon } from "./i1.icons.mjs";

export function directionIcon(name) {
  return gildedIcon(name, "i3");
}
