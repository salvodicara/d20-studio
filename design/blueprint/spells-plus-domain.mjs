// B38 — Spells: management, lists, comparison, rituals and items. Pure domain: no DOM and
// no registry; the entry module (spells-plus.mjs) binds it to the sheet's Magie tab.
//
// Patterns copied (IDs from docs/interview/CAPABILITY_CENSUS.md and
// changes/interview-01/market-census/*.md):
// - D&D Beyond Manage Spells (DDB-043): the class spell list filtered by level and source,
//   Add / Prepare per row, the prepared count against the limit, level-scaled variants.
// - D&D Beyond Spells tab (DDB-042): ability, spell attack and save DC in the header; a Cast
//   button per row and "As Ritual" (+10 minutes, no slot) for ritual spells.
// - dnd5e preparation states (FVT-021): not prepared / prepared / always prepared, separate
//   from how the spell is cast. dnd5e usage dialog (FVT-018): confirm what is consumed and
//   the level; casting from a magic item with its own charges (FVT-020).
// - BG3 spellbook (CRP-018): the message says when prepared spells can and cannot change;
//   "Learn Spells" (scribing) with its cost; one icon with its level variants (CRP-100);
//   the warning that a new Concentration spell ends the current one (CRP-104, FVT-031).
// - Solasta II component option (CRP-047): the table decides whether components are checked.
// - Named preparation lists recalled as a proposal with differences (F-044/MAG-03) and a
//   side-by-side comparison (F-045/MAG-04), from docs/interview/SPELLCASTING_FLOW.md.
//
// Rules: D&D 2024, SRD 5.2.1 (EN/IT). Every rule below cites its printed pages. The prototype
// uses synthetic data only; there is no backend, no real clock and no multiclass casting.

import { SPELLS, getById, srdSource, normalizeSearchText } from "./srd-sample.mjs";
import { SPELL_PROGRESSION, classes as CLASS_ROWS } from "./character-rules.mjs";
import { legacySpell } from "./srd-legacy-sample.mjs";
import { canControlActor, canViewActor } from "./character-access.mjs";
import { observeConcentrationEnd, observeConditionTerms } from "./combat.mjs";
import {
  observeRestEvent,
  initializeRestTime,
  previewTimeAdvance,
  advanceGameTime,
} from "./rest-time.mjs";
import { observeFormsEvent, getEffectiveActor } from "./forms-companions.mjs";
import { combatTurnKey, hasCondition } from "./conditions.mjs";
import { purseOf, spendCp, setPurse, catalogEntry, coinsValue } from "./party-stash.mjs";
import {
  activitiesOf,
  needsAttunement,
  previewActivity,
  useActivity,
  rollLastCharge,
} from "./inventory-plus-domain.mjs";

export const ID = "spells-plus";
export const ROLLS_ID = "spells-plus-rolls";
export const VERSION = 1;

const text = (it, en) => ({ it, en });
const copy = (value) => (value === undefined ? undefined : structuredClone(value));
const now = () => new Date().toISOString();
const newId = (prefix) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
export const pick = (value, lang = "it") =>
  value && typeof value === "object"
    ? String(value[lang] ?? value.it ?? value.en ?? "")
    : String(value ?? "");
// A refusal the shell shows in the current language (dialogs read `it`/`en`).
function refuse(code, it, en) {
  throw Object.assign(new Error(en), { code, it, en });
}
const issue = (code, it, en, extra = {}) => ({ code, it, en, ...extra });
const mod = (score) => (Number.isFinite(score) ? Math.floor((score - 10) / 2) : null);

// ---------------------------------------------------------------- rule sources

// Printed page numbers of SRD 5.2.1, checked in the local EN/IT PDFs (hashes in srd-sample).
export const SOURCES = Object.freeze({
  preparation: srdSource([104], [118]), // Spell Preparation by Class; Always-Prepared Spells
  ritual: srdSource([104], [118]), // Rituals: +10 minutes, no slot, must be prepared
  higherSlot: srdSource([104], [119]), // Using a Higher-Level Spell Slot
  castingTime: srdSource([105], [119]), // Casting Time; One Spell with a Spell Slot per Turn
  components: srdSource([105, 106], [120]), // Components; Component Pouch; Spellcasting Focus
  concentration: srdSource([179], [206]), // Rules Glossary: Concentration
  wizard: srdSource([77, 78], [60, 61]), // Spellbook; Prepared Spells; Ritual Adept; copying
  scroll: srdSource([244], [271]), // Spell Scroll: copying into a spellbook (Arcana DC 10+level)
  itemSpells: srdSource([206], [234]), // Spells Cast from Items: no slot, no components
  wand: srdSource([251], [247]), // Wand of Magic Missiles
  elf: srdSource([84, 85], [94, 95]), // Elven Lineage: always prepared, once without a slot
  druidic: srdSource([42], [48]), // Druidic: Speak with Animals always prepared
  arcaneFocus: srdSource([96], [110]),
  componentPouch: srdSource([97], [107]),
});

// Spell Preparation by Class (EN 104 / IT 118): when the list changes and how many spells.
export const CHANGE_RULES = Object.freeze({
  bard: { when: "level", count: 1 },
  cleric: { when: "long-rest", count: "any" },
  druid: { when: "long-rest", count: "any" },
  paladin: { when: "long-rest", count: 1 },
  ranger: { when: "long-rest", count: 1 },
  sorcerer: { when: "level", count: 1 },
  warlock: { when: "level", count: 1 },
  wizard: { when: "long-rest", count: "any" },
});
// Spellcasting Focus of each class (class features; Equipment EN 96–97 / IT 107–110).
export const FOCUS_BY_CLASS = Object.freeze({
  wizard: ["arcane", "spellbook"],
  sorcerer: ["arcane"],
  warlock: ["arcane"],
  druid: ["druidic"],
  ranger: ["druidic"],
  cleric: ["holy"],
  paladin: ["holy"],
  bard: ["instrument"],
});
export const FOCUS_NAMES = Object.freeze({
  arcane: text("focus arcano", "arcane focus"),
  spellbook: text("libro degli incantesimi", "spellbook"),
  druidic: text("focus druidico", "druidic focus"),
  holy: text("simbolo sacro", "holy symbol"),
  instrument: text("strumento musicale", "musical instrument"),
  pouch: text("borsa per componenti", "component pouch"),
});
// Material components with a cost of the sample spells (SRD spell descriptions). The rest of
// each spell's text stays in the compendium; nothing is inferred from other prose.
export const COSTLY_COMPONENTS = Object.freeze({
  "find-familiar": {
    gp: 10,
    consumed: true,
    name: text("incenso acceso", "burning incense"),
  },
  bless: { gp: 5, consumed: false, name: text("un simbolo sacro", "a Holy Symbol") },
  revivify: { gp: 300, consumed: true, name: text("un diamante", "a diamond") },
  "raise-dead": { gp: 500, consumed: true, name: text("un diamante", "a diamond") },
  "greater-restoration": {
    gp: 100,
    consumed: true,
    name: text("polvere di diamante", "diamond dust"),
  },
});
// Spells with a structured Table action in combat.mjs (the existing combat flow).
export const TABLE_SPELLS = Object.freeze([
  "fire-bolt",
  "burning-hands",
  "magic-missile",
  "shield",
]);
const UNIT_SECONDS = { round: 6, minute: 60, hour: 3600, day: 86400 };
export const RITUAL_SECONDS = 600;

// ---------------------------------------------------------------- slices

export function emptySlice() {
  return {
    prep: {},
    drafts: {},
    lists: {},
    casts: [],
    timeRequests: [],
    freeUses: {},
    transcriptions: [],
    legacy: {},
  };
}
export const emptyRolls = () => ({ rolls: [] });
const isObject = (v) => !!v && typeof v === "object" && !Array.isArray(v);
export function normalizeSlice(value) {
  const base = emptySlice();
  if (!isObject(value)) return base;
  for (const key of ["prep", "drafts", "lists", "freeUses", "legacy"])
    base[key] = isObject(value[key]) ? value[key] : {};
  for (const key of ["casts", "timeRequests", "transcriptions"])
    base[key] = Array.isArray(value[key]) ? value[key] : [];
  return base;
}
export const normalizeRolls = (value) => ({
  rolls: Array.isArray(value?.rolls) ? value.rolls : [],
});
export const readSlice = (state) => state?.ext?.[ID] ?? emptySlice();
export const readRolls = (state) => state?.ext?.[ROLLS_ID] ?? emptyRolls();
function slice(state) {
  state.ext ??= {};
  state.ext[ID] = normalizeSlice(state.ext[ID]);
  return state.ext[ID];
}
function rolls(state) {
  state.ext ??= {};
  state.ext[ROLLS_ID] = normalizeRolls(state.ext[ROLLS_ID]);
  return state.ext[ROLLS_ID].rolls;
}

// ---------------------------------------------------------------- lookups

const SPELL_BY_SLUG = new Map(SPELLS.map((entry) => [entry.slug, entry]));
export const spellBySlug = (slug) => SPELL_BY_SLUG.get(slug) ?? null;
// The SRD entry of a sheet row: its compendium reference, else the catalog or combat slug.
// A row recorded only by name stays unstructured (no inference from a name).
export function spellEntryFor(row) {
  if (!row) return null;
  const byRef = row.compendiumRef?.id ? getById(row.compendiumRef.id) : null;
  if (byRef?.kind === "spell") return byRef;
  const slug = row.catalogId ?? row.combatActionId;
  return (slug && SPELL_BY_SLUG.get(slug)) || null;
}
export const refOf = (row) => spellEntryFor(row)?.id ?? "row:" + row.id;
export function itemEntryFor(row) {
  if (!row) return null;
  const byRef = row.compendiumRef?.id ? getById(row.compendiumRef.id) : null;
  if (byRef?.kind === "item") return byRef;
  if (row.srdId) return getById(row.srdId) ?? null;
  return catalogEntry(row);
}
const nonClassGrant = (row) => /^(species|background|feat|item|origin):/.test(row?.grantId ?? "");
export const isAlways = (row) => row?.alwaysPrepared === true;
const inInventory = (row) =>
  !!row && row.quantity > 0 && row.location !== "ground" && row.availableInForm !== false;

// ---------------------------------------------------------------- caster profile

export function slotPools(actor) {
  const out = [];
  for (let level = 1; level <= 9; level++) {
    const pool = actor?.spellSlots?.[level] ?? (level === 1 ? actor?.slots : null);
    if (!pool) continue;
    const used = Number.isInteger(pool.used) ? pool.used : null;
    out.push({
      level,
      max: pool.max,
      used,
      available: used === null ? null : Math.max(0, pool.max - used),
    });
  }
  return out;
}
const pool = (actor, level) => actor.spellSlots?.[level] ?? (level === 1 ? actor.slots : null);
function spendSlot(actor, level) {
  pool(actor, level).used += 1;
  if (level === 1 && actor.spellSlots?.[1]) actor.slots = actor.spellSlots[1];
}

// The spellcasting class that governs preparation: the first class of the build with a
// spell progression (single-class sheets; multiclass casting is out of this prototype).
export function casterProfile(actor) {
  if (!actor) return null;
  const list = actor.characterBuild?.data?.classes ?? actor.buildSeed?.classes ?? [];
  const cls = list.find((row) => SPELL_PROGRESSION[row.classId]);
  if (!cls) return null;
  const classId = cls.classId;
  const level = Math.min(
    20,
    Math.max(1, Number.isInteger(cls.level) ? cls.level : (actor.level ?? 1)),
  );
  const def = CLASS_ROWS.find((row) => row.id === classId);
  const ability = actor.combatProfile?.spellcastingAbility ?? def?.spellcastingAbility ?? null;
  const abilityMod = mod(actor.abilities?.[ability]);
  const proficiency =
    actor.proficiencyBonus ??
    actor.combatProfile?.proficiencyBonus ??
    2 + Math.floor(((actor.level ?? 1) - 1) / 4);
  const pools = slotPools(actor).filter((p) => p.max > 0);
  const maxSlotLevel = Math.max(
    0,
    ...pools.map((p) => p.level),
    actor.pactSlots?.max > 0 ? actor.pactSlots.level : 0,
  );
  return {
    classId,
    className: def?.name ?? text(classId, classId),
    level,
    multiclass: list.length > 1,
    ability,
    abilityMod,
    proficiency,
    attack: abilityMod === null ? null : abilityMod + proficiency,
    dc: abilityMod === null ? null : 8 + abilityMod + proficiency,
    quota: SPELL_PROGRESSION[classId].prepared[level - 1],
    cantripQuota: SPELL_PROGRESSION[classId].cantrips[level - 1],
    maxSlotLevel,
    book: classId === "wizard",
    bookAllowance: classId === "wizard" ? 6 + 2 * (level - 1) : null,
    rule: CHANGE_RULES[classId],
    focus: FOCUS_BY_CLASS[classId] ?? [],
    source: def?.source ?? null,
  };
}

// dnd5e's three preparation states (FVT-021), with the book state of a wizard.
export function rowState(row, profile) {
  if (row.level === 0) return "cantrip";
  if (isAlways(row)) return "always";
  if (row.prepared) return "prepared";
  return profile?.book && isBookRow(row, profile) ? "book" : "unprepared";
}
export const isBookRow = (row, profile) =>
  !!profile?.book && row.level >= 1 && !isAlways(row) && !nonClassGrant(row);
// Rows the class preparation governs (always-prepared and other features stay outside).
const countable = (row) => row.level >= 1 && !isAlways(row) && !nonClassGrant(row);
// Rows outside class preparation (no spellcasting class, or granted by another feature and
// not always prepared) keep the sheet's own "record preparation" correction.
export const outsideClassPreparation = (row, profile) =>
  row.level >= 1 && !isAlways(row) && (!profile || nonClassGrant(row));
export const currentKeys = (actor) =>
  (actor.spells ?? []).filter((row) => countable(row) && row.prepared).map((row) => row.id);

export function preparationCounts(actor, profile, keys = null) {
  const spells = actor.spells ?? [];
  const set = keys ? new Set(keys) : null;
  const prepared = set
    ? [...set].filter((key) => key.startsWith("srd:") || spells.some((r) => r.id === key)).length
    : currentKeys(actor).length;
  const bookRows = profile?.book ? spells.filter((row) => isBookRow(row, profile)) : [];
  return {
    prepared,
    quota: profile?.quota ?? null,
    always: spells.filter((row) => row.level >= 1 && isAlways(row)).length,
    cantrips: spells.filter((row) => row.level === 0 && !nonClassGrant(row)).length,
    cantripQuota: profile?.cantripQuota ?? null,
    book: profile?.book ? bookRows.length : null,
    bookPicks: profile?.book
      ? Math.max(
          0,
          profile.bookAllowance - bookRows.filter((row) => row.bookOrigin !== "transcribed").length,
        )
      : null,
  };
}

// ---------------------------------------------------------------- preparation window

// The key of the latest completed Long Rest of an actor (rest-time.mjs benefits).
export function latestLongRestKey(state, actorId) {
  let key = null;
  for (const rest of state.restTime?.rests ?? [])
    for (const part of rest.participants ?? [])
      if (part.actorId === actorId)
        for (const benefit of part.benefits ?? [])
          if (benefit.applied && benefit.kind === "long") key = benefit.id;
  return key;
}
const CLOSED_TEXT = {
  "long-rest-any": text(
    "Le magie preparate si cambiano al termine di un riposo lungo, quante vuoi.",
    "Prepared spells change when you finish a Long Rest, as many as you like.",
  ),
  "long-rest-1": text(
    "Una magia preparata si cambia al termine di un riposo lungo.",
    "One prepared spell changes when you finish a Long Rest.",
  ),
  "level-1": text(
    "Una magia preparata si cambia quando sali di livello.",
    "One prepared spell changes when you gain a level.",
  ),
};
export function preparationWindow(state, actorId) {
  const actor = state.actors?.[actorId];
  const profile = casterProfile(actor);
  if (!profile)
    return {
      open: false,
      kind: "none",
      message: text("Nessuna classe incantatrice registrata.", "No spellcasting class recorded."),
    };
  const rec = readSlice(state).prep[actorId] ?? {};
  const rule = profile.rule;
  const ruleKey = `${rule.when}-${rule.count}`;
  const base = { rule, source: SOURCES.preparation, closedText: CLOSED_TEXT[ruleKey] };
  if (rec.exception)
    return {
      ...base,
      open: true,
      kind: "exception",
      count: "any",
      reason: rec.exception.reason,
      by: rec.exception.by,
      message: text(
        `Deroga registrata: ${rec.exception.reason}`,
        `Exception recorded: ${rec.exception.reason}`,
      ),
    };
  if (rule.when === "long-rest") {
    const key = latestLongRestKey(state, actorId);
    if (rec.sampleWindow)
      return {
        ...base,
        open: true,
        kind: "sample",
        count: rule.count,
        message: text(
          "Riposo lungo appena concluso (esempio): puoi cambiare le magie preparate.",
          "Long Rest just finished (sample): you can change your prepared spells.",
        ),
      };
    if (key && key !== rec.restKey)
      return {
        ...base,
        open: true,
        kind: "long-rest",
        count: rule.count,
        restKey: key,
        message:
          rule.count === "any"
            ? text(
                "Riposo lungo concluso: puoi cambiare le magie preparate.",
                "Long Rest finished: you can change your prepared spells.",
              )
            : text(
                "Riposo lungo concluso: puoi cambiare una magia preparata.",
                "Long Rest finished: you can change one prepared spell.",
              ),
      };
  } else if (rec.level !== actor.level)
    return {
      ...base,
      open: true,
      kind: "level",
      count: 1,
      message: text(
        "Nuovo livello: puoi cambiare una magia preparata.",
        "New level: you can change one prepared spell.",
      ),
    };
  if (Number.isInteger(rec.quota) && profile.quota > rec.quota)
    return {
      ...base,
      open: true,
      kind: "quota",
      count: 0,
      additions: profile.quota - rec.quota,
      message: text(
        `Il limite è salito a ${profile.quota}: puoi aggiungere ${profile.quota - rec.quota} magie.`,
        `The limit rose to ${profile.quota}: you can add ${profile.quota - rec.quota} spells.`,
      ),
    };
  return { ...base, open: false, kind: "closed", message: CLOSED_TEXT[ruleKey] };
}

// ---------------------------------------------------------------- access

function controlled(state, actorId, viewer) {
  const actor = state.actors?.[actorId];
  if (!actor || !canViewActor(actor, viewer, state))
    refuse("sheet", "Scheda non disponibile.", "Sheet unavailable.");
  if (!canControlActor(actor, viewer, state))
    refuse("permission", "Non controlli questa scheda.", "You do not control this sheet.");
  return actor;
}
export const isPrivateActor = (actor) => actor?.visibility === "private";
// Commit options: a private sheet is a personal, local change (allowed offline).
export const commitOptions = (actor) =>
  isPrivateActor(actor) ? { local: true, visibility: "private" } : {};
export const PERSONAL = Object.freeze({ local: true, visibility: "private" });

// ---------------------------------------------------------------- drafts (MAG-02)

const draftKey = (actorId, viewer) => `${actorId}:${viewer}`;
export const draftFor = (state, actorId, viewer) =>
  readSlice(state).drafts[draftKey(actorId, viewer)] ?? null;
const baseline = (actor) => new Set(currentKeys(actor));
function changesOf(actor, keys) {
  const before = baseline(actor);
  const after = new Set(keys);
  return {
    added: [...after].filter((k) => !before.has(k)),
    removed: [...before].filter((k) => !after.has(k)),
  };
}
function keyEntry(actor, key) {
  if (key.startsWith("srd:")) {
    const entry = getById(key.slice(4));
    return { key, row: null, entry, level: entry?.level ?? null, name: entry?.name ?? key };
  }
  const row = (actor.spells ?? []).find((r) => r.id === key);
  return {
    key,
    row,
    entry: spellEntryFor(row),
    level: row?.level ?? null,
    name: row?.name ?? text("Magia rimossa", "Removed spell"),
  };
}
function closedRefusal(window) {
  refuse(
    "not-changeable",
    `Preparazione non modificabile ora. ${window.closedText?.it ?? ""}`.trim(),
    `Preparation cannot change now. ${window.closedText?.en ?? ""}`.trim(),
  );
}
// Refusal reasons for one row of the class list or the sheet (shown before any click).
export function lockReason(row, profile) {
  if (!row) return null;
  if (row.level === 0)
    return text(
      "I trucchetti sono sempre disponibili: non si preparano.",
      "Cantrips are always available: they are not prepared.",
    );
  if (isAlways(row))
    return text(
      "Sempre preparata: non conta nel limite e non si toglie.",
      "Always prepared: it does not count against the limit and cannot be removed.",
    );
  if (nonClassGrant(row))
    return text(
      "Concessa da un'altra capacità: la preparazione della classe non la cambia.",
      "Granted by another feature: class preparation does not change it.",
    );
  if (profile && row.level > profile.maxSlotLevel)
    return text(
      `Serve uno slot di livello ${row.level}.`,
      `It needs a level ${row.level} spell slot.`,
    );
  return null;
}
export function toggleDraft(state, actorId, key, want, viewer) {
  const actor = controlled(state, actorId, viewer);
  const profile = casterProfile(actor);
  if (!profile)
    refuse("no-caster", "Nessuna classe incantatrice.", "No spellcasting class recorded.");
  const window = preparationWindow(state, actorId);
  if (!window.open) closedRefusal(window);
  const s = slice(state);
  const dk = draftKey(actorId, viewer);
  const draft = (s.drafts[dk] ??= {
    actorId,
    owner: viewer,
    keys: currentKeys(actor),
    origin: { kind: "manual" },
    createdAt: now(),
  });
  // A catalog key of a spell already on the sheet uses that row.
  if (key.startsWith("srd:")) {
    const existing = (actor.spells ?? []).find((r) => spellEntryFor(r)?.id === key.slice(4));
    if (existing) key = existing.id;
  }
  const info = keyEntry(actor, key);
  if (info.row) {
    const reason = lockReason(info.row, profile);
    if (reason) refuse("locked", reason.it, reason.en);
    if (profile.book && !isBookRow(info.row, profile))
      refuse(
        "not-in-book",
        "Si preparano solo le magie del libro.",
        "Only spells in the spellbook can be prepared.",
      );
  } else {
    const entry = info.entry;
    if (!entry || entry.kind !== "spell" || !entry.classes.includes(profile.classId))
      refuse(
        "not-on-list",
        "Questa magia non è nella lista della classe.",
        "This spell is not on the class list.",
      );
    if (profile.book)
      refuse(
        "not-in-book",
        "Prima aggiungila al libro degli incantesimi.",
        "Add it to the spellbook first.",
      );
    if (entry.level === 0)
      refuse("cantrip", "I trucchetti non si preparano.", "Cantrips are not prepared.");
    if (entry.level > profile.maxSlotLevel)
      refuse(
        "slot-level",
        `Serve uno slot di livello ${entry.level}.`,
        `It needs a level ${entry.level} spell slot.`,
      );
  }
  const keys = new Set(draft.keys);
  if (want) {
    if (!keys.has(key) && keys.size >= profile.quota)
      refuse(
        "quota",
        `Hai già ${keys.size} magie preparate su ${profile.quota}: togline una prima.`,
        `You already have ${keys.size} of ${profile.quota} prepared spells: remove one first.`,
      );
    keys.add(key);
  } else keys.delete(key);
  const change = changesOf(actor, keys);
  if (window.kind === "quota" && change.removed.length)
    refuse(
      "additions-only",
      "Il nuovo limite consente solo di aggiungere magie.",
      "The new limit only allows adding spells.",
    );
  if (window.kind === "quota" && change.added.length > window.additions)
    refuse(
      "additions-limit",
      `Puoi aggiungere ${window.additions} magie.`,
      `You can add ${window.additions} spells.`,
    );
  if (window.count === 1 && (change.added.length > 1 || change.removed.length > 1))
    refuse(
      "one-change",
      "La tua classe cambia una sola magia alla volta.",
      "Your class changes one spell at a time.",
    );
  draft.keys = [...keys];
  draft.updatedAt = now();
  if (!change.added.length && !change.removed.length && draft.origin.kind === "manual")
    delete s.drafts[dk];
  return draftFor(state, actorId, viewer);
}
export function discardDraft(state, actorId, viewer) {
  controlled(state, actorId, viewer);
  const s = slice(state);
  if (!s.drafts[draftKey(actorId, viewer)])
    refuse("no-draft", "Nessuna modifica da annullare.", "No change to discard.");
  delete s.drafts[draftKey(actorId, viewer)];
}
export function previewPreparation(state, actorId, viewer) {
  const actor = state.actors?.[actorId];
  const profile = casterProfile(actor);
  const draft = draftFor(state, actorId, viewer);
  const keys = draft ? draft.keys : currentKeys(actor ?? {});
  const change = actor ? changesOf(actor, keys) : { added: [], removed: [] };
  const window = preparationWindow(state, actorId);
  const errors = [];
  if (!draft) errors.push(issue("no-draft", "Nessuna modifica.", "No change."));
  if (!window.open)
    errors.push(
      issue(
        "not-changeable",
        window.closedText?.it ?? window.message.it,
        window.closedText?.en ?? window.message.en,
      ),
    );
  if (profile && keys.length > profile.quota)
    errors.push(
      issue(
        "quota",
        `Troppe magie preparate: ${keys.length} su ${profile.quota}.`,
        `Too many prepared spells: ${keys.length} of ${profile.quota}.`,
      ),
    );
  if (window.count === 1 && (change.added.length > 1 || change.removed.length > 1))
    errors.push(
      issue(
        "one-change",
        "La tua classe cambia una sola magia alla volta.",
        "Your class changes one spell at a time.",
      ),
    );
  if (window.kind === "quota" && change.removed.length)
    errors.push(
      issue(
        "additions-only",
        "Il nuovo limite consente solo di aggiungere magie.",
        "The new limit only allows adding spells.",
      ),
    );
  for (const key of keys) {
    const info = keyEntry(actor, key);
    if (!info.row && !info.entry)
      errors.push(issue("missing", "Una magia non è più disponibile.", "A spell is gone."));
    if (profile && info.level > profile.maxSlotLevel)
      errors.push(
        issue(
          "slot-level",
          `${pick(info.name, "it")}: serve uno slot di livello ${info.level}.`,
          `${pick(info.name, "en")}: it needs a level ${info.level} slot.`,
        ),
      );
  }
  return {
    draft,
    window,
    keys,
    added: change.added.map((k) => keyEntry(actor, k)),
    removed: change.removed.map((k) => keyEntry(actor, k)),
    count: keys.length,
    quota: profile?.quota ?? null,
    errors,
    valid: errors.length === 0,
  };
}
// Recomputes the Table actions of prepared spells, like the sheet's preparation record.
export function syncCombatProfile(actor) {
  const profile = actor.combatProfile;
  if (!profile) return;
  const spells = actor.spells ?? [];
  const set = new Set(
    (profile.spells ?? []).filter((id) => !spells.some((row) => row.combatActionId === id)),
  );
  for (const row of spells)
    if (
      row.combatActionId &&
      (row.prepared || isAlways(row) || row.level === 0) &&
      (!row.spellcastingAbility || row.spellcastingAbility === profile.spellcastingAbility)
    )
      set.add(row.combatActionId);
  profile.spells = [...set];
}
function newSpellRow(entry, profile, extra = {}) {
  return {
    id: newId("sp-row"),
    catalogId: entry.slug,
    ...(TABLE_SPELLS.includes(entry.slug) ? { combatActionId: entry.slug } : {}),
    name: copy(entry.name),
    level: entry.level,
    prepared: false,
    description: copy(entry.summary),
    grantId: "class:" + profile.classId,
    source: copy(entry.source),
    compendiumRef: { id: entry.id, revision: "5.2.1" },
    ...extra,
  };
}
export function confirmPreparation(state, actorId, viewer) {
  const actor = controlled(state, actorId, viewer);
  const profile = casterProfile(actor);
  const p = previewPreparation(state, actorId, viewer);
  if (!p.valid) refuse(p.errors[0].code, p.errors[0].it, p.errors[0].en);
  const keys = new Set(p.keys);
  for (const key of [...keys].filter((k) => k.startsWith("srd:"))) {
    const entry = getById(key.slice(4));
    const row = newSpellRow(entry, profile, { prepared: true });
    actor.spells ??= [];
    actor.spells.push(row);
    keys.delete(key);
    keys.add(row.id);
  }
  for (const row of actor.spells ?? []) if (countable(row)) row.prepared = keys.has(row.id);
  syncCombatProfile(actor);
  const s = slice(state);
  s.prep[actorId] = {
    restKey: latestLongRestKey(state, actorId),
    level: actor.level,
    quota: profile.quota,
    confirmedAt: now(),
    confirmedBy: viewer,
    sampleWindow: false,
    exception: null,
  };
  delete s.drafts[draftKey(actorId, viewer)];
  return { added: p.added, removed: p.removed };
}
// A reasoned correction: the DM for a campaign sheet, the owner for a personal sheet.
export function openException(state, actorId, reason, viewer) {
  const actor = controlled(state, actorId, viewer);
  const clean = String(reason ?? "").trim();
  if (clean.length < 3 || clean.length > 200)
    refuse("reason", "Scrivi il motivo della deroga.", "Write the reason for the exception.");
  if (isPrivateActor(actor) ? actor.owner !== viewer : viewer !== "dm")
    refuse(
      "dm-only",
      "Solo il DM concede una deroga su una scheda della campagna.",
      "Only the DM grants an exception on a campaign sheet.",
    );
  const s = slice(state);
  s.prep[actorId] = {
    ...(s.prep[actorId] ?? {}),
    exception: { reason: clean, by: viewer, at: now() },
  };
}

// ---------------------------------------------------------------- class list (DDB-043)

export function classSpellOptions(state, actorId, filter = {}) {
  const actor = state.actors?.[actorId];
  const profile = casterProfile(actor);
  if (!profile) return [];
  const query = normalizeSearchText(filter.query ?? "");
  const lang = filter.lang ?? "it";
  return SPELLS.filter((entry) => entry.classes.includes(profile.classId))
    .filter(
      (entry) => filter.level == null || filter.level === "all" || entry.level === filter.level,
    )
    .filter((entry) => !filter.ritual || entry.ritual)
    .filter((entry) => !filter.concentration || entry.concentration)
    .filter(
      (entry) =>
        !query ||
        normalizeSearchText(entry.name.it).includes(query) ||
        normalizeSearchText(entry.name.en).includes(query),
    )
    .sort((a, b) => a.level - b.level || pick(a.name, lang).localeCompare(pick(b.name, lang), lang))
    .map((entry) => {
      const row = (actor.spells ?? []).find((r) => spellEntryFor(r)?.id === entry.id) ?? null;
      const reachable = entry.level === 0 || entry.level <= profile.maxSlotLevel;
      return { entry, row, state: row ? rowState(row, profile) : "absent", reachable };
    });
}
// PG-53 (D&D Beyond «Manage Spells» with Legacy badges): with the campaign's legacy switch
// on (C4, `allowed`), a class-list spell that has an SRD 5.1 entry gets a second row beside
// its 2024 one. The character may prefer the 2014 text; the 2024 rules stay the default
// and the Table's automatic rolls keep the 2024 values.
export function legacyOptions(state, actorId, { allowed = false, ...filter } = {}) {
  if (!allowed) return [];
  const chosen = new Set(legacyChoices(state, actorId));
  return classSpellOptions(state, actorId, filter).flatMap((option) => {
    const legacy = legacySpell(option.entry.slug);
    return legacy ? [{ entry: option.entry, legacy, chosen: chosen.has(option.entry.slug) }] : [];
  });
}
export const legacyChoices = (state, actorId) =>
  Array.isArray(readSlice(state).legacy?.[actorId]) ? [...readSlice(state).legacy[actorId]] : [];
export function chooseLegacy(state, actorId, slug, on, viewer, { allowed = false } = {}) {
  controlled(state, actorId, viewer);
  if (!allowed)
    refuse(
      "legacy",
      "La campagna non ammette le versioni 2014: il DM le attiva in Impostazioni › Fonti.",
      "The campaign does not allow 2014 versions: the DM turns them on in Settings › Sources.",
    );
  if (!legacySpell(slug))
    refuse("legacy", "Questa magia non ha una versione 2014.", "This spell has no 2014 version.");
  const s = slice(state);
  const chosen = new Set(legacyChoices(state, actorId));
  if (on) chosen.add(slug);
  else chosen.delete(slug);
  if (chosen.size) s.legacy[actorId] = [...chosen];
  else delete s.legacy[actorId];
  return [...chosen];
}
// Wizard level choices: "Whenever you gain a Wizard level after 1, add two Wizard spells"
// (EN 77 / IT 60), recorded here when the sheet does not list them yet.
export function addToBook(state, actorId, entryId, viewer) {
  const actor = controlled(state, actorId, viewer);
  const profile = casterProfile(actor);
  const entry = getById(entryId);
  if (!profile?.book)
    refuse(
      "no-book",
      "Solo il mago ha un libro degli incantesimi.",
      "Only a Wizard has a spellbook.",
    );
  if (!entry || entry.kind !== "spell" || !entry.classes.includes("wizard") || entry.level < 1)
    refuse(
      "not-on-list",
      "Magia non disponibile per il libro.",
      "Spell not available for the book.",
    );
  if (entry.level > profile.maxSlotLevel)
    refuse(
      "slot-level",
      `Serve uno slot di livello ${entry.level}.`,
      `It needs a level ${entry.level} spell slot.`,
    );
  if ((actor.spells ?? []).some((r) => spellEntryFor(r)?.id === entry.id))
    refuse("duplicate", "È già nel libro.", "It is already in the spellbook.");
  if (preparationCounts(actor, profile).bookPicks < 1)
    refuse(
      "no-picks",
      "Nessuna scelta di livello libera: trascrivila da una fonte trovata.",
      "No free level choice left: copy it from a spell you found.",
    );
  const row = newSpellRow(entry, profile, { bookOrigin: "level" });
  actor.spells ??= [];
  actor.spells.push(row);
  addToSpellbookItem(actor, entry.slug);
  return row;
}
export function learnCantrip(state, actorId, entryId, viewer) {
  const actor = controlled(state, actorId, viewer);
  const profile = casterProfile(actor);
  const entry = getById(entryId);
  if (!profile || !entry || entry.level !== 0 || !entry.classes.includes(profile.classId))
    refuse("not-on-list", "Trucchetto non disponibile.", "Cantrip not available.");
  if ((actor.spells ?? []).some((r) => spellEntryFor(r)?.id === entry.id))
    refuse("duplicate", "Lo conosci già.", "You already know it.");
  const counts = preparationCounts(actor, profile);
  if (counts.cantrips >= profile.cantripQuota)
    refuse(
      "cantrip-quota",
      `Conosci già ${counts.cantrips} trucchetti su ${profile.cantripQuota}.`,
      `You already know ${counts.cantrips} of ${profile.cantripQuota} cantrips.`,
    );
  const row = newSpellRow(entry, profile, { prepared: true });
  actor.spells ??= [];
  actor.spells.push(row);
  syncCombatProfile(actor);
  return row;
}
function addToSpellbookItem(actor, slug) {
  const book = (actor.inventory ?? []).find((row) => row.spellbook && inInventory(row));
  if (book && !book.spellbook.spellIds?.includes(slug))
    book.spellbook.spellIds = [...(book.spellbook.spellIds ?? []), slug];
}

// ---------------------------------------------------------------- lists (MAG-03)

export const listsFor = (state, actorId, viewer) =>
  (readSlice(state).lists[actorId] ?? []).filter((list) => list.owner === viewer);
function listRefs(actor, keys) {
  return keys
    .map((key) => {
      if (key.startsWith("srd:")) return key.slice(4);
      const row = (actor.spells ?? []).find((r) => r.id === key);
      return row ? refOf(row) : null;
    })
    .filter(Boolean);
}
function validName(name) {
  const clean = String(name ?? "").trim();
  if (!clean || clean.length > 60)
    refuse(
      "name",
      "Dai un nome alla lista (massimo 60 caratteri).",
      "Name the list (60 characters max).",
    );
  return clean;
}
export function saveList(state, actorId, name, viewer) {
  const actor = controlled(state, actorId, viewer);
  const clean = validName(name);
  const s = slice(state);
  const mine = (s.lists[actorId] ??= []);
  if (mine.some((l) => l.owner === viewer && l.name.toLowerCase() === clean.toLowerCase()))
    refuse(
      "duplicate",
      "Esiste già una lista con questo nome: usa Aggiorna.",
      "A list with this name exists: use Update.",
    );
  const draft = draftFor(state, actorId, viewer);
  const list = {
    id: newId("sp-list"),
    owner: viewer,
    name: clean,
    refs: listRefs(actor, draft ? draft.keys : currentKeys(actor)),
    savedAt: now(),
  };
  mine.push(list);
  return list;
}
export function updateList(state, actorId, listId, viewer) {
  const actor = controlled(state, actorId, viewer);
  const list = (slice(state).lists[actorId] ?? []).find(
    (l) => l.id === listId && l.owner === viewer,
  );
  if (!list) refuse("no-list", "Lista non trovata.", "List not found.");
  const draft = draftFor(state, actorId, viewer);
  list.refs = listRefs(actor, draft ? draft.keys : currentKeys(actor));
  list.savedAt = now();
  return list;
}
export function deleteList(state, actorId, listId, viewer) {
  controlled(state, actorId, viewer);
  const s = slice(state);
  const before = (s.lists[actorId] ?? []).length;
  s.lists[actorId] = (s.lists[actorId] ?? []).filter(
    (l) => !(l.id === listId && l.owner === viewer),
  );
  if (s.lists[actorId].length === before)
    refuse("no-list", "Lista non trovata.", "List not found.");
}
// The list as a proposal: additions, removals and entries no longer available, never applied
// silently (MAG-03). Always-prepared spells stay outside every list.
export function proposalFromList(state, actorId, listId, viewer) {
  const actor = state.actors?.[actorId];
  const profile = casterProfile(actor);
  const list = listsFor(state, actorId, viewer).find((l) => l.id === listId);
  if (!actor || !profile || !list) refuse("no-list", "Lista non trovata.", "List not found.");
  const keys = [];
  const unavailable = [];
  for (const ref of list.refs) {
    let row = null;
    if (ref.startsWith("row:")) row = (actor.spells ?? []).find((r) => r.id === ref.slice(4));
    else row = (actor.spells ?? []).find((r) => spellEntryFor(r)?.id === ref);
    const entry = row ? spellEntryFor(row) : getById(ref);
    const name = row?.name ?? entry?.name ?? text("Magia sconosciuta", "Unknown spell");
    if (row && isAlways(row)) continue;
    if (row && !countable(row)) continue;
    if (!row && (!entry || ref.startsWith("row:"))) {
      unavailable.push({
        ref,
        name,
        reason: text("non è più sulla scheda", "no longer on the sheet"),
      });
      continue;
    }
    if (!row && profile.book) {
      unavailable.push({ ref, name, reason: text("non è nel libro", "not in the spellbook") });
      continue;
    }
    if (!row && !entry.classes.includes(profile.classId)) {
      unavailable.push({
        ref,
        name,
        reason: text("non è nella lista della classe", "not on the class list"),
      });
      continue;
    }
    const level = row?.level ?? entry.level;
    if (level > profile.maxSlotLevel) {
      unavailable.push({
        ref,
        name,
        reason: text(`serve uno slot di livello ${level}`, `needs a level ${level} slot`),
      });
      continue;
    }
    if (keys.length >= profile.quota) {
      unavailable.push({ ref, name, reason: text("oltre il limite", "over the limit") });
      continue;
    }
    keys.push(row ? row.id : "srd:" + entry.id);
  }
  const change = changesOf(actor, keys);
  return {
    list,
    keys,
    added: change.added.map((k) => keyEntry(actor, k)),
    removed: change.removed.map((k) => keyEntry(actor, k)),
    unavailable,
    draft: draftFor(state, actorId, viewer),
    window: preparationWindow(state, actorId),
  };
}
export function recallList(state, actorId, listId, viewer, { replaceDraft = false } = {}) {
  controlled(state, actorId, viewer);
  const p = proposalFromList(state, actorId, listId, viewer);
  if (!p.window.open) closedRefusal(p.window);
  if (p.draft && !replaceDraft)
    refuse(
      "draft-open",
      "Hai modifiche non confermate: scegli se mantenerle o sostituirle con la lista.",
      "You have unconfirmed changes: choose whether to keep them or replace them with the list.",
    );
  const s = slice(state);
  s.drafts[draftKey(actorId, viewer)] = {
    actorId,
    owner: viewer,
    keys: p.keys,
    origin: { kind: "list", listId, name: p.list.name },
    unavailable: copy(p.unavailable),
    createdAt: now(),
  };
  return p;
}

// ---------------------------------------------------------------- casting (MAG-06–09)

const clockOf = (state, actor) =>
  isPrivateActor(actor) || (Array.isArray(actor.campaignIds) && actor.campaignIds.length === 0)
    ? { clockId: "personal:" + actor.id, shared: false }
    : { clockId: state.campaign?.id ?? null, shared: true };
export function clockFor(state, actor) {
  const info = clockOf(state, actor);
  return { ...info, seconds: state.restTime?.clocks?.[info.clockId]?.seconds ?? 0 };
}
const castSeconds = (entry) =>
  ["minute", "hour", "day"].includes(entry?.castingTime?.unit)
    ? entry.castingTime.amount * UNIT_SECONDS[entry.castingTime.unit]
    : 0;
const durationSeconds = (entry) =>
  entry?.duration?.kind === "timed"
    ? entry.duration.amount * (UNIT_SECONDS[entry.duration.unit] ?? 0)
    : 0;
const inCombat = (state, actorId) =>
  !!state.combat?.active && (state.combat.order ?? []).includes(actorId);
const currentTurn = (state, actorId) => state.combat?.order?.[state.combat.turn] === actorId;
const readableBook = (actor) =>
  (actor.inventory ?? []).find((row) => row.spellbook?.readable === true && inInventory(row));
const ritualAdept = (actor) =>
  (actor.features ?? []).some((row) => row.definitionId === "wizard:ritual-adept");
export function freeUseAvailable(state, actorId, row) {
  if (!row?.freeCast) return false;
  const used = readSlice(state).freeUses[`${actorId}:${row.id}`];
  return !used || used.restKey !== latestLongRestKey(state, actorId);
}

// Every way this row can be cast now, BG3-style variants of one icon (CRP-100).
export function castVariants(state, actorId, rowId) {
  const actor = state.actors?.[actorId];
  const row = (actor?.spells ?? []).find((r) => r.id === rowId);
  if (!actor || !row) return [];
  const entry = spellEntryFor(row);
  const profile = casterProfile(actor);
  if (row.level === 0) return [{ via: "cantrip", level: 0, available: true }];
  const usable = isAlways(row) || row.prepared;
  const out = [];
  for (const p of slotPools(actor))
    if (p.level >= row.level && p.max > 0)
      out.push({
        via: "slot",
        level: p.level,
        available: usable && p.available > 0,
        remaining: p.available,
        max: p.max,
        reason: !usable
          ? text("Non preparata", "Not prepared")
          : p.available > 0
            ? null
            : text("Nessuno slot", "No slot left"),
      });
  if (actor.pactSlots && actor.pactSlots.level >= row.level)
    out.push({
      via: "pact",
      level: actor.pactSlots.level,
      available: usable && actor.pactSlots.max - (actor.pactSlots.used ?? 0) > 0,
      remaining: Math.max(0, actor.pactSlots.max - (actor.pactSlots.used ?? 0)),
      max: actor.pactSlots.max,
    });
  if (row.freeCast)
    out.push({
      via: "free",
      level: row.level,
      available: freeUseAvailable(state, actorId, row),
      reason: freeUseAvailable(state, actorId, row)
        ? null
        : text("Già usato: torna dopo un riposo lungo", "Used: back after a Long Rest"),
    });
  if (entry?.ritual) {
    const fromBook = profile?.book && ritualAdept(actor) && isBookRow(row, profile);
    const ok = usable || (fromBook && !!readableBook(actor));
    out.push({
      via: "ritual",
      level: row.level,
      available: ok,
      fromBook: !usable && fromBook,
      reason: ok
        ? null
        : fromBook
          ? text("Serve il libro degli incantesimi a portata", "Your spellbook must be at hand")
          : text("Un rituale richiede la magia preparata", "A Ritual needs the spell prepared"),
    });
  }
  return out;
}

// Magic items that cast a spell with their own charges (FVT-020; SRD EN 206 / IT 234).
// Magic items that cast a spell (FVT-020; SRD EN 206 / IT 234). Charges, activities, the
// dawn recharge and the last-charge d20 belong to the Inventory area (B36,
// inventory-plus-domain.mjs): this list reads the same rows and casting uses its activity
// engine, so there is one charge model and one usage record.
export function itemSources(actor) {
  return (actor?.inventory ?? []).flatMap((row) => {
    if (!inInventory(row) || row.unidentified) return [];
    return activitiesOf(row)
      .filter((activity) => activity.spellId && getById(activity.spellId)?.kind === "spell")
      .map((activity) => ({
        itemId: row.id,
        activityId: activity.id,
        row,
        activity,
        spell: getById(activity.spellId),
        charges: row.charges ? { value: row.charges.value ?? 0, max: row.charges.max ?? 0 } : null,
        min: activity.charges?.min ?? 0,
        max: activity.charges?.max ?? activity.charges?.min ?? 0,
        scaling: activity.scaling === "level-per-charge",
        lastCharge: row.charges?.lastCharge === "pending",
        attunement: needsAttunement(row),
        attuned: row.attuned === true,
        source: itemEntryFor(row)?.source ?? row.source ?? null,
      }));
  });
}

const focusKindOf = (row) =>
  row.spellFocus ??
  (row.spellbook?.readable ? "spellbook" : null) ??
  (itemEntryFor(row)?.slug === "component-pouch" ? "pouch" : null);
// Components of one casting (EN 105–106 / IT 120): V/S from the creature, M from a held focus
// or a component pouch, a costly or consumed material from a recorded inventory item.
export function componentStatus(state, actor, entry, profile, input = {}, rule = "check") {
  const need = entry?.components ?? null;
  const out = {
    need,
    rule,
    focus: null,
    pouch: null,
    material: null,
    candidates: [],
    issues: [],
    notes: [],
  };
  if (!need) {
    out.notes.push(
      text("Componenti non registrate per questa magia.", "No recorded components for this spell."),
    );
    return out;
  }
  if (input.via === "item") {
    out.notes.push(
      text(
        "Dall'oggetto: nessuna componente richiesta (SRD, incantesimi dagli oggetti).",
        "From the item: no components required (SRD, spells cast from items).",
      ),
    );
    return out;
  }
  if (rule === "off") {
    out.notes.push(
      text(
        "Il DM ha disattivato la verifica delle componenti.",
        "The DM turned component checks off.",
      ),
    );
    return out;
  }
  const eff = getEffectiveActor(actor);
  if ((need.verbal || need.somatic) && eff.combatProfile?.componentsAvailable === false)
    out.issues.push(
      issue(
        "components-vs",
        "Le componenti verbali o somatiche non sono disponibili.",
        "Verbal or Somatic components are unavailable.",
      ),
    );
  if (!need.material) return out;
  const kinds = profile?.focus ?? [];
  const items = (actor.inventory ?? []).filter(inInventory);
  out.focus = items.find((row) => kinds.includes(focusKindOf(row)) && row.equipped) ?? null;
  const unheld =
    items
      .filter((row) => kinds.includes(focusKindOf(row)) && !row.equipped)
      .sort((a, b) => kinds.indexOf(focusKindOf(a)) - kinds.indexOf(focusKindOf(b)))[0] ?? null;
  out.pouch = items.find((row) => focusKindOf(row) === "pouch") ?? null;
  const costly = COSTLY_COMPONENTS[entry.slug] ?? null;
  const gp = entry.components.materialCostGp ?? costly?.gp ?? null;
  const consumed = entry.components.materialConsumed || costly?.consumed || false;
  if (gp || consumed) {
    out.material = { gp, consumed, name: costly?.name ?? null };
    out.candidates = items.filter((row) => Number.isFinite(row.materialValueGp));
    const chosen = out.candidates.find((row) => row.id === input.materialItemId) ?? null;
    out.material.chosen = chosen;
    if (!chosen || !input.materialConfirmed || (gp && chosen.materialValueGp < gp))
      out.issues.push(
        issue(
          "material",
          `Manca il componente materiale: ${pick(costly?.name, "it") || "materiale indicato"}${gp ? ` del valore di almeno ${gp} mo` : ""}${consumed ? ", consumato dal lancio" : ""}.`,
          `Missing material component: ${pick(costly?.name, "en") || "the listed material"}${gp ? ` worth at least ${gp} GP` : ""}${consumed ? ", consumed by the casting" : ""}.`,
        ),
      );
    return out;
  }
  if (out.focus || out.pouch || input.materialDeclared) return out;
  const names = kinds.map((k) => FOCUS_NAMES[k]);
  out.issues.push(
    issue(
      "focus",
      `Serve un focus impugnato (${names.map((n) => n.it).join(" o ")}), una borsa per componenti o il materiale indicato${unheld ? `: ${pick(unheld.name, "it")} non è impugnato` : ""}.`,
      `You need a held focus (${names.map((n) => n.en).join(" or ")}), a component pouch or the listed material${unheld ? `: ${pick(unheld.name, "en")} is not held` : ""}.`,
      { unheldItemId: unheld?.id ?? null },
    ),
  );
  return out;
}

// dnd5e usage dialog (FVT-018): everything the casting will consume, before it happens.
export function previewCast(state, actorId, input = {}, viewer, { componentsRule = "check" } = {}) {
  const errors = [];
  const warnings = [];
  const actor = state.actors?.[actorId];
  const result = { errors, warnings, ok: false, input: copy(input) };
  if (!actor || !canControlActor(actor, viewer, state)) {
    errors.push(
      issue("permission", "Non controlli questa scheda.", "You do not control this sheet."),
    );
    return result;
  }
  const profile = casterProfile(actor);
  const via = input.via;
  let row = null;
  let entry = null;
  let item = null;
  let level = null;
  if (via === "item") {
    item =
      itemSources(actor).find(
        (x) =>
          x.itemId === input.itemId && (!input.activityId || x.activityId === input.activityId),
      ) ?? null;
    if (!item) {
      errors.push(issue("item", "Oggetto non disponibile.", "Item unavailable."));
      return result;
    }
    entry = item.spell;
    const use = previewActivity(state, actor, item.row, item.activityId, {
      charges: Number(input.charges ?? item.min),
    });
    for (const reason of use.reasons) errors.push(issue("item-use", reason.it, reason.en));
    level = use.level ?? entry.level;
    result.use = use;
    result.cost = {
      charges: {
        n: use.spend,
        before: use.before,
        after: use.after,
        max: item.charges?.max ?? null,
      },
    };
    if (use.lastCharge)
      warnings.push(
        issue(
          "last-charge",
          "È l'ultima carica: dopo il lancio si tira un d20 (con 1 l'oggetto si distrugge).",
          "It is the last charge: after casting you roll a d20 (on a 1 the item is destroyed).",
        ),
      );
  } else {
    row = (actor.spells ?? []).find((r) => r.id === input.rowId) ?? null;
    if (!row) {
      errors.push(issue("spell", "Magia non trovata sulla scheda.", "Spell not on the sheet."));
      return result;
    }
    entry = spellEntryFor(row);
    const variant = castVariants(state, actorId, row.id).find(
      (v) => v.via === via && (via !== "slot" || v.level === Number(input.level)),
    );
    if (!variant)
      errors.push(
        issue("variant", "Modalità di lancio non disponibile.", "Casting option unavailable."),
      );
    else if (!variant.available)
      errors.push(
        issue(
          "variant",
          variant.reason?.it ?? "Modalità di lancio non disponibile.",
          variant.reason?.en ?? "Casting option unavailable.",
        ),
      );
    level = via === "slot" || via === "pact" ? (variant?.level ?? row.level) : row.level;
    result.cost = {};
    if (via === "slot" && variant)
      result.cost.slot = { level, before: variant.remaining, after: variant.remaining - 1 };
    if (via === "pact" && variant)
      result.cost.pact = { level, before: variant.remaining, after: variant.remaining - 1 };
    if (via === "free") result.cost.free = true;
    if (via === "ritual") result.cost.ritual = true;
    if (via === "ritual" && variant?.fromBook) result.fromBook = true;
  }
  result.actor = actor;
  result.row = row;
  result.entry = entry;
  result.item = item;
  result.via = via;
  result.level = level;
  result.profile = profile;
  const eff = getEffectiveActor(actor);
  if (actor.dead || hasCondition(actor, "incapacitated"))
    errors.push(
      issue(
        "incapacitated",
        "Una creatura Incapacitata non può lanciare incantesimi.",
        "An Incapacitated creature cannot cast spells.",
      ),
    );
  if (eff.combatProfile?.spellcastingRestricted)
    errors.push(
      issue(
        "form",
        "Questa forma non consente di lanciare incantesimi.",
        "This form cannot cast spells.",
      ),
    );
  if (entry?.slug === "find-familiar" && via !== "item") result.formsRoute = true;
  // Time and the action economy (EN 105 / IT 119).
  const unit = entry?.castingTime?.unit ?? "action";
  const fighting = inCombat(state, actorId);
  const long = via === "ritual" || ["minute", "hour", "day"].includes(unit);
  if (fighting && long)
    errors.push(
      issue(
        "long-casting",
        "Un lancio di 1 minuto o più (rituale compreso) si fa fuori dal combattimento in questa scheda.",
        "A casting of 1 minute or more (Rituals included) happens outside combat on this sheet.",
      ),
    );
  if (fighting && unit === "reaction")
    errors.push(
      issue(
        "reaction",
        "In combattimento si lancia come reazione al Tavolo, quando c'è l'innesco.",
        "In combat it is cast as a Reaction at the Table, when its trigger happens.",
      ),
    );
  // The Table's combat flow owns targets, attack rolls, saves and damage of the spells it
  // knows: spending the action and slot from the sheet would leave the effect unresolved.
  if (
    fighting &&
    !long &&
    unit !== "reaction" &&
    via !== "item" &&
    TABLE_SPELLS.includes(entry?.slug)
  )
    errors.push(
      issue(
        "table",
        "In combattimento questa magia si lancia al Tavolo, che ne risolve bersagli, tiri e danni: usa «Prepara al Tavolo».",
        "In combat this spell is cast at the Table, which resolves its targets, rolls and damage: use “Prepare at the Table”.",
      ),
    );
  if (fighting && !long && unit !== "reaction") {
    if (!currentTurn(state, actorId))
      errors.push(issue("turn", "Non è il tuo turno.", "It is not your turn."));
    else if (unit === "action" && !actor.action)
      errors.push(issue("action", "Azione già spesa.", "Action already spent."));
    else if (unit === "bonus-action" && !actor.bonus)
      errors.push(issue("bonus", "Azione bonus già spesa.", "Bonus Action already spent."));
  }
  const slotBased = via === "slot" || via === "pact";
  if (slotBased && fighting && actor.lastSlotTurn === combatTurnKey(state.combat))
    errors.push(
      issue(
        "slot-per-turn",
        "Hai già speso uno slot per lanciare in questo turno.",
        "You already spent a spell slot to cast on this turn.",
      ),
    );
  result.action = fighting && !long && unit !== "reaction" ? unit : null;
  result.slotBased = slotBased;
  // Components (Solasta II option, CRP-047).
  const components = componentStatus(state, actor, entry, profile, input, componentsRule);
  result.components = components;
  const override = input.override?.reason ? String(input.override.reason).trim() : "";
  const canOverride = viewer === "dm" && !isPrivateActor(actor);
  if (components.issues.length) {
    if (override && canOverride) {
      warnings.push(issue("override", `Deroga del DM: ${override}`, `DM exception: ${override}`));
      result.override = override;
    } else errors.push(...components.issues);
  }
  result.canOverride = canOverride;
  // Time: casting time plus 10 minutes for a Ritual (EN 104 / IT 118).
  const seconds = castSeconds(entry) + (via === "ritual" ? RITUAL_SECONDS : 0);
  const clock = clockFor(state, actor);
  const shared = clock.shared;
  const dmClock = shared && viewer === "dm";
  result.time = {
    seconds,
    clockId: clock.clockId,
    shared,
    before: clock.seconds,
    after: clock.seconds + seconds,
    applyNow: seconds > 0 && (!shared || dmClock),
    request: seconds > 0 && shared && !dmClock,
  };
  // Concentration (EN 179 / IT 206): the new spell ends the current one when it begins.
  const current =
    actor.concentration && actor.concentration.active !== false ? actor.concentration : null;
  if (entry?.concentration && current) {
    result.replaces = { id: current.id, name: current.name };
    warnings.push(
      issue(
        "concentration",
        `Interromperà la concentrazione su ${pick(current.name, "it")}.`,
        `It will end Concentration on ${pick(current.name, "en")}.`,
      ),
    );
    if (current.kind === "casting")
      errors.push(
        issue(
          "casting-in-progress",
          "Un lancio prolungato è in corso: concludilo o annullalo prima.",
          "A long casting is in progress: finish or cancel it first.",
        ),
      );
  }
  if (result.formsRoute)
    errors.push(
      issue(
        "forms-route",
        "Trova Famiglio si lancia da Forme e compagni, che segue il lancio e crea il famiglio.",
        "Find Familiar is cast from Forms and companions, which runs the casting and creates the familiar.",
      ),
    );
  result.ok = errors.length === 0;
  return result;
}

function endConcentrationFor(state, actor, reason) {
  const prev = actor.concentration;
  if (!prev?.id || prev.active === false) return null;
  prev.active = false;
  prev.endedReason = reason;
  observeFormsEvent(state, {
    eventId: `${prev.id}:ended:${reason}`,
    cause: "concentration",
    actorIds: [actor.id],
  });
  for (const subject of Object.values(state.actors))
    subject.combatEffects = (subject.combatEffects ?? []).filter(
      (effect) => effect.concentrationId !== prev.id,
    );
  observeConcentrationEnd(state, actor.id, prev.id);
  return { id: prev.id, name: copy(prev.name) };
}
function advanceClock(state, actor, seconds, eventId, reason, viewer) {
  const info = clockOf(state, actor);
  if (!seconds) return null;
  if (!info.shared) {
    const c = (initializeRestTime(state).clocks[info.clockId] ??= { seconds: 0, revision: 0 });
    const before = c.seconds;
    c.seconds += seconds;
    c.revision++;
    observeConditionTerms(state, {
      eventId: `${eventId}:conditions-time`,
      kind: "clock",
      clockId: info.clockId,
    });
    observeFormsEvent(state, {
      eventId: `${eventId}:forms-time`,
      cause: "time",
      actorIds: [actor.id],
    });
    return {
      clockId: info.clockId,
      shared: false,
      applied: true,
      before,
      after: c.seconds,
      seconds,
    };
  }
  const campaignId = info.clockId;
  if (viewer === "dm") {
    const p = previewTimeAdvance(state, { campaignId, seconds }, viewer);
    if (p.canApply) {
      const before = state.restTime?.clocks?.[campaignId]?.seconds ?? 0;
      advanceGameTime(state, { id: `${eventId}-time`, campaignId, seconds }, viewer, {
        reviewKey: p.reviewKey,
      });
      return {
        clockId: campaignId,
        shared: true,
        applied: true,
        before,
        after: state.restTime.clocks[campaignId].seconds,
        seconds,
      };
    }
  }
  // Shared time belongs to the DM (dnd5e GM-only time advance, FVT-060): a request.
  const request = {
    id: newId("sp-time"),
    actorId: actor.id,
    campaignId,
    seconds,
    reason: copy(reason),
    status: "pending",
    by: viewer,
    at: now(),
  };
  slice(state).timeRequests.push(request);
  return { clockId: campaignId, shared: true, applied: false, requestId: request.id, seconds };
}
export function castSpell(state, actorId, input, viewer, options = {}) {
  const p = previewCast(state, actorId, input, viewer, options);
  if (!p.ok) refuse(p.errors[0].code, p.errors[0].it, p.errors[0].en);
  const actor = state.actors[actorId];
  const id = options.id ?? newId("sp-cast");
  const entry = p.entry;
  const s = slice(state);
  const record = {
    id,
    actorId,
    owner: viewer,
    private: isPrivateActor(actor),
    entryId: entry?.id ?? null,
    rowId: p.row?.id ?? null,
    name: copy(p.row?.name ?? entry?.name),
    level: p.level,
    via: p.via,
    at: now(),
  };
  // Resources, only at the moment the casting happens (MAG-08).
  if (p.via === "slot") {
    spendSlot(actor, p.level);
    record.slotLevel = p.level;
  }
  if (p.via === "pact") {
    actor.pactSlots.used = (actor.pactSlots.used ?? 0) + 1;
    record.slotLevel = p.level;
  }
  if (p.via === "free")
    s.freeUses[`${actorId}:${p.row.id}`] = {
      restKey: latestLongRestKey(state, actorId),
      castId: id,
    };
  if (p.via === "item") {
    // The Inventory area's activity: charges, its dice (physical or digital) and its record.
    const used = useActivity(
      state,
      actorId,
      p.item.itemId,
      p.item.activityId,
      {
        charges: p.use.spend,
        mode: input.mode ?? "digital",
        faces: input.faces,
        die: options.rollDie,
        consume: true,
      },
      viewer,
    );
    record.itemId = p.item.itemId;
    record.itemName = copy(p.item.row.name);
    record.charges = p.use.spend;
    record.useId = used.use.id;
    if (used.record)
      record.roll = {
        dice: copy(used.record.dice),
        values: copy(used.record.values),
        modifier: used.record.modifier,
        total: used.record.total,
        mode: used.record.mode,
        reused: !!used.record.reusedFrom,
        damageType: used.record.damageType ?? null,
      };
    record.chargesAfter = used.after;
  }
  if (p.components.material?.chosen && p.components.material.consumed) {
    const row = actor.inventory.find((r) => r.id === p.components.material.chosen.id);
    row.quantity -= 1;
    record.material = { itemId: row.id, name: copy(row.name), consumed: true };
    if (row.quantity <= 0) actor.inventory = actor.inventory.filter((r) => r !== row);
  }
  if (p.override) record.override = { reason: p.override, by: viewer };
  if (p.action === "action") actor.action = false;
  if (p.action === "bonus-action") actor.bonus = false;
  if (p.slotBased && inCombat(state, actorId)) actor.lastSlotTurn = combatTurnKey(state.combat);
  if (inCombat(state, actorId)) record.turnKey = combatTurnKey(state.combat);
  // Game time first: the effect starts when the casting ends.
  if (p.time.seconds)
    record.time = advanceClock(
      state,
      actor,
      p.time.seconds,
      id,
      text(
        `${actor.name}: ${pick(record.name, "it")}${p.via === "ritual" ? " come rituale" : ""}`,
        `${actor.name}: ${pick(record.name, "en")}${p.via === "ritual" ? " as a Ritual" : ""}`,
      ),
      viewer,
    );
  if (entry?.concentration) {
    const ended = endConcentrationFor(state, actor, "replaced");
    if (ended) record.replaced = ended;
    const clock = clockOf(state, actor);
    const expires =
      clock.shared && durationSeconds(entry)
        ? {
            campaignId: clock.clockId,
            seconds: (p.time.before ?? 0) + p.time.seconds + durationSeconds(entry),
          }
        : null;
    actor.concentration = {
      id: "conc-" + id,
      name: copy(entry.name),
      active: true,
      source: { kind: "spell", spellId: entry.id, castId: id, revision: "5.2.1" },
      ...(expires ? { expiresAtGameTime: expires } : {}),
    };
    record.concentrationId = actor.concentration.id;
  }
  if ((entry?.level ?? 0) >= 1 || p.level >= 1)
    observeRestEvent(state, {
      eventId: `${id}:activity`,
      actorIds: [actorId],
      cause: "leveled-spell",
    });
  s.casts.push(record);
  if (s.casts.length > 200) s.casts.splice(0, s.casts.length - 200);
  return record;
}

// ---------------------------------------------------------------- dice evidence

// Accepted faces survive gameplay Undo (a "preserve" slice); a retry of the same check
// reuses a withdrawn face once instead of rolling again (I-229, the Table's convention).
function acceptFace(
  state,
  { key, kind, actorId, viewer, isPrivate, sides, mode, face, rollDie, isLive },
) {
  const list = rolls(state);
  // A face whose result was withdrawn by Undo (no live record uses it) is reused.
  const withdrawn = list.findLast((roll) => roll.key === key && !isLive(roll));
  if (withdrawn) {
    withdrawn.reuses = (withdrawn.reuses ?? 0) + 1;
    return { roll: withdrawn, reused: true };
  }
  let value = face;
  if (mode === "physical") {
    if (!Number.isInteger(value) || value < 1 || value > sides)
      refuse(
        "face",
        `Inserisci la faccia del d${sides}, fra 1 e ${sides}.`,
        `Enter the d${sides} face, from 1 to ${sides}.`,
      );
  } else if (mode === "digital") value = rollDie(sides);
  else refuse("mode", "Scegli dadi fisici o digitali.", "Choose physical or digital dice.");
  const roll = {
    id: newId("sp-roll"),
    key,
    kind,
    actorId,
    owner: viewer,
    private: isPrivate,
    sides,
    face: value,
    mode,
    at: now(),
  };
  list.push(roll);
  return { roll, reused: false };
}
export const rollVisibleTo = (roll, viewer) => !roll.private || roll.owner === viewer;

// ---------------------------------------------------------------- an item's last charge

// The SRD d20 after the last charge, through the Inventory area's roll (one record).
export function resolveLastCharge(state, actorId, itemId, input, viewer, { rollDie } = {}) {
  controlled(state, actorId, viewer);
  const row = (state.actors[actorId].inventory ?? []).find((r) => r.id === itemId);
  const name = copy(row?.name);
  const face = Number(input.face);
  const { record, destroyed } = rollLastCharge(
    state,
    actorId,
    itemId,
    { mode: input.mode, faces: input.mode === "physical" ? [face] : undefined, die: rollDie },
    viewer,
  );
  return { destroyed, face: record.values[0], reused: !!record.reusedFrom, name };
}

// ---------------------------------------------------------------- transcription (PG-60)

export function arcanaModifier(actor) {
  if (Number.isInteger(actor?.skillModifiers?.arcana)) return actor.skillModifiers.arcana;
  const base = mod(actor?.abilities?.int) ?? 0;
  const pb = actor?.proficiencyBonus ?? 2;
  return base + ((actor?.skills ?? []).includes("arcana") ? pb : 0);
}
export const scrollsOf = (actor) =>
  (actor?.inventory ?? []).filter((row) => row.spellScroll?.spellId && inInventory(row));
export function previewTranscription(state, actorId, input = {}, viewer) {
  const errors = [];
  const actor = state.actors?.[actorId];
  const out = { errors, ok: false };
  if (!actor || !canControlActor(actor, viewer, state)) {
    errors.push(
      issue("permission", "Non controlli questa scheda.", "You do not control this sheet."),
    );
    return out;
  }
  const profile = casterProfile(actor);
  if (!profile?.book) {
    errors.push(
      issue(
        "no-book",
        "Solo il mago trascrive nel libro.",
        "Only a Wizard copies spells into a spellbook.",
      ),
    );
    return out;
  }
  const entry = getById(input.entryId);
  if (!entry || entry.kind !== "spell") {
    errors.push(issue("spell", "Scegli una magia.", "Choose a spell."));
    return out;
  }
  out.entry = entry;
  out.profile = profile;
  const from = input.from === "scroll" ? "scroll" : "found";
  out.from = from;
  if (!entry.classes.includes("wizard"))
    errors.push(issue("not-wizard", "Non è una magia da mago.", "It is not a Wizard spell."));
  if (entry.level < 1)
    errors.push(issue("cantrip", "I trucchetti non si trascrivono.", "Cantrips are not copied."));
  if (entry.level > profile.maxSlotLevel)
    errors.push(
      issue(
        "slot-level",
        `Puoi trascrivere solo magie di un livello che sai preparare (fino al ${profile.maxSlotLevel}°).`,
        `You can copy only spells of a level you can prepare (up to level ${profile.maxSlotLevel}).`,
      ),
    );
  if ((actor.spells ?? []).some((r) => spellEntryFor(r)?.id === entry.id && isBookRow(r, profile)))
    errors.push(issue("duplicate", "È già nel libro.", "It is already in the spellbook."));
  if (!readableBook(actor))
    errors.push(
      issue(
        "book",
        "Serve il libro degli incantesimi a portata.",
        "Your spellbook must be at hand.",
      ),
    );
  if (inCombat(state, actorId))
    errors.push(issue("combat", "Non durante il combattimento.", "Not during combat."));
  const level = Math.max(1, entry.level);
  out.hours = 2 * level;
  out.gp = 50 * level;
  const have = coinsValue(purseOf(actor));
  out.purseCp = have;
  if (have < out.gp * 100)
    errors.push(
      issue(
        "funds",
        `Servono ${out.gp} mo: ne hai ${Math.floor(have / 100)}.`,
        `It costs ${out.gp} GP: you have ${Math.floor(have / 100)}.`,
      ),
    );
  if (from === "scroll") {
    const scroll = scrollsOf(actor).find(
      (row) => row.id === input.scrollItemId && row.spellScroll.spellId === entry.id,
    );
    if (!scroll)
      errors.push(
        issue(
          "scroll",
          "La pergamena non è nell'inventario.",
          "The scroll is not in the inventory.",
        ),
      );
    out.scroll = scroll ?? null;
    out.check = { dc: 10 + entry.level, modifier: arcanaModifier(actor) };
  }
  const clock = clockFor(state, actor);
  const shared = clock.shared;
  out.time = {
    seconds: out.hours * 3600,
    clockId: clock.clockId,
    shared,
    before: clock.seconds,
    after: clock.seconds + out.hours * 3600,
    request: shared && viewer !== "dm",
  };
  out.ok = errors.length === 0;
  return out;
}
export function transcribe(state, actorId, input, viewer, options = {}) {
  const p = previewTranscription(state, actorId, input, viewer);
  if (!p.ok) refuse(p.errors[0].code, p.errors[0].it, p.errors[0].en);
  const actor = state.actors[actorId];
  const id = options.id ?? newId("sp-copy");
  const record = {
    id,
    actorId,
    owner: viewer,
    private: isPrivateActor(actor),
    entryId: p.entry.id,
    name: copy(p.entry.name),
    level: p.entry.level,
    from: p.from,
    hours: p.hours,
    gp: p.gp,
    at: now(),
  };
  setPurse(null, viewer, actor, spendCp(purseOf(actor), p.gp * 100));
  record.time = advanceClock(
    state,
    actor,
    p.time.seconds,
    id,
    text(
      `${actor.name}: trascrizione di ${p.entry.name.it}`,
      `${actor.name}: copying ${p.entry.name.en}`,
    ),
    viewer,
  );
  let success = true;
  if (p.from === "scroll") {
    const { roll, reused } = acceptFace(state, {
      key: `transcribe:${actorId}:${p.scroll.id}:${p.entry.id}`,
      kind: "arcana-copy",
      actorId,
      viewer,
      isPrivate: isPrivateActor(actor),
      sides: 20,
      mode: input.mode,
      face: Number(input.face),
      rollDie: options.rollDie,
      isLive: (candidate) =>
        readSlice(state).transcriptions.some((t) => t.check?.rollId === candidate.id),
    });
    const total = roll.face + p.check.modifier;
    success = total >= p.check.dc;
    record.check = {
      dc: p.check.dc,
      face: roll.face,
      modifier: p.check.modifier,
      total,
      mode: roll.mode,
      success,
      rollId: roll.id,
      reused,
    };
    const scroll = actor.inventory.find((row) => row.id === p.scroll.id);
    scroll.quantity -= 1;
    if (scroll.quantity <= 0) actor.inventory = actor.inventory.filter((row) => row !== scroll);
    record.scrollName = copy(p.scroll.name);
  }
  record.success = success;
  if (success) {
    const row = newSpellRow(p.entry, p.profile, { bookOrigin: "transcribed", transcribedBy: id });
    actor.spells ??= [];
    actor.spells.push(row);
    addToSpellbookItem(actor, p.entry.slug);
    record.rowId = row.id;
  }
  slice(state).transcriptions.push(record);
  return record;
}

// ---------------------------------------------------------------- shared time requests

export function pendingTimeRequests(state) {
  return readSlice(state).timeRequests.filter((r) => r.status === "pending");
}
export function applyTimeRequest(state, requestId, viewer) {
  if (viewer !== "dm")
    refuse("dm-only", "Solo il DM avanza il tempo condiviso.", "Only the DM advances shared time.");
  const request = slice(state).timeRequests.find((r) => r.id === requestId);
  if (request?.status !== "pending")
    refuse("no-request", "Richiesta non più in sospeso.", "Request no longer pending.");
  const p = previewTimeAdvance(
    state,
    { campaignId: request.campaignId, seconds: request.seconds },
    viewer,
  );
  if (!p.canApply) refuse(p.errors[0].code, p.errors[0].it, p.errors[0].en);
  const before = state.restTime?.clocks?.[request.campaignId]?.seconds ?? 0;
  advanceGameTime(
    state,
    { id: `${request.id}-applied`, campaignId: request.campaignId, seconds: request.seconds },
    viewer,
    { reviewKey: p.reviewKey },
  );
  request.status = "applied";
  request.appliedAt = now();
  request.before = before;
  request.after = state.restTime.clocks[request.campaignId].seconds;
  return request;
}
export function dismissTimeRequest(state, requestId, reason, viewer) {
  if (viewer !== "dm")
    refuse(
      "dm-only",
      "Solo il DM gestisce il tempo condiviso.",
      "Only the DM manages shared time.",
    );
  const request = slice(state).timeRequests.find((r) => r.id === requestId);
  if (request?.status !== "pending")
    refuse("no-request", "Richiesta non più in sospeso.", "Request no longer pending.");
  const clean = String(reason ?? "").trim();
  if (clean.length < 3) refuse("reason", "Scrivi il motivo.", "Write the reason.");
  request.status = "dismissed";
  request.reason = { ...request.reason, dismissed: clean };
  request.dismissedAt = now();
}

// ---------------------------------------------------------------- comparison (MAG-04)

const CAST_UNITS = {
  action: text("1 azione", "1 action"),
  "bonus-action": text("1 azione bonus", "1 bonus action"),
  reaction: text("1 reazione", "1 reaction"),
};
export function castingTimeText(entry, lang = "it") {
  const ct = entry?.castingTime;
  if (!ct) return null;
  if (CAST_UNITS[ct.unit]) return pick(CAST_UNITS[ct.unit], lang);
  const names = {
    minute: ["minuto", "minuti", "minute", "minutes"],
    hour: ["ora", "ore", "hour", "hours"],
    day: ["giorno", "giorni", "day", "days"],
  }[ct.unit];
  if (!names) return null;
  const word = lang === "it" ? names[ct.amount === 1 ? 0 : 1] : names[ct.amount === 1 ? 2 : 3];
  return `${ct.amount} ${word}`;
}
export function durationText(entry, lang = "it") {
  const d = entry?.duration;
  if (!d) return null;
  if (d.kind === "instantaneous") return lang === "it" ? "Istantanea" : "Instantaneous";
  const names = {
    round: ["round", "round", "round", "rounds"],
    minute: ["minuto", "minuti", "minute", "minutes"],
    hour: ["ora", "ore", "hour", "hours"],
    day: ["giorno", "giorni", "day", "days"],
  }[d.unit];
  if (!names) return null;
  const word = lang === "it" ? names[d.amount === 1 ? 0 : 1] : names[d.amount === 1 ? 2 : 3];
  return `${d.upTo ? (lang === "it" ? "fino a " : "up to ") : ""}${d.amount} ${word}`;
}
export function secondsText(seconds, lang = "it") {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (h)
    parts.push(`${h} ${lang === "it" ? (h === 1 ? "ora" : "ore") : h === 1 ? "hour" : "hours"}`);
  if (m || !h) parts.push(`${m} min`);
  return parts.join(" ");
}
export function clockText(seconds, lang = "it") {
  const day = Math.floor(seconds / 86400) + 1;
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${lang === "it" ? "Giorno" : "Day"} ${day} · ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ---------------------------------------------------------------- sample data

const SAMPLE = Object.freeze({
  kind: "authored-demo",
  edition: "2024",
  revision: "blueprint-b38-spells",
  note: "Synthetic sample data; not a real character.",
});
// Seed: when the area first meets a state (new browser, older data, "Reset example"), the
// library sample Iria (B21) gets what her SRD 5.2.1 rules already imply and a few found
// items: her High Elf lineage spells always prepared (Elven Lineage, EN 84–85 / IT 94–95),
// a readable spellbook and an arcane focus, a Spell Scroll of Web and 150 GP. Fields another area already recorded are never overwritten.
export function seedSlice(state) {
  const out = emptySlice();
  const iria = state?.actors?.iria;
  if (!iria || iria.spellsPlusSample) return out;
  iria.spellsPlusSample = SAMPLE.revision;
  iria.speciesChoices ??= { lineage: "high", spellcastingAbility: "int" };
  for (const row of iria.spells ?? []) {
    if (row.grantId) continue;
    if (row.catalogId === "prestidigitation") {
      row.grantId = "species:elf";
      row.lineage = "high";
    }
    if (["detect-magic", "misty-step"].includes(row.catalogId)) {
      row.grantId = "species:elf";
      row.prepared = true;
      row.alwaysPrepared = true;
      row.alwaysSource = copy(SOURCES.elf);
      row.freeCast = { per: "long-rest", source: copy(SOURCES.elf) };
    }
  }
  const profile = casterProfile(iria);
  iria.inventory ??= [];
  const book = iria.inventory.find((row) => row.id === "iria-spellbook");
  if (book && !book.spellbook)
    book.spellbook = {
      readable: true,
      spellIds: (iria.spells ?? [])
        .filter((row) => isBookRow(row, profile) && row.catalogId)
        .map((row) => row.catalogId),
    };
  const focus = iria.inventory.find((row) => row.id === "iria-focus");
  if (focus && !focus.spellFocus) focus.spellFocus = "arcane";
  const web = getById("srd2024:spell:web");
  if (web && !iria.inventory.some((row) => row.id === "iria-scroll-web"))
    iria.inventory.push({
      id: "iria-scroll-web",
      name: text("Pergamena magica: Ragnatela", "Spell Scroll: Web"),
      quantity: 1,
      weight: 0,
      equipped: false,
      kind: "consumable",
      description: text(
        "Trovata tra i registri del faro. Si può leggere o copiare nel libro (prova di Arcano).",
        "Found among the lighthouse records. It can be read or copied into a spellbook (Arcana check).",
      ),
      spellScroll: { spellId: web.id, level: web.level },
      source: { ...copy(SOURCES.scroll), sample: copy(SAMPLE) },
    });
  if (iria.currency === undefined) iria.currency = { gp: 150 };
  out.prep.iria = { sampleWindow: true };
  return out;
}
