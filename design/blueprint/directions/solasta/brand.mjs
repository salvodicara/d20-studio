// Direction «5 · Solasta» (Phase C, visual-01, I-251): the d20 mark in Solasta's grammar.
// Contract: directions/README.md «brand.mjs»; geometry: directions/brand-geometry.mjs.
//
// What it takes from the product (references/solasta: facts §0, §1, §4, §6; SOURCES.md «Marchio»):
// - the roll widget's D20 glyph (SL10): a die drawn FLAT, in a few solid tones, every edge a
//   LIGHT line — no dark outline, no gradient, no bevel, no shadow;
// - the HUD's flat opaque plates and their lighter 1 px separators: the nine side faces are
//   four solid slate tones of the combat HUD, the edges ice #B5D3DE;
// - the main menu's active row, filled solid copper #D69E76: the face that came up, «20», is
//   the active one, a copper plate with the numeral in the dark ink of copper fills;
// - the in-world dice numerals (SL20): a bold bracketed serif, here Crimson Pro 700, the face
//   the direction already loads for proper names (direction.css @font-face).
// What it does not take: the gilt metal, the bevel, the ring and the lettering of the Solasta
// logo, the blue glass of the 3D dice, the publisher's orange low-poly die. Original drawing.
import * as g from "../brand-geometry.mjs";

// Four flat slate tones, dark → lit, all but one from the direction's palette: the unavailable
// tile #222A2E, the main-action tile #3B4B55, their separator #6C8089 and the midpoint of the
// last two, #53656F. The geometry's Lambert tones (light from the upper left) pick one per face.
const SLATE = ["#222a2e", "#3b4b55", "#53656f", "#6c8089"];
const step = (tone) => (tone >= 0.9 ? 3 : tone >= 0.6 ? 2 : tone >= 0.25 ? 1 : 0);
const ICE = "#b5d3de"; // tile inks and pictograms on slate (direction.css --sl-ice)
const COPPER = "#d69e76"; // the active menu row's fill (--sl-copper-fill)
const INK = "#241a15"; // dark ink on copper fills (--sl-ink-on-copper)

const faces = g.svgFaces((face) => ({
  fill: face.role === "front" ? `var(--sl-brand-face, ${COPPER})` : SLATE[step(face.tone)],
}));
// Edges after the faces, as Solasta draws its separators: lighter than the plates they divide.
// The seams are solid ice at 3 units (1 px at the header's 34 px: at 0.75 and 2.4 units they
// blurred the four close slates together on a 1× screen, brand B3), the silhouette solid ice at
// 4.5 (1.5 px), so the outline leads and the facets follow; round joins keep the inner
// vertices clean at 24 px.
const edges =
  `<path d="${g.SEAMS}" fill="none" stroke="${ICE}" stroke-width="3" stroke-linecap="round"/>` +
  `<polygon points="${g.OUTLINE}" fill="none" stroke="${ICE}" stroke-width="4.5" stroke-linejoin="round"/>`;
const numeral = g.numeral(
  {
    "font-family": "'Crimson Pro', 'Iowan Old Style', 'Palatino Linotype', Georgia, serif",
    "font-weight": 700,
    fill: INK,
    style: "font-variant-numeric: lining-nums",
  },
  g.NUMERAL.max,
);

// No gradient, filter, mask or clip path: the mark has no ids, so two renders never collide.
// The copper face reads --sl-brand-face, which direction.css lights on hover.
export function directionLogo(className) {
  return g.logoSvg(className, `<g stroke-linejoin="round">${faces}${edges}</g>${numeral}`);
}

// The tab icon: the header mark with heavier edges and no numeral (two pixels of noise at
// 16 px). The same slate tones and copper face; the seams solid ice at 4 units and the
// silhouette at 6 (0.6 and 1 px at 16 px), ringed outside by the header's black #020202
// (0.6 px), which only shows on a light tab strip, where the ice edge alone goes soft.
export const favicon = g.faviconSvg(
  `<polygon points="${g.OUTLINE}" fill="none" stroke="#020202" stroke-width="13" stroke-linejoin="round"/>` +
    g.svgFaces((face) => ({ fill: face.role === "front" ? COPPER : SLATE[step(face.tone)] })) +
    `<path d="${g.SEAMS}" fill="none" stroke="${ICE}" stroke-width="4" stroke-linecap="round"/>` +
    `<polygon points="${g.OUTLINE}" fill="none" stroke="${ICE}" stroke-width="6" stroke-linejoin="round"/>`,
);
