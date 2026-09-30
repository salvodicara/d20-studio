import {
  campaignMembers,
  isCampaignMember,
  canOrganizeSessions,
  campaignReviewKey,
  validCampaignReturn,
} from "./campaign-content.mjs";

const clone = (value) => structuredClone(value);
const now = () => new Date().toISOString();
const idOkay = (id) => typeof id === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/.test(id);
const object = (value) => !!value && typeof value === "object" && !Array.isArray(value);
const issue = (code, it, en) => ({ code, it, en });
const fail = (it = "Sessione non disponibile.", en = "Session unavailable.") => {
  throw Object.assign(new Error(`${it} / ${en}`), { it, en });
};
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const member = (state, viewer) => isCampaignMember(state, state.campaign?.id, viewer);
const organize = (state, viewer) => canOrganizeSessions(state, state.campaign?.id, viewer);
const sessionById = (state, id) => state.campaign?.sessions?.find((value) => value.id === id);
const pollById = (state, id) => state.campaign?.polls?.find((value) => value.id === id);
const changeKinds = ["direct", "poll", "change", "cancel", "confirm", "played"];
function timeParts(formatter, ms) {
  return Object.fromEntries(
    formatter
      .formatToParts(new Date(ms))
      .filter((part) => ["year", "month", "day", "hour", "minute", "second"].includes(part.type))
      .map((part) => [part.type, Number(part.value)]),
  );
}
const wallMillis = (p) => Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second ?? 0);
export function resolveSessionTime({ localTime, timeZone, selectedInstant = null } = {}) {
  const result = { valid: false, startsAt: null, candidates: [], errors: [] };
  const match =
    typeof localTime === "string" && /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(localTime);
  if (!match) {
    result.errors.push(
      issue("date", "Inserisci data e ora complete.", "Enter a complete date and time."),
    );
    return result;
  }
  const [year, month, day, hour, minute] = match.slice(1).map(Number),
    wall = { year, month, day, hour, minute, second: 0 },
    naive = wallMillis(wall),
    date = new Date(naive);
  if (
    year < 1000 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute
  ) {
    result.errors.push(
      issue("date", "La data o l’ora non esiste.", "The date or time does not exist."),
    );
    return result;
  }
  let formatter;
  try {
    if (typeof timeZone !== "string" || !timeZone) throw Error();
    formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    result.errors.push(
      issue("timezone", "Scegli un fuso orario IANA valido.", "Choose a valid IANA timezone."),
    );
    return result;
  }
  const offsets = new Set();
  // Discover the timezone offsets on both sides of a transition, then validate every candidate.
  for (let hours = -36; hours <= 36; hours += 3) {
    const sample = naive + hours * 3600000;
    offsets.add(wallMillis(timeParts(formatter, sample)) - sample);
  }
  for (const offset of offsets) {
    const timestamp = naive - offset,
      parts = timeParts(formatter, timestamp);
    if (
      ["year", "month", "day", "hour", "minute", "second"].every((key) => parts[key] === wall[key])
    ) {
      const minutes = offset / 60000,
        sign = minutes < 0 ? "-" : "+";
      result.candidates.push({
        startsAt: new Date(timestamp).toISOString(),
        offsetLabel: `UTC${sign}${String(Math.floor(Math.abs(minutes) / 60)).padStart(2, "0")}:${String(Math.abs(minutes) % 60).padStart(2, "0")}`,
      });
    }
  }
  result.candidates.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  if (!result.candidates.length)
    result.errors.push(
      issue(
        "nonexistent-time",
        "Quest’ora locale non esiste nel fuso scelto. Scegli un altro orario.",
        "This local time does not exist in the selected timezone. Choose another time.",
      ),
    );
  else if (
    selectedInstant !== null &&
    !result.candidates.some((candidate) => candidate.startsAt === selectedInstant)
  )
    result.errors.push(
      issue(
        "instant",
        "L’istante selezionato non corrisponde più a data e fuso.",
        "The selected instant no longer matches the date and timezone.",
      ),
    );
  else if (result.candidates.length > 1 && selectedInstant === null)
    result.errors.push(
      issue(
        "ambiguous-time",
        "Quest’ora si verifica due volte: scegli esplicitamente l’istante.",
        "This time occurs twice: choose the instant explicitly.",
      ),
    );
  else {
    result.valid = true;
    result.startsAt = selectedInstant ?? result.candidates[0].startsAt;
  }
  return result;
}
function sessionProjection(state, session, viewer) {
  return {
    ...clone(session),
    permissions: {
      canRead: true,
      canManage: organize(state, viewer),
      canConfirm: organize(state, viewer),
    },
  };
}
export function listCampaignSessions(state, campaignId, viewer) {
  if (state.campaign?.id !== campaignId || !member(state, viewer)) return [];
  return (state.campaign.sessions ?? [])
    .map((session) => sessionProjection(state, session, viewer))
    .sort((a, b) => (a.startsAt ?? "9999").localeCompare(b.startsAt ?? "9999"));
}
function pollProjection(state, poll, viewer) {
  const activeIds = new Set(campaignMembers(state).map((member) => member.id));
  return {
    ...clone(poll),
    participants: poll.participants.filter((id) => activeIds.has(id)),
    responses: Object.fromEntries(
      Object.entries(poll.responses).filter(([id]) => activeIds.has(id)),
    ),
    permissions: {
      canRead: true,
      canManage: organize(state, viewer),
      canRespond: poll.status === "open" && poll.participants.includes(viewer),
      canConfirm: poll.status === "open" && organize(state, viewer),
    },
  };
}
export function listSessionPolls(state, campaignId, viewer) {
  if (state.campaign?.id !== campaignId || !member(state, viewer)) return [];
  return (state.campaign.polls ?? []).map((poll) => pollProjection(state, poll, viewer));
}
function privateDraft(state, id, viewer) {
  const d = state.campaign?.sessionDrafts?.find(
    (value) => value.id === id && value.ownerId === viewer,
  );
  if (!d) fail("Bozza non disponibile.", "Draft unavailable.");
  return d;
}
export const getSessionDraft = (state, id, viewer) => clone(privateDraft(state, id, viewer));
export const listSessionDrafts = (state, viewer) =>
  clone(
    (state.campaign?.sessionDrafts ?? []).filter(
      (d) => d.ownerId === viewer && d.status === "active",
    ),
  );
export function createSessionDraft(
  state,
  { id, kind, sessionId = null, pollId = null, slotId = null, returnTo = null },
  viewer,
) {
  if (
    !idOkay(id) ||
    !idOkay(viewer) ||
    !changeKinds.includes(kind) ||
    !validCampaignReturn(returnTo) ||
    !member(state, viewer) ||
    (kind !== "played" && !organize(state, viewer)) ||
    state.campaign.sessionDrafts?.some((d) => d.id === id)
  )
    fail("Richiesta sessione non consentita.", "Session request unavailable.");
  const session = sessionId ? sessionById(state, sessionId) : null,
    poll = pollId ? pollById(state, pollId) : null;
  if (
    (["change", "cancel"].includes(kind) && !session) ||
    (kind === "confirm" && (!poll || !poll.slots.some((slot) => slot.id === slotId)))
  )
    fail();
  let data = { title: "", localTime: "", timeZone: "UTC", selectedInstant: null };
  if (kind === "poll")
    data = { title: "", participants: campaignMembers(state).map((m) => m.id), slots: [] };
  if (kind === "change")
    data = {
      title: session.title,
      localTime: session.localTime ?? "",
      timeZone: session.timeZone ?? "UTC",
      selectedInstant: session.startsAt ?? null,
    };
  if (kind === "cancel") data = { reason: "" };
  if (kind === "played") data = { title: "" };
  if (kind === "confirm") data = {};
  const d = {
    id,
    ownerId: viewer,
    kind,
    campaignId: state.campaign.id,
    sessionId,
    pollId,
    slotId,
    baseRevision: session?.revision ?? poll?.revision ?? null,
    revision: 0,
    status: "active",
    data,
    returnTo: clone(returnTo),
    createdAt: now(),
    updatedAt: now(),
    result: null,
  };
  (state.campaign.sessionDrafts ??= []).push(d);
  return clone(d);
}
export function saveSessionDraft(state, id, { data, expectedDraftRevision, baseRevision }, viewer) {
  const d = privateDraft(state, id, viewer);
  if (
    d.status !== "active" ||
    !object(data) ||
    (expectedDraftRevision !== undefined && expectedDraftRevision !== d.revision)
  )
    fail("Bozza cambiata o dati non validi.", "Draft changed or invalid data.");
  if (baseRevision !== undefined) {
    const current = d.sessionId ? sessionById(state, d.sessionId) : pollById(state, d.pollId);
    if (!organize(state, viewer) || !current || current.revision !== baseRevision) fail();
    d.baseRevision = baseRevision;
  }
  d.data = clone(data);
  d.revision++;
  d.updatedAt = now();
  return clone(d);
}
export function discardSessionDraft(state, id, viewer) {
  const d = privateDraft(state, id, viewer);
  if (d.status === "applied") fail("Bozza già applicata.", "Draft already applied.");
  d.status = "discarded";
  return clone(d);
}
export function previewSessionDraft(state, id, viewer) {
  const d = privateDraft(state, id, viewer),
    errors = [];
  let proposed = null,
    current = null;
  const authorized = member(state, viewer) && (d.kind === "played" || organize(state, viewer));
  if (!authorized)
    errors.push(
      issue(
        "permission",
        "Non puoi più confermare questa modifica.",
        "You can no longer confirm this change.",
      ),
    );
  if (d.status !== "active")
    errors.push(issue("closed", "Bozza già conclusa.", "Draft already completed."));
  const session = d.sessionId ? sessionById(state, d.sessionId) : null,
    poll = d.pollId ? pollById(state, d.pollId) : null;
  if (["change", "cancel"].includes(d.kind)) {
    if (!session)
      errors.push(issue("unavailable", "Sessione non disponibile.", "Session unavailable."));
    else if (authorized) {
      current = sessionProjection(state, session, viewer);
      if (session.revision !== d.baseRevision)
        errors.push(
          issue(
            "conflict",
            "L’appuntamento è cambiato. Riapri la modifica mantenendo il tuo testo.",
            "The appointment changed. Reopen the change while retaining your input.",
          ),
        );
    }
  }
  if (["direct", "change"].includes(d.kind)) {
    const resolution = resolveSessionTime(d.data);
    errors.push(...resolution.errors);
    if (typeof d.data.title !== "string")
      errors.push(issue("title", "Titolo non valido.", "Invalid title."));
    proposed = {
      title: d.data.title,
      startsAt: resolution.startsAt,
      timeZone: d.data.timeZone,
      localTime: d.data.localTime,
      status: "scheduled",
      played: session?.played ?? false,
      candidates: resolution.candidates,
    };
  } else if (d.kind === "poll") {
    const members = new Set(campaignMembers(state).map((member) => member.id));
    if (
      typeof d.data.title !== "string" ||
      !Array.isArray(d.data.participants) ||
      !d.data.participants.length ||
      d.data.participants.some((id) => !members.has(id)) ||
      new Set(d.data.participants).size !== d.data.participants.length
    )
      errors.push(
        issue(
          "participants",
          "Scegli partecipanti attuali senza duplicati.",
          "Choose current participants without duplicates.",
        ),
      );
    if (
      !Array.isArray(d.data.slots) ||
      !d.data.slots.length ||
      d.data.slots.length > 30 ||
      d.data.slots.some((slot) => !object(slot) || !idOkay(slot.id)) ||
      new Set((d.data.slots ?? []).map((slot) => slot.id)).size !== d.data.slots?.length
    )
      errors.push(
        issue(
          "slots",
          "Inserisci alternative valide e distinte (massimo 30).",
          "Enter valid distinct options (up to 30).",
        ),
      );
    const slots = Array.isArray(d.data.slots)
      ? d.data.slots.filter(object).map((slot) => {
          const resolution = resolveSessionTime(slot);
          errors.push(
            ...resolution.errors.map((error) => ({ ...error, path: `slots.${slot.id}` })),
          );
          return {
            id: slot.id,
            startsAt: resolution.startsAt,
            localTime: slot.localTime,
            timeZone: slot.timeZone,
            revision: 1,
            candidates: resolution.candidates,
          };
        })
      : [];
    if (slots.length && new Set(slots.map((slot) => slot.startsAt)).size !== slots.length)
      errors.push(
        issue(
          "duplicate-time",
          "Due alternative indicano lo stesso istante.",
          "Two options identify the same instant.",
        ),
      );
    proposed = {
      title: d.data.title,
      participants: clone(d.data.participants ?? []),
      slots,
      status: "open",
    };
  } else if (d.kind === "confirm") {
    const slot = poll?.slots.find((value) => value.id === d.slotId);
    if (!poll || !slot || poll.status !== "open")
      errors.push(
        issue(
          "poll",
          "Sondaggio non aperto o opzione non disponibile.",
          "Poll is not open or option unavailable.",
        ),
      );
    else {
      if (poll.revision !== d.baseRevision)
        errors.push(
          issue(
            "conflict",
            "Disponibilità cambiate: rivedi il sondaggio.",
            "Availability changed: review the poll.",
          ),
        );
      if (authorized) current = pollProjection(state, poll, viewer);
      proposed = {
        title: poll.title,
        startsAt: slot.startsAt,
        timeZone: slot.timeZone,
        localTime: slot.localTime,
        status: "scheduled",
        played: false,
        pollId: poll.id,
        slotId: slot.id,
        slotRevision: slot.revision,
      };
    }
  } else if (d.kind === "cancel") {
    if (typeof d.data.reason !== "string")
      errors.push(issue("reason", "Motivazione non valida.", "Invalid reason."));
    proposed =
      authorized && session
        ? { ...clone(session), status: "cancelled", cancellationReason: d.data.reason }
        : null;
  } else
    proposed = {
      title: typeof d.data.title === "string" ? d.data.title : "",
      startsAt: null,
      timeZone: null,
      localTime: null,
      status: "unscheduled",
      played: true,
    };
  if (!authorized) proposed = null;
  return {
    draft: clone(d),
    proposed,
    current,
    errors,
    conflicts: errors.filter((error) => error.code === "conflict"),
    canApply: errors.length === 0,
    reviewKey: campaignReviewKey({ draft: d, proposed, current, errors }),
    commit: { local: false, visibility: "shared", undoable: false },
    returnTo: clone(d.returnTo),
  };
}
function snapshotSession(session, viewer) {
  return {
    revision: session.revision,
    title: session.title,
    startsAt: session.startsAt,
    timeZone: session.timeZone,
    localTime: session.localTime,
    status: session.status,
    played: session.played,
    cancellationReason: session.cancellationReason ?? null,
    changedBy: viewer,
    createdAt: now(),
  };
}
export function applySessionDraft(state, id, { reviewKey }, viewer, { online = true } = {}) {
  const d = privateDraft(state, id, viewer);
  if (d.status === "applied" && d.result) return clone(d.result);
  const p = previewSessionDraft(state, id, viewer);
  if (p.reviewKey !== reviewKey) fail("Il riepilogo è cambiato.", "Review changed.");
  if (!p.canApply) fail(p.errors[0].it, p.errors[0].en);
  if (!online)
    fail(
      "La conferma condivisa richiede connessione.",
      "Shared confirmation requires a connection.",
    );
  const result = { draftId: id, returnTo: clone(d.returnTo) };
  if (d.kind === "poll") {
    const pollId = `poll-${d.id}`;
    if (pollById(state, pollId)) fail("Identità già usata.", "Identity already used.");
    const slots = p.proposed.slots.map(({ candidates, ...slot }) => slot);
    (state.campaign.polls ??= []).push({
      ...clone(p.proposed),
      id: pollId,
      slots,
      revision: 1,
      organizerId: viewer,
      responses: {},
      confirmedSessionId: null,
      createdAt: now(),
    });
    result.pollId = pollId;
  } else {
    const sessionId = d.sessionId ?? `session-${d.id}`;
    let session = sessionById(state, sessionId);
    const { candidates, permissions, history, ...proposed } = p.proposed;
    if (["change", "cancel"].includes(d.kind)) {
      Object.assign(session, clone(proposed));
      session.revision++;
    } else {
      if (session) fail("Identità già usata.", "Identity already used.");
      session = {
        ...clone(proposed),
        id: sessionId,
        revision: 1,
        organizerId: viewer,
        createdAt: now(),
        history: [],
      };
      (state.campaign.sessions ??= []).push(session);
    }
    session.history ??= [];
    session.history.push(snapshotSession(session, viewer));
    result.sessionId = sessionId;
    if (d.kind === "confirm") {
      const poll = pollById(state, d.pollId);
      poll.status = "confirmed";
      poll.confirmedSessionId = sessionId;
      poll.confirmedSlotId = d.slotId;
      poll.revision++;
      result.pollId = poll.id;
      // P9 CA-43: who said «Disponibile» (or «Se necessario», or no) for the chosen date
      // does not have to answer again: the answers become the session's first RSVPs
      // (Rallly → the event's attendees). They lapse if the date later moves.
      const slot = poll.slots.find((value) => value.id === d.slotId);
      session.pollAnswers = Object.fromEntries(
        poll.participants.flatMap((person) => {
          const recorded = poll.responses?.[person]?.[d.slotId];
          return recorded && recorded.slotRevision === slot?.revision
            ? [[person, recorded.response]]
            : [];
        }),
      );
      session.pollAnswersFor = session.startsAt;
      session.pollId = poll.id;
    }
  }
  d.status = "applied";
  d.result = clone(result);
  d.updatedAt = now();
  return clone(result);
}
export function setSessionAvailability(
  state,
  pollId,
  { slotId, slotRevision, response },
  viewer,
  { online = true } = {},
) {
  const poll = pollById(state, pollId),
    slot = poll?.slots.find((value) => value.id === slotId);
  if (
    !member(state, viewer) ||
    !poll ||
    poll.status !== "open" ||
    !poll.participants.includes(viewer) ||
    !slot ||
    slot.revision !== slotRevision ||
    ![null, "yes", "maybe", "no"].includes(response)
  )
    fail(
      "Risposta non consentita o alternativa cambiata.",
      "Response unavailable or option changed.",
    );
  if (!online)
    fail("La risposta condivisa richiede connessione.", "Shared response requires a connection.");
  const next = response === null ? null : { slotRevision, response };
  const old = poll.responses?.[viewer]?.[slotId] ?? null;
  if (!equal(old, next)) {
    poll.responses ??= {};
    poll.responses[viewer] ??= {};
    if (next === null) delete poll.responses[viewer][slotId];
    else poll.responses[viewer][slotId] = next;
    poll.revision++;
  }
  return pollProjection(state, poll, viewer);
}

/**
 * Totals per proposed date and the best one (Rallly's totals row with the best column
 * highlighted; when2meet's heatmap): «Disponibile» counts most, «Se necessario» breaks a tie.
 * Only answers to the date as it is now count. Returns {slots: [{id, yes, maybe, no, none,
 * best}], best: [slotId…], participants}.
 */
export function pollSummary(poll) {
  const participants = [...(poll?.participants ?? [])];
  const slots = (poll?.slots ?? []).map((slot) => {
    const counts = { yes: 0, maybe: 0, no: 0, none: 0 };
    for (const person of participants) {
      const recorded = poll.responses?.[person]?.[slot.id];
      const answer = recorded?.slotRevision === slot.revision ? recorded.response : null;
      counts[answer ?? "none"]++;
    }
    return { id: slot.id, ...counts };
  });
  const score = (row) => row.yes * 1000 + row.maybe;
  const top = Math.max(0, ...slots.map(score));
  const best = top > 0 ? slots.filter((row) => score(row) === top).map((row) => row.id) : [];
  return {
    participants,
    best,
    slots: slots.map((row) => ({ ...row, best: best.includes(row.id) })),
  };
}

// Administrative and system events are not play (Quest Portal recaps are built from what
// happened at the table): settings, preferences, integrations, account, drafts, sharing,
// templates, views, exports. P9 CA-21 / SV-44.
const ADMIN_EVENT =
  /^(impostazion|setting|preferen|integrazion|integration|modul|module|discord|avrae|webhook|token|account|profil|notific|promemoria|reminder|scorciatoi|shortcut|keyboard|lingua|language|tema\b|theme|bozza|draft|contenuto di campagna|campaign content|vista|view|modello|template|voce eliminata|entry deleted|versione ripristinata|version restored|feed|calendario|calendar|invit|membr|member|permess|permission|accesso|access|sicurezza|safety|consenso|consent|assistente|assistant|esporta|export|importa|import|istantanea|snapshot|cestino|trash|archivio della chat|chat archive|creazione rapida|quick create|nota personale|personal note|appunt|segnalibr|bookmark|offline|sincronizz|sync)/i;
const ADMIN_ANYWHERE = /(eliminazione dell.account|account deletion|moduli delle integrazioni|integration modules|proposte a un giocatore|proposed to a player)/i;
/** Whether a Table log entry is a play event (not an administrative or system one). */
export function isPlayEvent(entry) {
  if (!entry || entry.kind !== "change" || typeof entry.label !== "string") return false;
  if (entry.visibility === "private") return false;
  const label = entry.label.trim();
  return !ADMIN_EVENT.test(label) && !ADMIN_ANYWHERE.test(label);
}

const minutes = (ms) => {
  const total = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(total / 60);
  return h ? `${h} h ${String(total % 60).padStart(2, "0")} min` : `${total} min`;
};
/**
 * «Prepara bozza automatica» for a recap (Quest Portal Session Stories; the Shard encounter
 * log): attendance, duration, scenes and the play events of the evening, administrative
 * events left out. Pure; reads only what the viewer's campaign shows. Returns {title, body,
 * sessionId, events}.
 */
export function autoRecap(state, { sessionId = null, now = Date.now() } = {}, viewer, lang = "it") {
  const t = (it, en) => (lang === "en" ? en : it);
  if (!member(state, viewer)) fail();
  const sessions = state.campaign?.sessions ?? [];
  const past = sessions
    .filter((row) => row.status !== "cancelled" && (row.played || (row.startsAt && Date.parse(row.startsAt) <= now)))
    .sort((a, b) => String(b.startsAt ?? "").localeCompare(String(a.startsAt ?? "")));
  const session = sessions.find((row) => row.id === sessionId) ?? past[0] ?? null;
  const tables = state.ext?.["session-view"]?.sessions ?? [];
  const table =
    tables.find((row) => session && row.campaignSessionId === session.id) ??
    (session?.startsAt
      ? tables.find((row) => Math.abs((row.startedAt ?? 0) - Date.parse(session.startsAt)) < 12 * 3600e3)
      : null) ??
    [...tables].filter((row) => row.startedAt).sort((a, b) => b.startedAt - a.startedAt)[0] ??
    null;
  const from = table?.startedAt ?? (session?.startsAt ? Date.parse(session.startsAt) : null);
  const to = table?.endedAt ?? (from ? from + 6 * 3600e3 : null);
  const locale = lang === "en" ? "en-GB" : "it-IT";
  const people = campaignMembers(state);
  const nameOf = (id) => {
    const row = people.find((person) => person.id === id);
    const raw = typeof row?.name === "object" ? row.name[lang] ?? row.name.it : String(row?.name ?? id);
    const parts = raw.split(" / ");
    return parts.length === 2 ? (lang === "en" ? parts[1] : parts[0]) : raw;
  };
  // Attendance: the recorded roll call, else who was at the Table, else the RSVPs.
  const recorded = session ? state.ext?.["sessions-plus"]?.attendance?.[session.id]?.records : null;
  let attendance;
  if (recorded)
    attendance = Object.entries(recorded).map(
      ([id, row]) => `${nameOf(id)}: ${row.status === "present" ? t("presente", "present") : t("assente", "absent")}`,
    );
  else if (table?.presence?.length)
    attendance = [...new Set(table.presence.map((row) => row.memberId))].map(
      (id) => `${nameOf(id)}: ${t("presente", "present")}`,
    );
  else if (session) {
    const rsvps = state.ext?.["sessions-plus"]?.rsvps?.[session.id] ?? {};
    const carried = session.pollAnswers ?? {};
    attendance = people
      .filter((row) => rsvps[row.id] || carried[row.id])
      .map((row) => {
        const status = rsvps[row.id]?.status ?? { yes: "attending", maybe: "maybe", no: "skipping" }[carried[row.id]];
        return `${nameOf(row.id)}: ${status === "attending" ? t("ha detto che c’era", "said they would come") : status === "skipping" ? t("assente", "absent") : t("forse", "maybe")}`;
      });
  }
  const pauses = (table?.pauses ?? []).reduce(
    (sum, p) => sum + Math.max(0, Math.min(p.to ?? to, to) - p.from),
    0,
  );
  const duration = table?.startedAt && table?.endedAt ? table.endedAt - table.startedAt : null;
  const scenes = [];
  for (const segment of table?.scenes ?? []) {
    const row = scenes.find((entry) => entry.name === segment.name);
    const ms = Math.max(0, Math.min(segment.to ?? to, to) - segment.from);
    if (row) row.ms += ms;
    else scenes.push({ name: segment.name, ms });
  }
  const events = (state.log ?? [])
    .filter((entry) => isPlayEvent(entry))
    .filter((entry) => {
      const at = Date.parse(entry.time);
      return from && to ? at >= from && at <= to : true;
    })
    .map((entry) => entry.label)
    .slice(-12);
  const day = from
    ? new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(from))
    : t("data non indicata", "date not given");
  const title = session?.title
    ? t(`Resoconto: ${session.title}`, `Recap: ${session.title}`)
    : t(`Resoconto del ${day}`, `Recap of ${day}`);
  const body = [
    `${t("Sessione", "Session")}: ${session?.title || t("partita", "game")} · ${day}`,
    `${t("Presenze", "Attendance")}: ${attendance?.length ? attendance.join("; ") : t("non registrate", "not recorded")}`,
    `${t("Durata", "Duration")}: ${duration ? minutes(duration) + (pauses >= 60000 ? `, ${t("di cui in pausa", "of which paused")} ${minutes(pauses)}` : "") : t("non registrata", "not recorded")}`,
    `${t("Scene", "Scenes")}: ${scenes.length ? scenes.map((row) => `${row.name} (${minutes(row.ms)})`).join("; ") : t("nessuna registrata", "none recorded")}`,
    "",
    `${t("Eventi di gioco", "Play events")}:`,
    ...(events.length ? events.map((label) => `- ${label}`) : [`- ${t("nessuno registrato al Tavolo", "none recorded at the Table")}`]),
    "",
    t("Cosa è successo:", "What happened:"),
    "",
  ].join("\n");
  return { title, body, sessionId: session?.id ?? null, events };
}
