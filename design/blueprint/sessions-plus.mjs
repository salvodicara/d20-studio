// B51 — Sessions: recurrence, absences, seats and attendance. Entry module loaded by
// extensions.mjs through the B11 registry. Everything lives inside Campaign → Sessions
// (the core list of increment 7): a block under its toolbar (recurring series for the DM,
// "Your attendance" for a player) and a block inside each session (answers, seats and
// waitlist, attendance, the log). A recap linked to a session shows its attendance. The
// B24 centre receives freed seats, re-asks and skips; the B23 palette gets two commands.
//
// Adopted patterns and census IDs are listed in sessions-plus-domain.mjs; the UI copies:
// Sesh's three RSVP buttons with counts, cap and waitlist position (SVC-058); StartPlaying's
// cadence form with batch of up to 10 dates (SVC-048/049) and "Skipping" next to a
// separate "Leave Campaign" (SVC-052); Google-Calendar-style scope choice "this one / this
// and following" for Discord's all-future edit (SVC-056) and StartPlaying's single
// reschedule (SVC-053); StartPlaying's GM marking a player (SVC-054); Sesh's log (SVC-061).
// Stars and wishes (B27, StartPlaying SVC-076) is offered at the end of a session.

import * as D from "./sessions-plus-domain.mjs";
import { SAFETY_SLICE, enabledTools, openRoundOf, checklistFor } from "./safety-domain.mjs";
import { canViewActor, isCampaignActor } from "./character-access.mjs";
import { isCampaignMember, canOrganizeSessions } from "./campaign-content.mjs";

const L = (it, en) => ({ it, en });
const member = (ctx) =>
  Boolean(ctx?.state?.campaign?.id) && isCampaignMember(ctx.state, ctx.state.campaign.id, ctx.role);
const organizes = (ctx) => canOrganizeSessions(ctx.state, ctx.state.campaign?.id, ctx.role);
const now = () => Date.now();
const locale = (ctx) => (ctx.lang === "it" ? "it-IT" : "en-GB");
const viewerZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

// Keyboard focus survives the re-render that follows a command (the pressed control).
let focusAfter = null;
// The control that opened the current dialog (its data-sp-focus key). The shell closes a
// dialog after onSubmit returns and the list is re-rendered meanwhile, so the opener is
// found again by key once the current task ends; a vanished one falls back to its row,
// card or block (all focusable with tabindex="-1").
let opener = null;
function related(key) {
  const base = key.slice(0, key.lastIndexOf("-"));
  if (key.startsWith("row-"))
    return [`${base}-restore`, `${base}-edit`, `${base}-attendance`, base];
  if (key.startsWith("card-")) return [`${base}-revert`, base, "overview"];
  if (key.startsWith("pending-")) return [`row-${key.slice(8)}-attendance`, "overview"];
  return ["overview"];
}
function refocus(key = opener) {
  if (!key) return;
  const keys = [key, ...related(key)];
  queueMicrotask(() => {
    const doc = globalThis.document;
    for (const k of keys) {
      const target = doc?.querySelector?.(`[data-sp-focus="${k}"]`);
      if (target) return target.focus?.();
    }
  });
}

// ---------------------------------------------------------------------------------------
// Words

const ANSWER = {
  attending: L("Partecipa", "Attending"),
  maybe: L("Forse", "Maybe"),
  skipping: L("Salta", "Skipping"),
  waitlist: L("In lista d’attesa", "Waitlisted"),
  none: L("Nessuna risposta", "No answer"),
  stale: L("Da riconfermare", "To confirm again"),
};
const OWN = {
  attending: L("Partecipo", "Attending"),
  maybe: L("Forse", "Maybe"),
  skipping: L("Salto questa", "Skip this one"),
};
const ORDINAL = (ctx, n) => (ctx.lang === "it" ? `${n}°` : `#${n}`);
function when(ctx, value, timeZone) {
  if (!value || Number.isNaN(Date.parse(value))) return ctx.t("Senza data", "No date");
  try {
    return new Intl.DateTimeFormat(locale(ctx), {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      ...(timeZone ? { timeZone } : {}),
    }).format(new Date(value));
  } catch {
    return value;
  }
}
function weekdayTime(ctx, value, timeZone) {
  try {
    return new Intl.DateTimeFormat(locale(ctx), {
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    }).format(new Date(value));
  } catch {
    return "";
  }
}
const hoursText = (ctx, hours) => {
  const h = Math.max(0, Math.floor(hours));
  if (h < 1) return ctx.t("meno di un’ora", "less than an hour");
  return h === 1 ? ctx.t("1 ora", "1 hour") : ctx.t(`${h} ore`, `${h} hours`);
};
const tFor = (lang) => ({ t: (it, en) => (lang === "it" ? it : en) });
/** A member's display name (account name first), with their campaign characters. */
function personName(ctx, person) {
  if (!person) return ctx.t("Qualcuno", "Someone");
  if (person.kind === "guest") return `${person.name} (${ctx.t("ospite", "guest")})`;
  const display = ctx.state.ext?.account?.profiles?.[person.id]?.displayName;
  const raw = typeof display === "string" && display.trim() ? display.trim() : person.name;
  const base =
    person.id === "dm" && raw === "DM"
      ? "DM"
      : raw === "Giocatore / Player" || !raw
        ? ctx.t("Giocatore", "Player")
        : ctx.label(raw);
  const cid = ctx.state.campaign?.id;
  const characters = Object.values(ctx.state.actors ?? {})
    .filter(
      (actor) =>
        actor.kind === "character" &&
        actor.owner === person.id &&
        person.id !== "dm" &&
        isCampaignActor(actor, cid) &&
        canViewActor(actor, ctx.role, ctx.state),
    )
    .map((actor) => ctx.label(actor.name));
  return characters.length ? `${base} · ${characters.join(", ")}` : base;
}
function nameOf(ctx, id) {
  if (!id) return ctx.t("Qualcuno", "Someone");
  const guest = D.knownGuests(ctx.state).find((g) => g.id === id);
  if (guest) return personName(ctx, { ...guest, kind: "guest" });
  const found = (
    ctx.state.campaign?.members ?? [
      { id: "player", name: "Giocatore / Player" },
      { id: "dm", name: "DM" },
    ]
  ).find((m) => m.id === id);
  return personName(ctx, { id, kind: "member", name: found?.name ?? id });
}
const errorText = (ctx, error) =>
  error?.it ? ctx.t(error.it, error.en) : String(error?.message ?? error);
const sessionTitle = (ctx, session) => session?.title || ctx.t("Sessione", "Session");

// ---------------------------------------------------------------------------------------
// Commands (shared writes; scheduling survives gameplay Undo like the core sessions)

function change(ctx, it, en, fn) {
  let result;
  ctx.commit(
    ctx.t(it, en),
    (draft) => {
      result = fn(draft);
    },
    { undoable: false },
  );
  return result;
}
function attempt(ctx, fn) {
  try {
    return fn();
  } catch (error) {
    ctx.toast(errorText(ctx, error), true);
    return null;
  }
}
function answer(ctx, sessionId, status, focus = null) {
  focusAfter = focus;
  const result = attempt(ctx, () =>
    change(ctx, "Risposta alla sessione", "Session answer", (draft) =>
      D.respond(draft, { sessionId, status }, ctx.role, now()),
    ),
  );
  if (!result) {
    focusAfter = null;
    return null;
  }
  if (result.late)
    ctx.toast(
      ctx.t(
        `La sessione inizia fra ${hoursText(ctx, result.hoursLeft)}: risposta registrata, il DM riceve un avviso.`,
        `The session starts in ${hoursText(ctx, result.hoursLeft)}: answer recorded, the DM gets a notice.`,
      ),
    );
  else if (result.status === "waitlist")
    ctx.toast(
      ctx.t(
        `Posti esauriti: sei in lista d’attesa, ${ORDINAL(ctx, result.position)}. Ti avvisiamo se si libera un posto.`,
        `No seats left: you are waitlisted, ${ORDINAL(ctx, result.position)}. You will be told if a seat opens.`,
      ),
    );
  else ctx.toast(ctx.t("Risposta registrata.", "Answer recorded."));
  return result;
}

// ---------------------------------------------------------------------------------------
// Block under the toolbar: series (organizers) and "Your attendance" (players)

function seriesCard(ctx, series) {
  const t = now();
  const rows = series.sessionIds
    .map((id) => ctx.state.campaign?.sessions?.find((s) => s.id === id))
    .filter(Boolean);
  const next = rows.find(
    (s) => s.status === "scheduled" && s.startsAt && Date.parse(s.startsAt) > t,
  );
  const played = rows.filter(
    (s) => s.status !== "cancelled" && (s.played || (s.startsAt && Date.parse(s.startsAt) <= t)),
  ).length;
  const cancelled = rows.filter((s) => s.status === "cancelled").length;
  const planned = rows.length - played - cancelled;
  const cadence =
    series.frequency === "weekly"
      ? ctx.t("Ogni settimana", "Every week")
      : ctx.t("Ogni due settimane", "Every two weeks");
  const reference = next ?? rows.find((s) => s.startsAt);
  const guests = series.guests
    .map((id) => D.knownGuests(ctx.state).find((g) => g.id === id)?.name)
    .filter(Boolean);
  const revertible = D.revertibleChange(ctx.state, { seriesId: series.id }, t);
  const key = `card-${series.id}`;
  return `<article class="sp-series" data-sp-series-card="${ctx.esc(series.id)}" tabindex="-1" data-sp-focus="${ctx.esc(key)}"><h3>${ctx.esc(series.title)}</h3><p class="sp-cadence">${ctx.esc(cadence)}${reference ? ` · ${ctx.esc(weekdayTime(ctx, reference.startsAt, reference.timeZone))} (${ctx.esc(reference.timeZone)})` : ""}${series.status === "ended" ? ` · <span class="badge">${ctx.t("Terminata", "Ended")}</span>` : ""}</p><p class="campaign-meta">${ctx.t(`${rows.length} date: ${played} giocate o iniziate, ${planned} in programma, ${cancelled} annullate`, `${rows.length} dates: ${played} played or started, ${planned} planned, ${cancelled} cancelled`)}</p><p class="campaign-meta">${ctx.t("Posti per giocatori", "Player seats")}: ${series.seats ?? ctx.t("nessun limite", "no limit")}${guests.length ? ` · ${ctx.t("Ospiti invitati", "Invited guests")}: ${ctx.esc(guests.join(", "))}` : ""}${next ? ` · ${ctx.t("Prossima", "Next")}: <time datetime="${ctx.esc(next.startsAt)}">${ctx.esc(when(ctx, next.startsAt))}</time>` : ""}</p>${
    ctx.state && organizes(ctx)
      ? `<div class="sp-actions">${revertible ? `<button type="button" class="button" data-sp-act="revert" data-change="${ctx.esc(revertible.id)}" data-sp-focus="${ctx.esc(key)}-revert">${ctx.esc(revertLabel(ctx, revertible))}</button>` : ""}${next ? `<button type="button" class="button quiet" data-sp-act="edit" data-session="${ctx.esc(next.id)}" data-scope="future" data-sp-focus="${ctx.esc(key)}-edit">${ctx.t("Modifica tutte le prossime…", "Edit all upcoming…")}</button><button type="button" class="button quiet" data-sp-act="cancel" data-session="${ctx.esc(next.id)}" data-scope="future" data-sp-focus="${ctx.esc(key)}-cancel">${ctx.t("Termina la serie…", "End the series…")}</button>` : ""}</div>`
      : ""
  }</article>`;
}
function revertLabel(ctx, change) {
  const facts = change.summary?.facts ?? [];
  const n = change.sessionIds.length;
  const what =
    change.kind === "cancel"
      ? ctx.t(
          `annullamento di ${n} ${n === 1 ? "data" : "date"}`,
          `cancellation of ${n} ${n === 1 ? "date" : "dates"}`,
        )
      : change.kind === "restore"
        ? ctx.t("ripristino", "restore")
        : facts.includes("time")
          ? ctx.t(
              `orario di ${n} ${n === 1 ? "data" : "date"}`,
              `time of ${n} ${n === 1 ? "date" : "dates"}`,
            )
          : ctx.t(
              `modifica di ${n} ${n === 1 ? "data" : "date"}`,
              `edit of ${n} ${n === 1 ? "date" : "dates"}`,
            );
  return ctx.t(`Annulla l’ultima modifica (${what})`, `Undo the last change (${what})`);
}
// Warhorn (SVC-009): when the seats are taken the join button says it joins the waitlist,
// and a waitlisted answer shows its place in the queue.
function attendLabel(ctx, current, counts) {
  if (current === "waitlist") {
    const position = counts.waitlist.indexOf(ctx.role) + 1;
    return `${ctx.label(ANSWER.waitlist)} (${ORDINAL(ctx, position)})`;
  }
  if (current !== "attending" && counts.seats !== null && counts.free <= 0)
    return ctx.t("Mettimi in lista d’attesa", "Join the waitlist");
  return ctx.label(OWN.attending);
}
function ownButtons(ctx, sessionId, current, focusPrefix, counts) {
  return `<div class="sp-rsvp" role="group" aria-label="${ctx.t("La tua risposta", "Your answer")}">${D.ANSWERS.map(
    (status) => {
      const pressed = current === status || (status === "attending" && current === "waitlist");
      const text =
        status === "attending"
          ? attendLabel(ctx, current, counts)
          : ctx.label(
              status === "skipping" && focusPrefix === "next"
                ? L("Salto la prossima", "Skip the next one")
                : OWN[status],
            );
      return `<button type="button" class="button${pressed ? " active" : ""}" aria-pressed="${pressed}" data-sp-answer="${status}" data-session="${ctx.esc(sessionId)}" data-sp-focus="${focusPrefix}-${status}">${ctx.esc(text)}</button>`;
    },
  ).join("")}</div>`;
}
function answerText(ctx, answer, counts, personId) {
  if (answer.stale) return ctx.label(ANSWER.stale);
  if (!answer.status) return ctx.label(ANSWER.none);
  if (answer.status === "waitlist") {
    const position = counts.waitlist.indexOf(personId) + 1;
    return `${ctx.label(ANSWER.waitlist)} (${ORDINAL(ctx, position)})`;
  }
  // P9 CA-43: carried over from the availability poll for this date.
  return `${ctx.label(ANSWER[answer.status])}${answer.fromPoll ? ctx.t(" (dalla raccolta disponibilità)", " (from the availability poll)") : ""}`;
}
function playerCard(ctx) {
  const t = now();
  const next = D.nextSessionFor(ctx.state, ctx.role, t);
  const leave = ctx.registry?.get("campaign-section", "campaign-members", ctx);
  let body;
  if (!next)
    body = `<p class="muted">${ctx.t("Nessuna sessione in programma per te.", "No session planned for you.")}</p>`;
  else {
    const view = D.sessionView(ctx.state, next.id, ctx.role, t);
    const mine = view.mine?.answer ?? { status: null };
    const late =
      mine.late && ["skipping", "maybe"].includes(mine.status)
        ? `<p class="sp-alert sp-late" role="status">${ctx.t(`Inizia fra ${hoursText(ctx, view.hoursLeft)}: la risposta è registrata comunque e il DM riceve un avviso.`, `Starts in ${hoursText(ctx, view.hoursLeft)}: your answer is recorded anyway and the DM gets a notice.`)}</p>`
        : "";
    body = `<p><strong>${ctx.esc(sessionTitle(ctx, next))}</strong> · <time datetime="${ctx.esc(next.startsAt)}">${ctx.esc(when(ctx, next.startsAt))}</time></p><p class="campaign-meta" data-sp-mine>${ctx.t("La tua risposta", "Your answer")}: ${ctx.esc(answerText(ctx, mine, view.counts, ctx.role))}</p>${late}${ownButtons(ctx, next.id, mine.stale ? null : mine.status, "next", view.counts)}`;
  }
  return `<section class="sp-block sp-mine" aria-labelledby="sp-mine-title"><h2 id="sp-mine-title">${ctx.t("La tua presenza", "Your attendance")}</h2>${body}<div class="sp-leave"><p class="muted">${ctx.t("Saltare una sessione non ti toglie dalla campagna: personaggio, posto e prossime date restano tuoi. Lasciare la campagna è un’altra cosa e si fa da Membri.", "Skipping a session does not remove you from the campaign: your character, seat and next dates stay yours. Leaving the campaign is a different step, done from Members.")}</p>${leave ? `<button type="button" class="button quiet" data-sp-act="leave">${ctx.t("Esci dalla campagna…", "Leave campaign…")}</button>` : ""}</div></section>`;
}
function organizerBlock(ctx) {
  const slice = D.sliceOf(ctx.state);
  const series = slice.series.filter((row) => row.campaignId === ctx.state.campaign?.id);
  const t = now();
  const pending = (ctx.state.campaign?.sessions ?? []).filter(
    (s) =>
      s.status !== "cancelled" &&
      D.canRecordAttendance(ctx.state, s.id, t) &&
      !slice.attendance[s.id] &&
      (!s.startsAt || t - Date.parse(s.startsAt) < 14 * 24 * 3600e3),
  );
  return `<section class="sp-block" aria-labelledby="sp-series-title" tabindex="-1" data-sp-focus="overview"><div class="sp-block-head"><h2 id="sp-series-title">${ctx.t("Serie ricorrenti", "Recurring series")}</h2><button type="button" class="button" data-sp-act="new-series" data-sp-focus="ov-new-series">${ctx.t("Nuova serie ricorrente…", "New recurring series…")}</button></div>${series.length ? series.map((row) => seriesCard(ctx, row)).join("") : `<p class="muted">${ctx.t("Nessuna serie. Programma fino a 10 date alla volta, ogni settimana o ogni due settimane: ogni data diventa una sessione di questo elenco.", "No series yet. Schedule up to 10 dates at a time, weekly or every two weeks: each date becomes a session of this list.")}</p>`}${pending.length ? `<div class="sp-pending" role="status"><p><strong>${ctx.t("Presenze da registrare", "Attendance to record")}</strong></p><ul>${pending.map((s) => `<li><span>${ctx.esc(sessionTitle(ctx, s))}${s.startsAt ? ` · ${ctx.esc(when(ctx, s.startsAt))}` : ""}</span><button type="button" class="button quiet" data-sp-act="attendance" data-session="${ctx.esc(s.id)}" data-sp-focus="pending-${ctx.esc(s.id)}">${ctx.t("Registra presenze…", "Record attendance…")}</button></li>`).join("")}</ul></div>` : ""}</section>`;
}
export function renderOverview(ctx) {
  return `<div class="sp-overview">${organizes(ctx) ? organizerBlock(ctx) : playerCard(ctx)}</div>`;
}

// ---------------------------------------------------------------------------------------
// Block inside each session

function latestStartedId(ctx) {
  const t = now();
  const rows = (ctx.state.campaign?.sessions ?? []).filter(
    (s) => s.status !== "cancelled" && D.canRecordAttendance(ctx.state, s.id, t),
  );
  const key = (s) => s.startsAt ?? s.createdAt ?? "";
  return rows.sort((a, b) => String(key(b)).localeCompare(String(key(a))))[0]?.id ?? null;
}
function starsOffer(ctx, view) {
  if (view.session.id !== latestStartedId(ctx)) return "";
  if (!ctx.registry?.get("campaign-section", "safety", ctx)) return "";
  const slice = ctx.state.ext?.[SAFETY_SLICE];
  const cid = ctx.state.campaign?.id;
  if (!slice || !cid || !enabledTools(slice, cid).includes("stars")) return "";
  const open = openRoundOf(slice, cid);
  if (view.manage)
    return `<div class="sp-stars"><p>${open ? ctx.t(`Stelle e desideri: raccolta aperta, ${open.entries.length} risposte.`, `Stars and wishes: collection open, ${open.entries.length} answers.`) : ctx.t("Fine sessione: chiedi al gruppo una stella (cosa è piaciuto) e un desiderio (per la prossima volta). Facoltativo e anonimo.", "End of session: ask the group for a star (what they enjoyed) and a wish (for next time). Optional and anonymous.")}</p><button type="button" class="button" data-sp-act="stars">${open ? ctx.t("Vai a Stelle e desideri", "Go to Stars and wishes") : ctx.t("Chiedi stelle e desideri…", "Ask for stars and wishes…")}</button></div>`;
  return open
    ? `<div class="sp-stars"><p>${ctx.t("Il DM chiede stelle e desideri su questa sessione. Rispondere è facoltativo.", "The DM asks for stars and wishes about this session. Answering is optional.")}</p><button type="button" class="button" data-sp-act="stars">${ctx.t("Scrivi stelle e desideri", "Write stars and wishes")}</button></div>`
    : "";
}
function attendanceBlock(ctx, view) {
  const a = view.attendance;
  const list = a
    ? `<ul class="sp-people">${a.people.map((p) => `<li><span class="sp-dot is-${p.status}" aria-hidden="true"></span><span>${ctx.esc(personName(ctx, p))}: <strong>${p.status === "present" ? ctx.t("presente", "present") : ctx.t("assente", "absent")}</strong>${p.note ? ` — ${ctx.esc(p.note)}` : ""}</span></li>`).join("")}</ul><p class="campaign-meta">${ctx.t("Registrate da", "Recorded by")} ${ctx.esc(nameOf(ctx, a.by))} · ${ctx.esc(when(ctx, a.at))}${a.corrections.length ? ` · ${a.corrections.length === 1 ? ctx.t("1 correzione", "1 correction") : ctx.t(`${a.corrections.length} correzioni`, `${a.corrections.length} corrections`)}` : ""}</p>${
        a.corrections.length && view.manage
          ? `<details class="sp-history"><summary>${ctx.t("Versioni precedenti", "Earlier versions")}</summary><ol>${a.corrections
              .map(
                (c) =>
                  `<li>${ctx.t("Versione", "Version")} ${c.revision} · ${ctx.esc(when(ctx, c.at))} · ${ctx.t("motivo della correzione", "reason for correcting")}: ${ctx.esc(c.reason)} — ${Object.entries(
                    c.records,
                  )
                    .map(
                      ([pid, r]) =>
                        `${ctx.esc(nameOf(ctx, pid))} ${r.status === "present" ? ctx.t("presente", "present") : ctx.t("assente", "absent")}`,
                    )
                    .join(", ")}</li>`,
              )
              .join("")}</ol></details>`
          : ""
      }`
    : `<p class="muted">${ctx.t("Presenze non ancora registrate.", "Attendance not recorded yet.")}</p>`;
  return `<div class="sp-attendance"><h4>${ctx.t("Presenze", "Attendance")}</h4>${list}${view.canRecord ? `<button type="button" class="button${a ? " quiet" : ""}" data-sp-act="attendance" data-session="${ctx.esc(view.session.id)}" data-sp-focus="row-${ctx.esc(view.session.id)}-attendance">${a ? ctx.t("Correggi presenze…", "Correct attendance…") : ctx.t("Registra presenze…", "Record attendance…")}</button>` : ""}${starsOffer(ctx, view)}</div>`;
}
function logBlock(ctx, view) {
  const rows = view.log.filter((row) => row.kind !== "note");
  if (!rows.length) return "";
  const line = (row) => {
    const who = nameOf(ctx, row.by);
    const person = row.personId ? nameOf(ctx, row.personId) : "";
    const label = (s) => (s ? ctx.label(ANSWER[s] ?? ANSWER.none) : ctx.label(ANSWER.none));
    switch (row.kind) {
      case "rsvp":
        return row.by === row.personId
          ? ctx.t(
              `${person}: ${label(row.from)} → ${label(row.to)}`,
              `${person}: ${label(row.from)} → ${label(row.to)}`,
            ) +
              (row.late
                ? ctx.t(
                    ` (a ridosso, ${(row.hoursLeft ?? 0) <= 1 ? "mancava" : "mancavano"} ${hoursText(ctx, row.hoursLeft)})`,
                    ` (late, ${hoursText(ctx, row.hoursLeft)} before)`,
                  )
                : "")
          : ctx.t(
              `${who} per ${person}: ${label(row.from)} → ${label(row.to)}`,
              `${who} for ${person}: ${label(row.from)} → ${label(row.to)}`,
            ) + (row.reason ? ` — ${row.reason}` : "");
      case "promote":
        return ctx.t(
          `${person}: posto libero, dalla lista d’attesa a Partecipa`,
          `${person}: seat opened, from waitlist to Attending`,
        );
      case "reask":
        return ctx.t(
          `${who} ha spostato la sessione: le risposte si danno di nuovo`,
          `${who} moved the session: answers are asked again`,
        );
      case "cancel":
        return (
          ctx.t(`${who} ha annullato la data`, `${who} cancelled the date`) +
          (row.reason ? ` — ${row.reason}` : "")
        );
      case "restore":
        return ctx.t(`${who} ha ripristinato la data`, `${who} restored the date`);
      case "attendance":
        return row.revision > 1
          ? ctx.t(`${who} ha corretto le presenze`, `${who} corrected attendance`) +
              (row.reason ? ` — ${row.reason}` : "")
          : ctx.t(`${who} ha registrato le presenze`, `${who} recorded attendance`);
      case "series":
        return ctx.t(`${who} ha programmato la serie`, `${who} scheduled the series`);
      default:
        return row.kind;
    }
  };
  return `<details class="sp-log"><summary>${ctx.t("Registro", "Log")} (${rows.length})</summary><ol>${rows
    .slice()
    .reverse()
    .map(
      (row) =>
        `<li><time datetime="${ctx.esc(row.at)}">${ctx.esc(when(ctx, row.at))}</time> · ${ctx.esc(line(row))}</li>`,
    )
    .join("")}</ol></details>`;
}
export function renderRow(ctx, row) {
  const t = now();
  const view = D.sessionView(ctx.state, row.id, ctx.role, t);
  if (!view) return "";
  const { session, series, counts, people, mine, manage } = view;
  const parts = [];
  if (series)
    parts.push(
      `<p class="sp-badge"><span class="badge">${ctx.t("Serie", "Series")}</span> ${ctx.esc(series.title)} · ${ctx.t(`data ${series.index} di ${series.sessionIds.length}`, `date ${series.index} of ${series.sessionIds.length}`)}</p>`,
    );
  if (view.open) {
    const seatsLine =
      counts.seats === null
        ? ctx.t(
            `Partecipano ${counts.attending} · Forse ${counts.maybe} · Saltano ${counts.skipping} · Senza risposta ${counts.none}`,
            `Attending ${counts.attending} · Maybe ${counts.maybe} · Skipping ${counts.skipping} · No answer ${counts.none}`,
          )
        : ctx.t(
            `Posti: ${counts.attending} su ${counts.seats} · In attesa ${counts.waitlist.length} · Forse ${counts.maybe} · Saltano ${counts.skipping} · Senza risposta ${counts.none}`,
            `Seats: ${counts.attending} of ${counts.seats} · Waitlisted ${counts.waitlist.length} · Maybe ${counts.maybe} · Skipping ${counts.skipping} · No answer ${counts.none}`,
          );
    const full = counts.seats !== null && counts.free <= 0;
    parts.push(
      `<p class="sp-counts" data-sp-counts>${ctx.esc(seatsLine)}${full ? ` · <strong>${ctx.t("completo", "full")}</strong>` : ""}</p>`,
    );
    if (people.length)
      parts.push(
        `<ul class="sp-people">${people
          .map((p) => {
            const state = p.answer.stale ? "stale" : (p.answer.status ?? "none");
            return `<li data-sp-person="${ctx.esc(p.id)}"><span class="sp-dot is-${state}" aria-hidden="true"></span><span>${ctx.esc(personName(ctx, p))}: <strong>${ctx.esc(answerText(ctx, p.answer, counts, p.id))}</strong>${p.answer.recordedBy ? ` <span class="muted">(${ctx.t("registrata da", "recorded by")} ${ctx.esc(nameOf(ctx, p.answer.recordedBy))})</span>` : ""}${p.answer.note ? ` <span class="sp-note">— ${ctx.t("messaggio", "message")}: ${ctx.esc(p.answer.note)}</span>` : ""}</span></li>`;
          })
          .join("")}</ul>`,
      );
    if (mine) {
      const a = mine.answer;
      if (a.stale)
        parts.push(
          `<p class="sp-alert" role="status" data-sp-reask>${
            a.why === "restored"
              ? ctx.t(
                  `La data era stata annullata ed è di nuovo in programma: conferma di nuovo. Prima avevi risposto «${ctx.label(ANSWER[a.previous] ?? ANSWER.none)}».`,
                  `The date was cancelled and is back on: confirm again. You had answered “${ctx.label(ANSWER[a.previous] ?? ANSWER.none)}”.`,
                )
              : ctx.t(
                  `La data è cambiata: conferma di nuovo. Prima avevi risposto «${ctx.label(ANSWER[a.previous] ?? ANSWER.none)}».`,
                  `The date changed: confirm again. You had answered “${ctx.label(ANSWER[a.previous] ?? ANSWER.none)}”.`,
                )
          }</p>`,
        );
      if (a.late && ["skipping", "maybe"].includes(a.status))
        parts.push(
          `<div class="sp-alert sp-late" role="status" data-sp-late><p>${ctx.t(`La sessione inizia fra ${hoursText(ctx, view.hoursLeft)}. La tua risposta è registrata comunque (nessun blocco) e il DM riceve un avviso: se vuoi, lasciagli due righe.`, `The session starts in ${hoursText(ctx, view.hoursLeft)}. Your answer is recorded anyway (no block) and the DM gets a notice: leave a line if you like.`)}</p></div>`,
        );
      parts.push(
        ownButtons(ctx, session.id, a.stale ? null : a.status, `row-${session.id}`, counts),
      );
      if (a.status)
        parts.push(
          `<div class="sp-actions"><button type="button" class="button quiet" data-sp-act="note" data-session="${ctx.esc(session.id)}" data-sp-focus="row-${ctx.esc(session.id)}-note">${a.note ? ctx.t("Modifica il messaggio al DM…", "Edit your message to the DM…") : ctx.t("Scrivi al DM…", "Message the DM…")}</button></div>`,
        );
    }
    if (manage)
      parts.push(
        `<div class="sp-actions">${
          series
            ? `<button type="button" class="button" data-sp-act="edit" data-session="${ctx.esc(session.id)}" data-sp-focus="row-${ctx.esc(session.id)}-edit">${ctx.t("Modifica…", "Edit…")}</button><button type="button" class="button quiet" data-sp-act="cancel" data-session="${ctx.esc(session.id)}" data-sp-focus="row-${ctx.esc(session.id)}-cancel">${ctx.t("Annulla…", "Cancel…")}</button>`
            : `<button type="button" class="button quiet" data-sp-act="seats" data-session="${ctx.esc(session.id)}" data-sp-focus="row-${ctx.esc(session.id)}-seats">${ctx.t("Posti e ospiti…", "Seats and guests…")}</button>`
        }${people.length ? `<button type="button" class="button quiet" data-sp-act="behalf" data-session="${ctx.esc(session.id)}" data-sp-focus="row-${ctx.esc(session.id)}-behalf">${ctx.t("Risposta per conto di…", "Answer on behalf of…")}</button>` : ""}</div>`,
      );
  } else if (session.status !== "cancelled" && view.started) parts.push(attendanceBlock(ctx, view));
  if (session.status === "cancelled") {
    // The reason is written "visible to the group" and B24 shows it to everyone.
    if (session.cancellationReason)
      parts.push(
        `<p class="campaign-meta" data-sp-cancel-reason>${ctx.t("Motivo dell’annullamento", "Reason for cancelling")}: ${ctx.esc(session.cancellationReason)}</p>`,
      );
    if (manage && series && session.startsAt && Date.parse(session.startsAt) > t)
      parts.push(
        `<div class="sp-actions"><button type="button" class="button quiet" data-sp-act="restore" data-session="${ctx.esc(session.id)}" data-sp-focus="row-${ctx.esc(session.id)}-restore">${ctx.t("Ripristina questa data", "Restore this date")}</button></div>`,
      );
  }
  parts.push(logBlock(ctx, view));
  const body = parts.join("");
  if (!body) return "";
  return `<div class="sp-row" data-sp-session="${ctx.esc(session.id)}" tabindex="-1" data-sp-focus="row-${ctx.esc(session.id)}"${series ? ` data-sp-series="${ctx.esc(series.id)}"` : ""}>${body}</div>`;
}

// ---------------------------------------------------------------------------------------
// Recap: attendance of the linked session (Quest Portal VTL-054)

export function renderRecap(ctx, entry) {
  const sessionId = entry?.data?.sessionId;
  const a = sessionId ? D.attendanceFor(ctx.state, sessionId, ctx.role) : null;
  if (!a) return "";
  const present = a.people.filter((p) => p.status === "present");
  const absent = a.people.filter((p) => p.status === "absent");
  return `<section class="sp-recap" aria-labelledby="sp-recap-title"><h2 id="sp-recap-title">${ctx.t("Presenze della sessione", "Session attendance")}</h2><p><strong>${ctx.t("Presenti", "Present")}:</strong> ${ctx.esc(present.map((p) => personName(ctx, p)).join("; ") || ctx.t("nessuno", "nobody"))}</p><p><strong>${ctx.t("Assenti", "Absent")}:</strong> ${ctx.esc(absent.map((p) => personName(ctx, p) + (p.note ? ` (${p.note})` : "")).join("; ") || ctx.t("nessuno", "nobody"))}</p><p class="campaign-meta">${ctx.t("Registro delle presenze di Sessioni", "Attendance register from Sessions")} · ${ctx.esc(when(ctx, a.at))}${a.corrections.length ? ` · ${ctx.t("corretto", "corrected")}` : ""}</p></section>`;
}

// ---------------------------------------------------------------------------------------
// Dialogs

const dialogForm = () => globalThis.document?.querySelector?.("#dialog form") ?? null;
function nextWeekday(target, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  do d.setDate(d.getDate() + 1);
  while (d.getDay() !== target);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function zoneField(ctx, value, name = "timeZone") {
  const zones = [
    ...new Set([
      viewerZone(),
      "Europe/Rome",
      "Europe/London",
      "Europe/Berlin",
      "America/New_York",
      "UTC",
    ]),
  ];
  return `<label class="field">${ctx.t("Fuso orario della serie", "Series time zone")}<input name="${name}" value="${ctx.esc(value)}" list="sp-zones" autocomplete="off" required><datalist id="sp-zones">${zones.map((z) => `<option value="${ctx.esc(z)}"></option>`).join("")}</datalist></label>`;
}
function guestFields(ctx, chosen = []) {
  const guests = D.knownGuests(ctx.state);
  return `<fieldset class="sp-fieldset"><legend>${ctx.t("Ospiti invitati (oltre ai giocatori della campagna)", "Invited guests (besides the campaign’s players)")}</legend>${guests.map((g) => `<label class="check-field"><input type="checkbox" name="guests" value="${ctx.esc(g.id)}" ${chosen.includes(g.id) ? "checked" : ""}> ${ctx.esc(g.name)}</label>`).join("")}<label class="field">${ctx.t("Nuovo ospite (nome)", "New guest (name)")}<input name="newGuest" maxlength="60" autocomplete="off"></label><p class="muted">${ctx.t("In questa dimostrazione gli ospiti non hanno un account: le loro risposte le registra il DM per loro conto.", "In this demonstration guests have no account: the DM records their answers on their behalf.")}</p></fieldset>`;
}
function seriesInput(form) {
  return {
    title: form.get("title"),
    startDate: String(form.get("startDate") ?? ""),
    time: String(form.get("time") ?? ""),
    timeZone: String(form.get("timeZone") ?? "").trim(),
    frequency: String(form.get("frequency") ?? ""),
    count: Number(form.get("count")),
    seats: form.get("seats"),
    guests: form.getAll("guests").map(String),
    newGuest: form.get("newGuest"),
  };
}
export function seriesPreviewHTML(ctx, input) {
  const preview = D.previewSeries(ctx.state, input, ctx.role, now());
  // The clock-change badge marks the first date on the other side of a DST change.
  const dates = preview.dates
    .map(
      (d, i, rows) =>
        `<li>${d.startsAt ? `<time datetime="${ctx.esc(d.startsAt)}">${ctx.esc(when(ctx, d.startsAt, input.timeZone))}</time>${input.timeZone !== viewerZone() ? ` <span class="muted">(${ctx.t("per te", "for you")}: ${ctx.esc(when(ctx, d.startsAt))})</span>` : ""}${i > 0 && d.offset && rows[i - 1].offset && d.offset !== rows[i - 1].offset ? ` <span class="badge">${ctx.t("cambio d’ora", "clock change")} ${ctx.esc(d.offset)}</span>` : ""}` : `<span class="error">${ctx.esc(d.localTime.replace("T", " "))}</span>`}</li>`,
    )
    .join("");
  return `${preview.errors.length ? `<ul class="error sp-errors">${preview.errors.map((e) => `<li>${ctx.esc(errorText(ctx, e))}</li>`).join("")}</ul>` : ""}${dates ? `<ol class="sp-dates">${dates}</ol>` : ""}<p class="muted">${ctx.t("Ogni data resta alla stessa ora locale anche con il cambio d’ora. Nessun invito esterno viene inviato.", "Each date keeps the same local time across clock changes. No external invitation is sent.")}</p>`;
}
// The schedule agreed at session zero (B27's outline, read as the viewer may read it).
function sessionZeroSchedule(ctx) {
  const slice = ctx.state.ext?.[SAFETY_SLICE];
  const cid = ctx.state.campaign?.id;
  if (!slice || !cid) return "";
  try {
    const note = checklistFor(ctx.state, slice, cid, ctx.role)?.schedule?.note;
    return typeof note === "string" ? note.trim() : "";
  } catch {
    return "";
  }
}
function openNewSeries(ctx) {
  const zero = sessionZeroSchedule(ctx);
  const defaults = {
    title: ctx.state.campaign?.name ?? "",
    startDate: nextWeekday(5),
    time: "21:00",
    timeZone: viewerZone(),
    frequency: "biweekly",
    count: D.MAX_BATCH,
    seats: "",
    guests: [],
  };
  ctx.dialog(
    ctx.t("Nuova serie ricorrente", "New recurring series"),
    `${zero ? `<p class="muted" data-sp-zero>${ctx.t("Dalla sessione zero · Frequenza e orario", "From session zero · Session frequency and time")}: ${ctx.t("«", "“")}${ctx.esc(zero)}${ctx.t("»", "”")}</p>` : ""}<p class="muted">${ctx.t("Scegli prima data, ora e frequenza; l’anteprima mostra le date prima di confermare.", "Choose the first date, time and frequency; the preview lists the dates before you confirm.")}</p><label class="field">${ctx.t("Titolo", "Title")}<input name="title" maxlength="${D.TITLE_MAX}" value="${ctx.esc(defaults.title)}" required></label><div class="sp-grid"><label class="field">${ctx.t("Prima data", "First date")}<input type="date" name="startDate" value="${defaults.startDate}" required></label><label class="field">${ctx.t("Ora", "Time")}<input type="time" name="time" value="${defaults.time}" required></label></div>${zoneField(ctx, defaults.timeZone)}<fieldset class="sp-fieldset"><legend>${ctx.t("Frequenza", "Frequency")}</legend><label class="check-field"><input type="radio" name="frequency" value="weekly"> ${ctx.t("Ogni settimana", "Every week")}</label><label class="check-field"><input type="radio" name="frequency" value="biweekly" checked> ${ctx.t("Ogni due settimane", "Every two weeks")}</label></fieldset><div class="sp-grid"><label class="field">${ctx.t(`Quante date (1–${D.MAX_BATCH})`, `How many dates (1–${D.MAX_BATCH})`)}<input type="number" name="count" min="1" max="${D.MAX_BATCH}" value="${defaults.count}" required></label><label class="field">${ctx.t("Posti per giocatori (vuoto: nessun limite)", "Player seats (empty: no limit)")}<input type="number" name="seats" min="1" max="${D.MAX_SEATS}" value=""></label></div>${guestFields(ctx, defaults.guests)}<section class="sp-preview" aria-live="polite"><h3>${ctx.t("Anteprima delle date", "Dates preview")}</h3><div data-sp-preview>${seriesPreviewHTML(ctx, defaults)}</div></section>`,
    {
      submitLabel: ctx.t("Programma le date", "Schedule the dates"),
      onSubmit(form) {
        const input = seriesInput(form);
        change(ctx, "Serie di sessioni programmata", "Session series scheduled", (draft) =>
          D.createSeries(draft, input, ctx.role, now()),
        );
        ctx.toast(ctx.t(`${input.count} date programmate.`, `${input.count} dates scheduled.`));
        refocus();
      },
    },
  );
  const form = dialogForm();
  if (form) {
    const refresh = () => {
      const target = form.querySelector("[data-sp-preview]");
      if (target) target.innerHTML = seriesPreviewHTML(ctx, seriesInput(new FormData(form)));
    };
    form.addEventListener("input", refresh);
    form.addEventListener("change", refresh);
  }
}
const sessionOf = (ctx, id) => ctx.state.campaign?.sessions?.find((s) => s.id === id) ?? null;
function openEdit(ctx, sessionId, scope = "one") {
  const session = sessionOf(ctx, sessionId);
  if (!session) return;
  const meta = D.sliceOf(ctx.state).sessionMeta[sessionId] ?? {};
  const inSeries = Boolean(D.seriesOf(ctx.state, sessionId));
  const future = D.editTargets(ctx.state, sessionId, "future", now()).length;
  ctx.dialog(
    ctx.t("Modifica sessione", "Edit session"),
    `${inSeries ? `<fieldset class="sp-fieldset"><legend>${ctx.t("Cosa vuoi modificare?", "What do you want to change?")}</legend><label class="check-field"><input type="radio" name="scope" value="one" ${scope === "one" ? "checked" : ""}> ${ctx.t("Solo questa data", "Only this date")}</label><label class="check-field"><input type="radio" name="scope" value="future" ${scope === "future" ? "checked" : ""}> ${ctx.t(`Questa e tutte le successive (${future})`, `This and all following (${future})`)}</label></fieldset>` : ""}<label class="field">${ctx.t("Titolo", "Title")}<input name="title" maxlength="${D.TITLE_MAX}" value="${ctx.esc(session.title ?? "")}"></label><div class="sp-grid"><label class="field">${ctx.t("Data", "Date")}<input type="date" name="date" value="${ctx.esc(String(session.localTime ?? "").slice(0, 10))}" required></label><label class="field">${ctx.t("Ora", "Time")} (${ctx.esc(session.timeZone ?? "UTC")})<input type="time" name="time" value="${ctx.esc(String(session.localTime ?? "").slice(11, 16))}" required></label></div><label class="field">${ctx.t("Posti per giocatori (vuoto: nessun limite)", "Player seats (empty: no limit)")}<input type="number" name="seats" min="1" max="${D.MAX_SEATS}" value="${meta.seats ?? ""}"></label>${guestFields(ctx, meta.guests ?? [])}<p class="sp-alert">${ctx.t("Se cambi data o ora, chi aveva già risposto dovrà confermare di nuovo (riceve un avviso). Con «tutte le successive» una nuova data sposta le altre degli stessi giorni.", "If you change the date or time, whoever already answered must confirm again (they get a notice). With “all following”, a new date shifts the others by the same days.")}</p>`,
    {
      submitLabel: ctx.t("Salva modifica", "Save change"),
      onSubmit(form) {
        const input = {
          sessionId,
          scope: String(form.get("scope") ?? "one"),
          title: form.get("title"),
          date: String(form.get("date") ?? ""),
          time: String(form.get("time") ?? ""),
          seats: form.get("seats"),
          guests: form.getAll("guests").map(String),
          newGuest: form.get("newGuest"),
        };
        change(ctx, "Sessioni modificate", "Sessions edited", (draft) =>
          D.editSessions(draft, input, ctx.role, now()),
        );
        ctx.toast(ctx.t("Modifica salvata.", "Change saved."));
        refocus();
      },
    },
  );
}
function openSeats(ctx, sessionId) {
  const meta = D.sliceOf(ctx.state).sessionMeta[sessionId] ?? {};
  ctx.dialog(
    ctx.t("Posti e ospiti", "Seats and guests"),
    `<label class="field">${ctx.t("Posti per giocatori (vuoto: nessun limite)", "Player seats (empty: no limit)")}<input type="number" name="seats" min="1" max="${D.MAX_SEATS}" value="${meta.seats ?? ""}"></label>${guestFields(ctx, meta.guests ?? [])}<p class="muted">${ctx.t("Data e ora si cambiano con «Cambia data».", "Change date and time with “Change date”.")}</p>`,
    {
      submitLabel: ctx.t("Salva", "Save"),
      onSubmit(form) {
        change(ctx, "Posti della sessione aggiornati", "Session seats updated", (draft) =>
          D.setSeats(
            draft,
            {
              sessionId,
              seats: form.get("seats"),
              guests: form.getAll("guests").map(String),
              newGuest: form.get("newGuest"),
            },
            ctx.role,
            now(),
          ),
        );
        ctx.toast(ctx.t("Posti aggiornati.", "Seats updated."));
        refocus();
      },
    },
  );
}
function openCancel(ctx, sessionId, scope = "one") {
  const future = D.editTargets(ctx.state, sessionId, "future", now()).length;
  ctx.dialog(
    scope === "future"
      ? ctx.t("Termina la serie", "End the series")
      : ctx.t("Annulla sessione", "Cancel session"),
    `<fieldset class="sp-fieldset"><legend>${ctx.t("Quali date?", "Which dates?")}</legend><label class="check-field"><input type="radio" name="scope" value="one" ${scope === "one" ? "checked" : ""}> ${ctx.t("Solo questa data", "Only this date")}</label><label class="check-field"><input type="radio" name="scope" value="future" ${scope === "future" ? "checked" : ""}> ${ctx.t(`Questa e tutte le successive (${future}): la serie termina`, `This and all following (${future}): the series ends`)}</label></fieldset><label class="field">${ctx.t("Motivo (facoltativo, visibile al gruppo)", "Reason (optional, visible to the group)")}<input name="reason" maxlength="${D.NOTE_MAX}"></label><p class="muted">${ctx.t("Le date annullate restano nell’elenco con le risposte; puoi ripristinarle finché non sono passate.", "Cancelled dates stay in the list with their answers; you can restore them until they have passed.")}</p>`,
    {
      submitLabel: ctx.t("Conferma annullamento", "Confirm cancellation"),
      cancelLabel: ctx.t("Indietro", "Back"),
      onSubmit(form) {
        change(ctx, "Sessioni annullate", "Sessions cancelled", (draft) =>
          D.cancelSessions(
            draft,
            { sessionId, scope: String(form.get("scope") ?? "one"), reason: form.get("reason") },
            ctx.role,
            now(),
          ),
        );
        ctx.toast(ctx.t("Annullamento registrato.", "Cancellation recorded."));
        refocus();
      },
    },
  );
}
function openBehalf(ctx, sessionId) {
  const view = D.sessionView(ctx.state, sessionId, ctx.role, now());
  if (!view) return;
  ctx.dialog(
    ctx.t("Risposta per conto di…", "Answer on behalf of…"),
    `<p class="muted">${ctx.t("Per chi ti ha risposto altrove (messaggio, di persona) o per segnare un’assenza annunciata. Resta nel registro con il tuo nome e il motivo.", "For someone who answered elsewhere (message, in person) or to mark an announced absence. It stays in the log with your name and the reason.")}</p><label class="field">${ctx.t("Persona", "Person")}<select name="person">${view.people.map((p) => `<option value="${ctx.esc(p.id)}">${ctx.esc(personName(ctx, p))} — ${ctx.esc(answerText(ctx, p.answer, view.counts, p.id))}</option>`).join("")}</select></label><label class="field">${ctx.t("Risposta", "Answer")}<select name="status">${D.ANSWERS.map((s) => `<option value="${s}">${ctx.esc(ctx.label(ANSWER[s]))}</option>`).join("")}</select></label><label class="field">${ctx.t("Motivo (obbligatorio)", "Reason (required)")}<input name="reason" maxlength="${D.NOTE_MAX}" required></label>`,
    {
      submitLabel: ctx.t("Registra risposta", "Record answer"),
      onSubmit(form) {
        const result = change(
          ctx,
          "Risposta registrata per conto di un partecipante",
          "Answer recorded on a participant’s behalf",
          (draft) =>
            D.respondFor(
              draft,
              {
                sessionId,
                personId: String(form.get("person")),
                status: String(form.get("status")),
                reason: form.get("reason"),
              },
              ctx.role,
              now(),
            ),
        );
        ctx.toast(
          result.promoted.length
            ? ctx.t(
                `Registrata. Posto libero: ${result.promoted.map((id) => nameOf(ctx, id)).join(", ")} passa da lista d’attesa a Partecipa.`,
                `Recorded. Seat opened: ${result.promoted.map((id) => nameOf(ctx, id)).join(", ")} moves from waitlist to Attending.`,
              )
            : ctx.t("Risposta registrata.", "Answer recorded."),
        );
        refocus();
      },
    },
  );
}
function openNote(ctx, sessionId) {
  const session = sessionOf(ctx, sessionId);
  const current = session ? D.answerOf(ctx.state, session, ctx.role) : { note: "" };
  ctx.dialog(
    ctx.t("Messaggio al DM", "Message to the DM"),
    `<label class="field">${ctx.t("Due righe per chi organizza (le leggete solo tu e il DM)", "A line for the organizer (only you and the DM read it)")}<textarea name="note" maxlength="${D.NOTE_MAX}">${ctx.esc(current.note ?? "")}</textarea></label>`,
    {
      submitLabel: ctx.t("Invia al DM", "Send to the DM"),
      onSubmit(form) {
        change(
          ctx,
          "Messaggio al DM sulla sessione",
          "Message to the DM about the session",
          (draft) => D.setAnswerNote(draft, { sessionId, note: form.get("note") }, ctx.role, now()),
        );
        ctx.toast(
          ctx.t("Messaggio salvato con la tua risposta.", "Message saved with your answer."),
        );
        refocus();
      },
    },
  );
}
function openAttendance(ctx, sessionId) {
  const roster = D.attendanceRoster(ctx.state, sessionId);
  const draft = D.attendanceDraft(ctx.state, sessionId);
  const table = D.tablePresence(ctx.state, sessionId);
  const tableHint = (id) => {
    const row = table?.[id];
    if (!row) return "";
    return `<p class="muted" data-sp-table-hint>${ctx.t("Al Tavolo", "At the Table")}: ${
      row.present
        ? ctx.t("presente", "here")
        : ctx.t("assente per tutta la serata", "away the whole evening")
    }${row.message ? ` — ${ctx.esc(row.message)}` : ""}</p>`;
  };
  const existing = D.sliceOf(ctx.state).attendance[sessionId];
  const session = sessionOf(ctx, sessionId);
  ctx.dialog(
    existing
      ? ctx.t("Correggi presenze", "Correct attendance")
      : ctx.t("Registra presenze", "Record attendance"),
    `<p class="muted">${ctx.esc(sessionTitle(ctx, session))}${session?.startsAt ? ` · ${ctx.esc(when(ctx, session.startsAt))}` : ""}. ${
      existing
        ? ""
        : table
          ? ctx.t(
              "Suggerite dalle risposte e dalla serata al Tavolo: chi aveva detto «Salto» o è rimasto assente al Tavolo risulta assente.",
              "Suggested from the answers and the evening at the Table: whoever said “Skip” or stayed away at the Table shows as absent.",
            )
          : ctx.t(
              "Suggerite dalle risposte: chi aveva detto «Salto» risulta assente.",
              "Suggested from the answers: whoever said “Skip” shows as absent.",
            )
    }</p>${roster
      .map(
        (p) =>
          `<fieldset class="sp-fieldset sp-attendee"><legend>${ctx.esc(personName(ctx, p))}</legend>${tableHint(p.id)}<label class="check-field"><input type="radio" name="status-${ctx.esc(p.id)}" value="present" ${draft[p.id]?.status === "present" ? "checked" : ""}> ${ctx.t("Presente", "Present")}</label><label class="check-field"><input type="radio" name="status-${ctx.esc(p.id)}" value="absent" ${draft[p.id]?.status === "absent" ? "checked" : ""}> ${ctx.t("Assente", "Absent")}</label><label class="field">${ctx.t("Nota (solo per chi organizza)", "Note (organizers only)")}<input name="note-${ctx.esc(p.id)}" maxlength="${D.NOTE_MAX}" value="${ctx.esc(draft[p.id]?.note ?? "")}"></label></fieldset>`,
      )
      .join(
        "",
      )}${existing ? `<label class="field">${ctx.t("Motivo della correzione (obbligatorio)", "Reason for the correction (required)")}<input name="reason" maxlength="${D.NOTE_MAX}" required></label>` : ""}`,
    {
      submitLabel: existing
        ? ctx.t("Salva correzione", "Save correction")
        : ctx.t("Salva presenze", "Save attendance"),
      onSubmit(form) {
        const records = Object.fromEntries(
          roster.map((p) => [
            p.id,
            { status: String(form.get(`status-${p.id}`) ?? ""), note: form.get(`note-${p.id}`) },
          ]),
        );
        change(
          ctx,
          existing ? "Presenze corrette" : "Presenze registrate",
          existing ? "Attendance corrected" : "Attendance recorded",
          (d) =>
            D.recordAttendance(
              d,
              { sessionId, records, reason: form.get("reason") },
              ctx.role,
              now(),
            ),
        );
        ctx.toast(
          existing
            ? ctx.t(
                "Correzione salvata; la versione precedente resta nello storico.",
                "Correction saved; the earlier version stays in the history.",
              )
            : ctx.t(
                "Presenze registrate: compaiono anche nel resoconto collegato.",
                "Attendance recorded: it also shows in the linked recap.",
              ),
        );
        refocus();
      },
    },
  );
}

// ---------------------------------------------------------------------------------------
// Binding

function run(ctx, act, data) {
  opener = data.spFocus ?? null;
  switch (act) {
    case "new-series":
      return openNewSeries(ctx);
    case "edit":
      return openEdit(ctx, data.session, data.scope === "future" ? "future" : "one");
    case "seats":
      return openSeats(ctx, data.session);
    case "cancel":
      return openCancel(ctx, data.session, data.scope === "future" ? "future" : "one");
    case "behalf":
      return openBehalf(ctx, data.session);
    case "note":
      return openNote(ctx, data.session);
    case "attendance":
      return openAttendance(ctx, data.session);
    case "stars":
      return ctx.navigate("campaign", { tab: "safety", id: "after" });
    case "leave":
      return ctx.navigate("campaign", { tab: "campaign-members" });
    case "revert":
      return attempt(ctx, () => {
        change(ctx, "Modifica della serie annullata", "Series change undone", (draft) =>
          D.revertChange(draft, data.change, ctx.role, now()),
        );
        refocus();
        ctx.toast(
          ctx.t(
            "Modifica annullata: le date tornano com’erano (correzione registrata).",
            "Change undone: the dates are back as they were (correction recorded).",
          ),
        );
      });
    case "restore":
      return attempt(ctx, () => {
        change(ctx, "Data della serie ripristinata", "Series date restored", (draft) =>
          D.restoreSession(draft, data.session, ctx.role, now()),
        );
        refocus();
        ctx.toast(
          ctx.t(
            "Data ripristinata: le risposte si danno di nuovo.",
            "Date restored: answers are asked again.",
          ),
        );
      });
    default:
      return null;
  }
}
export function bindArea(el, ctx) {
  el.querySelectorAll("[data-sp-answer]").forEach((button) => {
    button.onclick = () =>
      answer(ctx, button.dataset.session, button.dataset.spAnswer, button.dataset.spFocus);
  });
  el.querySelectorAll("[data-sp-act]").forEach((button) => {
    button.onclick = () => run(ctx, button.dataset.spAct, { ...button.dataset });
  });
  if (focusAfter) {
    const target = el.querySelector?.(`[data-sp-focus="${focusAfter}"]`);
    if (target) {
      focusAfter = null;
      target.focus?.();
    }
  }
}

// ---------------------------------------------------------------------------------------
// B24 notices

export function collectNotices(ctx) {
  const target = { page: "campaign", params: { tab: "sessions" } };
  return D.noticesFor(ctx.state, ctx.role, now()).map((notice) => {
    const title = sessionTitle(ctx, notice.session);
    const date = (lang) => when({ ...ctx, lang }, notice.session.startsAt);
    const both = (fn) => ({ it: fn("it"), en: fn("en") });
    const name = (lang) => nameOf({ ...ctx, lang, ...tFor(lang) }, notice.personId);
    const base = {
      id: `${notice.kind}:${notice.id}`,
      category: "sessions",
      by: notice.by ?? null,
      time: notice.at ?? null,
      target,
    };
    if (notice.kind === "promoted")
      return {
        ...base,
        title: L(`Si è liberato un posto: «${title}»`, `A seat opened: “${title}”`),
        body: both((l) =>
          l === "it"
            ? `Eri il primo in lista d’attesa: ora partecipi (${date(l)}). Se non puoi più, rispondi «Salto questa».`
            : `You were first on the waitlist: you are now attending (${date(l)}). If you can no longer come, answer “Skip this one”.`,
        ),
      };
    if (notice.kind === "reask")
      return {
        ...base,
        title: L(`Conferma di nuovo: «${title}»`, `Confirm again: “${title}”`),
        body: both((l) =>
          notice.why === "restored"
            ? l === "it"
              ? `La sessione è di nuovo in programma (${date(l)}). Avevi risposto «${ANSWER[notice.previous]?.it ?? "—"}» prima dell’annullamento: rispondi di nuovo.`
              : `The session is back on (${date(l)}). You had answered “${ANSWER[notice.previous]?.en ?? "—"}” before it was cancelled: answer again.`
            : l === "it"
              ? `La sessione ora è ${date(l)}. Avevi risposto «${ANSWER[notice.previous]?.it ?? "—"}»: rispondi di nuovo.`
              : `The session is now ${date(l)}. You had answered “${ANSWER[notice.previous]?.en ?? "—"}”: answer again.`,
        ),
      };
    if (notice.kind === "recorded")
      return {
        ...base,
        title: L(`Risposta registrata per te: «${title}»`, `Answer recorded for you: “${title}”`),
        body: both((l) =>
          [
            l === "it"
              ? `${nameOf({ ...ctx, lang: l, ...tFor(l) }, notice.by)} ha segnato «${ANSWER[notice.status]?.it ?? "—"}» (${date(l)}).`
              : `${nameOf({ ...ctx, lang: l, ...tFor(l) }, notice.by)} marked “${ANSWER[notice.status]?.en ?? "—"}” (${date(l)}).`,
            notice.reason
              ? `${l === "it" ? "Motivo" : "Reason"}: ${notice.reason}${/[.!?…]$/.test(notice.reason) ? "" : "."}`
              : "",
            l === "it"
              ? "Se non è così, rispondi tu dalla sessione."
              : "If that is not right, answer yourself from the session.",
          ]
            .filter(Boolean)
            .join(" "),
        ),
      };
    return {
      ...base,
      title: both((l) =>
        notice.kind === "skip"
          ? l === "it"
            ? `${name(l)} salta «${title}»`
            : `${name(l)} skips “${title}”`
          : l === "it"
            ? `${name(l)} forse non c’è: «${title}»`
            : `${name(l)} might not come: “${title}”`,
      ),
      body: both((l) =>
        [
          notice.late
            ? l === "it"
              ? `A ridosso: ${(notice.hoursLeft ?? 0) <= 1 ? "mancava" : "mancavano"} ${hoursText(tFor(l), notice.hoursLeft ?? 0)} all’inizio.`
              : `Late notice: ${hoursText(tFor(l), notice.hoursLeft ?? 0)} before the start.`
            : date(l),
          notice.note ? (l === "it" ? `Messaggio: ${notice.note}` : `Message: ${notice.note}`) : "",
        ]
          .filter(Boolean)
          .join(" "),
      ),
    };
  });
}

// ---------------------------------------------------------------------------------------
// Registration

export function register(registry) {
  registry.registerStateSlice(D.ID, {
    version: D.VERSION,
    // Scheduling is not gameplay: like the core sessions it survives gameplay Undo;
    // corrections are explicit commands (answer again, undo a series change, correct
    // attendance with a reason, restore a date).
    undo: "preserve",
    seed: D.seedSessionsPlus,
    normalize: D.normalizeSessionsPlus,
  });
  registry.registerStyles(new URL("./sessions-plus.css", import.meta.url));
  registry.add("campaign-section", {
    id: "sessions-plus.sessions",
    label: L("Serie e presenze", "Series and attendance"),
    when: (ctx, arg) => arg?.kind === "sessions" && member(ctx),
    render: (ctx) => renderOverview(ctx),
    bind: bindArea,
  });
  registry.add("campaign-section", {
    id: "sessions-plus.session",
    label: L("Risposte, posti e presenze della sessione", "Session answers, seats and attendance"),
    when: (ctx, row) =>
      typeof row?.id === "string" &&
      typeof row?.status === "string" &&
      "startsAt" in row &&
      member(ctx),
    render: (ctx, row) => renderRow(ctx, row),
    bind: bindArea,
  });
  registry.add("campaign-section", {
    id: "sessions-plus.entry",
    label: L("Presenze nel resoconto", "Attendance in the recap"),
    when: (ctx, entry) =>
      entry?.kind === "recap" &&
      typeof entry?.data?.sessionId === "string" &&
      Boolean(D.attendanceFor(ctx.state, entry.data.sessionId, ctx.role)),
    render: (ctx, entry) => renderRecap(ctx, entry),
  });
  registry.add("notifications", {
    id: "sessions-plus",
    label: L("Sessioni: posti, risposte e assenze", "Sessions: seats, answers and absences"),
    when: member,
    collect: collectNotices,
  });
  registry.add("command", {
    id: "sessions-plus.skip-next",
    label: L("Salto la prossima sessione", "Skip the next session"),
    group: "sessions",
    roles: ["player"],
    when: (ctx) => member(ctx) && Boolean(D.nextSessionFor(ctx.state, ctx.role, now())),
    run(ctx) {
      const next = D.nextSessionFor(ctx.state, ctx.role, now());
      if (next) answer(ctx, next.id, "skipping");
    },
  });
  registry.add("command", {
    id: "sessions-plus.new-series",
    label: L("Nuova serie ricorrente di sessioni", "New recurring session series"),
    group: "sessions",
    roles: ["dm"],
    when: (ctx) => member(ctx) && organizes(ctx),
    run(ctx) {
      ctx.navigate("campaign", { tab: "sessions" });
      opener = "ov-new-series";
      openNewSeries(ctx);
    },
  });
}
