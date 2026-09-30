// B38 — Spells: management, lists, comparison, rituals and items (Characters area).
//
// Entry module. It replaces the sheet's core "Magie" tab (registry sheet-tab `spells`,
// `replaces: true`) and keeps every core control inside it, through the core's own
// `data-character-action` handlers: record/end concentration, slot correction, "Cerca nella
// Biblioteca", homebrew source and revisions, a granted spell recorded by hand, and "Registra
// preparazione" for spells the class preparation does not govern. On top:
// - the D&D Beyond Spells tab header and rows (DDB-042): ability, spell attack, save DC,
//   Cast per row and "Come rituale" (+10 minutes, no slot);
// - one Cast icon that opens its level variants (BG3 CRP-100) and the dnd5e usage dialog
//   (FVT-018) with what is consumed, the Concentration warning (CRP-104/FVT-031), components
//   (Solasta II option CRP-047) and game time;
// - D&D Beyond Manage Spells (DDB-043) as the side panel with the dnd5e preparation states
//   (FVT-021) and the BG3 message on when preparation can change (CRP-018);
// - named lists recalled as a proposal with differences (MAG-03) and a side-by-side
//   comparison that returns to the choice (MAG-04);
// - spells cast from magic items with charges (dnd5e FVT-020) and copying into the wizard's
//   spellbook with time, cost and the scroll's Arcana check (BG3 "Learn Spells", CRP-018).
// Domain and rules: spells-plus-domain.mjs. Evidence:
// changes/interview-01/blueprint-spells-plus-evidence.md.

import * as D from "./spells-plus-domain.mjs";
import { rollDie } from "./state.mjs";
import { formatDistance, LABELS } from "./srd-sample.mjs";
import { homebrewAvailability, listHomebrew } from "./homebrew.mjs";
import { policyOf, sourceStates } from "./campaign-settings-domain.mjs";
import { LEGACY_ATTRIBUTION, legacySpell } from "./srd-legacy-sample.mjs";
import { icon } from "./ui.mjs";
import { formatCoins, purseOf } from "./party-stash.mjs";
import { prepareCombatAction } from "./combat-ui.mjs";
import { canControlActor } from "./character-access.mjs";

const L = (it, en) => ({ it, en });
const SETTING = "spells-plus.components";

// ---------------------------------------------------------------- UI state (per identity)

const panels = new Map();
let pendingFocus = null;
export function resetSpellsUI() {
  panels.clear();
  pendingFocus = null;
}
function panelOf(ctx, actorId) {
  const key = ctx.role + ":" + actorId;
  if (!panels.has(key))
    panels.set(key, {
      manage: false,
      tab: "prepare",
      mQuery: "",
      mLevel: "all",
      mRitual: false,
      mConc: false,
      mSources: ["srd", "homebrew", "legacy"],
      level: "all",
      preparedOnly: false,
      query: "",
      expanded: null,
      compare: [],
    });
  return panels.get(key);
}
const errorText = (ctx, error) =>
  error?.it ? ctx.t(error.it, error.en) : String(error?.message ?? error);
const componentsRule = (ctx) =>
  ctx.registry?.getSetting?.(ctx, SETTING) === "off" ? "off" : "check";
function attempt(ctx, fn) {
  try {
    return fn();
  } catch (error) {
    ctx.toast(errorText(ctx, error), true);
    return undefined;
  }
}
// A commit on the sheet: private sheets stay personal and local (offline allowed).
function commitSheet(ctx, actor, label, mutator) {
  return ctx.commit(label, mutator, D.commitOptions(actor));
}
// Drafts and saved lists are the identity's own plans: always personal and local.
function commitPersonal(ctx, label, mutator) {
  return ctx.commit(label, mutator, D.PERSONAL);
}
const rerender = (ctx, focus = null) => {
  pendingFocus = focus;
  ctx.render();
};
// A commit re-renders synchronously: the focus target must be set before it, and dropped
// when the command is refused (no render happened, so it must not leak to a later one).
function withFocus(focus, run) {
  pendingFocus = focus;
  try {
    return run();
  } catch (error) {
    pendingFocus = null;
    throw error;
  }
}

// ---------------------------------------------------------------- small views

const signed = (n) => (n === null || n === undefined ? "—" : n >= 0 ? "+" + n : "−" + Math.abs(n));
const levelName = (ctx, level) =>
  level === 0 ? ctx.t("Trucchetto", "Cantrip") : ctx.t(`Livello ${level}`, `Level ${level}`);
const ordinal = (ctx, level) => ctx.t(`${level}°`, `L${level}`);
// SV-37 (Roll20 errors that name cause and fix): a disabled command says why and what to
// do in a sentence beside it, linked by aria-describedby.
const whyId = (key) => `spl-why-${String(key).replace(/[^A-Za-z0-9_-]/g, "-")}`;
const whyNote = (ctx, key, text) =>
  `<span class="spl-why" id="${whyId(key)}">${ctx.esc(text)}</span>`;
function button(ctx, attrs, label, kind = "quiet", extra = "") {
  return `<button type="button" class="button ${kind}" ${attrs} ${extra}>${label}</button>`;
}
const AREA = {
  cone: L("Cono", "Cone"),
  sphere: L("Sfera", "Sphere"),
  cube: L("Cubo", "Cube"),
  line: L("Linea", "Line"),
  cylinder: L("Cilindro", "Cylinder"),
  emanation: L("Emanazione", "Emanation"),
};
function rangeText(ctx, entry) {
  const r = entry?.range;
  if (!r) return null;
  if (r.kind === "self") return ctx.t("Incantatore", "Self");
  if (r.kind === "touch") return ctx.t("Contatto", "Touch");
  return formatDistance(r.feet, ctx.lang);
}
function hitText(ctx, entry, profile) {
  if (entry?.attack)
    return (
      ctx.t("Attacco ", "Attack ") +
      (profile?.attack === null || profile?.attack === undefined ? "" : signed(profile.attack))
    ).trim();
  if (entry?.save)
    return `${ctx.t("TS", "Save")} ${ctx.label(LABELS.ability[entry.save.ability])}${profile?.dc ? " · " + ctx.t("CD", "DC") + " " + profile.dc : ""}`;
  return null;
}
function effectText(ctx, entry) {
  if (!entry) return null;
  const parts = (entry.damage ?? []).map(
    (d) =>
      `${d.dice} ${d.types.map((type) => ctx.label(LABELS.damageType[type] ?? L(type, type))).join("/")}`,
  );
  if (entry.healing)
    parts.push(
      `${entry.healing.dice}${entry.healing.addsSpellcastingModifier ? ctx.t(" + mod.", " + mod") : ""} ${ctx.t("cure", "healing")}`,
    );
  return parts.join(" · ") || null;
}
function componentsText(ctx, entry) {
  const c = entry?.components;
  if (!c) return null;
  const letters = [c.verbal && "V", c.somatic && "S", c.material && "M"].filter(Boolean).join(", ");
  const costly = D.COSTLY_COMPONENTS[entry.slug];
  const gp = c.materialCostGp ?? costly?.gp;
  return (
    letters +
    (gp || costly
      ? ` (${costly ? ctx.label(costly.name) : ctx.t("materiale", "material")}${gp ? " " + gp + " " + ctx.t("mo", "GP") : ""}${c.materialConsumed || costly?.consumed ? ctx.t(", consumato", ", consumed") : ""})`
      : "")
  );
}
function badges(ctx, entry) {
  if (!entry) return "";
  const b = [];
  if (entry.concentration)
    b.push(
      `<span class="spl-badge is-conc" title="${ctx.t("Concentrazione", "Concentration")}">C<span class="spl-sr"> ${ctx.t("concentrazione", "concentration")}</span></span>`,
    );
  if (entry.ritual)
    b.push(
      `<span class="spl-badge is-ritual" title="${ctx.t("Rituale", "Ritual")}">R<span class="spl-sr"> ${ctx.t("rituale", "ritual")}</span></span>`,
    );
  const c = entry.components ?? {};
  for (const [on, letter, it, en] of [
    [c.verbal, "V", "Verbale", "Verbal"],
    [c.somatic, "S", "Somatica", "Somatic"],
    [c.material, "M", "Materiale", "Material"],
  ])
    if (on)
      b.push(
        `<span class="spl-badge is-comp" title="${ctx.t(it, en)}">${letter}<span class="spl-sr"> ${ctx.t(it, en).toLowerCase()}</span></span>`,
      );
  return `<span class="spl-badges">${b.join("")}</span>`;
}
const STATE_LABEL = {
  cantrip: L("Trucchetto", "Cantrip"),
  always: L("Sempre preparata", "Always prepared"),
  prepared: L("Preparata", "Prepared"),
  book: L("Nel libro", "In the spellbook"),
  unprepared: L("Non preparata", "Not prepared"),
  absent: L("Non registrata", "Not recorded"),
};
const stateChip = (ctx, state) =>
  `<span class="spl-state is-${state}">${ctx.label(STATE_LABEL[state] ?? STATE_LABEL.absent)}</span>`;
function sourceLine(ctx, source) {
  if (!source || typeof source === "string")
    return source ? `<p class="muted spl-source">${ctx.esc(source)}</p>` : "";
  const side = source[ctx.lang === "en" ? "en" : "it"] ?? source;
  const pages = side.pages ?? source.pages ?? [];
  const url = side.url ?? source.url;
  return `<p class="muted spl-source">SRD ${ctx.esc(source.revision ?? "")} · ${ctx.esc(source.edition ?? "")} · ${ctx.t("pagine", "pages")} ${ctx.esc(pages.join(", "))} (${ctx.lang === "en" ? "EN" : "IT"})${typeof url === "string" && /^https:\/\//.test(url) ? ` · <a href="${ctx.esc(url)}" target="_blank" rel="noopener noreferrer">${ctx.t("Leggi la fonte", "Read the source")}</a>` : ""}</p>`;
}
function grantText(ctx, row) {
  if (row.grantName) return ctx.label(row.grantName);
  const [kind, id] = String(row.grantId ?? "").split(":");
  if (kind === "class")
    return ctx.t("Classe: ", "Class: ") + ctx.label(LABELS.spellClass[id] ?? L(id, id));
  if (kind === "species" && id === "elf")
    return row.lineage === "high" || row.alwaysPrepared
      ? ctx.t("Retaggio elfico (Elfo alto)", "Elven Lineage (High Elf)")
      : ctx.t("Specie: Elfo", "Species: Elf");
  if (kind === "species") return ctx.t("Specie", "Species");
  if (kind === "background") return ctx.t("Background", "Background");
  return ctx.t("Aggiunta a mano", "Added by hand");
}
function pips(ctx, available, max, labelIt, labelEn) {
  if (!Number.isInteger(max) || max <= 0 || max > 12) return "";
  const dots = Array.from(
    { length: max },
    (_, i) => `<span class="spl-pip${i < available ? " is-on" : ""}"></span>`,
  ).join("");
  return `<span class="spl-pips" role="img" aria-label="${ctx.esc(ctx.t(labelIt, labelEn))}">${dots}</span>`;
}

// ---------------------------------------------------------------- the Magie tab

export function renderSpellsTab(ctx, actorView) {
  const actor = ctx.state.actors[actorView?.id] ?? actorView;
  if (!actor) return "";
  const profile = D.casterProfile(actor);
  const editable = ctx.canControl(actor);
  const panel = panelOf(ctx, actor.id);
  const window = D.preparationWindow(ctx.state, actor.id);
  const draft = editable ? D.draftFor(ctx.state, actor.id, ctx.role) : null;
  const manageOpen = editable && profile && panel.manage;
  const heading = `<div class="section-heading spl-heading"><h2>${ctx.t("Magie", "Spells")}</h2><div class="toolbar">${
    editable && profile
      ? button(
          ctx,
          `data-spl="manage" aria-expanded="${manageOpen}" aria-controls="spl-manage"`,
          `${icon("book")} ${ctx.t("Gestisci magie", "Manage spells")}`,
          "primary",
        )
      : ""
  }${editable ? libraryButton(ctx) : ""}</div></div>`;
  return `<section class="panel spl-panel" data-spl-root="${ctx.esc(actor.id)}">${heading}${
    profile ? statsStrip(ctx, actor, profile) : noCaster(ctx, actor)
  }<div class="spl-body${manageOpen ? " has-manage" : ""}"><div class="spl-main">${profile && editable ? windowBanner(ctx, actor, profile, window) : ""}${draft ? draftBar(ctx, actor, draft) : ""}${concentrationView(ctx, actor, editable)}${slotsView(ctx, actor, editable)}${compareTray(ctx, actor, panel)}${listView(ctx, actor, profile, panel, editable)}${itemsView(ctx, actor, editable)}${editable && profile ? componentsView(ctx, actor, profile) : ""}${timeView(ctx, actor, editable)}${logView(ctx, actor, editable)}</div>${manageOpen ? manageView(ctx, actor, profile, panel, window, draft) : ""}</div></section>`;
}
function libraryButton(ctx) {
  return `<button type="button" class="button quiet" data-character-action="library" data-library-kind="spells">${ctx.t("Cerca nella Biblioteca", "Browse library")}</button>`;
}
function noCaster(ctx, actor) {
  return `<p class="muted spl-lead">${
    (actor.spells ?? []).length
      ? ctx.t(
          "Nessuna classe incantatrice registrata: le magie qui sotto vengono da altre capacità.",
          "No spellcasting class recorded: the spells below come from other features.",
        )
      : ctx.t(
          "Nessuna classe incantatrice registrata. Una magia concessa da un talento o da un oggetto si annota con «Annota magia concessa».",
          "No spellcasting class recorded. A spell granted by a feat or an item is recorded with “Record a granted spell”.",
        )
  }</p>`;
}
function statsStrip(ctx, actor, profile) {
  const counts = D.preparationCounts(actor, profile);
  const ability = profile.ability ? ctx.label(LABELS.ability[profile.ability]) : "—";
  const cell = (label, value, extra = "") =>
    `<div class="spl-stat" ${extra}><dt>${label}</dt><dd>${value}</dd></div>`;
  return `<dl class="spl-stats" aria-label="${ctx.t("Incantatore", "Spellcaster")}">${cell(
    ctx.t("Classe", "Class"),
    `${ctx.esc(ctx.label(profile.className))} ${profile.level}`,
  )}${cell(ctx.esc(ability), signed(profile.abilityMod))}${cell(
    ctx.t("Attacco con incantesimo", "Spell attack"),
    signed(profile.attack),
  )}${cell(ctx.t("CD dei tiri salvezza", "Save DC"), profile.dc ?? "—")}${cell(
    ctx.t("Preparate", "Prepared"),
    `${counts.prepared} / ${counts.quota}${counts.always ? ` <small>+${counts.always} ${ctx.t("sempre", "always")}</small>` : ""}`,
    "data-spl-prepared-count",
  )}${cell(ctx.t("Trucchetti", "Cantrips"), `${counts.cantrips} / ${counts.cantripQuota}`)}${
    profile.book
      ? cell(
          ctx.t("Libro", "Spellbook"),
          `${counts.book}${counts.bookPicks ? ` <small>+${counts.bookPicks} ${ctx.t("scelte", "choices")}</small>` : ""}`,
        )
      : ""
  }</dl>${profile.multiclass ? `<p class="muted spl-lead">${ctx.t("Multiclasse: questa scheda gestisce la preparazione della prima classe incantatrice.", "Multiclass: this sheet manages the first spellcasting class’s preparation.")}</p>` : ""}`;
}
function windowBanner(ctx, actor, profile, window) {
  const canCorrect = actor.visibility === "private" ? actor.owner === ctx.role : ctx.role === "dm";
  // Final review F10 (D&D Beyond: the spell list right under the tabs): a closed window is
  // one line; its explanation and rule sit behind «Perché?». An open window keeps its text.
  const why = `${!window.open && !canCorrect ? `<p class="muted">${ctx.t("Per un'eccezione (per esempio un riposo lungo non registrato) chiedi al DM: la registra con un motivo.", "For an exception (for example an unrecorded Long Rest) ask the DM: they record it with a reason.")}</p>` : ""}<p class="muted spl-source">${ctx.t("Regola", "Rule")}: ${ctx.t("Preparazione degli incantesimi per classe", "Spell Preparation by Class")} · SRD 5.2.1 · EN 104 / IT 118</p>`;
  return `<div class="spl-window ${window.open ? "is-open" : "is-closed"}" role="status" data-spl-window="${window.open ? "open" : "closed"}"><div><strong>${
    window.open
      ? ctx.t("Puoi cambiare le magie preparate", "You can change your prepared spells")
      : ctx.t("Preparazione non modificabile ora", "Preparation cannot change now")
  }</strong>${
    window.open
      ? `<p>${ctx.esc(ctx.label(window.message))}</p>${why}`
      : `<details class="spl-window-why"><summary>${ctx.t("Perché?", "Why?")}</summary><p>${ctx.esc(ctx.label(window.message))}</p>${why}</details>`
  }</div>${
    !window.open && canCorrect
      ? button(
          ctx,
          'data-spl="exception"',
          actor.visibility === "private"
            ? ctx.t("Correggi con motivo…", "Correct with a reason…")
            : ctx.t("Deroga del DM…", "DM exception…"),
        )
      : ""
  }</div>`;
}
function draftBar(ctx, actor, draft) {
  const p = D.previewPreparation(ctx.state, actor.id, ctx.role);
  const names = (rows, sign) =>
    rows.map((r) => `<li>${sign} ${ctx.esc(ctx.label(r.name))}</li>`).join("");
  const blocking = p.errors.filter((e) => e.code !== "no-draft");
  return `<section class="spl-draft" aria-labelledby="spl-draft-title" data-spl-draft><div class="spl-draft-head"><h3 id="spl-draft-title">${ctx.t("Modifiche non confermate", "Unconfirmed changes")}${
    draft.origin?.kind === "list"
      ? ` · ${ctx.t("dalla lista", "from list")} «${ctx.esc(draft.origin.name)}»`
      : ""
  }</h3><span class="spl-draft-count">+${p.added.length} −${p.removed.length} · ${p.count} / ${p.quota}</span></div>${
    p.added.length || p.removed.length
      ? `<ul class="spl-diff">${names(p.added, "+")}${names(p.removed, "−")}</ul>`
      : `<p class="muted">${ctx.t("Nessuna differenza dalla preparazione confermata.", "No difference from the confirmed preparation.")}</p>`
  }${
    draft.unavailable?.length
      ? `<p class="spl-warning">${ctx.t("Non disponibili nella lista", "Unavailable in the list")}: ${draft.unavailable.map((u) => `${ctx.esc(ctx.label(u.name))} (${ctx.esc(ctx.label(u.reason))})`).join(", ")}</p>`
      : ""
  }${blocking.length ? `<ul class="spl-errors" id="${whyId("confirm")}">${blocking.map((e) => `<li>${ctx.esc(ctx.t(e.it, e.en))}</li>`).join("")}</ul>` : ""}<div class="toolbar">${button(
    ctx,
    'data-spl="confirm"',
    ctx.t("Conferma preparazione", "Confirm preparation"),
    "primary",
    p.valid ? "" : `disabled aria-describedby="${whyId("confirm")}"`,
  )}${button(ctx, 'data-spl="discard"', ctx.t("Annulla modifiche", "Discard changes"))}</div>${
    !p.valid && !blocking.length
      ? `<p class="muted">${whyNote(ctx, "confirm", ctx.t("Nessuna modifica da confermare: prepara o togli una magia.", "No change to confirm: prepare or remove a spell."))}</p>`
      : ""
  }</section>`;
}
function concentrationView(ctx, actor, editable) {
  const c =
    actor.concentration && actor.concentration.active !== false ? actor.concentration : null;
  const core = (action, label) =>
    `<button type="button" class="button quiet" data-character-action="${action}">${label}</button>`;
  // F10: without a concentration effect the box is one line (D&D Beyond shows it only when
  // concentrating); the command to record one stays.
  return `<section class="concentration-summary spl-concentration${c ? "" : " is-idle"}"><h3>${ctx.t("Concentrazione", "Concentration")}</h3><p>${
    c
      ? `<strong>${ctx.esc(ctx.label(c.name))}</strong>${c.source?.kind === "spell" ? ` <span class="muted">· ${ctx.t("lanciata da questa scheda", "cast from this sheet")}</span>` : ""}`
      : ctx.t("Nessun effetto in corso.", "No effect in progress.")
  }</p>${
    editable
      ? (c ? core("end-concentration", ctx.t("Termina concentrazione", "End concentration")) : "") +
        core("record-concentration", ctx.t("Registra concentrazione", "Record concentration"))
      : ""
  }</section>`;
}
function slotsView(ctx, actor, editable) {
  const rows = D.slotPools(actor).map((p) => ({
    key: String(p.level),
    title: ctx.t("Slot di livello ", "Level ") + p.level + ctx.t("", " slots"),
    ...p,
    overused: Number.isInteger(p.used) ? Math.max(0, p.used - p.max) : null,
  }));
  if (actor.pactSlots) {
    const pool = actor.pactSlots;
    const used = Number.isInteger(pool.used) ? pool.used : null;
    rows.push({
      key: "pact",
      title: ctx.t("Magia del Patto · livello ", "Pact Magic · level ") + pool.level,
      max: pool.max,
      used,
      available: used === null ? null : Math.max(0, pool.max - used),
      overused: used === null ? null : Math.max(0, used - pool.max),
    });
  }
  if (!rows.length) return "";
  return `<div class="spl-slots">${rows
    .map(
      (p) =>
        `<div class="character-slot-summary spl-slot" data-spl-slot="${p.key}"><div><strong>${ctx.esc(p.title)}: ${p.available ?? ctx.t("Da verificare", "To verify")} / ${p.max}</strong> ${pips(ctx, p.available ?? 0, p.max, `${p.available ?? 0} disponibili su ${p.max}`, `${p.available ?? 0} available of ${p.max}`)}<p class="muted">${ctx.t("Spesi", "Spent")}: ${p.used ?? ctx.t("Non registrati", "Not recorded")}${p.overused ? " · " + ctx.t("Eccedenza conservata", "Retained overuse") + ": " + p.overused : ""}</p></div>${editable ? `<button type="button" class="button quiet" data-character-action="slots" data-pool="${p.key}">${ctx.t("Correggi risorsa", "Correct resource")}</button>` : ""}</div>`,
    )
    .join("")}</div>`;
}
function filterOf(panel, row) {
  if (panel.level !== "all" && row.level !== Number(panel.level)) return false;
  if (panel.preparedOnly && !(row.level === 0 || row.prepared || D.isAlways(row))) return false;
  return true;
}
const searchText = (row, entry) =>
  [row.name?.it ?? row.name, row.name?.en ?? "", entry?.name?.it ?? "", entry?.name?.en ?? ""]
    .join(" ")
    .toLocaleLowerCase();
function listView(ctx, actor, profile, panel, editable) {
  const rows = [...(actor.spells ?? [])].sort(
    (a, b) =>
      a.level - b.level ||
      ctx.label(a.name).localeCompare(ctx.label(b.name), ctx.lang === "en" ? "en" : "it"),
  );
  const levels = [...new Set(rows.map((r) => r.level))].sort((a, b) => a - b);
  const chip = (value, label) =>
    `<button type="button" class="spl-chip" data-spl-level="${value}" aria-pressed="${String(panel.level) === String(value)}">${label}</button>`;
  const filters = rows.length
    ? `<div class="spl-filters"><div class="spl-chips" role="group" aria-label="${ctx.t("Livello", "Level")}">${chip("all", ctx.t("Tutte", "All"))}${levels.map((l) => chip(l, l === 0 ? ctx.t("Trucchetti", "Cantrips") : ordinal(ctx, l))).join("")}</div><label class="spl-check"><input type="checkbox" data-spl-prepared-only ${panel.preparedOnly ? "checked" : ""}> ${ctx.t("Solo pronte al lancio", "Ready to cast only")}</label><label class="spl-search"><span class="spl-sr">${ctx.t("Cerca tra le magie", "Search spells")}</span><input type="search" data-spl-query value="${ctx.esc(panel.query)}" placeholder="${ctx.t("Cerca tra le magie", "Search spells")}"></label></div>`
    : "";
  const pools = D.slotPools(actor);
  const groups = levels
    .map((level) => {
      const inGroup = rows.filter((r) => r.level === level);
      const pool = pools.find((p) => p.level === level);
      return `<section class="spl-group" data-spl-group="${level}"><h3>${level === 0 ? ctx.t("Trucchetti", "Cantrips") : levelName(ctx, level)}${pool ? ` <span class="muted">· ${ctx.t("slot", "slots")} ${pool.available ?? "?"}/${pool.max}</span>` : ""}</h3><div class="item-list spl-rows">${inGroup.map((row) => rowView(ctx, actor, profile, panel, row, editable)).join("")}</div></section>`;
    })
    .join("");
  return `${filters}<div class="spl-list" data-spl-list>${
    groups ||
    `<p class="empty-state">${ctx.t("Nessuna magia annotata. Aggiungi una magia già concessa da classe, capacità o oggetto.", "No recorded spells. Add one already granted by a class, feature or item.")}</p>`
  }<p class="empty-state" data-spl-no-results hidden>${ctx.t("Nessuna magia corrisponde ai filtri.", "No spell matches the filters.")}</p></div>${
    editable
      ? `<div class="toolbar spl-list-foot"><button type="button" class="button quiet" data-character-action="add-spell">${ctx.t("Annota magia concessa", "Record a granted spell")}</button></div>`
      : ""
  }`;
}
function rowView(ctx, actor, profile, panel, row, editable) {
  const entry = D.spellEntryFor(row);
  const state = D.rowState(row, profile);
  const variants = editable ? D.castVariants(ctx.state, actor.id, row.id) : [];
  // An unprepared spell is not cast with a slot (only as a Ritual when allowed): no icon.
  const unprepared = row.level > 0 && !row.prepared && !D.isAlways(row);
  const castable = unprepared ? [] : variants.filter((v) => v.via !== "ritual");
  const ritual = variants.find((v) => v.via === "ritual");
  const expanded = panel.expanded === row.id;
  const meta = [
    entry ? D.castingTimeText(entry, ctx.lang) : null,
    entry ? rangeText(ctx, entry) : null,
    entry ? D.durationText(entry, ctx.lang) : null,
    hitText(ctx, entry, profile),
    effectText(ctx, entry),
  ].filter(Boolean);
  const inCompare = panel.compare.includes(row.id);
  const hidden =
    !filterOf(panel, row) ||
    (panel.query && !searchText(row, entry).includes(panel.query.toLocaleLowerCase()));
  const homebrew = row.homebrewRef
    ? homebrewAvailability(ctx.state, row.homebrewRef, {}, ctx.role).readable
      ? `<button type="button" class="button quiet" data-character-action="library" data-library-kind="spells" data-library-instance="${ctx.esc(row.id)}">${ctx.t("Origine e revisioni", "Source and revisions")}</button>`
      : `<span class="muted">${ctx.t("Fonte non disponibile", "Source unavailable")}</span>`
    : "";
  const castLabel =
    row.level === 0 || castable.length <= 1
      ? ctx.t("Lancia", "Cast")
      : `${ctx.t("Lancia", "Cast")} <span aria-hidden="true">▾</span>`;
  const castButton =
    editable && castable.length
      ? row.level === 0 || castable.length === 1
        ? button(
            ctx,
            `data-spl="cast" data-row="${ctx.esc(row.id)}" data-via="${castable[0].via}" data-level="${castable[0].level}"`,
            castLabel,
            "spl-cast",
            castable[0].available ? "" : `aria-describedby="spl-why-${ctx.esc(row.id)}"`,
          )
        : button(
            ctx,
            `data-spl="variants" data-row="${ctx.esc(row.id)}" aria-expanded="${expanded}" aria-controls="spl-var-${ctx.esc(row.id)}"`,
            castLabel,
            "spl-cast",
          )
      : "";
  const variantsView =
    castable.length > 1
      ? `<div class="spl-variants" id="spl-var-${ctx.esc(row.id)}" role="group" aria-label="${ctx.esc(ctx.t("Livelli di lancio di ", "Casting levels of ") + ctx.label(row.name))}" ${expanded ? "" : "hidden"}>${castable
          .map((v) =>
            button(
              ctx,
              `data-spl="cast" data-row="${ctx.esc(row.id)}" data-via="${v.via}" data-level="${v.level}"`,
              v.via === "free"
                ? ctx.t("Gratis · 1 al riposo lungo", "Free · 1 per Long Rest")
                : `${ordinal(ctx, v.level)} · ${v.remaining}/${v.max}`,
              "spl-variant",
              v.available
                ? ""
                : `disabled aria-describedby="${whyId(`${row.id}-${v.via}-${v.level}`)}"`,
            ),
          )
          .join("")}${castable
          .filter((v) => !v.available)
          .map((v) =>
            whyNote(
              ctx,
              `${row.id}-${v.via}-${v.level}`,
              `${v.via === "free" ? ctx.t("Gratis", "Free") : ordinal(ctx, v.level)}: ${ctx.label(v.reason ?? L("non disponibile: scegli un altro livello.", "unavailable: pick another level."))}`,
            ),
          )
          .join("")}</div>`
      : "";
  const why =
    editable && castable.length === 1 && !castable[0].available
      ? `<span class="spl-why" id="spl-why-${ctx.esc(row.id)}">${ctx.esc(ctx.label(castable[0].reason ?? L("Non disponibile", "Unavailable")))}</span>`
      : "";
  return `<article class="item-row spl-row" data-spl-row="${ctx.esc(row.id)}" data-context-menu="${ctx.esc(ctx.label(row.name))}" data-search="${ctx.esc(searchText(row, entry))}" ${hidden ? "hidden" : ""}><div class="spl-row-main"><div class="spl-row-title"><strong>${ctx.esc(ctx.label(row.name))}</strong>${badges(ctx, entry)}</div>${meta.length ? `<p class="spl-row-meta">${ctx.esc(meta.join(" · "))}</p>` : ""}<p class="spl-row-state">${stateChip(ctx, state)} <span class="muted">${ctx.esc(grantText(ctx, row))}</span>${row.freeCast ? ` <span class="muted">· ${D.freeUseAvailable(ctx.state, actor.id, row) ? ctx.t("1 lancio gratis disponibile", "1 free casting available") : ctx.t("lancio gratis usato", "free casting used")}</span>` : ""}</p>${why}</div><div class="toolbar spl-row-actions">${castButton}${
    editable && ritual
      ? button(
          ctx,
          `data-spl="cast" data-row="${ctx.esc(row.id)}" data-via="ritual" data-level="${row.level}"`,
          `${icon("clock")} ${ctx.t("Come rituale", "As Ritual")}`,
          "spl-ritual",
          ritual.available ? "" : `disabled aria-describedby="${whyId(`${row.id}-ritual`)}"`,
        ) + (ritual.available ? "" : whyNote(ctx, `${row.id}-ritual`, ctx.label(ritual.reason)))
      : ""
  }${button(ctx, `data-spl="detail" data-row="${ctx.esc(row.id)}"`, ctx.t("Dettagli", "Details"))}${
    // The core sheet's correction for spells the class preparation does not govern.
    editable && D.outsideClassPreparation(row, profile)
      ? `<button type="button" class="button quiet" data-character-action="prepare-spell" data-spell="${ctx.esc(row.id)}">${ctx.t("Registra preparazione", "Record preparation")}</button>`
      : ""
  }${
    entry
      ? button(
          ctx,
          `data-spl="compare" data-key="${ctx.esc(row.id)}" aria-pressed="${inCompare}"`,
          inCompare ? ctx.t("Nel confronto", "In comparison") : ctx.t("Confronta", "Compare"),
          inCompare ? "active" : "quiet",
        )
      : ""
  }${homebrew}</div>${variantsView}</article>`;
}
function compareTray(ctx, actor, panel) {
  if (!panel.compare.length) return "";
  const names = panel.compare.map((key) => compareEntry(ctx, actor, key)).filter(Boolean);
  return `<div class="spl-compare-tray" role="region" aria-label="${ctx.t("Confronto", "Comparison")}"><strong>${ctx.t("Confronto", "Comparison")} (${names.length})</strong><span>${names.map((c) => ctx.esc(ctx.label(c.name))).join(" · ")}</span><div class="toolbar">${button(
    ctx,
    'data-spl="compare-open"',
    ctx.t("Confronta", "Compare"),
    "primary",
    names.length < 2 ? `disabled aria-describedby="${whyId("compare")}"` : "",
  )}${button(ctx, 'data-spl="compare-clear"', ctx.t("Svuota", "Clear"))}</div>${
    names.length < 2
      ? whyNote(
          ctx,
          "compare",
          ctx.t(
            "Serve una seconda magia: premi «Confronta» su un’altra riga.",
            "A second spell is needed: press “Compare” on another row.",
          ),
        )
      : ""
  }</div>`;
}
function compareEntry(ctx, actor, key) {
  if (key.startsWith("srd:")) {
    const entry = D.spellBySlug(key.slice(4).split(":").pop()) ?? null;
    return entry ? { key, entry, name: entry.name, row: null } : null;
  }
  const row = (actor.spells ?? []).find((r) => r.id === key);
  return row ? { key, entry: D.spellEntryFor(row), name: row.name, row } : null;
}
function itemsView(ctx, actor, editable) {
  const sources = D.itemSources(actor);
  if (!sources.length) return "";
  return `<section class="spl-section" aria-labelledby="spl-items-title"><h3 id="spl-items-title">${ctx.t("Incantesimi dagli oggetti", "Spells from items")}</h3><p class="muted">${ctx.t("Come le attività di dnd5e: le cariche sono quelle dell'oggetto nell'inventario, mai slot; nessuna componente.", "Like dnd5e activities: charges are the item’s own in the inventory, never slots; no components.")}</p><div class="item-list">${sources
    .map((s) => {
      const cost =
        s.scaling && s.max > s.min
          ? ctx.t(
              `${s.min}–${s.max} cariche · livello ${s.spell.level} + 1 per carica in più`,
              `${s.min}–${s.max} charges · level ${s.spell.level} + 1 per extra charge`,
            )
          : ctx.t(
              `${s.min} ${s.min === 1 ? "carica" : "cariche"}`,
              `${s.min} ${s.min === 1 ? "charge" : "charges"}`,
            );
      const charges = s.charges
        ? `<span class="spl-charges">${ctx.t("Cariche", "Charges")}: <strong>${s.charges.value} / ${s.charges.max}</strong></span> ${pips(ctx, s.charges.value, s.charges.max, `${s.charges.value} cariche su ${s.charges.max}`, `${s.charges.value} of ${s.charges.max} charges`)}`
        : "";
      const enough = !s.charges || s.charges.value >= s.min;
      const blocked = s.lastCharge
        ? ctx.t("Tira prima il d20 dell'ultima carica", "Roll the last-charge d20 first")
        : !enough
          ? ctx.t(
              "Cariche insufficienti: si ricaricano come dice l’oggetto (di solito all’alba).",
              "Not enough charges: they recharge as the item says (usually at dawn).",
            )
          : s.attunement && !s.attuned
            ? ctx.t(
                "Richiede sintonia: sintonizzati con un riposo breve dall’inventario.",
                "Requires attunement: attune during a Short Rest from the inventory.",
              )
            : "";
      return `<article class="spl-item" data-spl-item="${ctx.esc(s.itemId)}" data-spl-activity="${ctx.esc(s.activityId)}"><div class="spl-row-main"><div class="spl-row-title"><strong>${ctx.esc(ctx.label(s.spell.name))}</strong>${badges(ctx, s.spell)}<span class="muted">· ${ctx.esc(ctx.label(s.row.name))}</span></div><p class="spl-row-meta">${ctx.esc([levelName(ctx, s.spell.level), D.castingTimeText(s.spell, ctx.lang), rangeText(ctx, s.spell), cost].filter(Boolean).join(" · "))}</p><p class="spl-row-state">${charges} <span class="muted">· ${ctx.t("nessuno slot", "no slot")}</span></p>${
        s.lastCharge
          ? `<p class="spl-warning">${ctx.t("Ultima carica spesa: tira un d20. Con 1 l'oggetto si distrugge.", "Last charge spent: roll a d20. On a 1 the item is destroyed.")}</p>`
          : ""
      }</div><div class="toolbar spl-row-actions">${
        editable
          ? s.lastCharge
            ? button(
                ctx,
                `data-spl="last-charge" data-item="${ctx.esc(s.itemId)}"`,
                ctx.t("Tira il d20…", "Roll the d20…"),
                "primary",
              )
            : button(
                ctx,
                `data-spl="cast-item" data-item="${ctx.esc(s.itemId)}" data-activity="${ctx.esc(s.activityId)}"`,
                ctx.t("Lancia dall'oggetto", "Cast from item"),
                "primary",
                blocked
                  ? `disabled aria-describedby="${whyId(`item-${s.itemId}-${s.activityId}`)}"`
                  : "",
              ) + (blocked ? whyNote(ctx, `item-${s.itemId}-${s.activityId}`, blocked) : "")
          : ""
      }${button(ctx, `data-spl="detail-entry" data-entry="${ctx.esc(s.spell.id)}"`, ctx.t("Dettagli", "Details"))}</div></article>`;
    })
    .join("")}</div></section>`;
}
function componentsView(ctx, actor, profile) {
  const kinds = profile.focus ?? [];
  const items = (actor.inventory ?? []).filter((r) => r.quantity > 0 && r.location !== "ground");
  const foci = items.filter((r) => r.spellFocus && [...kinds, "pouch"].includes(r.spellFocus));
  const book = items.find((r) => r.spellbook?.readable);
  const materials = items.filter((r) => Number.isFinite(r.materialValueGp));
  const rule = componentsRule(ctx);
  const focusRow = (r) =>
    `<li data-spl-focus="${ctx.esc(r.id)}"><span><strong>${ctx.esc(ctx.label(r.name))}</strong> · ${ctx.esc(ctx.label(D.FOCUS_NAMES[r.spellFocus] ?? L("focus", "focus")))} · ${r.equipped ? ctx.t("impugnato", "held") : ctx.t("non impugnato", "not held")}</span>${
      r.spellFocus === "pouch"
        ? ""
        : button(
            ctx,
            `data-spl="hold" data-item="${ctx.esc(r.id)}" aria-pressed="${!!r.equipped}"`,
            r.equipped ? ctx.t("Riponi", "Put away") : ctx.t("Impugna", "Hold"),
          )
    }</li>`;
  return `<section class="spl-section spl-components" aria-labelledby="spl-comp-title"><h3 id="spl-comp-title">${ctx.t("Focus e componenti", "Focus and components")}</h3><p class="muted">${
    rule === "off"
      ? ctx.t(
          "Regola della tavola: componenti non verificate (scelta del DM nelle Preferenze).",
          "Table rule: components not checked (the DM’s choice in Preferences).",
        )
      : ctx.t(
          "Regola della tavola: componenti verificate prima del lancio (il DM la cambia nelle Preferenze).",
          "Table rule: components checked before casting (the DM changes it in Preferences).",
        )
  }</p><ul class="spl-focus-list">${foci.map(focusRow).join("") || `<li>${ctx.t("Nessun focus registrato", "No focus recorded")} (${kinds.map((k) => ctx.label(D.FOCUS_NAMES[k])).join(ctx.t(" o ", " or "))}).</li>`}${
    book && !foci.includes(book)
      ? `<li><span><strong>${ctx.esc(ctx.label(book.name))}</strong> · ${ctx.t("leggibile: serve per i rituali dal libro", "readable: needed for Rituals from the book")}${kinds.includes("spellbook") ? ctx.t(" e vale come focus se impugnato", " and works as a focus when held") : ""}</span>${kinds.includes("spellbook") ? button(ctx, `data-spl="hold" data-item="${ctx.esc(book.id)}" aria-pressed="${!!book.equipped}"`, book.equipped ? ctx.t("Riponi", "Put away") : ctx.t("Impugna", "Hold")) : ""}</li>`
      : ""
  }${materials.map((r) => `<li><span><strong>${ctx.esc(ctx.label(r.name))}</strong> × ${r.quantity} · ${ctx.t("materiale da", "material worth")} ${r.materialValueGp} ${ctx.t("mo", "GP")}</span></li>`).join("")}</ul><div class="toolbar">${button(ctx, 'data-spl="material"', ctx.t("Registra materiale di valore…", "Record a costly material…"))}</div></section>`;
}
function timeView(ctx, actor, editable) {
  const clock = D.clockFor(ctx.state, actor);
  const requests = D.pendingTimeRequests(ctx.state).filter((r) => r.actorId === actor.id);
  const casts = D.readSlice(ctx.state).casts.filter((c) => c.actorId === actor.id && c.time);
  const copies = D.readSlice(ctx.state).transcriptions.filter((c) => c.actorId === actor.id);
  if (!requests.length && !casts.length && !copies.length && !clock.seconds) return "";
  return `<section class="spl-section" aria-labelledby="spl-time-title"><h3 id="spl-time-title">${ctx.t("Tempo di gioco", "Game time")}</h3><p data-spl-clock>${
    clock.shared
      ? ctx.t("Orologio della campagna", "Campaign clock")
      : ctx.t("Orologio personale di ", "Personal clock of ") + ctx.esc(actor.name)
  }: <strong>${D.clockText(clock.seconds, ctx.lang)}</strong></p>${requests
    .map(
      (r) =>
        `<div class="spl-request" data-spl-request="${ctx.esc(r.id)}"><span>${ctx.esc(ctx.label(r.reason))} · <strong>+${D.secondsText(r.seconds, ctx.lang)}</strong> · ${ctx.t("in attesa del DM", "waiting for the DM")}</span>${
          ctx.role === "dm"
            ? `<span class="toolbar">${button(ctx, `data-spl="time-apply" data-request="${ctx.esc(r.id)}"`, ctx.t("Avanza di ", "Advance ") + D.secondsText(r.seconds, ctx.lang), "primary")}${button(ctx, `data-spl="time-dismiss" data-request="${ctx.esc(r.id)}"`, ctx.t("Rifiuta…", "Decline…"))}</span>`
            : ""
        }</div>`,
    )
    .join("")}</section>`;
}
const VIA = {
  slot: L("slot", "slot"),
  pact: L("slot del patto", "pact slot"),
  ritual: L("come rituale", "as a Ritual"),
  free: L("gratis (retaggio)", "free (lineage)"),
  item: L("dall'oggetto", "from the item"),
  cantrip: L("trucchetto", "cantrip"),
};
function castLine(ctx, c) {
  const parts = [`<strong>${ctx.esc(ctx.label(c.name))}</strong>`];
  if (c.via === "slot" || c.via === "pact")
    parts.push(`${ctx.label(VIA[c.via])} ${ordinal(ctx, c.slotLevel)}`);
  else if (c.via === "item")
    parts.push(
      `${ctx.esc(ctx.label(c.itemName))} · ${c.charges} ${ctx.t(c.charges === 1 ? "carica" : "cariche", c.charges === 1 ? "charge" : "charges")} · ${levelName(ctx, c.level).toLowerCase()}`,
    );
  else parts.push(ctx.label(VIA[c.via] ?? L(c.via, c.via)));
  if (c.roll)
    parts.push(
      `${c.roll.dice.map((d) => d.count + "d" + d.sides).join(" + ")}${c.roll.modifier ? " + " + c.roll.modifier : ""}: ${c.roll.values.join(", ")} = <strong>${c.roll.total}</strong> (${c.roll.mode === "physical" ? ctx.t("dadi fisici", "physical dice") : ctx.t("dadi digitali", "digital dice")}${c.roll.reused ? ", " + ctx.t("Riusato", "Reused") : ""})`,
    );
  if (c.time) {
    // A request to the DM: the line follows the DM's answer (applied or declined).
    const request = c.time.requestId
      ? D.readSlice(ctx.state).timeRequests.find((r) => r.id === c.time.requestId)
      : null;
    const plus = `+${D.secondsText(c.time.seconds, ctx.lang)}`;
    parts.push(
      c.time.applied
        ? `${plus} (${D.clockText(c.time.before, ctx.lang)} → ${D.clockText(c.time.after, ctx.lang)})`
        : request?.status === "applied"
          ? `${plus} ${ctx.t("applicati dal DM", "applied by the DM")} (${D.clockText(request.before, ctx.lang)} → ${D.clockText(request.after, ctx.lang)})`
          : request?.status === "dismissed"
            ? `${plus} ${ctx.t("rifiutati dal DM", "declined by the DM")}: ${ctx.esc(request.reason?.dismissed ?? "")}`
            : `${plus} ${ctx.t("richiesti al DM", "requested from the DM")}`,
    );
  }
  if (c.replaced)
    parts.push(
      ctx.t("termina la concentrazione su ", "ends Concentration on ") +
        ctx.esc(ctx.label(c.replaced.name)),
    );
  if (c.material) parts.push(ctx.t("consuma ", "consumes ") + ctx.esc(ctx.label(c.material.name)));
  if (c.override)
    parts.push(ctx.t("deroga del DM: ", "DM exception: ") + ctx.esc(c.override.reason));
  return parts.join(" · ");
}
function logView(ctx, actor, editable) {
  const s = D.readSlice(ctx.state);
  const casts = s.casts
    .filter((c) => c.actorId === actor.id)
    .slice(-5)
    .reverse();
  const copies = s.transcriptions
    .filter((c) => c.actorId === actor.id)
    .slice(-3)
    .reverse();
  if (!casts.length && !copies.length) return "";
  const undoLabel = ctx.undoLabel?.() ?? "";
  return `<section class="spl-section" aria-labelledby="spl-log-title"><h3 id="spl-log-title">${ctx.t("Ultimi lanci e trascrizioni", "Latest castings and copies")}</h3><ul class="spl-log">${casts
    .map((c) => `<li data-spl-cast-log="${ctx.esc(c.id)}">${castLine(ctx, c)}</li>`)
    .join("")}${copies
    .map(
      (c) =>
        `<li data-spl-copy-log="${ctx.esc(c.id)}"><strong>${ctx.esc(ctx.label(c.name))}</strong> · ${
          c.success
            ? ctx.t("copiata nel libro", "copied into the spellbook")
            : ctx.t("copia fallita, pergamena distrutta", "copy failed, scroll destroyed")
        } · ${c.hours} ${ctx.t("ore", "hours")} · ${c.gp} ${ctx.t("mo", "GP")}${
          c.check
            ? ` · ${ctx.t("Arcano", "Arcana")} ${c.check.face} ${signed(c.check.modifier)} = ${c.check.total} ${ctx.t("contro CD", "vs DC")} ${c.check.dc} (${c.check.mode === "physical" ? ctx.t("dado fisico", "physical die") : ctx.t("dado digitale", "digital die")}${c.check.reused ? ", " + ctx.t("Riusato", "Reused") : ""})`
            : ""
        }</li>`,
    )
    .join("")}</ul>${
    editable && ctx.canUndo?.() && undoLabel
      ? `<div class="toolbar"><button type="button" class="button quiet" data-character-action="undo">${icon("undo")} ${ctx.t("Annulla", "Undo")}: ${ctx.esc(undoLabel)}</button></div>`
      : ""
  }</section>`;
}

// ---------------------------------------------------------------- Manage spells (DDB-043)

function manageView(ctx, actor, profile, panel, window, draft) {
  const counts = D.preparationCounts(actor, profile, draft?.keys ?? null);
  const tabs = [
    ["prepare", profile.book ? ctx.t("Libro", "Spellbook") : ctx.t("Preparate", "Prepared")],
    ["class", ctx.t("Lista di classe", "Class list")],
    ["lists", ctx.t("Liste salvate", "Saved lists")],
    ...(profile.book ? [["copy", ctx.t("Trascrivi", "Copy spells")]] : []),
  ];
  const tab = tabs.some(([id]) => id === panel.tab) ? panel.tab : "prepare";
  const body =
    tab === "class"
      ? classTab(ctx, actor, profile, panel, window)
      : tab === "lists"
        ? listsTab(ctx, actor, window)
        : tab === "copy"
          ? copyTab(ctx, actor, profile)
          : prepareTab(ctx, actor, profile, window, draft);
  return `<aside class="spl-manage" id="spl-manage" aria-labelledby="spl-manage-title"><div class="spl-manage-head"><h3 id="spl-manage-title">${ctx.t("Gestisci magie", "Manage spells")}</h3><button type="button" class="icon-button" data-spl="manage-close" aria-label="${ctx.t("Chiudi gestione magie", "Close spell management")}">${icon("close")}</button></div><p class="muted">${ctx.esc(ctx.label(profile.className))} ${profile.level} · ${ctx.t("Preparate", "Prepared")} <strong data-spl-manage-count>${counts.prepared} / ${counts.quota}</strong> · ${ctx.t("Trucchetti", "Cantrips")} ${counts.cantrips} / ${counts.cantripQuota}${profile.book ? ` · ${ctx.t("Libro", "Spellbook")} ${counts.book}${counts.bookPicks ? ` (${counts.bookPicks} ${ctx.t("scelte di livello libere", "free level choices")})` : ""}` : ""}</p><p class="spl-window-line ${window.open ? "is-open" : "is-closed"}" id="spl-window-line">${ctx.esc(ctx.label(window.message))}</p><nav class="tabs spl-manage-tabs" aria-label="${ctx.t("Sezioni della gestione", "Management sections")}">${tabs
    .map(
      ([id, label]) =>
        `<button type="button" data-spl-tab="${id}" class="${id === tab ? "active" : ""}" ${id === tab ? 'aria-current="page"' : ""}>${ctx.esc(label)}</button>`,
    )
    .join("")}</nav><div class="spl-manage-body">${body}</div></aside>`;
}
function toggleButton(ctx, key, on, window, reason) {
  if (reason)
    return `<span class="spl-lock" title="${ctx.esc(ctx.label(reason))}">${icon("check")} ${ctx.esc(ctx.label(reason))}</span>`;
  return button(
    ctx,
    `data-spl="toggle" data-key="${ctx.esc(key)}" data-want="${on ? "0" : "1"}" aria-pressed="${on}"`,
    on ? ctx.t("Togli", "Unprepare") : ctx.t("Prepara", "Prepare"),
    on ? "active" : "",
    window.open ? "" : `disabled aria-describedby="spl-window-line"`,
  );
}
function prepareTab(ctx, actor, profile, window, draft) {
  const keys = new Set(draft?.keys ?? D.currentKeys(actor));
  const rows = (actor.spells ?? [])
    .filter((r) => r.level >= 1)
    .sort((a, b) => a.level - b.level || ctx.label(a.name).localeCompare(ctx.label(b.name)));
  const newKeys = [...keys].filter((k) => k.startsWith("srd:"));
  return `<p class="muted">${
    profile.book
      ? ctx.t(
          "Prepari le magie del tuo libro; quelle sempre preparate non contano nel limite.",
          "You prepare spells from your spellbook; always-prepared spells do not count.",
        )
      : ctx.t(
          "Prepari le magie della lista della classe; quelle sempre preparate non contano nel limite.",
          "You prepare spells from your class list; always-prepared spells do not count.",
        )
  }</p><ul class="spl-manage-list">${rows
    .map((row) => {
      const on = keys.has(row.id);
      const state = D.isAlways(row)
        ? "always"
        : on
          ? "prepared"
          : D.rowState({ ...row, prepared: false }, profile);
      const lock = D.lockReason(row, profile);
      return `<li data-spl-manage-row="${ctx.esc(row.id)}"><div><strong>${ctx.esc(ctx.label(row.name))}</strong> <span class="muted">${ordinal(ctx, row.level)}</span> ${stateChip(ctx, state)}${D.isAlways(row) ? `<small class="muted"> · ${ctx.esc(grantText(ctx, row))}</small>` : ""}</div>${toggleButton(ctx, row.id, on, window, lock)}</li>`;
    })
    .join("")}${newKeys
    .map((key) => {
      const entry = D.spellBySlug(key.split(":").pop());
      return entry
        ? `<li data-spl-manage-row="${ctx.esc(key)}"><div><strong>${ctx.esc(ctx.label(entry.name))}</strong> <span class="muted">${ordinal(ctx, entry.level)}</span> ${stateChip(ctx, "prepared")} <small class="muted">· ${ctx.t("nuova", "new")}</small></div>${toggleButton(ctx, key, true, window, null)}</li>`
        : "";
    })
    .join("")}</ul>`;
}
// PG-53 (D&D Beyond «Manage Spells» source chips): the class list's sources. SRD 2024 is the
// campaign's base; homebrew spells count when enabled in the campaign for this sheet; legacy
// 2014 follows the campaign's source rule (blocked, with its reason, when not allowed).
function homebrewSpells(ctx, actor) {
  try {
    return listHomebrew(ctx.state, ctx.role)
      .filter((content) => content.type === "spell")
      .filter(
        (content) =>
          homebrewAvailability(ctx.state, content.latestRef, { actorId: actor.id }, ctx.role)
            .canUse,
      )
      .map((content) => {
        const data = ctx.state.library
          ?.find((c) => c.id === content.id)
          ?.revisions.find((r) => r.id === content.latestRef.revisionId)?.data;
        return {
          id: content.id,
          revisionId: content.latestRef.revisionId,
          name: content.name,
          level: Number.isInteger(data?.fields?.level) ? data.fields.level : null,
          school: data?.fields?.school ?? null,
        };
      });
  } catch {
    return [];
  }
}
function legacyState(ctx) {
  const slice = ctx.state.ext?.["campaign-settings"];
  if (!slice || !ctx.state.campaign?.id) return { allowed: false, reason: null };
  try {
    const row = sourceStates(ctx.state, policyOf(slice, ctx.state.campaign.id)).find(
      (entry) => entry.id === "legacy-2014",
    );
    return { allowed: row?.status === "available", reason: row?.locked ?? null };
  } catch {
    return { allowed: false, reason: null };
  }
}
function sourceChips(ctx, panel, homebrew, legacy) {
  const on = (id) => panel.mSources.includes(id);
  const chip = (id, label, disabled, title = "") =>
    `<button type="button" class="spl-chip" data-spl="source" data-spl-source="${id}" data-source="${id}" aria-pressed="${!disabled && on(id)}"${disabled ? ` disabled aria-describedby="${whyId(`source-${id}`)}"` : ""}>${label}</button>`;
  const legacyReason = legacy.allowed
    ? ctx.t(
        "Le versioni 2014 (SRD 5.1) stanno accanto alle 2024, che restano quelle predefinite.",
        "The 2014 versions (SRD 5.1) sit beside the 2024 ones, which stay the default.",
      )
    : ctx.label(
        legacy.reason ?? {
          it: "La campagna usa le regole 2024: le versioni 2014 non sono ammesse.",
          en: "The campaign uses the 2024 rules: 2014 versions are not allowed.",
        },
      );
  // One usable source only: a plain line, never a chip that filters nothing (review B38).
  if (!homebrew.length && !legacy.allowed)
    return `<p class="muted spl-source" data-spl-origins>${ctx.t("Fonte", "Source")}: <strong>SRD 5.2.1 · 2024</strong> · ${ctx.t("Homebrew della campagna: nessuna magia attivata", "Campaign homebrew: no spell enabled")} · ${ctx.t("Legacy 2014", "Legacy 2014")}: ${ctx.esc(legacyReason)}</p>`;
  return `<div class="spl-chips spl-source-chips" role="group" aria-label="${ctx.t("Fonti", "Sources")}"><span class="spl-chips-label">${ctx.t("Fonti", "Sources")}</span>${chip("srd", "SRD 2024", false)}${chip("homebrew", `${ctx.t("Homebrew della campagna", "Campaign homebrew")} (${homebrew.length})`, !homebrew.length)}${chip("legacy", ctx.t("Legacy 2014", "Legacy 2014"), !legacy.allowed)}</div>${homebrew.length ? "" : `<p class="muted spl-source">${whyNote(ctx, "source-homebrew", ctx.t("Homebrew della campagna: nessuna magia attivata per questa scheda; il DM la abilita dalla Biblioteca.", "Campaign homebrew: no spell enabled for this sheet; the DM enables it from the Library."))}</p>`}<p class="muted spl-source" data-spl-legacy-note id="${whyId("source-legacy")}">${ctx.t("Legacy 2014", "Legacy 2014")}: ${ctx.esc(legacyReason)}${legacy.allowed ? "" : ctx.t(" Il DM le attiva in Impostazioni › Fonti.", " The DM turns them on in Settings › Sources.")}</p>`;
}
/** Manage spells › «Lista di classe» for one sheet; `legacy` is the C4 state (tests pass it). */
export function renderClassList(ctx, actorId, legacy = legacyState(ctx)) {
  const actor = ctx.state.actors?.[actorId];
  const profile = D.casterProfile(actor);
  if (!profile) return "";
  const window = D.preparationWindow(ctx.state, actorId);
  return classTab(ctx, actor, profile, panelOf(ctx, actorId), window, legacy);
}
function classTab(ctx, actor, profile, panel, window, legacy = legacyState(ctx)) {
  const homebrew = homebrewSpells(ctx, actor);
  const showSrd = panel.mSources.includes("srd");
  const needle = String(panel.mQuery ?? "")
    .toLocaleLowerCase()
    .trim();
  const homebrewRows = panel.mSources.includes("homebrew")
    ? homebrew.filter(
        (row) =>
          (panel.mLevel === "all" || row.level === Number(panel.mLevel)) &&
          (!needle || ctx.label(row.name).toLocaleLowerCase().includes(needle)),
      )
    : [];
  // PG-53: the 2014 version of a spell sits right after its 2024 row.
  const legacyRows = new Map(
    legacy.allowed && panel.mSources.includes("legacy")
      ? D.legacyOptions(ctx.state, actor.id, { allowed: true }).map((row) => [row.entry.slug, row])
      : [],
  );
  // With «SRD 2024» off the 2014 rows stand on their own (D&D Beyond source toggles) and
  // carry the spell's own learn/prepare control (`action`).
  const legacyRow = (entry, action = "") => {
    const row = legacyRows.get(entry.slug);
    if (!row) return "";
    const chosen = row.chosen;
    return `<li class="spl-legacy-row${action ? " is-alone" : ""}" data-spl-legacy-row="${ctx.esc(entry.slug)}"><div><strong>${ctx.esc(ctx.label(entry.name))}</strong> <span class="badge spl-legacy-badge">${ctx.t("Legacy 2014", "Legacy 2014")}</span> <span class="muted">SRD 5.1</span>${chosen ? ` <span class="spl-state spl-state-legacy">${ctx.t("Scelta per questo personaggio", "Chosen for this character")}</span>` : ""}<p class="muted spl-legacy-summary">${ctx.esc(ctx.label(row.legacy.summary))}</p><details class="spl-legacy-changes"><summary>${ctx.t("Cosa cambia", "What changes")}</summary><p>${ctx.esc(ctx.label(row.legacy.changes))}</p><p class="muted">${ctx.t("I tiri automatici del Tavolo usano i valori 2024: applica queste differenze a mano.", "The Table’s automatic rolls use the 2024 values: apply these differences by hand.")}</p></details></div><div class="toolbar">${action}${button(ctx, `data-spl="legacy-choose" data-slug="${ctx.esc(entry.slug)}" aria-pressed="${chosen}"`, chosen ? ctx.t("Torna alla 2024", "Back to 2024") : ctx.t("Preferisci la 2014", "Prefer 2014"))}</div></li>`;
  };
  const options =
    !showSrd && !legacyRows.size
      ? []
      : D.classSpellOptions(ctx.state, actor.id, {
          query: panel.mQuery,
          level: panel.mLevel === "all" ? "all" : Number(panel.mLevel),
          ritual: panel.mRitual,
          concentration: panel.mConc,
          lang: ctx.lang,
        });
  const counts = D.preparationCounts(actor, profile);
  const draft = D.draftFor(ctx.state, actor.id, ctx.role);
  const keys = new Set(draft?.keys ?? D.currentKeys(actor));
  const levels = [0, ...Array.from({ length: 9 }, (_, i) => i + 1)].filter((l) =>
    D.classSpellOptions(ctx.state, actor.id, {}).some((o) => o.entry.level === l),
  );
  const chip = (value, label) =>
    `<button type="button" class="spl-chip" data-spl-mlevel="${value}" aria-pressed="${String(panel.mLevel) === String(value)}">${label}</button>`;
  const actionFor = (o) => {
    const { entry, row, reachable } = o;
    if (!reachable)
      return `<span class="spl-lock">${ctx.t(`Serve uno slot di livello ${entry.level}`, `Needs a level ${entry.level} slot`)}</span>`;
    if (entry.level === 0)
      return row
        ? `<span class="spl-lock">${ctx.t("Conosciuto", "Known")}</span>`
        : button(
            ctx,
            `data-spl="learn" data-entry="${ctx.esc(entry.id)}"`,
            ctx.t("Impara", "Learn"),
            "",
            counts.cantrips >= profile.cantripQuota
              ? `disabled aria-describedby="${whyId("cantrips-full")}"`
              : "",
          );
    if (profile.book && (!row || !D.isBookRow(row, profile))) {
      if (row && D.isAlways(row))
        return `<span class="spl-lock">${ctx.t("Sempre preparata", "Always prepared")}</span>`;
      return counts.bookPicks > 0
        ? button(
            ctx,
            `data-spl="add-book" data-entry="${ctx.esc(entry.id)}"`,
            ctx.t("Aggiungi al libro", "Add to spellbook"),
          )
        : button(
            ctx,
            `data-spl="transcribe" data-entry="${ctx.esc(entry.id)}"`,
            ctx.t("Trascrivi…", "Copy…"),
          );
    }
    if (row) return toggleButton(ctx, row.id, keys.has(row.id), window, D.lockReason(row, profile));
    return toggleButton(ctx, "srd:" + entry.id, keys.has("srd:" + entry.id), window, null);
  };
  const rowsHTML = showSrd
    ? options
        .map(
          (o) =>
            `<li data-spl-class-row="${ctx.esc(o.entry.slug)}"><div><strong>${ctx.esc(ctx.label(o.entry.name))}</strong> ${badges(ctx, o.entry)}${legacyRows.has(o.entry.slug) ? ` <span class="badge">2024</span>` : ""} <span class="muted">${ctx.esc(levelName(ctx, o.entry.level))} · ${ctx.esc(ctx.label(LABELS.school[o.entry.school]))}</span> ${stateChip(ctx, o.state)}</div><div class="toolbar">${actionFor(o)}${button(ctx, `data-spl="compare" data-key="srd:${ctx.esc(o.entry.slug)}" aria-pressed="${panel.compare.includes("srd:" + o.entry.slug)}"`, panel.compare.includes("srd:" + o.entry.slug) ? ctx.t("Nel confronto", "In comparison") : ctx.t("Confronta", "Compare"), panel.compare.includes("srd:" + o.entry.slug) ? "active" : "quiet")}${button(ctx, `data-spl="detail-entry" data-entry="${ctx.esc(o.entry.id)}"`, ctx.t("Dettagli", "Details"))}</div></li>${legacyRow(o.entry)}`,
        )
        .join("")
    : options.map((o) => legacyRow(o.entry, actionFor(o))).join("");
  return `<div class="spl-manage-filters"><label class="spl-search"><span class="spl-sr">${ctx.t("Cerca nella lista della classe", "Search the class list")}</span><input type="search" data-spl-mquery value="${ctx.esc(panel.mQuery)}" placeholder="${ctx.t("Cerca per nome", "Search by name")}"></label><div class="spl-chips" role="group" aria-label="${ctx.t("Livello", "Level")}">${chip("all", ctx.t("Tutti", "All"))}${levels.map((l) => chip(l, l === 0 ? ctx.t("Trucchetti", "Cantrips") : ordinal(ctx, l))).join("")}</div><div class="spl-check-row"><label class="spl-check"><input type="checkbox" data-spl-mflag="mRitual" ${panel.mRitual ? "checked" : ""}> ${ctx.t("Rituali", "Rituals")}</label><label class="spl-check"><input type="checkbox" data-spl-mflag="mConc" ${panel.mConc ? "checked" : ""}> ${ctx.t("Concentrazione", "Concentration")}</label></div>${sourceChips(ctx, panel, homebrew, legacy)}</div><ul class="spl-manage-list" data-spl-class-list>${homebrewRows
    .map(
      (row) =>
        `<li data-spl-homebrew-row="${ctx.esc(row.id)}"><div><strong>${ctx.esc(ctx.label(row.name))}</strong> <span class="badge spl-homebrew-badge">${ctx.t("Homebrew", "Homebrew")}</span> <span class="muted">${row.level == null ? "" : ctx.esc(levelName(ctx, row.level))}${row.school && LABELS.school[row.school] ? " · " + ctx.esc(ctx.label(LABELS.school[row.school])) : ""}</span></div><div class="toolbar">${button(ctx, `data-spl="add-homebrew" data-content="${ctx.esc(row.id)}" data-revision="${ctx.esc(row.revisionId)}"`, ctx.t("Rivedi e aggiungi", "Review and add"), "primary")}</div></li>`,
    )
    .join("")}${
    rowsHTML ||
    (homebrewRows.length
      ? ""
      : `<li class="muted">${ctx.t("Nessuna magia con questi filtri.", "No spell with these filters.")}</li>`)
  }</ul>${
    counts.cantrips >= profile.cantripQuota
      ? `<p class="muted">${whyNote(ctx, "cantrips-full", ctx.t("Trucchetti al completo: puoi sostituirne uno quando sali di livello.", "Cantrips full: you can replace one when you gain a level."))}</p>`
      : ""
  }${legacyRows.size ? `<p class="muted spl-legacy-attribution" data-spl-legacy-attribution>${ctx.esc(ctx.label(LEGACY_ATTRIBUTION))}</p>` : ""}`;
}
function listsTab(ctx, actor, window) {
  const lists = D.listsFor(ctx.state, actor.id, ctx.role);
  return `<p class="muted">${ctx.t("Una lista salva le magie preparate con un nome. Richiamarla propone le differenze: nulla cambia finché non confermi.", "A list saves your prepared spells under a name. Recalling it proposes the differences: nothing changes until you confirm.")}</p><form class="spl-list-form" data-spl-save-list><label class="field"><span>${ctx.t("Nome della lista", "List name")}</span><input name="name" maxlength="60" required placeholder="${ctx.t("Es. Esplorazione", "E.g. Exploration")}"></label><button type="submit" class="button primary">${ctx.t("Salva le preparate come lista", "Save prepared as a list")}</button></form><ul class="spl-manage-list spl-saved">${
    lists
      .map(
        (l) =>
          `<li data-spl-saved="${ctx.esc(l.id)}"><div><strong>${ctx.esc(l.name)}</strong> <span class="muted">· ${l.refs.length} ${ctx.t("magie", "spells")} · ${ctx.esc(new Date(l.savedAt).toLocaleString(ctx.lang === "en" ? "en-GB" : "it-IT", { dateStyle: "short", timeStyle: "short" }))}</span></div><div class="toolbar">${button(ctx, `data-spl="list-recall" data-list="${ctx.esc(l.id)}"`, ctx.t("Richiama", "Recall"), "primary")}${button(ctx, `data-spl="list-update" data-list="${ctx.esc(l.id)}"`, ctx.t("Aggiorna", "Update"))}${button(ctx, `data-spl="list-delete" data-list="${ctx.esc(l.id)}"`, ctx.t("Elimina", "Delete"), "danger")}</div></li>`,
      )
      .join("") || `<li class="muted">${ctx.t("Nessuna lista salvata.", "No saved list.")}</li>`
  }</ul>${window.open ? "" : `<p class="muted">${ctx.t("Puoi vedere le differenze di una lista anche ora; per usarla serve il momento in cui la preparazione cambia.", "You can see a list’s differences now; using it needs the moment when preparation can change.")}</p>`}`;
}
function copyTab(ctx, actor, profile) {
  const scrolls = D.scrollsOf(actor).filter((r) => {
    const entry = D.spellBySlug(String(r.spellScroll.spellId).split(":").pop());
    return entry?.classes.includes("wizard");
  });
  const purse = purseOf(actor);
  const missing = D.classSpellOptions(ctx.state, actor.id, {}).filter(
    (o) =>
      o.entry.level >= 1 &&
      o.reachable &&
      (!o.row || !D.isBookRow(o.row, profile)) &&
      !(o.row && D.isAlways(o.row)),
  );
  return `<p class="muted">${ctx.t("Copiare una magia da mago nel libro richiede 2 ore e 50 mo per livello. Da una pergamena serve anche una prova di Intelligenza (Arcano) con CD 10 + livello: la pergamena si distrugge comunque.", "Copying a Wizard spell into the book takes 2 hours and 50 GP per level. From a scroll you also need an Intelligence (Arcana) check, DC 10 + level: the scroll is destroyed either way.")}</p><p>${ctx.t("Monete", "Coins")}: <strong data-spl-purse>${ctx.esc(formatCoins(purse, ctx.lang))}</strong></p><h4>${ctx.t("Pergamene nell'inventario", "Scrolls in the inventory")}</h4><ul class="spl-manage-list">${
    scrolls
      .map((r) => {
        const entry = D.spellBySlug(String(r.spellScroll.spellId).split(":").pop());
        return `<li data-spl-scroll="${ctx.esc(r.id)}"><div><strong>${ctx.esc(ctx.label(r.name))}</strong> <span class="muted">· ${ctx.esc(levelName(ctx, entry.level))} · ${2 * entry.level} ${ctx.t("ore", "hours")} · ${50 * entry.level} ${ctx.t("mo", "GP")} · ${ctx.t("CD", "DC")} ${10 + entry.level}</span></div>${button(ctx, `data-spl="transcribe" data-entry="${ctx.esc(entry.id)}" data-scroll="${ctx.esc(r.id)}"`, ctx.t("Trascrivi dalla pergamena…", "Copy from the scroll…"), "primary")}</li>`;
      })
      .join("") ||
    `<li class="muted">${ctx.t("Nessuna pergamena da mago.", "No Wizard scroll.")}</li>`
  }</ul><h4>${ctx.t("Da un'altra fonte trovata", "From another source you found")}</h4><form class="spl-list-form" data-spl-copy-form><label class="field"><span>${ctx.t("Magia", "Spell")}</span><select name="entry">${missing.map((o) => `<option value="${ctx.esc(o.entry.id)}">${ctx.esc(ctx.label(o.entry.name))} · ${ordinal(ctx, o.entry.level)}</option>`).join("")}</select></label><button type="submit" class="button">${ctx.t("Trascrivi…", "Copy…")}</button></form>`;
}

// ---------------------------------------------------------------- dialogs

function detailBody(ctx, actor, entry, row) {
  const profile = D.casterProfile(actor);
  const facts = [
    [
      ctx.t("Livello", "Level"),
      entry ? levelName(ctx, entry.level) : row ? levelName(ctx, row.level) : null,
    ],
    [ctx.t("Scuola", "School"), entry ? ctx.label(LABELS.school[entry.school]) : null],
    [
      ctx.t("Tempo di lancio", "Casting time"),
      entry
        ? D.castingTimeText(entry, ctx.lang) +
          (entry.ritual ? ctx.t(" o rituale", " or Ritual") : "")
        : null,
    ],
    [ctx.t("Gittata", "Range"), rangeText(ctx, entry)],
    [
      ctx.t("Area", "Area"),
      entry?.area
        ? `${ctx.label(AREA[entry.area.shape] ?? L(entry.area.shape, entry.area.shape))} ${formatDistance(entry.area.feet, ctx.lang)}`
        : null,
    ],
    [ctx.t("Componenti", "Components"), componentsText(ctx, entry)],
    [
      ctx.t("Durata", "Duration"),
      entry
        ? D.durationText(entry, ctx.lang) +
          (entry.concentration ? ctx.t(" · concentrazione", " · Concentration") : "")
        : null,
    ],
    [ctx.t("Tiro", "Roll"), hitText(ctx, entry, profile)],
    [ctx.t("Effetto", "Effect"), effectText(ctx, entry)],
  ].filter(([, v]) => v);
  return `${row ? `<p>${stateChip(ctx, D.rowState(row, profile))} <span class="muted">${ctx.esc(grantText(ctx, row))}</span></p>` : ""}<dl class="spl-facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${ctx.esc(v)}</dd></div>`).join("")}</dl>${
    entry
      ? `<p>${ctx.esc(ctx.label(entry.summary))}</p>${entry.scaling === "slot" ? `<p class="muted">${ctx.t("Livelli superiori: l'effetto cambia solo come scritto sopra.", "Higher levels: the effect changes only as written above.")}</p>` : ""}${sourceLine(ctx, entry.source)}`
      : `<p class="character-multiline">${ctx.esc(ctx.label(row?.description ?? ""))}</p>${sourceLine(ctx, row?.source)}`
  }${legacyNote(ctx, actor, entry)}`;
}
// PG-53: a character that prefers the 2014 version reads it under the 2024 one.
function legacyNote(ctx, actor, entry) {
  const legacy = entry && legacySpell(entry.slug);
  if (!legacy || !actor || !D.legacyChoices(ctx.state, actor.id).includes(entry.slug)) return "";
  return `<section class="spl-legacy-note" data-spl-legacy-note-detail><h4>${ctx.t("Versione scelta: Legacy 2014", "Chosen version: Legacy 2014")} <span class="badge spl-legacy-badge">SRD 5.1</span></h4><p>${ctx.esc(ctx.label(legacy.summary))}</p><p><strong>${ctx.t("Cosa cambia", "What changes")}:</strong> ${ctx.esc(ctx.label(legacy.changes))}</p><p class="muted">${ctx.t("I tiri automatici del Tavolo usano i valori 2024.", "The Table’s automatic rolls use the 2024 values.")}</p></section>`;
}
function shareCommand(ctx, actor, row) {
  if (!row) return null;
  const entry = { actorId: actor.id, entryId: "spell:" + row.id };
  const command = ctx.registry?.get("command", "chat.share-entry", ctx, entry);
  return command ? { command, entry } : null;
}
function openDetail(ctx, actorId, { rowId = null, entryId = null } = {}) {
  const actor = ctx.state.actors[actorId];
  const row = rowId ? (actor.spells ?? []).find((r) => r.id === rowId) : null;
  const entry = row
    ? D.spellEntryFor(row)
    : entryId
      ? D.spellBySlug(entryId.split(":").pop())
      : null;
  const panel = panelOf(ctx, actorId);
  const key = row ? row.id : entry ? "srd:" + entry.slug : null;
  const share = shareCommand(ctx, actor, row);
  const editable = ctx.canControl(actor);
  ctx.dialog(
    ctx.label(row?.name ?? entry?.name ?? L("Magia", "Spell")),
    `${detailBody(ctx, actor, entry, row)}<div class="toolbar spl-dialog-actions">${
      key && entry
        ? `<button type="button" class="button" data-spl-detail="compare" aria-pressed="${panel.compare.includes(key)}">${panel.compare.includes(key) ? ctx.t("Togli dal confronto", "Remove from comparison") : ctx.t("Aggiungi al confronto", "Add to comparison")}</button>`
        : ""
    }${share ? `<button type="button" class="button" data-share-to-chat>${ctx.esc(ctx.registry.label(share.command, ctx.lang))}</button>` : ""}${
      editable && row && D.castVariants(ctx.state, actorId, row.id).some((v) => v.available)
        ? `<button type="button" class="button primary" data-spl-detail="cast">${ctx.t("Lancia…", "Cast…")}</button>`
        : ""
    }</div>`,
    { cancelLabel: ctx.t("Chiudi", "Close") },
  );
  const dialog = globalThis.document?.querySelector("#dialog");
  dialog
    ?.querySelector("[data-share-to-chat]")
    ?.addEventListener("click", () => ctx.registry.run(share.command, ctx, share.entry));
  dialog?.querySelector('[data-spl-detail="compare"]')?.addEventListener("click", () => {
    toggleCompare(ctx, actorId, key);
    ctx.closeDialog();
    // The tray's Compare when it is usable, else this spell's own Compare toggle.
    rerender(
      ctx,
      `[data-spl="compare-open"]:not([disabled]), [data-spl="compare"][data-key="${key}"]`,
    );
  });
  dialog?.querySelector('[data-spl-detail="cast"]')?.addEventListener("click", () => {
    const variant = D.castVariants(ctx.state, actorId, row.id).find((v) => v.available);
    ctx.closeDialog();
    openCast(ctx, actorId, { rowId: row.id, via: variant.via, level: variant.level });
  });
}
const COMPARE_MAX = 4;
function toggleCompare(ctx, actorId, key) {
  const panel = panelOf(ctx, actorId);
  if (panel.compare.includes(key)) {
    panel.compare = panel.compare.filter((k) => k !== key);
    return;
  }
  const next = [...panel.compare, key];
  const dropped = next.length > COMPARE_MAX ? next.shift() : null;
  panel.compare = next;
  // The oldest choice leaves the comparison: say which one, never silently.
  if (dropped) {
    const name = compareEntry(ctx, ctx.state.actors[actorId], dropped)?.name;
    ctx.toast(
      ctx.t(
        `Confronto: massimo ${COMPARE_MAX} magie, tolta «${ctx.label(name ?? "")}».`,
        `Comparison: at most ${COMPARE_MAX} spells, “${ctx.label(name ?? "")}” removed.`,
      ),
    );
  }
}
// Side by side (MAG-04): the same criteria for each spell; a missing value is "non
// disponibile", never zero; no winner is computed. Closing returns to the choice.
export function compareRows(ctx, actor, keys) {
  const profile = D.casterProfile(actor);
  const items = keys.map((key) => compareEntry(ctx, actor, key)).filter(Boolean);
  const na = ctx.t("non disponibile", "not available");
  const rows = [
    [ctx.t("Livello", "Level"), (e) => levelName(ctx, e.level)],
    [ctx.t("Scuola", "School"), (e) => ctx.label(LABELS.school[e.school])],
    [
      ctx.t("Tempo di lancio", "Casting time"),
      (e) => D.castingTimeText(e, ctx.lang) + (e.ritual ? ctx.t(" o rituale", " or Ritual") : ""),
    ],
    [ctx.t("Gittata", "Range"), (e) => rangeText(ctx, e)],
    [
      ctx.t("Area / bersagli", "Area / targets"),
      (e) =>
        e.area
          ? `${ctx.label(AREA[e.area.shape] ?? L(e.area.shape, e.area.shape))} ${formatDistance(e.area.feet, ctx.lang)}`
          : null,
    ],
    [ctx.t("Tiro", "Roll"), (e) => hitText(ctx, e, profile) ?? ctx.t("nessun tiro", "no roll")],
    [ctx.t("Danni o cure", "Damage or healing"), (e) => effectText(ctx, e)],
    [ctx.t("Durata", "Duration"), (e) => D.durationText(e, ctx.lang)],
    [
      ctx.t("Concentrazione", "Concentration"),
      (e) => (e.concentration ? ctx.t("Sì", "Yes") : ctx.t("No", "No")),
    ],
    [ctx.t("Componenti", "Components"), (e) => componentsText(ctx, e)],
    [ctx.t("Effetto", "Effect"), (e) => ctx.label(e.summary)],
  ];
  return {
    items,
    rows: rows.map(([label, get]) => ({
      label,
      values: items.map((item) => (item.entry ? (get(item.entry) ?? na) : na)),
    })),
  };
}
function openCompare(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  const panel = panelOf(ctx, actorId);
  const draw = () => {
    const { items, rows } = compareRows(ctx, actor, panel.compare);
    return `<div class="spl-compare-wrap table-wrap"><table class="spl-compare"><thead><tr><th scope="col">${ctx.t("Criterio", "Criterion")}</th>${items.map((i) => `<th scope="col">${ctx.esc(ctx.label(i.name))}<br><button type="button" class="button quiet spl-compare-remove" data-spl-compare-remove="${ctx.esc(i.key)}">${ctx.t("Togli", "Remove")}</button></th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr><th scope="row">${ctx.esc(r.label)}</th>${r.values.map((v) => `<td>${ctx.esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div><p class="muted">${ctx.t("Il confronto non sceglie per te: chiudendolo torni dove eri, con la stessa preparazione.", "The comparison does not choose for you: closing it takes you back where you were, with the same preparation.")}</p>`;
  };
  ctx.dialog(
    ctx.t("Confronto tra magie", "Spell comparison"),
    `<div data-spl-compare-body>${draw()}</div>`,
    {
      cancelLabel: ctx.t("Torna alla scelta", "Back to the choice"),
    },
  );
  const dialog = globalThis.document?.querySelector("#dialog");
  dialog?.classList.add("spl-wide-dialog");
  const origin = pendingFocusFor("compare-open");
  dialog?.addEventListener(
    "close",
    () => {
      dialog.classList.remove("spl-wide-dialog");
      rerender(ctx, origin);
    },
    { once: true },
  );
  const bindRemove = () =>
    dialog?.querySelectorAll("[data-spl-compare-remove]").forEach(
      (b) =>
        (b.onclick = () => {
          panel.compare = panel.compare.filter((k) => k !== b.dataset.splCompareRemove);
          if (panel.compare.length < 2) return ctx.closeDialog();
          dialog.querySelector("[data-spl-compare-body]").innerHTML = draw();
          bindRemove();
        }),
    );
  bindRemove();
}
const pendingFocusFor = (action) => `[data-spl="${action}"]`;

// The usage dialog (dnd5e FVT-018) for a sheet row or a magic item.
function castTitle(ctx, p) {
  return p.entry ? ctx.label(p.entry.name) : ctx.label(p.row?.name ?? L("Magia", "Spell"));
}
function castBody(ctx, actor, input, p) {
  const profile = p.profile;
  const entry = p.entry;
  const parts = [];
  if (entry)
    parts.push(
      `<p class="spl-cast-meta">${ctx.esc([levelName(ctx, entry.level), ctx.label(LABELS.school[entry.school]), D.castingTimeText(entry, ctx.lang), rangeText(ctx, entry), D.durationText(entry, ctx.lang)].filter(Boolean).join(" · "))}${badges(ctx, entry)}</p><p>${ctx.esc(ctx.label(entry.summary))}</p>`,
    );
  // Variants: one icon, its levels (CRP-100).
  if (input.via === "item") {
    const item = p.item;
    if (item?.scaling && item.max > item.min)
      parts.push(
        `<fieldset class="spl-variants-field"><legend>${ctx.t("Cariche da spendere", "Charges to spend")}</legend>${Array.from(
          { length: item.max - item.min + 1 },
          (_, i) => item.min + i,
        )
          .map((n) => {
            const lvl = item.spell.level + n - item.min;
            const darts =
              item.spell.slug === "magic-missile"
                ? ctx.t(` · ${2 + lvl} dardi`, ` · ${2 + lvl} darts`)
                : "";
            return `<label class="spl-radio"><input type="radio" name="charges" value="${n}" ${Number(input.charges ?? item.min) === n ? "checked" : ""} ${item.charges && n > item.charges.value ? `disabled aria-describedby="${whyId(`charges-${n}`)}"` : ""}> ${n} ${ctx.t(n === 1 ? "carica" : "cariche", n === 1 ? "charge" : "charges")} → ${levelName(ctx, lvl).toLowerCase()}${darts}${item.charges && n > item.charges.value ? ` <span class="muted">(${whyNote(ctx, `charges-${n}`, ctx.t(`restano ${item.charges.value} cariche: scegli meno cariche`, `${item.charges.value} charges left: pick fewer charges`))})</span>` : ""}</label>`;
          })
          .join("")}</fieldset>`,
      );
    if (p.use?.dice)
      parts.push(
        `<fieldset class="spl-variants-field"><legend>${ctx.t("Dadi dell'effetto", "Effect dice")} · ${p.use.dice.count}d${p.use.dice.sides}${p.use.modifier ? " + " + p.use.modifier : ""}</legend><label class="field"><span>${ctx.t("Dadi", "Dice")}</span><select name="mode"><option value="digital" ${input.mode !== "physical" ? "selected" : ""}>${ctx.t("Digitali", "Digital")}</option><option value="physical" ${input.mode === "physical" ? "selected" : ""}>${ctx.t("Fisici", "Physical")}</option></select></label>${
          input.mode === "physical"
            ? `<div class="spl-faces">${Array.from({ length: p.use.dice.count }, (_, i) => `<label class="field"><span>d${p.use.dice.sides} ${i + 1}</span><input type="number" name="face${i}" min="1" max="${p.use.dice.sides}" inputmode="numeric" value="${ctx.esc(input.faces?.[i] || "")}"></label>`).join("")}</div>`
            : ""
        }<p class="muted">${ctx.t("Il risultato va applicato ai bersagli al Tavolo.", "Apply the result to the targets at the Table.")}${p.use.save ? ` ${ctx.t("TS", "Save")} ${ctx.label(LABELS.ability[p.use.save.ability])} · ${ctx.t("CD", "DC")} ${p.use.dc ?? "?"}` : ""}</p></fieldset>`,
      );
  } else if (p.row) {
    const variants = D.castVariants(ctx.state, actor.id, p.row.id);
    parts.push(
      `<fieldset class="spl-variants-field"><legend>${ctx.t("Come lo lanci", "How you cast it")}</legend>${variants
        .map((v) => {
          const value = `${v.via}:${v.level}`;
          const checked =
            input.via === v.via && (v.via !== "slot" || Number(input.level) === v.level);
          const label =
            v.via === "slot"
              ? ctx.t(`Slot di livello ${v.level}`, `Level ${v.level} slot`) +
                ` · ${v.remaining}/${v.max} ${ctx.t("disponibili", "available")}`
              : v.via === "pact"
                ? ctx.t(`Slot del patto (livello ${v.level})`, `Pact slot (level ${v.level})`) +
                  ` · ${v.remaining}/${v.max}`
                : v.via === "ritual"
                  ? ctx.t(
                      "Come rituale: +10 minuti, nessuno slot",
                      "As a Ritual: +10 minutes, no slot",
                    ) +
                    (v.fromBook ? ctx.t(" · leggendo dal libro", " · reading from the book") : "")
                  : v.via === "free"
                    ? ctx.t(
                        "Senza slot (retaggio): una volta per riposo lungo",
                        "Without a slot (lineage): once per Long Rest",
                      )
                    : ctx.t("Trucchetto: nessuno slot", "Cantrip: no slot");
          return `<label class="spl-radio"><input type="radio" name="variant" value="${value}" ${checked ? "checked" : ""} ${v.available ? "" : `disabled aria-describedby="${whyId(`variant-${value}`)}"`}> ${ctx.esc(label)}${v.available ? "" : ` <span class="muted">(${whyNote(ctx, `variant-${value}`, ctx.label(v.reason ?? L("non disponibile: scegli un altro livello", "unavailable: pick another level")))})</span>`}</label>`;
        })
        .join("")}</fieldset>`,
    );
  }
  // What is consumed.
  const cost = [];
  if (p.cost?.slot)
    cost.push(
      `${ctx.t("Slot di livello", "Level")} ${p.cost.slot.level}${ctx.t("", " slot")}: ${p.cost.slot.before} → ${p.cost.slot.after}`,
    );
  if (p.cost?.pact)
    cost.push(
      `${ctx.t("Slot del patto", "Pact slot")}: ${p.cost.pact.before} → ${p.cost.pact.after}`,
    );
  if (p.cost?.charges)
    cost.push(
      `${ctx.t("Cariche", "Charges")}: ${p.cost.charges.before} → ${Math.max(0, p.cost.charges.after)} ${ctx.t("(nessuno slot)", "(no slot)")}`,
    );
  if (p.cost?.ritual) cost.push(ctx.t("Nessuno slot: rituale", "No slot: Ritual"));
  if (p.cost?.free)
    cost.push(
      ctx.t(
        "Nessuno slot: uso del retaggio, torna dopo un riposo lungo",
        "No slot: lineage use, back after a Long Rest",
      ),
    );
  if (p.via === "cantrip") cost.push(ctx.t("Nessuno slot", "No slot"));
  if (p.components?.material?.consumed && p.components.material.chosen)
    cost.push(`${ctx.t("Consuma", "Consumes")}: ${ctx.label(p.components.material.chosen.name)}`);
  const facts = [
    [ctx.t("Consuma", "Uses"), cost.join(" · ") || "—"],
    [
      ctx.t("Azione", "Action"),
      p.action === "action"
        ? ctx.t("1 azione (in combattimento)", "1 action (in combat)")
        : p.action === "bonus-action"
          ? ctx.t("1 azione bonus (in combattimento)", "1 bonus action (in combat)")
          : ctx.t("Fuori dal combattimento", "Outside combat"),
    ],
  ];
  if (p.time?.seconds)
    facts.push([
      ctx.t("Tempo", "Time"),
      p.time.request
        ? ctx.t(
            `+${D.secondsText(p.time.seconds, "it")}: richiesta al DM per l'orologio della campagna`,
            `+${D.secondsText(p.time.seconds, "en")}: request to the DM for the campaign clock`,
          )
        : `${p.time.shared ? ctx.t("Orologio della campagna", "Campaign clock") : ctx.t("Orologio personale", "Personal clock")}: ${D.clockText(p.time.before, ctx.lang)} → ${D.clockText(p.time.after, ctx.lang)}`,
    ]);
  if (entry && p.level > entry.level)
    facts.push([
      ctx.t("Livello del lancio", "Casting level"),
      `${levelName(ctx, p.level)} (${ctx.t("base", "base")} ${entry.level})`,
    ]);
  parts.push(
    `<dl class="spl-facts spl-cost">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${ctx.esc(v)}</dd></div>`).join("")}</dl>`,
  );
  if (p.replaces)
    parts.push(
      `<p class="spl-warning" data-spl-conc-warning>${icon("flag")} ${ctx.t("Interromperà la concentrazione su ", "It will end Concentration on ")}<strong>${ctx.esc(ctx.label(p.replaces.name))}</strong>.</p>`,
    );
  // Components (Solasta II option).
  const comp = p.components;
  if (comp?.need) {
    const need = comp.need;
    const has = (ok) =>
      ok
        ? `<span class="spl-ok">${ctx.t("ok", "ok")}</span>`
        : `<span class="spl-no">${ctx.t("manca", "missing")}</span>`;
    const vsOk = !comp.issues.some((i) => i.code === "components-vs");
    const mOk = !comp.issues.some((i) => i.code === "material" || i.code === "focus");
    const lines = [];
    if (comp.notes.length)
      lines.push(...comp.notes.map((n) => `<li class="muted">${ctx.esc(ctx.label(n))}</li>`));
    else {
      if (need.verbal) lines.push(`<li>V · ${ctx.t("verbale", "verbal")} ${has(vsOk)}</li>`);
      if (need.somatic) lines.push(`<li>S · ${ctx.t("somatica", "somatic")} ${has(vsOk)}</li>`);
      if (need.material)
        lines.push(
          `<li>M · ${ctx.esc(componentsText(ctx, entry)?.replace(/^[VS, ]*M ?/, "") || ctx.t("materiale", "material"))} ${has(mOk)}${comp.focus ? ` <span class="muted">· ${ctx.t("focus", "focus")}: ${ctx.esc(ctx.label(comp.focus.name))}</span>` : comp.pouch ? ` <span class="muted">· ${ctx.esc(ctx.label(comp.pouch.name))}</span>` : ""}</li>`,
        );
    }
    let controls = "";
    if (comp.material) {
      controls += `<label class="field"><span>${ctx.t("Materiale dall'inventario", "Material from the inventory")}</span><select name="materialItemId"><option value="">${ctx.t("Scegli l'oggetto", "Choose the item")}</option>${comp.candidates.map((r) => `<option value="${ctx.esc(r.id)}" ${input.materialItemId === r.id ? "selected" : ""}>${ctx.esc(ctx.label(r.name))} · ${r.materialValueGp} ${ctx.t("mo", "GP")} · × ${r.quantity}</option>`).join("")}</select></label><label class="spl-check"><input type="checkbox" name="materialConfirmed" ${input.materialConfirmed ? "checked" : ""}> ${ctx.t("È il materiale richiesto da questa magia", "It is the material this spell requires")}</label>`;
    } else if (need.material && !comp.notes.length && !comp.focus && !comp.pouch)
      controls += `<label class="spl-check"><input type="checkbox" name="materialDeclared" ${input.materialDeclared ? "checked" : ""}> ${ctx.t("Ho il materiale indicato nella magia", "I have the material the spell lists")}</label>`;
    const unheld = comp.issues.find((i) => i.unheldItemId);
    if (unheld)
      controls += `<button type="button" class="button" data-spl-hold="${ctx.esc(unheld.unheldItemId)}">${ctx.t("Impugna il focus", "Hold the focus")}</button>`;
    parts.push(
      `<fieldset class="spl-components-field"><legend>${ctx.t("Componenti", "Components")}</legend><ul class="spl-comp-list">${lines.join("")}</ul>${controls}${
        p.canOverride && comp.issues.length
          ? `<label class="field"><span>${ctx.t("Deroga del DM (motivo)", "DM exception (reason)")}</span><input name="override" maxlength="200" value="${ctx.esc(input.override?.reason ?? "")}"></label>`
          : ""
      }</fieldset>`,
    );
  }
  const blocking = p.errors.filter((e) => e.code !== "forms-route");
  if (blocking.length)
    parts.push(
      `<ul class="spl-errors" data-spl-cast-errors>${blocking.map((e) => `<li>${ctx.esc(ctx.t(e.it, e.en))}</li>`).join("")}</ul>`,
    );
  if (p.formsRoute)
    parts.push(
      `<p>${ctx.t("Trova Famiglio segue il lancio di 1 ora (o rituale), l'incenso e il famiglio in Forme e compagni.", "Find Familiar runs its 1-hour (or Ritual) casting, the incense and the familiar in Forms and companions.")}</p><button type="button" class="button" data-spl-forms>${ctx.t("Apri Trova Famiglio", "Open Find Familiar")}</button>`,
    );
  const tableAction = tableRoute(ctx, actor, p);
  if (tableAction)
    parts.push(
      `<p class="muted">${ctx.t("Al Tavolo scegli bersagli e tiri con il flusso di combattimento.", "At the Table you choose targets and rolls with the combat flow.")}</p><button type="button" class="button" data-spl-table>${icon("map")} ${ctx.t("Prepara al Tavolo", "Prepare at the Table")}</button>`,
    );
  if (p.warnings.some((w) => w.code === "override"))
    parts.push(
      `<p class="spl-warning">${ctx.esc(ctx.t(p.warnings.find((w) => w.code === "override").it, p.warnings.find((w) => w.code === "override").en))}</p>`,
    );
  return parts.join("");
}
function tableRoute(ctx, actor, p) {
  const slug = p.entry?.slug;
  if (!D.TABLE_SPELLS.includes(slug) || slug === "shield" || p.via === "ritual" || p.via === "item")
    return null;
  const scene = ctx.state.scenes?.find((s) => s.id === ctx.state.activeSceneId);
  const onMap = scene?.tokens?.some((t) => t.actorId === actor.id);
  const inPlay =
    actor.visibility !== "private" &&
    (actor.campaignIds ?? [ctx.state.campaign?.id]).includes(ctx.state.campaign?.id);
  return onMap && inPlay ? slug : null;
}
function submitLabel(ctx, p) {
  if (p.via === "ritual") return ctx.t("Lancia come rituale", "Cast as a Ritual");
  if (p.replaces) return ctx.t("Lancia e termina la concentrazione", "Cast and end Concentration");
  return ctx.t("Lancia", "Cast");
}
export function openCast(ctx, actorId, start) {
  const input = { ...start };
  const actor = () => ctx.state.actors[actorId];
  const preview = () =>
    D.previewCast(ctx.state, actorId, input, ctx.role, { componentsRule: componentsRule(ctx) });
  let p = preview();
  ctx.dialog(
    `${ctx.t("Lancia", "Cast")}: ${castTitle(ctx, p)}`,
    `<div data-spl-cast>${castBody(ctx, actor(), input, p)}</div>`,
    {
      submitLabel: submitLabel(ctx, p),
      onSubmit: (data) => {
        read(data);
        p = preview();
        if (!p.ok) {
          const e = p.errors[0];
          throw Object.assign(new Error(e.en), { it: e.it, en: e.en });
        }
        const a = actor();
        let record = null;
        commitSheet(
          ctx,
          a,
          ctx.t(
            `${a.name} lancia ${ctx.label(p.entry?.name ?? p.row?.name)}`,
            `${a.name} casts ${ctx.label(p.entry?.name ?? p.row?.name)}`,
          ) +
            " · " +
            ctx.label(VIA[p.via] ?? L("", "")),
          (draft) => {
            record = D.castSpell(draft, actorId, input, ctx.role, {
              componentsRule: componentsRule(ctx),
            });
          },
        );
        if (record) ctx.toast(stripTags(castLine(ctx, record)));
      },
    },
  );
  const dialog = globalThis.document?.querySelector("#dialog");
  const box = () => dialog?.querySelector("[data-spl-cast]");
  function read(data) {
    const variant = data.get("variant");
    if (variant) {
      const [via, level] = String(variant).split(":");
      input.via = via;
      input.level = Number(level);
    }
    if (data.has("charges")) input.charges = Number(data.get("charges"));
    if (data.has("mode")) input.mode = data.get("mode");
    const dice = input.mode === "physical" ? preview().use?.dice : null;
    input.faces = dice
      ? Array.from({ length: dice.count }, (_, i) => Number(data.get("face" + i)))
      : undefined;
    input.materialItemId = data.has("materialItemId")
      ? String(data.get("materialItemId"))
      : input.materialItemId || "";
    input.materialConfirmed = data.get("materialConfirmed") === "on";
    input.materialDeclared = data.get("materialDeclared") === "on";
    const override = String(data.get("override") ?? "").trim();
    input.override = override ? { reason: override } : null;
  }
  function redraw() {
    p = preview();
    if (!box()) return;
    box().innerHTML = castBody(ctx, actor(), input, p);
    const submit = dialog.querySelector('button[type="submit"]');
    if (submit) {
      submit.textContent = submitLabel(ctx, p);
      submit.disabled = !p.ok;
    }
    bindBox();
  }
  function bindBox() {
    if (!box()) return;
    box()
      .querySelectorAll("input,select")
      .forEach((field) =>
        // Typed values (reason, dice faces) only refresh the verdict; choices redraw.
        field.addEventListener(["text", "number"].includes(field.type) ? "input" : "change", () => {
          read(new FormData(dialog.querySelector("form")));
          if (["text", "number"].includes(field.type)) {
            p = preview();
            const submit = dialog.querySelector('button[type="submit"]');
            if (submit) submit.disabled = !p.ok;
            return;
          }
          redraw();
          box()
            .querySelector(
              `[name="${field.name}"]${field.type === "radio" ? `[value="${field.value}"]` : ""}`,
            )
            ?.focus();
        }),
      );
    box()
      .querySelector("[data-spl-hold]")
      ?.addEventListener("click", (event) => {
        holdFocus(ctx, actorId, event.currentTarget.dataset.splHold, true);
        redraw();
        box()?.querySelector('[name="variant"]:checked, [name="charges"]:checked')?.focus();
      });
    box()
      .querySelector("[data-spl-forms]")
      ?.addEventListener("click", () => {
        ctx.closeDialog();
        ctx.openForms(actorId, "familiar");
      });
    box()
      .querySelector("[data-spl-table]")
      ?.addEventListener("click", () => {
        const slug = tableRoute(ctx, actor(), p);
        ctx.closeDialog();
        prepareCombatAction(ctx, actorId, slug, p.level > 0 ? { slotLevel: p.level } : {});
        ctx.navigate("table", { id: actorId });
      });
  }
  const submit = dialog?.querySelector('button[type="submit"]');
  if (submit) submit.disabled = !p.ok;
  bindBox();
}
const stripTags = (html) => String(html).replace(/<[^>]+>/g, "");
function holdFocus(ctx, actorId, itemId, hold) {
  const actor = ctx.state.actors[actorId];
  const item = (actor.inventory ?? []).find((r) => r.id === itemId);
  if (!item) return;
  attempt(ctx, () =>
    commitSheet(
      ctx,
      actor,
      hold
        ? ctx.t(
            `${actor.name} impugna ${ctx.label(item.name)}`,
            `${actor.name} holds ${ctx.label(item.name)}`,
          )
        : ctx.t(
            `${actor.name} ripone ${ctx.label(item.name)}`,
            `${actor.name} puts away ${ctx.label(item.name)}`,
          ),
      (draft) => {
        const row = draft.actors[actorId].inventory.find((r) => r.id === itemId);
        if (!ctx.canControl(draft.actors[actorId])) throw new Error("permission");
        row.equipped = hold;
      },
    ),
  );
}
function openLastCharge(ctx, actorId, itemId) {
  const actor = ctx.state.actors[actorId];
  const item = actor.inventory.find((r) => r.id === itemId);
  ctx.dialog(
    ctx.t("Ultima carica", "Last charge"),
    `<p>${ctx.t(`${ctx.label(item.name)}: hai speso l'ultima carica. Tira un d20: con 1 l'oggetto si distrugge.`, `${ctx.label(item.name)}: you spent the last charge. Roll a d20: on a 1 the item is destroyed.`)}</p>${diceFields(ctx)}${sourceLine(ctx, D.SOURCES.wand)}`,
    {
      submitLabel: ctx.t("Registra il d20", "Record the d20"),
      onSubmit: (data) => {
        let result = null;
        commitSheet(
          ctx,
          actor,
          ctx.t(`${actor.name}: d20 dell'ultima carica`, `${actor.name}: last charge d20`),
          (draft) => {
            result = D.resolveLastCharge(
              draft,
              actorId,
              itemId,
              { mode: data.get("mode"), face: Number(data.get("face")) },
              ctx.role,
              { rollDie },
            );
          },
        );
        if (result)
          ctx.toast(
            `d20 = ${result.face}${result.reused ? " (" + ctx.t("Riusato", "Reused") + ")" : ""} · ` +
              (result.destroyed
                ? ctx.t(
                    `${ctx.label(result.name)} si distrugge.`,
                    `${ctx.label(result.name)} is destroyed.`,
                  )
                : ctx.t(`${ctx.label(result.name)} resiste.`, `${ctx.label(result.name)} holds.`)),
          );
      },
    },
  );
  bindDiceFields();
}
function diceFields(ctx) {
  return `<label class="field"><span>${ctx.t("Dadi", "Dice")}</span><select name="mode" data-spl-dice-mode><option value="digital">${ctx.t("Digitali", "Digital")}</option><option value="physical">${ctx.t("Fisici", "Physical")}</option></select></label><label class="field" data-spl-face hidden><span>${ctx.t("Faccia del d20 fisico", "Physical d20 face")}</span><input name="face" type="number" min="1" max="20" inputmode="numeric"></label>`;
}
function bindDiceFields() {
  const dialog = globalThis.document?.querySelector("#dialog");
  const mode = dialog?.querySelector("[data-spl-dice-mode]");
  mode?.addEventListener("change", () => {
    const face = dialog.querySelector("[data-spl-face]");
    face.hidden = mode.value !== "physical";
    face.querySelector("input").required = mode.value === "physical";
  });
}
function openTranscribe(ctx, actorId, { entryId, scrollItemId = null }) {
  const from = scrollItemId ? "scroll" : "found";
  const input = { entryId, from, scrollItemId };
  const p = D.previewTranscription(ctx.state, actorId, input, ctx.role);
  const actor = ctx.state.actors[actorId];
  const entry = p.entry;
  const body = `<p>${ctx.t("Trascrivi", "Copy")} <strong>${ctx.esc(ctx.label(entry?.name ?? L("", "")))}</strong> ${ctx.t("nel libro degli incantesimi", "into the spellbook")}${from === "scroll" ? ctx.t(" dalla pergamena", " from the scroll") : ctx.t(" da una fonte trovata", " from a source you found")}.</p><dl class="spl-facts"><div><dt>${ctx.t("Tempo", "Time")}</dt><dd>${p.hours ?? "—"} ${ctx.t("ore", "hours")} (${ctx.t("2 per livello", "2 per level")})${p.time ? ` · ${p.time.request ? ctx.t("richiesta al DM per l'orologio della campagna", "request to the DM for the campaign clock") : `${D.clockText(p.time.before, ctx.lang)} → ${D.clockText(p.time.after, ctx.lang)}`}` : ""}</dd></div><div><dt>${ctx.t("Costo", "Cost")}</dt><dd>${p.gp ?? "—"} ${ctx.t("mo", "GP")} (${ctx.t("50 per livello", "50 per level")}) · ${ctx.t("borsa", "purse")}: ${ctx.esc(formatCoins(purseOf(actor), ctx.lang))}</dd></div>${
    p.check
      ? `<div><dt>${ctx.t("Prova", "Check")}</dt><dd>${ctx.t("Intelligenza (Arcano)", "Intelligence (Arcana)")} ${signed(p.check.modifier)} ${ctx.t("contro CD", "vs DC")} ${p.check.dc}. ${ctx.t("La pergamena si distrugge comunque; tempo e monete si spendono anche se fallisci.", "The scroll is destroyed either way; time and coins are spent even on a failure.")}</dd></div>`
      : ""
  }</dl>${p.check ? diceFields(ctx) : ""}${p.errors.length ? `<ul class="spl-errors">${p.errors.map((e) => `<li>${ctx.esc(ctx.t(e.it, e.en))}</li>`).join("")}</ul>` : ""}${sourceLine(ctx, from === "scroll" ? D.SOURCES.scroll : D.SOURCES.wizard)}`;
  ctx.dialog(ctx.t("Trascrivi nel libro", "Copy into the spellbook"), body, {
    submitLabel: ctx.t("Trascrivi", "Copy"),
    onSubmit: (data) => {
      let record = null;
      commitSheet(
        ctx,
        actor,
        ctx.t(
          `${actor.name} trascrive ${ctx.label(entry.name)}`,
          `${actor.name} copies ${ctx.label(entry.name)}`,
        ),
        (draft) => {
          record = D.transcribe(
            draft,
            actorId,
            { ...input, mode: data.get("mode"), face: Number(data.get("face")) },
            ctx.role,
            { rollDie },
          );
        },
      );
      if (record)
        ctx.toast(
          record.success
            ? ctx.t(
                `${ctx.label(record.name)} è nel libro.`,
                `${ctx.label(record.name)} is in the spellbook.`,
              ) +
                (record.check
                  ? ` (${record.check.face} ${signed(record.check.modifier)} = ${record.check.total})`
                  : "")
            : ctx.t(
                `Prova fallita (${record.check.total} contro CD ${record.check.dc}): la pergamena è distrutta.`,
                `Check failed (${record.check.total} vs DC ${record.check.dc}): the scroll is destroyed.`,
              ),
          !record.success,
        );
    },
  });
  const submit = globalThis.document?.querySelector('#dialog button[type="submit"]');
  if (submit) submit.disabled = !p.ok;
  bindDiceFields();
}
function openRecall(ctx, actorId, listId) {
  const p = D.proposalFromList(ctx.state, actorId, listId, ctx.role);
  const actor = ctx.state.actors[actorId];
  const names = (rows) => rows.map((r) => `<li>${ctx.esc(ctx.label(r.name))}</li>`).join("");
  const body = `<p>${ctx.t("La lista diventa una proposta: controlla le differenze, poi conferma la preparazione.", "The list becomes a proposal: check the differences, then confirm the preparation.")}</p><div class="spl-proposal"><section><h4>${ctx.t("Da preparare", "To prepare")} (+${p.added.length})</h4><ul>${names(p.added) || `<li class="muted">—</li>`}</ul></section><section><h4>${ctx.t("Da togliere", "To remove")} (−${p.removed.length})</h4><ul>${names(p.removed) || `<li class="muted">—</li>`}</ul></section><section><h4>${ctx.t("Non disponibili", "Unavailable")} (${p.unavailable.length})</h4><ul>${p.unavailable.map((u) => `<li>${ctx.esc(ctx.label(u.name))} · <span class="muted">${ctx.esc(ctx.label(u.reason))}</span></li>`).join("") || `<li class="muted">—</li>`}</ul></section></div>${
    p.draft
      ? `<fieldset><legend>${ctx.t("Hai modifiche non confermate", "You have unconfirmed changes")}</legend><label class="spl-radio"><input type="radio" name="draft" value="keep" checked> ${ctx.t("Mantieni le modifiche attuali", "Keep the current changes")}</label><label class="spl-radio"><input type="radio" name="draft" value="replace"> ${ctx.t("Sostituiscile con la lista", "Replace them with the list")}</label></fieldset>`
      : ""
  }${p.window.open ? "" : `<p class="spl-warning">${ctx.esc(ctx.label(p.window.closedText ?? p.window.message))}</p>`}`;
  ctx.dialog(`${ctx.t("Richiama", "Recall")} «${p.list.name}»`, body, {
    submitLabel: p.window.open ? ctx.t("Usa come proposta", "Use as a proposal") : undefined,
    cancelLabel: ctx.t("Chiudi", "Close"),
    onSubmit: (data) => {
      if (p.draft && data.get("draft") !== "replace") return true;
      commitPersonal(
        ctx,
        ctx.t(
          `Lista «${p.list.name}» richiamata come proposta`,
          `List “${p.list.name}” recalled as a proposal`,
        ),
        (draft) => {
          D.recallList(draft, actorId, listId, ctx.role, { replaceDraft: true });
        },
      );
    },
  });
}
function openException(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  ctx.dialog(
    actor.visibility === "private"
      ? ctx.t("Correggi la preparazione", "Correct the preparation")
      : ctx.t("Deroga del DM", "DM exception"),
    `<p>${ctx.t("Apre la preparazione fuori dal momento previsto dalla classe. Il motivo resta nel registro.", "Opens preparation outside the moment the class allows. The reason stays in the log.")}</p><label class="field"><span>${ctx.t("Motivo", "Reason")}</span><input name="reason" required minlength="3" maxlength="200" placeholder="${ctx.t("Es. riposo lungo non registrato ieri", "E.g. yesterday’s Long Rest was not recorded")}"></label>`,
    {
      submitLabel: ctx.t("Registra e apri la preparazione", "Record and open preparation"),
      onSubmit: (data) => {
        const reason = String(data.get("reason") ?? "");
        commitSheet(
          ctx,
          actor,
          ctx.t(
            `Deroga alla preparazione di ${actor.name}: ${reason}`,
            `Preparation exception for ${actor.name}: ${reason}`,
          ),
          (draft) => D.openException(draft, actorId, reason, ctx.role),
        );
      },
    },
  );
}
function openMaterial(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  ctx.dialog(
    ctx.t("Registra un materiale di valore", "Record a costly material"),
    `<p class="muted">${ctx.t("Per le magie con un materiale di valore o consumato. Registra ciò che il personaggio possiede già (comprato o trovato): non sottrae monete.", "For spells with a costly or consumed material. Record what the character already owns (bought or found): no coins are deducted.")}</p><label class="field"><span>${ctx.t("Nome", "Name")}</span><input name="name" required maxlength="80" placeholder="${ctx.t("Es. Incenso per Trova Famiglio", "E.g. Incense for Find Familiar")}"></label><div class="form-grid"><label class="field"><span>${ctx.t("Valore unitario in mo", "Value per unit in GP")}</span><input name="value" type="number" min="1" max="100000" required></label><label class="field"><span>${ctx.t("Quantità", "Quantity")}</span><input name="quantity" type="number" min="1" max="99" value="1" required></label></div><label class="field"><span>${ctx.t("Da dove viene", "Where it comes from")}</span><input name="origin" required maxlength="120" placeholder="${ctx.t("Es. comprato al mercato di Bruma", "E.g. bought at the Bruma market")}"></label>`,
    {
      submitLabel: ctx.t("Registra", "Record"),
      onSubmit: (data) => {
        const name = String(data.get("name") ?? "").trim();
        const value = Number(data.get("value"));
        const quantity = Number(data.get("quantity"));
        const origin = String(data.get("origin") ?? "").trim();
        if (
          !name ||
          !Number.isInteger(value) ||
          value < 1 ||
          !Number.isInteger(quantity) ||
          quantity < 1 ||
          !origin
        )
          throw Object.assign(new Error("invalid"), {
            it: "Controlla nome, valore, quantità e provenienza.",
            en: "Check name, value, quantity and origin.",
          });
        commitSheet(
          ctx,
          actor,
          ctx.t(
            `${actor.name}: materiale registrato (${name})`,
            `${actor.name}: material recorded (${name})`,
          ),
          (draft) => {
            const a = draft.actors[actorId];
            a.inventory ??= [];
            a.inventory.push({
              id: "spl-mat-" + Date.now().toString(36),
              name,
              quantity,
              weight: 0,
              equipped: false,
              kind: "gear",
              materialValueGp: value,
              description: origin,
              source: { kind: "manual", label: origin, revision: new Date().toISOString() },
            });
          },
        );
      },
    },
  );
}
function openDismiss(ctx, requestId) {
  ctx.dialog(
    ctx.t("Rifiuta la richiesta di tempo", "Decline the time request"),
    `<label class="field"><span>${ctx.t("Motivo", "Reason")}</span><input name="reason" required minlength="3" maxlength="200"></label>`,
    {
      submitLabel: ctx.t("Rifiuta", "Decline"),
      onSubmit: (data) =>
        ctx.commit(ctx.t("Richiesta di tempo rifiutata", "Time request declined"), (draft) =>
          D.dismissTimeRequest(draft, requestId, data.get("reason"), ctx.role),
        ),
    },
  );
}

// ---------------------------------------------------------------- binding

function applyFilters(el, panel) {
  const needle = panel.query.toLocaleLowerCase().trim();
  let shown = 0;
  el.querySelectorAll("[data-spl-row]").forEach((row) => {
    const level = Number(row.closest("[data-spl-group]")?.dataset.splGroup);
    const ready = row.querySelector(
      ".spl-state.is-prepared, .spl-state.is-always, .spl-state.is-cantrip",
    );
    const ok =
      (panel.level === "all" || level === Number(panel.level)) &&
      (!panel.preparedOnly || !!ready) &&
      (!needle || row.dataset.search.includes(needle));
    row.hidden = !ok;
    if (ok) shown++;
  });
  el.querySelectorAll("[data-spl-group]").forEach((group) => {
    group.hidden = ![...group.querySelectorAll("[data-spl-row]")].some((row) => !row.hidden);
  });
  const none = el.querySelector("[data-spl-no-results]");
  if (none) none.hidden = shown > 0 || !el.querySelector("[data-spl-row]");
}
export function bindSpellsTab(el, ctx, actorView) {
  const actorId = actorView?.id;
  if (!actorId || !ctx.state.actors[actorId]) return;
  const panel = panelOf(ctx, actorId);
  applyFilters(el, panel);
  el.querySelectorAll("[data-spl-level]").forEach(
    (b) =>
      (b.onclick = () => {
        panel.level = b.dataset.splLevel === "all" ? "all" : Number(b.dataset.splLevel);
        el.querySelectorAll("[data-spl-level]").forEach((c) =>
          c.setAttribute("aria-pressed", String(c === b)),
        );
        applyFilters(el, panel);
      }),
  );
  el.querySelector("[data-spl-prepared-only]")?.addEventListener("change", (e) => {
    panel.preparedOnly = e.target.checked;
    applyFilters(el, panel);
  });
  el.querySelector("[data-spl-query]")?.addEventListener("input", (e) => {
    panel.query = e.target.value;
    applyFilters(el, panel);
  });
  el.querySelector("[data-spl-mquery]")?.addEventListener("input", (e) => {
    panel.mQuery = e.target.value;
    const needle = e.target.value.toLocaleLowerCase().trim();
    el.querySelectorAll("[data-spl-class-row]").forEach((row) => {
      row.hidden = !!needle && !row.textContent.toLocaleLowerCase().includes(needle);
    });
  });
  el.querySelectorAll("[data-spl-mlevel]").forEach(
    (b) =>
      (b.onclick = () => {
        panel.mLevel = b.dataset.splMlevel === "all" ? "all" : Number(b.dataset.splMlevel);
        rerender(ctx, `[data-spl-mlevel="${b.dataset.splMlevel}"]`);
      }),
  );
  el.querySelectorAll("[data-spl-mflag]").forEach((box) =>
    box.addEventListener("change", () => {
      panel[box.dataset.splMflag] = box.checked;
      rerender(ctx, `[data-spl-mflag="${box.dataset.splMflag}"]`);
    }),
  );
  el.querySelectorAll("[data-spl-tab]").forEach(
    (b) =>
      (b.onclick = () => {
        panel.tab = b.dataset.splTab;
        rerender(ctx, `[data-spl-tab="${b.dataset.splTab}"]`);
      }),
  );
  el.querySelector("[data-spl-save-list]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = new FormData(event.currentTarget).get("name");
    const actor = ctx.state.actors[actorId];
    attempt(ctx, () => {
      commitPersonal(
        ctx,
        ctx.t(`Lista di magie salvata: ${name}`, `Spell list saved: ${name}`),
        (draft) => D.saveList(draft, actorId, name, ctx.role),
      );
      ctx.toast(ctx.t(`Lista «${name}» salvata.`, `List “${name}” saved.`));
    });
  });
  el.querySelector("[data-spl-copy-form]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const entryId = new FormData(event.currentTarget).get("entry");
    if (entryId) openTranscribe(ctx, actorId, { entryId });
  });
  el.addEventListener("click", (event) => {
    const control = event.target.closest("[data-spl]");
    if (!control || control.disabled || !el.contains(control)) return;
    const action = control.dataset.spl;
    const actor = ctx.state.actors[actorId];
    attempt(ctx, () => handle(ctx, actorId, actor, panel, action, control));
  });
  if (pendingFocus) {
    const target = el.querySelector(pendingFocus);
    pendingFocus = null;
    target?.focus();
  }
}
function handle(ctx, actorId, actor, panel, action, control) {
  const data = control.dataset;
  if (action === "source") {
    const id = data.source;
    if (!["srd", "homebrew", "legacy"].includes(id)) return null;
    panel.mSources = panel.mSources.includes(id)
      ? panel.mSources.filter((x) => x !== id)
      : [...panel.mSources, id];
    return rerender(ctx, `[data-spl-source="${id}"]`);
  }
  if (action === "legacy-choose") {
    const on = control.getAttribute("aria-pressed") !== "true";
    commitSheet(
      ctx,
      actor,
      on
        ? ctx.t("Versione 2014 scelta per la magia", "2014 version chosen for the spell")
        : ctx.t("Versione 2024 ripristinata per la magia", "2024 version restored for the spell"),
      (draft) =>
        D.chooseLegacy(draft, actorId, data.slug, on, ctx.role, {
          allowed: legacyState(ctx).allowed,
        }),
    );
    return rerender(ctx, `[data-spl="legacy-choose"][data-slug="${data.slug}"]`);
  }
  if (action === "add-homebrew") {
    // A homebrew spell joins the sheet through the Library's review (B-increment 6).
    return ctx.navigate("library", {
      id: data.content,
      revision: data.revision,
      returnTo: JSON.stringify({ page: "characters", actorId, tab: "spells" }),
    });
  }
  if (action === "manage") {
    panel.manage = !panel.manage;
    return rerender(ctx, panel.manage ? "[data-spl-tab].active" : '[data-spl="manage"]');
  }
  if (action === "manage-close") {
    panel.manage = false;
    return rerender(ctx, '[data-spl="manage"]');
  }
  if (action === "variants") {
    panel.expanded = panel.expanded === data.row ? null : data.row;
    const open = panel.expanded === data.row;
    control.setAttribute("aria-expanded", String(open));
    const box = control.closest(".spl-row")?.querySelector(".spl-variants");
    if (box) {
      box.hidden = !open;
      if (open) box.querySelector("button:not(:disabled)")?.focus();
    }
    return;
  }
  if (action === "cast")
    return openCast(ctx, actorId, { rowId: data.row, via: data.via, level: Number(data.level) });
  if (action === "cast-item") {
    const source = D.itemSources(actor).find(
      (x) => x.itemId === data.item && (!data.activity || x.activityId === data.activity),
    );
    return openCast(ctx, actorId, {
      via: "item",
      itemId: data.item,
      activityId: source?.activityId,
      charges: source?.min ?? 1,
    });
  }

  if (action === "last-charge") return openLastCharge(ctx, actorId, data.item);
  if (action === "detail") return openDetail(ctx, actorId, { rowId: data.row });
  if (action === "detail-entry") return openDetail(ctx, actorId, { entryId: data.entry });
  if (action === "compare") {
    toggleCompare(ctx, actorId, data.key);
    return rerender(ctx, `[data-spl="compare"][data-key="${data.key}"]`);
  }
  if (action === "compare-open") return openCompare(ctx, actorId);
  if (action === "compare-clear") {
    panel.compare = [];
    return rerender(ctx, '[data-spl="manage"]');
  }
  if (action === "exception") return openException(ctx, actorId);
  if (action === "material") return openMaterial(ctx, actorId);
  if (action === "hold")
    return holdFocus(
      ctx,
      actorId,
      data.item,
      data.item && control.getAttribute("aria-pressed") !== "true",
    );
  if (action === "toggle") {
    const want = data.want === "1";
    return withFocus(
      `[data-spl="toggle"][data-key="${data.key}"], [data-spl-manage-row="${data.key}"] button`,
      () =>
        commitPersonal(
          ctx,
          want
            ? ctx.t("Proposta: magia da preparare", "Proposal: spell to prepare")
            : ctx.t("Proposta: magia da togliere", "Proposal: spell to remove"),
          (draft) => D.toggleDraft(draft, actorId, data.key, want, ctx.role),
        ),
    );
  }
  if (action === "confirm") {
    let result = null;
    withFocus('[data-spl="manage"]', () =>
      commitSheet(
        ctx,
        actor,
        ctx.t(`Preparazione di ${actor.name} confermata`, `${actor.name}’s preparation confirmed`),
        (draft) => {
          result = D.confirmPreparation(draft, actorId, ctx.role);
        },
      ),
    );
    if (result)
      ctx.toast(
        ctx.t(
          `Preparazione confermata: +${result.added.length} −${result.removed.length}.`,
          `Preparation confirmed: +${result.added.length} −${result.removed.length}.`,
        ),
      );
    return;
  }
  if (action === "discard")
    return withFocus('[data-spl="manage"]', () =>
      commitPersonal(
        ctx,
        ctx.t("Modifiche alla preparazione annullate", "Preparation changes discarded"),
        (draft) => D.discardDraft(draft, actorId, ctx.role),
      ),
    );
  if (action === "add-book")
    return withFocus(`[data-spl-class-row="${data.entry.split(":").pop()}"] button`, () =>
      commitSheet(
        ctx,
        actor,
        ctx.t(
          `${actor.name}: magia aggiunta al libro`,
          `${actor.name}: spell added to the spellbook`,
        ),
        (draft) => D.addToBook(draft, actorId, data.entry, ctx.role),
      ),
    );
  if (action === "learn")
    return withFocus(`[data-spl-class-row="${data.entry.split(":").pop()}"] button`, () =>
      commitSheet(
        ctx,
        actor,
        ctx.t(`${actor.name}: nuovo trucchetto`, `${actor.name}: new cantrip`),
        (draft) => D.learnCantrip(draft, actorId, data.entry, ctx.role),
      ),
    );
  if (action === "transcribe")
    return openTranscribe(ctx, actorId, { entryId: data.entry, scrollItemId: data.scroll ?? null });
  if (action === "list-recall") return openRecall(ctx, actorId, data.list);
  if (action === "list-update") {
    commitPersonal(ctx, ctx.t("Lista di magie aggiornata", "Spell list updated"), (draft) =>
      D.updateList(draft, actorId, data.list, ctx.role),
    );
    return ctx.toast(
      ctx.t("Lista aggiornata con le magie preparate.", "List updated with the prepared spells."),
    );
  }
  if (action === "list-delete") {
    const list = D.listsFor(ctx.state, actorId, ctx.role).find((l) => l.id === data.list);
    return ctx.dialog(
      ctx.t("Elimina la lista", "Delete the list"),
      `<p>${ctx.t("Eliminare", "Delete")} «${ctx.esc(list?.name ?? "")}»? ${ctx.t("La preparazione attuale non cambia.", "The current preparation does not change.")}</p>`,
      {
        submitLabel: ctx.t("Elimina", "Delete"),
        onSubmit: () =>
          commitPersonal(
            ctx,
            ctx.t(`Lista eliminata: ${list?.name ?? ""}`, `List deleted: ${list?.name ?? ""}`),
            (draft) => D.deleteList(draft, actorId, data.list, ctx.role),
          ),
      },
    );
  }
  if (action === "time-apply") {
    commitSheet(
      ctx,
      actor,
      ctx.t("Tempo della campagna avanzato", "Campaign time advanced"),
      (draft) => D.applyTimeRequest(draft, data.request, ctx.role),
    );
    return;
  }
  if (action === "time-dismiss") return openDismiss(ctx, data.request);
}

// Tests and other surfaces run the same handlers the bound controls call.
export function handleSpellsAction(ctx, actorId, action, data = {}) {
  const control = {
    dataset: { ...data },
    setAttribute() {},
    getAttribute: (name) => data[name] ?? null,
    closest: () => null,
  };
  return attempt(ctx, () =>
    handle(ctx, actorId, ctx.state.actors[actorId], panelOf(ctx, actorId), action, control),
  );
}
export const spellsPanel = (ctx, actorId) => panelOf(ctx, actorId);
// PG-80 (BG3: prepared spells change after a Long Rest; Shard's post-rest prompt): the rest
// dialog's «Cambia le magie preparate» opens «Gestisci magie» on the sheet's Spells tab.
export function openPreparedSpells(ctx, actorId) {
  const panel = panelOf(ctx, actorId);
  panel.manage = true;
  panel.tab = "prepare";
  return ctx.navigate("characters", { id: actorId, tab: "spells" });
}

// ---------------------------------------------------------------- registration

export function register(registry) {
  registry.registerStateSlice(D.ID, {
    version: D.VERSION,
    undo: "snapshot",
    seed: (state) => D.seedSlice(state),
    normalize: (value, fromVersion) => {
      if (fromVersion > D.VERSION) throw new Error("Future spells-plus data");
      return D.normalizeSlice(value);
    },
  });
  // Accepted dice survive gameplay Undo, like every other roll of the app (I-229).
  registry.registerStateSlice(D.ROLLS_ID, {
    version: 1,
    undo: "preserve",
    seed: () => D.emptyRolls(),
    normalize: (value, fromVersion) => {
      if (fromVersion > 1) throw new Error("Future spells-plus rolls");
      return D.normalizeRolls(value);
    },
  });
  registry.registerStyles(new URL("./spells-plus.css", import.meta.url));
  registry.add("sheet-tab", {
    id: "spells",
    replaces: true,
    label: L("Magie", "Spells"),
    render: (ctx, actor) => renderSpellsTab(ctx, actor),
    bind: (el, ctx, actor) => bindSpellsTab(el, ctx, actor),
  });
  registry.add("settings", {
    id: "spells-plus",
    label: L("Magie: componenti degli incantesimi", "Spells: spell components"),
    description: L(
      "Come l'opzione di Solasta II: il tavolo sceglie se verificare focus e materiali.",
      "Like Solasta II’s option: the table chooses whether focus and materials are checked.",
    ),
    scope: "campaign",
    roles: ["dm"],
    fields: [
      {
        id: "components",
        label: L("Componenti", "Components"),
        type: "choice",
        default: "check",
        options: [
          { value: "check", label: L("Verifica prima del lancio", "Check before casting") },
          { value: "off", label: L("Non verificare", "Do not check") },
        ],
      },
    ],
  });
  registry.add("notifications", {
    id: "spells-plus",
    label: L("Magie", "Spells"),
    collect: (ctx) => {
      const out = [];
      if (ctx.role === "dm")
        for (const r of D.pendingTimeRequests(ctx.state))
          out.push({
            id: "spells-plus-time-" + r.id,
            title: L(
              `Tempo da avanzare: +${D.secondsText(r.seconds, "it")}`,
              `Time to advance: +${D.secondsText(r.seconds, "en")}`,
            ),
            body: r.reason,
            time: r.at,
            category: "request",
            target: { kind: "sheet", actorId: r.actorId, tab: "spells" },
          });
      for (const actor of Object.values(ctx.state.actors ?? {}))
        if (ctx.canControl(actor))
          for (const s of D.itemSources(actor))
            if (s.lastCharge)
              out.push({
                id: "spells-plus-charge-" + s.itemId + "-" + (s.row.charges?.spentTotal ?? 0),
                title: L("Ultima carica: tira il d20", "Last charge: roll the d20"),
                body: L(
                  `${actor.name} · ${s.row.name?.it ?? s.row.name}`,
                  `${actor.name} · ${s.row.name?.en ?? s.row.name}`,
                ),
                category: "request",
                target: { kind: "sheet", actorId: actor.id, tab: "spells" },
              });
      return out;
    },
  });
  registry.add("command", {
    id: "spells-plus.manage",
    label: L("Gestisci le magie di questa scheda", "Manage this sheet’s spells"),
    context: "characters",
    when: (ctx) =>
      ctx.view?.page === "characters" &&
      !!ctx.view.id &&
      !!D.casterProfile(ctx.state.actors[ctx.view.id]) &&
      canControlActor(ctx.state.actors[ctx.view.id], ctx.role, ctx.state),
    run: (ctx) => {
      panelOf(ctx, ctx.view.id).manage = true;
      ctx.navigate("characters", { id: ctx.view.id, tab: "spells" });
    },
  });
  registry.on("role-changed", () => resetSpellsUI());
  registry.on("reset", () => resetSpellsUI());
}
