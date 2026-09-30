// B14 — Table: presentation, session state and presence.
//
// Adopted patterns (market census IDs, changes/interview-01/market-census/*.md):
// - D&D Beyond Maps: Display/Hide map, Start/Pause/End with a different message for
//   players in each state and rotating waiting tips (DDB-111, SVC-103, DDB-006); the
//   55-minute inactivity keep-alive (DDB-112); Connected Players list (DDB-114, SVC-104);
//   Spectator View in a new tab (DDB-132).
// - Foundry VTT: pause with a centred indicator that stops player movement and doors
//   (FVT-158); Monk's Common Display, module (FVT-163); Lock View, module (FVT-164);
//   V14 pop-out windows (FVT-199).
// - Roll20: Player View with a banner naming the player and actions logged as the GM
//   acting for them (R20-128); party ribbons and Regroup (R20-140); centre on own tokens
//   on load, Home recentres, Shift+Home fits, per-user toggle (R20-152).
// - Alchemy: Here/Away presence with a custom message (VTL-043, SVC-108).
// - Owlbear Rodeo: hide the whole UI with a shortcut (VTL-191); Ticker!, third-party
//   extension (VTL-178); Count!, third-party extension (VTL-179).
// - Quest Portal: automatic Session Stories with attendance, duration and scenes, which
//   the GM can turn off or keep in private notes (VTL-054).
//
// Session data lives in state.ext["session-view"] (gameplay Undo restores it) and the
// story bookkeeping in state.ext["session-view-stories"] (preserved like narrative).
// Everything is a local single-browser simulation: no network, no real presence.
//
// Review fixes (changes/interview-01/blueprint-session-view-evidence.md, "Review fixes"):
// detached displays are a locked read-only shell (access gate); the party scene is kept
// apart from the scene at the Table (Roll20 Players ribbon); breakout players move their
// own tokens; projections draw the other areas' shared map layers and B12 audiences; a
// session is recorded in Campaign → Sessions; touch long press subtracts time.

import {
  campaignMembers,
  createCampaignDraft,
  saveCampaignDraft,
  getCampaignDraft,
} from "./campaign-content.mjs";
import {
  createSessionDraft,
  saveSessionDraft,
  previewSessionDraft,
  applySessionDraft,
} from "./campaign-sessions.mjs";
import {
  canViewActor,
  canControlActor,
  isActorAvailable,
  isCampaignActor,
} from "./character-access.mjs";
import { renderSceneBase, activateScene } from "./preparation.mjs";
import { renderSpatialOverlay } from "./spatial-editor.mjs";
import { tracePath } from "./spatial.mjs";
import { previewMovement } from "./state.mjs";
import { beginMovement } from "./combat.mjs";
import { hasCondition } from "./conditions.mjs";
import { seesAsAudience } from "./token-menu.mjs";
import { safetyHud, bindSafetyHud } from "./safety-ui.mjs";
import { setSelectedActor } from "./table.mjs";
import { formatNumber } from "./ui.mjs";

export const ID = "session-view";
export const STORIES = "session-view-stories";
// state.mjs keeps the whole shared state under this key; a detached display (spectator
// or pop-out) only reads it, following the storage event like a network feed.
const STORAGE_KEY = "d20-studio-blueprint-v1";
const L = (it, en) => ({ it, en });
const uid = () => globalThis.crypto?.randomUUID?.() ?? `sv-${Date.now()}-${Math.random()}`;
const MINUTE = 60000;
// Pause glyph (two bars): the HUD's Session button keeps the clock of its drawer entry.
const PAUSE_ICON =
  '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>';
// The «Sessione» menu's disclosure caret (Owlbear's menu buttons carry one).
const MENU_CARET =
  '<svg class="icon session-view-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';
const MAX_TIMER = 24 * 60 * MINUTE;
const KEEP_ALIVE_GRACE = 5 * MINUTE;
const CLOCK_SIZES = [4, 6, 8];
const PRESENCE = ["here", "away"];

/** A refusal with its Italian and English text (shown as it is by the shell). */
function fail(it, en) {
  throw Object.assign(new Error(en), { it, en });
}
const text = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const num = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const obj = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : null);

// ---------------------------------------------------------------------------------------
// State slice
// ---------------------------------------------------------------------------------------

export function seedSession() {
  return {
    gate: { hidden: false, message: "" },
    pause: { active: false, message: "", since: null },
    sessions: [],
    presence: {},
    split: {},
    // Roll20's Players ribbon: the scene of the party while someone is split away. null
    // means the party follows the scene at the Table (nobody is split).
    party: null,
    timer: {
      label: "",
      remainingMs: 0,
      endsAt: null,
      running: false,
      hideRemaining: false,
      run: 0,
    },
    clocks: [],
    pin: null,
    pinSeq: 0,
    dismissed: {},
    display: { cellMm: 25, ppi: 96, ruler: false },
  };
}

export function normalizeSession(slice, fromVersion = 1) {
  if (fromVersion > 1) throw Error("Saved session data comes from a newer version");
  const s = obj(slice) ?? {};
  const seed = seedSession();
  const at = (value) => (Number.isFinite(value) ? value : null);
  const session = (row) => ({
    id: String(row.id),
    number: num(row.number, 1),
    status: row.status === "ended" ? "ended" : "live",
    startedAt: num(row.startedAt, 0),
    endedAt: at(row.endedAt),
    pauses: (Array.isArray(row.pauses) ? row.pauses : [])
      .filter((p) => Number.isFinite(p?.from))
      .map((p) => ({ from: p.from, to: at(p.to) })),
    scenes: (Array.isArray(row.scenes) ? row.scenes : [])
      .filter((p) => typeof p?.sceneId === "string" && Number.isFinite(p.from))
      .map((p) => ({ sceneId: p.sceneId, name: text(p.name, 100), from: p.from, to: at(p.to) })),
    presence: (Array.isArray(row.presence) ? row.presence : [])
      .filter((p) => typeof p?.memberId === "string" && PRESENCE.includes(p.status))
      .map((p) => ({
        memberId: p.memberId,
        status: p.status,
        message: text(p.message, 80),
        at: num(p.at, 0),
      })),
    reopened: (Array.isArray(row.reopened) ? row.reopened : [])
      .filter((p) => Number.isFinite(p?.at))
      .map((p) => ({ at: p.at, reason: text(p.reason, 200) })),
    // The Campaign → Sessions record this evening is (an appointment or a played session).
    campaignSessionId: typeof row.campaignSessionId === "string" ? row.campaignSessionId : null,
    endMessage: text(row.endMessage, 200),
  });
  const presence = {};
  for (const [id, row] of Object.entries(obj(s.presence) ?? {}))
    if (PRESENCE.includes(row?.status))
      presence[id] = { status: row.status, message: text(row.message, 80), at: at(row.at) };
  const split = {};
  for (const [id, row] of Object.entries(obj(s.split) ?? {}))
    if (typeof row?.sceneId === "string")
      split[id] = {
        sceneId: row.sceneId,
        home: obj(row.home)
          ? {
              sceneId: String(row.home.sceneId),
              x: num(row.home.x, 0),
              y: num(row.home.y, 0),
            }
          : null,
      };
  const timer = obj(s.timer) ?? {};
  const clocks = (Array.isArray(s.clocks) ? s.clocks : [])
    .filter((c) => typeof c?.id === "string" && CLOCK_SIZES.includes(c.segments))
    .map((c) => ({
      id: c.id,
      label: text(c.label, 60),
      segments: c.segments,
      filled: Math.max(0, Math.min(c.segments, Math.round(num(c.filled, 0)))),
    }));
  const pin =
    obj(s.pin) && clocks.some((c) => c.id === s.pin.clockId)
      ? { clockId: s.pin.clockId, revision: num(s.pin.revision, 1) }
      : null;
  const display = obj(s.display) ?? {};
  return {
    gate: { hidden: s.gate?.hidden === true, message: text(s.gate?.message, 200) },
    pause: {
      active: s.pause?.active === true,
      message: text(s.pause?.message, 120),
      since: at(s.pause?.since),
    },
    sessions: (Array.isArray(s.sessions) ? s.sessions : [])
      .filter((row) => obj(row) && row.id)
      .map(session),
    presence,
    split,
    party: typeof s.party === "string" && Object.keys(split).length ? s.party : null,
    timer: {
      label: text(timer.label, 60),
      remainingMs: Math.max(0, Math.min(MAX_TIMER, num(timer.remainingMs, 0))),
      endsAt: timer.running === true ? at(timer.endsAt) : null,
      running: timer.running === true && Number.isFinite(timer.endsAt),
      hideRemaining: timer.hideRemaining === true,
      run: num(timer.run, 0),
    },
    clocks,
    pin,
    pinSeq: Math.max(num(s.pinSeq, 0), pin?.revision ?? 0),
    dismissed: Object.fromEntries(
      Object.entries(obj(s.dismissed) ?? {}).filter(([, value]) => Number.isFinite(value)),
    ),
    display: {
      cellMm: Math.min(60, Math.max(10, num(display.cellMm, seed.display.cellMm))),
      ppi: Math.min(400, Math.max(40, num(display.ppi, seed.display.ppi))),
      ruler: display.ruler === true,
      ...(normalizeRegion(display.region) ? { region: normalizeRegion(display.region) } : {}),
    },
  };
}
// P10 TV-117 (Foundry Lock View): which part of the map the spectator screen shows.
export const REGION_MODES = Object.freeze(["scene", "party", "view"]);
function normalizeRegion(value) {
  const region = obj(value);
  if (!region || !REGION_MODES.includes(region.mode) || region.mode === "scene") return null;
  if (region.mode === "party") return { mode: "party" };
  const [x, y, w, h] = [region.x, region.y, region.w, region.h].map(Number);
  return [x, y, w, h].every(Number.isFinite) && w > 0 && h > 0
    ? { mode: "view", x, y, w, h }
    : null;
}

export const seedStories = () => ({ stories: [] });
export function normalizeStories(slice, fromVersion = 1) {
  if (fromVersion > 1) throw Error("Saved story data comes from a newer version");
  const rows = Array.isArray(slice?.stories) ? slice.stories : [];
  return {
    stories: rows
      .filter((row) => typeof row?.sessionId === "string" && typeof row.draftId === "string")
      .map((row) => ({
        sessionId: row.sessionId,
        draftId: row.draftId,
        kind: row.kind === "note" ? "note" : "recap",
        revision: num(row.revision, 0),
        at: num(row.at, 0),
      })),
  };
}

/** The session slice of a state (read only); a seed when the area was never loaded. */
export function readSession(state) {
  return state?.ext?.[ID] ? state.ext[ID] : seedSession();
}
function write(state) {
  const slice = state?.ext?.[ID];
  if (!slice) throw Error("Session state is not initialized");
  return slice;
}
function writeStories(state) {
  return (state.ext[STORIES] ??= seedStories());
}
// P10 CA-57 (Owlbear GM hand-off): the member the owner handed the DM role to for the
// session runs it too (start/end, pause, hidden scene, countdown, clocks, shared screen).
export function sessionRunner(state) {
  return state?.ext?.["campaign-members"]?.campaigns?.[state?.campaign?.id]?.handover?.to ?? null;
}
export const runsSession = (state, role) =>
  role === "dm" || (Boolean(role) && sessionRunner(state) === role);
function requireDM(role, state = null) {
  if (role !== "dm" && !(state && sessionRunner(state) === role))
    fail("Solo il DM può gestire la sessione.", "Only the DM can run the session.");
}

// ---------------------------------------------------------------------------------------
// Party, members and presence (Alchemy VTL-043, DDB Connected Players DDB-114)
// ---------------------------------------------------------------------------------------

export function activeScene(state) {
  return state.scenes.find((scene) => scene.id === state.activeSceneId) ?? null;
}
/** Shared party characters: campaign characters that are not private sheets. */
export function partyCharacters(state) {
  return Object.values(state.actors).filter(
    (actor) =>
      actor.kind === "character" &&
      !actor.companion &&
      isActorAvailable(actor) &&
      actor.visibility !== "private" &&
      isCampaignActor(actor, state.campaign?.id),
  );
}
export function partyMembers(state) {
  const characters = partyCharacters(state);
  return campaignMembers(state).map((member) => {
    const own = characters
      .filter(
        (actor) =>
          actor.owner === member.id ||
          (Array.isArray(actor.controllers) && actor.controllers.includes(member.id)),
      )
      .map((actor) => actor.id);
    const label =
      member.role === "dm"
        ? "DM"
        : own.length
          ? state.actors[own[0]].name
          : String(member.name ?? member.id).split(" / ")[0];
    return { id: member.id, role: member.role, label, characters: own };
  });
}
export function presenceOf(slice, memberId) {
  return slice.presence?.[memberId] ?? { status: "here", message: "", at: null };
}
export function currentSession(slice) {
  const last = slice.sessions.at(-1);
  return last?.status === "live" ? last : null;
}
export function lastSession(slice) {
  return slice.sessions.at(-1) ?? null;
}

export function setPresence(state, role, memberId, input, at, { onBehalf = false } = {}) {
  const slice = write(state);
  if (!campaignMembers(state).some((member) => member.id === memberId))
    fail("Partecipante non trovato.", "Participant not found.");
  if (memberId !== role && !(role === "dm" && onBehalf))
    fail("Puoi cambiare solo il tuo stato.", "You can only change your own status.");
  const status = input?.status;
  if (!PRESENCE.includes(status)) fail("Scegli Presente o Assente.", "Choose Here or Away.");
  const raw = typeof input?.message === "string" ? input.message.trim() : "";
  if (raw.length > 80)
    fail(
      "Il messaggio può avere al massimo 80 caratteri.",
      "The message can be 80 characters at most.",
    );
  slice.presence[memberId] = { status, message: raw, at };
  currentSession(slice)?.presence.push({ memberId, status, message: raw, at });
  return slice.presence[memberId];
}

// ---------------------------------------------------------------------------------------
// Session lifecycle and presentation gate (DDB-111, SVC-103, FVT-158)
// ---------------------------------------------------------------------------------------

function openScene(state, session, at) {
  const scene = activeScene(state);
  if (scene) session.scenes.push({ sceneId: scene.id, name: scene.name, from: at, to: null });
}
function closeOpen(session, at) {
  const scene = session.scenes.at(-1);
  if (scene && scene.to === null) scene.to = at;
  const pause = session.pauses.at(-1);
  if (pause && pause.to === null) pause.to = at;
}

// ---- Campaign → Sessions (campaign-sessions.mjs): the evening is one of its sessions ----

const localDay = (ms) => new Date(ms).toDateString();
const campaignRows = (state) =>
  (state.campaign?.sessions ?? []).filter((row) => row && row.status !== "cancelled");
/** Today's agreed appointment not yet linked to an earlier evening at the Table, or null. */
export function todaysAppointment(state, at) {
  const linked = new Set(readSession(state).sessions.map((row) => row.campaignSessionId));
  return (
    campaignRows(state).find(
      (row) =>
        row.status === "scheduled" &&
        !row.played &&
        typeof row.startsAt === "string" &&
        localDay(Date.parse(row.startsAt)) === localDay(at) &&
        !linked.has(row.id),
    ) ?? null
  );
}
/**
 * The evening's number, counted like Campaign → Sessions: sessions already played or dated
 * up to today, the linked appointment included. Never lower than the evenings recorded
 * here (older data without links).
 */
export function sessionNumber(state, at, link = null) {
  const end = new Date(at);
  end.setHours(23, 59, 59, 999);
  const rows = campaignRows(state)
    .filter(
      (row) =>
        row.played === true ||
        (typeof row.startsAt === "string" && Date.parse(row.startsAt) <= end.getTime()),
    )
    .sort((a, b) =>
      String(a.startsAt ?? a.createdAt ?? "").localeCompare(
        String(b.startsAt ?? b.createdAt ?? ""),
      ),
    );
  const index = link ? rows.findIndex((row) => row.id === link.id) : -1;
  const counted = index >= 0 ? index + 1 : rows.length + 1;
  return Math.max(counted, readSession(state).sessions.length + 1);
}
/**
 * Records an ended evening in Campaign → Sessions as a played session through the
 * campaign's own draft service (kind "played"), once: a later end of the same evening,
 * also after a gameplay Undo (campaign sessions survive it), reuses that record. An
 * evening linked to today's appointment keeps that link. Returns the session id or null.
 */
export function recordPlayedSession(state, role, session, lang = "it") {
  requireDM(role, state);
  const exists = (id) => (state.campaign?.sessions ?? []).some((row) => row.id === id);
  if (session.campaignSessionId && exists(session.campaignSessionId))
    return session.campaignSessionId;
  const draftId = `sv-played-${session.id}`.replace(/[^A-Za-z0-9_.:-]/g, "-").slice(0, 190);
  const earlier = state.campaign?.sessionDrafts?.find((d) => d.id === draftId);
  if (earlier?.status === "applied" && exists(earlier.result?.sessionId)) {
    session.campaignSessionId = earlier.result.sessionId;
    return session.campaignSessionId;
  }
  if (earlier) return null; // a discarded record is the DM's choice: never recreated
  const day = new Intl.DateTimeFormat(lang === "it" ? "it-IT" : "en-GB", {
    dateStyle: "medium",
  }).format(new Date(session.startedAt));
  createSessionDraft(state, { id: draftId, kind: "played" }, role);
  saveSessionDraft(
    state,
    draftId,
    {
      data: {
        title: `${lang === "it" ? "Sessione" : "Session"} ${session.number} · ${day}`,
      },
    },
    role,
  );
  const preview = previewSessionDraft(state, draftId, role);
  const result = applySessionDraft(state, draftId, { reviewKey: preview.reviewKey }, role);
  session.campaignSessionId = result.sessionId;
  return result.sessionId;
}

export function startSession(state, role, at, { hidden = false } = {}) {
  requireDM(role, state);
  const slice = write(state);
  if (currentSession(slice)) fail("Una sessione è già in corso.", "A session is already running.");
  const link = todaysAppointment(state, at);
  const number = sessionNumber(state, at, link);
  const session = {
    id: `session-${slice.sessions.length + 1}-${at}`,
    number,
    status: "live",
    startedAt: at,
    endedAt: null,
    pauses: [],
    scenes: [],
    presence: partyMembers(state).map((member) => {
      const now = presenceOf(slice, member.id);
      return { memberId: member.id, status: now.status, message: now.message, at };
    }),
    reopened: [],
    campaignSessionId: link?.id ?? null,
    endMessage: "",
  };
  openScene(state, session, at);
  // The last evening's farewell is not a waiting message for the next one.
  const previous = lastSession(slice);
  if (previous?.endMessage && slice.gate.message === previous.endMessage) slice.gate.message = "";
  slice.sessions.push(session);
  slice.gate.hidden = hidden === true;
  slice.pause = { active: false, message: "", since: null };
  return session;
}

export function endSession(state, role, at, { message = "" } = {}) {
  requireDM(role, state);
  const slice = write(state);
  const session = currentSession(slice);
  if (!session) fail("Nessuna sessione in corso.", "No session is running.");
  const note = text(message, 200);
  closeOpen(session, at);
  session.status = "ended";
  session.endedAt = at;
  session.endMessage = note;
  slice.gate = { hidden: true, message: note };
  slice.pause = { active: false, message: "", since: null };
  // The countdown belongs to the evening: the end clears it (progress clocks stay).
  Object.assign(slice.timer, { remainingMs: 0, endsAt: null, running: false });
  return session;
}

/** Correction after an end: the same session continues, with the stated reason. */
export function reopenSession(state, role, at, reason) {
  requireDM(role, state);
  const slice = write(state);
  const session = lastSession(slice);
  if (!session || session.status !== "ended")
    fail("Non c’è una sessione conclusa da riaprire.", "There is no ended session to reopen.");
  const why = text(reason, 200);
  if (why.length < 3)
    fail("Scrivi il motivo della correzione.", "Write the reason for the correction.");
  session.status = "live";
  session.endedAt = null;
  session.reopened.push({ at, reason: why });
  openScene(state, session, at);
  // The farewell goes with the end it belonged to; a message the DM wrote since stays.
  slice.gate = {
    hidden: false,
    message: slice.gate.message === session.endMessage ? "" : slice.gate.message,
  };
  session.endMessage = "";
  return session;
}

export function setSceneHidden(state, role, hidden) {
  requireDM(role, state);
  const slice = write(state);
  if (slice.gate.hidden === hidden)
    fail(
      hidden ? "La scena è già nascosta." : "La scena è già visibile.",
      hidden ? "The scene is already hidden." : "The scene is already shown.",
    );
  slice.gate.hidden = hidden;
}
export function setGateMessage(state, role, message) {
  requireDM(role, state);
  if (typeof message === "string" && message.trim().length > 200)
    fail(
      "Il messaggio può avere al massimo 200 caratteri.",
      "The message can be 200 characters at most.",
    );
  write(state).gate.message = text(message, 200);
}

export function setPause(state, role, active, at, message = "") {
  requireDM(role, state);
  const slice = write(state);
  if (slice.pause.active === active)
    fail(
      active ? "Il gioco è già in pausa." : "Il gioco non è in pausa.",
      active ? "The game is already paused." : "The game is not paused.",
    );
  slice.pause = active
    ? { active: true, message: text(message, 120), since: at }
    : { active: false, message: "", since: null };
  const session = currentSession(slice);
  if (session && active) session.pauses.push({ from: at, to: null });
  if (session && !active) {
    const open = session.pauses.at(-1);
    if (open && open.to === null) open.to = at;
  }
}

/** Keeps the live session's scene timeline in step with the active scene. */
export function recordActiveScene(state, at) {
  const session = currentSession(write(state));
  if (!session) return false;
  const scene = activeScene(state);
  const last = session.scenes.at(-1);
  if (last?.sceneId === scene?.id && last?.to === null) return false;
  if (last && last.to === null) last.to = at;
  if (scene) session.scenes.push({ sceneId: scene.id, name: scene.name, from: at, to: null });
  return true;
}
export function switchScene(state, role, sceneId, at) {
  requireDM(role, state);
  if (!state.scenes.some((scene) => scene.id === sceneId))
    fail("Scena non trovata.", "Scene not found.");
  if (state.activeSceneId === sceneId)
    fail("Questa scena è già attiva al Tavolo.", "This scene is already active at the Table.");
  activateScene(state, sceneId, role);
  recordActiveScene(state, at);
}

/** Whether this identity's map movement is stopped by the pause (Foundry: GM excluded). */
export function movementLocked(state, role) {
  return !runsSession(state, role) && readSession(state).pause.active === true;
}

/**
 * What a viewer sees at the Table: the scene ("table"), the waiting screen of the DDB
 * presentation gate, or a breakout scene when every character they control is away from
 * the party scene. `viewer` is a member id ("player", "dm") or "spectator".
 */
export function presentationFor(state, viewer) {
  const slice = readSession(state);
  const last = lastSession(slice);
  if (viewer === "dm" || (viewer !== "spectator" && runsSession(state, viewer)))
    return { kind: "table" };
  if (slice.gate.hidden)
    return {
      kind: "waiting",
      reason:
        last?.status === "ended" ? "ended" : last?.status === "live" ? "preparing" : "not-started",
      message: slice.gate.message,
    };
  if (viewer === "spectator") return { kind: "table", sceneId: state.activeSceneId };
  const own = partyCharacters(state).filter((actor) => canControlActor(actor, viewer, state));
  const places = own.map((actor) => locationOf(state, actor.id));
  // Like a Roll20 page: a player whose characters are all on another scene plays there
  // (own tokens, sheet, presence) while the DM runs the scene at the Table.
  if (own.length && places.every((place) => place && place !== state.activeSceneId)) {
    const sceneId = places[0];
    return {
      kind: "breakout",
      sceneId,
      actorIds: own.filter((_, i) => places[i] === sceneId).map((actor) => actor.id),
      party: sceneId === partyScene(state),
    };
  }
  return { kind: "table", sceneId: state.activeSceneId };
}

// ---------------------------------------------------------------------------------------
// Split party: ribbons and Regroup (Roll20 R20-140)
// ---------------------------------------------------------------------------------------

/**
 * The party scene (Roll20's Players ribbon). While nobody is split it is the scene at the
 * Table; once someone is split it stays put, so the DM can run a breakout scene at the
 * Table without moving everybody else there.
 */
export function partyScene(state) {
  const party = readSession(state).party;
  return party && state.scenes.some((scene) => scene.id === party) ? party : state.activeSceneId;
}
/**
 * Where a party character is. Like Roll20's ribbons the split is explicit: a character
 * the DM moved away is on that scene; everyone else is on the party scene, with or
 * without a token placed there.
 */
export function locationOf(state, actorId) {
  const split = readSession(state).split[actorId];
  const party = partyScene(state);
  if (split && split.sceneId !== party && state.scenes.some((s) => s.id === split.sceneId))
    return split.sceneId;
  return party;
}
export function hasToken(state, sceneId, actorId) {
  return Boolean(
    state.scenes
      .find((scene) => scene.id === sceneId)
      ?.tokens.some((token) => token.actorId === actorId),
  );
}
/** Ribbons: the party scene first (always), then every other scene with a character. */
export function partyRibbons(state) {
  const party = partyScene(state);
  const groups = new Map([[party, []]]);
  for (const actor of partyCharacters(state)) {
    const place = locationOf(state, actor.id);
    groups.set(place, [...(groups.get(place) ?? []), actor.id]);
  }
  return {
    ribbons: [...groups].map(([sceneId, actorIds]) => ({
      sceneId,
      name: state.scenes.find((scene) => scene.id === sceneId)?.name ?? sceneId,
      main: sceneId === party,
      atTable: sceneId === state.activeSceneId,
      actorIds,
    })),
  };
}
function entrySpot(scene, index) {
  const grid = Number(scene.gridSize) || 50;
  const occupied = (x, y) =>
    scene.tokens.some((token) => Math.hypot(token.x - x, token.y - y) < grid * 0.9);
  for (let step = 0; step < 40; step++) {
    const x = Math.min(scene.width - grid, grid * 2 + ((index + step) % 8) * grid);
    const y = Math.min(
      scene.height - grid,
      scene.height / 2 + Math.floor((index + step) / 8) * grid,
    );
    if (!occupied(x, y)) return { x, y };
  }
  return { x: grid * 2, y: scene.height / 2 };
}

export function moveToScene(state, role, actorIds, sceneId) {
  requireDM(role, state);
  const slice = write(state);
  const target = state.scenes.find((scene) => scene.id === sceneId);
  if (!target) fail("Scena non trovata.", "Scene not found.");
  const ids = [...new Set(Array.isArray(actorIds) ? actorIds : [])];
  if (!ids.length) fail("Scegli almeno un personaggio.", "Choose at least one character.");
  const party = new Set(partyCharacters(state).map((actor) => actor.id));
  // The Players ribbon stays where the party is from the first split onwards.
  const main = partyScene(state);
  let moved = 0;
  ids.forEach((actorId, index) => {
    const actor = state.actors[actorId];
    if (!party.has(actorId)) fail("Personaggio non disponibile.", "Character unavailable.");
    if (state.combat.active && state.combat.order.includes(actorId))
      fail(
        `${actor.name} è nell’ordine d’iniziativa: concludi l’incontro prima di dividere il gruppo.`,
        `${actor.name} is in the initiative order: end the encounter before splitting the party.`,
      );
    const from = locationOf(state, actorId);
    if (from === sceneId) return;
    let home = slice.split[actorId]?.home ?? null;
    const source = state.scenes.find((scene) => scene.id === from);
    const token = source?.tokens.find((entry) => entry.actorId === actorId) ?? null;
    if (token) {
      if (from === main) home = { sceneId: from, x: token.x, y: token.y };
      source.tokens = source.tokens.filter((entry) => entry !== token);
    }
    if (!target.tokens.some((entry) => entry.actorId === actorId)) {
      const spot =
        home && home.sceneId === sceneId ? { x: home.x, y: home.y } : entrySpot(target, index);
      const id =
        token && !target.tokens.some((entry) => entry.id === token.id)
          ? token.id
          : `token-${actorId}-${uid()}`;
      target.tokens.push({ ...(token ?? {}), id, actorId, x: spot.x, y: spot.y });
    }
    if (sceneId === main) delete slice.split[actorId];
    else slice.split[actorId] = { sceneId, home };
    moved++;
  });
  if (!moved)
    fail(
      "I personaggi scelti sono già in questa scena.",
      "The chosen characters are already here.",
    );
  // Everyone together again: the party follows the Table again, and a Table left on a
  // breakout scene comes back to the party (Roll20 Regroup brings all to the ribbon).
  let returned = false;
  if (Object.keys(slice.split).length) slice.party = main;
  else {
    slice.party = null;
    if (state.activeSceneId !== main) {
      activateScene(state, main, role);
      returned = true;
    }
  }
  return { moved, returned };
}
export function regroup(state, role) {
  requireDM(role, state);
  const main = partyScene(state);
  const away = partyCharacters(state)
    .map((actor) => actor.id)
    .filter((id) => locationOf(state, id) !== main);
  if (!away.length) fail("Il gruppo è già riunito.", "The party is already together.");
  return moveToScene(state, role, away, main);
}

/** A party character's own move on a breakout scene (the scene not at the Table). */
function breakoutTarget(state, role, actorId, { onBehalf = null } = {}) {
  const actor = state.actors[actorId];
  const identity = onBehalf ?? role;
  if (onBehalf && role !== "dm")
    fail("Solo il DM può agire per un giocatore.", "Only the DM can act for a player.");
  if (
    !actor ||
    !partyCharacters(state).some((entry) => entry.id === actorId) ||
    !canControlActor(actor, identity, state)
  )
    fail("Non controlli questo personaggio.", "You do not control this character.");
  const sceneId = locationOf(state, actorId);
  if (sceneId === state.activeSceneId)
    fail(
      "Questa scena è al Tavolo: muovi la pedina dal Tavolo.",
      "This scene is at the Table: move the token there.",
    );
  // Foundry pause: players stop, the DM (also acting for a player) does not.
  if (movementLocked(state, role))
    fail(
      "Il gioco è in pausa: il DM ha fermato movimenti e porte.",
      "The game is paused: the DM has stopped movement and doors.",
    );
  if (state.combat.active && state.combat.order.includes(actorId))
    fail(
      "Durante l’incontro il movimento segue i turni del Tavolo.",
      "During the encounter movement follows the Table’s turns.",
    );
  const scene = state.scenes.find((entry) => entry.id === sceneId);
  const token = scene?.tokens.find((entry) => entry.actorId === actorId);
  if (!token)
    fail("Questo personaggio non ha una pedina qui.", "This character has no token here.");
  return { actor, scene, token, identity };
}
/**
 * Preview of a move on a breakout scene with the Table's own geometry (walls, doors and
 * difficult terrain through spatial.tracePath; snap and edges as state.previewMovement).
 * Outside initiative there is no movement budget, as at the Table.
 */
export function previewSceneMove(state, role, actorId, point, options = {}) {
  const { actor, scene, token, identity } = breakoutTarget(state, role, actorId, options);
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y))
    fail("Destinazione non valida.", "Invalid destination.");
  let target = point;
  if (scene.gridSnap === true) {
    const snap = (value, offset) =>
      Math.round((value - offset - scene.gridSize / 2) / scene.gridSize) * scene.gridSize +
      offset +
      scene.gridSize / 2;
    target = { x: snap(point.x, scene.gridOffsetX || 0), y: snap(point.y, scene.gridOffsetY || 0) };
  }
  target = {
    x: Math.max(20, Math.min(scene.width - 20, target.x)),
    y: Math.max(20, Math.min(scene.height - 20, target.y)),
  };
  return {
    sceneId: scene.id,
    ...tracePath(scene, token, [target], {
      role: identity,
      crawling: hasCondition(actor, "prone"),
    }),
  };
}
export function moveInScene(state, role, actorId, point, options = {}) {
  const preview = previewSceneMove(state, role, actorId, point, options);
  if (preview.blocked)
    fail(
      "Il percorso non è percorribile. Scegli un’altra destinazione.",
      "The path is blocked. Choose another destination.",
    );
  const { token } = breakoutTarget(state, role, actorId, options);
  token.x = preview.end.x;
  token.y = preview.end.y;
  return preview;
}

// ---------------------------------------------------------------------------------------
// Countdown (Owlbear Ticker!, VTL-178) and progress clocks (Owlbear Count!, VTL-179)
// ---------------------------------------------------------------------------------------

export function timerRemaining(timer, at) {
  return timer.running && Number.isFinite(timer.endsAt)
    ? Math.max(0, timer.endsAt - at)
    : Math.max(0, timer.remainingMs);
}
export function adjustTimer(state, role, deltaMs, at) {
  requireDM(role, state);
  const timer = write(state).timer;
  const next = Math.min(MAX_TIMER, Math.max(0, timerRemaining(timer, at) + deltaMs));
  if (timer.running && next > 0) timer.endsAt = at + next;
  else {
    timer.running = false;
    timer.endsAt = null;
    timer.remainingMs = next;
  }
  return next;
}
export function startTimer(state, role, at) {
  requireDM(role, state);
  const timer = write(state).timer;
  if (timer.running)
    fail("Il conto alla rovescia è già in corso.", "The countdown is already running.");
  if (timer.remainingMs <= 0)
    fail("Aggiungi del tempo prima di avviare.", "Add time before starting.");
  timer.running = true;
  timer.endsAt = at + timer.remainingMs;
  timer.run = (timer.run || 0) + 1;
}
export function pauseTimer(state, role, at) {
  requireDM(role, state);
  const timer = write(state).timer;
  if (!timer.running) fail("Il conto alla rovescia è fermo.", "The countdown is not running.");
  timer.remainingMs = Math.max(0, timer.endsAt - at);
  timer.running = false;
  timer.endsAt = null;
}
export function resetTimer(state, role) {
  requireDM(role, state);
  const timer = write(state).timer;
  Object.assign(timer, { remainingMs: 0, endsAt: null, running: false });
}
export function configureTimer(state, role, { label = "", hideRemaining = false } = {}) {
  requireDM(role, state);
  if (typeof label === "string" && label.trim().length > 60)
    fail("Il titolo può avere al massimo 60 caratteri.", "The title can be 60 characters at most.");
  const timer = write(state).timer;
  timer.label = text(label, 60);
  timer.hideRemaining = hideRemaining === true;
}
/** What a viewer sees of the countdown; the DM always sees the time. */
export function timerView(slice, viewer, at) {
  const timer = slice.timer;
  const left = timerRemaining(timer, at);
  if (!timer.running && left <= 0) return null;
  const hidden = viewer !== "dm" && timer.hideRemaining;
  return {
    label: timer.label,
    running: timer.running,
    expired: timer.running && left <= 0,
    remainingMs: hidden ? null : left,
    hidden,
    run: timer.run,
    endsAt: timer.endsAt,
  };
}
export function formatDuration(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export function addClock(state, role, { label, segments }, id = uid()) {
  requireDM(role, state);
  const slice = write(state);
  const name = typeof label === "string" ? label.trim() : "";
  if (!name || name.length > 60)
    fail(
      "Dai un nome all’orologio (massimo 60 caratteri).",
      "Name the clock (60 characters at most).",
    );
  const size = Number(segments);
  if (!CLOCK_SIZES.includes(size)) fail("Scegli 4, 6 o 8 segmenti.", "Choose 4, 6 or 8 segments.");
  if (slice.clocks.length >= 12) fail("Al massimo 12 orologi.", "At most 12 clocks.");
  slice.clocks.push({ id, label: name, segments: size, filled: 0 });
  return id;
}
function clockById(slice, id) {
  const clock = slice.clocks.find((entry) => entry.id === id);
  if (!clock) fail("Orologio non trovato.", "Clock not found.");
  return clock;
}
export function setClockFill(state, role, id, filled) {
  requireDM(role, state);
  const clock = clockById(write(state), id);
  const value = Number(filled);
  if (!Number.isInteger(value) || value < 0 || value > clock.segments)
    fail("Valore fuori dall’orologio.", "Value outside the clock.");
  clock.filled = value;
  return clock;
}
export function removeClock(state, role, id) {
  requireDM(role, state);
  const slice = write(state);
  clockById(slice, id);
  slice.clocks = slice.clocks.filter((clock) => clock.id !== id);
  if (slice.pin?.clockId === id) slice.pin = null;
}
/** One pinned clock at a time (Count!); a new pin reappears for those who closed it. */
export function pinClock(state, role, id) {
  requireDM(role, state);
  const slice = write(state);
  if (id === null) {
    if (!slice.pin) fail("Nessun orologio fissato.", "No clock is pinned.");
    slice.pin = null;
    return null;
  }
  clockById(slice, id);
  slice.pinSeq = (slice.pinSeq || 0) + 1;
  slice.pin = { clockId: id, revision: slice.pinSeq };
  return slice.pin;
}
export function dismissPinnedClock(state, role) {
  const slice = write(state);
  if (!slice.pin) fail("Nessun orologio fissato.", "No clock is pinned.");
  slice.dismissed[role] = slice.pin.revision;
}
export function pinnedClockFor(slice, viewer) {
  if (!slice.pin) return null;
  if (viewer !== "dm" && slice.dismissed[viewer] === slice.pin.revision) return null;
  return slice.clocks.find((clock) => clock.id === slice.pin.clockId) ?? null;
}

export function setDisplayScale(state, role, { cellMm, ppi, ruler }) {
  requireDM(role, state);
  const mm = Number(cellMm);
  const density = Number(ppi);
  if (!Number.isFinite(mm) || mm < 10 || mm > 60)
    fail("Lato della casella tra 10 e 60 mm.", "Cell side between 10 and 60 mm.");
  if (!Number.isFinite(density) || density < 40 || density > 400)
    fail("Densità tra 40 e 400 pixel per pollice.", "Density between 40 and 400 pixels per inch.");
  write(state).display = {
    ...write(state).display,
    cellMm: mm,
    ppi: density,
    ruler: ruler === true,
  };
}
/** "scene": the whole scene; "party": around the players' tokens; "view": a fixed area. */
export function setDisplayRegion(state, role, { mode, rect = null } = {}) {
  requireDM(role, state);
  if (!REGION_MODES.includes(mode)) fail("Area non valida.", "Invalid area.");
  const display = write(state).display;
  if (mode === "scene") delete display.region;
  else {
    const region = normalizeRegion({ mode, ...(rect ?? {}) });
    if (!region) fail("Scegli un’area della mappa.", "Choose an area of the map.");
    display.region = region;
  }
}
/** The scene rectangle the spectator screen shows, in scene units. */
export function displayRegion(state, scene, display) {
  const whole = { x: 0, y: 0, w: scene.width, h: scene.height };
  const region = display?.region;
  const clip = (r) => {
    const x = Math.max(0, Math.min(scene.width - 10, r.x));
    const y = Math.max(0, Math.min(scene.height - 10, r.y));
    return {
      x,
      y,
      w: Math.max(10, Math.min(scene.width - x, r.w)),
      h: Math.max(10, Math.min(scene.height - y, r.h)),
    };
  };
  if (region?.mode === "view") return clip(region);
  if (region?.mode === "party") {
    const points = visibleTokens(state, scene, "spectator").filter(
      (token) => state.actors[token.actorId]?.kind === "character",
    );
    if (!points.length) return whole;
    const grid = Math.max(10, Number(scene.gridSize) || 50);
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    return clip({
      x: Math.min(...xs) - 3 * grid,
      y: Math.min(...ys) - 3 * grid,
      w: Math.max(...xs) - Math.min(...xs) + 6 * grid,
      h: Math.max(...ys) - Math.min(...ys) + 6 * grid,
    });
  }
  return whole;
}
export const cellPixels = (display) => (display.cellMm / 25.4) * display.ppi;

// ---------------------------------------------------------------------------------------
// Session story (Quest Portal Session Stories, VTL-054)
// ---------------------------------------------------------------------------------------

export function sessionFacts(state, session, at = Date.now()) {
  const end = session.endedAt ?? at;
  const span = (from, to) => Math.max(0, Math.min(to ?? end, end) - from);
  const pauseMs = session.pauses.reduce((sum, p) => sum + span(p.from, p.to), 0);
  const scenes = [];
  for (const segment of session.scenes) {
    const row = scenes.find((entry) => entry.sceneId === segment.sceneId);
    if (row) row.ms += span(segment.from, segment.to);
    else
      scenes.push({
        sceneId: segment.sceneId,
        name: segment.name,
        ms: span(segment.from, segment.to),
      });
  }
  const attendance = partyMembers(state).map((member) => {
    const rows = session.presence
      .filter((row) => row.memberId === member.id)
      .sort((a, b) => a.at - b.at);
    let status = rows[0]?.status ?? "here";
    let since = session.startedAt;
    let awayMs = 0;
    let present = status === "here";
    let note = status === "away" ? (rows[0]?.message ?? "") : "";
    for (const row of rows.slice(1)) {
      if (status === "away") awayMs += span(since, row.at);
      status = row.status;
      since = Math.max(session.startedAt, row.at);
      if (status === "here") present = true;
      else if (row.message) note = row.message;
    }
    if (status === "away") awayMs += span(since, end);
    return { memberId: member.id, label: member.label, role: member.role, present, awayMs, note };
  });
  return {
    number: session.number,
    startedAt: session.startedAt,
    endedAt: end,
    durationMs: Math.max(0, end - session.startedAt),
    pauseMs,
    scenes,
    attendance,
  };
}

// "h" and "min" read the same in Italian and English.
function minutesText(ms) {
  const minutes = Math.round(ms / MINUTE);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`;
}
export function storyText(facts, lang = "it") {
  const t = (it, en) => (lang === "it" ? it : en);
  const tag = lang === "it" ? "it-IT" : "en-GB";
  const day = new Intl.DateTimeFormat(tag, { dateStyle: "long" }).format(new Date(facts.startedAt));
  const time = new Intl.DateTimeFormat(tag, { timeStyle: "short" });
  const people = facts.attendance
    .map((row) => {
      const name = row.role === "dm" ? "DM" : `${row.label} (${t("giocatore", "player")})`;
      if (!row.present) return `${name}: ${t("assente", "absent")}`;
      return (
        `${name}: ${t("presente", "present")}` +
        (row.awayMs >= MINUTE
          ? `, ${t("assente per", "away for")} ${minutesText(row.awayMs)}${row.note ? ` (${row.note})` : ""}`
          : "")
      );
    })
    .join("; ");
  const scenes = facts.scenes.map((row) => `${row.name} (${minutesText(row.ms)})`).join("; ");
  return {
    title: t(`Racconto della sessione ${facts.number}`, `Session ${facts.number} story`),
    body: [
      `${t("Sessione", "Session")} ${facts.number} · ${day}, ${time.format(new Date(facts.startedAt))}–${time.format(new Date(facts.endedAt))}`,
      "",
      `${t("Presenze", "Attendance")}: ${people}`,
      `${t("Durata", "Duration")}: ${minutesText(facts.durationMs)}${facts.pauseMs >= MINUTE ? `, ${t("di cui in pausa", "of which paused")} ${minutesText(facts.pauseMs)}` : ""}`,
      `${t("Scene", "Scenes")}: ${scenes || t("nessuna", "none")}`,
      "",
      t("Cosa è successo:", "What happened:"),
      "",
    ].join("\n"),
  };
}

/**
 * Writes the automatic story of an ended session as a private DM draft in the campaign
 * journal (recap) or personal notes (note). A later end of the same session refreshes an
 * untouched draft; a draft the DM has edited, applied or discarded is left alone.
 */
export function writeStory(
  state,
  role,
  sessionId,
  { kind = "recap", lang = "it", draftId = uid(), at = Date.now() } = {},
) {
  requireDM(role);
  const session = write(state).sessions.find((row) => row.id === sessionId);
  if (!session || session.status !== "ended")
    fail("La sessione non è conclusa.", "The session has not ended.");
  const stories = writeStories(state).stories;
  const content = storyText(sessionFacts(state, session, at), lang);
  // The story is linked to the evening's record in Campaign → Sessions when there is one.
  const linked =
    session.campaignSessionId &&
    (state.campaign?.sessions ?? []).some((row) => row.id === session.campaignSessionId)
      ? session.campaignSessionId
      : null;
  const existing = stories.find((row) => row.sessionId === sessionId);
  if (existing) {
    let draft = null;
    try {
      draft = getCampaignDraft(state, existing.draftId, role);
    } catch {}
    if (draft?.status === "active" && draft.revision === existing.revision) {
      const saved = saveCampaignDraft(
        state,
        existing.draftId,
        {
          data: {
            ...draft.data,
            title: content.title,
            body: content.body,
            sessionId: draft.data.sessionId ?? linked,
          },
        },
        role,
      );
      existing.revision = saved.revision;
      existing.at = at;
      return { ...existing, result: "updated" };
    }
    return { ...existing, result: "kept" };
  }
  const created = createCampaignDraft(
    state,
    {
      id: draftId,
      kind: kind === "note" ? "note" : "recap",
      campaignId: state.campaign?.id ?? null,
      sessionId: linked,
      returnTo: { page: "table" },
    },
    role,
  );
  const saved = saveCampaignDraft(
    state,
    draftId,
    { data: { ...created.data, title: content.title, body: content.body } },
    role,
  );
  const row = { sessionId, draftId, kind: created.kind, revision: saved.revision, at };
  stories.push(row);
  return { ...row, result: "created" };
}
export function storyFor(state, sessionId) {
  return state?.ext?.[STORIES]?.stories.find((row) => row.sessionId === sessionId) ?? null;
}

// ---------------------------------------------------------------------------------------
// Views: projections, arrival and inactivity
// ---------------------------------------------------------------------------------------

/**
 * Tokens a viewer may see on a scene. "spectator" has no identity: only shared, visible
 * tokens. A member id gives that member's view, still without private sheets, because
 * the DM's "view as" must never reveal a player's private content.
 */
export function visibleTokens(state, scene, viewer) {
  if (!scene) return [];
  return scene.tokens.filter((token) => {
    const actor = state.actors[token.actorId];
    if (!actor || !isActorAvailable(actor) || actor.visibility === "private") return false;
    const identity = viewer === "spectator" ? "player" : viewer;
    if (actor.companion && !canViewActor(actor, identity, state)) return false;
    const own = viewer !== "spectator" && canControlActor(actor, viewer, state);
    // B12 "Visible only to…" (Owlbear Smoke & Spectre, VTL-143): a member whose character
    // is in the token's audience sees it; the shared screen shows only what all see.
    const audience =
      viewer !== "spectator" && seesAsAudience(state, state.ext?.["token-menu"], token, viewer);
    return own || audience || (!actor.hidden && !token.hidden && token.visible !== false);
  });
}

/**
 * Roll20's centre-on-load, adapted to a Table that shows the whole scene at zoom 1: at
 * zoom 1 every token is already on screen and nothing changes; zoomed in, the view keeps
 * its zoom and centres on the viewer's own tokens. `force` (Home) zooms to 2 when needed.
 */
export function focusView(scene, points, current, { force = false } = {}) {
  if (!scene || !points.length) return null;
  const zoom = current.zoom > 1.001 ? current.zoom : force ? 2 : null;
  if (!zoom) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const w = scene.width / zoom;
  const h = scene.height / zoom;
  const clamp = (value, max) => Math.round(Math.max(0, Math.min(max, value)));
  return {
    zoom,
    pan: { x: clamp(cx - w / 2, scene.width - w), y: clamp(cy - h / 2, scene.height - h) },
  };
}
export function ownTokenPoints(state, scene, role) {
  return (scene?.tokens ?? []).filter((token) => {
    const actor = state.actors[token.actorId];
    return (
      actor &&
      isActorAvailable(actor) &&
      (actor.owner === role ||
        (Array.isArray(actor.controllers) && actor.controllers.includes(role)))
    );
  });
}

/**
 * One step of the DDB keep-alive: warn after `minutes` idle, act 5 minutes later, once.
 * Any input after the warning (also after acting) clears it and re-arms the keep-alive.
 */
export function idleStep({ now, lastInput, warnedAt, expired = false, live, minutes }) {
  if (!live) return { action: "clear" };
  if (warnedAt === null || warnedAt === undefined)
    return now - lastInput >= minutes * MINUTE ? { action: "warn" } : { action: "none" };
  if (lastInput > warnedAt) return { action: "clear" };
  if (expired) return { action: "none" };
  return now - warnedAt >= KEEP_ALIVE_GRACE ? { action: "expire" } : { action: "none" };
}

// ---------------------------------------------------------------------------------------
// Commands shared by the UI (each one commit; exported for tests)
// ---------------------------------------------------------------------------------------

const memberName = (state, memberId) =>
  partyMembers(state).find((member) => member.id === memberId)?.label ?? memberId;
const onBehalfLabel = (ctx, memberId, label) =>
  `${ctx.t("DM per", "DM for")} ${memberName(ctx.state, memberId)} · ${label}`;
const tableReturned = (ctx) =>
  ctx.toast(
    ctx.t(
      `Gruppo riunito: il Tavolo torna a ${activeScene(ctx.state)?.name ?? ""}.`,
      `Party together: the Table returns to ${activeScene(ctx.state)?.name ?? ""}.`,
    ),
  );

export const actions = {
  start: (ctx, { hidden = false } = {}) =>
    ctx.commit(ctx.t("Sessione avviata", "Session started"), (d) =>
      startSession(d, ctx.role, Date.now(), { hidden }),
    ),
  end: (ctx, { story = true, destination = "journal", message = "" } = {}) => {
    const at = Date.now();
    let result = null;
    ctx.commit(ctx.t("Sessione conclusa", "Session ended"), (d) => {
      const session = endSession(d, ctx.role, at, { message });
      // Campaign → Sessions lists the evening as played; a refusal there never blocks
      // the end (the evening simply stays without its campaign record).
      try {
        recordPlayedSession(d, ctx.role, session, ctx.lang);
      } catch {}
      // C3: whoever runs the session ends it; the evening's story is the DM's own writing
      // (a private draft of the DM), so the runner's end records the evening without it.
      if (story && ctx.role === "dm")
        result = writeStory(d, ctx.role, session.id, {
          kind: destination === "notes" ? "note" : "recap",
          lang: ctx.lang,
          at,
        });
    });
    return result;
  },
  reopen: (ctx, reason) =>
    ctx.commit(ctx.t("Sessione riaperta", "Session reopened") + ": " + text(reason, 200), (d) =>
      reopenSession(d, ctx.role, Date.now(), reason),
    ),
  hide: (ctx) =>
    ctx.commit(ctx.t("Scena nascosta ai giocatori", "Scene hidden from players"), (d) =>
      setSceneHidden(d, ctx.role, true),
    ),
  show: (ctx) =>
    ctx.commit(ctx.t("Scena mostrata ai giocatori", "Scene shown to players"), (d) =>
      setSceneHidden(d, ctx.role, false),
    ),
  message: (ctx, message) =>
    ctx.commit(ctx.t("Messaggio d’attesa aggiornato", "Waiting message updated"), (d) =>
      setGateMessage(d, ctx.role, message),
    ),
  pause: (ctx, message = "") =>
    ctx.commit(ctx.t("Gioco in pausa", "Game paused"), (d) =>
      setPause(d, ctx.role, true, Date.now(), message),
    ),
  resume: (ctx) =>
    ctx.commit(ctx.t("Gioco ripreso", "Game resumed"), (d) =>
      setPause(d, ctx.role, false, Date.now()),
    ),
  switchScene: (ctx, sceneId) => {
    const scene = ctx.state.scenes.find((entry) => entry.id === sceneId);
    const hidden = readSession(ctx.state).gate.hidden;
    // While the scene is hidden the change stays private: its audit label names the scene
    // only for the DM, and players keep the waiting screen (DDB-111).
    return ctx.commit(
      hidden
        ? ctx.t("Scena attivata in privato", "Scene activated privately") +
            ": " +
            (scene?.name ?? "")
        : ctx.t("Scena attivata al Tavolo", "Scene activated at the Table"),
      (d) => switchScene(d, ctx.role, sceneId, Date.now()),
      hidden ? { visibility: "private" } : {},
    );
  },
  presence: (ctx, memberId, input, { onBehalf = false } = {}) => {
    const name = memberName(ctx.state, memberId);
    const status = input?.status === "away" ? ctx.t("assente", "away") : ctx.t("presente", "here");
    const note =
      typeof input?.message === "string" && input.message.trim()
        ? ` — ${input.message.trim()}`
        : "";
    const label = onBehalf
      ? onBehalfLabel(ctx, memberId, status[0].toUpperCase() + status.slice(1) + note)
      : `${name}: ${status}${note}`;
    return ctx.commit(label, (d) =>
      setPresence(d, ctx.role, memberId, input, Date.now(), { onBehalf }),
    );
  },
  move: (ctx, actorIds, sceneId) => {
    const names = actorIds.map((id) => ctx.state.actors[id]?.name ?? id).join(", ");
    const main = sceneId === partyScene(ctx.state);
    let outcome = null;
    const result = ctx.commit(
      main
        ? ctx.t(`${names} torna alla scena del gruppo`, `${names} returns to the party scene`)
        : ctx.t(`${names} si separa dal gruppo`, `${names} leaves the party scene`),
      (d) => (outcome = moveToScene(d, ctx.role, actorIds, sceneId)),
    );
    if (outcome?.returned) tableReturned(ctx);
    return result;
  },
  regroup: (ctx) => {
    let outcome = null;
    const result = ctx.commit(
      ctx.t("Gruppo riunito", "Party regrouped"),
      (d) => (outcome = regroup(d, ctx.role)),
    );
    if (outcome?.returned) tableReturned(ctx);
    return result;
  },
  moveInScene: (ctx, actorId, point, { onBehalf = null } = {}) => {
    const actor = ctx.state.actors[actorId];
    const what = `${actor?.name ?? actorId}: ${ctx.t("movimento nella scena separata", "move in the separate scene")}`;
    return ctx.commit(onBehalf ? onBehalfLabel(ctx, onBehalf, what) : what, (d) =>
      moveInScene(d, ctx.role, actorId, point, { onBehalf }),
    );
  },
  timerAdd: (ctx, deltaMs) => {
    const hidden = readSession(ctx.state).timer.hideRemaining;
    const sign = deltaMs < 0 ? "−" : "+";
    return ctx.commit(
      ctx.t("Conto alla rovescia", "Countdown") + ` ${sign}${formatDuration(Math.abs(deltaMs))}`,
      (d) => adjustTimer(d, ctx.role, deltaMs, Date.now()),
      hidden ? { visibility: "private" } : {},
    );
  },
  timerStart: (ctx) =>
    ctx.commit(ctx.t("Conto alla rovescia avviato", "Countdown started"), (d) =>
      startTimer(d, ctx.role, Date.now()),
    ),
  timerPause: (ctx) =>
    ctx.commit(ctx.t("Conto alla rovescia in pausa", "Countdown paused"), (d) =>
      pauseTimer(d, ctx.role, Date.now()),
    ),
  timerReset: (ctx) =>
    ctx.commit(ctx.t("Conto alla rovescia azzerato", "Countdown reset"), (d) =>
      resetTimer(d, ctx.role),
    ),
  timerConfigure: (ctx, input) =>
    ctx.commit(
      ctx.t("Conto alla rovescia impostato", "Countdown settings saved"),
      (d) => configureTimer(d, ctx.role, input),
      { visibility: "private" },
    ),
  clockAdd: (ctx, input) =>
    ctx.commit(
      ctx.t("Orologio creato", "Clock created") + ": " + text(input?.label, 60),
      (d) => addClock(d, ctx.role, input),
      { visibility: "private" },
    ),
  clockFill: (ctx, id, filled) => {
    const slice = readSession(ctx.state);
    const clock = slice.clocks.find((entry) => entry.id === id);
    const pinned = slice.pin?.clockId === id;
    return ctx.commit(
      `${ctx.t("Orologio", "Clock")} «${clock?.label ?? ""}» ${filled}/${clock?.segments ?? "?"}`,
      (d) => setClockFill(d, ctx.role, id, filled),
      pinned ? {} : { visibility: "private" },
    );
  },
  clockRemove: (ctx, id) =>
    ctx.commit(
      ctx.t("Orologio eliminato", "Clock deleted"),
      (d) => removeClock(d, ctx.role, id),
      readSession(ctx.state).pin?.clockId === id ? {} : { visibility: "private" },
    ),
  clockPin: (ctx, id) => {
    const clock = readSession(ctx.state).clocks.find((entry) => entry.id === id);
    return ctx.commit(
      id
        ? ctx.t("Orologio fissato per i giocatori", "Clock pinned for players") +
            `: ${clock?.label ?? ""}`
        : ctx.t("Orologio tolto dagli schermi", "Clock unpinned"),
      (d) => pinClock(d, ctx.role, id),
    );
  },
  clockDismiss: (ctx) =>
    ctx.commit(
      ctx.t("Orologio fissato chiuso", "Pinned clock closed"),
      (d) => dismissPinnedClock(d, ctx.role),
      { local: true, visibility: "private" },
    ),
  display: (ctx, input) =>
    ctx.commit(
      ctx.t("Scala dello schermo condiviso", "Shared screen scale"),
      (d) => setDisplayScale(d, ctx.role, input),
      { visibility: "private" },
    ),
  displayRegion: (ctx, input) =>
    ctx.commit(
      ctx.t("Area dello schermo condiviso", "Shared screen area"),
      (d) => setDisplayRegion(d, ctx.role, input),
      { visibility: "private" },
    ),
  moveOnBehalf: (ctx, memberId, actorId, point) => {
    if (ctx.role !== "dm")
      fail("Solo il DM può agire per un giocatore.", "Only the DM can act for a player.");
    const actor = ctx.state.actors[actorId];
    if (!actor || !canControlActor(actor, memberId, ctx.state) || actor.visibility === "private")
      fail("Questa creatura non è del giocatore.", "This creature is not the player’s.");
    const preview = previewMovement(ctx.state, actorId, point, { role: "dm" });
    if (preview.blocked) fail("Percorso non disponibile.", "Path unavailable.");
    return ctx.commit(
      onBehalfLabel(
        ctx,
        memberId,
        `${actor.name}: ${ctx.t("movimento confermato", "movement confirmed")}`,
      ),
      (d) =>
        beginMovement(
          d,
          {
            id: uid(),
            actorId,
            point: { x: point.x, y: point.y },
            waypoints: [],
            geometryKey: preview.geometryKey,
          },
          "dm",
        ),
    );
  },
};

// ---------------------------------------------------------------------------------------
// UI state (this visit only: never saved, reset on role change, Reset and leaving)
// ---------------------------------------------------------------------------------------

const ui = {
  viewAs: null, // member id the DM is viewing as (Roll20 Player View)
  clean: false, // Owlbear hide UI
  pendingCenter: false,
  behalf: null, // {actorId, point}
  ribbonPick: new Set(),
  tip: 0,
  liveTable: null,
  displayNotice: null, // "warning" | "suspended" on a detached display
  playAs: null, // P10 TV-112: member the DM plays for at the Table (Alchemy "play as")
  scrollTo: null, // P10 TV-130/131: the Session panel part to bring into view
  menu: false, // visual pass 2: the DM's «Sessione» menu on the map is open
};
export function resetUI() {
  ui.viewAs = null;
  ui.playAs = null;
  ui.scrollTo = null;
  ui.clean = false;
  ui.behalf = null;
  ui.ribbonPick.clear();
  ui.displayNotice = null;
  ui.menu = false;
}
export const uiState = ui;

const TIPS = [
  L(
    "Premi Home al Tavolo per centrare la vista sulle tue pedine.",
    "Press Home at the Table to centre the view on your tokens.",
  ),
  L(
    "Ctrl+Maiusc+H nasconde l’interfaccia per uno schermo pulito; ripremi per tornare.",
    "Ctrl+Shift+H hides the interface for a clean screen; press again to return.",
  ),
  L(
    "Puoi tirare dadi veri: scegli «Dado fisico» e scrivi il risultato.",
    "You can roll real dice: choose “Physical die” and type the result.",
  ),
  L(
    "Esc annulla una mossa preparata: nessuna risorsa viene spesa.",
    "Escape cancels a planned move: no resources are spent.",
  ),
  L(
    "Dal pulsante Gruppo puoi segnalare «Assente — torno subito».",
    "From the Party button you can post “Away — back soon”.",
  ),
  L(
    "Gli appunti «Solo io» restano tuoi: il DM non li legge.",
    "“Only me” notes stay yours: the DM cannot read them.",
  ),
  L(
    "Riposi e Dadi Vita si registrano dalla scheda o dal Tavolo.",
    "Rests and Hit Dice are recorded from the sheet or the Table.",
  ),
  L(
    "Il registro della sessione mostra tiri e correzioni con il loro motivo.",
    "The session log shows rolls and corrections with their reason.",
  ),
];

// P10 SV-50 (D&D Beyond waiting-room tips): while the game is paused players read a tip or
// a rule of the day, in our own words (D&D 2024 rules, SRD 5.2.1).
const RULES_OF_THE_DAY = [
  L(
    "Regola del giorno: vantaggio e svantaggio non si sommano. Se li hai entrambi, tiri un solo d20.",
    "Rule of the day: advantage and disadvantage do not stack. If you have both, you roll one d20.",
  ),
  L(
    "Regola del giorno: un 20 naturale su un tiro per colpire colpisce sempre ed è un colpo critico.",
    "Rule of the day: a natural 20 on an attack roll always hits and is a critical hit.",
  ),
  L(
    "Regola del giorno: a 0 PF fai un tiro salvezza contro la morte all’inizio di ogni tuo turno.",
    "Rule of the day: at 0 HP you make a death saving throw at the start of each of your turns.",
  ),
  L(
    "Regola del giorno: la tua Reazione torna disponibile all’inizio del tuo turno.",
    "Rule of the day: your Reaction becomes available again at the start of your turn.",
  ),
  L(
    "Regola del giorno: la Percezione passiva è 10 più il tuo modificatore di Saggezza (Percezione).",
    "Rule of the day: passive Perception is 10 plus your Wisdom (Perception) modifier.",
  ),
];
function pauseTip(ctx) {
  const day = Math.floor(Date.now() / 86400000);
  const pool = [RULES_OF_THE_DAY[day % RULES_OF_THE_DAY.length], ...TIPS];
  return ctx.label(pool[ui.tip % pool.length]);
}

// ---------------------------------------------------------------------------------------
// Rendering helpers
// ---------------------------------------------------------------------------------------

function attempt(ctx, fn) {
  try {
    return fn();
  } catch (error) {
    ctx.toast(ctx.label(error?.it ? error : (error?.message ?? String(error))), true);
    return null;
  }
}
const btn = (ctx, action, label, { cls = "", attrs = "", aria = "" } = {}) =>
  `<button type="button" class="button ${cls}" data-sv="${action}" ${aria ? `aria-label="${ctx.esc(aria)}"` : ""} ${attrs}>${label}</button>`;

function clockSVG(clock, size = 44) {
  const r = size / 2 - 3;
  const c = size / 2;
  const slices = Array.from({ length: clock.segments }, (_, i) => {
    const a0 = (i / clock.segments) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / clock.segments) * Math.PI * 2 - Math.PI / 2;
    const p = (a) => `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`;
    return `<path d="M${c} ${c} L${p(a0)} A${r} ${r} 0 0 1 ${p(a1)} Z" class="${i < clock.filled ? "is-filled" : ""}"/>`;
  }).join("");
  return `<svg class="session-view-clock-face" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" aria-hidden="true">${slices}</svg>`;
}

function timerMarkup(ctx, view, { large = false } = {}) {
  if (!view) return "";
  // Ticker's "hide remaining": players read that it runs, never how long is left.
  const time = view.expired
    ? ctx.t("Tempo scaduto", "Time is up")
    : view.hidden
      ? view.running
        ? ctx.t("in corso", "running")
        : ctx.t("in pausa", "paused")
      : formatDuration(view.remainingMs);
  const live = view.running && !view.hidden && !view.expired;
  const stopped = !view.running && !view.expired && !view.hidden;
  return `<div class="session-view-timer ${view.expired ? "is-expired" : ""} ${view.hidden || view.expired ? "is-words" : ""} ${large ? "is-large" : ""}" role="timer" aria-live="off">${ctx.icon("clock")}<span class="session-view-timer-label">${ctx.esc(view.label || ctx.t("Conto alla rovescia", "Countdown"))}</span><strong ${live ? `data-sv-remaining data-sv-ends="${view.endsAt}"` : ""}>${time}</strong>${stopped ? `<small>${ctx.t("in pausa", "paused")}</small>` : ""}</div>`;
}

function clockCard(ctx, clock, { closable = false, large = false } = {}) {
  if (!clock) return "";
  return `<div class="session-view-clock ${large ? "is-large" : ""}" role="img" aria-label="${ctx.esc(`${clock.label}: ${clock.filled} ${ctx.t("su", "of")} ${clock.segments}`)}">${clockSVG(clock, large ? 120 : 44)}<span><strong>${ctx.esc(clock.label)}</strong><small>${clock.filled}/${clock.segments}</small></span>${closable ? `<button type="button" class="session-view-icon" data-sv="clock-dismiss" aria-label="${ctx.t("Chiudi l’orologio fissato", "Close the pinned clock")}">${ctx.icon("close")}</button>` : ""}</div>`;
}

// R7 CA-57 (Owlbear hands the GM role from the room's player list): the campaign owner, the
// member who may hand the DM role over for the session (campaign-members.startHandover).
function campaignOwner(state) {
  const cid = state.campaign?.id;
  return (
    state.ext?.["campaign-members"]?.campaigns?.[cid]?.ownerId ??
    campaignMembers(state).find((member) => member.role === "dm")?.id ??
    null
  );
}
/** The hand-off command of one member row of the presence list, for this viewer. */
function handoverControl(ctx, state, member) {
  const owner = campaignOwner(state);
  const runner = sessionRunner(state);
  if (runner === member.id) {
    const badge = `<span class="badge session-view-runner">${ctx.t("DM per la sessione", "DM for the session")}</span>`;
    if (ctx.role === owner)
      return `${badge}<button type="button" class="button quiet session-view-handover" data-sv-handover-end aria-label="${ctx.esc(ctx.t(`Riprendi il ruolo di DM da ${member.label}`, `Take the DM role back from ${member.label}`))}">${ctx.t("Riprendi il ruolo di DM", "Take the DM role back")}</button>`;
    if (ctx.role === member.id)
      return `${badge}<button type="button" class="button quiet session-view-handover" data-sv-handover-end>${ctx.t("Restituisci il ruolo di DM", "Give the DM role back")}</button>`;
    return badge;
  }
  if (
    ctx.role !== owner ||
    member.id === owner ||
    runner ||
    !["player", "co-dm"].includes(member.role === "dm" ? "co-dm" : member.role)
  )
    return "";
  return `<button type="button" class="button quiet session-view-handover" data-sv-handover="${ctx.esc(member.id)}" aria-label="${ctx.esc(ctx.t(`Cedi il ruolo di DM a ${member.label}…`, `Hand over the DM role to ${member.label}…`))}">${ctx.t("Cedi il ruolo di DM…", "Hand over the DM role…")}</button>`;
}
/** Opens campaign-members' hand-off dialog with `memberId` chosen (loaded on demand). */
export function handOverFromTable(ctx, memberId) {
  const id = ctx.state.campaign?.id;
  return import("./campaign-members.mjs")
    .then((module) => module.handleAction(ctx, "handover", { id, target: memberId }))
    .catch((error) =>
      ctx.toast(
        error?.it ? ctx.label({ it: error.it, en: error.en }) : String(error?.message ?? error),
        true,
      ),
    );
}
export function endHandOverFromTable(ctx) {
  const id = ctx.state.campaign?.id;
  return import("./campaign-members.mjs")
    .then((module) => module.handleAction(ctx, "handover-end", { id }))
    .catch((error) =>
      ctx.toast(
        error?.it ? ctx.label({ it: error.it, en: error.en }) : String(error?.message ?? error),
        true,
      ),
    );
}
function bindHandover(root, ctx) {
  root
    ?.querySelectorAll?.("[data-sv-handover]")
    .forEach(
      (button) => (button.onclick = () => handOverFromTable(ctx, button.dataset.svHandover)),
    );
  root
    ?.querySelectorAll?.("[data-sv-handover-end]")
    .forEach((button) => (button.onclick = () => endHandOverFromTable(ctx)));
}

// DDB Connected Players: each person with their characters and where they are. While the
// scene is hidden (`places: false`) no location is shown at all.
function presenceRows(ctx, state, { interactive = false, places: showPlaces = true } = {}) {
  const slice = readSession(state);
  const ribbons = partyRibbons(state).ribbons;
  const party = partyScene(state);
  return partyMembers(state)
    .map((member) => {
      const presence = presenceOf(slice, member.id);
      const places = member.characters.map((id) => {
        const place = locationOf(state, id);
        const ribbon = ribbons.find((row) => row.sceneId === place);
        const seen = ctx.role === "dm" || member.id === ctx.role;
        const where =
          place === party
            ? ctx.t("con il gruppo", "with the party")
            : seen
              ? (ribbon?.name ?? "")
              : ctx.t("in un’altra scena", "in another scene");
        const actor = state.actors[id];
        const name =
          interactive && canViewActor(actor, ctx.role, state)
            ? `<button type="button" class="text-button" data-sv-sheet="${ctx.esc(id)}">${ctx.esc(actor.name)}</button>`
            : ctx.esc(actor.name);
        return showPlaces ? `${name} <small>· ${ctx.esc(where)}</small>` : name;
      });
      const handover = interactive ? handoverControl(ctx, state, member) : "";
      return `<li class="session-view-member" data-sv-member="${ctx.esc(member.id)}"><span class="session-view-dot is-${presence.status}" aria-hidden="true"></span><span><strong>${ctx.esc(member.label)}${member.id === ctx.role ? ` <small>(${ctx.t("tu", "you")})</small>` : ""}</strong><span class="session-view-status">${presence.status === "away" ? ctx.t("Assente", "Away") : ctx.t("Presente", "Here")}${presence.message ? ` — ${ctx.esc(presence.message)}` : ""}</span>${places.length ? `<span class="session-view-places">${places.join(" · ")}</span>` : ""}</span>${handover ? `<span class="session-view-member-actions">${handover}</span>` : ""}</li>`;
    })
    .join("");
}

function presenceForm(ctx, memberId) {
  const current = presenceOf(readSession(ctx.state), memberId);
  // The message belongs to an absence: "Here" starts empty and choosing it clears it.
  const message = current.status === "away" ? current.message : "";
  return `<fieldset class="session-view-presence-form"><legend>${ctx.t("Stato", "Status")}</legend><label class="check-field"><input type="radio" name="status" value="here" ${current.status === "here" ? "checked" : ""}> ${ctx.t("Presente", "Here")}</label><label class="check-field"><input type="radio" name="status" value="away" ${current.status === "away" ? "checked" : ""}> ${ctx.t("Assente", "Away")}</label><label class="field">${ctx.t("Messaggio per il gruppo (facoltativo)", "Message for the party (optional)")}<input name="message" maxlength="80" value="${ctx.esc(message)}" placeholder="${ctx.t("es. torno subito", "e.g. back soon")}"></label></fieldset>`;
}

/** The DDB "i" menu: who is here, with which character, and your own status. */
export function openPresence(ctx, { memberId = ctx.role, onBehalf = false } = {}) {
  const state = ctx.state;
  const own = campaignMembers(state).some((member) => member.id === memberId);
  ctx.dialog(
    onBehalf
      ? ctx.t(`Stato di ${memberName(state, memberId)}`, `${memberName(state, memberId)}’s status`)
      : ctx.t("Il gruppo", "The party"),
    `<ul class="session-view-members">${presenceRows(ctx, state, { interactive: !onBehalf })}</ul><p class="muted">${ctx.t("Lo stato lo imposta ogni partecipante; in questa dimostrazione tutti condividono questo browser.", "Each participant sets their own status; in this demonstration everyone shares this browser.")}</p>${own ? presenceForm(ctx, memberId) : ""}`,
    own
      ? {
          submitLabel: onBehalf
            ? ctx.t(
                `Aggiorna per ${memberName(state, memberId)}`,
                `Update for ${memberName(state, memberId)}`,
              )
            : ctx.t("Aggiorna il mio stato", "Update my status"),
          cancelLabel: ctx.t("Chiudi", "Close"),
          // A refusal ({it, en}, or the offline refusal) stays in the dialog as its error.
          onSubmit: (data) => {
            actions.presence(
              ctx,
              memberId,
              { status: data.get("status"), message: String(data.get("message") ?? "") },
              { onBehalf },
            );
          },
        }
      : { cancelLabel: ctx.t("Chiudi", "Close") },
  );
  const dialog = globalThis.document?.querySelector?.("#dialog");
  dialog
    ?.querySelectorAll("[data-sv-sheet]")
    .forEach((button) => (button.onclick = () => ctx.openSheet(button.dataset.svSheet)));
  bindHandover(dialog, ctx);
  const message = dialog?.querySelector(".session-view-presence-form input[name=message]");
  dialog
    ?.querySelector(".session-view-presence-form input[name=status][value=here]")
    ?.addEventListener("change", (event) => {
      if (event.target.checked && message) message.value = "";
    });
}

// Other areas' shared map layers (drawings, templates, auras, pings, pins, markers, health
// words...) drawn for a projection, read only. They are listed as for players and drawn
// with an identity that has no private content ("spectator"): the shared screen and the
// DM's "view as" show what everyone at the table sees, never a player's "Only me" items.
function projectionLayers(ctx, state, scene, viewer, above) {
  const reg = ctx.registry;
  if (!reg?.list) return "";
  const view = { scene, selectedActorId: null, mode: "view", zoom: 1, pan: { x: 0, y: 0 } };
  const listCtx = Object.create(ctx, { role: { value: "player" }, state: { value: state } });
  const drawCtx = Object.create(ctx, {
    role: { value: "spectator" },
    state: { value: state },
    canControl: {
      value: (actor) => viewer !== "spectator" && canControlActor(actor, viewer, state),
    },
  });
  let layers = [];
  try {
    layers = reg.list("map-layer", listCtx, view);
  } catch {
    return "";
  }
  return layers
    .filter((c) => c.id !== "session-view-hud" && Number(c.order) >= 60 === above)
    .map((c) => {
      try {
        const html = c.svg(drawCtx, view);
        return typeof html === "string" && html
          ? `<g class="session-view-layer" data-sv-layer="${ctx.esc(c.id)}" pointer-events="none">${html}</g>`
          : "";
      } catch {
        return ""; // a failing layer stays out of the projection; the Table reports it
      }
    })
    .join("");
}

// Map projection used by the spectator display, the breakout view and "view as". It is a
// read-only drawing of permitted data: no DM notes, no hidden or private tokens. With
// `behalf` it lets a player (breakout) or the DM for a player ("view as") move own tokens.
function projectionSVG(
  ctx,
  state,
  scene,
  viewer,
  { behalf = null, sized = null, box = null } = {},
) {
  if (!scene) return "";
  const grid = Math.max(10, Number(scene.gridSize) || 50);
  const tokens = visibleTokens(state, scene, viewer);
  // Same hostility rule as the core Table (table.mjs), so both draw a creature alike.
  const hostile = (actor) =>
    (actor.combatProfile?.team ??
      (["goblin-1", "goblin-2"].includes(actor.id) ? "watch" : null)) === "watch";
  const size = sized ? `width="${sized.width}" height="${sized.height}"` : "";
  const path =
    behalf?.preview && behalf.preview.start
      ? `<path d="M${behalf.preview.start.x} ${behalf.preview.start.y} L${behalf.preview.end.x} ${behalf.preview.end.y}" class="session-view-path ${behalf.preview.blocked ? "is-blocked" : ""}"/><circle cx="${behalf.preview.end.x}" cy="${behalf.preview.end.y}" r="12" class="session-view-target"/>`
      : "";
  const label = !behalf
    ? ctx.t("Mappa della scena", "Scene map")
    : behalf.forMember
      ? ctx.t(
          "Mappa vista dal giocatore. Tocca o usa le frecce per scegliere la destinazione, Invio per confermare, Esc per annullare.",
          "Map as the player sees it. Tap or use the arrow keys to choose the destination, Enter confirms, Escape cancels.",
        )
      : ctx.t(
          "Mappa della tua scena. Scegli una tua pedina, poi tocca o usa le frecce per la destinazione, Invio per confermare, Esc per annullare.",
          "Map of your scene. Pick one of your tokens, then tap or use the arrow keys for the destination, Enter confirms, Escape cancels.",
        );
  const attrs = behalf
    ? `tabindex="0" data-sv-behalf-map data-sv-touch-scale data-sv-scene-id="${ctx.esc(scene.id)}" data-sv-move-mode="${behalf.mode}" data-sv-for="${ctx.esc(behalf.forMember ?? "")}"`
    : sized
      ? ""
      : "data-sv-touch-scale";
  const viewBox = box
    ? `${box.x} ${box.y} ${box.w} ${box.h}`
    : `0 0 ${scene.width} ${scene.height}`;
  return `<svg class="session-view-map" viewBox="${viewBox}" ${size} role="${behalf ? "application" : "img"}" ${attrs} aria-label="${ctx.esc(label)}">
  <defs><pattern id="sv-grid-${ctx.esc(scene.id)}" x="${scene.gridOffsetX || 0}" y="${scene.gridOffsetY || 0}" width="${grid}" height="${grid}" patternUnits="userSpaceOnUse"><path d="M ${grid} 0 H0 V${grid}" fill="none" stroke="#d9c79c" stroke-opacity=".28" stroke-width="1.2"/></pattern></defs>
  ${renderSceneBase(scene, ctx)}${scene.gridVisible !== false ? `<rect width="${scene.width}" height="${scene.height}" fill="url(#sv-grid-${ctx.esc(scene.id)})"/>` : ""}<g pointer-events="none">${renderSpatialOverlay(scene, ctx, { players: true })}</g>${projectionLayers(ctx, state, scene, viewer, false)}${path}
  <g>${tokens
    .map((token) => {
      const actor = state.actors[token.actorId];
      const mine = behalf && behalf.actorIds.includes(actor.id);
      const picked = behalf?.actorId === actor.id;
      return `<g class="session-view-token ${hostile(actor) ? "is-hostile" : ""} ${picked ? "is-picked" : ""}" data-sv-token="${ctx.esc(actor.id)}" transform="translate(${token.x},${token.y})" ${mine ? `data-sv-behalf-actor="${ctx.esc(actor.id)}" role="button" tabindex="0" aria-pressed="${picked}" aria-label="${ctx.esc(actor.name)}"` : ""}><g class="token-display"><circle r="23"/><text y="7" text-anchor="middle">${ctx.esc(actor.name[0] ?? "?")}</text><text class="session-view-token-name" y="44" text-anchor="middle">${ctx.esc(actor.name)}</text>${behalf && mine && Number.isFinite(actor.hp) && actor.maxHp ? `<rect x="-22" y="29" width="44" height="4" rx="2" fill="#111b25"/><rect x="-22" y="29" width="${(44 * Math.max(0, actor.hp)) / actor.maxHp}" height="4" rx="2" fill="#8fb48a"/>` : ""}</g></g>`;
    })
    .join("")}</g>${projectionLayers(ctx, state, scene, viewer, true)}</svg>`;
}

function pausedMarkup(ctx, slice, viewer) {
  if (!slice.pause.active) return "";
  const runner = viewer === "dm" || (viewer !== "spectator" && runsSession(ctx.state, viewer));
  const tip =
    runner || viewer === "spectator"
      ? ""
      : `<p class="session-view-pause-tip" aria-live="polite"><strong>${ctx.t("Nell’attesa", "While you wait")}</strong> <span data-sv-tip-text>${ctx.esc(pauseTip(ctx))}</span> ${btn(ctx, "tip", ctx.t("Altro consiglio", "Another tip"), { cls: "quiet" })}</p>`;
  return `<div class="session-view-paused" role="status"><strong>${ctx.t("In pausa", "Paused")}</strong>${slice.pause.message ? `<span>${ctx.esc(slice.pause.message)}</span>` : ""}${runner ? `<small>${ctx.t("I giocatori non possono muovere pedine né usare porte.", "Players cannot move tokens or use doors.")}</small>` : `<small>${ctx.t("Il DM ha fermato il gioco: le pedine restano ferme.", "The DM has paused the game: tokens stay still.")}</small>`}${tip}</div>`;
}

function waitingMarkup(ctx, state, gate, { viewer, controls = false } = {}) {
  const slice = readSession(state);
  const headline = {
    "not-started": L(
      "Il DM non ha ancora avviato la sessione",
      "The DM has not started the session yet",
    ),
    preparing: L("Il DM sta preparando la scena", "The DM is preparing the scene"),
    ended: L(
      "La sessione è terminata. Grazie per aver giocato!",
      "The session has ended. Thanks for playing!",
    ),
  }[gate.reason];
  const tip = TIPS[ui.tip % TIPS.length];
  const clock = pinnedClockFor(slice, viewer);
  const timer = timerView(slice, viewer, Date.now());
  const own = viewer !== "spectator" && campaignMembers(state).some((m) => m.id === viewer);
  const sheet = own ? partyMembers(state).find((m) => m.id === viewer)?.characters[0] : null;
  return `<div class="session-view-wait" data-sv-wait="${gate.reason}"><div class="session-view-wait-card"><p class="session-view-kicker">${ctx.esc(state.campaign?.name ?? "")}</p><h1 role="status">${ctx.esc(ctx.label(headline))}</h1>${gate.message ? `<p class="session-view-wait-message">${ctx.esc(gate.message)}</p>` : ""}${timer || clock ? `<div class="session-view-wait-widgets">${timerMarkup(ctx, timer)}${clockCard(ctx, clock, { closable: controls && own })}</div>` : ""}<div class="session-view-tip" aria-live="polite"><strong>${ctx.t("Consiglio", "Tip")}</strong><p data-sv-tip-text>${ctx.esc(ctx.label(tip))}</p>${controls ? btn(ctx, "tip", ctx.t("Altro consiglio", "Another tip"), { cls: "quiet" }) : ""}</div>${controls && own ? `<section class="session-view-wait-party"><h2>${ctx.t("Il gruppo", "The party")}</h2><ul class="session-view-members">${presenceRows(ctx, state, { places: false })}</ul><div class="toolbar">${btn(ctx, "group", ctx.t("Aggiorna il tuo stato", "Update your status"))}${sheet && ctx.role !== "dm" ? `<button type="button" class="button quiet" data-sv-sheet="${ctx.esc(sheet)}">${ctx.t("Apri la tua scheda", "Open your sheet")}</button><button type="button" class="button quiet" data-sv="notes">${ctx.t("Appunti personali", "Personal notes")}</button>` : ""}</div></section>` : ""}</div></div>`;
}

// ---------------------------------------------------------------------------------------
// Table cover: player waiting screen / breakout, DM "view as"
// ---------------------------------------------------------------------------------------

function coverKind(ctx) {
  if (ctx.role === "dm") return ui.viewAs ? "view-as" : null;
  if (runsSession(ctx.state, ctx.role)) return null;
  const view = presentationFor(ctx.state, ctx.role);
  return view.kind === "table" ? null : view.kind;
}

/**
 * A player whose characters are all on another scene (Roll20: each ribbon on its own
 * page). The player moves their own tokens there with the Table's geometry, opens the
 * sheet (checks and saves with physical or digital dice) and sets their status; the DM
 * runs the scene at the Table. `onBehalf` is the DM's "view as" of that player.
 */
function breakoutMarkup(ctx, state, view, viewer, { onBehalf = null } = {}) {
  const scene = state.scenes.find((entry) => entry.id === view.sceneId);
  const slice = readSession(state);
  const names = view.actorIds
    .map((id) => state.actors[id]?.name)
    .filter(Boolean)
    .join(", ");
  const movable = view.actorIds.filter((id) => hasToken(state, view.sceneId, id));
  if (ui.behalf && (!movable.includes(ui.behalf.actorId) || ui.behalf.sceneId !== view.sceneId))
    ui.behalf = null;
  const behalf = {
    actorIds: movable,
    actorId: ui.behalf?.actorId ?? null,
    preview: ui.behalf?.preview ?? null,
    mode: "scene",
    forMember: onBehalf,
  };
  const intro = view.party
    ? ctx.t(
        `${names}: il DM sta guidando un’altra parte del gruppo al Tavolo. Intanto potete muovervi in questa scena e usare la scheda.`,
        `${names}: the DM is running another part of the party at the Table. Meanwhile you can move in this scene and use your sheet.`,
      )
    : ctx.t(
        `${names}: siete in una scena separata dal resto del gruppo. Potete muovervi qui; il DM guida questa parte e vi riunirà al gruppo.`,
        `${names}: you are in a scene apart from the rest of the party. You can move here; the DM runs this part and will bring you back.`,
      );
  const timer = timerView(slice, viewer, Date.now());
  const clock = pinnedClockFor(slice, viewer);
  const who = onBehalf ? memberName(state, onBehalf) : null;
  const tools = onBehalf
    ? `<h3>${ctx.t("Stato del giocatore", "Player status")}</h3><ul class="session-view-members">${presenceRows(ctx, state)}</ul>${btn(ctx, "behalf-presence", ctx.t(`Cambia lo stato di ${who}`, `Change ${who}’s status`))}`
    : `<h3>${ctx.t("Scheda, tiri e gruppo", "Sheet, rolls and party")}</h3><div class="toolbar">${view.actorIds
        .map(
          (id) =>
            `<button type="button" class="button" data-sv-sheet="${ctx.esc(id)}">${ctx.icon("book")} ${ctx.esc(`${ctx.t("Scheda e tiri", "Sheet and rolls")}: ${state.actors[id]?.name ?? ""}`)}</button>`,
        )
        .join(
          "",
        )}${btn(ctx, "group", `${ctx.icon("person")} ${ctx.t("Il gruppo e il tuo stato", "Party and your status")}`)}${btn(ctx, "notes", ctx.t("Appunti personali", "Personal notes"), { cls: "quiet" })}</div>`;
  return `<div class="session-view-breakout" data-sv-breakout="${ctx.esc(view.sceneId)}"><header><p class="session-view-kicker">${ctx.t("Gruppo diviso", "Party split")}</p><h1>${ctx.esc(scene?.name ?? "")}</h1><p>${ctx.esc(intro)}</p></header><div class="session-view-as-table"><div class="session-view-stage">${projectionSVG(ctx, state, scene, viewer, { behalf })}${pausedMarkup(ctx, slice, viewer)}${timer || clock ? `<div class="session-view-overlay">${timerMarkup(ctx, timer)}${clockCard(ctx, clock, { closable: !onBehalf })}</div>` : ""}</div><aside class="session-view-behalf">${moverPanel(ctx, state, behalf, who)}${tools}</aside></div></div>`;
}

/** Token picker, route status and Confirm/Cancel shared by breakout and "view as". */
function moverPanel(ctx, state, behalf, who) {
  const picked = behalf.actorId ? state.actors[behalf.actorId] : null;
  const preview = behalf.preview;
  const status = picked
    ? preview
      ? `${ctx.esc(picked.name)} · ${ctx.t("Distanza", "Distance")} ${formatNumber(ctx.lang, preview.distance)} m${preview.blocked ? ` · ${ctx.t("percorso bloccato: scegli un’altra destinazione.", "path blocked: choose another destination.")}` : ""}`
      : ctx.esc(
          ctx.t(
            `${picked.name}: scegli la destinazione.`,
            `${picked.name}: choose the destination.`,
          ),
        )
    : ctx.t(
        "Nessuna pedina scelta: scegline una qui sopra, poi la destinazione.",
        "No token chosen: pick one above, then the destination.",
      );
  return `<h2>${ctx.esc(who ? ctx.t(`Agisci per ${who}`, `Act for ${who}`) : ctx.t("Le tue pedine", "Your tokens"))}</h2><p class="muted">${
    who
      ? ctx.t(
          "Scegli una pedina del giocatore, poi tocca la mappa o usa le frecce per la destinazione.",
          "Pick one of the player’s tokens, then tap the map or use the arrow keys for the destination.",
        )
      : ctx.t(
          "Scegli una tua pedina, poi tocca la mappa o usa le frecce per la destinazione.",
          "Pick one of your tokens, then tap the map or use the arrow keys for the destination.",
        )
  }</p><div class="toolbar">${
    behalf.actorIds
      .map(
        (id) =>
          `<button type="button" class="button ${behalf.actorId === id ? "primary" : ""}" data-sv-behalf-pick="${ctx.esc(id)}" aria-pressed="${behalf.actorId === id}">${ctx.esc(state.actors[id].name)}</button>`,
      )
      .join("") ||
    `<p class="muted">${who ? ctx.t("Nessuna pedina del giocatore su questa scena.", "No token of this player on this scene.") : ctx.t("Nessuna tua pedina su questa scena: il DM può aggiungerla.", "None of your tokens is on this scene: the DM can add it.")}</p>`
  }</div><p class="session-view-behalf-status" role="status" id="sv-behalf-why">${status}</p><div class="toolbar">${btn(ctx, "behalf-confirm", who ? ctx.t(`Conferma movimento per ${who}`, `Confirm movement for ${who}`) : ctx.t("Conferma movimento", "Confirm movement"), { cls: "primary", attrs: preview && !preview.blocked ? "" : 'disabled aria-describedby="sv-behalf-why"' })}${btn(ctx, "behalf-cancel", ctx.t("Annulla", "Cancel"), { cls: "quiet", attrs: preview ? "" : 'disabled aria-describedby="sv-behalf-why"' })}</div>`;
}

function viewAsMarkup(ctx) {
  const state = ctx.state;
  const memberId = ui.viewAs;
  const name = memberName(state, memberId);
  const view = presentationFor(state, memberId);
  const slice = readSession(state);
  let body;
  if (view.kind === "waiting") body = waitingMarkup(ctx, state, view, { viewer: memberId });
  else if (view.kind === "breakout")
    body = breakoutMarkup(ctx, state, view, memberId, { onBehalf: memberId });
  else {
    const scene = activeScene(state);
    const actorIds = visibleTokens(state, scene, memberId)
      .map((token) => token.actorId)
      .filter((id) => canControlActor(state.actors[id], memberId, state));
    if (ui.behalf && (!actorIds.includes(ui.behalf.actorId) || ui.behalf.sceneId !== scene?.id))
      ui.behalf = null;
    const behalf = {
      actorIds,
      actorId: ui.behalf?.actorId ?? null,
      preview: ui.behalf?.preview ?? null,
      mode: "table",
      forMember: memberId,
    };
    const timer = timerView(slice, memberId, Date.now());
    const clock = pinnedClockFor(slice, memberId);
    body = `<div class="session-view-as-table"><div class="session-view-stage">${projectionSVG(ctx, state, scene, memberId, { behalf })}${pausedMarkup(ctx, slice, memberId)}${timer || clock ? `<div class="session-view-overlay">${timerMarkup(ctx, timer)}${clockCard(ctx, clock)}</div>` : ""}</div><aside class="session-view-behalf">${moverPanel(ctx, state, behalf, name)}<h3>${ctx.t("Stato del giocatore", "Player status")}</h3><ul class="session-view-members">${presenceRows(ctx, state)}</ul>${btn(ctx, "behalf-presence", ctx.t(`Cambia lo stato di ${name}`, `Change ${name}’s status`))}</aside></div>`;
  }
  return `<div class="session-view-as"><div class="session-view-banner" role="region" aria-label="${ctx.esc(ctx.t(`Vista come ${name}`, `Viewing as ${name}`))}"><span>${ctx.icon("eye")}<strong>${ctx.esc(ctx.t(`Stai vedendo il Tavolo come ${name}`, `You are viewing the Table as ${name}`))}</strong><small>${ctx.t("Quello che fai qui entra nel registro come «DM per", "What you do here is logged as “DM for")} ${ctx.esc(name)}${ctx.t("». Note e schede private del giocatore restano private.", "”. The player’s private notes and sheets stay private.")}</small></span>${btn(ctx, "exit-view", ctx.t("Esci dalla vista", "Exit view"), { cls: "primary" })}</div>${body}</div>`;
}

function renderCover(ctx) {
  const kind = coverKind(ctx);
  if (kind === "view-as") return viewAsMarkup(ctx);
  const view = presentationFor(ctx.state, ctx.role);
  if (view.kind === "waiting")
    return waitingMarkup(ctx, ctx.state, view, { viewer: ctx.role, controls: true });
  if (view.kind === "breakout") return breakoutMarkup(ctx, ctx.state, view, ctx.role);
  return "";
}

let coverObserver = null;
/** The core Table's touch sizing (table.mjs): on a phone a token keeps its screen size. */
function scaleTouchTokens(root) {
  coverObserver?.disconnect();
  coverObserver = null;
  const maps = [...root.querySelectorAll("svg[data-sv-touch-scale]")];
  if (!maps.length || typeof ResizeObserver === "undefined") return;
  const size = () =>
    maps.forEach((svg) => {
      if (!svg.isConnected) return;
      const scale = svg.getScreenCTM()?.a || 1;
      const factor = matchMedia("(max-width: 720px)").matches ? Math.max(1, 1 / scale) : 1;
      svg
        .querySelectorAll(".token-display")
        .forEach((node) => node.setAttribute("transform", `scale(${factor})`));
    });
  size();
  coverObserver = new ResizeObserver(size);
  maps.forEach((svg) => coverObserver.observe(svg));
}
/** Area layers in a projection are pictures: no focus stop, no control. */
function inertLayers(root) {
  root.querySelectorAll(".session-view-layer").forEach((layer) => {
    layer.querySelectorAll("[tabindex],a,button,input,select,textarea").forEach((node) => {
      node.setAttribute("tabindex", "-1");
      if ("disabled" in node) node.disabled = true;
    });
    layer.querySelectorAll("foreignObject > *").forEach((node) => (node.inert = true));
  });
}

function bindCover(el, ctx) {
  ensureWatchers(ctx);
  bindCommon(el, ctx);
  inertLayers(el);
  scaleTouchTokens(el);
  const map = el.querySelector("[data-sv-behalf-map]");
  const focusMap = () =>
    document.querySelector("[data-sv-behalf-map]")?.focus({ preventScroll: true });
  const pick = (actorId) => {
    ui.behalf = {
      actorId,
      preview: null,
      point: null,
      sceneId: map?.dataset.svSceneId ?? null,
      mode: map?.dataset.svMoveMode ?? "table",
      forMember: map?.dataset.svFor || null,
    };
    ctx.render();
    focusMap();
  };
  el.querySelectorAll("[data-sv-behalf-pick]").forEach(
    (button) => (button.onclick = () => pick(button.dataset.svBehalfPick)),
  );
  if (!map) return;
  const scene = ctx.state.scenes.find((entry) => entry.id === map.dataset.svSceneId);
  const toScene = (event) => {
    const p = map.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    return p.matrixTransform(map.getScreenCTM().inverse());
  };
  const preview = (point) => {
    if (!ui.behalf?.actorId) {
      ctx.toast(
        map.dataset.svFor
          ? ctx.t(
              "Scegli prima una pedina del giocatore.",
              "Pick one of the player’s tokens first.",
            )
          : ctx.t("Scegli prima una tua pedina.", "Pick one of your tokens first."),
        true,
      );
      return;
    }
    try {
      const result =
        ui.behalf.mode === "table"
          ? previewMovement(ctx.state, ui.behalf.actorId, point, { role: "dm" })
          : previewSceneMove(ctx.state, ctx.role, ui.behalf.actorId, point, {
              onBehalf: ui.behalf.forMember,
            });
      ui.behalf = { ...ui.behalf, point: { x: point.x, y: point.y }, preview: result };
    } catch (error) {
      ctx.toast(ctx.label(error.it ? error : error.message), true);
    }
    ctx.render();
    focusMap();
  };
  map.addEventListener("click", (event) => {
    const token = event.target.closest("[data-sv-behalf-actor]");
    if (token) return pick(token.dataset.svBehalfActor);
    preview(toScene(event));
  });
  map.addEventListener("keydown", (event) => {
    const token = event.target.closest("[data-sv-behalf-actor]");
    if (token && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      pick(token.dataset.svBehalfActor);
      return;
    }
    const step = Number(scene?.gridSize) || 50;
    const moves = {
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
    };
    if (moves[event.key] && ui.behalf?.actorId && scene) {
      event.preventDefault();
      const start =
        ui.behalf.point ?? scene.tokens.find((entry) => entry.actorId === ui.behalf.actorId);
      if (start) preview({ x: start.x + moves[event.key][0], y: start.y + moves[event.key][1] });
    } else if (event.key === "Enter" && ui.behalf?.preview) {
      event.preventDefault();
      confirmBehalf(ctx);
    } else if (event.key === "Escape" && ui.behalf?.preview) {
      event.preventDefault();
      event.stopPropagation();
      ui.behalf = { ...ui.behalf, preview: null, point: null };
      ctx.render();
      focusMap();
    }
  });
}
function confirmBehalf(ctx) {
  const pending = ui.behalf;
  if (!pending?.point) return;
  const ok = attempt(ctx, () =>
    pending.mode === "table"
      ? actions.moveOnBehalf(ctx, ui.viewAs, pending.actorId, pending.point)
      : actions.moveInScene(ctx, pending.actorId, pending.point, {
          onBehalf: pending.forMember,
        }),
  );
  if (ok) {
    ui.behalf = { ...pending, preview: null, point: null };
    ctx.render();
    document.querySelector("[data-sv-behalf-map]")?.focus({ preventScroll: true });
  }
}

// ---------------------------------------------------------------------------------------
// Map HUD layer: group, pause, timer, pinned clock, hide UI; pause lock and arrival
// ---------------------------------------------------------------------------------------

let hudObserver = null;
let lockAbort = null;
// The countdown's touch long press (see bindControls).
const timerPress = { active: null, timer: 0, swallowUntil: 0 };

function renderHud(ctx, view) {
  const state = ctx.state;
  const slice = readSession(state);
  const dm = runsSession(state, ctx.role);
  const scene = view?.scene;
  const width = scene ? scene.width / (view.zoom || 1) : 1000;
  const height = scene ? scene.height / (view.zoom || 1) : 650;
  const fo = (inner, cls = "") =>
    `<foreignObject class="session-view-hud-fo" x="${view?.pan?.x ?? 0}" y="${view?.pan?.y ?? 0}" width="${width}" height="${height}" pointer-events="none"><div xmlns="http://www.w3.org/1999/xhtml" class="session-view-hud ${cls}">${inner}</div></foreignObject>`;
  // P10 CA-66: Stop stays on screen even with the interface hidden (Alchemy X-Card).
  const safety = safetyHud(ctx);
  if (ui.clean)
    return fo(
      `<div class="session-view-hud-bar"><button type="button" class="session-view-hud-button" data-sv="clean" aria-label="${ctx.t("Mostra interfaccia (Ctrl+Maiusc+H)", "Show interface (Ctrl+Shift+H)")}" title="Ctrl+Maiusc+H">${ctx.icon("eye")}<span>${ctx.t("Mostra interfaccia", "Show interface")}</span></button>${safety}</div>${pausedMarkup(ctx, slice, ctx.role)}`,
      "session-view-clean",
    );
  const members = partyMembers(state);
  const away = members.filter((member) => presenceOf(slice, member.id).status === "away");
  const dots = members
    .map(
      (member) =>
        `<span class="session-view-dot is-${presenceOf(slice, member.id).status}"></span>`,
    )
    .join("");
  // Every HUD button keeps its name on a phone, where only the icon is shown (title too).
  const hudButton = (attrs, glyph, text, cls = "") =>
    `<button type="button" class="session-view-hud-button ${cls}" ${attrs} aria-label="${ctx.esc(text)}" title="${ctx.esc(text)}">${glyph}<span>${ctx.esc(text)}</span></button>`;
  const partyName =
    ctx.t("Gruppo", "Party") +
    (away.length
      ? ` · ${away.length} ${away.length === 1 ? ctx.t("assente", "away") : ctx.t("assenti", "away")}`
      : "");
  const groupButton = `<button type="button" class="session-view-hud-button" data-sv="group" aria-label="${ctx.esc(partyName)}" title="${ctx.esc(partyName)}">${ctx.icon("person")}<span>${ctx.t("Gruppo", "Party")}</span><span class="session-view-dots" aria-hidden="true">${dots}</span></button>`;
  // Visual pass 2 (Owlbear keeps one row of controls over the map): the DM's session
  // commands — the Session panel, Pause, Hide scene, the countdown, the progress clocks and
  // the party — sit in one «Sessione» menu; the row keeps the safety signals and Hide
  // interface. The menu stays open while its switches (Pause, Hide scene) are pressed, like
  // Owlbear's room menu, and closes on a panel, the party dialog, Escape or a press outside.
  const menuState = dm
    ? [
        slice.pause.active ? ctx.t("in pausa", "paused") : "",
        slice.gate.hidden ? ctx.t("scena nascosta", "scene hidden") : "",
        away.length
          ? `${away.length} ${away.length === 1 ? ctx.t("assente", "away") : ctx.t("assenti", "away")}`
          : "",
      ].filter(Boolean)
    : [];
  const menuName = `${ctx.t("Sessione", "Session")}${menuState.length ? ` · ${menuState.join(", ")}` : ""}`;
  const menuLabel = `${menuName} · ${ctx.t("comandi della sessione", "session commands")}`;
  const menu = dm
    ? `<span class="session-view-menu-wrap"><button type="button" class="session-view-hud-button session-view-menu-button${menuState.length ? " is-on" : ""}" data-session-menu aria-expanded="${ui.menu}" aria-controls="session-view-menu" aria-label="${ctx.esc(menuLabel)}" title="${ctx.esc(menuLabel)}">${ctx.icon("clock")}<span>${ctx.esc(menuName)}</span>${MENU_CARET}</button><div class="session-view-menu" id="session-view-menu" role="group" aria-label="${ctx.esc(ctx.t("Comandi della sessione", "Session commands"))}"${ui.menu ? "" : " hidden"}>${
        hudButton(
          'data-table-drawer="session-view-controls" aria-controls="table-drawer"',
          ctx.icon("clock"),
          ctx.t("Sessione", "Session"),
        ) +
        hudButton(
          `data-sv="${slice.pause.active ? "resume" : "pause"}" aria-pressed="${slice.pause.active}"`,
          slice.pause.active ? ctx.icon("play") : PAUSE_ICON,
          slice.pause.active ? ctx.t("Riprendi il gioco", "Resume game") : ctx.t("Pausa", "Pause"),
          slice.pause.active ? "is-on" : "",
        ) +
        hudButton(
          `data-sv="${slice.gate.hidden ? "show" : "hide"}" aria-pressed="${slice.gate.hidden}"`,
          ctx.icon("eye"),
          slice.gate.hidden
            ? ctx.t("Mostra scena", "Show scene")
            : ctx.t("Nascondi scena", "Hide scene"),
          slice.gate.hidden ? "is-on" : "",
        ) +
        // P10 TV-130/131 (Owlbear Ticker and Count! on the toolbar): one tap to the countdown
        // and the progress clocks in the Session panel.
        hudButton(
          'data-table-drawer="session-view-controls" aria-controls="table-drawer" data-sv="focus-timer"',
          ctx.icon("clock"),
          ctx.t("Conto alla rovescia", "Countdown"),
        ) +
        hudButton(
          'data-table-drawer="session-view-controls" aria-controls="table-drawer" data-sv="focus-clocks"',
          CLOCK_ICON,
          ctx.t("Orologi di progresso", "Progress clocks"),
        ) +
        groupButton
      }</div></span>`
    : "";
  const bar = `<div class="session-view-hud-bar">${menu}${safety}${dm ? "" : groupButton}<button type="button" class="session-view-hud-button is-icon" data-sv="clean" aria-label="${ctx.t("Nascondi interfaccia (Ctrl+Maiusc+H)", "Hide interface (Ctrl+Shift+H)")}" title="${ctx.t("Nascondi interfaccia (Ctrl+Maiusc+H)", "Hide interface (Ctrl+Shift+H)")}">${ctx.icon("map")}</button></div>`;
  const chips = [];
  if (dm && slice.gate.hidden)
    chips.push(
      `<p class="session-view-chip is-warn" data-sv-chip="hidden">${ctx.t("Scena nascosta ai giocatori: vedono il messaggio d’attesa", "Scene hidden from players: they see the waiting message")}</p>`,
    );
  const live = currentSession(slice);
  if (dm && !live && lastSession(slice)?.status === "ended")
    chips.push(`<p class="session-view-chip">${ctx.t("Sessione conclusa", "Session ended")}</p>`);
  // P10 TV-115 (Roll20 party ribbons on top of the map): while the party is split every
  // group has its ribbon, the one at the Table marked, so players see where the others are.
  // A scene players have not been shown stays unnamed for them.
  const groups = partyRibbons(state).ribbons.filter((row) => row.actorIds.length);
  const ribbonBar =
    groups.length > 1
      ? `<div class="session-view-ribbon-bar" role="list" aria-label="${ctx.esc(ctx.t("Dove sono i gruppi", "Where the groups are"))}">${groups
          .map((ribbon) => {
            const names = ribbon.actorIds.map((id) => state.actors[id].name).join(", ");
            const own = ribbon.actorIds.some((id) =>
              canControlActor(state.actors[id], ctx.role, state),
            );
            const sceneRow = state.scenes.find((row) => row.id === ribbon.sceneId);
            const named = dm || own || ribbon.atTable || sceneRow?.revealed === true;
            const where = named ? ribbon.name : ctx.t("un’altra scena", "another scene");
            return `<p class="session-view-chip is-split ${ribbon.atTable ? "is-here" : ""} ${own ? "is-own" : ""}" role="listitem" data-sv-chip="split" data-sv-ribbon-scene="${ctx.esc(ribbon.sceneId)}"><strong>${ctx.esc(where)}</strong>${ribbon.main ? ` <small>· ${ctx.t("scena del gruppo", "party scene")}</small>` : ""}${ribbon.atTable ? ` <small>· ${ctx.t("al Tavolo", "at the Table")}</small>` : ""}${own ? ` <small>· ${ctx.t("tu", "you")}</small>` : ""}<span>${ctx.esc(names)}</span></p>`;
          })
          .join("")}</div>`
      : "";
  for (const member of away) {
    const presence = presenceOf(slice, member.id);
    chips.push(
      `<p class="session-view-chip is-away" data-sv-chip="away">${ctx.esc(`${member.label}: ${ctx.t("assente", "away")}${presence.message ? ` — ${presence.message}` : ""}`)}</p>`,
    );
  }
  const timer = timerView(slice, ctx.role, Date.now());
  const clock = pinnedClockFor(slice, ctx.role);
  // P10 TV-112 (Roll20 Player View, Alchemy "play as"): the DM plays for an absent player
  // with the whole Table (hotbar, rolls, sheet); the banner says so and ends it.
  const playing = ctx.role === "dm" && ui.playAs ? memberName(state, ui.playAs) : null;
  const playBanner = playing
    ? `<div class="session-view-play-as" role="status"><span>${ctx.icon("person")} <strong>${ctx.esc(ctx.t(`Giochi per ${playing}`, `Playing for ${playing}`))}</strong> <small>${ctx.t("barra delle azioni, tiri e scheda sono i suoi; il registro li attribuisce al personaggio", "action bar, rolls and sheet are theirs; the log names the character")}</small></span>${btn(ctx, "stop-play-as", ctx.t("Smetti", "Stop"), { cls: "quiet" })}</div>`
    : "";
  return fo(
    `${bar}${playBanner || ribbonBar ? `<div class="session-view-hud-left">${playBanner}${ribbonBar}</div>` : ""}<div class="session-view-hud-stack">${chips.join("")}${timerMarkup(ctx, timer)}${clockCard(ctx, clock, { closable: !dm })}</div>${pausedMarkup(ctx, slice, ctx.role)}`,
  );
}
const CLOCK_ICON =
  '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 12V3.5A8.5 8.5 0 0 1 20.5 12Z" fill="currentColor" opacity=".55"/></svg>';
/** Opens the Session panel part (countdown, clocks) and moves the focus into it. */
function focusSessionPart(id) {
  ui.scrollTo = id;
  const reveal = () => {
    const target = globalThis.document?.getElementById?.(id);
    if (!target) return false;
    ui.scrollTo = null;
    target.scrollIntoView?.({ block: "start", behavior: "smooth" });
    target
      .closest("section")
      ?.querySelector("button, input, select")
      ?.focus?.({ preventScroll: true });
    return true;
  };
  queueMicrotask(() => reveal() || setTimeout(reveal, 60));
}

function layoutHud(el, table) {
  const fo = el.querySelector("foreignObject");
  const svg = table.svg;
  if (!fo || !svg?.isConnected) return;
  const m = svg.getScreenCTM();
  const r = svg.getBoundingClientRect();
  if (!m || !r.width) return;
  const origin = new DOMPoint(r.left, r.top).matrixTransform(m.inverse());
  fo.setAttribute("x", "0");
  fo.setAttribute("y", "0");
  fo.setAttribute("width", String(r.width));
  fo.setAttribute("height", String(r.height));
  fo.setAttribute("transform", `translate(${origin.x} ${origin.y}) scale(${1 / m.a})`);
  const hud = fo.firstElementChild;
  if (hud) {
    hud.style.width = r.width + "px";
    hud.style.height = r.height + "px";
  }
}

// The DM's «Sessione» menu on the map (visual pass 2). Opening and closing only toggle the
// open state (no re-render); a re-render keeps it. A press outside the menu, Escape, or a
// command that opens a panel or the party dialog closes it; Pause and Hide scene keep it.
let menuAbort = null;
function bindSessionMenu(el) {
  menuAbort?.abort();
  menuAbort = null;
  const wrap = el.querySelector(".session-view-menu-wrap");
  const button = wrap?.querySelector("[data-session-menu]");
  const menu = wrap?.querySelector(".session-view-menu");
  if (!button || !menu) return;
  // Final review P1: the HUD lives in the map's SVG, a stacking context under the turn order,
  // so the open menu goes to the top layer (MUI's Popover portal in Owlbear Rodeo 2: room
  // menus above the whole HUD), placed under its button. Without popover support it stays
  // an absolute menu.
  const layered = typeof menu.showPopover === "function";
  if (layered) menu.setAttribute("popover", "manual");
  const place = () => {
    if (!layered || !ui.menu || !button.isConnected) return;
    const r = button.getBoundingClientRect();
    menu.style.top = `${Math.round(r.bottom + 6)}px`;
    menu.style.right = `${Math.max(8, Math.round(globalThis.innerWidth - r.right))}px`;
  };
  const set = (open, { focus = false } = {}) => {
    ui.menu = open;
    menu.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
    if (layered) {
      const shown = menu.matches(":popover-open");
      if (open && !shown) menu.showPopover();
      if (!open && shown) menu.hidePopover();
      place();
    }
    if (focus) button.focus({ preventScroll: true });
  };
  if (ui.menu) set(true);
  button.addEventListener("click", () => set(!ui.menu));
  wrap.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !ui.menu) return;
    event.preventDefault();
    event.stopPropagation();
    set(false, { focus: true });
  });
  menu
    .querySelectorAll('[data-table-drawer], [data-sv="group"]')
    .forEach((item) => item.addEventListener("click", () => set(false)));
  const controller = new AbortController();
  menuAbort = controller;
  globalThis.document?.addEventListener(
    "pointerdown",
    (event) => {
      if (ui.menu && wrap.isConnected && !wrap.contains(event.target)) set(false);
    },
    { capture: true, signal: controller.signal },
  );
  globalThis.addEventListener?.("resize", place, { signal: controller.signal });
}

function bindHud(el, ctx, table) {
  ensureWatchers(ctx);
  ui.liveTable = table;
  layoutHud(el, table);
  hudObserver?.disconnect();
  hudObserver = new ResizeObserver(() => layoutHud(el, table));
  hudObserver.observe(table.svg);
  bindCommon(el, ctx);
  bindSafetyHud(el, ctx);
  bindSessionMenu(el);
  // Keys and presses on the HUD's own buttons are theirs: the map must not also move a
  // token, start a pan (pointer capture would swallow the click) or steal the focus.
  el.addEventListener("keydown", (event) => {
    if (["Enter", " ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key))
      event.stopPropagation();
  });
  el.addEventListener("pointerdown", (event) => {
    if (event.target.closest?.("button")) event.stopPropagation();
  });
  // Foundry pause: players' movement and doors are refused with the reason; selecting a
  // token, panning and the HUD itself keep working. The DM is not stopped.
  lockAbort?.abort();
  lockAbort = null;
  if (movementLocked(ctx.state, ctx.role)) {
    const controller = new AbortController();
    lockAbort = controller;
    const opts = { capture: true, signal: controller.signal };
    const reason = () => {
      const pause = readSession(ctx.state).pause;
      return (
        ctx.t(
          "Il gioco è in pausa: il DM ha fermato movimenti e porte.",
          "The game is paused: the DM has stopped movement and doors.",
        ) + (pause.message ? ` (${pause.message})` : "")
      );
    };
    const own = (event) =>
      Boolean(event.target.closest?.('[data-ext-slot="map-layer:session-view-hud"]'));
    const panning = (event) => table.mode === "pan" || event.button === 1;
    const refuse = (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      table.message(reason());
    };
    table.svg.addEventListener(
      "pointerdown",
      (event) => {
        if (own(event) || panning(event)) return;
        refuse(event);
        ctx.toast(reason(), true);
        const token = event.target.closest?.("[data-actor]");
        if (token && token.dataset.actor !== table.selectedActorId) {
          const id = token.dataset.actor;
          queueMicrotask(() => {
            table.select(id);
            document.querySelector("#map-message")?.replaceChildren(reason());
          });
        }
      },
      opts,
    );
    table.svg.addEventListener(
      "pointermove",
      (event) => {
        if (!own(event) && !panning(event)) event.stopImmediatePropagation();
      },
      opts,
    );
    table.svg.addEventListener(
      "click",
      (event) => {
        if (!own(event)) refuse(event);
      },
      opts,
    );
    table.svg.addEventListener(
      "keydown",
      (event) => {
        if (own(event)) return;
        const arrows = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key);
        const confirm =
          ["Enter", " "].includes(event.key) && !event.target.closest?.("[data-actor]");
        if (arrows || confirm) {
          refuse(event);
          ctx.toast(reason(), true);
        }
      },
      opts,
    );
    table.root.addEventListener(
      "click",
      (event) => {
        if (event.target.closest?.("[data-path-execute]")) {
          refuse(event);
          ctx.toast(reason(), true);
        }
      },
      opts,
    );
  }
  // Roll20 centre on load: once per arrival, after this bind has finished.
  if (ui.pendingCenter) {
    ui.pendingCenter = false;
    centreOnOwn(ctx, table, { force: false, arrival: true });
  }
}

function centreOnOwn(ctx, table, { force = false, arrival = false } = {}) {
  if (!table?.setView || !table.svg?.isConnected) return false;
  if (arrival && !ctx.registry?.getSetting(ctx, "session-view-personal.center")) return false;
  const scene = table.scene;
  const points =
    ctx.role === "dm"
      ? scene.tokens.filter((token) => token.actorId === table.selectedActorId)
      : ownTokenPoints(ctx.state, scene, ctx.role);
  const next = focusView(scene, points, table.view, { force });
  if (!next) return false;
  queueMicrotask(() => table.setView(next));
  return true;
}

// ---------------------------------------------------------------------------------------
// DM drawer: the session control panel
// ---------------------------------------------------------------------------------------

function renderControls(ctx) {
  const state = ctx.state;
  const slice = readSession(state);
  const live = currentSession(slice);
  const last = lastSession(slice);
  const at = Date.now();
  const status = live
    ? slice.pause.active
      ? ctx.t("In pausa", "Paused")
      : ctx.t("In corso", "Live")
    : last?.status === "ended"
      ? ctx.t("Conclusa", "Ended")
      : ctx.t("Non avviata", "Not started");
  const seen = presentationFor(state, "player");
  const playersSee =
    seen.kind === "waiting"
      ? ctx.t(
          "I giocatori vedono il messaggio d’attesa con un consiglio.",
          "Players see the waiting message with a tip.",
        )
      : slice.pause.active
        ? ctx.t(
            "I giocatori vedono la scena in pausa e non possono muovere.",
            "Players see the paused scene and cannot move.",
          )
        : ctx.t("I giocatori vedono la scena attiva.", "Players see the active scene.");
  const undo = ctx.undoLabel?.() ?? "";
  const lifecycle = `<section class="session-view-card" aria-labelledby="sv-state"><h3 id="sv-state">${ctx.t("Stato della sessione", "Session state")} <span class="badge" data-sv-status>${status}</span></h3>${live ? `<p class="muted">${ctx.t("Iniziata alle", "Started at")} ${new Intl.DateTimeFormat(ctx.lang === "it" ? "it-IT" : "en-GB", { timeStyle: "short" }).format(new Date(live.startedAt))} · ${minutesText(at - live.startedAt)}</p>` : ""}<p>${playersSee}</p>${sessionLink(ctx, state, live ?? last)}<div class="toolbar">${
    live
      ? `${slice.pause.active ? btn(ctx, "resume", ctx.t("Riprendi il gioco", "Resume game"), { cls: "primary" }) : btn(ctx, "pause", ctx.t("Metti in pausa", "Pause game"))}${btn(ctx, "end", ctx.t("Termina sessione…", "End session…"), { cls: "danger" })}`
      : `${btn(ctx, "start", ctx.t("Avvia sessione", "Start session"), { cls: "primary session-view-start" })}<label class="check-field"><input type="checkbox" data-sv-start-hidden> ${ctx.t("Avvia con la scena nascosta", "Start with the scene hidden")}</label>${last?.status === "ended" ? btn(ctx, "reopen", ctx.t("Riapri la sessione conclusa…", "Reopen the ended session…"), { cls: "quiet" }) : ""}`
  }</div><div class="toolbar">${slice.gate.hidden ? btn(ctx, "show", ctx.t("Mostra la scena ai giocatori", "Show the scene to players"), { cls: "primary" }) : btn(ctx, "hide", ctx.t("Nascondi la scena ai giocatori", "Hide the scene from players"))}</div><form class="session-view-inline" data-sv-form="message"><label class="field">${ctx.t("Messaggio d’attesa per i giocatori", "Waiting message for players")}<input name="message" maxlength="200" value="${ctx.esc(slice.gate.message)}" placeholder="${ctx.t("es. Pausa di 10 minuti, poi la cripta", "e.g. 10-minute break, then the crypt")}"></label><button class="button" type="submit">${ctx.t("Salva messaggio", "Save message")}</button></form>${undo ? `<p class="session-view-undo">${btn(ctx, "undo", `${ctx.icon("undo")} ${ctx.t("Annulla", "Undo")}: ${ctx.esc(undo)}`, { cls: "quiet" })}</p>` : ""}</section>`;

  const scenes = `<section class="session-view-card" aria-labelledby="sv-scenes"><h3 id="sv-scenes">${ctx.t("Scena al Tavolo", "Scene at the Table")}</h3><p class="muted">${slice.gate.hidden ? ctx.t("La scena è nascosta: puoi cambiarla in privato e poi mostrarla.", "The scene is hidden: you can change it privately, then show it.") : ctx.t("Per cambiarla senza farla vedere, nascondi prima la scena.", "To change it unseen, hide the scene first.")}</p><ul class="session-view-list">${state.scenes
    .map(
      (scene) =>
        `<li><span><strong>${ctx.esc(scene.name)}</strong>${scene.id === state.activeSceneId ? ` <span class="badge">${ctx.t("Attiva", "Active")}</span>` : ""}</span>${scene.id === state.activeSceneId ? "" : `<button type="button" class="button quiet" data-sv-scene="${ctx.esc(scene.id)}">${ctx.t("Attiva", "Activate")}<span class="session-view-sr"> ${ctx.esc(scene.name)}</span></button>`}</li>`,
    )
    .join(
      "",
    )}</ul>${state.scenes.length < 2 ? `<button type="button" class="button quiet" data-sv="prepare">${ctx.t("Crea un’altra scena in Preparazione", "Create another scene in Preparation")}</button>` : ""}</section>`;

  const { ribbons } = partyRibbons(state);
  const others = state.scenes.filter((scene) => !ribbons.some((row) => row.sceneId === scene.id));
  const chip = (id, sceneId) =>
    `<button type="button" class="session-view-ribbon-chip" draggable="true" data-sv-chip-actor="${ctx.esc(id)}" aria-pressed="${ui.ribbonPick.has(id)}">${ctx.esc(state.actors[id].name)}${hasToken(state, sceneId, id) ? "" : ` <small>· ${ctx.t("senza pedina", "no token")}</small>`}</button>`;
  // Roll20 ribbons: the Players ribbon (party scene) stays put while the DM runs another
  // scene at the Table; "Guida al Tavolo" activates a ribbon's scene without moving anyone.
  const ribbonRow = (sceneId, name, actorIds, main) => {
    const atTable = sceneId === state.activeSceneId;
    return `<li class="session-view-ribbon ${main ? "is-main" : ""} ${atTable ? "is-at-table" : ""}" data-sv-ribbon="${ctx.esc(sceneId)}"><span class="session-view-ribbon-name">${main ? `<small>${ctx.t("Scena del gruppo", "Party scene")}</small>` : ""}${ctx.esc(name)}${atTable ? ` <span class="badge">${ctx.t("al Tavolo", "at the Table")}</span>` : ""}</span><span class="session-view-ribbon-chips">${actorIds.map((id) => chip(id, sceneId)).join("") || `<small class="muted">${ctx.t("nessuno", "nobody")}</small>`}</span><span class="session-view-ribbon-actions"><button type="button" class="button quiet" data-sv-move-here="${ctx.esc(sceneId)}" ${ui.ribbonPick.size ? "" : 'disabled aria-describedby="sv-split-why"'}>${ctx.t("Sposta qui", "Move here")}<span class="session-view-sr"> ${ctx.esc(name)}</span></button>${!atTable && actorIds.length ? `<button type="button" class="button quiet" data-sv-run-scene="${ctx.esc(sceneId)}">${ctx.t("Guida al Tavolo", "Run at the Table")}<span class="session-view-sr"> ${ctx.esc(name)}</span></button>` : ""}</span></li>`;
  };
  const split = `<section class="session-view-card session-view-wide" aria-labelledby="sv-split"><h3 id="sv-split">${ctx.t("Gruppo diviso", "Split party")}</h3><p class="muted">${ctx.t("Trascina un nome su un’altra scena, oppure selezionalo e scegli «Sposta qui». La pedina passa di scena; «Guida al Tavolo» porta al Tavolo quella scena senza spostare gli altri; «Riunisci» riporta tutti nella scena del gruppo, dov’erano.", "Drag a name onto another scene, or select it and choose “Move here”. The token changes scene; “Run at the Table” brings that scene to the Table without moving the others; “Regroup” brings everyone back to the party scene, where they were.")}</p><ul class="session-view-ribbons">${ribbons.map((row) => ribbonRow(row.sceneId, row.name, row.actorIds, row.main)).join("")}${others.map((scene) => ribbonRow(scene.id, scene.name, [], false)).join("")}</ul>${ui.ribbonPick.size ? "" : `<p class="muted" id="sv-split-why">${ctx.t("«Sposta qui» si attiva quando scegli un nome. Premi un nome, poi «Sposta qui» sulla scena di destinazione.", "“Move here” turns on once you pick a name. Press a name, then “Move here” on the destination scene.")}</p>`}${btn(ctx, "regroup", ctx.t("Riunisci il gruppo", "Regroup the party"), { attrs: ribbons.some((row) => !row.main && row.actorIds.length) ? "" : 'disabled aria-describedby="sv-regroup-why"' })}${ribbons.some((row) => !row.main && row.actorIds.length) ? "" : `<p class="muted" id="sv-regroup-why">${ctx.t("Il gruppo è già unito. Sposta qualcuno in un’altra scena per dividerlo.", "The party is already together. Move someone to another scene to split it.")}</p>`}</section>`;

  const timer = slice.timer;
  const left = timerRemaining(timer, at);
  const timerCard = `<section class="session-view-card" aria-labelledby="sv-timer"><h3 id="sv-timer">${ctx.t("Conto alla rovescia", "Countdown")}</h3><p class="session-view-countdown"><strong ${timer.running ? `data-sv-remaining data-sv-ends="${timer.endsAt}"` : ""}>${formatDuration(left)}</strong>${timer.running && left <= 0 ? ` <span class="badge">${ctx.t("Tempo scaduto", "Time is up")}</span>` : ""}</p><p class="muted">${ctx.t("Clic aggiunge; clic destro, pressione lunga o Maiusc+clic toglie.", "Click adds; right-click, long press or Shift+click subtracts.")}</p><div class="toolbar session-view-steps">${[
    [10000, "10s"],
    [60000, "1m"],
    [300000, "5m"],
    [600000, "10m"],
  ]
    .map(
      ([ms, label]) =>
        `<button type="button" class="button" data-sv-timer-add="${ms}" aria-label="${ctx.t(`Aggiungi ${label}; Maiusc per togliere`, `Add ${label}; Shift to subtract`)}">+${label}</button>`,
    )
    .join(
      "",
    )}</div><div class="toolbar">${timer.running ? btn(ctx, "timer-pause", ctx.t("Pausa", "Pause")) : btn(ctx, "timer-start", ctx.t("Avvia", "Start"), { cls: "primary", attrs: left > 0 ? "" : 'disabled aria-describedby="sv-timer-why"' })}${btn(ctx, "timer-reset", ctx.t("Azzera", "Reset"), { cls: "quiet" })}</div>${!timer.running && left <= 0 ? `<p class="muted" id="sv-timer-why">${ctx.t("Il conto alla rovescia è a zero. Aggiungi tempo con +10s, +1m, +5m o +10m.", "The countdown is at zero. Add time with +10s, +1m, +5m or +10m.")}</p>` : ""}<form class="session-view-inline" data-sv-form="timer"><label class="field">${ctx.t("Titolo", "Title")}<input name="label" maxlength="60" value="${ctx.esc(timer.label)}" placeholder="${ctx.t("es. La porta si chiude", "e.g. The door closes")}"></label><label class="check-field"><input type="checkbox" name="hideRemaining" ${timer.hideRemaining ? "checked" : ""}> ${ctx.t("Nascondi il tempo rimanente ai giocatori", "Hide the remaining time from players")}</label><button class="button" type="submit">${ctx.t("Salva", "Save")}</button></form></section>`;

  const clocks = `<section class="session-view-card" aria-labelledby="sv-clocks"><h3 id="sv-clocks">${ctx.t("Orologi di progresso", "Progress clocks")}</h3><ul class="session-view-list">${
    slice.clocks
      .map((clock) => {
        const pinned = slice.pin?.clockId === clock.id;
        return `<li class="session-view-clock-row"><span class="session-view-clock-head">${clockSVG(clock, 40)}<strong>${ctx.esc(clock.label)}</strong> <small>${clock.filled}/${clock.segments}</small>${pinned ? ` <span class="badge">${ctx.t("Fissato", "Pinned")}</span>` : ""}</span><span class="session-view-segments" role="group" aria-label="${ctx.esc(ctx.t(`Segmenti di ${clock.label}`, `${clock.label} segments`))}">${Array.from({ length: clock.segments }, (_, i) => `<button type="button" class="session-view-segment ${i < clock.filled ? "is-filled" : ""}" data-sv-clock="${ctx.esc(clock.id)}" data-sv-fill="${i + 1 === clock.filled ? i : i + 1}" aria-label="${ctx.esc(`${clock.label}: ${i + 1 === clock.filled ? ctx.t("svuota", "empty") : ctx.t("riempi fino a", "fill to")} ${i + 1 === clock.filled ? i : i + 1}`)}" aria-pressed="${i < clock.filled}"></button>`).join("")}</span><span class="toolbar">${pinned ? `<button type="button" class="button quiet" data-sv-unpin>${ctx.t("Togli dagli schermi", "Unpin")}</button>` : `<button type="button" class="button" data-sv-pin="${ctx.esc(clock.id)}">${ctx.t("Fissa ai giocatori", "Pin for players")}</button>`}<button type="button" class="button quiet" data-sv-clock-remove="${ctx.esc(clock.id)}">${ctx.t("Elimina", "Delete")}<span class="session-view-sr"> ${ctx.esc(clock.label)}</span></button></span></li>`;
      })
      .join("") || `<li class="muted">${ctx.t("Nessun orologio.", "No clocks.")}</li>`
  }</ul><form class="session-view-inline" data-sv-form="clock"><label class="field">${ctx.t("Nome", "Name")}<input name="label" maxlength="60" required placeholder="${ctx.t("es. Il rituale", "e.g. The ritual")}"></label><label class="field">${ctx.t("Segmenti", "Segments")}<select name="segments">${CLOCK_SIZES.map((n) => `<option value="${n}" ${n === 6 ? "selected" : ""}>${n}</option>`).join("")}</select></label><button class="button" type="submit">${ctx.t("Aggiungi orologio", "Add clock")}</button></form></section>`;

  const presence = `<section class="session-view-card" aria-labelledby="sv-presence"><h3 id="sv-presence">${ctx.t("Presenze", "Presence")}</h3><ul class="session-view-members">${presenceRows(ctx, state, { interactive: true })}</ul>${btn(ctx, "group", ctx.t("Aggiorna il tuo stato", "Update your status"))}</section>`;

  const members = partyMembers(state).filter((member) => member.role !== "dm");
  const viewAs = `<section class="session-view-card" aria-labelledby="sv-viewas"><h3 id="sv-viewas">${ctx.t("Vedi come un giocatore", "View as a player")}</h3><p class="muted">${ctx.t("Vedi il Tavolo come lo vede il giocatore e agisci per lui: il registro lo indica. Le sue note private restano private.", "See the Table as the player does and act for them: the log says so. Their private notes stay private.")}</p><ul class="session-view-list">${members
    .map((member) => {
      const presence = presenceOf(slice, member.id);
      const where = presentationFor(state, member.id);
      const place =
        where.kind === "waiting"
          ? ctx.t("vede il messaggio d’attesa", "sees the waiting message")
          : where.kind === "breakout"
            ? (state.scenes.find((scene) => scene.id === where.sceneId)?.name ?? "")
            : (activeScene(state)?.name ?? "");
      return `<li><span><span class="session-view-dot is-${presence.status}" aria-hidden="true"></span> <strong>${ctx.esc(member.label)}</strong> <small>· ${presence.status === "away" ? ctx.t("assente", "away") : ctx.t("presente", "here")} · ${ctx.esc(place)}</small></span><span class="toolbar"><button type="button" class="button" data-sv-play-as="${ctx.esc(member.id)}">${ctx.esc(ctx.t(`Gioca per ${member.label}`, `Play for ${member.label}`))}</button><button type="button" class="button quiet" data-sv-view-as="${ctx.esc(member.id)}">${ctx.esc(ctx.t(`Vedi come ${member.label}`, `View as ${member.label}`))}</button></span></li>`;
    })
    .join("")}</ul></section>`;

  const display = slice.display;
  const shared = `<section class="session-view-card" aria-labelledby="sv-display"><h3 id="sv-display">${ctx.t("Schermo condiviso", "Shared screen")}</h3><p class="muted">${ctx.t("La vista spettatore si apre in una nuova scheda da spostare su TV o proiettore: solo la mappa come la vedono i giocatori, senza interfaccia né pedine nascoste, con la griglia bloccata in scala.", "The spectator view opens in a new tab to move to a TV or projector: only the map as players see it, no interface or hidden tokens, with the grid locked to scale.")} ${ctx.t("La finestra staccata mostra timer, orologi e presenze come li vedi tu. Entrambe sono in sola lettura.", "The pop-out shows timer, clocks and presence as you see them. Both only read.")}</p><div class="toolbar">${btn(ctx, "spectator", `${ctx.icon("eye")} ${ctx.t("Apri vista spettatore", "Open spectator view")}`)}${btn(ctx, "popout", ctx.t("Stacca timer e orologi in una finestra", "Pop out timer and clocks"), { cls: "quiet" })}</div><form class="session-view-inline" data-sv-form="display"><label class="field">${ctx.t("Lato della casella sullo schermo (mm)", "Cell side on the screen (mm)")}<input name="cellMm" type="number" min="10" max="60" step="0.1" value="${display.cellMm}"></label><label class="field">${ctx.t("Densità dello schermo (pixel per pollice)", "Screen density (pixels per inch)")}<input name="ppi" type="number" min="40" max="400" step="1" value="${display.ppi}"></label><fieldset class="session-view-calibrate"><legend>${ctx.t("Oppure dalla misura dello schermo", "Or from the screen size")}</legend><label class="field">${ctx.t("Diagonale (pollici)", "Diagonal (inches)")}<input name="inches" type="number" min="7" max="120" step="0.1" inputmode="decimal" placeholder="55"></label><label class="field">${ctx.t("Risoluzione", "Resolution")}<input name="resolution" inputmode="numeric" placeholder="1920×1080" autocomplete="off"></label></fieldset><label class="field">${ctx.t("Area della mappa mostrata", "Map area shown")}<select name="region">${[
    ["scene", ctx.t("Tutta la scena", "The whole scene")],
    ["party", ctx.t("Attorno ai personaggi", "Around the characters")],
    ["view", ctx.t("L’area che vedo ora al Tavolo", "The area I see now at the Table")],
  ]
    .map(
      ([value, text]) =>
        `<option value="${value}" ${(display.region?.mode ?? "scene") === value ? "selected" : ""}>${text}</option>`,
    )
    .join(
      "",
    )}</select></label><label class="check-field"><input type="checkbox" name="ruler" ${display.ruler ? "checked" : ""}> ${ctx.t("Mostra il righello di calibrazione (5 caselle)", "Show the calibration ruler (5 cells)")}</label><button class="button" type="submit">${ctx.t("Salva scala e area", "Save scale and area")}</button></form><p class="muted">${ctx.t("Una casella misura", "One cell measures")} ${formatNumber(ctx.lang, cellPixels(display), 0)} px ${ctx.t("sullo schermo condiviso.", "on the shared screen.")}</p></section>`;

  const endedStory = last?.status === "ended" ? storyFor(state, last.id) : null;
  let draft = null;
  try {
    draft = endedStory ? getCampaignDraft(state, endedStory.draftId, ctx.role) : null;
  } catch {}
  const story = `<section class="session-view-card" aria-labelledby="sv-story"><h3 id="sv-story">${ctx.t("Racconto di sessione", "Session story")}</h3>${
    endedStory && draft
      ? `<p>${ctx.esc(draft.data.title || "")} · ${draft.status === "active" ? ctx.t("bozza privata", "private draft") : draft.status === "applied" ? ctx.t("pubblicata", "published") : ctx.t("scartata", "discarded")}</p>${draft.status === "active" ? `<button type="button" class="button" data-sv-story="${ctx.esc(endedStory.draftId)}" data-sv-story-kind="${endedStory.kind}">${ctx.t("Apri la bozza", "Open the draft")}</button>` : ""}`
      : `<p class="muted">${ctx.registry?.getSetting(ctx, "session-view-campaign.story") === false ? ctx.t("Il racconto automatico è disattivato nelle Preferenze (Campagna).", "The automatic story is turned off in Preferences (Campaign).") : ctx.t("Alla fine della sessione una bozza privata raccoglie presenze, durata e scene. La modifichi e decidi se pubblicarla.", "When the session ends a private draft collects attendance, duration and scenes. You edit it and decide whether to publish it.")}</p>`
  }</section>`;

  const screen = `<section class="session-view-card" aria-labelledby="sv-screen"><h3 id="sv-screen">${ctx.t("Vista", "View")}</h3><div class="toolbar">${btn(ctx, "clean", ctx.t("Nascondi interfaccia", "Hide interface"), { attrs: 'title="Ctrl+Maiusc+H"' })}${btn(ctx, "home", ctx.t("Centra sulla pedina scelta", "Centre on the selected token"), { attrs: 'title="Home"' })}</div><p class="muted">${ctx.t("Ctrl+Maiusc+H nasconde e mostra l’interfaccia; Home centra, Maiusc+Home mostra tutta la scena.", "Ctrl+Shift+H hides and shows the interface; Home centres, Shift+Home shows the whole scene.")}</p></section>`;

  // C3 (CA-57, Owlbear GM hand-off): whoever holds the DM role for the session runs it,
  // scenes and split party included; «Vedi come» (another identity's view) and the session
  // story (the DM's own writing) stay with the DM identity.
  if (ctx.role !== "dm")
    return `<div class="session-view-controls"><p class="session-view-chip">${ctx.t("Fai da DM per questa sessione: il proprietario te l’ha affidata.", "You are DM for this session: the owner handed it to you.")}</p>${lifecycle}${scenes}${timerCard}${clocks}${split}${presence}${shared}${screen}</div>`;
  return `<div class="session-view-controls">${lifecycle}${scenes}${timerCard}${clocks}${split}${presence}${viewAs}${shared}${story}${screen}</div>`;
}

/** The evening's record in Campaign → Sessions (appointment, or played once it ends). */
function sessionLink(ctx, state, session) {
  if (!session) return "";
  const record = (state.campaign?.sessions ?? []).find(
    (row) => row.id === session.campaignSessionId,
  );
  const what = record
    ? ctx.t(
        `Partita ${session.number} · in Campagna → Sessioni: «${record.title || ctx.t("Sessione", "Session")}»`,
        `Session ${session.number} · in Campaign → Sessions: “${record.title || "Session"}”`,
      )
    : session.status === "live"
      ? ctx.t(
          `Partita ${session.number} · alla fine sarà registrata in Campagna → Sessioni.`,
          `Session ${session.number} · at the end it is recorded in Campaign → Sessions.`,
        )
      : ctx.t(`Partita ${session.number}`, `Session ${session.number}`);
  return `<p class="muted session-view-link">${ctx.esc(what)}${record ? ` <button type="button" class="text-button" data-sv="sessions">${ctx.t("Apri Sessioni", "Open Sessions")}</button>` : ""}</p>`;
}

function openEnd(ctx) {
  const slice = readSession(ctx.state);
  const live = currentSession(slice);
  if (!live) {
    ctx.toast(ctx.t("Nessuna sessione in corso.", "No session is running."), true);
    return;
  }
  const facts = sessionFacts(ctx.state, live, Date.now());
  const preview = storyText(facts, ctx.lang);
  const enabled = ctx.registry?.getSetting(ctx, "session-view-campaign.story") !== false;
  const destination =
    ctx.registry?.getSetting(ctx, "session-view-campaign.destination") ?? "journal";
  ctx.dialog(
    ctx.t("Termina la sessione", "End the session"),
    `<p>${ctx.t("I giocatori vedranno il messaggio di fine sessione. Il conto alla rovescia si azzera e la pausa si chiude; gli orologi di progresso restano.", "Players will see the end-of-session message. The countdown is cleared and the pause closes; progress clocks stay.")}</p><pre class="session-view-preview">${ctx.esc(preview.body.trim())}</pre><label class="check-field"><input type="checkbox" name="story" ${enabled ? "checked" : ""}> ${ctx.t("Prepara la bozza del racconto (privata finché non la pubblichi)", "Draft the session story (private until you publish it)")}</label><label class="field">${ctx.t("Dove salvarla", "Where to save it")}<select name="destination"><option value="journal" ${destination === "journal" ? "selected" : ""}>${ctx.t("Diario della campagna", "Campaign journal")}</option><option value="notes" ${destination === "notes" ? "selected" : ""}>${ctx.t("Appunti personali", "Personal notes")}</option></select></label><label class="field">${ctx.t("Messaggio di fine per i giocatori (facoltativo)", "End message for players (optional)")}<input name="message" maxlength="200"></label>`,
    {
      submitLabel: ctx.t("Termina sessione", "End session"),
      onSubmit: (data) => {
        const result = actions.end(ctx, {
          story: data.has("story"),
          destination: data.get("destination"),
          message: String(data.get("message") ?? ""),
        });
        ctx.toast(
          !result
            ? ctx.t("Sessione conclusa.", "Session ended.")
            : result.result === "kept"
              ? ctx.t(
                  "Sessione conclusa. La bozza già modificata non è stata sovrascritta.",
                  "Session ended. The draft you edited was not overwritten.",
                )
              : result.kind === "note"
                ? ctx.t(
                    "Sessione conclusa. Bozza del racconto negli appunti personali.",
                    "Session ended. Story draft in your personal notes.",
                  )
                : ctx.t(
                    "Sessione conclusa. Bozza del racconto nel Diario.",
                    "Session ended. Story draft in the Journal.",
                  ),
        );
      },
    },
  );
}

function openReopen(ctx) {
  ctx.dialog(
    ctx.t("Riapri la sessione conclusa", "Reopen the ended session"),
    `<p>${ctx.t("La stessa sessione continua: durata e presenze proseguono. È una correzione, quindi serve un motivo.", "The same session continues: duration and attendance carry on. It is a correction, so a reason is required.")}</p><label class="field">${ctx.t("Motivo", "Reason")}<input name="reason" required minlength="3" maxlength="200"></label>`,
    {
      submitLabel: ctx.t("Riapri", "Reopen"),
      onSubmit: (data) => {
        actions.reopen(ctx, String(data.get("reason") ?? ""));
      },
    },
  );
}

function openWindow(ctx, tab) {
  const url =
    location.pathname + location.search + "#session-view-display" + (tab ? "?tab=" + tab : "");
  const opened =
    tab === "hud"
      ? window.open(url, BOARD_WINDOW, "popup,width=460,height=640")
      : window.open(url, "d20-spectator");
  if (!opened)
    ctx.toast(
      ctx.t(
        "Il browser ha bloccato la nuova finestra: consenti i popup per questa pagina.",
        "The browser blocked the new window: allow pop-ups for this page.",
      ),
      true,
    );
}

const ZONES = [
  ".session-view-hud",
  ".session-view-controls",
  ".session-view-behalf",
  ".session-view-banner",
  ".session-view-wait",
];
const PARTNERS = {
  pause: "resume",
  resume: "pause",
  hide: "show",
  show: "hide",
  "timer-start": "timer-pause",
  "timer-pause": "timer-start",
  start: "end",
  reopen: "end",
  "behalf-confirm": "behalf-cancel",
};
function restoreFocus(zone, key) {
  const active = document.activeElement;
  // The HUD is drawn inside the map: a re-render of the Table hands the focus back to the map
  // itself, which is not a choice of the user either (R7 keeps keyboard focus on the HUD).
  if (active && active !== document.body && active.isConnected && active.id !== "battle-map")
    return;
  const target =
    document.querySelector(`${zone} [data-sv="${key}"]:not([disabled])`) ??
    document.querySelector(`${zone} [data-sv="${PARTNERS[key]}"]:not([disabled])`) ??
    document.querySelector(`${zone} [data-sv-behalf-map]`);
  target?.focus({ preventScroll: true });
}

/** Buttons shared by the HUD, the cover and the drawer (data-sv="…"). */
function bindCommon(el, ctx) {
  const run = {
    group: () => openPresence(ctx),
    "behalf-presence": () => openPresence(ctx, { memberId: ui.viewAs, onBehalf: true }),
    clean: () => toggleClean(ctx),
    pause: () => actions.pause(ctx),
    resume: () => actions.resume(ctx),
    hide: () => actions.hide(ctx),
    show: () => actions.show(ctx),
    start: () =>
      actions.start(ctx, { hidden: Boolean(el.querySelector("[data-sv-start-hidden]")?.checked) }),
    end: () => openEnd(ctx),
    reopen: () => openReopen(ctx),
    regroup: () => {
      actions.regroup(ctx);
      ui.ribbonPick.clear();
    },
    "timer-start": () => actions.timerStart(ctx),
    "timer-pause": () => actions.timerPause(ctx),
    "timer-reset": () => actions.timerReset(ctx),
    "clock-dismiss": () => actions.clockDismiss(ctx),
    spectator: () => openWindow(ctx, ""),
    popout: () => openWindow(ctx, "hud"),
    home: () => centreOnOwn(ctx, ui.liveTable, { force: true }),
    prepare: () => ctx.navigate("preparation"),
    notes: () => ctx.openNotes?.(),
    undo: () => ctx.undo(),
    tip: () => {
      ui.tip++;
      const target = el.querySelector("[data-sv-tip-text]");
      if (target)
        target.textContent = target.closest(".session-view-pause-tip")
          ? pauseTip(ctx)
          : ctx.label(TIPS[ui.tip % TIPS.length]);
    },
    "stop-play-as": () => {
      ui.playAs = null;
      ctx.render();
    },
    "focus-timer": () => focusSessionPart("sv-timer"),
    "focus-clocks": () => focusSessionPart("sv-clocks"),
    "exit-view": () => {
      ui.viewAs = null;
      ui.behalf = null;
      ctx.render();
    },
    "behalf-confirm": () => confirmBehalf(ctx),
    "behalf-cancel": () => {
      ui.behalf = ui.behalf ? { ...ui.behalf, preview: null, point: null } : null;
      ctx.render();
    },
    sessions: () => ctx.navigate("campaign", { tab: "sessions" }),
  };
  el.querySelectorAll("[data-sv]").forEach((button) => {
    const action = run[button.dataset.sv];
    if (!action) return;
    button.addEventListener("click", () => {
      const key = button.dataset.sv;
      const zone = ZONES.find((selector) => button.closest(selector));
      attempt(ctx, action);
      // A command re-renders the page: keyboard focus goes to the control that replaced
      // this one (Pause ↔ Resume, Hide ↔ Show...), as bindControls does for ribbon chips.
      if (!button.isConnected && zone) restoreFocus(zone, key);
    });
  });
  el.querySelectorAll("[data-sv-sheet]").forEach((button) =>
    button.addEventListener("click", () => ctx.openSheet(button.dataset.svSheet)),
  );
  bindHandover(el, ctx);
}

function bindControls(el, ctx) {
  ensureWatchers(ctx);
  bindCommon(el, ctx);
  if (ui.scrollTo) focusSessionPart(ui.scrollTo);
  const forms = {
    message: (data) => actions.message(ctx, String(data.get("message") ?? "")),
    timer: (data) =>
      actions.timerConfigure(ctx, {
        label: String(data.get("label") ?? ""),
        hideRemaining: data.has("hideRemaining"),
      }),
    clock: (data) =>
      actions.clockAdd(ctx, {
        label: String(data.get("label") ?? ""),
        segments: Number(data.get("segments")),
      }),
    display: (data) => {
      // P10 TV-117: the density can come from the screen's diagonal and resolution.
      const inches = Number(String(data.get("inches") ?? "").replace(",", "."));
      const [w, h] = String(data.get("resolution") ?? "")
        .split(/[x×*]/i)
        .map((part) => Number(part.trim()));
      const ppi =
        inches > 0 && w > 0 && h > 0
          ? Math.round(Math.hypot(w, h) / inches)
          : Number(data.get("ppi"));
      actions.display(ctx, {
        cellMm: Number(data.get("cellMm")),
        ppi,
        ruler: data.has("ruler"),
      });
      const mode = String(data.get("region") ?? "scene");
      const view = ui.liveTable?.view;
      const scene = activeScene(ctx.state);
      const rect =
        mode === "view" && view && scene
          ? {
              x: view.pan?.x ?? 0,
              y: view.pan?.y ?? 0,
              w: scene.width / (view.zoom || 1),
              h: scene.height / (view.zoom || 1),
            }
          : null;
      const current = readSession(ctx.state).display.region?.mode ?? "scene";
      if (mode !== current || mode === "view") actions.displayRegion(ctx, { mode, rect });
    },
  };
  el.querySelectorAll("[data-sv-form]").forEach((form) =>
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      attempt(ctx, () => forms[form.dataset.svForm](new FormData(form)));
    }),
  );
  el.querySelectorAll("[data-sv-scene],[data-sv-run-scene]").forEach((button) =>
    button.addEventListener("click", () =>
      attempt(ctx, () =>
        actions.switchScene(ctx, button.dataset.svScene ?? button.dataset.svRunScene),
      ),
    ),
  );
  // Ticker: click adds, right-click (long press on touch) or Shift+click subtracts.
  // Touch has no right button: a long press (520 ms, as B12's token menu, VTL-232/R20-211)
  // subtracts. Nothing re-renders while the finger is down; the release subtracts and
  // cancels the tap's compatibility click, so the press never also adds.
  el.querySelectorAll("[data-sv-timer-add]").forEach((button) => {
    const delta = Number(button.dataset.svTimerAdd);
    button.addEventListener("click", (event) => {
      if (Date.now() < timerPress.swallowUntil) return;
      attempt(ctx, () => actions.timerAdd(ctx, event.shiftKey ? -delta : delta));
    });
    button.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      if (timerPress.active) return; // the long press subtracts on release
      attempt(ctx, () => actions.timerAdd(ctx, -delta));
    });
    button.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" || !event.isPrimary) return;
      clearTimeout(timerPress.timer);
      const press = { fired: false, timer: 0 };
      press.timer = setTimeout(() => {
        press.fired = true;
        button.classList.add("is-long-press");
      }, 520);
      timerPress.active = press;
      timerPress.timer = press.timer;
      const end = (touch) => {
        button.removeEventListener("touchend", end);
        button.removeEventListener("touchcancel", end);
        button.removeEventListener("pointercancel", end);
        clearTimeout(press.timer);
        if (timerPress.active === press) timerPress.active = null;
        button.classList.remove("is-long-press");
        if (!press.fired || touch.type !== "touchend") return;
        if (touch.cancelable) touch.preventDefault();
        timerPress.swallowUntil = Date.now() + 350;
        attempt(ctx, () => actions.timerAdd(ctx, -delta));
      };
      button.addEventListener("touchend", end, { passive: false });
      button.addEventListener("touchcancel", end);
      button.addEventListener("pointercancel", end);
    });
  });
  el.querySelectorAll("[data-sv-clock]").forEach((button) =>
    button.addEventListener("click", () =>
      attempt(ctx, () =>
        actions.clockFill(ctx, button.dataset.svClock, Number(button.dataset.svFill)),
      ),
    ),
  );
  el.querySelectorAll("[data-sv-pin]").forEach((button) =>
    button.addEventListener("click", () =>
      attempt(ctx, () => actions.clockPin(ctx, button.dataset.svPin)),
    ),
  );
  el.querySelectorAll("[data-sv-unpin]").forEach((button) =>
    button.addEventListener("click", () => attempt(ctx, () => actions.clockPin(ctx, null))),
  );
  el.querySelectorAll("[data-sv-clock-remove]").forEach((button) =>
    button.addEventListener("click", () =>
      attempt(ctx, () => actions.clockRemove(ctx, button.dataset.svClockRemove)),
    ),
  );
  el.querySelectorAll("[data-sv-play-as]").forEach((button) =>
    button.addEventListener("click", () => playAs(ctx, button.dataset.svPlayAs)),
  );
  el.querySelectorAll("[data-sv-view-as]").forEach((button) =>
    button.addEventListener("click", () => {
      ui.viewAs = button.dataset.svViewAs;
      ui.behalf = null;
      ctx.render();
      document.querySelector(".session-view-banner [data-sv='exit-view']")?.focus();
    }),
  );
  el.querySelectorAll("[data-sv-story]").forEach((button) =>
    button.addEventListener("click", () =>
      ctx.navigate(button.dataset.svStoryKind === "note" ? "notes" : "campaign", {
        tab: "edit",
        id: button.dataset.svStory,
      }),
    ),
  );
  // Roll20 party ribbons: drag a name onto a scene, or select names and "Move here".
  el.querySelectorAll("[data-sv-chip-actor]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const id = chip.dataset.svChipActor;
      if (ui.ribbonPick.has(id)) ui.ribbonPick.delete(id);
      else ui.ribbonPick.add(id);
      ctx.render();
      document.querySelector(`[data-sv-chip-actor="${CSS.escape(id)}"]`)?.focus();
    });
    chip.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", chip.dataset.svChipActor);
      event.dataTransfer.effectAllowed = "move";
    });
  });
  el.querySelectorAll("[data-sv-ribbon]").forEach((row) => {
    row.addEventListener("dragover", (event) => {
      event.preventDefault();
      row.classList.add("is-drop");
    });
    row.addEventListener("dragleave", () => row.classList.remove("is-drop"));
    row.addEventListener("drop", (event) => {
      event.preventDefault();
      row.classList.remove("is-drop");
      const id = event.dataTransfer.getData("text/plain");
      if (id) attempt(ctx, () => actions.move(ctx, [id], row.dataset.svRibbon));
    });
  });
  el.querySelectorAll("[data-sv-move-here]").forEach((button) =>
    button.addEventListener("click", () => {
      const ids = [...ui.ribbonPick];
      if (attempt(ctx, () => actions.move(ctx, ids, button.dataset.svMoveHere))) {
        ui.ribbonPick.clear();
        ctx.render();
      }
    }),
  );
}

/** TV-112: the DM takes the absent player's character with the whole Table interface. */
export function playAs(ctx, memberId) {
  const actorId = partyMembers(ctx.state).find((member) => member.id === memberId)?.characters?.[0];
  if (!actorId) {
    ctx.toast(
      ctx.t(
        "Questo giocatore non ha un personaggio al Tavolo.",
        "This player has no character at the Table.",
      ),
      true,
    );
    return false;
  }
  ui.playAs = memberId;
  ui.viewAs = null;
  ui.behalf = null;
  setSelectedActor(actorId);
  if (ctx.view?.page !== "table") ctx.navigate("table");
  else ctx.render();
  ctx.toast(
    ctx.t(
      `Giochi per ${memberName(ctx.state, memberId)}: scheda, tiri e barra delle azioni sono del suo personaggio.`,
      `Playing for ${memberName(ctx.state, memberId)}: sheet, rolls and action bar are their character’s.`,
    ),
  );
  return true;
}
function toggleClean(ctx) {
  // Only over the live map: a cover (waiting screen, view as) has no interface to hide.
  if (ctx.view.page !== "table" || !document.querySelector("#battle-map")) return;
  ui.clean = !ui.clean;
  ctx.render();
  const target = ui.clean
    ? document.querySelector(".session-view-clean [data-sv='clean']")
    : document.querySelector("#battle-map");
  target?.focus({ preventScroll: true });
}

// ---------------------------------------------------------------------------------------
// Detached displays: spectator map (DDB-132, FVT-163/164) and pop-out board (FVT-199)
// ---------------------------------------------------------------------------------------

const DISPLAY_ROUTE = "session-view-display";
const BOARD_WINDOW = "d20-session-hud";
/**
 * A detached display is a tab loaded on the display route: the spectator tab the DM moves
 * to a TV (DDB-132) or the pop-out board (FVT-199). For its whole life it is a locked,
 * read-only shell: an access gate keeps it on this route and refuses every commit, and
 * other areas' commands and shortcuts do not run there. A second writer holding an older
 * copy of the shared state would otherwise overwrite newer changes made at the Table.
 * The pop-out the DM opens (window name) shows the DM's view; any other board shows
 * the players' view.
 */
export function detectDisplay(win) {
  const hash = String(win?.location?.hash ?? "");
  const [page, query = ""] = hash.slice(1).split("?");
  if (page !== DISPLAY_ROUTE) return null;
  const mode = new URLSearchParams(query).get("tab") === "hud" ? "hud" : "map";
  return { mode, as: mode === "hud" && win?.name === BOARD_WINDOW ? "dm" : null };
}
export const displayState = { detached: null };
export function displayRefusal() {
  return displayState.detached
    ? L(
        "Schermo condiviso: solo visione. I comandi restano nella scheda principale del Tavolo.",
        "Shared screen: view only. Controls stay in the main Table tab.",
      )
    : null;
}

/** The latest shared state another tab saved, or this tab's state. Read only. */
export function liveState(ctx) {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === 1 && parsed.actors && Array.isArray(parsed.scenes)) return parsed;
    }
  } catch {}
  return ctx.state;
}

let displayAbort = null;

function renderDisplay(ctx) {
  const state = liveState(ctx);
  const slice = readSession(state);
  const detached = displayState.detached;
  const hud = (detached?.mode ?? (ctx.view.tab === "hud" ? "hud" : "map")) === "hud";
  const view = presentationFor(state, "spectator");
  const notice =
    ui.displayNotice === "warning"
      ? `<div class="session-view-keepalive" role="alertdialog" aria-labelledby="sv-keepalive"><h2 id="sv-keepalive">${ctx.t("Lo schermo è ancora in uso?", "Is this screen still in use?")}</h2><p>${ctx.t("Nessuna attività da molto tempo. Senza risposta la vista si sospende tra 5 minuti.", "No activity for a long time. Without an answer the view suspends in 5 minutes.")}</p><button type="button" class="button primary" data-sv-keepalive>${ctx.t("Continua", "Continue")}</button></div>`
      : ui.displayNotice === "suspended"
        ? `<div class="session-view-keepalive" role="alertdialog" aria-labelledby="sv-keepalive"><h2 id="sv-keepalive">${ctx.t("Vista sospesa per inattività", "View suspended for inactivity")}</h2><button type="button" class="button primary" data-sv-keepalive>${ctx.t("Riprendi", "Resume")}</button></div>`
        : "";
  if (hud) return boardMarkup(ctx, state, slice, view, notice);
  let body;
  if (view.kind === "waiting") body = waitingMarkup(ctx, state, view, { viewer: "spectator" });
  else {
    const scene = activeScene(state);
    const cell = cellPixels(slice.display);
    const grid = Math.max(10, Number(scene?.gridSize) || 50);
    const box = scene ? displayRegion(state, scene, slice.display) : null;
    const sized = scene
      ? {
          width: Math.round((box.w / grid) * cell),
          height: Math.round((box.h / grid) * cell),
        }
      : null;
    const timer = timerView(slice, "spectator", Date.now());
    const clock = pinnedClockFor(slice, "spectator");
    body = `<div class="session-view-locked" data-sv-locked data-sv-cell="${cell}" inert>${projectionSVG(ctx, state, scene, "spectator", { sized, box })}</div>${slice.display.ruler ? `<div class="session-view-ruler" style="width:${Math.round(cell * 5)}px"><span>5 × ${formatNumber(ctx.lang, slice.display.cellMm, 1)} mm = ${formatNumber(ctx.lang, (slice.display.cellMm * 5) / 10, 1)} cm</span></div>` : ""}${pausedMarkup(ctx, slice, "spectator")}${timer || clock ? `<div class="session-view-overlay">${timerMarkup(ctx, timer)}${clockCard(ctx, clock)}</div>` : ""}`;
  }
  return `<div class="session-view-display" data-sv-display="map" data-sv-scene="${ctx.esc(view.kind === "waiting" ? "" : state.activeSceneId)}" aria-label="${ctx.t("Vista spettatore", "Spectator view")}">${body}${notice}</div>`;
}

/**
 * Pop-out board (Foundry V14 pop-out, FVT-199). The DM's pop-out shows the DM's view
 * (seconds also when hidden from players, every clock); any other board shows what
 * players see. Both only read: controls stay in the Session panel of the main tab.
 */
function boardMarkup(ctx, state, slice, view, notice) {
  const detached = displayState.detached;
  const dm = detached ? detached.as === "dm" : ctx.role === "dm";
  const viewer = dm ? "dm" : "spectator";
  const timer = timerView(slice, viewer, Date.now());
  const pinned = pinnedClockFor(slice, viewer);
  const clocks = dm
    ? slice.clocks
        .map(
          (clock) =>
            `<div class="session-view-board-clock">${clockCard(ctx, clock, { large: clock.id === pinned?.id })}${clock.id === pinned?.id ? `<span class="badge">${ctx.t("Fissato per i giocatori", "Pinned for players")}</span>` : ""}</div>`,
        )
        .join("")
    : clockCard(ctx, pinned, { large: true });
  const who = dm
    ? ctx.t("Vista del DM · sola lettura", "DM view · read only")
    : ctx.t("Vista dei giocatori · sola lettura", "Players’ view · read only");
  return `<div class="session-view-display is-board" data-sv-display="hud" data-sv-board="${dm ? "dm" : "players"}"><p class="session-view-kicker">${ctx.esc(who)}</p><h1>${ctx.esc(state.campaign?.name ?? "")}</h1>${view.kind === "waiting" ? `<p class="session-view-chip is-warn">${ctx.t("Scena nascosta ai giocatori", "Scene hidden from players")}</p>` : ""}${slice.pause.active ? `<p class="session-view-chip is-warn">${ctx.t("In pausa", "Paused")}</p>` : ""}${timerMarkup(ctx, timer, { large: true }) || `<p class="muted">${ctx.t("Nessun conto alla rovescia.", "No countdown.")}</p>`}${dm && slice.timer.hideRemaining && timer ? `<p class="muted">${ctx.t("I giocatori leggono solo «in corso».", "Players only read “running”.")}</p>` : ""}${clocks}<ul class="session-view-members">${presenceRows({ ...ctx, role: dm ? "dm" : "spectator", state }, state)}</ul><p class="muted">${ctx.t("I comandi restano nel pannello Sessione della scheda principale del Tavolo.", "Controls stay in the Session panel of the main Table tab.")}</p>${notice}</div>`;
}

function bindDisplay(el, ctx) {
  ensureWatchers(ctx);
  displayAbort?.abort();
  const controller = new AbortController();
  displayAbort = controller;
  const signal = controller.signal;
  const locked = el.querySelector("[data-sv-locked]");
  const place = () => {
    if (!locked?.isConnected) return;
    const svg = locked.querySelector("svg");
    const state = liveState(ctx);
    const scene = activeScene(state);
    if (!svg || !scene) return;
    const cell = Number(locked.dataset.svCell);
    const scale = cell / Math.max(10, Number(scene.gridSize) || 50);
    const points = visibleTokens(state, scene, "spectator").filter((token) =>
      partyCharacters(state).some((actor) => actor.id === token.actorId),
    );
    const cx = points.length
      ? points.reduce((sum, p) => sum + p.x, 0) / points.length
      : scene.width / 2;
    const cy = points.length
      ? points.reduce((sum, p) => sum + p.y, 0) / points.length
      : scene.height / 2;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = scene.width * scale;
    const h = scene.height * scale;
    const fit = (size, view, centre) =>
      size <= view
        ? (view - size) / 2
        : Math.min(0, Math.max(view - size, view / 2 - centre * scale));
    locked.style.transform = `translate(${Math.round(fit(w, vw, cx))}px, ${Math.round(fit(h, vh, cy))}px)`;
  };
  place();
  window.addEventListener("resize", place, { signal });
  // Lock View: no pan or zoom on the shared screen.
  el.addEventListener("wheel", (event) => event.preventDefault(), { passive: false, signal });
  // Follow the other tab's saves (the simulated network feed) unless suspended.
  let queued = false;
  window.addEventListener(
    "storage",
    (event) => {
      if (event.key !== STORAGE_KEY || ui.displayNotice === "suspended" || queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        if (ctx.view.page === "session-view-display") ctx.render();
      });
    },
    { signal },
  );
  el.querySelector("[data-sv-keepalive]")?.addEventListener("click", () => {
    ui.displayNotice = null;
    idle.warnedAt = null;
    idle.expired = false;
    idle.last = Date.now();
    ctx.render();
  });
}

// ---------------------------------------------------------------------------------------
// Timers: countdown text, alert at zero, inactivity keep-alive (DDB-112)
// ---------------------------------------------------------------------------------------

const idle = {
  last: Date.now(),
  warnedAt: null,
  expired: false,
  alerted: new Set(),
  started: false,
  tipAt: Date.now(),
};
function ensureWatchers(ctx) {
  if (idle.started || typeof document === "undefined") return;
  idle.started = true;
  const note = () => {
    idle.last = Date.now();
  };
  for (const type of ["pointerdown", "keydown", "wheel", "touchstart"])
    document.addEventListener(type, note, { capture: true, passive: true });
  setInterval(() => tick(ctx.registry), 1000);
}
function tick(registry) {
  const ctx = registry?.ctx;
  if (!ctx) return;
  const page = ctx.view.page;
  const display = page === "session-view-display";
  if (page !== "table" && !display) return;
  const state = display ? liveState(ctx) : ctx.state;
  const slice = readSession(state);
  const now = Date.now();
  // Waiting-room tips rotate (DDB-006) every ten seconds.
  if (now - idle.tipAt >= 10000) {
    idle.tipAt = now;
    ui.tip++;
    document
      .querySelectorAll("[data-sv-tip-text]")
      .forEach((node) => (node.textContent = ctx.label(TIPS[ui.tip % TIPS.length])));
  }
  // Countdown text in this tab's own elements, and the synced alert at zero (Ticker).
  document.querySelectorAll("[data-sv-remaining]").forEach((node) => {
    const left = Math.max(0, Number(node.dataset.svEnds) - now);
    node.textContent = left > 0 ? formatDuration(left) : ctx.t("Tempo scaduto", "Time is up");
  });
  const timer = slice.timer;
  if (timer.running && timer.endsAt <= now && !idle.alerted.has(timer.run)) {
    idle.alerted.add(timer.run);
    ctx.toast(
      `${ctx.t("Tempo scaduto", "Time is up")}${timer.label ? ": " + timer.label : ""}`,
      true,
    );
    if (!document.querySelector("#dialog")?.open) ctx.render();
  }
  // Keep-alive while a session is live and not paused.
  const minutes = Number(registry.getSetting(ctx, "session-view-campaign.idle")) || 55;
  const step = idleStep({
    now,
    lastInput: idle.last,
    warnedAt: idle.warnedAt,
    expired: idle.expired,
    live: Boolean(currentSession(slice)) && !slice.pause.active,
    minutes,
  });
  if (step.action === "clear") {
    if (idle.warnedAt !== null && display && ui.displayNotice === "warning") {
      ui.displayNotice = null;
      ctx.render();
    }
    idle.warnedAt = null;
    idle.expired = false;
  } else if (step.action === "warn") {
    idle.warnedAt = now;
    if (display) {
      ui.displayNotice = "warning";
      ctx.render();
    } else
      ctx.dialog(
        ctx.t("Sei ancora al tavolo?", "Are you still at the table?"),
        `<p>${ctx.t(`Nessuna attività da ${minutes} minuti. Se non rispondi entro 5 minuti`, `No activity for ${minutes} minutes. If you do not answer within 5 minutes`)} ${ctx.role === "dm" ? ctx.t("il gioco va in pausa, così una scheda dimenticata non lascia la sessione aperta.", "the game pauses, so a forgotten tab does not keep the session open.") : ctx.t("risulterai assente al gruppo.", "you will show as away to the party.")}</p>`,
        {
          submitLabel: ctx.t("Continua la sessione", "Continue the session"),
          onSubmit: () => {
            idle.last = Date.now();
            idle.warnedAt = null;
            idle.expired = false;
          },
        },
      );
  } else if (step.action === "expire") {
    idle.expired = true; // acted once; the next input clears it and re-arms the keep-alive
    if (display) {
      ui.displayNotice = "suspended";
      ctx.render();
      return;
    }
    const dm = ctx.role === "dm";
    let applied = false;
    try {
      if (dm)
        ctx.commit(
          ctx.t("Pausa automatica per inattività", "Automatic pause for inactivity"),
          (d) => setPause(d, "dm", true, now, ctx.t("inattività", "inactivity")),
        );
      else
        ctx.commit(ctx.t("Assente per inattività", "Away for inactivity"), (d) =>
          setPresence(
            d,
            ctx.role,
            ctx.role,
            { status: "away", message: ctx.t("inattivo", "idle") },
            now,
          ),
        );
      applied = true;
    } catch {}
    // The dialog tells what actually happened: offline, the shared change was refused.
    ctx.dialog(
      !applied
        ? ctx.t("Sei senza rete: stato non aggiornato", "You are offline: status not updated")
        : dm
          ? ctx.t("Gioco in pausa per inattività", "Game paused for inactivity")
          : ctx.t("Risulti assente", "You show as away"),
      `<p>${
        !applied
          ? dm
            ? ctx.t(
                "Il gioco non è stato messo in pausa: riconnettiti e mettilo in pausa dal pannello Sessione se serve.",
                "The game was not paused: reconnect and pause it from the Session panel if needed.",
              )
            : ctx.t(
                "Il gruppo non vede che sei assente: riconnettiti e aggiorna il tuo stato dal pulsante Gruppo.",
                "The party does not see you as away: reconnect and update your status from the Party button.",
              )
          : dm
            ? ctx.t(
                "Riprendi il gioco dal pannello Sessione quando sei pronto.",
                "Resume the game from the Session panel when you are ready.",
              )
            : ctx.t(
                "Aggiorna il tuo stato dal pulsante Gruppo quando torni.",
                "Update your status from the Party button when you are back.",
              )
      }</p>`,
      { cancelLabel: ctx.t("Chiudi", "Close") },
    );
  }
}
export const idleState = idle;

// ---------------------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------------------

const notDetached = () => !displayState.detached;

/** The core Home resume card (app.mjs / home-ui.mjs) without the scene name. */
function homeResume(ctx) {
  return `<section class="resume-scene"><div class="scene-emblem" aria-hidden="true">${ctx.icon("map")}</div><div><h2>${ctx.esc(ctx.state.campaign?.name ?? "")}</h2><p>${ctx.t("Il DM sta preparando la scena", "The DM is preparing the scene")}</p><p class="muted">${ctx.t("Puoi entrare anche senza avviare un combattimento.", "You can enter without starting combat.")}</p><div class="toolbar"><button class="button primary" data-nav="table">${ctx.icon("play")} ${ctx.t("Entra al Tavolo", "Enter table")}</button><button class="button" data-nav="campaign">${ctx.t("Apri campagna", "Open campaign")}</button></div></div></section>`;
}

export function register(registry) {
  registry.registerStateSlice(ID, { version: 1, seed: seedSession, normalize: normalizeSession });
  registry.registerStateSlice(STORIES, {
    version: 1,
    undo: "preserve",
    seed: seedStories,
    normalize: normalizeStories,
  });
  registry.registerStyles(new URL("./session-view.css", import.meta.url));

  registry.add("table-panel", {
    id: "session-view-cover",
    label: L("Presentazione della scena", "Scene presentation"),
    placement: "cover",
    when: (ctx) => coverKind(ctx) !== null,
    render: (ctx) => renderCover(ctx),
    bind: (el, ctx) => bindCover(el, ctx),
  });
  registry.add("table-panel", {
    id: "session-view-controls",
    section: "scene",
    label: L("Sessione", "Session"),
    placement: "sidebar-tab",
    // The DM, and for the session whoever the owner handed the DM role to (P10 CA-57).
    when: (ctx) => runsSession(ctx.state, ctx.role),
    icon: "clock",
    order: 70,
    render: (ctx) => renderControls(ctx),
    bind: (el, ctx) => bindControls(el, ctx),
  });
  registry.add("map-layer", {
    id: "session-view-hud",
    label: L("Stato della sessione sulla mappa", "Session status on the map"),
    order: 95,
    interactive: true,
    svg: (ctx, view) => renderHud(ctx, view),
    bind: (el, ctx, table) => bindHud(el, ctx, table),
  });
  registry.add("route", {
    id: DISPLAY_ROUTE,
    label: L("Vista spettatore", "Spectator view"),
    icon: "eye",
    render: (ctx) => renderDisplay(ctx),
    bind: (el, ctx) => bindDisplay(el, ctx),
  });
  // A detached display tab is locked for its whole life (see detectDisplay).
  displayState.detached = detectDisplay(globalThis.window);
  registry.registerAccessGate({ page: DISPLAY_ROUTE, refusal: () => displayRefusal() });
  // Player Home while the scene is hidden: the resume card names no scene (DDB-111).
  registry.add("home-widget", {
    id: "resume",
    replaces: true,
    label: L("Riprendi la partita", "Resume the game"),
    when: (ctx) => ctx.role !== "dm" && readSession(ctx.state).gate.hidden,
    render: (ctx) => homeResume(ctx),
  });

  registry.add("command", {
    id: "session-view.clean",
    when: notDetached,
    label: L("Nascondi o mostra l’interfaccia", "Hide or show the interface"),
    shortcut: "Mod+Shift+H",
    context: "table",
    run: (ctx) => toggleClean(ctx),
  });
  registry.add("command", {
    id: "session-view.home",
    when: notDetached,
    label: L("Centra sulle mie pedine", "Centre on my tokens"),
    shortcut: "Home",
    context: "table",
    run: (ctx) => centreOnOwn(ctx, ui.liveTable, { force: true }),
  });
  registry.add("command", {
    id: "session-view.fit",
    when: notDetached,
    label: L("Mostra tutta la scena", "Show the whole scene"),
    shortcut: "Shift+Home",
    context: "table",
    run: () => ui.liveTable?.setView?.({ zoom: 1, pan: { x: 0, y: 0 } }),
  });
  registry.add("command", {
    id: "session-view.pause",
    when: notDetached,
    label: L("Metti in pausa o riprendi il gioco", "Pause or resume the game"),
    when: (ctx) => notDetached() && runsSession(ctx.state, ctx.role),
    context: "table",
    run: (ctx) => (readSession(ctx.state).pause.active ? actions.resume(ctx) : actions.pause(ctx)),
  });
  registry.add("command", {
    id: "session-view.gate",
    when: notDetached,
    label: L("Nascondi o mostra la scena ai giocatori", "Hide or show the scene to players"),
    when: (ctx) => notDetached() && runsSession(ctx.state, ctx.role),
    context: "table",
    run: (ctx) => (readSession(ctx.state).gate.hidden ? actions.show(ctx) : actions.hide(ctx)),
  });
  // P10 TV-130/131 (Owlbear Ticker, AboveVTT /timer, Owlbear Count!): findable by the words
  // people type; they open the Table's Session panel at the countdown or the clocks.
  const openPart = (ctx, id) => {
    const go = () => {
      const handle = globalThis.document?.querySelector?.(
        '[data-table-drawer="session-view-controls"]',
      );
      if (handle && !globalThis.document.getElementById(id)) handle.click();
      focusSessionPart(id);
    };
    if (ctx.view?.page !== "table") {
      ctx.navigate("table");
      setTimeout(go, 0);
    } else go();
  };
  registry.add("command", {
    id: "session-view.timer",
    label: L("Conto alla rovescia (timer)", "Countdown (timer)"),
    description: L(
      "Un timer che i giocatori vedono sulla mappa, con titolo; pausa e azzera",
      "A timer players see on the map, with a title; pause and reset",
    ),
    keywords: [
      L("timer", "timer"),
      L("conto alla rovescia", "countdown"),
      L("cronometro", "stopwatch"),
      L("/timer", "/timer"),
      L("clessidra", "hourglass"),
    ],
    when: (ctx) => notDetached() && runsSession(ctx.state, ctx.role),
    run: (ctx) => openPart(ctx, "sv-timer"),
  });
  registry.add("command", {
    id: "session-view.clocks",
    label: L("Orologi di progresso", "Progress clocks"),
    description: L(
      "Orologi a spicchi da riempire e fissare sugli schermi dei giocatori",
      "Segmented clocks to fill and pin on the players’ screens",
    ),
    keywords: [
      L("orologio", "clock"),
      L("count", "count"),
      L("spicchi", "segments"),
      L("fissa ai giocatori", "pin for players"),
    ],
    when: (ctx) => notDetached() && runsSession(ctx.state, ctx.role),
    run: (ctx) => openPart(ctx, "sv-clocks"),
  });
  registry.add("command", {
    id: "session-view.play-as",
    label: L("Gioca per un giocatore assente", "Play for an absent player"),
    description: L(
      "Barra delle azioni, tiri e scheda del suo personaggio, con una fascia che lo ricorda",
      "Their character’s action bar, rolls and sheet, with a banner that says so",
    ),
    keywords: [
      L("gioca come", "play as"),
      L("giocatore assente", "absent player"),
      L("player view", "player view"),
    ],
    roles: ["dm"],
    when: notDetached,
    run(ctx) {
      const member = partyMembers(ctx.state).find(
        (row) => row.role !== "dm" && row.characters?.length,
      );
      if (member) playAs(ctx, member.id);
    },
  });
  registry.add("command", {
    id: "session-view.spectator",
    when: notDetached,
    label: L("Apri la vista spettatore", "Open the spectator view"),
    context: "table",
    run: (ctx) => openWindow(ctx, ""),
  });

  registry.add("settings", {
    id: "session-view-personal",
    label: L("Tavolo: arrivo", "Table: arrival"),
    scope: "personal",
    fields: [
      {
        id: "center",
        label: L(
          "Da ingrandita, la vista si centra sulle mie pedine quando arrivo al Tavolo",
          "When zoomed in, centre the view on my tokens when I arrive at the Table",
        ),
        type: "boolean",
        default: true,
      },
    ],
  });
  registry.add("settings", {
    id: "session-view-campaign",
    label: L("Sessione di gioco", "Game session"),
    scope: "campaign",
    fields: [
      {
        id: "story",
        label: L(
          "Prepara una bozza di racconto a fine sessione",
          "Draft a session story when a session ends",
        ),
        type: "boolean",
        default: true,
      },
      {
        id: "destination",
        label: L("Dove salvare la bozza", "Where to save the draft"),
        type: "choice",
        default: "journal",
        options: [
          { value: "journal", label: L("Diario della campagna", "Campaign journal") },
          { value: "notes", label: L("Appunti personali del DM", "DM personal notes") },
        ],
      },
      {
        id: "idle",
        label: L("Avviso di inattività dopo (minuti)", "Inactivity warning after (minutes)"),
        type: "number",
        default: 55,
        min: 1,
        max: 240,
      },
    ],
  });
  registry.add("notifications", {
    id: "session-view-stories",
    label: L("Racconti di sessione", "Session stories"),
    roles: ["dm"],
    collect: (ctx) =>
      (ctx.state.ext?.[STORIES]?.stories ?? []).flatMap((row) => {
        let draft = null;
        try {
          draft = getCampaignDraft(ctx.state, row.draftId, ctx.role);
        } catch {}
        if (draft?.status !== "active") return [];
        return [
          {
            id: row.draftId,
            title: L("Bozza del racconto di sessione pronta", "Session story draft ready"),
            body: draft.data.title,
            time: new Date(row.at).toISOString(),
            target: {
              page: row.kind === "note" ? "notes" : "campaign",
              params: { tab: "edit", id: row.draftId },
            },
          },
        ];
      }),
  });

  registry.on("navigate", (payload) => {
    if (payload.page === "table" && payload.from !== "table") ui.pendingCenter = true;
    if (payload.page !== "table") {
      ui.viewAs = null;
      ui.behalf = null;
      ui.clean = false;
    }
  });
  registry.on("role-changed", () => {
    resetUI();
    ui.pendingCenter = true;
  });
  registry.on("reset", () => {
    resetUI();
    idle.alerted.clear();
    idle.warnedAt = null;
    idle.expired = false;
  });
  // A scene change made elsewhere (Preparation "Activate at table", starting an
  // encounter) is recorded in the live session's timeline with a private bookkeeping
  // entry; an Undo already restored the timeline with the rest of the state.
  registry.on("scene-activated", (payload, { ctx }) => {
    ui.pendingCenter = true;
    if (payload.correction || !ctx || ctx.role !== "dm" || ctx.offline) return;
    const session = currentSession(readSession(ctx.state));
    const last = session?.scenes.at(-1);
    if (!session || (last?.sceneId === payload.sceneId && last.to === null)) return;
    try {
      ctx.commit(
        ctx.t("Sessione: cambio di scena registrato", "Session: scene change recorded"),
        (d) => recordActiveScene(d, Date.now()),
        { visibility: "private", undoable: false },
      );
    } catch {}
  });
}
