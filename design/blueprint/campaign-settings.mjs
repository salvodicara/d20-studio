// Area B20 — Campaign settings, permissions, table rules and "view as". Entry module
// loaded by extensions.mjs through the B11 registry.
//
// - Campaign › Settings (DM, replaces the core placeholder): Rules (Standard 2024 preset,
//   BG3-style switches with locks, house rules), Permissions (D&D Beyond Game Settings:
//   the players' Table tools, which are B18's campaign settings; player sheets; Kanka
//   "view as"), Sections (Kanka modules), Sources (Roll20 Compendium Selection), Defaults
//   (Roll20 Apply Default Settings) and History (every change, with corrections that need
//   a reason; tool changes made from B18's panels are recorded too).
// - Campaign › Table rules (everyone): what the group agreed, read-only for players.
// - Campaign › View as (DM, only while active): the member's own pages (route-carried),
//   limited to what both can read.
// - Table: enemy health under the token and in the inspector, per the disclosure rule;
//   assisted damage waiting for the target's controller ("To apply" pill, panel, notice).
// - Sheet: the owner allows or withholds DM edits; the DM asks; every DM edit is traced on
//   the sheet it changed.
//
// Consumers outside this area read the policy at
// state.ext["campaign-settings"].campaigns[<campaign id>].policy (see the evidence file):
// app.mjs (hidden sections; DM sheet edits: canControl and the commit refusal),
// conditions-ui.mjs (read-only panel), campaign.mjs and command-palette.mjs (hidden
// sections), combat-ui.mjs and combat.mjs (assisted automation), character-builder.mjs
// (sources, multiclassing). table.mjs reads the players' tools from B18's settings.
// Domain rules and pattern IDs: campaign-settings-domain.mjs. Synthetic data only.

import * as D from "./campaign-settings-domain.mjs";
import {
  setNameHidden,
  observesToken,
  displaySize,
  sizeScale,
  seedSlice as tokenMenuSeed,
  hiddenName,
  aliasIn,
  aliasNumber,
  setLocked,
  isLocked,
} from "./token-menu.mjs";
import { getCampaignSection } from "./campaign.mjs";
import { applyReadyOutcome } from "./combat.mjs";
import { openCombatRequests } from "./combat-ui.mjs";
import { renderPublicSharing, bindPublicSharing } from "./community.mjs";

const L = (it, en) => ({ it, en });
// P10: one place per setting, in the order a DM looks for them (D&D Beyond Game Settings,
// BG3 Custom Mode): rules, what players see, permissions, defaults, sources, sections,
// sharing (the public page, Kanka public role / LegendKeeper public URL), history.
// R7 SV-38 (Foundry's «Configure Settings» lists each module, «Foundry to Discord» among
// them): «Integrazioni» holds the Discord row, which opens the integrations area's page.
const TABS = [
  "rules",
  "disclosure",
  "permissions",
  "defaults",
  "sources",
  "sections",
  "sharing",
  "integrations",
  "history",
];
const TAB_NAMES = {
  rules: L("Regole", "Rules"),
  disclosure: L("Cosa vedono i giocatori", "What players see"),
  permissions: L("Permessi", "Permissions"),
  sections: L("Sezioni", "Sections"),
  sources: L("Fonti", "Sources"),
  defaults: L("Predefiniti", "Defaults"),
  sharing: L("Condivisione", "Sharing"),
  integrations: L("Integrazioni", "Integrations"),
  history: L("Storico", "History"),
};
// Per-viewer UI state (never shared): the member being viewed as, focus to restore after
// a re-render, the last "apply defaults" commit (for Undo), the nested-commit guard and
// the fingerprints of player sheets and players' tools after the last seen commit (the
// follow-up compares against them to know what a commit actually changed).
const ui = {
  viewAs: null,
  focus: null,
  lastApply: null,
  tracing: false,
  self: false,
  seen: null,
};
export function resetCampaignSettingsView() {
  ui.viewAs = null;
  ui.focus = null;
  ui.lastApply = null;
  ui.tracing = false;
  ui.self = false;
  ui.seen = null;
}
export const viewAsMember = () => ui.viewAs;

let registryRef = null;
const slice = (state) => registryRef.slice(state, D.ID);
const safeSlice = (state) => {
  try {
    return slice(state);
  } catch {
    return null;
  }
};
const tokenSlice = (state) => state?.ext?.["token-menu"] ?? null;
const campaignOf = (ctx) => ctx.state.campaign?.id ?? null;
const policy = (ctx) => D.policyOf(safeSlice(ctx.state), campaignOf(ctx));
const record = (ctx) => D.recordOf(safeSlice(ctx.state), campaignOf(ctx));
const isDm = (ctx) => D.isCampaignDm(ctx.state, campaignOf(ctx), ctx.role);
const say = (ctx, value) =>
  value && typeof value === "object" ? ctx.label(value) : String(value ?? "");
const errorText = (ctx, error) =>
  error?.it ? ctx.label({ it: error.it, en: error.en }) : String(error?.message ?? error);

function date(ctx, iso, withTime = false) {
  if (!iso) return "";
  const value = new Date(iso);
  if (!Number.isFinite(value.getTime())) return "";
  return new Intl.DateTimeFormat(ctx.lang === "it" ? "it-IT" : "en-GB", {
    dateStyle: "long",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(value);
}
function who(ctx, id) {
  if (id === "dm") return "DM";
  const names = D.playerCharacters(ctx.state, campaignOf(ctx))
    .filter((actor) => actor.owner === id)
    .map((actor) => actor.name);
  return names.length
    ? `${ctx.t("Giocatore", "Player")} · ${names.join(ctx.t(" e ", " and "))}`
    : ctx.t("Giocatore", "Player");
}
const lockIcon = () =>
  `<svg class="cs-lock-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path d="M7 11V8a5 5 0 0 1 10 0v3" fill="none" stroke="currentColor" stroke-width="2"/><rect x="5" y="11" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;

// This area's own commits are settings, never sheet edits or new creatures: the
// follow-up handler skips them.
function own(ctx, label, mutator, options) {
  ui.self = true;
  try {
    return ctx.commit(label, mutator, options);
  } finally {
    ui.self = false;
  }
}
// One commit for one command; a refusal is shown as a message and changes nothing. After a
// refusal (offline, a stale value) the page is drawn again from the stored policy, so a
// switch or radio never keeps showing the value that was refused; focus stays on it.
function run(ctx, label, mutate, { undoable = false, focus = null } = {}) {
  let result;
  ui.focus = focus;
  try {
    own(
      ctx,
      label,
      (draft) => {
        result = mutate(draft, slice(draft));
      },
      { undoable },
    );
    return result ?? true;
  } catch (error) {
    ctx.render();
    ctx.toast(errorText(ctx, error), true);
    return false;
  }
}
function restoreFocus(root) {
  if (!ui.focus) return;
  const target = root.querySelector(ui.focus);
  ui.focus = null;
  target?.focus({ preventScroll: true });
}

// ---------------------------------------------------------------- shared bits

// The players' tool switches are the campaign settings the annotations area (B18)
// registers and enforces; without that area there is nothing to switch.
function toolsKnown(ctx) {
  try {
    for (const tool of D.PLAYER_TOOLS) registryRef.getSetting(ctx, tool.setting);
    return true;
  } catch {
    return false;
  }
}

function sourceText(ctx, source) {
  if (!source) return "";
  if (source.kind === "srd-rule")
    return `SRD 5.2.1 · «${ctx.esc(ctx.label(source.rule))}» · <a class="cs-link" href="${ctx.esc(D.SRD_EDITION.en)}" target="_blank" rel="noopener noreferrer">EN</a> · <a class="cs-link" href="${ctx.esc(D.SRD_EDITION.it)}" target="_blank" rel="noopener noreferrer">IT</a>`;
  if (source.kind === "core")
    return ctx.t("Regole 2024 di base, senza aggiunte", "2024 core rules, nothing added");
  if (source.kind === "srd")
    return `SRD 5.2.1 · <a class="cs-link" href="${ctx.esc(source.en.url)}" target="_blank" rel="noopener noreferrer">EN p. ${ctx.esc(source.en.pages.join("–").replace(/–.*–/, "–"))}</a> · <a class="cs-link" href="${ctx.esc(source.it.url)}" target="_blank" rel="noopener noreferrer">IT p. ${ctx.esc(source.it.pages.join("–").replace(/–.*–/, "–"))}</a>`;
  if (source.kind === "house-rule") return ctx.t("Regola della casa", "House rule");
  return ctx.t("Opzione dell’app, non una regola SRD", "App option, not an SRD rule");
}
function presetBadge(ctx) {
  const rec = record(ctx);
  const preset = D.presetById(D.presetOf(policy(ctx)));
  return preset
    ? `<span class="badge cs-badge is-standard">${ctx.esc(say(ctx, preset.label))}</span>${rec?.customizedAt ? ` <span class="badge cs-badge">${ctx.t("Personalizzata il", "Customized on")} ${ctx.esc(date(ctx, rec.customizedAt))}</span>` : ""}`
    : `<span class="badge cs-badge is-custom">${ctx.t("Regole personalizzate", "Custom rules")}${rec?.customizedAt ? ` · ${ctx.t("dal", "since")} ${ctx.esc(date(ctx, rec.customizedAt))}` : ""}</span>`;
}
function startedLine(ctx) {
  const rec = record(ctx);
  return rec?.startedAt
    ? `<span class="badge cs-badge">${ctx.t("Avviata il", "Started on")} ${ctx.esc(date(ctx, rec.startedAt))}</span>`
    : `<span class="badge cs-badge">${ctx.t("Non ancora avviata", "Not started yet")}</span>`;
}
function heading(ctx, title, subtitle, commands = "") {
  return `<header class="campaign-heading cs-heading"><div><h1 tabindex="-1" data-campaign-heading>${ctx.esc(title)}</h1><p class="muted">${ctx.esc(subtitle)}</p><div class="cs-badges">${presetBadge(ctx)} ${startedLine(ctx)}</div></div>${commands}</header>`;
}
function optionLabel(ctx, rule, value) {
  return say(ctx, rule.options.find((option) => option.value === value)?.label ?? value);
}
const onOff = (ctx, value) => (value ? ctx.t("attivo", "on") : ctx.t("spento", "off"));
function sceneValueText(ctx, key, value) {
  if (key === "creatureVision" || typeof value === "boolean") return onOff(ctx, value);
  if (key === "metersPerCell")
    return `${String(value).replace(".", ctx.lang === "it" ? "," : ".")} m`;
  if (key === "phase") return say(ctx, D.PHASE_NAMES[value] ?? value);
  return String(value);
}
function valueText(ctx, entry) {
  const format = (value) => {
    if (value === null || value === undefined) return "—";
    if (entry.kind === "rule") return optionLabel(ctx, D.ruleOf(entry.key), value);
    if (entry.kind === "permission" || entry.kind === "section" || entry.kind === "source")
      return onOff(ctx, value);
    if (entry.kind === "disclosure")
      return say(
        ctx,
        D.disclosureSetting(entry.key)?.options.find((o) => o.value === value)?.label ?? value,
      );
    if (entry.kind === "scene-default") return sceneValueText(ctx, entry.key, value);
    if (entry.kind === "sheet")
      return value ? ctx.t("consentite", "allowed") : ctx.t("riservate", "withheld");
    if (entry.kind === "default")
      return say(ctx, D.CREATURE_NAME.find((option) => option.value === value)?.label ?? value);
    if (entry.kind === "start") return date(ctx, value);
    if (D.presetById(value)) return say(ctx, D.presetById(value).label);
    if (value === "custom") return ctx.t("personalizzata", "custom");
    return String(value);
  };
  return `${ctx.esc(format(entry.from))} → ${ctx.esc(format(entry.to))}`;
}
function sectionLabel(ctx, id) {
  const core = D.CORE_SECTIONS.find((section) => section.id === id);
  if (core) return say(ctx, core.label);
  const area = ctx.registry?.get("campaign-section", id);
  return area ? ctx.registry.label(area, ctx.lang) : id;
}
function sceneFieldName(ctx, key) {
  if (key === "creatureVision")
    return ctx.t("Visione delle creature del DM", "Vision of the DM’s creatures");
  return say(ctx, D.SCENE_DEFAULTS.find((row) => row.key === key)?.label ?? key);
}
function entryTitle(ctx, entry) {
  const names = {
    rule: () => say(ctx, D.ruleOf(entry.key)?.label ?? entry.key),
    permission: () =>
      say(ctx, D.permissionOf(entry.key)?.short ?? D.toolOf(entry.key)?.short ?? entry.key),
    disclosure: () =>
      `${ctx.t("Cosa vedono i giocatori", "What players see")} · ${say(ctx, D.disclosureSetting(entry.key)?.label ?? entry.key)}`,
    "scene-default": () => `${ctx.t("Predefinito", "Default")} · ${sceneFieldName(ctx, entry.key)}`,
    section: () => `${ctx.t("Sezione", "Section")} «${sectionLabel(ctx, entry.key)}»`,
    source: () => `${ctx.t("Fonte", "Source")} · ${say(ctx, LEGACY_SWITCH)}`,
    preset: () => ctx.t("Preset delle regole", "Rules preset"),
    start: () => ctx.t("Avvio della campagna", "Campaign start"),
    "house-rule": () => `${ctx.t("Regola della casa aggiunta", "House rule added")}: ${entry.to}`,
    "house-rule-retired": () =>
      `${ctx.t("Regola della casa ritirata", "House rule retired")}: ${entry.from}`,
    default: () => ctx.t("Predefinito · nome delle creature", "Default · creature names"),
    "apply-defaults": () =>
      entry.key === "sceneDefaults"
        ? `${ctx.t("Predefiniti applicati alle esistenti", "Defaults applied to existing")}: ${entry.scenes} ${entry.scenes === 1 ? ctx.t("scena", "scene") : ctx.t("scene", "scenes")}, ${entry.creatures} ${entry.creatures === 1 ? ctx.t("creatura", "creature") : ctx.t("creature", "creatures")}`
        : `${ctx.t("Predefinito applicato alle esistenti", "Default applied to existing")}: ${entry.count} ${entry.count === 1 ? ctx.t("creatura", "creature") : ctx.t("creature", "creatures")}`,
    sheet: () =>
      `${ctx.t("Modifiche del DM alla scheda di", "DM edits to the sheet of")} ${entry.actorName ?? entry.key}`,
    "sheet-request": () =>
      `${ctx.t("Richiesta di modificare la scheda di", "Request to edit the sheet of")} ${entry.actorName ?? entry.key}`,
    "sheet-declined": () =>
      `${ctx.t("Richiesta rifiutata per", "Request declined for")} ${entry.actorName ?? entry.key}`,
  };
  return (names[entry.kind] ?? (() => entry.kind))();
}

// ---------------------------------------------------------------- settings page

export function renderSettings(ctx) {
  if (!isDm(ctx))
    return `<div class="empty-state"><h1>${ctx.t("Impostazioni riservate al DM", "Settings are for the DM")}</h1><p>${ctx.t("Le regole concordate sono in «Regole della tavola».", "The agreed rules are in “Table rules”.")}</p></div>`;
  const tab = TABS.includes(ctx.view.id) ? ctx.view.id : "rules";
  const nav = `<nav class="tabs cs-tabs" aria-label="${ctx.t("Parti delle impostazioni", "Settings parts")}">${TABS.map(
    (id) =>
      `<button type="button" class="${id === tab ? "active" : ""}" data-cs-tab="${id}" ${id === tab ? 'aria-current="page"' : ""}>${ctx.esc(say(ctx, TAB_NAMES[id]))}</button>`,
  ).join("")}</nav>`;
  const body = {
    rules: rulesTab,
    disclosure: disclosureTab,
    permissions: permissionsTab,
    sections: sectionsTab,
    sources: sourcesTab,
    defaults: defaultsTab,
    sharing: sharingTab,
    integrations: integrationsTab,
    history: historyTab,
  }[tab](ctx);
  // CA-60: this preview is the players' read-only rules page; "View as" a member lives on
  // the member's own row (Members) and in Permissions.
  return `<div class="cs-page" data-cs-page="settings">${heading(
    ctx,
    ctx.t("Impostazioni della campagna", "Campaign settings"),
    ctx.state.campaign?.name ?? "",
    `<button type="button" class="button quiet" data-cs-open-rules>${ctx.t("Anteprima della pagina giocatori", "Preview the players’ page")}</button>`,
  )}${nav}<p class="cs-applies muted">${ctx.t("Ogni modifica vale subito per tutto il gruppo e resta nello Storico, con chi l’ha fatta e quando.", "Every change applies to the whole group at once and stays in History, with who made it and when.")}</p>${body}</div>`;
}

function ruleFieldset(ctx, rule, editable = true) {
  const rec = record(ctx);
  const current = policy(ctx)[rule.key];
  const lock = D.ruleLock(rec, rule.key);
  const disabled = !editable || lock;
  const selected = rule.options.find((option) => option.value === current);
  return `<fieldset class="cs-rule ${lock ? "is-locked" : ""}" data-cs-rule="${rule.key}"><legend>${ctx.esc(say(ctx, rule.label))}${lock ? ` <span class="cs-lock">${lockIcon()} ${ctx.t("Bloccata", "Locked")}</span>` : ""}</legend><p class="cs-help">${ctx.esc(say(ctx, rule.help))}</p><div class="cs-options">${rule.options
    .map(
      (option) =>
        `<label class="cs-option"><input type="radio" name="cs-rule-${rule.key}" value="${ctx.esc(option.value)}" data-cs-rule-input="${rule.key}" ${option.value === current ? "checked" : ""} ${disabled ? `disabled aria-describedby="cs-lock-why-${rule.key}"` : ""}><span>${ctx.esc(say(ctx, option.label))}</span></label>`,
    )
    .join(
      "",
    )}</div>${lock ? `<p class="cs-lock-reason" data-cs-lock-reason="${rule.key}">${lockIcon()} <span id="cs-lock-why-${rule.key}">${ctx.esc(ctx.label(lock))} ${ctx.t("Avvio:", "Start:")} ${ctx.esc(date(ctx, lock.since))}. ${ctx.t("Per un accordo diverso aggiungi una regola della casa.", "For a different agreement add a house rule.")}</span></p>` : !editable ? `<p class="cs-lock-reason" id="cs-lock-why-${rule.key}">${ctx.t("Solo il DM cambia le regole. Chiediglielo o leggile in «Regole della tavola».", "Only the DM changes the rules. Ask them or read them in “Table rules”.")}</p>` : ""}<p class="cs-meta">${ctx.t("Dove si vede", "Where it shows")}: ${ctx.esc(say(ctx, rule.consumer))} · ${ctx.t("Fonte", "Source")}: ${sourceText(ctx, selected?.source)}</p></fieldset>`;
}
function editionRow(ctx) {
  return `<div class="cs-rule is-locked cs-edition"><p class="cs-rule-title"><strong>${ctx.t("Edizione delle regole", "Rules edition")}</strong> <span class="cs-lock">${lockIcon()} ${ctx.t("Bloccata", "Locked")}</span></p><p>D&amp;D 2024 · SRD 5.2.1 · <a class="cs-link" href="${ctx.esc(D.SRD_EDITION.it)}" target="_blank" rel="noopener noreferrer">IT</a> · <a class="cs-link" href="${ctx.esc(D.SRD_EDITION.en)}" target="_blank" rel="noopener noreferrer">EN</a></p><p class="cs-lock-reason">${lockIcon()} ${ctx.t("Fissata alla creazione della campagna: le regole 2014 non sostituiscono quelle 2024.", "Fixed when the campaign was created: 2014 rules never replace 2024 ones.")}</p></div>`;
}
function houseRuleItem(ctx, rule, editable) {
  return `<li class="cs-house" data-cs-house="${ctx.esc(rule.id)}"><div><h4>${ctx.esc(rule.title)}</h4><p class="cs-prose">${ctx.esc(rule.text)}</p><p class="cs-meta" data-cs-house-source>${ctx.t("Fonte", "Source")}: ${ctx.t("regola della casa", "house rule")} · ${ctx.t("decisa da", "decided by")} ${ctx.esc(who(ctx, rule.authorId))} · ${ctx.esc(date(ctx, rule.createdAt))}</p></div>${editable ? `<button type="button" class="button quiet" data-cs-retire="${ctx.esc(rule.id)}" aria-label="${ctx.esc(ctx.t(`Ritira la regola «${rule.title}»`, `Retire the rule “${rule.title}”`))}">${ctx.t("Ritira", "Retire")}</button>` : ""}</li>`;
}
// BG3 difficulty + Custom Mode, Solasta presets: a picker, then single rules (P10 CA-69).
function presetPicker(ctx) {
  const current = D.presetOf(policy(ctx));
  const card = (id, label, help) =>
    `<label class="cs-preset ${current === id ? "is-current" : ""}"><input type="radio" name="cs-preset" value="${id}" data-cs-preset-pick ${current === id ? "checked" : ""}><span><strong>${ctx.esc(label)}</strong><small>${ctx.esc(help)}</small></span></label>`;
  return `<div class="cs-presets" role="radiogroup" aria-labelledby="cs-preset-title">${D.PRESETS.map((preset) => card(preset.id, say(ctx, preset.label), say(ctx, preset.help))).join("")}${card("custom", ctx.t("Personalizzato", "Custom"), ctx.t("Scegli tu ogni regola qui sotto: basta cambiarne una.", "You choose each rule below: changing one is enough."))}</div>`;
}
function rulesTab(ctx) {
  const rec = record(ctx);
  const houseRules = (rec?.houseRules ?? []).filter((rule) => !rule.retiredAt);
  const retired = (rec?.houseRules ?? []).filter((rule) => rule.retiredAt);
  const groups = D.RULE_GROUPS.filter((group) => group.id !== "disclosure")
    .map((group) => {
      const rules = D.RULES.filter((rule) => rule.group === group.id);
      return rules.length
        ? `<h3 class="cs-group-title">${ctx.esc(say(ctx, group.label))}</h3>${rules.map((rule) => ruleFieldset(ctx, rule)).join("")}`
        : "";
    })
    .join("");
  return `<section class="cs-block" aria-labelledby="cs-preset-title"><div class="cs-block-heading"><h2 id="cs-preset-title">${ctx.t("Preset delle regole", "Rules preset")}</h2>${presetBadge(ctx)}</div><p class="cs-lead">${ctx.t("Parti da un preset, poi cambia le singole regole: la campagna diventa «Personalizzata» e il segno resta nello Storico. Le regole con il lucchetto non cambiano più dopo l’avvio.", "Start from a preset, then change single rules: the campaign becomes “Custom” and the mark stays in History. Rules with a lock no longer change after the start.")}</p>${presetPicker(ctx)}</section>
  <section class="cs-block" aria-labelledby="cs-start-title"><h2 id="cs-start-title">${ctx.t("Avvio della campagna", "Campaign start")}</h2>${rec?.startedAt ? `<p>${ctx.t("Avviata il", "Started on")} <strong>${ctx.esc(date(ctx, rec.startedAt))}</strong>. ${ctx.t("Da allora le regole con il lucchetto non si cambiano più, come le opzioni bloccate di una partita già iniziata.", "Since then the rules with a lock no longer change, like the locked options of a game already under way.")}</p>` : `<p>${ctx.t("Prima dell’avvio ogni regola si può cambiare. All’avvio quelle con il lucchetto si bloccano.", "Before the start every rule can change. At the start the ones with a lock freeze.")}</p><button type="button" class="button" data-cs-start>${ctx.t("Avvia la campagna", "Start the campaign")}</button>`}</section>
  <section class="cs-block" aria-labelledby="cs-rules-title"><h2 id="cs-rules-title">${ctx.t("Regole della tavola", "Table rules")}</h2>${editionRow(ctx)}${groups}<p class="cs-meta">${ctx.t("Salute dei nemici, nomi delle creature e probabilità di colpire sono in «Cosa vedono i giocatori».", "Enemy health, creature names and chance to hit are in “What players see”.")} <button type="button" class="text-button cs-inline-button" data-cs-goto-tab="disclosure">${ctx.t("Apri", "Open")}</button></p></section>
  <section class="cs-block" aria-labelledby="cs-house-title"><h2 id="cs-house-title">${ctx.t("Regole della casa", "House rules")}</h2><p class="cs-lead">${ctx.t("Accordi del gruppo che il SRD non prevede. Ognuno cita la propria decisione: chi l’ha presa e quando. Nessuna citazione SRD inventata.", "Group agreements the SRD does not cover. Each cites its own decision: who took it and when. No invented SRD citation.")}</p>${houseRules.length ? `<ul class="cs-house-list">${houseRules.map((rule) => houseRuleItem(ctx, rule, true)).join("")}</ul>` : `<p class="muted">${ctx.t("Nessuna regola della casa.", "No house rules.")}</p>`}<form class="cs-house-form" data-cs-house-form><div class="field"><label for="cs-house-title-input">${ctx.t("Titolo", "Title")}</label><input id="cs-house-title-input" name="title" maxlength="${D.HOUSE_TITLE_MAX}" required autocomplete="off"></div><div class="field"><label for="cs-house-text-input">${ctx.t("Regola", "Rule")}</label><textarea id="cs-house-text-input" name="text" maxlength="${D.HOUSE_TEXT_MAX}" required rows="3"></textarea></div><button class="button primary">${ctx.t("Aggiungi regola della casa", "Add house rule")}</button></form>${retired.length ? `<details class="cs-retired"><summary>${ctx.t("Regole ritirate", "Retired rules")} (${retired.length})</summary><ul>${retired.map((rule) => `<li><strong>${ctx.esc(rule.title)}</strong> · ${ctx.esc(date(ctx, rule.retiredAt))} · ${ctx.t("motivo", "reason")}: ${ctx.esc(rule.retiredReason)}</li>`).join("")}</ul></details>` : ""}</section>`;
}

// ---------------------------------------------------------------- what players see (CA-71)

function disclosureSettingsKnown(ctx) {
  try {
    for (const row of D.DISCLOSURE_SETTINGS) registryRef.getSetting(ctx, row.setting);
    return true;
  } catch {
    return false;
  }
}
function disclosureFieldset(ctx, row) {
  const current = D.disclosureOf(ctx.state, campaignOf(ctx))[row.key];
  return `<fieldset class="cs-rule" data-cs-disclosure="${row.key}"><legend>${ctx.esc(say(ctx, row.label))}</legend><p class="cs-help">${ctx.esc(say(ctx, row.help))}</p><div class="cs-options">${row.options
    .map(
      (option) =>
        `<label class="cs-option"><input type="radio" name="cs-disclosure-${row.key}" value="${ctx.esc(option.value)}" data-cs-disclosure-input="${row.key}" ${option.value === current ? "checked" : ""}><span>${ctx.esc(say(ctx, option.label))}</span></label>`,
    )
    .join("")}</div></fieldset>`;
}
function creatureNamesBlock(ctx) {
  const pol = policy(ctx);
  const slices = tokenSlice(ctx.state);
  let preview = null;
  try {
    preview = D.previewCreatureDefaults(ctx.state, slices ?? tokenMenuSeed(), pol.creatureName);
  } catch {
    preview = { changes: [], scenes: 0 };
  }
  const last = [...(record(ctx)?.history ?? [])]
    .reverse()
    .find((entry) => entry.kind === "apply-defaults" && entry.key !== "sceneDefaults");
  const canUndo = ui.lastApply && ctx.canUndo?.() && ctx.undoLabel?.() === ui.lastApply.label;
  return `<fieldset class="cs-rule" data-cs-default="creatureName"><legend>${ctx.t("Nomi delle creature del DM", "Names of the DM’s creatures")}</legend><p class="cs-help">${ctx.t("«Solo il DM»: i giocatori leggono «Creatura sconosciuta» su pedina, turni e registro, come con «Nascondi nome» del menu della pedina. Vale per le creature aggiunte da ora; per quelle già sulle scene usa «Applica alle esistenti».", "“The DM only”: players read “Unknown creature” on token, turns and log, like the token menu’s “Hide name”. It applies to creatures added from now on; for those already on the scenes use “Apply to existing”.")}</p><div class="cs-options">${D.CREATURE_NAME.map(
    (option) =>
      `<label class="cs-option"><input type="radio" name="cs-creature-name" value="${option.value}" data-cs-default-input ${pol.creatureName === option.value ? "checked" : ""}><span>${ctx.esc(say(ctx, option.label))}</span></label>`,
  ).join(
    "",
  )}</div><div class="toolbar"><button type="button" class="button" data-cs-apply-defaults ${preview.changes.length ? "" : 'disabled aria-describedby="cs-impact-why"'}>${ctx.t("Applica alle esistenti…", "Apply to existing…")}</button><span class="muted" data-cs-impact id="cs-impact-why">${preview.changes.length ? ctx.t(`${preview.changes.length} ${preview.changes.length === 1 ? "creatura cambierebbe" : "creature cambierebbero"}`, `${preview.changes.length} ${preview.changes.length === 1 ? "creature would change" : "creatures would change"}`) : ctx.t("Tutte le creature seguono già il predefinito. Cambia il predefinito qui sopra per applicarlo alle esistenti.", "All creatures already follow the default. Change the default above to apply it to existing ones.")}</span></div>${last ? `<p class="cs-result" role="status" data-cs-apply-result>${ctx.esc(date(ctx, last.at, true))} · ${ctx.esc(entryTitle(ctx, last))}${last.undoneAt ? ` · ${ctx.t("annullato", "undone")}` : ""}${canUndo && !last.undoneAt ? ` <button type="button" class="button quiet" data-cs-undo-apply>${ctx.t("Annulla", "Undo")}</button>` : ""}</p>` : ""}</fieldset>`;
}
function disclosureTab(ctx) {
  const members = D.viewableMembers(ctx.state, campaignOf(ctx), ctx.role);
  const check = members[0]
    ? `<button type="button" class="button" data-cs-view-as="${ctx.esc(members[0].id)}">${ctx.icon("eye")} ${ctx.esc(ctx.t(`Controlla: vedi come ${members[0].characters[0]?.name ?? members[0].name}`, `Check: view as ${members[0].characters[0]?.name ?? members[0].name}`))}</button>`
    : "";
  return `<section class="cs-block" aria-labelledby="cs-disclosure-title"><div class="cs-block-heading"><h2 id="cs-disclosure-title">${ctx.t("Cosa vedono i giocatori", "What players see")}</h2>${check}</div><p class="cs-lead">${ctx.t("Tutto ciò che i giocatori sanno dei nemici e dei tiri, in un solo posto. Tu vedi sempre tutto.", "Everything players learn about enemies and rolls, in one place. You always see everything.")}</p>${ruleFieldset(ctx, D.ruleOf("enemyHp"))}${creatureNamesBlock(ctx)}${disclosureSettingsKnown(ctx) ? D.DISCLOSURE_SETTINGS.map((row) => disclosureFieldset(ctx, row)).join("") : ""}${D.DISCLOSURE_POLICY.map((row) => disclosureFieldset(ctx, row)).join("")}</section>`;
}

function sheetRow(ctx, actor) {
  const pol = policy(ctx);
  const allowed = D.dmMayEdit(pol, actor);
  const pending = (record(ctx)?.sheetRequests ?? []).find(
    (request) => request.actorId === actor.id && request.status === "pending",
  );
  const status = allowed
    ? ctx.t(
        `${actor.name} ti consente di modificare la scheda`,
        `${actor.name} lets you edit the sheet`,
      )
    : pending
      ? ctx.t(
          `Richiesta inviata il ${date(ctx, pending.at, true)}: in attesa`,
          `Request sent on ${date(ctx, pending.at, true)}: pending`,
        )
      : ctx.t(
          `Modifica riservata a chi gioca ${actor.name}: puoi consultarla`,
          `Editing reserved to ${actor.name}’s player: you can read it`,
        );
  return `<div class="cs-row" data-cs-sheet-row="${ctx.esc(actor.id)}"><div><strong>${ctx.esc(actor.name)}</strong><small>${ctx.esc(status)}</small></div><div class="toolbar">${!allowed && !pending ? `<button type="button" class="button" data-cs-ask="${ctx.esc(actor.id)}">${ctx.t("Chiedi autorizzazione", "Ask for authorization")}</button>` : ""}<button type="button" class="button quiet" data-cs-open-sheet="${ctx.esc(actor.id)}">${ctx.t("Apri scheda", "Open sheet")}</button></div></div>`;
}
function permissionSwitch(ctx, row, on, attr) {
  return `<label class="cs-switch"><input type="checkbox" role="switch" ${attr} ${on ? "checked" : ""}><span><strong>${ctx.esc(say(ctx, row.label))}</strong><small>${ctx.esc(say(ctx, row.help ?? ""))}${row.help ? " " : ""}${on ? ctx.t("Consentito.", "Allowed.") : ctx.t("Spento.", "Off.")}</small></span></label>`;
}
function permissionsTab(ctx) {
  const pol = policy(ctx);
  const members = D.viewableMembers(ctx.state, campaignOf(ctx), ctx.role);
  const characters = D.playerCharacters(ctx.state, campaignOf(ctx));
  const tools = D.playerTools(ctx.state);
  const switches = toolsKnown(ctx)
    ? D.PLAYER_TOOLS.map(
        (tool) =>
          `<label class="cs-switch"><input type="checkbox" role="switch" data-cs-tool="${tool.key}" ${tools[tool.key] ? "checked" : ""}><span><strong>${ctx.esc(say(ctx, tool.label))}</strong><small>${tools[tool.key] ? ctx.t("Consentito.", "Allowed.") : ctx.t("Spento: sul Tavolo lo strumento resta visibile ai giocatori ma disattivato, con il motivo. Tu continui a usarlo.", "Off: on the Table the tool stays visible to players but disabled, with the reason. You keep using it.")}</small></span></label>`,
      ).join("")
    : `<p class="muted" data-cs-tools-missing>${ctx.t("Gli strumenti dei giocatori (puntatore, disegni, sagome) arrivano con l’area Annotazioni del Tavolo, che ora non è caricata.", "The players’ tools (pointer, drawings, templates) come with the Table annotations area, which is not loaded now.")}</p>`;
  const extra = D.PERMISSIONS.map((row) =>
    permissionSwitch(
      ctx,
      row,
      D.permissionAllowed(pol, row.key),
      `data-cs-permission="${row.key}"`,
    ),
  ).join("");
  return `<section class="cs-block" aria-labelledby="cs-tools-title"><h2 id="cs-tools-title">${ctx.t("Cosa possono fare i giocatori al Tavolo", "What players can do on the Table")}</h2><p class="cs-lead">${ctx.t("Valgono subito per tutti i giocatori. I co-DM hanno sempre i tuoi poteri sulle creature; gli osservatori guardano soltanto.", "They apply to every player at once. Co-DMs always have your powers over creatures; observers only watch.")}</p><div class="cs-role-head"><span class="badge">${ctx.t("Ruolo: Giocatore", "Role: Player")}</span></div>${switches}${extra}</section>
  <section class="cs-block" aria-labelledby="cs-sheets-title"><h2 id="cs-sheets-title">${ctx.t("Schede dei giocatori", "Player sheets")}</h2><p class="cs-lead">${ctx.t("Modifichi la scheda di un giocatore solo finché lui lo consente; ogni tua modifica resta tracciata sulla sua scheda. Lo decide il giocatore, non il DM.", "You edit a player’s sheet only while they allow it; each of your edits is traced on their sheet. The player decides, not the DM.")}</p>${characters.map((actor) => sheetRow(ctx, actor)).join("") || `<p class="muted">${ctx.t("Nessuna scheda di giocatore nella campagna.", "No player sheet in the campaign.")}</p>`}</section>
  <section class="cs-block" aria-labelledby="cs-viewas-title"><h2 id="cs-viewas-title">${ctx.t("Vedi come un membro", "View as a member")}</h2><p class="cs-lead">${ctx.t("Controlla i permessi vedendo la campagna come la vede un membro. I suoi appunti «Solo io» restano privati anche per te.", "Check permissions by seeing the campaign as a member does. Their “Only me” notes stay private, also for you.")}</p>${members
    .map((member) => {
      const name = member.characters.map((c) => c.name).join(ctx.t(" e ", " and ")) || member.name;
      return `<div class="cs-row"><div><strong>${ctx.esc(name)}</strong><small>${ctx.esc(who(ctx, member.id))}</small></div><button type="button" class="button" data-cs-view-as="${ctx.esc(member.id)}">${ctx.esc(ctx.t(`Vedi come ${member.characters[0]?.name ?? name}`, `View as ${member.characters[0]?.name ?? name}`))}</button></div>`;
    })
    .join("")}</section>`;
}

function allSections(ctx) {
  const areas = (ctx.registry?.list("campaign-section", ctx) ?? [])
    .filter((c) => !c.replaces && !D.PROTECTED_SECTIONS.includes(c.id))
    .map((c) => ({ id: c.id, label: ctx.registry.label(c, ctx.lang), area: true }));
  const hidden = policy(ctx).hiddenSections;
  // A hidden area section is not listed by the registry filter below: keep it switchable.
  const known = new Set([...D.CORE_SECTIONS.map((s) => s.id), ...areas.map((s) => s.id)]);
  const orphans = hidden
    .filter((id) => !known.has(id))
    .map((id) => ({ id, label: sectionLabel(ctx, id), area: true }));
  return [
    ...D.CORE_SECTIONS.map((s) => ({ id: s.id, label: say(ctx, s.label), area: false })),
    ...areas,
    ...orphans,
  ];
}
function sectionsTab(ctx) {
  const pol = policy(ctx);
  return `<section class="cs-block" aria-labelledby="cs-sections-title"><h2 id="cs-sections-title">${ctx.t("Sezioni della campagna", "Campaign sections")}</h2><p class="cs-lead">${ctx.t("Spegni le sezioni che il gruppo non usa: spariscono dalla navigazione di tutti, anche dalla tua. I contenuti restano salvati e tornano quando riaccendi la sezione.", "Turn off the sections the group does not use: they leave everyone’s navigation, yours too. Their content stays saved and returns when you turn the section back on.")}</p><ul class="cs-section-list">${allSections(
    ctx,
  )
    .map(
      (section) =>
        `<li><label class="cs-switch"><input type="checkbox" role="switch" data-cs-section="${ctx.esc(section.id)}" ${D.sectionHidden(pol, section.id) ? "" : "checked"}><span><strong>${ctx.esc(section.label)}</strong><small>${D.sectionHidden(pol, section.id) ? ctx.t("Spenta: non compare a nessuno", "Off: shown to nobody") : ctx.t("Attiva", "On")}</small></span></label></li>`,
    )
    .join(
      "",
    )}</ul><p class="muted">${ctx.t("Panoramica, Preparazione, Impostazioni, Regole della tavola e Sicurezza restano sempre attive: gli strumenti di sicurezza dei giocatori non si spengono da qui.", "Overview, Preparation, Settings, Table rules and Safety always stay on: the players’ safety tools are not switched off from here.")}</p></section>`;
}

const STATUS = {
  available: L("Disponibile a tutti", "Available to everyone"),
  shared: L("Condivisa", "Shared"),
  none: L("Nessun contenuto attivato", "No content enabled"),
  blocked: L("Bloccata in questa campagna", "Blocked in this campaign"),
  missing: L("Mancante", "Missing"),
};
function sourceRows(ctx) {
  const missing = D.homebrewSources(ctx.state, ctx.role).filter((row) => row.status === "missing");
  return D.sourceStates(ctx.state, policy(ctx))
    .map(
      (source) =>
        `<li class="cs-source is-${source.status}" data-cs-source="${source.id}"><div><strong>${ctx.esc(say(ctx, source.name))}</strong><small><span class="cs-status">${source.status === "blocked" ? lockIcon() + " " : ""}${ctx.esc(say(ctx, STATUS[source.status]))}${source.count ? ` · ${source.count} ${source.count === 1 ? ctx.t("revisione", "revision") : ctx.t("revisioni", "revisions")}` : ""}${source.id === "campaign-homebrew" && missing.length ? ` · <strong class="cs-missing">${missing.length} ${ctx.t(missing.length === 1 ? "mancante" : "mancanti", "missing")}</strong>` : ""}</span>${source.locked ? ` · ${ctx.esc(say(ctx, source.locked))}` : ""}</small></div></li>`,
    )
    .join("");
}
// R7 PG-53 (C4; D&D Beyond's «Legacy content» source toggle): the legacy 2014 versions beside
// the 2024 ones, off by default. The rules edition row stays locked on 2024.
const LEGACY_SWITCH = L(
  "Versioni legacy 2014 (SRD 5.1) accanto alle 2024",
  "Legacy 2014 versions (SRD 5.1) beside the 2024 ones",
);
function legacySwitch(ctx) {
  const on = policy(ctx).legacySources === "available";
  return `<label class="cs-switch" data-cs-legacy-row><input type="checkbox" role="switch" data-cs-legacy ${on ? "checked" : ""}><span><strong>${ctx.esc(say(ctx, LEGACY_SWITCH))}</strong><small>${on ? ctx.t("Attive: nella creazione del personaggio e negli incantesimi le versioni 2014 compaiono accanto alle 2024, che restano quelle predefinite.", "On: in the character builder and in spells the 2014 versions appear beside the 2024 ones, which stay the default.") : ctx.t("Spente: si sceglie solo tra le versioni 2024.", "Off: only the 2024 versions can be chosen.")} ${ctx.t("L’edizione delle regole resta 2024: una versione 2014 non sostituisce mai quella 2024.", "The rules edition stays 2024: a 2014 version never replaces the 2024 one.")}</small></span></label>`;
}
const homebrewName = (ctx, row) =>
  row.name ? say(ctx, row.name) : ctx.t(`Contenuto ${row.contentId}`, `Content ${row.contentId}`);
function homebrewRow(ctx, row) {
  const status =
    row.status === "on"
      ? ctx.t(
          `Attivo · revisione ${row.enabledNumber} di ${row.latestNumber}`,
          `On · revision ${row.enabledNumber} of ${row.latestNumber}`,
        )
      : row.status === "missing"
        ? ctx.t(
            "Mancante: la campagna usa una revisione che la tua Biblioteca non ha",
            "Missing: the campaign uses a revision your Library does not hold",
          )
        : row.needed
          ? ctx.t(
              "Richiesto dalla campagna importata: ora è in Biblioteca, accendilo",
              "Needed by the imported campaign: it is in the Library now, turn it on",
            )
          : ctx.t("Spento in questa campagna", "Off in this campaign");
  const control =
    row.status === "missing"
      ? `<button type="button" class="button" data-cs-library>${ctx.t("Aggiungilo dalla Biblioteca", "Add it from the Library")}</button>`
      : `<label class="cs-switch cs-switch-inline"><input type="checkbox" role="switch" data-cs-homebrew="${ctx.esc(row.contentId)}" aria-label="${ctx.esc(ctx.t(`Usa «${homebrewName(ctx, row)}» nella campagna`, `Use “${homebrewName(ctx, row)}” in the campaign`))}" ${row.status === "on" ? "checked" : ""} ${row.canEnable ? "" : `disabled aria-describedby="cs-hb-why-${ctx.esc(row.contentId)}"`}><span><strong>${row.status === "on" ? ctx.t("Attivo", "On") : ctx.t("Spento", "Off")}</strong>${row.canEnable ? "" : `<small id="cs-hb-why-${ctx.esc(row.contentId)}">${ctx.t("Non puoi abilitare questa voce. Chiedi a chi l’ha creata di condividerla con te dalla Biblioteca.", "You cannot enable this entry. Ask its author to share it with you from the Library.")}</small>`}</span></label>`;
  return `<li class="cs-source is-${row.status === "missing" ? "missing" : row.status === "on" ? "shared" : "none"}" data-cs-homebrew-row="${ctx.esc(row.contentId)}"><div><strong>${ctx.esc(homebrewName(ctx, row))}</strong><small>${ctx.esc(status)}</small></div>${control}</li>`;
}
function sourcesTab(ctx) {
  const rows = D.homebrewSources(ctx.state, ctx.role);
  const groups = new Map();
  for (const row of rows) {
    const key = row.status === "missing" && !row.type ? "missing" : row.type;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const list = rows.length
    ? [...groups.entries()]
        .map(
          ([type, items]) =>
            `<h3 class="cs-group-title">${ctx.esc(type === "missing" ? ctx.t("Mancanti", "Missing") : say(ctx, D.HOMEBREW_TYPES[type] ?? type))}</h3><ul class="cs-source-list">${items.map((row) => homebrewRow(ctx, row)).join("")}</ul>`,
        )
        .join("")
    : `<p class="muted">${ctx.t("Nessun contenuto homebrew nella tua Biblioteca.", "No homebrew content in your Library.")}</p>`;
  return `<section class="cs-block" aria-labelledby="cs-sources-title"><h2 id="cs-sources-title">${ctx.t("Fonti della campagna", "Campaign sources")}</h2><p class="cs-lead">${ctx.t("Da quali fonti si scelgono specie, classi, incantesimi e oggetti. La creazione del personaggio mostra lo stesso stato.", "Which sources species, classes, spells and items come from. The character builder shows the same state.")}</p><ul class="cs-source-list">${sourceRows(ctx)}</ul>${legacySwitch(ctx)}</section><section class="cs-block" aria-labelledby="cs-homebrew-title"><div class="cs-block-heading"><h2 id="cs-homebrew-title">${ctx.t("Homebrew, voce per voce", "Homebrew, entry by entry")}</h2><button type="button" class="button quiet" data-cs-library>${ctx.t("Apri la Biblioteca", "Open the Library")}</button></div><p class="cs-lead">${ctx.t("Accendi solo ciò che la campagna usa: ogni voce mostra la revisione in uso. Le voci mancanti vanno aggiunte alla Biblioteca.", "Turn on only what the campaign uses: each entry shows the revision in use. Missing entries must be added to the Library.")}</p>${list}</section>`;
}

function sceneDefaultField(ctx, row, value) {
  if (row.type === "boolean")
    return `<label class="cs-switch"><input type="checkbox" role="switch" data-cs-scene-default="${row.key}" ${value ? "checked" : ""}><span><strong>${ctx.esc(say(ctx, row.label))}</strong></span></label>`;
  return `<fieldset class="cs-rule" data-cs-scene-choice="${row.key}"><legend>${ctx.esc(say(ctx, row.label))}</legend><div class="cs-options">${row.options
    .map(
      (option) =>
        `<label class="cs-option"><input type="radio" name="cs-scene-${row.key}" value="${option}" data-cs-scene-default="${row.key}" ${option === value ? "checked" : ""}><span>${ctx.esc(sceneValueText(ctx, row.key, option))}</span></label>`,
    )
    .join("")}</div></fieldset>`;
}
function defaultsTab(ctx) {
  const pol = policy(ctx);
  const fog = Boolean(ctx.state.ext?.["fog-vision"]);
  const preview = D.previewSceneDefaults(ctx.state, safeSlice(ctx.state), campaignOf(ctx));
  const last = [...(record(ctx)?.history ?? [])]
    .reverse()
    .find((entry) => entry.kind === "apply-defaults" && entry.key === "sceneDefaults");
  const impact = preview.count
    ? ctx.t(
        `${preview.scenes.length} ${preview.scenes.length === 1 ? "scena" : "scene"} e ${preview.creatures.length} ${preview.creatures.length === 1 ? "creatura cambierebbero" : "creature cambierebbero"}`,
        `${preview.scenes.length} ${preview.scenes.length === 1 ? "scene" : "scenes"} and ${preview.creatures.length} ${preview.creatures.length === 1 ? "creature would change" : "creatures would change"}`,
      )
    : ctx.t(
        "Scene e creature seguono già i predefiniti.",
        "Scenes and creatures already follow the defaults.",
      );
  const rows = D.SCENE_DEFAULTS.filter(
    (row) => fog || (row.key !== "vision" && row.key !== "phase"),
  );
  return `<section class="cs-block" aria-labelledby="cs-scene-defaults-title"><h2 id="cs-scene-defaults-title">${ctx.t("Predefiniti delle scene", "Scene defaults")}</h2><p class="cs-lead">${ctx.t("Ogni nuova scena parte così. Per le scene già fatte usa «Applica alle esistenti»: vedi prima quante ne cambiano.", "Every new scene starts like this. For the scenes already made use “Apply to existing”: you first see how many change.")}</p><div class="cs-default-grid">${rows.map((row) => sceneDefaultField(ctx, row, pol.sceneDefaults[row.key])).join("")}</div></section>
  <section class="cs-block" aria-labelledby="cs-token-defaults-title"><h2 id="cs-token-defaults-title">${ctx.t("Predefiniti delle pedine del DM", "Defaults of the DM’s tokens")}</h2>${fog ? `<label class="cs-switch"><input type="checkbox" role="switch" data-cs-creature-vision ${pol.creatureVision ? "checked" : ""}><span><strong>${ctx.t("Le creature del DM hanno la visione (vedono solo ciò che la luce e i muri permettono)", "The DM’s creatures have vision (they see only what light and walls allow)")}</strong></span></label>` : ""}<p class="cs-meta">${ctx.t("Nomi e salute delle creature per i giocatori sono in «Cosa vedono i giocatori».", "Creature names and health for players are in “What players see”.")} <button type="button" class="text-button cs-inline-button" data-cs-goto-tab="disclosure">${ctx.t("Apri", "Open")}</button></p></section>
  <section class="cs-block" aria-labelledby="cs-apply-title"><h2 id="cs-apply-title">${ctx.t("Scene e pedine già fatte", "Scenes and tokens already made")}</h2><div class="toolbar"><button type="button" class="button" data-cs-apply-scene-defaults ${preview.count ? "" : 'disabled aria-describedby="cs-scene-impact-why"'}>${ctx.t("Applica alle esistenti…", "Apply to existing…")}</button><span class="muted" data-cs-scene-impact id="cs-scene-impact-why">${ctx.esc(impact)}${preview.count ? "" : ` ${ctx.t("Cambia un predefinito qui sopra per applicarlo.", "Change a default above to apply it.")}`}</span></div>${last ? `<p class="cs-result" role="status" data-cs-scene-apply-result>${ctx.esc(date(ctx, last.at, true))} · ${ctx.esc(entryTitle(ctx, last))}</p>` : ""}</section>`;
}

// CA-07 (Kanka public role, LegendKeeper public URL): the campaign's public page lives in
// Settings › Sharing too; the form is the community area's own (one source of truth).
function sharingTab(ctx) {
  const html = renderPublicSharing(ctx);
  return html
    ? `<section class="cs-block cs-sharing" aria-labelledby="cs-sharing-title" data-cs-sharing><h2 id="cs-sharing-title">${ctx.t("Condivisione", "Sharing")}</h2><p class="cs-lead">${ctx.t("Una pagina pubblica in sola lettura da mandare agli amici: scegli tu quali voci del Diario, del Mondo e dell’Archivio si leggono.", "A read-only public page to send to friends: you choose which Journal, World and Archive entries can be read.")}</p>${html}</section>`
    : `<section class="cs-block"><h2>${ctx.t("Condivisione", "Sharing")}</h2><p class="muted">${ctx.t("La pagina pubblica arriva con l’area Tavoli pubblici, che ora non è caricata.", "The public page comes with the Public tables area, which is not loaded now.")}</p></section>`;
}

// R7 SV-38 (Foundry to Discord in the world settings): one row per integration that has its
// own page, opening it in one click. The integrations area owns the settings themselves.
export function openDiscord(ctx) {
  ctx.navigate("campaign", { tab: "integrations", id: "discord" });
}
function integrationsTab(ctx) {
  const area = ctx.registry?.get?.("campaign-section", "integrations", ctx);
  const body = area
    ? `<ul class="cs-source-list"><li class="cs-source cs-integration" data-cs-integration="discord"><div><strong>${ctx.t("Discord: inoltra tiri e avvisi a un canale", "Discord: relay rolls and notices to a channel")}</strong><small>${ctx.t("Webhook del canale, cosa inoltrare (tiri pubblici, avvisi di sessione) e l’anteprima di come appare nel canale.", "The channel’s webhook, what to relay (public rolls, session notices) and a preview of how it looks in the channel.")}</small></div><button type="button" class="button" data-cs-discord>${ctx.t("Apri Integrazioni › Discord", "Open Integrations › Discord")}</button></li></ul><button type="button" class="button quiet" data-cs-integrations>${ctx.t("Tutte le integrazioni della campagna", "All the campaign’s integrations")}</button>`
    : `<p class="muted" data-cs-integrations-missing>${ctx.t("Le integrazioni (Discord, calendario, token API) arrivano con l’area Integrazioni, che ora non è caricata.", "Integrations (Discord, calendar, API tokens) come with the Integrations area, which is not loaded now.")}</p>`;
  return `<section class="cs-block" aria-labelledby="cs-integrations-title"><h2 id="cs-integrations-title">${ctx.t("Integrazioni", "Integrations")}</h2><p class="cs-lead">${ctx.t("Servizi esterni collegati alla campagna. Ognuno ha la sua pagina, a un clic da qui.", "External services linked to the campaign. Each has its own page, one click from here.")}</p>${body}</section>`;
}

function historyTab(ctx) {
  const rows = [...(record(ctx)?.history ?? [])].reverse();
  const sl = safeSlice(ctx.state);
  const shown = [
    "rule",
    "permission",
    "section",
    "default",
    "sheet",
    "preset",
    "disclosure",
    "scene-default",
    "source",
  ];
  return `<section class="cs-block" aria-labelledby="cs-history-title"><h2 id="cs-history-title">${ctx.t("Storico dei cambi", "Change history")}</h2><p class="cs-lead">${ctx.t("Ogni cambio resta qui. Una correzione rimette il valore precedente con un motivo e diventa a sua volta una voce.", "Every change stays here. A correction puts the previous value back with a reason and becomes an entry itself.")}</p><ol class="cs-history">${rows
    .map(
      (entry) =>
        `<li data-cs-history="${ctx.esc(entry.id)}"><div><strong>${ctx.esc(entryTitle(ctx, entry))}</strong>${shown.includes(entry.kind) && entry.from !== undefined ? ` <span class="cs-change">${valueText(ctx, entry)}</span>` : ""}<small>${ctx.esc(date(ctx, entry.at, true))} · ${ctx.esc(who(ctx, entry.by))}${entry.correction ? ` · ${ctx.t("correzione", "correction")}` : ""}${entry.reason ? ` · ${ctx.t("motivo", "reason")}: ${ctx.esc(entry.reason)}` : ""}${entry.restoredBy ? ` · ${ctx.t("corretta dopo", "corrected later")}` : ""}${entry.undoneAt ? ` · ${ctx.t("annullata", "undone")}` : ""}</small></div>${D.canRestore(sl, campaignOf(ctx), entry, ctx.state) && !(entry.kind === "rule" && D.ruleLock(record(ctx), entry.key)) ? `<button type="button" class="button quiet" data-cs-restore="${ctx.esc(entry.id)}">${ctx.t("Ripristina…", "Restore…")}</button>` : ""}</li>`,
    )
    .join("")}</ol></section>`;
}

// ---------------------------------------------------------------- table rules page

export function renderRulesPage(ctx) {
  const pol = policy(ctx);
  const rec = record(ctx);
  const houseRules = (rec?.houseRules ?? []).filter((rule) => !rule.retiredAt);
  const rows = D.RULES.map((rule) => {
    const lock = D.ruleLock(rec, rule.key);
    const option = rule.options.find((o) => o.value === pol[rule.key]);
    return `<div class="cs-read-rule" data-cs-read-rule="${rule.key}"><dt>${ctx.esc(say(ctx, rule.label))}${lock ? ` <span class="cs-lock">${lockIcon()} ${ctx.t("Bloccata", "Locked")}</span>` : ""}</dt><dd><strong>${ctx.esc(say(ctx, option?.label))}</strong><small>${sourceText(ctx, option?.source)}</small></dd></div>`;
  }).join("");
  const permissions = D.PERMISSIONS.map(
    (row) =>
      `<div class="cs-read-rule" data-cs-read-permission="${row.key}"><dt>${ctx.esc(say(ctx, row.short))}</dt><dd><strong>${D.permissionAllowed(pol, row.key) ? ctx.t("Consentito", "Allowed") : ctx.t("Solo il DM", "The DM only")}</strong></dd></div>`,
  ).join("");
  return `<div class="cs-page" data-cs-page="rules">${heading(
    ctx,
    ctx.t("Regole della tavola", "Table rules"),
    ctx.state.campaign?.name ?? "",
    isDm(ctx)
      ? `<button type="button" class="button" data-cs-edit-rules>${ctx.t("Modifica nelle impostazioni", "Edit in settings")}</button>`
      : "",
  )}<section class="cs-block" aria-labelledby="cs-read-rules"><h2 id="cs-read-rules">${ctx.t("Regole", "Rules")}</h2><dl class="cs-read-list"><div class="cs-read-rule"><dt>${ctx.t("Edizione", "Edition")} <span class="cs-lock">${lockIcon()} ${ctx.t("Bloccata", "Locked")}</span></dt><dd><strong>D&amp;D 2024 · SRD 5.2.1</strong><small>${ctx.t("Fissata alla creazione della campagna", "Fixed when the campaign was created")}</small></dd></div>${rows}${toolsKnown(ctx) ? D.PLAYER_TOOLS.map((tool) => `<div class="cs-read-rule" data-cs-read-tool="${tool.key}"><dt>${ctx.esc(say(ctx, tool.short))}</dt><dd><strong>${D.playerToolAllowed(ctx.state, tool.key) ? ctx.t("Consentito", "Allowed") : ctx.t("Disattivato dal DM", "Turned off by the DM")}</strong></dd></div>`).join("") : ""}${permissions}</dl></section><section class="cs-block" aria-labelledby="cs-read-house"><h2 id="cs-read-house">${ctx.t("Regole della casa", "House rules")}</h2>${houseRules.length ? `<ul class="cs-house-list">${houseRules.map((rule) => houseRuleItem(ctx, rule, false)).join("")}</ul>` : `<p class="muted">${ctx.t("Nessuna regola della casa: si gioca come scrive il SRD.", "No house rules: play as the SRD writes.")}</p>`}</section><section class="cs-block" aria-labelledby="cs-read-sources"><h2 id="cs-read-sources">${ctx.t("Fonti", "Sources")}</h2><ul class="cs-source-list">${sourceRows(ctx)}</ul></section></div>`;
}

// ---------------------------------------------------------------- view as

// The member and the page inside the member view live in the route
// (#campaign?tab=campaign-settings-view&id=<member>/<page>[/<entry id>]): every page of the
// view keeps the banner and "Back to my user" (Kanka SVC-040), and a reload stays in it.
const VA_PAGES = ["overview", "group", "sessions", "journal", "world", "notes", "table"];
const VA_KINDS = { journal: ["recap", "quest"], world: ["world"], notes: ["note"] };
const VA_NAMES = {
  overview: L("Panoramica", "Overview"),
  group: L("Gruppo", "Party"),
  sessions: L("Sessioni", "Sessions"),
  journal: L("Diario", "Journal"),
  world: L("Mondo", "World"),
  notes: L("Appunti condivisi", "Shared notes"),
  table: L("Tavolo", "Table"),
};
const ENTRY_KINDS = {
  note: L("Appunto", "Note"),
  world: L("Mondo", "World"),
  quest: L("Missione", "Quest"),
  recap: L("Resoconto", "Recap"),
};
export const viewAsRoute = (memberId, page = "overview", entryId = "") =>
  [memberId, page, entryId].filter(Boolean).join("/");
function parseViewAs(id) {
  const [member = "", page = "overview", ...rest] = String(id ?? "").split("/");
  return {
    member,
    page: page === "entry" || VA_PAGES.includes(page) ? page : "overview",
    entryId: rest.join("/"),
  };
}
// The name a member reads for a creature: a hidden name stays its alias (B12).
function seenName(ctx, actor) {
  const n = hiddenName(ctx.state, tokenSlice(ctx.state), actor.id) ? aliasNumber(actor.name) : null;
  return n === null ? actor.name : aliasIn(n, ctx.lang);
}
function vaButton(ctx, page, text, kind = "") {
  return `<button type="button" class="button ${kind}" data-cs-va-go="${page}">${ctx.esc(text)}</button>`;
}
function vaEntryRows(ctx, entries) {
  return entries.length
    ? `<ul class="cs-va-entries" data-cs-va-entries>${entries
        .map(
          (entry) =>
            `<li><div><span class="badge">${ctx.esc(say(ctx, ENTRY_KINDS[entry.kind] ?? entry.kind))}</span> <strong>${ctx.esc(entry.title || say(ctx, ENTRY_KINDS[entry.kind] ?? entry.kind))}</strong>${entry.excerpt ? `<small>${ctx.esc(entry.excerpt.slice(0, 140))}</small>` : ""}</div><button type="button" class="button quiet" data-cs-va-entry="${ctx.esc(entry.id)}" aria-label="${ctx.esc(ctx.t(`Apri «${entry.title || ENTRY_KINDS[entry.kind]?.it || entry.kind}»`, `Open “${entry.title || ENTRY_KINDS[entry.kind]?.en || entry.kind}”`))}">${ctx.t("Apri", "Open")}</button></li>`,
        )
        .join("")}</ul>`
    : `<p class="muted">${ctx.t("Nessuna voce qui.", "No entries here.")}</p>`;
}
function vaCharacters(ctx, view) {
  const rows = view.characters.filter((actor) => actor.campaign);
  return rows.length
    ? `<ul class="cs-plain" data-cs-va-sheets>${rows.map((actor) => `<li><strong>${ctx.esc(actor.name)}</strong>${actor.className ? ` · ${ctx.esc(ctx.label(actor.className))}` : ""}${actor.hp !== null ? ` · ${actor.hp}/${actor.maxHp} ${ctx.t("PF", "HP")}` : ""} · ${actor.controlled ? ctx.t("la controlla", "controls it") : ctx.t("solo lettura", "read only")}</li>`).join("")}</ul>`
    : `<p class="muted">${ctx.t("Nessuna scheda del gruppo.", "No party sheet.")}</p>`;
}
function vaPage(ctx, view, route, name, open) {
  const hidden = view.hiddenFromMember;
  const privateNote = `<p class="cs-hidden-note" data-cs-va-hidden>${hidden.ownNotes ? ctx.t(`Non visibili a ${name}: ${hidden.ownNotes} tuoi contenuti privati (appunti «Solo io» e voci riservate ai DM).`, `Not visible to ${name}: ${hidden.ownNotes} of your private items (“Only me” notes and DM-only entries).`) : ctx.t("Nessun tuo contenuto privato è escluso.", "None of your private items is excluded.")}</p>`;
  const plans = hidden.privatePlans.length
    ? `<p class="cs-hidden-note" data-cs-va-plans>${ctx.esc(ctx.t(`Piani «Solo io» non visibili a ${name}: ${hidden.privatePlans.map((p) => p.name).join(", ")}.`, `“Only me” plans not visible to ${name}: ${hidden.privatePlans.map((p) => p.name).join(", ")}.`))}</p>`
    : "";
  const upcoming = view.sessions.find(
    (session) =>
      session.status === "scheduled" && (session.startsAt ?? "") >= new Date().toISOString(),
  );
  const sessionRow = (session) =>
    `<li><strong>${ctx.esc(session.title || ctx.t("Sessione", "Session"))}</strong>${session.startsAt ? ` · ${ctx.esc(date(ctx, session.startsAt, true))}` : ` · ${ctx.t("data da concordare", "date to agree")}`}${session.status === "cancelled" ? ` · ${ctx.t("annullata", "cancelled")}` : ""}</li>`;
  if (route.page === "entry") {
    let entry;
    try {
      entry = D.viewAsEntry(ctx.state, campaignOf(ctx), view.member.id, ctx.role, route.entryId);
    } catch (error) {
      return `<section class="cs-block"><h2>${ctx.t("Voce non disponibile", "Entry unavailable")}</h2><p>${ctx.esc(errorText(ctx, error))}</p>${vaButton(ctx, "overview", ctx.t("Torna alla panoramica", "Back to the overview"))}</section>`;
    }
    const back = Object.keys(VA_KINDS).find((page) => VA_KINDS[page].includes(entry.kind));
    return `<article class="cs-block cs-va-entry" data-cs-va-entry-page="${ctx.esc(entry.id)}"><p><span class="badge">${ctx.esc(say(ctx, ENTRY_KINDS[entry.kind] ?? entry.kind))}</span>${entry.updatedAt ? ` <small class="muted">${ctx.esc(date(ctx, entry.updatedAt, true))}</small>` : ""}</p><h2>${ctx.esc(entry.title || say(ctx, ENTRY_KINDS[entry.kind] ?? entry.kind))}</h2><p class="cs-prose">${ctx.esc(entry.body)}</p>${entry.sections.map((section) => `<section><h3>${ctx.esc(section.title || ctx.t("Sezione", "Section"))}</h3><p class="cs-prose">${ctx.esc(section.body)}</p></section>`).join("")}<div class="toolbar">${back && open(back) ? vaButton(ctx, back, ctx.t(`Torna a ${say(ctx, VA_NAMES[back])}`, `Back to ${say(ctx, VA_NAMES[back])}`)) : vaButton(ctx, "overview", ctx.t("Torna alla panoramica", "Back to the overview"))}</div></article>`;
  }
  if (route.page === "group")
    return `<section class="cs-block"><h2>${ctx.t("Personaggi del gruppo", "Party characters")}</h2>${vaCharacters(ctx, view)}${plans}</section>`;
  if (route.page === "sessions")
    return `<section class="cs-block"><h2>${ctx.t("Sessioni", "Sessions")}</h2>${view.sessions.length ? `<ul class="cs-plain" data-cs-va-sessions>${view.sessions.map(sessionRow).join("")}</ul>` : `<p class="muted">${ctx.t("Nessuna sessione.", "No sessions.")}</p>`}</section>`;
  if (VA_KINDS[route.page])
    return `<section class="cs-block"><h2>${ctx.esc(say(ctx, VA_NAMES[route.page]))}</h2>${vaEntryRows(
      ctx,
      view.entries.filter((entry) => VA_KINDS[route.page].includes(entry.kind)),
    )}${privateNote}</section>`;
  if (route.page === "table")
    return `<section class="cs-block"><h2>${ctx.t("Al Tavolo", "At the Table")}</h2><ul class="cs-plain" data-cs-va-table>${D.PLAYER_TOOLS.map((tool) => `<li>${ctx.esc(say(ctx, tool.short))}: ${view.tools[tool.key] ? ctx.t("consentito", "allowed") : ctx.t("disattivato dal DM", "turned off by the DM")}</li>`).join("")}${view.enemies.map((enemy) => `<li data-cs-va-enemy="${ctx.esc(enemy.actorId)}">${ctx.esc(enemy.name)} · ${ctx.esc(enemy.health ? enemy.health.text : ctx.t("salute nascosta", "health hidden"))}</li>`).join("")}</ul></section>`;
  // Overview: the member's landing page, without the sections turned off.
  const recap = view.entries.find((entry) => entry.kind === "recap");
  return `<div class="cs-view-grid"><section class="cs-block"><h2>${ctx.t("Dove eravamo rimasti", "Previously")}</h2>${open("journal") && recap ? `<h3>${ctx.esc(recap.title || say(ctx, ENTRY_KINDS.recap))}</h3><p class="cs-prose">${ctx.esc(recap.excerpt)}</p><button type="button" class="button" data-cs-va-entry="${ctx.esc(recap.id)}">${ctx.t("Leggi il resoconto", "Read recap")}</button>` : `<p class="muted">${ctx.t("Nessun resoconto che possa leggere.", "No recap they can read.")}</p>`}</section>${open("sessions") ? `<section class="cs-block"><h2>${ctx.t("Il prossimo appuntamento", "Next appointment")}</h2>${upcoming ? `<ul class="cs-plain">${sessionRow(upcoming)}</ul>` : `<p class="muted">${ctx.t("Nessuna data concordata.", "No agreed date.")}</p>`}${vaButton(ctx, "sessions", ctx.t("Apri Sessioni", "Open Sessions"))}</section>` : ""}<section class="cs-block"><h2>${ctx.t("Personaggi del gruppo", "Party characters")}</h2>${vaCharacters(ctx, view)}${plans}</section><section class="cs-block"><h2>${ctx.t("Cosa resta privato", "What stays private")}</h2>${privateNote}${open("world") ? vaButton(ctx, "world", ctx.t("Esplora il mondo", "Explore the world")) : ""}</section></div>`;
}
export function renderViewAs(ctx) {
  const route = parseViewAs(ctx.view.id);
  const memberId = route.member || ui.viewAs;
  ui.viewAs = memberId || null;
  let view;
  try {
    view = D.projectViewAs(ctx.state, safeSlice(ctx.state), campaignOf(ctx), memberId, ctx.role, {
      lang: ctx.lang,
      nameOf: (actor) => seenName(ctx, actor),
    });
  } catch (error) {
    return `<div class="empty-state"><h1>${ctx.t("Vista non disponibile", "View unavailable")}</h1><p>${ctx.esc(errorText(ctx, error))}</p><button type="button" class="button" data-cs-exit-view>${ctx.t("Torna al mio utente", "Back to my user")}</button></div>`;
  }
  const name = view.member.characters[0]?.name ?? view.member.name;
  const pol = policy(ctx);
  const open = (page) => !D.sectionHidden(pol, page);
  const pages = VA_PAGES.filter(open);
  const current =
    route.page === "entry" ? null : pages.includes(route.page) ? route.page : "overview";
  const shown = route.page === "entry" ? route : { ...route, page: current };
  // Area sections are listed, not rendered: each area decides what a member sees there, and
  // a preview would put the member's own private data from that area in front of the DM.
  const areas = (ctx.registry?.list("campaign-section", { ...ctx, role: view.member.id }) ?? [])
    .filter(
      (c) =>
        !c.replaces &&
        c.id !== "campaign-settings-view" &&
        !c.id.includes(".") &&
        !D.sectionHidden(pol, c.id),
    )
    .map((c) => ctx.registry.label(c, ctx.lang));
  const nav = `<nav class="cs-va-nav" aria-label="${ctx.esc(ctx.t(`Sezioni che ${name} vede`, `Sections ${name} sees`))}" data-cs-va-sections>${pages
    .map(
      (page) =>
        `<button type="button" class="button ${page === current ? "active" : "quiet"}" data-cs-va-go="${page}" ${page === current ? 'aria-current="page"' : ""}>${ctx.esc(say(ctx, VA_NAMES[page]))}</button>`,
    )
    .join(
      "",
    )}</nav>${areas.length ? `<p class="cs-meta" data-cs-va-areas>${ctx.esc(ctx.t(`Vede anche: ${areas.join(", ")}. Queste sezioni si controllano dalla loro area: la vista non ne mostra i contenuti per non esporre dati personali di ${name}.`, `Also sees: ${areas.join(", ")}. Check these sections from their own area: the view does not show their content, so ${name}’s personal data stays private.`))}</p>` : ""}`;
  return `<div class="cs-page cs-view-as" data-cs-page="view-as" data-token-menu-raw><header class="campaign-heading cs-view-heading"><div><h1 tabindex="-1" data-campaign-heading>${ctx.esc(ctx.t(`Vista come ${name}`, `View as ${name}`))} · ${ctx.esc(route.page === "entry" ? ctx.t("Voce", "Entry") : say(ctx, VA_NAMES[current]))}</h1><p class="muted">${ctx.esc(ctx.state.campaign?.name ?? "")} · ${ctx.esc(who(ctx, view.member.id))}</p></div></header><div class="cs-view-banner" role="region" aria-label="${ctx.esc(ctx.t(`Vista come ${name}`, `Viewing as ${name}`))}"><span>${ctx.icon("eye")}<span><strong data-cs-view-title>${ctx.esc(ctx.t(`Stai vedendo la campagna come ${name}`, `You are viewing the campaign as ${name}`))}</strong><small>${ctx.t("Sola lettura: qui non si modifica nulla. Gli appunti «Solo io» di ognuno restano privati.", "Read only: nothing changes from here. Everyone’s “Only me” notes stay private.")}</small></span></span><button type="button" class="button primary" data-cs-exit-view>${ctx.t("Torna al mio utente", "Back to my user")}</button></div>${nav}${vaPage(ctx, view, shown, name, open)}</div>`;
}

// ---------------------------------------------------------------- table: enemy health

function healthTargets(ctx, tableView) {
  const scene = tableView?.scene;
  if (!scene || ctx.role === "dm") return [];
  return (scene.tokens ?? [])
    .map((token) => ({ token, actor: ctx.state.actors[token.actorId] }))
    .filter(
      ({ token, actor }) =>
        D.isEnemyFor(ctx.state, actor, ctx.role) && observesToken(ctx.state, token, ctx.role),
    );
}
export function healthLayer(ctx, tableView) {
  const pol = policy(ctx);
  return healthTargets(ctx, tableView)
    .map(({ token, actor }) => {
      const health = D.enemyHealthFor(pol, actor, ctx.lang);
      if (!health) return "";
      const scale = sizeScale(displaySize(ctx.state, tokenSlice(ctx.state), token));
      const width = Math.max(44, health.text.length * 7.2 + 14);
      // The inner .token-display group is enlarged by the Table on touch screens exactly
      // like the token itself, so the pill keeps its place under the name.
      return `<g class="cs-health is-${health.word ?? "exact"}" data-cs-health="${ctx.esc(actor.id)}" transform="translate(${token.x},${token.y})"><g class="token-display"><g transform="translate(0,${50 * scale + 10})"><rect x="${-width / 2}" y="-9" width="${width}" height="18" rx="9"/><text y="4" text-anchor="middle">${ctx.esc(health.text)}</text></g></g></g>`;
    })
    .join("");
}
export function healthPanel(ctx, tableView) {
  const actor = ctx.state.actors[tableView?.selectedActorId];
  const pol = policy(ctx);
  const rule = D.ruleOf("enemyHp");
  if (ctx.role === "dm") {
    const shown = D.enemyHealthFor(pol, actor, ctx.lang);
    return `<p class="cs-health-line" data-cs-health-panel>${ctx.t("I giocatori vedono", "Players see")}: <strong>${ctx.esc(shown ? shown.text : ctx.t("nulla (salute nascosta)", "nothing (health hidden)"))}</strong></p><p class="cs-meta">${ctx.esc(optionLabel(ctx, rule, pol.enemyHp))} · <button type="button" class="text-button" data-cs-goto-rules>${ctx.t("Cambia nelle impostazioni", "Change in settings")}</button></p>`;
  }
  const shown = D.enemyHealthFor(pol, actor, ctx.lang);
  return `<p class="cs-health-line" data-cs-health-panel>${shown ? `<strong>${ctx.esc(shown.text)}</strong>${shown.word === "bloodied" ? ` <small>${ctx.t("metà dei PF o meno (SRD 5.2.1)", "half its HP or fewer (SRD 5.2.1)")}</small>` : ""}` : ctx.t("Il DM tiene nascosta la salute di questa creatura.", "The DM keeps this creature’s health hidden.")}</p>`;
}

// ---------------------------------------------------------------- assisted: "To apply"

// Assisted outcomes (C1, dnd5e FVT-138) wait for whoever controls the target: the DM for
// their creatures. They are listed on that identity's Table and in the notifications, so
// a turn that ends with damage still pending never goes unnoticed.
function readyList(ctx) {
  try {
    return D.readyApplications(ctx.state, ctx.role);
  } catch {
    return [];
  }
}
export function readyPanel(ctx) {
  const rows = readyList(ctx);
  return `<div class="cs-ready" data-cs-ready><p class="cs-meta">${ctx.t("Automazione assistita: i danni aspettano chi controlla il bersaglio.", "Assisted automation: damage waits for whoever controls the target.")}</p><ul class="cs-ready-list">${rows
    .map((row) => {
      const source = ctx.role === "dm" ? ctx.state.actors[row.sourceId]?.name : null;
      return `<li data-cs-ready-row="${ctx.esc(row.actorId)}"><div><strong>${ctx.esc(row.targetName)}</strong> · ${row.damage} ${ctx.t("danni", "damage")}${source ? ` · ${ctx.t("da", "from")} ${ctx.esc(source)}` : ""}</div><div class="toolbar"><button type="button" class="button primary" data-cs-apply-ready="${ctx.esc(row.actorId)}" data-attempt="${ctx.esc(row.attemptId)}" aria-label="${ctx.esc(ctx.t(`Applica ${row.damage} danni a ${row.targetName}`, `Apply ${row.damage} damage to ${row.targetName}`))}">${ctx.t("Applica", "Apply")}</button><button type="button" class="button quiet" data-cs-open-card="${ctx.esc(row.attemptId)}">${ctx.t("Apri la carta", "Open the card")}</button></div></li>`;
    })
    .join("")}</ul></div>`;
}
// On the map: a pill above each target with damage waiting, like the health pill.
export function readyLayer(ctx, tableView) {
  const scene = tableView?.scene;
  // B33 hook (additive): the damage tray draws this pill with the damage after defenses.
  if (!scene || ctx.registry?.get?.("table-panel", "damage-tray")) return "";
  const waiting = new Map();
  for (const row of readyList(ctx))
    waiting.set(row.actorId, (waiting.get(row.actorId) ?? 0) + row.damage);
  return (scene.tokens ?? [])
    .filter((token) => waiting.has(token.actorId))
    .map((token) => {
      const text = ctx.t(
        `${waiting.get(token.actorId)} da applicare`,
        `${waiting.get(token.actorId)} to apply`,
      );
      const scale = sizeScale(displaySize(ctx.state, tokenSlice(ctx.state), token));
      const width = Math.max(56, text.length * 7 + 16);
      return `<g class="cs-ready-pill" data-cs-ready-pill="${ctx.esc(token.actorId)}" transform="translate(${token.x},${token.y})"><g class="token-display"><g transform="translate(0,${-(50 * scale) - 12})"><rect x="${-width / 2}" y="-10" width="${width}" height="20" rx="10"/><text y="4" text-anchor="middle">${ctx.esc(text)}</text></g></g></g>`;
    })
    .join("");
}
function applyReady(ctx, attemptId, actorId) {
  try {
    // The same label as the attack card's Apply, so the card offers the same Undo.
    ctx.commit(ctx.t("Danni applicati", "Damage applied"), (draft) =>
      applyReadyOutcome(draft, attemptId, actorId, ctx.role),
    );
  } catch (error) {
    ctx.render();
    ctx.toast(errorText(ctx, error), true);
  }
}

// ---------------------------------------------------------------- sheet access

export function renderSheetAccess(ctx, actor) {
  // The sheet page is where DM edits are traced: know its data before the next commit.
  rememberIfStale(ctx.state);
  const pol = policy(ctx);
  const rec = record(ctx);
  const allowed = D.dmMayEdit(pol, actor);
  const trace = D.sheetTraceOf(safeSlice(ctx.state), campaignOf(ctx), actor.id).slice(-6).reverse();
  const traceHTML = `<h3>${ctx.t("Modifiche del DM a questa scheda", "DM edits to this sheet")}</h3>${trace.length ? `<ol class="cs-trace" data-cs-trace>${trace.map((row) => `<li><strong>${ctx.esc(row.label)}</strong><small>${ctx.esc(date(ctx, row.at, true))} · DM${row.kind === "correction" ? ` · ${ctx.t("annullamento", "undo")}` : ""}${row.authorized === false ? ` · <strong class="cs-unauthorized">${ctx.t("senza autorizzazione", "without authorization")}</strong>` : ""}</small></li>`).join("")}</ol>` : `<p class="muted" data-cs-trace-empty>${ctx.t("Nessuna modifica del DM registrata.", "No DM edit recorded.")}</p>`}`;
  if (ctx.role === actor.owner) {
    const pending = D.pendingSheetRequests(
      safeSlice(ctx.state),
      campaignOf(ctx),
      ctx.role,
      ctx.state,
    ).filter((request) => request.actorId === actor.id);
    return `<section class="cs-sheet panel" aria-labelledby="cs-sheet-title-${ctx.esc(actor.id)}"><h2 id="cs-sheet-title-${ctx.esc(actor.id)}">${ctx.t("Chi può modificare la scheda", "Who can edit this sheet")}</h2>${pending.map((request) => `<div class="cs-request" role="status" data-cs-request="${ctx.esc(request.id)}"><p>${ctx.t("Il DM chiede di poter modificare questa scheda.", "The DM asks to edit this sheet.")} <small>${ctx.esc(date(ctx, request.at, true))}</small></p><div class="toolbar"><button type="button" class="button primary" data-cs-grant="${ctx.esc(request.id)}">${ctx.t("Consenti", "Allow")}</button><button type="button" class="button" data-cs-decline="${ctx.esc(request.id)}">${ctx.t("Rifiuta", "Decline")}</button></div></div>`).join("")}<label class="cs-switch"><input type="checkbox" role="switch" data-cs-sheet-allow="${ctx.esc(actor.id)}" ${allowed ? "checked" : ""}><span><strong>${ctx.t("Il DM può modificare questa scheda", "The DM can edit this sheet")}</strong><small>${allowed ? ctx.t("Consentito: ogni sua modifica resta qui sotto.", "Allowed: each of their edits stays below.") : ctx.t("Riservato a te: dalla scheda il DM può solo consultarla e chiederti il permesso; al Tavolo applica comunque danni e condizioni di gioco.", "Reserved to you: from the sheet the DM can only read it and ask you; at the Table they still apply play damage and conditions.")}</small></span></label>${traceHTML}</section>`;
  }
  const pending = (rec?.sheetRequests ?? []).find(
    (r) => r.actorId === actor.id && r.status === "pending",
  );
  const lastAnswer = [...(rec?.sheetRequests ?? [])]
    .reverse()
    .find((r) => r.actorId === actor.id && r.status !== "pending");
  return `<section class="cs-sheet panel" aria-labelledby="cs-sheet-title-${ctx.esc(actor.id)}"><h2 id="cs-sheet-title-${ctx.esc(actor.id)}">${ctx.t("Modifiche del DM", "DM edits")}</h2><p data-cs-sheet-status>${allowed ? ctx.esc(ctx.t(`${actor.name} ti consente di modificare questa scheda: ogni modifica resta tracciata qui.`, `${actor.name} lets you edit this sheet: each edit stays traced here.`)) : ctx.esc(ctx.t(`Modifica riservata a chi gioca ${actor.name}: da questa pagina puoi solo consultarla (valori, danni, condizioni, risorse, inventario). Per correggerla chiedi l’autorizzazione. Al Tavolo, durante il gioco, applichi comunque danni e condizioni.`, `Editing reserved to ${actor.name}’s player: from this page you can only read it (values, damage, conditions, resources, inventory). To correct it, ask for authorization. At the Table, during play, you still apply damage and conditions.`))}</p>${!allowed ? (pending ? `<p class="cs-request" role="status">${ctx.t("Richiesta inviata il", "Request sent on")} ${ctx.esc(date(ctx, pending.at, true))}: ${ctx.t("in attesa della risposta.", "awaiting the answer.")}</p>` : `${lastAnswer?.status === "declined" ? `<p class="muted">${ctx.t("Ultima richiesta rifiutata il", "Last request declined on")} ${ctx.esc(date(ctx, lastAnswer.answeredAt, true))}.</p>` : ""}<button type="button" class="button primary" data-cs-ask="${ctx.esc(actor.id)}">${ctx.t("Chiedi autorizzazione", "Ask for authorization")}</button>`) : ""}${traceHTML}</section>`;
}

// ---------------------------------------------------------------- binding

function openRestore(ctx, entryId) {
  const rec = record(ctx);
  const entry = rec?.history.find((row) => row.id === entryId);
  if (!entry) return;
  ctx.dialog(
    ctx.t("Ripristina il valore precedente", "Restore the previous value"),
    `<p><strong>${ctx.esc(entryTitle(ctx, entry))}</strong> · ${valueText(ctx, { ...entry, from: entry.to, to: entry.from })}</p><p>${ctx.t("È una correzione: resta nello storico con il motivo.", "It is a correction: it stays in history with the reason.")}</p><div class="field"><label for="cs-restore-reason">${ctx.t("Motivo", "Reason")}</label><input id="cs-restore-reason" name="reason" maxlength="${D.REASON_MAX}" required autocomplete="off"></div>`,
    {
      submitLabel: ctx.t("Ripristina", "Restore"),
      onSubmit: (data) => {
        const reason = String(data.get("reason") ?? "").trim();
        if (!reason)
          throw Object.assign(Error("reason"), L("Indica il motivo.", "Give the reason."));
        own(
          ctx,
          ctx.t("Impostazione ripristinata con motivo", "Setting restored with a reason"),
          (draft) =>
            D.restoreHistoryEntry(draft, slice(draft), campaignOf(ctx), entryId, reason, ctx.role),
          { undoable: false },
        );
        ctx.toast(ctx.t("Valore precedente ripristinato.", "Previous value restored."));
      },
    },
  );
}
function openRetire(ctx, ruleId) {
  const rule = record(ctx)?.houseRules.find((row) => row.id === ruleId);
  if (!rule) return;
  ctx.dialog(
    ctx.t("Ritira la regola della casa", "Retire the house rule"),
    `<p><strong>${ctx.esc(rule.title)}</strong></p><p>${ctx.t("Non vale più da ora; resta tra le regole ritirate con il motivo.", "It no longer applies from now; it stays among retired rules with the reason.")}</p><div class="field"><label for="cs-retire-reason">${ctx.t("Motivo", "Reason")}</label><input id="cs-retire-reason" name="reason" maxlength="${D.REASON_MAX}" required autocomplete="off"></div>`,
    {
      submitLabel: ctx.t("Ritira", "Retire"),
      onSubmit: (data) => {
        const reason = String(data.get("reason") ?? "").trim();
        if (!reason)
          throw Object.assign(Error("reason"), L("Indica il motivo.", "Give the reason."));
        own(
          ctx,
          ctx.t("Regola della casa ritirata", "House rule retired"),
          (draft) =>
            D.retireHouseRule(draft, slice(draft), campaignOf(ctx), ruleId, reason, ctx.role),
          { undoable: false },
        );
      },
    },
  );
}
function openPreset(ctx, presetId = "standard-2024") {
  const preset = D.presetById(presetId);
  let preview;
  try {
    preview = D.previewPreset(safeSlice(ctx.state), campaignOf(ctx), presetId);
  } catch (error) {
    ctx.render();
    ctx.toast(errorText(ctx, error), true);
    return;
  }
  const name = say(ctx, preset.label);
  if (!preview.changes.length) {
    ctx.render();
    ctx.toast(
      preview.kept.length
        ? ctx.t(
            `Le regole modificabili sono già ${name}; quelle bloccate restano come sono.`,
            `The editable rules already match ${name}; locked ones stay as they are.`,
          )
        : ctx.t(`Le regole sono già ${name}.`, `The rules already match ${name}.`),
    );
    return;
  }
  const rule = (key) => D.ruleOf(key);
  ctx.dialog(
    ctx.t(`Usa il preset ${name}`, `Use the ${name} preset`),
    `<p>${ctx.esc(say(ctx, preset.help))}</p><p>${ctx.t("Cambieranno", "Will change")}:</p><ul data-cs-preset-changes>${preview.changes.map((change) => `<li>${ctx.esc(say(ctx, rule(change.key).label))}: ${ctx.esc(optionLabel(ctx, rule(change.key), change.from))} → ${ctx.esc(optionLabel(ctx, rule(change.key), change.to))}</li>`).join("")}</ul>${preview.kept.length ? `<p data-cs-preset-kept>${lockIcon()} ${ctx.t("Restano come sono (bloccate dall’avvio)", "Stay as they are (locked since the start)")}: ${preview.kept.map((k) => ctx.esc(say(ctx, rule(k.key).label))).join(", ")}</p>` : ""}<p class="muted">${ctx.t("Il cambio resta nello Storico. Esc annulla senza cambiare nulla.", "The change stays in History. Esc cancels without changing anything.")}</p>`,
    {
      submitLabel: ctx.t(`Usa ${name}`, `Use ${name}`),
      onSubmit: () => {
        own(
          ctx,
          ctx.t(`Regole: preset ${name}`, `Rules: ${name} preset`),
          (draft) => D.applyPreset(draft, slice(draft), campaignOf(ctx), presetId, ctx.role),
          { undoable: false },
        );
        ctx.toast(ctx.t(`Preset ${name} in uso.`, `${name} preset in use.`));
      },
    },
  );
}
function openApplySceneDefaults(ctx) {
  const preview = D.previewSceneDefaults(ctx.state, safeSlice(ctx.state), campaignOf(ctx));
  const fields = (row) => row.fields.map((key) => sceneFieldName(ctx, key)).join(", ");
  ctx.dialog(
    ctx.t("Applica i predefiniti alle esistenti", "Apply defaults to existing"),
    `${preview.scenes.length ? `<label class="check-field"><input type="checkbox" name="scenes" checked> <strong>${preview.scenes.length} ${preview.scenes.length === 1 ? ctx.t("scena cambierà", "scene will change") : ctx.t("scene cambieranno", "scenes will change")}</strong></label><ul data-cs-scene-impact-list>${preview.scenes.map((row) => `<li>${ctx.esc(row.name)}: ${ctx.esc(fields(row))}</li>`).join("")}</ul>` : ""}${preview.creatures.length ? `<label class="check-field"><input type="checkbox" name="creatures" checked> <strong>${preview.creatures.length} ${preview.creatures.length === 1 ? ctx.t("creatura cambierà", "creature will change") : ctx.t("creature cambieranno", "creatures will change")}</strong>: ${ctx.esc(preview.creatures.map((c) => c.name).join(", "))}</label>` : ""}<p class="muted">${ctx.t("Esc annulla senza cambiare nulla. Dopo potrai annullare con «Annulla».", "Esc cancels without changing anything. Afterwards you can undo with “Undo”.")}</p>`,
    {
      submitLabel: ctx.t("Applica", "Apply"),
      onSubmit: (data) => {
        const choice = { scenes: data.has("scenes"), creatures: data.has("creatures") };
        if (!choice.scenes && !choice.creatures)
          throw Object.assign(
            Error("none"),
            L("Scegli almeno una parte da applicare.", "Choose at least one part to apply."),
          );
        let row;
        const label = ctx.t("Predefiniti applicati alle esistenti", "Defaults applied to existing");
        own(
          ctx,
          label,
          (draft) => {
            row = D.applySceneDefaults(draft, slice(draft), campaignOf(ctx), ctx.role, choice);
          },
          { undoable: true },
        );
        ctx.toast(`${label}: ${row.count}`);
      },
    },
  );
}
function openApplyDefaults(ctx) {
  const pol = policy(ctx);
  const preview = D.previewCreatureDefaults(
    ctx.state,
    tokenSlice(ctx.state) ?? tokenMenuSeed(),
    pol.creatureName,
  );
  const valueName = say(ctx, D.CREATURE_NAME.find((o) => o.value === pol.creatureName)?.label);
  ctx.dialog(
    ctx.t("Applica i predefiniti alle esistenti", "Apply defaults to existing"),
    `<label class="check-field"><input type="checkbox" name="creature-name" checked> ${ctx.t("Nome delle creature visibile a", "Creature names visible to")}: <strong>${ctx.esc(valueName)}</strong></label><p data-cs-impact-count><strong>${preview.changes.length} ${preview.changes.length === 1 ? ctx.t("creatura cambierà", "creature will change") : ctx.t("creature cambieranno", "creatures will change")}</strong> ${ctx.t("su", "on")} ${preview.scenes} ${preview.scenes === 1 ? ctx.t("scena", "scene") : ctx.t("scene", "scenes")}: ${ctx.esc(preview.changes.map((c) => c.name).join(", "))}.</p><p class="muted">${ctx.t("Esc annulla senza cambiare nulla. Dopo potrai annullare con «Annulla».", "Esc cancels without changing anything. Afterwards you can undo with “Undo”.")}</p>`,
    {
      submitLabel: ctx.t("Applica", "Apply"),
      onSubmit: (data) => {
        if (!data.has("creature-name"))
          throw Object.assign(
            Error("none"),
            L(
              "Scegli almeno un predefinito da applicare.",
              "Choose at least one default to apply.",
            ),
          );
        const label =
          pol.creatureName === "dm"
            ? ctx.t(
                `Nome nascosto per ${preview.changes.length} creature`,
                `Name hidden for ${preview.changes.length} creatures`,
              )
            : ctx.t(
                `Nome mostrato per ${preview.changes.length} creature`,
                `Name shown for ${preview.changes.length} creatures`,
              );
        let row;
        own(
          ctx,
          label,
          (draft) => {
            row = D.applyCreatureDefaults(
              draft,
              slice(draft),
              tokenSlice(draft),
              campaignOf(ctx),
              ctx.role,
              setNameHidden,
              { lang: ctx.lang },
            );
          },
          { undoable: true },
        );
        ui.lastApply = { label, historyId: row.id };
        ui.focus = "[data-cs-apply-result] button, [data-cs-apply-defaults]";
        ctx.render();
        ctx.toast(label);
      },
    },
  );
}

function bindPage(root, ctx) {
  const on = (selector, handler, type = "click") =>
    root
      .querySelectorAll(selector)
      .forEach((el) => el.addEventListener(type, (event) => handler(el, event)));
  on("[data-cs-tab]", (el) => ctx.navigate("campaign", { tab: "settings", id: el.dataset.csTab }));
  on("[data-cs-goto-tab]", (el) =>
    ctx.navigate("campaign", { tab: "settings", id: el.dataset.csGotoTab }),
  );
  on("[data-cs-open-rules]", () => ctx.navigate("campaign", { tab: "campaign-settings-rules" }));
  on("[data-cs-edit-rules]", () => ctx.navigate("campaign", { tab: "settings", id: "rules" }));
  on(
    "[data-cs-rule-input]",
    (el) =>
      run(
        ctx,
        `${ctx.t("Regola cambiata", "Rule changed")}: ${say(ctx, D.ruleOf(el.dataset.csRuleInput)?.label)}`,
        (draft, sl) =>
          D.setRule(draft, sl, campaignOf(ctx), el.dataset.csRuleInput, el.value, ctx.role),
        { focus: `[data-cs-rule-input="${el.dataset.csRuleInput}"][value="${el.value}"]` },
      ),
    "change",
  );
  on("[data-cs-preset]", () => openPreset(ctx));
  on(
    "[data-cs-preset-pick]",
    (el) => {
      if (el.value !== "custom") return openPreset(ctx, el.value);
      ctx.toast(
        ctx.t(
          "Personalizzato: cambia le singole regole qui sotto.",
          "Custom: change single rules below.",
        ),
      );
      root.querySelector?.("#cs-rules-title")?.scrollIntoView?.({ block: "start" });
    },
    "change",
  );
  on(
    "[data-cs-disclosure-input]",
    (el) =>
      run(
        ctx,
        `${ctx.t("Cosa vedono i giocatori", "What players see")}: ${say(ctx, D.disclosureSetting(el.dataset.csDisclosureInput)?.label)}`,
        (draft, sl) =>
          D.setDisclosure(
            draft,
            sl,
            campaignOf(ctx),
            el.dataset.csDisclosureInput,
            el.value,
            ctx.role,
          ),
        {
          focus: `[data-cs-disclosure-input="${el.dataset.csDisclosureInput}"][value="${el.value}"]`,
        },
      ),
    "change",
  );
  on(
    "[data-cs-permission]",
    (el) =>
      run(
        ctx,
        `${say(ctx, D.permissionOf(el.dataset.csPermission)?.short)}: ${el.checked ? ctx.t("consentito", "allowed") : ctx.t("solo il DM", "the DM only")}`,
        (draft, sl) =>
          D.setPermission(
            draft,
            sl,
            campaignOf(ctx),
            el.dataset.csPermission,
            el.checked,
            ctx.role,
          ),
        { focus: `[data-cs-permission="${el.dataset.csPermission}"]` },
      ),
    "change",
  );
  on(
    "[data-cs-homebrew]",
    (el) =>
      run(
        ctx,
        el.checked
          ? ctx.t("Fonte homebrew attivata", "Homebrew source turned on")
          : ctx.t("Fonte homebrew spenta", "Homebrew source turned off"),
        (draft) => D.setHomebrewSource(draft, el.dataset.csHomebrew, el.checked, ctx.role),
        { focus: `[data-cs-homebrew="${el.dataset.csHomebrew}"]` },
      ),
    "change",
  );
  on(
    "[data-cs-scene-default]",
    (el) => {
      const key = el.dataset.csSceneDefault;
      const value =
        el.type === "checkbox" ? el.checked : key === "metersPerCell" ? Number(el.value) : el.value;
      run(
        ctx,
        `${ctx.t("Predefinito della scena", "Scene default")}: ${sceneFieldName(ctx, key)}`,
        (draft, sl) => D.setSceneDefault(draft, sl, campaignOf(ctx), key, value, ctx.role),
        {
          focus:
            el.type === "checkbox"
              ? `[data-cs-scene-default="${key}"]`
              : `[data-cs-scene-default="${key}"][value="${el.value}"]`,
        },
      );
    },
    "change",
  );
  on(
    "[data-cs-creature-vision]",
    (el) =>
      run(
        ctx,
        ctx.t("Predefinito: visione delle creature", "Default: creature vision"),
        (draft, sl) => D.setCreatureVisionDefault(draft, sl, campaignOf(ctx), el.checked, ctx.role),
        { focus: "[data-cs-creature-vision]" },
      ),
    "change",
  );
  on("[data-cs-apply-scene-defaults]", () => openApplySceneDefaults(ctx));
  on(
    "[data-cs-legacy]",
    (el) =>
      run(
        ctx,
        el.checked
          ? ctx.t(
              "Versioni legacy 2014 accanto alle 2024",
              "Legacy 2014 versions beside the 2024 ones",
            )
          : ctx.t("Solo versioni 2024", "2024 versions only"),
        (draft, sl) => D.setLegacySources(draft, sl, campaignOf(ctx), el.checked, ctx.role),
        { focus: "[data-cs-legacy]" },
      ),
    "change",
  );
  on("[data-cs-discord]", () => openDiscord(ctx));
  on("[data-cs-integrations]", () => ctx.navigate("campaign", { tab: "integrations" }));
  const sharing = root.querySelector?.("[data-cs-sharing]");
  if (sharing) bindPublicSharing(sharing, ctx);
  on("[data-cs-start]", () =>
    run(ctx, ctx.t("Campagna avviata", "Campaign started"), (draft, sl) =>
      D.startCampaign(draft, sl, campaignOf(ctx), ctx.role),
    ),
  );
  on(
    "[data-cs-house-form]",
    (form, event) => {
      event.preventDefault();
      const input = {
        title: form.querySelector("[name=title]")?.value ?? "",
        text: form.querySelector("[name=text]")?.value ?? "",
      };
      const ok = run(
        ctx,
        ctx.t("Regola della casa aggiunta", "House rule added"),
        (draft, sl) => D.addHouseRule(draft, sl, campaignOf(ctx), input, ctx.role),
        { focus: "#cs-house-title-input" },
      );
      if (ok) ctx.toast(ctx.t("Regola della casa aggiunta.", "House rule added."));
    },
    "submit",
  );
  on("[data-cs-retire]", (el) => openRetire(ctx, el.dataset.csRetire));
  on(
    "[data-cs-tool]",
    (el) =>
      run(
        ctx,
        `${say(ctx, D.toolOf(el.dataset.csTool)?.short)}: ${el.checked ? ctx.t("attivati", "on") : ctx.t("spenti", "off")}`,
        (draft, sl) =>
          D.setPlayerTool(draft, sl, campaignOf(ctx), el.dataset.csTool, el.checked, ctx.role),
        { focus: `[data-cs-tool="${el.dataset.csTool}"]` },
      ),
    "change",
  );
  on(
    "[data-cs-section]",
    (el) =>
      run(
        ctx,
        `${el.checked ? ctx.t("Sezione attivata", "Section turned on") : ctx.t("Sezione disattivata", "Section turned off")}: ${sectionLabel(ctx, el.dataset.csSection)}`,
        (draft, sl) =>
          D.setSectionHidden(
            draft,
            sl,
            campaignOf(ctx),
            el.dataset.csSection,
            !el.checked,
            ctx.role,
          ),
        { focus: `[data-cs-section="${el.dataset.csSection}"]` },
      ),
    "change",
  );
  on("[data-cs-library]", () => ctx.navigate("library", { tab: "campaign" }));
  on(
    "[data-cs-default-input]",
    (el) =>
      run(
        ctx,
        ctx.t("Predefinito delle creature cambiato", "Creature default changed"),
        (draft, sl) => D.setCreatureNameDefault(draft, sl, campaignOf(ctx), el.value, ctx.role),
        { focus: `[data-cs-default-input][value="${el.value}"]` },
      ),
    "change",
  );
  on("[data-cs-apply-defaults]", () => openApplyDefaults(ctx));
  on("[data-cs-undo-apply]", () => ctx.undo());
  on("[data-cs-restore]", (el) => openRestore(ctx, el.dataset.csRestore));
  on("[data-cs-view-as]", (el) => openViewAs(ctx, el.dataset.csViewAs));
  on("[data-cs-va-go]", (el) =>
    ctx.navigate("campaign", {
      tab: "campaign-settings-view",
      id: viewAsRoute(ui.viewAs, el.dataset.csVaGo),
    }),
  );
  on("[data-cs-va-entry]", (el) =>
    ctx.navigate("campaign", {
      tab: "campaign-settings-view",
      id: viewAsRoute(ui.viewAs, "entry", el.dataset.csVaEntry),
    }),
  );
  on("[data-cs-apply-ready]", (el) => applyReady(ctx, el.dataset.attempt, el.dataset.csApplyReady));
  on("[data-cs-open-card]", (el) => openCombatRequests(ctx, el.dataset.csOpenCard));
  on("[data-cs-exit-view]", () => {
    ui.viewAs = null;
    ctx.navigate("campaign", { tab: "settings", id: "permissions" });
  });
  on("[data-cs-open-sheet]", (el) => ctx.openSheet(el.dataset.csOpenSheet, "actions"));
  on(
    "[data-cs-ask]",
    (el) =>
      run(
        ctx,
        ctx.t("Autorizzazione richiesta al giocatore", "Authorization asked of the player"),
        (draft, sl) => D.requestSheetEdit(draft, sl, campaignOf(ctx), el.dataset.csAsk, ctx.role),
      ) &&
      ctx.toast(
        ctx.t(
          "Richiesta inviata: il giocatore la vede tra le notifiche.",
          "Request sent: the player sees it in the notifications.",
        ),
      ),
  );
  on("[data-cs-grant]", (el) =>
    run(ctx, ctx.t("Modifiche del DM consentite", "DM edits allowed"), (draft, sl) =>
      D.answerSheetRequest(draft, sl, campaignOf(ctx), el.dataset.csGrant, true, ctx.role),
    ),
  );
  on("[data-cs-decline]", (el) =>
    run(ctx, ctx.t("Richiesta del DM rifiutata", "DM request declined"), (draft, sl) =>
      D.answerSheetRequest(draft, sl, campaignOf(ctx), el.dataset.csDecline, false, ctx.role),
    ),
  );
  on(
    "[data-cs-sheet-allow]",
    (el) =>
      run(
        ctx,
        el.checked
          ? ctx.t("Modifiche del DM consentite", "DM edits allowed")
          : ctx.t("Modifiche del DM riservate", "DM edits withheld"),
        (draft, sl) =>
          D.setDmSheetEdit(
            draft,
            sl,
            campaignOf(ctx),
            el.dataset.csSheetAllow,
            el.checked,
            ctx.role,
          ),
        { focus: `[data-cs-sheet-allow="${el.dataset.csSheetAllow}"]` },
      ),
    "change",
  );
  on("[data-cs-goto-rules]", () => ctx.navigate("campaign", { tab: "settings", id: "rules" }));
  restoreFocus(root);
}
export const bindCampaignSettings = bindPage;

// ---------------------------------------------------------------- follow-up commits

// Fingerprints after the last seen commit: the player sheets (which sheet a commit really
// changed) and the players' tools (a change made from another area's panel still enters
// History). Each belongs to one log entry; a stale snapshot is never compared.
function remember(state) {
  const cid = state?.campaign?.id;
  ui.seen = cid
    ? {
        logId: state.log?.at(-1)?.id ?? null,
        campaignId: cid,
        sheets: D.sheetPrints(state, cid),
        tools: D.playerTools(state),
      }
    : null;
}
function rememberIfStale(state) {
  if (
    ui.seen?.logId !== (state?.log?.at(-1)?.id ?? null) ||
    ui.seen?.campaignId !== state?.campaign?.id
  )
    remember(state);
}

// After a committed change: trace a DM edit on a player's sheet (only the sheets whose data
// the commit changed, never a roll or another creature's change), record players' tool
// changes made elsewhere, hide the name of a new DM creature when the default says so, and
// mark an undone "apply to existing". One nested commit, never undoable, never while it is
// running itself and never for this area's own settings commits.
function followUp(payload, ctx) {
  if (ui.tracing || !ctx?.state || !registryRef) return;
  const state = ctx.state;
  const cid = state.campaign?.id;
  const seen = ui.seen;
  const current = safeSlice(state);
  if (ui.self || !current || !cid) return remember(state);
  const fresh =
    Boolean(seen) && seen.campaignId === cid && seen.logId === (state.log?.at(-2)?.id ?? null);
  const steps = [];
  const labels = [];
  if (
    fresh &&
    payload.controller === "dm" &&
    payload.visibility !== "private" &&
    ctx.view?.page === "characters"
  )
    for (const actor of D.changedSheets(seen.sheets, state, cid)) {
      steps.push((draft, sl) =>
        D.recordSheetTrace(draft, sl, cid, {
          actorId: actor.id,
          logId: payload.id,
          label: payload.label,
          kind: payload.kind,
          authorized: D.dmMayEdit(D.policyOf(sl, cid), actor),
        }),
      );
      labels.push(
        ctx.t(
          `Traccia: modifica del DM sulla scheda di ${actor.name}`,
          `Trace: DM edit on ${actor.name}’s sheet`,
        ),
      );
    }
  const tools = D.playerTools(state);
  if (fresh && D.PLAYER_TOOLS.some((tool) => tools[tool.key] !== seen.tools[tool.key])) {
    const before = seen.tools;
    steps.push((draft, sl) => D.recordToolChanges(sl, cid, before, tools, payload.controller));
    labels.push(ctx.t("Storico: permessi dei giocatori", "History: players’ permissions"));
  }
  if (payload.kind !== "correction" && payload.controller === "dm") {
    const found = D.pendingNewCreatures(state, current, tokenSlice(state), cid);
    if (found.length) {
      steps.push((draft, sl) =>
        D.hideNewCreatures(draft, sl, tokenSlice(draft), cid, setNameHidden, ctx.lang),
      );
      labels.push(
        found.length === 1
          ? ctx.t(
              "Predefinito della campagna: nome nascosto per 1 nuova creatura",
              "Campaign default: name hidden for 1 new creature",
            )
          : ctx.t(
              `Predefinito della campagna: nome nascosto per ${found.length} nuove creature`,
              `Campaign default: name hidden for ${found.length} new creatures`,
            ),
      );
    }
  }
  // P10 CA-61 / CA-74: a DM creature added while players control them, and a scene or a
  // creature made after a default was set, follow the campaign's choice.
  if (payload.kind !== "correction" && payload.controller === "dm") {
    const shared = D.pendingSharedCreatures(state, current, cid);
    if (shared.length) {
      steps.push((draft, sl) => D.shareNewCreatures(draft, sl, cid));
      labels.push(
        ctx.t(
          "Permessi: i giocatori controllano anche le nuove creature del DM",
          "Permissions: players also control the DM’s new creatures",
        ),
      );
    }
    const fresh = D.pendingNewDefaults(state, current, cid);
    if (fresh.scenes.length || fresh.creatures.length) {
      steps.push((draft, sl) => D.followNewDefaults(draft, sl, cid));
      labels.push(
        ctx.t(
          "Predefiniti della campagna applicati ai nuovi elementi",
          "Campaign defaults applied to the new items",
        ),
      );
    }
  }
  if (payload.kind === "correction" && ui.lastApply && payload.label === ui.lastApply.label) {
    const historyId = ui.lastApply.historyId;
    ui.lastApply = null;
    steps.push((draft, sl) => {
      const entry = D.recordOf(sl, cid)?.history.find((row) => row.id === historyId);
      if (entry) entry.undoneAt = new Date().toISOString();
    });
    labels.push(ctx.t("Predefiniti: applicazione annullata", "Defaults: application undone"));
  }
  if (steps.length) {
    ui.tracing = true;
    try {
      ctx.commit(
        labels.join(" · "),
        (draft) => {
          const sl = slice(draft);
          for (const step of steps) step(draft, sl);
        },
        { undoable: false },
      );
    } catch {
      // Offline or refused: the original change stands; the follow-up is not forced.
    } finally {
      ui.tracing = false;
    }
  }
  remember(ctx.state);
}
// A turn that ends with assisted damage still waiting says so (the target's controller
// applies it from "To apply" on the Table).
function remindReady(payload, ctx) {
  if (payload.correction || !ctx?.state) return;
  const waiting = (ctx.state.combatAttempts ?? []).some(
    (attempt) =>
      attempt.actorId === payload.actorId &&
      (attempt.outcomes ?? []).some((outcome) => outcome.status === "ready"),
  );
  if (waiting)
    ctx.toast(
      ctx.t(
        "Danni ancora da applicare: li applica chi controlla il bersaglio (il DM per le sue creature) da «Da applicare» al Tavolo.",
        "Damage still to apply: whoever controls the target (the DM for their creatures) applies it from “To apply” on the Table.",
      ),
    );
}

// ---------------------------------------------------------------- view as and token lock

/** "View as" a member (Kanka), from a member row, the palette or Permissions. */
export function openViewAs(ctx, memberId) {
  ui.viewAs = memberId;
  ctx.navigate("campaign", { tab: "campaign-settings-view", id: viewAsRoute(memberId) });
}
function tokenIdOf(state, target) {
  const scene = (state.scenes ?? []).find((s) => s.id === (target?.sceneId ?? state.activeSceneId));
  return scene?.tokens?.find((token) => token.actorId === target?.actorId)?.id ?? null;
}
function togglePlayerLock(ctx, target) {
  const tokenId = tokenIdOf(ctx.state, target);
  const locked = isLocked(tokenSlice(ctx.state), tokenId);
  const name = ctx.state.actors?.[target.actorId]?.name ?? "";
  try {
    ctx.commit(
      locked
        ? ctx.t(`Pedina sbloccata: ${name}`, `Token unlocked: ${name}`)
        : ctx.t(`Pedina bloccata: ${name}`, `Token locked: ${name}`),
      (draft) => {
        const actor = draft.actors?.[target.actorId];
        if (
          !D.permissionAllowed(D.policyOf(slice(draft), draft.campaign?.id), "playerLock") ||
          !actor ||
          !ctx.canControl(actor)
        )
          throw Object.assign(
            Error("lock"),
            L("Il DM non consente di bloccare le pedine.", "The DM does not allow locking tokens."),
          );
        // The campaign permission authorizes this player for the tokens they control.
        setLocked(draft.ext["token-menu"], [tokenId], !locked, "dm");
      },
    );
  } catch (error) {
    ctx.toast(errorText(ctx, error), true);
  }
}

// ---------------------------------------------------------------- registration

export function register(registry) {
  registryRef = registry;
  registry.registerStateSlice(D.ID, {
    version: D.VERSION,
    // Campaign administration, like world settings: gameplay Undo never reverts it;
    // changes are corrected from History with a reason.
    undo: "preserve",
    seed: D.seedSlice,
    normalize: D.normalizeSlice,
  });
  registry.registerStyles(new URL("./campaign-settings.css", import.meta.url));
  registry.add("campaign-section", {
    id: "settings",
    replaces: true,
    roles: ["dm"],
    label: L("Impostazioni", "Settings"),
    render: renderSettings,
    bind: bindPage,
  });
  registry.add("campaign-section", {
    id: "campaign-settings-rules",
    group: "play",
    label: L("Regole della tavola", "Table rules"),
    order: 66,
    render: renderRulesPage,
    bind: bindPage,
  });
  registry.add("campaign-section", {
    id: "campaign-settings-view",
    group: "manage",
    label: L("Vista come membro", "Member view"),
    order: 75,
    roles: ["dm"],
    // Listed while the view is open; the route carries the member, so a reload keeps it.
    when: (ctx) => Boolean(ui.viewAs) || ctx?.view?.tab === "campaign-settings-view",
    render: renderViewAs,
    bind: bindPage,
  });
  registry.add("map-layer", {
    id: "campaign-settings-health",
    label: L("Salute dei nemici", "Enemy health"),
    order: 64,
    roles: ["player"],
    svg: healthLayer,
  });
  registry.add("table-panel", {
    id: "campaign-settings-health",
    label: L("Salute", "Health"),
    placement: "inspector",
    when: (ctx, tableView) => {
      const actor = ctx.state.actors[tableView?.selectedActorId];
      return ctx.role === "dm"
        ? actor?.kind === "npc" && !actor.companion
        : D.isEnemyFor(ctx.state, actor, ctx.role);
    },
    render: healthPanel,
    bind: bindPage,
  });
  registry.add("map-layer", {
    id: "campaign-settings-ready",
    label: L("Danni da applicare", "Damage to apply"),
    order: 65,
    svg: readyLayer,
  });
  registry.add("table-panel", {
    id: "campaign-settings-ready",
    label: L("Da applicare", "To apply"),
    placement: "inspector",
    order: 5,
    // B33 hook (additive): with the damage tray loaded (dnd5e tray, FVT-139) the same
    // outcomes are applied there, with defenses and multipliers; this list steps aside.
    when: (ctx) => readyList(ctx).length > 0 && !ctx.registry?.get?.("table-panel", "damage-tray"),
    render: readyPanel,
    bind: bindPage,
  });
  registry.add("sheet-section", {
    id: "campaign-settings-access",
    label: L("Chi può modificare la scheda", "Who can edit this sheet"),
    tab: "actions",
    when: (ctx, actor) =>
      Boolean(actor) &&
      D.playerCharacters(ctx.state, ctx.state.campaign?.id).some((a) => a.id === actor.id) &&
      (ctx.role === actor.owner || isDm(ctx)),
    render: renderSheetAccess,
    bind: bindPage,
  });
  registry.add("notifications", {
    id: "campaign-settings-requests",
    label: L("Impostazioni della campagna", "Campaign settings"),
    collect(ctx) {
      const cid = ctx.state.campaign?.id;
      return D.pendingSheetRequests(safeSlice(ctx.state), cid, ctx.role, ctx.state).map(
        (request) => ({
          id: "cs-" + request.id,
          title: {
            it: `Il DM chiede di modificare la scheda di ${ctx.state.actors[request.actorId]?.name ?? ""}`,
            en: `The DM asks to edit ${ctx.state.actors[request.actorId]?.name ?? ""}’s sheet`,
          },
          body: {
            it: "Rispondi dalla scheda: Consenti o Rifiuta.",
            en: "Answer from the sheet: Allow or Decline.",
          },
          time: request.at,
          category: "requests",
          target: { page: "characters", params: { id: request.actorId, tab: "actions" } },
        }),
      );
    },
  });
  // P10 CA-75: entering a campaign whose homebrew is missing says so, with the place to fix it.
  registry.add("notifications", {
    id: "campaign-settings-dependencies",
    label: L("Dipendenze della campagna", "Campaign dependencies"),
    roles: ["dm"],
    collect(ctx) {
      if (!isDm(ctx)) return [];
      let rows = [];
      try {
        rows = D.homebrewSources(ctx.state, ctx.role).filter(
          (row) => row.status === "missing" || row.needed,
        );
      } catch {
        rows = [];
      }
      return rows.length
        ? [
            {
              id: `cs-deps-${ctx.state.campaign.id}-${rows.map((row) => row.contentId).join("-")}`,
              title: {
                it: `Homebrew da sistemare nella campagna: ${rows.length}`,
                en: `Homebrew to fix in the campaign: ${rows.length}`,
              },
              body: {
                it: "Fonti: ogni voce mancante ha la sua azione.",
                en: "Sources: each missing entry has its own action.",
              },
              category: "requests",
              target: { page: "campaign", params: { tab: "settings", id: "sources" } },
            },
          ]
        : [];
    },
  });
  registry.add("notifications", {
    id: "campaign-settings-ready",
    label: L("Danni da applicare", "Damage to apply"),
    collect: (ctx) =>
      readyList(ctx).map((row) => ({
        id: `cs-ready-${row.attemptId}-${row.actorId}`,
        title: {
          it: `Da applicare: ${row.damage} danni a ${row.targetName}`,
          en: `To apply: ${row.damage} damage to ${row.targetName}`,
        },
        body: {
          it: "Automazione assistita: applicali dal Tavolo, in «Da applicare».",
          en: "Assisted automation: apply them from the Table, in “To apply”.",
        },
        time: row.at ?? undefined,
        category: "requests",
        target: { page: "table", params: {} },
      })),
  });
  registry.add("search", {
    id: "campaign-settings-search",
    label: L("Regole della tavola", "Table rules"),
    search(ctx, query) {
      const text = String(query ?? "")
        .trim()
        .toLocaleLowerCase();
      if (!text) return [];
      const rec = D.recordOf(safeSlice(ctx.state), ctx.state.campaign?.id);
      return (rec?.houseRules ?? [])
        .filter(
          (rule) =>
            !rule.retiredAt && `${rule.title} ${rule.text}`.toLocaleLowerCase().includes(text),
        )
        .map((rule) => ({
          title: rule.title,
          excerpt: { it: "Regola della casa", en: "House rule" },
          page: "campaign",
          params: { tab: "campaign-settings-rules" },
        }));
    },
  });
  registry.add("command", {
    id: "campaign-settings.open",
    label: L("Impostazioni della campagna", "Campaign settings"),
    roles: ["dm"],
    group: "campaign",
    keywords: ["impostazioni", "settings", "opzioni", "options", "configura"],
    run: (ctx) => ctx.navigate("campaign", { tab: "settings", id: "rules" }),
  });
  registry.add("command", {
    id: "campaign-settings.rules",
    label: L("Regole della tavola", "Table rules"),
    group: "campaign",
    keywords: [L("regole concordate", "agreed rules"), L("regole della casa", "house rules")],
    run: (ctx) => ctx.navigate("campaign", { tab: "campaign-settings-rules" }),
  });
  // P10: every settings place is a palette command with the words DMs type (SV-02
  // keywords): presets and rules, what players see, permissions, defaults, sources and
  // dependencies, the public page, "view as".
  const tabCommand = (id, tab, label, description, keywords) =>
    registry.add("command", {
      id: `campaign-settings.${id}`,
      label,
      description,
      roles: ["dm"],
      group: "campaign",
      keywords,
      run: (ctx) => ctx.navigate("campaign", { tab: "settings", id: tab }),
    });
  tabCommand(
    "presets",
    "rules",
    L(
      "Preset delle regole: Standard, Narrativo, Tattico",
      "Rules preset: Standard, Narrative, Tactical",
    ),
    L(
      "Impostazioni › Regole: preset, multiclasse, automazione, colpi critici, pozioni, ingombro, fiancheggiamento, regole della casa",
      "Settings › Rules: preset, multiclassing, automation, critical hits, potions, encumbrance, flanking, house rules",
    ),
    [
      L("preset", "preset"),
      L("multiclasse", "multiclassing"),
      L("automazione", "automation"),
      L("colpi critici", "critical hits"),
      L("pozioni", "potions"),
      L("ingombro", "encumbrance"),
      L("fiancheggiamento", "flanking"),
      L("modalità personalizzata", "custom mode"),
      L("difficoltà", "difficulty"),
    ],
  );
  tabCommand(
    "disclosure",
    "disclosure",
    L("Cosa vedono i giocatori", "What players see"),
    L(
      "Salute dei nemici, nomi delle creature, probabilità di colpire, schede dei mostri, CD dei tiri, prove passive fallite",
      "Enemy health, creature names, chance to hit, monster entries, roll DCs, failed passive checks",
    ),
    [
      L("salute dei nemici", "enemy health"),
      L("PF dei nemici", "enemy HP"),
      L("nomi delle creature", "creature names"),
      L("nascondi nomi", "hide names"),
      L("bestiario", "bestiary"),
      L("divulgazione", "disclosure"),
    ],
  );
  // R7 CA-71 (C1): the two switches other packages read, one search away.
  tabCommand(
    "dc",
    "disclosure",
    L("Nascondi o mostra le CD dei tiri ai giocatori", "Hide or show roll DCs to players"),
    L(
      "Impostazioni › Cosa vedono i giocatori: CD dei tiri e prove passive fallite",
      "Settings › What players see: roll DCs and failed passive checks",
    ),
    [
      L("CD nascosta", "hidden DC"),
      L("classe difficoltà", "difficulty class"),
      L("CD", "DC"),
      L("prove passive", "passive checks"),
      L("percezione passiva", "passive perception"),
    ],
  );
  tabCommand(
    "hit-chance",
    "disclosure",
    L("Probabilità di colpire mostrata ai giocatori", "Chance to hit shown to players"),
    L("Impostazioni › Cosa vedono i giocatori", "Settings › What players see"),
    [L("probabilità", "chance"), L("percentuale di colpire", "hit chance"), L("CA", "AC")],
  );
  tabCommand(
    "permissions",
    "permissions",
    L("Permessi dei giocatori", "Player permissions"),
    L(
      "Puntatore, disegni, sagome, creature del DM, blocco delle pedine, vedi come",
      "Pointer, drawings, templates, DM creatures, token lock, view as",
    ),
    [
      L("permessi", "permissions"),
      L("puntatore", "pointer"),
      L("disegno", "drawing"),
      L("muovere le creature", "move creatures"),
      L("bloccare pedine", "lock tokens"),
      L("raggruppare pedine", "group tokens"),
      L("gruppi di pedine", "token groups"),
      L("game settings", "game settings"),
    ],
  );
  tabCommand(
    "defaults",
    "defaults",
    L("Predefiniti di scene e pedine", "Scene and token defaults"),
    L(
      "Griglia, scala, nebbia, luce, visione; applica alle esistenti",
      "Grid, scale, fog, light, vision; apply to existing",
    ),
    [
      L("predefiniti", "defaults"),
      L("griglia", "grid"),
      L("scala", "scale"),
      L("nebbia", "fog"),
      L("applica alle esistenti", "apply to existing"),
    ],
  );
  tabCommand(
    "sources",
    "sources",
    L("Fonti e homebrew della campagna", "Campaign sources and homebrew"),
    L(
      "Contenuti attivi voce per voce, con la revisione in uso",
      "Content on, entry by entry, with the revision in use",
    ),
    [
      L("fonti", "sources"),
      L("homebrew", "homebrew"),
      L("compendio", "compendium"),
      L("libri", "books"),
      L("legacy", "legacy"),
      L("regole 2014", "2014 rules"),
      L("SRD 5.1", "SRD 5.1"),
    ],
  );
  // R7 SV-38: Discord from the settings palette words too («impostazioni discord»).
  tabCommand(
    "integrations",
    "integrations",
    L("Integrazioni della campagna: Discord", "Campaign integrations: Discord"),
    L(
      "Impostazioni › Integrazioni: inoltra tiri e avvisi a un canale Discord",
      "Settings › Integrations: relay rolls and notices to a Discord channel",
    ),
    [L("discord", "discord"), L("webhook", "webhook"), L("integrazioni", "integrations")],
  );
  tabCommand(
    "dependencies",
    "sources",
    L("Controlla le dipendenze della campagna", "Check the campaign’s dependencies"),
    L("Homebrew mancante o spento, voce per voce", "Missing or disabled homebrew, entry by entry"),
    [
      L("dipendenze", "dependencies"),
      L("contenuti mancanti", "missing content"),
      L("mancante", "missing"),
    ],
  );
  tabCommand(
    "sharing",
    "sharing",
    L("Pagina pubblica della campagna", "Campaign public page"),
    L(
      "Impostazioni › Condivisione: link pubblico in sola lettura da mandare agli amici",
      "Settings › Sharing: read-only public link to send to friends",
    ),
    [
      L("pagina pubblica", "public page"),
      L("link pubblico", "public link"),
      L("sola lettura", "read only"),
      L("condividi campagna", "share campaign"),
      L("condivisione", "sharing"),
    ],
  );
  registry.add("command", {
    id: "campaign-settings.view-as",
    label: L("Vedi come un giocatore", "View as a player"),
    description: L(
      "La campagna come la vede un membro, in sola lettura",
      "The campaign as a member sees it, read only",
    ),
    roles: ["dm"],
    group: "campaign",
    keywords: [
      L("vedi come", "view as"),
      L("come giocatore", "player view"),
      L("anteprima", "preview"),
    ],
    run: (ctx) => {
      const member = D.viewableMembers(ctx.state, campaignOf(ctx), ctx.role)[0];
      if (!member) return ctx.navigate("campaign", { tab: "settings", id: "permissions" });
      openViewAs(ctx, member.id);
    },
  });
  // P10 CA-61: players lock and unlock the tokens they control, when the DM allows it.
  registry.add("token-menu", {
    id: "campaign-settings-player-lock",
    label: L("Blocca o sblocca la pedina", "Lock or unlock the token"),
    roles: ["player"],
    when: (ctx, target) => {
      const actor = ctx.state.actors?.[target?.actorId];
      return Boolean(
        actor &&
        D.permissionAllowed(policy(ctx), "playerLock") &&
        ctx.canControl?.(actor) &&
        tokenIdOf(ctx.state, target),
      );
    },
    run: (ctx, target) => togglePlayerLock(ctx, target),
  });
  registry.on("commit", (payload, { ctx }) => followUp(payload, ctx));
  registry.on("turn-end", (payload, { ctx }) => remindReady(payload, ctx));
  registry.on("navigate", (payload, { ctx }) => {
    if (ui.viewAs && !(payload.page === "campaign" && payload.tab === "campaign-settings-view"))
      ui.viewAs = null;
    if (ctx?.state) rememberIfStale(ctx.state);
    if (payload.page !== "campaign" || !ctx?.state) return;
    // A player who opens the DM's settings link reads the agreed rules instead.
    if (payload.tab === "settings" && !isDm(ctx)) {
      queueMicrotask(() => {
        ctx.toast(
          ctx.t(
            "Le impostazioni sono del DM: ecco le regole della tavola.",
            "Settings belong to the DM: here are the table rules.",
          ),
        );
        ctx.navigate("campaign", { tab: "campaign-settings-rules" });
      });
      return;
    }
    // A section turned off is gone for everyone (Kanka CMP-24): an old link lands on
    // the overview with the reason instead of the hidden page.
    let section;
    try {
      section = getCampaignSection(ctx);
    } catch {
      return;
    }
    if (!D.sectionHidden(D.policyOf(safeSlice(ctx.state), ctx.state.campaign?.id), section)) return;
    queueMicrotask(() => {
      ctx.toast(
        ctx.t(
          "Questa sezione è disattivata in questa campagna.",
          "This section is turned off in this campaign.",
        ),
        true,
      );
      ctx.navigate("campaign", { tab: "overview" });
    });
  });
  // Another identity never inherits "view as" or a pending focus. The Undo offer stays: it
  // shows only while it is still that identity's own latest change.
  registry.on("role-changed", (payload, { ctx }) => {
    ui.viewAs = null;
    ui.focus = null;
    // Switching to a player on a DM-only page of this area lands on a page they can read.
    const view = ctx?.view;
    if (view?.page !== "campaign" || !["settings", "campaign-settings-view"].includes(view.tab))
      return;
    // A DM keeps the page: the settings, or the member view its route names.
    if (isDm(ctx)) return;
    queueMicrotask(() =>
      ctx.navigate("campaign", {
        tab: view.tab === "settings" ? "campaign-settings-rules" : "overview",
      }),
    );
  });
  registry.on("reset", (payload, { ctx }) => {
    resetCampaignSettingsView();
    if (ctx?.state) remember(ctx.state);
  });
}
