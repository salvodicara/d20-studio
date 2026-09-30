// B51 — Sessions: recurrence, absences, seats and attendance (campaign domain, pure).
//
// Extends Campaign → Sessions (campaign-sessions.mjs, increment 7) without a second
// appointment store: every date of a recurring series is an ordinary campaign session,
// created, moved and cancelled through that module's own draft service (as B14 does for
// a played evening), so Home, the campaign overview, the recap editor, notifications (B24)
// and the Table's evening (B14) all see it. This slice keeps only what the core does not:
// series, answers with seats and waitlist, attendance, change records for explicit
// corrections and an audit log.
//
// Patterns (census IDs):
// - StartPlaying cadence chosen at creation (SVC-048) and batch scheduling of up to 10
//   sessions, weekly or bi-weekly only (SVC-049).
// - Discord recurring events: an edit applies to every future occurrence (SVC-056); the
//   single-date change Discord lacks is StartPlaying's per-session reschedule (SVC-053).
// - StartPlaying "Skipping" kept apart from "Leave Campaign" (SVC-052) and the GM marking a
//   player as skipping (SVC-054). Their 24-hour cut-off becomes a warning, never a block
//   (census C23), and, unlike StartPlaying's carried-over skips (SVC-053), a moved session
//   asks everyone again: an answer counts only for the instant it was given for.
// - Sesh RSVP Attending / Maybe / Not attending with an attendance cap, an automatic
//   waitlist and a notice when a spot opens (SVC-058); Warhorn's first-in-first-out
//   waitlist that nobody reorders (SVC-009).
// - Sesh logs of RSVPs and edits (SVC-061); Quest Portal attendance in the session story
//   (VTL-054), shown here in the recap linked to the session.
// - Sesh: a recurring event keeps its local time across daylight-saving changes (SVC-060).
//
// Everything is a local single-browser simulation: guests are synthetic people whose
// answers the organizer records on their behalf; nothing is sent anywhere.

import {
  resolveSessionTime,
  createSessionDraft,
  saveSessionDraft,
  previewSessionDraft,
  applySessionDraft,
} from "./campaign-sessions.mjs";
import { campaignMembers, canOrganizeSessions, isCampaignMember } from "./campaign-content.mjs";

export const ID = "sessions-plus";
export const VERSION = 1;
export const MAX_BATCH = 10; // StartPlaying batch scheduling (SVC-049)
export const LATE_HOURS = 24; // StartPlaying's skip cut-off (SVC-052), here only a warning
export const FREQUENCIES = Object.freeze({ weekly: 7, biweekly: 14 });
export const ANSWERS = Object.freeze(["attending", "maybe", "skipping"]);
export const ATTENDANCE = Object.freeze(["present", "absent"]);
export const TITLE_MAX = 120;
export const NOTE_MAX = 200;
export const MAX_SEATS = 99;
const LOG_MAX = 400;
const CHANGES_MAX = 100;
const HOUR = 3600e3;
const DAY = 24 * HOUR;

const clone = (value) => structuredClone(value);
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const iso = (ms) => new Date(ms).toISOString();
const text = (value, max) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
export function refuse(it, en) {
  return Object.assign(new Error(en), { it, en });
}
const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

// ---------------------------------------------------------------------------------------
// Slice: seed and normalization

// Two synthetic friends who sometimes join an open evening (the same simulated people as
// the public tables of B59), so seats and the waitlist can be shown with one player.
export function seedSessionsPlus() {
  return {
    series: [],
    guests: {
      lanterns: [
        { id: "sim-greta", name: "Greta Lind" },
        { id: "sim-tomas", name: "Tomas Ferri" },
      ],
    },
    sessionMeta: {},
    rsvps: {},
    attendance: {},
    changes: [],
    log: [],
  };
}

const list = (value) => (Array.isArray(value) ? value : []);
const idOk = (value) =>
  typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:@+-]{0,199}$/.test(value);
const seatsOk = (value) =>
  value === null || (Number.isInteger(value) && value >= 1 && value <= MAX_SEATS);
const snapshotOk = (value) =>
  isObject(value) &&
  Object.fromEntries(
    Object.entries(value)
      .filter(([sid, row]) => idOk(sid) && isObject(row))
      .map(([sid, row]) => [
        sid,
        {
          title: text(row.title, TITLE_MAX),
          localTime: typeof row.localTime === "string" ? row.localTime : null,
          timeZone: typeof row.timeZone === "string" ? row.timeZone : null,
          startsAt: typeof row.startsAt === "string" ? row.startsAt : null,
          status: row.status === "cancelled" ? "cancelled" : "scheduled",
          seats: seatsOk(row.seats) ? row.seats : null,
          guests: list(row.guests).filter(idOk),
        },
      ]),
  );

export function normalizeSessionsPlus(slice, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw Error("Sessions data comes from a newer version");
  const seed = seedSessionsPlus();
  if (!isObject(slice)) return seed;
  const guests = {};
  for (const [cid, rows] of Object.entries(isObject(slice.guests) ? slice.guests : seed.guests))
    if (idOk(cid))
      guests[cid] = list(rows)
        .filter((row) => isObject(row) && idOk(row.id) && text(row.name, 60))
        .map((row) => ({ id: row.id, name: text(row.name, 60) }));
  const sessionMeta = {};
  for (const [sid, meta] of Object.entries(isObject(slice.sessionMeta) ? slice.sessionMeta : {}))
    if (idOk(sid) && isObject(meta))
      sessionMeta[sid] = {
        seriesId: idOk(meta.seriesId) ? meta.seriesId : null,
        index: Number.isInteger(meta.index) && meta.index > 0 ? meta.index : null,
        seats: seatsOk(meta.seats) ? meta.seats : null,
        guests: list(meta.guests).filter(idOk),
        ...(typeof meta.reaskAt === "string" ? { reaskAt: meta.reaskAt } : {}),
      };
  const rsvps = {};
  for (const [sid, people] of Object.entries(isObject(slice.rsvps) ? slice.rsvps : {})) {
    if (!idOk(sid) || !isObject(people)) continue;
    rsvps[sid] = {};
    for (const [pid, row] of Object.entries(people))
      if (
        idOk(pid) &&
        isObject(row) &&
        [...ANSWERS, "waitlist"].includes(row.status) &&
        typeof row.startsAt === "string"
      )
        rsvps[sid][pid] = {
          status: row.status,
          startsAt: row.startsAt,
          at: typeof row.at === "string" ? row.at : iso(0),
          by: idOk(row.by) ? row.by : pid,
          note: text(row.note, NOTE_MAX),
          waitSince: typeof row.waitSince === "string" ? row.waitSince : null,
          late: row.late === true,
        };
  }
  const attendance = {};
  for (const [sid, row] of Object.entries(isObject(slice.attendance) ? slice.attendance : {}))
    if (idOk(sid) && isObject(row) && isObject(row.records))
      attendance[sid] = {
        revision: Number.isInteger(row.revision) && row.revision > 0 ? row.revision : 1,
        at: typeof row.at === "string" ? row.at : iso(0),
        by: idOk(row.by) ? row.by : null,
        records: records(row.records),
        history: list(row.history)
          .filter((entry) => isObject(entry) && isObject(entry.records))
          .map((entry) => ({
            revision: Number.isInteger(entry.revision) ? entry.revision : 1,
            at: typeof entry.at === "string" ? entry.at : iso(0),
            by: idOk(entry.by) ? entry.by : null,
            reason: text(entry.reason, NOTE_MAX),
            records: records(entry.records),
          })),
      };
  return {
    series: list(slice.series)
      .filter((row) => isObject(row) && idOk(row.id) && FREQUENCIES[row.frequency])
      .map((row) => ({
        id: row.id,
        campaignId: idOk(row.campaignId) ? row.campaignId : "lanterns",
        title: text(row.title, TITLE_MAX),
        frequency: row.frequency,
        startDate: typeof row.startDate === "string" ? row.startDate : "",
        time: typeof row.time === "string" ? row.time : "",
        timeZone: typeof row.timeZone === "string" ? row.timeZone : "UTC",
        count: Number.isInteger(row.count) ? row.count : list(row.sessionIds).length,
        seats: seatsOk(row.seats) ? row.seats : null,
        guests: list(row.guests).filter(idOk),
        sessionIds: list(row.sessionIds).filter(idOk),
        createdBy: idOk(row.createdBy) ? row.createdBy : null,
        createdAt: typeof row.createdAt === "string" ? row.createdAt : iso(0),
        status: row.status === "ended" ? "ended" : "active",
      })),
    guests,
    sessionMeta,
    rsvps,
    attendance,
    changes: list(slice.changes)
      .filter((row) => isObject(row) && idOk(row.id) && list(row.sessionIds).length)
      .map((row) => ({
        id: row.id,
        seriesId: idOk(row.seriesId) ? row.seriesId : null,
        kind: ["edit", "cancel", "restore", "revert"].includes(row.kind) ? row.kind : "edit",
        scope: row.scope === "future" ? "future" : "one",
        sessionIds: list(row.sessionIds).filter(idOk),
        at: typeof row.at === "string" ? row.at : iso(0),
        by: idOk(row.by) ? row.by : null,
        reason: text(row.reason, NOTE_MAX),
        summary: isObject(row.summary) ? clone(row.summary) : {},
        before: snapshotOk(row.before) || {},
        after: snapshotOk(row.after) || {},
        revertsId: idOk(row.revertsId) ? row.revertsId : null,
        revertedBy: idOk(row.revertedBy) ? row.revertedBy : null,
      }))
      .slice(-CHANGES_MAX),
    log: list(slice.log)
      .filter((row) => isObject(row) && idOk(row.id) && typeof row.kind === "string")
      .map((row) => clone(row))
      .slice(-LOG_MAX),
  };
}
function records(value) {
  const out = {};
  for (const [pid, row] of Object.entries(isObject(value) ? value : {}))
    if (idOk(pid) && isObject(row) && ATTENDANCE.includes(row.status))
      out[pid] = { status: row.status, note: text(row.note, NOTE_MAX) };
  return out;
}

export const sliceOf = (state) => state?.ext?.[ID] ?? seedSessionsPlus();
function writable(state) {
  state.ext ??= {};
  state.ext[ID] ??= seedSessionsPlus();
  return state.ext[ID];
}

// ---------------------------------------------------------------------------------------
// Dates: local wall dates in the series zone, never shifted by the viewer's zone

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
export function addDays(date, days) {
  const [, y, m, d] = DATE.exec(date) ?? [];
  if (!y) return null;
  const next = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d) + days));
  return next.toISOString().slice(0, 10);
}
export function daysBetween(from, to) {
  const a = DATE.exec(from),
    b = DATE.exec(to);
  if (!a || !b) return 0;
  return Math.round((Date.UTC(b[1], b[2] - 1, b[3]) - Date.UTC(a[1], a[2] - 1, a[3])) / DAY);
}
const dateOf = (localTime) => String(localTime ?? "").slice(0, 10);
const timeOf = (localTime) => String(localTime ?? "").slice(11, 16);

/**
 * The dates of a batch: every `frequency` days from `startDate` at the same local `time`
 * in `timeZone` (SVC-049, SVC-060). Each date carries its resolved instant or the errors
 * of that date (a local time that does not exist or occurs twice on a DST change).
 */
export function seriesDates({ startDate, time, timeZone, frequency, count }) {
  const step = FREQUENCIES[frequency];
  if (!step || !DATE.test(startDate ?? "") || !TIME.test(time ?? "")) return [];
  const n = Math.min(Math.max(Number(count) || 0, 0), MAX_BATCH);
  return Array.from({ length: n }, (_, i) => {
    const localTime = `${addDays(startDate, i * step)}T${time}`;
    const resolution = resolveSessionTime({ localTime, timeZone });
    const offset = resolution.candidates[0]?.offsetLabel ?? null;
    return {
      index: i + 1,
      localTime,
      startsAt: resolution.startsAt,
      offset,
      errors: resolution.errors,
    };
  });
}

/** Validates a series before creating it; returns {valid, errors, dates, input}. */
export function previewSeries(state, input, viewer, now = Date.now()) {
  const errors = [];
  const cid = state.campaign?.id;
  if (!cid || !canOrganizeSessions(state, cid, viewer))
    errors.push(
      refuse(
        "Solo chi organizza può programmare una serie.",
        "Only organizers can schedule a series.",
      ),
    );
  const title = text(input?.title, TITLE_MAX);
  if (!title) errors.push(refuse("Dai un titolo alla serie.", "Give the series a title."));
  if (!FREQUENCIES[input?.frequency])
    errors.push(
      refuse(
        "La serie si ripete ogni settimana o ogni due settimane.",
        "A series repeats weekly or every two weeks.",
      ),
    );
  const count = Number(input?.count);
  if (!Number.isInteger(count) || count < 1 || count > MAX_BATCH)
    errors.push(
      refuse(
        `Da 1 a ${MAX_BATCH} sessioni per volta.`,
        `From 1 to ${MAX_BATCH} sessions at a time.`,
      ),
    );
  if (!DATE.test(input?.startDate ?? "") || !TIME.test(input?.time ?? ""))
    errors.push(refuse("Inserisci prima data e ora.", "Enter the first date and time."));
  const seats = parseSeats(input?.seats);
  if (seats === undefined)
    errors.push(
      refuse(
        `Posti: un numero da 1 a ${MAX_SEATS}, oppure vuoto per nessun limite.`,
        `Seats: a number from 1 to ${MAX_SEATS}, or empty for no limit.`,
      ),
    );
  const dates = errors.length ? [] : seriesDates({ ...input, count });
  for (const date of dates)
    for (const issue of date.errors)
      errors.push(
        refuse(
          `${date.localTime.replace("T", " ")}: ${issue.it}`,
          `${date.localTime.replace("T", " ")}: ${issue.en}`,
        ),
      );
  if (dates[0]?.startsAt && Date.parse(dates[0].startsAt) <= now)
    errors.push(
      refuse(
        "La prima data è già passata: una serie parte da una data futura.",
        "The first date has passed: a series starts from a future date.",
      ),
    );
  return { valid: errors.length === 0, errors, dates, title, seats: seats ?? null, count };
}
export function parseSeats(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= MAX_SEATS ? n : undefined;
}

// ---------------------------------------------------------------------------------------
// People

const organizer = (state, viewer) => canOrganizeSessions(state, state.campaign?.id, viewer);
function requireOrganizer(state, viewer) {
  if (!organizer(state, viewer))
    throw refuse(
      "Solo chi organizza le sessioni può farlo.",
      "Only whoever organizes the sessions can do this.",
    );
}
function requireMember(state, viewer) {
  if (!isCampaignMember(state, state.campaign?.id, viewer))
    throw refuse("Non fai parte di questa campagna.", "You are not in this campaign.");
}
export function knownGuests(state, campaignId = state.campaign?.id) {
  return clone(sliceOf(state).guests?.[campaignId] ?? []);
}
/** Players (members who do not organize) and the guests invited to this session. */
export function sessionParticipants(state, sessionId) {
  const cid = state.campaign?.id;
  const members = campaignMembers(state, cid);
  const memberIds = new Set(members.map((m) => m.id));
  const players = members
    .filter((m) => !canOrganizeSessions(state, cid, m.id) && m.role !== "observer")
    .map((m) => ({ id: m.id, kind: "member", name: m.name }));
  const guests = knownGuests(state, cid);
  const invited = (sliceOf(state).sessionMeta[sessionId]?.guests ?? [])
    .filter((id) => !memberIds.has(id))
    .map((id) => guests.find((g) => g.id === id))
    .filter(Boolean)
    .map((g) => ({ id: g.id, kind: "guest", name: g.name }));
  return [...players, ...invited];
}
export function organizers(state) {
  const cid = state.campaign?.id;
  return campaignMembers(state, cid)
    .filter((m) => canOrganizeSessions(state, cid, m.id))
    .map((m) => ({ id: m.id, kind: "organizer", name: m.name }));
}
function addGuest(state, name) {
  const cid = state.campaign.id;
  const clean = text(name, 60);
  if (!clean) return null;
  const slice = writable(state);
  const rows = (slice.guests[cid] ??= []);
  const same = rows.find((g) => g.name.toLocaleLowerCase() === clean.toLocaleLowerCase());
  if (same) return same.id;
  const base =
    clean
      .normalize("NFD")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 40) || "ospite";
  let id = `guest-${base}`;
  for (let n = 2; rows.some((g) => g.id === id); n++) id = `guest-${base}-${n}`;
  rows.push({ id, name: clean });
  return id;
}
function guestIds(state, ids, newGuest) {
  const known = new Set(knownGuests(state).map((g) => g.id));
  const chosen = [...new Set(list(ids).map(String))].filter((id) => known.has(id));
  const added = newGuest ? addGuest(state, newGuest) : null;
  if (added && !chosen.includes(added)) chosen.push(added);
  return chosen;
}

// ---------------------------------------------------------------------------------------
// Core sessions, through the campaign's own draft service

const sessionById = (state, id) => state.campaign?.sessions?.find((row) => row.id === id) ?? null;
function coreCommand(state, kind, { sessionId = null, data }, viewer) {
  const draftId = `sp-${kind}-${uid()}`;
  createSessionDraft(state, { id: draftId, kind, sessionId }, viewer);
  saveSessionDraft(state, draftId, { data }, viewer);
  const preview = previewSessionDraft(state, draftId, viewer);
  if (!preview.canApply) {
    const issue = preview.errors[0] ?? {};
    throw refuse(issue.it ?? "Sessione non disponibile.", issue.en ?? "Session unavailable.");
  }
  return applySessionDraft(state, draftId, { reviewKey: preview.reviewKey }, viewer);
}
function resolveOrRefuse(localTime, timeZone) {
  const resolution = resolveSessionTime({ localTime, timeZone });
  if (!resolution.valid) {
    const issue = resolution.errors[0];
    throw refuse(
      `${localTime.replace("T", " ")}: ${issue.it}`,
      `${localTime.replace("T", " ")}: ${issue.en}`,
    );
  }
  return resolution.startsAt;
}
function snapshot(state, session) {
  const meta = sliceOf(state).sessionMeta[session.id] ?? {};
  return {
    title: session.title ?? "",
    localTime: session.localTime ?? null,
    timeZone: session.timeZone ?? null,
    startsAt: session.startsAt ?? null,
    status: session.status === "cancelled" ? "cancelled" : "scheduled",
    seats: meta.seats ?? null,
    guests: clone(meta.guests ?? []),
  };
}
const started = (session, now) =>
  session?.played === true ||
  (typeof session?.startsAt === "string" && Date.parse(session.startsAt) <= now);
function log(state, entry, now) {
  const slice = writable(state);
  slice.log.push({ id: `log-${uid()}`, at: iso(now), ...entry });
  if (slice.log.length > LOG_MAX) slice.log.splice(0, slice.log.length - LOG_MAX);
}
function metaFor(state, sessionId) {
  const slice = writable(state);
  return (slice.sessionMeta[sessionId] ??= {
    seriesId: null,
    index: null,
    seats: null,
    guests: [],
  });
}

// ---------------------------------------------------------------------------------------
// Series: batch creation, edits of one or every future date, cancellation, correction

/**
 * Creates a series and its dates as ordinary campaign sessions (StartPlaying batch,
 * SVC-048/049). All dates are validated first: nothing is created if one is invalid.
 */
export function createSeries(state, input, viewer, now = Date.now()) {
  const preview = previewSeries(state, input, viewer, now);
  if (!preview.valid) throw preview.errors[0];
  const slice = writable(state);
  const seriesId = `series-${uid()}`;
  const guests = guestIds(state, input.guests, input.newGuest);
  const sessionIds = preview.dates.map((date) => {
    const result = coreCommand(
      state,
      "direct",
      {
        data: {
          title: preview.title,
          localTime: date.localTime,
          timeZone: input.timeZone,
          selectedInstant: date.startsAt,
        },
      },
      viewer,
    );
    slice.sessionMeta[result.sessionId] = {
      seriesId,
      index: date.index,
      seats: preview.seats,
      guests: clone(guests),
    };
    return result.sessionId;
  });
  slice.series.push({
    id: seriesId,
    campaignId: state.campaign.id,
    title: preview.title,
    frequency: input.frequency,
    startDate: input.startDate,
    time: input.time,
    timeZone: input.timeZone,
    count: preview.count,
    seats: preview.seats,
    guests,
    sessionIds,
    createdBy: viewer,
    createdAt: iso(now),
    status: "active",
  });
  log(state, { kind: "series", seriesId, by: viewer, sessionIds: clone(sessionIds) }, now);
  return seriesId;
}
export function seriesOf(state, sessionId) {
  const meta = sliceOf(state).sessionMeta[sessionId];
  if (!meta?.seriesId) return null;
  const series = sliceOf(state).series.find((row) => row.id === meta.seriesId);
  return series ? { series: clone(series), index: meta.index } : null;
}
/** The dates an edit reaches: this one, or this and every later open date of its series. */
export function editTargets(state, sessionId, scope, now = Date.now()) {
  const session = sessionById(state, sessionId);
  if (!session) return [];
  if (scope !== "future") return [session];
  const found = seriesOf(state, sessionId);
  if (!found) return [session];
  return found.series.sessionIds
    .map((id) => sessionById(state, id))
    .filter(
      (row) =>
        row &&
        (sliceOf(state).sessionMeta[row.id]?.index ?? 0) >= found.index &&
        row.status === "scheduled" &&
        !started(row, now),
    );
}
function changeFacts(before, after) {
  const facts = [];
  if (before.startsAt !== after.startsAt) facts.push("time");
  if (before.title !== after.title) facts.push("title");
  if (before.seats !== after.seats) facts.push("seats");
  if (JSON.stringify(before.guests) !== JSON.stringify(after.guests)) facts.push("guests");
  if (before.status !== after.status) facts.push("status");
  return facts;
}
function recordChange(state, change) {
  const slice = writable(state);
  slice.changes.push(change);
  if (slice.changes.length > CHANGES_MAX)
    slice.changes.splice(0, slice.changes.length - CHANGES_MAX);
  return change.id;
}
// Moves, renames and seat/guest changes of one session, through the core for the first two.
function applySnapshot(state, session, target, viewer, now, reason) {
  const before = snapshot(state, session);
  const coreFields =
    target.title !== before.title ||
    target.localTime !== before.localTime ||
    target.timeZone !== before.timeZone ||
    (target.status === "scheduled" && before.status === "cancelled");
  if (target.status === "cancelled" && before.status !== "cancelled")
    coreCommand(state, "cancel", { sessionId: session.id, data: { reason } }, viewer);
  else if (coreFields && target.status === "scheduled")
    coreCommand(
      state,
      "change",
      {
        sessionId: session.id,
        data: {
          title: target.title,
          localTime: target.localTime,
          timeZone: target.timeZone,
          selectedInstant: resolveOrRefuse(target.localTime, target.timeZone),
        },
      },
      viewer,
    );
  const meta = metaFor(state, session.id);
  meta.seats = target.seats;
  meta.guests = clone(target.guests);
  const after = snapshot(state, sessionById(state, session.id));
  // A moved session asks again (the fix to SVC-053): old answers stop counting because
  // each answer is bound to the instant it was given for. A restored date asks again as
  // well: answers given before the cancellation no longer count (B24 announces it as a
  // new session).
  const restored = before.status === "cancelled" && after.status === "scheduled";
  if (restored) meta.reaskAt = iso(now);
  if ((before.startsAt !== after.startsAt || restored) && after.status === "scheduled")
    log(
      state,
      {
        kind: "reask",
        sessionId: session.id,
        from: before.startsAt,
        to: after.startsAt,
        by: viewer,
      },
      now,
    );
  promote(state, session.id, now, viewer);
  return { before, after };
}

/**
 * Edits one date or every future date of its series (Discord SVC-056 for all, StartPlaying
 * SVC-053 for one). For "future" a new date shifts every later date by the same days.
 * Input: {sessionId, scope: "one"|"future", title, date, time, seats, guests, newGuest}.
 */
export function editSessions(state, input, viewer, now = Date.now()) {
  requireOrganizer(state, viewer);
  const session = sessionById(state, input?.sessionId);
  if (!session || session.status !== "scheduled")
    throw refuse("Sessione non modificabile.", "This session cannot be edited.");
  if (started(session, now))
    throw refuse(
      "La sessione è già iniziata: registra le presenze invece di spostarla.",
      "The session has already started: record attendance instead of moving it.",
    );
  const scope = input.scope === "future" && seriesOf(state, session.id) ? "future" : "one";
  const title = text(input.title, TITLE_MAX);
  // Seats and guests left out of the input stay as each date has them.
  const keepSeats = input.seats === undefined;
  const seats = keepSeats ? null : parseSeats(input.seats);
  if (seats === undefined)
    throw refuse(
      `Posti: un numero da 1 a ${MAX_SEATS}, oppure vuoto per nessun limite.`,
      `Seats: a number from 1 to ${MAX_SEATS}, or empty for no limit.`,
    );
  const date = DATE.test(input.date ?? "") ? input.date : dateOf(session.localTime);
  const time = TIME.test(input.time ?? "") ? input.time : timeOf(session.localTime);
  if (!DATE.test(date) || !TIME.test(time))
    throw refuse("Data o ora non valide.", "Invalid date or time.");
  const shift = daysBetween(dateOf(session.localTime), date);
  const keepGuests = input.guests === undefined && !input.newGuest;
  const guests = keepGuests ? null : guestIds(state, input.guests, input.newGuest);
  const targets = editTargets(state, session.id, scope, now);
  const plans = targets.map((row) => {
    const localTime =
      row.id === session.id
        ? `${date}T${time}`
        : `${addDays(dateOf(row.localTime), shift)}T${time}`;
    const current = snapshot(state, row);
    return {
      row,
      target: {
        title: title || current.title,
        localTime,
        timeZone: row.timeZone,
        status: "scheduled",
        seats: keepSeats ? current.seats : seats,
        guests: keepGuests ? current.guests : guests,
      },
    };
  });
  // Every date is checked before anything changes: it must exist and still be ahead
  // (a date moved into the past would silently count as started).
  for (const plan of plans)
    if (Date.parse(resolveOrRefuse(plan.target.localTime, plan.target.timeZone)) <= now)
      throw refuse(
        `${plan.target.localTime.replace("T", " ")}: la nuova data è già passata. Scegli un momento futuro.`,
        `${plan.target.localTime.replace("T", " ")}: the new date has already passed. Choose a future time.`,
      );
  const before = {},
    after = {};
  for (const plan of plans) {
    const result = applySnapshot(state, plan.row, plan.target, viewer, now, "");
    before[plan.row.id] = result.before;
    after[plan.row.id] = result.after;
  }
  const facts = [
    ...new Set(Object.keys(before).flatMap((sid) => changeFacts(before[sid], after[sid]))),
  ];
  if (!facts.length) throw refuse("Nessuna modifica da applicare.", "There is nothing to change.");
  const found = seriesOf(state, session.id);
  if (scope === "future" && found) {
    const series = writable(state).series.find((row) => row.id === found.series.id);
    if (title) series.title = title;
    series.time = time;
    if (!keepSeats) series.seats = seats;
    if (!keepGuests) series.guests = clone(guests);
  }
  return recordChange(state, {
    id: `change-${uid()}`,
    seriesId: found?.series.id ?? null,
    kind: "edit",
    scope,
    sessionIds: Object.keys(before),
    at: iso(now),
    by: viewer,
    reason: "",
    summary: {
      facts,
      count: Object.keys(before).length,
      time,
      date: scope === "one" ? date : null,
      seats: keepSeats ? null : seats,
      shift,
    },
    before,
    after,
    revertsId: null,
    revertedBy: null,
  });
}

/** Cancels one date or every future date of the series (ending it). Records are kept. */
export function cancelSessions(state, input, viewer, now = Date.now()) {
  requireOrganizer(state, viewer);
  const session = sessionById(state, input?.sessionId);
  if (!session || session.status !== "scheduled")
    throw refuse(
      "Sessione già annullata o non disponibile.",
      "Session already cancelled or unavailable.",
    );
  if (started(session, now))
    throw refuse("La sessione è già iniziata.", "The session has already started.");
  const scope = input.scope === "future" && seriesOf(state, session.id) ? "future" : "one";
  const reason = text(input.reason, NOTE_MAX);
  const before = {},
    after = {};
  for (const row of editTargets(state, session.id, scope, now)) {
    const result = applySnapshot(
      state,
      row,
      { ...snapshot(state, row), status: "cancelled" },
      viewer,
      now,
      reason,
    );
    before[row.id] = result.before;
    after[row.id] = result.after;
    log(state, { kind: "cancel", sessionId: row.id, by: viewer, reason }, now);
  }
  const found = seriesOf(state, session.id);
  if (scope === "future" && found)
    writable(state).series.find((row) => row.id === found.series.id).status = "ended";
  return recordChange(state, {
    id: `change-${uid()}`,
    seriesId: found?.series.id ?? null,
    kind: "cancel",
    scope,
    sessionIds: Object.keys(before),
    at: iso(now),
    by: viewer,
    reason,
    summary: { facts: ["status"], count: Object.keys(before).length },
    before,
    after,
    revertsId: null,
    revertedBy: null,
  });
}

const same = (a, b) =>
  a.startsAt === b.startsAt &&
  a.title === b.title &&
  a.status === b.status &&
  a.seats === b.seats &&
  JSON.stringify(a.guests) === JSON.stringify(b.guests);
/** Why a change cannot be corrected now, or null: later overlapping changes, drift, time. */
export function revertBlocker(state, changeId, now = Date.now()) {
  const slice = sliceOf(state);
  const index = slice.changes.findIndex((row) => row.id === changeId);
  const change = slice.changes[index];
  if (!change || change.kind === "revert" || change.revertedBy)
    return refuse("Questa modifica è già stata corretta.", "This change was already corrected.");
  const later = slice.changes
    .slice(index + 1)
    .some(
      (row) =>
        row.kind !== "revert" &&
        !row.revertedBy &&
        row.sessionIds.some((sid) => change.sessionIds.includes(sid)),
    );
  if (later)
    return refuse(
      "Una modifica successiva riguarda le stesse sessioni: correggi prima quella.",
      "A later change concerns the same sessions: correct that one first.",
    );
  for (const sid of change.sessionIds) {
    const session = sessionById(state, sid);
    if (!session || started(session, now))
      return refuse(
        "Alcune di queste sessioni sono già iniziate o non esistono più.",
        "Some of these sessions have already started or no longer exist.",
      );
    if (!same(snapshot(state, session), change.after[sid]))
      return refuse(
        "Le sessioni sono cambiate nel frattempo: modificale di nuovo invece di annullare.",
        "The sessions changed meanwhile: edit them again instead of undoing.",
      );
    const earlier = change.before[sid];
    if (
      earlier?.status === "scheduled" &&
      typeof earlier.startsAt === "string" &&
      Date.parse(earlier.startsAt) <= now
    )
      return refuse(
        "La data di prima è già passata: modifica la sessione invece di annullare.",
        "The earlier date has passed: edit the session instead of undoing.",
      );
  }
  return null;
}
/** The latest change of a series (or of one session) that can still be corrected. */
export function revertibleChange(
  state,
  { seriesId = null, sessionId = null } = {},
  now = Date.now(),
) {
  const rows = sliceOf(state).changes.filter(
    (row) =>
      row.kind !== "revert" &&
      !row.revertedBy &&
      (seriesId ? row.seriesId === seriesId : row.sessionIds.includes(sessionId)),
  );
  const last = rows.at(-1);
  return last && !revertBlocker(state, last.id, now) ? clone(last) : null;
}
/** Explicit correction: restores what a change replaced, as a new recorded change. */
export function revertChange(state, changeId, viewer, now = Date.now()) {
  requireOrganizer(state, viewer);
  const blocker = revertBlocker(state, changeId, now);
  if (blocker) throw blocker;
  const slice = writable(state);
  const change = slice.changes.find((row) => row.id === changeId);
  const before = {},
    after = {};
  for (const sid of change.sessionIds) {
    const result = applySnapshot(
      state,
      sessionById(state, sid),
      change.before[sid],
      viewer,
      now,
      "",
    );
    before[sid] = result.before;
    after[sid] = result.after;
  }
  if (change.kind === "cancel" && change.seriesId) {
    const series = slice.series.find((row) => row.id === change.seriesId);
    if (series) series.status = "active";
  }
  if (change.kind === "restore" && change.seriesId && change.summary?.seriesStatus) {
    const series = slice.series.find((row) => row.id === change.seriesId);
    if (series) series.status = change.summary.seriesStatus === "ended" ? "ended" : "active";
  }
  if (change.scope === "future" && change.kind === "edit" && change.seriesId) {
    const series = slice.series.find((row) => row.id === change.seriesId);
    const first = change.before[change.sessionIds[0]];
    if (series && first) {
      series.title = first.title;
      series.time = timeOf(first.localTime);
      series.seats = first.seats;
      series.guests = clone(first.guests);
    }
  }
  const id = recordChange(state, {
    id: `change-${uid()}`,
    seriesId: change.seriesId,
    kind: "revert",
    scope: change.scope,
    sessionIds: clone(change.sessionIds),
    at: iso(now),
    by: viewer,
    reason: "",
    summary: { facts: clone(change.summary?.facts ?? []), count: change.sessionIds.length },
    before,
    after,
    revertsId: change.id,
    revertedBy: null,
  });
  change.revertedBy = id;
  return id;
}

/** Brings back one cancelled date that has not started yet (a correction of its own). */
export function restoreSession(state, sessionId, viewer, now = Date.now()) {
  requireOrganizer(state, viewer);
  const session = sessionById(state, sessionId);
  if (!session || session.status !== "cancelled" || !session.localTime)
    throw refuse("Nessuna sessione annullata da ripristinare.", "No cancelled session to restore.");
  if (started(session, now)) throw refuse("La data è già passata.", "The date has already passed.");
  const found = seriesOf(state, sessionId);
  const seriesStatus = found?.series.status ?? null;
  const result = applySnapshot(
    state,
    session,
    { ...snapshot(state, session), status: "scheduled" },
    viewer,
    now,
    "",
  );
  if (found) writable(state).series.find((row) => row.id === found.series.id).status = "active";
  log(state, { kind: "restore", sessionId, by: viewer }, now);
  return recordChange(state, {
    id: `change-${uid()}`,
    seriesId: found?.series.id ?? null,
    kind: "restore",
    scope: "one",
    sessionIds: [sessionId],
    at: iso(now),
    by: viewer,
    reason: "",
    summary: { facts: ["status"], count: 1, seriesStatus },
    before: { [sessionId]: result.before },
    after: { [sessionId]: result.after },
    revertsId: null,
    revertedBy: null,
  });
}

/** Seats and guests of a date without a series (its time stays with the core editor). */
export function setSeats(state, input, viewer, now = Date.now()) {
  requireOrganizer(state, viewer);
  const session = sessionById(state, input?.sessionId);
  if (!session || session.status !== "scheduled" || started(session, now))
    throw refuse("Sessione non modificabile.", "This session cannot be edited.");
  return editSessions(
    state,
    {
      sessionId: session.id,
      scope: "one",
      title: session.title,
      date: dateOf(session.localTime),
      time: timeOf(session.localTime),
      seats: input.seats,
      guests: input.guests,
      newGuest: input.newGuest,
    },
    viewer,
    now,
  );
}

// ---------------------------------------------------------------------------------------
// Answers, seats and the waitlist

/** A person's answer for the session as it is now: an answer for another instant is stale. */
// P9 CA-43: an answer given in the availability poll for the confirmed date is the first
// RSVP (Rallly), until the person answers here or the date moves.
const FROM_POLL = { yes: "attending", maybe: "maybe", no: "skipping" };
export function answerOf(state, session, personId) {
  const row = sliceOf(state).rsvps[session?.id]?.[personId];
  if (!row) {
    const carried = session?.pollAnswers?.[personId];
    if (carried && FROM_POLL[carried] && session.pollAnswersFor === session.startsAt)
      return {
        status: FROM_POLL[carried],
        stale: false,
        previous: null,
        note: "",
        late: false,
        fromPoll: true,
      };
    return { status: null, stale: false, previous: null, note: "", late: false };
  }
  const reaskAt = sliceOf(state).sessionMeta[session.id]?.reaskAt;
  if (row.startsAt !== session.startsAt || (reaskAt && Date.parse(row.at) < Date.parse(reaskAt)))
    return {
      status: null,
      stale: true,
      why: row.startsAt !== session.startsAt ? "moved" : "restored",
      previous: row.status,
      note: row.note,
      late: false,
      at: row.at,
    };
  return {
    status: row.status,
    stale: false,
    previous: null,
    note: row.note,
    late: row.late,
    at: row.at,
    by: row.by,
    waitSince: row.waitSince,
  };
}
export function seatsOf(state, sessionId) {
  return sliceOf(state).sessionMeta[sessionId]?.seats ?? null;
}
/** Counts and the FIFO waitlist (Warhorn SVC-009: first come, never reordered). */
export function seatCounts(state, sessionId) {
  const session = sessionById(state, sessionId);
  const people = session ? sessionParticipants(state, sessionId) : [];
  const counts = { attending: 0, maybe: 0, skipping: 0, waitlist: 0, none: 0 };
  const waiting = [];
  for (const person of people) {
    const answer = answerOf(state, session, person.id);
    if (!answer.status) counts.none++;
    else counts[answer.status]++;
    if (answer.status === "waitlist")
      waiting.push({ id: person.id, since: answer.waitSince ?? answer.at });
  }
  waiting.sort(
    (a, b) => String(a.since).localeCompare(String(b.since)) || a.id.localeCompare(b.id),
  );
  const seats = seatsOf(state, sessionId);
  return {
    ...counts,
    seats,
    free: seats === null ? Infinity : Math.max(0, seats - counts.attending),
    waitlist: waiting.map((row) => row.id),
  };
}
// Fills free seats from the waitlist in arrival order; each promoted person gets a notice.
function promote(state, sessionId, now, by) {
  const slice = writable(state);
  const session = sessionById(state, sessionId);
  if (!session || session.status !== "scheduled" || started(session, now)) return [];
  const promoted = [];
  let counts = seatCounts(state, sessionId);
  while (counts.free > 0 && counts.waitlist.length) {
    const personId = counts.waitlist[0];
    const row = slice.rsvps[sessionId][personId];
    row.status = "attending";
    row.waitSince = null;
    log(
      state,
      { kind: "promote", sessionId, personId, from: "waitlist", to: "attending", by },
      now,
    );
    promoted.push(personId);
    counts = seatCounts(state, sessionId);
  }
  return promoted;
}
function setAnswer(state, session, personId, status, { by, now, note, reason = "" }) {
  const slice = writable(state);
  const before = answerOf(state, session, personId);
  const hoursLeft = (Date.parse(session.startsAt) - now) / HOUR;
  // StartPlaying's 24 h cut-off is a warning here (census C23): the answer is recorded.
  const late = status !== "attending" && hoursLeft < LATE_HOURS;
  let stored = status;
  if (status === "attending") {
    if (["attending", "waitlist"].includes(before.status)) stored = before.status;
    else if (seatCounts(state, session.id).free <= 0) stored = "waitlist";
  }
  const previous = slice.rsvps[session.id]?.[personId];
  (slice.rsvps[session.id] ??= {})[personId] = {
    status: stored,
    startsAt: session.startsAt,
    at: iso(now),
    by,
    note: note === undefined ? (before.stale ? "" : (previous?.note ?? "")) : text(note, NOTE_MAX),
    waitSince:
      stored === "waitlist"
        ? before.status === "waitlist"
          ? (previous?.waitSince ?? iso(now))
          : iso(now)
        : null,
    late,
  };
  if (before.status !== stored)
    log(
      state,
      {
        kind: "rsvp",
        sessionId: session.id,
        personId,
        from: before.status,
        to: stored,
        by,
        reason,
        late,
        hoursLeft: late ? Math.max(0, Math.floor(hoursLeft)) : null,
      },
      now,
    );
  const promoted =
    before.status === "attending" && stored !== "attending"
      ? promote(state, session.id, now, by)
      : [];
  const counts = seatCounts(state, session.id);
  return {
    status: stored,
    late,
    hoursLeft: Math.max(0, hoursLeft),
    position: stored === "waitlist" ? counts.waitlist.indexOf(personId) + 1 : null,
    promoted,
  };
}
function answerable(state, sessionId, now) {
  const session = sessionById(state, sessionId);
  if (!session || session.status !== "scheduled" || !session.startsAt)
    throw refuse("Questa sessione non accetta risposte.", "This session does not take answers.");
  if (started(session, now))
    throw refuse(
      "La sessione è iniziata: ora contano le presenze registrate.",
      "The session has started: recorded attendance counts now.",
    );
  return session;
}
/** A player's own answer (Sesh buttons, StartPlaying "Skipping"). Never blocked late. */
export function respond(state, { sessionId, status, note }, viewer, now = Date.now()) {
  requireMember(state, viewer);
  if (!ANSWERS.includes(status)) throw refuse("Risposta non valida.", "Invalid answer.");
  const session = answerable(state, sessionId, now);
  if (!sessionParticipants(state, sessionId).some((p) => p.id === viewer))
    throw refuse(
      "Chi organizza guida la sessione e non occupa un posto.",
      "Organizers run the session and take no seat.",
    );
  return setAnswer(state, session, viewer, status, { by: viewer, now, note });
}
/** The organizer records an answer for someone else, with a reason (SVC-054). */
export function respondFor(
  state,
  { sessionId, personId, status, reason },
  viewer,
  now = Date.now(),
) {
  requireOrganizer(state, viewer);
  if (!ANSWERS.includes(status)) throw refuse("Risposta non valida.", "Invalid answer.");
  const why = text(reason, NOTE_MAX);
  if (!why)
    throw refuse(
      "Scrivi perché registri la risposta per conto di un altro.",
      "Say why you record the answer on someone else’s behalf.",
    );
  const session = answerable(state, sessionId, now);
  if (!sessionParticipants(state, sessionId).some((p) => p.id === personId))
    throw refuse("Questa persona non è fra i partecipanti.", "This person is not a participant.");
  return setAnswer(state, session, personId, status, { by: viewer, now, reason: why });
}
/** A message to the organizer on one's own current answer (visible to them and to you). */
export function setAnswerNote(state, { sessionId, note }, viewer, now = Date.now()) {
  requireMember(state, viewer);
  const session = sessionById(state, sessionId);
  if (!session || !answerOf(state, session, viewer).status)
    throw refuse("Rispondi prima alla sessione.", "Answer the session first.");
  writable(state).rsvps[sessionId][viewer].note = text(note, NOTE_MAX);
  log(state, { kind: "note", sessionId, personId: viewer, by: viewer }, now);
}

/** The next open session this person is expected at (StartPlaying "Change Attendance"). */
export function nextSessionFor(state, viewer, now = Date.now()) {
  return (
    (state.campaign?.sessions ?? [])
      .filter(
        (row) =>
          row.status === "scheduled" &&
          typeof row.startsAt === "string" &&
          Date.parse(row.startsAt) > now &&
          sessionParticipants(state, row.id).some((p) => p.id === viewer),
      )
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? null
  );
}

// ---------------------------------------------------------------------------------------
// Attendance (Sesh register SVC-061, Quest Portal story VTL-054)

/** Who the attendance sheet lists: organizers, participants and anyone who answered. */
export function attendanceRoster(state, sessionId) {
  const people = [...organizers(state), ...sessionParticipants(state, sessionId)];
  const seen = new Set(people.map((p) => p.id));
  const guests = knownGuests(state);
  for (const pid of Object.keys(sliceOf(state).rsvps[sessionId] ?? {}))
    if (!seen.has(pid)) {
      const guest = guests.find((g) => g.id === pid);
      people.push({ id: pid, kind: guest ? "guest" : "member", name: guest?.name ?? pid });
      seen.add(pid);
    }
  return people;
}
/**
 * Who was at the Table for this session: the latest evening of B14 (session-view slice,
 * read only) linked to it, member by member, like Quest Portal's attendance from who
 * joined (VTL-054) and B14's own story. Presence there starts as "here", so a member is
 * absent only if marked away for the whole evening. Null when no evening is linked.
 */
export function tablePresence(state, sessionId) {
  const evenings = state?.ext?.["session-view"]?.sessions;
  if (!Array.isArray(evenings)) return null;
  const evening = evenings
    .filter((row) => isObject(row) && row.campaignSessionId === sessionId)
    .at(-1);
  if (!evening || !Array.isArray(evening.presence)) return null;
  const out = {};
  const rows = evening.presence
    .filter((row) => isObject(row) && idOk(row.memberId))
    .sort((a, b) => (Number(a.at) || 0) - (Number(b.at) || 0));
  for (const row of rows) {
    const entry = (out[row.memberId] ??= { present: false, message: "" });
    if (row.status === "here") entry.present = true;
    else if (row.status === "away" && typeof row.message === "string" && row.message.trim())
      entry.message = text(row.message, 80);
  }
  return out;
}
/**
 * Suggested sheet before anything is recorded: absent whoever said "Skip" or was away
 * for the whole evening at the Table (B14); present otherwise, organizers included.
 */
export function attendanceDraft(state, sessionId) {
  const session = sessionById(state, sessionId);
  const recorded = sliceOf(state).attendance[sessionId];
  const table = tablePresence(state, sessionId);
  return Object.fromEntries(
    attendanceRoster(state, sessionId).map((person) => {
      if (recorded?.records[person.id]) return [person.id, clone(recorded.records[person.id])];
      const answer = session ? answerOf(state, session, person.id) : { status: null };
      const away = table?.[person.id] && !table[person.id].present;
      const status = answer.status === "skipping" || away ? "absent" : "present";
      return [person.id, { status, note: "" }];
    }),
  );
}
export function canRecordAttendance(state, sessionId, now = Date.now()) {
  const session = sessionById(state, sessionId);
  return Boolean(session && session.status !== "cancelled" && started(session, now));
}
/** Records or corrects (with a reason) the attendance of a session that has started. */
export function recordAttendance(
  state,
  { sessionId, records: input, reason },
  viewer,
  now = Date.now(),
) {
  requireOrganizer(state, viewer);
  if (!canRecordAttendance(state, sessionId, now))
    throw refuse(
      "Le presenze si registrano da quando la sessione inizia.",
      "Attendance is recorded once the session starts.",
    );
  const roster = attendanceRoster(state, sessionId);
  const clean = {};
  for (const person of roster) {
    const row = input?.[person.id];
    if (!row || !ATTENDANCE.includes(row.status))
      throw refuse(
        `Indica se ${person.name === "Giocatore / Player" ? "il giocatore" : person.name} era presente.`,
        `Say whether ${person.name === "Giocatore / Player" ? "the player" : person.name} was present.`,
      );
    clean[person.id] = { status: row.status, note: text(row.note, NOTE_MAX) };
  }
  const slice = writable(state);
  const current = slice.attendance[sessionId];
  const why = text(reason, NOTE_MAX);
  if (current) {
    if (JSON.stringify(current.records) === JSON.stringify(clean))
      throw refuse("Nessuna differenza da correggere.", "Nothing differs to correct.");
    if (!why)
      throw refuse(
        "Scrivi il motivo della correzione.",
        "Say why you are correcting the attendance.",
      );
    current.history.push({
      revision: current.revision,
      at: current.at,
      by: current.by,
      reason: why,
      records: clone(current.records),
    });
    current.revision++;
    current.at = iso(now);
    current.by = viewer;
    current.records = clean;
  } else
    slice.attendance[sessionId] = {
      revision: 1,
      at: iso(now),
      by: viewer,
      records: clean,
      history: [],
    };
  log(
    state,
    {
      kind: "attendance",
      sessionId,
      by: viewer,
      reason: current ? why : "",
      revision: slice.attendance[sessionId].revision,
    },
    now,
  );
  return slice.attendance[sessionId].revision;
}
/** Attendance as a member may read it: statuses for everyone, notes only for organizers. */
export function attendanceFor(state, sessionId, viewer) {
  if (!isCampaignMember(state, state.campaign?.id, viewer)) return null;
  const row = sliceOf(state).attendance[sessionId];
  if (!row) return null;
  const full = organizer(state, viewer);
  const strip = (records) =>
    Object.fromEntries(
      Object.entries(records).map(([pid, r]) => [
        pid,
        { status: r.status, note: full ? r.note : "" },
      ]),
    );
  const names = new Map(attendanceRoster(state, sessionId).map((p) => [p.id, p]));
  return {
    revision: row.revision,
    at: row.at,
    by: row.by,
    people: Object.keys(row.records).map((pid) => ({
      id: pid,
      kind: names.get(pid)?.kind ?? "member",
      name: names.get(pid)?.name ?? pid,
      status: row.records[pid].status,
      note: full ? row.records[pid].note : "",
    })),
    corrections: row.history.map((entry) => ({
      revision: entry.revision,
      at: entry.at,
      by: entry.by,
      reason: full ? entry.reason : "",
      records: strip(entry.records),
    })),
  };
}

// ---------------------------------------------------------------------------------------
// Projections for rendering and notices

/** Everything the Sessions row shows, projected for one viewer. */
export function sessionView(state, sessionId, viewer, now = Date.now()) {
  const session = sessionById(state, sessionId);
  if (!session || !isCampaignMember(state, state.campaign?.id, viewer)) return null;
  const manage = organizer(state, viewer);
  const people = sessionParticipants(state, sessionId).map((person) => {
    const answer = answerOf(state, session, person.id);
    const own = person.id === viewer;
    return {
      ...person,
      answer: {
        status: answer.status,
        stale: answer.stale,
        why: answer.why ?? null,
        previous: own || manage ? answer.previous : null,
        late: answer.late,
        note: own || manage ? answer.note : "",
        recordedBy: answer.by && answer.by !== person.id ? answer.by : null,
        fromPoll: answer.fromPoll === true,
      },
    };
  });
  const counts = seatCounts(state, sessionId);
  const found = seriesOf(state, sessionId);
  const mine = people.find((p) => p.id === viewer) ?? null;
  const visibleLog = sliceOf(state)
    .log.filter((row) => row.sessionId === sessionId)
    .map((row) => ({
      ...clone(row),
      // The organizer's reasons about someone else stay private; a cancellation reason is
      // written for the whole group (as the core shows it in the B24 notice).
      reason: manage || row.personId === viewer || row.kind === "cancel" ? (row.reason ?? "") : "",
    }));
  return {
    session: clone(session),
    series: found ? { ...found.series, index: found.index } : null,
    seats: counts.seats,
    counts,
    people,
    mine,
    manage,
    open: session.status === "scheduled" && Boolean(session.startsAt) && !started(session, now),
    started: started(session, now),
    hoursLeft: session.startsAt ? (Date.parse(session.startsAt) - now) / HOUR : null,
    attendance: attendanceFor(state, sessionId, viewer),
    canRecord: manage && canRecordAttendance(state, sessionId, now),
    log: visibleLog,
  };
}

/**
 * Notices for the B24 centre, per viewer: a freed seat now yours (Sesh SVC-058), a moved
 * or restored session to answer again (fix to SVC-053), an answer an organizer recorded
 * for you (SVC-054), and for organizers the skips players record (a late one says so).
 * Structured facts; the entry module words them.
 */
export function noticesFor(state, viewer, now = Date.now()) {
  if (!isCampaignMember(state, state.campaign?.id, viewer)) return [];
  // One notice per session and person: the latest fact that still holds.
  const latest = new Map();
  const out = {
    push(notice) {
      latest.set(`${notice.kind}:${notice.session.id}:${notice.personId ?? viewer}`, notice);
    },
  };
  const slice = sliceOf(state);
  const manage = organizer(state, viewer);
  const open = (session) =>
    session &&
    session.status === "scheduled" &&
    session.startsAt &&
    Date.parse(session.startsAt) > now;
  for (const row of slice.log) {
    const session = sessionById(state, row.sessionId);
    if (!open(session)) continue;
    if (row.kind === "promote" && row.personId === viewer) {
      const answer = answerOf(state, session, viewer);
      if (answer.status === "attending")
        out.push({ kind: "promoted", id: row.id, session: clone(session), by: row.by, at: row.at });
    }
    if (row.kind === "rsvp" && row.personId === viewer && row.by !== viewer) {
      const answer = answerOf(state, session, viewer);
      // Only while that recorded answer still holds (answering yourself clears it).
      if (answer.by === row.by && answer.at === row.at)
        out.push({
          kind: "recorded",
          id: row.id,
          session: clone(session),
          status: answer.status,
          reason: row.reason ?? "",
          by: row.by,
          at: row.at,
        });
    }
    if (
      manage &&
      row.kind === "rsvp" &&
      row.by === row.personId &&
      ["skipping", "maybe"].includes(row.to)
    ) {
      const answer = answerOf(state, session, row.personId);
      if (answer.status === row.to)
        out.push({
          kind: row.to === "skipping" ? "skip" : "maybe",
          id: row.id,
          session: clone(session),
          personId: row.personId,
          late: row.late === true,
          hoursLeft: row.hoursLeft,
          note: answer.note,
          by: row.by,
          at: row.at,
        });
    }
  }
  for (const session of state.campaign?.sessions ?? []) {
    if (!open(session)) continue;
    const answer = answerOf(state, session, viewer);
    if (answer.stale && sessionParticipants(state, session.id).some((p) => p.id === viewer)) {
      const moved = slice.log.findLast(
        (row) => row.kind === "reask" && row.sessionId === session.id,
      );
      const reaskAt = slice.sessionMeta[session.id]?.reaskAt ?? "";
      out.push({
        kind: "reask",
        id: `${session.id}:${session.startsAt}${reaskAt ? `:${reaskAt}` : ""}`,
        session: clone(session),
        previous: answer.previous,
        why: answer.why,
        by: moved?.by ?? null,
        at: moved?.at ?? null,
      });
    }
  }
  return [...latest.values()];
}
