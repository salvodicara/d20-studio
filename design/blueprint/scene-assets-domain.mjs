// B47 — advanced scenes: pure domain. Scene folders and archive, scene variants, scene
// objects (stickers, tiles, roofs), prefabs, the off-map staging area, the starting view and
// saved views. Floors and stairs are in scene-levels.mjs; Universal VTT in uvtt-import.mjs.
// Every command takes (state, role, …), mutates the given draft and throws an Error with
// `it`/`en` to refuse. The slice lives in state.ext["scene-assets"].
//
// Patterns (source IDs in docs/interview/CAPABILITY_CENSUS.md and the market census):
// - Roll20 Page Menu (R20-084): nested folders, breadcrumb, search that skips the archive,
//   card menu with duplicate / archive; Monk's Scene Navigation keeps chapters (FVT-107).
// - Scene variants: Shard alternate images with pins anchored to the map (VTL-075), Quest
//   Portal's variant switcher (VTL-077). A variant changes only the look; geometry, tokens,
//   pins and every area's per-scene data stay, because the scene stays the same record.
// - Objects: Foundry tiles with occlusion fade, lock and elevation (FVT-078), D&D Beyond
//   stickers (DDB-107: search, "+", width in real units, visibility toggle, lock, delete),
//   Roll20 foreground layer that fades when a controlled token enters (R20-097).
// - Bulk edit and list: Foundry V14 Placeables Palette (FVT-079), Owlbear Outliner (VTL-107).
// - Prefabs: Owlbear Prefabs (VTL-081): save a selection, name, collection, insert at a
//   point; a prefab is itself an editable scene.
// - Off-map area: Roll20 objects outside the page are visible only to the GM (R20-091).
// - Views: Owlbear Default View (VTL-109: used on entry and on "reset view"), AboveVTT
//   F1–F4 / Shift+F1–F4 saved camera positions and Tabletop Simulator camera states (VTL-165).
import { stickerById } from "./scene-assets-art.mjs";
import { stackOf, seedTowerLevels } from "./scene-levels.mjs";
import { COURTYARD_NIGHT_IMAGE, TOWER_TOP_IMAGE } from "./scene-assets-images.mjs";
import { validateSceneGeometry } from "./spatial.mjs";
import {
  addLight,
  sliceOf as fogSliceOf,
  sceneConfig as fogScene,
  updateLight,
  removeLight,
  LIGHT_PRESETS,
} from "./fog-vision-domain.mjs";
import {
  canViewActor,
  isCampaignActor,
  isActorAvailable,
  canControlActor,
} from "./character-access.mjs";

export const ID = "scene-assets";
export const VERSION = 1;
/** Width of the off-map area around a scene, in scene pixels (Roll20 R20-091). */
export const OFF_MAP = 240;
export const LIMITS = Object.freeze({
  props: 300,
  folders: 100,
  depth: 4,
  prefabs: 60,
  prefabProps: 80,
  variants: 8,
  archive: 200,
  staged: 20,
  views: 3,
});
const IMAGE_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE_CHARS = Math.ceil((1024 * 1024 * 4) / 3) + 100;
const TEMPLATES = ["blank", "courtyard", "camp"];

const L = (it, en) => Object.freeze({ it, en });
export const fail = (it, en) => {
  throw Object.assign(new Error(en), { it, en });
};
const copy = (value) => structuredClone(value);
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
export const uid = (prefix) =>
  prefix +
  "-" +
  (globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36))
    .replace(/-/g, "")
    .slice(0, 10);
const round1 = (n) => Math.round(n * 10) / 10;
const cleanName = (value, max = 80) =>
  String(value ?? "")
    .trim()
    .slice(0, max);
export const sliceOf = (state) => state?.ext?.[ID] ?? null;
function mutable(state) {
  const value = sliceOf(state);
  if (!value) fail("Cartelle, oggetti e piani delle scene non sono disponibili.", "Scene folders, objects and floors are unavailable.");
  return value;
}
export function requireDM(role) {
  if (role !== "dm")
    fail(
      "Solo il DM prepara scene, cartelle e oggetti.",
      "Only the DM prepares scenes, folders and objects.",
    );
}
export const sceneOf = (state, id) => state?.scenes?.find((scene) => scene.id === id) ?? null;
function requireScene(state, id) {
  const scene = sceneOf(state, id);
  if (!scene) fail("La scena non esiste più.", "The scene no longer exists.");
  return scene;
}
const authored = (title) => ({
  kind: "authored-demo",
  edition: "2024",
  revision: "blueprint-b47-v1",
  title,
});

// ------------------------------------------------------------------------------ slice

export function emptySlice() {
  return {
    folders: [],
    placement: {},
    archive: [],
    variants: {},
    stacks: {},
    props: {},
    prefabs: [],
    staged: {},
    views: { default: {}, saved: {} },
    prefs: {},
    pendingLights: {},
  };
}
export function normalizeSlice(value, fromVersion) {
  if (fromVersion > VERSION) throw Error("Advanced scene data from a newer version");
  const next = isObject(value) ? value : {};
  const base = emptySlice();
  for (const key of Object.keys(base)) {
    const want = Array.isArray(base[key]) ? "array" : "object";
    const ok = want === "array" ? Array.isArray(next[key]) : isObject(next[key]);
    if (!ok) next[key] = base[key];
  }
  if (!isObject(next.views.default)) next.views.default = {};
  if (!isObject(next.views.saved)) next.views.saved = {};
  for (const [sceneId, list] of Object.entries(next.props))
    if (!Array.isArray(list)) delete next.props[sceneId];
  for (const [sceneId, list] of Object.entries(next.staged))
    if (!Array.isArray(list)) delete next.staged[sceneId];
  return next;
}

// ------------------------------------------------------------------------------ seed

const prop = (id, sticker, x, y, width, extra = {}) => {
  const art = stickerById(sticker);
  return {
    id,
    sticker,
    name: extra.name ?? art.name.it,
    x,
    y,
    width,
    height: Math.round(width * art.aspect),
    rotation: extra.rotation ?? 0,
    layer: extra.layer ?? art.layer,
    hidden: extra.hidden === true,
    locked: extra.locked === true,
    fade: extra.fade ?? 0.2,
    ...(extra.prefab ? { prefab: extra.prefab } : {}),
  };
};
const CAMP = (prefix, dx = 0, dy = 0, prefab = null) => [
  prop(`${prefix}-tent-1`, "tent", 590 + dx, 470 + dy, 100, { prefab }),
  prop(`${prefix}-tent-2`, "tent", 790 + dx, 480 + dy, 100, { rotation: 15, prefab }),
  prop(`${prefix}-fire`, "campfire", 690 + dx, 395 + dy, 55, { prefab }),
  prop(`${prefix}-crate-1`, "crate", 880 + dx, 400 + dy, 38, { rotation: 10, prefab }),
  prop(`${prefix}-crate-2`, "crate", 915 + dx, 440 + dy, 38, { rotation: -8, prefab }),
  prop(`${prefix}-barrel`, "barrel", 890 + dx, 525 + dy, 36, { prefab }),
  prop(`${prefix}-bedroll`, "bedroll", 690 + dx, 560 + dy, 34, { rotation: 90, prefab }),
];
function clearingScene() {
  const wall = (id, ax, ay, bx, by) => ({
    id,
    kind: "wall",
    a: { x: ax, y: ay },
    b: { x: bx, y: by },
    blocksMovement: true,
    blocksSight: true,
    blocksEffect: true,
    secret: false,
    source: authored("Forest clearing hut wall"),
  });
  return {
    id: "forest-clearing",
    name: "La radura dei goblin",
    description:
      "Accampamento goblin nel bosco di Bruma. La capanna del capo ha il tetto (sfuma quando entra una pedina). Sul sentiero c’è una trappola a scatto nascosta ai giocatori; una sentinella aspetta fuori mappa.",
    publicDescription: "Una radura tra gli abeti; odore di fumo e un sentiero battuto.",
    gridSize: 50,
    metersPerCell: 1.5,
    width: 1000,
    height: 650,
    gridOffsetX: 0,
    gridOffsetY: 0,
    gridVisible: true,
    gridSnap: false,
    background: null,
    revealed: false,
    revealedTo: [],
    template: "blank",
    tokens: [
      { id: "token-livia-clearing", actorId: "livia", x: 740, y: 330 },
      { id: "token-doran-clearing", actorId: "doran", x: 200, y: 560 },
      { id: "token-mira-clearing", actorId: "mira", x: 130, y: 500 },
    ],
    // The chief's hut: four walls with a doorway in the south wall (710–770).
    walls: [
      wall("hut-north", 620, 90, 860, 90),
      wall("hut-east", 860, 90, 860, 280),
      wall("hut-west", 620, 90, 620, 280),
      wall("hut-south-1", 620, 280, 710, 280),
      wall("hut-south-2", 770, 280, 860, 280),
    ],
    terrain: [],
  };
}
/**
 * The synthetic sample: chapter folders for the campaign's scenes, the courtyard's night
 * variant, the Lantern tower's upper floor (with the B35 ground floor), the goblin clearing
 * with five trees, a roof, a hidden locked trap and a sentinel waiting off the map, and the
 * "Goblin camp" prefab. Scenes are added once, never replaced.
 */
export function seedSlice(state) {
  const value = emptySlice();
  const scenes = state?.scenes;
  if (Array.isArray(scenes)) {
    if (!scenes.some((scene) => scene.id === "forest-clearing")) scenes.push(clearingScene());
    seedTowerLevels(state, value, { image: TOWER_TOP_IMAGE, source: authored });
    // "Someone lit the lantern on the tower again" (the campaign summary): the B35 light of
    // the upper floor, when the fog and lights area is present and has none there yet.
    const fog = fogSliceOf(state);
    if (
      fog &&
      scenes.some((s) => s.id === "lantern-tower-top") &&
      !fog.scenes?.["lantern-tower-top"]
    )
      addLight(state, "dm", "lantern-tower-top", {
        id: "tower-top-lantern",
        preset: "hooded-lantern",
        name: "La grande lanterna",
        x: 330,
        y: 320,
      });
  }
  value.folders = [
    { id: "ch1", name: "Capitolo 1 · L’osservatorio", parentId: null },
    { id: "ch1-tower", name: "La torre", parentId: "ch1" },
    { id: "ch2", name: "Capitolo 2 · Il bosco di Bruma", parentId: null },
  ];
  value.placement = {
    "old-watch": "ch1",
    "lantern-tower": "ch1-tower",
    "lantern-tower-top": "ch1-tower",
    "forest-clearing": "ch2",
  };
  value.variants["old-watch"] = {
    active: "day",
    list: [
      { id: "day", name: "Giorno", look: null },
      {
        id: "night",
        name: "Notte",
        look: {
          background: COURTYARD_NIGHT_IMAGE,
          template: "blank",
          imageName: "cortile-notte.webp",
          imageWidth: 1000,
          imageHeight: 650,
        },
      },
    ],
  };
  value.props["forest-clearing"] = [
    prop("fc-tree-1", "tree", 110, 110, 110),
    prop("fc-tree-2", "tree", 270, 80, 95),
    prop("fc-tree-3", "tree", 430, 150, 120),
    prop("fc-tree-4", "tree", 130, 290, 100),
    prop("fc-tree-5", "tree", 330, 290, 105),
    prop("fc-hut-floor", "table", 740, 170, 90, { name: "Tavolo del capo" }),
    prop("fc-hut-roof", "roof-thatch", 740, 185, 280, {
      name: "Tetto della capanna",
      layer: "foreground",
      fade: 0.2,
    }),
    prop("fc-trap", "trap", 470, 470, 50, {
      name: "Trappola a scatto (CD 13 per notarla)",
      hidden: true,
      locked: true,
    }),
    ...CAMP("fc-camp"),
  ];
  value.props["lantern-tower-top"] = scenes?.some((s) => s.id === "lantern-tower-top")
    ? [
        prop("tt-lantern", "lantern", 330, 320, 110, { name: "La grande lanterna" }),
        prop("tt-chest", "chest", 840, 110, 50, { name: "Forziere del guardiano" }),
        prop("tt-bed", "bedroll", 470, 110, 36, { rotation: 90 }),
        prop("tt-table", "table", 250, 520, 90),
      ]
    : [];
  // The prefab keeps its objects relative to its own box (Owlbear: a prefab is a scene).
  value.prefabs = [
    buildPrefab(CAMP("pf-camp"), {
      id: "goblin-camp",
      name: "Accampamento goblin",
      collection: "Accampamenti",
      sceneId: "forest-clearing",
    }),
  ];
  value.staged["forest-clearing"] = [
    { id: "stage-goblin-1", actorId: "goblin-1", x: 1120, y: 360 },
  ];
  return value;
}

// ------------------------------------------------------------------------------ folders

const folderById = (value, id) => value.folders.find((folder) => folder.id === id) ?? null;
/** Breadcrumb from the root to the folder: [{id, name}]. */
export function folderPath(state, folderId) {
  const value = sliceOf(state);
  const path = [];
  let folder = value && folderById(value, folderId);
  for (let guard = 0; folder && guard < 20; guard++) {
    path.unshift({ id: folder.id, name: folder.name });
    folder = folder.parentId ? folderById(value, folder.parentId) : null;
  }
  return path;
}
const depthOf = (value, id) => {
  let depth = 0;
  for (let folder = folderById(value, id); folder && depth < 20; depth++)
    folder = folder.parentId ? folderById(value, folder.parentId) : null;
  return depth;
};
/** Levels a folder occupies with its subfolders (1 = no subfolder). */
const subtreeHeight = (value, id, guard = 0) =>
  1 +
  Math.max(
    0,
    ...value.folders
      .filter((folder) => folder.parentId === id && guard < 20)
      .map((folder) => subtreeHeight(value, folder.id, guard + 1)),
  );
/** The folder a scene lives in (null = the root). */
export function sceneFolder(state, sceneId) {
  const value = sliceOf(state);
  const id = value?.placement?.[sceneId];
  return id && folderById(value, id) ? id : null;
}
const byName = (a, b) => String(a.name).localeCompare(String(b.name), "it", { numeric: true });
/** Folders and scenes directly inside a folder (null = root), sorted by name. */
export function folderContents(state, folderId = null) {
  const value = sliceOf(state) ?? emptySlice();
  const here = folderId && folderById(value, folderId) ? folderId : null;
  const folders = value.folders.filter((folder) => (folder.parentId ?? null) === here).sort(byName);
  const scenes = (state.scenes ?? []).filter((scene) => sceneFolder(state, scene.id) === here);
  return { folderId: here, folders, scenes: [...scenes].sort(byName) };
}
/** Everything a folder holds, at any depth (scenes and folders), for its card. */
export function folderCount(state, folderId) {
  const value = sliceOf(state) ?? emptySlice();
  let count = 0;
  const walk = (id) => {
    count += (state.scenes ?? []).filter((scene) => sceneFolder(state, scene.id) === id).length;
    for (const child of value.folders.filter((folder) => folder.parentId === id)) walk(child.id);
  };
  walk(folderId);
  return count;
}
/** Search across every folder, never in the archive (Roll20): scenes with their path. */
export function searchScenes(state, query) {
  const text = String(query ?? "")
    .trim()
    .toLocaleLowerCase();
  if (!text) return [];
  return (state.scenes ?? [])
    .filter((scene) =>
      [scene.name, scene.publicDescription ?? ""].some((v) =>
        String(v).toLocaleLowerCase().includes(text),
      ),
    )
    .sort(byName)
    .map((scene) => ({ scene, path: folderPath(state, sceneFolder(state, scene.id)) }));
}
export function createFolder(state, role, { name, parentId = null } = {}) {
  requireDM(role);
  const value = mutable(state);
  const clean = cleanName(name);
  if (!clean) fail("Dai un nome alla cartella.", "Name the folder.");
  if (parentId && !folderById(value, parentId))
    fail("La cartella superiore non esiste più.", "The parent folder no longer exists.");
  if (value.folders.length >= LIMITS.folders)
    fail("Al massimo 100 cartelle.", "At most 100 folders.");
  if (parentId && depthOf(value, parentId) >= LIMITS.depth)
    fail("Al massimo quattro livelli di cartelle.", "At most four levels of folders.");
  const folder = { id: uid("folder"), name: clean, parentId: parentId || null };
  value.folders.push(folder);
  return folder;
}
export function renameFolder(state, role, folderId, name) {
  requireDM(role);
  const folder = folderById(mutable(state), folderId);
  if (!folder) fail("La cartella non esiste più.", "The folder no longer exists.");
  const clean = cleanName(name);
  if (!clean) fail("Dai un nome alla cartella.", "Name the folder.");
  folder.name = clean;
}
export function moveFolder(state, role, folderId, parentId = null) {
  requireDM(role);
  const value = mutable(state);
  const folder = folderById(value, folderId);
  if (!folder) fail("La cartella non esiste più.", "The folder no longer exists.");
  if (parentId) {
    if (!folderById(value, parentId))
      fail(
        "La cartella di destinazione non esiste più.",
        "The destination folder no longer exists.",
      );
    for (
      let at = folderById(value, parentId);
      at;
      at = at.parentId ? folderById(value, at.parentId) : null
    )
      if (at.id === folderId)
        fail("Una cartella non può entrare in sé stessa.", "A folder cannot go inside itself.");
    // The moved folder brings its subfolders along: the deepest of them counts.
    if (depthOf(value, parentId) + subtreeHeight(value, folderId) > LIMITS.depth)
      fail("Al massimo quattro livelli di cartelle.", "At most four levels of folders.");
  }
  folder.parentId = parentId || null;
}
/** Deletes a folder; what it held moves up to its parent (nothing is lost). */
export function deleteFolder(state, role, folderId) {
  requireDM(role);
  const value = mutable(state);
  const folder = folderById(value, folderId);
  if (!folder) fail("La cartella non esiste più.", "The folder no longer exists.");
  for (const child of value.folders)
    if (child.parentId === folderId) child.parentId = folder.parentId;
  for (const [sceneId, id] of Object.entries(value.placement))
    if (id === folderId) {
      if (folder.parentId) value.placement[sceneId] = folder.parentId;
      else delete value.placement[sceneId];
    }
  for (const row of value.archive) if (row.folderId === folderId) row.folderId = folder.parentId;
  value.folders = value.folders.filter((row) => row.id !== folderId);
}
export function moveScene(state, role, sceneId, folderId = null) {
  requireDM(role);
  const value = mutable(state);
  requireScene(state, sceneId);
  if (folderId && !folderById(value, folderId))
    fail("La cartella di destinazione non esiste più.", "The destination folder no longer exists.");
  if (folderId) value.placement[sceneId] = folderId;
  else delete value.placement[sceneId];
}

// ------------------------------------------------------------------------------ archive

/**
 * Archives a scene (Roll20 archive): it leaves the campaign's scene list, the Table's scene
 * choices and every search, with its folder remembered; Restore puts it back unchanged. The
 * scene at the Table and a building's floor cannot be archived.
 */
export function archiveScene(state, role, sceneId, at = new Date().toISOString()) {
  requireDM(role);
  const value = mutable(state);
  const scene = requireScene(state, sceneId);
  if (state.activeSceneId === sceneId)
    fail(
      "La scena è al Tavolo: attivane un’altra prima di archiviarla.",
      "The scene is at the Table: activate another one before archiving it.",
    );
  if (stackOf(state, sceneId))
    fail(
      "È un piano di un edificio: toglilo dall’edificio (Livelli) prima di archiviarlo.",
      "It is a building floor: take it out of the building (Levels) before archiving it.",
    );
  if (value.archive.length >= LIMITS.archive)
    fail("L’archivio è pieno (200 scene).", "The archive is full (200 scenes).");
  value.archive.push({ scene: copy(scene), folderId: sceneFolder(state, sceneId), archivedAt: at });
  state.scenes = state.scenes.filter((row) => row.id !== sceneId);
  delete value.placement[sceneId];
}
export function restoreScene(state, role, sceneId) {
  requireDM(role);
  const value = mutable(state);
  const index = value.archive.findIndex((row) => row.scene.id === sceneId);
  if (index < 0) fail("La scena non è nell’archivio.", "The scene is not in the archive.");
  if (sceneOf(state, sceneId))
    fail(
      "Una scena con lo stesso codice è già presente.",
      "A scene with the same code already exists.",
    );
  const [row] = value.archive.splice(index, 1);
  state.scenes.push(row.scene);
  if (row.folderId && folderById(value, row.folderId)) value.placement[sceneId] = row.folderId;
  return row.scene;
}
export function archivedScenes(state, query = "") {
  const text = String(query).trim().toLocaleLowerCase();
  return (sliceOf(state)?.archive ?? [])
    .filter((row) => !text || row.scene.name.toLocaleLowerCase().includes(text))
    .map((row) => ({ ...row, path: folderPath(state, row.folderId) }));
}

// ------------------------------------------------------------------------------ variants

const LOOK_KEYS = ["background", "template", "imageName", "imageWidth", "imageHeight"];
export const lookOf = (scene) => ({
  background: scene.background ?? null,
  template: TEMPLATES.includes(scene.template) ? scene.template : "courtyard",
  imageName: String(scene.imageName ?? ""),
  imageWidth: Number(scene.imageWidth) || 0,
  imageHeight: Number(scene.imageHeight) || 0,
});
function validLook(look) {
  if (!isObject(look)) return false;
  if (look.background !== null && look.background !== undefined)
    return (
      typeof look.background === "string" &&
      IMAGE_PATTERN.test(look.background) &&
      look.background.length <= MAX_IMAGE_CHARS
    );
  return TEMPLATES.includes(look.template);
}
/** The variants of a scene with the active one marked; one "base" row when none exist. */
export function variantsOf(state, sceneId) {
  const row = sliceOf(state)?.variants?.[sceneId];
  if (!row?.list?.length)
    return { active: "base", list: [{ id: "base", name: "", look: null, active: true }] };
  return { active: row.active, list: row.list.map((v) => ({ ...v, active: v.id === row.active })) };
}
function variantRecord(state, sceneId) {
  const value = mutable(state);
  requireScene(state, sceneId);
  if (!value.variants[sceneId]?.list?.length)
    value.variants[sceneId] = { active: "base", list: [{ id: "base", name: "Base", look: null }] };
  return value.variants[sceneId];
}
/** A new look for the same scene: an image (upload or library) or a map base. */
export function addVariant(state, role, sceneId, { name, look, id } = {}) {
  requireDM(role);
  const record = variantRecord(state, sceneId);
  const clean = cleanName(name, 40);
  if (!clean) fail("Dai un nome alla variante.", "Name the variant.");
  if (record.list.some((row) => row.name.toLocaleLowerCase() === clean.toLocaleLowerCase()))
    fail("Esiste già una variante con questo nome.", "A variant with this name already exists.");
  if (record.list.length >= LIMITS.variants)
    fail("Al massimo 8 varianti per scena.", "At most 8 variants per scene.");
  const next = {
    background: look?.background ?? null,
    template: look?.background ? "blank" : look?.template,
    imageName: cleanName(look?.imageName, 120),
    imageWidth: Number(look?.imageWidth) || 0,
    imageHeight: Number(look?.imageHeight) || 0,
    ...(look?.assetId ? { assetId: String(look.assetId) } : {}),
  };
  if (!validLook(next))
    fail(
      "Scegli un’immagine PNG, JPG o WebP fino a 1 MB, o una base della mappa.",
      "Choose a PNG, JPG or WebP image up to 1 MB, or a map base.",
    );
  const variant = { id: id ?? uid("variant"), name: clean, look: next };
  record.list.push(variant);
  return variant;
}
export function renameVariant(state, role, sceneId, variantId, name) {
  requireDM(role);
  const record = variantRecord(state, sceneId);
  const variant = record.list.find((row) => row.id === variantId);
  if (!variant) fail("La variante non esiste più.", "The variant no longer exists.");
  const clean = cleanName(name, 40);
  if (!clean) fail("Dai un nome alla variante.", "Name the variant.");
  if (
    record.list.some(
      (row) => row !== variant && row.name.toLocaleLowerCase() === clean.toLocaleLowerCase(),
    )
  )
    fail("Esiste già una variante con questo nome.", "A variant with this name already exists.");
  variant.name = clean;
}
export function deleteVariant(state, role, sceneId, variantId) {
  requireDM(role);
  const record = variantRecord(state, sceneId);
  if (record.active === variantId)
    fail(
      "È la variante in uso: passa a un’altra prima di eliminarla.",
      "It is the variant in use: switch to another one before deleting it.",
    );
  if (!record.list.some((row) => row.id === variantId))
    fail("La variante non esiste più.", "The variant no longer exists.");
  record.list = record.list.filter((row) => row.id !== variantId);
}
/**
 * Switches the scene's look (Quest Portal variant switcher, Shard alternate image). The look
 * in use is kept in its own variant first, so an image changed in the scene editor is not
 * lost. Walls, doors, tokens, pins, lights and fog are the same scene's and do not move.
 */
export function switchVariant(state, role, sceneId, variantId) {
  requireDM(role);
  const scene = requireScene(state, sceneId);
  const record = variantRecord(state, sceneId);
  const target = record.list.find((row) => row.id === variantId);
  if (!target) fail("La variante non esiste più.", "The variant no longer exists.");
  if (record.active === variantId) return target;
  const current = record.list.find((row) => row.id === record.active);
  if (current) current.look = lookOf(scene);
  const look = target.look ?? lookOf(scene);
  for (const key of LOOK_KEYS) scene[key] = look[key] ?? (key === "background" ? null : scene[key]);
  if (!look.background) scene.background = null;
  target.look = null;
  record.active = variantId;
  return target;
}

// ------------------------------------------------------------------------------ objects

/** Where objects live: a scene (with its off-map margin) or a prefab being edited. */
export function containerOf(state, targetId, { write = false } = {}) {
  const value = write ? mutable(state) : (sliceOf(state) ?? emptySlice());
  if (String(targetId).startsWith("prefab:")) {
    const prefab = value.prefabs.find((row) => row.id === String(targetId).slice(7));
    if (!prefab) fail("Il prefabbricato non esiste più.", "The prefab no longer exists.");
    return {
      kind: "prefab",
      id: targetId,
      prefab,
      width: prefab.width,
      height: prefab.height,
      margin: 0,
      props: prefab.props,
    };
  }
  const scene = requireScene(state, targetId);
  if (write && !Array.isArray(value.props[targetId])) value.props[targetId] = [];
  return {
    kind: "scene",
    id: targetId,
    scene,
    width: scene.width,
    height: scene.height,
    margin: OFF_MAP,
    props: value.props[targetId] ?? [],
  };
}
const inBounds = (box, p) =>
  Number.isFinite(p.x) &&
  Number.isFinite(p.y) &&
  p.x >= -box.margin &&
  p.y >= -box.margin &&
  p.x <= box.width + box.margin &&
  p.y <= box.height + box.margin;
/** Whether an object's centre is off the map (the DM-only area). */
export const isOffMap = (scene, p) => p.x < 0 || p.y < 0 || p.x > scene.width || p.y > scene.height;
function cleanProp(box, input, base = {}) {
  const next = { ...base, ...input };
  next.name = cleanName(next.name, 80);
  if (!next.name) fail("Dai un nome all’oggetto.", "Name the object.");
  if (next.sticker && !stickerById(next.sticker)) fail("Adesivo sconosciuto.", "Unknown sticker.");
  if (!next.sticker && !next.assetId)
    fail("Scegli un adesivo o un’immagine.", "Choose a sticker or an image.");
  for (const key of ["x", "y", "width", "height"]) next[key] = round1(Number(next[key]));
  if (!inBounds(box, next))
    fail(
      "L’oggetto deve restare sulla mappa o nell’area fuori mappa.",
      "The object must stay on the map or in the off-map area.",
    );
  if (!(next.width >= 10 && next.width <= 3000 && next.height >= 5 && next.height <= 3000))
    fail("La larghezza va da 10 a 3000 pixel.", "The width must be between 10 and 3000 pixels.");
  next.rotation = ((Math.round(Number(next.rotation) || 0) % 360) + 360) % 360;
  next.layer = next.layer === "foreground" ? "foreground" : "map";
  next.hidden = next.hidden === true;
  next.locked = next.locked === true;
  const fade = Number(next.fade);
  next.fade = Number.isFinite(fade) ? Math.min(1, Math.max(0, Math.round(fade * 100) / 100)) : 0.2;
  return next;
}
const lockedMessage = (names) =>
  fail(
    `Bloccato: ${names.join(", ")}. Sbloccalo prima di spostarlo, ridimensionarlo, ruotarlo o eliminarlo.`,
    `Locked: ${names.join(", ")}. Unlock it before moving, resizing, rotating or deleting it.`,
  );
const GEOMETRY_KEYS = ["x", "y", "width", "height", "rotation"];

export function addProp(state, role, targetId, input = {}) {
  requireDM(role);
  const box = containerOf(state, targetId, { write: true });
  if (box.props.length >= (box.kind === "prefab" ? LIMITS.prefabProps : LIMITS.props))
    fail("Troppi oggetti in questa scena.", "Too many objects in this scene.");
  const art = input.sticker ? stickerById(input.sticker) : null;
  const width = Number(
    input.width ??
      (art ? (art.meters / (box.scene?.metersPerCell ?? 1.5)) * (box.scene?.gridSize ?? 50) : 100),
  );
  const next = cleanProp(box, {
    id: input.id ?? uid("prop"),
    sticker: input.sticker ?? null,
    ...(input.assetId ? { assetId: String(input.assetId) } : {}),
    name: input.name ?? art?.name.it ?? "",
    x: input.x ?? box.width / 2,
    y: input.y ?? box.height / 2,
    width,
    height: input.height ?? width * (art?.aspect ?? (Number(input.aspect) || 1)),
    rotation: input.rotation ?? 0,
    layer: input.layer ?? art?.layer ?? "map",
    hidden: input.hidden,
    locked: input.locked,
    fade: input.fade ?? 0.2,
  });
  if (!next.sticker) delete next.sticker;
  box.props.push(next);
  return next;
}
function findProps(box, ids) {
  const wanted = [...new Set(ids)];
  const rows = wanted.map((id) => box.props.find((row) => row.id === id));
  if (!rows.length || rows.some((row) => !row))
    fail("Uno degli oggetti non esiste più.", "One of the objects no longer exists.");
  return rows;
}
/**
 * Changes one or more objects together (Foundry Placeables Palette). Geometry changes are
 * refused for locked objects (D&D Beyond lock); visibility, lock and layer always apply.
 */
export function updateProps(state, role, targetId, ids, patch = {}) {
  requireDM(role);
  const box = containerOf(state, targetId, { write: true });
  const rows = findProps(box, ids);
  const moving = GEOMETRY_KEYS.some((key) => patch[key] !== undefined);
  const locked = rows.filter((row) => row.locked && patch.locked !== false);
  if (moving && locked.length) lockedMessage(locked.map((row) => row.name));
  const allowed = ["name", "hidden", "locked", "layer", "fade", ...GEOMETRY_KEYS];
  const clean = Object.fromEntries(
    Object.entries(patch).filter(
      ([key, v]) => allowed.includes(key) && v !== undefined && v !== "",
    ),
  );
  // A width without a height keeps each object's proportions.
  const next = rows.map((row) => {
    const scaled =
      clean.width !== undefined && clean.height === undefined
        ? { height: (row.height * Number(clean.width)) / row.width }
        : {};
    return cleanProp(box, { ...clean, ...scaled }, row);
  });
  rows.forEach((row, i) => Object.assign(row, next[i]));
  return rows;
}
/** Moves objects by the same offset (drag of a selection, arrow keys). */
export function moveProps(state, role, targetId, ids, dx, dy) {
  requireDM(role);
  const box = containerOf(state, targetId, { write: true });
  const rows = findProps(box, ids);
  const locked = rows.filter((row) => row.locked);
  if (locked.length) lockedMessage(locked.map((row) => row.name));
  const next = rows.map((row) =>
    cleanProp(box, { x: row.x + Number(dx), y: row.y + Number(dy) }, row),
  );
  rows.forEach((row, i) => Object.assign(row, next[i]));
  return rows;
}
export function deleteProps(state, role, targetId, ids) {
  requireDM(role);
  const box = containerOf(state, targetId, { write: true });
  const rows = findProps(box, ids);
  const locked = rows.filter((row) => row.locked);
  if (locked.length) lockedMessage(locked.map((row) => row.name));
  const gone = new Set(rows.map((row) => row.id));
  const kept = box.props.filter((row) => !gone.has(row.id));
  box.props.splice(0, box.props.length, ...kept);
  return rows.length;
}
/** Whether a point is inside an object's rotated box. */
export function propContains(row, p) {
  const angle = (-row.rotation * Math.PI) / 180;
  const dx = p.x - row.x,
    dy = p.y - row.y;
  const rx = dx * Math.cos(angle) - dy * Math.sin(angle);
  const ry = dx * Math.sin(angle) + dy * Math.cos(angle);
  return Math.abs(rx) <= row.width / 2 && Math.abs(ry) <= row.height / 2;
}
/**
 * What a viewer is shown: the DM every object (hidden ones marked), a player only visible
 * objects on the map — never hidden ones or anything in the off-map area (Roll20 R20-091).
 */
export function visibleProps(state, sceneId, role) {
  const scene = sceneOf(state, sceneId);
  const rows = sliceOf(state)?.props?.[sceneId] ?? [];
  if (!scene) return [];
  if (role === "dm") return rows;
  return rows.filter((row) => !row.hidden && !isOffMap(scene, row));
}
/**
 * Roofs and canopies faded for this viewer (Roll20 foreground, Foundry occlusion fade): a
 * foreground object fades while a token the viewer controls stands under it.
 */
export function fadedRoofs(state, sceneId, role) {
  const scene = sceneOf(state, sceneId);
  if (!scene) return new Set();
  const mine = (scene.tokens ?? []).filter((token) => {
    const actor = state.actors?.[token.actorId];
    return actor && (role === "dm" || canControlActor(actor, role, state));
  });
  return new Set(
    visibleProps(state, sceneId, role)
      .filter((row) => row.layer === "foreground" && mine.some((token) => propContains(row, token)))
      .map((row) => row.id),
  );
}
/** Owlbear Outliner: objects grouped by layer, filtered by name, tag or sticker. */
export function outline(state, sceneId, role, query = "") {
  const scene = sceneOf(state, sceneId);
  const text = String(query).trim().toLocaleLowerCase();
  const match = (row) => {
    if (!text) return true;
    const art = row.sticker ? stickerById(row.sticker) : null;
    return [row.name, art?.name.it, art?.name.en, ...(art?.tags ?? [])]
      .filter(Boolean)
      .some((v) => String(v).toLocaleLowerCase().includes(text));
  };
  const rows = visibleProps(state, sceneId, role).filter(match);
  return {
    foreground: rows.filter(
      (row) => row.layer === "foreground" && !(scene && isOffMap(scene, row)),
    ),
    map: rows.filter((row) => row.layer === "map" && !(scene && isOffMap(scene, row))),
    offMap: scene ? rows.filter((row) => isOffMap(scene, row)) : [],
    count: rows.length,
  };
}

// ------------------------------------------------------------------------------ outliner
// PR-12 (Owlbear Outliner, Foundry Placeables Palette): one list of every element of a scene
// (objects, tokens, walls, doors, lights) with a kind filter, a search and bulk actions.
export const ELEMENT_KINDS = Object.freeze(["prop", "token", "wall", "door", "light"]);
const elementName = (state, kind, row, index) => {
  if (kind === "prop") return row.name;
  if (kind === "token") return state.actors?.[row.actorId]?.name ?? "?";
  if (kind === "light")
    return row.name || LIGHT_PRESETS[row.preset]?.name?.it || "Luce";
  return `${kind === "door" ? "Porta" : "Muro"} ${index + 1}`;
};
/** Every element of the scene for the DM: [{kind, id, name, hidden, locked, on, state}]. */
export function sceneElements(state, sceneId, { query = "", kind = "all" } = {}) {
  const scene = sceneOf(state, sceneId);
  if (!scene) return [];
  const text = String(query).trim().toLocaleLowerCase();
  const rows = [
    ...(sliceOf(state)?.props?.[sceneId] ?? []).map((row) => ({
      kind: "prop",
      id: row.id,
      name: elementName(state, "prop", row),
      hidden: row.hidden === true,
      locked: row.locked === true,
      tags: row.sticker ? [...(stickerById(row.sticker)?.tags ?? [])] : [],
    })),
    ...(scene.tokens ?? []).map((row) => ({
      kind: "token",
      id: row.id,
      actorId: row.actorId,
      name: elementName(state, "token", row),
      hidden: row.hidden === true,
    })),
    ...(scene.walls ?? []).map((row, i) => ({
      kind: row.kind === "door" ? "door" : "wall",
      id: row.id,
      name: elementName(state, row.kind === "door" ? "door" : "wall", row, i),
      hidden: row.secret === true,
      state: row.kind === "door" ? row.doorState : null,
    })),
    ...(fogSliceOf(state) ? fogScene(state, sceneId).lights : []).map((row) => ({
      kind: "light",
      id: row.id,
      name: elementName(state, "light", row),
      on: row.on !== false,
    })),
  ];
  return rows.filter(
    (row) =>
      (kind === "all" || row.kind === kind) &&
      (!text ||
        [row.name, ...(row.tags ?? [])].some((v) => String(v).toLocaleLowerCase().includes(text))),
  );
}
export const BULK_ACTIONS = Object.freeze([
  "hide",
  "show",
  "lock",
  "unlock",
  "on",
  "off",
  "door-closed",
  "door-open",
  "door-locked",
  "delete",
]);
/**
 * One change for several elements (`refs`: [{kind, id}]). Each action touches only the kinds
 * it fits: hide/show (objects, tokens; walls and doors become secret or not), lock/unlock
 * (objects), on/off (lights), door states (doors), delete (objects, walls, doors, lights;
 * a token leaves the scene and keeps its creature). Returns how many elements changed.
 */
export function bulkEditElements(state, role, sceneId, refs, action) {
  requireDM(role);
  if (!BULK_ACTIONS.includes(action)) fail("Azione non valida.", "Invalid action.");
  const scene = requireScene(state, sceneId);
  const pick = (kind) => new Set(refs.filter((r) => r.kind === kind).map((r) => r.id));
  const props = pick("prop"),
    tokens = pick("token"),
    walls = new Set([...pick("wall"), ...pick("door")]),
    lights = pick("light");
  let count = 0;
  const box = props.size ? containerOf(state, sceneId, { write: true }) : null;
  if (box) {
    for (const row of box.props) {
      if (!props.has(row.id)) continue;
      if (action === "hide" || action === "show") row.hidden = action === "hide";
      else if (action === "lock" || action === "unlock") row.locked = action === "lock";
      else if (action !== "delete") continue;
      count += 1;
    }
    if (action === "delete") {
      const locked = box.props.filter((row) => props.has(row.id) && row.locked);
      if (locked.length)
        fail(
          `Sblocca prima: ${locked.map((r) => r.name).join(", ")}.`,
          `Unlock first: ${locked.map((r) => r.name).join(", ")}.`,
        );
      const before = box.props.length;
      mutable(state).props[sceneId] = box.props.filter((row) => !props.has(row.id));
      count += before - mutable(state).props[sceneId].length;
    }
  }
  if (tokens.size && ["hide", "show", "delete"].includes(action)) {
    if (action === "delete") {
      const before = scene.tokens.length;
      scene.tokens = scene.tokens.filter((t) => !tokens.has(t.id));
      count += before - scene.tokens.length;
    } else
      for (const token of scene.tokens)
        if (tokens.has(token.id)) {
          if (action === "hide") token.hidden = true;
          else delete token.hidden;
          count += 1;
        }
  }
  if (walls.size) {
    let next = scene.walls ?? [];
    if (action === "delete") next = next.filter((w) => !walls.has(w.id));
    else
      next = next.map((w) => {
        if (!walls.has(w.id)) return w;
        if (action === "hide" || action === "show") return { ...w, secret: action === "hide" };
        if (action.startsWith("door-") && w.kind === "door")
          return { ...w, doorState: action.slice(5) };
        return w;
      });
    const changed = next.filter((w, i) => w !== (scene.walls ?? [])[i]).length +
      Math.max(0, (scene.walls ?? []).length - next.length);
    if (validateSceneGeometry({ ...scene, walls: next }).length)
      fail("La geometria non sarebbe valida.", "The geometry would be invalid.");
    scene.walls = next;
    count += changed;
  }
  if (lights.size && fogSliceOf(state)) {
    for (const id of lights) {
      if (action === "delete") removeLight(state, role, sceneId, id);
      else if (action === "on" || action === "off")
        updateLight(state, role, sceneId, id, { on: action === "on" });
      else continue;
      count += 1;
    }
  }
  if (!count)
    fail(
      "Nessun elemento selezionato accetta questa azione.",
      "No selected element takes this action.",
    );
  return count;
}

// ------------------------------------------------------------------------------ prefabs

/** A prefab's own box: its objects relative to the box that holds them all, unlocked. */
function buildPrefab(rows, { id, name, collection = "", sceneId = null }) {
  const half = (row) => Math.max(row.width, row.height) / 2;
  const minX = Math.min(...rows.map((row) => row.x - half(row)));
  const minY = Math.min(...rows.map((row) => row.y - half(row)));
  const maxX = Math.max(...rows.map((row) => row.x + half(row)));
  const maxY = Math.max(...rows.map((row) => row.y + half(row)));
  return {
    id,
    name,
    collection: cleanName(collection, 40),
    width: Math.max(20, Math.round(maxX - minX)),
    height: Math.max(20, Math.round(maxY - minY)),
    originSceneId: sceneId,
    props: rows.map((row, i) => {
      const next = {
        ...copy(row),
        id: `${id}-${i + 1}`,
        x: round1(row.x - minX),
        y: round1(row.y - minY),
        // PR-11 (Owlbear Prefabs): each object keeps its lock; a locked roof stays locked
        // wherever the prefab is inserted.
        locked: row.locked === true,
      };
      delete next.prefab;
      return next;
    }),
  };
}
/** Saves the selected objects as a prefab (Owlbear Create Prefab: name and collection). */
export function createPrefab(state, role, sceneId, ids, { name, collection = "" } = {}) {
  requireDM(role);
  const value = mutable(state);
  const box = containerOf(state, sceneId, { write: true });
  const rows = findProps(box, ids);
  const clean = cleanName(name, 60);
  if (!clean) fail("Dai un nome al prefabbricato.", "Name the prefab.");
  if (value.prefabs.length >= LIMITS.prefabs)
    fail("Al massimo 60 prefabbricati.", "At most 60 prefabs.");
  if (rows.length > LIMITS.prefabProps)
    fail("Al massimo 80 oggetti in un prefabbricato.", "At most 80 objects in a prefab.");
  const prefab = buildPrefab(rows, { id: uid("prefab"), name: clean, collection, sceneId });
  value.prefabs.push(prefab);
  return prefab;
}
/** Inserts a copy of a prefab centred on a point of another (or the same) scene. */
export function insertPrefab(state, role, prefabId, sceneId, point) {
  requireDM(role);
  const value = mutable(state);
  const prefab = value.prefabs.find((row) => row.id === prefabId);
  if (!prefab) fail("Il prefabbricato non esiste più.", "The prefab no longer exists.");
  const box = containerOf(state, sceneId, { write: true });
  if (box.kind !== "scene")
    fail("Inserisci il prefabbricato in una scena.", "Insert the prefab in a scene.");
  if (box.props.length + prefab.props.length > LIMITS.props)
    fail("Troppi oggetti in questa scena.", "Too many objects in this scene.");
  const at = { x: Number(point?.x), y: Number(point?.y) };
  if (!inBounds(box, at)) fail("Scegli un punto della mappa.", "Choose a point on the map.");
  const instance = uid("inst");
  const added = prefab.props.map((row) =>
    cleanProp(
      box,
      {
        ...copy(row),
        id: uid("prop"),
        x: at.x - prefab.width / 2 + row.x,
        y: at.y - prefab.height / 2 + row.y,
      },
      {},
    ),
  );
  for (const row of added) {
    row.prefab = { id: prefab.id, instance };
    box.props.push(row);
  }
  return { instance, props: added };
}
export function renamePrefab(state, role, prefabId, { name, collection } = {}) {
  requireDM(role);
  const prefab = mutable(state).prefabs.find((row) => row.id === prefabId);
  if (!prefab) fail("Il prefabbricato non esiste più.", "The prefab no longer exists.");
  if (name !== undefined) {
    const clean = cleanName(name, 60);
    if (!clean) fail("Dai un nome al prefabbricato.", "Name the prefab.");
    prefab.name = clean;
  }
  if (collection !== undefined) prefab.collection = cleanName(collection, 40);
}
export function deletePrefab(state, role, prefabId) {
  requireDM(role);
  const value = mutable(state);
  if (!value.prefabs.some((row) => row.id === prefabId))
    fail("Il prefabbricato non esiste più.", "The prefab no longer exists.");
  value.prefabs = value.prefabs.filter((row) => row.id !== prefabId);
}
/** Prefab collections, like Owlbear's folders: [{collection, prefabs}]. */
export function prefabCollections(state) {
  const groups = new Map();
  for (const prefab of sliceOf(state)?.prefabs ?? []) {
    const key = prefab.collection || "";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(prefab);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "it"))
    .map(([collection, prefabs]) => ({ collection, prefabs: prefabs.sort(byName) }));
}

// ------------------------------------------------------------------------------ off-map

/** Creatures waiting in the off-map area of a scene (DM only, Roll20 R20-091). */
export function stagedOn(state, sceneId, role) {
  if (role !== "dm") return [];
  return (sliceOf(state)?.staged?.[sceneId] ?? []).filter((row) => state.actors?.[row.actorId]);
}
function stagingRow(state, sceneId, stageId) {
  const list = mutable(state).staged[sceneId] ?? [];
  const row = list.find((entry) => entry.id === stageId);
  if (!row) fail("La creatura non è più fuori mappa.", "The creature is no longer off the map.");
  return { list, row };
}
function stageable(state, scene, actorId, role) {
  const actor = state.actors?.[actorId];
  if (
    !isActorAvailable(actor) ||
    !canViewActor(actor, role, state) ||
    !isCampaignActor(actor, state.campaign?.id)
  )
    fail("La creatura non è disponibile.", "The creature is unavailable.");
  return actor;
}
/** DM: a creature waits off the map, where players never see it. */
export function stageCreature(state, role, sceneId, actorId, point) {
  requireDM(role);
  const value = mutable(state);
  const scene = requireScene(state, sceneId);
  stageable(state, scene, actorId, role);
  if ((scene.tokens ?? []).some((token) => token.actorId === actorId))
    fail("La creatura è già sulla mappa.", "The creature is already on the map.");
  const list = (value.staged[sceneId] = value.staged[sceneId] ?? []);
  if (list.some((row) => row.actorId === actorId))
    fail("La creatura è già fuori mappa.", "The creature is already off the map.");
  if (list.length >= LIMITS.staged)
    fail("Al massimo 20 creature fuori mappa.", "At most 20 creatures off the map.");
  const at = point ?? { x: scene.width + OFF_MAP / 2, y: 60 + list.length * 70 };
  const box = { width: scene.width, height: scene.height, margin: OFF_MAP };
  if (!inBounds(box, at) || !isOffMap(scene, at))
    fail("Scegli un punto dell’area fuori mappa.", "Choose a point in the off-map area.");
  const row = { id: uid("stage"), actorId, x: Math.round(at.x), y: Math.round(at.y) };
  list.push(row);
  return row;
}
/**
 * DM: drops a waiting creature. Still off the map, it only moves; on the map it becomes a
 * token there (it does not join initiative: that stays an explicit encounter choice).
 */
export function dropStaged(state, role, sceneId, stageId, point) {
  requireDM(role);
  const scene = requireScene(state, sceneId);
  const { list, row } = stagingRow(state, sceneId, stageId);
  const at = { x: Number(point?.x), y: Number(point?.y) };
  const box = { width: scene.width, height: scene.height, margin: OFF_MAP };
  if (!inBounds(box, at)) fail("Scegli un punto della mappa.", "Choose a point on the map.");
  if (isOffMap(scene, at)) {
    row.x = Math.round(at.x);
    row.y = Math.round(at.y);
    return { onMap: false };
  }
  stageable(state, scene, row.actorId, role);
  if ((scene.tokens ?? []).some((token) => token.actorId === row.actorId))
    fail("La creatura è già sulla mappa.", "The creature is already on the map.");
  const clamp = (v, max) => Math.round(Math.max(20, Math.min(max - 20, v)));
  const tokenId = (scene.tokens ?? []).some(
    (token) => token.id === `token-${row.actorId}-${sceneId}`,
  )
    ? uid("token")
    : `token-${row.actorId}-${sceneId}`;
  scene.tokens = [
    ...(scene.tokens ?? []),
    {
      id: tokenId,
      actorId: row.actorId,
      x: clamp(at.x, scene.width),
      y: clamp(at.y, scene.height),
    },
  ];
  list.splice(list.indexOf(row), 1);
  return { onMap: true, tokenId };
}
/** DM: the waiting creature enters at the map edge nearest to where it waits. */
export function bringIn(state, role, sceneId, stageId) {
  const scene = requireScene(state, sceneId);
  const { row } = stagingRow(state, sceneId, stageId);
  const clamp = (v, max) => Math.max(40, Math.min(max - 40, v));
  return dropStaged(state, role, sceneId, stageId, {
    x: clamp(row.x, scene.width),
    y: clamp(row.y, scene.height),
  });
}
/** DM: a token leaves the map and waits in the off-map area (not while in initiative). */
export function sendOffMap(state, role, sceneId, actorId, point) {
  requireDM(role);
  const scene = requireScene(state, sceneId);
  const token = (scene.tokens ?? []).find((row) => row.actorId === actorId);
  if (!token) fail("La creatura non è sulla mappa.", "The creature is not on the map.");
  if (
    state.combat?.active &&
    state.activeSceneId === sceneId &&
    state.combat.order?.includes(actorId)
  )
    fail(
      "È nell’ordine d’iniziativa: toglila prima dall’incontro.",
      "It is in the initiative order: remove it from the encounter first.",
    );
  scene.tokens = scene.tokens.filter((row) => row !== token);
  if (scene.encounter?.participants)
    scene.encounter.participants = scene.encounter.participants.filter(
      (row) => row.actorId !== actorId,
    );
  return stageCreature(state, role, sceneId, actorId, point);
}

// ------------------------------------------------------------------------------ views

/** A camera position: zoom 0.6–3 (the Table's range) and a finite pan near the scene. */
export function cleanView(scene, view) {
  const zoom = Number(view?.zoom);
  const x = Number(view?.pan?.x),
    y = Number(view?.pan?.y);
  if (!Number.isFinite(zoom) || zoom < 0.6 || zoom > 3 || ![x, y].every(Number.isFinite))
    fail("Vista non valida.", "Invalid view.");
  if (Math.abs(x) > scene.width * 2 || Math.abs(y) > scene.height * 2)
    fail("La vista è troppo lontana dalla mappa.", "The view is too far from the map.");
  return { zoom: Math.round(zoom * 1000) / 1000, pan: { x: Math.round(x), y: Math.round(y) } };
}
/** DM: the scene's starting view for everyone (Owlbear Default View). */
export function setDefaultView(state, role, sceneId, view) {
  requireDM(role);
  const scene = requireScene(state, sceneId);
  mutable(state).views.default[sceneId] = cleanView(scene, view);
  return mutable(state).views.default[sceneId];
}
export function clearDefaultView(state, role, sceneId) {
  requireDM(role);
  delete mutable(state).views.default[sceneId];
}
export const defaultView = (state, sceneId) => sliceOf(state)?.views?.default?.[sceneId] ?? null;
/** Personal saved views of this identity for a scene: three slots (AboveVTT F-keys). */
export function savedViews(state, role, sceneId) {
  const list = sliceOf(state)?.views?.saved?.[role]?.[sceneId] ?? [];
  return Array.from({ length: LIMITS.views }, (_, i) => list[i] ?? null);
}
export function saveView(state, role, sceneId, slot, view) {
  const scene = requireScene(state, sceneId);
  const index = Number(slot) - 1;
  if (!Number.isInteger(index) || index < 0 || index >= LIMITS.views)
    fail("Scegli una vista da 1 a 3.", "Choose a view from 1 to 3.");
  const value = mutable(state);
  const mine = (value.views.saved[role] = value.views.saved[role] ?? {});
  const list = (mine[sceneId] = Array.from(
    { length: LIMITS.views },
    (_, i) => mine[sceneId]?.[i] ?? null,
  ));
  list[index] = cleanView(scene, view);
  return list[index];
}
export function clearSavedView(state, role, sceneId, slot) {
  const list = mutable(state).views.saved[role]?.[sceneId];
  if (list) list[Number(slot) - 1] = null;
}
/**
 * Gameplay Undo restores the slice snapshot of the change it reverses; the personal saved
 * views and the roofs choice are not gameplay (local, never undone), so the values of now
 * are carried into the restored state (registry slice `afterUndo`).
 */
export function keepPersonal(current, restored) {
  const now = sliceOf(current);
  const back = sliceOf(restored);
  if (!now || !back) return;
  back.views = { ...(isObject(back.views) ? back.views : {}), saved: copy(now.views?.saved ?? {}) };
  back.prefs = copy(now.prefs ?? {});
}
/** Personal: roofs and canopies hidden for this identity (Roll20: players toggle foreground). */
export const foregroundHidden = (state, role) =>
  sliceOf(state)?.prefs?.[role]?.hideForeground === true;
export function setForegroundHidden(state, role, hidden) {
  const value = mutable(state);
  value.prefs[role] = { ...(value.prefs[role] ?? {}), hideForeground: hidden === true };
}

// ------------------------------------------------------------------------------ scenes

/**
 * Copies a scene with its objects and variants into the same folder (Roll20 card menu
 * "Duplicate"). Tokens and sharing are not copied, like the scene editor's duplicate.
 */
export function duplicateWithAssets(state, role, sceneId, { id, name } = {}) {
  requireDM(role);
  const value = mutable(state);
  const source = requireScene(state, sceneId);
  const clean = cleanName(name, 100);
  if (!clean) fail("Dai un nome alla copia.", "Name the copy.");
  const newId = id ?? uid("scene");
  if (sceneOf(state, newId)) fail("La scena esiste già.", "The scene already exists.");
  const scene = {
    ...copy(source),
    id: newId,
    name: clean,
    revealed: false,
    revealedTo: [],
    tokens: [],
    encounter: null,
  };
  state.scenes.push(scene);
  value.props[newId] = (value.props[sceneId] ?? []).map((row) => ({
    ...copy(row),
    id: uid("prop"),
  }));
  if (value.variants[sceneId]) value.variants[newId] = copy(value.variants[sceneId]);
  const folder = sceneFolder(state, sceneId);
  if (folder) value.placement[newId] = folder;
  return scene;
}
/** A new scene record from the page menu (blank surface or an uploaded image). */
export function newSceneRecord({
  id,
  name,
  template = "blank",
  background = null,
  imageName = "",
  imageWidth = 0,
  imageHeight = 0,
  width = 1000,
  height = 650,
}) {
  const clean = cleanName(name, 100);
  if (!clean) fail("Dai un nome alla scena.", "Name the scene.");
  const w = Math.round(Number(width)),
    h = Math.round(Number(height));
  if (!(w >= 300 && w <= 4000 && h >= 300 && h <= 4000))
    fail(
      "La mappa deve misurare da 300 a 4000 pixel per lato.",
      "The map must measure 300 to 4000 pixels per side.",
    );
  if (background && (!IMAGE_PATTERN.test(background) || background.length > MAX_IMAGE_CHARS))
    fail(
      "Scegli un’immagine PNG, JPG o WebP fino a 1 MB.",
      "Choose a PNG, JPG or WebP image up to 1 MB.",
    );
  const scene = {
    id,
    name: clean,
    description: "",
    publicDescription: "",
    gridSize: 50,
    metersPerCell: 1.5,
    width: w,
    height: h,
    gridOffsetX: 0,
    gridOffsetY: 0,
    gridVisible: true,
    gridSnap: false,
    background: background || null,
    imageName: cleanName(imageName, 120),
    imageWidth: Number(imageWidth) || 0,
    imageHeight: Number(imageHeight) || 0,
    revealed: false,
    revealedTo: [],
    template: background ? "blank" : TEMPLATES.includes(template) ? template : "blank",
    tokens: [],
    walls: [],
    terrain: [],
  };
  return scene;
}
export function addScene(state, role, scene, folderId = null) {
  requireDM(role);
  const value = mutable(state);
  if (sceneOf(state, scene.id)) fail("La scena esiste già.", "The scene already exists.");
  if (validateSceneGeometry(scene).length)
    fail("La geometria della scena non è valida.", "The scene geometry is invalid.");
  state.scenes.push(scene);
  if (folderId && folderById(value, folderId)) value.placement[scene.id] = folderId;
  return scene;
}
/**
 * Grid alignment result (Owlbear three-step alignment, Roll20 Align to Grid): the scene's
 * cell size and offsets. Offsets are whole pixels in the scene editor; the cell may be
 * fractional.
 */
export function applyGridAlignment(state, role, sceneId, { gridSize, offsetX, offsetY }) {
  requireDM(role);
  const scene = requireScene(state, sceneId);
  const size = Math.round(Number(gridSize) * 100) / 100;
  if (!(size >= 10 && size <= 300))
    fail("La cella deve misurare da 10 a 300 pixel.", "The cell must measure 10 to 300 pixels.");
  // Any whole offset draws the same grid; it is kept between 0 and one cell for reading.
  const norm = (v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) fail("Scostamento non valido.", "Invalid offset.");
    const o = Math.round(((n % size) + size) % size);
    return o >= size - 0.5 ? 0 : o;
  };
  scene.gridSize = size;
  scene.gridOffsetX = norm(offsetX);
  scene.gridOffsetY = norm(offsetY);
  scene.gridVisible = true;
  return {
    gridSize: scene.gridSize,
    gridOffsetX: scene.gridOffsetX,
    gridOffsetY: scene.gridOffsetY,
  };
}

export const LABELS = Object.freeze({
  layer: { map: L("Mappa", "Map"), foreground: L("Primo piano (tetti)", "Foreground (roofs)") },
});
