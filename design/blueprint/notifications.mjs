// B24 — Notification and request centre (SV-06, SV-07, SV-08).
//
// The header bell (the core "requests" service, replaced here) opens one centre that
// keeps the pending combat requests reachable and lists notifications derived from real
// state: roll and reaction requests, the start of one's own combat turn, scheduled/moved/
// cancelled sessions and availability polls, shared campaign materials and updates, reader
// invitations, @mentions, party rewards and trades, level-ups, opt-in session reminders
// and whatever other areas collect through the registry's `notifications` point.
//
// Patterns (census IDs): Kanka in-app notifications with a bell and read state (SVC-153);
// Fantasy Grounds per-user, per-category toasts with duration and position, turn changes
// among them (R20-176); Foundry toast notifications and the tray that briefly shows new
// items (FVT-193); StartPlaying cancellation notices (SVC-154); Scabard updates without
// secrets (CMP-228): an update is sent only when the text the reader can see changed; BG3
// party activity notices, trades and the rewards a character received (CRP-055, read from
// the B26 loot ledger); Sesh opt-in reminders (SVC-064). Session times follow the Sessions
// page (increment 7): the viewer's own time first, then the agreed time and zone.
// Mentions: the "@Name" syntax of Kanka entries (CMP-25, a link there, no notice) plus the
// ping of the named person that Foundry's Discord relay modules add (SVC-121, third-party
// modules). No census row shows an in-app notice for a mention in a campaign entry: that
// combination is our own integration. A mention is a mark on the one notice of the same
// material (an invitation, a share, an update), never a second notice: the notice stays in
// its own category and is also listed under Mentions, so muting one never hides the other.
// Character creation and level-up notices are our own addition (no census row).
// Nothing pops up until the person chooses it: every category starts in the centre only
// and every reminder starts off.
//
// Read markers and arrivals are per device and per identity (localStorage), like the chat's
// read markers (B17): reading is personal bookkeeping, not a game event, so it never writes
// to the shared game log, works offline and is untouched by gameplay Undo. Arrival times
// and the author of core requests without an explicit originator come from the same
// cache: there is no notification server.

import { projectAttempts, projectReactions } from "./combat.mjs";
import { openCombatRequests, pendingCombatCount } from "./combat-ui.mjs";
import { canControlActor, canViewActor } from "./character-access.mjs";
import { combatTurnKey } from "./conditions.mjs";
import { dcVisibleTo, dcSetterOf } from "./chat-domain.mjs";
import { listCampaignSessions, listSessionPolls } from "./campaign-sessions.mjs";
import {
  campaignMembers,
  getCampaignEntry,
  isCampaignMember,
  listCampaignEntries,
} from "./campaign-content.mjs";

const ID = "notifications";
const ROLES = ["player", "dm"];
const HOUR = 3600e3;
const REMINDER_WINDOW = 3 * HOUR; // a reminder stays listed until 3 hours after the start
const MAX_READ = 500;
const MAX_ARRIVALS = 400;
const MAX_TOASTS = 3;
const ARRIVALS_KEY = "d20-studio-notifications:arrivals:v1";
const READ_KEY = "d20-studio-notifications:read:v1";
const text = (it, en) => ({ it, en });

export const CATEGORIES = Object.freeze([
  { id: "requests", label: text("Richieste di tiro", "Roll requests"), icon: "dice" },
  { id: "turns", label: text("Turni di combattimento", "Combat turns"), icon: "sword" },
  { id: "sessions", label: text("Sessioni", "Sessions"), icon: "clock" },
  { id: "reminders", label: text("Promemoria", "Reminders"), icon: "bell" },
  { id: "invites", label: text("Inviti", "Invitations"), icon: "person" },
  { id: "handouts", label: text("Materiali condivisi", "Shared materials"), icon: "book" },
  { id: "mentions", label: text("Menzioni", "Mentions"), icon: "note" },
  { id: "party", label: text("Attività del gruppo", "Party activity"), icon: "flag" },
  { id: "chat", label: text("Chat e discussioni", "Chat and discussions"), icon: "note" },
  { id: "safety", label: text("Sicurezza del tavolo", "Table safety"), icon: "eye" },
  { id: "other", label: text("Altre aree", "Other areas"), icon: "bell" },
]);
const CATEGORY_IDS = CATEGORIES.map((c) => c.id);
// Categories other areas may use under another name.
const SYNONYMS = {
  request: "requests",
  roll: "requests",
  rolls: "requests",
  reaction: "requests",
  turn: "turns",
  session: "sessions",
  schedule: "sessions",
  reminder: "reminders",
  invite: "invites",
  invitation: "invites",
  handout: "handouts",
  material: "handouts",
  share: "handouts",
  mention: "mentions",
  party: "party",
  activity: "party",
  reward: "party",
  loot: "party",
  chat: "chat",
  message: "chat",
  "table-log": "chat",
  "campaign-forum": "chat",
  safety: "safety",
};
// Areas that collect notices without a category: their contribution decides it.
const SOURCE_CATEGORIES = {
  "campaign-members-inbox": "invites", // B13 campaign invitations and membership decisions
  "handouts-notices": "handouts", // B15 materials shown by the DM
  "chat-unread": "chat", // B17 chat log and discussions
  "loot-available": "party", // B26 loot to share, BG3-style rewards
  "safety-alerts": "safety", // B27 anonymous safety signals
};
export const DELIVERY = Object.freeze([
  { value: "toast", label: text("Nel centro e come avviso", "In the centre and as a pop-up") },
  { value: "tray", label: text("Solo nel centro", "In the centre only") },
  { value: "off", label: text("Disattivata", "Off") },
]);
export const POSITIONS = Object.freeze([
  { value: "top-right", label: text("In alto a destra", "Top right") },
  { value: "top-left", label: text("In alto a sinistra", "Top left") },
  { value: "bottom-right", label: text("In basso a destra", "Bottom right") },
  { value: "bottom-left", label: text("In basso a sinistra", "Bottom left") },
]);
// Sesh-style reminders before or at the start (SVC-064), each an explicit personal choice.
export const REMINDER_LEADS = Object.freeze([
  { id: "remind-24h", ms: 24 * HOUR, label: text("24 ore prima", "24 hours before") },
  { id: "remind-1h", ms: HOUR, label: text("1 ora prima", "1 hour before") },
  { id: "remind-start", ms: 0, label: text("All’inizio", "At the start") },
]);

// ---------------------------------------------------------------------------------------
// Module memory: which notifications each identity has already been told about in this
// visit, the per-device arrival cache and read markers, the last "mark all" for its Undo,
// and UI state.
let api = null;
let deviceStorage; // undefined: the browser's localStorage (a test passes its own)
function storage() {
  if (deviceStorage !== undefined) return deviceStorage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}
function load(key) {
  try {
    const raw = JSON.parse(storage()?.getItem(key) ?? "{}");
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  } catch {
    return {};
  }
}
function save(key, value) {
  try {
    storage()?.setItem(key, JSON.stringify(value));
  } catch {
    // Storage off: the values stay in memory for this visit.
  }
}
const emptyRead = () => Object.fromEntries(ROLES.map((role) => [role, {}]));
// Read markers per identity: key → ISO time; anything else is dropped.
function loadRead() {
  const raw = load(READ_KEY);
  const read = emptyRead();
  for (const role of ROLES) {
    const source = raw[role];
    if (source && typeof source === "object" && !Array.isArray(source))
      for (const [key, value] of Object.entries(source))
        if (validTime(value)) read[role][key] = value;
  }
  return read;
}
const memory = {
  known: { player: null, dm: null },
  arrivals: load(ARRIVALS_KEY),
  read: loadRead(),
  undo: null,
  filter: "all",
  offlineSince: null,
  pendingRequests: null,
  deferred: [],
  timer: null,
  staleBadge: false,
};
function saveArrivals() {
  const entries = Object.entries(memory.arrivals);
  if (entries.length > MAX_ARRIVALS)
    memory.arrivals = Object.fromEntries(
      entries
        .sort((a, b) => String(b[1]?.time ?? "").localeCompare(String(a[1]?.time ?? "")))
        .slice(0, MAX_ARRIVALS),
    );
  // The cache is a convenience: without it, arrival times fall back to data times.
  save(ARRIVALS_KEY, memory.arrivals);
}
/** Test seam: the device storage for arrivals and read markers (both reload from it). */
export function setNotificationsStorage(value) {
  deviceStorage = value;
  memory.arrivals = load(ARRIVALS_KEY);
  memory.read = loadRead();
}
/** Test helper: forget this visit's memory (known sets, arrivals, read, undo, surface). */
export function resetNotificationsMemory({ keepArrivals = false } = {}) {
  memory.known = { player: null, dm: null };
  if (!keepArrivals) memory.arrivals = {};
  memory.read = emptyRead();
  memory.staleBadge = false;
  memory.undo = null;
  memory.filter = "all";
  memory.offlineSince = null;
  memory.pendingRequests = null;
  memory.deferred = [];
  surface?.clear();
  if (memorySurface) memorySurface.log.length = 0;
}

// ---------------------------------------------------------------------------------------
// Helpers.
const quote = (value, lang) => {
  const name = String(value ?? "").trim();
  if (!name) return lang === "en" ? "untitled" : "senza titolo";
  return lang === "en" ? `“${name}”` : `«${name}»`;
};
const both = (fn) => text(fn("it"), fn("en"));
const locale = (lang) => (lang === "en" ? "en-GB" : "it-IT");
const labelOf = (value, lang) =>
  value && typeof value === "object"
    ? value[lang] || value.it || value.en || ""
    : String(value ?? "");
const escapeRe = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Hoisted: the read markers are validated while the module memory is created.
function validTime(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}
/** The zone of this device, as the Sessions page shows it ("Nel tuo fuso"). */
export function deviceTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
function stamp(lang, iso, zone) {
  try {
    return new Intl.DateTimeFormat(locale(lang), {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: zone,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
// Same order as the Sessions page (increment 7): the viewer's own time first, then the
// agreed time and zone when they differ. `from` is the previous start of a moved session.
function when(lang, startsAt, agreedZone, viewerZone, from = null) {
  if (!validTime(startsAt)) return lang === "en" ? "date to be set" : "data da definire";
  const local = viewerZone || "UTC";
  const agreed = agreedZone || "UTC";
  const before = from && validTime(from) ? `${stamp(lang, from, local)} → ` : "";
  const own = `${before}${stamp(lang, startsAt, local)} · ${lang === "en" ? "your timezone" : "nel tuo fuso"} (${local})`;
  const other = stamp(lang, startsAt, agreed);
  return agreed === local || other === stamp(lang, startsAt, local)
    ? own
    : `${own} · ${lang === "en" ? "agreed time" : "ora concordata"} ${other} (${agreed})`;
}
export function relativeTime(lang, iso, now = Date.now()) {
  if (!validTime(iso)) return "";
  const seconds = (Date.parse(iso) - now) / 1000;
  const format = new Intl.RelativeTimeFormat(locale(lang), { numeric: "auto" });
  const size = Math.abs(seconds);
  if (size < 45) return format.format(0, "second");
  if (size < 3600) return format.format(Math.round(seconds / 60), "minute");
  if (size < 86400) return format.format(Math.round(seconds / 3600), "hour");
  return format.format(Math.round(seconds / 86400), "day");
}
function memberName(state, id, lang) {
  if (!id) return lang === "en" ? "Someone" : "Qualcuno";
  const member = campaignMembers(state).find((m) => m.id === id);
  const name = member?.name ?? (id === "dm" ? "DM" : id);
  // The demo member "Giocatore / Player" carries both languages.
  const parts = String(name).split(" / ");
  return parts.length === 2 ? (lang === "en" ? parts[1] : parts[0]) : name;
}
const KIND_LABELS = {
  attack: text("Attacco", "Attack"),
  save: text("Tiro salvezza", "Saving throw"),
  check: text("Prova", "Check"), // B34: a check the DM requested
  concentration: text("Concentrazione", "Concentration"),
  damage: text("Danni", "Damage"),
  "death-save": text("Tiro salvezza contro la morte", "Death saving throw"),
  medicine: text("Prova di Saggezza (Medicina)", "Wisdom (Medicine) check"),
  "stable-recovery": text("Recupero da stabile", "Stable recovery"),
};
const ENTRY_KINDS = {
  note: text("Nota", "Note"),
  world: text("Mondo", "World"),
  quest: text("Missione", "Quest"),
  recap: text("Resoconto", "Recap"),
};
const snippet = (value, max = 110) => {
  const flat = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
  return flat.length > max ? flat.slice(0, max - 1) + "…" : flat;
};

// ---------------------------------------------------------------------------------------
// Core sources. Each notice: {id, category, title:{it,en}, body?:{it,en}, time, by, target}.
// `by` is the identity that caused it when the data records one (null: the system, such as
// a reminder; undefined: unknown, resolved from the arrival); a notice caused by the viewer
// is never listed for the viewer.

// Who is asked to roll for a creature, as in a VTT roll request: a personal roll's owner;
// the players assigned to a DM-owned creature (Foundry: a player owner rolls for it, the GM
// only when no player owns it); otherwise the owner. The DM still reaches every
// controllable request from "Pending requests".
function rollers(actor, request = null) {
  if (request?.personal === true) return [request.owner];
  const owner = request?.owner ?? actor.owner;
  const players = (Array.isArray(actor.controllers) ? actor.controllers : []).filter(
    (id) => id !== "dm" && id !== owner && ROLES.includes(id),
  );
  return owner === "dm" && players.length ? players : [owner];
}
// A death save due at the start of a turn at 0 HP is asked by the rules (SRD 5.2.1 Death
// Saving Throws, EN 17–18 / IT 19–20), not by whoever ended the previous turn: nobody
// caused it, so even the person who pressed "End turn" is told.
const turnStartDeathSave = (request) =>
  request.kind === "death-save" && String(request.descriptorId ?? "").includes(":turn:");

function requestNotices(state, role) {
  const out = [];
  for (const attempt of projectAttempts(state, role)) {
    for (const request of attempt.requests ?? []) {
      if (request.status !== "pending") continue;
      const actor = state.actors?.[request.actorId];
      if (!actor) continue;
      if (!rollers(actor, request).includes(role)) continue;
      if (!canControlActor(actor, role, state)) continue;
      const kind = KIND_LABELS[request.kind] ?? KIND_LABELS.damage;
      const action = attempt.actionName ?? null;
      // C1 (FG hidden DC): a DC the DM set reads «CD nascosta» for players.
      const dcShown =
        !Number.isFinite(request.dc) ||
        !["save", "check"].includes(request.kind) ||
        dcVisibleTo(
          state,
          role,
          dcSetterOf(
            state,
            (state.combatAttempts ?? []).find((a) => a.id === attempt.id),
          ),
        );
      out.push({
        id: `roll:${attempt.id}:${request.id}`,
        category: "requests",
        // Unknown originator (undefined): the arrival records who caused it.
        by: turnStartDeathSave(request) ? null : (attempt.acceptedBy ?? undefined),
        time: null,
        title: both((l) => (l === "en" ? "Roll requested: " : "Tiro richiesto: ") + actor.name),
        body: both(
          (l) =>
            labelOf(kind, l) +
            (Number.isFinite(request.dc)
              ? dcShown
                ? (l === "en" ? " · DC " : " · CD ") + request.dc
                : l === "en"
                  ? " · DC hidden"
                  : " · CD nascosta"
              : "") +
            (action ? " · " + labelOf(action, l) : ""),
        ),
        target: { kind: "requests", attemptId: attempt.id },
      });
    }
  }
  for (const reaction of projectReactions(state, role)) {
    const actor = state.actors?.[reaction.actorId];
    if (reaction.status !== "pending" || !actor || !rollers(actor).includes(role)) continue;
    if (!canControlActor(actor, role, state)) continue;
    out.push({
      id: `reaction:${reaction.id}`,
      category: "requests",
      by: undefined,
      time: null,
      title: both(
        (l) => (l === "en" ? "Reaction available: " : "Reazione disponibile: ") + actor.name,
      ),
      body: both((l) => labelOf(reaction.triggerLabel, l)),
      target: { kind: "requests", attemptId: "" },
    });
  }
  return out;
}

// Fantasy Grounds turn-change toasts (R20-176): the person who plays the creature whose
// turn has started. Listed only while that turn lasts (the next turn replaces it), and a
// system notice (`by: null`): whoever pressed "End turn", the turn is still news. The DM
// is told of the characters they play, not of every monster they run.
function turnNotices(state, role) {
  const combat = state.combat;
  if (!combat?.active) return [];
  const actor = state.actors?.[combat.order?.[combat.turn]];
  if (!actor || !canControlActor(actor, role, state) || !rollers(actor).includes(role)) return [];
  if (role === "dm" && actor.kind !== "character") return [];
  return [
    {
      id: `turn:${combatTurnKey(combat)}`,
      category: "turns",
      by: null,
      time: null,
      title: both((l) => (l === "en" ? "Your turn: " : "È il tuo turno: ") + actor.name),
      body: text(`Round ${combat.round}`, `Round ${combat.round}`),
      target: { page: "table", params: {} },
    },
  ];
}

function sessionNotices(state, role, { now, reminders, timeZone }) {
  const out = [];
  const campaignId = state.campaign?.id;
  if (!campaignId || !isCampaignMember(state, campaignId, role)) return out;
  const target = { page: "campaign", params: { tab: "sessions" } };
  const sessions = listCampaignSessions(state, campaignId, role);
  for (const session of sessions) {
    const history = Array.isArray(session.history) ? session.history : [];
    const last = history.at(-1);
    if (!last || session.status === "unscheduled") continue;
    const previous = history.at(-2);
    const kind =
      session.status === "cancelled"
        ? "cancelled"
        : !previous || previous.status === "cancelled"
          ? "scheduled"
          : previous.startsAt !== session.startsAt
            ? "moved"
            : "changed";
    const titles = {
      scheduled: ["Nuova sessione: ", "New session: "],
      moved: ["Sessione spostata: ", "Session moved: "],
      changed: ["Sessione aggiornata: ", "Session updated: "],
      cancelled: ["Sessione annullata: ", "Session cancelled: "],
    }[kind];
    out.push({
      id: `session:${session.id}:${session.revision}`,
      sessionId: session.id,
      category: "sessions",
      by: last.changedBy ?? session.organizerId ?? null,
      time: last.createdAt ?? session.createdAt ?? null,
      title: both((l) => titles[l === "en" ? 1 : 0] + quote(session.title, l)),
      body: both((l) =>
        kind === "cancelled"
          ? session.cancellationReason
            ? (l === "en" ? "Reason: " : "Motivo: ") + snippet(session.cancellationReason)
            : l === "en"
              ? "No reason given"
              : "Nessun motivo indicato"
          : when(
              l,
              session.startsAt,
              session.timeZone,
              timeZone,
              kind === "moved" ? previous.startsAt : null,
            ),
      ),
      target,
    });
    // Opt-in reminders: only the latest reminder already due for this appointment.
    if (session.status !== "scheduled" || !validTime(session.startsAt)) continue;
    const start = Date.parse(session.startsAt);
    if (now >= start + REMINDER_WINDOW) continue;
    const due = REMINDER_LEADS.filter((lead) => reminders[lead.id] && now >= start - lead.ms).at(
      -1,
    );
    if (!due) continue;
    out.push({
      id: `reminder:${session.id}:${session.revision}:${due.id}`,
      sessionId: session.id,
      category: "reminders",
      by: null,
      time: new Date(start - due.ms).toISOString(),
      title: both((l) => (l === "en" ? "Reminder: " : "Promemoria: ") + quote(session.title, l)),
      body: both(
        (l) =>
          (now >= start
            ? l === "en"
              ? "Started "
              : "Iniziata "
            : l === "en"
              ? "Starts "
              : "Inizia ") +
          relativeTime(l, session.startsAt, now) +
          " · " +
          when(l, session.startsAt, session.timeZone, timeZone),
      ),
      target,
    });
  }
  for (const poll of listSessionPolls(state, campaignId, role)) {
    if (!poll.participants.includes(role) || poll.organizerId === role) continue;
    if (!["open", "confirmed"].includes(poll.status)) continue;
    const answered = Object.keys(poll.responses?.[role] ?? {}).length > 0;
    out.push({
      id: `poll:${poll.id}`,
      category: "sessions",
      by: poll.organizerId ?? null,
      time: poll.createdAt ?? null,
      title: both(
        (l) =>
          (l === "en" ? "Availability requested: " : "Disponibilità richiesta: ") +
          quote(poll.title, l),
      ),
      body: both((l) => {
        const count = poll.slots.length;
        const dates =
          l === "en"
            ? `${count} proposed date${count === 1 ? "" : "s"}`
            : `${count} ${count === 1 ? "data proposta" : "date proposte"}`;
        const status =
          poll.status === "confirmed"
            ? l === "en"
              ? "date confirmed"
              : "data confermata"
            : answered
              ? l === "en"
                ? "you answered"
                : "hai risposto"
              : l === "en"
                ? "waiting for your answer"
                : "attende la tua risposta";
        return `${dates} · ${status}`;
      }),
      target,
    });
  }
  return out;
}

const GROUP_MENTIONS = ["tutti", "all", "gruppo", "party", "everyone"];
// The reader's own names first (their characters, their member name), then the group
// aliases: a text naming both "@Livia" and "@tutti" is cited by "@Livia".
function mentionNames(state, role) {
  const names = new Set();
  for (const actor of Object.values(state.actors ?? {}))
    if (actor?.owner === role && typeof actor.name === "string" && canViewActor(actor, role, state))
      names.add(actor.name.trim());
  const member = campaignMembers(state).find((m) => m.id === role);
  for (const part of String(member?.name ?? "").split("/")) names.add(part.trim());
  for (const alias of GROUP_MENTIONS) names.add(alias);
  return [...names].filter(Boolean);
}
// "@Livia" in the readable text (Kanka's syntax, CMP-25) or a structured link to one of the
// reader's characters; telling the named person follows the Discord relay modules' ping
// (SVC-121). Only the reader's projection is searched: never a hidden section.
function findMention(state, role, data) {
  const texts = [
    data.title,
    data.body,
    ...(data.sections ?? []).flatMap((section) => [section.title, section.body]),
  ].map((value) => String(value ?? ""));
  for (const name of mentionNames(state, role)) {
    const pattern = new RegExp(
      "(^|[^\\p{L}\\p{N}_])@" + escapeRe(name) + "(?![\\p{L}\\p{N}_])",
      "iu",
    );
    for (const value of texts) {
      const match = pattern.exec(value);
      if (match) {
        const start = Math.max(0, match.index - 30);
        return { name, excerpt: snippet((start ? "…" : "") + value.slice(start), 110) };
      }
    }
  }
  const link = (data.links ?? []).find(
    (ref) => ref?.kind === "actor" && state.actors?.[ref.id]?.owner === role,
  );
  return link ? { name: state.actors[link.id].name, excerpt: "" } : null;
}

// Projections compared as data, whatever the key order of each saved revision.
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonical(value[key])]),
        )
      : value;
const sameProjection = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
// What this reader could read of an earlier revision (never a section hidden from them).
function projectionAt(state, entryId, role, revisionId) {
  try {
    return getCampaignEntry(state, entryId, role, { revisionId }).data;
  } catch {
    return null;
  }
}

function entryNotices(state, role) {
  const out = [];
  const raw = state.campaignContent?.entries ?? [];
  for (const entry of listCampaignEntries(state, {}, role)) {
    const source = raw.find((value) => value.id === entry.id);
    if (!source) continue;
    const current = source.revisions?.find((value) => value.id === source.currentRevisionId);
    const legacy = source.revisions?.[0]?.provenance?.kind === "legacy";
    const target = {
      page: entry.kind === "note" ? "notes" : "campaign",
      params: { id: entry.id, tab: "entry" },
    };
    const kindLabel = ENTRY_KINDS[entry.kind] ?? ENTRY_KINDS.note;
    const summary = (l, who) =>
      `${memberName(state, who, l)} · ${labelOf(kindLabel, l)}` +
      (entry.data.body ? ` · ${snippet(entry.data.body, 80)}` : "");
    // The current version, written by someone else: does it name this reader, and did the
    // text this reader can see change since the version they could already read?
    const byOther =
      Boolean(current) && current.authorId !== role && current.provenance?.kind !== "legacy";
    const mention = byOther ? findMention(state, role, entry.data) : null;
    const mentionBody = (l) =>
      `${l === "en" ? "Mention by" : "Menzione di"} ${memberName(state, current.authorId, l)}: @${mention.name}` +
      (mention.excerpt ? ` · ${mention.excerpt}` : "");
    let update = null;
    let updateNames = false; // the update itself introduced the mention
    if (byOther) {
      const previous = source.revisions.find((value) => value.id === current.parentRevisionId);
      const before =
        previous && (previous.audience ?? []).includes(role)
          ? projectionAt(state, entry.id, role, previous.id)
          : null;
      // Scabard (CMP-228): players hear of the GM's changes, never of the secrets. An edit
      // that only touched a section this reader cannot read is no notice at all.
      if (before && !sameProjection(before, entry.data)) {
        updateNames = Boolean(mention) && !findMention(state, role, before);
        update = {
          id: `update:${entry.id}:${current.id}`,
          category: "handouts",
          mention: updateNames ? mention : null,
          by: current.authorId ?? null,
          time: current.createdAt ?? null,
          title: both(
            (l) => (l === "en" ? "Updated: " : "Aggiornato: ") + quote(entry.data.title, l),
          ),
          body: both((l) => (updateNames ? mentionBody(l) : summary(l, current.authorId))),
          target,
        };
      }
    }
    // Access granted by someone else (owner sharing or a reader invitation). Content that
    // predates notifications (the legacy import, never re-shared) is not announced. A
    // mention in the text marks this notice (one notice per material, not two), unless
    // the update just introduced it; the notice keeps its own category.
    if (source.ownerId !== role && !(legacy && source.accessRevision === 0)) {
      const grant = (source.access?.grants ?? []).find((value) => value.id === role);
      const personal = Boolean(grant && (grant.read || grant.edit));
      const edit = entry.permissions?.canEdit === true;
      const named = Boolean(mention) && !updateNames;
      out.push({
        id: `share:${entry.id}:${edit ? "edit" : "read"}`,
        category: personal ? "invites" : "handouts",
        mention: named ? mention : null,
        by: source.ownerId,
        time: null,
        dataTime: current?.createdAt ?? null,
        title: both((l) =>
          personal
            ? (edit
                ? l === "en"
                  ? "Invitation to edit: "
                  : "Invito a modificare: "
                : l === "en"
                  ? "Invitation to read: "
                  : "Invito a leggere: ") + quote(entry.data.title, l)
            : (l === "en" ? "New shared material: " : "Nuovo materiale condiviso: ") +
              quote(entry.data.title, l),
        ),
        body: both((l) => (named ? mentionBody(l) : summary(l, source.ownerId))),
        target,
      });
    }
    if (update) out.push(update);
  }
  return out;
}

// BG3 party activity (CRP-055): the other members see the rewards a character received and
// a member's trades. Read from the B26 loot ledger (`state.ext.loot.ledger`), whose text
// every member already reads in the stash's "Loot log": nothing new is disclosed. An entry
// naming a creature the reader cannot see is skipped whole; DM-only entries stay the DM's.
const LEDGER_TITLES = {
  award: text("Ricompensa", "Reward"),
  "loot-assign": text("Bottino ricevuto", "Loot received"),
  "coins-split": text("Monete divise", "Coins shared out"),
  "loot-take-all": text("Bottino nella scorta del gruppo", "Loot to the party stash"),
  "loot-coins-stash": text("Bottino nella scorta del gruppo", "Loot to the party stash"),
  "stash-take": text("Preso dalla scorta del gruppo", "Taken from the party stash"),
  "stash-coins-out": text("Preso dalla scorta del gruppo", "Taken from the party stash"),
  "stash-deposit": text("Messo nella scorta del gruppo", "Put in the party stash"),
  "stash-coins-in": text("Messo nella scorta del gruppo", "Put in the party stash"),
  trade: text("Scambio con un mercante", "Trade with a merchant"),
};
const RECENT_LEDGER = 50; // the centre lists the latest entries; the full log stays in B26
function rewardNotices(state, role) {
  const loot = state.ext?.loot;
  const ledger = Array.isArray(loot?.ledger) ? loot.ledger : [];
  if (!ledger.length || !isCampaignMember(state, state.campaign?.id, role)) return [];
  const out = [];
  for (const entry of ledger.slice(-RECENT_LEDGER)) {
    const title = LEDGER_TITLES[entry?.kind];
    if (!title || typeof entry.id !== "string" || !entry.text || typeof entry.text !== "object")
      continue;
    if (entry.dmOnly && role !== "dm") continue;
    const actors = (Array.isArray(entry.actorIds) ? entry.actorIds : []).map(
      (id) => state.actors?.[id],
    );
    if (actors.some((actor) => !actor || !canViewActor(actor, role, state))) continue;
    // The reader's own character when it is among them: that is the sheet they will open.
    const own = actors.find((actor) => rollers(actor).includes(role)) ?? actors[0];
    const award =
      entry.kind === "award" && Array.isArray(loot.awards)
        ? loot.awards.find((value) => value?.id === entry.awardId)
        : null;
    const xpOnly = award && !Object.values(award.share ?? {}).some((coins) => coins > 0);
    out.push({
      id: `reward:${entry.id}`,
      category: "party",
      by: typeof entry.by === "string" ? entry.by : null,
      time: validTime(entry.time) ? entry.time : null,
      title: both(
        (l) =>
          labelOf(title, l) + (actors.length ? ": " + actors.map((a) => a.name).join(", ") : ""),
      ),
      body: both(
        (l) =>
          labelOf(entry.text, l) +
          (entry.reason
            ? ` · ${l === "en" ? "Reason" : "Motivo"}: ${snippet(entry.reason, 80)}`
            : ""),
      ),
      // XP lives in the sheet's Features (Experience), items and coins in its Inventory;
      // the party stash alone is the campaign's Treasury.
      target: own
        ? { kind: "sheet", actorId: own.id, tab: xpOnly ? "features" : "inventory" }
        : { page: "campaign", params: { tab: "loot" } },
    });
  }
  return out;
}

// Our own addition (no census row): a character created or advanced by someone else.
function partyNotices(state, role) {
  const out = [];
  for (const op of state.characterBuildOperations ?? []) {
    if (!op || op.owner === role) continue;
    const actor = state.actors?.[op.actorId];
    if (!actor || !canViewActor(actor, role, state)) continue;
    const latest = actor.characterBuild?.revision === op.operationId;
    out.push({
      id: `party:${op.operationId}`,
      category: "party",
      by: op.owner ?? null,
      time: op.appliedAt ?? null,
      title: both((l) =>
        op.kind === "advance"
          ? (l === "en" ? "Level up: " : "Avanzamento di livello: ") + actor.name
          : (l === "en" ? "New character in the party: " : "Nuovo personaggio nel gruppo: ") +
            actor.name,
      ),
      body: both(
        (l) =>
          `${memberName(state, op.owner, l)}` +
          (latest && Number.isFinite(actor.level)
            ? ` · ${l === "en" ? "now level" : "ora al livello"} ${actor.level}`
            : ""),
      ),
      target: { kind: "sheet", actorId: actor.id },
    });
  }
  return out;
}

/** Every notice the core state holds for one identity (pure; `now` and reminders injected). */
export function deriveCoreNotifications(
  state,
  role,
  { now = Date.now(), reminders = {}, timeZone = deviceTimeZone() } = {},
) {
  if (!state || !ROLES.includes(role)) return [];
  return [
    ...requestNotices(state, role),
    ...turnNotices(state, role),
    ...sessionNotices(state, role, { now, reminders, timeZone }),
    ...entryNotices(state, role),
    ...rewardNotices(state, role),
    ...partyNotices(state, role),
  ];
}

// ---------------------------------------------------------------------------------------
// Preferences (personal scope: per identity, a local private commit, never undone).
const settingKey = (field) => `${ID}.${field}`;
// The shell's Preferences accept any number from 3 to 30 (its number fields have no
// step); the centre's own form asks for whole seconds. One rule for both: the stored value
// is read as whole seconds, so 4.5 reads as 5 and neither form is blocked by the other.
function wholeSeconds(value) {
  const seconds = Number(value);
  return Number.isFinite(seconds) ? Math.min(30, Math.max(3, Math.round(seconds))) : 6;
}
function setting(ctx, field, fallback) {
  try {
    return api ? api.getSetting(ctx, settingKey(field)) : fallback;
  } catch {
    return fallback;
  }
}
export function notificationPreferences(ctx) {
  return {
    categories: Object.fromEntries(
      CATEGORIES.map((c) => {
        const value = setting(ctx, `cat-${c.id}`, "tray");
        return [c.id, c.id === "requests" && value === "off" ? "tray" : value];
      }),
    ),
    position: setting(ctx, "position", "top-right"),
    duration: wholeSeconds(setting(ctx, "duration", 6)),
    reminders: Object.fromEntries(
      REMINDER_LEADS.map((lead) => [lead.id, setting(ctx, lead.id, false) === true]),
    ),
  };
}

// ---------------------------------------------------------------------------------------
// Read state: per device and identity, memory.read[role][key] = ISO time (READ_KEY).
function readMap(role) {
  return memory.read[role] ?? {};
}
function prune(map) {
  const entries = Object.entries(map);
  if (entries.length <= MAX_READ) return map;
  return Object.fromEntries(
    entries.sort((a, b) => String(b[1]).localeCompare(String(a[1]))).slice(0, MAX_READ),
  );
}
// Personal bookkeeping, like the chat's read markers (B17): no commit, so nothing reaches
// the shared game log; it works offline and gameplay Undo never touches it. The header
// badge is redrawn at once.
function writeRead(ctx, update) {
  memory.read[ctx.role] = prune(update({ ...readMap(ctx.role) }));
  save(READ_KEY, memory.read);
  ctx.render?.();
}

// ---------------------------------------------------------------------------------------
// The centre's model: every visible notice (core and other areas), personal preferences
// and read state for the current identity.
function normalize(entry) {
  const key = `${entry.source ?? ID}:${entry.id}`;
  const arrival = memory.arrivals[key];
  const category = CATEGORY_IDS.includes(entry.category)
    ? entry.category
    : (SYNONYMS[String(entry.category ?? "").toLowerCase()] ??
      SOURCE_CATEGORIES[entry.source] ??
      "other");
  return {
    key,
    id: entry.id,
    source: entry.source ?? ID,
    sourceLabel: entry.sourceLabel ?? null,
    category,
    // A notice of another category that names its reader is also listed under Mentions.
    mention: category !== "mentions" && Boolean(entry.mention),
    title: entry.title,
    body: entry.body ?? null,
    time: entry.time ?? arrival?.time ?? entry.dataTime ?? null,
    // Nobody is told of their own action. `by: null` is a system notice (a reminder).
    // Only the core's own sources without `by` (a roll request whose originator the data
    // does not record) take it from the arrival; another area's collector already chose
    // its audience, so its entry without `by` is shown to whoever it is collected for.
    by:
      entry.by !== undefined
        ? entry.by
        : (entry.source ?? ID) === ID
          ? (arrival?.by ?? null)
          : null,
    byDeclared: entry.by !== undefined,
    target: entry.target ?? null,
    // TV-69 (Improved Initiative / Effective Tray): a notice may carry its answer inline,
    // e.g. Accept / Decline on a player's proposal; each action runs the area's own command.
    actions: Array.isArray(entry.actions)
      ? entry.actions
          .filter((a) => a && typeof a.id === "string" && typeof a.run === "function" && a.label)
          .slice(0, 3)
      : [],
  };
}
// A notice of a session still to come carries «Aggiungi al calendario» when the calendar
// service (B55) is available: the same choices as the session's own menu (owner request
// 01/10/2026; Sesh and Discord event notices link to the event's calendar options).
function calendarAction(ctx, entry) {
  const service = entry.sessionId
    ? ctx.registry?.get?.("service", "integrations-add-to-calendar", ctx)
    : null;
  const session = service
    ? ctx.state.campaign?.sessions?.find((row) => row.id === entry.sessionId)
    : null;
  if (session?.status !== "scheduled" || !(Date.parse(session.startsAt) > Date.now())) return [];
  return [
    {
      id: "calendar",
      label: text("Aggiungi al calendario", "Add to calendar"),
      run: (context) => context.registry.run(service, context, entry.sessionId),
    },
  ];
}
function collectCore(ctx) {
  const prefs = notificationPreferences(ctx);
  return deriveCoreNotifications(ctx.state, ctx.role, { reminders: prefs.reminders }).map(
    (entry) => {
      const arrival = memory.arrivals[`${ID}:${entry.id}`];
      const actions = calendarAction(ctx, entry);
      // Requests and shares carry no timestamp in the data: the arrival in this browser.
      return {
        ...entry,
        ...(actions.length ? { actions } : {}),
        time: entry.time ?? arrival?.time ?? entry.dataTime ?? null,
      };
    },
  );
}
function allEntries(ctx) {
  const entries = api
    ? api.notifications(ctx)
    : collectCore(ctx).map((entry) => ({ ...entry, source: ID }));
  return entries.map(normalize);
}
// The categories a notice is listed under for this person: its own and, for a notice that
// names them, Mentions; minus those turned off. None left: the notice is hidden. It pops
// up when any of them is set to pop-ups.
function activeCategories(item, prefs) {
  return [item.category, ...(item.mention ? ["mentions"] : [])].filter(
    (id) => prefs.categories[id] !== "off",
  );
}
const popsUp = (item, prefs) => item.categories.some((id) => prefs.categories[id] === "toast");
const categoryOf = (id) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES.at(-1);
export function centreModel(ctx) {
  const prefs = notificationPreferences(ctx);
  const read = readMap(ctx.role);
  const items = allEntries(ctx)
    .filter((item) => item.by !== ctx.role)
    .map((item) => ({
      ...item,
      categories: activeCategories(item, prefs),
      read: Boolean(read[item.key]),
    }))
    .filter((item) => item.categories.length > 0)
    .sort(
      (a, b) =>
        String(b.time ?? "").localeCompare(String(a.time ?? "")) || a.key.localeCompare(b.key),
    );
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c.id, { total: 0, unread: 0 }]));
  for (const item of items)
    for (const id of item.categories) {
      counts[id].total++;
      if (!item.read) counts[id].unread++;
    }
  return {
    items,
    unread: items.filter((item) => !item.read).length,
    counts,
    prefs,
  };
}
/** The header bell's count: unread notices in categories the person keeps. */
export function unreadCount(ctx) {
  return centreModel(ctx).unread;
}

// ---------------------------------------------------------------------------------------
// Commands.
// The centre's live region is rendered once with the dialog, outside the part each action
// redraws, and filled after a short pause: a region inserted and filled in the same task
// is often not announced (NVDA, JAWS). The body-level region waits the same way.
function say(ctx, it, en) {
  const message = ctx.t(it, en);
  const live = globalThis.document?.querySelector?.("#dialog [data-notifications-live]");
  if (live) {
    live.textContent = "";
    setTimeout(() => (live.textContent = message), 60);
  }
  getSurface().announce(message, { inDialog: Boolean(live) });
  return message;
}
export function setNotificationRead(ctx, key, read = true) {
  const time = new Date().toISOString();
  memory.undo = null;
  writeRead(ctx, (map) => {
    if (read) map[key] = time;
    else delete map[key];
    return map;
  });
}
export function markAllNotificationsRead(ctx) {
  const model = centreModel(ctx);
  const keys = model.items.filter((item) => !item.read).map((item) => item.key);
  if (!keys.length) return 0;
  const previous = { ...readMap(ctx.role) };
  const time = new Date().toISOString();
  memory.undo = { role: ctx.role, previous, keys };
  writeRead(ctx, (map) => {
    for (const key of keys) map[key] = time;
    return map;
  });
  return keys.length;
}
export function undoMarkAllRead(ctx) {
  const undo = memory.undo;
  if (!undo || undo.role !== ctx.role) return false;
  memory.undo = null;
  writeRead(ctx, (map) => {
    for (const key of undo.keys) {
      if (undo.previous[key]) map[key] = undo.previous[key];
      else delete map[key];
    }
    return map;
  });
  return true;
}
/** Opens the notice's context and marks it read (Kanka/GitHub: the click is the reading). */
export function openNotification(ctx, key) {
  const item = centreModel(ctx).items.find((entry) => entry.key === key);
  if (!item) {
    ctx.toast(
      ctx.t(
        "Questa notifica non è più disponibile: la richiesta è stata risolta o ritirata.",
        "This notification is no longer available: the request was resolved or withdrawn.",
      ),
      true,
    );
    return false;
  }
  if (!item.read) setNotificationRead(ctx, key, true);
  const target = item.target ?? {};
  if (target.kind === "requests") {
    if (ctx.view?.page === "table") {
      ctx.closeDialog?.();
      openCombatRequests(ctx, target.attemptId || "");
    } else {
      memory.pendingRequests = { attemptId: target.attemptId || "", at: Date.now() };
      ctx.navigate("table");
    }
  } else if (target.kind === "sheet" && target.actorId) {
    ctx.openSheet(target.actorId, target.tab);
  } else if (typeof target.page === "string") {
    ctx.navigate(target.page, { ...(target.params ?? {}) });
  } else ctx.closeDialog?.();
  return true;
}

// ---------------------------------------------------------------------------------------
// Toasts and announcements: one overlay under <body> (FVT-193 / R20-176), with a polite
// live region. In Node (no DOM) a memory surface records what would be shown.
let surface = null;
let memorySurface = null;
function memorySurfaceFactory() {
  const log = [];
  let shown = []; // keys on screen, oldest first
  return {
    log,
    toast(ctx, item) {
      shown = [...shown.filter((key) => key !== item.key), item.key].slice(-MAX_TOASTS);
      log.push({ kind: "toast", key: item.key, role: ctx.role, lang: ctx.lang });
    },
    announce: (message) => log.push({ kind: "announce", message }),
    clear() {
      shown = [];
      log.push({ kind: "clear" });
    },
    visible: () => [...shown],
    blocked: () => false,
  };
}
function domSurface(doc) {
  let region = null;
  let live = null;
  const ensure = (ctx) => {
    if (!region || !region.isConnected) {
      region = doc.createElement("section");
      region.className = "notifications-toasts";
      doc.body.append(region);
    }
    if (!live || !live.isConnected) {
      live = doc.createElement("p");
      live.className = "notifications-live";
      live.setAttribute("role", "status");
      live.setAttribute("aria-live", "polite");
      live.setAttribute("aria-atomic", "true");
      doc.body.append(live);
    }
    if (ctx) region.setAttribute("aria-label", ctx.t("Avvisi a comparsa", "Pop-up notices"));
  };
  const remove = (el) => {
    clearTimeout(el._notificationsTimer);
    el.remove();
  };
  // Where focus goes when the pop-up it was in disappears (WCAG 2.4.3): the next pop-up's
  // "Open", else the bell that opens the centre (looked up afterwards: a page change
  // redraws the header). Nothing moves if focus was elsewhere or already went somewhere,
  // such as into a dialog the pop-up opened.
  const handOff = (el) => {
    if (!el.contains(doc.activeElement)) return () => {};
    const next = (el.nextElementSibling ?? el.previousElementSibling)?.querySelector?.(
      "[data-notifications-toast-open]",
    );
    return () => {
      if (doc.activeElement && doc.activeElement !== doc.body) return;
      const target = next?.isConnected
        ? next
        : doc.querySelector('.service-nav [data-service="requests"]');
      target?.focus?.();
    };
  };
  return {
    toast(ctx, item, prefs) {
      ensure(ctx);
      region.dataset.position = prefs.position;
      // A top stack starts below the header's services row (the bell's row), whatever the
      // header's height (the demo strip adds a row; a phone wraps the navigation): the
      // pop-ups never cover the bell that opens the centre. Its place in the page, not on
      // screen, so scrolling back to the top never brings the bell under them.
      const header = (
        doc.querySelector(".app-header .service-nav") ?? doc.querySelector(".app-header")
      )?.getBoundingClientRect?.();
      if (header)
        region.style.setProperty(
          "--notifications-top",
          `${Math.max(0, Math.round(header.bottom + (doc.defaultView?.scrollY ?? 0))) + 8}px`,
        );
      const categories = (item.categories ?? [item.category]).map(categoryOf);
      const names = categories.map((c) => ctx.label(c.label)).join(" · ");
      const el = doc.createElement("div");
      el.className = "notifications-toast";
      el.dataset.notificationsToast = item.key;
      el.dataset.category = categories[0].id;
      el.setAttribute("role", "group");
      el.setAttribute("aria-label", names);
      el.innerHTML = `<div class="notifications-toast-text"><span class="notifications-toast-category">${ctx.icon(categories[0].icon)}${ctx.esc(names)}</span><strong>${ctx.esc(ctx.label(item.title))}</strong>${item.body ? `<span>${ctx.esc(ctx.label(item.body))}</span>` : ""}</div><div class="notifications-toast-actions"><button type="button" class="button primary" data-notifications-toast-open>${ctx.t("Apri", "Open")}</button><button type="button" class="icon-button" data-notifications-toast-close aria-label="${ctx.esc(ctx.t("Chiudi avviso", "Dismiss notice"))}">${ctx.icon("close")}</button></div>`;
      // The countdown waits while a modal dialog covers the overlay (another area's
      // pop-up may open right after a role change), so a notice is never missed.
      const start = () => {
        clearTimeout(el._notificationsTimer);
        el._notificationsTimer = setTimeout(function expire() {
          if (doc.querySelector("dialog[open]")) el._notificationsTimer = setTimeout(expire, 1000);
          else remove(el);
        }, prefs.duration * 1000);
      };
      // WCAG 2.2.1: hovering or focusing a toast pauses its timer.
      el.addEventListener("pointerenter", () => clearTimeout(el._notificationsTimer));
      el.addEventListener("pointerleave", start);
      el.addEventListener("focusin", () => clearTimeout(el._notificationsTimer));
      el.addEventListener("focusout", (event) => {
        if (!el.contains(event.relatedTarget)) start();
      });
      el.querySelector("[data-notifications-toast-open]").addEventListener("click", () => {
        const restore = handOff(el);
        remove(el);
        openNotification(ctx, item.key);
        restore();
        // A page change renders on `hashchange`, after this handler: check once more.
        setTimeout(restore, 120);
      });
      el.querySelector("[data-notifications-toast-close]").addEventListener("click", () => {
        const restore = handOff(el);
        remove(el);
        restore();
      });
      if (prefs.position.startsWith("top")) region.prepend(el);
      else region.append(el);
      const toasts = [...region.querySelectorAll(".notifications-toast")];
      const oldest = prefs.position.startsWith("top")
        ? toasts.slice(MAX_TOASTS)
        : toasts.slice(0, -MAX_TOASTS);
      oldest.forEach(remove);
      start();
    },
    announce(message, { inDialog = false } = {}) {
      ensure(null);
      if (inDialog) return; // the centre's own live region speaks inside the modal
      live.textContent = "";
      setTimeout(() => (live.textContent = message), 60);
    },
    clear() {
      region?.querySelectorAll(".notifications-toast").forEach(remove);
      if (live) live.textContent = "";
    },
    // Keys of the pop-ups on screen, oldest first (the newest sits next to the edge).
    visible() {
      const keys = [...(region?.querySelectorAll(".notifications-toast") ?? [])].map(
        (el) => el.dataset.notificationsToast,
      );
      return region?.dataset.position?.startsWith("top") ? keys.reverse() : keys;
    },
    // A modal dialog makes the overlay inert: pop-ups wait until it closes.
    blocked: () => Boolean(doc.querySelector("dialog[open]")),
  };
}
function getSurface() {
  if (surface) return surface;
  const doc = globalThis.document;
  if (doc?.body && typeof doc.createElement === "function") {
    surface = domSurface(doc);
    doc.querySelector("#dialog")?.addEventListener("close", () => {
      if (api?.ctx) flushDeferred(api.ctx);
    });
  } else surface = memorySurface ??= memorySurfaceFactory();
  return surface;
}
/** Test helper: what the memory surface recorded (toasts, announcements, clears). */
export function notificationSurfaceLog() {
  getSurface();
  return memorySurface?.log ?? [];
}

function deliver(ctx, keys) {
  if (!keys.length) return;
  const model = centreModel(ctx);
  const items = model.items.filter(
    (item) => keys.includes(item.key) && !item.read && popsUp(item, model.prefs),
  );
  if (!items.length) return;
  const out = getSurface();
  if (out.blocked()) {
    memory.deferred.push(...items.map((item) => item.key));
    return;
  }
  // The newest three, newest first (the centre's order). They are placed oldest first so
  // that the newest ends next to the screen edge in every position.
  const shown = items.slice(0, MAX_TOASTS);
  for (const item of [...shown].reverse()) out.toast(ctx, item, model.prefs);
  const names = shown
    .map((item) => `${ctx.label(categoryOf(item.categories[0]).label)}: ${ctx.label(item.title)}`)
    .join(". ");
  const more = items.length - shown.length;
  const tail =
    more === 1
      ? ctx.t(" E un’altra nel centro notifiche.", " And 1 more in the notification centre.")
      : more > 1
        ? ctx.t(
            ` E altre ${more} nel centro notifiche.`,
            ` And ${more} more in the notification centre.`,
          )
        : "";
  out.announce(
    (items.length === 1
      ? ctx.t("Nuova notifica. ", "New notification. ")
      : ctx.t(`${items.length} nuove notifiche. `, `${items.length} new notifications. `)) +
      names +
      "." +
      tail,
  );
}
// A language change redraws the pop-ups on screen in the new language (same order, new
// countdown) instead of removing them; one that no longer exists is dropped.
function relabelToasts(ctx) {
  const out = getSurface();
  const keys = out.visible();
  out.clear();
  if (!keys.length) return;
  const model = centreModel(ctx);
  for (const key of keys) {
    const item = model.items.find((entry) => entry.key === key);
    if (item) out.toast(ctx, item, model.prefs);
  }
}
function flushDeferred(ctx) {
  const keys = [...new Set(memory.deferred)];
  memory.deferred = [];
  deliver(ctx, keys);
}

// Compares what each identity can be notified of with what it was already told in this
// visit. New notices get an arrival (time, causing identity) in the device cache; the
// current identity is told at once, another identity when the demo switches to it.
// Another identity's keys are computed on a copy of the context with that role: internal
// bookkeeping only, never rendered for the current identity.
// `declared` (optional) collects the `by` a source declared for its notices: the arrival
// records that value, so an anonymous notice (B27 Stop, `by: null`) is never attributed
// to the identity whose change made it appear.
function keysFor(ctx, role, declared = null) {
  return allEntries(role === ctx.role ? ctx : { ...ctx, role }).map((entry) => {
    if (declared && entry.byDeclared) declared.set(entry.key, entry.by);
    return entry.key;
  });
}
// The committing identity is kept only for the core's own keys, the only ones that read it
// back (see normalize): another area's notice is never attributed to anybody here.
// Returns how many notices are new for the current identity.
export function observeNotifications(
  ctx,
  { by = null, time = new Date().toISOString(), announce = true } = {},
) {
  let changed = false;
  let news = 0;
  for (const role of ROLES) {
    const declared = new Map();
    const keys = keysFor(ctx, role, declared);
    if (!memory.known[role]) {
      memory.known[role] = new Set(keys);
      continue;
    }
    const fresh = keys.filter((key) => !memory.known[role].has(key));
    for (const key of fresh)
      if (!memory.arrivals[key]) {
        memory.arrivals[key] = {
          time,
          by: declared.has(key) ? declared.get(key) : key.startsWith(`${ID}:`) ? by : null,
        };
        changed = true;
      }
    if (role === ctx.role) {
      memory.known[role] = new Set(keys);
      news = fresh.length;
      if (announce) deliver(ctx, fresh);
    }
  }
  if (changed) saveArrivals();
  return news;
}
function baseline(ctx) {
  memory.known = { player: null, dm: null };
  observeNotifications(ctx, { announce: false });
}

// ---------------------------------------------------------------------------------------
// The centre (a common dialog, full-screen on a phone).
const centreRoot = () =>
  globalThis.document?.querySelector?.("#dialog [data-notifications-centre]");
function filterButtons(ctx, model) {
  const buttons = [
    ["all", ctx.t("Tutte", "All"), model.items.length],
    ["unread", ctx.t("Non lette", "Unread"), model.unread],
    ...CATEGORIES.filter((c) => model.counts[c.id].total).map((c) => [
      c.id,
      ctx.label(c.label),
      model.counts[c.id].total,
    ]),
  ];
  return buttons
    .map(
      ([id, name, count]) =>
        `<button type="button" class="notifications-filter" data-notifications-filter="${id}" aria-pressed="${memory.filter === id}">${ctx.esc(name)} <span class="notifications-filter-count">${count}</span></button>`,
    )
    .join("");
}
function row(ctx, item, now) {
  // Its own category first; "Mentions" beside it when the notice names the reader.
  const categories = (item.categories ?? [item.category]).map(categoryOf);
  const category = categories[0];
  const names = categories.map((c) => ctx.label(c.label)).join(" · ");
  const title = ctx.label(item.title);
  const time = validTime(item.time) ? relativeTime(ctx.lang, item.time, now) : "";
  const absolute = validTime(item.time)
    ? new Intl.DateTimeFormat(locale(ctx.lang), { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(item.time),
      )
    : "";
  return `<li class="notifications-item${item.read ? "" : " is-unread"}" data-category="${ctx.esc(category.id)}"${item.mention ? " data-mention" : ""}><button type="button" class="notifications-open" data-notifications-open="${ctx.esc(item.key)}"><span class="notifications-dot" aria-hidden="true"></span><span class="notifications-text"><span class="notifications-meta"><span class="notifications-category">${ctx.icon(category.icon)}${ctx.esc(names)}</span>${time ? ` · <time datetime="${ctx.esc(item.time)}" title="${ctx.esc(absolute)}">${ctx.esc(time)}</time>` : ""}${item.read ? "" : ` · <span class="notifications-state">${ctx.t("Non letta", "Unread")}</span>`}${item.source !== ID && item.sourceLabel && !categories.some((c) => ctx.label(c.label) === ctx.label(item.sourceLabel)) ? ` · ${ctx.esc(ctx.label(item.sourceLabel))}` : ""}</span><strong>${ctx.esc(title)}</strong>${item.body ? `<span class="notifications-body">${ctx.esc(ctx.label(item.body))}</span>` : ""}</span></button><button type="button" class="icon-button notifications-toggle" data-notifications-toggle="${ctx.esc(item.key)}" data-notifications-read="${item.read}" aria-label="${ctx.esc((item.read ? ctx.t("Segna come non letta: ", "Mark as unread: ") : ctx.t("Segna come letta: ", "Mark as read: ")) + title)}" title="${ctx.esc(item.read ? ctx.t("Segna come non letta", "Mark as unread") : ctx.t("Segna come letta", "Mark as read"))}">${ctx.icon(item.read ? "undo" : "check")}</button>${item.actions?.length ? `<span class="notifications-item-actions" role="group" aria-label="${ctx.esc(ctx.t("Rispondi: ", "Answer: ") + title)}">${item.actions.map((a) => `<button type="button" class="button${a.primary ? " primary" : ""}" data-notifications-action="${ctx.esc(a.id)}" data-notifications-key="${ctx.esc(item.key)}">${ctx.esc(ctx.label(a.label))}</button>`).join("")}</span>` : ""}</li>`;
}
// "N notifiche segnate come lette." with the singular for one, IT and EN.
const marked = (count, undo = false) => [
  (count === 1 ? "1 notifica segnata come letta." : `${count} notifiche segnate come lette.`) +
    (undo ? " Puoi annullare." : ""),
  (count === 1 ? "1 notification marked as read." : `${count} notifications marked as read.`) +
    (undo ? " You can undo." : ""),
];
export function renderCentre(ctx, { now = Date.now() } = {}) {
  const model = centreModel(ctx);
  if (!["all", "unread"].includes(memory.filter) && !model.counts[memory.filter]?.total)
    memory.filter = "all";
  const shown = model.items.filter((item) =>
    memory.filter === "all"
      ? true
      : memory.filter === "unread"
        ? !item.read
        : item.categories.includes(memory.filter),
  );
  const pending = pendingCombatCount(ctx);
  const offline = ctx.offline
    ? `<div class="notifications-offline" role="note"><strong>${ctx.t("Senza rete", "Offline")}</strong><p>${ctx.t("Le notifiche condivise sono in attesa: richieste, turni, sessioni, inviti, materiali, menzioni e attività del gruppo non si aggiornano finché non torni in rete. Qui vedi quelle ricevute fino a ", "Shared notifications are on hold: requests, turns, sessions, invitations, materials, mentions and party activity do not update until you are back online. Here you see what arrived until ")}${ctx.esc(memory.offlineSince ? new Intl.DateTimeFormat(locale(ctx.lang), { timeStyle: "short" }).format(new Date(memory.offlineSince)) : ctx.t("ora", "now"))}.</p><p>${ctx.t("Letture, preferenze e promemoria restano su questo dispositivo e funzionano anche senza rete.", "Read state, preferences and reminders stay on this device and work offline too.")}</p></div>`
    : "";
  const undo =
    memory.undo?.role === ctx.role
      ? `<div class="notifications-undo"><span>${ctx.esc(ctx.t(...marked(memory.undo.keys.length)))}</span><button type="button" class="button" data-notifications-undo>${ctx.icon("undo")}${ctx.t("Annulla", "Undo")}</button></div>`
      : "";
  const empty = model.items.length
    ? `<p class="empty-state notifications-empty">${ctx.t("Nessuna notifica in questo filtro.", "No notifications in this filter.")}</p>`
    : `<div class="empty-state notifications-empty"><p><strong>${ctx.t("Nessuna notifica.", "No notifications.")}</strong></p><p class="muted">${ctx.t("Qui arrivano richieste di tiro, l’inizio del tuo turno in combattimento, sessioni fissate o spostate, inviti, materiali condivisi, menzioni, ricompense e scambi del gruppo. Nulla compare come avviso a comparsa finché non lo scegli nelle preferenze.", "Roll requests, the start of your combat turn, scheduled or moved sessions, invitations, shared materials, mentions, party rewards and trades arrive here. Nothing pops up until you choose it in the preferences.")}</p></div>`;
  return `${offline}<section class="notifications-pending" aria-labelledby="notifications-pending-title"><div><h3 id="notifications-pending-title">${ctx.t("Richieste in attesa", "Pending requests")}</h3><p>${pending ? ctx.t(`${pending} ${pending === 1 ? "richiesta attende" : "richieste attendono"} una risposta al Tavolo.`, `${pending} ${pending === 1 ? "request is" : "requests are"} waiting for an answer at the Table.`) : ctx.t("Nessun tiro o reazione in attesa.", "No roll or reaction is waiting.")}</p></div><button type="button" class="button${pending ? " primary" : ""}" data-notifications-requests>${ctx.icon("dice")}${ctx.t("Apri tiri e risultati", "Open rolls and results")}</button></section><div class="notifications-toolbar"><div class="notifications-filters" role="group" aria-label="${ctx.esc(ctx.t("Filtra le notifiche", "Filter notifications"))}">${filterButtons(ctx, model)}</div><div class="notifications-actions"><button type="button" class="button" data-notifications-read-all ${model.unread ? "" : 'disabled aria-describedby="notifications-read-all-why"'}>${ctx.icon("check")}${ctx.t("Segna tutte come lette", "Mark all as read")}</button>${model.unread ? "" : `<span class="notifications-why" id="notifications-read-all-why">${ctx.esc(ctx.t("Nessuna notifica da leggere.", "No notification to read."))}</span>`}<button type="button" class="button quiet" data-notifications-preferences>${ctx.icon("settings")}${ctx.t("Preferenze notifiche", "Notification preferences")}</button></div></div>${undo}${shown.length ? `<ol class="notifications-list" aria-label="${ctx.esc(ctx.t("Notifiche", "Notifications"))}">${shown.map((item) => row(ctx, item, now)).join("")}</ol>` : empty}`;
}
function refreshCentre(ctx, focus = null, message = "") {
  const root = centreRoot();
  if (!root) return;
  root.innerHTML = renderCentre(ctx);
  bindCentre(root, ctx);
  if (message) say(ctx, ...message);
  const next =
    (focus && root.querySelector(focus)) ||
    root.querySelector("[data-notifications-filter][aria-pressed=true]");
  next?.focus?.();
}
export function bindCentre(root, ctx) {
  const on = (selector, handler) =>
    root.querySelectorAll(selector).forEach((el) => (el.onclick = () => handler(el)));
  on("[data-notifications-filter]", (el) => {
    memory.filter = el.dataset.notificationsFilter;
    refreshCentre(ctx, `[data-notifications-filter="${memory.filter}"]`);
  });
  on("[data-notifications-open]", (el) => openNotification(ctx, el.dataset.notificationsOpen));
  // TV-69: an inline answer runs its area's command, then the notice counts as read.
  on("[data-notifications-action]", (el) => {
    const key = el.dataset.notificationsKey;
    const item = centreModel(ctx).items.find((entry) => entry.key === key);
    const action = item?.actions.find((a) => a.id === el.dataset.notificationsAction);
    if (!action) return;
    setNotificationRead(ctx, key, true);
    try {
      action.run(ctx);
    } catch (error) {
      ctx.toast(error?.it ? ctx.t(error.it, error.en) : String(error?.message ?? error), true);
    }
    if (centreRoot()) refreshCentre(ctx, "[data-notifications-filter][aria-pressed=true]");
  });
  on("[data-notifications-toggle]", (el) => {
    const key = el.dataset.notificationsToggle;
    const read = el.dataset.notificationsRead !== "true";
    setNotificationRead(ctx, key, read);
    refreshCentre(
      ctx,
      `[data-notifications-toggle="${cssEscape(key)}"]`,
      read
        ? ["Segnata come letta.", "Marked as read."]
        : ["Segnata come non letta.", "Marked as unread."],
    );
  });
  on("[data-notifications-read-all]", () => {
    const count = markAllNotificationsRead(ctx);
    refreshCentre(ctx, "[data-notifications-undo]", marked(count, true));
  });
  on("[data-notifications-undo]", () => {
    undoMarkAllRead(ctx);
    refreshCentre(ctx, "[data-notifications-read-all]", [
      "Letture ripristinate.",
      "Read state restored.",
    ]);
  });
  on("[data-notifications-requests]", () => {
    if (ctx.view?.page === "table") openCombatRequests(ctx);
    else {
      memory.pendingRequests = { attemptId: "", at: Date.now() };
      ctx.navigate("table");
    }
  });
  on("[data-notifications-preferences]", () => openNotificationPreferences(ctx));
}
const cssEscape = (value) =>
  globalThis.CSS?.escape ? globalThis.CSS.escape(value) : String(value).replace(/["\\]/g, "\\$&");
export function openCentre(ctx) {
  ctx.dialog(
    ctx.t("Notifiche e richieste", "Notifications and requests"),
    // The live region sits beside the part every action redraws, so it stays in place.
    `<div class="notifications-centre" data-notifications-centre>${renderCentre(ctx)}</div><p class="notifications-live" data-notifications-live role="status" aria-live="polite" aria-atomic="true"></p>`,
    { cancelLabel: ctx.t("Chiudi", "Close") },
  );
  const root = centreRoot();
  if (root) bindCentre(root, ctx);
}

// ---------------------------------------------------------------------------------------
// Preferences form (FG Options > Notifications: per category, position and duration;
// Sesh opt-in reminders). The same values appear in the shell's Preferences dialog.
function optionList(ctx, options, value) {
  return options
    .map(
      (option) =>
        `<option value="${ctx.esc(option.value)}" ${option.value === value ? "selected" : ""}>${ctx.esc(ctx.label(option.label))}</option>`,
    )
    .join("");
}
export function renderPreferences(ctx) {
  const prefs = notificationPreferences(ctx);
  return `<div class="notifications-preferences" data-notifications-preferences-form><button type="button" class="button quiet" data-notifications-back>${ctx.icon("arrow")}${ctx.t("Torna alle notifiche", "Back to notifications")}</button><p class="muted">${ctx.t("Valgono solo per te. Nulla compare come avviso a comparsa e nessun promemoria arriva finché non lo scegli.", "They apply to you only. Nothing pops up and no reminder arrives until you choose it.")}</p><fieldset><legend>${ctx.t("Categorie", "Categories")}</legend>${CATEGORIES.map(
    (c) =>
      `<label class="field">${ctx.esc(ctx.label(c.label))}<select name="cat-${c.id}">${optionList(
        ctx,
        c.id === "requests" ? DELIVERY.filter((d) => d.value !== "off") : DELIVERY,
        prefs.categories[c.id],
      )}</select></label>`,
  ).join(
    "",
  )}<p class="muted">${ctx.t("Le richieste di tiro non si disattivano: restano sempre raggiungibili da «Richieste in attesa».", "Roll requests cannot be turned off: they always stay reachable from “Pending requests”.")}</p><p class="muted">${ctx.t("Una notifica che ti nomina resta nella sua categoria e compare anche in «Menzioni»: si nasconde solo se le disattivi entrambe.", "A notification that names you stays in its own category and also appears under “Mentions”: it is hidden only if you turn both off.")}</p></fieldset><fieldset><legend>${ctx.t("Avvisi a comparsa", "Pop-ups")}</legend><label class="field">${ctx.t("Posizione", "Position")}<select name="position">${optionList(ctx, POSITIONS, prefs.position)}</select></label><label class="field">${ctx.t("Durata in secondi (3–30)", "Duration in seconds (3–30)")}<input type="number" name="duration" min="3" max="30" step="1" inputmode="numeric" value="${ctx.esc(prefs.duration)}"></label></fieldset><fieldset><legend>${ctx.t("Promemoria delle sessioni", "Session reminders")}</legend>${REMINDER_LEADS.map(
    (lead) =>
      `<label class="check-field"><input type="checkbox" name="${lead.id}" ${prefs.reminders[lead.id] ? "checked" : ""}> ${ctx.esc(ctx.label(lead.label))}</label>`,
  ).join("")}</fieldset></div>`;
}
/** Validates everything first, then saves only the changed values. Returns the count. */
export function saveNotificationPreferences(ctx, data) {
  const prefs = notificationPreferences(ctx);
  const changes = [];
  for (const c of CATEGORIES) {
    const value = String(data.get(`cat-${c.id}`) ?? prefs.categories[c.id]);
    const allowed = (c.id === "requests" ? ["toast", "tray"] : ["toast", "tray", "off"]).includes(
      value,
    );
    if (!allowed)
      throw Object.assign(Error("Invalid category delivery"), {
        it: `Scelta non valida per «${c.label.it}».`,
        en: `Invalid choice for “${c.label.en}”.`,
      });
    if (value !== prefs.categories[c.id]) changes.push([`cat-${c.id}`, value]);
  }
  const position = String(data.get("position") ?? prefs.position);
  if (!POSITIONS.some((p) => p.value === position))
    throw Object.assign(Error("Invalid position"), {
      it: "Posizione non valida.",
      en: "Invalid position.",
    });
  if (position !== prefs.position) changes.push(["position", position]);
  const raw = String(data.get("duration") ?? "").trim();
  const duration = Number(raw);
  if (!raw || !Number.isInteger(duration) || duration < 3 || duration > 30)
    throw Object.assign(Error("Invalid duration"), {
      it: "La durata deve essere un numero intero da 3 a 30 secondi.",
      en: "The duration must be a whole number from 3 to 30 seconds.",
    });
  if (duration !== prefs.duration) changes.push(["duration", duration]);
  for (const lead of REMINDER_LEADS) {
    const value = data.has(lead.id);
    if (value !== prefs.reminders[lead.id]) changes.push([lead.id, value]);
  }
  for (const [field, value] of changes) api.setSetting(ctx, settingKey(field), value);
  return changes.length;
}
export function openNotificationPreferences(ctx) {
  ctx.dialog(ctx.t("Preferenze notifiche", "Notification preferences"), renderPreferences(ctx), {
    submitLabel: ctx.t("Salva preferenze notifiche", "Save notification preferences"),
    cancelLabel: ctx.t("Annulla", "Cancel"),
    onSubmit: (data) => {
      const count = saveNotificationPreferences(ctx, data);
      openCentre(ctx);
      say(
        ctx,
        count ? "Preferenze delle notifiche salvate." : "Nessuna preferenza cambiata.",
        count ? "Notification preferences saved." : "No preference changed.",
      );
      // A category just switched to pop-ups announces nothing retroactively.
      return true;
    },
  });
  const back = globalThis.document?.querySelector?.("#dialog [data-notifications-back]");
  if (back) back.onclick = () => openCentre(ctx);
}

// ---------------------------------------------------------------------------------------
// Registration. Read markers live on the device (READ_KEY), not in a state slice.

// A reminder falls due with real time. When something new arrived for this identity the
// header badge is redrawn, but never under a field being typed in (the shell's render
// replaces the page): then at the next check. Returns whether it redrew.
export function checkDueNotifications(ctx) {
  if (observeNotifications(ctx) > 0) memory.staleBadge = true;
  if (!memory.staleBadge) return false;
  const active = globalThis.document?.activeElement;
  if (active?.matches?.("input, textarea, select, [contenteditable]")) return false;
  memory.staleBadge = false;
  ctx.render?.();
  return true;
}
function startClock(ctx) {
  // Browser only (a window with a document); a Node test never starts a timer.
  if (memory.timer || typeof globalThis.window !== "object" || !globalThis.document) return;
  // Reminders become due with real time: check every 30 seconds and when the tab returns.
  memory.timer = setInterval(() => checkDueNotifications(api?.ctx ?? ctx), 30000);
  globalThis.document.addEventListener?.("visibilitychange", () => {
    if (globalThis.document.visibilityState === "visible") checkDueNotifications(api?.ctx ?? ctx);
  });
}

export function register(registry) {
  api = registry;
  registry.registerStyles(new URL("./notifications.css", import.meta.url));
  registry.add("service", {
    id: "requests",
    replaces: true,
    label: text("Notifiche e richieste", "Notifications and requests"),
    icon: "bell",
    badge: (ctx) => unreadCount(ctx),
    run: (ctx) => openCentre(ctx),
  });
  registry.add("notifications", {
    id: ID,
    label: text("Campagna e Tavolo", "Campaign and Table"),
    collect: (ctx) => collectCore(ctx),
  });
  registry.add("settings", {
    id: ID,
    label: text("Notifiche", "Notifications"),
    scope: "personal",
    fields: [
      ...CATEGORIES.map((c) => ({
        id: `cat-${c.id}`,
        label: c.label,
        type: "choice",
        default: "tray",
        options: c.id === "requests" ? DELIVERY.filter((d) => d.value !== "off") : [...DELIVERY],
      })),
      {
        id: "position",
        label: text("Posizione degli avvisi a comparsa", "Pop-up position"),
        type: "choice",
        default: "top-right",
        options: [...POSITIONS],
      },
      {
        id: "duration",
        label: text("Durata degli avvisi (secondi)", "Pop-up duration (seconds)"),
        type: "number",
        min: 3,
        max: 30,
        default: 6,
      },
      ...REMINDER_LEADS.map((lead) => ({
        id: lead.id,
        label: text(`Promemoria sessione: ${lead.label.it}`, `Session reminder: ${lead.label.en}`),
        type: "boolean",
        default: false,
      })),
    ],
  });
  registry.add("command", {
    id: "notifications.open",
    label: text("Apri notifiche e richieste", "Open notifications and requests"),
    group: "services",
    run: (ctx) => openCentre(ctx),
  });
  registry.add("command", {
    id: "notifications.read-all",
    label: text("Segna tutte le notifiche come lette", "Mark all notifications as read"),
    group: "services",
    run: (ctx) => {
      const count = markAllNotificationsRead(ctx);
      if (!count)
        return ctx.toast(ctx.t("Nessuna notifica da leggere.", "No unread notifications."));
      // The same Undo as the centre's own button: the centre opens on its Undo row.
      openCentre(ctx);
      say(ctx, ...marked(count, true));
      globalThis.document?.querySelector?.("#dialog [data-notifications-undo]")?.focus?.();
    },
  });

  registry.on("navigate", (payload, { ctx }) => {
    if (!memory.known[ctx.role]) baseline(ctx);
    startClock(ctx);
    const pending = memory.pendingRequests;
    memory.pendingRequests = null;
    if (pending && payload.page === "table" && Date.now() - pending.at < 15000)
      queueMicrotask(() => openCombatRequests(ctx, pending.attemptId));
  });
  registry.on("commit", (payload, { ctx }) => {
    const entry = ctx.state.log?.findLast?.((row) => row.id === payload.id);
    observeNotifications(ctx, {
      by: payload.controller ?? ctx.role,
      time: entry?.time ?? new Date().toISOString(),
    });
  });
  registry.on("role-changed", (payload, { ctx }) => {
    getSurface().clear();
    memory.filter = "all";
    memory.undo = null;
    memory.deferred = [];
    observeNotifications(ctx);
  });
  registry.on("language-changed", (payload, { ctx }) => relabelToasts(ctx));
  registry.on("offline-changed", (payload, { ctx }) => {
    if (payload.offline) memory.offlineSince = new Date().toISOString();
    else {
      memory.offlineSince = null;
      getSurface().announce(
        ctx.t(
          "Di nuovo in rete: le notifiche condivise sono aggiornate.",
          "Back online: shared notifications are up to date.",
        ),
      );
      observeNotifications(ctx);
    }
  });
  registry.on("reset", (payload, { ctx }) => {
    getSurface().clear();
    memory.arrivals = {};
    saveArrivals();
    memory.read = emptyRead();
    save(READ_KEY, memory.read);
    memory.staleBadge = false;
    memory.undo = null;
    memory.filter = "all";
    memory.deferred = [];
    baseline(ctx);
  });
}
