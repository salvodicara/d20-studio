// B30 — Home: pure domain for first steps, incomplete work, level-up signal, next
// sessions across campaigns, "Start here" sample content, what's-new read state, tips,
// tours and problem reports. No DOM access: the UI modules (home-ui.mjs, help.mjs,
// home-support.mjs) render these projections and commit these commands.
//
// Two kinds of data:
// - The personal "book" (welcome, news read, tips, tours, prepared reports) is per device and
//   per identity, like the B24/B17 read markers: personal bookkeeping, never a game event.
//   It lives outside the game state (help.mjs keeps it in localStorage), so it never writes
//   to the shared game log and gameplay Undo never touches it. Functions take a `book`
//   object ({identities: {<role>: record}}).
// - The "Start here" example creates real game records (a note, a sheet, a scene, an NPC, a
//   handout). Its record stays in the state slice `ext.home` (undo: "preserve") with a
//   `removed` list, so a gameplay Undo re-applies the example's creation and removal
//   (reconcileAfterUndo, registered as the slice's afterUndo).
//
// Patterns (IDs from docs/interview/CAPABILITY_CENSUS.md, market census rows):
// - Roll20 Quick Start with three paths and explicit close (R20-002); Owlbear GM Vault
//   "Start Here": quick start, a sample handout (full screen, show to players), a sample
//   enemy linked to a token and a session-notes template, all editable, nothing shared
//   unless chosen (VTL-003); Alchemy demo per role (VTL-004).
// - Foundry join page / Roll20 "Next Game" in the viewer's time zone (FVT-002,
//   R20-049, SVC-047): countdown in local time plus the agreed time.
// - DDB draft protection and Roll20 Charactermancer resume (DDB-011, DDB-217, R20-036).
// - BG3 level-up ready signal and queue (CRP-005).
// - Roll20 Announcements tab and DDB What's New (R20-003, DDB-007): read/unread.
// - BG3 contextual tutorials with archive and reset (CRP-001); Foundry tours with
//   progress that survives closing and can be reset (FVT-006).
// - Roll20 "Report a Bug" and FG logs (R20-199, R20-204): a summary without personal data.
//
// Rules baseline: Character Advancement XP thresholds, SRD 5.2.1 (EN 23 / IT 25), read
// from character-rules.mjs. A character without recorded XP sits at its level threshold
// (never an invented surplus), the same convention as the loot area.

import {
  isCampaignMember,
  createCampaignDraft,
  saveCampaignDraft,
  previewCampaignDraft,
  applyCampaignDraft,
  listCampaignDrafts,
} from "./campaign-content.mjs";
import { listSessionDrafts } from "./campaign-sessions.mjs";
import { listCharacterDrafts, BUILD_SECTIONS } from "./character-build.mjs";
import { quickOf, QUICK_STEPS, cobuildSessions, cobuildView } from "./builder-plus-domain.mjs";
import { listHomebrewDrafts } from "./homebrew.mjs";
import { canControlActor, canViewActor } from "./character-access.mjs";
import { XP_THRESHOLDS, characterZeroHpPolicy, getCharacterCatalog } from "./character-rules.mjs";
import { updateCharacterRestProfile } from "./rest-profile.mjs";
import { getById, poundsToKg } from "./srd-sample.mjs";
import { sliceOf as librarySlice, setPrivacy } from "./character-library.mjs";
import {
  duplicateScene,
  deleteScene,
  duplicateSceneNPC,
  createSceneNPC,
  placeSceneToken,
} from "./preparation.mjs";
import { saveMaterial, deleteMaterial, artList } from "./handouts-domain.mjs";

export const HOME_ID = "home";
export const SLICE_VERSION = 2;
export const MAX_REPORTS = 20;
export const MAX_REPORT_TEXT = 1000;
const MAX_REMOVED = 40;
const IDENTITY = /^[a-z0-9][a-z0-9-]{0,39}$/;
const KEY = /^[a-z0-9][a-z0-9:._-]{0,79}$/;
const DAY = 24 * 3600 * 1000;
const PARTS = ["actor", "scene", "npc", "handout"];

const clone = (value) => structuredClone(value);
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const iso = (now) => new Date(now).toISOString();
const isDate = (value) => typeof value === "string" && !Number.isNaN(Date.parse(value));
const str = (value) => (typeof value === "string" ? value : null);
export const refuse = (it, en) => {
  throw Object.assign(new Error(en), { it, en });
};
const checkRole = (role) => {
  if (!IDENTITY.test(String(role))) refuse("Identità non valida.", "Invalid identity.");
};

// ---------------------------------------------------------------- state slice (example)

export function seedHome() {
  return { identities: {} };
}
// What the game state keeps per identity: the live example and what "Remove the example"
// deleted (so a gameplay Undo does not bring it back).
export function blankRecord() {
  return { starter: null, removed: [] };
}
function normalizeStarter(raw) {
  if (!isObject(raw) || !isDate(raw.createdAt)) return null;
  const stamps = isObject(raw.stamps)
    ? Object.fromEntries(
        Object.entries(raw.stamps).filter(
          ([key, value]) => PARTS.includes(key) && typeof value === "string",
        ),
      )
    : {};
  return {
    createdAt: raw.createdAt,
    noteId: str(raw.noteId),
    actorId: str(raw.actorId),
    sceneId: str(raw.sceneId),
    npcId: str(raw.npcId),
    handoutId: str(raw.handoutId),
    stamps,
  };
}
function normalizeRecord(raw) {
  if (!isObject(raw)) return blankRecord();
  return {
    starter: normalizeStarter(raw.starter),
    removed: (Array.isArray(raw.removed) ? raw.removed : [])
      .filter((row) => isObject(row) && PARTS.includes(row.kind) && typeof row.id === "string")
      .map((row) => ({ kind: row.kind, id: row.id }))
      .slice(-MAX_REMOVED),
  };
}
// Version 1 also kept the personal bookkeeping here; from version 2 it is on the device
// (see the header), so it is dropped from the game state.
export function normalizeHome(slice, fromVersion = SLICE_VERSION) {
  if (fromVersion > SLICE_VERSION) throw Error("Home data comes from a newer version");
  const identities = {};
  for (const [id, raw] of Object.entries(isObject(slice?.identities) ? slice.identities : {}))
    if (IDENTITY.test(id)) identities[id] = normalizeRecord(raw);
  return { identities };
}
function sliceOf(state) {
  return state?.ext?.[HOME_ID] ?? null;
}
// Read-only projection of one identity's example record (never another identity's).
export function identityOf(state, role) {
  return clone(normalizeRecord(sliceOf(state)?.identities?.[role]));
}
function mutableRecord(state, role) {
  const slice = sliceOf(state);
  if (!slice) throw Error("Home state is not initialized");
  checkRole(role);
  slice.identities[role] = normalizeRecord(slice.identities[role]);
  return slice.identities[role];
}

// ---------------------------------------------------------------- personal book (device)

export function blankBook() {
  return { welcome: "open", newsRead: {}, tips: {}, tours: {}, reports: [] };
}
function normalizeBookRecord(raw) {
  const base = blankBook();
  if (!isObject(raw)) return base;
  const dated = (map, shape) =>
    Object.fromEntries(
      Object.entries(isObject(map) ? map : {}).filter(
        ([key, value]) => KEY.test(key) && shape(value),
      ),
    );
  return {
    welcome: raw.welcome === "hidden" ? "hidden" : "open",
    newsRead: dated(raw.newsRead, isDate),
    tips: dated(raw.tips, (value) => isObject(value) && isDate(value.archivedAt)),
    tours: dated(
      raw.tours,
      (value) =>
        isObject(value) &&
        Number.isInteger(value.step) &&
        value.step >= 0 &&
        ["paused", "done"].includes(value.status),
    ),
    reports: (Array.isArray(raw.reports) ? raw.reports : [])
      .filter(
        (row) =>
          isObject(row) &&
          typeof row.id === "string" &&
          isDate(row.createdAt) &&
          typeof row.summary === "string",
      )
      .slice(-MAX_REPORTS),
  };
}
export function normalizeBook(raw) {
  const identities = {};
  for (const [id, record] of Object.entries(isObject(raw?.identities) ? raw.identities : {}))
    if (IDENTITY.test(id)) identities[id] = normalizeBookRecord(record);
  return { identities };
}
export function bookOf(book, role) {
  return clone(normalizeBookRecord(book?.identities?.[role]));
}
function bookRecord(book, role) {
  checkRole(role);
  if (!isObject(book)) throw Error("Invalid personal book");
  if (!isObject(book.identities)) book.identities = {};
  book.identities[role] = normalizeBookRecord(book.identities[role]);
  return book.identities[role];
}

export function setWelcome(book, role, value) {
  if (!["open", "hidden"].includes(value)) refuse("Scelta non valida.", "Invalid choice.");
  bookRecord(book, role).welcome = value;
}
export function markNews(book, role, newsId, read, now = Date.now()) {
  if (!KEY.test(String(newsId))) refuse("Novità non trovata.", "News item not found.");
  const record = bookRecord(book, role);
  if (read) record.newsRead[newsId] = iso(now);
  else delete record.newsRead[newsId];
}
export function markAllNews(book, role, ids, now = Date.now()) {
  const record = bookRecord(book, role);
  for (const id of ids) if (KEY.test(String(id))) record.newsRead[id] ??= iso(now);
}
// BG3: a tutorial enters the journal when it occurs (first shown), not when closed.
export function archiveTip(book, role, tipId, now = Date.now()) {
  if (!KEY.test(String(tipId))) refuse("Suggerimento non trovato.", "Tip not found.");
  const record = bookRecord(book, role);
  record.tips[tipId] ??= { archivedAt: iso(now) };
}
export function resetTips(book, role) {
  bookRecord(book, role).tips = {};
}
// Foundry tours: progress survives closing; one tour or all can be reset.
export function saveTourProgress(book, role, tourId, step, status, stepCount) {
  if (!KEY.test(String(tourId))) refuse("Tour non trovato.", "Tour not found.");
  if (!Number.isInteger(step) || step < 0 || (stepCount && step >= stepCount))
    refuse("Passo del tour non valido.", "Invalid tour step.");
  if (!["paused", "done"].includes(status)) refuse("Stato non valido.", "Invalid status.");
  bookRecord(book, role).tours[tourId] = { step, status };
}
export function resetTours(book, role, tourId = null) {
  const record = bookRecord(book, role);
  if (tourId) delete record.tours[tourId];
  else record.tours = {};
}

// ---------------------------------------------------------------- campaigns and sessions

const DEFAULT_MEMBERS = [
  { id: "player", role: "player" },
  { id: "dm", role: "dm" },
];
// Every campaign the identity belongs to: the current one (core state) plus campaigns the
// B13 area parks while another is current. The B13 slice is read defensively, never written.
export function campaignsOf(state, role) {
  const rows = [];
  const meta = state?.ext?.["campaign-members"];
  const active = (id) => {
    const status = meta?.campaigns?.[id]?.status;
    return !status || status === "active";
  };
  const current = state?.campaign;
  if (current?.id && isCampaignMember(state, current.id, role) && active(current.id))
    rows.push({ id: current.id, name: current.name, current: true, campaign: current });
  for (const [id, parked] of Object.entries(isObject(meta?.parked) ? meta.parked : {})) {
    const campaign = parked?.campaign;
    if (!isObject(campaign) || id === current?.id || typeof campaign.name !== "string") continue;
    const members = Array.isArray(campaign.members) ? campaign.members : DEFAULT_MEMBERS;
    if (!members.some((member) => member?.id === role && member.active !== false)) continue;
    if (!active(id)) continue;
    rows.push({ id, name: campaign.name, current: false, campaign });
  }
  return rows;
}
// The next scheduled session of each campaign, soonest first (Roll20 "Next Game").
export function upcomingSessions(state, role, now = Date.now()) {
  return campaignsOf(state, role)
    .map((row) => {
      const next = (Array.isArray(row.campaign.sessions) ? row.campaign.sessions : [])
        .filter(
          (session) =>
            session?.status === "scheduled" &&
            isDate(session.startsAt) &&
            Date.parse(session.startsAt) >= now,
        )
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
      return next
        ? { campaignId: row.id, campaignName: row.name, current: row.current, session: clone(next) }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.session.startsAt.localeCompare(b.session.startsAt));
}
const UNITS = {
  it: { day: ["giorno", "giorni"], hour: ["ora", "ore"], minute: ["minuto", "minuti"] },
  en: { day: ["day", "days"], hour: ["hour", "hours"], minute: ["minute", "minutes"] },
};
// "tra 2 giorni e 5 ore" / "in 2 days and 5 hours": two units at most, never rounded up
// into a later moment than the real one.
export function countdownText(ms, lang = "it") {
  const words = UNITS[lang === "en" ? "en" : "it"];
  const unit = (count, name) => `${count} ${words[name][count === 1 ? 0 : 1]}`;
  if (!Number.isFinite(ms) || ms < 60 * 1000)
    return lang === "en" ? "starting now" : "sta per iniziare";
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const parts = days
    ? [unit(days, "day"), hours ? unit(hours, "hour") : ""]
    : hours
      ? [unit(hours, "hour"), minutes ? unit(minutes, "minute") : ""]
      : [unit(minutes, "minute")];
  const text = parts.filter(Boolean).join(lang === "en" ? " and " : " e ");
  return lang === "en" ? `in ${text}` : `tra ${text}`;
}
function safeFormat(lang, instant, timeZone) {
  try {
    return new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "it-IT", {
      dateStyle: "full",
      timeStyle: "short",
      ...(timeZone ? { timeZone } : {}),
    }).format(new Date(instant));
  } catch {
    return new Date(instant).toISOString().slice(0, 16).replace("T", " ") + " UTC";
  }
}
export function viewerZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
// Local time in the viewer's zone plus the time as agreed in the organizer's zone.
export function sessionTimes(session, lang = "it", zone = viewerZone()) {
  const agreedZone =
    typeof session?.timeZone === "string" && session.timeZone ? session.timeZone : zone;
  return {
    local: safeFormat(lang, session.startsAt, zone),
    localZone: zone,
    agreed: safeFormat(lang, session.startsAt, agreedZone),
    agreedZone,
    sameZone: agreedZone === zone,
  };
}

// ---------------------------------------------------------------- level-up signal

const threshold = (level) => XP_THRESHOLDS[Math.min(20, Math.max(1, level)) - 1];
export function xpStatus(actor) {
  const level = Number.isInteger(actor?.level) ? actor.level : 1;
  const recorded = Number.isInteger(actor?.xp);
  const xp = recorded ? actor.xp : threshold(level);
  if (level >= 20)
    return { level, xp, recorded, floor: threshold(level), next: null, needed: null, ready: false };
  const needed = threshold(level + 1);
  return {
    level,
    xp,
    recorded,
    floor: threshold(level),
    next: level + 1,
    needed,
    ready: xp >= needed,
  };
}
// Who may advance this sheet from Home and the sheet: its owner, as the queue shows it.
export const canAdvance = (state, actor, role) =>
  Boolean(
    actor?.kind === "character" &&
    !actor.companion &&
    actor.owner === role &&
    canControlActor(actor, role, state),
  );
// BG3 queue: every character of this identity that can level, in a stable order. The DM
// sees its own sheets only: advancing a player's character is the player's choice.
export function levelUpQueue(state, role) {
  const drafts = listCharacterDrafts(state, role);
  return Object.values(state?.actors ?? {})
    .filter((actor) => canAdvance(state, actor, role))
    .map((actor) => ({ actor, status: xpStatus(actor) }))
    .filter(({ status }) => status.ready)
    .sort((a, b) => a.actor.name.localeCompare(b.actor.name))
    .map(({ actor, status }) => ({
      actorId: actor.id,
      name: actor.name,
      ...status,
      draftId:
        drafts.find((draft) => draft.kind === "advance" && draft.actorId === actor.id)?.id ?? null,
    }));
}

// ---------------------------------------------------------------- incomplete work

const DRAFT_KINDS = {
  create: { it: "Nuovo personaggio", en: "New character" },
  reconstruct: { it: "Ricostruzione della scheda", en: "Sheet reconstruction" },
  advance: { it: "Avanzamento di livello", en: "Level up" },
  revise: { it: "Revisione delle scelte", en: "Revised choices" },
};
const QUICK_STEP_NAMES = {
  class: { it: "Classe", en: "Class" },
  background: { it: "Background", en: "Background" },
  species: { it: "Specie", en: "Species" },
  identity: { it: "Nome e ritratto", en: "Name and portrait" },
  review: { it: "Riepilogo", en: "Review" },
};
const ENTRY_KINDS = {
  note: { it: "Appunto", en: "Note" },
  world: { it: "Voce del mondo", en: "World entry" },
  quest: { it: "Missione", en: "Quest" },
  recap: { it: "Resoconto", en: "Recap" },
};
// DDB/Roll20: every saved private draft of this identity, newest first, with the route
// that resumes it exactly where it was left (the builder section is kept).
export function incompleteWork(state, role) {
  const rows = [];
  for (const draft of listCharacterDrafts(state, role)) {
    const actor = draft.actorId ? state.actors?.[draft.actorId] : null;
    const section = BUILD_SECTIONS.find((item) => item.id === draft.section) ?? BUILD_SECTIONS[0];
    // Roll20 resumable Charactermancer: a draft left in the quick path reopens there, on the
    // same step, with its choices (the class chosen at step 1 stays chosen).
    const quick = quickOf(state, draft.id, role);
    if (quick?.status === "active") {
      const step = QUICK_STEP_NAMES[quick.step] ?? QUICK_STEP_NAMES.class;
      const n = Math.max(0, QUICK_STEPS.indexOf(quick.step)) + 1;
      rows.push({
        kind: "character",
        id: draft.id,
        title: quick.name?.trim() || draft.data?.identity?.name?.trim() || null,
        type: DRAFT_KINDS.create,
        builder: "quick",
        step: quick.step,
        section: {
          it: `Percorso rapido · passo ${n} di ${QUICK_STEPS.length}: ${step.it}`,
          en: `Quick path · step ${n} of ${QUICK_STEPS.length}: ${step.en}`,
        },
        updatedAt: quick.updatedAt ?? draft.updatedAt ?? draft.createdAt ?? null,
        route: { page: "builder-plus", params: { id: draft.id, tab: "quick" } },
      });
      continue;
    }
    rows.push({
      kind: "character",
      id: draft.id,
      title: actor?.name || draft.data?.identity?.name?.trim() || null,
      type: DRAFT_KINDS[draft.kind] ?? DRAFT_KINDS.create,
      section: section.name,
      updatedAt: draft.updatedAt ?? draft.createdAt ?? null,
      route: { page: "builder", params: { id: draft.id, tab: section.id } },
    });
  }
  // PG-19 (Quest Portal shared sheet): a draft another identity shares with me to build
  // together waits here too, and reopens the shared page.
  for (const session of cobuildSessions(state, role).filter((row) => row.owner !== role)) {
    let name = null;
    try {
      name = cobuildView(state, session.id, role).fields.find((f) => f.id === "name")?.value;
    } catch {
      continue;
    }
    rows.push({
      kind: "cobuild",
      id: session.id,
      title: name?.trim() || null,
      type: { it: "Bozza condivisa con te", en: "Draft shared with you" },
      section: null,
      updatedAt: session.updatedAt ?? session.createdAt ?? null,
      route: { page: "builder-plus", params: { tab: "cobuild", id: session.id } },
    });
  }
  for (const draft of listHomebrewDrafts(state, role)) {
    const name = draft.data?.name;
    rows.push({
      kind: "homebrew",
      id: draft.id,
      title: (isObject(name) ? name.it || name.en : name) || null,
      type: { it: "Contenuto della Biblioteca", en: "Library content" },
      section: null,
      updatedAt: draft.updatedAt ?? draft.createdAt ?? null,
      route: {
        page: "library",
        params: {
          id: draft.id,
          tab: "edit",
          ...(draft.returnTo ? { returnTo: JSON.stringify(draft.returnTo) } : {}),
        },
      },
    });
  }
  for (const draft of listCampaignDrafts(state, role)) {
    rows.push({
      kind: "entry",
      id: draft.id,
      title: draft.data?.title?.trim() || null,
      type: ENTRY_KINDS[draft.kind] ?? ENTRY_KINDS.note,
      section: null,
      updatedAt: draft.updatedAt ?? draft.createdAt ?? null,
      route: {
        page: draft.kind === "note" ? "notes" : "campaign",
        params: {
          tab: "edit",
          id: draft.id,
          ...(draft.returnTo ? { returnTo: JSON.stringify(draft.returnTo) } : {}),
        },
      },
    });
  }
  for (const draft of listSessionDrafts(state, role)) {
    rows.push({
      kind: "session",
      id: draft.id,
      title: draft.data?.title?.trim() || null,
      type: { it: "Sessione da fissare", en: "Session to schedule" },
      section: null,
      updatedAt: draft.updatedAt ?? draft.createdAt ?? null,
      route: {
        page: "campaign",
        params: {
          tab: "edit",
          id: draft.id,
          ...(draft.returnTo ? { returnTo: JSON.stringify(draft.returnTo) } : {}),
        },
      },
    });
  }
  return rows.sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
}

// ---------------------------------------------------------------- new identity

// A person with nothing yet: no own character, no campaign, no personal note or draft.
export function isNewIdentity(state, role) {
  const ownsCharacter = Object.values(state?.actors ?? {}).some(
    (actor) => actor?.owner === role && actor.kind === "character" && !actor.companion,
  );
  const notes = (state?.campaignContent?.entries ?? []).some((entry) => entry?.ownerId === role);
  return (
    !ownsCharacter &&
    !notes &&
    !campaignsOf(state, role).length &&
    !incompleteWork(state, role).length
  );
}

// IN-07 (Roll20 Quick Start at the top of an empty dashboard): «Primi passi» leads Home while
// this identity still has no character of its own or no campaign; otherwise it folds away.
export function needsFirstSteps(state, role) {
  const ownsCharacter = Object.values(state?.actors ?? {}).some(
    (actor) => actor?.owner === role && actor.kind === "character" && !actor.companion,
  );
  return !ownsCharacter || !campaignsOf(state, role).length;
}

// Characters opened recently on this device (DDB widget), still visible to this identity.
export function recentCharacters(state, role, recents = []) {
  const seen = new Set();
  return (Array.isArray(recents) ? recents : [])
    .filter(
      (row) => isObject(row) && typeof row.id === "string" && !seen.has(row.id) && seen.add(row.id),
    )
    .map((row) => ({ row, actor: state?.actors?.[row.id] }))
    .filter(
      ({ actor }) =>
        actor &&
        (actor.kind === "character" || actor.companion) &&
        canViewActor(actor, role, state),
    )
    .slice(0, 4)
    .map(({ row, actor }) => ({
      id: actor.id,
      name: actor.name,
      className: actor.className ?? null,
      level: actor.level ?? null,
      hp: actor.hp,
      maxHp: actor.maxHp,
      control: canControlActor(actor, role, state),
      openedAt: row.at ?? null,
    }));
}
// Device list update: most recent first, at most eight, per identity.
export function rememberRecent(list, id, now = Date.now()) {
  const rows = (Array.isArray(list) ? list : []).filter((row) => row?.id !== id);
  return [{ id, at: iso(now) }, ...rows].slice(0, 8);
}

// ---------------------------------------------------------------- "Start here" sample

const START_TEXT = {
  it: {
    title: "Inizia qui",
    body: "Questa nota è solo tua (Solo io): nessun altro la legge finché non scegli di condividerla. Modificala, riscrivila o togli le parti che non ti servono.",
    quick: "Guida rapida",
    quickPlayer:
      "1. Apri Personaggi e scegli la scheda di prova.\n2. Prova un tiro: puoi usare dadi fisici (scrivi le facce) o digitali.\n3. Entra al Tavolo quando il DM avvia la partita.\n4. Premi «?» in alto su ogni pagina per l’aiuto di quella pagina.\n5. Annulla ultima modifica corregge un errore; le correzioni restano nel registro.",
    quickDm:
      "1. Apri Preparazione e guarda la scena di prova: i giocatori non la vedono.\n2. Il goblin d’esempio è già una pedina della scena: aprine la scheda o prepara l’iniziativa.\n3. In Materiali apri l’handout di prova a tutto schermo; «Mostra…» lo fa vedere ai giocatori solo quando scegli tu.\n4. Premi «?» in alto su ogni pagina per l’aiuto di quella pagina.\n5. Annulla ultima modifica corregge un errore; le correzioni restano nel registro.",
    template: "Modello: appunti di sessione",
    templateBody:
      "Data:\nChi c’era:\nCosa è successo:\nIndizi e nomi da ricordare:\nDa fare per la prossima volta:",
    sample: "Il tuo esempio",
    samplePlayer:
      "«%NAME%» è una scheda di prova privata: una guerriera umana di 1° livello (Soldato) costruita con le regole SRD 5.2.1 (2024). Puoi tirare, cambiare i punti ferita e l’inventario senza toccare nessuna campagna. Per usarla in gioco la colleghi tu dalla scheda.",
    sampleDm:
      "«%NAME%» è una scena privata copiata dalla scena attiva, con un nemico d’esempio («%NPC%») collegato alla sua pedina. L’handout «%HANDOUT%» è in Materiali, non mostrato. Tutto resta nascosto ai giocatori finché non lo mostri; «Rimuovi l’esempio» toglie ciò che non hai modificato.",
    character: "Tessa (esempio)",
    scene: "Inizia qui · scena di prova",
    npc: "Goblin (esempio)",
    handout: "Inizia qui · handout di prova",
    handoutPlayer:
      "Un foglio ingiallito, fissato al portone con un chiodo: «Chi trova la lanterna perduta la riporti alla gilda. Ricompensa garantita.»",
    handoutDm:
      "Handout di prova: aprilo a tutto schermo, poi prova «Mostra…» scegliendo a chi. La nota del DM non esce mai.",
  },
  en: {
    title: "Start here",
    body: "This note is yours alone (Only me): nobody else reads it until you choose to share it. Edit it, rewrite it or remove the parts you do not need.",
    quick: "Quick start",
    quickPlayer:
      "1. Open Characters and choose the practice sheet.\n2. Try a roll: use physical dice (type the faces) or digital dice.\n3. Enter the Table when the DM starts the game.\n4. Press “?” at the top of any page for help with that page.\n5. Undo last change corrects a mistake; corrections stay in the log.",
    quickDm:
      "1. Open Preparation and look at the practice scene: players cannot see it.\n2. The sample goblin is already a token on the scene: open its sheet or prepare initiative.\n3. In Materials open the practice handout full screen; “Show…” lets players see it only when you choose.\n4. Press “?” at the top of any page for help with that page.\n5. Undo last change corrects a mistake; corrections stay in the log.",
    template: "Template: session notes",
    templateBody:
      "Date:\nWho was there:\nWhat happened:\nClues and names to remember:\nTo do before next time:",
    sample: "Your sample",
    samplePlayer:
      "“%NAME%” is a private practice sheet: a level 1 human fighter (Soldier) built with the SRD 5.2.1 (2024) rules. Roll, change hit points and inventory without touching any campaign. To use it in play, link it yourself from the sheet.",
    sampleDm:
      "“%NAME%” is a private scene copied from the active scene, with a sample enemy (“%NPC%”) linked to its token. The handout “%HANDOUT%” is in Materials, not shown. Everything stays hidden from players until you show it; “Remove the example” removes what you have not changed.",
    character: "Tessa (sample)",
    scene: "Start here · practice scene",
    npc: "Goblin (sample)",
    handout: "Start here · practice handout",
    handoutPlayer:
      "A yellowed sheet nailed to the gate: “Whoever finds the lost lantern, bring it back to the guild. Reward guaranteed.”",
    handoutDm:
      "Practice handout: open it full screen, then try “Show…” and choose who sees it. The DM note never leaves.",
  },
};
const personal = () => ({ mode: "private", grants: [] });
const NPC_BASE = "goblin-1";

// A short, stable fingerprint of what a person changes by using a record: if it differs
// from the one taken at creation, the record has become the person's own.
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (isObject(value))
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value ?? null);
}
function hash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16);
}
const ACTOR_FIELDS = [
  "name",
  "level",
  "xp",
  "hp",
  "maxHp",
  "tempHp",
  "ac",
  "abilities",
  "className",
  "notes",
  "inventory",
  "conditions",
  "exhaustion",
  "spellSlots",
  "pactSlots",
  "hitDice",
  "campaignIds",
  "visibility",
];
function actorStamp(actor) {
  const picked = Object.fromEntries(ACTOR_FIELDS.map((key) => [key, actor?.[key] ?? null]));
  picked.featuresUsed = (actor?.features ?? []).map((feature) => feature?.used ?? null);
  return hash(stable(picked));
}
const sceneStamp = (scene) => hash(stable(scene ?? null));
function handoutOf(state, id) {
  return (state?.ext?.handouts?.materials ?? []).find((row) => row.id === id) ?? null;
}
const handoutStamp = (material) =>
  hash(
    stable({
      title: material?.title,
      image: material?.image,
      playerText: material?.playerText,
      dmNote: material?.dmNote,
      sections: material?.sections,
      access: material?.access,
      shows: material?.shows,
    }),
  );
// An accepted roll of this creature stays in the log: the sheet has been played.
const rolledBy = (state, id) =>
  (state.log ?? []).some((entry) => (entry.rolls ?? []).some((roll) => roll?.actorId === id));

// The practice sheet is an authored premade (the DDB/Roll20 "premade character" idea), never
// a copy of a live sheet: another identity's sheet may be private, changed or deleted, and
// copying it would hand its content to someone not allowed to read it (review P1). Tessa is
// a level 1 human fighter with the Soldier background, built only from SRD 5.2.1 rows of
// the catalog: standard array 15/14/13/12/10/8 (STR 15, CON 14, DEX 13, WIS 12, CHA 10,
// INT 8) plus the Soldier's +2 STR / +1 CON; 10 + CON hit points at level 1; Chain Mail
// AC 16; fighter STR/CON saves; Soldier skills plus two fighter skills and Human Skillful.
// Starting equipment: the items of fighter option A present in the sample catalog.
const PRACTICE_SOURCE = Object.freeze({
  kind: "authored-demo",
  edition: "2024",
  revision: "blueprint-b30-tessa-1",
  note: "Authored practice premade from SRD 5.2.1 rows (fighter 1, human, Soldier); not an official premade and not a copy of any other sheet.",
});
const PRACTICE_KIT = [
  ["chain-mail", 1, true],
  ["greatsword", 1, true],
  ["javelin", 8, false],
];
function practiceItem(actorId, [slug, quantity, equipped]) {
  const entry = getById(`srd2024:item:${slug}`);
  if (!entry) return null;
  return {
    id: `${actorId}-${slug}`,
    srdId: entry.id,
    name: clone(entry.name),
    description: clone(entry.summary),
    kind: entry.category === "weapon" ? "weapon" : "gear",
    category: entry.category,
    quantity,
    weight: entry.weight == null ? null : poundsToKg(entry.weight),
    equipped,
    ...(entry.weapon ? { weaponType: entry.slug ?? slug, weapon: clone(entry.weapon) } : {}),
    ...(entry.armor ? { armor: clone(entry.armor) } : {}),
    source: clone(entry.source),
  };
}
export function makePracticeCharacter(id, name, owner, now = Date.now()) {
  const catalog = getCharacterCatalog();
  const fighter = catalog.classes.find((row) => row.id === "fighter");
  const human = catalog.species.find((row) => row.id === "human");
  const soldier = catalog.backgrounds.find((row) => row.id === "soldier");
  const feat = (featId) => catalog.feats.find((row) => row.id === featId);
  const record = (row, grantId) =>
    row ? { ...clone(row), grantId, definitionId: row.id, id: `${grantId}:${row.id}` } : null;
  const features = [
    ...(fighter?.features ?? [])
      .filter((row) => row.level <= 1)
      .map((row) => record(row, "class:fighter")),
    record(feat("great-weapon-fighting"), "class:fighter:fighting-style"),
    ...(human?.features ?? []).map((row) => record(row, "species:human")),
    record(feat(soldier?.featId), "background:soldier"),
  ].filter(Boolean);
  // Second Wind: two uses at level 1, one back on a Short Rest, all on a Long Rest.
  const secondWind = features.find((row) => row.definitionId === "fighter:second-wind");
  if (secondWind) Object.assign(secondWind, { max: 2, used: 0 });
  const actor = {
    id,
    name,
    kind: "character",
    owner,
    controllers: [],
    visibility: "private",
    campaignIds: [],
    className: { it: "Guerriera", en: "Fighter" },
    level: 1,
    speciesId: "human",
    backgroundId: "soldier",
    size: "medium",
    creatureType: "humanoid",
    hp: 12,
    maxHp: 12,
    tempHp: 0,
    ac: 16,
    speed: 9,
    movement: 9,
    movementSpent: 0,
    dashCount: 0,
    action: true,
    bonus: true,
    reaction: true,
    proficiencyBonus: 2,
    conditions: [],
    exhaustion: 0,
    dead: false,
    abilities: { str: 17, dex: 13, con: 15, int: 8, wis: 12, cha: 10 },
    savingThrows: { str: 5, dex: 1, con: 4, int: -1, wis: 1, cha: 0 },
    skills: ["athletics", "intimidation", "perception", "survival", "insight"],
    skillModifiers: { athletics: 5, intimidation: 2, perception: 3, survival: 3, insight: 3 },
    hitDice: { d10: { max: 1, used: 0 } },
    slots: { used: 0, max: 0 },
    inventory: PRACTICE_KIT.map((row) => practiceItem(id, row)).filter(Boolean),
    features,
    notes: "",
    vitalityPolicy: characterZeroHpPolicy(),
    conditionImmunities: [],
    buildSeed: {
      classes: [{ classId: "fighter", level: 1 }],
      levelOrder: ["fighter"],
      source: {
        kind: "authored",
        revision: PRACTICE_SOURCE.revision,
        title: { it: "Profilo di prova di Tessa", en: "Tessa practice profile" },
      },
    },
    example: { kind: "home-start", at: iso(now) },
    source: clone(PRACTICE_SOURCE),
  };
  updateCharacterRestProfile(
    actor,
    { classes: actor.buildSeed.classes, origin: { speciesId: "human" } },
    { newCharacter: true },
  );
  return actor;
}
// Creates the practice sheet for its owner, private, outside every campaign. With the
// Characters area (B21) loaded, its library privacy is Private too (never "Campaign only").
function createPracticeCharacter(state, role, name, id, now) {
  state.actors[id] = makePracticeCharacter(id, name, role, now);
  if (librarySlice(state)) {
    const entry = setPrivacy(state, id, "private", role, now);
    entry.createdAt ??= iso(now);
  }
  return id;
}
const libraryEntry = (state, id) => librarySlice(state)?.entries?.[id] ?? null;
// The practice sheet leaves no library row behind when the example removes it.
function dropLibraryRecord(state, id) {
  const slice = librarySlice(state);
  if (!slice) return;
  for (const key of ["entries", "revisions", "logs"])
    if (isObject(slice[key])) delete slice[key][id];
}
// Owlbear "sample enemy linked to a token": a copy of the demo goblin (or a plain custom
// NPC if it is gone), hostile, at full hit points, placed on the practice scene.
function createPracticeEnemy(state, sceneId, name, suffix, now) {
  const id = `start-npc-${suffix}`;
  const base = state.actors?.[NPC_BASE];
  let actor;
  try {
    actor =
      base?.kind === "npc"
        ? duplicateSceneNPC(state, NPC_BASE, id, name, "dm", "watch")
        : createSceneNPC(state, { id, name, hp: 7, ac: 15, speed: 9, team: "watch" }, "dm");
  } catch {
    return null;
  }
  Object.assign(actor, {
    hp: actor.maxHp,
    tempHp: 0,
    conditions: [],
    exhaustion: 0,
    dead: false,
    hidden: false,
    example: { kind: "home-start", at: iso(now) },
  });
  const scene = state.scenes.find((row) => row.id === sceneId);
  try {
    placeSceneToken(
      state,
      sceneId,
      id,
      { x: (scene?.width ?? 1000) / 2, y: (scene?.height ?? 650) / 2 },
      `start-token-${suffix}`,
      "dm",
    );
  } catch {
    delete state.actors[id];
    return null;
  }
  return id;
}
// Owlbear "sample handout (try full screen + show to players)": a B15 material with the
// first available art, never shown. Only when the materials area is loaded.
function createPracticeHandout(state, sceneId, text) {
  if (!Array.isArray(state.ext?.handouts?.materials)) return null;
  try {
    const art = artList(state)[0];
    return saveMaterial(
      state,
      {
        kind: "handout",
        title: text.handout,
        image: art ? { artId: art.id } : null,
        playerText: text.handoutPlayer,
        dmNote: text.handoutDm,
        sections: [],
        sceneIds: sceneId ? [sceneId] : [],
      },
      "dm",
    );
  } catch {
    return null;
  }
}
// "Try the example": one private note "Start here" (quick start, session-notes template,
// the sample explained), plus a private practice character for a player, or for a DM a
// hidden practice scene with a sample enemy on a token and a practice handout. Nothing is
// shared; a player's example works offline.
export function createStarter(
  state,
  role,
  { lang = "it", now = Date.now(), online = true, seed } = {},
) {
  const record = mutableRecord(state, role);
  if (record.starter)
    refuse("L’esempio «Inizia qui» esiste già.", "The “Start here” example already exists.");
  const text = START_TEXT[lang === "en" ? "en" : "it"];
  const suffix =
    String(seed ?? now.toString(36))
      .replace(/[^a-z0-9]/gi, "")
      .slice(-10) || "x";
  const dm = role === "dm";
  let actorId = null;
  let sceneId = null;
  let npcId = null;
  let handoutId = null;
  if (!dm)
    actorId = createPracticeCharacter(state, role, text.character, `start-${role}-${suffix}`, now);
  const campaignId = state.campaign?.id;
  if (dm && campaignId && isCampaignMember(state, campaignId, role) && state.activeSceneId) {
    sceneId = `start-scene-${suffix}`;
    duplicateScene(state, state.activeSceneId, sceneId, text.scene, role);
    npcId = createPracticeEnemy(state, sceneId, text.npc, suffix, now);
    handoutId = createPracticeHandout(state, sceneId, text);
  }
  const draftId = `home-start-${role}-${suffix}`;
  createCampaignDraft(state, { id: draftId, kind: "note" }, role);
  const sampleName = dm ? text.scene : text.character;
  const sections = [
    {
      id: "quick",
      title: text.quick,
      body: dm ? text.quickDm : text.quickPlayer,
      access: personal(),
    },
    { id: "template", title: text.template, body: text.templateBody, access: personal() },
  ];
  if (actorId || sceneId)
    sections.push({
      id: "sample",
      title: text.sample,
      body: (dm ? text.sampleDm : text.samplePlayer)
        .replace("%NAME%", sampleName)
        .replace("%NPC%", npcId ? text.npc : "—")
        .replace("%HANDOUT%", handoutId ? text.handout : "—"),
      access: personal(),
    });
  saveCampaignDraft(
    state,
    draftId,
    {
      data: {
        title: text.title,
        body: text.body,
        worldType: "other",
        questStatus: "open",
        sessionId: null,
        narratorActorId: null,
        links: [
          ...(actorId ? [{ kind: "actor", id: actorId }] : []),
          ...(sceneId ? [{ kind: "scene", id: sceneId }] : []),
          ...(npcId ? [{ kind: "actor", id: npcId }] : []),
        ],
        sections,
      },
      access: personal(),
    },
    role,
  );
  const preview = previewCampaignDraft(state, draftId, role);
  if (!preview.canApply)
    refuse(preview.errors[0]?.it ?? "Nota non valida.", preview.errors[0]?.en ?? "Invalid note.");
  const result = applyCampaignDraft(state, draftId, { reviewKey: preview.reviewKey }, role, {
    online,
  });
  const stamps = {};
  if (actorId) stamps.actor = actorStamp(state.actors[actorId]);
  if (npcId) stamps.npc = actorStamp(state.actors[npcId]);
  if (sceneId) stamps.scene = sceneStamp(state.scenes.find((row) => row.id === sceneId));
  if (handoutId) stamps.handout = handoutStamp(handoutOf(state, handoutId));
  record.starter = {
    createdAt: iso(now),
    noteId: result.entryId,
    actorId,
    sceneId,
    npcId,
    handoutId,
    stamps,
  };
  return clone(record.starter);
}
// Whether each part still is sample material: private, unshared, unused and unchanged since
// it was created. Otherwise it has become the person's own and "Remove the example" keeps
// it, saying why ("changed by you", "shared", "connected or in use", "being edited").
export function starterStatus(state, role) {
  const starter = identityOf(state, role).starter;
  if (!starter) return null;
  const stamps = starter.stamps ?? {};
  const missing = { exists: false, removable: false, reason: null };
  const verdict = (reasons) => {
    const reason = reasons.find(([when]) => when)?.[1] ?? null;
    return { exists: true, removable: !reason, reason };
  };
  // Note
  const entry = (state.campaignContent?.entries ?? []).find((row) => row.id === starter.noteId);
  const noteDraft = (state.campaignContent?.drafts ?? []).some(
    (row) => row.entryId === starter.noteId && row.status === "active",
  );
  const noteShared =
    entry &&
    (entry.access?.mode !== "private" ||
      entry.revisions?.some((revision) => (revision.audience ?? []).some((id) => id !== role)));
  const note = entry
    ? {
        ...verdict([
          [entry.ownerId !== role, "shared"],
          [noteShared, "shared"],
          [noteDraft, "editing"],
          [(entry.revisions?.length ?? 1) > 1, "changed"],
        ]),
        shared: Boolean(noteShared),
        editing: noteDraft,
      }
    : missing;
  // Practice sheet (player)
  const onMap = (id, except = null) =>
    (state.scenes ?? []).some(
      (scene) => scene.id !== except && (scene.tokens ?? []).some((token) => token.actorId === id),
    ) || (state.combat?.order ?? []).includes(id);
  const actorDraft = (id) =>
    (state.characterDrafts ?? []).some((row) => row.actorId === id && row.status === "active");
  const actorRecord = starter.actorId ? state.actors?.[starter.actorId] : null;
  const actor = actorRecord
    ? {
        ...verdict([
          [actorRecord.owner !== role, "in-use"],
          [
            actorRecord.visibility !== "private" || (actorRecord.campaignIds ?? []).length,
            "in-use",
          ],
          [onMap(actorRecord.id), "in-use"],
          [actorDraft(actorRecord.id), "editing"],
          [stamps.actor && actorStamp(actorRecord) !== stamps.actor, "changed"],
          [rolledBy(state, actorRecord.id), "changed"],
        ]),
        name: actorRecord.name,
      }
    : missing;
  // Practice scene (DM)
  const sceneRecord = starter.sceneId
    ? (state.scenes ?? []).find((row) => row.id === starter.sceneId)
    : null;
  const scene = sceneRecord
    ? {
        ...verdict([
          [sceneRecord.revealed, "shared"],
          [sceneRecord.id === state.activeSceneId, "in-use"],
          [stamps.scene && sceneStamp(sceneRecord) !== stamps.scene, "changed"],
          [
            !stamps.scene &&
              (sceneRecord.tokens ?? []).some((token) => token.actorId !== starter.npcId),
            "changed",
          ],
        ]),
        name: sceneRecord.name,
      }
    : missing;
  // Sample enemy (DM): it goes with its scene; kept whenever the scene is kept.
  const npcRecord = starter.npcId ? state.actors?.[starter.npcId] : null;
  const npc = npcRecord
    ? {
        ...verdict([
          [onMap(npcRecord.id, starter.sceneId), "in-use"],
          [stamps.npc && actorStamp(npcRecord) !== stamps.npc, "changed"],
          [rolledBy(state, npcRecord.id), "changed"],
          [scene.exists && !scene.removable, "in-use"],
        ]),
        name: npcRecord.name,
      }
    : missing;
  // Practice handout (DM)
  const material = starter.handoutId ? handoutOf(state, starter.handoutId) : null;
  const handout = material
    ? {
        ...verdict([
          [material.access?.mode !== "none" || (material.shows ?? []).length, "shared"],
          [stamps.handout && handoutStamp(material) !== stamps.handout, "changed"],
        ]),
        name: material.title,
      }
    : missing;
  return { ...starter, note, actor, scene, npc, handout };
}
// Correction for "Try the example": removes what is still sample material and keeps what
// has become the person's own. What it deletes is remembered, so that a gameplay Undo of
// an earlier action does not bring it back (reconcileAfterUndo).
export function removeStarter(state, role) {
  const status = starterStatus(state, role);
  if (!status) refuse("Non c’è un esempio da rimuovere.", "There is no example to remove.");
  const record = mutableRecord(state, role);
  const removed = [];
  const kept = [];
  const gone = (kind, id) => {
    removed.push(kind);
    if (kind !== "note") record.removed = [...record.removed, { kind, id }].slice(-MAX_REMOVED);
  };
  if (status.note.exists) {
    if (status.note.removable) {
      state.campaignContent.entries = state.campaignContent.entries.filter(
        (row) => row.id !== status.noteId,
      );
      state.campaignContent.drafts = (state.campaignContent.drafts ?? []).filter(
        (row) => !(row.result?.entryId === status.noteId && row.ownerId === role),
      );
      gone("note", status.noteId);
    } else kept.push("note");
  }
  if (status.actor.exists) {
    if (status.actor.removable) {
      delete state.actors[status.actorId];
      dropLibraryRecord(state, status.actorId);
      gone("actor", status.actorId);
    } else kept.push("actor");
  }
  if (status.handout.exists) {
    if (status.handout.removable) {
      deleteMaterial(state, status.handoutId, role);
      gone("handout", status.handoutId);
    } else kept.push("handout");
  }
  if (status.scene.exists) {
    if (status.scene.removable) {
      deleteScene(state, status.sceneId, role);
      gone("scene", status.sceneId);
    } else kept.push("scene");
  }
  if (status.npc.exists) {
    if (status.npc.removable) {
      for (const scene of state.scenes ?? [])
        scene.tokens = (scene.tokens ?? []).filter((token) => token.actorId !== status.npcId);
      delete state.actors[status.npcId];
      gone("npc", status.npcId);
    } else kept.push("npc");
  }
  record.starter = null;
  return { removed, kept };
}
// A DM example includes campaign records (hidden, but campaign data): it needs a connection.
export const starterIsLocal = (state, role) => {
  const starter = identityOf(state, role).starter;
  return role !== "dm" || !(starter?.sceneId || starter?.npcId || starter?.handoutId);
};
// Registered as the slice's afterUndo: gameplay Undo restores a snapshot taken before an
// earlier action, which would silently drop the example created since (or bring back what
// "Remove the example" deleted). Both commands have their own correction, so the example's
// records follow the current `ext.home` (already preserved) instead of the snapshot.
export function reconcileAfterUndo(current, restored) {
  const slice = sliceOf(restored);
  if (!slice || !current) return;
  const has = {
    actor: (state, id) => Boolean(state?.actors?.[id]),
    npc: (state, id) => Boolean(state?.actors?.[id]),
    scene: (state, id) => (state?.scenes ?? []).some((row) => row.id === id),
    handout: (state, id) => Boolean(handoutOf(state, id)),
  };
  const bring = {
    actor: (id) => {
      restored.actors[id] = clone(current.actors[id]);
      // Its library privacy comes back with it (Private, never the "Campaign only" default).
      const entry = libraryEntry(current, id);
      const slice = librarySlice(restored);
      if (entry && isObject(slice?.entries) && !slice.entries[id]) slice.entries[id] = clone(entry);
    },
    npc: (id) => (restored.actors[id] = clone(current.actors[id])),
    scene: (id) => restored.scenes.push(clone(current.scenes.find((row) => row.id === id))),
    handout: (id) => {
      if (Array.isArray(restored.ext?.handouts?.materials))
        restored.ext.handouts.materials.push(clone(handoutOf(current, id)));
    },
  };
  const drop = {
    actor: (id) => {
      delete restored.actors[id];
      dropLibraryRecord(restored, id);
    },
    npc: (id) => {
      delete restored.actors[id];
      for (const scene of restored.scenes ?? [])
        scene.tokens = (scene.tokens ?? []).filter((token) => token.actorId !== id);
    },
    scene: (id) => {
      if (restored.activeSceneId !== id)
        restored.scenes = restored.scenes.filter((row) => row.id !== id);
    },
    handout: (id) => {
      const handouts = restored.ext?.handouts;
      if (!Array.isArray(handouts?.materials)) return;
      handouts.materials = handouts.materials.filter((row) => row.id !== id);
      for (const pin of handouts.pins ?? []) if (pin.link?.materialId === id) pin.link = null;
    },
  };
  for (const raw of Object.values(slice.identities ?? {})) {
    const record = normalizeRecord(raw);
    const starter = record.starter;
    if (starter)
      for (const [kind, id] of [
        ["actor", starter.actorId],
        ["scene", starter.sceneId],
        ["npc", starter.npcId],
        ["handout", starter.handoutId],
      ])
        if (id && has[kind](current, id) && !has[kind](restored, id)) bring[kind](id);
    for (const { kind, id } of record.removed)
      if (!has[kind](current, id) && has[kind](restored, id)) drop[kind](id);
  }
}

// ---------------------------------------------------------------- problem reports

const EMAIL = /[^\s@<>()]{1,64}@[^\s@<>()]{1,120}\.[a-z]{2,}/gi;
// Candidate runs of digits and separators; looksLikePhone decides. Dates, times and short
// lists of game numbers ("HP 12 18 22 30") stay as they are.
const PHONE = /\+?\(?\d[\d\s().-]{6,}\d/g;
const DATES = /\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/.]\d{1,2}[/.]\d{2,4}|\d{1,2}:\d{2}/g;
function looksLikePhone(text) {
  const digits = text.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return false;
  if (text.trim().startsWith("+")) return true;
  const groups = text.split(/[\s().-]+/).filter(Boolean);
  // Phone numbers are written in groups of 3–4 digits (or one long run); game numbers in
  // lists of one- or two-digit values.
  return groups.length === 1 || groups.some((group) => group.length >= 3);
}
const PLACEHOLDERS = {
  it: { email: "[email rimossa]", phone: "[numero rimosso]", name: "[nome rimosso]" },
  en: { email: "[email removed]", phone: "[number removed]", name: "[name removed]" },
};
// Removes addresses, phone numbers and the given names (display names of the demo
// identities) from free text before it enters a report summary.
export function scrubPersonal(text, names = [], lang = "it") {
  const words = PLACEHOLDERS[lang === "en" ? "en" : "it"];
  let out = String(text ?? "").slice(0, MAX_REPORT_TEXT);
  // Dates and times are set aside first, so a date next to a phone number neither hides it
  // nor gets removed with it.
  const dates = [];
  const mark = (index) =>
    `\u0000${String.fromCharCode(97 + (index % 26)).repeat(1 + Math.floor(index / 26))}\u0000`;
  out = out
    .replace(EMAIL, words.email)
    .replace(DATES, (match) => mark(dates.push(match) - 1))
    .replace(PHONE, (match) => (looksLikePhone(match) ? words.phone : match))
    .replace(
      /\u0000([a-z]+)\u0000/g,
      (_, code) => dates[(code.length - 1) * 26 + code.charCodeAt(0) - 97],
    );
  for (const name of names)
    if (typeof name === "string" && name.trim().length >= 2)
      out = out.replace(
        new RegExp(name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"),
        words.name,
      );
  return out;
}
// The technical part of a report: no identity, no character, note or campaign content.
export function diagnosticsSummary(input) {
  const lines = [
    `d20 Studio blueprint · ${input.build ?? "2026-09-24"}`,
    `page: ${input.page ?? "home"}${input.tab ? `/${input.tab}` : ""}${input.hasId ? " (+id)" : ""}`,
    `language: ${input.lang ?? "it"}`,
    `data version: ${input.dataVersion ?? "?"} · areas ${input.sliceCount ?? 0}`,
    `network (simulated): ${input.offline ? "offline" : "online"}`,
    `local storage: ${input.storage ?? "ok"}${Number.isFinite(input.bytes) ? ` · ${input.bytes} bytes` : ""}`,
    `areas: ${input.built ?? 0} ready · ${input.failed ?? 0} failed · ${input.warnings ?? 0} warnings`,
    `viewport: ${input.viewport ?? "?"}`,
    `browser: ${input.browser ?? "?"}`,
  ];
  for (const warning of (input.warningList ?? []).slice(-5))
    lines.push(`warning: ${String(warning).slice(0, 160)}`);
  return lines.join("\n");
}
export function addReport(
  book,
  role,
  { what, expected = "", diagnostics = "", names = [], now = Date.now(), id, lang = "it" },
) {
  const text = scrubPersonal(what, names, lang).trim();
  // The person's words are labelled in their language; the technical part stays English.
  const [happened, wanted] =
    lang === "en" ? ["What happened", "Expected"] : ["Cosa è successo", "Cosa mi aspettavo"];
  if (!text) refuse("Descrivi che cosa è successo.", "Describe what happened.");
  const record = bookRecord(book, role);
  const summary = [
    `${happened}: ${text}`,
    ...(String(expected).trim()
      ? [`${wanted}: ${scrubPersonal(expected, names, lang).trim()}`]
      : []),
    ...(diagnostics ? ["", diagnostics] : []),
  ].join("\n");
  const row = {
    id: id ?? `report-${now.toString(36)}`,
    createdAt: iso(now),
    summary,
    status: "ready",
  };
  record.reports.push(row);
  if (record.reports.length > MAX_REPORTS)
    record.reports.splice(0, record.reports.length - MAX_REPORTS);
  return clone(row);
}
export function deleteReport(book, role, id) {
  const record = bookRecord(book, role);
  const before = record.reports.length;
  record.reports = record.reports.filter((row) => row.id !== id);
  if (record.reports.length === before) refuse("Segnalazione non trovata.", "Report not found.");
}
// Browser family and major version only (never the full user-agent string).
export function browserFamily(userAgent = "") {
  const ua = String(userAgent);
  const pick = (re, name) => {
    const match = re.exec(ua);
    return match ? `${name} ${match[1]}` : null;
  };
  const os = /iPhone|iPad/.test(ua)
    ? "iOS"
    : /Android/.test(ua)
      ? "Android"
      : /Mac OS X/.test(ua)
        ? "macOS"
        : /Windows/.test(ua)
          ? "Windows"
          : /Linux/.test(ua)
            ? "Linux"
            : "?";
  const browser =
    pick(/Edg\/(\d+)/, "Edge") ??
    pick(/Firefox\/(\d+)/, "Firefox") ??
    pick(/Chrome\/(\d+)/, "Chrome") ??
    pick(/Version\/(\d+).*Safari/, "Safari") ??
    "?";
  return `${browser} · ${os}`;
}
// Which install instructions to show first (Roll20 SVC-178: iOS Share, Android menu).
export function installPlatform(userAgent = "") {
  const ua = String(userAgent);
  if (/iPhone|iPad|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "desktop";
}
