// Direction «1 · Baldur's Gate 3» (id "bg3"): its own brand (I-251). Dev-only; loaded by
// directions/index.mjs while this direction is active (contract: directions/README.md
// «brand.mjs»). Provenance and the comparison with BG3's own logo: SOURCES.md «Marchio».
//
// The mark is a die cast in gilt metal with a dark enamel «20» face, in BG3's brand grammar:
//   - the nine outer faces are gilt, each lit by the shared light (upper left) through a ramp
//     of BG3's own bronze and gold values (facts A0: #77542c, #b17d44, #d9bd7c, highlight
//     #fff2b3), with a warm sheen across the die and a bright bevel on its upper edges, as on
//     the game's cast-gold title lettering;
//   - the seams are engraved: dark brown lines, wide enough to part the faces at 24 px;
//   - the «20» face is a small BG3 plate: near-black (#0c0c0c panels) inside a gold rule,
//     with the numeral in Alegreya (the direction's face), cream to gold, over the game's gold
//     text glow (facts A0 «TextGlow» #df9800), as the roll panel writes its numbers.
// The geometry is the shared true icosahedron (../brand-geometry.mjs); nothing here is drawn
// from BG3's logo (no letterform, no emblem, no thorned numeral, no frame art).
import * as g from "../brand-geometry.mjs";

// Gilt ramp, tone 0 (the unlit lower flank) to 1 (the lit upper flank): BG3's bronze, gold,
// gold rule and highlight (facts A0, A3), deepened at the shadow end to the near-black brown
// of the title lettering's recesses, so lit and unlit flanks still part at 24 px.
const GILT = [
  [0, "#2e1d0e"],
  [0.3, "#77542c"],
  [0.55, "#b17d44"],
  [0.8, "#d9bd7c"],
  [1, "#f3dfa6"],
];
const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
function gilt(tone) {
  const i = Math.max(
    1,
    GILT.findIndex(([at]) => at >= tone),
  );
  const [t0, c0] = GILT[i - 1];
  const [t1, c1] = GILT[i];
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
// Each outer face in its gilt tone; the same colour as a 0.6 stroke closes the anti-aliasing
// hairlines between neighbours. The front face is drawn last, as the enamel plate.
const OUTER = g.FACES.filter((face) => face.role !== "front")
  .map((face) => {
    const fill = gilt(face.tone);
    return `<polygon points="${face.points}" fill="${fill}" stroke="${fill}" stroke-width="0.6"/>`;
  })
  .join("");
// The bevel: the upper edges of the silhouette (lower left, upper left, top, upper right),
// 7.5 % inside the outline so it clears the dark edge stroke.
const BEVEL = ["LL", "UL", "T", "UR"]
  .map((name) => g.V[name].map((v) => (50 + (v - 50) * 0.925).toFixed(2)).join(","))
  .join(" ");
const FACE_FONT =
  'font-family="Alegreya, Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif" font-weight="800" style="font-variant-numeric: lining-nums"';

export function directionLogo(className) {
  const s = g.uniqueSuffix(); // the logo renders more than once on a page
  const sheen = `sheen-${s}`;
  const bevel = `bevel-${s}`;
  const enamel = `enamel-${s}`;
  const ink = `ink-${s}`;
  const glow = `glow-${s}`;
  return g.logoSvg(
    className,
    "<defs>" +
      `<linearGradient id="${sheen}" x1="0.15" y1="0.05" x2="0.85" y2="0.95"><stop offset="0" stop-color="#fff6d8" stop-opacity="0.28"/><stop offset="0.45" stop-color="#fff6d8" stop-opacity="0"/><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.35"/></linearGradient>` +
      `<linearGradient id="${bevel}" x1="0" y1="0" x2="1" y2="0.6"><stop offset="0" stop-color="#fff3c8" stop-opacity="0.95"/><stop offset="0.55" stop-color="#fff3c8" stop-opacity="0.5"/><stop offset="1" stop-color="#fff3c8" stop-opacity="0"/></linearGradient>` +
      `<linearGradient id="${enamel}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050403"/><stop offset="0.4" stop-color="#1a140f"/><stop offset="1" stop-color="#0b0907"/></linearGradient>` +
      `<linearGradient id="${ink}" x1="0" y1="0" x2="0" y2="1"><stop offset="0.3" stop-color="#fff8dc"/><stop offset="1" stop-color="#e7c67e"/></linearGradient>` +
      `<filter id="${glow}" x="-40%" y="-60%" width="180%" height="220%"><feGaussianBlur stdDeviation="1.2"/></filter>` +
      "</defs>" +
      OUTER +
      `<polygon points="${g.OUTLINE}" fill="url(#${sheen})"/>` +
      `<path d="${g.SEAMS}" fill="none" stroke="#1b1108" stroke-width="2.2" stroke-linecap="round"/>` +
      `<polygon points="${g.OUTLINE}" fill="none" stroke="#120b06" stroke-width="3.6" stroke-linejoin="round"/>` +
      `<polyline points="${BEVEL}" fill="none" stroke="url(#${bevel})" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/>` +
      `<polygon points="${g.CENTER_FACE}" fill="url(#${enamel})" stroke="#e6c987" stroke-width="2.4" stroke-linejoin="round"/>` +
      g.numeral(`${FACE_FONT} fill="#df9800" fill-opacity="0.6" filter="url(#${glow})"`, 19) +
      g.numeral(`${FACE_FONT} fill="url(#${ink})"`, 19),
  );
}

// The tab icon: the same die in three flat gilt tones (lit, mid, unlit) with wide seams, a dark
// edge for light tab strips and the enamel face inside its gold rule; no numeral (it does not
// survive 16 px). Literal colours only: a tab icon has no page CSS.
const TAB_TONE = (tone) => (tone > 0.6 ? "#e8c98a" : tone > 0.35 ? "#b5833f" : "#6e4a23");
export const favicon = g.faviconSvg(
  g.FACES.filter((face) => face.role !== "front")
    .map((face) => {
      const fill = TAB_TONE(face.tone);
      return `<polygon points="${face.points}" fill="${fill}" stroke="${fill}" stroke-width="1"/>`;
    })
    .join("") +
    `<path d="${g.SEAMS}" fill="none" stroke="#1a1008" stroke-width="4.5" stroke-linecap="round"/>` +
    `<polygon points="${g.OUTLINE}" fill="none" stroke="#140c06" stroke-width="8" stroke-linejoin="round"/>` +
    `<polygon points="${g.CENTER_FACE}" fill="#120d09" stroke="#f3d996" stroke-width="6" stroke-linejoin="round"/>`,
);
