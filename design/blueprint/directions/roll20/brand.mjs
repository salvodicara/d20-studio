// Direction «6 · Roll20» (I-251): the d20 Studio mark in Roll20's brand grammar. Dev-only,
// loaded by directions/index.mjs (contract: directions/README.md «brand.mjs»).
//
// Grammar taken from the product (references/roll20, facts §0.1–§0.2): flat digital colour, no
// texture, bevel or gloss; the Grimoire dark primary ramp (#5A2374 … #C6ABD3, purple) and its
// mirror hue, the light-mode primary magenta #E10085; Nunito 900 for big numbers; filled shapes
// cut by bold lines. Original: the die itself is the mark (Roll20's emblem is a rounded hexagon
// badge with a white line-drawn die inside it; here there is no badge, no line art and no
// gradient), ten flat facets stepped one ramp tone apart and lit from the top left, the «20»
// face in magenta like a primary button with white Nunito 900 figures, and seams in the navbar
// colour #111111, so on the header the die reads as cut out of the bar.
import * as g from "../brand-geometry.mjs";

// Grimoire dark primary ramp (colors.css --color-primary3…7) and the light-mode primary.
const P3 = "#5a2374";
const P4 = "#702c91";
const P5 = "#8d56a7";
const P6 = "#a980bd";
const P7 = "#c6abd3";
const MAGENTA = "#e10085";
const NAV = "#111111"; // --color-navbar-background (dark)

// Light from the top left; two faces that share an edge are at least one ramp step apart.
const FACE = {
  "roof-left": P7,
  "roof-right": P6,
  "upper-left": P6,
  "upper-right": P5,
  "side-left": P5,
  bottom: P5,
  "side-right": P4,
  "lower-left": P4,
  "lower-right": P3,
  front: MAGENTA,
};

export function directionLogo(className) {
  const clip = `r20-cut-${g.uniqueSuffix()}`; // the seams stop at the silhouette
  return g.logoSvg(
    className,
    `<defs><clipPath id="${clip}"><polygon points="${g.OUTLINE}"/></clipPath></defs>` +
      g.svgFaces((face) => ({ fill: FACE[face.id] })) +
      `<path d="${g.SEAMS}" clip-path="url(#${clip})" fill="none" stroke="var(--r20-nav, ${NAV})" stroke-width="3" stroke-linejoin="round"/>` +
      g.numeral(
        'font-family="Nunito, Figtree, system-ui, sans-serif" font-weight="900" letter-spacing="-0.4" fill="#ffffff"',
      ),
  );
}

// The tab icon: the same ten facets, cut by the three spokes that run from the corners of the
// «20» face straight out to the silhouette (A to the top vertex, B and C to the lower side
// vertices), so even at 16 px it reads as a faceted die like the header mark and not as a
// triangle in a hexagon (detail round R20-04: Roll20's own tab icon is a pink hexagon badge).
// The silhouette ringed in the navbar black (4 units) holds the die on a light tab strip as well
// as a dark one; the magenta face keeps a 3-unit rim; no numeral (it does not survive 16 px).
// The spokes are 6 units (polish round 6): about one device pixel at 16 px, where 4-unit
// spokes faded to nothing; at 32 px they stay under 2 px.
const SPOKES = [
  [g.V.A, g.V.T],
  [g.V.B, g.V.LR],
  [g.V.C, g.V.LL],
]
  .map(([a, b]) => `M${a.join(",")} ${b.join(",")}`)
  .join(" ");
export const favicon = g.faviconSvg(
  g.svgFaces((face) => ({ fill: FACE[face.id] })) +
    `<path d="${SPOKES}" fill="none" stroke="${NAV}" stroke-width="6" stroke-linecap="round"/>` +
    `<polygon points="${g.CENTER_FACE}" fill="none" stroke="${NAV}" stroke-width="3" stroke-linejoin="round"/>` +
    `<polygon points="${g.OUTLINE}" fill="none" stroke="${NAV}" stroke-width="4" stroke-linejoin="round"/>`,
);
