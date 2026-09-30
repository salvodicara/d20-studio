// Media at the Table (B28): token images drawn on the existing tokens, the missing-image
// badges, the token-image panel in the inspector and the Owlbear-style asset dock with
// drag and drop onto tokens and the map (VTL-061/062/240, VTL-104, DDB-108).
//
// The core tokens have no image hook. The art layer (a map layer under everything) adds
// one SVG pattern per token image and a scoped style that fills that token's circle with
// it; a token without a media image keeps the core look, so nothing breaks if the core
// markup changes. Only tokens this viewer can observe get a pattern.

import * as media from "./media-domain.mjs";
import { canViewActor, isActorAvailable } from "./character-access.mjs";
import {
  ui,
  src,
  thumb,
  useLabel,
  sizeText,
  renderNotice,
  bindNotice,
  importFiles,
  openViewer,
  openMissing,
  openAddVariant,
  renderTokenChoices,
  bindTokenChoices,
  attempt,
  actorOptions,
  sceneOptions,
  takeFiles,
  lockedUse,
  lockChip,
  bindLock,
  ACCEPT,
} from "./media-ui.mjs";

import { createSceneNPC, placeSceneToken } from "./preparation.mjs";
import * as SA from "./scene-assets-domain.mjs";
import { unseenTokens } from "./fog-vision-domain.mjs";

const SAFE_ID = /^[A-Za-z0-9_-]+$/;
export const DRAG_TYPE = "application/x-d20-media";

// Mirrors the Table's own observation rule, so no hidden token's image reaches the page.
export function canObserve(ctx, scene, actorId) {
  const actor = ctx.state.actors[actorId];
  const token = scene?.tokens?.find((row) => row.actorId === actorId);
  return Boolean(
    actor &&
    isActorAvailable(actor) &&
    (!actor.companion || canViewActor(actor, ctx.role, ctx.state)) &&
    (actor.visibility !== "private" || canViewActor(actor, ctx.role, ctx.state)) &&
    (ctx.canControl(actor) ||
      (!actor.hidden &&
        !token?.hidden &&
        token?.visible !== false &&
        // Close review 01/10: no portrait of a creature the fog or the dark hides.
        !(scene && unseenTokens(ctx.state, scene.id, ctx.role).has(actorId)))),
  );
}

// The form emblem in a unit box: a dark disc, the silhouette and a ring with «FORMA».
function formEmblem(ctx, emblem) {
  const word = ctx.t("FORMA", "FORM");
  return `<rect width="1" height="1" fill="#1d2a24"/><circle cx="0.5" cy="0.5" r="0.44" fill="none" stroke="#b9d98f" stroke-width="0.05"/><path d="${ctx.esc(emblem.path)}" transform="translate(0.26 0.2) scale(0.02)" fill="#e8f2d8" stroke="#e8f2d8" stroke-width="1" stroke-linejoin="round"/><text x="0.5" y="0.86" text-anchor="middle" font-size="0.13" font-weight="700" fill="#b9d98f" font-family="system-ui, sans-serif">${ctx.esc(word)}</text>`;
}
function emblemUrl(ctx, emblem) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1">${formEmblem(ctx, emblem)}</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg).replace(/'/g, "%27");
}
/** SVG defs + style painting token images, initiative dots and the inspector portrait. */
export function artLayer(ctx, tableView) {
  const scene = tableView?.scene;
  if (!scene || !media.mediaOf(ctx.state)) return "";
  const defs = [];
  const rules = [];
  for (const token of scene.tokens ?? []) {
    const id = token.actorId;
    if (!SAFE_ID.test(id) || !canObserve(ctx, scene, id)) continue;
    const art = media.tokenArt(ctx.state, id);
    if (!art) continue;
    // The border colour is the token menu's (B12): this layer paints only the image.
    const sel = `#battle-map .map-token[data-actor="${id}"] .token-display`;
    if (art.emblem) {
      // R3 PG-77: the form emblem (the beast's silhouette in a «forma» ring) as the token's
      // image, and the same emblem on the turn-order dot.
      defs.push(
        `<pattern id="media-art-${id}" patternContentUnits="objectBoundingBox" width="1" height="1">${formEmblem(ctx, art.emblem)}</pattern>`,
      );
      rules.push(
        `${sel} > circle:first-child{fill:url(#media-art-${id})}`,
        `${sel} > text:first-of-type{display:none}`,
        `.initiative-token[data-select="${id}"] .token-dot{background:url("${emblemUrl(ctx, art.emblem)}") center/cover no-repeat;color:transparent}`,
      );
      continue;
    }
    if (art.missing) {
      rules.push(`${sel} > circle:first-child{fill:#3b2626;stroke:#f1a09a;stroke-dasharray:5 4}`);
      continue;
    }
    if (!art.asset) continue;
    const url = src(art.asset);
    const g = media.cropGeometry(art.asset, art.crop);
    defs.push(
      `<pattern id="media-art-${id}" patternContentUnits="objectBoundingBox" width="1" height="1"><image href="${ctx.esc(url)}" x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" preserveAspectRatio="none"/></pattern>`,
    );
    const bg = media.cropBackground(art.asset, art.crop);
    rules.push(
      `${sel} > circle:first-child{fill:url(#media-art-${id})}`,
      `${sel} > text:first-of-type{display:none}`,
      `.initiative-token[data-select="${id}"] .token-dot{background:url("${url}") ${bg.position}/${bg.size} no-repeat;color:transparent}`,
    );
  }
  const selected = tableView.selectedActorId;
  if (selected && SAFE_ID.test(selected) && canObserve(ctx, scene, selected)) {
    const actor = ctx.state.actors[selected];
    const portrait = canViewActor(actor, ctx.role, ctx.state)
      ? media.portraitArt(ctx.state, selected)
      : null;
    const asset = portrait?.asset ?? media.tokenArt(ctx.state, selected)?.asset;
    if (asset)
      rules.push(
        `.table-inspector .inspector-person .portrait{background:url("${src(asset)}") center/cover no-repeat;color:transparent}`,
      );
  }
  return `<defs>${defs.join("")}</defs><style>${rules.join("")}</style>`;
}
/** Drop targets on the map: library items from the dock and files from the computer. */
export function bindArtLayer(el, ctx, table) {
  const svg = table?.svg;
  if (!svg) return;
  svg.addEventListener("dragover", (event) => {
    const types = [...(event.dataTransfer?.types ?? [])];
    if (!types.includes(DRAG_TYPE) && !types.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  });
  svg.addEventListener("drop", (event) => {
    const types = [...(event.dataTransfer?.types ?? [])];
    if (!types.includes(DRAG_TYPE) && !types.includes("Files")) return;
    event.preventDefault();
    handleDrop(ctx, table, event);
  });
}
async function handleDrop(ctx, table, event) {
  const actorId = event.target?.closest?.("[data-actor]")?.dataset.actor ?? null;
  // BI-33 (Owlbear's import wheel): where the image was let go on the map.
  let point = null;
  try {
    point = table.point?.(event) ?? null;
  } catch {
    point = null;
  }
  const assetId = event.dataTransfer.getData(DRAG_TYPE);
  if (assetId) {
    applyDropped(ctx, table, assetId, actorId, undefined, point);
    return;
  }
  const files = [...(event.dataTransfer.files ?? [])];
  if (!files.length) return;
  // Dropped on a token, a map or prop lock would not fit it: the wheel asks instead.
  const lock = !actorId || ["token", "portrait"].includes(lockedUse(ctx));
  const imported = await importFiles(ctx, files, { where: "dock", lock });
  for (const row of imported) applyDropped(ctx, table, row.id, actorId, row.use, point);
}
const clampTo = (scene, p) => ({
  x: Math.max(20, Math.min(scene.width - 20, Number(p?.x) || scene.width / 2)),
  y: Math.max(20, Math.min(scene.height - 20, Number(p?.y) || scene.height / 2)),
});
/**
 * BI-33 (Owlbear's import wheel creates the item where it was dropped): a token image on the
 * empty map becomes a new neutral NPC token with that image; a prop image becomes a scene
 * object at the drop point. DM only; one change, so Undo takes it back whole.
 */
export function placeDroppedToken(ctx, scene, asset, point) {
  const id = `npc-${crypto.randomUUID()}`;
  const name = String(asset.name || ctx.t("Creatura", "Creature"))
    .replace(/\.[^.]+$/, "")
    .slice(0, 100);
  ctx.commit(
    ctx.t(`Pedina «${name}» sulla mappa`, `Token “${name}” on the map`),
    (draft) => {
      createSceneNPC(draft, { id, name, hp: 10, ac: 10, speed: 9, team: "neutral" }, ctx.role);
      placeSceneToken(draft, scene.id, id, clampTo(scene, point), `token-${id}`, ctx.role);
      media.addTokenVariant(draft, ctx.role, id, asset.id, asset.name, { activate: true });
    },
    { visibility: "private" },
  );
  return id;
}
export function placeDroppedProp(ctx, scene, asset, point) {
  const cell = Number(scene.gridSize) || 50;
  const aspect =
    Number(asset.height) > 0 && Number(asset.width) > 0 ? asset.height / asset.width : 1;
  let row = null;
  ctx.commit(
    ctx.t(`Oggetto di scena «${asset.name}»`, `Scene object “${asset.name}”`),
    (draft) => {
      row = SA.addProp(draft, ctx.role, scene.id, {
        assetId: asset.id,
        name: asset.name,
        ...clampTo(scene, point),
        width: cell * 2,
        aspect,
      });
    },
    { visibility: "private" },
  );
  return row;
}
function applyDropped(ctx, table, assetId, actorId, use, point = null) {
  const asset = media.findAsset(ctx.state, assetId);
  if (!asset) return;
  const kind = use ?? asset.use;
  if (asset.kind === "image" && actorId && ["token", "portrait"].includes(kind)) {
    const actor = ctx.state.actors[actorId];
    if (!actor || !ctx.canControl(actor)) {
      ctx.toast(ctx.t("Non controlli questa pedina.", "You do not control this token."), true);
      return;
    }
    attempt(
      ctx,
      ctx.t(
        `«${asset.name}» sulla pedina di ${actor.name}`,
        `“${asset.name}” on ${actor.name}’s token`,
      ),
      (draft) =>
        media.addTokenVariant(draft, ctx.role, actorId, assetId, asset.name, { activate: true }),
      actorOptions(ctx, actorId),
    );
    return;
  }
  if (asset.kind === "image" && kind === "map") {
    confirmMap(ctx, asset);
    return;
  }
  const scene = table?.scene ?? ctx.state.scenes.find((row) => row.id === ctx.state.activeSceneId);
  if (asset.kind === "image" && !actorId && scene && ["token", "prop"].includes(kind)) {
    if (!media.isDM(ctx.state, ctx.role)) {
      ctx.toast(
        ctx.t(
          "Solo il DM aggiunge pedine e oggetti alla scena: l’immagine resta nella libreria.",
          "Only the DM adds tokens and objects to the scene: the image stays in the library.",
        ),
        true,
      );
      return;
    }
    try {
      if (kind === "token") {
        placeDroppedToken(ctx, scene, asset, point);
        ctx.toast(
          ctx.t(
            `«${asset.name}» è sulla mappa come PNG neutrale: nome, disposizione e statistiche dal menu della pedina.`,
            `“${asset.name}” is on the map as a neutral NPC: name, disposition and stats from the token menu.`,
          ),
        );
      } else if (!SA.sliceOf(ctx.state)) {
        ctx.toast(
          ctx.t("Gli oggetti di scena non sono disponibili.", "Scene objects are unavailable."),
          true,
        );
      } else {
        placeDroppedProp(ctx, scene, asset, point);
        ctx.toast(
          ctx.t(
            `«${asset.name}» è un oggetto della scena: spostalo, bloccalo o nascondilo in Preparazione › Oggetti.`,
            `“${asset.name}” is a scene object: move, lock or hide it in Preparation › Objects.`,
          ),
        );
      }
    } catch (error) {
      ctx.toast(ctx.label(error.it ? { it: error.it, en: error.en } : error.message), true);
    }
    return;
  }
  ctx.toast(
    ctx.t(
      `«${asset.name}» è nella libreria. Rilascia un’immagine di pedina su una pedina, o una mappa sulla mappa.`,
      `“${asset.name}” is in the library. Drop a token image on a token, or a map on the map.`,
    ),
  );
}
/** Uses a library map as the active scene's map, after a confirmation (DM only). */
export function confirmMap(ctx, asset) {
  const scene = ctx.state.scenes.find((row) => row.id === ctx.state.activeSceneId);
  if (!media.isDM(ctx.state, ctx.role)) {
    ctx.toast(
      ctx.t("Solo il DM cambia la mappa della scena.", "Only the DM changes the scene map."),
      true,
    );
    return;
  }
  if (!scene) return;
  ctx.dialog(
    ctx.t(`Usare «${asset.name}» come mappa?`, `Use “${asset.name}” as the map?`),
    `<p>${ctx.esc(ctx.t(`La scena «${scene.name}» conserva dimensioni, griglia, muri, porte e pedine: cambia solo l’immagine di sfondo.`, `The scene “${scene.name}” keeps its size, grid, walls, doors and tokens: only the background image changes.`))}</p><p class="muted">${ctx.t("Puoi annullare subito dopo o cambiarla nell’editor della scena.", "You can undo right after or change it in the scene editor.")}</p>`,
    {
      submitLabel: ctx.t("Usa come mappa", "Use as map"),
      onSubmit: () =>
        ctx.commit(
          ctx.t(`Mappa della scena: «${asset.name}»`, `Scene map: “${asset.name}”`),
          (draft) => media.setSceneMap(draft, ctx.role, scene.id, asset.id),
          sceneOptions(ctx, scene.id),
        ),
    },
  );
}

// Missing-file marks keep a constant screen size whatever the map scale: bind counter-scales
// them with the map's screen matrix, as B14's map HUD does. A badge is 24 px inside a 40 px
// target; the missing-map notice is an HTML strip at the bottom of the visible map, clear
// of the HUD row and the map toolbar, with a 40 px Fix button (Owlbear VTL-240).
const TOKEN_RADIUS = 23;
const BADGE_GAP = 12;

/** Interactive layer: missing-image badges on tokens and the missing-map notice. */
export function missingLayer(ctx, tableView) {
  const scene = tableView?.scene;
  if (!scene || !media.mediaOf(ctx.state)) return "";
  const out = [];
  for (const token of scene.tokens ?? []) {
    const actor = ctx.state.actors[token.actorId];
    if (!actor || !canObserve(ctx, scene, actor.id) || !ctx.canControl(actor)) continue;
    const art = media.tokenArt(ctx.state, actor.id);
    if (!art?.missing) continue;
    const text = ctx.t(
      `Immagine mancante sulla pedina di ${actor.name}: scegli come risolvere`,
      `Missing image on ${actor.name}’s token: choose how to fix it`,
    );
    const x = Number(token.x);
    const y = Number(token.y);
    const d = badgeOffset(1);
    out.push(
      `<g class="media-missing-badge" data-media-missing="${ctx.esc(actor.id)}" data-x="${x}" data-y="${y}" role="button" tabindex="0" aria-label="${ctx.esc(text)}" transform="translate(${x - d},${y - d})"><title>${ctx.esc(text)}</title><circle class="media-missing-hit" r="20"/><circle class="media-missing-dot" r="12"/><text y="5" text-anchor="middle">!</text></g>`,
    );
  }
  const map = media.sceneMapState(ctx.state, scene.id);
  if (map?.status === "missing") {
    const dm = media.isDM(ctx.state, ctx.role);
    const text = dm
      ? ctx.t(
          `Mappa mancante: «${map.name}» è stata eliminata`,
          `Missing map: “${map.name}” was deleted`,
        )
      : ctx.t("La mappa di questa scena non è disponibile", "This scene’s map is unavailable");
    const zoom = tableView.zoom || 1;
    const pan = tableView.pan ?? { x: 0, y: 0 };
    out.push(
      `<foreignObject class="media-map-missing-fo" x="${Number(pan.x) || 0}" y="${Number(pan.y) || 0}" width="${Number(scene.width) / zoom}" height="${Number(scene.height) / zoom}" pointer-events="none"><div xmlns="http://www.w3.org/1999/xhtml" class="media-map-missing-wrap"><div class="media-map-missing" role="status"><span>${ctx.esc(text)}</span>${dm ? `<button type="button" class="button" data-media-missing-map aria-label="${ctx.esc(ctx.t("Risolvi la mappa mancante", "Fix the missing map"))}">${ctx.t("Risolvi", "Fix")}</button>` : ""}</div></div></foreignObject>`,
    );
  }
  return out.join("");
}
/** Map units from a token's centre to its badge's centre, along each axis, at scale a. */
function badgeOffset(a) {
  return (TOKEN_RADIUS * a * Math.SQRT1_2 + BADGE_GAP) / a;
}
/** Counter-scales the badges and pins the notice to the visible map (screen pixels). */
export function layoutMissing(el, svg) {
  const m = svg?.isConnected ? svg.getScreenCTM?.() : null;
  if (!m?.a) return;
  for (const badge of el.querySelectorAll("[data-media-missing]")) {
    const d = badgeOffset(m.a);
    badge.setAttribute(
      "transform",
      `translate(${Number(badge.dataset.x) - d},${Number(badge.dataset.y) - d}) scale(${1 / m.a})`,
    );
  }
  const fo = el.querySelector(".media-map-missing-fo");
  const r = svg.getBoundingClientRect();
  if (!fo || !r.width) return;
  const origin = new DOMPoint(r.left, r.top).matrixTransform(m.inverse());
  fo.setAttribute("x", "0");
  fo.setAttribute("y", "0");
  fo.setAttribute("width", String(r.width));
  fo.setAttribute("height", String(r.height));
  fo.setAttribute("transform", `translate(${origin.x} ${origin.y}) scale(${1 / m.a})`);
  const wrap = fo.firstElementChild;
  if (wrap) {
    wrap.style.width = r.width + "px";
    wrap.style.height = r.height + "px";
  }
}
let missingObserver = null;
export function bindMissingLayer(el, ctx, table) {
  const activate = (node, run) => {
    const act = (event) => {
      event.preventDefault();
      event.stopPropagation();
      run();
    };
    node.addEventListener("click", act);
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") act(event);
    });
    // The map must not start a pan or a move under the mark's own press.
    node.addEventListener("pointerdown", (event) => event.stopPropagation());
  };
  missingObserver?.disconnect();
  missingObserver = null;
  if (table?.svg && el.querySelector("[data-media-missing], .media-map-missing-fo")) {
    layoutMissing(el, table.svg);
    if (typeof ResizeObserver === "function") {
      missingObserver = new ResizeObserver(() => layoutMissing(el, table.svg));
      missingObserver.observe(table.svg);
    }
  }
  el.querySelectorAll("[data-media-missing]").forEach((node) =>
    activate(node, () => {
      const actorId = node.dataset.mediaMissing;
      const actor = ctx.state.actors[actorId];
      const art = media.tokenArt(ctx.state, actorId);
      if (!actor || !art?.missing) return;
      openMissing(ctx, {
        kind: art.source === "variant" ? "variant" : "portrait",
        actorId,
        variantId: art.variantId,
        name: art.missing.name,
        label: { it: `pedina di ${actor.name}`, en: `${actor.name}’s token` },
      });
    }),
  );
  const fix = el.querySelector("[data-media-missing-map]");
  if (fix)
    activate(fix, () => {
      const scene =
        table?.scene ?? ctx.state.scenes.find((row) => row.id === ctx.state.activeSceneId);
      const map = media.sceneMapState(ctx.state, scene.id);
      openMissing(ctx, {
        kind: "scene",
        sceneId: scene.id,
        name: map?.name,
        label: { it: `mappa della scena «${scene.name}»`, en: `map of the scene “${scene.name}”` },
      });
    });
}

// ---------------------------------------------------------------- inspector panel

export function tokenPanelVisible(ctx, tableView) {
  const actor = ctx.state.actors[tableView?.selectedActorId];
  return Boolean(actor && media.mediaOf(ctx.state) && ctx.canControl(actor));
}
export function renderTokenPanel(ctx, tableView) {
  const actorId = tableView.selectedActorId;
  const art = media.tokenArt(ctx.state, actorId);
  return `<div class="media-token-panel" data-media-panel="${ctx.esc(actorId)}">${
    art?.missing
      ? `<p class="media-missing-note" role="alert">${ctx.esc(ctx.t(`Immagine mancante: «${art.missing.name}» è stata eliminata.`, `Missing image: “${art.missing.name}” was deleted.`))} <button type="button" class="button quiet" data-media-panel-fix>${ctx.t("Risolvi", "Fix")}</button></p>`
      : ""
  }${renderTokenChoices(ctx, actorId)}<div class="toolbar"><button type="button" class="button" data-media-panel-add>${ctx.icon("plus")} ${ctx.t("Aggiungi immagine", "Add image")}</button><button type="button" class="button quiet" data-media-panel-look>${ctx.t("Aspetto nella scheda", "Appearance on the sheet")}</button></div></div>`;
}
export function bindTokenPanel(el, ctx) {
  const actorId = el.querySelector("[data-media-panel]")?.dataset.mediaPanel;
  if (!actorId) return;
  bindTokenChoices(el, ctx, actorId);
  el.querySelector("[data-media-panel-add]")?.addEventListener("click", () =>
    openAddVariant(ctx, actorId, { activate: true }),
  );
  el.querySelector("[data-media-panel-look]")?.addEventListener("click", () =>
    ctx.navigate("characters", { id: actorId, tab: "media" }),
  );
  el.querySelector("[data-media-panel-fix]")?.addEventListener("click", () => {
    const actor = ctx.state.actors[actorId];
    const art = media.tokenArt(ctx.state, actorId);
    if (art?.missing)
      openMissing(ctx, {
        kind: art.source === "variant" ? "variant" : "portrait",
        actorId,
        variantId: art.variantId,
        name: art.missing.name,
        label: { it: `pedina di ${actor.name}`, en: `${actor.name}’s token` },
      });
  });
}
/** Token-menu entry (menu UI by B12): the same choices in a dialog. */
export function openTokenImages(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  ctx.dialog(
    ctx.t(`Immagini della pedina di ${actor.name}`, `${actor.name}’s token images`),
    `${renderTokenChoices(ctx, actorId)}<div class="toolbar"><button type="button" class="button" data-media-panel-add>${ctx.icon("plus")} ${ctx.t("Aggiungi immagine", "Add image")}</button></div>`,
    { cancelLabel: ctx.t("Chiudi", "Close") },
  );
  const dialog = document.querySelector("#dialog");
  bindTokenChoices(dialog, ctx, actorId, { after: () => ctx.closeDialog() });
  dialog
    .querySelector("[data-media-panel-add]")
    ?.addEventListener("click", () => openAddVariant(ctx, actorId, { activate: true }));
}

// ---------------------------------------------------------------- asset dock (Owlbear)

const DOCK_TYPES = ["", "map", "token", "portrait", "prop", "document"];
export function renderDock(ctx, tableView) {
  const assets = media.visibleAssets(ctx.state, ctx.role);
  const selected = ctx.state.actors[tableView?.selectedActorId];
  const target = selected && ctx.canControl(selected) ? selected : null;
  const dm = media.isDM(ctx.state, ctx.role);
  const matches = (asset) =>
    (!ui.dock.use || asset.use === ui.dock.use) &&
    (!ui.dock.query ||
      [asset.name, asset.fileName, ...asset.tags]
        .join(" ")
        .toLocaleLowerCase()
        .includes(ui.dock.query));
  return `<div class="media-dock" data-media-dock>${renderNotice(ctx, "dock")}<div class="media-dock-bar"><div class="media-type-tabs" role="group" aria-label="${ctx.t("Tipo di file", "File type")}">${DOCK_TYPES.map(
    (use) =>
      `<button type="button" class="button quiet ${ui.dock.use === use ? "active" : ""}" data-media-dock-use="${use}" aria-pressed="${ui.dock.use === use}">${use ? ctx.esc(ctx.label(media.SYSTEM_FOLDERS.find((row) => row.use === use).name)) : ctx.t("Tutti", "All")}</button>`,
  ).join(
    "",
  )}</div><input type="search" class="media-dock-search" data-media-dock-search value="${ctx.esc(ui.dock.query)}" aria-label="${ctx.t("Cerca in tutti i tipi", "Search all types")}" placeholder="${ctx.t("Cerca in tutti i tipi", "Search all types")}"><label class="button media-file-button">${ctx.icon("plus")} ${ctx.t("Carica", "Upload")}<input type="file" multiple accept="${ACCEPT}" data-media-dock-upload></label><button type="button" class="button quiet" data-media-manage>${ctx.t("Gestisci la libreria", "Manage library")}</button></div>${lockChip(ctx)}<p class="muted media-dock-hint">${ctx.t("Trascina un’immagine su una pedina o una mappa sulla scena, oppure usa i pulsanti. Puoi rilasciare anche file dal computer sulla mappa.", "Drag an image onto a token or a map onto the scene, or use the buttons. You can also drop files from your computer onto the map.")}</p><ul class="media-dock-items">${assets
    .map((asset) => {
      const actions = [];
      if (asset.kind === "image" && asset.use === "map" && dm)
        actions.push(
          `<button type="button" class="button" data-media-dock-map="${ctx.esc(asset.id)}">${ctx.t("Usa come mappa", "Use as map")}</button>`,
        );
      if (asset.kind === "image" && ["token", "portrait"].includes(asset.use) && target)
        actions.push(
          `<button type="button" class="button" data-media-dock-token="${ctx.esc(asset.id)}">${ctx.esc(ctx.t(`Sulla pedina di ${target.name}`, `On ${target.name}’s token`))}</button>`,
        );
      actions.push(
        `<button type="button" class="button quiet" data-media-dock-open="${ctx.esc(asset.id)}">${ctx.t("Apri", "Open")}</button>`,
      );
      return `<li class="media-dock-item" data-media-dock-item data-use="${ctx.esc(asset.use)}" data-search="${ctx.esc([asset.name, asset.fileName, ...asset.tags].join(" ").toLocaleLowerCase())}" ${matches(asset) ? "" : "hidden"}><span class="media-dock-thumb" draggable="${asset.kind === "image"}" data-media-drag="${ctx.esc(asset.id)}" title="${ctx.esc(ctx.t("Trascina sulla mappa", "Drag onto the map"))}">${thumb(ctx, asset)}</span><span class="media-dock-name"><strong>${ctx.esc(asset.name)}</strong><small><span class="badge">${ctx.esc(useLabel(ctx, asset.use))}</span> ${ctx.esc(sizeText(ctx, asset))}</small></span><span class="media-dock-actions">${actions.join("")}</span></li>`;
    })
    .join(
      "",
    )}</ul><p class="muted" data-media-dock-empty ${assets.some(matches) ? "hidden" : ""}>${ctx.t("Nessun file di questo tipo.", "No file of this type.")}</p></div>`;
}
export function bindDock(el, ctx, table) {
  bindNotice(el, ctx);
  bindLock(el, ctx);
  const items = [...el.querySelectorAll("[data-media-dock-item]")];
  const filter = () => {
    let shown = 0;
    for (const item of items) {
      const visible =
        (!ui.dock.use || item.dataset.use === ui.dock.use) &&
        (!ui.dock.query || item.dataset.search.includes(ui.dock.query));
      item.hidden = !visible;
      if (visible) shown += 1;
    }
    el.querySelector("[data-media-dock-empty]").hidden = shown > 0;
  };
  el.querySelectorAll("[data-media-dock-use]").forEach((button) =>
    button.addEventListener("click", () => {
      ui.dock.use = button.dataset.mediaDockUse;
      el.querySelectorAll("[data-media-dock-use]").forEach((other) => {
        other.classList.toggle("active", other === button);
        other.setAttribute("aria-pressed", String(other === button));
      });
      filter();
    }),
  );
  el.querySelector("[data-media-dock-search]")?.addEventListener("input", (event) => {
    ui.dock.query = event.target.value.trim().toLocaleLowerCase();
    filter();
  });
  el.querySelector("[data-media-dock-upload]")?.addEventListener("change", (event) => {
    const files = takeFiles(event);
    if (files.length) importFiles(ctx, files, { where: "dock" });
  });
  el.querySelector("[data-media-manage]")?.addEventListener("click", () =>
    ctx.navigate("library", { tab: "media" }),
  );
  el.querySelectorAll("[data-media-dock-map]").forEach((button) =>
    button.addEventListener("click", () => {
      const asset = media.findAsset(ctx.state, button.dataset.mediaDockMap);
      if (asset) confirmMap(ctx, asset);
    }),
  );
  el.querySelectorAll("[data-media-dock-token]").forEach((button) =>
    button.addEventListener("click", () =>
      applyDropped(ctx, table, button.dataset.mediaDockToken, table?.selectedActorId, "token"),
    ),
  );
  el.querySelectorAll("[data-media-dock-open]").forEach((button) =>
    button.addEventListener("click", () => {
      const asset = media.findAsset(ctx.state, button.dataset.mediaDockOpen);
      if (asset) openViewer(ctx, asset);
    }),
  );
  el.querySelectorAll("[data-media-drag]").forEach((handle) =>
    handle.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData(DRAG_TYPE, handle.dataset.mediaDrag);
      event.dataTransfer.setData(
        "text/plain",
        handle.closest("li")?.querySelector("strong")?.textContent ?? "",
      );
      event.dataTransfer.effectAllowed = "copy";
    }),
  );
}
