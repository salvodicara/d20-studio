// B28 — Media: images and files. Entry module registered through the B11 registry.
//
// Library › "Images and files": Foundry File Picker / Roll20 Art Library / Owlbear asset
// manager (folders, tags, search, grid or list, upload with the import wheel, quota).
// File page (#media?id=…): details, provenance and licence, sharing, "used in" (Kanka),
// use as portrait / token image / scene map / attachment, replace, delete, personal PDF
// notes (Owlbear PDF!). Sheet › "Appearance": D&D Beyond portrait, Tokenizer crop, token
// border, Changr alternative images. Campaign › "Attachments" and on each entry page:
// Kanka attachments with their own visibility. Table: see media-table.mjs.
// Domain: media-domain.mjs; shared UI: media-ui.mjs. Synthetic seed: media-seed.mjs.

import * as media from "./media-domain.mjs";
import { canControlActor, canViewActor } from "./character-access.mjs";
import { listCampaignEntries, getCampaignEntry } from "./campaign-content.mjs";
import {
  ui,
  resetUI,
  setNotice,
  noticeAfterCommit,
  lastCommitId,
  renderNotice,
  bindNotice,
  errorText,
  attempt,
  actorOptions,
  assetOptions,
  sceneOptions,
  src,
  thumb,
  useLabel,
  ownerText,
  sizeText,
  creditText,
  tokenRing,
  tokenSvg,
  takeFiles,
  importFiles,
  readLocalFile,
  openPicker,
  pickerBody,
  bindPicker,
  openViewer,
  pdfFrame,
  bindPdfFrame,
  openCrop,
  openAppearance,
  openMissing,
  openAddVariant,
  renderTokenChoices,
  bindTokenChoices,
  useRegistry,
  lockedUse,
  lockChip,
  bindLock,
  refocus,
  byData,
  ACCEPT,
  ACCEPT_IMAGES,
} from "./media-ui.mjs";
import {
  artLayer,
  bindArtLayer,
  missingLayer,
  bindMissingLayer,
  tokenPanelVisible,
  renderTokenPanel,
  bindTokenPanel,
  renderDock,
  bindDock,
  openTokenImages,
} from "./media-table.mjs";

const L = (it, en) => ({ it, en });
const SAFE_ID = /^[A-Za-z0-9_-]+$/;
const data = (ctx) => media.mediaOf(ctx.state);

// Resolves once the readers of other areas' uses are installed (see handoutsUsage).
export let usageReady = Promise.resolve();

export function register(registry) {
  useRegistry(registry);
  // B15 materials point at library images: read on demand, so B28 works without B15.
  usageReady = import("./handouts-domain.mjs").then(
    (handouts) => media.addUsageProvider("handouts", handoutsUsage(handouts), { ifAbsent: true }),
    () => {},
  );
  registry.registerStateSlice(media.MEDIA_ID, {
    version: media.MEDIA_VERSION,
    seed: media.seedMedia,
    normalize: media.normalizeMedia,
  });
  registry.registerStyles(new URL("./media.css", import.meta.url));

  registry.add("library-section", {
    id: "media",
    label: L("Immagini e file", "Images and files"),
    order: 40,
    render: renderLibrary,
    bind: bindLibrary,
  });
  registry.add("route", {
    id: "media",
    label: L("File della libreria", "Library file"),
    icon: "book",
    render: renderAssetPage,
    bind: bindAssetPage,
  });
  registry.add("sheet-tab", {
    id: "media",
    category: "story",
    label: L("Aspetto", "Appearance"),
    order: 55,
    when: (ctx, actor) => Boolean(actor && data(ctx)),
    render: renderLook,
    bind: bindLook,
  });
  registry.add("map-layer", {
    id: "media-art",
    label: L("Immagini delle pedine", "Token images"),
    order: 5,
    svg: artLayer,
    bind: bindArtLayer,
  });
  registry.add("map-layer", {
    id: "media-missing",
    label: L("Immagini mancanti", "Missing images"),
    order: 66,
    interactive: true,
    svg: missingLayer,
    bind: bindMissingLayer,
  });
  registry.add("table-panel", {
    id: "media-token",
    label: L("Immagine della pedina", "Token image"),
    placement: "inspector",
    when: tokenPanelVisible,
    render: renderTokenPanel,
    bind: bindTokenPanel,
  });
  registry.add("table-panel", {
    id: "media-dock",
    section: "journal",
    label: L("Immagini e file", "Images and files"),
    placement: "sidebar-tab",
    order: 100,
    // B61: its own picture icon, distinct from the map tools.
    icon: "image",
    when: (ctx) => Boolean(data(ctx)),
    render: renderDock,
    bind: bindDock,
  });
  registry.add("campaign-section", {
    id: "media",
    group: "world",
    label: L("Allegati", "Attachments"),
    order: 45,
    when: (ctx) => Boolean(data(ctx)),
    render: renderAttachmentsSection,
    bind: bindAttachments,
  });
  // Entry-level panel: rendered on an entry page by campaign.mjs (sections whose id ends
  // with ".entry" receive the projected entry); hidden from the sidebar (no entry there).
  registry.add("campaign-section", {
    id: "media.entry",
    label: L("Allegati della voce", "Entry attachments"),
    when: (ctx, entry) => Boolean(entry?.id && data(ctx)),
    render: renderEntryAttachments,
    bind: bindAttachments,
  });
  registry.add("token-menu", {
    id: "media.token-images",
    submenu: "look",
    label: L("Immagini della pedina…", "Token images…"),
    group: "appearance",
    when: (ctx, target) => {
      const actor = ctx.state.actors[target?.actorId];
      return Boolean(actor && data(ctx) && ctx.canControl(actor));
    },
    run: (ctx, target) => openTokenImages(ctx, target.actorId),
  });
  // BI-32: Owlbear's token menu › Appearance › Crop, and the whole appearance picker (the
  // sheet's header portrait opens the same one, PG-44).
  registry.add("token-menu", {
    id: "media.token-crop",
    submenu: "look",
    label: L("Ritaglia il ritratto per la pedina…", "Crop the portrait for the token…"),
    group: "appearance",
    when: (ctx, target) => {
      const actor = ctx.state.actors[target?.actorId];
      return Boolean(
        actor && data(ctx) && ctx.canControl(actor) && media.tokenArt(ctx.state, actor.id)?.asset,
      );
    },
    run: (ctx, target) => openCrop(ctx, target.actorId),
  });
  registry.add("token-menu", {
    id: "media.appearance",
    submenu: "look",
    label: L("Aspetto: ritratto e bordo…", "Appearance: portrait and border…"),
    group: "appearance",
    when: (ctx, target) => {
      const actor = ctx.state.actors[target?.actorId];
      return Boolean(actor && data(ctx) && ctx.canControl(actor));
    },
    run: (ctx, target) => openAppearance(ctx, target.actorId),
  });
  const lookTarget = (ctx) => {
    const id =
      (ctx.view?.page === "characters" && ctx.view.id) ||
      Object.values(ctx.state.actors).find(
        (actor) =>
          actor.kind === "character" &&
          !actor.companion &&
          actor.owner === ctx.role &&
          ctx.canControl(actor),
      )?.id;
    return id && ctx.state.actors[id] && ctx.canControl(ctx.state.actors[id]) ? id : null;
  };
  registry.add("command", {
    id: "media.crop-portrait",
    label: L("Ritaglia ritratto per la pedina", "Crop portrait for the token"),
    description: L(
      "ritaglia, ritaglio, ritratto, pedina, token, tokenizer, aspetto, immagine",
      "crop, portrait, token, tokenizer, appearance, image",
    ),
    group: "library",
    when: (ctx) => Boolean(data(ctx) && lookTarget(ctx)),
    run: (ctx) => {
      const id = lookTarget(ctx);
      if (media.tokenArt(ctx.state, id)?.asset) openCrop(ctx, id);
      else openAppearance(ctx, id);
    },
  });
  registry.add("command", {
    id: "media.appearance",
    label: L(
      "Aspetto del personaggio: ritratto e bordo",
      "Character appearance: portrait and border",
    ),
    description: L(
      "ritratto, avatar, immagine, pedina, bordo, anello, colore, aspetto",
      "portrait, avatar, image, token, border, ring, colour, appearance",
    ),
    group: "library",
    when: (ctx) => Boolean(data(ctx) && lookTarget(ctx)),
    run: (ctx) => openAppearance(ctx, lookTarget(ctx)),
  });
  registry.add("notifications", {
    id: "media",
    label: L("Immagini e file", "Images and files"),
    collect: collectMissing,
  });
  registry.add("search", {
    id: "media",
    label: L("Immagini e file", "Images and files"),
    search: searchAssets,
  });
  registry.add("command", {
    id: "media.open",
    label: L("Apri immagini e file", "Open images and files"),
    group: "library",
    run: (ctx) => ctx.navigate("library", { tab: "media" }),
  });
  registry.add("settings", {
    id: "media",
    label: L("Importazione di file", "File import"),
    scope: "device",
    fields: [
      {
        id: "import-lock",
        label: L("Tipo scelto per i nuovi file", "Type chosen for new files"),
        type: "choice",
        default: "ask",
        options: [
          { value: "ask", label: L("Chiedi ogni volta", "Ask every time") },
          { value: "map", label: L("Mappa", "Map") },
          { value: "token", label: L("Pedina", "Token") },
          { value: "portrait", label: L("Ritratto", "Portrait") },
          { value: "prop", label: L("Oggetto di scena", "Prop") },
        ],
      },
    ],
  });
  // Portraits on core pages that have no image hook: an area stylesheet under <body>.
  const repaint = (payload, { ctx }) => paintPortraits(ctx);
  // A notice belongs to the page where it is shown; leaving that page drops it.
  const noticePage = {
    library: "library",
    asset: "media",
    look: "characters",
    dock: "table",
    attachments: "campaign",
  };
  registry.on("navigate", (payload, meta) => {
    if (ui.notice && noticePage[ui.notice.where] !== payload.page) ui.notice = null;
    if (payload.page !== "media") ui.draft = null;
    // "Change the border at the Table": once the Table is rendered and bound, open the
    // token menu's border colours. Any other destination drops the request.
    const actorId = pendingRing;
    pendingRing = null;
    if (actorId && payload.page === "table") queueMicrotask(() => openRing(meta.ctx, actorId));
    repaint(payload, meta);
  });
  registry.on("commit", (payload, meta) => {
    noticeAfterCommit(payload);
    repaint(payload, meta);
  });
  registry.on("role-changed", (payload, meta) => {
    resetUI();
    repaint(payload, meta);
  });
  registry.on("reset", (payload, meta) => {
    resetUI();
    repaint(payload, meta);
  });
}

// ---------------------------------------------------------------- uses in other areas

/**
 * Uses of library images by B15 materials ("media:<id>" in a material's image and in a
 * map-less scene's picture), read through B15's own access rule (`canReadMaterial`) and
 * words. B28 never edits them: their fix is B15's editor (Preparation › Materials). If B15
 * reports its uses itself (addUsageProvider with the id "handouts"), that replaces this.
 */
export function handoutsUsage(D) {
  const kinds = {
    handout: L("Dispensa", "Handout"),
    vignette: L("Vignetta", "Vignette"),
    art: L("Rivelazione", "Reveal"),
  };
  const materials = (state) => state.ext?.[D.SLICE]?.materials ?? [];
  const stages = (state) =>
    Object.entries(state.ext?.[D.SLICE]?.stages ?? {})
      .map(([sceneId, stage]) => ({ stage, scene: state.scenes?.find((s) => s.id === sceneId) }))
      .filter((row) => row.scene);
  const materialLabel = (m) => {
    const kind = kinds[m.kind] ?? kinds.handout;
    return L(`Materiali · ${kind.it} «${m.title}»`, `Materials · ${kind.en} “${m.title}”`);
  };
  const stageLabel = (scene) =>
    L(`Scena senza mappa «${scene.name}»`, `Map-less scene “${scene.name}”`);
  const editor = { page: "preparation", params: { tab: D.SLICE } };
  const assetOf = (artId) =>
    typeof artId === "string" && artId.startsWith(D.MEDIA_PREFIX)
      ? artId.slice(D.MEDIA_PREFIX.length)
      : null;
  return {
    uses(state, assetId, viewer) {
      const rows = [];
      let hidden = 0;
      for (const m of materials(state)) {
        if (assetOf(m.image?.artId) !== assetId) continue;
        if (!D.canReadMaterial(state, m, viewer)) hidden += 1;
        else
          rows.push({
            id: m.id,
            label: materialLabel(m),
            route: { page: "campaign", params: { tab: D.SLICE, id: m.id } },
          });
      }
      for (const { stage, scene } of stages(state)) {
        if (assetOf(stage?.artId) !== assetId) continue;
        if (!media.sceneVisibleTo(state, scene, viewer)) hidden += 1;
        else
          rows.push({
            id: scene.id,
            label: stageLabel(scene),
            route: media.isDM(state, viewer) ? editor : { page: "table", params: {} },
          });
      }
      return { rows, hidden };
    },
    // Only the DM manages materials (B15), so only the DM is asked to fix them.
    missing(state, viewer) {
      if (!media.isDM(state, viewer)) return [];
      return [
        ...materials(state).map((m) => ({
          id: m.id,
          assetId: assetOf(m.image?.artId),
          label: materialLabel(m),
          route: editor,
        })),
        ...stages(state).map(({ stage, scene }) => ({
          id: scene.id,
          assetId: assetOf(stage?.artId),
          label: stageLabel(scene),
          route: editor,
        })),
      ].filter((row) => row.assetId);
    },
  };
}

// ---------------------------------------------------------------- portraits on core pages

/** CSS for portraits on the character list, sheet header and home card (current view). */
export function portraitRules(ctx) {
  const rules = [];
  for (const actor of Object.values(ctx.state.actors ?? {})) {
    if (!SAFE_ID.test(actor.id) || !canViewActor(actor, ctx.role, ctx.state)) continue;
    const theme = media.THEMES[media.lookOf(ctx.state, actor.id)?.theme];
    if (theme && ctx.view?.page === "characters" && ctx.view?.id === actor.id)
      rules.push(`#content{--accent:${theme.color};--focus:${theme.color}}`);
    const art = media.portraitArt(ctx.state, actor.id);
    if (!art?.asset) continue;
    const url = src(art.asset);
    const selectors = [
      // The core character list: shown whenever the area that replaces it (the character
      // library, which paints portraits itself) is unavailable.
      `.character-card:has([data-actor="${actor.id}"]) .character-portrait`,
      `.character-resume[data-open-sheet="${actor.id}"] .portrait`,
    ];
    if (ctx.view?.page === "characters" && ctx.view?.id === actor.id)
      selectors.push(".character-heading .character-portrait");
    rules.push(
      `${selectors.join(",")}{background:url("${url}") center/cover no-repeat;color:transparent}`,
    );
  }
  return rules.join("\n");
}
function paintPortraits(ctx) {
  const body = globalThis.document?.body;
  if (!body || !ctx?.state) return;
  let style = body.querySelector("style.media-paint");
  if (!style) {
    style = document.createElement("style");
    style.className = "media-paint";
    body.append(style);
  }
  style.textContent = media.mediaOf(ctx.state) ? portraitRules(ctx) : "";
}

// ---------------------------------------------------------------- notifications, search

function collectMissing(ctx) {
  if (!data(ctx)) return [];
  return media.missingReferences(ctx.state, ctx.role).map((ref) => ({
    id: `media-missing-${ref.kind}-${ref.area ? ref.area + "-" : ""}${ref.actorId ?? ref.sceneId ?? ref.attachmentId ?? ref.id}-${ref.variantId ?? ""}`,
    title: L(`File mancante: ${ref.label.it}`, `Missing file: ${ref.label.en}`),
    body: L(
      `«${ref.name || "file"}» è stato eliminato. Apri per sceglierne un altro o togliere il riferimento.`,
      `“${ref.name || "file"}” was deleted. Open to choose another or remove the reference.`,
    ),
    category: "media",
    target: ref.route,
  }));
}
function searchAssets(ctx, query) {
  if (!data(ctx) || !String(query ?? "").trim()) return [];
  return media
    .visibleAssets(ctx.state, ctx.role, { query })
    .slice(0, 20)
    .map((asset) => ({
      title: asset.name,
      page: "media",
      params: { id: asset.id },
      excerpt: L(
        `${media.USE_LABELS[asset.use].it}${asset.tags.length ? " · " + asset.tags.join(", ") : ""}`,
        `${media.USE_LABELS[asset.use].en}${asset.tags.length ? " · " + asset.tags.join(", ") : ""}`,
      ),
    }));
}

// ---------------------------------------------------------------- Library section

const USE_FILTERS = ["", "portrait", "token", "map", "prop", "document"];
function libraryAssets(ctx) {
  const view = ui.library;
  return media.visibleAssets(ctx.state, ctx.role, {
    scope: view.scope,
    folderId: view.scope === "mine" ? view.folderId : "",
    use: view.use,
  });
}
function renderLibrary(ctx) {
  if (!data(ctx))
    return `<p class="empty-state">${ctx.t("La libreria non è disponibile.", "The library is unavailable.")}</p>`;
  const view = ui.library;
  const folders = media.foldersFor(ctx.state, ctx.role);
  if (view.folderId && !folders.some((folder) => folder.id === view.folderId)) view.folderId = "";
  const mine = media.visibleAssets(ctx.state, ctx.role, { scope: "mine" });
  const shared = media.visibleAssets(ctx.state, ctx.role, { scope: "shared" });
  const assets = libraryAssets(ctx);
  const { used, limit, browser } = media.quota(ctx.state, ctx.role);
  const missing = media.missingReferences(ctx.state, ctx.role);
  const locked = lockedUse(ctx);
  const orphans = media.orphanAnnotations(ctx.state, ctx.role);
  const count = (folderId) => mine.filter((asset) => asset.folderId === folderId).length;
  const folderButton = (id, name, n, scope = "mine") => {
    const current = view.scope === scope && (scope === "shared" || view.folderId === id);
    return `<button type="button" class="media-folder ${current ? "active" : ""}" data-media-scope="${scope}" data-media-folder="${ctx.esc(id)}" ${current ? 'aria-current="true"' : ""}><span>${ctx.esc(name)}</span><small>${n}</small></button>`;
  };
  const custom = folders.find((folder) => folder.id === view.folderId && folder.owner);
  const matches = (asset) =>
    !view.query ||
    [asset.name, asset.fileName, ...asset.tags].join(" ").toLocaleLowerCase().includes(view.query);
  return `<div class="media-library" data-media-library>${renderNotice(ctx, "library")}<div class="media-library-bar"><label class="media-grow"><span class="media-sr">${ctx.t("Cerca", "Search")}</span><input type="search" data-media-search value="${ctx.esc(view.query)}" placeholder="${ctx.t("Cerca per nome o tag", "Search by name or tag")}" aria-label="${ctx.t("Cerca per nome o tag", "Search by name or tag")}"></label><label class="media-inline-field">${ctx.t("Tipo", "Type")} <select data-media-use aria-label="${ctx.t("Tipo di file", "File type")}">${USE_FILTERS.map((use) => `<option value="${use}" ${view.use === use ? "selected" : ""}>${use ? ctx.esc(useLabel(ctx, use)) : ctx.t("Tutti i tipi", "All types")}</option>`).join("")}</select></label><div class="media-view-toggle" role="group" aria-label="${ctx.t("Vista", "View")}"><button type="button" class="button quiet ${view.layout === "grid" ? "active" : ""}" data-media-layout="grid" aria-pressed="${view.layout === "grid"}">${ctx.t("Griglia", "Grid")}</button><button type="button" class="button quiet ${view.layout === "list" ? "active" : ""}" data-media-layout="list" aria-pressed="${view.layout === "list"}">${ctx.t("Elenco", "List")}</button></div><label class="button primary media-file-button">${ctx.icon("plus")} ${ctx.t("Carica file", "Upload files")}<input type="file" multiple accept="${ACCEPT}" data-media-upload></label></div><div class="media-library-layout"><nav class="media-folders" aria-label="${ctx.t("Cartelle", "Folders")}"><p class="media-folders-title">${ctx.t("I miei file", "My files")}</p>${folderButton("", ctx.t("Tutti i miei file", "All my files"), mine.length)}${folders.map((folder) => folderButton(folder.id, media.folderName(folder, ctx.lang), count(folder.id))).join("")}<button type="button" class="text-button media-new-folder" data-media-new-folder>+ ${ctx.t("Nuova cartella", "New folder")}</button><p class="media-folders-title">${ctx.t("Campagna", "Campaign")}</p>${folderButton("", ctx.t("Condivisi nella campagna", "Shared in the campaign"), shared.length, "shared")}</nav><div class="media-main"><div class="media-dropzone" data-media-drop><p><strong>${ctx.t("Trascina qui i file", "Drop files here")}</strong> ${ctx.t("o usa «Carica file». PNG, JPEG o WebP fino a 500 KB, PDF fino a 500 KB.", "or use “Upload files”. PNG, JPEG or WebP up to 500 KB, PDF up to 500 KB.")} ${locked ? ctx.esc(ctx.t(`Le immagini nuove diventano «${media.USE_LABELS[locked].it}» (tipo bloccato).`, `New images become “${media.USE_LABELS[locked].en}” (type locked).`)) : ctx.t("Dopo il caricamento scegli se è una mappa, una pedina, un ritratto o un oggetto di scena.", "After uploading, choose whether it is a map, a token, a portrait or a prop.")}</p>${lockChip(ctx)}<p class="media-quota"><meter min="0" max="${limit}" value="${used}" aria-label="${ctx.t("Spazio usato", "Space used")}"></meter> ${ctx.esc(ctx.t(`Spazio usato: ${media.formatBytes("it", used)} di ${media.formatBytes("it", limit)}; in questo browser, i file di tutte le identità: ${media.formatBytes("it", browser.used)} di ${media.formatBytes("it", browser.limit)} (limiti di questa dimostrazione: i file restano nella memoria locale del browser)`, `Space used: ${media.formatBytes("en", used)} of ${media.formatBytes("en", limit)}; in this browser, every identity’s files: ${media.formatBytes("en", browser.used)} of ${media.formatBytes("en", browser.limit)} (limits of this demonstration: files stay in the browser’s local storage)`))}</p></div>${
    missing.length
      ? `<section class="media-report" aria-labelledby="media-report-title"><h2 id="media-report-title">${ctx.t("Riferimenti mancanti", "Missing references")} (${missing.length})</h2><ul>${missing.map((ref, i) => `<li><span>${ctx.esc(ctx.label(ref.label))}<small>${ctx.esc(ctx.t(`«${ref.name || "file"}» è stato eliminato`, `“${ref.name || "file"}” was deleted`))}</small></span><button type="button" class="button" data-media-report="${i}">${ctx.t("Risolvi", "Fix")}</button></li>`).join("")}</ul></section>`
      : ""
  }${
    orphans.length
      ? `<section class="media-report" aria-labelledby="media-orphans-title"><h2 id="media-orphans-title">${ctx.t("Le mie note su PDF eliminati", "My notes on deleted PDFs")} <span class="badge">${ctx.t("Solo io", "Only me")}</span></h2><ul>${orphans.map((note) => `<li><span>${ctx.esc(note.text)}<small>${ctx.esc(ctx.t(`«${note.name || "PDF"}» · pagina ${note.page} · PDF eliminato`, `“${note.name || "PDF"}” · page ${note.page} · PDF deleted`))}</small></span><button type="button" class="button quiet" data-media-orphan-remove="${ctx.esc(note.id)}" aria-label="${ctx.esc(ctx.t(`Elimina la nota su «${note.name || "PDF"}», pagina ${note.page}`, `Delete the note on “${note.name || "PDF"}”, page ${note.page}`))}">${ctx.t("Elimina la nota", "Delete the note")}</button></li>`).join("")}</ul></section>`
      : ""
  }${
    custom
      ? `<div class="media-folder-tools"><p class="muted">${ctx.esc(ctx.t(`Cartella «${media.folderName(custom, "it")}»`, `Folder “${media.folderName(custom, "en")}”`))}</p><button type="button" class="button quiet danger" data-media-delete-folder="${ctx.esc(custom.id)}">${ctx.t("Elimina cartella vuota", "Delete empty folder")}</button></div>`
      : ""
  }<ul class="media-items ${view.layout === "list" ? "is-list" : "is-grid"}">${assets
    .map((asset) => {
      const inUse = media.usagesOf(ctx.state, asset.id, ctx.role).rows.length;
      return `<li data-media-item data-search="${ctx.esc([asset.name, asset.fileName, ...asset.tags].join(" ").toLocaleLowerCase())}" ${matches(asset) ? "" : "hidden"}><button type="button" class="media-card" data-media-open="${ctx.esc(asset.id)}" aria-label="${ctx.esc(`${asset.name}, ${useLabel(ctx, asset.use)}`)}">${thumb(ctx, asset)}<span class="media-card-text"><strong>${ctx.esc(asset.name)}</strong><small>${ctx.esc(sizeText(ctx, asset))}</small><span class="media-badges"><span class="badge">${ctx.esc(useLabel(ctx, asset.use))}</span>${asset.shared ? `<span class="badge is-shared">${ctx.t("Condiviso", "Shared")}</span>` : ""}${inUse ? `<span class="badge is-used">${ctx.esc(ctx.t(`In uso · ${inUse}`, `In use · ${inUse}`))}</span>` : ""}${asset.owner !== ctx.role ? `<span class="badge">${ctx.esc(ownerText(ctx, asset))}</span>` : ""}</span>${asset.tags.length ? `<span class="media-tags">${asset.tags.map((tag) => `#${ctx.esc(tag)}`).join(" ")}</span>` : ""}</span></button></li>`;
    })
    .join(
      "",
    )}</ul><p class="empty-state media-empty" data-media-empty ${assets.some(matches) ? "hidden" : ""}>${ctx.t("Nessun file qui. Caricane uno o cambia filtro.", "No files here. Upload one or change the filter.")}</p></div></div></div>`;
}
function bindLibrary(el, ctx) {
  if (!data(ctx)) return;
  bindNotice(el, ctx);
  const view = ui.library;
  const items = [...el.querySelectorAll("[data-media-item]")];
  el.querySelector("[data-media-search]")?.addEventListener("input", (event) => {
    view.query = event.target.value.trim().toLocaleLowerCase();
    let shown = 0;
    for (const item of items) {
      item.hidden = Boolean(view.query) && !item.dataset.search.includes(view.query);
      if (!item.hidden) shown += 1;
    }
    el.querySelector("[data-media-empty]").hidden = shown > 0;
  });
  el.querySelector("[data-media-use]")?.addEventListener("change", (event) => {
    view.use = event.target.value;
    ctx.render();
  });
  el.querySelectorAll("[data-media-layout]").forEach((button) =>
    button.addEventListener("click", () => {
      view.layout = button.dataset.mediaLayout;
      ctx.render();
      refocus(byData("media-layout", view.layout));
    }),
  );
  el.querySelectorAll("[data-media-folder]").forEach((button) =>
    button.addEventListener("click", () => {
      view.scope = button.dataset.mediaScope;
      view.folderId = button.dataset.mediaFolder;
      ctx.render();
      refocus(`${byData("media-scope", view.scope)}${byData("media-folder", view.folderId)}`);
    }),
  );
  bindLock(el, ctx);
  el.querySelectorAll("[data-media-orphan-remove]").forEach((button) =>
    button.addEventListener("click", () => {
      if (
        attempt(
          ctx,
          ctx.t("Annotazione eliminata", "Annotation deleted"),
          (draft) => media.removeAnnotation(draft, ctx.role, button.dataset.mediaOrphanRemove),
          { local: true },
        )
      )
        refocus("[data-media-orphan-remove]", "[data-media-search]");
    }),
  );
  el.querySelectorAll("[data-media-open]").forEach((button) =>
    button.addEventListener("click", () => ctx.navigate("media", { id: button.dataset.mediaOpen })),
  );
  el.querySelector("[data-media-upload]")?.addEventListener("change", (event) => {
    const files = takeFiles(event);
    if (files.length)
      importFiles(ctx, files, {
        folderId: view.scope === "mine" ? view.folderId : "",
        where: "library",
      });
  });
  const drop = el.querySelector("[data-media-drop]");
  drop?.addEventListener("dragover", (event) => {
    if (![...(event.dataTransfer?.types ?? [])].includes("Files")) return;
    event.preventDefault();
    drop.classList.add("is-over");
  });
  drop?.addEventListener("dragleave", () => drop.classList.remove("is-over"));
  drop?.addEventListener("drop", (event) => {
    event.preventDefault();
    drop.classList.remove("is-over");
    const files = [...(event.dataTransfer?.files ?? [])];
    if (files.length)
      importFiles(ctx, files, {
        folderId: view.scope === "mine" ? view.folderId : "",
        where: "library",
      });
  });
  el.querySelector("[data-media-new-folder]")?.addEventListener("click", () =>
    ctx.dialog(
      ctx.t("Nuova cartella", "New folder"),
      `<label class="field">${ctx.t("Nome", "Name")}<input name="media-folder-name" required maxlength="${media.LIMITS.name}" autocomplete="off"></label>`,
      {
        submitLabel: ctx.t("Crea cartella", "Create folder"),
        onSubmit: (form) => {
          let id = "";
          ctx.commit(
            ctx.t("Cartella creata", "Folder created"),
            (draft) => {
              id = media.createFolder(draft, ctx.role, form.get("media-folder-name"));
            },
            { local: true },
          );
          view.scope = "mine";
          view.folderId = id;
          ctx.render();
        },
      },
    ),
  );
  el.querySelector("[data-media-delete-folder]")?.addEventListener("click", (event) => {
    const id = event.currentTarget.dataset.mediaDeleteFolder;
    if (
      attempt(
        ctx,
        ctx.t("Cartella eliminata", "Folder deleted"),
        (draft) => media.deleteFolder(draft, ctx.role, id),
        {
          local: true,
        },
      )
    ) {
      view.folderId = "";
      ctx.render();
    }
  });
  const missing = media.missingReferences(ctx.state, ctx.role);
  el.querySelectorAll("[data-media-report]").forEach((button) =>
    button.addEventListener("click", () =>
      openMissing(ctx, missing[Number(button.dataset.mediaReport)]),
    ),
  );
}

// ---------------------------------------------------------------- file page

function controllableActors(ctx, { characters = false } = {}) {
  return Object.values(ctx.state.actors ?? {}).filter(
    (actor) =>
      canControlActor(actor, ctx.role, ctx.state) &&
      (!characters || actor.kind === "character" || actor.companion),
  );
}
function editableEntries(ctx) {
  try {
    return listCampaignEntries(ctx.state, { campaignId: ctx.state.campaign?.id }, ctx.role).filter(
      (entry) => entry.permissions.canEdit,
    );
  } catch {
    return [];
  }
}
/** An entry nobody but the viewer reads (a "Solo io" note): attachments stay personal. */
const isPrivateEntry = (ctx, entryId) =>
  media.otherEntryReaders(ctx.state, entryId, ctx.role).length === 0;
/** Default attachment visibility: "Only me" on a private entry, "DM only" for the DM. */
function defaultVisibility(ctx, entry) {
  if (entry && isPrivateEntry(ctx, entry.id)) return "self";
  return media.isDM(ctx.state, ctx.role) ? "dm" : "readers";
}
function entryLabel(ctx, entry) {
  return entry.data?.title || ctx.label(media.ENTRY_KINDS[entry.kind] ?? media.ENTRY_KINDS.note);
}
/**
 * Provenance fields, shown only to the file's uploader (so "own" reads "Made by me").
 * `share` adds the explicit confirmation that sharing with the campaign needs.
 */
function provenanceFields(ctx, provenance, { share = false, shareChecked = false } = {}) {
  const p = provenance ?? {};
  return `<div class="form-grid media-provenance-fields"><label class="field">${ctx.t("Provenienza", "Source")}<select name="media-source"><option value="">${ctx.t("Scegli…", "Choose…")}</option>${Object.entries(
    media.SOURCES,
  )
    .map(
      ([value, label]) =>
        `<option value="${value}" ${p.source === value ? "selected" : ""}>${ctx.esc(ctx.label(value === "own" ? media.OWN_SOURCE_SELF : label))}</option>`,
    )
    .join(
      "",
    )}</select></label><label class="field">${ctx.t("Autore o credito", "Author or credit")}<input name="media-author" maxlength="${media.LIMITS.credit}" value="${ctx.esc(p.author ?? "")}"></label><label class="field">${ctx.t("Licenza o permesso", "Licence or permission")}<input name="media-license" maxlength="${media.LIMITS.credit}" value="${ctx.esc(p.license ?? "")}" placeholder="${ctx.t("es. CC BY 4.0, uso al tavolo", "e.g. CC BY 4.0, table use")}"></label><label class="field">${ctx.t("Collegamento alla fonte (facoltativo)", "Link to the source (optional)")}<input name="media-link" type="url" maxlength="${media.LIMITS.link}" value="${ctx.esc(p.link ?? "")}" placeholder="https://"></label></div>${share ? `<label class="media-check"><input type="checkbox" name="media-share" ${shareChecked ? "checked" : ""}> ${ctx.t("Condivido il file con la campagna: compare nella libreria di tutti i membri, con questi crediti", "I share the file with the campaign: it appears in every member’s library, with these credits")}</label>` : ""}`;
}
const provenanceFrom = (form) => ({
  source: form.get("media-source") ?? "",
  author: form.get("media-author") ?? "",
  license: form.get("media-license") ?? "",
  link: form.get("media-link") ?? "",
});
/** Typed values of a refused file-page form, shown again (see ui.draft). */
function draftValues(assetId, form) {
  const draft = ui.draft;
  return draft && draft.assetId === assetId && draft.form === form ? draft.values : null;
}
// The form a file-page command comes from, recorded just before it runs (submitForm).
let submitting = null;
/**
 * Runs a file-page form's command (`run(form)`), remembering the form (a FormData or Map)
 * so that a refusal shows what was typed again, with the field to correct focused.
 */
export function submitForm(assetId, key, form, run) {
  submitting = key ? { assetId, form: key, values: Object.fromEntries(form) } : null;
  try {
    return run(form);
  } finally {
    submitting = null;
  }
}
function renderAssetPage(ctx) {
  const asset = media.findAsset(ctx.state, ctx.view.id);
  const back = `<nav class="toolbar media-breadcrumb"><button type="button" class="button quiet" data-media-back>← ${ctx.t("Biblioteca · Immagini e file", "Library · Images and files")}</button></nav>`;
  if (!data(ctx) || !asset || !media.canSeeAsset(ctx.state, asset, ctx.role))
    return `<section class="media-page">${back}${renderNotice(ctx, "asset")}<div class="empty-state"><h1>${ctx.t("File non disponibile", "File unavailable")}</h1><p>${ctx.t("Il file è stato eliminato oppure non è condiviso con te.", "The file was deleted or is not shared with you.")}</p></div></section>`;
  const own = asset.owner === ctx.role;
  const uses = media.usagesOf(ctx.state, asset.id, ctx.role);
  const dm = media.isDM(ctx.state, ctx.role);
  const characters = controllableActors(ctx, { characters: true });
  const actors = controllableActors(ctx);
  const entries = editableEntries(ctx);
  const option = (value, label) => `<option value="${ctx.esc(value)}">${ctx.esc(label)}</option>`;
  const useForms = [];
  if (asset.kind === "image") {
    if (characters.length)
      useForms.push(
        `<form class="media-use-form" data-media-use-form="portrait"><label class="field">${ctx.t("Ritratto di", "Portrait of")}<select name="actor">${characters.map((a) => option(a.id, a.name)).join("")}</select></label><button class="button">${ctx.t("Usa come ritratto", "Use as portrait")}</button></form>`,
      );
    if (actors.length)
      useForms.push(
        `<form class="media-use-form" data-media-use-form="token"><label class="field">${ctx.t("Immagine della pedina di", "Token image of")}<select name="actor">${actors.map((a) => option(a.id, a.name)).join("")}</select></label><label class="media-check"><input type="checkbox" name="activate" checked> ${ctx.t("Mostrala subito", "Show it now")}</label><button class="button">${ctx.t("Aggiungi alla pedina", "Add to the token")}</button></form>`,
      );
    if (dm && media.IMAGE_TYPES.includes(asset.mime))
      useForms.push(
        `<form class="media-use-form" data-media-use-form="map"><label class="field">${ctx.t("Mappa della scena", "Map of the scene")}<select name="scene">${ctx.state.scenes.map((s) => option(s.id, s.name)).join("")}</select></label><button class="button">${ctx.t("Usa come mappa", "Use as map")}</button></form>`,
      );
  }
  if (entries.length) {
    const typed = draftValues(asset.id, "attach");
    const entryId = typed?.entry ?? entries[0].id;
    const visibility =
      typed?.visibility ??
      defaultVisibility(
        ctx,
        entries.find((e) => e.id === entryId),
      );
    useForms.push(
      `<form class="media-use-form" data-media-use-form="attach"><label class="field">${ctx.t("Allega alla voce", "Attach to the entry")}<select name="entry" data-media-attach-entry>${entries
        .map(
          (e) =>
            `<option value="${ctx.esc(e.id)}" data-private="${isPrivateEntry(ctx, e.id)}" data-need-share="${own && media.readersNeedShare(ctx.state, e.id, asset, ctx.role)}" ${e.id === entryId ? "selected" : ""}>${ctx.esc(entryLabel(ctx, e))}${isPrivateEntry(ctx, e.id) ? ` · ${ctx.t("la leggi solo tu", "only you read it")}` : ""}</option>`,
        )
        .join(
          "",
        )}</select></label><label class="field">${ctx.t("Chi lo vede", "Who sees it")}<select name="visibility" data-media-visibility>${Object.entries(
        media.VISIBILITIES,
      )
        .map(
          ([value, label]) =>
            `<option value="${value}" ${value === visibility ? "selected" : ""}>${ctx.esc(ctx.label(label))}</option>`,
        )
        .join(
          "",
        )}</select></label>${own && !asset.shared ? `<div data-media-attach-provenance hidden><p class="muted">${ctx.t("Altri leggono questa voce: per mostrare loro il file lo condividi con la campagna, con provenienza e licenza.", "Others read this entry: to show them the file you share it with the campaign, with its source and licence.")}</p>${provenanceFields(ctx, typed ? provenanceFrom(new Map(Object.entries(typed))) : asset.provenance, { share: true, shareChecked: typed?.["media-share"] === "on" })}</div>` : ""}<button class="button">${ctx.t("Allega", "Attach")}</button></form>`,
    );
  }
  const annotations =
    asset.kind === "pdf" ? media.annotationsFor(ctx.state, asset.id, ctx.role) : [];
  const details = draftValues(asset.id, "details");
  const typedProvenance = draftValues(asset.id, "provenance");
  const note = draftValues(asset.id, "note");
  const folders = media.foldersFor(ctx.state, ctx.role);
  const notesPanel =
    asset.kind === "pdf"
      ? `<section class="panel" aria-labelledby="media-notes-title"><h2 id="media-notes-title">${ctx.t("Le mie annotazioni", "My annotations")} <span class="badge">${ctx.t("Solo io", "Only me")}</span></h2><p class="muted">${ctx.t("Note personali per pagina: nessun altro le vede, nemmeno il DM.", "Personal notes per page: nobody else sees them, not even the DM.")}</p>${annotations.length ? `<ul class="media-notes">${annotations.map((note) => `<li><button type="button" class="button quiet" data-media-note-page="${note.page}">${ctx.t("Pag.", "p.")} ${note.page}</button><span>${ctx.esc(note.text)}</span><button type="button" class="icon-button" data-media-note-remove="${ctx.esc(note.id)}" aria-label="${ctx.esc(ctx.t(`Elimina la nota di pagina ${note.page}`, `Delete the note on page ${note.page}`))}">${ctx.icon("close")}</button></li>`).join("")}</ul>` : `<p class="muted">${ctx.t("Nessuna annotazione.", "No annotations.")}</p>`}<form data-media-note class="media-note-form"><label class="field">${ctx.t("Pagina", "Page")}<input name="page" type="number" min="1" ${asset.pages ? `max="${asset.pages}"` : ""} value="${ctx.esc(note?.page ?? "1")}" required></label><label class="field media-grow">${ctx.t("Nota", "Note")}<textarea name="text" maxlength="${media.LIMITS.annotation}" required>${ctx.esc(note?.text ?? "")}</textarea></label><button class="button">${ctx.t("Aggiungi nota", "Add note")}</button></form></section>`
      : "";
  return `<section class="media-page" data-media-page="${ctx.esc(asset.id)}">${back}${renderNotice(ctx, "asset")}<header class="page-heading media-heading"><div><p class="muted">${ctx.esc(useLabel(ctx, asset.use))} · ${ctx.esc(ownerText(ctx, asset))}</p><h1>${ctx.esc(asset.name)}</h1><p class="muted">${ctx.esc(asset.fileName)} · ${ctx.esc(sizeText(ctx, asset))} · ${ctx.t("versione", "version")} ${asset.revision}</p></div><div class="media-badges">${asset.shared ? `<span class="badge is-shared">${ctx.t("Condiviso nella campagna", "Shared in the campaign")}</span>` : `<span class="badge">${ctx.t("Personale", "Personal")}</span>`}${asset.tags.map((tag) => `<span class="badge">#${ctx.esc(tag)}</span>`).join("")}</div></header><div class="media-detail"><div class="media-left"><figure class="media-preview panel ${asset.kind === "image" ? "is-image" : ""}">${asset.kind === "image" ? `<img src="${ctx.esc(src(asset))}" alt="${ctx.esc(asset.name)}">` : pdfFrame(ctx, asset)}${asset.provenance ? `<figcaption class="muted">${ctx.t("Crediti", "Credits")}: ${ctx.esc(creditText(ctx, asset))}${asset.provenance.link ? ` · <a href="${ctx.esc(asset.provenance.link)}" rel="noopener noreferrer" target="_blank">${ctx.t("fonte", "source")}</a>` : ""}</figcaption>` : ""}</figure>${notesPanel}</div><div class="media-side"><section class="panel media-used" aria-labelledby="media-used-title"><h2 id="media-used-title">${ctx.t("Usato in", "Used in")}</h2>${uses.rows.length ? `<ul class="media-used-list">${uses.rows.map((row, i) => `<li><span>${ctx.esc(ctx.label(row.label))}</span><button type="button" class="button quiet" data-media-used="${i}">${ctx.t("Apri", "Open")}</button></li>`).join("")}</ul>` : `<p class="muted" data-media-unused>${ctx.t("Non ancora usato.", "Not used yet.")}</p>`}</section>${useForms.length ? `<section class="panel" aria-labelledby="media-use-title"><h2 id="media-use-title">${ctx.t("Usa come", "Use as")}</h2>${useForms.join("")}</section>` : ""}${
    own
      ? `<section class="panel" aria-labelledby="media-details-title"><h2 id="media-details-title">${ctx.t("Dettagli", "Details")}</h2><form data-media-details><label class="field">${ctx.t("Nome", "Name")}<input name="name" required maxlength="${media.LIMITS.name}" value="${ctx.esc(details?.name ?? asset.name)}"></label><div class="media-two"><label class="field">${ctx.t("Cartella", "Folder")}<select name="folder">${folders.map((f) => `<option value="${ctx.esc(f.id)}" ${f.id === (details?.folder ?? asset.folderId) ? "selected" : ""}>${ctx.esc(media.folderName(f, ctx.lang))}</option>`).join("")}</select></label><label class="field">${ctx.t("Tipo", "Type")}<select name="use" ${asset.kind === "pdf" ? 'disabled aria-describedby="media-use-why"' : ""}>${media.USES.filter(
          (use) => (asset.kind === "pdf") === (use === "document"),
        )
          .map(
            (use) =>
              `<option value="${use}" ${use === (details?.use ?? asset.use) ? "selected" : ""}>${ctx.esc(useLabel(ctx, use))}</option>`,
          )
          .join(
            "",
          )}</select>${asset.kind === "pdf" ? `<small class="muted" id="media-use-why">${ctx.t("Un PDF resta un documento: per una mappa o una pedina carica un’immagine.", "A PDF stays a document: for a map or a token upload an image.")}</small>` : ""}</label></div><label class="field">${ctx.t("Tag, separati da virgole", "Tags, separated by commas")}<input name="tags" value="${ctx.esc(details?.tags ?? asset.tags.join(", "))}"></label><button class="button">${ctx.t("Salva dettagli", "Save details")}</button></form></section><section class="panel" aria-labelledby="media-prov-title"><h2 id="media-prov-title">${ctx.t("Provenienza e licenza", "Source and licence")}</h2><p class="muted">${ctx.t("Richieste per condividere il file con la campagna. Chi carica resta responsabile dei diritti.", "Required to share the file with the campaign. The uploader remains responsible for the rights.")}</p><form data-media-provenance>${provenanceFields(ctx, typedProvenance ? provenanceFrom(new Map(Object.entries(typedProvenance))) : asset.provenance)}<div class="toolbar"><button class="button" name="intent" value="save">${ctx.t("Salva provenienza", "Save source")}</button>${asset.shared ? `<button class="button quiet" name="intent" value="unshare">${ctx.t("Smetti di condividere", "Stop sharing")}</button>` : `<button class="button primary" name="intent" value="share">${ctx.t("Condividi con la campagna", "Share with the campaign")}</button>`}</div></form></section><section class="panel" aria-labelledby="media-file-title"><h2 id="media-file-title">${ctx.t("File", "File")}</h2><p class="muted">${ctx.t("Sostituire mantiene ogni uso: ritratti, pedine, mappe e allegati mostrano il nuovo file.", "Replacing keeps every use: portraits, tokens, maps and attachments show the new file.")}</p><div class="toolbar"><label class="button media-file-button">${ctx.t("Sostituisci file", "Replace file")}<input type="file" accept="${asset.kind === "pdf" ? ".pdf,application/pdf" : ACCEPT_IMAGES}" data-media-replace></label><button type="button" class="button danger" data-media-delete>${ctx.t("Elimina", "Delete")}</button></div></section>`
      : ""
  }</div></div></section>`;
}
/**
 * File-page commands (UI handlers): each commits, then reports in the page notice. They
 * take plain values so the bind stays a thin mapping from forms, and tests call them.
 */
export const actions = {
  run(ctx, where, label, mutator, options, success) {
    const form = submitting;
    submitting = null;
    try {
      ctx.commit(label, mutator, options);
      ui.draft = null;
      if (success) setNotice(where, success);
      ctx.render();
      return true;
    } catch (error) {
      // A refusal keeps what was typed and points at the field to correct.
      ui.draft = form ? { ...form, field: error?.field || error?.code || "" } : null;
      setNotice(where, errorText(error), { error: true });
      ctx.render();
      return false;
    }
  },
  usePortrait(ctx, assetId, actorId, where = "asset") {
    const asset = media.findAsset(ctx.state, assetId);
    const actor = ctx.state.actors[actorId];
    return actions.run(
      ctx,
      where,
      ctx.t(`Ritratto di ${actor?.name}`, `${actor?.name}’s portrait`),
      (draft) => media.setPortrait(draft, ctx.role, actorId, assetId),
      actorOptions(ctx, actorId),
      L(
        `«${asset?.name}» è ora il ritratto di ${actor?.name}.`,
        `“${asset?.name}” is now ${actor?.name}’s portrait.`,
      ),
    );
  },
  useToken(ctx, assetId, actorId, activate = true) {
    const asset = media.findAsset(ctx.state, assetId);
    const actor = ctx.state.actors[actorId];
    // Already one of the token's images: choose it instead of adding a copy (VTL-104).
    if (media.tokenImageOf(ctx.state, actorId, assetId))
      return actions.run(
        ctx,
        "asset",
        ctx.t(
          `Immagine della pedina di ${actor?.name}: «${asset?.name}»`,
          `${actor?.name}’s token image: “${asset?.name}”`,
        ),
        (draft) =>
          media.addTokenVariant(draft, ctx.role, actorId, assetId, asset?.name, { activate }),
        actorOptions(ctx, actorId),
        L(
          `«${asset?.name}» è già un’immagine della pedina di ${actor?.name}${activate ? ": ora è quella mostrata" : ""}.`,
          `“${asset?.name}” is already one of ${actor?.name}’s token images${activate ? ": it is now the one shown" : ""}.`,
        ),
      );
    return actions.run(
      ctx,
      "asset",
      ctx.t(
        `Immagine aggiunta alla pedina di ${actor?.name}`,
        `Image added to ${actor?.name}’s token`,
      ),
      (draft) =>
        media.addTokenVariant(draft, ctx.role, actorId, assetId, asset?.name, { activate }),
      actorOptions(ctx, actorId),
      L(
        `«${asset?.name}» aggiunta alla pedina di ${actor?.name}.`,
        `“${asset?.name}” added to ${actor?.name}’s token.`,
      ),
    );
  },
  useMap(ctx, assetId, sceneId) {
    const asset = media.findAsset(ctx.state, assetId);
    const scene = ctx.state.scenes.find((row) => row.id === sceneId);
    return actions.run(
      ctx,
      "asset",
      ctx.t(`Mappa della scena: «${asset?.name}»`, `Scene map: “${asset?.name}”`),
      (draft) => media.setSceneMap(draft, ctx.role, sceneId, assetId),
      sceneOptions(ctx, sceneId),
      L(
        `«${asset?.name}» è la mappa di «${scene?.name}».`,
        `“${asset?.name}” is the map of “${scene?.name}”.`,
      ),
    );
  },
  attach(ctx, assetId, entryId, visibility, { provenance = null, share = false } = {}) {
    return actions.run(
      ctx,
      "asset",
      ctx.t("File allegato alla voce", "File attached to the entry"),
      (draft) => media.attach(draft, ctx.role, entryId, assetId, visibility, { provenance, share }),
      attachOptions(ctx, entryId, visibility),
      L(
        `Allegato aggiunto · ${media.VISIBILITIES[visibility]?.it}.`,
        `Attachment added · ${media.VISIBILITIES[visibility]?.en}.`,
      ),
    );
  },
  saveDetails(ctx, assetId, values) {
    return actions.run(
      ctx,
      "asset",
      ctx.t("Dettagli del file salvati", "File details saved"),
      (draft) => media.updateAsset(draft, ctx.role, assetId, values),
      assetOptions(ctx, assetId),
      L("Dettagli salvati.", "Details saved."),
    );
  },
  provenance(ctx, assetId, intent, provenance) {
    const asset = media.findAsset(ctx.state, assetId);
    if (intent === "unshare")
      return actions.run(
        ctx,
        "asset",
        ctx.t(`«${asset?.name}» non più condiviso`, `“${asset?.name}” no longer shared`),
        (draft) => media.shareAsset(draft, ctx.role, assetId, false),
        {},
        L(
          "Il file non compare più nella libreria della campagna. Gli usi esistenti restano.",
          "The file no longer appears in the campaign library. Existing uses stay.",
        ),
      );
    if (intent === "share")
      return actions.run(
        ctx,
        "asset",
        ctx.t(
          `«${asset?.name}» condiviso con la campagna`,
          `“${asset?.name}” shared with the campaign`,
        ),
        (draft) => media.shareAsset(draft, ctx.role, assetId, true, provenance),
        {},
        L(
          "Condiviso con la campagna, con provenienza e licenza.",
          "Shared with the campaign, with source and licence.",
        ),
      );
    return actions.run(
      ctx,
      "asset",
      ctx.t("Provenienza salvata", "Source saved"),
      (draft) => media.setProvenance(draft, ctx.role, assetId, provenance),
      assetOptions(ctx, assetId),
      L("Provenienza e licenza salvate.", "Source and licence saved."),
    );
  },
  replace(ctx, assetId, prepared) {
    const asset = media.findAsset(ctx.state, assetId);
    const count = media.usagesOf(ctx.state, assetId, ctx.role).rows.length;
    return actions.run(
      ctx,
      "asset",
      ctx.t(`«${asset?.name}» sostituito`, `“${asset?.name}” replaced`),
      (draft) => media.replaceAsset(draft, ctx.role, assetId, prepared),
      assetOptions(ctx, assetId),
      L(
        `File sostituito: ${count} ${count === 1 ? "uso mostra" : "usi mostrano"} ora «${prepared.fileName}».`,
        `File replaced: ${count} use${count === 1 ? " now shows" : "s now show"} “${prepared.fileName}”.`,
      ),
    );
  },
  remove(ctx, assetId) {
    const asset = media.findAsset(ctx.state, assetId);
    const rows = media.usagesOf(ctx.state, assetId, ctx.role).rows;
    const own = rows.filter((row) => row.kind !== "external").length;
    const other = rows.length - own;
    ctx.commit(
      ctx.t(`«${asset.name}» eliminato`, `“${asset.name}” deleted`),
      (draft) => media.deleteAsset(draft, ctx.role, assetId),
      assetOptions(ctx, assetId),
    );
    // The Undo button reverts this commit only while it is the latest (noticeAfterCommit).
    const commitId = lastCommitId(ctx);
    setNotice(
      "library",
      L(
        `«${asset.name}» eliminato.${own ? ` ${own} ${own === 1 ? "uso segnala" : "usi segnalano"} ora il file mancante.` : ""}${other ? ` ${other} ${other === 1 ? "uso in un’altra sezione resta" : "usi in altre sezioni restano"} senza immagine: chi gestisce quella sezione lo trova tra i «Riferimenti mancanti».` : ""}`,
        `“${asset.name}” deleted.${own ? ` ${own} use${own === 1 ? " now reports" : "s now report"} the missing file.` : ""}${other ? ` ${other} use${other === 1 ? " in another section is" : "s in other sections are"} left without an image: whoever manages that section finds it under “Missing references”.` : ""}`,
      ),
      { undo: true, commitId },
    );
    ctx.navigate("library", { tab: "media" });
  },
  addNote(ctx, assetId, page, text) {
    return actions.run(
      ctx,
      "asset",
      ctx.t("Annotazione personale aggiunta", "Personal annotation added"),
      (draft) => media.addAnnotation(draft, ctx.role, assetId, page, text),
      { local: true },
      L("Nota salvata: la vedi solo tu.", "Note saved: only you can see it."),
    );
  },
  removeNote(ctx, id) {
    return actions.run(
      ctx,
      "asset",
      ctx.t("Annotazione eliminata", "Annotation deleted"),
      (draft) => media.removeAnnotation(draft, ctx.role, id),
      { local: true },
    );
  },
};
/**
 * Attaching for oneself, or to an entry only the viewer reads, is a private change. A
 * "DM only" attachment is shared data whose log line stays out of the readers' log
 * (DEVELOPMENT: shared audit labels never reveal a hidden source); so is any change to
 * an attachment that is, or becomes, DM only.
 */
const attachOptions = (ctx, entryId, ...visibilities) =>
  visibilities.includes("self") || isPrivateEntry(ctx, entryId)
    ? { local: true }
    : visibilities.includes("dm")
      ? { visibility: "private" }
      : {};
function bindAssetPage(el, ctx) {
  bindNotice(el, ctx);
  el.querySelector("[data-media-back]")?.addEventListener("click", () =>
    ctx.navigate("library", { tab: "media" }),
  );
  const asset = media.findAsset(ctx.state, ctx.view.id);
  if (!asset || !media.canSeeAsset(ctx.state, asset, ctx.role)) return;
  bindPdfFrame(el, asset);
  const uses = media.usagesOf(ctx.state, asset.id, ctx.role);
  el.querySelectorAll("[data-media-used]").forEach((button) =>
    button.addEventListener("click", () => {
      const row = uses.rows[Number(button.dataset.mediaUsed)];
      ctx.navigate(row.route.page, row.route.params);
    }),
  );
  // Each form records itself before its command runs, so a refusal can show it again.
  const onSubmit = (selector, run, key = "") =>
    el.querySelector(selector)?.addEventListener("submit", (event) => {
      event.preventDefault();
      submitForm(asset.id, key, new FormData(event.currentTarget, event.submitter), run);
    });
  const typed = ui.draft?.assetId === asset.id ? ui.draft : null;
  if (typed?.field) {
    const form = el.querySelector(FORM_SELECTORS[typed.form]);
    const name = { annotation: "text" }[typed.field] ?? typed.field;
    const field =
      form?.querySelector(`[name="media-${name}"]`) ?? form?.querySelector(`[name="${name}"]`);
    field?.focus();
  }
  onSubmit('[data-media-use-form="portrait"]', (form) =>
    actions.usePortrait(ctx, asset.id, form.get("actor")),
  );
  onSubmit('[data-media-use-form="token"]', (form) =>
    actions.useToken(ctx, asset.id, form.get("actor"), form.get("activate") === "on"),
  );
  onSubmit('[data-media-use-form="map"]', (form) =>
    actions.useMap(ctx, asset.id, form.get("scene")),
  );
  const attachForm = el.querySelector('[data-media-use-form="attach"]');
  if (attachForm) {
    const entry = attachForm.querySelector("[data-media-attach-entry]");
    const visibility = attachForm.querySelector("[data-media-visibility]");
    const box = attachForm.querySelector("[data-media-attach-provenance]");
    let chosen = Boolean(ui.draft?.assetId === asset.id && ui.draft.form === "attach");
    // Provenance and the share confirmation appear only when attaching would share the file.
    const toggle = () => {
      const option = entry.selectedOptions[0];
      if (box)
        box.hidden = !(visibility.value === "readers" && option?.dataset.needShare === "true");
    };
    entry.addEventListener("change", () => {
      // A private entry defaults to "Only me" until the visibility is chosen by hand.
      if (!chosen)
        visibility.value =
          entry.selectedOptions[0]?.dataset.private === "true"
            ? "self"
            : media.isDM(ctx.state, ctx.role)
              ? "dm"
              : "readers";
      toggle();
    });
    visibility.addEventListener("change", () => {
      chosen = true;
      toggle();
    });
    toggle();
  }
  onSubmit(
    '[data-media-use-form="attach"]',
    (form) =>
      actions.attach(ctx, asset.id, form.get("entry"), form.get("visibility"), {
        provenance: form.get("media-source") ? provenanceFrom(form) : null,
        share: form.get("media-share") === "on",
      }),
    "attach",
  );
  onSubmit(
    "[data-media-details]",
    (form) =>
      actions.saveDetails(ctx, asset.id, {
        name: form.get("name"),
        tags: form.get("tags"),
        folderId: form.get("folder"),
        ...(asset.kind === "image" ? { use: form.get("use") } : {}),
      }),
    "details",
  );
  onSubmit(
    "[data-media-provenance]",
    (form) => actions.provenance(ctx, asset.id, form.get("intent"), provenanceFrom(form)),
    "provenance",
  );
  el.querySelector("[data-media-replace]")?.addEventListener("change", async (event) => {
    const [file] = takeFiles(event);
    if (!file) return;
    try {
      actions.replace(ctx, asset.id, await readLocalFile(file));
    } catch (error) {
      setNotice("asset", errorText(error), { error: true });
      ctx.render();
    }
  });
  el.querySelector("[data-media-delete]")?.addEventListener("click", () =>
    confirmDelete(ctx, asset),
  );
  onSubmit(
    "[data-media-note]",
    (form) => actions.addNote(ctx, asset.id, Number(form.get("page")), form.get("text")),
    "note",
  );
  el.querySelectorAll("[data-media-note-remove]").forEach((button) =>
    button.addEventListener("click", () => actions.removeNote(ctx, button.dataset.mediaNoteRemove)),
  );
  el.querySelectorAll("[data-media-note-page]").forEach((button) =>
    button.addEventListener("click", () => {
      const page = el.querySelector("[data-media-pdf-page]");
      if (page) page.value = button.dataset.mediaNotePage;
      el.querySelector("[data-media-pdf-open]")?.click();
    }),
  );
}
const FORM_SELECTORS = {
  attach: '[data-media-use-form="attach"]',
  details: "[data-media-details]",
  provenance: "[data-media-provenance]",
  note: "[data-media-note]",
};
/** Deleting shows every use first (Kanka "used in"); uses then show a missing notice. */
function confirmDelete(ctx, asset) {
  const { rows } = media.usagesOf(ctx.state, asset.id, ctx.role);
  // Uses kept by other areas (B15 materials) cannot show this area's missing notice.
  const own = rows.filter((row) => row.kind !== "external");
  const other = rows.filter((row) => row.kind === "external");
  const list = (items, attr) =>
    `<ul class="media-used-list" ${attr}>${items.map((row) => `<li>${ctx.esc(ctx.label(row.label))}</li>`).join("")}</ul>`;
  ctx.dialog(
    ctx.t(`Eliminare «${asset.name}»?`, `Delete “${asset.name}”?`),
    `${own.length ? `<p>${ctx.t("È usato in:", "It is used in:")}</p>${list(own, "data-media-delete-uses")}<p>${ctx.t("Dopo l’eliminazione questi punti mostreranno «File mancante» con un’azione per sceglierne un altro, invece di uno spazio vuoto.", "After deleting, these places show “Missing file” with an action to choose another, instead of an empty space.")}</p>` : ""}${other.length ? `<p>${ctx.t("In altre sezioni:", "In other sections:")}</p>${list(other, "data-media-delete-other")}<p>${ctx.t("Lì l’immagine non comparirà più: chi gestisce quella sezione trova il riferimento tra i «Riferimenti mancanti» della Biblioteca e nelle notifiche, per sceglierne un’altra.", "The image will no longer show there: whoever manages that section finds the reference under the Library’s “Missing references” and in notifications, to choose another.")}</p>` : ""}${rows.length ? "" : `<p>${ctx.t("Non lo usi da nessuna parte.", "You do not use it anywhere.")}</p>`}${asset.shared ? `<p class="muted">${ctx.t("Il file è condiviso: se altri lo usano in contenuti che non vedi, lì comparirà «File mancante» con un’azione per sceglierne un altro.", "The file is shared: if others use it in content you cannot see, “Missing file” shows there with an action to choose another.")}</p>` : ""}${asset.kind === "pdf" ? `<p class="muted">${ctx.t("Le note personali sul PDF restano a chi le ha scritte, segnate come «PDF eliminato».", "Personal notes on the PDF stay with whoever wrote them, marked “PDF deleted”.")}</p>` : ""}<p class="muted">${ctx.t("Puoi annullare subito dopo.", "You can undo right after.")}</p>`,
    {
      submitLabel: ctx.t("Elimina", "Delete"),
      onSubmit: () => actions.remove(ctx, asset.id),
    },
  );
  // A destructive confirmation reads as danger, not as the primary action.
  globalThis.document
    ?.querySelector("#dialog footer .primary")
    ?.classList.replace("primary", "danger");
}

// ---------------------------------------------------------------- sheet › Appearance

/** Sheet colour swatches as a radio group (D&D Beyond sheet theme, DDB-058). */
function swatches(ctx, name, current, editable, legend) {
  const option = (value, label, color) =>
    `<label class="media-swatch"><input class="media-sr" type="radio" name="${name}" value="${value}" ${current === value ? "checked" : ""}><span class="media-swatch-dot ${value ? "" : "is-none"}" ${color ? `style="background:${color}"` : ""}></span>${ctx.esc(label)}</label>`;
  // SV-37: a theme this viewer cannot change says who changes it.
  return `<fieldset class="media-frames" ${editable ? "" : `disabled aria-describedby="media-frames-why-${name}"`}><legend>${ctx.esc(legend)}</legend>${editable ? "" : `<p class="muted" id="media-frames-why-${name}">${ctx.t("Lo cambia chi controlla la scheda.", "Whoever controls the sheet changes it.")}</p>`}${option("", ctx.t("Standard", "Default"), "")}${Object.entries(
    media.THEMES,
  )
    .map(([value, row]) => option(value, ctx.label(row), row.color))
    .join("")}</fieldset>`;
}
function renderLook(ctx, actor) {
  const id = actor.id;
  const editable = ctx.canControl(ctx.state.actors[id] ?? actor);
  const portrait = media.portraitArt(ctx.state, id);
  const art = media.tokenArt(ctx.state, id);
  const look = media.lookOf(ctx.state, id);
  const ring = tokenRing(ctx.state, id);
  const scene = ctx.state.scenes?.find((row) => row.id === ctx.state.activeSceneId);
  const onScene = Boolean(scene?.tokens?.some((token) => token.actorId === id));
  return `<section class="media-look" data-media-look="${ctx.esc(id)}">${renderNotice(ctx, "look")}<div class="media-look-grid"><article class="panel media-look-card" aria-labelledby="media-portrait-title"><h2 id="media-portrait-title">${ctx.t("Ritratto", "Portrait")}</h2><div class="media-portrait-frame">${portrait?.asset ? `<img src="${ctx.esc(src(portrait.asset))}" alt="${ctx.esc(ctx.t(`Ritratto di ${actor.name}`, `${actor.name}’s portrait`))}">` : `<span aria-hidden="true">${ctx.esc(actor.name.slice(0, 1))}</span>`}</div>${
    portrait?.missing
      ? `<p class="media-missing-note" role="alert">${ctx.esc(ctx.t(`Ritratto mancante: «${portrait.missing.name}» è stato eliminato.`, `Missing portrait: “${portrait.missing.name}” was deleted.`))}${editable ? ` <button type="button" class="button quiet" data-media-look-fix="portrait">${ctx.t("Risolvi", "Fix")}</button>` : ""}</p>`
      : portrait?.asset
        ? `<p class="muted">${ctx.esc(portrait.asset.name)}</p>`
        : `<p class="muted">${ctx.t("Nessun ritratto: la scheda mostra l’iniziale.", "No portrait: the sheet shows the initial.")}</p>`
  }<p class="muted">${ctx.t("Compare nella scheda, nell’elenco dei personaggi e al Tavolo.", "It appears on the sheet, in the character list and at the Table.")}</p>${swatches(ctx, "media-theme", look?.theme ?? "", editable, ctx.t("Colore della scheda", "Sheet colour"))}${
    editable
      ? `<div class="toolbar"><button type="button" class="button primary" data-media-look-pick>${ctx.t("Scegli dalla libreria", "Choose from library")}</button><label class="button media-file-button">${ctx.icon("plus")} ${ctx.t("Carica un ritratto", "Upload a portrait")}<input type="file" accept="${ACCEPT_IMAGES}" data-media-look-upload></label>${look?.portrait ? `<button type="button" class="button quiet" data-media-look-remove>${ctx.t("Togli il ritratto", "Remove portrait")}</button>` : ""}</div>`
      : `<p class="muted">${ctx.t("Solo chi controlla la scheda può cambiarne l’aspetto.", "Only whoever controls the sheet can change its appearance.")}</p>`
  }</article><article class="panel media-look-card" aria-labelledby="media-token-title"><h2 id="media-token-title">${ctx.t("Pedina al Tavolo", "Token at the Table")}</h2><div class="media-token-stage">${tokenSvg(ctx, art, actor.name, 112, ring?.color)}<div>${
    art?.asset
      ? `<p>${ctx.esc(art.source === "portrait" ? ctx.t("Mostra il ritratto, ritagliato nel cerchio.", "Shows the portrait, cropped to the circle.") : ctx.t(`Mostra l’immagine «${art.label}».`, `Shows the image “${art.label}”.`))}</p>${editable ? `<button type="button" class="button" data-media-look-crop>${ctx.t("Ritaglia per la pedina", "Crop for the token")}</button>` : ""}`
      : art?.missing
        ? `<p class="media-missing-note" role="alert">${ctx.esc(ctx.t(`Immagine mancante: «${art.missing.name}».`, `Missing image: “${art.missing.name}”.`))}${editable ? ` <button type="button" class="button quiet" data-media-look-fix="token">${ctx.t("Risolvi", "Fix")}</button>` : ""}</p>`
        : `<p class="muted">${ctx.t("Senza immagine la pedina mostra l’iniziale.", "Without an image the token shows the initial.")}</p>`
  }</div></div><div class="media-ring" data-media-ring="${ctx.esc(ring?.id ?? "")}"><p><span class="media-swatch-dot ${ring ? "" : "is-none"}" ${ring ? `style="background:${ring.color}"` : ""} aria-hidden="true"></span> ${ctx.esc(ctx.t(`Bordo della pedina: ${ring ? ring.label.it : "standard"}`, `Token border: ${ring ? ring.label.en : "default"}`))}</p><p class="muted">${ctx.t("Il bordo si sceglie al Tavolo, dal menu della pedina (clic destro, pressione lunga o Maiusc+F10) › Colore del bordo.", "The border is chosen at the Table, from the token menu (right-click, long press or Shift+F10) › Border colour.")}</p>${editable && onScene ? `<button type="button" class="button" data-media-look-ring>${ctx.t("Cambia il bordo al Tavolo", "Change the border at the Table")}</button>` : editable ? `<p class="muted">${ctx.t("La pedina non è nella scena attiva.", "The token is not in the active scene.")}</p>` : ""}</div><h3>${ctx.t("Immagini della pedina", "Token images")}</h3><p class="muted">${ctx.t("Chi controlla la pedina sceglie quale mostrare, anche durante il gioco dal Tavolo.", "Whoever controls the token chooses which one to show, also during play from the Table.")}</p>${renderTokenChoices(ctx, id, { removable: true, editable })}${editable ? `<button type="button" class="button" data-media-look-variant>${ctx.icon("plus")} ${ctx.t("Aggiungi un’immagine alternativa", "Add an alternative image")}</button>` : ""}</article></div></section>`;
}
function bindLook(el, ctx) {
  const id = el.querySelector("[data-media-look]")?.dataset.mediaLook;
  const actor = ctx.state.actors[id];
  if (!actor) return;
  bindNotice(el, ctx);
  bindTokenChoices(el, ctx, id);
  const setPortrait = (assetId) =>
    ctx.commit(
      ctx.t(`Ritratto di ${actor.name} aggiornato`, `${actor.name}’s portrait updated`),
      (draft) => media.setPortrait(draft, ctx.role, id, assetId),
      actorOptions(ctx, id),
    );
  el.querySelector("[data-media-look-pick]")?.addEventListener("click", () =>
    openPicker(ctx, {
      title: ctx.t(`Ritratto di ${actor.name}`, `${actor.name}’s portrait`),
      submitLabel: ctx.t("Usa come ritratto", "Use as portrait"),
      use: "portrait",
      selected: media.lookOf(ctx.state, id)?.portrait ?? "",
      onPick: (assetId) => setPortrait(assetId),
    }),
  );
  el.querySelector("[data-media-look-upload]")?.addEventListener("change", async (event) => {
    const files = takeFiles(event);
    if (!files.length) return;
    const [first] = await importFiles(ctx, files.slice(0, 1), { use: "portrait", where: "look" });
    if (!first) return;
    try {
      setPortrait(first.id);
      setNotice(
        "look",
        L(
          "Ritratto caricato nella cartella Ritratti e applicato.",
          "Portrait uploaded to the Portraits folder and applied.",
        ),
      );
      ctx.render();
    } catch (error) {
      setNotice("look", errorText(error), { error: true });
      ctx.render();
    }
  });
  el.querySelector("[data-media-look-remove]")?.addEventListener("click", () =>
    attempt(
      ctx,
      ctx.t(`Ritratto di ${actor.name} tolto`, `${actor.name}’s portrait removed`),
      (draft) => media.setPortrait(draft, ctx.role, id, null),
      actorOptions(ctx, id),
    ),
  );
  el.querySelector("[data-media-look-crop]")?.addEventListener("click", () => openCrop(ctx, id));
  el.querySelector("[data-media-look-variant]")?.addEventListener("click", () =>
    openAddVariant(ctx, id),
  );
  el.querySelectorAll('input[name="media-theme"]').forEach((input) =>
    input.addEventListener("change", () => {
      const applied = attempt(
        ctx,
        ctx.t(`Colore della scheda di ${actor.name}`, `${actor.name}’s sheet colour`),
        (draft) => media.setTheme(draft, ctx.role, id, input.value),
        actorOptions(ctx, id),
      );
      // A refused colour is not left selected: the swatches show what is stored.
      if (!applied) ctx.render();
      refocus('input[name="media-theme"]:checked');
    }),
  );
  // One border model (B12 token menu, DDB-117): open that menu's border colours for this
  // token at the Table.
  el.querySelector("[data-media-look-ring]")?.addEventListener("click", () =>
    openRingAtTable(ctx, id),
  );
  el.querySelectorAll("[data-media-look-fix]").forEach((button) =>
    button.addEventListener("click", () => {
      const art =
        button.dataset.mediaLookFix === "portrait"
          ? media.portraitArt(ctx.state, id)
          : media.tokenArt(ctx.state, id);
      openMissing(ctx, {
        kind:
          button.dataset.mediaLookFix === "portrait" || art.source === "portrait"
            ? "portrait"
            : "variant",
        actorId: id,
        variantId: art.variantId,
        name: art.missing?.name,
        label: L(`scheda di ${actor.name}`, `${actor.name}’s sheet`),
      });
    }),
  );
}

/**
 * The token border belongs to the token menu (B12, DDB-117). From the sheet, go to the
 * Table with this actor's token selected; the navigate handler then opens that menu's
 * border colours (its command and item) once the Table is on screen.
 */
let pendingRing = null;
function openRingAtTable(ctx, actorId) {
  pendingRing = actorId;
  ctx.navigate("table", { id: actorId });
}
function openRing(ctx, actorId) {
  if (!ctx || ctx.view?.page !== "table") return;
  const reg = ctx.registry;
  const open = reg?.get("command", "token-menu.open", ctx);
  if (!open || !reg.run(open, ctx)) return;
  const scene = ctx.state.scenes?.find((row) => row.id === ctx.state.activeSceneId);
  const target = {
    actorId,
    tokenId: scene?.tokens?.find((token) => token.actorId === actorId)?.id ?? null,
    sceneId: scene?.id ?? null,
  };
  const ring = reg.get("token-menu", "token-menu-ring", ctx, target);
  if (ring) reg.run(ring, ctx, target);
}

// ---------------------------------------------------------------- campaign attachments

/** Kanka CMP-28: each attachment's own visibility, changeable by whoever can remove it. */
function visibilitySelect(ctx, row) {
  const options = Object.entries(media.VISIBILITIES).filter(
    ([value]) => value !== "self" || row.addedBy === ctx.role,
  );
  return `<label class="media-inline-field media-attachment-visibility"><span class="media-sr">${ctx.esc(ctx.t(`Chi vede «${row.asset.name}»`, `Who sees “${row.asset.name}”`))}</span><select data-media-attachment-visibility="${ctx.esc(row.id)}" aria-label="${ctx.esc(ctx.t(`Chi vede «${row.asset.name}»`, `Who sees “${row.asset.name}”`))}">${options.map(([value, label]) => `<option value="${value}" ${value === row.visibility ? "selected" : ""}>${ctx.esc(ctx.label(label))}</option>`).join("")}</select></label>`;
}
function attachmentRows(ctx, entryId) {
  const rows = media.attachmentsFor(ctx.state, entryId, ctx.role);
  if (!rows.length) return "";
  return `<ul class="media-attachments">${rows
    .map((row) =>
      row.asset
        ? `<li class="media-attachment">${thumb(ctx, row.asset)}<span><strong>${ctx.esc(row.asset.name)}</strong><small>${row.canChangeVisibility ? "" : ctx.esc(ctx.label(media.VISIBILITIES[row.visibility]))}${row.asset.provenance ? `${row.canChangeVisibility ? "" : " · "}${ctx.esc(creditText(ctx, row.asset))}` : ""}</small>${row.waitingShare ? `<small class="media-waiting">${ctx.t("Per ora lo vedi solo tu: gli altri lettori lo vedranno quando condividi il file con provenienza e licenza.", "Only you see it for now: the other readers will see it once you share the file with its source and licence.")}</small>` : ""}</span><span class="media-attachment-actions">${row.canChangeVisibility ? visibilitySelect(ctx, row) : ""}<button type="button" class="button quiet" data-media-attachment-open="${ctx.esc(row.id)}">${ctx.t("Apri", "Open")}</button>${row.canRemove ? `<button type="button" class="button quiet" data-media-attachment-remove="${ctx.esc(row.id)}">${ctx.t("Togli", "Remove")}</button>` : ""}</span></li>`
        : `<li class="media-attachment is-missing"><span class="media-thumb is-missing" aria-hidden="true">!</span><span><strong>${ctx.t("File mancante", "Missing file")}</strong><small>${ctx.esc(ctx.t(`«${row.missing.name || "file"}» è stato eliminato`, `“${row.missing.name || "file"}” was deleted`))} · ${ctx.esc(ctx.label(media.VISIBILITIES[row.visibility]))}</small></span>${row.canRemove ? `<button type="button" class="button quiet" data-media-attachment-remove="${ctx.esc(row.id)}">${ctx.t("Togli il riferimento", "Remove the reference")}</button>` : ""}</li>`,
    )
    .join("")}</ul>`;
}
function renderAttachmentsSection(ctx) {
  let entries = [];
  try {
    entries = listCampaignEntries(ctx.state, { campaignId: ctx.state.campaign?.id }, ctx.role);
  } catch {
    entries = [];
  }
  const rows = entries.filter(
    (entry) =>
      media.attachmentsFor(ctx.state, entry.id, ctx.role).length || entry.permissions.canEdit,
  );
  return `<section class="media-attachments-page" data-media-attachments-page><header class="campaign-heading"><div><h1 tabindex="-1">${ctx.t("Allegati", "Attachments")}</h1><p class="muted">${ctx.t("Immagini e PDF collegati alle voci della campagna. Ogni allegato ha la sua visibilità.", "Images and PDFs linked to campaign entries. Each attachment has its own visibility.")}</p></div></header>${renderNotice(ctx, "attachments")}${
    rows.length
      ? rows
          .map(
            (entry) =>
              `<article class="campaign-row media-entry-row"><div class="media-grow"><h2>${ctx.esc(entryLabel(ctx, entry))}</h2>${attachmentRows(ctx, entry.id) || `<p class="muted">${ctx.t("Nessun allegato.", "No attachments.")}</p>`}</div><div class="toolbar"><button type="button" class="button quiet" data-media-entry-open="${ctx.esc(entry.id)}" data-media-entry-kind="${ctx.esc(entry.kind)}">${ctx.t("Apri la voce", "Open the entry")}</button>${entry.permissions.canEdit ? `<button type="button" class="button" data-media-attach="${ctx.esc(entry.id)}">${ctx.t("Allega un file", "Attach a file")}</button>` : ""}</div></article>`,
          )
          .join("")
      : `<p class="campaign-empty">${ctx.t("Nessuna voce con allegati visibili a te.", "No entry with attachments visible to you.")}</p>`
  }</section>`;
}
function renderEntryAttachments(ctx, entry) {
  const list = attachmentRows(ctx, entry.id);
  const canAttach = media.canAttachTo(ctx.state, entry.id, ctx.role);
  if (!list && !canAttach) return "";
  return `<section class="campaign-links media-entry-attachments" data-media-entry-panel="${ctx.esc(entry.id)}"><h2>${ctx.t("Allegati", "Attachments")}</h2>${renderNotice(ctx, "attachments")}${list || `<p class="muted">${ctx.t("Nessun allegato.", "No attachments.")}</p>`}${canAttach ? `<button type="button" class="button" data-media-attach="${ctx.esc(entry.id)}">${ctx.t("Allega un file", "Attach a file")}</button>` : ""}</section>`;
}
function bindAttachments(el, ctx) {
  bindNotice(el, ctx);
  const find = (id) => media.mediaOf(ctx.state)?.attachments.find((row) => row.id === id);
  el.querySelectorAll("[data-media-attachment-open]").forEach((button) =>
    button.addEventListener("click", () => {
      const row = find(button.dataset.mediaAttachmentOpen);
      const asset = row && media.findAsset(ctx.state, row.assetId);
      if (asset) openViewer(ctx, asset);
    }),
  );
  el.querySelectorAll("[data-media-attachment-remove]").forEach((button) =>
    button.addEventListener("click", () => {
      const row = find(button.dataset.mediaAttachmentRemove);
      attempt(
        ctx,
        ctx.t("Allegato tolto", "Attachment removed"),
        (draft) => media.detach(draft, ctx.role, button.dataset.mediaAttachmentRemove),
        row ? rowOptions(ctx, row) : {},
      );
    }),
  );
  el.querySelectorAll("[data-media-attachment-visibility]").forEach((select) =>
    select.addEventListener("change", () =>
      changeVisibility(ctx, select.dataset.mediaAttachmentVisibility, select.value),
    ),
  );
  el.querySelectorAll("[data-media-attach]").forEach((button) =>
    button.addEventListener("click", () => openAttach(ctx, button.dataset.mediaAttach)),
  );
  el.querySelectorAll("[data-media-entry-open]").forEach((button) =>
    button.addEventListener("click", () =>
      ctx.navigate(button.dataset.mediaEntryKind === "note" ? "notes" : "campaign", {
        tab: "entry",
        id: button.dataset.mediaEntryOpen,
      }),
    ),
  );
}
/** Commit options of an attachment change: private when only the viewer reads the entry. */
const rowOptions = (ctx, row) => attachOptions(ctx, row.entryId, row.visibility);
/**
 * Changes an attachment's visibility (Kanka CMP-28). Showing a personal file to the entry's
 * other readers shares it: that asks for provenance, licence and confirmation first.
 */
function changeVisibility(ctx, attachmentId, visibility) {
  const row = media.mediaOf(ctx.state)?.attachments.find((value) => value.id === attachmentId);
  if (!row) return;
  const asset = media.findAsset(ctx.state, row.assetId);
  const label = ctx.t(
    `Allegato «${asset?.name ?? ""}»: ${media.VISIBILITIES[visibility]?.it ?? ""}`,
    `Attachment “${asset?.name ?? ""}”: ${media.VISIBILITIES[visibility]?.en ?? ""}`,
  );
  // Readers losing or gaining the file is shared; a DM-only side keeps its label private.
  const options = isPrivateEntry(ctx, row.entryId)
    ? { local: true }
    : [row.visibility, visibility].includes("dm")
      ? { visibility: "private" }
      : {};
  const done = L(
    `Visibilità dell’allegato: ${media.VISIBILITIES[visibility]?.it}.`,
    `Attachment visibility: ${media.VISIBILITIES[visibility]?.en}.`,
  );
  if (
    visibility === "readers" &&
    asset?.owner === ctx.role &&
    media.readersNeedShare(ctx.state, row.entryId, asset, ctx.role)
  ) {
    // The select shows the stored value while the dialog asks.
    ctx.render();
    ctx.dialog(
      ctx.t(`Mostrare «${asset.name}» ai lettori?`, `Show “${asset.name}” to the readers?`),
      `<p class="muted">${ctx.t("Altri leggono questa voce: per mostrare loro il file lo condividi con la campagna, con provenienza e licenza.", "Others read this entry: to show them the file you share it with the campaign, with its source and licence.")}</p>${provenanceFields(ctx, asset.provenance, { share: true })}`,
      {
        submitLabel: ctx.t("Condividi e mostra", "Share and show"),
        onSubmit: (form) => {
          ctx.commit(label, (draft) =>
            media.setAttachmentVisibility(draft, ctx.role, attachmentId, "readers", {
              provenance: form.get("media-source") ? provenanceFrom(form) : null,
              share: form.get("media-share") === "on",
            }),
          );
          setNotice("attachments", done);
          ctx.render();
        },
      },
    );
    return;
  }
  const applied = attempt(
    ctx,
    label,
    (draft) => media.setAttachmentVisibility(draft, ctx.role, attachmentId, visibility),
    options,
  );
  if (applied) setNotice("attachments", done);
  ctx.render();
  refocus(byData("media-attachment-visibility", attachmentId));
}
/**
 * Attach dialog: choose a file and its visibility. On an entry only the viewer reads, the
 * default is "Only me". Provenance, licence and the share confirmation appear only when
 * the choice would share a personal file with the campaign.
 */
function openAttach(ctx, entryId, { selected = "" } = {}) {
  let entry;
  try {
    entry = getCampaignEntry(ctx.state, entryId, ctx.role);
  } catch {
    return;
  }
  const initial = defaultVisibility(ctx, entry);
  const others = !isPrivateEntry(ctx, entryId);
  ctx.dialog(
    ctx.t(`Allega a «${entryLabel(ctx, entry)}»`, `Attach to “${entryLabel(ctx, entry)}”`),
    `${pickerBody(ctx, { kind: "", accept: ACCEPT, selected })}<fieldset class="media-visibility"><legend>${ctx.t("Chi vede l’allegato", "Who sees the attachment")}</legend>${others ? "" : `<p class="muted">${ctx.t("Questa voce la leggi solo tu.", "Only you read this entry.")}</p>`}${Object.entries(
      media.VISIBILITIES,
    )
      .map(
        ([value, label]) =>
          `<label class="media-check"><input type="radio" name="media-visibility" value="${value}" ${value === initial ? "checked" : ""}> ${ctx.esc(ctx.label(label))}</label>`,
      )
      .join(
        "",
      )}</fieldset><div data-media-attach-provenance hidden><p class="muted">${ctx.t("Questo file non è ancora condiviso e altri leggono la voce: per mostrarlo a loro lo condividi con la campagna, con provenienza e licenza.", "This file is not shared yet and others read the entry: to show it to them you share it with the campaign, with its source and licence.")}</p>${provenanceFields(ctx, null, { share: true })}</div>`,
    {
      submitLabel: ctx.t("Allega", "Attach"),
      onSubmit: (form) => {
        const assetId = form.get("media-asset");
        if (!assetId)
          throw media.refusal(
            "Scegli un file dall’elenco o caricane uno.",
            "Choose a file from the list or upload one.",
          );
        const visibility = form.get("media-visibility");
        ctx.commit(
          ctx.t("File allegato alla voce", "File attached to the entry"),
          (draft) =>
            media.attach(draft, ctx.role, entryId, assetId, visibility, {
              provenance: form.get("media-source") ? provenanceFrom(form) : null,
              share: form.get("media-share") === "on",
            }),
          attachOptions(ctx, entryId, visibility),
        );
        setNotice(
          "attachments",
          L(
            `Allegato aggiunto · ${media.VISIBILITIES[visibility].it}.`,
            `Attachment added · ${media.VISIBILITIES[visibility].en}.`,
          ),
        );
        ctx.render();
      },
    },
  );
  // Listeners go on this dialog's own form, which the next dialog replaces: they never
  // pile up on the persistent #dialog element.
  const form = document.querySelector("#dialog form");
  const box = form.querySelector("[data-media-attach-provenance]");
  let filledFor = null;
  const update = () => {
    const picked = form.querySelector('input[name="media-asset"]:checked');
    const asset = picked ? media.findAsset(ctx.state, picked.value) : null;
    const visibility = form.querySelector('input[name="media-visibility"]:checked')?.value;
    box.hidden = !(
      asset?.owner === ctx.role &&
      visibility === "readers" &&
      media.readersNeedShare(ctx.state, entryId, asset, ctx.role)
    );
    // Saved provenance fills the fields for review; it never shares the file by itself.
    if (asset && asset.id !== filledFor) {
      filledFor = asset.id;
      const p = asset.owner === ctx.role ? (asset.provenance ?? {}) : {};
      for (const [name, value] of [
        ["media-source", p.source],
        ["media-author", p.author],
        ["media-license", p.license],
        ["media-link", p.link],
      ])
        form.querySelector(`[name="${name}"]`).value = value ?? "";
    }
  };
  form.addEventListener("change", update);
  update();
  bindPicker(ctx, form, {
    onUpload: async (files) => {
      ctx.closeDialog();
      const [first] = await importFiles(ctx, files, { where: "attachments" });
      // Like the file picker: the new file comes back preselected.
      openAttach(ctx, entryId, { selected: first?.id ?? selected });
    },
  });
}
