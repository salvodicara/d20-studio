// Direction «3 · Foundry VTT» (id "foundry"): its own d20 mark and tab icon (I-251; contract in
// directions/README.md «brand.mjs»). The die is the shared true icosahedron of
// brand-geometry.mjs; only the materials are this direction's. Origin and comparison with the
// product's logo: SOURCES.md «Marchio».
//
// Taken from Foundry's brand grammar (references/foundry-owlbear H1/H2, F1/F10/F12, facts.md):
//   - a flat, enamel-like die under a heavy near-black ink line (#050409, the v13 title strip);
//   - the warm orange of Foundry's primary and selection (#EE9B3A, #F39128);
//   - the gilt of the setup screen's rules (#CA9764) and the plum of the v13 dark UI (#302731).
// Original: a «cast» die. Nine iron faces in the UI's plum, shaded by the shared light; the
// «20» face alone poured hot (pale gold → orange → ember), its heat faintly warming the three
// faces that touch it; a gilt edge round the silhouette over the outer ink line; the numeral in
// the direction's condensed title face. Fewer, bolder strokes than the 160 px view suggests:
// seams 2.8, the edge 4.4 of gilt over 7.8 of ink, so the die holds at 24-34 px.
import * as g from "../brand-geometry.mjs";

const INK = "#050409";
const GILT = "#ca9764";
const HEAT = "#f39128";
const IRON_LO = "#30263a"; // the darkest face (tone 0)
// The brightest face (tone 1). Detail round (01/10): #A088A0 made the lilac roof the lightest
// facet of the mark, cool beside the cream and gilt words; the compressed range keeps the hot
// «20» face the brightest thing in the die.
const IRON_HI = "#7a6478";
// The faces that share an edge with the «20» face catch 12 % of its glow.
const WARMED = new Set(["upper-left", "upper-right", "bottom"]);

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, t) =>
  "#" +
  rgb(a)
    .map((v, i) =>
      Math.round(v + (rgb(b)[i] - v) * t)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
const ironOf = (hi) => (face) => {
  const base = mix(IRON_LO, hi, face.tone);
  return WARMED.has(face.id) ? mix(base, HEAT, 0.12) : base;
};
const iron = ironOf(IRON_HI);
// The tab icon keeps the wider iron range (to #A088A0): at 16–32 px the ink spokes need light
// facets to show against.
const ironTab = ironOf("#a088a0");
const stops = (list) =>
  list.map(([offset, colour]) => `<stop offset="${offset}" stop-color="${colour}"/>`).join("");

export function directionLogo(className) {
  const suffix = g.uniqueSuffix(); // fresh ids per call: the logo renders more than once
  const hot = `fv-hot-${suffix}`;
  const gilt = `fv-gilt-${suffix}`;
  const faces = g.svgFaces((face) =>
    face.role === "front" ? { fill: `url(#${hot})` } : { fill: iron(face) },
  );
  return g.logoSvg(
    className,
    `<defs>` +
      `<linearGradient id="${hot}" x1="0" y1="0" x2="0" y2="1">${stops([
        [0, "#ffe6a8"],
        [0.4, "#ffab3d"],
        [1, "#e2571a"],
      ])}</linearGradient>` +
      `<linearGradient id="${gilt}" x1="0" y1="0" x2="1" y2="1">${stops([
        [0, "#e6bf8c"],
        [0.5, GILT],
        [1, "#a3744a"],
      ])}</linearGradient>` +
      `</defs>` +
      `<g stroke="${INK}" stroke-width="2.8" stroke-linejoin="round">${faces}</g>` +
      `<polygon points="${g.OUTLINE}" fill="none" stroke="${INK}" stroke-width="7.8" stroke-linejoin="round"/>` +
      `<polygon points="${g.OUTLINE}" fill="none" stroke="url(#${gilt})" stroke-width="4.4" stroke-linejoin="round"/>` +
      g.numeral(
        `font-family="'Noto Serif Condensed', 'Palatino Linotype', Palatino, Georgia, serif" font-weight="900" fill="${INK}" style="font-stretch: 62.5%; font-variant-numeric: lining-nums"`,
        g.NUMERAL.max,
      ),
  );
}

// The browser tab: the shaded iron, the gilt edge over the ink line (it reads on a dark and on a
// light tab strip), the hot face lit by the logo's own gradient and three ink spokes from its
// corners to the silhouette (A→T, B→LR, C→LL: the die's Y). Detail round (01/10): a flat orange
// triangle under a 6.5-unit stroke, with no seam, read as a ⚠ sign at 16 px; the spokes and the
// lit facet make it a die. No numeral. Literal colours only (a standalone document).
const Y_SPOKES = [
  ["A", "T"],
  ["B", "LR"],
  ["C", "LL"],
]
  .map(([a, b]) => `M${g.V[a].join(",")} ${g.V[b].join(",")}`)
  .join(" ");
export const favicon = g.faviconSvg(
  `<defs><linearGradient id="fv-tab-hot" x1="0" y1="0" x2="0" y2="1">${stops([
    [0, "#ffe6a8"],
    [0.4, "#ffab3d"],
    [1, "#e2571a"],
  ])}</linearGradient></defs>` +
    g.svgFaces((face) => (face.role === "front" ? { fill: "none" } : { fill: ironTab(face) })) +
    `<path d="${Y_SPOKES}" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>` +
    `<polygon points="${g.OUTLINE}" fill="none" stroke="${INK}" stroke-width="12" stroke-linejoin="round"/>` +
    `<polygon points="${g.OUTLINE}" fill="none" stroke="${GILT}" stroke-width="7" stroke-linejoin="round"/>` +
    `<polygon points="${g.CENTER_FACE}" fill="url(#fv-tab-hot)" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`,
);
