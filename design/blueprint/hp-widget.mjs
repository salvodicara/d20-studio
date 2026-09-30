// B33 — the one hit point widget (D&D Beyond DDB-032 on the sheet, DDB-142 on the token and
// in the tracker): current/maximum/temporary HP, one amount between Heal and Damage, an
// optional damage type with the target's defense chips (dnd5e FVT-139, Shieldmaiden
// CMP-173), Temporary HP and a maximum modifier with its note, the creature's HP log with a
// targeted Undo and Reapply (Foundry Damage Log FVT-144) and, for players, "Propose to the
// DM" (Improved Initiative VTL-129). The same markup and handlers serve every surface. On the
// sheet (`compact`) the HP card holds D&D Beyond's box (Heal, amount, Damage) and the full
// widget opens as its "HP sidebar": the same dialog as the token menu and the tracker.
import * as D from "./damage-domain.mjs";
import { canReadVitals } from "./conditions.mjs";
import { canControlActor } from "./character-access.mjs";
import { parseHpInput, applyHp } from "./token-menu.mjs";

const L = (it, en) => ({ it, en });

// ---------------------------------------------------------------- view state (per browser)

export const ui = {
  decisions: new Map(), // key → {multiplier, off: [], downgrade: {reason} | null, downgradeOpen}
  types: new Map(), // actorId → damage type chosen in the widget
  status: new Map(), // actorId → {text, error}
  proposeKind: new Map(), // actorId → "damage" | "heal"
  amounts: new Map(), // actorId → the amount typed and not yet applied (kept across redraws)
  notes: new Map(), // actorId → the cause typed for the next damage or healing (PG-22)
  criticals: new Set(), // actorIds whose next damage is from a Critical Hit (PG-22)
  fixes: new Map(), // actorId → {hp, maxHp, tempHp, reason} typed in «Correggi» (PG-21)
  logAll: new Set(), // actorIds whose HP log shows every entry
  focus: null, // selector focused after the next bind
  dialog: null, // {actorId, surface} while the HP dialog is open
  refreshDialog: null, // redraws the open HP dialog after a change
};
export function resetWidgetView() {
  ui.decisions.clear();
  ui.types.clear();
  ui.status.clear();
  ui.proposeKind.clear();
  ui.amounts.clear();
  ui.notes.clear();
  ui.criticals.clear();
  ui.fixes.clear();
  ui.openCorrect = null;
  ui.logAll.clear();
  ui.focus = null;
  ui.dialog = null;
}
export const decisionOf = (key) =>
  ui.decisions.get(key) ?? { multiplier: 1, off: [], downgrade: null };
export function setDecision(key, patch) {
  ui.decisions.set(key, { ...decisionOf(key), ...patch });
}
/** The decision handed to the domain: a downgrade counts only once it is confirmed open. */
export function domainDecision(key) {
  const d = decisionOf(key);
  return {
    multiplier: d.multiplier ?? 1,
    off: [...(d.off ?? [])],
    downgrade: d.downgradeOpen ? { reason: d.downgradeReason ?? "" } : null,
  };
}

// ---------------------------------------------------------------- small helpers

export const errorText = (ctx, error) =>
  ctx.label(error?.it ? { it: error.it, en: error.en } : String(error?.message ?? error));
export const attr = (ctx, value) => ctx.esc(String(value ?? ""));
const signed = (n) => (n > 0 ? "+" + n : n < 0 ? "−" + Math.abs(n) : "0");
export function canManage(ctx, actor) {
  return (
    !!actor &&
    canReadVitals(ctx.state, actor, ctx.role) &&
    canControlActor(actor, ctx.role, ctx.state) &&
    (ctx.canControl ? ctx.canControl(actor) : true)
  );
}
export function suggestionsAllowed(ctx) {
  return ctx.registry?.getSetting?.(ctx, D.SETTING_KEYS.suggestions) !== false;
}
/** A player may propose to the DM for a creature they see on the active scene or play:
 * the same rule the domain applies when the proposal is sent. */
export function canPropose(ctx, actor) {
  if (!actor || ctx.role === "dm" || !suggestionsAllowed(ctx)) return false;
  return D.observes(ctx.state, actor, ctx.role);
}
export function sourceText(ctx, source) {
  if (!source) return "";
  const pages = (lang) => source?.[lang]?.pages ?? source.pages ?? [];
  if (source.kind === "srd")
    return `SRD 5.2.1 · EN ${pages("en").join(", ")} / IT ${pages("it").join(", ")}`;
  if (source.kind === "dm-record") return ctx.t("Registrate dal DM", "Recorded by the DM");
  return ctx.esc(source.kind);
}
const typeName = (ctx, type) => ctx.label(D.typeLabel(type));
export const healthBadge = (ctx, actor) => {
  const state = D.healthState(actor);
  return state
    ? `<span class="dt-state is-${state}" data-dt-state="${state}">${ctx.label(D.HEALTH_LABEL[state])}</span>`
    : "";
};

// ---------------------------------------------------------------- chips and multipliers

function chipTitle(ctx, chip) {
  const rule = `SRD 5.2.1 EN 17 / IT 19`;
  const from = chip.all
    ? ctx.t(
        "da Pietrificato: resistenza a tutti i danni",
        "from Petrified: resistance to all damage",
      )
    : sourceText(ctx, chip.source);
  return `${from}${from ? " · " : ""}${ctx.t("regola", "rule")} ${rule}`;
}
/** dnd5e chips: each defense toggles; an immunity can be downgraded with a reason. */
export function chipsHTML(ctx, key, chips) {
  if (!chips.length) return "";
  const d = decisionOf(key);
  const off = new Set(d.off ?? []);
  const items = chips.map((chip) => {
    const on = !off.has(chip.kind);
    const downgraded = chip.kind === "immunity" && on && d.downgradeOpen;
    const label = downgraded
      ? ctx.t("Immunità → resistenza", "Immunity → resistance")
      : ctx.label(D.DEFENSE_LABEL[chip.kind]);
    return `<button type="button" class="dt-chip is-${chip.kind}${downgraded ? " is-downgraded" : ""}" data-dt-chip="${chip.kind}" data-dt-key="${attr(ctx, key)}" aria-pressed="${on}" title="${attr(ctx, chipTitle(ctx, chip))}"><span>${label}</span> · ${ctx.esc(chip.all ? ctx.t("tutti i danni", "all damage") : typeName(ctx, chip.type))}</button>`;
  });
  const immunity = chips.find((c) => c.kind === "immunity") && !off.has("immunity");
  const downgrade = immunity
    ? `<button type="button" class="text-button dt-downgrade" data-dt-downgrade data-dt-key="${attr(ctx, key)}" aria-expanded="${!!d.downgradeOpen}">${d.downgradeOpen ? ctx.t("Annulla declassamento", "Cancel downgrade") : ctx.t("Declassa a resistenza…", "Downgrade to resistance…")}</button>${d.downgradeOpen ? `<label class="field dt-downgrade-reason">${ctx.t("Motivo del declassamento (obbligatorio)", "Reason for the downgrade (required)")}<input data-dt-downgrade-reason data-dt-key="${attr(ctx, key)}" maxlength="${D.MAX_NOTE}" autocomplete="off" value="${attr(ctx, d.downgradeReason ?? "")}"></label>` : ""}`
    : "";
  return `<div class="dt-chips" role="group" aria-label="${ctx.t("Difese del bersaglio (clic per disattivare)", "Target defenses (click to turn off)")}">${items.join("")}${downgrade}</div>`;
}
export function multipliersHTML(ctx, key) {
  const d = decisionOf(key);
  return `<div class="dt-mult" role="group" aria-label="${ctx.t("Moltiplicatore del danno", "Damage multiplier")}">${D.MULTIPLIERS.map((m) => `<button type="button" class="dt-mult-button" data-dt-mult="${m}" data-dt-key="${attr(ctx, key)}" aria-pressed="${(d.multiplier ?? 1) === m}" aria-label="${ctx.t("Moltiplica", "Multiply")} ${D.multiplierText(m)}">${D.multiplierText(m)}</button>`).join("")}</div>`;
}
/** "5 → resistance 2" in words, one step per rule applied. */
export function stepsText(ctx, adjusted) {
  const name = {
    multiplier: (s) => D.multiplierText(s.factor),
    immunity: () => ctx.t("immunità", "immunity"),
    resistance: () => ctx.t("resistenza", "resistance"),
    downgrade: () => ctx.t("immunità declassata", "downgraded immunity"),
    vulnerability: () => ctx.t("vulnerabilità", "vulnerability"),
  };
  // Magic Missile darts are separate instances: each dart is adjusted alone and rounded
  // down alone, so the explanation adds up the darts instead of halving the total.
  if (adjusted.perDart && adjusted.darts?.length && adjusted.steps.length > 1)
    return `${adjusted.steps[0].value} → ${adjusted.steps
      .slice(1)
      .map((step) => name[step.kind](step))
      .join(", ")} ${ctx.t("per dardo", "per dart")} ${adjusted.darts
      .map((dart) => dart.total)
      .join(" + ")} = ${adjusted.amount}`;
  return adjusted.steps
    .map((step, i) => (i === 0 ? String(step.value) : `${name[step.kind](step)} ${step.value}`))
    .join(" → ");
}

// ---------------------------------------------------------------- widget markup

function numbersHTML(ctx, actor) {
  const temp = Number.isInteger(actor.tempHp) ? actor.tempHp : 0;
  const pct =
    Number.isInteger(actor.maxHp) && actor.maxHp > 0
      ? Math.max(0, Math.min(100, (100 * actor.hp) / actor.maxHp))
      : 0;
  return `<p class="dt-hp-numbers"><span class="dt-hp-current"><strong data-dt-hp-value>${ctx.esc(actor.hp ?? "?")}</strong> / <span data-dt-hp-max>${ctx.esc(actor.maxHp ?? "?")}</span> ${ctx.t("PF", "HP")}</span>${temp ? ` <span class="dt-temp" data-dt-temp-value>+${temp} ${ctx.t("temporanei", "temporary")}</span>` : ""} ${healthBadge(ctx, actor)}</p><div class="dt-bar" aria-hidden="true"><span style="width:${pct}%"></span>${temp ? `<i style="width:${Math.min(100, (100 * temp) / Math.max(1, actor.maxHp ?? 1))}%"></i>` : ""}</div>`;
}
function typeSelectHTML(ctx, actorId, key) {
  const type = ui.types.get(key) ?? "";
  return `<label class="field dt-type">${ctx.t("Tipo di danno", "Damage type")}<select data-dt-type="${attr(ctx, key)}" data-dt-actor="${attr(ctx, actorId)}"><option value="">${ctx.t("Senza tipo", "No type")}</option>${D.DAMAGE_TYPES.map((t) => `<option value="${t}"${t === type ? " selected" : ""}>${ctx.esc(typeName(ctx, t))}</option>`).join("")}</select></label>`;
}
/**
 * What else a damage or a healing carries (PG-22; Roll20 and D&D Beyond keep one field
 * between Heal and Damage and the rest aside): its cause, kept in the HP log, and a Critical
 * Hit, which at 0 HP counts two death save failures (SRD 5.2.1 EN 18 / IT 20).
 */
function causeHTML(ctx, actor) {
  const id = attr(ctx, actor.id);
  return `<div class="dt-field-row dt-cause"><label class="field dt-grow">${ctx.t("Causa (facoltativa, resta nel registro)", "Cause (optional, kept in the log)")}<input data-dt-note="${id}" maxlength="${D.MAX_NOTE}" autocomplete="off" value="${attr(ctx, ui.notes.get(actor.id) ?? "")}" placeholder="${attr(ctx, ctx.t("per esempio: trappola a dardi", "for example: dart trap"))}"></label><label class="check-field dt-critical"><input type="checkbox" data-dt-critical="${id}"${ui.criticals.has(actor.id) ? " checked" : ""}> ${ctx.t("Colpo critico (a 0 PF conta due fallimenti)", "Critical Hit (at 0 HP it counts two failures)")}</label></div>`;
}
/**
 * «Correggi» (PG-21; D&D Beyond: click the HP and correct them in place, with the reason):
 * current, maximum and temporary HP in one correction with a required reason, logged in the
 * one HP log below with its Undo. Not damage: a fall to 0 HP is recorded with Damage.
 */
function correctHTML(ctx, actor) {
  const f = ui.fixes.get(actor.id) ?? {};
  const value = (key) => attr(ctx, f[key] ?? actor[key] ?? "");
  return `<details class="dt-more dt-correct" data-dt-details="correct"${ui.openCorrect === actor.id ? " open" : ""}><summary>${ctx.t("Correggi i punti ferita", "Correct hit points")}</summary><div class="dt-more-body"><p class="muted">${ctx.t("Per un errore di conteggio: non è danno né cura. Il motivo resta nel registro PF, con Annulla.", "For a counting mistake: it is neither damage nor healing. The reason stays in the HP log, with Undo.")}</p><div class="dt-field-row"><label class="field">${ctx.t("PF attuali", "Current HP")}<input data-dt-fix="hp" type="text" inputmode="numeric" autocomplete="off" maxlength="40" value="${value("hp")}"></label><label class="field">${ctx.t("PF massimi", "Maximum HP")}<input data-dt-fix="maxHp" type="text" inputmode="numeric" autocomplete="off" maxlength="40" value="${value("maxHp")}"></label><label class="field">${ctx.t("PF temporanei", "Temporary HP")}<input data-dt-fix="tempHp" type="text" inputmode="numeric" autocomplete="off" maxlength="40" value="${attr(ctx, f.tempHp ?? actor.tempHp ?? 0)}"></label></div><label class="field">${ctx.t("Motivo della correzione (obbligatorio)", "Reason for the correction (required)")}<input data-dt-fix="reason" maxlength="${D.MAX_NOTE}" autocomplete="off" value="${attr(ctx, f.reason ?? "")}" placeholder="${attr(ctx, ctx.t("per esempio: avevo contato male la trappola", "for example: I miscounted the trap"))}"></label><button type="button" class="button" data-dt-fix-apply>${ctx.t("Correggi", "Correct")}</button></div></details>`;
}
function tempHTML(ctx, actor) {
  const temp = Number.isInteger(actor.tempHp) ? actor.tempHp : 0;
  const mods = D.activeMaxMods(ctx.state, actor.id);
  const base = (actor.maxHp ?? 0) - mods.reduce((sum, m) => sum + m.delta, 0);
  return `<details class="dt-more" data-dt-details="temp"><summary>${ctx.t("PF temporanei e massimo", "Temporary HP and maximum")}</summary><div class="dt-more-body"><div class="dt-field-row"><label class="field">${ctx.t("PF temporanei", "Temporary HP")}<input data-dt-temp type="number" min="0" max="${D.MAX_AMOUNT}" step="1" inputmode="numeric" value="" placeholder="${temp}"></label>${temp ? `<fieldset class="dt-choice"><legend>${ctx.t(`Ne hai già ${temp}: non si sommano`, `You already have ${temp}: they do not stack`)}</legend><label><input type="radio" name="dt-temp-choice-${attr(ctx, actor.id)}" value="replace" data-dt-temp-choice checked> ${ctx.t("Prendi i nuovi", "Take the new ones")}</label><label><input type="radio" name="dt-temp-choice-${attr(ctx, actor.id)}" value="keep" data-dt-temp-choice> ${ctx.t(`Tieni i ${temp} attuali`, `Keep the current ${temp}`)}</label></fieldset>` : ""}<button type="button" class="button" data-dt-temp-set>${ctx.t("Imposta", "Set")}</button></div><p class="muted dt-rule">${ctx.t("Assorbono i danni per primi; la cura non li aggiunge né li ripristina (SRD EN 18 / IT 20).", "They absorb damage first; healing neither adds nor restores them (SRD EN 18 / IT 20).")}</p><p class="dt-max-line">${ctx.t("Massimo", "Maximum")}: <strong data-dt-max-value>${ctx.esc(actor.maxHp ?? "?")}</strong>${mods.length ? ` <small>(${ctx.t("base", "base")} ${base})</small>` : ""}</p>${mods.length ? `<ul class="dt-mods">${mods.map((m) => `<li data-dt-mod="${attr(ctx, m.id)}"><span><strong>${signed(m.delta)}</strong> · ${ctx.esc(m.note)}</span><button type="button" class="button quiet" data-dt-mod-remove="${attr(ctx, m.id)}" aria-label="${attr(ctx, ctx.t(`Togli la modifica ${signed(m.delta)} (${m.note})`, `Remove the ${signed(m.delta)} modifier (${m.note})`))}">${ctx.t("Togli", "Remove")}</button></li>`).join("")}</ul>` : ""}<div class="dt-field-row"><label class="field">${ctx.t("Massimo ±", "Maximum ±")}<input data-dt-max-delta type="number" step="1" inputmode="numeric" placeholder="+5 / -3"></label><label class="field dt-grow">${ctx.t("Nota (obbligatoria)", "Note (required)")}<input data-dt-max-note maxlength="${D.MAX_NOTE}" autocomplete="off" placeholder="${attr(ctx, ctx.t("per esempio Aiuto, 2° livello", "for example Aid, level 2"))}"></label><button type="button" class="button" data-dt-max-apply>${ctx.t("Applica al massimo", "Apply to maximum")}</button></div></div></details>`;
}
const ORIGIN = {
  sheet: L("widget PF della scheda", "sheet HP widget"),
  token: L("widget PF della pedina", "token HP widget"),
  tracker: L("widget PF del tracker", "tracker HP widget"),
  proposal: L("proposta del giocatore accettata", "player proposal accepted"),
};
// What caused an entry, once: the attack, the defenses applied, then where it was typed
// and its note (this area's record) or the reason another surface recorded.
function entryText(ctx, entry) {
  const parts = [];
  if (entry.combat)
    parts.push(
      `${ctx.esc(ctx.label(entry.combat.actionName))}${entry.combat.sourceName ? ` (${ctx.esc(entry.combat.sourceName)})` : ""}`,
    );
  if (entry.adjustment) parts.push(ctx.esc(D.adjustmentText(entry.adjustment, ctx.lang)));
  else if (entry.manual?.type) parts.push(ctx.esc(typeName(ctx, entry.manual.type)));
  const manual = entry.manual;
  if (manual) {
    if (manual.kind === "reapply")
      parts.push(ctx.t("riapplicata dal registro", "reapplied from the log"));
    else if (manual.kind === "max")
      parts.push(`${ctx.t("massimo", "maximum")} ${signed(manual.delta)}`);
    else if (ORIGIN[manual.surface]) parts.push(ctx.label(ORIGIN[manual.surface]));
    if (manual.note) parts.push(`«${ctx.esc(manual.note)}»`);
  } else if (!entry.combat && entry.reason) parts.push(ctx.esc(entry.reason));
  return parts.join(" · ");
}
function deltaOf(entry) {
  if (entry.hp && Number.isInteger(entry.hp.before) && Number.isInteger(entry.hp.after))
    return entry.hp.after - entry.hp.before;
  return null;
}
const ENTRY_KIND = {
  damage: L("Danno", "Damage"),
  healing: L("Cura", "Healing"),
  "vitality-correct": L("Correzione", "Correction"),
  "temp-hp": L("PF temporanei", "Temporary HP"),
  roll: L("Esito del tiro", "Roll outcome"),
  recovered: L("Recupero", "Recovery"),
};
function rowText(ctx, row, name) {
  return row ? `${name} ${ctx.esc(row.before ?? "?")} → ${ctx.esc(row.after ?? "?")}` : "";
}
export function logHTML(ctx, actorId) {
  let entries;
  try {
    entries = D.hpLog(ctx.state, actorId, ctx.role);
  } catch {
    return "";
  }
  const all = ui.logAll.has(actorId);
  const items = (all ? entries : entries.slice(0, 12)).map((entry) => {
    const delta = deltaOf(entry);
    const kind = entry.revertOf
      ? L("Annullamento", "Undo")
      : (ENTRY_KIND[entry.kind] ?? L(entry.kind, entry.kind));
    const values = [
      rowText(ctx, entry.hp, ctx.t("PF", "HP")),
      rowText(ctx, entry.tempHp, ctx.t("temporanei", "temporary")),
      rowText(ctx, entry.maxHp, ctx.t("massimo", "maximum")),
      entry.dead?.after === true ? ctx.t("Morto", "Dead") : "",
    ]
      .filter(Boolean)
      .join(" · ");
    const status = entry.revert
      ? `<span class="dt-log-flag">${ctx.t("Annullata", "Undone")}${entry.revert.reason ? ": " + ctx.esc(entry.revert.reason) : ""}${entry.reapplied ? " · " + ctx.t("riapplicata", "reapplied") : ""}</span>`
      : "";
    // P1 PG-94 (Demiplane visible change author): who made the change; a DM entry is not
    // undone by the player from here (the DM corrects it, or the player asks).
    const author = (ctx.state.conditionEvents ?? []).find((event) => event.id === entry.id)?.owner;
    const byText =
      author === "dm"
        ? ctx.t("dal DM", "by the DM")
        : author && author !== "system"
          ? author === ctx.role
            ? ctx.t("da te", "by you")
            : ctx.t("dal giocatore", "by the player")
          : "";
    if (author === "dm" && ctx.role !== "dm") entry.canRevert = false;
    const commands = `${entry.canRevert ? `<button type="button" class="button quiet" data-dt-revert="${attr(ctx, entry.id)}" aria-label="${attr(ctx, ctx.t(`Annulla solo questa voce: ${ctx.label(kind)} ${values}`, `Undo only this entry: ${ctx.label(kind)} ${values}`))}">${ctx.t("Annulla", "Undo")}</button>` : ""}${entry.canReapply ? `<button type="button" class="button" data-dt-reapply="${attr(ctx, entry.id)}">${ctx.t("Riapplica", "Reapply")}</button>` : ""}`;
    return `<li class="dt-log-entry is-${entry.revertOf ? "undo" : entry.kind}${entry.revert ? " is-reverted" : ""}" data-dt-entry="${attr(ctx, entry.id)}"><span class="dt-log-delta" aria-hidden="true">${delta === null ? "·" : signed(delta)}</span><div class="dt-log-body"><span class="dt-log-title"><strong>${ctx.label(kind)}</strong>${entry.amount !== null && entry.kind !== "vitality-correct" ? ` ${ctx.esc(entry.amount)}` : ""}</span>${values ? `<small>${values}</small>` : ""}${byText ? `<small class="dt-log-by" data-dt-by="${attr(ctx, author)}">${byText}</small>` : ""}${entryText(ctx, entry) ? `<small class="dt-log-why">${entryText(ctx, entry)}</small>` : ""}${status}</div>${commands ? `<div class="dt-log-commands">${commands}</div>` : ""}</li>`;
  });
  return `<details class="dt-more" data-dt-details="log"${ui.openLog === actorId ? " open" : ""}><summary>${ctx.t("Registro PF", "HP log")} (${entries.length})</summary>${items.length ? `<ol class="dt-log" aria-label="${ctx.t("Cambi dei punti ferita, dal più recente", "Hit point changes, newest first")}">${items.join("")}</ol>${entries.length > 12 ? `<button type="button" class="button quiet dt-log-all" data-dt-log-all aria-expanded="${all}">${all ? ctx.t("Mostra solo le ultime 12", "Show only the latest 12") : ctx.t(`Mostra tutte le voci (${entries.length})`, `Show every entry (${entries.length})`)}</button>` : ""}` : `<p class="muted">${ctx.t("Nessun cambio dei PF registrato.", "No hit point change recorded.")}</p>`}</details>`;
}
function defensesHTML(ctx, actor) {
  const d = D.defensesOf(ctx.state, actor.id);
  const list = (items) => items.map((t) => typeName(ctx, t)).join(", ");
  const summary = D.hasAnyDefense(d)
    ? [
        d.resistances.length ? `${ctx.t("Resistenze", "Resistances")}: ${list(d.resistances)}` : "",
        d.immunities.length ? `${ctx.t("Immunità", "Immunities")}: ${list(d.immunities)}` : "",
        d.vulnerabilities.length
          ? `${ctx.t("Vulnerabilità", "Vulnerabilities")}: ${list(d.vulnerabilities)}`
          : "",
        d.allResistance
          ? ctx.t("Pietrificato: resistenza a tutti i danni", "Petrified: resistance to all damage")
          : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : ctx.t("Nessuna difesa ai danni registrata.", "No damage defense recorded.");
  const origin = {
    recorded: ctx.t("registrate dal DM", "recorded by the DM"),
    actor: ctx.t("dal blocco dell’incontro", "from the encounter block"),
    block: `${ctx.t("dal blocco SRD", "from the SRD block")} ${ctx.esc(ctx.label(d.blockName ?? ""))} · ${sourceText(ctx, d.source)}`,
    none: "",
  }[d.origin];
  if (ctx.role !== "dm")
    return D.hasAnyDefense(d)
      ? `<p class="dt-defenses muted" data-dt-defenses>${ctx.esc(summary)}</p>`
      : "";
  const boxes = (key, legend, chosen) =>
    `<fieldset class="dt-type-grid"><legend>${legend}</legend>${D.DAMAGE_TYPES.map((t) => `<label><input type="checkbox" data-dt-def="${key}" value="${t}"${chosen.includes(t) ? " checked" : ""}> ${ctx.esc(typeName(ctx, t))}</label>`).join("")}</fieldset>`;
  return `<details class="dt-more" data-dt-details="defenses"><summary>${ctx.t("Difese ai danni", "Damage defenses")}</summary><div class="dt-more-body"><p data-dt-defenses>${ctx.esc(summary)}${origin ? ` <small>(${origin})</small>` : ""}</p>${boxes("resistances", ctx.t("Resistenze", "Resistances"), d.resistances)}${boxes("immunities", ctx.t("Immunità", "Immunities"), d.immunities)}${boxes("vulnerabilities", ctx.t("Vulnerabilità", "Vulnerabilities"), d.vulnerabilities)}<label class="field">${ctx.t("Nota o fonte", "Note or source")}<input data-dt-def-note maxlength="${D.MAX_NOTE}" value="${attr(ctx, d.origin === "recorded" ? d.note : "")}"></label><div class="toolbar"><button type="button" class="button" data-dt-def-save>${ctx.t("Salva le difese", "Save defenses")}</button>${d.origin === "recorded" ? `<button type="button" class="button quiet" data-dt-def-clear>${ctx.t("Torna al blocco", "Back to the block")}</button>` : ""}</div><p class="muted dt-rule">${ctx.t("Resistenza dimezza, vulnerabilità raddoppia, immunità annulla; più resistenze contano una volta (SRD EN 17 / IT 19).", "Resistance halves, vulnerability doubles, immunity cancels; several resistances count once (SRD EN 17 / IT 19).")}</p></div></details>`;
}
/** "Damage 6 · Fire", "Healing 4" or "Condition: Prone" (Improved Initiative tag). */
export function proposalWhat(ctx, p) {
  if (p.kind === "condition")
    return `${ctx.t("Condizione", "Condition")}: ${ctx.esc(ctx.label(D.conditionName(p.conditionId)))}`;
  return `${p.kind === "heal" ? ctx.t("Cura", "Healing") : ctx.t("Danno", "Damage")} ${p.amount}${p.type ? " · " + ctx.esc(typeName(ctx, p.type)) : ""}`;
}
function proposalsHTML(ctx, actor, { open = false } = {}) {
  const mine = D.proposalsFor(ctx.state, ctx.role)
    .filter((p) => p.actorId === actor.id)
    .slice(-4)
    .reverse();
  const kind = ui.proposeKind.get(actor.id) ?? "damage";
  // The amount the DM applied after defenses says only what this viewer may read: on a DM
  // creature it would reveal a resistance or an immunity the DM may keep hidden.
  const readable = canReadVitals(ctx.state, actor, ctx.role);
  const status = (p) =>
    p.status === "pending"
      ? ctx.t("in attesa del DM", "waiting for the DM")
      : p.status === "accepted"
        ? p.kind === "condition"
          ? ctx.t(
              `accettata: ${ctx.label(D.conditionName(p.conditionId))} applicato`,
              `accepted: ${ctx.label(D.conditionName(p.conditionId))} applied`,
            )
          : readable
            ? ctx.t(
                `accettata: ${p.answer?.amount ?? p.amount} applicati`,
                `accepted: ${p.answer?.amount ?? p.amount} applied`,
              )
            : ctx.t("accettata dal DM", "accepted by the DM")
        : p.status === "declined"
          ? ctx.t("rifiutata", "declined") + (p.answer?.reason ? `: ${p.answer.reason}` : "")
          : ctx.t("ritirata", "withdrawn");
  const list = mine.length
    ? `<ul class="dt-proposals">${mine.map((p) => `<li class="is-${p.status}" data-dt-proposal="${attr(ctx, p.id)}"><span>${proposalWhat(ctx, p)}${p.note ? " · «" + ctx.esc(p.note) + "»" : ""} — <strong>${ctx.esc(status(p))}</strong></span>${p.status === "pending" ? `<button type="button" class="button quiet" data-dt-withdraw="${attr(ctx, p.id)}">${ctx.t("Ritira", "Withdraw")}</button>` : ""}</li>`).join("")}</ul>`
    : "";
  return `<details class="dt-more dt-propose" data-dt-details="propose"${open ? " open" : ""}><summary>${ctx.t("Proponi al DM", "Propose to the DM")}</summary><div class="dt-more-body"><p class="muted">${ctx.t("Il DM accetta o rifiuta; nulla cambia finché non decide.", "The DM accepts or declines; nothing changes until they decide.")}</p><div class="dt-seg" role="radiogroup" aria-label="${ctx.t("Che cosa proponi", "What you propose")}"><label><input type="radio" name="dt-propose-kind-${attr(ctx, actor.id)}" value="damage" data-dt-propose-kind${kind === "damage" ? " checked" : ""}> ${ctx.t("Danno", "Damage")}</label><label><input type="radio" name="dt-propose-kind-${attr(ctx, actor.id)}" value="heal" data-dt-propose-kind${kind === "heal" ? " checked" : ""}> ${ctx.t("Cura", "Healing")}</label><label><input type="radio" name="dt-propose-kind-${attr(ctx, actor.id)}" value="condition" data-dt-propose-kind${kind === "condition" ? " checked" : ""}> ${ctx.t("Condizione", "Condition")}</label></div><div class="dt-field-row">${kind === "condition" ? `<label class="field">${ctx.t("Condizione (SRD 2024)", "Condition (SRD 2024)")}<select data-dt-propose-condition>${D.PROPOSABLE_CONDITIONS.map((c) => `<option value="${c.id}">${ctx.esc(ctx.label(c.name))}</option>`).join("")}</select></label>` : `<label class="field">${ctx.t("Quantità", "Amount")}<input data-dt-propose-amount type="number" min="1" max="${D.MAX_AMOUNT}" step="1" inputmode="numeric"></label>`}${kind === "damage" ? `<label class="field">${ctx.t("Tipo", "Type")}<select data-dt-propose-type><option value="">${ctx.t("Senza tipo", "No type")}</option>${D.DAMAGE_TYPES.map((t) => `<option value="${t}">${ctx.esc(typeName(ctx, t))}</option>`).join("")}</select></label>` : ""}</div><label class="field">${ctx.t("Nota per il DM", "Note for the DM")}<input data-dt-propose-note maxlength="${D.MAX_NOTE}" autocomplete="off" placeholder="${attr(ctx, ctx.t("per esempio: ho preso 6 danni dalla trappola", "for example: I took 6 damage from the trap"))}"></label><button type="button" class="button primary" data-dt-propose>${ctx.t("Invia la proposta", "Send the proposal")}</button>${list}</div></details>`;
}
/** The defense chips of the damage type chosen in this creature's widget. */
function typeChips(ctx, actorId) {
  const type = ui.types.get(`hp:${actorId}`) ?? "";
  return type ? D.chipsFor(D.defensesOf(ctx.state, actorId), type) : [];
}
/** "10 → resistance 5" for the amount typed, or how the defenses will apply. */
function typePreviewText(ctx, actorId, raw) {
  const amount = Number(String(raw ?? "").trim());
  if (!Number.isInteger(amount) || amount < 1 || amount > D.MAX_AMOUNT)
    return ctx.t(
      "Scrivi l’importo: con Danno le difese qui sopra si applicano da sole.",
      "Enter the amount: with Damage the defenses above apply by themselves.",
    );
  return stepsText(
    ctx,
    D.adjustDamage(amount, typeChips(ctx, actorId), domainDecision(`hp:${actorId}`)),
  );
}
/**
 * Final review X-09 (Owl Trackers arithmetic, the token menu's HP field VTL-234): what a typed
 * amount means. With a button (`kind`) any expression is the amount to heal or deal
 * ("2+3" → 5); with Enter "-5" deals, "+3" heals, "=12" sets and "18-3+1" reads from the
 * current HP. Throws the token menu's localized format errors.
 */
export function amountPlan(raw, current, kind = null) {
  const parsed = parseHpInput(raw, current);
  return { kind: kind ?? parsed.op, amount: parsed.amount, raw: parsed.text };
}
/**
 * X-09 in «Correggi i punti ferita»: "18-3", "+2", "-2" and "=20" become the value they give
 * from the field's current value; a plain number, an empty field or an unreadable value go
 * through unchanged (the domain names what is wrong).
 */
export function resolveNumber(raw, current) {
  const text = String(raw ?? "").trim();
  if (!text || /^\d+$/.test(text)) return text;
  try {
    const plan = parseHpInput(text, Number.isInteger(current) ? current : null);
    const base = Number.isInteger(current) ? current : 0;
    return plan.op === "set"
      ? plan.amount
      : plan.op === "heal"
        ? base + plan.amount
        : base - plan.amount;
  } catch {
    return text;
  }
}
const STATUS_TTL = 12000;
/** The widget for one creature. Empty when this viewer can neither manage nor propose. */
export function hpWidgetHTML(ctx, actorId, { surface = "token", compact = false } = {}) {
  const actor = ctx.state.actors?.[actorId];
  if (!actor) return "";
  const manage = canManage(ctx, actor);
  const propose = canPropose(ctx, actor);
  if (!manage && !propose) return "";
  const key = `hp:${actor.id}`;
  // C2-3: a change's message is a notice (D&D Beyond), gone after STATUS_TTL ms.
  const kept = ui.status.get(actor.id);
  const status = kept && Date.now() - (kept.at ?? 0) < STATUS_TTL ? kept : null;
  const statusHTML = `<p class="dt-status${status?.error ? " is-error" : ""}" role="${status?.error ? "alert" : "status"}" data-dt-status>${ctx.esc(status?.text ?? "")}</p>`;
  const manageButton = (text) =>
    `<button type="button" class="text-button dt-manage" data-dt-manage aria-haspopup="dialog">${text}</button>`;
  if (!manage)
    return compact
      ? `<div class="dt-hp is-compact" data-dt-hp="${attr(ctx, actor.id)}" data-dt-surface="${surface}">${manageButton(ctx.t("Proponi al DM…", "Propose to the DM…"))}</div>`
      : `<div class="dt-hp" data-dt-hp="${attr(ctx, actor.id)}" data-dt-surface="${surface}">${statusHTML}${proposalsHTML(ctx, actor, { open: true })}</div>`;
  const chips = typeChips(ctx, actor.id);
  // What Damage would do with the amount typed (dnd5e tray preview), live while typing.
  const preview = chips.length
    ? `<p class="muted dt-calc" data-dt-type-preview aria-live="polite">${ctx.esc(typePreviewText(ctx, actor.id, ui.amounts.get(actor.id)))}</p>`
    : "";
  const row = `<div class="dt-hp-row" role="group" aria-label="${attr(ctx, ctx.t(`Cura o danno a ${actor.name}`, `Heal or damage ${actor.name}`))}"><button type="button" class="button dt-heal" data-dt-heal>${ctx.t("Cura", "Heal")}</button><input class="dt-amount" data-dt-amount="${attr(ctx, actor.id)}" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" maxlength="40" aria-label="${attr(ctx, ctx.t("Punti ferita da togliere o aggiungere", "Hit points to remove or add"))}" title="${attr(ctx, ctx.t("Un numero, poi Cura o Danno. Con Invio: -5 danno, +3 cura, =12 imposta, 25-3+2 in catena.", "A number, then Heal or Damage. With Enter: -5 damage, +3 healing, =12 sets, 25-3+2 chains."))}" placeholder="0" value="${attr(ctx, ui.amounts.get(actor.id) ?? "")}"><button type="button" class="button dt-damage" data-dt-damage>${ctx.t("Danno", "Damage")}</button></div>`;
  // The sheet's HP card holds the D&D Beyond box (DDB-032): Heal, the amount and Damage;
  // the full widget opens as its "HP sidebar", the same dialog as the token and the tracker.
  // Final review C2-3 (D&D Beyond: the HP number opens HP management): temporary HP, maximum
  // and log open from the sheet's HP number; the box keeps Heal, the amount and Damage.
  if (compact)
    return `<div class="dt-hp is-compact" data-dt-hp="${attr(ctx, actor.id)}" data-dt-surface="${surface}">${healthBadge(ctx, actor)}${row}${statusHTML}</div>`;
  return `<div class="dt-hp" data-dt-hp="${attr(ctx, actor.id)}" data-dt-surface="${surface}">${numbersHTML(ctx, actor)}${row}${typeSelectHTML(ctx, actor.id, key)}${chipsHTML(ctx, key, chips)}${preview}${causeHTML(ctx, actor)}${statusHTML}${correctHTML(ctx, actor)}${tempHTML(ctx, actor)}${logHTML(ctx, actor.id)}${defensesHTML(ctx, actor)}${propose ? proposalsHTML(ctx, actor) : ""}</div>`;
}

// ---------------------------------------------------------------- actions

/** Runs one change in one commit; the widget says what happened (DDB feedback). */
export function commitChange(ctx, actorId, label, mutator, { scope, focus, success } = {}) {
  const actor = ctx.state.actors[actorId];
  const opts = D.commitOptions(scope ?? D.commitScope(ctx.state, actorId, ctx.role));
  // A DM change to one of their creatures is logged for the DM only: the players' log would
  // otherwise reveal exact HP that the enemy-health rule may hide.
  if (ctx.role === "dm" && actor?.kind === "npc" && !opts.local) opts.visibility = "private";
  let out;
  try {
    ctx.commit(
      label,
      (draft) => {
        out = mutator(draft);
      },
      opts,
    );
  } catch (error) {
    // The widget says it in place (role="alert"), next to the control that failed.
    ui.status.set(actorId, { text: errorText(ctx, error), error: true, at: Date.now() });
    redraw(ctx);
    return null;
  }
  if (success) ui.status.set(actorId, { text: success(out), error: false, at: Date.now() });
  if (focus) ui.focus = focus;
  redraw(ctx);
  return out;
}
/** Redraws what shows the widget: the page, and the HP dialog when it is open. */
export function redraw(ctx) {
  ctx.render();
  ui.refreshDialog?.(ctx);
  ui.refreshGlobal?.(ctx);
}
/** Damage left over past 0 HP (Shieldmaiden overkill, CMP-169): " · 7 past 0" or "". */
export function overkillText(ctx, b) {
  if (!b || b.hpAfter !== 0 || !Number.isInteger(b.damage)) return "";
  const over = b.damage - (b.tempHpAbsorbed ?? 0) - (b.hpBefore - b.hpAfter);
  return over > 0 ? ` · ${ctx.t(`${over} oltre lo 0`, `${over} past 0`)}` : "";
}
function damageSummary(ctx, actor, result) {
  const b = result?.result?.breakdown;
  if (!b) return "";
  const parts = [`${result.amount} ${ctx.t("danni", "damage")}`];
  if (result.adjustment) parts.push(D.adjustmentText(result.adjustment, ctx.lang));
  if (b.tempHpAbsorbed)
    parts.push(
      ctx.t(
        `${b.tempHpAbsorbed} assorbiti dai temporanei (${b.tempHpBefore} → ${b.tempHpAfter})`,
        `${b.tempHpAbsorbed} absorbed by temporary HP (${b.tempHpBefore} → ${b.tempHpAfter})`,
      ),
    );
  parts.push(`${ctx.t("PF", "HP")} ${b.hpBefore} → ${b.hpAfter}${overkillText(ctx, b)}`);
  if (b.deadAfter && !b.deadBefore) parts.push(ctx.t("Morto", "Dead"));
  return parts.join(" · ");
}
function healSummary(ctx, actor, result) {
  const b = result?.result?.breakdown;
  if (!b) return "";
  const temp = Number.isInteger(actor?.tempHp) ? actor.tempHp : 0;
  return [
    `${ctx.t("Cura", "Healing")} ${b.healing}`,
    `${ctx.t("PF", "HP")} ${b.hpBefore} → ${b.hpAfter}`,
    b.overheal
      ? ctx.t(`${b.overheal} oltre il massimo, persi`, `${b.overheal} over the maximum, lost`)
      : "",
    ctx.t(`i temporanei restano ${temp}`, `temporary HP stay ${temp}`),
  ]
    .filter(Boolean)
    .join(" · ");
}
export function applyAmount(ctx, actorId, kind, raw, surface) {
  const actor = ctx.state.actors[actorId];
  const key = `hp:${actorId}`;
  const type = kind === "damage" ? ui.types.get(key) || null : null;
  const amount = Number(String(raw ?? "").trim());
  const name = actor?.name ?? "";
  const label =
    kind === "damage"
      ? ctx.t(`Danno: ${name} ${amount}`, `Damage: ${name} ${amount}`) +
        (type ? ` (${typeName(ctx, type)})` : "")
      : ctx.t(`Cura: ${name} ${amount}`, `Healing: ${name} ${amount}`);
  return commitChange(
    ctx,
    actorId,
    label,
    (draft) =>
      D.manualChange(
        draft,
        actorId,
        {
          kind,
          amount,
          type,
          decision: type ? domainDecision(key) : undefined,
          surface,
          note: ui.notes.get(actorId) ?? "",
          ...(kind === "damage" && ui.criticals.has(actorId) ? { critical: true } : {}),
        },
        ctx.role,
        { online: !ctx.offline, lang: ctx.lang },
      ),
    {
      focus: `[data-dt-amount="${actorId}"]`,
      // Runs before the redraw: D&D Beyond clears the amount once the change is made (a
      // refusal keeps it to fix), and the chip decisions (a downgrade) served one hit.
      success: (result) => {
        ui.amounts.delete(actorId);
        ui.notes.delete(actorId);
        ui.criticals.delete(actorId);
        if (type) ui.decisions.delete(key);
        return kind === "damage"
          ? damageSummary(ctx, actor, result)
          : healSummary(ctx, ctx.state.actors[actorId], result);
      },
    },
  );
}

// ---------------------------------------------------------------- revert dialog

export function openRevertDialog(ctx, actorId, entryId) {
  let plan;
  try {
    plan = D.planRevert(ctx.state, actorId, entryId, ctx.role);
  } catch (error) {
    ctx.toast(errorText(ctx, error), true);
    return;
  }
  const actor = ctx.state.actors[actorId];
  const entry = D.hpLog(ctx.state, actorId, ctx.role).find((e) => e.id === entryId);
  const back = ui.dialog ? { ...ui.dialog } : null;
  const fields = {
    hp: ctx.t("PF", "HP"),
    tempHp: ctx.t("PF temporanei", "Temporary HP"),
    maxHp: ctx.t("Massimo", "Maximum"),
  };
  const current = { hp: actor.hp, tempHp: actor.tempHp ?? 0, maxHp: actor.maxHp };
  const changes = Object.entries(plan.patch)
    .map(
      ([k, v]) =>
        `<li>${fields[k] ?? k}: ${ctx.esc(current[k])} → <strong>${ctx.esc(v)}</strong></li>`,
    )
    .join("");
  const body = `<div class="dt-revert" data-dt-revert-dialog><p>${ctx.t("Annulli solo questa voce, come una correzione motivata: le altre voci restano.", "You undo only this entry, as a reasoned correction: the other entries stay.")}</p>${entry ? `<p class="dt-revert-entry"><strong>${ctx.label(ENTRY_KIND[entry.kind] ?? L(entry.kind, entry.kind))}</strong>${entry.amount !== null ? " " + ctx.esc(entry.amount) : ""} · ${ctx.esc(actor.name)}${entryText(ctx, entry) ? ` · ${entryText(ctx, entry)}` : ""}</p>` : ""}${plan.errors.length ? `<p class="error" role="alert">${ctx.esc(ctx.label(plan.errors[0]))}</p>` : `<h3>${ctx.t("Cambia ora", "Changes now")}</h3><ul class="dt-revert-changes">${changes || `<li>${ctx.t("Nessun valore dei PF", "No HP value")}</li>`}</ul>`}${plan.options.length ? `<fieldset class="dt-revert-options"><legend>${ctx.t("Conseguenze che dipendono da questa voce", "Consequences that depend on this entry")}</legend>${plan.options.map((o) => `<label class="check-field"><input type="checkbox" name="include-${o.id}"${o.checked ? " checked" : ""}> ${ctx.esc(ctx.label(o.text))}</label>`).join("")}</fieldset>` : ""}${plan.consequences.length ? `<h3>${ctx.t("Da sapere", "Good to know")}</h3><ul class="dt-revert-flags" data-dt-consequences>${plan.consequences.map((c) => `<li data-dt-consequence="${c.code}">${ctx.esc(ctx.label(c.text))}</li>`).join("")}</ul>` : ""}<label class="field">${ctx.t("Motivo (obbligatorio)", "Reason (required)")}<input name="reason" maxlength="${D.MAX_NOTE}" required value="${attr(ctx, ctx.t("Voce registrata per errore", "Entry recorded by mistake"))}"></label></div>`;
  ctx.dialog(ctx.t(`Annulla una voce · ${actor.name}`, `Undo one entry · ${actor.name}`), body, {
    submitLabel: plan.errors.length ? undefined : ctx.t("Annulla la voce", "Undo the entry"),
    cancelLabel: ctx.t("Indietro", "Back"),
    onSubmit: (form) => {
      const include = Object.fromEntries(
        plan.options.map((o) => [o.id, form.get("include-" + o.id) === "on"]),
      );
      ctx.commit(
        ctx.t(
          `Registro PF: annullata una voce di ${actor.name}`,
          `HP log: undid one entry of ${actor.name}`,
        ),
        (draft) =>
          D.revertEntry(
            draft,
            actorId,
            entryId,
            ctx.role,
            { reason: String(form.get("reason") ?? ""), include },
            { online: !ctx.offline, lang: ctx.lang },
          ),
        ctx.role === "dm" && actor.kind === "npc"
          ? { visibility: "private" }
          : D.commitOptions(D.commitScope(ctx.state, actorId, ctx.role)),
      );
      ui.status.set(actorId, {
        text: ctx.t(
          "Voce annullata: puoi riapplicarla dal registro.",
          "Entry undone: you can reapply it from the log.",
        ),
        error: false,
        at: Date.now(),
      });
      ui.openLog = actorId;
      redraw(ctx);
      if (back) queueMicrotask(() => ui.reopen?.(ctx, back));
    },
  });
}
export function reapply(ctx, actorId, entryId) {
  const actor = ctx.state.actors[actorId];
  ui.openLog = actorId;
  return commitChange(
    ctx,
    actorId,
    ctx.t(
      `Registro PF: riapplicata una voce di ${actor.name}`,
      `HP log: reapplied one entry of ${actor.name}`,
    ),
    (draft) =>
      D.reapplyEntry(draft, actorId, entryId, ctx.role, { online: !ctx.offline, lang: ctx.lang }),
    {
      success: () => ctx.t("Voce riapplicata.", "Entry reapplied."),
      focus: `[data-dt-hp="${actorId}"] [data-dt-details="log"] summary`,
    },
  );
}

// ---------------------------------------------------------------- binding

const decisionHandlers = (root, ctx) => {
  root.querySelectorAll("[data-dt-chip]").forEach((node) =>
    node.addEventListener("click", () => {
      const key = node.dataset.dtKey;
      const off = new Set(decisionOf(key).off ?? []);
      if (off.has(node.dataset.dtChip)) off.delete(node.dataset.dtChip);
      else off.add(node.dataset.dtChip);
      const patch = { off: [...off] };
      if (node.dataset.dtChip === "immunity" && off.has("immunity")) patch.downgradeOpen = false;
      setDecision(key, patch);
      ui.focus = `[data-dt-chip="${node.dataset.dtChip}"][data-dt-key="${key}"]`;
      redraw(ctx);
    }),
  );
  root.querySelectorAll("[data-dt-downgrade]").forEach((node) =>
    node.addEventListener("click", () => {
      const key = node.dataset.dtKey;
      const open = !decisionOf(key).downgradeOpen;
      setDecision(key, { downgradeOpen: open });
      ui.focus = open
        ? `[data-dt-downgrade-reason][data-dt-key="${key}"]`
        : `[data-dt-downgrade][data-dt-key="${key}"]`;
      redraw(ctx);
    }),
  );
  root
    .querySelectorAll("[data-dt-downgrade-reason]")
    .forEach((node) =>
      node.addEventListener("input", () =>
        setDecision(node.dataset.dtKey, { downgradeReason: node.value }),
      ),
    );
  root.querySelectorAll("[data-dt-mult]").forEach((node) =>
    node.addEventListener("click", () => {
      setDecision(node.dataset.dtKey, { multiplier: Number(node.dataset.dtMult) });
      ui.focus = `[data-dt-mult="${node.dataset.dtMult}"][data-dt-key="${node.dataset.dtKey}"]`;
      redraw(ctx);
    }),
  );
};
export { decisionHandlers };

export function restoreFocus(root) {
  if (!ui.focus) return;
  const target = root.querySelector?.(ui.focus);
  if (target) {
    target.focus?.({ preventScroll: false });
    ui.focus = null;
  }
}

export function bindHpWidget(root, ctx) {
  root.querySelectorAll("[data-dt-hp]").forEach((widget) => {
    const actorId = widget.dataset.dtHp;
    const surface = widget.dataset.dtSurface || "token";
    const amount = widget.querySelector("[data-dt-amount]");
    const refuse = (error) => {
      ui.status.set(actorId, { text: errorText(ctx, error), error: true, at: Date.now() });
      ui.focus = `[data-dt-amount="${actorId}"]`;
      redraw(ctx);
    };
    const go = (kind) => {
      if (!amount) return;
      ui.amounts.set(actorId, amount.value);
      const value = amount.value.trim();
      // X-09: an expression becomes its amount; a plain number stays as typed.
      if (value && !/^\d+$/.test(value)) {
        try {
          const plan = amountPlan(value, ctx.state.actors[actorId]?.hp, kind);
          applyAmount(ctx, actorId, kind, String(plan.amount), surface);
        } catch (error) {
          refuse(error);
        }
        return;
      }
      applyAmount(ctx, actorId, kind, amount.value, surface);
    };
    // X-09: Enter applies a signed or set value (the token menu's HP field).
    amount?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.isComposing) return;
      event.preventDefault();
      const value = amount.value.trim();
      ui.amounts.set(actorId, amount.value);
      try {
        const plan = amountPlan(value, ctx.state.actors[actorId]?.hp);
        if (plan.kind === "set") {
          const done = applyHp(ctx, actorId, value);
          ui.amounts.delete(actorId);
          ui.status.set(actorId, {
            text: ctx.t(`PF ${done.before} → ${done.after}`, `HP ${done.before} → ${done.after}`),
            error: false,
            at: Date.now(),
          });
          ui.focus = `[data-dt-amount="${actorId}"]`;
          redraw(ctx);
        } else applyAmount(ctx, actorId, plan.kind, String(plan.amount), surface);
      } catch (error) {
        refuse(error);
      }
    });
    // The typed amount survives redraws (a chip, the type, a refusal) and drives the preview.
    amount?.addEventListener("input", () => {
      ui.amounts.set(actorId, amount.value);
      const preview = widget.querySelector("[data-dt-type-preview]");
      if (preview) preview.textContent = typePreviewText(ctx, actorId, amount.value);
    });
    widget.querySelector("[data-dt-log-all]")?.addEventListener("click", () => {
      if (ui.logAll.has(actorId)) ui.logAll.delete(actorId);
      else ui.logAll.add(actorId);
      ui.openLog = actorId;
      ui.focus = `[data-dt-hp="${actorId}"] [data-dt-log-all]`;
      redraw(ctx);
    });
    widget.querySelector("[data-dt-note]")?.addEventListener("input", (event) => {
      ui.notes.set(actorId, event.target.value);
    });
    widget.querySelector("[data-dt-critical]")?.addEventListener("change", (event) => {
      if (event.target.checked) ui.criticals.add(actorId);
      else ui.criticals.delete(actorId);
    });
    // «Correggi» (PG-21): typed values survive redraws until applied.
    widget.querySelectorAll("[data-dt-fix]").forEach((input) =>
      input.addEventListener("input", () => {
        ui.fixes.set(actorId, {
          ...(ui.fixes.get(actorId) ?? {}),
          [input.dataset.dtFix]: input.value,
        });
      }),
    );
    widget.querySelector("[data-dt-fix-apply]")?.addEventListener("click", () => {
      const read = (key) => widget.querySelector(`[data-dt-fix="${key}"]`)?.value ?? "";
      const now = ctx.state.actors[actorId];
      const input = {
        hp: resolveNumber(read("hp"), now?.hp),
        maxHp: resolveNumber(read("maxHp"), now?.maxHp),
        tempHp: resolveNumber(read("tempHp"), now?.tempHp ?? 0),
        reason: read("reason"),
        surface,
      };
      const actor = ctx.state.actors[actorId];
      ui.openCorrect = actorId;
      commitChange(
        ctx,
        actorId,
        ctx.t(`Correzione dei PF: ${actor.name}`, `HP correction: ${actor.name}`),
        (draft) =>
          D.correctVitals(draft, actorId, input, ctx.role, {
            online: !ctx.offline,
            lang: ctx.lang,
          }),
        {
          focus: `[data-dt-hp="${actorId}"] [data-dt-fix="hp"]`,
          success: (out) => {
            ui.fixes.delete(actorId);
            ui.openLog = actorId;
            const after = ctx.state.actors[actorId];
            return ctx.t(
              `Corretto: PF ${after.hp}/${after.maxHp}, temporanei ${after.tempHp ?? 0} · «${input.reason.trim()}»`,
              `Corrected: HP ${after.hp}/${after.maxHp}, temporary ${after.tempHp ?? 0} · “${input.reason.trim()}”`,
            );
          },
        },
      );
    });
    widget.querySelector("[data-dt-heal]")?.addEventListener("click", () => go("heal"));
    widget
      .querySelector("[data-dt-manage]")
      ?.addEventListener("click", () => ui.open?.(ctx, actorId, surface));
    widget.querySelector("[data-dt-damage]")?.addEventListener("click", () => go("damage"));
    widget.querySelector("[data-dt-type]")?.addEventListener("change", (event) => {
      const key = event.target.dataset.dtType;
      ui.types.set(key, event.target.value);
      ui.decisions.delete(key);
      ui.focus = `[data-dt-type="${key}"]`;
      redraw(ctx);
    });
    widget.querySelector("[data-dt-temp-set]")?.addEventListener("click", () => {
      const input = widget.querySelector("[data-dt-temp]");
      const choice = [...widget.querySelectorAll("[data-dt-temp-choice]")].find(
        (n) => n.checked,
      )?.value;
      const actor = ctx.state.actors[actorId];
      commitChange(
        ctx,
        actorId,
        ctx.t(
          `PF temporanei: ${actor.name} ${input?.value}`,
          `Temporary HP: ${actor.name} ${input?.value}`,
        ),
        (draft) =>
          D.setTempHp(draft, actorId, { amount: input?.value ?? "", choice, surface }, ctx.role, {
            online: !ctx.offline,
            lang: ctx.lang,
          }),
        {
          success: (out) => {
            const b = out?.result?.breakdown;
            return b
              ? ctx.t(
                  `PF temporanei ${b.tempHpBefore} → ${b.tempHpAfter}`,
                  `Temporary HP ${b.tempHpBefore} → ${b.tempHpAfter}`,
                )
              : "";
          },
          focus: `[data-dt-hp="${actorId}"] [data-dt-temp]`,
        },
      );
      ui.openTemp = actorId;
    });
    widget.querySelector("[data-dt-max-apply]")?.addEventListener("click", () => {
      const delta = widget.querySelector("[data-dt-max-delta]")?.value ?? "";
      const note = widget.querySelector("[data-dt-max-note]")?.value ?? "";
      const actor = ctx.state.actors[actorId];
      ui.openTemp = actorId;
      commitChange(
        ctx,
        actorId,
        ctx.t(`Massimo dei PF: ${actor.name} ${delta}`, `Maximum HP: ${actor.name} ${delta}`),
        (draft) =>
          D.changeMaxHp(draft, actorId, { delta, note }, ctx.role, {
            online: !ctx.offline,
            lang: ctx.lang,
          }),
        {
          success: () =>
            ctx.t(
              `Massimo ${ctx.state.actors[actorId].maxHp} · nota «${note.trim()}»`,
              `Maximum ${ctx.state.actors[actorId].maxHp} · note “${note.trim()}”`,
            ),
          focus: `[data-dt-hp="${actorId}"] [data-dt-max-delta]`,
        },
      );
    });
    widget.querySelectorAll("[data-dt-mod-remove]").forEach((node) =>
      node.addEventListener("click", () => {
        const actor = ctx.state.actors[actorId];
        ui.openTemp = actorId;
        commitChange(
          ctx,
          actorId,
          ctx.t(
            `Massimo dei PF: tolta una modifica di ${actor.name}`,
            `Maximum HP: removed a modifier of ${actor.name}`,
          ),
          (draft) =>
            D.removeMaxMod(draft, actorId, node.dataset.dtModRemove, ctx.role, {
              online: !ctx.offline,
              lang: ctx.lang,
            }),
          {
            success: () =>
              ctx.t(
                `Massimo ${ctx.state.actors[actorId].maxHp}`,
                `Maximum ${ctx.state.actors[actorId].maxHp}`,
              ),
          },
        );
      }),
    );
    widget
      .querySelectorAll("[data-dt-revert]")
      .forEach((node) =>
        node.addEventListener("click", () => openRevertDialog(ctx, actorId, node.dataset.dtRevert)),
      );
    widget
      .querySelectorAll("[data-dt-reapply]")
      .forEach((node) =>
        node.addEventListener("click", () => reapply(ctx, actorId, node.dataset.dtReapply)),
      );
    widget.querySelector("[data-dt-def-save]")?.addEventListener("click", () => {
      const pickList = (key) =>
        [...widget.querySelectorAll(`[data-dt-def="${key}"]`)]
          .filter((n) => n.checked)
          .map((n) => n.value);
      const note = widget.querySelector("[data-dt-def-note]")?.value ?? "";
      const actor = ctx.state.actors[actorId];
      commitChange(
        ctx,
        actorId,
        ctx.t(`Difese ai danni: ${actor.name}`, `Damage defenses: ${actor.name}`),
        (draft) =>
          D.recordDefenses(
            draft,
            actorId,
            {
              resistances: pickList("resistances"),
              immunities: pickList("immunities"),
              vulnerabilities: pickList("vulnerabilities"),
              note,
            },
            ctx.role,
          ),
        {
          scope: { local: false, visibility: "private" },
          success: () => ctx.t("Difese salvate.", "Defenses saved."),
        },
      );
    });
    widget.querySelector("[data-dt-def-clear]")?.addEventListener("click", () => {
      const actor = ctx.state.actors[actorId];
      commitChange(
        ctx,
        actorId,
        ctx.t(
          `Difese ai danni: ${actor.name} dal blocco`,
          `Damage defenses: ${actor.name} from the block`,
        ),
        (draft) => D.recordDefenses(draft, actorId, { clear: true }, ctx.role),
        {
          scope: { local: false, visibility: "private" },
          success: () => ctx.t("Difese dal blocco.", "Defenses from the block."),
        },
      );
    });
    widget.querySelectorAll("[data-dt-propose-kind]").forEach((node) =>
      node.addEventListener("change", () => {
        ui.proposeKind.set(actorId, node.value);
        ui.focus = `[data-dt-hp="${actorId}"] [data-dt-propose-amount]`;
        redraw(ctx);
      }),
    );
    widget.querySelector("[data-dt-propose]")?.addEventListener("click", () => {
      const actor = ctx.state.actors[actorId];
      const kind = ui.proposeKind.get(actorId) ?? "damage";
      const amountValue = widget.querySelector("[data-dt-propose-amount]")?.value ?? "";
      const type = widget.querySelector("[data-dt-propose-type]")?.value || null;
      const conditionId = widget.querySelector("[data-dt-propose-condition]")?.value ?? null;
      const note = widget.querySelector("[data-dt-propose-note]")?.value ?? "";
      const what =
        kind === "condition"
          ? ctx.label(D.conditionName(conditionId))
          : `${kind === "heal" ? ctx.t("cura", "healing") : ctx.t("danno", "damage")} ${amountValue}`;
      commitChange(
        ctx,
        actorId,
        ctx.t(
          `Proposta al DM: ${what} a ${actor.name}`,
          `Proposal to the DM: ${what} to ${actor.name}`,
        ),
        (draft) =>
          D.propose(
            draft,
            { actorId, kind, amount: Number(amountValue), type, conditionId, note },
            ctx.role,
            { allowed: suggestionsAllowed(ctx) },
          ),
        {
          scope: { local: false, visibility: "shared" },
          success: () =>
            ctx.t(
              "Proposta inviata: il DM la vede nel vassoio dei danni.",
              "Proposal sent: the DM sees it in the damage tray.",
            ),
          focus: `[data-dt-hp="${actorId}"] [data-dt-propose-amount]`,
        },
      );
      ui.openPropose = actorId;
    });
    widget.querySelectorAll("[data-dt-withdraw]").forEach((node) =>
      node.addEventListener("click", () =>
        commitChange(
          ctx,
          actorId,
          ctx.t("Proposta ritirata", "Proposal withdrawn"),
          (draft) => D.withdrawProposal(draft, node.dataset.dtWithdraw, ctx.role),
          {
            scope: { local: false, visibility: "shared" },
            success: () => ctx.t("Proposta ritirata.", "Proposal withdrawn."),
          },
        ),
      ),
    );
    // Open details survive a redraw (the widget is drawn again after each change).
    widget.querySelectorAll("[data-dt-details]").forEach((node) => {
      const id = node.dataset.dtDetails;
      const open =
        (id === "temp" && ui.openTemp === actorId) ||
        (id === "log" && ui.openLog === actorId) ||
        (id === "propose" && ui.openPropose === actorId) ||
        (id === "correct" && ui.openCorrect === actorId) ||
        (id === "defenses" && ui.openDefenses === actorId);
      if (open && "open" in node) node.open = true;
      node.addEventListener("toggle", () => {
        const key = {
          temp: "openTemp",
          log: "openLog",
          propose: "openPropose",
          correct: "openCorrect",
          defenses: "openDefenses",
        }[id];
        if (key) ui[key] = node.open ? actorId : ui[key] === actorId ? null : ui[key];
      });
    });
  });
  decisionHandlers(root, ctx);
  restoreFocus(root);
}
