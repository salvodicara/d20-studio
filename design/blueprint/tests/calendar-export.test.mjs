// «Aggiungi al calendario» (owner request 01/10/2026): the web-calendar links, the VTIMEZONE
// and the recurrence of a series, in several zones and across daylight-saving changes. The
// expected instants are written by hand, never computed by the code under test.
import test from "node:test";
import assert from "node:assert/strict";
import * as C from "../calendar-export.mjs";
import { createInitialState } from "../state.mjs";
import * as D from "../integrations-domain.mjs";
import * as SP from "../sessions-plus-domain.mjs";

const params = (url) => Object.fromEntries(new URL(url).searchParams);
const event = (over = {}) => ({
  title: "Le lanterne di Bruma · La torre",
  description: "Campagna: Le lanterne di Bruma\nApri la campagna: https://d20.example/#campaign",
  location: "https://d20.example/#campaign",
  start: "2027-10-02T19:00:00.000Z", // 21:00 in Rome (CEST, UTC+2)
  end: "2027-10-02T22:00:00.000Z",
  timeZone: "Europe/Rome",
  ...over,
});

test("offsets and stamps follow the zone's rules on both sides of a change", () => {
  assert.equal(C.offsetMinutes("Europe/Rome", Date.parse("2027-10-02T19:00:00Z")), 120);
  assert.equal(C.offsetMinutes("Europe/Rome", Date.parse("2027-11-02T19:00:00Z")), 60);
  assert.equal(C.offsetMinutes("America/New_York", Date.parse("2027-03-15T00:00:00Z")), -240);
  assert.equal(C.offsetMinutes("Asia/Kolkata", Date.parse("2027-10-02T12:00:00Z")), 330);
  assert.equal(C.utcStamp("2027-10-02T19:00:00.000Z"), "20271002T190000Z");
  assert.equal(C.wallStamp("Europe/Rome", "2027-10-02T19:00:00.000Z"), "20271002T210000");
  assert.equal(C.wallStamp("Asia/Kolkata", "2027-10-02T15:30:00.000Z"), "20271002T210000");
  assert.equal(C.localStamp("2027-10-02T21:00"), "20271002T210000");
  assert.ok(C.isUtcZone("UTC") && C.isUtcZone("Etc/UTC") && C.isUtcZone(""));
  assert.ok(!C.isUtcZone("Europe/London"));
});

test("Google Calendar: prefilled template in the agreed zone (ctz), one date", () => {
  const url = C.googleCalendarUrl(event());
  assert.ok(url.startsWith("https://calendar.google.com/calendar/render?action=TEMPLATE&"));
  const p = params(url);
  assert.equal(p.text, "Le lanterne di Bruma · La torre");
  assert.equal(p.dates, "20271002T210000/20271003T000000", "local wall times in Rome");
  assert.equal(p.ctz, "Europe/Rome");
  assert.match(p.details, /Apri la campagna: https:\/\/d20\.example/);
  assert.equal(p.location, "https://d20.example/#campaign");
  assert.ok(!url.includes("+"), "spaces are %20, never +");
  assert.match(url, /text=Le%20lanterne%20di%20Bruma%20%C2%B7%20La%20torre/);
});

test("Google Calendar across the end of daylight time keeps three real hours", () => {
  // 31/10/2027: Rome goes from 03:00 CEST back to 02:00 CET at 01:00 UTC. A session at 01:00
  // CEST (23:00 UTC the day before) lasting 3 h ends at 02:00 UTC, which is 03:00 CET.
  const p = params(
    C.googleCalendarUrl(event({ start: "2027-10-30T23:00:00Z", end: "2027-10-31T02:00:00Z" })),
  );
  assert.equal(p.dates, "20271031T010000/20271031T030000");
  assert.equal(p.ctz, "Europe/Rome");
});

test("Google Calendar in another zone and in UTC", () => {
  // New York changes to EDT (UTC-4) on 14/03/2027: 20:00 EDT is 00:00 UTC the next day.
  const ny = params(
    C.googleCalendarUrl(
      event({
        start: "2027-03-15T00:00:00Z",
        end: "2027-03-15T03:00:00Z",
        timeZone: "America/New_York",
      }),
    ),
  );
  assert.equal(ny.dates, "20270314T200000/20270314T230000");
  assert.equal(ny.ctz, "America/New_York");
  const india = params(
    C.googleCalendarUrl(
      event({
        start: "2027-10-02T15:30:00Z",
        end: "2027-10-02T18:30:00Z",
        timeZone: "Asia/Kolkata",
      }),
    ),
  );
  assert.equal(india.dates, "20271002T210000/20271003T000000");
  const utc = params(C.googleCalendarUrl(event({ timeZone: "UTC" })));
  assert.equal(utc.dates, "20271002T190000Z/20271002T220000Z");
  assert.equal(utc.ctz, undefined, "no ctz for a UTC zone");
});

test("Outlook.com and Microsoft 365: deeplink compose with UTC instants", () => {
  const live = C.outlookCalendarUrl(event());
  assert.ok(live.startsWith("https://outlook.live.com/calendar/0/deeplink/compose?"));
  const p = params(live);
  assert.equal(p.path, "/calendar/action/compose");
  assert.equal(p.rru, "addevent");
  assert.equal(p.startdt, "2027-10-02T19:00:00Z");
  assert.equal(p.enddt, "2027-10-02T22:00:00Z");
  assert.equal(p.subject, "Le lanterne di Bruma · La torre");
  assert.match(p.body, /Apri la campagna/);
  assert.equal(p.location, "https://d20.example/#campaign");
  const work = C.outlookCalendarUrl(event(), { work: true });
  assert.ok(work.startsWith("https://outlook.office.com/calendar/0/deeplink/compose?"));
  assert.equal(params(work).startdt, "2027-10-02T19:00:00Z");
});

test("Yahoo Calendar: v=60 with UTC stamps", () => {
  const url = C.yahooCalendarUrl(event());
  assert.ok(url.startsWith("https://calendar.yahoo.com/?v=60&"));
  const p = params(url);
  assert.equal(p.st, "20271002T190000Z");
  assert.equal(p.et, "20271002T220000Z");
  assert.equal(p.title, "Le lanterne di Bruma · La torre");
  assert.equal(p.in_loc, "https://d20.example/#campaign");
  assert.match(p.desc, /Campagna: Le lanterne di Bruma/);
});

test("the menu's four web calendars, in order, each with its own address", () => {
  const links = C.calendarLinks(event());
  assert.deepEqual(
    links.map((l) => l.id),
    ["google", "outlook", "microsoft365", "yahoo"],
  );
  assert.deepEqual(
    links.map((l) => new URL(l.url).host),
    ["calendar.google.com", "outlook.live.com", "outlook.office.com", "calendar.yahoo.com"],
  );
  assert.equal(links[2].label.it, "Microsoft 365 (lavoro o scuola)");
});

test("VTIMEZONE: the offset in force and each change inside the span", () => {
  const rome = C.vtimezoneLines(
    "Europe/Rome",
    Date.parse("2027-10-17T19:00:00Z"),
    Date.parse("2027-11-07T23:00:00Z"),
  ).join("\n");
  assert.match(rome, /^BEGIN:VTIMEZONE\nTZID:Europe\/Rome\n/);
  assert.match(
    rome,
    /BEGIN:DAYLIGHT\nDTSTART:19700101T000000\nTZOFFSETFROM:\+0200\nTZOFFSETTO:\+0200\nEND:DAYLIGHT/,
  );
  assert.match(
    rome,
    /BEGIN:STANDARD\nDTSTART:20271031T030000\nTZOFFSETFROM:\+0200\nTZOFFSETTO:\+0100\nEND:STANDARD/,
    "onset in the local time before the change",
  );
  assert.match(rome, /END:VTIMEZONE$/);
  const ny = C.vtimezoneLines(
    "America/New_York",
    Date.parse("2027-03-01T01:00:00Z"),
    Date.parse("2027-03-20T01:00:00Z"),
  ).join("\n");
  assert.match(
    ny,
    /BEGIN:DAYLIGHT\nDTSTART:20270314T020000\nTZOFFSETFROM:-0500\nTZOFFSETTO:-0400\nEND:DAYLIGHT/,
  );
  const india = C.vtimezoneLines(
    "Asia/Kolkata",
    Date.parse("2027-10-01T00:00:00Z"),
    Date.parse("2027-12-01T00:00:00Z"),
  );
  assert.deepEqual(india, [
    "BEGIN:VTIMEZONE",
    "TZID:Asia/Kolkata",
    "BEGIN:STANDARD",
    "DTSTART:19700101T000000",
    "TZOFFSETFROM:+0530",
    "TZOFFSETTO:+0530",
    "END:STANDARD",
    "END:VTIMEZONE",
  ]);
});

// Four Sundays at 21:00 in Rome across the end of daylight time: the UTC instant moves from
// 19:00 to 20:00 while the local time stays (Sesh, recurring events).
const weekly = [
  {
    id: "s1",
    localTime: "2027-10-17T21:00",
    timeZone: "Europe/Rome",
    startsAt: "2027-10-17T19:00:00.000Z",
  },
  {
    id: "s2",
    localTime: "2027-10-24T21:00",
    timeZone: "Europe/Rome",
    startsAt: "2027-10-24T19:00:00.000Z",
  },
  {
    id: "s3",
    localTime: "2027-10-31T21:00",
    timeZone: "Europe/Rome",
    startsAt: "2027-10-31T20:00:00.000Z",
  },
  {
    id: "s4",
    localTime: "2027-11-07T21:00",
    timeZone: "Europe/Rome",
    startsAt: "2027-11-07T20:00:00.000Z",
  },
];

test("recurrence: a weekly series across daylight time is one rule in local time", () => {
  const rule = C.recurrenceOf(weekly, 7);
  assert.equal(rule.timeZone, "Europe/Rome");
  assert.equal(rule.localTime, "2027-10-17T21:00");
  assert.equal(rule.count, 4);
  assert.deepEqual(rule.exdates, []);
  assert.deepEqual(rule.singles, []);
  assert.deepEqual(
    rule.members.map((s) => s.id),
    ["s1", "s2", "s3", "s4"],
  );
  assert.equal(C.ruleText(rule), "FREQ=WEEKLY;COUNT=4");
});

test("recurrence: a cancelled date is an EXDATE, a moved one a separate event", () => {
  const moved = {
    ...weekly[3],
    localTime: "2027-11-07T20:00",
    startsAt: "2027-11-07T19:00:00.000Z",
  };
  const rule = C.recurrenceOf([weekly[0], weekly[2], moved], 7);
  assert.equal(rule.count, 3, "the rule ends at its last regular date");
  assert.deepEqual(rule.exdates, ["2027-10-24T21:00"]);
  assert.deepEqual(
    rule.singles.map((s) => s.id),
    ["s4"],
  );
  // Every two weeks: INTERVAL=2; another zone never joins the rule.
  const biweekly = [
    weekly[0],
    weekly[2],
    { ...weekly[1], id: "x", localTime: "2027-11-14T21:00", startsAt: "2027-11-14T20:00:00.000Z" },
    {
      id: "ny",
      localTime: "2027-11-28T21:00",
      timeZone: "America/New_York",
      startsAt: "2027-11-29T02:00:00.000Z",
    },
  ];
  const two = C.recurrenceOf(biweekly, 14);
  assert.equal(C.ruleText(two), "FREQ=WEEKLY;INTERVAL=2;COUNT=3");
  assert.deepEqual(
    two.singles.map((s) => s.id),
    ["ny"],
  );
  // Fewer than two regular dates: no rule at all.
  assert.equal(C.recurrenceOf([weekly[0], moved], 7), null);
  assert.equal(C.recurrenceOf(weekly, 10), null, "only whole weeks");
});

test("recurrence: the second of a repeated hour is not what a rule would produce", () => {
  // 31/10/2027 02:30 happens twice in Rome; a rule gives the first (00:30 UTC).
  const second = {
    id: "late",
    localTime: "2027-10-31T02:30",
    timeZone: "Europe/Rome",
    startsAt: "2027-10-31T01:30:00.000Z",
  };
  const before = {
    ...second,
    id: "early",
    localTime: "2027-10-24T02:30",
    startsAt: "2027-10-24T00:30:00.000Z",
  };
  const after = {
    ...second,
    id: "next",
    localTime: "2027-11-07T02:30",
    startsAt: "2027-11-07T01:30:00.000Z",
  };
  const rule = C.recurrenceOf([before, second, after], 7);
  assert.deepEqual(
    rule.singles.map((s) => s.id),
    ["late"],
  );
  assert.deepEqual(rule.exdates, ["2027-10-31T02:30"]);
});

// ---------------------------------------------------------------- sessions (B55 × B51)

const NOW = Date.parse("2026-09-24T10:00:00Z");
const LINK = "http://127.0.0.1:8879/#campaign?tab=sessions";
// Ten Thursdays at 21:00 in Rome from 1 October 2026, through the end of daylight time on
// 25 October (the real series domain makes them, as Campaign › Sessions does).
function withSeries() {
  const state = createInitialState();
  state.campaign.sessions = [];
  state.ext = { [SP.ID]: SP.seedSessionsPlus() };
  const id = SP.createSeries(
    state,
    {
      title: "Giovedì a Bruma",
      startDate: "2026-10-01",
      time: "21:00",
      timeZone: "Europe/Rome",
      frequency: "weekly",
      count: 10,
      seats: "",
    },
    "dm",
    NOW,
  );
  const ids = SP.sliceOf(state).series.find((row) => row.id === id).sessionIds;
  const dates = ids.map((sid) => state.campaign.sessions.find((s) => s.id === sid));
  return { state, id, dates };
}
const lines = (ics) => ics.split("\r\n");

test("a session's event: «Campagna · sessione», agreed time and zone, duration, campaign link", () => {
  const { state, dates } = withSeries();
  const first = dates[0];
  assert.equal(first.startsAt, "2026-10-01T19:00:00.000Z");
  const it = D.sessionEvent(state, first, { durationHours: 3, lang: "it", link: LINK });
  assert.equal(it.title, "Le lanterne di Bruma · Giovedì a Bruma");
  assert.equal(it.start, Date.parse("2026-10-01T19:00:00Z"));
  assert.equal(it.end, Date.parse("2026-10-01T22:00:00Z"));
  assert.equal(it.timeZone, "Europe/Rome");
  assert.equal(it.location, LINK);
  assert.equal(
    it.description,
    `Campagna: Le lanterne di Bruma\nOra concordata: 2026-10-01 21:00 (Europe/Rome)\nDurata prevista: 3 h\nApri la campagna: ${LINK}`,
  );
  const en = D.sessionEvent(state, first, { durationHours: 4, lang: "en" });
  assert.match(
    en.description,
    /^Campaign: Le lanterne di Bruma\nAgreed time: 2026-10-01 21:00 \(Europe\/Rome\)\nPlanned duration: 4 h\nOpen the campaign: https:\/\/d20-studio\.example\/campaigns\/lanterns\/sessions\//,
  );
  // The same event feeds every link: Google in the agreed zone, the others in UTC.
  const google = new URL(C.googleCalendarUrl(it)).searchParams;
  assert.equal(google.get("dates"), "20261001T210000/20261002T000000");
  assert.equal(google.get("ctz"), "Europe/Rome");
  assert.equal(new URL(C.yahooCalendarUrl(it)).searchParams.get("st"), "20261001T190000Z");
});

test("single .ics: UTC instants, the new title, the link in the description and URL", () => {
  const { state, dates } = withSeries();
  const ics = D.buildIcs(state, [dates[5]], { durationHours: 3, now: NOW, lang: "it", link: LINK });
  // 5 November 2026 is after the change: 21:00 CET is 20:00 UTC.
  assert.ok(lines(ics).includes("DTSTART:20261105T200000Z"));
  assert.ok(lines(ics).includes("DTEND:20261105T230000Z"));
  assert.ok(lines(ics).includes("SUMMARY:Le lanterne di Bruma · Giovedì a Bruma"));
  assert.ok(lines(ics).includes(`URL:${LINK}`));
  assert.match(
    ics.replace(/\r\n /g, ""),
    /DESCRIPTION:Campagna: Le lanterne di Bruma\\nOra concordata: 2026-11-05 21:00 \(Europe\/Rome\)\\n/,
  );
  assert.ok(!ics.includes("RRULE"), "one date only");
});

test("whole series .ics: RRULE in the series zone, EXDATE for a cancelled date, a moved date apart", () => {
  const { state, dates } = withSeries();
  SP.cancelSessions(state, { sessionId: dates[2].id, scope: "one", reason: "" }, "dm", NOW);
  SP.editSessions(state, { sessionId: dates[5].id, scope: "one", time: "20:00" }, "dm", NOW);
  const series = D.seriesFor(state, dates[3].id, NOW);
  assert.equal(series.stepDays, 7);
  assert.equal(series.sessions.length, 9, "the cancelled date is left out");
  const ics = D.buildSeriesIcs(state, series, {
    durationHours: 3,
    now: NOW,
    lang: "it",
    link: LINK,
  });
  const all = lines(ics);
  assert.ok(
    ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n") && ics.endsWith("END:VCALENDAR\r\n"),
  );
  assert.ok(
    all.every((line) => new TextEncoder().encode(line).length <= 75),
    "folded",
  );
  // One VTIMEZONE for the one TZID, with the 25 October change (03:00 CEST → 02:00 CET).
  assert.equal(all.filter((l) => l === "BEGIN:VTIMEZONE").length, 1);
  assert.ok(all.includes("TZID:Europe/Rome"));
  const change = all.indexOf("DTSTART:20261025T030000");
  assert.ok(
    change > 0 &&
      all[change + 1] === "TZOFFSETFROM:+0200" &&
      all[change + 2] === "TZOFFSETTO:+0100",
  );
  // The recurring event: local 21:00 every week, ten steps, two of them excluded.
  assert.ok(all.includes(`UID:${series.id}@lanterns.d20-studio.example`));
  assert.ok(all.includes("DTSTART;TZID=Europe/Rome:20261001T210000"));
  assert.ok(all.includes("DTEND;TZID=Europe/Rome:20261002T000000"));
  assert.ok(all.includes("RRULE:FREQ=WEEKLY;COUNT=10"));
  assert.ok(all.includes("EXDATE;TZID=Europe/Rome:20261015T210000,20261105T210000"));
  assert.ok(all.includes("SUMMARY:Le lanterne di Bruma · Giovedì a Bruma"));
  assert.match(
    ics.replace(/\r\n /g, ""),
    /Ora concordata: ogni settimana alle 21:00 \(Europe\/Rome\)/,
  );
  // The moved date (20:00 CET = 19:00 UTC) is its own event with the session's own UID.
  assert.ok(all.includes(`UID:${dates[5].id}@lanterns.d20-studio.example`));
  assert.ok(all.includes("DTSTART:20261105T190000Z"));
  assert.equal(all.filter((l) => l === "BEGIN:VEVENT").length, 2);
  // Every TZID used has its VTIMEZONE.
  const used = new Set(ics.match(/TZID=[^:;]+/g).map((m) => m.slice(5)));
  for (const zone of used) assert.ok(all.includes(`TZID:${zone}`), zone);
  assert.equal(
    D.icsFileName(state, dates[0], { series: true }),
    "le-lanterne-di-bruma-serie-2026-10-01.ics",
  );
});

test("series: only upcoming scheduled dates, null outside a series or with one date left", () => {
  const { state, dates } = withSeries();
  const later = Date.parse("2026-10-09T00:00:00Z");
  const series = D.seriesFor(state, dates[4].id, later);
  assert.equal(series.sessions[0].id, dates[2].id, "dates already played are left out");
  const ics = D.buildSeriesIcs(state, series, { durationHours: 3, now: later, lang: "en" });
  assert.ok(lines(ics).includes("DTSTART;TZID=Europe/Rome:20261015T210000"));
  assert.ok(lines(ics).includes("RRULE:FREQ=WEEKLY;COUNT=8"));
  assert.match(ics.replace(/\r\n /g, ""), /Agreed time: every week at 21:00 \(Europe\/Rome\)/);
  assert.equal(D.seriesFor(state, dates[0].id, Date.parse("2026-12-01T00:00:00Z")), null);
  const plain = createInitialState();
  assert.equal(D.seriesFor(plain, plain.campaign.sessions[0]?.id ?? "none", NOW), null);
});
