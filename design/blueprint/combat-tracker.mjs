// B32 — Complete combat tracker: registration and interface. Domain rules, sources and the
// patterns copied are in combat-tracker-domain.mjs.
//
// Placement (B61): the tracker is the "Combattimento" tab of the Table's right sidebar
// (Foundry combat tracker sidebar tab FVT-127/128, D&D Beyond Maps combat panel DDB-137);
// the turn marker under the active token and the "out of combat" marker are map layers
// (FVT-129, DDB-141); Mob Attack is a DM tool of the map toolbar (FVT-137 token controls);
// turn alerts are an overlay plus the notification bell (Monk's FVT-133, BG3 CRP-093);
// reaction policies are a box of the character sheet's Actions tab (BG3 CRP-138).
import * as D from "./combat-tracker-domain.mjs";
import {
  advanceTurn,
  hasBlockingConsequences,
  hasAutomaticRolls,
  resolveAutomaticRolls,
  observeTurnPhases,
  shareCurrentTurn,
  activeEffectsOf,
  effectEndedText,
} from "./combat.mjs";
import { openCombatRequests, effectIconPath } from "./combat-ui.mjs";
import { rollDie } from "./state.mjs";
import { setVisibility, removeTokens } from "./token-menu.mjs";
import {
  addHouseRule,
  retireHouseRule,
  houseRuleSource,
  policyOf as campaignPolicy,
  enemyHealthFor,
  isEnemyFor,
} from "./campaign-settings-domain.mjs";
import {
  awardParty,
  startCreatureLoot,
  cleanGearFromStatBlock,
  addParcelItem,
  parcelOnCreature,
} from "./loot.mjs";
import { partyMembers } from "./party-stash.mjs";
import { getById } from "./srd-sample.mjs";
// C3 (CA-57): the member the DM handed the session to has the tracker's DM powers.
import { runsSession } from "./session-view.mjs";

const ID = D.ID;
const L = (it, en) => Object.freeze({ it, en });
const SEEN_KEY = "d20-studio-combat-tracker-seen";
const SOUND = "combat-tracker-alerts.sound";

// Viewer-local interface state (never shared): the open row menu and the timer.
const ui = {
  menu: null,
  timer: null,
  alertTimer: null,
  focus: null,
  outside: null,
  // TV-46: the open start dialog (scene, its rows, its root and repaint), or null.
  start: null,
};
export function resetTrackerView() {
  ui.menu = null;
  ui.start = null;
  ui.focus = null;
  ui.outside?.abort();
  ui.outside = null;
  clearInterval(ui.timer);
  ui.timer = null;
  clearTimeout(ui.alertTimer);
  ui.alertTimer = null;
  globalThis.document?.querySelector?.("#ct-alert")?.remove();
}

// ---------------------------------------------------------------- helpers

const errorText = (ctx, error) =>
  ctx.label(error?.it ? { it: error.it, en: error.en } : (error?.message ?? String(error)));
/** One tracker command: a commit on the draft and this area's slice; refusals are toasts. */
function act(ctx, label, mutator, options = {}) {
  try {
    ctx.commit(label, (draft) => mutator(draft, D.sliceOf(draft)), options);
    return true;
  } catch (error) {
    ctx.toast(errorText(ctx, error), true);
    return false;
  }
}
const nameOf = (ctx, id) => ctx.state.actors?.[id]?.name ?? id;
const runs = (ctx) => runsSession(ctx.state, ctx.role);
const arr = (value) => (Array.isArray(value) ? value : []);
const tokenMenu = (draft) =>
  draft.ext?.["token-menu"]
    ? { slice: draft.ext["token-menu"], setVisibility, removeTokens }
    : null;
const applyModeOf = (ctx) =>
  ctx.state.ext?.["campaign-settings"] &&
  ctx.state.ext["campaign-settings"].campaigns?.[ctx.state.campaign?.id]?.policy?.automation !==
    "automatic"
    ? "assisted"
    : undefined;
// A shared label that would name a hidden creature stays DM-only.
const privateFor = (draftState, ids) =>
  ids.some((id) => D.hiddenFromPlayers(draftState, id)) ? { visibility: "private" } : {};
function readSeen() {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(SEEN_KEY) ?? "{}") || {};
  } catch {
    return {};
  }
}
function markSeen(role, key) {
  const seen = readSeen();
  seen[role] = [...(seen[role] ?? []).filter((k) => k !== key), key].slice(-60);
  try {
    globalThis.localStorage?.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    // Per-viewer convenience only: without storage the alert may show again.
  }
}
const wasSeen = (role, key) => (readSeen()[role] ?? []).includes(key);
const icon = (ctx, name) => ctx.icon?.(name) ?? "";
const formatElapsed = (since) => {
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(since)) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};
function chime() {
  try {
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) return false;
    const audio = new Audio();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.06;
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.22);
    osc.onended = () => audio.close?.();
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- health and badges

function healthText(ctx, actor) {
  if (runs(ctx) || ctx.canControl(actor)) return `${actor.hp}/${actor.maxHp} ${ctx.t("PF", "HP")}`;
  if (!isEnemyFor(ctx.state, actor, ctx.role)) return "";
  const policy = campaignPolicy(ctx.state.ext?.["campaign-settings"], ctx.state.campaign?.id);
  return enemyHealthFor(policy, actor, ctx.lang)?.text ?? "";
}
function readiedBadge(ctx, actorId) {
  const readied = D.sliceOf(ctx.state)?.readied?.[actorId];
  const actor = ctx.state.actors[actorId];
  if (readied?.status !== "held" || (!runs(ctx) && !ctx.canControl(actor))) return "";
  const trigger =
    readied.trigger === "custom"
      ? readied.text
      : ctx.label(D.READY_TRIGGERS.find(([id]) => id === readied.trigger)?.[1] ?? "");
  const what =
    readied.response.kind === "move" ? ctx.t("muoversi", "move") : ctx.label(readied.response.name);
  return `<span class="ct-badge ct-badge-ready" data-ct-readied="${ctx.esc(actorId)}">${ctx.t("Pronta", "Readied")}: ${ctx.esc(what)} · ${ctx.esc(trigger)}</span>`;
}
function pips(max, used) {
  return Array.from(
    { length: max },
    (_, i) => `<span class="ct-pip${i < max - used ? " is-on" : ""}"></span>`,
  ).join("");
}

// ---------------------------------------------------------------- rows

function menuItems(ctx, row) {
  const dm = runs(ctx);
  const actor = ctx.state.actors[row.id];
  const items = [["select", ctx.t("Seleziona sulla mappa", "Select on the map")]];
  if (dm) {
    items.push([
      row.hidden ? "reveal" : "hide",
      row.hidden
        ? ctx.t("Rivela ai giocatori", "Reveal to players")
        : ctx.t("Nascondi ai giocatori", "Hide from players"),
    ]);
    items.push([
      row.marked ? "undefeat" : "defeat",
      row.marked
        ? ctx.t("Non più sconfitta", "No longer defeated")
        : ctx.t("Segna sconfitta", "Mark defeated"),
    ]);
    items.push(["initiative", ctx.t("Correggi iniziativa…", "Correct initiative…")]);
    if (actor?.kind === "npc")
      items.push(["monster", ctx.t("Leggendarie e ricarica…", "Legendary and recharge…")]);
    items.push(["remove", ctx.t("Togli dal combattimento", "Remove from combat")]);
    items.push(["delete", ctx.t("Elimina la pedina…", "Delete the token…")]);
  }
  if (actor?.kind === "character" && ctx.canControl(actor))
    items.push(["reactions", ctx.t("Reazioni nella scheda", "Reactions on the sheet")]);
  return items;
}
function monsterExtra(ctx, id) {
  const slice = D.sliceOf(ctx.state);
  const monster = slice?.monsters?.[id];
  if (!runs(ctx) || !monster) return "";
  const parts = [];
  if (monster.legendary) {
    const check = D.legendaryState(ctx.state, slice, id);
    parts.push(
      `<div class="ct-res" data-ct-legendary="${ctx.esc(id)}"><span>${ctx.t("Azioni leggendarie", "Legendary actions")} <span class="ct-pips" aria-label="${monster.legendary.max - monster.legendary.used}/${monster.legendary.max}">${pips(monster.legendary.max, monster.legendary.used)}</span> ${monster.legendary.max - monster.legendary.used}/${monster.legendary.max}</span><button type="button" class="button quiet" data-ct-legendary-use="${ctx.esc(id)}"${check.can ? "" : ` aria-disabled="true" aria-describedby="ct-leg-why-${ctx.esc(id)}"`}>${ctx.t("Usa", "Use")}</button>${check.reason ? `<small class="muted" id="ct-leg-why-${ctx.esc(id)}">${ctx.esc(ctx.label(check.reason))}</small>` : ""}</div>`,
    );
  }
  if (monster.resistance) {
    const left = monster.resistance.max - monster.resistance.used;
    const saves = D.failedSaves(ctx.state, id);
    parts.push(
      `<div class="ct-res" data-ct-resistance="${ctx.esc(id)}"><span>${ctx.t("Resistenza leggendaria", "Legendary resistance")} ${left}/${monster.resistance.max}</span>${saves
        .map(
          (save) =>
            `<span class="ct-save"><small>${ctx.t("TS fallito", "Failed save")}: ${ctx.esc(ctx.label(save.actionName))}${save.sourceName ? " (" + ctx.esc(save.sourceName) + ")" : ""}${Number.isInteger(save.saveTotal) ? " · " + save.saveTotal : ""}</small><button type="button" class="button" data-ct-resist="${ctx.esc(id)}" data-attempt="${ctx.esc(save.attemptId)}"${save.ready && left > 0 ? "" : ` aria-disabled="true" aria-describedby="ct-resist-why-${ctx.esc(save.attemptId)}"`}>${ctx.t("Usa resistenza leggendaria", "Use Legendary Resistance")}</button>${save.ready && left > 0 ? "" : `<small class="muted" id="ct-resist-why-${ctx.esc(save.attemptId)}">${!save.ready ? ctx.t("Danno già applicato: annullalo prima.", "Damage already applied: undo it first.") : ctx.t("Nessun uso rimasto: la resistenza leggendaria torna il giorno dopo.", "No uses left: Legendary Resistance comes back the next day.")}</small>`}</span>`,
        )
        .join("")}</div>`,
    );
  }
  for (const ability of monster.recharge ?? [])
    parts.push(
      `<div class="ct-res" data-ct-recharge="${ctx.esc(id)}:${ctx.esc(ability.id)}"><span>${ctx.esc(ctx.label(ability.name))} (${ctx.t("Ricarica", "Recharge")} ${ability.min}–${ability.max}): <strong>${ability.available ? ctx.t("pronta", "ready") : ability.due ? ctx.t("da tirare", "to roll") : ctx.t("in ricarica", "recharging")}</strong></span>${ability.available ? `<button type="button" class="button quiet" data-ct-recharge-spend="${ctx.esc(id)}" data-ability="${ctx.esc(ability.id)}">${ctx.t("Segna usata", "Mark used")}</button>` : ability.due ? `<button type="button" class="button primary" data-ct-recharge-roll="${ctx.esc(id)}" data-ability="${ctx.esc(ability.id)}">${ctx.t("Tira 1d6", "Roll 1d6")}</button>` : ""}</div>`,
    );
  return parts.length ? `<div class="ct-extra">${parts.join("")}</div>` : "";
}
function readyExtra(ctx, row) {
  const slice = D.sliceOf(ctx.state);
  const actor = ctx.state.actors[row.id];
  if (!ctx.canControl(actor)) return "";
  const readied = slice?.readied?.[row.id];
  if (readied?.status === "moving" && D.readiedMoveOpen(ctx.state, row.id))
    return `<div class="ct-extra ct-ready" data-ct-ready-moving="${ctx.esc(row.id)}" role="status"><span class="ct-badge ct-badge-ready">${ctx.t("Reazione", "Reaction")}: ${ctx.t(`muovi ${ctx.esc(actor.name)} sulla mappa, fino a ${actor.movement} m (un movimento)`, `move ${ctx.esc(actor.name)} on the map, up to ${actor.movement} m (one move)`)}</span></div>`;
  if (readied?.status === "held")
    return `<div class="ct-extra ct-ready"><button type="button" class="button primary" data-ct-ready-fire="${ctx.esc(row.id)}">${ctx.t("Innesco avvenuto…", "Trigger happened…")}</button><button type="button" class="button quiet" data-ct-ready-ignore="${ctx.esc(row.id)}">${ctx.t("Ignora l’innesco", "Ignore the trigger")}</button></div>`;
  if (row.realCurrent && actor.action)
    return `<div class="ct-extra ct-ready"><button type="button" class="button" data-ct-ready="${ctx.esc(row.id)}">${ctx.t("Prepara un’azione…", "Ready an action…")}</button></div>`;
  return "";
}
// B33 hook (additive): with the damage tray area loaded, the HP value opens the same hit
// point widget as the sheet and the token (D&D Beyond DDB-142, "opened from the HP value in
// the list"). Without that area the value stays text, as before.
function hpCell(ctx, actor, hp) {
  const entry = ctx.registry?.get?.("token-menu", "damage-tray-hp", ctx, { actorId: actor.id });
  return entry
    ? `<button type="button" class="ct-hp ct-hp-button" data-ct-hp="${ctx.esc(actor.id)}" aria-haspopup="dialog" aria-label="${ctx.esc(ctx.t(`Punti ferita di ${actor.name}: ${hp}`, `${actor.name}’s hit points: ${hp}`))}">${ctx.esc(hp)}</button>`
    : `<span class="ct-hp">${ctx.esc(hp)}</span>`;
}
function renderCombatant(ctx, row) {
  const actor = ctx.state.actors[row.id];
  const open = ui.menu === row.id;
  const dm = runs(ctx);
  const hp = healthText(ctx, actor);
  const badges = [
    dm && row.hidden
      ? `<span class="ct-badge ct-badge-hidden">${ctx.t("Nascosta", "Hidden")}</span>`
      : "",
    row.defeated
      ? `<span class="ct-badge ct-badge-down">${ctx.t("Sconfitta", "Defeated")}</span>`
      : "",
    dm && row.realCurrent && !row.current
      ? `<span class="ct-badge">${ctx.t("Turno", "Turn")}</span>`
      : "",
    readiedBadge(ctx, row.id),
  ].join("");
  const items = menuItems(ctx, row);
  return `<li class="ct-row${row.current ? " is-current" : ""}${row.defeated ? " is-defeated" : ""}${dm && row.hidden ? " is-hidden" : ""}" data-ct-row="${ctx.esc(row.id)}"${row.current ? ' aria-current="true"' : ""}><div class="ct-line"><button type="button" class="ct-select" data-ct-select="${ctx.esc(row.id)}" aria-label="${ctx.esc(actor.name)}${row.current ? " · " + ctx.t("turno attuale", "current turn") : ""}"><span class="ct-portrait${actor.kind === "npc" ? " is-npc" : ""}" aria-hidden="true">${ctx.esc(actor.name[0] ?? "?")}</span><span class="ct-name">${ctx.esc(actor.name)}</span></button><span class="ct-init" title="${ctx.t("Iniziativa", "Initiative")}" aria-label="${ctx.t("Iniziativa", "Initiative")} ${row.initiative ?? "—"}">${row.initiative ?? "—"}</span><button type="button" class="ct-more" data-ct-menu="${ctx.esc(row.id)}" aria-haspopup="menu" aria-expanded="${open}" aria-controls="ct-menu-${ctx.esc(row.id)}" aria-label="${ctx.t("Comandi per", "Commands for")} ${ctx.esc(actor.name)}">⋯</button></div>${badges || hp ? `<div class="ct-meta">${badges}${hp ? hpCell(ctx, actor, hp) : ""}</div>` : ""}${open ? `<div class="ct-menu" id="ct-menu-${ctx.esc(row.id)}" role="menu" aria-label="${ctx.t("Comandi per", "Commands for")} ${ctx.esc(actor.name)}">${items.map(([id, label]) => `<button type="button" role="menuitem" class="ct-menu-item" data-ct-cmd="${id}" data-actor="${ctx.esc(row.id)}">${ctx.esc(label)}</button>`).join("")}</div>` : ""}${monsterExtra(ctx, row.id)}${readyExtra(ctx, row)}</li>`;
}
function renderEntry(ctx, entry) {
  const dm = runs(ctx);
  const status =
    entry.kind === "reminder"
      ? ctx.t("ogni round", "every round")
      : entry.remaining === 0
        ? ctx.t("Ora!", "Now!")
        : ctx.t(
            `fra ${entry.remaining} round`,
            `in ${entry.remaining} round${entry.remaining === 1 ? "" : "s"}`,
          );
  const menuId = "entry-" + entry.id;
  const open = ui.menu === menuId;
  const items = [
    ...(entry.kind === "countdown"
      ? [
          ["entry-less", ctx.t("Un round in meno", "One round less")],
          ["entry-more", ctx.t("Un round in più", "One round more")],
        ]
      : []),
    ["entry-edit", ctx.t("Modifica…", "Edit…")],
    ["entry-remove", ctx.t("Rimuovi la voce", "Remove the entry")],
  ];
  return `<li class="ct-row ct-entry${entry.remaining === 0 && entry.kind === "countdown" ? " is-fired" : ""}" data-ct-entry="${ctx.esc(entry.id)}"><div class="ct-line"><span class="ct-select"><span class="ct-portrait is-entry" aria-hidden="true">${icon(ctx, "clock")}</span><span class="ct-name">${ctx.esc(entry.name)}</span></span><span class="ct-init" aria-label="${ctx.t("Conteggio", "Count")} ${entry.init}">${entry.init}</span>${dm ? `<button type="button" class="ct-more" data-ct-menu="${ctx.esc(menuId)}" aria-haspopup="menu" aria-expanded="${open}" aria-controls="ct-menu-${ctx.esc(menuId)}" aria-label="${ctx.t("Comandi per", "Commands for")} ${ctx.esc(entry.name)}">⋯</button>` : ""}</div><div class="ct-meta"><span class="ct-badge ct-badge-entry" data-ct-entry-status>${ctx.esc(status)}</span>${dm && entry.visibility === "dm" ? `<span class="ct-badge">${ctx.t("Solo DM", "DM only")}</span>` : ""}${entry.note ? `<small class="muted">${ctx.esc(entry.note)}</small>` : ""}</div>${open ? `<div class="ct-menu" id="ct-menu-${ctx.esc(menuId)}" role="menu" aria-label="${ctx.t("Comandi per", "Commands for")} ${ctx.esc(entry.name)}">${items.map(([id, label]) => `<button type="button" role="menuitem" class="ct-menu-item" data-ct-cmd="${id}" data-actor="${ctx.esc(entry.id)}">${ctx.esc(label)}</button>`).join("")}</div>` : ""}</li>`;
}
function renderRows(ctx) {
  const slice = D.sliceOf(ctx.state);
  const rows = D.trackerRows(ctx.state, slice, ctx.role);
  const groups = slice?.settings?.groupTurns ? D.groupsInOrder(ctx.state, slice) : [];
  const inGroup = new Map();
  for (const group of groups) for (const id of group.memberIds) inGroup.set(id, group);
  const done = new Set();
  const html = [];
  for (const row of rows) {
    if (row.kind === "entry") {
      html.push(renderEntry(ctx, row.entry));
      continue;
    }
    const group = inGroup.get(row.id);
    if (!group) {
      html.push(renderCombatant(ctx, row));
      continue;
    }
    if (done.has(group)) continue;
    done.add(group);
    const members = rows.filter((r) => r.kind === "combatant" && group.memberIds.includes(r.id));
    const active = ctx.state.combat.order[ctx.state.combat.turn] === group.leaderId;
    const base = D.baseName(ctx.state.actors[group.memberIds[0]]?.name);
    html.push(
      `<li class="ct-group${active ? " is-current" : ""}" data-ct-group="${ctx.esc(group.leaderId ?? "")}"><div class="ct-group-head"><strong>${ctx.esc(base)} ×${members.length}</strong><span class="ct-badge">${ctx.t("Turno di gruppo", "Group turn")}</span>${runs(ctx) && active ? `<button type="button" class="button" data-ct-mob>${icon(ctx, "sword")} ${ctx.t("Attacco di gruppo…", "Mob attack…")}</button>` : ""}</div><ol class="ct-group-list">${members.map((m) => renderCombatant(ctx, m)).join("")}</ol></li>`,
    );
  }
  return html.join("");
}

// ---------------------------------------------------------------- pending lane (DM)

function renderPending(ctx, tableView) {
  const slice = D.sliceOf(ctx.state);
  // TV-46: a player sees the waiting creatures they control, with their own roll.
  if (!runs(ctx)) return { lane: ownPendingLane(ctx, slice), add: "" };
  const pending = slice.combat.pending;
  const joinable = D.joinableActors(ctx.state, slice);
  const selected = tableView?.selectedActorId;
  const lane = pending.length
    ? `<section class="ct-pending" aria-labelledby="ct-pending-title"><h3 id="ct-pending-title">${ctx.t("In attesa di entrare", "Waiting to join")} (${pending.length})</h3><ul>${pending
        .map((p) => {
          const actor = ctx.state.actors[p.actorId];
          const twin = ctx.state.combat.order.find(
            (id) =>
              id !== p.actorId &&
              D.baseName(ctx.state.actors[id]?.name) === D.baseName(actor?.name) &&
              D.initiativeOf(ctx.state, id) !== null,
          );
          const why = `ct-pending-adv-why-${ctx.esc(p.actorId)}`;
          const adv = (value, label) =>
            `<button type="button" class="button quiet ct-seg${p.advantage === value ? " active" : ""}" data-ct-pending-adv="${ctx.esc(p.actorId)}" data-value="${value}" aria-pressed="${p.advantage === value}"${p.roll ? ` aria-disabled="true" aria-describedby="${why}"` : ""}>${label}</button>`;
          const byPlayer = D.rolledByPlayer(ctx.state, p.actorId);
          return `<li class="ct-pending-row" data-ct-pending="${ctx.esc(p.actorId)}"><div class="ct-line"><strong class="ct-name">${ctx.esc(actor?.name ?? p.actorId)}</strong>${D.hiddenFromPlayers(ctx.state, p.actorId) ? `<span class="ct-badge ct-badge-hidden">${ctx.t("Nascosta", "Hidden")}</span>` : ""}${p.roll ? `<span class="ct-init" data-ct-pending-total>${p.roll.total}</span>` : ""}</div>${
            p.roll
              ? `<p class="ct-roll">${p.roll.natural} ${p.roll.bonus < 0 ? "−" : "+"} ${Math.abs(p.roll.bonus)} = <strong>${p.roll.total}</strong> · ${p.roll.mode === "physical" ? ctx.t("dado fisico", "physical die") : ctx.t("dado digitale", "digital die")}${p.roll.faces?.length > 1 ? ` (${p.roll.faces.join(", ")})` : ""}</p><div class="ct-segs" role="group" aria-label="${ctx.t("Modalità del tiro", "Roll mode")}">${adv("advantage", ctx.t("Vantaggio", "Advantage"))}${adv("normal", ctx.t("Normale", "Normal"))}${adv("disadvantage", ctx.t("Svantaggio", "Disadvantage"))}</div><p class="muted ct-why" id="${why}">${ctx.t("L’iniziativa è già tirata: per cambiarla usa «Correggi con il dado fisico».", "Initiative is already rolled: to change it use “Correct with the physical die”.")}</p><details class="ct-correct"><summary>${ctx.t("Correggi con il dado fisico", "Correct with the physical die")}</summary><form class="ct-inline" data-ct-pending-fix="${ctx.esc(p.actorId)}"><label class="field">${ctx.t("d20 fisico", "Physical d20")}<input name="natural" type="number" min="1" max="20" required inputmode="numeric"></label><label class="field">${ctx.t("Motivo", "Reason")}<input name="reason" maxlength="200" required></label><button class="button">${ctx.t("Registra la correzione", "Record the correction")}</button></form></details>`
              : `${byPlayer ? `<p class="muted ct-by-player" data-ct-awaits-player>${ctx.t(`Lo tira chi gioca ${actor?.name ?? ""}, oppure tiralo tu.`, `${actor?.name ?? ""}’s player rolls it, or roll it yourself.`)}</p>` : ""}<div class="ct-segs" role="group" aria-label="${ctx.t("Modalità del tiro", "Roll mode")}">${adv("advantage", ctx.t("Vantaggio", "Advantage"))}${adv("normal", ctx.t("Normale", "Normal"))}${adv("disadvantage", ctx.t("Svantaggio", "Disadvantage"))}</div><div class="ct-actions"><button type="button" class="button primary" data-ct-pending-roll="${ctx.esc(p.actorId)}">${icon(ctx, "dice")} ${ctx.t("Tira l’iniziativa", "Roll initiative")} (${signedBonus(D.initiativeBonus(ctx.state, p.actorId))})</button>${twin ? `<button type="button" class="button" data-ct-pending-share="${ctx.esc(p.actorId)}" data-with="${ctx.esc(twin)}">${ctx.t("Stessa iniziativa di", "Same initiative as")} ${ctx.esc(nameOf(ctx, twin))} (${D.initiativeOf(ctx.state, twin)})</button>` : ""}</div><form class="ct-inline" data-ct-pending-physical="${ctx.esc(p.actorId)}"><label class="field">${ctx.t("d20 fisico", "Physical d20")}<input name="natural" type="number" min="1" max="20" required inputmode="numeric"></label><button class="button">${ctx.t("Registra", "Record")}</button></form>`
          }<button type="button" class="button quiet" data-ct-pending-remove="${ctx.esc(p.actorId)}">${ctx.t("Togli dall’attesa", "Remove from waiting")}</button></li>`;
        })
        .join(
          "",
        )}</ul><button type="button" class="button primary" data-ct-pending-add${pending.some((p) => p.roll) ? "" : ' aria-disabled="true" aria-describedby="ct-pending-add-why"'}>${ctx.t("Aggiungi al combattimento", "Add to combat")} (${pending.filter((p) => p.roll).length})</button>${pending.some((p) => p.roll) ? "" : `<p class="muted ct-why" id="ct-pending-add-why">${ctx.t("Nessuna creatura in attesa ha già tirato: premi «Tira l’iniziativa» su una riga.", "No waiting creature has rolled yet: press “Roll initiative” on a row.")}</p>`}</section>`
    : "";
  const selectedJoinable = joinable.includes(selected);
  const others = joinable.filter((id) => id !== selected);
  const add = `<div class="ct-join">${selectedJoinable ? `<button type="button" class="button" data-ct-join="${ctx.esc(selected)}">${icon(ctx, "plus")} ${ctx.t("Aggiungi al combattimento", "Add to combat")}: ${ctx.esc(nameOf(ctx, selected))}</button>` : `<p class="muted">${ctx.t("Seleziona sulla mappa una pedina fuori dal combattimento per aggiungerla.", "Select a token outside the combat on the map to add it.")}</p>`}${others.length ? `<details class="ct-others"><summary>${ctx.t("Altre pedine sulla scena", "Other tokens on the scene")} (${others.length})</summary><ul>${others.map((id) => `<li><span>${ctx.esc(nameOf(ctx, id))}${D.hiddenFromPlayers(ctx.state, id) ? ` · ${ctx.t("nascosta", "hidden")}` : ""}</span><button type="button" class="button quiet" data-ct-join="${ctx.esc(id)}" aria-label="${ctx.t("Aggiungi al combattimento", "Add to combat")}: ${ctx.esc(nameOf(ctx, id))}">${icon(ctx, "plus")}</button></li>`).join("")}</ul></details>` : ""}</div>`;
  return { lane, add };
}
// TV-46 (Foundry's d20 on the player's own combatant row): «Tira l’iniziativa» with a
// digital die, or the face of a physical d20, for each creature of this viewer that waits.
function ownRollControls(ctx, actorId) {
  const id = ctx.esc(actorId);
  const name = nameOf(ctx, actorId);
  return `<div class="ct-own-roll" data-ct-own="${id}"><button type="button" class="button primary" data-ct-own-roll="${id}" aria-label="${ctx.esc(ctx.t(`Tira l’iniziativa di ${name}`, `Roll ${name}’s initiative`))}">${icon(ctx, "dice")} ${ctx.t("Tira l’iniziativa", "Roll initiative")} (${signedBonus(D.initiativeBonus(ctx.state, actorId))})</button><form class="ct-inline" data-ct-own-physical="${id}"><label class="field">${ctx.t("d20 fisico", "Physical d20")}<input name="natural" type="number" min="1" max="20" required inputmode="numeric"></label><button class="button">${ctx.t("Registra", "Record")}</button></form></div>`;
}
function ownPendingLane(ctx, slice) {
  const mine = arr(slice?.combat?.pending).filter(
    (p) => !p.roll && ctx.canControl(ctx.state.actors[p.actorId]),
  );
  if (!mine.length) return "";
  return `<section class="ct-pending ct-own-lane" aria-labelledby="ct-own-lane-title"><h3 id="ct-own-lane-title">${ctx.t("Entri in combattimento: tira l’iniziativa", "You join the combat: roll initiative")}</h3><ul>${mine
    .map(
      (p) =>
        `<li class="ct-pending-row" data-ct-pending="${ctx.esc(p.actorId)}"><div class="ct-line"><strong class="ct-name">${ctx.esc(nameOf(ctx, p.actorId))}</strong></div>${ownRollControls(ctx, p.actorId)}</li>`,
    )
    .join("")}</ul></section>`;
}
// The roll call (TV-46): the order being started, as every viewer may see it, with the
// viewer's own «Tira l’iniziativa» (Foundry: combatants listed before «Begin Combat»).
function renderRollCall(ctx) {
  const call = D.rollCallOf(ctx.state);
  if (!call || (ctx.state.combat?.active && !ctx.state.combat.turnMode)) return "";
  const scene = D.activeScene(ctx.state);
  const runner = runs(ctx);
  const rows = arr(scene.encounter.participants).filter((p) =>
    D.viewerSees(ctx.state, p.actorId, ctx.role),
  );
  const waiting = rows.filter((p) => D.awaitsInitiative(ctx.state, p.actorId));
  const players = waiting.filter((p) => D.rolledByPlayer(ctx.state, p.actorId));
  const head = runner
    ? `<p class="ct-rollcall-status" role="status">${ctx.t("Avvio del combattimento in corso", "Combat start in progress")} · ${players.length ? ctx.t(`${players.length} tiri dei giocatori in attesa`, `${players.length} player rolls pending`) : ctx.t("i giocatori hanno tirato", "the players have rolled")}</p><div class="ct-actions"><button type="button" class="button primary" data-ct-start>${icon(ctx, "swords")} ${ctx.t("Riprendi l’avvio", "Resume the start")}</button><button type="button" class="button quiet" data-ct-rollcall-close>${ctx.t("Annulla l’avvio", "Cancel the start")}</button></div>`
    : `<p class="ct-rollcall-status" role="status"><strong>${ctx.t("Il DM sta avviando un combattimento.", "The DM is starting a combat.")}</strong> ${waiting.some((p) => ctx.canControl(ctx.state.actors[p.actorId])) ? ctx.t("Tira l’iniziativa: l’ordine si ordina da solo.", "Roll initiative: the order sorts itself.") : ctx.t("Aspetta l’inizio del primo turno.", "Wait for the first turn to begin.")}</p>`;
  return `<section class="ct-rollcall" data-ct-rollcall aria-labelledby="ct-rollcall-title"><h3 id="ct-rollcall-title">${ctx.t("Iniziativa", "Initiative")} · ${ctx.esc(scene.encounter.name || scene.name)}</h3>${head}<ol class="ct-list" aria-label="${ctx.t("Ordine d’iniziativa", "Initiative order")}">${rows
    .map((p) => {
      const actor = ctx.state.actors[p.actorId];
      const total = Number.isInteger(p.natural) ? p.natural + p.bonus : null;
      const mine = !runner && D.awaitsInitiative(ctx.state, p.actorId) && ctx.canControl(actor);
      return `<li class="ct-row" data-ct-row="${ctx.esc(p.actorId)}"><div class="ct-line"><span class="ct-select"><span class="ct-portrait${actor.kind === "npc" ? " is-npc" : ""}" aria-hidden="true">${ctx.esc(actor.name[0] ?? "?")}</span><span class="ct-name">${ctx.esc(actor.name)}</span></span><span class="ct-init" aria-label="${ctx.t("Iniziativa", "Initiative")} ${total ?? "—"}">${total ?? "—"}</span></div>${mine ? ownRollControls(ctx, p.actorId) : ""}</li>`;
    })
    .join("")}</ol></section>`;
}

// ---------------------------------------------------------------- reactions summary

function renderPolicies(ctx) {
  const mine = Object.values(ctx.state.actors).filter(
    (actor) =>
      actor.kind === "character" &&
      actor.owner === ctx.role &&
      ctx.canControl(actor) &&
      D.reactionsOf(ctx.state, actor.id).length &&
      (!ctx.state.combat.active || ctx.state.combat.order.includes(actor.id)),
  );
  if (!mine.length) return "";
  const word = (policy) =>
    ({
      ask: ctx.t("Chiedi", "Ask"),
      auto: ctx.t("Automatico", "Automatic"),
      off: ctx.t("Disattivata", "Off"),
    })[policy];
  return `<section class="ct-policies" aria-labelledby="ct-policies-title"><h3 id="ct-policies-title">${ctx.t("Le tue reazioni", "Your reactions")}</h3><ul>${mine
    .map(
      (actor) =>
        `<li><strong>${ctx.esc(actor.name)}:</strong> <span>${D.reactionsOf(ctx.state, actor.id)
          .map((r) => `${ctx.esc(ctx.label(r.name))} · ${word(r.policy)}`)
          .join(
            "; ",
          )}</span> <button type="button" class="button quiet" data-ct-sheet="${ctx.esc(actor.id)}">${ctx.t("Cambia nella scheda", "Change on the sheet")}</button></li>`,
    )
    .join("")}</ul></section>`;
}

// ---------------------------------------------------------------- panel

function renderHistory(ctx, slice) {
  const last = slice.history.at(-1);
  if (!last || !runs(ctx)) return "";
  return `<section class="ct-history" aria-labelledby="ct-history-title"><h3 id="ct-history-title">${ctx.t("Ultimo incontro concluso", "Last finished encounter")}</h3><p>${ctx.t("Round", "Rounds")}: ${last.rounds} · ${ctx.t("Sconfitti", "Defeated")}: ${ctx.esc(last.defeated.map((d) => d.name).join(", ") || "—")} · ${ctx.t("PE", "XP")}: ${last.xpTotal}${last.xpAwarded ? ` (${ctx.t("assegnati", "awarded")})` : ""}${last.parcels.length ? ` · ${last.parcels.length} ${ctx.t("pacchetti di bottino", "loot parcels")}` : ""}</p></section>`;
}
function renderRollLog(ctx, slice) {
  if (!runs(ctx)) return "";
  const rolls = D.rechargeHistory(ctx.state, slice).slice(-6).reverse();
  if (!rolls.length) return "";
  return `<details class="ct-rolls"><summary>${ctx.t("Tiri di ricarica", "Recharge rolls")} (${rolls.length})</summary><ul>${rolls
    .map(
      (roll) =>
        `<li data-ct-roll="${ctx.esc(roll.id)}" data-status="${roll.status}">${ctx.esc(roll.actorName)} · ${ctx.esc(ctx.label(roll.name))} (${roll.range}): d6 = <strong>${roll.face}</strong> · ${roll.success ? ctx.t("ricaricata", "recharged") : ctx.t("non ricaricata", "not recharged")} · ${roll.mode === "physical" ? ctx.t("fisico", "physical") : ctx.t("digitale", "digital")}${roll.automatic ? " · " + ctx.t("automatico", "automatic") : ""}${roll.reusedFrom ? " · " + ctx.t("faccia riusata", "face reused") : ""}${roll.status === "reversed" ? ` · <em>${ctx.t("annullato, tiro conservato", "undone, roll kept")}</em>` : ""}</li>`,
    )
    .join("")}</ul></details>`;
}
// TV-129 (BG3 turn-based mode, Shift+Space): anyone with a character on the scene starts it.
function turnModeButton(ctx) {
  const can =
    D.turnModeCandidates(ctx.state).length > 0 &&
    (runs(ctx) ||
      D.turnModeCandidates(ctx.state).some((id) => ctx.canControl(ctx.state.actors[id])));
  return can
    ? `<button type="button" class="button" data-ct-turn-mode aria-keyshortcuts="Shift+Space" title="${ctx.esc(ctx.t("Gioca a turni senza iniziativa (Maiusc+Spazio)", "Play in turns without initiative (Shift+Space)"))}">${icon(ctx, "clock")} ${ctx.t("Modalità a turni", "Turn-based mode")}</button>`
    : "";
}
function renderIdle(ctx, slice) {
  const dm = runs(ctx);
  const call = renderRollCall(ctx);
  return `<div class="ct" data-ct-idle>${call || `<p class="ct-empty">${ctx.t("Nessun combattimento in corso.", "No combat in progress.")}</p>`}${dm ? `<div class="ct-actions">${call ? "" : `<button type="button" class="button primary" data-ct-start>${icon(ctx, "swords")} ${ctx.t("Avvia combattimento", "Start combat")}</button>`}${turnModeButton(ctx)}<button type="button" class="button" data-ct-entry-new>${icon(ctx, "clock")} ${ctx.t("Voce del tracker…", "Tracker entry…")}</button><button type="button" class="button quiet" data-ct-settings>${icon(ctx, "settings")} ${ctx.t("Impostazioni", "Settings")}</button></div><p class="muted ct-hint">${ctx.t("Avvia combattimento: scegli le pedine, «Tira tutti» e «Inizia», senza lasciare il Tavolo.", "Start combat: choose the tokens, “Roll all” and “Begin”, without leaving the Table.")}</p>${slice.entries.length ? `<h3>${ctx.t("Voci pronte per il prossimo combattimento", "Entries ready for the next combat")}</h3><ol class="ct-list">${slice.entries.map((e) => renderEntry(ctx, e)).join("")}</ol>` : ""}${renderHistory(ctx, slice)}` : turnModeButton(ctx) ? `<div class="ct-actions">${turnModeButton(ctx)}</div>` : ""}${renderPolicies(ctx)}${soundToggle(ctx)}</div>`;
}
// Turn-based mode in progress: the party's order, «Termina turno» and a way out.
function renderTurnMode(ctx) {
  const state = ctx.state;
  const current = D.currentId(state);
  const controls = runs(ctx) || ctx.canControl(state.actors[current]);
  const rows = state.combat.order
    .filter((id) => D.viewerSees(state, id, ctx.role))
    .map(
      (id) =>
        `<li class="ct-row${id === current ? " is-current" : ""}" data-ct-row="${ctx.esc(id)}"${id === current ? ' aria-current="true"' : ""}><div class="ct-line"><button type="button" class="ct-select" data-ct-select="${ctx.esc(id)}"><span class="ct-portrait" aria-hidden="true">${ctx.esc(nameOf(ctx, id)[0] ?? "?")}</span><span class="ct-name">${ctx.esc(nameOf(ctx, id))}</span></button></div></li>`,
    )
    .join("");
  return `<div class="ct" data-ct data-ct-turn-mode-on>${renderRollCall(ctx)}<header class="ct-head"><div><strong>${ctx.t("Modalità a turni", "Turn-based mode")}</strong><span class="muted"> · ${ctx.t("Turno di", "Turn of")} <span data-ct-turn>${ctx.esc(nameOf(ctx, current))}</span></span></div></header><p class="muted">${ctx.t("Fuori dal combattimento, un personaggio alla volta, senza iniziativa (come la modalità a turni di Baldur’s Gate 3).", "Outside combat, one character at a time, without initiative (like Baldur’s Gate 3’s turn-based mode).")}</p><ol class="ct-list" aria-label="${ctx.t("Ordine dei turni", "Turn order")}">${rows}</ol><footer class="ct-foot">${controls ? `<button type="button" class="button primary" data-ct-next>${ctx.t("Termina turno", "End turn")}</button>` : ""}<button type="button" class="button" data-ct-turn-mode-end>${ctx.t("Esci dalla modalità a turni", "Leave turn-based mode")}</button>${runs(ctx) ? `<button type="button" class="button" data-ct-start>${icon(ctx, "swords")} ${ctx.t("Avvia combattimento", "Start combat")}</button>` : ""}</footer></div>`;
}
function soundToggle(ctx) {
  const on = ctx.registry?.getSetting?.(ctx, SOUND) === true;
  return `<label class="ct-check ct-sound"><input type="checkbox" data-ct-sound ${on ? "checked" : ""}> ${ctx.t("Suono quando tocca a me (questo dispositivo)", "Sound when it is my turn (this device)")}</label>`;
}
export function renderTracker(ctx, tableView) {
  const slice = D.sliceOf(ctx.state);
  if (!slice) return "";
  if (!ctx.state.combat?.active) return renderIdle(ctx, slice);
  if (ctx.state.combat.turnMode) return renderTurnMode(ctx);
  const dm = runs(ctx);
  const state = ctx.state;
  // DDB-138: a player's header, timer and round checkpoint follow the turn they see, so a
  // hidden creature's turn moves nothing on their screen. The round number stays the
  // Table's own (its header shows it too); see the review notes in the evidence.
  const seen = D.shownTurn(state, ctx.role);
  const shown = seen?.id ?? null;
  const round = state.combat.round;
  const current = D.currentId(state);
  const controlsCurrent = dm || ctx.canControl(state.actors[current]);
  const hold = slice.combat.roundHold === round && (seen?.round ?? round) === round;
  const rule = slice.settings.groupTurns;
  const pending = renderPending(ctx, tableView);
  const since = D.turnStartedFor(state, slice, ctx.role);
  const timer =
    slice.settings.timer && since && !hold
      ? `<span class="ct-timer" data-ct-timer="${ctx.esc(since)}" aria-label="${ctx.t("Tempo del turno", "Turn time")}">${icon(ctx, "clock")} <span>${formatElapsed(since)}</span></span>`
      : "";
  return `<div class="ct" data-ct><header class="ct-head"><div><strong data-ct-round>${ctx.t("Round", "Round")} ${round}</strong><span class="muted"> · ${ctx.t("Turno di", "Turn of")} <span data-ct-turn>${ctx.esc(shown ? nameOf(ctx, shown) : "—")}</span></span></div>${timer}</header>${
    hold
      ? `<div class="ct-hold" role="status">${dm ? `<span>${ctx.t(`Inizio del round ${state.combat.round}: controlla eventi e conti alla rovescia.`, `Start of round ${state.combat.round}: check events and countdowns.`)}</span><button type="button" class="button primary" data-ct-hold>${ctx.t("Inizia il round", "Start the round")}</button>` : `<span>${ctx.t("Il DM sta preparando l’inizio del round.", "The DM is preparing the start of the round.")}</span>`}</div>`
      : ""
  }${rule ? `<p class="ct-rule">${icon(ctx, "shield")} ${ctx.t("Regola della casa", "House rule")}: ${ctx.esc(rule.title || ctx.label(D.GROUP_RULE_TITLE))}</p>` : ""}${pending.lane}<ol class="ct-list" aria-label="${ctx.t("Ordine dei turni", "Turn order")}">${renderRows(ctx)}</ol>${pending.add}${renderPolicies(ctx)}<footer class="ct-foot">${controlsCurrent ? `<button type="button" class="button primary" data-ct-next>${dm ? ctx.t("Turno successivo", "Next turn") : ctx.t("Termina turno", "End turn")}</button>` : ""}${dm ? `<button type="button" class="button" data-ct-entry-new>${icon(ctx, "clock")} ${ctx.t("Voce del tracker…", "Tracker entry…")}</button><button type="button" class="button" data-ct-mob>${icon(ctx, "sword")} ${ctx.t("Attacco di gruppo…", "Mob attack…")}</button><button type="button" class="button" data-ct-finish>${ctx.t("Concludi incontro…", "Finish encounter…")}</button><button type="button" class="button quiet" data-ct-reset>${ctx.t("Reimposta…", "Reset…")}</button><button type="button" class="button quiet danger" data-ct-clear>${ctx.t("Svuota…", "Clear…")}</button><button type="button" class="button quiet" data-ct-settings>${icon(ctx, "settings")} ${ctx.t("Impostazioni", "Settings")}</button>` : ""}</footer>${soundToggle(ctx)}${renderRollLog(ctx, slice)}</div>`;
}

// ---------------------------------------------------------------- start at the Table (TV-45)

const signedBonus = (n) => (n < 0 ? "−" + Math.abs(n) : "+" + n);
// TV-46: who rolled a row's recorded result (a player's own roll) and who still waits.
function startRowStatus(ctx, row) {
  const name = ctx.esc(row.name);
  const entry = arr(ctx.state.initiativeRolls).find((r) => r.id === row.rollId);
  if (entry && entry.controller && entry.controller !== ctx.role && Number.isInteger(row.natural))
    return `<small class="ct-start-by" data-ct-start-by="${ctx.esc(row.actorId)}">${ctx.t(`${name} ha tirato ${row.natural + row.bonus}`, `${name} rolled ${row.natural + row.bonus}`)} · ${ctx.t("puoi correggerlo scrivendo il d20", "you can correct it by typing the d20")}</small>`;
  if (
    row.included &&
    !Number.isInteger(row.natural) &&
    D.rollCallOf(ctx.state) &&
    D.rolledByPlayer(ctx.state, row.actorId)
  )
    return `<small class="ct-start-by is-waiting" data-ct-start-waiting="${ctx.esc(row.actorId)}">${ctx.t(`Aspetta il tiro di chi gioca ${name}, oppure tira tu.`, `Waiting for ${name}’s player to roll, or roll it yourself.`)}</small>`;
  return "";
}
// TV-52 (Improved Initiative, Foundry group roll; SRD EN 13 / IT 14): identical creatures
// that share one Initiative roll are one row, «Goblin guerriero A, B», with one d20.
function startGroups(state, rows) {
  const groups = [];
  for (const row of D.sortStartRows(state, rows)) {
    const key = D.sharedKey(row);
    const last = groups.at(-1);
    if (key && last && D.sharedKey(last[0]) === key && last[0].included === row.included)
      last.push(row);
    else groups.push([row]);
  }
  return groups;
}
function groupName(group) {
  if (group.length === 1) return group[0].name;
  const stems = group.map((row) => row.name.replace(/\s+\S+$/, ""));
  return stems.every((stem) => stem === stems[0] && stem !== group[0].name)
    ? `${stems[0]} ${group.map((row) => row.name.slice(stems[0].length).trim()).join(", ")}`
    : group.map((row) => row.name).join(", ");
}
// TV-52 (Improved Initiative «group initiative», DDB shared copies): identical creatures
// roll once by default (SRD 5.2.1 EN 13 / IT 14); the switch gives each its own d20.
function shareSwitch(ctx, rows, group) {
  const key = group[0].shareKey;
  if (!key || rows.filter((r) => r.shareKey === key).length < 2) return "";
  const shared = D.sharedKey(group[0]) === key;
  return `<label class="ct-check ct-start-share" title="${ctx.esc(ctx.t("Acceso: un solo tiro per tutte le copie (regola SRD). Spento: ogni copia tira il suo d20.", "On: one roll for all copies (SRD rule). Off: each copy rolls its own d20."))}"><input type="checkbox" role="switch" data-ct-start-share="${ctx.esc(key)}" ${shared ? "checked" : ""}> ${ctx.t("Un solo tiro per il gruppo", "One roll for the group")}</label>`;
}
// Final review P2 — Surprise (SRD 5.2.1 EN 189 / IT 216; BG3 and Solasta ambushes): the DM
// marks who is caught unaware; that d20 rolls with Disadvantage.
function surpriseSwitch(ctx, row) {
  const id = ctx.esc(row.actorId);
  return `<label class="ct-check ct-start-surprise" title="${ctx.esc(ctx.t("Colto alla sprovvista: tira l’iniziativa con svantaggio (due d20, vale il più basso).", "Caught unaware: rolls Initiative with Disadvantage (two d20s, the lower counts)."))}"><input type="checkbox" data-ct-start-surprise="${id}" ${row.surprised ? "checked" : ""}${row.included ? "" : " disabled"}> ${ctx.t("Sorpreso", "Surprised")}</label>`;
}
function startRowsHTML(ctx, rows) {
  return startGroups(ctx.state, rows)
    .map((group) => {
      const row = { ...group[0], name: groupName(group) };
      const share = shareSwitch(ctx, rows, group);
      const members =
        group.length > 1
          ? ` data-ct-start-group="${ctx.esc(group.map((r) => r.actorId).join(" "))}"`
          : "";
      const id = ctx.esc(row.actorId);
      const total = Number.isInteger(row.natural) ? row.natural + row.bonus : null;
      // SV-37: a row left out says why its die is off and how to bring it back.
      const off = row.included ? "" : ` disabled aria-describedby="ct-start-why-${id}"`;
      const why = row.included
        ? ""
        : `<small class="muted ct-why" id="ct-start-why-${id}">${ctx.t("Non partecipa: spunta il nome per includerla e tirare.", "Not taking part: tick the name to include it and roll.")}</small>`;
      return `<li class="ct-start-row${row.included ? " is-included" : ""}" data-ct-start-row="${id}"${members}><label class="ct-check ct-start-who"><input type="checkbox" data-ct-start-include="${id}" ${row.included ? "checked" : ""}> <strong>${ctx.esc(row.name)}</strong>${row.hidden ? ` <span class="ct-badge ct-badge-hidden">${ctx.t("Nascosta", "Hidden")}</span>` : ""}<small class="muted">${row.npc ? ctx.t("PNG", "NPC") : ctx.t("Personaggio", "Character")} · ${ctx.t("Iniziativa", "Initiative")} ${signedBonus(row.bonus)}</small></label><span class="ct-start-roll"><label class="ct-start-d20"><span>d20</span><input type="number" min="1" max="20" step="1" inputmode="numeric" data-ct-start-natural="${id}" value="${row.natural ?? ""}" aria-label="${ctx.esc(ctx.t(`d20 di ${row.name}`, `${row.name}’s d20`))}"${off}></label><button type="button" class="button quiet ct-start-roll-one" data-ct-start-roll-one="${id}"${off} aria-label="${ctx.esc(ctx.t(`Tira l’iniziativa di ${row.name}`, `Roll ${row.name}’s initiative`))}">${icon(ctx, "dice")}<span class="ct-start-roll-text">${ctx.t("Tira l’iniziativa", "Roll initiative")}</span></button><output class="ct-start-total" data-ct-start-total="${id}" aria-label="${ctx.esc(ctx.t("Totale", "Total"))}">${total ?? "—"}</output></span>${surpriseSwitch(ctx, row)}${share}${startRowStatus(ctx, row)}${why}</li>`;
    })
    .join("");
}
/**
 * TV-45/TV-46/PR-32 — the Table's initiative dialog (Foundry Combat Tracker, D&D Beyond
 * Maps): choose the tokens, «Tira tutti» / «Tira PNG» or type a physical d20, and
 * «Inizia combattimento». The order is sorted by total by itself; the missing rolls are
 * named; rolls are saved as soon as they are made. Called by the tracker and by the
 * shell's ctx.startEncounter. On the active scene it opens the players' roll call: they
 * roll their own creatures' initiative and this dialog re-sorts as their rolls arrive.
 */
export function openTableInitiative(ctx, sceneId = ctx.state.activeSceneId) {
  if (!runs(ctx)) return;
  const scene = ctx.state.scenes.find((s) => s.id === sceneId);
  if (!scene) return;
  const changing = ctx.state.activeSceneId !== sceneId;
  const inTurns = ctx.state.combat?.active && ctx.state.combat.turnMode;
  if (ctx.state.combat?.active && !inTurns) {
    ctx.toast(ctx.t("C’è già un combattimento in corso.", "A combat is already running."), true);
    return;
  }
  let rows = D.startCandidates(ctx.state, sceneId);
  const waitsForPlayers = rows.some(
    (r) => r.included && r.natural === null && D.rolledByPlayer(ctx.state, r.actorId),
  );
  // Offline (or refused) the dialog still opens: the DM rolls for everyone, as before.
  if (
    !changing &&
    !ctx.offline &&
    waitsForPlayers &&
    !D.rollCallOf(ctx.state) &&
    act(
      ctx,
      ctx.t(
        "Il DM avvia il combattimento: tirate l’iniziativa",
        "The DM is starting combat: roll initiative",
      ),
      (draft) => D.openRollCall(draft, sceneId, rows, ctx.role),
    )
  )
    rows = D.startCandidates(ctx.state, sceneId);
  const call = !changing && D.rollCallOf(ctx.state);
  ui.start = { sceneId, rows, root: null, paint: null };
  ctx.dialog(
    changing
      ? ctx.t("Attiva scena e avvia combattimento", "Activate scene and start combat")
      : ctx.t("Avvia combattimento", "Start combat"),
    `<div class="ct-start" data-ct-start-dialog><p class="ct-start-scene"><strong>${ctx.esc(scene.encounter?.name || scene.name)}</strong> · ${ctx.t("scegli chi combatte e tira l’iniziativa: l’ordine si ordina da solo per totale.", "choose who fights and roll initiative: the order sorts itself by total.")}</p>${call ? `<p class="ct-start-call" role="status">${ctx.t("I giocatori vedono «Tira l’iniziativa» sulle loro creature: i loro tiri compaiono qui.", "Players see “Roll initiative” on their creatures: their rolls appear here.")} <button type="button" class="text-button" data-ct-rollcall-close>${ctx.t("Annulla l’avvio", "Cancel the start")}</button></p>` : ""}<div class="toolbar ct-start-tools"><button type="button" class="button primary" data-ct-start-roll="all">${icon(ctx, "dice")} ${ctx.t("Tira tutti", "Roll all")}</button><button type="button" class="button" data-ct-start-roll="npc">${ctx.t("Tira PNG", "Roll NPCs")}</button><button type="button" class="button quiet" data-ct-start-select>${ctx.t("Seleziona tutti", "Select all")}</button></div><ol class="ct-start-list" data-ct-start-list aria-label="${ctx.esc(ctx.t("Partecipanti in ordine d’iniziativa", "Participants in initiative order"))}">${startRowsHTML(ctx, rows)}</ol><p class="ct-start-missing" data-ct-start-missing role="status"></p><p class="muted ct-start-note">${ctx.t("Il bonus viene dalla scheda (Iniziativa). A parità decide il DM: vale l’ordine della lista. L’avvio non è un riposo: punti ferita e slot restano come sono.", "The bonus comes from the sheet (Initiative). On a tie the DM decides: the list order stands. Starting is not a rest: hit points and slots stay as they are.")}${ctx.t(" «Sorpreso»: chi è colto alla sprovvista tira l’iniziativa con svantaggio (SRD 5.2.1 EN 189 / IT 216); con un dado fisico scrivi il più basso dei due d20.", " “Surprised”: a creature caught unaware rolls Initiative with Disadvantage (SRD 5.2.1 EN 189 / IT 216); with a physical die type the lower of the two d20s.")}${rows.some((r) => r.shareKey && rows.filter((o) => o.shareKey === r.shareKey).length > 1) ? ` ${ctx.t("Creature identiche: un solo tiro d’iniziativa per il gruppo (SRD 5.2.1 EN 13 / IT 14); senza la spunta «Un solo tiro per il gruppo» ciascuna tira il suo d20.", "Identical creatures: one Initiative roll for the group (SRD 5.2.1 EN 13 / IT 14); without the “One roll for the group” tick each rolls its own d20.")}` : ""} <button type="button" class="text-button" data-open-encounter>${ctx.t("Apri preparazione", "Open preparation")}</button></p></div>`,
    {
      submitLabel: changing
        ? ctx.t("Attiva e avvia", "Activate and start")
        : ctx.t("Inizia combattimento", "Start combat"),
      cancelLabel: ctx.t("Torna al Tavolo", "Back to table"),
      onSubmit: () => {
        // A refusal (missing rolls, named) stays in the dialog, next to the list.
        ctx.commit(ctx.t("Combattimento avviato", "Combat started"), (draft) =>
          D.startFromTable(draft, sceneId, rows, ctx.role),
        );
        ui.start = null;
        if (ctx.view?.page !== "table") ctx.navigate("table");
      },
    },
  );
  const root = globalThis.document?.querySelector?.("[data-ct-start-dialog]");
  if (root) bindTableInitiative(root, ctx, sceneId, rows);
}
/**
 * TV-46: called by the shell after every render. While the start dialog is open, rolls
 * recorded elsewhere (a player's own roll, saved in another tab) enter its rows and the
 * list re-sorts, without closing the dialog or losing what the DM typed.
 */
export function refreshTableInitiative(ctx) {
  const start = ui.start;
  if (!start?.root?.isConnected || !start.root.closest?.("dialog[open]")) return false;
  const changed = D.mergeSavedRolls(ctx.state, start.sceneId, start.rows);
  if (changed.length) start.paint?.();
  return changed.length > 0;
}
function closeStart(ctx) {
  const sceneId = ctx.state.activeSceneId;
  if (
    act(ctx, ctx.t("Avvio del combattimento annullato", "Combat start cancelled"), (draft) =>
      D.closeRollCall(draft, sceneId, ctx.role),
    )
  ) {
    if (ui.start) {
      ui.start = null;
      ctx.closeDialog();
    }
    return true;
  }
  return false;
}
function bindTableInitiative(root, ctx, sceneId, rows) {
  const list = root.querySelector("[data-ct-start-list]");
  const missing = root.querySelector("[data-ct-start-missing]");
  const selectAll = root.querySelector("[data-ct-start-select]");
  const rowOf = (id) => rows.find((r) => r.actorId === id);
  // TV-52: a shown row stands for its whole shared-roll group.
  const membersOf = (id) => {
    const row = rowOf(id);
    const key = D.sharedKey(row);
    return key ? rows.filter((r) => D.sharedKey(r) === key && r.included === row.included) : [row];
  };
  const status = () => {
    const names = D.missingStartRolls(rows).map((r) => r.name);
    missing.textContent = names.length
      ? ctx.t(`Mancano i tiri di: ${names.join(", ")}.`, `Missing rolls: ${names.join(", ")}.`)
      : rows.some((r) => r.included)
        ? ctx.t("Tutti pronti: premi «Inizia combattimento».", "All set: press “Start combat”.")
        : ctx.t("Scegli almeno un partecipante.", "Choose at least one participant.");
    const all = rows.every((r) => r.included);
    selectAll.textContent = all ? ctx.t("Nessuno", "None") : ctx.t("Seleziona tutti", "Select all");
  };
  const paint = (focusSelector = null) => {
    const keep = focusSelector ?? focusedStartControl(root);
    list.innerHTML = startRowsHTML(ctx, rows);
    bindRows();
    status();
    if (keep) list.querySelector(keep)?.focus?.();
  };
  if (ui.start?.rows === rows) Object.assign(ui.start, { root, paint: () => paint() });
  // The players' roll call follows who takes part (they see the rows they must roll).
  const shareRows = () =>
    D.rollCallOf(ctx.state) &&
    act(
      ctx,
      ctx.t("Partecipanti del combattimento aggiornati", "Combat participants updated"),
      (draft) => D.saveStartRows(draft, sceneId, rows, ctx.role),
      { visibility: "private" },
    );
  const roll = (which, focusSelector) => {
    const names = (Array.isArray(which) ? which : []).map((id) => rowOf(id)?.name).filter(Boolean);
    const done = act(
      ctx,
      ctx.t("Iniziativa tirata", "Initiative rolled") +
        (names.length ? ": " + names.join(", ") : ""),
      (draft) => D.rollStartRows(draft, sceneId, rows, which, ctx.role),
      { visibility: "private" },
    );
    if (done) paint(focusSelector);
  };
  function bindRows() {
    list.querySelectorAll("[data-ct-start-share]").forEach((box) =>
      box.addEventListener("change", () => {
        const key = box.dataset.ctStartShare;
        const done = act(
          ctx,
          box.checked
            ? ctx.t("Iniziativa: un solo tiro per il gruppo", "Initiative: one roll for the group")
            : ctx.t("Iniziativa: tiri separati", "Initiative: separate rolls"),
          (draft) => D.setShareInitiative(draft, key, box.checked, ctx.role),
        );
        if (!done) {
          box.checked = !box.checked;
          return;
        }
        D.applyShareChoice(rows, key, box.checked);
        shareRows();
        paint(`[data-ct-start-share="${key}"]`);
      }),
    );
    list.querySelectorAll("[data-ct-start-surprise]").forEach((box) =>
      box.addEventListener("change", () => {
        const ids = membersOf(box.dataset.ctStartSurprise).map((member) => member.actorId);
        D.markSurprised(rows, ids, box.checked);
        if (D.rollCallOf(ctx.state)) shareRows();
        else
          act(
            ctx,
            box.checked
              ? ctx.t("Iniziativa: sorpresa segnata", "Initiative: surprise marked")
              : ctx.t("Iniziativa: sorpresa tolta", "Initiative: surprise removed"),
            (draft) => D.saveStartRows(draft, sceneId, rows, ctx.role),
            { visibility: "private" },
          );
        paint(`[data-ct-start-surprise="${box.dataset.ctStartSurprise}"]`);
      }),
    );
    list.querySelectorAll("[data-ct-start-include]").forEach((box) =>
      box.addEventListener("change", () => {
        for (const member of membersOf(box.dataset.ctStartInclude)) member.included = box.checked;
        shareRows();
        paint(`[data-ct-start-include="${box.dataset.ctStartInclude}"]`);
      }),
    );
    list.querySelectorAll("[data-ct-start-natural]").forEach((input) => {
      const row = rowOf(input.dataset.ctStartNatural);
      const members = membersOf(input.dataset.ctStartNatural);
      input.addEventListener("input", () => {
        const value = Number(input.value);
        const valid = input.value !== "" && Number.isInteger(value) && value >= 1 && value <= 20;
        for (const member of members) {
          member.natural = valid ? value : null;
          if (valid) member.mode = "physical";
          delete member.rollId;
        }
        list.querySelector(`[data-ct-start-total="${input.dataset.ctStartNatural}"]`).textContent =
          valid ? String(value + row.bonus) : "—";
        status();
      });
      // The order re-sorts once the value is entered, not while it is being typed.
      input.addEventListener("change", () =>
        paint(`[data-ct-start-natural="${input.dataset.ctStartNatural}"]`),
      );
    });
    list.querySelectorAll("[data-ct-start-roll-one]").forEach((button) =>
      button.addEventListener("click", () =>
        roll(
          membersOf(button.dataset.ctStartRollOne).map((member) => member.actorId),
          `[data-ct-start-roll-one="${button.dataset.ctStartRollOne}"]`,
        ),
      ),
    );
  }
  root
    .querySelectorAll("[data-ct-start-roll]")
    .forEach((button) => button.addEventListener("click", () => roll(button.dataset.ctStartRoll)));
  selectAll.addEventListener("click", () => {
    const all = rows.every((r) => r.included);
    for (const row of rows) row.included = !all;
    shareRows();
    paint();
  });
  root.querySelector("[data-ct-rollcall-close]")?.addEventListener("click", () => closeStart(ctx));
  root.querySelector("[data-open-encounter]")?.addEventListener("click", () => {
    ctx.closeDialog();
    ctx.navigate("preparation", { id: sceneId });
  });
  bindRows();
  status();
}
// The row control that has the focus, so a re-sort from elsewhere keeps it.
function focusedStartControl(root) {
  const active = globalThis.document?.activeElement;
  if (!active || !root.contains(active)) return null;
  for (const key of ["ctStartNatural", "ctStartRollOne", "ctStartInclude"]) {
    const value = active.dataset?.[key];
    if (value) {
      const attr = key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
      return `[data-${attr}="${value}"]`;
    }
  }
  return null;
}

// ---------------------------------------------------------------- players' own initiative (C8)

/**
 * C8 (TV-46, DDB sheet roll): rolls the initiative of a creature the viewer controls while
 * it awaits one (awaitsInitiative), digital or physical; a physical roll without a face
 * asks for it. Returns the result, or null (refused or asked).
 */
export function rollOwnInitiative(ctx, actorId, { mode = "digital", natural, advantage } = {}) {
  if (mode === "physical" && !Number.isInteger(natural)) {
    openOwnPhysical(ctx, actorId);
    return null;
  }
  const name = nameOf(ctx, actorId);
  let result = null;
  const runner = runs(ctx);
  const done = act(
    ctx,
    runner
      ? ctx.t("Iniziativa tirata: ", "Initiative rolled: ") + name
      : ctx.t(`${name} tira l’iniziativa`, `${name} rolls initiative`),
    (draft, slice) => {
      result = D.rollOwn(draft, slice, actorId, { mode, natural, advantage }, ctx.role);
    },
    runner || D.hiddenFromPlayers(ctx.state, actorId) ? { visibility: "private" } : {},
  );
  if (!done || !result) return null;
  const faces = result.faces?.length > 1 ? ` (${result.faces.join(", ")})` : "";
  ctx.toast(
    `${name}: ${result.natural}${faces} ${result.bonus < 0 ? "−" : "+"} ${Math.abs(result.bonus)} = ${result.total}` +
      (result.joined
        ? ctx.t(" · entra nell’ordine dei turni", " · joins the turn order")
        : ctx.t(" · l’ordine si aggiorna", " · the order updates")),
  );
  return result;
}
function openOwnPhysical(ctx, actorId) {
  const name = nameOf(ctx, actorId);
  ctx.dialog(
    ctx.t(`Iniziativa con il dado fisico: ${name}`, `Initiative with a physical die: ${name}`),
    `<p class="muted">${ctx.t(`Tira il tuo d20 e scrivi il numero uscito. Il bonus (${signedBonus(D.initiativeBonus(ctx.state, actorId))}) viene dalla scheda.`, `Roll your d20 and type the number rolled. The bonus (${signedBonus(D.initiativeBonus(ctx.state, actorId))}) comes from the sheet.`)}</p><label class="field">${ctx.t("d20 fisico", "Physical d20")}<input name="natural" type="number" min="1" max="20" required inputmode="numeric" autofocus></label>`,
    {
      submitLabel: ctx.t("Registra", "Record"),
      onSubmit: (form) =>
        rollOwnInitiative(ctx, actorId, {
          mode: "physical",
          natural: Number(form.get("natural")),
        })
          ? undefined
          : false,
    },
  );
}

// ---------------------------------------------------------------- dialogs

function openInitiative(ctx, actorId) {
  const bonus = D.initiativeBonus(ctx.state, actorId);
  ctx.dialog(
    ctx.t("Correggi iniziativa", "Correct initiative") + ": " + nameOf(ctx, actorId),
    `<p class="muted">${ctx.t("Il tiro precedente resta nel registro dell’iniziativa. L’ordine si riordina e il turno in corso non cambia.", "The previous roll stays in the initiative history. The order re-sorts and the current turn does not change.")}</p><div class="form-grid"><label class="field">${ctx.t("d20 fisico", "Physical d20")}<input name="natural" type="number" min="1" max="20" required inputmode="numeric"></label><label class="field">${ctx.t("Bonus", "Bonus")}<input name="bonus" type="number" min="-100" max="100" value="${bonus}"></label></div><label class="field">${ctx.t("Motivo", "Reason")}<input name="reason" maxlength="200" required></label>`,
    {
      submitLabel: ctx.t("Registra la correzione", "Record the correction"),
      onSubmit: (form) =>
        act(
          ctx,
          ctx.t("Iniziativa corretta: ", "Initiative corrected: ") + nameOf(ctx, actorId),
          (s, slice) =>
            D.correctInitiative(
              s,
              slice,
              actorId,
              {
                natural: Number(form.get("natural")),
                bonus: Number(form.get("bonus")),
                reason: form.get("reason"),
              },
              ctx.role,
            ),
          { visibility: "private" },
        ),
    },
  );
}
function openMonster(ctx, actorId) {
  const slice = D.sliceOf(ctx.state);
  const current = slice.monsters[actorId];
  const fromBlock = D.blockRecharges(ctx.state, actorId);
  const rows = [...(current?.recharge ?? fromBlock.filter((b) => !current)), {}, {}].slice(0, 3);
  const block = getById(ctx.state.actors[actorId]?.compendiumRef?.id ?? "");
  // TV-54 (dnd5e): uses written in the linked block are prefilled; the DM confirms them.
  const legendary = D.blockLegendary(ctx.state, actorId);
  ctx.dialog(
    ctx.t("Leggendarie e ricarica", "Legendary and recharge") + ": " + nameOf(ctx, actorId),
    `${legendary && !current ? `<p class="effect-note" data-ct-prefilled>${ctx.t("Valori letti dal blocco statistiche: controllali e salva.", "Values read from the stat block: check them and save.")}</p>` : ""}<p class="muted">${block ? ctx.t("Blocco collegato", "Linked block") + ": " + ctx.esc(ctx.label(block.name)) + ". " : ""}${ctx.t("Valori scritti dal DM per questa creatura: se il blocco SRD non li prevede sono una sua scelta, registrata come tale. Regole d’uso", "Values written by the DM for this creature: when the SRD block has none they are the DM’s choice, recorded as such. Rules of use")}: ${D.pagesText(D.SOURCES.legendaryActions, ctx.lang)}.</p><div class="form-grid"><label class="field">${ctx.t("Azioni leggendarie (usi)", "Legendary actions (uses)")}<input name="legendary" type="number" min="0" max="5" value="${current ? (current.legendary?.max ?? 0) : (legendary?.legendary ?? 0)}"></label><label class="field">${ctx.t("Resistenza leggendaria (al giorno)", "Legendary resistance (per day)")}<input name="resistance" type="number" min="0" max="5" value="${current ? (current.resistance?.max ?? 0) : (legendary?.resistance ?? 0)}"></label></div><fieldset class="ct-fieldset"><legend>${ctx.t("Abilità con ricarica (1d6 a inizio turno)", "Recharge abilities (1d6 at turn start)")}</legend>${rows
      .map(
        (r, i) =>
          `<div class="form-grid"><label class="field">${ctx.t("Nome", "Name")} ${i + 1}<input name="rname-${i}" maxlength="60" value="${ctx.esc(r.name ? ctx.label(r.name) : "")}"></label><label class="field">${ctx.t("Si ricarica con", "Recharges on")}<select name="rmin-${i}">${[6, 5, 4, 3, 2].map((n) => `<option value="${n}"${(r.min ?? 5) === n ? " selected" : ""}>${n === 6 ? "6" : n + "–6"}</option>`).join("")}</select></label><input type="hidden" name="rid-${i}" value="${ctx.esc(r.id ?? "")}"><input type="hidden" name="rblock-${i}" value="${r.fromBlock ? "1" : ""}"></div>`,
      )
      .join(
        "",
      )}</fieldset><fieldset class="ct-fieldset"><legend>${ctx.t("Dado della ricarica", "Recharge die")}</legend><label class="ct-check"><input type="radio" name="diceMode" value="digital" ${current?.diceMode !== "physical" ? "checked" : ""}> ${ctx.t("Digitale", "Digital")}</label><label class="ct-check"><input type="radio" name="diceMode" value="physical" ${current?.diceMode === "physical" ? "checked" : ""}> ${ctx.t("Fisico: il DM inserisce la faccia", "Physical: the DM enters the face")}</label></fieldset>`,
    {
      submitLabel: ctx.t("Salva", "Save"),
      onSubmit: (form) => {
        const recharge = [0, 1, 2]
          .map((i) => ({
            id: form.get(`rid-${i}`) || undefined,
            name: String(form.get(`rname-${i}`) ?? "").trim(),
            min: Number(form.get(`rmin-${i}`)),
            fromBlock: form.get(`rblock-${i}`) === "1",
          }))
          .filter((r) => r.name);
        return act(
          ctx,
          ctx.t("Leggendarie e ricarica: ", "Legendary and recharge: ") + nameOf(ctx, actorId),
          (s, sl) =>
            D.configureMonster(
              s,
              sl,
              actorId,
              {
                legendary: Number(form.get("legendary")),
                resistance: Number(form.get("resistance")),
                recharge,
                diceMode: form.get("diceMode"),
              },
              ctx.role,
            ),
          { visibility: "private" },
        )
          ? undefined
          : false;
      },
    },
  );
}
function openDelete(ctx, actorId) {
  ctx.dialog(
    ctx.t("Elimina la pedina", "Delete the token"),
    `<p>${ctx.t(`La pedina di ${ctx.esc(nameOf(ctx, actorId))} lascia la mappa e l’ordine dei turni. La scheda della creatura resta e puoi rimetterla in scena dalla Preparazione.`, `${ctx.esc(nameOf(ctx, actorId))}’s token leaves the map and the turn order. The creature’s sheet stays and you can put it back on the scene from Preparation.`)}</p><p class="muted">${ctx.t("Per tenerla sulla mappa usa invece «Togli dal combattimento».", "To keep it on the map use “Remove from combat” instead.")}</p>`,
    {
      submitLabel: ctx.t("Elimina la pedina", "Delete the token"),
      onSubmit: () =>
        act(
          ctx,
          ctx.t("Pedina eliminata: ", "Token deleted: ") + nameOf(ctx, actorId),
          (s, slice) => D.deleteToken(s, slice, actorId, ctx.role, tokenMenu(s)),
          privateFor(ctx.state, [actorId]),
        ),
    },
  );
}
function openEntry(ctx, entryId = null) {
  const slice = D.sliceOf(ctx.state);
  const entry = slice.entries.find((e) => e.id === entryId) ?? null;
  ctx.dialog(
    entry
      ? ctx.t("Modifica la voce", "Edit the entry")
      : ctx.t("Voce del tracker", "Tracker entry"),
    `<p class="muted">${ctx.t("Come le voci personalizzate di Roll20 e D&D Beyond: eventi dell’ambiente, azioni di tana, conti alla rovescia. Compaiono nell’ordine al loro conteggio d’iniziativa (a parità dopo le creature).", "Like Roll20 and D&D Beyond custom items: environment events, lair actions, countdowns. They appear in the order at their initiative count (after creatures on a tie).")}</p><label class="field">${ctx.t("Nome", "Name")}<input name="name" maxlength="80" required value="${ctx.esc(entry?.name ?? "")}" placeholder="${ctx.t("Il soffitto crolla", "The ceiling collapses")}"></label><div class="form-grid"><label class="field">${ctx.t("Conteggio d’iniziativa", "Initiative count")}<input name="init" type="number" min="-10" max="40" value="${entry?.init ?? 20}"></label><label class="field">${ctx.t("Tipo", "Kind")}<select name="kind"><option value="countdown"${entry?.kind !== "reminder" ? " selected" : ""}>${ctx.t("Conto alla rovescia", "Countdown")}</option><option value="reminder"${entry?.kind === "reminder" ? " selected" : ""}>${ctx.t("Promemoria a ogni round", "Reminder every round")}</option></select></label><label class="field">${ctx.t("Fra quanti round", "In how many rounds")}<input name="rounds" type="number" min="1" max="99" value="${entry?.rounds ?? 3}"></label></div><label class="field">${ctx.t("Chi la vede", "Who sees it")}<select name="visibility"><option value="dm"${entry?.visibility !== "all" ? " selected" : ""}>${ctx.t("Solo il DM", "DM only")}</option><option value="all"${entry?.visibility === "all" ? " selected" : ""}>${ctx.t("Tutto il tavolo", "The whole table")}</option></select></label><label class="field">${ctx.t("Nota (facoltativa)", "Note (optional)")}<input name="note" maxlength="200" value="${ctx.esc(entry?.note ?? "")}"></label>`,
    {
      submitLabel: ctx.t("Salva la voce", "Save the entry"),
      onSubmit: (form) => {
        const input = {
          id: entry?.id,
          name: form.get("name"),
          init: Number(form.get("init")),
          kind: form.get("kind"),
          rounds: Number(form.get("rounds")),
          visibility: form.get("visibility"),
          note: form.get("note"),
        };
        return act(
          ctx,
          ctx.t("Voce del tracker: ", "Tracker entry: ") + String(input.name).trim(),
          (s, slice) => D.saveEntry(s, slice, input, ctx.role),
          input.visibility === "all" ? {} : { visibility: "private" },
        )
          ? undefined
          : false;
      },
    },
  );
}
function openReady(ctx, actorId) {
  const { actions, blocked } = D.readyOptions(ctx.state, actorId);
  // TV-82 (Solasta II): the slot levels any readiable spell can use.
  const slotLevels = [
    ...new Map(actions.flatMap((a) => a.slotLevels ?? []).map((s) => [s.level, s])).values(),
  ].sort((a, b) => a.level - b.level);
  ctx.dialog(
    ctx.t("Prepara un’azione", "Ready an action") + ": " + nameOf(ctx, actorId),
    `<p class="muted">${ctx.t("Usa la tua azione ora: quando l’innesco avviene, prima dell’inizio del tuo prossimo turno, reagisci con la Reazione oppure ignori l’innesco.", "Use your action now: when the trigger happens, before the start of your next turn, respond with your Reaction or ignore the trigger.")} ${D.pagesText(D.SOURCES.ready, ctx.lang)}.</p><label class="field">${ctx.t("Cosa farai", "What you will do")}<select name="response">${actions.map((a) => `<option value="${ctx.esc(a.id)}">${ctx.esc(ctx.label(a.name))}${a.slotLevels ? " · " + ctx.t("incantesimo con slot", "spell with a slot") : a.spell ? " · " + ctx.t("trucchetto", "cantrip") : ""}</option>`).join("")}<option value="move">${ctx.t("Muoverti fino alla tua Velocità", "Move up to your Speed")}</option>${blocked.map((a) => `<option disabled>${ctx.esc(ctx.label(a.name))} · ${ctx.t("ad area: si mira quando lo lanci", "area: aimed when you cast it")}</option>`).join("")}</select></label>${slotLevels.length ? `<label class="field">${ctx.t("Slot per un incantesimo preparato", "Slot for a readied spell")}<select name="slotLevel">${slotLevels.map((s) => `<option value="${s.level}">${ctx.t("Livello", "Level")} ${s.level}${Number.isInteger(s.remaining) ? ` · ${s.remaining}/${s.max} ${ctx.t("disponibili", "available")}` : ""}</option>`).join("")}</select></label><p class="muted ct-ready-slot">${ctx.t("Un incantesimo con slot si lancia ora (lo slot si spende subito) e resta trattenuto con la Concentrazione fino all’innesco; se la Concentrazione si interrompe, l’incantesimo è perso.", "A spell with a slot is cast now (the slot is spent at once) and held with Concentration until the trigger; if Concentration breaks, the spell is lost.")}</p>` : ""}<fieldset class="ct-fieldset"><legend>${ctx.t("Innesco (una circostanza percepibile)", "Trigger (a perceivable circumstance)")}</legend>${D.READY_TRIGGERS.map(([id, label], i) => `<label class="ct-check"><input type="radio" name="trigger" value="${id}" ${i === 0 ? "checked" : ""}> ${ctx.esc(ctx.label(label))}</label>`).join("")}<label class="field">${ctx.t("Descrivi l’innesco", "Describe the trigger")}<input name="text" maxlength="160" placeholder="${ctx.t("Se il goblin apre la porta…", "If the goblin opens the door…")}"></label></fieldset>`,
    {
      submitLabel: ctx.t("Prepara", "Ready"),
      onSubmit: (form) =>
        act(
          ctx,
          ctx.t("Azione preparata: ", "Action readied: ") + nameOf(ctx, actorId),
          (s, slice) =>
            D.readyAction(
              s,
              slice,
              actorId,
              {
                response: form.get("response"),
                trigger: form.get("trigger"),
                text: form.get("text"),
                ...(form.get("slotLevel") ? { slotLevel: Number(form.get("slotLevel")) } : {}),
              },
              ctx.role,
            ),
        )
          ? undefined
          : false,
    },
  );
}
function openReadyFire(ctx, actorId) {
  const slice = D.sliceOf(ctx.state);
  const readied = slice.readied[actorId];
  if (!readied) return;
  const targets = ctx.state.combat.order.filter(
    (id) => id !== actorId && D.viewerSees(ctx.state, id, ctx.role),
  );
  const attack = readied.response.kind === "action";
  ctx.dialog(
    ctx.t("Innesco avvenuto", "Trigger happened") + ": " + nameOf(ctx, actorId),
    `<p>${ctx.t("Usi la Reazione subito dopo l’innesco.", "You use your Reaction right after the trigger.")} ${attack ? ctx.esc(ctx.label(readied.response.name)) : ctx.t("Puoi muoverti fino alla tua Velocità.", "You can move up to your Speed.")}</p>${attack ? `<label class="field">${ctx.t("Bersaglio", "Target")}<select name="target">${targets.map((id) => `<option value="${ctx.esc(id)}">${ctx.esc(nameOf(ctx, id))}</option>`).join("")}</select></label><fieldset class="ct-fieldset"><legend>${ctx.t("Dadi", "Dice")}</legend><label class="ct-check"><input type="radio" name="mode" value="digital" checked> ${ctx.t("Digitali", "Digital")}</label><label class="ct-check"><input type="radio" name="mode" value="physical"> ${ctx.t("Fisici: inserisco le facce in «Tiri e risultati»", "Physical: I enter the faces in “Rolls and results”")}</label></fieldset>` : ""}`,
    {
      submitLabel: ctx.t("Usa la Reazione", "Use the Reaction"),
      onSubmit: (form) => {
        let attemptId = null;
        const ok = act(
          ctx,
          ctx.t("Azione preparata eseguita: ", "Readied action taken: ") + nameOf(ctx, actorId),
          (s, sl) => {
            attemptId = D.resolveReady(
              s,
              sl,
              actorId,
              {
                decision: "use",
                targetId: form.get("target"),
                mode: form.get("mode"),
                applyMode: applyModeOf(ctx),
              },
              ctx.role,
            ).attemptId;
          },
        );
        if (!ok) return false;
        afterAttempts(ctx, attemptId);
      },
    },
  );
}
// A digital attempt is two commits, as in combat-ui (attempt, then its dice): Undo withdraws
// only the dice, and the results open in the common "Rolls and results".
function afterAttempts(ctx, attemptId = "") {
  if (hasAutomaticRolls(ctx.state))
    act(ctx, ctx.t("Dadi digitali tirati", "Digital dice rolled"), (s) =>
      resolveAutomaticRolls(s, rollDie),
    );
  if (attemptId !== null) queueMicrotask(() => openCombatRequests(ctx, attemptId ?? ""));
}
export function openMobAttack(ctx, table = null) {
  const slice = D.sliceOf(ctx.state);
  const { attackers, targets } = D.mobCandidates(ctx.state, slice, ctx.role);
  if (!attackers.length) {
    ctx.toast(ctx.t("Nessuna creatura del DM agisce ora.", "No DM creature is acting now."), true);
    return;
  }
  const selected = table?.selectedActorId;
  const preferred = targets.includes(selected)
    ? selected
    : (targets.find((id) => ctx.state.actors[id]?.kind === "character") ?? targets[0]);
  const group = slice.combat.groupTurn?.leaderId === D.currentId(ctx.state);
  // TV-59: the identical creatures that would join with the group-turn house rule.
  const acting = D.currentId(ctx.state);
  const base = D.baseName(nameOf(ctx, acting)).toLocaleLowerCase();
  const waiting = group
    ? []
    : ctx.state.combat.order
        .filter(
          (id) =>
            id !== acting &&
            ctx.state.actors[id]?.kind === "npc" &&
            !D.isDefeated(ctx.state, slice, id) &&
            D.baseName(nameOf(ctx, id)).toLocaleLowerCase() === base,
        )
        .map((id) => nameOf(ctx, id));
  ctx.dialog(
    ctx.t("Attacco di gruppo", "Mob attack"),
    `${group ? `<p class="muted">${ctx.t("Turno di gruppo (regola della casa): ogni creatura usa la propria azione, un tiro ciascuna.", "Group turn (house rule): each creature uses its own action, one roll each.")}</p>` : `<div class="ct-mob-rule" role="note"><p>${ctx.t(`Ora agisce solo ${nameOf(ctx, acting)}: nelle regole 2024 ogni creatura attacca nel proprio turno.`, `Only ${nameOf(ctx, acting)} acts now: in the 2024 rules each creature attacks on its own turn.`)} ${waiting.length ? ctx.t(`Per far attaccare insieme anche ${waiting.join(", ")} serve la regola della casa «turno di gruppo» (come Mob Attack Tool).`, `To have ${waiting.join(", ")} attack together too, turn on the “group turn” house rule (like Mob Attack Tool).`) : ""}</p>${waiting.length ? `<button type="button" class="button" data-ct-mob-rule>${icon(ctx, "settings")} ${ctx.t("Attiva il turno di gruppo…", "Turn on the group turn…")}</button>` : ""}</div>`}<fieldset class="ct-fieldset"><legend>${ctx.t("Attaccanti", "Attackers")}</legend>${attackers.map((a) => `<label class="ct-check"><input type="checkbox" name="attacker" value="${ctx.esc(a.actorId)}" ${a.reason ? `disabled aria-describedby="ct-mob-why-${ctx.esc(a.actorId)}"` : "checked"}> ${ctx.esc(a.name)}${a.actionName ? " · " + ctx.esc(ctx.label(a.actionName)) : ""}${a.reason ? ` · <small class="muted" id="ct-mob-why-${ctx.esc(a.actorId)}">${ctx.esc(ctx.label(a.reason))}${a.actionId ? "" : " " + ctx.esc(ctx.t("Aggiungilo dal pannello Creatura: «Incolla riga del blocco».", "Add one from the Creature panel: “Paste a stat block line”."))}</small>` : ""}</label>`).join("")}</fieldset><label class="field">${ctx.t("Bersaglio", "Target")}<select name="target">${targets.map((id) => `<option value="${ctx.esc(id)}"${id === preferred ? " selected" : ""}>${ctx.esc(nameOf(ctx, id))}</option>`).join("")}</select></label><fieldset class="ct-fieldset"><legend>${ctx.t("Dadi", "Dice")}</legend><label class="ct-check"><input type="radio" name="mode" value="digital" checked> ${ctx.t("Digitali: risultati subito, uno per attaccante", "Digital: results at once, one per attacker")}</label><label class="ct-check"><input type="radio" name="mode" value="physical"> ${ctx.t("Fisici: inserisci le facce di ciascuno in «Tiri e risultati»", "Physical: enter each one’s faces in “Rolls and results”")}</label></fieldset>`,
    {
      submitLabel: ctx.t("Attacca", "Attack"),
      onSubmit: (form) => {
        const attackerIds = form.getAll("attacker");
        const targetId = form.get("target");
        const ok = act(
          ctx,
          ctx.t("Attacco di gruppo: ", "Mob attack: ") +
            attackerIds.map((id) => nameOf(ctx, id)).join(", ") +
            " → " +
            nameOf(ctx, targetId),
          (s, sl) =>
            D.beginMobAttack(
              s,
              sl,
              { attackerIds, targetId, mode: form.get("mode"), applyMode: applyModeOf(ctx) },
              ctx.role,
            ),
          // A hidden attacker's name stays out of the players' log.
          privateFor(ctx.state, attackerIds),
        );
        if (!ok) return false;
        afterAttempts(ctx, "");
      },
    },
  );
  globalThis.document?.querySelector?.("[data-ct-mob-rule]")?.addEventListener("click", () => {
    ctx.closeDialog();
    openSettings(ctx);
  });
}
function openRecharge(ctx, actorId, abilityId) {
  const ability = D.sliceOf(ctx.state).monsters[actorId]?.recharge?.find((r) => r.id === abilityId);
  if (!ability) return;
  const physical = D.sliceOf(ctx.state).monsters[actorId].diceMode === "physical";
  ctx.dialog(
    ctx.t("Tira la ricarica", "Roll the recharge") + ": " + ctx.label(ability.name),
    `<p>${ctx.esc(nameOf(ctx, actorId))} · ${ctx.t("Ricarica", "Recharge")} ${ability.min}–${ability.max}: ${ctx.t("con un risultato nell’intervallo l’abilità torna disponibile.", "a result in the range makes the ability available again.")} ${D.pagesText(D.SOURCES.recharge, ctx.lang)}.</p><fieldset class="ct-fieldset"><legend>${ctx.t("Dado", "Die")}</legend><label class="ct-check"><input type="radio" name="mode" value="digital" ${physical ? "" : "checked"}> ${ctx.t("d6 digitale", "Digital d6")}</label><label class="ct-check"><input type="radio" name="mode" value="physical" ${physical ? "checked" : ""}> ${ctx.t("d6 fisico", "Physical d6")}</label></fieldset><label class="field">${ctx.t("Faccia del d6 fisico", "Physical d6 face")}<input name="face" type="number" min="1" max="6" inputmode="numeric"></label>`,
    {
      submitLabel: ctx.t("Registra il tiro", "Record the roll"),
      onSubmit: (form) => {
        let roll = null;
        const ok = act(
          ctx,
          ctx.t("Ricarica tirata: ", "Recharge rolled: ") + nameOf(ctx, actorId),
          (s, sl) => {
            roll = D.rollRecharge(
              s,
              sl,
              actorId,
              abilityId,
              { mode: form.get("mode"), face: Number(form.get("face")) },
              ctx.role,
            );
          },
          { visibility: "private" },
        );
        if (!ok) return false;
        ctx.toast(
          `d6 = ${roll.face} · ${roll.success ? ctx.t("ricaricata", "recharged") : ctx.t("non ricaricata", "not recharged")}`,
        );
      },
    },
  );
}
function openSettings(ctx) {
  const slice = D.sliceOf(ctx.state);
  const s = slice.settings;
  const rows = [
    ["skipDefeated", ctx.t("Salta le creature sconfitte", "Skip defeated creatures")],
    ["skipHidden", ctx.t("Salta le creature nascoste", "Skip hidden creatures")],
    [
      "revealAtFirstTurn",
      ctx.t(
        "Rivela i nemici nascosti al loro primo turno",
        "Reveal hidden enemies at their first turn",
      ),
    ],
    [
      "stopAtRoundStart",
      ctx.t(
        "Fermati all’inizio di ogni round (il DM lo avvia)",
        "Stop at the start of each round (the DM starts it)",
      ),
    ],
    [
      "turnAlerts",
      ctx.t(
        "Avvisa i giocatori: «tocca a te» e «sei il prossimo»",
        "Alert players: “your turn” and “you’re next”",
      ),
    ],
    ["timer", ctx.t("Timer del turno", "Turn timer")],
    [
      "autoRecharge",
      ctx.t(
        "Tira la ricarica a inizio turno con il dado digitale",
        "Roll recharge at turn start with the digital die",
      ),
    ],
  ];
  const rule = s.groupTurns;
  ctx.dialog(
    ctx.t("Impostazioni del tracker", "Tracker settings"),
    `<fieldset class="ct-fieldset"><legend>${ctx.t("Automatismi del turno", "Turn automation")}</legend>${rows.map(([key, label]) => `<label class="ct-check"><input type="checkbox" name="${key}" ${s[key] ? "checked" : ""}> ${label}</label>`).join("")}</fieldset><fieldset class="ct-fieldset"><legend>${ctx.t("Iniziativa e turni", "Initiative and turns")}</legend><p class="muted">${ctx.t("Base 2024: un solo tiro d’iniziativa per un gruppo di creature identiche, ma ciascuna ha il suo turno; il DM decide i pareggi.", "2024 baseline: one Initiative roll for a group of identical creatures, but each takes its own turn; the DM decides ties.")} ${D.pagesText(D.SOURCES.initiative, ctx.lang)}.</p><label class="ct-check"><input type="checkbox" name="groupTurns" ${rule ? "checked" : ""}> ${ctx.esc(ctx.label(D.GROUP_RULE_TITLE))} · <strong>${ctx.t("regola della casa", "house rule")}</strong></label>${rule ? `<p class="ct-rule-source">${ctx.t("Attiva dal", "On since")} ${new Date(rule.at).toLocaleString(ctx.lang === "it" ? "it-IT" : "en-GB")} · ${ctx.esc(rule.text)}${rule.houseRuleId ? " · " + ctx.t("registrata nelle regole della casa della campagna", "recorded in the campaign’s house rules") : ""}</p><label class="field">${ctx.t("Motivo per disattivarla", "Reason to turn it off")}<input name="reason" maxlength="300"></label>` : `<label class="field">${ctx.t("Testo della regola della casa", "House rule text")}<textarea name="ruleText" maxlength="600" rows="3">${ctx.esc(ctx.label(D.GROUP_RULE_TEXT))}</textarea></label>`}</fieldset>`,
    {
      submitLabel: ctx.t("Salva", "Save"),
      onSubmit: (form) => {
        const groupOn = form.get("groupTurns") === "on";
        const houseRules = (draft) =>
          draft.ext?.["campaign-settings"] && draft.campaign?.id
            ? {
                add: (st, input) =>
                  addHouseRule(st, st.ext["campaign-settings"], st.campaign.id, input, ctx.role),
                retire: (st, id, reason) =>
                  retireHouseRule(
                    st,
                    st.ext["campaign-settings"],
                    st.campaign.id,
                    id,
                    reason,
                    ctx.role,
                  ),
                source: (id) => {
                  const r = draft.ext["campaign-settings"].campaigns?.[
                    draft.campaign.id
                  ]?.houseRules?.find((h) => h.id === id);
                  return r ? houseRuleSource(r) : null;
                },
              }
            : null;
        return act(ctx, ctx.t("Impostazioni del tracker", "Tracker settings"), (draft, sl) => {
          for (const [key] of rows) D.setSetting(draft, sl, key, form.get(key) === "on", ctx.role);
          if (groupOn && !sl.settings.groupTurns)
            D.setGroupTurns(
              draft,
              sl,
              true,
              { title: ctx.label(D.GROUP_RULE_TITLE), text: form.get("ruleText") },
              ctx.role,
              houseRules(draft),
            );
          else if (!groupOn && sl.settings.groupTurns)
            D.setGroupTurns(
              draft,
              sl,
              false,
              { reason: form.get("reason") },
              ctx.role,
              houseRules(draft),
            );
        })
          ? undefined
          : false;
      },
    },
  );
}
function openFinish(ctx) {
  const slice = D.sliceOf(ctx.state);
  const loot = ctx.state.ext?.loot ?? null;
  const party = partyMembers(ctx.state);
  const summary = D.encounterSummary(ctx.state, slice, { lootSlice: loot, party });
  const xpLine = summary.defeated.length
    ? `<ul>${summary.defeated.map((d) => `<li>${ctx.esc(d.name)} · ${d.xp === null ? ctx.t("PE sconosciuti: nessun blocco collegato", "XP unknown: no linked block") : `${d.xp} ${ctx.t("PE", "XP")}${d.cr ? ` (${ctx.t("GS", "CR")} ${d.cr})` : ""}`}</li>`).join("")}</ul>`
    : `<p class="muted">${ctx.t("Nessuna creatura sconfitta.", "No defeated creature.")}</p>`;
  ctx.dialog(
    ctx.t("Concludi incontro", "Finish encounter"),
    `<p>${ctx.t("Round giocati", "Rounds played")}: <strong>${summary.rounds}</strong>. ${ctx.t("Posizioni, punti ferita, risorse ed effetti pertinenti restano.", "Positions, hit points, resources and relevant effects stay.")}</p><h3>${ctx.t("Sconfitti e PE", "Defeated and XP")}</h3>${xpLine}<p>${ctx.t("Totale", "Total")}: <strong data-ct-xp-total>${summary.xpTotal}</strong> ${ctx.t("PE", "XP")} · ${ctx.t("i PE li assegna il DM", "XP is awarded by the DM")} (${D.pagesText(D.SOURCES.xp, ctx.lang)})</p>${summary.xpTotal > 0 && loot ? `<fieldset class="ct-fieldset"><legend><label class="ct-check"><input type="checkbox" name="awardXp" checked> ${ctx.t("Assegna i PE divisi tra", "Award the XP divided among")}</label></legend>${party.map((a) => `<label class="ct-check"><input type="checkbox" name="recipient" value="${ctx.esc(a.id)}" ${summary.party.includes(a.id) ? "checked" : ""}> ${ctx.esc(a.name)}</label>`).join("")}</fieldset>` : ""}${loot ? `<label class="ct-check"><input type="checkbox" name="prepareLoot" ${summary.defeated.length ? "checked" : ""}> ${ctx.t("Prepara il bottino dei vinti (pacchetti nascosti nel pannello Bottino, con l’equipaggiamento del blocco)", "Prepare the defeated creatures’ loot (hidden parcels in the Loot panel, with the block’s gear)")}</label>` : ""}${summary.parcels.length ? `<p class="muted">${summary.parcels.length} ${ctx.t("pacchetti già pronti per questi sconfitti.", "parcels already prepared for these creatures.")}</p>` : ""}<label class="ct-check"><input type="checkbox" name="removeDefeated"> ${ctx.t("Togli dalla scena le pedine dei vinti (le schede restano)", "Remove the defeated creatures’ tokens from the scene (sheets stay)")}</label><label class="field">${ctx.t("Nota per il registro (facoltativa)", "Note for the log (optional)")}<input name="reason" maxlength="200"></label>`,
    {
      submitLabel: ctx.t("Concludi incontro", "Finish encounter"),
      onSubmit: (form) => {
        const input = {
          awardXp: form.get("awardXp") === "on",
          recipients: form.getAll("recipient"),
          prepareLoot: form.get("prepareLoot") === "on",
          removeDefeated: form.get("removeDefeated") === "on",
          reason: form.get("reason") || ctx.t("Incontro concluso", "Encounter finished"),
        };
        let record = null;
        const ok = act(
          ctx,
          ctx.t("Incontro concluso", "Encounter finished") +
            ` · ${summary.rounds} round · ${summary.defeated.length} ${ctx.t("sconfitti", "defeated")}` +
            (input.awardXp && summary.xpTotal ? ` · ${summary.xpTotal} ${ctx.t("PE", "XP")}` : ""),
          (s, sl) => {
            record = D.finishEncounter(s, sl, input, ctx.role, {
              lootSlice: s.ext?.loot,
              party: partyMembers(s),
              award: (st, { xp, recipients, reason }) =>
                awardParty(st, st.ext.loot, ctx.role, { xp, mode: "split", recipients, reason }),
              loot: (st, actorId) => {
                if (parcelOnCreature(st.ext.loot, actorId, st.activeSceneId)) return null;
                const actor = st.actors[actorId];
                const creatureId = actor?.compendiumRef?.id ?? actor?.encounterBlock?.creatureId;
                const parcel = startCreatureLoot(st, st.ext.loot, ctx.role, {
                  actorId,
                  sceneId: st.activeSceneId,
                  label: ctx.t("Bottino", "Loot"),
                });
                if (creatureId && getById(creatureId)?.gear?.length)
                  for (const item of cleanGearFromStatBlock(creatureId))
                    addParcelItem(st, st.ext.loot, ctx.role, parcel.id, item);
                return parcel;
              },
            });
          },
        );
        if (!ok) return false;
        ctx.toast(
          ctx.t("Incontro concluso", "Encounter finished") +
            (record.xpAwarded
              ? ` · ${record.xpAwarded} ${ctx.t("PE assegnati", "XP awarded")}`
              : "") +
            (record.parcels.length
              ? ` · ${record.parcels.length} ${ctx.t("pacchetti di bottino", "loot parcels")}`
              : ""),
        );
      },
    },
  );
}
function confirmDialog(ctx, title, body, submitLabel, run) {
  ctx.dialog(title, body, { submitLabel, onSubmit: () => (run() ? undefined : false) });
}

// ---------------------------------------------------------------- bind

function nextTurn(ctx) {
  const current = D.currentId(ctx.state);
  if (hasBlockingConsequences(ctx.state, current)) {
    ctx.toast(
      ctx.t(
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
      ctx.t("Riconnettiti prima di terminare il turno.", "Reconnect before ending the turn."),
      true,
    );
    return;
  }
  act(
    ctx,
    ctx.t("Turno concluso", "Turn ended"),
    (s) => {
      const actor = s.actors[s.combat.order[s.combat.turn]];
      if (!runs(ctx) && !ctx.canControl(actor))
        throw Error(ctx.t("Non è il tuo turno.", "Not your turn."));
      advanceTurn(s, { online: !ctx.offline });
    },
    // TV-48 (D&D Beyond): a hidden creature's turn is never narrated in the public log.
    D.turnLogOptions(ctx.state),
  );
}
/** TV-129: BG3 turn-based mode on and off (tracker button, command, Shift+Space). */
export function toggleTurnMode(ctx, firstId = null) {
  const on = ctx.state.combat?.active && ctx.state.combat.turnMode;
  if (ctx.state.combat?.active && !on) {
    ctx.toast(
      ctx.t(
        "C’è un combattimento in corso: la modalità a turni è già attiva.",
        "A combat is running: turns are already on.",
      ),
      true,
    );
    return false;
  }
  return act(
    ctx,
    on
      ? ctx.t("Modalità a turni conclusa", "Turn-based mode ended")
      : ctx.t(
          "Modalità a turni: si gioca un personaggio alla volta",
          "Turn-based mode: one character at a time",
        ),
    (s) => (on ? D.endTurnMode(s, ctx.role) : D.startTurnMode(s, ctx.role, firstId)),
  );
}
function runMenu(ctx, cmd, actorId, table) {
  ui.menu = null;
  if (cmd === "entry-less" || cmd === "entry-more")
    return act(
      ctx,
      ctx.t("Conto alla rovescia corretto", "Countdown corrected"),
      (s, slice) => D.adjustEntry(s, slice, actorId, cmd === "entry-less" ? -1 : 1, ctx.role),
      { visibility: "private" },
    );
  if (cmd === "entry-edit") return openEntry(ctx, actorId);
  if (cmd === "entry-remove")
    return act(
      ctx,
      ctx.t("Voce del tracker rimossa", "Tracker entry removed"),
      (s, slice) => D.removeEntry(s, slice, actorId, ctx.role),
      { visibility: "private" },
    );
  const name = nameOf(ctx, actorId);
  if (cmd === "select") {
    table?.select?.(actorId);
    return;
  }
  if (cmd === "reactions") return ctx.openSheet(actorId, "actions");
  if (cmd === "initiative") return openInitiative(ctx, actorId);
  if (cmd === "monster") return openMonster(ctx, actorId);
  if (cmd === "delete") return openDelete(ctx, actorId);
  if (cmd === "hide" || cmd === "reveal")
    return act(
      ctx,
      (cmd === "hide"
        ? ctx.t("Nascosta ai giocatori: ", "Hidden from players: ")
        : ctx.t("Rivelata ai giocatori: ", "Revealed to players: ")) + name,
      (s, slice) => D.setHidden(s, slice, actorId, cmd === "hide", ctx.role, tokenMenu(s)),
      cmd === "hide" ? { visibility: "private" } : {},
    );
  if (cmd === "defeat" || cmd === "undefeat")
    return act(
      ctx,
      (cmd === "defeat"
        ? ctx.t("Sconfitta: ", "Defeated: ")
        : ctx.t("Non più sconfitta: ", "No longer defeated: ")) + name,
      (s, slice) => D.setDefeated(s, slice, actorId, cmd === "defeat", ctx.role),
      privateFor(ctx.state, [actorId]),
    );
  if (cmd === "remove")
    return act(
      ctx,
      ctx.t(
        "Tolta dal combattimento (resta sulla mappa): ",
        "Removed from combat (stays on the map): ",
      ) + name,
      (s, slice) => D.removeFromCombat(s, slice, actorId, ctx.role),
      privateFor(ctx.state, [actorId]),
    );
}
export function bindTracker(el, ctx, table) {
  clearInterval(ui.timer);
  ui.timer = null;
  ui.outside?.abort();
  ui.outside = null;
  const timer = el.querySelector("[data-ct-timer]");
  if (timer)
    ui.timer = setInterval(() => {
      if (!timer.isConnected) return clearInterval(ui.timer);
      timer.querySelector("span").textContent = formatElapsed(timer.dataset.ctTimer);
    }, 1000);
  const on = (selector, handler, type = "click") =>
    el
      .querySelectorAll(selector)
      .forEach((node) => node.addEventListener(type, (event) => handler(node, event)));
  const disabled = (node) => node.getAttribute("aria-disabled") === "true";
  on("[data-ct-start]", () => openTableInitiative(ctx, ctx.state.activeSceneId));
  // TV-46: a player's own «Tira l’iniziativa» (roll call and pending lane).
  on("[data-ct-own-roll]", (node) =>
    rollOwnInitiative(ctx, node.dataset.ctOwnRoll, { mode: "digital" }),
  );
  on(
    "[data-ct-own-physical]",
    (node, event) => {
      event.preventDefault();
      const natural = Number(new FormData(node).get("natural"));
      rollOwnInitiative(ctx, node.dataset.ctOwnPhysical, { mode: "physical", natural });
    },
    "submit",
  );
  on("[data-ct-rollcall-close]", () => closeStart(ctx));
  on("[data-ct-turn-mode]", () => toggleTurnMode(ctx, table?.selectedActorId ?? null));
  on("[data-ct-turn-mode-end]", () => toggleTurnMode(ctx));
  on("[data-ct-next]", () => nextTurn(ctx));
  on("[data-ct-hold]", () =>
    act(ctx, ctx.t("Round avviato dal DM", "Round started by the DM"), (s, slice) =>
      D.startHeldRound(s, slice, ctx.role),
    ),
  );
  on("[data-ct-select]", (node) => table?.select?.(node.dataset.ctSelect));
  // B33 hook (additive): the HP value opens the damage tray's hit point widget.
  on("[data-ct-hp]", (node) => {
    const target = {
      actorId: node.dataset.ctHp,
      sceneId: ctx.state.activeSceneId,
      surface: "tracker",
    };
    const entry = ctx.registry?.get?.("token-menu", "damage-tray-hp", ctx, target);
    if (entry) ctx.registry.run(entry, ctx, target);
  });
  on("[data-ct-menu]", (node) => {
    ui.menu = ui.menu === node.dataset.ctMenu ? null : node.dataset.ctMenu;
    ui.focus = ui.menu
      ? `[data-ct-menu-first="${ui.menu}"]`
      : `[data-ct-menu="${node.dataset.ctMenu}"]`;
    ctx.render();
  });
  on(
    "[data-ct-row]",
    (node, event) => {
      // Foundry: right-click a combatant row opens its context menu.
      if (event.target.closest("input,select,textarea,.ct-menu")) return;
      event.preventDefault();
      ui.menu = node.dataset.ctRow;
      ui.focus = `[data-ct-menu-first="${ui.menu}"]`;
      ctx.render();
    },
    "contextmenu",
  );
  const menu = el.querySelector(".ct-menu");
  if (menu) {
    const items = [...menu.querySelectorAll("[role=menuitem]")];
    items[0]?.setAttribute("data-ct-menu-first", menu.id.replace("ct-menu-", ""));
    menu.addEventListener("keydown", (event) => {
      const index = items.indexOf(globalThis.document?.activeElement);
      const move = { ArrowDown: 1, ArrowUp: -1 }[event.key];
      if (move) {
        event.preventDefault();
        items[(index + move + items.length) % items.length]?.focus();
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        items[event.key === "Home" ? 0 : items.length - 1]?.focus();
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        const id = ui.menu;
        ui.menu = null;
        ui.focus = `[data-ct-menu="${id}"]`;
        ctx.render();
      }
    });
    items.forEach((item) =>
      item.addEventListener("click", () =>
        runMenu(ctx, item.dataset.ctCmd, item.dataset.actor, table),
      ),
    );
    // Foundry's context menu closes on a click elsewhere or when focus leaves it. Only the
    // menu element goes (no re-render), so the click that closed it still lands.
    const controller = new AbortController();
    ui.outside = controller;
    const close = () => {
      controller.abort();
      if (!ui.menu || !menu.isConnected) return;
      el.querySelector(`[data-ct-menu="${ui.menu}"]`)?.setAttribute("aria-expanded", "false");
      ui.menu = null;
      menu.remove();
    };
    globalThis.document?.addEventListener?.(
      "pointerdown",
      (event) => {
        if (!event.target?.closest?.(".ct-menu, [data-ct-menu]")) close();
      },
      { capture: true, signal: controller.signal },
    );
    menu.addEventListener("focusout", (event) => {
      const next = event.relatedTarget;
      if (next && !menu.contains(next) && !next.closest?.("[data-ct-menu]")) close();
    });
  }
  on("[data-ct-join]", (node) =>
    act(
      ctx,
      ctx.t("In attesa di entrare: ", "Waiting to join: ") + nameOf(ctx, node.dataset.ctJoin),
      (s, slice) => {
        D.addPending(s, slice, [node.dataset.ctJoin], ctx.role);
        D.assignLetters(s, slice);
      },
      { visibility: "private" },
    ),
  );
  on("[data-ct-pending-adv]", (node) => {
    if (disabled(node)) return;
    act(
      ctx,
      ctx.t("Modalità d’iniziativa: ", "Initiative mode: ") +
        nameOf(ctx, node.dataset.ctPendingAdv),
      (s, slice) =>
        D.setPendingAdvantage(s, slice, node.dataset.ctPendingAdv, node.dataset.value, ctx.role),
      { visibility: "private" },
    );
  });
  on("[data-ct-pending-roll]", (node) =>
    act(
      ctx,
      ctx.t("Iniziativa tirata: ", "Initiative rolled: ") + nameOf(ctx, node.dataset.ctPendingRoll),
      (s, slice) =>
        D.rollPending(s, slice, node.dataset.ctPendingRoll, { mode: "digital" }, ctx.role),
      { visibility: "private" },
    ),
  );
  on("[data-ct-pending-share]", (node) =>
    act(
      ctx,
      ctx.t("Stessa iniziativa del gruppo: ", "Same initiative as the group: ") +
        nameOf(ctx, node.dataset.ctPendingShare),
      (s, slice) =>
        D.rollPending(
          s,
          slice,
          node.dataset.ctPendingShare,
          { shareWith: node.dataset.with },
          ctx.role,
        ),
      { visibility: "private" },
    ),
  );
  on(
    "[data-ct-pending-physical]",
    (node, event) => {
      event.preventDefault();
      const data = new FormData(node);
      act(
        ctx,
        ctx.t("Iniziativa registrata (dado fisico): ", "Initiative recorded (physical die): ") +
          nameOf(ctx, node.dataset.ctPendingPhysical),
        (s, slice) =>
          D.rollPending(
            s,
            slice,
            node.dataset.ctPendingPhysical,
            { mode: "physical", natural: Number(data.get("natural")) },
            ctx.role,
          ),
        { visibility: "private" },
      );
    },
    "submit",
  );
  on(
    "[data-ct-pending-fix]",
    (node, event) => {
      event.preventDefault();
      const data = new FormData(node);
      act(
        ctx,
        ctx.t("Iniziativa corretta: ", "Initiative corrected: ") +
          nameOf(ctx, node.dataset.ctPendingFix),
        (s, slice) =>
          D.rollPending(
            s,
            slice,
            node.dataset.ctPendingFix,
            { mode: "physical", natural: Number(data.get("natural")), reason: data.get("reason") },
            ctx.role,
          ),
        { visibility: "private" },
      );
    },
    "submit",
  );
  on("[data-ct-pending-remove]", (node) =>
    act(
      ctx,
      ctx.t("Tolta dall’attesa: ", "Removed from waiting: ") +
        nameOf(ctx, node.dataset.ctPendingRemove),
      (s, slice) => D.removePending(s, slice, node.dataset.ctPendingRemove, ctx.role),
      { visibility: "private" },
    ),
  );
  on("[data-ct-pending-add]", (node) => {
    const slice = D.sliceOf(ctx.state);
    const ids = slice.combat.pending.filter((p) => p.roll).map((p) => p.actorId);
    if (disabled(node) || !ids.length)
      return ctx.toast(
        ctx.t(
          "Tira l’iniziativa di almeno una creatura in attesa.",
          "Roll initiative for at least one waiting creature.",
        ),
        true,
      );
    act(
      ctx,
      ctx.t("Entrano in combattimento: ", "Joining combat: ") +
        ids.map((id) => nameOf(ctx, id)).join(", "),
      (s, sl) => D.addPendingToCombat(s, sl, ctx.role),
      privateFor(ctx.state, ids),
    );
  });
  on("[data-ct-legendary-use]", (node) => {
    if (disabled(node))
      return ctx.toast(
        el.querySelector(
          `#ct-leg-why-${globalThis.CSS?.escape ? CSS.escape(node.dataset.ctLegendaryUse) : node.dataset.ctLegendaryUse}`,
        )?.textContent ?? "",
        true,
      );
    act(
      ctx,
      ctx.t("Azione leggendaria: ", "Legendary action: ") +
        nameOf(ctx, node.dataset.ctLegendaryUse),
      (s, slice) => D.useLegendaryAction(s, slice, node.dataset.ctLegendaryUse, "", ctx.role),
      { visibility: "private" },
    );
  });
  on("[data-ct-resist]", (node) => {
    if (disabled(node))
      return ctx.toast(
        ctx.t(
          "Il danno è già applicato o non restano usi: usa Annulla e poi la resistenza.",
          "The damage is already applied or no uses remain: Undo, then use the resistance.",
        ),
        true,
      );
    act(
      ctx,
      ctx.t(
        "Resistenza leggendaria: TS riuscito per ",
        "Legendary Resistance: save succeeds for ",
      ) + nameOf(ctx, node.dataset.ctResist),
      (s, slice) =>
        D.useLegendaryResistance(s, slice, node.dataset.ctResist, node.dataset.attempt, ctx.role),
      privateFor(ctx.state, [node.dataset.ctResist]),
    );
  });
  on("[data-ct-recharge-spend]", (node) =>
    act(
      ctx,
      ctx.t("Abilità usata, in ricarica: ", "Ability used, recharging: ") +
        nameOf(ctx, node.dataset.ctRechargeSpend),
      (s, slice) =>
        D.markRechargeUsed(s, slice, node.dataset.ctRechargeSpend, node.dataset.ability, ctx.role),
      { visibility: "private" },
    ),
  );
  on("[data-ct-recharge-roll]", (node) =>
    openRecharge(ctx, node.dataset.ctRechargeRoll, node.dataset.ability),
  );
  on("[data-ct-ready]", (node) => openReady(ctx, node.dataset.ctReady));
  on("[data-ct-ready-fire]", (node) => openReadyFire(ctx, node.dataset.ctReadyFire));
  on("[data-ct-ready-ignore]", (node) =>
    act(
      ctx,
      ctx.t("Innesco ignorato: ", "Trigger ignored: ") + nameOf(ctx, node.dataset.ctReadyIgnore),
      (s, slice) =>
        D.resolveReady(s, slice, node.dataset.ctReadyIgnore, { decision: "ignore" }, ctx.role),
    ),
  );
  on("[data-ct-entry-new]", () => openEntry(ctx));
  on("[data-ct-mob]", () => openMobAttack(ctx, table));
  on("[data-ct-finish]", () => openFinish(ctx));
  on("[data-ct-settings]", () => openSettings(ctx));
  on("[data-ct-reset]", () =>
    confirmDialog(
      ctx,
      ctx.t("Reimposta l’incontro", "Reset the encounter"),
      `<p>${ctx.t("Come «Reset» di Clash!: si riparte dal round 1 con lo stesso ordine; le creature del DM tornano ai PF massimi, leggendarie, resistenze, ricariche e conti alla rovescia si ripristinano. Chi è morto resta morto.", "Like Clash!’s “Reset”: back to round 1 with the same order; the DM’s creatures return to maximum HP, legendary uses, resistances, recharges and countdowns are restored. The dead stay dead.")}</p>`,
      ctx.t("Reimposta", "Reset"),
      () =>
        act(ctx, ctx.t("Incontro reimpostato: round 1", "Encounter reset: round 1"), (s, slice) =>
          D.resetEncounter(s, slice, ctx.role),
        ),
    ),
  );
  on("[data-ct-clear]", () =>
    confirmDialog(
      ctx,
      ctx.t("Svuota il tracker", "Clear the tracker"),
      `<p>${ctx.t("Come «Clear» di Clash!: tutte le creature lasciano l’ordine dei turni e il combattimento finisce; le pedine restano sulla mappa. Per ricominciare prepara di nuovo l’iniziativa.", "Like Clash!’s “Clear”: every creature leaves the turn order and the combat ends; tokens stay on the map. To start again prepare initiative again.")}</p>`,
      ctx.t("Svuota", "Clear"),
      () =>
        act(ctx, ctx.t("Tracker svuotato", "Tracker cleared"), (s, slice) =>
          D.clearEncounter(s, slice, ctx.role),
        ),
    ),
  );
  on("[data-ct-sheet]", (node) => ctx.openSheet(node.dataset.ctSheet, "actions"));
  on(
    "[data-ct-sound]",
    (node) => {
      try {
        ctx.registry.setSetting(ctx, SOUND, node.checked);
      } catch (error) {
        ctx.toast(errorText(ctx, error), true);
      }
    },
    "change",
  );
  if (ui.focus) {
    const target = el.querySelector(ui.focus);
    ui.focus = null;
    target?.focus?.({ preventScroll: true });
  }
}

// ---------------------------------------------------------------- map layers and alerts

function turnMarkerSvg(ctx, tableView) {
  const id = runs(ctx) ? D.currentId(ctx.state) : D.shownCurrentId(ctx.state, ctx.role);
  const token = tableView?.scene?.tokens?.find((t) => t.actorId === id);
  if (!token) return "";
  return `<g class="ct-turn-marker" data-ct-marker="${ctx.esc(id)}" transform="translate(${token.x},${token.y})" pointer-events="none" aria-hidden="true"><circle r="38" class="ct-marker-glow"/><circle r="33" class="ct-marker-ring"/></g>`;
}
function outMarkersSvg(ctx, tableView) {
  const slice = D.sliceOf(ctx.state);
  if (!slice || !ctx.state.combat?.active) return "";
  return slice.combat.removed
    .map((r) => {
      const token = tableView?.scene?.tokens?.find((t) => t.actorId === r.actorId);
      if (!token || !D.viewerSees(ctx.state, r.actorId, ctx.role)) return "";
      return `<g class="ct-out-marker" data-ct-out="${ctx.esc(r.actorId)}" transform="translate(${token.x},${token.y})" pointer-events="none"><title>${ctx.t("Fuori dal combattimento", "Out of combat")}</title><circle r="31" class="ct-out-ring"/><g transform="translate(-22,-22)"><circle r="10"/><path d="M-4 -4 L4 4 M4 -4 L-4 4"/></g></g>`;
    })
    .join("");
}
// TV-64 (BG3 status icons with their duration): a small badge per active effect at the
// token's top left (conditions keep the top right), with its name and duration as title.
function effectBadgesSvg(ctx, tableView) {
  return (tableView?.scene?.tokens ?? [])
    .map((token) => {
      if (!D.viewerSees(ctx.state, token.actorId, ctx.role)) return "";
      const effects = activeEffectsOf(ctx.state, token.actorId);
      return effects
        .slice(0, 3)
        .map(
          (effect, i) =>
            `<g class="ct-effect-badge" data-ct-effect="${ctx.esc(token.actorId)}:${ctx.esc(effect.type)}" transform="translate(${token.x - 21 - i * 19},${token.y - 21})" pointer-events="none"><title>${ctx.esc(ctx.label(effect.name))} · ${ctx.esc(ctx.label(effect.until))}</title><circle r="9" fill="#142733" stroke="#9fc2d8" stroke-width="1.5"/><g transform="translate(-6,-6) scale(0.5)"><path d="${effectIconPath(effect.icon)}" fill="none" stroke="#e8f1f7" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g></g>`,
        )
        .join("");
    })
    .join("");
}
// The alert for this viewer now: turn alerts first (Monk's), then unseen tracker events.
// TV-46: the first creature of this player that awaits its initiative roll, or null.
function ownAwaiting(ctx) {
  if (runs(ctx)) return null;
  const starting = !ctx.state.combat?.active || ctx.state.combat.turnMode;
  const ids = starting
    ? D.rollCallOf(ctx.state)
      ? arr(D.activeScene(ctx.state)?.encounter?.participants).map((p) => p.actorId)
      : []
    : arr(D.sliceOf(ctx.state)?.combat?.pending).map((p) => p.actorId);
  return (
    ids.filter(
      (id) => D.awaitsInitiative(ctx.state, id) && ctx.canControl(ctx.state.actors[id]),
    )[0] ?? null
  );
}
export function currentAlert(ctx) {
  const slice = D.sliceOf(ctx.state);
  if (!slice) return null;
  // TV-46: «Tira l’iniziativa» on the map for the player whose creature must roll.
  const own = ownAwaiting(ctx);
  if (own) {
    const key = `initiative:${D.rollCallOf(ctx.state)?.openedAt ?? ctx.state.combat?.encounterId}:${own}`;
    if (!wasSeen(ctx.role, key))
      return {
        key,
        kind: "initiative",
        actorId: own,
        text: ctx.t(
          `Tira l’iniziativa di ${nameOf(ctx, own)}.`,
          `Roll ${nameOf(ctx, own)}’s initiative.`,
        ),
      };
  }
  if (!ctx.state.combat?.active) return null;
  const turn = D.turnAlertFor(ctx.state, slice, ctx.role);
  if (turn) {
    const name = nameOf(ctx, turn.actorId);
    const key = `${turn.kind}:${turn.key}:${turn.actorId}`;
    const text =
      turn.kind === "turn"
        ? ctx.t(`Tocca a te, ${name}!`, `It’s your turn, ${name}!`)
        : turn.kind === "next"
          ? ctx.t(`Il prossimo turno è tuo, ${name}.`, `You’re next, ${name}.`)
          : ctx.t(
              `Il DM sta preparando il round ${ctx.state.combat.round}.`,
              `The DM is preparing round ${ctx.state.combat.round}.`,
            );
    if (!wasSeen(ctx.role, key)) return { key, kind: turn.kind, text };
  }
  const dm = runs(ctx);
  for (const event of [...slice.combat.events].reverse()) {
    const key = "event:" + event.id;
    if (wasSeen(ctx.role, key)) continue;
    const entry = slice.entries.find((e) => e.id === event.entryId);
    if (
      (event.kind === "countdown" || event.kind === "reminder") &&
      entry &&
      (dm || entry.visibility === "all")
    )
      return {
        key,
        kind: "event",
        text:
          event.kind === "countdown"
            ? ctx.t(`Ora: ${entry.name}!`, `Now: ${entry.name}!`)
            : ctx.t(`Promemoria del round: ${entry.name}`, `Round reminder: ${entry.name}`),
      };
    if (!dm) continue;
    const ability = slice.monsters[event.actorId]?.recharge?.find((r) => r.id === event.abilityId);
    if (event.kind === "recharge-due" && ability)
      return {
        key,
        kind: "event",
        text: ctx.t(
          `${nameOf(ctx, event.actorId)}: tira la ricarica di ${ctx.label(ability.name)} (1d6)`,
          `${nameOf(ctx, event.actorId)}: roll the recharge of ${ctx.label(ability.name)} (1d6)`,
        ),
      };
    if (event.kind === "recharge-rolled" && ability) {
      const roll = D.rechargeHistory(ctx.state, slice).find((r) => r.id === event.rollId);
      if (roll?.automatic)
        return {
          key,
          kind: "event",
          text: ctx.t(
            `${nameOf(ctx, event.actorId)}: ricarica di ${ctx.label(ability.name)} d6 = ${roll.face} · ${roll.success ? "pronta" : "non ricaricata"}`,
            `${nameOf(ctx, event.actorId)}: ${ctx.label(ability.name)} recharge d6 = ${roll.face} · ${roll.success ? "ready" : "not recharged"}`,
          ),
        };
    }
    if (event.kind === "revealed")
      return {
        key,
        kind: "event",
        text: ctx.t(
          `Rivelata al primo turno: ${nameOf(ctx, event.actorId)}`,
          `Revealed at its first turn: ${nameOf(ctx, event.actorId)}`,
        ),
      };
  }
  return null;
}
function showAlert(ctx) {
  const document = globalThis.document;
  if (!document?.body) return;
  const alert = ctx.view?.page === "table" ? currentAlert(ctx) : null;
  let box = document.querySelector("#ct-alert");
  if (!alert) {
    box?.remove();
    return;
  }
  if (box?.dataset.key === alert.key) return;
  box?.remove();
  box = document.createElement("div");
  box.id = "ct-alert";
  box.className = `ct-alert ct-alert-${alert.kind}`;
  box.dataset.key = alert.key;
  box.setAttribute("role", ["turn", "initiative"].includes(alert.kind) ? "alert" : "status");
  box.innerHTML =
    alert.kind === "initiative"
      ? `<strong>${ctx.esc(alert.text)}</strong><span class="ct-alert-actions"><button type="button" class="button primary" data-ct-alert-roll>${icon(ctx, "dice")} ${ctx.t("Tira l’iniziativa", "Roll initiative")}</button><button type="button" class="button" data-ct-alert-physical>${ctx.t("Dado fisico…", "Physical die…")}</button><button type="button" class="button quiet" data-ct-alert-ok>${ctx.t("Più tardi", "Later")}</button></span>`
      : `<strong>${ctx.esc(alert.text)}</strong><button type="button" class="button ${alert.kind === "turn" ? "primary" : "quiet"}" data-ct-alert-ok>${ctx.t("Ho capito", "Got it")}</button>`;
  document.body.append(box);
  // Monk's alerts sit on the canvas: at the top of the map, never over the scene commands
  // (on a phone the map scrolls away, so the alert stays under the header).
  const map = document.querySelector(".map-container")?.getBoundingClientRect?.();
  if (map && map.width > 0 && (globalThis.innerWidth ?? 0) > 720) {
    box.style.top = `${Math.max(8, map.top + 12)}px`;
    box.style.left = `${map.left + map.width / 2}px`;
    box.style.width = `min(560px, ${Math.max(240, map.width - 24)}px)`;
  } else if (map && map.width > 0) {
    // Critique 2: on a phone the call waits just above the pinned hotbar, as Owlbear's
    // snackbar does (DESIGN.md «Avviso»), instead of covering the header, the scene's name
    // and the turn order at the top of the screen.
    const dock = document.querySelector(".table-layout > .action-dock")?.getBoundingClientRect?.();
    const height = globalThis.innerHeight ?? 0;
    if (dock && dock.height > 0 && dock.top > height / 2 && dock.top < height) {
      box.style.top = "auto";
      box.style.bottom = `${Math.round(height - dock.top + 8)}px`;
    }
  }
  const role = ctx.role;
  const dismiss = () => {
    markSeen(role, alert.key);
    box.remove();
  };
  box.querySelector("[data-ct-alert-ok]").addEventListener("click", dismiss);
  box.querySelector("[data-ct-alert-roll]")?.addEventListener("click", () => {
    if (rollOwnInitiative(ctx, alert.actorId, { mode: "digital" })) dismiss();
  });
  box.querySelector("[data-ct-alert-physical]")?.addEventListener("click", () => {
    dismiss();
    rollOwnInitiative(ctx, alert.actorId, { mode: "physical" });
  });
  if (alert.kind === "turn" && ctx.registry?.getSetting?.(ctx, SOUND) === true)
    box.dataset.sound = chime() ? "played" : "unavailable";
  clearTimeout(ui.alertTimer);
  // Monk's "subtle" alerts fade on their own; "your turn" stays until acknowledged.
  if (!["turn", "initiative"].includes(alert.kind))
    ui.alertTimer = setTimeout(() => box.isConnected && dismiss(), 9000);
}

// ---------------------------------------------------------------- reaction policy (sheet)

function renderPolicyBox(ctx, actor) {
  const reactions = D.reactionsOf(ctx.state, actor.id);
  return `<section class="panel ct-policy-box" aria-labelledby="ct-policy-title-${ctx.esc(actor.id)}"><h3 id="ct-policy-title-${ctx.esc(actor.id)}">${ctx.t("Reazioni", "Reactions")}</h3><p class="muted">${ctx.t("Come il pannello Reazioni di Baldur’s Gate 3: una reazione attiva ti chiede ogni volta, oppure si usa da sola con dadi digitali; una disattivata rinuncia senza chiedere. Offrire o rinunciare non spende la reazione.", "Like Baldur’s Gate 3’s Reactions panel: an active reaction asks you each time, or is used on its own with digital dice; a turned-off one declines without asking. Offering or declining does not spend the reaction.")}</p><ul class="ct-policy-list">${reactions
    .map(
      (r) =>
        `<li data-ct-policy="${ctx.esc(r.id)}"><span class="ct-policy-name"><strong>${ctx.esc(ctx.label(r.name))}</strong><small class="muted" data-ct-policy-cost>${r.id === "shield" ? ctx.t("Reazione + slot di 1° livello o superiore", "Reaction + a level 1+ spell slot") : ctx.t("Reazione", "Reaction")}</small></span><label class="ct-check"><input type="checkbox" data-ct-policy-on="${ctx.esc(r.id)}" ${r.policy !== "off" ? "checked" : ""}> ${ctx.t("Attiva", "Active")}</label><label class="ct-check"><input type="checkbox" data-ct-policy-ask="${ctx.esc(r.id)}" ${r.policy === "ask" ? "checked" : ""} ${r.policy === "off" ? `disabled aria-describedby="ct-policy-why-${ctx.esc(r.id)}"` : ""}> ${ctx.t("Chiedi ogni volta", "Ask every time")}</label>${r.policy === "off" ? `<small class="muted ct-why" id="ct-policy-why-${ctx.esc(r.id)}">${ctx.t("La reazione è disattivata: spunta «Attiva» per scegliere se chiedere.", "The reaction is off: tick “Active” to choose whether to ask.")}</small>` : ""}<span class="ct-badge" data-ct-policy-word>${r.policy === "ask" ? ctx.t("Chiedi", "Ask") : r.policy === "auto" ? ctx.t("Automatico", "Automatic") : ctx.t("Disattivata", "Off")}</span></li>`,
    )
    .join("")}</ul></section>`;
}
function bindPolicyBox(el, ctx, actor) {
  const save = (reactionId) => {
    const on = el.querySelector(`[data-ct-policy-on="${reactionId}"]`).checked;
    const ask = el.querySelector(`[data-ct-policy-ask="${reactionId}"]`).checked;
    const policy = !on ? "off" : ask ? "ask" : "auto";
    const local =
      actor.visibility === "private" ||
      (Array.isArray(actor.campaignIds) && !actor.campaignIds.length);
    act(
      ctx,
      ctx.t("Politica delle reazioni: ", "Reaction policy: ") + actor.name,
      (s, slice) => D.setPolicy(s, slice, actor.id, reactionId, policy, ctx.role),
      local ? { local: true, visibility: "private" } : {},
    );
  };
  el.querySelectorAll("[data-ct-policy-on],[data-ct-policy-ask]").forEach((input) =>
    input.addEventListener("change", () =>
      save(input.dataset.ctPolicyOn ?? input.dataset.ctPolicyAsk),
    ),
  );
}

// ---------------------------------------------------------------- notifications

function collectNotices(ctx) {
  const slice = D.sliceOf(ctx.state);
  if (!slice) return [];
  const out = [];
  // TV-46: a creature of this player must roll its initiative (a request that needs action
  // goes to the bell too, registry plan §5.2 rule 8).
  const own = ownAwaiting(ctx);
  if (own)
    out.push({
      id: `ct-own-initiative-${D.rollCallOf(ctx.state)?.openedAt ?? ctx.state.combat?.encounterId}-${own}`,
      title: L(`Tira l’iniziativa: ${nameOf(ctx, own)}`, `Roll initiative: ${nameOf(ctx, own)}`),
      category: "combat-tracker",
      target: { page: "table" },
    });
  if (!ctx.state.combat?.active) return out;
  const turn = D.turnAlertFor(ctx.state, slice, ctx.role);
  // "Your turn" is already a core notice of the bell (B24, category Turns, FG turn-change
  // toasts): listing it here too showed it twice. The tracker keeps its own on-Table alert
  // and adds only "you're next", which the core does not list.
  if (turn?.kind === "next")
    out.push({
      id: `ct-${turn.kind}-${turn.key}`,
      title: L(
        `Il prossimo turno è tuo: ${nameOf(ctx, turn.actorId)}`,
        `You’re next: ${nameOf(ctx, turn.actorId)}`,
      ),
      category: "combat-tracker",
      target: { page: "table" },
    });
  if (runs(ctx)) {
    const waiting = slice.combat.pending.filter((p) => !p.roll).length;
    if (waiting)
      out.push({
        id: "ct-pending",
        title: L(
          `${waiting} creature in attesa dell’iniziativa`,
          `${waiting} creatures waiting for initiative`,
        ),
        category: "combat-tracker",
        target: { page: "table" },
      });
    for (const [actorId, monster] of Object.entries(slice.monsters)) {
      for (const ability of monster.recharge ?? [])
        if (ability.due)
          out.push({
            id: `ct-recharge-${actorId}-${ability.id}`,
            title: L(
              `${nameOf(ctx, actorId)}: tira la ricarica (${ability.name.it})`,
              `${nameOf(ctx, actorId)}: roll the recharge (${ability.name.en})`,
            ),
            category: "combat-tracker",
            target: { page: "table" },
          });
      if (monster.resistance && monster.resistance.used < monster.resistance.max)
        for (const save of D.failedSaves(ctx.state, actorId).filter((s) => s.ready))
          out.push({
            id: `ct-resist-${actorId}-${save.attemptId}`,
            title: L(
              `${nameOf(ctx, actorId)} ha fallito un TS: resistenza leggendaria disponibile`,
              `${nameOf(ctx, actorId)} failed a save: Legendary Resistance available`,
            ),
            category: "combat-tracker",
            target: { page: "table" },
          });
    }
  }
  for (const entry of slice.entries)
    if (
      entry.kind === "countdown" &&
      entry.remaining === 0 &&
      entry.firedRound === ctx.state.combat.round &&
      (runs(ctx) || entry.visibility === "all")
    )
      out.push({
        id: `ct-entry-${entry.id}`,
        title: L(`Ora: ${entry.name}`, `Now: ${entry.name}`),
        category: "combat-tracker",
        target: { page: "table" },
      });
  return out;
}

// ---------------------------------------------------------------- registration

let unobserve = null;
let applyingPolicies = false;
export function register(registry) {
  registry.registerStateSlice(ID, {
    version: D.VERSION,
    seed: D.seedSlice,
    normalize: D.normalizeSlice,
  });
  registry.registerStateSlice(D.ROLLS, {
    version: D.VERSION,
    undo: "preserve",
    seed: D.seedRolls,
    normalize: D.normalizeRolls,
  });
  registry.registerStyles(new URL("./combat-tracker.css", import.meta.url));
  registry.add("table-panel", {
    id: ID,
    section: "combat",
    label: L("Combattimento", "Combat"),
    placement: "sidebar-tab",
    icon: "swords",
    order: 15,
    render: (ctx, tableView) => renderTracker(ctx, tableView),
    bind: (el, ctx, table) => bindTracker(el, ctx, table),
  });
  registry.add("map-layer", {
    id: "combat-tracker-marker",
    label: L("Segnalino del turno", "Turn marker"),
    order: 5,
    svg: (ctx, tableView) => (ctx.state.combat?.active ? turnMarkerSvg(ctx, tableView) : ""),
    bind: (el, ctx) => showAlert(ctx),
  });
  registry.add("map-layer", {
    id: "combat-tracker-out",
    label: L("Fuori dal combattimento", "Out of combat"),
    order: 62,
    svg: (ctx, tableView) => outMarkersSvg(ctx, tableView),
  });
  registry.add("table-tool", {
    id: "combat-tracker-mob",
    label: L("Attacco di gruppo", "Mob attack"),
    icon: "sword",
    group: "dm",
    order: 70,
    roles: ["dm"],
    when: (ctx) => Boolean(ctx.state.combat?.active),
    activate: (ctx, table) =>
      queueMicrotask(() => {
        table.setMode("move");
        openMobAttack(ctx, table);
      }),
  });
  registry.add("sheet-section", {
    id: "combat-tracker-reactions",
    tab: "actions",
    label: L("Reazioni", "Reactions"),
    order: 40,
    when: (ctx, actor) =>
      Boolean(actor) &&
      actor.kind === "character" &&
      ctx.canControl(actor) &&
      D.reactionsOf(ctx.state, actor.id).length > 0,
    render: (ctx, actor) => renderPolicyBox(ctx, actor),
    bind: (el, ctx, actor) => bindPolicyBox(el, ctx, actor),
  });
  registry.add("notifications", {
    id: "combat-tracker-turns",
    label: L("Combattimento", "Combat"),
    collect: (ctx) => collectNotices(ctx),
  });
  registry.add("settings", {
    id: "combat-tracker-alerts",
    label: L("Avvisi di turno", "Turn alerts"),
    scope: "device",
    fields: [
      {
        id: "sound",
        label: L("Suono quando tocca a me", "Sound when it is my turn"),
        type: "boolean",
        default: false,
      },
    ],
  });
  // BG3 policy (CRP-138): a pending offer that a standing choice answers is answered in a
  // follow-up transaction; Undo of the triggering change removes both (undoable: false).
  registry.on("commit", (payload, { ctx }) => {
    if (payload?.correction || applyingPolicies || !ctx || ctx.offline) return;
    const decisions = D.policyDecisions(ctx.state);
    if (!decisions.length) return;
    applyingPolicies = true;
    try {
      const names = decisions
        .map(
          (d) =>
            `${nameOf(ctx, d.actorId)} · ${ctx.label(D.REACTIONS.find(([id]) => id === d.type)?.[1] ?? d.type)} · ${d.policy === "auto" ? ctx.t("automatico", "automatic") : ctx.t("disattivata: rinuncia", "off: declined")}`,
        )
        .join("; ");
      ctx.commit(
        ctx.t("Reazione secondo la politica: ", "Reaction by policy: ") + names,
        (draft) => D.applyPolicies(draft),
        { undoable: false },
      );
    } catch (error) {
      ctx.toast?.(errorText(ctx, error), true);
    } finally {
      applyingPolicies = false;
    }
  });
  // TV-84 (FG duration anchors, Clash! expiry notice): an effect that ended at a turn
  // anchor gets its own log line (DM-only for a hidden creature) and a toast, once, in a
  // follow-up transaction that Undo of the turn change removes too (undoable: false).
  let announcing = false;
  registry.on("commit", (payload, { ctx }) => {
    if (payload?.correction || announcing || !ctx || ctx.offline) return;
    const due = D.pendingExpiries(D.sliceOf(ctx.state));
    if (!due.length) return;
    announcing = true;
    try {
      for (const hidden of [false, true]) {
        const group = due.filter((e) => Boolean(e.hidden) === hidden);
        if (!group.length) continue;
        const text = group
          .map((e) => ctx.label(effectEndedText(e.type, nameOf(ctx, e.actorId))))
          .join("; ");
        ctx.commit(
          text,
          (draft) =>
            D.markExpiriesAnnounced(
              D.sliceOf(draft),
              group.map((e) => e.id),
            ),
          { undoable: false, ...(hidden ? { visibility: "private" } : {}) },
        );
        if (!hidden || runs(ctx)) ctx.toast?.(text);
      }
    } catch (error) {
      ctx.toast?.(errorText(ctx, error), true);
    } finally {
      announcing = false;
    }
  });
  registry.add("map-layer", {
    id: "combat-tracker-effects",
    label: L("Effetti attivi sulle pedine", "Active effects on tokens"),
    order: 64,
    svg: (ctx, tableView) => effectBadgesSvg(ctx, tableView),
  });
  // Final review F16 (Foundry dnd5e /award after combat, D&D Beyond encounter XP): the Table's
  // «Concludi incontro» runs this finish, with the defeated creatures' XP and their loot.
  registry.add("command", {
    id: "combat-tracker.finish",
    label: L("Concludi incontro: PE e bottino", "Finish encounter: XP and loot"),
    description: L(
      "Fine del combattimento, sconfitti, punti esperienza, bottino dei vinti, ricompense",
      "End of combat, defeated creatures, experience points, the defeated's loot, rewards",
    ),
    context: "table",
    group: "combat",
    roles: ["dm"],
    when: (ctx) => Boolean(ctx.state.combat?.active) && !ctx.state.combat.turnMode,
    run: (ctx) => openFinish(ctx),
  });
  registry.add("command", {
    id: "combat-tracker.start",
    label: L("Avvia combattimento", "Start combat"),
    description: L(
      "Iniziativa: scegli le pedine, tira tutti, tira PNG e inizia al Tavolo",
      "Initiative: choose tokens, roll all, roll NPCs and begin at the Table",
    ),
    context: "table",
    group: "combat",
    roles: ["dm"],
    when: (ctx) => !ctx.state.combat?.active || Boolean(ctx.state.combat.turnMode),
    run: (ctx) => openTableInitiative(ctx, ctx.state.activeSceneId),
  });
  registry.add("command", {
    id: "combat-tracker.turn-mode",
    label: L("Modalità a turni", "Turn-based mode"),
    description: L(
      "Gioca a turni fuori dal combattimento, senza iniziativa (turni, a turni)",
      "Play in turns outside combat, without initiative (turns, turn based)",
    ),
    shortcut: "Shift+Space",
    context: "table",
    group: "combat",
    when: (ctx) => !ctx.state.combat?.active || Boolean(ctx.state.combat.turnMode),
    run: (ctx) => toggleTurnMode(ctx),
  });
  registry.on("navigate", (payload) => {
    if (payload?.page !== "table") {
      ui.menu = null;
      clearInterval(ui.timer);
      globalThis.document?.querySelector?.("#ct-alert")?.remove();
    }
  });
  registry.on("reset", resetTrackerView);
  registry.on("role-changed", resetTrackerView);
  // One observer per module instance, whatever the number of registries (tests).
  if (!unobserve) {
    unobserve = observeTurnPhases(D.onTurnPhase);
    shareCurrentTurn(D.sharesTurn);
  }
}
