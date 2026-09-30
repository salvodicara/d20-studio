// B42 — World calendar: the pure fantasy-calendar engine (no DOM, no registry).
//
// Patterns (census IDs): Fantasy Calendar months of any length, custom weeks, several
// moons, seasons and eras (CMP-98) with dated and recurring events (CMP-100); LegendKeeper
// moons with phases and colours (CMP-70); Kanka date format with an era suffix (CMP-38);
// Calendaria (Foundry module) notes that are visible to everyone, hidden to the GM only or
// private, with reminders fired when game time reaches them (FVT-062); dnd5e calendar
// with GM-only time advance (FVT-060).
//
// The date is never a separate clock: "now" is the calendar's start date (the date at
// shared clock zero, set by the DM) plus the campaign clock of rest-time.mjs
// (`restTime.clocks[campaignId].seconds`). Time moves only through play or the DM (I-087,
// census C24): nothing here advances by itself or follows real time (Kanka CMP-37 is
// deliberately not copied). The day has 24 hours of 3600 seconds, like the rest clock.

export const DAY = 86400;
export const HOUR = 3600;
export const MINUTE = 60;
export const MAX_YEAR = 999999;
export const RECURRENCES = Object.freeze(["none", "monthly", "yearly"]);
export const LEADS = Object.freeze([0, 1, 3, 7]);

const mod = (n, m) => ((n % m) + m) % m;
const int = (v, min, max) => Number.isSafeInteger(v) && v >= min && v <= max;
const text = (v, max) => typeof v === "string" && v.trim().length > 0 && v.length <= max;
const issue = (code, it, en) => ({ code, it, en });

export const PHASES = Object.freeze([
  { it: "Luna nuova", en: "New moon" },
  { it: "Luna crescente", en: "Waxing crescent" },
  { it: "Primo quarto", en: "First quarter" },
  { it: "Gibbosa crescente", en: "Waxing gibbous" },
  { it: "Luna piena", en: "Full moon" },
  { it: "Gibbosa calante", en: "Waning gibbous" },
  { it: "Ultimo quarto", en: "Last quarter" },
  { it: "Luna calante", en: "Waning crescent" },
]);

// ------------------------------------------------------------------ structure
export const monthIndex = (cal, id) => cal.months.findIndex((m) => m.id === id);
export const yearLength = (cal) => cal.months.reduce((n, m) => n + m.days, 0);

export function validDate(cal, date) {
  if (!date || !int(date.year, 1, MAX_YEAR) || !Number.isSafeInteger(date.day)) return false;
  const month = cal.months[monthIndex(cal, date.month)];
  return Boolean(month) && date.day >= 1 && date.day <= month.days;
}
export function validTime(time) {
  return time === null || (!!time && int(time.hour, 0, 23) && int(time.minute, 0, 59));
}

/** Days since day 1 of the first month of year 1 (day 0). */
export function absDay(cal, date) {
  const index = monthIndex(cal, date.month);
  let n = (date.year - 1) * yearLength(cal);
  for (let i = 0; i < index; i++) n += cal.months[i].days;
  return n + date.day - 1;
}
export function dateFromAbsDay(cal, n) {
  const length = yearLength(cal);
  const year = Math.floor(n / length) + 1;
  let rest = n - (year - 1) * length;
  let index = 0;
  while (rest >= cal.months[index].days) {
    rest -= cal.months[index].days;
    index++;
  }
  return { year, month: cal.months[index].id, day: rest + 1 };
}
export const timeSeconds = (time) => (time ? time.hour * HOUR + time.minute * MINUTE : 0);
export const absSeconds = (cal, date, time = null) => absDay(cal, date) * DAY + timeSeconds(time);
/** The absolute instant of shared clock zero. */
export const epochSeconds = (cal) => absSeconds(cal, cal.epoch, cal.epoch);

/** The world's "now" from the campaign clock (seconds elapsed since clock zero). */
export function nowFromClock(cal, clockSeconds = 0) {
  const abs = epochSeconds(cal) + Math.max(0, Number(clockSeconds) || 0);
  const day = Math.floor(abs / DAY);
  const second = abs - day * DAY;
  return {
    abs,
    absDay: day,
    date: dateFromAbsDay(cal, day),
    hour: Math.floor(second / HOUR),
    minute: Math.floor((second % HOUR) / MINUTE),
    second: second % MINUTE,
  };
}

export const weekdayIndex = (cal, day) => mod(day + (cal.weekdayOffset ?? 0), cal.weekdays.length);

/** Phase 0..7 (0 new, 4 full) of one moon on an absolute day. */
export function moonPhase(moon, day) {
  const fraction = mod(day - (moon.offset ?? 0), moon.cycle) / moon.cycle;
  return { index: Math.floor(fraction * 8 + 0.5) % 8, fraction };
}

/** The season whose start month is the latest one not after the month (wrapping). */
export function seasonOf(cal, monthId) {
  if (!cal.seasons?.length) return null;
  const index = monthIndex(cal, monthId);
  const sorted = [...cal.seasons]
    .map((s) => ({ ...s, at: monthIndex(cal, s.startMonth) }))
    .filter((s) => s.at >= 0)
    .sort((a, b) => a.at - b.at);
  if (!sorted.length) return null;
  return [...sorted].reverse().find((s) => s.at <= index) ?? sorted.at(-1);
}

/** The era a year belongs to: the latest era that starts no later than it. */
export function eraOf(cal, year) {
  const sorted = [...(cal.eras ?? [])].sort((a, b) => a.startYear - b.startYear);
  return [...sorted].reverse().find((e) => e.startYear <= year) ?? null;
}

// ------------------------------------------------------------------ formatting
export const pad2 = (n) => String(n).padStart(2, "0");
export const formatTime = (time) => (time ? `${pad2(time.hour)}:${pad2(time.minute)}` : "");
export function formatYear(cal, year) {
  const era = eraOf(cal, year);
  return era?.abbr ? `${year} ${era.abbr}` : String(year);
}
/** "Remo 14 Nebbie 1287 E.L." — Kanka-like day, month name, year and era suffix. */
export function formatDate(cal, date, { weekday = true, year = true } = {}) {
  if (!validDate(cal, date)) return "";
  const month = cal.months[monthIndex(cal, date.month)];
  const day = absDay(cal, date);
  const parts = [];
  if (weekday && cal.weekdays.length) parts.push(cal.weekdays[weekdayIndex(cal, day)].name);
  parts.push(String(date.day), month.name);
  if (year) parts.push(formatYear(cal, date.year));
  return parts.join(" ");
}

// ------------------------------------------------------------------ month grid
/** Rows of the month: each row has one cell per weekday, null before the first day. */
export function monthGrid(cal, year, monthId) {
  const month = cal.months[monthIndex(cal, monthId)];
  const first = absDay(cal, { year, month: monthId, day: 1 });
  const lead = weekdayIndex(cal, first);
  const width = cal.weekdays.length;
  const cells = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= month.days; day++)
    cells.push({ day, absDay: first + day - 1, weekday: weekdayIndex(cal, first + day - 1) });
  while (cells.length % width) cells.push(null);
  const rows = [];
  for (let i = 0; i < cells.length; i += width) rows.push(cells.slice(i, i + width));
  return rows;
}
export function shiftMonth(cal, year, monthId, delta) {
  let index = monthIndex(cal, monthId) + delta;
  let y = year;
  while (index < 0) {
    index += cal.months.length;
    y--;
  }
  while (index >= cal.months.length) {
    index -= cal.months.length;
    y++;
  }
  if (y < 1) return { year: 1, month: cal.months[0].id };
  return { year: Math.min(y, MAX_YEAR), month: cal.months[index].id };
}

// ------------------------------------------------------------------ events
/** Absolute days of an event's occurrences within [from, to] (never before its date). */
export function occurrences(cal, event, from, to) {
  if (!validDate(cal, event.date)) return [];
  const base = absDay(cal, event.date);
  const start = Math.max(from, base);
  if (start > to) return [];
  const out = [];
  const push = (year, monthId) => {
    const month = cal.months[monthIndex(cal, monthId)];
    if (year < 1 || year > MAX_YEAR || event.date.day > month.days) return;
    const day = absDay(cal, { year, month: monthId, day: event.date.day });
    if (day >= start && day <= to) out.push(day);
  };
  const first = dateFromAbsDay(cal, start);
  const last = dateFromAbsDay(cal, to);
  if (event.recurrence === "yearly") {
    for (let year = first.year; year <= last.year && out.length < 5000; year++)
      push(year, event.date.month);
    return out;
  }
  if (event.recurrence === "monthly") {
    let cursor = { year: first.year, month: first.month };
    for (let guard = 0; guard < 60000; guard++) {
      push(cursor.year, cursor.month);
      if (cursor.year === last.year && cursor.month === last.month) break;
      cursor = shiftMonth(cal, cursor.year, cursor.month, 1);
    }
    return out;
  }
  return base >= from && base <= to ? [base] : [];
}
export const occurrenceStart = (event, day) => day * DAY + timeSeconds(event.time);
export const reminderAt = (event, day) =>
  occurrenceStart(event, day) - (event.reminder?.leadDays ?? 0) * DAY;

/**
 * The reminder an event fired most recently for a reader: the time must have moved
 * past its moment after the reminder was set (`armedAt`) and after the reader could see
 * the event (`visibleSince`). Returns {day, at, start} or null.
 */
export function firedReminder(cal, event, nowAbs, visibleSince = null) {
  if (!event.reminder) return null;
  const after = Math.max(event.reminder.armedAt ?? -Infinity, visibleSince ?? -Infinity);
  const lead = event.reminder.leadDays ?? 0;
  const from = Math.floor((Number.isFinite(after) ? after : nowAbs) / DAY) - 1;
  const to = Math.floor(nowAbs / DAY) + lead + 1;
  const days = occurrences(cal, event, Math.max(0, from), to);
  let found = null;
  for (const day of days) {
    const at = reminderAt(event, day);
    if (at > after && at <= nowAbs) found = { day, at, start: occurrenceStart(event, day) };
  }
  return found;
}

// ------------------------------------------------------------------ validation
/**
 * Structural checks of a calendar and of the dates that depend on it. `dates` lists
 * {label, date} of stored events: a change that would orphan one is refused, naming it.
 */
export function validateCalendar(cal, dates = []) {
  const errors = [];
  if (!text(cal?.name ?? "", 80))
    errors.push(issue("name", "Dai un nome al calendario.", "Name the calendar."));
  const months = Array.isArray(cal?.months) ? cal.months : [];
  if (months.length < 1 || months.length > 24)
    errors.push(issue("months", "Servono da 1 a 24 mesi.", "Use 1 to 24 months."));
  if (months.some((m) => !text(m?.name, 40) || !int(m?.days, 1, 99)))
    errors.push(
      issue(
        "month-fields",
        "Ogni mese ha un nome e da 1 a 99 giorni.",
        "Each month has a name and 1 to 99 days.",
      ),
    );
  if (new Set(months.map((m) => m?.id)).size !== months.length)
    errors.push(issue("month-ids", "Mesi duplicati.", "Duplicate months."));
  const weekdays = Array.isArray(cal?.weekdays) ? cal.weekdays : [];
  if (weekdays.length < 1 || weekdays.length > 14 || weekdays.some((d) => !text(d?.name, 30)))
    errors.push(
      issue(
        "weekdays",
        "La settimana ha da 1 a 14 giorni, ciascuno con un nome.",
        "The week has 1 to 14 named days.",
      ),
    );
  const moons = Array.isArray(cal?.moons) ? cal.moons : [];
  if (
    moons.length > 4 ||
    moons.some(
      (m) =>
        !text(m?.name, 30) ||
        !(Number.isFinite(m?.cycle) && m.cycle >= 1 && m.cycle <= 1000) ||
        !Number.isSafeInteger(m?.offset) ||
        !/^#[0-9a-f]{6}$/i.test(m?.color ?? ""),
    )
  )
    errors.push(
      issue(
        "moons",
        "Fino a 4 lune, ciascuna con nome, ciclo da 1 a 1000 giorni e colore.",
        "Up to 4 moons, each with a name, a 1–1000 day cycle and a colour.",
      ),
    );
  const seasons = Array.isArray(cal?.seasons) ? cal.seasons : [];
  if (
    seasons.length > 8 ||
    seasons.some((s) => !text(s?.name, 30) || !months.some((m) => m.id === s?.startMonth))
  )
    errors.push(
      issue(
        "seasons",
        "Fino a 8 stagioni, ciascuna con un nome e un mese d’inizio esistente.",
        "Up to 8 seasons, each with a name and an existing start month.",
      ),
    );
  const eras = Array.isArray(cal?.eras) ? cal.eras : [];
  if (
    eras.length > 12 ||
    eras.some(
      (e) => !text(e?.name, 60) || !int(e?.startYear, 1, MAX_YEAR) || (e.abbr ?? "").length > 12,
    )
  )
    errors.push(
      issue(
        "eras",
        "Fino a 12 ere, ciascuna con nome, sigla breve e anno d’inizio.",
        "Up to 12 eras, each with a name, a short abbreviation and a start year.",
      ),
    );
  if (!errors.length) {
    if (
      !validDate(cal, cal.epoch) ||
      !validTime({ hour: cal.epoch?.hour, minute: cal.epoch?.minute })
    )
      errors.push(
        issue(
          "epoch",
          "La data d’inizio non esiste in questo calendario.",
          "The start date does not exist in this calendar.",
        ),
      );
    // A row without a label is an event the caller may not read (a player's private
    // event for the DM): it is counted, never named (B42 review).
    const orphans = dates.filter((row) => !validDate(cal, row.date));
    const named = orphans.filter((row) => row.label);
    const hidden = orphans.length - named.length;
    const names = `${named
      .slice(0, 3)
      .map((row) => row.label)
      .join(", ")}${named.length > 3 ? "…" : ""}`;
    const list = (hiddenText) => [names, hidden ? hiddenText : ""].filter(Boolean).join("; ");
    if (orphans.length)
      errors.push(
        issue(
          "orphans",
          `Queste date non esisterebbero più: ${list(
            hidden === 1
              ? "1 evento privato di un giocatore"
              : `${hidden} eventi privati dei giocatori`,
          )}. Spostale prima di cambiare i mesi${hidden ? " (un evento privato lo sposta chi lo ha creato)" : ""}.`,
          `These dates would no longer exist: ${list(
            hidden === 1 ? "1 private event of a player" : `${hidden} private events of players`,
          )}. Move them before changing the months${hidden ? " (a private event is moved by its author)" : ""}.`,
        ),
      );
  }
  return errors;
}
