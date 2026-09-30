// «Aggiungi al calendario» (owner request 01/10/2026): the links and iCalendar parts that put
// a session in the viewer's own calendar. Pure: no DOM, no state, no network.
//
// Copied from the established «Add to calendar» menus (Eventbrite, AddEvent, Sesh, Discord
// event pages; parameters as the open-source add-to-calendar-button generators build them):
// - Google Calendar: `calendar/render?action=TEMPLATE` with `text`, `dates` (local wall times
//   in the session's zone) and `ctz`, `details`, `location`. A GMT/UTC zone uses UTC times and
//   no `ctz`, which Google does not accept for those zones.
// - Outlook.com and Microsoft 365: the `deeplink/compose` address of outlook.live.com and
//   outlook.office.com with `startdt`/`enddt` as UTC ISO instants, `subject`, `body`, `location`.
// - Yahoo Calendar: `?v=60` with `st`/`et` as UTC stamps, `title`, `desc`, `in_loc`.
// - Apple Calendar and every other app: an .ics file (integrations-domain.mjs `buildIcs`).
//   A recurring series is one VEVENT with RRULE, DTSTART in the series' own zone (TZID) and a
//   VTIMEZONE computed from the browser's time-zone data, so each date keeps its local time
//   across a daylight-saving change (RFC 5545 §3.6.5, §3.8.5.3).
// A link only opens the service with the fields filled in: the person reviews and saves.

import { resolveSessionTime } from "./campaign-sessions.mjs";

const DAY = 24 * 3600e3;
const pad = (n, size = 2) => String(n).padStart(size, "0");
const msOf = (value) => (typeof value === "number" ? value : Date.parse(value));

const formatters = new Map();
function formatter(timeZone) {
  let value = formatters.get(timeZone);
  if (!value) {
    value = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(timeZone, value);
  }
  return value;
}
function wallParts(timeZone, ms) {
  const parts = {};
  for (const part of formatter(timeZone).formatToParts(new Date(ms)))
    if (part.type !== "literal") parts[part.type] = Number(part.value);
  return parts;
}

/** Whether a zone is plain UTC/GMT (Google Calendar accepts no `ctz` for these). */
export const isUtcZone = (timeZone) =>
  !timeZone || /^(?:UTC|GMT|Etc\/(?:UTC|GMT|UCT|Universal|Zulu)|Etc\/GMT[+-]\d+)$/i.test(timeZone);

/** Minutes east of UTC in `timeZone` at the instant `ms` (Rome in summer: 120). */
export function offsetMinutes(timeZone, ms) {
  const p = wallParts(timeZone, ms);
  const second = Math.floor(ms / 1000) * 1000;
  return Math.round(
    (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - second) / 60000,
  );
}
/** iCalendar UTC form: 20271002T190000Z. */
export const utcStamp = (value) =>
  new Date(msOf(value))
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
/** The local wall time of an instant in a zone, iCalendar form without Z: 20271002T210000. */
export function wallStamp(timeZone, value) {
  const p = wallParts(timeZone, msOf(value));
  return `${pad(p.year, 4)}${pad(p.month)}${pad(p.day)}T${pad(p.hour)}${pad(p.minute)}${pad(p.second)}`;
}
/** A session's agreed local time ("2027-10-02T21:00") in iCalendar form: 20271002T210000. */
export const localStamp = (localTime) => `${localTime.replace(/[-:]/g, "")}00`;
const isoInstant = (value) => new Date(msOf(value)).toISOString().replace(/\.\d{3}/, "");
const query = (pairs) =>
  pairs
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

/**
 * Google Calendar's prefilled event. `event`: {title, description, location, start, end,
 * timeZone}; start and end are instants (ms or ISO). A single date: Google's link cannot carry
 * the exceptions of a series, so a series goes through the .ics file.
 */
export function googleCalendarUrl(event) {
  const utc = isUtcZone(event.timeZone);
  const stamp = (value) => (utc ? utcStamp(value) : wallStamp(event.timeZone, value));
  return `https://calendar.google.com/calendar/render?${query([
    ["action", "TEMPLATE"],
    ["text", event.title],
    ["dates", `${stamp(event.start)}/${stamp(event.end)}`],
    ["details", event.description],
    ["location", event.location],
    ["ctz", utc ? null : event.timeZone],
  ])}`;
}
/** Outlook.com (personal) or, with `work`, Microsoft 365 (work or school). */
export function outlookCalendarUrl(event, { work = false } = {}) {
  const host = work ? "outlook.office.com" : "outlook.live.com";
  return `https://${host}/calendar/0/deeplink/compose?${query([
    ["path", "/calendar/action/compose"],
    ["rru", "addevent"],
    ["startdt", isoInstant(event.start)],
    ["enddt", isoInstant(event.end)],
    ["subject", event.title],
    ["body", event.description],
    ["location", event.location],
  ])}`;
}
export function yahooCalendarUrl(event) {
  return `https://calendar.yahoo.com/?${query([
    ["v", "60"],
    ["title", event.title],
    ["st", utcStamp(event.start)],
    ["et", utcStamp(event.end)],
    ["desc", event.description],
    ["in_loc", event.location],
  ])}`;
}
const L = (it, en) => Object.freeze({ it, en });
/** The web calendars of the menu, in the order Eventbrite and AddEvent list them. */
export const CALENDAR_SERVICES = Object.freeze([
  Object.freeze({
    id: "google",
    label: L("Google Calendar", "Google Calendar"),
    url: googleCalendarUrl,
  }),
  Object.freeze({
    id: "outlook",
    label: L("Outlook.com", "Outlook.com"),
    url: (e) => outlookCalendarUrl(e),
  }),
  Object.freeze({
    id: "microsoft365",
    label: L("Microsoft 365 (lavoro o scuola)", "Microsoft 365 (work or school)"),
    url: (e) => outlookCalendarUrl(e, { work: true }),
  }),
  Object.freeze({
    id: "yahoo",
    label: L("Yahoo Calendar", "Yahoo Calendar"),
    url: yahooCalendarUrl,
  }),
]);
export const calendarLinks = (event) =>
  CALENDAR_SERVICES.map((service) => ({
    id: service.id,
    label: service.label,
    url: service.url(event),
  }));

// ---------------------------------------------------------------- VTIMEZONE

const offsetText = (minutes) => {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  return `${sign}${pad(Math.floor(abs / 60))}${pad(abs % 60)}`;
};
/**
 * The VTIMEZONE of `timeZone` for the instants from `fromMs` to `toMs`: the offset in force
 * at the start and every change inside the span, each with its onset in the local time before
 * it (RFC 5545 §3.6.5). An offset above the year's lowest one is daylight time.
 */
export function vtimezoneLines(timeZone, fromMs, toMs) {
  const start = fromMs - DAY;
  const end = toMs + DAY;
  let standard = Infinity;
  for (let t = fromMs - 183 * DAY; t <= toMs + 183 * DAY; t += 15 * DAY)
    standard = Math.min(standard, offsetMinutes(timeZone, t));
  const observance = (onset, from, to) => {
    const kind = to > standard ? "DAYLIGHT" : "STANDARD";
    return [
      `BEGIN:${kind}`,
      `DTSTART:${onset}`,
      `TZOFFSETFROM:${offsetText(from)}`,
      `TZOFFSETTO:${offsetText(to)}`,
      `END:${kind}`,
    ];
  };
  let previous = offsetMinutes(timeZone, start);
  const lines = [
    "BEGIN:VTIMEZONE",
    `TZID:${timeZone}`,
    ...observance("19700101T000000", previous, previous),
  ];
  for (let before = start; before < end; ) {
    const after = Math.min(before + DAY, end);
    if (offsetMinutes(timeZone, after) !== previous) {
      // The change lies between the two samples: halve the interval down to the second.
      let lo = Math.floor(before / 1000),
        hi = Math.floor(after / 1000);
      while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2);
        if (offsetMinutes(timeZone, mid * 1000) === previous) lo = mid;
        else hi = mid;
      }
      const next = offsetMinutes(timeZone, hi * 1000);
      lines.push(
        ...observance(utcStamp(hi * 1000 + previous * 60000).slice(0, 15), previous, next),
      );
      previous = next;
    }
    before = after;
  }
  lines.push("END:VTIMEZONE");
  return lines;
}

// ---------------------------------------------------------------- recurring series

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
function dayNumber(date) {
  const m = DATE.exec(date);
  return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY : NaN;
}
function addDays(date, days) {
  return new Date((dayNumber(date) + days) * DAY).toISOString().slice(0, 10);
}
// The instant a recurrence rule gives a local time: its first occurrence (RFC 5545 §3.3.5).
const ruleInstant = (session) =>
  resolveSessionTime({ localTime: session.localTime, timeZone: session.timeZone }).candidates[0]
    ?.startsAt ?? null;

/**
 * The recurrence that describes a series' dates. `sessions`: its scheduled dates
 * ({id, localTime, timeZone, startsAt}); `stepDays`: 7 or 14. The first date that a rule can
 * produce anchors it; every later date on the same weekday cadence, local time and zone is an
 * occurrence, a missing step becomes an EXDATE and any other date (moved, another zone, the
 * second of a repeated hour) stays a separate event. Returns null when fewer than two dates
 * follow the rule.
 */
export function recurrenceOf(sessions, stepDays) {
  if (!Number.isInteger(stepDays) || stepDays <= 0 || stepDays % 7) return null;
  const rows = [...sessions]
    .filter((s) => s && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s.localTime ?? "") && s.startsAt)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const regular = (s) => ruleInstant(s) === s.startsAt;
  const anchor = rows.find(regular);
  if (!anchor) return null;
  const day = anchor.localTime.slice(0, 10);
  const time = anchor.localTime.slice(11);
  const slots = new Map();
  const singles = [];
  for (const s of rows) {
    const steps = (dayNumber(s.localTime.slice(0, 10)) - dayNumber(day)) / stepDays;
    const fits =
      s.timeZone === anchor.timeZone &&
      s.localTime.slice(11) === time &&
      Number.isInteger(steps) &&
      steps >= 0 &&
      !slots.has(steps) &&
      regular(s);
    if (fits) slots.set(steps, s);
    else singles.push(s);
  }
  if (slots.size < 2) return null;
  const count = Math.max(...slots.keys()) + 1;
  const exdates = [];
  for (let i = 0; i < count; i += 1)
    if (!slots.has(i)) exdates.push(`${addDays(day, i * stepDays)}T${time}`);
  return {
    timeZone: anchor.timeZone,
    localTime: anchor.localTime,
    anchor,
    interval: stepDays / 7,
    count,
    exdates,
    members: [...slots.entries()].sort((a, b) => a[0] - b[0]).map(([, s]) => s),
    singles,
  };
}
/** The RRULE value of a recurrence: FREQ=WEEKLY;INTERVAL=2;COUNT=4. */
export const ruleText = (rule) =>
  `FREQ=WEEKLY${rule.interval > 1 ? `;INTERVAL=${rule.interval}` : ""};COUNT=${rule.count}`;
