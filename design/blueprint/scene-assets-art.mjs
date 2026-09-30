// B47 — the sticker catalogue: scene objects drawn as SVG for the blueprint (no external
// asset). Pattern: D&D Beyond Maps Sticker Browser (DDB-107): search by name or tag with
// partial matches, "+" to add, width shown in real units, utility stickers the DM can keep
// hidden as reminders. Each sticker is drawn around (0, 0) in a box 100 units wide and
// `100 × aspect` tall; the renderer scales it to the object's width in scene pixels.
const L = (it, en) => Object.freeze({ it, en });
const sticker = (id, name, tags, meters, aspect, layer, svg) =>
  Object.freeze({ id, name, tags: Object.freeze(tags), meters, aspect, layer, svg });

const canopy = (fill, dark) =>
  `<circle r="46" fill="${dark}"/><circle cx="-14" cy="-10" r="30" fill="${fill}"/><circle cx="16" cy="-12" r="27" fill="${fill}"/><circle cx="4" cy="16" r="30" fill="${fill}"/><circle cx="-6" cy="-4" r="12" fill="#7ea05a" opacity=".55"/>`;

export const STICKERS = Object.freeze([
  sticker(
    "tree",
    L("Albero", "Tree"),
    ["bosco", "natura", "albero", "forest", "nature", "tree"],
    3,
    1,
    "map",
    canopy("#4f7a3a", "#2f4a25"),
  ),
  sticker(
    "fir",
    L("Abete", "Fir tree"),
    ["bosco", "natura", "albero", "forest", "nature", "tree", "pine"],
    3,
    1,
    "map",
    `<path d="M0-48 12-18 44-22 20 2 34 36 0 18-34 36-20 2-44-22-12-18Z" fill="#2f5a3a" stroke="#1d3a25" stroke-width="4"/><circle r="8" fill="#5a3d25"/>`,
  ),
  sticker(
    "bush",
    L("Cespuglio", "Bush"),
    ["bosco", "natura", "forest", "nature", "bush"],
    1.5,
    0.8,
    "map",
    `<ellipse rx="46" ry="36" fill="#3a5f30"/><circle cx="-18" cy="-6" r="18" fill="#557f40"/><circle cx="14" cy="4" r="20" fill="#557f40"/>`,
  ),
  sticker(
    "rock",
    L("Roccia", "Rock"),
    ["natura", "pietra", "nature", "stone", "rock"],
    1.5,
    0.8,
    "map",
    `<path d="M-44 10-30-28 6-38 40-18 46 16 14 38-30 34Z" fill="#6d6f6a" stroke="#40423f" stroke-width="5"/><path d="M-20-18 6-24 20-6" fill="none" stroke="#8d8f89" stroke-width="4"/>`,
  ),
  sticker(
    "tent",
    L("Tenda", "Tent"),
    ["accampamento", "campo", "goblin", "camp", "tent"],
    3,
    1,
    "map",
    `<path d="M-46-40H46V40H-46Z" fill="#8a6f47" stroke="#4f3d26" stroke-width="5"/><path d="M-46-40 0 0 46-40M-46 40 0 0 46 40" fill="none" stroke="#5e4a2f" stroke-width="3"/><path d="M-46 0H46" stroke="#3d2f1d" stroke-width="6"/>`,
  ),
  sticker(
    "campfire",
    L("Fuoco da campo", "Campfire"),
    ["accampamento", "fuoco", "luce", "camp", "fire", "light"],
    1.5,
    1,
    "map",
    `<circle r="44" fill="#3b3a36"/>${Array.from({ length: 9 }, (_, i) => `<circle cx="${Math.round(38 * Math.cos((i * 2 * Math.PI) / 9))}" cy="${Math.round(38 * Math.sin((i * 2 * Math.PI) / 9))}" r="9" fill="#7c7a72"/>`).join("")}<path d="M-18 16 0-30 18 16Z" fill="#e0782c"/><path d="M-9 14 0-12 9 14Z" fill="#f5c05a"/>`,
  ),
  sticker(
    "crate",
    L("Cassa", "Crate"),
    ["accampamento", "arredo", "magazzino", "camp", "furniture", "storage", "crate"],
    1,
    1,
    "map",
    `<rect x="-44" y="-44" width="88" height="88" fill="#9a7447" stroke="#4d3822" stroke-width="6"/><path d="M-44-44 44 44M44-44-44 44" stroke="#5c4329" stroke-width="5"/>`,
  ),
  sticker(
    "barrel",
    L("Barile", "Barrel"),
    ["accampamento", "arredo", "magazzino", "camp", "furniture", "storage", "barrel"],
    1,
    1,
    "map",
    `<circle r="44" fill="#7b5a37" stroke="#3f2d1b" stroke-width="6"/><circle r="30" fill="none" stroke="#b9a27a" stroke-width="5"/><circle r="10" fill="#5a4128"/>`,
  ),
  sticker(
    "bedroll",
    L("Giaciglio", "Bedroll"),
    ["accampamento", "riposo", "camp", "rest", "bed"],
    1,
    2,
    "map",
    `<rect x="-40" y="-90" width="80" height="180" rx="16" fill="#6c4f63" stroke="#3a2a35" stroke-width="5"/><rect x="-32" y="-82" width="64" height="40" rx="10" fill="#cdbfa6"/>`,
  ),
  sticker(
    "table",
    L("Tavolo", "Table"),
    ["arredo", "interno", "furniture", "interior", "table"],
    2,
    0.5,
    "map",
    `<rect x="-46" y="-22" width="92" height="44" rx="4" fill="#8a6a45" stroke="#4a3620" stroke-width="5"/><path d="M-46-6H46M-46 8H46" stroke="#6e5234" stroke-width="2"/>`,
  ),
  sticker(
    "chest",
    L("Forziere", "Chest"),
    ["tesoro", "arredo", "treasure", "furniture", "chest"],
    1,
    0.7,
    "map",
    `<rect x="-44" y="-30" width="88" height="60" rx="6" fill="#7a4e2a" stroke="#3b2413" stroke-width="5"/><path d="M-44-6H44" stroke="#c9a34f" stroke-width="6"/><rect x="-7" y="-12" width="14" height="16" fill="#e2c46e"/>`,
  ),
  sticker(
    "lantern",
    L("Grande lanterna", "Great lantern"),
    ["luce", "torre", "light", "tower", "lantern"],
    2.5,
    1,
    "map",
    `<circle r="46" fill="#f2c46a" opacity=".25"/><circle r="30" fill="#6b5327" stroke="#c9a34f" stroke-width="6"/><circle r="16" fill="#ffe29a"/><path d="M-30 0H30M0-30V30" stroke="#c9a34f" stroke-width="4"/>`,
  ),
  sticker(
    "roof-wood",
    L("Tetto di legno", "Wooden roof"),
    ["tetto", "capanna", "edificio", "roof", "hut", "building"],
    6,
    0.9,
    "foreground",
    `<rect x="-48" y="-43" width="96" height="86" fill="#6a4a2e" stroke="#3a2716" stroke-width="4"/>${Array.from({ length: 8 }, (_, i) => `<path d="M-48 ${-43 + i * 11}H48" stroke="#553a22" stroke-width="2"/>`).join("")}<path d="M-48 0H48" stroke="#2e1f12" stroke-width="6"/>`,
  ),
  sticker(
    "roof-thatch",
    L("Tetto di paglia", "Thatched roof"),
    ["tetto", "capanna", "edificio", "roof", "hut", "building", "thatch"],
    6,
    0.9,
    "foreground",
    `<rect x="-48" y="-43" width="96" height="86" rx="10" fill="#a88a4a" stroke="#6b5427" stroke-width="4"/>${Array.from({ length: 12 }, (_, i) => `<path d="M${-44 + i * 8} -40V40" stroke="#8d7238" stroke-width="2"/>`).join("")}<path d="M-48 0H48" stroke="#5e4a21" stroke-width="6"/>`,
  ),
  sticker(
    "trap",
    L("Trappola a scatto", "Snare trap"),
    ["trappola", "promemoria", "dm", "trap", "reminder"],
    1.5,
    1,
    "map",
    `<circle r="44" fill="none" stroke="#c0392b" stroke-width="6" stroke-dasharray="10 6"/><path d="M-26-26 26 26M26-26-26 26" stroke="#e05545" stroke-width="7"/><circle r="10" fill="#f2d0a0"/>`,
  ),
  sticker(
    "marker",
    L("Segnalino", "Marker"),
    ["promemoria", "segnalino", "dm", "reminder", "marker", "pin"],
    1,
    1,
    "map",
    `<circle r="44" fill="#1f3f5a" stroke="#dfbd78" stroke-width="6"/><path d="M0-24 7-7 25-7 11 4 16 22 0 11-16 22-11 4-25-7-7-7Z" fill="#dfbd78"/>`,
  ),
]);

export const stickerById = (id) => STICKERS.find((row) => row.id === id) ?? null;

/** Stickers matching a query by name (either language) or tag, partial and case-free. */
export function searchStickers(query = "") {
  const text = String(query).trim().toLocaleLowerCase();
  if (!text) return [...STICKERS];
  return STICKERS.filter((row) =>
    [row.name.it, row.name.en, ...row.tags].some((value) =>
      value.toLocaleLowerCase().includes(text),
    ),
  );
}
