// B47 — Preparation › Scene (folded into the one list and editor by PR-03/06/08…15; the old
// "Scene avanzate" section is gone): the page menu of scenes (folders, breadcrumb, search,
// archive, create from blank / image / Universal VTT) and the workspace of one scene or prefab
// (objects, levels, variants, grid and view). DM only (Preparation is the DM's).
//
// Patterns: Roll20 Page Menu (R20-084), Monk's Scene Navigation chapters (FVT-107), D&D Beyond
// Sticker Browser (DDB-107), Foundry tiles and Placeables Palette (FVT-078/079), Roll20
// foreground (R20-097), Owlbear Prefabs, Outliner and three-step map alignment (VTL-081, 107,
// 063), Roll20 Align to Grid (R20-088), Shard/Quest Portal variants (VTL-075/077), Foundry
// V14 Scene Levels (FVT-080/081), Roll20 UVTT import (R20-089) and off-page area (R20-091).
import * as D from "./scene-assets-domain.mjs";
import {
  stackOf,
  floorName,
  floorsOf,
  stairsOn,
  createStack,
  addFloor,
  updateFloor,
  removeFloor,
  renameStack,
  addStair,
  updateStair,
  removeStair,
} from "./scene-levels.mjs";
import { parseUVTT, buildUVTTScene } from "./uvtt-import.mjs";
import { UVTT_SAMPLE, UVTT_SAMPLE_NAME } from "./uvtt-sample.mjs";
import { STICKERS, stickerById, searchStickers } from "./scene-assets-art.mjs";
import {
  propSvg,
  stairsSvg,
  stagedSvg,
  offMapFrame,
  hatchDefs,
  metersText,
  pxFromMeters,
} from "./scene-assets-canvas.mjs";
import { renderSceneBase, activateScene, createSceneNPC } from "./preparation.mjs";
import * as SRD from "./srd-compendium.mjs";
import { renderSpatialOverlay } from "./spatial-editor.mjs";
import { visibleAssets } from "./media-domain.mjs";
import { addLight, sliceOf as fogSlice } from "./fog-vision-domain.mjs";
import { errorText } from "./scene-assets-table.mjs";

const TABS = [
  ["objects", "Oggetti", "Objects"],
  ["levels", "Livelli", "Levels"],
  ["variants", "Varianti", "Variants"],
  ["grid", "Griglia e vista", "Grid and view"],
];
const MAX_IMAGE_BYTES = 1024 * 1024;

/** Transient workspace state of this browser (never persisted). */
// When a long touch last opened a canvas menu (module scope: it survives the redraw).
let touchMenuAt = 0;
export const ui = {
  route: null,
  folder: null,
  query: "",
  archive: false,
  tab: "objects",
  target: null,
  selected: new Set(),
  stickerQuery: "",
  outlineQuery: "",
  placing: null,
  stairPick: null,
  align: null,
  menu: null,
  propMenu: null,
  uvtt: null,
  image: null,
  host: null,
  returnTo: null,
  outlineKind: "all",
  picked: new Set(),
};
export function resetPrepUI() {
  Object.assign(ui, {
    route: null,
    folder: null,
    query: "",
    archive: false,
    tab: "objects",
    target: null,
    selected: new Set(),
    stickerQuery: "",
    outlineQuery: "",
    placing: null,
    stairPick: null,
    align: null,
    menu: null,
    propMenu: null,
    uvtt: null,
    image: null,
    host: null,
    returnTo: null,
    outlineKind: "all",
    picked: new Set(),
  });
}
const f1 = (n) => Math.round(n * 10) / 10;
const numberText = (ctx, value, digits = 1) =>
  new Intl.NumberFormat(ctx.lang === "it" ? "it-IT" : "en-GB", {
    maximumFractionDigits: digits,
  }).format(Number(value) || 0);

// PR-05: the list offers «Annulla» only for a change made to scenes (Gmail/Kanka "Undo"),
// never for an unrelated last change such as a rest. These are the labels of such changes.
const OWN_LABELS = new Set();
export function noteUndoable(label) {
  if (label) OWN_LABELS.add(String(label));
}
/** The label of this identity's last change when it was a scene change, else "". */
export function sceneUndoLabel(ctx) {
  const label = ctx.undoLabel?.() ?? "";
  return label && OWN_LABELS.has(label) ? label : "";
}
function commitOwn(ctx, label, mutator, options = {}) {
  // Noted first: the commit renders at once, and that render shows the named Undo. A label
  // noted for a refused commit is harmless (Undo also needs it to be the last change).
  noteUndoable(label);
  return ctx.commit(label, mutator, options);
}

/** Commits one change; a refusal becomes a toast and nothing changes. */
export function run(ctx, label, mutator, options = {}) {
  try {
    commitOwn(ctx, label, mutator, options);
    return true;
  } catch (error) {
    ctx.toast(errorText(ctx, error), true);
    return false;
  }
}
const dialogEl = () => globalThis.document?.querySelector?.("#dialog");
/** The shell's Undo for this identity's last change, named (like the session panel). */
export function undoButton(ctx) {
  const label = sceneUndoLabel(ctx);
  return label
    ? `<button type="button" class="button quiet sa-undo" data-sa-undo title="${ctx.esc(ctx.t("Annulla ultima modifica", "Undo last change"))}">${ctx.icon("undo")} ${ctx.t("Annulla", "Undo")}: ${ctx.esc(label)}</button>`
    : "";
}

// ------------------------------------------------------------------------------ page menu

function thumb(ctx, scene) {
  const props = D.visibleProps(ctx.state, scene.id, "dm").filter((row) => !D.isOffMap(scene, row));
  return `<svg class="sa-thumb" viewBox="0 0 ${scene.width} ${scene.height}" aria-hidden="true" preserveAspectRatio="xMidYMid slice">${renderSceneBase(scene, ctx)}${props.map((row) => propSvg(ctx, row, { dm: false })).join("")}</svg>`;
}
function sceneBadges(ctx, scene) {
  const badges = [];
  if (scene.id === ctx.state.activeSceneId) badges.push(ctx.t("Al Tavolo", "At the Table"));
  const found = stackOf(ctx.state, scene.id);
  if (found)
    badges.push(`${ctx.t("Piano", "Floor")}: ${floorName(found.floor)} · ${found.stack.name}`);
  const variants = D.variantsOf(ctx.state, scene.id);
  if (variants.list.length > 1)
    badges.push(
      `${variants.list.length} ${ctx.t("varianti", "variants")} · ${variants.list.find((v) => v.active)?.name ?? ""}`,
    );
  const props = D.sliceOf(ctx.state)?.props?.[scene.id]?.length ?? 0;
  if (props)
    badges.push(
      `${props} ${props === 1 ? ctx.t("oggetto", "object") : ctx.t("oggetti", "objects")}`,
    );
  if (!scene.revealed) badges.push(ctx.t("Solo DM", "DM only"));
  return badges.map((text) => `<span class="badge">${ctx.esc(text)}</span>`).join("");
}
function sceneCard(ctx, scene, path = null) {
  const id = ctx.esc(scene.id);
  const name = ctx.esc(scene.name);
  return `<article class="sa-card" data-sa-scene-card="${id}" draggable="true"><button type="button" class="sa-card-thumb" data-sa-open-scene="${id}" aria-label="${ctx.esc(ctx.t("Apri ", "Open ") + scene.name)}" tabindex="-1">${thumb(ctx, scene)}</button><div class="sa-card-info"><h3><button type="button" class="sa-link" data-sa-open-scene="${id}">${name}</button></h3>${path ? `<p class="muted sa-path">${path.length ? path.map((p) => ctx.esc(p.name)).join(" › ") : ctx.t("Tutte le scene", "All scenes")}</p>` : ""}<p class="sa-badges">${sceneBadges(ctx, scene)}</p></div><details class="sa-card-menu"><summary class="button quiet" aria-label="${ctx.esc(ctx.t("Altre azioni per ", "More actions for ") + scene.name)}">⋯</summary><div class="sa-menu-list"><button type="button" data-sa-open-scene="${id}">${ctx.t("Apri oggetti, livelli e varianti", "Open objects, levels and variants")}</button><button type="button" data-sa-core-edit="${id}">${ctx.t("Muri, porte e pedine…", "Walls, doors and tokens…")}</button><button type="button" data-sa-move-scene="${id}">${ctx.t("Sposta in…", "Move to…")}</button><button type="button" data-sa-duplicate="${id}">${ctx.t("Duplica con oggetti…", "Duplicate with objects…")}</button>${scene.id === ctx.state.activeSceneId ? "" : `<button type="button" data-sa-activate="${id}">${ctx.t("Porta il gruppo qui…", "Move the party here…")}</button>`}<button type="button" data-sa-archive="${id}">${ctx.t("Archivia", "Archive")}</button></div></details></article>`;
}
function folderCard(ctx, folder) {
  const id = ctx.esc(folder.id);
  const count = D.folderCount(ctx.state, folder.id);
  return `<article class="sa-card sa-folder-card" data-sa-folder-card="${id}" data-sa-drop="${id}" draggable="true"><button type="button" class="sa-folder-open" data-sa-open-folder="${id}">${ctx.icon("campaign")}<strong>${ctx.esc(folder.name)}</strong><span class="muted">${count} ${count === 1 ? ctx.t("scena", "scene") : ctx.t("scene", "scenes")}</span></button><details class="sa-card-menu"><summary class="button quiet" aria-label="${ctx.esc(ctx.t("Altre azioni per la cartella ", "More actions for the folder ") + folder.name)}">⋯</summary><div class="sa-menu-list"><button type="button" data-sa-rename-folder="${id}">${ctx.t("Rinomina…", "Rename…")}</button><button type="button" data-sa-move-folder="${id}">${ctx.t("Sposta in…", "Move to…")}</button><button type="button" data-sa-delete-folder="${id}">${ctx.t("Elimina cartella…", "Delete folder…")}</button></div></details></article>`;
}
function renderMenu(ctx) {
  const state = ctx.state;
  const archived = D.archivedScenes(state);
  const path = D.folderPath(state, ui.folder);
  const crumbs = `<nav class="sa-crumbs" aria-label="${ctx.t("Percorso", "Path")}"><button type="button" class="sa-crumb" data-sa-crumb="" data-sa-drop="" ${!ui.folder && !ui.archive ? 'aria-current="page"' : ""}>${ctx.t("Tutte le scene", "All scenes")}</button>${ui.archive ? `<span aria-hidden="true">›</span><span class="sa-crumb is-current" aria-current="page">${ctx.t("Archivio", "Archive")}</span>` : path.map((p, i) => `<span aria-hidden="true">›</span><button type="button" class="sa-crumb" data-sa-crumb="${ctx.esc(p.id)}" data-sa-drop="${ctx.esc(p.id)}" ${i === path.length - 1 ? 'aria-current="page"' : ""}>${ctx.esc(p.name)}</button>`).join("")}</nav>`;
  const bar = `<div class="sa-menu-bar">${crumbs}<div class="sa-menu-actions"><label class="field sa-search">${ui.archive ? ctx.t("Cerca nell’archivio", "Search the archive") : ctx.t("Cerca in tutte le cartelle", "Search every folder")}<input type="search" data-sa-search value="${ctx.esc(ui.query)}" placeholder="${ctx.t("Nome della scena", "Scene name")}"></label><details class="sa-create"><summary class="button primary">${ctx.icon("plus")} ${ctx.t("Crea", "Create")}</summary><div class="sa-menu-list" role="group" aria-label="${ctx.t("Crea", "Create")}"><button type="button" data-sa-new-folder>${ctx.t("Cartella…", "Folder…")}</button><button type="button" data-sa-new-scene="blank">${ctx.t("Scena vuota…", "Blank scene…")}</button><button type="button" data-sa-new-scene="image">${ctx.t("Scena da immagine…", "Scene from an image…")}</button><button type="button" data-sa-new-scene="uvtt">${ctx.t("Scena da file Universal VTT…", "Scene from a Universal VTT file…")}</button></div></details><button type="button" class="button quiet${ui.archive ? " active" : ""}" data-sa-archive-view aria-pressed="${ui.archive}">${ctx.t("Archivio", "Archive")} (${archived.length})</button>${undoButton(ctx)}</div></div>`;
  let body;
  if (ui.archive) {
    const rows = D.archivedScenes(state, ui.query);
    body = rows.length
      ? `<ul class="sa-archive">${rows.map((row) => `<li class="sa-card sa-archived" data-sa-archived="${ctx.esc(row.scene.id)}"><div class="sa-card-info"><h3>${ctx.esc(row.scene.name)}</h3><p class="muted">${row.path.length ? row.path.map((p) => ctx.esc(p.name)).join(" › ") : ctx.t("Tutte le scene", "All scenes")} · ${ctx.t("archiviata il", "archived on")} ${new Intl.DateTimeFormat(ctx.lang === "it" ? "it-IT" : "en-GB", { dateStyle: "medium" }).format(new Date(row.archivedAt))}</p></div><button type="button" class="button" data-sa-restore="${ctx.esc(row.scene.id)}">${ctx.t("Ripristina", "Restore")}</button></li>`).join("")}</ul>`
      : `<p class="empty-state">${ui.query ? ctx.t("Nessuna scena archiviata corrisponde.", "No archived scene matches.") : ctx.t("L’archivio è vuoto. Una scena archiviata esce dall’elenco e dalle ricerche, e si ripristina da qui.", "The archive is empty. An archived scene leaves the list and searches, and is restored from here.")}</p>`;
  } else if (ui.query.trim()) {
    const rows = D.searchScenes(state, ui.query);
    body = rows.length
      ? `<p class="muted" role="status">${rows.length} ${ctx.t("risultati in tutte le cartelle (archivio escluso)", "results in every folder (archive excluded)")}</p><div class="sa-cards">${rows.map((row) => sceneCard(ctx, row.scene, row.path)).join("")}</div>`
      : `<p class="empty-state" role="status">${ctx.t("Nessuna scena corrisponde. L’archivio non è incluso nella ricerca.", "No scene matches. The archive is not searched.")}</p>`;
  } else {
    const here = D.folderContents(state, ui.folder);
    body =
      here.folders.length || here.scenes.length
        ? `<div class="sa-cards">${here.folders.map((f) => folderCard(ctx, f)).join("")}${here.scenes.map((s) => sceneCard(ctx, s)).join("")}</div>`
        : `<p class="empty-state">${ctx.t("Cartella vuota. Trascina qui una scena o usa «Sposta in…».", "Empty folder. Drag a scene here or use “Move to…”.")}</p>`;
  }
  return `<section class="sa-menu" data-sa-menu>${bar}<p class="muted sa-hint">${ctx.t("Trascina una scena su una cartella (o sul percorso) oppure usa ⋯ › «Sposta in…». Apri una scena per prepararne oggetti, piani, varianti e viste.", "Drag a scene onto a folder (or the path) or use ⋯ › “Move to…”. Open a scene to prepare its objects, floors, variants and views.")}</p>${body}</section>`;
}

// ------------------------------------------------------------------------------ workspace

function boxFor(ctx, id) {
  try {
    return D.containerOf(ctx.state, id);
  } catch {
    return null;
  }
}
const pseudoScene = (box) =>
  box.kind === "scene"
    ? box.scene
    : {
        id: box.id,
        width: box.width,
        height: box.height,
        gridSize: 50,
        metersPerCell: 1.5,
        tokens: [],
      };

function alignOverlay(ctx, scene) {
  const a = ui.align;
  if (!a) return "";
  const size = a.size;
  let grid = "";
  if (size) {
    const ox = ((a.offX % size) + size) % size;
    const oy = ((a.offY % size) + size) % size;
    grid = `<defs><pattern id="sa-align-grid" x="${f1(ox)}" y="${f1(oy)}" width="${f1(size)}" height="${f1(size)}" patternUnits="userSpaceOnUse"><path d="M ${f1(size)} 0 H 0 V ${f1(size)}" fill="none" stroke="#7fe0ff" stroke-width="${a.step === 3 ? 2 : 1.5}" stroke-opacity=".95"/></pattern></defs><rect width="${scene.width}" height="${scene.height}" fill="url(#sa-align-grid)" pointer-events="none"/>`;
  }
  const mark = (p, label) =>
    p
      ? `<g class="sa-align-mark" transform="translate(${f1(p.x)} ${f1(p.y)})" pointer-events="none"><path d="M-18 0H18M0-18V18" stroke="#ff7a59" stroke-width="3"/><circle r="6" fill="none" stroke="#ff7a59" stroke-width="2"/><text x="12" y="-12" font-size="16" fill="#ffd6c9" stroke="#111b25" stroke-width="3" paint-order="stroke">${label}</text></g>`
      : "";
  return `${grid}${mark(a.anchor, "1")}${mark(a.corner, "2")}`;
}
function handlesSvg(ctx, row) {
  if (!row || row.locked) return "";
  const rad = (row.rotation * Math.PI) / 180;
  const rot = (x, y) => ({
    x: row.x + x * Math.cos(rad) - y * Math.sin(rad),
    y: row.y + x * Math.sin(rad) + y * Math.cos(rad),
  });
  const corner = rot(row.width / 2, row.height / 2);
  const top = rot(0, -row.height / 2 - 34);
  return `<g class="sa-handles"><circle class="sa-handle-hit" data-sa-handle="resize" cx="${f1(corner.x)}" cy="${f1(corner.y)}" r="30"/><circle class="sa-handle" data-sa-handle="resize" cx="${f1(corner.x)}" cy="${f1(corner.y)}" r="13"/><circle class="sa-handle-hit" data-sa-handle="rotate" cx="${f1(top.x)}" cy="${f1(top.y)}" r="30"/><circle class="sa-handle sa-rotate" data-sa-handle="rotate" cx="${f1(top.x)}" cy="${f1(top.y)}" r="13"/><text data-sa-live x="${f1(corner.x + 18)}" y="${f1(corner.y + 30)}" font-size="16" fill="#f1d797" stroke="#111b25" stroke-width="3" paint-order="stroke">${metersText(ctx, ctx.state.scenes.find((s) => s.id === ui.target) ?? null, row.width)}</text></g>`;
}
function canvasSvg(ctx, box) {
  const scene = pseudoScene(box);
  const m = box.margin;
  const grid = Math.min(300, Math.max(10, Number(scene.gridSize) || 50));
  const base =
    box.kind === "scene"
      ? renderSceneBase(scene, ctx)
      : `<rect width="${box.width}" height="${box.height}" fill="#2a3a36"/>`;
  const gridLayer =
    scene.gridVisible === false
      ? ""
      : `<defs><pattern id="sa-grid" x="${Number(scene.gridOffsetX) || 0}" y="${Number(scene.gridOffsetY) || 0}" width="${grid}" height="${grid}" patternUnits="userSpaceOnUse"><path d="M ${grid} 0 H 0 V ${grid}" fill="none" stroke="#ece7d0" stroke-opacity=".2" stroke-width="1"/></pattern></defs><rect width="${box.width}" height="${box.height}" fill="url(#sa-grid)"/>`;
  const walls = box.kind === "scene" ? renderSpatialOverlay(scene, ctx, { players: false }) : "";
  const tokens = (scene.tokens ?? [])
    .map((token) => {
      const name = ctx.state.actors[token.actorId]?.name ?? "?";
      return `<g class="sa-canvas-token" transform="translate(${token.x} ${token.y})"><title>${ctx.esc(name)}</title><circle r="20" fill="#31586d" stroke="#dfd3a3" stroke-width="3"/><text y="6" text-anchor="middle" font-size="17" fill="#fff">${ctx.esc(name[0])}</text></g>`;
    })
    .join("");
  const stairs =
    box.kind === "scene"
      ? stairsSvg(ctx, stairsOn(ctx.state, scene.id), { editable: ui.tab === "levels" })
      : "";
  const props = [...box.props].sort(
    (a, b) => (a.layer === "foreground") - (b.layer === "foreground"),
  );
  const single = ui.selected.size === 1 ? props.find((row) => ui.selected.has(row.id)) : null;
  const staged =
    box.kind === "scene"
      ? stagedSvg(ctx, D.stagedOn(ctx.state, scene.id, "dm"), { draggable: true })
      : "";
  const viewBox = `${-m} ${-m} ${box.width + 2 * m} ${box.height + 2 * m}`;
  const mode = ui.align
    ? ctx.t("Allineamento della griglia: tocca la mappa.", "Grid alignment: tap the map.")
    : ctx.t(
        "Oggetti della scena. Clic per selezionare, trascina per spostare, Maiusc per aggiungere alla selezione, frecce per spostare, Canc per eliminare, clic destro per inserire un prefabbricato.",
        "Scene objects. Click to select, drag to move, Shift to add to the selection, arrow keys to move, Delete to remove, right-click to insert a prefab.",
      );
  return `<svg class="sa-canvas${ui.align ? " is-aligning" : ""}${ui.placing || ui.stairPick ? " is-placing" : ""}" data-sa-canvas viewBox="${viewBox}" tabindex="0" role="application" aria-label="${ctx.esc(mode)}" preserveAspectRatio="xMidYMid meet">${hatchDefs()}${m ? offMapFrame(ctx, scene) : ""}<g id="sa-canvas-scene">${base}${gridLayer}${ui.tab === "grid" ? alignOverlay(ctx, scene) : ""}</g><g pointer-events="none">${walls}</g><g class="sa-canvas-tokens" pointer-events="none">${tokens}</g>${stairs}<g class="sa-canvas-props">${props.map((row) => propSvg(ctx, row, { dm: true, selected: ui.selected.has(row.id) })).join("")}</g>${ui.tab === "objects" ? handlesSvg(ctx, single) : ""}${staged}</svg>`;
}

function stickerPalette(ctx, box) {
  const list = searchStickers(ui.stickerQuery);
  const assets = visibleAssets(ctx.state, "dm").filter(
    (asset) => asset.kind === "image" && ["prop", "map", "token"].includes(asset.use),
  );
  const text = ui.stickerQuery.trim().toLocaleLowerCase();
  const shownAssets = assets.filter(
    (asset) =>
      !text || [asset.name, ...(asset.tags ?? [])].join(" ").toLocaleLowerCase().includes(text),
  );
  return `<section class="sa-side-card" aria-labelledby="sa-stickers-title"><h3 id="sa-stickers-title">${ctx.t("Adesivi", "Stickers")}</h3><label class="field">${ctx.t("Cerca per nome o etichetta", "Search by name or tag")}<input type="search" data-sa-sticker-search value="${ctx.esc(ui.stickerQuery)}" placeholder="${ctx.t("es. albero, accampamento, tetto", "e.g. tree, camp, roof")}"></label><p class="muted">${ctx.t("«+» aggiunge al centro; trascina un adesivo sulla mappa per posarlo dove vuoi.", "“+” adds it to the centre; drag a sticker onto the map to drop it where you want.")}</p><ul class="sa-stickers" role="list">${list
    .map(
      (art) =>
        `<li><button type="button" class="sa-sticker" data-sa-sticker="${art.id}" aria-label="${ctx.esc(ctx.t(`Aggiungi ${art.name.it}`, `Add ${art.name.en}`))}"><svg viewBox="-55 ${f1(-55 * art.aspect)} 110 ${f1(110 * art.aspect)}" aria-hidden="true">${art.svg}</svg><span>${ctx.esc(ctx.label(art.name))}</span><span class="sa-plus" aria-hidden="true">+</span></button></li>`,
    )
    .join(
      "",
    )}</ul>${list.length ? "" : `<p class="muted">${ctx.t("Nessun adesivo corrisponde.", "No sticker matches.")}</p>`}${
    shownAssets.length
      ? `<h4>${ctx.t("Dalle tue immagini", "From your images")}</h4><ul class="sa-stickers" role="list">${shownAssets
          .map(
            (asset) =>
              `<li><button type="button" class="sa-sticker" data-sa-asset="${ctx.esc(asset.id)}" aria-label="${ctx.esc(ctx.t(`Aggiungi l’immagine ${asset.name}`, `Add the image ${asset.name}`))}"><img src="${ctx.esc(asset.dataUrl)}" alt=""><span>${ctx.esc(asset.name)}</span><span class="sa-plus" aria-hidden="true">+</span></button></li>`,
          )
          .join("")}</ul>`
      : ""
  }</section>`;
}
// PR-12 (Owlbear Outliner, Foundry Placeables Palette): one list of everything in the scene
// (objects, tokens, walls, doors, lights), filtered by kind and searched, with bulk actions.
const KIND_LABELS = {
  all: ["Tutto", "All"],
  prop: ["Oggetti", "Objects"],
  token: ["Pedine", "Tokens"],
  wall: ["Muri", "Walls"],
  door: ["Porte", "Doors"],
  light: ["Luci", "Lights"],
};
const BULK_LABELS = {
  hide: ["Nascondi ai giocatori", "Hide from players"],
  show: ["Mostra ai giocatori", "Show to players"],
  lock: ["Blocca", "Lock"],
  unlock: ["Sblocca", "Unlock"],
  on: ["Accendi", "Light"],
  off: ["Spegni", "Put out"],
  "door-closed": ["Porte chiuse", "Doors closed"],
  "door-open": ["Porte aperte", "Doors open"],
  "door-locked": ["Porte chiuse a chiave", "Doors locked"],
  delete: ["Elimina", "Delete"],
};
const BULK_FITS = {
  hide: ["prop", "token", "wall", "door"],
  show: ["prop", "token", "wall", "door"],
  lock: ["prop"],
  unlock: ["prop"],
  on: ["light"],
  off: ["light"],
  "door-closed": ["door"],
  "door-open": ["door"],
  "door-locked": ["door"],
  delete: ["prop", "token", "wall", "door", "light"],
};
/** The elements chosen in the list: objects (the map's selection) and the others. */
function pickedRefs(ctx, sceneId) {
  const all = D.sceneElements(ctx.state, sceneId);
  return all.filter((row) =>
    row.kind === "prop" ? ui.selected.has(row.id) : ui.picked.has(`${row.kind}:${row.id}`),
  );
}
function sceneListCard(ctx, box) {
  const sceneId = box.id;
  const every = D.sceneElements(ctx.state, sceneId);
  const kind = KIND_LABELS[ui.outlineKind] ? ui.outlineKind : "all";
  const rows = D.sceneElements(ctx.state, sceneId, { query: ui.outlineQuery, kind });
  const count = (k) => (k === "all" ? every.length : every.filter((r) => r.kind === k).length);
  const chips = Object.entries(KIND_LABELS)
    .filter(([k]) => k === "all" || count(k))
    .map(
      ([k, [it, en]]) =>
        `<button type="button" class="sa-chip${k === kind ? " active" : ""}" data-sa-kind="${k}" aria-pressed="${k === kind}">${ctx.t(it, en)} (${count(k)})</button>`,
    )
    .join("");
  const picked = pickedRefs(ctx, sceneId);
  const kinds = new Set(picked.map((r) => r.kind));
  const actions = Object.keys(BULK_LABELS).filter((a) => BULK_FITS[a].some((k) => kinds.has(k)));
  const bulk = picked.length
    ? `<div class="sa-bulk-bar" role="group" aria-label="${ctx.t("Azioni sugli elementi scelti", "Actions on the chosen elements")}"><strong>${picked.length} ${ctx.t("scelti", "chosen")}</strong>${actions.map((a) => `<button type="button" class="button${a === "delete" ? " danger" : " quiet"}" data-sa-bulk-act="${a}">${ctx.t(...BULK_LABELS[a])}</button>`).join("")}</div>`
    : "";
  const status = (r) =>
    r.kind === "light"
      ? r.on
        ? ctx.t("accesa", "on")
        : ctx.t("spenta", "off")
      : r.kind === "door"
        ? {
            closed: ctx.t("chiusa", "closed"),
            open: ctx.t("aperta", "open"),
            locked: ctx.t("chiusa a chiave", "locked"),
          }[r.state] + (r.hidden ? " · " + ctx.t("segreta", "secret") : "")
        : r.kind === "wall"
          ? r.hidden
            ? ctx.t("segreto", "secret")
            : ""
          : [
              r.hidden ? ctx.t("nascosto", "hidden") : "",
              r.locked ? ctx.t("bloccato", "locked") : "",
            ]
              .filter(Boolean)
              .join(" · ");
  const row = (r) => {
    const key = r.kind === "prop" ? r.id : `${r.kind}:${r.id}`;
    const on = r.kind === "prop" ? ui.selected.has(r.id) : ui.picked.has(key);
    const box =
      r.kind === "prop"
        ? `<input type="checkbox" data-sa-select="${ctx.esc(r.id)}" ${on ? "checked" : ""} aria-label="${ctx.esc(ctx.t(`Scegli ${r.name}`, `Choose ${r.name}`))}">`
        : `<input type="checkbox" data-sa-pick="${ctx.esc(key)}" ${on ? "checked" : ""} aria-label="${ctx.esc(ctx.t(`Scegli ${r.name}`, `Choose ${r.name}`))}">`;
    const name =
      r.kind === "prop"
        ? `<button type="button" class="sa-link" data-sa-focus="${ctx.esc(r.id)}">${ctx.esc(r.name)}</button>`
        : `<span>${ctx.esc(r.name)}</span>`;
    return `<li class="${on ? "is-selected" : ""}" data-sa-el="${ctx.esc(key)}"><label class="sa-check">${box}</label>${name}${status(r) ? `<span class="muted sa-el-status">${ctx.esc(status(r))}</span>` : ""}</li>`;
  };
  const groups = ["prop", "token", "wall", "door", "light"]
    .map((k) => {
      const list = rows.filter((r) => r.kind === k);
      return list.length
        ? `<h4>${ctx.t(...KIND_LABELS[k])} (${list.length})</h4><ul class="sa-list sa-outline">${list.map(row).join("")}</ul>`
        : "";
    })
    .join("");
  const dirty = ui.host?.dirty
    ? `<p class="muted">${ctx.t("Muri e porte si cambiano da qui dopo aver salvato le modifiche della scheda Modifica.", "Walls and doors change from here after saving the Edit tab’s changes.")}</p>`
    : "";
  return `<section class="sa-side-card" aria-labelledby="sa-outline-title"><h3 id="sa-outline-title">${ctx.t("Elenco della scena", "Scene list")}</h3><div class="sa-chips" role="group" aria-label="${ctx.t("Filtra per tipo", "Filter by kind")}">${chips}</div><label class="field">${ctx.t("Trova", "Find")}<input type="search" data-sa-outline-search value="${ctx.esc(ui.outlineQuery)}" placeholder="${ctx.t("nome o etichetta, es. albero", "name or tag, e.g. tree")}"></label><div class="toolbar"><button type="button" class="button quiet" data-sa-pick-found ${rows.length ? "" : 'disabled aria-describedby="sa-found-why"'}>${ctx.t("Scegli i risultati", "Choose the results")} (${rows.length})</button>${picked.length ? `<button type="button" class="button quiet" data-sa-pick-none>${ctx.t("Nessuno", "None")}</button>` : ""}</div>${bulk}${dirty}${groups || `<p class="muted" id="sa-found-why">${ctx.t("Nessun elemento corrisponde: cambia la ricerca o il filtro.", "No element matches: change the search or the filter.")}</p>`}</section>`;
}
function outlinerCard(ctx, box) {
  if (box.kind === "scene") return sceneListCard(ctx, box);
  const scene = box.kind === "scene" ? box.scene : null;
  const text = ui.outlineQuery.trim().toLocaleLowerCase();
  const groups = scene
    ? D.outline(ctx.state, scene.id, "dm", ui.outlineQuery)
    : {
        foreground: box.props.filter(
          (r) => r.layer === "foreground" && (!text || r.name.toLocaleLowerCase().includes(text)),
        ),
        map: box.props.filter(
          (r) => r.layer === "map" && (!text || r.name.toLocaleLowerCase().includes(text)),
        ),
        offMap: [],
      };
  const found = [...groups.foreground, ...groups.map, ...groups.offMap];
  const row = (r) =>
    `<li class="${ui.selected.has(r.id) ? "is-selected" : ""}" data-sa-outline-row="${ctx.esc(r.id)}"><label class="sa-check"><input type="checkbox" data-sa-select="${ctx.esc(r.id)}" ${ui.selected.has(r.id) ? "checked" : ""} aria-label="${ctx.esc(ctx.t(`Seleziona ${r.name}`, `Select ${r.name}`))}"></label><button type="button" class="sa-link" data-sa-focus="${ctx.esc(r.id)}">${ctx.esc(r.name)}</button><span class="sa-row-actions"><button type="button" class="sa-icon-toggle" data-sa-flag="hidden" data-sa-prop-id="${ctx.esc(r.id)}" aria-pressed="${!r.hidden}" aria-label="${ctx.esc(ctx.t(`Visibile ai giocatori: ${r.name}`, `Visible to players: ${r.name}`))}" title="${ctx.t("Visibile ai giocatori", "Visible to players")}">${ctx.icon("eye")}</button><button type="button" class="sa-icon-toggle" data-sa-flag="locked" data-sa-prop-id="${ctx.esc(r.id)}" aria-pressed="${r.locked}" aria-label="${ctx.esc(ctx.t(`Bloccato: ${r.name}`, `Locked: ${r.name}`))}" title="${ctx.t("Bloccato", "Locked")}">${ctx.icon("shield")}</button></span></li>`;
  const group = (title, list) =>
    list.length
      ? `<h4>${title} (${list.length})</h4><ul class="sa-list sa-outline">${list.map(row).join("")}</ul>`
      : "";
  return `<section class="sa-side-card" aria-labelledby="sa-outline-title"><h3 id="sa-outline-title">${ctx.t("Elenco degli oggetti", "Object list")}</h3><label class="field">${ctx.t("Trova", "Find")}<input type="search" data-sa-outline-search value="${ctx.esc(ui.outlineQuery)}" placeholder="${ctx.t("nome o etichetta, es. albero", "name or tag, e.g. tree")}"></label><div class="toolbar"><button type="button" class="button quiet" data-sa-select-found ${found.length ? "" : 'disabled aria-describedby="sa-found-why"'}>${ctx.t("Seleziona i risultati", "Select the results")} (${found.length})</button>${ui.selected.size ? `<button type="button" class="button quiet" data-sa-select-none>${ctx.t("Deseleziona", "Clear selection")}</button>` : ""}</div>${group(ctx.t("Primo piano (tetti)", "Foreground (roofs)"), groups.foreground)}${group(ctx.t("Mappa", "Map"), groups.map)}${group(ctx.t("Fuori mappa", "Off the map"), groups.offMap)}${found.length ? "" : `<p class="muted" id="sa-found-why">${box.props.length ? ctx.t("Nessun oggetto corrisponde: cambia la ricerca.", "No object matches: change the search.") : ctx.t("Ancora nessun oggetto: aggiungi un adesivo.", "No object yet: add a sticker.")}</p>`}</section>`;
}
function selectionCard(ctx, box) {
  const rows = box.props.filter((row) => ui.selected.has(row.id));
  if (!rows.length) return "";
  const scene = pseudoScene(box);
  const single = rows.length === 1 ? rows[0] : null;
  const same = (key) => rows.every((row) => row[key] === rows[0][key]);
  // Yes/No choice of a flag; "Visible to players" is the inverse of the stored `hidden`.
  const tri = (name, label, key, invert = false) => {
    const on = same(key) ? Boolean(rows[0][key]) !== invert : null;
    return `<label class="field">${label}<select name="${name}">${single ? "" : `<option value="">${ctx.t("(invariato)", "(unchanged)")}</option>`}<option value="yes" ${on === true ? "selected" : ""}>${ctx.t("Sì", "Yes")}</option><option value="no" ${on === false ? "selected" : ""}>${ctx.t("No", "No")}</option></select></label>`;
  };
  const locked = rows.filter((row) => row.locked).length;
  return `<section class="sa-side-card sa-selection" aria-labelledby="sa-sel-title"><h3 id="sa-sel-title">${single ? ctx.esc(single.name) : `${rows.length} ${ctx.t("oggetti selezionati", "objects selected")}`}</h3>${locked ? `<p class="sa-warn">${ctx.icon("shield")} ${locked} ${ctx.t("bloccati: posizione, misura e rotazione restano ferme finché non li sblocchi.", "locked: position, size and rotation stay put until you unlock them.")}</p>` : ""}<form class="sa-form" data-sa-bulk>${single ? `<label class="field">${ctx.t("Nome", "Name")}<input name="name" maxlength="80" value="${ctx.esc(single.name)}"></label>` : ""}<div class="form-grid"><label class="field">${ctx.t("Larghezza (m)", "Width (m)")}<input name="width" type="number" min="0.3" max="90" step="0.1" value="${same("width") ? f1((rows[0].width * scene.metersPerCell) / scene.gridSize) : ""}" placeholder="${ctx.t("invariata", "unchanged")}"></label><label class="field">${ctx.t("Rotazione (°)", "Rotation (°)")}<input name="rotation" type="number" min="0" max="359" step="1" value="${same("rotation") ? rows[0].rotation : ""}" placeholder="${ctx.t("invariata", "unchanged")}"></label></div><label class="field">${ctx.t("Livello", "Layer")}<select name="layer">${single ? "" : `<option value="">${ctx.t("(invariato)", "(unchanged)")}</option>`}<option value="map" ${same("layer") && rows[0].layer === "map" ? "selected" : ""}>${ctx.t("Mappa (sotto le pedine)", "Map (under tokens)")}</option><option value="foreground" ${same("layer") && rows[0].layer === "foreground" ? "selected" : ""}>${ctx.t("Primo piano: tetto sopra le pedine", "Foreground: roof above tokens")}</option></select></label><div class="form-grid"><label class="field">${ctx.t("Sfumatura del tetto (%)", "Roof fade (%)")}<input name="fade" type="number" min="0" max="100" step="5" value="${same("fade") ? Math.round(rows[0].fade * 100) : ""}" placeholder="${ctx.t("invariata", "unchanged")}"></label></div><div class="form-grid">${tri("visible", ctx.t("Visibile ai giocatori", "Visible to players"), "hidden", true)}${tri("locked", ctx.t("Bloccato", "Locked"), "locked")}</div><div class="toolbar"><button class="button primary" type="submit">${single ? ctx.t("Applica", "Apply") : ctx.t(`Applica a ${rows.length} oggetti`, `Apply to ${rows.length} objects`)}</button>${box.kind === "scene" ? `<button type="button" class="button" data-sa-make-prefab>${ctx.t("Crea prefabbricato…", "Create prefab…")}</button>` : ""}<button type="button" class="button danger" data-sa-delete-selected>${ctx.t("Elimina", "Delete")} (${rows.length})</button></div></form></section>`;
}
function prefabCard(ctx, box) {
  const groups = D.prefabCollections(ctx.state);
  const armed = ui.placing?.prefab;
  return `<section class="sa-side-card" aria-labelledby="sa-prefab-title"><h3 id="sa-prefab-title">${ctx.t("Prefabbricati", "Prefabs")}</h3>${
    groups.length
      ? groups
          .map(
            (group) =>
              `<h4>${ctx.esc(group.collection || ctx.t("Senza raccolta", "No collection"))}</h4><ul class="sa-list">${group.prefabs
                .map(
                  (prefab) =>
                    `<li data-sa-prefab-row="${ctx.esc(prefab.id)}"><span><strong>${ctx.esc(prefab.name)}</strong> · ${prefab.props.length} ${ctx.t("oggetti", "objects")}</span><span class="sa-row-actions">${box.kind === "scene" ? `<button type="button" class="button" data-sa-prefab-arm="${ctx.esc(prefab.id)}" aria-pressed="${armed === prefab.id}">${armed === prefab.id ? ctx.t("Tocca la mappa…", "Tap the map…") : ctx.t("Inserisci…", "Insert…")}</button>` : ""}<button type="button" class="button quiet" data-sa-prefab-edit="${ctx.esc(prefab.id)}">${ctx.t("Modifica", "Edit")}</button><button type="button" class="button quiet" data-sa-prefab-rename="${ctx.esc(prefab.id)}">${ctx.t("Rinomina…", "Rename…")}</button><button type="button" class="button quiet" data-sa-prefab-delete="${ctx.esc(prefab.id)}">${ctx.t("Elimina…", "Delete…")}</button></span></li>`,
                )
                .join("")}</ul>`,
          )
          .join("")
      : `<p class="muted">${ctx.t("Seleziona degli oggetti e scegli «Crea prefabbricato…».", "Select objects and choose “Create prefab…”.")}</p>`
  }<p class="muted">${ctx.t("Inserisci: scegli il prefabbricato e tocca la mappa, oppure clic destro (tocco lungo) su un punto vuoto.", "Insert: choose the prefab and tap the map, or right-click (long press) an empty spot.")}</p></section>`;
}
function offMapCard(ctx, box) {
  if (box.kind !== "scene") return "";
  const staged = D.stagedOn(ctx.state, box.id, "dm");
  return `<section class="sa-side-card" aria-labelledby="sa-off-title"><h3 id="sa-off-title">${ctx.t("Fuori mappa", "Off the map")} (${staged.length})</h3><p class="muted">${ctx.t("Il bordo tratteggiato intorno alla mappa lo vedi solo tu: lascia lì creature e oggetti pronti, poi trascinali dentro.", "Only you see the hatched border around the map: keep creatures and objects ready there, then drag them in.")}</p>${staged.length ? `<ul class="sa-list">${staged.map((row) => `<li><span>${ctx.esc(ctx.state.actors[row.actorId]?.name ?? "?")}</span><button type="button" class="button" data-sa-bring="${ctx.esc(row.id)}">${ctx.t("Porta in mappa", "Bring onto the map")}</button></li>`).join("")}</ul>` : ""}<button type="button" class="button" data-sa-stage-new>${ctx.t("Metti una creatura fuori mappa (anche dal bestiario)…", "Put a creature off the map (also from the bestiary)…")}</button></section>`;
}
function objectsSide(ctx, box) {
  return `${selectionCard(ctx, box)}${stickerPalette(ctx, box)}${outlinerCard(ctx, box)}${box.kind === "scene" ? prefabCard(ctx, box) : ""}${offMapCard(ctx, box)}`;
}

function levelsSide(ctx, box) {
  const scene = box.scene;
  const found = stackOf(ctx.state, scene.id);
  if (!found)
    return `<section class="sa-side-card"><h3>${ctx.t("Livelli", "Levels")}</h3><p class="muted">${ctx.t("Questa scena non è un piano di un edificio. Crea un edificio per aggiungere piani con la stessa impronta e scale che li collegano.", "This scene is not a building floor. Create a building to add floors with the same footprint and stairs joining them.")}</p><button type="button" class="button primary" data-sa-stack-new>${ctx.t("Crea edificio a più piani…", "Create a multi-floor building…")}</button></section>`;
  const floors = [...found.floors].reverse();
  const stairs = found.stack.stairs ?? [];
  return `<section class="sa-side-card" aria-labelledby="sa-levels-title"><h3 id="sa-levels-title">${ctx.esc(found.stack.name)}</h3><div class="toolbar"><button type="button" class="button quiet" data-sa-stack-rename>${ctx.t("Rinomina edificio…", "Rename building…")}</button></div><ol class="sa-floors-list" reversed>${floors
    .map(
      (floor) =>
        `<li class="${floor.sceneId === scene.id ? "is-current" : ""}" data-sa-floor-row="${ctx.esc(floor.sceneId)}"><div><strong>${ctx.esc(floorName(floor))}</strong><span class="muted"> · ${numberText(ctx, floor.elevation)} m · ${(floor.scene.tokens ?? []).length} ${ctx.t("pedine", "tokens")} · ${(floor.scene.walls ?? []).length} ${ctx.t("muri e porte", "walls and doors")}</span>${floor.sceneId === ctx.state.activeSceneId ? ` <span class="badge">${ctx.t("Al Tavolo", "At the Table")}</span>` : ""}</div><div class="sa-row-actions">${floor.sceneId === scene.id ? `<span class="badge">${ctx.t("Aperto qui", "Open here")}</span>` : `<button type="button" class="button quiet" data-sa-open-scene="${ctx.esc(floor.sceneId)}">${ctx.t("Apri", "Open")}</button>`}<button type="button" class="button quiet" data-sa-core-edit="${ctx.esc(floor.sceneId)}">${ctx.t("Muri e pedine…", "Walls and tokens…")}</button><button type="button" class="button quiet" data-sa-floor-edit="${ctx.esc(floor.sceneId)}">${ctx.t("Nome e altezza…", "Name and elevation…")}</button><button type="button" class="button quiet" data-sa-floor-remove="${ctx.esc(floor.sceneId)}">${ctx.t("Togli dall’edificio…", "Remove from building…")}</button></div></li>`,
    )
    .join(
      "",
    )}</ol><button type="button" class="button" data-sa-floor-add>${ctx.t("Aggiungi piano…", "Add floor…")}</button></section><section class="sa-side-card" aria-labelledby="sa-stairs-title"><h3 id="sa-stairs-title">${ctx.t("Scale", "Stairs")}</h3>${
    stairs.length
      ? `<ul class="sa-list">${stairs
          .map((stair) => {
            const names = stair.floors
              .map((id) => floorName(found.floors.find((f) => f.sceneId === id)) || "?")
              .join(" ⇅ ");
            return `<li data-sa-stair-row="${ctx.esc(stair.id)}"><span><strong>${ctx.esc(stair.name)}</strong> · ${ctx.esc(names)} · ${metersText(ctx, scene, stair.radius)}</span><span class="sa-row-actions"><button type="button" class="button quiet" data-sa-stair-move="${ctx.esc(stair.id)}" aria-pressed="${ui.stairPick?.move === stair.id}">${ui.stairPick?.move === stair.id ? ctx.t("Tocca la mappa…", "Tap the map…") : ctx.t("Sposta…", "Move…")}</button><button type="button" class="button quiet" data-sa-stair-edit="${ctx.esc(stair.id)}">${ctx.t("Modifica…", "Edit…")}</button><button type="button" class="button quiet" data-sa-stair-remove="${ctx.esc(stair.id)}">${ctx.t("Elimina", "Delete")}</button></span></li>`;
          })
          .join("")}</ul>`
      : `<p class="muted">${ctx.t("Nessuna scala.", "No stairs.")}</p>`
  }<button type="button" class="button" data-sa-stair-add aria-pressed="${Boolean(ui.stairPick && !ui.stairPick.move)}">${ui.stairPick && !ui.stairPick.move ? ctx.t("Tocca la mappa dove sta la scala…", "Tap the map where the stair is…") : ctx.t("Aggiungi scala…", "Add stair…")}</button><p class="muted">${ctx.t("Una scala sta nello stesso punto sui due piani: al Tavolo, una pedina sul cerchio può salire o scendere. Il DM sceglie quale piano mostrare al gruppo.", "A stair is at the same spot on both floors: at the Table, a token on the circle can go up or down. The DM chooses which floor the party sees.")}</p></section>`;
}

function variantsSide(ctx, box) {
  const scene = box.scene;
  const variants = D.variantsOf(ctx.state, scene.id);
  const images = visibleAssets(ctx.state, "dm").filter(
    (asset) => asset.kind === "image" && ["map", "prop"].includes(asset.use),
  );
  const preview = (variant) => {
    const look = variant.look ?? D.lookOf(scene);
    return `<svg class="sa-variant-thumb" viewBox="0 0 ${scene.width} ${scene.height}" aria-hidden="true">${renderSceneBase({ ...scene, ...look }, ctx)}</svg>`;
  };
  return `<section class="sa-side-card" aria-labelledby="sa-var-title"><h3 id="sa-var-title">${ctx.t("Varianti della scena", "Scene variants")}</h3><p class="muted">${ctx.t("Stessa geometria, altra immagine: muri, porte, pedine, spilli e luci restano dove sono. Al Tavolo il DM cambia variante dalla scheda Scena.", "Same geometry, another image: walls, doors, tokens, pins and lights stay where they are. At the Table the DM switches variant from the Scene tab.")}</p><ul class="sa-variants">${variants.list
    .map(
      (variant) =>
        `<li class="${variant.active ? "is-active" : ""}" data-sa-variant-row="${ctx.esc(variant.id)}">${preview(variant)}<div><strong>${ctx.esc(variant.name || ctx.t("Base", "Base"))}</strong>${variant.active ? ` <span class="badge">${ctx.t("In uso", "In use")}</span>` : ""}</div><div class="sa-row-actions">${variant.active ? "" : `<button type="button" class="button" data-sa-variant-use="${ctx.esc(variant.id)}">${ctx.t("Usa questa", "Use this")}</button>`}<button type="button" class="button quiet" data-sa-variant-rename="${ctx.esc(variant.id)}">${ctx.t("Rinomina…", "Rename…")}</button>${variant.active || variants.list.length < 2 ? "" : `<button type="button" class="button quiet" data-sa-variant-delete="${ctx.esc(variant.id)}">${ctx.t("Elimina…", "Delete…")}</button>`}</div></li>`,
    )
    .join(
      "",
    )}</ul><form class="sa-form" data-sa-variant-form><h4>${ctx.t("Nuova variante", "New variant")}</h4><label class="field">${ctx.t("Nome", "Name")}<input name="name" maxlength="40" required placeholder="${ctx.t("es. Notte, Crollo, Incendio", "e.g. Night, Collapse, Fire")}"></label><fieldset class="sa-choices"><legend>${ctx.t("Immagine", "Image")}</legend><label class="sa-check"><input type="radio" name="source" value="upload" checked> ${ctx.t("Carica un file (PNG, JPG, WebP fino a 1 MB)", "Upload a file (PNG, JPG, WebP up to 1 MB)")}</label><input type="file" name="file" accept="image/png,image/jpeg,image/webp" data-sa-variant-file>${images.length ? `<label class="sa-check"><input type="radio" name="source" value="library"> ${ctx.t("Dalla libreria Immagini e file", "From the Images and files library")}</label><select name="asset" aria-label="${ctx.t("Immagine della libreria", "Library image")}">${images.map((asset) => `<option value="${ctx.esc(asset.id)}">${ctx.esc(asset.name)}</option>`).join("")}</select>` : ""}<label class="sa-check"><input type="radio" name="source" value="template"> ${ctx.t("Base geometrica", "Geometric base")}</label><select name="template" aria-label="${ctx.t("Base geometrica", "Geometric base")}"><option value="courtyard">${ctx.t("Cortile", "Courtyard")}</option><option value="camp">${ctx.t("Accampamento", "Camp")}</option><option value="blank">${ctx.t("Superficie vuota", "Blank surface")}</option></select></fieldset><p class="error" data-sa-variant-error role="alert" hidden></p><button class="button primary" type="submit">${ctx.t("Aggiungi variante", "Add variant")}</button></form></section>`;
}

function cornerLoupes(ctx, scene) {
  const a = ui.align;
  if (!a?.size) return "";
  const span = Math.max(60, a.size * 2.5);
  const corners = [
    [0, 0, ctx.t("In alto a sinistra", "Top left")],
    [scene.width - span, 0, ctx.t("In alto a destra", "Top right")],
    [0, scene.height - span, ctx.t("In basso a sinistra", "Bottom left")],
    [scene.width - span, scene.height - span, ctx.t("In basso a destra", "Bottom right")],
  ];
  return `<div class="sa-corners" aria-label="${ctx.t("Controllo degli angoli", "Corner check")}">${corners.map(([x, y, label]) => `<figure><svg viewBox="${f1(x)} ${f1(y)} ${f1(span)} ${f1(span)}" aria-hidden="true"><use href="#sa-canvas-scene"/></svg><figcaption>${label}</figcaption></figure>`).join("")}</div>`;
}
function gridSide(ctx, box) {
  const scene = box.scene;
  const a = ui.align;
  const def = D.defaultView(ctx.state, scene.id);
  const steps = [
    ctx.t("Àncora", "Anchor"),
    ctx.t("Una cella", "One cell"),
    ctx.t("Rifinisci", "Refine"),
  ];
  const wizard = a
    ? `<ol class="sa-steps">${steps.map((s, i) => `<li class="${a.step === i + 1 ? "is-current" : a.step > i + 1 ? "is-done" : ""}" ${a.step === i + 1 ? 'aria-current="step"' : ""}>${s}</li>`).join("")}</ol><p data-sa-align-help id="sa-align-help" role="status">${
        a.step === 1
          ? ctx.t(
              "Tocca un angolo di una casella disegnata sulla mappa. La lente ingrandisce il punto; puoi correggerlo trascinando o con le frecce.",
              "Tap a corner of a cell drawn on the map. The magnifier enlarges the spot; adjust it by dragging or with the arrow keys.",
            )
          : a.step === 2
            ? ctx.t(
                "Ora tocca l’angolo opposto della stessa casella.",
                "Now tap the opposite corner of the same cell.",
              )
            : ctx.t(
                "Controlla gli angoli: la griglia evidenziata deve coincidere con quella disegnata. Correggi cella e scostamento.",
                "Check the corners: the highlighted grid must match the drawn one. Adjust the cell and offset.",
              )
      }</p>${
        a.step === 3
          ? `<div class="sa-refine"><div><span>${ctx.t("Cella", "Cell")}: <strong data-sa-align-size>${numberText(ctx, a.size, 2)} px</strong></span><button type="button" class="button quiet" data-sa-align-adjust="size:-0.5" aria-label="${ctx.t("Cella più piccola", "Smaller cell")}">−</button><button type="button" class="button quiet" data-sa-align-adjust="size:0.5" aria-label="${ctx.t("Cella più grande", "Larger cell")}">+</button></div><div><span>${ctx.t("Scostamento", "Offset")}: <strong data-sa-align-offset>${Math.round(((a.offX % a.size) + a.size) % a.size)}, ${Math.round(((a.offY % a.size) + a.size) % a.size)}</strong></span><button type="button" class="button quiet" data-sa-align-adjust="x:-1" aria-label="${ctx.t("Griglia a sinistra", "Grid left")}">←</button><button type="button" class="button quiet" data-sa-align-adjust="x:1" aria-label="${ctx.t("Griglia a destra", "Grid right")}">→</button><button type="button" class="button quiet" data-sa-align-adjust="y:-1" aria-label="${ctx.t("Griglia in su", "Grid up")}">↑</button><button type="button" class="button quiet" data-sa-align-adjust="y:1" aria-label="${ctx.t("Griglia in giù", "Grid down")}">↓</button></div></div>${cornerLoupes(ctx, scene)}`
          : ""
      }<div class="toolbar">${a.step > 1 ? `<button type="button" class="button quiet" data-sa-align-back>${ctx.t("Indietro", "Back")}</button>` : ""}${a.step < 3 ? `<button type="button" class="button primary" data-sa-align-next ${(a.step === 1 ? a.anchor : a.corner) ? "" : 'disabled aria-describedby="sa-align-help"'}>${ctx.t("Avanti", "Next")}</button>` : `<button type="button" class="button primary" data-sa-align-apply>${ui.host ? ctx.t("Usa questa griglia", "Use this grid") : ctx.t("Applica alla scena", "Apply to the scene")}</button>`}<button type="button" class="button quiet" data-sa-align-cancel>${ctx.t("Annulla allineamento", "Cancel alignment")}</button></div>`
    : `<p class="muted">${ctx.t("Per una mappa con la griglia disegnata: tre passi (àncora, una cella, rifinitura) con la lente. Ora: cella di", "For a map with a drawn grid: three steps (anchor, one cell, refine) with the magnifier. Now: cell of")} ${numberText(ctx, scene.gridSize, 2)} px, ${ctx.t("scostamento", "offset")} ${scene.gridOffsetX || 0}, ${scene.gridOffsetY || 0}.</p><button type="button" class="button primary" data-sa-align-start>${ctx.t("Allinea la griglia…", "Align the grid…")}</button>`;
  return `<section class="sa-side-card" aria-labelledby="sa-align-title"><h3 id="sa-align-title">${ctx.t("Allinea la griglia", "Align the grid")}</h3>${wizard}</section><section class="sa-side-card" aria-labelledby="sa-view-title"><h3 id="sa-view-title">${ctx.t("Vista iniziale", "Starting view")}</h3>${def ? `<p>${ctx.t("Zoom", "Zoom")} ${numberText(ctx, def.zoom, 2)}× · ${ctx.t("angolo", "corner")} ${def.pan.x}, ${def.pan.y}</p><button type="button" class="button quiet" data-sa-default-clear>${ctx.t("Rimuovi vista iniziale", "Remove starting view")}</button>` : `<p class="muted">${ctx.t("Nessuna. Al Tavolo, inquadra la scena e nella scheda Scena scegli «Imposta questa come vista iniziale»: tutti partiranno da lì.", "None. At the Table, frame the scene and in the Scene tab choose “Set this as the starting view”: everyone starts there.")}</p>`}</section>`;
}

function workspaceHead(ctx, box) {
  const back = `<button type="button" class="button quiet" data-sa-back>${ctx.icon("arrow")} ${ui.returnTo ? ctx.t("Torna alla scena", "Back to the scene") : ctx.t("Tutte le scene", "All scenes")}</button>`;
  if (box.kind === "prefab")
    return `<div class="sa-ws-head"><div>${back}<h2>${ctx.t("Prefabbricato", "Prefab")}: ${ctx.esc(box.prefab.name)}</h2><p class="muted">${ctx.esc(box.prefab.collection || ctx.t("Senza raccolta", "No collection"))} · ${box.props.length} ${ctx.t("oggetti", "objects")} · ${ctx.t("un prefabbricato si modifica come una piccola scena", "a prefab is edited like a small scene")}</p></div><div class="toolbar">${undoButton(ctx)}</div></div>`;
  const scene = box.scene;
  const path = D.folderPath(ctx.state, D.sceneFolder(ctx.state, scene.id));
  return `<div class="sa-ws-head"><div>${back}<h2>${ctx.esc(scene.name)}</h2><p class="muted">${path.length ? path.map((p) => ctx.esc(p.name)).join(" › ") : ctx.t("Tutte le scene", "All scenes")} · ${scene.width} × ${scene.height} px · ${metersText(ctx, scene, scene.gridSize)} / ${ctx.t("cella", "cell")}</p><p class="sa-badges">${sceneBadges(ctx, scene)}</p></div><div class="toolbar">${undoButton(ctx)}<button type="button" class="button" data-sa-core-edit="${ctx.esc(scene.id)}">${ctx.t("Muri, porte e pedine…", "Walls, doors and tokens…")}</button></div></div>`;
}
function prepareTarget(id, box) {
  if (ui.target !== id) {
    ui.target = id;
    ui.selected = new Set();
    ui.placing = null;
    ui.stairPick = null;
    ui.align = null;
    ui.menu = null;
    ui.outlineQuery = "";
    ui.picked = new Set();
    if (box.kind === "prefab") ui.tab = "objects";
  }
}
function workspaceBody(ctx, id, box, tab) {
  const side =
    tab === "levels"
      ? levelsSide(ctx, box)
      : tab === "variants"
        ? variantsSide(ctx, box)
        : tab === "grid"
          ? gridSide(ctx, box)
          : objectsSide(ctx, box);
  const caption = ui.placing
    ? ui.placing.prefab
      ? ctx.t(
          "Tocca la mappa dove mettere il prefabbricato (da tastiera: Invio lo mette al centro; Esc per annullare).",
          "Tap the map where the prefab goes (keyboard: Enter puts it in the centre; Esc to cancel).",
        )
      : ctx.t("Tocca la mappa per posare l’adesivo.", "Tap the map to drop the sticker.")
    : ui.stairPick
      ? ctx.t(
          "Tocca la mappa al centro della scala (da tastiera: Invio e scrivi la posizione; Esc per annullare).",
          "Tap the map at the centre of the stair (keyboard: Enter and type the position; Esc to cancel).",
        )
      : ui.align
        ? ctx.t(
            "Allineamento: tocca la mappa; «Avanti» compare accanto al punto scelto.",
            "Alignment: tap the map; “Next” appears beside the chosen point.",
          )
        : box.kind === "scene" && box.margin
          ? ctx.t(
              "Il bordo tratteggiato è l’area fuori mappa: la vedi solo tu.",
              "The hatched border is the off-map area: only you see it.",
            )
          : "";
  return `<div class="sa-ws-body"><div class="sa-stage"><div class="sa-canvas-wrap" data-sa-canvas-wrap>${canvasSvg(ctx, box)}<div class="sa-loupe" data-sa-loupe hidden aria-hidden="true"><svg viewBox="0 0 10 10"><use href="#sa-canvas-scene"/><g data-sa-loupe-cross></g></svg></div><button type="button" class="button primary sa-next" data-sa-next hidden>${ctx.t("Avanti", "Next")}</button><div class="sa-context" data-sa-context role="menu" hidden></div></div><p class="sa-caption" data-sa-caption role="status">${caption}</p></div><div class="sa-side" id="sa-side-panel" role="tabpanel" aria-labelledby="sa-tab-${tab}">${side}</div></div>`;
}
function renderWorkspace(ctx, id) {
  ui.host = null;
  const box = boxFor(ctx, id);
  if (!box)
    return `<div class="empty-state"><h2>${ctx.t("Scena non disponibile", "Scene unavailable")}</h2><p>${ctx.t("Potrebbe essere stata archiviata o eliminata.", "It may have been archived or deleted.")}</p><button type="button" class="button" data-sa-back>${ctx.t("Tutte le scene", "All scenes")}</button></div>`;
  prepareTarget(id, box);
  const tabs = box.kind === "prefab" ? TABS.slice(0, 1) : TABS;
  const tab = tabs.some(([t]) => t === ui.tab) ? ui.tab : "objects";
  ui.tab = tab;
  const tabBar =
    tabs.length > 1
      ? `<nav class="tabs sa-ws-tabs" role="tablist" aria-label="${ctx.t("Strumenti della scena", "Scene tools")}">${tabs.map(([t, it, en]) => `<button type="button" role="tab" id="sa-tab-${t}" class="${t === tab ? "active" : ""}" data-sa-tab="${t}" aria-selected="${t === tab}" aria-controls="sa-side-panel">${ctx.t(it, en)}</button>`).join("")}</nav>`
      : "";
  return `<section class="sa-ws" data-sa-ws="${ctx.esc(id)}">${workspaceHead(ctx, box)}${tabBar}${workspaceBody(ctx, id, box, tab)}</section>`;
}

// A search hit can open a folder of the page menu ("folder:<id>") or the archive.
const menuRoute = (id) => !id || id === "archive" || String(id).startsWith("folder:");
export const isMenuRoute = (id) => Boolean(id) && menuRoute(id);
function applyMenuRoute(id) {
  if (!id || ui.route === id) return;
  ui.route = id;
  ui.query = "";
  ui.archive = id === "archive";
  if (!ui.archive) ui.folder = String(id).slice(7) || null;
}
export function renderPrep(ctx) {
  if (ctx.role !== "dm") return "";
  const id = ctx.view.id;
  if (!id) ui.route = null;
  if (menuRoute(id)) {
    applyMenuRoute(id);
    return renderMenu(ctx);
  }
  return renderWorkspace(ctx, id);
}

// ------------------------------------------------ folded into the one scene list and editor
// PR-03/06/08…15 (I-236): Preparation has ONE scene list and ONE scene editor. The page
// menu (folders, breadcrumb, archive, search) is the default Scenes list (Roll20 Page Menu)
// and the objects, levels, variants and grid alignment are tabs of the main scene editor
// (Foundry's scene configuration, D&D Beyond's map editor with its Sticker Browser).
// preparation.mjs calls these; there is no separate "advanced scenes" place any more.

/** Editor tabs contributed by this area: [id, it, en]. The grid alignment has no tab: it
 * opens from «Griglia e misure» (Owlbear's alignment next to the grid settings). */
export const EDITOR_TABS = TABS.filter(([id]) => id !== "grid");
/** Whether the scenes area is loaded (its state slice exists). */
export const scenesAreaReady = (state) => Boolean(D.sliceOf(state));

/**
 * The one scene list: breadcrumb, search in every folder, «Nuova cartella…», archive and
 * the scene rows. `row(scene, path)` draws one scene with the editor's own actions.
 */
export function renderSceneBrowser(ctx, row) {
  const state = ctx.state;
  if (ctx.view.id && menuRoute(ctx.view.id)) applyMenuRoute(ctx.view.id);
  else if (!ctx.view.id) ui.route = null;
  const archived = D.archivedScenes(state);
  const path = D.folderPath(state, ui.folder);
  const crumbs = `<nav class="sa-crumbs" aria-label="${ctx.t("Percorso", "Path")}"><button type="button" class="sa-crumb" data-sa-crumb="" data-sa-drop="" ${!ui.folder && !ui.archive ? 'aria-current="page"' : ""}>${ctx.t("Tutte le scene", "All scenes")}</button>${ui.archive ? `<span aria-hidden="true">›</span><span class="sa-crumb is-current" aria-current="page">${ctx.t("Archivio", "Archive")}</span>` : path.map((p, i) => `<span aria-hidden="true">›</span><button type="button" class="sa-crumb" data-sa-crumb="${ctx.esc(p.id)}" data-sa-drop="${ctx.esc(p.id)}" ${i === path.length - 1 ? 'aria-current="page"' : ""}>${ctx.esc(p.name)}</button>`).join("")}</nav>`;
  const bar = `<div class="sa-menu-bar">${crumbs}<div class="sa-menu-actions"><label class="field sa-search">${ui.archive ? ctx.t("Cerca nell’archivio", "Search the archive") : ctx.t("Cerca nelle scene (tutte le cartelle)", "Search scenes (every folder)")}<input type="search" data-sa-search value="${ctx.esc(ui.query)}" placeholder="${ctx.t("Nome della scena", "Scene name")}"></label><button type="button" class="button quiet" data-sa-new-folder>${ctx.icon("plus")} ${ctx.t("Nuova cartella…", "New folder…")}</button><button type="button" class="button quiet${ui.archive ? " active" : ""}" data-sa-archive-view aria-pressed="${ui.archive}">${ctx.t("Archivio", "Archive")} (${archived.length})</button>${undoButton(ctx)}</div></div>`;
  let body;
  if (ui.archive) {
    const rows = D.archivedScenes(state, ui.query);
    body = rows.length
      ? `<ul class="sa-archive">${rows.map((r) => `<li class="sa-card sa-archived" data-sa-archived="${ctx.esc(r.scene.id)}"><div class="sa-card-info"><h3>${ctx.esc(r.scene.name)}</h3><p class="muted">${r.path.length ? r.path.map((p) => ctx.esc(p.name)).join(" › ") : ctx.t("Tutte le scene", "All scenes")} · ${ctx.t("archiviata il", "archived on")} ${new Intl.DateTimeFormat(ctx.lang === "it" ? "it-IT" : "en-GB", { dateStyle: "medium" }).format(new Date(r.archivedAt))}</p></div><button type="button" class="button" data-sa-restore="${ctx.esc(r.scene.id)}">${ctx.t("Ripristina", "Restore")}</button></li>`).join("")}</ul>`
      : `<p class="empty-state">${ui.query ? ctx.t("Nessuna scena archiviata corrisponde.", "No archived scene matches.") : ctx.t("L’archivio è vuoto. Una scena archiviata esce dall’elenco e dalle ricerche, e si ripristina da qui.", "The archive is empty. An archived scene leaves the list and searches, and is restored from here.")}</p>`;
  } else if (ui.query.trim()) {
    const rows = D.searchScenes(state, ui.query);
    body = rows.length
      ? `<p class="muted" role="status">${rows.length} ${ctx.t("risultati in tutte le cartelle (archivio escluso)", "results in every folder (archive excluded)")}</p><div class="prep-scene-list">${rows.map((r) => row(r.scene, r.path)).join("")}</div>`
      : `<p class="empty-state" role="status">${ctx.t("Nessuna scena corrisponde. L’archivio non è incluso nella ricerca.", "No scene matches. The archive is not searched.")}</p>`;
  } else {
    const here = D.folderContents(state, ui.folder);
    body =
      here.folders.length || here.scenes.length
        ? `${here.folders.map((f) => folderSection(ctx, f, row, 2)).join("")}${here.scenes.length ? `<div class="prep-scene-list">${here.scenes.map((s) => row(s, null)).join("")}</div>` : ""}`
        : ui.folder
          ? `<p class="empty-state">${ctx.t("Cartella vuota. Trascina qui una scena o usa «Altre azioni › Sposta in…».", "Empty folder. Drag a scene here or use “More actions › Move to…”.")}</p>`
          : "";
  }
  return `<section class="sa-menu prep-scene-browser" data-sa-menu>${bar}${body}</section>`;
}
// Every scene stays in sight: a folder is a titled group with its scenes and sub-folders
// (Foundry's scene directory folders, Roll20's page folders); its title opens it alone.
function folderSection(ctx, folder, row, depth) {
  const id = ctx.esc(folder.id);
  const inside = D.folderContents(ctx.state, folder.id);
  const count = D.folderCount(ctx.state, folder.id);
  const level = Math.min(6, depth + 1);
  const menu = `<details class="sa-card-menu"><summary class="button quiet" aria-label="${ctx.esc(ctx.t("Altre azioni per la cartella ", "More actions for the folder ") + folder.name)}">⋯</summary><div class="sa-menu-list"><button type="button" data-sa-rename-folder="${id}">${ctx.t("Rinomina…", "Rename…")}</button><button type="button" data-sa-move-folder="${id}">${ctx.t("Sposta in…", "Move to…")}</button><button type="button" data-sa-delete-folder="${id}">${ctx.t("Elimina cartella…", "Delete folder…")}</button></div></details>`;
  return `<section class="prep-folder-group" data-sa-folder-card="${id}" data-sa-drop="${id}" draggable="true"><div class="prep-folder-head"><h${level}><button type="button" class="sa-folder-open" data-sa-open-folder="${id}">${ctx.icon("campaign")}<span>${ctx.esc(folder.name)}</span><span class="muted">${count} ${count === 1 ? ctx.t("scena", "scene") : ctx.t("scene", "scenes")}</span></button></h${level}>${menu}</div>${inside.folders.map((f) => folderSection(ctx, f, row, depth + 1)).join("")}${inside.scenes.length ? `<div class="prep-scene-list">${inside.scenes.map((s) => row(s, null)).join("")}</div>` : inside.folders.length ? "" : `<p class="muted">${ctx.t("Cartella vuota: trascina qui una scena.", "Empty folder: drag a scene here.")}</p>`}</section>`;
}
/** Badges of the scene row: floor, variants, objects (the list's own badges stay). */
export function sceneRowBadges(ctx, scene) {
  const badges = [];
  const found = stackOf(ctx.state, scene.id);
  if (found)
    badges.push(`${ctx.t("Piano", "Floor")}: ${floorName(found.floor)} · ${found.stack.name}`);
  const variants = D.variantsOf(ctx.state, scene.id);
  if (variants.list.length > 1)
    badges.push(
      `${variants.list.length} ${ctx.t("varianti", "variants")} · ${variants.list.find((v) => v.active)?.name ?? ""}`,
    );
  const props = D.sliceOf(ctx.state)?.props?.[scene.id]?.length ?? 0;
  if (props)
    badges.push(
      `${props} ${props === 1 ? ctx.t("oggetto", "object") : ctx.t("oggetti", "objects")}`,
    );
  return badges.map((text) => `<span class="badge">${ctx.esc(text)}</span>`).join("");
}
/** Row menu entries of this area: move to a folder, duplicate with objects, archive. */
export function sceneRowMenu(ctx, scene) {
  const id = ctx.esc(scene.id);
  return `<button type="button" data-sa-move-scene="${id}">${ctx.t("Sposta in una cartella…", "Move to a folder…")}</button><button type="button" data-sa-duplicate="${id}">${ctx.t("Duplica con oggetti e varianti…", "Duplicate with objects and variants…")}</button><button type="button" data-sa-archive="${id}">${ctx.t("Archivia", "Archive")}</button>`;
}
export function bindSceneBrowser(root, ctx) {
  if (ctx.role !== "dm") return;
  root
    .querySelectorAll("[data-sa-undo]")
    .forEach((node) => node.addEventListener("click", () => ctx.undo()));
  bindMenu(root, ctx);
}
/** The folder a new scene of the list goes into (the open folder). */
export const openFolder = () => (ui.archive ? null : ui.folder);
export { folderOptions as sceneFolderOptions };

/** Box of the editor tab: the saved scene (objects, levels, variants) or, for the grid
 * alignment, the scene being edited, so an image not saved yet can be aligned. */
function editorBox(ctx, id, tab, host) {
  const saved = boxFor(ctx, id);
  if (tab !== "grid" || !host?.scene) return saved;
  const scene = host.scene;
  return {
    kind: "scene",
    id,
    scene,
    width: scene.width,
    height: scene.height,
    margin: 0,
    props: saved?.props ?? [],
  };
}
/**
 * One tab of the scene editor (objects, levels, variants, grid). `host` is the editor:
 * {scene: its draft, onAlign({gridSize, offsetX, offsetY}), back()}. Returns "" when the
 * scene is not saved yet (objects, levels and variants belong to a saved scene).
 */
export function renderSceneTools(ctx, id, tab, host = {}) {
  ui.host = host;
  const box = editorBox(ctx, id, tab, host);
  if (!box) return "";
  prepareTarget(id, box);
  ui.tab = tab;
  if (tab !== "grid") ui.align = null;
  else if (!ui.align) startAlign(box.scene);
  return `<section class="sa-ws is-embedded" data-sa-ws="${ctx.esc(id)}">${workspaceBody(ctx, id, box, tab)}</section>`;
}
export function bindSceneTools(root, ctx, id, tab, host = {}) {
  if (ctx.role !== "dm") return;
  ui.host = host;
  const box = editorBox(ctx, id, tab, host);
  if (!box) return;
  root
    .querySelectorAll("[data-sa-undo]")
    .forEach((node) => node.addEventListener("click", () => ctx.undo()));
  root
    .querySelectorAll("[data-sa-open-scene]")
    .forEach((node) =>
      node.addEventListener("click", () =>
        ctx.navigate("preparation", { id: node.dataset.saOpenScene, tab: ui.tab }),
      ),
    );
  root
    .querySelectorAll("[data-sa-core-edit]")
    .forEach((node) =>
      node.addEventListener("click", () =>
        ctx.navigate("preparation", { id: node.dataset.saCoreEdit, tab: "edit" }),
      ),
    );
  bindCanvas(root, ctx, box);
  if (tab === "objects") bindObjects(root, ctx, box);
  if (tab === "levels") bindLevels(root, ctx, box);
  if (tab === "variants") bindVariants(root, ctx, box);
  if (tab === "grid") bindGrid(root, ctx, box);
}
function startAlign(scene) {
  ui.align = {
    step: 1,
    anchor: null,
    corner: null,
    size: scene.gridSize,
    offX: scene.gridOffsetX || 0,
    offY: scene.gridOffsetY || 0,
  };
}

// ------------------------------------------------------------------------------ dialogs

function folderOptions(ctx, { exclude = null, current = null } = {}) {
  const value = D.sliceOf(ctx.state);
  const rows = [];
  const walk = (parentId, depth) => {
    for (const folder of (value?.folders ?? [])
      .filter((f) => (f.parentId ?? null) === parentId)
      .sort((a, b) => a.name.localeCompare(b.name, "it"))) {
      if (folder.id === exclude) continue;
      rows.push(
        `<option value="${ctx.esc(folder.id)}" ${folder.id === current ? "selected" : ""}>${"— ".repeat(depth)}${ctx.esc(folder.name)}</option>`,
      );
      walk(folder.id, depth + 1);
    }
  };
  walk(null, 1);
  return `<option value="" ${current ? "" : "selected"}>${ctx.t("Tutte le scene (primo livello)", "All scenes (top level)")}</option>${rows.join("")}`;
}
export function openNewFolder(ctx) {
  ctx.dialog(
    ctx.t("Nuova cartella", "New folder"),
    `<label class="field">${ctx.t("Nome", "Name")}<input name="name" required maxlength="80" placeholder="${ctx.t("es. Capitolo 3 · Le miniere", "e.g. Chapter 3 · The mines")}"></label><label class="field">${ctx.t("Dentro", "Inside")}<select name="parent">${folderOptions(ctx, { current: ui.folder })}</select></label>`,
    {
      submitLabel: ctx.t("Crea cartella", "Create folder"),
      onSubmit: (data) => {
        commitOwn(ctx, ctx.t("Cartella di scene creata", "Scene folder created"), (s) =>
          D.createFolder(s, ctx.role, {
            name: data.get("name"),
            parentId: data.get("parent") || null,
          }),
        );
      },
    },
  );
}
function openMoveScene(ctx, sceneId) {
  const scene = ctx.state.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  ctx.dialog(
    ctx.t("Sposta la scena", "Move the scene"),
    `<p><strong>${ctx.esc(scene.name)}</strong></p><label class="field">${ctx.t("Cartella", "Folder")}<select name="folder">${folderOptions(ctx, { current: D.sceneFolder(ctx.state, sceneId) })}</select></label>`,
    {
      submitLabel: ctx.t("Sposta", "Move"),
      onSubmit: (data) => {
        commitOwn(
          ctx,
          ctx.t("Scena spostata in un’altra cartella", "Scene moved to another folder"),
          (s) => D.moveScene(s, ctx.role, sceneId, data.get("folder") || null),
        );
      },
    },
  );
}
function openMoveFolder(ctx, folderId) {
  const folder = D.sliceOf(ctx.state)?.folders.find((f) => f.id === folderId);
  if (!folder) return;
  ctx.dialog(
    ctx.t("Sposta la cartella", "Move the folder"),
    `<p><strong>${ctx.esc(folder.name)}</strong></p><label class="field">${ctx.t("Dentro", "Inside")}<select name="folder">${folderOptions(ctx, { exclude: folderId, current: folder.parentId })}</select></label>`,
    {
      submitLabel: ctx.t("Sposta", "Move"),
      onSubmit: (data) => {
        commitOwn(ctx, ctx.t("Cartella spostata", "Folder moved"), (s) =>
          D.moveFolder(s, ctx.role, folderId, data.get("folder") || null),
        );
      },
    },
  );
}
function openRenameFolder(ctx, folderId) {
  const folder = D.sliceOf(ctx.state)?.folders.find((f) => f.id === folderId);
  if (!folder) return;
  ctx.dialog(
    ctx.t("Rinomina cartella", "Rename folder"),
    `<label class="field">${ctx.t("Nome", "Name")}<input name="name" required maxlength="80" value="${ctx.esc(folder.name)}"></label>`,
    {
      submitLabel: ctx.t("Rinomina", "Rename"),
      onSubmit: (data) => {
        commitOwn(ctx, ctx.t("Cartella rinominata", "Folder renamed"), (s) =>
          D.renameFolder(s, ctx.role, folderId, data.get("name")),
        );
      },
    },
  );
}
function openDeleteFolder(ctx, folderId) {
  const folder = D.sliceOf(ctx.state)?.folders.find((f) => f.id === folderId);
  if (!folder) return;
  const count = D.folderCount(ctx.state, folderId);
  ctx.dialog(
    ctx.t("Elimina cartella", "Delete folder"),
    `<p>${ctx.t(`La cartella «${folder.name}» sparisce; le sue ${count} scene e sottocartelle salgono di un livello. Nessuna scena viene eliminata.`, `The folder “${folder.name}” goes away; its ${count} scenes and subfolders move up one level. No scene is deleted.`)}</p>`,
    {
      submitLabel: ctx.t("Elimina cartella", "Delete folder"),
      onSubmit: () => {
        commitOwn(ctx, ctx.t("Cartella eliminata", "Folder deleted"), (s) =>
          D.deleteFolder(s, ctx.role, folderId),
        );
        if (ui.folder === folderId) ui.folder = folder.parentId ?? null;
      },
    },
  );
}
function openDuplicate(ctx, sceneId) {
  const scene = ctx.state.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  ctx.dialog(
    ctx.t("Duplica con oggetti", "Duplicate with objects"),
    `<p class="muted">${ctx.t("Copia mappa, griglia, muri, note, oggetti e varianti nella stessa cartella. Pedine e condivisione non vengono copiate.", "Copies map, grid, walls, notes, objects and variants into the same folder. Tokens and sharing are not copied.")}</p><label class="field">${ctx.t("Nome della copia", "Copy name")}<input name="name" required maxlength="100" value="${ctx.esc(scene.name + ctx.t(" — copia", " — copy"))}"></label>`,
    {
      submitLabel: ctx.t("Crea copia", "Create copy"),
      onSubmit: (data) => {
        commitOwn(
          ctx,
          ctx.t("Scena duplicata con i suoi oggetti", "Scene duplicated with its objects"),
          (s) => D.duplicateWithAssets(s, ctx.role, sceneId, { name: data.get("name") }),
        );
      },
    },
  );
}
function openActivate(ctx, sceneId) {
  const scene = ctx.state.scenes.find((s) => s.id === sceneId);
  const active = ctx.state.scenes.find((s) => s.id === ctx.state.activeSceneId);
  if (!scene) return;
  ctx.dialog(
    ctx.t("Porta il gruppo qui", "Move the party here"),
    `<p>${ctx.t("La vista del gruppo passerà da", "The party view will move from")} <strong>${ctx.esc(active?.name ?? "—")}</strong> ${ctx.t("a", "to")} <strong>${ctx.esc(scene.name)}</strong>. ${ctx.t("Non sposta pedine e non avvia un combattimento.", "It does not move tokens or start combat.")}</p>`,
    {
      submitLabel: ctx.t("Attiva al Tavolo", "Activate at the Table"),
      onSubmit: () => {
        commitOwn(ctx, ctx.t("Scena attivata al Tavolo", "Scene activated at table"), (s) =>
          activateScene(s, sceneId, ctx.role),
        );
        ctx.navigate("table");
      },
    },
  );
}
function archive(ctx, sceneId) {
  const scene = ctx.state.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  if (
    run(ctx, ctx.t(`Scena archiviata: ${scene.name}`, `Scene archived: ${scene.name}`), (s) =>
      D.archiveScene(s, ctx.role, sceneId),
    )
  )
    ctx.toast(
      ctx.t(
        `«${scene.name}» è nell’Archivio: la ripristini da lì (o con Annulla ultima modifica).`,
        `“${scene.name}” is in the Archive: restore it from there (or with Undo last change).`,
      ),
    );
}
// PR-16 (Owlbear's upload warning): say how heavy the file is and what the limit is, and
// offer to make it fit (scaled down and converted to WebP in the browser).
export function fileSizeText(bytes, lang = "it") {
  const mb = bytes / (1024 * 1024);
  const n = new Intl.NumberFormat(lang === "it" ? "it-IT" : "en-GB", {
    maximumFractionDigits: 1,
  });
  return mb >= 1 ? `${n.format(mb)} MB` : `${n.format(Math.max(1, Math.round(bytes / 1024)))} KB`;
}
export const IMAGE_LIMIT_BYTES = MAX_IMAGE_BYTES;
/** The refusal for a file over the limit, naming its weight and the limit. */
export function oversizeError(file) {
  const it = `Il file «${file.name}» pesa ${fileSizeText(file.size, "it")}: il limite per una mappa è ${fileSizeText(MAX_IMAGE_BYTES, "it")}. Puoi ridurlo e convertirlo in WebP qui.`;
  const en = `The file “${file.name}” is ${fileSizeText(file.size, "en")}: the limit for a map is ${fileSizeText(MAX_IMAGE_BYTES, "en")}. You can shrink it and convert it to WebP here.`;
  return Object.assign(new Error("size"), { it, en, code: "size" });
}
/** Scales an image down and re-encodes it as WebP until it fits the limit. */
export async function shrinkToWebP(file, maxBytes = MAX_IMAGE_BYTES) {
  const doc = globalThis.document;
  const url = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () =>
      reject(
        Object.assign(new Error("decode"), {
          it: "Il file non è un’immagine leggibile.",
          en: "The file is not a readable image.",
        }),
      );
    img.onload = () => resolve(img);
    img.src = url;
  });
  const bytesOf = (dataUrl) => Math.floor(((dataUrl.length - dataUrl.indexOf(",") - 1) * 3) / 4);
  let scale = Math.min(1, 4000 / image.naturalWidth, 4000 / image.naturalHeight);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const canvas = doc.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.55]) {
      const out = canvas.toDataURL("image/webp", quality);
      if (!out.startsWith("data:image/webp")) break;
      if (bytesOf(out) <= maxBytes)
        return {
          url: out,
          width: canvas.width,
          height: canvas.height,
          name: file.name.replace(/\.[^.]+$/, "") + ".webp",
          bytes: bytesOf(out),
        };
    }
    scale *= 0.75;
  }
  throw Object.assign(new Error("shrink"), {
    it: "Non riesco a ridurre abbastanza questa immagine: prova con un file più piccolo.",
    en: "This image cannot be reduced enough: try a smaller file.",
  });
}
export function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || !file.size) {
      reject(
        Object.assign(new Error("type"), {
          it: "Scegli un file PNG, JPG o WebP.",
          en: "Choose a PNG, JPG or WebP file.",
        }),
      );
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(oversizeError(file));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () =>
      reject(
        Object.assign(new Error("read"), {
          it: "Il file non si legge.",
          en: "The file cannot be read.",
        }),
      );
    reader.onload = () => {
      const image = new Image();
      image.onerror = () =>
        reject(
          Object.assign(new Error("decode"), {
            it: "Il file non è un’immagine leggibile.",
            en: "The file is not a readable image.",
          }),
        );
      image.onload = () =>
        resolve({
          url: String(reader.result),
          width: image.naturalWidth,
          height: image.naturalHeight,
          name: file.name,
        });
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
function fitSize(width, height) {
  let w = width,
    h = height;
  const down = Math.min(1, 4000 / w, 4000 / h);
  w *= down;
  h *= down;
  const up = Math.max(1, 300 / w, 300 / h);
  return { width: Math.round(w * up), height: Math.round(h * up) };
}
/** Creates a saved scene from a read image and opens its grid alignment in the editor. */
export function createImageScene(ctx, { name, image, folderId = null }) {
  const id = D.uid("scene");
  const record = D.newSceneRecord({
    id,
    name,
    template: "blank",
    background: image.url,
    imageName: image.name,
    imageWidth: image.width,
    imageHeight: image.height,
    ...fitSize(image.width, image.height),
  });
  commitOwn(ctx, ctx.t("Scena creata", "Scene created"), (s) =>
    D.addScene(s, ctx.role, record, folderId || null),
  );
  ui.target = id;
  ui.tab = "grid";
  ui.align = { step: 1, anchor: null, corner: null, size: null, offX: 0, offY: 0 };
  ctx.navigate("preparation", { id, tab: "grid" });
  return id;
}
export function openNewScene(ctx, kind) {
  if (kind === "uvtt") return openUVTT(ctx);
  ui.image = null;
  const image = kind === "image";
  ctx.dialog(
    image ? ctx.t("Scena da immagine", "Scene from an image") : ctx.t("Scena vuota", "Blank scene"),
    `<label class="field">${ctx.t("Nome", "Name")}<input name="name" required maxlength="100" value="${ctx.esc(ctx.t("Nuova scena", "New scene"))}"></label>${image ? `<label class="field">${ctx.t("Immagine della mappa (PNG, JPG, WebP fino a 1 MB)", "Map image (PNG, JPG, WebP up to 1 MB)")}<input type="file" name="file" accept="image/png,image/jpeg,image/webp" data-sa-new-image required></label><p class="muted" data-sa-new-image-status role="status">${ctx.t("Dopo la creazione si apre l’allineamento della griglia in tre passi.", "After creating it, the three-step grid alignment opens.")}</p>` : `<label class="field">${ctx.t("Base", "Base")}<select name="template"><option value="blank">${ctx.t("Superficie vuota", "Blank surface")}</option><option value="courtyard">${ctx.t("Cortile", "Courtyard")}</option><option value="camp">${ctx.t("Accampamento", "Camp")}</option></select></label>`}<label class="field">${ctx.t("Cartella", "Folder")}<select name="folder">${folderOptions(ctx, { current: ui.folder })}</select></label>`,
    {
      submitLabel: ctx.t("Crea scena", "Create scene"),
      onSubmit: (data) => {
        if (image && !ui.image)
          throw Object.assign(new Error("image"), {
            it: "Scegli un’immagine valida (attendi la lettura del file).",
            en: "Choose a valid image (wait for the file to be read).",
          });
        const id = D.uid("scene");
        const size = image
          ? fitSize(ui.image.width, ui.image.height)
          : { width: 1000, height: 650 };
        const record = D.newSceneRecord({
          id,
          name: data.get("name"),
          template: data.get("template") ?? "blank",
          background: image ? ui.image.url : null,
          imageName: image ? ui.image.name : "",
          imageWidth: image ? ui.image.width : 0,
          imageHeight: image ? ui.image.height : 0,
          ...size,
        });
        commitOwn(ctx, ctx.t("Scena creata", "Scene created"), (s) =>
          D.addScene(s, ctx.role, record, data.get("folder") || null),
        );
        ui.image = null;
        if (image) {
          ui.target = id;
          ui.tab = "grid";
          ui.align = { step: 1, anchor: null, corner: null, size: null, offX: 0, offY: 0 };
        } else ui.tab = "objects";
        // The one scene editor: an image opens its grid alignment, a blank scene its map.
        ctx.navigate("preparation", { id, tab: image ? "grid" : "edit" });
      },
    },
  );
  const input = dialogEl()?.querySelector("[data-sa-new-image]");
  input?.addEventListener("change", async () => {
    const status = dialogEl()?.querySelector("[data-sa-new-image-status]");
    const file = input.files?.[0];
    ui.image = null;
    if (!file) return;
    try {
      ui.image = await readImageFile(file);
      if (status) status.textContent = `${file.name} · ${ui.image.width} × ${ui.image.height} px`;
    } catch (error) {
      if (status) status.textContent = errorText(ctx, error);
      input.value = "";
    }
  });
}

function uvttReport(ctx, result) {
  if (!result) return "";
  if (result.error)
    return `<p class="error" role="alert" data-sa-uvtt-error>${ctx.esc(errorText(ctx, result.error))}</p>`;
  const r = result.built.report;
  return `<div class="sa-uvtt-preview" data-sa-uvtt-ready><svg viewBox="0 0 ${result.built.scene.width} ${result.built.scene.height}" aria-hidden="true"><image href="${ctx.esc(result.built.scene.background)}" width="${result.built.scene.width}" height="${result.built.scene.height}" preserveAspectRatio="none"/>${result.built.scene.walls.map((w) => `<line x1="${w.a.x}" y1="${w.a.y}" x2="${w.b.x}" y2="${w.b.y}" stroke="${w.kind === "door" ? "#e6a150" : "#7fe0ff"}" stroke-width="6"/>`).join("")}${result.built.lights.map((l) => `<circle cx="${l.x}" cy="${l.y}" r="14" fill="#f5c05a" stroke="#241e15" stroke-width="3"/>`).join("")}</svg><ul class="sa-list"><li><span>${ctx.t("Mappa", "Map")}</span><strong>${r.cells.x} × ${r.cells.y} ${ctx.t("celle", "cells")} · ${r.pixelsPerGrid} px/${ctx.t("cella", "cell")}</strong></li><li><span>${ctx.t("Muri", "Walls")}</span><strong data-sa-uvtt-walls>${r.walls}</strong></li><li><span>${ctx.t("Porte", "Doors")}</span><strong data-sa-uvtt-doors>${r.doors}${r.openDoors ? ` (${r.openDoors} ${ctx.t("aperte", "open")})` : ""}</strong></li><li><span>${ctx.t("Luci", "Lights")}</span><strong data-sa-uvtt-lights>${r.lights}</strong></li>${r.skipped ? `<li><span>${ctx.t("Elementi fuori dalla mappa ignorati", "Items outside the map skipped")}</span><strong>${r.skipped}</strong></li>` : ""}</ul><p class="muted">${ctx.t("Dopo l’importazione muri e porte si modificano nella scheda Modifica e le luci nella scheda Luci dell’editor della scena. Solo l’immagine occupa spazio.", "After the import, walls and doors are edited in the Edit tab and lights in the Lights tab of the scene editor. Only the image takes storage.")}</p></div>`;
}
function showUVTT(ctx) {
  const holder = dialogEl()?.querySelector("[data-sa-uvtt-result]");
  if (holder) holder.innerHTML = uvttReport(ctx, ui.uvtt);
  // A file that now reads correctly clears the refusal of the previous attempt.
  const error = dialogEl()?.querySelector(".dialog-error");
  if (error && ui.uvtt?.built) error.hidden = true;
  const name = dialogEl()?.querySelector('[name="name"]');
  if (name && ui.uvtt?.built && !name.dataset.touched) name.value = ui.uvtt.built.scene.name;
}
export function loadUVTT(ctx, text, fileName) {
  try {
    const parsed = parseUVTT(text, { fileName });
    const built = buildUVTTScene(parsed, {
      id: D.uid("scene"),
      name: String(fileName || "")
        .replace(/\.[^.]+$/, "")
        .replace(/[-_]+/g, " "),
      revision: D.uid("uvtt"),
      lang: ctx.lang,
    });
    ui.uvtt = { built, fileName };
  } catch (error) {
    ui.uvtt = { error };
  }
  return ui.uvtt;
}
/** Commits a built Universal VTT scene: the scene, its B35 lights, its folder. */
export function importBuilt(ctx, built, { name, folderId = null } = {}) {
  const scene = {
    ...built.scene,
    name:
      String(name || built.scene.name)
        .trim()
        .slice(0, 100) || built.scene.name,
  };
  commitOwn(
    ctx,
    ctx.t(
      `Scena importata da Universal VTT: ${scene.name}`,
      `Scene imported from Universal VTT: ${scene.name}`,
    ),
    (s) => {
      D.addScene(s, ctx.role, scene, folderId);
      if (fogSlice(s)) for (const light of built.lights) addLight(s, ctx.role, scene.id, light);
      else D.sliceOf(s).pendingLights[scene.id] = built.lights;
    },
  );
  return scene.id;
}
export function openUVTT(ctx) {
  ui.uvtt = null;
  ctx.dialog(
    ctx.t("Scena da file Universal VTT", "Scene from a Universal VTT file"),
    `<p class="muted">${ctx.t("File .uvtt, .dd2vtt o .df2vtt (Dungeondraft, DungeonFog e altri): l’immagine diventa la mappa, muri, porte e luci restano modificabili.", ".uvtt, .dd2vtt or .df2vtt files (Dungeondraft, DungeonFog and others): the image becomes the map, walls, doors and lights stay editable.")}</p><label class="field">${ctx.t("File", "File")}<input type="file" name="file" accept=".uvtt,.dd2vtt,.df2vtt,application/json" data-sa-uvtt-file></label><button type="button" class="button quiet" data-sa-uvtt-sample>${ctx.t("Usa il file d’esempio (la cripta sotto la torre)", "Use the sample file (the crypt under the tower)")}</button><div data-sa-uvtt-result></div><label class="field">${ctx.t("Nome della scena", "Scene name")}<input name="name" maxlength="100" data-sa-uvtt-name></label><label class="field">${ctx.t("Cartella", "Folder")}<select name="folder">${folderOptions(ctx, { current: ui.folder })}</select></label>`,
    {
      submitLabel: ctx.t("Crea scena", "Create scene"),
      onSubmit: (data) => {
        if (!ui.uvtt?.built)
          throw Object.assign(new Error("uvtt"), {
            it: "Scegli prima un file Universal VTT valido.",
            en: "Choose a valid Universal VTT file first.",
          });
        const id = importBuilt(ctx, ui.uvtt.built, {
          name: data.get("name"),
          folderId: data.get("folder") || null,
        });
        ui.uvtt = null;
        ui.tab = "objects";
        // Walls, doors and the imported lights are edited in the scene editor (PR-15).
        ctx.navigate("preparation", { id, tab: "edit" });
      },
    },
  );
  const dialog = dialogEl();
  dialog?.querySelector("[data-sa-uvtt-name]")?.addEventListener("input", (event) => {
    event.target.dataset.touched = "1";
  });
  dialog?.querySelector("[data-sa-uvtt-sample]")?.addEventListener("click", () => {
    loadUVTT(ctx, JSON.stringify(UVTT_SAMPLE), UVTT_SAMPLE_NAME);
    showUVTT(ctx);
  });
  const input = dialog?.querySelector("[data-sa-uvtt-file]");
  input?.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    let text = "";
    try {
      text = await file.text();
    } catch {
      text = "";
    }
    loadUVTT(ctx, text, file.name);
    showUVTT(ctx);
    if (ui.uvtt?.error) input.value = "";
  });
}

function openStackNew(ctx, sceneId) {
  const scene = ctx.state.scenes.find((s) => s.id === sceneId);
  ctx.dialog(
    ctx.t("Crea edificio a più piani", "Create a multi-floor building"),
    `<label class="field">${ctx.t("Nome dell’edificio", "Building name")}<input name="name" required maxlength="80" value="${ctx.esc(scene?.name ?? "")}"></label><label class="field">${ctx.t("Nome di questo piano", "This floor’s name")}<input name="floor" required maxlength="80" value="${ctx.esc(ctx.t("Piano terra", "Ground floor"))}"></label>`,
    {
      submitLabel: ctx.t("Crea edificio", "Create building"),
      onSubmit: (data) => {
        commitOwn(ctx, ctx.t("Edificio a più piani creato", "Multi-floor building created"), (s) =>
          createStack(s, ctx.role, sceneId, {
            name: data.get("name"),
            floorName: data.get("floor"),
          }),
        );
      },
    },
  );
}
function openFloorAdd(ctx, sceneId) {
  const found = stackOf(ctx.state, sceneId);
  if (!found) return;
  const base = found.floors[0].scene;
  const candidates = ctx.state.scenes.filter(
    (s) => !stackOf(ctx.state, s.id) && s.width === base.width && s.height === base.height,
  );
  const top = Math.max(...found.floors.map((f) => f.elevation));
  ctx.dialog(
    ctx.t("Aggiungi piano", "Add floor"),
    `<fieldset class="sa-choices"><legend>${ctx.t("Il piano è", "The floor is")}</legend><label class="sa-check"><input type="radio" name="kind" value="new" checked> ${ctx.t("Una nuova scena vuota con la stessa impronta", "A new blank scene with the same footprint")}</label>${candidates.length ? `<label class="sa-check"><input type="radio" name="kind" value="existing"> ${ctx.t("Una scena esistente", "An existing scene")}</label><select name="scene" aria-label="${ctx.t("Scena esistente", "Existing scene")}">${candidates.map((s) => `<option value="${ctx.esc(s.id)}">${ctx.esc(s.name)}</option>`).join("")}</select>` : `<p class="muted">${ctx.t(`Nessuna altra scena misura ${base.width} × ${base.height} px.`, `No other scene measures ${base.width} × ${base.height} px.`)}</p>`}</fieldset><div class="form-grid"><label class="field">${ctx.t("Nome del piano", "Floor name")}<input name="name" required maxlength="80" value="${ctx.esc(ctx.t("Primo piano", "First floor"))}"></label><label class="field">${ctx.t("Altezza (m)", "Elevation (m)")}<input name="elevation" type="number" step="0.5" min="-300" max="300" required value="${top + 3}"></label></div>`,
    {
      submitLabel: ctx.t("Aggiungi piano", "Add floor"),
      onSubmit: (data) => {
        const existing = data.get("kind") === "existing";
        const create = existing
          ? null
          : D.newSceneRecord({
              id: D.uid("scene"),
              name: `${found.stack.name} — ${String(data.get("name") || "").trim()}`,
              template: "blank",
              width: base.width,
              height: base.height,
            });
        if (create) {
          create.gridSize = base.gridSize;
          create.metersPerCell = base.metersPerCell;
          create.gridOffsetX = base.gridOffsetX ?? 0;
          create.gridOffsetY = base.gridOffsetY ?? 0;
        }
        commitOwn(ctx, ctx.t("Piano aggiunto all’edificio", "Floor added to the building"), (s) => {
          addFloor(s, ctx.role, found.stack.id, {
            sceneId: existing ? data.get("scene") : undefined,
            create,
            name: data.get("name"),
            elevation: data.get("elevation"),
          });
          const folder = D.sceneFolder(s, sceneId);
          if (create && folder) D.moveScene(s, ctx.role, create.id, folder);
        });
      },
    },
  );
}
function openFloorEdit(ctx, sceneId, floorId) {
  const found = stackOf(ctx.state, sceneId);
  const floor = found?.floors.find((f) => f.sceneId === floorId);
  if (!floor) return;
  ctx.dialog(
    ctx.t("Nome e altezza del piano", "Floor name and elevation"),
    `<div class="form-grid"><label class="field">${ctx.t("Nome", "Name")}<input name="name" required maxlength="80" value="${ctx.esc(floor.name)}"></label><label class="field">${ctx.t("Altezza (m)", "Elevation (m)")}<input name="elevation" type="number" step="0.5" min="-300" max="300" required value="${floor.elevation}"></label></div>`,
    {
      submitLabel: ctx.t("Salva", "Save"),
      onSubmit: (data) => {
        commitOwn(ctx, ctx.t("Piano aggiornato", "Floor updated"), (s) =>
          updateFloor(s, ctx.role, found.stack.id, floorId, {
            name: data.get("name"),
            elevation: data.get("elevation"),
          }),
        );
      },
    },
  );
}
function openFloorRemove(ctx, sceneId, floorId) {
  const found = stackOf(ctx.state, sceneId);
  const floor = found?.floors.find((f) => f.sceneId === floorId);
  if (!floor) return;
  ctx.dialog(
    ctx.t("Togli il piano dall’edificio", "Remove the floor from the building"),
    `<p>${ctx.t(`«${floorName(floor)}» resta una scena normale con muri e pedine; le scale che lo raggiungevano vengono tolte.`, `“${floorName(floor)}” stays an ordinary scene with its walls and tokens; the stairs reaching it are removed.`)}</p>`,
    {
      submitLabel: ctx.t("Togli dall’edificio", "Remove from building"),
      onSubmit: () => {
        commitOwn(ctx, ctx.t("Piano tolto dall’edificio", "Floor removed from the building"), (s) =>
          removeFloor(s, ctx.role, found.stack.id, floorId),
        );
      },
    },
  );
}
/** Metres with one decimal, as a number input's value ("9.8", never "9,8"). */
const metersValue = (scene, px) =>
  String(f1((Number(px) * (scene.metersPerCell ?? 1.5)) / (scene.gridSize ?? 50)));
/**
 * The stair's position in metres from the map's top-left corner: prefilled by the tap on the
 * map, editable (and the only way without a pointer).
 */
function stairPositionFields(ctx, scene, point) {
  const max = (px) => metersValue(scene, px);
  return `<div class="form-grid"><label class="field">${ctx.t("Da sinistra (m)", "From the left (m)")}<input name="x" type="number" min="0" max="${max(scene.width)}" step="0.1" required value="${metersValue(scene, point.x)}"></label><label class="field">${ctx.t("Dall’alto (m)", "From the top (m)")}<input name="y" type="number" min="0" max="${max(scene.height)}" step="0.1" required value="${metersValue(scene, point.y)}"></label></div>`;
}
function openStairAt(ctx, sceneId, point) {
  const found = stackOf(ctx.state, sceneId);
  if (!found) return;
  const others = found.floors.filter((f) => f.sceneId !== sceneId);
  const here = found.floor;
  const scene = found.floor.scene;
  ctx.dialog(
    ctx.t("Nuova scala", "New stair"),
    `<label class="field">${ctx.t("Nome", "Name")}<input name="name" required maxlength="80" value="${ctx.esc(ctx.t("Scala", "Stair"))}"></label><label class="field">${ctx.t("Collega", "Joins")} «${ctx.esc(floorName(here))}» ${ctx.t("con", "with")}<select name="to">${others.map((f) => `<option value="${ctx.esc(f.sceneId)}">${ctx.esc(floorName(f))} (${numberText(ctx, f.elevation)} m)</option>`).join("")}</select></label><label class="field">${ctx.t("Raggio (m)", "Radius (m)")}<input name="radius" type="number" min="0.5" max="20" step="0.5" value="${numberText(ctx, (scene.metersPerCell ?? 1.5) * 2).replace(",", ".")}"></label>${stairPositionFields(ctx, scene, point)}`,
    {
      submitLabel: ctx.t("Aggiungi scala", "Add stair"),
      onSubmit: (data) => {
        commitOwn(ctx, ctx.t("Scala aggiunta", "Stair added"), (s) =>
          addStair(s, ctx.role, found.stack.id, {
            name: data.get("name"),
            x: pxFromMeters(scene, Number(data.get("x"))),
            y: pxFromMeters(scene, Number(data.get("y"))),
            radius: pxFromMeters(scene, Number(data.get("radius"))),
            floors: [sceneId, data.get("to")],
          }),
        );
        ui.stairPick = null;
      },
    },
  );
}
/** A stair's name, radius and position (also the keyboard way to move it). */
function openStairEdit(ctx, sceneId, stairId) {
  const found = stackOf(ctx.state, sceneId);
  const stair = found?.stack.stairs?.find((row) => row.id === stairId);
  if (!stair) return;
  const scene = found.floor.scene;
  ctx.dialog(
    ctx.t("Modifica scala", "Edit stair"),
    `<label class="field">${ctx.t("Nome", "Name")}<input name="name" required maxlength="80" value="${ctx.esc(stair.name)}"></label><label class="field">${ctx.t("Raggio (m)", "Radius (m)")}<input name="radius" type="number" min="0.5" max="20" step="0.5" required value="${metersValue(scene, stair.radius)}"></label>${stairPositionFields(ctx, scene, stair)}`,
    {
      submitLabel: ctx.t("Salva", "Save"),
      onSubmit: (data) => {
        commitOwn(ctx, ctx.t("Scala modificata", "Stair changed"), (s) =>
          updateStair(s, ctx.role, found.stack.id, stairId, {
            name: data.get("name"),
            x: pxFromMeters(scene, Number(data.get("x"))),
            y: pxFromMeters(scene, Number(data.get("y"))),
            radius: pxFromMeters(scene, Number(data.get("radius"))),
          }),
        );
        ui.stairPick = null;
      },
    },
  );
}
function openVariantRename(ctx, sceneId, variantId) {
  const variant = D.variantsOf(ctx.state, sceneId).list.find((v) => v.id === variantId);
  if (!variant) return;
  ctx.dialog(
    ctx.t("Rinomina variante", "Rename variant"),
    `<label class="field">${ctx.t("Nome", "Name")}<input name="name" required maxlength="40" value="${ctx.esc(variant.name || ctx.t("Base", "Base"))}"></label>`,
    {
      submitLabel: ctx.t("Rinomina", "Rename"),
      onSubmit: (data) => {
        commitOwn(ctx, ctx.t("Variante rinominata", "Variant renamed"), (s) =>
          D.renameVariant(s, ctx.role, sceneId, variantId, data.get("name")),
        );
      },
    },
  );
}
function openVariantDelete(ctx, sceneId, variantId) {
  const variant = D.variantsOf(ctx.state, sceneId).list.find((v) => v.id === variantId);
  if (!variant) return;
  ctx.dialog(
    ctx.t("Elimina variante", "Delete variant"),
    `<p>${ctx.t(`La variante «${variant.name}» e la sua immagine escono dalla scena. Puoi correggere con Annulla ultima modifica.`, `The variant “${variant.name}” and its image leave the scene. You can correct this with Undo last change.`)}</p>`,
    {
      submitLabel: ctx.t("Elimina variante", "Delete variant"),
      onSubmit: () => {
        commitOwn(ctx, ctx.t("Variante eliminata", "Variant deleted"), (s) =>
          D.deleteVariant(s, ctx.role, sceneId, variantId),
        );
      },
    },
  );
}
function openPrefabCreate(ctx, sceneId) {
  const ids = [...ui.selected];
  if (!ids.length) return;
  const collections = [
    ...new Set((D.sliceOf(ctx.state)?.prefabs ?? []).map((p) => p.collection).filter(Boolean)),
  ];
  ctx.dialog(
    ctx.t("Crea prefabbricato", "Create prefab"),
    `<p class="muted">${ids.length} ${ctx.t("oggetti selezionati diventano un gruppo riutilizzabile, da inserire in qualunque scena.", "selected objects become a reusable group, to insert in any scene.")}</p><label class="field">${ctx.t("Nome", "Name")}<input name="name" required maxlength="60" placeholder="${ctx.t("es. Bivacco dei banditi", "e.g. Bandit bivouac")}"></label><label class="field">${ctx.t("Raccolta", "Collection")}<input name="collection" maxlength="40" list="sa-collections" placeholder="${ctx.t("es. Accampamenti", "e.g. Camps")}"><datalist id="sa-collections">${collections.map((c) => `<option value="${ctx.esc(c)}"></option>`).join("")}</datalist></label>`,
    {
      submitLabel: ctx.t("Crea prefabbricato", "Create prefab"),
      onSubmit: (data) => {
        commitOwn(ctx, ctx.t("Prefabbricato creato", "Prefab created"), (s) =>
          D.createPrefab(s, ctx.role, sceneId, ids, {
            name: data.get("name"),
            collection: data.get("collection"),
          }),
        );
      },
    },
  );
}
function openPrefabRename(ctx, prefabId) {
  const prefab = D.sliceOf(ctx.state)?.prefabs.find((p) => p.id === prefabId);
  if (!prefab) return;
  ctx.dialog(
    ctx.t("Rinomina prefabbricato", "Rename prefab"),
    `<label class="field">${ctx.t("Nome", "Name")}<input name="name" required maxlength="60" value="${ctx.esc(prefab.name)}"></label><label class="field">${ctx.t("Raccolta", "Collection")}<input name="collection" maxlength="40" value="${ctx.esc(prefab.collection)}"></label>`,
    {
      submitLabel: ctx.t("Salva", "Save"),
      onSubmit: (data) => {
        commitOwn(ctx, ctx.t("Prefabbricato rinominato", "Prefab renamed"), (s) =>
          D.renamePrefab(s, ctx.role, prefabId, {
            name: data.get("name"),
            collection: data.get("collection"),
          }),
        );
      },
    },
  );
}
function openPrefabDelete(ctx, prefabId) {
  const prefab = D.sliceOf(ctx.state)?.prefabs.find((p) => p.id === prefabId);
  if (!prefab) return;
  ctx.dialog(
    ctx.t("Elimina prefabbricato", "Delete prefab"),
    `<p>${ctx.t(`«${prefab.name}» esce dai prefabbricati. Le copie già inserite nelle scene restano.`, `“${prefab.name}” leaves the prefabs. Copies already inserted in scenes stay.`)}</p>`,
    {
      submitLabel: ctx.t("Elimina", "Delete"),
      onSubmit: () => {
        commitOwn(ctx, ctx.t("Prefabbricato eliminato", "Prefab deleted"), (s) =>
          D.deletePrefab(s, ctx.role, prefabId),
        );
      },
    },
  );
}
// PR-13 (Roll20's GM area off the page): a creature straight from the bestiary waits off
// the map, as a new NPC with the SRD block's AC, HP, speed and first melee attack.
export function stageFromBestiary(ctx, sceneId, entryId) {
  const entry = SRD.getEntry(entryId);
  if (!entry) return false;
  const taken = Object.values(ctx.state.actors).filter(
    (actor) => actor.compendiumRef?.id === entry.id,
  ).length;
  const name = `${ctx.label(entry.name)}${taken ? ` ${taken + 1}` : ""}`;
  const actorId = `npc-${D.uid("staged")}`;
  commitOwn(
    ctx,
    ctx.t(`Creatura fuori mappa: ${name}`, `Creature off the map: ${name}`),
    (s) => {
      const { input, patch } = SRD.npcFromCreature(entry, { id: actorId, name, team: "watch" });
      const actor = createSceneNPC(s, input, ctx.role);
      Object.assign(actor, patch);
      const melee = SRD.srdMeleeProfile(entry);
      if (melee) actor.combatProfile = { ...actor.combatProfile, meleeAttack: melee };
      D.stageCreature(s, ctx.role, sceneId, actorId);
    },
    { visibility: "private" },
  );
  return actorId;
}
function openStage(ctx, sceneId) {
  const scene = ctx.state.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  const bestiary = [...SRD.categoryEntries("creatures")].sort((a, b) =>
    ctx.label(a.name).localeCompare(ctx.label(b.name)),
  );
  const staged = new Set(D.stagedOn(ctx.state, sceneId, "dm").map((r) => r.actorId));
  const onMap = (scene.tokens ?? [])
    .map((t) => ctx.state.actors[t.actorId])
    .filter((a) => a?.kind === "npc");
  const waiting = Object.values(ctx.state.actors).filter(
    (a) =>
      a.kind === "npc" &&
      !a.companion &&
      !staged.has(a.id) &&
      !(scene.tokens ?? []).some((t) => t.actorId === a.id),
  );
  ctx.dialog(
    ctx.t("Metti una creatura fuori mappa", "Put a creature off the map"),
    `<p class="muted">${ctx.t("I giocatori non la vedono; la fai entrare quando serve. Non entra nell’iniziativa da sola.", "Players do not see it; you bring it in when needed. It does not join initiative by itself.")}</p><label class="field">${ctx.t("Creatura", "Creature")}<select name="actor">${waiting.length ? `<optgroup label="${ctx.t("Non ancora sulla mappa", "Not yet on the map")}">${waiting.map((a) => `<option value="new:${ctx.esc(a.id)}">${ctx.esc(a.name)}</option>`).join("")}</optgroup>` : ""}${onMap.length ? `<optgroup label="${ctx.t("Togli dalla mappa", "Take off the map")}">${onMap.map((a) => `<option value="map:${ctx.esc(a.id)}">${ctx.esc(a.name)}</option>`).join("")}</optgroup>` : ""}${bestiary.length ? `<optgroup label="${ctx.t("Dal bestiario (SRD 5.2.1)", "From the bestiary (SRD 5.2.1)")}">${bestiary.map((e) => `<option value="srd:${ctx.esc(e.id)}">${ctx.esc(ctx.label(e.name))}${e.cr !== undefined && e.cr !== null ? ` · ${ctx.t("GS", "CR")} ${ctx.esc(e.cr)}` : ""}</option>`).join("")}</optgroup>` : ""}</select></label>`,
    {
      submitLabel: ctx.t("Metti fuori mappa", "Move off the map"),
      onSubmit: (data) => {
        const value = String(data.get("actor") || "");
        const cut = value.indexOf(":");
        const kind = value.slice(0, cut);
        const actorId = value.slice(cut + 1);
        if (cut < 0 || !actorId) return false;
        if (kind === "srd") return stageFromBestiary(ctx, sceneId, actorId);
        commitOwn(ctx, ctx.t("Creatura fuori mappa", "Creature off the map"), (s) =>
          kind === "map"
            ? D.sendOffMap(s, ctx.role, sceneId, actorId)
            : D.stageCreature(s, ctx.role, sceneId, actorId),
        );
      },
    },
  );
}

// ------------------------------------------------------------------------------ actions

/**
 * The context menu of selected objects (Owlbear: select → context menu › Create Prefab,
 * VTL-081; Foundry: right-click opens the tile HUD with visibility and lock, FVT-078).
 */
export function propMenu(ctx, box, ids) {
  const rows = box.props.filter((row) => ids.includes(row.id));
  if (!rows.length) return [];
  const n = rows.length;
  const items = [];
  if (box.kind === "scene")
    items.push({
      action: "prefab",
      label:
        n === 1
          ? ctx.t("Crea prefabbricato…", "Create prefab…")
          : ctx.t(`Crea prefabbricato con ${n} oggetti…`, `Create prefab from ${n} objects…`),
    });
  items.push(
    rows.every((row) => row.hidden)
      ? { action: "show", label: ctx.t("Mostra ai giocatori", "Show to players") }
      : { action: "hide", label: ctx.t("Nascondi ai giocatori", "Hide from players") },
    rows.every((row) => row.locked)
      ? { action: "unlock", label: ctx.t("Sblocca", "Unlock") }
      : { action: "lock", label: ctx.t("Blocca", "Lock") },
    { action: "delete", label: `${ctx.t("Elimina", "Delete")} (${n})` },
  );
  return items;
}
const MENU_PATCH = {
  hide: { hidden: true },
  show: { hidden: false },
  lock: { locked: true },
  unlock: { locked: false },
};

/** Objects commands of the workspace; also used by the tests without a DOM. */
export const prepActions = {
  /**
   * Keyboard: Enter on the canvas does what the armed tap would do, at the map's centre (a
   * prefab lands there, selected, so the arrows move it; a stair opens its dialog, where
   * the position is typed).
   */
  placeArmed(ctx, targetId) {
    const box = boxFor(ctx, targetId);
    if (!box) return null;
    const centre = { x: box.width / 2, y: box.height / 2 };
    if (ui.placing?.prefab && box.kind === "scene") {
      const prefabId = ui.placing.prefab;
      ui.placing = null;
      return prepActions.insertPrefab(ctx, prefabId, targetId, centre);
    }
    if (ui.placing?.sticker) {
      const sticker = ui.placing.sticker;
      ui.placing = null;
      return prepActions.addSticker(ctx, targetId, sticker, centre);
    }
    if (ui.stairPick && box.kind === "scene") {
      const pick = ui.stairPick;
      // Disarmed (and shown so) before the dialog: Cancel leaves nothing armed.
      ui.stairPick = null;
      ctx.render();
      if (pick.move) openStairEdit(ctx, targetId, pick.move);
      else openStairAt(ctx, targetId, centre);
      return true;
    }
    return null;
  },
  /** One entry of the objects' context menu, on the given selection. */
  propMenuAction(ctx, targetId, ids, action) {
    ui.selected = new Set(ids);
    if (action === "prefab") {
      openPrefabCreate(ctx, targetId);
      return true;
    }
    if (action === "delete") return prepActions.remove(ctx, targetId, ids);
    const patch = MENU_PATCH[action];
    const box = boxFor(ctx, targetId);
    if (!patch || !box) return false;
    const rows = box.props.filter((row) => ids.includes(row.id));
    const who = rows.length === 1 ? rows[0].name : null;
    const text = {
      hide: [
        ctx.t("nascosto ai giocatori", "hidden from players"),
        ctx.t("nascosti ai giocatori", "hidden from players"),
      ],
      show: [
        ctx.t("visibile ai giocatori", "visible to players"),
        ctx.t("visibili ai giocatori", "visible to players"),
      ],
      lock: [ctx.t("bloccato", "locked"), ctx.t("bloccati", "locked")],
      unlock: [ctx.t("sbloccato", "unlocked"), ctx.t("sbloccati", "unlocked")],
    }[action];
    const label = who
      ? `${who}: ${text[0]}`
      : `${rows.length} ${ctx.t("oggetti", "objects")}: ${text[1]}`;
    return run(ctx, label, (s) => D.updateProps(s, ctx.role, targetId, ids, patch));
  },
  addSticker(ctx, targetId, sticker, point = null) {
    const art = stickerById(sticker);
    const box = boxFor(ctx, targetId);
    if (!art || !box) return null;
    let added = null;
    const done = run(
      ctx,
      ctx.t(`Adesivo aggiunto: ${art.name.it}`, `Sticker added: ${art.name.en}`),
      (s) => {
        added = D.addProp(s, ctx.role, targetId, {
          sticker,
          name: ctx.label(art.name),
          ...(point ? { x: point.x, y: point.y } : {}),
          ...(box.kind === "prefab" ? { width: art.meters * (50 / 1.5) } : {}),
        });
        // Selected before the commit renders, so its handles and palette show at once.
        ui.selected = new Set([added.id]);
      },
    );
    return done ? added : null;
  },
  addAsset(ctx, targetId, assetId, point = null) {
    const asset = visibleAssets(ctx.state, "dm").find((a) => a.id === assetId);
    if (!asset) return null;
    let added = null;
    const width = Math.min(300, asset.width || 150);
    const done = run(
      ctx,
      ctx.t(`Immagine aggiunta: ${asset.name}`, `Image added: ${asset.name}`),
      (s) => {
        added = D.addProp(s, ctx.role, targetId, {
          assetId,
          name: asset.name,
          width,
          height: (width * (asset.height || 1)) / (asset.width || 1),
          ...(point ? { x: point.x, y: point.y } : {}),
        });
        ui.selected = new Set([added.id]);
      },
    );
    return done ? added : null;
  },
  move(ctx, targetId, ids, dx, dy) {
    return run(ctx, ctx.t("Oggetti spostati", "Objects moved"), (s) =>
      D.moveProps(s, ctx.role, targetId, ids, dx, dy),
    );
  },
  resize(ctx, targetId, id, width) {
    return run(ctx, ctx.t("Oggetto ridimensionato", "Object resized"), (s) =>
      D.updateProps(s, ctx.role, targetId, [id], { width }),
    );
  },
  rotate(ctx, targetId, id, rotation) {
    return run(ctx, ctx.t("Oggetto ruotato", "Object rotated"), (s) =>
      D.updateProps(s, ctx.role, targetId, [id], { rotation }),
    );
  },
  remove(ctx, targetId, ids) {
    const done = run(
      ctx,
      ids.length === 1
        ? ctx.t("Oggetto eliminato", "Object deleted")
        : ctx.t(`${ids.length} oggetti eliminati`, `${ids.length} objects deleted`),
      (s) => D.deleteProps(s, ctx.role, targetId, ids),
    );
    if (done) ui.selected = new Set();
    return done;
  },
  flag(ctx, targetId, id, key) {
    const box = boxFor(ctx, targetId);
    const row = box?.props.find((r) => r.id === id);
    if (!row) return false;
    const next = !row[key];
    return run(
      ctx,
      key === "hidden"
        ? next
          ? ctx.t(`${row.name}: nascosto ai giocatori`, `${row.name}: hidden from players`)
          : ctx.t(`${row.name}: visibile ai giocatori`, `${row.name}: visible to players`)
        : next
          ? ctx.t(`${row.name}: bloccato`, `${row.name}: locked`)
          : ctx.t(`${row.name}: sbloccato`, `${row.name}: unlocked`),
      (s) => D.updateProps(s, ctx.role, targetId, [id], { [key]: next }),
    );
  },
  /** Foundry Placeables Palette: the same change on every selected object. */
  bulk(ctx, targetId, ids, form) {
    const box = boxFor(ctx, targetId);
    if (!box) return false;
    const scene = pseudoScene(box);
    const patch = {};
    const num = (key) =>
      form[key] === "" || form[key] === undefined ? undefined : Number(form[key]);
    if (form.name !== undefined && ids.length === 1) patch.name = form.name;
    if (num("width") !== undefined) patch.width = pxFromMeters(scene, num("width"));
    if (num("rotation") !== undefined) patch.rotation = num("rotation");
    if (form.layer) patch.layer = form.layer;
    if (num("fade") !== undefined) patch.fade = num("fade") / 100;
    if (form.visible) patch.hidden = form.visible === "no";
    if (form.locked) patch.locked = form.locked === "yes";
    // A change of the lock alone must not be blocked by the geometry of a locked object:
    // unlock first, then apply the rest (as two explicit steps in one command).
    const rows = box.props.filter((row) => ids.includes(row.id));
    const unchangedGeometry = (key) =>
      patch[key] === undefined || rows.every((row) => Math.abs(row[key] - patch[key]) < 0.05);
    for (const key of ["width", "rotation"]) if (unchangedGeometry(key)) delete patch[key];
    return run(
      ctx,
      ids.length === 1
        ? ctx.t("Oggetto modificato", "Object changed")
        : ctx.t(
            `${ids.length} oggetti modificati insieme`,
            `${ids.length} objects changed together`,
          ),
      (s) => D.updateProps(s, ctx.role, targetId, ids, patch),
    );
  },
  insertPrefab(ctx, prefabId, sceneId, point) {
    const prefab = D.sliceOf(ctx.state)?.prefabs.find((p) => p.id === prefabId);
    let result = null;
    const done = run(
      ctx,
      ctx.t(
        `Prefabbricato inserito: ${prefab?.name ?? ""}`,
        `Prefab inserted: ${prefab?.name ?? ""}`,
      ),
      (s) => {
        result = D.insertPrefab(s, ctx.role, prefabId, sceneId, point);
        ui.selected = new Set(result.props.map((r) => r.id));
      },
    );
    return done ? result : null;
  },
  dropStaged(ctx, sceneId, stageId, point) {
    return run(ctx, ctx.t("Creatura spostata", "Creature moved"), (s) =>
      D.dropStaged(s, ctx.role, sceneId, stageId, point),
    );
  },
};

// ------------------------------------------------------------------------------ binding

// A plain {x, y}: an SVGPoint's coordinates are prototype getters, lost when spread.
function canvasPoint(svg, event) {
  const p = svg.createSVGPoint();
  p.x = event.clientX;
  p.y = event.clientY;
  const q = p.matrixTransform(svg.getScreenCTM().inverse());
  return { x: q.x, y: q.y };
}
function screenPoint(svg, point) {
  const p = svg.createSVGPoint();
  p.x = point.x;
  p.y = point.y;
  return p.matrixTransform(svg.getScreenCTM());
}
function nodeTransform(row, dx = 0, dy = 0, rotation = row.rotation) {
  return `translate(${f1(row.x + dx)} ${f1(row.y + dy)}) rotate(${Math.round(rotation)})`;
}

/** Owlbear magnifier: follows the pointer; on touch it lifts above the finger. */
function showLoupe(root, svg, point, event, { size = null } = {}) {
  const loupe = root.querySelector("[data-sa-loupe]");
  const wrap = root.querySelector("[data-sa-canvas-wrap]");
  if (!loupe || !wrap) return;
  const span = size ? Math.max(40, size * 1.6) : 70;
  const inner = loupe.querySelector("svg");
  inner.setAttribute(
    "viewBox",
    `${f1(point.x - span / 2)} ${f1(point.y - span / 2)} ${f1(span)} ${f1(span)}`,
  );
  const cross = loupe.querySelector("[data-sa-loupe-cross]");
  const w = span / 40;
  cross.innerHTML = `<path d="M${f1(point.x - span)} ${f1(point.y)}H${f1(point.x + span)}M${f1(point.x)} ${f1(point.y - span)}V${f1(point.y + span)}" stroke="#ff7a59" stroke-width="${f1(w)}"/>${size ? `<rect x="${f1(point.x)}" y="${f1(point.y)}" width="${f1(size)}" height="${f1(size)}" fill="none" stroke="#7fe0ff" stroke-width="${f1(w)}" stroke-dasharray="${f1(w * 3)} ${f1(w * 2)}"/>` : ""}`;
  loupe.hidden = false;
  // Placed in window coordinates (it may overlap the page around a small canvas), above the
  // point; below it only when there is no room above in the window.
  const rect = wrap.getBoundingClientRect();
  const at = screenPoint(svg, point);
  const box = loupe.getBoundingClientRect();
  const lw = box.width || 150,
    lh = box.height || 150;
  const touch = event?.pointerType === "touch" || event?.pointerType === "pen";
  const gap = touch ? 70 : 26;
  let left = at.x + (touch ? -lw / 2 : gap);
  let top = at.y - lh - gap;
  if (top < 8) top = at.y + gap;
  left = Math.max(4, Math.min(globalThis.innerWidth - lw - 4, left));
  loupe.style.left = `${Math.round(left - rect.left)}px`;
  loupe.style.top = `${Math.round(top - rect.top)}px`;
  loupe.dataset.saTouch = touch ? "true" : "false";
}
/** Owlbear: the Next button appears right under the point just chosen. */
function placeNext(root, svg, point) {
  const next = root.querySelector("[data-sa-next]");
  const wrap = root.querySelector("[data-sa-canvas-wrap]");
  if (!next || !wrap || !point) return;
  next.hidden = false;
  const rect = wrap.getBoundingClientRect();
  const at = screenPoint(svg, point);
  const w = next.offsetWidth || 90;
  next.style.left = `${Math.round(Math.max(4, Math.min(rect.width - w - 4, at.x - rect.left - w / 2)))}px`;
  next.style.top = `${Math.round(Math.min(rect.height - 48, at.y - rect.top + 30))}px`;
}

function bindMenu(root, ctx) {
  const click = (selector, handler) =>
    root
      .querySelectorAll(selector)
      .forEach((node) => node.addEventListener("click", (event) => handler(node, event)));
  click("[data-sa-crumb]", (node) => {
    ui.folder = node.dataset.saCrumb || null;
    ui.archive = false;
    ui.query = "";
    ctx.render();
  });
  click("[data-sa-open-folder]", (node) => {
    ui.folder = node.dataset.saOpenFolder;
    ui.query = "";
    ctx.render();
  });
  click("[data-sa-archive-view]", () => {
    ui.archive = !ui.archive;
    ui.query = "";
    ctx.render();
  });
  click("[data-sa-new-folder]", () => openNewFolder(ctx));
  click("[data-sa-new-scene]", (node) => openNewScene(ctx, node.dataset.saNewScene));
  click("[data-sa-rename-folder]", (node) => openRenameFolder(ctx, node.dataset.saRenameFolder));
  click("[data-sa-move-folder]", (node) => openMoveFolder(ctx, node.dataset.saMoveFolder));
  click("[data-sa-delete-folder]", (node) => openDeleteFolder(ctx, node.dataset.saDeleteFolder));
  click("[data-sa-move-scene]", (node) => openMoveScene(ctx, node.dataset.saMoveScene));
  click("[data-sa-duplicate]", (node) => openDuplicate(ctx, node.dataset.saDuplicate));
  click("[data-sa-activate]", (node) => openActivate(ctx, node.dataset.saActivate));
  click("[data-sa-archive]", (node) => archive(ctx, node.dataset.saArchive));
  click("[data-sa-restore]", (node) => {
    const id = node.dataset.saRestore;
    const name = D.archivedScenes(ctx.state).find((r) => r.scene.id === id)?.scene.name ?? "";
    run(ctx, ctx.t(`Scena ripristinata: ${name}`, `Scene restored: ${name}`), (s) =>
      D.restoreScene(s, ctx.role, id),
    );
  });
  const search = root.querySelector("[data-sa-search]");
  search?.addEventListener("input", () => {
    ui.query = search.value;
    const at = search.selectionStart;
    ctx.render();
    const next = globalThis.document?.querySelector("[data-sa-search]");
    next?.focus();
    next?.setSelectionRange?.(at, at);
  });
  // Roll20: drag a page card onto a folder (or the breadcrumb) to move it.
  root.querySelectorAll("[data-sa-scene-card], [data-sa-folder-card]").forEach((card) => {
    card.addEventListener("dragstart", (event) => {
      // Folders nest (and hold scene rows): the innermost card is the one being dragged.
      event.stopPropagation();
      const kind = card.dataset.saSceneCard ? "scene" : "folder";
      const id = card.dataset.saSceneCard ?? card.dataset.saFolderCard;
      event.dataTransfer?.setData("text/plain", `${kind}:${id}`);
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
      card.classList.add("is-dragging");
    });
    card.addEventListener("dragend", () => card.classList.remove("is-dragging"));
  });
  root.querySelectorAll("[data-sa-drop]").forEach((target) => {
    target.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.stopPropagation();
      target.classList.add("is-drop");
    });
    target.addEventListener("dragleave", () => target.classList.remove("is-drop"));
    target.addEventListener("drop", (event) => {
      event.preventDefault();
      // The innermost folder under the pointer takes the drop, never its parents too.
      event.stopPropagation();
      target.classList.remove("is-drop");
      const [kind, id] = String(event.dataTransfer?.getData("text/plain") ?? "").split(":");
      const folder = target.dataset.saDrop || null;
      if (!id || (kind === "folder" && id === folder)) return;
      if (kind === "scene")
        run(
          ctx,
          ctx.t("Scena spostata in un’altra cartella", "Scene moved to another folder"),
          (s) => D.moveScene(s, ctx.role, id, folder),
        );
      else if (kind === "folder")
        run(ctx, ctx.t("Cartella spostata", "Folder moved"), (s) =>
          D.moveFolder(s, ctx.role, id, folder),
        );
    });
  });
}

function bindCanvas(root, ctx, box) {
  const svg = root.querySelector("[data-sa-canvas]");
  if (!svg) return;
  const targetId = box.id;
  const scene = pseudoScene(box);
  const rowsById = new Map(box.props.map((row) => [row.id, row]));
  const menu = root.querySelector("[data-sa-context]");
  let gesture = null;
  let press = null;
  const closeMenu = () => {
    if (menu) menu.hidden = true;
    ui.menu = null;
  };
  const openMenu = (event, point) => {
    if (!menu || box.kind !== "scene") return;
    const prefabs = D.sliceOf(ctx.state)?.prefabs ?? [];
    const wrap = root.querySelector("[data-sa-canvas-wrap]").getBoundingClientRect();
    menu.innerHTML = `<p class="sa-context-title">${ctx.t("Inserisci prefabbricato", "Insert prefab")}</p>${prefabs.length ? prefabs.map((p) => `<button type="button" role="menuitem" data-sa-context-prefab="${ctx.esc(p.id)}">${ctx.esc(p.name)}</button>`).join("") : `<p class="muted">${ctx.t("Nessun prefabbricato.", "No prefabs.")}</p>`}<button type="button" role="menuitem" data-sa-context-close>${ctx.t("Chiudi", "Close")}</button>`;
    menu.hidden = false;
    menu.style.left = `${Math.round(Math.min(wrap.width - 220, Math.max(4, event.clientX - wrap.left)))}px`;
    menu.style.top = `${Math.round(Math.min(wrap.height - 60, Math.max(4, event.clientY - wrap.top)))}px`;
    ui.menu = point;
    menu.querySelectorAll("[data-sa-context-prefab]").forEach((b) =>
      b.addEventListener("click", () => {
        const at = ui.menu;
        closeMenu();
        prepActions.insertPrefab(ctx, b.dataset.saContextPrefab, targetId, at);
      }),
    );
    menu.querySelector("[data-sa-context-close]")?.addEventListener("click", closeMenu);
    menu.querySelector("button")?.focus();
  };
  // Owlbear / Foundry: right-click (long press) on objects opens their menu. It opens after
  // the render that shows the new selection, from `ui.propMenu`.
  const openPropMenu = ({ clientX, clientY, ids }) => {
    const items = propMenu(ctx, box, ids);
    if (!menu || !items.length) return;
    const wrap = root.querySelector("[data-sa-canvas-wrap]").getBoundingClientRect();
    menu.innerHTML = `<p class="sa-context-title">${ids.length === 1 ? ctx.esc(box.props.find((row) => row.id === ids[0])?.name ?? "") : `${ids.length} ${ctx.t("oggetti selezionati", "objects selected")}`}</p>${items.map((item) => `<button type="button" role="menuitem" data-sa-context-action="${item.action}">${ctx.esc(item.label)}</button>`).join("")}<button type="button" role="menuitem" data-sa-context-close>${ctx.t("Chiudi", "Close")}</button>`;
    menu.hidden = false;
    menu.style.left = `${Math.round(Math.min(wrap.width - 220, Math.max(4, clientX - wrap.left)))}px`;
    menu.style.top = `${Math.round(Math.min(wrap.height - 60, Math.max(4, clientY - wrap.top)))}px`;
    ui.menu = { ids };
    menu.querySelectorAll("[data-sa-context-action]").forEach((b) =>
      b.addEventListener("click", () => {
        closeMenu();
        prepActions.propMenuAction(ctx, targetId, ids, b.dataset.saContextAction);
      }),
    );
    menu.querySelector("[data-sa-context-close]")?.addEventListener("click", closeMenu);
    menu.querySelector("button")?.focus();
  };
  const longPress = (event, open) => {
    const timer = setTimeout(() => {
      press = null;
      // The canvas may have been redrawn meanwhile: only a live canvas opens a menu.
      if (svg.isConnected) {
        // The browser's own long-press «contextmenu» follows on the redrawn canvas, where
        // the finger now rests on the selection: it must not replace this menu.
        touchMenuAt = Date.now();
        open();
      }
    }, 550);
    press = { timer, x: event.clientX, y: event.clientY };
  };
  const requestPropMenu = (event, id) => {
    if (!ui.selected.has(id)) ui.selected = new Set([id]);
    ui.propMenu = { clientX: event.clientX, clientY: event.clientY, ids: [...ui.selected] };
    ctx.render();
  };
  menu?.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    closeMenu();
    svg.focus({ preventScroll: true });
  });
  // A waiting creature is a keyboard button too: Enter brings it in at the nearest edge.
  svg.querySelectorAll("[data-sa-staged]").forEach((node) =>
    node.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      event.stopPropagation();
      run(
        ctx,
        ctx.t("Creatura entrata dalla zona fuori mappa", "Creature brought in from off the map"),
        (s) => D.bringIn(s, ctx.role, targetId, node.dataset.saStaged),
      );
    }),
  );
  svg.addEventListener("contextmenu", (event) => {
    if (ui.align) return;
    event.preventDefault();
    if (Date.now() - touchMenuAt < 1500) return;
    const node = event.target.closest?.("[data-sa-prop]");
    if (node && ui.tab !== "objects") return;
    if (node) requestPropMenu(event, node.dataset.saProp);
    else openMenu(event, canvasPoint(svg, event));
  });
  svg.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    closeMenu();
    const p = canvasPoint(svg, event);
    if (ui.align && ui.tab === "grid") {
      event.preventDefault();
      svg.setPointerCapture?.(event.pointerId);
      gesture = { kind: "align", start: p };
      showLoupe(root, svg, p, event, { size: ui.align.step === 2 ? null : ui.align.size });
      return;
    }
    if (ui.stairPick && box.kind === "scene") {
      event.preventDefault();
      const pick = ui.stairPick;
      if (pick.move) {
        const found = stackOf(ctx.state, targetId);
        run(ctx, ctx.t("Scala spostata", "Stair moved"), (s) =>
          updateStair(s, ctx.role, found.stack.id, pick.move, { x: p.x, y: p.y }),
        );
        ui.stairPick = null;
        ctx.render();
      } else {
        // Disarmed before the dialog: Cancel leaves nothing armed.
        ui.stairPick = null;
        ctx.render();
        openStairAt(ctx, targetId, p);
      }
      return;
    }
    if (ui.placing) {
      event.preventDefault();
      const placing = ui.placing;
      ui.placing = null;
      if (placing.prefab) prepActions.insertPrefab(ctx, placing.prefab, targetId, p);
      else if (placing.sticker) prepActions.addSticker(ctx, targetId, placing.sticker, p);
      return;
    }
    const handle = event.target.closest?.("[data-sa-handle]");
    const node = event.target.closest?.("[data-sa-prop]");
    const staged = event.target.closest?.("[data-sa-staged]");
    if (handle && ui.selected.size === 1) {
      event.preventDefault();
      const row = rowsById.get([...ui.selected][0]);
      if (!row) return;
      svg.setPointerCapture?.(event.pointerId);
      gesture = { kind: handle.dataset.saHandle, row, start: p, value: null };
      return;
    }
    if (staged && box.kind === "scene") {
      event.preventDefault();
      svg.setPointerCapture?.(event.pointerId);
      gesture = { kind: "staged", id: staged.dataset.saStaged, node: staged, start: p, last: p };
      return;
    }
    if (node) {
      event.preventDefault();
      const id = node.dataset.saProp;
      if (event.shiftKey) {
        if (ui.selected.has(id)) ui.selected.delete(id);
        else ui.selected.add(id);
      } else if (!ui.selected.has(id)) ui.selected = new Set([id]);
      svg.setPointerCapture?.(event.pointerId);
      gesture = {
        kind: "move",
        ids: [...ui.selected],
        start: p,
        last: p,
        moved: false,
        clicked: id,
      };
      svg
        .querySelectorAll("[data-sa-prop]")
        .forEach((n) => n.classList.toggle("is-selected", ui.selected.has(n.dataset.saProp)));
      // A long touch on an object opens its menu (the touch form of the right-click).
      if (event.pointerType === "touch")
        longPress(event, () => {
          gesture = null;
          requestPropMenu(event, id);
        });
      return;
    }
    // Empty spot: clear the selection; a long touch opens the insert menu (Owlbear).
    if (!event.shiftKey && ui.selected.size) {
      ui.selected = new Set();
      ctx.render();
      return;
    }
    if (event.pointerType === "touch") longPress(event, () => openMenu(event, p));
  });
  svg.addEventListener("pointermove", (event) => {
    // A finger's jitter does not cancel a long press; a real move does.
    if (press && Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) {
      clearTimeout(press.timer);
      press = null;
    }
    if (!gesture) {
      if (ui.align && ui.tab === "grid" && event.pointerType === "mouse")
        showLoupe(root, svg, canvasPoint(svg, event), event, {
          size: ui.align.step === 2 ? null : ui.align.size,
        });
      return;
    }
    const p = canvasPoint(svg, event);
    if (gesture.kind === "align") {
      gesture.start = p;
      showLoupe(root, svg, p, event, { size: ui.align.step === 2 ? null : ui.align.size });
      return;
    }
    if (gesture.kind === "move") {
      const dx = p.x - gesture.start.x,
        dy = p.y - gesture.start.y;
      if (!gesture.moved && Math.hypot(dx, dy) < 4) return;
      const locked = gesture.ids.map((id) => rowsById.get(id)).filter((row) => row?.locked);
      if (locked.length) {
        if (!gesture.moved)
          ctx.toast(
            ctx.t(
              `Bloccato: ${locked.map((r) => r.name).join(", ")}. Sbloccalo per spostarlo.`,
              `Locked: ${locked.map((r) => r.name).join(", ")}. Unlock it to move it.`,
            ),
            true,
          );
        gesture.moved = true;
        gesture.blocked = true;
        return;
      }
      gesture.moved = true;
      gesture.last = p;
      for (const id of gesture.ids) {
        const row = rowsById.get(id);
        svg
          .querySelector(`[data-sa-prop="${CSS.escape(id)}"]`)
          ?.setAttribute("transform", nodeTransform(row, dx, dy));
      }
      svg.querySelector(".sa-handles")?.setAttribute("opacity", "0");
      return;
    }
    if (gesture.kind === "resize") {
      const row = gesture.row;
      const rad = (row.rotation * Math.PI) / 180;
      const dx = p.x - row.x,
        dy = p.y - row.y;
      const local = Math.abs(dx * Math.cos(rad) + dy * Math.sin(rad));
      const width = Math.max(10, Math.min(3000, local * 2));
      gesture.value = width;
      const node = svg.querySelector(`[data-sa-prop="${CSS.escape(row.id)}"] > g`);
      const art = row.sticker ? stickerById(row.sticker) : null;
      const aspect = art ? art.aspect : row.height / row.width;
      const height = (row.height * width) / row.width;
      node?.setAttribute("transform", `scale(${width / 100} ${height / (100 * aspect)})`);
      const live = svg.querySelector("[data-sa-live]");
      if (live) {
        live.textContent = metersText(ctx, scene, width);
        live.setAttribute("x", f1(p.x + 18));
        live.setAttribute("y", f1(p.y + 30));
      }
      return;
    }
    if (gesture.kind === "rotate") {
      const row = gesture.row;
      let angle = (Math.atan2(p.y - row.y, p.x - row.x) * 180) / Math.PI + 90;
      if (!event.shiftKey) angle = Math.round(angle / 15) * 15;
      gesture.value = ((Math.round(angle) % 360) + 360) % 360;
      svg
        .querySelector(`[data-sa-prop="${CSS.escape(row.id)}"]`)
        ?.setAttribute("transform", nodeTransform(row, 0, 0, gesture.value));
      const live = svg.querySelector("[data-sa-live]");
      if (live) live.textContent = `${gesture.value}°`;
      return;
    }
    if (gesture.kind === "staged") {
      gesture.last = p;
      gesture.node.setAttribute("transform", `translate(${f1(p.x)} ${f1(p.y)})`);
    }
  });
  const finish = (event) => {
    if (press) {
      clearTimeout(press.timer);
      press = null;
    }
    if (!gesture) return;
    const g = gesture;
    gesture = null;
    const p = canvasPoint(svg, event);
    if (g.kind === "align") {
      const a = ui.align;
      const at = { x: Math.round(p.x * 2) / 2, y: Math.round(p.y * 2) / 2 };
      if (a.step === 1) {
        a.anchor = at;
        a.offX = at.x;
        a.offY = at.y;
      } else if (a.step === 2) {
        a.corner = at;
        const size = (Math.abs(at.x - a.anchor.x) + Math.abs(at.y - a.anchor.y)) / 2;
        a.size = size >= 10 && size <= 300 ? size : a.size;
        if (!(size >= 10 && size <= 300))
          ctx.toast(
            ctx.t(
              "La cella deve misurare da 10 a 300 pixel: tocca l’angolo opposto della stessa casella.",
              "The cell must measure 10 to 300 pixels: tap the opposite corner of the same cell.",
            ),
            true,
          );
      }
      ctx.render();
      const fresh = globalThis.document?.querySelector("[data-sa-canvas]");
      const rootNow = fresh?.closest("[data-sa-ws]");
      if (fresh && rootNow) {
        showLoupe(rootNow, fresh, at, event, { size: a.step === 2 ? null : a.size });
        if (a.step < 3) placeNext(rootNow, fresh, at);
      }
      return;
    }
    if (g.kind === "move") {
      if (g.moved && !g.blocked)
        prepActions.move(ctx, targetId, g.ids, g.last.x - g.start.x, g.last.y - g.start.y);
      else ctx.render();
      return;
    }
    if (g.kind === "resize") {
      if (g.value) prepActions.resize(ctx, targetId, g.row.id, g.value);
      else ctx.render();
      return;
    }
    if (g.kind === "rotate") {
      if (g.value !== null) prepActions.rotate(ctx, targetId, g.row.id, g.value);
      else ctx.render();
      return;
    }
    if (g.kind === "staged") {
      if (Math.hypot(g.last.x - g.start.x, g.last.y - g.start.y) > 4)
        prepActions.dropStaged(ctx, targetId, g.id, g.last);
      else ctx.render();
    }
  };
  svg.addEventListener("pointerup", finish);
  svg.addEventListener("pointercancel", () => {
    if (press) clearTimeout(press.timer);
    press = null;
    gesture = null;
    ctx.render();
  });
  svg.addEventListener("keydown", (event) => {
    if (ui.align && ui.tab === "grid") {
      const a = ui.align;
      const step = event.shiftKey ? 10 : 1;
      const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[
        event.key
      ];
      if (dir) {
        event.preventDefault();
        if (a.step === 1 && a.anchor) {
          a.anchor = { x: a.anchor.x + dir[0] * step, y: a.anchor.y + dir[1] * step };
          a.offX = a.anchor.x;
          a.offY = a.anchor.y;
        } else if (a.step === 2 && a.corner) {
          a.corner = { x: a.corner.x + dir[0] * step, y: a.corner.y + dir[1] * step };
          a.size = (Math.abs(a.corner.x - a.anchor.x) + Math.abs(a.corner.y - a.anchor.y)) / 2;
        } else if (a.step === 3) {
          a.offX += dir[0] * step;
          a.offY += dir[1] * step;
        }
        ctx.render();
        globalThis.document?.querySelector("[data-sa-canvas]")?.focus();
      }
      if (a.step === 3 && ["+", "=", "-"].includes(event.key)) {
        event.preventDefault();
        a.size = Math.max(
          10,
          Math.min(300, a.size + (event.key === "-" ? -0.5 : 0.5) * (event.shiftKey ? 4 : 1)),
        );
        ctx.render();
        globalThis.document?.querySelector("[data-sa-canvas]")?.focus();
      }
      return;
    }
    // Keyboard form of the armed tap: Enter (or Space) places at the map's centre.
    if ((event.key === "Enter" || event.key === " ") && (ui.placing || ui.stairPick)) {
      event.preventDefault();
      prepActions.placeArmed(ctx, targetId);
      if (!globalThis.document?.querySelector("#dialog[open]"))
        globalThis.document?.querySelector("[data-sa-canvas]")?.focus({ preventScroll: true });
      return;
    }
    // Foundry: Ctrl/Cmd+Z on the canvas undoes the last change (the shell's Undo).
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
      event.preventDefault();
      ctx.undo();
      globalThis.document?.querySelector("[data-sa-canvas]")?.focus();
      return;
    }
    if (event.key === "Escape") {
      if (ui.placing || ui.stairPick || ui.selected.size || ui.menu) {
        event.preventDefault();
        ui.placing = null;
        ui.stairPick = null;
        ui.selected = new Set();
        closeMenu();
        ctx.render();
      }
      return;
    }
    const ids = [...ui.selected];
    if (!ids.length) return;
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      prepActions.remove(ctx, targetId, ids);
      globalThis.document?.querySelector("[data-sa-canvas]")?.focus();
      return;
    }
    const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[
      event.key
    ];
    if (dir) {
      event.preventDefault();
      const step = event.shiftKey ? scene.gridSize : 5;
      prepActions.move(ctx, targetId, ids, dir[0] * step, dir[1] * step);
      globalThis.document?.querySelector("[data-sa-canvas]")?.focus();
    }
  });
  // The objects' menu requested by a right-click (or long press) before this render.
  if (ui.propMenu) {
    const request = ui.propMenu;
    ui.propMenu = null;
    if (ui.tab === "objects") openPropMenu(request);
  }
}

function bindObjects(root, ctx, box) {
  const targetId = box.id;
  const svg = root.querySelector("[data-sa-canvas]");
  // D&D Beyond: "+" adds a sticker at the centre; dragging it onto the map drops it there.
  root.querySelectorAll("[data-sa-sticker], [data-sa-asset]").forEach((button) => {
    let drag = null;
    const add = (point) =>
      button.dataset.saSticker
        ? prepActions.addSticker(ctx, targetId, button.dataset.saSticker, point)
        : prepActions.addAsset(ctx, targetId, button.dataset.saAsset, point);
    button.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      drag = { x: event.clientX, y: event.clientY, id: event.pointerId, moved: false };
      button.setPointerCapture?.(event.pointerId);
    });
    button.addEventListener("pointermove", (event) => {
      if (!drag) return;
      if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) > 8) {
        drag.moved = true;
        button.classList.add("is-dragging");
        svg?.classList.add("is-drop-target");
      }
    });
    button.addEventListener("pointerup", (event) => {
      if (!drag) return;
      const moved = drag.moved;
      drag = null;
      button.classList.remove("is-dragging");
      svg?.classList.remove("is-drop-target");
      button.dataset.saPointer = "1";
      setTimeout(() => delete button.dataset.saPointer, 400);
      if (!moved) {
        add(null);
        return;
      }
      const rect = svg?.getBoundingClientRect();
      if (
        rect &&
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      )
        add(canvasPoint(svg, event));
    });
    button.addEventListener("pointercancel", () => {
      drag = null;
      button.classList.remove("is-dragging");
      svg?.classList.remove("is-drop-target");
    });
    // Keyboard (Enter/Space) arrives as a click without a pointer sequence.
    button.addEventListener("click", () => {
      if (button.dataset.saPointer) return;
      add(null);
    });
  });
  const stickerSearch = root.querySelector("[data-sa-sticker-search]");
  stickerSearch?.addEventListener("input", () => {
    ui.stickerQuery = stickerSearch.value;
    const at = stickerSearch.selectionStart;
    ctx.render();
    const next = globalThis.document?.querySelector("[data-sa-sticker-search]");
    next?.focus();
    next?.setSelectionRange?.(at, at);
  });
  const outlineSearch = root.querySelector("[data-sa-outline-search]");
  outlineSearch?.addEventListener("input", () => {
    ui.outlineQuery = outlineSearch.value;
    const at = outlineSearch.selectionStart;
    ctx.render();
    const next = globalThis.document?.querySelector(".sa-side [data-sa-outline-search]");
    next?.focus();
    next?.setSelectionRange?.(at, at);
  });
  root.querySelectorAll("[data-sa-select]").forEach((input) =>
    input.addEventListener("change", () => {
      if (input.checked) ui.selected.add(input.dataset.saSelect);
      else ui.selected.delete(input.dataset.saSelect);
      ctx.render();
    }),
  );
  root.querySelector("[data-sa-select-found]")?.addEventListener("click", () => {
    const text = ui.outlineQuery.trim().toLocaleLowerCase();
    const groups =
      box.kind === "scene"
        ? D.outline(ctx.state, targetId, "dm", ui.outlineQuery)
        : {
            foreground: box.props.filter((r) => !text || r.name.toLocaleLowerCase().includes(text)),
            map: [],
            offMap: [],
          };
    ui.selected = new Set([...groups.foreground, ...groups.map, ...groups.offMap].map((r) => r.id));
    ctx.render();
  });
  root.querySelector("[data-sa-select-none]")?.addEventListener("click", () => {
    ui.selected = new Set();
    ctx.render();
  });
  // PR-12: the scene list's kind filter, choices and bulk actions.
  root.querySelectorAll("[data-sa-kind]").forEach((button) =>
    button.addEventListener("click", () => {
      ui.outlineKind = button.dataset.saKind;
      ctx.render();
      globalThis.document?.querySelector(`[data-sa-kind="${button.dataset.saKind}"]`)?.focus();
    }),
  );
  root.querySelectorAll("[data-sa-pick]").forEach((input) =>
    input.addEventListener("change", () => {
      if (input.checked) ui.picked.add(input.dataset.saPick);
      else ui.picked.delete(input.dataset.saPick);
      ctx.render();
    }),
  );
  root.querySelector("[data-sa-pick-found]")?.addEventListener("click", () => {
    const rows = D.sceneElements(ctx.state, targetId, {
      query: ui.outlineQuery,
      kind: ui.outlineKind,
    });
    for (const r of rows)
      if (r.kind === "prop") ui.selected.add(r.id);
      else ui.picked.add(`${r.kind}:${r.id}`);
    ctx.render();
  });
  root.querySelector("[data-sa-pick-none]")?.addEventListener("click", () => {
    ui.selected = new Set();
    ui.picked = new Set();
    ctx.render();
  });
  root.querySelectorAll("[data-sa-bulk-act]").forEach((button) =>
    button.addEventListener("click", () => {
      const action = button.dataset.saBulkAct;
      const refs = pickedRefs(ctx, targetId).filter((r) => BULK_FITS[action].includes(r.kind));
      if (ui.host?.dirty && refs.some((r) => r.kind === "wall" || r.kind === "door")) {
        ctx.toast(
          ctx.t(
            "Salva prima le modifiche della scheda Modifica: muri e porte sono nella bozza.",
            "Save the Edit tab’s changes first: walls and doors are in the draft.",
          ),
          true,
        );
        return;
      }
      const done = run(
        ctx,
        `${ctx.t(...BULK_LABELS[action])}: ${refs.length} ${ctx.t("elementi", "elements")}`,
        (s) => D.bulkEditElements(s, ctx.role, targetId, refs, action),
      );
      if (done && action === "delete") {
        ui.selected = new Set();
        ui.picked = new Set();
      }
    }),
  );
  // Owlbear Outliner: choosing an item focuses it on the map.
  root.querySelectorAll("[data-sa-focus]").forEach((button) =>
    button.addEventListener("click", () => {
      const id = button.dataset.saFocus;
      ui.selected = new Set([id]);
      ctx.render();
      const node = globalThis.document?.querySelector(
        `[data-sa-canvas] [data-sa-prop="${CSS.escape(id)}"]`,
      );
      node?.classList.add("is-found");
      node?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
      globalThis.document?.querySelector("[data-sa-canvas]")?.focus({ preventScroll: true });
    }),
  );
  root
    .querySelectorAll("[data-sa-flag]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        prepActions.flag(ctx, targetId, button.dataset.saPropId, button.dataset.saFlag),
      ),
    );
  const bulk = root.querySelector("[data-sa-bulk]");
  bulk?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(bulk).entries());
    prepActions.bulk(ctx, targetId, [...ui.selected], data);
  });
  root
    .querySelector("[data-sa-delete-selected]")
    ?.addEventListener("click", () => prepActions.remove(ctx, targetId, [...ui.selected]));
  root
    .querySelector("[data-sa-make-prefab]")
    ?.addEventListener("click", () => openPrefabCreate(ctx, targetId));
  root.querySelectorAll("[data-sa-prefab-arm]").forEach((button) =>
    button.addEventListener("click", () => {
      const id = button.dataset.saPrefabArm;
      ui.placing = ui.placing?.prefab === id ? null : { prefab: id };
      ctx.render();
      globalThis.document?.querySelector("[data-sa-canvas]")?.focus({ preventScroll: true });
    }),
  );
  root.querySelectorAll("[data-sa-prefab-edit]").forEach((button) =>
    button.addEventListener("click", () => {
      ui.returnTo = box.kind === "scene" ? box.id : null;
      ctx.navigate("preparation", { id: "prefab:" + button.dataset.saPrefabEdit });
    }),
  );
  root
    .querySelectorAll("[data-sa-prefab-rename]")
    .forEach((button) =>
      button.addEventListener("click", () => openPrefabRename(ctx, button.dataset.saPrefabRename)),
    );
  root
    .querySelectorAll("[data-sa-prefab-delete]")
    .forEach((button) =>
      button.addEventListener("click", () => openPrefabDelete(ctx, button.dataset.saPrefabDelete)),
    );
  root
    .querySelectorAll("[data-sa-bring]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        run(
          ctx,
          ctx.t("Creatura entrata dalla zona fuori mappa", "Creature brought in from off the map"),
          (s) => D.bringIn(s, ctx.role, targetId, button.dataset.saBring),
        ),
      ),
    );
  root
    .querySelector("[data-sa-stage-new]")
    ?.addEventListener("click", () => openStage(ctx, targetId));
}

function bindLevels(root, ctx, box) {
  const sceneId = box.id;
  const found = stackOf(ctx.state, sceneId);
  const click = (selector, handler) =>
    root
      .querySelectorAll(selector)
      .forEach((node) => node.addEventListener("click", () => handler(node)));
  click("[data-sa-stack-new]", () => openStackNew(ctx, sceneId));
  click("[data-sa-stack-rename]", () => {
    if (!found) return;
    ctx.dialog(
      ctx.t("Rinomina edificio", "Rename building"),
      `<label class="field">${ctx.t("Nome", "Name")}<input name="name" required maxlength="80" value="${ctx.esc(found.stack.name)}"></label>`,
      {
        submitLabel: ctx.t("Rinomina", "Rename"),
        onSubmit: (data) => {
          commitOwn(ctx, ctx.t("Edificio rinominato", "Building renamed"), (s) =>
            renameStack(s, ctx.role, found.stack.id, data.get("name")),
          );
        },
      },
    );
  });
  click("[data-sa-floor-add]", () => openFloorAdd(ctx, sceneId));
  click("[data-sa-floor-edit]", (node) => openFloorEdit(ctx, sceneId, node.dataset.saFloorEdit));
  click("[data-sa-floor-remove]", (node) =>
    openFloorRemove(ctx, sceneId, node.dataset.saFloorRemove),
  );
  // Armed: the next tap on the map (or Enter on the canvas, which gets the focus) places it.
  const focusCanvas = () =>
    globalThis.document?.querySelector("[data-sa-canvas]")?.focus({ preventScroll: true });
  click("[data-sa-stair-add]", () => {
    ui.stairPick = ui.stairPick && !ui.stairPick.move ? null : { move: null };
    ctx.render();
    if (ui.stairPick) focusCanvas();
  });
  click("[data-sa-stair-move]", (node) => {
    ui.stairPick =
      ui.stairPick?.move === node.dataset.saStairMove ? null : { move: node.dataset.saStairMove };
    ctx.render();
    if (ui.stairPick) focusCanvas();
  });
  click("[data-sa-stair-edit]", (node) => openStairEdit(ctx, sceneId, node.dataset.saStairEdit));
  click("[data-sa-stair-remove]", (node) => {
    if (!found) return;
    run(ctx, ctx.t("Scala eliminata", "Stair deleted"), (s) =>
      removeStair(s, ctx.role, found.stack.id, node.dataset.saStairRemove),
    );
  });
}

function bindVariants(root, ctx, box) {
  const sceneId = box.id;
  const click = (selector, handler) =>
    root
      .querySelectorAll(selector)
      .forEach((node) => node.addEventListener("click", () => handler(node)));
  click("[data-sa-variant-use]", (node) => {
    const variant = D.variantsOf(ctx.state, sceneId).list.find(
      (v) => v.id === node.dataset.saVariantUse,
    );
    run(
      ctx,
      ctx.t(`Aspetto della scena: ${variant?.name ?? ""}`, `Scene look: ${variant?.name ?? ""}`),
      (s) => D.switchVariant(s, ctx.role, sceneId, node.dataset.saVariantUse),
    );
  });
  click("[data-sa-variant-rename]", (node) =>
    openVariantRename(ctx, sceneId, node.dataset.saVariantRename),
  );
  click("[data-sa-variant-delete]", (node) =>
    openVariantDelete(ctx, sceneId, node.dataset.saVariantDelete),
  );
  const form = root.querySelector("[data-sa-variant-form]");
  const error = root.querySelector("[data-sa-variant-error]");
  const show = (text) => {
    if (!error) return;
    error.textContent = text;
    error.hidden = !text;
  };
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const source = data.get("source");
    let look = null;
    try {
      if (source === "upload") {
        const file = form.querySelector("[data-sa-variant-file]")?.files?.[0];
        if (!file)
          throw Object.assign(new Error("file"), {
            it: "Scegli un file immagine.",
            en: "Choose an image file.",
          });
        const image = await readImageFile(file);
        look = {
          background: image.url,
          imageName: image.name,
          imageWidth: image.width,
          imageHeight: image.height,
        };
      } else if (source === "library") {
        const asset = visibleAssets(ctx.state, "dm").find((a) => a.id === data.get("asset"));
        if (!asset)
          throw Object.assign(new Error("asset"), {
            it: "L’immagine non è più disponibile.",
            en: "The image is no longer available.",
          });
        look = {
          background: asset.dataUrl,
          imageName: asset.fileName ?? asset.name,
          imageWidth: asset.width,
          imageHeight: asset.height,
          assetId: asset.id,
        };
      } else look = { background: null, template: data.get("template") };
    } catch (err) {
      show(errorText(ctx, err));
      return;
    }
    try {
      commitOwn(
        ctx,
        ctx.t(`Variante aggiunta: ${data.get("name")}`, `Variant added: ${data.get("name")}`),
        (s) => D.addVariant(s, ctx.role, sceneId, { name: data.get("name"), look }),
      );
    } catch (err) {
      show(errorText(ctx, err));
    }
  });
}

function bindGrid(root, ctx, box) {
  const sceneId = box.id;
  const click = (selector, handler) =>
    root
      .querySelectorAll(selector)
      .forEach((node) => node.addEventListener("click", () => handler(node)));
  const focusCanvas = () =>
    globalThis.document?.querySelector("[data-sa-canvas]")?.focus({ preventScroll: true });
  click("[data-sa-align-start]", () => {
    const scene = box.scene;
    ui.align = {
      step: 1,
      anchor: null,
      corner: null,
      size: scene.gridSize,
      offX: scene.gridOffsetX || 0,
      offY: scene.gridOffsetY || 0,
    };
    ctx.render();
    focusCanvas();
  });
  click("[data-sa-align-cancel]", () => {
    ui.align = null;
    if (ui.host?.back) ui.host.back();
    else ctx.render();
  });
  const next = () => {
    const a = ui.align;
    if (!a) return;
    if (a.step === 1 && a.anchor) {
      a.step = 2;
      a.corner = null;
    } else if (a.step === 2 && a.corner && a.size) a.step = 3;
    ctx.render();
    focusCanvas();
  };
  click("[data-sa-align-next]", next);
  click("[data-sa-next]", next);
  click("[data-sa-align-back]", () => {
    if (ui.align) ui.align.step = Math.max(1, ui.align.step - 1);
    ctx.render();
  });
  click("[data-sa-align-adjust]", (node) => {
    const [key, delta] = node.dataset.saAlignAdjust.split(":");
    const a = ui.align;
    if (!a) return;
    if (key === "size") a.size = Math.max(10, Math.min(300, a.size + Number(delta)));
    if (key === "x") a.offX += Number(delta);
    if (key === "y") a.offY += Number(delta);
    ctx.render();
  });
  click("[data-sa-align-apply]", () => {
    const a = ui.align;
    if (!a?.size) return;
    // In the scene editor the result goes into its draft, like «Calibra scala»: the DM
    // sees it in «Griglia e misure» and keeps it with «Salva preparazione».
    if (ui.host?.onAlign) {
      ui.align = null;
      ui.host.onAlign({ gridSize: a.size, offsetX: a.offX, offsetY: a.offY });
      return;
    }
    const done = run(ctx, ctx.t("Griglia allineata alla mappa", "Grid aligned to the map"), (s) =>
      D.applyGridAlignment(s, ctx.role, sceneId, {
        gridSize: a.size,
        offsetX: a.offX,
        offsetY: a.offY,
      }),
    );
    if (done) {
      ui.align = null;
      ctx.render();
      ctx.toast(
        ctx.t(
          "Griglia allineata. Annulla ultima modifica la riporta com’era.",
          "Grid aligned. Undo last change puts it back.",
        ),
      );
    }
  });
  click("[data-sa-default-clear]", () =>
    run(ctx, ctx.t("Vista iniziale rimossa", "Starting view removed"), (s) =>
      D.clearDefaultView(s, ctx.role, sceneId),
    ),
  );
  // Re-place the loupe and the Next button on the chosen points after a render.
  const a = ui.align;
  const svg = root.querySelector("[data-sa-canvas]");
  if (a && svg && svg.getScreenCTM?.()) {
    const at = a.step === 2 ? a.corner : a.step === 1 ? a.anchor : null;
    if (at) {
      showLoupe(
        root,
        svg,
        at,
        {
          pointerType:
            root.querySelector("[data-sa-loupe]")?.dataset.saTouch === "true" ? "touch" : "mouse",
        },
        { size: a.step === 2 ? null : a.size },
      );
      placeNext(root, svg, at);
    }
  }
}

export function bindPrep(root, ctx) {
  if (ctx.role !== "dm") return;
  root
    .querySelectorAll("[data-sa-undo]")
    .forEach((node) => node.addEventListener("click", () => ctx.undo()));
  root
    .querySelectorAll("[data-sa-core-edit]")
    .forEach((node) =>
      node.addEventListener("click", () =>
        ctx.navigate("preparation", { id: node.dataset.saCoreEdit, tab: "edit" }),
      ),
    );
  root
    .querySelectorAll("[data-sa-open-scene]")
    .forEach((node) =>
      node.addEventListener("click", () =>
        ctx.navigate("preparation", { id: node.dataset.saOpenScene, tab: "objects" }),
      ),
    );
  if (menuRoute(ctx.view.id)) {
    bindMenu(root, ctx);
    return;
  }
  const box = boxFor(ctx, ctx.view.id);
  root.querySelectorAll("[data-sa-back]").forEach((node) =>
    node.addEventListener("click", () => {
      ui.align = null;
      const back = ui.returnTo;
      ui.returnTo = null;
      ctx.navigate("preparation", back ? { id: back, tab: "objects" } : {});
    }),
  );
  if (!box) return;
  root.querySelectorAll("[data-sa-tab]").forEach((node) =>
    node.addEventListener("click", () => {
      ui.tab = node.dataset.saTab;
      ui.placing = null;
      ui.stairPick = null;
      if (ui.tab !== "grid") ui.align = null;
      ctx.render();
      globalThis.document?.querySelector(`[data-sa-tab="${ui.tab}"]`)?.focus();
    }),
  );
  root.querySelectorAll("[data-sa-tab]").forEach((node, i, all) =>
    node.addEventListener("keydown", (event) => {
      const dir = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (!dir) return;
      event.preventDefault();
      all[(i + dir + all.length) % all.length].click();
    }),
  );
  bindCanvas(root, ctx, box);
  if (ui.tab === "objects") bindObjects(root, ctx, box);
  if (ui.tab === "levels" && box.kind === "scene") bindLevels(root, ctx, box);
  if (ui.tab === "variants" && box.kind === "scene") bindVariants(root, ctx, box);
  if (ui.tab === "grid" && box.kind === "scene") bindGrid(root, ctx, box);
}
export { openUVTT as openUVTTDialog };
export const STICKER_COUNT = STICKERS.length;
