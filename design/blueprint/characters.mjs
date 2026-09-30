import { getEffectiveActor, speedBreakdown } from "./forms-companions.mjs";
import * as SP from "./sheet-plus-domain.mjs";
import {
  openSheetStat,
  openSheetMovement,
  usePips,
  setFeatureUsed,
  glossaryText,
  bindGlossary,
  speedNote,
} from "./sheet-plus.mjs";
import { FEATURE_TEXTS } from "./srd-sample.mjs";
import * as BP from "./builder-plus-domain.mjs";
import { updateCharacterRestProfile } from "./rest-profile.mjs";
import { FEATURE_NAMES_IT } from "./srd-compendium.mjs";
import { portraitArt } from "./media-domain.mjs";
import { src as mediaSrc, openAppearance } from "./media-ui.mjs";
import * as DT from "./dice-tray-domain.mjs";
import { formatNumber, icon, scrollIntoStrip } from "./ui.mjs";
import { SHEET_CATEGORIES } from "./registry.mjs";
import { renderFormsSummary, bindFormsSummary } from "./forms-ui.mjs";
import {
  refreshConsequences,
  applyConditionFollowUps,
  observeConcentrationEnd,
} from "./combat.mjs";
import { applyVitalityEvent, hasCondition } from "./conditions.mjs";
import { renderConditionsSummary, bindConditionsSummary } from "./conditions-ui.mjs";
import { startCharacterBuilder } from "./character-builder.mjs";
import { getCharacterCatalog } from "./character-rules.mjs";
import { speciesOf } from "./character-export.mjs";
import { canViewActor, isCampaignActor } from "./character-access.mjs";
import { potionCost, potionBlock } from "./inventory-plus-domain.mjs";
import { connectCharacterWithContent } from "./homebrew-integration.mjs";
import { homebrewAvailability } from "./homebrew.mjs";
const abilities = {
  str: ["Forza", "Strength"],
  dex: ["Destrezza", "Dexterity"],
  con: ["Costituzione", "Constitution"],
  int: ["Intelligenza", "Intelligence"],
  wis: ["Saggezza", "Wisdom"],
  cha: ["Carisma", "Charisma"],
};
const tabs = {
  actions: ["Azioni", "Actions"],
  inventory: ["Inventario", "Inventory"],
  spells: ["Magie", "Spells"],
  features: ["Capacità", "Features"],
  story: ["Storia", "Story"],
  // PG-83: the Extra category keeps its name; its first page says what it holds.
  extras: ["Creature e piani", "Creatures and plans"],
};
// D&D Beyond's phone sheet pages that join the categories on a phone (see renderCharacters).
const SHEET_PAGES = [
  { id: "abilities", names: ["Caratteristiche", "Abilities"] },
  { id: "skills", names: ["Abilità", "Skills"] },
];
const uid = () => globalThis.crypto.randomUUID();
const modifier = (value) => (Number.isFinite(value) ? Math.floor((value - 10) / 2) : null);
const signed = (value) => (Number.isFinite(value) ? (value >= 0 ? "+" : "") + value : "—");
export function spellSlotPools(actor) {
  return Array.from({ length: 9 }, (_, index) => index + 1).flatMap((level) => {
    const pool = actor.spellSlots?.[level] ?? (level === 1 ? actor.slots : null);
    return pool
      ? [
          {
            level,
            ...pool,
            available: Number.isInteger(pool.used) ? Math.max(0, pool.max - pool.used) : null,
            overused: Number.isInteger(pool.used) ? Math.max(0, pool.used - pool.max) : null,
          },
        ]
      : [];
  });
}
export function setSpellSlotPool(actor, level, { max, used }) {
  if (
    !Number.isInteger(level) ||
    level < 1 ||
    level > 9 ||
    !Number.isInteger(max) ||
    max < 0 ||
    !Number.isInteger(used) ||
    used < 0
  )
    throw new Error("Slot level must be 1–9; maximum and spent must be non-negative integers");
  actor.spellSlots ??= {};
  actor.spellSlots[level] = { max, used };
  if (level === 1) actor.slots = actor.spellSlots[1];
}
function die(sides) {
  const values = new Uint32Array(1);
  const limit = Math.floor(4294967296 / sides) * sides;
  do {
    globalThis.crypto.getRandomValues(values);
  } while (values[0] >= limit);
  return (values[0] % sides) + 1;
}

export function beginHealing(
  actor,
  itemId,
  { inCombat = false, canAct = true, mode = "physical", id = uid(), cost = "bonus" } = {},
) {
  // C7: `cost` is the campaign's rule for a potion (potionCost): the SRD Bonus Action, or
  // the Action of a house rule.
  const resource = cost === "action" ? "action" : "bonus";
  if (!Number.isFinite(actor.hp) || !Number.isFinite(actor.maxHp))
    throw new Error("Record current and maximum hit points before healing");
  if (actor.pendingHealing) throw new Error("Healing already pending");
  const item = actor.inventory.find((entry) => entry.id === itemId);
  if (
    !item?.healing ||
    item.quantity < 1 ||
    item.location === "ground" ||
    getEffectiveActor(actor).inventory.find((i) => i.id === itemId)?.availableInForm === false
  )
    throw new Error("Potion unavailable");
  if (actor.dead === true) throw new Error("Potion unavailable");
  // Incapacitated (Unconscious at 0 HP included): no action, Bonus Action or Reaction
  // (SRD EN 184 / IT 208). Another creature must administer the potion.
  if (hasCondition(actor, "incapacitated"))
    throw new Error("An Incapacitated creature cannot drink a potion");
  if (inCombat && !canAct) throw new Error("Not this creature's turn");
  if (inCombat && !actor[resource])
    throw new Error(resource === "action" ? "Action unavailable" : "Bonus action unavailable");
  item.quantity -= 1;
  if (inCombat) actor[resource] = false;
  actor.pendingHealing = { id, itemId, mode, formula: "2d4 + 2" };
  return actor.pendingHealing;
}
// With the state, healing is a vitality event: it ends only 0-HP/knockout causes and
// expires death saves made unnecessary (increment 10); it never resurrects.
export function resolveHealing(actor, faces, state = null) {
  if (!actor.pendingHealing) throw new Error("No pending healing");
  if (faces.length !== 2 || faces.some((face) => !Number.isInteger(face) || face < 1 || face > 4))
    throw new Error("Invalid dice: two natural d4 faces required");
  const total = faces[0] + faces[1] + 2;
  const before = actor.hp;
  if (state) {
    const result = applyVitalityEvent(state, {
      eventId: "potion:" + actor.pendingHealing.id,
      actorId: actor.id,
      kind: "healing",
      amount: total,
      source: {
        kind: "inventory-item",
        revision: String(actor.pendingHealing.itemId),
        formula: actor.pendingHealing.formula,
      },
    });
    applyConditionFollowUps(state, result);
  } else actor.hp = Math.min(actor.maxHp, before + total);
  const result = {
    ...actor.pendingHealing,
    faces,
    modifier: 2,
    total,
    before,
    after: actor.hp,
    applied: actor.hp - before,
    overflow: total - (actor.hp - before),
  };
  actor.lastHealing = result;
  actor.pendingHealing = null;
  return result;
}
export function patchCharacter(actor, patch) {
  if (typeof patch.name !== "string" || !patch.name.trim()) throw new Error("Invalid name");
  if (!Number.isInteger(patch.level) || patch.level < 1 || patch.level > 20)
    throw new Error("Invalid level");
  if (!Number.isInteger(patch.maxHp) || patch.maxHp < 1)
    throw new Error("Invalid maximum hit points");
  // PG-25: Armor Class is derived (base, reasoned changes, worn items): «Correggi valori»
  // no longer sends it. A caller that still passes one keeps the old validation.
  if (
    (patch.ac !== undefined && (!Number.isFinite(patch.ac) || patch.ac < 0)) ||
    !Number.isFinite(patch.speed) ||
    patch.speed < 0
  )
    throw new Error("Invalid defense or speed");
  if (
    Object.keys(abilities).some(
      (key) =>
        !Number.isInteger(patch.abilities?.[key]) ||
        patch.abilities[key] < 1 ||
        patch.abilities[key] > 30,
    )
  )
    throw new Error("Invalid abilities");
  const damage = actor.maxHp - actor.hp;
  Object.assign(actor, {
    name: patch.name.trim(),
    className: patch.className,
    level: patch.level,
    maxHp: patch.maxHp,
    // A sheet correction never takes a creature to 0 HP: dropping to 0 has vitality
    // consequences (Unconscious, Prone, Concentration) that only the conditions panel
    // applies, with a reason. Current damage is kept down to 1 HP.
    hp:
      !Number.isFinite(actor.hp) || actor.hp === 0
        ? actor.hp
        : Number.isFinite(damage)
          ? Math.max(1, patch.maxHp - damage)
          : Math.min(actor.hp, patch.maxHp),
    ac: patch.ac === undefined ? actor.ac : patch.ac,
    speed: patch.speed,
    abilities: { ...patch.abilities },
    manualValues: true,
  });
}
export function saveInventoryItem(actor, item) {
  if (typeof item.name !== "string" || !item.name.trim()) throw new Error("Invalid item name");
  if (!Number.isInteger(item.quantity) || item.quantity < 0) throw new Error("Invalid quantity");
  if (!Number.isFinite(item.weight) || item.weight < 0) throw new Error("Invalid weight");
  const existing = actor.inventory.find((entry) => entry.id === item.id);
  const values = { ...item, name: item.name.trim() };
  if (existing) Object.assign(existing, values);
  else actor.inventory.push(values);
}
const label = (ctx, value) => ctx.esc(ctx.label(value ?? ""));
// SV-37 (Roll20's errors name the cause and the fix): a disabled command carries one sentence
// «cause. remedy.» beside it, linked by aria-describedby. `reason` is locale text or "".
const whyId = (...parts) =>
  "character-why-" + parts.map((part) => String(part).replace(/[^a-z0-9_-]/gi, "-")).join("-");
const offWhy = (id, reason) => (reason ? ` disabled aria-describedby="${id}"` : "");
const whyNote = (ctx, id, reason) =>
  reason ? `<small class="character-why" id="${id}">${ctx.esc(reason)}</small>` : "";
function button(ctx, action, text, extra = "", kind = "quiet") {
  return (
    '<button type="button" class="button ' +
    kind +
    '" data-character-action="' +
    action +
    '" ' +
    extra +
    ">" +
    text +
    "</button>"
  );
}
function field(ctx, text, name, value = "", attributes = "") {
  return (
    '<label class="field"><span>' +
    text +
    '</span><input name="' +
    name +
    '" value="' +
    ctx.esc(value) +
    '" ' +
    attributes +
    "></label>"
  );
}
function textarea(ctx, text, name, value = "") {
  return (
    '<label class="field"><span>' +
    text +
    '</span><textarea name="' +
    name +
    '" rows="5" maxlength="20000">' +
    ctx.esc(value) +
    "</textarea></label>"
  );
}
function visibleActors(ctx) {
  return Object.values(ctx.state.actors).filter((actor) =>
    canViewActor(actor, ctx.role, ctx.state),
  );
}
function dataItem(ctx, item) {
  return 'data-item="' + ctx.esc(item.id) + '"';
}
function panel(title, body, actions = "") {
  return (
    '<section class="panel"><div class="section-heading"><h2>' +
    title +
    "</h2>" +
    actions +
    "</div>" +
    body +
    "</section>"
  );
}
function empty(text) {
  return '<p class="empty-state">' + text + "</p>";
}
function permissionActor(ctx, id) {
  const actor = ctx.state.actors[id];
  if (!actor || !ctx.canControl(actor))
    throw new Error(ctx.t("Non puoi modificare questa scheda.", "You cannot edit this sheet."));
  return actor;
}
function commit(ctx, id, text, mutation, options = {}) {
  const subject = permissionActor(ctx, id);
  ctx.commit(
    text,
    (draft) => {
      const actor = draft.actors[id];
      if (!actor || !ctx.canControl(actor))
        throw new Error(ctx.t("Permesso non disponibile.", "Permission unavailable."));
      const previousConcentrationId = actor.concentration?.id;
      mutation(actor, draft);
      if (
        previousConcentrationId &&
        (actor.concentration?.id !== previousConcentrationId ||
          actor.concentration?.active === false)
      ) {
        for (const subject of Object.values(draft.actors)) {
          subject.combatEffects = (subject.combatEffects || []).filter(
            (effect) => effect.concentrationId !== previousConcentrationId,
          );
        }
        observeConcentrationEnd(draft, id, previousConcentrationId);
      }
      if (actor.visibility !== "private") refreshConsequences(draft);
    },
    subject.visibility === "private" ? { ...options, local: true, visibility: "private" } : options,
  );
}
function safely(ctx, callback) {
  return (...args) => {
    try {
      return callback(...args);
    } catch (error) {
      const errors = {
        "Healing already pending": [
          "Completa prima il tiro della pozione già usata.",
          "Complete the pending potion roll first.",
        ],
        "Potion unavailable": [
          "La pozione non è più disponibile. Controlla la quantità.",
          "The potion is no longer available. Check its quantity.",
        ],
        "Bonus action unavailable": [
          "L’azione bonus è già spesa.",
          "The bonus action is already spent.",
        ],
        "Not this creature's turn": [
          "Il turno è cambiato: puoi eseguire l’uso nel tuo turno.",
          "The turn changed: execute the use on your turn.",
        ],
        "No pending healing": [
          "Questo tiro è già stato registrato.",
          "This roll has already been recorded.",
        ],
        "Invalid dice: two natural d4 faces required": [
          "Inserisci due facce naturali del d4, fra 1 e 4.",
          "Enter two natural d4 faces, between 1 and 4.",
        ],
        "Invalid name": ["Inserisci un nome per la scheda.", "Enter a name for the sheet."],
        "Invalid level": [
          "Il livello deve essere intero, fra 1 e 20.",
          "Level must be a whole number from 1 to 20.",
        ],
        "Invalid maximum hit points": [
          "I PF massimi devono essere almeno 1.",
          "Maximum HP must be at least 1.",
        ],
        "Invalid defense or speed": [
          "Controlla classe armatura e velocità: nessun valore negativo.",
          "Check armor class and speed: neither can be negative.",
        ],
        "Invalid abilities": [
          "Inserisci sei caratteristiche intere fra 1 e 30.",
          "Enter six whole ability scores from 1 to 30.",
        ],
        "Invalid item name": ["Inserisci un nome per l’oggetto.", "Enter an item name."],
        "Record current and maximum hit points before healing": [
          "Registra i PF attuali e massimi prima di applicare una cura.",
          "Record current and maximum hit points before healing.",
        ],
        "Invalid quantity": [
          "La quantità deve essere intera e non negativa.",
          "Quantity must be a non-negative whole number.",
        ],
        "Invalid weight": ["Il peso non può essere negativo.", "Weight cannot be negative."],
        "Empty personality entry": ["Scrivi la voce.", "Write the entry."],
        "Duplicate personality entry": ["Questa voce c’è già.", "This entry is already there."],
        "Too many personality entries": [
          "Al massimo 12 voci per elenco.",
          "At most 12 entries per list.",
        ],
      };
      throw new Error(errors[error.message] ? ctx.t(...errors[error.message]) : error.message);
    }
  };
}
const number = (data, key) => Number(data.get(key));

function renderBuildDrafts(ctx) {
  const drafts = (ctx.state.characterDrafts || []).filter(
    (draft) => draft.owner === ctx.role && draft.status === "active",
  );
  if (!drafts.length) return "";
  const names = {
    create: ["Creazione", "Creation"],
    reconstruct: ["Ricostruzione", "Reconstruction"],
    advance: ["Avanzamento", "Advancement"],
    revise: ["Rivedi scelte", "Revise choices"],
  };
  return panel(
    ctx.t("Le tue bozze private", "Your private drafts"),
    '<div class="item-list">' +
      drafts
        .map(
          (draft) =>
            `<div class="item-row"><div><strong>${ctx.esc(draft.data?.identity?.name || ctx.state.actors[draft.actorId]?.name || ctx.t("Personaggio senza nome", "Unnamed character"))}</strong><p class="muted">${ctx.t(...names[draft.kind])} · ${ctx.storageError ? ctx.t("Solo in questa scheda: memoria non disponibile", "In this tab only: storage unavailable") : ctx.t("Salvata in questo browser", "Saved in this browser")}</p></div>${button(ctx, "resume-build", ctx.t("Riprendi bozza", "Resume draft"), 'data-draft="' + ctx.esc(draft.id) + '"')}</div>`,
        )
        .join("") +
      "</div>",
  );
}
export function renderCharacters(ctx) {
  const { t, esc } = ctx;
  const actor = ctx.view.id ? getEffectiveActor(ctx.state.actors[ctx.view.id]) : null;
  if (ctx.view.id && !canViewActor(actor, ctx.role, ctx.state))
    return (
      empty(t("Scheda non disponibile.", "Sheet unavailable.")) +
      button(ctx, "collection", t("Torna ai personaggi", "Back to characters"))
    );
  if (!actor)
    return (
      '<header class="page-heading"><div><h1>' +
      t("Personaggi", "Characters") +
      '</h1><p class="muted">' +
      t(
        "La stessa scheda, durante e fuori dalla partita.",
        "The same sheet, at the table and between sessions.",
      ) +
      "</p></div>" +
      '<div class="toolbar">' +
      button(ctx, "reconstruct", t("Ricostruisci una scheda", "Reconstruct a sheet")) +
      button(ctx, "create", t("Crea personaggio", "Create character"), "", "primary") +
      "</div></header>" +
      renderBuildDrafts(ctx) +
      '<div class="toolbar"><label class="field character-search"><span>' +
      t("Cerca personaggi", "Search characters") +
      '</span><input type="search" data-character-filter></label></div><div class="character-grid">' +
      visibleActors(ctx)
        .map(getEffectiveActor)
        .map(
          (entry) =>
            '<article class="panel character-card" data-character-card data-search="' +
            esc((entry.name + " " + ctx.label(entry.className)).toLocaleLowerCase()) +
            '"><div class="character-portrait" aria-hidden="true">' +
            esc(entry.name.slice(0, 1)) +
            '</div><div class="character-card-copy"><span class="badge">' +
            (ctx.canControl(entry) ? t("Controllo", "Control") : t("Consultazione", "View only")) +
            "</span><h2>" +
            esc(entry.name) +
            "</h2><p>" +
            label(ctx, entry.className) +
            " · " +
            t("Livello", "Level") +
            " " +
            entry.level +
            '</p><p class="muted">' +
            (entry.hp ?? "—") +
            "/" +
            (entry.maxHp ?? "—") +
            " " +
            t("PF", "HP") +
            " · " +
            t("CA", "AC") +
            " " +
            entry.ac +
            "</p></div>" +
            button(
              ctx,
              "open",
              t("Apri scheda", "Open sheet"),
              'data-actor="' + esc(entry.id) + '"',
              "primary",
            ) +
            "</article>",
        )
        .join("") +
      '</div><p class="empty-state" data-character-no-results hidden>' +
      t("Nessun personaggio corrisponde alla ricerca.", "No characters match your search.") +
      "</p>"
    );
  // Core tabs merged with area tabs (B11): an area may add a tab or replace a core one.
  const coreTabs = Object.entries(tabs).map(([id, names]) => ({ id, names }));
  const tabItems =
    ctx.registry?.merge("sheet-tab", coreTabs, ctx, actor) ??
    coreTabs.map((item) => ({ ...item, core: true }));
  // B62: D&D Beyond's sheet sections (sheetCategories): an area tab with a category is a
  // sub-section of it; `tab` may name a category or one of its members.
  const categories = sheetCategories(ctx, tabItems);
  const requested = ctx.view.tab;
  const openCategory =
    categories.find((c) => c.id === requested) ??
    categories.find((c) => c.members.some((m) => m.id === requested)) ??
    categories[0];
  const tab = openCategory.members.some((m) => m.id === requested)
    ? requested
    : openCategory.members[0].id;
  const extTab = tabItems.find((item) => item.id === tab && !item.core);
  const editable = ctx.canControl(actor);
  const sections = {
    actions: renderActions,
    inventory: renderInventory,
    spells: renderSpells,
    features: renderFeatures,
    story: renderStory,
    extras: renderExtras,
  };
  const overlay = ctx.sheetOverlay === true;
  // D&D Beyond's phone sheet shows one page at a time; «Abilities, Saves, Senses» and
  // «Skills» are pages beside the categories there. On a wider sheet both stay in the left
  // columns, so the route falls back to the open category (see characters.css).
  const page = SHEET_PAGES.find((p) => p.id === requested)?.id ?? "";
  const slots = (pseudoTab) =>
    ctx.registry
      ?.list("sheet-section", ctx, actor)
      .filter((c) => c.tab === pseudoTab)
      .map((c) => ctx.registry.slot("sheet-section", c, ctx, actor))
      .join("") ?? "";
  // Registry hook (visual pass 2): sheet sections of the pseudo tab "side" render in the
  // sheet's left columns on every tab (D&D Beyond: saving throws, senses, proficiencies and
  // skills beside the tabs).
  const side = slots("side");
  const strip =
    '<nav class="tabs character-tabs" aria-label="' +
    t("Sezioni della scheda", "Character sheet sections") +
    '">' +
    SHEET_PAGES.map(
      (p) =>
        '<button type="button" class="character-page-tab' +
        (p.id === page ? " active" : "") +
        '" data-character-page-tab="' +
        p.id +
        '"' +
        (p.id === page ? ' aria-current="page"' : "") +
        ">" +
        t(...p.names) +
        "</button>",
    ).join("") +
    categories
      .map((category) => {
        const open = category === openCategory && !page;
        return (
          '<button type="button" class="' +
          (open ? "active" : category === openCategory ? "is-fallback" : "") +
          '" data-character-tab="' +
          esc(category.id) +
          '" ' +
          (open ? 'aria-current="page"' : "") +
          ">" +
          category.name +
          "</button>"
        );
      })
      .join("") +
    // W2a2 integration: on a phone the sheet's sections scroll sideways beside "All sections",
    // pinned at the end (D&D Beyond's sheet quick-jump, DDB-060; same control as the campaign
    // strip and the Table's "All panels"): it lists every section, also those off-screen.
    '</nav><button type="button" class="character-tabs-all" data-character-tabs-all aria-haspopup="dialog" aria-label="' +
    t("Tutte le sezioni della scheda", "All sheet sections") +
    '" title="' +
    t("Tutte le sezioni della scheda", "All sheet sections") +
    '">' +
    icon("grid") +
    '<span aria-hidden="true">' +
    t("Tutte", "All") +
    "</span></button>";
  return (
    '<div class="character-sheet' +
    (overlay ? " in-overlay" : "") +
    '" data-character-page="' +
    (page || "tab") +
    // Final review F11: the open category, so a phone shows the quick boxes on its main
    // pages only (D&D Beyond mobile).
    '" data-character-category="' +
    esc(openCategory.id) +
    '"><div class="character-layout">' +
    (overlay
      ? ""
      : '<div class="toolbar character-breadcrumb">' +
        button(ctx, "collection", "← " + t("Personaggi", "Characters")) +
        '<span class="muted">/ ' +
        esc(actor.name) +
        "</span></div>") +
    // D&D Beyond's sheet header: portrait, name, then species, class and level; the sheet's
    // commands (Short/Long Rest, Manage…) on the right.
    '<header class="page-heading character-heading"><div class="character-heading-identity">' +
    portraitControl(ctx, actor, editable) +
    '<div class="character-heading-copy"><h1>' +
    esc(actor.name) +
    '</h1><p class="character-heading-line">' +
    headingLine(ctx, actor) +
    '</p><p class="muted character-heading-note">' +
    (editable
      ? t("Scheda controllata da te", "A sheet you control")
      : t(
          "Consultazione · modifiche riservate ai controllori",
          "View only · controllers can make changes",
        )) +
    '</p></div></div><div class="toolbar">' +
    (editable && actor.kind === "character" ? button(ctx, "rest", t("Riposa", "Rest")) : "") +
    (editable ? button(ctx, "edit-character", t("Correggi valori", "Correct values")) : "") +
    (editable && actor.kind === "character"
      ? button(
          ctx,
          "advance",
          t("Avanza di livello", "Level up"),
          offWhy(
            whyId("advance", actor.id),
            actor.level >= 20
              ? t(
                  "Livello massimo raggiunto (20). Per cambiare scelte usa «Rivedi scelte».",
                  "Maximum level reached (20). To change choices use “Revise choices”.",
                )
              : "",
          ),
        ) +
        whyNote(
          ctx,
          whyId("advance", actor.id),
          actor.level >= 20
            ? t(
                "Livello massimo raggiunto (20). Per cambiare scelte usa «Rivedi scelte».",
                "Maximum level reached (20). To change choices use “Revise choices”.",
              )
            : "",
        ) +
        button(ctx, "revise", t("Rivedi scelte", "Revise choices"))
      : "") +
    (editable &&
    (actor.kind === "character" || actor.companion) &&
    !isCampaignActor(actor, ctx.state.campaign.id)
      ? button(ctx, "connect-campaign", t("Collega alla campagna", "Connect to campaign"))
      : "") +
    (overlay ? "" : button(ctx, "table", t("Vai al Tavolo", "Go to Table"), "", "primary")) +
    "</div></header>" +
    (actor.activeForm && ctx.view.tab !== "extras" ? renderFormsSummary(ctx, actor.id) : "") +
    // D&D Beyond's top band: six abilities, Proficiency Bonus, Walking Speed, Heroic
    // Inspiration and Hit Points, one row from edge to edge.
    renderBand(ctx, actor, slots("band")) +
    '<div class="character-body' +
    (side ? "" : " no-side") +
    '">' +
    (side ? '<div class="character-side">' + side + "</div>" : "") +
    '<div class="character-main"><div class="character-summary">' +
    // Registry hook (B37, additive): sheet sections declared for the pseudo-tab "summary"
    // render above the tabs on every tab: D&D Beyond's Initiative, Armor Class and Defenses
    // strip, with the dnd5e favourites. They bind with the other sheet sections.
    slots("summary") +
    conditionsBox(ctx, actor) +
    (actor.pendingHealing && editable
      ? '<div class="character-notice"><div><strong>' +
        t("Pozione usata · tiro da registrare", "Potion used · roll pending") +
        "</strong><p>" +
        t(
          "Quantità e azione sono già registrate. Completa i dadi senza consumare di nuovo.",
          "Quantity and action are already recorded. Complete the dice without spending again.",
        ) +
        "</p></div>" +
        button(ctx, "pending-healing", t("Registra 2d4", "Record 2d4"), "", "primary") +
        "</div>"
      : "") +
    "</div>" +
    '<div class="character-tabs-bar">' +
    strip +
    "</div>" +
    // Sub-sections of the open category (DDB filter chips): the core member and each area
    // tab folded into it; an area member keeps its own data-character-tab handle.
    (openCategory.members.length > 1
      ? '<nav class="character-subtabs" aria-label="' +
        openCategory.name +
        '">' +
        openCategory.members
          .map(
            (m) =>
              '<button type="button" class="' +
              (m.id === tab ? "active" : "") +
              '" data-character-subtab="' +
              esc(m.id) +
              '"' +
              (m.id !== openCategory.id ? ' data-character-tab="' + esc(m.id) + '"' : "") +
              (m.id === tab ? ' aria-current="true"' : "") +
              ">" +
              m.name +
              "</button>",
          )
          .join("") +
        "</nav>"
      : "") +
    '<div class="character-tab-content">' +
    (tab === "actions" ? turnResources(ctx, actor) : "") +
    (extTab ? ctx.registry.slot("sheet-tab", extTab, ctx, actor) : sections[tab](ctx, actor)) +
    slots(tab) +
    "</div></div></div></div></div>"
  );
}
// D&D Beyond's header line under the name: species, class and level ("Human Wizard 7").
function headingLine(ctx, actor) {
  let species = null;
  try {
    species = speciesOf(actor)?.name ?? null;
  } catch {
    species = null;
  }
  return [species ? ctx.label(species) : "", ctx.label(actor.className ?? "")]
    .filter(Boolean)
    .map((part) => ctx.esc(part))
    .concat(ctx.t("Livello", "Level") + " " + ctx.esc(String(actor.level ?? "—")))
    .join(" · ");
}
// PG-44 / BI-32: D&D Beyond's header portrait is the way into the character's look: a
// click opens the appearance picker (portrait, instant token preview, crop, border colour).
function portraitControl(ctx, actor, editable) {
  let art = null;
  try {
    art = portraitArt(ctx.state, actor.id);
  } catch {
    art = null;
  }
  const url = art?.asset ? mediaSrc(art.asset) : "";
  const face = url ? `<img src="${ctx.esc(url)}" alt="">` : ctx.esc(actor.name.slice(0, 1));
  if (!editable || !ctx.state.ext?.media)
    return `<div class="character-portrait small" aria-hidden="true">${face}</div>`;
  const text = ctx.t(
    `Aspetto di ${actor.name}: ritratto, pedina e ritaglio`,
    `${actor.name}’s appearance: portrait, token and crop`,
  );
  return `<button type="button" class="character-portrait small character-portrait-button" data-character-action="appearance" aria-label="${ctx.esc(text)}" title="${ctx.esc(text)}">${face}<span class="character-portrait-edit" aria-hidden="true">${icon("pen")}</span></button>`;
}
// PG-33: D&D Beyond's Heroic Inspiration box in the top band; the state stays the dice
// tray's (setInspiration), so the DM's party overview reads the same flag.
function inspirationToggle(ctx, actor) {
  const slice = ctx.state.ext?.[DT.ID];
  if (!slice || actor.kind !== "character" || actor.companion) return "";
  const on = DT.hasInspiration(slice, actor.id);
  const can = ctx.role === "dm" || ctx.canControl(ctx.state.actors[actor.id] ?? actor);
  const text = on
    ? ctx.t(
        "Ispirazione eroica: ce l’hai · clic per toglierla",
        "Heroic Inspiration: you have it · click to remove it",
      )
    : ctx.t(
        "Ispirazione eroica: non ce l’hai · clic per segnarla",
        "Heroic Inspiration: you don’t have it · click to mark it",
      );
  // SV-37: a viewer who cannot change it reads the state, not an inert control.
  if (!can)
    return `<span class="character-inspiration is-static${on ? " is-on" : ""}"><span aria-hidden="true">${on ? "★" : "☆"}</span> ${ctx.t("Ispirazione eroica", "Heroic Inspiration")}: ${on ? ctx.t("sì", "yes") : ctx.t("no", "no")}</span>`;
  return `<button type="button" class="character-inspiration${on ? " is-on" : ""}" data-character-action="inspiration" aria-pressed="${on}" title="${ctx.esc(text)}"><span aria-hidden="true">${on ? "★" : "☆"}</span> ${ctx.t("Ispirazione eroica", "Heroic Inspiration")}</button>`;
}

// PG-20: the sheet over the map (Foundry's sheet window over the canvas, D&D Beyond's sheet
// inside Maps). It renders the same sheet in a drawer beside the Table, on the chosen tab;
// closing it leaves the map exactly as it was (the Table under it is never re-routed).
let overlay = null;
function overlayContext(ctx) {
  return Object.create(ctx, {
    sheetOverlay: { value: true },
    view: {
      get: () => ({
        page: "characters",
        id: overlay?.actorId ?? "",
        tab: overlay?.tab ?? "actions",
        revision: "",
        returnTo: "",
      }),
    },
    navigate: {
      value: (page, params = {}) => {
        if (page === "characters" && params.id && overlay) {
          overlay.actorId = params.id;
          overlay.tab = params.tab || "actions";
          return drawOverlay();
        }
        if (page === "table") return closeSheetOverlay();
        closeSheetOverlay({ restoreFocus: false });
        return ctx.navigate(page, params);
      },
    },
    openSheet: {
      value: (id, tab) => openSheetOverlay(ctx, id, tab),
    },
    render: {
      value: () => {
        ctx.render();
        drawOverlay();
      },
    },
  });
}
function drawOverlay() {
  if (!overlay || typeof document === "undefined") return;
  const { ctx, el } = overlay;
  const actor = ctx.state.actors[overlay.actorId];
  if (!actor || !canViewActor(actor, ctx.role, ctx.state)) return closeSheetOverlay();
  const body = el.querySelector("[data-sheet-overlay-body]");
  const scroll = body.scrollTop;
  const sheetCtx = overlayContext(ctx);
  overlay.drawing = true;
  try {
    el.querySelector("[data-sheet-overlay-title]").textContent = actor.name;
    body.innerHTML = renderCharacters(sheetCtx);
    bindCharacters(body, sheetCtx);
  } finally {
    overlay.drawing = false;
  }
  body.scrollTop = scroll;
}
export function closeSheetOverlay({ restoreFocus = true } = {}) {
  if (!overlay) return;
  const { el, observer, opener } = overlay;
  observer?.disconnect();
  el.remove();
  overlay = null;
  if (restoreFocus && opener?.isConnected) opener.focus({ preventScroll: true });
  else if (restoreFocus)
    globalThis.document?.querySelector('[data-table="actions"], #battle-map')?.focus?.({
      preventScroll: true,
    });
}
/** Opens `actorId`'s sheet in a drawer over the Table, on `tab` (actions, inventory…). */
export function openSheetOverlay(ctx, actorId, tab = "actions") {
  if (typeof document === "undefined") return ctx.openSheet?.(actorId, tab);
  const actor = ctx.state.actors[actorId];
  if (!actor || !canViewActor(actor, ctx.role, ctx.state)) return;
  if (overlay) {
    overlay.actorId = actorId;
    overlay.tab = tab || "actions";
    drawOverlay();
    overlay.el.querySelector("[data-sheet-overlay-close]")?.focus({ preventScroll: true });
    return;
  }
  const el = document.createElement("aside");
  el.className = "sheet-overlay";
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "false");
  el.setAttribute("aria-labelledby", "sheet-overlay-title");
  el.innerHTML = `<div class="sheet-overlay-head"><span class="sheet-overlay-kicker">${ctx.t("Scheda", "Sheet")}</span><strong id="sheet-overlay-title" data-sheet-overlay-title></strong><button type="button" class="button quiet" data-sheet-overlay-full>${ctx.t("Apri a tutta pagina", "Open full page")}</button><button type="button" class="button" data-sheet-overlay-close aria-label="${ctx.t("Chiudi la scheda e torna alla mappa", "Close the sheet and return to the map")}">${icon("close")} ${ctx.t("Chiudi", "Close")}</button></div><div class="sheet-overlay-body" data-sheet-overlay-body></div>`;
  document.body.append(el);
  overlay = { ctx, el, actorId, tab: tab || "actions", opener: document.activeElement };
  el.querySelector("[data-sheet-overlay-close]").addEventListener("click", () =>
    closeSheetOverlay(),
  );
  el.querySelector("[data-sheet-overlay-full]").addEventListener("click", () => {
    const { actorId: id, tab: current } = overlay;
    closeSheetOverlay({ restoreFocus: false });
    ctx.navigate("characters", { id, tab: current });
  });
  el.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !document.querySelector("#dialog[open]")) {
      event.stopPropagation();
      closeSheetOverlay();
    }
  });
  // The app redraws #app after every change: the drawer follows it (and closes when the
  // Table itself is left).
  const app = document.querySelector("#app");
  if (app && typeof MutationObserver === "function") {
    overlay.observer = new MutationObserver(() => {
      if (!overlay || overlay.drawing) return;
      if (ctx.view.page !== "table") return closeSheetOverlay({ restoreFocus: false });
      queueMicrotask(drawOverlay);
    });
    overlay.observer.observe(app, { childList: true });
  }
  drawOverlay();
  el.querySelector("[data-sheet-overlay-close]").focus({ preventScroll: true });
}
/**
 * B62 — the sheet's categories in D&D Beyond order (SHEET_CATEGORIES: Actions, Spells,
 * Inventory, Features & Traits, Story, Notes, Extras), each with its members: the core tab
 * (or the area replacing it) first, then the area tabs declaring that category. An area tab
 * without a category keeps its own top-level entry. Empty categories are left out.
 * Returns [{id, name, members: [{id, name, core}]}] with escaped names.
 */
const PROMOTED_TABS = new Set(["party-bastion"]);
export function sheetCategories(ctx, tabItems) {
  const coreIds = new Set(Object.keys(tabs));
  const known = new Set(SHEET_CATEGORIES.map((c) => c.id));
  const name = (item) =>
    item.core ? ctx.t(...item.names) : ctx.esc(ctx.registry.label(item, ctx.lang));
  // PG-82 (dnd5e Bastion tab): the Bastion is a section of its own once the character has
  // one (its area shows it from the rules' minimum level), not a sub-page of Extra.
  const categoryOf = (item) =>
    coreIds.has(item.id)
      ? item.id
      : PROMOTED_TABS.has(item.id)
        ? null
        : known.has(item.category)
          ? item.category
          : null;
  const member = (item) => ({ id: item.id, name: name(item), core: coreIds.has(item.id) });
  const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);
  return [
    ...SHEET_CATEGORIES.map((category) => {
      const inside = tabItems.filter((item) => categoryOf(item) === category.id);
      const own = inside.filter((item) => coreIds.has(item.id));
      const rest = inside.filter((item) => !coreIds.has(item.id)).sort(byOrder);
      return {
        id: category.id,
        order: category.order,
        name: ctx.esc(ctx.t(category.label.it, category.label.en)),
        members: [...own, ...rest].map(member),
      };
    }),
    ...tabItems
      .filter((item) => !categoryOf(item))
      .map((item) => ({
        id: item.id,
        order: item.order,
        name: name(item),
        members: [member(item)],
      })),
  ]
    .filter((category) => category.members.length)
    .sort(byOrder);
}
function acTotal(ctx, actor) {
  try {
    if (SP.sliceOf(ctx.state)) return SP.statValue(ctx.state, actor.id, "ac").total;
  } catch {
    /* fall back to the effective sheet value */
  }
  return getEffectiveActor(ctx.state.actors[actor.id] ?? actor)?.ac ?? null;
}
// PG-25: the AC card shows the same total as the stat chain (base, reasoned changes, worn
// items such as a Cloak of Protection), with D&D Beyond's components as the note; a click
// opens the reasoned-change dialog. Without the sheet-plus area it shows the sheet value.
function acCard(ctx, actor, { hidden = false } = {}) {
  const { t } = ctx;
  const shield = actor.combatEffects?.some((effect) => effect.type === "shield") ? 5 : 0;
  let stat = null;
  try {
    stat = SP.sliceOf(ctx.state) ? SP.statValue(ctx.state, actor.id, "ac") : null;
  } catch {
    stat = null;
  }
  const value = stat ? stat.total : actor.ac;
  const parts = [];
  if (stat && !stat.form) {
    parts.push(t(`${stat.base} base`, `${stat.base} base`));
    if (stat.steps.some((step) => step.applied))
      parts.push(t("modifiche motivate", "reasoned changes"));
    for (const part of [...(stat.itemParts ?? []), ...(stat.conditionParts ?? [])])
      parts.push(ctx.label(part.label) + " " + signed(part.value));
  } else if (stat?.form) parts.push(t("Valore della forma", "Form value"));
  if (shield) parts.push(t("Scudo", "Shield") + " +5");
  const note =
    parts.length > (shield ? 1 : 0) || shield
      ? parts.join(" · ")
      : t("Valore della scheda", "Sheet value");
  const inner =
    "<span>" +
    t("Classe armatura", "Armor class") +
    "</span><strong>" +
    (Number.isFinite(value) ? value + shield : "—") +
    "</strong><small>" +
    ctx.esc(note) +
    "</small>";
  return stat
    ? '<button type="button" class="stat character-stat-button" data-character-ac data-character-action="ac-detail" aria-label="' +
        ctx.esc(
          t(
            `Classe armatura ${value + shield}: componenti e modifiche`,
            `Armor class ${value + shield}: components and changes`,
          ),
        ) +
        '"' +
        (hidden ? " hidden" : "") +
        ">" +
        inner +
        "</button>"
    : '<div class="stat" data-character-ac' + (hidden ? " hidden" : "") + ">" + inner + "</div>";
}
// PG-30 / PG-70: D&D Beyond's combined speed box. The chosen speed ("Volare 18 m") is the
// number; walking shows the speed now in effect (encumbrance, conditions, form) with the
// base and each penalty as the note; the other speeds and the sense chosen for the top
// are listed under it. A click opens the one «Velocità e sensi» dialog.
function movementCard(ctx, actor) {
  const { t } = ctx;
  const canonical = ctx.state.actors[actor.id] ?? actor;
  const m = (value) => formatNumber(ctx.lang, value, 2) + " m";
  const walking = speedBreakdown({ ...canonical, movementMode: undefined });
  let speeds = { walk: actor.speed };
  let display = "walk";
  let moving = "walk";
  let sense = null;
  try {
    if (SP.sliceOf(ctx.state)) {
      speeds = SP.speedsOf(ctx.state, actor.id);
      const entry = SP.entryOf(ctx.state, actor.id);
      display = speeds[entry?.speedDisplay] ? entry.speedDisplay : "walk";
      moving = SP.currentMovementMode(ctx.state, actor.id);
      const senses = SP.sensesOf(ctx.state, actor.id);
      if (entry?.senseDisplay && senses[entry.senseDisplay]?.value)
        sense = { id: entry.senseDisplay, value: senses[entry.senseDisplay].value };
    }
  } catch {
    speeds = { walk: actor.speed };
  }
  const shown = moving !== "walk" ? moving : display;
  const walkNow = walking?.effective ?? speeds.walk ?? actor.speed;
  const walkNote = speedNote(ctx, walking);
  const name = (mode) => ctx.label(SP.SPEED_NAMES?.[mode] ?? { it: mode, en: mode });
  const primary = shown === "walk" ? walkNow : speeds[shown];
  const lines = [];
  if (shown === "walk")
    lines.push(
      (canonical.activeForm ? t("Velocità della forma", "Form speed") : name("walk")) +
        (walkNote ? " · " + walkNote : ""),
    );
  else
    lines.push(
      name(shown) + (moving === shown && moving !== "walk" ? " · " + t("in uso", "in use") : ""),
      name("walk") + " " + m(walkNow) + (walkNote ? " (" + walkNote + ")" : ""),
    );
  const others = (SP.SPEED_MODES ?? [])
    .filter((mode) => mode !== "walk" && mode !== shown && Number.isFinite(speeds[mode]))
    .map((mode) => name(mode) + " " + m(speeds[mode]));
  if (others.length) lines.push(others.join(" · "));
  if (sense)
    lines.push(
      ctx.label(SP.SENSE_NAMES?.[sense.id] ?? { it: sense.id, en: sense.id }) +
        " " +
        m(sense.value),
    );
  const inner =
    "<span>" +
    t("Movimento", "Movement") +
    "</span><strong>" +
    (Number.isFinite(primary) ? formatNumber(ctx.lang, primary, 2) : "—") +
    " <small>m</small></strong>" +
    lines.map((line) => "<small>" + ctx.esc(line) + "</small>").join("");
  return SP.sliceOf(ctx.state) && ctx.canControl(canonical)
    ? '<button type="button" class="stat character-stat-button" data-character-speed data-character-action="speeds" aria-label="' +
        ctx.esc(
          t(`Movimento: ${lines[0]}. Velocità e sensi`, `Movement: ${lines[0]}. Speeds and senses`),
        ) +
        '">' +
        inner +
        "</button>"
    : '<div class="stat" data-character-speed>' + inner + "</div>";
}
// D&D Beyond's top band. The sheet area (B37) puts the six abilities and the Proficiency
// Bonus first (pseudo tab "band"); the core adds Walking Speed, Heroic Inspiration and Hit
// Points. The core AC card is the fallback for a sheet without that area: with it, Armor
// Class is the area's box in the strip over the tabs, so the number shows once.
function renderBand(ctx, actor, bandSections) {
  const areaAc = Boolean(SP.sliceOf(ctx.state));
  return (
    '<div class="character-band' +
    (bandSections ? "" : " no-abilities") +
    '">' +
    bandSections +
    '<div class="stats character-vitals">' +
    movementCard(ctx, actor) +
    acCard(ctx, actor, { hidden: areaAc }) +
    inspirationToggle(ctx, actor) +
    hpCard(ctx, actor) +
    "</div></div>"
  );
}
// D&D Beyond: at 0 HP (or dead) the Hit Points box turns into the death-save box. The
// conditions summary holds the death saves, so it moves from the strip into the HP box.
const downed = (actor) => actor.dead === true || actor.hp === 0;
// D&D Beyond's Hit Points box: Heal, the amount and Damage beside Current / Max / Temp.
function hpCard(ctx, actor) {
  const { t } = ctx;
  const linked = ctx.canControl?.(actor) && ctx.registry?.get?.("command", "damage-tray.hp", ctx);
  return (
    '<div class="stat character-hp"><span>' +
    t("Punti ferita", "Hit points") +
    "</span>" +
    // P3 PG-21 (shared edit, D&D Beyond HP box): the HP numbers open the one HP widget on
    // «Correggi» when the HP area (B33) is built; otherwise they stay plain text.
    (linked
      ? '<button type="button" class="character-hp-value" data-character-action="hp-correct" aria-haspopup="dialog" aria-label="' +
        ctx.esc(
          t(
            `Punti ferita ${actor.hp ?? "—"} su ${actor.maxHp ?? "—"}: temporanei, massimo, registro e correzioni`,
            `Hit points ${actor.hp ?? "—"} of ${actor.maxHp ?? "—"}: temporary HP, maximum, log and corrections`,
          ),
        ) +
        '">'
      : "") +
    "<strong>" +
    (actor.hp ?? "—") +
    " <small>/ " +
    (actor.maxHp ?? "—") +
    "</small></strong>" +
    (linked ? "</button>" : "") +
    '<span class="character-hp-temp">' +
    (actor.tempHp > 0
      ? "<b>" + actor.tempHp + "</b> " + t("PF temporanei", "Temporary HP")
      : t("PF temporanei —", "Temporary HP —")) +
    "</span>" +
    '<progress value="' +
    actor.hp +
    '" max="' +
    actor.maxHp +
    '" aria-label="' +
    t("Punti ferita", "Hit points") +
    '"></progress>' +
    (downed(actor) ? renderConditionsSummary(ctx, actor.id, { embedded: true }) : "") +
    // B33 hook (additive): sheet sections with the pseudo tab "vitals" render inside the HP
    // card (D&D Beyond HP box, DDB-032); bindCharacters already binds every sheet section.
    (ctx.registry
      ?.list("sheet-section", ctx, actor)
      .filter((c) => c.tab === "vitals")
      .map((c) => ctx.registry.slot("sheet-section", c, ctx, actor))
      .join("") ?? "") +
    "</div>"
  );
}
// D&D Beyond's Conditions box in the strip over the tabs (its 2024 sheet keeps Exhaustion
// there): vital state, death saves, chips, «+ Condizione», Exhaustion and the one entry to
// damage, healing and conditions.
function conditionsBox(ctx, actor) {
  if (downed(actor)) return "";
  const summary = renderConditionsSummary(ctx, actor.id, { embedded: true });
  if (!summary) return "";
  const id = "character-conditions-" + actor.id.replace(/[^a-z0-9_-]/gi, "-");
  return (
    '<section class="stat character-conditions" aria-labelledby="' +
    id +
    '"><span id="' +
    id +
    '">' +
    ctx.t("Condizioni", "Conditions") +
    "</span>" +
    summary +
    "</section>"
  );
}
// BG3's action economy over the Actions list (the hotbar's resource row): Action green
// circle, Bonus action orange triangle, Reaction magenta star; a spent one is an empty
// outline, and the state is also said in words to assistive technology.
const TURN_SHAPES = {
  action: '<circle cx="6" cy="6" r="4.6"/>',
  bonus: '<polygon points="6,1.4 10.8,10.4 1.2,10.4"/>',
  reaction: '<polygon points="6,0.8 7.5,4.5 11.2,6 7.5,7.5 6,11.2 4.5,7.5 0.8,6 4.5,4.5"/>',
};
function turnResources(ctx, actor) {
  const { t } = ctx;
  return (
    '<div class="character-turn" role="group" aria-label="' +
    t("Risorse del turno", "Turn resources") +
    '"><span class="character-turn-label" aria-hidden="true">' +
    t("Risorse del turno", "Turn resources") +
    "</span>" +
    [
      ["action", t("Azione", "Action")],
      ["bonus", t("Azione bonus", "Bonus action")],
      ["reaction", t("Reazione", "Reaction")],
    ]
      .map(
        ([key, name]) =>
          '<span class="character-resource is-' +
          key +
          (actor[key] ? "" : " is-spent") +
          '"><svg viewBox="0 0 12 12" aria-hidden="true">' +
          TURN_SHAPES[key] +
          "</svg>" +
          name +
          '<span class="visually-hidden">: ' +
          (actor[key] ? t("disponibile", "available") : t("spesa", "spent")) +
          "</span></span>",
      )
      .join("") +
    "</div>"
  );
}
function renderActions(ctx, actor) {
  const { t } = ctx;
  // PG-20: with the sheet-plus area the Actions tab lists abilities (in the always-visible
  // row), saves, skills and every action once, as D&D Beyond; this is only the fallback.
  if (SP.sliceOf(ctx.state)) return "";
  const weapons = actor.inventory.filter(
    (item) =>
      item.kind === "weapon" &&
      item.equipped &&
      item.availableInForm !== false &&
      item.location !== "ground" &&
      item.quantity > 0,
  );
  const content =
    '<p class="muted">' +
    t(
      "Movimento e dadi sono disponibili al Tavolo. Il percorso completo degli attacchi è ancora in costruzione.",
      "Movement and dice are available at the Table. The full attack journey is still under construction.",
    ) +
    '</p><div class="item-list">' +
    (weapons
      .map(
        (item) =>
          '<div class="item-row"><div><strong>' +
          label(ctx, item.name) +
          '</strong><p class="muted">' +
          t("Arma equipaggiata", "Equipped weapon") +
          "</p></div>" +
          button(ctx, "detail-item", t("Dettagli", "Details"), dataItem(ctx, item)) +
          libraryControl(ctx, "inventory", item) +
          button(ctx, "table", t("Apri il Tavolo", "Open the Table")) +
          "</div>",
      )
      .join("") || empty(t("Nessuna arma equipaggiata.", "No equipped weapons."))) +
    '</div><div class="character-action-footer">' +
    button(ctx, "table", t("Apri il Tavolo", "Open the Table"), "", "primary") +
    "</div>";
  const checks =
    '<p class="muted">' +
    t(
      "Apri una prova per vedere dado e modificatore.",
      "Open a check to see the die and modifier.",
    ) +
    '</p><div class="character-abilities">' +
    Object.entries(abilities)
      .map(
        ([key, names]) =>
          '<button type="button" data-character-action="check" data-ability="' +
          key +
          '" ' +
          offWhy(
            whyId("checks", actor.id),
            !ctx.canControl(actor) || !Number.isFinite(actor.abilities[key]),
          ) +
          "><span>" +
          t(...names) +
          "</span><strong>" +
          (actor.abilities[key] ?? "—") +
          "</strong><b>" +
          signed(modifier(actor.abilities[key])) +
          "</b></button>",
      )
      .join("") +
    "</div>" +
    whyNote(
      ctx,
      whyId("checks", actor.id),
      !ctx.canControl(actor)
        ? t(
            "Sola lettura: le prove le tira chi controlla la scheda.",
            "Read only: the sheet’s controller rolls its checks.",
          )
        : Object.keys(abilities).some((key) => !Number.isFinite(actor.abilities?.[key]))
          ? t(
              "Un punteggio non è registrato: completalo con «Correggi valori» per tirarne la prova.",
              "A score is not recorded: fill it in with “Correct values” to roll its check.",
            )
          : "",
    ) +
    (actor.lastCheck
      ? '<p class="character-roll-result"><strong>' +
        label(ctx, actor.lastCheck.name) +
        ": " +
        actor.lastCheck.total +
        "</strong><br>d20 " +
        actor.lastCheck.face +
        " " +
        signed(actor.lastCheck.modifier) +
        " = " +
        actor.lastCheck.total +
        "</p>"
      : "");
  return (
    '<div class="character-sheet-layout">' +
    panel(
      t("Pronto ad agire", "Ready for action"),
      content,
      button(ctx, "inventory-tab", t("Gestisci equipaggiamento", "Manage equipment")),
    ) +
    panel(t("Caratteristiche", "Abilities"), checks) +
    "</div>"
  );
}
function libraryControl(ctx, targetKind, entry) {
  if (entry && !entry.homebrewRef) return "";
  if (entry && !homebrewAvailability(ctx.state, entry.homebrewRef, {}, ctx.role).readable)
    return (
      '<span class="muted">' + ctx.t("Fonte non disponibile", "Source unavailable") + "</span>"
    );
  return button(
    ctx,
    "library",
    entry
      ? ctx.t("Origine e revisioni", "Source and revisions")
      : ctx.t("Cerca nella Biblioteca", "Browse library"),
    'data-library-kind="' +
      targetKind +
      '"' +
      (entry ? ' data-library-instance="' + ctx.esc(entry.id) + '"' : ""),
  );
}
function renderInventory(ctx, actor) {
  const { t } = ctx;
  const editable = ctx.canControl(actor);
  const weight = actor.inventory.reduce((sum, item) => sum + (item.weight ?? 0) * item.quantity, 0);
  const incomplete = actor.inventory.some((item) => item.weight == null && item.quantity > 0);
  const body =
    '<p class="muted">' +
    actor.inventory.reduce((sum, item) => sum + item.quantity, 0) +
    " " +
    t("oggetti", "items") +
    " · " +
    Number(weight.toFixed(2)) +
    " kg" +
    (incomplete ? " · " + t("peso incompleto", "weight incomplete") : "") +
    '</p><label class="field character-search"><span>' +
    t("Cerca nell’inventario", "Search inventory") +
    '</span><input type="search" data-inventory-filter></label><div class="item-list">' +
    (actor.inventory
      .map(
        (item) =>
          '<article class="item-row character-inventory-row" data-inventory-row data-search="' +
          ctx.esc(ctx.label(item.name).toLocaleLowerCase()) +
          '"><div class="character-item-symbol" aria-hidden="true">' +
          ctx.icon(item.healing ? "dice" : item.kind === "weapon" ? "sword" : "bag") +
          '</div><div class="character-item-copy"><strong>' +
          label(ctx, item.name) +
          '</strong><p class="muted">× ' +
          item.quantity +
          " · " +
          (item.weight == null
            ? t("Peso non registrato", "Weight not recorded")
            : item.weight + " kg / " + t("unità", "unit")) +
          (item.equipped ? " · " + t("Equipaggiato", "Equipped") : "") +
          (item.location === "ground" ? " · " + t("A terra", "On the ground") : "") +
          (item.availableInForm === false
            ? " · " + t("Non disponibile nella forma", "Unavailable in this form")
            : "") +
          '</p></div><div class="toolbar">' +
          button(ctx, "detail-item", t("Dettagli", "Details"), dataItem(ctx, item)) +
          libraryControl(ctx, "inventory", item) +
          (editable && item.location === "ground"
            ? button(
                ctx,
                "pickup-item",
                t("Registra raccolto", "Record picked up"),
                dataItem(ctx, item),
              )
            : editable && item.kind !== "consumable"
              ? button(
                  ctx,
                  "equip-item",
                  item.equipped ? t("Riponi", "Unequip") : t("Equipaggia", "Equip"),
                  dataItem(ctx, item) +
                    offWhy(
                      whyId("equip", actor.id, item.id),
                      item.quantity < 1
                        ? t(
                            "Quantità zero: non c’è niente da equipaggiare. Correggi la quantità.",
                            "Quantity zero: there is nothing to equip. Correct the quantity.",
                          )
                        : "",
                    ),
                ) +
                whyNote(
                  ctx,
                  whyId("equip", actor.id, item.id),
                  item.quantity < 1
                    ? t(
                        "Quantità zero: non c’è niente da equipaggiare. Correggi la quantità.",
                        "Quantity zero: there is nothing to equip. Correct the quantity.",
                      )
                    : "",
                )
              : "") +
          (editable && item.healing
            ? button(
                ctx,
                "use-healing",
                t("Bevi", "Drink"),
                dataItem(ctx, item) +
                  offWhy(
                    whyId("drink", actor.id, item.id),
                    ctx.label(potionBlock(ctx.state, actor, item) ?? ""),
                  ),
                "primary",
              ) +
              whyNote(
                ctx,
                whyId("drink", actor.id, item.id),
                ctx.label(potionBlock(ctx.state, actor, item) ?? ""),
              )
            : "") +
          "</div></article>",
      )
      .join("") ||
      empty(
        t(
          "Lo zaino è vuoto. Aggiungi ciò che possiedi già.",
          "The backpack is empty. Add what you already own.",
        ),
      )) +
    '</div><p class="empty-state" data-inventory-no-results hidden>' +
    t("Nessun oggetto corrisponde alla ricerca.", "No items match your search.") +
    "</p>";
  let result = "";
  if (actor.lastHealing) {
    const r = actor.lastHealing;
    result = panel(
      t("Ultima cura", "Latest healing"),
      "<p><strong>" +
        r.faces[0] +
        " + " +
        r.faces[1] +
        " + 2 = " +
        r.total +
        "</strong> · " +
        t("PF recuperati", "HP recovered") +
        ": " +
        r.applied +
        '</p><p class="muted">' +
        r.before +
        " → " +
        r.after +
        " " +
        t("PF", "HP") +
        (r.overflow
          ? " · " +
            r.overflow +
            " " +
            t("oltre il massimo, non applicati", "over maximum, not applied")
          : "") +
        " · " +
        (r.mode === "physical"
          ? t("Dadi fisici", "Physical dice")
          : t("Dadi digitali", "Digital dice")) +
        "</p>" +
        button(ctx, "undo", t("Annulla ultima operazione", "Undo latest operation")),
    );
  }
  return (
    panel(
      t("Inventario", "Inventory"),
      body,
      editable
        ? button(ctx, "add-item", t("Aggiungi oggetto", "Add item"), "", "primary") +
            libraryControl(ctx, "inventory")
        : "",
    ) + result
  );
}
function grantLabel(ctx, entry) {
  if (entry.grantName) return ctx.label(entry.grantName);
  const [kind, id] = (entry.grantId || "").split(":");
  const catalog = getCharacterCatalog();
  if (kind === "class")
    return (
      ctx.t("Classe: ", "Class: ") +
      ctx.label(
        catalog.classes.find((value) => value.id === id)?.name ||
          ctx.t("concessione registrata", "recorded grant"),
      )
    );
  if (kind === "background" && id === "magic-initiate")
    return ctx.t("Background: Iniziato alla Magia", "Background: Magic Initiate");
  if (["background", "species"].includes(kind))
    return (
      ctx.t(
        kind === "species" ? "Specie: " : "Background: ",
        kind === "species" ? "Species: " : "Background: ",
      ) +
      ctx.label(
        catalog[kind === "species" ? "species" : "backgrounds"].find((value) => value.id === id)
          ?.name || ctx.t("concessione registrata", "recorded grant"),
      )
    );
  return ctx.t("Aggiunta a mano", "Added by hand");
}
function spellGrantDetails(ctx, spell) {
  return (
    grantLabel(ctx, spell) +
    (abilities[spell.spellcastingAbility]
      ? " · " + ctx.t(...abilities[spell.spellcastingAbility])
      : "")
  );
}
function sourceDetails(ctx, source) {
  if (!source) return "";
  if (typeof source === "string") return "<p>" + ctx.esc(source) + "</p>";
  const details = [
    ctx.label(source.title || source.label || source.name || source.kind || ""),
    source.edition,
    source.revision ? ctx.t("revisione ", "revision ") + source.revision : "",
    source.pages?.length ? ctx.t("pagine ", "pages ") + source.pages.join(", ") : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return `<p>${ctx.esc(details)}</p>${typeof source.url === "string" && /^https:\/\//.test(source.url) ? `<a href="${ctx.esc(source.url)}" target="_blank" rel="noopener noreferrer">${ctx.t("Leggi la fonte", "Read the source")}</a>` : ""}`;
}
function renderSlotPools(ctx, actor) {
  const pools = spellSlotPools(actor).map((pool) => ({
    ...pool,
    key: String(pool.level),
    title: ctx.t("Slot di livello ", "Level ") + pool.level + ctx.t("", " slots"),
  }));
  if (actor.pactSlots) {
    const pool = actor.pactSlots;
    pools.push({
      ...pool,
      key: "pact",
      title: ctx.t("Magia del Patto · livello ", "Pact Magic · level ") + pool.level,
      available: Number.isInteger(pool.used) ? Math.max(0, pool.max - pool.used) : null,
      overused: Number.isInteger(pool.used) ? Math.max(0, pool.used - pool.max) : null,
    });
  }
  return pools
    .map(
      (pool) =>
        `<div class="character-slot-summary"><div><strong>${ctx.esc(pool.title)}: ${pool.available ?? ctx.t("Da verificare", "To verify")} / ${pool.max}</strong><p class="muted">${ctx.t("Spesi", "Spent")}: ${pool.used ?? ctx.t("Non registrati", "Not recorded")}${pool.overused ? " · " + ctx.t("Eccedenza conservata", "Retained overuse") + ": " + pool.overused : ""}</p></div>${ctx.canControl(actor) ? button(ctx, "slots", ctx.t("Correggi risorsa", "Correct resource"), 'data-pool="' + pool.key + '"') : ""}</div>`,
    )
    .join("");
}
function renderSpells(ctx, actor) {
  const { t } = ctx;
  const editable = ctx.canControl(actor);
  const concentration = actor.concentration?.active !== false ? actor.concentration : null;
  const concentrationView =
    '<section class="concentration-summary"><h3>' +
    t("Concentrazione", "Concentration") +
    "</h3><p>" +
    (concentration
      ? ctx.esc(ctx.label(concentration.name))
      : t("Nessun effetto in corso.", "No effect in progress.")) +
    "</p>" +
    (editable
      ? (concentration
          ? button(ctx, "end-concentration", t("Termina concentrazione", "End concentration"))
          : "") +
        button(ctx, "record-concentration", t("Registra concentrazione", "Record concentration"))
      : "") +
    "</section>";
  const body =
    concentrationView +
    renderSlotPools(ctx, actor) +
    '<div class="item-list">' +
    ((actor.spells ?? [])
      .map(
        (spell) =>
          '<div class="item-row"><div><strong>' +
          ctx.esc(ctx.label(spell.name)) +
          '</strong><p class="muted">' +
          (spell.level === 0
            ? t("Trucchetto", "Cantrip")
            : t("Livello", "Level") + " " + spell.level) +
          " · " +
          (spell.level === 0
            ? t("Concessa", "Granted")
            : spell.prepared
              ? t("Preparata", "Prepared")
              : t("Non preparata", "Not prepared")) +
          '</p><p class="muted">' +
          ctx.esc(spellGrantDetails(ctx, spell)) +
          "</p></div>" +
          button(
            ctx,
            "detail-spell",
            t("Dettagli", "Details"),
            'data-spell="' + ctx.esc(spell.id) + '"',
          ) +
          libraryControl(ctx, "spells", spell) +
          (editable && spell.level > 0
            ? button(
                ctx,
                "prepare-spell",
                t("Registra preparazione", "Record preparation"),
                'data-spell="' + ctx.esc(spell.id) + '"',
              )
            : "") +
          "</div>",
      )
      .join("") ||
      empty(
        t(
          "Nessuna magia annotata. Aggiungi una magia già concessa da classe, capacità o oggetto.",
          "No recorded spells. Add one already granted by a class, feature or item.",
        ),
      )) +
    "</div>";
  return panel(
    t("Magie", "Spells"),
    body,
    editable
      ? button(ctx, "add-spell", t("Aggiungi magia", "Add spell"), "", "primary") +
          libraryControl(ctx, "spells")
      : "",
  );
}
// PG-41: D&D Beyond's Features & Traits: each feature with its source inline (book ·
// page), filter chips by origin, the official Italian name and a real summary; PG-34:
// limited uses as boxes with «Usa» and «Ripristina», and when they come back.
const FEATURE_KINDS = ["class", "species", "background", "feat", "custom"];
const FEATURE_KIND_NAMES = {
  all: ["Tutte", "All"],
  class: ["Classe", "Class"],
  species: ["Specie", "Species"],
  background: ["Background", "Background"],
  feat: ["Talento", "Feat"],
  custom: ["Personalizzato", "Custom"],
};
const RECOVERY_NAMES = {
  short: ["riposo breve o lungo", "Short or Long Rest"],
  long: ["riposo lungo", "Long Rest"],
  dawn: ["all’alba", "at dawn"],
  none: ["non si recupera da solo", "no automatic recovery"],
};
const featureUi = { filter: "all" };
export function featureKind(feature) {
  const grant = String(feature.grantId ?? "").split(":")[0];
  if (["class", "species", "background", "feat"].includes(grant)) return grant;
  const def = String(feature.definitionId ?? "");
  if (/^(feat|origin-feat):/.test(def)) return "feat";
  if (
    /^(barbarian|bard|cleric|druid|fighter|monk|paladin|ranger|rogue|sorcerer|warlock|wizard):/.test(
      def,
    )
  )
    return "class";
  if (def && getCharacterCatalog().species.some((row) => def.startsWith(row.id + ":")))
    return "species";
  return feature.source?.kind === "srd" ? "class" : "custom";
}
/** The name, summary and «EN» mark a feature shows in the reader's language. */
export function featureText(ctx, feature) {
  const def = String(feature.definitionId ?? "").replace(/^species:/, "");
  const known = FEATURE_TEXTS[def] ?? null;
  const own = feature.name ?? "";
  const en = typeof own === "object" ? own.en || own.it : own;
  const untranslated = typeof own === "object" && own.it === own.en;
  let name = ctx.label(own);
  let marked = false;
  if (ctx.lang === "it" && (untranslated || !name)) {
    if (known?.itVerified) name = known.name.it;
    else if (FEATURE_NAMES_IT[en]) name = FEATURE_NAMES_IT[en];
    else marked = Boolean(en);
  }
  // Placeholder texts of the catalogue and of the synthetic samples give way to the summary.
  const generic =
    /Capacità registrata con la sua fonte|Recorded feature with its source|Contatore sintetico|Synthetic counter/;
  const description = ctx.label(feature.description ?? "");
  const summary =
    description && !generic.test(description) ? description : known ? ctx.label(known.summary) : "";
  return { name, marked, summary };
}
const SHEET_RECOVERY_SOURCE = Object.freeze({
  kind: "authored",
  revision: "sheet-feature-recovery-1",
  title: { it: "Recupero scelto sulla scheda", en: "Recovery chosen on the sheet" },
});
/**
 * PG-34: when a custom feature's uses come back (D&D Beyond «Limited Use» reset): the rest
 * engine's own recovery rules on the actor's rest profile (a Short Rest feature also
 * recovers on a Long Rest, SRD 2024). «dawn» and «none» keep only the label here.
 */
export function setFeatureRecovery(actor, featureId, recovery) {
  const feature = (actor.features ?? []).find((f) => f.id === featureId);
  if (!feature) throw new Error("Feature not found");
  const value = Object.hasOwn(RECOVERY_NAMES, recovery) ? recovery : "none";
  feature.recovery = value;
  const wanted =
    Number.isInteger(feature.max) && feature.max > 0
      ? value === "short"
        ? ["short", "long"]
        : value === "long"
          ? ["long"]
          : []
      : [];
  if (!actor.restProfile && wanted.length)
    updateCharacterRestProfile(actor, actor.characterBuild?.data ?? actor.buildSeed ?? {});
  if (!actor.restProfile) return feature;
  const kept = (actor.restProfile.recoveries ?? []).filter(
    (row) => !(row.managedBy === "sheet-feature" && row.target?.id === featureId),
  );
  // A catalogue rule already recovering this feature stays the only one (no duplicates).
  const ruled = kept.some((row) => row.target?.kind === "feature" && row.target.id === featureId);
  actor.restProfile.recoveries = ruled
    ? kept
    : [
        ...kept,
        ...wanted.map((trigger) => ({
          id: `sheet-feature:${featureId}:${trigger}`,
          target: { kind: "feature", id: featureId },
          trigger,
          operation: "all",
          source: { ...SHEET_RECOVERY_SOURCE },
          managedBy: "sheet-feature",
        })),
      ];
  return feature;
}
function sourceInline(ctx, source) {
  if (!source || typeof source !== "object") return typeof source === "string" ? source : "";
  const en = source.en?.pages ?? (source.kind === "srd" ? source.pages : null);
  const it = source.it?.pages;
  const book =
    source.kind === "srd"
      ? `SRD ${source.revision ?? "5.2.1"}`
      : ctx.label(source.title ?? source.label ?? "");
  const pages = en?.length
    ? it?.length
      ? `EN ${en.join("–")} / IT ${it.join("–")}`
      : `p. ${en.join("–")}`
    : "";
  return [book, pages].filter(Boolean).join(" · ");
}
function renderFeatures(ctx, actor) {
  const { t } = ctx;
  const editable = ctx.canControl(actor);
  const all = actor.features ?? [];
  const counts = Object.fromEntries(
    FEATURE_KINDS.map((kind) => [kind, all.filter((f) => featureKind(f) === kind).length]),
  );
  const filter = featureUi.filter === "all" || counts[featureUi.filter] ? featureUi.filter : "all";
  const shown = filter === "all" ? all : all.filter((f) => featureKind(f) === filter);
  const chips =
    '<div class="shp-chips character-feature-chips" role="group" aria-label="' +
    t("Filtra le capacità per origine", "Filter features by origin") +
    '">' +
    ["all", ...FEATURE_KINDS]
      .filter((kind) => kind === "all" || counts[kind])
      .map(
        (kind) =>
          `<button type="button" class="shp-chip" data-character-action="feature-filter" data-filter="${kind}" aria-pressed="${kind === filter}">${t(...FEATURE_KIND_NAMES[kind])} <small>${kind === "all" ? all.length : counts[kind]}</small></button>`,
      )
      .join("") +
    "</div>";
  const row = (feature) => {
    const text = featureText(ctx, feature);
    const limited = Number.isInteger(feature.max) && feature.max > 0;
    const used = Number.isInteger(feature.used) ? feature.used : 0;
    const source = sourceInline(ctx, feature.source);
    const recovery = RECOVERY_NAMES[feature.recovery] ?? null;
    return (
      '<article class="item-row character-feature" data-feature-row="' +
      ctx.esc(feature.id) +
      '"><div class="character-feature-copy"><strong>' +
      ctx.esc(text.name) +
      "</strong>" +
      (text.marked
        ? ' <small class="badge">' + t("nome inglese", "English name") + "</small>"
        : "") +
      ' <span class="badge">' +
      t(...FEATURE_KIND_NAMES[featureKind(feature)]) +
      "</span>" +
      (source ? '<p class="character-feature-source">' + ctx.esc(source) + "</p>" : "") +
      (text.summary
        ? '<p class="character-multiline">' + glossaryText(ctx, text.summary) + "</p>"
        : "") +
      (limited
        ? '<div class="character-feature-uses">' +
          usePips(ctx, feature.id, { used, max: feature.max }, editable, text.name) +
          '<span class="muted">' +
          t(
            `${Math.max(0, feature.max - used)} di ${feature.max} disponibili`,
            `${Math.max(0, feature.max - used)} of ${feature.max} available`,
          ) +
          (recovery ? " · " + t("si recupera: ", "recovers: ") + t(...recovery) : "") +
          (used > feature.max ? " · " + t("Eccedenza conservata", "Retained overuse") : "") +
          "</span>" +
          (editable
            ? button(
                ctx,
                "feature-use",
                t("Usa", "Use"),
                'data-feature="' +
                  ctx.esc(feature.id) +
                  '"' +
                  offWhy(whyId("feature", actor.id, feature.id), used >= feature.max),
              ) +
              whyNote(
                ctx,
                whyId("feature", actor.id, feature.id),
                used >= feature.max
                  ? recovery
                    ? t(
                        `Nessun uso rimasto. Recupero: ${recovery[0]}; per una correzione usa «Ripristina».`,
                        `No uses left. Recovery: ${recovery[1]}; for a correction use “Reset”.`,
                      )
                    : t(
                        "Nessun uso rimasto: si recupera con il riposo indicato, o «Ripristina».",
                        "No uses left: they come back with the stated rest, or “Reset”.",
                      )
                  : "",
              ) +
              (used > 0
                ? button(
                    ctx,
                    "feature-restore",
                    t("Ripristina", "Reset"),
                    'data-feature="' + ctx.esc(feature.id) + '"',
                  )
                : "")
            : "") +
          "</div>"
        : "") +
      '</div><div class="toolbar">' +
      libraryControl(ctx, "features", feature) +
      (editable
        ? button(
            ctx,
            "edit-feature",
            t("Modifica", "Edit"),
            'data-feature="' + ctx.esc(feature.id) + '"',
          )
        : "") +
      "</div></article>"
    );
  };
  const body =
    (all.length ? chips : "") +
    '<div class="item-list">' +
    (shown.map(row).join("") ||
      empty(
        t(
          "Annota una capacità e, se serve, il contatore. La descrizione non applica effetti automaticamente.",
          "Record a feature and, when needed, its counter. Descriptions do not automatically apply effects.",
        ),
      )) +
    "</div>";
  return panel(
    t("Capacità e tratti", "Features and traits"),
    body,
    editable
      ? button(ctx, "add-feature", t("Aggiungi capacità", "Add feature"), "", "primary") +
          libraryControl(ctx, "features")
      : "",
  );
}
// PG-42: D&D Beyond's Background tab: traits, ideals, bonds and flaws as separate lists
// with «+ Aggiungi» and «Casuale» (the background's suggestions), the biography apart.
export const PERSONALITY_KEYS = ["traits", "ideals", "bonds", "flaws"];
// PG-43: the sheet's «Note» section (sheet-plus notes with DDB's section chips).
export const NOTES_TAB = "sheet-plus-notes";
const PERSONALITY_NAMES = {
  traits: ["Tratti della personalità", "Personality traits"],
  ideals: ["Ideali", "Ideals"],
  bonds: ["Legami", "Bonds"],
  flaws: ["Difetti", "Flaws"],
};
export function addPersonality(actor, key, value) {
  if (!PERSONALITY_KEYS.includes(key)) throw new Error("Unknown personality list");
  const text = String(value ?? "")
    .trim()
    .slice(0, 300);
  if (!text) throw new Error("Empty personality entry");
  actor.personality ??= { traits: [], ideals: [], bonds: [], flaws: [] };
  actor.personality[key] ??= [];
  if (actor.personality[key].includes(text)) throw new Error("Duplicate personality entry");
  if (actor.personality[key].length >= 12) throw new Error("Too many personality entries");
  actor.personality[key].push(text);
  return text;
}
export function removePersonality(actor, key, index) {
  const list = actor.personality?.[key];
  if (!Array.isArray(list) || !Number.isInteger(index) || !list[index])
    throw new Error("Unknown personality entry");
  list.splice(index, 1);
}
const backgroundOf = (actor) =>
  actor.characterBuild?.data?.origin?.backgroundId ??
  actor.buildSeed?.origin?.backgroundId ??
  actor.backgroundId ??
  null;
/** «Casuale»: a suggestion of the character's background not already listed, or null. */
export function randomPersonalityFor(actor, key, lang, random = Math.random) {
  const current = actor.personality?.[key] ?? [];
  if (typeof BP.randomPersonality === "function")
    return BP.randomPersonality(backgroundOf(actor), key, current, lang, random);
  const pool = [
    ...(BP.PERSONALITY_SUGGESTIONS?.[backgroundOf(actor)]?.[key] ?? []),
    ...(BP.PERSONALITY_SUGGESTIONS?.any?.[key] ?? []),
  ]
    .map((entry) => entry?.[lang] ?? entry?.it ?? entry)
    .filter((entry) => typeof entry === "string" && !current.includes(entry));
  return pool.length ? pool[Math.floor(random() * pool.length)] : null;
}
function renderStory(ctx, actor) {
  const { t } = ctx;
  const editable = ctx.canControl(actor);
  const suggestions = Boolean(BP.PERSONALITY_SUGGESTIONS);
  const lists = PERSONALITY_KEYS.map((key) => {
    const list = actor.personality?.[key] ?? [];
    return (
      '<section class="character-personality" data-personality="' +
      key +
      '"><h3>' +
      t(...PERSONALITY_NAMES[key]) +
      "</h3>" +
      (list.length
        ? '<ul class="character-personality-list">' +
          list
            .map(
              (entry, index) =>
                "<li><span>" +
                ctx.esc(entry) +
                "</span>" +
                (editable
                  ? '<button type="button" class="button quiet character-personality-remove" data-character-action="personality-remove" data-key="' +
                    key +
                    '" data-index="' +
                    index +
                    '" aria-label="' +
                    ctx.esc(t(`Togli: ${entry}`, `Remove: ${entry}`)) +
                    '">' +
                    icon("close") +
                    "</button>"
                  : "") +
                "</li>",
            )
            .join("") +
          "</ul>"
        : '<p class="muted">' + t("Ancora niente.", "Nothing yet.") + "</p>") +
      (editable
        ? '<div class="toolbar">' +
          button(
            ctx,
            "personality-add",
            icon("plus") + " " + t("Aggiungi", "Add"),
            'data-key="' + key + '"',
          ) +
          (suggestions
            ? button(
                ctx,
                "personality-random",
                icon("dice") + " " + t("Casuale", "Random"),
                'data-key="' + key + '"',
              )
            : "") +
          "</div>"
        : "") +
      "</section>"
    );
  }).join("");
  const texts = [
    [t("Aspetto e descrizione", "Appearance and description"), actor.description],
    [t("Biografia", "Biography"), actor.backstory],
    [t("Annotazioni condivise", "Shared annotations"), actor.notes],
  ].filter(([, value]) => value);
  return (
    panel(
      t("Personalità", "Personality"),
      '<p class="muted">' +
        t(
          "Visibile a chi consulta la scheda. Alleati, nemici e organizzazioni stanno in Note.",
          "Visible to people viewing the sheet. Allies, enemies and organizations are in Notes.",
        ) +
        '</p><div class="character-personality-grid">' +
        lists +
        "</div>",
      button(
        ctx,
        "notes-tab",
        icon("note") + " " + t("Note: alleati, nemici…", "Notes: allies, enemies…"),
      ),
    ) +
    panel(
      t("Storia del personaggio", "Character story"),
      '<div class="character-story">' +
        texts
          .map(
            ([title, value]) =>
              "<h3>" + title + '</h3><p class="character-multiline">' + ctx.esc(value) + "</p>",
          )
          .join("") +
        (texts.length
          ? ""
          : ctx.esc(t("Una pagina ancora da scrivere.", "A page yet to be written."))) +
        "</div>" +
        button(ctx, "notes", t("Apri Appunti personali", "Open personal Notes")),
      editable ? button(ctx, "edit-story", t("Modifica storia", "Edit story")) : "",
    )
  );
}
function personalPlan(ctx, actor) {
  return (
    actor.personalPlans?.[ctx.role] ?? (ctx.role === actor.owner ? (actor.futurePlan ?? "") : "")
  );
}
function renderExtras(ctx, actor) {
  const { t } = ctx;
  return (
    renderFormsSummary(ctx, actor.id) +
    '<div class="character-sheet-layout">' +
    panel(
      t("Scelte future", "Future choices"),
      '<p class="muted">' +
        t(
          "Solo io · un promemoria senza benefici anticipati o cambi di livello.",
          "Only me · a reminder with no early benefits or level changes.",
        ) +
        '</p><p class="character-multiline">' +
        ctx.esc(
          personalPlan(ctx, actor) || t("Nessuna tappa annotata.", "No future steps recorded."),
        ) +
        "</p>",
      ctx.canControl(actor) ? button(ctx, "future-plan", t("Modifica piano", "Edit plan")) : "",
    ) +
    panel(
      t("Altre schede", "Other sheets"),
      '<div class="item-list">' +
        visibleActors(ctx)
          .filter((entry) => entry.id !== actor.id)
          .map(
            (entry) =>
              '<div class="item-row"><span>' +
              ctx.esc(entry.name) +
              "</span>" +
              button(ctx, "open", t("Apri", "Open"), 'data-actor="' + ctx.esc(entry.id) + '"') +
              "</div>",
          )
          .join("") +
        "</div>" +
        button(ctx, "campaign", t("Vai alla campagna", "Open campaign")),
    ) +
    "</div>"
  );
}

function editCharacter(ctx, actor = null) {
  const { t } = ctx;
  const current = actor ?? {
    name: t("Nuovo personaggio", "New character"),
    className: "",
    level: 1,
    maxHp: 10,
    ac: 10,
    speed: 9,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  };
  const hpLinked = Boolean(actor && ctx.registry?.get?.("command", "damage-tray.hp", ctx));
  const body =
    '<p class="muted">' +
    t(
      "Registro manuale di una scheda già definita. Classe e livello non aggiungono automaticamente capacità o dotazioni.",
      "Manually record an already defined sheet. Class and level do not automatically grant features or equipment.",
    ) +
    '</p><div class="form-grid">' +
    field(ctx, t("Nome", "Name"), "name", current.name, 'required maxlength="80"') +
    field(
      ctx,
      t("Classe / origine", "Class / origin"),
      "className",
      ctx.label(current.className),
      'maxlength="100"',
    ) +
    field(
      ctx,
      t("Livello", "Level"),
      "level",
      current.level,
      'type="number" min="1" max="20" required',
    ) +
    // P3 PG-21 (shared edit): an existing sheet corrects its HP in the one HP widget
    // (current, maximum, temporary, with the reason and Undo), linked here.
    (hpLinked
      ? '<div class="field character-derived-field"><span>' +
        t("Punti ferita", "Hit points") +
        "</span><strong>" +
        (actor.hp ?? "—") +
        " / " +
        (actor.maxHp ?? "—") +
        '</strong><button type="button" class="button quiet" data-character-action="hp-reasoned">' +
        t("Correggi i PF…", "Correct HP…") +
        "</button></div>"
      : field(
          ctx,
          t("PF massimi", "Maximum HP"),
          "maxHp",
          current.maxHp,
          'type="number" min="1" max="9999" required',
        )) +
    // PG-25: AC is derived (Roll20's per-section modal, DDB's AC components): it is not a
    // field here. An existing sheet links to the reasoned change; a new one starts at 10.
    (actor
      ? '<div class="field character-derived-field"><span>' +
        t("Classe armatura", "Armor class") +
        "</span><strong>" +
        (acTotal(ctx, actor) ?? "—") +
        '</strong><button type="button" class="button quiet" data-character-action="ac-reasoned">' +
        t("Cambia con un motivo…", "Change with a reason…") +
        "</button></div>"
      : field(
          ctx,
          t("Classe armatura", "Armor class"),
          "ac",
          current.ac,
          'type="number" min="0" max="99" required',
        )) +
    field(
      ctx,
      t("Velocità (metri)", "Speed (meters)"),
      "speed",
      current.speed,
      'type="number" min="0" max="999" step="0.5" required',
    ) +
    Object.entries(abilities)
      .map(([key, names]) =>
        field(
          ctx,
          t(...names),
          key,
          current.abilities[key],
          'type="number" min="1" max="30" required',
        ),
      )
      .join("") +
    "</div>" +
    (actor
      ? '<p class="muted">' +
        t(
          "Cambiare i PF massimi conserva i danni subiti. Slot, oggetti e azioni spesi restano registrati.",
          "Changing maximum HP preserves damage taken. Spent slots, items and actions stay recorded.",
        ) +
        "</p>"
      : "");
  ctx.dialog(
    actor
      ? t("Modifica scheda", "Edit sheet")
      : t("Crea una scheda manuale", "Create a manual sheet"),
    body,
    {
      submitLabel: t("Salva scheda", "Save sheet"),
      onSubmit: safely(ctx, (data) => {
        const patch = {
          name: data.get("name"),
          className: data.get("className"),
          level: number(data, "level"),
          maxHp: hpLinked ? actor.maxHp : number(data, "maxHp"),
          ...(actor ? {} : { ac: number(data, "ac") }),
          speed: number(data, "speed"),
          abilities: Object.fromEntries(
            Object.keys(abilities).map((key) => [key, number(data, key)]),
          ),
        };
        if (actor)
          commit(ctx, actor.id, t("Scheda modificata", "Sheet edited"), (draft) =>
            patchCharacter(draft, patch),
          );
        else {
          const id = uid();
          const next = {
            id,
            kind: "character",
            owner: ctx.role === "dm" ? "dm" : "player",
            hp: patch.maxHp,
            maxHp: patch.maxHp,
            action: true,
            bonus: true,
            reaction: true,
            movement: 0,
            slots: { used: 0, max: 0 },
            inventory: [],
            notes: "",
          };
          patchCharacter(next, patch);
          ctx.commit(t("Personaggio creato", "Character created"), (draft) => {
            draft.actors[id] = next;
          });
          ctx.navigate("characters", { id, tab: "actions" });
        }
      }),
    },
  );
  globalThis.document
    ?.querySelector('#dialog [data-character-action="ac-reasoned"]')
    ?.addEventListener("click", () => {
      ctx.closeDialog();
      openSheetStat(ctx, actor.id, "ac", { edit: true });
    });
  globalThis.document
    ?.querySelector('#dialog [data-character-action="hp-reasoned"]')
    ?.addEventListener("click", () => {
      ctx.closeDialog();
      ctx.registry.run(ctx.registry.get("command", "damage-tray.hp", ctx), ctx, {
        actorId: actor.id,
        mode: "correct",
        surface: "sheet",
      });
    });
}
function editItem(ctx, actor, item = null) {
  const { t } = ctx;
  const kinds = [
    ["gear", t("Equipaggiamento", "Gear")],
    ["weapon", t("Arma", "Weapon")],
    ["consumable", t("Consumabile", "Consumable")],
  ];
  const body =
    '<p class="muted">' +
    t(
      "Registra un oggetto già posseduto: nessun acquisto o pagamento automatico.",
      "Record an item already owned: no automatic purchase or payment.",
    ) +
    '</p><div class="form-grid">' +
    field(
      ctx,
      t("Nome", "Name"),
      "name",
      item ? ctx.label(item.name) : "",
      'required maxlength="100"',
    ) +
    '<label class="field"><span>' +
    t("Tipo", "Type") +
    '</span><select name="kind">' +
    kinds
      .map(
        ([value, text]) =>
          '<option value="' +
          value +
          '" ' +
          (item?.kind === value ? "selected" : "") +
          ">" +
          text +
          "</option>",
      )
      .join("") +
    "</select></label>" +
    field(
      ctx,
      t("Quantità", "Quantity"),
      "quantity",
      item?.quantity ?? 1,
      'type="number" min="0" max="99999" required',
    ) +
    field(
      ctx,
      t("Peso per unità (kg)", "Weight per unit (kg)"),
      "weight",
      item?.weight ?? 0,
      'type="number" min="0" max="99999" step="0.01" required',
    ) +
    "</div>" +
    textarea(
      ctx,
      t("Descrizione conosciuta", "Known description"),
      "description",
      item ? ctx.label(item.description) : "",
    ) +
    '<label class="character-checkbox"><input type="checkbox" name="healing" ' +
    (item?.healing ? "checked" : "") +
    ">" +
    t("Pozione di guarigione standard · 2d4 + 2", "Standard Potion of Healing · 2d4 + 2") +
    "</label>";
  ctx.dialog(
    item ? t("Correggi oggetto", "Correct item") : t("Aggiungi oggetto", "Add item"),
    body,
    {
      submitLabel: t("Salva oggetto", "Save item"),
      onSubmit: safely(ctx, (data) => {
        const healing = data.get("healing") === "on";
        commit(
          ctx,
          actor.id,
          item ? t("Oggetto corretto", "Item corrected") : t("Oggetto aggiunto", "Item added"),
          (draft) =>
            saveInventoryItem(draft, {
              id: item?.id ?? uid(),
              name: String(data.get("name")),
              quantity: number(data, "quantity"),
              weight: number(data, "weight"),
              kind: healing ? "consumable" : data.get("kind"),
              description: String(data.get("description")),
              equipped: item?.equipped ?? false,
              healing: healing ? 2 : undefined,
            }),
        );
      }),
    },
  );
}
// Registry hook (B17 chat): "Share to chat" inside the spell and item details, like
// Shard's details dialogs (VTL-158), only when an area offers the `chat.share-entry`
// command for this sheet and entry. Without it the dialogs are unchanged.
function shareToChat(ctx, actor, entryId) {
  const entry = { actorId: actor.id, entryId };
  const command = ctx.registry?.get("command", "chat.share-entry", ctx, entry);
  if (!command) return { html: "", bind() {} };
  return {
    html:
      '<p><button type="button" class="button" data-share-to-chat>' +
      ctx.esc(ctx.registry.label(command, ctx.lang)) +
      "</button></p>",
    bind() {
      globalThis.document
        ?.querySelector("#dialog [data-share-to-chat]")
        ?.addEventListener("click", () => ctx.registry.run(command, ctx, entry));
    },
  };
}
function detailItem(ctx, actor, item) {
  const { t } = ctx;
  const share = shareToChat(ctx, actor, "item:" + item.id);
  const body =
    '<p class="character-multiline">' +
    (label(ctx, item.description) ||
      t("Nessuna descrizione registrata.", "No recorded description.")) +
    '</p><dl class="character-details"><dt>' +
    t("Quantità", "Quantity") +
    "</dt><dd>" +
    item.quantity +
    "</dd><dt>" +
    t("Equipaggiamento", "Equipment") +
    "</dt><dd>" +
    (item.equipped ? t("Equipaggiato", "Equipped") : t("Riposto", "Stored")) +
    "</dd>" +
    (item.healing
      ? "<dt>" +
        t("Uso", "Use") +
        "</dt><dd>" +
        t("Su te stesso · azione bonus · 2d4 + 2 PF", "On yourself · bonus action · 2d4 + 2 HP") +
        "</dd>"
      : "") +
    "</dl>" +
    share.html;
  ctx.dialog(
    ctx.label(item.name),
    body,
    ctx.canControl(actor)
      ? {
          submitLabel: t("Modifica dati", "Edit details"),
          onSubmit: () => {
            queueMicrotask(() => editItem(ctx, permissionActor(ctx, actor.id), item));
          },
        }
      : {},
  );
  share.bind();
}
function pendingHealing(ctx, actorId) {
  const actor = permissionActor(ctx, actorId);
  if (!actor.pendingHealing) return;
  const { t } = ctx;
  ctx.dialog(
    t("Registra il tiro della pozione", "Record the potion roll"),
    "<p>" +
      t(
        "La pozione è già stata usata. Inserisci le facce naturali: il +2 è aggiunto dall’app.",
        "The potion has already been used. Enter natural faces: the app adds +2.",
      ) +
      '</p><div class="form-grid">' +
      field(
        ctx,
        t("Primo d4", "First d4"),
        "die1",
        "",
        'type="number" min="1" max="4" required autofocus',
      ) +
      field(
        ctx,
        t("Secondo d4", "Second d4"),
        "die2",
        "",
        'type="number" min="1" max="4" required',
      ) +
      '</div><p class="muted">' +
      t(
        "Chiudere lascia il tiro in attesa sulla scheda. Non restituisce la pozione.",
        "Closing leaves the roll pending on the sheet. It does not return the potion.",
      ) +
      "</p>",
    {
      submitLabel: t("Registra e applica cura", "Record and apply healing"),
      cancelLabel: t("Completa più tardi", "Complete later"),
      onSubmit: safely(ctx, (data) =>
        commit(
          ctx,
          actorId,
          t("Cura fisica registrata · 2d4 + 2", "Physical healing recorded · 2d4 + 2"),
          (draft, state) =>
            resolveHealing(draft, [number(data, "die1"), number(data, "die2")], state),
        ),
      ),
    },
  );
}
function useHealing(ctx, actor, item) {
  const { t } = ctx;
  const combat = ctx.state.combat;
  // C7 (BG3 Custom Mode, Solasta presets): the campaign's rule sets the cost.
  const cost = potionCost(ctx.state);
  const house = cost === "action";
  const unavailable = hasCondition(actor, "incapacitated")
    ? t(
        "Incapacitato: non può bere da solo. Un’altra creatura deve somministrargli la pozione.",
        "Incapacitated: it cannot drink by itself. Another creature must administer the potion.",
      )
    : combat.active && combat.order[combat.turn] !== actor.id
      ? t(
          "Puoi valutare l’uso, ma eseguirlo solo nel tuo turno.",
          "You can preview use, but execute it only on your turn.",
        )
      : combat.active && !actor[cost]
        ? house
          ? t(
              "L’azione è già stata spesa: per la regola della campagna bere una pozione è un’Azione. Puoi valutare l’uso per il prossimo turno.",
              "The action is spent: under the campaign’s rule drinking a potion is an Action. You can preview use for your next turn.",
            )
          : t(
              "L’azione bonus è già stata spesa. Puoi valutare l’uso per il prossimo turno.",
              "The bonus action is spent. You can preview use for your next turn.",
            )
        : "";
  const body =
    "<p>" +
    t("Bersaglio", "Target") +
    ": <strong>" +
    ctx.esc(actor.name) +
    "</strong></p><p>" +
    t("Cura", "Healing") +
    ": <strong>2d4 + 2</strong> · " +
    t("Costo", "Cost") +
    ": <strong>1 " +
    t("pozione", "potion") +
    (ctx.state.combat.active
      ? " + " + (house ? t("azione", "action") : t("azione bonus", "bonus action"))
      : "") +
    "</strong></p>" +
    (house
      ? '<p class="muted">' +
        t(
          "Regola della casa, dalla regola della campagna «Bere una pozione»: un’Azione invece dell’Azione Bonus del SRD.",
          "House rule, from the campaign’s rule “Drinking a potion”: an Action instead of the SRD Bonus Action.",
        ) +
        "</p>"
      : "") +
    '<p class="muted">' +
    t(
      "Stai valutando l’uso. Finché non scegli Bevi, non cambia nulla.",
      "You are previewing use. Nothing changes until you choose Drink.",
    ) +
    // Final review F17: the dice choice in the same form as the sheet's roll window.
    '</p><fieldset class="field potion-dice"><legend>' +
    t("Dadi", "Dice") +
    '</legend><label class="check"><input type="radio" name="mode" value="digital" checked> ' +
    t("Digitali", "Digital") +
    '</label><label class="check"><input type="radio" name="mode" value="physical"> ' +
    t("Fisici: registro le facce dopo l’uso", "Physical: I record the faces after use") +
    "</label></fieldset>";
  ctx.dialog(
    t("Bevi", "Drink") + " · " + ctx.label(item.name),
    body + (unavailable ? '<p class="error">' + unavailable + "</p>" : ""),
    {
      submitLabel: unavailable ? undefined : t("Bevi · esegui", "Drink · execute"),
      onSubmit: safely(ctx, (data) => {
        const mode = String(data.get("mode"));
        const before = ctx.state.actors[actor.id]?.hp;
        commit(ctx, actor.id, t("Pozione usata", "Potion used"), (draft, state) => {
          beginHealing(draft, item.id, {
            inCombat: state.combat.active,
            canAct: state.combat.order[state.combat.turn] === actor.id,
            mode,
            cost: potionCost(state),
          });
          if (mode === "digital") resolveHealing(draft, [die(4), die(4)], state);
        });
        if (mode === "physical") queueMicrotask(() => pendingHealing(ctx, actor.id));
        else {
          // F23 (D&D Beyond's notice): one result with its value.
          const after = ctx.state.actors[actor.id]?.hp;
          ctx.toast(
            t(
              `${ctx.label(item.name)}: +${Math.max(0, after - before)} PF · PF ${before} → ${after}`,
              `${ctx.label(item.name)}: +${Math.max(0, after - before)} HP · HP ${before} → ${after}`,
            ),
          );
        }
      }),
    },
  );
}
/** C7: «Bevi» on a potion row of the sheet, the inventory or the Table (one command). */
export function usePotion(ctx, actorId, itemId) {
  const actor = ctx.state.actors[actorId];
  const item = actor?.inventory?.find((row) => row.id === itemId);
  if (!actor || !item?.healing || !ctx.canControl(actor)) return;
  useHealing(ctx, actor, item);
}
function abilityCheck(ctx, actor, key) {
  actor = getEffectiveActor(actor);
  if (!Number.isFinite(actor.abilities[key]))
    throw new Error(
      ctx.t(
        "Completa il punteggio della caratteristica prima della prova.",
        "Record the ability score before making a check.",
      ),
    );
  const { t } = ctx;
  const bonus = modifier(actor.abilities[key]);
  ctx.dialog(
    t("Prova di", "Check:") + " " + t(...abilities[key]),
    "<p><strong>d20 " +
      signed(bonus) +
      '</strong></p><p class="muted">' +
      t(
        "Solo modificatore della caratteristica. Nessuna competenza, CD o successo sono dedotti.",
        "Ability modifier only. No proficiency, DC or success is assumed.",
      ) +
      '</p><label class="field"><span>' +
      t("Dadi", "Dice") +
      '</span><select name="mode"><option value="digital">' +
      t("Digitale", "Digital") +
      '</option><option value="physical">' +
      t("Fisico", "Physical") +
      "</option></select></label>" +
      field(
        ctx,
        t("Faccia del d20 fisico (solo modalità fisica)", "Physical d20 face (physical mode only)"),
        "face",
        "",
        'type="number" min="1" max="20"',
      ),
    {
      submitLabel: t("Tira / registra", "Roll / record"),
      onSubmit: safely(ctx, (data) => {
        const mode = data.get("mode");
        const face = mode === "physical" ? number(data, "face") : die(20);
        if (!Number.isInteger(face) || face < 1 || face > 20)
          throw new Error(
            t("Inserisci una faccia del d20 fra 1 e 20.", "Enter a d20 face from 1 to 20."),
          );
        const name = { it: abilities[key][0], en: abilities[key][1] };
        commit(
          ctx,
          actor.id,
          t("Prova", "Check") +
            ": " +
            t(...abilities[key]) +
            " · " +
            face +
            " " +
            signed(bonus) +
            " = " +
            (face + bonus),
          (draft) => {
            draft.lastCheck = { name, face, modifier: bonus, total: face + bonus, mode };
          },
        );
      }),
    },
  );
}
function recordConcentration(ctx, actor) {
  const { t } = ctx;
  const active = actor.concentration?.active !== false ? actor.concentration : null;
  ctx.dialog(
    t("Registra concentrazione", "Record concentration"),
    "<p>" +
      t(
        "Registra un effetto già in corso, con i costi del lancio già gestiti. Questa registrazione non lancia una nuova magia.",
        "Record an effect already in progress, with its casting costs already handled. This record does not cast a new spell.",
      ) +
      "</p>" +
      (active
        ? '<p class="error">' +
          t(
            "Il nuovo effetto sostituirà la concentrazione su ",
            "The new effect will replace concentration on ",
          ) +
          ctx.esc(ctx.label(active.name)) +
          ".</p>"
        : "") +
      field(
        ctx,
        t("Effetto in corso", "Current effect"),
        "effectName",
        "",
        'required maxlength="100"',
      ) +
      field(
        ctx,
        t("Fonte o motivo della correzione", "Source or correction reason"),
        "effectSource",
        "",
        'required maxlength="200"',
      ),
    {
      submitLabel: active
        ? t("Sostituisci concentrazione", "Replace concentration")
        : t("Registra", "Record"),
      onSubmit: safely(ctx, (data) => {
        const name = String(data.get("effectName")).trim(),
          source = String(data.get("effectSource")).trim();
        if (!name || !source) throw Error(t("Indica effetto e fonte.", "Enter effect and source."));
        commit(ctx, actor.id, t("Concentrazione registrata", "Concentration recorded"), (draft) => {
          draft.concentration = {
            id: uid(),
            name,
            active: true,
            source: { kind: "manual", label: source, revision: uid() },
          };
        });
      }),
    },
  );
}
function editSpell(ctx, actor) {
  const { t } = ctx;
  ctx.dialog(
    t("Aggiungi magia concessa", "Add a granted spell"),
    '<p class="muted">' +
      t(
        "Registra una magia già disponibile. L’annotazione non la concede né interpreta il testo come regola.",
        "Record a spell already available. The entry does not grant it or interpret text as a rule.",
      ) +
      '</p><div class="form-grid">' +
      field(ctx, t("Nome", "Name"), "name", "", 'required maxlength="100"') +
      field(
        ctx,
        t("Livello (0 = trucchetto)", "Level (0 = cantrip)"),
        "level",
        0,
        'type="number" min="0" max="9" required',
      ) +
      field(
        ctx,
        t("Concessa da / fonte", "Granted by / source"),
        "source",
        "",
        'required maxlength="200"',
      ) +
      "</div>" +
      textarea(ctx, t("Descrizione", "Description"), "description"),
    {
      submitLabel: t("Aggiungi", "Add"),
      onSubmit: safely(ctx, (data) => {
        const name = String(data.get("name")).trim();
        const level = number(data, "level");
        if (!name || !Number.isInteger(level) || level < 0 || level > 9)
          throw new Error(t("Controlla nome e livello.", "Check the name and level."));
        commit(ctx, actor.id, t("Magia annotata", "Spell recorded"), (draft) => {
          draft.spells ??= [];
          draft.spells.push({
            id: uid(),
            name,
            level,
            source: String(data.get("source")),
            description: String(data.get("description")),
            prepared: false,
          });
        });
      }),
    },
  );
}
function editFeature(ctx, actor, feature = null) {
  const { t } = ctx;
  ctx.dialog(
    feature ? t("Gestisci capacità", "Manage feature") : t("Aggiungi capacità", "Add feature"),
    (feature
      ? "<p>" + ctx.esc(grantLabel(ctx, feature)) + "</p>" + sourceDetails(ctx, feature.source)
      : "") +
      field(
        ctx,
        t("Nome", "Name"),
        "name",
        ctx.label(feature?.name ?? ""),
        'required maxlength="100"',
      ) +
      textarea(
        ctx,
        t("Descrizione / origine", "Description / origin"),
        "description",
        ctx.label(feature?.description ?? ""),
      ) +
      '<div class="form-grid">' +
      field(
        ctx,
        t("Usi massimi (0 = senza contatore)", "Maximum uses (0 = no counter)"),
        "max",
        feature ? (feature.max ?? "") : 0,
        'type="number" min="0" max="9999" required',
      ) +
      field(
        ctx,
        t("Usi già spesi", "Uses already spent"),
        "used",
        feature ? (feature.used ?? "") : 0,
        'type="number" min="0" max="9999" required',
      ) +
      '<label class="field"><span>' +
      t("Gli usi tornano", "Uses come back") +
      '</span><select name="recovery">' +
      Object.entries(RECOVERY_NAMES)
        .map(
          ([value, names]) =>
            '<option value="' +
            value +
            '" ' +
            ((feature?.recovery ?? "none") === value ? "selected" : "") +
            ">" +
            t(...names) +
            "</option>",
        )
        .join("") +
      "</select></label>" +
      '</div><p class="muted">' +
      t(
        "Usa il valore reale degli usi spesi. Il recupero scelto lo applica il riposo; la descrizione non applica effetti.",
        "Use the actual spent uses. The chosen recovery is applied by the rest; the description applies no effects.",
      ) +
      "</p>",
    {
      submitLabel: t("Salva capacità", "Save feature"),
      onSubmit: safely(ctx, (data) => {
        const max = number(data, "max");
        const used = number(data, "used");
        const name = String(data.get("name")).trim();
        if (!name || !Number.isInteger(max) || !Number.isInteger(used) || max < 0 || used < 0)
          throw new Error(
            t(
              "Indica nome, massimo e usi spesi come numeri interi non negativi.",
              "Enter a name, maximum and spent uses as non-negative whole numbers.",
            ),
          );
        commit(ctx, actor.id, t("Capacità registrata", "Feature recorded"), (draft) => {
          draft.features ??= [];
          const target = feature ? draft.features.find((entry) => entry.id === feature.id) : null;
          const values = {
            id: feature?.id ?? uid(),
            name: feature && name === ctx.label(feature.name) ? feature.name : name,
            description:
              feature && String(data.get("description")) === ctx.label(feature.description)
                ? feature.description
                : String(data.get("description")),
            max,
            used,
          };
          if (target) Object.assign(target, values);
          else draft.features.push(values);
          setFeatureRecovery(draft, values.id, String(data.get("recovery") ?? "none"));
        });
      }),
    },
  );
}
function recordEquipment(ctx, actor, item) {
  const { t } = ctx;
  ctx.dialog(
    item.equipped
      ? t("Registra oggetto riposto", "Record item unequipped")
      : t("Registra equipaggiamento", "Record equipment"),
    "<p>" +
      t(
        "Aggiorna lo stato già vero nella partita. Non esegue un cambio gratuito durante il combattimento.",
        "Update the state already true in the game. This does not perform a free equipment change during combat.",
      ) +
      "</p><p><strong>" +
      label(ctx, item.name) +
      "</strong> → " +
      (item.equipped ? t("Riposto", "Unequipped") : t("Equipaggiato", "Equipped")) +
      "</p>",
    {
      submitLabel: t("Registra stato", "Record state"),
      onSubmit: safely(ctx, () =>
        commit(ctx, actor.id, t("Equipaggiamento registrato", "Equipment recorded"), (draft) => {
          const current = draft.inventory.find((entry) => entry.id === item.id);
          if (!current || current.quantity < 1)
            throw new Error(t("Oggetto non disponibile.", "Item unavailable."));
          current.equipped = !item.equipped;
        }),
      ),
    },
  );
}
// An item that fell (for example when its holder dropped to 0 HP) is back in the
// inventory only when the table says so: a record of a fact, not a free action.
function recordPickUp(ctx, actor, item) {
  const { t } = ctx;
  ctx.dialog(
    t("Registra oggetto raccolto", "Record item picked up"),
    "<p>" +
      t(
        "Registra che l’oggetto è di nuovo in possesso della creatura. Nel combattimento raccoglierlo usa l’interazione con un oggetto del turno: decidilo al tavolo.",
        "Record that the creature has the item again. In combat, picking it up uses the turn's object interaction: settle that at the table.",
      ) +
      "</p><p><strong>" +
      label(ctx, item.name) +
      "</strong> → " +
      t("Nell’inventario, non equipaggiato", "In the inventory, not equipped") +
      "</p>",
    {
      submitLabel: t("Registra raccolto", "Record picked up"),
      onSubmit: safely(ctx, () =>
        commit(ctx, actor.id, t("Oggetto raccolto", "Item picked up"), (draft) => {
          const current = draft.inventory.find((entry) => entry.id === item.id);
          if (!current || current.location !== "ground")
            throw new Error(t("L’oggetto non è a terra.", "The item is not on the ground."));
          delete current.location;
        }),
      ),
    },
  );
}
function recordPreparation(ctx, actor, spell) {
  const { t } = ctx;
  ctx.dialog(
    t("Registra preparazione avvenuta", "Record completed preparation"),
    "<p>" +
      t(
        "Usa questa correzione se la tua capacità consente il cambiamento nella situazione attuale. Non avvia né completa un riposo.",
        "Use this correction if your feature permits the change in the current situation. It does not start or finish a rest.",
      ) +
      '</p><label class="field"><span>' +
      t("Stato", "State") +
      '</span><select name="prepared"><option value="yes" ' +
      (spell.prepared ? "selected" : "") +
      ">" +
      t("Preparata", "Prepared") +
      '</option><option value="no" ' +
      (spell.prepared ? "" : "selected") +
      ">" +
      t("Non preparata", "Not prepared") +
      "</option></select></label>",
    {
      submitLabel: t("Registra", "Record"),
      onSubmit: safely(ctx, (data) =>
        commit(ctx, actor.id, t("Preparazione registrata", "Preparation recorded"), (draft) => {
          const entry = draft.spells.find((entry) => entry.id === spell.id);
          entry.prepared = data.get("prepared") === "yes";
          if (entry.combatActionId && draft.combatProfile) {
            const spells = new Set(
              (draft.combatProfile.spells || []).filter(
                (id) => !draft.spells.some((spell) => spell.combatActionId === id),
              ),
            );
            for (const spell of draft.spells) {
              if (
                spell.combatActionId &&
                spell.prepared &&
                (!spell.spellcastingAbility ||
                  spell.spellcastingAbility === draft.combatProfile.spellcastingAbility)
              )
                spells.add(spell.combatActionId);
            }
            draft.combatProfile.spells = [...spells];
          }
        }),
      ),
    },
  );
}
function recordSlots(ctx, actor, key = "1") {
  const { t } = ctx;
  const level = Number(key);
  const pool =
    key === "pact" ? actor.pactSlots : spellSlotPools(actor).find((entry) => entry.level === level);
  if (!pool) return;
  ctx.dialog(
    t("Correggi slot registrati", "Correct recorded slots"),
    '<p class="muted">' +
      t(
        "Correggere non conclude un riposo. Se gli slot spesi superano il nuovo massimo, il consumo resta visibile e la disponibilità è zero.",
        "A correction does not finish a rest. If spent slots exceed the new maximum, spent uses remain visible and availability is zero.",
      ) +
      '</p><div class="form-grid">' +
      field(
        ctx,
        t("Massimo", "Maximum"),
        "max",
        pool.max,
        'type="number" min="0" max="99" required',
      ) +
      field(
        ctx,
        t("Spesi", "Spent"),
        "used",
        pool.used,
        'type="number" min="0" max="99" required',
      ) +
      "</div>",
    {
      submitLabel: t("Registra correzione", "Record correction"),
      onSubmit: safely(ctx, (data) =>
        commit(ctx, actor.id, t("Slot corretti", "Slots corrected"), (draft) => {
          const max = number(data, "max");
          const used = number(data, "used");
          if (!Number.isInteger(max) || !Number.isInteger(used) || used < 0 || max < 0)
            throw new Error(
              t(
                "Massimo e slot spesi devono essere numeri interi non negativi.",
                "Maximum and spent slots must be non-negative whole numbers.",
              ),
            );
          if (key === "pact") draft.pactSlots = { ...draft.pactSlots, max, used };
          else setSpellSlotPool(draft, level, { max, used });
        }),
      ),
    },
  );
}
function editText(ctx, actor, future) {
  const { t } = ctx;
  ctx.dialog(
    future ? t("Piano futuro", "Future plan") : t("Storia condivisa", "Shared story"),
    future
      ? textarea(ctx, t("Tappe e idee", "Steps and ideas"), "text", personalPlan(ctx, actor))
      : textarea(
          ctx,
          t("Aspetto e descrizione", "Appearance and description"),
          "description",
          actor.description ?? "",
        ) +
          textarea(ctx, t("Biografia", "Biography"), "backstory", actor.backstory ?? "") +
          textarea(
            ctx,
            t("Annotazioni condivise", "Shared annotations"),
            "text",
            actor.notes ?? "",
          ),
    {
      submitLabel: t("Salva", "Save"),
      onSubmit: safely(ctx, (data) =>
        commit(
          ctx,
          actor.id,
          future ? t("Piano aggiornato", "Plan updated") : t("Storia aggiornata", "Story updated"),
          (draft) => {
            if (future) {
              draft.personalPlans ??= {};
              draft.personalPlans[ctx.role] = String(data.get("text"));
            } else {
              draft.notes = String(data.get("text"));
              draft.description = String(data.get("description") ?? "");
              draft.backstory = String(data.get("backstory") ?? "");
            }
          },
          future ? { local: true } : {},
        ),
      ),
    },
  );
}
// B62 review: choosing a category or a sub-section redraws the sheet; the keyboard focus
// then returns to the chosen control in the new strips (it fell to the document, and a
// keyboard user had to Tab from the top of the page to reach the sub-sections). "sub"
// prefers the open sub-section, "category" the open category.
let focusAfterDraw = null;
// Final review X-07 (Foundry: an item or spell dropped on an actor sheet): a compendium entry
// dragged onto a sheet the viewer controls opens «Aggiungi all'inventario / alle magie» for
// that sheet. The compendium is an optional neighbour, loaded when a drop arrives.
const ENTRY_DRAG = "application/x-d20-entry";
export function bindEntryDrop(el, ctx, actorId) {
  const actor = ctx.state.actors?.[actorId];
  if (!el || !actor || !ctx.canControl(actor)) return;
  el.addEventListener("dragover", (event) => {
    if (!event.dataTransfer?.types?.includes(ENTRY_DRAG)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    el.classList.add("is-drop-target");
  });
  el.addEventListener("dragleave", (event) => {
    if (!el.contains(event.relatedTarget)) el.classList.remove("is-drop-target");
  });
  el.addEventListener("drop", (event) => {
    const id = event.dataTransfer?.getData(ENTRY_DRAG);
    el.classList.remove("is-drop-target");
    if (!id) return;
    event.preventDefault();
    import("./compendium.mjs")
      .then((C) => {
        if (!C.dropOnSheet(ctx, id, actorId))
          ctx.toast(
            ctx.t(
              "Su una scheda si trascinano oggetti e incantesimi.",
              "Items and spells can be dropped on a sheet.",
            ),
            true,
          );
      })
      .catch(() => {});
  });
}
export function bindCharacters(root, ctx) {
  if (ctx.view.id) bindEntryDrop(root.querySelector(".character-sheet") ?? root, ctx, ctx.view.id);
  bindFormsSummary(root, ctx);
  bindConditionsSummary(root, ctx);
  // W2a2 integration: a redrawn strip starts at its beginning; keep the open section in view.
  scrollIntoStrip(
    root.querySelector(".character-tabs"),
    root.querySelector(".character-tabs .active"),
  );
  if (focusAfterDraw) {
    const sub = root.querySelector(".character-subtabs .active");
    const category = root.querySelector(".character-tabs .active");
    (focusAfterDraw === "sub" ? (sub ?? category) : category)?.focus({ preventScroll: true });
    focusAfterDraw = null;
  }
  if (ctx.view.id && ctx.state.actors[ctx.view.id])
    ctx.registry?.bindSlots(root, ctx, {
      points: ["sheet-tab", "sheet-section"],
      args: [getEffectiveActor(ctx.state.actors[ctx.view.id])],
    });
  function bindFilter(inputSelector, rowSelector, emptySelector) {
    root.querySelector(inputSelector)?.addEventListener("input", (event) => {
      const needle = event.target.value.toLocaleLowerCase().trim();
      const rows = [...root.querySelectorAll(rowSelector)];
      rows.forEach((row) => {
        row.hidden = !row.dataset.search.includes(needle);
      });
      root.querySelector(emptySelector).hidden = rows.some((row) => !row.hidden);
    });
  }
  bindFilter("[data-character-filter]", "[data-character-card]", "[data-character-no-results]");
  // BI-05: rule words in the sheet's own texts open the compendium's glossary tooltip.
  bindGlossary(root.querySelector(".character-tab-content"), ctx);
  bindFilter("[data-inventory-filter]", "[data-inventory-row]", "[data-inventory-no-results]");
  root.addEventListener("click", (event) => {
    const tab = event.target.closest(
      "[data-character-tab], [data-character-subtab], [data-character-page-tab]",
    );
    if (tab) {
      focusAfterDraw = tab.closest(".character-subtabs") ? "sub" : "category";
      ctx.navigate("characters", {
        id: ctx.view.id,
        tab:
          tab.dataset.characterSubtab ?? tab.dataset.characterTab ?? tab.dataset.characterPageTab,
      });
      return;
    }
    if (event.target.closest("[data-character-tabs-all]")) {
      // B62: every category with its sub-sections, grouped as on the sheet.
      const actor = ctx.state.actors[ctx.view.id];
      const coreTabs = Object.entries(tabs).map(([id, names]) => ({ id, names }));
      const items =
        ctx.registry?.merge("sheet-tab", coreTabs, ctx, getEffectiveActor(actor)) ??
        coreTabs.map((item) => ({ ...item, core: true }));
      const pageOpen = root.querySelector(".character-page-tab.active")?.dataset.characterPageTab;
      const current = pageOpen
        ? null
        : (root.querySelector(".character-subtabs .active")?.dataset.characterSubtab ??
          root.querySelector(".character-tabs .active")?.dataset.characterTab);
      // D&D Beyond's phone pages lead the list where the strip shows them (a phone sheet).
      const pages = [...root.querySelectorAll(".character-page-tab")].filter(
        (b) => b.getClientRects().length,
      );
      ctx.dialog(
        ctx.t("Sezioni della scheda", "Character sheet sections"),
        `<div class="dialog-menu table-panels-menu is-grouped">${
          pages.length
            ? `<section class="table-panels-group"><div class="table-panels-group-head"><h3>${ctx.t("Scheda", "Sheet")}</h3></div>${pages
                .map((b) => {
                  const on = b.dataset.characterPageTab === pageOpen;
                  return `<button type="button" class="button${on ? " active" : ""}" data-character-page-tab="${ctx.esc(b.dataset.characterPageTab)}"${on ? ' aria-current="true"' : ""}>${ctx.esc(b.textContent)}</button>`;
                })
                .join("")}</section>`
            : ""
        }${sheetCategories(ctx, items)
          .map(
            (category) =>
              `<section class="table-panels-group"><div class="table-panels-group-head"><h3>${category.name}</h3></div>${category.members
                .map((m) => {
                  const on = m.id === current;
                  return `<button type="button" class="button${on ? " active" : ""}" data-character-tab="${ctx.esc(m.id)}"${on ? ' aria-current="true"' : ""}>${m.name}</button>`;
                })
                .join("")}</section>`,
          )
          .join("")}</div>`,
        { cancelLabel: ctx.t("Chiudi", "Close") },
      );
      document
        .querySelectorAll("#dialog [data-character-tab], #dialog [data-character-page-tab]")
        .forEach(
          (b) =>
            (b.onclick = () => {
              ctx.closeDialog();
              focusAfterDraw = b.dataset.characterPageTab ? "category" : "sub";
              ctx.navigate("characters", {
                id: ctx.view.id,
                tab: b.dataset.characterTab ?? b.dataset.characterPageTab,
              });
            }),
        );
      return;
    }
    const pip = event.target.closest('.character-feature [data-shp="pip"]');
    if (pip && !pip.disabled) {
      const owner = ctx.state.actors[ctx.view.id];
      const feature = owner?.features?.find((f) => f.id === pip.dataset.id);
      if (!feature) return;
      const index = Number(pip.dataset.index);
      const used = index < (feature.used ?? 0) ? index : index + 1;
      try {
        commit(
          ctx,
          owner.id,
          ctx.t(
            `${ctx.label(feature.name)}: ${used}/${feature.max} usi spesi`,
            `${ctx.label(feature.name)}: ${used}/${feature.max} uses spent`,
          ),
          (draft) => setFeatureUsed(draft, feature.id, used),
        );
      } catch (error) {
        ctx.toast(error.message, true);
      }
      return;
    }
    const control = event.target.closest("[data-character-action]");
    if (!control || control.disabled) return;
    const action = control.dataset.characterAction;
    const actor = ctx.state.actors[ctx.view.id];
    const { t } = ctx;
    try {
      if (action === "collection") return ctx.navigate("characters");
      if (action === "open")
        return ctx.navigate("characters", { id: control.dataset.actor, tab: "actions" });
      if (action === "create" || action === "reconstruct")
        return startCharacterBuilder(ctx, { kind: action });
      if (action === "resume-build") {
        const draft = (ctx.state.characterDrafts || []).find(
          (entry) =>
            entry.id === control.dataset.draft &&
            entry.owner === ctx.role &&
            entry.status === "active",
        );
        if (draft) return ctx.navigate("builder", { id: draft.id });
        return;
      }
      if (!actor) return;
      if (action === "library") {
        const targetKind = control.dataset.libraryKind;
        if (!["features", "spells", "inventory"].includes(targetKind)) return;
        const instanceId = control.dataset.libraryInstance;
        const entry = instanceId
          ? (actor[targetKind] || []).find((row) => row.id === instanceId)
          : null;
        if (instanceId && !entry?.homebrewRef) return;
        if (!entry) permissionActor(ctx, actor.id);
        const returnTo = JSON.stringify({
          page: "characters",
          actorId: actor.id,
          tab: targetKind,
          ...(instanceId ? { instanceId } : {}),
        });
        return ctx.navigate("library", {
          ...(entry
            ? { id: entry.homebrewRef.contentId, revision: entry.homebrewRef.revisionId }
            : {}),
          returnTo,
        });
      }
      if (action === "notes-tab")
        return ctx.navigate("characters", { id: actor.id, tab: NOTES_TAB });
      if (action === "personality-add" || action === "personality-random") {
        const key = control.dataset.key;
        permissionActor(ctx, actor.id);
        if (action === "personality-random") {
          const value = randomPersonalityFor(actor, key, ctx.lang);
          if (!value)
            return ctx.toast(
              t("Nessun altro suggerimento: scrivilo tu.", "No more suggestions: write your own."),
            );
          return commit(
            ctx,
            actor.id,
            t(
              `${t(...PERSONALITY_NAMES[key])}: aggiunto`,
              `${t(...PERSONALITY_NAMES[key])}: added`,
            ),
            (draft) => addPersonality(draft, key, value),
          );
        }
        return ctx.dialog(
          t(...PERSONALITY_NAMES[key]),
          field(
            ctx,
            t("Nuova voce", "New entry"),
            "entry",
            "",
            'required maxlength="300" autofocus',
          ),
          {
            submitLabel: t("Aggiungi", "Add"),
            onSubmit: safely(ctx, (data) =>
              commit(
                ctx,
                actor.id,
                t(
                  `${t(...PERSONALITY_NAMES[key])}: aggiunto`,
                  `${t(...PERSONALITY_NAMES[key])}: added`,
                ),
                (draft) => addPersonality(draft, key, data.get("entry")),
              ),
            ),
          },
        );
      }
      if (action === "personality-remove") {
        const key = control.dataset.key;
        return commit(
          ctx,
          actor.id,
          t(`${t(...PERSONALITY_NAMES[key])}: tolto`, `${t(...PERSONALITY_NAMES[key])}: removed`),
          (draft) => removePersonality(draft, key, Number(control.dataset.index)),
        );
      }
      if (action === "feature-filter") {
        featureUi.filter = control.dataset.filter;
        return ctx.render();
      }
      if (action === "appearance") return openAppearance(ctx, actor.id);
      if (action === "inspiration") {
        const on = !DT.hasInspiration(ctx.state.ext?.[DT.ID], actor.id);
        return ctx.commit(
          `${actor.name}: ${on ? t("Ispirazione eroica ottenuta", "Heroic Inspiration gained") : t("Ispirazione eroica tolta", "Heroic Inspiration removed")}`,
          (draft) =>
            DT.setInspiration(
              draft.ext[DT.ID],
              draft,
              actor.id,
              on,
              ctx.role,
              new Date().toISOString(),
            ),
          { undoable: false },
        );
      }
      if (action === "ac-detail") return openSheetStat(ctx, actor.id, "ac");
      if (action === "speeds") return openSheetMovement(ctx, actor.id);
      if (action === "rest") return ctx.openRest(actor.id);
      if (action === "table") return ctx.navigate("table", { id: actor.id });
      if (action === "campaign") return ctx.navigate("campaign");
      if (action === "notes") return ctx.openNotes();
      if (action === "inventory-tab")
        return ctx.navigate("characters", { id: actor.id, tab: "inventory" });
      const item = actor.inventory.find((entry) => entry.id === control.dataset.item);
      const spell = (actor.spells ?? []).find((entry) => entry.id === control.dataset.spell);
      if (action === "detail-item" && item) return detailItem(ctx, actor, item);
      if (action === "detail-spell" && spell) {
        const share = shareToChat(ctx, actor, "spell:" + spell.id);
        ctx.dialog(
          ctx.label(spell.name),
          "<p>" +
            ctx.esc(spellGrantDetails(ctx, spell)) +
            "</p>" +
            sourceDetails(ctx, spell.source) +
            '<p class="character-multiline">' +
            ctx.esc(ctx.label(spell.description)) +
            "</p>" +
            share.html,
          {},
        );
        return share.bind();
      }
      permissionActor(ctx, actor.id);
      if (action === "advance" || action === "revise")
        return startCharacterBuilder(ctx, { kind: action, actorId: actor.id });
      if (action === "connect-campaign")
        return ctx.dialog(
          t("Collega scheda alla campagna", "Connect sheet to campaign"),
          "<p>" +
            ctx.esc(actor.name) +
            " → " +
            ctx.esc(ctx.state.campaign.name) +
            "</p><p>" +
            (actor.companion
              ? t(
                  "Condividi questa creatura con la campagna. Il DM potrà gestirla; la scheda del genitore e le altre creature non vengono condivise da questo comando. I contenuti della scheda diventano consultabili. Gli appunti personali e le registrazioni private nel registro rimangono personali. Potrai poi collocare la pedina; l’iniziativa è una scelta distinta.",
                  "Share this creature with the campaign. The DM can manage it; this command does not share its parent’s sheet or other creatures. The sheet contents become readable. Personal notes and private log records remain personal. You can then place its token; joining initiative is a separate choice.",
                )
              : t(
                  "I partecipanti potranno consultare la scheda e la storia condivisa. Il DM potrà gestirla; i tuoi appunti e le bozze private rimangono personali. Il DM posizionerà la pedina e sceglierà se includerla nell’iniziativa.",
                  "Participants can view the sheet and shared story. The DM can manage it; your private notes and drafts remain personal. The DM will place the token and choose whether to include it in initiative.",
                )) +
            "</p>",
          {
            submitLabel: t("Collega alla campagna", "Connect to campaign"),
            onSubmit: () =>
              ctx.commit(
                t("Scheda collegata alla campagna", "Sheet connected to campaign"),
                (state) => connectCharacterWithContent(state, actor.id, ctx.role),
              ),
          },
        );
      if (action === "edit-character") return editCharacter(ctx, actor);
      // P3 PG-21, final review C2-3 (D&D Beyond: the HP number opens HP management): the
      // whole HP widget, «Correggi» included.
      if (action === "hp-correct")
        return ctx.registry?.run?.(ctx.registry.get("command", "damage-tray.hp", ctx), ctx, {
          actorId: actor.id,
          surface: "sheet",
        });
      if (action === "add-item") return editItem(ctx, actor);
      if (action === "pending-healing") return pendingHealing(ctx, actor.id);
      if (action === "use-healing" && item) return useHealing(ctx, actor, item);
      if (action === "check") return abilityCheck(ctx, actor, control.dataset.ability);
      if (action === "undo") return ctx.undo();
      if (action === "record-concentration") return recordConcentration(ctx, actor);
      if (action === "end-concentration")
        return commit(
          ctx,
          actor.id,
          t("Concentrazione terminata", "Concentration ended"),
          (draft) => {
            draft.concentration = null;
          },
        );
      if (action === "add-spell") return editSpell(ctx, actor);
      if (action === "add-feature") return editFeature(ctx, actor);
      if (action === "feature-use" || action === "feature-restore") {
        const feature = actor.features?.find((f) => f.id === control.dataset.feature);
        if (!feature) return;
        // PG-77: «Usa» on Wild Shape is the transformation itself (form picker, BG3).
        if (
          action === "feature-use" &&
          ctx.openForms &&
          (feature.definitionId === "druid:wild-shape" ||
            actor.formsProfile?.wildShapeFeatureId === feature.id)
        )
          return ctx.openForms(actor.id, "forms");
        const used = action === "feature-restore" ? 0 : (feature.used ?? 0) + 1;
        const name = ctx.label(feature.name);
        return commit(
          ctx,
          actor.id,
          action === "feature-restore"
            ? t(`${name}: usi ripristinati`, `${name}: uses reset`)
            : t(
                `${name}: un uso speso (${used}/${feature.max})`,
                `${name}: one use spent (${used}/${feature.max})`,
              ),
          (draft) => setFeatureUsed(draft, feature.id, used),
        );
      }
      if (action === "edit-feature")
        return editFeature(
          ctx,
          actor,
          actor.features.find((feature) => feature.id === control.dataset.feature),
        );
      if (action === "equip-item" && item) return recordEquipment(ctx, actor, item);
      if (action === "pickup-item" && item) return recordPickUp(ctx, actor, item);
      if (action === "prepare-spell" && spell) return recordPreparation(ctx, actor, spell);
      if (action === "slots") return recordSlots(ctx, actor, control.dataset.pool);
      if (action === "edit-story" || action === "future-plan")
        return editText(ctx, actor, action === "future-plan");
    } catch (error) {
      ctx.toast(error.message, true);
    }
  });
}
