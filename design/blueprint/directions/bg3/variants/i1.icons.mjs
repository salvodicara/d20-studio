// Variant «i1 · Glifi dorati» of the bg3 direction (round 2, icon axis, 03/10/2026).
//
// elemento → prodotto → fonte
// - filled domain and tool glyphs (nav, header services, map tools, rail, hotbar) → BG3's
//   filled class/action glyphs lit on dark tiles → facts A1 «Iconography (actions)»,
//   bg3-table-crop-hotbar-4k.png; the shapes are the direction's own (game-icons.net, CC BY 3.0,
//   directions/bg3/icons.mjs), unchanged.
// - gilt fill: a pale crown, a bright gold body, a dark burnished band, a warm reflected foot →
//   BG3's gold leaf on titles and chrome (the direction's --bg3-gilt ramp) → facts A1
//   «Iconography (UI chrome)», bg3-table-turnbased-button-tooltip.png. Every stop is mixed with
//   currentColor (var(--i1-keep), 18 % by default; i1.css raises it where a colour carries a
//   state), so hover, active, disabled and danger states keep the colour the app gives them.
//   Round-2 fix (04/10/2026): 18 % by default (was 30 %), so the gold leads.
// - a dark outline (about 0.8 px at 20 px) and a hard dark foot shadow under every glyph
//   (about 0.9 px) → BG3's black stroke and drop shadow on gold chrome and glyphs → facts A3
//   «Elevation» («text stroke and glow»).
// - small in-control pictograms (close, undo, plus, arrow, menu, panel, grid, play) → BG3's
//   gold-line pictograms (lock, +, −) in bronze bezels → facts A3 «Iconography (UI chrome)»: the
//   core line glyph (ui.mjs iconPath) with the same gilt on its stroke.
// Licences: directions/bg3/variants/ICONS-LICENSE.md. Loaded by directions/index.mjs only with
// ?direction=bg3&variant=i1 (README «Variants»); i3 reuses this voice (gildedIcon).
import { directionIcon as directionGlyph } from "../icons.mjs";
import { iconPath } from "../../../ui.mjs";

// The core line glyphs this voice gilds too (the direction keeps them as the core draws them).
const LINE = new Set(["arrow", "play", "plus", "undo", "close", "menu", "panel", "grid"]);

// Top to bottom: crown highlight, bright gold, body, a deep burnished band, reflected foot.
// Round-2 fix (04/10/2026): the band is deeper and narrower and the crown brighter, so the
// metal reads at 20 px and not only when zoomed (review-i, i1 «too close to today»).
const RAMP = [
  [0, "#fff7dc"],
  [0.3, "#f7d684"],
  [0.52, "#d29a3a"],
  [0.64, "#6b3f12"],
  [0.78, "#a87228"],
  [1, "#f2cb76"],
];

let serial = 0;

// A vertical gilt ramp in the glyph's own box (userSpaceOnUse: a single straight stroke has a
// zero-height bounding box, which would hide an objectBoundingBox gradient).
function gilt(id, size) {
  const stops = RAMP.map(
    ([offset, gold]) =>
      `<stop offset="${offset}" style="stop-color:color-mix(in srgb, currentColor var(--i1-keep, 18%), ${gold})"/>`,
  ).join("");
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${size * 0.08}" x2="0" y2="${size * 0.92}">${stops}</linearGradient>`;
}

const FILLED = /^<svg class="icon" viewBox="0 0 512 512"[^>]*><path d="([^"]+)"\/><\/svg>$/;

export function gildedIcon(name, voice = "i1") {
  const id = `${voice}-gilt-${(++serial).toString(36)}`;
  const glyph = directionGlyph(name);
  const filled = typeof glyph === "string" ? FILLED.exec(glyph) : null;
  if (filled) {
    // The direction's filled game-icons glyph, drawn twice from one path: a dark foot shadow,
    // then the gilt body. The body takes its fill from the root, so a direction rule that sets
    // `fill` on .icon (the Scene tab's mask) still wins; i1.css hides the shadow there.
    return (
      `<svg class="icon" data-icon="${name}" data-icon-voice="${voice}" viewBox="0 0 512 512" fill="url(#${id})" stroke="none" aria-hidden="true">` +
      `<defs>${gilt(id, 512)}<path id="${id}-p" d="${filled[1]}"/></defs>` +
      `<use class="icon-shadow" href="#${id}-p" transform="translate(0 22)" fill="rgb(0 0 0 / 0.78)"/>` +
      `<use class="icon-shadow" href="#${id}-p" fill="none" stroke="rgb(18 10 3 / 0.9)" stroke-width="40" stroke-linejoin="round"/>` +
      `<use href="#${id}-p"/></svg>`
    );
  }
  if (LINE.has(name) && iconPath(name)) {
    return (
      `<svg class="icon" data-icon="${name}" data-icon-voice="${voice}" viewBox="0 0 24 24" fill="none" stroke="url(#${id})" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
      `<defs>${gilt(id, 24)}<path id="${id}-p" d="${iconPath(name)}"/></defs>` +
      `<use class="icon-shadow" href="#${id}-p" transform="translate(0 1)" stroke="rgb(0 0 0 / 0.78)"/>` +
      `<use class="icon-shadow" href="#${id}-p" stroke="rgb(18 10 3 / 0.9)" stroke-width="2.8"/>` +
      `<use href="#${id}-p"/></svg>`
    );
  }
  return null;
}

export function directionIcon(name) {
  return gildedIcon(name, "i1");
}
