// Table token menu, selection and visibility (B12).
//
// Patterns copied, with their census IDs (docs/interview/CAPABILITY_CENSUS.md, market census):
// - one labelled context menu per token, stable order with hotkeys, hidden while dragging,
//   HP inline and condition icons (DDB-117); labelled list instead of a radial (R20-203);
//   Foundry Token HUD resource field and status palette (FVT-119, FVT-120);
// - right-click, long-press on touch, tap then "…" (VTL-232, R20-211, SVC-115, CRP-195),
//   keyboard Tab + Menu key with GM-only real names (SVC-167);
// - HP arithmetic `-5`, `+3`, `=12` (VTL-234, R20-131, VTL-126);
// - hide/reveal with the DM seeing the token faded (DDB-117, VTL-145);
// - per-player visibility as a hidden token plus a local copy for its audience, like
//   Smoke & Spectre (VTL-143);
// - box select, Shift-click, group, lock, copy and paste (DDB-118, DDB-119, R20-130, FVT-108);
// - rename with revert, hide name, 12 border colours, token size (DDB-117, VTL-150);
// - conditions toggled from the token, synced with the sheet (DDB-145, R20-034, VTL-141);
// - double-click a list row to find the token, "find my token" (VTL-235, FVT-120).
//
// Everything that changes the game goes through ctx.commit and the existing domain
// commands (conditions.mjs for HP and conditions, preparation.mjs for NPC copies), so the
// sheet, the Table, the log and Undo stay one state. Local, per-viewer data (selection,
// clipboard, open menu) never enter the shared state.
import {
  listConditionDefinitions,
  getConditionMechanics,
  getConditionOverview,
  previewConditionChange,
  applyConditionChange,
  previewVitalityChange,
  applyVitalityChange,
} from "./conditions.mjs";
import { canViewActor, canControlActor, isActorAvailable } from "./character-access.mjs";
import { duplicateSceneNPC, placeSceneToken, removeSceneToken } from "./preparation.mjs";
import { setSelectedActor, openSceneNavigator } from "./table.mjs";
import { openDoor, correctDoor, zoomAt, plannedWaypoints, runsSession } from "./table-spatial.mjs";
import { permissionOf, permissionAllowed, policyOf } from "./campaign-settings-domain.mjs";
import { beginMovement } from "./combat.mjs";
import { hasCombatPreview } from "./combat-ui.mjs";
import { TOKEN_MENU_SUBMENUS } from "./registry.mjs";
import { openTransform } from "./forms-ui.mjs";
import { iconPath } from "./ui.mjs";
import * as SRD from "./srd-compendium.mjs";
import { packCreature, packCreatures } from "./compat-packs.mjs";

const ID = "token-menu";
const DRAWER = "token-menu-creatures";
const L = (it, en) => Object.freeze({ it, en });
const copy = (value) => structuredClone(value);
const localized = (code, it, en) => Object.assign(new Error(en), { code, it, en });
const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36);

// Facts typed into the token menu are manual records of this app, never an SRD citation.
export const TOKEN_MENU_SOURCE = Object.freeze({
  kind: "manual",
  edition: "2024",
  revision: "token-menu-1",
  title: L("Registrazione dal menu della pedina", "Record from the token menu"),
});

// DDB-117: twelve border colours.
export const RING_COLOURS = Object.freeze([
  ["gold", "#e2c17b", L("Oro", "Gold")],
  ["red", "#e0625c", L("Rosso", "Red")],
  ["orange", "#ec9a4c", L("Arancione", "Orange")],
  ["yellow", "#f2da5a", L("Giallo", "Yellow")],
  ["green", "#79c27b", L("Verde", "Green")],
  ["teal", "#46c0b0", L("Verde acqua", "Teal")],
  ["blue", "#63a4e0", L("Blu", "Blue")],
  ["purple", "#a58ae0", L("Viola", "Purple")],
  ["pink", "#ec98c0", L("Rosa", "Pink")],
  ["white", "#f6f1e6", L("Bianco", "White")],
  ["grey", "#98a3a8", L("Grigio", "Grey")],
  ["black", "#161b1f", L("Nero", "Black")],
]);
// SRD 5.2.1 creature sizes (EN 13 / IT 14). The number is the space in grid cells; the
// token is drawn at that scale (Tiny is kept readable at 0.6).
export const TOKEN_SIZES = Object.freeze([
  ["tiny", 0.6, L("Minuscola", "Tiny")],
  ["small", 1, L("Piccola", "Small")],
  ["medium", 1, L("Media", "Medium")],
  ["large", 2, L("Grande", "Large")],
  ["huge", 3, L("Enorme", "Huge")],
  ["gargantuan", 4, L("Mastodontica", "Gargantuan")],
]);
const CONDITIONS = listConditionDefinitions();
const CONDITION = new Map(CONDITIONS.map((row) => [row.id, row]));

// Line icons (24×24) for the SRD conditions: BG3-style status icons on tokens and in menus.
const CONDITION_ICONS = {
  blinded: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z M4 21 20 3",
  charmed: "M12 20s-8-5-8-11a4 4 0 0 1 8-1.5A4 4 0 0 1 20 9c0 6-8 11-8 11Z",
  deafened: "M7 9a5 5 0 0 1 10 0c0 3-3 4-3 7a3 3 0 0 1-5 1 M4 21 20 3",
  exhaustion: "M3 7h15v10H3Z M20 10v4 M6 10v4",
  frightened: "M12 3 22 20H2Z M12 9v5 M12 17v.5",
  grappled: "M9 15l6-6 M7 11l-2 2a3.5 3.5 0 0 0 5 5l2-2 M12 8l2-2a3.5 3.5 0 0 1 5 5l-2 2",
  incapacitated: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M8 8l8 8M16 8l-8 8",
  invisible:
    "M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.6 5.6l2 2 M16.4 16.4l2 2 M5.6 18.4l2-2 M16.4 7.6l2-2",
  paralyzed: "M13 2 4 14h7l-1 8 9-12h-7Z",
  petrified: "M12 3 20 8v8l-8 5-8-5V8Z M4 8l8 5 8-5 M12 13v8",
  poisoned: "M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11Z",
  prone: "M3 20h18 M4 16h11 M18 15a1.5 1.5 0 1 0 0 .1 M12 3v7 M9 7l3 3 3-3",
  restrained: "M4 4h16v16H4Z M9.5 4v16 M14.5 4v16",
  stunned:
    "M7 3l1.2 2.6L11 7l-2.8 1.4L7 11 5.8 8.4 3 7l2.8-1.4Z M17 12l1.2 2.6L21 16l-2.8 1.4L17 20l-1.2-2.6L13 16l2.8-1.4Z",
  unconscious: "M4 6h6l-6 7h6 M13 12h6l-6 7h6",
};
const MENU_ICONS = {
  conditions: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v6 M12 16v.5",
  sheet: "M12 5Q6 2 2 5v15q6-3 10 0 4-3 10 0V5q-6-3-10 0Zm0 0v15",
  center: "M12 2v4M12 18v4M2 12h4M18 12h4 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
  pick: "M4 4h6M14 4h6M4 20h6M14 20h6M4 4v6M4 14v6M20 4v6M20 14v6",
  hide: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z M4 21 20 3",
  reveal: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
  audience: "M9 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M1 20v-2a5 5 0 0 1 10 0v2 M16 11l2 2 4-4",
  rename: "M4 20h4L20 8l-4-4L4 16Z M14 6l4 4",
  name: "M3 6h18M3 12h10M3 18h7 M15 15l6 6M21 15l-6 6",
  ring: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10",
  size: "M4 14v6h6 M20 10V4h-6 M4 20l7-7 M20 4l-7 7",
  lock: "M6 11h12v10H6Z M8 11V7a4 4 0 0 1 8 0v4",
  unlock: "M6 11h12v10H6Z M8 11V7a4 4 0 0 1 7.5-2",
  group: "M3 3h8v8H3Z M13 13h8v8h-8Z M11 7h4v6",
  transform: "M4 8a8 8 0 0 1 14-3 M20 4v5h-5 M20 16a8 8 0 0 1-14 3 M4 20v-5h5 M9 12h.5M14.5 12h.5",
  copy: "M8 8h12v12H8Z M4 16V4h12",
  paste: "M8 4h8v4H8Z M6 6H4v16h16V6h-2 M8 13h8M8 17h5",
  back: "M15 5l-7 7 7 7",
  close: "m5 5 14 14M5 19 19 5",
  more: "M5 12h.5M12 12h.5M19 12h.5",
  undo: "M4 10h10a7 7 0 0 1 0 14 M4 10l5-5M4 10l5 5",
  rotate: "M20 11a8 8 0 1 0-2.3 5.7 M20 4v7h-7",
  rotateLeft: "M4 11a8 8 0 1 1 2.3 5.7 M4 4v7h7",
  remove: "M4 7h16 M9 7V4h6v3 M6 7l1 13h10l1-13 M10 11v6M14 11v6",
  door: "M6 21V3h12v18 M3 21h18 M14 12h.5",
  scene: "M3 5h18v14H3Z M3 15l5-5 4 4 3-3 6 6",
  selectAll: "M4 4h16v16H4Z M8 12l3 3 5-6",
  fit: "M4 9V4h5 M20 9V4h-5 M4 15v5h5 M20 15v5h-5",
  // B62 labelled submenus: actions (bolt), appearance (palette), items (bag), DM (shield).
  act: "M13 2 4 14h7l-1 8 9-12h-7Z",
  palette:
    "M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6 0-1.3-1-1.6-1-2.9 0-1 .8-1.5 1.8-1.5H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8Z M7.5 11h.5M10 7.5h.5M14.5 7.5h.5",
  bag: "M5 7h14l2 14H3Z M9 7V5a3 3 0 0 1 6 0v2",
  shield: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z",
  plus: "M12 5v14 M5 12h14",
  // Final review F27: hit points (D&D Beyond's heart) and examine (a magnifier over the eye).
  heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z",
  examine: "M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12 M14.5 14.5 20 20",
};
// F27 (Foundry and Owlbear menu rows carry their icon): an area's row uses its declared core
// icon, a known row its own; «⋯» only for a row that names none.
const AREA_ICONS = { "damage-tray-hp": "heart", "knowledge-examine": "examine" };
export function menuIconFor(item) {
  const own = AREA_ICONS[item?.id];
  if (own) return MENU_ICONS[own];
  if (item?.icon && MENU_ICONS[item.icon]) return MENU_ICONS[item.icon];
  return (item?.icon && iconPath(item.icon)) || MENU_ICONS.more;
}
const svgIcon = (path, extra = "") =>
  `<svg class="token-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}><path d="${path}"/></svg>`;

// ---------------------------------------------------------------- state slice

export function seedSlice() {
  return { tokens: {}, groups: {}, names: {} };
}
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const ringIds = new Set(RING_COLOURS.map(([id]) => id));
const sizeIds = new Set(TOKEN_SIZES.map(([id]) => id));
export function normalizeSlice(value) {
  const out = seedSlice();
  for (const [tokenId, raw] of Object.entries(isObject(value?.tokens) ? value.tokens : {})) {
    if (!isObject(raw)) continue;
    const entry = {};
    if (raw.locked === true) entry.locked = true;
    if (ringIds.has(raw.ring)) entry.ring = raw.ring;
    if (sizeIds.has(raw.size)) entry.size = raw.size;
    const rotation = normalRotation(raw.rotation);
    if (rotation) entry.rotation = rotation;
    if (Array.isArray(raw.audience))
      entry.audience = [...new Set(raw.audience.filter((id) => typeof id === "string"))];
    if (Object.keys(entry).length) out.tokens[tokenId] = entry;
  }
  for (const [groupId, raw] of Object.entries(isObject(value?.groups) ? value.groups : {})) {
    const tokenIds = Array.isArray(raw?.tokenIds)
      ? [...new Set(raw.tokenIds.filter((id) => typeof id === "string"))]
      : [];
    if (tokenIds.length > 1 && typeof raw.sceneId === "string")
      out.groups[groupId] = { sceneId: raw.sceneId, tokenIds };
  }
  for (const [actorId, raw] of Object.entries(isObject(value?.names) ? value.names : {})) {
    if (!isObject(raw)) continue;
    const entry = {};
    if (typeof raw.original === "string") entry.original = raw.original;
    if (raw.hidden === true && typeof raw.trueName === "string") {
      entry.hidden = true;
      entry.trueName = raw.trueName;
    }
    if (Object.keys(entry).length) out.names[actorId] = entry;
  }
  return out;
}
const sliceOf = (state) => (isObject(state?.ext?.[ID]) ? state.ext[ID] : seedSlice());
const entryOf = (slice, tokenId) => slice?.tokens?.[tokenId] ?? {};
const writableEntry = (slice, tokenId) => (slice.tokens[tokenId] ??= {});
function tidyEntry(slice, tokenId) {
  const entry = slice.tokens[tokenId];
  if (entry && !Object.keys(entry).length) delete slice.tokens[tokenId];
}

// ---------------------------------------------------------------- pure domain

export const sceneById = (state, id) => state?.scenes?.find((s) => s.id === id) ?? null;
export const activeScene = (state) => sceneById(state, state?.activeSceneId);
export const tokenOfActor = (scene, actorId) =>
  scene?.tokens?.find((token) => token.actorId === actorId) ?? null;
// C3 (CA-57): with the state, the session runner of a DM hand-off has the DM's powers here.
// The viewer has the DM's session powers (the DM, or the runner of a hand-off, C3).
const dm = (ctx) => runsSession(ctx.state, ctx.role);
const requireDM = (role, state = null) => {
  if (role !== "dm" && !(state && runsSession(state, role)))
    throw localized("dm-only", "Solo il DM può farlo.", "Only the DM can do this.");
};

/** Mirror of the Table's own rule (table.mjs renderTable): the viewer sees this token. */
export function observesToken(state, token, role) {
  const subject = state?.actors?.[token?.actorId];
  return Boolean(
    token &&
    isActorAvailable(subject) &&
    (!subject.companion || canViewActor(subject, role, state)) &&
    (subject.visibility !== "private" || canViewActor(subject, role, state)) &&
    (canControlActor(subject, role, state) ||
      (!subject.hidden && !token.hidden && token.visible !== false)),
  );
}

/** Party characters a DM can choose as the audience of a token (Smoke & Spectre). */
export function partyCharacters(state) {
  return Object.values(state?.actors ?? {}).filter(
    (actor) =>
      actor.kind === "character" &&
      !actor.companion &&
      actor.visibility !== "private" &&
      isActorAvailable(actor) &&
      (actor.campaignIds === undefined || actor.campaignIds.includes(state.campaign?.id)),
  );
}
export const audienceOf = (slice, tokenId) => [...(entryOf(slice, tokenId).audience ?? [])];

/**
 * VTL-143 Spectre: a hidden token whose audience includes a character this viewer plays
 * is shown to that viewer as a local copy. The DM always sees the real token; a viewer who
 * already sees it through the Table (its controller) needs no copy.
 */
export function seesAsAudience(state, slice, token, viewer) {
  if (viewer === "dm" || !token?.hidden) return false;
  const subject = state?.actors?.[token.actorId];
  if (!isActorAvailable(subject) || subject.hidden || observesToken(state, token, viewer))
    return false;
  return audienceOf(slice, token.id).some((id) => {
    const actor = state.actors[id];
    return actor?.kind === "character" && canControlActor(actor, viewer, state);
  });
}
/** "all" (everyone), "dm" (hidden from every player) or "some" (hidden + audience). */
export function visibilityMode(slice, token) {
  if (!token?.hidden) return "all";
  return audienceOf(slice, token.id).length ? "some" : "dm";
}
export function setVisibility(state, slice, tokenIds, mode, audience, role) {
  requireDM(role, state);
  if (!["all", "dm", "some"].includes(mode))
    throw localized("mode", "Scegli chi vede la pedina.", "Choose who sees the token.");
  const party = new Set(partyCharacters(state).map((actor) => actor.id));
  const chosen = [...new Set(audience ?? [])].filter((id) => party.has(id));
  if (mode === "some" && !chosen.length)
    throw localized(
      "audience-empty",
      "Scegli almeno un personaggio che può vederla.",
      "Choose at least one character who can see it.",
    );
  const scene = activeScene(state);
  for (const tokenId of tokenIds) {
    const token = scene?.tokens.find((t) => t.id === tokenId);
    if (!token) throw localized("token-missing", "Pedina non trovata.", "Token not found.");
    token.hidden = mode !== "all";
    const entry = writableEntry(slice, tokenId);
    if (mode === "some") entry.audience = [...chosen];
    else delete entry.audience;
    tidyEntry(slice, tokenId);
  }
}

export function setLocked(slice, tokenIds, locked, role, state = null) {
  requireDM(role, state);
  for (const tokenId of tokenIds) {
    const entry = writableEntry(slice, tokenId);
    if (locked) entry.locked = true;
    else delete entry.locked;
    tidyEntry(slice, tokenId);
  }
}
export const isLocked = (slice, tokenId) => entryOf(slice, tokenId).locked === true;
// The Table tools whose gestures move the selected token: Move (drag, click, arrows + Enter)
// and Plan path (points, then "Execute path"). Measure, Pan and the pointer never move it.
const MOVING_MODES = new Set(["move", "plan"]);
/** A Table gesture in `mode` would move this actor's token, which the DM locked (DDB-118). */
export function lockBlocksMovement(state, actorId, mode) {
  if (!MOVING_MODES.has(mode)) return false;
  const token = tokenOfActor(activeScene(state), actorId);
  return Boolean(token && isLocked(sliceOf(state), token.id));
}

export const groupOf = (slice, tokenId) =>
  Object.entries(slice?.groups ?? {}).find(([, group]) => group.tokenIds.includes(tokenId))?.[0] ??
  null;
/** Token ids plus every member of their groups (DDB-118: a group selects together). */
export function expandGroups(slice, tokenIds) {
  const out = new Set(tokenIds);
  for (const tokenId of tokenIds) {
    const groupId = groupOf(slice, tokenId);
    for (const member of slice?.groups?.[groupId]?.tokenIds ?? []) out.add(member);
  }
  return [...out];
}
/**
 * C2 (R7 → R3): the campaign permission «I giocatori possono raggruppare le proprie pedine».
 * Off while the permission is not registered or not granted: grouping stays the DM's.
 */
export function playersMayGroup(state) {
  if (!permissionOf("playerGroup")) return false;
  return permissionAllowed(
    policyOf(state?.ext?.["campaign-settings"], state?.campaign?.id),
    "playerGroup",
  );
}
// R3 CA-61 (Foundry ownership, Owlbear per-item permissions): who may group or ungroup these
// tokens. The DM (or the session runner); a player only with the permission, only her own.
function requireGroupRights(slice, tokenIds, role, { state = null, allowPlayers } = {}) {
  if (role === "dm" || (state && runsSession(state, role))) return;
  const allowed = allowPlayers ?? (state ? playersMayGroup(state) : false);
  if (!allowed)
    throw localized(
      "group-dm",
      "Raggruppare le pedine lo fa il DM: può permetterlo ai giocatori nelle impostazioni della campagna (Permessi).",
      "The DM groups tokens: they can allow players in the campaign settings (Permissions).",
    );
  const own = (tokenId) => {
    const token = (state?.scenes ?? [])
      .flatMap((x) => x.tokens ?? [])
      .find((t) => t.id === tokenId);
    return Boolean(token && canControlActor(state.actors[token.actorId], role, state));
  };
  if (!expandGroups(slice, tokenIds).every(own))
    throw localized(
      "group-own",
      "Puoi raggruppare solo le pedine che controlli.",
      "You can only group the tokens you control.",
    );
}
export function groupTokens(slice, sceneId, tokenIds, role, newId = uid(), options = {}) {
  requireGroupRights(slice, tokenIds, role, options);
  const members = expandGroups(slice, tokenIds);
  if (members.length < 2)
    throw localized(
      "group-size",
      "Seleziona almeno due pedine da raggruppare (Maiusc+clic o riquadro).",
      "Select at least two tokens to group (Shift+click or box).",
    );
  for (const [groupId, group] of Object.entries(slice.groups))
    if (group.tokenIds.some((id) => members.includes(id))) delete slice.groups[groupId];
  slice.groups[newId] = { sceneId, tokenIds: members };
  return newId;
}
export function ungroupTokens(slice, tokenIds, role, options = {}) {
  requireGroupRights(slice, tokenIds, role, options);
  let removed = 0;
  for (const tokenId of tokenIds) {
    const groupId = groupOf(slice, tokenId);
    if (groupId) {
      delete slice.groups[groupId];
      removed++;
    }
  }
  if (!removed)
    throw localized(
      "no-group",
      "Queste pedine non sono in un gruppo.",
      "These tokens are not grouped.",
    );
}

/**
 * DM: «Chi può muovere il gruppo…» (R3 CA-61). `movers` null restores the default (whoever
 * controls a member drags it); [] means only the DM; token ids name the members whose
 * controllers may move the whole group, members they do not control included.
 */
export function setGroupMovers(state, slice, groupId, movers, role) {
  requireDM(role, state);
  const group = slice?.groups?.[groupId];
  if (!group) throw localized("no-group", "Gruppo non trovato.", "Group not found.");
  if (movers === null) delete group.movers;
  else group.movers = [...new Set(movers)].filter((id) => group.tokenIds.includes(id));
}
/** Why this viewer may not move the group of `tokenId` ({it, en}), or null. */
export function groupMoveRefusal(state, tokenId, role) {
  const slice = sliceOf(state);
  const groupId = groupOf(slice, tokenId);
  const group = slice.groups?.[groupId];
  if (!group || !Array.isArray(group.movers) || runsSession(state, role)) return null;
  const tokens = (sceneById(state, group.sceneId) ?? activeScene(state))?.tokens ?? [];
  const actorOf = (id) => state.actors[tokens.find((t) => t.id === id)?.actorId];
  if (group.movers.some((id) => canControlActor(actorOf(id), role, state))) return null;
  const names = group.movers
    .map((id) => actorOf(id)?.name)
    .filter(Boolean)
    .join(", ");
  return names
    ? L(
        `Questo gruppo lo muovono solo il DM e chi controlla ${names}.`,
        `Only the DM and whoever controls ${names} move this group.`,
      )
    : L("Questo gruppo lo muove solo il DM.", "Only the DM moves this group.");
}

export function setRing(slice, tokenIds, ring) {
  if (ring !== null && !ringIds.has(ring))
    throw localized("ring", "Colore non disponibile.", "Colour not available.");
  for (const tokenId of tokenIds) {
    const entry = writableEntry(slice, tokenId);
    if (ring) entry.ring = ring;
    else delete entry.ring;
    tidyEntry(slice, tokenId);
  }
}
export function setSize(slice, tokenIds, size) {
  if (size !== null && !sizeIds.has(size))
    throw localized("size", "Taglia non disponibile.", "Size not available.");
  for (const tokenId of tokenIds) {
    const entry = writableEntry(slice, tokenId);
    if (size) entry.size = size;
    else delete entry.size;
    tidyEntry(slice, tokenId);
  }
}
/** The token's drawn size: the explicit token size, otherwise the creature's own size. */
export function displaySize(state, slice, token) {
  const own = entryOf(slice, token?.id).size;
  if (own) return own;
  const size = state?.actors?.[token?.actorId]?.size;
  return sizeIds.has(size) ? size : "medium";
}
export const sizeScale = (size) => TOKEN_SIZES.find(([id]) => id === size)?.[1] ?? 1;

// Token rotation (TV-06, TouchVTT rotation buttons FVT-200): a drawn facing only. The 2024
// rules have no facing, so nothing reads it but the drawing; steps of 15 degrees.
export function normalRotation(value) {
  if (!Number.isFinite(value)) return 0;
  const step = Math.round(value / 15) * 15;
  return ((step % 360) + 360) % 360;
}
export const rotationOf = (slice, tokenId) => entryOf(slice, tokenId).rotation ?? 0;
/** Turns tokens by `delta` degrees, or sets `absolute` (0 clears the rotation). */
export function rotateTokens(slice, tokenIds, { delta = 0, absolute = null } = {}) {
  if (!Number.isFinite(delta) || (absolute !== null && !Number.isFinite(absolute)))
    throw localized("rotation", "Rotazione non valida.", "Invalid rotation.");
  for (const tokenId of tokenIds) {
    const entry = writableEntry(slice, tokenId);
    const next = normalRotation(absolute ?? (entry.rotation ?? 0) + delta);
    if (next) entry.rotation = next;
    else delete entry.rotation;
    tidyEntry(slice, tokenId);
  }
}

// Remove from the scene (DDB-117 delete, Del/Backspace): the Preparation command, so the
// creature's sheet stays (TV-21); the area's own marks of the removed tokens go with them.
export function removeTokens(state, slice, tokenIds, role) {
  requireDM(role, state);
  const scene = activeScene(state);
  if (!scene) throw localized("scene", "Nessuna scena attiva.", "No active scene.");
  const tokens = tokenIds.map((id) => scene.tokens.find((t) => t.id === id)).filter(Boolean);
  if (!tokens.length) throw localized("token-missing", "Pedina non trovata.", "Token not found.");
  const fighting = tokens.filter(
    (t) => state.combat?.active && (state.combat.order ?? []).includes(t.actorId),
  );
  if (fighting.length)
    throw localized(
      "remove-in-combat",
      `Ancora nell’ordine dei turni: ${fighting.map((t) => state.actors[t.actorId]?.name).join(", ")}. Concludi l’incontro prima di togliere la pedina.`,
      `Still in the turn order: ${fighting.map((t) => state.actors[t.actorId]?.name).join(", ")}. End the encounter before removing the token.`,
    );
  for (const token of tokens) {
    removeSceneToken(state, scene.id, token.id, role);
    delete slice.tokens[token.id];
    for (const [groupId, group] of Object.entries(slice.groups)) {
      group.tokenIds = group.tokenIds.filter((id) => id !== token.id);
      if (group.tokenIds.length < 2) delete slice.groups[groupId];
    }
  }
  return tokens.map((t) => t.actorId);
}

/**
 * The map's SVG viewport in screen pixels: its content box, where the viewBox is fitted. The
 * phone Table pads the map's bottom (styles.css, visual pass 2) so the scene sits above the
 * party portraits and the zoom row; the border box would move the fitted scene.
 */
export function mapViewport(svg, style = getComputedStyle(svg)) {
  const px = (value) => Number.parseFloat(value) || 0;
  const box = svg.getBoundingClientRect();
  const left = px(style.paddingLeft) + px(style.borderLeftWidth);
  const top = px(style.paddingTop) + px(style.borderTopWidth);
  return {
    left: box.left + left,
    top: box.top + top,
    width: box.width - left - px(style.paddingRight) - px(style.borderRightWidth),
    height: box.height - top - px(style.paddingBottom) - px(style.borderBottomWidth),
  };
}

/**
 * Pinch and two-finger pan (TV-06; TouchVTT FVT-200, Roll20 R20-211, DDB-120): the view
 * whose `zoom` keeps the scene point `anchor` under the screen point `client`. The map is
 * an SVG with the default xMidYMid meet, inside `rect` (its viewport, `mapViewport`); zoom
 * follows the Table's 0.6–3.
 */
export function viewAround(scene, rect, zoom, anchor, client) {
  const z = Math.min(3, Math.max(0.6, zoom));
  const w = scene.width / z;
  const h = scene.height / z;
  const k = Math.min(rect.width / w, rect.height / h);
  const offX = (rect.width - w * k) / 2;
  const offY = (rect.height - h * k) / 2;
  return {
    zoom: z,
    pan: {
      x: anchor.x - (client.x - rect.left - offX) / k,
      y: anchor.y - (client.y - rect.top - offY) / k,
    },
  };
}

// Names. A hidden name (DDB "hide the name badge" DDB-117, Owlbear GM-only names SVC-167,
// the unidentified-NPC pattern TV-141: Foundry's Anonymous module FVT-126, the Fantasy
// Grounds ID toggle R20-155) replaces the creature's shared name with a neutral alias
// everywhere players read it (token, turn order, log, sheet), and keeps the real name in
// this DM-only record. Every screen then projects the alias per viewer (see
// `nameProjections`): the viewer's language for everyone, and "alias · real name" for the
// DM, so the DM never loses the real name.
/**
 * The hidden-name record while it still applies, i.e. while the creature still carries its
 * alias. A name changed elsewhere (the DM edits it on the sheet) ends the hidden name: the
 * new name is what players read, and the stale real name is never brought back over it.
 */
export function hiddenName(state, slice, actorId) {
  const record = slice?.names?.[actorId];
  return record?.hidden && aliasNumber(state?.actors?.[actorId]?.name) !== null ? record : null;
}
/** Drops a hidden-name record that no longer applies (see `hiddenName`). */
function reconcileName(state, slice, actorId) {
  const record = slice.names?.[actorId];
  if (!record?.hidden || hiddenName(state, slice, actorId)) return;
  delete record.hidden;
  delete record.trueName;
  if (!Object.keys(record).length) delete slice.names[actorId];
}
export const trueNameOf = (state, slice, actorId) =>
  hiddenName(state, slice, actorId)?.trueName ?? state?.actors?.[actorId]?.name ?? "";
const requireNPC = (state, actorId) => {
  const actor = state.actors?.[actorId];
  if (!actor || actor.kind !== "npc" || actor.companion)
    throw localized(
      "npc-only",
      "Solo le creature del DM si rinominano dal menu della pedina.",
      "Only DM creatures are renamed from the token menu.",
    );
  return actor;
};
export function renameCreature(state, slice, actorId, name, role) {
  requireDM(role, state);
  const actor = requireNPC(state, actorId);
  const next = String(name ?? "").trim();
  if (!next || next.length > 128)
    throw localized(
      "name-length",
      "Il nome deve avere da 1 a 128 caratteri.",
      "The name needs 1 to 128 characters.",
    );
  reconcileName(state, slice, actorId);
  const record = (slice.names[actorId] ??= {});
  const current = trueNameOf(state, slice, actorId);
  if (next === current)
    throw localized("name-same", "Il nome è già questo.", "The name is already this.");
  if (record.original === undefined) record.original = current;
  if (record.original === next) delete record.original;
  if (record.hidden) record.trueName = next;
  else actor.name = next;
  if (!Object.keys(record).length) delete slice.names[actorId];
}
export function restoreName(state, slice, actorId, role) {
  requireDM(role, state);
  requireNPC(state, actorId);
  const record = slice.names[actorId];
  if (record?.original === undefined)
    throw localized(
      "name-original",
      "Il nome è già quello originale.",
      "The name is already the original.",
    );
  renameCreature(state, slice, actorId, record.original, role);
}
const ALIAS_BASES = { it: "Creatura sconosciuta", en: "Unknown creature" };
const ALIAS_PATTERN = /^(?:Creatura sconosciuta|Unknown creature) (\d+)$/;
/** The number of a stored alias ("Creatura sconosciuta 3" → 3), or null. */
export const aliasNumber = (name) => {
  const match = ALIAS_PATTERN.exec(String(name ?? ""));
  return match ? Number(match[1]) : null;
};
export const aliasIn = (n, lang = "it") => (ALIAS_BASES[lang] ?? ALIAS_BASES.it) + " " + n;
/** A new alias whose number is free in both languages (so a translation never collides). */
export function nameAlias(state, lang = "it") {
  const used = new Set(
    Object.values(state.actors ?? {})
      .map((actor) => aliasNumber(actor.name))
      .filter((n) => n !== null),
  );
  let n = 1;
  while (used.has(n)) n++;
  return aliasIn(n, lang);
}
/**
 * Text replacements a viewer's screen applies to hidden-name aliases: the alias in the
 * viewer's language, followed for the DM by " · " and the real name. Players never get a
 * real name from here. Longest first, so "… 1" never rewrites the start of "… 12".
 */
export function nameProjections(state, role, lang = "it") {
  const slice = sliceOf(state);
  const out = [];
  for (const [actorId, record] of Object.entries(slice.names ?? {})) {
    if (!record?.hidden) continue;
    const stored = state?.actors?.[actorId]?.name;
    const n = aliasNumber(stored);
    if (n === null) continue;
    const local = aliasIn(n, lang);
    const shown = runsSession(state, role) ? local + " · " + record.trueName : local;
    for (const from of new Set([aliasIn(n, "it"), aliasIn(n, "en")]))
      if (from !== shown) out.push({ from, to: shown, trueName: record.trueName, actorId });
  }
  return out.sort((a, b) => b.from.length - a.from.length);
}
/** Applies `nameProjections` to one text; an alias is replaced only as a whole word. */
export function projectNames(text, projections) {
  let out = String(text ?? "");
  if (!projections.length || !/Creatura sconosciuta|Unknown creature/.test(out)) return out;
  for (const { from, to } of projections) {
    if (!out.includes(from)) continue;
    const pattern = new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?!\\d)", "g");
    // An alias already followed by its projection (" · real name") stays as it is.
    out = out.replace(pattern, (match, offset, whole) =>
      whole.startsWith(to, offset) ? match : to,
    );
  }
  return out;
}
export function setNameHidden(state, slice, actorId, hidden, role, lang = "it") {
  requireDM(role, state);
  const actor = requireNPC(state, actorId);
  reconcileName(state, slice, actorId);
  const record = (slice.names[actorId] ??= {});
  if (hidden) {
    if (record.hidden)
      throw localized("name-hidden", "Il nome è già nascosto.", "The name is already hidden.");
    record.hidden = true;
    record.trueName = actor.name;
    actor.name = nameAlias(state, lang);
  } else {
    if (!record.hidden)
      throw localized("name-shown", "Il nome è già visibile.", "The name is already visible.");
    actor.name = record.trueName;
    delete record.hidden;
    delete record.trueName;
  }
  if (!Object.keys(record).length) delete slice.names[actorId];
}

// Copy and paste (DDB-119). A copy is a new, independent creature made with the same
// command as Preparation's "Duplicate" (duplicateSceneNPC), placed with placeSceneToken.
// As in DDB, a paste reproduces what was copied: the clipboard keeps the name, hidden name,
// visibility and look as they were at copy time, not later changes to the original.
export function copyableActor(actor) {
  return Boolean(actor && actor.kind === "npc" && !actor.companion && !actor.activeForm);
}
export function copyTokens(state, slice, tokenIds, role) {
  requireDM(role, state);
  const scene = activeScene(state);
  const tokens = tokenIds
    .map((id) => scene?.tokens.find((token) => token.id === id))
    .filter(Boolean);
  const kept = tokens.filter((token) => copyableActor(state.actors[token.actorId]));
  const skipped = tokens
    .filter((token) => !kept.includes(token))
    .map((token) => state.actors[token.actorId]?.name ?? token.id);
  if (!kept.length)
    throw localized(
      "copy-none",
      "Solo le creature del DM si copiano: i personaggi hanno una sola scheda.",
      "Only DM creatures can be copied: characters have a single sheet.",
    );
  const anchor = kept[0];
  return {
    sceneId: scene.id,
    items: kept.map((token) => ({
      actorId: token.actorId,
      dx: token.x - anchor.x,
      dy: token.y - anchor.y,
      hidden: token.hidden === true,
      entry: copy(entryOf(slice, token.id)),
      group: groupOf(slice, token.id),
      name: trueNameOf(state, slice, token.actorId),
      nameHidden: Boolean(hiddenName(state, slice, token.actorId)),
    })),
    skipped,
  };
}
// Preparation's Duplicate (duplicateSceneNPC) accepts names up to 100 characters, while a
// rename allows 128 (DDB-117): a copy's base name is shortened so "base + letter" fits.
const COPY_NAME_MAX = 100;
/** "Sentinella" → "Sentinella B", then C… (DDB-139: duplicates are lettered). */
export function copyName(state, name) {
  const base = String(name).replace(/ [A-Z]$/, "");
  const fit = (suffix) => base.slice(0, COPY_NAME_MAX - suffix.length).trimEnd() + suffix;
  const used = new Set(Object.values(state.actors ?? {}).map((actor) => actor.name));
  for (let code = 66; code <= 90; code++) {
    const candidate = fit(" " + String.fromCharCode(code));
    if (!used.has(candidate)) return candidate;
  }
  let n = 27;
  while (used.has(fit(" " + n))) n++;
  return fit(" " + n);
}
export function pasteTokens(
  state,
  slice,
  clipboard,
  point,
  role,
  { makeId = uid, lang = "it" } = {},
) {
  requireDM(role, state);
  if (!clipboard?.items?.length)
    throw localized(
      "paste-empty",
      "Non hai copiato nessuna pedina.",
      "You have not copied any token.",
    );
  const scene = activeScene(state);
  if (!scene) throw localized("scene", "Nessuna scena attiva.", "No active scene.");
  if (![point?.x, point?.y].every(Number.isFinite))
    throw localized("paste-point", "Indica dove incollare.", "Choose where to paste.");
  const created = [];
  const groups = new Map();
  for (const item of clipboard.items) {
    const source = state.actors[item.actorId];
    if (!copyableActor(source))
      throw localized(
        "paste-source",
        "La creatura copiata non esiste più.",
        "The copied creature no longer exists.",
      );
    const actorId =
      item.actorId.replace(/-c[0-9a-z]{6}$/, "") +
      "-c" +
      makeId()
        .replace(/[^0-9a-z]/gi, "")
        .slice(0, 6)
        .toLowerCase();
    const name = copyName(state, item.name);
    duplicateSceneNPC(state, item.actorId, actorId, name, role);
    const copyActor = state.actors[actorId];
    // An independent creature: its own sheet, without the original's ongoing effects.
    copyActor.conditions = [];
    copyActor.exhaustion = 0;
    delete copyActor.concentration;
    delete copyActor.combatEffects;
    if (item.nameHidden) {
      slice.names[actorId] = { hidden: true, trueName: name };
      copyActor.name = nameAlias(state, lang);
    }
    const tokenId = "token-" + actorId;
    placeSceneToken(
      state,
      scene.id,
      actorId,
      { x: point.x + item.dx, y: point.y + item.dy },
      tokenId,
      role,
    );
    const token = scene.tokens.find((t) => t.id === tokenId);
    if (item.hidden) token.hidden = true;
    const entry = copy(item.entry ?? {});
    delete entry.locked;
    if (Object.keys(entry).length) slice.tokens[tokenId] = entry;
    if (item.group) {
      if (!groups.has(item.group)) groups.set(item.group, []);
      groups.get(item.group).push(tokenId);
    }
    created.push(actorId);
  }
  for (const tokenIds of groups.values())
    if (tokenIds.length > 1) slice.groups[makeId()] = { sceneId: scene.id, tokenIds };
  return created;
}

/** Actors whose token centre lies inside a scene box, for this viewer. */
// P6 TV-15 (Roll20's filtered box select): which tokens a box keeps. "enemies" keeps the
// creatures hostile to the party (their token is red on the map), "mine" the ones this viewer
// controls; "all" keeps every token the viewer sees.
export const BOX_FILTERS = Object.freeze(["all", "enemies", "mine"]);
export function boxFilterKeeps(state, actorId, filter, canControl) {
  const actor = state.actors?.[actorId];
  if (!actor) return false;
  if (filter === "mine") return Boolean(canControl(actor));
  if (filter === "enemies") {
    const team =
      actor.combatProfile?.team ?? (["goblin-1", "goblin-2"].includes(actor.id) ? "watch" : null);
    return team === "watch";
  }
  return true;
}
export function tokensInBox(state, slice, box, viewer) {
  const scene = activeScene(state);
  const x1 = Math.min(box.x1, box.x2),
    x2 = Math.max(box.x1, box.x2),
    y1 = Math.min(box.y1, box.y2),
    y2 = Math.max(box.y1, box.y2);
  return (scene?.tokens ?? [])
    .filter(
      (token) =>
        token.x >= x1 &&
        token.x <= x2 &&
        token.y >= y1 &&
        token.y <= y2 &&
        observesToken(state, token, viewer),
    )
    .map((token) => token.actorId);
}

// HP arithmetic (VTL-234): "-5" damage, "+3" healing, "=12" or "12" sets (Owl Trackers);
// chains such as "-3-2", "=25-3+2" or "25-3+2" (Battle Board). A relative chain records its
// net result as one damage or one healing; a chain that starts from the current HP
// ("18-5" at 18 HP) is a change of that value, so it is damage or healing too, never a
// silent correction. Any other plain number or chain sets the value (a correction).
export function parseHpInput(raw, current = null) {
  const text = String(raw ?? "")
    .trim()
    .replace(/[−–]/g, "-")
    .replace(/\s+/g, "");
  if (!text)
    throw localized(
      "hp-empty",
      "Scrivi un valore: -5 per un danno, +3 per una cura, =12 per impostare.",
      "Type a value: -5 for damage, +3 for healing, =12 to set.",
    );
  const match = /^([+\-=]?)(\d{1,6})((?:[+\-]\d{1,6}){0,20})$/.exec(text);
  if (!match)
    throw localized(
      "hp-format",
      `«${text}» non è un valore valido. Usa -5 per un danno, +3 per una cura, =12 per impostare i PF (anche in catena: 25-3+2).`,
      `“${text}” is not a valid value. Use -5 for damage, +3 for healing, =12 to set HP (chains work too: 25-3+2).`,
    );
  const first = Number(match[2]);
  const rest = [...match[3].matchAll(/([+\-])(\d+)/g)].reduce(
    (sum, [, sign, digits]) => sum + (sign === "-" ? -1 : 1) * Number(digits),
    0,
  );
  const fromCurrent = !match[1] && match[3] && Number.isInteger(current) && first === current;
  let delta = null;
  if (match[1] === "-" || match[1] === "+") delta = (match[1] === "-" ? -first : first) + rest;
  else if (fromCurrent) delta = rest;
  if (delta === null) {
    const amount = first + rest;
    if (amount < 0)
      throw localized(
        "hp-negative",
        `«${text}» dà ${amount}: i PF non scendono sotto 0.`,
        `“${text}” gives ${amount}: HP do not go below 0.`,
      );
    return { op: "set", amount, text };
  }
  if (delta === 0)
    throw localized(
      "hp-zero-change",
      "Un danno o una cura di 0 non cambia nulla.",
      "Damage or healing of 0 changes nothing.",
    );
  return { op: delta < 0 ? "damage" : "heal", amount: Math.abs(delta), text };
}
/**
 * Arrow Up/Down in the HP field (VTL-234, GMG: arrow keys ±1): the typed number moves by
 * `step`, keeping its sign ("-5" → "-4" with Up); an empty field starts from the current HP.
 * Returns null when the text is not a single number (a chain stays as typed).
 */
export function stepHpInput(raw, step, current = 0) {
  const text = String(raw ?? "")
    .trim()
    .replace(/[−–]/g, "-");
  if (!text) return String(Math.max(0, (Number.isInteger(current) ? current : 0) + step));
  const match = /^([+\-=]?)(\d{1,6})$/.exec(text);
  if (!match) return null;
  const signed = (match[1] === "-" ? -1 : 1) * Number(match[2]) + step;
  // A relative value skips 0, which changes nothing: "-1" with Up becomes "+1".
  if (match[1] === "-" || match[1] === "+") {
    const next = signed === 0 ? step : signed;
    return (next < 0 ? "-" : "+") + Math.abs(next);
  }
  return match[1] + Math.max(0, signed);
}
export function hpSelection(parsed, actor, reason) {
  const base = { reason, source: copy(TOKEN_MENU_SOURCE) };
  if (parsed.op === "damage") return { kind: "damage", amount: parsed.amount, ...base };
  if (parsed.op === "heal") {
    if (Number.isInteger(actor?.hp) && actor.hp >= actor.maxHp)
      throw localized(
        "hp-full",
        `I PF sono già al massimo (${actor.maxHp}).`,
        `HP are already at maximum (${actor.maxHp}).`,
      );
    return { kind: "heal", amount: parsed.amount, ...base };
  }
  // A plain set is a data correction (COND-05). It never stands in for healing or a
  // resurrection: at 0 HP regaining any HP ends Unconscious (SRD 5.2.1 EN 17 / IT 19),
  // which only healing records; a dead creature is corrected in its conditions panel.
  if (actor?.dead === true)
    throw Object.assign(
      localized(
        "hp-dead",
        "La creatura è morta: i PF non si impostano da qui (non è una resurrezione). Per correggere un errore apri «Condizioni e stato».",
        "The creature is dead: HP are not set from here (it is not a resurrection). To correct a mistake open “Conditions and status”.",
      ),
      { fullPanel: true },
    );
  if (actor?.hp === 0 && parsed.amount > 0)
    throw Object.assign(
      localized(
        "hp-zero-set",
        `A 0 PF usa una cura (+${parsed.amount}): recuperare PF termina Privo di sensi. Per correggere un errore apri «Condizioni e stato».`,
        `At 0 HP use healing (+${parsed.amount}): regaining HP ends Unconscious. To correct a mistake open “Conditions and status”.`,
      ),
      { fullPanel: true },
    );
  if (Number.isInteger(actor?.maxHp) && parsed.amount > actor.maxHp)
    throw localized(
      "hp-over-max",
      `Il massimo è ${actor.maxHp}: scrivi un valore da 1 a ${actor.maxHp}.`,
      `The maximum is ${actor.maxHp}: type a value from 1 to ${actor.maxHp}.`,
    );
  if (parsed.amount === actor?.hp)
    throw localized("hp-same", `I PF sono già ${actor.hp}.`, `HP are already ${actor.hp}.`);
  // SRD 5.2.1 EN 17 / IT 19: dropping to 0 HP follows the 0-HP rules, so it is damage,
  // never a correction (the conditions domain refuses "zero-by-correction").
  if (parsed.amount === 0)
    throw localized(
      "hp-set-zero",
      `Per portare a 0 PF usa un danno (-${actor?.hp ?? "N"}): così valgono le regole dei 0 punti ferita.`,
      `To bring HP to 0 use damage (-${actor?.hp ?? "N"}): the 0 hit point rules then apply.`,
    );
  return { kind: "correct", patch: { hp: parsed.amount }, ...base };
}

// Conditions visible to this viewer: the same public projection the Table's status badge
// uses (private applications of someone else are left out).
export function visibleConditionIds(actor, viewer) {
  if (!actor) return [];
  const shown = {
    ...actor,
    conditions: (actor.conditions ?? []).filter(
      (c) => !(c && typeof c === "object" && c.visibility === "private" && c.owner !== viewer),
    ),
  };
  const direct = new Set(shown.conditions.map((c) => (typeof c === "string" ? c : c?.id)));
  return getConditionMechanics(shown).conditionIds.filter(
    (id) => CONDITION.has(id) && (id !== "incapacitated" || direct.has("incapacitated")),
  );
}
/** Toggle palette for a controller: direct applications can be ended, implied ones not. */
export function conditionPalette(state, actorId, viewer) {
  const overview = getConditionOverview(state, actorId, viewer);
  const direct = new Map(overview.active.map((group) => [group.id, group]));
  const all = new Set(overview.mechanics.conditionIds);
  return {
    canControl: overview.permissions.canControl,
    exhaustion: overview.exhaustion,
    rows: CONDITIONS.filter((row) => row.id !== "exhaustion").map((row) => {
      const group = direct.get(row.id);
      const endable = overview.instances.filter(
        (i) => i.id === row.id && i.permissions?.canEnd !== false,
      );
      return {
        id: row.id,
        name: row.name,
        active: all.has(row.id),
        direct: Boolean(group),
        implied: !group && all.has(row.id),
        count: group?.count ?? 0,
        instanceIds: endable.map((i) => i.instanceId),
      };
    }),
  };
}
export function conditionSelections(state, actorId, conditionId, viewer, reason) {
  const palette = conditionPalette(state, actorId, viewer);
  const row = palette.rows.find((r) => r.id === conditionId);
  if (!row) throw localized("condition", "Condizione sconosciuta.", "Unknown condition.");
  if (row.direct) {
    if (!row.instanceIds.length)
      throw localized(
        "condition-end",
        "Questa condizione ha un’origine che non puoi terminare da qui.",
        "This condition has an origin you cannot end from here.",
      );
    return row.instanceIds.map((instanceId) => ({ kind: "end", instanceId, reason }));
  }
  return [
    {
      kind: "apply",
      conditionId,
      source: copy(CONDITION.get(conditionId).source),
      mode: "record",
      term: { kind: "manual" },
      visibility: "shared",
      sourceVisibility: "shared",
    },
  ];
}

// ---------------------------------------------------------------- per-viewer session

const session = {
  menu: null,
  picked: new Set(),
  clipboard: null,
  lastPoint: null,
  box: null,
  press: null,
  ping: null,
  pendingFocus: null,
  table: null,
  ctx: null,
  registry: null,
  toolDown: null,
  guardUntil: 0,
  guardAt: null,
  focusMap: false,
  pendingBox: null,
  lastDone: null,
  // The label of what the current menu command committed (see `done`).
  committed: null,
  // P6: the box filter (TV-15), the bestiary search (TV-21), a group being dragged (TV-20).
  boxFilter: "all",
  drawerQuery: "",
  groupDrag: null,
};
/** Clears the local selection, clipboard and menu (role change, reset, tests). */
export function resetTokenMenu() {
  closeMenu(false);
  session.picked = new Set();
  session.clipboard = null;
  session.lastPoint = null;
  session.box = null;
  session.ping = null;
  session.pendingFocus = null;
  session.toolDown = null;
  session.pendingBox = null;
  session.lastDone = null;
  session.committed = null;
  session.boxFilter = "all";
  session.drawerQuery = "";
  session.groupDrag = null;
  // The next render binds the Table again.
  session.table = null;
  clearPress();
}
export const pickedActors = () => [...session.picked];
export const clipboardSize = () => session.clipboard?.items.length ?? 0;

const messageOf = (ctx, error) =>
  error?.it && error?.en
    ? ctx.lang === "en"
      ? error.en
      : error.it
    : (ERRORS[error?.message]?.(ctx) ?? error?.message ?? String(error));
const ERRORS = {
  unauthorized: (ctx) => ctx.t("Solo il DM può farlo.", "Only the DM can do this."),
  conflict: (ctx) =>
    ctx.t("Identificativo già usato: riprova.", "Identifier already used: try again."),
  "actor-missing": (ctx) => ctx.t("Creatura non disponibile.", "Creature not available."),
  "already-placed": (ctx) =>
    ctx.t("La pedina è già sulla scena.", "The token is already on the scene."),
  invalid: (ctx) => ctx.t("Dati non validi.", "Invalid data."),
  missing: (ctx) => ctx.t("Scena o pedina non trovata.", "Scene or token not found."),
};
const shortcutText = (ctx, key) => {
  const mac = /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? "");
  return key
    .replace("Mod", mac ? "Cmd" : "Ctrl")
    .replace("Shift", ctx.lang === "en" ? "Shift" : "Maiusc")
    .replace("Enter", ctx.lang === "en" ? "Enter" : "Invio")
    .replace("Delete", ctx.lang === "en" ? "Del" : "Canc");
};
const cssId = (id) =>
  String(id).replace(/[^A-Za-z0-9_-]/g, (c) => "\\" + c.charCodeAt(0).toString(16) + " ");

// Targets of a menu command: the whole multi-selection when the token belongs to it.
function targetTokens(state, target) {
  const scene = sceneById(state, target.sceneId) ?? activeScene(state);
  const actorIds =
    session.picked.size > 1 && session.picked.has(target.actorId)
      ? [...session.picked]
      : [target.actorId];
  return actorIds.map((id) => tokenOfActor(scene, id)).filter(Boolean);
}
const targetNames = (ctx, tokens) =>
  tokens.map((token) => ctx.state.actors[token.actorId]?.name ?? "").join(", ");
function controls(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  return Boolean(actor && ctx.canControl(actor));
}
const visibleHere = (ctx, target) => {
  const token = tokenOfActor(sceneById(ctx.state, target.sceneId), target.actorId);
  return Boolean(token && observesToken(ctx.state, token, ctx.role));
};

// ---------------------------------------------------------------- commits

// One shared commit; `quiet` labels (a hidden token, a hidden name, the audience of a
// token, a DM-only group) stay in the DM's log, everything players can see is logged for all.
function commitChange(ctx, label, mutator, { quiet = false, options = {} } = {}) {
  const result = ctx.commit(
    label,
    mutator,
    quiet ? { ...options, visibility: "private" } : options,
  );
  session.committed = label;
  return result;
}
/** A change on these creatures names something players must not learn: log it quietly. */
function secretFor(state, actorIds) {
  const slice = sliceOf(state);
  return actorIds.some((id) => isHiddenActor(state, id) || Boolean(hiddenName(state, slice, id)));
}
// Every menu command starts here: the menu's Undo is offered only for what this command
// itself committed, never for an earlier change (a pick or a copy commits nothing).
function beginCommand() {
  session.committed = null;
}
/**
 * The menu's result line. Its Undo reverts exactly this command's commit: `undo` holds the
 * commit label, and the button shows only while that is still the change Undo would revert.
 */
function done(ctx, text) {
  session.lastDone = text;
  const undo = session.committed;
  session.committed = null;
  if (session.menu) session.menu.status = { text, error: false, undo };
}
function failed(ctx, error) {
  const text = messageOf(ctx, error);
  if (session.menu) {
    session.menu.status = { text, error: true, undo: null };
    renderMenu(ctx);
  } else ctx.toast?.(text, true);
}
function attempt(ctx, fn) {
  beginCommand();
  try {
    fn();
    return true;
  } catch (error) {
    failed(ctx, error);
    return false;
  }
}

const isHiddenActor = (state, actorId) =>
  tokenOfActor(activeScene(state), actorId)?.hidden === true;
/**
 * Commits one change per visibility class: creatures hidden from the players go in a
 * DM-only record, the others in the shared one (one record, one Undo, when they agree).
 * `optionsOf(actorId)` is the domain preview's commit options (a personal creature's
 * change stays local and private).
 */
function commitByVisibility(ctx, actorIds, labelFor, apply, optionsOf) {
  const classes = new Map();
  for (const id of actorIds) {
    const options = optionsOf(id) ?? {};
    const quiet = isHiddenActor(ctx.state, id);
    const key = JSON.stringify([quiet, options]);
    if (!classes.has(key)) classes.set(key, { quiet, options, ids: [] });
    classes.get(key).ids.push(id);
  }
  for (const { quiet, options, ids } of classes.values())
    commitChange(ctx, labelFor(ids), (draft) => ids.forEach((id) => apply(draft, id)), {
      quiet,
      options,
    });
}

/**
 * The HP field (VTL-234): one typed value for the token, or for every selected token the
 * viewer controls (Foundry "apply to selected"). Creatures it cannot apply to are left out
 * and named; when none can, the first reason is thrown and nothing changes.
 */
export function applyHpMany(ctx, actorIds, raw) {
  // The format is checked once; each creature then reads the value against its own HP
  // ("18-5" is damage for the creature at 18 HP).
  const first = parseHpInput(raw, ctx.state.actors[actorIds[0]]?.hp);
  const reason = ctx.t("Campo PF del menu della pedina", "Token menu HP field") + ": " + first.text;
  const plans = [];
  const skipped = [];
  for (const actorId of actorIds) {
    const actor = ctx.state.actors[actorId];
    try {
      const parsed = parseHpInput(raw, actor?.hp);
      const selection = hpSelection(parsed, actor, reason);
      const preview = previewVitalityChange(ctx.state, actorId, selection, ctx.role);
      if (!preview.canApply)
        throw preview.errors[0] ?? localized("hp", "Non applicabile.", "Not applicable.");
      if (!preview.rows?.length)
        throw localized("hp-unchanged", "Nessun cambiamento dei PF.", "No change to HP.");
      plans.push({ actorId, parsed, selection, before: actor.hp, commit: preview.commit });
    } catch (error) {
      if (actorIds.length === 1) throw error;
      skipped.push({ actorId, name: actor?.name ?? actorId, error });
    }
  }
  if (!plans.length) throw skipped[0].error;
  const whatOf = ({ op, amount }) =>
    op === "damage"
      ? ctx.t("danno ", "damage ") + amount
      : op === "heal"
        ? ctx.t("cura ", "healing ") + amount
        : ctx.t("PF impostati a ", "HP set to ") + amount;
  const suffix = ctx.t(" (menu della pedina)", " (token menu)");
  const byId = new Map(plans.map((plan) => [plan.actorId, plan]));
  commitByVisibility(
    ctx,
    plans.map((plan) => plan.actorId),
    (ids) => {
      const whats = ids.map((id) => whatOf(byId.get(id).parsed));
      if (ids.length === 1) return ctx.state.actors[ids[0]].name + ": " + whats[0] + suffix;
      if (new Set(whats).size === 1)
        return (
          whats[0][0].toUpperCase() + whats[0].slice(1) + suffix + ": " + targetNamesOf(ctx, ids)
        );
      return ids.map((id, i) => ctx.state.actors[id].name + ": " + whats[i]).join(", ") + suffix;
    },
    (draft, actorId) => {
      const { selection } = byId.get(actorId);
      const p = previewVitalityChange(draft, actorId, selection, ctx.role);
      if (!p.canApply) throw p.errors[0];
      const result = applyVitalityChange(draft, actorId, selection, ctx.role, {
        operationId: uid(),
        reviewKey: p.reviewKey,
        online: !ctx.offline,
      });
      ctx.applyConditionFollowUps?.(draft, result);
    },
    (actorId) => byId.get(actorId).commit,
  );
  return {
    op: plans[0].parsed.op,
    changes: plans.map((plan) => ({
      actorId: plan.actorId,
      name: ctx.state.actors[plan.actorId]?.name,
      before: plan.before,
      after: ctx.state.actors[plan.actorId]?.hp,
    })),
    skipped: skipped.map(({ actorId, name, error }) => ({
      actorId,
      name,
      reason: messageOf(ctx, error),
    })),
  };
}
export function applyHp(ctx, actorId, raw) {
  const { op, changes } = applyHpMany(ctx, [actorId], raw);
  return { before: changes[0].before, after: changes[0].after, op };
}
const targetNamesOf = (ctx, actorIds) =>
  actorIds.map((id) => ctx.state.actors[id]?.name ?? "").join(", ");

/**
 * Toggles a condition from the menu for the token, or for every selected token the viewer
 * controls. As in Foundry's status palette, the clicked token decides: applied there →
 * ended on all that have it; otherwise applied to all that lack it.
 */
export function toggleConditionMany(ctx, actorIds, conditionId, primaryId = actorIds[0]) {
  const reason = ctx.t("Dal menu della pedina", "From the token menu");
  const first = conditionSelections(ctx.state, primaryId, conditionId, ctx.role, reason);
  const ending = first[0].kind === "end";
  const name = ctx.label(CONDITION.get(conditionId).name);
  const plans = [];
  const skipped = [];
  for (const actorId of actorIds) {
    try {
      const palette = conditionPalette(ctx.state, actorId, ctx.role);
      const row = palette.rows.find((r) => r.id === conditionId);
      // Nothing to do on this one: it already has it (applying) or lacks it (ending).
      if (!row || row.direct !== ending) continue;
      const selections = conditionSelections(ctx.state, actorId, conditionId, ctx.role, reason);
      const probe = previewConditionChange(ctx.state, actorId, selections[0], ctx.role);
      if (!probe.canApply) throw probe.errors[0];
      plans.push({ actorId, commit: probe.commit });
    } catch (error) {
      if (actorId === primaryId) throw error;
      skipped.push({ actorId, name: ctx.state.actors[actorId]?.name, error });
    }
  }
  if (!plans.length)
    throw (
      skipped[0]?.error ??
      localized("condition-none", "Nessuna pedina da cambiare.", "No token to change.")
    );
  const verb = ending
    ? ctx.t("condizione terminata ", "condition ended ")
    : ctx.t("condizione ", "condition ");
  commitByVisibility(
    ctx,
    plans.map((plan) => plan.actorId),
    (ids) =>
      ids.length === 1
        ? ctx.state.actors[ids[0]].name + ": " + verb + name
        : verb[0].toUpperCase() + verb.slice(1) + name + ": " + targetNamesOf(ctx, ids),
    (draft, actorId) => {
      for (const selection of conditionSelections(draft, actorId, conditionId, ctx.role, reason)) {
        const p = previewConditionChange(draft, actorId, selection, ctx.role);
        if (!p.canApply) throw p.errors[0];
        const result = applyConditionChange(draft, actorId, selection, ctx.role, {
          operationId: uid(),
          reviewKey: p.reviewKey,
          online: !ctx.offline,
        });
        ctx.applyConditionFollowUps?.(draft, result);
      }
    },
    (actorId) => plans.find((plan) => plan.actorId === actorId).commit,
  );
  return {
    applied: !ending,
    actorIds: plans.map((plan) => plan.actorId),
    skipped: skipped.map(({ actorId, name, error }) => ({
      actorId,
      name,
      reason: messageOf(ctx, error),
    })),
  };
}
export function toggleCondition(ctx, actorId, conditionId) {
  return toggleConditionMany(ctx, [actorId], conditionId, actorId).applied;
}

function sliceCommit(ctx, label, mutate, quiet = false) {
  return commitChange(ctx, label, (draft) => mutate(draft, draft.ext[ID]), { quiet });
}

// ---------------------------------------------------------------- centring and focus

function centerOn(ctx, actorId, { focus = true } = {}) {
  const state = ctx.state;
  const scene = activeScene(state);
  const token = tokenOfActor(scene, actorId);
  const slice = sliceOf(state);
  if (
    !token ||
    !(observesToken(state, token, ctx.role) || seesAsAudience(state, slice, token, ctx.role))
  )
    throw localized("center", "Questa pedina non è sulla mappa.", "This token is not on the map.");
  session.ping = { actorId, at: Date.now() };
  session.pendingFocus = focus ? actorId : null;
  if (observesToken(state, token, ctx.role)) setSelectedActor(actorId);
  // The Table's view API (table.view / table.setView): keep a closer zoom, centre the token.
  const table = session.table;
  if (typeof table?.setView === "function") {
    const zoom = Math.min(3, Math.max(table.view?.zoom ?? 1, 1.5));
    table.setView({
      zoom,
      pan: { x: token.x - scene.width / zoom / 2, y: token.y - scene.height / zoom / 2 },
    });
  } else ctx.render();
}

// ---------------------------------------------------------------- menu items

const SHORTCUTS = {
  "token-menu-pick": "Shift+Enter",
  "token-menu-hide": "Shift+H",
  "token-menu-lock": "Shift+L",
  "token-menu-group": "Shift+G",
  "token-menu-copy": "Mod+C",
  "token-menu-paste": "Mod+V",
  "token-menu-remove": "Delete",
};
const SUBMENUS = {
  "token-menu-conditions": "conditions",
  "token-menu-ring": "ring",
  "token-menu-size": "size",
  "token-menu-rotate": "rotate",
};
// Commands that act on the whole multi-selection (marked "×N" in the menu); the others
// act on the token that was right-clicked (R20-129: the menu applies to the selection).
const SELECTION_ITEMS = new Set([
  "token-menu-conditions",
  "token-menu-hide",
  "token-menu-audience",
  "token-menu-ring",
  "token-menu-size",
  "token-menu-rotate",
  "token-menu-lock",
  "token-menu-group",
  "token-menu-copy",
  "token-menu-remove",
]);
const multiCount = (target) =>
  session.picked.size > 1 && session.picked.has(target.actorId) ? session.picked.size : 0;

function itemDefinitions() {
  const tokenOf = (ctx, target) =>
    tokenOfActor(sceneById(ctx.state, target.sceneId), target.actorId);
  return [
    {
      id: "token-menu-conditions",
      label: L("Condizioni", "Conditions"),
      icon: "conditions",
      order: 10,
      group: "token-menu.creature",
      when: (ctx, target) => visibleHere(ctx, target) && controls(ctx, target.actorId),
      run: (ctx) => openView(ctx, "conditions"),
    },
    {
      id: "token-menu-sheet",
      label: L("Apri la scheda", "Open sheet"),
      icon: "sheet",
      order: 20,
      group: "token-menu.creature",
      when: (ctx, target) => visibleHere(ctx, target) && controls(ctx, target.actorId),
      run: (ctx, target) => {
        closeMenu(false);
        ctx.openSheet(target.actorId, "actions");
      },
    },
    {
      id: "token-menu-center",
      label: L("Centra sulla mappa", "Centre on the map"),
      icon: "center",
      order: 30,
      group: "token-menu.creature",
      run: (ctx, target) => {
        closeMenu(false);
        centerOn(ctx, target.actorId);
      },
    },
    {
      id: "token-menu-pick",
      label: L("Aggiungi alla selezione", "Add to selection"),
      dynamic: (ctx, target) =>
        session.picked.has(target.actorId)
          ? ctx.t("Togli dalla selezione", "Remove from selection")
          : ctx.t("Aggiungi alla selezione", "Add to selection"),
      icon: "pick",
      order: 40,
      group: "token-menu.creature",
      when: (ctx, target) => visibleHere(ctx, target),
      run: (ctx, target) => {
        togglePick(ctx, target.actorId);
        done(ctx, ctx.t("Selezionate: ", "Selected: ") + (session.picked.size || 0));
        ctx.render();
      },
    },
    {
      id: "token-menu-hide",
      label: L("Nascondi ai giocatori", "Hide from players"),
      dynamic: (ctx, target) =>
        tokenOf(ctx, target)?.hidden
          ? ctx.t("Rivela ai giocatori", "Reveal to players")
          : ctx.t("Nascondi ai giocatori", "Hide from players"),
      iconFor: (ctx, target) => (tokenOf(ctx, target)?.hidden ? "reveal" : "hide"),
      order: 50,
      group: "token-menu.visibility",
      submenu: "visibility",
      roles: ["dm"],
      when: (ctx, target) => Boolean(tokenOf(ctx, target)),
      run: (ctx, target) => runHide(ctx, target),
    },
    {
      id: "token-menu-audience",
      label: L("Visibile solo a…", "Visible only to…"),
      icon: "audience",
      order: 55,
      group: "token-menu.visibility",
      submenu: "visibility",
      roles: ["dm"],
      when: (ctx, target) => Boolean(tokenOf(ctx, target)),
      run: (ctx, target) => openAudienceDialog(ctx, target),
    },
    {
      id: "token-menu-rename",
      label: L("Rinomina…", "Rename…"),
      icon: "rename",
      order: 60,
      group: "token-menu.visibility",
      submenu: "visibility",
      roles: ["dm"],
      when: (ctx, target) => ctx.state.actors[target.actorId]?.kind === "npc",
      run: (ctx, target) => openRenameDialog(ctx, target),
    },
    {
      id: "token-menu-hide-name",
      label: L("Nascondi il nome", "Hide the name"),
      dynamic: (ctx, target) =>
        hiddenName(ctx.state, sliceOf(ctx.state), target.actorId)
          ? ctx.t("Mostra il nome ai giocatori", "Show the name to players")
          : ctx.t("Nascondi il nome ai giocatori", "Hide the name from players"),
      icon: "name",
      order: 62,
      group: "token-menu.visibility",
      submenu: "visibility",
      roles: ["dm"],
      when: (ctx, target) => ctx.state.actors[target.actorId]?.kind === "npc",
      run: (ctx, target) => runHideName(ctx, target),
    },
    {
      id: "token-menu-ring",
      label: L("Colore del bordo", "Border colour"),
      icon: "ring",
      order: 70,
      group: "token-menu.look",
      submenu: "look",
      when: (ctx, target) => visibleHere(ctx, target) && controls(ctx, target.actorId),
      run: (ctx) => openView(ctx, "ring"),
    },
    {
      id: "token-menu-size",
      label: L("Dimensione della pedina", "Token size"),
      icon: "size",
      order: 75,
      group: "token-menu.look",
      submenu: "look",
      when: (ctx, target) => visibleHere(ctx, target) && controls(ctx, target.actorId),
      run: (ctx) => openView(ctx, "size"),
    },
    {
      id: "token-menu-rotate",
      label: L("Ruota la pedina", "Rotate token"),
      icon: "rotate",
      order: 77,
      group: "token-menu.look",
      submenu: "look",
      when: (ctx, target) => visibleHere(ctx, target) && controls(ctx, target.actorId),
      run: (ctx) => openView(ctx, "rotate"),
    },
    {
      id: "token-menu-lock",
      label: L("Blocca la posizione", "Lock position"),
      dynamic: (ctx, target) =>
        isLocked(sliceOf(ctx.state), tokenOf(ctx, target)?.id)
          ? ctx.t("Sblocca la posizione", "Unlock position")
          : ctx.t("Blocca la posizione", "Lock position"),
      iconFor: (ctx, target) =>
        isLocked(sliceOf(ctx.state), tokenOf(ctx, target)?.id) ? "unlock" : "lock",
      order: 80,
      group: "token-menu.arrange",
      submenu: "dm",
      roles: ["dm"],
      when: (ctx, target) => Boolean(tokenOf(ctx, target)),
      run: (ctx, target) => runLock(ctx, target),
    },
    {
      id: "token-menu-group",
      label: L("Raggruppa la selezione", "Group the selection"),
      dynamic: (ctx, target) =>
        groupOf(sliceOf(ctx.state), tokenOf(ctx, target)?.id) &&
        !(session.picked.size > 1 && session.picked.has(target.actorId) && !sameGroup(ctx))
          ? ctx.t("Separa il gruppo", "Ungroup")
          : ctx.t("Raggruppa la selezione", "Group the selection"),
      icon: "group",
      order: 85,
      group: "token-menu.arrange",
      submenu: "dm",
      // R3 CA-61: the DM (or the session runner); players with the campaign permission,
      // for the tokens they control.
      when: (ctx, target) =>
        (runsSession(ctx.state, ctx.role) ||
          (playersMayGroup(ctx.state) && controls(ctx, target.actorId))) &&
        (Boolean(groupOf(sliceOf(ctx.state), tokenOf(ctx, target)?.id)) ||
          (session.picked.size > 1 && session.picked.has(target.actorId))),
      run: (ctx, target) => runGroup(ctx, target),
    },
    {
      id: "token-menu-group-movers",
      label: L("Chi può muovere il gruppo…", "Who can move the group…"),
      icon: "group",
      order: 86,
      group: "token-menu.arrange",
      submenu: "dm",
      when: (ctx, target) =>
        runsSession(ctx.state, ctx.role) &&
        Boolean(groupOf(sliceOf(ctx.state), tokenOf(ctx, target)?.id)),
      run: (ctx, target) => openGroupMovers(ctx, target),
    },
    // R3 PG-79 (dnd5e Transform, BG3 Polymorph): the DM on any creature, a player on those
    // she controls. A transformed token reverts from «Torna alla forma originale».
    {
      id: "token-menu-transform",
      label: L("Trasforma…", "Transform…"),
      icon: "transform",
      order: 45,
      group: "token-menu.creature",
      submenu: "actions",
      when: (ctx, target) => {
        const actor = ctx.state.actors[target.actorId];
        return Boolean(
          actor &&
          tokenOf(ctx, target) &&
          !actor.activeForm &&
          !actor.dead &&
          (runsSession(ctx.state, ctx.role) || controls(ctx, target.actorId)),
        );
      },
      run: (ctx, target) => openTransform(ctx, { actorId: target.actorId, preset: "polymorph" }),
    },
    {
      id: "token-menu-copy",
      label: L("Copia", "Copy"),
      icon: "copy",
      order: 90,
      group: "token-menu.arrange",
      submenu: "dm",
      roles: ["dm"],
      when: (ctx, target) => copyableActor(ctx.state.actors[target.actorId]),
      run: (ctx, target) => runCopy(ctx, target),
    },
    {
      id: "token-menu-paste",
      label: L("Incolla qui", "Paste here"),
      dynamic: (ctx) => ctx.t("Incolla qui", "Paste here") + " (" + clipboardSize() + ")",
      icon: "paste",
      order: 95,
      group: "token-menu.arrange",
      submenu: "dm",
      roles: ["dm"],
      when: () => clipboardSize() > 0,
      run: (ctx, target) => runPaste(ctx, pastePoint(ctx, target)),
    },
    {
      id: "token-menu-remove",
      label: L("Togli dalla scena", "Remove from the scene"),
      icon: "remove",
      order: 99,
      group: "token-menu.arrange",
      submenu: "dm",
      roles: ["dm"],
      when: (ctx, target) => Boolean(tokenOf(ctx, target)),
      run: (ctx, target) => runRemove(ctx, target),
    },
  ];
}
const OWN_ITEMS = new Map();
function sessionGated(def) {
  if (!(Array.isArray(def.roles) && def.roles.length === 1 && def.roles[0] === "dm")) return def;
  const { roles: _roles, when, ...rest } = def;
  return {
    ...rest,
    when: (ctx, ...args) => runsSession(ctx.state, ctx.role) && (when ? when(ctx, ...args) : true),
  };
}
function sameGroup(ctx) {
  const slice = sliceOf(ctx.state);
  const scene = activeScene(ctx.state);
  const groups = new Set(
    [...session.picked].map((id) => groupOf(slice, tokenOfActor(scene, id)?.id)),
  );
  return groups.size === 1 && !groups.has(null);
}

function runHide(ctx, target) {
  const tokens = targetTokens(ctx.state, target);
  const hide = !tokenOfActor(sceneById(ctx.state, target.sceneId), target.actorId)?.hidden;
  const names = targetNames(ctx, tokens);
  sliceCommit(
    ctx,
    (hide
      ? ctx.t("Nascosta ai giocatori: ", "Hidden from players: ")
      : ctx.t("Rivelata ai giocatori: ", "Revealed to players: ")) + names,
    (draft, slice) =>
      setVisibility(
        draft,
        slice,
        tokens.map((t) => t.id),
        hide ? "dm" : "all",
        [],
        ctx.role,
      ),
    hide,
  );
  done(
    ctx,
    hide ? ctx.t("Nascosta: ", "Hidden: ") + names : ctx.t("Rivelata: ", "Revealed: ") + names,
  );
}
function runLock(ctx, target) {
  const tokens = targetTokens(ctx.state, target);
  const lock = !isLocked(
    sliceOf(ctx.state),
    tokenOfActor(sceneById(ctx.state, target.sceneId), target.actorId)?.id,
  );
  const names = targetNames(ctx, tokens);
  sliceCommit(
    ctx,
    (lock
      ? ctx.t("Posizione bloccata: ", "Position locked: ")
      : ctx.t("Posizione sbloccata: ", "Position unlocked: ")) + names,
    (draft, slice) =>
      setLocked(
        slice,
        tokens.map((t) => t.id),
        lock,
        ctx.role,
        draft,
      ),
    // The token's controller sees the lock, so the log shows it too (unless it is secret).
    secretFor(
      ctx.state,
      tokens.map((t) => t.actorId),
    ),
  );
  done(ctx, (lock ? ctx.t("Bloccata: ", "Locked: ") : ctx.t("Sbloccata: ", "Unlocked: ")) + names);
}
function runGroup(ctx, target) {
  const slice = sliceOf(ctx.state);
  const scene = sceneById(ctx.state, target.sceneId) ?? activeScene(ctx.state);
  const token = tokenOfActor(scene, target.actorId);
  const multi = session.picked.size > 1 && session.picked.has(target.actorId);
  const ungroup = groupOf(slice, token?.id) && !(multi && !sameGroup(ctx));
  const tokens = targetTokens(ctx.state, target);
  const names = targetNames(ctx, tokens);
  // A DM's group is the DM's arrangement (players never see it): its record stays quiet. A
  // player's own group (C2 permission) is logged for everyone.
  const quiet = runsSession(ctx.state, ctx.role);
  if (ungroup) {
    sliceCommit(
      ctx,
      ctx.t("Gruppo separato: ", "Ungrouped: ") + names,
      (draft, s) => ungroupTokens(s, [token.id], ctx.role, { state: draft }),
      quiet,
    );
    done(ctx, ctx.t("Gruppo separato.", "Ungrouped."));
  } else {
    sliceCommit(
      ctx,
      ctx.t("Pedine raggruppate: ", "Tokens grouped: ") + names,
      (draft, s) =>
        groupTokens(
          s,
          scene.id,
          tokens.map((t) => t.id),
          ctx.role,
          uid(),
          { state: draft },
        ),
      quiet,
    );
    done(ctx, ctx.t("Raggruppate: ", "Grouped: ") + names);
  }
}
// R3 CA-61: «Chi può muovere il gruppo…» (Foundry ownership on several tokens, Owlbear
// per-item permissions): a checklist of the group's members.
function openGroupMovers(ctx, target) {
  const scene = sceneById(ctx.state, target.sceneId) ?? activeScene(ctx.state);
  const slice = sliceOf(ctx.state);
  const groupId = groupOf(slice, tokenOfActor(scene, target.actorId)?.id);
  const group = slice.groups?.[groupId];
  if (!group) return;
  const mode = !Array.isArray(group.movers) ? "any" : group.movers.length ? "listed" : "dm";
  const members = group.tokenIds
    .map((id) => scene.tokens.find((t) => t.id === id))
    .filter(Boolean)
    .map((t) => ({ id: t.id, name: ctx.state.actors[t.actorId]?.name ?? "" }));
  const radio = (value, it, en, hint) =>
    `<label class="token-menu-radio"><input type="radio" name="mode" value="${value}"${mode === value ? " checked" : ""}> <span><strong>${ctx.t(it, en)}</strong><small class="muted">${hint}</small></span></label>`;
  ctx.dialog(
    ctx.t("Chi può muovere il gruppo", "Who can move the group"),
    `<fieldset class="token-menu-movers"><legend>${ctx.t("Il gruppo si muove insieme quando lo trascina…", "The group moves together when dragged by…")}</legend>${radio("any", "Chi controlla una pedina del gruppo", "Whoever controls a token of the group", ctx.t("Come prima: ognuno trascina le proprie pedine e le altre seguono.", "As before: each drags their own tokens and the others follow."))}${radio("dm", "Solo il DM", "Only the DM", ctx.t("I giocatori non spostano queste pedine finché il gruppo resta.", "Players do not move these tokens while the group stands."))}${radio("listed", "Il DM e chi controlla:", "The DM and whoever controls:", ctx.t("Chi è spuntato muove tutto il gruppo, anche le pedine che non controlla.", "Those ticked move the whole group, tokens they do not control included."))}<div class="token-menu-mover-list">${members
      .map(
        (m) =>
          `<label class="prep-check"><input type="checkbox" name="movers" value="${ctx.esc(m.id)}"${group.movers?.includes(m.id) ? " checked" : ""}> ${ctx.esc(m.name)}</label>`,
      )
      .join("")}</div></fieldset>`,
    {
      submitLabel: ctx.t("Salva", "Save"),
      onSubmit: (data) => {
        const choice = data.get("mode");
        const movers =
          choice === "any" ? null : choice === "dm" ? [] : data.getAll("movers").map(String);
        if (choice === "listed" && !movers.length) {
          ctx.toast(
            ctx.t(
              "Spunta almeno una pedina, oppure scegli «Solo il DM».",
              "Tick at least one token, or choose “Only the DM”.",
            ),
            true,
          );
          return false;
        }
        commitChange(
          ctx,
          ctx.t("Chi muove il gruppo", "Who moves the group"),
          (draft) => setGroupMovers(draft, draft.ext[ID], groupId, movers, ctx.role),
          { quiet: true },
        );
        done(ctx, ctx.t("Permessi del gruppo salvati.", "Group permissions saved."));
      },
    },
  );
}
function runCopy(ctx, target) {
  const tokens = targetTokens(ctx.state, target);
  const clip = copyTokens(
    ctx.state,
    sliceOf(ctx.state),
    tokens.map((t) => t.id),
    ctx.role,
  );
  session.clipboard = clip;
  done(
    ctx,
    ctx.t("Copiate: ", "Copied: ") +
      clip.items.length +
      (clip.skipped.length
        ? " · " +
          ctx.t("escluse (personaggi): ", "left out (characters): ") +
          clip.skipped.join(", ")
        : ""),
  );
  renderMenu(ctx);
  refreshPanel(ctx);
}
function pastePoint(ctx, target) {
  if (session.menu?.point) return session.menu.point;
  const token = target ? tokenOfActor(activeScene(ctx.state), target.actorId) : null;
  const size = activeScene(ctx.state)?.gridSize ?? 50;
  if (token) return { x: token.x + size, y: token.y };
  return session.lastPoint;
}
function runPaste(ctx, point) {
  const clip = session.clipboard;
  let created = [];
  commitChange(
    ctx,
    ctx.t("Copie incollate: ", "Copies pasted: ") + clip.items.map((item) => item.name).join(", "),
    (draft) => {
      created = pasteTokens(draft, draft.ext[ID], clip, point, ctx.role, { lang: ctx.lang });
    },
    // The label names the copies' real names: quiet when one is hidden or has a hidden name.
    { quiet: clip.items.some((item) => item.hidden || item.nameHidden) },
  );
  session.picked = new Set(created);
  const names = created.map((id) => ctx.state.actors[id]?.name).join(", ");
  const text = ctx.t("Incollate: ", "Pasted: ") + names;
  done(ctx, text);
  if (session.menu?.kind === "token") {
    session.menu.actorId = created[0] ?? session.menu.actorId;
    session.menu.point = null;
  }
  ctx.render();
  // Visible feedback on the map too (the scene menu and Ctrl+V have no token header).
  session.table?.message?.(text + ctx.t(" · Ctrl+Z annulla", " · Ctrl+Z undoes"));
  return created;
}
function runSceneCommand(ctx, command) {
  const menu = session.menu;
  const table = session.table;
  const scene = activeScene(ctx.state);
  if (!menu || !scene) return;
  const [name, value] = command.split(":");
  if (name === "door-use") {
    const doorId = menu.doorId;
    closeMenu(false);
    // The core's own door dialog (TV-04): reach, cost and the DM's corrections.
    openDoor(ctx, doorId, table?.selectedActorId ?? null);
    return;
  }
  if (name === "door-set" || name === "door-reveal") {
    requireDM(ctx.role, ctx.state);
    const patch = name === "door-reveal" ? { secret: false } : { doorState: value };
    commitChange(
      ctx,
      name === "door-reveal"
        ? ctx.t("Porta rivelata dal DM", "Door revealed by DM")
        : ctx.t("Porta corretta dal DM", "Door corrected by DM"),
      (draft) => correctDoor(draft, menu.doorId, patch, ctx.role),
    );
    done(ctx, ctx.t("Porta aggiornata.", "Door updated."));
    return;
  }
  if (name === "add-creature") {
    requireDM(ctx.role, ctx.state);
    menu.view = "cat:creatures";
    menu.query = "";
    menu.focusKey = "creature-search";
    return;
  }
  if (name === "paste") {
    runPaste(ctx, menu.point);
    return;
  }
  if (name === "select-all") {
    // Roll20 "select all" (R20-130): every token this viewer sees, local to the viewer.
    const ids = (scene.tokens ?? [])
      .filter((t) => observesToken(ctx.state, t, ctx.role))
      .map((t) => t.actorId);
    session.picked = new Set(ids);
    done(ctx, ctx.t("Selezionate: ", "Selected: ") + ids.length);
    ctx.render();
    return;
  }
  if (name === "clear") {
    session.picked = new Set();
    done(ctx, ctx.t("Selezione vuota.", "Selection cleared."));
    ctx.render();
    return;
  }
  if (name === "fit") {
    closeMenu(false);
    session.focusMap = true;
    if (table?.setView) table.setView({ zoom: 1, pan: { x: 0, y: 0 } });
    return;
  }
  if (name === "undo") {
    const label = ctx.undoLabel?.() ?? "";
    ctx.undo();
    if (session.menu)
      session.menu.status = {
        text: label
          ? ctx.t("Annullato: ", "Undone: ") + label
          : ctx.t("Modifica annullata.", "Change undone."),
        error: false,
        undo: null,
      };
  }
}
function runRemove(ctx, target) {
  const tokens = targetTokens(ctx.state, target);
  const names = targetNames(ctx, tokens);
  const quiet = tokens.some((t) => t.hidden);
  commitChange(
    ctx,
    ctx.t("Tolte dalla scena: ", "Removed from the scene: ") + names,
    (draft) =>
      removeTokens(
        draft,
        draft.ext[ID],
        tokens.map((t) => t.id),
        ctx.role,
      ),
    { quiet },
  );
  for (const token of tokens) session.picked.delete(token.actorId);
  const text =
    ctx.t("Tolte dalla scena: ", "Removed from the scene: ") +
    names +
    ctx.t(" · la scheda resta · Ctrl+Z annulla", " · the sheet stays · Ctrl+Z undoes");
  done(ctx, text);
  closeMenu(false);
  session.focusMap = true;
  ctx.render();
  session.table?.message?.(text);
}
function runHideName(ctx, target) {
  const hidden = Boolean(hiddenName(ctx.state, sliceOf(ctx.state), target.actorId));
  const before = trueNameOf(ctx.state, sliceOf(ctx.state), target.actorId);
  // Hiding: the label names the real name, so it stays in the DM's log. Showing it again is
  // logged for everyone, like a reveal (unless the token itself is hidden).
  sliceCommit(
    ctx,
    (hidden
      ? ctx.t("Nome mostrato: ", "Name shown: ")
      : ctx.t("Nome nascosto: ", "Name hidden: ")) + before,
    (draft, slice) => setNameHidden(draft, slice, target.actorId, !hidden, ctx.role, ctx.lang),
    !hidden || isHiddenActor(ctx.state, target.actorId),
  );
  done(
    ctx,
    hidden
      ? ctx.t("I giocatori vedono di nuovo «", "Players see “") + before + ctx.t("».", "” again.")
      : ctx.t("I giocatori vedono «", "Players see “") +
          aliasIn(aliasNumber(ctx.state.actors[target.actorId].name) ?? 1, ctx.lang) +
          ctx.t("»; tu continui a leggere «", "”; you keep reading “") +
          before +
          ctx.t("» accanto.", "” beside it."),
  );
}
function togglePick(ctx, actorId) {
  const state = ctx.state;
  const scene = activeScene(state);
  const slice = sliceOf(state);
  const token = tokenOfActor(scene, actorId);
  if (!token) return;
  const members = expandGroups(slice, [token.id]).map(
    (id) => scene.tokens.find((t) => t.id === id)?.actorId,
  );
  // Starting a multi-selection keeps the Table's current single selection.
  const current = session.table?.selectedActorId;
  if (!session.picked.size && current && current !== actorId) {
    const own = tokenOfActor(scene, current);
    if (own && observesToken(state, own, ctx.role))
      for (const id of expandGroups(slice, [own.id]))
        session.picked.add(scene.tokens.find((t) => t.id === id)?.actorId);
  }
  if (session.picked.has(actorId)) for (const id of members) session.picked.delete(id);
  else for (const id of members) if (id) session.picked.add(id);
}

// ---------------------------------------------------------------- dialogs

function openAudienceDialog(ctx, target) {
  closeMenu(false);
  const state = ctx.state;
  const scene = sceneById(state, target.sceneId) ?? activeScene(state);
  const tokens = targetTokens(state, target);
  const token = tokenOfActor(scene, target.actorId);
  const slice = sliceOf(state);
  const mode = visibilityMode(slice, token);
  const audience = new Set(audienceOf(slice, token.id));
  const party = partyCharacters(state);
  const esc = ctx.esc;
  const who = (id) =>
    mode === "all" || (mode === "some" && audience.has(id))
      ? ctx.t("la vede", "sees it")
      : ctx.t("non la vede", "does not see it");
  ctx.dialog(
    ctx.t("Chi vede ", "Who sees ") + targetNames(ctx, tokens),
    `<div class="token-menu-audience"><p class="muted">${ctx.t("Una pedina nascosta può restare visibile ad alcuni personaggi. Tu, come DM, la vedi sempre sbiadita.", "A hidden token can stay visible to some characters. As the DM you always see it faded.")}</p><fieldset><legend>${ctx.t("Visibilità", "Visibility")}</legend>${[
      ["all", ctx.t("Tutti i giocatori", "All players")],
      ["dm", ctx.t("Solo il DM (nascosta)", "DM only (hidden)")],
      ["some", ctx.t("Solo alcuni personaggi", "Only some characters")],
    ]
      .map(
        ([value, text]) =>
          `<label class="token-menu-choice"><input type="radio" name="mode" value="${value}" ${mode === value ? "checked" : ""}> ${text}</label>`,
      )
      .join(
        "",
      )}</fieldset><fieldset data-token-menu-audience-list aria-describedby="token-menu-audience-why"><legend>${ctx.t("Personaggi che la vedono", "Characters who see it")}</legend><p class="token-menu-help" id="token-menu-audience-why">${ctx.t("Si sceglie con «Solo alcuni personaggi»: scegli quell’opzione per spuntarli.", "Chosen with “Only some characters”: pick that option to tick them.")}</p>${party
      .map(
        (actor) =>
          `<label class="token-menu-choice"><input type="checkbox" name="audience" value="${esc(actor.id)}" ${audience.has(actor.id) ? "checked" : ""}> ${esc(actor.name)} <small class="muted" data-token-menu-who="${esc(actor.id)}">· ${who(actor.id)}</small></label>`,
      )
      .join(
        "",
      )}</fieldset><p class="muted">${ctx.t("Chi gioca un personaggio scelto vede la pedina e il suo nome; gli altri giocatori no, nemmeno nell’ordine dei turni.", "Whoever plays a chosen character sees the token and its name; other players do not, not even in the turn order.")}</p></div>`,
    {
      submitLabel: ctx.t("Applica", "Apply"),
      onSubmit: (data) => {
        const nextMode = data.get("mode");
        const chosen = data.getAll("audience");
        const names = targetNames(ctx, tokens);
        const label =
          nextMode === "all"
            ? ctx.t("Visibile a tutti: ", "Visible to everyone: ")
            : nextMode === "dm"
              ? ctx.t("Nascosta ai giocatori: ", "Hidden from players: ")
              : ctx.t("Visibile solo a ", "Visible only to ") +
                chosen.map((id) => state.actors[id]?.name).join(", ") +
                ": ";
        sliceCommit(
          ctx,
          label + names,
          (draft, slice) =>
            setVisibility(
              draft,
              slice,
              tokens.map((t) => t.id),
              nextMode,
              chosen,
              ctx.role,
            ),
          nextMode !== "all",
        );
        ctx.toast(label + names);
      },
    },
  );
  const form = globalThis.document?.querySelector("#dialog form");
  const sync = () => {
    const current = form?.querySelector("[name=mode]:checked")?.value;
    const list = form?.querySelector("[data-token-menu-audience-list]");
    if (!list) return;
    list.disabled = current !== "some";
    for (const box of list.querySelectorAll("[name=audience]")) {
      const sees = current === "all" || (current === "some" && box.checked);
      list.querySelector(`[data-token-menu-who="${cssId(box.value)}"]`).textContent =
        "· " + (sees ? ctx.t("la vede", "sees it") : ctx.t("non la vede", "does not see it"));
    }
  };
  form?.addEventListener("change", sync);
  sync();
  focusTokenAfterDialog(target.actorId);
}

function openRenameDialog(ctx, target) {
  closeMenu(false);
  const slice = sliceOf(ctx.state);
  const current = trueNameOf(ctx.state, slice, target.actorId);
  const record = slice.names?.[target.actorId] ?? {};
  const nameHidden = Boolean(hiddenName(ctx.state, slice, target.actorId));
  ctx.dialog(
    ctx.t("Rinomina ", "Rename ") + current,
    `<label class="field">${ctx.t("Nome", "Name")}<input name="name" maxlength="128" required autofocus value="${ctx.esc(current)}" autocomplete="off"></label><p class="muted" data-token-menu-raw>${ctx.t("Fino a 128 caratteri. Cambia il nome della creatura ovunque: pedina, ordine dei turni, scheda.", "Up to 128 characters. It changes the creature’s name everywhere: token, turn order, sheet.")}${nameHidden ? " " + ctx.t("Il nome è nascosto: i giocatori continuano a vedere «", "The name is hidden: players keep seeing “") + ctx.esc(aliasIn(aliasNumber(ctx.state.actors[target.actorId].name) ?? 1, ctx.lang)) + ctx.t("».", "”.") : ""}</p>${record.original !== undefined ? `<p>${ctx.t("Nome originale", "Original name")}: <strong>${ctx.esc(record.original)}</strong> <button type="button" class="button quiet" data-token-menu-restore-name>${ctx.t("Ripristina il nome originale", "Restore the original name")}</button></p>` : ""}`,
    {
      submitLabel: ctx.t("Rinomina", "Rename"),
      onSubmit: (data) => {
        const next = String(data.get("name") ?? "");
        // A hidden token or a hidden name keeps the real names in the DM's log.
        sliceCommit(
          ctx,
          ctx.t("Rinominata: ", "Renamed: ") + current + " → " + next.trim(),
          (draft, s) => renameCreature(draft, s, target.actorId, next, ctx.role),
          secretFor(ctx.state, [target.actorId]),
        );
      },
    },
  );
  // The field, not the dialog's Close button, receives the focus (the name is selected).
  const field = globalThis.document?.querySelector("#dialog input[name=name]");
  field?.focus?.();
  field?.select?.();
  focusTokenAfterDialog(target.actorId);
  globalThis.document
    ?.querySelector("#dialog [data-token-menu-restore-name]")
    ?.addEventListener("click", () => {
      try {
        sliceCommit(
          ctx,
          ctx.t("Nome ripristinato: ", "Name restored: ") + record.original,
          (draft, s) => restoreName(draft, s, target.actorId, ctx.role),
          secretFor(ctx.state, [target.actorId]),
        );
        ctx.closeDialog();
      } catch (error) {
        const err = document.querySelector("#dialog .dialog-error");
        if (err) {
          err.textContent = messageOf(ctx, error);
          err.hidden = false;
        }
      }
    });
}

// ---------------------------------------------------------------- the menu popup

function popup() {
  if (typeof document === "undefined") return null;
  let el = document.querySelector("body > .token-menu");
  if (el) return el;
  el = document.createElement("div");
  el.className = "token-menu";
  el.hidden = true;
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "false");
  el.addEventListener("click", onMenuClick);
  el.addEventListener("keydown", onMenuKey);
  el.addEventListener("submit", onMenuSubmit);
  el.addEventListener("input", onMenuInput);
  // A press on the menu's text or padding keeps the focus where it is (menu pattern).
  el.addEventListener("mousedown", (event) => {
    if (!event.target.closest("button,input,select,textarea,a,[tabindex]")) event.preventDefault();
  });
  // Focus leaving the menu closes it (WAI-ARIA menu). A null target (focus lost to the
  // page) is checked once the current task ends: a re-render refocuses inside first.
  el.addEventListener("focusout", (event) => {
    const next = event.relatedTarget;
    if (!session.menu) return;
    if (next) {
      if (!el.contains(next) && !next.closest?.("#dialog")) closeMenu(false);
      return;
    }
    const menu = session.menu;
    setTimeout(() => {
      const now = document.activeElement;
      if (
        session.menu === menu &&
        !el.contains(now) &&
        !now?.closest?.("#dialog") &&
        !document.querySelector("#dialog")?.open &&
        document.hasFocus()
      )
        closeMenu(now === document.body || now === null);
    }, 0);
  });
  document.body.append(el);
  return el;
}
let globalsInstalled = false;
function installGlobals() {
  if (globalsInstalled || typeof document === "undefined") return;
  globalsInstalled = true;
  // Any press outside the menu closes it: the menu is hidden while a token is dragged.
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!session.menu) return;
      const el = popup();
      if (el?.contains(event.target)) return;
      if (Date.now() - session.menu.openedAt < 250 && event.pointerType === "touch") return;
      closeMenu(false);
    },
    true,
  );
  // Escape closes the menu even when the focus is outside it (a click on the page).
  document.addEventListener(
    "keydown",
    (event) => {
      if (!session.menu || event.key !== "Escape") return;
      if (popup()?.contains(event.target) || document.querySelector("#dialog")?.open) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      closeMenu(true);
    },
    true,
  );
  window.addEventListener("resize", () => session.menu && positionMenu());
  // After a long-press opened the menu, the browser still sends the tap's compatibility
  // mouse events and click when the finger lifts: they would land on the menu item now
  // under the finger. They are swallowed until shortly after the release.
  const swallow = (event) => {
    // Only the release's own events: pointer-made (a keyboard click has detail 0) and at the
    // long-press point, so a quick tap elsewhere in the menu still works.
    if (event.type === "click" && event.detail === 0) return;
    const at = session.guardAt;
    if (!at || Math.hypot(event.clientX - at.x, event.clientY - at.y) > 24) return;
    if (Date.now() < session.guardUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  for (const type of ["mousedown", "mouseup", "click"])
    document.addEventListener(type, swallow, true);
  const released = (event) => {
    if (event.pointerType && event.pointerType !== "touch") return;
    if (Date.now() < session.guardUntil) session.guardUntil = Date.now() + 500;
  };
  document.addEventListener("pointerup", released, true);
  document.addEventListener("touchend", released, true);
}

// ---------------------------------------------------------------- touch gestures (TV-06)

// Two fingers on the map pinch-zoom and pan it (TouchVTT FVT-200, Roll20 R20-211 two-finger
// pan, DDB-120 pinch). The fingers are followed on the document, so a re-render during the
// gesture does not lose them; while two fingers are down no finger reaches the Table (no
// drag, no move, no box), and on release the view is committed with table.setView, whose
// render also clears whatever the first finger had started.
const touch = { points: new Map(), pinch: null };
let touchInstalled = false;
function installTouchGestures() {
  if (touchInstalled || typeof document === "undefined") return;
  touchInstalled = true;
  const stop = (event) => {
    event.stopImmediatePropagation();
    if (event.cancelable) event.preventDefault();
  };
  const begin = () => {
    const svg = document.querySelector("#battle-map");
    const table = session.table;
    if (!svg || !table?.scene) return;
    const [a, b] = [...touch.points.values()];
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const p = svg.createSVGPoint();
    p.x = mid.x;
    p.y = mid.y;
    const anchor = p.matrixTransform(svg.getScreenCTM().inverse());
    const view = touch.pinch?.view ?? table.view ?? { zoom: 1, pan: { x: 0, y: 0 } };
    clearPress();
    session.box = null;
    session.pendingBox = null;
    touch.pinch = {
      svg,
      scene: { width: table.scene.width, height: table.scene.height },
      rect: mapViewport(svg),
      zoom0: view.zoom,
      dist0: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
      anchor: { x: anchor.x, y: anchor.y },
      view,
    };
  };
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.pointerType !== "touch") return;
      if (!touch.pinch && !event.target.closest?.("#battle-map")) return;
      touch.points.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touch.points.size === 2) begin();
      if (touch.pinch) stop(event);
    },
    true,
  );
  document.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType !== "touch" || !touch.points.has(event.pointerId)) return;
      touch.points.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const pinch = touch.pinch;
      if (!pinch) return;
      stop(event);
      if (touch.points.size < 2 || !pinch.svg.isConnected) return;
      const [a, b] = [...touch.points.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y));
      pinch.view = viewAround(
        pinch.scene,
        pinch.rect,
        (pinch.zoom0 * dist) / pinch.dist0,
        pinch.anchor,
        mid,
      );
      const { zoom, pan } = pinch.view;
      pinch.svg.setAttribute(
        "viewBox",
        [pan.x, pan.y, pinch.scene.width / zoom, pinch.scene.height / zoom].join(" "),
      );
    },
    true,
  );
  const lift = (event) => {
    if (event.pointerType !== "touch" || !touch.points.has(event.pointerId)) return;
    touch.points.delete(event.pointerId);
    const pinch = touch.pinch;
    if (!pinch) return;
    stop(event);
    if (touch.points.size) return;
    touch.pinch = null;
    const table = session.table;
    if (table?.setView) table.setView(pinch.view);
    else table?.render?.();
  };
  document.addEventListener("pointerup", lift, true);
  document.addEventListener("pointercancel", lift, true);
}
export const pinchState = () =>
  touch.pinch ? { fingers: touch.points.size, view: touch.pinch.view } : null;

// ---------------------------------------------------------------- opening and closing

export function openMenu(
  ctx,
  actorId,
  { clientX = null, clientY = null, point = null, fromKeyboard = false, select = true } = {},
) {
  const state = ctx.state;
  const scene = activeScene(state);
  const token = tokenOfActor(scene, actorId);
  const slice = sliceOf(state);
  if (
    !token ||
    !(observesToken(state, token, ctx.role) || seesAsAudience(state, slice, token, ctx.role))
  )
    return false;
  if (session.menu?.actorId === actorId && Date.now() - session.menu.openedAt < 400) return true;
  // A token outside the multi-selection starts a new single selection.
  if (session.picked.size && !session.picked.has(actorId)) session.picked = new Set();
  session.menu = {
    kind: "token",
    actorId,
    sceneId: scene.id,
    view: "main",
    anchor: { clientX, clientY, fromKeyboard },
    point,
    openedAt: Date.now(),
    status: null,
    hp: null,
    returnFocus: actorId,
    focusKey: null,
  };
  installGlobals();
  renderMenu(ctx, { focusFirst: true });
  if (
    select &&
    observesToken(state, token, ctx.role) &&
    session.table?.selectedActorId !== actorId
  ) {
    setSelectedActor(actorId);
    ctx.render();
  }
  return true;
}

// The scene menu (R20-129 empty-map menu, VTL-232 scene commands): right-click, long-press
// or the Menu key on the empty map or on a door. Paste is one of its commands, never a
// side effect of the right-click itself.
const doorOf = (state, doorId) =>
  activeScene(state)?.walls?.find((wall) => wall.kind === "door" && wall.id === doorId) ?? null;
const doorVisible = (ctx, doorId) => {
  const door = doorOf(ctx.state, doorId);
  return Boolean(door && (dm(ctx) || !door.secret));
};
export function openSceneMenu(
  ctx,
  { clientX = null, clientY = null, point = null, doorId = null, fromKeyboard = false } = {},
) {
  const scene = activeScene(ctx.state);
  if (!scene) return false;
  const door = doorId && doorVisible(ctx, doorId) ? doorId : null;
  if (
    session.menu?.kind === "scene" &&
    session.menu.doorId === door &&
    Date.now() - session.menu.openedAt < 600
  )
    return true;
  session.menu = {
    kind: "scene",
    sceneId: scene.id,
    doorId: door,
    view: "main",
    anchor: { clientX, clientY, fromKeyboard },
    point: point ?? { x: scene.width / 2, y: scene.height / 2 },
    openedAt: Date.now(),
    status: null,
    focusKey: null,
  };
  installGlobals();
  renderMenu(ctx, { focusFirst: true });
  return true;
}
function returnFocusTo(menu) {
  if (typeof document === "undefined" || !menu) return;
  const node =
    menu.kind === "scene"
      ? (menu.doorId &&
          document.querySelector(`#battle-map [data-door="${cssId(menu.doorId)}"]`)) ||
        document.querySelector("#battle-map")
      : (document.querySelector(`#battle-map [data-actor="${cssId(menu.returnFocus)}"]`) ??
        document.querySelector(
          `#battle-map [data-token-menu-ghost="${cssId(menu.returnFocus)}"]`,
        ) ??
        document.querySelector("#battle-map"));
  node?.focus?.({ preventScroll: true });
}
export function closeMenu(returnFocus = true) {
  const menu = session.menu;
  session.menu = null;
  const el = typeof document === "undefined" ? null : document.querySelector("body > .token-menu");
  if (el) {
    el.hidden = true;
    el.innerHTML = "";
  }
  if (returnFocus) returnFocusTo(menu);
}
/**
 * A dialog opened from the menu gives the focus back to the token when it closes
 * (submitted or dismissed), not to the page.
 */
function focusTokenAfterDialog(actorId) {
  const dialog = typeof document === "undefined" ? null : document.querySelector("#dialog");
  if (!dialog) return;
  dialog.addEventListener("close", () => returnFocusTo({ kind: "token", returnFocus: actorId }), {
    once: true,
  });
}
export const menuState = () => (session.menu ? { ...session.menu } : null);

function openView(ctx, view) {
  if (!session.menu) return;
  // Opened from a labelled submenu (B62): Back returns to that submenu.
  session.menu.parent = session.menu.view?.startsWith("cat:") ? session.menu.view : null;
  session.menu.view = view;
  session.menu.status = null;
  renderMenu(ctx, { focusFirst: true });
}

// The Table's own target and item list (B11: table.menuTarget / table.tokenMenu) when a
// Table is bound; the same registry query otherwise (tests, a menu kept across a render).
function targetOf(ctx, menu) {
  const table = session.table;
  if (table?.menuTarget && table.scene?.id === menu.sceneId) return table.menuTarget(menu.actorId);
  const scene = sceneById(ctx.state, menu.sceneId);
  return {
    actorId: menu.actorId,
    tokenId: tokenOfActor(scene, menu.actorId)?.id ?? null,
    sceneId: menu.sceneId,
  };
}
const menuTarget = (ctx) => targetOf(ctx, session.menu);
const htmlId = (id) => String(id).replace(/[^A-Za-z0-9_-]/g, "-");
// P6 TV-142 (BG3 keeps unavailable actions visible, greyed, with the reason): an area names
// why one of its menu items cannot run now; the item stays in the menu, disabled, and a press
// explains instead of acting. `why(ctx, target)` returns {it, en} or null (available).
const REASONS = new Map();
export function setMenuReason(itemId, why) {
  if (typeof why === "function") REASONS.set(itemId, why);
  else REASONS.delete(itemId);
}
function reasonFor(ctx, itemId, target) {
  try {
    const why = REASONS.get(itemId)?.(ctx, target);
    return why ? ctx.label(why) : null;
  } catch {
    return null;
  }
}
function menuItems(ctx, target) {
  const registry = session.registry;
  const table = session.table;
  const list =
    table?.tokenMenu && table.scene?.id === target.sceneId
      ? table.tokenMenu(target.actorId)
      : (registry?.list("token-menu", ctx, target) ?? []);
  return list.map((item) => {
    const own = OWN_ITEMS.get(item.id);
    return {
      item,
      own,
      label: own?.dynamic ? own.dynamic(ctx, target) : registry.label(item, ctx.lang),
      icon: own ? MENU_ICONS[own.iconFor ? own.iconFor(ctx, target) : own.icon] : menuIconFor(item),
      shortcut: SHORTCUTS[item.id] ?? null,
      submenu: SUBMENUS[item.id] ?? null,
      category: item.submenu ?? null,
      many: SELECTION_ITEMS.has(item.id) ? multiCount(target) : 0,
      why: reasonFor(ctx, item.id, target),
    };
  });
}
// B62: Foundry Token HUD (FVT-119) and D&D Beyond's token menu (DDB-117) keep the frequent
// commands at the top (conditions, HP, sheet, find, select, examine, search); the rest sit
// in labelled submenus (TOKEN_MENU_SUBMENUS). A submenu with a single visible command shows
// that command at the top instead, so no command is ever one level deeper than it needs.
const categoryOf = (id) => TOKEN_MENU_SUBMENUS.find((entry) => entry.id === id) ?? null;
const categoryLabel = (ctx, category) =>
  category.id === "dm" && !dm(ctx)
    ? ctx.t("Altro", "More")
    : ctx.t(category.label.it, category.label.en);
/** Top-level rows of the main view: [{kind:"item", entry} | {kind:"category", category, entries}]. */
export function menuRows(entries) {
  const byCategory = new Map();
  for (const entry of entries)
    if (entry.category && categoryOf(entry.category)) {
      if (!byCategory.has(entry.category)) byCategory.set(entry.category, []);
      byCategory.get(entry.category).push(entry);
    }
  const rows = entries
    .filter((entry) => !entry.category || !categoryOf(entry.category))
    .map((entry) => ({ kind: "item", entry }));
  for (const category of TOKEN_MENU_SUBMENUS) {
    const inside = byCategory.get(category.id);
    if (!inside?.length) continue;
    rows.push(
      inside.length === 1
        ? { kind: "item", entry: inside[0] }
        : { kind: "category", category, entries: inside },
    );
  }
  return rows;
}
function itemRowHTML(ctx, entry, index) {
  const why = entry.why
    ? ` aria-disabled="true" aria-describedby="token-menu-why-${htmlId(entry.item.id)}"`
    : "";
  return `<li role="none"><button type="button" role="menuitem" class="token-menu-item${entry.why ? " is-unavailable" : ""}" data-token-menu-item="${ctx.esc(entry.item.id)}" data-nav data-focus-key="item:${ctx.esc(entry.item.id)}" tabindex="${index ? -1 : 0}"${why}${entry.submenu ? ' aria-haspopup="true"' : ""}${entry.shortcut ? ` aria-keyshortcuts="${ctx.esc(entry.shortcut.replace("Mod", "Control"))}"` : ""}>${entry.icon ? svgIcon(entry.icon) : ""}<span class="token-menu-label">${ctx.esc(entry.label)}${entry.why ? `<small class="token-menu-why" id="token-menu-why-${htmlId(entry.item.id)}">${ctx.esc(entry.why)}</small>` : ""}</span>${entry.many ? `<span class="token-menu-many" aria-label="${ctx.t("per", "for")} ${entry.many} ${ctx.t("pedine", "tokens")}">×${entry.many}</span>` : ""}${entry.shortcut ? `<kbd>${ctx.esc(shortcutText(ctx, entry.shortcut))}</kbd>` : entry.submenu ? `<span class="token-menu-chevron" aria-hidden="true">›</span>` : ""}</button></li>`;
}

function headerHTML(ctx, target, menu) {
  const { state, esc, t } = ctx;
  const actor = state.actors[target.actorId];
  const scene = sceneById(state, target.sceneId);
  const token = tokenOfActor(scene, target.actorId);
  const slice = sliceOf(state);
  const control = controls(ctx, target.actorId) && observesToken(state, token, ctx.role);
  const names = hiddenName(state, slice, target.actorId);
  const facts = [];
  facts.push(
    control
      ? t("Sotto il tuo controllo", "Under your control")
      : t("Controllata dal DM", "DM controlled"),
  );
  if (dm(ctx) && token?.hidden) {
    const mode = visibilityMode(slice, token);
    facts.push(
      mode === "some"
        ? t("Visibile solo a ", "Visible only to ") +
            audienceOf(slice, token.id)
              .map((id) => state.actors[id]?.name)
              .join(", ")
        : t("Nascosta ai giocatori", "Hidden from players"),
    );
  }
  if (!dm(ctx) && seesAsAudience(state, slice, token, ctx.role))
    facts.push(t("Visibile solo a te e al DM", "Visible only to you and the DM"));
  if (isLocked(slice, token?.id) && (dm(ctx) || control))
    facts.push(
      dm(ctx)
        ? t("Posizione bloccata", "Position locked")
        : t("Bloccata dal DM", "Locked by the DM"),
    );
  if (dm(ctx) && groupOf(slice, token?.id)) facts.push(t("In un gruppo", "Grouped"));
  const multi = multiCount(target);
  const title =
    dm(ctx) && names?.hidden
      ? `${esc(names.trueName)} <small class="token-menu-alias">${t("i giocatori vedono", "players see")} «${esc(actor.name)}»</small>`
      : esc(actor.name);
  const conditions = visibleConditionIds(actor, ctx.role);
  const exhaustion =
    Number.isInteger(actor.exhaustion) && actor.exhaustion > 0 ? actor.exhaustion : 0;
  const hp = menu.hp;
  const hpBlock = control
    ? `<form class="token-menu-hp" data-token-menu-hp novalidate><label for="token-menu-hp-input">${t("PF", "HP")}</label><input id="token-menu-hp-input" name="hp" type="text" inputmode="text" autocomplete="off" spellcheck="false" enterkeyhint="done" value="${esc(hp?.value ?? String(actor.hp ?? ""))}" aria-describedby="token-menu-hp-help${hp?.error ? " token-menu-hp-error" : ""}" ${hp?.error ? 'aria-invalid="true"' : ""} data-focus-key="hp"><span class="token-menu-hp-max">/ ${esc(actor.maxHp ?? "?")}${actor.tempHp ? ` · +${esc(actor.tempHp)} ${t("temp.", "temp")}` : ""}</span><button class="button" type="submit" data-focus-key="hp-apply">${t("Applica", "Apply")}</button></form><p class="token-menu-help" id="token-menu-hp-help">${t("-5 danno · +3 cura · =12 imposta (correzione, non danno)", "-5 damage · +3 healing · =12 sets (a correction, not damage)")}${Number.isInteger(actor.hp) ? ` · ${t("anche", "also")} -3-2 ${t("o", "or")} ${esc(actor.hp)}-5` : ""} · ${t("frecce ±1", "arrows ±1")}</p>${hp?.error ? `<p class="token-menu-error" id="token-menu-hp-error" role="alert">${esc(hp.error)}</p>${hp.fullPanel ? `<button type="button" class="button quiet token-menu-wide" data-token-menu-full-conditions data-focus-key="full-hp">${t("Apri Condizioni e stato", "Open Conditions and status")}</button>` : ""}` : ""}`
    : "";
  const chips =
    conditions.length || exhaustion
      ? `<ul class="token-menu-conditions" aria-label="${t("Condizioni", "Conditions")}">${conditions
          .filter((id) => id !== "exhaustion")
          .map(
            (id) =>
              `<li>${svgIcon(CONDITION_ICONS[id] ?? CONDITION_ICONS.incapacitated)}<span>${esc(ctx.label(CONDITION.get(id).name))}</span></li>`,
          )
          .join(
            "",
          )}${exhaustion ? `<li>${svgIcon(CONDITION_ICONS.exhaustion)}<span>${esc(ctx.label(CONDITION.get("exhaustion").name))} ${exhaustion}</span></li>` : ""}</ul>`
      : "";
  return `<div class="token-menu-head"><span class="token-menu-portrait" aria-hidden="true">${esc(String(actor.name)[0] ?? "?")}</span><div class="token-menu-title"><strong id="token-menu-title">${title}</strong><small>${esc(facts.join(" · "))}</small>${multi ? `<small class="token-menu-multi">${multi} ${t("pedine selezionate: PF e voci con", "tokens selected: HP and items marked")} ×${multi} ${t("valgono per tutte quelle che controlli; le altre voci solo per questa.", "apply to all you control; other items to this one only.")}</small>` : ""}</div><button type="button" class="token-menu-close" data-token-menu-close aria-label="${t("Chiudi il menu", "Close the menu")}" data-focus-key="close">${svgIcon(MENU_ICONS.close)}</button></div>${hpBlock}${chips}`;
}

function mainViewHTML(ctx, target) {
  const rows = [];
  let group = null;
  menuRows(menuItems(ctx, target)).forEach((row, index) => {
    // Categories follow the direct commands, after one separator.
    const rowGroup = row.kind === "category" ? "\u0000categories" : (row.entry.item.group ?? "");
    if (group !== null && rowGroup !== group)
      rows.push('<li role="separator" class="token-menu-sep"></li>');
    group = rowGroup;
    if (row.kind === "item") return rows.push(itemRowHTML(ctx, row.entry, index));
    const name = categoryLabel(ctx, row.category);
    rows.push(
      `<li role="none"><button type="button" role="menuitem" class="token-menu-item token-menu-category" data-token-menu-category="${ctx.esc(row.category.id)}" data-nav data-focus-key="category:${ctx.esc(row.category.id)}" tabindex="${index ? -1 : 0}" aria-haspopup="true">${svgIcon(MENU_ICONS[CATEGORY_ICONS[row.category.id]] ?? MENU_ICONS.more)}<span class="token-menu-label">${ctx.esc(name)}</span><span class="token-menu-count" aria-label="${row.entries.length} ${ctx.t("comandi", "commands")}">${row.entries.length}</span><span class="token-menu-chevron" aria-hidden="true">›</span></button></li>`,
    );
  });
  return rows.length
    ? `<ul class="token-menu-list" role="menu" aria-label="${ctx.t("Comandi della pedina", "Token commands")}">${rows.join("")}</ul>`
    : `<p class="token-menu-help">${ctx.t("Nessun comando disponibile per questa pedina.", "No command available for this token.")}</p>`;
}
// Icons of the labelled submenus (MENU_ICONS keys).
const CATEGORY_ICONS = {
  actions: "act",
  look: "palette",
  visibility: "hide",
  items: "bag",
  dm: "shield",
};
/** One labelled submenu (B62): Back, then its commands with their shortcuts. */
function categoryViewHTML(ctx, target, categoryId) {
  const category = categoryOf(categoryId);
  const entries = menuItems(ctx, target).filter((entry) => entry.category === categoryId);
  const back = `<button type="button" class="token-menu-back" data-token-menu-back data-focus-key="back">${svgIcon(MENU_ICONS.back)}<span>${ctx.t("Indietro", "Back")}</span></button>`;
  if (!category || !entries.length)
    return `${back}<p class="token-menu-help">${ctx.t("Nessun comando disponibile per questa pedina.", "No command available for this token.")}</p>`;
  const rows = [];
  let group = null;
  entries.forEach((entry, index) => {
    if (group !== null && entry.item.group !== group)
      rows.push('<li role="separator" class="token-menu-sep"></li>');
    group = entry.item.group ?? "";
    rows.push(itemRowHTML(ctx, entry, index));
  });
  const name = categoryLabel(ctx, category);
  return `${back}<p class="token-menu-subtitle" id="token-menu-subtitle">${ctx.esc(name)}</p><ul class="token-menu-list" role="menu" aria-labelledby="token-menu-subtitle">${rows.join("")}</ul>`;
}

function subViewHTML(ctx, target, menu) {
  const { t, esc } = ctx;
  const view = menu.view;
  const back = `<button type="button" class="token-menu-back" data-token-menu-back data-focus-key="back">${svgIcon(MENU_ICONS.back)}<span>${t("Indietro", "Back")}</span></button>`;
  const scene = sceneById(ctx.state, target.sceneId);
  const token = tokenOfActor(scene, target.actorId);
  const slice = sliceOf(ctx.state);
  if (view === "conditions") {
    let palette;
    try {
      palette = conditionPalette(ctx.state, target.actorId, ctx.role);
    } catch (error) {
      return back + `<p class="token-menu-error" role="alert">${esc(messageOf(ctx, error))}</p>`;
    }
    const rows = [...palette.rows].sort((a, b) =>
      ctx.label(a.name).localeCompare(ctx.label(b.name), ctx.lang === "en" ? "en" : "it"),
    );
    return `${back}<p class="token-menu-help">${t("Un clic applica o termina la condizione, come sulla scheda. Le condizioni implicite (per esempio Incapacitato da Paralizzato) si tolgono dalla loro origine.", "One click applies or ends the condition, as on the sheet. Implied conditions (for example Incapacitated from Paralyzed) end with their origin.")}</p><ul class="token-menu-palette" role="menu" aria-label="${t("Condizioni", "Conditions")}">${rows
      .map(
        (row, index) =>
          `<li role="none"><button type="button" role="menuitemcheckbox" aria-checked="${row.active}" class="token-menu-toggle${row.implied ? " implied" : ""}" data-token-menu-condition="${esc(row.id)}" data-nav data-focus-key="condition:${esc(row.id)}" tabindex="${index ? -1 : 0}"${row.implied ? ` aria-disabled="true" title="${esc(t("Implicita: si toglie dalla sua origine", "Implied: ends with its origin"))}"` : ""}>${svgIcon(CONDITION_ICONS[row.id] ?? CONDITION_ICONS.incapacitated)}<span>${esc(ctx.label(row.name))}${row.count > 1 ? ` ×${row.count}` : ""}</span></button></li>`,
      )
      .join(
        "",
      )}</ul><button type="button" class="button quiet token-menu-wide" data-token-menu-full-conditions data-focus-key="full">${t("Indebolimento, durata e origine…", "Exhaustion, duration and origin…")}${palette.exhaustion ? " · " + t("Indebolimento ", "Exhaustion ") + palette.exhaustion : ""}</button>`;
  }
  if (view === "ring") {
    const current = entryOf(slice, token?.id).ring ?? null;
    return `${back}<ul class="token-menu-swatches" role="menu" aria-label="${t("Colore del bordo", "Border colour")}">${[
      [null, null, L("Nessuno", "None")],
      ...RING_COLOURS,
    ]
      .map(
        ([id, hex, name], index) =>
          `<li role="none"><button type="button" role="menuitemradio" aria-checked="${current === id}" class="token-menu-swatch" data-token-menu-ring="${id ?? ""}" data-nav data-focus-key="ring:${id ?? "none"}" tabindex="${index ? -1 : 0}"><span class="token-menu-dot" style="${hex ? `background:${hex}` : ""}" aria-hidden="true"></span><span>${esc(ctx.label(name))}</span></button></li>`,
      )
      .join("")}</ul>`;
  }
  if (view === "size") {
    const own = entryOf(slice, token?.id).size ?? null;
    const creature = ctx.state.actors[target.actorId]?.size;
    const creatureName = TOKEN_SIZES.find(([id]) => id === creature)?.[2];
    return `${back}<p class="token-menu-help">${t("Cambia solo il disegno della pedina; la taglia della creatura nella scheda resta ", "Changes only how the token is drawn; the creature’s size on the sheet stays ")}${esc(creatureName ? ctx.label(creatureName) : t("non indicata", "not stated"))}.</p><ul class="token-menu-swatches" role="menu" aria-label="${t("Dimensione della pedina", "Token size")}">${[
      [null, 0, L("Come la creatura", "As the creature")],
      ...TOKEN_SIZES,
    ]
      .map(
        ([id, , name], index) =>
          `<li role="none"><button type="button" role="menuitemradio" aria-checked="${own === id}" class="token-menu-swatch" data-token-menu-size="${id ?? ""}" data-nav data-focus-key="size:${id ?? "none"}" tabindex="${index ? -1 : 0}"><span>${esc(ctx.label(name))}</span></button></li>`,
      )
      .join("")}</ul>`;
  }
  if (view === "rotate") {
    const current = rotationOf(slice, token?.id);
    // TouchVTT's rotation buttons (FVT-200): a step left or right, or back to 0.
    const buttons = [
      ["left", "rotateLeft", t("Ruota a sinistra di 45°", "Rotate 45° left")],
      ["right", "rotate", t("Ruota a destra di 45°", "Rotate 45° right")],
      ["reset", "undo", t("Nessuna rotazione", "No rotation")],
    ];
    return `${back}<p class="token-menu-help">${t("Orientamento disegnato (la freccia sul bordo). Le regole 2024 non hanno un fronte: non cambia portata, attacchi o movimento.", "Drawn facing (the arrow on the border). The 2024 rules have no facing: it changes no reach, attack or movement.")} ${t("Ora", "Now")}: <strong data-token-menu-rotation>${current}°</strong></p><ul class="token-menu-swatches" role="menu" aria-label="${t("Ruota la pedina", "Rotate token")}">${buttons
      .map(
        ([id, iconName, label], index) =>
          `<li role="none"><button type="button" role="menuitem" class="token-menu-swatch" data-token-menu-rotate="${id}" data-nav data-focus-key="rotate:${id}" tabindex="${index ? -1 : 0}">${svgIcon(MENU_ICONS[iconName])}<span>${esc(label)}</span></button></li>`,
      )
      .join("")}</ul>`;
  }
  return back;
}

// Scene menu items: [id, icon, label, shortcut?], for this viewer and this place.
function sceneItems(ctx, menu) {
  const { t } = ctx;
  const items = [];
  const door = menu.doorId ? doorOf(ctx.state, menu.doorId) : null;
  if (door) {
    items.push(["door-use", "door", t("Apri o chiudi la porta…", "Open or close the door…")]);
    if (dm(ctx)) {
      for (const [value, label] of [
        ["open", t("Imposta aperta", "Set open")],
        ["closed", t("Imposta chiusa", "Set closed")],
        ["locked", t("Chiudi a chiave", "Lock")],
      ])
        if (door.doorState !== value) items.push(["door-set:" + value, "door", label]);
      if (door.secret) items.push(["door-reveal", "reveal", t("Rivela la porta", "Reveal door")]);
    }
    items.push(null);
  }
  // P6 TV-21 (DDB token browser, Foundry actors directory): the DM adds a creature where
  // the menu was opened.
  if (dm(ctx) && !door) {
    items.push(["add-creature", "plus", t("Aggiungi creatura qui…", "Add a creature here…")]);
    items.push(null);
  }
  if (dm(ctx) && clipboardSize())
    items.push([
      "paste",
      "paste",
      t("Incolla qui", "Paste here") + " (" + clipboardSize() + ")",
      "Mod+V",
    ]);
  items.push(["select-all", "selectAll", t("Seleziona tutte le pedine", "Select all tokens")]);
  if (session.picked.size) items.push(["clear", "pick", t("Deseleziona", "Clear selection")]);
  items.push(["fit", "fit", t("Centra la scena", "Fit the scene")]);
  if (ctx.canUndo?.())
    items.push(["undo", "undo", t("Annulla: ", "Undo: ") + (ctx.undoLabel?.() ?? ""), "Mod+Z"]);
  return items;
}
function sceneMenuHTML(ctx, menu) {
  const { t, esc } = ctx;
  const scene = sceneById(ctx.state, menu.sceneId);
  const door = menu.doorId ? doorOf(ctx.state, menu.doorId) : null;
  const doorState = door
    ? door.doorState === "open"
      ? t("Aperta", "Open")
      : door.doorState === "locked"
        ? t("Chiusa a chiave", "Locked")
        : t("Chiusa", "Closed")
    : "";
  const title = door
    ? (door.secret ? t("Porta segreta", "Secret door") : t("Porta", "Door")) + " · " + doorState
    : esc(scene?.name ?? "");
  const facts = door
    ? t("Comandi della porta e della scena", "Door and scene commands")
    : t("Comandi della scena, in questo punto", "Scene commands, at this point");
  if (menu.view === "cat:creatures") return creaturePickerHTML(ctx, menu);
  const rows = [];
  let index = 0;
  for (const item of sceneItems(ctx, menu)) {
    if (!item) {
      rows.push('<li role="separator" class="token-menu-sep"></li>');
      continue;
    }
    const [id, iconName, label, shortcut] = item;
    rows.push(
      `<li role="none"><button type="button" role="menuitem" class="token-menu-item" data-token-menu-scene="${esc(id)}" data-nav data-focus-key="scene:${esc(id)}" tabindex="${index++ ? -1 : 0}"${shortcut ? ` aria-keyshortcuts="${esc(shortcut.replace("Mod", "Control"))}"` : ""}>${svgIcon(MENU_ICONS[iconName] ?? MENU_ICONS.more)}<span class="token-menu-label">${esc(label)}</span>${shortcut ? `<kbd>${esc(shortcutText(ctx, shortcut))}</kbd>` : ""}</button></li>`,
    );
  }
  return `<div class="token-menu-head"><span class="token-menu-portrait" aria-hidden="true">${svgIcon(door ? MENU_ICONS.door : MENU_ICONS.scene)}</span><div class="token-menu-title"><strong id="token-menu-title">${esc(title)}</strong><small>${esc(facts)}</small></div><button type="button" class="token-menu-close" data-token-menu-close aria-label="${t("Chiudi il menu", "Close the menu")}" data-focus-key="close">${svgIcon(MENU_ICONS.close)}</button></div><ul class="token-menu-list" role="menu" aria-label="${door ? t("Comandi della porta", "Door commands") : t("Comandi della scena", "Scene commands")}">${rows.join("")}</ul>`;
}

// ---------------------------------------------------------------- P6 TV-21 add creatures

const fold = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
/**
 * SRD creatures matching `query` (either language, or the challenge rating), by name; with
 * `state`, also the creatures of the compatibility packs enabled in the campaign (BI-45,
 * Shard/Foundry compendium packs feed the bestiary).
 */
export function creatureMatches(query = "", lang = "it", limit = 12, state = null) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return (
    [...SRD.categoryEntries("creatures"), ...(state ? packCreatures(state) : [])]
      .filter((entry) => {
        const hay = fold(
          [entry.name?.it, entry.name?.en, entry.cr, entry.type?.it, entry.type?.en].join(" "),
        );
        return words.every((word) => hay.includes(word));
      })
      // A name that starts with the words typed comes first (goblin before hobgoblin).
      .map((entry) => ({ entry, name: fold(entry.name?.[lang] ?? entry.name?.it ?? "") }))
      .sort(
        (a, b) =>
          Number(!a.name.startsWith(words[0] ?? "")) - Number(!b.name.startsWith(words[0] ?? "")) ||
          a.name.localeCompare(b.name),
      )
      .map((row) => row.entry)
      .slice(0, limit)
  );
}
const crText = (ctx, entry) =>
  (entry.cr !== undefined && entry.cr !== null ? ` · ${ctx.t("GS", "CR")} ${entry.cr}` : "") +
  (entry.pack ? ` · ${ctx.t("pacchetto", "pack")}, p. ${entry.pack.page}` : "");
function creatureRowsHTML(ctx, query) {
  const rows = creatureMatches(query, ctx.lang, 12, ctx.state);
  return rows.length
    ? rows
        .map(
          (entry, i) =>
            `<li role="none"><button type="button" role="menuitem" class="token-menu-item" data-token-menu-creature="${ctx.esc(entry.id)}" data-nav data-focus-key="creature:${ctx.esc(entry.id)}" tabindex="${i ? -1 : 0}">${svgIcon(MENU_ICONS.plus)}<span class="token-menu-label">${ctx.esc(entry.name?.[ctx.lang] ?? entry.name?.it ?? "")}<small>${ctx.esc(crText(ctx, entry))}</small></span></button></li>`,
        )
        .join("")
    : `<li class="token-menu-empty" role="none">${ctx.t("Nessuna creatura con questo nome.", "No creature with this name.")}</li>`;
}
function creaturePickerHTML(ctx, menu) {
  const { t, esc } = ctx;
  return `<div class="token-menu-head"><button type="button" class="token-menu-back" data-token-menu-back aria-label="${t("Indietro", "Back")}" data-focus-key="back">${svgIcon(MENU_ICONS.back)}</button><div class="token-menu-title"><strong id="token-menu-title">${t("Aggiungi creatura qui", "Add a creature here")}</strong><small>${t("Ostile, visibile ai giocatori · Ctrl+Z annulla", "Hostile, visible to players · Ctrl+Z undoes")}</small></div><button type="button" class="token-menu-close" data-token-menu-close aria-label="${t("Chiudi il menu", "Close the menu")}" data-focus-key="close">${svgIcon(MENU_ICONS.close)}</button></div><label class="token-menu-search"><span class="visually-hidden">${t("Cerca nel bestiario", "Search the bestiary")}</span><input type="search" id="token-menu-creature-search" data-focus-key="creature-search" autocomplete="off" placeholder="${t("Cerca: goblin, lupo, GS 1…", "Search: goblin, wolf, CR 1…")}" value="${esc(menu.query ?? "")}"></label><ul class="token-menu-list" role="menu" aria-label="${t("Creature del bestiario", "Bestiary creatures")}" data-token-menu-creature-list>${creatureRowsHTML(ctx, menu.query ?? "")}</ul>`;
}
/**
 * Adds the SRD creature `entryId` at `point` on the Table's scene (the compendium's own
 * addCreatureToScene: stat block, melee profile, campaign name default), hostile and visible,
 * then selects it. Loaded on use, so the menu does not depend on the Library's module.
 */
export async function addCreatureAt(ctx, entryId, point) {
  const entry = SRD.getEntry(entryId) ?? packCreature(ctx.state, entryId);
  const scene = activeScene(ctx.state);
  if (!entry || !scene) return null;
  try {
    const { addCreatureToScene } = await import("./compendium.mjs");
    const taken = Object.values(ctx.state.actors).filter(
      (actor) => actor.compendiumRef?.id === entry.id || actor.packRef?.id === entry.id,
    ).length;
    const name = `${entry.name?.[ctx.lang] || entry.name?.it}${taken ? ` ${taken + 1}` : ""}`;
    const hideName =
      ctx.state.ext?.["campaign-settings"]?.campaigns?.[ctx.state.campaign?.id]?.policy
        ?.creatureName === "dm";
    const at =
      point && Number.isFinite(point.x) && Number.isFinite(point.y)
        ? {
            x: Math.max(20, Math.min(scene.width - 20, point.x)),
            y: Math.max(20, Math.min(scene.height - 20, point.y)),
          }
        : null;
    const result = addCreatureToScene(ctx, entry, {
      sceneId: scene.id,
      name,
      team: "watch",
      hidden: false,
      hideName,
      point: at,
    });
    session.pendingFocus = result.actorId;
    setSelectedActor(result.actorId);
    ctx.render();
    session.table?.message?.(
      ctx.t(`${name} è sulla mappa. Ctrl+Z annulla.`, `${name} is on the map. Ctrl+Z undoes.`),
    );
    ctx.toast(ctx.t(`${name} aggiunto alla scena.`, `${name} added to the scene.`));
    return result;
  } catch (error) {
    failed(ctx, error);
    return null;
  }
}
// The DM's bestiary drawer (Foundry's actors sidebar, the DDB token browser): search, drag a
// creature onto the map or add it near the middle of the view.
function drawerHTML(ctx) {
  const { t, esc } = ctx;
  return `<div class="token-menu-drawer" data-token-menu-drawer><label class="field">${t("Cerca nel bestiario", "Search the bestiary")}<input type="search" data-token-menu-drawer-search autocomplete="off" placeholder="${t("goblin, lupo, GS 1…", "goblin, wolf, CR 1…")}" value="${esc(session.drawerQuery ?? "")}"></label><p class="muted">${t("Trascina una creatura sulla mappa, oppure «Aggiungi» la mette al centro della vista. Clic destro sulla mappa: «Aggiungi creatura qui».", "Drag a creature onto the map, or “Add” puts it in the middle of the view. Right-click the map: “Add a creature here”.")}</p><ul class="token-menu-drawer-list" data-token-menu-drawer-list>${drawerRowsHTML(ctx)}</ul></div>`;
}
function drawerRowsHTML(ctx) {
  const rows = creatureMatches(session.drawerQuery ?? "", ctx.lang, 30, ctx.state);
  return rows.length
    ? rows
        .map(
          (entry) =>
            `<li draggable="true" data-token-menu-drag="${ctx.esc(entry.id)}"><span class="token-menu-drawer-name" aria-hidden="true">⠿</span><span><strong>${ctx.esc(entry.name?.[ctx.lang] ?? entry.name?.it ?? "")}</strong><small>${ctx.esc(crText(ctx, entry))}</small></span><button type="button" class="button quiet" data-token-menu-add="${ctx.esc(entry.id)}">${ctx.t("Aggiungi", "Add")}<span class="visually-hidden"> ${ctx.esc(entry.name?.[ctx.lang] ?? "")}</span></button></li>`,
        )
        .join("")
    : `<li class="muted">${ctx.t("Nessuna creatura con questo nome.", "No creature with this name.")}</li>`;
}
const viewCentre = (table) => {
  const scene = table?.scene;
  if (!scene) return null;
  const view = table.view ?? { zoom: 1, pan: { x: 0, y: 0 } };
  return {
    x: view.pan.x + scene.width / view.zoom / 2,
    y: view.pan.y + scene.height / view.zoom / 2,
  };
};
function bindDrawer(el, ctx, table) {
  const list = el.querySelector("[data-token-menu-drawer-list]");
  el.querySelector("[data-token-menu-drawer-search]")?.addEventListener("input", (event) => {
    session.drawerQuery = event.target.value;
    if (list) list.innerHTML = drawerRowsHTML(ctx);
  });
  el.addEventListener("click", (event) => {
    const add = event.target.closest?.("[data-token-menu-add]");
    if (!add) return;
    addCreatureAt(ctx, add.dataset.tokenMenuAdd, freeNear(ctx, viewCentre(table ?? session.table)));
  });
  el.addEventListener("dragstart", (event) => {
    const row = event.target.closest?.("[data-token-menu-drag]");
    if (!row || !event.dataTransfer) return;
    event.dataTransfer.setData(CREATURE_DRAG, row.dataset.tokenMenuDrag);
    event.dataTransfer.setData("text/plain", row.dataset.tokenMenuDrag);
    event.dataTransfer.effectAllowed = "copy";
  });
}
const CREATURE_DRAG = "application/x-d20-creature";
const ENTRY_DRAG = "application/x-d20-entry";
// A spot near `point` that no token occupies (a ring search on the grid).
function freeNear(ctx, point) {
  const scene = activeScene(ctx.state);
  if (!scene || !point) return point;
  const size = scene.gridSize;
  for (let ring = 0; ring < 6; ring++)
    for (let dx = -ring; dx <= ring; dx++)
      for (let dy = -ring; dy <= ring; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
        const p = { x: point.x + dx * size, y: point.y + dy * size };
        if (p.x < 30 || p.y < 30 || p.x > scene.width - 30 || p.y > scene.height - 30) continue;
        if (scene.tokens.every((t) => Math.hypot(t.x - p.x, t.y - p.y) >= size * 0.9)) return p;
      }
  return point;
}

/** Header and current view of a menu state (the popup's content), also for tests. */
export function menuMarkup(ctx, menu) {
  if (menu.kind === "scene") return sceneMenuHTML(ctx, menu);
  const target = targetOf(ctx, menu);
  return (
    headerHTML(ctx, target, menu) +
    (menu.view === "main"
      ? mainViewHTML(ctx, target)
      : menu.view.startsWith("cat:")
        ? categoryViewHTML(ctx, target, menu.view.slice(4))
        : subViewHTML(ctx, target, menu))
  );
}

function renderMenu(ctx, { focusFirst = false } = {}) {
  const el = popup();
  const menu = session.menu;
  if (!el || !menu) return;
  const state = ctx.state;
  const scene = sceneById(state, menu.sceneId);
  const token = tokenOfActor(scene, menu.actorId);
  const slice = sliceOf(state);
  const valid =
    menu.kind === "scene"
      ? state.activeSceneId === menu.sceneId && (!menu.doorId || doorVisible(ctx, menu.doorId))
      : state.activeSceneId === menu.sceneId &&
        token &&
        (observesToken(state, token, ctx.role) || seesAsAudience(state, slice, token, ctx.role));
  if (!valid) {
    closeMenu(false);
    return;
  }
  const active = document.activeElement;
  const key = el.contains(active) ? active.getAttribute("data-focus-key") : null;
  // The typed HP draft lives in menu.hp (rendered as the field value); only the caret moves.
  const selection =
    active?.id === "token-menu-hp-input" ? [active.selectionStart, active.selectionEnd] : null;
  // Undo names the change it reverts, and only while that is still this command's change.
  const undo =
    menu.status?.undo && ctx.canUndo?.() && ctx.undoLabel?.() === menu.status.undo
      ? menu.status.undo
      : null;
  const status = menu.status
    ? `<div class="token-menu-status${menu.status.error ? " error" : ""}" role="${menu.status.error ? "alert" : "status"}"><span>${ctx.esc(menu.status.text)}</span>${undo ? `<button type="button" class="button quiet" data-token-menu-undo data-focus-key="undo">${svgIcon(MENU_ICONS.undo)} <span>${ctx.t("Annulla", "Undo")}: <span class="token-menu-undo-what">${ctx.esc(undo)}</span></span></button>` : ""}</div>`
    : "";
  el.setAttribute("aria-labelledby", "token-menu-title");
  el.innerHTML = menuMarkup(ctx, menu) + status;
  el.hidden = false;
  el.dataset.view = menu.view;
  positionMenu();
  const wanted = menu.focusKey ?? (focusFirst ? null : key);
  menu.focusKey = null;
  let node = wanted ? el.querySelector(`[data-focus-key="${cssId(wanted)}"]`) : null;
  if (!node && (focusFirst || key))
    node =
      el.querySelector("[data-nav][tabindex='0']") ??
      el.querySelector("[data-nav]") ??
      el.querySelector("[data-focus-key]");
  node?.focus?.({ preventScroll: true });
  if (selection && node?.id === "token-menu-hp-input" && menu.hp) {
    const end = node.value.length;
    node.setSelectionRange(Math.min(selection[0], end), Math.min(selection[1], end));
  }
}
function positionMenu() {
  const el = popup();
  const menu = session.menu;
  if (!el || !menu) return;
  const compact = globalThis.matchMedia?.("(max-width: 720px)").matches;
  el.classList.toggle("sheet", Boolean(compact));
  if (compact) {
    el.style.left = el.style.top = "";
    return;
  }
  // Beside the token (DDB-117), flipped to its other side when it would not fit, so the
  // token stays visible; the pointer only when the token cannot be found.
  const node =
    menu.kind === "scene"
      ? menu.doorId && document.querySelector(`#battle-map [data-door="${cssId(menu.doorId)}"]`)
      : (document.querySelector(`#battle-map [data-actor="${cssId(menu.actorId)}"]`) ??
        document.querySelector(`#battle-map [data-token-menu-ghost="${cssId(menu.actorId)}"]`));
  const rect = node?.getBoundingClientRect();
  const width = el.offsetWidth || 300;
  const height = el.offsetHeight || 300;
  const pointer = menu.anchor.clientX !== null && menu.anchor.clientY !== null;
  const right = rect ? rect.right + 10 : pointer ? menu.anchor.clientX + 12 : 80;
  const leftSide = rect ? rect.left - width - 10 : pointer ? menu.anchor.clientX - width - 12 : 8;
  const y = rect ? rect.top - 10 : pointer ? menu.anchor.clientY : 80;
  const left = Math.max(
    8,
    Math.min(right + width > innerWidth - 8 ? leftSide : right, innerWidth - width - 8),
  );
  const top = Math.max(8, Math.min(y, innerHeight - height - 8));
  el.style.left = left + "px";
  el.style.top = top + "px";
}

function onMenuClick(event) {
  const ctx = session.ctx;
  if (!ctx || !session.menu) return;
  const q = (sel) => event.target.closest(sel);
  if (q("[data-token-menu-close]")) return closeMenu(true);
  if (session.menu.kind === "scene") {
    if (q("[data-token-menu-back]")) {
      session.menu.view = "main";
      session.menu.focusKey = "scene:add-creature";
      renderMenu(ctx);
      return;
    }
    const creature = q("[data-token-menu-creature]");
    if (creature) {
      const point = session.menu.point;
      closeMenu(false);
      addCreatureAt(ctx, creature.dataset.tokenMenuCreature, point);
      return;
    }
    const command = q("[data-token-menu-scene]");
    if (command) {
      session.menu.focusKey = "scene:" + command.dataset.tokenMenuScene;
      attempt(ctx, () => runSceneCommand(ctx, command.dataset.tokenMenuScene));
      if (session.menu) renderMenu(ctx);
    }
    return;
  }
  const target = menuTarget(ctx);
  if (q("[data-token-menu-back]")) {
    const from = session.menu.view;
    // A palette opened from a labelled submenu returns there; a submenu returns to the top.
    const parent = !from.startsWith("cat:") ? session.menu.parent : null;
    session.menu.view = parent ?? "main";
    session.menu.parent = null;
    session.menu.focusKey = from.startsWith("cat:")
      ? "category:" + from.slice(4)
      : "item:" + (Object.entries(SUBMENUS).find(([, v]) => v === from)?.[0] ?? "");
    return renderMenu(ctx);
  }
  const category = q("[data-token-menu-category]");
  if (category) {
    session.menu.view = "cat:" + category.dataset.tokenMenuCategory;
    session.menu.parent = null;
    session.menu.status = null;
    return renderMenu(ctx, { focusFirst: true });
  }
  if (q("[data-token-menu-undo]")) {
    const label = ctx.undoLabel?.() ?? "";
    ctx.undo();
    if (session.menu) {
      session.menu.status = {
        text: label
          ? ctx.t("Annullato: ", "Undone: ") + label
          : ctx.t("Modifica annullata.", "Change undone."),
        error: false,
        undo: null,
      };
      session.menu.hp = null;
      renderMenu(ctx);
    }
    return;
  }
  const item = q("[data-token-menu-item]");
  if (item) return activateItem(ctx, item.dataset.tokenMenuItem, target);
  const condition = q("[data-token-menu-condition]");
  if (condition) {
    if (condition.getAttribute("aria-disabled") === "true") {
      session.menu.status = {
        text: ctx.t(
          "Questa condizione deriva da un’altra: termina quella.",
          "This condition comes from another one: end that one.",
        ),
        error: true,
        undo: null,
      };
      return renderMenu(ctx);
    }
    session.menu.focusKey = "condition:" + condition.dataset.tokenMenuCondition;
    return void attempt(ctx, () => {
      const id = condition.dataset.tokenMenuCondition;
      const result = toggleConditionMany(ctx, controlledTargets(ctx, target), id, target.actorId);
      const name = ctx.label(CONDITION.get(id).name);
      done(
        ctx,
        (result.applied ? ctx.t("Applicata: ", "Applied: ") : ctx.t("Terminata: ", "Ended: ")) +
          name +
          (result.actorIds.length > 1 ? " · " + targetNamesOf(ctx, result.actorIds) : "") +
          skippedText(ctx, result.skipped),
      );
      renderMenu(ctx);
    });
  }
  const rotate = q("[data-token-menu-rotate]");
  if (rotate) {
    const how = rotate.dataset.tokenMenuRotate;
    session.menu.focusKey = "rotate:" + how;
    return void attempt(ctx, () => {
      const tokens = targetTokens(ctx.state, target).filter((t) => controls(ctx, t.actorId));
      if (!tokens.length)
        throw localized(
          "control",
          "Non controlli queste pedine.",
          "You do not control these tokens.",
        );
      const change = how === "reset" ? { absolute: 0 } : { delta: how === "left" ? -45 : 45 };
      sliceCommit(
        ctx,
        ctx.t("Rotazione della pedina: ", "Token rotation: ") + targetNames(ctx, tokens),
        (draft, s) =>
          rotateTokens(
            s,
            tokens.map((t) => t.id),
            change,
          ),
        secretFor(
          ctx.state,
          tokens.map((t) => t.actorId),
        ),
      );
      const now = rotationOf(
        sliceOf(ctx.state),
        tokenOfActor(activeScene(ctx.state), target.actorId)?.id,
      );
      done(ctx, ctx.t("Rotazione: ", "Rotation: ") + now + "°");
      renderMenu(ctx);
    });
  }
  if (q("[data-token-menu-full-conditions]")) {
    closeMenu(false);
    return ctx.openConditions?.(target.actorId);
  }
  const ring = q("[data-token-menu-ring]");
  if (ring) {
    const value = ring.dataset.tokenMenuRing || null;
    session.menu.focusKey = "ring:" + (value ?? "none");
    return void attempt(ctx, () => {
      const scene = activeScene(ctx.state);
      const members = expandGroups(
        sliceOf(ctx.state),
        targetTokens(ctx.state, target).map((t) => t.id),
      ).filter((id) => controls(ctx, scene.tokens.find((t) => t.id === id)?.actorId));
      const tokens = members.map((id) => scene.tokens.find((t) => t.id === id));
      if (!members.length)
        throw localized(
          "control",
          "Non controlli queste pedine.",
          "You do not control these tokens.",
        );
      sliceCommit(
        ctx,
        ctx.t("Colore del bordo: ", "Border colour: ") + targetNames(ctx, tokens),
        (draft, s) => setRing(s, members, value),
        secretFor(
          ctx.state,
          tokens.map((t) => t.actorId),
        ),
      );
      done(ctx, ctx.t("Colore del bordo aggiornato.", "Border colour updated."));
      renderMenu(ctx);
    });
  }
  const size = q("[data-token-menu-size]");
  if (size) {
    const value = size.dataset.tokenMenuSize || null;
    session.menu.focusKey = "size:" + (value ?? "none");
    return void attempt(ctx, () => {
      const tokens = targetTokens(ctx.state, target).filter((t) => controls(ctx, t.actorId));
      if (!tokens.length)
        throw localized(
          "control",
          "Non controlli queste pedine.",
          "You do not control these tokens.",
        );
      sliceCommit(
        ctx,
        ctx.t("Dimensione della pedina: ", "Token size: ") + targetNames(ctx, tokens),
        (draft, s) =>
          setSize(
            s,
            tokens.map((t) => t.id),
            value,
          ),
        secretFor(
          ctx.state,
          tokens.map((t) => t.actorId),
        ),
      );
      done(ctx, ctx.t("Dimensione aggiornata.", "Size updated."));
      renderMenu(ctx);
    });
  }
}
/** Runs a menu item as a click on it does (also used by tests). */
export function activateMenuItem(ctx, itemId, target) {
  return activateItem(ctx, itemId, target);
}
function activateItem(ctx, itemId, target) {
  const registry = session.registry;
  const item = registry?.get("token-menu", itemId, ctx, target);
  if (!item) return;
  const why = reasonFor(ctx, itemId, target);
  if (why) {
    // Visible but unavailable: the press says why, nothing runs (BG3).
    if (session.menu) {
      session.menu.focusKey = "item:" + itemId;
      session.menu.status = { text: why, error: true, undo: null };
      renderMenu(ctx);
    } else ctx.toast(why, true);
    return;
  }
  if (session.menu) session.menu.focusKey = "item:" + itemId;
  if (OWN_ITEMS.has(itemId)) {
    attempt(ctx, () => item.run(ctx, target));
    if (session.menu && !SUBMENUS[itemId]) renderMenu(ctx);
    return;
  }
  // Another area's command: the menu closes, then the command runs (it may open a dialog).
  closeMenu(false);
  registry.run(item, ctx, target);
}
function onMenuSubmit(event) {
  event.preventDefault();
  const ctx = session.ctx;
  const form = event.target.closest("[data-token-menu-hp]");
  if (!ctx || !form || !session.menu) return;
  const raw = form.querySelector("[name=hp]").value;
  session.menu.focusKey = "hp";
  beginCommand();
  try {
    const ids = controlledTargets(ctx, menuTarget(ctx));
    const result = applyHpMany(ctx, ids, raw);
    session.menu.hp = null;
    const [first] = result.changes;
    done(
      ctx,
      (result.changes.length === 1 && ids.length === 1
        ? ctx.t("PF ", "HP ") + first.before + " → " + first.after
        : ctx.t("PF: ", "HP: ") +
          result.changes.map((c) => `${c.name} ${c.before} → ${c.after}`).join(", ")) +
        skippedText(ctx, result.skipped),
    );
    renderMenu(ctx);
    const input = popup()?.querySelector("#token-menu-hp-input");
    input?.select?.();
  } catch (error) {
    // The typed value stays, with its explanation, until it is corrected.
    session.menu.hp = {
      value: raw,
      error: messageOf(ctx, error),
      fullPanel: error?.fullPanel === true,
    };
    session.menu.status = null;
    renderMenu(ctx);
  }
}
/** The menu's token, or every selected token this viewer controls and sees. */
function controlledTargets(ctx, target) {
  if (!multiCount(target)) return [target.actorId];
  const ids = targetTokens(ctx.state, target)
    .filter((t) => observesToken(ctx.state, t, ctx.role) && controls(ctx, t.actorId))
    .map((t) => t.actorId);
  // The clicked token first: its state decides a condition toggle.
  return [target.actorId, ...ids.filter((id) => id !== target.actorId)].filter((id) =>
    controls(ctx, id),
  );
}
const skippedText = (ctx, skipped) =>
  skipped.length
    ? " · " +
      ctx.t("escluse: ", "left out: ") +
      skipped.map((row) => `${row.name} (${row.reason})`).join("; ")
    : "";
function onMenuInput(event) {
  if (event.target.id === "token-menu-hp-input" && session.menu)
    session.menu.hp = { value: event.target.value, error: session.menu.hp?.error ?? null };
  if (event.target.id === "token-menu-creature-search" && session.menu && session.ctx) {
    session.menu.query = event.target.value;
    const list = popup()?.querySelector("[data-token-menu-creature-list]");
    if (list) list.innerHTML = creatureRowsHTML(session.ctx, session.menu.query);
  }
}
function onMenuKey(event) {
  const ctx = session.ctx;
  if (!ctx || !session.menu) return;
  const el = popup();
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    if (session.menu.view !== "main") {
      el.querySelector("[data-token-menu-back]")?.click();
      return;
    }
    closeMenu(true);
    return;
  }
  // Tab past the first or last control closes the menu and returns to the token, instead of
  // leaving the focus somewhere else on the page (WAI-ARIA menu button pattern).
  if (event.key === "Tab") {
    const focusables = [
      ...el.querySelectorAll("button:not([disabled]),input:not([disabled]),[tabindex='0']"),
    ].filter((node) => node.getAttribute("tabindex") !== "-1" && node.offsetParent !== null);
    const edge = event.shiftKey ? focusables[0] : focusables.at(-1);
    if (!focusables.length || event.target === edge) {
      event.preventDefault();
      event.stopPropagation();
      closeMenu(true);
    }
    return;
  }
  // VTL-234 (GMG): Up/Down move the typed HP value by 1 (Shift: by 10); Enter applies it.
  if (
    event.target.id === "token-menu-hp-input" &&
    (event.key === "ArrowUp" || event.key === "ArrowDown") &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey
  ) {
    const actor = ctx.state.actors[menuTarget(ctx).actorId];
    const next = stepHpInput(
      event.target.value,
      (event.key === "ArrowUp" ? 1 : -1) * (event.shiftKey ? 10 : 1),
      actor?.hp,
    );
    if (next === null) return;
    event.preventDefault();
    event.stopPropagation();
    event.target.value = next;
    session.menu.hp = { value: next, error: null };
    return;
  }
  if (event.target.closest("input,textarea,select")) return;
  const nav = [...el.querySelectorAll("[data-nav]")];
  const current = event.target.closest("[data-nav]");
  const index = nav.indexOf(current);
  // ARIA menu keys: Up/Down in the list and Right opens a submenu; the two-column
  // palettes move by one with Left/Right and by a row with Up/Down.
  const list = session.menu.view === "main" || session.menu.view.startsWith("cat:");
  const grid = list ? 1 : 2;
  if (event.key === "ArrowRight" && grid === 1 && current?.getAttribute("aria-haspopup")) {
    event.preventDefault();
    current.click();
    return;
  }
  // ARIA menu: Left closes a labelled submenu and returns to its parent entry.
  if (event.key === "ArrowLeft" && session.menu.view.startsWith("cat:")) {
    event.preventDefault();
    el.querySelector("[data-token-menu-back]")?.click();
    return;
  }
  const move =
    grid === 1
      ? { ArrowDown: 1, ArrowUp: -1 }[event.key]
      : { ArrowDown: 2, ArrowUp: -2, ArrowRight: 1, ArrowLeft: -1 }[event.key];
  let next = null;
  if (move && nav.length) next = nav[(index + move + nav.length) % nav.length];
  if (event.key === "Home") next = nav[0];
  if (event.key === "End") next = nav.at(-1);
  if (next) {
    event.preventDefault();
    event.stopPropagation();
    nav.forEach((node) => node.setAttribute("tabindex", node === next ? "0" : "-1"));
    next.focus();
  }
}

// ---------------------------------------------------------------- map wiring

function actorFromNode(node) {
  const token = node?.closest?.("[data-actor],[data-token-menu-ghost]");
  return token?.getAttribute("data-actor") ?? token?.getAttribute("data-token-menu-ghost") ?? null;
}
function clearPress() {
  if (session.press?.timer) clearTimeout(session.press.timer);
  session.press = null;
}
// The selected token is locked and the current tool would move it (a combat action's own
// preview keeps its targeting; its approach is rule movement, see the evidence's limits).
function selectedLocked(ctx, table, mode = table.mode) {
  return (
    lockBlocksMovement(ctx.state, table.selectedActorId, mode) &&
    !hasCombatPreview(ctx, table.selectedActorId)
  );
}
const lockMessage = (ctx) =>
  dm(ctx)
    ? ctx.t(
        "Pedina bloccata: sbloccala dal menu (Maiusc+L) per muoverla.",
        "Token locked: unlock it from the menu (Shift+L) to move it.",
      )
    : ctx.t(
        "Il DM ha bloccato questa pedina: chiedigli di sbloccarla per muoverla.",
        "The DM locked this token: ask them to unlock it to move it.",
      );

// The token selected on the map (null after a click on the empty map), with the older
// Table host that had no map selection falling back to its selected creature.
const mapSelectionOf = (table) =>
  "mapSelection" in (table ?? {}) ? table.mapSelection : (table?.selectedActorId ?? null);
function bindMap(el, ctx, table) {
  session.ctx = ctx;
  session.table = table;
  const svg = table.svg;
  if (!svg) return;
  const isMac = /Mac/.test(globalThis.navigator?.platform ?? "");
  installTouchGestures();
  // P6 TV-21: a creature dragged from the bestiary drawer lands where it is dropped.
  svg.addEventListener("dragover", (event) => {
    const types = event.dataTransfer?.types ?? [];
    const creature = dm(ctx) && types.includes(CREATURE_DRAG);
    // Final review X-07: an item or spell from the compendium joins the sheet of the token
    // it is dropped on (Foundry: drop an item on an actor).
    const entry = types.includes(ENTRY_DRAG) && Boolean(actorFromNode(event.target));
    if (!creature && !entry) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  });
  svg.addEventListener("drop", (event) => {
    const id = event.dataTransfer?.getData(CREATURE_DRAG);
    if (dm(ctx) && id) {
      event.preventDefault();
      addCreatureAt(ctx, id, table.point(event));
      return;
    }
    const entryId = event.dataTransfer?.getData(ENTRY_DRAG);
    const actorId = actorFromNode(event.target);
    if (!entryId || !actorId) return;
    event.preventDefault();
    import("./compendium.mjs")
      .then((C) => {
        if (!C.dropOnSheet(ctx, entryId, actorId))
          ctx.toast(
            ctx.t(
              "Su una pedina che controlli si trascinano oggetti e incantesimi.",
              "Items and spells can be dropped on a token you control.",
            ),
            true,
          );
      })
      .catch(() => {});
  });
  svg.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    clearPress();
    const actorId =
      actorFromNode(event.target) ??
      (event.target === svg && event.button !== 2 ? table.selectedActorId : null);
    const keyboard = event.button !== 2 && event.clientX === 0 && event.clientY === 0;
    const point = table.point(event);
    const at = {
      clientX: keyboard ? null : event.clientX,
      clientY: keyboard ? null : event.clientY,
      point: keyboard ? null : point,
      fromKeyboard: keyboard,
    };
    if (actorId) openMenu(ctx, actorId, at);
    else
      // A door or the empty map (R20-129, VTL-232): the scene menu, where Paste is one of
      // the commands; nothing happens until a command is chosen.
      openSceneMenu(ctx, { ...at, doorId: event.target.closest?.("[data-door]")?.dataset.door });
  });
  svg.addEventListener(
    "pointerdown",
    (event) => {
      session.lastPoint = table.point(event);
      const actorId = actorFromNode(event.target);
      // A secondary press only opens the menu: it never starts a drag or a move.
      if (event.button === 2 || (isMac && event.ctrlKey && event.button === 0)) {
        event.stopImmediatePropagation();
        return;
      }
      // Long-press = right-click (VTL-232, R20-211): on a token its menu, on a door or the
      // empty map the scene menu. Another area's interactive overlay keeps its own press.
      const overlay =
        !actorId &&
        !event.target.closest("[data-door]") &&
        event.target.closest('[data-ext-slot^="map-layer:"]');
      if (event.pointerType === "touch" && event.isPrimary && !overlay) {
        clearPress();
        const doorId = actorId ? null : event.target.closest("[data-door]")?.dataset.door;
        const press = { actorId, x: event.clientX, y: event.clientY };
        const point = session.lastPoint;
        press.timer = setTimeout(() => {
          session.press = { ...press, fired: true };
          session.guardUntil = Date.now() + 2000;
          session.guardAt = { x: press.x, y: press.y };
          // The Table already selected the pressed token; no re-render while the finger is
          // down, so its release still reaches the page and ends the click guard.
          if (actorId)
            openMenu(ctx, actorId, {
              clientX: press.x,
              clientY: press.y,
              point,
              select: false,
            });
          else openSceneMenu(ctx, { clientX: press.x, clientY: press.y, point, doorId });
        }, 520);
        session.press = press;
        // The touch sequence keeps targeting this node even if a re-render detached it:
        // its end cancels the tap's compatibility click once the long-press opened the menu.
        const node = event.target;
        const end = (touch) => {
          node.removeEventListener("touchend", end);
          node.removeEventListener("touchcancel", end);
          if (session.press?.fired) {
            if (touch.cancelable) touch.preventDefault();
            session.guardUntil = Date.now() + 400;
            session.press = null;
          } else clearPress();
        };
        node.addEventListener("touchend", end, { passive: false });
        node.addEventListener("touchcancel", end);
      }
      if (event.button !== 0 || table.mode === "pan") return;
      const tool = table.mode === "token-menu-select";
      if (actorId && event.shiftKey && (tool || table.mode === "move")) {
        // Shift+click adds or removes a token (DDB-118, FVT-108) in the tools that select:
        // Move and "Select several tokens". Other tools keep their own Shift+click (the
        // pointer's "look here" proposal, for example).
        event.stopImmediatePropagation();
        event.preventDefault();
        togglePick(ctx, actorId);
        ctx.render();
        return;
      }
      if (tool) {
        // Over another area's overlay (a note badge) the press belongs to that overlay; a
        // drag from there still draws the selection box, once the pointer moves.
        session.pendingBox = overlay
          ? {
              start: table.point(event),
              x: event.clientX,
              y: event.clientY,
              pointerId: event.pointerId,
              shift: event.shiftKey,
            }
          : null;
        return;
      }
      if (actorId && !event.target.closest("[data-token-menu-ghost]")) {
        const scene = activeScene(ctx.state);
        const slice = sliceOf(ctx.state);
        const token = tokenOfActor(scene, actorId);
        const members = expandGroups(slice, [token.id]);
        session.picked =
          members.length > 1
            ? new Set(members.map((id) => scene.tokens.find((t) => t.id === id)?.actorId))
            : new Set();
        // TV-20 (DDB token groups): dragging a member moves the whole group, out of combat.
        session.groupDrag =
          members.length > 1 && table.mode === "move" && !ctx.state.combat?.active
            ? { actorId, tokenId: token.id, from: { x: token.x, y: token.y }, members }
            : null;
        if (
          table.mode === "move" &&
          isLocked(slice, token.id) &&
          !hasCombatPreview(ctx, table.selectedActorId)
        ) {
          event.stopImmediatePropagation();
          event.preventDefault();
          setSelectedActor(actorId);
          ctx.render();
          session.table?.message?.(lockMessage(ctx));
        } else if (
          // R3 CA-61: a group this viewer may not move stays put, with the reason.
          ["move", "plan"].includes(table.mode) &&
          groupMoveRefusal(ctx.state, token.id, ctx.role) &&
          !hasCombatPreview(ctx, table.selectedActorId)
        ) {
          event.stopImmediatePropagation();
          event.preventDefault();
          session.groupDrag = null;
          setSelectedActor(actorId);
          ctx.render();
          session.table?.message?.(ctx.label(groupMoveRefusal(ctx.state, token.id, ctx.role)));
        }
      } else if (!actorId && session.picked.size && !event.target.closest("[data-door]")) {
        session.picked = new Set();
      }
    },
    true,
  );
  svg.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType !== "touch") session.lastPoint = table.point(event);
      const pending = session.pendingBox;
      if (
        pending &&
        event.pointerId === pending.pointerId &&
        table.mode === "token-menu-select" &&
        !session.box &&
        Math.hypot(event.clientX - pending.x, event.clientY - pending.y) > 6
      ) {
        session.pendingBox = null;
        session.box = { start: pending.start, end: pending.start, shift: pending.shift };
        try {
          svg.setPointerCapture(event.pointerId);
        } catch {}
      }
      if (
        session.press &&
        !session.press.fired &&
        Math.hypot(event.clientX - session.press.x, event.clientY - session.press.y) > 10
      )
        clearPress();
      if (
        session.menu &&
        session.press?.fired !== true &&
        event.buttons === 1 &&
        event.pointerType !== "touch" &&
        Math.abs(event.movementX) + Math.abs(event.movementY) > 2
      )
        closeMenu(false);
      // A locked selection gets no movement or path preview (the middle-button pan works).
      // Last, so a finger that moves still cancels a long-press and a drag closes the menu.
      if (!(event.buttons & 4) && selectedLocked(ctx, table)) event.stopImmediatePropagation();
    },
    true,
  );
  const release = () => {
    session.pendingBox = null;
    if (session.press && !session.press.fired) clearPress();
    else if (session.press?.fired) session.press = null;
  };
  // TV-20: after the Table moved the dragged member, the others follow by the same offset
  // (a task, not a microtask: the Table's own pointerup listener runs after this one).
  svg.addEventListener("pointerup", () => {
    const drag = session.groupDrag;
    session.groupDrag = null;
    if (drag) setTimeout(() => followGroup(session.ctx ?? ctx, drag), 0);
  });
  svg.addEventListener("pointerup", release, true);
  svg.addEventListener("pointercancel", release, true);
  svg.addEventListener(
    "click",
    (event) => {
      // Plan path: a click adds a point, refused on a locked token (P6: a click on the empty
      // map in Move only clears the selection, so it is never refused).
      if (
        table.mode === "plan" &&
        !event.target.closest("[data-actor],[data-door],[data-ext-slot]") &&
        selectedLocked(ctx, table)
      ) {
        event.stopImmediatePropagation();
        table.message(lockMessage(ctx));
      }
    },
    true,
  );
  svg.addEventListener(
    "keydown",
    (event) => {
      const actorId = actorFromNode(event.target);
      // R3 CA-61: the keyboard respects «Chi può muovere il gruppo» as the drag does, and a
      // keyboard move of a group member (arrows, then Enter) brings the group along.
      const keyed = actorId ?? mapSelectionOf(table);
      const keyedToken = tokenOfActor(activeScene(ctx.state), keyed);
      const moveKey = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter"].includes(
        event.key,
      );
      if (
        moveKey &&
        !event.shiftKey &&
        keyedToken &&
        ["move", "plan"].includes(table.mode) &&
        !event.target.closest?.("[data-door]")
      ) {
        const refused = groupMoveRefusal(ctx.state, keyedToken.id, ctx.role);
        if (refused) {
          event.preventDefault();
          event.stopImmediatePropagation();
          table.message(ctx.label(refused));
          return;
        }
        const members = expandGroups(sliceOf(ctx.state), [keyedToken.id]);
        if (
          event.key === "Enter" &&
          table.mode === "move" &&
          members.length > 1 &&
          !ctx.state.combat?.active
        ) {
          const drag = {
            actorId: keyed,
            tokenId: keyedToken.id,
            from: { x: keyedToken.x, y: keyedToken.y },
            members,
          };
          setTimeout(() => followGroup(session.ctx ?? ctx, drag), 0);
        }
      }
      if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const door = event.target.closest?.("[data-door]")?.dataset.door;
        const id = actorId ?? table.selectedActorId;
        if (door) openSceneMenu(ctx, { doorId: door, fromKeyboard: true });
        else if (id) openMenu(ctx, id, { fromKeyboard: true });
        else openSceneMenu(ctx, { fromKeyboard: true });
        return;
      }
      // DDB-117: Delete (or Backspace) removes the selected tokens from the scene; the
      // sheets stay and Ctrl+Z brings them back.
      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        dm(ctx) &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !event.target.closest?.("[data-door]")
      ) {
        // P6: after a click on the empty map nothing is selected there, so Delete removes
        // nothing (the side panel still shows the last creature).
        const id = actorId ?? mapSelectionOf(table);
        if (!tokenOfActor(activeScene(ctx.state), id)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const scene = activeScene(ctx.state);
        attempt(ctx, () =>
          runRemove(ctx, { actorId: id, tokenId: tokenOfActor(scene, id).id, sceneId: scene.id }),
        );
        return;
      }
      if (actorId && event.shiftKey && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        event.stopImmediatePropagation();
        togglePick(ctx, actorId);
        session.pendingFocus = actorId;
        ctx.render();
        return;
      }
      const mod = (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey;
      if (mod && ["c", "v"].includes(event.key.toLowerCase()) && dm(ctx)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        // Keyboard users stay on the map after the re-render.
        session.focusMap = true;
        const scene = activeScene(ctx.state);
        if (event.key.toLowerCase() === "c") {
          const ids = session.picked.size
            ? [...session.picked]
            : [actorId ?? mapSelectionOf(table)].filter(Boolean);
          if (!ids.length) {
            (session.table ?? table).message(
              ctx.t("Seleziona prima una pedina.", "Select a token first."),
            );
            return;
          }
          attempt(ctx, () => {
            session.clipboard = copyTokens(
              ctx.state,
              sliceOf(ctx.state),
              ids.map((id) => tokenOfActor(scene, id)?.id).filter(Boolean),
              ctx.role,
            );
            refreshPanel(ctx);
            (session.table ?? table).message(
              ctx.t("Copiate: ", "Copied: ") +
                session.clipboard.items.length +
                ctx.t(". Ctrl+V incolla sotto il puntatore.", ". Ctrl+V pastes under the pointer."),
            );
          });
        } else if (clipboardSize()) {
          const selectedToken = tokenOfActor(scene, table.selectedActorId);
          const point =
            session.lastPoint ??
            (selectedToken ? { x: selectedToken.x + scene.gridSize, y: selectedToken.y } : null);
          attempt(ctx, () => runPaste(ctx, point));
        }
        return;
      }
      // Arrows prepare a move or a path point, Enter confirms it: refused on a locked token
      // (Enter on a focused token or door still selects or opens it).
      if (
        (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key) ||
          (event.key === "Enter" &&
            !event.target.closest?.("[data-actor],[data-door],[data-ext-slot]"))) &&
        !event.shiftKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        selectedLocked(ctx, table)
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        table.message(lockMessage(ctx));
      }
    },
    true,
  );
  // Plan path's "Execute path" (the core planner) moves the token: refused while it is
  // locked, like every other movement gesture. Registered before the core's own handler.
  table.root?.querySelector?.("[data-path-execute]")?.addEventListener(
    "click",
    (event) => {
      if (!selectedLocked(ctx, table, "plan")) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      table.message(lockMessage(ctx));
    },
    true,
  );
  // VTL-235 (Clash!): double-click a turn-order row to find its token.
  table.root
    ?.querySelectorAll?.(".initiative-token[data-select]")
    .forEach((row) =>
      row.addEventListener("dblclick", () =>
        attempt(ctx, () => centerOn(ctx, row.dataset.select, { focus: false })),
      ),
    );
  // Safety net: the marks mirror the Table's own visibility rule; a mark whose token the
  // Table did not draw (another area hid it) is removed with its conditions and captions.
  for (const deco of el.querySelectorAll("[data-token-menu-deco]"))
    if (!svg.querySelector(`[data-actor="${cssId(deco.getAttribute("data-token-menu-deco"))}"]`))
      deco.remove();
  if (session.focusMap) {
    session.focusMap = false;
    svg.focus({ preventScroll: true });
  }
  if (session.pendingFocus) {
    const id = session.pendingFocus;
    session.pendingFocus = null;
    const node =
      svg.querySelector(`[data-actor="${cssId(id)}"]`) ??
      svg.querySelector(`[data-token-menu-ghost="${cssId(id)}"]`);
    node?.focus?.({ preventScroll: true });
    svg.scrollIntoView?.({ block: "nearest" });
  }
  if (session.menu) renderMenu(ctx);
}

// ---------------------------------------------------------------- map layers

function tokenIconsSVG(ctx, ids, exhaustion, scale) {
  const shown = ids.filter((id) => id !== "exhaustion");
  const all = [
    ...shown.map((id) => [id, CONDITION_ICONS[id] ?? CONDITION_ICONS.incapacitated, ""]),
    ...(exhaustion ? [["exhaustion", CONDITION_ICONS.exhaustion, String(exhaustion)]] : []),
  ];
  if (!all.length) return "";
  const max = 4;
  const visible = all.length > max ? all.slice(0, max - 1) : all;
  const extra = all.length - visible.length;
  const count = visible.length + (extra ? 1 : 0);
  const y = 44 * scale + 16;
  const cells = visible.map(([id, path, level], i) => {
    const x = (i - (count - 1) / 2) * 19;
    const name = ctx.label(CONDITION.get(id)?.name ?? id) + (level ? " " + level : "");
    return `<g class="token-menu-status-icon" data-token-menu-icon="${ctx.esc(id)}" transform="translate(${x},${y})"><title>${ctx.esc(name)}</title><circle r="9"/><g transform="translate(-6,-6) scale(.5)"><path d="${path}"/></g></g>`;
  });
  if (extra) {
    const x = (count - 1 - (count - 1) / 2) * 19;
    cells.push(
      `<g class="token-menu-status-icon more" transform="translate(${x},${y})"><title>${ctx.esc(
        all
          .slice(max - 1)
          .map(([id]) => ctx.label(CONDITION.get(id)?.name ?? id))
          .join(", "),
      )}</title><circle r="9"/><text y="3.5" text-anchor="middle">+${extra}</text></g>`,
    );
  }
  return cells.join("");
}

function marksSVG(ctx, tableView) {
  const state = ctx.state;
  const scene = tableView.scene;
  const slice = sliceOf(state);
  const rules = [];
  const parts = [];
  const selectedMany = session.picked.size > 1;
  for (const token of scene.tokens ?? []) {
    const actor = state.actors[token.actorId];
    if (!actor || !observesToken(state, token, ctx.role)) continue;
    const entry = entryOf(slice, token.id);
    const sel = `#battle-map .map-token[data-actor="${cssId(actor.id)}"]`;
    const scale = sizeScale(displaySize(state, slice, token));
    const deco = [];
    if (scale !== 1) {
      rules.push(`${sel} > .token-display{scale:${scale}}`);
      // P6 TV-19 (Foundry, Owlbear): the name keeps its size under a larger token.
      const k = Math.round((1 / scale) * 1000) / 1000;
      rules.push(
        `${sel} > .token-display > .token-name{font-size:${13 * k}px;stroke-width:${4 * k}px}`,
        `${sel} > .token-display > .token-status-label{font-size:${13 * k}px;stroke-width:${3 * k}px}`,
      );
    }
    if (entry.ring) {
      const hex = RING_COLOURS.find(([id]) => id === entry.ring)?.[1];
      rules.push(`${sel} .token-display > circle:first-child{stroke:${hex};stroke-width:5}`);
    }
    if (entry.rotation) {
      // The portrait turns (its initial or image) and an arrow on the border shows the
      // facing; the name and the HP bar stay level.
      rules.push(
        `${sel} > .token-display > circle:first-child,${sel} > .token-display > text:first-of-type,${sel} > .token-display > image{rotate:${entry.rotation}deg}`,
      );
      deco.push(
        `<path class="token-menu-facing" d="M0 ${-31 * scale} l-6 9 h12 z" transform="rotate(${entry.rotation})"><title>${ctx.esc(ctx.t("Orientamento", "Facing") + " " + entry.rotation + "°")}</title></path>`,
      );
    }
    if (token.hidden && dm(ctx)) {
      // DDB-117 / VTL-145: the DM keeps seeing a hidden token, faded, with an eye-slash.
      rules.push(`${sel} > .token-display{filter:grayscale(1);opacity:.5}`);
      rules.push(
        `.initiative-token[data-select="${cssId(actor.id)}"]{opacity:.55;border-style:dashed}`,
      );
      deco.push(
        `<g class="token-menu-badge hidden-badge" transform="translate(${-19 * scale},${-19 * scale})"><title>${ctx.esc(
          visibilityMode(slice, token) === "some"
            ? ctx.t("Visibile solo a ", "Visible only to ") +
                audienceOf(slice, token.id)
                  .map((id) => state.actors[id]?.name)
                  .join(", ")
            : ctx.t("Nascosta ai giocatori", "Hidden from players"),
        )}</title><circle r="9"/><g transform="translate(-6,-6) scale(.5)"><path d="${MENU_ICONS.hide}"/></g></g>`,
      );
    }
    // The DM and the token's controller see the lock (the controller cannot unlock it).
    if (entry.locked && (dm(ctx) || ctx.canControl(actor))) {
      rules.push(`${sel}{cursor:not-allowed}`);
      deco.push(
        `<g class="token-menu-badge" transform="translate(${-19 * scale},${19 * scale})"><title>${ctx.esc(dm(ctx) ? ctx.t("Posizione bloccata", "Position locked") : ctx.t("Bloccata dal DM", "Locked by the DM"))}</title><circle r="8"/><g transform="translate(-5,-5) scale(.42)"><path d="${MENU_ICONS.lock}"/></g></g>`,
      );
    }
    if (selectedMany && session.picked.has(actor.id))
      rules.push(`${sel} .selection-ring{opacity:1;stroke-dasharray:6 4;stroke:#9fd3ff}`);
    const captions = [];
    // The DM reads the real name above the token; everywhere else (turn order, inspector,
    // sheet, log, Preparation) the name projection adds it next to the alias.
    const hiddenRecord = hiddenName(state, slice, actor.id);
    if (dm(ctx) && hiddenRecord) captions.push(hiddenRecord.trueName);
    if (dm(ctx) && visibilityMode(slice, token) === "some")
      captions.push(
        ctx.t("solo ", "only ") +
          audienceOf(slice, token.id)
            .map((id) => state.actors[id]?.name)
            .join(", "),
      );
    if (captions.length)
      deco.push(
        `<text class="token-menu-caption" y="${-40 * scale - 10}" text-anchor="middle">${ctx.esc(captions.join(" · "))}</text>`,
      );
    const icons = tokenIconsSVG(
      ctx,
      visibleConditionIds(actor, ctx.role),
      Number.isInteger(actor.exhaustion) ? actor.exhaustion : 0,
      scale,
    );
    if (icons) deco.push(icons);
    if (deco.length)
      parts.push(
        `<g class="token-menu-deco" data-token-menu-deco="${ctx.esc(actor.id)}" transform="translate(${token.x},${token.y})"><g class="token-display">${deco.join("")}</g></g>`,
      );
  }
  if (session.ping && Date.now() - session.ping.at < 2500) {
    const token = tokenOfActor(scene, session.ping.actorId);
    if (
      token &&
      (observesToken(state, token, ctx.role) || seesAsAudience(state, slice, token, ctx.role))
    )
      parts.push(`<circle class="token-menu-ping" cx="${token.x}" cy="${token.y}" r="34"/>`);
  }
  parts.push(
    '<rect class="token-menu-marquee" x="0" y="0" width="0" height="0" visibility="hidden"/>',
  );
  return `<style>${ctx.esc(rules.join(""))}</style>${parts.join("")}`;
}

// ---------------------------------------------------------------- P6 TV-20 group moves

/**
 * The members of a dragged group follow its leader by the same offset (D&D Beyond token
 * groups), each on its own route around walls; a member that cannot get there stays and is
 * named. One change, so Ctrl+Z takes the followers back.
 */
export function followGroup(ctx, drag) {
  const scene = activeScene(ctx.state);
  const lead = scene?.tokens.find((t) => t.id === drag.tokenId);
  if (!lead) return null;
  // R3 CA-61: a viewer the group's «Chi può muovere il gruppo» leaves out moves nothing.
  const refused = groupMoveRefusal(ctx.state, drag.tokenId, ctx.role);
  if (refused) {
    session.table?.message?.(ctx.label(refused));
    return { moved: [], stayed: [], refused };
  }
  const dx = lead.x - drag.from.x,
    dy = lead.y - drag.from.y;
  if (Math.hypot(dx, dy) < 1) return null;
  // A mover the DM listed moves the members she does not control too (placed, out of combat).
  const group = sliceOf(ctx.state).groups?.[groupOf(sliceOf(ctx.state), drag.tokenId)];
  const granted = Array.isArray(group?.movers) && group.movers.length > 0;
  const moves = [],
    placed = [],
    stayed = [];
  for (const tokenId of drag.members) {
    if (tokenId === drag.tokenId) continue;
    const token = scene.tokens.find((t) => t.id === tokenId);
    const actor = token && ctx.state.actors[token.actorId];
    const own = Boolean(actor && ctx.canControl(actor));
    if (!actor || (!own && !granted)) continue;
    const point = {
      x: Math.max(20, Math.min(scene.width - 20, token.x + dx)),
      y: Math.max(20, Math.min(scene.height - 20, token.y + dy)),
    };
    const plan = plannedWaypoints(ctx.state, actor.id, point, { role: own ? ctx.role : "dm" });
    if (!plan.reachable || isLocked(sliceOf(ctx.state), tokenId)) stayed.push(actor.name);
    else if (own) moves.push({ actorId: actor.id, point, waypoints: plan.waypoints });
    else placed.push({ tokenId, point });
  }
  if (moves.length || placed.length)
    try {
      commitChange(ctx, ctx.t("Il gruppo segue", "The group follows"), (draft) => {
        for (const move of moves) beginMovement(draft, { id: uid(), ...move }, ctx.role);
        const tokens = activeScene(draft)?.tokens ?? [];
        for (const row of placed)
          Object.assign(
            tokens.find((t) => t.id === row.tokenId),
            row.point,
          );
      });
    } catch (error) {
      failed(ctx, error);
    }
  if (stayed.length)
    session.table?.message?.(
      ctx.t("Restano ferme (strada bloccata): ", "Stay put (way blocked): ") + stayed.join(", "),
    );
  return {
    moved: [
      ...moves.map((m) => m.actorId),
      ...placed.map((row) => scene.tokens.find((t) => t.id === row.tokenId)?.actorId),
    ],
    stayed,
  };
}

// ---------------------------------------------------------------- P6 TV-19 handles

// Foundry's and Owlbear's token handles: the selected token you control shows a rotate handle
// above it and a resize handle at its corner (resize snaps to the SRD sizes, rotation to 15°
// steps as the menu's). A locked token shows none: the lock also locks the handles.
function handlesSVG(ctx, tableView) {
  const state = ctx.state;
  const scene = tableView?.scene;
  const id =
    "mapSelection" in (tableView ?? {}) ? tableView.mapSelection : tableView?.selectedActorId;
  const token = scene?.tokens?.find((t) => t.actorId === id);
  if (!token || tableView.mode !== "move" || session.picked.size > 1) return "";
  if (!controls(ctx, id) || !observesToken(state, token, ctx.role)) return "";
  const slice = sliceOf(state);
  if (isLocked(slice, token.id)) return "";
  const r = 28 * sizeScale(displaySize(state, slice, token));
  const c = Math.round(r * 0.72 * 10) / 10;
  return `<g class="token-menu-handles" data-token-menu-handles="${ctx.esc(id)}" transform="translate(${token.x},${token.y})"><path class="token-menu-handle-stem" d="M0 ${-r} V${-r - 12}"/><circle class="token-menu-handle is-rotate" data-token-handle="rotate" cy="${-r - 19}" r="7"><title>${ctx.esc(ctx.t("Ruota: trascina", "Rotate: drag"))}</title></circle><rect class="token-menu-handle is-resize" data-token-handle="resize" x="${c - 6}" y="${c - 6}" width="12" height="12" rx="2"><title>${ctx.esc(ctx.t("Dimensione: trascina", "Size: drag"))}</title></rect></g>`;
}
/** The SRD size whose drawn radius is nearest to `radius` (the token is 28 units at ×1). */
export function sizeForRadius(radius) {
  const want = radius / 28;
  return TOKEN_SIZES.filter(([id]) => id !== "small").reduce((best, row) =>
    Math.abs(row[1] - want) < Math.abs(best[1] - want) ? row : best,
  )[0];
}
/** The facing in degrees for a handle dragged to `p` around `centre` (0 = up, 15° steps). */
export function rotationFor(centre, p) {
  return normalRotation((Math.atan2(p.x - centre.x, -(p.y - centre.y)) * 180) / Math.PI);
}
function bindHandles(el, ctx, table) {
  const group = el.querySelector("[data-token-menu-handles]");
  if (!group || !table?.svg) return;
  const actorId = group.getAttribute("data-token-menu-handles");
  const display = () =>
    table.svg.querySelector(`[data-actor="${cssId(actorId)}"] > .token-display`);
  group.addEventListener("pointerdown", (event) => {
    const handle = event.target.closest?.("[data-token-handle]");
    if (!handle || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const scene = activeScene(ctx.state);
    const token = tokenOfActor(scene, actorId);
    if (!token) return;
    const kind = handle.dataset.tokenHandle;
    let result = null;
    const move = (e) => {
      const p = table.point(e);
      const node = display();
      if (kind === "rotate") {
        result = rotationFor(token, p);
        node
          ?.querySelectorAll(":scope > circle:first-child, :scope > text:first-of-type")
          .forEach((part) => (part.style.rotate = result + "deg"));
        table.message?.(ctx.t("Orientamento: ", "Facing: ") + result + "°");
      } else {
        result = sizeForRadius(Math.hypot(p.x - token.x, p.y - token.y) / 1.02);
        if (node) node.style.scale = String(sizeScale(result));
        table.message?.(
          ctx.t("Dimensione: ", "Size: ") +
            ctx.label(TOKEN_SIZES.find(([id]) => id === result)?.[2] ?? ""),
        );
      }
    };
    const up = () => {
      globalThis.removeEventListener("pointermove", move);
      globalThis.removeEventListener("pointerup", up);
      if (result === null) return;
      const name = ctx.state.actors[actorId]?.name ?? "";
      attempt(ctx, () =>
        kind === "rotate"
          ? sliceCommit(ctx, ctx.t("Pedina ruotata: ", "Token rotated: ") + name, (draft, slice) =>
              rotateTokens(slice, [token.id], { absolute: result }),
            )
          : sliceCommit(
              ctx,
              ctx.t("Dimensione della pedina: ", "Token size: ") + name,
              (draft, slice) => setSize(slice, [token.id], result),
            ),
      );
    };
    globalThis.addEventListener("pointermove", move);
    globalThis.addEventListener("pointerup", up);
  });
}

function ghostsSVG(ctx, tableView) {
  const state = ctx.state;
  const slice = sliceOf(state);
  return (tableView.scene.tokens ?? [])
    .filter((token) => seesAsAudience(state, slice, token, ctx.role))
    .map((token) => {
      const actor = state.actors[token.actorId];
      const name = ctx.esc(actor.name);
      return `<g class="token-menu-ghost" data-token-menu-ghost="${ctx.esc(actor.id)}" transform="translate(${token.x},${token.y})" tabindex="0" role="button" aria-label="${name}, ${ctx.esc(ctx.t("visibile solo a te e al DM", "visible only to you and the DM"))}"><g class="token-display"><circle r="23"/><circle r="28" class="token-menu-ghost-ring"/><text y="6" text-anchor="middle">${ctx.esc(String(actor.name)[0] ?? "?")}</text><text class="token-menu-ghost-name" y="44" text-anchor="middle">${name}</text><g class="token-menu-badge" transform="translate(-19,-19)"><circle r="9"/><g transform="translate(-6,-6) scale(.5)"><path d="${MENU_ICONS.audience}"/></g></g></g></g>`;
    })
    .join("");
}

// ---------------------------------------------------------------- selection tool

const selectTool = {
  id: "token-menu-select",
  label: L("Seleziona più pedine", "Select several tokens"),
  icon: "check",
  group: "select",
  order: 60,
  onPointerDown(ctx, event, table) {
    if (event.button !== 0) return;
    const actorId = actorFromNode(event.target);
    if (actorId && !event.target.closest("[data-token-menu-ghost]")) {
      session.toolDown = { actorId };
      return;
    }
    const start = table.point(event);
    // Roll20: a modifier filters the box (Alt: only enemies; Ctrl/⌘: only mine).
    const filter = event.altKey ? "enemies" : event.ctrlKey || event.metaKey ? "mine" : null;
    session.box = { start, end: start, shift: event.shiftKey, filter };
    try {
      table.svg.setPointerCapture(event.pointerId);
    } catch {}
  },
  onPointerMove(ctx, event, table) {
    if (!session.box) return;
    session.box.end = table.point(event);
    const rect = table.svg.querySelector(".token-menu-marquee");
    if (!rect) return;
    const { start, end } = session.box;
    rect.setAttribute("x", Math.min(start.x, end.x));
    rect.setAttribute("y", Math.min(start.y, end.y));
    rect.setAttribute("width", Math.abs(end.x - start.x));
    rect.setAttribute("height", Math.abs(end.y - start.y));
    rect.setAttribute("visibility", "visible");
  },
  onPointerUp(ctx, event, table) {
    const state = ctx.state;
    const scene = activeScene(state);
    const slice = sliceOf(state);
    if (session.toolDown) {
      const { actorId } = session.toolDown;
      session.toolDown = null;
      const token = tokenOfActor(scene, actorId);
      if (!token) return;
      session.picked = new Set(
        expandGroups(slice, [token.id]).map((id) => scene.tokens.find((t) => t.id === id)?.actorId),
      );
      if (session.picked.size < 2) session.picked = new Set();
      table.select(actorId);
      return;
    }
    if (!session.box) return;
    const { start, end, shift } = session.box;
    const filter = session.box.filter ?? session.boxFilter ?? "all";
    session.box = null;
    const small = Math.abs(end.x - start.x) < 6 && Math.abs(end.y - start.y) < 6;
    if (small) {
      if (!shift) session.picked = new Set();
      ctx.render();
      return;
    }
    const inside = tokensInBox(
      state,
      slice,
      { x1: start.x, y1: start.y, x2: end.x, y2: end.y },
      ctx.role,
    ).filter((id) => boxFilterKeeps(state, id, filter, (a) => ctx.canControl(a)));
    const ids = expandGroups(
      slice,
      inside.map((id) => tokenOfActor(scene, id).id),
    ).map((id) => scene.tokens.find((t) => t.id === id)?.actorId);
    session.picked = new Set([...(shift ? session.picked : []), ...ids]);
    table.message(
      ctx.t("Selezionate: ", "Selected: ") +
        session.picked.size +
        ctx.t(
          ". Clic destro su una di loro per i comandi.",
          ". Right-click one of them for commands.",
        ),
    );
    if (ids.length) table.select(ids[0]);
    else ctx.render();
  },
  deactivate() {
    session.box = null;
    session.toolDown = null;
  },
};

// ---------------------------------------------------------------- inspector panel

function panelHTML(ctx, tableView) {
  const { state, t, esc } = ctx;
  const scene = tableView.scene;
  const slice = sliceOf(state);
  const selected = tableView.selectedActorId;
  const actor = state.actors[selected];
  const visible = (scene.tokens ?? []).filter(
    (token) =>
      observesToken(state, token, ctx.role) || seesAsAudience(state, slice, token, ctx.role),
  );
  const picked = [...session.picked].filter((id) => tokenOfActor(scene, id));
  const own = !dm(ctx)
    ? visible.find((token) => {
        const a = state.actors[token.actorId];
        return a?.kind === "character" && ctx.canControl(a);
      })
    : null;
  const rows = visible
    .map((token) => {
      const a = state.actors[token.actorId];
      const facts = [];
      if (ctx.canControl(a) && observesToken(state, token, ctx.role))
        facts.push(`${t("PF", "HP")} ${a.hp}/${a.maxHp}`);
      if (dm(ctx) && token.hidden) facts.push(t("nascosta", "hidden"));
      if (seesAsAudience(state, slice, token, ctx.role))
        facts.push(t("solo per te", "only for you"));
      if (dm(ctx) && isLocked(slice, token.id)) facts.push(t("bloccata", "locked"));
      if (session.picked.has(a.id) && session.picked.size > 1)
        facts.push(t("selezionata", "selected"));
      return `<li><button type="button" class="token-menu-row${a.id === selected ? " current" : ""}" data-token-menu-row="${esc(a.id)}" aria-current="${a.id === selected}" title="${esc(t("Doppio clic: centra sulla mappa", "Double-click: centre on the map"))}"><span>${esc(a.name)}</span>${facts.length ? `<small>${esc(facts.join(" · "))}</small>` : ""}</button><button type="button" class="button quiet token-menu-find" data-token-menu-find="${esc(a.id)}" aria-label="${esc(t("Centra ", "Centre ") + a.name)}">${svgIcon(MENU_ICONS.center)}</button></li>`;
    })
    .join("");
  return `<div class="token-menu-panel" data-token-menu-panel>${actor ? `<button type="button" class="button token-menu-open" data-token-menu-open="${esc(selected)}" aria-haspopup="dialog">${svgIcon(MENU_ICONS.more)} ${t("Menu di ", "Menu for ")}${esc(actor.name)}</button>` : ""}<p class="token-menu-help">${t("Anche con clic destro, pressione lunga o tasto Menu (Maiusc+F10) su una pedina.", "Also with right-click, long-press or the Menu key (Shift+F10) on a token.")}</p>${own ? `<button type="button" class="button quiet" data-token-menu-find="${esc(own.actorId)}">${svgIcon(MENU_ICONS.center)} ${t("Trova la mia pedina", "Find my token")}</button>` : ""}${tableView.mode === "token-menu-select" ? boxFilterHTML(ctx) : ""}${picked.length > 1 ? `<p class="token-menu-picked" role="status">${picked.length} ${t("selezionate", "selected")}: ${esc(picked.map((id) => state.actors[id]?.name).join(", "))}</p>${pickedListHTML(ctx, scene, picked, selected)}<div class="token-menu-panel-actions">${dm(ctx) ? `<button type="button" class="button" data-token-menu-act="token-menu-group">${t("Raggruppa / separa", "Group / ungroup")}</button><button type="button" class="button" data-token-menu-act="token-menu-lock">${t("Blocca / sblocca", "Lock / unlock")}</button><button type="button" class="button" data-token-menu-act="token-menu-copy">${t("Copia", "Copy")}</button>` : ""}<button type="button" class="button quiet" data-token-menu-clear>${t("Deseleziona", "Clear selection")}</button></div>` : ""}${dm(ctx) && clipboardSize() ? `<button type="button" class="button" data-token-menu-paste>${svgIcon(MENU_ICONS.paste)} ${t("Incolla ", "Paste ")}${clipboardSize()} ${clipboardSize() === 1 ? t("copia", "copy") : t("copie", "copies")}</button>` : ""}<details class="token-menu-list-details"${session.listOpen ? " open" : ""}><summary>${t("Pedine in scena", "Tokens in the scene")} (${visible.length})</summary><ul class="token-menu-rows" aria-label="${t("Pedine in scena", "Tokens in the scene")}">${rows}</ul><p class="token-menu-help">${t("Frecce per scorrere, Invio per selezionare, doppio clic per centrare.", "Arrows to move, Enter to select, double-click to centre.")}</p></details></div>`;
}
// TV-15: the box filter as chips (Tutte · Solo nemici · Solo mie), with the modifiers named.
function boxFilterHTML(ctx) {
  const current = session.boxFilter ?? "all";
  const names = {
    all: ctx.t("Tutte", "All"),
    enemies: ctx.t("Solo nemici", "Enemies only"),
    mine: ctx.t("Solo mie", "Mine only"),
  };
  return `<fieldset class="token-menu-box-filter"><legend>${ctx.t("Il riquadro seleziona", "The box selects")}</legend>${BOX_FILTERS.map((id) => `<button type="button" class="button quiet${id === current ? " active" : ""}" data-token-menu-box-filter="${id}" aria-pressed="${id === current}">${names[id]}</button>`).join("")}<small class="muted">${ctx.t("Oppure tieni premuto Alt (solo nemici) o Ctrl/⌘ (solo mie) mentre trascini.", "Or hold Alt (enemies only) or Ctrl/⌘ (mine only) while dragging.")}</small></fieldset>`;
}
// TV-15: every selected token in the panel, with what the viewer may read of it.
function pickedListHTML(ctx, scene, picked, selected) {
  const rows = picked
    .map((id) => {
      const a = ctx.state.actors[id];
      if (!a) return "";
      const facts = [];
      if (ctx.canControl(a)) facts.push(`${ctx.t("PF", "HP")} ${a.hp}/${a.maxHp}`);
      if (ctx.canControl(a) && Number.isFinite(a.ac)) facts.push(`${ctx.t("CA", "AC")} ${a.ac}`);
      return `<li><button type="button" class="token-menu-row${id === selected ? " current" : ""}" data-token-menu-row="${ctx.esc(id)}" aria-current="${id === selected}"><span>${ctx.esc(a.name)}</span>${facts.length ? `<small>${ctx.esc(facts.join(" · "))}</small>` : ""}</button></li>`;
    })
    .join("");
  return `<ul class="token-menu-rows token-menu-picked-list" aria-label="${ctx.t("Pedine selezionate", "Selected tokens")}">${rows}</ul>`;
}
function refreshPanel(ctx) {
  // The panel reads session data (clipboard, selection) at render: a render refreshes it.
  if (
    session.table &&
    typeof document !== "undefined" &&
    document.querySelector("[data-token-menu-panel]")
  )
    ctx.render();
}
function bindPanel(el, ctx, table) {
  session.ctx = ctx;
  session.table = table;
  el.querySelector("[data-token-menu-open]")?.addEventListener("click", (event) => {
    const id = event.currentTarget.dataset.tokenMenuOpen;
    openMenu(ctx, id, { fromKeyboard: true });
  });
  el.querySelectorAll("[data-token-menu-find]").forEach((button) =>
    button.addEventListener("click", () =>
      attempt(ctx, () => centerOn(ctx, button.dataset.tokenMenuFind)),
    ),
  );
  el.querySelector("details")?.addEventListener("toggle", (event) => {
    session.listOpen = event.currentTarget.open;
  });
  const rows = [...el.querySelectorAll("[data-token-menu-row]")];
  rows.forEach((row, index) => {
    // A click selects after a short pause, so a double-click (VTL-235: centre) is not
    // broken by the inspector re-rendering around the list in between.
    row.addEventListener("click", () => {
      clearTimeout(session.rowTimer);
      const id = row.dataset.tokenMenuRow;
      session.rowTimer = setTimeout(() => {
        const token = tokenOfActor(activeScene(ctx.state), id);
        if (token && observesToken(ctx.state, token, ctx.role)) table.select(id);
      }, 260);
    });
    row.addEventListener("dblclick", () => {
      clearTimeout(session.rowTimer);
      attempt(ctx, () => centerOn(ctx, row.dataset.tokenMenuRow, { focus: false }));
    });
    row.addEventListener("keydown", (event) => {
      const move = { ArrowDown: 1, ArrowUp: -1 }[event.key];
      if (!move) return;
      event.preventDefault();
      rows[(index + move + rows.length) % rows.length].focus();
    });
  });
  el.querySelectorAll("[data-token-menu-act]").forEach((button) =>
    button.addEventListener("click", () => {
      const scene = activeScene(ctx.state);
      const first = [...session.picked][0];
      const item = session.registry?.get("token-menu", button.dataset.tokenMenuAct, ctx, {
        actorId: first,
        tokenId: tokenOfActor(scene, first)?.id ?? null,
        sceneId: scene.id,
      });
      if (!item) return;
      const ok = attempt(ctx, () =>
        item.run(ctx, {
          actorId: first,
          tokenId: tokenOfActor(scene, first)?.id,
          sceneId: scene.id,
        }),
      );
      if (ok) ctx.render();
    }),
  );
  el.querySelector("[data-token-menu-clear]")?.addEventListener("click", () => {
    session.picked = new Set();
    ctx.render();
  });
  el.querySelectorAll("[data-token-menu-box-filter]").forEach((button) =>
    button.addEventListener("click", () => {
      session.boxFilter = button.dataset.tokenMenuBoxFilter;
      ctx.render();
    }),
  );
  el.querySelector("[data-token-menu-paste]")?.addEventListener("click", () => {
    const scene = activeScene(ctx.state);
    const token = tokenOfActor(scene, table.selectedActorId);
    attempt(ctx, () =>
      runPaste(
        ctx,
        token
          ? { x: token.x + scene.gridSize, y: token.y }
          : { x: scene.width / 2, y: scene.height / 2 },
      ),
    );
  });
}

// ---------------------------------------------------------------- commands (hotkeys)

function commandTarget(ctx) {
  const scene = activeScene(ctx.state);
  // A key such as Shift+G acts on the multi-selection even when the last token clicked on its
  // own is outside it (P6 TV-20).
  // A picked token undone away (a paste taken back) is no longer a target.
  const picked = [...session.picked].filter((pickedId) => tokenOfActor(scene, pickedId));
  const selected = session.table?.selectedActorId;
  const id =
    session.menu?.actorId ??
    (picked.length > 1 && !picked.includes(selected) ? picked[0] : selected) ??
    picked[0];
  const token = tokenOfActor(scene, id);
  if (!token) throw localized("no-token", "Seleziona prima una pedina.", "Select a token first.");
  return { actorId: id, tokenId: token.id, sceneId: scene.id };
}
function runCommand(ctx, itemId) {
  const target = commandTarget(ctx);
  const item = session.registry.get("token-menu", itemId, ctx, target);
  if (!item)
    throw localized(
      "not-available",
      "Comando non disponibile per questa pedina.",
      "Command not available for this token.",
    );
  session.lastDone = null;
  beginCommand();
  item.run(ctx, target);
  if (session.menu) renderMenu(ctx);
  // The result, as the menu would say it ("Rivelata: Sentinella"), not the command's name.
  else if (session.table) session.table.message?.(session.lastDone ?? ctx.label(item.label));
}

// ---------------------------------------------------------------- name projection

// Every screen of the app shows a hidden name's alias in the viewer's language, and the DM
// sees the real name beside it (" · Sentinella"), including screens of other areas (sheet,
// Personaggi, Preparation, log, encounter builder) that print the shared name. The shared
// data keeps the alias, so no player screen can print the real name; this projection only
// runs for what the current viewer's DOM already shows.
const PROJECTION_BLOCKS = "li,p,button,h1,h2,h3,h4,td,th,label,option,summary,strong,dd,dt";
const hasHiddenNames = (state) =>
  Object.values(sliceOf(state).names ?? {}).some((record) => record?.hidden);
function projectElementText(node, dm, lang, forMap) {
  const parent = node.parentElement;
  if (!parent || parent.closest("script,style,textarea,[data-token-menu-raw]")) return;
  // On the map the DM already reads the real name above the token: the alias only changes
  // language there.
  const onMap = Boolean(parent.closest("#battle-map"));
  const list = onMap ? forMap : dm;
  const near = (parent.closest(PROJECTION_BLOCKS) ?? parent).textContent;
  // Where the real name is already beside the alias (this menu's header, the encounter
  // builder's list), only the language changes.
  const own = list.map((p) =>
    near.includes(p.trueName) && p.to !== p.from
      ? { ...p, to: aliasIn(aliasNumber(p.from), lang) }
      : p,
  );
  const next = projectNames(node.data, own);
  if (next !== node.data) node.data = next;
}
function projectSubtree(root, dm, lang, forMap) {
  if (root.nodeType === 3) return projectElementText(root, dm, lang, forMap);
  if (root.nodeType !== 1) return;
  const walker = root.ownerDocument.createTreeWalker(root, 4);
  const texts = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode())
    if (/Creatura sconosciuta|Unknown creature/.test(n.data)) texts.push(n);
  texts.forEach((n) => projectElementText(n, dm, lang, forMap));
  for (const el of [root, ...root.querySelectorAll("[aria-label],[title]")])
    for (const attr of ["aria-label", "title"]) {
      const value = el.getAttribute?.(attr);
      if (!value || !/Creatura sconosciuta|Unknown creature/.test(value)) continue;
      if (el.closest("[data-token-menu-raw]")) continue;
      const list = dm.map((p) =>
        value.includes(p.trueName) ? { ...p, to: aliasIn(aliasNumber(p.from), lang) } : p,
      );
      const next = projectNames(value, list);
      if (next !== value) el.setAttribute(attr, next);
    }
}
/** Projects hidden-name aliases in `root` for this viewer (also used by tests). */
export function projectNamesInDom(root, state, role, lang) {
  if (!root || !hasHiddenNames(state)) return;
  const dm = nameProjections(state, role, lang);
  const forMap = nameProjections(state, "player", lang);
  if (dm.length || forMap.length) projectSubtree(root, dm, lang, forMap);
}
let nameObserver = null;
function installNameProjection(registry) {
  if (nameObserver || typeof MutationObserver === "undefined" || !globalThis.document?.body) return;
  const run = (records) => {
    const ctx = registry.ctx;
    if (!ctx?.state || !hasHiddenNames(ctx.state)) return;
    const roots = records
      ? records.flatMap((r) =>
          r.type === "childList"
            ? [...r.addedNodes]
            : r.type === "attributes"
              ? [r.target]
              : [r.target],
        )
      : [document.body];
    for (const root of roots)
      if (root.isConnected) projectNamesInDom(root, ctx.state, ctx.role, ctx.lang);
    // The projection's own changes need no second pass.
    nameObserver.takeRecords();
  };
  nameObserver = new MutationObserver(run);
  nameObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["aria-label", "title"],
  });
  run(null);
}

// ---------------------------------------------------------------- registration

export function register(registry) {
  // C3 (CA-57): the DM's items, tools and commands follow the session's authority, so the
  // runner of a hand-off gets them (the DM-only `roles` becomes that check).
  const add = (point, def) => registry.add(point, sessionGated(def));
  session.registry = registry;
  installNameProjection(registry);
  registry.registerStateSlice(ID, {
    version: 1,
    seed: seedSlice,
    normalize: (slice, from) => {
      if (from > 1) throw Error("Token menu data from a newer version");
      return normalizeSlice(slice);
    },
  });
  registry.registerStyles(new URL("./token-menu.css", import.meta.url));
  for (const definition of itemDefinitions()) {
    const { dynamic, iconFor, icon, ...contribution } = definition;
    OWN_ITEMS.set(definition.id, definition);
    add("token-menu", { ...contribution, icon });
  }
  add("map-layer", {
    id: "token-menu-marks",
    label: L("Stato delle pedine", "Token status"),
    order: 65,
    svg: marksSVG,
    bind: bindMap,
  });
  add("map-layer", {
    id: "token-menu-handles",
    label: L("Maniglie della pedina", "Token handles"),
    order: 67,
    interactive: true,
    svg: handlesSVG,
    bind: bindHandles,
  });
  add("map-layer", {
    id: "token-menu-ghosts",
    label: L("Pedine visibili solo a te", "Tokens visible only to you"),
    order: 66,
    interactive: true,
    svg: ghostsSVG,
  });
  add("table-tool", selectTool);
  add("table-panel", {
    id: "token-menu-panel",
    label: L("Pedine", "Tokens"),
    order: 20,
    render: panelHTML,
    bind: bindPanel,
  });
  // P6 TV-21: the DM's bestiary at the Table (Scene tab), with drag to the map.
  add("table-panel", {
    id: DRAWER,
    section: "scene",
    label: L("Aggiungi creature", "Add creatures"),
    placement: "sidebar-tab",
    icon: "plus",
    order: 15,
    roles: ["dm"],
    render: (ctx) => drawerHTML(ctx),
    bind: (el, ctx, table) => bindDrawer(el, ctx, table),
  });
  // P6 TV-05: + and − zoom the map around the middle of the view (Owlbear, Roll20).
  for (const [id, key, factor, it, en] of [
    ["token-menu.zoom-in", "+", 1.2, "Ingrandisci la mappa", "Zoom the map in"],
    ["token-menu.zoom-out", "-", 1 / 1.2, "Riduci la mappa", "Zoom the map out"],
  ])
    add("command", {
      id,
      label: L(it, en),
      description: L("zoom, ingrandisci, riduci, vista", "zoom, magnify, view"),
      shortcut: key,
      context: "table",
      group: "token-menu",
      run: () => {
        const table = session.table;
        if (!table?.setView || !table.scene)
          throw localized("no-table", "Apri il Tavolo.", "Open the Table.");
        table.setView(zoomAt(table.view, table.scene, factor, viewCentre(table)));
      },
    });
  // P6 TV-26 (Monk's «Find my token»): also from the search, with the words people use.
  add("command", {
    id: "token-menu.find-mine",
    label: L("Trova la mia pedina", "Find my token"),
    description: L(
      "trova, dov’è la mia pedina, pedina persa, centra la pedina, ritrova",
      "find, where is my token, lost token, centre my token",
    ),
    context: "table",
    group: "token-menu",
    run: (ctx) => {
      const scene = activeScene(ctx.state);
      const mine =
        scene?.tokens.find(
          (t) =>
            ctx.canControl(ctx.state.actors[t.actorId]) &&
            ctx.state.actors[t.actorId]?.kind === "character",
        ) ?? scene?.tokens.find((t) => ctx.canControl(ctx.state.actors[t.actorId]));
      const id = dm(ctx) ? (session.table?.selectedActorId ?? mine?.actorId) : mine?.actorId;
      if (!id) throw localized("no-token", "Non hai pedine in scena.", "You have no token here.");
      centerOn(ctx, id);
    },
  });
  // R3 PG-79: transformations from the search, with the words a new user types.
  const TRANSFORM_WORDS = [
    L("metamorfosi", "polymorph"),
    L("trasforma", "transform"),
    L("trasformazione", "transformation"),
    L("forma", "shape"),
    L("bestia", "beast"),
    L("forma selvatica", "wild shape"),
    L("mutaforma", "shapechange"),
  ];
  const transformTarget = (ctx) => {
    const selected = session.table?.selectedActorId;
    return selected && tokenOfActor(activeScene(ctx.state), selected) ? selected : null;
  };
  add("command", {
    id: "token-menu.polymorph",
    label: L("Metamorfosi…", "Polymorph…"),
    description: L(
      "Trasforma una creatura in una bestia di GS pari o inferiore (incantesimo SRD, Concentrazione)",
      "Turn a creature into a Beast of equal or lower CR (SRD spell, Concentration)",
    ),
    keywords: TRANSFORM_WORDS,
    context: "table",
    group: "token-menu",
    run: (ctx) => openTransform(ctx, { actorId: transformTarget(ctx), preset: "polymorph" }),
  });
  add("command", {
    id: "token-menu.transform",
    label: L("Trasforma una creatura…", "Transform a creature…"),
    description: L(
      "Metamorfosi, Forma Selvatica o una trasformazione personalizzata del DM",
      "Polymorph, Wild Shape or a DM custom transformation",
    ),
    keywords: TRANSFORM_WORDS,
    context: "table",
    group: "token-menu",
    run: (ctx) => openTransform(ctx, { actorId: transformTarget(ctx), preset: "polymorph" }),
  });
  add("command", {
    id: "token-menu.revert-form",
    label: L("Torna alla forma originale", "Return to original form"),
    description: L(
      "Annulla la trasformazione della creatura selezionata",
      "Revert the selected creature's transformation",
    ),
    keywords: [
      ...TRANSFORM_WORDS,
      L("annulla trasformazione", "revert"),
      L("forma originale", "original form"),
    ],
    context: "table",
    group: "token-menu",
    run: (ctx) => {
      const scene = activeScene(ctx.state);
      const selected = transformTarget(ctx);
      const id =
        selected && ctx.state.actors[selected]?.activeForm
          ? selected
          : scene?.tokens
              .map((t) => t.actorId)
              .find(
                (actorId) =>
                  ctx.state.actors[actorId]?.activeForm &&
                  (runsSession(ctx.state, ctx.role) || controls(ctx, actorId)),
              );
      if (!id)
        throw localized(
          "no-form",
          "Nessuna creatura trasformata che puoi riportare alla forma originale.",
          "No transformed creature you can return to its original form.",
        );
      return openTransform(ctx, { actorId: id });
    },
  });
  // P6 TV-106 (Foundry's scene navigation): the scene list over the map, from the search.
  add("command", {
    id: "token-menu.scenes",
    label: L("Scene al Tavolo: attiva o apri", "Scenes at the Table: activate or open"),
    description: L(
      "scene, cambia scena, attiva scena, mostra la scena al gruppo, navigatore delle scene",
      "scenes, change scene, activate scene, show the scene to the party, scene navigator",
    ),
    context: "table",
    group: "token-menu",
    roles: ["dm"],
    run: (ctx) => openSceneNavigator(ctx),
  });
  add("command", {
    id: "token-menu.add-creature",
    label: L(
      "Aggiungi creatura: una nuova pedina sulla scena",
      "Add creature: a new token on the scene",
    ),
    description: L(
      "aggiungi creatura, aggiungi pedina, pedina, mostro, PNG, png, nemico, bestiario, goblin, token",
      "add creature, add token, token, monster, NPC, npc, enemy, bestiary, goblin",
    ),
    context: "table",
    group: "token-menu",
    roles: ["dm"],
    run: (ctx) => {
      const handle = session.table?.root?.querySelector?.(`[data-table-drawer="${DRAWER}"]`);
      if (!handle) throw localized("no-table", "Apri il Tavolo.", "Open the Table.");
      handle.click();
      globalThis.document
        ?.querySelector("#content [data-token-menu-drawer-search]")
        ?.focus({ preventScroll: true });
    },
  });
  for (const [id, itemId, shortcut, it, en, roles] of [
    [
      "token-menu.hide",
      "token-menu-hide",
      "Shift+H",
      "Nascondi o rivela la pedina",
      "Hide or reveal the token",
      ["dm"],
    ],
    [
      "token-menu.lock",
      "token-menu-lock",
      "Shift+L",
      "Blocca o sblocca la pedina",
      "Lock or unlock the token",
      ["dm"],
    ],
    [
      "token-menu.group",
      "token-menu-group",
      "Shift+G",
      "Raggruppa o separa la selezione",
      "Group or ungroup the selection",
      undefined,
    ],
  ])
    add("command", {
      id,
      label: L(it, en),
      shortcut,
      context: "table",
      group: "token-menu",
      ...(roles ? { roles } : {}),
      // R3 CA-61: Shift+G for players says who allows it when the campaign does not.
      ...(itemId === "token-menu-group"
        ? {
            keywords: [
              L("raggruppa", "group"),
              L("gruppo", "group tokens"),
              L("separa", "ungroup"),
            ],
          }
        : {}),
      run: (ctx) => {
        if (
          itemId === "token-menu-group" &&
          !runsSession(ctx.state, ctx.role) &&
          !playersMayGroup(ctx.state)
        )
          throw localized(
            "group-dm",
            "Raggruppare le pedine lo fa il DM: può permetterlo ai giocatori nelle impostazioni della campagna (Permessi).",
            "The DM groups tokens: they can allow players in the campaign settings (Permissions).",
          );
        return runCommand(ctx, itemId);
      },
    });
  // DDB-118: the Select tool has its own key, V (as the Table's R, X and O tool keys).
  add("command", {
    id: "token-menu.select-tool",
    label: L("Strumento Seleziona più pedine", "Select several tokens tool"),
    shortcut: "V",
    context: "table",
    group: "token-menu",
    run: () => {
      if (!session.table?.setMode)
        throw localized("no-table", "Apri il Tavolo.", "Open the Table.");
      session.table.setMode(selectTool.id);
    },
  });
  add("command", {
    id: "token-menu.open",
    label: L("Apri il menu della pedina selezionata", "Open the selected token’s menu"),
    shortcut: "Shift+F10",
    context: "table",
    group: "token-menu",
    run: (ctx) => {
      const target = commandTarget(ctx);
      openMenu(ctx, target.actorId, { fromKeyboard: true });
    },
  });
  registry.on("navigate", (payload) => {
    if (payload.page !== "table") {
      closeMenu(false);
      session.table = null;
    }
  });
  registry.on("role-changed", () => resetTokenMenu());
  registry.on("reset", () => resetTokenMenu());
}
