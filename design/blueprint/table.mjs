import { getEffectiveActor, getEffectiveSpeed, formTokenName } from "./forms-companions.mjs";
import { openSheetOverlay, bindEntryDrop } from "./characters.mjs";
import { isActorAvailable, canViewActor, isCampaignActor } from "./character-access.mjs";
import { renderFormsSummary, bindFormsSummary } from "./forms-ui.mjs";
import { renderSpatialOverlay } from "./spatial-editor.mjs";
import {
  renderDoorControls,
  openDoor,
  plannedWaypoints,
  zoomAt,
  opportunityWarnings,
  runsSession,
} from "./table-spatial.mjs";
import { policyOf, isEnemyFor } from "./campaign-settings-domain.mjs";
import { viewState as specialMovesView, canDragToken, ridesOn } from "./special-moves.mjs";
import { model as fogModel } from "./fog-vision.mjs";
import { fogHiddenAt, canSee, unseenTokens } from "./fog-vision-domain.mjs";
import {
  pathDraft,
  setPathDraft,
  clearPathDraft,
  resetPathDrafts,
  renderMovementPath,
  renderPathMarkers,
  renderPathControls,
  renderOpportunityMarks,
} from "./path-ui.mjs";
import { renderInterruptions } from "./reaction-ui.mjs";
import {
  renderCombatBar,
  renderCombatInspector,
  renderCombatMap,
  bindCombatUI,
  handleCombatMap,
  hasCombatPreview,
  cancelCombatPreview,
  resetCombatUI,
  openCombatRequests,
  renderActiveEffects,
  turnLogOptions,
} from "./combat-ui.mjs";
import {
  beginMovement,
  hasBlockingConsequences,
  advanceTurn,
  standContextFor,
  applyConditionFollowUps,
  visibleTurnActor,
} from "./combat.mjs";
import { renderSceneBase, activateScene } from "./preparation.mjs";
import { formatNumber, scrollIntoStrip } from "./ui.mjs";
import { previewMovement, rollDie } from "./state.mjs";
import {
  hasCondition,
  getConditionMechanics,
  listConditionDefinitions,
  previewStand,
  standUp,
  combatTurnKey,
} from "./conditions.mjs";
import { renderConditionsSummary, bindConditionsSummary } from "./conditions-ui.mjs";
import { TABLE_TOOL_GROUPS, TABLE_SIDEBAR_SECTIONS } from "./registry.mjs";
const CONDITION_NAMES = new Map(listConditionDefinitions().map((row) => [row.id, row.name]));
/**
 * Public status of an observed token: shared condition applications and vitality only.
 * P6 TV-25 (the DDB player-facing health toggle): a player reads an enemy's vitality (dying,
 * stable, dead) only when the campaign's «Cosa vedono i giocatori» policy shows enemy health;
 * with the policy set to hidden the token carries no health badge for players.
 */
export function tokenStatus(ctx, actor) {
  const healthHidden =
    !runsSession(ctx.state, ctx.role) &&
    isEnemyFor(ctx.state, actor, ctx.role) &&
    policyOf(ctx.state?.ext?.["campaign-settings"], ctx.state?.campaign?.id).enemyHp === "hidden";
  const shown = {
    ...actor,
    conditions: (actor.conditions ?? []).filter(
      (c) => !(c && typeof c === "object" && c.visibility === "private" && c.owner !== ctx.role),
    ),
  };
  const names = getConditionMechanics(shown)
    .conditionIds.filter((id) => CONDITION_NAMES.has(id) && id !== "incapacitated")
    .map((id) => ctx.label(CONDITION_NAMES.get(id)));
  const dying =
    !healthHidden &&
    actor.hp === 0 &&
    !actor.dead &&
    actor.vitalityPolicy?.zeroHp === "death-saves";
  const dead = actor.dead && !healthHidden;
  const vital = dead
    ? "dead"
    : dying
      ? actor.deathSaves?.stable
        ? "stable"
        : "dying"
      : names.length
        ? "conditions"
        : "";
  const text = dead
    ? ctx.t("Morto", "Dead")
    : dying
      ? actor.deathSaves?.stable
        ? ctx.t("Stabile", "Stable")
        : ctx.t("Morente", "Dying")
      : names.slice(0, 2).join(" · ") + (names.length > 2 ? " +" + (names.length - 2) : "");
  return { vital, text, names };
}
let mapResizeObserver;
let clearResponsiveLayout;
let clearTableKeyboard;
let selected = "livia",
  mode = "move",
  zoom = 1,
  pan = { x: 0, y: 0 };
// P6 TV-01 (Foundry, Owlbear): a click on the empty map clears the map selection; the side
// panel and the hotbar keep showing the last creature, the map moves nobody until a token is
// chosen again.
let deselected = false;
// Final review F5 / TV-53 (BG3): the turn whose start last moved the selection.
let followedTurn = null;
// Final review F18 (Owlbear, BG3: the map first on a phone): the map was brought into view
// since the Table was entered; the phone's map message as a snackbar (text, timer, watcher).
let phoneMapShown = false;
let noteText = null;
let noteTimer = null;
let noteObserver = null;
// P6 TV-06: on a phone the map tools stay folded into one button until opened.
let toolsOpen = false;
// P6 TV-20/TV-27: the token (or the map) that keeps the keyboard focus across the next
// re-render, when that render comes from the gesture (within a moment).
let pendingFocus = null;
let pendingFocusAt = 0;
const focusAfterRender = (id) => {
  pendingFocus = id;
  pendingFocusAt = Date.now();
};
let wheelTimer = null;
// B61 right sidebar: per identity on this device (Foundry keeps the sidebar tab per
// client). Loaded lazily; resetTableView re-reads it. B62: `tab` is the open panel, the
// sidebar tab (section) follows from it; `sections` remembers each section's last panel and
// `hidden` the sections this identity took out of the rail (Owlbear/Foundry customisation).
const SIDEBAR_KEY = "d20-studio-table-sidebar";
let sidebarMemory = null;
function loadSidebar() {
  if (sidebarMemory) return sidebarMemory;
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(SIDEBAR_KEY) ?? "null");
    sidebarMemory = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  } catch {
    sidebarMemory = {};
  }
  return sidebarMemory;
}
/** This identity's sidebar: the open panel ("creature" by default), collapse, per-section memory. */
export function sidebarFor(role) {
  const entry = loadSidebar()[role];
  const sections =
    entry?.sections && typeof entry.sections === "object" && !Array.isArray(entry.sections)
      ? Object.fromEntries(
          Object.entries(entry.sections).filter(([, v]) => typeof v === "string" && v),
        )
      : {};
  return {
    tab: typeof entry?.tab === "string" && entry.tab ? entry.tab : "creature",
    collapsed: entry?.collapsed === true,
    sections,
    hidden: Array.isArray(entry?.hidden)
      ? entry.hidden.filter((id) => typeof id === "string" && id !== "creature")
      : [],
    // B62: the hotbar page (the creature's actions or the quick bar).
    hotbar: entry?.hotbar === "quickbar" ? "quickbar" : "actions",
  };
}
/**
 * The rail's "All panels" list (B61 review): every panel by icon and full name, the open one
 * marked. D&D Beyond's quick-jump beside its swipeable sections (DDB-060) and VS Code's "…"
 * for views that do not fit: panels beyond the screen stay two taps away. `items`:
 * [{id, name, glyph, current}]; `glyph` is the panel's own icon markup. B62: with `groups`
 * ([{id, name, hideable, shown, items}]) the list is grouped by sidebar tab, each with its
 * "show in the rail" switch (per identity, Owlbear/Foundry customisation).
 */
export function tablePanelsMenu(ctx, items, groups = null) {
  const button = (item) =>
    `<button type="button" class="button${item.current ? " active" : ""}" data-table-panel-jump="${ctx.esc(item.id)}"${item.current ? ' aria-current="true"' : ""}>${item.glyph}${ctx.esc(item.name)}</button>`;
  // Final review X-10 (Foundry V14 pop-out): an area panel can also open in its own window.
  const jump = (item) =>
    item.popout
      ? `<div class="table-panels-row">${button(item)}<button type="button" class="button quiet table-panels-popout" data-table-panel-popout="${ctx.esc(item.id)}" aria-label="${ctx.esc(ctx.t(`Stacca «${item.name}» in una finestra`, `Pop out “${item.name}” into a window`))}" title="${ctx.esc(ctx.t("Apri in una finestra separata, da spostare accanto o su un altro schermo", "Open in a separate window, to place beside or on another screen"))}">${ctx.t("Stacca", "Pop out")}</button></div>`
      : button(item);
  if (!groups)
    return `<div class="dialog-menu table-panels-menu">${items.map(jump).join("")}</div>`;
  return `<div class="dialog-menu table-panels-menu is-grouped">${groups
    .map(
      (group) =>
        `<section class="table-panels-group" data-table-panels-section="${ctx.esc(group.id)}" aria-labelledby="table-panels-${ctx.esc(group.id)}"><div class="table-panels-group-head"><h3 id="table-panels-${ctx.esc(group.id)}">${ctx.esc(group.name)}</h3>${
          group.hideable
            ? `<button type="button" class="button quiet table-panels-pin" data-table-section-pin="${ctx.esc(group.id)}" aria-pressed="${group.shown}" aria-label="${ctx.esc(ctx.t(`Mostra «${group.name}» nella barra`, `Show “${group.name}” in the rail`))}">${ctx.t("Nella barra", "In the rail")}</button>`
            : ""
        }</div>${group.items.map(jump).join("")}</section>`,
    )
    .join("")}</div>`;
}
// Sidebar model of the last render (sections, their panels, the open one), read by the bind.
let sidebarModel = null;
function rememberSidebar(role, patch) {
  const next = { ...sidebarFor(role), ...patch };
  sidebarMemory = { ...loadSidebar(), [role]: next };
  try {
    globalThis.localStorage?.setItem(SIDEBAR_KEY, JSON.stringify(sidebarMemory));
  } catch {
    /* no storage (private window, tests): the choice lasts for this page */
  }
  return next;
}
// Whether the selected creature's action preview or path plan was on screen at the last
// render: starting one brings the Creature tab forward once.
let inspectorNeeded = false;
// Last tool used in each map toolbar group: the group button returns to it.
let groupTool = {};
// A tab to focus after the next bind (the tab or close button the user just pressed).
let focusTab = null;
// Area table tool whose activate() ran on a live Table and whose deactivate() has not:
// {tool, ctx, table}, where table is the latest bound one. See syncActiveTool.
let activeTool = null;
function deactivateTool() {
  if (!activeTool) return;
  const { tool, ctx, table } = activeTool;
  activeTool = null;
  ctx.registry?.invoke(tool, "deactivate", ctx, table);
}
// Called after each bind: the tool of the current mode is active on this fresh table.
function syncActiveTool(ctx, table, current) {
  if (activeTool && activeTool.tool === current) {
    activeTool.table = table;
    return;
  }
  deactivateTool();
  if (!current) return;
  activeTool = { tool: current, ctx, table };
  ctx.registry?.invoke(current, "activate", ctx, table);
}
/** The shell leaves the Table page: the active area tool is deactivated, its mode kept. */
export function leaveTable() {
  deactivateTool();
  phoneMapShown = false;
  noteObserver?.disconnect();
  noteObserver = null;
}
/**
 * Final review F24 (Owlbear and Foundry show the distance by the dragged token): a small tag
 * above the destination, clear of the token's name (drawn under the token).
 */
export function dragDistanceLabel(v, lang = "it") {
  if (!v?.target || !Number.isFinite(v.distance)) return "";
  const text = `${formatNumber(lang, v.distance)} m`;
  const x = Math.round(v.target.x);
  const y = Math.round(v.target.y - 34);
  const w = 14 + text.length * 8;
  return `<g class="drag-distance" data-drag-distance pointer-events="none"><rect x="${x - w / 2}" y="${y - 15}" width="${w}" height="22" rx="11" fill="var(--token-label-halo)" opacity="0.92"/><text x="${x}" y="${y}" text-anchor="middle" font-size="14" font-weight="700" fill="var(--token-label)">${text}</text></g>`;
}
/**
 * Final review F6 (BG3: the action hint sits above the resource row, at the hotbar's real
 * height): the map status line's `bottom` in px over the highest HUD top measured (hotbar,
 * resource row, dice plate), 8 px apart; null when nothing was measured.
 */
export function captionLift(container, hudTops) {
  const tops = hudTops.filter((top) => Number.isFinite(top) && top > 0);
  if (!tops.length || !Number.isFinite(container?.bottom)) return null;
  return Math.max(0, Math.round(container.bottom - Math.min(...tops) + 8));
}
/**
 * Final review X-10 (Foundry V14 pop-out windows): a Table panel in its own browser window,
 * route `#table?tab=window:<panel id>`. The window reads and writes the same local state as
 * the main tab (storage events keep both current); the window name carries the demo identity.
 */
export function openPanelWindow(ctx, panelId) {
  const url = `${location.pathname}${location.search}#table?tab=window:${encodeURIComponent(panelId)}`;
  const opened = window.open(url, `d20-panel-${ctx.role}-${panelId}`, "popup,width=440,height=780");
  if (!opened)
    ctx.toast(
      ctx.t(
        "Il browser ha bloccato la nuova finestra: consenti i popup per questa pagina.",
        "The browser blocked the new window: allow pop-ups for this page.",
      ),
      true,
    );
}
export function setSelectedActor(id) {
  selected = id;
  deselected = false;
}

// Close review 01/10 (X-10, Foundry V14 pop-out): a detached window carries its panel's own
// controls; the ones that act on the map or the sidebar run in the main Table window, which
// comes to the front, and the panel's close button closes the window. Only these named
// controls travel between the windows (never a selector taken from the message).
const RELAY_TYPE = "d20-table-relay";
export const RELAYED_CONTROLS = Object.freeze({
  "show-token": { selector: "[data-chat-show-token]", attr: "chat-show-token" },
  "chat-request": { selector: "[data-chat-request]" },
  "sv-clean": { selector: '[data-sv="clean"]' },
  "sv-home": { selector: '[data-sv="home"]' },
});
const CLOSE_CONTROLS = "[data-chat-close], [data-table-drawer-close]";
/** Which relayed control a press in a pop-out window is, with its value, or null. */
export function relayedControl(target) {
  for (const [control, entry] of Object.entries(RELAYED_CONTROLS)) {
    const el = target?.closest?.(entry.selector);
    if (el) return { control, value: entry.attr ? el.getAttribute(`data-${entry.attr}`) : null };
  }
  return null;
}
/** The selector a relayed control resolves to in the main window's panel. */
export function relayedSelector(control, value) {
  const entry = RELAYED_CONTROLS[control];
  if (!entry) return null;
  if (!entry.attr) return entry.selector;
  if (typeof value !== "string" || !/^[A-Za-z0-9_:-]{1,80}$/.test(value)) return null;
  return `[data-${entry.attr}="${value}"]`;
}
let relayCtx = null;
// TV-14: the last left press on a token survives the redraw that the press itself causes.
const DOUBLE_PRESS_MS = 400;
let lastTokenPress = null;
let doublePressAt = -Infinity;
let mapBinds = 0; // one per map bind: a double press spans at most the redraw its first press made
let openFromToken = () => false;
let relayShowTab = null;
let relayInstalled = false;
function runRelayed(data, tries = 0) {
  const ctx = relayCtx;
  const selector = relayedSelector(data.control, data.value);
  if (!ctx || !selector || tries > 8) return;
  const again = () => setTimeout(() => runRelayed(data, tries + 1), 60);
  if (String(ctx.view?.tab ?? "").startsWith("window:")) return;
  if (ctx.view?.page !== "table") {
    ctx.navigate("table");
    return again();
  }
  const panel = document.querySelector("#content #table-sidebar-panel");
  if (!panel || panel.hidden || panel.dataset.tablePanel !== data.panel) {
    relayShowTab?.(data.panel);
    return again();
  }
  panel.querySelector(selector)?.click();
}
function installRelay() {
  if (relayInstalled || typeof globalThis.window?.addEventListener !== "function") return;
  relayInstalled = true;
  window.addEventListener("message", (event) => {
    if (event.origin !== location.origin || event.data?.type !== RELAY_TYPE) return;
    if (typeof event.data.panel !== "string" || !RELAYED_CONTROLS[event.data.control]) return;
    runRelayed({ panel: event.data.panel, control: event.data.control, value: event.data.value });
  });
}
function bindPanelWindow(root, ctx, panelId) {
  const host = root.querySelector(".table-window");
  if (!host) return;
  host.addEventListener(
    "click",
    (event) => {
      const t = ctx.t;
      if (event.target.closest?.(CLOSE_CONTROLS)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.close();
        setTimeout(() => {
          if (!window.closed)
            ctx.toast(
              t(
                "Chiudi questa finestra dal browser: non l’ha aperta il Tavolo.",
                "Close this window from the browser: the Table did not open it.",
              ),
            );
        }, 150);
        return;
      }
      const relayed = relayedControl(event.target);
      if (!relayed) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const main = window.opener && !window.opener.closed ? window.opener : null;
      if (!main) {
        ctx.toast(
          t(
            "Questo comando agisce sulla mappa: aprilo dal Tavolo nella finestra principale.",
            "This command acts on the map: use it from the Table in the main window.",
          ),
          true,
        );
        return;
      }
      main.postMessage({ type: RELAY_TYPE, panel: panelId, ...relayed }, location.origin);
      main.focus();
      ctx.toast(
        t(
          "Fatto nella finestra principale del Tavolo, ora in primo piano.",
          "Done in the main Table window, now in front.",
        ),
      );
    },
    true,
  );
}
export function resetTableView({ forget = false } = {}) {
  deactivateTool();
  mapResizeObserver?.disconnect();
  clearResponsiveLayout?.();
  clearTableKeyboard?.();
  resetCombatUI();
  resetPathDrafts();
  selected = "livia";
  followedTurn = null;
  lastTokenPress = null;
  mode = "move";
  zoom = 1;
  pan = { x: 0, y: 0 };
  deselected = false;
  toolsOpen = false;
  pendingFocus = null;
  clearTimeout(wheelTimer);
  inspectorNeeded = false;
  groupTool = {};
  focusTab = null;
  sidebarModel = null;
  // Each identity finds its own sidebar again (role change); "Reset example" forgets them.
  if (forget)
    try {
      globalThis.localStorage?.removeItem(SIDEBAR_KEY);
    } catch {
      /* nothing saved */
    }
  sidebarMemory = null;
}
export function renderTable(ctx) {
  const { state, t, esc, icon } = ctx;
  // P6 TV-27: a re-render keeps the keyboard focus on the same map token (or on the map), as
  // a keyed re-render would: the next bind focuses it again.
  const focused = globalThis.document?.activeElement;
  if (focused?.closest?.("#content #battle-map"))
    focusAfterRender(focused.closest("[data-actor]")?.getAttribute("data-actor") ?? "map");
  const scene = state.scenes.find((s) => s.id === state.activeSceneId);
  // An area panel placed "cover" (B14: presentation gate, "view as") replaces the whole
  // Table for this identity: the scene below it is then never rendered.
  const cover = ctx.registry
    ?.list("table-panel", ctx, { scene, selectedActorId: selected, mode, zoom, pan: { ...pan } })
    .find((c) => c.placement === "cover");
  if (cover)
    return `<section class="table-cover">${ctx.registry.slot("table-panel", cover, ctx, { scene, selectedActorId: selected, mode, zoom, pan: { ...pan } })}</section>`;
  if (!scene)
    return `<div class="empty-state"><h1>${t("Nessuna scena attiva", "No active scene")}</h1></div>`;
  const unseen = unseenTokens(state, scene.id, ctx.role);
  const canObserve = (id) => {
    const subject = state.actors[id];
    const token = scene.tokens.find((token) => token.actorId === id);
    return Boolean(
      isActorAvailable(subject) &&
      (!subject.companion || canViewActor(subject, ctx.role, state)) &&
      (subject.visibility !== "private" || canViewActor(subject, ctx.role, state)) &&
      // C3 (CA-57): the session runner of a hand-off sees the hidden tokens the DM sees.
      (ctx.canControl(subject) ||
        runsSession(state, ctx.role) ||
        (!subject.hidden &&
          !token?.hidden &&
          token?.visible !== false &&
          // Close review 01/10 (privacy P1, Foundry): a creature under the fog or out of
          // sight is not drawn, listed in the turn order or selectable.
          !unseen.has(id))),
    );
  };
  // B13 (campaign-members): the Table shows the campaign in play, so a sheet outside it is
  // never the selection; with no visible token, the viewer's own sheet in this campaign.
  const inPlay = (id) => isCampaignActor(state.actors[id], state.campaign?.id);
  // Final review F5 / TV-53 (BG3: the hotbar passes to the party member whose turn starts):
  // at each turn start the viewer's acting creature becomes the selection; switching by
  // hand stays possible until the next turn starts.
  const turnKey = state.combat?.active ? combatTurnKey(state.combat) : null;
  if (turnKey !== followedTurn) {
    followedTurn = turnKey;
    const acting = turnKey ? state.combat.order[state.combat.turn] : null;
    if (
      acting &&
      state.actors[acting] &&
      canObserve(acting) &&
      inPlay(acting) &&
      ctx.canControl(state.actors[acting])
    ) {
      selected = acting;
      deselected = false;
    }
  }
  if (!state.actors[selected] || !canObserve(selected) || !inPlay(selected))
    selected =
      scene.tokens.find((token) => canObserve(token.actorId))?.actorId ??
      Object.keys(state.actors).find(
        (id) =>
          state.actors[id]?.kind === "character" &&
          state.actors[id].visibility !== "private" &&
          inPlay(id) &&
          canObserve(id) &&
          ctx.canControl(state.actors[id]),
      );
  const actor = getEffectiveActor(state.actors[selected]);
  if (!actor)
    return `<div class="empty-state"><h1>${t("Nessuna creatura visibile sulla scena", "No visible creature on the scene")}</h1></div>`;
  const control = ctx.canControl(actor);
  const current = state.combat.order[state.combat.turn];
  const movementText = new Intl.NumberFormat(ctx.lang === "it" ? "it-IT" : "en-GB", {
    maximumFractionDigits: 2,
  }).format(state.combat.active ? actor.movement : getEffectiveSpeed(state.actors[selected]));
  // B20 campaign policy (campaign-settings.mjs, DDB-128): a player tool the DM turned off
  // stays visible, aria-disabled with the reason; an active one falls back to Move. The
  // switches are the campaign settings B18 enforces (annotations.mjs), one value for all.
  const toolSetting = {
    pointer: "players-pointer",
    "annotations-draw": "players-draw",
    "annotations-template": "players-templates",
  };
  const lockedTool = (id) =>
    ctx.role === "player" &&
    Boolean(toolSetting[id]) &&
    state.ext?.["core-settings"]?.campaign?.["annotations-table." + toolSetting[id]] === false;
  if (lockedTool(mode)) mode = "move";
  const chip = (id, it, en, glyph) =>
    lockedTool(id)
      ? `<button class="map-tool cs-locked-tool" data-tool="${id}" aria-disabled="true" aria-pressed="false" title="${t(it, en)} · ${t("disattivato dal DM", "turned off by the DM")}" aria-label="${t(it, en)} · ${t("disattivato dal DM nelle impostazioni della campagna", "turned off by the DM in the campaign settings")}">${icon(glyph)}</button>`
      : `<button class="map-tool ${mode === id ? "active" : ""}" data-tool="${id}" aria-pressed="${mode === id}" title="${t(it, en)}" aria-label="${t(it, en)}">${icon(glyph)}</button>`;
  const bounds = `${pan.x} ${pan.y} ${scene.width / zoom} ${scene.height / zoom}`;
  // Area contributions (B11): map layers below 60 draw under the tokens, from 60 above;
  // panels sit in the inspector or open as a drawer; tools join the map toolbar.
  const reg = ctx.registry;
  const tableView = {
    scene,
    selectedActorId: selected,
    // P6: the token selected on the map (null after a click on the empty map).
    mapSelection: deselected ? null : selected,
    mode,
    zoom,
    pan: { ...pan },
  };
  // X-10: the pop-out window shows its panel alone, as the viewer may open it.
  const windowId = String(ctx.view?.tab ?? "").startsWith("window:")
    ? decodeURIComponent(ctx.view.tab.slice(7))
    : null;
  if (windowId) {
    const panel = reg?.list("table-panel", ctx, tableView).find((item) => item.id === windowId);
    return panel
      ? `<div class="table-window" data-table-window="${esc(panel.id)}"><header class="table-window-head"><h1>${esc(reg.label(panel, ctx.lang))}</h1><p class="muted">${t("Finestra staccata del Tavolo: resta aggiornata con la scheda principale.", "Popped-out Table window: it stays current with the main tab.")}</p></header><section class="table-window-body">${reg.slot("table-panel", panel, ctx, tableView)}</section></div>`
      : `<div class="empty-state table-window-missing"><h1>${t("Pannello non disponibile", "Panel unavailable")}</h1><p>${t("Questo pannello non è aperto alla tua identità. Chiudi la finestra e torna al Tavolo.", "This panel is not open to your identity. Close the window and return to the Table.")}</p></div>`;
  }
  // Visual pass 2: layers from 90 up are the map's HUD (safety veil, session controls and
  // their menu, weather, fog tool options); they draw over the door buttons, which keep their
  // place above the other layers (the registry's core "doors" is 70).
  const layers = (above, hud = false) =>
    (reg?.list("map-layer", ctx, tableView) ?? [])
      .filter((c) => c.order >= 60 === above && (!above || c.order >= 90 === hud))
      .map((c) => reg.slot("map-layer", c, ctx, tableView))
      .join("");
  const panels = (placement) =>
    (reg?.list("table-panel", ctx, tableView) ?? []).filter(
      (c) => c.placement === placement && !c.replaces,
    );
  // A visible area tool replacing a core one keeps its place with its own label and icon.
  const coreChip = (id, it, en, glyph) => {
    const c = reg?.get("table-tool", id, ctx, tableView);
    return c
      ? chip(id, esc(c.label.it), esc(c.label.en), c.icon ?? glyph)
      : chip(id, it, en, glyph);
  };
  const logPanel = reg?.get("table-panel", "log", ctx, tableView) ?? null;
  const preview = hasCombatPreview(ctx, selected);
  // Map toolbar (B61): one button per group, the tools of the active group beside it
  // (Foundry scene controls FVT-108, Roll20 left toolbar R20-127). Every tool keeps its
  // data-tool chip, so shortcuts, tooltips and B20 locks read it where it is.
  const coreGroup = (id, fallback) => reg?.get("table-tool", id, ctx, tableView)?.group ?? fallback;
  const toolItems = [
    ["move", "select", 10, chip("move", "Muovi", "Move", "move")],
    ["plan", "select", 20, chip("plan", "Pianifica percorso", "Plan path", "note")],
    ["pan", "select", 30, chip("pan", "Sposta vista", "Pan view", "map")],
    [
      "measure",
      coreGroup("measure", "measure"),
      40,
      coreChip("measure", "Misura", "Measure", "plus"),
    ],
    [
      "pointer",
      coreGroup("pointer", "ping"),
      50,
      coreChip("pointer", "Puntatore", "Pointer", "flag"),
    ],
    ...(reg?.list("table-tool", ctx, tableView) ?? [])
      .filter((c) => !c.replaces)
      .map((c) => [
        c.id,
        c.group ?? "more",
        c.order,
        chip(c.id, esc(c.label.it), esc(c.label.en), c.icon ?? "flag"),
      ]),
  ].map(([id, group, order, html]) => ({ id, group, order, html }));
  const activeGroup = toolItems.find((item) => item.id === mode)?.group ?? null;
  // The group remembers its last tool, however it was chosen (chip, key, area).
  if (activeGroup) groupTool[activeGroup] = mode;
  const toolGroups = TABLE_TOOL_GROUPS.map((group) => ({
    ...group,
    tools: toolItems.filter((item) => item.group === group.id).sort((a, b) => a.order - b.order),
  })).filter((group) => group.tools.length);
  const groupHTML = (group) => {
    if (group.tools.length === 1) return group.tools[0].html;
    const on = group.id === activeGroup;
    const name = t(group.label.it, group.label.en);
    return `<div class="map-tool-cluster"><button type="button" class="map-tool map-tool-group ${on ? "active" : ""}" data-tool-group="${group.id}" aria-pressed="${on}" aria-expanded="${on}" aria-controls="map-tools-${group.id}" title="${name}" aria-label="${name}">${icon(group.icon)}</button><div class="map-subtools" id="map-tools-${group.id}" data-tool-group-tools="${group.id}" role="group" aria-label="${name}"${on ? "" : " hidden"}>${group.tools.map((item) => item.html).join("")}</div></div>`;
  };
  // Right sidebar (B61): the selected creature first, then the log and the areas' tabs
  // (Foundry sidebar tabs FVT-007, Roll20 right sidebar, D&D Beyond Maps side panel
  // DDB-133). Each identity keeps its last tab on this device.
  const compact = globalThis.matchMedia?.("(max-width: 720px)")?.matches === true;
  const needsInspector = control && (preview || mode === "plan");
  // Starting an action preview or a planned path brings the creature's tab forward once:
  // its details and confirmation live there.
  if (needsInspector && !inspectorNeeded)
    rememberSidebar(ctx.role, { tab: "creature", collapsed: false });
  inspectorNeeded = needsInspector;
  const memory = sidebarFor(ctx.role);
  const areaTabs = panels("sidebar-tab");
  const logOrder = logPanel?.order ?? 10;
  // B62: every panel belongs to one sidebar tab (section) of the Foundry/Roll20 taxonomy;
  // a panel without a section keeps a tab of its own (pre-B62 behaviour).
  const sectionMeta = new Map(TABLE_SIDEBAR_SECTIONS.map((entry) => [entry.id, entry]));
  const portrait = `<span class="table-tab-portrait" aria-hidden="true">${esc(actor.name[0])}</span>`;
  const panelList = [
    {
      id: "creature",
      section: "creature",
      order: 0,
      name: `${t("Creatura", "Creature")}: ${esc(actor.name)}`,
      short: t("Creatura", "Creature"),
      glyph: portrait,
    },
    {
      id: "log",
      section: "chat",
      order: logOrder,
      name: t("Registro", "Log"),
      short: t("Registro", "Log"),
      glyph: icon(logPanel?.icon ?? "note"),
    },
    ...areaTabs.map((c) => ({
      id: c.id,
      section: sectionMeta.has(c.section) ? c.section : null,
      order: c.order,
      name: esc(reg.label(c, ctx.lang)),
      short: esc(reg.label(c, ctx.lang)),
      glyph: icon(c.icon ?? "flag"),
      area: c,
    })),
  ];
  const sections = [
    ...TABLE_SIDEBAR_SECTIONS.map((meta) => ({
      id: meta.id,
      order: meta.order,
      name: meta.id === "creature" ? panelList[0].name : t(meta.label.it, meta.label.en),
      short: t(meta.label.it, meta.label.en),
      glyph: meta.id === "creature" ? portrait : icon(meta.icon),
      panels: panelList.filter((p) => p.section === meta.id).sort((a, b) => a.order - b.order),
    })).filter((section) => section.panels.length),
    ...panelList
      .filter((p) => !p.section)
      .map((p) => ({ ...p, panels: [p], legacy: true, section: p.id })),
  ].sort((a, b) => a.order - b.order);
  const sectionOfPanel = (id) => sections.find((x) => x.panels.some((p) => p.id === id)) ?? null;
  const openPanel =
    panelList.find((p) => p.id === memory.tab && sectionOfPanel(p.id)) ?? panelList[0];
  const tab = openPanel.id;
  const openSection = sectionOfPanel(tab);
  const collapsed = memory.collapsed && !compact;
  const open = (id) => id === tab && !collapsed;
  const sectionOpen = (section) => section === openSection && !collapsed;
  const unread =
    !open("log") && logPanel
      ? (reg.notifications(ctx) ?? []).filter((n) => n.category === "table-log").length
      : 0;
  sidebarModel = {
    role: ctx.role,
    tab,
    section: openSection.id,
    sections: sections.map((section) => ({
      id: section.id,
      name: section.name,
      glyph: section.glyph,
      legacy: Boolean(section.legacy),
      panels: section.panels.map((p) => ({ id: p.id, name: p.name, glyph: p.glyph })),
    })),
  };
  // The rail: one tab per section; a hidden section stays in "All panels" (and in the rail
  // while it is the open one).
  const railSections = sections.filter(
    (section) => section === openSection || !memory.hidden.includes(section.id),
  );
  const logBadge = unread
    ? `<span class="table-log-badge" aria-hidden="true">${unread > 99 ? "99+" : unread}</span><span id="table-log-unread" hidden>${unread} ${t("novità nel registro", "new in the log")}</span>`
    : "";
  const tabButton = (x) => {
    const on = sectionOpen(x);
    // B17 hook: while the log is closed, its unread notifications (category "table-log")
    // show as a badge on the tab holding it; the accessible name stays the tab's own.
    const hasLog = x.panels.some((p) => p.id === "log");
    const attrs = x.legacy
      ? `data-table-drawer="${esc(x.id)}" data-table-tab="${esc(x.id)}"`
      : `data-table-section="${esc(x.id)}" data-table-tab="${esc(x.id)}"${hasLog && unread ? ' aria-describedby="table-log-unread"' : ""}`;
    return `<button type="button" role="tab" id="table-tab-${esc(x.id)}" class="table-tab${on ? " active" : ""}" ${attrs} aria-selected="${on}" aria-expanded="${on}" aria-controls="table-sidebar-panel" tabindex="${x === openSection ? 0 : -1}" aria-label="${x.name}" title="${x.name}">${x.glyph}<span class="table-tab-label" aria-hidden="true">${x.short}</span>${hasLog ? logBadge : ""}</button>`;
  };
  // Sub-tabs of the open section (Foundry journal pages, D&D Beyond Maps panel tabs): the
  // section's panels, each keeping its own data-table-drawer / data-table-tab handle.
  const subtabs =
    !collapsed && !openSection.legacy && openSection.panels.length > 1
      ? `<div class="table-subtabs" role="tablist" aria-label="${openSection.id === "creature" ? t("Creatura", "Creature") : openSection.name}">${openSection.panels
          .map((p) => {
            const on = p.id === tab;
            const handles = `${p.area ? ` data-table-drawer="${esc(p.id)}"` : ""}${p.id !== openSection.id ? ` data-table-tab="${esc(p.id)}"` : ""}`;
            return `<button type="button" role="tab" id="table-subtab-${esc(p.id)}" class="table-subtab${on ? " active" : ""}" data-table-subtab="${esc(p.id)}"${handles} aria-selected="${on}" aria-expanded="${on}" aria-controls="table-sidebar-panel" tabindex="${on ? 0 : -1}">${p.id === "creature" ? "" : p.glyph}<span>${p.id === "creature" ? t("Creatura", "Creature") : p.short}</span>${p.id === "log" ? logBadge : ""}</button>`;
          })
          .join("")}</div>`
      : "";
  // Panel index (hidden): one handle per area panel that is not a visible sub-tab or a tab
  // of its own, so area code and HUD buttons that press `[data-table-drawer="<id>"]` keep
  // opening their panel (registry plan §5.1).
  const indexed = sections
    .filter((section) => !section.legacy)
    .flatMap((section) =>
      section.panels
        .filter((p) => p.area && !(subtabs && section === openSection))
        .map((p) => ({ ...p, home: section.id })),
    );
  // The log keeps the core's `data-table="log"` toggle here (B17 opens the log by pressing
  // it when its aria-expanded is not "true"), whether or not its sub-tab is in view.
  const logHandle = `<button type="button" tabindex="-1" data-table="log" data-table-section-of="${esc(sectionOfPanel("log")?.id ?? "chat")}" aria-expanded="${open("log")}">${t("Registro", "Log")}</button>`;
  const panelIndex = `<div class="table-panel-index" hidden>${logHandle}${indexed
    .map(
      (p) =>
        `<button type="button" tabindex="-1" data-table-drawer="${esc(p.id)}" data-table-section-of="${esc(p.home)}" aria-expanded="${open(p.id)}">${p.name}</button>`,
    )
    .join("")}</div>`;
  // P6 TV-08 (Roll20's X, the key on the button): the last move, at the top of the panel.
  const lastMove = reg?.get("command", "special-moves.last-move", ctx)
    ? `<div class="inspector-quick"><button type="button" class="button quiet" data-table="last-move" aria-pressed="${specialMovesView().lastMove === true}" aria-keyshortcuts="Shift+X">${icon("undo")} ${t("Ultima mossa", "Last move")} <kbd>${t("Maiusc+X", "Shift+X")}</kbd></button></div>`
    : "";
  // Visual pass 2 (BG3 HUD): the hotbar already shows the controlled creature's hit points,
  // turn resources and movement, so the Creature tab keeps what the HUD does not — Armor
  // Class beside the name (D&D Beyond's AC shield, Solasta's AC box), the move being prepared
  // or the path being planned first (BG3 shows the chosen action's card first), then
  // conditions, forms, effects and the sheet commands — in one compact column.
  const armorClass =
    actor.ac + (actor.combatEffects?.some((effect) => effect.type === "shield") ? 5 : 0);
  const inspector = `<div class="table-inspector"><div class="inspector-person"><span class="portrait">${esc(actor.name[0])}</span><div><h2>${esc(actor.name)}</h2><span class="muted">${control ? t("Sotto il tuo controllo", "Under your control") : t("Controllata dal DM", "DM controlled")}</span></div>${control ? `<span class="inspector-ac"><small>${t("CA", "AC")}</small><strong>${armorClass}</strong></span>` : ""}</div>${lastMove}
  ${control && preview ? renderCombatInspector(ctx, selected) : ""}${renderPathControls(ctx, selected, mode === "plan" && control)}${control ? renderConditionsSummary(ctx, selected, { embedded: true }) : ""}${control ? renderFormsSummary(ctx, selected) : ""}
  ${control ? `${renderActiveEffects(ctx, selected)}${preview ? "" : renderCombatInspector(ctx, selected)}<div class="inspector-buttons"><button class="button" data-table="sheet">${icon("book")} ${t("Scheda completa", "Full sheet")}</button><button class="button" data-table="inventory">${icon("bag")} ${t("Inventario", "Inventory")}</button>${actor.kind === "character" ? `<button class="button" data-table="rest">${t("Riposa", "Rest")}</button>` : ""}</div>` : `${tokenStatus(ctx, state.actors[selected]).text ? `<p class="effect-note" data-public-status>${t("Stato visibile", "Visible status")}: <strong>${esc(tokenStatus(ctx, state.actors[selected]).text)}</strong></p>` : ""}<p class="muted">${t("Puoi osservare questa creatura. Il DM ne gestisce i comandi e la scheda.", "You can observe this creature. The DM controls its actions and sheet.")}</p>`}
  ${panels("inspector")
    .map(
      (c) =>
        `<section class="table-ext-panel"><h3>${esc(reg.label(c, ctx.lang))}</h3>${reg.slot("table-panel", c, ctx, tableView)}</section>`,
    )
    .join("")}</div>`;
  const log = logPanel
    ? `<section class="table-log">${reg.slot("table-panel", logPanel, ctx, tableView)}</section>`
    : `<section class="table-log"><h3>${t("Registro della sessione", "Session log")}</h3>${
        state.log
          .filter((l) => l.visibility !== "private" || l.controller === ctx.role)
          .slice(-8)
          .reverse()
          .map(
            (l) =>
              `<p><small>${new Date(l.time).toLocaleTimeString(langTag(ctx), { hour: "2-digit", minute: "2-digit" })} · ${l.kind === "correction" ? t("Correzione", "Correction") : l.controller === "dm" ? "DM" : t("Tu", "You")}</small>${esc(l.label)}</p>`,
          )
          .join("") || `<p class="muted">${t("Nessun evento.", "No events yet.")}</p>`
      }</section>`;
  const drawer = areaTabs.find((c) => c.id === tab);
  const body = collapsed
    ? ""
    : subtabs +
      (tab === "log"
        ? log
        : drawer
          ? `<section class="table-drawer" id="table-drawer" aria-labelledby="table-drawer-title"><div class="table-drawer-heading"><h2 id="table-drawer-title">${esc(reg.label(drawer, ctx.lang))}</h2><button type="button" class="button quiet" data-table-drawer-close="${esc(drawer.id)}">${t("Chiudi pannello", "Close panel")}</button></div>${reg.slot("table-panel", drawer, ctx, tableView)}</section>`
          : inspector);
  const sideLabel = collapsed
    ? t("Espandi il pannello laterale", "Expand the side panel")
    : t("Comprimi il pannello laterale", "Collapse the side panel");
  // Bottom bar (B61, BG3 hotbar and resource bar CRP-098/099): the controlled creature's
  // resources beside its commands; free roll and Undo stay reachable from every tab.
  const resources = control
    ? `<div class="resources" aria-label="${t("Risorse del turno", "Turn resources")}"><span class="${actor.action ? "available" : ""}"><span class="resource-word">${t("Azione", "Action")}</span></span><span class="${actor.bonus ? "available" : ""}"><span class="resource-word">${t("Bonus", "Bonus")}</span></span><span class="${actor.reaction ? "available" : ""}"><span class="resource-word">${t("Reazione", "Reaction")}</span></span><span class="available movement"><span class="resource-word">${t("Movimento", "Movement")}</span> ${movementText} m</span></div>`
    : "";
  // P6 PG-46 (Alchemy's player bar, BG3's portrait with HP): the controlled creature's hit
  // points, temporary hit points and spell slots on the hotbar; the HP opens the HP widget.
  const vitals = control ? hotbarVitals(ctx, state.actors[selected]) : { hp: "", slots: "" };
  // Bottom hotbar (B62, BG3 hotbar CRP-098/099): one bar instead of stacked ones — the
  // controlled creature and its resources on the left, the action pages in the middle (the
  // creature's actions and common actions with B40's moves; the B53 quick bar pages, like
  // Foundry's hotbar pages FVT-194), the turn commands on the right with End turn last.
  const actionsPage = renderCombatBar(
    ctx,
    selected,
    // B40 (W2b1 integration): "dock" commands are common actions of the selected creature;
    // they close the action bar after Dash, Dodge and Disengage (BG3 hotbar, CRP-098).
    panels("dock")
      .map((c) => reg.slot("table-panel", c, ctx, tableView))
      .join(""),
  );
  // B53 (additive): the quick bar's rows ("dock-row") are the hotbar's second page.
  const quickPage = panels("dock-row")
    .map((c) => reg.slot("table-panel", c, ctx, tableView))
    .join("");
  const hotbarPages = [
    actionsPage && { id: "actions", label: t("Azioni", "Actions"), html: actionsPage },
    quickPage && { id: "quickbar", label: t("Barra rapida", "Quick bar"), html: quickPage },
  ].filter(Boolean);
  const hotbarPage = hotbarPages.find((p) => p.id === memory.hotbar) ?? hotbarPages[0];
  // Visual pass 2: BG3's resource row stands above the middle of the hotbar — Action, Bonus
  // action, Reaction and Movement, then the spell slots — as one strip over the map.
  const resourceRow = control
    ? `<div class="hotbar-resources">${resources}${vitals.slots}</div>`
    : "";
  const hotbarCenter =
    hotbarPages.length || resourceRow
      ? `<div class="hotbar-center">${resourceRow}${
          hotbarPages.length > 1
            ? `<div class="hotbar-pages" role="tablist" aria-label="${t("Pagine della barra", "Bar pages")}">${hotbarPages
                .map(
                  (p) =>
                    `<button type="button" role="tab" id="hotbar-tab-${p.id}" class="hotbar-page-tab${p === hotbarPage ? " active" : ""}" data-hotbar-page="${p.id}" aria-selected="${p === hotbarPage}" aria-controls="hotbar-panel-${p.id}" tabindex="${p === hotbarPage ? 0 : -1}">${p.label}</button>`,
                )
                .join("")}</div>`
            : ""
        }${hotbarPages
          .map(
            (p) =>
              `<div class="hotbar-page" id="hotbar-panel-${p.id}" data-hotbar-panel="${p.id}"${hotbarPages.length > 1 ? ` role="tabpanel" aria-labelledby="hotbar-tab-${p.id}"` : ""}${p === hotbarPage ? "" : " hidden"}>${p.html}</div>`,
          )
          .join("")}</div>`
      : "";
  const hotbarHTML = `<div class="action-dock table-hotbar ${preview ? "has-preview" : ""}"><div class="hotbar-identity"><span class="portrait hotbar-portrait" aria-hidden="true">${esc(actor.name[0])}</span><div><div class="hotbar-name"><strong>${esc(actor.name)}</strong>${vitals.hp}</div><span>${state.combat.active ? (current === selected ? t("È il tuo turno", "Your turn") : t("Puoi preparare una mossa fuori turno", "You can preview off turn")) : t("Esplora la scena liberamente", "Explore the scene freely")}</span></div></div>${hotbarCenter}<div class="toolbar">${preview ? `<button class="button mobile-combat-link" data-table="map-focus">${t("Mappa", "Map")}</button><button class="button mobile-combat-link" data-table="preview-focus">${t("Dettagli mossa", "Move details")}</button>` : ""}<button class="button ${mode === "move" ? "active" : ""}" data-tool="move" title="${t("Muovi", "Move")}">${icon("move")} <span class="dock-text">${t("Muovi", "Move")}</span></button>${control && hasCondition(state.actors[selected], "prone") ? renderStandButton(ctx, selected) : ""}${control ? `<button class="button" data-table="actions" title="${t("Azioni della scheda", "Sheet actions")}">${icon("sword")} <span class="dock-text">${t("Azioni della scheda", "Sheet actions")}</span></button><button class="button" title="${t("Tira i dadi", "Roll dice")}" data-table="dice">${icon("dice")} <span class="dock-text">${t("Tira i dadi", "Roll dice")}</span></button>` : ""}<button class="button quiet" title="Esc · ${t("Annulla preparazione", "Cancel preview")}" data-table="cancel">${icon("close")} <span class="dock-text">Esc · ${t("Annulla preparazione", "Cancel preview")}</span></button>${control ? `<button class="button quiet" title="${t("Annulla ultima modifica", "Undo last change")}" data-table="undo">${icon("undo")} <span class="dock-text">${t("Annulla ultima modifica", "Undo last change")}</span></button>` : ""}${state.combat.active && (runsSession(ctx.state, ctx.role) || (current === selected && control)) ? `<button class="button primary" data-table="end-turn">${t("Termina turno", "End turn")}</button>` : ""}</div></div>`;
  // Visual pass 2: BG3's party portraits at the bottom left — the characters in play on this
  // scene, the selected one framed in gold, an HP bar for those this viewer controls (the map
  // token shows the same) and the token's condition or vitality badge. A press selects the
  // creature, as a portrait does in BG3; `data-party-select` keeps `data-select` unique to
  // the turn order.
  const partyIds = scene.tokens
    .map((token) => token.actorId)
    .filter(
      (id, index, all) =>
        all.indexOf(id) === index &&
        state.actors[id]?.kind === "character" &&
        !state.actors[id].companion &&
        inPlay(id) &&
        canObserve(id),
    );
  const partyHTML = partyIds.length
    ? `<nav class="table-party" aria-label="${t("Gruppo", "Party")}">${partyIds
        .map((id) => {
          const member = state.actors[id];
          const ours = ctx.canControl(member);
          const status = tokenStatus(ctx, member);
          const max = Math.max(1, Number(member.maxHp) || 1);
          const hp = Math.max(0, Number(member.hp) || 0);
          const tone = hp === 0 ? " is-down" : hp <= max / 2 ? " is-low" : "";
          const label = `${member.name}${ours ? `, ${hp} ${t("punti ferita su", "hit points of")} ${max}` : ""}${status.text ? ", " + status.text : ""}`;
          const badge = status.vital
            ? `<span class="table-party-status" data-party-status="${status.vital}" aria-hidden="true">${{ dead: "✝", dying: "♥", stable: "✚" }[status.vital] ?? status.names.length}</span>`
            : "";
          return `<button type="button" class="table-party-member${id === selected ? " is-selected" : ""}" data-party-select="${esc(id)}" aria-pressed="${id === selected}" aria-label="${esc(label)}" title="${esc(label)}"><span class="table-party-portrait" aria-hidden="true">${esc(member.name[0])}</span>${badge}${ours ? `<span class="table-party-hp${tone}" aria-hidden="true"><span style="width:${Math.min(100, (100 * hp) / max)}%"></span></span>` : ""}<span class="table-party-name" aria-hidden="true">${esc(member.name)}</span></button>`;
        })
        .join("")}</nav>`
    : "";
  return `<div class="table-layout${collapsed ? " is-collapsed" : ""}"><div class="table-topline"><div><h1>${esc(scene.name)}</h1><span>${state.combat.active ? t("Combattimento · Round", "Combat · Round") + " " + state.combat.round : t("Esplorazione libera", "Free exploration")}</span></div><div class="toolbar">${runsSession(ctx.state, ctx.role) ? `<button class="button" data-table="combat">${state.combat.active ? t("Concludi incontro", "End encounter") : t("Avvia combattimento", "Start combat")}</button><button class="button quiet" data-table="scenes" title="${t("Scene al Tavolo: attiva o apri un’altra scena", "Scenes at the Table: activate or open another scene")}">${icon("map")} ${t("Scene", "Scenes")}</button>` : ""}<button class="button quiet" data-table="rests">${t("Riposi", "Rests")}</button>${runsSession(ctx.state, ctx.role) ? `<button class="button quiet" data-table="time">${t("Tempo", "Time")}</button>` : ""}</div></div>
  ${
    state.combat.active
      ? `<div class="initiative" aria-label="${t("Ordine dei turni", "Turn order")}">${state.combat.order
          .filter(canObserve)
          .map((id, _i, _all, shown = visibleTurnActor(state, canObserve)) => {
            // B32 (DDB-138): a hidden current turn leaves the viewer on the last visible one.
            const a = state.actors[id];
            return `<button class="initiative-token ${id === shown ? "current" : ""}" data-select="${id}"><span class="token-dot ${(a.combatProfile?.team ?? (["goblin-1", "goblin-2"].includes(a.id) ? "watch" : null)) === "watch" ? "hostile" : ""}">${esc(a.name[0])}</span><span>${esc(a.name)}${id === shown ? `<small>${t("Turno attuale", "Current turn")}</small>` : ""}</span></button>`;
          })
          .join("")}</div>`
      : ""
  }
  ${renderInterruptions(ctx)}<div class="table-stage"><div class="map-toolbar${compact && !toolsOpen ? " is-collapsed" : ""}" id="map-toolbar" role="toolbar" aria-label="${t("Strumenti mappa", "Map tools")}"><button type="button" class="map-tool map-tools-toggle" data-map-tools-toggle aria-expanded="${!compact || toolsOpen}" aria-controls="map-toolbar" aria-label="${t("Strumenti della mappa", "Map tools")}" title="${t("Strumenti della mappa", "Map tools")}">${icon(toolGroups.find((group) => group.id === activeGroup)?.icon ?? "menu")}</button>${toolGroups.map(groupHTML).join("")}</div>${partyHTML}

  <div class="map-container"><svg id="battle-map" viewBox="${bounds}" data-mode="${esc(mode)}" role="application" aria-label="${t("Mappa. Tab fino a una pedina, frecce per prepararne il movimento, Invio per eseguire, Esc per annullare; + e − per lo zoom.", "Map. Tab to a token, arrow keys prepare its movement, Enter executes, Escape cancels; + and − zoom.")}" tabindex="0">
  <defs><pattern id="map-grid" x="${scene.gridOffsetX || 0}" y="${scene.gridOffsetY || 0}" width="${scene.gridSize}" height="${scene.gridSize}" patternUnits="userSpaceOnUse"><path d="M ${scene.gridSize} 0 H0 V${scene.gridSize}" fill="none" stroke="#d9c79c" stroke-opacity=".15" stroke-width="1"/></pattern></defs>
  ${renderSceneBase(scene, ctx)}
  ${scene.gridVisible !== false ? `<rect width="${scene.width}" height="${scene.height}" fill="url(#map-grid)"/>` : ""}
  <g pointer-events="none">${renderSpatialOverlay(scene, ctx, { players: !runsSession(ctx.state, ctx.role) })}</g>
  <g id="preview-layer" pointer-events="none"></g><g id="combat-map-layer" pointer-events="none">${renderCombatMap(ctx, selected)}</g>
  ${layers(false)}<g id="tokens">${scene.tokens
    .filter((token) => canObserve(token.actorId))
    // R3 PG-79: a rider is drawn above its mount (Foundry's attached tokens).
    .map((token, index) => ({ token, index, rider: ridesOn(state, token.actorId) ? 1 : 0 }))
    .sort((a, b) => a.rider - b.rider || a.index - b.index)
    .map(({ token }) => token)
    .map((token) => {
      const a = state.actors[token.actorId];
      const ours = ctx.canControl(a);
      const status = tokenStatus(ctx, a);
      const onMap = selected === a.id && !deselected;
      // R3 PG-77 (dnd5e Transformation, BG3 forms keep identity): «Lupo (Sentinella)».
      const shown = formTokenName(a, ctx.lang);
      return `<g class="map-token ${(a.combatProfile?.team ?? (["goblin-1", "goblin-2"].includes(a.id) ? "watch" : null)) === "watch" ? "hostile" : ""} ${onMap ? "selected" : ""} ${status.vital === "dead" ? "is-dead" : ""}" data-actor="${a.id}" transform="translate(${token.x},${token.y})" tabindex="0" role="button" aria-label="${esc(shown)}${ours ? ", " + a.hp + " " + t("punti ferita", "hit points") : ""}${status.text ? ", " + esc(status.text) : ""}"${a.activeForm ? ` data-token-form="${esc(a.activeForm.profileId ?? "")}"` : ""}><circle class="token-hit" r="23"/><g class="token-display" ${status.vital === "dead" ? 'opacity="0.55"' : ""}><circle r="23"/><circle r="28" class="selection-ring"/><text y="6" text-anchor="middle">${esc(shown[0])}</text><text class="token-name" y="44" text-anchor="middle">${esc(shown)}</text>${ours ? `<rect x="-22" y="29" width="44" height="4" rx="2" fill="#111b25"/><rect x="-22" y="29" width="${(44 * a.hp) / a.maxHp}" height="4" rx="2" fill="#8fb48a"/>` : ""}${status.vital ? `<g class="token-status" data-token-status="${status.vital}" transform="translate(21,-21)"><title>${esc(status.text)}</title><circle r="10" fill="${status.vital === "conditions" ? "#142733" : "#5b1f22"}" stroke="#e2c17b" stroke-width="1.5"/><text y="4" text-anchor="middle" font-size="12" fill="#f4e4bf">${{ dead: "✝", dying: "♥", stable: "✚" }[status.vital] ?? status.names.length}</text></g>` : ""}${status.text && onMap ? `<text class="token-status-label" y="-36" text-anchor="middle" font-size="13" fill="#f4e4bf" stroke="#111b25" stroke-width="3" paint-order="stroke">${esc(status.text)}</text>` : ""}</g></g>`;
    })
    .join(
      "",
    )}</g><g id="preview-top" pointer-events="none"></g>${layers(true)}<g class="door-controls">${renderDoorControls(ctx)}</g>${layers(true, true)}</svg>
  <div class="map-zoom" role="group" aria-label="${t("Vista della mappa", "Map view")}">${findButton(ctx, scene)}<button class="map-tool" data-table="zoom-in" aria-label="${t("Ingrandisci", "Zoom in")}" aria-keyshortcuts="+" title="${t("Ingrandisci", "Zoom in")} (+ · ${t("rotellina", "wheel")})">+</button><button class="map-tool" data-table="zoom-out" aria-label="${t("Riduci", "Zoom out")}" aria-keyshortcuts="-" title="${t("Riduci", "Zoom out")} (− · ${t("rotellina", "wheel")})">−</button><button class="map-tool" data-table="fit" aria-label="${t("Centra la scena", "Fit scene")}" title="${t("Centra la scena", "Fit scene")}">${TARGET_ICON}</button></div>
  <div class="map-caption"><span>${t("Scala", "Scale")}: ${formatNumber(ctx.lang, scene.metersPerCell, 2)} m / ${t("casella", "cell")}</span><span id="map-message" role="status">${idleHint(ctx)}</span></div></div>
  </div>${`<div class="table-sidebar-panel" id="table-sidebar-panel" role="tabpanel" aria-labelledby="${subtabs ? `table-subtab-${esc(tab)}` : `table-tab-${esc(openSection.id)}`}" data-table-panel="${esc(tab)}" data-table-section="${esc(openSection.id)}"${collapsed ? " hidden" : ""}>${body}</div>`}<div class="table-sidebar-rail"><button type="button" class="table-sidebar-toggle" data-table-sidebar="toggle" aria-expanded="${!collapsed}" aria-controls="table-sidebar-panel" aria-label="${sideLabel}" title="${sideLabel}">${icon("panel")}</button><button type="button" class="table-map-link" data-table-map-link aria-label="${t("Vai alla mappa", "Go to the map")}">${icon("map")}<span class="table-tab-label" aria-hidden="true">${t("Mappa", "Map")}</span></button><button type="button" class="table-panels-all" data-table-panels aria-haspopup="dialog" aria-label="${t("Tutti i pannelli", "All panels")}" title="${t("Tutti i pannelli", "All panels")}">${icon("grid")}<span class="table-tab-label" aria-hidden="true">${t("Tutti", "All")}</span></button><div class="table-tabs" role="tablist" aria-label="${t("Pannelli del Tavolo", "Table panels")}" aria-orientation="${compact ? "horizontal" : "vertical"}">${railSections.map(tabButton).join("")}</div>${panelIndex}</div>
  ${hotbarHTML}</div>`;
}
const langTag = (ctx) => (ctx.lang === "it" ? "it-IT" : "en-GB");
// TV-77: a warning at the very start sits under the mover's own token: it is drawn a token's
// width along the path instead, where it can be seen.
function clearOfToken(warnings, preview) {
  const path = preview?.reachablePath ?? [];
  const start = path[0];
  const next = path.find((p) => start && Math.hypot(p.x - start.x, p.y - start.y) > 1);
  if (!start || !next) return warnings;
  const length = Math.hypot(next.x - start.x, next.y - start.y);
  const step = Math.min(30, length);
  return warnings.map((w) =>
    Math.hypot(w.x - start.x, w.y - start.y) < 30
      ? {
          ...w,
          x: start.x + ((next.x - start.x) / length) * step,
          y: start.y + ((next.y - start.y) / length) * step,
        }
      : w,
  );
}
// A value inside a double-quoted attribute selector.
const attrValue = (value) => String(value).replace(/["\\]/g, "\\$&");
/**
 * P6 TV-27: for a player, the labels of map layers (regions, objects, notes) that lie under
 * the fog or out of sight are neither drawn over the fog nor read by a screen reader, as the
 * tokens there already are not.
 */
function hideTextUnderFog(ctx, svg, scene) {
  if (runsSession(ctx.state, ctx.role) || !scene || typeof DOMPoint === "undefined") return;
  let view = null;
  try {
    view = fogModel(ctx, scene);
  } catch {
    return;
  }
  if (!view?.opaque || (!view.cfg?.fog?.length && !view.view?.vision)) return;
  const sees = (p) =>
    !fogHiddenAt(scene, view.cfg.fog ?? [], p) &&
    (!view.view.vision || view.viewers.some((viewer) => canSee(viewer, view.lit, p).visible));
  const inverse = svg.getScreenCTM()?.inverse();
  if (!inverse) return;
  // A label shown only while Alt is held has no box yet: its own x and y are scene points
  // when no group around it moves it.
  const placed = (node) => {
    for (let el = node.parentElement; el && el !== svg; el = el.parentElement)
      if (el.hasAttribute("transform")) return null;
    const x = Number(node.getAttribute("x")),
      y = Number(node.getAttribute("y"));
    return Number.isFinite(x) && Number.isFinite(y) && node.hasAttribute("x") ? { x, y } : null;
  };
  for (const node of svg.querySelectorAll('[data-ext-slot^="map-layer:"] text')) {
    const box = node.getBoundingClientRect();
    const at =
      box.width || box.height
        ? new DOMPoint(box.x + box.width / 2, box.y + box.height / 2).matrixTransform(inverse)
        : placed(node);
    if (!at || sees(at)) continue;
    node.setAttribute("visibility", "hidden");
    node.setAttribute("aria-hidden", "true");
    const group = node.parentElement;
    if (group && !group.hasAttribute("data-ext-slot")) group.setAttribute("aria-hidden", "true");
  }
}
/**
 * P6 TV-106 (Foundry's scene navigation): the Table's «Scene» opens the list of scenes over
 * the map. «Attiva per il gruppo» moves the party view there (no token moves, no combat
 * starts); «Apri per me» previews it privately in Preparation; «Prepara le scene» opens the
 * scene list there.
 */
export function openSceneNavigator(ctx) {
  const { t, esc, state } = ctx;
  if (!runsSession(ctx.state, ctx.role)) return;
  const active = state.scenes.find((scene) => scene.id === state.activeSceneId);
  const rows = state.scenes
    .map((scene) => {
      const on = scene.id === state.activeSceneId;
      return `<li class="table-scenes-row${on ? " is-active" : ""}"><span class="table-scenes-name"><strong>${esc(scene.name)}</strong>${on ? ` <span class="badge">${t("Al Tavolo", "At the Table")}</span>` : ""}</span><span class="toolbar">${on ? "" : `<button type="button" class="button" data-table-scene-activate="${esc(scene.id)}">${t("Attiva per il gruppo", "Activate for the party")}<span class="visually-hidden"> · ${esc(scene.name)}</span></button>`}<button type="button" class="button quiet" data-table-scene-open="${esc(scene.id)}">${t("Apri per me", "Open for me")}<span class="visually-hidden"> · ${esc(scene.name)}</span></button></span></li>`;
    })
    .join("");
  ctx.dialog(
    t("Scene", "Scenes"),
    `<p class="muted">${t("La scena al Tavolo è", "The scene at the Table is")} <strong>${esc(active?.name ?? t("nessuna", "none"))}</strong>. ${t("Attivare un’altra scena sposta la vista del gruppo: non trasferisce pedine e non avvia un combattimento.", "Activating another scene moves the party view: it does not transfer tokens or start combat.")}</p><ul class="table-scenes">${rows}</ul><div class="toolbar"><button type="button" class="button quiet" data-table="prepare" data-table-scene-prepare>${t("Prepara le scene", "Prepare scenes")}</button></div>`,
    { cancelLabel: t("Chiudi", "Close") },
  );
  const dialog = globalThis.document?.querySelector("#dialog");
  dialog?.querySelectorAll("[data-table-scene-activate]").forEach(
    (button) =>
      (button.onclick = () => {
        const id = button.dataset.tableSceneActivate;
        try {
          ctx.commit(t("Scena attivata al Tavolo", "Scene activated at table"), (s) =>
            activateScene(s, id, ctx.role),
          );
          ctx.closeDialog();
        } catch (error) {
          ctx.toast(ctx.label(error.it ? error : error.message), true);
        }
      }),
  );
  dialog?.querySelectorAll("[data-table-scene-open]").forEach(
    (button) =>
      (button.onclick = () => {
        ctx.closeDialog();
        ctx.navigate("preparation", { id: button.dataset.tableSceneOpen, tab: "preview" });
      }),
  );
  dialog?.querySelector("[data-table-scene-prepare]")?.addEventListener("click", () => {
    ctx.closeDialog();
    ctx.navigate("preparation");
  });
}
// P6 TV-05: «Centra la scena» shows a target (Owlbear, D&D Beyond Maps), not an eye.
const TARGET_ICON =
  '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>';
const FIND_ICON =
  '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M6.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5"/><circle cx="12" cy="12" r="10" stroke-dasharray="3 3"/></svg>';
/**
 * The map's idle hint (P6 TV-01, TV-05, TV-11): how to move, pan and zoom, and the hold-Alt
 * labels (BG3's highlight key), in the status line under the map.
 */
export function idleHint(ctx) {
  const phone = globalThis.matchMedia?.("(pointer: coarse)")?.matches === true;
  return phone
    ? ctx.t(
        "Trascina la tua pedina per muoverla · un dito sul vuoto sposta la vista, due dita per lo zoom · pressione lunga per il menu.",
        "Drag your token to move it · one finger on empty ground pans, two fingers zoom · long-press for the menu.",
      )
    : ctx.t(
        "Trascina una pedina per muoverla · trascina il vuoto per spostare la vista · rotellina o + e − per lo zoom · tieni premuto Alt per le etichette.",
        "Drag a token to move it · drag empty ground to pan · wheel or + and − to zoom · hold Alt for labels.",
      );
}
// The viewer's own token on this scene: the selected one when it is theirs, else their
// first character (Monk's «Find my token»); for the DM the selected token.
function ownTokenId(ctx, scene) {
  const mine = (id) => ctx.canControl(ctx.state.actors[id]);
  if (runsSession(ctx.state, ctx.role))
    return scene.tokens.some((token) => token.actorId === selected) ? selected : null;
  if (scene.tokens.some((token) => token.actorId === selected) && mine(selected)) return selected;
  return (
    scene.tokens.find(
      (token) => mine(token.actorId) && ctx.state.actors[token.actorId]?.kind === "character",
    )?.actorId ??
    scene.tokens.find((token) => mine(token.actorId))?.actorId ??
    null
  );
}
function findButton(ctx, scene) {
  const id = ownTokenId(ctx, scene);
  if (!id) return "";
  const label = runsSession(ctx.state, ctx.role)
    ? ctx.t("Trova la pedina selezionata", "Find the selected token")
    : ctx.t("Trova la mia pedina", "Find my token");
  return `<button class="map-tool" data-table="find-token" data-find-actor="${ctx.esc(id)}" aria-label="${label}" title="${label}">${FIND_ICON}</button>`;
}
/**
 * P6 PG-46: hit points (bar and numbers, a button that opens the HP widget), temporary hit
 * points and spell-slot pips of the controlled creature, for the hotbar: {hp, slots}.
 */
export function hotbarVitals(ctx, actor) {
  if (!actor) return { hp: "", slots: "" };
  const { t, esc } = ctx;
  const hp = Math.max(0, Number(actor.hp) || 0),
    max = Math.max(1, Number(actor.maxHp) || 1),
    temp = Math.max(0, Number(actor.tempHp) || 0);
  const pct = Math.max(0, Math.min(100, (100 * hp) / max));
  const tone = hp === 0 ? "is-down" : hp <= max / 2 ? "is-low" : "";
  const hpText = `${hp}/${max}${temp ? ` +${temp}` : ""}`;
  const label = `${t("Punti ferita", "Hit points")} ${hp} ${t("su", "of")} ${max}${temp ? `, ${temp} ${t("temporanei", "temporary")}` : ""}. ${t("Apri i punti ferita", "Open hit points")}`;
  const pools = Object.entries(actor.spellSlots ?? (actor.slots ? { 1: actor.slots } : {}))
    .map(([level, pool]) => ({
      level: Number(level),
      max: Math.max(0, Number(pool?.max) || 0),
      used: Math.max(0, Number(pool?.used) || 0),
    }))
    .filter((pool) => pool.level > 0 && pool.max > 0)
    .sort((a, b) => a.level - b.level);
  const slots = pools.length
    ? `<div class="hotbar-slots" role="img" aria-label="${t("Slot incantesimo", "Spell slots")}: ${pools.map((pool) => `${t("livello", "level")} ${pool.level} ${Math.max(0, pool.max - pool.used)}/${pool.max}`).join(", ")}">${pools
        .map(
          (pool) =>
            `<span class="hotbar-slot-level" aria-hidden="true"><small>${pool.level}</small>${Array.from({ length: pool.max }, (_, i) => `<i class="${i < pool.max - pool.used ? "is-full" : ""}"></i>`).join("")}</span>`,
        )
        .join("")}</div>`
    : "";
  return {
    slots,
    hp: `<button type="button" class="hotbar-hp ${tone}" data-table="hp" aria-label="${esc(label)}" title="${esc(label)}"><span class="hotbar-hp-bar" aria-hidden="true"><span style="width:${pct}%"></span>${temp ? `<span class="hotbar-hp-temp" style="width:${Math.min(100, (100 * temp) / max)}%"></span>` : ""}</span><span class="hotbar-hp-text" aria-hidden="true"><span class="hotbar-hp-unit">${t("PF", "HP")} </span>${esc(hpText)}</span></button>`,
  };
}
// Stand up from Prone: half the effective speed of movement, no action or Dash.
function standPreview(ctx, actorId, state = ctx.state) {
  try {
    return previewStand(state, actorId, ctx.role, standContextFor(state, actorId));
  } catch (error) {
    return {
      canApply: false,
      errors: [error.it ? error : { it: error.message, en: error.message }],
    };
  }
}
function renderStandButton(ctx, actorId) {
  const p = standPreview(ctx, actorId);
  const cost = p.costs?.find((c) => c.kind === "movement")?.amount;
  const amount = Number.isFinite(cost)
    ? " · " + new Intl.NumberFormat(langTag(ctx), { maximumFractionDigits: 2 }).format(cost) + " m"
    : "";
  const why = p.canApply ? "" : ctx.label(p.errors?.[0] ?? "");
  // An impossible Stand up is disabled with its reason in view (touch has no tooltip).
  return why
    ? `<span class="stand-control"><button class="button" data-table="stand" disabled aria-describedby="stand-why">${ctx.t("Rialzati", "Stand up")}</button><small class="muted" id="stand-why">${ctx.esc(why)}</small></span>`
    : `<button class="button" data-table="stand">${ctx.t("Rialzati", "Stand up")}${amount}</button>`;
}
export function bindTable(root, ctx) {
  const popout = String(ctx.view?.tab ?? "").startsWith("window:");
  if (!popout) relayCtx = ctx;
  installRelay();
  if (popout) bindPanelWindow(root, ctx, decodeURIComponent(ctx.view.tab.slice(7)));
  bindFormsSummary(root, ctx);
  bindConditionsSummary(root, ctx);
  // X-07: an item or spell from the compendium dropped on the Creature tab joins that sheet.
  bindEntryDrop(root.querySelector(".table-inspector"), ctx, selected);
  const { state, t, esc } = ctx;
  const svg = root.querySelector("#battle-map");
  if (!svg) {
    // No map on screen (an empty state or an area cover): the previous map's listeners
    // and active tool are released, and a cover panel is bound.
    deactivateTool();
    mapResizeObserver?.disconnect();
    clearResponsiveLayout?.();
    clearTableKeyboard?.();
    ctx.registry?.bindSlots(root, ctx, { points: ["table-panel"] });
    return;
  }
  mapResizeObserver?.disconnect();
  clearResponsiveLayout?.();
  clearTableKeyboard?.();
  mapBinds += 1;
  const compactLayout = matchMedia("(max-width: 720px)");
  const arrangeActions = () => {
    if (!root.isConnected) return;
    // B62: the action bar lives inside the hotbar; only a stand-alone one is placed here.
    const bar = root.querySelector(".table-layout > .combat-bar");
    // Phone: the action bar right under the map. Wider: after the sidebar in the page
    // order (map, side panel, tabs, actions), placed at the bottom of the map column.
    const anchor = root.querySelector(
      compactLayout.matches ? ".map-container" : ".table-sidebar-rail",
    );
    if (bar && anchor && anchor.nextElementSibling !== bar) anchor.after(bar);
  };
  arrangeActions();
  // A collapsed sidebar exists only beside the map: crossing the phone width draws again.
  const onLayoutChange = () =>
    sidebarFor(ctx.role).collapsed && root.isConnected ? ctx.render() : arrangeActions();
  compactLayout.addEventListener("change", onLayoutChange);
  clearResponsiveLayout = () => compactLayout.removeEventListener("change", onLayoutChange);
  const sizeTouchTokens = () => {
    const scale = svg.getScreenCTM()?.a || 1;
    // P6 TV-06: a phone enlarges small tokens for the finger, but a Medium token never grows
    // past its cell (the drawn token is 46 units wide): neighbours never overlap.
    const grid = state.scenes.find((s) => s.id === state.activeSceneId)?.gridSize ?? 50;
    const cellCap = Math.max(1, (grid * 0.98) / 46);
    const factor = window.matchMedia("(max-width: 720px)").matches
      ? Math.min(cellCap, Math.max(1, 1 / scale))
      : 1;
    svg
      .querySelectorAll(".token-display")
      .forEach((token) => token.setAttribute("transform", "scale(" + factor + ")"));
    // Door buttons are controls, not creatures: on a phone they keep a finger-sized target.
    const doorFactor = window.matchMedia("(max-width: 720px)").matches ? Math.max(1, 1 / scale) : 1;
    svg
      .querySelectorAll(".door-display")
      .forEach((door) => door.setAttribute("transform", "scale(" + doorFactor + ")"));
    // The drawn token stays within its cell; on a phone the finger still gets a 44 px target
    // around it (an invisible hit circle, WCAG 2.5.8 / Apple's 44 pt).
    const hit = window.matchMedia("(max-width: 720px)").matches ? Math.max(23, 23 / scale) : 23;
    svg.querySelectorAll(".token-hit").forEach((circle) => circle.setAttribute("r", String(hit)));
    fitHud();
  };
  // Visual pass 2 (BG3 HUD over a full-height map): beside the map the tool column and the
  // turn order start under the scene plate, however tall a larger interface or a narrow
  // window makes it; in a larger interface the tool column scrolls above the hotbar band.
  // The party portraits (bottom left) never cover the tool column: they drop their names and
  // shrink, then scroll in the room left, and step aside when not even one portrait fits.
  const fitHud = () => {
    const stage = root.querySelector(".table-stage");
    const tools = root.querySelector(".table-stage > .map-toolbar");
    const topline = root.querySelector(".table-layout > .table-topline");
    const turns = root.querySelector(".table-layout > .initiative");
    const dock = root.querySelector(".table-layout > .action-dock");
    if (!stage || !tools) return;
    const box = stage.getBoundingClientRect();
    tools.style.top = tools.style.maxHeight = "";
    if (turns) turns.style.marginTop = "";
    // Critique 2: the scene plate ends before the row of map controls at the top right (the
    // session menu, the safety chips): a narrow window wraps the plate's commands under the
    // scene's name, as the narrower layout already does, instead of covering that row.
    if (topline) topline.style.maxWidth = "";
    const controls = [...root.querySelectorAll(".session-view-hud-bar > *")].filter(
      (el) => el.getClientRects().length,
    );
    if (!compactLayout.matches && box.height && topline && controls.length) {
      const plate = topline.getBoundingClientRect();
      const rowLeft = Math.min(...controls.map((el) => el.getBoundingClientRect().left));
      const rowTop = Math.min(...controls.map((el) => el.getBoundingClientRect().top));
      if (rowTop < plate.bottom && plate.right > rowLeft - 12)
        topline.style.maxWidth = `${Math.max(160, Math.floor(rowLeft - 12 - plate.left))}px`;
    }
    if (!compactLayout.matches && box.height && topline) {
      const below = Math.round(topline.getBoundingClientRect().bottom - box.top + 8);
      tools.style.top = `${below}px`;
      if (turns) turns.style.marginTop = `${below}px`;
      if (document.documentElement.hasAttribute("data-pref-scaled"))
        tools.style.maxHeight = `${Math.max(120, Math.floor(box.height - below - (dock?.getBoundingClientRect().height ?? 0) - 12))}px`;
    }
    // Above a narrow hotbar the resource row keeps its symbols and the dice mode its control
    // when both would not fit side by side (their words stay the accessible names).
    const row = root.querySelector(".table-hotbar .hotbar-resources");
    const dice = root.querySelector(".table-hotbar .combat-bar-heading");
    dock?.classList.remove("is-tight");
    if (!compactLayout.matches && row && dice?.offsetParent && dock)
      dock.classList.toggle(
        "is-tight",
        row.getBoundingClientRect().right > dice.getBoundingClientRect().left - 8,
      );
    // Final review F6: the status line floats over the HUD band as tall as it really is (two
    // rows of actions, the resource row and the dice plate above it).
    const caption = root.querySelector(".map-container > .map-caption");
    const container = root.querySelector(".map-container");
    if (caption) caption.style.bottom = "";
    if (caption && container && dock && !compactLayout.matches) {
      const tops = [dock, row, dice]
        .filter((el) => el?.getClientRects().length)
        .map((el) => el.getBoundingClientRect().top);
      const lift = captionLift(container.getBoundingClientRect(), tops);
      if (lift !== null) caption.style.bottom = `${lift}px`;
    }
    const party = root.querySelector(".table-party");
    if (!party) return;
    party.classList.remove("is-compact", "is-scrolling", "is-hidden");
    party.style.maxHeight = "";
    const room = () =>
      party.getBoundingClientRect().bottom - tools.getBoundingClientRect().bottom - 12;
    const fits = () => party.getBoundingClientRect().height <= room();
    if (fits()) return;
    party.classList.add("is-compact");
    if (fits()) return;
    const available = room();
    if (available < 56) party.classList.add("is-hidden");
    else {
      party.classList.add("is-scrolling");
      party.style.maxHeight = `${Math.floor(available)}px`;
    }
  };
  sizeTouchTokens();
  // Final review F18 (Owlbear, BG3: on a phone the map comes first): entering the Table
  // brings the map into view once, as the map link in the tab bar does.
  // Close review 01/10 (Owlbear and Roll20 mobile: map first, scene header in view): the
  // scene's commands above the map stay on screen, and a remembered panel below never takes
  // the focus (on a real phone its field would open the keyboard over the map).
  if (compactLayout.matches && !phoneMapShown) {
    phoneMapShown = true;
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (active?.closest?.("#table-sidebar-panel") && active.matches?.("input, textarea, select"))
        active.blur();
      (
        root.querySelector(".table-topline") ?? root.querySelector(".table-stage")
      )?.scrollIntoView?.({ block: "start", behavior: "instant" });
    });
  }
  // F18 (Owlbear's snackbar): on a phone the map's message shows above the action bar for a
  // few seconds when its words change, then gets out of the way.
  noteObserver?.disconnect();
  noteObserver = null;
  const note = root.querySelector("#map-message");
  if (note && compactLayout.matches) {
    const dock = root.querySelector(".action-dock")?.getBoundingClientRect();
    note.style.setProperty(
      "--map-message-bottom",
      dock && dock.top < innerHeight ? `${Math.round(innerHeight - dock.top + 8)}px` : "",
    );
    const show = () => {
      noteText = note.textContent;
      note.classList.add("is-fresh");
      clearTimeout(noteTimer);
      noteTimer = setTimeout(() => note.classList.remove("is-fresh"), 4500);
    };
    if (note.textContent !== noteText) show();
    noteObserver = new MutationObserver(show);
    noteObserver.observe(note, { childList: true, characterData: true, subtree: true });
  }
  mapResizeObserver = new ResizeObserver(sizeTouchTokens);
  mapResizeObserver.observe(svg);
  const scene = state.scenes.find((s) => s.id === state.activeSceneId);
  let dragging = null,
    panning = null,
    preview = null,
    keyboardPoint = null,
    suppressedClick = false;
  const point = (e) => {
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  };
  const message = (text) => (root.querySelector("#map-message").textContent = text);
  // Host services for area tools, layers, panels and the token menu (B12 builds its UI).
  const table = {
    scene,
    svg,
    root,
    point,
    message,
    get mode() {
      return mode;
    },
    get selectedActorId() {
      return selected;
    },
    // P6 TV-01: the token selected on the map, or null after a click on the empty map (the
    // panels keep showing `selectedActorId`; map keys such as Delete act on this one).
    get mapSelection() {
      return deselected ? null : selected;
    },
    select: (id) => select(id),
    setMode: (id) => {
      mode = id;
      ctx.render();
    },
    render: () => ctx.render(),
    // Area view control (B14: centre on own tokens on arrival, Home recentres).
    get view() {
      return { zoom, pan: { ...pan } };
    },
    setView: (next) => {
      zoom = Math.min(3, Math.max(0.6, Number(next?.zoom) || zoom));
      pan = { x: Number(next?.pan?.x) || 0, y: Number(next?.pan?.y) || 0 };
      ctx.render();
    },
    menuTarget: (actorId) => ({
      actorId,
      tokenId: scene?.tokens.find((token) => token.actorId === actorId)?.id ?? null,
      sceneId: scene?.id ?? null,
    }),
    tokenMenu: (actorId) => ctx.registry?.list("token-menu", ctx, table.menuTarget(actorId)) ?? [],
  };
  const tool = () => ctx.registry?.get("table-tool", mode, ctx, table) ?? null;
  const toolHandles = (handler) => typeof tool()?.[handler] === "function";
  // Pointer events on an interactive area layer belong to that layer's own handlers.
  const onAreaLayer = (e) => Boolean(e.target.closest?.('[data-ext-slot^="map-layer:"]'));
  ctx.registry?.bindSlots(root, ctx, { points: ["map-layer", "table-panel"], args: [table] });
  // Right sidebar (B61, sections B62). A section's rail tab opens its last panel; a panel's
  // own handle (its sub-tab, or any control carrying its data-table-drawer, such as a map
  // HUD button) opens that panel. Pressed again while open, a rail tab or a handle returns
  // to the Creature tab, as closing the old drawer did; a sub-tab never closes its section.
  const model = sidebarModel?.role === ctx.role ? sidebarModel : null;
  const sectionOf = (id) =>
    model?.sections.find((section) => section.panels.some((p) => p.id === id)) ?? null;
  relayShowTab = (id) => showTab(id, id, false);
  const showTab = (id, focus = id, toggle = true) => {
    const memory = sidebarFor(ctx.role);
    const section = model?.sections.find((entry) => entry.id === id && !entry.legacy);
    const openSection = sectionOf(memory.tab);
    let next = id;
    if (section) {
      const last = memory.sections[section.id];
      // The Creature tab always shows the selected creature (its party sub-tab is a choice
      // inside it); another tab reopens its last sub-tab.
      next =
        section.id === "creature" || (toggle && openSection === section && !memory.collapsed)
          ? "creature"
          : section.panels.some((p) => p.id === last)
            ? last
            : section.panels[0].id;
    } else if (toggle && memory.tab === id && !memory.collapsed && id !== "creature")
      next = "creature";
    const home = sectionOf(next);
    rememberSidebar(ctx.role, {
      tab: next,
      collapsed: false,
      sections: home ? { ...memory.sections, [home.id]: next } : memory.sections,
    });
    focusTab = focus;
    ctx.render();
    // On a phone the panel is below the map: bring it into view.
    if (compactLayout.matches)
      document.querySelector("#content #table-sidebar-panel")?.scrollIntoView?.({ block: "start" });
  };
  // Final review P3 TV-14 (Foundry and Roll20: a double-click on a token opens its sheet): the
  // full sheet of a creature this viewer controls, otherwise its Creature tab.
  openFromToken = (id) => {
    const subject = id ? state.actors[id] : null;
    if (!subject) return false;
    doublePressAt = globalThis.performance?.now?.() ?? Date.now();
    if (ctx.canControl(subject) && canViewActor(subject, ctx.role, state))
      openSheetOverlay(ctx, id, "actions");
    else {
      setSelectedActor(id);
      showTab("creature", "creature", false);
    }
    return true;
  };
  svg.addEventListener?.("dblclick", (event) => {
    if (mode !== "move") return;
    // The two presses already opened it (the map redraws on the first press).
    if ((globalThis.performance?.now?.() ?? Date.now()) - doublePressAt < 600) return;
    const id = event.target.closest?.("[data-actor]")?.getAttribute("data-actor");
    if (openFromToken(id)) event.preventDefault();
  });
  root
    .querySelectorAll("[data-table-drawer]")
    .forEach((b) =>
      b.closest?.(".table-subtabs") ? null : (b.onclick = () => showTab(b.dataset.tableDrawer)),
    );
  root
    .querySelectorAll(".table-tabs [data-table-section]")
    .forEach((b) => (b.onclick = () => showTab(b.dataset.tableSection)));
  root
    .querySelectorAll(".table-subtabs [data-table-subtab]")
    .forEach(
      (b) =>
        (b.onclick = () => showTab(b.dataset.tableSubtab, "sub:" + b.dataset.tableSubtab, false)),
    );
  // The panel's own close button returns to the Creature tab; its tab keeps the focus.
  root
    .querySelector("[data-table-drawer-close]")
    ?.addEventListener("click", (event) =>
      showTab(
        "creature",
        sectionOf(event.currentTarget.dataset.tableDrawerClose)?.id ??
          event.currentTarget.dataset.tableDrawerClose,
      ),
    );
  root
    .querySelector('[data-table-tab="creature"]:not([data-table-section])')
    ?.addEventListener("click", () => showTab("creature"));
  root.querySelector('[data-table-sidebar="toggle"]')?.addEventListener("click", () => {
    rememberSidebar(ctx.role, { collapsed: !sidebarFor(ctx.role).collapsed });
    focusTab = "toggle";
    ctx.render();
  });
  root.querySelector("[data-table-map-link]")?.addEventListener("click", () => {
    // Close review 01/10: the scene header (DM: combat, scenes, rests, time) comes with it.
    (root.querySelector(".table-topline") ?? root.querySelector(".table-stage"))?.scrollIntoView?.({
      block: "start",
    });
    root.querySelector("#battle-map")?.focus({ preventScroll: true });
  });
  // B61 review: "All panels" lists every panel, also those beyond the strip's visible part
  // (phone bar, short laptop rail); choosing one opens it (never closes it). B62: grouped by
  // sidebar tab, each with its "In the rail" switch (hidden tabs stay listed here).
  const tabItems = () =>
    [...root.querySelectorAll(".table-tabs [role=tab]")].map((tab) => ({
      id: tab.dataset.tableTab,
      name: tab.getAttribute("aria-label") ?? "",
      glyph: tab.querySelector("svg, .table-tab-portrait")?.outerHTML ?? "",
      current: tab.getAttribute("aria-selected") === "true",
    }));
  const panelGroups = () => {
    const memory = sidebarFor(ctx.role);
    return model.sections.map((section) => ({
      id: section.id,
      name: section.name,
      hideable: section.id !== "creature",
      shown: !memory.hidden.includes(section.id),
      items: section.panels.map((p) => ({
        ...p,
        current: p.id === memory.tab && !memory.collapsed,
        popout: Boolean(ctx.registry?.get?.("table-panel", p.id)),
      })),
    }));
  };
  root.querySelector("[data-table-panels]")?.addEventListener("click", () => {
    ctx.dialog(
      t("Pannelli del Tavolo", "Table panels"),
      model ? tablePanelsMenu(ctx, [], panelGroups()) : tablePanelsMenu(ctx, tabItems()),
      { cancelLabel: t("Chiudi", "Close") },
    );
    document.querySelectorAll("#dialog [data-table-panel-jump]").forEach(
      (button) =>
        (button.onclick = () => {
          ctx.closeDialog();
          const id = button.dataset.tablePanelJump;
          const home = sectionOf(id);
          showTab(
            id,
            home && home.panels.length > 1 && !home.legacy ? "sub:" + id : (home?.id ?? id),
            false,
          );
        }),
    );
    document.querySelectorAll("#dialog [data-table-panel-popout]").forEach(
      (button) =>
        (button.onclick = () => {
          ctx.closeDialog();
          openPanelWindow(ctx, button.dataset.tablePanelPopout);
        }),
    );
    document.querySelectorAll("#dialog [data-table-section-pin]").forEach(
      (button) =>
        (button.onclick = () => {
          const id = button.dataset.tableSectionPin;
          const hidden = new Set(sidebarFor(ctx.role).hidden);
          if (hidden.has(id)) hidden.delete(id);
          else hidden.add(id);
          rememberSidebar(ctx.role, { hidden: [...hidden] });
          button.setAttribute("aria-pressed", String(!hidden.has(id)));
          ctx.render();
        }),
    );
  });
  // The open tab stays in view inside its strip (scrollable tabs keep the selected one
  // visible): each render rebuilds the strip at its start, which scrolled it away.
  scrollIntoStrip(
    root.querySelector(".table-tabs"),
    [...root.querySelectorAll(".table-tabs [role=tab]")].find(
      (tab) => tab.getAttribute("aria-selected") === "true",
    ),
  );
  // F9: the sub-tabs are one scrolling row too; the open one stays in view.
  scrollIntoStrip(
    root.querySelector(".table-subtabs"),
    root.querySelector(".table-subtabs .table-subtab.active"),
  );
  // Tabs (WAI-ARIA tabs, manual activation): arrows, Home and End move between tabs;
  // Enter or Space opens the focused one. The same keys work in the sub-tab strip.
  const tabKeys = (strip, selector) => (event) => {
    const list = [...root.querySelectorAll(selector)];
    const index = list.indexOf(event.target.closest?.("[role=tab]"));
    if (index < 0) return;
    // WAI-ARIA tabs: Tab from the tab list enters the open panel, which comes before the
    // rail in the page order (W2a1 integration: a tab opened by keyboard keeps the focus,
    // B27's Stop cards are then one Tab away).
    if (event.key === "Tab" && !event.shiftKey && strip === "rail") {
      const panel = root.querySelector("#table-sidebar-panel:not([hidden])");
      const first = [
        ...(panel?.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        ) ?? []),
      ].find((el) => el.checkVisibility?.() ?? true);
      if (first) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
    const target =
      event.key === "Home"
        ? list[0]
        : event.key === "End"
          ? list.at(-1)
          : step
            ? list[(index + step + list.length) % list.length]
            : null;
    if (!target) return;
    event.preventDefault();
    list.forEach((tab) => tab.setAttribute("tabindex", tab === target ? "0" : "-1"));
    target.focus();
  };
  root
    .querySelector(".table-tabs")
    ?.addEventListener("keydown", tabKeys("rail", ".table-tabs [role=tab]"));
  root
    .querySelector(".table-subtabs")
    ?.addEventListener("keydown", tabKeys("sub", ".table-subtabs [role=tab]"));
  // Hotbar pages (B62): Actions or Quick bar, remembered per identity like the sidebar.
  root.querySelectorAll("[data-hotbar-page]").forEach(
    (b) =>
      (b.onclick = () => {
        rememberSidebar(ctx.role, { hotbar: b.dataset.hotbarPage });
        focusTab = "hotbar:" + b.dataset.hotbarPage;
        ctx.render();
      }),
  );
  root.querySelector(".hotbar-pages")?.addEventListener("keydown", (event) => {
    const list = [...root.querySelectorAll(".hotbar-pages [role=tab]")];
    const index = list.indexOf(event.target.closest?.("[role=tab]"));
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (index < 0 || !step) return;
    event.preventDefault();
    const target = list[(index + step + list.length) % list.length];
    list.forEach((tab) => tab.setAttribute("tabindex", tab === target ? "0" : "-1"));
    target.focus();
  });
  const clear = () => {
    if (dragging || panning) suppressedClick = true;
    panning = null;
    cancelCombatPreview(ctx, selected);
    clearPathDraft(ctx, selected);
    const combatLayer = root.querySelector("#combat-map-layer");
    if (combatLayer) combatLayer.innerHTML = "";
    preview = null;
    keyboardPoint = null;
    dragging = null;
    root.querySelector("#preview-layer").innerHTML = "";
    const top = root.querySelector("#preview-top");
    if (top) top.innerHTML = "";
    message(
      t("Preparazione annullata. Nessuna risorsa spesa.", "Preview cancelled. No resources spent."),
    );
  };
  const cancelFromTable = (event) => {
    if (
      !root.isConnected ||
      event.key !== "Escape" ||
      event.defaultPrevented ||
      document.querySelector("#dialog")?.open ||
      event.target.closest?.("input,textarea,select,[contenteditable=true]")
    )
      return;
    event.preventDefault();
    clear();
    ctx.render();
    document.querySelector("#battle-map")?.focus({ preventScroll: true });
  };
  document.addEventListener("keydown", cancelFromTable);
  clearTableKeyboard = () => document.removeEventListener("keydown", cancelFromTable);
  // P6 TV-01: a move walks around walls and closed doors (the planned points stay its
  // stops); an unreachable destination keeps the straight path, shown blocked with its reason.
  const routed = (p, points) =>
    plannedWaypoints(ctx.state, selected, p, { role: ctx.role, waypoints: points });
  const draw = (p, points = mode === "plan" ? pathDraft(ctx, selected) : []) => {
    try {
      const route = mode === "measure" ? { waypoints: points } : routed(p, points);
      preview = previewMovement(ctx.state, selected, p, {
        waypoints: route.waypoints,
        role: ctx.role,
      });
      preview.plannedWaypoints = route.waypoints;
      preview.unreachable = route.reachable === false;
      const v = preview,
        layer = root.querySelector("#preview-layer");
      if (mode === "measure") {
        const direct =
          (Math.hypot(v.target.x - v.start.x, v.target.y - v.start.y) / scene.gridSize) *
          scene.metersPerCell;
        layer.innerHTML = `<path d="M${v.start.x} ${v.start.y} L${v.target.x} ${v.target.y}" stroke="#e2c17b" stroke-width="3" fill="none"/>`;
        message(
          t("Misura diretta", "Direct measurement") + ": " + formatNumber(ctx.lang, direct) + " m",
        );
        return;
      }
      // TV-77: where the path leaves the reach of an enemy that can still react.
      const warnings = opportunityWarnings(ctx.state, selected, v.reachablePath, (id) =>
        Boolean(svg.querySelector?.(`[data-actor="${attrValue(id)}"]`)),
      );
      layer.innerHTML =
        renderMovementPath(v) +
        renderPathMarkers(mode === "plan" ? pathDraft(ctx, selected) : []) +
        dragDistanceLabel(v, ctx.lang);
      // Above the tokens, and clear of the mover's own token when it leaves from adjacency.
      const top = root.querySelector("#preview-top");
      if (top) top.innerHTML = renderOpportunityMarks(clearOfToken(warnings, v), ctx);
      const provokes = warnings.length
        ? " · " +
          t("Attacco di opportunità", "Opportunity attack") +
          ": " +
          warnings.map((w) => w.name).join(", ")
        : "";
      message(
        t("Distanza", "Distance") +
          ": " +
          formatNumber(ctx.lang, v.distance) +
          " m · " +
          t("Costo movimento", "Movement cost") +
          ": " +
          formatNumber(ctx.lang, v.totalCost) +
          " m" +
          (v.blocked
            ? " · " +
              (v.unreachable
                ? t(
                    "Non c’è un passaggio a piedi: un muro o una porta chiusa blocca la strada.",
                    "No way on foot: a wall or a closed door is in the way.",
                  )
                : v.reasons.map(ctx.label).join(" · "))
            : v.limited
              ? " · " +
                t(
                  "Arrivi alla sagoma; rosso oltre il movimento.",
                  "Stop at the outline; red exceeds movement.",
                )
              : hasCondition(ctx.state.actors[selected], "prone")
                ? " · " +
                  t(
                    "Prono: strisci, ogni metro costa il doppio. Rialzati per muoverti a piedi.",
                    "Prone: you crawl, each meter costs double. Stand up to walk.",
                  )
                : mode === "plan"
                  ? " · " +
                    t(
                      "Clic aggiunge un punto. Esegui percorso conferma.",
                      "Click adds a point. Execute path confirms.",
                    )
                  : " · " +
                    t(
                      "Rilascia o premi Invio per confermare. Esc annulla.",
                      "Release or press Enter to confirm. Escape cancels.",
                    )) +
          provokes,
      );
    } catch (error) {
      preview = null;
      message(ctx.label(error.it ? error : error.message));
    }
  };
  const execute = (p, points = []) => {
    if (ctx.offline) {
      ctx.toast(
        t(
          "Sei senza rete: la mossa rimane un’anteprima. Riconnettiti prima di eseguirla.",
          "You are offline: movement remains a preview. Reconnect before executing.",
        ),
        true,
      );
      return;
    }
    try {
      const waypoints = preview?.plannedWaypoints ?? routed(p, points).waypoints;
      const shown =
        preview || previewMovement(ctx.state, selected, p, { waypoints, role: ctx.role });
      if (shown.blocked) {
        // Refused before any commit: the token stays and the reason is in view.
        message(
          shown.unreachable
            ? t(
                "Non c’è un passaggio a piedi: un muro o una porta chiusa blocca la strada.",
                "No way on foot: a wall or a closed door is in the way.",
              )
            : shown.reasons.map(ctx.label).join(" · "),
        );
        ctx.toast(
          t(
            "Percorso bloccato: la pedina resta dov’è.",
            "Path blocked: the token stays where it is.",
          ),
          true,
        );
        return;
      }
      ctx.commit(t("Movimento confermato", "Movement confirmed"), (s) =>
        beginMovement(
          s,
          {
            id: crypto.randomUUID(),
            actorId: selected,
            point: { x: p.x, y: p.y },
            waypoints,
            geometryKey: shown.geometryKey,
          },
          ctx.role,
        ),
      );
      clearPathDraft(ctx, selected);
      ctx.render();
    } catch (error) {
      ctx.toast(
        error.it
          ? ctx.label(error)
          : error.message.includes("turn")
            ? t(
                "Attendi il turno di questa creatura. Puoi continuare a valutare il percorso.",
                "Wait for this creature’s turn. You can keep previewing the path.",
              )
            : error.message.includes("control")
              ? t("Non controlli questa creatura.", "You do not control this creature.")
              : error.message.includes("consequences")
                ? t(
                    "Prima si risolvono i tiri in attesa (Tiri e risultati): poi la pedina può muoversi.",
                    "Pending rolls come first (Rolls and results): then the token can move.",
                  )
                : t(
                    "Percorso non eseguibile: rivaluta la destinazione e gli ostacoli.",
                    "Path unavailable: review the destination and obstacles.",
                  ),
        true,
      );
    }
  };
  const addPoint = (p) => {
    const points = pathDraft(ctx, selected),
      next = {
        x: Math.max(0, Math.min(scene.width, p.x)),
        y: Math.max(0, Math.min(scene.height, p.y)),
      };
    if (!points.length || Math.hypot(next.x - points.at(-1).x, next.y - points.at(-1).y) > 0.01)
      setPathDraft(ctx, selected, [...points, next]);
    ctx.render();
    document.querySelector("#battle-map")?.focus({ preventScroll: true });
  };
  root.querySelector("[data-path-execute]")?.addEventListener("click", () => {
    const points = pathDraft(ctx, selected);
    if (points.length) {
      draw(points.at(-1), points.slice(0, -1));
      execute(points.at(-1), points.slice(0, -1));
    }
  });
  root.querySelector("[data-path-cancel]")?.addEventListener("click", () => {
    clear();
    ctx.render();
  });
  root.querySelectorAll("[data-path-remove]").forEach(
    (b) =>
      (b.onclick = () => {
        setPathDraft(
          ctx,
          selected,
          pathDraft(ctx, selected).filter((_, i) => i !== Number(b.dataset.pathRemove)),
        );
        ctx.render();
      }),
  );
  root.querySelectorAll("[data-path-edit]").forEach(
    (b) =>
      (b.onclick = () => {
        const index = Number(b.dataset.pathEdit),
          points = pathDraft(ctx, selected),
          p = points[index];
        ctx.dialog(
          t("Modifica punto", "Edit point") + " " + (index + 1),
          `<p>${t("Puoi correggere questo punto senza muovere la pedina.", "Adjust this point without moving the token.")}</p><div class="form-grid"><label class="field">X<input name="x" type="number" step="any" min="0" max="${scene.width}" value="${p.x}"></label><label class="field">Y<input name="y" type="number" step="any" min="0" max="${scene.height}" value="${p.y}"></label></div>`,
          {
            submitLabel: t("Aggiorna punto", "Update point"),
            onSubmit: (data) => {
              const x = Number(data.get("x")),
                y = Number(data.get("y"));
              if (
                !Number.isFinite(x) ||
                !Number.isFinite(y) ||
                x < 0 ||
                y < 0 ||
                x > scene.width ||
                y > scene.height
              )
                throw Error(t("Punto fuori dalla scena.", "Point outside the scene."));
              points[index] = { x, y };
              setPathDraft(ctx, selected, points);
              ctx.render();
            },
          },
        );
      }),
  );
  if (mode === "plan" && pathDraft(ctx, selected).length) {
    const points = pathDraft(ctx, selected);
    draw(points.at(-1), points.slice(0, -1));
  }
  function select(id, { focus = false } = {}) {
    selected = id;
    deselected = false;
    // The chosen token keeps the keyboard focus (Ctrl+C, arrows, the Menu key act on it).
    if (focus) focusAfterRender(id);
    ctx.render();
  }
  // Selecting a creature never changes the open tab (Foundry keeps its sidebar tab): area
  // panels such as the DM screen act on the selection; the Creature tab shows its initial.
  root
    .querySelectorAll("[data-select]")
    .forEach((b) => (b.onclick = () => select(b.dataset.select)));
  // BG3's party portraits select their creature and keep the keyboard focus on the portrait.
  root.querySelectorAll("[data-party-select]").forEach(
    (b) =>
      (b.onclick = () => {
        const id = b.dataset.partySelect;
        select(id);
        root
          .querySelector(`[data-party-select="${attrValue(id)}"]`)
          ?.focus({ preventScroll: true });
      }),
  );
  root.querySelector("[data-map-tools-toggle]")?.addEventListener("click", () => {
    toolsOpen = !toolsOpen;
    ctx.render();
    document.querySelector("#content [data-map-tools-toggle]")?.focus({ preventScroll: true });
  });
  root.querySelectorAll("[data-tool]").forEach(
    (b) =>
      (b.onclick = () => {
        // On a phone a chosen tool folds the tools away again: the map stays free (TV-06).
        if (b.closest?.(".map-toolbar")) toolsOpen = false;
        // A tool the campaign turned off (B20) explains why instead of activating.
        if (b.getAttribute?.("aria-disabled") === "true") {
          const name = String(b.getAttribute?.("title") ?? "").split(" · ")[0];
          message(
            t(
              `Il DM ha disattivato «${name}» per i giocatori nelle impostazioni della campagna.`,
              `The DM turned “${name}” off for players in the campaign settings.`,
            ),
          );
          return;
        }
        // The next bind activates the chosen tool on the table that stays on screen. Choosing
        // a tool acts for the creature in the panel: it is the map's selection again.
        mode = b.dataset.tool;
        deselected = false;
        cancelCombatPreview(ctx, selected);
        ctx.render();
      }),
  );
  // A toolbar group returns to its last tool (or its first one that is not turned off).
  root.querySelectorAll("[data-tool-group]").forEach(
    (b) =>
      (b.onclick = () => {
        const group = b.dataset.toolGroup;
        const tools = [
          ...root.querySelectorAll(`[data-tool-group-tools="${group}"] [data-tool]`),
        ].filter((chip) => chip.getAttribute("aria-disabled") !== "true");
        const next =
          tools.find((chip) => chip.dataset.tool === groupTool[group]) ?? tools[0] ?? null;
        if (!next) return;
        mode = next.dataset.tool;
        cancelCombatPreview(ctx, selected);
        ctx.render();
      }),
  );
  // P6 TV-01/TV-05/TV-06 (Foundry, Owlbear, D&D Beyond Maps): a press on a token you control
  // drags it; a press on the empty map pans the view once it moves, and a plain click there
  // clears the selection (Move) or adds a point (Plan path). Nothing moves on a click.
  let pressing = null;
  const startPan = (e) => {
    panning = {
      clientX: e.clientX,
      clientY: e.clientY,
      initial: { ...pan },
      scale: 1 / svg.getScreenCTM().a,
    };
    try {
      svg.setPointerCapture(e.pointerId);
    } catch {
      /* the pointer is already gone */
    }
  };
  const setView = () =>
    svg.setAttribute("viewBox", [pan.x, pan.y, scene.width / zoom, scene.height / zoom].join(" "));
  svg.onpointerdown = (e) => {
    if (e.target.closest("[data-door]")) return;
    const token = e.target.closest("[data-actor]");
    // No page text selection while a gesture runs on the map (TV-01); an area's own controls
    // (a bar drawn over the map, a field) keep their press and their focus.
    const control = e.target.closest?.("foreignObject, input, select, textarea, button, a");
    if (e.pointerType !== "touch" && !control && !onAreaLayer(e)) e.preventDefault();
    if (!control) (token ?? svg).focus({ preventScroll: true });
    const p = point(e);
    if (mode === "pan" || e.button === 1) {
      e.preventDefault();
      startPan(e);
      return;
    }
    if (toolHandles("onPointerDown")) {
      ctx.registry.invoke(tool(), "onPointerDown", ctx, e, table);
      return;
    }
    if (onAreaLayer(e)) return;
    if (hasCombatPreview(ctx, selected)) {
      handleCombatMap(ctx, selected, "down", p, token?.dataset.actor);
      return;
    }
    if (e.button !== 0) return;
    // Close review 01/10 (TV-14, Foundry reads the double click on the canvas itself): the
    // first press redraws the map, so the browser never fires dblclick; two left presses on
    // the same token within DOUBLE_PRESS_MS open its sheet.
    if (token && mode === "move") {
      const at = globalThis.performance?.now?.() ?? Date.now();
      const last = lastTokenPress;
      lastTokenPress = {
        actorId: token.dataset.actor,
        at,
        x: e.clientX,
        y: e.clientY,
        bind: mapBinds,
        role: ctx.role,
      };
      if (
        last &&
        last.actorId === token.dataset.actor &&
        last.role === ctx.role &&
        mapBinds - last.bind <= 1 &&
        at - last.at < DOUBLE_PRESS_MS &&
        Math.hypot(e.clientX - last.x, e.clientY - last.y) < 12
      ) {
        lastTokenPress = null;
        e.preventDefault();
        openFromToken(token.dataset.actor);
        return;
      }
    }
    if (token) {
      selected = token.dataset.actor;
      deselected = false;
      focusAfterRender(selected);
      svg
        .querySelectorAll("[data-actor]")
        .forEach((g) => g.classList.toggle("selected", g.dataset.actor === selected));
      // TV-06: only a token you control starts a drag (never an enemy's path); R3 PG-79:
      // also the controlled mount you ride (B40 turns the drag into your ride).
      if (mode === "move" && canDragToken(ctx, selected)) {
        dragging = { start: p, moved: false };
        svg.setPointerCapture(e.pointerId);
      } else select(selected, { focus: true });
      return;
    }
    if (["move", "plan", "pointer"].includes(mode))
      pressing = { clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId };
  };
  svg.onpointermove = (e) => {
    const p = point(e);
    if (pressing && e.pointerId === pressing.pointerId) {
      if (Math.hypot(e.clientX - pressing.clientX, e.clientY - pressing.clientY) > 5) {
        // A drag on the empty map pans the view (Owlbear, D&D Beyond, Roll20).
        const start = pressing;
        pressing = null;
        startPan({ ...start, pointerId: e.pointerId });
      } else return;
    }
    if (panning) {
      pan = {
        x: panning.initial.x - (e.clientX - panning.clientX) * panning.scale,
        y: panning.initial.y - (e.clientY - panning.clientY) * panning.scale,
      };
      setView();
      return;
    }
    if (e.target.closest("[data-door]")) return;
    if (toolHandles("onPointerMove")) {
      ctx.registry.invoke(tool(), "onPointerMove", ctx, e, table);
      return;
    }
    if (onAreaLayer(e) && !dragging) return;
    if (hasCombatPreview(ctx, selected)) {
      handleCombatMap(ctx, selected, "move", p, e.target.closest("[data-actor]")?.dataset.actor);
      return;
    }
    if (dragging) {
      if (Math.hypot(p.x - dragging.start.x, p.y - dragging.start.y) > 5) {
        // Close regression 01/10 (Foundry: a drag leaves the click sequence): a press that
        // became a drag is never the first half of a double press that opens the sheet.
        dragging.moved = true;
        lastTokenPress = null;
      }
      if (dragging.moved) draw(p);
    } else if (
      !deselected &&
      ["plan", "measure"].includes(mode) &&
      e.pointerType !== "touch" &&
      !e.target.closest("[data-actor]")
    )
      // Plan path: the next leg follows the pointer (a click adds it); Move shows nothing
      // until a token is dragged, since a click never moves.
      draw(p);
  };
  svg.onpointerup = (e) => {
    if (pressing && e.pointerId === pressing.pointerId) pressing = null;
    if (e.target.closest("[data-door]")) return;
    if (hasCombatPreview(ctx, selected) && !panning) {
      handleCombatMap(
        ctx,
        selected,
        "release",
        point(e),
        e.target.closest("[data-actor]")?.dataset.actor,
      );
      return;
    }
    if (panning) {
      panning = null;
      ctx.render();
      suppressedClick = true;
      return;
    }
    if (toolHandles("onPointerUp")) {
      ctx.registry.invoke(tool(), "onPointerUp", ctx, e, table);
      return;
    }
    if (!dragging) return;
    const moved = dragging.moved;
    dragging = null;
    suppressedClick = true;
    if (moved) {
      draw(point(e));
      execute(point(e));
    } else select(selected, { focus: true });
  };
  svg.onpointercancel = () => {
    pressing = null;
    clear();
  };
  // TV-05: the wheel zooms at the cursor (D&D Beyond Maps, Owlbear, Roll20); the view is
  // drawn at once and the Table re-renders once the wheel rests.
  svg.onwheel = (e) => {
    e.preventDefault();
    const step = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
    const next = zoomAt({ zoom, pan }, scene, Math.exp(-step * 0.0015), point(e));
    zoom = next.zoom;
    pan = next.pan;
    setView();
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => {
      if (root.isConnected) ctx.render();
    }, 220);
  };
  svg.onclick = (e) => {
    const door = e.target.closest("[data-door]");
    if (door) {
      e.preventDefault();
      openDoor(ctx, door.dataset.door, selected);
      return;
    }
    if (suppressedClick) {
      suppressedClick = false;
      return;
    }
    if (hasCombatPreview(ctx, selected)) {
      handleCombatMap(
        ctx,
        selected,
        "click",
        point(e),
        e.target.closest("[data-actor]")?.dataset.actor,
      );
      return;
    }
    if (toolHandles("onClick")) {
      ctx.registry.invoke(tool(), "onClick", ctx, e, table);
      return;
    }
    if (onAreaLayer(e)) return;
    if (e.target.closest("[data-actor]")) return;
    const p = point(e);
    if (mode === "move") {
      // TV-01: a click on the empty map clears the selection; nobody moves.
      preview = null;
      keyboardPoint = null;
      root.querySelector("#preview-layer").innerHTML = "";
      deselected = true;
      focusAfterRender("map");
      ctx.render();
      document
        .querySelector("#content #map-message")
        ?.replaceChildren(
          t(
            "Nessuna pedina selezionata: clic su una pedina per sceglierla.",
            "No token selected: click a token to choose it.",
          ),
        );
    } else if (mode === "plan") addPoint(p);
    else if (mode === "pointer") {
      root.querySelector("#preview-layer").innerHTML =
        `<circle cx="${p.x}" cy="${p.y}" r="16" fill="none" stroke="#e2c17b" stroke-width="3"/><path d="M${p.x - 28} ${p.y}H${p.x + 28}M${p.x} ${p.y - 28}V${p.y + 28}" stroke="#e2c17b"/>`;
      message(t("Puntatore di Livia · simulazione locale", "Livia’s pointer · local simulation"));
    }
  };
  svg.onkeydown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      const hadAction = hasCombatPreview(ctx, selected);
      clear();
      if (hadAction || mode === "plan") ctx.render();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "z") {
      e.preventDefault();
      ctx.undo();
      return;
    }
    if (toolHandles("onKeyDown")) {
      ctx.registry.invoke(tool(), "onKeyDown", ctx, e, table);
      if (e.defaultPrevented) return;
    }
    const door = e.target.closest("[data-door]");
    if (door && ["Enter", " "].includes(e.key)) {
      e.preventDefault();
      openDoor(ctx, door.dataset.door, selected);
      return;
    }
    const token = e.target.closest("[data-actor]");
    const arrow = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key);
    // TV-27 (Owlbear 2.1 keyboard tokens): arrows on a focused token move that token.
    if (token && arrow && !canDragToken(ctx, token.dataset.actor)) {
      e.preventDefault();
      message(
        t(
          "Puoi muovere solo le pedine che controlli.",
          "You can only move the tokens you control.",
        ),
      );
      return;
    }
    if (token && arrow && (token.dataset.actor !== selected || deselected)) {
      selected = token.dataset.actor;
      deselected = false;
      keyboardPoint = null;
      svg
        .querySelectorAll("[data-actor]")
        .forEach((g) => g.classList.toggle("selected", g.dataset.actor === selected));
    }
    // Enter or Space on a token confirms a prepared keyboard move; otherwise it selects.
    if (token && ["Enter", " "].includes(e.key) && !(keyboardPoint && preview)) {
      e.preventDefault();
      if (hasCombatPreview(ctx, selected)) {
        const placed = scene.tokens.find((t) => t.actorId === token.dataset.actor);
        handleCombatMap(ctx, selected, "click", placed, token.dataset.actor);
      } else select(token.dataset.actor, { focus: true });
      return;
    }
    if (arrow) {
      e.preventDefault();
      if (deselected) {
        message(
          t(
            "Nessuna pedina selezionata: Tab fino a una pedina, poi le frecce.",
            "No token selected: Tab to a token, then use the arrows.",
          ),
        );
        return;
      }
      const current = scene.tokens.find((v) => v.actorId === selected);
      if (!current) {
        message(t("Questa creatura non è sulla scena.", "This creature is not on the scene."));
        return;
      }
      keyboardPoint = keyboardPoint || {
        ...((mode === "plan" ? pathDraft(ctx, selected).at(-1) : null) || current),
      };
      keyboardPoint.x +=
        e.key === "ArrowLeft" ? -scene.gridSize : e.key === "ArrowRight" ? scene.gridSize : 0;
      keyboardPoint.y +=
        e.key === "ArrowUp" ? -scene.gridSize : e.key === "ArrowDown" ? scene.gridSize : 0;
      if (hasCombatPreview(ctx, selected))
        handleCombatMap(ctx, selected, "move", keyboardPoint, null);
      else draw(keyboardPoint);
      return;
    }
    const confirm = e.key === "Enter" || (e.key === " " && token);
    if (confirm && keyboardPoint && hasCombatPreview(ctx, selected)) {
      e.preventDefault();
      handleCombatMap(ctx, selected, "click", keyboardPoint, null);
      return;
    }
    if (confirm && preview && mode === "plan") {
      e.preventDefault();
      addPoint(preview.target);
      return;
    }
    if (confirm && preview && keyboardPoint && mode === "move") {
      e.preventDefault();
      // The moved token keeps the focus after the re-render (TV-27).
      focusAfterRender(
        token || document.activeElement?.closest?.("[data-actor]") ? selected : "map",
      );
      const target = keyboardPoint;
      keyboardPoint = null;
      execute(target);
    }
  };
  root
    .querySelector("[data-open-interruptions]")
    ?.addEventListener("click", () => openCombatRequests(ctx));
  bindCombatUI(root, ctx, selected, () => {
    mode = "move";
  });
  root.querySelectorAll("[data-table]").forEach(
    (b) =>
      (b.onclick = () => {
        const action = b.dataset.table;
        if (action === "map-focus")
          root.querySelector("#battle-map")?.scrollIntoView({ block: "start" });
        if (action === "preview-focus")
          root.querySelector("#combat-detail")?.scrollIntoView({ block: "start" });
        // PG-20 (P2 shared edit): the sheet opens over the map on the right tab.
        if (action === "sheet" || action === "actions") openSheetOverlay(ctx, selected, "actions");
        if (action === "inventory") openSheetOverlay(ctx, selected, "inventory");
        if (action === "rest") ctx.openRest(selected);
        if (action === "rests") ctx.openRest();
        if (action === "time") ctx.openGameTime();
        if (action === "undo") ctx.undo();
        if (action === "stand") {
          const p = standPreview(ctx, selected);
          if (!p.canApply) {
            ctx.toast(ctx.label(p.errors?.[0] ?? ""), true);
            return;
          }
          try {
            ctx.commit(
              t("Si rialza da Prono", "Stands up from Prone"),
              (s) => {
                const result = standUp(s, selected, ctx.role, {
                  ...standContextFor(s, selected),
                  operationId: crypto.randomUUID(),
                  reviewKey: p.reviewKey,
                  online: !ctx.offline,
                });
                applyConditionFollowUps(s, result);
              },
              p.commit,
            );
            ctx.toast(t("In piedi: movimento aggiornato.", "Standing: movement updated."));
          } catch (error) {
            ctx.toast(ctx.label(error.it ? error : error.message), true);
          }
        }
        if (action === "cancel") {
          const hadAction = hasCombatPreview(ctx, selected);
          clear();
          if (hadAction || mode === "plan") ctx.render();
        }
        if (action === "log") showTab("log");
        if (action === "prepare") ctx.navigate("preparation");
        if (action === "scenes") openSceneNavigator(ctx);
        if (action === "last-move") {
          const command = ctx.registry?.get("command", "special-moves.last-move", ctx);
          if (command) command.run(ctx);
        }
        if (action === "hp") {
          // PG-46: the HP on the hotbar opens the HP widget (the token menu's «Punti ferita»).
          const target = table.menuTarget(selected);
          const item = ctx.registry?.get("token-menu", "damage-tray-hp", ctx, target);
          if (item) item.run(ctx, target);
          else showTab("creature");
        }
        if (action === "find-token") findToken(b.dataset.findActor);
        if (action === "zoom-in" || action === "zoom-out") {
          // + and − zoom around the middle of what is on screen.
          const centre = { x: pan.x + scene.width / zoom / 2, y: pan.y + scene.height / zoom / 2 };
          ({ zoom, pan } = zoomAt(
            { zoom, pan },
            scene,
            action === "zoom-in" ? 1.2 : 1 / 1.2,
            centre,
          ));
          ctx.render();
        }
        if (action === "fit") {
          zoom = 1;
          pan = { x: 0, y: 0 };
          ctx.render();
        }
        if (action === "end-turn") {
          if (hasBlockingConsequences(ctx.state, ctx.state.combat.order[ctx.state.combat.turn])) {
            ctx.toast(
              t(
                "Ci sono conseguenze ancora in attesa. Risolvile prima di avanzare.",
                "Consequences are still pending. Resolve them before advancing.",
              ),
              true,
            );
            openCombatRequests(ctx);
            return;
          }
          if (ctx.offline) {
            ctx.toast(
              t("Riconnettiti prima di terminare il turno.", "Reconnect before ending the turn."),
              true,
            );
            return;
          }
          ctx.commit(
            t("Turno concluso", "Turn ended"),
            (s) => {
              const current = s.actors[s.combat.order[s.combat.turn]];
              if (!runsSession(ctx.state, ctx.role) && !ctx.canControl(current))
                throw Error(t("Non è il tuo turno.", "Not your turn."));
              advanceTurn(s, { online: !ctx.offline });
            },
            // TV-48 (P5 shared edit, D&D Beyond): a hidden creature's turn stays DM-only.
            turnLogOptions(ctx.state),
          );
        }
        if (action === "combat") {
          if (!runsSession(ctx.state, ctx.role)) return;
          if (!ctx.state.combat.active) {
            ctx.startEncounter(ctx.state.activeSceneId);
            return;
          }
          if (Object.keys(ctx.state.actors).some((id) => hasBlockingConsequences(ctx.state, id))) {
            ctx.toast(
              t(
                "Risolvi i tiri ancora pendenti prima di concludere.",
                "Resolve pending rolls before ending the encounter.",
              ),
              true,
            );
            openCombatRequests(ctx);
            return;
          }
          // F16: with the combat tracker built, its finish offers the XP and the loot.
          const finish = ctx.registry?.get("command", "combat-tracker.finish", ctx);
          if (finish) {
            ctx.registry.run(finish, ctx);
            return;
          }
          ctx.dialog(
            t("Concludi incontro", "End encounter"),
            `<p>${t("Torna all’esplorazione conservando posizioni, punti ferita, risorse ed effetti pertinenti.", "Return to exploration while preserving positions, hit points, resources and relevant effects.")}</p>`,
            {
              submitLabel: t("Concludi", "End"),
              onSubmit: () =>
                ctx.commit(t("Combattimento concluso", "Combat ended"), (s) => {
                  if (!runsSession(ctx.state, ctx.role)) throw Error("DM only");
                  s.combat.active = false;
                }),
            },
          );
        }
        // B34: when the dice tray is built, "Roll dice" opens its sidebar tab (never closes
        // it) instead of the one-die free roll, which stays as the fallback.
        if (action === "dice" && ctx.registry?.get("table-panel", "dice-tray", ctx)) {
          showTab("dice-tray", "dice-tray", false);
          return;
        }
        if (action === "dice") {
          ctx.dialog(
            t("Tiro libero", "Free roll"),
            `<p>${t("Questo tiro va nel registro; non consuma un’azione o applica danni.", "This roll is logged; it does not consume an action or apply damage.")}</p><div class="form-grid"><label class="field">${t("Dado", "Die")}<select name="sides"><option>20</option><option>12</option><option>10</option><option>8</option><option>6</option><option>4</option></select></label><label class="field">${t("Modificatore", "Modifier")}<input type="number" name="modifier" value="0" min="-30" max="30"></label></div><label class="field">${t("Modalità", "Mode")}<select name="mode"><option value="digital">${t("Dado digitale", "Digital die")}</option><option value="physical">${t("Dado fisico", "Physical die")}</option></select></label><label class="field" id="physical-value" hidden>${t("Valore naturale del dado fisico", "Natural physical die value")}<input type="number" name="natural" min="1" max="20" value="1"></label>`,
            {
              submitLabel: t("Registra tiro", "Record roll"),
              onSubmit: (data) => {
                const sides = Number(data.get("sides"));
                const mod = Number(data.get("modifier"));
                const natural =
                  data.get("mode") === "physical" ? Number(data.get("natural")) : rollDie(sides);
                if (!Number.isInteger(natural) || natural < 1 || natural > sides)
                  throw Error(
                    t(
                      "Inserisci un valore naturale valido per il dado scelto.",
                      "Enter a valid natural result for the selected die.",
                    ),
                  );
                if (ctx.offline)
                  throw Error(
                    t(
                      "Tiro locale non inviato: riconnettiti prima di registrarlo.",
                      "Local roll not sent: reconnect before recording.",
                    ),
                  );
                const result = natural + mod;
                const label =
                  ctx.state.actors[selected].name +
                  " · d" +
                  sides +
                  ": " +
                  natural +
                  (mod < 0 ? " − " : " + ") +
                  Math.abs(mod) +
                  " = " +
                  result +
                  " (" +
                  t(
                    data.get("mode") === "physical" ? "fisico" : "digitale",
                    data.get("mode") === "physical" ? "physical" : "digital",
                  ) +
                  ")";
                ctx.commit(label, () => {});
                ctx.toast(label);
              },
            },
          );
          document.querySelector("[name=mode]").onchange = (e) =>
            (document.querySelector("#physical-value").hidden = e.target.value !== "physical");
          document.querySelector("[name=sides]").onchange = (e) =>
            (document.querySelector("[name=natural]").max = e.target.value);
        }
      }),
  );
  // TV-26 (Monk's «Find my token»): centre the viewer's token closer and select it.
  function findToken(id) {
    const token = scene.tokens.find((entry) => entry.actorId === id);
    if (!token) return;
    selected = id;
    deselected = false;
    zoom = Math.min(3, Math.max(zoom, 1.5));
    pan = { x: token.x - scene.width / zoom / 2, y: token.y - scene.height / zoom / 2 };
    focusAfterRender(id);
    ctx.render();
    document
      .querySelector("#content #map-message")
      ?.replaceChildren(
        t("Pedina trovata: ", "Token found: ") + (ctx.state.actors[id]?.name ?? ""),
      );
  }
  // Last, once every handler is bound: the tool of the current mode is active on this
  // table (chip, setMode or a combat preview resetting to Move all change only `mode`).
  syncActiveTool(ctx, table, tool());
  hideTextUnderFog(ctx, svg, scene);
  // TV-20/TV-27: after a gesture's re-render the token (or the map) keeps the keyboard focus,
  // so Ctrl+C, the arrows and the Menu key act on it at once.
  if (pendingFocus) {
    const id = pendingFocus;
    pendingFocus = null;
    const active = document.activeElement;
    if (Date.now() - pendingFocusAt < 1500 && (!active || active === document.body))
      (id === "map" ? svg : (svg.querySelector?.(`[data-actor="${attrValue(id)}"]`) ?? svg)).focus({
        preventScroll: true,
      });
  }
  // The sidebar control just pressed keeps the focus, unless a panel took it (the chat
  // composer on opening, a panel's first control).
  if (focusTab) {
    const id = focusTab;
    focusTab = null;
    const active = document.activeElement;
    if (!active || active === document.body)
      (id === "toggle"
        ? root.querySelector('[data-table-sidebar="toggle"]')
        : id.startsWith("hotbar:")
          ? root.querySelector(`[data-hotbar-page="${id.slice(7)}"]`)
          : id.startsWith("sub:")
            ? root.querySelector(`.table-subtabs [data-table-subtab="${id.slice(4)}"]`)
            : (root.querySelector(`.table-tabs [data-table-tab="${id}"]`) ??
              root.querySelector(`.table-subtabs [data-table-subtab="${id}"]`) ??
              root.querySelector(`.table-tabs [data-table-tab="${sectionOf(id)?.id ?? id}"]`))
      )?.focus?.({ preventScroll: true });
  }
}
