import { rollDie, resetTurnMovement } from "./state.mjs";
import {
  canViewActor,
  canControlActor,
  isCampaignActor,
  isActorAvailable,
} from "./character-access.mjs";
// C3 (CA-57, Owlbear GM hand-off): the member running the session prepares and starts it.
import { runsSession } from "./session-view.mjs";
import { isValidMeleeProfile, hasBlockingConsequences } from "./combat.mjs";
import { initiativeBonus } from "./combat-tracker-domain.mjs";
import { validateSceneGeometry } from "./spatial.mjs";
import { getConditionMechanics } from "./conditions.mjs";
import { observeRestEvent } from "./rest-time.mjs";
import { formatNumber, scrollIntoStrip } from "./ui.mjs";
import { PREPARATION_GROUPS } from "./registry.mjs";
// PR-03/06/08…15: one scene list and one scene editor (folders, objects, levels, variants,
// grid alignment and Universal VTT come from the scenes area when it is loaded).
import * as SAP from "./scene-assets-prep.mjs";
import * as SAD from "./scene-assets-domain.mjs";
// PR-32 (Foundry's per-scene encounters, DDB «Run encounter»): the scene's encounter is the
// encounter builder's own editor for the encounter linked to the scene, when that area runs.
import * as EB from "./encounter-builder.mjs";
// PR-23: the scene's lights are placed in the editor's «Luci» tab (fog and vision area).
import { renderPrepLights, bindPrepLights } from "./lighting-editor.mjs";
import { sliceOf as fogSliceOf } from "./fog-vision-domain.mjs";
import {
  createSpatialDraft,
  renderSpatialOverlay,
  renderSpatialGesture,
  renderSpatialToolbar,
  renderSpatialProperties,
  spatialPreviewScene,
  bindSpatialEditor,
} from "./spatial-editor.mjs";

const MAX_IMAGE_BYTES = 1024 * 1024;
const IMAGE_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const NUMERIC_FIELDS = {
  width: [300, 4000],
  height: [300, 4000],
  gridSize: [10, 300],
  metersPerCell: [0.1, 100],
  gridOffsetX: [-4000, 4000],
  gridOffsetY: [-4000, 4000],
};
let editor = null;
let previewAudience = "dm";
const geometryValues = (scene) =>
  JSON.stringify({ walls: scene.walls || [], terrain: scene.terrain || [] });
const spatialScale = (scene) =>
  JSON.stringify([scene.width, scene.height, scene.gridSize, scene.metersPerCell]);

function values(scene) {
  return {
    name: String(scene.name || "").trim(),
    description: String(scene.description || ""),
    publicDescription: String(scene.publicDescription || ""),
    width: Number(scene.width ?? 1000),
    height: Number(scene.height ?? 650),
    gridSize: Number(scene.gridSize ?? 50),
    metersPerCell: Number(scene.metersPerCell ?? 1.5),
    gridOffsetX: Number(scene.gridOffsetX ?? 0),
    gridOffsetY: Number(scene.gridOffsetY ?? 0),
    gridVisible: scene.gridVisible !== false,
    gridSnap: scene.gridSnap !== false,
    template: ["blank", "courtyard", "camp"].includes(scene.template)
      ? scene.template
      : "courtyard",
    background: scene.background || null,
    imageName: String(scene.imageName || ""),
    imageWidth: Number(scene.imageWidth || 0),
    imageHeight: Number(scene.imageHeight || 0),
  };
}

export function validateSceneDraft(scene) {
  const errors = [];
  const fields = values(scene);
  if (!fields.name || fields.name.length > 100) errors.push({ field: "name", code: "name" });
  for (const [field, [min, max]] of Object.entries(NUMERIC_FIELDS)) {
    if (
      !Number.isFinite(fields[field]) ||
      fields[field] < min ||
      fields[field] > max ||
      (!["metersPerCell", "gridSize"].includes(field) && !Number.isInteger(fields[field]))
    )
      errors.push({ field, code: "range", min, max });
  }
  if (
    fields.background &&
    (!IMAGE_PATTERN.test(fields.background) ||
      fields.background.length > Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 100)
  )
    errors.push({ field: "background", code: "image" });
  if (!errors.some((error) => error.code === "range") && validateSceneGeometry(scene).length)
    errors.push({ field: "geometry", code: "geometry" });
  return errors;
}

function requireDM(role, state = null) {
  if (role !== "dm" && !(state && runsSession(state, role))) throw new Error("unauthorized");
}
// C3: the DM, or the member the DM handed the session to, has the Preparation powers.
const runs = (ctx) => runsSession(ctx.state, ctx.role);
function findScene(state, id) {
  const scene = state.scenes.find((item) => item.id === id);
  if (!scene) throw new Error("missing");
  return scene;
}

export function saveSceneDraft(
  state,
  input,
  role,
  original,
  pendingActors = {},
  actorPatches = {},
) {
  requireDM(role, state);
  if (validateSceneDraft(input).length) throw new Error("invalid");
  const scene = state.scenes.find((item) => item.id === input.id);
  const geometryEdit = !original || geometryValues(input) !== geometryValues(original);
  const tokenEdit =
    !original || JSON.stringify(input.tokens || []) !== JSON.stringify(original.tokens || []);
  const encounterEdit =
    !original ||
    JSON.stringify(input.encounter || null) !== JSON.stringify(original.encounter || null);
  if (original) {
    if (!scene || JSON.stringify(values(scene)) !== JSON.stringify(values(original)))
      throw new Error("conflict");
    if (tokenEdit && JSON.stringify(scene.tokens) !== JSON.stringify(original.tokens))
      throw new Error("token-conflict");
    if (geometryEdit && geometryValues(scene) !== geometryValues(original))
      throw new Error("geometry-conflict");
    if (
      encounterEdit &&
      JSON.stringify(scene.encounter || null) !== JSON.stringify(original.encounter || null)
    )
      throw new Error("conflict");
  } else if (scene) throw new Error("conflict");
  if (
    original &&
    input.id === state.activeSceneId &&
    (geometryEdit || spatialScale(input) !== spatialScale(original)) &&
    Object.keys(state.actors).some((id) => hasBlockingConsequences(state, id))
  )
    throw new Error("geometry-pending");
  if (
    validateSceneGeometry({
      ...input,
      walls: geometryEdit ? input.walls || [] : scene.walls || [],
      terrain: geometryEdit ? input.terrain || [] : scene.terrain || [],
    }).length
  )
    throw new Error("geometry-invalid");
  for (const id of Object.keys(pendingActors)) if (state.actors[id]) throw new Error("conflict");
  for (const actor of Object.values(pendingActors)) {
    if (actor.combatProfile?.team !== undefined && !validNPCTeam(actor.combatProfile.team))
      throw new Error("team-invalid");
    if (
      actor.combatProfile?.meleeAttack &&
      !validAuthoredMeleeProfile(actor.combatProfile.meleeAttack)
    )
      throw new Error("attack-invalid");
  }
  for (const [id, patch] of Object.entries(actorPatches)) {
    const actor = state.actors[id];
    if (!actor || actor.kind !== "npc") throw new Error("actor-missing");
    if (
      JSON.stringify(actor.combatProfile?.meleeAttack || null) !==
      JSON.stringify(patch.original || null)
    )
      throw new Error("actor-conflict");
    if (patch.value !== null && !validAuthoredMeleeProfile(patch.value))
      throw new Error("attack-invalid");
    if (Object.hasOwn(patch, "team")) {
      if (!validNPCTeam(patch.team)) throw new Error("team-invalid");
      if (npcTeam(actor) !== patch.originalTeam) throw new Error("actor-conflict");
    }
  }
  const actors = { ...state.actors, ...pendingActors };
  const tokens = tokenEdit ? input.tokens || [] : scene.tokens;
  const ids = new Set();
  const actorIds = new Set();
  for (const token of tokens) {
    if (
      !canViewActor(actors[token.actorId], role) ||
      !isCampaignActor(actors[token.actorId], state.campaign?.id)
    )
      throw new Error("actor-missing");
    if (ids.has(token.id) || actorIds.has(token.actorId)) throw new Error("already-placed");
    ids.add(token.id);
    actorIds.add(token.actorId);
    if (
      ![token.x, token.y].every(Number.isFinite) ||
      token.x < 20 ||
      token.y < 20 ||
      token.x > input.width - 20 ||
      token.y > input.height - 20
    )
      throw new Error("token-bounds");
  }
  const encounter = structuredClone(
    encounterEdit ? input.encounter || null : scene?.encounter || null,
  );
  if (encounter && !validParticipants(encounter.participants, actors, tokens, true))
    throw new Error("initiative-invalid");
  if (
    encounter &&
    encounter.participants.some((row) =>
      (state.initiativeRolls || []).some(
        (roll) => roll.id === row.rollId && roll.status === "reversed",
      ),
    )
  )
    throw new Error("initiative-reversed");
  if (encounterEdit && encounter) {
    for (const row of encounter.participants) {
      if (row.natural === null) continue;
      const recorded = (state.initiativeRolls || []).find(
        (roll) =>
          roll.id === row.rollId &&
          roll.sceneId === input.id &&
          roll.actorId === row.actorId &&
          roll.status !== "reversed",
      );
      if (
        recorded &&
        recorded.natural === row.natural &&
        recorded.bonus === row.bonus &&
        recorded.mode === row.mode
      )
        continue;
      const entry = recordInitiativeResult(
        state,
        {
          sceneId: input.id,
          sceneName: input.name,
          actorId: row.actorId,
          actorName: actors[row.actorId]?.name || row.actorId,
          natural: row.natural,
          bonus: row.bonus,
          mode: row.mode,
          kind: recorded ? "correction" : "recorded",
        },
        role,
      );
      row.rollId = entry.id;
    }
  }
  Object.assign(state.actors, structuredClone(pendingActors));
  for (const [id, patch] of Object.entries(actorPatches)) {
    state.actors[id].combatProfile = {
      ...state.actors[id].combatProfile,
      meleeAttack: structuredClone(patch.value),
      ...(Object.hasOwn(patch, "team") ? { team: patch.team } : {}),
    };
  }
  if (original) {
    Object.assign(scene, values(input));
    if (tokenEdit) scene.tokens = structuredClone(tokens);
    if (geometryEdit) {
      scene.walls = structuredClone(input.walls || []);
      scene.terrain = structuredClone(input.terrain || []);
    }
    if (encounterEdit) scene.encounter = structuredClone(encounter);
  } else {
    state.scenes.push({
      id: input.id,
      ...values(input),
      revealed: false,
      revealedTo: [],
      tokens: structuredClone(tokens),
      walls: structuredClone(input.walls || []),
      terrain: structuredClone(input.terrain || []),
      encounter: structuredClone(encounter),
    });
  }
}

export function duplicateScene(state, id, newId, name, role) {
  requireDM(role, state);
  const source = findScene(state, id);
  if (state.scenes.some((item) => item.id === newId)) throw new Error("conflict");
  if (!name.trim() || name.trim().length > 100) throw new Error("invalid");
  state.scenes.push({
    id: newId,
    ...values(source),
    name: name.trim(),
    revealed: false,
    revealedTo: [],
    tokens: [],
    walls: structuredClone(source.walls || []),
    terrain: structuredClone(source.terrain || []),
  });
}

export function deleteScene(state, id, role) {
  requireDM(role, state);
  findScene(state, id);
  if (state.activeSceneId === id) throw new Error("active");
  state.scenes = state.scenes.filter((item) => item.id !== id);
}

export function setSceneSharing(state, id, revealed, role) {
  requireDM(role, state);
  const scene = findScene(state, id);
  scene.revealed = revealed;
  scene.revealedTo = revealed ? ["all"] : [];
}

export function activateScene(state, id, role) {
  requireDM(role, state);
  findScene(state, id);
  state.activeSceneId = id;
}

function errorText(ctx, error) {
  const labels = {
    "geometry-conflict": [
      "I muri, le porte o il terreno sono cambiati al Tavolo. La bozza è conservata: riapri la versione corrente prima di sostituirli.",
      "Walls, doors or terrain changed at the table. Your draft is preserved: reopen the current version before replacing them.",
    ],
    "geometry-pending": [
      "Completa prima le sequenze in attesa al Tavolo. La bozza della geometria e della scala è conservata.",
      "Resolve the pending table sequences first. Your geometry and scale draft is preserved.",
    ],
    "geometry-invalid": [
      "Controlla muri, porte e terreno: ogni geometria deve avere misure valide e restare dentro la mappa.",
      "Check walls, doors and terrain: every shape must have valid measurements and remain inside the map.",
    ],
    "token-conflict": [
      "Le pedine sono cambiate al Tavolo. La tua bozza è conservata: riapri la versione corrente prima di sostituirne le posizioni.",
      "Tokens changed at the table. Your draft is preserved: reopen the current version before replacing positions.",
    ],
    "attack-invalid": [
      "Completa nome, portata, bonus e dadi dell’attacco con valori validi.",
      "Complete the attack name, reach, bonuses and dice with valid values.",
    ],
    "team-invalid": [
      "Scegli se il PNG è alleato, neutrale o ostile al gruppo.",
      "Choose whether the NPC is allied, neutral or hostile to the party.",
    ],
    "actor-conflict": [
      "L’attacco o la disposizione di questo PNG è cambiata. La tua bozza è conservata: riapri il profilo corrente prima di sostituirlo.",
      "This NPC’s attack or disposition changed. Your draft is preserved: reopen the current profile before replacing it.",
    ],
    "actor-missing": [
      "Questa creatura non è più disponibile.",
      "This creature is no longer available.",
    ],
    "already-placed": [
      "Questa creatura è già sulla mappa. Per un altro PNG usa Duplica PNG.",
      "This creature is already on the map. Use Duplicate NPC for another NPC.",
    ],
    "initiative-reversed": [
      "Un tiro di iniziativa è stato annullato. Rilancia oppure inserisci esplicitamente un nuovo risultato prima di salvare.",
      "An initiative roll was reversed. Reroll or explicitly enter a new result before saving.",
    ],
    "initiative-invalid": [
      "Controlla iniziativa, bonus e partecipanti prima di salvare.",
      "Check initiative, bonuses and participants before saving.",
    ],
    unauthorized: [
      "Ora non hai il permesso di modificare la preparazione.",
      "You no longer have permission to edit preparation.",
    ],
    missing: [
      "La scena non è più disponibile. Torna alla raccolta.",
      "This scene is no longer available. Return to the collection.",
    ],
    conflict: [
      "La scena è cambiata mentre la modificavi. Conserva i tuoi appunti e riapri la versione salvata.",
      "The scene changed while you were editing. Keep your notes and reopen the saved version.",
    ],
    "token-bounds": [
      "Queste dimensioni lascerebbero delle pedine fuori dalla mappa. Spostale al Tavolo o usa dimensioni maggiori.",
      "These dimensions would leave tokens outside the map. Move them at the table or use larger dimensions.",
    ],
    active: [
      "Questa scena è attiva al Tavolo. Attiva un’altra scena prima di eliminarla.",
      "This scene is active at the table. Activate another scene before deleting it.",
    ],
    invalid: [
      "Controlla i campi evidenziati prima di salvare.",
      "Check the highlighted fields before saving.",
    ],
  };
  return ctx.t(
    ...(labels[error.message] || [
      "Non è stato possibile salvare. La preparazione precedente è conservata.",
      "Could not save. Your previous preparation is preserved.",
    ]),
  );
}

function commit(ctx, label, mutation) {
  // Noted before the commit's own render, so the scene list shows its named Undo at once.
  SAP.noteUndoable(label);
  try {
    ctx.commit(label, (state) => {
      try {
        mutation(state);
      } catch (error) {
        throw new Error(errorText(ctx, error));
      }
    });
    return true;
  } catch (error) {
    ctx.toast(error.message, true);
    return false;
  }
}

function uniqueId() {
  return `scene-${crypto.randomUUID()}`;
}

// Conditions that change Initiative are declared manual in the catalog: the DM sees them
// next to the roll and includes them in the declared bonus or roll mode.
// Exported for the encounter builder (B19): the same hint next to its initiative rolls.
export function initiativeConditionHint(ctx, actor) {
  if (!actor) return "";
  const m = getConditionMechanics(actor);
  const parts = [
    ...(m.d20Penalty ? [ctx.t("Indebolimento: ", "Exhaustion: ") + "−" + m.d20Penalty] : []),
    ...(m.initiative.advantage.length
      ? [ctx.t("Invisibile: vantaggio", "Invisible: Advantage")]
      : []),
    ...(m.initiative.disadvantage.length
      ? [ctx.t("Incapacitato: svantaggio", "Incapacitated: Disadvantage")]
      : []),
  ];
  return parts.length
    ? `<p class="muted" data-prep-initiative-conditions>${ctx.esc(ctx.t("Da includere nel tiro: ", "Include in the roll: ") + parts.join(" · "))}</p>`
    : "";
}
export function renderSceneBase(scene, ctx) {
  const width = Math.min(4000, Math.max(300, Number(scene.width) || 1000));
  const height = Math.min(4000, Math.max(300, Number(scene.height) || 650));
  const image =
    typeof scene.background === "string" && IMAGE_PATTERN.test(scene.background)
      ? scene.background
      : "";
  const template = scene.template || "courtyard";
  const structures =
    template === "camp"
      ? '<path d="M190 140 L275 55 L360 140 Z M650 490 L735 405 L820 490 Z" fill="#8d734c" stroke="#d2b982" stroke-width="5"/><circle cx="510" cy="305" r="54" fill="#383829" stroke="#967a4a" stroke-width="10"/><path d="M475 305h70M510 270v70" stroke="#c88745" stroke-width="8"/>'
      : template === "courtyard"
        ? '<path d="M90 70H910V580H90Z" fill="#555c55" stroke="#b0aa8b" stroke-width="18"/><path d="M340 70V200H90 M660 580V450H910" fill="none" stroke="#b0aa8b" stroke-width="15"/><circle cx="500" cy="325" r="72" fill="#344c50" stroke="#a4a58b" stroke-width="13"/><path d="M460 325h80M500 285v80" stroke="#7a948b" stroke-width="5"/>'
        : "";
  return `<rect width="${width}" height="${height}" fill="#34413b"/>${image ? `<image href="${ctx.esc(image)}" width="${width}" height="${height}" preserveAspectRatio="none"/>` : `<svg width="${width}" height="${height}" viewBox="0 0 1000 650" preserveAspectRatio="none">${structures}</svg>`}`;
}

function mapPreview(scene, ctx, { players = false, small = false, interactive = false } = {}) {
  if (interactive && editor?.spatial) scene = spatialPreviewScene(scene, editor.spatial);
  const width = Math.min(4000, Math.max(300, Number(scene.width) || 1000));
  const height = Math.min(4000, Math.max(300, Number(scene.height) || 650));
  const grid = Math.min(300, Math.max(10, Number(scene.gridSize) || 50));
  const patternId = `prep-grid-${small ? ctx.esc(scene.id) : "editor"}`;
  const tokens = players ? [] : scene.tokens || [];
  return `<svg class="prep-map" viewBox="0 0 ${width} ${height}" role="${interactive ? "application" : "img"}" ${interactive ? 'tabindex="0" data-prep-interactive' : ""} aria-label="${ctx.esc(interactive ? ctx.t("Posiziona e sposta pedine. Frecce per spostare, Escape per annullare.", "Place and move tokens. Arrow keys to move, Escape to cancel.") : ctx.t("Anteprima della mappa", "Map preview"))}" preserveAspectRatio="xMidYMid meet">
    ${renderSceneBase(scene, ctx)}
    ${scene.gridVisible === false ? "" : `<defs><pattern id="${patternId}" x="${Number(scene.gridOffsetX) || 0}" y="${Number(scene.gridOffsetY) || 0}" width="${grid}" height="${grid}" patternUnits="userSpaceOnUse"><path d="M ${grid} 0 H 0 V ${grid}" fill="none" stroke="#ece7d0" stroke-opacity=".21" stroke-width="1"/></pattern></defs><rect width="${width}" height="${height}" fill="url(#${patternId})"/>`}
    ${renderSpatialOverlay(scene, ctx, { players, editable: interactive, selectedId: interactive ? editor?.spatial?.selectedId : null })}
    ${tokens.map((token) => `<g data-prep-token="${ctx.esc(token.id)}" class="${editor?.selectedTokenId === token.id ? "selected" : ""}"><title>${ctx.esc((editor?.id === scene.id ? editor.pendingActors?.[token.actorId] : null)?.name || ctx.state.actors[token.actorId]?.name || "?")}</title><circle cx="${Number(token.x) || 0}" cy="${Number(token.y) || 0}" r="18" fill="#31586d" stroke="#dfd3a3" stroke-width="3"/><text x="${Number(token.x) || 0}" y="${(Number(token.y) || 0) + 6}" text-anchor="middle" font-size="17" fill="#fff">${ctx.esc(((editor?.id === scene.id ? editor.pendingActors?.[token.actorId] : null)?.name || ctx.state.actors[token.actorId]?.name || "?")[0])}</text></g>`).join("")}
    <g data-spatial-drawing>${interactive && editor?.spatial ? renderSpatialGesture(editor.spatial, ctx) : ""}</g>
  </svg>`;
}

function field(ctx, name, label, type = "text", extra = "") {
  const value = editor.draft[name] ?? "";
  return `<label class="field">${ctx.esc(label)}<input type="${type}" name="${name}" value="${ctx.esc(value)}" ${extra} data-prep-field><span class="prep-field-error" data-prep-error="${name}"></span></label>`;
}

function beginEditor(ctx, scene) {
  editor = {
    id: scene.id,
    draft: { ...structuredClone(scene), ...values(scene) },
    original: ctx.state.scenes.some((item) => item.id === scene.id) ? structuredClone(scene) : null,
    error: "",
    loading: false,
    pendingActors: {},
    actorPatches: {},
    placement: null,
    selectedTokenId: null,
    spatial: createSpatialDraft(),
  };
  previewAudience = "dm";
}

function changed() {
  return (
    editor &&
    (!editor.original ||
      JSON.stringify(values(editor.draft)) !== JSON.stringify(values(editor.original)) ||
      JSON.stringify(editor.draft.tokens || []) !== JSON.stringify(editor.original.tokens || []) ||
      geometryValues(editor.draft) !== geometryValues(editor.original) ||
      JSON.stringify(editor.draft.encounter || null) !==
        JSON.stringify(editor.original.encounter || null) ||
      Object.keys(editor.pendingActors || {}).length ||
      Object.keys(editor.actorPatches || {}).length)
  );
}

export function hasPreparationDraft() {
  return Boolean(changed());
}
export function resetPreparationDraft() {
  editor = null;
  previewAudience = "dm";
}
export function confirmPreparationNavigation(ctx, next) {
  confirmDiscard(ctx, next);
}

// The editor's tabs: Modifica, the scenes area's Oggetti/Livelli/Varianti, Anteprima. The
// grid alignment ("grid") opens from «Griglia e misure» and keeps Modifica highlighted.
const TOOL_TABS = ["objects", "levels", "variants", "lights", "grid"];
const toolReady = (ctx, tab) =>
  tab === "lights" ? Boolean(fogSliceOf(ctx.state)) : SAP.scenesAreaReady(ctx.state);
export function editorTab(view) {
  const tab = view?.tab;
  if (tab === "preview") return "preview";
  if (tab === "scene-assets") return "objects";
  return TOOL_TABS.includes(tab) ? tab : "edit";
}
function editorTabs(ctx) {
  return [
    ["edit", "Modifica", "Edit"],
    ...(SAP.scenesAreaReady(ctx.state) ? SAP.EDITOR_TABS : []),
    ...(fogSliceOf(ctx.state) ? [["lights", "Luci", "Lights"]] : []),
    ["preview", "Anteprima", "Preview"],
  ];
}
// A draft nobody touched follows the saved scene when it changed elsewhere (a variant
// switched in the Varianti tab, a door opened at the Table): saving it later must not
// bring the old picture or geometry back.
function refreshUntouched(saved) {
  if (!editor?.original || changed() || !saved) return;
  const same =
    JSON.stringify(values(saved)) === JSON.stringify(values(editor.original)) &&
    geometryValues(saved) === geometryValues(editor.original) &&
    JSON.stringify(saved.tokens || []) === JSON.stringify(editor.original.tokens || []);
  if (!same) {
    const spatial = editor.spatial;
    editor.draft = { ...structuredClone(saved), ...values(saved) };
    editor.original = structuredClone(saved);
    editor.spatial = spatial;
  }
}
function toolsBody(ctx, draft, saved, tab) {
  if (!saved && tab !== "grid")
    return `<section class="panel prep-tools-empty"><h2>${ctx.t("Prima salva la scena", "Save the scene first")}</h2><p>${ctx.t("Oggetti, piani, varianti e luci appartengono a una scena salvata. Salva la preparazione e poi torna in questa scheda.", "Objects, floors, variants and lights belong to a saved scene. Save the preparation, then come back to this tab.")}</p><button type="button" class="button primary" data-prep-save>${ctx.t("Salva preparazione", "Save preparation")}</button></section>`;
  const html =
    tab === "lights"
      ? renderPrepLights(ctx, saved, {
          base: `${renderSceneBase(saved, ctx)}<g pointer-events="none">${renderSpatialOverlay(saved, ctx, { players: false })}</g>`,
        })
      : SAP.renderSceneTools(ctx, editor.id, tab, { scene: draft, dirty: Boolean(changed()) });
  const note =
    tab !== "grid" && changed()
      ? `<p class="prep-tools-note muted" role="note">${ctx.t("Qui vedi l’ultima versione salvata della mappa: le modifiche non salvate della scheda Modifica restano nella bozza.", "Here you see the last saved version of the map: unsaved changes from the Edit tab stay in the draft.")}</p>`
      : "";
  const undo = tab === "grid" ? "" : SAP.undoButton(ctx);
  const head =
    tab === "grid"
      ? `<div class="section-heading prep-align-head"><h2>${ctx.t("Allinea la griglia alla mappa", "Align the grid to the map")}</h2><button type="button" class="button quiet" data-prep-view="edit">${ctx.t("Torna a Griglia e misure", "Back to Grid and measurements")}</button></div>`
      : undo
        ? `<div class="toolbar prep-tools-bar">${undo}</div>`
        : "";
  return `${head}${note}${html}`;
}

function renderEditor(ctx, scene) {
  if (!editor || editor.id !== scene.id) beginEditor(ctx, scene);
  const saved = ctx.state.scenes.find((item) => item.id === editor.id);
  refreshUntouched(saved);
  const draft = editor.draft;
  const active = saved && saved.id === ctx.state.activeSceneId;
  const tab = editorTab(ctx.view);
  const isPreview = tab === "preview";
  const tools = TOOL_TABS.includes(tab) && toolReady(ctx, tab);
  const shownTab = tab === "grid" ? "edit" : tab;
  const tabBar = `<nav class="tabs prep-editor-tabs" aria-label="${ctx.t("Vista della preparazione", "Preparation view")}">${editorTabs(
    ctx,
  )
    .map(
      ([id, it, en]) =>
        `<button type="button" class="${shownTab === id ? "active" : ""}" data-prep-view="${id}" ${shownTab === id ? 'aria-current="page"' : ""}>${ctx.t(it, en)}</button>`,
    )
    .join("")}</nav>`;
  return `<div class="prep-editor">
    <div class="page-heading"><div><button class="button quiet" data-prep-back>${ctx.t("Scene e mappe", "Scenes and maps")}</button><h1>${ctx.esc(draft.name || ctx.t("Scena senza nome", "Unnamed scene"))}</h1><p class="muted">${saved ? ctx.t("Preparazione della campagna", "Campaign preparation") : ctx.t("Nuova bozza riservata", "New private draft")} ${active ? ` · ${ctx.t("Attiva al Tavolo", "Active at the table")}` : ""}</p></div>
    <div class="toolbar"><button class="button quiet" data-prep-cancel>${ctx.t("Annulla modifiche", "Discard changes")}</button><button class="button primary" data-prep-save ${editor.loading ? 'disabled aria-describedby="prep-status"' : ""}>${ctx.t("Salva preparazione", "Save preparation")}</button></div></div>
    ${tabBar}
    <div class="prep-status" role="status" id="prep-status" data-prep-status>${editor.loading ? ctx.t("Lettura della mappa…", "Reading map…") : changed() ? ctx.t("Modifiche non salvate", "Unsaved changes") : ctx.storageError ? ctx.t("In questa scheda: salvataggio nel browser non disponibile", "In this tab: browser saving unavailable") : ctx.t("Versione salvata", "Saved version")}</div>
    <p class="error prep-error" role="alert" ${editor.error ? "" : "hidden"} data-prep-global-error>${ctx.esc(editor.error)}</p>${editor.oversize && editor.error ? `<p class="prep-shrink"><button type="button" class="button primary" data-prep-shrink>${ctx.t("Riduci e converti in WebP", "Shrink and convert to WebP")}</button><span class="muted">${ctx.t("La mappa viene rimpicciolita e salvata in WebP finché sta sotto il limite.", "The map is scaled down and saved as WebP until it fits the limit.")}</span></p>` : ""}
    ${
      isPreview
        ? renderPreview(ctx, draft, saved)
        : tools
          ? toolsBody(ctx, draft, saved, tab)
          : `<div class="prep-layout"><form class="prep-fields" data-prep-form novalidate>
      <section class="panel"><h2>${ctx.t("La scena", "The scene")}</h2>${field(ctx, "name", ctx.t("Nome della scena", "Scene name"), "text", 'required maxlength="100"')}
      <label class="field">${ctx.t("Descrizione per il gruppo", "Description for the party")}<textarea name="publicDescription" rows="3" maxlength="2000" data-prep-field>${ctx.esc(draft.publicDescription)}</textarea></label>
      <label class="field">${ctx.t("Note riservate ai DM", "DM-only notes")}<textarea name="description" rows="4" maxlength="4000" data-prep-field>${ctx.esc(draft.description)}</textarea></label></section>
      <section class="panel"><h2>${ctx.t("Mappa", "Map")}</h2><label class="field">${ctx.t("Base", "Base")}<select name="template" data-prep-field><option value="blank" ${draft.template === "blank" ? "selected" : ""}>${ctx.t("Superficie vuota", "Blank surface")}</option><option value="courtyard" ${draft.template === "courtyard" ? "selected" : ""}>${ctx.t("Cortile", "Courtyard")}</option><option value="camp" ${draft.template === "camp" ? "selected" : ""}>${ctx.t("Accampamento", "Camp")}</option></select></label>
      <label class="field prep-upload">${ctx.t("Carica un’immagine", "Upload an image")}<input type="file" accept="image/png,image/jpeg,image/webp" data-prep-upload ${editor.loading ? 'disabled aria-describedby="prep-status"' : ""}><span class="muted">PNG, JPG, WebP · ${ctx.t("fino a 1 MB in questa dimostrazione locale", "up to 1 MB in this local demonstration")}</span></label>
      ${draft.background ? `<p class="muted">${ctx.esc(draft.imageName || ctx.t("Mappa caricata", "Uploaded map"))}${draft.imageWidth ? ` · ${draft.imageWidth} × ${draft.imageHeight} px` : ""}</p><button type="button" class="button quiet" data-prep-remove-image>${ctx.t("Rimuovi immagine", "Remove image")}</button>${draft.imageWidth >= 300 && draft.imageWidth <= 4000 && draft.imageHeight >= 300 && draft.imageHeight <= 4000 ? `<button type="button" class="button quiet" data-prep-image-size>${ctx.t("Usa dimensioni dell’immagine", "Use image dimensions")}</button>` : ""}` : ""}
      <div class="form-grid">${field(ctx, "width", ctx.t("Larghezza (pixel)", "Width (pixels)"), "number", 'min="300" max="4000" step="1"')}${field(ctx, "height", ctx.t("Altezza (pixel)", "Height (pixels)"), "number", 'min="300" max="4000" step="1"')}</div>
      <p class="muted">${ctx.t("L’immagine si adatta a queste dimensioni. Non crea muri o luci automaticamente.", "The image fits these dimensions. It does not automatically create walls or lights.")}</p></section>
      <section class="panel"><h2>${ctx.t("Griglia e misure", "Grid and measurements")}</h2><div class="form-grid">${field(ctx, "gridSize", ctx.t("Pixel per cella", "Pixels per cell"), "number", 'min="10" max="300" step="any"')}${field(ctx, "metersPerCell", ctx.t("Metri per cella", "Meters per cell"), "number", 'min="0.1" max="100" step="0.1"')}${field(ctx, "gridOffsetX", ctx.t("Scostamento X (pixel)", "X offset (pixels)"), "number", 'min="-4000" max="4000" step="1"')}${field(ctx, "gridOffsetY", ctx.t("Scostamento Y (pixel)", "Y offset (pixels)"), "number", 'min="-4000" max="4000" step="1"')}</div>
      ${SAP.scenesAreaReady(ctx.state) ? `<div class="prep-align-row"><button type="button" class="button" data-prep-align>${ctx.t("Allinea la griglia alla mappa…", "Align the grid to the map…")}</button><span class="muted">${ctx.t("Per una mappa con la griglia disegnata: due clic su una casella e la lente.", "For a map with a drawn grid: two clicks on one cell, with a magnifier.")}</span></div>` : ""}<label class="prep-check"><input type="checkbox" name="gridVisible" data-prep-field ${draft.gridVisible ? "checked" : ""}> ${ctx.t("Mostra griglia", "Show grid")}</label><label class="prep-check"><input type="checkbox" name="gridSnap" data-prep-field ${draft.gridSnap ? "checked" : ""}> ${ctx.t("Aggancia le pedine alla griglia", "Snap tokens to the grid")}</label><p class="muted">${ctx.t("Nascondere le linee non cambia la misura delle distanze.", "Hiding the lines does not change distance measurements.")}</p></section>
    </form><section class="prep-canvas-panel"><div class="section-heading"><h2>${ctx.t("Anteprima privata", "Private preview")}</h2><span class="badge">${ctx.t("Solo DM", "DM only")}</span></div>${renderSpatialToolbar(editor.spatial, ctx)}${prepCreateActions(ctx, "", "preparation-scene-map")}<div data-prep-map>${mapPreview(draft, ctx, { interactive: true })}</div><p class="prep-map-caption" data-prep-metrics>${metrics(draft, ctx)}</p><p class="muted">${ctx.t("Sposta liberamente le pedine nella bozza. Le modifiche arrivano al Tavolo soltanto con Salva preparazione. Cambiare scala non le riposiziona.", "Move tokens freely in the draft. Changes reach the table only after Save preparation. Changing scale does not reposition them.")}</p>${renderSpatialProperties(draft, editor.spatial, ctx)}${renderTokenTools(ctx)}${EB.sceneEncounterReady(ctx) ? "" : renderEncounterTools(ctx)}${initiativeHistory(ctx, editor.id)}${saved ? savedActions(ctx, saved) : `<p class="muted">${ctx.t("Salva la scena per condividerla o attivarla al Tavolo.", "Save the scene to share it or activate it at the table.")}</p>`}</section></div>${sceneEncounterPanel(ctx, saved)}`
    }
  </div>`;
}

// PR-32: the one encounter panel of the scene (the builder's editor). Commands that add
// tokens to the saved scene wait while this scene has unsaved edits, and say so.
const encounterBlocked = (ctx) =>
  changed()
    ? ctx.t(
        "La scena ha modifiche non salvate: premi «Salva preparazione» (o «Annulla modifiche»), poi prepara l’incontro.",
        "The scene has unsaved changes: press “Save preparation” (or “Discard changes”), then prepare the encounter.",
      )
    : "";
function sceneEncounterPanel(ctx, saved) {
  if (!EB.sceneEncounterReady(ctx)) return "";
  return EB.renderSceneEncounter(ctx, editor.id, {
    saved: Boolean(saved),
    blocked: encounterBlocked(ctx),
  });
}
function metrics(scene, ctx) {
  if (
    ![scene.width, scene.height, scene.gridSize, scene.metersPerCell].every(Number.isFinite) ||
    scene.gridSize <= 0
  )
    return ctx.t(
      "Inserisci misure valide per aggiornare l’anteprima.",
      "Enter valid measurements to update the preview.",
    );
  const cells = [
    Math.round((scene.width / scene.gridSize) * 10) / 10,
    Math.round((scene.height / scene.gridSize) * 10) / 10,
  ];
  return ctx.esc(
    `${cells[0]} × ${cells[1]} ${ctx.t("celle", "cells")} · ${scene.metersPerCell} m / ${ctx.t("cella", "cell")}`,
  );
}

function savedActions(ctx, scene) {
  const unsaved = changed();
  return `<div class="prep-live-actions"><p class="muted">${unsaved ? ctx.t("Le azioni qui sotto usano la versione già salvata.", "Actions below use the previously saved version.") : ctx.t("Salvare, condividere e attivare sono azioni separate.", "Saving, sharing and activating are separate actions.")}</p><div class="toolbar"><button class="button" data-prep-share="${ctx.esc(scene.id)}">${scene.revealed ? ctx.t("Gestisci condivisione", "Manage sharing") : ctx.t("Rivela contenuto…", "Reveal content…")}</button><button class="button" data-prep-activate="${ctx.esc(scene.id)}">${ctx.t("Attiva al Tavolo…", "Activate at table…")}</button>${typeof ctx.startEncounter === "function" ? `<button class="button" data-prep-start="${ctx.esc(scene.id)}">${ctx.t("Avvia incontro salvato…", "Start saved encounter…")}</button>` : ""}</div></div>`;
}

function renderPreview(ctx, draft, saved) {
  const players = previewAudience === "players";
  return `<section class="prep-full-preview"><div class="toolbar"><label class="field">${ctx.t("Controlla cosa mostrare", "Check what to show")}<select data-prep-audience><option value="dm" ${players ? "" : "selected"}>${ctx.t("Vista DM", "DM view")}</option><option value="players" ${players ? "selected" : ""}>${ctx.t("Contenuto da rivelare al gruppo", "Content to reveal to the party")}</option></select></label><span class="badge">${ctx.t("Anteprima: non condivisa", "Preview: not shared")}</span></div><h2>${ctx.esc(draft.name)}</h2>${draft.publicDescription ? `<p class="prep-prose">${ctx.esc(draft.publicDescription)}</p>` : ""}<div>${mapPreview(draft, ctx, { players })}</div><p class="prep-map-caption">${metrics(draft, ctx)}</p>${players ? `<p class="muted">${ctx.t("Con Rivela condividi nome, mappa e descrizione pubblica. Le note DM e le pedine restano fuori da questo contenuto.", "Reveal shares the name, map and public description. DM notes and tokens are not part of this content.")}</p>` : `<h3>${ctx.t("Note DM", "DM notes")}</h3><p class="prep-prose">${ctx.esc(draft.description || ctx.t("Nessuna nota riservata.", "No private notes."))}</p>`}${saved ? savedActions(ctx, saved) : ""}</section>`;
}

// Section tabs when areas add Preparation sections (B11); none keeps the page unchanged.
// B62: the sections join PREPARATION_GROUPS (Foundry's sidebar directories, Roll20's page
// toolbar): the groups are the first strip, the open group's sections a second one; a
// section without a group keeps its own entry in the first strip.
export function prepSectionModel(ctx) {
  const items = ctx.registry?.merge("preparation-section", [{ id: "scenes" }], ctx) ?? [];
  const known = new Set(PREPARATION_GROUPS.map((g) => g.id));
  const groupOf = (item) => (item.core ? "scenes" : known.has(item.group) ? item.group : null);
  const name = (item) =>
    item.core ? ctx.t("Scene", "Scenes") : ctx.esc(ctx.registry.label(item, ctx.lang));
  const entries = [
    ...PREPARATION_GROUPS.map((group) => ({
      id: group.id,
      order: group.order,
      name: ctx.esc(ctx.t(group.label.it, group.label.en)),
      sections: items.filter((item) => groupOf(item) === group.id),
    })).filter((group) => group.sections.length),
    ...items
      .filter((item) => !groupOf(item))
      .map((item) => ({
        id: item.id,
        order: 100 + item.order,
        name: name(item),
        sections: [item],
      })),
  ].sort((x, y) => x.order - y.order);
  return {
    count: items.length,
    groups: entries.map((group) => ({
      ...group,
      sections: group.sections.map((item) => ({ id: item.id, name: name(item) })),
    })),
  };
}
function prepSections(ctx, current) {
  const model = prepSectionModel(ctx);
  if (model.count < 2) return "";
  const open = model.groups.find((group) => group.sections.some((x) => x.id === current));
  const all = ctx.t("Tutte le sezioni della preparazione", "All preparation sections");
  const allButton = `<button type="button" class="prep-sections-all" data-prep-sections-all aria-haspopup="dialog" aria-label="${all}" title="${all}">${ctx.icon?.("grid") ?? ""}<span aria-hidden="true">${ctx.t("Tutte", "All")}</span></button>`;
  const sectionButton = (item) =>
    `<button type="button" class="${item.id === current ? "active" : ""}" data-prep-section="${ctx.esc(item.id)}" ${item.id === current ? 'aria-current="page"' : ""}>${item.name}</button>`;
  // A single group needs no group strip: its sections are the strip (as before B62).
  if (model.groups.length === 1)
    return `<div class="prep-sections-bar"><nav class="tabs prep-sections" aria-label="${ctx.t("Sezioni della preparazione", "Preparation sections")}">${model.groups[0].sections.map(sectionButton).join("")}</nav>${allButton}</div>`;
  // A group of one section opens that section: its button is the section's own handle.
  const primary = model.groups
    .map((group) => {
      const on = group === open;
      const single =
        group.sections.length === 1 ? ` data-prep-section="${ctx.esc(group.sections[0].id)}"` : "";
      // PR-06: a number beside «Scene» is the number of scenes in the list (Roll20's page
      // count), never the number of sub-sections, which the second strip already shows.
      const count =
        group.id === "scenes"
          ? ` <span class="prep-group-count" title="${ctx.t("Scene nell’elenco", "Scenes in the list")}">${ctx.state.scenes.length}</span>`
          : "";
      return `<button type="button" class="${on ? "active" : ""}" data-prep-group="${ctx.esc(group.id)}"${single} ${on ? 'aria-current="page"' : ""}>${group.name}${count}</button>`;
    })
    .join("");
  const secondary =
    open && open.sections.length > 1
      ? `<nav class="prep-sections is-sub" aria-label="${open.name}">${open.sections.map(sectionButton).join("")}</nav>`
      : "";
  return `<div class="prep-sections-bar"><nav class="tabs prep-groups" aria-label="${ctx.t("Sezioni della preparazione", "Preparation sections")}">${primary}</nav>${allButton}</div>${secondary}`;
}

// B57 hook (additive): create commands of areas beside the page's own create button, i.e.
// `command` contributions with context "preparation" and group "preparation-create",
// filtered by their own roles and `when` (procedural generators, Kobold+ "Generate").
// Without such commands the markup is unchanged. The scene editor's map tools use the
// group "preparation-scene-map" (Owlbear Forecast sits in the map's tools, VTL-065).
function prepCreateActions(ctx, own = "", group = "preparation-create") {
  const commands = (ctx.registry?.list("command", ctx) ?? []).filter(
    (c) => c.context === "preparation" && c.group === group,
  );
  if (!commands.length) return own;
  return `<div class="toolbar prep-create-actions">${commands.map((c) => `<button type="button" class="button" data-prep-command="${ctx.esc(c.id)}">${ctx.esc(ctx.registry.label(c, ctx.lang))}</button>`).join("")}${own}</div>`;
}

// B57 hook (additive): opens a scene draft in this editor, unsaved until "Save
// preparation": a new scene produced elsewhere (generated dungeon) or a saved scene with
// proposed changes (confirmed wall proposals). An unsaved editor draft is confirmed first;
// from another scene's editor the list is shown first, so the shell guard does not ask again.
// `patch` may be a function of the draft, called only when the draft is actually opened;
// then an unsaved draft of the same scene receives it and keeps the DM's own changes.
export function openSceneDraft(ctx, scene, patch = {}) {
  const changes = () => structuredClone(typeof patch === "function" ? patch(editor.draft) : patch);
  if (typeof patch === "function" && editor?.id === scene.id && changed()) {
    Object.assign(editor.draft, changes());
    ctx.navigate("preparation", { id: scene.id, tab: "edit" });
    return;
  }
  const open = () => {
    editor = null;
    if (ctx.view.page === "preparation" && ctx.view.id && ctx.view.id !== scene.id)
      ctx.navigate("preparation", {});
    beginEditor(ctx, scene);
    Object.assign(editor.draft, changes());
    ctx.navigate("preparation", { id: scene.id, tab: "edit" });
  };
  if (changed()) confirmDiscard(ctx, open);
  else open();
}
// B57 hook (additive): a copy of the editor's unsaved scene draft, or null, so an area can
// work on the map the DM is editing (Forecast wall detection on a map not saved yet).
export function currentSceneDraft() {
  return changed() ? structuredClone(editor.draft) : null;
}

const isPrefabRoute = (ctx) =>
  SAP.scenesAreaReady(ctx.state) && String(ctx.view.id ?? "").startsWith("prefab:");
export function renderPreparation(ctx) {
  if (!runs(ctx))
    return `<div class="empty-state"><h1>${ctx.t("Preparazione riservata ai DM", "Preparation is reserved for DMs")}</h1><p>${ctx.t("La tua scheda e il Tavolo restano disponibili.", "Your character sheet and the table remain available.")}</p><button class="button" data-prep-campaign>${ctx.t("Torna alla campagna", "Return to campaign")}</button></div>`;
  // An area section may also receive an item id (B25 search hits); scene tabs ("edit",
  // "preview") are never registered sections, so scene routes are unchanged.
  const section = ctx.view.tab ? ctx.registry?.get("preparation-section", ctx.view.tab, ctx) : null;
  if (section)
    return `<section class="prep-collection"><div class="page-heading"><div><h1>${ctx.t("Preparazione", "Preparation")}</h1><p class="muted">${ctx.esc(ctx.state.campaign.name)} · ${ctx.esc(ctx.registry.label(section, ctx.lang))}</p></div>${prepCreateActions(ctx)}</div>${prepSections(ctx, section.id)}${ctx.registry.slot("preparation-section", section, ctx)}</section>`;
  // A prefab is edited like a small scene (Owlbear Prefabs), reached from the Oggetti tab.
  if (isPrefabRoute(ctx)) return SAP.renderPrep(ctx);
  const selected =
    ctx.view.id &&
    !SAP.isMenuRoute(ctx.view.id) &&
    (ctx.state.scenes.find((scene) => scene.id === ctx.view.id) ||
      (editor?.id === ctx.view.id && !editor.original ? editor.draft : null));
  if (ctx.view.id && !selected && !SAP.isMenuRoute(ctx.view.id))
    return `<div class="empty-state"><h1>${ctx.t("Scena non disponibile", "Scene unavailable")}</h1><button class="button" data-prep-back>${ctx.t("Torna alle scene", "Return to scenes")}</button></div>`;
  if (selected) return renderEditor(ctx, selected);
  const area = SAP.scenesAreaReady(ctx.state);
  const list = area
    ? SAP.renderSceneBrowser(ctx, (scene, path) => sceneRow(ctx, scene, path))
    : `<div class="toolbar prep-collection-toolbar"><label class="field">${ctx.t("Cerca nelle scene", "Search scenes")}<input type="search" data-prep-search placeholder="${ctx.t("Nome della scena", "Scene name")}"></label></div><div class="prep-scene-list">${ctx.state.scenes.map((scene) => sceneRow(ctx, scene)).join("")}</div><p class="empty-state" data-prep-no-results hidden>${ctx.t("Nessuna scena corrisponde alla ricerca.", "No scenes match your search.")}</p>`;
  const empty = ctx.state.scenes.length
    ? ""
    : `<div class="empty-state"><h2>${ctx.t("Nessuna scena preparata", "No scenes prepared")}</h2><p>${ctx.t("Parti da una griglia vuota, da una base, dalla tua immagine, da un file Universal VTT o da una scena di teatro della mente.", "Start from an empty grid, a template, your own image, a Universal VTT file or a theatre-of-the-mind scene.")}</p><button class="button" data-prep-new>${ctx.t("Crea la prima scena", "Create your first scene")}</button></div>`;
  return `<section class="prep-collection"><div class="page-heading"><div><h1>${ctx.t("Preparazione", "Preparation")}</h1><p class="muted">${ctx.esc(ctx.state.campaign.name)} · ${ctx.t("Scene e mappe", "Scenes and maps")}</p></div>${prepCreateActions(ctx, `<button class="button primary" data-prep-new>${ctx.icon?.("plus") ?? ""} ${ctx.t("Nuova scena", "New scene")}</button>`)}</div>${prepSections(ctx, "scenes")}
    ${list}${empty}<div class="toolbar prep-collection-footer"><button class="button quiet" data-prep-campaign>${ctx.t("Torna alla campagna", "Return to campaign")}</button></div>${initiativeHistory(ctx)}</section>`;
}

// One row of the scene list (Roll20 Page Menu): open, preview, and «Altre azioni» with
// sharing, activation, folder, duplicate, archive and delete in one menu.
function sceneRow(ctx, scene, path = null) {
  const id = ctx.esc(scene.id);
  const area = SAP.scenesAreaReady(ctx.state);
  const where = path
    ? `<p class="muted prep-scene-path">${path.length ? path.map((p) => ctx.esc(p.name)).join(" › ") : ctx.t("Tutte le scene", "All scenes")}</p>`
    : "";
  const mapless = isMapless(ctx, scene);
  return `<article class="prep-scene-row" data-prep-scene-name="${ctx.esc(scene.name.toLowerCase())}" ${area ? `data-sa-scene-card="${id}" draggable="true"` : ""}><button class="prep-scene-thumb" data-prep-open="${id}" aria-label="${ctx.esc(ctx.t("Modifica ", "Edit ") + scene.name)}">${mapPreview(scene, ctx, { small: true })}</button><div class="prep-scene-info"><h2><button data-prep-open="${id}">${ctx.esc(scene.name)}</button></h2>${where}<p class="muted">${ctx.esc(scene.publicDescription || ctx.t("Nessuna descrizione pubblica", "No public description"))}</p><div class="toolbar"><span class="badge">${scene.revealed ? ctx.t("Consultabile dal gruppo", "Viewable by the party") : ctx.t("Riservata ai DM", "DM only")}</span>${scene.id === ctx.state.activeSceneId ? `<span class="badge">${ctx.t("Attiva al Tavolo", "Active at table")}</span>` : ""}${mapless ? `<span class="badge">${ctx.t("Teatro della mente", "Theatre of the mind")}</span>` : ""}${area ? SAP.sceneRowBadges(ctx, scene) : ""}<span class="muted">${scene.width} × ${scene.height} px</span></div></div><div class="prep-scene-actions"><button class="button" data-prep-open="${id}">${ctx.t("Modifica", "Edit")}</button><button class="button quiet" data-prep-preview="${id}">${ctx.t("Apri per me", "Open for me")}</button><details class="prep-menu"><summary>${ctx.t("Altre azioni", "More actions")}</summary><div><button data-prep-share="${id}">${scene.revealed ? ctx.t("Gestisci condivisione", "Manage sharing") : ctx.t("Rivela contenuto…", "Reveal content…")}</button><button data-prep-activate="${id}">${ctx.t("Attiva al Tavolo…", "Activate at table…")}</button>${area ? SAP.sceneRowMenu(ctx, scene) : `<button data-prep-copy="${id}">${ctx.t("Duplica mappa e note…", "Duplicate map and notes…")}</button>`}${copyToAvailable(ctx) ? `<button data-prep-copy-to="${id}">${ctx.t("Copia in un’altra campagna…", "Copy to another campaign…")}</button>` : ""}<button data-prep-delete="${id}">${ctx.t("Elimina scena…", "Delete scene…")}</button></div></details></div></article>`;
}
// CA-88 (C5, Roll20 Transmogrifier): the campaign data area's one copy entry, when it runs.
const copyToAvailable = (ctx) =>
  Boolean(ctx.registry?.get?.("campaign-section", "campaign-data", ctx));
// A map-less scene made for theatre of the mind (the handouts area's stage).
function isMapless(ctx, scene) {
  return Boolean(ctx.state.ext?.handouts?.stages?.[scene.id]);
}

// «Nuova scena» offers every starting point in one place (DDB's scene types with Theater
// of the Mind, Roll20's and Foundry's Universal VTT import, Foundry's background image).
export function openNewSceneDialog(ctx, start = "blank") {
  if (!runs(ctx)) {
    ctx.toast(errorText(ctx, new Error("unauthorized")), true);
    return;
  }
  const area = SAP.scenesAreaReady(ctx.state);
  const theater = Boolean(ctx.state.ext?.handouts);
  const kinds = [
    [
      "blank",
      "Griglia vuota",
      "Empty grid",
      "Disegni tu muri e stanze; l’immagine puoi caricarla dopo.",
      "You draw walls and rooms; you can upload a picture later.",
    ],
    ...(area
      ? [
          [
            "image",
            "Dalla mia immagine",
            "From my picture",
            "PNG, JPG o WebP; subito dopo allinei la griglia.",
            "PNG, JPG or WebP; right after, you align the grid.",
          ],
        ]
      : []),
    [
      "courtyard",
      "Cortile: base geometrica",
      "Courtyard: geometric base",
      "Una base pronta da modificare.",
      "A ready-made base to edit.",
    ],
    [
      "camp",
      "Accampamento: base geometrica",
      "Camp: geometric base",
      "Una base pronta da modificare.",
      "A ready-made base to edit.",
    ],
    ...(theater
      ? [
          [
            "theater",
            "Teatro della mente (senza mappa)",
            "Theatre of the mind (no map)",
            "Un’immagine e una descrizione, nessuna griglia: per le scene narrative.",
            "A picture and a description, no grid: for narrative scenes.",
          ],
        ]
      : []),
    ...(area
      ? [
          [
            "uvtt",
            "Importa Universal VTT (.dd2vtt, .uvtt)",
            "Import Universal VTT (.dd2vtt, .uvtt)",
            "Mappa con muri, porte e luci da Dungeondraft, DungeonFog e simili.",
            "A map with walls, doors and lights from Dungeondraft, DungeonFog and similar.",
          ],
        ]
      : []),
  ];
  const chosen = kinds.some(([id]) => id === start) ? start : "blank";
  // The name is the radio's label; the one-line hint describes it (aria-describedby).
  const option = ([id, it, en, hit, hen]) =>
    `<div class="prep-start"><label><input type="radio" name="template" value="${id}" ${id === chosen ? "checked" : ""} aria-describedby="prep-start-${id}"> <strong>${ctx.t(it, en)}</strong></label><small class="muted" id="prep-start-${id}">${ctx.t(hit, hen)}</small>${id === "image" ? `<input type="file" name="file" accept="image/png,image/jpeg,image/webp" data-prep-new-image aria-label="${ctx.t("Immagine della mappa", "Map picture")}"><small class="muted" data-prep-new-image-status role="status"></small>` : ""}</div>`;
  const folder = area
    ? `<label class="field">${ctx.t("Cartella", "Folder")}<select name="folder">${SAP.sceneFolderOptions(ctx, { current: SAP.openFolder() })}</select></label>`
    : "";
  let picked = null;
  ctx.dialog(
    ctx.t("Nuova scena", "New scene"),
    `<label class="field">${ctx.t("Nome", "Name")}<input name="name" required maxlength="100" value="${ctx.esc(ctx.t("Nuova scena", "New scene"))}"></label><fieldset class="prep-choices prep-starts"><legend>${ctx.t("Punto di partenza", "Starting point")}</legend>${kinds.map(option).join("")}</fieldset>${folder}<p class="muted">${ctx.t("La scena resta riservata ai DM finché non scegli di mostrarla.", "The scene remains private to DMs until you choose to show it.")}</p>`,
    {
      submitLabel: ctx.t("Crea bozza", "Create draft"),
      onSubmit: (data) => {
        if (!runs(ctx)) {
          ctx.toast(errorText(ctx, new Error("unauthorized")), true);
          return false;
        }
        const name = String(data.get("name") || "").trim();
        if (!name) return false;
        const kind = String(data.get("template") || "blank");
        const folderId = data.get("folder") || null;
        if (kind === "image") {
          if (!picked)
            throw Object.assign(new Error("image"), {
              it: "Scegli l’immagine della mappa (e attendi che venga letta).",
              en: "Choose the map picture (and wait for it to be read).",
            });
          SAP.createImageScene(ctx, { name, image: picked, folderId });
          return;
        }
        if (kind === "uvtt") {
          SAP.openUVTT(ctx);
          const field = globalThis.document?.querySelector?.('#dialog [name="name"]');
          if (field && name !== ctx.t("Nuova scena", "New scene")) {
            field.value = name;
            field.dataset.touched = "1";
          }
          const select = globalThis.document?.querySelector?.('#dialog [name="folder"]');
          if (select && folderId) select.value = folderId;
          return;
        }
        if (kind === "theater") {
          void import("./handouts.mjs").then((module) => {
            module.openStageDialog(ctx);
            const field = globalThis.document?.querySelector?.('#dialog [name="name"]');
            if (field && name !== ctx.t("Nuova scena", "New scene")) field.value = name;
          });
          return;
        }
        const draft = {
          id: uniqueId(),
          name,
          template: kind,
          width: 1000,
          height: 650,
          tokens: [],
          walls: [],
          revealed: false,
        };
        beginEditor(ctx, draft);
        editor.folderId = folderId;
        ctx.navigate("preparation", { id: draft.id, tab: "edit" });
      },
    },
  );
  const dialog = globalThis.document?.querySelector?.("#dialog");
  const input = dialog?.querySelector("[data-prep-new-image]");
  const status = dialog?.querySelector("[data-prep-new-image-status]");
  const show = (image) => {
    picked = image;
    if (status) status.textContent = `${image.name} · ${image.width} × ${image.height} px`;
  };
  input?.addEventListener("change", async () => {
    const file = input.files?.[0];
    picked = null;
    if (!file) return;
    const radio = dialog.querySelector('input[name="template"][value="image"]');
    if (radio) radio.checked = true;
    try {
      show(await SAP.readImageFile(file));
    } catch (error) {
      offerShrink(ctx, status, file, error, show);
      input.value = "";
    }
  });
}
// PR-16: an oversized picture is explained (weight and limit) with a one-click fix.
function offerShrink(ctx, holder, file, error, done) {
  if (!holder) return;
  holder.textContent = ctx.label(error.it ? { it: error.it, en: error.en } : error.message);
  holder.classList.add("error");
  if (error.code !== "size") return;
  const button = globalThis.document.createElement("button");
  button.type = "button";
  button.className = "button";
  button.dataset.prepShrink = "";
  button.textContent = ctx.t("Riduci e converti in WebP", "Shrink and convert to WebP");
  button.addEventListener("click", async () => {
    button.disabled = true;
    button.textContent = ctx.t("Riduzione in corso…", "Shrinking…");
    try {
      const image = await SAP.shrinkToWebP(file);
      holder.classList.remove("error");
      done(image);
      holder.textContent += ` · ${ctx.t("ridotta a", "reduced to")} ${SAP.fileSizeText(image.bytes, ctx.lang)}`;
    } catch (failure) {
      holder.textContent = ctx.label(
        failure.it ? { it: failure.it, en: failure.en } : failure.message,
      );
    }
  });
  holder.append(" ", button);
}

function showEditorError(root, text) {
  editor.error = text;
  const output = root.querySelector("[data-prep-global-error]");
  if (output) {
    output.textContent = text;
    output.hidden = !text;
  }
}

function captureForm(root) {
  if (!editor) return;
  root.querySelectorAll("[data-prep-field]").forEach((input) => {
    editor.draft[input.name] =
      input.type === "checkbox"
        ? input.checked
        : input.type === "number"
          ? input.value === ""
            ? NaN
            : Number(input.value)
          : input.value;
  });
}

function updatePreview(root, ctx) {
  const map = root.querySelector("[data-prep-map]");
  if (map) map.innerHTML = mapPreview(editor.draft, ctx, { interactive: true });
  const output = root.querySelector("[data-prep-metrics]");
  if (output) output.innerHTML = metrics(editor.draft, ctx);
  const status = root.querySelector("[data-prep-status]");
  if (status)
    status.textContent = changed()
      ? ctx.t("Modifiche non salvate", "Unsaved changes")
      : ctx.storageError
        ? ctx.t(
            "In questa scheda: salvataggio nel browser non disponibile",
            "In this tab: browser saving unavailable",
          )
        : ctx.t("Versione salvata", "Saved version");
  const note = root.querySelector(".prep-live-actions > .muted");
  if (note)
    note.textContent = changed()
      ? ctx.t(
          "Le azioni qui sotto usano la versione già salvata.",
          "Actions below use the previously saved version.",
        )
      : ctx.t(
          "Salvare, condividere e attivare sono azioni separate.",
          "Saving, sharing and activating are separate actions.",
        );
}

function confirmDiscard(ctx, next) {
  if (!changed()) {
    next();
    return;
  }
  ctx.dialog(
    ctx.t("Scartare le modifiche?", "Discard changes?"),
    `<p>${ctx.t("Le modifiche non salvate a questa scena saranno scartate. La versione salvata resta invariata. I tiri di iniziativa già registrati restano nel registro.", "Unsaved changes to this scene will be discarded. The saved version stays unchanged. Initiative rolls already recorded remain in the history.")}</p>`,
    {
      submitLabel: ctx.t("Scarta modifiche", "Discard changes"),
      onSubmit: () => {
        editor = null;
        next();
      },
    },
  );
}

function saveEditor(root, ctx) {
  captureForm(root);
  if (editor.loading) return;
  if (editor.spatial?.anchor || editor.spatial?.calibration) {
    showEditorError(
      root,
      ctx.t(
        "Completa o annulla il gesto; applica o annulla la calibrazione prima di salvare.",
        "Complete or cancel the gesture; apply or cancel calibration before saving.",
      ),
    );
    return;
  }
  root.querySelectorAll("[data-prep-error]").forEach((element) => {
    element.textContent = "";
  });
  root
    .querySelectorAll("[data-prep-field]")
    .forEach((element) => element.removeAttribute("aria-invalid"));
  const errors = validateSceneDraft(editor.draft);
  if (errors.length) {
    for (const error of errors) {
      const text =
        error.code === "name"
          ? ctx.t(
              "Scrivi un nome di massimo 100 caratteri.",
              "Enter a name of up to 100 characters.",
            )
          : error.code === "range"
            ? ctx.t(
                `Inserisci un numero da ${error.min} a ${error.max}.`,
                `Enter a number from ${error.min} to ${error.max}.`,
              )
            : error.code === "geometry"
              ? errorText(ctx, new Error("geometry-invalid"))
              : ctx.t("Immagine non valida o troppo grande.", "Invalid or oversized image.");
      const node = root.querySelector(`[data-prep-error="${error.field}"]`);
      if (node) node.textContent = text;
      const input = root.querySelector(`[name="${error.field}"]`);
      if (input) input.setAttribute("aria-invalid", "true");
    }
    showEditorError(
      root,
      errorText(
        ctx,
        new Error(
          errors.some((error) => error.code === "geometry") ? "geometry-invalid" : "invalid",
        ),
      ),
    );
    root.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }
  const pending = structuredClone(editor);
  const save = () => {
    const done = commit(
      ctx,
      ctx.t("Preparazione della scena salvata", "Scene preparation saved"),
      (state) => {
        saveSceneDraft(
          state,
          pending.draft,
          ctx.role,
          pending.original,
          pending.pendingActors,
          pending.actorPatches,
        );
        // A new scene goes into the folder chosen in «Nuova scena».
        if (!pending.original && pending.folderId && SAD.sliceOf(state))
          SAD.moveScene(state, ctx.role, pending.id, pending.folderId);
      },
    );
    if (!done) return false;
    editor = null;
    ctx.navigate("preparation", { id: pending.id, tab: "edit" });
    return true;
  };
  const activeActorChanged = Object.keys(pending.actorPatches || {}).some((id) =>
    ctx.state.scenes
      .find((scene) => scene.id === ctx.state.activeSceneId)
      ?.tokens.some((token) => token.actorId === id),
  );
  if (
    ((editor.original && editor.id === ctx.state.activeSceneId) || activeActorChanged) &&
    changed()
  ) {
    ctx.dialog(
      editor.id === ctx.state.activeSceneId
        ? ctx.t("Aggiornare la scena attiva?", "Update the active scene?")
        : ctx.t("Modificare il PNG in gioco?", "Change the NPC in play?"),
      `<p>${ctx.t("Le modifiche alla mappa, alle pedine e ai profili dei PNG in uso saranno visibili al Tavolo. Punti ferita, consumi e combattimento in corso non vengono reimpostati.", "Map, token and in-use NPC profile changes will appear at the table. Hit points, spent resources and ongoing combat are not reset.")}</p>`,
      {
        submitLabel:
          editor.id === ctx.state.activeSceneId
            ? ctx.t("Aggiorna scena attiva", "Update active scene")
            : ctx.t("Salva e aggiorna PNG", "Save and update NPC"),
        onSubmit: save,
      },
    );
  } else save();
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("decode"));
      image.onload = () =>
        resolve({
          url: String(reader.result),
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

// B62 review: choosing a group or a section redraws the page; the keyboard focus then
// returns to the chosen control ("group"/"section") or to the open section ("open", from
// All sections) instead of falling to the document.
let focusAfterDraw = null;
export function bindPreparation(root, ctx) {
  const openSection = (id, focus = null) => {
    focusAfterDraw = focus;
    ctx.navigate("preparation", id === "scenes" ? {} : { tab: id });
  };
  root
    .querySelectorAll("[data-prep-section]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        openSection(
          button.dataset.prepSection,
          button.dataset.prepGroup
            ? `.prep-groups [data-prep-group="${button.dataset.prepGroup}"]`
            : `[data-prep-section="${button.dataset.prepSection}"]:not([data-prep-group])`,
        ),
      ),
    );
  // B62: a group of several sections opens its first one (the open group keeps its section).
  root.querySelectorAll("[data-prep-group]:not([data-prep-section])").forEach((button) =>
    button.addEventListener("click", () => {
      const group = prepSectionModel(ctx).groups.find((g) => g.id === button.dataset.prepGroup);
      if (group && button.getAttribute("aria-current") !== "page")
        openSection(
          group.sections[0].id,
          `.prep-groups [data-prep-group="${button.dataset.prepGroup}"]`,
        );
    }),
  );
  if (focusAfterDraw) {
    const target =
      focusAfterDraw === "open"
        ? (root.querySelector(".prep-sections .active") ??
          root.querySelector(".prep-groups .active"))
        : root.querySelector(focusAfterDraw);
    focusAfterDraw = null;
    target?.focus({ preventScroll: true });
  }
  // W2b2 integration: a redrawn strip starts at its beginning; keep the open section in view,
  // and "All sections" lists every section (B62: grouped), also those off the strip.
  scrollIntoStrip(root.querySelector(".prep-groups"), root.querySelector(".prep-groups .active"));
  scrollIntoStrip(
    root.querySelector(".prep-sections"),
    root.querySelector(".prep-sections .active"),
  );
  root.querySelector("[data-prep-sections-all]")?.addEventListener("click", () => {
    const current =
      root.querySelector(".prep-sections .active")?.dataset.prepSection ??
      root.querySelector(".prep-groups .active")?.dataset.prepSection ??
      (ctx.view.tab && !ctx.view.id ? ctx.view.tab : "scenes");
    ctx.dialog(
      ctx.t("Sezioni della preparazione", "Preparation sections"),
      `<div class="dialog-menu table-panels-menu is-grouped">${prepSectionModel(ctx)
        .groups.map(
          (group) =>
            `<section class="table-panels-group"><div class="table-panels-group-head"><h3>${group.name}</h3></div>${group.sections
              .map((item) => {
                const on = item.id === current;
                return `<button type="button" class="button${on ? " active" : ""}" data-prep-section-jump="${ctx.esc(item.id)}"${on ? ' aria-current="true"' : ""}>${item.name}</button>`;
              })
              .join("")}</section>`,
        )
        .join("")}</div>`,
      { cancelLabel: ctx.t("Chiudi", "Close") },
    );
    globalThis.document?.querySelectorAll("#dialog [data-prep-section-jump]").forEach(
      (b) =>
        (b.onclick = () => {
          const id = b.dataset.prepSectionJump;
          ctx.closeDialog();
          openSection(id, "open");
        }),
    );
  });
  ctx.registry?.bindSlots(root, ctx, { points: ["preparation-section"] });
  // B57 hook (additive): the create commands rendered by prepCreateActions.
  root.querySelectorAll("[data-prep-command]").forEach((button) =>
    button.addEventListener("click", () => {
      const command = ctx.registry?.get("command", button.dataset.prepCommand, ctx);
      if (command) ctx.registry.run(command, ctx);
    }),
  );
  root
    .querySelectorAll("[data-prep-campaign]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        confirmDiscard(ctx, () => ctx.navigate("campaign", { id: ctx.state.campaign.id })),
      ),
    );
  root
    .querySelectorAll("[data-prep-back]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        confirmDiscard(ctx, () => ctx.navigate("preparation")),
      ),
    );
  if (!runs(ctx)) return;
  if (isPrefabRoute(ctx)) {
    SAP.bindPrep(root, ctx);
    return;
  }
  if (root.querySelector("[data-sa-menu]")) SAP.bindSceneBrowser(root, ctx);
  bindMenusClose();
  root
    .querySelectorAll("[data-prep-new]")
    .forEach((button) => button.addEventListener("click", () => openNewSceneDialog(ctx)));
  root.querySelectorAll("[data-prep-open], [data-prep-preview]").forEach((button) =>
    button.addEventListener("click", () => {
      const id = button.dataset.prepOpen || button.dataset.prepPreview;
      const scene = ctx.state.scenes.find((item) => item.id === id);
      if (!scene) return;
      beginEditor(ctx, scene);
      ctx.navigate("preparation", { id, tab: button.dataset.prepPreview ? "preview" : "edit" });
    }),
  );
  root.querySelector("[data-prep-search]")?.addEventListener("input", (event) => {
    let visible = 0;
    const search = event.target.value.toLocaleLowerCase().trim();
    root.querySelectorAll("[data-prep-scene-name]").forEach((row) => {
      row.hidden = !row.dataset.prepSceneName.includes(search);
      if (!row.hidden) visible++;
    });
    root.querySelector("[data-prep-no-results]").hidden = visible > 0;
  });
  root.querySelectorAll("[data-prep-view]").forEach((button) =>
    button.addEventListener("click", () => {
      captureForm(root);
      ctx.navigate("preparation", { id: editor.id, tab: button.dataset.prepView });
    }),
  );
  root.querySelector("[data-prep-audience]")?.addEventListener("change", (event) => {
    previewAudience = event.target.value;
    ctx.render();
  });
  root.querySelectorAll("[data-prep-field]").forEach((input) =>
    input.addEventListener("input", () => {
      captureForm(root);
      showEditorError(root, "");
      updatePreview(root, ctx);
    }),
  );
  root.querySelector("[data-prep-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveEditor(root, ctx);
  });
  root
    .querySelectorAll("[data-prep-save]")
    .forEach((button) => button.addEventListener("click", () => saveEditor(root, ctx)));
  // Owlbear: the grid alignment sits next to the grid settings (PR-03).
  root.querySelector("[data-prep-align]")?.addEventListener("click", () => {
    captureForm(root);
    ctx.navigate("preparation", { id: editor.id, tab: "grid" });
  });
  root.querySelector("[data-prep-cancel]")?.addEventListener("click", () =>
    confirmDiscard(ctx, () => {
      editor = null;
      ctx.navigate("preparation");
    }),
  );
  root.querySelector("[data-prep-upload]")?.addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    editor.oversize = null;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size === 0) {
      showEditorError(
        root,
        ctx.t(
          "Questo file non è un’immagine PNG, JPG o WebP. La mappa precedente è conservata.",
          "This file is not a PNG, JPG or WebP picture. The previous map is preserved.",
        ),
      );
      event.target.value = "";
      return;
    }
    // PR-16 (Owlbear): the weight and the limit, and a one-click shrink to WebP.
    if (file.size > MAX_IMAGE_BYTES) {
      const error = SAP.oversizeError(file);
      editor.oversize = file;
      editor.error = ctx.label({ it: error.it, en: error.en });
      event.target.value = "";
      ctx.render();
      return;
    }
    captureForm(root);
    const targetEditor = editor;
    targetEditor.loading = true;
    ctx.render();
    try {
      const image = await readImage(file);
      if (editor !== targetEditor || !runs(ctx)) return;
      Object.assign(editor.draft, {
        background: image.url,
        imageName: file.name,
        imageWidth: image.width,
        imageHeight: image.height,
      });
      editor.error = "";
    } catch {
      if (editor === targetEditor)
        editor.error = ctx.t(
          "Il file non è leggibile come immagine. La mappa precedente è conservata.",
          "The file cannot be read as an image. The previous map is preserved.",
        );
    } finally {
      targetEditor.loading = false;
      if (editor === targetEditor) ctx.render();
    }
  });
  root.querySelector("[data-prep-shrink]")?.addEventListener("click", async () => {
    const file = editor?.oversize;
    if (!file) return;
    captureForm(root);
    const target = editor;
    target.loading = true;
    ctx.render();
    try {
      const image = await SAP.shrinkToWebP(file);
      if (editor !== target) return;
      Object.assign(editor.draft, {
        background: image.url,
        imageName: image.name,
        imageWidth: image.width,
        imageHeight: image.height,
      });
      editor.error = "";
      editor.oversize = null;
      ctx.toast(
        ctx.t(
          `Mappa ridotta a ${SAP.fileSizeText(image.bytes, "it")} (WebP, ${image.width} × ${image.height} px).`,
          `Map reduced to ${SAP.fileSizeText(image.bytes, "en")} (WebP, ${image.width} × ${image.height} px).`,
        ),
      );
    } catch (error) {
      if (editor === target) editor.error = ctx.label(error.it ? error : error.message);
    } finally {
      target.loading = false;
      if (editor === target) ctx.render();
    }
  });
  root.querySelector("[data-prep-remove-image]")?.addEventListener("click", () => {
    captureForm(root);
    Object.assign(editor.draft, { background: null, imageName: "", imageWidth: 0, imageHeight: 0 });
    ctx.render();
  });
  root.querySelector("[data-prep-image-size]")?.addEventListener("click", () => {
    captureForm(root);
    Object.assign(editor.draft, {
      width: editor.draft.imageWidth,
      height: editor.draft.imageHeight,
    });
    ctx.render();
  });
  const tab = editorTab(ctx.view);
  if (editor && tab === "lights" && toolReady(ctx, tab)) {
    root
      .querySelectorAll("[data-sa-undo]")
      .forEach((node) => node.addEventListener("click", () => ctx.undo()));
    if (ctx.state.scenes.some((scene) => scene.id === editor.id))
      bindPrepLights(root, ctx, editor.id, { note: SAP.noteUndoable });
  } else if (editor && TOOL_TABS.includes(tab) && toolReady(ctx, tab)) {
    const id = editor.id;
    SAP.bindSceneTools(root, ctx, id, tab, {
      scene: editor.draft,
      dirty: Boolean(changed()),
      onAlign: (grid) => {
        const done = SAD.applyGridAlignment({ scenes: [editor.draft] }, ctx.role, id, grid);
        Object.assign(editor.draft, done);
        ctx.navigate("preparation", { id, tab: "edit" });
        ctx.toast(
          ctx.t(
            "Griglia allineata nella bozza: controlla «Griglia e misure» e salva la preparazione.",
            "Grid aligned in the draft: check “Grid and measurements” and save the preparation.",
          ),
        );
      },
      back: () => ctx.navigate("preparation", { id, tab: "edit" }),
    });
  }
  if (tab === "edit") bindTokenAndEncounterTools(root, ctx);
  if (tab === "edit" && editor && EB.sceneEncounterReady(ctx))
    EB.bindSceneEncounter(root.querySelector("[data-eb-scene]"), ctx, editor.id, {
      blocked: () => (editor ? encounterBlocked(ctx) : ""),
    });
  if (tab === "edit" && pendingNPC && editor?.id === pendingNPC) {
    pendingNPC = null;
    npcDialog(root, ctx);
  }
  if (editor && tab === "edit")
    bindSpatialEditor(root, ctx, {
      scene: editor.draft,
      ui: editor.spatial,
      capture: () => captureForm(root),
      redraw: () => updatePreview(root, ctx),
      render: () => ctx.render(),
      onTool: () => {
        editor.placement = null;
        editor.selectedTokenId = null;
      },
    });
  bindSceneActions(root, ctx);
}

// PR-05: an open «Altre azioni» menu closes on a click outside it, on Escape, and when
// another one opens, like a native menu (the page is redrawn, so this is bound once).
const OPEN_MENUS = "details.prep-menu[open], details.sa-card-menu[open], details.sa-create[open]";
let menusBound = false;
function bindMenusClose() {
  const doc = globalThis.document;
  if (menusBound || typeof doc?.addEventListener !== "function") return;
  menusBound = true;
  doc.addEventListener("pointerdown", (event) => {
    doc.querySelectorAll(OPEN_MENUS).forEach((menu) => {
      if (!menu.contains(event.target)) menu.open = false;
    });
  });
  doc.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    doc.querySelectorAll(OPEN_MENUS).forEach((menu) => {
      menu.open = false;
      menu.querySelector("summary")?.focus();
    });
  });
  doc.addEventListener(
    "toggle",
    (event) => {
      const menu = event.target;
      if (!menu?.matches?.("details.prep-menu, details.sa-card-menu") || !menu.open) return;
      doc.querySelectorAll(OPEN_MENUS).forEach((other) => {
        if (other !== menu) other.open = false;
      });
    },
    true,
  );
}

// The delete button stays off until the typed name matches, and the line under the field
// says why (Foundry disables the button; here the reason is written, not guessed).
function bindTypedName(ctx, name) {
  const dialog = globalThis.document?.querySelector?.("#dialog");
  const input = dialog?.querySelector("[data-prep-typed-name]");
  const submit = dialog?.querySelector('button[type="submit"]');
  const hint = dialog?.querySelector("[data-prep-typed-hint]");
  if (!input || !submit) return;
  if (hint?.id) submit.setAttribute("aria-describedby", hint.id);
  const update = () => {
    const ok = sameTypedName(input.value, name);
    submit.disabled = !ok;
    if (hint)
      hint.textContent = ok
        ? ctx.t(
            "Il nome corrisponde: puoi eliminare la scena.",
            "The name matches: you can delete the scene.",
          )
        : input.value.trim()
          ? ctx.t(
              "Il nome non corrisponde ancora: controlla le lettere (maiuscole, apostrofi e trattini non contano).",
              "The name does not match yet: check the letters (capitals, apostrophes and dashes do not matter).",
            )
          : ctx.t(
              "Il pulsante si attiva quando il nome corrisponde (maiuscole, apostrofi e trattini non contano).",
              "The button turns on when the name matches (capitals, apostrophes and dashes do not matter).",
            );
  };
  input.addEventListener("input", update);
  update();
}

// PR-05 (Foundry's typed title, compared the way people type it): typographic quotes and
// dashes, repeated spaces and letter case do not matter; the letters themselves do.
export function normalizeTypedName(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u00B4\u0060]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u00AB\u00BB]/g, '"')
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}
export const sameTypedName = (typed, name) =>
  normalizeTypedName(typed) !== "" && normalizeTypedName(typed) === normalizeTypedName(name);

function bindSceneActions(root, ctx) {
  root.querySelectorAll("[data-prep-copy-to]").forEach((button) =>
    button.addEventListener("click", () => {
      const pick = "scene:" + button.dataset.prepCopyTo;
      // Loaded on demand: the campaign data area stays optional for Preparation.
      void import("./campaign-data.mjs")
        .then((module) => module.openCopyTo(ctx, pick))
        .catch(() =>
          ctx.toast(
            ctx.t(
              "La copia tra campagne non è disponibile ora.",
              "Copying between campaigns is not available now.",
            ),
            true,
          ),
        );
    }),
  );
  root
    .querySelectorAll("[data-prep-start]")
    .forEach((button) =>
      button.addEventListener("click", () => ctx.startEncounter?.(button.dataset.prepStart)),
    );
  root.querySelectorAll("[data-prep-copy]").forEach((button) =>
    button.addEventListener("click", () => {
      const scene = ctx.state.scenes.find((item) => item.id === button.dataset.prepCopy);
      if (!scene) return;
      ctx.dialog(
        ctx.t("Duplica mappa e note", "Duplicate map and notes"),
        `<p>${ctx.t("Crea una scena privata con mappa, griglia e note. Le pedine e la condivisione non vengono copiate.", "Create a private scene with the map, grid and notes. Tokens and sharing are not copied.")}</p><label class="field">${ctx.t("Nome della copia", "Copy name")}<input name="name" required maxlength="100" value="${ctx.esc(scene.name + ctx.t(" — copia", " — copy"))}"></label>`,
        {
          submitLabel: ctx.t("Crea copia", "Create copy"),
          onSubmit: (data) => {
            const id = uniqueId();
            if (
              !commit(ctx, ctx.t("Mappa duplicata", "Map duplicated"), (state) =>
                duplicateScene(state, scene.id, id, String(data.get("name") || ""), ctx.role),
              )
            )
              return false;
            editor = null;
            ctx.navigate("preparation", { id, tab: "edit" });
          },
        },
      );
    }),
  );
  root.querySelectorAll("[data-prep-delete]").forEach((button) =>
    button.addEventListener("click", () => {
      const scene = ctx.state.scenes.find((item) => item.id === button.dataset.prepDelete);
      if (!scene) return;
      if (scene.id === ctx.state.activeSceneId) {
        ctx.toast(errorText(ctx, new Error("active")), true);
        return;
      }
      ctx.dialog(
        ctx.t("Elimina scena", "Delete scene"),
        `<p>${ctx.t("Elimini questa preparazione dalla campagna. I personaggi collegati restano nelle loro schede. Subito dopo puoi rimediare con «Annulla» nell’elenco delle scene o con Ctrl/Cmd+Z.", "Remove this preparation from the campaign. Linked characters remain in their sheets. Right after, you can take it back with “Undo” in the scene list or Ctrl/Cmd+Z.")}</p><label class="field">${ctx.t("Per confermare, scrivi il nome della scena", "To confirm, type the scene’s name")} <strong>${ctx.esc(scene.name)}</strong><input name="confirmation" required autocomplete="off" data-prep-typed-name aria-describedby="prep-typed-hint"></label><p class="muted" id="prep-typed-hint" data-prep-typed-hint role="status">${ctx.t("Il pulsante si attiva quando il nome corrisponde (maiuscole, apostrofi e trattini non contano).", "The button turns on when the name matches (capitals, apostrophes and dashes do not matter).")}</p>`,
        {
          submitLabel: ctx.t("Elimina scena", "Delete scene"),
          onSubmit: (data, form) => {
            if (!sameTypedName(data.get("confirmation"), scene.name)) {
              const input = form.elements.namedItem("confirmation");
              input.setCustomValidity(
                ctx.t(
                  "Il nome non corrisponde a quello della scena.",
                  "The name does not match the scene’s name.",
                ),
              );
              input.reportValidity();
              input.addEventListener("input", () => input.setCustomValidity(""), { once: true });
              return false;
            }
            if (
              !commit(ctx, ctx.t("Scena eliminata", "Scene deleted"), (state) =>
                deleteScene(state, scene.id, ctx.role),
              )
            )
              return false;
            editor = null;
            ctx.navigate("preparation");
          },
        },
      );
      bindTypedName(ctx, scene.name);
    }),
  );
  root.querySelectorAll("[data-prep-share]").forEach((button) =>
    button.addEventListener("click", () => {
      const scene = ctx.state.scenes.find((item) => item.id === button.dataset.prepShare);
      if (!scene) return;
      ctx.dialog(
        ctx.t("Visibilità del contenuto", "Content visibility"),
        `<p><strong>${ctx.esc(scene.name)}</strong></p><fieldset class="prep-choices"><legend>${ctx.t("Chi può consultare nome, mappa e descrizione pubblica?", "Who can view the name, map and public description?")}</legend><label><input type="radio" name="audience" value="dm" ${scene.revealed ? "" : "checked"}> ${ctx.t("Solo DM", "DM only")}</label><label><input type="radio" name="audience" value="all" ${scene.revealed ? "checked" : ""}> ${ctx.t("Tutto il gruppo", "The whole party")}</label></fieldset><p>${ctx.t("Le note DM e le pedine non fanno parte del contenuto condiviso. La scena al Tavolo non cambia. Revocare l’accesso non cancella quello che è già stato letto.", "DM notes and tokens are not part of the shared content. The table scene does not change. Revoking access cannot erase what was already read.")}</p>`,
        {
          submitLabel: ctx.t("Salva visibilità", "Save visibility"),
          onSubmit: (data) =>
            commit(
              ctx,
              ctx.t("Visibilità della scena aggiornata", "Scene visibility updated"),
              (state) => setSceneSharing(state, scene.id, data.get("audience") === "all", ctx.role),
            ),
        },
      );
    }),
  );
  root.querySelectorAll("[data-prep-activate]").forEach((button) =>
    button.addEventListener("click", () => {
      const scene = ctx.state.scenes.find((item) => item.id === button.dataset.prepActivate);
      if (!scene) return;
      const active = ctx.state.scenes.find((item) => item.id === ctx.state.activeSceneId);
      ctx.dialog(
        ctx.t("Attiva al Tavolo", "Activate at table"),
        `<p>${ctx.t("Scena di destinazione", "Destination scene")}: <strong>${ctx.esc(scene.name)}</strong></p><label class="field">${ctx.t("Partecipanti", "Participants")}<select name="audience"><option value="all">${ctx.t("Tutto il gruppo", "The whole party")}</option></select></label><p>${ctx.t("La vista del gruppo passerà da", "The party view will move from")} <strong>${ctx.esc(active?.name || ctx.t("nessuna scena", "no scene"))}</strong> ${ctx.t("a questa scena. Non trasferisce pedine e non avvia un combattimento.", "to this scene. This does not transfer tokens or start combat.")}</p>`,
        {
          submitLabel: ctx.t("Attiva per il gruppo", "Activate for the party"),
          onSubmit: () => {
            if (
              !commit(ctx, ctx.t("Scena attivata al Tavolo", "Scene activated at table"), (state) =>
                activateScene(state, scene.id, ctx.role),
              )
            )
              return false;
            ctx.navigate("table");
          },
        },
      );
    }),
  );
}

export function createSceneNPC(state, input, role) {
  requireDM(role, state);
  const team = input.team ?? "neutral";
  if (!validNPCTeam(team)) throw new Error("team-invalid");
  if (state.actors[input.id]) throw new Error("conflict");
  const { hp, ac, speed } = input;
  if (
    !input.id ||
    !input.name?.trim() ||
    input.name.trim().length > 100 ||
    !Number.isInteger(hp) ||
    hp < 1 ||
    hp > 100000 ||
    !Number.isInteger(ac) ||
    ac < 0 ||
    ac > 100 ||
    !Number.isFinite(speed) ||
    speed < 0 ||
    speed > 1000
  )
    throw new Error("invalid");
  state.actors[input.id] = {
    id: input.id,
    name: input.name.trim(),
    kind: "npc",
    owner: "dm",
    hp,
    maxHp: hp,
    ac,
    speed,
    movement: speed,
    action: true,
    bonus: true,
    reaction: true,
    level: 1,
    className: { it: "PNG personalizzato", en: "Custom NPC" },
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    slots: { used: 0, max: 0 },
    inventory: [],
    notes: "",
    combatProfile: { team },
    provenance: { kind: "authored-demo", edition: "custom", revision: 1 },
  };
  return state.actors[input.id];
}

export function duplicateSceneNPC(state, sourceId, id, name, role, team) {
  requireDM(role, state);
  const source = state.actors[sourceId];
  if (
    !source ||
    source.kind !== "npc" ||
    source.companion ||
    source.activeForm ||
    !canViewActor(source, role, state)
  )
    throw new Error("actor-missing");
  const disposition = team ?? npcTeam(source);
  if (!validNPCTeam(disposition)) throw new Error("team-invalid");
  if (state.actors[id]) throw new Error("conflict");
  if (!id || !name?.trim() || name.trim().length > 100) throw new Error("invalid");
  state.actors[id] = { ...structuredClone(source), id, name: name.trim() };
  state.actors[id].combatProfile = { ...state.actors[id].combatProfile, team: disposition };
  delete state.actors[id].personalPlans;
  delete state.actors[id].futurePlan;
  return state.actors[id];
}

function scenePoint(scene, point) {
  if (![point.x, point.y].every(Number.isFinite)) throw new Error("invalid");
  const size = Number(scene.gridSize) || 50;
  const snap = (value, offset) =>
    Math.round((value - offset - size / 2) / size) * size + offset + size / 2;
  return {
    x: Math.max(
      20,
      Math.min(
        scene.width - 20,
        scene.gridSnap ? snap(point.x, Number(scene.gridOffsetX) || 0) : point.x,
      ),
    ),
    y: Math.max(
      20,
      Math.min(
        scene.height - 20,
        scene.gridSnap ? snap(point.y, Number(scene.gridOffsetY) || 0) : point.y,
      ),
    ),
  };
}

export function placeSceneToken(state, sceneId, actorId, point, tokenId, role) {
  requireDM(role, state);
  const scene = findScene(state, sceneId);
  if (
    !isActorAvailable(state.actors[actorId]) ||
    !canViewActor(state.actors[actorId], role, state) ||
    !isCampaignActor(state.actors[actorId], state.campaign?.id)
  )
    throw new Error("actor-missing");
  if (scene.tokens.some((token) => token.actorId === actorId || token.id === tokenId))
    throw new Error("already-placed");
  scene.tokens.push({ id: tokenId, actorId, ...scenePoint(scene, point) });
}

export function removeSceneToken(state, sceneId, tokenId, role) {
  requireDM(role, state);
  const scene = findScene(state, sceneId);
  const token = scene.tokens.find((token) => token.id === tokenId);
  if (!token) throw new Error("missing");
  scene.tokens = scene.tokens.filter((item) => item.id !== tokenId);
  if (scene.encounter)
    scene.encounter.participants = scene.encounter.participants.filter(
      (row) => row.actorId !== token.actorId,
    );
}

function validParticipants(rows, actors, tokens, allowMissing) {
  if (!Array.isArray(rows)) return false;
  const ids = new Set();
  return rows.every((row) => {
    if (
      !isActorAvailable(actors[row.actorId]) ||
      !tokens.some((token) => token.actorId === row.actorId) ||
      ids.has(row.actorId)
    )
      return false;
    ids.add(row.actorId);
    return (
      ((allowMissing && row.natural === null) ||
        (Number.isInteger(row.natural) && row.natural >= 1 && row.natural <= 20)) &&
      Number.isInteger(row.bonus) &&
      row.bonus >= -100 &&
      row.bonus <= 100 &&
      ["digital", "physical"].includes(row.mode)
    );
  });
}

export function getPreparedEncounter(state, sceneId, role) {
  requireDM(role, state);
  const scene = findScene(state, sceneId);
  const participants = structuredClone(scene.encounter?.participants || []);
  const reasons = [];
  if (
    participants.some((row) =>
      (state.initiativeRolls || []).some(
        (roll) => roll.id === row.rollId && roll.status === "reversed",
      ),
    )
  )
    reasons.push("initiative-reversed");
  if (!participants.length) reasons.push("no-participants");
  else if (!validParticipants(participants, state.actors, scene.tokens, false))
    reasons.push("initiative-incomplete");
  return {
    sceneId,
    name: scene.encounter?.name || scene.name,
    ready: reasons.length === 0,
    reasons,
    order: participants.map((row) => row.actorId),
    participants,
  };
}

export function startPreparedEncounter(state, sceneId, role) {
  requireDM(role, state);
  if (state.combat.active) throw new Error("combat-active");
  if (state.activeSceneId !== sceneId) throw new Error("scene-inactive");
  const prepared = getPreparedEncounter(state, sceneId, role);
  if (!prepared.ready) throw new Error("initiative-incomplete");
  // TV-46: the players' roll call ends when the combat starts.
  delete findScene(state, sceneId).encounter?.rollCall;
  state.combat = {
    active: true,
    sceneId,
    encounterId: crypto.randomUUID(),
    round: 1,
    turn: 0,
    order: prepared.order,
    initiative: prepared.participants,
  };
  const first = state.actors[prepared.order[0]];
  observeRestEvent(state, {
    eventId: state.combat.encounterId + ":initiative",
    actorIds: prepared.order,
    cause: "initiative",
  });
  resetTurnMovement(first);
  Object.assign(first, {
    action: true,
    bonus: true,
    reaction: true,
    objectInteractionUsed: false,
  });
}

function draftState(ctx) {
  const actors = { ...ctx.state.actors, ...editor.pendingActors };
  for (const [id, patch] of Object.entries(editor.actorPatches || {})) {
    if (actors[id])
      actors[id] = {
        ...actors[id],
        combatProfile: {
          ...actors[id].combatProfile,
          meleeAttack: patch.value,
          ...(Object.hasOwn(patch, "team") ? { team: patch.team } : {}),
        },
      };
  }
  return { ...ctx.state, actors, scenes: [editor.draft] };
}

function renderTokenTools(ctx) {
  const state = draftState(ctx);
  const tokens = editor.draft.tokens || [];
  const available = Object.values(state.actors).filter(
    (actor) =>
      canViewActor(actor, ctx.role) &&
      isCampaignActor(actor, state.campaign?.id) &&
      !tokens.some((token) => token.actorId === actor.id),
  );
  const selected = tokens.find((token) => token.id === editor.selectedTokenId);
  const selectedActor = selected && state.actors[selected.actorId];
  return `<section class="prep-token-tools"><h2>${ctx.t("Pedine nella scena", "Scene tokens")}</h2>
    <div class="prep-place-row"><label class="field">${ctx.t("Personaggio o creatura", "Character or creature")}<select data-prep-actor><option value="">${ctx.t("Scegli dalla campagna", "Choose from campaign")}</option>${available.map((actor) => `<option value="${ctx.esc(actor.id)}" ${editor.placement === actor.id ? "selected" : ""}>${ctx.esc(actor.name)}</option>`).join("")}</select></label><button class="button" data-prep-place>${ctx.t("Posiziona sulla mappa", "Place on map")}</button><button class="button" data-prep-new-npc>${ctx.t("Crea PNG…", "Create NPC…")}</button></div>
    ${editor.placement ? `<p class="prep-placement-hint" role="status">${ctx.t("Fai clic sulla mappa per posizionare", "Click the map to place")} <strong>${ctx.esc(state.actors[editor.placement]?.name)}</strong>. ${ctx.t("Invio posiziona al centro, frecce spostano; Escape annulla.", "Enter places at the centre, arrows move; Escape cancels.")} <button class="button quiet" data-prep-place-cancel>${ctx.t("Annulla", "Cancel")}</button></p>` : ""}
    <div class="prep-token-list">${tokens.map((token) => `<button class="button quiet ${selected?.id === token.id ? "active" : ""}" data-prep-select-token="${ctx.esc(token.id)}" aria-pressed="${selected?.id === token.id}">${ctx.esc(state.actors[token.actorId]?.name || "?")}</button>`).join("")}</div>
    ${selectedActor ? `<div class="prep-selected-token"><strong>${ctx.esc(selectedActor.name)}</strong><span>${ctx.t("PF", "HP")} ${selectedActor.hp}/${selectedActor.maxHp} · ${ctx.t("CA", "AC")} ${selectedActor.ac}</span><div class="toolbar"><button class="button quiet" data-prep-remove-token="${ctx.esc(selected.id)}">${ctx.t("Rimuovi pedina", "Remove token")}</button>${selectedActor.kind === "npc" ? `<button class="button" data-prep-duplicate-npc="${ctx.esc(selectedActor.id)}">${ctx.t("Duplica PNG…", "Duplicate NPC…")}</button><button class="button" data-prep-npc-attack="${ctx.esc(selectedActor.id)}">${ctx.t("Attacco e disposizione…", "Attack and disposition…")}</button>` : ""}</div>${selectedActor.kind === "npc" ? attackSummary(ctx, selectedActor) : ""}<p class="muted">${ctx.t("Trascina la pedina o seleziona la mappa e usa le frecce. Rimuovere la pedina conserva la scheda della creatura.", "Drag the token or focus the map and use arrow keys. Removing the token keeps the creature sheet.")}</p></div>` : `<p class="muted">${ctx.t("Seleziona una pedina dalla mappa o dall’elenco. Per preparare la scena non si consumano metri di movimento.", "Select a token on the map or in the list. Preparing the scene does not spend movement.")}</p>`}
  </section>`;
}

function initiativeTotal(row) {
  return Number.isInteger(row.natural) && Number.isInteger(row.bonus)
    ? row.natural + row.bonus
    : null;
}

function renderEncounterTools(ctx) {
  const state = draftState(ctx);
  const rows = editor.draft.encounter?.participants || [];
  const tokens = editor.draft.tokens || [];
  const ordered = [
    ...rows.map((row) => row.actorId),
    ...tokens.map((token) => token.actorId).filter((id) => !rows.some((row) => row.actorId === id)),
  ];
  const plan = getPreparedEncounter(state, editor.id, ctx.role);
  return `<section class="prep-encounter"><h2>${ctx.t("Incontro preparato", "Prepared encounter")}</h2><p class="muted">${ctx.t("Scegli chi partecipa e prepara l’iniziativa. I dadi digitali vengono registrati subito; i valori fisici inseriti vengono registrati con Salva preparazione. Salvare non avvia i turni.", "Choose participants and prepare initiative. Digital dice are recorded immediately; entered physical values are recorded with Save preparation. Saving does not start turns.")}</p>
    <label class="field">${ctx.t("Nome dell’incontro", "Encounter name")}<input data-prep-encounter-name maxlength="100" value="${ctx.esc(editor.draft.encounter?.name || "")}" placeholder="${ctx.esc(editor.draft.name)}"></label>
    ${
      ordered.length
        ? `<ol class="prep-initiative-list">${ordered
            .map((id) => {
              const row = rows.find((item) => item.actorId === id);
              const index = rows.indexOf(row);
              const total = row ? initiativeTotal(row) : null;
              const reversed =
                row &&
                (ctx.state.initiativeRolls || []).some(
                  (roll) => roll.id === row.rollId && roll.status === "reversed",
                );
              return `<li data-prep-initiative-row="${ctx.esc(id)}"><label class="prep-check"><input type="checkbox" data-prep-include="${ctx.esc(id)}" ${row ? "checked" : ""}><strong>${ctx.esc(state.actors[id]?.name || "?")}</strong></label>${row ? `${reversed ? `<p class="error">${ctx.t("Tiro annullato: rilancia o inserisci un nuovo naturale.", "Reversed roll: reroll or enter a new natural result.")}</p>` : ""}<div class="prep-initiative-inputs"><label class="field">${ctx.t("d20 naturale", "Natural d20")}<input type="number" min="1" max="20" step="1" data-prep-initiative="natural" data-actor="${ctx.esc(id)}" value="${row.natural ?? ""}"></label><label class="field">${ctx.t("Bonus totale", "Total bonus")}<input type="number" min="-100" max="100" step="1" data-prep-initiative="bonus" data-actor="${ctx.esc(id)}" value="${row.bonus}"></label>${initiativeConditionHint(ctx, state.actors[id])}<output data-prep-total>${total === null ? ctx.t("Da tirare", "Awaiting roll") : `${row.natural} + (${row.bonus}) = ${total}`}</output><button class="button" data-prep-roll="${ctx.esc(id)}">${row.natural !== null || (ctx.state.initiativeRolls || []).some((roll) => roll.sceneId === editor.id && roll.actorId === id) ? ctx.t("Rilancia d20", "Reroll d20") : ctx.t("Tira d20", "Roll d20")}</button></div><div class="toolbar"><span class="muted" data-prep-roll-mode>${row.mode === "digital" ? ctx.t("Dado digitale", "Digital die") : ctx.t("Dado fisico: inserisci il naturale", "Physical die: enter the natural result")}</span><button class="button quiet" data-prep-order="-1" data-actor="${ctx.esc(id)}" ${index === 0 ? "disabled" : ""} aria-label="${ctx.esc(ctx.t("Anticipa ", "Move earlier: ") + state.actors[id]?.name)}">${ctx.t("Anticipa", "Earlier")}</button><button class="button quiet" data-prep-order="1" data-actor="${ctx.esc(id)}" ${index === rows.length - 1 ? "disabled" : ""} aria-label="${ctx.esc(ctx.t("Posticipa ", "Move later: ") + state.actors[id]?.name)}">${ctx.t("Posticipa", "Later")}</button></div>` : ""}</li>`;
            })
            .join(
              "",
            )}</ol><div class="toolbar"><button class="button" data-prep-sort>${ctx.t("Ordina per iniziativa", "Sort by initiative")}</button><span class="muted" data-prep-encounter-ready>${plan.ready ? ctx.t("Pronto da salvare", "Ready to save") : ctx.t("Seleziona partecipanti e completa i tiri", "Select participants and complete rolls")}</span></div><p class="muted">${ctx.t("A parità decide il tavolo secondo le regole: qui il DM registra l’ordine con Anticipa/Posticipa. Anche una correzione manuale resta esplicita.", "The table resolves ties according to the rules: here the DM records the order with Earlier/Later. A manual correction stays explicit.")}</p>`
        : `<p class="muted">${ctx.t("Posiziona almeno una pedina per scegliere i partecipanti.", "Place at least one token to choose participants.")}</p>`
    }
  </section>`;
}

function editDraft(ctx, callback) {
  if (!runs(ctx) || !editor) return;
  try {
    callback(draftState(ctx));
    editor.error = "";
    ctx.render();
  } catch (error) {
    ctx.toast(errorText(ctx, error), true);
  }
}

function attackSummary(ctx, actor) {
  const profile = actor.combatProfile?.meleeAttack;
  const teamLabel = NPC_TEAMS[npcTeam(actor)];
  const disposition = `<p>${ctx.t("Disposizione", "Disposition")}: <strong>${ctx.esc(teamLabel ? ctx.t(...teamLabel) : npcTeam(actor))}</strong></p>`;
  if (!profile)
    return (
      disposition +
      `<p class="muted">${ctx.t("Nessun attacco in mischia configurato.", "No melee attack configured.")}</p>`
    );
  const damage = profile.damageDice.map((die) => `${die.count}d${die.sides}`).join(" + ");
  const type = DAMAGE_TYPES[profile.damageType];
  return (
    disposition +
    `<p class="prep-attack-summary"><strong>${ctx.esc(ctx.label(profile.name))}</strong> · ${formatNumber(ctx.lang, profile.reachMeters)} m · ${ctx.t("tiro per colpire", "attack bonus")} ${profile.attackBonus >= 0 ? "+" : ""}${profile.attackBonus}<br>${ctx.t("Danni", "Damage")}: ${ctx.esc(damage)} ${profile.damageModifier < 0 ? "−" : "+"} ${Math.abs(profile.damageModifier)} · ${ctx.esc(type ? ctx.t(...type) : profile.damageType)}</p>`
  );
}

function meleeFields(ctx, profile = null) {
  const val = (value) => ctx.esc(value ?? "");
  const die = profile?.damageDice[0];
  return `<details class="prep-attack-fields" ${profile ? "open" : ""}><summary>${ctx.t("Attacco in mischia (facoltativo)", "Melee attack (optional)")}</summary>
    <label class="prep-check"><input type="checkbox" name="meleeEnabled" ${profile ? "checked" : ""}>${ctx.t("Abilita questo attacco", "Enable this attack")}</label>
    <p class="muted" id="prep-melee-why" ${profile ? "hidden" : ""}>${ctx.t("Spunta «Abilita questo attacco» per compilarlo.", "Tick “Enable this attack” to fill it in.")}</p>
    <fieldset data-prep-melee-fields ${profile ? "" : 'disabled aria-describedby="prep-melee-why"'}><legend>${ctx.t("Statistiche dell’attacco", "Attack statistics")}</legend>
    <label class="field">${ctx.t("Nome dell’attacco", "Attack name")}<input name="meleeName" required maxlength="100" value="${val(profile ? ctx.label(profile.name) : "")}"></label>
    <div class="form-grid"><label class="field">${ctx.t("Portata (m)", "Reach (m)")}<input name="meleeReach" type="number" min="0.01" step="any" required placeholder="1.5" value="${val(profile?.reachMeters)}"></label>
    <label class="field">${ctx.t("Bonus totale per colpire", "Total attack bonus")}<input name="meleeAttackBonus" type="number" step="1" required value="${val(profile?.attackBonus)}"></label>
    <label class="field">${ctx.t("Numero di dadi danno", "Number of damage dice")}<input name="meleeDamageCount" type="number" min="1" max="20" step="1" required value="${val(die?.count)}"></label>
    <label class="field">${ctx.t("Dado danno", "Damage die")}<select name="meleeDamageSides" required><option value="">${ctx.t("Scegli il dado", "Choose a die")}</option>${[4, 6, 8, 10, 12, 20].map((sides) => `<option value="${sides}" ${die?.sides === sides ? "selected" : ""}>d${sides}</option>`).join("")}</select></label>
    <label class="field">${ctx.t("Modificatore danni", "Damage modifier")}<input name="meleeDamageModifier" type="number" step="1" required value="${val(profile?.damageModifier)}"></label>
    <label class="field">${ctx.t("Tipo di danno", "Damage type")}<select name="meleeDamageType" required><option value="">${ctx.t("Scegli il tipo", "Choose a type")}</option>${Object.entries(
      DAMAGE_TYPES,
    )
      .map(
        ([id, name]) =>
          `<option value="${id}" ${profile?.damageType === id ? "selected" : ""}>${ctx.t(...name)}</option>`,
      )
      .join("")}</select></label></div></fieldset>
    <p class="muted">${ctx.t("Il bonus per colpire è il totale: non aggiungiamo altri modificatori. Inserisci 0 dove non c’è un bonus. Questa configurazione personalizzata abilita l’attacco normale e, quando consentito, quello di opportunità.", "The attack bonus is the total: no other modifiers are added. Enter 0 where there is no bonus. This custom configuration enables ordinary attacks and, when eligible, opportunity attacks.")}</p>
    <p class="muted">${ctx.t("Disabilitando l’attacco lo rimuovi solo dopo Salva preparazione. Le altre capacità restano invariate.", "Disabling the attack removes it only after Save preparation. Other abilities remain unchanged.")}</p>
  </details>`;
}

function bindMeleeFields() {
  const dialog = document.querySelector("#dialog");
  const checkbox = dialog.querySelector('[name="meleeEnabled"]');
  checkbox?.addEventListener("change", () => {
    const fields = dialog.querySelector("[data-prep-melee-fields]");
    fields.disabled = !checkbox.checked;
    fields.toggleAttribute("aria-describedby", !checkbox.checked);
    if (!checkbox.checked) fields.setAttribute("aria-describedby", "prep-melee-why");
    const why = dialog.querySelector("#prep-melee-why");
    if (why) why.hidden = checkbox.checked;
  });
}

export function meleeProfileFromForm(data) {
  if (!data.has("meleeEnabled")) return null;
  const number = (name) => {
    const value = data.get(name);
    return typeof value === "string" && value.trim() ? Number(value) : NaN;
  };
  return buildMeleeProfile({
    name: data.get("meleeName"),
    reachMeters: number("meleeReach"),
    attackBonus: number("meleeAttackBonus"),
    damageCount: number("meleeDamageCount"),
    damageSides: number("meleeDamageSides"),
    damageModifier: number("meleeDamageModifier"),
    damageType: data.get("meleeDamageType"),
  });
}

function npcAttackDialog(root, ctx, actorId) {
  captureForm(root);
  const actor = draftState(ctx).actors[actorId];
  if (!runs(ctx) || actor?.kind !== "npc") return;
  const profile = actor.combatProfile?.meleeAttack;
  if (profile && !validAuthoredMeleeProfile(profile)) {
    ctx.toast(
      ctx.t(
        "Questo profilo non è modificabile con l’editor di un singolo attacco. I dati esistenti sono conservati.",
        "This profile cannot be edited with the single-attack editor. Existing data is preserved.",
      ),
      true,
    );
    return;
  }
  ctx.dialog(
    ctx.t("Attacco e disposizione: ", "Attack and disposition: ") + actor.name,
    `${npcTeamFields(ctx, actor)}<p>${ctx.t("Dopo Salva preparazione, questa modifica vale per la stessa creatura in tutte le scene. Punti ferita e risorse consumate restano invariati.", "After Save preparation, this change applies to the same creature in every scene. Hit points and spent resources stay unchanged.")}</p>${meleeFields(ctx, profile)}<p class="muted">${ctx.t("Sono statistiche personalizzate, non un blocco di statistiche ufficiale.", "These are custom statistics, not an official stat block.")}</p>`,
    {
      submitLabel: ctx.t("Applica alla bozza", "Apply to draft"),
      onSubmit(data) {
        try {
          stageNPCAttack(
            editor,
            ctx.state,
            actorId,
            meleeProfileFromForm(data),
            ctx.role,
            data.get("npcTeam"),
          );
          ctx.render();
        } catch (error) {
          throw new Error(errorText(ctx, error));
        }
      },
    },
  );
  bindMeleeFields();
}

// PR-41 (Foundry/Roll20 actors directory, reached by name): «Crea PNG» from the palette
// opens the NPC creator in the scene being edited, else in the scene at the Table.
export function openCreateNPC(ctx) {
  if (!runs(ctx)) return;
  const editing = ctx.view.page === "preparation" && editor && ctx.view.id === editor.id;
  const target = editing ? editor.id : editor && changed() ? editor.id : ctx.state.activeSceneId;
  const scene =
    ctx.state.scenes.find((item) => item.id === target) ??
    (editor?.id === target ? editor.draft : null);
  if (!scene) {
    ctx.toast(ctx.t("Crea o apri prima una scena.", "Create or open a scene first."), true);
    return;
  }
  if (editing && editorTab(ctx.view) === "edit") {
    const root = globalThis.document?.querySelector?.("#content");
    if (root) npcDialog(root, ctx);
    return;
  }
  // The editor draws after the route changes: the creator opens once it is bound.
  pendingNPC = scene.id;
  ctx.navigate("preparation", { id: scene.id, tab: "edit" });
}
let pendingNPC = null;

function npcDialog(root, ctx, sourceId = null) {
  captureForm(root);
  const source = sourceId && draftState(ctx).actors[sourceId];
  ctx.dialog(
    ctx.t(source ? "Duplica PNG" : "Crea PNG", source ? "Duplicate NPC" : "Create NPC"),
    `<label class="field">${ctx.t("Nome", "Name")}<input name="name" required maxlength="100" value="${ctx.esc(source ? source.name + ctx.t(" — copia", " — copy") : "")}"></label>${npcTeamFields(ctx, source)}${source ? `<p>${ctx.t("La copia ha punti ferita e risorse indipendenti. Parte dai valori attuali della creatura, compresi eventuali consumi.", "The copy has independent hit points and resources. It starts from the creature’s current values, including spent resources.")}</p>` : `<div class="form-grid"><label class="field">${ctx.t("Punti ferita", "Hit points")}<input name="hp" type="number" min="1" max="100000" value="10" required></label><label class="field">${ctx.t("Classe Armatura", "Armor Class")}<input name="ac" type="number" min="0" max="100" value="12" required></label><label class="field">${ctx.t("Velocità (m)", "Speed (m)")}<input name="speed" type="number" min="0" max="1000" step="0.1" value="9" required></label></div><p class="muted">${ctx.t("Statistiche personalizzate: le sei caratteristiche partono da 10 e sono modificabili dalla scheda. Non è una creatura ufficiale; azioni e capacità complete restano da configurare.", "Custom statistics: all six ability scores start at 10 and can be edited in the sheet. This is not an official creature; full actions and abilities still need configuration.")}</p>${meleeFields(ctx)}`}<p>${ctx.t("Poi scegli il punto sulla mappa. La creatura viene conservata quando salvi la preparazione.", "Then choose a point on the map. The creature is kept when you save preparation.")}</p>`,
    {
      submitLabel: ctx.t("Crea e posiziona", "Create and place"),
      onSubmit(data) {
        if (!runs(ctx) || !editor) throw new Error(errorText(ctx, new Error("unauthorized")));
        const state = draftState(ctx);
        const id = `npc-${crypto.randomUUID()}`;
        try {
          const attack = source ? null : meleeProfileFromForm(data);
          const actor = source
            ? duplicateSceneNPC(
                state,
                source.id,
                id,
                String(data.get("name")),
                ctx.role,
                data.get("npcTeam"),
              )
            : createSceneNPC(
                state,
                {
                  id,
                  name: String(data.get("name")),
                  hp: Number(data.get("hp")),
                  ac: Number(data.get("ac")),
                  speed: Number(data.get("speed")),
                  team: data.get("npcTeam"),
                },
                ctx.role,
              );
          if (attack) actor.combatProfile = { ...actor.combatProfile, meleeAttack: attack };
          editor.pendingActors[id] = actor;
          editor.placement = id;
          editor.spatial.tool = "tokens";
          editor.spatial.anchor = null;
          editor.spatial.calibration = null;
          ctx.render();
          requestAnimationFrame(() => document.querySelector("[data-prep-interactive]")?.focus());
        } catch (error) {
          throw new Error(errorText(ctx, error));
        }
      },
    },
  );
  if (!source) bindMeleeFields();
}

function bindTokenAndEncounterTools(root, ctx) {
  if (!editor || ctx.view.tab === "preview") return;
  root.querySelector("[data-prep-place]")?.addEventListener("click", () => {
    captureForm(root);
    const id = root.querySelector("[data-prep-actor]").value;
    if (!id) {
      ctx.toast(ctx.t("Scegli prima una creatura.", "Choose a creature first."), true);
      return;
    }
    editor.placement = id;
    editor.spatial.tool = "tokens";
    editor.spatial.anchor = null;
    editor.spatial.calibration = null;
    ctx.render();
    document.querySelector("[data-prep-interactive]")?.focus();
  });
  root.querySelector("[data-prep-place-cancel]")?.addEventListener("click", () => {
    editor.placement = null;
    ctx.render();
  });
  root.querySelector("[data-prep-new-npc]")?.addEventListener("click", () => npcDialog(root, ctx));
  root
    .querySelectorAll("[data-prep-duplicate-npc]")
    .forEach((button) =>
      button.addEventListener("click", () => npcDialog(root, ctx, button.dataset.prepDuplicateNpc)),
    );
  root
    .querySelectorAll("[data-prep-npc-attack]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        npcAttackDialog(root, ctx, button.dataset.prepNpcAttack),
      ),
    );
  root.querySelectorAll("[data-prep-select-token]").forEach((button) =>
    button.addEventListener("click", () => {
      captureForm(root);
      editor.selectedTokenId = button.dataset.prepSelectToken;
      editor.placement = null;
      editor.spatial.tool = "tokens";
      editor.spatial.anchor = null;
      editor.spatial.calibration = null;
      ctx.render();
      document.querySelector("[data-prep-interactive]")?.focus();
    }),
  );
  root.querySelectorAll("[data-prep-remove-token]").forEach((button) =>
    button.addEventListener("click", () => {
      captureForm(root);
      editDraft(ctx, (state) => {
        removeSceneToken(state, editor.id, button.dataset.prepRemoveToken, ctx.role);
        editor.selectedTokenId = null;
      });
    }),
  );
  root.querySelector("[data-prep-encounter-name]")?.addEventListener("input", (event) => {
    editor.draft.encounter ||= { name: "", participants: [] };
    editor.draft.encounter.name = event.target.value;
    updatePreview(root, ctx);
  });
  root.querySelectorAll("[data-prep-include]").forEach((input) =>
    input.addEventListener("change", () => {
      captureForm(root);
      editor.draft.encounter ||= { name: "", participants: [] };
      const id = input.dataset.prepInclude;
      if (input.checked)
        editor.draft.encounter.participants.push({
          actorId: id,
          natural: null,
          // TV-46 (P5 shared edit): one bonus source, the sheet's Initiative (Livia +2).
          bonus: initiativeBonus(draftState(ctx), id),
          mode: "physical",
        });
      else
        editor.draft.encounter.participants = editor.draft.encounter.participants.filter(
          (row) => row.actorId !== id,
        );
      ctx.render();
    }),
  );
  root.querySelectorAll("[data-prep-initiative]").forEach((input) =>
    input.addEventListener("input", () => {
      const row = editor.draft.encounter.participants.find(
        (item) => item.actorId === input.dataset.actor,
      );
      row[input.dataset.prepInitiative] = input.value === "" ? null : Number(input.value);
      if (input.dataset.prepInitiative === "natural") {
        row.mode = "physical";
        delete row.rollId;
      }
      const container = input.closest("[data-prep-initiative-row]");
      container.querySelector("[data-prep-total]").textContent =
        initiativeTotal(row) === null
          ? ctx.t("Da tirare", "Awaiting roll")
          : `${row.natural} + (${row.bonus}) = ${initiativeTotal(row)}`;
      container.querySelector("[data-prep-roll-mode]").textContent =
        row.mode === "digital"
          ? ctx.t("Dado digitale", "Digital die")
          : ctx.t("Dado fisico: inserisci il naturale", "Physical die: enter the natural result");
      const ready = getPreparedEncounter(draftState(ctx), editor.id, ctx.role).ready;
      root.querySelector("[data-prep-encounter-ready]").textContent = ready
        ? ctx.t("Pronto da salvare", "Ready to save")
        : ctx.t("Completa i tiri", "Complete rolls");
      updatePreview(root, ctx);
    }),
  );
  root.querySelectorAll("[data-prep-roll]").forEach((button) =>
    button.addEventListener("click", () => {
      captureForm(root);
      try {
        const actorId = button.dataset.prepRoll;
        const prior = (ctx.state.initiativeRolls || []).findLast(
          (roll) => roll.sceneId === editor.id && roll.actorId === actorId,
        );
        const result = rollInitiativeForDraft(ctx, editor.draft, actorId, editor.pendingActors);
        ctx.render();
        const previous = prior ? `${ctx.t("Precedente", "Previous")}: ${prior.total}. ` : "";
        ctx.toast(
          `${previous}${result.natural} + (${result.bonus}) = ${result.total}. ${ctx.t("Tiro registrato.", "Roll recorded.")}`,
        );
      } catch (error) {
        ctx.toast(
          error.message === "initiative-invalid" ? errorText(ctx, error) : error.message,
          true,
        );
      }
    }),
  );
  root.querySelectorAll("[data-prep-order]").forEach((button) =>
    button.addEventListener("click", () => {
      captureForm(root);
      const rows = editor.draft.encounter.participants;
      const from = rows.findIndex((row) => row.actorId === button.dataset.actor);
      const to = from + Number(button.dataset.prepOrder);
      if (to >= 0 && to < rows.length) [rows[from], rows[to]] = [rows[to], rows[from]];
      ctx.render();
    }),
  );
  root.querySelector("[data-prep-sort]")?.addEventListener("click", () => {
    captureForm(root);
    editor.draft.encounter ||= { name: "", participants: [] };
    editor.draft.encounter.participants.sort(
      (a, b) => (initiativeTotal(b) ?? -Infinity) - (initiativeTotal(a) ?? -Infinity),
    );
    ctx.render();
  });
  bindMapGestures(root, ctx);
}

function bindMapGestures(root, ctx) {
  const container = root.querySelector("[data-prep-map]");
  if (!container) return;
  let drag = null;
  const point = (event) => {
    const svg = container.querySelector("svg.prep-map");
    const value = svg.createSVGPoint();
    value.x = event.clientX;
    value.y = event.clientY;
    return value.matrixTransform(svg.getScreenCTM().inverse());
  };
  const finish = () => {
    drag = null;
    updatePreview(root, ctx);
  };
  container.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || !runs(ctx) || editor.spatial.tool !== "tokens") return;
    const tokenId = event.target.closest("[data-prep-token]")?.dataset.prepToken;
    const token = editor.draft.tokens.find((item) => item.id === tokenId);
    if (!token && !editor.placement) return;
    event.preventDefault();
    captureForm(root);
    container.querySelector("svg.prep-map")?.focus({ preventScroll: true });
    drag = {
      token,
      origin: token ? { x: token.x, y: token.y } : null,
      point: point(event),
      moved: false,
    };
    if (token) editor.selectedTokenId = token.id;
    container.setPointerCapture(event.pointerId);
  });
  container.addEventListener("pointermove", (event) => {
    if (!drag) return;
    drag.point = point(event);
    drag.moved = true;
    if (drag.token) {
      const target = scenePoint(editor.draft, drag.point);
      const group = Array.from(container.querySelectorAll("[data-prep-token]")).find(
        (node) => node.dataset.prepToken === drag.token.id,
      );
      group?.setAttribute(
        "transform",
        `translate(${target.x - drag.origin.x} ${target.y - drag.origin.y})`,
      );
    }
  });
  container.addEventListener("pointerup", (event) => {
    if (!drag) return;
    const current = drag;
    drag = null;
    if (container.hasPointerCapture(event.pointerId))
      container.releasePointerCapture(event.pointerId);
    editDraft(ctx, (state) => {
      if (current.token && current.moved)
        Object.assign(current.token, scenePoint(editor.draft, point(event)));
      else if (!current.token && editor.placement) {
        placeSceneToken(
          state,
          editor.id,
          editor.placement,
          point(event),
          `token-${crypto.randomUUID()}`,
          ctx.role,
        );
        editor.selectedTokenId = editor.draft.tokens.at(-1).id;
        editor.placement = null;
      }
    });
  });
  container.addEventListener("pointercancel", finish);
  container.addEventListener("keydown", (event) => {
    if (editor.spatial.tool !== "tokens") return;
    if (event.key === "Escape") {
      event.preventDefault();
      editor.placement = null;
      finish();
      ctx.render();
      return;
    }
    const token = editor.draft.tokens.find((item) => item.id === editor.selectedTokenId);
    if (event.key === "Enter" && editor.placement) {
      event.preventDefault();
      editDraft(ctx, (state) => {
        placeSceneToken(
          state,
          editor.id,
          editor.placement,
          { x: editor.draft.width / 2, y: editor.draft.height / 2 },
          `token-${crypto.randomUUID()}`,
          ctx.role,
        );
        editor.selectedTokenId = editor.draft.tokens.at(-1).id;
        editor.placement = null;
      });
      document.querySelector("[data-prep-interactive]")?.focus();
      return;
    }
    const direction = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
    }[event.key];
    if (!token || !direction) return;
    event.preventDefault();
    const step = editor.draft.gridSnap ? editor.draft.gridSize : event.shiftKey ? 1 : 10;
    editDraft(ctx, () =>
      Object.assign(
        token,
        scenePoint(editor.draft, {
          x: token.x + direction[0] * step,
          y: token.y + direction[1] * step,
        }),
      ),
    );
    document.querySelector("[data-prep-interactive]")?.focus();
  });
}

// Exported for the encounter builder (B19): one ledger for group initiative rolls.
// TV-46 (DDB sheet roll, Foundry's player combatant d20): besides the session runner, the
// player who controls the creature records its roll; that entry is shared (everyone saw
// the die), the runner's stays private as before.
export function recordInitiativeResult(state, input, role) {
  const runner = runsSession(state, role);
  if (!runner && !canControlActor(state.actors?.[input.actorId], role, state))
    throw new Error("unauthorized");
  if (
    !Number.isInteger(input.natural) ||
    input.natural < 1 ||
    input.natural > 20 ||
    !Number.isInteger(input.bonus) ||
    input.bonus < -100 ||
    input.bonus > 100 ||
    !["digital", "physical"].includes(input.mode)
  )
    throw new Error("initiative-invalid");
  const previous = (state.initiativeRolls || []).findLast(
    (roll) => roll.sceneId === input.sceneId && roll.actorId === input.actorId,
  );
  const entry = {
    id: crypto.randomUUID(),
    sceneId: input.sceneId,
    sceneName: input.sceneName,
    actorId: input.actorId,
    actorName: input.actorName,
    natural: input.natural,
    bonus: input.bonus,
    total: input.natural + input.bonus,
    mode: input.mode,
    kind: input.kind || (previous ? "reroll" : "roll"),
    controller: role,
    visibility: runner ? "private" : "shared",
    replacesId: previous?.id || null,
    createdAt: new Date().toISOString(),
  };
  (state.initiativeRolls ||= []).push(entry);
  return entry;
}

export function rollInitiativeForDraft(ctx, draft, actorId, pendingActors = {}) {
  requireDM(ctx.role, ctx.state);
  const row = draft.encounter?.participants.find((item) => item.actorId === actorId);
  if (!row || !Number.isInteger(row.bonus) || row.bonus < -100 || row.bonus > 100)
    throw new Error("initiative-invalid");
  const actorName = (pendingActors[actorId] || ctx.state.actors[actorId])?.name || actorId;
  const prior = (ctx.state.initiativeRolls || []).findLast(
    (roll) => roll.sceneId === draft.id && roll.actorId === actorId,
  );
  let result;
  ctx.commit(
    ctx.t(
      prior ? "Iniziativa rilanciata: " : "Iniziativa tirata: ",
      prior ? "Initiative rerolled: " : "Initiative rolled: ",
    ) + actorName,
    (state) => {
      result = recordInitiativeResult(
        state,
        {
          sceneId: draft.id,
          sceneName: draft.name,
          actorId,
          actorName,
          natural: rollDie(20),
          bonus: row.bonus,
          mode: "digital",
        },
        ctx.role,
      );
    },
    { visibility: "private" },
  );
  Object.assign(row, { natural: result.natural, mode: "digital", rollId: result.id });
  return result;
}

function initiativeHistory(ctx, sceneId = null) {
  if (!runs(ctx)) return "";
  const entries = (ctx.state.initiativeRolls || []).filter(
    // TV-46: players' own rolls (shared entries) are listed with the DM's.
    (roll) =>
      (roll.controller === ctx.role || roll.visibility === "shared") &&
      (!sceneId || roll.sceneId === sceneId),
  );
  if (!entries.length) return "";
  return `<details class="prep-roll-history"><summary>${ctx.t("Registro iniziativa", "Initiative history")} (${entries.length}) · ${ctx.t("Solo DM", "DM only")}</summary><p class="muted">${ctx.t("I tiri registrati restano qui anche se scarti l’organizzazione della scena. Un rilancio aggiunge un risultato senza cancellare il precedente.", "Recorded rolls remain here even when you discard scene organization. A reroll adds a result without deleting the previous one.")}</p><ol>${entries
    .toReversed()
    .map(
      (entry) =>
        `<li data-prep-roll-id="${ctx.esc(entry.id)}" data-prep-roll-status="${entry.status === "reversed" ? "reversed" : "accepted"}"><strong>${ctx.esc(entry.actorName || entry.actorId)}</strong>${entry.controller && entry.controller !== ctx.role ? ` · ${ctx.t("tirato dal giocatore", "rolled by the player")}` : ""} · ${ctx.esc(entry.sceneName || entry.sceneId)}<div>${entry.natural} + (${entry.bonus}) = ${entry.total} · ${entry.mode === "digital" ? ctx.t("digitale", "digital") : ctx.t("fisico", "physical")}</div><span class="muted">${entry.status === "reversed" ? ctx.t("Annullato — risultato conservato", "Reversed — result retained") : entry.kind === "correction" ? ctx.t("Correzione registrata", "Recorded correction") : entry.replacesId ? ctx.t("Nuovo risultato; precedente conservato", "New result; previous result retained") : ctx.t("Risultato registrato", "Recorded result")}</span></li>`,
    )
    .join("")}</ol></details>`;
}

const DAMAGE_TYPES = {
  acid: ["Acido", "Acid"],
  bludgeoning: ["Contundente", "Bludgeoning"],
  cold: ["Freddo", "Cold"],
  fire: ["Fuoco", "Fire"],
  force: ["Forza", "Force"],
  lightning: ["Fulmine", "Lightning"],
  necrotic: ["Necrotico", "Necrotic"],
  piercing: ["Perforante", "Piercing"],
  poison: ["Veleno", "Poison"],
  psychic: ["Psichico", "Psychic"],
  radiant: ["Radiante", "Radiant"],
  slashing: ["Tagliente", "Slashing"],
  thunder: ["Tuono", "Thunder"],
};

function validAuthoredMeleeProfile(profile) {
  return (
    !!profile &&
    typeof profile.name?.it === "string" &&
    profile.name.it.length <= 100 &&
    typeof profile.name?.en === "string" &&
    profile.name.en.length <= 100 &&
    isValidMeleeProfile(profile) &&
    Object.hasOwn(DAMAGE_TYPES, profile.damageType)
  );
}

export function buildMeleeProfile(input) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const profile = {
    name: { it: name, en: name },
    reachMeters: input.reachMeters,
    attackBonus: input.attackBonus,
    damageDice: [{ count: input.damageCount, sides: input.damageSides }],
    damageModifier: input.damageModifier,
    damageType: input.damageType,
    source: {
      kind: "authored-demo",
      edition: "2024",
      revision: crypto.randomUUID(),
      title: "Original custom NPC attack",
    },
  };
  if (!validAuthoredMeleeProfile(profile)) throw new Error("attack-invalid");
  return profile;
}

export function stageNPCAttack(draftEditor, state, actorId, profile, role, team) {
  requireDM(role, state);
  const actor = draftEditor.pendingActors[actorId] || state.actors[actorId];
  if (!actor || actor.kind !== "npc") throw new Error("actor-missing");
  if (profile !== null && !validAuthoredMeleeProfile(profile)) throw new Error("attack-invalid");
  if (team !== undefined && !validNPCTeam(team)) throw new Error("team-invalid");
  if (draftEditor.pendingActors[actorId]) {
    actor.combatProfile = {
      ...actor.combatProfile,
      meleeAttack: structuredClone(profile),
      ...(team !== undefined ? { team } : {}),
    };
  } else {
    draftEditor.actorPatches ||= {};
    draftEditor.actorPatches[actorId] ||= {
      original: structuredClone(actor.combatProfile?.meleeAttack || null),
      value: null,
    };
    draftEditor.actorPatches[actorId].value = structuredClone(profile);
    if (team !== undefined) {
      if (!Object.hasOwn(draftEditor.actorPatches[actorId], "originalTeam"))
        draftEditor.actorPatches[actorId].originalTeam = npcTeam(actor);
      draftEditor.actorPatches[actorId].team = team;
    }
  }
}

const NPC_TEAMS = {
  party: ["Alleato al gruppo", "Allied to the party"],
  neutral: ["Neutrale", "Neutral"],
  watch: ["Ostile al gruppo", "Hostile to the party"],
};
const validNPCTeam = (team) => typeof team === "string" && Object.hasOwn(NPC_TEAMS, team);
const npcTeam = (actor) =>
  actor?.combatProfile?.team ??
  (["goblin-1", "goblin-2"].includes(actor?.id) ? "watch" : "neutral");
function npcTeamFields(ctx, actor = null) {
  const team = npcTeam(actor);
  return `<label class="field">${ctx.t("Disposizione verso il gruppo", "Disposition toward the party")}<select name="npcTeam" required>${!validNPCTeam(team) ? `<option value="">${ctx.t("Scegli la disposizione", "Choose a disposition")}</option>` : ""}${Object.entries(
    NPC_TEAMS,
  )
    .map(
      ([id, label]) =>
        `<option value="${id}" ${team === id ? "selected" : ""}>${ctx.t(...label)}</option>`,
    )
    .join(
      "",
    )}</select></label><p class="muted">${ctx.t("Indica da che parte sta la creatura, non chi la controlla. Un PNG resta controllato dal DM; la disposizione determina anche le opportunità consentite.", "This describes the creature’s side, not who controls it. An NPC remains DM-controlled; disposition also determines eligible opportunities.")}</p>`;
}
