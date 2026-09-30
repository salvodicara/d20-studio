// B28: media library. Domain rules (files, folders, tags, provenance, used-in, portraits,
// token images and crop, alternative images, scene maps, attachments, missing references,
// personal PDF notes) and the area's UI handlers through the real registry and store.
// Synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { canControlActor } from "../character-access.mjs";
import { esc, icon } from "../ui.mjs";
import { renderTable, resetTableView } from "../table.mjs";
import { renderCharacters } from "../characters.mjs";
import { renderCampaign, resetCampaignView } from "../campaign.mjs";
import { renderLibrary } from "../library.mjs";
import { validateSceneDraft } from "../preparation.mjs";
import * as content from "../campaign-content.mjs";
import * as M from "../media-domain.mjs";
import { register, actions, portraitRules, submitForm, usageReady } from "../media.mjs";
import { readFileSync } from "node:fs";
import * as handouts from "../handouts-domain.mjs";
import {
  ui,
  resetUI,
  bindTokenChoices,
  renderTokenChoices,
  renderNotice,
  bindNotice,
  creditText,
  importFiles,
  takeFiles,
  tokenRing,
  lockChip,
  unlockImport,
  pickerBody,
  actorOptions,
  sceneOptions,
} from "../media-ui.mjs";
import { artLayer, missingLayer, renderDock, bindDock } from "../media-table.mjs";

const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};
function makeRegistry() {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  registry.use("media", register);
  return registry;
}
/** A ctx backed by the real store: commits, local/private options, snapshot Undo, offline. */
function harness({ role = "player", lang = "it", storage = memory() } = {}) {
  resetUI();
  resetTableView();
  const registry = makeRegistry();
  const store = createStore({ storage });
  registry.initState(store.state);
  const toasts = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    view: { page: "home", id: "", tab: "" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object" ? (value[ctx.lang] ?? value.it) : String(value ?? ""),
    esc,
    icon,
    toasts,
    renders: 0,
    toast: (text, error = false) => toasts.push({ text, error }),
    render: () => (ctx.renders += 1),
    navigate: (page, params = {}) =>
      (ctx.view = { page, id: params.id ?? "", tab: params.tab ?? "" }),
    dialogs: 0,
    dialog: () => (ctx.dialogs += 1),
    closeDialog: () => {},
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    // Set to "write" to simulate a browser storage that refuses the next saves.
    storageError: "",
    commit(label, mutator, options = {}) {
      if (ctx.offline && !options.local)
        throw Object.assign(Error("offline"), {
          it: "Sei senza rete: questa modifica condivisa non può essere applicata.",
          en: "You are offline: this shared change cannot be applied.",
        });
      const before = store.state;
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      return { applied: true, persisted: !ctx.storageError };
    },
    undo() {
      const current = store.state;
      store.undo(ctx.role);
      registry.afterUndo(current, store.state);
      ctx.storageError = "";
      registry.emitStateEvents(current, store.state, { kind: "correction" });
    },
    registry,
  };
  registry.attach(ctx);
  return { ctx, store, registry, storage };
}
const as = (ctx, role) => {
  ctx.role = role;
  return ctx;
};
// A PNG data URL (8-byte signature + filler); the browser measures real dimensions.
const PNG =
  "data:image/png;base64," +
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(64).fill(7)]).toString(
    "base64",
  );
const PNG2 =
  "data:image/png;base64," +
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(80).fill(9)]).toString(
    "base64",
  );
const PDF =
  "data:application/pdf;base64," + Buffer.from("%PDF-1.4\n/Type /Page\n").toString("base64");
const upload = (ctx, extra = {}) => {
  let id;
  ctx.commit(
    "upload",
    (draft) => {
      id = M.addAsset(draft, ctx.role, {
        name: "Livia sul ponte",
        fileName: "livia-ponte.png",
        dataUrl: PNG,
        width: 64,
        height: 64,
        use: "portrait",
        tags: "livia, ponte",
        ...extra,
      });
    },
    { local: true },
  );
  return id;
};
const head = (bytes) => new Uint8Array(bytes);

// ---------------------------------------------------------------- seed and access

test("seed: each identity browses its own files plus files shared with the campaign", () => {
  const { ctx } = harness();
  const names = (role) =>
    M.visibleAssets(ctx.state, role)
      .map((a) => a.name)
      .sort();
  assert.deepEqual(names("player"), [
    "Appunti di Livia",
    "Lettera sigillata",
    "Livia incappucciata",
    "Livia — ritratto",
    "Mira — schizzo",
  ]);
  // The DM never browses the player's personal files (Roll20 per-user library).
  assert.ok(!names("dm").includes("Livia — ritratto"));
  assert.ok(!names("dm").includes("Appunti di Livia"));
  assert.ok(names("dm").includes("Cortile al tramonto"));
  // Each identity has 1 MB; every identity's files together fit 1.5 MB in this browser.
  assert.equal(M.quota(ctx.state, "player").limit, 1024 * 1024);
  assert.equal(M.quota(ctx.state, "player").browser.limit, 1536 * 1024);
  assert.ok(M.quota(ctx.state, "player").used > 10000);
  assert.ok(M.quota(ctx.state, "player").browser.used > M.quota(ctx.state, "player").used);
  assert.deepEqual(
    M.foldersFor(ctx.state, "dm").map((f) => M.folderName(f, "it")),
    ["Ritratti", "Pedine", "Mappe", "Oggetti di scena", "Documenti", "Capitolo 1 — Bruma"],
  );
  assert.equal(M.foldersFor(ctx.state, "player").length, 5);
});

test("local files: unsupported, empty, oversized, disguised and tiny files are refused with a reason", () => {
  const reason = (fn) => {
    try {
      fn();
    } catch (error) {
      return error;
    }
    assert.fail("not refused");
  };
  let error = reason(() => M.checkFile({ name: "note.txt", type: "text/plain", size: 20 }));
  assert.equal(error.code, "type");
  assert.match(error.it, /«note\.txt» non è un’immagine PNG, JPEG o WebP né un PDF/);
  assert.match(error.en, /“note\.txt” is not a PNG, JPEG or WebP image, nor a PDF/);
  assert.equal(
    reason(() => M.checkFile({ name: "vuoto.png", type: "image/png", size: 0 })).code,
    "empty",
  );
  error = reason(() => M.checkFile({ name: "grande.png", type: "image/png", size: 900 * 1024 }));
  assert.equal(error.code, "size");
  assert.match(error.it, /pesa 900 KB: in questa dimostrazione il limite è 500 KB per file/);
  error = reason(() =>
    M.checkFile({
      name: "finto.png",
      type: "image/png",
      size: 10,
      head: head([0x25, 0x50, 0x44, 0x46, 0x2d]),
    }),
  );
  assert.equal(error.code, "mismatch");
  assert.match(error.it, /dichiara il formato PNG ma il contenuto non corrisponde/);
  assert.equal(reason(() => M.checkDimensions("mini.png", 8, 8)).code, "dimensions");
  // Extension-only files (no MIME type) are recognized; magic bytes are checked.
  assert.equal(M.declaredType("mappa.JPG", ""), "image/jpeg");
  assert.deepEqual(
    M.checkFile({ name: "mappa.jpg", type: "", size: 10, head: head([0xff, 0xd8, 0xff, 0xe0]) }),
    { mime: "image/jpeg", kind: "image" },
  );
  assert.equal(
    M.sniff(head([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50])),
    "image/webp",
  );
  assert.equal(M.countPdfPages("/Type /Pages /Type /Page x /Type /Page"), 2);
});

test("upload: a portrait lands in Ritratti with tags as a private local change; quota is enforced", () => {
  const { ctx } = harness();
  const id = upload(ctx);
  const asset = M.findAsset(ctx.state, id);
  assert.equal(asset.folderId, "f-portrait");
  assert.deepEqual(asset.tags, ["livia", "ponte"]);
  assert.equal(asset.owner, "player");
  assert.equal(asset.shared, false);
  assert.equal(ctx.state.log.at(-1).visibility, "private");
  assert.ok(!M.visibleAssets(ctx.state, "dm").some((a) => a.id === id));
  // Search matches name and tags (FVT-185 / R20-189).
  assert.deepEqual(
    M.visibleAssets(ctx.state, "player", { query: "PONTE" }).map((a) => a.id),
    [id],
  );
  assert.throws(() => upload(ctx, { use: "document" }), /Choose what the file is/);
  assert.throws(
    () => upload(ctx, { tags: "a,b,c,d,e,f,g,h,i" }),
    (e) => e.code === "tags",
  );
  // Quota: a file that would exceed the demo quota is refused with the space used.
  const big =
    "data:image/png;base64," +
    Buffer.from([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
      ...Array(490 * 1024).fill(1),
    ]).toString("base64");
  upload(ctx, { dataUrl: big, name: "grande 1" });
  upload(ctx, { dataUrl: big, name: "grande 2" });
  assert.throws(
    () => upload(ctx, { dataUrl: big, name: "troppo" }),
    (e) => e.code === "quota" && /Spazio esaurito: .* usati su 1 MB/.test(e.it),
  );
  // The browser total: the DM's files and the player's share the same local storage.
  as(ctx, "dm");
  upload(ctx, { dataUrl: big, name: "grande DM" });
  assert.throws(
    () => upload(ctx, { dataUrl: big, name: "troppo DM" }),
    (e) => e.code === "quota" && /Spazio di questo browser esaurito/.test(e.it),
  );
});

// ---------------------------------------------------------------- portrait, token, crop

test("portrait from the library shows on the sheet and becomes the circular token at the Table", () => {
  const { ctx } = harness();
  ctx.commit("portrait", (d) => M.setPortrait(d, "player", "livia", "m-livia-portrait"));
  const art = M.tokenArt(ctx.state, "livia");
  assert.equal(art.source, "portrait");
  assert.equal(art.asset.id, "m-livia-portrait");
  assert.deepEqual(art.crop, { x: 0.5, y: 0.5, zoom: 1 });
  // Table: the art layer fills Livia's token circle with a pattern; same for the DM.
  for (const role of ["player", "dm"]) {
    as(ctx, role);
    const scene = ctx.state.scenes[0];
    const layer = artLayer(ctx, { scene, selectedActorId: "livia" });
    assert.match(layer, /<pattern id="media-art-livia"/);
    assert.match(
      layer,
      /\.map-token\[data-actor="livia"\] \.token-display > circle:first-child\{fill:url\(#media-art-livia\)/,
    );
    assert.match(layer, /\.table-inspector \.inspector-person \.portrait\{background:url\(/);
    const table = renderTable({ ...ctx, view: { page: "table" } });
    assert.match(table, /data-ext-slot="map-layer:media-art"/);
  }
  as(ctx, "player");
  // Sheet: Appearance tab (DDB-058) with the portrait; header/card portrait via area CSS.
  const sheet = renderCharacters({
    ...ctx,
    view: { page: "characters", id: "livia", tab: "media" },
  });
  assert.match(sheet, /data-character-tab="media"[^>]*>Aspetto/);
  assert.match(sheet, /alt="Ritratto di Livia"/);
  ctx.commit("theme", (d) => M.setTheme(d, "player", "livia", "emerald"));
  const css = portraitRules({ ...ctx, view: { page: "characters", id: "livia" } });
  assert.match(css, /#content\{--accent:#8fc48a;--focus:#8fc48a\}/);
  assert.ok(!portraitRules({ ...ctx, view: { page: "table", id: "" } }).includes("--accent"));
  assert.throws(
    () => M.setTheme(structuredClone(ctx.state), "player", "livia", "neon"),
    (e) => e.code === "theme",
  );
  assert.match(css, /\.character-heading \.character-portrait/);
  assert.match(css, /\.character-card:has\(\[data-actor="livia"\]\) \.character-portrait/);
  // A player cannot change a sheet they do not control.
  assert.throws(
    () => ctx.commit("x", (d) => M.setPortrait(d, "player", "goblin-1", "m-livia-portrait")),
    /Only whoever controls the sheet/,
  );
});

test("circular crop: geometry keeps the circle covered; invalid crops are refused", () => {
  const square = { width: 100, height: 100 };
  assert.deepEqual(M.cropGeometry(square, { x: 0.5, y: 0.5, zoom: 1 }), { x: 0, y: 0, w: 1, h: 1 });
  assert.deepEqual(M.cropGeometry(square, { x: 0.5, y: 0.5, zoom: 2 }), {
    x: -0.5,
    y: -0.5,
    w: 2,
    h: 2,
  });
  // Off-centre focus is clamped so no empty edge appears in the circle.
  assert.deepEqual(M.cropGeometry(square, { x: 0, y: 1, zoom: 2 }), { x: 0, y: -1, w: 2, h: 2 });
  const wide = { width: 200, height: 100 };
  assert.deepEqual(M.cropGeometry(wide, { x: 0.5, y: 0.5, zoom: 1 }), {
    x: -0.5,
    y: 0,
    w: 2,
    h: 1,
  });
  assert.deepEqual(M.cropBackground(square, { x: 0.5, y: 0.5, zoom: 2 }), {
    size: "200% 200%",
    position: "50% 50%",
  });
  const { ctx } = harness();
  ctx.commit("portrait", (d) => M.setPortrait(d, "player", "livia", "m-livia-portrait"));
  ctx.commit("crop", (d) =>
    M.setTokenCrop(d, "player", "livia", "portrait", { x: 0.5, y: 0.3, zoom: 1.6 }),
  );
  assert.deepEqual(M.tokenArt(ctx.state, "livia").crop, { x: 0.5, y: 0.3, zoom: 1.6 });
  assert.throws(
    () =>
      ctx.commit("crop", (d) =>
        M.setTokenCrop(d, "player", "livia", "portrait", { x: 2, y: 0, zoom: 1 }),
      ),
    (e) => e.code === "crop",
  );
});

test("owner picks a second token image; the DM also can; others cannot (Changr VTL-104)", () => {
  const { ctx } = harness();
  ctx.commit("portrait", (d) => M.setPortrait(d, "player", "livia", "m-livia-portrait"));
  let variant;
  ctx.commit("variant", (d) => {
    variant = M.addTokenVariant(d, "player", "livia", "m-livia-hood", "Incappucciata");
  });
  assert.equal(M.tokenArt(ctx.state, "livia").source, "portrait");
  // The owner clicks the thumbnail: a DOM double runs the real bind handler.
  const html = renderTokenChoices(ctx, "livia");
  assert.match(html, /aria-pressed="true"[^>]*>.*Ritratto/s);
  const root = mount(html);
  bindTokenChoices(root, ctx, "livia");
  root.click(`[data-media-token="${variant}"]`);
  assert.equal(M.tokenArt(ctx.state, "livia").asset.id, "m-livia-hood");
  assert.equal(M.tokenArt(ctx.state, "livia").label, "Incappucciata");
  // The DM (who can control campaign sheets) can switch back; the player cannot touch goblins.
  ctx.commit("dm", (d) => M.setActiveToken(d, "dm", "livia", "portrait"));
  assert.equal(M.tokenArt(ctx.state, "livia").source, "portrait");
  assert.throws(() =>
    M.setActiveToken(structuredClone(ctx.state), "player", "goblin-1", "v-goblin-1-b"),
  );
  // Seeded goblin: the DM switches the sentry to its wounded image.
  ctx.commit("dm", (d) => M.setActiveToken(d, "dm", "goblin-1", "v-goblin-1-b"));
  assert.equal(M.tokenArt(ctx.state, "goblin-1").asset.id, "m-goblin-wounded");
});

// ---------------------------------------------------------------- used in, replace, delete

test("used in lists the sheet and the token; replacing updates both at once", () => {
  const { ctx } = harness();
  ctx.commit("portrait", (d) => M.setPortrait(d, "player", "livia", "m-livia-portrait"));
  const uses = M.usagesOf(ctx.state, "m-livia-portrait", "player");
  // The token row names every scene with Livia's token: the courtyard first; the sample data
  // may add more scenes after it (R4 round 2 adds «Agguato sulla strada»).
  const labels = uses.rows.map((r) => r.label.it);
  assert.equal(labels.length, 2);
  assert.equal(labels[0], "Ritratto nella scheda di Livia");
  assert.match(
    labels[1],
    /^Pedina di Livia \(dal ritratto\) · Il cortile dell’osservatorio(, .+)?$/,
  );
  assert.deepEqual(uses.rows[0].route, {
    page: "characters",
    params: { id: "livia", tab: "media" },
  });
  ctx.commit("replace", (d) =>
    M.replaceAsset(d, "player", "m-livia-portrait", {
      fileName: "nuova.png",
      dataUrl: PNG2,
      width: 64,
      height: 64,
    }),
  );
  const asset = M.findAsset(ctx.state, "m-livia-portrait");
  assert.equal(asset.revision, 2);
  assert.equal(M.portraitArt(ctx.state, "livia").asset.dataUrl, PNG2);
  assert.equal(M.tokenArt(ctx.state, "livia").asset.dataUrl, PNG2);
  // Only the uploader edits the file itself.
  assert.throws(
    () => M.replaceAsset(structuredClone(ctx.state), "dm", "m-letter-x", {}),
    (e) => e.code === "missing",
  );
  assert.throws(
    () => M.updateAsset(structuredClone(ctx.state), "player", "m-letter", { name: "x" }),
    (e) => e.code === "owner",
  );
});

test("deleting a used image: the token reports the missing file with actions; Undo restores", () => {
  const { ctx, store } = harness();
  ctx.commit("portrait", (d) => M.setPortrait(d, "player", "livia", "m-livia-portrait"));
  ctx.commit("delete", (d) => M.deleteAsset(d, "player", "m-livia-portrait"));
  const art = M.tokenArt(ctx.state, "livia");
  assert.equal(art.asset, null);
  assert.deepEqual(art.missing, { name: "Livia — ritratto" });
  // Missing badge with an action on the Table (Owlbear VTL-240), for whoever controls it.
  const scene = ctx.state.scenes[0];
  assert.match(missingLayer(ctx, { scene }), /data-media-missing="livia"[^>]*role="button"/);
  assert.match(artLayer(ctx, { scene, selectedActorId: "livia" }), /stroke-dasharray:5 4/);
  // The same report in the library and as a notification.
  const refs = M.missingReferences(ctx.state, "player");
  assert.deepEqual(
    refs.map((r) => r.kind),
    ["portrait"],
  );
  const notes = ctx.registry.notifications(ctx);
  assert.equal(notes[0].title.it, "File mancante: Ritratto di Livia");
  assert.deepEqual(notes[0].target, { page: "characters", params: { id: "livia", tab: "media" } });
  // Undo restores the file and every reference.
  ctx.undo();
  assert.equal(M.tokenArt(ctx.state, "livia").asset.id, "m-livia-portrait");
  assert.equal(store.state.log.at(-1).kind, "correction");
  // Fixing: choose another image for the same use, or remove the reference.
  ctx.commit("delete", (d) => M.deleteAsset(d, "player", "m-livia-portrait"));
  ctx.commit("fix", (d) => M.setPortrait(d, "player", "livia", "m-livia-hood"));
  assert.equal(M.missingReferences(ctx.state, "player").length, 0);
  ctx.commit("portrait", (d) => M.setPortrait(d, "player", "livia", "m-mira"));
  ctx.commit("delete", (d) => M.deleteAsset(d, "player", "m-mira"));
  ctx.commit("clear", (d) => M.clearMissing(d, "player", { kind: "portrait", actorId: "livia" }));
  assert.equal(M.tokenArt(ctx.state, "livia"), null);
});

// ---------------------------------------------------------------- maps, attachments, sharing

test("scene map from the library passes the scene editor's own validation; deleting reports it", () => {
  const { ctx } = harness({ role: "dm" });
  assert.throws(
    () => M.setSceneMap(structuredClone(ctx.state), "player", "old-watch", "m-courtyard"),
    /Only the DM/,
  );
  ctx.commit("map", (d) => M.setSceneMap(d, "dm", "old-watch", "m-courtyard"));
  const scene = ctx.state.scenes[0];
  assert.equal(scene.background, M.findAsset(ctx.state, "m-courtyard").dataUrl);
  assert.equal(scene.imageWidth, 800);
  assert.deepEqual(validateSceneDraft(scene), []);
  assert.deepEqual(
    M.usagesOf(ctx.state, "m-courtyard", "dm").rows.map((r) => r.kind),
    ["scene"],
  );
  ctx.commit("delete", (d) => M.deleteAsset(d, "dm", "m-courtyard"));
  assert.equal(ctx.state.scenes[0].background, null);
  assert.equal(M.sceneMapState(ctx.state, "old-watch").status, "missing");
  assert.match(
    missingLayer(ctx, { scene: ctx.state.scenes[0] }),
    /Mappa mancante: «Cortile al tramonto»/,
  );
  // A new map chosen in the scene editor supersedes the broken link.
  ctx.commit("editor", (d) => (d.scenes[0].background = PNG));
  assert.equal(M.sceneMapState(ctx.state, "old-watch"), null);
});

test("DM-only attachment on a journal entry: readers never see it; it shows on the entry page", () => {
  const { ctx } = harness({ role: "dm" });
  ctx.commit("attach", (d) => M.attach(d, "dm", "legacy-recap-summary", "m-courtyard", "dm"));
  const dmRows = M.attachmentsFor(ctx.state, "legacy-recap-summary", "dm");
  assert.deepEqual(
    dmRows.map((r) => [r.asset.name, r.visibility]),
    [
      ["Lettera sigillata", "readers"],
      ["Cortile al tramonto", "dm"],
    ],
  );
  assert.deepEqual(
    M.attachmentsFor(ctx.state, "legacy-recap-summary", "player").map((r) => r.asset.name),
    ["Lettera sigillata"],
  );
  resetCampaignView();
  const view = { page: "campaign", tab: "entry", id: "legacy-recap-summary" };
  const dmPage = renderCampaign({ ...ctx, view });
  assert.match(dmPage, /data-ext-slot="campaign-section:media\.entry"/);
  assert.match(dmPage, /Cortile al tramonto/);
  assert.match(dmPage, /Solo DM/);
  as(ctx, "player");
  resetCampaignView();
  const playerPage = renderCampaign({ ...ctx, view });
  assert.match(playerPage, /Lettera sigillata/);
  assert.ok(!playerPage.includes("Cortile al tramonto"));
  assert.ok(!playerPage.includes("Allega un file"));
  // Players cannot attach to an entry they cannot edit.
  assert.throws(
    () => M.attach(structuredClone(ctx.state), "player", "legacy-recap-summary", "m-mira", "self"),
    (e) => e.code === "entry",
  );
  // The sidebar never lists the entry-level panel.
  const sections = ctx.registry.list("campaign-section", ctx).map((c) => c.id);
  assert.deepEqual(sections, ["media"]);
});

test("sharing requires provenance and licence (Roll20 SVC-138), also when attaching for readers", () => {
  const { ctx } = harness({ role: "dm" });
  assert.throws(
    () => ctx.commit("share", (d) => M.shareAsset(d, "dm", "m-courtyard", true)),
    (e) => e.code === "provenance" && /Per condividere indica la provenienza/.test(e.it),
  );
  assert.throws(
    () =>
      ctx.commit("a", (d) => M.attach(d, "dm", "legacy-recap-summary", "m-courtyard", "readers")),
    (e) => e.code === "share",
  );
  assert.throws(
    () =>
      ctx.commit("a", (d) =>
        M.attach(d, "dm", "legacy-recap-summary", "m-courtyard", "readers", { share: true }),
      ),
    (e) => e.code === "provenance" && e.field === "source",
  );
  assert.throws(
    () => M.checkProvenance({ source: "own", author: "DM", license: "CC BY", link: "ftp://x" }),
    /http/,
  );
  const provenance = {
    source: "licensed",
    author: "Studio Esempio",
    license: "CC BY 4.0",
    link: "https://example.org/cortile",
  };
  // Saved or typed provenance never shares by itself: the owner confirms in the same step.
  assert.throws(
    () =>
      ctx.commit("a", (d) =>
        M.attach(d, "dm", "legacy-recap-summary", "m-courtyard", "readers", { provenance }),
      ),
    (e) => e.code === "share" && e.field === "share",
  );
  assert.equal(M.findAsset(ctx.state, "m-courtyard").shared, false);
  ctx.commit("a", (d) =>
    M.attach(d, "dm", "legacy-recap-summary", "m-courtyard", "readers", {
      provenance,
      share: true,
    }),
  );
  const asset = M.findAsset(ctx.state, "m-courtyard");
  assert.equal(asset.shared, true);
  assert.deepEqual(asset.provenance, provenance);
  assert.ok(M.visibleAssets(ctx.state, "player").some((a) => a.id === "m-courtyard"));
  // Unsharing hides it from others' library; the player still cannot edit it.
  ctx.commit("unshare", (d) => M.shareAsset(d, "dm", "m-courtyard", false));
  assert.ok(!M.visibleAssets(ctx.state, "player").some((a) => a.id === "m-courtyard"));
});

test("personal PDF notes are readable only by their author", () => {
  const { ctx } = harness();
  ctx.commit("note", (d) => M.addAnnotation(d, "player", "m-livia-notes", 2, "Scudo pronto"), {
    local: true,
  });
  assert.deepEqual(
    M.annotationsFor(ctx.state, "m-livia-notes", "player").map((n) => [n.page, n.text]),
    [
      [1, "Chiedere a Doran del simbolo sul cancello."],
      [2, "Scudo pronto"],
    ],
  );
  assert.deepEqual(M.annotationsFor(ctx.state, "m-livia-notes", "dm"), []);
  assert.equal(M.canSeeAsset(ctx.state, M.findAsset(ctx.state, "m-livia-notes"), "dm"), false);
  assert.throws(
    () => M.addAnnotation(structuredClone(ctx.state), "player", "m-livia-notes", 3, "x"),
    (e) => e.code === "page",
  );
  assert.throws(
    () => M.addAnnotation(structuredClone(ctx.state), "player", "m-livia-portrait", 1, "x"),
    (e) => e.code === "kind",
  );
  // The DM's file page for the player's PDF says unavailable and leaks no note.
  as(ctx, "dm");
  ctx.view = { page: "media", id: "m-livia-notes", tab: "" };
  const page = ctx.registry.slot("route", "media", ctx);
  assert.match(page, /File non disponibile/);
  assert.ok(!page.includes("Scudo pronto"));
  const libraryPage = renderLibrary({ ...ctx, view: { page: "library", tab: "media", id: "" } });
  assert.ok(!libraryPage.includes("Appunti di Livia"));
  assert.ok(libraryPage.includes("Cortile al tramonto"));
});

test("private sheets: their portrait never reaches the DM's page styles", () => {
  const { ctx } = harness();
  ctx.commit("private", (d) => {
    d.actors.iria = {
      ...structuredClone(d.actors.livia),
      id: "iria",
      name: "Iria",
      visibility: "private",
      owner: "player",
      campaignIds: [],
    };
  });
  ctx.commit("portrait", (d) => M.setPortrait(d, "player", "iria", "m-mira"), { local: true });
  assert.match(portraitRules(ctx), /data-actor="iria"/);
  as(ctx, "dm");
  assert.ok(!portraitRules(ctx).includes("iria"));
  assert.throws(
    () => M.setPortrait(structuredClone(ctx.state), "dm", "iria", "m-courtyard"),
    /controls the sheet/,
  );
  // "Used in" counts the hidden use without naming it.
  as(ctx, "player");
  ctx.commit("share", (d) =>
    M.shareAsset(d, "player", "m-mira", true, {
      source: "own",
      author: "Giocatore",
      license: "Uso al tavolo",
    }),
  );
  const dmView = M.usagesOf(ctx.state, "m-mira", "dm");
  assert.equal(dmView.rows.length, 0);
  assert.equal(dmView.hidden, 2);
});

// ---------------------------------------------------------------- UI handlers

test("file page handlers commit, report in the notice, and respect offline and Undo", () => {
  const { ctx } = harness();
  assert.equal(actions.usePortrait(ctx, "m-livia-portrait", "livia"), true);
  assert.equal(ui.notice.where, "asset");
  assert.match(ui.notice.text.it, /«Livia — ritratto» è ora il ritratto di Livia/);
  assert.equal(actions.useToken(ctx, "m-livia-hood", "livia", false), true);
  assert.equal(M.lookOf(ctx.state, "livia").token.variants.length, 1);
  // Details: rename, retag, move to another folder.
  assert.equal(
    actions.saveDetails(ctx, "m-livia-hood", {
      name: "Livia di notte",
      tags: "livia, notte",
      folderId: "f-token",
      use: "token",
    }),
    true,
  );
  assert.equal(M.findAsset(ctx.state, "m-livia-hood").name, "Livia di notte");
  // Sharing without provenance: error notice, nothing changes.
  assert.equal(
    actions.provenance(ctx, "m-mira", "share", { source: "", author: "", license: "" }),
    false,
  );
  assert.equal(ui.notice.error, true);
  assert.equal(M.findAsset(ctx.state, "m-mira").shared, false);
  // Offline: personal notes work (local), shared changes are refused with the reason.
  ctx.offline = true;
  assert.equal(actions.addNote(ctx, "m-livia-notes", 1, "Offline ok"), true);
  assert.equal(actions.usePortrait(ctx, "m-mira", "livia"), false);
  assert.match(ui.notice.text.it, /Sei senza rete/);
  ctx.offline = false;
  // Delete: navigates to the library with an Undo notice; Undo brings the file back.
  actions.remove(ctx, "m-livia-portrait");
  assert.deepEqual([ctx.view.page, ctx.view.tab], ["library", "media"]);
  assert.equal(ui.notice.undo, true);
  assert.match(ui.notice.text.it, /2 usi segnalano ora il file mancante/);
  ctx.undo();
  assert.ok(M.findAsset(ctx.state, "m-livia-portrait"));
});

test("dock and library bind: type filter, folder navigation and token placement from the dock", () => {
  const { ctx } = harness({ role: "dm" });
  const scene = ctx.state.scenes[0];
  const table = { scene, selectedActorId: "goblin-2", svg: null };
  const html = renderDock(ctx, { scene, selectedActorId: "goblin-2" });
  assert.match(html, /Usa come mappa/);
  assert.match(html, /Sulla pedina di Esploratore/);
  const root = mount(html);
  bindDock(root, ctx, table);
  root.click('[data-media-dock-use="map"]');
  assert.equal(ui.dock.use, "map");
  root.click('[data-media-dock-token="m-goblin"]');
  assert.equal(M.tokenArt(ctx.state, "goblin-2").asset.id, "m-goblin");
  // Library section: the folder buttons change the view state and re-render.
  const section = ctx.registry.get("library-section", "media", ctx);
  const lib = mount(section.render(ctx));
  section.bind(lib, ctx);
  lib.click('[data-media-folder="f-dm-chapter-1"]');
  assert.equal(ui.library.folderId, "f-dm-chapter-1");
  assert.match(section.render(ctx), /Lettera sigillata/);
  assert.ok(!section.render(ctx).includes("Cortile al tramonto"));
});

test("folders, search provider and the notice's Undo button", () => {
  const { ctx } = harness();
  let folder;
  ctx.commit("folder", (d) => (folder = M.createFolder(d, "player", "Capitolo 2")), {
    local: true,
  });
  assert.throws(
    () => M.createFolder(structuredClone(ctx.state), "player", "ritratti"),
    (e) => e.code === "folders",
  );
  const id = upload(ctx, { folderId: folder });
  assert.equal(M.findAsset(ctx.state, id).folderId, folder);
  assert.throws(
    () => M.deleteFolder(structuredClone(ctx.state), "player", folder),
    (e) => e.code === "folder",
  );
  // Another identity's folder is not usable.
  assert.throws(
    () => upload(as(ctx, "dm"), { folderId: folder }),
    (e) => e.code === "folder",
  );
  as(ctx, "player");
  // Global search finds files by tag, only among the viewer's visible files.
  assert.deepEqual(
    ctx.registry.search(ctx, "ponte").map((r) => [r.title, r.page, r.params.id]),
    [["Livia sul ponte", "media", id]],
  );
  as(ctx, "dm");
  assert.deepEqual(ctx.registry.search(ctx, "ponte"), []);
  as(ctx, "player");
  // Deleting shows a notice whose Undo button runs the real Undo.
  actions.remove(ctx, id);
  assert.equal(ui.notice.undo, true);
  const root = mount(renderNotice(ctx, "library"));
  bindNotice(root, ctx);
  root.click("[data-media-undo]");
  assert.ok(M.findAsset(ctx.state, id));
  assert.equal(ui.notice, null);
});

test("state slice: persisted across reload, normalized, future versions refused", () => {
  const storage = memory();
  const first = harness({ storage });
  first.ctx.commit("portrait", (d) => M.setPortrait(d, "player", "livia", "m-livia-portrait"));
  const second = harness({ storage });
  assert.equal(M.tokenArt(second.ctx.state, "livia").asset.id, "m-livia-portrait");
  assert.throws(() => M.normalizeMedia({}, 2), /newer version/);
  const normalized = M.normalizeMedia(
    { assets: [{ id: "x", owner: "player", dataUrl: "javascript:1" }] },
    1,
  );
  assert.deepEqual(normalized.assets, []);
  assert.deepEqual(
    M.normalizeMedia(M.normalizeMedia(M.seedMedia(), 1), 1),
    M.normalizeMedia(M.seedMedia(), 1),
  );
});

// ---------------------------------------------------------------- review fixes (B28)

/** A campaign note of the player, private ("Solo io") unless another access is given. */
function playerNote(ctx, id, access = { mode: "private", grants: [] }) {
  let entryId;
  ctx.commit(
    "note",
    (draft) => {
      const d = content.createCampaignDraft(
        draft,
        { id, kind: "note", campaignId: draft.campaign.id },
        "player",
      );
      content.saveCampaignDraft(
        draft,
        id,
        {
          data: { ...d.data, title: "Segreto di Livia", body: "Solo per me." },
          access,
          expectedDraftRevision: d.revision,
        },
        "player",
      );
      entryId = content.applyCampaignDraft(
        draft,
        id,
        { reviewKey: content.previewCampaignDraft(draft, id, "player").reviewKey },
        "player",
      ).entryId;
    },
    { local: true },
  );
  return entryId;
}
const provenanceMap = (values) =>
  new Map(
    Object.entries({
      "media-source": "",
      "media-author": "",
      "media-license": "",
      "media-link": "",
      ...values,
    }),
  );
const fromMap = (form) => ({
  source: form.get("media-source"),
  author: form.get("media-author"),
  license: form.get("media-license"),
  link: form.get("media-link"),
});

test("review F1: a personal file attached to a private note stays personal; later readers wait for an explicit share", () => {
  const { ctx } = harness();
  const entryId = playerNote(ctx, "note-secret");
  assert.deepEqual(M.otherEntryReaders(ctx.state, entryId, "player"), []);
  // The file page defaults to "Only me" for an entry nobody else reads.
  ctx.view = { page: "media", id: "m-mira", tab: "" };
  const page = ctx.registry.slot("route", "media", ctx);
  assert.match(page, /data-private="true"[^>]*selected>Segreto di Livia · la leggi solo tu/);
  assert.match(page, /<option value="self" selected>Solo io<\/option>/);
  // "Everyone who can read the entry" on a private note does not share the file.
  ctx.commit("attach", (d) => M.attach(d, "player", entryId, "m-mira", "readers"), {
    local: true,
  });
  const row = M.mediaOf(ctx.state).attachments.at(-1);
  assert.deepEqual(row.audience, ["player"]);
  assert.equal(M.findAsset(ctx.state, "m-mira").shared, false);
  assert.equal(M.assetIsShared(ctx.state, "m-mira"), false);
  assert.ok(!M.visibleAssets(ctx.state, "dm").some((a) => a.id === "m-mira"));
  // The note is later shared with the campaign: the DM reads it, but not the personal file.
  ctx.commit("share note", (d) =>
    content.setCampaignEntryAccess(
      d,
      entryId,
      {
        access: { mode: "campaign", grants: [] },
        expectedAccessRevision: content.getCampaignEntry(d, entryId, "player").accessRevision,
      },
      "player",
    ),
  );
  assert.ok(content.getCampaignEntry(ctx.state, entryId, "dm"));
  assert.deepEqual(M.attachmentsFor(ctx.state, entryId, "dm"), []);
  assert.equal(M.attachmentsFor(ctx.state, entryId, "player")[0].waitingShare, true);
  // Showing a personal file to other readers asks for an explicit confirmation, even when
  // its provenance was saved before.
  const provenance = { source: "own", author: "Giocatore", license: "Uso al tavolo" };
  ctx.commit("prov", (d) => M.setProvenance(d, "player", "m-livia-hood", provenance), {
    local: true,
  });
  assert.throws(
    () => ctx.commit("attach", (d) => M.attach(d, "player", entryId, "m-livia-hood", "readers")),
    (e) => e.code === "share",
  );
  assert.equal(M.findAsset(ctx.state, "m-livia-hood").shared, false);
  ctx.commit("attach", (d) =>
    M.attach(d, "player", entryId, "m-livia-hood", "readers", { share: true }),
  );
  assert.equal(M.findAsset(ctx.state, "m-livia-hood").shared, true);
  assert.deepEqual(
    M.attachmentsFor(ctx.state, entryId, "dm").map((r) => r.asset.name),
    ["Livia incappucciata"],
  );
  // Once the first file is shared too, the held-back attachment follows the entry's readers.
  ctx.commit("share", (d) => M.shareAsset(d, "player", "m-mira", true, provenance));
  assert.equal(M.attachmentsFor(ctx.state, entryId, "dm").length, 2);
});

test("review F2: one token border — the sheet shows the token menu's colour and links to it", () => {
  const { ctx } = harness({ role: "dm" });
  ctx.commit("ring", (d) => {
    d.ext["token-menu"] ??= { tokens: {}, groups: {}, names: {} };
    d.ext["token-menu"].tokens["token-goblin-1"] = { ring: "blue" };
  });
  assert.deepEqual(tokenRing(ctx.state, "goblin-1"), {
    id: "blue",
    color: "#63a4e0",
    label: { it: "Blu", en: "Blue" },
  });
  assert.equal(tokenRing(ctx.state, "goblin-2"), null);
  // The art layer paints the image only: no second border colour competing with B12.
  const scene = ctx.state.scenes[0];
  assert.ok(!artLayer(ctx, { scene, selectedActorId: "goblin-1" }).includes("stroke"));
  assert.equal("frame" in M.tokenArt(ctx.state, "goblin-1"), false);
  assert.equal(M.setFrame, undefined);
  const actor = ctx.state.actors["goblin-1"];
  const tab = ctx.registry.get("sheet-tab", "media", ctx, actor);
  const html = tab.render({ ...ctx, view: { page: "characters", id: "goblin-1" } }, actor);
  assert.match(html, /data-media-ring="blue"/);
  assert.match(html, /Bordo della pedina: Blu/);
  assert.match(html, /stroke="#63a4e0"/);
  assert.match(html, /data-media-look-ring/);
  assert.ok(!html.includes('name="media-frame"'));
  // The link goes to the Table with the goblin selected.
  const root = mount(html);
  tab.bind(root, ctx);
  root.click("[data-media-look-ring]");
  assert.equal(ctx.view.page, "table");
});

test("review F3: the delete notice's Undo reverts only its own delete", () => {
  const { ctx } = harness();
  actions.remove(ctx, "m-livia-hood");
  assert.equal(ui.notice.undo, true);
  // A later change: the notice keeps its text but no longer offers Undo.
  ctx.commit("folder", (d) => M.createFolder(d, "player", "Prova undo"), { local: true });
  assert.equal(ui.notice.undo, false);
  assert.ok(!renderNotice(ctx, "library").includes("data-media-undo"));
  assert.match(renderNotice(ctx, "library"), /Livia incappucciata/);
  // Any Undo (a correction) retires the notice.
  ctx.undo();
  assert.equal(ui.notice, null);
  // A stale button, rendered before a later change, refuses instead of undoing that change.
  actions.remove(ctx, "m-mira");
  const root = mount(renderNotice(ctx, "library"));
  bindNotice(root, ctx);
  ctx.commit("folder", (d) => M.createFolder(d, "player", "Altra"), { local: true });
  root.click("[data-media-undo]");
  assert.ok(M.foldersFor(ctx.state, "player").some((f) => M.folderName(f, "it") === "Altra"));
  assert.equal(M.findAsset(ctx.state, "m-mira"), null);
  assert.match(ctx.toasts.at(-1).text, /non può più annullare/);
});

test("review F4 + F10: space is checked before the wheel; an upload the browser cannot store is taken back", async () => {
  const { ctx } = harness();
  const pdf = (name, size) =>
    new File(
      [Buffer.concat([Buffer.from("%PDF-1.4\n/Type /Page\n"), Buffer.alloc(size, 32)])],
      name,
      {
        type: "application/pdf",
      },
    );
  // Storage refuses the save: the file is removed again and the notice says so.
  ctx.storageError = "write";
  const before = M.visibleAssets(ctx.state, "player").length;
  assert.deepEqual(await importFiles(ctx, [pdf("pieno.pdf", 100)]), []);
  assert.equal(M.visibleAssets(ctx.state, "player").length, before);
  assert.equal(ui.notice.error, true);
  assert.match(
    ui.notice.text.it,
    /«pieno\.pdf» non è stato aggiunto: la memoria di questo browser è piena/,
  );
  // Local saving already unavailable: the file stays in this tab, with a warning.
  ctx.storageError = "unavailable";
  assert.equal((await importFiles(ctx, [pdf("scheda.pdf", 100)])).length, 1);
  assert.match(ui.notice.text.it, /aggiunto solo in questa scheda/);
  ctx.storageError = "";
  // Out of space: refused before the import wheel opens (no dialog), for images too.
  const big =
    "data:image/png;base64," +
    Buffer.from([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a,
      ...Array(490 * 1024).fill(1),
    ]).toString("base64");
  upload(ctx, { dataUrl: big, name: "a" });
  upload(ctx, { dataUrl: big, name: "b" });
  const previousImage = globalThis.Image;
  globalThis.Image = class {
    set src(value) {
      this.naturalWidth = 64;
      this.naturalHeight = 64;
      queueMicrotask(() => this.onload());
    }
  };
  try {
    const png = new File(
      [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(60 * 1024).fill(3)])],
      "orso.png",
      { type: "image/png" },
    );
    assert.deepEqual(await importFiles(ctx, [png]), []);
  } finally {
    globalThis.Image = previousImage;
  }
  assert.equal(ctx.dialogs, 0);
  assert.match(ui.notice.text.it, /Spazio esaurito/);
  // F10: the file input is cleared, so the same file can be chosen again.
  const input = { files: [png0()], value: "C:\\fakepath\\orso.png" };
  assert.equal(takeFiles({ target: input }).length, 1);
  assert.equal(input.value, "");
});
const png0 = () => ({ name: "x.png" });

test("review F7: a refused file-page form keeps what was typed and names the field to fix", () => {
  const { ctx } = harness();
  ctx.view = { page: "media", id: "m-mira", tab: "" };
  const typed = provenanceMap({
    "media-source": "licensed",
    "media-author": "Artista Esempio",
    "media-license": "CC BY 4.0",
    "media-link": "ftp://esempio.org/x",
    intent: "share",
  });
  submitForm("m-mira", "provenance", typed, (form) =>
    actions.provenance(ctx, "m-mira", form.get("intent"), fromMap(form)),
  );
  assert.match(ui.notice.text.it, /deve iniziare con http/);
  assert.deepEqual([ui.draft.form, ui.draft.field], ["provenance", "link"]);
  let page = ctx.registry.slot("route", "media", ctx);
  assert.match(page, /value="Artista Esempio"/);
  assert.match(page, /value="CC BY 4\.0"/);
  assert.match(page, /value="ftp:\/\/esempio\.org\/x"/);
  assert.match(page, /<option value="licensed" selected>/);
  // Saving (not sharing) words its refusal as saving.
  submitForm(
    "m-mira",
    "provenance",
    provenanceMap({ "media-source": "own", intent: "save" }),
    (form) => actions.provenance(ctx, "m-mira", form.get("intent"), fromMap(form)),
  );
  assert.match(ui.notice.text.it, /^Per salvare la provenienza/);
  assert.equal(ui.draft.field, "author");
  // Offline, the refused share keeps the typed values too.
  ctx.offline = true;
  submitForm(
    "m-mira",
    "provenance",
    provenanceMap({
      "media-source": "own",
      "media-author": "Io",
      "media-license": "Uso al tavolo",
      intent: "share",
    }),
    (form) => actions.provenance(ctx, "m-mira", form.get("intent"), fromMap(form)),
  );
  assert.match(ui.notice.text.it, /Sei senza rete/);
  page = ctx.registry.slot("route", "media", ctx);
  assert.match(page, /value="Io"/);
  ctx.offline = false;
  // Success clears the kept values.
  submitForm(
    "m-mira",
    "provenance",
    provenanceMap({
      "media-source": "own",
      "media-author": "Io",
      "media-license": "Uso al tavolo",
      intent: "save",
    }),
    (form) => actions.provenance(ctx, "m-mira", form.get("intent"), fromMap(form)),
  );
  assert.equal(ui.draft, null);
});

test("review F9: a file already on the token is chosen, not added again (Changr)", () => {
  const { ctx } = harness();
  ctx.commit("portrait", (d) => M.setPortrait(d, "player", "livia", "m-livia-portrait"));
  let first;
  let second;
  ctx.commit("a", (d) => {
    first = M.addTokenVariant(d, "player", "livia", "m-livia-hood", "", { activate: true });
  });
  ctx.commit("b", (d) => {
    d.ext.media.looks.livia.token.active = "portrait";
    second = M.addTokenVariant(d, "player", "livia", "m-livia-hood", "", { activate: true });
  });
  assert.equal(second, first);
  assert.equal(M.lookOf(ctx.state, "livia").token.variants.length, 1);
  assert.equal(M.tokenArt(ctx.state, "livia").variantId, first);
  // The portrait itself is the "portrait" choice.
  ctx.commit("c", (d) => {
    assert.equal(
      M.addTokenVariant(d, "player", "livia", "m-livia-portrait", "", { activate: true }),
      "portrait",
    );
  });
  assert.equal(M.tokenArt(ctx.state, "livia").source, "portrait");
  assert.equal(actions.useToken(ctx, "m-livia-hood", "livia", true), true);
  assert.match(ui.notice.text.it, /è già un’immagine della pedina di Livia: ora è quella mostrata/);
  assert.equal(M.lookOf(ctx.state, "livia").token.variants.length, 1);
});

test("review F11 + F12: a refused sheet colour is not left selected; credits are neutral for others", () => {
  const { ctx } = harness();
  const actor = ctx.state.actors.livia;
  const tab = ctx.registry.get("sheet-tab", "media", ctx, actor);
  const root = mount(tab.render({ ...ctx, view: { page: "characters", id: "livia" } }, actor));
  tab.bind(root, ctx);
  ctx.offline = true;
  const renders = ctx.renders;
  root.fire('[name="media-theme"][value="silver"]', "change");
  assert.equal(M.lookOf(ctx.state, "livia")?.theme ?? null, null);
  assert.equal(ctx.toasts.at(-1).error, true);
  assert.ok(ctx.renders > renders, "the swatches are rendered again from the stored value");
  ctx.offline = false;
  const letter = M.findAsset(ctx.state, "m-letter");
  assert.equal(
    creditText(ctx, letter),
    "Opera di chi l’ha caricata · DM della campagna · Uso al tavolo della campagna",
  );
  assert.equal(
    creditText(as(ctx, "dm"), letter),
    "Creata da me · DM della campagna · Uso al tavolo della campagna",
  );
});

test("review F13: an attachment's visibility can be changed later with the same rules (Kanka)", () => {
  const { ctx } = harness({ role: "dm" });
  const entry = "legacy-recap-summary";
  // The seeded letter: from everyone who reads the recap to DM only, and back.
  ctx.commit("v", (d) => M.setAttachmentVisibility(d, "dm", "att-letter", "dm"));
  assert.deepEqual(M.attachmentsFor(ctx.state, entry, "player"), []);
  ctx.commit("v", (d) => M.setAttachmentVisibility(d, "dm", "att-letter", "readers"));
  assert.equal(M.attachmentsFor(ctx.state, entry, "player").length, 1);
  // A personal map shown to the readers needs the share confirmation and provenance.
  ctx.commit("a", (d) => M.attach(d, "dm", entry, "m-courtyard", "dm"));
  const id = M.mediaOf(ctx.state).attachments.at(-1).id;
  assert.throws(
    () => ctx.commit("v", (d) => M.setAttachmentVisibility(d, "dm", id, "readers")),
    (e) => e.code === "share",
  );
  // The DM's entry page offers a visibility select per attachment; the player's does not.
  const rows = M.attachmentsFor(ctx.state, entry, "dm");
  assert.ok(rows.every((r) => r.canChangeVisibility));
  resetCampaignView();
  const view = { page: "campaign", tab: "entry", id: entry };
  assert.match(renderCampaign({ ...ctx, view }), /data-media-attachment-visibility="att-letter"/);
  // Through the bind: choosing "DM only" in the select commits it.
  const panel = ctx.registry.get("campaign-section", "media.entry", ctx, { id: entry });
  const root = mount(panel.render(ctx, { id: entry }));
  panel.bind(root, ctx);
  root.fire('[data-media-attachment-visibility="att-letter"]', "change", "dm");
  assert.equal(
    M.mediaOf(ctx.state).attachments.find((r) => r.id === "att-letter").visibility,
    "dm",
  );
  // The player cannot change the DM's attachments.
  as(ctx, "player");
  assert.throws(
    () => M.setAttachmentVisibility(structuredClone(ctx.state), "player", "att-letter", "readers"),
    (e) => e.code === "attachment",
  );
});

test("review F5 + F6: missing marks are HTML/constant-size targets, not map-scaled text", () => {
  const { ctx } = harness({ role: "dm" });
  ctx.commit("map", (d) => M.setSceneMap(d, "dm", "old-watch", "m-courtyard"));
  ctx.commit("portrait", (d) => M.setPortrait(d, "dm", "doran", "m-goblin"));
  ctx.commit("delete", (d) => M.deleteAsset(d, "dm", "m-courtyard"));
  ctx.commit("delete", (d) => M.deleteAsset(d, "dm", "m-goblin"));
  const scene = ctx.state.scenes[0];
  const layer = missingLayer(ctx, { scene, zoom: 1, pan: { x: 0, y: 0 } });
  // The missing map is an HTML notice (foreignObject) with a real button.
  assert.match(
    layer,
    /<foreignObject class="media-map-missing-fo"[^>]*>.*<button type="button" class="button" data-media-missing-map/s,
  );
  assert.match(layer, /Mappa mancante: «Cortile al tramonto» è stata eliminata/);
  // Each badge has a 40 px target (r=20) around its 24 px dot, and its token position.
  assert.match(
    layer,
    /data-media-missing="doran" data-x="\d+" data-y="\d+"[^>]*><title>[^<]*<\/title><circle class="media-missing-hit" r="20"\/><circle class="media-missing-dot" r="12"\/>/,
  );
});

// ---------------------------------------------------------------- review, round 2

test("review2 P1: the hidden attribute wins over the area's display rules", () => {
  const css = readFileSync(new URL("../media.css", import.meta.url), "utf8");
  // Dock items (display:grid) and picker cards (display:flex) carry "media-" classes.
  assert.match(css, /\[class\*="media-"\]\[hidden\],[^{]*\{\s*display: none !important;/);
  assert.match(css, /\.media-dock-item \{\s*display: grid;/);
  assert.match(css, /\.media-pick \{[^}]*display: flex;/);
});

test("review2 P2: B15 materials using a library image appear in Used in, delete and missing references", async () => {
  const { ctx } = harness({ role: "dm" });
  await usageReady;
  // The DM reveals the library letter from the Sentinella (B15, DDB-129), as "media:m-letter".
  ctx.commit("reveal", (draft) => {
    draft.ext.handouts ??= handouts.seedHandouts();
    handouts.revealArt(
      draft,
      {
        actorId: "goblin-1",
        artId: "media:m-letter",
        caption: "La lettera",
        recipients: { mode: "all" },
      },
      "dm",
    );
  });
  const material = ctx.state.ext.handouts.materials.find((m) => m.title === "La lettera");
  const dmRows = M.usagesOf(ctx.state, "m-letter", "dm").rows;
  const row = dmRows.find((r) => r.kind === "external");
  assert.equal(row.area, "handouts");
  assert.equal(row.label.it, "Materiali · Rivelazione «La lettera»");
  assert.deepEqual(row.route, { page: "campaign", params: { tab: "handouts", id: material.id } });
  // The player it was shown to reads the same use; a DM-only material stays unlisted.
  assert.ok(M.usagesOf(ctx.state, "m-letter", "player").rows.some((r) => r.kind === "external"));
  ctx.commit("dm-only", (draft) => {
    draft.ext.handouts.materials.find((m) => m.id === "material-crypt").image = {
      artId: "media:m-letter",
    };
  });
  const playerUses = M.usagesOf(ctx.state, "m-letter", "player");
  assert.ok(!playerUses.rows.some((r) => r.label.it.includes("Cripta")));
  assert.ok(
    M.usagesOf(ctx.state, "m-letter", "dm").rows.some((r) => r.label.it.includes("Cripta")),
  );
  // The file page lists it; the hidden count is never shown (it would reveal DM content).
  ctx.view = { page: "media", id: "m-letter", tab: "" };
  assert.match(ctx.registry.slot("route", "media", ctx), /Materiali · Rivelazione «La lettera»/);
  as(ctx, "player");
  const playerPage = ctx.registry.slot("route", "media", ctx);
  assert.ok(!/non puoi vedere/.test(playerPage));
  as(ctx, "dm");
  // Deleting: the notice says where the image goes missing; the DM gets the fix route.
  actions.remove(ctx, "m-letter");
  assert.match(ui.notice.text.it, /usi in altre sezioni restano senza immagine/);
  const missing = M.missingReferences(ctx.state, "dm").filter((r) => r.kind === "external");
  assert.deepEqual(
    missing.map((r) => [r.label.it, r.name, r.route.page, r.route.params.tab]),
    [
      [
        // Residuals (29/09/2026, X-A2): «Dispensa», the Italian word the app uses elsewhere.
        "Materiali · Dispensa «Cripta sotto l’osservatorio»",
        "Lettera sigillata",
        "preparation",
        "handouts",
      ],
      ["Materiali · Rivelazione «La lettera»", "Lettera sigillata", "preparation", "handouts"],
    ],
  );
  assert.equal(
    M.missingReferences(ctx.state, "player").filter((r) => r.kind === "external").length,
    0,
  );
  // B28 never edits B15's data: removing that reference from here is refused.
  assert.throws(
    () => M.clearMissing(structuredClone(ctx.state), "dm", missing[0]),
    (e) => e.code === "external",
  );
  // A failing provider never breaks the library.
  M.addUsageProvider("broken", {
    uses() {
      throw Error("boom");
    },
    missing() {
      throw Error("boom");
    },
  });
  try {
    assert.ok(Array.isArray(M.usagesOf(ctx.state, "m-goblin", "dm").rows));
    assert.ok(Array.isArray(M.missingReferences(ctx.state, "dm")));
  } finally {
    M.removeUsageProvider("broken");
  }
});

test("review2 P2: a locked import type is shown where files arrive, named in the notice, and can be unlocked", async () => {
  const { ctx, registry } = harness();
  assert.equal(lockChip(ctx), "");
  registry.setSetting(ctx, "media.import-lock", "prop");
  const chip = lockChip(ctx);
  assert.match(chip, /data-media-lock/);
  assert.match(chip, /Tipo bloccato: Oggetto di scena/);
  assert.match(chip, /data-media-unlock/);
  // Library (drop zone text and chip), dock, and a picker whose upload follows the lock.
  const library = ctx.registry.slot("library-section", "media", ctx);
  assert.match(library, /Le immagini nuove diventano «Oggetto di scena» \(tipo bloccato\)/);
  assert.match(library, /data-media-lock/);
  assert.match(renderDock(ctx, {}), /data-media-lock/);
  assert.match(pickerBody(ctx, { kind: "" }), /data-media-lock/);
  assert.ok(!pickerBody(ctx, { use: "portrait" }).includes("data-media-lock"));
  // An upload under the lock: no wheel, and the notice names the lock with Unlock.
  const previousImage = globalThis.Image;
  globalThis.Image = class {
    set src(value) {
      this.naturalWidth = 64;
      this.naturalHeight = 64;
      queueMicrotask(() => this.onload());
    }
  };
  try {
    const png = new File(
      [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...Array(64).fill(3)])],
      "orso.png",
      { type: "image/png" },
    );
    const [row] = await importFiles(ctx, [png]);
    assert.equal(row.use, "prop");
  } finally {
    globalThis.Image = previousImage;
  }
  assert.equal(ctx.dialogs, 0);
  assert.equal(ui.notice.unlock, true);
  assert.match(ui.notice.text.it, /tipo bloccato: Oggetto di scena/);
  assert.match(renderNotice(ctx, "library"), /data-media-notice-unlock/);
  // Unlock from the notice: the wheel asks again and the chips go.
  const root = mount(renderNotice(ctx, "library"));
  bindNotice(root, ctx);
  root.click("[data-media-notice-unlock]");
  assert.equal(registry.getSetting(ctx, "media.import-lock"), "ask");
  assert.equal(lockChip(ctx), "");
  assert.equal(ui.notice.unlock, false);
  assert.match(ctx.toasts.at(-1).text, /Tipo sbloccato/);
  // Owlbear's word for it: a prop, not B15's handouts.
  assert.equal(M.USE_LABELS.prop.en, "Prop");
  assert.equal(unlockImport(ctx), true);
});

test("review2 P3: DM-secret media changes keep their log line private", () => {
  const { ctx } = harness({ role: "dm" });
  const entry = "legacy-recap-summary";
  // A "DM only" attachment on the shared recap.
  assert.ok(actions.attach(ctx, "m-courtyard", entry, "dm"));
  assert.equal(ctx.state.log.at(-1).visibility, "private");
  // Changing an attachment to or from "DM only" through its select.
  const panel = ctx.registry.get("campaign-section", "media.entry", ctx, { id: entry });
  const root = mount(panel.render(ctx, { id: entry }));
  panel.bind(root, ctx);
  root.fire('[data-media-attachment-visibility="att-letter"]', "change", "dm");
  assert.equal(ctx.state.log.at(-1).visibility, "private");
  // A readers attachment stays a shared line.
  assert.ok(actions.attach(ctx, "m-letter", entry, "readers"));
  assert.equal(ctx.state.log.at(-1).visibility, "shared");
  // A scene map: private until the scene is revealed.
  const scene = ctx.state.scenes[0];
  assert.deepEqual(sceneOptions(ctx, scene.id), scene.revealed ? {} : { visibility: "private" });
  ctx.commit("hide", (d) => {
    d.scenes[0].revealed = false;
  });
  assert.ok(actions.useMap(ctx, "m-courtyard", scene.id));
  assert.equal(ctx.state.log.at(-1).visibility, "private");
  // A hidden creature's token image: its name stays out of the shared log.
  assert.deepEqual(actorOptions(ctx, "goblin-1"), {});
  ctx.commit("hide goblin", (d) => {
    d.actors["goblin-1"].hidden = true;
  });
  assert.deepEqual(actorOptions(ctx, "goblin-1"), { visibility: "private" });
});

test("review2 P3: deleting a shared PDF keeps other people's personal notes", () => {
  const { ctx } = harness({ role: "dm" });
  let id;
  ctx.commit(
    "pdf",
    (d) => {
      id = M.addAsset(d, "dm", {
        name: "Mappa del regno",
        fileName: "regno.pdf",
        dataUrl: PDF,
        use: "document",
        pages: 2,
      });
    },
    { local: true },
  );
  ctx.commit("share", (d) =>
    M.shareAsset(d, "dm", id, true, { source: "own", author: "DM", license: "Uso al tavolo" }),
  );
  as(ctx, "player");
  ctx.commit("note", (d) => M.addAnnotation(d, "player", id, 2, "Il passo a nord."), {
    local: true,
  });
  as(ctx, "dm");
  actions.remove(ctx, id);
  const notes = M.orphanAnnotations(ctx.state, "player");
  assert.deepEqual(
    notes.map((n) => [n.text, n.name, n.page]),
    [["Il passo a nord.", "Mappa del regno", 2]],
  );
  assert.deepEqual(M.orphanAnnotations(ctx.state, "dm"), []);
  // The player's library lists them as notes on a deleted PDF; the DM never sees them.
  assert.ok(!ctx.registry.slot("library-section", "media", ctx).includes("Il passo a nord."));
  as(ctx, "player");
  const library = ctx.registry.slot("library-section", "media", ctx);
  assert.match(library, /Le mie note su PDF eliminati/);
  assert.match(library, /Il passo a nord\./);
  assert.match(library, /«Mappa del regno» · pagina 2 · PDF eliminato/);
  // Their author can delete them.
  const root = mount(library);
  ctx.registry.get("library-section", "media", ctx).bind(root, ctx);
  root.click(`[data-media-orphan-remove="${notes[0].id}"]`);
  assert.deepEqual(M.orphanAnnotations(ctx.state, "player"), []);
});

test("review2 P3: an untitled entry is named by its kind; the dock icon is not the visibility eye", () => {
  const { ctx } = harness();
  let entryId;
  ctx.commit("note", (draft) => {
    const d = content.createCampaignDraft(
      draft,
      { id: "note-untitled", kind: "note", campaignId: draft.campaign.id },
      "player",
    );
    content.saveCampaignDraft(
      draft,
      "note-untitled",
      {
        data: { ...d.data, title: "", body: "Senza titolo." },
        access: { mode: "campaign", grants: [] },
        expectedDraftRevision: d.revision,
      },
      "player",
    );
    entryId = content.applyCampaignDraft(
      draft,
      "note-untitled",
      { reviewKey: content.previewCampaignDraft(draft, "note-untitled", "player").reviewKey },
      "player",
    ).entryId;
  });
  ctx.commit("attach", (d) => M.attach(d, "player", entryId, "m-livia-hood", "self"), {
    local: true,
  });
  const labels = M.usagesOf(ctx.state, "m-livia-hood", "player").rows.map((r) => r.label.it);
  assert.ok(labels.includes("Allegato a «Appunto» · Solo io"), labels.join(" | "));
  // B61: the sidebar tab has its own picture icon, distinct from the map tools.
  assert.equal(ctx.registry.get("table-panel", "media-dock", ctx).icon, "image");
});

// Minimal element double for bind(): buttons/inputs parsed from rendered markup.
function mount(html) {
  const decode = (v) =>
    String(v ?? "").replace(
      /&(amp|lt|gt|quot|#39);/g,
      (m, k) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" })[k],
    );
  const nodes = [...html.matchAll(/<(input|button|select|textarea|section)\b([^>]*)>/g)].map(
    ([, tag, text]) => {
      const attrs = Object.fromEntries(
        [...text.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v)]),
      );
      const events = {};
      return {
        tagName: tag.toUpperCase(),
        attrs,
        events,
        value: attrs.value ?? "",
        hidden: false,
        classList: { toggle() {}, add() {}, remove() {} },
        setAttribute(k, v) {
          attrs[k] = String(v);
        },
        closest: () => null,
        dataset: Object.fromEntries(
          Object.entries(attrs)
            .filter(([k]) => k.startsWith("data-"))
            .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
        ),
        addEventListener(type, fn) {
          events[type] = fn;
        },
      };
    },
  );
  const matches = (node, selector) =>
    selector
      .split(",")
      .some((part) =>
        [...part.trim().matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)].every(
          ([, key, value]) =>
            key in node.attrs && (value === undefined || node.attrs[key] === value),
        ),
      );
  const root = {
    querySelectorAll: (selector) => nodes.filter((node) => matches(node, selector)),
    querySelector: (selector) =>
      nodes.find((node) => matches(node, selector)) ?? {
        hidden: false,
        addEventListener() {},
        querySelector: () => null,
      },
    click(selector) {
      const node = nodes.find((n) => matches(n, selector));
      assert.ok(node, `Missing ${selector}`);
      node.events.click?.({ preventDefault() {}, stopPropagation() {}, currentTarget: node });
    },
    fire(selector, type, value) {
      const node = nodes.find((n) => matches(n, selector));
      assert.ok(node, `Missing ${selector}`);
      if (value !== undefined) node.value = value;
      node.events[type]?.({
        preventDefault() {},
        stopPropagation() {},
        currentTarget: node,
        target: node,
      });
    },
  };
  return root;
}
