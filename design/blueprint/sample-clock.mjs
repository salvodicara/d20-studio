// The example's own real-time clock. The owner may open the prototype on any date, so the
// sample campaign never shows a September 2026 that has long passed: it plays on Thursday
// evenings in Rome, its last session («Sessione 12») a Thursday four to ten days before the
// visit and its next one («Il sigillo della torre») the coming Thursday at 20:30 local time. Every real-time
// stamp of the example (joins, last access, messages, journal and handout history, public
// tables…) is authored around the Thursday of 17 September 2026 and moved by whole weeks at
// seed or reset time, so weekdays and distances stay as written. The in-world calendar is
// independent (census C24); provenance, build and revision dates are not sample stamps.
// Tests pin the clock with useSampleClock and never read the real date.

const ZONE = "Europe/Rome";
// The latest authored stamp (Sunday 20 September 2026, after «Sessione 12» on Thursday 17):
// the example was written as seen that week. Stamps move by the whole weeks the visit is
// later, so every one of them stays in the past, whatever the day of the visit.
const AUTHORED_VISIT = Date.parse("2026-09-20T18:10:00.000Z");
const SESSION_TIME = [20, 30];
const DAY = 86400000;
const WEEK = 7 * DAY;

let clock = null;
/** Test seam: a function returning the visit time in ms, or null for the real clock. */
export function useSampleClock(fn) {
  clock = typeof fn === "function" ? fn : null;
}
export const sampleNow = () => (clock ? clock() : Date.now());
export const SAMPLE_TIME_ZONE = ZONE;

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
function romeParts(ms) {
  return Object.fromEntries(
    formatter
      .formatToParts(new Date(ms))
      .filter((part) => ["year", "month", "day", "hour", "minute"].includes(part.type))
      .map((part) => [part.type, Number(part.value)]),
  );
}
// The instant of a wall-clock time in Rome (summer UTC+2, winter UTC+1).
function romeInstant(year, month, day, hour, minute) {
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  for (const offset of [2, 1]) {
    const ms = wall - offset * 3600000;
    const p = romeParts(ms);
    if (p.year === year && p.month === month && p.day === day && p.hour === hour)
      if (p.minute === minute) return ms;
  }
  return wall - 3600000;
}
const pad = (n) => String(n).padStart(2, "0");
/** The sample's next session: the first Thursday at 20:30 in Rome after the visit. */
export function nextSampleSession(now = sampleNow()) {
  const today = romeParts(now);
  const base = Date.UTC(today.year, today.month - 1, today.day);
  let days = (4 - new Date(base).getUTCDay() + 7) % 7;
  for (;;) {
    const date = new Date(base + days * DAY);
    const [y, m, d] = [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()];
    const startsAt = romeInstant(y, m, d, ...SESSION_TIME);
    if (startsAt > now)
      return {
        localTime: `${y}-${pad(m)}-${pad(d)}T${pad(SESSION_TIME[0])}:${pad(SESSION_TIME[1])}`,
        timeZone: ZONE,
        startsAt: new Date(startsAt).toISOString(),
      };
    days += 7;
  }
}
/** Whole weeks between the authored week and the visit (never moving a stamp past it). */
export function sampleWeeks(now = sampleNow()) {
  return Math.floor((now - AUTHORED_VISIT) / WEEK);
}
/** An authored sample instant («2026-09-17T21:40:00.000Z»), moved to the visit's weeks. */
export function sampleDate(iso, now = sampleNow()) {
  return new Date(Date.parse(iso) + sampleWeeks(now) * WEEK).toISOString();
}
/** An authored sample day («2026-09-10»), moved the same way. */
export function sampleDay(day, now = sampleNow()) {
  return new Date(Date.parse(day) + sampleWeeks(now) * WEEK).toISOString().slice(0, 10);
}
/** The example campaign's scheduled session, «Il sigillo della torre», on the coming Thursday. */
export function sampleSessions(now = sampleNow()) {
  const next = nextSampleSession(now);
  return [
    {
      id: "session-sample-13",
      title: "Il sigillo della torre",
      ...next,
      status: "scheduled",
      played: false,
      revision: 1,
      organizerId: "dm",
      createdAt: sampleDate("2026-09-18T09:00:00.000Z", now),
      history: [],
    },
  ];
}
