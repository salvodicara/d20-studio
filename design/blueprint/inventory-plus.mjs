// B36 entry module — deep inventory in the character sheet's Inventory tab (it replaces the
// core tab through the registry and keeps every core control: Details, Drink, Add item,
// Library, Record picked up, the pending potion roll), a Creature-inspector box at the Table
// for weapon sets and ammunition, notifications, a combat provider for ranged weapons that
// expend ammunition and a speed adjuster for encumbrance. Patterns and rules: see
// inventory-plus-domain.mjs (dnd5e FVT-017/018/023–027/140, DDB-045–051, Shard VTL-020/021,
// Roll20 R20-030, BG3 CRP-021/023/025, Solasta CRP-024).

import * as D from "./inventory-plus-domain.mjs";
import { registerActionProvider, provideRollReasons } from "./combat.mjs";
import { registerSpeedAdjuster, getEffectiveSpeed } from "./forms-companions.mjs";
import { canControlActor, canViewActor } from "./character-access.mjs";
import { homebrewAvailability, listHomebrew } from "./homebrew.mjs";
import { rollDie } from "./state.mjs";
import * as DT from "./damage-domain.mjs";
import { canPropose, suggestionsAllowed } from "./hp-widget.mjs";
import { LABELS, ITEMS as SRD_ITEMS, poundsToKg } from "./srd-sample.mjs";
import {
  COIN_IDS,
  coinAbbreviation,
  coinName,
  purseOf,
  formatCoins,
  formatCp,
  coinsValue,
  emptyCoins,
  isEmptyCoins,
  catalogValueCp,
} from "./party-stash.mjs";

const L = D.L;
let area = null; // the registry handle given to register()
const views = new Map(); // per actor: {query, filter, rarity, grouped, collapsed:Set}
let pendingFocus = null; // a selector to focus after the next bind
// The control that started the current command (the row's «Altro» for its dialogs): after a
// committed change re-renders the sheet, keyboard focus returns there instead of the page top.
let focusAnchor = null;
let inspectorFocus = null; // the same for the Table's Creature-inspector box
const controlSelector = (control) =>
  control?.dataset?.invp
    ? `[data-invp="${control.dataset.invp}"]${control.dataset.invpId ? `[data-invp-id="${cssId(control.dataset.invpId)}"]` : ""}`
    : null;

// PG-64: sort order and optional columns are the reader's layout (dnd5e sheet columns,
// BG3 sort): kept on this device for every sheet.
const LAYOUT_KEY = "d20-studio-inventory-layout";
export const COLUMNS = Object.freeze(["quantity", "weight", "value", "charges"]);
const DEFAULT_COLUMNS = Object.freeze(["quantity", "weight", "charges"]);
function readLayout() {
  try {
    const raw = JSON.parse(globalThis.localStorage?.getItem(LAYOUT_KEY) ?? "null");
    const sort = D.SORTS.includes(raw?.sort) ? raw.sort : "manual";
    const columns = Array.isArray(raw?.columns)
      ? raw.columns.filter((c) => COLUMNS.includes(c))
      : [...DEFAULT_COLUMNS];
    return { sort, columns };
  } catch {
    return { sort: "manual", columns: [...DEFAULT_COLUMNS] };
  }
}
function saveLayout(view) {
  try {
    globalThis.localStorage?.setItem(
      LAYOUT_KEY,
      JSON.stringify({ sort: view.sort, columns: [...view.columns] }),
    );
  } catch {
    /* the layout stays for this visit */
  }
}
export const viewOf = (actorId) => {
  if (!views.has(actorId)) {
    const layout = readLayout();
    views.set(actorId, {
      query: "",
      filter: "all",
      rarity: "",
      grouped: true,
      collapsed: new Set(),
      sort: layout.sort,
      columns: new Set(layout.columns),
    });
  }
  return views.get(actorId);
};
export function resetViews() {
  views.clear();
}

// ---------------------------------------------------------------- small helpers

const esc = (ctx, value) => ctx.esc(value ?? "");
const t = (ctx, it, en) => ctx.t(it, en);
const name = (ctx, row) => esc(ctx, D.rowName(row, ctx.lang));
const kg = (ctx, value) => D.fmt(value, ctx.lang);
const canonical = (ctx, actor) => ctx.state.actors?.[actor?.id] ?? actor;
const canEdit = (ctx, actor) => !!actor && ctx.canControl(actor);
const btn = (ctx, attrs, text, kind = "quiet") =>
  `<button type="button" class="button ${kind}" ${attrs}>${text}</button>`;
// SV-37 (Roll20's errors name the cause and the fix): a disabled command carries one sentence
// «cause. remedy.» beside it, linked by aria-describedby. `reason` is {it, en} or null.
const whyId = (...parts) =>
  "invp-why-" + parts.map((part) => String(part).replace(/[^a-z0-9_-]/gi, "-")).join("-");
const off = (id, reason) => (reason ? ` disabled aria-describedby="${id}"` : "");
const why = (ctx, id, reason) =>
  reason ? `<small class="invp-why" id="${id}">${esc(ctx, ctx.label(reason))}</small>` : "";
const sourcePages = (source, lang) =>
  source?.[lang]?.pages ??
  source?.pages?.[lang] ??
  (Array.isArray(source?.pages) && lang === "en" ? source.pages : []);
const sourceText = (ctx, source) => {
  if (!source) return "";
  if (source.kind === "srd") {
    const lang = ctx.lang === "it" ? "it" : "en";
    return `SRD 5.2.1 · ${lang.toUpperCase()} p. ${sourcePages(source, lang).join(", ")}`;
  }
  return ctx.label(source.title ?? "") || source.note || source.revision || "";
};
const RARITY = {
  common: L("comune", "common"),
  uncommon: L("non comune", "uncommon"),
  rare: L("raro", "rare"),
  "very-rare": L("molto raro", "very rare"),
  legendary: L("leggendario", "legendary"),
};
const FILTER_LABELS = {
  all: L("Tutti", "All"),
  equipped: L("Equipaggiati", "Equipped"),
  attunement: L("Sintonia", "Attunement"),
  consumable: L("Consumabili e cariche", "Consumables and charges"),
  ammunition: L("Munizioni", "Ammunition"),
  magic: L("Magici", "Magic"),
  containers: L("Contenitori", "Containers"),
};
const MATERIAL = { silver: L("argento", "silver"), adamantine: L("adamantio", "adamantine") };
function errorText(ctx, error) {
  return ctx.label(error?.it ? { it: error.it, en: error.en } : (error?.message ?? String(error)));
}
// Runs a command from a button: a refusal becomes a toast; a bug stays a bug.
function attempt(ctx, run) {
  try {
    return run();
  } catch (error) {
    if (error instanceof TypeError || error instanceof ReferenceError) throw error;
    ctx.toast(errorText(ctx, error), true);
    return null;
  }
}
// Shared or local commit: a private personal sheet changes locally (like characters.mjs).
function commit(ctx, actor, title, mutate, extra = {}) {
  const options = actor?.visibility === "private" ? { local: true, visibility: "private" } : {};
  const anchor = !pendingFocus && focusAnchor ? focusAnchor : null;
  if (anchor) pendingFocus = anchor;
  try {
    return ctx.commit(title, mutate, { ...options, ...extra });
  } finally {
    // Consumed by the sheet's bind when it re-rendered; never left to steal focus later.
    if (anchor && pendingFocus === anchor) pendingFocus = null;
  }
}
function logRoll(ctx, record, actor, title) {
  return {
    id: record.id,
    source: "inventory-plus",
    kind: record.kind,
    actorId: actor.id,
    actorName: actor.name,
    label: title,
    controller: ctx.role,
    owner: ctx.role,
    visibility: actor.visibility === "private" ? "private" : "shared",
    mode: record.mode,
    dice: structuredClone(record.dice),
    values: [...record.values],
    natural: record.values[0],
    modifier: record.modifier ?? 0,
    total: record.total,
    dc: null,
    rollMode: "normal",
    status: record.status === "reused" ? "reused" : "accepted",
  };
}
// A roll command: the faces are accepted inside the commit; the roll joins the commit's log
// entry (append-only evidence) and is announced with "roll-accepted" (B56 dice, B17 chat).
function commitRoll(ctx, actor, title, run) {
  let result = null;
  let roll = null;
  let logId = null;
  commit(
    ctx,
    actor,
    ctx.label(title),
    (draft) => {
      result = run(draft);
      const record = result?.record;
      if (record) roll = logRoll(ctx, record, draft.actors[actor.id] ?? actor, title);
    },
    {
      afterCommit: (state) => {
        const entry = state.log?.at(-1);
        if (!entry || !roll) return;
        entry.rolls = [...(entry.rolls ?? []), structuredClone(roll)];
        logId = entry.id;
      },
    },
  );
  if (roll) area?.emit?.("roll-accepted", { logId, roll: structuredClone(roll) });
  return result;
}
const die = (ctx) => ctx.rollDie ?? rollDie;
function facesHTML(dice, prefix = "") {
  if (!dice) return "";
  return Array.from(
    { length: dice.count },
    (_, i) =>
      `<label class="field invp-face"><span>d${dice.sides} · ${i + 1}</span><input type="number" inputmode="numeric" min="1" max="${dice.sides}" name="${prefix}face${i}"></label>`,
  ).join("");
}
function diceFields(ctx, dice, prefix = "") {
  if (!dice) return "";
  return `<fieldset class="invp-dice" data-invp-dice><legend>${t(ctx, "Dadi", "Dice")}</legend><label class="invp-radio"><input type="radio" name="${prefix}mode" value="digital" checked> ${t(ctx, "Digitali: tira l’app", "Digital: the app rolls")}</label><label class="invp-radio"><input type="radio" name="${prefix}mode" value="physical"> ${t(ctx, "Fisici: inserisco le facce", "Physical: I enter the faces")}</label><div class="invp-faces" data-invp-faces hidden>${facesHTML(dice, prefix)}</div></fieldset>`;
}
function readDice(data, dice, prefix = "") {
  const mode = data.get(prefix + "mode") === "physical" ? "physical" : "digital";
  const faces =
    mode === "physical" && dice
      ? Array.from({ length: dice.count }, (_, i) => Number(data.get(prefix + "face" + i)))
      : null;
  return { mode, faces };
}
function bindDiceToggle() {
  const root = globalThis.document?.querySelector("#dialog");
  const box = root?.querySelector("[data-invp-dice]");
  if (!box) return;
  const sync = () => {
    const physical = root.querySelector('[data-invp-dice] input[value="physical"]')?.checked;
    const faces = root.querySelector("[data-invp-faces]");
    if (faces) faces.hidden = !physical;
    faces?.querySelectorAll("input").forEach((input) => (input.required = !!physical));
  };
  box.addEventListener("change", sync);
  sync();
}
function coinsText(ctx, actor) {
  const purse = purseOf(actor);
  const parts = COIN_IDS.filter((id) => purse[id]).map(
    (id) => `${purse[id]} ${coinAbbreviation(id, ctx.lang)}`,
  );
  for (const def of D.currenciesOf(ctx.state)) {
    const n = actor.customCoins?.[def.id];
    if (n) parts.push(`${n} ${ctx.label(def.abbr)}`);
  }
  return parts.join(" · ") || t(ctx, "nessuna moneta", "no coins");
}
function coinInputs(ctx, prefix = "", { custom = true } = {}) {
  const standard = COIN_IDS.map(
    (id) =>
      `<label class="field"><span title="${esc(ctx, ctx.label(coinName(id)))}">${esc(ctx, coinAbbreviation(id, ctx.lang))}</span><input type="number" inputmode="numeric" min="0" step="1" name="${prefix}${id}" value="0"></label>`,
  );
  const extra = custom
    ? D.currenciesOf(ctx.state).map(
        (def) =>
          `<label class="field"><span title="${esc(ctx, ctx.label(def.name))}">${esc(ctx, ctx.label(def.abbr))}</span><input type="number" inputmode="numeric" min="0" step="1" name="${prefix}custom-${esc(ctx, def.id)}" value="0"></label>`,
      )
    : [];
  return `<div class="invp-coin-inputs">${[...standard, ...extra].join("")}</div>`;
}
function readCoinInputs(ctx, data, prefix = "") {
  const coins = emptyCoins();
  for (const id of COIN_IDS) coins[id] = Number(data.get(prefix + id) || 0);
  const customCoins = {};
  for (const def of D.currenciesOf(ctx.state)) {
    const n = Number(data.get(prefix + "custom-" + def.id) || 0);
    if (n) customCoins[def.id] = n;
  }
  return { coins, customCoins };
}
function undoBox(ctx) {
  return ctx.canUndo?.()
    ? `<button type="button" class="button quiet invp-undo" data-invp="undo">${ctx.icon?.("undo") ?? ""} ${t(ctx, "Annulla", "Undo")}: ${esc(ctx, ctx.undoLabel?.() ?? "")}</button>`
    : "";
}

// ---------------------------------------------------------------- the Inventory tab

function renderLoad(ctx, actor, editable) {
  const load = D.encumbranceOf(actor, ctx.state);
  const speed = getEffectiveSpeed(actor);
  const status = {
    none: L("Nessun effetto sulla velocità", "No effect on Speed"),
    unknown: L("Forza non registrata", "Strength not recorded"),
    encumbered: L("Ingombrato", "Encumbered"),
    heavily: L("Pesantemente ingombrato", "Heavily encumbered"),
    over: L("Oltre la capacità", "Over capacity"),
    immobile: L("Troppo peso per muoversi", "Too heavy to move"),
  }[load.status];
  const cap = load.carryKg;
  const ratio = Number.isFinite(cap) && cap > 0 ? Math.min(100, (load.weightKg / cap) * 100) : 0;
  const bad = ["encumbered", "heavily", "over", "immobile"].includes(load.status);
  const modes = D.ENCUMBRANCE_MODES.map(
    (mode) =>
      `<option value="${mode}" ${load.mode === mode ? "selected" : ""}>${esc(ctx, { off: t(ctx, "Disattivato", "Off"), standard: t(ctx, "Standard (SRD 2024)", "Standard (SRD 2024)"), variant: t(ctx, "Variante (regola della casa)", "Variant (house rule)") }[mode])}</option>`,
  ).join("");
  const excluded = load.excluded
    .map((entry) => {
      const row = D.rowById(actor, entry.id);
      return row
        ? `<li>${name(ctx, row)}: ${kg(ctx, entry.kg)} kg ${t(ctx, "esclusi (pesa sempre", "excluded (always weighs")} ${kg(ctx, D.unitWeight(row))} kg)</li>`
        : "";
    })
    .join("");
  return `<div class="invp-stat invp-load${bad ? " is-bad" : ""}" data-invp-load="${esc(ctx, load.status)}"><span class="invp-stat-label">${t(ctx, "Peso trasportato", "Carried weight")}</span><strong><span data-invp-weight>${kg(ctx, load.weightKg)}</span>${cap != null && load.mode !== "off" ? ` <small>/ ${kg(ctx, cap)} kg</small>` : " <small>kg</small>"}</strong>${load.mode !== "off" && cap ? `<span class="invp-bar" aria-hidden="true"><span style="width:${ratio.toFixed(1)}%"></span></span>` : ""}<small>${load.incomplete ? t(ctx, "Peso incompleto: alcuni oggetti non hanno peso registrato.", "Weight incomplete: some items have no recorded weight.") + " " : ""}${load.mode === "off" ? t(ctx, "Ingombro disattivato: solo conteggio.", "Encumbrance off: count only.") : `<span data-invp-load-status>${esc(ctx, ctx.label(status))}</span> · ${t(ctx, "Velocità", "Speed")} <strong data-invp-speed>${Number.isFinite(speed) ? kg(ctx, speed) : "—"} m</strong>`}</small>${load.reason ? `<p class="invp-reason" data-invp-load-reason>${esc(ctx, ctx.label(load.reason))} <small>${esc(ctx, sourceText(ctx, load.source))}</small></p>` : ""}${editable ? "" : `<small>${t(ctx, "Ingombro", "Encumbrance")}: ${esc(ctx, D.modeName(load.mode, ctx.lang))}</small>`}<details class="invp-details invp-rule"${viewOf(actor.id).ruleOpen ? " open" : ""}><summary>${editable ? `${t(ctx, "Regola d’ingombro", "Encumbrance rule")}: ${esc(ctx, D.modeName(load.mode, ctx.lang))}` : t(ctx, "Capacità e regola", "Capacity and rule")}</summary>${
    // Final review F10 (D&D Beyond: the encumbrance rule is a character setting, not a
    // control over the item list): the choice sits with its rule, folded.
    editable
      ? `<label class="field invp-inline-field"><span>${t(ctx, "Ingombro", "Encumbrance")}</span><select data-invp-encumbrance>${modes}</select></label><label class="invp-check"><input type="checkbox" data-invp-ignore-coins ${load.ignoreCoins ? "checked" : ""}> ${t(ctx, "Ignora il peso delle monete", "Ignore coin weight")}</label>`
      : ""
  }<ul><li>${t(ctx, "Trasportare", "Carry")}: ${cap != null ? kg(ctx, cap) + " kg (For × 7,5 kg)" : "—"}</li><li>${t(ctx, "Trascinare, sollevare, spingere", "Drag, lift, push")}: ${load.dragKg != null ? kg(ctx, load.dragKg) + " kg (For × 15 kg)" : "—"}</li>${load.mode === "variant" ? `<li>${t(ctx, "Variante", "Variant")}: ${kg(ctx, load.encumberedKg)} kg −3 m · ${kg(ctx, load.heavyKg)} kg −6 m</li>` : ""}<li>${t(ctx, "Monete", "Coins")}: ${kg(ctx, load.coinsKg)} kg${load.ignoreCoins ? " · " + t(ctx, "ignorate", "ignored") : ""}</li>${excluded}</ul><p class="muted">${esc(ctx, sourceText(ctx, D.SOURCES.carrying))} · ${t(ctx, "La variante non è una regola SRD: è l’opzione facoltativa di D&D Beyond.", "The variant is not an SRD rule: it is D&D Beyond's optional setting.")}</p></details></div>`;
}
function renderAttunementStat(ctx, actor) {
  const attuned = D.attunedRows(actor);
  const slots = Array.from({ length: D.ATTUNEMENT_LIMIT }, (_, i) => attuned[i]);
  return `<div class="invp-stat invp-attune-stat"><span class="invp-stat-label">${t(ctx, "Sintonia", "Attunement")}</span><strong data-invp-attuned-count>${attuned.length} <small>/ ${D.ATTUNEMENT_LIMIT}</small></strong><span class="invp-pips" aria-hidden="true">${slots.map((row) => `<span class="${row ? "on" : ""}"></span>`).join("")}</span><small>${attuned.map((row) => name(ctx, row)).join(", ") || t(ctx, "Nessun oggetto in sintonia", "No attuned items")}</small>${btn(ctx, 'data-invp-filter-set="attunement"', t(ctx, "Gestisci sintonia", "Manage attunement"))}</div>`;
}
function renderCoinsStat(ctx, actor, editable) {
  return `<div class="invp-stat invp-coins-stat"><span class="invp-stat-label">${t(ctx, "Monete", "Coins")}</span><strong class="invp-coins-line" data-invp-coins>${esc(ctx, coinsText(ctx, actor))}</strong><small>${t(ctx, "Valore", "Value")} ${esc(ctx, formatCp(coinsValue(purseOf(actor)), ctx.lang))}${D.currenciesOf(ctx.state).length ? " + " + t(ctx, "valute locali", "local currencies") : ""}</small>${editable || ctx.role === "dm" ? btn(ctx, 'data-invp="coins"', `${ctx.icon("coins")} ${t(ctx, "Gestisci monete", "Manage coins")}`) : ""}</div>`;
}
function renderSetsStat(ctx, actor, editable) {
  const sets = D.weaponSetsOf(actor);
  if (!sets.melee && !sets.ranged) return "";
  const slot = (key, text) => {
    const row = sets[key];
    const active = sets.active === key;
    return `<li class="${active ? "is-active" : ""}" data-invp-set="${key}"${active ? ' aria-current="true"' : ""}><span>${text}</span><strong>${row ? name(ctx, row) : "—"}</strong>${active ? `<em>${t(ctx, "in mano", "in hand")}</em>` : ""}</li>`;
  };
  return `<div class="invp-stat invp-sets-stat"><span class="invp-stat-label">${t(ctx, "Set d’armi", "Weapon sets")}</span><ul class="invp-sets">${slot("melee", t(ctx, "Mischia", "Melee"))}${slot("ranged", t(ctx, "Distanza", "Ranged"))}</ul>${editable ? btn(ctx, 'data-invp="swap"', `${ctx.icon("swords")} ${t(ctx, "Cambia set", "Swap set")}`) : ""}</div>`;
}
function badges(ctx, actor, row) {
  const out = [];
  if (row.unidentified)
    out.push(
      `<span class="badge invp-badge-unknown">${t(ctx, "Non identificato", "Unidentified")}</span>`,
    );
  if (row.equipped)
    out.push(`<span class="badge invp-badge-on">${t(ctx, "Equipaggiato", "Equipped")}</span>`);
  if (row.attuned)
    out.push(`<span class="badge invp-badge-attuned">${t(ctx, "In sintonia", "Attuned")}</span>`);
  else if (D.needsAttunement(row))
    out.push(`<span class="badge">${t(ctx, "Richiede sintonia", "Requires attunement")}</span>`);
  const rarity = D.rarityOf(row);
  if (rarity)
    out.push(
      `<span class="badge invp-rarity-${rarity}">${esc(ctx, ctx.label(RARITY[rarity]))}</span>`,
    );
  if (row.custom?.material)
    out.push(`<span class="badge">${esc(ctx, ctx.label(MATERIAL[row.custom.material]))}</span>`);
  const sets = D.weaponSetsOf(actor);
  if (sets.melee?.id === row.id || sets.ranged?.id === row.id)
    out.push(
      `<span class="badge">${sets.melee?.id === row.id ? t(ctx, "Set mischia", "Melee set") : t(ctx, "Set distanza", "Ranged set")}</span>`,
    );
  return out.join(" ");
}
function rowMeta(ctx, actor, row, { showPath = false } = {}) {
  const parts = [`×${row.quantity}`];
  const unit = D.unitWeight(row);
  parts.push(
    unit == null ? t(ctx, "peso non registrato", "weight not recorded") : `${kg(ctx, unit)} kg`,
  );
  if (row.charges && !row.unidentified)
    parts.push(
      `<span data-invp-charges="${esc(ctx, row.id)}">${t(ctx, "Cariche", "Charges")} ${row.charges.value}/${row.charges.max}</span>`,
    );
  if (D.isAmmunition(row)) parts.push(t(ctx, "munizioni", "ammunition"));
  if (row.location === "ground") parts.push(t(ctx, "A terra", "On the ground"));
  if (row.availableInForm === false)
    parts.push(t(ctx, "Non disponibile nella forma", "Unavailable in this form"));
  if (showPath) {
    const path = D.pathOf(actor, row);
    parts.push(
      path.length
        ? `${t(ctx, "in", "in")} ${path.map((p) => name(ctx, p)).join(" › ")}`
        : t(ctx, "addosso", "carried"),
    );
  }
  if (row.custom?.notes) parts.push(`<em>${esc(ctx, row.custom.notes)}</em>`);
  return parts.join(" · ");
}
function libraryButton(ctx, row) {
  if (!row.homebrewRef) return "";
  if (!homebrewAvailability(ctx.state, row.homebrewRef, {}, ctx.role).readable)
    return `<span class="muted">${t(ctx, "Fonte non disponibile", "Source unavailable")}</span>`;
  return btn(
    ctx,
    `data-character-action="library" data-library-kind="inventory" data-library-instance="${esc(ctx, row.id)}"`,
    t(ctx, "Origine e revisioni", "Source and revisions"),
  );
}
function primaryAction(ctx, actor, row, editable) {
  if (!editable) return "";
  const id = esc(ctx, row.id);
  if (row.charges?.lastCharge === "pending")
    return btn(
      ctx,
      `data-invp="last-charge" data-invp-id="${id}"`,
      `${ctx.icon("dice")} ${t(ctx, "Ultima carica: tira 1d20", "Last charge: roll 1d20")}`,
      "primary",
    );
  if (D.pendingDawns(ctx.state, row))
    return btn(
      ctx,
      `data-invp="recharge" data-invp-id="${id}"`,
      `${ctx.icon("dice")} ${t(ctx, "Ricarica all’alba", "Dawn recharge")} (${esc(ctx, row.charges.regain.replace("+", " + "))})`,
      "primary",
    );
  if (D.activitiesOf(row).length)
    return btn(
      ctx,
      `data-invp="use" data-invp-id="${id}" title="${t(ctx, "Maiusc+clic: attività principale", "Shift+click: primary activity")}"`,
      t(ctx, "Usa", "Use"),
      "primary",
    );
  // C7: the potion's cost follows the campaign's rule; a spent resource greys it out with
  // its reason. A potion on the ground offers «Registra raccolto» instead (the remedy).
  if (row.healing && row.location !== "ground") {
    const reason = D.potionBlock(ctx.state, actor, row);
    const why0 = whyId("drink", actor.id, row.id);
    return (
      btn(
        ctx,
        `data-character-action="use-healing" data-item="${id}"${off(why0, reason)}`,
        t(ctx, "Bevi", "Drink"),
        "primary",
      ) + why(ctx, why0, reason)
    );
  }
  if (row.location === "ground")
    return btn(
      ctx,
      `data-character-action="pickup-item" data-item="${id}"`,
      t(ctx, "Registra raccolto", "Record picked up"),
    );
  if (D.isEquippable(row)) {
    const reason =
      row.quantity < 1
        ? L(
            "Quantità zero: non c’è niente da equipaggiare. Correggi la quantità da «Altro».",
            "Quantity zero: there is nothing to equip. Correct the quantity from “More”.",
          )
        : null;
    const why0 = whyId("equip", actor.id, row.id);
    return (
      btn(
        ctx,
        `data-invp="equip" data-invp-id="${id}"${off(why0, reason)}`,
        row.equipped ? t(ctx, "Riponi", "Unequip") : t(ctx, "Equipaggia", "Equip"),
      ) + why(ctx, why0, reason)
    );
  }
  return "";
}
// dnd5e inventory columns (PG-64): the chosen ones beside the name, in a fixed order.
function columnCells(ctx, row, view) {
  const cols = COLUMNS.filter((c) => view?.columns?.has(c));
  if (!cols.length) return "";
  const cell = (col, text, label) =>
    `<span class="invp-col" data-invp-col="${col}"><small>${label}</small>${text}</span>`;
  return `<div class="invp-cols">${cols
    .map((col) => {
      if (col === "quantity") return cell(col, `×${row.quantity}`, t(ctx, "Qtà", "Qty"));
      if (col === "weight") {
        const unit = D.unitWeight(row);
        return cell(col, unit == null ? "—" : `${kg(ctx, unit)} kg`, t(ctx, "Peso", "Weight"));
      }
      if (col === "value")
        return cell(
          col,
          Number.isFinite(row.value) && !row.unidentified
            ? esc(ctx, formatCp(row.value, ctx.lang))
            : "—",
          t(ctx, "Valore", "Value"),
        );
      return cell(
        col,
        row.charges && !row.unidentified ? `${row.charges.value}/${row.charges.max}` : "—",
        t(ctx, "Cariche", "Charges"),
      );
    })
    .join("")}</div>`;
}
function renderRow(ctx, actor, row, editable, { depth = 0, showPath = false } = {}) {
  const id = esc(ctx, row.id);
  const icon = D.isAmmunition(row)
    ? "flag"
    : row.healing
      ? "dice"
      : D.isWeapon(row)
        ? "sword"
        : D.isShield(row)
          ? "shield"
          : row.charges
            ? "light"
            : "bag";
  const secret = D.secretOf(ctx.state, row, ctx.role);
  return `<article class="invp-row" data-invp-row="${id}" data-context-menu="${name(ctx, row)}" style="--depth:${depth}"${editable && row.location !== "ground" ? ' draggable="true"' : ""}><div class="invp-row-icon" aria-hidden="true">${ctx.icon(icon)}</div><div class="invp-row-main"><strong class="invp-row-name">${name(ctx, row)}</strong>${secret ? ` <span class="invp-secret">(${t(ctx, "in realtà", "actually")}: ${esc(ctx, ctx.label(secret.name))})</span>` : ""} ${badges(ctx, actor, row)}<p class="invp-row-meta">${rowMeta(ctx, actor, row, { showPath })}</p></div>${columnCells(ctx, row, viewOf(actor.id))}<div class="invp-row-actions">${btn(ctx, `data-character-action="detail-item" data-item="${id}"`, t(ctx, "Dettagli", "Details"))}${libraryButton(ctx, row)}${primaryAction(ctx, actor, row, editable)}${editable || (ctx.role === "dm" && row.unidentified) ? btn(ctx, `data-invp="menu" data-invp-id="${id}" aria-haspopup="dialog" aria-label="${t(ctx, "Altre azioni", "More actions")}: ${name(ctx, row)}"`, `${ctx.icon("menu")}<span class="invp-more-text">${t(ctx, "Altro", "More")}</span>`) : ""}</div></article>`;
}
function renderContainer(ctx, actor, row, editable, depth, view) {
  const id = esc(ctx, row.id);
  const cap = D.capacityOf(actor, row, ctx.state);
  const collapsed = view.collapsed.has(row.id);
  const coins = D.containerCoins(row);
  const custom = Object.entries(D.containerCustomCoins(row))
    .filter(([, n]) => n > 0)
    .map(([cid, n]) => {
      const def = D.currenciesOf(ctx.state).find((c) => c.id === cid);
      return `${n} ${ctx.label(def?.abbr ?? cid)}`;
    });
  const coinText = [isEmptyCoins(coins) ? "" : formatCoins(coins, ctx.lang), ...custom]
    .filter(Boolean)
    .join(" · ");
  const inner = D.sortRows(D.childrenOf(actor, row.id), view.sort, ctx.lang)
    .map((child) =>
      D.isContainer(child)
        ? renderContainer(ctx, actor, child, editable, depth + 1, view)
        : renderRow(ctx, actor, child, editable, { depth: depth + 1 }),
    )
    .join("");
  const ratio = cap.capacity ? Math.min(100, (cap.used / cap.capacity) * 100) : 0;
  return `<section class="invp-container${cap.over ? " is-over" : ""}" data-invp-container="${id}" style="--depth:${depth}"><header class="invp-container-head" data-invp-drop="${id}"><button type="button" class="invp-toggle" data-invp="toggle" data-invp-id="${id}" aria-expanded="${!collapsed}" aria-label="${collapsed ? t(ctx, "Apri", "Open") : t(ctx, "Chiudi", "Close")}: ${name(ctx, row)}">${collapsed ? "▸" : "▾"}</button><div class="invp-container-main"><strong>${name(ctx, row)}</strong> ${badges(ctx, actor, row)}<p class="invp-row-meta"><span data-invp-capacity="${id}">${kg(ctx, cap.used)}${cap.capacity ? ` / ${kg(ctx, cap.capacity)}` : ""} kg</span>${cap.incomplete ? " · " + t(ctx, "peso incompleto", "weight incomplete") : ""}${cap.over ? ` · <strong class="invp-over" data-invp-over>${t(ctx, "Capacità superata", "Capacity exceeded")}</strong>` : ""}${row.container.fixedWeight ? ` · <span data-invp-excluded>${t(ctx, "Peso escluso: pesa sempre", "Weight excluded: always weighs")} ${kg(ctx, D.unitWeight(row))} kg</span>` : ""}${coinText ? ` · ${t(ctx, "monete", "coins")} <span data-invp-container-coins="${id}">${esc(ctx, coinText)}</span>` : ""}${row.equipped ? " · " + t(ctx, "indossato", "worn") : ""}</p>${cap.capacity ? `<span class="invp-bar${cap.over ? " is-over" : ""}" aria-hidden="true"><span style="width:${ratio.toFixed(1)}%"></span></span>` : ""}</div><div class="invp-row-actions">${btn(ctx, `data-character-action="detail-item" data-item="${id}"`, t(ctx, "Dettagli", "Details"))}${editable ? btn(ctx, `data-invp="menu" data-invp-id="${id}" aria-haspopup="dialog" aria-label="${t(ctx, "Altre azioni", "More actions")}: ${name(ctx, row)}"`, `${ctx.icon("menu")}<span class="invp-more-text">${t(ctx, "Altro", "More")}</span>`) : ""}</div></header><div class="invp-container-body"${collapsed ? " hidden" : ""}>${inner || `<p class="muted invp-empty">${t(ctx, "Vuoto", "Empty")}</p>`}</div></section>`;
}
function renderList(ctx, actor, editable, view) {
  const rows = D.rowsOf(actor);
  if (!rows.length)
    return `<p class="empty-state">${t(ctx, "Lo zaino è vuoto. Aggiungi ciò che possiedi già.", "The backpack is empty. Add what you already own.")}</p>`;
  if (D.filtering(view) || !view.grouped) {
    const matches = D.sortRows(
      rows.filter((row) => D.matchesFilter(actor, row, view, ctx.lang)),
      view.sort,
      ctx.lang,
    );
    return matches.length
      ? `<div class="invp-flat" data-invp-results="${matches.length}">${matches.map((row) => renderRow(ctx, actor, row, editable, { showPath: true })).join("")}</div>`
      : `<p class="empty-state" data-invp-no-results>${t(ctx, "Nessun oggetto corrisponde alla ricerca.", "No items match your search.")}</p>`;
  }
  const top = D.sortRows(
    rows.filter((row) => !D.parentOf(actor, row)),
    view.sort,
    ctx.lang,
  );
  return `<div class="invp-tree"><section class="invp-root"><header class="invp-container-head invp-root-head" data-invp-drop="root"><strong>${t(ctx, "Addosso", "Carried")}</strong><span class="muted">${t(ctx, "Trascina qui per togliere da un contenitore", "Drop here to take out of a container")}</span></header>${top
    .map((row) =>
      D.isContainer(row)
        ? renderContainer(ctx, actor, row, editable, 0, view)
        : renderRow(ctx, actor, row, editable),
    )
    .join("")}</section></div>`;
}
function renderToolbar(ctx, actor, view) {
  return `<div class="invp-toolbar" role="search"><label class="field invp-search"><span>${t(ctx, "Cerca nell’inventario", "Search inventory")}</span><input type="search" data-invp-search value="${esc(ctx, view.query)}" autocomplete="off"></label><div class="invp-filters" role="group" aria-label="${t(ctx, "Filtri", "Filters")}">${D.FILTERS.map((id) => `<button type="button" class="invp-chip${view.filter === id ? " active" : ""}" data-invp-filter="${id}" aria-pressed="${view.filter === id}">${esc(ctx, ctx.label(FILTER_LABELS[id]))}</button>`).join("")}</div><details class="invp-view"${view.optionsOpen ? " open" : ""}><summary>${esc(ctx, viewSummary(ctx, view))}</summary><div class="invp-toolbar-row"><label class="field invp-inline-field"><span>${t(ctx, "Rarità", "Rarity")}</span><select data-invp-rarity><option value="">${t(ctx, "Qualsiasi", "Any")}</option>${D.RARITIES.map((r) => `<option value="${r}" ${view.rarity === r ? "selected" : ""}>${esc(ctx, ctx.label(RARITY[r]))}</option>`).join("")}</select></label><label class="invp-check"><input type="checkbox" data-invp-grouped ${view.grouped ? "checked" : ""}> ${t(ctx, "Raggruppa per contenitore", "Group by container")}</label><label class="field invp-inline-field"><span>${t(ctx, "Ordina per", "Sort by")}</span><select data-invp-sort>${D.SORTS.map((id) => `<option value="${id}" ${view.sort === id ? "selected" : ""}>${esc(ctx, ctx.label(SORT_LABELS[id]))}</option>`).join("")}</select></label><div class="invp-columns" role="group" aria-label="${t(ctx, "Colonne", "Columns")}"><span class="invp-columns-label">${t(ctx, "Colonne", "Columns")}</span>${COLUMNS.map((id) => `<button type="button" class="invp-chip${view.columns.has(id) ? " active" : ""}" data-invp="column" data-invp-id="${id}" data-invp-column="${id}" aria-pressed="${view.columns.has(id)}">${esc(ctx, ctx.label(COLUMN_LABELS[id]))}</button>`).join("")}</div></div></details></div>`;
}
// F10 (D&D Beyond: list options behind one control): the folded view options name what is
// not at its default, so a filtered list never hides why.
function viewSummary(ctx, view) {
  const parts = [];
  if (view.rarity) parts.push(`${t(ctx, "Rarità", "Rarity")}: ${ctx.label(RARITY[view.rarity])}`);
  if (view.sort && view.sort !== "manual")
    parts.push(`${t(ctx, "Ordine", "Order")}: ${ctx.label(SORT_LABELS[view.sort])}`);
  if (!view.grouped) parts.push(t(ctx, "senza contenitori", "no containers"));
  return `${t(ctx, "Visualizzazione", "View")}${parts.length ? " · " + parts.join(" · ") : `: ${t(ctx, "rarità, ordine, colonne", "rarity, order, columns")}`}`;
}
const SORT_LABELS = {
  manual: L("Ordine dello zaino", "Pack order"),
  name: L("Nome", "Name"),
  weight: L("Peso", "Weight"),
  value: L("Valore", "Value"),
  rarity: L("Rarità", "Rarity"),
};
const COLUMN_LABELS = {
  quantity: L("Quantità", "Quantity"),
  weight: L("Peso", "Weight"),
  value: L("Valore", "Value"),
  charges: L("Cariche", "Charges"),
};
function renderAttunementPanel(ctx, actor, editable) {
  const attuned = D.attunedRows(actor);
  const slots = Array.from({ length: D.ATTUNEMENT_LIMIT }, (_, i) => attuned[i]);
  const requiring = D.rowsOf(actor).filter((row) => D.needsAttunement(row) && !row.attuned);
  return `<section class="invp-attune" aria-labelledby="invp-attune-title-${esc(ctx, actor.id)}"><h3 id="invp-attune-title-${esc(ctx, actor.id)}">${t(ctx, "Oggetti in sintonia", "Attuned items")}</h3><ol class="invp-slots">${slots
    .map(
      (row, i) =>
        `<li class="invp-slot${row ? " is-filled" : ""}" data-invp-slot="${i + 1}">${row ? `<strong>${name(ctx, row)}</strong>${editable ? btn(ctx, `data-invp="unattune" data-invp-id="${esc(ctx, row.id)}"`, t(ctx, "Termina sintonia", "End attunement")) : ""}` : `<span class="muted">${t(ctx, "Posto libero: scegli un oggetto qui sotto", "Free slot: choose an item below")}</span>`}</li>`,
    )
    .join(
      "",
    )}</ol>${requiring.length ? `<h4>${t(ctx, "Richiedono sintonia", "Require attunement")}</h4><ul class="invp-attune-list">${requiring.map((row) => `<li><span>${name(ctx, row)}</span>${editable ? btn(ctx, `data-invp="attune" data-invp-id="${esc(ctx, row.id)}"`, t(ctx, "Sintonizza", "Attune"), "primary") : ""}</li>`).join("")}</ul>` : ""}<p class="muted">${t(ctx, "Sintonia durante un riposo breve dedicato all’oggetto; al massimo tre oggetti, un quarto tentativo fallisce.", "Attune during a Short Rest focused on the item; three items at most, a fourth attempt fails.")} ${esc(ctx, sourceText(ctx, D.SOURCES.attunement))}</p></section>`;
}
function offerLine(ctx, offer) {
  // A container shows what it carries (INV-08): the recipient answers knowing the contents.
  const parts = offer.items.map((item) => esc(ctx, D.itemsText([item], ctx.lang)));
  if (!isEmptyCoins(offer.coins)) parts.push(esc(ctx, formatCoins(offer.coins, ctx.lang)));
  for (const [id, n] of Object.entries(offer.customCoins ?? {})) {
    const def = D.currenciesOf(ctx.state).find((c) => c.id === id);
    parts.push(`${n} ${esc(ctx, ctx.label(def?.abbr ?? id))}`);
  }
  return parts.join(" · ");
}
function offerText(state, offer, lang) {
  const parts = offer.items.map((item) => D.itemsText([item], lang));
  if (!isEmptyCoins(offer.coins)) parts.push(formatCoins(offer.coins, lang));
  for (const [id, n] of Object.entries(offer.customCoins ?? {})) {
    const def = D.currenciesOf(state).find((c) => c.id === id);
    parts.push(`${n} ${D.label(def?.abbr ?? id, lang)}`);
  }
  return parts.join(" · ");
}
function renderOffers(ctx, actor) {
  const offers = D.offersFor(ctx.state, actor.id, ctx.role);
  const pending = offers.filter((o) => o.status === "pending");
  const closed = offers
    .filter((o) => o.status !== "pending")
    .slice(-4)
    .reverse();
  if (!offers.length) return "";
  const status = {
    accepted: L("accettata", "accepted"),
    declined: L("rifiutata", "declined"),
    withdrawn: L("ritirata", "withdrawn"),
  };
  const row = (offer) => {
    const incoming = offer.to === actor.id;
    const other = ctx.state.actors[incoming ? offer.from : offer.to];
    const problems = D.offerProblems(ctx.state, offer);
    const canAccept = incoming && D.canAnswerOffer(ctx.state, offer, ctx.role);
    const canWithdraw = !incoming && D.canWithdrawOffer(ctx.state, offer, ctx.role);
    return `<li class="invp-offer" data-invp-offer="${esc(ctx, offer.id)}"><div><strong>${incoming ? t(ctx, "Da", "From") : t(ctx, "A", "To")} ${esc(ctx, other?.name ?? "—")}</strong><p>${offerLine(ctx, offer)}</p>${problems.length ? `<p class="error" id="${whyId("offer", offer.id)}">${problems.map((p) => esc(ctx, ctx.label(p))).join(" ")} ${t(ctx, "Rifiuta l’offerta o chiedi a chi la manda di rifarla.", "Decline the offer or ask the sender to make it again.")}</p>` : ""}</div><div class="invp-row-actions">${canAccept ? btn(ctx, `data-invp="offer-accept" data-invp-id="${esc(ctx, offer.id)}"${problems.length ? ` disabled aria-describedby="${whyId("offer", offer.id)}"` : ""}`, t(ctx, "Accetta", "Accept"), "primary") + btn(ctx, `data-invp="offer-decline" data-invp-id="${esc(ctx, offer.id)}"`, t(ctx, "Rifiuta", "Decline")) : ""}${canWithdraw ? btn(ctx, `data-invp="offer-withdraw" data-invp-id="${esc(ctx, offer.id)}"`, t(ctx, "Ritira", "Withdraw")) : ""}${!canAccept && !canWithdraw ? `<span class="muted">${t(ctx, "In attesa di chi gioca il destinatario", "Waiting for the recipient's player")}</span>` : ""}</div></li>`;
  };
  return `<section class="invp-offers" aria-labelledby="invp-offers-${esc(ctx, actor.id)}"><h3 id="invp-offers-${esc(ctx, actor.id)}">${t(ctx, "Offerte", "Offers")}${pending.length ? ` <span class="badge">${pending.length}</span>` : ""}</h3>${pending.length ? `<ul class="invp-offer-list">${pending.map(row).join("")}</ul>` : `<p class="muted">${t(ctx, "Nessuna offerta in attesa.", "No pending offers.")}</p>`}${closed.length ? `<details class="invp-details"><summary>${t(ctx, "Offerte concluse", "Closed offers")}</summary><ul class="invp-closed">${closed.map((o) => `<li>${esc(ctx, ctx.state.actors[o.from]?.name)} → ${esc(ctx, ctx.state.actors[o.to]?.name)}: ${offerLine(ctx, o)} · <em>${esc(ctx, ctx.label(status[o.status]))}</em></li>`).join("")}</ul></details>` : ""}</section>`;
}
function renderRecovery(ctx, actor, editable) {
  const recovery = D.ammoRecovery(ctx.state, actor.id);
  if (!recovery) return "";
  const lines = recovery.rows
    .map(
      (r) =>
        `${esc(ctx, ctx.label(r.name))}: ${t(ctx, "usate", "used")} ${r.used} → ${t(ctx, "recuperi", "recover")} <strong>${r.recover}</strong>, ${t(ctx, "perse", "lost")} ${r.lost}`,
    )
    .join("<br>");
  return `<section class="invp-recovery" data-invp-recovery><h3>${t(ctx, "Munizioni dopo lo scontro", "Ammunition after the fight")}</h3><p>${lines}</p><p class="muted">${t(ctx, "Dopo uno scontro puoi spendere 1 minuto per recuperare metà delle munizioni usate (per difetto); il resto è perso.", "After a fight you can spend 1 minute to recover half the ammunition used (round down); the rest is lost.")} ${esc(ctx, sourceText(ctx, D.SOURCES.ammunition))}</p>${editable ? btn(ctx, 'data-invp="recover"', t(ctx, "Recupera (1 minuto)", "Recover (1 minute)"), "primary") : ""}</section>`;
}
function renderLedger(ctx, actor) {
  const rows = (D.sliceOf(ctx.state)?.ledger ?? [])
    .filter((entry) => entry.actorIds?.includes(actor.id))
    .slice(-8)
    .reverse();
  if (!rows.length) return "";
  const time = (iso) =>
    new Date(iso).toLocaleTimeString(ctx.lang === "it" ? "it-IT" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  return `<details class="invp-details invp-ledger"><summary>${t(ctx, "Movimenti dell’inventario", "Inventory history")}</summary><ol>${rows.map((entry) => `<li><small>${time(entry.at)} · ${entry.by === "dm" ? "DM" : t(ctx, "Giocatore", "Player")}</small>${esc(ctx, ctx.label(entry.text))}${entry.reason ? `<small>${t(ctx, "Motivo", "Reason")}: ${esc(ctx, entry.reason)}</small>` : ""}</li>`).join("")}</ol></details>`;
}
function renderLastHealing(ctx, actor) {
  const r = actor.lastHealing;
  if (!r) return "";
  return `<section class="invp-healing"><h3>${t(ctx, "Ultima cura", "Latest healing")}</h3><p><strong>${r.faces[0]} + ${r.faces[1]} + 2 = ${r.total}</strong> · ${t(ctx, "PF recuperati", "HP recovered")}: ${r.applied}</p><p class="muted">${r.before} → ${r.after} ${t(ctx, "PF", "HP")}${r.overflow ? " · " + r.overflow + " " + t(ctx, "oltre il massimo, non applicati", "over maximum, not applied") : ""} · ${r.mode === "physical" ? t(ctx, "Dadi fisici", "Physical dice") : t(ctx, "Dadi digitali", "Digital dice")}</p></section>`;
}
export function renderTab(ctx, effective) {
  const actor = canonical(ctx, effective);
  if (!actor) return "";
  const editable = canEdit(ctx, actor);
  const view = viewOf(actor.id);
  return `<section class="panel invp" data-invp-actor="${esc(ctx, actor.id)}" aria-labelledby="invp-title-${esc(ctx, actor.id)}"><div class="section-heading"><h2 id="invp-title-${esc(ctx, actor.id)}">${t(ctx, "Inventario", "Inventory")}</h2><div class="toolbar">${editable ? btn(ctx, 'data-invp="add"', `${ctx.icon("plus")} ${t(ctx, "Aggiungi oggetto", "Add item")}`, "primary") + btn(ctx, 'data-character-action="library" data-library-kind="inventory"', t(ctx, "Cerca nella Biblioteca", "Browse library")) : ""}${undoBox(ctx)}</div></div><div class="invp-summary">${renderLoad(ctx, actor, editable)}${renderAttunementStat(ctx, actor)}${renderCoinsStat(ctx, actor, editable)}${renderSetsStat(ctx, actor, editable)}</div>${renderRecovery(ctx, actor, editable)}${renderOffers(ctx, actor)}${renderToolbar(ctx, actor, view)}${view.filter === "attunement" ? renderAttunementPanel(ctx, actor, editable) : ""}${renderList(ctx, actor, editable, view)}${renderLastHealing(ctx, actor)}${renderLedger(ctx, actor)}</section>`;
}

// ---------------------------------------------------------------- dialogs

function openMenu(ctx, actor, row) {
  const editable = canEdit(ctx, actor);
  const items = [];
  const add = (action, text) =>
    items.push(`<button type="button" class="button" data-invp-menu="${action}">${text}</button>`);
  if (editable) {
    if (D.activitiesOf(row).length) add("use", t(ctx, "Usa…", "Use…"));
    if (D.isEquippable(row))
      add("equip", row.equipped ? t(ctx, "Riponi", "Unequip") : t(ctx, "Equipaggia", "Equip"));
    if (row.attuned) add("unattune", t(ctx, "Termina sintonia…", "End attunement…"));
    else if (D.needsAttunement(row)) add("attune", t(ctx, "Sintonizza…", "Attune…"));
    if (D.isWeapon(row) && row.weapon)
      add(
        "set",
        row.weapon.type === "ranged"
          ? t(ctx, "Imposta nel set a distanza", "Put in the ranged set")
          : t(ctx, "Imposta nel set da mischia", "Put in the melee set"),
      );
    if (row.weapon?.ammunition) add("ammo", t(ctx, "Scegli le munizioni…", "Choose ammunition…"));
    if (!D.isContainer(row) && row.quantity > 1)
      add("split", t(ctx, "Dividi la pila…", "Split stack…"));
    add("move", t(ctx, "Sposta, passa o copia…", "Move, give or copy…"));
    if (D.isContainer(row))
      add("container-coins", t(ctx, "Monete nel contenitore…", "Coins in this container…"));
    add("customize", t(ctx, "Personalizza…", "Customise…"));
    add("quantity", t(ctx, "Correggi quantità…", "Correct quantity…"));
  }
  if (ctx.role === "dm" && row.unidentified && row.lootId)
    add("identify", t(ctx, "Identifica (DM)", "Identify (DM)"));
  else if (ctx.role === "dm" && editable && actor.visibility !== "private")
    add("hide", t(ctx, "Rendi non identificato (DM)", "Make unidentified (DM)"));
  ctx.dialog(
    D.rowName(row, ctx.lang),
    `<div class="dialog-menu invp-menu">${items.join("")}</div>`,
    { cancelLabel: t(ctx, "Chiudi", "Close") },
  );
  globalThis.document?.querySelectorAll("#dialog [data-invp-menu]").forEach(
    (button) =>
      (button.onclick = () => {
        ctx.closeDialog();
        globalThis.queueMicrotask(() =>
          runRowAction(ctx, actor.id, row.id, button.dataset.invpMenu),
        );
      }),
  );
}
function runRowAction(ctx, actorId, rowId, action, event = null) {
  const actor = ctx.state.actors[actorId];
  const row = D.rowById(actor, rowId);
  if (!row) return;
  const title = (it, en) => ctx.t(it, en);
  switch (action) {
    case "menu":
      return openMenu(ctx, actor, row);
    case "use":
      return openUse(ctx, actor, row, event?.shiftKey ? D.activitiesOf(row)[0]?.id : null);
    case "equip": {
      const done = attempt(ctx, () =>
        commit(
          ctx,
          actor,
          row.equipped
            ? title("Oggetto riposto", "Item unequipped")
            : title("Oggetto equipaggiato", "Item equipped"),
          (draft) => D.setEquipped(draft, actorId, rowId, !row.equipped, ctx.role),
        ),
      );
      const note = done && D.combatEquipNote(ctx.state, actorId, row);
      if (note) ctx.toast(ctx.label(note));
      return done;
    }
    case "attune":
      return openAttune(ctx, actor, row, false);
    case "unattune":
      return openAttune(ctx, actor, row, true);
    case "set":
      return attempt(ctx, () =>
        commit(ctx, actor, title("Set d’armi aggiornato", "Weapon set updated"), (draft) =>
          D.assignWeaponSet(
            draft,
            actorId,
            rowId,
            row.weapon.type === "ranged" ? "ranged" : "melee",
            ctx.role,
          ),
        ),
      );
    case "ammo":
      return openAmmo(ctx, actor, row);
    case "split":
      return openSplit(ctx, actor, row);
    case "move":
      return openMove(ctx, actor, row);
    case "container-coins":
      return openContainerCoins(ctx, actor, row);
    case "customize":
      return openCustomize(ctx, actor, row);
    case "quantity":
      return openQuantity(ctx, actor, row);
    case "identify":
      return attempt(ctx, () =>
        commit(ctx, actor, title("Oggetto identificato", "Item identified"), (draft) =>
          D.identify(draft, actorId, rowId, ctx.role),
        ),
      );
    case "hide":
      return openHide(ctx, actor, row);
    case "recharge":
      return openRecharge(ctx, actor, row);
    case "last-charge":
      return openLastCharge(ctx, actor, row);
    case "toggle": {
      const view = viewOf(actorId);
      if (view.collapsed.has(rowId)) view.collapsed.delete(rowId);
      else view.collapsed.add(rowId);
      pendingFocus = `[data-invp="toggle"][data-invp-id="${cssId(rowId)}"]`;
      return ctx.render();
    }
    default:
      return null;
  }
}
const chargeWord = (ctx, n) =>
  `${n} ${n === 1 ? t(ctx, "carica", "charge") : t(ctx, "cariche", "charges")}`;
const cssId = (value) => globalThis.CSS?.escape?.(value) ?? String(value).replace(/["\\]/g, "\\$&");

function openSplit(ctx, actor, row) {
  ctx.dialog(
    t(ctx, `Dividi: ${D.rowName(row, "it")}`, `Split: ${D.rowName(row, "en")}`),
    `<p>${t(ctx, "Separa una parte in una nuova riga: il totale non cambia.", "Separate part of the stack into a new row: the total does not change.")} (${row.quantity})</p><label class="field"><span>${t(ctx, "Quantità da separare", "Quantity to split off")}</span><input type="number" name="quantity" min="1" max="${row.quantity - 1}" value="${Math.floor(row.quantity / 2)}" required inputmode="numeric"></label>`,
    {
      submitLabel: t(ctx, "Dividi", "Split"),
      onSubmit: (data) => {
        commit(ctx, actor, ctx.t("Pila divisa", "Stack split"), (draft) =>
          D.splitStack(draft, actor.id, row.id, Number(data.get("quantity")), ctx.role),
        );
      },
    },
  );
}
function openMove(ctx, actor, row) {
  const containers = D.rowsOf(actor).filter(
    (c) =>
      D.isContainer(c) &&
      c.id !== row.id &&
      !D.descendantsOf(actor, row.id).some((d) => d.id === c.id),
  );
  const here = D.parentOf(actor, row)?.id ?? "root";
  const targets = D.transferTargets(ctx.state, actor.id, ctx.role);
  const option = (value, text, extra = "") =>
    `<option value="${esc(ctx, value)}" ${extra}>${text}</option>`;
  const inside = [
    here !== "root"
      ? option(
          "self:root",
          t(ctx, "Addosso (fuori dai contenitori)", "Carried (out of containers)"),
        )
      : "",
    ...containers
      .filter((c) => c.id !== here)
      .map((c) => {
        const cap = D.capacityOf(actor, c);
        return option(
          "self:" + c.id,
          `${name(ctx, c)} · ${kg(ctx, cap.used)}${cap.capacity ? "/" + kg(ctx, cap.capacity) : ""} kg`,
        );
      }),
  ].join("");
  const others = targets
    .map((a) =>
      option(
        "actor:" + a.id,
        `${esc(ctx, a.name)} · ${D.isDirectTransfer(ctx.state, actor.id, a.id, ctx.role) ? t(ctx, "passaggio diretto", "direct transfer") : t(ctx, "offerta da accettare", "offer to accept")}`,
      ),
    )
    .join("");
  const dm = ctx.role === "dm";
  ctx.dialog(
    t(ctx, `Sposta: ${D.rowName(row, "it")}`, `Move: ${D.rowName(row, "en")}`),
    `<label class="field"><span>${t(ctx, "Destinazione", "Destination")}</span><select name="target" required>${inside ? `<optgroup label="${t(ctx, "In questo inventario", "In this inventory")}">${inside}</optgroup>` : ""}${others ? `<optgroup label="${t(ctx, "A un’altra creatura", "To another creature")}">${others}</optgroup>` : ""}</select></label><label class="field"><span>${t(ctx, "Quantità", "Quantity")}</span><input type="number" name="quantity" min="1" max="${row.quantity}" value="${row.quantity}" required inputmode="numeric" ${D.isContainer(row) ? "readonly" : ""}></label><fieldset class="invp-fieldset"><legend>${t(ctx, "Modalità", "Mode")}</legend><label class="invp-radio"><input type="radio" name="mode" value="move" checked> ${t(ctx, "Sposta (o offri a chi non controlli)", "Move (or offer to one you do not control)")}</label><label class="invp-radio"><input type="radio" name="mode" value="copy" ${dm ? "" : 'disabled aria-describedby="invp-why-copy"'}> ${t(ctx, "Copia", "Copy")} ${dm ? "" : `<small id="invp-why-copy">— ${t(ctx, "Solo il DM può copiare: una copia crea un oggetto nuovo. Scegli «Sposta» o chiedi al DM.", "Only the DM can copy: a copy creates a new item. Choose “Move” or ask the DM.")}</small>`}</label></fieldset><p class="muted">${t(ctx, "Come in Foundry: trascinando una riga su un contenitore la sposti; Ctrl o Alt la copia (solo DM). Un contenitore si sposta con tutto ciò che contiene.", "As in Foundry: drag a row onto a container to move it; Ctrl or Alt copies (DM only). A container moves with everything inside.")}</p>`,
    {
      submitLabel: t(ctx, "Conferma", "Confirm"),
      onSubmit: (data) => {
        const [kind, id] = String(data.get("target") ?? "").split(":");
        const quantity = Number(data.get("quantity"));
        const mode = data.get("mode");
        if (!kind) throw D.fail("Scegli una destinazione.", "Choose a destination.");
        if (mode === "copy") {
          commit(ctx, actor, ctx.t("Oggetto copiato dal DM", "Item copied by the DM"), (draft) =>
            D.copyItem(
              draft,
              actor.id,
              kind === "actor" ? id : actor.id,
              row.id,
              quantity,
              ctx.role,
            ),
          );
          return;
        }
        if (kind === "self") {
          commit(ctx, actor, ctx.t("Oggetto spostato", "Item moved"), (draft) =>
            D.moveWithin(draft, actor.id, row.id, id === "root" ? null : id, quantity, ctx.role),
          );
          return;
        }
        const target = ctx.state.actors[id];
        const packet = { items: [{ rowId: row.id, quantity }] };
        if (D.isDirectTransfer(ctx.state, actor.id, id, ctx.role)) {
          commit(
            ctx,
            actor,
            ctx.t(`Passato a ${target.name}`, `Given to ${target.name}`),
            (draft) => D.transfer(draft, actor.id, id, packet, ctx.role),
          );
          ctx.toast(ctx.t(`Passato a ${target.name}.`, `Given to ${target.name}.`));
        } else {
          commit(
            ctx,
            actor,
            ctx.t(`Offerta a ${target.name}`, `Offer to ${target.name}`),
            (draft) => D.createOffer(draft, actor.id, id, packet, ctx.role),
          );
          ctx.toast(
            ctx.t(
              `Offerta inviata a ${target.name}: chi lo gioca la accetta o la rifiuta.`,
              `Offer sent to ${target.name}: their player accepts or declines it.`,
            ),
          );
        }
      },
    },
  );
}
function openCustomize(ctx, actor, row) {
  const c = row.custom ?? {};
  ctx.dialog(
    t(ctx, `Personalizza: ${D.rowName(row, "it")}`, `Customise: ${D.rowName(row, "en")}`),
    `<p class="muted">${t(ctx, "Come «Customize» di D&D Beyond: cambia come l’oggetto appare sulla tua scheda. I dati originali restano.", "Like D&D Beyond's Customize: change how the item appears on your sheet. The original data stays.")} ${t(ctx, "Originale", "Original")}: <strong>${esc(ctx, ctx.label(row.name))}</strong>${D.unitWeight({ ...row, custom: null }) != null ? ` · ${kg(ctx, row.weight)} kg` : ""}</p><div class="form-grid"><label class="field"><span>${t(ctx, "Nome mostrato", "Display name")}</span><input name="name" maxlength="100" value="${esc(ctx, c.name ?? "")}"></label><label class="field"><span>${t(ctx, "Peso per unità (kg)", "Weight per unit (kg)")}</span><input name="weightKg" inputmode="decimal" value="${c.weightKg ?? ""}" placeholder="${row.weight ?? ""}"></label><label class="field"><span>${t(ctx, "Costo (mo)", "Cost (gp)")}</span><input name="costGp" inputmode="decimal" value="${c.costCp != null ? c.costCp / 100 : ""}"></label><label class="field"><span>${t(ctx, "Materiale", "Material")}</span><select name="material"><option value="">${t(ctx, "Normale", "Standard")}</option>${D.MATERIALS.map((m) => `<option value="${m}" ${c.material === m ? "selected" : ""}>${esc(ctx, ctx.label(MATERIAL[m]))}</option>`).join("")}</select></label></div><label class="field"><span>${t(ctx, "Note", "Notes")}</span><textarea name="notes" maxlength="500" rows="3">${esc(ctx, c.notes ?? "")}</textarea></label><p class="muted">${t(ctx, "Il materiale è descrittivo: lo SRD 5.2.1 non definisce armi argentate e l’Armatura di adamantio è un oggetto magico. Nessun effetto automatico.", "The material is descriptive: SRD 5.2.1 defines no silvered weapons and Adamantine Armor is a magic item. No automatic effect.")}</p>`,
    {
      submitLabel: t(ctx, "Salva personalizzazione", "Save customisation"),
      onSubmit: (data) => {
        commit(ctx, actor, ctx.t("Oggetto personalizzato", "Item customised"), (draft) =>
          D.customize(
            draft,
            actor.id,
            row.id,
            {
              name: data.get("name"),
              notes: data.get("notes"),
              weightKg: data.get("weightKg"),
              costGp: data.get("costGp"),
              material: data.get("material"),
            },
            ctx.role,
          ),
        );
      },
    },
  );
}
function openQuantity(ctx, actor, row) {
  ctx.dialog(
    t(
      ctx,
      `Correggi quantità: ${D.rowName(row, "it")}`,
      `Correct quantity: ${D.rowName(row, "en")}`,
    ),
    `<p>${t(ctx, "Registra la quantità vera, con il motivo: resta nei movimenti.", "Record the real quantity with a reason: it stays in the history.")} ${t(ctx, "Ora", "Now")}: <strong>${row.quantity}</strong></p><label class="field"><span>${t(ctx, "Quantità corretta", "Correct quantity")}</span><input type="number" name="quantity" min="0" max="99999" value="${row.quantity}" required inputmode="numeric"></label><label class="field"><span>${t(ctx, "Motivo", "Reason")}</span><input name="reason" maxlength="200" required placeholder="${t(ctx, "Es. frecce perse nel fiume", "E.g. arrows lost in the river")}"></label>`,
    {
      submitLabel: t(ctx, "Salva correzione", "Save correction"),
      onSubmit: (data) => {
        commit(ctx, actor, ctx.t("Quantità corretta", "Quantity corrected"), (draft) =>
          D.correctQuantity(
            draft,
            actor.id,
            row.id,
            Number(data.get("quantity")),
            data.get("reason"),
            ctx.role,
          ),
        );
      },
    },
  );
}
function openHide(ctx, actor, row) {
  ctx.dialog(
    t(ctx, "Rendi non identificato", "Make unidentified"),
    `<p>${t(ctx, "Come «Hidden» di Shard: i giocatori vedono solo nome e descrizione apparenti; proprietà, sintonia e cariche restano al DM finché non lo identifichi.", "Like Shard's Hidden: players see only the apparent name and description; properties, attunement and charges stay with the DM until you identify it.")}</p><label class="field"><span>${t(ctx, "Nome apparente", "Apparent name")}</span><input name="apparentName" required maxlength="100" value="${esc(ctx, t(ctx, "Oggetto sconosciuto", "Unknown item"))}"></label><label class="field"><span>${t(ctx, "Descrizione apparente", "Apparent description")}</span><textarea name="apparentDescription" rows="2" maxlength="300"></textarea></label>`,
    {
      submitLabel: t(ctx, "Nascondi identità", "Hide identity"),
      onSubmit: (data) => {
        commit(
          ctx,
          actor,
          ctx.t("Identità nascosta", "Identity hidden"),
          (draft) =>
            D.markUnidentified(
              draft,
              actor.id,
              row.id,
              {
                apparentName: data.get("apparentName"),
                apparentDescription: data.get("apparentDescription"),
              },
              ctx.role,
            ),
          { visibility: "private" },
        );
      },
    },
  );
}
function openAttune(ctx, actor, row, ending) {
  const rests = D.eligibleRests(ctx.state, actor.id);
  const issues = ending ? [] : D.attuneIssues(actor, row);
  const restOptions = rests
    .map(
      (rest, i) =>
        `<option value="${esc(ctx, rest.id)}">${t(ctx, "Riposo breve", "Short rest")} ${i + 1}${rest.campaignId ? "" : " · " + t(ctx, "personale", "personal")}</option>`,
    )
    .join("");
  const attuned = D.attunedRows(actor);
  ctx.dialog(
    ending
      ? t(
          ctx,
          `Termina la sintonia: ${D.rowName(row, "it")}`,
          `End attunement: ${D.rowName(row, "en")}`,
        )
      : t(ctx, `Sintonia: ${D.rowName(row, "it")}`, `Attune: ${D.rowName(row, "en")}`),
    `<p>${ending ? t(ctx, "Terminare volontariamente una sintonia richiede un altro riposo breve dedicato all’oggetto.", "Ending an attunement voluntarily takes another Short Rest focused on the item.") : t(ctx, "La sintonia richiede un riposo breve dedicato solo a questo oggetto, a contatto con esso; se il riposo è interrotto il tentativo fallisce.", "Attuning takes a Short Rest focused only on this item while in contact with it; if the rest is interrupted the attempt fails.")} <small>${esc(ctx, sourceText(ctx, D.SOURCES.attunement))}</small></p><p>${t(ctx, "In sintonia", "Attuned")}: <strong>${attuned.length}/${D.ATTUNEMENT_LIMIT}</strong>${attuned.length ? " · " + attuned.map((r) => name(ctx, r)).join(", ") : ""}</p>${issues.length ? `<p class="error" data-invp-attune-warning>${esc(ctx, ctx.label(issues[0]))}</p>` : ""}<fieldset class="invp-fieldset"><legend>${t(ctx, "Quando", "When")}</legend>${rests.length ? `<label class="invp-radio"><input type="radio" name="method" value="rest" checked> ${t(ctx, "Durante un riposo breve completato", "During a completed Short Rest")}</label><label class="field"><span>${t(ctx, "Riposo", "Rest")}</span><select name="restId">${restOptions}</select></label>` : `<p class="muted">${t(ctx, "Nessun riposo breve completato da usare.", "No completed Short Rest to use.")}</p>`}<label class="invp-radio"><input type="radio" name="method" value="record" ${rests.length ? "" : "checked"}> ${t(ctx, "Registra come già avvenuto (correzione con motivo)", "Record as already done (correction with a reason)")}</label><label class="field"><span>${t(ctx, "Motivo", "Reason")}</span><input name="reason" maxlength="200" placeholder="${t(ctx, "Es. riposo breve alla torre, sessione 12", "E.g. short rest at the tower, session 12")}"></label></fieldset><p>${btn(ctx, 'data-invp-open-rest type="button"', t(ctx, "Inizia un riposo breve…", "Start a Short Rest…"))}</p>`,
    {
      submitLabel: ending
        ? t(ctx, "Termina sintonia", "End attunement")
        : t(ctx, "Sintonizza", "Attune"),
      onSubmit: (data) => {
        const how = {
          method: data.get("method"),
          restId: data.get("restId"),
          reason: data.get("reason"),
        };
        commit(
          ctx,
          actor,
          ending
            ? ctx.t("Sintonia terminata", "Attunement ended")
            : ctx.t("Sintonia registrata", "Attunement recorded"),
          (draft) =>
            ending
              ? D.endAttunement(draft, actor.id, row.id, how, ctx.role)
              : D.attune(draft, actor.id, row.id, how, ctx.role),
        );
      },
    },
  );
  globalThis.document
    ?.querySelector("#dialog [data-invp-open-rest]")
    ?.addEventListener("click", () => {
      ctx.closeDialog();
      globalThis.queueMicrotask(() => ctx.openRest?.(actor.id));
    });
}
function openAmmo(ctx, actor, weapon) {
  const rows = D.ammoRowsFor(actor, weapon);
  const chosen = D.selectedAmmo(actor, weapon);
  ctx.dialog(
    t(ctx, `Munizioni: ${D.rowName(weapon, "it")}`, `Ammunition: ${D.rowName(weapon, "en")}`),
    rows.length
      ? `<p>${t(ctx, "Come la faretra di Solasta: la pila scelta alimenta l’arco; ogni attacco consuma una munizione.", "Like Solasta's quiver: the chosen stack feeds the bow; each attack expends one piece.")} <small>${esc(ctx, sourceText(ctx, D.SOURCES.ammunition))}</small></p><fieldset class="invp-fieldset"><legend>${t(ctx, "Pila", "Stack")}</legend>${rows
          .map(
            (row) =>
              `<label class="invp-radio"><input type="radio" name="ammo" value="${esc(ctx, row.id)}" ${chosen?.id === row.id ? "checked" : ""}> ${name(ctx, row)} ×${row.quantity}${
                D.pathOf(actor, row).length
                  ? ` · ${t(ctx, "in", "in")} ${D.pathOf(actor, row)
                      .map((p) => name(ctx, p))
                      .join(" › ")}`
                  : ""
              }</label>`,
          )
          .join("")}</fieldset>`
      : `<p>${t(ctx, "Nessuna munizione adatta nell’inventario.", "No fitting ammunition in the inventory.")}</p>`,
    rows.length
      ? {
          submitLabel: t(ctx, "Usa queste", "Use these"),
          onSubmit: (data) => {
            commit(ctx, actor, ctx.t("Munizioni scelte", "Ammunition chosen"), (draft) =>
              D.selectAmmo(draft, actor.id, weapon.id, data.get("ammo"), ctx.role),
            );
          },
        }
      : {},
  );
}
function openRecharge(ctx, actor, row) {
  const dice = D.parseFormula(row.charges.regain);
  const pending = D.pendingDawns(ctx.state, row);
  ctx.dialog(
    t(ctx, `Ricarica all’alba: ${D.rowName(row, "it")}`, `Dawn recharge: ${D.rowName(row, "en")}`),
    `<p>${t(ctx, "È passata l’alba nell’orologio della campagna", "Dawn has passed on the campaign clock")}${pending > 1 ? ` (${pending})` : ""}: ${t(ctx, "l’oggetto recupera", "the item regains")} <strong>${esc(ctx, row.charges.regain.replace("+", " + "))}</strong> ${t(ctx, "cariche", "charges")} (${row.charges.value}/${row.charges.max}).</p>${diceFields(ctx, dice)}<p class="muted">${esc(ctx, sourceText(ctx, row.source))} · ${esc(ctx, ctx.label(D.SOURCES.dawn.title))}</p>`,
    {
      submitLabel: t(ctx, "Tira e ricarica", "Roll and recharge"),
      onSubmit: (data) => {
        const dice2 = readDice(data, dice);
        const result = commitRoll(
          ctx,
          actor,
          L(`${D.rowName(row, "it")}: ricarica all’alba`, `${D.rowName(row, "en")}: dawn recharge`),
          (draft) => D.rollRecharge(draft, actor.id, row.id, { ...dice2, die: die(ctx) }, ctx.role),
        );
        if (result)
          ctx.toast(
            ctx.t(
              `${row.charges.regain} = ${result.total}: cariche ${result.before} → ${result.after}.`,
              `${row.charges.regain} = ${result.total}: charges ${result.before} → ${result.after}.`,
            ),
          );
      },
    },
  );
  bindDiceToggle();
}
function openLastCharge(ctx, actor, row) {
  const dice = { count: 1, sides: 20 };
  ctx.dialog(
    t(ctx, `Ultima carica: ${D.rowName(row, "it")}`, `Last charge: ${D.rowName(row, "en")}`),
    `<p>${t(ctx, "Hai speso l’ultima carica: tira 1d20. Con 1 l’oggetto è distrutto.", "You spent the last charge: roll 1d20. On a 1 the item is destroyed.")}</p>${diceFields(ctx, dice)}<p class="muted">${esc(ctx, sourceText(ctx, row.source))}</p>`,
    {
      submitLabel: t(ctx, "Tira il d20", "Roll the d20"),
      onSubmit: (data) => {
        const result = commitRoll(
          ctx,
          actor,
          L(`${D.rowName(row, "it")}: ultima carica`, `${D.rowName(row, "en")}: last charge`),
          (draft) =>
            D.rollLastCharge(
              draft,
              actor.id,
              row.id,
              { ...readDice(data, dice), die: die(ctx) },
              ctx.role,
            ),
        );
        if (result)
          ctx.toast(
            result.destroyed
              ? ctx.t("1: l’oggetto è distrutto.", "1: the item is destroyed.")
              : ctx.t(
                  `${result.record.values[0]}: l’oggetto resta.`,
                  `${result.record.values[0]}: the item survives.`,
                ),
          );
      },
    },
  );
  bindDiceToggle();
}
function activityFacts(ctx, actor, row, activityId, charges) {
  const p = D.previewActivity(ctx.state, actor, row, activityId, { charges });
  if (!p.activity) return "";
  const lines = [];
  if (row.charges)
    lines.push(
      `${t(ctx, "Cariche", "Charges")}: ${p.before} → <strong>${p.after}</strong> (${p.spend})`,
    );
  if (p.level) lines.push(`${t(ctx, "Livello dell’incantesimo", "Spell level")} ${p.level}`);
  if (p.dice)
    lines.push(
      `${t(ctx, "Danni", "Damage")} ${p.dice.count}d${p.dice.sides}${p.modifier ? " + " + p.modifier : ""} ${esc(ctx, p.damageType ? ctx.label(LABELS.damageType[p.damageType] ?? p.damageType).toLowerCase() : "")}`,
    );
  if (p.save)
    lines.push(
      `${t(ctx, "Tiro salvezza", "Saving throw")} ${esc(ctx, ctx.label(LABELS.ability[p.save.ability] ?? p.save.ability))} ${t(ctx, "CD", "DC")} ${p.dc ?? "—"} (${t(ctx, "metà se riesce", "half on a success")})`,
    );
  if (p.lastCharge)
    lines.push(
      t(
        ctx,
        "Ultima carica: dopo l’uso tiri 1d20 (con 1 l’oggetto è distrutto).",
        "Last charge: after use you roll 1d20 (on a 1 the item is destroyed).",
      ),
    );
  return `<ul class="invp-facts" data-invp-activity-facts>${lines.map((l) => `<li>${l}</li>`).join("")}</ul>${p.reasons.length ? `<p class="error">${p.reasons.map((r) => esc(ctx, ctx.label(r))).join(" ")}</p>` : ""}${p.spell ? `<p class="muted">${esc(ctx, ctx.label(p.spell.summary))} · ${esc(ctx, sourceText(ctx, p.spell.source))}</p>` : ""}`;
}
// TV-70 (dnd5e Activities, BG3 items on the hotbar): at the Table an item's activity picks
// its targets like a spell. The DM applies the damage; a player's damage goes to the DM's
// damage tray as a proposal (the Table's rule for players), each with the save to make.
function sceneTargets(ctx, actor) {
  if (ctx.view?.page !== "table") return [];
  const scene = ctx.state.scenes?.find((entry) => entry.id === ctx.state.activeSceneId);
  // Creatures of the DM first (the usual targets), then the party.
  return (scene?.tokens ?? [])
    .map((token) => ctx.state.actors[token.actorId])
    .filter((other) => other && other.id !== actor.id && targetable(ctx, actor, other.id))
    .sort((a, b) => (a.kind === "npc" ? 0 : 1) - (b.kind === "npc" ? 0 : 1));
}
function targetable(ctx, actor, id) {
  const other = ctx.state.actors[id];
  if (!other || other.id === actor.id || !ctx.state.ext?.[DT.ID]) return false;
  return ctx.role === "dm" ? canControlActor(other, "dm", ctx.state) : canPropose(ctx, other);
}
function targetsHTML(ctx, actor) {
  const list = sceneTargets(ctx, actor);
  if (!list.length) return "";
  return `<fieldset class="invp-fieldset invp-targets" data-invp-targets><legend>${t(ctx, "Bersagli", "Targets")}</legend>${list.map((other) => `<label class="invp-check"><input type="checkbox" name="target" value="${esc(ctx, other.id)}"> ${esc(ctx, ctx.label(other.name))}</label>`).join("")}<p class="muted">${ctx.role === "dm" ? t(ctx, "I danni si applicano ai bersagli scelti; i dardi si dividono nell’ordine della lista.", "Damage is applied to the chosen targets; darts are split in list order.") : t(ctx, "I danni vanno al DM per i bersagli scelti; i dardi si dividono nell’ordine della lista.", "Damage goes to the DM for the chosen targets; darts are split in list order.")}</p></fieldset>`;
}
function deliverDamage(ctx, draft, actor, row, used, targets) {
  const { record, preview } = used;
  const type = preview.damageType ?? null;
  const darts = preview.activity.spellId === "srd2024:spell:magic-missile";
  const perDart = darts ? preview.modifier / Math.max(1, record.values.length) : 0;
  const amounts = new Map(targets.map((id) => [id, 0]));
  if (darts)
    record.values.forEach((value, i) => {
      const id = targets[i % targets.length];
      amounts.set(id, amounts.get(id) + value + perDart);
    });
  else for (const id of targets) amounts.set(id, record.total);
  const save = preview.save
    ? ctx.t(
        ` · TS ${ctx.label(LABELS.ability[preview.save.ability] ?? preview.save.ability)} CD ${preview.dc ?? "?"}: metà se riesce`,
        ` · ${ctx.label(LABELS.ability[preview.save.ability] ?? preview.save.ability)} save DC ${preview.dc ?? "?"}: half on a success`,
      )
    : "";
  const note = `${D.rowName(row, ctx.lang)}: ${ctx.label(preview.activity.name)}${save}`.slice(
    0,
    200,
  );
  const names = [];
  for (const [id, amount] of amounts) {
    if (!amount) continue;
    if (ctx.role === "dm")
      DT.manualChange(draft, id, { kind: "damage", amount, type, reason: note }, "dm", {
        lang: ctx.lang,
      });
    else
      DT.propose(draft, { actorId: id, kind: "damage", amount, type, note }, ctx.role, {
        allowed: suggestionsAllowed(ctx),
      });
    names.push(ctx.label(draft.actors[id]?.name ?? id));
  }
  return names;
}
// For the Table and the quick bar (P5): the items this identity can use as an action.
export function usableItems(state, actorId, role) {
  const actor = state.actors?.[actorId];
  if (!actor || !canControlActor(actor, role, state)) return [];
  return D.usableRows(actor).map((row) => ({
    id: row.id,
    name: copyLabel(row),
    charges: row.charges ? { value: row.charges.value, max: row.charges.max } : null,
    activities: D.activitiesOf(row).map((a) => ({ id: a.id, name: a.name })),
  }));
}
const copyLabel = (row) => ({ it: D.rowName(row, "it"), en: D.rowName(row, "en") });
export function openItemUse(ctx, actorId, rowId, activityId = null) {
  const actor = ctx.state.actors[actorId];
  const row = D.rowById(actor, rowId);
  if (!row || !canEdit(ctx, actor)) return null;
  return openUse(ctx, actor, row, activityId);
}
function openUse(ctx, actor, row, preselected = null) {
  const activities = D.activitiesOf(row);
  if (!activities.length) return;
  const first = preselected ?? activities[0].id;
  const scaling = (a) => a.scaling === "level-per-charge";
  const maxDice = activities
    .map((a) => {
      const top = scaling(a) ? a.charges.max : a.charges?.min;
      return D.previewActivity(ctx.state, actor, row, a.id, { charges: top }).dice;
    })
    .reduce((best, d) => (d && (!best || d.count > best.count) ? d : best), null);
  const body = `<p>${t(ctx, "Come l’uso di un’attività in dnd5e: scegli l’attività, controlla il consumo e i dadi, poi conferma. Annullare non consuma nulla.", "Like using an activity in dnd5e: choose the activity, check consumption and dice, then confirm. Cancelling spends nothing.")}</p><p class="muted" data-invp-hold-note>${t(ctx, "Si usa mentre lo impugni: estrarlo è l’interazione gratuita con un oggetto del turno (SRD EN 13 / IT 15).", "You use it while holding it: drawing it is your turn’s free object interaction (SRD EN 13 / IT 15).")}</p><fieldset class="invp-fieldset" data-invp-activities><legend>${t(ctx, "Attività", "Activity")}</legend>${activities
    .map(
      (a, i) =>
        `<label class="invp-radio"><input type="radio" name="activity" value="${esc(ctx, a.id)}" ${a.id === first ? "checked" : ""}> ${esc(ctx, ctx.label(a.name))} · ${scaling(a) ? `${a.charges.min}–${a.charges.max} ${t(ctx, "cariche", "charges")}` : chargeWord(ctx, a.charges?.min ?? 0)}${i === 0 ? ` <small>(${t(ctx, "principale", "primary")})</small>` : ""}</label>`,
    )
    .join("")}</fieldset>${
    activities.some(scaling)
      ? `<label class="field"><span>${t(ctx, "Cariche da spendere (livello)", "Charges to spend (level)")}</span><select name="charges" data-invp-charges-select>${Array.from(
          {
            length: activities.find(scaling).charges.max - activities.find(scaling).charges.min + 1,
          },
          (_, i) => activities.find(scaling).charges.min + i,
        )
          .map(
            (n) =>
              `<option value="${n}">${n} · ${t(ctx, "livello", "level")} ${(activities.find(scaling).baseLevel ?? 1) + n - activities.find(scaling).charges.min}</option>`,
          )
          .join("")}</select></label>`
      : ""
  }<div data-invp-facts-box>${activityFacts(ctx, actor, row, first, activities.find((a) => a.id === first)?.charges?.min)}</div>${targetsHTML(ctx, actor)}<label class="invp-check"><input type="checkbox" name="consume" checked> ${t(ctx, "Consuma le cariche", "Spend the charges")}</label>${diceFields(ctx, maxDice)}`;
  ctx.dialog(t(ctx, `Usa: ${D.rowName(row, "it")}`, `Use: ${D.rowName(row, "en")}`), body, {
    submitLabel: t(ctx, "Usa", "Use"),
    onSubmit: (data) => {
      const activityId = data.get("activity");
      const charges = data.get("charges") ? Number(data.get("charges")) : undefined;
      const preview = D.previewActivity(ctx.state, actor, row, activityId, { charges });
      if (!preview.ok) throw D.fail(preview.reasons[0].it, preview.reasons[0].en);
      const { mode, faces } = readDice(data, preview.dice);
      const targets = data.getAll("target").filter((id) => targetable(ctx, actor, id));
      let delivered = null;
      const result = commitRoll(
        ctx,
        actor,
        L(
          `${D.rowName(row, "it")}: ${preview.activity.name.it}`,
          `${D.rowName(row, "en")}: ${preview.activity.name.en}`,
        ),
        (draft) => {
          const used = D.useActivity(
            draft,
            actor.id,
            row.id,
            activityId,
            {
              charges,
              consume: data.get("consume") === "on",
              mode,
              faces,
              die: die(ctx),
            },
            ctx.role,
          );
          if (targets.length && used.record)
            delivered = deliverDamage(ctx, draft, actor, row, used, targets);
          return used;
        },
      );
      if (delivered)
        ctx.toast(
          ctx.role === "dm"
            ? ctx.t(
                `${preview.activity.name.it}: danni applicati a ${delivered.join(", ")}.`,
                `${preview.activity.name.en}: damage applied to ${delivered.join(", ")}.`,
              )
            : ctx.t(
                `${preview.activity.name.it}: danni inviati al DM per ${delivered.join(", ")}.`,
                `${preview.activity.name.en}: damage sent to the DM for ${delivered.join(", ")}.`,
              ),
        );
      else if (result?.record)
        ctx.toast(
          ctx.t(
            `${preview.activity.name.it}: ${result.record.total} danni${preview.dc ? `, TS CD ${preview.dc}` : ""}. Applicali ai bersagli al Tavolo.`,
            `${preview.activity.name.en}: ${result.record.total} damage${preview.dc ? `, save DC ${preview.dc}` : ""}. Apply it to the targets at the Table.`,
          ),
        );
    },
  });
  const dialog = globalThis.document?.querySelector("#dialog");
  const refresh = () => {
    if (!dialog) return;
    const activity = dialog.querySelector('[name="activity"]:checked')?.value;
    const charges = dialog.querySelector("[data-invp-charges-select]")?.value;
    const target = activities.find((a) => a.id === activity);
    const box = dialog.querySelector("[data-invp-facts-box]");
    if (box)
      box.innerHTML = activityFacts(
        ctx,
        actor,
        row,
        activity,
        scaling(target) ? Number(charges) : target?.charges?.min,
      );
    const dice = D.previewActivity(ctx.state, actor, row, activity, {
      charges: scaling(target) ? Number(charges) : target?.charges?.min,
    }).dice;
    const faces = dialog.querySelector("[data-invp-faces]");
    if (faces) {
      faces.innerHTML = facesHTML(dice);
      const physical = dialog.querySelector('[data-invp-dice] input[value="physical"]')?.checked;
      faces.querySelectorAll("input").forEach((input) => (input.required = !!physical));
    }
    const box2 = dialog.querySelector("[data-invp-dice]");
    if (box2) box2.hidden = !dice;
  };
  dialog?.querySelector("[data-invp-activities]")?.addEventListener("change", refresh);
  dialog?.querySelector("[data-invp-charges-select]")?.addEventListener("change", refresh);
  bindDiceToggle();
  refresh();
}
// ---------------------------------------------------------------- add items (PG-62)

// D&D Beyond «+ Add Items»: the SRD catalogue searchable inside the inventory, «Aggiungi»
// on each row, the campaign's enabled homebrew beside it (reviewed in the Library, as every
// homebrew copy), and a «Personalizzato» tab for an item the catalogue does not have.
const CATALOG_GROUPS = [
  ["weapon", L("Armi", "Weapons")],
  ["armor", L("Armature e scudi", "Armor and shields")],
  ["gear", L("Equipaggiamento d’avventura", "Adventuring gear")],
  ["tool", L("Strumenti", "Tools")],
  ["magic-item", L("Oggetti magici", "Magic items")],
];
const fold = (text) =>
  String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
export function catalogRows(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  const srd = SRD_ITEMS.map((entry) => ({
    id: entry.id,
    name: entry.name,
    group: CATALOG_GROUPS.some(([g]) => g === entry.category) ? entry.category : "gear",
    weight: entry.weight == null ? null : poundsToKg(entry.weight),
    value: catalogValueCp(entry),
    rarity: entry.rarity ?? null,
    homebrew: false,
    search: fold(`${entry.name.it} ${entry.name.en}`),
  }));
  const homebrew = listHomebrew(ctx.state, ctx.role)
    .filter((content) => ["item", "weapon", "armor", "consumable"].includes(content.type))
    .filter(
      (content) =>
        homebrewAvailability(ctx.state, content.latestRef, { actorId: actor?.id }, ctx.role).canUse,
    )
    .map((content) => ({
      id: content.id,
      revisionId: content.latestRef.revisionId,
      name: content.name,
      group: content.type === "weapon" ? "weapon" : content.type === "armor" ? "armor" : "gear",
      weight: null,
      value: null,
      rarity: null,
      homebrew: true,
      search: fold(
        `${ctx.label(content.name)} ${content.name?.it ?? ""} ${content.name?.en ?? ""}`,
      ),
    }));
  return [...homebrew, ...srd];
}
function catalogRowHTML(ctx, row) {
  const facts = [
    row.homebrew
      ? `<span class="badge">${t(ctx, "Homebrew della campagna", "Campaign homebrew")}</span>`
      : "",
    row.rarity ? esc(ctx, ctx.label(RARITY[row.rarity] ?? row.rarity)) : "",
    row.weight == null ? "" : `${kg(ctx, row.weight)} kg`,
    row.value == null ? "" : esc(ctx, formatCp(row.value, ctx.lang)),
  ]
    .filter(Boolean)
    .join(" · ");
  const action = row.homebrew
    ? `<button type="button" class="button" data-invp-add-homebrew="${esc(ctx, row.id)}" data-invp-add-revision="${esc(ctx, row.revisionId)}" aria-label="${t(ctx, "Rivedi e aggiungi", "Review and add")}: ${esc(ctx, ctx.label(row.name))}">${t(ctx, "Rivedi e aggiungi", "Review and add")}</button>`
    : `<button type="button" class="button" data-invp-add-srd="${esc(ctx, row.id)}" aria-label="${t(ctx, "Aggiungi", "Add")}: ${esc(ctx, ctx.label(row.name))}">${t(ctx, "Aggiungi", "Add")}</button>`;
  return `<li class="invp-add-row" data-invp-add-row data-search="${esc(ctx, row.search)}" data-group="${esc(ctx, row.group)}"><div><strong>${esc(ctx, ctx.label(row.name))}</strong>${facts ? `<small>${facts}</small>` : ""}</div><span class="invp-add-count" data-invp-add-count="${esc(ctx, row.id)}" aria-live="polite"></span>${action}</li>`;
}
function openAddItem(ctx, actor) {
  const rows = catalogRows(ctx, actor.id);
  const kinds = [
    ["gear", t(ctx, "Equipaggiamento", "Gear")],
    ["weapon", t(ctx, "Arma", "Weapon")],
    ["consumable", t(ctx, "Consumabile", "Consumable")],
  ];
  const body = `<div class="invp-add" data-invp-add><div class="invp-add-tabs" role="group" aria-label="${t(ctx, "Da dove", "From")}"><input type="hidden" name="tab" value="catalog" data-invp-add-tabvalue><button type="button" class="invp-chip active" data-invp-add-tab="catalog" aria-pressed="true">${t(ctx, "Catalogo", "Catalogue")}</button><button type="button" class="invp-chip" data-invp-add-tab="custom" aria-pressed="false">${t(ctx, "Personalizzato", "Custom")}</button></div><section class="invp-add-catalog" data-invp-add-panel="catalog"><div class="invp-add-search-row"><label class="field invp-add-search"><span>${t(ctx, "Cerca un oggetto (SRD e homebrew della campagna)", "Search an item (SRD and campaign homebrew)")}</span><input type="search" name="query" data-invp-add-search autocomplete="off" placeholder="${t(ctx, "Es. pugnale, corda, pozione", "E.g. dagger, rope, potion")}"></label><label class="field invp-add-group"><span>${t(ctx, "Categoria", "Category")}</span><select data-invp-add-group><option value="">${t(ctx, "Tutte", "All")}</option>${CATALOG_GROUPS.map(([id, text]) => `<option value="${id}">${esc(ctx, ctx.label(text))}</option>`).join("")}</select></label></div><input type="hidden" name="first" data-invp-add-first value=""><p class="muted invp-add-status" data-invp-add-status role="status">${rows.length} ${t(ctx, "oggetti", "items")}</p><ul class="invp-add-list" data-invp-add-list>${rows.map((row) => catalogRowHTML(ctx, row)).join("")}</ul><p class="muted">${t(ctx, "Registra oggetti già posseduti: nessun acquisto o pagamento automatico. Per comprare usa la Bottega al Tavolo.", "Records items already owned: no automatic purchase or payment. To buy, use the Shop at the Table.")}</p></section><section class="invp-add-custom" data-invp-add-panel="custom" hidden><div class="form-grid"><label class="field"><span>${t(ctx, "Nome", "Name")}</span><input name="name" maxlength="100"></label><label class="field"><span>${t(ctx, "Tipo", "Type")}</span><select name="kind">${kinds.map(([v, text]) => `<option value="${v}">${text}</option>`).join("")}</select></label><label class="field"><span>${t(ctx, "Quantità", "Quantity")}</span><input name="quantity" type="number" min="1" max="99999" value="1" inputmode="numeric"></label><label class="field"><span>${t(ctx, "Peso per unità (kg)", "Weight per unit (kg)")}</span><input name="weight" type="number" min="0" max="99999" step="0.01" value="0" inputmode="decimal"></label></div><label class="field"><span>${t(ctx, "Descrizione conosciuta", "Known description")}</span><textarea name="description" rows="3" maxlength="2000"></textarea></label><label class="invp-check"><input type="checkbox" name="equippable"> ${t(ctx, "Si indossa o si impugna (può essere equipaggiato)", "Worn or wielded (can be equipped)")}</label><label class="invp-check"><input type="checkbox" name="healing"> ${t(ctx, "Pozione di guarigione standard · 2d4 + 2", "Standard Potion of Healing · 2d4 + 2")}</label></section></div>`;
  ctx.dialog(t(ctx, "Aggiungi oggetto", "Add item"), body, {
    submitLabel: t(ctx, "Salva oggetto", "Save item"),
    cancelLabel: t(ctx, "Chiudi", "Close"),
    onSubmit: (data) => {
      if (data.get("tab") === "custom") {
        const done = commit(ctx, actor, ctx.t("Oggetto aggiunto", "Item added"), (draft) =>
          D.addCustomItem(
            draft,
            actor.id,
            {
              name: data.get("name"),
              kind: data.get("kind"),
              quantity: Number(data.get("quantity") || 1),
              weight: data.get("weight"),
              description: data.get("description"),
              equippable: data.get("equippable") === "on",
              healing: data.get("healing") === "on",
            },
            ctx.role,
          ),
        );
        if (done)
          ctx.toast(ctx.t("Oggetto aggiunto all’inventario.", "Item added to the inventory."));
        return done ? undefined : false;
      }
      // Enter in the search adds the first match and keeps the catalogue open.
      const first = String(data.get("first") ?? "");
      if (first.startsWith("srd")) addFromCatalog(ctx, actor.id, first);
      return false;
    },
  });
  bindAddDialog(ctx, actor.id);
}
function bindAddDialog(ctx, actorId) {
  const dialog = globalThis.document?.querySelector?.("#dialog");
  const box = dialog?.querySelector("[data-invp-add]");
  if (!box) return;
  const submit = dialog.querySelector('footer [type="submit"]');
  const search = box.querySelector("[data-invp-add-search]");
  const group = box.querySelector("[data-invp-add-group]");
  const first = box.querySelector("[data-invp-add-first]");
  const status = box.querySelector("[data-invp-add-status]");
  const showTab = (id) => {
    box.querySelector("[data-invp-add-tabvalue]").value = id;
    for (const b of box.querySelectorAll("[data-invp-add-tab]")) {
      const on = b.dataset.invpAddTab === id;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", String(on));
    }
    for (const panel of box.querySelectorAll("[data-invp-add-panel]"))
      panel.hidden = panel.dataset.invpAddPanel !== id;
    if (submit) submit.hidden = id !== "custom";
    (id === "custom" ? box.querySelector('[name="name"]') : search)?.focus();
  };
  const filter = () => {
    const q = fold(search.value).trim();
    const g = group.value;
    let shown = 0;
    let top = "";
    for (const li of box.querySelectorAll("[data-invp-add-row]")) {
      const match = (!q || li.dataset.search.includes(q)) && (!g || li.dataset.group === g);
      li.hidden = !match;
      if (match) {
        shown++;
        top ||= li.querySelector("[data-invp-add-srd]")?.dataset.invpAddSrd ?? "";
      }
    }
    first.value = q ? top : "";
    status.textContent = shown
      ? `${shown} ${ctx.t("oggetti", "items")}`
      : ctx.t(
          "Nessun oggetto nel catalogo: prova «Personalizzato».",
          "No item in the catalogue: try “Custom”.",
        );
  };
  box.addEventListener("click", (event) => {
    const tab = event.target.closest?.("[data-invp-add-tab]");
    if (tab) return showTab(tab.dataset.invpAddTab);
    const srd = event.target.closest?.("[data-invp-add-srd]");
    if (srd) return addFromCatalog(ctx, actorId, srd.dataset.invpAddSrd);
    const hb = event.target.closest?.("[data-invp-add-homebrew]");
    if (hb) addHomebrew(ctx, actorId, hb.dataset.invpAddHomebrew, hb.dataset.invpAddRevision);
  });
  search.addEventListener("input", filter);
  group.addEventListener("change", filter);
  showTab("catalog");
}
// One «Aggiungi»: the item is on the sheet at once; the catalogue stays open for the next.
export function addFromCatalog(ctx, actorId, srdId) {
  const actor = ctx.state.actors[actorId];
  if (!actor) return null;
  let row = null;
  const done = attempt(ctx, () =>
    commit(ctx, actor, ctx.t("Oggetto aggiunto", "Item added"), (draft) => {
      row = D.addCatalogItem(draft, actorId, srdId, 1, ctx.role);
    }),
  );
  if (!done || !row) return null;
  const text = ctx.t(
    `${D.rowName(row, "it")} aggiunto (×${row.quantity})`,
    `${D.rowName(row, "en")} added (×${row.quantity})`,
  );
  const doc = globalThis.document;
  const count = doc?.querySelector?.(`#dialog [data-invp-add-count="${cssId(srdId)}"]`);
  if (count) count.textContent = `✓ ×${row.quantity}`;
  const status = doc?.querySelector?.("#dialog [data-invp-add-status]");
  if (status) status.textContent = text;
  if (!doc?.querySelector?.("#dialog[open]")) ctx.toast(text);
  return row;
}
// Homebrew copies are reviewed in the Library before they join a sheet (B-increment 6).
export function addHomebrew(ctx, actorId, contentId, revisionId) {
  ctx.closeDialog?.();
  return ctx.navigate("library", {
    id: contentId,
    revision: revisionId,
    returnTo: JSON.stringify({ page: "characters", actorId, tab: "inventory" }),
  });
}
function openContainerCoins(ctx, actor, row) {
  ctx.dialog(
    t(ctx, `Monete in: ${D.rowName(row, "it")}`, `Coins in: ${D.rowName(row, "en")}`),
    `<p>${t(ctx, "Come «Put Coins in Containers» di D&D Beyond: le monete viaggiano con il contenitore e contano nel suo peso.", "Like D&D Beyond's Put Coins in Containers: coins travel with the container and count in its weight.")}</p><p>${t(ctx, "Borsello", "Purse")}: <strong>${esc(ctx, formatCoins(purseOf(actor), ctx.lang))}</strong> · ${t(ctx, "Nel contenitore", "In the container")}: <strong>${esc(ctx, formatCoins(D.containerCoins(row), ctx.lang))}${Object.entries(
      D.containerCustomCoins(row),
    )
      .map(
        ([cid, n]) =>
          ` · ${n} ${esc(ctx, ctx.label(D.currenciesOf(ctx.state).find((c) => c.id === cid)?.abbr ?? cid))}`,
      )
      .join(
        "",
      )}</strong></p><fieldset class="invp-fieldset"><legend>${t(ctx, "Direzione", "Direction")}</legend><label class="invp-radio"><input type="radio" name="direction" value="in" checked> ${t(ctx, "Dal borsello al contenitore", "From the purse into the container")}</label><label class="invp-radio"><input type="radio" name="direction" value="out"> ${t(ctx, "Dal contenitore al borsello", "From the container to the purse")}</label></fieldset>${coinInputs(ctx)}`,
    {
      submitLabel: t(ctx, "Sposta monete", "Move coins"),
      onSubmit: (data) => {
        const { coins, customCoins } = readCoinInputs(ctx, data);
        commit(ctx, actor, ctx.t("Monete spostate", "Coins moved"), (draft) =>
          D.moveCoinsToContainer(
            draft,
            actor.id,
            row.id,
            coins,
            data.get("direction"),
            ctx.role,
            customCoins,
          ),
        );
      },
    },
  );
}
function openCoins(ctx, actor) {
  const editable = canEdit(ctx, actor);
  const items = [];
  const add = (action, text) =>
    items.push(`<button type="button" class="button" data-invp-coins="${action}">${text}</button>`);
  if (editable) {
    add("convert", t(ctx, "Converti monete…", "Convert coins…"));
    if (D.rowsOf(actor).some(D.isContainer))
      add(
        "container",
        t(ctx, "Metti o prendi da un contenitore…", "Put in or take from a container…"),
      );
    if (D.transferTargets(ctx.state, actor.id, ctx.role).length)
      add(
        "give",
        t(ctx, "Passa o offri a un’altra creatura…", "Give or offer to another creature…"),
      );
  }
  if (ctx.role === "dm")
    add("currencies", t(ctx, "Valute della campagna…", "Campaign currencies…"));
  const custom = D.currenciesOf(ctx.state)
    .map(
      (def) =>
        `<li><strong>${esc(ctx, ctx.label(def.name))}</strong> (${esc(ctx, ctx.label(def.abbr))}): ${actor.customCoins?.[def.id] ?? 0} · ${def.perGp} = 1 ${coinAbbreviation("gp", ctx.lang)} · ${kg(ctx, def.weightKg)} kg ${t(ctx, "l’una", "each")}</li>`,
    )
    .join("");
  ctx.dialog(
    t(ctx, `Monete di ${actor.name}`, `${actor.name}'s coins`),
    `<p class="invp-coins-big">${esc(ctx, coinsText(ctx, actor))}</p>${custom ? `<ul class="invp-currency-list">${custom}</ul>` : ""}<div class="dialog-menu">${items.join("")}</div><p class="muted">${t(ctx, "Cambio SRD: 1 mp = 10 mo; 1 mo = 2 me = 10 ma = 100 mr.", "SRD rates: 1 pp = 10 gp; 1 gp = 2 ep = 10 sp = 100 cp.")} ${esc(ctx, sourceText(ctx, D.SOURCES.coins))}</p>`,
    { cancelLabel: t(ctx, "Chiudi", "Close") },
  );
  globalThis.document?.querySelectorAll("#dialog [data-invp-coins]").forEach(
    (button) =>
      (button.onclick = () => {
        ctx.closeDialog();
        const action = button.dataset.invpCoins;
        globalThis.queueMicrotask(() => {
          const fresh = ctx.state.actors[actor.id];
          if (action === "convert") openConvert(ctx, fresh);
          if (action === "container") openCoinsContainerPick(ctx, fresh);
          if (action === "give") openGiveCoins(ctx, fresh);
          if (action === "currencies") openCurrencies(ctx);
        });
      }),
  );
}
function coinOptions(ctx, selected) {
  const standard = ["cp", "sp", "ep", "gp", "pp"].map(
    (id) =>
      `<option value="${id}" ${selected === id ? "selected" : ""}>${esc(ctx, ctx.label(coinName(id)))} (${esc(ctx, coinAbbreviation(id, ctx.lang))})</option>`,
  );
  const custom = D.currenciesOf(ctx.state).map(
    (def) =>
      `<option value="${esc(ctx, def.id)}" ${selected === def.id ? "selected" : ""}>${esc(ctx, ctx.label(def.name))} (${esc(ctx, ctx.label(def.abbr))})</option>`,
  );
  return [...standard, ...custom].join("");
}
function openConvert(ctx, actor) {
  ctx.dialog(
    t(ctx, "Converti monete", "Convert coins"),
    `<p>${t(ctx, "Come il convertitore di Roll20: cambi una quantità in un’altra moneta; il resto torna in oro, argento e rame.", "Like Roll20's converter: exchange an amount into another coin; the change comes back in gold, silver and copper.")}</p><div class="form-grid"><label class="field"><span>${t(ctx, "Da", "From")}</span><select name="from" data-invp-convert>${coinOptions(ctx, "cp")}</select></label><label class="field"><span>${t(ctx, "Quantità", "Amount")}</span><input type="number" name="amount" min="1" value="${purseOf(actor).cp || 1}" required inputmode="numeric" data-invp-convert></label><label class="field"><span>${t(ctx, "A", "To")}</span><select name="to" data-invp-convert>${coinOptions(ctx, "sp")}</select></label></div><p class="invp-preview" data-invp-convert-preview aria-live="polite"></p>`,
    {
      submitLabel: t(ctx, "Converti", "Convert"),
      onSubmit: (data) => {
        commit(ctx, actor, ctx.t("Monete convertite", "Coins converted"), (draft) =>
          D.convertCoins(
            draft,
            actor.id,
            data.get("from"),
            data.get("to"),
            Number(data.get("amount")),
            ctx.role,
          ),
        );
      },
    },
  );
  const dialog = globalThis.document?.querySelector("#dialog");
  const update = () => {
    if (!dialog) return;
    const get = (n) => dialog.querySelector(`[name="${n}"]`)?.value;
    const p = D.previewConversion(ctx.state, actor, get("from"), get("to"), Number(get("amount")));
    const out = dialog.querySelector("[data-invp-convert-preview]");
    if (out)
      out.textContent = p.ok
        ? `${p.amount} → ${p.received}${isEmptyCoins(p.change) ? "" : " + " + ctx.t("resto", "change") + " " + formatCoins(p.change, ctx.lang)}`
        : ctx.label(p.reason);
  };
  dialog
    ?.querySelectorAll("[data-invp-convert]")
    .forEach((el) => el.addEventListener("input", update));
  update();
}
function openCoinsContainerPick(ctx, actor) {
  const containers = D.rowsOf(actor).filter(D.isContainer);
  ctx.dialog(
    t(ctx, "Scegli il contenitore", "Choose the container"),
    `<label class="field"><span>${t(ctx, "Contenitore", "Container")}</span><select name="container">${containers.map((c) => `<option value="${esc(ctx, c.id)}">${name(ctx, c)}</option>`).join("")}</select></label>`,
    {
      submitLabel: t(ctx, "Avanti", "Next"),
      onSubmit: (data) => {
        const row = D.rowById(actor, data.get("container"));
        globalThis.queueMicrotask(() => openContainerCoins(ctx, actor, row));
      },
    },
  );
}
function openGiveCoins(ctx, actor) {
  const targets = D.transferTargets(ctx.state, actor.id, ctx.role);
  ctx.dialog(
    t(ctx, "Passa o offri monete", "Give or offer coins"),
    `<p>${t(ctx, "Come il dialogo di trasferimento di dnd5e: se il destinatario lo giochi soltanto tu il passaggio è diretto, altrimenti diventa un’offerta che chi lo gioca accetta o rifiuta.", "Like dnd5e's transfer dialog: if only you play the recipient the transfer is direct, otherwise it becomes an offer their player accepts or declines.")}</p><label class="field"><span>${t(ctx, "A", "To")}</span><select name="to">${targets.map((a) => `<option value="${esc(ctx, a.id)}">${esc(ctx, a.name)} · ${D.isDirectTransfer(ctx.state, actor.id, a.id, ctx.role) ? t(ctx, "diretto", "direct") : t(ctx, "offerta", "offer")}</option>`).join("")}</select></label>${coinInputs(ctx)}`,
    {
      submitLabel: t(ctx, "Conferma", "Confirm"),
      onSubmit: (data) => {
        const packet = readCoinInputs(ctx, data);
        const to = ctx.state.actors[data.get("to")];
        if (!to) throw D.fail("Scegli il destinatario.", "Choose the recipient.");
        if (D.isDirectTransfer(ctx.state, actor.id, to.id, ctx.role))
          commit(
            ctx,
            actor,
            ctx.t(`Monete passate a ${to.name}`, `Coins given to ${to.name}`),
            (draft) => D.transfer(draft, actor.id, to.id, packet, ctx.role),
          );
        else {
          commit(ctx, actor, ctx.t(`Offerta a ${to.name}`, `Offer to ${to.name}`), (draft) =>
            D.createOffer(draft, actor.id, to.id, packet, ctx.role),
          );
          ctx.toast(ctx.t(`Offerta inviata a ${to.name}.`, `Offer sent to ${to.name}.`));
        }
      },
    },
  );
}
function openCurrencies(ctx, editing = null) {
  const list = D.currenciesOf(ctx.state);
  const def = list.find((c) => c.id === editing) ?? null;
  ctx.dialog(
    t(ctx, "Valute della campagna", "Campaign currencies"),
    `<p>${t(ctx, "Come in Shard: una valuta locale con nome, sigla, peso e cambio con l’oro. I giocatori la vedono accanto alle monete SRD.", "As in Shard: a local currency with name, short name, weight and rate to gold. Players see it next to the SRD coins.")}</p>${list.length ? `<ul class="invp-currency-list">${list.map((c) => `<li><span><strong>${esc(ctx, ctx.label(c.name))}</strong> (${esc(ctx, ctx.label(c.abbr))}) · ${c.perGp} = 1 ${coinAbbreviation("gp", ctx.lang)} · ${kg(ctx, c.weightKg)} kg</span><span>${btn(ctx, `data-invp-cur-edit="${esc(ctx, c.id)}"`, t(ctx, "Modifica", "Edit"))}${btn(ctx, `data-invp-cur-remove="${esc(ctx, c.id)}"`, t(ctx, "Elimina", "Delete"))}</span></li>`).join("")}</ul>` : ""}<h3>${def ? t(ctx, "Modifica", "Edit") + ": " + esc(ctx, ctx.label(def.name)) : t(ctx, "Nuova valuta", "New currency")}</h3><input type="hidden" name="id" value="${esc(ctx, def?.id ?? "")}"><div class="form-grid"><label class="field"><span>${t(ctx, "Nome (IT)", "Name (IT)")}</span><input name="nameIt" maxlength="40" required value="${esc(ctx, def?.name?.it ?? "")}"></label><label class="field"><span>${t(ctx, "Nome (EN)", "Name (EN)")}</span><input name="nameEn" maxlength="40" value="${esc(ctx, def?.name?.en ?? "")}"></label><label class="field"><span>${t(ctx, "Sigla (IT)", "Short (IT)")}</span><input name="abbrIt" maxlength="5" required value="${esc(ctx, def?.abbr?.it ?? "")}"></label><label class="field"><span>${t(ctx, "Sigla (EN)", "Short (EN)")}</span><input name="abbrEn" maxlength="5" value="${esc(ctx, def?.abbr?.en ?? "")}"></label><label class="field"><span>${t(ctx, "Quante per 1 mo", "How many per 1 gp")}</span><input name="perGp" inputmode="decimal" required value="${def?.perGp ?? ""}"></label><label class="field"><span>${t(ctx, "Peso per moneta (kg)", "Weight per coin (kg)")}</span><input name="weightKg" inputmode="decimal" value="${def?.weightKg ?? "0.01"}"></label></div>`,
    {
      submitLabel: def
        ? t(ctx, "Salva valuta", "Save currency")
        : t(ctx, "Aggiungi valuta", "Add currency"),
      onSubmit: (data) => {
        ctx.commit(ctx.t("Valuta della campagna salvata", "Campaign currency saved"), (draft) =>
          D.saveCurrency(
            draft,
            Object.fromEntries(
              ["id", "nameIt", "nameEn", "abbrIt", "abbrEn", "perGp", "weightKg"].map((k) => [
                k,
                data.get(k),
              ]),
            ),
            ctx.role,
          ),
        );
      },
    },
  );
  const dialog = globalThis.document?.querySelector("#dialog");
  dialog?.querySelectorAll("[data-invp-cur-edit]").forEach(
    (b) =>
      (b.onclick = () => {
        ctx.closeDialog();
        globalThis.queueMicrotask(() => openCurrencies(ctx, b.dataset.invpCurEdit));
      }),
  );
  dialog?.querySelectorAll("[data-invp-cur-remove]").forEach(
    (b) =>
      (b.onclick = () => {
        const done = attempt(ctx, () =>
          ctx.commit(ctx.t("Valuta eliminata", "Currency deleted"), (draft) =>
            D.removeCurrency(draft, b.dataset.invpCurRemove, ctx.role),
          ),
        );
        if (done) globalThis.queueMicrotask(() => openCurrencies(ctx));
      }),
  );
}

// ---------------------------------------------------------------- campaign currencies page

// PG-75: Foundry dnd5e keeps currencies in the system/campaign configuration (name,
// abbreviation, conversion): here they are a DM page of the campaign, beside Settings,
// not a command hidden inside one character's coins.
export function renderCurrenciesPage(ctx) {
  const list = D.currenciesOf(ctx.state);
  const rows = list.length
    ? `<div class="table-wrap"><table class="invp-currency-table"><thead><tr><th scope="col">${t(ctx, "Valuta", "Currency")}</th><th scope="col">${t(ctx, "Sigla", "Short")}</th><th scope="col">${t(ctx, "Cambio", "Rate")}</th><th scope="col">${t(ctx, "Peso", "Weight")}</th><th scope="col"><span class="visually-hidden">${t(ctx, "Comandi", "Commands")}</span></th></tr></thead><tbody>${list
        .map(
          (c) =>
            `<tr data-invp-currency="${esc(ctx, c.id)}"><th scope="row">${esc(ctx, ctx.label(c.name))}${c.note ? `<small>${esc(ctx, ctx.label(c.note))}</small>` : ""}</th><td>${esc(ctx, ctx.label(c.abbr))}</td><td>${esc(ctx, String(c.perGp))} = 1 ${coinAbbreviation("gp", ctx.lang)}</td><td>${kg(ctx, c.weightKg)} kg</td><td class="invp-currency-actions">${btn(ctx, `data-invp-currency-edit="${esc(ctx, c.id)}" aria-label="${t(ctx, "Modifica", "Edit")}: ${esc(ctx, ctx.label(c.name))}"`, t(ctx, "Modifica", "Edit"))}${btn(ctx, `data-invp-currency-remove="${esc(ctx, c.id)}" aria-label="${t(ctx, "Elimina", "Delete")}: ${esc(ctx, ctx.label(c.name))}"`, t(ctx, "Elimina", "Delete"))}</td></tr>`,
        )
        .join("")}</tbody></table></div>`
    : `<p class="empty-state">${t(ctx, "Nessuna valuta locale: il gruppo usa le monete del SRD (mr, ma, me, mo, mp).", "No local currency: the party uses the SRD coins (cp, sp, ep, gp, pp).")}</p>`;
  return `<section class="invp-currencies-page"><header class="campaign-heading"><div><h1 tabindex="-1" data-campaign-heading>${t(ctx, "Valute della campagna", "Campaign currencies")}</h1><p class="muted">${esc(ctx, ctx.label(ctx.state.campaign?.name ?? ""))}</p></div><div class="toolbar">${btn(ctx, "data-invp-currency-new", `${ctx.icon("plus")} ${t(ctx, "Nuova valuta", "New currency")}`, "primary")}</div></header><p>${t(ctx, "Monete locali accanto a quelle del SRD, come nella configurazione delle valute di Foundry: nome e sigla in italiano e inglese, cambio con la moneta d’oro e peso per moneta. Tutto il gruppo le vede nelle monete della scheda e le converte al loro cambio.", "Local coins beside the SRD ones, as in Foundry's currency configuration: name and short name in Italian and English, rate to the gold piece and weight per coin. The whole party sees them in the sheet's coins and converts them at their rate.")}</p>${rows}</section>`;
}
export function bindCurrenciesPage(el, ctx) {
  el.addEventListener("click", (event) => {
    const add = event.target.closest?.("[data-invp-currency-new]");
    if (add) return openCurrencies(ctx);
    const edit = event.target.closest?.("[data-invp-currency-edit]");
    if (edit) return openCurrencies(ctx, edit.dataset.invpCurrencyEdit);
    const remove = event.target.closest?.("[data-invp-currency-remove]");
    if (remove)
      attempt(ctx, () =>
        ctx.commit(ctx.t("Valuta eliminata", "Currency deleted"), (draft) =>
          D.removeCurrency(draft, remove.dataset.invpCurrencyRemove, ctx.role),
        ),
      );
  });
}

// ---------------------------------------------------------------- commands

// One entry for every control of the tab (and the tests): row actions open their dialog,
// tab actions commit through the domain. Refusals become toasts.
export function handleInventoryAction(ctx, actorId, action, id = null, event = null) {
  const actor = ctx.state.actors[actorId];
  if (!actor) return null;
  switch (action) {
    case "undo":
      return ctx.undo();
    case "coins":
      return openCoins(ctx, actor);
    case "coins-convert":
      return openConvert(ctx, actor);
    case "coins-give":
      return openGiveCoins(ctx, actor);
    case "currencies":
      return openCurrencies(ctx, id);
    case "add":
      return openAddItem(ctx, actor);
    case "sort": {
      const view = viewOf(actorId);
      if (!D.SORTS.includes(id)) return null;
      view.sort = id;
      saveLayout(view);
      pendingFocus = "[data-invp-sort]";
      return ctx.render();
    }
    case "column": {
      const view = viewOf(actorId);
      if (!COLUMNS.includes(id)) return null;
      if (view.columns.has(id)) view.columns.delete(id);
      else view.columns.add(id);
      saveLayout(view);
      pendingFocus = `[data-invp-column="${id}"]`;
      return ctx.render();
    }
    case "swap": {
      const done = attempt(ctx, () => {
        pendingFocus = '[data-invp="swap"]';
        return commit(ctx, actor, ctx.t("Set d’armi cambiato", "Weapon set swapped"), (draft) =>
          D.swapWeaponSet(draft, actorId, ctx.role),
        );
      });
      if (!done) pendingFocus = null;
      const sets = done && D.weaponSetsOf(ctx.state.actors[actorId]);
      const note = sets && D.combatEquipNote(ctx.state, actorId, sets[sets.active]);
      if (note) ctx.toast(ctx.label(note));
      return done;
    }
    case "recover":
      return attempt(ctx, () =>
        commit(ctx, actor, ctx.t("Munizioni recuperate", "Ammunition recovered"), (draft) =>
          D.recoverAmmunition(draft, actorId, ctx.role),
        ),
      );
    case "offer-accept":
      return attempt(ctx, () => {
        const done = commit(ctx, actor, ctx.t("Offerta accettata", "Offer accepted"), (draft) =>
          D.acceptOffer(draft, id, ctx.role),
        );
        ctx.toast(
          ctx.t("Offerta accettata: inventari aggiornati.", "Offer accepted: inventories updated."),
        );
        return done;
      });
    case "offer-decline":
      return attempt(ctx, () =>
        commit(ctx, actor, ctx.t("Offerta rifiutata", "Offer declined"), (draft) =>
          D.declineOffer(draft, id, ctx.role),
        ),
      );
    case "offer-withdraw":
      return attempt(ctx, () =>
        commit(ctx, actor, ctx.t("Offerta ritirata", "Offer withdrawn"), (draft) =>
          D.withdrawOffer(draft, id, ctx.role),
        ),
      );
    default:
      return id ? runRowAction(ctx, actorId, id, action, event) : null;
  }
}

// ---------------------------------------------------------------- binding the tab

export function bindTab(el, ctx, effective) {
  const actorId = effective?.id;
  if (!actorId) return;
  const view = viewOf(actorId);
  const root = el.querySelector?.("[data-invp-actor]") ?? el;
  el.addEventListener("click", (event) => {
    const control = event.target.closest?.(
      "[data-invp], [data-invp-filter], [data-invp-filter-set]",
    );
    if (!control || !el.contains(control) || control.disabled) return;
    focusAnchor = controlSelector(control) ?? focusAnchor;
    if (control.dataset.invpFilter || control.dataset.invpFilterSet) {
      const next = control.dataset.invpFilter ?? control.dataset.invpFilterSet;
      view.filter = view.filter === next && control.dataset.invpFilter ? "all" : next;
      pendingFocus = `[data-invp-filter="${next}"]`;
      return ctx.render();
    }
    handleInventoryAction(ctx, actorId, control.dataset.invp, control.dataset.invpId, event);
  });
  // dnd5e context menu: right-click on a row opens the same actions.
  el.addEventListener("contextmenu", (event) => {
    const row = event.target.closest?.("[data-invp-row], [data-invp-container]");
    if (!row || !el.contains(row)) return;
    const id = row.dataset.invpRow ?? row.dataset.invpContainer;
    const actor = ctx.state.actors[actorId];
    if (!canEdit(ctx, actor) && ctx.role !== "dm") return;
    event.preventDefault();
    focusAnchor = `[data-invp="menu"][data-invp-id="${cssId(id)}"]`;
    runRowAction(ctx, actorId, id, "menu");
  });
  const search = el.querySelector("[data-invp-search]");
  search?.addEventListener("input", () => {
    view.query = search.value;
    pendingFocus = "[data-invp-search]";
    ctx.render();
  });
  // F10: the folded view options stay open across redraws once opened. «toggle» fires a task
  // after the click, so a change made at once reads the live state before it redraws.
  const syncFolds = () => {
    const options = el.querySelector("details.invp-view");
    if (options) view.optionsOpen = options.open;
    const rule = el.querySelector("details.invp-rule");
    if (rule) view.ruleOpen = rule.open;
  };
  el.addEventListener("change", syncFolds, true);
  el.addEventListener("click", syncFolds, true);
  el.querySelector("details.invp-view")?.addEventListener("toggle", (event) => {
    view.optionsOpen = event.target.open;
  });
  el.querySelector("details.invp-rule")?.addEventListener("toggle", (event) => {
    view.ruleOpen = event.target.open;
  });
  el.querySelector("[data-invp-rarity]")?.addEventListener("change", (event) => {
    view.rarity = event.target.value;
    pendingFocus = "[data-invp-rarity]";
    ctx.render();
  });
  el.querySelector("[data-invp-sort]")?.addEventListener("change", (event) =>
    handleInventoryAction(ctx, actorId, "sort", event.target.value),
  );
  el.querySelector("[data-invp-grouped]")?.addEventListener("change", (event) => {
    view.grouped = event.target.checked;
    pendingFocus = "[data-invp-grouped]";
    ctx.render();
  });
  el.querySelector("[data-invp-encumbrance]")?.addEventListener("change", (event) => {
    const actor = ctx.state.actors[actorId];
    pendingFocus = "[data-invp-encumbrance]";
    attempt(ctx, () =>
      commit(ctx, actor, ctx.t("Ingombro aggiornato", "Encumbrance updated"), (draft) =>
        D.setEncumbrance(
          draft,
          actorId,
          { mode: event.target.value, ignoreCoins: draft.actors[actorId].encumbrance?.ignoreCoins },
          ctx.role,
        ),
      ),
    );
    ctx.render();
  });
  el.querySelector("[data-invp-ignore-coins]")?.addEventListener("change", (event) => {
    const actor = ctx.state.actors[actorId];
    pendingFocus = "[data-invp-ignore-coins]";
    attempt(ctx, () =>
      commit(ctx, actor, ctx.t("Peso delle monete aggiornato", "Coin weight updated"), (draft) =>
        D.setEncumbrance(
          draft,
          actorId,
          {
            mode: draft.actors[actorId].encumbrance?.mode ?? "standard",
            ignoreCoins: event.target.checked,
          },
          ctx.role,
        ),
      ),
    );
    ctx.render();
  });
  bindDrag(el, ctx, actorId);
  if (pendingFocus) {
    const selector = pendingFocus;
    const fallback = selector === focusAnchor;
    pendingFocus = null;
    const focusNow = () => {
      // A row that left the sheet (given, destroyed) leaves focus in the inventory's search.
      const scope = root.isConnected === false ? globalThis.document : root;
      const target =
        scope?.querySelector?.(selector) ??
        (fallback ? scope?.querySelector?.("[data-invp-search]") : null);
      if (!target) return;
      target.focus?.();
      if (target.matches?.("[data-invp-search]")) {
        const end = target.value.length;
        target.setSelectionRange?.(end, end);
      }
    };
    // A committed dialog closes right after this render and the browser gives focus back to
    // the control that opened it (now replaced): focus the new control once it has closed.
    const open = globalThis.document?.querySelector?.("#dialog[open]");
    if (open) open.addEventListener("close", () => globalThis.setTimeout(focusNow), { once: true });
    else focusNow();
  }
}
// dnd5e drag modifiers (FVT-027): drop on a container head moves; Ctrl or Alt copies (DM).
function bindDrag(el, ctx, actorId) {
  let dragged = null;
  el.addEventListener("dragstart", (event) => {
    const row = event.target.closest?.("[data-invp-row][draggable]");
    if (!row) return;
    dragged = row.dataset.invpRow;
    event.dataTransfer?.setData("text/plain", dragged);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "copyMove";
    row.classList.add("is-dragging");
  });
  el.addEventListener("dragend", (event) => {
    event.target.closest?.("[data-invp-row]")?.classList.remove("is-dragging");
    el.querySelectorAll(".is-drop").forEach((node) => node.classList.remove("is-drop"));
    dragged = null;
  });
  el.addEventListener("dragover", (event) => {
    const zone = event.target.closest?.("[data-invp-drop]");
    if (!zone || !dragged) return;
    event.preventDefault();
    if (event.dataTransfer)
      event.dataTransfer.dropEffect = event.ctrlKey || event.altKey ? "copy" : "move";
    zone.classList.add("is-drop");
  });
  el.addEventListener("dragleave", (event) => {
    event.target.closest?.("[data-invp-drop]")?.classList.remove("is-drop");
  });
  el.addEventListener("drop", (event) => {
    const zone = event.target.closest?.("[data-invp-drop]");
    const rowId = dragged ?? event.dataTransfer?.getData("text/plain");
    if (!zone || !rowId) return;
    event.preventDefault();
    const target = zone.dataset.invpDrop === "root" ? null : zone.dataset.invpDrop;
    const actor = ctx.state.actors[actorId];
    const row = D.rowById(actor, rowId);
    if (!row) return;
    if (event.ctrlKey || event.altKey)
      return attempt(ctx, () =>
        commit(ctx, actor, ctx.t("Oggetto copiato dal DM", "Item copied by the DM"), (draft) => {
          const copy = D.copyItem(draft, actorId, actorId, rowId, row.quantity, ctx.role, {
            stack: false,
          });
          if (target) D.moveWithin(draft, actorId, copy.id, target, copy.quantity, ctx.role);
        }),
      );
    if (target === row.id) return;
    attempt(ctx, () =>
      commit(ctx, actor, ctx.t("Oggetto spostato", "Item moved"), (draft) =>
        D.moveWithin(draft, actorId, rowId, target, row.quantity, ctx.role),
      ),
    );
  });
}

// ---------------------------------------------------------------- Table: Creature inspector

function inspectorActor(ctx, tableView) {
  const actor = ctx.state.actors?.[tableView?.selectedActorId];
  if (!actor || !canControlActor(actor, ctx.role, ctx.state)) return null;
  const sets = D.weaponSetsOf(actor);
  const ranged = D.rowsOf(actor).some((row) => row.equipped && row.weapon?.ammunition);
  if (
    !sets.melee &&
    !sets.ranged &&
    !ranged &&
    !D.ammoRecovery(ctx.state, actor.id) &&
    !D.usableRows(actor).length
  )
    return null;
  return actor;
}
export function renderInspector(ctx, tableView) {
  const actor = inspectorActor(ctx, tableView);
  if (!actor) return "";
  const sets = D.weaponSetsOf(actor);
  const active = sets[sets.active];
  const other = sets[sets.active === "melee" ? "ranged" : "melee"];
  const weapons = D.rowsOf(actor).filter((row) => row.equipped && row.weapon?.ammunition);
  const ammo = weapons
    .map((weapon) => {
      const rows = D.ammoRowsFor(actor, weapon);
      const chosen = D.selectedAmmo(actor, weapon);
      return `<label class="field invp-inline-field"><span>${t(ctx, "Munizioni", "Ammunition")} · ${name(ctx, weapon)}</span><select data-invp-table-ammo="${esc(ctx, weapon.id)}">${rows.length ? rows.map((row) => `<option value="${esc(ctx, row.id)}" ${chosen?.id === row.id ? "selected" : ""}>${name(ctx, row)} ×${row.quantity}</option>`).join("") : `<option value="">${t(ctx, "Nessuna", "None")}</option>`}</select></label>`;
    })
    .join("");
  const recovery = D.ammoRecovery(ctx.state, actor.id);
  const usable = D.usableRows(actor);
  const items = usable.length
    ? `<div class="invp-inspector-items"><p class="invp-inspector-label">${t(ctx, "Oggetti da usare", "Items to use")}</p><div class="invp-inspector-item-list">${usable.map((row) => btn(ctx, `data-invp-use-item="${esc(ctx, row.id)}"${off(whyId("use", actor.id, row.id), row.charges?.lastCharge === "pending")}`, `${ctx.icon("light")} ${name(ctx, row)}${row.charges ? ` <small>${row.charges.value}/${row.charges.max}</small>` : ""}`) + why(ctx, whyId("use", actor.id, row.id), row.charges?.lastCharge === "pending" ? L("Ultima carica spesa: tira prima 1d20 nell’Inventario.", "Last charge spent: roll 1d20 in the Inventory first.") : null)).join("")}</div></div>`
    : "";
  return `<div class="invp-inspector" data-invp-inspector="${esc(ctx, actor.id)}">${items}${sets.melee || sets.ranged ? `<p class="invp-inspector-set"><span>${sets.active === "ranged" ? t(ctx, "Distanza", "Ranged") : t(ctx, "Mischia", "Melee")}: <strong data-invp-table-active>${active ? name(ctx, active) : "—"}</strong></span>${other ? btn(ctx, 'data-invp-table="swap"', `${ctx.icon("swords")} ${t(ctx, "Cambia set", "Swap set")} → ${name(ctx, other)}`) : ""}</p>` : ""}${ammo}${recovery ? `<p class="invp-inspector-recovery">${recovery.rows.map((r) => `${esc(ctx, ctx.label(r.name))}: ${r.recover}/${r.used}`).join(" · ")} ${btn(ctx, 'data-invp-table="recover"', t(ctx, "Recupera munizioni (1 minuto)", "Recover ammunition (1 minute)"), "primary")}</p>` : ""}</div>`;
}
export function bindInspector(el, ctx) {
  const box = el.querySelector?.("[data-invp-inspector]");
  if (!box) return;
  const actorId = box.dataset.invpInspector;
  if (inspectorFocus) {
    el.querySelector?.(inspectorFocus)?.focus?.();
    inspectorFocus = null;
  }
  // The Table re-renders the sidebar after a commit: focus comes back to the same control.
  const run = (selector, label, mutate) => {
    inspectorFocus = selector;
    const done = attempt(ctx, () => commit(ctx, ctx.state.actors[actorId], label, mutate));
    if (!done) inspectorFocus = null;
    return done;
  };
  el.addEventListener("click", (event) => {
    const use = event.target.closest?.("[data-invp-use-item]");
    if (use && el.contains(use) && !use.disabled) {
      inspectorFocus = `[data-invp-use-item="${cssId(use.dataset.invpUseItem)}"]`;
      return openItemUse(ctx, actorId, use.dataset.invpUseItem);
    }
    const control = event.target.closest?.("[data-invp-table]");
    if (!control || !el.contains(control)) return;
    if (control.dataset.invpTable === "swap") {
      const done = run(
        '[data-invp-table="swap"]',
        ctx.t("Set d’armi cambiato", "Weapon set swapped"),
        (draft) => D.swapWeaponSet(draft, actorId, ctx.role),
      );
      const sets = done && D.weaponSetsOf(ctx.state.actors[actorId]);
      const note = sets && D.combatEquipNote(ctx.state, actorId, sets[sets.active]);
      if (note) ctx.toast(ctx.label(note));
    }
    if (control.dataset.invpTable === "recover")
      run(
        '[data-invp-table="swap"], [data-invp-table-ammo]',
        ctx.t("Munizioni recuperate", "Ammunition recovered"),
        (draft) => D.recoverAmmunition(draft, actorId, ctx.role),
      );
  });
  el.querySelectorAll("[data-invp-table-ammo]").forEach((select) =>
    select.addEventListener("change", () =>
      run(
        `[data-invp-table-ammo="${cssId(select.dataset.invpTableAmmo)}"]`,
        ctx.t("Munizioni scelte", "Ammunition chosen"),
        (draft) =>
          D.selectAmmo(draft, actorId, select.dataset.invpTableAmmo, select.value, ctx.role),
      ),
    ),
  );
}

// ---------------------------------------------------------------- notifications

export function collectNotifications(ctx) {
  const out = [];
  for (const actor of Object.values(ctx.state.actors ?? {})) {
    if (!canViewActor(actor, ctx.role, ctx.state) || !canControlActor(actor, ctx.role, ctx.state))
      continue;
    const mine = ctx.role !== "dm" || actor.owner === "dm";
    const target = { page: "characters", params: { id: actor.id, tab: "inventory" } };
    for (const offer of D.sliceOf(ctx.state)?.offers ?? [])
      if (
        offer.status === "pending" &&
        offer.to === actor.id &&
        D.canAnswerOffer(ctx.state, offer, ctx.role)
      )
        out.push({
          id: "invp-offer-" + offer.id,
          title: L(
            `Offerta da ${ctx.state.actors[offer.from]?.name ?? "?"} per ${actor.name}`,
            `Offer from ${ctx.state.actors[offer.from]?.name ?? "?"} to ${actor.name}`,
          ),
          body: L(offerText(ctx.state, offer, "it"), offerText(ctx.state, offer, "en")),
          time: offer.at,
          by: offer.createdBy,
          category: "party",
          target,
        });
    if (!mine) continue;
    for (const row of D.rowsOf(actor))
      if (D.pendingDawns(ctx.state, row))
        out.push({
          id: "invp-recharge-" + actor.id + "-" + row.id,
          title: L(
            `${D.rowName(row, "it")}: ricarica all’alba da tirare`,
            `${D.rowName(row, "en")}: dawn recharge to roll`,
          ),
          body: L(`${actor.name} · ${row.charges.regain}`, `${actor.name} · ${row.charges.regain}`),
          by: null,
          category: "requests",
          target,
        });
    if (D.ammoRecovery(ctx.state, actor.id))
      out.push({
        id: "invp-ammo-" + actor.id,
        title: L(`${actor.name}: recupera le munizioni`, `${actor.name}: recover ammunition`),
        body: L(
          "Metà delle munizioni usate nello scontro.",
          "Half the ammunition used in the fight.",
        ),
        by: null,
        category: "requests",
        target,
      });
  }
  return out;
}

// ---------------------------------------------------------------- registration

// Combat provider and speed adjuster are module-level: registering twice is harmless.
const provider = {
  list: (state, actor, profile) => D.rangedActions(state, actor, profile),
  preview: (state, actor, action) => D.rangedPreviewReasons(state, actor, action),
  commit: (state, attempt, action) => D.consumeAmmunition(state, attempt, action),
};
// Currency definitions come from the committed state (they rarely change); the load itself
// comes from the actor the engine passes, draft included.
const adjuster = (eff, speed) => D.encumbranceSpeed(eff, speed, area?.ctx?.state ?? null);
// Heavy ranged weapons with Dexterity under 13 (SRD): a roll reason next to long range.
const heavyReasons = (state, attacker, action) => D.heavyRollReasons(state, attacker, action);

export function register(registry) {
  area = registry;
  registry.registerStateSlice(D.ID, {
    version: D.VERSION,
    seed: (state) => D.seedSlice(state),
    normalize: D.normalizeSlice,
  });
  registry.registerStateSlice(D.ROLLS, {
    version: D.VERSION,
    undo: "preserve",
    seed: D.emptyRolls,
    normalize: D.normalizeRolls,
  });
  registry.registerStyles(new URL("./inventory-plus.css", import.meta.url));
  registry.add("sheet-tab", {
    id: "inventory",
    replaces: true,
    label: L("Inventario", "Inventory"),
    render: (ctx, actor) => renderTab(ctx, actor),
    bind: (el, ctx, actor) => bindTab(el, ctx, actor),
  });
  registry.add("table-panel", {
    id: "inventory-plus-gear",
    label: L("Armi, munizioni e oggetti", "Weapons, ammunition and items"),
    placement: "inspector",
    order: 25,
    when: (ctx, tableView) => !!inspectorActor(ctx, tableView),
    render: (ctx, tableView) => renderInspector(ctx, tableView),
    bind: (el, ctx) => bindInspector(el, ctx),
  });
  registry.add("notifications", {
    id: "inventory-plus",
    label: L("Inventario", "Inventory"),
    collect: (ctx) => collectNotifications(ctx),
  });
  // PG-75: campaign currencies in the campaign (Foundry dnd5e currency configuration) and
  // in the palette under the words a DM searches for.
  registry.add("campaign-section", {
    id: "inventory-plus-currencies",
    group: "manage",
    label: L("Valute", "Currencies"),
    description: L(
      "Valute locali della campagna: nome, sigla, cambio con l’oro, peso",
      "Campaign local currencies: name, short name, rate to gold, weight",
    ),
    order: 72,
    roles: ["dm"],
    render: (ctx) => renderCurrenciesPage(ctx),
    bind: (el, ctx) => bindCurrenciesPage(el, ctx),
  });
  registry.add("command", {
    id: "inventory-plus-currencies",
    label: L("Valute e monete della campagna", "Campaign currencies and coins"),
    description: L(
      "Crea o modifica una valuta, moneta o monete locali: nome, sigla, cambio con l’oro e peso",
      "Create or edit a local currency, coin or coins: name, short name, rate to gold and weight",
    ),
    roles: ["dm"],
    run: (ctx) => ctx.navigate("campaign", { tab: "inventory-plus-currencies" }),
  });
  registry.on("reset", () => resetViews());
  registerActionProvider(provider);
  registerSpeedAdjuster(adjuster);
  provideRollReasons(heavyReasons);
}
