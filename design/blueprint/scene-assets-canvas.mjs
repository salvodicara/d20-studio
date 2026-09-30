// B47 — SVG drawing shared by the Preparation workspace and the Table: scene objects
// (stickers and library images), stairs, creatures waiting off the map, the off-map frame.
// Every text goes through ctx.esc; objects carry data attributes for their handlers.
import { stickerById } from "./scene-assets-art.mjs";
import { OFF_MAP } from "./scene-assets-domain.mjs";
import { findAsset } from "./media-domain.mjs";

const f1 = (n) => Math.round(n * 10) / 10;

/** Width in metres of an object, in the viewer's language (D&D Beyond shows its width). */
export function metersText(ctx, scene, px) {
  const meters = (Number(px) * (scene?.metersPerCell ?? 1.5)) / (scene?.gridSize ?? 50);
  return (
    new Intl.NumberFormat(ctx.lang === "it" ? "it-IT" : "en-GB", {
      maximumFractionDigits: 1,
    }).format(meters) + " m"
  );
}
export const pxFromMeters = (scene, meters) =>
  (Number(meters) / (scene?.metersPerCell ?? 1.5)) * (scene?.gridSize ?? 50);

const lockGlyph = (x, y) =>
  `<g class="sa-lock" transform="translate(${f1(x)} ${f1(y)})"><rect x="-9" y="-9" width="18" height="18" rx="4" fill="#17232e" stroke="#dfbd78" stroke-width="1.5"/><path d="M-4-1v-3a4 4 0 0 1 8 0v3M-5-1h10v7h-10Z" fill="none" stroke="#dfbd78" stroke-width="1.6"/></g>`;
const hiddenGlyph = (x, y) =>
  `<g class="sa-hidden-mark" transform="translate(${f1(x)} ${f1(y)})"><rect x="-9" y="-9" width="18" height="18" rx="4" fill="#17232e" stroke="#f1a09a" stroke-width="1.5"/><path d="M-6 0s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4ZM-6 5 6-5" fill="none" stroke="#f1a09a" stroke-width="1.5"/></g>`;

/** One object: sticker art or a library image, rotated around its centre. */
export function propSvg(
  ctx,
  row,
  { selected = false, dm = false, faded = false, state = ctx.state } = {},
) {
  const art = row.sticker ? stickerById(row.sticker) : null;
  const aspect = art ? art.aspect : row.height / row.width || 1;
  let inner = "";
  if (art) inner = art.svg;
  else {
    const asset = row.assetId ? findAsset(state, row.assetId) : null;
    inner = asset?.dataUrl
      ? `<image href="${ctx.esc(asset.dataUrl)}" x="-50" y="${f1(-50 * aspect)}" width="100" height="${f1(100 * aspect)}" preserveAspectRatio="none"/>`
      : dm
        ? `<rect x="-50" y="${f1(-50 * aspect)}" width="100" height="${f1(100 * aspect)}" fill="#2a3c49" stroke="#f1a09a" stroke-dasharray="6 4"/><text y="4" text-anchor="middle" font-size="12" fill="#f1a09a">?</text>`
        : "";
  }
  const sx = row.width / 100;
  const sy = row.height / (100 * aspect);
  const opacity = faded ? row.fade : row.hidden ? 0.5 : 1;
  const classes = [
    "sa-prop",
    row.layer === "foreground" ? "sa-roof" : "",
    selected ? "is-selected" : "",
    row.locked ? "is-locked" : "",
    row.hidden ? "is-hidden" : "",
    faded ? "is-faded" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const w2 = row.width / 2,
    h2 = row.height / 2;
  return `<g class="${classes}" data-sa-prop="${ctx.esc(row.id)}" transform="translate(${f1(row.x)} ${f1(row.y)}) rotate(${row.rotation})" style="opacity:${opacity}"><title>${ctx.esc(row.name)}${row.hidden ? " · " + ctx.t("nascosto ai giocatori", "hidden from players") : ""}${row.locked ? " · " + ctx.t("bloccato", "locked") : ""}</title><g transform="scale(${f1(sx * 1000) / 1000} ${f1(sy * 1000) / 1000})">${inner}</g>${dm && row.hidden ? `<rect class="sa-hidden-outline" x="${f1(-w2)}" y="${f1(-h2)}" width="${f1(row.width)}" height="${f1(row.height)}" fill="none" stroke="#f1a09a" stroke-width="2" stroke-dasharray="8 5" vector-effect="non-scaling-stroke"/>` : ""}${selected ? `<rect class="sa-selection" x="${f1(-w2 - 4)}" y="${f1(-h2 - 4)}" width="${f1(row.width + 8)}" height="${f1(row.height + 8)}" fill="none" stroke="#f1d797" stroke-width="2.5" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/>` : ""}${dm && row.locked ? lockGlyph(w2 - 4, -h2 + 4) : ""}${dm && row.hidden ? hiddenGlyph(-w2 + 4, -h2 + 4) : ""}</g>`;
}

/** Stairs of a floor: a dashed ring with where it leads (Foundry levels region). */
export function stairsSvg(ctx, stairs, { editable = false, labels = new Map() } = {}) {
  return stairs
    .map(
      (stair) =>
        `<g class="sa-stair${editable ? " is-editable" : ""}" data-sa-stair="${ctx.esc(stair.id)}" transform="translate(${stair.x} ${stair.y})"><title>${ctx.esc(stair.name)}${labels.get(stair.id) ? " · " + ctx.esc(labels.get(stair.id)) : ""}</title><circle r="${stair.radius}" fill="rgba(223,189,120,.08)" stroke="#dfbd78" stroke-width="3" stroke-dasharray="10 7" vector-effect="non-scaling-stroke"/><g class="sa-stair-badge" transform="translate(0 ${-stair.radius - 4})"><rect x="-38" y="-15" width="76" height="22" rx="11" fill="#17232e" stroke="#dfbd78"/><text y="1" text-anchor="middle" font-size="13" fill="#f4e4bf">${ctx.esc(labels.get(stair.id) ?? "⇅")}</text></g></g>`,
    )
    .join("");
}

/** The off-map frame (DM only): the area outside the map where things wait unseen. */
export function offMapFrame(ctx, scene, { table = false } = {}) {
  const m = OFF_MAP;
  return `<g class="sa-offmap-frame${table ? " is-table" : ""}" pointer-events="none"><path d="M${-m} ${-m}H${scene.width + m}V${scene.height + m}H${-m}Z M0 0V${scene.height}H${scene.width}V0Z" fill="url(#sa-hatch)" fill-rule="evenodd" opacity=".85"/><rect x="0" y="0" width="${scene.width}" height="${scene.height}" fill="none" stroke="#dfbd78" stroke-width="2" stroke-dasharray="12 8" vector-effect="non-scaling-stroke"/><text x="${scene.width + m / 2}" y="${-m / 2 + 30}" text-anchor="middle" font-size="18" fill="#dfbd78">${ctx.t("Fuori mappa · solo DM", "Off the map · DM only")}</text></g>`;
}
export const hatchDefs = () =>
  `<defs><pattern id="sa-hatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="16" height="16" fill="#141d25"/><path d="M0 0V16" stroke="#2a3a47" stroke-width="6"/></pattern></defs>`;

/** Creatures waiting off the map (DM only): a token-like ring with the name. */
export function stagedSvg(ctx, rows, { draggable = false } = {}) {
  return rows
    .map((row) => {
      const actor = ctx.state.actors[row.actorId];
      const name = actor?.name ?? "?";
      return `<g class="sa-staged${draggable ? " is-draggable" : ""}" data-sa-staged="${ctx.esc(row.id)}" transform="translate(${row.x} ${row.y})" tabindex="0" role="button" aria-label="${ctx.esc(ctx.t(`${name}, fuori mappa: trascina sulla mappa o premi Invio per farla entrare`, `${name}, off the map: drag onto the map or press Enter to bring it in`))}"><circle r="26" fill="#3d2326" stroke="#f1a09a" stroke-width="3" stroke-dasharray="6 4"/><text y="7" text-anchor="middle" font-size="20" fill="#f4e4bf">${ctx.esc(name[0])}</text><text y="46" text-anchor="middle" font-size="14" fill="#f4e4bf" stroke="#111b25" stroke-width="3" paint-order="stroke">${ctx.esc(name)}</text></g>`;
    })
    .join("");
}
