import { canControlActor } from "./character-access.mjs";
import { geometryKey } from "./spatial.mjs";
import { renderMovementPath, pathDraft, clearPathDraft } from "./path-ui.mjs";
import {
  renderReactionRequests,
  bindReactionRequests,
  reactionCount,
  resetReactionUI,
} from "./reaction-ui.mjs";
import {
  listActions,
  previewAction,
  beginAttempt,
  resolveRoll,
  resolveAutomaticRolls,
  hasAutomaticRolls,
  projectAttempts,
  projectApproaches,
  CONDITION_FACTS,
  applyReadyOutcome,
  actionBlockReason,
  activeEffectsOf,
  sessionAuthority,
  displayName,
  maskedFor,
  canSeeAttemptValues,
  useHeroicInspiration,
  continueWithoutInspiration,
  campaignRules,
} from "./combat.mjs";
import {
  reactionsOf,
  sliceOf as sliceOfTracker,
  useLegendaryResistance,
  hiddenFromPlayers,
} from "./combat-tracker-domain.mjs";
// A hidden creature's resistance stays out of the players' log.
const turnLogOptionsFor = (state, actorId) =>
  hiddenFromPlayers(state, actorId) ? { visibility: "private" } : {};
// TV-48: the Table's end of turn uses the tracker's rule for the log line's visibility.
export { turnLogOptions } from "./combat-tracker-domain.mjs";
import * as inv from "./inventory-plus-domain.mjs";
import { rollDie } from "./state.mjs";
import { formatNumber } from "./ui.mjs";

// Optional neighbours (areas, DEVELOPMENT.md W2b1): the dice tray's audiences (B34) for
// «Chi vede» and its connected dice (C6, R2 TV-95). Absent, their options are not offered.
let trayDomain = null;
let trayUI = null;
export const neighboursReady = Promise.all([
  import("./dice-tray-domain.mjs").then(
    (module) => (trayDomain = module),
    () => null,
  ),
  import("./dice-tray.mjs").then(
    (module) => (trayUI = module),
    () => null,
  ),
]);
const drafts = new Map();
const physicalDrafts = new Map();
let diceMode = "digital";
let recentAttempt = "";
const key = (ctx, actorId) => [ctx.role, ctx.state.activeSceneId, actorId].join(":");
export function resetCombatUI() {
  resetReactionUI();
  closeActionMenu?.();
  barFilter = "all";
  drafts.clear();
  physicalDrafts.clear();
  recentAttempt = "";
}
export function cancelCombatPreview(ctx, actorId) {
  drafts.delete(key(ctx, actorId));
}
export function hasCombatPreview(ctx, actorId) {
  return drafts.has(key(ctx, actorId));
}
/**
 * Final review F15 (BG3: the hovered target shows the roll's Advantage or Disadvantage): the
 * live preview's roll mode against `targetId` and its reasons' names (the conditions of both
 * sides as the panel lists them), or null without a preview or a single-target attack.
 */
export function previewRollMode(ctx, actorId, targetId) {
  const draft = drafts.get(key(ctx, actorId));
  if (!draft) return null;
  let p;
  try {
    p = previewAction(
      ctx.state,
      actorId,
      draft.actionId,
      { ...draft.selection, targetIds: [targetId] },
      ctx.role,
    );
  } catch {
    return null;
  }
  if (!p?.rollMode) return null;
  const side = (r) => (r.side === "target" ? ctx.t(" (bersaglio)", " (target)") : "");
  const of = (mode) => [
    ...(p.rollReasons ?? []).filter((r) => r.mode === mode).map((r) => ctx.label(r.name)),
    ...(p.conditionRules?.[mode] ?? []).map((r) => ctx.label(r.name) + side(r)),
  ];
  return {
    mode: p.rollMode,
    reasons: p.rollMode === "normal" ? [] : of(p.rollMode),
  };
}
// B38 (spells-plus, additive): the sheet's spell usage dialog opens this same private
// preview for a creature with its choice already made (slot level or item charges); the
// Table then shows it exactly as if the action had been picked from the action bar.
export function prepareCombatAction(ctx, actorId, actionId, selection = {}) {
  drafts.set(key(ctx, actorId), {
    actionId,
    selection: { targetIds: [], allocations: [], ...structuredClone(selection) },
  });
}
const actionName = (ctx, action) =>
  ctx.label(action?.name || action?.actionName || action?.actionId || "");
const roleCanRoll = (ctx, request) =>
  (request.personal !== true || request.owner === ctx.role) &&
  canControlActor(ctx.state.actors[request.actorId], ctx.role, ctx.state);
const requestFaces = (request) =>
  (request.dice || []).flatMap((group) => Array.from({ length: group.count }, () => group.sides));
function getPreview(ctx, actorId) {
  const draft = drafts.get(key(ctx, actorId));
  if (!draft) return null;
  return previewAction(ctx.state, actorId, draft.actionId, draft.selection, ctx.role);
}
// PG-69: a source's pages are a list, or one list per language ({en, it}) as the SRD
// sample and the inventory's weapons record them; either way they read as text.
export function sourcePages(source, lang = "it") {
  const pages = source?.pages;
  if (Array.isArray(pages)) return pages;
  const own = pages?.[lang] ?? source?.[lang]?.pages ?? pages?.en ?? source?.en?.pages;
  return Array.isArray(own) ? own : own === undefined || own === null ? [] : [own];
}
export function renderActionSource(ctx, action) {
  const source = action?.source;
  if (!source) return `<p>${ctx.t("Fonte non ancora registrata.", "Source not yet recorded.")}</p>`;
  const title =
    source.kind === "srd"
      ? "SRD " +
        source.revision +
        " · " +
        ctx.t("Regole ", "Rules ") +
        source.edition +
        " · " +
        ctx.t("pagine ", "pages ") +
        sourcePages(source, ctx.lang).join(", ")
      : ctx.t("Contenuto originale della dimostrazione", "Original demonstration content") +
        " · " +
        ctx.label(source.title || "") +
        " · " +
        ctx.t("revisione ", "revision ") +
        source.revision;
  return `<p>${ctx.esc(title)}</p>${typeof source.url === "string" && /^https:\/\//.test(source.url) ? `<p><a href="${ctx.esc(source.url)}" target="_blank" rel="noopener noreferrer">${ctx.t("Leggi la fonte", "Read the source")}</a></p>` : ""}`;
}
function getDefinition(ctx, actorId, id) {
  return listActions(ctx.state, actorId).find((a) => a.id === id);
}
const reasonText = (ctx, reason) => (typeof reason === "string" ? reason : ctx.label(reason));
const KIND_LABELS = {
  attack: ["Attacco", "Attack"],
  save: ["Tiro salvezza", "Saving throw"],
  check: ["Prova", "Check"], // B34: a check the DM requested
  concentration: ["Concentrazione", "Concentration"],
  damage: ["Danni", "Damage"],
  "death-save": ["Tiro salvezza contro la morte", "Death saving throw"],
  medicine: ["Prova di Saggezza (Medicina)", "Wisdom (Medicine) check"],
  "stable-recovery": ["Recupero da stabile · ore", "Stable recovery · hours"],
};
const kindLabel = (ctx, kind) => ctx.t(...(KIND_LABELS[kind] ?? KIND_LABELS.damage));
const signedValue = (value) => (value < 0 ? "− " : "+ ") + Math.abs(value);
// Modifier sources a condition contributes (conditions.mjs: Exhaustion); every other source
// (an added bonus, a weapon's +1, a flat rider, the sheet's parts) is a plain bonus.
const conditionSource = (m) => m?.kind === "exhaustion" || Boolean(m?.conditionId);
// Condition reasons for an attack or save, from the domain projection (increment 10). TV-92
// (dnd5e request card, each row names its source): «Effetti delle condizioni» only when a
// condition contributes; plain bonuses are listed under «Bonus» with their source.
function conditionReasonsHTML(ctx, rules) {
  if (!rules) return "";
  const side = (r) =>
    r.side === "target" ? ctx.t(" (bersaglio)", " (target)") : r.side === "attacker" ? "" : "";
  const sources = rules.modifierSources ?? [];
  const mode = (list, word, homebrew) =>
    (list ?? [])
      .filter((r) => Boolean(r.homebrew) === homebrew)
      .map((r) => word + ": " + ctx.label(r.name) + side(r));
  const advantage = ctx.t("Vantaggio", "Advantage"),
    disadvantage = ctx.t("Svantaggio", "Disadvantage");
  // BI-18: homebrew Advantage/Disadvantage is a roll reason, not a condition's effect.
  const homebrew = [
    ...mode(rules.advantage, advantage, true),
    ...mode(rules.disadvantage, disadvantage, true),
  ];
  const rows = [
    ...mode(rules.advantage, advantage, false),
    ...mode(rules.disadvantage, disadvantage, false),
    ...sources
      .filter(conditionSource)
      .map((m) => ctx.label(m.label ?? m.kind) + " " + signedValue(m.value)),
    ...(rules.unresolved ?? []).map(
      (u) => ctx.t("Da verificare", "To verify") + ": " + ctx.label(u),
    ),
  ];
  if (rules.criticalOnHit === true)
    rows.push(
      ctx.t("Un colpo entro 1,5 m è un colpo critico.", "A hit within 1.5 m is a Critical Hit."),
    );
  const bonuses = sources
    .filter((m) => !conditionSource(m) && Number.isFinite(m?.value))
    .map((m) => ctx.label(m.label ?? m.kind) + " " + signedValue(m.value));
  return (
    (homebrew.length
      ? `<ul class="combat-conditions" aria-label="${ctx.t("Motivi del tiro", "Roll reasons")}">${homebrew.map((row) => `<li>${ctx.esc(row)}</li>`).join("")}</ul>`
      : "") +
    (rows.length
      ? `<ul class="combat-conditions" aria-label="${ctx.t("Effetti delle condizioni", "Condition effects")}">${rows.map((row) => `<li>${ctx.esc(row)}</li>`).join("")}</ul>`
      : "") +
    (bonuses.length
      ? `<ul class="combat-conditions combat-bonuses" aria-label="${ctx.t("Bonus", "Bonuses")}">${bonuses.map((row) => `<li>${ctx.esc(ctx.t("Bonus", "Bonus") + ": " + row)}</li>`).join("")}</ul>`
      : "")
  );
}
// Every reason that sets an attack's Advantage/Disadvantage, with its source, and the net
// result: "normal" says explicitly when Advantage and Disadvantage cancel out.
function rollReasonRows(ctx, reasons = []) {
  return reasons.map((r) => {
    const pages = r.source?.[ctx.lang]?.pages ?? r.source?.pages;
    // B46 (additive): cover rows name the target's AC bonus; info rows (chance to hit) have
    // no prefix. Advantage and Disadvantage rows read as before.
    if (r.mode === "info") return ctx.label(r.name);
    return (
      (r.mode === "target-ac"
        ? `${ctx.t("CA del bersaglio", "Target AC")} ${r.acBonus >= 0 ? "+" : "−"}${Math.abs(r.acBonus ?? 0)}`
        : r.mode === "advantage"
          ? ctx.t("Vantaggio", "Advantage")
          : ctx.t("Svantaggio", "Disadvantage")) +
      ": " +
      ctx.label(r.name) +
      (r.source?.kind === "srd" && pages?.length
        ? ` · SRD ${r.source.revision} p. ${pages.join(", ")}`
        : "")
    );
  });
}
function rollSummaryHTML(ctx, p) {
  const advantage =
    (p.rollReasons ?? []).some((r) => r.mode === "advantage") ||
    (p.conditionRules?.advantage ?? []).length > 0;
  const disadvantage =
    (p.rollReasons ?? []).some((r) => r.mode === "disadvantage") ||
    (p.conditionRules?.disadvantage ?? []).length > 0;
  const mode =
    p.rollMode === "advantage"
      ? ctx.t("Tiro con vantaggio", "Roll with advantage")
      : p.rollMode === "disadvantage"
        ? ctx.t("Tiro con svantaggio", "Roll with disadvantage")
        : advantage && disadvantage
          ? ctx.t(
              "Tiro normale: vantaggio e svantaggio si annullano",
              "Normal roll: Advantage and Disadvantage cancel out",
            )
          : "";
  const rows = rollReasonRows(ctx, p.rollReasons);
  return `${mode ? `<p class="effect-note" data-roll-mode="${ctx.esc(p.rollMode)}">${mode}</p>` : ""}${rows.length ? `<ul class="combat-conditions" aria-label="${ctx.t("Motivi del tiro", "Roll reasons")}">${rows.map((row) => `<li>${ctx.esc(row)}</li>`).join("")}</ul>` : ""}${conditionReasonsHTML(ctx, p.conditionRules)}`;
}
const FACT_QUESTIONS = {
  "source-sight": [
    "La fonte della paura è nel campo visivo di chi attacca?",
    "Is the source of fear within the attacker's line of sight?",
  ],
  "grappler-unknown": [
    "Il bersaglio è la creatura che afferra chi attacca?",
    "Is the target the creature grappling the attacker?",
  ],
  "charmer-unknown": [
    "Il bersaglio è la creatura che ha affascinato chi attacca?",
    "Is the target the creature that charmed the attacker?",
  ],
};
// An unknown condition origin is answered explicitly before the attack, never guessed.
function conditionFactsHTML(ctx, p, draft) {
  const facts = p?.conditionFacts ?? [];
  const answered = Object.keys(draft.selection.conditionFacts ?? {});
  const codes = [...new Set([...facts.map((f) => f.code), ...answered])].filter((code) =>
    CONDITION_FACTS.includes(code),
  );
  if (!codes.length) return "";
  return `<fieldset class="combat-facts-question"><legend>${ctx.t("Origine della condizione non registrata", "Condition origin not recorded")}</legend>${codes
    .map((code) => {
      const value = draft.selection.conditionFacts?.[code];
      return `<label class="field">${ctx.t(...FACT_QUESTIONS[code])}<select data-combat-fact="${ctx.esc(code)}"><option value="" ${value === undefined ? "selected" : ""}>${ctx.t("Scegli", "Choose")}</option><option value="yes" ${value === true ? "selected" : ""}>${ctx.t("Sì", "Yes")}</option><option value="no" ${value === false ? "selected" : ""}>${ctx.t("No", "No")}</option></select></label>`;
    })
    .join("")}</fieldset>`;
}
function vitalityRuleHTML(ctx, request) {
  if (request.kind === "death-save")
    return `<p><strong>${kindLabel(ctx, request.kind)}</strong> · ${ctx.t("CD 10, nessun modificatore di caratteristica.", "DC 10, no ability modifier.")}</p><p>${ctx.t("20 naturale: recuperi 1 PF. 1 naturale: due fallimenti. Tre successi: stabile; tre fallimenti: morte.", "Natural 20: regain 1 HP. Natural 1: two failures. Three successes: stable; three failures: death.")}</p>`;
  if (request.kind === "medicine")
    return `<p><strong>${kindLabel(ctx, request.kind)}</strong> · ${ctx.t("CD 10.", "DC 10.")}</p><p>${ctx.t("Il successo stabilizza senza curare, oppure termina un knockout.", "Success stabilizes without healing, or ends a knockout.")}${request.actionSpent ? " " + ctx.t("L’azione Aiuto è già spesa.", "The Help action is already spent.") : ""}</p>`;
  if (request.kind === "stable-recovery")
    return `<p><strong>${kindLabel(ctx, request.kind)}</strong></p><p>${ctx.t("Il risultato del d4 indica dopo quante ore di gioco la creatura stabile recupera 1 PF.", "The d4 result is how many game hours pass before the stable creature regains 1 HP.")}</p>`;
  return "";
}
function vitalityOutcomeText(ctx, o) {
  const v = o.vitality;
  if (o.status === "expired" || v?.status === "expired")
    return (
      ctx.t("Non più necessario", "No longer needed") +
      (o.reason ? " · " + ctx.label(o.reason) : "")
    );
  // An applied outcome whose faces this viewer may not read is only "recorded".
  if (!v)
    return o.status === "applied"
      ? ctx.t("Registrato", "Recorded")
      : ctx.t("In attesa del tiro", "Awaiting roll");
  const results = {
    success: ["Successo", "Success"],
    failure: ["Fallimento", "Failure"],
    "two-failures": ["Due fallimenti", "Two failures"],
    "regain-hp": ["Recupera 1 PF", "Regains 1 HP"],
    scheduled: ["Recupero programmato", "Recovery scheduled"],
  };
  return (
    ctx.t(...(results[v.result] ?? ["Registrato", "Recorded"])) +
    (v.hours ? " · " + v.hours + " " + ctx.t("ore", "hours") : "")
  );
}
function pendingCount(attempt) {
  return (
    attempt.pendingCount ??
    attempt.waiting?.length ??
    (attempt.requests || []).filter((r) => r.status === "pending").length
  );
}
export function pendingCombatCount(ctx) {
  return (
    projectApproaches(ctx.state, ctx.role).filter((a) =>
      ["awaiting-throw", "blocked"].includes(a.status),
    ).length +
    reactionCount(ctx) +
    projectAttempts(ctx.state, ctx.role)
      .filter((a) => a.own)
      .reduce(
        (n, a) =>
          n +
          pendingCount(a) +
          // TV-83: a d20 held for the Heroic Inspiration choice waits for its roller.
          (a.requests || []).filter((r) => r.hold === "inspiration" && roleCanRoll(ctx, r)).length,
        0,
      )
  );
}
// `extra`: area commands (registry "dock" placement) after the actions (W2b1 integration).
// B62 review: they stand in their own column (.combat-dock) beside the actions list, so a
// long list that scrolls inside the hotbar never hides them (BG3 common actions, CRP-098).
// TV-67 (BG3 grouped hotbar, Argon Combat HUD): the actions stand in theme groups
// (Weapons, Spells, Items, Common) and filter tabs by cost (Action, Bonus action,
// Reaction) narrow them; the Reactions tab lists the creature's reactions and how each
// answers (the BG3 reactions panel). The filter is this viewer's own choice.
let barFilter = "all";
const THEMES = [
  ["weapons", ["Armi", "Weapons"]],
  ["spells", ["Incantesimi", "Spells"]],
  ["items", ["Oggetti", "Items"]],
  ["common", ["Comuni", "Common"]],
];
const themeOf = (a) =>
  a.spell ? "spells" : a.kind === "attack" ? "weapons" : a.itemId ? "items" : "common";
const costOf = (a) =>
  a.cost?.bonus
    ? "bonus"
    : a.cost?.reaction
      ? "reaction"
      : a.cost?.action === 0
        ? "free"
        : "action";
const COSTS = {
  action: ["Azione", "Action"],
  bonus: ["Azione bonus", "Bonus action"],
  reaction: ["Reazione", "Reaction"],
  free: ["Senza costo", "No cost"],
};
function actionButton(ctx, actorId, a, draft, groupLabel = "") {
  const { esc, icon } = ctx;
  // TV-74 (BG3 greyed actions with the reason): the reason is there before any click.
  const why = actionBlockReason(ctx.state, actorId, a.id, ctx.role);
  const soft = Boolean(why?.soft);
  const reason = why ? reasonText(ctx, why) : "";
  const cost = costOf(a);
  const active = draft?.actionId === a.id;
  // The group's name sits in its first slot and the cost is a corner mark (BG3's green
  // circle for an action): neither takes width, so the bar keeps its two rows.
  return `<button class="combat-action${active ? " active" : ""}${groupLabel ? " is-group-start" : ""}${why && !soft ? " is-blocked" : ""}${soft ? " is-off-turn" : ""}" data-combat-action="${esc(a.id)}" data-combat-kind="${esc(a.kind)}" aria-pressed="${active}"${why && !soft ? ` aria-disabled="true" data-combat-blocked="${esc(reason)}" aria-description="${esc(reason)}"` : ""}${reason ? ` title="${esc(reason)}"` : ""}>${groupLabel ? `<span class="combat-group-tag" aria-hidden="true">${esc(groupLabel)}</span>` : ""}${icon(a.kind === "attack" ? "sword" : a.cost?.slotLevel ? "book" : "dice")}<span>${esc(actionName(ctx, a))}</span>${cost !== "free" ? `<span class="combat-cost combat-cost-${cost}" aria-hidden="true" title="${esc(ctx.t(...COSTS[cost]))}"></span>` : ""}</button>`;
}
export function renderCombatBar(ctx, actorId, extra = "") {
  const { t, esc, icon } = ctx;
  if (!ctx.canControl(ctx.state.actors[actorId])) return "";
  const draft = drafts.get(key(ctx, actorId));
  const actions = listActions(ctx.state, actorId);
  const reactions = reactionsOf(ctx.state, actorId);
  const costs = new Set(actions.map(costOf));
  // A cost filter only when it narrows the list (D&D Beyond's action filters): «Solo azioni»
  // for a creature whose every action costs an action would filter nothing and took the
  // width that keeps its actions in two rows (B62). «Tutte» only beside two or more filters;
  // a lone filter is a toggle, and pressing the active filter returns to every action.
  const choices = [
    ...["action", "bonus"]
      .filter((c) => costs.has(c) && costs.size > 1)
      .map((c) => [
        c,
        t(
          ...(c === "action"
            ? ["Solo azioni", "Actions only"]
            : ["Solo azioni bonus", "Bonus actions only"]),
        ),
      ]),
    ...(reactions.length ? [["reaction", t("Reazioni", "Reactions")]] : []),
  ];
  const tabs =
    choices.length > 1 ? [["all", t("Tutte le azioni", "All actions")], ...choices] : choices;
  const filter = choices.some(([id]) => id === barFilter) ? barFilter : "all";
  const shown = actions.filter((a) => filter === "all" || costOf(a) === filter);
  const groups =
    filter === "reaction"
      ? reactions
          .map(
            (r) =>
              `<button class="combat-action combat-reaction" data-combat-reaction="${esc(r.id)}" title="${esc(t("Si offre da sola quando serve: cambia la risposta nella scheda", "It is offered by itself when it applies: change the answer on the sheet"))}">${icon("shield")}<span>${esc(ctx.label(r.name))}</span><small>${r.policy === "ask" ? t("chiedi", "ask") : r.policy === "auto" ? t("automatica", "automatic") : t("disattivata", "off")}</small><span class="combat-cost combat-cost-reaction" aria-hidden="true"></span></button>`,
          )
          .join("")
      : THEMES.map(([theme, label]) => {
          const list = shown.filter((a) => themeOf(a) === theme);
          return list.length
            ? `<span class="combat-group" role="group" aria-label="${esc(t(...label))}">${list.map((a, i) => actionButton(ctx, actorId, a, draft, i === 0 ? t(...label) : "")).join("")}</span>`
            : "";
        }).join("");
  const filters = tabs.length
    ? `<span class="combat-filters" role="group" aria-label="${esc(t("Filtra per costo", "Filter by cost"))}">${tabs.map(([id, label]) => `<button type="button" class="combat-filter${id === filter ? " active" : ""}" data-combat-filter="${id}" aria-pressed="${id === filter}" aria-label="${esc(label)}" title="${esc(label)}">${id === "all" ? icon("grid") : `<span class="combat-cost combat-cost-${id}" aria-hidden="true"></span>`}</button>`).join("")}</span>`
    : "";
  return `<section class="combat-bar" aria-label="${t("Azioni disponibili", "Available actions")}"><div class="combat-bar-heading"><strong>${t("Azioni", "Actions")}</strong><label>${t("Dadi", "Dice")} <select data-combat-mode aria-label="${t("Modalità dei dadi dell’azione", "Action dice mode")}"><option value="digital" ${diceMode === "digital" ? "selected" : ""}>${t("Digitali", "Digital")}</option><option value="physical" ${diceMode === "physical" ? "selected" : ""}>${t("Fisici", "Physical")}</option></select></label><button class="text-button" data-combat-requests>${icon("bell")} ${t("Tiri e risultati", "Rolls and results")}${pendingCombatCount(ctx) ? " · " + pendingCombatCount(ctx) : ""}</button></div><div class="combat-actions">${filters}${groups}</div>${extra ? `<div class="combat-dock">${extra}</div>` : ""}</section>`;
}
// ---------------------------------------------------------------- active effects (TV-85)

const EFFECT_PATHS = {
  shield: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z",
  dodge: "M4 18 9 9l4 6 7-11",
  disengage: "M19 12H5m6-6-6 6 6 6",
  dash: "M5 6l6 6-6 6M12 6l6 6-6 6",
  concentration: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m0 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
};
export const effectIconPath = (type) => EFFECT_PATHS[type] ?? EFFECT_PATHS.concentration;
const effectSourceText = (ctx, source) =>
  source?.kind === "srd"
    ? `SRD ${source.revision} · ${ctx.t("p.", "p.")} ${sourcePages(source, ctx.lang).join(", ")}`
    : "";
/**
 * TV-85 (Visual Active Effects, BG3 portrait icons): the creature's active effects with
 * icon, source and remaining duration. One renderer for the Table's creature panel.
 */
export function renderActiveEffects(ctx, actorId) {
  const actor = ctx.state.actors?.[actorId];
  const rows = activeEffectsOf(ctx.state, actorId);
  if (!actor || !rows.length) return "";
  return `<section class="active-effects" data-active-effects="${ctx.esc(actorId)}" aria-label="${ctx.esc(ctx.t("Effetti attivi", "Active effects"))}"><h4>${ctx.t("Effetti attivi", "Active effects")}</h4><ul>${rows
    .map(
      (r) =>
        `<li data-active-effect="${ctx.esc(r.type)}"><span class="active-effect-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="${effectIconPath(r.icon)}"/></svg></span><span class="active-effect-text"><strong>${ctx.esc(ctx.label(r.name))}</strong>${r.type === "shield" ? `: ${ctx.t("CA", "AC")} ${actor.ac} + 5` : r.detail ? `: ${ctx.esc(ctx.label(r.detail))}` : ""}<small>${ctx.esc(ctx.label(r.until))}${r.source ? " · " + ctx.esc(effectSourceText(ctx, r.source)) : ""}</small></span></li>`,
    )
    .join("")}</ul></section>`;
}
// PG-69 (dnd5e attack dialog with the ammunition choice, Solasta's quiver): a ranged
// weapon's stack is chosen in the attack itself; the choice is the inventory's own.
function ammoChoiceHTML(ctx, actorId, action) {
  const actor = ctx.state.actors[actorId];
  const weapon = action?.itemId ? inv.rowById(actor, action.itemId) : null;
  const rows = weapon ? inv.ammoRowsFor(actor, weapon) : [];
  if (!weapon?.weapon?.ammunition) return "";
  const chosen = inv.selectedAmmo(actor, weapon);
  return `<label class="field combat-ammo">${ctx.t("Munizioni", "Ammunition")}${rows.length ? `<select data-combat-ammo="${ctx.esc(weapon.id)}">${rows.map((row) => `<option value="${ctx.esc(row.id)}" ${chosen?.id === row.id ? "selected" : ""}>${ctx.esc(inv.rowName(row, ctx.lang))} ×${row.quantity}</option>`).join("")}</select><small class="muted">${ctx.t("Ogni attacco consuma una munizione.", "Each attack expends one piece of ammunition.")}</small>` : `<small class="error">${ctx.t("Nessuna munizione adatta nell’inventario.", "No fitting ammunition in the inventory.")}</small>`}</label>`;
}
export function renderCombatInspector(ctx, actorId) {
  const { t, esc } = ctx;
  const draft = drafts.get(key(ctx, actorId));
  if (!draft)
    return `<section id="combat-detail" class="combat-detail"><p class="muted">${t("Scegli una mossa nella barra delle azioni. Puoi confrontarle anche fuori turno.", "Choose a move from the action bar. You can compare moves off turn.")}</p>${recentAttempt ? `<button class="button" data-attempt-detail="${esc(recentAttempt)}">${t("Ultimo risultato", "Latest result")}</button>` : ""}</section>`;
  const p = getPreview(ctx, actorId),
    a = p?.action || getDefinition(ctx, actorId, draft.actionId);
  if (!a) return "";
  const targetMode =
    a.targetMode ||
    (a.kind === "attack"
      ? "single"
      : a.kind === "area"
        ? "area"
        : a.kind === "multi"
          ? "multiple"
          : "self");
  const instructions =
    targetMode === "single"
      ? t(
          "Punta una creatura per valutare. Clicca il bersaglio per eseguire.",
          "Point at a creature to preview. Click the target to execute.",
        )
      : targetMode === "area"
        ? t(
            "Orienta la sagoma sulla mappa. Rilascia per tenerla ferma, poi lancia.",
            "Aim the template on the map. Release to leave it in place, then cast.",
          )
        : targetMode === "multiple"
          ? t(
              "Clicca le creature per assegnare i dardi; regola le quantità qui.",
              "Click creatures to assign darts; adjust the amounts here.",
            )
          : targetMode === "destination"
            ? t(
                "Indica la destinazione. Il clic avvia lo scatto quando necessario.",
                "Point at your destination. Clicking starts Dash when required.",
              )
            : t("Questa azione non richiede un bersaglio.", "This action needs no target.");
  const targets = p?.targets || [];
  return `<section id="combat-detail" class="combat-detail" aria-label="${t("Preparazione privata", "Private preview")}"><div class="section-heading"><h3>${esc(actionName(ctx, a))}</h3><button class="icon-button" data-combat-cancel aria-label="${t("Annulla mossa", "Cancel move")}">${ctx.icon("close")}</button></div><span class="badge">${t("Anteprima · nessun consumo", "Preview · no resources spent")}</span><p>${esc(ctx.label(a.shortDescription || ""))}</p><p class="combat-instructions">${instructions}</p><dl class="combat-facts"><div><dt>${t("Costo", "Cost")}</dt><dd>${p?.cost?.action === 0 ? t("Movimento", "Movement") : t("Azione", "Action")}${a.cost?.slotLevel ? " + " + t("slot di ", "level ") + a.cost.slotLevel : ""}</dd></div>${a.rangeMeters ? `<div><dt>${t("Gittata", "Range")}</dt><dd>${formatNumber(ctx.lang, a.rangeMeters)} m</dd></div>` : ""}</dl>${p?.approach?.required ? `<div class="approach-preview"><strong>${t("Avvicinati e attacca", "Approach and attack")}</strong><p>${p.approach.movement ? t("Distanza", "Distance") + ": " + formatNumber(ctx.lang, p.approach.movement.distance) + " m · " + t("Costo movimento", "Movement cost") + ": " + formatNumber(ctx.lang, p.approach.movement.totalCost) + " m" : t("Nessun percorso percorribile.", "No traversable path.")}</p><p>${t("Il clic autorizza il percorso mostrato e l’attacco all’arrivo. Nessuno Scatto automatico; se il percorso completo è impossibile, non parti.", "Click authorizes the shown path and the attack on arrival. No automatic Dash; if the complete path is unavailable, you do not start.")}</p>${diceMode === "physical" ? `<p>${t("Lancia i dadi fisici soltanto all’arrivo, quando compare la richiesta.", "Roll physical dice only after arriving, when the request appears.")}</p>` : ""}</div>` : ""}<p class="combat-formula">${formulaHTML(ctx, a, p)}</p>${a.onHitProneMaxSize ? `<p class="effect-note">${t("Se colpisce una creatura di taglia Media o inferiore, il bersaglio diventa Prono: l’app lo applica con fonte e origine. Taglia o immunità non registrate restano da verificare.", "On a hit against a Medium or smaller creature, the target has the Prone condition: the app applies it with source and origin. Unrecorded size or immunities stay to be verified.")}</p>` : ""}${a.attackType === "melee" ? `<label class="prep-check"><input type="checkbox" data-combat-flag="knockout" ${draft.selection.knockout ? "checked" : ""}> ${t("Colpo non letale: se lo porterebbe a 0 PF, resta a 1 PF, Privo di sensi, e inizia un riposo breve", "Knock out: if it would drop to 0 HP, it stays at 1 HP, Unconscious, and starts a Short Rest")}</label>` : ""}${p?.conditionRules ? rollSummaryHTML(ctx, p) : ""}${conditionFactsHTML(ctx, p, draft)}${a.attackType === "melee" && pathDraft(ctx, actorId).length ? `<label class="prep-check"><input type="checkbox" data-combat-waypoints ${draft.selection.waypoints?.length ? "checked" : ""}> ${t("Passa dai punti del percorso preparato", "Follow the prepared path points")}</label>` : ""}${a.handsOptions ? gripHTML(ctx, getDefinition(ctx, actorId, draft.actionId) ?? a, draft) : ""}${a.slotLevels ? `<label class="field">${t("Slot da usare", "Spell slot")}<select data-combat-param="slotLevel">${a.slotLevels.map((slot) => `<option value="${slot.level}" ${(draft.selection.slotLevel || 1) === slot.level ? "selected" : ""}>${t("Livello ", "Level ")}${slot.level} · ${slot.remaining}/${slot.max} ${t("disponibili", "available")}</option>`).join("")}</select></label>` : ""}${a.kind === "attack" ? `<label class="field">${t("Circostanze dichiarate", "Declared circumstances")}<select data-combat-param="rollMode"><option value="normal" ${!draft.selection.rollMode || draft.selection.rollMode === "normal" ? "selected" : ""}>${t("Tiro normale", "Normal roll")}</option><option value="advantage" ${draft.selection.rollMode === "advantage" ? "selected" : ""}>${t("Vantaggio", "Advantage")}</option><option value="disadvantage" ${draft.selection.rollMode === "disadvantage" ? "selected" : ""}>${t("Svantaggio", "Disadvantage")}</option></select></label>${ammoChoiceHTML(ctx, actorId, a)}<label class="field combat-bonus">${t("Aggiungi bonus al tiro per colpire", "Add a bonus to the attack roll")}<input type="number" min="-10" max="10" step="1" inputmode="numeric" data-combat-param="situationalBonus" value="${draft.selection.situationalBonus ?? 0}"><small class="muted">${t("Un bonus di circostanza deciso al tavolo (es. +2 da una posizione favorevole): si somma al tiro.", "A circumstance bonus agreed at the table (e.g. +2 from a favourable position): it adds to the roll.")}</small></label>${attackOptionsHTML(ctx, draft)}` : ""}${targets.length ? `<h4>${t("Creature note coinvolte", "Known creatures affected")}</h4><ul class="combat-targets">${targets.map((target) => `<li><span>${esc(displayName(ctx.state, target.actorId, ctx.role) || ctx.label(target.name || ""))}</span>${targetMode === "multiple" ? `<span class="target-counter"><button data-dart-minus="${esc(target.actorId)}" aria-label="${t("Togli un dardo a ", "Remove a dart from ") + esc(ctx.label(target.name))}">−</button><strong>${draft.selection.allocations?.find((x) => x.actorId === target.actorId)?.count || 1}</strong><button data-dart-plus="${esc(target.actorId)}" aria-label="${t("Aggiungi un dardo a ", "Add a dart to ") + esc(ctx.label(target.name))}">+</button></span>` : ""}</li>`).join("")}</ul>` : targetMode === "area" ? `<p>${t("Nessuna creatura nota nell’area.", "No known creature in the area.")}</p>` : ""}${p?.reasons?.length ? `<ul class="combat-reasons" id="combat-execute-reason">${p.reasons.map((r) => `<li>${esc(reasonText(ctx, r))}</li>`).join("")}</ul>` : !p?.available && !["single", "destination"].includes(targetMode) ? `<p class="combat-reasons" id="combat-execute-reason">${t("La mossa non è ancora pronta: completa la scelta nella mappa o qui sopra.", "The move is not ready yet: complete the choice on the map or above.")}</p>` : ""}${!["single", "destination"].includes(targetMode) ? `<button class="button primary combat-execute" data-combat-execute ${p?.available ? "" : 'disabled aria-describedby="combat-execute-reason"'}>${targetMode === "area" || targetMode === "multiple" ? t("Lancia ", "Cast ") + esc(actionName(ctx, a)) : esc(actionName(ctx, a))}</button>` : ""}${targetMode === "area" && draft.placed ? `<button class="button" data-combat-reaim>${t("Riorienta area", "Adjust area")}</button>` : ""}<button class="text-button" data-combat-rule>${t("Regola e calcolo", "Rule and calculation")}</button></section>`;
}
// The damage formula of the move: dice, the damage modifier and a weapon's own bonus (BI-24).
function formulaHTML(ctx, a, p) {
  const { t, esc } = ctx;
  if (Number.isInteger(a.fixedDamage)) return t("Danno fisso: ", "Fixed damage: ") + a.fixedDamage;
  const signed = (value) => (value > 0 ? " + " : " − ") + Math.abs(value);
  const bonuses = (a.itemBonuses ?? []).filter((row) => row.target === "damage");
  return (
    esc((a.dice || []).map((d) => d.count + "d" + d.sides).join(" + ")) +
    (a.damageModifier ? signed(a.damageModifier) : "") +
    bonuses.map((row) => esc(signed(row.value) + " (" + ctx.label(row.label) + ")")).join("") +
    (p?.riders?.length
      ? `<br><small>${t("Tiro per colpire", "Attack roll")}: d20 ${p.riders.map((r) => esc((r.sign < 0 ? "− " : "+ ") + (r.dice ? r.dice.count + "d" + r.dice.sides : Math.abs(r.flat)) + " (" + ctx.label(r.name) + ")")).join(" ")}</small>`
      : "")
  );
}
// One or two hands: the quarterstaff (d6/d8) and every Versatile inventory weapon (BI-24).
function gripHTML(ctx, base, draft) {
  const { t } = ctx;
  const one = base.dice?.[0] ? "d" + base.dice[0].sides : "d6";
  const two = base.versatileDice ? "d" + base.versatileDice.sides : "d8";
  return `<label class="field">${t("Impugnatura", "Grip")}<select data-combat-param="hands"><option value="1" ${draft.selection.hands !== 2 ? "selected" : ""}>${t("Una mano", "One hand")} · ${one}</option><option value="2" ${draft.selection.hands === 2 ? "selected" : ""}>${t("Due mani", "Two hands")} · ${two}</option></select></label>`;
}
// TV-89: the attack's «Danno critico» and «Chi vede», the same choices as its right-click menu.
function attackOptionsHTML(ctx, draft) {
  const { t, esc } = ctx;
  const audiences = menuAudiences(ctx);
  const chosen = draft.selection.audience ?? "public";
  return `<label class="prep-check"><input type="checkbox" data-combat-flag="forceCritical" ${draft.selection.forceCritical ? "checked" : ""}> ${t("Danno critico: se colpisce, i danni sono di un colpo critico", "Critical damage: on a hit, the damage is a Critical Hit's")}</label>${draft.selection.forceCritical ? `<label class="field">${t("Motivo del critico (lo legge il DM)", "Reason for the critical (the DM reads it)")}<input type="text" maxlength="120" data-combat-text="criticalReason" value="${esc(draft.selection.criticalReason ?? "")}"></label>` : ""}${audiences.length ? `<label class="field">${t("Chi vede il risultato", "Who sees the result")}<select data-combat-param="audience">${audiences.map((a) => `<option value="${esc(a)}" ${a === chosen ? "selected" : ""}>${esc(audienceText(ctx, a, ctx.role))}</option>`).join("")}</select></label>` : ""}`;
}
export function renderCombatMap(ctx, actorId) {
  const draft = drafts.get(key(ctx, actorId));
  const p = getPreview(ctx, actorId);
  if (!draft || !p) return "";
  const scene = ctx.state.scenes.find((s) => s.id === ctx.state.activeSceneId);
  const origin = scene?.tokens.find((t) => t.actorId === actorId);
  if (!origin) return "";
  let shape = "";
  if (p.geometry?.points?.length)
    shape = `<polygon points="${p.geometry.points.map((p) => p.x + "," + p.y).join(" ")}" fill="#e2a763" fill-opacity=".23" stroke="#e2c17b" stroke-width="3"/>`;
  else if (p.action?.targetMode === "destination" && draft.selection.point)
    shape = `<path d="M${origin.x} ${origin.y} L${draft.selection.point.x} ${draft.selection.point.y}" stroke="#e2c17b" stroke-width="3" stroke-dasharray="9 4"/>`;
  if (p.approach?.movement) shape += renderMovementPath(p.approach.movement);
  if (p.movement) shape += renderMovementPath(p.movement);
  for (const target of p.targets || []) {
    const token = scene.tokens.find((t) => t.actorId === target.actorId);
    if (token)
      shape += `<circle cx="${token.x}" cy="${token.y}" r="32" fill="none" stroke="#eac387" stroke-width="4"/>`;
  }
  return shape;
}
function refreshMap(ctx, actorId) {
  const current = document.querySelector("#combat-detail");
  if (current) current.outerHTML = renderCombatInspector(ctx, actorId);
  const layer = document.querySelector("#combat-map-layer");
  if (layer) layer.innerHTML = renderCombatMap(ctx, actorId);
  bindDetail(document.querySelector("#content"), ctx, actorId);
}
export function handleCombatMap(ctx, actorId, kind, point, targetId) {
  const draft = drafts.get(key(ctx, actorId));
  if (!draft) return false;
  const a = getDefinition(ctx, actorId, draft.actionId);
  if (!a) return false;
  if (a.targetMode === "area" && kind === "move" && draft.placed) return true;
  if (a.targetMode === "area" && kind === "down") draft.placed = false;
  if (a.targetMode === "area" || a.targetMode === "destination")
    draft.selection.point = { x: point.x, y: point.y };
  if (a.targetMode === "area" && ["click", "release"].includes(kind)) draft.placed = true;
  else if (a.targetMode === "single") draft.selection.targetIds = targetId ? [targetId] : [];
  else if (a.targetMode === "multiple" && kind === "click" && targetId) {
    const assignments = draft.selection.allocations || (draft.selection.allocations = []);
    const old = assignments.find((t) => t.actorId === targetId);
    if (old) assignments.splice(assignments.indexOf(old), 1);
    else assignments.push({ actorId: targetId, count: 1 });
    draft.selection.targetIds = assignments.map((t) => t.actorId);
  }
  refreshMap(ctx, actorId);
  if (kind === "click" && ["single", "destination"].includes(a.targetMode))
    executePrepared(ctx, actorId);
  return true;
}

// A digital attempt behaves like a physical one: the attempt (and its spent action) is
// one commit, its dice another. Undo then withdraws only the dice application, and the
// known faces come back through "Reapply known result", never a free reroll.
function begin(ctx, actorId, draft) {
  const id = crypto.randomUUID();
  // TV-89 (DDB «Crit»): a declared critical names its reason in the log the DM reads; a roll
  // only its roller reads («Solo io») keeps its log lines private.
  const reason = String(draft.selection.criticalReason ?? "").trim();
  const label = draft.selection.forceCritical
    ? ctx.t(
        "Tentativo registrato · danno critico dichiarato",
        "Attempt recorded · declared critical damage",
      ) + (reason ? ": " + reason : "")
    : ctx.t("Tentativo registrato", "Attempt recorded");
  const options = commitOptionsFor({ audience: draft.selection.audience });
  ctx.commit(
    label,
    (s) => {
      beginAttempt(
        s,
        {
          id,
          actorId,
          actionId: draft.actionId,
          selection: structuredClone(draft.selection),
          mode: diceMode,
          // B20 campaign automation level (campaign-settings.mjs, FVT-138/141): assisted by
          // default (census C1) wherever the settings area keeps campaign policies;
          // automatic only in a campaign that chose it.
          applyMode:
            ctx.state.ext?.["campaign-settings"] &&
            ctx.state.ext["campaign-settings"].campaigns?.[ctx.state.campaign?.id]?.policy
              ?.automation !== "automatic"
              ? "assisted"
              : undefined,
        },
        ctx.role,
      );
    },
    options,
  );
  if (hasAutomaticRolls(ctx.state))
    ctx.commit(
      ctx.t("Dadi digitali tirati", "Digital dice rolled"),
      (s) => resolveAutomaticRolls(s, rollDie),
      options,
    );
  drafts.delete(key(ctx, actorId));
  recentAttempt = id;
  clearPathDraft(ctx, actorId);
  ctx.render();
  const accepted = ctx.state.combatAttempts?.find((attempt) => attempt.id === id);
  // Assisted automation: the attack card opens with its Apply button; TV-83: a d20 held for
  // the Heroic Inspiration choice opens the card with «Ritira» and «Continua».
  if (
    accepted?.outcomes.some((outcome) => outcome.status === "ready") ||
    accepted?.requests.some((request) => request.hold === "inspiration")
  ) {
    openCombatRequests(ctx, id);
    return;
  }
  if (accepted?.approach && ["awaiting-throw", "blocked"].includes(accepted.approach.status)) {
    openCombatRequests(ctx, id);
    return;
  }
  if (
    diceMode === "physical" &&
    accepted?.requests.some(
      (request) => request.status === "pending" && request.actorId === actorId,
    )
  )
    openCombatRequests(ctx, id);
  else
    ctx.toast(
      accepted?.approach?.status === "moving"
        ? ctx.t(
            "Avvicinamento in corso. Le richieste collegate sono disponibili al tavolo.",
            "Approach in progress. Related requests are available at the table.",
          )
        : accepted?.status === "resolved"
          ? ctx.t(
              "Azione risolta. Il dettaglio è in Tiri e risultati.",
              "Action resolved. Details are in Rolls and results.",
            )
          : ctx.t(
              "Lancio avviato: i tiri necessari restano in Tiri e risultati.",
              "Cast started: required rolls remain in Rolls and results.",
            ),
    );
}
function executePrepared(ctx, actorId) {
  const draft = drafts.get(key(ctx, actorId));
  if (!draft) return;
  const p = getPreview(ctx, actorId);
  if (!p?.available) {
    ctx.toast(
      p?.reasons?.map((r) => reasonText(ctx, r)).join(" · ") ||
        ctx.t("Completa la scelta.", "Complete your selection."),
      true,
    );
    return;
  }
  const action = p.action || getDefinition(ctx, actorId, draft.actionId);
  const frozen = structuredClone(draft);
  frozen.selection.geometryKey = geometryKey(
    ctx.state.scenes.find((scene) => scene.id === ctx.state.activeSceneId),
  );
  if (
    diceMode === "physical" &&
    action.kind === "attack" &&
    !action.cost?.slotLevel &&
    !p.approach?.required
  ) {
    frozen.selection.allowApproach = false;
    ctx.dialog(
      ctx.t("Tiro fisico", "Physical roll"),
      `<p>${ctx.t("La mossa è scelta. Il tentativo inizia quando lanci il dado; fino ad allora non consumi l’azione.", "Your move is selected. The attempt starts when you roll; until then the action is not spent.")}</p>${
        p.riders?.some((r) => r.dice)
          ? `<p data-physical-riders>${ctx.esc(
              ctx.t("Lancia con il d20 anche: ", "Roll with the d20 also: ") +
                p.riders
                  .filter((r) => r.dice)
                  .map((r) => r.dice.count + "d" + r.dice.sides + " (" + ctx.label(r.name) + ")")
                  .join(", "),
            )}</p>`
          : ""
      }<p>${ctx.t("Dopo il lancio potrai inserire il risultato o lasciare la richiesta in attesa.", "After rolling, enter the result or leave the request pending.")}</p>`,
      {
        submitLabel: ctx.t("Ho lanciato i dadi", "I have rolled the dice"),
        onSubmit: () => begin(ctx, actorId, frozen),
      },
    );
  } else {
    try {
      begin(ctx, actorId, frozen);
    } catch (error) {
      ctx.toast(ctx.label(error.it ? { it: error.it, en: error.en } : error.message), true);
    }
  }
}
function bindDetail(root, ctx, actorId) {
  if (!root) return;
  root.querySelector("[data-combat-waypoints]")?.addEventListener("change", (e) => {
    const draft = drafts.get(key(ctx, actorId));
    draft.selection.waypoints = e.target.checked ? structuredClone(pathDraft(ctx, actorId)) : [];
    refreshMap(ctx, actorId);
  });
  root.querySelector("[data-combat-reaim]")?.addEventListener("click", () => {
    const draft = drafts.get(key(ctx, actorId));
    if (draft) draft.placed = false;
    refreshMap(ctx, actorId);
  });
  root
    .querySelector("[data-combat-execute]")
    ?.addEventListener("click", () => executePrepared(ctx, actorId));
  root.querySelector("[data-combat-cancel]")?.addEventListener("click", () => {
    cancelCombatPreview(ctx, actorId);
    ctx.render();
  });
  root.querySelectorAll("[data-combat-flag]").forEach(
    (control) =>
      (control.onchange = () => {
        const draft = drafts.get(key(ctx, actorId));
        if (control.checked) draft.selection[control.dataset.combatFlag] = true;
        else delete draft.selection[control.dataset.combatFlag];
        refreshMap(ctx, actorId);
      }),
  );
  root.querySelectorAll("[data-combat-fact]").forEach(
    (control) =>
      (control.onchange = () => {
        const draft = drafts.get(key(ctx, actorId));
        const facts = { ...(draft.selection.conditionFacts ?? {}) };
        if (control.value === "") delete facts[control.dataset.combatFact];
        else facts[control.dataset.combatFact] = control.value === "yes";
        draft.selection.conditionFacts = facts;
        refreshMap(ctx, actorId);
      }),
  );
  root.querySelectorAll("[data-combat-param]").forEach(
    (control) =>
      (control.onchange = () => {
        const draft = drafts.get(key(ctx, actorId));
        const param = control.dataset.combatParam;
        if (param === "audience" && control.value === "public") delete draft.selection.audience;
        else
          draft.selection[param] = ["rollMode", "audience"].includes(param)
            ? control.value
            : Number(control.value);
        refreshMap(ctx, actorId);
      }),
  );
  root.querySelectorAll("[data-combat-text]").forEach(
    (control) =>
      (control.oninput = () => {
        const draft = drafts.get(key(ctx, actorId));
        if (draft) draft.selection[control.dataset.combatText] = control.value;
      }),
  );
  root.querySelectorAll("[data-combat-ammo]").forEach(
    (control) =>
      (control.onchange = () => {
        try {
          ctx.commit(ctx.t("Munizioni scelte", "Ammunition chosen"), (s) =>
            inv.selectAmmo(s, actorId, control.dataset.combatAmmo, control.value, ctx.role),
          );
        } catch (error) {
          ctx.toast(ctx.label(error.it ? { it: error.it, en: error.en } : error.message), true);
        }
      }),
  );
  root.querySelector("[data-combat-rule]")?.addEventListener("click", () => {
    const p = getPreview(ctx, actorId);
    const a = p?.action;
    ctx.dialog(
      ctx.t("Regola e calcolo", "Rule and calculation"),
      `<h3>${ctx.esc(actionName(ctx, a))}</h3><p>${ctx.esc(ctx.label(a?.shortDescription || ""))}</p>${renderActionSource(ctx, a)}<p class="muted">${ctx.t("Questo scenario misura in linea libera dal centro delle pedine, con muri, porte e terreno difficile espliciti. Coperture parziali, ingombro delle creature, regola delle diagonali su griglia e altre reazioni devono ancora essere collegati.", "This scenario measures free distances from token centres, with explicit walls, doors and difficult terrain. Partial cover, creature footprints, grid diagonal rules and other reactions are still to be connected.")}</p>`,
      { cancelLabel: ctx.t("Torna alla mossa", "Back to move") },
    );
  });
  root.querySelectorAll("[data-dart-plus],[data-dart-minus]").forEach(
    (b) =>
      (b.onclick = () => {
        const draft = drafts.get(key(ctx, actorId));
        const id = b.dataset.dartPlus || b.dataset.dartMinus;
        const assignments = draft.selection.allocations;
        const target = assignments.find((a) => a.actorId === id);
        target.count += b.dataset.dartPlus ? 1 : -1;
        if (target.count <= 0) assignments.splice(assignments.indexOf(target), 1);
        draft.selection.targetIds = assignments.map((a) => a.actorId);
        refreshMap(ctx, actorId);
      }),
  );
  root
    .querySelectorAll("[data-attempt-detail]")
    .forEach((b) => (b.onclick = () => openCombatRequests(ctx, b.dataset.attemptDetail)));
}
// TV-89 (D&D Beyond: right click or long press on every roll): the roll options of an
// attack in the action bar, in the dice tray's menu (same look and keys): the roll mode,
// «Danno critico» (DDB «Crit»: this attack's damage as a Critical Hit, its reason in the
// log) and «Chi vede» with the tray's audiences (Foundry roll modes, DDB «Roll to»). The
// choice opens the attack preview with it; the target is then clicked as usual.
let closeActionMenu = null;
// The audiences the tray offers this role (B34 audiencesFor), in its own words.
const menuAudiences = (ctx) =>
  typeof trayDomain?.audiencesFor === "function" ? trayDomain.audiencesFor(ctx.role) : [];
function openActionMenu(ctx, anchor, point, run) {
  closeActionMenu?.();
  const doc = anchor.ownerDocument ?? globalThis.document;
  if (!doc?.createElement) return;
  const menu = doc.createElement("div");
  menu.className = "dtray-menu combat-roll-menu";
  menu.setAttribute("role", "menu");
  menu.setAttribute("aria-label", ctx.t("Opzioni di tiro", "Roll options"));
  const audiences = menuAudiences(ctx);
  menu.innerHTML =
    [
      ["advantage", ctx.t("Tira con vantaggio", "Roll with advantage")],
      ["disadvantage", ctx.t("Tira con svantaggio", "Roll with disadvantage")],
      ["normal", ctx.t("Tira normale (un d20)", "Roll normally (one d20)")],
    ]
      .map(
        ([mode, label]) =>
          `<button type="button" role="menuitem" class="dtray-menu-item" data-combat-menu-mode="${mode}">${ctx.esc(label)}</button>`,
      )
      .join("") +
    `<button type="button" role="menuitem" class="dtray-menu-item" data-combat-menu-critical>${ctx.esc(ctx.t("Danno critico: i danni come colpo critico", "Critical damage: damage as a Critical Hit"))}</button>` +
    (audiences.length
      ? `<p class="dtray-menu-heading" role="presentation">${ctx.t("Chi vede", "Who sees")}</p>` +
        audiences
          .map(
            (a) =>
              `<button type="button" role="menuitem" class="dtray-menu-item" data-combat-menu-audience="${ctx.esc(a)}">${ctx.esc(audienceText(ctx, a, ctx.role))}</button>`,
          )
          .join("")
      : "");
  doc.body.append(menu);
  const rect = anchor.getBoundingClientRect();
  const view = doc.defaultView ?? globalThis;
  const x = point?.x ?? rect.left;
  const y = point?.y ?? rect.top;
  const width = menu.offsetWidth || 240;
  const height = menu.offsetHeight || 300;
  menu.style.left = `${Math.max(8, Math.min(x, view.innerWidth - width - 8))}px`;
  menu.style.top = `${Math.max(8, Math.min(y - height - 4, view.innerHeight - height - 8))}px`;
  const buttons = [...menu.querySelectorAll("[role=menuitem]")];
  const outside = (event) => {
    if (!menu.contains(event.target) && event.target !== anchor) closeActionMenu?.();
  };
  closeActionMenu = () => {
    doc.removeEventListener("pointerdown", outside, true);
    menu.remove();
    closeActionMenu = null;
  };
  menu.addEventListener("click", (event) => {
    const button = event.target.closest("[role=menuitem]");
    if (!button) return;
    closeActionMenu?.();
    run(
      button.dataset.combatMenuMode
        ? { rollMode: button.dataset.combatMenuMode }
        : button.hasAttribute("data-combat-menu-critical")
          ? { forceCritical: true }
          : { audience: button.dataset.combatMenuAudience },
    );
  });
  menu.addEventListener("keydown", (event) => {
    const index = buttons.indexOf(doc.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      closeActionMenu?.();
      anchor.focus?.({ preventScroll: true });
    } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      buttons[
        (index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length
      ].focus();
    } else if (event.key === "Tab") closeActionMenu?.();
  });
  doc.addEventListener("pointerdown", outside, true);
  buttons[0]?.focus();
}
// A menu choice joins the attack's open preview (so mode, critical and audience combine) or
// opens a new one with it.
function prepareWith(ctx, actorId, actionId, choice) {
  const existing = drafts.get(key(ctx, actorId));
  const selection =
    existing?.actionId === actionId ? existing.selection : { targetIds: [], allocations: [] };
  if (choice.rollMode === "normal") delete selection.rollMode;
  else if (choice.rollMode) selection.rollMode = choice.rollMode;
  if (choice.forceCritical) selection.forceCritical = true;
  if (choice.audience === "public") delete selection.audience;
  else if (choice.audience) selection.audience = choice.audience;
  drafts.set(key(ctx, actorId), {
    ...(existing?.actionId === actionId ? existing : {}),
    actionId,
    selection,
  });
  ctx.render();
}
export function bindCombatUI(root, ctx, actorId, onPrepare = () => {}) {
  root.querySelectorAll("[data-combat-action]").forEach((b) => {
    let timer = 0;
    let start = null;
    let longPressed = false;
    const blocked = () => b.dataset.combatBlocked;
    const clear = () => {
      clearTimeout(timer);
      timer = 0;
    };
    b.onclick = (event) => {
      if (longPressed) {
        longPressed = false;
        event?.preventDefault?.();
        return;
      }
      // TV-74: a greyed action says why instead of opening a preview that cannot run.
      if (blocked()) {
        ctx.toast(blocked(), true);
        return;
      }
      onPrepare();
      const existing = drafts.get(key(ctx, actorId));
      if (existing?.actionId === b.dataset.combatAction) drafts.delete(key(ctx, actorId));
      else
        drafts.set(key(ctx, actorId), {
          actionId: b.dataset.combatAction,
          selection: { targetIds: [], allocations: [] },
        });
      ctx.render();
    };
    if (b.dataset.combatKind !== "attack") return;
    const menu = (point) =>
      blocked()
        ? ctx.toast(blocked(), true)
        : openActionMenu(ctx, b, point, (choice) => {
            onPrepare();
            prepareWith(ctx, actorId, b.dataset.combatAction, choice);
          });
    b.oncontextmenu = (event) => {
      event.preventDefault();
      clear();
      if (longPressed) return;
      menu({ x: event.clientX, y: event.clientY });
    };
    b.onpointerdown = (event) => {
      if (event.button !== 0) return;
      longPressed = false;
      start = { x: event.clientX, y: event.clientY };
      clear();
      timer = setTimeout(() => {
        longPressed = true;
        menu(start);
      }, 500);
    };
    b.onpointermove = (event) => {
      if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) clear();
    };
    b.onpointerup = b.onpointercancel = b.onpointerleave = clear;
  });
  root.querySelectorAll("[data-combat-filter]").forEach(
    (b) =>
      (b.onclick = () => {
        // Pressing the active filter returns to every action (a lone filter is a toggle).
        barFilter = barFilter === b.dataset.combatFilter ? "all" : b.dataset.combatFilter;
        ctx.render();
      }),
  );
  root
    .querySelectorAll("[data-combat-reaction]")
    .forEach((b) => (b.onclick = () => ctx.openSheet?.(actorId, "actions")));
  root.querySelector("[data-combat-mode]")?.addEventListener("change", (e) => {
    diceMode = e.target.value;
  });
  root
    .querySelector("[data-combat-requests]")
    ?.addEventListener("click", () => openCombatRequests(ctx));
  bindDetail(root, ctx, actorId);
}
const diceLabel = (dice) =>
  (dice || []).map((group) => group.count + "d" + group.sides).join(" + ");
const faceList = (values) => (values || []).map((face) => face ?? "?").join(", ");
function renderBreakdown(ctx, request) {
  if (request.status === "expired") return ctx.t("Non più applicabile", "No longer applicable");
  if (request.status !== "resolved")
    return (
      ctx.t("In attesa", "Pending") +
      (Array.isArray(request.acceptedValues)
        ? " · " +
          (request.reusedFrom && !request.withdrawn
            ? ctx.t("facce del tentativo annullato: ", "faces of the withdrawn attempt: ")
            : ctx.t("ritirato con Annulla, facce note: ", "withdrawn by Undo, known faces: ")) +
          ctx.esc(faceList(request.acceptedValues))
        : "") +
      (Array.isArray(request.knownValues) && !Array.isArray(request.acceptedValues)
        ? " · " +
          ctx.t("facce già registrate: ", "already recorded faces: ") +
          ctx.esc(faceList(request.knownValues))
        : "")
    );
  // TV-89: a roll this viewer may not read shows who reads it, never its faces.
  if (request.hiddenResult) return ctx.esc(hiddenResultText(ctx, request.hiddenResult));
  // PG-47: the d20s first, then each rider's own die named («+ [3] (Benedizione)»).
  const riders = Array.isArray(request.riders) ? request.riders : [];
  const values = request.values || [];
  const main = riders.length ? values.slice(0, request.dice[0].count) : values;
  const riderText = (request.riderRolls ?? [])
    .map(
      (roll) =>
        (roll.sign < 0 ? " − " : " + ") +
        "[" +
        roll.faces.join(", ") +
        "] (" +
        ctx.label(roll.name) +
        ")",
    )
    .join("");
  return ctx.esc(
    (request.rollMode === "advantage"
      ? "max(" + main.join(", ") + ")"
      : request.rollMode === "disadvantage"
        ? "min(" + main.join(", ") + ")"
        : main.join(" + ")) +
      riderText +
      (request.modifier < 0 ? " − " : " + ") +
      Math.abs(request.modifier || 0) +
      " = " +
      request.total +
      (request.inspirationReroll
        ? " · " +
          ctx.t("ritirato con Ispirazione eroica", "rerolled with Heroic Inspiration") +
          ": " +
          request.inspirationReroll.from +
          " → " +
          request.inspirationReroll.to
        : ""),
  );
}
const hiddenResultText = (ctx, audience) =>
  audience === "blind"
    ? ctx.t("Risultato riservato al DM", "Result reserved for the DM")
    : audience === "self"
      ? ctx.t("Tiro privato di chi tira", "The roller's private roll")
      : ctx.t("Risultato riservato", "Private result");
function renderEvidence(ctx, roll) {
  if (roll.status === "superseded")
    return ctx.esc(
      faceList(roll.values) +
        " · " +
        (roll.dice ? diceLabel(roll.dice) : "?") +
        " → " +
        diceLabel(roll.newDice) +
        " · " +
        ctx.t("Sostituite dal nuovo profilo dei dadi: ", "Superseded by the new dice profile: ") +
        faceList(roll.supersededValues) +
        (roll.keptValues?.length
          ? " · " + ctx.t("conservate: ", "kept: ") + faceList(roll.keptValues)
          : ""),
    );
  let html = renderBreakdown(ctx, { ...roll, status: "resolved" });
  if (roll.knownValues?.some((face) => face !== null))
    html +=
      " · " +
      ctx.esc(
        ctx.t("Facce già registrate: ", "Already recorded faces: ") +
          roll.knownValues.filter((face) => face !== null).join(", "),
      );
  if (roll.correctionReason)
    html +=
      " · " +
      ctx.esc(
        ctx.t("Corregge ", "Corrects ") +
          faceList(roll.previousValues) +
          " · " +
          ctx.t("Motivo: ", "Reason: ") +
          roll.correctionReason,
      );
  return html;
}
const MODE_NAMES = {
  physical: ["Fisico", "Physical"],
  digital: ["Digitale", "Digital"],
  connected: ["Dado connesso", "Connected die"],
};
// The dice origin of a history row; a mixed completion names each die's origin.
function modeLabel(ctx, roll) {
  const modes = Array.isArray(roll.faceModes) ? roll.faceModes : null;
  if (modes && new Set(modes).size > 1)
    return (
      " · " +
      modes
        .map(
          (mode, i) =>
            ctx.t(...(MODE_NAMES[mode] ?? ["Origine non registrata", "Unrecorded origin"])) +
            " (" +
            ctx.t("dado", "die") +
            " " +
            (i + 1) +
            ")",
        )
        .join(" + ")
    );
  const mode = modes?.[0] ?? roll.mode;
  return MODE_NAMES[mode] ? " · " + ctx.t(...MODE_NAMES[mode]) : "";
}
// A log roll with what its live request knows: the riders it rolled (PG-47), whether this
// viewer may read it (TV-89 audience) and, for the accepted reroll, Heroic Inspiration.
function historyRoll(ctx, roll) {
  const attempt = ctx.state.combatAttempts?.find((entry) => entry.id === roll.attemptId);
  const request = attempt?.requests.find((entry) => entry.id === roll.requestId);
  // The evidence keeps its attack's audience (state.mjs), so the rule holds after the attempt
  // is gone; older evidence reads the live attempt.
  const gate = roll.audience ? roll : attempt;
  if (gate && !canSeeAttemptValues(ctx.state, gate, ctx.role))
    return {
      source: roll.source,
      kind: roll.kind,
      actorName: roll.actorName,
      mode: roll.mode,
      hiddenResult: gate.audience,
    };
  if (!attempt) return roll;
  if (!request?.riders?.length && !request?.inspirationReroll) return roll;
  const same = JSON.stringify(roll.values) === JSON.stringify(request.values);
  return {
    ...roll,
    riders: request.riders,
    riderRolls: request.riders?.length ? requestRiderRolls(request, roll.values ?? []) : undefined,
    ...(same && request.inspirationReroll ? { inspirationReroll: request.inspirationReroll } : {}),
  };
}
// The riders' faces of a recorded roll (the d20s first, then each rider's dice).
function requestRiderRolls(request, values) {
  let offset = request.dice[0].count;
  return request.riders.map((rider) => {
    const faces = values.slice(offset, offset + rider.dice.count);
    offset += rider.dice.count;
    return { id: rider.id, name: rider.name, sign: rider.sign, faces };
  });
}
export function renderRollHistory(ctx, attemptId = "") {
  const reversed = new Set(
    ctx.state.log.filter((entry) => entry.kind === "correction").map((entry) => entry.revertsId),
  );
  const runner = sessionAuthority(ctx.state, ctx.role);
  const entries = ctx.state.log.flatMap((entry) =>
    (entry.rolls || [])
      .filter(
        (roll) =>
          roll.source === "combat" &&
          (!attemptId || roll.attemptId === attemptId) &&
          (roll.personal === true
            ? roll.owner === ctx.role || roll.controller === ctx.role
            : runner ||
              roll.visibility === "shared" ||
              roll.owner === ctx.role ||
              roll.controller === ctx.role),
      )
      .map((roll) => ({ roll: historyRoll(ctx, roll), reversed: reversed.has(entry.id) })),
  );
  if (!entries.length) return "";
  return `<details class="roll-evidence"><summary>${ctx.t("Storico dei tiri", "Roll history")} (${entries.length})</summary><p class="muted">${ctx.t("I dadi già registrati restano consultabili anche dopo una correzione.", "Recorded dice stay available after a correction.")}</p><ol>${entries
    .slice()
    .reverse()
    .map(
      ({ roll, reversed }) =>
        `<li><strong>${ctx.esc(maskedFor(ctx.state, ctx.role, roll.actorName || ""))} · ${kindLabel(ctx, roll.kind)}</strong><br>${renderEvidence(ctx, roll)} · ${reversed ? ctx.t("Annullato · risultato conservato", "Reversed · result retained") : roll.status === "superseded" ? ctx.t("Sostituito", "Superseded") : roll.status === "reused" ? ctx.t("Riusato: stesse facce del tentativo annullato", "Reused: the same faces as the withdrawn attempt") : ctx.t("Registrato", "Recorded")}${modeLabel(ctx, roll)}</li>`,
    )
    .join("")}</ol></details>`;
}
// B20 automation level on the attack card: an assisted "ready" outcome offers Apply to
// whoever controls the target, the DM for their creatures (dnd5e FVT-138); the latest
// applied card offers the identity's Undo (Midi-QOL FVT-141).
function readyControl(ctx, attempt, outcome) {
  if (outcome.status !== "ready") return "";
  const target = ctx.state.actors[outcome.actorId];
  const canApply = Boolean(target) && ctx.canControl(target);
  return ` · <span class="combat-ready">${ctx.t("da applicare", "to apply")}</span>${canApply ? ` <button type="button" class="button primary" data-apply-outcome="${ctx.esc(outcome.actorId)}" data-attempt="${ctx.esc(attempt.id)}">${ctx.t("Applica", "Apply")}</button>` : ` · ${target?.owner === "dm" ? ctx.t("lo applica il DM", "the DM applies it") : ctx.t("lo applica chi controlla il bersaglio", "whoever controls the target applies it")}`}`;
}
// TV-54 (dnd5e: the failed save's card offers the Legendary Resistance): a DM creature
// with uses left turns a failed save into a success before its damage is applied.
function resistControl(ctx, attempt, outcome) {
  // C3 (CA-57): whoever runs the session decides for the DM's creatures.
  if (
    !sessionAuthority(ctx.state, ctx.role) ||
    outcome.saveSuccess !== false ||
    outcome.status !== "ready"
  )
    return "";
  const monster = sliceOfTracker(ctx.state)?.monsters?.[outcome.actorId];
  const left = monster?.resistance ? monster.resistance.max - monster.resistance.used : 0;
  return left > 0
    ? ` <button type="button" class="button" data-use-resistance="${ctx.esc(outcome.actorId)}" data-attempt="${ctx.esc(attempt.id)}">${ctx.t("Usa resistenza leggendaria", "Use Legendary Resistance")} (${left}/${monster.resistance.max})</button>`
    : "";
}
function undoControl(ctx, attempt) {
  const latest = ctx.state.combatAttempts?.at(-1)?.id === attempt.id;
  // Only the identity's own last change that resolved or applied this card.
  const own = [
    ctx.t("Dadi digitali tirati", "Digital dice rolled"),
    ctx.t("Tiro registrato", "Roll recorded"),
    ctx.t("Danni applicati", "Damage applied"),
  ].includes(ctx.undoLabel?.());
  if (!latest || !own || !attempt.outcomes?.some((o) => o.status === "applied") || !ctx.canUndo?.())
    return "";
  return `<div class="toolbar"><button type="button" class="button" data-undo-outcome>${ctx.t("Annulla", "Undo")}</button><small class="muted">${ctx.esc(ctx.undoLabel?.() ?? "")}</small></div>`;
}
const AUDIENCE_LABELS = {
  gm: ["Io e il DM", "Me and the DM"],
  blind: ["Solo il DM", "DM only"],
  self: ["Solo io", "Only me"],
};
// «Chi vede» of an attempt, in the dice tray's words (B34); the DM's own «Solo io» reads «Solo DM».
function audienceText(ctx, audience, roller) {
  if (trayDomain?.audienceName) return ctx.label(trayDomain.audienceName(audience, roller));
  if (audience === "self" && roller === "dm") return ctx.t("Solo DM", "DM only");
  return AUDIENCE_LABELS[audience]
    ? ctx.t(...AUDIENCE_LABELS[audience])
    : ctx.t("Tutti", "Everyone");
}
// The DC of a save or check as this viewer may read it (C1: «CD nascosta», FG hidden DC).
function dcText(ctx, request) {
  const hidden = request.dcHidden && !sessionAuthority(ctx.state, ctx.role);
  if (Number.isInteger(request.dc) && !hidden) return ctx.t("CD ", "DC ") + request.dc;
  return hidden ? ctx.t("CD nascosta", "Hidden DC") : "";
}
const CRITICAL_REASONS = {
  "natural-20": ["20 naturale", "natural 20"],
  "within-1.5-m": ["colpo entro 1,5 m", "hit within 1.5 m"],
  declared: ["danno critico dichiarato", "declared critical damage"],
};
function criticalText(ctx, o) {
  if (!o.critical) return "";
  const reasons = (o.criticalReasons ?? []).map((code) => ctx.t(...CRITICAL_REASONS[code]));
  return (
    " · " +
    ctx.t("Critico", "Critical") +
    (reasons.length ? " (" + reasons.join(", ") + ")" : "") +
    (o.criticalRule === "max"
      ? " · " +
        ctx.t(
          "dadi al massimo più un tiro (regola della campagna)",
          "dice at maximum plus a roll (campaign rule)",
        )
      : "")
  );
}
// TV-83 (BG3 reroll with Inspiration): the held d20 offers the reroll or «Continua».
function holdControls(ctx, a, r) {
  if (r.hold !== "inspiration") return "";
  if (!roleCanRoll(ctx, r))
    return `<p class="muted combat-hold">${ctx.t("In attesa della scelta sull’Ispirazione eroica di chi ha tirato.", "Waiting for the roller's Heroic Inspiration choice.")}</p>`;
  return `<div class="combat-hold" data-inspiration-hold="${ctx.esc(r.id)}"><p>${ctx.t("Hai l’Ispirazione eroica: puoi ritirare il d20 appena tirato e usare il nuovo risultato (SRD 5.2.1). Nulla colpisce né infligge danni prima della scelta.", "You have Heroic Inspiration: you can reroll the d20 you just rolled and use the new result (SRD 5.2.1). Nothing hits or deals damage before you choose.")}</p><div class="toolbar"><button type="button" class="button primary" data-inspiration-reroll="${ctx.esc(r.id)}" data-attempt="${ctx.esc(a.id)}">${ctx.t("Usa Ispirazione eroica: ritira il d20", "Use Heroic Inspiration: reroll the d20")}</button><button type="button" class="button" data-inspiration-keep="${ctx.esc(r.id)}" data-attempt="${ctx.esc(a.id)}">${ctx.t("Continua", "Continue")}</button></div></div>`;
}
function requestRowHTML(ctx, a, r) {
  const dc = ["save", "check", "concentration"].includes(r.kind) ? dcText(ctx, r) : "";
  return `<div class="roll-request"><div><strong>${ctx.esc(displayName(ctx.state, r.actorId, ctx.role))} · ${kindLabel(ctx, r.kind)}${dc ? " · " + ctx.esc(dc) : ""}</strong><small>${renderBreakdown(ctx, r)}</small>${holdControls(ctx, a, r)}</div>${r.status === "pending" && roleCanRoll(ctx, r) ? `<button class="button primary" data-request-open="${ctx.esc(r.id)}" data-attempt="${ctx.esc(a.id)}">${Array.isArray(r.acceptedValues) ? ctx.t("Riapplica risultato noto", "Reapply known result") : ctx.t("Risolvi tiro", "Resolve roll")}</button>` : ""}</div>`;
}
function outcomeHTML(ctx, a, o) {
  const result = o.hiddenResult
    ? ctx.esc(hiddenResultText(ctx, o.hiddenResult))
    : ["death-save", "medicine", "stable-recovery"].includes(a.actionId)
      ? ctx.esc(vitalityOutcomeText(ctx, o))
      : o.status === "pending"
        ? ctx.t("In attesa del tiro", "Awaiting roll")
        : o.hit === false
          ? ctx.t("Mancato", "Miss")
          : typeof o.damage === "number"
            ? o.damage + " " + ctx.t("danni", "damage")
            : ctx.esc(
                ctx.label(
                  o.label || (o.effect ? getDefinition(ctx, a.actorId, o.effect)?.name : ""),
                ),
              );
  return `<p class="combat-outcome">${ctx.esc(o.name || "")} · ${result}${criticalText(ctx, o)}${o.saveSuccess !== undefined ? " · " + ctx.t(o.saveSuccess ? "TS riuscito" : "TS fallito", o.saveSuccess ? "Save succeeded" : "Save failed") : ""}${o.darts ? " · " + o.darts.map((d) => d.face + " + 1 = " + d.total).join("; ") : ""}${typeof o.tempHpAbsorbed === "number" && o.tempHpBefore > 0 ? " · " + o.tempHpAbsorbed + " " + ctx.t("assorbiti dai PF temporanei", "absorbed by temporary HP") + " (" + o.tempHpBefore + " → " + o.tempHpAfter + ")" : ""}${typeof o.hpAfter === "number" ? " · " + o.hpAfter + " " + ctx.t("PF rimasti", "HP remaining") : ""}${o.autoFailSave ? " · " + ctx.t("TS fallito automaticamente", "Save failed automatically") + ": " + ctx.esc((o.autoFailReasons || []).map((r) => ctx.label(r.name)).join(", ")) : ""}${o.knockout ? " · " + ctx.t("Knockout: 1 PF, Privo di sensi, riposo breve avviato", "Knockout: 1 HP, Unconscious, Short Rest started") : ""}${o.dead ? " · " + ctx.t("Morto", "Dead") : ""}${o.deathSaveFailures ? " · " + o.deathSaveFailures + " " + ctx.t("fallimenti contro la morte", "death save failures") : ""}${(o.conditions || []).map((c) => " · " + (c.applied ? ctx.t("Prono applicato", "Prone applied") : c.reconciliation === "size-unknown" ? ctx.t("Prono da verificare: taglia non registrata", "Prone to verify: size not recorded") : c.reconciliation ? ctx.t("Prono da verificare: immunità non registrate", "Prone to verify: immunities not recorded") : ctx.t("Prono non applicabile per taglia", "Prone does not apply to this size"))).join("")}${readyControl(ctx, a, o)}${resistControl(ctx, a, o)}</p>`;
}
function attemptCardHTML(ctx, a) {
  const held = (a.requests || []).some((r) => r.hold === "inspiration");
  const badge = (a.outcomes || []).some((o) => o.status === "ready")
    ? ctx.t("Da applicare", "To apply")
    : held
      ? ctx.t("Scegli: ritira o continua", "Choose: reroll or continue")
      : a.status === "resolved"
        ? ctx.t("Risolto", "Resolved")
        : ctx.t("In attesa", "Pending");
  const roller = ctx.state.combatAttempts?.find((entry) => entry.id === a.id)?.acceptedBy;
  return `<section class="attempt-result"><h3>${ctx.esc(a.actorName || ctx.t("Origine riservata", "Private source"))} · ${ctx.esc(actionName(ctx, a))}</h3><span class="badge">${badge}</span>${a.audience && a.audience !== "public" ? ` <span class="badge combat-audience" data-attempt-audience="${ctx.esc(a.audience)}">${ctx.t("Chi vede", "Who sees")}: ${ctx.esc(audienceText(ctx, a.audience, roller))}</span>` : ""}${a.declaredCritical ? `<p class="effect-note" data-declared-critical>${ctx.t("Danno critico dichiarato", "Declared critical damage")}${a.declaredCritical.reason ? ": " + ctx.esc(a.declaredCritical.reason) : ""}</p>` : ""}<p>${ctx.t("Chiudere conserva i risultati e le richieste; non rimborsa il tentativo.", "Closing keeps results and requests; it does not refund the attempt.")}</p>${(a.requests || []).map((r) => requestRowHTML(ctx, a, r)).join("")}${pendingCount(a) > (a.requests || []).filter((r) => r.status === "pending").length ? `<p class="pending-other">${ctx.t("Altri tiri attendono il loro controllore.", "Other rolls await their controller.")}</p>` : ""}${a.waiting?.length ? `<ul class="combat-waiting">${a.waiting.map((w) => `<li>${ctx.esc(w.name)} · ${w.owner === "dm" ? "DM" : ctx.t("Giocatore", "Player")}</li>`).join("")}</ul>` : ""}${(a.outcomes || []).map((o) => outcomeHTML(ctx, a, o)).join("")}${undoControl(ctx, a)}</section>`;
}
// `returnTo` (optional) brings the user back to where the roll started, such as the
// Conditions and status panel, instead of only closing the dialog.
export function openCombatRequests(ctx, attemptId = "", { returnTo } = {}) {
  // TV-92: the player's list holds their own attempts and requests (projectAttempts `own`).
  const attempts = projectAttempts(ctx.state, ctx.role)
    .filter((a) => a.own && (!attemptId || a.id === attemptId))
    .slice()
    .reverse();
  ctx.dialog(
    ctx.t("Tiri e risultati", "Rolls and results"),
    `<div class="combat-results">${renderReactionRequests(ctx)}${
      attempts.map((a) => attemptCardHTML(ctx, a)).join("") ||
      `<p>${ctx.t("Nessun tentativo registrato.", "No attempts recorded.")}</p>`
    }${renderRollHistory(ctx, attemptId)}${typeof returnTo === "function" ? `<div class="toolbar"><button type="button" class="button primary" data-return-conditions>${ctx.t("Torna a Condizioni e stato", "Back to Conditions and status")}</button></div>` : ""}</div>`,
    { cancelLabel: ctx.t("Torna al gioco", "Return to game") },
  );
  bindReactionRequests(document.querySelector("#dialog"), ctx, {
    mode: () => diceMode,
    refresh: () => openCombatRequests(ctx),
    accepted: ({ actorId, mode, attemptIds }) => {
      const request = attemptIds
        .flatMap((id) =>
          (ctx.state.combatAttempts.find((a) => a.id === id)?.requests || [])
            .filter((r) => r.status === "pending" && r.actorId === actorId)
            .map((request) => ({ id, request })),
        )
        .at(0);
      if (mode === "physical" && request) openRoll(ctx, request.id, request.request.id);
      else openCombatRequests(ctx);
    },
  });
  document
    .querySelectorAll("[data-request-open]")
    .forEach(
      (b) =>
        (b.onclick = () => openRoll(ctx, b.dataset.attempt, b.dataset.requestOpen, { returnTo })),
    );
  // TV-83: «Usa Ispirazione eroica: ritira il d20» or «Continua» on a held d20.
  document.querySelectorAll("#dialog [data-inspiration-keep]").forEach(
    (b) =>
      (b.onclick = () => {
        const attempt = ctx.state.combatAttempts?.find((entry) => entry.id === b.dataset.attempt);
        try {
          ctx.commit(
            ctx.t("Tiro tenuto senza Ispirazione eroica", "Roll kept without Heroic Inspiration"),
            (s) => {
              continueWithoutInspiration(s, b.dataset.attempt, b.dataset.inspirationKeep, ctx.role);
              resolveAutomaticRolls(s, rollDie);
            },
            commitOptionsFor(attempt),
          );
        } catch (error) {
          ctx.toast(ctx.label(error.it ? { it: error.it, en: error.en } : error.message), true);
          return;
        }
        openCombatRequests(ctx, attemptId, { returnTo });
      }),
  );
  document.querySelectorAll("#dialog [data-inspiration-reroll]").forEach(
    (b) =>
      (b.onclick = () =>
        openInspirationReroll(ctx, b.dataset.attempt, b.dataset.inspirationReroll, {
          attemptId,
          returnTo,
        })),
  );
  // B20 assisted automation: Apply commits the waiting outcome; Undo reverts the card.
  document.querySelectorAll("#dialog [data-apply-outcome]").forEach(
    (b) =>
      (b.onclick = () => {
        try {
          ctx.commit(ctx.t("Danni applicati", "Damage applied"), (s) =>
            applyReadyOutcome(s, b.dataset.attempt, b.dataset.applyOutcome, ctx.role),
          );
        } catch (error) {
          ctx.toast(ctx.label(error.it ? { it: error.it, en: error.en } : error.message), true);
          return;
        }
        openCombatRequests(ctx, attemptId, { returnTo });
      }),
  );
  document.querySelectorAll("#dialog [data-use-resistance]").forEach(
    (b) =>
      (b.onclick = () => {
        try {
          ctx.commit(
            ctx.t(
              "Resistenza leggendaria: TS riuscito per ",
              "Legendary Resistance: save succeeds for ",
            ) + (ctx.state.actors[b.dataset.useResistance]?.name ?? ""),
            (s) =>
              useLegendaryResistance(
                s,
                sliceOfTracker(s),
                b.dataset.useResistance,
                b.dataset.attempt,
                ctx.role,
              ),
            turnLogOptionsFor(ctx.state, b.dataset.useResistance),
          );
        } catch (error) {
          ctx.toast(ctx.label(error.it ? { it: error.it, en: error.en } : error.message), true);
          return;
        }
        openCombatRequests(ctx, attemptId, { returnTo });
      }),
  );
  document.querySelectorAll("#dialog [data-undo-outcome]").forEach(
    (b) =>
      (b.onclick = () => {
        ctx.undo();
        openCombatRequests(ctx, attemptId, { returnTo });
      }),
  );
  const back = document.querySelector("[data-return-conditions]");
  if (back) back.onclick = () => returnTo();
}
// TV-89: a roll only its roller reads («Solo io») leaves a private log line: the label and
// the dice stay with the roller (state.mjs marks the rolls of a private commit private).
function commitOptionsFor(attempt) {
  return attempt?.audience === "self" ? { visibility: "private" } : {};
}
// TV-83: the reroll with Heroic Inspiration, digital or with a physical die's new face.
function openInspirationReroll(ctx, attemptId, requestId, back = {}) {
  const attempt = ctx.state.combatAttempts?.find((entry) => entry.id === attemptId);
  const request = attempt?.requests.find((entry) => entry.id === requestId);
  if (!request || request.hold !== "inspiration") return;
  const commit = (face) => {
    ctx.commit(
      ctx.t("Ispirazione eroica: d20 ritirato", "Heroic Inspiration: d20 rerolled"),
      (s) => {
        useHeroicInspiration(s, attemptId, requestId, ctx.role, {
          ...(face === undefined ? { rollDie } : { face }),
        });
        resolveAutomaticRolls(s, rollDie);
      },
      commitOptionsFor(attempt),
    );
    openCombatRequests(ctx, back.attemptId ?? "", { returnTo: back.returnTo });
  };
  const physical = (request.mode ?? attempt.mode) === "physical";
  if (!physical) {
    try {
      commit(undefined);
    } catch (error) {
      ctx.toast(ctx.label(error.it ? { it: error.it, en: error.en } : error.message), true);
    }
    return;
  }
  ctx.dialog(
    ctx.t("Ritira il d20", "Reroll the d20"),
    `<p>${ctx.t("Lancia di nuovo il d20 e inserisci la nuova faccia: vale il nuovo risultato e l’Ispirazione eroica si spende.", "Roll the d20 again and enter the new face: the new result counts and Heroic Inspiration is spent.")}</p><label class="field">${ctx.t("Dadi", "Dice")}<select name="diceMode"><option value="physical">${ctx.t("Fisici", "Physical")}</option><option value="digital">${ctx.t("Digitali", "Digital")}</option></select></label><label class="field">${ctx.t("Nuova faccia del d20", "New d20 face")}<input type="number" name="face" min="1" max="20" step="1" inputmode="numeric"></label>`,
    {
      submitLabel: ctx.t("Registra il nuovo d20", "Record the new d20"),
      cancelLabel: ctx.t("Torna ai tiri", "Back to rolls"),
      onSubmit: (data) => {
        const digital = data.get("diceMode") === "digital";
        const face = Number(data.get("face"));
        if (!digital && (!Number.isInteger(face) || face < 1 || face > 20))
          throw Error(
            ctx.t(
              "Inserisci la faccia naturale del d20, da 1 a 20.",
              "Enter the d20's natural face, from 1 to 20.",
            ),
          );
        commit(digital ? undefined : face);
      },
    },
  );
}
export function openRoll(ctx, attemptId, requestId, options = {}) {
  const attempt = projectAttempts(ctx.state, ctx.role).find((a) => a.id === attemptId);
  const request = attempt?.requests.find((r) => r.id === requestId);
  if (!request || request.status !== "pending" || !roleCanRoll(ctx, request)) return;
  if (request.needsData) {
    ctx.toast(
      ctx.t(
        "Correggi prima il punteggio di Costituzione nella scheda. Il tiro rimane in attesa.",
        "Correct the Constitution score on the sheet first. The roll stays pending.",
      ),
      true,
    );
    return;
  }
  if (Array.isArray(request.acceptedValues)) {
    const sides = requestFaces(request);
    ctx.dialog(
      ctx.t("Riapplica risultato noto", "Reapply known result"),
      `<p>${ctx.esc(displayName(ctx.state, request.actorId, ctx.role))} · ${ctx.esc(request.acceptedValues.join(", "))}</p><p>${ctx.t("Queste facce sono già registrate. Annullare ha ritirato la loro applicazione; riapplicarle non tira nuovi dadi.", "These faces are already recorded. Undo withdrew their application; reapplying does not roll new dice.")}</p>${recomputedNote(ctx, request)}<details><summary>${ctx.t("Correggi una registrazione errata", "Correct a mistaken record")}</summary><p>${ctx.t("Indica le facce corrette e il motivo. Anche la registrazione precedente rimane nello storico.", "Enter the correct faces and a reason. The previous record also remains in history.")}</p>${sides.map((s, i) => `<label class="field">${ctx.t("Dado", "Die")} ${i + 1} · d${s}<input type="number" name="knownFace${i}" min="1" max="${s}" step="1" required value="${ctx.esc(request.acceptedValues[i])}"></label>`).join("")}<label class="field">${ctx.t("Motivo della correzione", "Correction reason")}<input name="correctionReason" maxlength="300"></label></details>`,
      {
        submitLabel: ctx.t("Riapplica risultato", "Reapply result"),
        cancelLabel: ctx.t("Riduci richiesta", "Minimize request"),
        onSubmit: (data) => {
          const values = sides.map((_, i) => Number(data.get("knownFace" + i)));
          ctx.commit(
            ctx.t("Risultato riapplicato", "Result reapplied"),
            (s) => {
              resolveRoll(s, attemptId, requestId, values, ctx.role, {
                correctionReason: data.get("correctionReason"),
              });
              resolveAutomaticRolls(s, rollDie);
            },
            commitOptionsFor(ctx.state.combatAttempts?.find((entry) => entry.id === attemptId)),
          );
          openCombatRequests(ctx, attemptId, options);
        },
      },
    );
    return;
  }
  if (Array.isArray(request.knownValues)) {
    openRollCompletion(ctx, attempt, request, options);
    return;
  }
  const sides = requestFaces(request),
    draftKey = ctx.role + ":" + requestId;
  const requestMode = request.mode || attempt.mode || diceMode;
  const previous = physicalDrafts.get(draftKey) || [];
  const labels = faceLabels(ctx, request);
  // C6 (R2 TV-95, Pixels/Owlbear connected dice): the connected die, when one fits every die.
  const connected =
    typeof trayUI?.awaitConnectedFaces === "function" &&
    typeof trayUI?.hasConnectedDie === "function" &&
    [...new Set(sides)].every((side) => guardedUI(() => trayUI.hasConnectedDie(ctx, side)));
  const dc = dcText(ctx, request);
  // A DM request (B34) is named by its card; C1: its DC as the viewer may read it.
  const heading =
    request.label ?? (attempt.actionId === "roll-request" ? attempt.actionName : null);
  const stored = ctx.state.combatAttempts?.find((entry) => entry.id === attemptId);
  const record = (values, mode, connectedDice = null) => {
    ctx.commit(
      ctx.t("Tiro registrato", "Roll recorded"),
      (s) => {
        resolveRoll(s, attemptId, requestId, values, ctx.role);
        const stored = s.combatAttempts
          .find((a) => a.id === attemptId)
          .requests.find((r) => r.id === requestId);
        stored.mode = mode;
        // C6: a connected die is a physical die that names itself (R2's request.devices).
        if (connectedDice?.faceModes?.length) stored.faceModes = connectedDice.faceModes;
        if (connectedDice?.devices?.length) stored.devices = connectedDice.devices;
        resolveAutomaticRolls(s, rollDie);
      },
      commitOptionsFor(stored),
    );
    physicalDrafts.delete(draftKey);
    openCombatRequests(ctx, attemptId, options);
  };
  ctx.dialog(
    ctx.t("Risolvi tiro", "Resolve roll"),
    // B40 (additive): a request that names what it is for (a fall, a grapple save) says so;
    // its DC only when the request does not keep it for the DM (dcHidden, or C1's «CD nascosta»).
    `${heading ? `<p class="roll-request-label"><strong>${ctx.esc(ctx.label(heading))}</strong>${dc ? " · " + ctx.esc(dc) : ""}</p>` : ""}${request.kind === "concentration" ? `<p><strong>${ctx.t("Concentrazione", "Concentration")} · ${ctx.esc(ctx.label(request.concentrationName))}</strong></p><p>${ctx.t("Tiro salvezza di Costituzione", "Constitution saving throw")}${dc ? " · " + ctx.esc(dc) : ""}. ${ctx.t("Se fallisce, questo effetto termina.", "On failure, this effect ends.")}</p>` : ""}${vitalityRuleHTML(ctx, request)}${(request.kind === "attack" ? (rules) => rollSummaryHTML(ctx, { rollMode: request.rollMode, rollReasons: request.rollReasons ?? [], conditionRules: rules }) : (rules) => conditionReasonsHTML(ctx, rules))(request.conditionReasons ? { ...request.conditionReasons, modifierSources: request.modifierSources } : request.modifierSources?.length ? { modifierSources: request.modifierSources } : null)}<p>${ctx.esc(displayName(ctx.state, request.actorId, ctx.role))} · ${ctx.esc(labels.join(" + "))} ${request.modifier < 0 ? "−" : "+"} ${Math.abs(request.modifier || 0)}</p>${recomputedNote(ctx, request)}<label class="field">${ctx.t("Dadi", "Dice")}<select name="diceMode"><option value="digital">${ctx.t("Digitali", "Digital")}</option><option value="physical" ${requestMode === "physical" ? "selected" : ""}>${ctx.t("Fisici", "Physical")}</option>${connected ? `<option value="connected">${ctx.t("Dado connesso", "Connected die")}</option>` : ""}</select></label><div class="physical-roll-fields" ${requestMode === "physical" ? "" : "hidden"}>${sides.map((s, i) => `<label class="field">${ctx.t("Dado", "Die")} ${i + 1} · ${ctx.esc(labels[i])}<input type="number" name="face${i}" min="1" max="${s}" step="1" value="${ctx.esc(previous[i] ?? "")}" inputmode="numeric"></label>`).join("")}</div><p class="muted" data-connected-status role="status" hidden>${ctx.t("In attesa del dado connesso…", "Waiting for the connected die…")}</p><p class="muted">${ctx.t("Inserisci le facce naturali. Il modificatore viene aggiunto una volta. Esc lascia il tiro pendente.", "Enter natural faces. The modifier is added once. Escape leaves the roll pending.")}</p>`,
    {
      submitLabel: ctx.t("Registra tiro", "Record roll"),
      cancelLabel: ctx.t("Riduci richiesta", "Minimize request"),
      onSubmit: (data, form) => {
        if (data.get("diceMode") === "connected") {
          readConnectedFaces(ctx, request, form, labels).then((read) => {
            if (read) record(read.values, "physical", read);
          });
          return false;
        }
        const physical = data.get("diceMode") === "physical";
        const values = sides.map((s, i) =>
          physical
            ? String(data.get("face" + i)).trim() === ""
              ? NaN
              : Number(data.get("face" + i))
            : rollDie(s),
        );
        if (values.some((v, i) => !Number.isInteger(v) || v < 1 || v > sides[i]))
          throw Error(
            ctx.t(
              "Completa tutti i dadi con facce valide.",
              "Fill every die with a valid natural face.",
            ),
          );
        record(values, physical ? "physical" : "digital");
      },
    },
  );
  const form = document.querySelector("#dialog form");
  form.querySelector("[name=diceMode]").onchange = (e) =>
    (form.querySelector(".physical-roll-fields").hidden = e.target.value !== "physical");
  form.querySelectorAll("[name^=face]").forEach(
    (input) =>
      (input.oninput = () =>
        physicalDrafts.set(
          draftKey,
          sides.map((_, i) => form.querySelector("[name=face" + i + "]").value),
        )),
  );
}
const guardedUI = (run) => {
  try {
    return Boolean(run());
  } catch {
    return false;
  }
};
// Each die of a request named: "d20", then its riders' dice ("d4 (Benedizione)", PG-47).
function faceLabels(ctx, request) {
  return (request.dice || []).flatMap((group) =>
    Array.from(
      { length: group.count },
      () => "d" + group.sides + (group.label ? " (" + ctx.label(group.label) + ")" : ""),
    ),
  );
}
// C6: the faces of the connected dice, one group at a time (dice-tray awaitConnectedFaces);
// null when a die does not answer, with the way back to typing the faces.
async function readConnectedFaces(ctx, request, form, labels) {
  const status = form?.querySelector("[data-connected-status]");
  if (status) {
    status.hidden = false;
    status.textContent = ctx.t("In attesa del dado connesso…", "Waiting for the connected die…");
  }
  const values = [],
    faceModes = [],
    devices = [];
  for (const group of request.dice || []) {
    let faces = null;
    try {
      faces = await trayUI.awaitConnectedFaces(ctx, {
        actorId: request.actorId,
        sides: group.sides,
        count: group.count,
        label: labels[values.length] ?? "d" + group.sides,
      });
    } catch {
      faces = null;
    }
    if (
      !Array.isArray(faces) ||
      faces.length !== group.count ||
      faces.some((face) => !Number.isInteger(face) || face < 1 || face > group.sides)
    ) {
      if (status)
        status.textContent = ctx.t(
          "Il dado connesso non ha risposto: scegli «Fisici» e inserisci le facce.",
          "The connected die did not answer: choose “Physical” and enter the faces.",
        );
      return null;
    }
    values.push(...faces);
    faceModes.push(...(faces.faceModes ?? faces.map(() => "connected")));
    if (Array.isArray(faces.devices)) devices.push(...structuredClone(faces.devices));
  }
  return { values, faceModes, devices };
}
function recomputedNote(ctx, request) {
  const from = request.recomputedFrom;
  if (!from) return "";
  return `<p class="muted">${ctx.esc(
    ctx.t("Il profilo dei dadi è cambiato: ", "The dice profile changed: ") +
      (from.dice ? diceLabel(from.dice) : "?") +
      " → " +
      diceLabel(request.dice) +
      ". " +
      ctx.t(
        "Le facce compatibili restano valide e non vengono ritirate.",
        "Compatible faces stay valid and are not rerolled.",
      ) +
      (from.supersededValues?.length
        ? " " +
          ctx.t(
            "Facce sostituite, conservate nello storico: ",
            "Superseded faces, kept in history: ",
          ) +
          faceList(from.supersededValues) +
          "."
        : ""),
  )}</p>`;
}
// A recomputed dice profile keeps its compatible faces: only the missing dice are rolled or typed.
function openRollCompletion(ctx, attempt, request, options = {}) {
  const sides = requestFaces(request),
    known = request.knownValues,
    draftKey = ctx.role + ":" + request.id;
  const requestMode = request.mode || attempt.mode || diceMode;
  const previous = physicalDrafts.get(draftKey) || [];
  const die = (s, i) => `${ctx.t("Dado", "Die")} ${i + 1} · d${s}`;
  ctx.dialog(
    ctx.t("Completa il tiro", "Complete the roll"),
    `<p>${ctx.esc(displayName(ctx.state, request.actorId, ctx.role))} · ${sides.map((s) => "d" + s).join(" + ")} ${request.modifier < 0 ? "−" : "+"} ${Math.abs(request.modifier || 0)}</p>${recomputedNote(ctx, request)}<ul class="known-faces">${sides
      .map((s, i) =>
        known[i] !== null
          ? `<li>${die(s, i)}: <strong>${ctx.esc(known[i])}</strong> · ${ctx.t("già registrato", "already recorded")}</li>`
          : "",
      )
      .join(
        "",
      )}</ul><label class="field">${ctx.t("Dadi mancanti", "Missing dice")}<select name="diceMode"><option value="digital">${ctx.t("Digitali", "Digital")}</option><option value="physical" ${requestMode === "physical" ? "selected" : ""}>${ctx.t("Fisici", "Physical")}</option></select></label><div class="physical-roll-fields" ${requestMode === "physical" ? "" : "hidden"}>${sides
      .map((s, i) =>
        known[i] === null
          ? `<label class="field">${die(s, i)}<input type="number" name="face${i}" min="1" max="${s}" step="1" value="${ctx.esc(previous[i] ?? "")}" inputmode="numeric"></label>`
          : "",
      )
      .join(
        "",
      )}</div><details><summary>${ctx.t("Correggi una faccia registrata", "Correct a recorded face")}</summary><p>${ctx.t("Indica la faccia corretta e il motivo. Anche la registrazione precedente rimane nello storico.", "Enter the correct face and a reason. The previous record also remains in history.")}</p>${sides
      .map((s, i) =>
        known[i] !== null
          ? `<label class="field">${die(s, i)}<input type="number" name="knownFace${i}" min="1" max="${s}" step="1" value="${ctx.esc(known[i])}"></label>`
          : "",
      )
      .join(
        "",
      )}<label class="field">${ctx.t("Motivo della correzione", "Correction reason")}<input name="correctionReason" maxlength="300"></label></details>`,
    {
      submitLabel: ctx.t("Registra i dadi mancanti", "Record missing dice"),
      cancelLabel: ctx.t("Riduci richiesta", "Minimize request"),
      onSubmit: (data) => {
        const physical = data.get("diceMode") === "physical";
        const reason = String(data.get("correctionReason") ?? "").trim();
        const values = sides.map((s, i) => {
          if (known[i] !== null) return reason ? Number(data.get("knownFace" + i)) : known[i];
          if (!physical) return rollDie(s);
          const face = String(data.get("face" + i) ?? "").trim();
          return face === "" ? NaN : Number(face);
        });
        if (values.some((v, i) => !Number.isInteger(v) || v < 1 || v > sides[i]))
          throw Error(
            ctx.t(
              "Completa tutti i dadi con facce valide.",
              "Fill every die with a valid natural face.",
            ),
          );
        // Each face keeps its own origin: known faces their recorded mode, missing dice
        // the mode chosen now; a mixed roll is labeled per die in the history.
        const knownMode = request.recomputedFrom?.mode ?? request.mode ?? attempt.mode ?? null;
        const chosen = physical ? "physical" : "digital";
        const faceModes = sides.map((_, i) => (known[i] !== null ? knownMode : chosen));
        ctx.commit(
          ctx.t("Tiro completato", "Roll completed"),
          (s) => {
            resolveRoll(s, attempt.id, request.id, values, ctx.role, {
              correctionReason: reason,
            });
            const stored = s.combatAttempts
              .find((a) => a.id === attempt.id)
              .requests.find((r) => r.id === request.id);
            stored.faceModes = faceModes;
            stored.mode = faceModes.every((m) => m === chosen) ? chosen : "mixed";
            resolveAutomaticRolls(s, rollDie);
          },
          commitOptionsFor(ctx.state.combatAttempts?.find((entry) => entry.id === attempt.id)),
        );
        physicalDrafts.delete(draftKey);
        openCombatRequests(ctx, attempt.id, options);
      },
    },
  );
  const form = globalThis.document?.querySelector("#dialog form");
  if (!form) return;
  form.querySelector("[name=diceMode]").onchange = (e) =>
    (form.querySelector(".physical-roll-fields").hidden = e.target.value !== "physical");
  form.querySelectorAll("[name^=face]").forEach(
    (input) =>
      (input.oninput = () =>
        physicalDrafts.set(
          draftKey,
          sides.map((_, i) => form.querySelector("[name=face" + i + "]")?.value ?? ""),
        )),
  );
}
