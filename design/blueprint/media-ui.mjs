// Shared UI pieces of the media area (B28): image sources, thumbnails, notices, reading a
// local file, the import wheel, the file picker, the viewer and the crop and missing-image
// dialogs. Used by media.mjs (Library, sheet, campaign) and media-table.mjs (Table).

import * as media from "./media-domain.mjs";
import { formTokenName } from "./forms-companions.mjs";
// The token border is the token menu's border colour (B12, DDB-117): read, never written.
import { RING_COLOURS, setRing } from "./token-menu.mjs";

// ---------------------------------------------------------------- state of the views

// Transient view state for this identity. Reset on role change and example reset.
// `draft` keeps what was typed in a file-page form whose command was refused, so the page
// shows it again (with the field to correct focused) instead of an empty form.
export const ui = {
  library: { scope: "mine", folderId: "", use: "", query: "", layout: "grid" },
  dock: { use: "", query: "" },
  notice: null,
  draft: null,
};
export function resetUI() {
  ui.library = { scope: "mine", folderId: "", use: "", query: "", layout: "grid" };
  ui.dock = { use: "", query: "" };
  ui.notice = null;
  ui.draft = null;
}
/**
 * Notice shown inline where the action happened (library, dock, asset page, look). An
 * Undo notice names the commit it reverts (`commitId`): it offers Undo only while that
 * commit is the latest one (see noticeAfterCommit).
 */
export function setNotice(
  where,
  text,
  { error = false, undo = false, commitId = "", unlock = false } = {},
) {
  ui.notice = { where, text, error, undo: Boolean(undo && commitId), commitId, unlock };
}
/**
 * Registry "commit" handler: a later change makes the notice's Undo name the wrong change,
 * so the button goes; a correction (any Undo) may have restored what the notice reports,
 * so the notice goes.
 */
export function noticeAfterCommit(payload) {
  const notice = ui.notice;
  if (!notice?.commitId || payload?.id === notice.commitId) return;
  if (payload?.correction) ui.notice = null;
  else ui.notice = { ...notice, undo: false };
}
/** The id of the latest committed change (the log entry the store just appended). */
export const lastCommitId = (ctx) => ctx.state.log?.at(-1)?.id ?? "";
export function renderNotice(ctx, where) {
  const notice = ui.notice;
  if (!notice || notice.where !== where) return "";
  return `<div class="media-notice ${notice.error ? "is-error" : ""}" role="${notice.error ? "alert" : "status"}"><span>${ctx.esc(ctx.label(notice.text))}</span>${notice.undo ? `<button type="button" class="button quiet" data-media-undo>${ctx.icon("undo")} ${ctx.t("Annulla", "Undo")}</button>` : ""}${notice.unlock && lockedUse(ctx) ? `<button type="button" class="button quiet" data-media-notice-unlock>${ctx.t("Sblocca il tipo", "Unlock the type")}</button>` : ""}<button type="button" class="icon-button" data-media-dismiss aria-label="${ctx.t("Chiudi l’avviso", "Dismiss the notice")}">${ctx.icon("close")}</button></div>`;
}
export function bindNotice(root, ctx) {
  root
    .querySelector("[data-media-notice-unlock]")
    ?.addEventListener("click", () => unlockImport(ctx));
  root.querySelector("[data-media-dismiss]")?.addEventListener("click", () => {
    ui.notice = null;
    ctx.render();
  });
  root.querySelector("[data-media-undo]")?.addEventListener("click", () => {
    const notice = ui.notice;
    ui.notice = null;
    // Undo reverts the latest change only: never a later one than the notice names.
    if (!notice?.undo || lastCommitId(ctx) !== notice.commitId) {
      ctx.toast(
        ctx.t(
          "Nel frattempo c’è stata un’altra modifica: questo avviso non può più annullare.",
          "Another change happened since: this notice can no longer undo.",
        ),
        true,
      );
      ctx.render();
      return;
    }
    ctx.undo();
  });
}
export const errorText = (error) =>
  error?.it
    ? { it: error.it, en: error.en }
    : { it: String(error?.message ?? error), en: String(error?.message ?? error) };
export function refuse(ctx, error) {
  ctx.toast(ctx.label(errorText(error)), true);
}
/** ctx.commit with the refusal shown as a toast; true when applied. */
export function attempt(ctx, label, mutator, options = {}) {
  try {
    ctx.commit(label, mutator, options);
    return true;
  } catch (error) {
    refuse(ctx, error);
    return false;
  }
}
/**
 * Commit options for a change to an actor's look: a private sheet changes locally; a
 * creature hidden from players keeps its name out of the shared log (DEVELOPMENT: shared
 * audit labels never reveal a hidden source).
 */
export const actorOptions = (ctx, actorId) =>
  media.isPrivateActor(ctx.state.actors[actorId])
    ? { local: true }
    : media.hiddenCreature(ctx.state, actorId)
      ? { visibility: "private" }
      : {};
/** A map change on a scene players have not been shown keeps its log line private. */
export const sceneOptions = (ctx, sceneId) =>
  ctx.state.scenes?.find((scene) => scene.id === sceneId)?.revealed
    ? {}
    : { visibility: "private" };
export const assetOptions = (ctx, assetId) =>
  media.assetIsShared(ctx.state, assetId) ? {} : { local: true };

// ---------------------------------------------------------------- sources and thumbnails

// Object URLs keep large data URLs out of the rendered markup. Keyed by identity, revision
// and a tail sample of the data, so a replaced or restored file never shows a stale image.
const objectUrls = new Map();
export function src(asset) {
  if (!asset?.dataUrl || !media.isDataUrl(asset.dataUrl)) return "";
  const key = `${asset.id}:${asset.revision}:${asset.dataUrl.length}:${asset.dataUrl.slice(-24)}`;
  if (objectUrls.has(key)) return objectUrls.get(key);
  let url = asset.dataUrl;
  try {
    if (typeof URL.createObjectURL === "function" && typeof atob === "function") {
      const binary = atob(asset.dataUrl.slice(asset.dataUrl.indexOf(",") + 1));
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      url = URL.createObjectURL(new Blob([bytes], { type: asset.mime }));
    }
  } catch {
    url = asset.dataUrl;
  }
  objectUrls.set(key, url);
  if (objectUrls.size > 80) {
    const [oldKey, oldUrl] = objectUrls.entries().next().value;
    objectUrls.delete(oldKey);
    if (oldUrl.startsWith("blob:")) URL.revokeObjectURL(oldUrl);
  }
  return url;
}
export function thumb(ctx, asset, className = "media-thumb") {
  if (!asset) return `<span class="${className} is-missing" aria-hidden="true">!</span>`;
  return asset.kind === "pdf"
    ? `<span class="${className} is-pdf" aria-hidden="true">PDF</span>`
    : `<img class="${className}" src="${ctx.esc(src(asset))}" alt="" loading="lazy" draggable="false">`;
}
/** A round, crop-aware preview as an HTML element (token variants, initiative). */
export function roundThumb(ctx, asset, crop, className = "media-round") {
  if (!asset) return `<span class="${className} is-missing" aria-hidden="true">!</span>`;
  const bg = media.cropBackground(asset, crop);
  return `<span class="${className}" aria-hidden="true" style="background-image:url(&quot;${ctx.esc(src(asset))}&quot;);background-size:${bg.size};background-position:${bg.position}"></span>`;
}
export const useLabel = (ctx, use) => ctx.label(media.USE_LABELS[use] ?? media.USE_LABELS.prop);
export function ownerText(ctx, asset) {
  if (asset.owner === ctx.role)
    return asset.shared ? ctx.t("Tuo · condiviso", "Yours · shared") : ctx.t("Tuo", "Yours");
  return asset.owner === "dm"
    ? ctx.t("Condiviso dal DM", "Shared by the DM")
    : ctx.t("Condiviso da un giocatore", "Shared by a player");
}
export function sizeText(ctx, asset) {
  const parts = [];
  if (asset.kind === "image") parts.push(`${asset.width} × ${asset.height} px`);
  else if (asset.pages) parts.push(ctx.t(`${asset.pages} pagine`, `${asset.pages} pages`));
  parts.push(media.formatBytes(ctx.lang, asset.bytes));
  return parts.join(" · ");
}
/** The source label for this viewer: the uploader reads "Made by me", others a neutral one. */
export function sourceLabel(ctx, asset) {
  const source = asset?.provenance?.source;
  if (!media.SOURCES[source]) return "";
  return ctx.label(
    source === "own" && asset.owner === ctx.role ? media.OWN_SOURCE_SELF : media.SOURCES[source],
  );
}
export function creditText(ctx, asset) {
  const p = asset.provenance;
  if (!p) return "";
  return `${sourceLabel(ctx, asset)} · ${p.author} · ${p.license}`;
}
/**
 * The border colour of an actor's token on the active scene, as the token menu (B12)
 * stores it per token: {id, color, label}, or null for the standard border.
 */
export function tokenRing(state, actorId) {
  const scene = state.scenes?.find((row) => row.id === state.activeSceneId);
  const token = scene?.tokens?.find((row) => row.actorId === actorId);
  const id = token && state.ext?.["token-menu"]?.tokens?.[token.id]?.ring;
  const row = RING_COLOURS.find(([value]) => value === id);
  return row ? { id: row[0], color: row[1], label: row[2] } : null;
}
let serial = 0;
/** Token preview as SVG: the same pattern geometry the Table uses, with its border colour. */
export function tokenSvg(ctx, art, name, size = 104, ringColor = null) {
  const id = "media-preview-" + (serial += 1);
  const ring = ringColor || "#c5b78d";
  const letter = ctx.esc(String(name || "?").slice(0, 1));
  let fill = "#40566a";
  let defs = "";
  if (art?.asset) {
    const g = media.cropGeometry(art.asset, art.crop);
    defs = `<defs><pattern id="${id}" patternContentUnits="objectBoundingBox" width="1" height="1"><image href="${ctx.esc(src(art.asset))}" x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" preserveAspectRatio="none"/></pattern></defs>`;
    fill = `url(#${id})`;
  }
  const missing = art?.missing;
  return `<svg class="media-token-svg" viewBox="-32 -32 64 64" width="${size}" height="${size}" role="img" aria-label="${ctx.esc(missing ? ctx.t(`Pedina di ${name}: immagine mancante`, `${name}’s token: missing image`) : ctx.t(`Anteprima della pedina di ${name}`, `Preview of ${name}’s token`))}">${defs}<circle r="27" fill="${missing ? "#3b2626" : fill}" stroke="${missing ? "#f1a09a" : ring}" stroke-width="3" ${missing ? 'stroke-dasharray="5 4"' : ""}/>${art?.asset ? "" : `<text y="8" text-anchor="middle" font-size="22" fill="#f4e5c6" font-family="Georgia, serif">${missing ? "!" : letter}</text>`}</svg>`;
}

// ---------------------------------------------------------------- reading local files

function decodeImage(url, name) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () =>
      reject(
        media.refusal(
          `«${name}» non si apre come immagine: il file potrebbe essere danneggiato.`,
          `“${name}” cannot be opened as an image: the file may be damaged.`,
          "decode",
        ),
      );
    image.src = url;
  });
}
/** Reads and validates one local file (type, size, first bytes, dimensions). */
export async function readLocalFile(file) {
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const { mime, kind } = media.checkFile({
    name: file.name,
    type: file.type,
    size: file.size,
    head,
  });
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const dataUrl = `data:${mime};base64,${btoa(binary)}`;
  let width = 0;
  let height = 0;
  let pages = null;
  if (kind === "image") {
    ({ width, height } = await decodeImage(dataUrl, file.name));
    media.checkDimensions(file.name, width, height);
  } else pages = media.countPdfPages(binary);
  return {
    name: file.name.replace(/\.[^.]+$/, "").slice(0, media.LIMITS.name),
    fileName: file.name,
    mime,
    kind,
    width,
    height,
    pages,
    dataUrl,
  };
}

// ---------------------------------------------------------------- import wheel

const WHEEL = ["map", "token", "portrait", "prop"];
let registryRef = null;
export function useRegistry(registry) {
  registryRef = registry;
}
export function lockedUse(ctx) {
  const value = registryRef?.getSetting(ctx, "media.import-lock");
  return WHEEL.includes(value) ? value : null;
}
/** Saves the device's import lock ("ask" unlocks); the setting renders. False if refused. */
function lockUse(ctx, value) {
  try {
    registryRef?.setSetting(ctx, "media.import-lock", value);
    return true;
  } catch {
    /* a device setting that cannot be saved only loses the shortcut */
    return false;
  }
}
/**
 * The locked import type, shown wherever files arrive (library, dock, picker) so that a
 * Shift+click in the wheel is never a silent, lasting change: it names the type and
 * offers to unlock (the wheel then asks again). Empty when nothing is locked.
 */
export function lockChip(ctx) {
  const use = lockedUse(ctx);
  if (!use) return "";
  const name = media.USE_LABELS[use];
  return `<p class="media-lock" data-media-lock><span>${ctx.esc(ctx.t(`Tipo bloccato: ${name.it}`, `Type locked: ${name.en}`))} <small>${ctx.t("i nuovi file non chiedono che cosa sono", "new files skip the “what is it” question")}</small></span><button type="button" class="button quiet" data-media-unlock>${ctx.t("Sblocca", "Unlock")}</button></p>`;
}
/** Unlocks the import type: the next file asks what it is in the wheel again. */
export function unlockImport(ctx) {
  if (ui.notice?.unlock) ui.notice = { ...ui.notice, unlock: false };
  if (!lockUse(ctx, "ask")) {
    ctx.toast(
      ctx.t("Questo dispositivo non può salvare la scelta.", "This device cannot save the choice."),
      true,
    );
    return false;
  }
  // A dialog is not re-rendered with the page: drop its chip by hand.
  globalThis.document?.querySelectorAll?.("[data-media-lock]").forEach((chip) => chip.remove());
  ctx.toast(
    ctx.t(
      "Tipo sbloccato: ogni nuovo file chiederà che cos’è.",
      "Type unlocked: every new file will ask what it is.",
    ),
  );
  refocus("[data-media-picker-upload]", "[data-media-upload]", "[data-media-dock-upload]");
  return true;
}
/** The lock chip's Unlock button under root (one chip per page part or dialog). */
export function bindLock(root, ctx) {
  root.querySelector("[data-media-unlock]")?.addEventListener("click", () => unlockImport(ctx));
}
/**
 * Puts keyboard focus back after a re-render replaced the focused control: the first
 * selector that matches (the same control by its data attribute, then a fallback).
 */
export function refocus(...selectors) {
  const doc = globalThis.document;
  if (!doc?.querySelector) return;
  for (const selector of selectors) {
    const el = selector && doc.querySelector(selector);
    if (el) {
      el.focus();
      return;
    }
  }
}
/** An attribute selector for a data value (ids from state; quotes and backslashes escaped). */
export const byData = (name, value) =>
  `[data-${name}="${String(value).replace(/["\\]/g, "\\$&")}"]`;
/**
 * The Owlbear import wheel (VTL-062): after a file is read, choose what it is. Shift+click
 * (or the checkbox) locks the choice for later files. Resolves the use or null.
 */
export function chooseUse(ctx, prepared) {
  return new Promise((resolve) => {
    let done = false;
    let dialog = null;
    // A close event queued by an earlier dialog finds this one open and is ignored.
    const onClose = () => {
      if (!dialog.open) finish(null);
    };
    const finish = (value) => {
      if (done) return;
      done = true;
      dialog?.removeEventListener("close", onClose);
      resolve(value);
    };
    const preview =
      prepared.kind === "image"
        ? `<img class="media-wheel-preview" src="${ctx.esc(prepared.dataUrl)}" alt="">`
        : `<span class="media-wheel-preview is-pdf">PDF</span>`;
    ctx.dialog(
      ctx.t(`Che cos’è «${prepared.fileName}»?`, `What is “${prepared.fileName}”?`),
      `<div class="media-wheel-wrap"><p class="muted">${ctx.esc(`${prepared.width} × ${prepared.height} px · ${media.formatBytes(ctx.lang, media.dataBytes(prepared.dataUrl))}`)}</p><div class="media-wheel" role="group" aria-label="${ctx.t("Tipo del file", "File type")}">${preview}${WHEEL.map(
        (use, i) =>
          `<button type="button" class="media-wheel-option" style="--slot:${i}" data-media-wheel="${use}">${ctx.esc(useLabel(ctx, use))}</button>`,
      ).join(
        "",
      )}</div><label class="media-check"><input type="checkbox" data-media-wheel-lock> ${ctx.t("Usa questa scelta anche per i prossimi file (o tieni premuto Maiusc mentre scegli)", "Use this choice for the next files too (or hold Shift while choosing)")}</label><p class="muted">${ctx.t("Puoi cambiare il tipo dopo, nei dettagli del file.", "You can change the type later in the file details.")}</p></div>`,
      { cancelLabel: ctx.t("Non importare", "Don’t import") },
    );
    dialog = document.querySelector("#dialog");
    dialog.addEventListener("close", onClose);
    dialog.querySelectorAll("[data-media-wheel]").forEach((button) =>
      button.addEventListener("click", (event) => {
        const value = button.dataset.mediaWheel;
        if (event.shiftKey || dialog.querySelector("[data-media-wheel-lock]")?.checked)
          lockUse(ctx, value);
        finish(value);
        ctx.closeDialog();
      }),
    );
    dialog.querySelector("[data-media-wheel]")?.focus();
  });
}
/**
 * Imports local files into the viewer's library: read and validate, choose the type
 * (unless given or locked), then one local commit per file. Reports in the notice of
 * `where`, naming a locked type with a way to unlock it. `lock: false` asks the wheel even
 * when a type is locked (a file dropped on a token). Returns [{id, use}].
 */
export async function importFiles(
  ctx,
  files,
  { use = null, folderId = "", where = "library", lock = true } = {},
) {
  const imported = [];
  for (const file of [...files]) {
    let prepared;
    try {
      prepared = await readLocalFile(file);
      // A file that cannot fit is refused before the wheel asks what it is.
      media.checkRoom(ctx.state, ctx.role, media.dataBytes(prepared.dataUrl));
    } catch (error) {
      setNotice(where, errorText(error), { error: true });
      ctx.render();
      continue;
    }
    const chosen =
      prepared.kind === "pdf"
        ? "document"
        : (use ?? (lock ? lockedUse(ctx) : null) ?? (await chooseUse(ctx, prepared)));
    if (!chosen) continue;
    // The type came from the lock (set before, or by Shift+click in this very wheel).
    const locked = !use && prepared.kind !== "pdf" && lockedUse(ctx) === chosen;
    const folder =
      folderId && !media.SYSTEM_FOLDERS.some((row) => row.id === folderId) ? folderId : "";
    let id = null;
    let result;
    try {
      result = ctx.commit(
        ctx.t(`File caricato: «${prepared.fileName}»`, `File uploaded: “${prepared.fileName}”`),
        (draft) => {
          id = media.addAsset(draft, ctx.role, { ...prepared, use: chosen, folderId: folder });
        },
        { local: true },
      );
    } catch (error) {
      setNotice(where, errorText(error), { error: true });
      ctx.render();
      continue;
    }
    if (result?.persisted === false && ctx.storageError === "write") {
      // This file did not fit in the browser's storage: take it back out, so every other
      // change keeps being saved, and say so instead of reporting success.
      ctx.undo();
      setNotice(
        where,
        {
          it: `«${prepared.fileName}» non è stato aggiunto: la memoria di questo browser è piena. Elimina qualche file e riprova.`,
          en: `“${prepared.fileName}” was not added: this browser’s storage is full. Delete some files and try again.`,
        },
        { error: true },
      );
      ctx.render();
      continue;
    }
    if (result?.persisted === false) {
      // Local saving was already unavailable (the shell says so): keep the file in this tab.
      imported.push({ id, use: chosen });
      setNotice(
        where,
        {
          it: `«${prepared.fileName}» aggiunto solo in questa scheda: il salvataggio locale non è disponibile e il file sparirà alla chiusura.`,
          en: `“${prepared.fileName}” added in this tab only: local saving is unavailable and the file will be gone when the tab closes.`,
        },
        { error: true },
      );
      ctx.render();
      continue;
    }
    imported.push({ id, use: chosen });
    const folderLabel = folder
      ? media.folderName(
          media.foldersFor(ctx.state, ctx.role).find((row) => row.id === folder),
          ctx.lang,
        )
      : ctx.label(media.SYSTEM_FOLDERS.find((row) => row.use === chosen).name);
    const name = media.USE_LABELS[chosen];
    setNotice(
      where,
      {
        it: `«${prepared.fileName}» aggiunto a ${folderLabel} · ${media.formatBytes("it", media.dataBytes(prepared.dataUrl))}${locked ? ` · tipo bloccato: ${name.it}, i prossimi file non chiederanno che cosa sono` : ""}`,
        en: `“${prepared.fileName}” added to ${folderLabel} · ${media.formatBytes("en", media.dataBytes(prepared.dataUrl))}${locked ? ` · type locked: ${name.en}, the next files will not ask what they are` : ""}`,
      },
      { unlock: locked },
    );
    ctx.render();
  }
  return imported;
}
/**
 * The files chosen in a file input, clearing the input so that choosing the same file
 * again (after cancelling the wheel or a refusal) fires a new change event.
 */
export function takeFiles(event) {
  const files = [...(event.target.files ?? [])];
  try {
    event.target.value = "";
  } catch {
    /* a detached or read-only input keeps its value */
  }
  return files;
}
export const ACCEPT = ".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf";
export const ACCEPT_IMAGES = ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp";

// ---------------------------------------------------------------- picker (Foundry File Picker)

function pickerCards(ctx, assets, selected) {
  return assets
    .map(
      (asset) =>
        `<label class="media-pick" data-search="${ctx.esc([asset.name, asset.fileName, ...asset.tags].join(" ").toLocaleLowerCase())}" data-folder="${ctx.esc(asset.owner === ctx.role ? asset.folderId : "shared")}" data-own="${asset.owner === ctx.role}" data-shared="${asset.shared}"><input type="radio" name="media-asset" value="${ctx.esc(asset.id)}" ${asset.id === selected ? "checked" : ""}>${thumb(ctx, asset)}<span class="media-pick-name">${ctx.esc(asset.name)}</span><small>${ctx.esc(useLabel(ctx, asset.use))} · ${ctx.esc(ownerText(ctx, asset))}</small></label>`,
    )
    .join("");
}
/**
 * Picker body: search, folder filter, upload, a radio grid of usable files. An upload with
 * no fixed `use` follows the import lock, so the lock is shown there.
 */
export function pickerBody(
  ctx,
  { kind = "image", selected = "", accept = ACCEPT_IMAGES, use = null } = {},
) {
  const assets = media
    .visibleAssets(ctx.state, ctx.role)
    .filter((asset) => !kind || asset.kind === kind);
  const folders = media.foldersFor(ctx.state, ctx.role);
  return `<div class="media-picker" data-media-picker>${use || kind === "pdf" ? "" : lockChip(ctx)}<div class="media-picker-bar"><label class="media-grow"><span class="media-sr">${ctx.t("Cerca", "Search")}</span><input type="search" data-media-picker-search placeholder="${ctx.t("Cerca per nome o tag", "Search by name or tag")}" aria-label="${ctx.t("Cerca per nome o tag", "Search by name or tag")}"></label><label class="media-inline-field">${ctx.t("Cartella", "Folder")} <select data-media-picker-folder><option value="">${ctx.t("Tutte", "All")}</option>${folders.map((folder) => `<option value="${ctx.esc(folder.id)}">${ctx.esc(media.folderName(folder, ctx.lang))}</option>`).join("")}<option value="shared">${ctx.t("Condivisi da altri", "Shared by others")}</option></select></label><label class="button media-file-button">${ctx.icon("plus")} ${ctx.t("Carica dal dispositivo", "Upload from device")}<input type="file" accept="${accept}" data-media-picker-upload></label></div><div class="media-picker-grid" role="radiogroup" aria-label="${ctx.t("File disponibili", "Available files")}">${pickerCards(ctx, assets, selected) || ""}</div><p class="muted" data-media-picker-empty ${assets.length ? "hidden" : ""}>${ctx.t("Nessun file corrisponde. Caricane uno dal dispositivo.", "No file matches. Upload one from your device.")}</p></div>`;
}
export function bindPicker(ctx, dialog, { onUpload }) {
  const cards = [...dialog.querySelectorAll(".media-pick")];
  const search = dialog.querySelector("[data-media-picker-search]");
  const folder = dialog.querySelector("[data-media-picker-folder]");
  const filter = () => {
    const text = search.value.trim().toLocaleLowerCase();
    let shown = 0;
    for (const card of cards) {
      const visible =
        (!text || card.dataset.search.includes(text)) &&
        (!folder.value || card.dataset.folder === folder.value);
      card.hidden = !visible;
      if (visible) shown += 1;
    }
    dialog.querySelector("[data-media-picker-empty]").hidden = shown > 0;
  };
  search?.addEventListener("input", filter);
  folder?.addEventListener("change", filter);
  bindLock(dialog, ctx);
  dialog.querySelector("[data-media-picker-upload]")?.addEventListener("change", (event) => {
    const files = takeFiles(event);
    if (files.length) onUpload(files);
  });
}
/**
 * Opens the file picker (FVT-185) for an editor: choose an existing file or upload a new
 * one, which is then preselected. `onPick(assetId, formData)` may commit; a thrown
 * refusal keeps the picker open with the message.
 */
export function openPicker(ctx, options) {
  const {
    title,
    submitLabel,
    kind = "image",
    use = null,
    selected = "",
    extra = "",
    onPick,
  } = options;
  ctx.dialog(
    title,
    pickerBody(ctx, {
      kind,
      selected,
      use,
      accept: kind === "pdf" ? ".pdf,application/pdf" : kind ? ACCEPT_IMAGES : ACCEPT,
    }) + extra,
    {
      submitLabel: submitLabel || ctx.t("Usa questo file", "Use this file"),
      onSubmit: (form) => {
        const id = form.get("media-asset");
        if (!id)
          throw media.refusal(
            "Scegli un file dall’elenco o caricane uno.",
            "Choose a file from the list or upload one.",
          );
        return onPick(id, form);
      },
    },
  );
  const dialog = document.querySelector("#dialog");
  dialog.querySelector(".media-pick input:checked")?.focus();
  bindPicker(ctx, dialog, {
    onUpload: async (files) => {
      ctx.closeDialog();
      const [first] = await importFiles(ctx, files, { use, where: "picker" });
      if (ui.notice?.where === "picker" && ui.notice.error) {
        ctx.toast(ctx.label(ui.notice.text), true);
        ui.notice = null;
      } else if (ui.notice?.where === "picker") {
        ctx.toast(ctx.label(ui.notice.text));
        ui.notice = null;
      }
      openPicker(ctx, { ...options, selected: first?.id ?? selected });
    },
  });
}

// ---------------------------------------------------------------- viewer

/** Opens a file: an image preview or an on-demand embedded PDF, with its credits. */
export function openViewer(ctx, asset, { page = 1 } = {}) {
  const credit = creditText(ctx, asset);
  const body =
    asset.kind === "image"
      ? `<figure class="media-viewer"><img src="${ctx.esc(src(asset))}" alt="${ctx.esc(asset.name)}"><figcaption>${ctx.esc(sizeText(ctx, asset))}${credit ? `<br><span class="muted">${ctx.t("Crediti", "Credits")}: ${ctx.esc(credit)}</span>` : ""}</figcaption></figure>`
      : `${pdfFrame(ctx, asset, page)}${credit ? `<p class="muted">${ctx.t("Crediti", "Credits")}: ${ctx.esc(credit)}</p>` : ""}`;
  ctx.dialog(asset.name, body, { cancelLabel: ctx.t("Chiudi", "Close") });
  bindPdfFrame(document.querySelector("#dialog"), asset);
}
/** Embedded PDF, loaded only on request (the browser's own PDF viewer shows it). */
export function pdfFrame(ctx, asset, page = 1) {
  return `<div class="media-pdf" data-media-pdf><div class="toolbar"><button type="button" class="button" data-media-pdf-open>${ctx.t("Mostra il PDF qui", "Show the PDF here")}</button><label class="media-inline-field">${ctx.t("Pagina", "Page")} <input type="number" min="1" ${asset.pages ? `max="${asset.pages}"` : ""} value="${page}" data-media-pdf-page></label><button type="button" class="button quiet" data-media-pdf-tab>${ctx.t("Apri in una nuova scheda", "Open in a new tab")}</button></div><p class="muted">${ctx.esc(sizeText(ctx, asset))} · ${ctx.t("il PDF resta in questo browser", "the PDF stays in this browser")}</p><iframe class="media-pdf-frame" title="${ctx.esc(asset.name)}" hidden></iframe></div>`;
}
export function bindPdfFrame(root, asset) {
  const box = root?.querySelector("[data-media-pdf]");
  if (!box) return;
  const frame = box.querySelector("iframe");
  const pageInput = box.querySelector("[data-media-pdf-page]");
  const show = () => {
    frame.hidden = false;
    frame.src = src(asset) + "#page=" + Math.max(1, Number(pageInput.value) || 1);
  };
  box.querySelector("[data-media-pdf-open]").addEventListener("click", show);
  pageInput.addEventListener("change", () => {
    if (!frame.hidden) show();
  });
  box
    .querySelector("[data-media-pdf-tab]")
    .addEventListener("click", () =>
      window.open(
        src(asset) + "#page=" + Math.max(1, Number(pageInput.value) || 1),
        "_blank",
        "noopener",
      ),
    );
}

// ---------------------------------------------------------------- crop (Tokenizer)

/** Circular crop editor for the image shown on a token: drag, arrows, sliders, zoom. */
export function openCrop(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  const art = media.tokenArt(ctx.state, actorId);
  if (!actor || !art?.asset) return;
  const target = art.source === "variant" ? art.variantId : "portrait";
  const crop = { ...art.crop };
  const g = media.cropGeometry(art.asset, crop);
  const url = ctx.esc(src(art.asset));
  const image = (cls) =>
    `<image class="${cls}" href="${url}" x="${g.x * 100}" y="${g.y * 100}" width="${g.w * 100}" height="${g.h * 100}" preserveAspectRatio="none"/>`;
  ctx.dialog(
    ctx.t(`Ritaglio della pedina di ${actor.name}`, `Crop ${actor.name}’s token`),
    `<div class="media-crop"><svg class="media-crop-stage" viewBox="0 0 100 100" tabindex="0" role="application" aria-label="${ctx.t("Ritaglio circolare. Trascina o usa le frecce per spostare l’immagine, + e − per lo zoom.", "Circular crop. Drag or use the arrow keys to move the image, + and − to zoom.")}" data-media-crop-stage><defs><clipPath id="media-crop-circle"><circle cx="50" cy="50" r="50"/></clipPath></defs>${image("media-crop-faint")}<g clip-path="url(#media-crop-circle)">${image("media-crop-clear")}</g><circle cx="50" cy="50" r="49" fill="none" stroke="${tokenRing(ctx.state, actorId)?.color ?? "#f7d894"}" stroke-width="2"/></svg><div class="media-crop-controls"><label class="field">${ctx.t("Zoom", "Zoom")}<input type="range" name="zoom" min="1" max="4" step="0.05" value="${crop.zoom}" data-media-crop="zoom"></label><label class="field">${ctx.t("Orizzontale", "Horizontal")}<input type="range" name="x" min="0" max="1" step="0.01" value="${crop.x}" data-media-crop="x"></label><label class="field">${ctx.t("Verticale", "Vertical")}<input type="range" name="y" min="0" max="1" step="0.01" value="${crop.y}" data-media-crop="y"></label><button type="button" class="button quiet" data-media-crop-center>${ctx.t("Centra", "Centre")}</button><p class="muted">${ctx.t("Lo stesso ritaglio compare sulla pedina al Tavolo e nell’ordine dei turni.", "The same crop appears on the Table token and in the turn order.")}</p></div></div>`,
    {
      submitLabel: ctx.t("Applica il ritaglio", "Apply crop"),
      onSubmit: () => {
        ctx.commit(
          ctx.t(`Ritaglio della pedina di ${actor.name}`, `${actor.name}’s token crop`),
          (draft) => media.setTokenCrop(draft, ctx.role, actorId, target, { ...crop }),
          actorOptions(ctx, actorId),
        );
      },
    },
  );
  const dialog = document.querySelector("#dialog");
  const stage = dialog.querySelector("[data-media-crop-stage]");
  const inputs = Object.fromEntries(
    [...dialog.querySelectorAll("[data-media-crop]")].map((input) => [
      input.dataset.mediaCrop,
      input,
    ]),
  );
  const draw = () => {
    const box = media.cropGeometry(art.asset, crop);
    for (const el of stage.querySelectorAll("image")) {
      el.setAttribute("x", box.x * 100);
      el.setAttribute("y", box.y * 100);
      el.setAttribute("width", box.w * 100);
      el.setAttribute("height", box.h * 100);
    }
    for (const key of ["zoom", "x", "y"]) inputs[key].value = crop[key];
  };
  const set = (changes) => {
    crop.zoom = Math.min(4, Math.max(1, changes.zoom ?? crop.zoom));
    crop.x = Math.min(1, Math.max(0, changes.x ?? crop.x));
    crop.y = Math.min(1, Math.max(0, changes.y ?? crop.y));
    draw();
  };
  for (const [key, input] of Object.entries(inputs))
    input.addEventListener("input", () => set({ [key]: Number(input.value) }));
  dialog
    .querySelector("[data-media-crop-center]")
    .addEventListener("click", () => set({ x: 0.5, y: 0.5 }));
  let drag = null;
  stage.addEventListener("pointerdown", (event) => {
    drag = { x: event.clientX, y: event.clientY, crop: { ...crop } };
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const box = media.cropGeometry(art.asset, drag.crop);
    const size = stage.getBoundingClientRect().width || 1;
    set({
      x: drag.crop.x - (event.clientX - drag.x) / size / box.w,
      y: drag.crop.y - (event.clientY - drag.y) / size / box.h,
    });
  });
  const stop = () => (drag = null);
  stage.addEventListener("pointerup", stop);
  stage.addEventListener("pointercancel", stop);
  stage.addEventListener("keydown", (event) => {
    const step = 0.02;
    const moves = {
      ArrowLeft: { x: crop.x + step },
      ArrowRight: { x: crop.x - step },
      ArrowUp: { y: crop.y + step },
      ArrowDown: { y: crop.y - step },
      "+": { zoom: crop.zoom + 0.1 },
      "=": { zoom: crop.zoom + 0.1 },
      "-": { zoom: crop.zoom - 0.1 },
    }[event.key];
    if (!moves) return;
    event.preventDefault();
    event.stopPropagation();
    set(moves);
  });
}

// ---------------------------------------------------------------- missing references

/**
 * The missing-resource notice's actions (Owlbear VTL-240): choose another file for the
 * same use, or remove the broken reference. `ref` comes from missingReferences or a token.
 */
export function openMissing(ctx, ref) {
  const name = ref.name ? `«${ref.name}»` : ctx.t("Il file", "The file");
  const label = ref.label ? ctx.label(ref.label) : "";
  // Another area's reference is fixed there (B28 never edits its data): open it only.
  const external = ref.kind === "external";
  const options = ref.actorId
    ? actorOptions(ctx, ref.actorId)
    : ref.sceneId
      ? sceneOptions(ctx, ref.sceneId)
      : {};
  ctx.dialog(
    ctx.t("File mancante", "Missing file"),
    `<p>${ctx.esc(ctx.t(`${name} è stato eliminato. ${label ? `Era usato da: ${label}.` : ""}`, `${ref.name ? `“${ref.name}”` : "The file"} was deleted. ${label ? `It was used by: ${label}.` : ""}`))}</p><p class="muted">${external ? ctx.t("Apri quella sezione per scegliere un’altra immagine: finché non lo fai, il riferimento resta in questo elenco.", "Open that section to choose another image: until you do, the reference stays in this list.") : ctx.t("Finché non scegli, al suo posto compare questo avviso invece di uno spazio vuoto.", "Until you choose, this notice shows instead of an empty space.")}</p><div class="toolbar"><button type="button" class="button primary" data-media-missing-pick>${ref.kind === "scene" ? ctx.t("Scegli un’altra mappa", "Choose another map") : ref.kind === "attachment" ? ctx.t("Apri la voce", "Open the entry") : external ? ctx.t("Apri dove è usato", "Open where it is used") : ctx.t("Scegli un’altra immagine", "Choose another image")}</button>${external ? "" : `<button type="button" class="button" data-media-missing-clear>${ctx.t("Togli il riferimento", "Remove the reference")}</button>`}</div>`,
    { cancelLabel: ctx.t("Più tardi", "Later") },
  );
  const dialog = document.querySelector("#dialog");
  dialog.querySelector("[data-media-missing-clear]")?.addEventListener("click", () => {
    ctx.closeDialog();
    attempt(
      ctx,
      ctx.t("Riferimento mancante tolto", "Missing reference removed"),
      (draft) => media.clearMissing(draft, ctx.role, ref),
      options,
    );
  });
  dialog.querySelector("[data-media-missing-pick]").addEventListener("click", () => {
    if (ref.kind === "attachment" || external) {
      ctx.closeDialog();
      ctx.navigate(ref.route.page, ref.route.params);
      return;
    }
    const pick = {
      portrait: (draft, id) => media.setPortrait(draft, ctx.role, ref.actorId, id),
      variant: (draft, id) =>
        media.replaceVariantAsset(draft, ctx.role, ref.actorId, ref.variantId, id),
      scene: (draft, id) => media.setSceneMap(draft, ctx.role, ref.sceneId, id),
    }[ref.kind];
    openPicker(ctx, {
      title:
        ref.kind === "scene"
          ? ctx.t("Scegli la mappa", "Choose the map")
          : ctx.t("Scegli l’immagine", "Choose the image"),
      use: ref.kind === "scene" ? "map" : ref.kind === "portrait" ? "portrait" : "token",
      onPick: (id) =>
        ctx.commit(
          ctx.t("Immagine mancante sostituita", "Missing image replaced"),
          (draft) => pick(draft, id),
          options,
        ),
    });
  });
}

// ---------------------------------------------------------------- token images (Changr)

/** The images a token can show: the portrait (if any) and its alternative images. */
export function tokenOptions(ctx, actorId) {
  const look = media.lookOf(ctx.state, actorId);
  const portrait = media.portraitArt(ctx.state, actorId);
  const options = [];
  if (portrait)
    options.push({
      target: "portrait",
      asset: portrait.asset,
      crop: look?.token?.crop,
      label: ctx.t("Ritratto", "Portrait"),
    });
  for (const variant of look?.token?.variants ?? [])
    options.push({
      target: variant.id,
      asset: media.findAsset(ctx.state, variant.assetId),
      crop: variant.crop,
      label: variant.label,
    });
  return { options, active: look?.token?.active ?? "portrait" };
}
/**
 * Toggle buttons choosing the image shown on the token (VTL-104: owners click a thumbnail
 * to switch). `removable` adds a remove control per alternative image.
 */
export function renderTokenChoices(ctx, actorId, { removable = false, editable = true } = {}) {
  const actor = ctx.state.actors[actorId];
  const { options, active } = tokenOptions(ctx, actorId);
  if (!options.length)
    return `<p class="muted" data-media-no-images>${ctx.t("Nessuna immagine: la pedina mostra l’iniziale.", "No image: the token shows the initial.")}</p>`;
  // R3 PG-77: while transformed the token shows the form; these images return with the
  // original form. SV-37: choices a viewer cannot change say who changes them.
  const formNote = actor?.activeForm?.profile
    ? `<p class="muted" data-media-form-note>${ctx.esc(ctx.t(`Trasformazione in corso: la pedina mostra ${formTokenName(actor, "it")}. Queste immagini tornano con la forma originale.`, `Transformed: the token shows ${formTokenName(actor, "en")}. These images return with the original form.`))}</p>`
    : "";
  const why = editable
    ? ""
    : `<p class="muted" id="media-token-why-${ctx.esc(actorId)}">${ctx.t("L’immagine della pedina la sceglie chi la controlla.", "Whoever controls the token chooses its image.")}</p>`;
  return `${formNote}${why}<div class="media-choices" role="group" aria-label="${ctx.esc(ctx.t(`Immagine mostrata sulla pedina di ${actor.name}`, `Image shown on ${actor.name}’s token`))}">${options
    .map(
      (option) =>
        `<div class="media-choice ${option.target === active ? "is-active" : ""}"><button type="button" class="media-choice-button" data-media-token="${ctx.esc(option.target)}" aria-pressed="${option.target === active}" ${editable ? "" : `disabled aria-describedby="media-token-why-${ctx.esc(actorId)}"`}>${roundThumb(ctx, option.asset, option.crop)}<span>${ctx.esc(option.label)}${option.asset ? "" : ` · ${ctx.t("mancante", "missing")}`}</span></button>${removable && editable && option.target !== "portrait" ? `<button type="button" class="icon-button" data-media-remove-variant="${ctx.esc(option.target)}" aria-label="${ctx.esc(ctx.t(`Togli l’immagine «${option.label}»`, `Remove the image “${option.label}”`))}">${ctx.icon("close")}</button>` : ""}</div>`,
    )
    .join("")}</div>`;
}
export function bindTokenChoices(root, ctx, actorId, { after } = {}) {
  const actor = ctx.state.actors[actorId];
  // Inside a dialog (`after` closes it) focus returns to the token on the map; on a page,
  // to the same choice, re-rendered.
  const token = `#battle-map .map-token${byData("actor", actorId)}`;
  root.querySelectorAll("[data-media-token]").forEach((button) =>
    button.addEventListener("click", () => {
      const target = button.dataset.mediaToken;
      const option = tokenOptions(ctx, actorId).options.find((row) => row.target === target);
      after?.();
      attempt(
        ctx,
        ctx.t(
          `Immagine della pedina di ${actor.name}: ${option?.label ?? ""}`,
          `${actor.name}’s token image: ${option?.label ?? ""}`,
        ),
        (draft) => media.setActiveToken(draft, ctx.role, actorId, target),
        actorOptions(ctx, actorId),
      );
      refocus(after ? token : byData("media-token", target), token);
    }),
  );
  root.querySelectorAll("[data-media-remove-variant]").forEach((button) =>
    button.addEventListener("click", () => {
      attempt(
        ctx,
        ctx.t(
          `Immagine alternativa tolta da ${actor.name}`,
          `Alternative image removed from ${actor.name}`,
        ),
        (draft) =>
          media.removeTokenVariant(draft, ctx.role, actorId, button.dataset.mediaRemoveVariant),
        actorOptions(ctx, actorId),
      );
      // The removed image's button is gone: the image now shown takes the focus.
      refocus('[data-media-token][aria-pressed="true"]', "[data-media-token]");
    }),
  );
}
/** Picker adding an alternative image to a token, named, optionally shown at once. */
export function openAddVariant(ctx, actorId, { activate = false } = {}) {
  const actor = ctx.state.actors[actorId];
  openPicker(ctx, {
    title: ctx.t(
      `Nuova immagine per la pedina di ${actor.name}`,
      `New image for ${actor.name}’s token`,
    ),
    submitLabel: ctx.t("Aggiungi alla pedina", "Add to the token"),
    use: "token",
    extra: `<div class="form-grid media-variant-fields"><label class="field">${ctx.t("Nome dell’immagine (es. Ferito, Forma d’orso)", "Image name (e.g. Wounded, Bear form)")}<input name="media-variant-label" maxlength="${media.LIMITS.label}"></label><label class="media-check"><input type="checkbox" name="media-variant-activate" ${activate ? "checked" : ""}> ${ctx.t("Mostrala subito sulla pedina", "Show it on the token now")}</label></div>`,
    onPick: (id, form) =>
      ctx.commit(
        ctx.t(
          `Immagine aggiunta alla pedina di ${actor.name}`,
          `Image added to ${actor.name}’s token`,
        ),
        (draft) =>
          media.addTokenVariant(draft, ctx.role, actorId, id, form.get("media-variant-label"), {
            activate: form.get("media-variant-activate") === "on",
          }),
        actorOptions(ctx, actorId),
      ),
  });
}

// ---------------------------------------------------------------- appearance picker (PG-44)

/**
 * PG-44 / BI-32: the character's look from one place, opened by the sheet's header portrait
 * (D&D Beyond) and the token menu › Appearance (Owlbear): the portrait, the token preview
 * that follows the border colour at once (Tokenizer rings), the circular crop and the
 * library or an upload. «Applica» saves the border; the other buttons act at once.
 */
export function openAppearance(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  if (!actor || !media.mediaOf(ctx.state)) return;
  const editable = ctx.canControl(actor);
  const portrait = media.portraitArt(ctx.state, actorId);
  const art = media.tokenArt(ctx.state, actorId);
  const ring = tokenRing(ctx.state, actorId);
  const scene = ctx.state.scenes?.find((row) => row.id === ctx.state.activeSceneId);
  const token = scene?.tokens?.find((row) => row.actorId === actorId) ?? null;
  const canRing = editable && Boolean(token) && Boolean(ctx.state.ext?.["token-menu"]);
  const portraitHTML = portrait?.asset
    ? `<img src="${ctx.esc(src(portrait.asset))}" alt="${ctx.esc(ctx.t(`Ritratto di ${actor.name}`, `${actor.name}’s portrait`))}">`
    : `<span aria-hidden="true">${ctx.esc(actor.name.slice(0, 1))}</span>`;
  const swatches = RING_COLOURS.map(
    ([id, hex, label]) =>
      `<label class="media-appearance-swatch" title="${ctx.esc(ctx.label(label))}"><input type="radio" name="ring" value="${id}" data-hex="${hex}" ${ring?.id === id ? "checked" : ""} ${canRing ? "" : 'disabled aria-describedby="media-ring-why"'}><span style="background:${hex}" aria-hidden="true"></span><span class="media-sr">${ctx.esc(ctx.label(label))}</span></label>`,
  ).join("");
  const body = `<div class="media-appearance" data-media-appearance="${ctx.esc(actorId)}"><div class="media-appearance-preview"><div class="media-portrait-frame">${portraitHTML}</div><div data-media-appearance-token>${tokenSvg(ctx, art, actor.name, 120, ring?.color)}</div></div>${
    editable
      ? `<div class="toolbar"><button type="button" class="button primary" data-media-appearance="pick">${ctx.t("Scegli dalla libreria", "Choose from library")}</button><label class="button media-file-button">${ctx.icon("plus")} ${ctx.t("Carica un ritratto", "Upload a portrait")}<input type="file" accept="${ACCEPT_IMAGES}" data-media-appearance-upload></label>${art?.asset ? `<button type="button" class="button" data-media-appearance="crop">${ctx.t("Ritaglia per la pedina", "Crop for the token")}</button>` : ""}${portrait?.asset ? `<button type="button" class="button quiet" data-media-appearance="remove">${ctx.t("Togli il ritratto", "Remove portrait")}</button>` : ""}</div>`
      : `<p class="muted">${ctx.t("Solo chi controlla la scheda può cambiarne l’aspetto.", "Only whoever controls the sheet can change its appearance.")}</p>`
  }<fieldset class="media-appearance-ring"><legend>${ctx.t("Bordo della pedina", "Token border")}</legend>${canRing ? "" : `<p class="muted" id="media-ring-why">${token ? ctx.t("Il bordo lo cambia chi controlla la pedina.", "Whoever controls the token changes its border.") : ctx.t("La pedina non è nella scena attiva: il bordo si sceglie quando è sulla mappa.", "The token is not in the active scene: choose the border once it is on the map.")}</p>`}<div class="media-appearance-swatches"><label class="media-appearance-swatch" title="${ctx.esc(ctx.t("Standard", "Default"))}"><input type="radio" name="ring" value="" ${ring ? "" : "checked"} ${canRing ? "" : 'disabled aria-describedby="media-ring-why"'}><span class="is-none" aria-hidden="true"></span><span class="media-sr">${ctx.t("Standard", "Default")}</span></label>${swatches}</div></fieldset></div>`;
  ctx.dialog(ctx.t(`Aspetto · ${actor.name}`, `Appearance · ${actor.name}`), body, {
    submitLabel: canRing ? ctx.t("Applica", "Apply") : undefined,
    cancelLabel: ctx.t("Chiudi", "Close"),
    onSubmit: canRing
      ? (data) => {
          const value = String(data.get("ring") ?? "");
          if ((ring?.id ?? "") === value) return;
          ctx.commit(
            ctx.t(`Bordo della pedina di ${actor.name}`, `${actor.name}’s token border`),
            (draft) => setRing(draft.ext["token-menu"], [token.id], value || null),
            actorOptions(ctx, actorId),
          );
        }
      : undefined,
  });
  const root = globalThis.document?.querySelector("#dialog [data-media-appearance]");
  if (!root) return;
  // Instant preview: the token redraws with the chosen border before «Applica».
  root.querySelectorAll('input[name="ring"]').forEach((input) =>
    input.addEventListener("change", () => {
      const stage = root.querySelector("[data-media-appearance-token]");
      if (stage)
        stage.innerHTML = tokenSvg(
          ctx,
          media.tokenArt(ctx.state, actorId),
          actor.name,
          120,
          input.dataset.hex || null,
        );
    }),
  );
  const reopen = () => queueMicrotask(() => openAppearance(ctx, actorId));
  const setPortrait = (assetId) =>
    ctx.commit(
      ctx.t(`Ritratto di ${actor.name} aggiornato`, `${actor.name}’s portrait updated`),
      (draft) => media.setPortrait(draft, ctx.role, actorId, assetId),
      actorOptions(ctx, actorId),
    );
  root.querySelector('[data-media-appearance="pick"]')?.addEventListener("click", () =>
    openPicker(ctx, {
      title: ctx.t(`Ritratto di ${actor.name}`, `${actor.name}’s portrait`),
      submitLabel: ctx.t("Usa come ritratto", "Use as portrait"),
      use: "portrait",
      selected: media.lookOf(ctx.state, actorId)?.portrait ?? "",
      onPick: (assetId) => {
        setPortrait(assetId);
        reopen();
      },
    }),
  );
  root
    .querySelector("[data-media-appearance-upload]")
    ?.addEventListener("change", async (event) => {
      const files = takeFiles(event);
      if (!files.length) return;
      const [first] = await importFiles(ctx, files.slice(0, 1), { use: "portrait", where: "look" });
      if (!first) return;
      try {
        setPortrait(first.id);
      } catch (error) {
        refuse(ctx, error);
      }
      reopen();
    });
  root
    .querySelector('[data-media-appearance="crop"]')
    ?.addEventListener("click", () => openCrop(ctx, actorId));
  root.querySelector('[data-media-appearance="remove"]')?.addEventListener("click", () => {
    attempt(
      ctx,
      ctx.t(`Ritratto di ${actor.name} tolto`, `${actor.name}’s portrait removed`),
      (draft) => media.setPortrait(draft, ctx.role, actorId, null),
      actorOptions(ctx, actorId),
    );
    reopen();
  });
}
