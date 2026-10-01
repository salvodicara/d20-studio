// Direction «4 · Owlbear Rodeo»: its own d20 mark and tab icon (Phase C, visual-01, I-251).
// Contract: directions/README.md «brand.mjs»; geometry: directions/brand-geometry.mjs (the true
// icosahedron face-on, vertices untouched). Dev-only: loaded by directions/index.mjs while this
// direction is active; under the light theme the loader keeps today's mark and tab icon.
//
// Owlbear Rodeo 2's brand grammar, copied as grammar and never as a shape (SOURCES.md «Marchio»):
// a flat two-tone sticker (one bright field, a white figure, navy detail) with rounded corners,
// as the launcher's badge and the «GM» badge (O1, O5, O9); the one lavender accent of the dark
// theme (primary.main #bb99ff, its MUI dark #836bb2 measured as #856db5 on O1); the glass
// overlay (a white sheen fading downwards, bundle function T7); Roboto at its heaviest for the
// numeral, as the bold white titles «Players» and «Initiative» (O1, O5). The die itself, the
// lavender facets, the navy seams and the numeral are ours; nothing of the owlbear badge or of
// the Dice extension's red icon is drawn.
import * as g from "../brand-geometry.mjs";

// The navy of the room (background.default #1e2231), one step darker so the rim reads on a
// light page.
const EDGE = "#171a26";
// The sticker's die-cut edge: white 28 % just outside the navy rim (Owlbear's badges are flat
// stickers on the dark bar). Without it the rim meets the app bar #222639 at 1.14:1 and the
// die loses its silhouette; with it the edge reads at about 2.5:1 there. Drawn under the faces
// at the rim's width plus 3 units a side, so 3 units show outside the rim (1 px at 32 px).
const KEYLINE = "rgb(255 255 255 / 0.28)";
// Four flat lavender steps for the faces, from the lightest to the darkest: primary.light,
// primary.main, a middle step and primary.dark, saturated like the accent.
const STEP = ["#dccbff", "#bb99ff", "#9a7be6", "#7859c8"];
const stepOf = (tone) => STEP[tone >= 0.9 ? 0 : tone >= 0.6 ? 1 : tone >= 0.25 ? 2 : 3];
const ROBOTO = "Roboto, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";

/**
 * The header mark: lavender facets lit from the upper left, split by navy seams, a white «20»
 * face with a navy Roboto Black numeral, a navy rim with round corners, a white die-cut
 * keyline outside it and a glass sheen (the header hides the numeral at 32 px: direction.css).
 * Seams 3.2 units and rim 5 units: about 1 px and 1.6 px at 32 px, so the die stays crisp in the
 * app bar and reads as a bold flat icon at 160 px.
 */
export function directionLogo(className) {
  const sheen = `ob-sheen-${g.uniqueSuffix()}`;
  const faces = g.svgFaces((face) => ({
    fill: face.role === "front" ? "#ffffff" : stepOf(face.tone),
  }));
  return g.logoSvg(
    className,
    `<defs><linearGradient id="${sheen}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="#ffffff" stop-opacity="0.24"/>` +
      `<stop offset="0.55" stop-color="#ffffff" stop-opacity="0"/></linearGradient></defs>` +
      `<polygon points="${g.OUTLINE}" fill="none" stroke="${KEYLINE}" stroke-width="11" stroke-linejoin="round"/>` +
      faces +
      `<polygon points="${g.OUTLINE}" fill="url(#${sheen})"/>` +
      `<path d="${g.SEAMS}" fill="none" stroke="${EDGE}" stroke-width="3.2" stroke-linecap="round"/>` +
      `<polygon points="${g.OUTLINE}" fill="none" stroke="${EDGE}" stroke-width="5" stroke-linejoin="round"/>` +
      g.numeral({ "font-family": ROBOTO, "font-weight": 900, fill: EDGE }, g.NUMERAL.max),
  );
}

// The tab icon: the same die in three flat tones (light upper left, accent, dark right), the
// white «20» face with a heavier edge than the spokes, and a heavy navy rim (about 1 px at
// 16 px); no numeral, which would blur at 16 px. The spokes stay: without them the hexagon and
// its triangle read as a warning sign, not as a die. Literal colours only (a tab icon has no
// page CSS). The accent hexagon first, then only the lit and the shaded faces, so no hairline
// splits two equal faces.
const faviconFaces = g.FACES.filter(
  (face) => face.role !== "front" && (face.tone >= 0.9 || face.tone < 0.25),
)
  .map((face) => `<polygon points="${face.points}" fill="${stepOf(face.tone)}"/>`)
  .join("");
export const favicon = g.faviconSvg(
  `<polygon points="${g.OUTLINE}" fill="${STEP[1]}"/>` +
    faviconFaces +
    `<polygon points="${g.CENTER_FACE}" fill="#ffffff"/>` +
    `<path d="${g.SEAMS}" fill="none" stroke="${EDGE}" stroke-width="4" stroke-linecap="round"/>` +
    `<polygon points="${g.CENTER_FACE}" fill="none" stroke="${EDGE}" stroke-width="6" stroke-linejoin="round"/>` +
    `<polygon points="${g.OUTLINE}" fill="none" stroke="${EDGE}" stroke-width="7" stroke-linejoin="round"/>`,
);
