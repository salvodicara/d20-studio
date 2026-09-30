// B33 — Damage, healing and the HP log (census card B33: TV-25, TV-68, TV-69, PG-22).
//
// Where it lives (B61 placement rules):
// - Table › Creature tab: "Damage tray" (dnd5e damage application tray, FVT-139) above the
//   selected creature's "Hit points" widget (D&D Beyond DDB-142). The tray replaces B20's
//   plain "To apply" list, which defers to it; B20's pill and bell notice stay.
// - Token menu: "Hit points…" opens the same widget in a dialog (DDB-142 flyout).
// - Combat tracker (B32): the HP value opens the same dialog.
// - Character sheet: the widget inside the HP card (DDB-032), via a `sheet-section` with the
//   pseudo tab "vitals" that characters.mjs renders in that card.
// - Map: Bloodied and Dead visuals on tokens (DDB-143), hidden from players by the campaign
//   setting and by the enemy-health rule.
// - Bell: players' proposals for the DM, answers for the player (VTL-129).
// - Preferences (campaign scope, DM): token visuals for players, player proposals.
// Every HP change goes through the conditions domain (see damage-domain.mjs).
import * as D from "./damage-domain.mjs";
import {
  ui,
  resetWidgetView,
  hpWidgetHTML,
  bindHpWidget,
  chipsHTML,
  multipliersHTML,
  stepsText,
  overkillText,
  decisionOf,
  domainDecision,
  decisionHandlers,
  restoreFocus,
  errorText,
  attr,
  redraw,
  healthBadge,
  canManage,
  canPropose,
  proposalWhat,
} from "./hp-widget.mjs";
import { adjustDamageWith } from "./combat.mjs";
import { canReadVitals } from "./conditions.mjs";
import { openCombatRequests } from "./combat-ui.mjs";
import { displaySize, sizeScale, observesToken } from "./token-menu.mjs";
import { policyOf, isEnemyFor } from "./campaign-settings-domain.mjs";
import * as CS from "./campaign-settings-domain.mjs";

const L = (it, en) => ({ it, en });

// ---------------------------------------------------------------- the tray

function saveText(ctx, row) {
  if (row.saveSuccess === true)
    return `<span class="dt-save is-success">${ctx.t("TS riuscito: metà", "Save succeeded: half")}</span>`;
  if (row.saveSuccess === false)
    return `<span class="dt-save">${ctx.t("TS fallito", "Save failed")}</span>`;
  if (row.hit === true)
    return `<span class="dt-save">${row.critical ? ctx.t("Colpo critico", "Critical hit") : ctx.t("Colpito", "Hit")}</span>`;
  return "";
}
function rowPreviewHTML(ctx, row, preview) {
  const b = preview.breakdown;
  const hp = b
    ? `${ctx.t("PF", "HP")} ${b.hpBefore} → <strong>${b.hpAfter}</strong>${b.tempHpAbsorbed ? ` · ${ctx.t("temporanei", "temporary")} ${b.tempHpBefore} → ${b.tempHpAfter}` : ""}`
    : "";
  const after = preview.after
    ? ` <span class="dt-state is-${preview.after}">${ctx.label(D.HEALTH_LABEL[preview.after])}</span>`
    : "";
  return `<p class="dt-calc" data-dt-calc="${attr(ctx, row.key)}"><span>${ctx.esc(stepsText(ctx, preview.adjusted))}</span> <span>${hp}${overkillText(ctx, b)}${after}</span></p>`;
}
function attemptRowHTML(ctx, row) {
  const key = row.key;
  const preview = D.previewRow(ctx.state, row, domainDecision(key), ctx.role);
  const defenses = D.defensesOf(ctx.state, row.actorId);
  const unknown =
    row.type && row.typeKnown && defenses.origin === "none"
      ? `<p class="muted dt-unknown">${ctx.t("Nessuna difesa ai danni registrata per questa creatura.", "No damage defense recorded for this creature.")}</p>`
      : "";
  // The row keeps B20's line ("Esploratore · 5 danni · da Livia") and its hooks: this tray
  // replaces B20's "To apply" list with the same row and more (defenses, multipliers).
  const title = `<span class="dt-row-title" data-cs-ready-row="${attr(ctx, row.actorId)}"><strong>${ctx.esc(row.name)}</strong> · ${row.base} ${ctx.t("danni", "damage")}${row.sourceName ? ` · ${ctx.t("da", "from")} ${ctx.esc(row.sourceName)}` : ""}</span>`;
  return `<li class="dt-row" data-dt-row="${attr(ctx, key)}"><div class="dt-row-head">${title}${saveText(ctx, row)}</div>${row.typeKnown ? chipsHTML(ctx, key, preview.chips) : ""}${unknown}${multipliersHTML(ctx, key)}${rowPreviewHTML(ctx, row, preview)}<div class="toolbar dt-row-commands"><button type="button" class="button primary" data-dt-apply="${attr(ctx, key)}" data-cs-apply-ready="${attr(ctx, row.actorId)}" data-attempt="${attr(ctx, row.attemptId)}" aria-label="${attr(ctx, ctx.t(`Applica ${preview.adjusted.amount} danni a ${row.name}`, `Apply ${preview.adjusted.amount} damage to ${row.name}`))}">${ctx.t("Applica", "Apply")} ${preview.adjusted.amount}</button></div></li>`;
}
function groupRows(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.attemptId)) groups.set(row.attemptId, []);
    groups.get(row.attemptId).push(row);
  }
  return [...groups.values()];
}
function attemptCardHTML(ctx, rows) {
  const first = rows[0];
  const type = first.typeKnown && first.type ? ctx.label(D.typeLabel(first.type)) : "";
  const base = Math.max(...rows.map((r) => r.base));
  const halfNote = rows.some((r) => r.saveSuccess === true)
    ? `<small>${ctx.t("Metà per chi supera il TS (per difetto, SRD EN 16 / IT 18)", "Half on a successful save (round down, SRD EN 16 / IT 18)")}</small>`
    : "";
  return `<section class="dt-card" data-dt-card="${attr(ctx, first.attemptId)}"><header><strong>${ctx.esc(ctx.label(first.actionName))}</strong>${first.sourceName ? ` · ${ctx.esc(first.sourceName)}` : ""} · ${base} ${ctx.t("danni", "damage")}${type ? " " + ctx.t("da", "of") + " " + ctx.esc(type) : ""}${!first.typeKnown && first.type ? ` <small>${ctx.t("(tipo non rivelato: difese applicate dal DM)", "(type not revealed: defenses applied by the DM)")}</small>` : ""}${halfNote}</header><ul class="dt-rows">${rows.map((row) => attemptRowHTML(ctx, row)).join("")}</ul><div class="toolbar dt-card-commands">${rows.length > 1 ? `<button type="button" class="button" data-dt-apply-all="${attr(ctx, first.attemptId)}">${ctx.t("Applica a tutti", "Apply to all")} (${rows.length})</button>` : ""}<button type="button" class="button quiet" data-cs-open-card="${attr(ctx, first.attemptId)}">${ctx.t("Apri la carta", "Open the card")}</button></div></section>`;
}
function proposalRowHTML(ctx, proposal) {
  const actor = ctx.state.actors[proposal.actorId];
  if (!actor) return "";
  const key = `prop:${proposal.id}`;
  const damage = proposal.kind === "damage";
  const chips =
    damage && proposal.type ? D.chipsFor(D.defensesOf(ctx.state, actor.id), proposal.type) : [];
  const adjusted = D.adjustDamage(proposal.amount, chips, domainDecision(key));
  const who = proposal.by === "player" ? ctx.t("Giocatore", "Player") : ctx.esc(proposal.by);
  const d = decisionOf(key);
  if (proposal.kind === "condition") {
    const name = ctx.esc(ctx.label(D.conditionName(proposal.conditionId)));
    return `<li class="dt-row dt-proposal-row" data-dt-proposal-row="${attr(ctx, proposal.id)}"><div class="dt-row-head"><strong>${ctx.esc(actor.name)}</strong><span class="dt-save">${who}: ${proposalWhat(ctx, proposal)}</span></div>${proposal.note ? `<p class="dt-note">«${ctx.esc(proposal.note)}»</p>` : ""}<p class="dt-calc">${ctx.t("Applicata come registrazione, termina a mano (Condizioni e stato).", "Applied as a record, ended by hand (Conditions and status).")}</p>${d.declineOpen ? `<label class="field">${ctx.t("Motivo del rifiuto (facoltativo)", "Reason for declining (optional)")}<input data-dt-decline-reason="${attr(ctx, proposal.id)}" maxlength="${D.MAX_NOTE}" value="${attr(ctx, d.declineReason ?? "")}"></label>` : ""}<div class="toolbar dt-row-commands"><button type="button" class="button primary" data-dt-accept="${attr(ctx, proposal.id)}">${ctx.t(`Accetta e applica ${name}`, `Accept and apply ${name}`)}</button><button type="button" class="button" data-dt-decline="${attr(ctx, proposal.id)}">${d.declineOpen ? ctx.t("Conferma il rifiuto", "Confirm decline") : ctx.t("Rifiuta…", "Decline…")}</button></div></li>`;
  }
  return `<li class="dt-row dt-proposal-row" data-dt-proposal-row="${attr(ctx, proposal.id)}"><div class="dt-row-head"><strong>${ctx.esc(actor.name)}</strong><span class="dt-save">${who}: ${damage ? ctx.t("danno", "damage") : ctx.t("cura", "healing")} ${proposal.amount}${proposal.type ? " · " + ctx.esc(ctx.label(D.typeLabel(proposal.type))) : ""}</span></div>${proposal.note ? `<p class="dt-note">«${ctx.esc(proposal.note)}»</p>` : ""}${chipsHTML(ctx, key, chips)}${damage ? multipliersHTML(ctx, key) : ""}<p class="dt-calc">${damage ? ctx.esc(stepsText(ctx, adjusted)) : ctx.t(`Cura ${proposal.amount}`, `Healing ${proposal.amount}`)} · ${ctx.t("PF", "HP")} ${actor.hp}/${actor.maxHp}</p>${d.declineOpen ? `<label class="field">${ctx.t("Motivo del rifiuto (facoltativo)", "Reason for declining (optional)")}<input data-dt-decline-reason="${attr(ctx, proposal.id)}" maxlength="${D.MAX_NOTE}" value="${attr(ctx, d.declineReason ?? "")}"></label>` : ""}<div class="toolbar dt-row-commands"><button type="button" class="button primary" data-dt-accept="${attr(ctx, proposal.id)}">${damage ? ctx.t(`Accetta e applica ${adjusted.amount}`, `Accept and apply ${adjusted.amount}`) : ctx.t(`Accetta e cura ${proposal.amount}`, `Accept and heal ${proposal.amount}`)}</button><button type="button" class="button" data-dt-decline="${attr(ctx, proposal.id)}">${d.declineOpen ? ctx.t("Conferma il rifiuto", "Confirm decline") : ctx.t("Rifiuta…", "Decline…")}</button></div></li>`;
}
export function renderTray(ctx) {
  const rows = D.trayRows(ctx.state, ctx.role);
  const proposals = ctx.role === "dm" ? D.pendingProposals(ctx.state) : [];
  return `<div class="dt-tray" data-dt-tray data-cs-ready><p class="dt-tray-note">${ctx.t("Nulla cambia prima di «Applica». Clic su una difesa per disattivarla; il moltiplicatore vale prima delle difese (SRD EN 17 / IT 19).", "Nothing changes before “Apply”. Click a defense to turn it off; the multiplier applies before defenses (SRD EN 17 / IT 19).")}</p>${groupRows(
    rows,
  )
    .map((group) => attemptCardHTML(ctx, group))
    .join(
      "",
    )}${proposals.length ? `<section class="dt-card" data-dt-card="proposals"><header><strong>${ctx.t("Proposte dei giocatori", "Player proposals")}</strong> <small>${ctx.t("Improved Initiative: il DM accetta o rifiuta", "Improved Initiative: the DM accepts or declines")}</small></header><ul class="dt-rows">${proposals.map((p) => proposalRowHTML(ctx, p)).join("")}</ul></section>` : ""}</div>`;
}
// B20's commit label: the attack card offers its Undo only after this exact label
// (combat-ui.mjs `undoControl`), so the tray keeps it and names the targets in the toast.
function applyRows(ctx, keys) {
  const names = [];
  const targets = D.trayRows(ctx.state, ctx.role).filter((row) => keys.includes(row.key));
  // The DM's own creatures only: the audit entry stays theirs; a player's character is
  // logged for everyone, as B20's Apply did.
  const dmOnly =
    ctx.role === "dm" &&
    targets.length > 0 &&
    targets.every((row) => ctx.state.actors[row.actorId]?.owner === "dm");
  try {
    ctx.commit(
      ctx.t("Danni applicati", "Damage applied"),
      (draft) => {
        for (const key of keys) {
          const out = D.applyTrayRow(draft, key, domainDecision(key), ctx.role);
          names.push(`${out.row.name} ${out.amount}`);
        }
      },
      dmOnly ? { visibility: "private" } : {},
    );
  } catch (error) {
    ctx.toast(errorText(ctx, error), true);
    redraw(ctx);
    return false;
  }
  for (const key of keys) ui.decisions.delete(key);
  ctx.toast(ctx.t("Danni applicati: ", "Damage applied: ") + names.join(", "));
  redraw(ctx);
  // With nothing left to apply the tray disappears: keyboard focus goes back to the
  // Creature tab instead of falling to the page.
  if (!D.trayRows(ctx.state, ctx.role).length)
    globalThis.document?.querySelector?.('[data-table-tab="creature"]')?.focus?.();
  return true;
}
export function bindTray(el, ctx) {
  decisionHandlers(el, ctx);
  el.querySelectorAll("[data-dt-apply]").forEach((node) =>
    node.addEventListener("click", () => applyRows(ctx, [node.dataset.dtApply])),
  );
  // The attack card in "Rolls and results" (dnd5e: the tray belongs to the chat card).
  el.querySelectorAll("[data-cs-open-card]").forEach((node) =>
    node.addEventListener("click", () => openCombatRequests(ctx, node.dataset.csOpenCard)),
  );
  el.querySelectorAll("[data-dt-apply-all]").forEach((node) =>
    node.addEventListener("click", () => {
      const keys = D.trayRows(ctx.state, ctx.role)
        .filter((r) => r.attemptId === node.dataset.dtApplyAll)
        .map((r) => r.key);
      applyRows(ctx, keys);
    }),
  );
  el.querySelectorAll("[data-dt-accept]").forEach((node) =>
    node.addEventListener("click", () => {
      acceptProposal(ctx, node.dataset.dtAccept);
      redraw(ctx);
    }),
  );
  el.querySelectorAll("[data-dt-decline-reason]").forEach((node) =>
    node.addEventListener("input", () => {
      const key = `prop:${node.dataset.dtDeclineReason}`;
      ui.decisions.set(key, { ...decisionOf(key), declineReason: node.value });
    }),
  );
  el.querySelectorAll("[data-dt-decline]").forEach((node) =>
    node.addEventListener("click", () => {
      const id = node.dataset.dtDecline;
      const key = `prop:${id}`;
      const d = decisionOf(key);
      if (!d.declineOpen) {
        ui.decisions.set(key, { ...d, declineOpen: true });
        ui.focus = `[data-dt-decline-reason="${id}"]`;
        redraw(ctx);
        return;
      }
      try {
        ctx.commit(ctx.t("Proposta rifiutata", "Proposal declined"), (draft) =>
          D.answerProposal(draft, id, { accept: false, reason: d.declineReason ?? "" }, ctx.role),
        );
        ui.decisions.delete(key);
        ctx.toast(
          ctx.t(
            "Proposta rifiutata: il giocatore vede il motivo.",
            "Proposal declined: the player sees the reason.",
          ),
        );
      } catch (error) {
        ctx.toast(errorText(ctx, error), true);
      }
      redraw(ctx);
    }),
  );
  restoreFocus(el);
}

// ---------------------------------------------------------------- proposals and the DM tray

/** Accepts a player's proposal with the tray's decision (defenses, multiplier). */
export function acceptProposal(ctx, id) {
  const proposal = D.pendingProposals(ctx.state).find((p) => p.id === id);
  const actor = ctx.state.actors[proposal?.actorId];
  try {
    ctx.commit(
      ctx.t(`Proposta accettata: ${actor?.name ?? ""}`, `Proposal accepted: ${actor?.name ?? ""}`),
      (draft) =>
        D.answerProposal(
          draft,
          id,
          { accept: true, decision: domainDecision(`prop:${id}`) },
          ctx.role,
          { online: !ctx.offline, lang: ctx.lang },
        ),
      actor?.kind === "npc" ? { visibility: "private" } : {},
    );
    ui.decisions.delete(`prop:${id}`);
    ctx.toast(ctx.t("Proposta accettata e applicata.", "Proposal accepted and applied."));
    return true;
  } catch (error) {
    ctx.toast(errorText(ctx, error), true);
    return false;
  }
}
/** Declines a proposal with an optional reason the player reads. */
export function declineProposal(ctx, id, reason = "") {
  try {
    ctx.commit(ctx.t("Proposta rifiutata", "Proposal declined"), (draft) =>
      D.answerProposal(draft, id, { accept: false, reason }, ctx.role),
    );
    ui.decisions.delete(`prop:${id}`);
    ctx.toast(
      ctx.t(
        "Proposta rifiutata: il giocatore vede il motivo.",
        "Proposal declined: the player sees the reason.",
      ),
    );
    return true;
  } catch (error) {
    ctx.toast(errorText(ctx, error), true);
    return false;
  }
}
function openDecline(ctx, id) {
  ctx.dialog(
    ctx.t("Rifiuta la proposta", "Decline the proposal"),
    `<label class="field">${ctx.t("Motivo del rifiuto (facoltativo, il giocatore lo legge)", "Reason for declining (optional, the player reads it)")}<input name="reason" maxlength="${D.MAX_NOTE}" autocomplete="off"></label>`,
    {
      submitLabel: ctx.t("Rifiuta", "Decline"),
      onSubmit: (data) => declineProposal(ctx, id, String(data.get("reason") ?? "")) || false,
    },
  );
}
// TV-68: the per-campaign default for attack damage, in plain words where the DM applies it
// (dnd5e damage tray; B20's «Livello di automazione»: Automatico = apply at once, Assistito =
// review first). It writes the campaign rule through the settings domain.
function automationOf(ctx) {
  const slice = ctx.state.ext?.["campaign-settings"];
  if (!slice) return null;
  return policyOf(slice, ctx.state.campaign?.id)?.automation ?? "assisted";
}
function automationHTML(ctx) {
  const value = automationOf(ctx);
  if (ctx.role !== "dm" || !value) return "";
  const option = (v, it, en) =>
    `<label class="dt-seg-option"><input type="radio" name="dt-automation" value="${v}" data-dt-automation${value === v ? " checked" : ""}> ${ctx.t(it, en)}</label>`;
  return `<fieldset class="dt-automation"><legend>${ctx.t("Danni degli attacchi in questa campagna", "Attack damage in this campaign")}</legend>${option("automatic", "Applica subito (con Annulla)", "Apply at once (with Undo)")}${option("assisted", "Rivedi prima nel vassoio", "Review first in the tray")}</fieldset>`;
}
function setAutomation(ctx, value) {
  ctx.commit(
    value === "automatic"
      ? ctx.t("Danni degli attacchi: applica subito", "Attack damage: apply at once")
      : ctx.t("Danni degli attacchi: rivedi prima", "Attack damage: review first"),
    (draft) =>
      CS.setRule(
        draft,
        draft.ext["campaign-settings"],
        draft.campaign?.id,
        "automation",
        value,
        ctx.role,
        { reason: "" },
      ),
    { visibility: "private", undoable: false },
  );
}
/** The DM's global damage tray (Effective Tray): every pending application and proposal. */
export function openDmTray(ctx, { attemptId = null } = {}) {
  if (ctx.role !== "dm") return;
  const applied = attemptId
    ? (ctx.state.combatAttempts ?? []).find((a) => a.id === attemptId)
    : null;
  const pendingRows = D.trayRows(ctx.state, ctx.role);
  const done =
    applied && !pendingRows.some((r) => r.attemptId === attemptId)
      ? (applied.outcomes ?? []).filter((o) => ctx.state.actors[o.actorId])
      : [];
  const body = () =>
    `<div class="dt-global" data-dt-global>${automationHTML(ctx)}${
      done.length
        ? `<section class="dt-card"><header><strong>${ctx.t("Già applicato", "Already applied")}</strong></header><p class="muted">${ctx.t("Per correggere un bersaglio apri i suoi punti ferita: Annulla o Riapplica la voce.", "To correct a target open its hit points: Undo or Reapply the entry.")}</p><div class="toolbar">${done.map((o) => `<button type="button" class="button" data-dt-open-hp="${attr(ctx, o.actorId)}">${ctx.esc(ctx.state.actors[o.actorId].name)} · ${ctx.t("Punti ferita…", "Hit points…")}</button>`).join("")}</div></section>`
        : ""
    }${
      pendingRows.length || D.pendingProposals(ctx.state).length
        ? renderTray(ctx)
        : `<p class="empty-state">${ctx.t("Niente da applicare e nessuna proposta in attesa.", "Nothing to apply and no proposal waiting.")}</p>`
    }</div>`;
  ui.globalTray = true;
  ctx.dialog(ctx.t("Vassoio dei danni", "Damage tray"), body(), {
    cancelLabel: ctx.t("Chiudi", "Close"),
  });
  const bindGlobal = () => {
    const node = globalThis.document?.querySelector?.("#dialog[open] [data-dt-global]");
    if (!node) return;
    bindTray(node, ctx);
    node.querySelectorAll("[data-dt-automation]").forEach((input) =>
      input.addEventListener("change", () => {
        try {
          setAutomation(ctx, input.value);
        } catch (error) {
          ctx.toast(errorText(ctx, error), true);
        }
        redraw(ctx);
      }),
    );
    node
      .querySelectorAll("[data-dt-open-hp]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          openHpDialog(ctx, button.dataset.dtOpenHp, "tracker"),
        ),
      );
  };
  bindGlobal();
  ui.refreshGlobal = () => {
    const node = globalThis.document?.querySelector?.("#dialog[open] [data-dt-global]");
    if (!node) return;
    node.outerHTML = body();
    bindGlobal();
  };
  globalThis.document?.querySelector?.("#dialog")?.addEventListener(
    "close",
    () => {
      ui.globalTray = false;
      ui.refreshGlobal = null;
    },
    { once: true },
  );
}

// ---------------------------------------------------------------- the HP dialog (token, tracker)

export function openHpDialog(ctx, actorId, surface = "token", { correct = false } = {}) {
  const actor = ctx.state.actors?.[actorId];
  if (!actor) return;
  // PG-21: the sheet's HP numbers open this dialog on «Correggi» (D&D Beyond HP box).
  if (correct) ui.openCorrect = actorId;
  if (!canManage(ctx, actor) && !canPropose(ctx, actor)) {
    ctx.toast(
      ctx.t(
        "Non puoi gestire i punti ferita di questa creatura.",
        "You cannot manage this creature’s hit points.",
      ),
      true,
    );
    return;
  }
  ui.dialog = { actorId, surface };
  const title = () =>
    canManage(ctx, ctx.state.actors[actorId])
      ? ctx.t(
          `Punti ferita · ${ctx.state.actors[actorId].name}`,
          `Hit points · ${ctx.state.actors[actorId].name}`,
        )
      : ctx.t(
          `Proponi al DM · ${ctx.state.actors[actorId].name}`,
          `Propose to the DM · ${ctx.state.actors[actorId].name}`,
        );
  ctx.dialog(
    title(),
    `<div class="dt-dialog" data-dt-dialog>${hpWidgetHTML(ctx, actorId, { surface })}</div>`,
    {
      cancelLabel: ctx.t("Chiudi", "Close"),
    },
  );
  const host = () => globalThis.document?.querySelector?.("#dialog[open] [data-dt-dialog]");
  const node = host();
  if (node) bindHpWidget(node, ctx);
  // A dialog closed just before this one opened (the conditions panel's «Punti ferita…»)
  // dispatches its `close` later, in the same <dialog>: only a close that leaves it closed
  // is this dialog's own; before, the HP dialog stopped redrawing after a change.
  const dialogEl = globalThis.document?.querySelector?.("#dialog");
  const onClose = () => {
    if (dialogEl?.open) return;
    dialogEl?.removeEventListener?.("close", onClose);
    if (ui.dialog?.actorId === actorId) ui.dialog = null;
    if (ui.openCorrect === actorId) ui.openCorrect = null;
  };
  dialogEl?.addEventListener?.("close", onClose);
  globalThis.document
    ?.querySelector?.(correct ? '#dialog [data-dt-fix="hp"]' : "#dialog [data-dt-amount]")
    ?.focus?.();
}
// After a change the open HP dialog is drawn again in place (the page render keeps it).
ui.refreshDialog = (ctx) => {
  if (!ui.dialog) return;
  const node = globalThis.document?.querySelector?.("#dialog[open] [data-dt-dialog]");
  if (!node) return;
  node.innerHTML = hpWidgetHTML(ctx, ui.dialog.actorId, { surface: ui.dialog.surface });
  bindHpWidget(node, ctx);
};
// The Undo dialog replaces the HP dialog; after it, the HP dialog comes back.
ui.reopen = (ctx, back) => openHpDialog(ctx, back.actorId, back.surface);
// The sheet's compact box opens the full widget (D&D Beyond's HP sidebar).
ui.open = (ctx, actorId, surface) => openHpDialog(ctx, actorId, surface);

// ---------------------------------------------------------------- map visuals (DDB-143)

function tokenStatesOn(ctx) {
  return ctx.registry?.getSetting?.(ctx, D.SETTING_KEYS.tokenStates) !== false;
}
export function statesLayer(ctx, tableView) {
  const scene = tableView?.scene;
  if (!scene) return "";
  const slice = ctx.state.ext?.["token-menu"] ?? null;
  const policy = policyOf(ctx.state.ext?.["campaign-settings"], ctx.state.campaign?.id);
  const on = tokenStatesOn(ctx);
  return (scene.tokens ?? [])
    .map((token) => {
      const actor = ctx.state.actors[token.actorId];
      if (!actor || !observesToken(ctx.state, token, ctx.role)) return "";
      const state = D.healthState(actor);
      if (!state || state === "down") return "";
      const enemy = isEnemyFor(ctx.state, actor, ctx.role);
      if (
        !D.showsHealthState(ctx.state, actor, ctx.role, {
          tokenStates: on,
          enemyHp: enemy ? policy.enemyHp : "exact",
        })
      )
        return "";
      const r = 27 * sizeScale(displaySize(ctx.state, slice, token));
      const label = ctx.label(D.HEALTH_LABEL[state]);
      const shape =
        state === "bloodied"
          ? `<circle r="${r}" class="dt-ring"/><path class="dt-drop" transform="translate(${-r * 0.72},${-r * 0.72})" d="M0 -7 C4 -1 6 2 6 5 A6 6 0 0 1 -6 5 C-6 2 -4 -1 0 -7Z"/>`
          : `<circle r="${r - 3}" class="dt-dead-veil"/><path class="dt-dead-mark" d="M${-r * 0.45} ${-r * 0.45} L${r * 0.45} ${r * 0.45} M${r * 0.45} ${-r * 0.45} L${-r * 0.45} ${r * 0.45}"/>`;
      return `<g class="dt-token-state is-${state}" data-dt-token-state="${attr(ctx, actor.id)}" data-state="${state}" transform="translate(${token.x},${token.y})" pointer-events="none"><g class="token-display"><title>${ctx.esc(actor.name)}: ${ctx.esc(label)}</title>${shape}</g></g>`;
    })
    .join("");
}

// On the map, above each target with damage waiting: the amount Apply would apply now
// (after defenses and the multiplier chosen in the tray), like B20's pill it replaces.
export function readyPillsLayer(ctx, tableView) {
  const scene = tableView?.scene;
  if (!scene) return "";
  const waiting = new Map();
  for (const row of D.trayRows(ctx.state, ctx.role)) {
    const chips = row.type ? D.chipsFor(D.defensesOf(ctx.state, row.actorId), row.type) : [];
    const amount = D.adjustDamage(row.base, chips, domainDecision(row.key), {
      darts: row.darts,
    }).amount;
    waiting.set(row.actorId, (waiting.get(row.actorId) ?? 0) + amount);
  }
  const slice = ctx.state.ext?.["token-menu"] ?? null;
  return (scene.tokens ?? [])
    .filter((token) => waiting.has(token.actorId))
    .map((token) => {
      const text = ctx.t(
        `${waiting.get(token.actorId)} da applicare`,
        `${waiting.get(token.actorId)} to apply`,
      );
      const scale = sizeScale(displaySize(ctx.state, slice, token));
      const width = Math.max(56, text.length * 7 + 16);
      return `<g class="dt-ready-pill" data-dt-ready-pill="${attr(ctx, token.actorId)}" transform="translate(${token.x},${token.y})" pointer-events="none"><g class="token-display"><g transform="translate(0,${-(50 * scale) - 12})"><rect x="${-width / 2}" y="-10" width="${width}" height="20" rx="10"/><text y="4" text-anchor="middle">${ctx.esc(text)}</text></g></g></g>`;
    })
    .join("");
}

// ---------------------------------------------------------------- notifications (bell)

function collect(ctx) {
  const out = [];
  if (ctx.role === "dm")
    for (const p of D.pendingProposals(ctx.state)) {
      const actor = ctx.state.actors[p.actorId];
      if (!actor) continue;
      out.push({
        id: `dt-prop-${p.id}`,
        title:
          p.kind === "condition"
            ? L(
                `Proposta: ${D.conditionName(p.conditionId).it} a ${actor.name}`,
                `Proposal: ${D.conditionName(p.conditionId).en} to ${actor.name}`,
              )
            : L(
                `Proposta: ${p.kind === "heal" ? "cura" : "danno"} ${p.amount} a ${actor.name}`,
                `Proposal: ${p.kind === "heal" ? "healing" : "damage"} ${p.amount} to ${actor.name}`,
              ),
        body: p.note
          ? L(`«${p.note}»`, `“${p.note}”`)
          : L("Accetta o rifiuta da qui.", "Accept or decline from here."),
        time: p.at,
        category: "requests",
        target: { page: "table", params: {} },
        // TV-69 (Improved Initiative / Effective Tray): answered from the bell in one click.
        actions: [
          {
            id: "accept",
            primary: true,
            label: L("Accetta e applica", "Accept and apply"),
            run: (c) => acceptProposal(c, p.id),
          },
          { id: "decline", label: L("Rifiuta…", "Decline…"), run: (c) => openDecline(c, p.id) },
          {
            id: "tray",
            label: L("Apri il vassoio", "Open the tray"),
            run: (c) => openDmTray(c),
          },
        ],
      });
    }
  else
    for (const p of D.proposalsFor(ctx.state, ctx.role)) {
      if (!["accepted", "declined"].includes(p.status)) continue;
      const actor = ctx.state.actors[p.actorId];
      // The applied amount (after defenses) only where this viewer reads the HP.
      const amountShown =
        p.kind === "condition" || (actor && canReadVitals(ctx.state, actor, ctx.role));
      out.push({
        id: `dt-answer-${p.id}-${p.status}`,
        title:
          p.status === "accepted" && !amountShown
            ? L(
                `Il DM ha accettato la proposta per ${actor?.name ?? ""}`,
                `The DM accepted the proposal for ${actor?.name ?? ""}`,
              )
            : p.status === "accepted"
              ? L(
                  `Il DM ha accettato: ${p.kind === "condition" ? D.conditionName(p.conditionId).it : (p.answer?.amount ?? p.amount)} a ${actor?.name ?? ""}`,
                  `The DM accepted: ${p.kind === "condition" ? D.conditionName(p.conditionId).en : (p.answer?.amount ?? p.amount)} to ${actor?.name ?? ""}`,
                )
              : L(
                  `Il DM ha rifiutato la proposta per ${actor?.name ?? ""}`,
                  `The DM declined the proposal for ${actor?.name ?? ""}`,
                ),
        body: p.answer?.reason ? L(p.answer.reason, p.answer.reason) : undefined,
        time: p.answer?.at,
        category: "requests",
        target: { page: "table", params: {} },
      });
    }
  return out;
}

// ---------------------------------------------------------------- registration

let unadjust = null;
export function resetDamageView() {
  resetWidgetView();
}
export function register(registry) {
  registry.registerStateSlice(D.ID, {
    version: D.VERSION,
    seed: D.seedSlice,
    normalize: D.normalizeSlice,
  });
  registry.registerStyles(new URL("./damage.css", import.meta.url));
  // Creature tab: the tray first (whatever creature is selected), then the widget.
  registry.add("table-panel", {
    id: "damage-tray",
    // Same name as B20's list it replaces, so its bell notice and rule help stay true.
    label: L("Da applicare", "To apply"),
    placement: "inspector",
    order: 3,
    when: (ctx) =>
      D.trayRows(ctx.state, ctx.role).length > 0 ||
      (ctx.role === "dm" && D.pendingProposals(ctx.state).length > 0),
    render: (ctx) => renderTray(ctx),
    bind: (el, ctx) => bindTray(el, ctx),
  });
  registry.add("table-panel", {
    id: "damage-tray-hp",
    label: L("Punti ferita", "Hit points"),
    placement: "inspector",
    order: 4,
    when: (ctx, tableView) => {
      const actor = ctx.state.actors?.[tableView?.selectedActorId];
      return canManage(ctx, actor) || canPropose(ctx, actor);
    },
    render: (ctx, tableView) => hpWidgetHTML(ctx, tableView.selectedActorId, { surface: "token" }),
    bind: (el, ctx) => bindHpWidget(el, ctx),
  });
  registry.add("token-menu", {
    id: "damage-tray-hp",
    label: L("Punti ferita…", "Hit points…"),
    group: "damage-tray",
    when: (ctx, target) => {
      const actor = ctx.state.actors?.[target?.actorId];
      return canManage(ctx, actor) || canPropose(ctx, actor);
    },
    run: (ctx, target) => openHpDialog(ctx, target.actorId, target.surface ?? "token"),
  });
  // PG-21: one HP control, found by what people search («PF», «punti ferita», «correggi»,
  // «cura», «danno»): the sheet's HP numbers run it on «Correggi»; from the palette it opens
  // the character on screen, else the selected token.
  registry.add("command", {
    id: "damage-tray.hp",
    label: L("Punti ferita: cura, danno, correggi…", "Hit points: heal, damage, correct…"),
    description: L(
      "PF, punti ferita, correggi PF, cura, danno, PF temporanei, massimo, registro PF, colpo critico.",
      "HP, hit points, correct HP, heal, damage, temporary HP, maximum, HP log, critical hit.",
    ),
    group: "damage-tray",
    run: (ctx, target = {}) => {
      const actorId =
        target?.actorId ??
        (ctx.view?.page === "characters" ? ctx.view?.id : null) ??
        ctx.table?.selectedActorId ??
        null;
      if (!actorId)
        throw Object.assign(Error("Choose a creature"), {
          it: "Apri una scheda o seleziona una pedina.",
          en: "Open a sheet or select a token.",
        });
      openHpDialog(ctx, actorId, target?.surface ?? "sheet", {
        correct: target?.mode === "correct",
      });
    },
  });
  registry.add("command", {
    id: "damage-tray.global",
    label: L("Vassoio dei danni e proposte dei giocatori", "Damage tray and player proposals"),
    description: L(
      "Danni da applicare, proposte, accetta, rifiuta, resistenze, moltiplicatore, dimezza, raddoppia, applica subito o rivedi prima.",
      "Damage to apply, proposals, accept, decline, resistances, multiplier, halve, double, apply at once or review first.",
    ),
    roles: ["dm"],
    group: "damage-tray",
    run: (ctx) => openDmTray(ctx),
  });
  // TV-68: every damage card in the log reaches the tray (dnd5e damage tray on the card).
  registry.on("chat:roll-action", (payload, { ctx }) => {
    if (ctx && payload?.action === "damage-tray") openDmTray(ctx, { attemptId: payload.id });
  });
  // Rendered inside the sheet's HP card by characters.mjs (pseudo tab "vitals").
  registry.add("sheet-section", {
    id: "damage-tray-sheet",
    tab: "vitals",
    label: L("Punti ferita", "Hit points"),
    when: (ctx, actor) => {
      const canonical = ctx.state.actors?.[actor?.id];
      return canManage(ctx, canonical) || canPropose(ctx, canonical);
    },
    render: (ctx, actor) => hpWidgetHTML(ctx, actor.id, { surface: "sheet", compact: true }),
    bind: (el, ctx) => bindHpWidget(el, ctx),
  });
  registry.add("map-layer", {
    id: "damage-tray-states",
    label: L("Sanguinante e Morto", "Bloodied and Dead"),
    order: 61,
    svg: (ctx, tableView) => statesLayer(ctx, tableView),
  });
  registry.add("map-layer", {
    id: "damage-tray-ready",
    label: L("Danni da applicare", "Damage to apply"),
    order: 65,
    svg: (ctx, tableView) => readyPillsLayer(ctx, tableView),
  });
  registry.add("notifications", {
    id: "damage-tray-proposals",
    label: L("Proposte di danni e cure", "Damage and healing proposals"),
    collect,
  });
  registry.add("settings", {
    id: D.SETTINGS_ID,
    label: L("Danni e punti ferita", "Damage and hit points"),
    scope: "campaign",
    roles: ["dm"],
    fields: [
      {
        id: "token-states",
        label: L(
          "I giocatori vedono Sanguinante e Morto sulle pedine delle tue creature",
          "Players see Bloodied and Dead on your creatures’ tokens",
        ),
        type: "boolean",
        default: true,
      },
      {
        id: "suggestions",
        label: L(
          "I giocatori possono proporti danni e cure",
          "Players can propose damage and healing to you",
        ),
        type: "boolean",
        default: true,
      },
    ],
  });
  registry.on("role-changed", resetDamageView);
  registry.on("reset", resetDamageView);
  registry.on("navigate", (payload) => {
    if (payload?.page !== payload?.from) ui.dialog = null;
  });
  // The combat seam: damage applied without a tray decision gets the target's defenses.
  if (!unadjust) unadjust = adjustDamageWith(D.automaticAdjust);
}
export { healthBadge };
