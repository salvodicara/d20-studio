// B19 — 2024 encounter builder: pure domain (no DOM). The UI lives in encounter-builder.mjs.
//
// Copied patterns (census IDs): Kobold+ 2024 strategy, party panel and history
// (CMP-106/107/111); D&D Beyond monster picker, +/- counter that shares initiative and
// "Add" again for a separate initiative, My Encounters with Duplicate/Restart/Resume and
// the Summary/Treasure notes (DDB-091/093/094/095/096); DDB Maps "Add All Tokens" with
// Party/Enemies/NPC sides (DDB-134); Owlbear Battle Board staged groups (VTL-085); Token
// Mold numbering, rolled HP and hidden names (FVT-094) with Clash! adjectives (VTL-120)
// and name auto-load (VTL-083, Game Master's Grimoire VTL-084); Roll20 2024 NPC stat
// block edited in place and linked/unlinked default tokens (R20-102, R20-101); FG/Shard
// text parser into clickable actions confirmed by the DM (R20-113, VTL-089).
//
// Rules (SRD 5.2.1, printed pages): XP budget per character and "spend without going
// over" (EN 202 / IT 230–231); XP by CR (EN 256 / IT 291); one Initiative roll for a group
// of identical creatures (EN 13 / IT 14); monster Initiative modifier (EN 254 / IT 290);
// monster HP either the average or the rolled expression, never both (EN 255 / IT 290);
// Monster Death at 0 HP (EN 17 / IT 19). The difficulty band shown for a total copies
// Kobold+'s 2024 strategy (CMP-106: Trivial below Low, Deadly from 1.5 × High): the SRD
// only says how to spend a chosen budget without going over.
//
// Hand-off reuses the existing Preparation flow: createSceneNPC + placeSceneToken for the
// creatures, scene.encounter participants for the prepared initiative and the one
// initiative ledger (recordInitiativeResult). Every builder roll re-sorts that prepared
// order by total (ties stay as the DM left them). Name hiding reuses the token menu's
// setNameHidden (B12) and treasure the loot area's parcels (B26), each in their slice.

import * as srd from "./srd-sample.mjs";
import { skills as RULE_SKILLS } from "./character-rules.mjs";
import { parseDice, srdMeleeProfile, abilityModifier } from "./srd-compendium.mjs";
import {
  createSceneNPC,
  placeSceneToken,
  removeSceneToken,
  recordInitiativeResult,
} from "./preparation.mjs";
import { partyMembers } from "./party-stash.mjs";
import { canViewActor, isActorAvailable, isCampaignActor } from "./character-access.mjs";
import { rollDie, resetTurnMovement } from "./state.mjs";
import { observeRestEvent } from "./rest-time.mjs";
import { setNameHidden } from "./token-menu.mjs";
import { createParcel, addParcelItem, cleanGearFromStatBlock, updateParcel } from "./loot.mjs";
// C3 (CA-57, Owlbear GM hand-off): the member running the session prepares encounters too.
import { runsSession } from "./session-view.mjs";
import { sampleDate } from "./sample-clock.mjs";

export const ID = "encounter-builder";
export const VERSION = 1;
export const TOKEN_MENU = "token-menu";
export const LOOT = "loot";
const L = (it, en) => ({ it, en });
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const list = (value) => (Array.isArray(value) ? value : []);
const copy = (value) => structuredClone(value);
const now = () => new Date().toISOString();
export const newId = (prefix) =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)}`;

export function encounterError(it, en) {
  return Object.assign(new Error(en), { it, en });
}
// C3: with the state at hand the session runner counts as DM; the collection's own edits
// (no state) receive the caller's authority (encounter-builder.mjs `authority`).
function requireDM(role, state = null) {
  if (role !== "dm" && !(state && runsSession(state, role)))
    throw encounterError("Solo il DM prepara gli incontri.", "Only the DM prepares encounters.");
}

// ---------------------------------------------------------------- rule sources

export const RULES = Object.freeze({
  budget: srd.ENCOUNTER_BUDGET_SOURCE,
  xpByCr: srd.XP_BY_CR_SOURCE,
  groupInitiative: srd.srdSource([13], [14]),
  monsterInitiative: srd.srdSource([254], [290]),
  monsterHp: srd.srdSource([255], [290]),
  monsterDeath: srd.srdSource([17], [19]),
  creatureTypes: srd.LABEL_SOURCES.creatureType,
});
export const pagesText = (source, lang = "it") =>
  lang === "it"
    ? `IT p. ${source.it.pages.join("–")} · EN p. ${source.en.pages.join("–")}`
    : `EN p. ${source.en.pages.join("–")} · IT p. ${source.it.pages.join("–")}`;

export const SIDES = Object.freeze({
  enemies: { team: "watch", label: L("Nemici", "Enemies") },
  neutral: { team: "neutral", label: L("PNG neutrali", "Neutral NPCs") },
  allies: { team: "party", label: L("Alleati", "Allies") },
  party: { team: "party", label: L("Gruppo", "Party") },
});
const sideOfTeam = (team) =>
  team === "watch" ? "enemies" : team === "party" ? "allies" : "neutral";
const npcTeam = (actor) =>
  actor?.combatProfile?.team ??
  (["goblin-1", "goblin-2"].includes(actor?.id) ? "watch" : "neutral");

// Clash! gives duplicates adjectives instead of numbers (VTL-120).
export const ADJECTIVES = Object.freeze([
  L("audace", "Daring"),
  L("furtivo", "Sneaky"),
  L("rabbioso", "Angry"),
  L("astuto", "Cunning"),
  L("feroce", "Fierce"),
  L("guercio", "One-eyed"),
  L("lesto", "Quick"),
  L("truce", "Grim"),
  L("sfregiato", "Scarred"),
  L("silenzioso", "Silent"),
  L("zoppo", "Limping"),
  L("urlante", "Howling"),
]);

// ---------------------------------------------------------------- state slice

export function seedSlice() {
  const at = sampleDate("2026-09-20T18:00:00.000Z");
  return {
    encounters: [
      {
        id: "enc-lantern",
        name: "Chi ha riacceso la lanterna",
        revision: 1,
        createdAt: at,
        updatedAt: at,
        campaignId: "lanterns",
        party: { mode: "campaign", levels: [] },
        groups: [
          { id: "main", name: "Principale", staged: false },
          { id: "grp-stairs", name: "Dalla scala", staged: true },
        ],
        rows: [
          {
            id: "row-priest",
            kind: "creature",
            creatureId: "srd2024:creature:priest",
            count: 1,
            groupId: "main",
            side: "enemies",
          },
          {
            id: "row-cultists",
            kind: "creature",
            creatureId: "srd2024:creature:cultist",
            count: 2,
            groupId: "main",
            side: "enemies",
          },
          {
            id: "row-stairs",
            kind: "creature",
            creatureId: "srd2024:creature:cultist",
            count: 1,
            groupId: "grp-stairs",
            side: "enemies",
          },
        ],
        notes: {
          summary:
            "Sulla torre dell’osservatorio un sacerdote e due cultisti tengono accesa la lanterna verde.",
          readAloud:
            "Una luce verdastra filtra dalle feritoie. Sulla piattaforma, tre figure incappucciate si voltano verso di voi.",
          treasure: "Chiave di ottone della torre; 12 mo nella borsa del sacerdote.",
        },
        sceneId: null,
        handoff: null,
      },
    ],
    blocks: [],
    history: [],
  };
}

function normalizeRow(raw) {
  if (!isObject(raw) || typeof raw.id !== "string") return null;
  const kind = raw.kind === "actor" ? "actor" : "creature";
  const row = {
    id: raw.id,
    kind,
    groupId: typeof raw.groupId === "string" ? raw.groupId : "main",
    side: Object.hasOwn(SIDES, raw.side) ? raw.side : "enemies",
  };
  if (typeof raw.creatureId === "string") row.creatureId = raw.creatureId;
  if (typeof raw.blockId === "string") row.blockId = raw.blockId;
  if (typeof raw.actorId === "string") row.actorId = raw.actorId;
  if (raw.autoLoaded === true) row.autoLoaded = true;
  if (raw.unique === true) row.unique = true;
  // PR-35 (DDB counter with a shared-initiative switch): copies roll one each.
  if (raw.individualInitiative === true) row.individualInitiative = true;
  if (raw.companion === true) row.companion = true;
  row.count =
    kind === "actor" ? 1 : Math.max(1, Math.min(20, Number.isInteger(raw.count) ? raw.count : 1));
  if (kind === "actor" && !row.actorId) return null;
  if (kind === "creature" && !row.creatureId && !row.blockId) return null;
  return row;
}
function normalizeEncounter(raw) {
  if (!isObject(raw) || typeof raw.id !== "string") return null;
  const groups = list(raw.groups)
    .filter((g) => isObject(g) && typeof g.id === "string")
    .map((g) => ({
      id: g.id,
      name: String(g.name ?? "").slice(0, 60) || "Gruppo",
      staged: g.staged === true,
      ...(typeof g.activatedAt === "string" ? { activatedAt: g.activatedAt } : {}),
      ...(g.wasStaged === true ? { wasStaged: true } : {}),
    }));
  if (!groups.some((g) => g.id === "main"))
    groups.unshift({ id: "main", name: "Principale", staged: false });
  const rows = list(raw.rows)
    .map(normalizeRow)
    .filter(Boolean)
    .map((row) => (groups.some((g) => g.id === row.groupId) ? row : { ...row, groupId: "main" }));
  const party = isObject(raw.party) ? raw.party : {};
  const levels = list(party.levels).filter((n) => Number.isInteger(n) && n >= 1 && n <= 20);
  const notes = isObject(raw.notes) ? raw.notes : {};
  return {
    id: raw.id,
    name: String(raw.name ?? "").slice(0, 100) || "Incontro",
    revision: Number.isInteger(raw.revision) ? raw.revision : 1,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : now(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : now(),
    campaignId: typeof raw.campaignId === "string" ? raw.campaignId : "lanterns",
    party: {
      mode: ["campaign", "custom"].includes(party.mode) ? party.mode : "campaign",
      levels: levels.slice(0, 12),
    },
    groups,
    rows,
    notes: {
      summary: String(notes.summary ?? "").slice(0, 2000),
      readAloud: String(notes.readAloud ?? "").slice(0, 2000),
      treasure: String(notes.treasure ?? "").slice(0, 2000),
    },
    sceneId: typeof raw.sceneId === "string" ? raw.sceneId : null,
    handoff: isObject(raw.handoff)
      ? {
          sceneId: String(raw.handoff.sceneId ?? ""),
          at: typeof raw.handoff.at === "string" ? raw.handoff.at : now(),
          options: isObject(raw.handoff.options) ? copy(raw.handoff.options) : {},
          copies: list(raw.handoff.copies).filter(
            (c) => isObject(c) && typeof c.actorId === "string" && typeof c.rowId === "string",
          ),
          ...(raw.handoff.imported === true ? { imported: true } : {}),
          ...(raw.handoff.fromTokens === true ? { fromTokens: true } : {}),
          ...(typeof raw.handoff.parcelId === "string" ? { parcelId: raw.handoff.parcelId } : {}),
        }
      : null,
  };
}
export function normalizeSlice(value, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw Error(`Unknown encounter-builder version ${fromVersion}`);
  const source = isObject(value) ? value : {};
  return {
    encounters: list(source.encounters).map(normalizeEncounter).filter(Boolean),
    blocks: list(source.blocks).filter(
      (b) => isObject(b) && typeof b.id === "string" && isObject(b.name) && isObject(b.hp),
    ),
    history: list(source.history)
      .filter((h) => isObject(h) && typeof h.id === "string" && isObject(h.snapshot))
      .slice(-20),
    ...(list(source.individualRows).length
      ? {
          individualRows: [
            ...new Set(list(source.individualRows).filter((id) => typeof id === "string")),
          ],
        }
      : {}),
  };
}

// ---------------------------------------------------------------- stat blocks

// A block is an SRD creature (frozen catalogue data) or a custom copy saved in this
// area's collection (Clash! local collection, VTL-083). Both share the catalogue shape.
export function blockOf(slice, ref) {
  if (!ref) return null;
  if (ref.blockId) return slice?.blocks?.find((b) => b.id === ref.blockId) ?? null;
  if (ref.creatureId) {
    const entry = srd.getById(ref.creatureId);
    return entry?.kind === "creature" ? entry : null;
  }
  return null;
}
export const blockKey = (ref) => (ref?.blockId ? `block:${ref.blockId}` : `srd:${ref?.creatureId}`);
export const rowRef = (row) =>
  row.blockId ? { blockId: row.blockId } : row.creatureId ? { creatureId: row.creatureId } : null;
export const xpOfBlock = (block) => (block && Number.isFinite(block.xp) ? block.xp : null);
export function blockName(block, lang = "it") {
  return block?.name?.[lang] || block?.name?.it || block?.name?.en || "";
}

// ---------------------------------------------------------------- party and difficulty

export function campaignParty(state) {
  return partyMembers(state).map((actor) => ({
    id: actor.id,
    name: actor.name,
    level: Number.isInteger(actor.level) ? actor.level : 1,
  }));
}
// The party that sets the budget: characters placed in the encounter from the board
// (DDB-134 Party group), else the campaign's characters, else a typical party.
export function partyOf(state, encounter) {
  const fromRows = encounter.rows.filter(
    (row) => row.kind === "actor" && row.side === "party" && !row.companion,
  );
  if (fromRows.length)
    return {
      mode: "rows",
      members: fromRows
        .map((row) => state.actors[row.actorId])
        .filter(Boolean)
        .map((a) => ({ id: a.id, name: a.name, level: Number.isInteger(a.level) ? a.level : 1 })),
    };
  if (encounter.party.mode === "custom" && encounter.party.levels.length)
    return {
      mode: "custom",
      members: encounter.party.levels.map((level, i) => ({ id: `pc-${i}`, name: null, level })),
    };
  return { mode: "campaign", members: campaignParty(state) };
}
// A board row (DDB-134) whose creature has left the encounter's scene, or no longer
// exists: flagged in the list and left out of the total until the DM removes it.
export function actorRowGone(state, encounter, row) {
  if (row.kind !== "actor") return false;
  const actor = state?.actors?.[row.actorId];
  if (!isActorAvailable(actor)) return true;
  const sceneId = encounter.handoff?.sceneId ?? encounter.sceneId;
  const scene = sceneId ? state.scenes?.find((s) => s.id === sceneId) : null;
  return Boolean(scene) && !scene.tokens.some((t) => t.actorId === row.actorId);
}
// XP of every creature row, reinforcements included, 2024 rules: no multiplier.
export function encounterXp(slice, encounter, state) {
  let xp = 0;
  const unknown = [];
  const gone = [];
  for (const row of encounter.rows) {
    if (row.kind === "actor" && (row.side === "party" || row.companion)) continue;
    if (state && actorRowGone(state, encounter, row)) {
      gone.push(row.actorId);
      continue;
    }
    const block = blockOf(slice, rowRef(row));
    const value = xpOfBlock(block);
    if (value === null) {
      unknown.push(
        row.kind === "actor" ? (state?.actors?.[row.actorId]?.name ?? row.actorId) : row.id,
      );
      continue;
    }
    xp += value * (row.kind === "actor" ? 1 : row.unique ? 1 : row.count);
  }
  return { xp, unknown, gone };
}
// Band of an XP total against the party budget, copied from Kobold+ Fight Club's 2024
// strategy (CMP-106, src/js/strategy.js DnD2024.getDifficultyFromCr, 2025-04-10): below
// Low is Trivial, each SRD budget starts its band, and 1.5 × High starts Deadly. The SRD
// names Low/Moderate/High (IT Facile/Media/Difficile); Trivial and Deadly are Kobold+'s.
export const BANDS = Object.freeze(["trivial", "low", "moderate", "high", "deadly"]);
export const BAND_SOURCE = Object.freeze({
  kind: "market-pattern",
  id: "CMP-106",
  title: "Kobold+ Fight Club · D&D 2024 strategy (getDifficultyFromCr)",
});
export function bandFor(xp, budget) {
  if (!(xp > 0)) return "empty";
  if (xp < budget.low) return "trivial";
  if (xp < budget.moderate) return "low";
  if (xp < budget.high) return "moderate";
  if (xp < budget.high * 1.5) return "high";
  return "deadly";
}
export function rateEncounter(state, slice, encounter) {
  const party = partyOf(state, encounter);
  const levels = party.members.map((m) => m.level);
  const { xp, unknown, gone } = encounterXp(slice, encounter, state);
  if (!levels.length)
    return { party, xp, unknown, gone, budget: null, band: "no-party", source: RULES.budget };
  const budget = srd.encounterBudget(levels);
  return {
    party,
    xp,
    unknown,
    gone,
    budget,
    band: bandFor(xp, budget),
    inference: true,
    source: RULES.budget,
    bandSource: BAND_SOURCE,
  };
}
// Difficulty of one creature alone against the party (DDB-091 row badge, Kobold+ bands).
export function rateAlone(state, slice, encounter, block) {
  const party = partyOf(state, encounter);
  const levels = party.members.map((m) => m.level);
  if (!levels.length || !(xpOfBlock(block) > 0)) return null;
  return bandFor(block.xp, srd.encounterBudget(levels));
}

// ---------------------------------------------------------------- monster picker

export const CR_OPTIONS = Object.freeze(srd.XP_BY_CR.map((row) => row.cr));
export const emptyFilters = () => ({ q: "", crMin: "", crMax: "", type: "", size: "" });
export function pickerResults(slice, filters = emptyFilters(), lang = "it") {
  const needle = srd.normalizeSearchText(filters.q);
  const min = filters.crMin !== "" ? srd.crToNumber(filters.crMin) : null;
  const max = filters.crMax !== "" ? srd.crToNumber(filters.crMax) : null;
  const pool = [
    ...(slice?.blocks ?? []).map((block) => ({ ref: { blockId: block.id }, block, custom: true })),
    ...srd.CREATURES.map((block) => ({ ref: { creatureId: block.id }, block, custom: false })),
  ];
  return pool
    .filter(({ block }) => {
      if (needle) {
        const hay = srd.normalizeSearchText(`${block.name.it} ${block.name.en}`);
        if (!hay.includes(needle)) return false;
      }
      if (min !== null && !(block.crValue >= min)) return false;
      if (max !== null && !(block.crValue <= max)) return false;
      if (filters.type && block.type !== filters.type) return false;
      if (filters.size && !list(block.size).includes(filters.size)) return false;
      return true;
    })
    .sort(
      (a, b) =>
        Number(b.custom) - Number(a.custom) ||
        a.block.crValue - b.block.crValue ||
        blockName(a.block, lang).localeCompare(blockName(b.block, lang), lang),
    );
}
// Active filters as removable chips (DDB-092).
export function filterChips(filters, lang = "it") {
  const chips = [];
  const t = (it, en) => (lang === "it" ? it : en);
  if (filters.q) chips.push({ key: "q", text: `“${filters.q}”` });
  if (filters.crMin !== "")
    chips.push({ key: "crMin", text: `${t("GS", "CR")} ≥ ${filters.crMin}` });
  if (filters.crMax !== "")
    chips.push({ key: "crMax", text: `${t("GS", "CR")} ≤ ${filters.crMax}` });
  if (filters.type)
    chips.push({
      key: "type",
      text: srd.LABELS.creatureType[filters.type]?.[lang] ?? filters.type,
    });
  if (filters.size)
    chips.push({ key: "size", text: srd.LABELS.size[filters.size]?.[lang] ?? filters.size });
  return chips;
}
export const creatureTypesInCatalog = () => [...new Set(srd.CREATURES.map((c) => c.type))];
export const sizesInCatalog = () => [...new Set(srd.CREATURES.flatMap((c) => c.size))];

// ---------------------------------------------------------------- encounter edits

export function encounterById(slice, id) {
  const encounter = slice.encounters.find((e) => e.id === id);
  if (!encounter) throw encounterError("Incontro non trovato.", "Encounter not found.");
  return encounter;
}
function touch(encounter) {
  encounter.revision += 1;
  encounter.updatedAt = now();
}
export function createEncounter(
  slice,
  role,
  { name = "", id = newId("enc"), lang = "it", sceneId = null } = {},
) {
  requireDM(role);
  const title = String(name).trim() || (lang === "it" ? "Nuovo incontro" : "New encounter");
  const encounter = normalizeEncounter({
    id,
    name: title.slice(0, 100),
    groups: [{ id: "main", name: lang === "it" ? "Principale" : "Main", staged: false }],
    rows: [],
    sceneId,
  });
  slice.encounters.push(encounter);
  return encounter;
}
export function renameEncounter(slice, role, id, name) {
  requireDM(role);
  const encounter = encounterById(slice, id);
  const title = String(name ?? "").trim();
  if (!title || title.length > 100)
    throw encounterError(
      "Il nome deve avere da 1 a 100 caratteri.",
      "The name needs 1 to 100 characters.",
    );
  encounter.name = title;
  touch(encounter);
}
// DDB-093: "Add" again creates a separate row (its own initiative); +/- on a row changes
// the count of copies that share one initiative.
export function addCreature(
  slice,
  role,
  encounterId,
  ref,
  { groupId = "main", again = false } = {},
) {
  requireDM(role);
  const encounter = encounterById(slice, encounterId);
  const block = blockOf(slice, ref);
  if (!block) throw encounterError("Creatura non trovata.", "Creature not found.");
  if (!encounter.groups.some((g) => g.id === groupId))
    throw encounterError("Gruppo non trovato.", "Group not found.");
  const row = {
    id: newId("row"),
    kind: "creature",
    ...(ref.blockId ? { blockId: ref.blockId } : { creatureId: ref.creatureId }),
    count: 1,
    groupId,
    side: "enemies",
  };
  encounter.rows.push(row);
  touch(encounter);
  return { row, again };
}
export function changeCount(slice, role, encounterId, rowId, delta) {
  requireDM(role);
  const encounter = encounterById(slice, encounterId);
  const row = encounter.rows.find((r) => r.id === rowId);
  if (!row || row.kind !== "creature") throw encounterError("Riga non trovata.", "Row not found.");
  if (row.unique)
    throw encounterError(
      "Una creatura unica collegata ha una sola pedina.",
      "A unique linked creature has a single token.",
    );
  const next = row.count + delta;
  if (next < 1)
    throw encounterError(
      "Per togliere l’ultima copia usa Rimuovi.",
      "To take away the last copy use Remove.",
    );
  if (next > 20)
    throw encounterError("Al massimo 20 copie per riga.", "At most 20 copies per row.");
  row.count = next;
  touch(encounter);
  return row;
}
export function removeRow(slice, role, encounterId, rowId) {
  requireDM(role);
  const encounter = encounterById(slice, encounterId);
  if (!encounter.rows.some((r) => r.id === rowId))
    throw encounterError("Riga non trovata.", "Row not found.");
  encounter.rows = encounter.rows.filter((r) => r.id !== rowId);
  touch(encounter);
}
export function updateRow(slice, role, encounterId, rowId, patch) {
  requireDM(role);
  const encounter = encounterById(slice, encounterId);
  const row = encounter.rows.find((r) => r.id === rowId);
  if (!row) throw encounterError("Riga non trovata.", "Row not found.");
  if (patch.groupId !== undefined) {
    if (!encounter.groups.some((g) => g.id === patch.groupId))
      throw encounterError("Gruppo non trovato.", "Group not found.");
    row.groupId = patch.groupId;
  }
  if (patch.side !== undefined) {
    if (!Object.hasOwn(SIDES, patch.side) || (row.kind === "creature" && patch.side === "party"))
      throw encounterError("Lato non valido.", "Invalid side.");
    row.side = patch.side;
  }
  if (patch.unique !== undefined) {
    if (row.kind !== "creature") throw encounterError("Riga non valida.", "Invalid row.");
    if (patch.unique) {
      row.unique = true;
      row.count = 1;
    } else delete row.unique;
  }
  if (patch.individualInitiative !== undefined) {
    if (row.kind !== "creature") throw encounterError("Riga non valida.", "Invalid row.");
    if (patch.individualInitiative) row.individualInitiative = true;
    else delete row.individualInitiative;
  }
  if (patch.ref !== undefined) {
    // Linking a stat block to an existing NPC (Game Master's Grimoire, VTL-084).
    if (patch.ref === null) {
      delete row.creatureId;
      delete row.blockId;
      delete row.autoLoaded;
      if (row.kind === "creature") throw encounterError("Riga non valida.", "Invalid row.");
    } else {
      if (!blockOf(slice, patch.ref))
        throw encounterError("Blocco non trovato.", "Stat block not found.");
      delete row.creatureId;
      delete row.blockId;
      delete row.autoLoaded;
      Object.assign(
        row,
        patch.ref.blockId ? { blockId: patch.ref.blockId } : { creatureId: patch.ref.creatureId },
      );
    }
  }
  touch(encounter);
  return row;
}
export function addGroup(slice, role, encounterId, { name, staged = true, id = newId("grp") }) {
  requireDM(role);
  const encounter = encounterById(slice, encounterId);
  const title = String(name ?? "").trim();
  if (!title || title.length > 60)
    throw encounterError(
      "Il nome del gruppo deve avere da 1 a 60 caratteri.",
      "The group name needs 1 to 60 characters.",
    );
  if (encounter.groups.some((g) => g.name.toLowerCase() === title.toLowerCase()))
    throw encounterError(
      "Esiste già un gruppo con questo nome.",
      "A group with this name already exists.",
    );
  const group = { id, name: title, staged: Boolean(staged) };
  encounter.groups.push(group);
  touch(encounter);
  return group;
}
export function setGroupStaged(slice, role, encounterId, groupId, staged) {
  requireDM(role);
  const encounter = encounterById(slice, encounterId);
  const group = encounter.groups.find((g) => g.id === groupId);
  if (!group) throw encounterError("Gruppo non trovato.", "Group not found.");
  if (group.id === "main")
    throw encounterError(
      "Il gruppo principale entra subito in scena.",
      "The main group enters the scene at once.",
    );
  if (encounter.handoff?.copies.some((c) => c.groupId === groupId))
    throw encounterError(
      "Il gruppo è già sulla scena: usa Attiva al Tavolo.",
      "The group is already on the scene: use Activate at the Table.",
    );
  group.staged = Boolean(staged);
  touch(encounter);
}
export function removeGroup(slice, role, encounterId, groupId) {
  requireDM(role);
  const encounter = encounterById(slice, encounterId);
  if (groupId === "main")
    throw encounterError(
      "Il gruppo principale non si elimina.",
      "The main group cannot be deleted.",
    );
  if (!encounter.groups.some((g) => g.id === groupId))
    throw encounterError("Gruppo non trovato.", "Group not found.");
  if (encounter.handoff?.copies.some((c) => c.groupId === groupId))
    throw encounterError("Il gruppo è già sulla scena.", "The group is already on the scene.");
  for (const row of encounter.rows) if (row.groupId === groupId) row.groupId = "main";
  encounter.groups = encounter.groups.filter((g) => g.id !== groupId);
  touch(encounter);
}
export function setParty(slice, role, encounterId, { mode, levels }) {
  requireDM(role);
  const encounter = encounterById(slice, encounterId);
  if (!["campaign", "custom"].includes(mode))
    throw encounterError("Gruppo non valido.", "Invalid party.");
  if (mode === "custom") {
    const clean = list(levels);
    if (
      !clean.length ||
      clean.length > 12 ||
      !clean.every((n) => Number.isInteger(n) && n >= 1 && n <= 20)
    )
      throw encounterError(
        "Da 1 a 12 personaggi, livelli da 1 a 20.",
        "From 1 to 12 characters, levels 1 to 20.",
      );
    encounter.party = { mode, levels: [...clean] };
  } else encounter.party = { mode, levels: encounter.party.levels };
  touch(encounter);
}
export function setNotes(slice, role, encounterId, notes) {
  requireDM(role);
  const encounter = encounterById(slice, encounterId);
  for (const key of ["summary", "readAloud", "treasure"])
    if (notes[key] !== undefined) {
      const value = String(notes[key]);
      if (value.length > 2000)
        throw encounterError(
          "Massimo 2000 caratteri per nota.",
          "At most 2000 characters per note.",
        );
      encounter.notes[key] = value;
    }
  touch(encounter);
}

// ---------------------------------------------------------------- library

function snapshotOf(encounter) {
  const { handoff, sceneId, ...rest } = copy(encounter);
  return rest;
}
function pushHistory(slice, encounter, reason) {
  slice.history.push({
    id: newId("hist"),
    at: now(),
    reason,
    name: encounter.name,
    snapshot: snapshotOf(encounter),
  });
  if (slice.history.length > 20) slice.history.splice(0, slice.history.length - 20);
}
// DDB-096: the copy keeps name, party, monsters and notes; it is not on any scene.
function cloneForCopy(slice, encounter, name) {
  const groupIds = new Map(
    encounter.groups.map((g) => [g.id, g.id === "main" ? "main" : newId("grp")]),
  );
  const rows = [];
  for (const row of encounter.rows) {
    if (row.kind === "actor") {
      // A board creature with a known block becomes a creature row; characters and
      // unlinked NPCs are specific to their scene.
      if (row.side === "party" || (!row.creatureId && !row.blockId)) continue;
      rows.push({
        id: newId("row"),
        kind: "creature",
        ...(row.blockId ? { blockId: row.blockId } : { creatureId: row.creatureId }),
        count: 1,
        groupId: groupIds.get(row.groupId) ?? "main",
        side: row.side === "party" ? "allies" : row.side,
      });
      continue;
    }
    rows.push({ ...copy(row), id: newId("row"), groupId: groupIds.get(row.groupId) ?? "main" });
  }
  return normalizeEncounter({
    id: newId("enc"),
    name,
    party: copy(encounter.party),
    groups: encounter.groups.map((g) => ({
      id: groupIds.get(g.id),
      name: g.name,
      staged: g.staged || g.wasStaged === true,
    })),
    rows,
    notes: copy(encounter.notes),
  });
}
export function duplicateEncounter(slice, role, encounterId, lang = "it") {
  requireDM(role);
  const source = encounterById(slice, encounterId);
  const suffix = lang === "it" ? " (copia)" : " (copy)";
  const copyOf = cloneForCopy(slice, source, (source.name + suffix).slice(0, 100));
  slice.encounters.push(copyOf);
  return copyOf;
}
// DDB trash: clears the encounter, keeps the tokens on the scene (DDB-134).
export function deleteEncounter(slice, role, encounterId) {
  requireDM(role);
  const encounter = encounterById(slice, encounterId);
  pushHistory(slice, encounter, "deleted");
  slice.encounters = slice.encounters.filter((e) => e.id !== encounterId);
}
// Kobold+ history (CMP-111): a snapshot comes back as a new, unplaced encounter.
export function restoreFromHistory(slice, role, historyId, lang = "it") {
  requireDM(role);
  const entry = slice.history.find((h) => h.id === historyId);
  if (!entry)
    throw encounterError("Voce della cronologia non trovata.", "History entry not found.");
  const restored = cloneForCopy(
    slice,
    normalizeEncounter({ ...copy(entry.snapshot), id: "x" }),
    entry.name,
  );
  slice.encounters.push(restored);
  return restored;
}

// ---------------------------------------------------------------- status

export function copiesOf(encounter) {
  return encounter.handoff?.copies ?? [];
}
export function encounterActorIds(encounter) {
  return [
    ...copiesOf(encounter).map((c) => c.actorId),
    ...encounter.rows.filter((r) => r.kind === "actor").map((r) => r.actorId),
  ];
}
// Status from what is really on the scene: "prepared" needs at least one of the
// encounter's creatures in the scene's prepared initiative (or a staged group waiting on
// the map), not just a hand-off record.
export function encounterStatus(state, encounter) {
  if (!encounter.handoff) return "draft";
  const sceneId = encounter.handoff.sceneId;
  const scene = state.scenes.find((s) => s.id === sceneId);
  if (!scene) return "draft";
  const ids = encounterActorIds(encounter);
  if (
    state.combat?.active &&
    state.combat.sceneId === sceneId &&
    ids.some((id) => state.combat.order.includes(id))
  )
    return "running";
  const creatures = copiesOf(encounter)
    .map((c) => state.actors[c.actorId])
    .filter(Boolean);
  if (creatures.length && creatures.every((a) => a.hp <= 0)) return "defeated";
  const participants = new Set((scene.encounter?.participants ?? []).map((p) => p.actorId));
  const waiting = copiesOf(encounter).some(
    (c) =>
      encounter.groups.find((g) => g.id === c.groupId)?.staged &&
      scene.tokens.some((t) => t.actorId === c.actorId),
  );
  return ids.some((id) => participants.has(id)) || waiting ? "prepared" : "draft";
}
// PR-32 (Foundry: a scene's encounters in its Combat Tracker; D&D Beyond «Run encounter» on
// a map): one encounter object per scene editor. An encounter belongs to the scene it was
// prepared on (hand-off) or, still a draft, the scene it was created or linked for.
export const sceneOfEncounter = (encounter) =>
  encounter?.handoff?.sceneId || encounter?.sceneId || null;
/** The scene's encounters, the most recently saved first. */
export function sceneEncounters(slice, sceneId) {
  return (slice?.encounters ?? [])
    .filter((e) => sceneOfEncounter(e) === sceneId)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}
/** Links a draft encounter to a scene, so the scene editor shows it (not a copy). */
export function linkToScene(state, slice, encounterId, sceneId, role) {
  requireDM(role, state);
  sceneOf(state, sceneId);
  const encounter = encounterById(slice, encounterId);
  if (encounter.handoff && encounter.handoff.sceneId !== sceneId)
    throw encounterError(
      "Questo incontro è già preparato in un’altra scena: duplicalo per usarlo anche qui.",
      "This encounter is already prepared on another scene: duplicate it to use it here too.",
    );
  encounter.sceneId = sceneId;
  touch(encounter);
  return encounter;
}
// Scenes whose prepared encounter (Inc.2 Preparation) is not yet in the builder.
export function unlinkedSceneEncounters(state, slice) {
  const linked = new Set(slice.encounters.map((e) => e.handoff?.sceneId).filter(Boolean));
  return state.scenes.filter(
    (scene) => scene.encounter?.participants?.length && !linked.has(scene.id),
  );
}

// ---------------------------------------------------------------- name matching

const NAME_ADJECTIVES = new Set(
  ADJECTIVES.flatMap((a) => [a.it, a.en]).map((w) => srd.normalizeSearchText(w)),
);
// "Goblin guerriero 2", "Goblin A1", "Daring Goblin Warrior" → base name (VTL-083/084).
export function baseName(name) {
  let words = srd.normalizeSearchText(name).split(/\s+/).filter(Boolean);
  while (words.length > 1 && /^(\d+|[a-z]\d*|#\d+)$/.test(words.at(-1))) words.pop();
  while (words.length > 1 && NAME_ADJECTIVES.has(words.at(-1))) words.pop();
  while (words.length > 1 && NAME_ADJECTIVES.has(words[0])) words.shift();
  return words.join(" ");
}
export function matchBlockByName(slice, name) {
  const base = baseName(name);
  if (!base) return null;
  const same = (block) =>
    [block.name?.it, block.name?.en].some((n) => n && srd.normalizeSearchText(n) === base);
  const custom = (slice?.blocks ?? []).find(same);
  if (custom) return { blockId: custom.id };
  const official = srd.CREATURES.find(same);
  return official ? { creatureId: official.id } : null;
}
function actorBlockRef(slice, actor) {
  if (
    actor?.encounterBlock?.blockId &&
    slice.blocks.some((b) => b.id === actor.encounterBlock.blockId)
  )
    return { ref: { blockId: actor.encounterBlock.blockId }, auto: false };
  const known = actor?.encounterBlock?.creatureId ?? actor?.compendiumRef?.id;
  if (known && srd.getById(known)?.kind === "creature")
    return { ref: { creatureId: known }, auto: false };
  if (actor?.kind !== "npc") return null;
  const matched = matchBlockByName(slice, actor.name);
  return matched ? { ref: matched, auto: true } : null;
}

// ---------------------------------------------------------------- NPC statistics (PR-46, PR-43)

/**
 * PR-46 (Clash! loads a stat block from the token's name): the block a DM creature's name
 * matches while its statistics are still its own (not yet loaded from that block).
 */
export function blockOffer(state, slice, actorId) {
  const actor = state.actors?.[actorId];
  if (actor?.kind !== "npc" || actor.companion) return null;
  const ref = matchBlockByName(slice, actor.name);
  const block = blockOf(slice, ref);
  if (!block) return null;
  const loaded =
    (ref.creatureId &&
      (actor.compendiumRef?.id === ref.creatureId ||
        actor.encounterBlock?.creatureId === ref.creatureId)) ||
    (ref.blockId && actor.encounterBlock?.blockId === ref.blockId);
  return loaded ? null : { ref, block };
}
/** Applies the block's HP, AC, speed, abilities, defenses and melee attack to the NPC. */
export function loadBlockStats(state, slice, actorId, ref, role) {
  requireDM(role, state);
  const actor = state.actors?.[actorId];
  if (actor?.kind !== "npc")
    throw encounterError("Solo le creature del DM.", "Only the DM's creatures.");
  const block = blockOf(slice, ref);
  if (!block) throw encounterError("Blocco non trovato.", "Stat block not found.");
  const full = !(actor.hp < actor.maxHp);
  const speed = srd.feetToMeters(block.speed?.walk ?? 0);
  actor.maxHp = block.hp.average;
  actor.hp = full ? actor.maxHp : Math.min(actor.hp, actor.maxHp);
  actor.ac = block.ac;
  if (speed > 0) {
    if (!state.combat?.active || actor.movement === actor.speed) actor.movement = speed;
    actor.speed = speed;
  }
  Object.assign(actor, {
    abilities: { ...block.abilities },
    size: list(block.size)[0] ?? actor.size ?? "medium",
    conditionImmunities: [...list(block.conditionImmunities)],
    damageDefenses: {
      vulnerabilities: [...list(block.vulnerabilities)],
      resistances: [...list(block.resistances)],
      immunities: [...list(block.immunities)],
    },
    encounterBlock: {
      ...(actor.encounterBlock ?? {}),
      ...(block.custom
        ? { blockId: block.id, revision: block.revision }
        : { creatureId: block.id }),
    },
  });
  if (!block.custom) actor.compendiumRef = { id: block.id, revision: "5.2.1" };
  const melee = meleeProfileOf(block);
  if (melee) actor.combatProfile = { ...actor.combatProfile, meleeAttack: melee };
  return block;
}
/**
 * PR-43 (Fantasy Grounds' text parser, Shard): one pasted stat-block line becomes the
 * NPC's melee attack once the DM confirms the recognised values. A ranged-only line stays
 * text: the Table's creature attack is melee.
 */
export function attackFromLine(raw) {
  const text = String(raw ?? "").trim();
  const parsed = parseActionText(text);
  if (!parsed) return null;
  if (parsed.attack.type === "ranged") return { parsed, profile: null, ranged: true };
  const dice = parseDice(parsed.damage[0].dice);
  if (!dice || dice.count > 20 || ![4, 6, 8, 10, 12, 20].includes(dice.sides)) return null;
  const head = /^([^.:(]{1,40})[.:]/.exec(text)?.[1]?.trim();
  const name = head && !/attacco|attack|tiro/i.test(head) ? head : null;
  return {
    parsed,
    profile: {
      name: name ? { it: name, en: name } : L("Attacco", "Attack"),
      reachMeters: srd.feetToMeters(parsed.attack.reach ?? 5),
      attackBonus: parsed.attack.bonus,
      damageDice: [{ count: dice.count, sides: dice.sides }],
      damageModifier: dice.modifier,
      damageType: parsed.damage[0].type,
      source: {
        kind: "authored-demo",
        edition: "2024",
        revision: `line@${text.length}`,
        title: `Pasted stat block line · ${text.slice(0, 80)}`,
      },
    },
  };
}
export function setAttackFromLine(state, actorId, raw, role) {
  requireDM(role, state);
  const actor = state.actors?.[actorId];
  if (actor?.kind !== "npc")
    throw encounterError("Solo le creature del DM.", "Only the DM's creatures.");
  const result = attackFromLine(raw);
  if (!result)
    throw encounterError(
      "Non riconosco un attacco in questa riga: servono tiro per colpire e danni.",
      "No attack recognised in this line: it needs an attack bonus and damage.",
    );
  if (!result.profile)
    throw encounterError(
      "Riga di un attacco a distanza: al Tavolo le creature attaccano in mischia.",
      "A ranged attack line: at the Table creatures attack in melee.",
    );
  actor.combatProfile = { ...actor.combatProfile, meleeAttack: copy(result.profile) };
  return actor.combatProfile.meleeAttack;
}

// ---------------------------------------------------------------- from the board

function sceneOf(state, sceneId) {
  const scene = state.scenes.find((s) => s.id === sceneId);
  if (!scene) throw encounterError("Scena non trovata.", "Scene not found.");
  return scene;
}
// DDB-134 sides: characters and companions are the Party, NPCs follow their team.
export const actorSide = (actor) =>
  actor.kind === "character" || actor.companion ? "party" : sideOfTeam(npcTeam(actor));
function actorRowFor(slice, actor, groupId = "main") {
  const side = actorSide(actor);
  const row = { id: newId("row"), kind: "actor", actorId: actor.id, count: 1, groupId, side };
  if (actor.companion) row.companion = true;
  const link = actorBlockRef(slice, actor);
  if (link) {
    Object.assign(row, link.ref);
    if (link.auto) row.autoLoaded = true;
  }
  return row;
}
// Tokens "Add All Tokens" can take: available creatures the DM sees, on the map (a hidden
// token is not on the players' map: it joins once revealed, with another click).
export function boardActors(state, scene, role) {
  const visible = [],
    hidden = [];
  for (const token of scene.tokens) {
    const actor = state.actors[token.actorId];
    if (!isActorAvailable(actor) || !canViewActor(actor, role, state)) continue;
    (token.hidden ? hidden : visible).push(actor);
  }
  return { visible, hidden };
}
export const fromTokensEncounterOf = (slice, sceneId) =>
  slice.encounters.find((e) => e.handoff?.fromTokens && e.handoff.sceneId === sceneId) ?? null;
// DDB "Add All Tokens" (DDB-134): the map's one encounter takes every creature on the
// scene, sorted into Party (with companions), Enemies and NPC sides; creature blocks
// auto-load from the name (VTL-083). A second click updates the same encounter with the
// tokens that are new since; the creatures join the scene's prepared initiative (as the
// DDB combat tracker), except while a combat runs there (then only the list changes).
export function encounterFromTokens(state, slice, sceneId, role, lang = "it") {
  requireDM(role, state);
  const scene = sceneOf(state, sceneId);
  const { visible, hidden } = boardActors(state, scene, role);
  if (!visible.length)
    throw encounterError("Nessuna pedina visibile sulla scena.", "No visible tokens on the scene.");
  let encounter = fromTokensEncounterOf(slice, sceneId);
  const created = !encounter;
  if (created) {
    encounter = normalizeEncounter({
      id: newId("enc"),
      name: (lang === "it" ? `Incontro: ${scene.name}` : `Encounter: ${scene.name}`).slice(0, 100),
      rows: [],
      groups: [{ id: "main", name: lang === "it" ? "Principale" : "Main", staged: false }],
    });
    encounter.sceneId = sceneId;
    encounter.handoff = { sceneId, at: now(), options: {}, copies: [], fromTokens: true };
    slice.encounters.push(encounter);
  }
  const listed = new Set(encounterActorIds(encounter));
  const added = visible.filter((actor) => !listed.has(actor.id));
  for (const actor of added) encounter.rows.push(actorRowFor(slice, actor));
  const running = Boolean(state.combat?.active && state.combat.sceneId === sceneId);
  const joined = running ? [] : prepareActorRows(state, slice, encounter, scene);
  if (!created && !added.length && !joined.length)
    throw encounterError(
      "Tutte le pedine visibili sono già nell’incontro.",
      "Every visible token is already in the encounter.",
    );
  touch(encounter);
  return { encounter, created, added, hidden, joined, running };
}
// The encounter's board rows (and the party on the map) join the scene's prepared
// initiative with Preparation's participant shape; recorded rolls are never touched.
function prepareActorRows(state, slice, encounter, scene) {
  scene.encounter ||= { name: encounter.name, participants: [] };
  if (!scene.encounter.name) scene.encounter.name = encounter.name;
  const participants = scene.encounter.participants;
  const joined = [];
  const join = (actorId, bonus) => {
    if (participants.some((p) => p.actorId === actorId)) return;
    participants.push({ actorId, natural: null, bonus, mode: "physical" });
    joined.push(actorId);
  };
  for (const row of encounter.rows.filter((r) => r.kind === "actor")) {
    const token = scene.tokens.find((t) => t.actorId === row.actorId);
    if (!token || token.hidden || !isActorAvailable(state.actors[row.actorId])) continue;
    if (encounter.groups.find((g) => g.id === row.groupId)?.staged) continue;
    join(row.actorId, blockOf(slice, rowRef(row))?.initiative?.bonus ?? 0);
  }
  for (const actor of partyMembers(state))
    if (scene.tokens.some((t) => t.actorId === actor.id && !t.hidden)) join(actor.id, 0);
  sortParticipants(state, participants);
  return joined;
}
// Reopens a scene's prepared encounter (increment 2) in the builder. The scene, its
// participants and their recorded rolls are untouched: they stay the source of truth.
export function importSceneEncounter(state, slice, sceneId, role) {
  requireDM(role, state);
  const scene = sceneOf(state, sceneId);
  const participants = scene.encounter?.participants ?? [];
  if (!participants.length)
    throw encounterError(
      "La scena non ha un incontro preparato.",
      "The scene has no prepared encounter.",
    );
  const rows = participants
    .map((p) => state.actors[p.actorId])
    .filter((actor) => isActorAvailable(actor))
    .map((actor) => actorRowFor(slice, actor));
  const encounter = normalizeEncounter({
    id: newId("enc"),
    name: scene.encounter.name || scene.name,
    rows,
  });
  encounter.sceneId = sceneId;
  encounter.handoff = { sceneId, at: now(), options: {}, copies: [], imported: true };
  slice.encounters.push(encounter);
  return encounter;
}

// ---------------------------------------------------------------- hand-off planning

// Names of creatures that have a token on some scene (a restarted encounter's removed
// copies free their numbers again); hidden names count by their real name.
function usedNames(state, tokenMenuSlice) {
  const placed = new Set(state.scenes.flatMap((s) => s.tokens.map((t) => t.actorId)));
  const names = new Set();
  for (const actor of Object.values(state.actors)) {
    if (!placed.has(actor.id)) continue;
    names.add(actor.name);
    const record = tokenMenuSlice?.names?.[actor.id];
    if (record?.hidden && record.trueName) names.add(record.trueName);
  }
  return names;
}
function nextName(base, used, numbering, lang, startAt = 1) {
  if (numbering === "adjectives") {
    for (const adjective of ADJECTIVES) {
      const name = lang === "it" ? `${base} ${adjective.it}` : `${adjective.en} ${base}`;
      if (!used.has(name)) return name;
    }
  }
  for (let n = startAt; n < 1000; n++) {
    const name = `${base} ${n}`;
    if (!used.has(name)) return name;
  }
  return `${base} ${Date.now()}`;
}
function liveCopies(state, encounter, sceneId) {
  const scene = state.scenes.find((s) => s.id === sceneId);
  return copiesOf(encounter).filter(
    (c) => state.actors[c.actorId] && scene?.tokens.some((t) => t.actorId === c.actorId),
  );
}
// Which copies a hand-off would create or remove, so physical HP dice can be asked first.
export function planHandOff(state, slice, encounterId, sceneId) {
  const encounter = encounterById(slice, encounterId);
  sceneOf(state, sceneId);
  if (encounter.handoff && encounter.handoff.sceneId !== sceneId)
    throw encounterError(
      "L’incontro è già preparato in un’altra scena: duplicalo o riavvialo.",
      "The encounter is already prepared on another scene: duplicate or restart it.",
    );
  const live = encounter.handoff ? liveCopies(state, encounter, sceneId) : [];
  const create = [],
    remove = [];
  for (const row of encounter.rows.filter((r) => r.kind === "creature")) {
    const block = blockOf(slice, rowRef(row));
    if (!block) continue;
    const have = live.filter((c) => c.rowId === row.id);
    const want = row.unique ? 1 : row.count;
    const dice = parseDice(block.hp.formula);
    for (let i = have.length; i < want; i++)
      create.push({
        key: `${row.id}:${i}`,
        rowId: row.id,
        index: i,
        block,
        dice,
        groupId: row.groupId,
      });
    for (const extra of have.slice(want)) remove.push(extra);
  }
  for (const c of live) if (!encounter.rows.some((r) => r.id === c.rowId)) remove.push(c);
  return { encounter, create, remove, live };
}

// Width of a token's name label on the Table (13 px sans-serif under a 28 px disc).
export const labelWidth = (name) => Math.max(56, Math.min(260, String(name ?? "").length * 7 + 8));
const HIDDEN_ALIAS_SAMPLE = "Creatura sconosciuta 00";
// Lines a token should not stand on: the scene's walls (spatial editor) and, when the
// scene shows Preparation's courtyard drawing (no background image), its drawn walls.
export function wallSegments(scene) {
  const segments = list(scene.walls)
    .filter((w) => w?.a && w?.b)
    .map((w) => [w.a, w.b]);
  const image = typeof scene.background === "string" && scene.background;
  if (!image && (scene.template || "courtyard") === "courtyard") {
    const sx = (Number(scene.width) || 1000) / 1000,
      sy = (Number(scene.height) || 650) / 650;
    const path = (...pts) =>
      pts.slice(1).map((pt, i) => [
        { x: pts[i][0] * sx, y: pts[i][1] * sy },
        { x: pt[0] * sx, y: pt[1] * sy },
      ]);
    segments.push(
      ...path([90, 70], [910, 70], [910, 580], [90, 580], [90, 70]),
      ...path([340, 70], [340, 200], [90, 200]),
      ...path([660, 580], [660, 450], [910, 450]),
    );
  }
  return segments;
}
function segmentDistance(p, [a, b]) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
// True when the path a→b crosses the wall c–d (the token would land in another room).
function crossesWall(a, b, [c, d]) {
  const side = (p, q, r) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
  return side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0;
}
// Grid-centre cells scanned outward from an anchor, off the walls and in the anchor's room. First pass: tokens
// whose labels would touch (same band of rows, closer than half their label widths) are
// spread apart; a crowded scene falls back to adjacent cells, then ignores the walls.
function freeCell(scene, anchor, taken, name = "") {
  const size = Number(scene.gridSize) || 50;
  const ox = Number(scene.gridOffsetX) || 0,
    oy = Number(scene.gridOffsetY) || 0;
  const cx = Math.round((anchor.x - ox - size / 2) / size),
    cy = Math.round((anchor.y - oy - size / 2) / size);
  const walls = wallSegments(scene);
  const w = labelWidth(name);
  const clear = (x, y, pass) => {
    if (
      pass < 2 &&
      walls.some(
        (s) => segmentDistance({ x, y }, s) < size * 0.75 || crossesWall(anchor, { x, y }, s),
      )
    )
      return false;
    return !taken.some((p) => {
      const dx = Math.abs(p.x - x),
        dy = Math.abs(p.y - y);
      if (pass > 0) return Math.hypot(dx, dy) < size * 0.9;
      return dy < size * 1.9 && dx < Math.max(size * 1.9, (w + (p.w ?? 60)) / 2 + 8);
    });
  };
  for (const pass of [0, 1, 2])
    for (let radius = 0; radius < 40; radius++)
      for (let dy = -radius; dy <= radius; dy++)
        for (let dx = -radius; dx <= radius; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
          const x = ox + size / 2 + (cx + dx) * size,
            y = oy + size / 2 + (cy + dy) * size;
          if (x < 20 || y < 20 || x > scene.width - 20 || y > scene.height - 20) continue;
          if (clear(x, y, pass)) return { x, y, w };
        }
  return {
    x: Math.min(scene.width - 20, Math.max(20, anchor.x)),
    y: Math.min(scene.height - 20, Math.max(20, anchor.y)),
    w,
  };
}
const anchorFor = (scene, staged) =>
  staged
    ? { x: scene.width * 0.8, y: scene.height * 0.8 }
    : { x: scene.width * 0.74, y: scene.height * 0.36 };
const takenOf = (state, scene) =>
  scene.tokens.map((t) => ({ x: t.x, y: t.y, w: labelWidth(state.actors[t.actorId]?.name) }));

// Melee attack for the combat engine: the SRD profile, or the first melee attack of a
// custom block that the DM confirmed from its text (never inferred silently).
export function meleeProfileOf(block) {
  if (!block) return null;
  if (!block.custom) return srdMeleeProfile(block);
  const action = list(block.actions).find(
    (a) =>
      a.kind === "attack" &&
      (a.confirmed || !a.textEdited) &&
      ["melee", "melee-or-ranged"].includes(a.attack?.type) &&
      a.damage?.length &&
      parseDice(a.damage[0].dice),
  );
  if (!action) return null;
  const dice = parseDice(action.damage[0].dice);
  if (dice.count > 20 || ![4, 6, 8, 10, 12, 20].includes(dice.sides)) return null;
  return {
    name: copy(action.name),
    reachMeters: srd.feetToMeters(action.attack.reach ?? 5),
    attackBonus: action.attack.bonus,
    damageDice: [{ count: dice.count, sides: dice.sides }],
    damageModifier: dice.modifier,
    damageType: action.damage[0].type,
    source: {
      kind: "authored-demo",
      edition: "2024",
      revision: `${block.id}@${block.revision}`,
      title: `Custom stat block · ${block.name.en || block.name.it} · ${action.name.en || action.name.it}`,
    },
  };
}
// Monster HP: the block's average, or its formula rolled with digital dice or entered
// from physical dice (SRD: one or the other, never both).
function rollHp(block, hpMode, physicalFaces) {
  if (hpMode === "average") return { hp: block.hp.average, hpRoll: null };
  const dice = parseDice(block.hp.formula);
  if (!dice) throw encounterError("Formula dei PF non valida.", "Invalid HP formula.");
  const faces =
    hpMode === "digital"
      ? Array.from({ length: dice.count }, () => rollDie(dice.sides))
      : physicalFaces;
  const hp = hpFromFaces(block, faces);
  return {
    hp,
    hpRoll: {
      formula: block.hp.formula,
      faces: [...faces],
      modifier: dice.modifier,
      total: hp,
      mode: hpMode,
      source: copy(RULES.monsterHp),
    },
  };
}
export function hpFromFaces(block, faces) {
  const dice = parseDice(block.hp.formula);
  if (!dice) throw encounterError("Formula dei PF non valida.", "Invalid HP formula.");
  if (
    !Array.isArray(faces) ||
    faces.length !== dice.count ||
    faces.some((f) => !Number.isInteger(f) || f < 1 || f > dice.sides)
  )
    throw encounterError(
      `Inserisci ${dice.count} facce di d${dice.sides} (da 1 a ${dice.sides}).`,
      `Enter ${dice.count} d${dice.sides} faces (1 to ${dice.sides}).`,
    );
  return Math.max(1, faces.reduce((a, b) => a + b, 0) + dice.modifier);
}

function buildCreature(
  state,
  block,
  { id, name, hp, team, hpRoll, encounterId, rowId, unique, role },
) {
  const actor = createSceneNPC(
    state,
    { id, name, hp, ac: block.ac, speed: srd.feetToMeters(block.speed?.walk ?? 0), team },
    role,
  );
  Object.assign(actor, {
    abilities: { ...block.abilities },
    className: { it: block.name.it || block.name.en, en: block.name.en || block.name.it },
    size: list(block.size)[0] ?? "medium",
    level: 1,
    conditionImmunities: [...list(block.conditionImmunities)],
    conditionImmunitiesSource: copy(
      block.custom
        ? { kind: "authored-demo", edition: "2024", revision: `${block.id}@${block.revision}` }
        : block.source,
    ),
    // Damage defenses travel with the NPC as its block states them; the Table's combat
    // engine does not apply them, so the DM reads them in the drawer's stat block.
    damageDefenses: {
      vulnerabilities: [...list(block.vulnerabilities)],
      resistances: [...list(block.resistances)],
      immunities: [...list(block.immunities)],
    },
    vitalityPolicy: { zeroHp: "death", source: copy(RULES.monsterDeath) },
    provenance: block.custom
      ? {
          kind: "authored-demo",
          edition: "2024",
          revision: `${block.id}@${block.revision}`,
          basedOn: block.baseId ?? null,
        }
      : {
          kind: "srd",
          edition: "2024",
          revision: "5.2.1",
          entryId: block.id,
          sha256: block.source.sha256,
          pages: [...block.source.pages],
        },
    encounterBlock: {
      ...(block.custom
        ? { blockId: block.id, revision: block.revision }
        : { creatureId: block.id }),
      encounterId,
      rowId,
      ...(unique ? { unique: true } : {}),
    },
    ...(hpRoll ? { hpRoll } : {}),
  });
  if (!block.custom) actor.compendiumRef = { id: block.id, revision: "5.2.1" };
  const melee = meleeProfileOf(block);
  if (melee) actor.combatProfile = { ...actor.combatProfile, meleeAttack: melee };
  return actor;
}

// Materialises the encounter on a scene with Preparation's own commands: NPCs, tokens
// (staged groups hidden), prepared participants (existing rows and rolls kept).
export function handOff(state, slice, encounterId, options, role, deps = {}) {
  requireDM(role, state);
  const {
    sceneId,
    numbering = "numbers",
    hideNames = false,
    hpMode = "average",
    hpFaces = {},
    lang = "it",
  } = options;
  const scene = sceneOf(state, sceneId);
  if (state.combat?.active && state.combat.sceneId === sceneId)
    throw encounterError(
      "C’è un combattimento in corso su questa scena: fai entrare le creature con un gruppo in attesa.",
      "Combat is running on this scene: bring creatures in with a staged group.",
    );
  if (
    !["numbers", "adjectives"].includes(numbering) ||
    !["average", "digital", "physical"].includes(hpMode)
  )
    throw encounterError("Opzioni non valide.", "Invalid options.");
  const plan = planHandOff(state, slice, encounterId, sceneId);
  const { encounter } = plan;
  const tokenMenu = hideNames ? deps.tokenMenuSlice : null;
  if (hideNames && !tokenMenu)
    throw encounterError(
      "Il menu della pedina non è disponibile: i nomi non si possono nascondere ora.",
      "The token menu is unavailable: names cannot be hidden now.",
    );
  const handoff = encounter.handoff ?? { sceneId, at: now(), options: {}, copies: [] };
  handoff.copies = plan.live.filter((c) => !plan.remove.includes(c));
  for (const gone of plan.remove) {
    const token = scene.tokens.find((t) => t.actorId === gone.actorId);
    if (token) removeSceneToken(state, sceneId, token.id, role);
    // A copy taken off the map gives its hidden-name alias number back (token menu, B12).
    if (deps.tokenMenuSlice?.names?.[gone.actorId]?.hidden && state.actors[gone.actorId])
      setNameHidden(state, deps.tokenMenuSlice, gone.actorId, false, role, lang);
  }
  scene.encounter ||= { name: encounter.name, participants: [] };
  if (!scene.encounter.name) scene.encounter.name = encounter.name;
  const participants = scene.encounter.participants;
  const addParticipant = (actorId, bonus) => {
    if (!participants.some((p) => p.actorId === actorId))
      participants.push({ actorId, natural: null, bonus, mode: "physical" });
  };
  const used = usedNames(state, deps.tokenMenuSlice);
  const taken = takenOf(state, scene);
  const created = [];
  for (const item of plan.create) {
    const row = encounter.rows.find((r) => r.id === item.rowId);
    const group = encounter.groups.find((g) => g.id === row.groupId);
    const staged = Boolean(group?.staged);
    const block = item.block;
    const base = blockName(block, lang);
    // Roll20 linked default token (R20-101): a unique creature reuses its actor, across
    // encounters too (PR-45). One already on this scene keeps its token: never a copy.
    const linked = row.unique
      ? Object.values(state.actors).filter(
          (a) =>
            a.encounterBlock?.unique &&
            blockKey(a.encounterBlock) === blockKey(rowRef(row)) &&
            isActorAvailable(a) &&
            !handoff.copies.some((c) => c.actorId === a.id),
        )
      : [];
    let actor =
      linked.find((a) => scene.tokens.some((t) => t.actorId === a.id)) ?? linked[0] ?? null;
    const onScene = actor ? scene.tokens.find((t) => t.actorId === actor.id) : null;
    let hp = block.hp.average,
      hpRoll = null;
    if (!actor) {
      ({ hp, hpRoll } = rollHp(block, hpMode, hpFaces[item.key]));
      const name = row.unique ? base : nextName(base, used, numbering, lang);
      used.add(name);
      actor = buildCreature(state, block, {
        id: newId("npc"),
        name,
        hp,
        team: SIDES[row.side]?.team ?? "watch",
        hpRoll,
        encounterId: encounter.id,
        rowId: row.id,
        unique: row.unique,
        role,
      });
    }
    const label = tokenMenu ? HIDDEN_ALIAS_SAMPLE : actor.name;
    const tokenId = onScene?.id ?? newId("token");
    if (!onScene) {
      const point = freeCell(scene, anchorFor(scene, staged), taken, label);
      taken.push(point);
      placeSceneToken(state, sceneId, actor.id, point, tokenId, role);
    }
    const token = scene.tokens.find((t) => t.id === tokenId);
    if (staged && !onScene) token.hidden = true;
    if (tokenMenu && !tokenMenu.names?.[actor.id]?.hidden)
      setNameHidden(state, tokenMenu, actor.id, true, role, lang);
    if (!staged)
      addParticipant(
        actor.id,
        block.initiative?.bonus ?? abilityModifier(block.abilities?.dex ?? 10),
      );
    const entry = {
      rowId: row.id,
      index: item.index,
      actorId: actor.id,
      tokenId,
      groupId: row.groupId,
      hp: actor.maxHp,
    };
    if (hpRoll) entry.hpRoll = hpRoll;
    handoff.copies.push(entry);
    created.push(entry);
  }
  // Existing actors listed in the encounter (board or increment-2 import) keep their
  // token and rolls; party characters on the scene join the prepared participants.
  for (const row of encounter.rows.filter((r) => r.kind === "actor")) {
    const actor = state.actors[row.actorId];
    if (!isActorAvailable(actor) || scene.tokens.some((t) => t.actorId === actor.id)) continue;
    if (!canViewActor(actor, role, state) || !isCampaignActor(actor, state.campaign?.id)) continue;
    const point = freeCell(scene, anchorFor(scene, false), taken, actor.name);
    taken.push(point);
    placeSceneToken(state, sceneId, actor.id, point, newId("token"), role);
  }
  prepareActorRows(state, slice, encounter, scene);
  handoff.sceneId = sceneId;
  handoff.at = now();
  handoff.options = { numbering, hideNames: Boolean(hideNames), hpMode };
  encounter.handoff = handoff;
  encounter.sceneId = sceneId;
  touch(encounter);
  return { created, removed: plan.remove, scene };
}

// What a restart will reset and create, so physical HP dice can be asked first: every
// copy still on the map comes back in place (keyed "reset:<actor>"), a unique linked
// creature keeps its state, and missing copies are created as in a hand-off.
export function planRestart(state, slice, encounterId) {
  const encounter = encounterById(slice, encounterId);
  if (!encounter.handoff)
    throw encounterError(
      "L’incontro non è ancora su una scena.",
      "The encounter is not on a scene yet.",
    );
  const sceneId = encounter.handoff.sceneId;
  const scene = sceneOf(state, sceneId);
  const reset = [];
  for (const c of copiesOf(encounter)) {
    const row = encounter.rows.find((r) => r.id === c.rowId);
    const block = row && blockOf(slice, rowRef(row));
    if (!block || row.unique || !state.actors[c.actorId]) continue;
    if (!scene.tokens.some((t) => t.actorId === c.actorId)) continue;
    reset.push({
      key: `reset:${c.actorId}`,
      actorId: c.actorId,
      rowId: row.id,
      block,
      dice: parseDice(block.hp.formula),
    });
  }
  const { create } = planHandOff(state, slice, encounterId, sceneId);
  return { encounter, reset, create };
}
// DDB Restart: the same encounter runs again on its scene. Each copy on the map comes back
// to a fresh stat block in place (same NPC, token and name, so hidden-name aliases and
// board rows stay valid; HP average or rolled again), a unique linked creature keeps its
// state (Roll20 linked token), staged groups wait again, and the creatures' prepared
// rolls are cleared (the ledger keeps every recorded result). Characters keep their
// rolls unless the DM clears them too.
export function restartEncounter(state, slice, encounterId, options, role, deps = {}) {
  requireDM(role, state);
  const { encounter, reset } = planRestart(state, slice, encounterId);
  if (encounterStatus(state, encounter) === "running")
    throw encounterError(
      "Concludi prima il combattimento in corso.",
      "End the running combat first.",
    );
  const merged = { ...encounter.handoff.options, ...options };
  const hpMode = merged.hpMode ?? "average";
  if (!["average", "digital", "physical"].includes(hpMode))
    throw encounterError("Opzioni non valide.", "Invalid options.");
  const sceneId = encounter.handoff.sceneId;
  const scene = sceneOf(state, sceneId);
  pushHistory(slice, encounter, "restarted");
  for (const group of encounter.groups)
    if (group.wasStaged) {
      group.staged = true;
      delete group.wasStaged;
      delete group.activatedAt;
    }
  const resetIds = new Set(reset.map((item) => item.actorId));
  const kept = [];
  for (const c of copiesOf(encounter)) {
    const row = encounter.rows.find((r) => r.id === c.rowId);
    const token = scene.tokens.find((t) => t.actorId === c.actorId);
    if (!row || !token || !state.actors[c.actorId]) continue;
    const entry = { ...c, tokenId: token.id };
    if (resetIds.has(c.actorId)) {
      const item = reset.find((r) => r.actorId === c.actorId);
      const { hp, hpRoll } = rollHp(item.block, hpMode, merged.hpFaces?.[item.key]);
      const old = state.actors[c.actorId];
      delete state.actors[c.actorId];
      buildCreature(state, item.block, {
        id: c.actorId,
        name: old.name,
        hp,
        team: old.combatProfile?.team ?? SIDES[row.side]?.team ?? "watch",
        hpRoll,
        encounterId: encounter.id,
        rowId: row.id,
        role,
      });
      entry.hp = hp;
      delete entry.hpRoll;
      if (hpRoll) entry.hpRoll = hpRoll;
    }
    if (encounter.groups.find((g) => g.id === row.groupId)?.staged) token.hidden = true;
    else delete token.hidden;
    kept.push(entry);
  }
  encounter.handoff.copies = kept;
  // Monsters roll again; characters (and companions) keep their prepared roll unless asked.
  const party = new Set(partyMembers(state).map((a) => a.id));
  const creatures = new Set([
    ...kept.map((c) => c.actorId),
    ...encounter.rows.filter((r) => r.kind === "actor" && r.side !== "party").map((r) => r.actorId),
  ]);
  const stagedIds = new Set(
    kept
      .filter((c) => encounter.groups.find((g) => g.id === c.groupId)?.staged)
      .map((c) => c.actorId),
  );
  if (scene.encounter) {
    scene.encounter.participants = scene.encounter.participants.filter(
      (p) => !stagedIds.has(p.actorId),
    );
    for (const p of scene.encounter.participants) {
      const clear =
        creatures.has(p.actorId) || (merged.clearPartyRolls === true && party.has(p.actorId));
      if (!clear) continue;
      p.natural = null;
      p.mode = "physical";
      delete p.rollId;
    }
  }
  const { clearPartyRolls, ...handOffOptions } = merged;
  return {
    ...handOff(state, slice, encounterId, { ...handOffOptions, sceneId }, role, deps),
    reset: [...resetIds],
  };
}

// ---------------------------------------------------------------- initiative

const totalOf = (p) =>
  Number.isInteger(p?.natural) && Number.isInteger(p?.bonus) ? p.natural + p.bonus : null;
// Copies of one encounter row share one Initiative roll (SRD: a group of identical
// creatures); a unique creature, a character or a board NPC rolls alone.
export function initiativeKeyOf(state, actorId) {
  const link = state.actors[actorId]?.encounterBlock;
  // PR-35: a row switched to «Iniziativa individuale» gives each copy its own roll; TV-52:
  // so do copies placed without an encounter row (`individualRows`, the start dialog).
  const row = link?.rowId
    ? list(state.ext?.[ID]?.encounters)
        .find((e) => e.id === link.encounterId)
        ?.rows?.find((r) => r.id === link.rowId)
    : null;
  return copyKeyOf(state, actorId) &&
    !row?.individualInitiative &&
    !list(state.ext?.[ID]?.individualRows).includes(link.rowId)
    ? link.rowId
    : `actor:${actorId}`;
}
/** The shared-roll key a copy could use (its encounter row), whatever the DM chose. */
export function copyKeyOf(state, actorId) {
  const link = state.actors?.[actorId]?.encounterBlock;
  return link?.rowId && !link.unique ? link.rowId : null;
}
/**
 * TV-52 (Improved Initiative «group initiative», DDB shared copies; SRD 5.2.1 EN 13 / IT 14):
 * the copies of `rowId` share one Initiative roll (`shared`) or each rolls its own. An
 * encounter row keeps the builder's own switch (PR-35); copies without one are recorded here.
 */
export function setSharedInitiative(state, rowId, shared, role) {
  requireDM(role, state);
  if (typeof rowId !== "string" || !rowId)
    throw encounterError("Gruppo di creature non trovato.", "Creature group not found.");
  state.ext ??= {};
  const slice = (state.ext[ID] ??= { encounters: [], blocks: [], history: [] });
  let found = false;
  for (const encounter of list(slice.encounters))
    for (const row of list(encounter.rows))
      if (row.id === rowId) {
        found = true;
        if (shared) delete row.individualInitiative;
        else row.individualInitiative = true;
      }
  const rest = list(slice.individualRows).filter((id) => id !== rowId);
  if (!shared && !found) rest.push(rowId);
  if (rest.length) slice.individualRows = rest;
  else delete slice.individualRows;
  return shared;
}
// The scene's prepared order by Initiative total, highest first, unrolled last. The sort
// is stable and keeps each shared-roll group together, so a tie stays in the order the DM
// left it (the GM decides ties, SRD EN 13 / IT 14), as Preparation's "Sort by initiative".
export function sortParticipants(state, participants) {
  const first = new Map();
  participants.forEach((p, i) => {
    const key = initiativeKeyOf(state, p.actorId);
    if (!first.has(key)) first.set(key, i);
  });
  const ranked = participants.map((p, i) => ({
    p,
    i,
    group: first.get(initiativeKeyOf(state, p.actorId)),
    total: totalOf(p) ?? -Infinity,
  }));
  ranked.sort((a, b) => b.total - a.total || a.group - b.group || a.i - b.i);
  participants.splice(0, participants.length, ...ranked.map((r) => r.p));
  return participants;
}
export function orderIsSorted(state, participants) {
  const sorted = sortParticipants(state, [...participants]);
  return sorted.every((p, i) => p === participants[i]);
}
const encounterScene = (state, encounter) =>
  state.scenes.find((s) => s.id === (encounter.handoff?.sceneId ?? encounter.sceneId)) ?? null;
// The scene's prepared initiative in order, one entry per shared-roll group: what
// "Start combat…" will start (every creature prepared on the scene, this encounter's own
// marked). Each copy group carries its row and stat block.
export function initiativeGroups(state, slice, encounter) {
  if (!encounter.handoff) return [];
  const scene = encounterScene(state, encounter);
  const participants = scene?.encounter?.participants ?? [];
  // The party plays every encounter on the scene; other creatures belong to theirs.
  const mine = new Set([
    ...encounterActorIds(encounter),
    ...partyMembers(state).map((actor) => actor.id),
  ]);
  const groups = [];
  const byKey = new Map();
  for (const p of participants) {
    const key = initiativeKeyOf(state, p.actorId);
    let group = byKey.get(key);
    if (!group) {
      const link = state.actors[p.actorId]?.encounterBlock;
      const copyGroup = !key.startsWith("actor:");
      group = {
        key,
        ...(copyGroup ? { rowId: key } : {}),
        actorIds: [],
        block: copyGroup ? blockOf(slice, link) : null,
        rows: [],
        mine: false,
      };
      byKey.set(key, group);
      groups.push(group);
    }
    group.actorIds.push(p.actorId);
    group.rows.push(p);
    if (mine.has(p.actorId)) group.mine = true;
  }
  for (const group of groups) group.total = totalOf(group.rows[0]);
  return groups;
}
// Earlier/Later for a tie only (Preparation's controls): the sort decides everything else.
export function moveTiedGroup(state, slice, encounterId, groupKey, delta, role) {
  requireDM(role, state);
  const encounter = encounterById(slice, encounterId);
  const groups = initiativeGroups(state, slice, encounter);
  const index = groups.findIndex((g) => g.key === groupKey);
  const other = groups[index + (delta < 0 ? -1 : 1)];
  if (index < 0 || !other || groups[index].total === null || other.total !== groups[index].total)
    throw encounterError(
      "Si sposta solo a parità di totale: decide il DM.",
      "Only a tie can be reordered: the DM decides.",
    );
  const target = index + (delta < 0 ? -1 : 1);
  [groups[index], groups[target]] = [groups[target], groups[index]];
  const scene = encounterScene(state, encounter);
  scene.encounter.participants.splice(
    0,
    scene.encounter.participants.length,
    ...groups.flatMap((g) => g.rows),
  );
  touch(encounter);
}
export function sortPreparedOrder(state, slice, encounterId, role) {
  requireDM(role, state);
  const encounter = encounterById(slice, encounterId);
  const scene = encounterScene(state, encounter);
  if (!scene?.encounter?.participants?.length)
    throw encounterError("Nessun ordine preparato.", "No prepared order.");
  sortParticipants(state, scene.encounter.participants);
}
export function recordGroupInitiative(state, slice, encounterId, groupKey, input, role) {
  requireDM(role, state);
  const encounter = encounterById(slice, encounterId);
  const group = initiativeGroups(state, slice, encounter).find((g) => g.key === groupKey);
  if (!group)
    throw encounterError("Gruppo d’iniziativa non trovato.", "Initiative group not found.");
  const scene = sceneOf(state, encounter.handoff.sceneId);
  const bonus = Number(input.bonus);
  if (!Number.isInteger(bonus) || bonus < -100 || bonus > 100)
    throw encounterError("Bonus d’iniziativa non valido.", "Invalid initiative bonus.");
  const mode = input.mode === "physical" ? "physical" : "digital";
  // Advantage/Disadvantage (Invisible, Incapacitated…) as declared by the DM: two digital
  // d20s keep the higher/lower; with a physical die the DM enters the kept result.
  const advantage = ["advantage", "disadvantage"].includes(input.advantage)
    ? input.advantage
    : "normal";
  const faces =
    mode === "digital"
      ? Array.from({ length: advantage === "normal" ? 1 : 2 }, () => rollDie(20))
      : null;
  const natural = faces
    ? advantage === "disadvantage"
      ? Math.min(...faces)
      : Math.max(...faces)
    : Number(input.natural);
  if (!Number.isInteger(natural) || natural < 1 || natural > 20)
    throw encounterError("Il d20 fisico va da 1 a 20.", "The physical d20 goes from 1 to 20.");
  const prior = group.rows.some((row) => Number.isInteger(row.natural));
  const reason = String(input.reason ?? "").trim();
  if (prior && mode === "physical" && !reason)
    throw encounterError(
      "Scrivi il motivo della correzione.",
      "Write the reason for the correction.",
    );
  const shared = newId("init");
  const entries = [];
  for (const row of group.rows) {
    const actor = state.actors[row.actorId];
    const entry = recordInitiativeResult(
      state,
      {
        sceneId: scene.id,
        sceneName: scene.name,
        actorId: row.actorId,
        actorName: actor?.name ?? row.actorId,
        natural,
        bonus,
        mode,
        ...(prior && mode === "physical" ? { kind: "correction" } : {}),
      },
      role,
    );
    if (group.actorIds.length > 1) entry.sharedGroup = shared;
    if (prior && reason) entry.reason = reason.slice(0, 200);
    if (advantage !== "normal") entry.rollMode = advantage;
    if (faces?.length > 1) entry.faces = [...faces];
    Object.assign(row, { natural, bonus, mode, rollId: entry.id });
    entries.push(entry);
  }
  sortParticipants(state, scene.encounter.participants);
  touch(encounter);
  return { natural, bonus, total: natural + bonus, mode, advantage, faces, entries };
}

// ---------------------------------------------------------------- staged groups

export function stagedGroups(encounter) {
  return encounter.groups.filter(
    (g) => g.staged && copiesOf(encounter).some((c) => c.groupId === g.id),
  );
}
// Inserts creatures into a running order by their Initiative totals; ties go after the
// existing combatants (the GM decides ties, SRD EN 13). The current turn is kept.
export function joinCombat(state, entries) {
  const combat = state.combat;
  combat.initiative ||= [];
  // TV-50: the latest row counts (a correction appends one), as in initiativeOf.
  const totalOf = (id) => {
    const row = combat.initiative.findLast((r) => r.actorId === id);
    return row && Number.isInteger(row.natural) ? row.natural + row.bonus : null;
  };
  const sorted = [...entries].sort((a, b) => b.natural + b.bonus - (a.natural + a.bonus));
  for (const entry of sorted) {
    if (combat.order.includes(entry.actorId)) continue;
    const total = entry.natural + entry.bonus;
    let index = combat.order.findIndex((id) => {
      const other = totalOf(id);
      return other !== null && other < total;
    });
    if (index < 0) index = combat.order.length;
    combat.order.splice(index, 0, entry.actorId);
    if (index <= combat.turn) combat.turn += 1;
    combat.initiative.push({ ...entry });
    const actor = state.actors[entry.actorId];
    resetTurnMovement(actor);
    Object.assign(actor, {
      action: true,
      bonus: true,
      reaction: true,
      objectInteractionUsed: false,
    });
  }
}
// Battle Board "activate the group when players arrive or mid-combat" (VTL-085).
export function activateGroup(state, slice, encounterId, groupId, input = {}, role) {
  requireDM(role, state);
  const encounter = encounterById(slice, encounterId);
  const group = encounter.groups.find((g) => g.id === groupId);
  if (!group || !group.staged)
    throw encounterError("Il gruppo non è in attesa.", "The group is not staged.");
  const copies = copiesOf(encounter).filter(
    (c) => c.groupId === groupId && state.actors[c.actorId],
  );
  if (!copies.length)
    throw encounterError(
      "Il gruppo non ha pedine sulla scena.",
      "The group has no tokens on the scene.",
    );
  const scene = sceneOf(state, encounter.handoff.sceneId);
  const running = Boolean(state.combat?.active && state.combat.sceneId === scene.id);
  const joined = [];
  for (const row of encounter.rows.filter((r) => r.groupId === groupId && r.kind === "creature")) {
    const rowCopies = copies.filter((c) => c.rowId === row.id);
    if (!rowCopies.length) continue;
    const block = blockOf(slice, rowRef(row));
    const bonus = block?.initiative?.bonus ?? 0;
    const choice = input.rolls?.[row.id] ?? { mode: "digital" };
    let natural = null,
      mode = "physical";
    if (running || choice.mode === "digital" || choice.natural !== undefined) {
      mode = choice.mode === "physical" ? "physical" : "digital";
      natural = mode === "digital" ? rollDie(20) : Number(choice.natural);
      if (!Number.isInteger(natural) || natural < 1 || natural > 20)
        throw encounterError("Il d20 fisico va da 1 a 20.", "The physical d20 goes from 1 to 20.");
    }
    const shared = newId("init");
    for (const [index, c] of rowCopies.entries()) {
      const token = scene.tokens.find((t) => t.actorId === c.actorId);
      if (token) token.hidden = false;
      // PR-35: with «Iniziativa individuale» every digital copy after the first rolls its own d20.
      if (row.individualInitiative && index > 0 && mode === "digital") natural = rollDie(20);
      const participant = { actorId: c.actorId, natural, bonus, mode };
      if (natural !== null) {
        const entry = recordInitiativeResult(
          state,
          {
            sceneId: scene.id,
            sceneName: scene.name,
            actorId: c.actorId,
            actorName: state.actors[c.actorId].name,
            natural,
            bonus,
            mode,
          },
          role,
        );
        if (rowCopies.length > 1 && !row.individualInitiative) entry.sharedGroup = shared;
        participant.rollId = entry.id;
      }
      scene.encounter ||= { name: encounter.name, participants: [] };
      if (!scene.encounter.participants.some((p) => p.actorId === c.actorId))
        scene.encounter.participants.push({ ...participant });
      joined.push(participant);
    }
  }
  if (running) {
    joinCombat(state, joined);
    observeRestEvent(state, {
      eventId: `${state.combat.encounterId}:join:${groupId}`,
      actorIds: joined.map((j) => j.actorId),
      cause: "initiative",
    });
  } else if (scene.encounter) sortParticipants(state, scene.encounter.participants);
  group.staged = false;
  group.wasStaged = true;
  group.activatedAt = now();
  touch(encounter);
  return { joined, running, scene };
}

// ---------------------------------------------------------------- treasure

// Encounter treasure into the loot area's parcels (B26): one prepared parcel per creature
// with gear, tied to its token, holding the clean copies of its Gear entry (FVT-092).
export function prepareTreasure(state, slice, encounterId, role, lootSlice) {
  requireDM(role, state);
  if (!lootSlice)
    throw encounterError(
      "I tesori non sono disponibili ora.",
      "Treasure is unavailable right now.",
    );
  const encounter = encounterById(slice, encounterId);
  if (!encounter.handoff)
    throw encounterError(
      "Prima prepara l’incontro in una scena.",
      "Prepare the encounter on a scene first.",
    );
  const parcels = [];
  for (const c of copiesOf(encounter)) {
    const actor = state.actors[c.actorId];
    // A custom block keeps the Gear entries the DM left in it (in-place edit).
    const custom = slice.blocks.find((b) => b.id === actor?.encounterBlock?.blockId);
    const creatureId = actor?.encounterBlock?.creatureId ?? custom?.baseId;
    const baseGear = list(srd.getById(creatureId)?.gear);
    const sameGear = (a, b) =>
      a.itemId ? a.itemId === b.itemId : JSON.stringify(a.name) === JSON.stringify(b.name);
    const keep = baseGear.map((g) => !custom || list(custom.gear).some((k) => sameGear(k, g)));
    if (!keep.some(Boolean)) continue;
    if (lootSlice.parcels.some((p) => p.sourceActorId === actor.id)) continue;
    const parcel = createParcel(state, lootSlice, role, {
      name: `${actor.name}`.slice(0, 80),
      sceneId: encounter.handoff.sceneId,
      sourceActorId: actor.id,
    });
    cleanGearFromStatBlock(creatureId).forEach((item, i) => {
      if (keep[i]) addParcelItem(state, lootSlice, role, parcel.id, item);
    });
    if (encounter.notes.treasure)
      updateParcel(state, lootSlice, role, parcel.id, {
        name: parcel.name,
        sceneId: parcel.sceneId,
        sourceActorId: parcel.sourceActorId,
        note: encounter.notes.treasure,
      });
    parcels.push(parcel);
  }
  if (!parcels.length)
    throw encounterError(
      "Nessuna creatura dell’incontro ha equipaggiamento da recuperare (o è già in un pacchetto).",
      "No encounter creature has recoverable gear (or it is already in a parcel).",
    );
  touch(encounter);
  return parcels;
}

// ---------------------------------------------------------------- custom blocks and parser

const DAMAGE_WORDS = [
  ["slashing", /taglient[ei]|slashing/i],
  ["piercing", /perforant[ei]|piercing/i],
  ["bludgeoning", /contundent[ei]|bludgeoning/i],
  ["fire", /da fuoco|\bfire\b/i],
  ["cold", /da freddo|\bcold\b/i],
  ["poison", /da veleno|\bpoison\b/i],
  ["necrotic", /necrotic[io]|necrotic/i],
  ["psychic", /psichic[io]|psychic/i],
  ["radiant", /radios[io]|radiant[ei]|radiant/i],
  ["acid", /da acido|\bacid\b/i],
  ["lightning", /da fulmine|lightning/i],
  ["thunder", /da tuono|thunder/i],
  ["force", /da forza|\bforce\b/i],
];
const metresToFeet = (value) => Math.round((Number(String(value).replace(",", ".")) / 1.5) * 5);
// FG parser / Shard (R20-113, VTL-089): recognises attack bonus, reach or range and the
// first damage term, in the SRD wording or this app's paraphrase, in Italian or English.
// Riders and extra damage stay text for the DM. The result is a proposal to confirm.
export function parseActionText(raw) {
  const text = String(raw ?? "")
    .replace(/[−–]/g, "-")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  const en = /(melee or ranged|melee|ranged)\s+attack(?:\s+roll)?\s*:?\s*([+-]\s*\d+)/i.exec(text);
  const it =
    /(?:tiro per colpire|attacco)\s+(in mischia o a distanza|in mischia|a distanza)\s*:?\s*([+-]\s*\d+)/i.exec(
      text,
    );
  const hit = en ?? it;
  if (!hit) return null;
  const kindWord = hit[1].toLowerCase();
  const type = /or ranged|o a distanza/.test(kindWord)
    ? "melee-or-ranged"
    : /melee|mischia/.test(kindWord)
      ? "melee"
      : "ranged";
  const bonus = Number(hit[2].replace(/\s+/g, ""));
  const reachFt = /reach\s+(\d+)\s*ft/i.exec(text)?.[1];
  const reachM = /portata(?:\s+di)?\s+(\d+(?:[.,]\d+)?)\s*m/i.exec(text)?.[1];
  const rangeFt = /range\s+(\d+)(?:\s*\/\s*(\d+))?\s*ft/i.exec(text);
  const rangeM = /gittata(?:\s+di)?\s+(\d+(?:[.,]\d+)?)(?:\s*\/\s*(\d+(?:[.,]\d+)?))?\s*m/i.exec(
    text,
  );
  const damageMatch =
    /(\d+)\s*\(\s*(\d+\s*d\s*\d+(?:\s*[+-]\s*\d+)?)\s*\)\s*(?:danni\s+)?([a-zà-ù' ]{3,30})/i.exec(
      text,
    );
  if (!damageMatch) return null;
  const dice = damageMatch[2].replace(/\s+/g, "");
  if (!parseDice(dice)) return null;
  const typeWord = damageMatch[3];
  const damageType = DAMAGE_WORDS.find(([, pattern]) => pattern.test(typeWord))?.[0];
  if (!damageType) return null;
  const reach = reachFt
    ? Number(reachFt)
    : reachM
      ? metresToFeet(reachM)
      : type === "ranged"
        ? null
        : 5;
  const range = rangeFt
    ? { normal: Number(rangeFt[1]), long: rangeFt[2] ? Number(rangeFt[2]) : null }
    : rangeM
      ? { normal: metresToFeet(rangeM[1]), long: rangeM[2] ? metresToFeet(rangeM[2]) : null }
      : null;
  if (type === "ranged" && !range) return null;
  const after = text
    .slice(damageMatch.index + damageMatch[0].length)
    .replace(/^[\s.,;]+/, "")
    .trim();
  return {
    kind: "attack",
    attack: { type, bonus, reach: type === "ranged" ? null : reach, range },
    damage: [{ average: Number(damageMatch[1]), dice, type: damageType }],
    rest: after,
  };
}
const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"];
export const BLOCK_SECTIONS = Object.freeze(["traits", "actions", "bonusActions", "reactions"]);
export const DAMAGE_TYPES = Object.freeze(Object.keys(srd.LABELS.damageType));
export const CONDITION_IDS = Object.freeze([
  "blinded",
  "charmed",
  "deafened",
  "exhaustion",
  "frightened",
  "grappled",
  "incapacitated",
  "invisible",
  "paralyzed",
  "petrified",
  "poisoned",
  "prone",
  "restrained",
  "stunned",
  "unconscious",
]);
export const SENSE_KEYS = Object.freeze(["darkvision", "blindsight", "truesight", "tremorsense"]);
const blockSource = (id, revision) => ({
  kind: "authored-demo",
  edition: "2024",
  revision: `${id}@${revision}`,
});
// A custom block has one text per field: text edited in one language replaces both, so
// the other language never keeps stale numbers next to the new ones.
const retext = (original, value, lang) =>
  value === (original?.[lang] ?? "")
    ? copy(original ?? { it: value, en: value })
    : { it: value, en: value };
// A Gear entry's key in the edit form: its catalogue item, else its position and name.
export const gearKey = (g, i) => g.itemId ?? `${i}:${g.name?.en ?? g.name ?? ""}`;
// "Furtività +6, Percezione +2" (or the English names) → { stealth: 6, perception: 2 }.
export function parseSkills(text) {
  const out = {};
  for (const part of String(text ?? "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)) {
    const match = /^(.+?)\s*([+−-]\s*\d+)$/.exec(part);
    const skill =
      match &&
      RULE_SKILLS.find((s) =>
        [s.name?.it, s.name?.en].some(
          (n) => n && srd.normalizeSearchText(n) === srd.normalizeSearchText(match[1]),
        ),
      );
    if (!skill)
      throw encounterError(
        `Abilità non riconosciuta: «${part}» (es. Furtività +6).`,
        `Unknown skill: “${part}” (e.g. Stealth +6).`,
      );
    out[skill.id] = Number(match[2].replace(/\s+/g, "").replace("−", "-"));
    if (!Number.isInteger(out[skill.id]) || Math.abs(out[skill.id]) > 30)
      throw encounterError("Bonus di abilità da −30 a +30.", "Skill bonus from −30 to +30.");
  }
  return out;
}
// Validates and saves an in-place edit of the whole 2024 block (R20-102): core numbers,
// abilities and saves, skills, defenses, gear, senses, languages and every section
// (traits, actions, bonus actions, reactions). Editing an SRD block creates a custom copy;
// editing a custom block raises its revision. Changed text is parsed into a proposal that
// stays unconfirmed until the DM confirms it. Fields a draft leaves out keep the block's.
export function saveBlockEdit(slice, role, ref, draft, { lang = "it", id = newId("block") } = {}) {
  requireDM(role);
  const base = blockOf(slice, ref);
  if (!base) throw encounterError("Blocco non trovato.", "Stat block not found.");
  const int = (value, min, max, it, en) => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) throw encounterError(it, en);
    return n;
  };
  const name = String(draft.name ?? "").trim();
  if (!name || name.length > 80)
    throw encounterError(
      "Il nome deve avere da 1 a 80 caratteri.",
      "The name needs 1 to 80 characters.",
    );
  const ac = int(draft.ac, 1, 30, "CA da 1 a 30.", "AC from 1 to 30.");
  const hpAverage = int(draft.hpAverage, 1, 999, "PF da 1 a 999.", "HP from 1 to 999.");
  const formula = String(draft.hpFormula ?? "")
    .replace(/\s+/g, "")
    .replace(/−/g, "-");
  if (!parseDice(formula))
    throw encounterError(
      "Formula dei PF non valida (es. 3d6 o 2d8+2).",
      "Invalid HP formula (e.g. 3d6 or 2d8+2).",
    );
  const initBonus = int(
    draft.initiative,
    -10,
    20,
    "Iniziativa da −10 a +20.",
    "Initiative from −10 to +20.",
  );
  const walk = int(draft.speed, 0, 200, "Velocità da 0 a 200 ft.", "Speed from 0 to 200 ft.");
  const abilities = Object.fromEntries(
    ABILITY_KEYS.map((key) => [
      key,
      int(
        draft.abilities?.[key],
        1,
        30,
        "Caratteristiche da 1 a 30.",
        "Ability scores from 1 to 30.",
      ),
    ]),
  );
  const cr = String(draft.cr ?? "").trim();
  if (!CR_OPTIONS.includes(cr)) throw encounterError("GS non valido.", "Invalid CR.");
  // Saving throws: a blank field means the plain ability modifier (no proficiency).
  const saves =
    draft.saves === undefined
      ? copy(base.saves ?? {})
      : Object.fromEntries(
          ABILITY_KEYS.filter((k) => String(draft.saves[k] ?? "").trim() !== "").map((k) => [
            k,
            int(
              String(draft.saves[k]).replace("+", "").replace("−", "-"),
              -10,
              30,
              "Tiri salvezza da −10 a +30.",
              "Saving throws from −10 to +30.",
            ),
          ]),
        );
  const skills =
    draft.skillsText === undefined ? copy(base.skills ?? {}) : parseSkills(draft.skillsText);
  const pickList = (value, allowed, fallback, it, en) => {
    if (value === undefined) return [...list(fallback)];
    const clean = [...new Set(list(value).map(String))];
    if (!clean.every((v) => allowed.includes(v))) throw encounterError(it, en);
    return clean;
  };
  const damage = (key) =>
    pickList(
      draft[key],
      DAMAGE_TYPES,
      base[key],
      "Tipo di danno non valido.",
      "Invalid damage type.",
    );
  const senses =
    draft.senses === undefined
      ? copy(base.senses ?? {})
      : {
          ...Object.fromEntries(
            SENSE_KEYS.filter((k) => String(draft.senses[k] ?? "").trim() !== "").map((k) => [
              k,
              int(draft.senses[k], 1, 1000, "Sensi da 1 a 1000 ft.", "Senses from 1 to 1000 ft."),
            ]),
          ),
          passivePerception: int(
            draft.senses.passivePerception,
            1,
            40,
            "Percezione passiva da 1 a 40.",
            "Passive Perception from 1 to 40.",
          ),
        };
  const languagesText = draft.languages === undefined ? null : String(draft.languages).trim();
  if (languagesText !== null && languagesText.length > 200)
    throw encounterError("Lingue: al massimo 200 caratteri.", "Languages: at most 200 characters.");
  const gear =
    draft.gear === undefined
      ? copy(base.gear ?? [])
      : list(base.gear).filter((g, i) => list(draft.gear).includes(gearKey(g, i)));
  const editSection = (section) =>
    list(base[section]).map((action) => {
      const edited = draft[section]?.[action.id];
      if (!edited) return copy(action);
      const next = copy(action);
      const actionName = String(edited.name ?? "").trim();
      if (!actionName || actionName.length > 60)
        throw encounterError(
          "Nome da 1 a 60 caratteri per ogni voce del blocco.",
          "Every block entry needs a name of 1 to 60 characters.",
        );
      next.name = retext(next.name, actionName, lang);
      const text = String(edited.text ?? "").trim();
      if (text.length > 600)
        throw encounterError("Testo dell’azione troppo lungo.", "Action text too long.");
      if (text !== (action.summary?.[lang] ?? "")) {
        next.summary = { it: text, en: text };
        next.textLang = lang;
        // Text changed: structured data no longer matches it until the DM confirms again.
        delete next.structured;
        delete next.confirmed;
        delete next.dismissed;
        delete next.saveDc;
        next.textEdited = true;
        const proposal = parseActionText(text);
        if (proposal) next.proposal = proposal;
        else delete next.proposal;
        if (next.kind === "attack") next.kind = "special";
        delete next.attack;
        delete next.damage;
      }
      return next;
    });
  const sections = Object.fromEntries(BLOCK_SECTIONS.map((s) => [s, editSection(s)]));
  const extra = String(draft.newActionText ?? "").trim();
  if (extra) {
    if (extra.length > 600)
      throw encounterError("Testo dell’azione troppo lungo.", "Action text too long.");
    const section = BLOCK_SECTIONS.includes(draft.newActionSection)
      ? draft.newActionSection
      : "actions";
    const [head, ...tail] = extra.split(/\.\s+/);
    const actionName =
      head.length <= 40 && tail.length
        ? head.trim()
        : lang === "it"
          ? "Nuova azione"
          : "New action";
    const body = actionName === head.trim() ? tail.join(". ") : extra;
    const proposal = parseActionText(body);
    sections[section].push({
      id: newId("act"),
      name: { it: actionName, en: actionName },
      kind: "special",
      summary: { it: body, en: body },
      textLang: lang,
      textEdited: true,
      ...(proposal ? { proposal } : {}),
    });
  }
  const xp = srd.XP_BY_CR.find((row) => row.cr === cr);
  let block = base.custom ? slice.blocks.find((b) => b.id === base.id) : null;
  const common = {
    kind: "creature",
    custom: true,
    name: retext(base.name, name, lang),
    size: [...list(base.size)],
    type: base.type,
    typeTags: [...list(base.typeTags)],
    alignment: base.alignment,
    ac,
    initiative: { bonus: initBonus, score: 10 + initBonus },
    hp: { average: hpAverage, formula },
    speed: { ...copy(base.speed ?? {}), walk },
    abilities,
    saves,
    skills,
    vulnerabilities: damage("vulnerabilities"),
    resistances: damage("resistances"),
    immunities: damage("immunities"),
    conditionImmunities: pickList(
      draft.conditionImmunities,
      CONDITION_IDS,
      base.conditionImmunities,
      "Condizione non valida.",
      "Invalid condition.",
    ),
    gear,
    senses,
    languages:
      languagesText === null
        ? copy(base.languages ?? L("—", "—"))
        : retext(base.languages, languagesText || "—", lang),
    cr,
    crValue: srd.crToNumber(cr),
    xp: xp.xp,
    proficiencyBonus: xp.proficiencyBonus,
    ...sections,
    summary: copy(base.summary ?? L("", "")),
  };
  if (block) {
    Object.assign(block, common, { revision: block.revision + 1, updatedAt: now() });
    block.source = blockSource(block.id, block.revision);
  } else {
    block = {
      id,
      baseId: base.custom ? base.baseId : base.id,
      revision: 1,
      createdAt: now(),
      updatedAt: now(),
      ...common,
      source: {
        ...blockSource(id, 1),
        basedOn: base.custom ? (base.source?.basedOn ?? null) : copy(base.source),
      },
    };
    slice.blocks.push(block);
  }
  return block;
}
// The DM confirms (or dismisses) the parsed proposal: only then it becomes clickable.
export function confirmAction(slice, role, blockId, actionId, accept = true) {
  requireDM(role);
  const block = slice.blocks.find((b) => b.id === blockId);
  const action = block?.actions.find((a) => a.id === actionId);
  if (!action?.proposal)
    throw encounterError("Nessuna proposta da confermare.", "No proposal to confirm.");
  if (accept) {
    action.kind = "attack";
    action.attack = copy(action.proposal.attack);
    action.damage = copy(action.proposal.damage);
    action.confirmed = true;
  } else action.dismissed = true;
  delete action.proposal;
  block.revision += 1;
  block.updatedAt = now();
  block.source = blockSource(block.id, block.revision);
  return action;
}
// Rows of an encounter that use an SRD block switch to the custom copy just saved.
export function pointRowToBlock(slice, encounterId, rowId, blockId) {
  const encounter = encounterById(slice, encounterId);
  const row = encounter.rows.find((r) => r.id === rowId);
  if (!row) throw encounterError("Riga non trovata.", "Row not found.");
  delete row.creatureId;
  delete row.autoLoaded;
  row.blockId = blockId;
  touch(encounter);
}
// Clickable roll requests from structured data (never from DOM text).
export function blockRollRequest(block, spec) {
  if (!block) throw encounterError("Blocco non trovato.", "Stat block not found.");
  const entry = { id: block.id };
  const n = (it, en) => ({
    it: `${block.name.it || block.name.en} · ${it}`,
    en: `${block.name.en || block.name.it} · ${en}`,
  });
  if (spec.kind === "initiative")
    return {
      entry,
      kind: "d20",
      bonus: block.initiative?.bonus ?? 0,
      label: n("iniziativa", "initiative"),
    };
  if (spec.kind === "check" || spec.kind === "save") {
    const score = block.abilities?.[spec.ability];
    if (score == null) throw encounterError("Caratteristica sconosciuta.", "Unknown ability.");
    const mod = abilityModifier(score);
    const bonus = spec.kind === "save" ? (block.saves?.[spec.ability] ?? mod) : mod;
    const ability = srd.LABELS.ability[spec.ability];
    return {
      entry,
      kind: "d20",
      bonus,
      label: n(
        `${spec.kind === "save" ? "tiro salvezza su" : "prova di"} ${ability.it}`,
        `${ability.en} ${spec.kind === "save" ? "saving throw" : "check"}`,
      ),
    };
  }
  const action = [
    ...list(block.actions),
    ...list(block.bonusActions),
    ...list(block.reactions),
  ].find((a) => a.id === spec.action);
  // Catalogue data is structured; custom text becomes rollable only once confirmed.
  if (!action || (block.custom && action.textEdited && !action.confirmed))
    throw encounterError("Azione non disponibile per i tiri.", "Action not available for rolls.");
  if (spec.kind === "attack" && Number.isInteger(action.attack?.bonus))
    return {
      entry,
      action,
      kind: "d20",
      bonus: action.attack.bonus,
      label: n(`${action.name.it} · tiro per colpire`, `${action.name.en} · attack roll`),
    };
  if (spec.kind === "damage") {
    const terms = list(action.damage)
      .filter((d) => parseDice(d.dice))
      .map((d) => ({ dice: d.dice, type: d.type }));
    if (!terms.length) throw encounterError("Nessun dado di danno.", "No damage dice.");
    return {
      entry,
      action,
      kind: "damage",
      terms,
      canCritical: action.kind === "attack",
      label: n(`${action.name.it} · danni`, `${action.name.en} · damage`),
    };
  }
  throw encounterError("Tiro non disponibile.", "Roll unavailable.");
}
