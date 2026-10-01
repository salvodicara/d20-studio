// Direction «8 · Alchemy RPG» (id "alchemy"): its own d20 mark and tab icon (Phase C,
// visual-01, I-251). Contract: directions/README.md «brand.mjs»; geometry:
// directions/brand-geometry.mjs (the true icosahedron face-on, vertices untouched). Dev-only:
// loaded by directions/index.mjs while this direction is active; under the light theme the
// loader keeps today's mark and tab icon. Provenance and the comparison with Alchemy's own logo:
// SOURCES.md «Marchio».
//
// Alchemy's brand grammar, copied as grammar and never as a shape:
//   - one FLAT gold, no metal shading: the logo is a single solid gold (#b68d50 in the H1 logo
//     pill, #8a6c3c «Alchemy Gold» in the footer and sign-up lockups), so the die is built from
//     flat gold steps only, lit from the upper left by the shared light (no gradient, no bevel);
//   - geometry CUT by negative space: the logo's letter is crossed by a cut that lets the
//     background through, so the twelve seams here are real gaps (an SVG mask), not drawn lines:
//     the die reads as flat gold tiles on any background;
//   - the white of Alchemy's FAB disc, CTA pills and wordmark: the «20» face is a white tile,
//     like the white disc that carries a system glyph in the FAB (T1);
//   - the numeral in the direction's extended black face (Unbounded 900, the Nominee Extended
//     substitute already loaded by direction.css), in the deepest of the golds.
// What is ours: the die itself, its tiles and cuts, the white face and the numeral. Nothing of
// Alchemy's letter mark (no «A», no diagonal swoosh), of its glyph divider or of any universe
// glyph is drawn.
import * as g from "../brand-geometry.mjs";

// Flat gold steps, from the lit faces to the unlit ones: a lighter gold of ours, the logo pill's
// gold (H1, #b68d50), Alchemy Gold (#8a6c3c, the accent) and a deeper step of ours for the one
// face that turns away from the light.
const GOLD = ["#e2c48a", "#b68d50", "#8a6c3c", "#6a5230"];
const stepOf = (tone) => GOLD[tone >= 0.75 ? 0 : tone >= 0.4 ? 1 : tone >= 0.1 ? 2 : 3];
const WHITE = "#ffffff";
// The page's base (#101217, theme `background`): the tab icon's edge on a light tab strip.
const BASE = "#101217";
const DISPLAY = "Unbounded, Lexend, system-ui, sans-serif";

/**
 * The header mark: nine flat gold tiles and the white «20» tile, parted by 4-unit cuts (1.3 px
 * at 32 px, the Table's size; 1.6 px at 40 px, the Home header's) that let the pill's glass
 * through. The numeral in Unbounded 900 at 15 units, tracked −1 (dx takes back the half unit
 * the last digit's tracking moves the pair), in the deepest gold #6a5230 (7.3:1 on the white
 * face; Alchemy Gold #8a6c3c, 4.9:1, read as two grey-gold blobs at 1x). Unbounded's «20» is
 * 1.6 em wide: 15 units is the largest size whose ink stays 3.3 units inside every edge of the
 * face, 1.3 clear of the cut, centred on 49.9 (measured on the rendered mark: at 16 units 2.3,
 * at 19 −0.8, past the face's sloped sides; evidence fix-alchemy/numeral*.js).
 */
export function directionLogo(className) {
  const cut = `al-cut-${g.uniqueSuffix()}`; // the logo renders more than once on a page
  const tiles = g.svgFaces((face) => ({
    fill: face.role === "front" ? WHITE : stepOf(face.tone),
  }));
  return g.logoSvg(
    className,
    `<defs><mask id="${cut}" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">` +
      `<rect width="100" height="100" fill="#ffffff"/>` +
      `<path d="${g.SEAMS}" fill="none" stroke="#000000" stroke-width="4" stroke-linejoin="round"/>` +
      `</mask></defs>` +
      `<g mask="url(#${cut})">${tiles}</g>` +
      g.numeral(
        {
          "font-family": DISPLAY,
          "font-weight": 900,
          "letter-spacing": -1,
          dx: -0.5,
          fill: GOLD[3],
        },
        15,
      ),
  );
}

// The tab icon: the same die in three flat golds (lit, logo gold, Alchemy Gold), the white face
// and the cuts drawn in the base colour, with a rim of it for light tab strips (6 units, about
// 1 px at 16 px); no numeral, which would blur at 16 px. Literal colours only (a tab icon has
// no page CSS).
const TAB = (tone) => (tone >= 0.75 ? GOLD[0] : tone >= 0.4 ? GOLD[1] : GOLD[2]);
export const favicon = g.faviconSvg(
  g.FACES.map(
    (face) =>
      `<polygon points="${face.points}" fill="${face.role === "front" ? WHITE : TAB(face.tone)}"/>`,
  ).join("") +
    `<path d="${g.SEAMS}" fill="none" stroke="${BASE}" stroke-width="6" stroke-linejoin="round"/>` +
    `<polygon points="${g.OUTLINE}" fill="none" stroke="${BASE}" stroke-width="6" stroke-linejoin="round"/>`,
);
