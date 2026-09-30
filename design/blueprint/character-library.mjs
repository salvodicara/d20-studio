// B21 — Characters: list, privacy, copy, export and sharing (Characters area).
//
// Replaces the core "characters" route with a character library and keeps the core sheet
// (renderCharacters/bindCharacters) whenever a sheet is open. Patterns copied, with the
// IDs of docs/interview/CAPABILITY_CENSUS.md and changes/interview-01/market-census/*.md:
// - My Characters (D&D Beyond DDB-063, SVC-014): real-time search by name, level, class,
//   species or campaign; sort by created, name, level or modified, persisted per device;
//   per character View, Copy, Delete and Leave Campaign (Delete asks for confirmation).
// - Character privacy (DDB-061): Campaign only (default), Private (owner and DM; other
//   players see name, level, class and player), Public (readable by URL). Read-only sheet
//   for non-owners without commands or game log (DDB-062); link or QR (Demiplane CMP-14).
// - Copy (Roll20 Copy R20-014, DDB-064 "copy as migration", decision I-125): an
//   independent sheet; changes to either never reach the other.
// - Vault ↔ game (Roll20 R20-013/R20-014/R20-015, Solasta CRP-012): "Add to Game" (live
//   link: the same sheet joins the campaign) vs "Import" (a non-synced snapshot copy);
//   Release (the campaign keeps its sheet, unassigned for another player; the library keeps
//   an independent copy); Transfer to another campaign, accepted by its DM (decision I-176).
// - Export to PDF, form-fillable, with notes, concentration and ritual (DDB-065); print
//   view; JSON Export/Import Data of one document (Foundry FVT-205, FG R20-047).
// - Revision history (Fantasy Grounds Character Vault R20-046): compare, and restore as a
//   new revision; Adventure log tab (FG 5E Log, Adventurers League, R20-044).
// A deleted character goes to a trash and can be restored (decision I-173 keeps
// deletion distinct from archive; this area adds the recoverable delete asked by B21).
//
// Rules: D&D 2024, SRD 5.2.1 (EN/IT). Synthetic data only; the two identities are the
// shell's "Visita come" identities. No backend: the public link and the QR work in this
// browser, which is the local simulation of the service.

import { canViewActor, canControlActor, sheetEditStatus } from "./character-access.mjs";
import { connectCharacterWithContent } from "./homebrew-integration.mjs";
import { isCampaignMember } from "./campaign-content.mjs";
import { renderCharacters, bindCharacters } from "./characters.mjs";
import { getEffectiveActor } from "./forms-companions.mjs";
import { characterZeroHpPolicy, getCharacterCatalog } from "./character-rules.mjs";
import { updateCharacterRestProfile } from "./rest-profile.mjs";
import * as members from "./campaign-members.mjs";
import { portraitArt, canSeeAsset } from "./media-domain.mjs";
import { src as mediaSrc } from "./media-ui.mjs";
import * as X from "./character-export.mjs";
import { SPELLS } from "./srd-sample.mjs";
import { legacyRecords } from "./builder-plus-domain.mjs";
import { createCharacterDraft, previewCharacterDraft } from "./character-build.mjs";
import { policyOf as campaignPolicy, sheetLockedFor } from "./campaign-settings-domain.mjs";
import { sampleDate, sampleDay } from "./sample-clock.mjs";

export const ID = "character-library";
export const VERSION = 1;
export const TAB_LOG = `${ID}-log`;
export const TAB_REVISIONS = `${ID}-revisions`;
export const ROUTE_LINK = `${ID}-link`;
export const ROUTE_PRINT = `${ID}-print`;
export const PRIVACY = Object.freeze(["campaign", "private", "public"]);
export const SORTS = Object.freeze([
  "created-desc",
  "created-asc",
  "name-asc",
  "name-desc",
  "level-desc",
  "level-asc",
  "modified-desc",
  "modified-asc",
]);
export const DEFAULT_SORT = "created-desc";
export const MAX_REVISIONS = 40;
const SORT_KEY = `${ID}.sort`;
const LEGACY = members.LEGACY_CAMPAIGN;
const SEED_SOURCE = Object.freeze({
  kind: "authored-demo",
  edition: "2024",
  revision: "blueprint-b21-library",
  note: "Synthetic library data (dates, revisions, adventure log); not a real character.",
});

const copy = (value) => (value === undefined ? undefined : structuredClone(value));
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const iso = (ms) => new Date(ms).toISOString();
const newId = (prefix) => `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
const refuse = (it, en) => {
  throw Object.assign(new Error(en), { it, en });
};
const pick = (value, lang) =>
  isObject(value) ? String(value[lang] ?? value.it ?? value.en ?? "") : String(value ?? "");
export const fold = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase();

// ---------------------------------------------------------------- sample data

// Iria: the library-only sample character named by the B21 card (a level 5 elf wizard with
// concentration and ritual spells, never connected to a campaign). Features and spells are
// the catalog's SRD 5.2.1 rows with their sources; nothing is invented beyond them.
const IRIA_SPELLS = [
  ["fire-bolt", true, "fire-bolt"],
  ["light", true],
  ["mage-hand", true],
  ["prestidigitation", true],
  ["detect-magic", true],
  ["mage-armor", true],
  ["shield", true, "shield"],
  ["magic-missile", true, "magic-missile"],
  ["find-familiar", false],
  ["misty-step", true],
  ["invisibility", true],
  ["fireball", true],
  ["fly", true],
  ["counterspell", true],
];
const text = (it, en) => ({ it, en });
export function makeIria() {
  const catalog = getCharacterCatalog();
  const wizard = catalog.classes.find((row) => row.id === "wizard");
  const elf = catalog.species.find((row) => row.id === "elf");
  const features = [
    ...(wizard?.features ?? [])
      .filter((row) => row.level <= 5)
      .map((row) => ({
        ...copy(row),
        grantId: "class:wizard",
        definitionId: row.id,
        id: "class:wizard:" + row.id,
      })),
    ...(elf?.features ?? []).map((row) => ({
      ...copy(row),
      grantId: "species:elf",
      definitionId: row.id,
      id: "species:elf:" + row.id,
    })),
  ];
  const arcane = features.find((row) => row.definitionId === "wizard:arcane-recovery");
  if (arcane) arcane.used = 0;
  const spells = IRIA_SPELLS.map(([slug, prepared, combatActionId]) => {
    const entry = SPELLS.find((row) => row.slug === slug);
    return {
      id: "iria-" + slug,
      catalogId: slug,
      ...(combatActionId ? { combatActionId } : {}),
      name: copy(entry.name),
      level: entry.level,
      prepared,
      description: "",
      source: `SRD 5.2.1 · 2024 · EN${entry.source.en.pages.join("–")} / IT${entry.source.it.pages.join("–")}`,
    };
  });
  const actor = {
    id: "iria",
    name: "Iria",
    kind: "character",
    owner: "player",
    controllers: [],
    visibility: "private",
    campaignIds: [],
    className: text("Maga", "Wizard"),
    level: 5,
    speciesId: "elf",
    hp: 27,
    maxHp: 27,
    tempHp: 0,
    ac: 12,
    speed: 9,
    movement: 9,
    movementSpent: 0,
    dashCount: 0,
    action: true,
    bonus: true,
    reaction: true,
    proficiencyBonus: 3,
    size: "medium",
    creatureType: "humanoid",
    conditions: [],
    exhaustion: 0,
    abilities: { str: 8, dex: 14, con: 12, int: 18, wis: 12, cha: 10 },
    savingThrows: { str: -1, dex: 2, con: 1, int: 7, wis: 4, cha: 0 },
    skills: ["arcana", "history", "investigation", "perception"],
    skillModifiers: { arcana: 7, history: 7, investigation: 7, perception: 4 },
    hitDice: { d6: { max: 5, used: 0 } },
    spellSlots: { 1: { max: 4, used: 0 }, 2: { max: 3, used: 0 }, 3: { max: 2, used: 0 } },
    inventory: [
      {
        id: "iria-spellbook",
        name: text("Libro degli incantesimi", "Spellbook"),
        quantity: 1,
        weight: 1.5,
        equipped: false,
        kind: "gear",
        description: text(
          "Rilegato in pelle blu, con appunti a margine.",
          "Blue leather, notes in the margins.",
        ),
      },
      {
        id: "iria-staff",
        name: text("Bastone", "Quarterstaff"),
        quantity: 1,
        weight: 2,
        equipped: true,
        kind: "weapon",
        weaponType: "quarterstaff",
        description: "",
      },
      {
        id: "iria-focus",
        name: text("Cristallo (focus arcano)", "Crystal (arcane focus)"),
        quantity: 1,
        weight: 0.5,
        equipped: true,
        kind: "gear",
        description: "",
      },
      {
        id: "iria-potion",
        name: text("Pozione di guarigione", "Potion of healing"),
        quantity: 1,
        weight: 0.25,
        equipped: false,
        kind: "consumable",
        healing: 7,
        description: text("Recuperi 2d4 + 2 punti ferita.", "Regain 2d4 + 2 hit points."),
      },
      {
        id: "iria-lantern",
        name: text("Lanterna schermabile", "Hooded lantern"),
        quantity: 1,
        weight: 1,
        equipped: false,
        kind: "gear",
        description: "",
      },
    ],
    spells,
    features,
    description: "Capelli d’argento raccolti, dita macchiate d’inchiostro.",
    backstory: "Custode dei registri del faro di Capo Sale, cerca chi ha spento la sua luce.",
    notes: "",
    vitalityPolicy: characterZeroHpPolicy(),
    conditionImmunities: [],
    buildSeed: {
      classes: [{ classId: "wizard", level: 5, subclassId: "evoker" }],
      levelOrder: ["wizard", "wizard", "wizard", "wizard", "wizard"],
      source: {
        kind: "authored",
        revision: "blueprint-b21-iria",
        title: text("Profilo sintetico di Iria", "Iria synthetic profile"),
      },
    },
    combatProfile: {
      spellcastingAbility: "int",
      proficiencyBonus: 3,
      weaponProficiencies: ["quarterstaff"],
      spells: ["fire-bolt", "magic-missile", "shield"],
      componentsAvailable: true,
      team: "party",
    },
    source: {
      kind: "authored-demo",
      edition: "2024",
      revision: "blueprint-b21-iria",
      note: "Synthetic library character; not a real character.",
    },
  };
  actor.slots = actor.spellSlots[1];
  updateCharacterRestProfile(
    actor,
    { classes: actor.buildSeed.classes, origin: { speciesId: "elf" } },
    { newCharacter: true },
  );
  return actor;
}

const SAMPLE_CREATED = {
  doran: "2026-05-02T18:05:00.000Z",
  livia: "2026-05-03T20:10:00.000Z",
  mira: "2026-06-14T19:00:00.000Z",
  iria: "2026-08-30T17:00:00.000Z",
};
function sampleLog() {
  return {
    livia: [
      {
        id: "log-livia-11",
        date: sampleDay("2026-09-10"),
        title: "Le lanterne di Bruma · Sessione 11",
        dm: "DM",
        levels: 0,
        gold: 40,
        downtime: 0,
        items: "",
        notes: "Scortato il carro del mercante fino alle porte di Bruma.",
      },
      {
        id: "log-livia-12",
        date: sampleDay("2026-09-17"),
        title: "Le lanterne di Bruma · Sessione 12",
        dm: "DM",
        levels: 1,
        gold: 25,
        downtime: 2,
        items: "Pergamena di Scudo",
        notes: "Raggiunto il vecchio osservatorio; Livia sale al 3° livello.",
      },
    ],
    iria: [
      {
        id: "log-iria-1",
        date: sampleDay("2026-08-30"),
        title: "Il faro spento (avventura da una sera)",
        dm: "Ospite",
        levels: 0,
        gold: 80,
        downtime: 5,
        items: "Lanterna schermabile",
        notes: "",
      },
    ],
  };
}
// `owner` and `campaignIds` record who could read the sheet when the revision was taken
// (revisionReadable): the sheet's owner then, and the campaigns it belonged to then.
function revision(n, at, by, kind, label, data, actor) {
  return {
    id: `rev-${n}-${Date.parse(at).toString(36)}`,
    n,
    at,
    by,
    kind,
    label,
    data,
    owner: actor.owner,
    campaignIds: [...campaignIdsOf(actor)],
  };
}
// Livia's older synthetic revision: the same sheet at level 2, before session 12.
function liviaLevelTwo(data) {
  const older = copy(data);
  older.level = 2;
  older.maxHp = 16;
  older.hp = 16;
  older.spells = (older.spells ?? []).filter(
    (row) => !["magic-missile", "find-familiar"].includes(row.combatActionId ?? row.catalogId),
  );
  older.inventory = (older.inventory ?? [])
    .filter((row) => row.id !== "rope")
    .map((row) => (row.id === "potion" ? { ...row, quantity: 1 } : row));
  if (older.spellSlots) older.spellSlots = { 1: { max: 3, used: 0 } };
  if (older.hitDice?.d6) older.hitDice = { d6: { max: 2, used: 0 } };
  // SRD 5.2.1: a wizard chooses a subclass at level 3, so the level-2 sheet has none.
  if (older.buildSeed?.classes)
    older.buildSeed = {
      ...older.buildSeed,
      classes: older.buildSeed.classes.map(({ subclassId, ...row }) => ({ ...row, level: 2 })),
      levelOrder: ["wizard", "wizard"],
    };
  return older;
}

export function emptySlice() {
  return { entries: {}, trash: [], revisions: {}, logs: {}, transfers: [] };
}
/**
 * Seed: when the area first meets a state (new browser, older demo data, "Reset example")
 * the library-only sample Iria is added if absent, with synthetic creation dates, revision
 * histories and adventure logs for the sample characters. Existing records never change.
 */
export function seedSlice(state) {
  const slice = emptySlice();
  if (!state?.actors) return slice;
  if (!state.actors.iria) state.actors.iria = makeIria();
  for (const [id, createdAt] of Object.entries(SAMPLE_CREATED))
    if (state.actors[id])
      slice.entries[id] = {
        createdAt: sampleDate(createdAt),
        privacy: "campaign",
        link: null,
        revoked: [],
      };
  if (state.actors.iria) slice.entries.iria.privacy = "private";
  const livia = state.actors.livia;
  if (livia) {
    const now = X.sheetData(livia);
    slice.revisions.livia = [
      revision(
        1,
        sampleDate("2026-09-03T21:30:00.000Z"),
        "player",
        "sample",
        text("Livello 2, prima della sessione 11", "Level 2, before session 11"),
        liviaLevelTwo(now),
        livia,
      ),
      revision(
        2,
        sampleDate("2026-09-17T22:45:00.000Z"),
        "player",
        "sample",
        text("Dopo la sessione 12: livello 3", "After session 12: level 3"),
        now,
        livia,
      ),
    ];
  }
  if (state.actors.iria)
    slice.revisions.iria = [
      revision(
        1,
        sampleDate(SAMPLE_CREATED.iria),
        "player",
        "sample",
        text("Creata nella libreria", "Created in the library"),
        X.sheetData(state.actors.iria),
        state.actors.iria,
      ),
    ];
  if (state.actors.doran)
    slice.revisions.doran = [
      revision(
        1,
        sampleDate("2026-09-17T22:50:00.000Z"),
        "dm",
        "sample",
        text("Dopo la sessione 12", "After session 12"),
        X.sheetData(state.actors.doran),
        state.actors.doran,
      ),
    ];
  const logs = sampleLog();
  for (const [id, rows] of Object.entries(logs)) if (state.actors[id]) slice.logs[id] = rows;
  return slice;
}
const arrayOf = (value) => (Array.isArray(value) ? value : []);
const objectOf = (value) => (isObject(value) ? value : {});
export function normalizeSlice(slice, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw Error("Character library data comes from a newer version");
  if (!isObject(slice)) return emptySlice();
  const entries = {};
  for (const [id, raw] of Object.entries(objectOf(slice.entries))) {
    if (!isObject(raw)) continue;
    entries[id] = {
      ...raw,
      createdAt: typeof raw.createdAt === "string" ? raw.createdAt : null,
      privacy: PRIVACY.includes(raw.privacy) ? raw.privacy : "campaign",
      link: isObject(raw.link) && typeof raw.link.code === "string" ? raw.link : null,
      revoked: arrayOf(raw.revoked).filter((code) => typeof code === "string"),
    };
  }
  const listMap = (value) =>
    Object.fromEntries(
      Object.entries(objectOf(value))
        .filter(([, rows]) => Array.isArray(rows))
        .map(([id, rows]) => [id, rows.filter(isObject)]),
    );
  return {
    entries,
    trash: arrayOf(slice.trash).filter((row) => isObject(row) && isObject(row.actor)),
    revisions: listMap(slice.revisions),
    logs: listMap(slice.logs),
    transfers: arrayOf(slice.transfers).filter(isObject),
  };
}

// ---------------------------------------------------------------- access and queries

export function sliceOf(state) {
  return state?.ext?.[ID] ?? null;
}
function mutableSlice(state) {
  const slice = sliceOf(state);
  if (!slice) throw Error("Character library state is not initialized");
  return slice;
}
function entryOf(state, actorId) {
  const slice = mutableSlice(state);
  slice.entries[actorId] ??= { createdAt: null, privacy: "campaign", link: null, revoked: [] };
  return slice.entries[actorId];
}
export function privacyOf(state, actorId) {
  return sliceOf(state)?.entries?.[actorId]?.privacy ?? "campaign";
}
const playable = (actor) => Boolean(actor) && actor.kind === "character" && !actor.companion;
/** Campaign ids a sheet belongs to (a personal sheet belongs to none). */
export function campaignIdsOf(actor) {
  if (!actor || actor.visibility === "private") return [];
  return Array.isArray(actor.campaignIds) ? actor.campaignIds : [LEGACY];
}
export function campaignName(state, campaignId) {
  return (
    members.coreCampaign(state, campaignId)?.name ??
    (state.campaign?.id === campaignId ? state.campaign.name : campaignId)
  );
}
/** DM or co-DM of a campaign (B13 roles when present, else the core member record). */
export function isManager(state, campaignId, who) {
  if (sliceOfMembers(state)) return members.canManage(state, campaignId, who);
  return state.campaign?.id === campaignId && who === "dm";
}
const sliceOfMembers = (state) => state?.ext?.["campaign-members"] ?? null;
function campaignOwner(state, campaignId) {
  return (sliceOfMembers(state) && members.metaOf(state, campaignId)?.ownerId) || "dm";
}
function requireOwner(actor, who) {
  if (!actor) refuse("Personaggio non disponibile.", "Character unavailable.");
  if (actor.owner !== who)
    refuse("Solo chi possiede la scheda può farlo.", "Only the owner of the sheet can do this.");
}
function requirePlayable(actor) {
  if (!playable(actor))
    refuse(
      "Questa azione vale per i personaggi, non per creature compagne o PNG.",
      "This action applies to characters, not companions or NPCs.",
    );
}
function requireNotFighting(state, actorId) {
  if (state.combat?.active && (state.combat.order ?? []).includes(actorId))
    refuse(
      "Il personaggio è in un combattimento in corso: attendi la fine dell’incontro.",
      "The character is in a running encounter: wait until it ends.",
    );
}
function companionsOf(state, actorId) {
  return Object.values(state.actors ?? {}).filter(
    (row) => row?.companion?.parentActorId === actorId,
  );
}
function requireNoCompanions(state, actorId) {
  if (companionsOf(state, actorId).length)
    refuse(
      "Il personaggio ha creature compagne: congedale prima dalla sua scheda (Extra).",
      "The character has companions: dismiss them first from its sheet (Extras).",
    );
}

/**
 * How much of a sheet one viewer reads (DDB-061/062), the gate every B21 surface applies:
 * "full" for the owner, whoever controls it and a DM or co-DM of its campaign; "read" (the
 * whole sheet, no commands) for the other campaign members; "summary" (name, class, level
 * and player) for them when the owner chose "player and DM only"; "none" without access.
 * Presence at the Table (tokens, turn order) is not a sheet read and stays as it is.
 */
export function sheetAccess(state, actor, viewer) {
  if (!actor || !canViewActor(actor, viewer, state)) return "none";
  if (!playable(actor) || actor.owner === viewer || canControlActor(actor, viewer, state))
    return "full";
  if (campaignIdsOf(actor).some((id) => isManager(state, id, viewer))) return "full";
  return privacyOf(state, actor.id) === "private" ? "summary" : "read";
}
const reads = (access) => access === "full" || access === "read";
// B20 (PG-94, campaign-settings): the DM edits a player's sheet only while its owner allows
// it. The shell applies it through ctx.canControl on the sheet; B21 commands that change a
// sheet (restore, save a revision) apply the same policy here, for every campaign of it.
function dmEditLocked(state, actor, who) {
  const slice = state.ext?.["campaign-settings"];
  if (!slice?.campaigns || !actor) return false;
  return campaignIdsOf(actor).some((id) => sheetLockedFor(campaignPolicy(slice, id), actor, who));
}
function requireSheetEdit(state, actor, who) {
  if (!actor || !canControlActor(actor, who, state))
    refuse("Non puoi modificare questa scheda.", "You cannot edit this sheet.");
  if (dmEditLocked(state, actor, who))
    refuse(
      `Modifica riservata a chi gioca ${actor.name}: chiedi l’autorizzazione dalla scheda (Azioni › Modifiche del DM).`,
      `Editing reserved to ${actor.name}’s player: ask for authorization on the sheet (Actions › DM edits).`,
    );
}

/** What each audience sees of a sheet under its privacy level (DDB-061/062). */
export function audienceAccess(state, actorId, level = privacyOf(state, actorId)) {
  const actor = state.actors?.[actorId];
  const inCampaign = campaignIdsOf(actor).length > 0;
  return {
    owner: "full",
    dm: inCampaign ? "full" : "none",
    players: inCampaign ? (level === "private" ? "summary" : "read") : "none",
    link: level === "public" ? "read" : "none",
  };
}
/** The public link: {status: "ok"|"revoked"|"private"|"unknown", actorId}. */
export function resolveLink(state, code) {
  const slice = sliceOf(state);
  if (!slice || typeof code !== "string" || !code) return { status: "unknown" };
  for (const [actorId, entry] of Object.entries(slice.entries)) {
    if (entry.link?.code === code) {
      if (!state.actors?.[actorId]) return { status: "revoked", actorId };
      return entry.privacy === "public"
        ? { status: "ok", actorId }
        : { status: "private", actorId };
    }
    if (entry.revoked?.includes(code)) return { status: "revoked", actorId };
  }
  return { status: "unknown" };
}
export function linkUrl(code, base = null) {
  const origin =
    base ?? (globalThis.location ? globalThis.location.origin + globalThis.location.pathname : "");
  return `${origin}#${ROUTE_LINK}?id=${encodeURIComponent(code)}`;
}
function newCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  const chars = [...bytes].map((byte) => alphabet[byte % 32]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8)}`;
}

function speciesName(actor) {
  return X.speciesOf(actor)?.name ?? null;
}
function createdAtOf(state, actor, observed) {
  const entry = sliceOf(state)?.entries?.[actor.id];
  if (entry?.createdAt) return entry.createdAt;
  const built = (state.characterBuildOperations ?? []).find(
    (op) => op.actorId === actor.id && op.kind === "create",
  );
  return (
    built?.appliedAt ??
    actor.premade?.at ??
    actor.copiedFrom?.at ??
    actor.imported?.at ??
    observed?.[actor.id]?.first ??
    null
  );
}
/**
 * Search text: name, class (sheet and catalog names), species and campaigns. The level is
 * matched by number (matchesQuery), so "liv" finds Livia, not every "livello". A viewer who
 * reads only the summary searches only what the summary shows (no species).
 */
export function searchText(state, actor, { summary = false } = {}) {
  const classes = X.classesOf(actor);
  const species = summary ? null : speciesName(actor);
  return fold(
    [
      actor.name,
      pick(actor.className, "it"),
      pick(actor.className, "en"),
      ...classes.flatMap((row) => (row.name ? [row.name.it, row.name.en] : [])),
      species ? `${species.it} ${species.en}` : "",
      ...campaignIdsOf(actor).map((id) => campaignName(state, id)),
    ].join(" "),
  );
}
const LEVEL_WORD = /^(livello|level|liv|lvl|lv)$/;
/**
 * DDB My Characters search by name, level, class, species or campaign: every word must
 * match. A number matches the level (or text); "livello 5", "level 5", "liv 5" match the
 * level only; any other word matches the search text.
 */
export function matchesQuery(haystack, level, query) {
  const words = fold(query).trim().split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    if (LEVEL_WORD.test(word) && /^\d+$/.test(words[i + 1] ?? "")) {
      if (Number(words[i + 1]) !== Number(level)) return false;
      i += 1;
    } else if (/^\d+$/.test(word)) {
      if (Number(word) !== Number(level) && !haystack.includes(word)) return false;
    } else if (!haystack.includes(word)) return false;
  }
  return true;
}
// "Released by" is news while the campaign's seat waits for a player (B13 Claim); once
// someone claims it, the badge goes (the record stays on the sheet).
function releasedPending(state, actor) {
  const released = actor.released ?? null;
  if (!released || !sliceOfMembers(state)) return released;
  const seat = members.rosterOf(state, released.campaignId).find((row) => row.actorId === actor.id);
  return seat?.status === "unassigned" ? released : null;
}
export function rowOf(state, actor, viewer, observed = {}) {
  const entry = sliceOf(state)?.entries?.[actor.id] ?? null;
  const pending = arrayOf(sliceOf(state)?.transfers).find(
    (row) => row.actorId === actor.id && row.status === "pending",
  );
  const createdAt = createdAtOf(state, actor, observed);
  const access = sheetAccess(state, actor, viewer);
  const summary = access === "summary";
  return {
    id: actor.id,
    name: actor.name,
    kind: actor.kind,
    companion: Boolean(actor.companion),
    own: actor.owner === viewer,
    control: canControlActor(actor, viewer, state),
    access,
    level: Number(actor.level) || 0,
    className: actor.className,
    species: summary ? null : speciesName(actor),
    campaigns: campaignIdsOf(actor).map((id) => ({ id, name: campaignName(state, id) })),
    privacy: entry?.privacy ?? "campaign",
    linkActive: Boolean(entry?.link) && entry?.privacy === "public",
    createdAt,
    modifiedAt: observed?.[actor.id]?.at ?? createdAt,
    hp: summary ? null : actor.hp,
    maxHp: summary ? null : actor.maxHp,
    // F13: the sheet's AC (worn items such as the Cloak of Protection included).
    ac: summary ? null : (getEffectiveActor(actor)?.ac ?? actor.ac),
    copiedFrom: actor.copiedFrom ?? null,
    imported: Boolean(actor.imported),
    released: releasedPending(state, actor),
    pendingTransfer: pending ?? null,
    haystack: searchText(state, actor, { summary }),
  };
}
const time = (value) => (value ? Date.parse(value) : NaN);
export function sortRows(rows, sort = DEFAULT_SORT) {
  const [key, direction] = (SORTS.includes(sort) ? sort : DEFAULT_SORT).split("-");
  const sign = direction === "asc" ? 1 : -1;
  const byName = (a, b) => a.name.localeCompare(b.name, "it", { sensitivity: "base" });
  const byTime = (field) => (a, b) => {
    const x = time(a[field]);
    const y = time(b[field]);
    if (Number.isNaN(x) && Number.isNaN(y)) return byName(a, b);
    if (Number.isNaN(x)) return 1;
    if (Number.isNaN(y)) return -1;
    return (x - y) * sign || byName(a, b);
  };
  const compare = {
    created: byTime("createdAt"),
    modified: byTime("modifiedAt"),
    name: (a, b) => byName(a, b) * sign,
    level: (a, b) => (a.level - b.level) * sign || byName(a, b),
  }[key];
  return rows.sort(compare);
}
/** The library for one identity: own playable sheets, the others it can read, the trash. */
export function libraryRows(
  state,
  viewer,
  { query = "", sort = DEFAULT_SORT, observed = {} } = {},
) {
  const rows = Object.values(state.actors ?? {})
    .filter((actor) => actor && canViewActor(actor, viewer, state))
    .map((actor) => rowOf(state, actor, viewer, observed));
  const visible = rows.filter((row) => matchesQuery(row.haystack, row.level, query));
  sortRows(visible, sort);
  return {
    mine: visible.filter((row) => row.own && row.kind === "character" && !row.companion),
    others: visible.filter((row) => !(row.own && row.kind === "character" && !row.companion)),
    total: rows.length,
    matched: visible.length,
    trash: arrayOf(sliceOf(state)?.trash)
      .filter((row) => row.deletedBy === viewer)
      .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt)),
  };
}

// ---------------------------------------------------------------- commands: copy

const TRANSIENT = [
  "personalPlans",
  "futurePlan",
  "activeForm",
  "pendingHealing",
  "concentration",
  "companionIds",
  "combatEffects",
  "deathSaves",
  "conditions",
  "hidden",
  "copiedFrom",
  "imported",
  "released",
  "premade",
];
function copiedActor(state, source, { name, owner, now }) {
  const actor = copy(source);
  for (const key of TRANSIENT) delete actor[key];
  const id = newId("character");
  Object.assign(actor, {
    id,
    name,
    owner,
    controllers: [],
    visibility: "private",
    campaignIds: [],
    conditions: [],
    movement: actor.speed ?? actor.movement ?? 0,
    movementSpent: 0,
    dashCount: 0,
    action: true,
    bonus: true,
    reaction: true,
    copiedFrom: { actorId: source.id, name: source.name, at: iso(now) },
  });
  if (actor.spellSlots?.[1]) actor.slots = actor.spellSlots[1];
  state.actors[id] = actor;
  const slice = mutableSlice(state);
  slice.entries[id] = { createdAt: iso(now), privacy: "private", link: null, revoked: [] };
  return actor;
}
function cleanName(value, fallback) {
  const name = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!name) return fallback;
  if (name.length > 60)
    refuse(
      "Il nome può avere al massimo 60 caratteri.",
      "The name can have at most 60 characters.",
    );
  return name;
}
/**
 * Copy (R20-014, DDB-064, I-125): an independent personal sheet for the owner, outside
 * every campaign. Campaigns, tokens, turn state, active effects, companions and private
 * plans are not copied; the adventure log is copied when asked.
 */
// PG-88 (DDB copy-and-change, Roll20 «Copy» with a sheet choice): the copy's target rules.
// «2024» drops the options recorded from the 2014 rules; «2024-legacy» keeps them (a copy
// that keeps them stays personal while a campaign blocks legacy content).
export const COPY_RULES = Object.freeze(["2024", "2024-legacy"]);
function applyCopyRules(actor, rules) {
  const build = actor.characterBuild?.data;
  if (!build) return [];
  const legacy = legacyRecords(actor);
  build.sources = { ...(build.sources ?? {}), legacy2014: rules === "2024-legacy" };
  if (rules !== "2024" || !legacy.length) return [];
  const ids = new Set(legacy.map((row) => row.id));
  build.features.custom = arrayOf(build.features.custom).filter((row) => !ids.has(row.id));
  actor.features = arrayOf(actor.features).filter((row) => !ids.has(row.id));
  return legacy;
}
/** What the copy becomes under the chosen rules, revalidated by the builder itself. */
export function copyRulesPreview(state, actorId, who, rules = "2024", now = Date.now()) {
  const source = state.actors?.[actorId];
  requireOwner(source, who);
  requirePlayable(source);
  if (!COPY_RULES.includes(rules))
    refuse("Scegli le regole della copia.", "Choose the copy's rules.");
  const removed = rules === "2024" ? legacyRecords(source).map((row) => copy(row.name)) : [];
  if (!source.characterBuild?.data)
    return { rules, removed, errors: [], warnings: [], checked: false };
  const scratch = structuredClone(state);
  const copyActor = copiedActor(scratch, scratch.actors[actorId], {
    name: source.name,
    owner: who,
    now,
  });
  applyCopyRules(copyActor, rules);
  const draftId = "clib-copy-rules-preview";
  createCharacterDraft(scratch, { id: draftId, kind: "revise", actorId: copyActor.id }, who);
  const preview = previewCharacterDraft(scratch, draftId, who);
  const unique = (list) => [
    ...new Map(list.map((row) => [row.it, { it: row.it, en: row.en }])).values(),
  ];
  return {
    rules,
    removed,
    errors: unique(preview.errors ?? []),
    warnings: unique(
      (preview.warnings ?? []).filter((row) => row.code !== "manual-feature-resolution"),
    ),
    checked: true,
  };
}
export function copyCharacter(
  state,
  actorId,
  who,
  { name, includeLog = true, rules = null, now = Date.now() } = {},
) {
  const source = state.actors?.[actorId];
  requireOwner(source, who);
  requirePlayable(source);
  if (rules !== null && !COPY_RULES.includes(rules))
    refuse("Scegli le regole della copia.", "Choose the copy's rules.");
  const actor = copiedActor(state, source, {
    name: cleanName(name, `${source.name} (copia)`),
    owner: who,
    now,
  });
  if (rules) {
    applyCopyRules(actor, rules);
    actor.copiedFrom.rules = rules;
  }
  const slice = mutableSlice(state);
  if (includeLog && slice.logs[actorId]?.length)
    slice.logs[actor.id] = copy(slice.logs[actorId]).map((row) => ({ ...row, id: newId("log") }));
  pushRevision(state, actor.id, who, now, "copy", {
    it: `Copiata da ${source.name}`,
    en: `Copied from ${source.name}`,
  });
  return actor.id;
}

// ---------------------------------------------------------------- commands: delete, trash

function removeTokens(state, actorId) {
  const removed = [];
  for (const scene of state.scenes ?? []) {
    const tokens = scene.tokens ?? [];
    tokens.forEach((token, index) => {
      if (token.actorId === actorId) removed.push({ sceneId: scene.id, index, token: copy(token) });
    });
    scene.tokens = tokens.filter((token) => token.actorId !== actorId);
  }
  return removed;
}
function removeFromIdleOrder(state, actorId) {
  const order = state.combat?.order ?? [];
  const index = order.indexOf(actorId);
  if (index < 0 || state.combat.active) return null;
  state.combat.order = order.filter((id) => id !== actorId);
  if (state.combat.turn >= state.combat.order.length) state.combat.turn = 0;
  return index;
}
// A departing sheet also leaves B13's seat record for that campaign, as B13 itself does
// when a member leaves with their characters (departMember/removeCampaignId).
function dropSeat(state, campaignId, actorId) {
  const meta = sliceOfMembers(state)?.campaigns?.[campaignId];
  if (meta?.seats?.[actorId]) delete meta.seats[actorId];
}
function withdrawPending(state, actorId, now, reason = "withdrawn") {
  for (const row of mutableSlice(state).transfers)
    if (row.actorId === actorId && row.status === "pending") {
      row.status = reason;
      row.decidedAt = iso(now);
    }
}
export function deletePreview(state, actorId) {
  const actor = state.actors?.[actorId];
  return {
    tokens: (state.scenes ?? []).reduce(
      (sum, scene) => sum + (scene.tokens ?? []).filter((t) => t.actorId === actorId).length,
      0,
    ),
    campaigns: campaignIdsOf(actor).map((id) => campaignName(state, id)),
    linkActive: privacyOf(state, actorId) === "public",
  };
}
/** Delete with confirmation (DDB-063): the sheet moves to the trash, restorable. */
export function deleteCharacter(state, actorId, who, now = Date.now()) {
  const actor = state.actors?.[actorId];
  requireOwner(actor, who);
  requirePlayable(actor);
  requireNotFighting(state, actorId);
  requireNoCompanions(state, actorId);
  const slice = mutableSlice(state);
  withdrawPending(state, actorId, now);
  const tokens = removeTokens(state, actorId);
  const orderIndex = removeFromIdleOrder(state, actorId);
  const seats = {};
  for (const campaignId of campaignIdsOf(actor)) {
    const seat = sliceOfMembers(state)?.campaigns?.[campaignId]?.seats?.[actorId];
    if (seat) seats[campaignId] = copy(seat);
    dropSeat(state, campaignId, actorId);
  }
  const trashId = newId("trash");
  slice.trash.push({
    id: trashId,
    actor: copy(actor),
    entry: copy(slice.entries[actorId] ?? null),
    tokens,
    orderIndex,
    seats,
    deletedAt: iso(now),
    deletedBy: who,
  });
  if (slice.entries[actorId]?.link) {
    slice.entries[actorId].revoked.push(slice.entries[actorId].link.code);
    slice.entries[actorId].link = null;
  }
  delete state.actors[actorId];
  return trashId;
}
export function restoreFromTrash(state, trashId, who, now = Date.now()) {
  const slice = mutableSlice(state);
  const row = slice.trash.find((entry) => entry.id === trashId);
  if (!row || row.deletedBy !== who)
    refuse("Questa scheda non è più nel cestino.", "This sheet is no longer in the trash.");
  let actor = copy(row.actor);
  if (state.actors[actor.id]) actor = { ...actor, id: newId("character") };
  state.actors[actor.id] = actor;
  const entry = row.entry ? copy(row.entry) : null;
  if (entry) {
    entry.privacy = entry.privacy === "public" ? "campaign" : entry.privacy;
    entry.link = null;
    slice.entries[actor.id] = { ...slice.entries[actor.id], ...entry };
  }
  for (const { sceneId, index, token } of row.tokens ?? []) {
    const scene = (state.scenes ?? []).find((item) => item.id === sceneId);
    if (!scene || scene.tokens.some((item) => item.id === token.id)) continue;
    scene.tokens.splice(Math.min(index, scene.tokens.length), 0, { ...token, actorId: actor.id });
  }
  if (
    Number.isInteger(row.orderIndex) &&
    !state.combat.active &&
    !state.combat.order.includes(actor.id)
  )
    state.combat.order.splice(Math.min(row.orderIndex, state.combat.order.length), 0, actor.id);
  for (const [campaignId, seat] of Object.entries(row.seats ?? {})) {
    const meta = sliceOfMembers(state)?.campaigns?.[campaignId];
    if (meta && !meta.seats[actor.id]) meta.seats[actor.id] = seat;
  }
  slice.trash = slice.trash.filter((entry) => entry.id !== trashId);
  pushRevision(state, actor.id, who, now, "restore-trash", {
    it: "Ripristinata dal cestino",
    en: "Restored from the trash",
  });
  return actor.id;
}
/** Irreversible outside Undo: removes the sheet and its library records. */
export function purgeFromTrash(state, trashId, who) {
  const slice = mutableSlice(state);
  const row = slice.trash.find((entry) => entry.id === trashId);
  if (!row || row.deletedBy !== who)
    refuse("Questa scheda non è più nel cestino.", "This sheet is no longer in the trash.");
  slice.trash = slice.trash.filter((entry) => entry.id !== trashId);
  const id = row.actor.id;
  if (!state.actors[id]) {
    delete slice.revisions[id];
    delete slice.logs[id];
    if (slice.entries[id])
      slice.entries[id] = { ...slice.entries[id], link: null, privacy: "private" };
  }
}

// ---------------------------------------------------------------- commands: privacy, link

export function setPrivacy(state, actorId, level, who, now = Date.now()) {
  const actor = state.actors?.[actorId];
  requireOwner(actor, who);
  requirePlayable(actor);
  if (!PRIVACY.includes(level)) refuse("Scegli un livello di privacy.", "Choose a privacy level.");
  const entry = entryOf(state, actorId);
  entry.privacy = level;
  if (level === "public" && !entry.link) entry.link = { code: newCode(), createdAt: iso(now) };
  return entry;
}
/** A new link code; the previous one stops working (revocation). */
export function regenerateLink(state, actorId, who, now = Date.now()) {
  const actor = state.actors?.[actorId];
  requireOwner(actor, who);
  const entry = entryOf(state, actorId);
  if (entry.privacy !== "public") refuse("La scheda non è pubblica.", "The sheet is not public.");
  if (entry.link) entry.revoked.push(entry.link.code);
  entry.link = { code: newCode(), createdAt: iso(now) };
  return entry.link.code;
}

// ---------------------------------------------------------------- commands: campaign

const inCurrentCampaign = (state, actor) =>
  Boolean(state.campaign?.id) && campaignIdsOf(actor).includes(state.campaign.id);
/**
 * DDB «Join with this character» / Roll20 «Add to Game» with the list of games (PG-85,
 * PG-89): every campaign this identity plays or runs, where the sheet is not yet — the
 * campaign in play first. An observer seat never takes a sheet.
 */
export function linkTargets(state, actorId, who) {
  const actor = state.actors?.[actorId];
  if (!actor) return [];
  const current = state.campaign?.id;
  const rows = sliceOfMembers(state)
    ? members
        .listCampaigns(state, who)
        .filter((row) => row.role && row.role !== "observer")
        .map((row) => ({ id: row.id, name: row.name, current: row.id === current }))
    : current && isCampaignMember(state, current, who)
      ? [{ id: current, name: campaignName(state, current), current: true }]
      : [];
  return rows
    .filter((row) => !campaignIdsOf(actor).includes(row.id))
    .sort((a, b) => Number(b.current) - Number(a.current));
}
// A campaign other than the one in play: the sheet joins it by id. Homebrew revisions are
// enabled per campaign, so a sheet that uses them joins from inside that campaign.
function joinOtherCampaign(state, actor, campaignId, who) {
  if (!linkTargets(state, actor.id, who).some((row) => row.id === campaignId))
    refuse(
      "Scegli una campagna in cui giochi o che guidi.",
      "Choose a campaign you play in or run.",
    );
  if (
    ["features", "spells", "inventory"].some((key) =>
      arrayOf(actor[key]).some((row) => row.homebrewRef),
    )
  )
    refuse(
      "La scheda usa contenuti homebrew: apri prima quella campagna, poi collegala da lì.",
      "The sheet uses homebrew content: open that campaign first, then link it from there.",
    );
  actor.campaignIds = [...new Set([...campaignIdsOf(actor), campaignId])];
  actor.visibility = "shared";
}
/**
 * Roll20 "Add to Game": the same sheet joins a campaign (live link), the one in play unless
 * another is chosen. Its earlier revisions stay readable by the owner only
 * (revisionReadable); the campaign's shared history starts with a revision of the sheet as
 * it joins (DEVELOPMENT increment 7).
 */
export function linkToCampaign(state, actorId, who, now = Date.now(), { campaignId } = {}) {
  const actor = state.actors?.[actorId];
  requireOwner(actor, who);
  requirePlayable(actor);
  const target = campaignId ?? state.campaign?.id;
  if (target !== state.campaign?.id) {
    joinOtherCampaign(state, actor, target, who);
    pushRevision(state, actorId, who, now, "link", {
      it: `Collegata a ${campaignName(state, target)}`,
      en: `Linked to ${campaignName(state, target)}`,
    });
    return target;
  }
  if (inCurrentCampaign(state, actor))
    refuse("La scheda è già nella campagna.", "The sheet is already in the campaign.");
  connectCharacterWithContent(state, actorId, who);
  pushRevision(state, actorId, who, now, "link", {
    it: `Collegata a ${campaignName(state, state.campaign.id)}`,
    en: `Linked to ${campaignName(state, state.campaign.id)}`,
  });
}
/** Roll20 "Import": a snapshot copy joins a campaign (the one in play unless another is
 *  chosen); the library sheet stays as it is. */
export function bringCopyToCampaign(
  state,
  actorId,
  who,
  { name, campaignId, now = Date.now() } = {},
) {
  const source = state.actors?.[actorId];
  requireOwner(source, who);
  requirePlayable(source);
  const target = campaignId ?? state.campaign.id;
  const other = target !== state.campaign?.id;
  if (
    other &&
    !(sliceOfMembers(state) ? members.listCampaigns(state, who) : []).some(
      (row) => row.id === target && row.role && row.role !== "observer",
    )
  )
    refuse(
      "Scegli una campagna in cui giochi o che guidi.",
      "Choose a campaign you play in or run.",
    );
  const actor = copiedActor(state, source, {
    name: cleanName(name, `${source.name} (${campaignName(state, target)})`),
    owner: who,
    now,
  });
  actor.copiedFrom.snapshotFor = target;
  if (other) joinOtherCampaign(state, actor, target, who);
  else connectCharacterWithContent(state, actor.id, who);
  mutableSlice(state).entries[actor.id].privacy = "campaign";
  pushRevision(state, actor.id, who, now, "copy", {
    it: `Istantanea di ${source.name} per ${campaignName(state, target)}`,
    en: `Snapshot of ${source.name} for ${campaignName(state, target)}`,
  });
  return actor.id;
}
/** DDB "Leave Campaign" for one character: the sheet stays in the owner's library. */
export function leaveCampaign(state, actorId, who, now = Date.now()) {
  const actor = state.actors?.[actorId];
  requireOwner(actor, who);
  requirePlayable(actor);
  if (!inCurrentCampaign(state, actor))
    refuse("La scheda non è nella campagna.", "The sheet is not in the campaign.");
  requireNotFighting(state, actorId);
  requireNoCompanions(state, actorId);
  const campaignId = state.campaign.id;
  actor.campaignIds = campaignIdsOf(actor).filter((id) => id !== campaignId);
  if (!actor.campaignIds.length) actor.visibility = "private";
  const tokens = removeTokens(state, actorId);
  removeFromIdleOrder(state, actorId);
  dropSeat(state, campaignId, actorId);
  withdrawPending(state, actorId, now);
  return { tokens: tokens.length };
}
/**
 * Roll20 "Release" (R20-015): the campaign keeps its sheet, now unassigned so another
 * player can claim it (B13 Claim, DDB-074); the owner keeps an independent copy.
 */
export function releaseCharacter(
  state,
  actorId,
  who,
  { keepCopy = true, name, now = Date.now() } = {},
) {
  const actor = state.actors?.[actorId];
  requireOwner(actor, who);
  requirePlayable(actor);
  if (!inCurrentCampaign(state, actor))
    refuse("La scheda non è nella campagna.", "The sheet is not in the campaign.");
  requireNotFighting(state, actorId);
  requireNoCompanions(state, actorId);
  const campaignId = state.campaign.id;
  const owner = campaignOwner(state, campaignId);
  if (owner === who)
    refuse(
      "Sei il DM di questa campagna: la scheda è già della campagna.",
      "You run this campaign: the sheet already belongs to it.",
    );
  const copyId = keepCopy
    ? copiedActor(state, actor, { name: cleanName(name, `${actor.name} (copia)`), owner: who, now })
        .id
    : null;
  // The releasing player's private plans are theirs: they move to the kept copy (without a
  // copy they are deleted, as the dialog says). Other identities' plans stay theirs.
  const plan = actor.personalPlans?.[who];
  if (copyId) {
    const kept = state.actors[copyId];
    if (plan !== undefined) kept.personalPlans = { [who]: copy(plan) };
    if (actor.futurePlan !== undefined) kept.futurePlan = copy(actor.futurePlan);
    const slice = mutableSlice(state);
    if (slice.logs[actorId]) slice.logs[copyId] = copy(slice.logs[actorId]);
    pushRevision(state, copyId, who, now, "copy", {
      it: `Copia conservata al rilascio in ${campaignName(state, campaignId)}`,
      en: `Copy kept when released to ${campaignName(state, campaignId)}`,
    });
  }
  if (sliceOfMembers(state)) {
    const row = members.rosterOf(state, campaignId).find((seat) => seat.actorId === actorId);
    if (row?.status === "active" && row.memberId === who)
      members.unassignSeat(state, campaignId, actorId, who, now);
  }
  actor.owner = owner;
  actor.controllers = arrayOf(actor.controllers).filter((id) => id !== who);
  actor.released = { by: who, at: iso(now), campaignId };
  if (actor.personalPlans) {
    delete actor.personalPlans[who];
    if (!Object.keys(actor.personalPlans).length) delete actor.personalPlans;
  }
  delete actor.futurePlan;
  const entry = entryOf(state, actorId);
  if (entry.link) entry.revoked.push(entry.link.code);
  entry.link = null;
  entry.privacy = "campaign";
  withdrawPending(state, actorId, now);
  return { copyId, owner };
}
/** Other campaigns the owner plays in (B13), where a sheet can be transferred. */
export function transferTargets(state, actorId, who) {
  const actor = state.actors?.[actorId];
  if (!actor || !sliceOfMembers(state)) return [];
  const current = campaignIdsOf(actor);
  return members
    .listCampaigns(state, who)
    .filter((row) => !current.includes(row.id) && row.role && row.role !== "observer")
    .map((row) => ({ id: row.id, name: row.name }));
}
export function requestTransfer(state, actorId, toCampaignId, who, now = Date.now()) {
  const actor = state.actors?.[actorId];
  requireOwner(actor, who);
  requirePlayable(actor);
  if (!inCurrentCampaign(state, actor))
    refuse("La scheda non è nella campagna.", "The sheet is not in the campaign.");
  if (!transferTargets(state, actorId, who).some((row) => row.id === toCampaignId))
    refuse(
      "Scegli una campagna di cui fai parte come giocatore.",
      "Choose a campaign you play in.",
    );
  const slice = mutableSlice(state);
  if (slice.transfers.some((row) => row.actorId === actorId && row.status === "pending"))
    refuse("C’è già un trasferimento in attesa.", "A transfer is already pending.");
  const request = {
    id: newId("transfer"),
    actorId,
    actorName: actor.name,
    from: state.campaign.id,
    fromName: campaignName(state, state.campaign.id),
    to: toCampaignId,
    toName: campaignName(state, toCampaignId),
    by: who,
    status: "pending",
    createdAt: iso(now),
    decidedAt: null,
    decidedBy: null,
  };
  slice.transfers.push(request);
  // Roll20 Transfer to a game you run: no one else has to accept, so it happens at once
  // (the dialog says so before confirming).
  if (isManager(state, toCampaignId, who)) answerTransfer(state, request.id, true, who, now);
  return request.id;
}
export function withdrawTransfer(state, transferId, who, now = Date.now()) {
  const row = mutableSlice(state).transfers.find((item) => item.id === transferId);
  if (!row || row.status !== "pending" || row.by !== who)
    refuse("Nessuna richiesta in attesa da ritirare.", "No pending request to withdraw.");
  row.status = "withdrawn";
  row.decidedAt = iso(now);
}
// Pending requests the destination's DM can answer — also one this identity sent to a
// campaign it runs (PG-89: such a request is never left waiting for nobody).
export function incomingTransfers(state, who) {
  return arrayOf(sliceOf(state)?.transfers).filter(
    (row) => row.status === "pending" && isManager(state, row.to, who),
  );
}
/** The destination DM accepts or declines; accepting moves the sheet (I-176, R20-014). */
export function answerTransfer(state, transferId, accept, who, now = Date.now()) {
  const row = mutableSlice(state).transfers.find((item) => item.id === transferId);
  if (!row || row.status !== "pending")
    refuse("La richiesta non è più in attesa.", "The request is no longer pending.");
  if (!isManager(state, row.to, who))
    refuse(
      "Solo il DM della campagna di destinazione può rispondere.",
      "Only the destination campaign’s DM can answer.",
    );
  row.decidedAt = iso(now);
  row.decidedBy = who;
  if (!accept) {
    row.status = "declined";
    return;
  }
  const actor = state.actors?.[row.actorId];
  if (!actor || actor.owner !== row.by || !campaignIdsOf(actor).includes(row.from))
    refuse(
      "La scheda è cambiata dopo la richiesta: chiedi di inviarla di nuovo.",
      "The sheet changed after the request: ask for it to be sent again.",
    );
  if (state.campaign?.id === row.from) requireNotFighting(state, row.actorId);
  actor.campaignIds = [...campaignIdsOf(actor).filter((id) => id !== row.from), row.to];
  actor.visibility = "shared";
  if (state.campaign?.id === row.from) {
    removeTokens(state, row.actorId);
    removeFromIdleOrder(state, row.actorId);
  }
  dropSeat(state, row.from, row.actorId);
  row.status = "accepted";
  // The destination's history starts here; revisions saved in the origin campaign stay
  // with the owner (I-176: no automatic access of the new DM to earlier material).
  pushRevision(state, row.actorId, who, now, "transfer", {
    it: `Trasferita da ${row.fromName} a ${row.toName}`,
    en: `Transferred from ${row.fromName} to ${row.toName}`,
  });
}

// ---------------------------------------------------------------- revisions

function pushRevision(state, actorId, who, now, kind, label) {
  const slice = mutableSlice(state);
  const list = (slice.revisions[actorId] ??= []);
  const n = (list.at(-1)?.n ?? 0) + 1;
  const actor = state.actors[actorId];
  const row = {
    id: newId("rev"),
    n,
    at: iso(now),
    by: who,
    kind,
    label,
    data: X.sheetData(actor),
    owner: actor.owner,
    campaignIds: [...campaignIdsOf(actor)],
  };
  list.push(row);
  if (list.length > MAX_REVISIONS) list.splice(0, list.length - MAX_REVISIONS);
  return row;
}
export function revisionsOf(state, actorId) {
  return arrayOf(sliceOf(state)?.revisions?.[actorId]);
}
/**
 * A revision is read by whoever owned the sheet when it was taken, and by the readers of
 * the sheet in a campaign it belonged to then and still belongs to now. So linking,
 * transferring or releasing a sheet never shows its earlier personal (or other-campaign)
 * history to a new DM or group. A revision without a recorded scope is the author's only.
 */
export function revisionReadable(state, actor, row, viewer) {
  if (!actor || !row) return false;
  if ((row.owner ?? row.by) === viewer) return true;
  const now = campaignIdsOf(actor);
  return (
    arrayOf(row.campaignIds).some((id) => now.includes(id)) &&
    reads(sheetAccess(state, actor, viewer))
  );
}
export function visibleRevisions(state, actorId, viewer) {
  const actor = state.actors?.[actorId];
  return revisionsOf(state, actorId).filter((row) => revisionReadable(state, actor, row, viewer));
}
export function saveRevision(state, actorId, who, { label = "", now = Date.now() } = {}) {
  const actor = state.actors?.[actorId];
  requireSheetEdit(state, actor, who);
  const clean = String(label ?? "")
    .trim()
    .slice(0, 80);
  return pushRevision(
    state,
    actorId,
    who,
    now,
    "manual",
    clean || { it: "Revisione salvata", en: "Saved revision" },
  );
}
const itemKey = (row) => row?.id ?? pick(row?.name, "en");
const FIELD_LABELS = {
  name: ["Nome", "Name"],
  className: ["Classe", "Class"],
  level: ["Livello", "Level"],
  maxHp: ["PF massimi", "Max HP"],
  hp: ["PF attuali", "Current HP"],
  ac: ["CA", "AC"],
  speed: ["Velocità", "Speed"],
  proficiencyBonus: ["Bonus di competenza", "Proficiency bonus"],
  description: ["Aspetto e descrizione", "Appearance and description"],
  backstory: ["Storia e legami", "Story and bonds"],
  notes: ["Annotazioni condivise", "Shared annotations"],
};
const ABILITY_LABELS = {
  str: ["Forza", "Strength"],
  dex: ["Destrezza", "Dexterity"],
  con: ["Costituzione", "Constitution"],
  int: ["Intelligenza", "Intelligence"],
  wis: ["Saggezza", "Wisdom"],
  cha: ["Carisma", "Charisma"],
};
/** Field-by-field differences between two sheet snapshots (sheetData shape). */
export function compareSheets(before = {}, after = {}) {
  const rows = [];
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  for (const key of [
    "name",
    "className",
    "level",
    "maxHp",
    "hp",
    "ac",
    "speed",
    "proficiencyBonus",
  ])
    if (!same(before[key], after[key]))
      rows.push({
        key,
        label: FIELD_LABELS[key],
        before: copy(before[key]),
        after: copy(after[key]),
      });
  for (const id of Object.keys(ABILITY_LABELS))
    if (!same(before.abilities?.[id], after.abilities?.[id]))
      rows.push({
        key: "abilities." + id,
        label: ABILITY_LABELS[id],
        before: before.abilities?.[id] ?? null,
        after: after.abilities?.[id] ?? null,
      });
  for (const [key, label] of [
    ["inventory", ["Oggetto", "Item"]],
    ["spells", ["Incantesimo", "Spell"]],
    ["features", ["Capacità", "Feature"]],
  ]) {
    const a = new Map(arrayOf(before[key]).map((row) => [itemKey(row), row]));
    const b = new Map(arrayOf(after[key]).map((row) => [itemKey(row), row]));
    for (const [id, row] of b)
      if (!a.has(id))
        rows.push({
          key: `${key}.${id}`,
          label,
          before: null,
          after: copy(row.name),
          change: "added",
          quantity: row.quantity,
        });
      else if (key === "inventory" && (a.get(id).quantity ?? 1) !== (row.quantity ?? 1))
        rows.push({
          key: `${key}.${id}`,
          label,
          before: a.get(id).quantity ?? 1,
          after: row.quantity ?? 1,
          change: "quantity",
          name: copy(row.name),
        });
    for (const [id, row] of a)
      if (!b.has(id))
        rows.push({
          key: `${key}.${id}`,
          label,
          before: copy(row.name),
          after: null,
          change: "removed",
        });
  }
  for (const [key, label] of [
    ["spellSlots", ["Slot incantesimo (massimi)", "Spell slots (maximum)"]],
    ["hitDice", ["Dadi Vita (massimi)", "Hit Dice (maximum)"]],
  ]) {
    const maxima = (value) =>
      Object.fromEntries(Object.entries(objectOf(value)).map(([k, row]) => [k, row?.max ?? 0]));
    if (!same(maxima(before[key]), maxima(after[key])))
      rows.push({ key, label, before: maxima(before[key]), after: maxima(after[key]) });
  }
  for (const key of ["description", "backstory", "notes"])
    if (!same(before[key] ?? "", after[key] ?? ""))
      rows.push({
        key,
        label: FIELD_LABELS[key],
        before: before[key] ?? "",
        after: after[key] ?? "",
        change: "text",
      });
  return rows;
}
// Restoring changes the sheet's definition; the live state of play stays (current HP within
// the restored maximum, spent resources, conditions, concentration): nothing that happened
// at the table is silently undone.
const RESTORED = [
  "name",
  "className",
  "level",
  "speciesId",
  "maxHp",
  "ac",
  "speed",
  "abilities",
  "savingThrows",
  "skills",
  "skillModifiers",
  "proficiencyBonus",
  "size",
  "creatureType",
  "inventory",
  "spells",
  "features",
  "description",
  "backstory",
  "notes",
  "buildSeed",
  "combatProfile",
];
/** FG Character Vault: restoring appends a new revision; no revision is ever removed. */
export function restoreRevision(state, actorId, revisionId, who, now = Date.now()) {
  const actor = state.actors?.[actorId];
  requireSheetEdit(state, actor, who);
  requireNotFighting(state, actorId);
  const target = visibleRevisions(state, actorId, who).find((row) => row.id === revisionId);
  if (!target) refuse("Revisione non trovata.", "Revision not found.");
  pushRevision(state, actorId, who, now, "auto", {
    it: `Prima del ripristino della revisione ${target.n}`,
    en: `Before restoring revision ${target.n}`,
  });
  const usedById = new Map(
    arrayOf(actor.features)
      .filter((row) => Object.hasOwn(row, "used"))
      .map((row) => [row.id, row.used]),
  );
  for (const key of RESTORED) {
    if (target.data[key] === undefined) delete actor[key];
    else actor[key] = copy(target.data[key]);
  }
  for (const feature of arrayOf(actor.features))
    if (usedById.has(feature.id)) feature.used = usedById.get(feature.id);
  for (const key of ["spellSlots", "hitDice"]) {
    const restored = objectOf(target.data[key]);
    const current = objectOf(actor[key]);
    const merged = {};
    for (const pool of new Set([...Object.keys(restored), ...Object.keys(current)]))
      merged[pool] = { max: restored[pool]?.max ?? 0, used: current[pool]?.used ?? 0 };
    if (Object.keys(merged).length) actor[key] = merged;
  }
  if (actor.spellSlots?.[1]) actor.slots = actor.spellSlots[1];
  if (Number.isFinite(actor.maxHp) && Number.isFinite(actor.hp))
    actor.hp = Math.min(actor.hp, actor.maxHp);
  return pushRevision(state, actorId, who, now + 1, "restore", {
    it: `Ripristino della revisione ${target.n}`,
    en: `Restored revision ${target.n}`,
  });
}

// ---------------------------------------------------------------- adventure log

export function logOf(state, actorId) {
  return arrayOf(sliceOf(state)?.logs?.[actorId]);
}
export function logTotals(rows) {
  return rows.reduce(
    (sum, row) => ({
      entries: sum.entries + 1,
      levels: sum.levels + (row.levels || 0),
      gold: Math.round((sum.gold + (row.gold || 0)) * 100) / 100,
      downtime: sum.downtime + (row.downtime || 0),
    }),
    { entries: 0, levels: 0, gold: 0, downtime: 0 },
  );
}
function logInput(input) {
  const row = X.sanitizeLogEntry({ ...input, id: input.id ?? newId("log") });
  if (!row)
    refuse(
      "Scrivi il titolo dell’avventura o della sessione.",
      "Enter the adventure or session title.",
    );
  for (const [key, min, max] of [
    ["levels", 0, 20],
    ["downtime", -365, 365],
  ])
    if (input[key] !== undefined && input[key] !== "" && !Number.isInteger(Number(input[key])))
      refuse(
        "Livelli e tempo libero sono numeri interi.",
        "Levels and downtime are whole numbers.",
      );
    else if (Number(input[key]) < min || Number(input[key]) > max)
      refuse(`Valore fuori intervallo (${min}–${max}).`, `Value out of range (${min}–${max}).`);
  if (input.date && !/^\d{4}-\d{2}-\d{2}$/.test(input.date))
    refuse("Data non valida.", "Invalid date.");
  return row;
}
export function addLogEntry(state, actorId, who, input) {
  requireOwner(state.actors?.[actorId], who);
  const row = logInput({
    ...input,
    levels: Number(input.levels || 0),
    gold: Number(input.gold || 0),
    downtime: Number(input.downtime || 0),
  });
  (mutableSlice(state).logs[actorId] ??= []).push(row);
  return row.id;
}
export function updateLogEntry(state, actorId, entryId, who, input) {
  requireOwner(state.actors?.[actorId], who);
  const rows = mutableSlice(state).logs[actorId] ?? [];
  const index = rows.findIndex((row) => row.id === entryId);
  if (index < 0) refuse("Voce non trovata.", "Entry not found.");
  rows[index] = logInput({
    ...input,
    id: entryId,
    levels: Number(input.levels || 0),
    gold: Number(input.gold || 0),
    downtime: Number(input.downtime || 0),
  });
}
export function deleteLogEntry(state, actorId, entryId, who) {
  requireOwner(state.actors?.[actorId], who);
  const slice = mutableSlice(state);
  const before = slice.logs[actorId]?.length ?? 0;
  slice.logs[actorId] = (slice.logs[actorId] ?? []).filter((row) => row.id !== entryId);
  if (slice.logs[actorId].length === before) refuse("Voce non trovata.", "Entry not found.");
}

// ---------------------------------------------------------------- import

/** Import Data (FVT-205) as a new personal sheet: never replaces an existing one. */
export function importCharacter(
  state,
  parsed,
  who,
  { name, fileName = "", now = Date.now() } = {},
) {
  if (!parsed?.ok) refuse("File non importabile.", "File cannot be imported.");
  const data = copy(parsed.character);
  const id = newId("character");
  const actor = {
    ...data,
    id,
    kind: "character",
    name: cleanName(name, data.name),
    owner: who,
    controllers: [],
    visibility: "private",
    campaignIds: [],
    movement: data.speed,
    movementSpent: 0,
    dashCount: 0,
    action: true,
    bonus: true,
    reaction: true,
    conditions: [],
    exhaustion: 0,
    inventory: data.inventory ?? [],
    spells: data.spells ?? [],
    features: data.features ?? [],
    vitalityPolicy: data.vitalityPolicy ?? characterZeroHpPolicy(),
    imported: {
      at: iso(now),
      fileName: String(fileName).slice(0, 120),
      format: parsed.origin?.format ?? X.FILE_FORMAT,
      ...(parsed.origin?.sourceId ? { sourceId: parsed.origin.sourceId } : {}),
    },
    source: {
      kind: "imported-file",
      edition: "2024",
      revision: `file-${X.FILE_VERSION}`,
      note:
        parsed.origin?.format === "foundry-dnd5e"
          ? "Imported from a Foundry VTT dnd5e actor (mapped fields only)."
          : "Imported from a d20 Studio character file.",
    },
  };
  if (actor.spellSlots?.[1]) actor.slots = actor.spellSlots[1];
  if (actor.buildSeed?.classes?.length)
    updateCharacterRestProfile(
      actor,
      { classes: actor.buildSeed.classes, origin: { speciesId: actor.speciesId ?? null } },
      {},
    );
  state.actors[id] = actor;
  const slice = mutableSlice(state);
  slice.entries[id] = { createdAt: iso(now), privacy: "private", link: null, revoked: [] };
  if (parsed.adventureLog?.length)
    slice.logs[id] = parsed.adventureLog.map((row) => ({ ...row, id: newId("log") }));
  pushRevision(state, id, who, now, "import", {
    it: `Importata da file${fileName ? ` (${fileName})` : ""}`,
    en: `Imported from file${fileName ? ` (${fileName})` : ""}`,
  });
  return id;
}

// PG-92 (ddb-importer «Update»): an own sheet imported from the same Foundry actor is
// updated from a newer export — the mapped fields only; spent resources, conditions,
// campaigns, privacy and history stay. Current HP is kept within the new maximum.
export function importedFrom(state, parsed, who) {
  const sourceId = parsed?.origin?.sourceId;
  if (!sourceId) return [];
  return Object.values(state.actors ?? {}).filter(
    (actor) => actor?.owner === who && actor.imported?.sourceId === sourceId && playable(actor),
  );
}
export function updateFromFile(
  state,
  actorId,
  parsed,
  who,
  { fileName = "", now = Date.now() } = {},
) {
  const actor = state.actors?.[actorId];
  requireOwner(actor, who);
  requirePlayable(actor);
  if (
    !parsed?.ok ||
    !parsed.origin?.sourceId ||
    actor.imported?.sourceId !== parsed.origin.sourceId
  )
    refuse(
      "Il file non viene dallo stesso personaggio: importalo come nuovo.",
      "The file does not come from the same character: import it as a new one.",
    );
  const data = copy(parsed.character);
  for (const key of [
    "className",
    "level",
    "abilities",
    "maxHp",
    "ac",
    "speed",
    "inventory",
    "spells",
    "features",
    "skills",
    "savingThrows",
    "spellSlots",
    "hitDice",
    "buildSeed",
    "description",
    "backstory",
    "personality",
  ])
    if (data[key] !== undefined) actor[key] = data[key];
  actor.hp = Math.min(actor.hp ?? data.hp, actor.maxHp);
  actor.imported = { ...actor.imported, at: iso(now), fileName: String(fileName).slice(0, 120) };
  pushRevision(state, actorId, who, now, "import", {
    it: `Aggiornata da file${fileName ? ` (${fileName})` : ""}`,
    en: `Updated from file${fileName ? ` (${fileName})` : ""}`,
  });
  return actorId;
}

// ---------------------------------------------------------------- device observations

// Modified time (DDB sort "Modified") and first sight of sheets created elsewhere: the
// library observes each accepted change on this device. Kept in this browser's storage
// like the sort choice; not shared data and never part of Undo.
const OBSERVED_KEY = "d20-character-library-observed-v1";
let memoryObserved = {};
function storage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
export function readObserved() {
  try {
    const raw = storage()?.getItem(OBSERVED_KEY);
    return raw ? JSON.parse(raw) : memoryObserved;
  } catch {
    return memoryObserved;
  }
}
function writeObserved(map) {
  memoryObserved = map;
  try {
    storage()?.setItem(OBSERVED_KEY, JSON.stringify(map));
  } catch {
    /* memory only */
  }
}
export function resetObserved() {
  memoryObserved = {};
  try {
    storage()?.removeItem(OBSERVED_KEY);
  } catch {
    /* ignore */
  }
}
function hash(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}
/** Updates the observation map: new sheets get a first-sight time, changed ones a modified time. */
export function observe(state, now = Date.now(), map = readObserved()) {
  const next = { ...map };
  let changed = false;
  for (const actor of Object.values(state?.actors ?? {})) {
    if (!actor) continue;
    const h = hash(JSON.stringify(X.sheetData(actor)));
    const row = next[actor.id];
    if (!row) {
      next[actor.id] = { h, first: iso(now), at: null };
      changed = true;
    } else if (row.h !== h) {
      next[actor.id] = { ...row, h, at: iso(now) };
      changed = true;
    }
  }
  if (changed) writeObserved(next);
  return next;
}

// ================================================================ UI

const ui = {
  query: "",
  notice: null,
  importError: null,
  trashOpen: false,
  focus: null,
  compare: {},
  tabNotice: null,
};
/** Transient view state (tests read it; the app resets it on role change and example reset). */
export const libraryView = ui;
export function resetLibraryView() {
  ui.query = "";
  ui.notice = null;
  ui.importError = null;
  ui.trashOpen = false;
  ui.focus = null;
  ui.compare = {};
  ui.tabNotice = null;
}
// Undo stays next to the change it reverses (snackbar pattern): only while that change is
// still the latest one this identity can undo.
function undoButton(ctx, label) {
  if (!label || !ctx.canUndo?.() || ctx.undoLabel?.() !== label) return "";
  return `<button type="button" class="button" data-clib-act="undo">${ctx.t("Annulla", "Undo")}</button>`;
}
function renderTabNotice(ctx, actorId, tab) {
  const notice = ui.tabNotice;
  if (!notice || notice.actorId !== actorId || notice.tab !== tab) return "";
  return `<div class="clib-notice" role="status" data-clib-tab-notice>${ctx.esc(say(ctx, notice.text))} ${undoButton(ctx, notice.label)}</div>`;
}
const T = (ctx, it, en) => ctx.t(it, en);
const say = (ctx, value) => (isObject(value) ? pick(value, ctx.lang) : String(value ?? ""));
function refusalText(ctx, error) {
  if (error?.it && error?.en) return ctx.t(error.it, error.en);
  return error?.message ?? String(error);
}
function attempt(ctx, fn) {
  try {
    return fn();
  } catch (error) {
    ctx.toast(refusalText(ctx, error), true);
    return null;
  }
}
// Personal sheets change privately (allowed offline); campaign sheets are shared changes.
function commitFor(ctx, actor, label, mutator) {
  return ctx.commit(
    label,
    mutator,
    actor && actor.visibility === "private" ? { local: true, visibility: "private" } : {},
  );
}
function dateText(ctx, value) {
  if (!value) return ctx.t("data sconosciuta", "unknown date");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return ctx.esc(value);
  return date.toLocaleDateString(ctx.lang === "it" ? "it-IT" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function dateTimeText(ctx, value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(ctx.lang === "it" ? "it-IT" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function whoName(ctx, id) {
  return members.personName(ctx.state, id, ctx.lang);
}
function portrait(ctx, actor, size = "", initialOf = null) {
  if (!actor)
    return `<span class="clib-portrait ${size}" aria-hidden="true">${ctx.esc(String(initialOf ?? "?").slice(0, 1))}</span>`;
  const art = portraitArt(ctx.state, actor.id);
  if (art?.asset && canSeeAsset(ctx.state, art.asset, actor.owner) && art.asset.kind !== "pdf") {
    const url = mediaSrc(art.asset);
    if (url)
      return `<span class="clib-portrait ${size}" aria-hidden="true"><img src="${ctx.esc(url)}" alt=""></span>`;
  }
  return `<span class="clib-portrait ${size}" aria-hidden="true">${ctx.esc(String(actor?.name ?? "?").slice(0, 1))}</span>`;
}
function classLine(ctx, actor, { species: withSpecies = true } = {}) {
  const rows = X.classesOf(actor).filter((row) => row.name);
  const cls =
    rows.length > 1
      ? rows.map((row) => `${say(ctx, row.name)} ${row.level}`).join(" / ")
      : say(ctx, actor.className);
  const species = withSpecies ? speciesName(actor) : null;
  return [
    cls,
    `${ctx.t("Livello", "Level")} ${actor.level ?? "—"}`,
    species ? say(ctx, species) : "",
  ]
    .filter(Boolean)
    .map((part) => ctx.esc(part))
    .join(" · ");
}
// DDB-061's three levels, named by who reads the sheet. "Personal" is not a level: it is a
// sheet outside every campaign (the core's visibility "private"), read by its owner only
// (and by a link when public); its level applies once it joins a campaign.
const PRIVACY_TEXT = {
  campaign: ["Solo campagna", "Campaign only"],
  private: ["Solo giocatore e DM", "Player and DM only"],
  public: ["Pubblica con link", "Public by link"],
  personal: ["Personale", "Personal"],
};
const PRIVACY_ICON = { campaign: "◎", private: "🔒︎", public: "🔗︎", personal: "👤︎" };
function badgeLevel(actor, level) {
  return level !== "public" && actor && !campaignIdsOf(actor).length ? "personal" : level;
}
function privacyBadge(ctx, level, actor = null) {
  const shown = badgeLevel(actor, level);
  return `<span class="badge clib-privacy" data-privacy="${shown}"><span aria-hidden="true">${PRIVACY_ICON[shown]}</span> ${ctx.t(...PRIVACY_TEXT[shown])}</span>`;
}
function sortLabel(ctx, sort) {
  return {
    "created-desc": ctx.t("Creazione: più recenti", "Created: newest"),
    "created-asc": ctx.t("Creazione: meno recenti", "Created: oldest"),
    "name-asc": ctx.t("Nome: A → Z", "Name: A → Z"),
    "name-desc": ctx.t("Nome: Z → A", "Name: Z → A"),
    "level-desc": ctx.t("Livello: dal più alto", "Level: highest first"),
    "level-asc": ctx.t("Livello: dal più basso", "Level: lowest first"),
    "modified-desc": ctx.t("Modifica: più recenti", "Modified: newest"),
    "modified-asc": ctx.t("Modifica: meno recenti", "Modified: oldest"),
  }[sort];
}
function currentSort(ctx) {
  try {
    return ctx.registry?.getSetting(ctx, SORT_KEY) ?? DEFAULT_SORT;
  } catch {
    return DEFAULT_SORT;
  }
}
// D&D Beyond «My Characters»: the card's commands are text links in its footer (VIEW, EDIT,
// COPY, DELETE; DELETE in red), not a filled button per card.
const cardLink = (ctx, act, id, label, extra = "", danger = false) =>
  `<button type="button" class="text-button clib-link${danger ? " is-danger" : ""}" data-clib-act="${act}" data-actor="${ctx.esc(id)}" ${extra}>${label}</button>`;

function renderCard(ctx, row) {
  const actor = ctx.state.actors[row.id];
  const badges = [];
  if (row.kind === "npc") badges.push(`<span class="badge">${ctx.t("PNG", "NPC")}</span>`);
  if (row.companion)
    badges.push(`<span class="badge">${ctx.t("Creatura compagna", "Companion")}</span>`);
  // D&D Beyond's card line under the class: «Campaign: …».
  let campaignLine = "";
  if (row.kind === "character" && !row.companion) {
    campaignLine = row.campaigns.length
      ? row.campaigns
          .map(
            (c) =>
              `<p class="clib-campaign">${ctx.t("Campagna", "Campaign")}: <strong>${ctx.esc(c.name)}</strong></p>`,
          )
          .join("")
      : `<p class="clib-campaign" data-clib-personal>${ctx.t("Solo nella libreria", "Library only")}</p>`;
    badges.push(privacyBadge(ctx, row.privacy, actor));
  }
  badges.push(
    `<span class="badge">${row.own ? ctx.t("Tua", "Yours") : row.control ? ctx.t("Controllo", "Control") : ctx.t("Consultazione", "View only")}</span>`,
  );
  if (row.copiedFrom)
    badges.push(
      `<span class="badge">${ctx.t("Copia di", "Copy of")} ${ctx.esc(row.copiedFrom.name)}</span>`,
    );
  if (row.imported) badges.push(`<span class="badge">${ctx.t("Importata", "Imported")}</span>`);
  if (row.released && !row.own)
    badges.push(
      `<span class="badge">${ctx.t("Rilasciata da", "Released by")} ${ctx.esc(whoName(ctx, row.released.by))}</span>`,
    );
  if (row.pendingTransfer)
    badges.push(
      `<span class="badge clib-pending">${ctx.t("In attesa di", "Awaiting")} ${ctx.esc(row.pendingTransfer.toName)}</span>`,
    );
  const own = row.own && row.kind === "character" && !row.companion;
  const summary = row.access === "summary";
  // DDB-062: a reader opens the sheet without commands; Manage (privacy, files, copy,
  // campaign) is the owner's, as DDB's Manage. A summary reader gets no sheet to open.
  // D&D Beyond's footer order: View, Edit (here Manage: privacy, files, campaign), Copy,
  // Delete.
  const actions = [
    summary
      ? ""
      : `<button type="button" class="text-button clib-link" data-character-action="open" data-actor="${ctx.esc(row.id)}" aria-describedby="clib-name-${ctx.esc(row.id)}">${ctx.t("Apri scheda", "Open sheet")}</button>`,
    own
      ? cardLink(
          ctx,
          "manage",
          row.id,
          ctx.t("Gestisci", "Manage"),
          `aria-label="${ctx.esc(ctx.t(`Gestisci ${row.name}`, `Manage ${row.name}`))}"`,
        )
      : "",
    own
      ? cardLink(
          ctx,
          "copy",
          row.id,
          ctx.t("Copia", "Copy"),
          `aria-label="${ctx.esc(ctx.t(`Copia ${row.name}`, `Copy ${row.name}`))}"`,
        )
      : "",
    own
      ? cardLink(
          ctx,
          "delete",
          row.id,
          ctx.t("Elimina", "Delete"),
          `aria-label="${ctx.esc(ctx.t(`Elimina ${row.name}`, `Delete ${row.name}`))}"`,
          true,
        )
      : "",
  ].join("");
  const fresh = ui.notice?.actorId === row.id ? " clib-fresh" : "";
  const meta = summary
    ? `${ctx.t("Giocatore", "Player")}: ${ctx.esc(whoName(ctx, actor.owner))} · ${ctx.t("Scheda riservata a chi la gioca e al DM", "Sheet reserved to its player and the DM")}`
    : `${ctx.t("PF", "HP")} ${row.hp ?? "—"}/${row.maxHp ?? "—"} · ${ctx.t("CA", "AC")} ${row.ac ?? "—"} · ${ctx.t("Creata", "Created")} ${dateText(ctx, row.createdAt)}`;
  return `<article class="panel clib-card${fresh}" data-clib-card="${ctx.esc(row.id)}" data-context-menu="${ctx.esc(row.name)}" data-character-card data-search="${ctx.esc(row.haystack)}" data-clib-haystack="${ctx.esc(row.haystack)}" data-level="${row.level}" data-clib-access="${row.access}">${summary ? portrait(ctx, null, "", actor.name) : portrait(ctx, actor)}<div class="clib-card-body"><h3 id="clib-name-${ctx.esc(row.id)}">${ctx.esc(row.name)}</h3><p class="clib-sub">${classLine(ctx, actor, { species: !summary })}</p>${campaignLine}<p class="muted clib-meta">${meta}</p><div class="clib-badges">${badges.join("")}</div></div>${actions ? `<div class="clib-actions">${actions}</div>` : ""}</article>`;
}
function renderDrafts(ctx) {
  const drafts = arrayOf(ctx.state.characterDrafts).filter(
    (draft) => draft.owner === ctx.role && draft.status === "active",
  );
  if (!drafts.length) return "";
  const names = {
    create: ["Creazione", "Creation"],
    reconstruct: ["Ricostruzione", "Reconstruction"],
    advance: ["Avanzamento", "Advancement"],
    revise: ["Rivedi scelte", "Revise choices"],
  };
  return `<section class="panel clib-drafts"><h2>${ctx.t("Le tue bozze private", "Your private drafts")}</h2><div class="item-list">${drafts
    .map(
      (draft) =>
        `<div class="item-row"><div><strong>${ctx.esc(draft.data?.identity?.name || ctx.state.actors[draft.actorId]?.name || ctx.t("Personaggio senza nome", "Unnamed character"))}</strong><p class="muted">${ctx.t(...(names[draft.kind] ?? names.create))}</p></div><button type="button" class="button" data-character-action="resume-build" data-draft="${ctx.esc(draft.id)}">${ctx.t("Riprendi bozza", "Resume draft")}</button></div>`,
    )
    .join("")}</div></section>`;
}
function renderTransfers(ctx) {
  const incoming = incomingTransfers(ctx.state, ctx.role);
  if (!incoming.length) return "";
  return `<section class="panel clib-transfers" aria-labelledby="clib-transfers-title"><h2 id="clib-transfers-title">${ctx.t("Trasferimenti da accettare", "Transfers to accept")}</h2><ul class="clib-plain">${incoming
    .map(
      (row) =>
        `<li class="item-row"><div><strong>${ctx.esc(row.actorName)}</strong><p class="muted">${ctx.esc(ctx.t(`${whoName(ctx, row.by)} chiede di spostare la scheda da ${row.fromName} a ${row.toName}.`, `${whoName(ctx, row.by)} asks to move the sheet from ${row.fromName} to ${row.toName}.`))}</p></div><div class="toolbar"><button type="button" class="button primary" data-clib-act="accept-transfer" data-transfer="${ctx.esc(row.id)}">${ctx.t("Accetta", "Accept")}</button><button type="button" class="button" data-clib-act="decline-transfer" data-transfer="${ctx.esc(row.id)}">${ctx.t("Rifiuta", "Decline")}</button></div></li>`,
    )
    .join("")}</ul></section>`;
}
function renderNotice(ctx) {
  const notice = ui.notice;
  if (!notice) return "";
  let body = "";
  if (
    notice.kind === "trashed" &&
    sliceOf(ctx.state)?.trash.some((row) => row.id === notice.trashId)
  )
    body = `<span>${ctx.esc(ctx.t(`${notice.name} è nel cestino.`, `${notice.name} is in the trash.`))}</span> <button type="button" class="button" data-clib-act="restore" data-trash="${ctx.esc(notice.trashId)}">${ctx.t("Ripristina", "Restore")}</button>`;
  else if (notice.kind === "released" && ctx.state.actors[notice.actorId]) {
    const kept = notice.copyId ? ctx.state.actors[notice.copyId] : null;
    body = `<span>${ctx.esc(ctx.t(`${notice.name} resta in ${notice.campaign} come personaggio non assegnato.`, `${notice.name} stays in ${notice.campaign} as an unassigned character.`))}${kept ? ` ${ctx.t("La tua copia", "Your copy")}: <strong>${ctx.esc(kept.name)}</strong>.` : ""}</span>${kept ? ` <button type="button" class="button" data-character-action="open" data-actor="${ctx.esc(kept.id)}">${ctx.t("Apri la copia", "Open the copy")}</button>` : ""}${undoButton(ctx, notice.label)}`;
  } else if (notice.kind === "left" && ctx.state.actors[notice.actorId])
    body = `<span>${ctx.esc(ctx.t(`${ctx.state.actors[notice.actorId].name} ha lasciato ${notice.campaign}: ora è solo nella tua libreria.`, `${ctx.state.actors[notice.actorId].name} left ${notice.campaign}: it is now only in your library.`))}</span>${undoButton(ctx, notice.label)}`;
  else if (
    ["copied", "imported", "restored"].includes(notice.kind) &&
    ctx.state.actors[notice.actorId]
  ) {
    const lead = {
      copied: ["Copia creata", "Copy created"],
      imported: ["Personaggio importato", "Character imported"],
      restored: ["Ripristinato dal cestino", "Restored from the trash"],
    }[notice.kind];
    body = `<span>${ctx.t(...lead)}: <strong>${ctx.esc(ctx.state.actors[notice.actorId].name)}</strong>.</span> <button type="button" class="button" data-character-action="open" data-actor="${ctx.esc(notice.actorId)}">${ctx.t("Apri la scheda", "Open the sheet")}</button>${undoButton(ctx, notice.label)}`;
  }
  if (!body) return "";
  return `<div class="clib-notice" role="status" data-clib-notice>${body}<button type="button" class="button quiet" data-clib-act="dismiss" aria-label="${ctx.t("Chiudi l’avviso", "Dismiss notice")}">✕</button></div>`;
}
function renderTrash(ctx, rows) {
  if (!rows.length) return "";
  return `<details class="panel clib-trash" data-clib-trash ${ui.trashOpen ? "open" : ""}><summary>${ctx.t("Cestino", "Trash")} <span class="muted">(${rows.length})</span></summary><p class="muted">${ctx.t("Le schede eliminate restano qui finché non le elimini definitivamente. Il ripristino riporta scheda, campagna e pedine; il link pubblico resta disattivato.", "Deleted sheets stay here until you delete them permanently. Restoring brings back sheet, campaign and tokens; the public link stays off.")}</p><ul class="clib-plain">${rows
    .map(
      (row) =>
        `<li class="item-row" data-clib-trash-row="${ctx.esc(row.id)}"><div><strong>${ctx.esc(row.actor.name)}</strong><p class="muted">${ctx.t("Eliminata il", "Deleted on")} ${dateTimeText(ctx, row.deletedAt)}</p></div><div class="toolbar"><button type="button" class="button" data-clib-act="restore" data-trash="${ctx.esc(row.id)}">${ctx.t("Ripristina", "Restore")}</button><button type="button" class="button danger" data-clib-act="purge" data-trash="${ctx.esc(row.id)}">${ctx.t("Elimina definitivamente", "Delete permanently")}</button></div></li>`,
    )
    .join("")}</ul></details>`;
}
export function renderLibraryPage(ctx) {
  const sort = currentSort(ctx);
  const observed = readObserved();
  const all = libraryRows(ctx.state, ctx.role, { sort, observed });
  const hidden = (row) => (matchesQuery(row.haystack, row.level, ui.query) ? "" : "hidden");
  const group = (id, title, rows, empty) =>
    `<section class="clib-group" data-clib-group="${id}" aria-labelledby="clib-${id}-title"><h2 id="clib-${id}-title">${title} <span class="muted" data-clib-group-count>(${rows.filter((row) => !hidden(row)).length})</span></h2>${
      rows.length
        ? `<div class="clib-grid">${rows.map((row) => renderCard(ctx, row).replace("<article ", `<article ${hidden(row)} `)).join("")}</div>`
        : `<p class="empty-state">${empty}</p>`
    }</section>`;
  const matched = [...all.mine, ...all.others].filter((row) => !hidden(row)).length;
  return `<section class="clib-page" data-clib-page><header class="page-heading"><div><h1>${ctx.t("Personaggi", "Characters")}</h1><p class="muted">${ctx.t("La tua libreria: schede nelle campagne e fuori, copie, file e condivisione.", "Your library: sheets in and out of campaigns, copies, files and sharing.")}</p></div><div class="toolbar"><label class="button clib-file"><input type="file" accept=".json,application/json" data-clib-import aria-label="${ctx.t("Importa un personaggio da file JSON", "Import a character from a JSON file")}">${ctx.t("Importa", "Import")}</label><button type="button" class="button" data-character-action="reconstruct">${ctx.t("Ricostruisci una scheda", "Reconstruct a sheet")}</button><button type="button" class="button primary" data-character-action="create">${ctx.t("Crea personaggio", "Create character")}</button></div></header>${renderNotice(ctx)}${
    ui.importError
      ? `<p class="error clib-import-error" role="alert" data-clib-import-error>${ctx.esc(say(ctx, ui.importError))}</p>`
      : ""
  }${renderTransfers(ctx)}${renderDrafts(ctx)}<div class="clib-controls"><label class="field clib-search"><span>${ctx.t("Cerca per nome, livello, classe, specie o campagna", "Search by name, level, class, species or campaign")}</span><input type="search" data-clib-search data-character-filter value="${ctx.esc(ui.query)}" autocomplete="off"></label><label class="field clib-sort"><span>${ctx.t("Ordina per", "Sort by")}</span><select data-clib-sort>${SORTS.map((value) => `<option value="${value}" ${value === sort ? "selected" : ""}>${sortLabel(ctx, value)}</option>`).join("")}</select></label></div><p class="muted clib-count" data-clib-count aria-live="polite">${ctx.esc(countText(ctx, matched, all.total))}</p>${group(
    "mine",
    ctx.t("Le mie schede", "My sheets"),
    all.mine,
    ctx.t(
      "Nessuna scheda tua: creane una, ricostruiscila o importala.",
      "No sheets of yours: create, reconstruct or import one.",
    ),
  )}${group(
    "others",
    ctx.t("Della campagna e affidate", "Campaign and entrusted"),
    all.others,
    ctx.t("Nessun’altra scheda consultabile.", "No other readable sheets."),
  )}<p class="empty-state" data-clib-empty data-character-no-results ${matched ? "hidden" : ""}>${ctx.t("Nessun personaggio corrisponde alla ricerca.", "No characters match your search.")}</p>${renderTrash(ctx, all.trash)}</section>`;
}
function countText(ctx, matched, total) {
  return matched === total
    ? ctx.t(`${total} schede`, `${total} sheets`)
    : ctx.t(`${matched} di ${total} schede`, `${matched} of ${total} sheets`);
}

// Sheet: a manage control in the breadcrumb row (DDB "Manage" on the sheet header).
function injectSheetBar(ctx, html) {
  const actor = ctx.state.actors[ctx.view.id];
  if (
    !actor ||
    actor.kind !== "character" ||
    actor.companion ||
    !canViewActor(actor, ctx.role, ctx.state)
  )
    return html;
  const own = actor.owner === ctx.role;
  // PG-93: «Condividi» sits in the sheet header (Owlbear «Share», Demiplane one-tap QR);
  // a reader sees it too once the owner has published the link.
  const shareable = own || privacyOf(ctx.state, actor.id) === "public";
  const share = shareable
    ? `<button type="button" class="button" data-clib-act="share" data-actor="${ctx.esc(actor.id)}" aria-label="${ctx.esc(ctx.t(`Condividi ${actor.name}: link e QR`, `Share ${actor.name}: link and QR`))}">${ctx.t("Condividi", "Share")}</button>`
    : "";
  // PG-94: the header says whose sheet it is and whether this viewer may change it here.
  const status = sheetEditStatus(ctx.state, actor, ctx.role);
  const whose =
    status?.player && !own
      ? `<span class="badge clib-sheet-owner" data-clib-sheet-owner="${status.canEdit ? "edit" : "read"}">${ctx.esc(
          ctx.t(
            `Scheda di ${members.personName(ctx.state, actor.owner, "it")} · ${status.canEdit ? (ctx.role === "dm" ? "il giocatore ti consente di modificarla" : "puoi modificarla") : "solo lettura"}`,
            `${members.personName(ctx.state, actor.owner, "en")}’s sheet · ${status.canEdit ? (ctx.role === "dm" ? "the player lets you edit it" : "you can edit it") : "read only"}`,
          ),
        )}</span>`
      : status?.player && own && actor.campaignIds?.length
        ? `<span class="badge clib-sheet-owner" data-clib-sheet-owner="own">${ctx.esc(ctx.t(status.dmAllowed ? "Tua · il DM può modificarla" : "Tua · il DM non può modificarla", status.dmAllowed ? "Yours · the DM can edit it" : "Yours · the DM cannot edit it"))}</span>`
        : "";
  const bar = `<span class="clib-sheet-bar">${privacyBadge(ctx, privacyOf(ctx.state, actor.id), actor)}${whose}${share}${own ? `<button type="button" class="button" data-clib-act="manage" data-actor="${ctx.esc(actor.id)}">${ctx.t("Gestisci personaggio", "Manage character")}</button>` : ""}</span>`;
  const marker = '<div class="toolbar character-breadcrumb">';
  const start = html.indexOf(marker);
  if (start < 0) return `<div class="toolbar clib-sheet-fallback">${bar}</div>${html}`;
  const end = html.indexOf("</div>", start);
  return html.slice(0, end) + bar + html.slice(end);
}
// A summary reader who follows a link to the sheet (Table, notification, URL) gets the
// summary, never the sheet: the read gate sits on the route, before the core renders.
function renderSummaryPage(ctx, actor) {
  return `<section class="clib-summary-page" data-clib-summary-page><div class="toolbar character-breadcrumb"><button type="button" class="button quiet" data-character-action="collection">← ${ctx.t("Personaggi", "Characters")}</button></div><h1>${ctx.esc(actor.name)}</h1>${summaryCard(ctx, actor)}<p class="muted">${ctx.esc(ctx.t(`La scheda di ${actor.name} è riservata a chi la gioca e al DM: gli altri giocatori vedono solo nome, classe, livello e giocatore.`, `${actor.name}’s sheet is reserved to its player and the DM: other players see only name, class, level and player.`))}</p></section>`;
}
export function renderCharactersRoute(ctx) {
  const opened = ctx.view.id ? ctx.state.actors[ctx.view.id] : null;
  if (opened && sheetAccess(ctx.state, opened, ctx.role) === "summary")
    return renderSummaryPage(ctx, opened);
  if (ctx.view.id) return injectSheetBar(ctx, renderCharacters(ctx));
  observe(ctx.state);
  return renderLibraryPage(ctx);
}

// ---------------------------------------------------------------- read-only sheet

function readProjection(ctx, actor) {
  return X.readSheet(getEffectiveActor(actor) ?? actor, {
    log: logOf(ctx.state, actor.id),
    campaigns: campaignIdsOf(actor).map((id) => campaignName(ctx.state, id)),
  });
}
export function renderReadSheet(ctx, sheet, actor, { heading = "h1" } = {}) {
  const L = (value) => ctx.esc(say(ctx, value));
  const list = (rows, empty) =>
    rows.length ? `<ul class="clib-list">${rows.join("")}</ul>` : `<p class="muted">${empty}</p>`;
  // One class: the sheet's own class label (e.g. "Maga"); several: catalog names and levels.
  const cls =
    sheet.classes.filter((row) => row.name).length > 1
      ? sheet.classes.map((row) => `${say(ctx, row.name)} ${row.level ?? ""}`.trim()).join(" / ")
      : say(ctx, sheet.className);
  const stats = [
    [ctx.t("CA", "AC"), sheet.ac],
    [ctx.t("PF", "HP"), `${sheet.hp ?? "—"} / ${sheet.maxHp ?? "—"}`],
    [ctx.t("PF temporanei", "Temp HP"), sheet.tempHp ?? 0],
    [ctx.t("Velocità", "Speed"), sheet.speed === null ? "—" : `${sheet.speed} m`],
    [ctx.t("Bonus di competenza", "Proficiency bonus"), X.signed(sheet.proficiencyBonus)],
    ...(sheet.hitDice.length
      ? [
          [
            ctx.t("Dadi Vita", "Hit Dice"),
            sheet.hitDice.map((row) => `${row.max - row.used}/${row.max} ${row.die}`).join(", "),
          ],
        ]
      : []),
  ];
  const spells = sheet.spells.length
    ? `<div class="table-wrap"><table class="clib-spells"><thead><tr><th scope="col">${ctx.t("Liv.", "Lvl")}</th><th scope="col">${ctx.t("Nome", "Name")}</th><th scope="col"><abbr title="${ctx.t("Concentrazione", "Concentration")}">C</abbr></th><th scope="col"><abbr title="${ctx.t("Rituale", "Ritual")}">R</abbr></th><th scope="col">${ctx.t("Preparato", "Prepared")}</th></tr></thead><tbody>${sheet.spells
        .map(
          (spell) =>
            `<tr><td>${spell.level === 0 ? ctx.t("Trucchetto", "Cantrip") : (spell.level ?? "—")}</td><td>${L(spell.name)}</td><td>${spell.concentration ? `<span class="clib-flag" title="${ctx.t("Concentrazione", "Concentration")}">C</span><span class="clib-sr">${ctx.t("Concentrazione", "Concentration")}</span>` : "–"}</td><td>${spell.ritual ? `<span class="clib-flag" title="${ctx.t("Rituale", "Ritual")}">R</span><span class="clib-sr">${ctx.t("Rituale", "Ritual")}</span>` : "–"}</td><td>${spell.prepared ? ctx.t("sì", "yes") : ctx.t("no", "no")}</td></tr>`,
        )
        .join(
          "",
        )}</tbody></table></div><p class="muted clib-legend">${ctx.t("C = Concentrazione · R = Rituale (valori dell’SRD 5.2.1 per gli incantesimi del catalogo).", "C = Concentration · R = Ritual (SRD 5.2.1 values for catalog spells).")}</p>`
    : `<p class="muted">${ctx.t("Nessun incantesimo.", "No spells.")}</p>`;
  const story = [
    [ctx.t("Aspetto e descrizione", "Appearance and description"), sheet.story.description],
    [ctx.t("Storia e legami", "Story and bonds"), sheet.story.backstory],
    [ctx.t("Annotazioni condivise", "Shared annotations"), sheet.story.notes],
  ].filter(([, value]) => value);
  const totals = logTotals(sheet.log);
  const h = heading;
  const h2 = heading === "h1" ? "h2" : "h3";
  return `<article class="clib-read" data-clib-read><header class="clib-read-head">${portrait(ctx, actor, "big")}<div><p class="muted">${ctx.esc(cls)} · ${ctx.t("Livello", "Level")} ${sheet.level ?? "—"}${sheet.species ? ` · ${L(sheet.species.name)}` : ""}</p><${h}>${ctx.esc(sheet.name)}</${h}><p><span class="badge clib-readonly">${ctx.t("Sola lettura", "Read only")}</span>${sheet.campaigns.length ? ` <span class="badge">${ctx.esc(sheet.campaigns.join(", "))}</span>` : ""}</p></div></header><dl class="clib-stats">${stats.map(([label, value]) => `<div><dt>${label}</dt><dd>${ctx.esc(value)}</dd></div>`).join("")}</dl><section class="clib-read-section"><${h2}>${ctx.t("Caratteristiche", "Abilities")}</${h2}><ul class="clib-abilities">${sheet.abilities
    .map(
      (row) =>
        `<li><abbr title="${L(row.name)}">${L(row.short)}</abbr><strong>${row.score ?? "—"}</strong><span>${X.signed(row.mod)}</span></li>`,
    )
    .join("")}</ul>${
    sheet.savingThrows.length
      ? `<p><strong>${ctx.t("Tiri salvezza", "Saving throws")}:</strong> ${sheet.savingThrows.map((row) => `${L(row.short)} ${X.signed(row.value)}`).join(" · ")}</p>`
      : ""
  }${
    sheet.skills.length
      ? `<p><strong>${ctx.t("Abilità", "Skills")}:</strong> ${sheet.skills.map((row) => `${L(row.name)}${row.value === null ? "" : " " + X.signed(row.value)}`).join(" · ")}</p>`
      : ""
  }</section><section class="clib-read-section"><${h2}>${ctx.t("Equipaggiamento", "Equipment")}</${h2}>${list(
    sheet.inventory.map(
      (item) =>
        `<li>${L(item.name)} × ${item.quantity}${item.equipped ? ` <span class="badge">${ctx.t("equipaggiato", "equipped")}</span>` : ""}</li>`,
    ),
    ctx.t("Nessun oggetto.", "No items."),
  )}</section><section class="clib-read-section"><${h2}>${ctx.t("Incantesimi", "Spells")}</${h2}>${
    sheet.slots.length
      ? `<p>${ctx.t("Slot disponibili", "Available slots")}: ${sheet.slots.map((row) => `${row.level}° ${row.max - row.used}/${row.max}`).join(" · ")}</p>`
      : ""
  }${spells}</section><section class="clib-read-section"><${h2}>${ctx.t("Capacità", "Features")}</${h2}>${list(
    sheet.features.map((row) => `<li>${L(row.name)}</li>`),
    ctx.t("Nessuna capacità registrata.", "No features recorded."),
  )}</section>${
    story.length
      ? `<section class="clib-read-section"><${h2}>${ctx.t("Storia", "Story")}</${h2}>${story.map(([label, value]) => `<h4>${label}</h4><p class="clib-multiline">${ctx.esc(value)}</p>`).join("")}</section>`
      : ""
  }${
    sheet.log.length
      ? `<section class="clib-read-section"><${h2}>${ctx.t("Registro delle avventure", "Adventure log")}</${h2}><p class="muted">${logTotalsText(ctx, totals)}</p><ul class="clib-list">${sheet.log.map((row) => `<li><strong>${ctx.esc(row.date || "—")} · ${ctx.esc(row.title)}</strong>${row.notes ? ` — ${ctx.esc(row.notes)}` : ""}</li>`).join("")}</ul></section>`
      : ""
  }</article>`;
}
function logTotalsText(ctx, totals) {
  const sign = (value) => (value > 0 ? "+" : "") + value;
  return ctx.t(
    `${totals.entries} ${totals.entries === 1 ? "voce" : "voci"} · livelli ${sign(totals.levels)} · oro ${sign(totals.gold)} mo · tempo libero ${sign(totals.downtime)} g`,
    `${totals.entries} ${totals.entries === 1 ? "entry" : "entries"} · levels ${sign(totals.levels)} · gold ${sign(totals.gold)} gp · downtime ${sign(totals.downtime)} d`,
  );
}
// The summary audience's whole view (DDB-061 Private): name, class, level and player.
function summaryCard(ctx, actor) {
  return `<div class="clib-summary" data-clib-summary>${portrait(ctx, null, "", actor.name)}<div><strong>${ctx.esc(actor.name)}</strong><p>${classLine(ctx, actor, { species: false })}</p><p class="muted">${ctx.t("Giocatore", "Player")}: ${ctx.esc(whoName(ctx, actor.owner))}</p></div></div>`;
}
export function renderLinkPage(ctx) {
  const result = resolveLink(ctx.state, ctx.view.id);
  if (result.status !== "ok") {
    const reason = {
      private: [
        "Il proprietario non condivide più questa scheda con un link.",
        "The owner no longer shares this sheet by link.",
      ],
      revoked: [
        "Questo link è stato sostituito o disattivato.",
        "This link has been replaced or turned off.",
      ],
      unknown: [
        "Il link non corrisponde a nessuna scheda condivisa.",
        "The link does not match any shared sheet.",
      ],
    }[result.status];
    return `<section class="clib-link-page" data-clib-link="${result.status}"><div class="empty-state"><h1>${ctx.t("Scheda non disponibile", "Sheet unavailable")}</h1><p>${ctx.t(...reason)}</p></div></section>`;
  }
  const actor = ctx.state.actors[result.actorId];
  return `<section class="clib-link-page" data-clib-link="ok"><p class="clib-link-note" role="note">${ctx.t("Vista di chi apre il link: sola lettura, senza comandi, senza appunti personali né registro dei tiri.", "What anyone with the link sees: read only, no commands, no personal notes or roll log.")}</p>${renderReadSheet(ctx, readProjection(ctx, actor), actor)}</section>`;
}
export function renderPrintPage(ctx) {
  const actor = ctx.state.actors[ctx.view.id];
  // DDB-065: Export to PDF (and its print view) is under the owner's Manage.
  if (!actor || actor.owner !== ctx.role || !canViewActor(actor, ctx.role, ctx.state))
    return `<div class="empty-state"><h1>${ctx.t("Scheda non disponibile", "Sheet unavailable")}</h1><button type="button" class="button" data-nav="characters">${ctx.t("Torna ai personaggi", "Back to characters")}</button></div>`;
  return `<section class="clib-print-page" data-clib-print><div class="toolbar clib-print-tools"><button type="button" class="button" data-character-action="open" data-actor="${ctx.esc(actor.id)}">← ${ctx.t("Torna alla scheda", "Back to the sheet")}</button><button type="button" class="button" data-clib-act="pdf" data-actor="${ctx.esc(actor.id)}">${ctx.t("Scarica PDF compilabile", "Download fillable PDF")}</button><button type="button" class="button primary" data-clib-print-now>${ctx.t("Stampa", "Print")}</button></div><p class="muted clib-print-tools">${ctx.t("Anteprima di stampa: la pagina stampata contiene solo la scheda. Appunti personali e piani privati non compaiono.", "Print preview: the printed page contains only the sheet. Personal notes and private plans do not appear.")}</p><div class="clib-paper">${renderReadSheet(ctx, readProjection(ctx, actor), actor)}</div></section>`;
}

// ---------------------------------------------------------------- sheet tabs

export function renderLogTab(ctx, effective) {
  const actor = ctx.state.actors[effective.id];
  const rows = logOf(ctx.state, actor.id);
  const own = actor.owner === ctx.role;
  const totals = logTotals(rows);
  const sign = (value) => (value > 0 ? "+" : "") + value;
  return `<section class="panel clib-log" data-clib-log>${renderTabNotice(ctx, actor.id, TAB_LOG)}<div class="section-heading"><h2>${ctx.t("Registro delle avventure", "Adventure log")}</h2>${own ? `<button type="button" class="button primary" data-clib-log-add>${ctx.t("Aggiungi voce", "Add entry")}</button>` : ""}</div><p class="muted">${ctx.t("Come il registro Adventurers League: una riga per avventura o sessione, con livelli, oro, tempo libero e oggetti. Lo compila chi possiede la scheda; il DM lo legge.", "Like the Adventurers League logsheet: one row per adventure or session with levels, gold, downtime and items. The sheet’s owner writes it; the DM reads it.")}</p><dl class="clib-stats clib-log-totals" data-clib-log-totals><div><dt>${ctx.t("Voci", "Entries")}</dt><dd>${totals.entries}</dd></div><div><dt>${ctx.t("Livelli", "Levels")}</dt><dd>${sign(totals.levels)}</dd></div><div><dt>${ctx.t("Oro", "Gold")}</dt><dd>${sign(totals.gold)} ${ctx.t("mo", "gp")}</dd></div><div><dt>${ctx.t("Tempo libero", "Downtime")}</dt><dd>${sign(totals.downtime)} ${ctx.t("g", "d")}</dd></div></dl>${
    rows.length
      ? `<div class="table-wrap"><table class="clib-log-table"><thead><tr><th scope="col">${ctx.t("Data", "Date")}</th><th scope="col">${ctx.t("Avventura o sessione", "Adventure or session")}</th><th scope="col">DM</th><th scope="col">${ctx.t("Livelli", "Levels")}</th><th scope="col">${ctx.t("Oro", "Gold")}</th><th scope="col">${ctx.t("Tempo libero", "Downtime")}</th><th scope="col">${ctx.t("Oggetti e note", "Items and notes")}</th>${own ? `<th scope="col"><span class="clib-sr">${ctx.t("Azioni", "Actions")}</span></th>` : ""}</tr></thead><tbody>${rows
          .map(
            (row) =>
              `<tr data-clib-log-row="${ctx.esc(row.id)}"><td class="clib-nowrap">${row.date ? dateText(ctx, row.date + "T12:00:00Z") : "—"}</td><td>${ctx.esc(row.title)}</td><td>${ctx.esc(row.dm || "—")}</td><td>${sign(row.levels)}</td><td>${sign(row.gold)}</td><td>${sign(row.downtime)}</td><td>${ctx.esc([row.items, row.notes].filter(Boolean).join(" · ") || "—")}</td>${own ? `<td class="clib-row-actions"><button type="button" class="button quiet" data-clib-log-edit="${ctx.esc(row.id)}" aria-label="${ctx.esc(ctx.t(`Modifica ${row.title}`, `Edit ${row.title}`))}">${ctx.t("Modifica", "Edit")}</button><button type="button" class="button quiet danger" data-clib-log-delete="${ctx.esc(row.id)}" aria-label="${ctx.esc(ctx.t(`Elimina ${row.title}`, `Delete ${row.title}`))}">${ctx.t("Elimina", "Delete")}</button></td>` : ""}</tr>`,
          )
          .join("")}</tbody></table></div>`
      : `<p class="empty-state">${ctx.t("Nessuna voce registrata.", "No entries recorded.")}</p>`
  }</section>`;
}
function logForm(ctx, row = {}) {
  const field = (name, label, value, attrs = "") =>
    `<label class="field"><span>${label}</span><input name="${name}" value="${ctx.esc(value ?? "")}" ${attrs}></label>`;
  return `<div class="form-grid clib-log-form">${field("date", ctx.t("Data", "Date"), row.date ?? new Date().toISOString().slice(0, 10), 'type="date"')}${field("title", ctx.t("Avventura o sessione", "Adventure or session"), row.title, 'required maxlength="120"')}${field("dm", "DM", row.dm, 'maxlength="80"')}${field("levels", ctx.t("Livelli ottenuti", "Levels gained"), row.levels ?? 0, 'type="number" min="0" max="20" step="1"')}${field("gold", ctx.t("Oro (mo, anche negativo)", "Gold (gp, may be negative)"), row.gold ?? 0, 'type="number" step="0.01"')}${field("downtime", ctx.t("Tempo libero (giorni)", "Downtime (days)"), row.downtime ?? 0, 'type="number" min="-365" max="365" step="1"')}${field("items", ctx.t("Oggetti magici o speciali", "Magic or special items"), row.items, 'maxlength="300"')}<label class="field"><span>${ctx.t("Note", "Notes")}</span><textarea name="notes" maxlength="1000">${ctx.esc(row.notes ?? "")}</textarea></label></div>`;
}
function logValues(data) {
  return Object.fromEntries(
    ["date", "title", "dm", "levels", "gold", "downtime", "items", "notes"].map((key) => [
      key,
      String(data.get(key) ?? ""),
    ]),
  );
}
export function bindLogTab(el, ctx, effective) {
  const actorId = effective.id;
  const actor = () => ctx.state.actors[actorId];
  el.querySelector("[data-clib-log-add]")?.addEventListener("click", () =>
    ctx.dialog(ctx.t(`Nuova voce · ${actor().name}`, `New entry · ${actor().name}`), logForm(ctx), {
      submitLabel: ctx.t("Aggiungi al registro", "Add to log"),
      onSubmit: (data) => {
        const label = ctx.t(
          "Voce aggiunta al registro delle avventure",
          "Adventure log entry added",
        );
        // The notice follows the accepted change only: a refused commit throws first.
        commitFor(ctx, actor(), label, (draft) =>
          addLogEntry(draft, actorId, ctx.role, logValues(data)),
        );
        ui.tabNotice = {
          actorId,
          tab: TAB_LOG,
          label,
          text: { it: "Voce aggiunta.", en: "Entry added." },
        };
        ctx.render();
      },
    }),
  );
  el.querySelectorAll("[data-clib-log-edit]").forEach((button) =>
    button.addEventListener("click", () => {
      const row = logOf(ctx.state, actorId).find((item) => item.id === button.dataset.clibLogEdit);
      if (!row) return;
      ctx.dialog(
        ctx.t(`Modifica voce · ${row.title}`, `Edit entry · ${row.title}`),
        logForm(ctx, row),
        {
          submitLabel: ctx.t("Salva voce", "Save entry"),
          onSubmit: (data) => {
            const label = ctx.t("Voce del registro corretta", "Log entry corrected");
            commitFor(ctx, actor(), label, (draft) =>
              updateLogEntry(draft, actorId, row.id, ctx.role, logValues(data)),
            );
            ui.tabNotice = {
              actorId,
              tab: TAB_LOG,
              label,
              text: { it: "Voce corretta.", en: "Entry corrected." },
            };
            ctx.render();
          },
        },
      );
    }),
  );
  el.querySelectorAll("[data-clib-log-delete]").forEach((button) =>
    button.addEventListener("click", () => {
      const row = logOf(ctx.state, actorId).find(
        (item) => item.id === button.dataset.clibLogDelete,
      );
      if (!row) return;
      ctx.dialog(
        ctx.t("Eliminare la voce?", "Delete the entry?"),
        `<p>${ctx.esc(row.date || "—")} · <strong>${ctx.esc(row.title)}</strong></p><p class="muted">${ctx.t("Dopo l’eliminazione puoi annullarla dall’avviso in cima al registro.", "After deleting you can undo it from the notice at the top of the log.")}</p>`,
        {
          submitLabel: ctx.t("Elimina voce", "Delete entry"),
          onSubmit: () => {
            const label = ctx.t("Voce del registro eliminata", "Log entry deleted");
            commitFor(ctx, actor(), label, (draft) =>
              deleteLogEntry(draft, actorId, row.id, ctx.role),
            );
            ui.tabNotice = {
              actorId,
              tab: TAB_LOG,
              label,
              text: { it: `Voce eliminata: ${row.title}.`, en: `Entry deleted: ${row.title}.` },
            };
            ctx.render();
          },
        },
      );
    }),
  );
}

function diffValue(ctx, value) {
  if (value === null || value === undefined || value === "") return "—";
  if (isObject(value) && ("it" in value || "en" in value)) return ctx.esc(say(ctx, value));
  if (isObject(value))
    return ctx.esc(
      Object.entries(value)
        .map(([k, v]) => `${/^\d+$/.test(k) ? `${k}°` : k}: ${v}`)
        .join(", ") || "—",
    );
  const textValue = String(value);
  return ctx.esc(textValue.length > 90 ? textValue.slice(0, 87) + "…" : textValue);
}
export function renderDiff(ctx, rows) {
  if (!rows.length)
    return `<p class="muted" data-clib-diff-empty>${ctx.t("Nessuna differenza.", "No differences.")}</p>`;
  return `<div class="table-wrap"><table class="clib-diff"><thead><tr><th scope="col">${ctx.t("Campo", "Field")}</th><th scope="col">${ctx.t("Prima", "Before")}</th><th scope="col">${ctx.t("Dopo", "After")}</th></tr></thead><tbody>${rows
    .map((row) => {
      const label = ctx.t(...row.label);
      if (row.change === "added")
        return `<tr data-change="added"><td>${label}</td><td>—</td><td><ins>+ ${diffValue(ctx, row.after)}</ins></td></tr>`;
      if (row.change === "removed")
        return `<tr data-change="removed"><td>${label}</td><td><del>− ${diffValue(ctx, row.before)}</del></td><td>—</td></tr>`;
      if (row.change === "quantity")
        return `<tr data-change="quantity"><td>${label}: ${diffValue(ctx, row.name)}</td><td>× ${row.before}</td><td>× ${row.after}</td></tr>`;
      if (row.change === "text")
        return `<tr data-change="text"><td>${label}</td><td>${diffValue(ctx, row.before)}</td><td>${diffValue(ctx, row.after)}</td></tr>`;
      return `<tr><td>${label}</td><td>${diffValue(ctx, row.before)}</td><td>${diffValue(ctx, row.after)}</td></tr>`;
    })
    .join("")}</tbody></table></div>`;
}
const revLabel = (ctx, row) =>
  `${ctx.t("Revisione", "Revision")} ${row.n} · ${say(ctx, row.label)}`;
function snapshotFor(ctx, actorId, key) {
  if (key === "current") return X.sheetData(ctx.state.actors[actorId]);
  return visibleRevisions(ctx.state, actorId, ctx.role).find((row) => row.id === key)?.data ?? null;
}
// The shell's ctx.canControl carries the B20 lock (PG-94); the domain applies it again.
const canEditSheet = (ctx, actor) =>
  (ctx.canControl ? ctx.canControl(actor) : canControlActor(actor, ctx.role, ctx.state)) &&
  !dmEditLocked(ctx.state, actor, ctx.role);
export function renderRevisionsTab(ctx, effective) {
  const actor = ctx.state.actors[effective.id];
  const rows = visibleRevisions(ctx.state, actor.id, ctx.role);
  const editable = canEditSheet(ctx, actor);
  const locked = !editable && dmEditLocked(ctx.state, actor, ctx.role);
  const choice = ui.compare[actor.id] ?? {};
  const from = rows.some((row) => row.id === choice.from)
    ? choice.from
    : (rows.at(-1)?.id ?? "current");
  const to =
    choice.to === "current" || rows.some((row) => row.id === choice.to) ? choice.to : "current";
  const options = (selected) =>
    `<option value="current" ${selected === "current" ? "selected" : ""}>${ctx.t("Scheda attuale", "Current sheet")}</option>${[
      ...rows,
    ]
      .reverse()
      .map(
        (row) =>
          `<option value="${ctx.esc(row.id)}" ${row.id === selected ? "selected" : ""}>${ctx.esc(revLabel(ctx, row))}</option>`,
      )
      .join("")}`;
  const diff = rows.length
    ? renderDiff(
        ctx,
        compareSheets(snapshotFor(ctx, actor.id, from) ?? {}, snapshotFor(ctx, actor.id, to) ?? {}),
      )
    : "";
  const kindText = {
    manual: ["Salvata", "Saved"],
    auto: ["Automatica", "Automatic"],
    restore: ["Ripristino", "Restore"],
    copy: ["Copia", "Copy"],
    link: ["Collegamento", "Link"],
    transfer: ["Trasferimento", "Transfer"],
    import: ["Importazione", "Import"],
    sample: ["Esempio sintetico", "Synthetic sample"],
    "restore-trash": ["Dal cestino", "From trash"],
  };
  return `<section class="panel clib-revisions" data-clib-revisions>${renderTabNotice(ctx, actor.id, TAB_REVISIONS)}<div class="section-heading"><h2>${ctx.t("Revisioni", "Revisions")}</h2>${editable ? `<button type="button" class="button primary" data-clib-rev-save>${ctx.t("Salva revisione", "Save revision")}</button>` : ""}</div>${
    locked
      ? `<div class="clib-notice" role="note" data-clib-rev-locked><span>${ctx.esc(ctx.t(`Modifica riservata a chi gioca ${actor.name}: puoi confrontare le revisioni; per salvarne o ripristinarne una chiedi l’autorizzazione.`, `Editing reserved to ${actor.name}’s player: you can compare revisions; to save or restore one, ask for authorization.`))}</span> <button type="button" class="button" data-clib-go-access>${ctx.t("Vai a «Modifiche del DM»", "Go to “DM edits”")}</button></div>`
      : ""
  }<p class="muted">${ctx.t("Ogni revisione è un’istantanea della scheda. Ripristinare ne crea una nuova e conserva tutte le precedenti; PF attuali, risorse spese e condizioni restano quelli di adesso.", "Each revision is a snapshot of the sheet. Restoring creates a new one and keeps all earlier ones; current HP, spent resources and conditions stay as they are now.")}</p>${
    rows.length
      ? `<form class="clib-compare" data-clib-compare><label class="field"><span>${ctx.t("Confronta la versione", "Compare version")}</span><select name="from">${options(from)}</select></label><label class="field"><span>${ctx.t("con la versione", "with version")}</span><select name="to">${options(to)}</select></label></form><div data-clib-diff aria-live="polite">${diff}</div><ol class="clib-rev-list">${[
          ...rows,
        ]
          .reverse()
          .map(
            (row) =>
              `<li class="item-row" data-clib-rev="${ctx.esc(row.id)}"><div><strong>${ctx.esc(revLabel(ctx, row))}</strong><p class="muted">${dateTimeText(ctx, row.at)} · ${ctx.esc(whoName(ctx, row.by))} · <span class="badge">${ctx.t(...(kindText[row.kind] ?? kindText.manual))}</span></p></div><div class="toolbar"><button type="button" class="button" data-clib-rev-compare="${ctx.esc(row.id)}">${ctx.t("Confronta con l’attuale", "Compare with current")}</button>${editable ? `<button type="button" class="button" data-clib-rev-restore="${ctx.esc(row.id)}">${ctx.t("Ripristina", "Restore")}</button>` : ""}</div></li>`,
          )
          .join("")}</ol>`
      : `<p class="empty-state">${ctx.t("Ancora nessuna revisione: salva la prima.", "No revisions yet: save the first one.")}</p>`
  }</section>`;
}
export function bindRevisionsTab(el, ctx, effective) {
  const actorId = effective.id;
  const actor = () => ctx.state.actors[actorId];
  const form = el.querySelector("[data-clib-compare]");
  const refreshDiff = () => {
    const choice = ui.compare[actorId] ?? {};
    const target = el.querySelector("[data-clib-diff]");
    if (!target) return;
    const a = snapshotFor(ctx, actorId, choice.from ?? form?.querySelector("[name=from]")?.value);
    const b = snapshotFor(ctx, actorId, choice.to ?? form?.querySelector("[name=to]")?.value);
    target.innerHTML = renderDiff(ctx, compareSheets(a ?? {}, b ?? {}));
  };
  form?.querySelectorAll("select").forEach((select) =>
    select.addEventListener("change", () => {
      ui.compare[actorId] = {
        from: form.querySelector("[name=from]").value,
        to: form.querySelector("[name=to]").value,
      };
      refreshDiff();
    }),
  );
  el.querySelectorAll("[data-clib-rev-compare]").forEach((button) =>
    button.addEventListener("click", () => {
      ui.compare[actorId] = { from: button.dataset.clibRevCompare, to: "current" };
      if (form) {
        form.querySelector("[name=from]").value = button.dataset.clibRevCompare;
        form.querySelector("[name=to]").value = "current";
      }
      refreshDiff();
      el.querySelector("[data-clib-diff]")?.scrollIntoView?.({ block: "nearest" });
    }),
  );
  // B20's own request control lives in the sheet's Actions tab ("DM edits").
  el.querySelector("[data-clib-go-access]")?.addEventListener("click", () =>
    ctx.navigate("characters", { id: actorId, tab: "actions" }),
  );
  el.querySelector("[data-clib-rev-save]")?.addEventListener("click", () =>
    ctx.dialog(
      ctx.t("Salva revisione", "Save revision"),
      `<label class="field"><span>${ctx.t("Nome della revisione (facoltativo)", "Revision name (optional)")}</span><input name="label" maxlength="80" placeholder="${ctx.t("Per esempio: prima della sessione 13", "For example: before session 13")}"></label>`,
      {
        submitLabel: ctx.t("Salva revisione", "Save revision"),
        onSubmit: (data) => {
          const label = ctx.t("Revisione della scheda salvata", "Sheet revision saved");
          commitFor(ctx, actor(), label, (draft) =>
            saveRevision(draft, actorId, ctx.role, { label: data.get("label") }),
          );
          ui.tabNotice = {
            actorId,
            tab: TAB_REVISIONS,
            label,
            text: { it: "Revisione salvata.", en: "Revision saved." },
          };
          ctx.render();
        },
      },
    ),
  );
  el.querySelectorAll("[data-clib-rev-restore]").forEach((button) =>
    button.addEventListener("click", () => {
      const target = visibleRevisions(ctx.state, actorId, ctx.role).find(
        (row) => row.id === button.dataset.clibRevRestore,
      );
      if (!target) return;
      const changes = compareSheets(X.sheetData(actor()), target.data).filter(
        (row) => !["hp", "spellSlots", "hitDice"].includes(row.key),
      );
      ctx.dialog(
        ctx.t(`Ripristinare la revisione ${target.n}?`, `Restore revision ${target.n}?`),
        `<p>${ctx.esc(revLabel(ctx, target))} · ${dateTimeText(ctx, target.at)}</p><p>${ctx.t("La scheda torna a questa revisione e si crea una nuova revisione. L’attuale viene salvata prima, quindi nulla va perso.", "The sheet returns to this revision and a new revision is created. The current one is saved first, so nothing is lost.")}</p><p class="muted">${ctx.t("Restano quelli di adesso: PF attuali (entro il nuovo massimo), risorse spese, condizioni, concentrazione.", "These stay as they are now: current HP (within the new maximum), spent resources, conditions, concentration.")}</p><h3>${ctx.t("Cosa cambia", "What changes")}</h3>${renderDiff(ctx, changes)}`,
        {
          submitLabel: ctx.t("Ripristina come nuova revisione", "Restore as a new revision"),
          onSubmit: () => {
            const label = ctx.t(
              `Scheda ripristinata alla revisione ${target.n}`,
              `Sheet restored to revision ${target.n}`,
            );
            commitFor(ctx, actor(), label, (draft) =>
              restoreRevision(draft, actorId, target.id, ctx.role),
            );
            ui.compare[actorId] = {};
            ui.tabNotice = {
              actorId,
              tab: TAB_REVISIONS,
              label,
              text: {
                it: `Revisione ${target.n} ripristinata come nuova revisione.`,
                en: `Revision ${target.n} restored as a new revision.`,
              },
            };
            ctx.render();
          },
        },
      );
    }),
  );
}

// ---------------------------------------------------------------- dialogs

const dialogEl = () => globalThis.document?.querySelector?.("#dialog") ?? null;
function bindDialogActions(ctx) {
  const el = dialogEl();
  if (!el) return;
  el.querySelectorAll("[data-clib-act]").forEach((button) =>
    button.addEventListener("click", (event) => {
      event.preventDefault();
      runAction(ctx, button.dataset.clibAct, button.dataset);
    }),
  );
}
// DDB "Manage" is the owner's: privacy, files, campaign, copy and delete. Readers open the
// sheet (DDB-062, no commands); the history tabs are on the sheet itself.
function openManage(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  requireOwner(actor, ctx.role);
  requirePlayable(actor);
  const inCampaign = inCurrentCampaign(ctx.state, actor);
  const pending = arrayOf(sliceOf(ctx.state)?.transfers).find(
    (row) => row.actorId === actorId && row.status === "pending",
  );
  const b = (act, label, kind = "", extra = "") =>
    `<button type="button" class="button ${kind}" data-clib-act="${act}" data-actor="${ctx.esc(actorId)}" ${extra}>${label}</button>`;
  const campaignName_ = ctx.esc(ctx.state.campaign?.name ?? "");
  const revisions = visibleRevisions(ctx.state, actorId, ctx.role).length;
  const logs = logOf(ctx.state, actorId).length;
  const sections = [
    `<section><h3>${ctx.t("Privacy e condivisione", "Privacy and sharing")}</h3><p>${privacyBadge(ctx, privacyOf(ctx.state, actorId), actor)}</p><div class="toolbar">${b("share", ctx.t("Condividi (link e QR)", "Share (link and QR)"), "primary")}${b("privacy", ctx.t("Cambia privacy", "Change privacy"))}</div></section>`,
    `<section><h3>${ctx.t("Campagna", "Campaign")}</h3>${
      inCampaign
        ? `<p class="muted">${ctx.t(`Collegata a ${ctx.state.campaign.name}: è la stessa scheda che il gruppo usa al Tavolo.`, `Linked to ${ctx.state.campaign.name}: it is the same sheet the group uses at the Table.`)}</p><div class="toolbar">${b("leave", ctx.t("Lascia la campagna", "Leave campaign"))}${campaignOwner(ctx.state, ctx.state.campaign.id) !== ctx.role ? b("release", ctx.t("Rilascia alla campagna", "Release to campaign")) : ""}${
            pending
              ? `<button type="button" class="button" data-clib-act="withdraw-transfer" data-transfer="${ctx.esc(pending.id)}">${ctx.t(`Ritira la richiesta per ${pending.toName}`, `Withdraw the request for ${pending.toName}`)}</button>`
              : b(
                  "transfer",
                  ctx.t("Trasferisci a un’altra campagna", "Transfer to another campaign"),
                )
          }</div>`
        : `<p class="muted">${ctx.t("Solo nella tua libreria. Collegare porta questa stessa scheda nella campagna che scegli; una copia porta un’istantanea indipendente.", "Only in your library. Linking brings this same sheet into the campaign you choose; a copy brings an independent snapshot.")}</p><div class="toolbar">${b("link", ctx.t("Collega alla campagna…", "Link to campaign…"), "primary")}${b("bring-copy", ctx.t("Porta una copia…", "Bring a copy…"))}</div>`
    }</section>`,
    `<section><h3>${ctx.t("File e stampa", "Files and printing")}</h3><div class="toolbar">${b("export", ctx.t("Esporta dati (JSON)", "Export data (JSON)"))}${b("pdf", ctx.t("Scarica PDF", "Download PDF"))}${b("print", ctx.t("Vista stampabile", "Printable view"))}</div></section>`,
    `<section><h3>${ctx.t("Storia della scheda", "Sheet history")}</h3><div class="toolbar">${b("revisions", ctx.t(`Revisioni (${revisions})`, `Revisions (${revisions})`))}${b("log", ctx.t(`Registro delle avventure (${logs})`, `Adventure log (${logs})`))}</div></section>`,
    `<section><h3>${ctx.t("Copia ed eliminazione", "Copy and delete")}</h3><div class="toolbar">${b("copy", ctx.t("Copia", "Copy"))}${b("delete", ctx.t("Elimina", "Delete"), "danger")}</div></section>`,
  ];
  ctx.dialog(
    ctx.t(`Gestisci ${actor.name}`, `Manage ${actor.name}`),
    `<div class="clib-manage" data-clib-manage>${summaryCard(ctx, actor)}${sections.join("")}</div>`,
    { cancelLabel: ctx.t("Chiudi", "Close") },
  );
  bindDialogActions(ctx);
}
// The «Cosa cambia» list of the copy dialog: the builder's own checks under those rules.
function copyRulesHTML(ctx, actorId, rules) {
  let preview;
  try {
    preview = copyRulesPreview(ctx.state, actorId, ctx.role, rules);
  } catch (error) {
    return `<p class="error">${ctx.esc(refusalText(ctx, error))}</p>`;
  }
  const item = (row) => `<li>${ctx.esc(ctx.t(row.it, row.en))}</li>`;
  const lines = [
    ...preview.removed.map(
      (name) =>
        `<li>${ctx.esc(ctx.t(`Tolta (regole 2014): ${say(ctx, name)}`, `Removed (2014 rules): ${say(ctx, name)}`))}</li>`,
    ),
    ...preview.errors.map(item),
    ...preview.warnings.map(item),
  ];
  return `<h3>${ctx.t("Cosa cambia", "What changes")}</h3>${
    preview.checked
      ? lines.length
        ? `<ul class="clib-list" data-clib-copy-changes>${lines.join("")}</ul>${preview.errors.length ? `<p class="muted">${ctx.t("La copia nasce comunque: completa questi punti con «Rivedi scelte» sulla copia.", "The copy is still created: complete these points with «Revise choices» on the copy.")}</p>` : ""}`
        : `<p class="muted" data-clib-copy-changes>${ctx.t("Nessun cambiamento: la costruzione è valida con queste regole.", "No change: the build is valid under these rules.")}</p>`
      : `<p class="muted" data-clib-copy-changes>${ctx.t("Questa scheda non ha una costruzione registrata: la copia mantiene i valori. Ricostruiscila per verificarli.", "This sheet has no recorded build: the copy keeps its values. Reconstruct it to check them.")}</p>`
  }`;
}
function openCopy(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  if (!actor) return;
  const log = logOf(ctx.state, actorId).length;
  const blocked =
    campaignPolicy(ctx.state.ext?.["campaign-settings"], ctx.state.campaign?.id)?.legacySources ===
    "blocked";
  const hasLegacy = legacyRecords(actor).length > 0;
  const initialRules = hasLegacy && !blocked ? "2024-legacy" : "2024";
  ctx.dialog(
    ctx.t(`Copia ${actor.name}`, `Copy ${actor.name}`),
    `<label class="field"><span>${ctx.t("Nome della copia", "Name of the copy")}</span><input name="name" required maxlength="60" value="${ctx.esc(ctx.t(`${actor.name} (copia)`, `${actor.name} (copy)`))}"></label><label class="field"><span>${ctx.t("Regole di destinazione", "Target rules")}</span><select name="rules" data-clib-copy-rules><option value="2024" ${initialRules === "2024" ? "selected" : ""}>${ctx.t("Regole 2024 · SRD 5.2.1", "2024 rules · SRD 5.2.1")}</option><option value="2024-legacy" ${initialRules === "2024-legacy" ? "selected" : ""}>${blocked ? ctx.t("2024 con opzioni legacy 2014 · resta personale: questa campagna blocca il legacy", "2024 with legacy 2014 options · stays personal: this campaign blocks legacy") : ctx.t("2024 con opzioni legacy 2014 · SRD 5.1", "2024 with legacy 2014 options · SRD 5.1")}</option></select></label><div data-clib-copy-preview>${copyRulesHTML(ctx, actorId, initialRules)}</div><p>${ctx.t("La copia è una scheda indipendente nella tua libreria: le modifiche alla copia non cambiano l’originale e viceversa. Non entra in nessuna campagna; potrai collegarla dopo.", "The copy is an independent sheet in your library: changes to the copy never change the original, and vice versa. It joins no campaign; you can link it later.")}</p><p class="muted">${ctx.t(`Copiati: caratteristiche, PF e risorse attuali, inventario (${actor.inventory?.length ?? 0}), incantesimi (${actor.spells?.length ?? 0}), capacità, storia e scelte di creazione. Non copiati: campagne e pedine, condizioni ed effetti in corso, creature compagne, piani privati, revisioni.`, `Copied: abilities, current HP and resources, inventory (${actor.inventory?.length ?? 0}), spells (${actor.spells?.length ?? 0}), features, story and creation choices. Not copied: campaigns and tokens, current conditions and effects, companions, private plans, revisions.`)}</p>${log ? `<label class="check-field"><input type="checkbox" name="log" checked> ${ctx.t(`Copia anche il registro delle avventure (${log} voci)`, `Also copy the adventure log (${log} entries)`)}</label>` : ""}`,
    {
      submitLabel: ctx.t("Crea la copia", "Create copy"),
      onSubmit: (data) => {
        let id = null;
        const label = ctx.t(`Copia di ${actor.name} creata`, `Copy of ${actor.name} created`);
        ctx.commit(
          label,
          (draft) => {
            id = copyCharacter(draft, actorId, ctx.role, {
              name: data.get("name"),
              includeLog: data.get("log") === "on",
              rules: String(data.get("rules") || "2024"),
            });
          },
          { local: true, visibility: "private" },
        );
        ui.notice = { kind: "copied", actorId: id, label };
        ui.focus = { card: id };
        if (ctx.view.page !== "characters" || ctx.view.id) ctx.navigate("characters");
        else ctx.render();
        ctx.toast(ctx.t("Copia creata nella tua libreria.", "Copy created in your library."));
      },
    },
  );
  const el = dialogEl();
  el?.querySelector("[data-clib-copy-rules]")?.addEventListener("change", (event) => {
    const box = el.querySelector("[data-clib-copy-preview]");
    if (box) box.innerHTML = copyRulesHTML(ctx, actorId, event.currentTarget.value);
  });
}
function openDelete(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  if (!actor) return;
  const preview = deletePreview(ctx.state, actorId);
  ctx.dialog(
    ctx.t(`Eliminare ${actor.name}?`, `Delete ${actor.name}?`),
    `<p>${ctx.t("La scheda va nel Cestino di Personaggi: potrai ripristinarla da lì.", "The sheet goes to the Characters trash: you can restore it from there.")}</p><ul class="clib-list">${
      preview.campaigns.length
        ? `<li>${ctx.esc(ctx.t(`Esce da: ${preview.campaigns.join(", ")}. Il gruppo e il DM non la vedranno più.`, `Leaves: ${preview.campaigns.join(", ")}. The group and the DM will no longer see it.`))}</li>`
        : `<li>${ctx.t("Non è in nessuna campagna.", "It is in no campaign.")}</li>`
    }<li>${ctx.t(`Pedine rimosse dalle mappe: ${preview.tokens}.`, `Tokens removed from maps: ${preview.tokens}.`)}</li>${preview.linkActive ? `<li>${ctx.t("Il link pubblico smette di funzionare.", "The public link stops working.")}</li>` : ""}</ul>`,
    {
      submitLabel: ctx.t("Sposta nel cestino", "Move to trash"),
      onSubmit: () => {
        let trashId = null;
        commitFor(
          ctx,
          actor,
          ctx.t(`${actor.name} spostata nel cestino`, `${actor.name} moved to the trash`),
          (draft) => {
            trashId = deleteCharacter(draft, actorId, ctx.role);
          },
        );
        ui.notice = { kind: "trashed", trashId, name: actor.name };
        ui.focus = { notice: true };
        if (ctx.view.id || ctx.view.page !== "characters") ctx.navigate("characters");
        else ctx.render();
        ctx.toast(ctx.t(`${actor.name} è nel cestino.`, `${actor.name} is in the trash.`));
      },
    },
  );
}
// "For example whoever plays X": another playable sheet of the same campaign, never the
// sheet being managed (nor another of its owner's).
function otherPlayerExample(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  const campaigns = campaignIdsOf(actor);
  return (
    Object.values(ctx.state.actors ?? {}).find(
      (row) =>
        playable(row) &&
        row.id !== actorId &&
        row.owner !== actor?.owner &&
        campaignIdsOf(row).some((id) => campaigns.includes(id)),
    )?.name ?? null
  );
}
function audienceRows(ctx, actorId, level) {
  const access = audienceAccess(ctx.state, actorId, level);
  const example = otherPlayerExample(ctx, actorId);
  const words = {
    full: ["Scheda completa", "Full sheet"],
    read: ["Scheda in sola lettura, senza comandi", "Read-only sheet, no commands"],
    summary: ["Solo nome, classe, livello e giocatore", "Only name, class, level and player"],
    none: ["Nessun accesso", "No access"],
  };
  const rows = [
    [ctx.t("Tu", "You"), words.full, "owner"],
    [
      ctx.t(
        "DM della campagna (vede sempre le schede della sua campagna)",
        "Campaign DM (always sees the sheets in their campaign)",
      ),
      words[access.dm],
      "dm",
    ],
    [
      example
        ? ctx.t(
            `Altri giocatori della campagna (per esempio chi gioca ${example})`,
            `Other players in the campaign (for example whoever plays ${example})`,
          )
        : ctx.t("Altri giocatori della campagna", "Other players in the campaign"),
      words[access.players],
      "players",
    ],
    [ctx.t("Chi ha il link", "Anyone with the link"), words[access.link], "link"],
  ];
  return `<table class="clib-audience" data-clib-audience><tbody>${rows
    .map(
      ([who, what, key]) =>
        `<tr data-audience="${key}" data-access="${key === "owner" ? "full" : access[key]}"><th scope="row">${who}</th><td>${ctx.t(...what)}</td></tr>`,
    )
    .join("")}</tbody></table>`;
}
function audiencePreview(ctx, actorId, level) {
  const actor = ctx.state.actors[actorId];
  const access = audienceAccess(ctx.state, actorId, level).players;
  if (access === "none")
    return `<p class="muted">${ctx.t("Non è in una campagna: gli altri giocatori non la vedono.", "It is not in a campaign: other players do not see it.")}</p>`;
  if (access === "summary") return summaryCard(ctx, actor);
  return `<div class="clib-mini">${summaryCard(ctx, actor)}<p class="muted">${ctx.t("…più la scheda completa in sola lettura (caratteristiche, equipaggiamento, incantesimi, storia).", "…plus the full read-only sheet (abilities, equipment, spells, story).")}</p></div>`;
}
function openPrivacy(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  if (!actor) return;
  const current = privacyOf(ctx.state, actorId);
  const option = (value, title, detail) =>
    `<label class="clib-choice"><input type="radio" name="privacy" value="${value}" ${value === current ? "checked" : ""}><span><strong>${title}</strong><small>${detail}</small></span></label>`;
  ctx.dialog(
    ctx.t(`Privacy di ${actor.name}`, `${actor.name} privacy`),
    `<fieldset class="clib-choices"><legend>${ctx.t("Chi può consultare la scheda", "Who can read the sheet")}</legend>${option("campaign", ctx.t("Solo campagna", "Campaign only"), ctx.t("I membri della campagna la consultano. È l’impostazione iniziale.", "Campaign members can read it. This is the default."))}${option("private", ctx.t(...PRIVACY_TEXT.private), ctx.t("Solo tu e il DM della campagna. Gli altri giocatori vedono solo nome, classe, livello e giocatore.", "Only you and the campaign’s DM. Other players see only name, class, level and player."))}${option("public", ctx.t("Pubblica con link", "Public by link"), ctx.t("Chiunque abbia il link la legge in sola lettura, anche fuori dalla campagna. Non compare in elenchi pubblici.", "Anyone with the link can read it, even outside the campaign. It never appears in public lists."))}</fieldset>${
      campaignIdsOf(actor).length
        ? ""
        : `<p class="muted" data-clib-personal-note>${ctx.t("Ora è una scheda personale, solo nella tua libreria: nessun altro la legge (salvo il link, se pubblica). Il livello scelto vale quando la colleghi a una campagna.", "It is now a personal sheet, only in your library: nobody else reads it (except by link, if public). The chosen level applies when you link it to a campaign.")}</p>`
    }<h3>${ctx.t("Chi vede cosa", "Who sees what")}</h3><div data-clib-audience-table>${audienceRows(ctx, actorId, current)}</div><h3>${ctx.t("Anteprima: come la vede un altro giocatore", "Preview: how another player sees it")}</h3><div data-clib-audience-preview>${audiencePreview(ctx, actorId, current)}</div>`,
    {
      submitLabel: ctx.t("Salva privacy", "Save privacy"),
      onSubmit: (data) => {
        const level = String(data.get("privacy") ?? "");
        commitFor(
          ctx,
          actor,
          ctx.t(
            `Privacy di ${actor.name}: ${ctx.t(...(PRIVACY_TEXT[level] ?? PRIVACY_TEXT.campaign))}`,
            `${actor.name} privacy: ${ctx.t(...(PRIVACY_TEXT[level] ?? PRIVACY_TEXT.campaign))}`,
          ),
          (draft) => setPrivacy(draft, actorId, level, ctx.role),
        );
        ctx.toast(ctx.t("Privacy aggiornata.", "Privacy updated."));
        if (level === "public") setTimeout(() => openShare(ctx, actorId), 0);
      },
    },
  );
  const el = dialogEl();
  el?.querySelectorAll("[name=privacy]").forEach((input) =>
    input.addEventListener("change", () => {
      const level = input.value;
      el.querySelector("[data-clib-audience-table]").innerHTML = audienceRows(ctx, actorId, level);
      el.querySelector("[data-clib-audience-preview]").innerHTML = audiencePreview(
        ctx,
        actorId,
        level,
      );
    }),
  );
}
// PG-93 (Demiplane one-tap QR, Owlbear «Share»): one «Condividi» dialog from the sheet
// header, the Manage menu and the palette. Privacy is shown first; a personal or campaign
// sheet becomes a read-only link and QR in one tap, and turns back as easily.
export function openShare(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  if (!actor) return;
  const entry = sliceOf(ctx.state)?.entries?.[actorId];
  if (entry?.privacy === "public" && entry.link) return openShareLink(ctx, actorId);
  const level = privacyOf(ctx.state, actorId);
  const owner = actor.owner === ctx.role && playable(actor);
  ctx.dialog(
    ctx.t(`Condividi ${actor.name}`, `Share ${actor.name}`),
    `<div class="clib-share" data-clib-share="${ctx.esc(level)}"><p>${privacyBadge(ctx, level, actor)}</p>${
      owner
        ? `<p>${ctx.t("Un link in sola lettura, con il suo QR: chi lo apre legge la scheda ma non la modifica e non entra nella campagna.", "A read-only link with its QR code: whoever opens it reads the sheet but cannot edit it or join the campaign.")}</p><div class="toolbar"><button type="button" class="button primary" data-clib-share-public>${ctx.t("Crea link e QR", "Create link and QR")}</button><button type="button" class="button" data-clib-act="privacy" data-actor="${ctx.esc(actorId)}">${ctx.t("Altre opzioni di privacy…", "Other privacy options…")}</button></div>`
        : `<p class="muted">${ctx.esc(ctx.t(`Solo chi possiede ${actor.name} può crearne il link.`, `Only ${actor.name}’s owner can create its link.`))}</p>`
    }</div>`,
    { cancelLabel: ctx.t("Chiudi", "Close") },
  );
  bindDialogActions(ctx);
  dialogEl()
    ?.querySelector("[data-clib-share-public]")
    ?.addEventListener("click", () => {
      commitFor(
        ctx,
        actor,
        ctx.t(`${actor.name}: link pubblico creato`, `${actor.name}: public link created`),
        (draft) => setPrivacy(draft, actorId, "public", ctx.role),
      );
      openShareLink(ctx, actorId);
      dialogEl()?.querySelector("[data-clib-copy-link]")?.focus?.();
    });
}
function openShareLink(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  const entry = sliceOf(ctx.state)?.entries?.[actorId];
  if (!actor || entry?.privacy !== "public" || !entry.link) return;
  const url = linkUrl(entry.link.code);
  ctx.dialog(
    ctx.t(`Condividi ${actor.name}`, `Share ${actor.name}`),
    `<div class="clib-share" data-clib-share><label class="field"><span>${ctx.t("Link in sola lettura", "Read-only link")}</span><input readonly value="${ctx.esc(url)}" data-clib-link-url></label><div class="toolbar"><button type="button" class="button primary" data-clib-copy-link>${ctx.t("Copia link", "Copy link")}</button><button type="button" class="button" data-clib-open-link>${ctx.t("Apri il link", "Open the link")}</button><button type="button" class="button" data-clib-act="regenerate" data-actor="${ctx.esc(actorId)}">${ctx.t("Genera un nuovo link", "Generate a new link")}</button>${actor.owner === ctx.role ? `<button type="button" class="button quiet" data-clib-act="privacy" data-actor="${ctx.esc(actorId)}">${ctx.t("Smetti di condividere…", "Stop sharing…")}</button>` : ""}</div><figure class="clib-qr">${X.qrSvg(url, { label: ctx.t(`QR del link di ${actor.name}`, `QR code of ${actor.name}’s link`), pixels: 208 })}<figcaption>${ctx.t("Inquadra con il telefono al tavolo: apre la stessa scheda in sola lettura.", "Scan with a phone at the table: it opens the same read-only sheet.")}</figcaption></figure><p class="muted">${ctx.t("Chi ha il link non può modificare, spendere risorse o entrare nella campagna. Un nuovo link disattiva il precedente. Dimostrazione locale: il link funziona in questo browser.", "People with the link cannot edit, spend resources or join the campaign. A new link turns off the previous one. Local demonstration: the link works in this browser.")}</p></div>`,
    { cancelLabel: ctx.t("Chiudi", "Close") },
  );
  const el = dialogEl();
  if (!el) return;
  bindDialogActions(ctx);
  el.querySelector("[data-clib-copy-link]")?.addEventListener("click", async () => {
    const input = el.querySelector("[data-clib-link-url]");
    let done = false;
    try {
      await globalThis.navigator?.clipboard?.writeText(url);
      done = true;
    } catch {
      input?.select();
      try {
        done = globalThis.document.execCommand("copy");
      } catch {
        done = false;
      }
    }
    ctx.toast(
      done
        ? ctx.t("Link copiato.", "Link copied.")
        : ctx.t(
            "Copia non riuscita: seleziona il link e copialo a mano.",
            "Copy failed: select the link and copy it manually.",
          ),
      !done,
    );
  });
  el.querySelector("[data-clib-open-link]")?.addEventListener("click", () =>
    ctx.navigate(ROUTE_LINK, { id: entry.link.code }),
  );
}
// The campaign picker of link and copy (DDB «Join with this character», Roll20 «Add to
// Game»): every campaign of this identity, the one in play first and preselected.
function campaignPicker(ctx, targets, selected = null) {
  return `<label class="field"><span>${ctx.t("Campagna", "Campaign")}</span><select name="campaign" data-clib-campaign>${targets.map((row) => `<option value="${ctx.esc(row.id)}" ${(selected ?? targets[0]?.id) === row.id ? "selected" : ""}>${ctx.esc(row.name)}${row.current ? ctx.esc(ctx.t(" · in gioco ora", " · in play now")) : ""}</option>`).join("")}</select></label>`;
}
function noCampaignDialog(ctx, title) {
  ctx.dialog(
    title,
    `<p>${ctx.t("Non c’è una campagna in cui portarla: la scheda è già in tutte le tue campagne, oppure non ne hai. Creane una o unisciti con un invito da Campagne.", "There is no campaign to bring it to: the sheet is already in all your campaigns, or you have none. Create one or join with an invite from Campaigns.")}</p><div class="toolbar"><button type="button" class="button" data-nav="campaigns">${ctx.t("Vai a Campagne", "Go to Campaigns")}</button></div>`,
    { cancelLabel: ctx.t("Chiudi", "Close") },
  );
  dialogEl()
    ?.querySelector("[data-nav]")
    ?.addEventListener("click", () => ctx.navigate("campaigns"));
}
function openLinkCampaign(ctx, actorId, campaignId = null) {
  const actor = ctx.state.actors[actorId];
  if (!actor) return;
  const targets = linkTargets(ctx.state, actorId, ctx.role);
  if (!targets.length)
    return noCampaignDialog(ctx, ctx.t("Collega alla campagna", "Link to campaign"));
  const level = privacyOf(ctx.state, actorId);
  const levelText = ctx.t(...PRIVACY_TEXT[level]);
  const disclosure = `<ul class="clib-list" data-clib-link-disclosure><li>${ctx.esc(ctx.t(`Privacy nella campagna: ${levelText}${level === "private" ? " (gli altri giocatori vedono solo nome, classe, livello e giocatore)" : ""}. Puoi cambiarla da Gestisci › Cambia privacy.`, `Privacy in the campaign: ${levelText}${level === "private" ? " (other players see only name, class, level and player)" : ""}. You can change it from Manage › Change privacy.`))}</li><li>${ctx.t("Le revisioni salvate finora restano visibili solo a te: il DM e il gruppo vedono la cronologia da questo momento.", "Revisions saved so far stay visible to you only: the DM and the group see the history from now on.")}</li></ul>`;
  ctx.dialog(
    ctx.t("Collega alla campagna", "Link to campaign"),
    `<p><strong>${ctx.esc(actor.name)}</strong></p>${campaignPicker(ctx, targets, campaignId)}<p>${ctx.t("Collegamento vivo: questa stessa scheda entra nella campagna. Ciò che accade al Tavolo cambia la scheda della tua libreria, perché è la stessa.", "Live link: this same sheet joins the campaign. What happens at the Table changes the sheet in your library, because it is the same one.")}</p><p class="muted">${ctx.t("I partecipanti potranno consultarla secondo la privacy; il DM la gestisce. Appunti personali e piani privati restano tuoi. Il DM posizionerà la pedina e sceglierà se includerla nell’iniziativa.", "Participants can read it according to its privacy; the DM manages it. Personal notes and private plans stay yours. The DM places the token and chooses whether to include it in initiative.")}</p>${disclosure}`,
    {
      submitLabel: ctx.t("Collega alla campagna", "Link to campaign"),
      onSubmit: (data) => {
        const target = String(data.get("campaign") || targets[0].id);
        const name = targets.find((row) => row.id === target)?.name ?? "";
        ctx.commit(
          ctx.t(`${actor.name} collegata a ${name}`, `${actor.name} linked to ${name}`),
          (draft) => linkToCampaign(draft, actorId, ctx.role, Date.now(), { campaignId: target }),
        );
        ctx.toast(
          ctx.t(
            `${actor.name} ora è nella campagna ${name}.`,
            `${actor.name} is now in the campaign ${name}.`,
          ),
        );
      },
    },
  );
}
/**
 * PG-85: from a campaign's Party page, «Aggiungi un mio personaggio» (DDB «Join with this
 * character»): pick one of your sheets that is not in that campaign yet, then link it (the
 * same sheet) or bring a copy.
 */
export function openLinkToCampaign(ctx, campaignId = ctx.state.campaign?.id) {
  const own = Object.values(ctx.state.actors ?? {}).filter(
    (actor) =>
      playable(actor) &&
      actor.owner === ctx.role &&
      linkTargets(ctx.state, actor.id, ctx.role).some((row) => row.id === campaignId),
  );
  const name = campaignName(ctx.state, campaignId);
  if (!own.length) {
    ctx.dialog(
      ctx.t("Aggiungi un mio personaggio", "Add one of my characters"),
      `<p>${ctx.esc(ctx.t(`Tutte le tue schede sono già in ${name}, oppure non ne hai ancora una.`, `All your sheets are already in ${name}, or you have none yet.`))}</p><div class="toolbar"><button type="button" class="button primary" data-clib-new-character>${ctx.t("Crea un personaggio", "Create a character")}</button></div>`,
      { cancelLabel: ctx.t("Chiudi", "Close") },
    );
    dialogEl()
      ?.querySelector("[data-clib-new-character]")
      ?.addEventListener("click", () => {
        ctx.closeDialog();
        ctx.navigate("builder-plus");
      });
    return;
  }
  ctx.dialog(
    ctx.t(`Aggiungi un mio personaggio a ${name}`, `Add one of my characters to ${name}`),
    `<label class="field"><span>${ctx.t("Personaggio", "Character")}</span><select name="actor" data-clib-link-actor>${own.map((actor) => `<option value="${ctx.esc(actor.id)}">${ctx.esc(actor.name)} · ${ctx.esc(classLine(ctx, actor, { species: false }))}</option>`).join("")}</select></label><fieldset class="clib-choice"><legend>${ctx.t("Come", "How")}</legend><label class="check-field"><input type="radio" name="how" value="link" checked> ${ctx.t("Collega la stessa scheda (ciò che accade al Tavolo cambia la scheda della tua libreria)", "Link the same sheet (what happens at the Table changes the sheet in your library)")}</label><label class="check-field"><input type="radio" name="how" value="copy"> ${ctx.t("Porta una copia indipendente (l’originale non cambia)", "Bring an independent copy (the original does not change)")}</label></fieldset><p class="muted">${ctx.t("Privacy iniziale: solo tu e il DM. Le revisioni salvate finora restano visibili solo a te.", "Initial privacy: only you and the DM. Revisions saved so far stay visible to you only.")}</p>`,
    {
      submitLabel: ctx.t("Aggiungi alla campagna", "Add to campaign"),
      onSubmit: (data) => {
        const actorId = String(data.get("actor"));
        const actor = ctx.state.actors[actorId];
        if (data.get("how") === "copy")
          ctx.commit(
            ctx.t(
              `Copia di ${actor.name} portata in ${name}`,
              `Copy of ${actor.name} brought to ${name}`,
            ),
            (draft) => bringCopyToCampaign(draft, actorId, ctx.role, { campaignId }),
          );
        else
          ctx.commit(
            ctx.t(`${actor.name} collegata a ${name}`, `${actor.name} linked to ${name}`),
            (draft) => linkToCampaign(draft, actorId, ctx.role, Date.now(), { campaignId }),
          );
        ctx.toast(
          ctx.t(
            `${actor.name} ora è nella campagna ${name}.`,
            `${actor.name} is now in the campaign ${name}.`,
          ),
        );
      },
    },
  );
}
function openBringCopy(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  if (!actor) return;
  // A copy may join any campaign of this identity, even one the original is already in.
  const targets = sliceOfMembers(ctx.state)
    ? members
        .listCampaigns(ctx.state, ctx.role)
        .filter((row) => row.role && row.role !== "observer")
        .map((row) => ({ id: row.id, name: row.name, current: row.current }))
        .sort((a, b) => Number(b.current) - Number(a.current))
    : [{ id: ctx.state.campaign.id, name: ctx.state.campaign.name, current: true }];
  ctx.dialog(
    ctx.t("Porta una copia nella campagna", "Bring a copy into the campaign"),
    `${campaignPicker(ctx, targets)}<label class="field"><span>${ctx.t("Nome della copia in campagna", "Name of the campaign copy")}</span><input name="name" required maxlength="60" value="${ctx.esc(`${actor.name} (${targets[0]?.name ?? ctx.state.campaign.name})`.slice(0, 60))}"></label><p>${ctx.t("Istantanea indipendente: la copia entra nella campagna, l’originale resta nella tua libreria e non cambia. Le due schede non si sincronizzano.", "Independent snapshot: the copy joins the campaign, the original stays in your library unchanged. The two sheets never sync.")}</p>`,
    {
      submitLabel: ctx.t("Porta la copia", "Bring the copy"),
      onSubmit: (data) => {
        let id = null;
        const label = ctx.t(
          `Copia di ${actor.name} portata in campagna`,
          `Copy of ${actor.name} brought into the campaign`,
        );
        ctx.commit(label, (draft) => {
          id = bringCopyToCampaign(draft, actorId, ctx.role, {
            name: data.get("name"),
            campaignId: String(data.get("campaign") || ctx.state.campaign.id),
          });
        });
        ui.notice = { kind: "copied", actorId: id, label };
        ui.focus = { card: id };
        if (ctx.view.id || ctx.view.page !== "characters") ctx.navigate("characters");
        else ctx.render();
        ctx.toast(
          ctx.t(
            "La copia è nella campagna; l’originale è rimasto nella libreria.",
            "The copy is in the campaign; the original stayed in the library.",
          ),
        );
      },
    },
  );
}
function openLeave(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  if (!actor) return;
  const preview = deletePreview(ctx.state, actorId);
  ctx.dialog(
    ctx.t(`${actor.name} lascia la campagna?`, `Should ${actor.name} leave the campaign?`),
    `<p>${ctx.esc(ctx.t(`La scheda esce da ${ctx.state.campaign.name} e resta nella tua libreria.`, `The sheet leaves ${ctx.state.campaign.name} and stays in your library.`))}</p><ul class="clib-list"><li>${ctx.t(`Pedine tolte dalle mappe della campagna: ${preview.tokens}.`, `Tokens removed from the campaign maps: ${preview.tokens}.`)}</li><li>${ctx.t("Il DM e il gruppo non la vedranno più.", "The DM and the group will no longer see it.")}</li></ul>`,
    {
      submitLabel: ctx.t("Lascia la campagna", "Leave campaign"),
      onSubmit: () => {
        const label = ctx.t(
          `${actor.name} ha lasciato la campagna`,
          `${actor.name} left the campaign`,
        );
        const campaign = ctx.state.campaign.name;
        ctx.commit(label, (draft) => leaveCampaign(draft, actorId, ctx.role));
        ui.notice = { kind: "left", actorId, label, campaign };
        ui.focus = { notice: true };
        if (ctx.view.id || ctx.view.page !== "characters") ctx.navigate("characters");
        else ctx.render();
        ctx.toast(
          ctx.t(
            `${actor.name} ora è solo nella tua libreria.`,
            `${actor.name} is now only in your library.`,
          ),
        );
      },
    },
  );
}
function openRelease(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  if (!actor) return;
  const campaign = ctx.state.campaign.name;
  const plans = actor.personalPlans?.[ctx.role] !== undefined || actor.futurePlan !== undefined;
  ctx.dialog(
    ctx.t(`Rilasciare ${actor.name} alla campagna?`, `Release ${actor.name} to the campaign?`),
    `<p>${ctx.esc(ctx.t(`${campaign} conserva la scheda come personaggio non assegnato: un altro giocatore potrà reclamarlo e il DM potrà gestirlo. Tu non la controllerai più.`, `${campaign} keeps the sheet as an unassigned character: another player can claim it and the DM can manage it. You will no longer control it.`))}</p><label class="check-field"><input type="checkbox" name="keep" checked> ${ctx.t("Conserva una copia indipendente nella mia libreria", "Keep an independent copy in my library")}</label><label class="field"><span>${ctx.t("Nome della copia", "Name of the copy")}</span><input name="name" maxlength="60" value="${ctx.esc(ctx.t(`${actor.name} (copia)`, `${actor.name} (copy)`))}"></label><ul class="clib-list" data-clib-release-notes><li>${ctx.t(
      plans
        ? "I tuoi piani privati per questo personaggio passano alla copia; senza copia vengono eliminati. I piani privati degli altri restano loro."
        : "Nessun tuo piano privato da spostare. I piani privati degli altri restano loro.",
      plans
        ? "Your private plans for this character move to the copy; without a copy they are deleted. Other people’s private plans stay theirs."
        : "No private plan of yours to move. Other people’s private plans stay theirs.",
    )}</li><li>${ctx.t("Le revisioni salvate quando la scheda era solo tua restano visibili solo a te.", "Revisions saved while the sheet was only yours stay visible to you only.")}</li></ul>`,
    {
      submitLabel: ctx.t("Rilascia", "Release"),
      onSubmit: (data) => {
        let result = null;
        const label = ctx.t(
          `${actor.name} rilasciata alla campagna`,
          `${actor.name} released to the campaign`,
        );
        ctx.commit(label, (draft) => {
          result = releaseCharacter(draft, actorId, ctx.role, {
            keepCopy: data.get("keep") === "on",
            name: data.get("name"),
          });
        });
        ui.notice = {
          kind: "released",
          actorId,
          copyId: result?.copyId ?? null,
          name: actor.name,
          campaign,
          label,
        };
        ui.focus = { notice: true };
        if (ctx.view.id) ctx.navigate("characters");
        else ctx.render();
        ctx.toast(ctx.t("Scheda rilasciata alla campagna.", "Sheet released to the campaign."));
      },
    },
  );
}
function openTransfer(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  if (!actor) return;
  const targets = transferTargets(ctx.state, actorId, ctx.role);
  if (!targets.length) {
    ctx.dialog(
      ctx.t("Trasferisci a un’altra campagna", "Transfer to another campaign"),
      `<p>${ctx.t("Non giochi in altre campagne. Entra in un’altra campagna da Campagne, poi torna qui.", "You play in no other campaign. Join another campaign from Campaigns, then come back.")}</p><div class="toolbar"><button type="button" class="button" data-nav="campaigns">${ctx.t("Vai a Campagne", "Go to Campaigns")}</button></div>`,
      { cancelLabel: ctx.t("Chiudi", "Close") },
    );
    dialogEl()
      ?.querySelector("[data-nav]")
      ?.addEventListener("click", () => ctx.navigate("campaigns"));
    return;
  }
  ctx.dialog(
    ctx.t(`Trasferisci ${actor.name}`, `Transfer ${actor.name}`),
    `<label class="field"><span>${ctx.t("Campagna di destinazione", "Destination campaign")}</span><select name="to">${targets.map((row) => `<option value="${ctx.esc(row.id)}">${ctx.esc(row.name)}${isManager(ctx.state, row.id, ctx.role) ? ctx.esc(ctx.t(" · la guidi tu: avviene subito", " · you run it: it happens at once")) : ""}</option>`).join("")}</select></label><p>${ctx.esc(ctx.t(`La stessa scheda, con progressi, inventario e storia, passa da ${ctx.state.campaign.name} alla destinazione quando il DM di destinazione accetta. Fino ad allora resta dov’è.`, `The same sheet, with progress, inventory and story, moves from ${ctx.state.campaign.name} to the destination once that campaign’s DM accepts. Until then it stays where it is.`))}</p><p class="muted">${ctx.esc(ctx.t(`Le revisioni salvate in ${ctx.state.campaign.name} restano visibili solo a te: il DM di destinazione vede la cronologia dal trasferimento in poi.`, `Revisions saved in ${ctx.state.campaign.name} stay visible to you only: the destination DM sees the history from the transfer on.`))}</p><p class="muted">${ctx.t("Per usare il personaggio in entrambe le campagne scegli invece Copia.", "To use the character in both campaigns choose Copy instead.")}</p>`,
    {
      submitLabel: ctx.t("Chiedi il trasferimento", "Request transfer"),
      onSubmit: (data) => {
        ctx.commit(
          ctx.t(`Trasferimento di ${actor.name} richiesto`, `Transfer of ${actor.name} requested`),
          (draft) => requestTransfer(draft, actorId, String(data.get("to")), ctx.role),
        );
        const to = String(data.get("to"));
        ctx.toast(
          isManager(ctx.state, to, ctx.role)
            ? ctx.t(
                `${actor.name} è stata trasferita a ${campaignName(ctx.state, to)}.`,
                `${actor.name} was transferred to ${campaignName(ctx.state, to)}.`,
              )
            : ctx.t(
                "Richiesta inviata al DM della campagna di destinazione.",
                "Request sent to the destination campaign’s DM.",
              ),
        );
      },
    },
  );
}
// Export Data (FVT-205) and Export to PDF (DDB-065) are the owner's: an exported file
// imports as a new editable sheet, which for a reader would be the copy R20-014 and I-174
// do not allow.
function exportJson(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  requireOwner(actor, ctx.role);
  const payload = X.exportCharacter(actor, {
    log: logOf(ctx.state, actorId),
    exportedBy: ctx.role,
  });
  const saved = download(
    X.exportFileName(actor),
    "application/json",
    JSON.stringify(payload, null, 2),
  );
  ctx.toast(
    saved
      ? ctx.t(
          `File ${X.exportFileName(actor)} scaricato.`,
          `File ${X.exportFileName(actor)} downloaded.`,
        )
      : ctx.t("Il download non è disponibile qui.", "Downloads are not available here."),
    !saved,
  );
}
function downloadPdf(ctx, actorId) {
  const actor = ctx.state.actors[actorId];
  requireOwner(actor, ctx.role);
  const bytes = X.characterPdf(readProjection(ctx, actor), ctx.lang);
  const name = X.exportFileName(actor).replace(/\.json$/, ".pdf");
  const saved = download(name, "application/pdf", bytes);
  ctx.toast(
    saved
      ? ctx.t(`PDF ${name} scaricato.`, `PDF ${name} downloaded.`)
      : ctx.t("Il download non è disponibile qui.", "Downloads are not available here."),
    !saved,
  );
}
export function download(name, type, content) {
  const doc = globalThis.document;
  if (!doc || !globalThis.URL?.createObjectURL) return false;
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = doc.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.hidden = true;
  doc.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}
const IMPORT_LABELS = {
  name: ["nome", "name"],
  className: ["classe", "class"],
  level: ["livello", "level"],
  abilities: ["caratteristiche", "abilities"],
  maxHp: ["PF massimi", "max HP"],
  hp: ["PF attuali", "current HP"],
  tempHp: ["PF temporanei", "temp HP"],
  ac: ["CA", "AC"],
  speed: ["velocità", "speed"],
  inventory: ["inventario", "inventory"],
  spells: ["incantesimi", "spells"],
  features: ["capacità", "features"],
  description: ["descrizione", "description"],
  backstory: ["storia", "backstory"],
  notes: ["annotazioni condivise", "shared annotations"],
  speciesId: ["specie", "species"],
  savingThrows: ["tiri salvezza", "saving throws"],
  skills: ["abilità", "skills"],
  skillModifiers: ["modificatori delle abilità", "skill modifiers"],
  proficiencyBonus: ["bonus di competenza", "proficiency bonus"],
  size: ["taglia", "size"],
  creatureType: ["tipo di creatura", "creature type"],
  hitDice: ["Dadi Vita", "Hit Dice"],
  spellSlots: ["slot incantesimo", "spell slots"],
  pactSlots: ["slot del patto", "pact slots"],
  buildSeed: ["classi e livelli", "classes and levels"],
  combatProfile: ["profilo di combattimento", "combat profile"],
  vitalityPolicy: ["regola a 0 PF", "0 HP rule"],
  personality: ["tratti, ideali, legami e difetti", "traits, ideals, bonds and flaws"],
};
function openImportPreview(ctx, parsed, fileName) {
  const p = parsed.preview;
  const ownNames = Object.values(ctx.state.actors)
    .filter((a) => a.owner === ctx.role)
    .map((a) => fold(a.name));
  const suggested = ownNames.includes(fold(p.name))
    ? ctx.t(`${p.name} (importata)`, `${p.name} (imported)`)
    : p.name;
  const foundry = p.format === "foundry-dnd5e";
  const updatable = importedFrom(ctx.state, parsed, ctx.role);
  const updateChoice = updatable.length
    ? `<fieldset class="clib-choice" data-clib-import-mode><legend>${ctx.t("Cosa fare", "What to do")}</legend><label class="check-field"><input type="radio" name="mode" value="update" checked> ${ctx.esc(ctx.t(`Aggiorna da file ${updatable[0].name}: solo i campi mappati; consumi, condizioni, campagne e storia restano`, `Update ${updatable[0].name} from the file: mapped fields only; spent resources, conditions, campaigns and history stay`))}</label><label class="check-field"><input type="radio" name="mode" value="new"> ${ctx.t("Importa come nuovo personaggio", "Import as a new character")}</label></fieldset>`
    : "";
  ctx.dialog(
    foundry
      ? ctx.t("Importa da Foundry VTT", "Import from Foundry VTT")
      : ctx.t("Importa personaggio", "Import character"),
    `<div class="clib-import" data-clib-import-preview data-clib-import-format="${ctx.esc(p.format ?? "")}">${foundry ? `<p class="muted">${ctx.t("Attore dnd5e di Foundry VTT: i campi sotto sono mappati sulla scheda 2024; il resto è elencato come non importato.", "Foundry VTT dnd5e actor: the fields below are mapped onto the 2024 sheet; the rest is listed as not imported.")}</p><h3>${ctx.t("Campi di Foundry mappati", "Foundry fields mapped")}</h3><p data-clib-mapped>${ctx.esc(p.mapped.join(", "))}</p>` : ""}<p>${ctx.t("File", "File")}: <strong>${ctx.esc(fileName)}</strong>${p.exportedAt ? ` · ${ctx.t("esportato il", "exported on")} ${dateTimeText(ctx, p.exportedAt)}` : ""}</p><dl class="clib-stats"><div><dt>${ctx.t("Nome", "Name")}</dt><dd>${ctx.esc(p.name)}</dd></div><div><dt>${ctx.t("Classe e livello", "Class and level")}</dt><dd>${ctx.esc(say(ctx, p.className) || "—")} · ${p.level}</dd></div><div><dt>${ctx.t("PF", "HP")}</dt><dd>${p.hp}/${p.maxHp}</dd></div><div><dt>${ctx.t("CA", "AC")}</dt><dd>${p.ac}</dd></div><div><dt>${ctx.t("Oggetti", "Items")}</dt><dd>${p.counts.inventory}</dd></div><div><dt>${ctx.t("Incantesimi", "Spells")}</dt><dd>${p.counts.spells}</dd></div><div><dt>${ctx.t("Capacità", "Features")}</dt><dd>${p.counts.features}</dd></div><div><dt>${ctx.t("Voci di registro", "Log entries")}</dt><dd>${p.counts.log}</dd></div></dl><h3>${ctx.t("Riconosciuti", "Recognized")}</h3><p data-clib-recognized>${ctx.esc(p.recognized.map((key) => ctx.t(...(IMPORT_LABELS[key] ?? [key, key]))).join(", "))}</p><h3>${ctx.t("Da completare dopo", "To complete afterwards")}</h3><ul class="clib-list">${p.missing.map((row) => `<li>${ctx.esc(say(ctx, row))}</li>`).join("")}</ul><h3>${ctx.t("Non importati", "Not imported")}</h3><p data-clib-ignored>${p.ignored.length ? ctx.esc(p.ignored.join(", ")) : ctx.t("Nessun dato ignorato.", "No data ignored.")}</p>${updateChoice}<label class="field"><span>${ctx.t("Nome del nuovo personaggio", "Name of the new character")}</span><input name="name" required maxlength="60" value="${ctx.esc(suggested)}"></label><p class="muted">${updatable.length ? ctx.t("Aggiornare cambia solo la scheda indicata; importare come nuovo crea un personaggio in più nella tua libreria.", "Updating changes only the named sheet; importing as new adds a character to your library.") : ctx.t("Si crea un nuovo personaggio solo nella tua libreria. Nessuna scheda esistente viene sostituita.", "A new character is created in your library only. No existing sheet is replaced.")}</p></div>`,
    {
      submitLabel: updatable.length
        ? ctx.t("Importa", "Import")
        : ctx.t("Importa come nuovo personaggio", "Import as a new character"),
      onSubmit: (data) => {
        if (updatable.length && data.get("mode") === "update") {
          const target = updatable[0];
          const label = ctx.t(
            `${target.name} aggiornata da file`,
            `${target.name} updated from file`,
          );
          commitFor(ctx, target, label, (draft) =>
            updateFromFile(draft, target.id, parsed, ctx.role, { fileName }),
          );
          ui.importError = null;
          ui.notice = { kind: "imported", actorId: target.id, label };
          ui.focus = { card: target.id };
          ctx.render();
          ctx.toast(ctx.t("Scheda aggiornata dal file.", "Sheet updated from the file."));
          return;
        }
        let id = null;
        const label = ctx.t(`Personaggio importato: ${p.name}`, `Character imported: ${p.name}`);
        ctx.commit(
          label,
          (draft) => {
            id = importCharacter(draft, parsed, ctx.role, { name: data.get("name"), fileName });
          },
          { local: true, visibility: "private" },
        );
        ui.importError = null;
        ui.notice = { kind: "imported", actorId: id, label };
        ui.focus = { card: id };
        ctx.render();
        ctx.toast(
          ctx.t(
            "Personaggio importato nella tua libreria.",
            "Character imported into your library.",
          ),
        );
      },
    },
  );
}
export async function handleImportFile(ctx, input) {
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  let parsed;
  if (file.size > X.MAX_IMPORT_BYTES) parsed = X.parseCharacterFile("", { bytes: file.size });
  else parsed = X.parseCharacterFile(await file.text(), { bytes: file.size });
  if (!parsed.ok) {
    ui.importError = { it: `${file.name}: ${parsed.it}`, en: `${file.name}: ${parsed.en}` };
    ctx.render();
    ctx.toast(ctx.t(parsed.it, parsed.en), true);
    return;
  }
  ui.importError = null;
  openImportPreview(ctx, parsed, file.name);
}

// ---------------------------------------------------------------- actions

export function runAction(ctx, act, data = {}) {
  const actorId = data.actor;
  const actor = actorId ? ctx.state.actors[actorId] : null;
  return attempt(ctx, () => {
    switch (act) {
      case "manage":
        return openManage(ctx, actorId);
      case "copy":
        return openCopy(ctx, actorId);
      case "delete":
        return openDelete(ctx, actorId);
      case "privacy":
        return openPrivacy(ctx, actorId);
      case "share":
        return openShare(ctx, actorId);
      case "regenerate": {
        commitFor(ctx, actor, ctx.t("Nuovo link della scheda", "New sheet link"), (draft) =>
          regenerateLink(draft, actorId, ctx.role),
        );
        ctx.toast(
          ctx.t(
            "Nuovo link attivo; il precedente non funziona più.",
            "New link active; the previous one no longer works.",
          ),
        );
        return openShare(ctx, actorId);
      }
      case "export":
        return exportJson(ctx, actorId);
      case "pdf":
        return downloadPdf(ctx, actorId);
      case "print":
        requireOwner(actor, ctx.role);
        return ctx.navigate(ROUTE_PRINT, { id: actorId });
      case "revisions":
        return ctx.navigate("characters", { id: actorId, tab: TAB_REVISIONS });
      case "log":
        return ctx.navigate("characters", { id: actorId, tab: TAB_LOG });
      case "link":
        return openLinkCampaign(ctx, actorId);
      case "bring-copy":
        return openBringCopy(ctx, actorId);
      case "leave":
        return openLeave(ctx, actorId);
      case "release":
        return openRelease(ctx, actorId);
      case "transfer":
        return openTransfer(ctx, actorId);
      case "withdraw-transfer": {
        const row = arrayOf(sliceOf(ctx.state)?.transfers).find(
          (item) => item.id === data.transfer,
        );
        ctx.commit(
          ctx.t("Richiesta di trasferimento ritirata", "Transfer request withdrawn"),
          (draft) => withdrawTransfer(draft, data.transfer, ctx.role),
        );
        ctx.closeDialog();
        return ctx.toast(
          ctx.t(
            `Richiesta per ${row?.toName ?? ""} ritirata.`,
            `Request for ${row?.toName ?? ""} withdrawn.`,
          ),
        );
      }
      case "accept-transfer":
      case "decline-transfer": {
        const accept = act === "accept-transfer";
        const row = arrayOf(sliceOf(ctx.state)?.transfers).find(
          (item) => item.id === data.transfer,
        );
        ctx.commit(
          accept
            ? ctx.t(
                `Trasferimento di ${row?.actorName} accettato`,
                `Transfer of ${row?.actorName} accepted`,
              )
            : ctx.t(
                `Trasferimento di ${row?.actorName} rifiutato`,
                `Transfer of ${row?.actorName} declined`,
              ),
          (draft) => answerTransfer(draft, data.transfer, accept, ctx.role),
        );
        return ctx.toast(
          accept
            ? ctx.t(
                `${row?.actorName} ora è in ${row?.toName}.`,
                `${row?.actorName} is now in ${row?.toName}.`,
              )
            : ctx.t("Richiesta rifiutata.", "Request declined."),
        );
      }
      case "restore": {
        const row = arrayOf(sliceOf(ctx.state)?.trash).find((item) => item.id === data.trash);
        let id = null;
        const personal = row?.actor?.visibility === "private";
        ctx.commit(
          ctx.t(
            `${row?.actor?.name ?? ""} ripristinata dal cestino`,
            `${row?.actor?.name ?? ""} restored from the trash`,
          ),
          (draft) => {
            id = restoreFromTrash(draft, data.trash, ctx.role);
          },
          personal ? { local: true, visibility: "private" } : {},
        );
        ui.notice = { kind: "restored", actorId: id };
        ui.focus = { card: id };
        ctx.render();
        return ctx.toast(ctx.t("Scheda ripristinata.", "Sheet restored."));
      }
      case "purge": {
        const row = arrayOf(sliceOf(ctx.state)?.trash).find((item) => item.id === data.trash);
        if (!row) return null;
        return ctx.dialog(
          ctx.t(
            `Eliminare definitivamente ${row.actor.name}?`,
            `Delete ${row.actor.name} permanently?`,
          ),
          `<p>${ctx.t("La scheda, le sue revisioni e il suo registro delle avventure non si potranno più ripristinare dal cestino.", "The sheet, its revisions and its adventure log can no longer be restored from the trash.")}</p>`,
          {
            submitLabel: ctx.t("Elimina definitivamente", "Delete permanently"),
            onSubmit: () => {
              const personal = row.actor.visibility === "private";
              ctx.commit(
                ctx.t(
                  `${row.actor.name} eliminata definitivamente`,
                  `${row.actor.name} deleted permanently`,
                ),
                (draft) => purgeFromTrash(draft, row.id, ctx.role),
                personal ? { local: true, visibility: "private" } : {},
              );
              ui.notice = null;
              ctx.toast(ctx.t("Eliminata definitivamente.", "Deleted permanently."));
            },
          },
        );
      }
      case "undo":
        ui.notice = null;
        ui.tabNotice = null;
        return ctx.undo();
      case "dismiss":
        ui.notice = null;
        return ctx.render();
      default:
        return null;
    }
  });
}

export function bindLibrary(el, ctx) {
  el.addEventListener("click", (event) => {
    const control = event.target.closest?.("[data-clib-act]");
    if (control && el.contains(control) && !control.disabled) {
      runAction(ctx, control.dataset.clibAct, control.dataset);
      return;
    }
    if (event.target.closest?.("[data-clib-print-now]")) globalThis.print?.();
  });
  const search = el.querySelector("[data-clib-search]");
  search?.addEventListener("input", () => {
    ui.query = search.value;
    let matched = 0;
    let total = 0;
    el.querySelectorAll("[data-clib-group]").forEach((group) => {
      let visible = 0;
      group.querySelectorAll("[data-clib-card]").forEach((card) => {
        total += 1;
        card.hidden = !matchesQuery(card.dataset.clibHaystack, card.dataset.level, search.value);
        if (!card.hidden) visible += 1;
      });
      matched += visible;
      const count = group.querySelector("[data-clib-group-count]");
      if (count) count.textContent = `(${visible})`;
    });
    const empty = el.querySelector("[data-clib-empty]");
    if (empty) empty.hidden = matched > 0;
    const counter = el.querySelector("[data-clib-count]");
    if (counter) counter.textContent = countText(ctx, matched, total);
  });
  const sort = el.querySelector("[data-clib-sort]");
  sort?.addEventListener("change", () =>
    attempt(ctx, () => {
      ui.focus = { sort: true };
      ctx.registry.setSetting(ctx, SORT_KEY, sort.value);
    }),
  );
  el.querySelector("[data-clib-import]")?.addEventListener("change", (event) =>
    handleImportFile(ctx, event.target).catch((error) => ctx.toast(refusalText(ctx, error), true)),
  );
  el.querySelector("[data-clib-trash]")?.addEventListener("toggle", (event) => {
    ui.trashOpen = event.target.open;
  });
  // Focus returns to where the change happened (sort control, new card, the notice with
  // its Restore/Undo). After a dialog it waits for the dialog to close: the native dialog
  // gives focus back to its (by then re-rendered, detached) opener when it closes.
  const focus = ui.focus;
  ui.focus = null;
  if (!focus) return;
  const place = () => {
    const root = el.isConnected === false ? globalThis.document : el;
    const id = focus.card && (globalThis.CSS?.escape ? CSS.escape(focus.card) : focus.card);
    const target =
      (focus.sort && root?.querySelector?.("[data-clib-sort]")) ||
      (id && root?.querySelector?.(`[data-clib-card="${id}"] [data-character-action="open"]`)) ||
      root?.querySelector?.("[data-clib-notice] button:not([data-clib-act=dismiss])");
    target?.focus?.();
  };
  if (focus.sort) place();
  else setTimeout(place, 0);
}
function bindCharactersRoute(el, ctx) {
  bindCharacters(el, ctx);
  bindLibrary(el, ctx);
}

// ---------------------------------------------------------------- registration

export function register(registry) {
  registry.registerStateSlice(ID, {
    version: VERSION,
    seed: (state) => seedSlice(state),
    normalize: (slice, fromVersion) => normalizeSlice(slice, fromVersion),
  });
  registry.registerStyles(new URL("./character-library.css", import.meta.url));
  registry.add("route", {
    id: "characters",
    replaces: true,
    label: { it: "Personaggi", en: "Characters" },
    icon: "person",
    render: renderCharactersRoute,
    bind: bindCharactersRoute,
  });
  registry.add("route", {
    id: ROUTE_LINK,
    label: { it: "Scheda condivisa", en: "Shared sheet" },
    render: renderLinkPage,
    bind: (el, ctx) => bindLibrary(el, ctx),
  });
  registry.add("route", {
    id: ROUTE_PRINT,
    label: { it: "Vista stampabile", en: "Printable view" },
    render: renderPrintPage,
    bind: (el, ctx) => {
      bindCharacters(el, ctx);
      bindLibrary(el, ctx);
    },
  });
  // History tabs for the sheet's readers only (a summary reader never gets the sheet).
  const isSheet = (ctx, actor) => playable(actor) && reads(sheetAccess(ctx.state, actor, ctx.role));
  registry.add("sheet-tab", {
    id: TAB_LOG,
    category: "notes",
    label: { it: "Registro", en: "Log" },
    order: 70,
    when: isSheet,
    render: renderLogTab,
    bind: bindLogTab,
  });
  registry.add("sheet-tab", {
    id: TAB_REVISIONS,
    category: "notes",
    label: { it: "Revisioni", en: "Revisions" },
    order: 80,
    when: isSheet,
    render: renderRevisionsTab,
    bind: bindRevisionsTab,
  });
  registry.add("settings", {
    id: ID,
    label: { it: "Personaggi: ordinamento dell’elenco", en: "Characters: list order" },
    scope: "device",
    fields: [
      {
        id: "sort",
        label: { it: "Ordina per", en: "Sort by" },
        type: "choice",
        default: DEFAULT_SORT,
        options: SORTS.map((value) => ({
          value,
          label: {
            it: sortLabel({ t: (it) => it }, value),
            en: sortLabel({ t: (it, en) => en }, value),
          },
        })),
      },
    ],
  });
  registry.add("notifications", {
    id: `${ID}-transfers`,
    label: { it: "Trasferimenti di personaggi", en: "Character transfers" },
    collect(ctx) {
      return incomingTransfers(ctx.state, ctx.role).map((row) => ({
        id: `${ID}-${row.id}`,
        title: { it: `Trasferimento · ${row.actorName}`, en: `Transfer · ${row.actorName}` },
        body: {
          it: `${members.personName(ctx.state, row.by, "it")} chiede di portarla in ${row.toName}`,
          en: `${members.personName(ctx.state, row.by, "en")} asks to bring it into ${row.toName}`,
        },
        time: row.createdAt,
        category: "requests",
        by: row.by,
        target: { page: "characters", params: {} },
      }));
    },
  });
  // PG-93: «Condividi» — the sheet in view, or a choice among your own sheets.
  const shareFromHere = (ctx) => {
    const open = ctx.view.page === "characters" && ctx.state.actors?.[ctx.view.id];
    if (open) return openShare(ctx, open.id);
    const own = Object.values(ctx.state.actors ?? {}).filter(
      (actor) => playable(actor) && actor.owner === ctx.role,
    );
    if (own.length === 1) return openShare(ctx, own[0].id);
    ctx.dialog(
      ctx.t("Quale scheda vuoi condividere?", "Which sheet do you want to share?"),
      own.length
        ? `<div class="dialog-menu">${own.map((actor) => `<button type="button" class="button" data-clib-share-pick="${ctx.esc(actor.id)}">${ctx.esc(actor.name)}</button>`).join("")}</div>`
        : `<p>${ctx.t("Non hai ancora una scheda da condividere.", "You have no sheet to share yet.")}</p>`,
      { cancelLabel: ctx.t("Chiudi", "Close") },
    );
    dialogEl()
      ?.querySelectorAll("[data-clib-share-pick]")
      .forEach((button) =>
        button.addEventListener("click", () => openShare(ctx, button.dataset.clibSharePick)),
      );
  };
  registry.add("service", {
    id: `${ID}-share`,
    label: { it: "Condividi la scheda", en: "Share the sheet" },
    run: shareFromHere,
  });
  registry.add("command", {
    id: `${ID}.share`,
    label: { it: "Condividi la scheda (link e QR)", en: "Share the sheet (link and QR)" },
    description: {
      it: "condividi, QR, codice QR, link, mostra la scheda a un amico, pubblica",
      en: "share, QR, QR code, link, show the sheet to a friend, public",
    },
    group: "services",
    run: shareFromHere,
  });
  // PG-85: «Aggiungi un mio personaggio» on the campaign's Party page.
  registry.add("service", {
    id: `${ID}-add-own`,
    label: { it: "Aggiungi un mio personaggio", en: "Add one of my characters" },
    run: (ctx) => openLinkToCampaign(ctx, ctx.state.campaign?.id),
  });
  registry.add("command", {
    id: `${ID}.add-own`,
    label: {
      it: "Aggiungi un mio personaggio alla campagna",
      en: "Add one of my characters to the campaign",
    },
    description: {
      it: "unisciti con questo personaggio, collega alla campagna, porta il personaggio",
      en: "join with this character, link to campaign, bring my character",
    },
    group: "campaign",
    run: (ctx) => openLinkToCampaign(ctx, ctx.state.campaign?.id),
  });
  registry.on("role-changed", () => resetLibraryView());
  registry.on("reset", () => {
    resetLibraryView();
    resetObserved();
  });
  registry.on("commit", (payload, { ctx }) => {
    if (ctx?.state) observe(ctx.state);
  });
}
