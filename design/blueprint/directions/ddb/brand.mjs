// Direction «2 · D&D Beyond» (id "ddb"): the direction's own d20 mark and tab icon (I-251).
// Loaded by directions/index.mjs only while this direction is active (contract: README.md
// «brand.mjs»). Geometry: the shared true icosahedron of ../brand-geometry.mjs, restyled only.
//
// The material is D&D Beyond's 2025–26 «ornate» grammar, not its logo: red enamel cells inside
// a gilt rim, white type on the red (the START BUILDING hex button: gold rim #e7d29a…#d9b86b,
// red fill with a white-to-black gloss; facts §3 «"Ornate" hex button»), the red ramp of its
// lexicon (--ttui_red-900 … -500, facts §0.1) for the facets, a dark keyline round the gold as
// its frames have (facts §3 «Gold ornamental frame»), and the numeral in Roboto Condensed, the
// face of the character sheet's figures and labels (facts §0.2). Original: the die, its cut,
// the cloisonné of gilt wires, the numeral's place and the light. Not the D&D Beyond logo (a
// red ampersand-dragon over a white word): no ampersand, no dragon, no letterform of it.
// Notes in Italian for the owner: SOURCES.md «Marchio».
import * as g from "../brand-geometry.mjs";

// Light almost frontal (a little from the upper left): the «20» face is the brightest cell and
// the others fall away toward the rim, as an enamel badge under a lamp.
const TONES = g.shade([-0.15, -0.3, 1]);
// D&D Beyond's red ramp, darkest first (--ttui_red-900, -800, -700, -600); the front face is the
// brand red itself (--ttui_red-500).
const RAMP = ["#551710", "#7d160f", "#a7080b", "#c50009"];
const FRONT = "#e40712";
const facet = (i) => RAMP[Math.min(RAMP.length - 1, Math.floor(TONES[i] * RAMP.length))];

// Line weights in viewBox units (the die is 86 units tall): at the 32 px header a seam is
// 0.9 px, the front edge 1.5 px, the rim 2.2 px with its 0.6 px keyline outside.
const SEAM = 2.4;
const EDGE = 4;
const RIM = 6;
const KEYLINE = 1.6;

export function directionLogo(className) {
  const s = g.uniqueSuffix();
  const gilt = `ddb-gilt-${s}`;
  const gloss = `ddb-gloss-${s}`;
  return g.logoSvg(
    className,
    "<defs>" +
      // Gilt, diagonal: pale highlight, warm gold, a second glint, the shadowed gold at the foot.
      `<linearGradient id="${gilt}" gradientUnits="userSpaceOnUse" x1="20" y1="7" x2="80" y2="93">` +
      '<stop offset="0" stop-color="#f6e7bd"/><stop offset=".4" stop-color="#d9b86b"/>' +
      '<stop offset=".58" stop-color="#f3e2b3"/><stop offset="1" stop-color="#a98545"/>' +
      "</linearGradient>" +
      // The ornate button's gloss over the enamel: light at the top, shade at the foot.
      `<linearGradient id="${gloss}" gradientUnits="userSpaceOnUse" x1="0" y1="7" x2="0" y2="93">` +
      '<stop offset="0" stop-color="#ffffff" stop-opacity=".16"/>' +
      '<stop offset=".48" stop-color="#ffffff" stop-opacity="0"/>' +
      '<stop offset=".52" stop-color="#000000" stop-opacity="0"/>' +
      '<stop offset="1" stop-color="#000000" stop-opacity=".24"/>' +
      "</linearGradient></defs>" +
      // The dark keyline: a wider dark hexagon under everything, showing just outside the rim.
      `<polygon points="${g.OUTLINE}" fill="#12181c" stroke="#12181c" stroke-width="${RIM + 2 * KEYLINE}" stroke-linejoin="round"/>` +
      g.svgFaces((face, i) => ({ fill: face.role === "front" ? FRONT : facet(i) })) +
      `<polygon points="${g.OUTLINE}" fill="url(#${gloss})"/>` +
      `<g fill="none" stroke="url(#${gilt})" stroke-linejoin="round" stroke-linecap="round">` +
      `<path d="${g.SEAMS}" stroke-width="${SEAM}"/>` +
      `<polygon points="${g.CENTER_FACE}" stroke-width="${EDGE}"/>` +
      `<polygon points="${g.OUTLINE}" stroke-width="${RIM}"/></g>` +
      g.numeral(
        'font-family="DDB Roboto Condensed, Roboto Condensed, Arial Narrow, sans-serif" font-weight="800" fill="#ffffff"',
        19,
      ),
  );
}

// The tab icon: the same die with the light quantised to three reds, thicker gilt wires and
// rim, the front edge in pale gold, on a dark keyline that holds it on a light tab strip; no
// numeral (it does not survive at 16 px).
const TAB_RAMP = ["#7d160f", "#a7080b", "#c50009"];
export const favicon = g.faviconSvg(
  `<polygon points="${g.OUTLINE}" fill="#12181c" stroke="#12181c" stroke-width="12" stroke-linejoin="round"/>` +
    g.svgFaces((face, i) => ({
      fill:
        face.role === "front"
          ? FRONT
          : TAB_RAMP[Math.min(TAB_RAMP.length - 1, Math.floor(TONES[i] * TAB_RAMP.length))],
    })) +
    `<path d="${g.SEAMS}" fill="none" stroke="#e0b95b" stroke-width="4.5" stroke-linecap="round"/>` +
    `<polygon points="${g.CENTER_FACE}" fill="none" stroke="#f0d68f" stroke-width="6" stroke-linejoin="round"/>` +
    `<polygon points="${g.OUTLINE}" fill="none" stroke="#e0b95b" stroke-width="7" stroke-linejoin="round"/>`,
);
