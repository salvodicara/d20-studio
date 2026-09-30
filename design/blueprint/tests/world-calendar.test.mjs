// B42 — World calendar engine: custom months and weeks, two moons, seasons, eras, the
// date derived from the shared campaign clock, recurrence and reminders reached by game
// time (Fantasy Calendar CMP-98/100, Calendaria FVT-062). Synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import * as C from "../world-calendar.mjs";
import { seedWorld } from "../world-map-domain.mjs";

const calendar = () => seedWorld().campaigns.lanterns.calendar;
const HOUR = 3600;

test("absolute days round-trip through a calendar with uneven months", () => {
  const cal = calendar();
  assert.equal(C.yearLength(cal), 304);
  for (const date of [
    { year: 1, month: "gelo", day: 1 },
    { year: 812, month: "brume", day: 1 },
    { year: 1287, month: "nebbie", day: 14 },
    { year: 1287, month: "lunganotte", day: 31 },
  ])
    assert.deepEqual(C.dateFromAbsDay(cal, C.absDay(cal, date)), date);
  assert.equal(C.absDay(cal, { year: 1, month: "gelo", day: 1 }), 0);
  assert.equal(C.absDay(cal, { year: 2, month: "gelo", day: 1 }), 304);
  assert.equal(C.validDate(cal, { year: 1287, month: "gelo", day: 31 }), false, "Gelo has 30 days");
  assert.equal(C.validDate(cal, { year: 1287, month: "missing", day: 1 }), false);
  assert.equal(C.validDate(cal, { year: 0, month: "gelo", day: 1 }), false);
});

test("today is the start date plus the shared clock; eight hours move the calendar", () => {
  const cal = calendar();
  const start = C.nowFromClock(cal, 0);
  assert.deepEqual(start.date, { year: 1287, month: "nebbie", day: 14 });
  assert.equal(C.formatTime(start), "08:00");
  const later = C.nowFromClock(cal, 8 * HOUR);
  assert.equal(C.formatTime(later), "16:00");
  assert.equal(later.absDay, start.absDay);
  const next = C.nowFromClock(cal, 16 * HOUR);
  assert.deepEqual(next.date, { year: 1287, month: "nebbie", day: 15 });
  assert.equal(C.formatTime(next), "00:00");
  // A six-second combat round never changes the minute shown.
  assert.equal(C.formatTime(C.nowFromClock(cal, 6)), "08:00");
  // The date is formatted with the custom weekday, month and era suffix (Kanka CMP-38).
  assert.equal(C.formatDate(cal, start.date), "Alba 14 Nebbie 1287 E.L.");
  assert.equal(C.formatDate(cal, next.date), "Remo 15 Nebbie 1287 E.L.");
});

test("a six-day week lays the month out with leading and trailing blanks", () => {
  const cal = calendar();
  const rows = C.monthGrid(cal, 1287, "nebbie");
  assert.ok(rows.every((row) => row.length === 6));
  const days = rows.flat().filter(Boolean);
  assert.equal(days.length, 30);
  assert.equal(rows[0].findIndex(Boolean), C.weekdayIndex(cal, days[0].absDay));
  assert.deepEqual(C.shiftMonth(cal, 1287, "lunganotte", 1), { year: 1288, month: "gelo" });
  assert.deepEqual(C.shiftMonth(cal, 1287, "gelo", -1), { year: 1286, month: "lunganotte" });
  assert.deepEqual(C.shiftMonth(cal, 1, "gelo", -1), { year: 1, month: "gelo" });
});

test("two moons with independent cycles have phases, seasons wrap and eras label years", () => {
  const cal = calendar();
  const [vela, cinerea] = cal.moons;
  const day = C.absDay(cal, { year: 1287, month: "nebbie", day: 14 });
  assert.equal(C.moonPhase(vela, day).index, C.moonPhase(vela, day + 28).index);
  assert.equal(C.moonPhase(cinerea, day).index, C.moonPhase(cinerea, day + 11).index);
  assert.notEqual(C.moonPhase(vela, day).index, C.moonPhase(vela, day + 14).index);
  const full = [...Array(28).keys()].find((i) => C.moonPhase(vela, day + i).index === 4);
  assert.equal(C.moonPhase(vela, day + full + 14).index, 0, "new moon half a cycle after full");
  assert.equal(C.seasonOf(cal, "nebbie").name, "Autunno");
  assert.equal(C.seasonOf(cal, "gelo").name, "Inverno", "wraps to the season started last year");
  assert.equal(C.eraOf(cal, 812).name, "Età del Silenzio");
  assert.equal(C.formatYear(cal, 1287), "1287 E.L.");
});

test("recurring events repeat monthly or yearly from their date, never before", () => {
  const cal = calendar();
  const yearly = { date: { year: 1287, month: "nebbie", day: 16 }, recurrence: "yearly" };
  const from = C.absDay(cal, { year: 1286, month: "gelo", day: 1 });
  const to = C.absDay(cal, { year: 1290, month: "gelo", day: 1 });
  const days = C.occurrences(cal, yearly, from, to).map((d) => C.dateFromAbsDay(cal, d).year);
  assert.deepEqual(days, [1287, 1288, 1289]);
  const monthly = { date: { year: 1287, month: "brume", day: 30 }, recurrence: "monthly" };
  const months = C.occurrences(
    cal,
    monthly,
    C.absDay(cal, { year: 1287, month: "brume", day: 1 }),
    C.absDay(cal, { year: 1288, month: "disgelo", day: 30 }),
  ).map((d) => C.dateFromAbsDay(cal, d).month);
  assert.deepEqual(months, ["brume", "lunganotte", "gelo", "disgelo"], "day 30 exists in each");
  const once = { date: { year: 1287, month: "nebbie", day: 16 }, recurrence: "none" };
  assert.equal(C.occurrences(cal, once, 0, C.absDay(cal, once.date) - 1).length, 0);
});

test("a reminder fires only when game time crosses it after it was set and seen", () => {
  const cal = calendar();
  const now = C.nowFromClock(cal, 0).abs;
  const eclipse = {
    date: { year: 1287, month: "nebbie", day: 14 },
    time: { hour: 15, minute: 0 },
    recurrence: "none",
    reminder: { leadDays: 0, audience: "viewers", armedAt: now },
  };
  assert.equal(C.firedReminder(cal, eclipse, now), null, "not yet reached");
  const later = now + 8 * HOUR;
  assert.equal(C.firedReminder(cal, eclipse, later).at, now + 7 * HOUR);
  // A reader who could see it only after the moment gets no retroactive reminder.
  assert.equal(C.firedReminder(cal, eclipse, later, later), null);
  // A reminder set after its moment never fires by itself.
  const late = { ...eclipse, reminder: { ...eclipse.reminder, armedAt: later } };
  assert.equal(C.firedReminder(cal, late, later + HOUR), null);
  // Lead days move the moment earlier; the yearly occurrence fires again next year.
  const fair = {
    date: { year: 1287, month: "nebbie", day: 16 },
    time: null,
    recurrence: "yearly",
    reminder: { leadDays: 1, audience: "viewers", armedAt: now },
  };
  const eve = C.absSeconds(cal, { year: 1287, month: "nebbie", day: 15 });
  assert.equal(C.firedReminder(cal, fair, eve - 1), null);
  assert.equal(C.firedReminder(cal, fair, eve).at, eve);
  const nextYear = C.absSeconds(cal, { year: 1288, month: "nebbie", day: 15 });
  const fired = C.firedReminder(cal, fair, nextYear + HOUR);
  assert.deepEqual(C.dateFromAbsDay(cal, fired.day), { year: 1288, month: "nebbie", day: 16 });
});

test("calendar validation names orphaned dates and rejects impossible structures", () => {
  const cal = calendar();
  assert.deepEqual(C.validateCalendar(cal), []);
  const noSummerStart = { ...cal, months: cal.months.filter((m) => m.id !== "solleone") };
  assert.equal(C.validateCalendar(noSummerStart)[0].code, "seasons", "a season starts there");
  const shorter = {
    ...noSummerStart,
    seasons: cal.seasons.map((s) =>
      s.startMonth === "solleone" ? { ...s, startMonth: "messi" } : s,
    ),
  };
  const errors = C.validateCalendar(shorter, [
    { label: "Il grande incendio del porto", date: { year: 1201, month: "solleone", day: 9 } },
  ]);
  assert.equal(errors[0].code, "orphans");
  assert.match(errors[0].it, /Il grande incendio del porto/);
  assert.match(errors[0].en, /no longer exist/);
  assert.equal(C.validateCalendar({ ...cal, months: [] })[0].code, "months");
  assert.equal(C.validateCalendar({ ...cal, weekdays: [] })[0].code, "weekdays");
  assert.equal(
    C.validateCalendar({ ...cal, moons: [{ name: "X", cycle: 0, offset: 0, color: "#ffffff" }] })[0]
      .code,
    "moons",
  );
  assert.equal(
    C.validateCalendar({ ...cal, seasons: [{ name: "X", startMonth: "missing" }] })[0].code,
    "seasons",
  );
  assert.equal(
    C.validateCalendar({ ...cal, epoch: { ...cal.epoch, day: 31, month: "gelo" } })[0].code,
    "epoch",
  );
});
