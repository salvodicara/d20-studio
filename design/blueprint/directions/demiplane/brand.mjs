// Direction «9 · Demiplane» (id "demiplane"): its own d20 mark and tab icon (Phase C, visual-01,
// I-251). Contract: directions/README.md «brand.mjs»; geometry: directions/brand-geometry.mjs
// (the true icosahedron face-on, vertices untouched). Dev-only: loaded by directions/index.mjs
// while this direction is active; under the light theme the loader keeps today's mark and icon.
//
// Demiplane's brand grammar, copied as grammar and never as a shape (SOURCES.md «Marchio»):
// light on black — an electric cyan line (#00ABFF, the «All Games» underline and the colour of
// the portal arc in its header logo) glowing out of the 80 px black bar; the night navy of the
// signed-out hero (#050B13, a near-black blue lit by a portal glow); the one gradient of the
// shell, cyan to deep blue (rgb(0,171,255) → rgb(13,73,255), the «Become member» button) under
// white type; flat white geometric letters (the logotype, Barlow in the shell). Original: the die
// itself, cut from night glass and lit from the upper left; its «20» face as the lit window,
// filled with the shell's gradient and a soft portal bloom; the cyan rim round the silhouette
// (the glow is the wordmark rule's drop shadow in direction.css); the numeral in Barlow Bold,
// the shell's own face. Nothing of the product's emblem is drawn: no ring or arc, no broken
// stroke, no letter D, no wordmark letterform.
import * as g from "../brand-geometry.mjs";

const NIGHT = "#050b13"; // the hero's night navy: the keyline under the rim
const CYAN = "#00abff"; // the portal line
const DEEP = "#0d49ff"; // the end of the shell's gradient
// Night glass: the faces run from the hero's navy (tone 0) to a cool steel blue (tone 1), so
// the lit flanks read as facets at 32 px but never reach the brightness of the «20» face.
const GLASS_LO = "#060d18";
const GLASS_HI = "#3a70a8";
const SEAM_INK = "#02050a";

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
const glass = (face) => mix(GLASS_LO, GLASS_HI, face.tone);
const stops = (list) =>
  list
    .map(([offset, colour, opacity = 1]) =>
      opacity === 1
        ? `<stop offset="${offset}" stop-color="${colour}"/>`
        : `<stop offset="${offset}" stop-color="${colour}" stop-opacity="${opacity}"/>`,
    )
    .join("");

// Line weights in viewBox units (the die is 86 tall): at the 32 px header a cut is 0.7 px, the
// window's edge 0.8 px, the cyan rim 1.5 px over a 0.5 px night keyline; at 160 px they are
// 3.5, 3.8, 7.4 and 2.6 px. Fewer, bolder lines than the 160 px view would allow.
const SEAM = 2.2;
const EDGE = 2.4;
const RIM = 4.6;
const KEYLINE = 1.6;
const BARLOW = "Barlow, Roboto, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";

export function directionLogo(className) {
  const s = g.uniqueSuffix(); // fresh ids per call: the logo renders more than once
  const lit = `dp-lit-${s}`;
  const bloom = `dp-bloom-${s}`;
  const sheen = `dp-sheen-${s}`;
  const line = `dp-line-${s}`;
  return g.logoSvg(
    className,
    "<defs>" +
      // The shell's gradient across the window, cyan where the light comes in (upper left).
      `<linearGradient id="${lit}" gradientUnits="userSpaceOnUse" x1="34" y1="26" x2="66" y2="64">` +
      stops([
        [0, CYAN],
        [1, DEEP],
      ]) +
      "</linearGradient>" +
      // The portal bloom: a white glow rising from the window's upper middle.
      `<radialGradient id="${bloom}" gradientUnits="userSpaceOnUse" cx="50" cy="38" r="22">` +
      stops([
        [0, "#ffffff", 0.42],
        [1, "#ffffff", 0],
      ]) +
      "</radialGradient>" +
      // The glass sheen: a cool reflection over the upper-left half of the die.
      `<linearGradient id="${sheen}" gradientUnits="userSpaceOnUse" x1="20" y1="10" x2="62" y2="70">` +
      stops([
        [0, "#bfe9ff", 0.2],
        [0.55, "#bfe9ff", 0],
      ]) +
      "</linearGradient>" +
      // The portal line, brightest where the light comes in, deepening toward the lower right.
      `<linearGradient id="${line}" gradientUnits="userSpaceOnUse" x1="20" y1="10" x2="80" y2="90">` +
      stops([
        [0, "#5fd2ff"],
        [0.45, CYAN],
        [1, "#0a86ff"],
      ]) +
      "</linearGradient></defs>" +
      // The night keyline under everything, showing just outside the rim on a light page.
      `<polygon points="${g.OUTLINE}" fill="${NIGHT}" stroke="${NIGHT}" stroke-width="${RIM + 2 * KEYLINE}" stroke-linejoin="round"/>` +
      g.svgFaces((face) => (face.role === "front" ? null : { fill: glass(face) })) +
      `<polygon points="${g.OUTLINE}" fill="url(#${sheen})"/>` +
      `<path d="${g.SEAMS}" fill="none" stroke="${SEAM_INK}" stroke-width="${SEAM}" stroke-linecap="round"/>` +
      `<polygon points="${g.CENTER_FACE}" fill="url(#${lit})"/>` +
      `<polygon points="${g.CENTER_FACE}" fill="url(#${bloom})"/>` +
      `<polygon points="${g.CENTER_FACE}" fill="none" stroke="#8fdcff" stroke-width="${EDGE}" stroke-linejoin="round"/>` +
      `<polygon points="${g.OUTLINE}" fill="none" stroke="url(#${line})" stroke-width="${RIM}" stroke-linejoin="round"/>` +
      g.numeral({ "font-family": BARLOW, "font-weight": 700, fill: "#ffffff" }, g.NUMERAL.max),
  );
}

// The tab icon: the night die in three glass tones split by night cuts (without the spokes the
// hexagon and its triangle read as a warning sign, not as a die), the window lit pale to cyan
// under a night edge, the cyan rim over a night keyline: it holds on a dark tab strip (the rim)
// and on a light one (the keyline and the navy body). No numeral (it blurs at 16 px). Literal
// colours only; the ids need no suffix in a document of its own.
const TAB = ["#0c1a2d", "#1d4373", "#3c78b8"];
export const favicon = g.faviconSvg(
  '<defs><linearGradient id="w" x1="0" y1="0" x2="0" y2="1">' +
    stops([
      [0, "#a6e6ff"],
      [1, "#18a8ff"],
    ]) +
    "</linearGradient></defs>" +
    `<polygon points="${g.OUTLINE}" fill="${NIGHT}" stroke="${NIGHT}" stroke-width="12" stroke-linejoin="round"/>` +
    g.svgFaces((face) =>
      face.role === "front"
        ? null
        : { fill: TAB[Math.min(TAB.length - 1, Math.floor(face.tone * TAB.length))] },
    ) +
    `<path d="${g.SEAMS}" fill="none" stroke="${NIGHT}" stroke-width="4" stroke-linecap="round"/>` +
    `<polygon points="${g.CENTER_FACE}" fill="url(#w)" stroke="${NIGHT}" stroke-width="4" stroke-linejoin="round"/>` +
    `<polygon points="${g.OUTLINE}" fill="none" stroke="${CYAN}" stroke-width="6.5" stroke-linejoin="round"/>`,
);
