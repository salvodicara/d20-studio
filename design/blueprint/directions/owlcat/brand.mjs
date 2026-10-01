// Direction «7 · Pathfinder: Wrath of the Righteous» (id "owlcat"): its own brand (I-251).
// Dev-only; loaded by directions/index.mjs while this direction is active (contract:
// directions/README.md «brand.mjs»). Provenance and the comparison with the game's own logo:
// SOURCES.md «Marchio».
//
// The mark is a cut violet gem in a blackened-iron setting, with a parchment «20» face lettered
// in oxblood, in WotR's brand grammar (references/owlcat, facts §0.2–§0.6):
//   - the nine outer faces are the faceted plum gem of the active tab's end caps and the frame
//     studs (W12 tab caps; W1 gems lit #AB56B1, shadow #6B3A6B; the econ plum #3C1129), lit by
//     the shared light (upper left) through a ramp of those values, with a cool sheen across the
//     stone as on a polished cabochon;
//   - the setting is blackened iron: a black keyline round the silhouette, then a satin grey
//     rim lit from the upper left (the claws' highlights on W12, the #5E5E6E slot frames of W1),
//     and dark iron seams wide enough to part the facets at 24 px;
//   - the «20» face is a leaf of the book's parchment (#F2EBE1 → #D9D2CA → #C8C2B4, W19/W38),
//     held by an iron edge, with the numeral in Vollkorn (the direction's face) in the oxblood
//     of WotR's initials (#6B2F36, W1/W12/W19), as the drop cap of a name.
// The geometry is the shared true icosahedron (../brand-geometry.mjs); nothing is drawn from
// the game's logo (no sword, no wings, no letterform of the «Pathfinder» title, no emblem) or
// from its frame art (no thorns, claws or tab shield).
import * as g from "../brand-geometry.mjs";

// Gem ramp, tone 0 (the unlit lower flank) to 1 (the lit upper flank): WotR's darkest plum,
// the econ plum, the gem's shadow and its lit value, a step brighter for the facet that faces
// the light, so lit and unlit facets part at 24 px.
const GEM = [
  [0, "#1a0814"],
  [0.3, "#2e1027"],
  [0.55, "#4b2249"],
  [0.8, "#743a79"],
  [1, "#a85aae"],
];
const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
function gem(tone) {
  const i = Math.max(
    1,
    GEM.findIndex(([at]) => at >= tone),
  );
  const [t0, c0] = GEM[i - 1];
  const [t1, c1] = GEM[i];
  const k = (tone - t0) / (t1 - t0);
  const [a, b] = [channels(c0), channels(c1)];
  return `#${a
    .map((v, j) =>
      Math.round(v + (b[j] - v) * k)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
// Each facet in its gem tone; the same colour as a 0.6 stroke closes the anti-aliasing
// hairlines between neighbours. The front face is drawn last, as the parchment leaf.
const FACETS = g.FACES.filter((face) => face.role !== "front")
  .map((face) => {
    const fill = gem(face.tone);
    return `<polygon points="${face.points}" fill="${fill}" stroke="${fill}" stroke-width="0.6"/>`;
  })
  .join("");
const IRON = "#100a0f"; // the blackened iron of seams and keyline (W1 plates, darkest)
const OXBLOOD = "#6b2f36"; // WotR's drop-cap ink (facts §0.5)
const FACE_FONT =
  'font-family="Vollkorn, Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif" font-weight="800" style="font-variant-numeric: lining-nums"';

export function directionLogo(className) {
  const s = g.uniqueSuffix(); // the logo renders more than once on a page
  const sheen = `sheen-${s}`;
  const rim = `rim-${s}`;
  const leaf = `leaf-${s}`;
  return g.logoSvg(
    className,
    "<defs>" +
      `<linearGradient id="${sheen}" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="#f4e6f6" stop-opacity="0.3"/><stop offset="0.42" stop-color="#f4e6f6" stop-opacity="0"/><stop offset="0.62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.3"/></linearGradient>` +
      `<linearGradient id="${rim}" x1="0.1" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="#b3a9ab"/><stop offset="0.45" stop-color="#6d6569"/><stop offset="1" stop-color="#342d32"/></linearGradient>` +
      `<linearGradient id="${leaf}" x1="0" y1="0" x2="0" y2="1"><stop offset="0.15" stop-color="#f2ebe1"/><stop offset="0.65" stop-color="#d9d2ca"/><stop offset="1" stop-color="#c3bcae"/></linearGradient>` +
      "</defs>" +
      FACETS +
      `<polygon points="${g.OUTLINE}" fill="url(#${sheen})"/>` +
      `<path d="${g.SEAMS}" fill="none" stroke="${IRON}" stroke-width="2.4" stroke-linecap="round"/>` +
      `<polygon points="${g.OUTLINE}" fill="none" stroke="${IRON}" stroke-width="7" stroke-linejoin="round"/>` +
      `<polygon points="${g.OUTLINE}" fill="none" stroke="url(#${rim})" stroke-width="3" stroke-linejoin="round"/>` +
      `<polygon points="${g.CENTER_FACE}" fill="url(#${leaf})" stroke="${IRON}" stroke-width="2.8" stroke-linejoin="round"/>` +
      g.numeral(`${FACE_FONT} fill="${OXBLOOD}"`, 19),
  );
}

// The tab icon: the same die in three flat gem tones (lit, mid, unlit) with wide iron seams,
// a black iron edge for light tab strips, a grey rim for dark ones and the parchment face; no
// numeral (it does not survive 16 px). Literal colours only: a tab icon has no page CSS.
const TAB_TONE = (tone) => (tone > 0.6 ? "#b763bc" : tone > 0.35 ? "#6b3a6b" : "#3c1129");
export const favicon = g.faviconSvg(
  g.FACES.filter((face) => face.role !== "front")
    .map((face) => {
      const fill = TAB_TONE(face.tone);
      return `<polygon points="${face.points}" fill="${fill}" stroke="${fill}" stroke-width="1"/>`;
    })
    .join("") +
    `<path d="${g.SEAMS}" fill="none" stroke="${IRON}" stroke-width="4.5" stroke-linecap="round"/>` +
    `<polygon points="${g.OUTLINE}" fill="none" stroke="${IRON}" stroke-width="10" stroke-linejoin="round"/>` +
    `<polygon points="${g.OUTLINE}" fill="none" stroke="#8d8793" stroke-width="3.5" stroke-linejoin="round"/>` +
    `<polygon points="${g.CENTER_FACE}" fill="#ece4d8" stroke="${IRON}" stroke-width="6" stroke-linejoin="round"/>`,
);
