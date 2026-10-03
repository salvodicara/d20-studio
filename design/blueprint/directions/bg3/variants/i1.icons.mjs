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
//   currentColor (var(--i1-keep), 30 % by default; i1.css raises it where a colour carries a
//   state), so hover, active, disabled and danger states keep the colour the app gives them.
// - a hard dark foot shadow under every glyph (0.7 px at 21 px) → BG3's black text stroke and
//   drop shadow on gold chrome → facts A3 «Elevation» («text stroke and glow»).
// - small in-control pictograms (close, undo, plus, arrow, menu, panel, grid, play) → BG3's
//   gold-line pictograms (lock, +, −) in bronze bezels → facts A3 «Iconography (UI chrome)»: the
//   core line glyph (ui.mjs iconPath) with the same gilt on its stroke.
// Licences: directions/bg3/variants/ICONS-LICENSE.md. Loaded by directions/index.mjs only with
// ?direction=bg3&variant=i1 (README «Variants»); i3 reuses this voice (gildedIcon).
import { directionIcon as directionGlyph } from "../icons.mjs";
import { iconPath } from "../../../ui.mjs";

// The core line glyphs this voice gilds too (the direction keeps them as the core draws them).
const LINE = new Set(["arrow", "play", "plus", "undo", "close", "menu", "panel", "grid"]);

// Top to bottom: crown highlight, bright gold, body, burnished band, reflected foot.
const RAMP = [
  [0, "#fff3cf"],
  [0.34, "#f1cd7c"],
  [0.58, "#c9933f"],
  [0.7, "#8a5a22"],
  [1, "#e7bf72"],
];

let serial = 0;

// A vertical gilt ramp in the glyph's own box (userSpaceOnUse: a single straight stroke has a
// zero-height bounding box, which would hide an objectBoundingBox gradient).
function gilt(id, size) {
  const stops = RAMP.map(
    ([offset, gold]) =>
      `<stop offset="${offset}" style="stop-color:color-mix(in srgb, currentColor var(--i1-keep, 30%), ${gold})"/>`,
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
      `<use class="icon-shadow" href="#${id}-p" transform="translate(0 17)" fill="rgb(0 0 0 / 0.6)"/>` +
      `<use href="#${id}-p"/></svg>`
    );
  }
  if (LINE.has(name) && iconPath(name)) {
    return (
      `<svg class="icon" data-icon="${name}" data-icon-voice="${voice}" viewBox="0 0 24 24" fill="none" stroke="url(#${id})" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
      `<defs>${gilt(id, 24)}<path id="${id}-p" d="${iconPath(name)}"/></defs>` +
      `<use class="icon-shadow" href="#${id}-p" transform="translate(0 0.8)" stroke="rgb(0 0 0 / 0.6)"/>` +
      `<use href="#${id}-p"/></svg>`
    );
  }
  return null;
}

export function directionIcon(name) {
  return gildedIcon(name, "i1");
}
