// Media library domain (B28): local images and PDFs, folders and tags, provenance and
// licence for sharing, "used in" tracking, portraits, token images with a circular crop
// and alternative images, scene maps, entry attachments with their own visibility,
// missing-resource detection and personal PDF annotations. Pure functions over the
// `state.ext.media` slice; no DOM. Every refusal is an Error carrying {it, en}.
//
// Patterns: Foundry File Picker (FVT-185), Roll20 Art Library and asset ownership
// (R20-189, SVC-138), Owlbear asset dock, import wheel and missing-asset notice
// (VTL-061/062/240), Kanka "used in" and attachments (CMP-208, CMP-28), Tokenizer
// (FVT-039), D&D Beyond sheet appearance and PC token art (DDB-058, DDB-108), Changr
// token variants (VTL-104), Owlbear PDF! personal annotations (VTL-194).

import { canControlActor, canViewActor } from "./character-access.mjs";
import { campaignMembers, getCampaignEntry, isCampaignMember } from "./campaign-content.mjs";
import { SEED_DATA } from "./media-seed.mjs";
import { formTokenName } from "./forms-companions.mjs";
import { sampleDate } from "./sample-clock.mjs";

export const MEDIA_ID = "media";
export const MEDIA_VERSION = 1;

// Demonstration limits: this prototype keeps files in the browser's local storage as
// base64 (4 characters per 3 bytes) next to every other area's data, and the browser keeps
// about 5 million characters per site. `quota` is each identity's space; `total` is every
// identity's files together in this browser (about 2 million characters of base64).
export const LIMITS = Object.freeze({
  image: 500 * 1024,
  pdf: 500 * 1024,
  quota: 1024 * 1024,
  total: 1536 * 1024,
  minSide: 16,
  maxSide: 4096,
  name: 80,
  tags: 8,
  tag: 24,
  label: 40,
  variants: 6,
  attachments: 12,
  annotation: 500,
  credit: 80,
  link: 200,
  folders: 20,
});

export const IMAGE_TYPES = Object.freeze(["image/png", "image/jpeg", "image/webp"]);
export const PDF_TYPE = "application/pdf";
export const USES = Object.freeze(["portrait", "token", "map", "prop", "document"]);
export const USE_LABELS = Object.freeze({
  portrait: { it: "Ritratto", en: "Portrait" },
  token: { it: "Pedina", en: "Token" },
  map: { it: "Mappa", en: "Map" },
  // Owlbear's "Prop" (VTL-062): not B15's handouts ("Materiali"), which are another area.
  prop: { it: "Oggetto di scena", en: "Prop" },
  document: { it: "Documento", en: "Document" },
});
// System folders, one per kind chosen at import (Owlbear dock tabs, Roll20 folders).
export const SYSTEM_FOLDERS = Object.freeze([
  { id: "f-portrait", use: "portrait", name: { it: "Ritratti", en: "Portraits" } },
  { id: "f-token", use: "token", name: { it: "Pedine", en: "Tokens" } },
  { id: "f-map", use: "map", name: { it: "Mappe", en: "Maps" } },
  { id: "f-prop", use: "prop", name: { it: "Oggetti di scena", en: "Props" } },
  { id: "f-document", use: "document", name: { it: "Documenti", en: "Documents" } },
]);
// Sheet colours (D&D Beyond sheet theme, DDB-058). The token border is not here: it is the
// token menu's border colour (B12, DDB-117), one model for the whole Table.
export const THEMES = Object.freeze({
  gold: { color: "#dfbd78", it: "Oro", en: "Gold" },
  silver: { color: "#c9d1d6", it: "Argento", en: "Silver" },
  crimson: { color: "#d9796c", it: "Cremisi", en: "Crimson" },
  emerald: { color: "#8fc48a", it: "Smeraldo", en: "Emerald" },
  azure: { color: "#86b6dc", it: "Azzurro", en: "Azure" },
});
// Provenance kinds required before a file is shared (Roll20 asset ownership, SVC-138).
// Labels are read by every viewer, so "own" is neutral; the uploader sees OWN_SOURCE_SELF.
export const SOURCES = Object.freeze({
  own: { it: "Opera di chi l’ha caricata", en: "The uploader’s own work" },
  commissioned: { it: "Commissionata", en: "Commissioned" },
  licensed: { it: "Con licenza di terzi", en: "Licensed from others" },
  "public-domain": { it: "Pubblico dominio", en: "Public domain" },
});
export const OWN_SOURCE_SELF = Object.freeze({ it: "Creata da me", en: "Made by me" });
export const VISIBILITIES = Object.freeze({
  readers: { it: "Chi può leggere la voce", en: "Everyone who can read the entry" },
  dm: { it: "Solo DM", en: "DM only" },
  self: { it: "Solo io", en: "Only me" },
});
// Campaign entry kinds, naming an untitled entry by what it is.
export const ENTRY_KINDS = Object.freeze({
  note: { it: "Appunto", en: "Note" },
  world: { it: "Voce del mondo", en: "World entry" },
  quest: { it: "Obiettivo", en: "Objective" },
  recap: { it: "Resoconto", en: "Recap" },
});

const DATA_URL = /^data:(image\/(?:png|jpeg|webp)|application\/pdf);base64,[A-Za-z0-9+/]+=*$/;
const ID = /^[A-Za-z0-9_-]{1,80}$/;
const DEFAULT_CROP = Object.freeze({ x: 0.5, y: 0.5, zoom: 1 });

const clone = (value) => structuredClone(value);
const now = () => new Date().toISOString();
const newId = (prefix) =>
  prefix +
  "-" +
  (globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10));
export function refusal(it, en, code = "refused", field = "") {
  return Object.assign(new Error(en), { it, en, code }, field ? { field } : {});
}
const fail = (it, en, code, field) => {
  throw refusal(it, en, code, field);
};

export function formatBytes(lang, bytes) {
  const format = (value, digits) =>
    new Intl.NumberFormat(lang === "en" ? "en-GB" : "it-IT", {
      maximumFractionDigits: digits,
    }).format(value);
  if (bytes >= 1024 * 1024) return format(bytes / (1024 * 1024), 1) + " MB";
  return format(Math.max(bytes, 1) / 1024, bytes < 10 * 1024 ? 1 : 0) + " KB";
}
export const isDataUrl = (value) => typeof value === "string" && DATA_URL.test(value);
export function dataBytes(dataUrl) {
  const b64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.floor((b64.length * 3) / 4) - (b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0);
}
const mimeOf = (dataUrl) => dataUrl.slice(5, dataUrl.indexOf(";"));

// ---------------------------------------------------------------- file checks

/** The declared type of a local file: its MIME type, or one derived from its extension. */
export function declaredType(name, type) {
  if (type) return type === "image/jpg" ? "image/jpeg" : type;
  const ext = String(name).toLowerCase().split(".").pop();
  return (
    { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", pdf: PDF_TYPE }[
      ext
    ] ?? ""
  );
}
/** Recognizes a file from its first bytes (PNG, JPEG, WebP, PDF), or null. */
export function sniff(head) {
  const b = head instanceof Uint8Array ? head : new Uint8Array(head ?? []);
  const is = (bytes, at = 0) => bytes.every((value, i) => b[at + i] === value);
  if (is([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (is([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (is([0x52, 0x49, 0x46, 0x46]) && is([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  if (is([0x25, 0x50, 0x44, 0x46, 0x2d])) return PDF_TYPE;
  return null;
}
/**
 * Checks a local file before reading it: supported type, non-empty, per-kind size limit and
 * that the first bytes match the declared type. Returns {mime, kind}; throws a readable
 * refusal naming the file otherwise.
 */
export function checkFile({ name, type, size, head }) {
  const file = String(name || "file");
  const mime = declaredType(file, type);
  if (![...IMAGE_TYPES, PDF_TYPE].includes(mime))
    fail(
      `«${file}» non è un’immagine PNG, JPEG o WebP né un PDF.`,
      `“${file}” is not a PNG, JPEG or WebP image, nor a PDF.`,
      "type",
    );
  const kind = mime === PDF_TYPE ? "pdf" : "image";
  if (!size) fail(`«${file}» è vuoto.`, `“${file}” is empty.`, "empty");
  const limit = LIMITS[kind];
  if (size > limit)
    fail(
      `«${file}» pesa ${formatBytes("it", size)}: in questa dimostrazione il limite è ${formatBytes("it", limit)} per file.`,
      `“${file}” is ${formatBytes("en", size)}: this demonstration allows ${formatBytes("en", limit)} per file.`,
      "size",
    );
  if (head !== undefined && sniff(head) !== mime)
    fail(
      `«${file}» dichiara il formato ${mime.split("/")[1].toUpperCase()} ma il contenuto non corrisponde: il file potrebbe essere danneggiato.`,
      `“${file}” claims to be ${mime.split("/")[1].toUpperCase()} but its content does not match: the file may be damaged.`,
      "mismatch",
    );
  return { mime, kind };
}
export function checkDimensions(name, width, height) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    Math.min(width, height) < LIMITS.minSide ||
    Math.max(width, height) > LIMITS.maxSide
  )
    fail(
      `«${name}» misura ${width || 0} × ${height || 0} px: servono da ${LIMITS.minSide} a ${LIMITS.maxSide} px per lato.`,
      `“${name}” is ${width || 0} × ${height || 0} px: each side must be ${LIMITS.minSide} to ${LIMITS.maxSide} px.`,
      "dimensions",
    );
}
/** Page count of a simple PDF (objects of /Type /Page), or null when unknown. */
export function countPdfPages(text) {
  const count = (String(text).match(/\/Type\s*\/Page(?![a-z])/g) || []).length;
  return count > 0 ? count : null;
}

// ---------------------------------------------------------------- slice

function seedAsset(id, owner, name, fileName, key, width, height, use, tags, extra = {}) {
  const dataUrl = SEED_DATA[key];
  return {
    id,
    owner,
    name,
    fileName,
    folderId: extra.folderId ?? SYSTEM_FOLDERS.find((f) => f.use === use).id,
    tags,
    kind: mimeOf(dataUrl) === PDF_TYPE ? "pdf" : "image",
    mime: mimeOf(dataUrl),
    bytes: dataBytes(dataUrl),
    width,
    height,
    pages: extra.pages ?? null,
    dataUrl,
    use,
    createdAt: sampleDate("2026-09-20T18:00:00.000Z"),
    updatedAt: sampleDate("2026-09-20T18:00:00.000Z"),
    revision: 1,
    shared: Boolean(extra.shared),
    provenance: extra.provenance ?? null,
  };
}
/** Synthetic seed: the player's and the DM's libraries, coherent with the sample state. */
export function seedMedia() {
  const own = (author) => ({
    source: "own",
    author,
    license: "Uso al tavolo della campagna",
    link: "",
  });
  return {
    assets: [
      seedAsset(
        "m-livia-portrait",
        "player",
        "Livia — ritratto",
        "livia-ritratto.jpg",
        "liviaPortrait",
        192,
        192,
        "portrait",
        ["livia", "maga"],
      ),
      seedAsset(
        "m-livia-hood",
        "player",
        "Livia incappucciata",
        "livia-cappuccio.jpg",
        "liviaHood",
        192,
        192,
        "token",
        ["livia", "variante"],
      ),
      seedAsset("m-mira", "player", "Mira — schizzo", "mira.jpg", "mira", 192, 192, "portrait", [
        "mira",
        "druida",
      ]),
      seedAsset(
        "m-livia-notes",
        "player",
        "Appunti di Livia",
        "appunti-livia.pdf",
        "notes",
        0,
        0,
        "document",
        ["appunti"],
        { pages: 2 },
      ),
      seedAsset(
        "m-doran-portrait",
        "dm",
        "Doran — ritratto",
        "doran.jpg",
        "doran",
        192,
        192,
        "portrait",
        ["doran", "guerriero"],
      ),
      seedAsset(
        "m-goblin",
        "dm",
        "Sentinella goblin",
        "sentinella.jpg",
        "goblin",
        160,
        160,
        "token",
        ["goblin"],
      ),
      seedAsset(
        "m-goblin-wounded",
        "dm",
        "Sentinella goblin — ferita",
        "sentinella-ferita.jpg",
        "goblinWounded",
        160,
        160,
        "token",
        ["goblin", "ferito"],
      ),
      seedAsset(
        "m-courtyard",
        "dm",
        "Cortile al tramonto",
        "cortile.jpg",
        "courtyard",
        800,
        520,
        "map",
        ["osservatorio", "notte"],
      ),
      seedAsset(
        "m-letter",
        "dm",
        "Lettera sigillata",
        "lettera.jpg",
        "letter",
        240,
        320,
        "prop",
        ["handout", "lettera"],
        {
          folderId: "f-dm-chapter-1",
          shared: true,
          provenance: own("DM della campagna"),
        },
      ),
    ],
    folders: [{ id: "f-dm-chapter-1", owner: "dm", name: "Capitolo 1 — Bruma" }],
    removed: [],
    looks: {
      doran: {
        portrait: "m-doran-portrait",
        token: { active: "portrait", crop: { x: 0.5, y: 0.42, zoom: 1.3 }, variants: [] },
      },
      "goblin-1": {
        portrait: null,
        token: {
          active: "v-goblin-1-a",
          crop: { ...DEFAULT_CROP },
          variants: [
            {
              id: "v-goblin-1-a",
              assetId: "m-goblin",
              label: "Sentinella",
              crop: { ...DEFAULT_CROP },
            },
            {
              id: "v-goblin-1-b",
              assetId: "m-goblin-wounded",
              label: "Ferita",
              crop: { ...DEFAULT_CROP },
            },
          ],
        },
      },
    },
    scenes: {},
    attachments: [
      {
        id: "att-letter",
        entryId: "legacy-recap-summary",
        assetId: "m-letter",
        visibility: "readers",
        addedBy: "dm",
        addedAt: sampleDate("2026-09-20T18:05:00.000Z"),
      },
    ],
    annotations: [
      {
        id: "ann-livia-1",
        owner: "player",
        assetId: "m-livia-notes",
        page: 1,
        text: "Chiedere a Doran del simbolo sul cancello.",
        createdAt: sampleDate("2026-09-20T18:10:00.000Z"),
      },
    ],
  };
}
const objectOr = (value, fallback) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
/** Normalizes a saved slice; refuses a future version. Idempotent. */
export function normalizeMedia(slice, fromVersion) {
  if (fromVersion > MEDIA_VERSION) throw Error("Media data comes from a newer version");
  const value = objectOr(slice, {});
  const list = (key) => (Array.isArray(value[key]) ? value[key] : []);
  return {
    assets: list("assets").filter(
      (asset) =>
        asset &&
        ID.test(asset.id ?? "") &&
        ["player", "dm"].includes(asset.owner) &&
        isDataUrl(asset.dataUrl),
    ),
    folders: list("folders").filter((folder) => folder && ID.test(folder.id ?? "")),
    removed: list("removed"),
    looks: objectOr(value.looks, {}),
    scenes: objectOr(value.scenes, {}),
    attachments: list("attachments"),
    annotations: list("annotations"),
  };
}
export function mediaOf(state) {
  return state?.ext?.[MEDIA_ID] ?? null;
}
function slice(state) {
  const value = mediaOf(state);
  if (!value) fail("La libreria non è disponibile.", "The library is unavailable.", "unavailable");
  return value;
}

// ---------------------------------------------------------------- access

export function isDM(state, viewer) {
  const member = state.campaign?.members?.find((row) => row.id === viewer);
  return Boolean(member && ["dm", "co-dm"].includes(member.role));
}
export function findAsset(state, id) {
  return mediaOf(state)?.assets.find((asset) => asset.id === id) ?? null;
}
/** Own files, and files shared with a campaign the viewer belongs to. */
export function canSeeAsset(state, asset, viewer) {
  return Boolean(
    asset &&
    (asset.owner === viewer ||
      (asset.shared && isCampaignMember(state, state.campaign?.id, viewer))),
  );
}
function ownAsset(state, id, viewer) {
  const asset = findAsset(state, id);
  if (!asset || !canSeeAsset(state, asset, viewer))
    fail("Il file non è disponibile.", "The file is unavailable.", "missing");
  if (asset.owner !== viewer)
    fail(
      "Solo chi ha caricato il file può modificarlo.",
      "Only the person who uploaded the file can change it.",
      "owner",
    );
  return asset;
}
function usableAsset(state, id, viewer, kind = "image") {
  const asset = findAsset(state, id);
  if (!asset || !canSeeAsset(state, asset, viewer))
    fail("Il file non è disponibile.", "The file is unavailable.", "missing");
  if (kind && asset.kind !== kind)
    fail(
      kind === "image" ? "Serve un’immagine, non un PDF." : "Serve un PDF.",
      kind === "image" ? "An image is needed, not a PDF." : "A PDF is needed.",
      "kind",
    );
  return asset;
}
function controlled(state, actorId, viewer) {
  const actor = state.actors?.[actorId];
  if (!actor || !canControlActor(actor, viewer, state))
    fail(
      "Solo chi controlla la scheda può cambiarne l’aspetto.",
      "Only whoever controls the sheet can change its appearance.",
      "control",
    );
  return actor;
}
export function isPrivateActor(actor) {
  return actor?.visibility === "private";
}
export function folderName(folder, lang) {
  return typeof folder.name === "object" ? folder.name[lang] || folder.name.it : folder.name;
}
export function foldersFor(state, viewer) {
  return [
    ...SYSTEM_FOLDERS,
    ...(mediaOf(state)?.folders ?? []).filter((folder) => folder.owner === viewer),
  ];
}
/**
 * Space used: this identity's files against its quota, and every identity's files in this
 * browser against the browser total (the local storage they all share).
 */
export function quota(state, owner) {
  const assets = mediaOf(state)?.assets ?? [];
  const sum = (rows) => rows.reduce((total, asset) => total + asset.bytes, 0);
  return {
    used: sum(assets.filter((asset) => asset.owner === owner)),
    limit: LIMITS.quota,
    browser: { used: sum(assets), limit: LIMITS.total },
  };
}

// ---------------------------------------------------------------- queries

/** Assets the viewer can browse: scope mine | shared | all, folder, kind of use, text. */
export function visibleAssets(
  state,
  viewer,
  { scope = "all", folderId = "", use = "", query = "" } = {},
) {
  const text = String(query).trim().toLocaleLowerCase();
  return (mediaOf(state)?.assets ?? [])
    .filter((asset) => canSeeAsset(state, asset, viewer))
    .filter((asset) =>
      scope === "mine" ? asset.owner === viewer : scope === "shared" ? asset.shared : true,
    )
    .filter((asset) => !folderId || asset.folderId === folderId)
    .filter((asset) => !use || asset.use === use)
    .filter(
      (asset) =>
        !text ||
        [asset.name, asset.fileName, ...asset.tags].join(" ").toLocaleLowerCase().includes(text),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.name.localeCompare(b.name));
}
function tombstone(state, id) {
  return mediaOf(state)?.removed.find((row) => row.id === id) ?? null;
}
function missingName(state, id) {
  return tombstone(state, id)?.name ?? "";
}
export function lookOf(state, actorId) {
  return mediaOf(state)?.looks?.[actorId] ?? null;
}
/** The portrait of an actor: {asset} when present, {missing:{name}} when deleted, or null. */
export function portraitArt(state, actorId) {
  const look = lookOf(state, actorId);
  if (!look?.portrait) return null;
  const asset = findAsset(state, look.portrait);
  return asset
    ? { asset, assetId: asset.id }
    : { asset: null, assetId: look.portrait, missing: { name: missingName(state, look.portrait) } };
}
// R3 PG-77 (dnd5e Transformation swaps the token image, BG3 Wild Shape): a transformed creature
// shows its form. Silhouettes drawn for this blueprint in a 24-unit box (no third-party art).
export const FORM_SILHOUETTES = Object.freeze({
  wolf: "M4 20 6 9 3 3l6 4h6l6-4-3 6 2 11-8-4Z",
  "dire-wolf": "M3 21 5 9 2 2l7 4h6l7-4-3 7 3 12-9-5Z",
  cat: "M5 20V8L4 3l5 4h6l5-4-1 5v12q-7-3-14 0Z",
  rat: "M2 16q4-7 11-6 5 0 7 4l2 1-2 2H7q-3 0-5-1Zm11-6 2-3 1 3",
  "giant-rat": "M1 16q4-8 12-7 6 0 8 5l2 1-2 3H7q-4 0-6-2Zm12-7 2-4 2 4",
  owl: "M6 21q-2-9 0-15L4 3l5 2q3-1 6 0l5-2-2 3q2 6 0 15Z",
  "black-bear": "M3 18q0-8 6-8h6q6 0 6 5v4h-3v-3H8l-1 3H4Zm13-8 1-3 2 1",
  "giant-spider":
    "M12 9a3 3 0 1 1 0 6 3 3 0 1 1 0-6ZM9 11 3 6m6 7H2m7 1-6 5m12-8 6-5m-6 7h7m-7 1 6 5",
  "riding-horse": "M5 21 6 13q0-6 6-7l2-3 1 3q5 1 6 6l-2 1-3-2-1 10Z",
});
const PAW =
  "M12 13q-4 0-5 4 0 3 5 2 5 1 5-2-1-4-5-4ZM6 11a2 2 0 1 0 0-4 2 2 0 1 0 0 4Zm4-3a2 2 0 1 0 0-4 2 2 0 1 0 0 4Zm4 0a2 2 0 1 0 0-4 2 2 0 1 0 0 4Zm4 3a2 2 0 1 0 0-4 2 2 0 1 0 0 4Z";
function formArt(state, actor) {
  const form = actor.activeForm;
  const slug = String(form.profileId ?? "").replace(/^srd2024:/, "");
  // The beast's own art when the library has one for this form (an image tagged
  // "form:<beast>"); otherwise the form emblem: the beast's silhouette in a «forma» ring.
  const asset =
    (mediaOf(state)?.assets ?? []).find(
      (row) => row.kind === "image" && (row.tags ?? []).includes("form:" + slug),
    ) ?? null;
  return {
    source: "form",
    formId: form.id,
    profileId: form.profileId,
    variantId: null,
    label: formTokenName(actor, "it"),
    labels: { it: formTokenName(actor, "it"), en: formTokenName(actor, "en") },
    crop: normalCrop(null),
    assetId: asset?.id ?? null,
    asset,
    emblem: asset ? null : { slug, path: FORM_SILHOUETTES[slug] ?? PAW },
  };
}
/**
 * The image shown on an actor's token: the active form (R3 PG-77), the portrait (DDB-108) or
 * the active alternative image (VTL-104), with its circular crop. Null when the token keeps
 * its letter. Returning to the original form shows the usual image again at once.
 */
export function tokenArt(state, actorId) {
  const actor = state?.actors?.[actorId];
  if (actor?.activeForm?.profile) return formArt(state, actor);
  const look = lookOf(state, actorId);
  if (!look) return null;
  const active = look.token?.active ?? "portrait";
  const variant =
    active === "portrait" ? null : look.token?.variants?.find((row) => row.id === active);
  const assetId = variant ? variant.assetId : look.portrait;
  if (!assetId) return null;
  const asset = findAsset(state, assetId);
  const base = {
    source: variant ? "variant" : "portrait",
    variantId: variant?.id ?? null,
    label: variant?.label ?? "",
    crop: normalCrop(variant ? variant.crop : look.token?.crop),
    assetId,
  };
  return asset
    ? { ...base, asset }
    : { ...base, asset: null, missing: { name: missingName(state, assetId) } };
}
function normalCrop(crop) {
  const clamp = (value, min, max, fallback) =>
    Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
  return {
    x: clamp(crop?.x, 0, 1, 0.5),
    y: clamp(crop?.y, 0, 1, 0.5),
    zoom: clamp(crop?.zoom, 1, 4, 1),
  };
}
/**
 * Where the image sits inside a unit square (the token's bounding box) for a crop: the
 * image covers the square, is scaled by zoom and keeps the crop centre in the middle
 * when possible. Returns {x, y, w, h} in unit-box coordinates (objectBoundingBox).
 */
export function cropGeometry(asset, crop) {
  const c = normalCrop(crop);
  const ratio = asset?.width > 0 && asset?.height > 0 ? asset.width / asset.height : 1;
  const w = ratio >= 1 ? c.zoom * ratio : c.zoom;
  const h = ratio >= 1 ? c.zoom : c.zoom / ratio;
  const x = Math.min(0, Math.max(1 - w, 0.5 - c.x * w));
  const y = Math.min(0, Math.max(1 - h, 0.5 - c.y * h));
  const round = (value) => Math.round(value * 10000) / 10000;
  return { x: round(x), y: round(y), w: round(w), h: round(h) };
}
/** CSS background size/position equivalent to cropGeometry for a square element. */
export function cropBackground(asset, crop) {
  const g = cropGeometry(asset, crop);
  const pos = (offset, size) => (size <= 1 ? 50 : Math.round((offset / (1 - size)) * 10000) / 100);
  return {
    size: `${Math.round(g.w * 10000) / 100}% ${Math.round(g.h * 10000) / 100}%`,
    position: `${pos(g.x, g.w)}% ${pos(g.y, g.h)}%`,
  };
}
/** Scene map linked from the library: ok, missing (file deleted), or null (not linked). */
export function sceneMapState(state, sceneId) {
  const link = mediaOf(state)?.scenes?.[sceneId];
  const scene = state.scenes?.find((row) => row.id === sceneId);
  if (!link || !scene) return null;
  const asset = findAsset(state, link.assetId);
  if (asset) return scene.background === asset.dataUrl ? { status: "ok", asset } : null;
  // Another map chosen afterwards in the scene editor supersedes the broken link.
  return scene.background
    ? null
    : { status: "missing", assetId: link.assetId, name: missingName(state, link.assetId) };
}
/**
 * Whether a "readers" attachment is held back to the audience it had when attached: its
 * personal file was not shared (nobody else read the entry then), and still is not.
 */
function heldBack(state, attachment) {
  return (
    attachment.visibility === "readers" &&
    Array.isArray(attachment.audience) &&
    !findAsset(state, attachment.assetId)?.shared
  );
}
export function attachmentVisible(state, attachment, viewer) {
  if (!entryReadable(state, attachment.entryId, viewer)) return false;
  if (attachment.visibility === "readers")
    return !heldBack(state, attachment) || attachment.audience.includes(viewer);
  if (attachment.visibility === "dm") return attachment.addedBy === viewer || isDM(state, viewer);
  return attachment.addedBy === viewer;
}
/** The identities of this demonstration that could read something in the campaign. */
function identities(state) {
  return [...new Set(["player", "dm", ...campaignMembers(state).map((member) => member.id)])];
}
/** Who else can read the entry: its readers other than the viewer (Kanka "all"). */
export function otherEntryReaders(state, entryId, viewer) {
  return identities(state).filter((id) => id !== viewer && entryReadable(state, entryId, id));
}
function entryReadable(state, entryId, viewer) {
  try {
    return Boolean(getCampaignEntry(state, entryId, viewer));
  } catch {
    return false;
  }
}
function entryEditable(state, entryId, viewer) {
  try {
    return Boolean(getCampaignEntry(state, entryId, viewer).permissions.canEdit);
  } catch {
    return false;
  }
}
export function canAttachTo(state, entryId, viewer) {
  return entryEditable(state, entryId, viewer);
}
/** Attachments of one entry visible to the viewer, each with its asset or missing name. */
export function attachmentsFor(state, entryId, viewer) {
  return (mediaOf(state)?.attachments ?? [])
    .filter((row) => row.entryId === entryId && attachmentVisible(state, row, viewer))
    .map((row) => {
      const asset = findAsset(state, row.assetId);
      const canRemove = row.addedBy === viewer || entryEditable(state, row.entryId, viewer);
      return {
        ...clone(row),
        asset,
        missing: asset ? null : { name: missingName(state, row.assetId) },
        canRemove,
        // Visibility follows the same rules as attaching (Kanka: a dropdown per attachment).
        canChangeVisibility: canRemove && Boolean(asset),
        // Readers were added to the entry after a personal file was attached: they see it
        // only once its owner shares it, with source and licence.
        waitingShare:
          heldBack(state, row) &&
          otherEntryReaders(state, row.entryId, viewer).some((id) => !row.audience.includes(id)),
      };
    });
}
/** The title of an entry as the viewer reads it, {it, en}; an untitled entry by its kind. */
function entryTitle(state, entryId, viewer) {
  let entry = null;
  try {
    entry = getCampaignEntry(state, entryId, viewer);
  } catch {
    entry = null;
  }
  const title = entry?.data?.title;
  return title ? { it: title, en: title } : (ENTRY_KINDS[entry?.kind] ?? ENTRY_KINDS.note);
}
/** Whether players cannot see this creature at the Table (hidden actor or hidden token). */
export function hiddenCreature(state, actorId) {
  const actor = state.actors?.[actorId];
  if (!actor) return false;
  const scene = state.scenes?.find((row) => row.id === state.activeSceneId);
  const token = scene?.tokens?.find((row) => row.actorId === actorId);
  return Boolean(actor.hidden || token?.hidden || token?.visible === false);
}
/** Whether the viewer sees a scene at the Table: the DM always, others once revealed. */
export function sceneVisibleTo(state, scene, viewer) {
  return isDM(state, viewer) || Boolean(scene?.revealed && scene.id === state.activeSceneId);
}

// ---------------------------------------------------------------- uses kept by other areas

/**
 * Other areas that point at library files (B15 materials store "media:<id>") report those
 * uses here, so "Used in", the delete confirmation and the missing-reference report list
 * them. A provider is {uses(state, assetId, viewer) → {rows, hidden}, missing(state,
 * viewer) → [{id, assetId, label, route}]}; rows carry {label: {it, en}, route: {page,
 * params}}. B28 never edits another area's data: such a reference is fixed where it lives
 * (its route). A provider that fails is skipped and never breaks the library.
 */
const usageProviders = new Map();
export function addUsageProvider(id, provider, { ifAbsent = false } = {}) {
  if (!(ifAbsent && usageProviders.has(id))) usageProviders.set(id, provider);
}
export function removeUsageProvider(id) {
  usageProviders.delete(id);
}
function provided(method, ...args) {
  const out = [];
  for (const [area, provider] of usageProviders) {
    try {
      const value = provider[method]?.(...args);
      if (value) out.push({ area, value });
    } catch {
      /* another area's reader failed: its uses are simply not listed */
    }
  }
  return out;
}
/**
 * Everything that uses a file (Kanka "used in"): rows the viewer may see, with a route,
 * and a count of uses in content hidden from the viewer. The count stays in the domain:
 * the pages never show it, since it would disclose another identity's private content
 * (a private sheet, a DM-only attachment).
 */
export function usagesOf(state, assetId, viewer) {
  const rows = [];
  let hidden = 0;
  const data = mediaOf(state);
  if (!data) return { rows, hidden };
  for (const [actorId, look] of Object.entries(data.looks)) {
    const actor = state.actors?.[actorId];
    if (!actor) continue;
    const visible = canViewActor(actor, viewer, state);
    const scenes = (state.scenes ?? []).filter((scene) =>
      scene.tokens?.some((token) => token.actorId === actorId),
    );
    const where = scenes.length ? " · " + scenes.map((scene) => scene.name).join(", ") : "";
    if (look.portrait === assetId) {
      if (!visible) hidden += 1;
      else
        rows.push({
          kind: "portrait",
          actorId,
          label: {
            it: `Ritratto nella scheda di ${actor.name}`,
            en: `Portrait on ${actor.name}’s sheet`,
          },
          route: { page: "characters", params: { id: actorId, tab: "media" } },
        });
      if ((look.token?.active ?? "portrait") === "portrait") {
        if (!visible) hidden += 1;
        else
          rows.push({
            kind: "token",
            actorId,
            label: {
              it: `Pedina di ${actor.name} (dal ritratto)${where}`,
              en: `${actor.name}’s token (from the portrait)${where}`,
            },
            route: scenes.length
              ? { page: "table", params: {} }
              : { page: "characters", params: { id: actorId, tab: "media" } },
          });
      }
    }
    for (const variant of look.token?.variants ?? []) {
      if (variant.assetId !== assetId) continue;
      if (!visible) {
        hidden += 1;
        continue;
      }
      const active = look.token.active === variant.id;
      rows.push({
        kind: "token",
        actorId,
        variantId: variant.id,
        label: active
          ? {
              it: `Pedina di ${actor.name} · «${variant.label}»${where}`,
              en: `${actor.name}’s token · “${variant.label}”${where}`,
            }
          : {
              it: `Immagine alternativa della pedina di ${actor.name} · «${variant.label}» (non attiva)`,
              en: `Alternative image for ${actor.name}’s token · “${variant.label}” (not active)`,
            },
        route: { page: "characters", params: { id: actorId, tab: "media" } },
      });
    }
  }
  for (const scene of state.scenes ?? []) {
    const map = sceneMapState(state, scene.id);
    if (map?.status !== "ok" || map.asset.id !== assetId) continue;
    if (!sceneVisibleTo(state, scene, viewer)) {
      hidden += 1;
      continue;
    }
    rows.push({
      kind: "scene",
      sceneId: scene.id,
      label: { it: `Mappa della scena «${scene.name}»`, en: `Map of the scene “${scene.name}”` },
      route: isDM(state, viewer)
        ? { page: "preparation", params: { id: scene.id } }
        : { page: "table", params: {} },
    });
  }
  for (const row of data.attachments) {
    if (row.assetId !== assetId) continue;
    if (!attachmentVisible(state, row, viewer)) {
      hidden += 1;
      continue;
    }
    const title = entryTitle(state, row.entryId, viewer);
    rows.push({
      kind: "attachment",
      attachmentId: row.id,
      label: {
        it: `Allegato a «${title.it}» · ${VISIBILITIES[row.visibility]?.it ?? ""}`,
        en: `Attached to “${title.en}” · ${VISIBILITIES[row.visibility]?.en ?? ""}`,
      },
      route: { page: "campaign", params: { tab: "entry", id: row.entryId } },
    });
  }
  for (const { area, value } of provided("uses", state, assetId, viewer)) {
    for (const row of value.rows ?? []) rows.push({ ...row, kind: "external", area });
    hidden += Number(value.hidden) || 0;
  }
  return { rows, hidden };
}
/**
 * Broken references the viewer can fix (Owlbear missing-asset notice, Scene Packer asset
 * report): portraits and token images of actors they control, scene maps for the DM and
 * attachments they can remove.
 */
export function missingReferences(state, viewer) {
  const data = mediaOf(state);
  if (!data) return [];
  const out = [];
  for (const [actorId, look] of Object.entries(data.looks)) {
    const actor = state.actors?.[actorId];
    if (!actor || !canControlActor(actor, viewer, state)) continue;
    if (look.portrait && !findAsset(state, look.portrait))
      out.push({
        kind: "portrait",
        actorId,
        name: missingName(state, look.portrait),
        label: { it: `Ritratto di ${actor.name}`, en: `${actor.name}’s portrait` },
        route: { page: "characters", params: { id: actorId, tab: "media" } },
      });
    for (const variant of look.token?.variants ?? [])
      if (!findAsset(state, variant.assetId))
        out.push({
          kind: "variant",
          actorId,
          variantId: variant.id,
          name: missingName(state, variant.assetId),
          label: {
            it: `Immagine «${variant.label}» della pedina di ${actor.name}`,
            en: `Image “${variant.label}” of ${actor.name}’s token`,
          },
          route: { page: "characters", params: { id: actorId, tab: "media" } },
        });
  }
  if (isDM(state, viewer))
    for (const scene of state.scenes ?? []) {
      const map = sceneMapState(state, scene.id);
      if (map?.status === "missing")
        out.push({
          kind: "scene",
          sceneId: scene.id,
          name: map.name,
          label: {
            it: `Mappa della scena «${scene.name}»`,
            en: `Map of the scene “${scene.name}”`,
          },
          route: { page: "table", params: {} },
        });
    }
  for (const row of data.attachments)
    if (
      !findAsset(state, row.assetId) &&
      attachmentVisible(state, row, viewer) &&
      (row.addedBy === viewer || entryEditable(state, row.entryId, viewer))
    )
      out.push({
        kind: "attachment",
        attachmentId: row.id,
        name: missingName(state, row.assetId),
        label: {
          it: `Allegato di «${entryTitle(state, row.entryId, viewer).it}»`,
          en: `Attachment of “${entryTitle(state, row.entryId, viewer).en}”`,
        },
        route: { page: "campaign", params: { tab: "entry", id: row.entryId } },
      });
  // Uses kept by other areas: fixed where they live (their route), never removed from here.
  for (const { area, value } of provided("missing", state, viewer))
    for (const row of value)
      if (!findAsset(state, row.assetId))
        out.push({ ...row, kind: "external", area, name: missingName(state, row.assetId) });
  return out;
}
/** The viewer's own notes on PDFs deleted since, each with the deleted file's name. */
export function orphanAnnotations(state, viewer) {
  return (mediaOf(state)?.annotations ?? [])
    .filter((row) => row.owner === viewer && !findAsset(state, row.assetId))
    .map((row) => ({ ...clone(row), name: missingName(state, row.assetId) }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.page - b.page);
}
export function annotationsFor(state, assetId, viewer) {
  return (mediaOf(state)?.annotations ?? [])
    .filter((row) => row.assetId === assetId && row.owner === viewer)
    .sort((a, b) => a.page - b.page || a.createdAt.localeCompare(b.createdAt));
}
/** Whether a change to this asset is visible to others (so it is a shared change). */
export function assetIsShared(state, assetId) {
  const asset = findAsset(state, assetId);
  if (asset?.shared) return true;
  const data = mediaOf(state);
  return Boolean(
    Object.entries(data?.looks ?? {}).some(
      ([actorId, look]) =>
        !isPrivateActor(state.actors?.[actorId]) &&
        (look.portrait === assetId || look.token?.variants?.some((v) => v.assetId === assetId)),
    ) ||
    Object.values(data?.scenes ?? {}).some((link) => link.assetId === assetId) ||
    data?.attachments.some(
      (row) =>
        row.assetId === assetId &&
        row.visibility !== "self" &&
        !(heldBack(state, row) && row.audience.every((id) => id === asset?.owner)),
    ),
  );
}

// ---------------------------------------------------------------- commands

function cleanName(value, fallback) {
  const text = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  const name = text || String(fallback ?? "").trim();
  if (!name) fail("Indica un nome per il file.", "Give the file a name.", "name");
  if (name.length > LIMITS.name)
    fail(
      `Il nome può avere al massimo ${LIMITS.name} caratteri.`,
      `The name can have at most ${LIMITS.name} characters.`,
      "name",
    );
  return name;
}
export function parseTags(value) {
  const tags = [
    ...new Set(
      (Array.isArray(value) ? value : String(value ?? "").split(","))
        .map((tag) => String(tag).trim().toLocaleLowerCase())
        .filter(Boolean),
    ),
  ];
  if (tags.length > LIMITS.tags)
    fail(
      `Al massimo ${LIMITS.tags} tag per file.`,
      `At most ${LIMITS.tags} tags per file.`,
      "tags",
    );
  if (tags.some((tag) => tag.length > LIMITS.tag))
    fail(
      `Ogni tag può avere al massimo ${LIMITS.tag} caratteri.`,
      `Each tag can have at most ${LIMITS.tag} characters.`,
      "tags",
    );
  return tags;
}
/**
 * Refuses a file that would not fit: in this identity's quota, or in the space this
 * browser keeps for every identity's files. Checked before the import wheel opens and
 * again inside the command.
 */
export function checkRoom(state, owner, extra) {
  const { used, limit, browser } = quota(state, owner);
  if (used + extra > limit)
    fail(
      `Spazio esaurito: ${formatBytes("it", used)} usati su ${formatBytes("it", limit)}. Elimina qualcosa o scegli un file più piccolo.`,
      `Out of space: ${formatBytes("en", used)} used of ${formatBytes("en", limit)}. Delete something or choose a smaller file.`,
      "quota",
    );
  if (browser.used + extra > browser.limit)
    fail(
      `Spazio di questo browser esaurito: i file di tutte le identità della dimostrazione occupano ${formatBytes("it", browser.used)} su ${formatBytes("it", browser.limit)}. Elimina qualcosa o scegli un file più piccolo.`,
      `This browser is out of space: every demonstration identity’s files take ${formatBytes("en", browser.used)} of ${formatBytes("en", browser.limit)}. Delete something or choose a smaller file.`,
      "quota",
    );
}
const checkQuota = checkRoom;
function checkPayload(file) {
  if (!isDataUrl(file?.dataUrl))
    fail("Il file non è leggibile.", "The file cannot be read.", "data");
  const mime = mimeOf(file.dataUrl);
  const kind = mime === PDF_TYPE ? "pdf" : "image";
  const bytes = dataBytes(file.dataUrl);
  checkFile({ name: file.fileName || file.name, type: mime, size: bytes });
  if (kind === "image") checkDimensions(file.fileName || file.name, file.width, file.height);
  return { mime, kind, bytes };
}
function folderFor(state, viewer, folderId, use) {
  if (!folderId) return SYSTEM_FOLDERS.find((folder) => folder.use === use).id;
  if (!foldersFor(state, viewer).some((folder) => folder.id === folderId))
    fail("Cartella non disponibile.", "Folder unavailable.", "folder");
  return folderId;
}
/** Adds a validated local file to the viewer's library. Returns the new asset id. */
export function addAsset(state, viewer, file) {
  const data = slice(state);
  if (!["player", "dm"].includes(viewer)) fail("Identità sconosciuta.", "Unknown identity.");
  const { mime, kind, bytes } = checkPayload(file);
  const use = kind === "pdf" ? "document" : file.use;
  if (!USES.includes(use) || (kind === "image" && use === "document"))
    fail("Scegli che cos’è il file.", "Choose what the file is.", "use");
  checkQuota(state, viewer, bytes);
  const id = newId("m");
  const time = now();
  data.assets.push({
    id,
    owner: viewer,
    name: cleanName(file.name, String(file.fileName ?? "").replace(/\.[^.]+$/, "")),
    fileName: String(file.fileName || file.name || "").slice(0, 120),
    folderId: folderFor(state, viewer, file.folderId, use),
    tags: parseTags(file.tags ?? []),
    kind,
    mime,
    bytes,
    width: kind === "image" ? file.width : 0,
    height: kind === "image" ? file.height : 0,
    pages: kind === "pdf" ? (Number.isInteger(file.pages) ? file.pages : null) : null,
    dataUrl: file.dataUrl,
    use,
    createdAt: time,
    updatedAt: time,
    revision: 1,
    shared: false,
    provenance: null,
  });
  return id;
}
export function updateAsset(state, viewer, id, changes) {
  const asset = ownAsset(state, id, viewer);
  if ("name" in changes) asset.name = cleanName(changes.name);
  if ("tags" in changes) asset.tags = parseTags(changes.tags);
  if ("use" in changes) {
    if (!USES.includes(changes.use) || (asset.kind === "pdf") !== (changes.use === "document"))
      fail("Tipo non valido per questo file.", "Invalid type for this file.", "use");
    asset.use = changes.use;
  }
  if ("folderId" in changes) asset.folderId = folderFor(state, viewer, changes.folderId, asset.use);
  asset.updatedAt = now();
}
function sceneCopies(state, assetId) {
  return (state.scenes ?? []).filter(
    (scene) => mediaOf(state).scenes[scene.id]?.assetId === assetId,
  );
}
/**
 * Replaces the file keeping its identity: every portrait, token, attachment and scene map
 * using it shows the new file (Roll20/Foundry replace). Returns the updated uses count.
 */
export function replaceAsset(state, viewer, id, file) {
  const asset = ownAsset(state, id, viewer);
  const { mime, kind, bytes } = checkPayload(file);
  if (kind !== asset.kind)
    fail(
      kind === "pdf"
        ? "Sostituisci un’immagine con un’altra immagine."
        : "Sostituisci un PDF con un altro PDF.",
      kind === "pdf" ? "Replace an image with another image." : "Replace a PDF with another PDF.",
      "kind",
    );
  checkQuota(state, viewer, bytes - asset.bytes);
  const linked = sceneCopies(state, id).filter(
    (scene) => sceneMapState(state, scene.id)?.status === "ok",
  );
  if (linked.length && !IMAGE_TYPES.includes(mime))
    fail("Una mappa deve essere PNG, JPEG o WebP.", "A map must be PNG, JPEG or WebP.", "kind");
  Object.assign(asset, {
    fileName: String(file.fileName || asset.fileName).slice(0, 120),
    mime,
    bytes,
    width: kind === "image" ? file.width : 0,
    height: kind === "image" ? file.height : 0,
    pages: kind === "pdf" ? (Number.isInteger(file.pages) ? file.pages : null) : null,
    dataUrl: file.dataUrl,
    revision: asset.revision + 1,
    updatedAt: now(),
  });
  for (const scene of linked)
    Object.assign(scene, {
      background: asset.dataUrl,
      imageName: asset.fileName,
      imageWidth: asset.width,
      imageHeight: asset.height,
    });
  return linked.length;
}
/**
 * Deletes a file. Its uses stay as references and become visible "missing" notices with a
 * fix (Owlbear VTL-240); a linked scene map is removed from the scene, not left blank
 * silently. Personal PDF notes stay with their authors (Owlbear PDF!, VTL-194: each
 * person's notes are their own), listed as notes on a deleted file. Undo restores the file
 * and every use.
 */
export function deleteAsset(state, viewer, id) {
  const data = slice(state);
  const asset = ownAsset(state, id, viewer);
  for (const scene of sceneCopies(state, id))
    if (sceneMapState(state, scene.id)?.status === "ok")
      Object.assign(scene, { background: null, imageName: "", imageWidth: 0, imageHeight: 0 });
  data.assets = data.assets.filter((row) => row.id !== id);
  data.removed = [
    ...data.removed.filter((row) => row.id !== id),
    {
      id,
      name: asset.name,
      owner: asset.owner,
      kind: asset.kind,
      removedAt: now(),
      removedBy: viewer,
    },
  ].slice(-50);
}
/**
 * Validates provenance. `intent` words the refusal ("share" or "save"); the refusal names
 * the first field to correct (`field`: source, author, license or link).
 */
export function checkProvenance(value, { intent = "share" } = {}) {
  const source = value?.source;
  const author = String(value?.author ?? "").trim();
  const license = String(value?.license ?? "").trim();
  const link = String(value?.link ?? "").trim();
  const missing = !SOURCES[source] ? "source" : !author ? "author" : !license ? "license" : "";
  if (missing)
    fail(
      intent === "save"
        ? "Per salvare la provenienza indica la fonte, l’autore o il credito e la licenza."
        : "Per condividere indica la provenienza, l’autore o il credito e la licenza.",
      intent === "save"
        ? "To save the source, state where it comes from, the author or credit and the licence."
        : "To share, state the source, the author or credit and the licence.",
      "provenance",
      missing,
    );
  if (author.length > LIMITS.credit || license.length > LIMITS.credit)
    fail(
      `Autore e licenza possono avere al massimo ${LIMITS.credit} caratteri.`,
      `Author and licence can have at most ${LIMITS.credit} characters.`,
      "provenance",
      author.length > LIMITS.credit ? "author" : "license",
    );
  if (link && (link.length > LIMITS.link || !/^https?:\/\/\S+$/i.test(link)))
    fail(
      "Il collegamento deve iniziare con http:// o https://.",
      "The link must start with http:// or https://.",
      "provenance",
      "link",
    );
  return { source, author, license, link };
}
export function setProvenance(state, viewer, id, provenance) {
  const asset = ownAsset(state, id, viewer);
  asset.provenance = checkProvenance(provenance, { intent: "save" });
  asset.updatedAt = now();
}
/** Shares a file with the campaign (provenance and licence required) or stops sharing. */
export function shareAsset(state, viewer, id, shared, provenance = null) {
  const asset = ownAsset(state, id, viewer);
  if (shared) {
    if (provenance) asset.provenance = checkProvenance(provenance);
    asset.provenance = checkProvenance(asset.provenance);
    if (!isCampaignMember(state, state.campaign?.id, viewer))
      fail("Non fai parte della campagna.", "You are not part of the campaign.", "member");
  }
  asset.shared = Boolean(shared);
  asset.updatedAt = now();
}
export function createFolder(state, viewer, name) {
  const data = slice(state);
  const text = cleanName(name);
  const own = data.folders.filter((folder) => folder.owner === viewer);
  if (own.length >= LIMITS.folders) fail("Troppe cartelle.", "Too many folders.", "folders");
  if (
    foldersFor(state, viewer).some(
      (folder) =>
        folderName(folder, "it").toLocaleLowerCase() === text.toLocaleLowerCase() ||
        folderName(folder, "en").toLocaleLowerCase() === text.toLocaleLowerCase(),
    )
  )
    fail(
      "Esiste già una cartella con questo nome.",
      "A folder with this name already exists.",
      "folders",
    );
  const id = newId("f");
  data.folders.push({ id, owner: viewer, name: text });
  return id;
}
export function deleteFolder(state, viewer, id) {
  const data = slice(state);
  const folder = data.folders.find((row) => row.id === id && row.owner === viewer);
  if (!folder) fail("Cartella non disponibile.", "Folder unavailable.", "folder");
  if (data.assets.some((asset) => asset.folderId === id))
    fail(
      "Sposta o elimina prima i file della cartella.",
      "Move or delete the folder’s files first.",
      "folder",
    );
  data.folders = data.folders.filter((row) => row.id !== id);
}
function lookFor(state, actorId) {
  const data = slice(state);
  data.looks[actorId] ??= {
    portrait: null,
    token: { active: "portrait", crop: { ...DEFAULT_CROP }, variants: [] },
  };
  const look = data.looks[actorId];
  look.token ??= { active: "portrait", crop: { ...DEFAULT_CROP }, variants: [] };
  look.token.variants ??= [];
  return look;
}
export function setPortrait(state, viewer, actorId, assetId) {
  controlled(state, actorId, viewer);
  const look = lookFor(state, actorId);
  if (assetId) usableAsset(state, assetId, viewer);
  if (look.portrait !== assetId) look.token.crop = { ...DEFAULT_CROP };
  look.portrait = assetId || null;
}
/** Sheet colour (D&D Beyond "theme": the sheet's line colour). */
export function setTheme(state, viewer, actorId, theme) {
  controlled(state, actorId, viewer);
  if (theme && !THEMES[theme]) fail("Tema non valido.", "Invalid theme.", "theme");
  lookFor(state, actorId).theme = theme || null;
}
export function checkCrop(crop) {
  const ok = (value, min, max) => Number.isFinite(value) && value >= min && value <= max;
  if (!ok(crop?.x, 0, 1) || !ok(crop?.y, 0, 1) || !ok(crop?.zoom, 1, 4))
    fail("Ritaglio non valido.", "Invalid crop.", "crop");
  return { x: crop.x, y: crop.y, zoom: crop.zoom };
}
export function setTokenCrop(state, viewer, actorId, target, crop) {
  controlled(state, actorId, viewer);
  const look = lookFor(state, actorId);
  const value = checkCrop(crop);
  if (target === "portrait") look.token.crop = value;
  else {
    const variant = look.token.variants.find((row) => row.id === target);
    if (!variant) fail("Immagine non trovata.", "Image not found.", "variant");
    variant.crop = value;
  }
}
/**
 * The token image that already shows this file: "portrait" when it is the portrait, the
 * alternative image's id, or null.
 */
export function tokenImageOf(state, actorId, assetId) {
  const look = lookOf(state, actorId);
  if (!look || !assetId) return null;
  if (look.portrait === assetId) return "portrait";
  return look.token?.variants?.find((row) => row.assetId === assetId)?.id ?? null;
}
/**
 * Adds an alternative image to a token and returns its id. A file that is already one of
 * the token's images is not added twice: that image is chosen instead (Changr, VTL-104),
 * and its id ("portrait" for the portrait) is returned.
 */
export function addTokenVariant(state, viewer, actorId, assetId, label, { activate = false } = {}) {
  controlled(state, actorId, viewer);
  const asset = usableAsset(state, assetId, viewer);
  const look = lookFor(state, actorId);
  const existing = tokenImageOf(state, actorId, assetId);
  if (existing) {
    if (activate) look.token.active = existing;
    return existing;
  }
  if (look.token.variants.length >= LIMITS.variants)
    fail(
      `Al massimo ${LIMITS.variants} immagini alternative per pedina.`,
      `At most ${LIMITS.variants} alternative images per token.`,
      "variants",
    );
  const text = String(label ?? "").trim() || asset.name.slice(0, LIMITS.label);
  if (text.length > LIMITS.label)
    fail(
      `Il nome dell’immagine può avere al massimo ${LIMITS.label} caratteri.`,
      `The image name can have at most ${LIMITS.label} characters.`,
      "label",
    );
  const id = newId("v");
  look.token.variants.push({ id, assetId, label: text, crop: { ...DEFAULT_CROP } });
  if (activate) look.token.active = id;
  return id;
}
export function removeTokenVariant(state, viewer, actorId, variantId) {
  controlled(state, actorId, viewer);
  const look = lookFor(state, actorId);
  if (!look.token.variants.some((row) => row.id === variantId))
    fail("Immagine non trovata.", "Image not found.", "variant");
  look.token.variants = look.token.variants.filter((row) => row.id !== variantId);
  if (look.token.active === variantId) look.token.active = "portrait";
}
/** Points an alternative image at another file, keeping its name (missing-image fix). */
export function replaceVariantAsset(state, viewer, actorId, variantId, assetId) {
  controlled(state, actorId, viewer);
  usableAsset(state, assetId, viewer);
  const variant = lookFor(state, actorId).token.variants.find((row) => row.id === variantId);
  if (!variant) fail("Immagine non trovata.", "Image not found.", "variant");
  variant.assetId = assetId;
  variant.crop = { ...DEFAULT_CROP };
}
/** Chooses the image shown on the token: the portrait or one alternative image. */
export function setActiveToken(state, viewer, actorId, target) {
  controlled(state, actorId, viewer);
  const look = lookFor(state, actorId);
  if (target !== "portrait" && !look.token.variants.some((row) => row.id === target))
    fail("Immagine non trovata.", "Image not found.", "variant");
  look.token.active = target;
}
/** Removes a broken reference (the "missing" notice's second action). */
export function clearMissing(state, viewer, ref) {
  const data = slice(state);
  if (ref.kind === "portrait") {
    controlled(state, ref.actorId, viewer);
    const look = lookFor(state, ref.actorId);
    if (look.portrait && !findAsset(state, look.portrait)) look.portrait = null;
  } else if (ref.kind === "variant") {
    removeTokenVariant(state, viewer, ref.actorId, ref.variantId);
  } else if (ref.kind === "scene") {
    if (!isDM(state, viewer))
      fail("Solo il DM gestisce le scene.", "Only the DM manages scenes.", "dm");
    delete data.scenes[ref.sceneId];
  } else if (ref.kind === "attachment") {
    detach(state, viewer, ref.attachmentId);
  } else if (ref.kind === "external") {
    fail(
      "Questo riferimento appartiene a un’altra sezione: aprilo lì per scegliere un’altra immagine.",
      "This reference belongs to another section: open it there to choose another image.",
      "external",
    );
  } else fail("Riferimento sconosciuto.", "Unknown reference.");
}
/** Uses a library image as a scene map (DM). The scene keeps its geometry and walls. */
export function setSceneMap(state, viewer, sceneId, assetId) {
  const data = slice(state);
  if (!isDM(state, viewer))
    fail(
      "Solo il DM può cambiare la mappa di una scena.",
      "Only the DM can change a scene map.",
      "dm",
    );
  const scene = state.scenes?.find((row) => row.id === sceneId);
  if (!scene) fail("Scena non trovata.", "Scene not found.", "scene");
  const asset = usableAsset(state, assetId, viewer);
  if (!IMAGE_TYPES.includes(asset.mime))
    fail("Una mappa deve essere PNG, JPEG o WebP.", "A map must be PNG, JPEG or WebP.", "kind");
  Object.assign(scene, {
    background: asset.dataUrl,
    imageName: asset.fileName,
    imageWidth: asset.width,
    imageHeight: asset.height,
  });
  data.scenes[sceneId] = { assetId };
}
/**
 * Whether showing this personal file to the entry's readers would share it with the
 * campaign: it is not shared yet and someone other than the viewer reads the entry.
 */
export function readersNeedShare(state, entryId, asset, viewer) {
  return Boolean(asset && !asset.shared && otherEntryReaders(state, entryId, viewer).length > 0);
}
/**
 * What showing a file to an entry's readers needs. A shared file needs nothing. A personal
 * file on an entry nobody else reads stays personal: the attachment keeps that audience
 * (`audience`) and follows the entry's readers only once the file is shared. Otherwise
 * the file is shared with the campaign, which needs its owner's explicit confirmation in
 * the same step (`share`) and its source and licence (Roll20 SVC-138): saved provenance
 * alone never shares a file.
 */
function readersAccess(state, viewer, entryId, asset, { provenance = null, share = false } = {}) {
  if (asset.shared) return {};
  if (asset.owner !== viewer)
    fail("Il file non è condiviso.", "The file is not shared.", "provenance");
  if (!readersNeedShare(state, entryId, asset, viewer)) return { audience: [viewer] };
  if (!share)
    fail(
      "Altri leggono questa voce: per mostrare loro il file conferma che lo condividi con la campagna, con provenienza e licenza.",
      "Others read this entry: to show them the file, confirm that you share it with the campaign, with its source and licence.",
      "share",
      "share",
    );
  shareAsset(state, viewer, asset.id, true, provenance);
  return {};
}
function checkDuplicate(data, entryId, assetId, visibility, exceptId = "") {
  if (
    data.attachments.some(
      (row) =>
        row.id !== exceptId &&
        row.entryId === entryId &&
        row.assetId === assetId &&
        row.visibility === visibility,
    )
  )
    fail(
      "Il file è già allegato a questa voce.",
      "The file is already attached to this entry.",
      "duplicate",
    );
}
/**
 * Attaches a file to a campaign entry with its own visibility (Kanka CMP-28). Showing a
 * personal file to the entry's other readers shares it, confirmed in the same command
 * (`share: true`) with provenance and licence; see readersAccess.
 */
export function attach(
  state,
  viewer,
  entryId,
  assetId,
  visibility,
  { provenance = null, share = false } = {},
) {
  const data = slice(state);
  if (!entryEditable(state, entryId, viewer))
    fail(
      "Puoi allegare file solo alle voci che puoi modificare.",
      "You can attach files only to entries you can edit.",
      "entry",
    );
  if (!VISIBILITIES[visibility])
    fail("Visibilità non valida.", "Invalid visibility.", "visibility");
  const asset = usableAsset(state, assetId, viewer, null);
  if (data.attachments.filter((row) => row.entryId === entryId).length >= LIMITS.attachments)
    fail(
      `Al massimo ${LIMITS.attachments} allegati per voce.`,
      `At most ${LIMITS.attachments} attachments per entry.`,
      "attachments",
    );
  checkDuplicate(data, entryId, assetId, visibility);
  const extra =
    visibility === "readers"
      ? readersAccess(state, viewer, entryId, asset, { provenance, share })
      : {};
  const id = newId("att");
  data.attachments.push({
    id,
    entryId,
    assetId,
    visibility,
    addedBy: viewer,
    addedAt: now(),
    ...extra,
  });
  return id;
}
/**
 * Changes who sees an existing attachment (Kanka CMP-28: a visibility per attachment), with
 * the same rules as attaching. "Only me" is for whoever attached it.
 */
export function setAttachmentVisibility(
  state,
  viewer,
  attachmentId,
  visibility,
  { provenance = null, share = false } = {},
) {
  const data = slice(state);
  const row = data.attachments.find((value) => value.id === attachmentId);
  if (!row || !attachmentVisible(state, row, viewer))
    fail("Allegato non trovato.", "Attachment not found.", "attachment");
  if (row.addedBy !== viewer && !entryEditable(state, row.entryId, viewer))
    fail("Non puoi cambiare questo allegato.", "You cannot change this attachment.", "attachment");
  if (!VISIBILITIES[visibility])
    fail("Visibilità non valida.", "Invalid visibility.", "visibility");
  if (visibility === row.visibility) return;
  if (visibility === "self" && row.addedBy !== viewer)
    fail(
      "Solo chi l’ha allegato può tenerlo per sé.",
      "Only whoever attached it can keep it to themselves.",
      "visibility",
    );
  const asset = findAsset(state, row.assetId);
  if (!asset || !canSeeAsset(state, asset, viewer))
    fail("Il file non è disponibile.", "The file is unavailable.", "missing");
  checkDuplicate(data, row.entryId, row.assetId, visibility, row.id);
  const extra =
    visibility === "readers"
      ? readersAccess(state, viewer, row.entryId, asset, { provenance, share })
      : {};
  delete row.audience;
  Object.assign(row, { visibility }, extra);
}
export function detach(state, viewer, attachmentId) {
  const data = slice(state);
  const row = data.attachments.find((value) => value.id === attachmentId);
  if (!row || !attachmentVisible(state, row, viewer))
    fail("Allegato non trovato.", "Attachment not found.", "attachment");
  if (row.addedBy !== viewer && !entryEditable(state, row.entryId, viewer))
    fail("Non puoi togliere questo allegato.", "You cannot remove this attachment.", "attachment");
  data.attachments = data.attachments.filter((value) => value.id !== attachmentId);
}
/** A personal note on a page of a PDF, readable only by its author (Owlbear PDF!). */
export function addAnnotation(state, viewer, assetId, page, text) {
  const data = slice(state);
  const asset = usableAsset(state, assetId, viewer, "pdf");
  const max = asset.pages ?? 999;
  if (!Number.isInteger(page) || page < 1 || page > max)
    fail(`Indica una pagina da 1 a ${max}.`, `Give a page from 1 to ${max}.`, "page");
  const body = String(text ?? "").trim();
  if (!body || body.length > LIMITS.annotation)
    fail(
      `Scrivi una nota da 1 a ${LIMITS.annotation} caratteri.`,
      `Write a note of 1 to ${LIMITS.annotation} characters.`,
      "annotation",
    );
  const id = newId("ann");
  data.annotations.push({ id, owner: viewer, assetId, page, text: body, createdAt: now() });
  return id;
}
export function removeAnnotation(state, viewer, id) {
  const data = slice(state);
  if (!data.annotations.some((row) => row.id === id && row.owner === viewer))
    fail("Nota non trovata.", "Note not found.", "annotation");
  data.annotations = data.annotations.filter((row) => row.id !== id);
}
