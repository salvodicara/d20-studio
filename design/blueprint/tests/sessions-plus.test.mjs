// B51 — Sessions: recurrence, absences, seats and attendance. Domain rules, the registry
// integration with the real store and Campaign → Sessions, and the UI handlers (render +
// bind with a minimal element double). Synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore, createInitialState } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import * as D from "../sessions-plus-domain.mjs";
import * as UI from "../sessions-plus.mjs";
import { register } from "../sessions-plus.mjs";
import { renderCampaign, resetCampaignView } from "../campaign.mjs";
import * as appointments from "../campaign-sessions.mjs";
import * as content from "../campaign-content.mjs";

const NOW = Date.parse("2026-09-24T10:00:00Z");
const H = 3600e3;
const DAY = 24 * H;
const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

// A state with this area's slice, as the registry seeds it.
// The series checks start from a calendar without the example's «Il sigillo della torre».
function fresh() {
  const state = createInitialState();
  state.campaign.sessions = [];
  state.ext = { [D.ID]: D.seedSessionsPlus() };
  return state;
}
const series = (overrides = {}) => ({
  title: "Giovedì a Bruma",
  startDate: "2026-10-01",
  time: "21:00",
  timeZone: "Europe/Rome",
  frequency: "weekly",
  count: 10,
  seats: "2",
  guests: ["sim-greta", "sim-tomas"],
  ...overrides,
});
const sessions = (state) => state.campaign.sessions;
const bySeries = (state, id) =>
  D.sliceOf(state)
    .series.find((row) => row.id === id)
    .sessionIds.map((sid) => sessions(state).find((s) => s.id === sid));
function withSeries(overrides) {
  const state = fresh();
  const id = D.createSeries(state, series(overrides), "dm", NOW);
  return { state, id, dates: bySeries(state, id) };
}

// ---------------------------------------------------------------------------------------
// Seed and normalization

test("seed and normalize: synthetic guests, idempotent, strict on newer versions", () => {
  const seed = D.seedSessionsPlus();
  assert.deepEqual(
    seed.guests.lanterns.map((g) => g.name),
    ["Greta Lind", "Tomas Ferri"],
  );
  const once = D.normalizeSessionsPlus(seed, 1);
  assert.deepEqual(D.normalizeSessionsPlus(once, 1), once);
  assert.throws(() => D.normalizeSessionsPlus(seed, 2), /newer version/);
  assert.deepEqual(D.normalizeSessionsPlus(null, 0), seed);
  const junk = D.normalizeSessionsPlus(
    {
      series: [
        { id: "s1", frequency: "monthly" },
        { id: "s2", frequency: "weekly", sessionIds: ["a"] },
      ],
      rsvps: { a: { player: { status: "yes" }, dm: { status: "attending", startsAt: "x" } } },
      attendance: { a: { records: { player: { status: "late" }, dm: { status: "present" } } } },
    },
    1,
  );
  assert.deepEqual(
    junk.series.map((row) => row.id),
    ["s2"],
    "unknown cadence dropped",
  );
  assert.deepEqual(Object.keys(junk.rsvps.a), ["dm"], "invalid answers dropped");
  assert.deepEqual(Object.keys(junk.attendance.a.records), ["dm"]);
});

// ---------------------------------------------------------------------------------------
// (1) Weekly series of ten dates; one date or all future dates

test("a weekly batch of ten keeps 21:00 local across the October clock change (SVC-049, SVC-060)", () => {
  const dates = D.seriesDates(series());
  assert.equal(dates.length, 10);
  assert.ok(dates.every((d) => d.localTime.endsWith("T21:00") && d.errors.length === 0));
  assert.equal(dates[0].startsAt, "2026-10-01T19:00:00.000Z");
  assert.equal(dates[3].startsAt, "2026-10-22T19:00:00.000Z");
  assert.equal(dates[4].startsAt, "2026-10-29T20:00:00.000Z", "CET after 25 October");
  assert.equal(dates[9].localTime, "2026-12-03T21:00");
  const biweekly = D.seriesDates(series({ frequency: "biweekly", count: 3 }));
  assert.deepEqual(
    biweekly.map((d) => d.localTime),
    ["2026-10-01T21:00", "2026-10-15T21:00", "2026-10-29T21:00"],
  );
  // 02:30 happens twice on 25 October 2026 in Rome: the batch names the date and refuses.
  const ambiguous = D.previewSeries(
    fresh(),
    series({ startDate: "2026-10-18", time: "02:30", count: 2, frequency: "weekly" }),
    "dm",
    NOW,
  );
  assert.equal(ambiguous.valid, false);
  assert.ok(ambiguous.errors.some((e) => e.it.startsWith("2026-10-25 02:30")));
});

test("createSeries makes ordinary campaign sessions through the core draft service", () => {
  const { state, id, dates } = withSeries();
  assert.equal(sessions(state).length, 10);
  assert.ok(dates.every((s) => s.status === "scheduled" && s.history.length === 1));
  assert.ok(dates.every((s) => s.organizerId === "dm" && s.timeZone === "Europe/Rome"));
  // Home and the campaign overview read the same records.
  const hub = content.getCampaignHub(state, "lanterns", "player", NOW);
  assert.equal(hub.upcomingSession.id, dates[0].id);
  assert.equal(
    appointments.listCampaignSessions(state, "lanterns", "player").length,
    10,
    "the player sees the dates in Sessions",
  );
  const meta = D.sliceOf(state).sessionMeta[dates[2].id];
  assert.deepEqual(meta, { seriesId: id, index: 3, seats: 2, guests: ["sim-greta", "sim-tomas"] });
  // Only organizers; never in the past; batch of 10 at most; weekly or bi-weekly only.
  assert.throws(() => D.createSeries(fresh(), series(), "player", NOW), /Only organizers/);
  assert.throws(
    () => D.createSeries(fresh(), series({ startDate: "2026-09-01" }), "dm", NOW),
    /first date has passed/,
  );
  assert.throws(() => D.createSeries(fresh(), series({ count: 11 }), "dm", NOW), /From 1 to 10/);
  assert.throws(
    () => D.createSeries(fresh(), series({ frequency: "monthly" }), "dm", NOW),
    /weekly or every two weeks/,
  );
  assert.throws(() => D.createSeries(fresh(), series({ seats: "0" }), "dm", NOW), /Seats/);
});

test("editing only one date moves it alone and asks its answers again", () => {
  const { state, dates } = withSeries();
  D.respond(state, { sessionId: dates[0].id, status: "attending" }, "player", NOW);
  D.respond(state, { sessionId: dates[1].id, status: "attending" }, "player", NOW);
  D.editSessions(
    state,
    { sessionId: dates[0].id, scope: "one", date: "2026-10-02", time: "20:30" },
    "dm",
    NOW,
  );
  const after = bySeries(state, D.sliceOf(state).series[0].id);
  assert.equal(after[0].localTime, "2026-10-02T20:30");
  assert.equal(after[0].history.length, 2, "core history keeps the move");
  assert.equal(after[1].localTime, dates[1].localTime, "other dates untouched");
  const first = D.answerOf(state, after[0], "player");
  assert.equal(first.status, null);
  assert.equal(first.stale, true, "moved session asks again (not StartPlaying's carry-over)");
  assert.equal(first.previous, "attending");
  assert.equal(D.answerOf(state, after[1], "player").status, "attending");
  // A title-only change keeps answers.
  D.respond(state, { sessionId: dates[0].id, status: "maybe" }, "player", NOW);
  D.editSessions(
    state,
    { sessionId: dates[0].id, scope: "one", title: "Serata speciale" },
    "dm",
    NOW,
  );
  assert.equal(
    D.answerOf(
      state,
      sessions(state).find((s) => s.id === dates[0].id),
      "player",
    ).status,
    "maybe",
  );
  assert.throws(
    () => D.editSessions(state, { sessionId: dates[0].id, scope: "one" }, "player", NOW),
    /Only whoever organizes/,
  );
});

test("editing this and following moves every later open date and can be undone explicitly", () => {
  const { state, id, dates } = withSeries();
  const changeId = D.editSessions(
    state,
    { sessionId: dates[2].id, scope: "future", time: "20:30", date: "2026-10-16" },
    "dm",
    NOW,
  );
  let after = bySeries(state, id);
  assert.equal(after[1].localTime, "2026-10-08T21:00", "earlier dates keep their time");
  assert.equal(after[2].localTime, "2026-10-16T20:30", "the edited date moves one day");
  assert.equal(after[9].localTime, "2026-12-04T20:30", "later dates shift by the same days");
  const series0 = D.sliceOf(state).series[0];
  assert.equal(series0.time, "20:30");
  const change = D.sliceOf(state).changes.find((row) => row.id === changeId);
  assert.equal(change.sessionIds.length, 8);
  assert.deepEqual(change.summary.facts, ["time"]);
  // Explicit correction (a new recorded change), not a silent rollback.
  assert.equal(D.revertibleChange(state, { seriesId: id }, NOW).id, changeId);
  const revertId = D.revertChange(state, changeId, "dm", NOW);
  after = bySeries(state, id);
  assert.equal(after[2].localTime, "2026-10-15T21:00");
  assert.equal(after[9].localTime, "2026-12-03T21:00");
  assert.equal(after[9].history.length, 3, "move and correction both in the core history");
  assert.equal(D.sliceOf(state).series[0].time, "21:00");
  assert.equal(D.sliceOf(state).changes.find((row) => row.id === changeId).revertedBy, revertId);
  assert.throws(() => D.revertChange(state, changeId, "dm", NOW), /already corrected/);
  assert.equal(D.revertibleChange(state, { seriesId: id }, NOW), null);
});

test("a correction refuses when a later change or the core editor touched the same dates", () => {
  const { state, dates } = withSeries();
  const first = D.editSessions(
    state,
    { sessionId: dates[3].id, scope: "future", time: "20:00" },
    "dm",
    NOW,
  );
  D.editSessions(state, { sessionId: dates[5].id, scope: "one", seats: "3" }, "dm", NOW);
  assert.throws(() => D.revertChange(state, first, "dm", NOW), /later change/);
  const { state: s2, dates: d2 } = withSeries();
  const edit = D.editSessions(s2, { sessionId: d2[0].id, scope: "one", time: "20:00" }, "dm", NOW);
  // The core "Change date" editor moves the same date meanwhile.
  appointments.createSessionDraft(
    s2,
    { id: "core-move", kind: "change", sessionId: d2[0].id },
    "dm",
  );
  appointments.saveSessionDraft(
    s2,
    "core-move",
    {
      data: {
        title: d2[0].title,
        localTime: "2026-10-01T19:00",
        timeZone: "Europe/Rome",
        selectedInstant: null,
      },
    },
    "dm",
  );
  const p = appointments.previewSessionDraft(s2, "core-move", "dm");
  appointments.applySessionDraft(s2, "core-move", { reviewKey: p.reviewKey }, "dm");
  assert.throws(() => D.revertChange(s2, edit, "dm", NOW), /changed meanwhile/);
});

// ---------------------------------------------------------------------------------------
// (2) Skipping is not leaving; late skips warn and never block

test("skipping keeps the membership, late answers warn without blocking (C23)", () => {
  const { state, dates } = withSeries();
  // The first date is moved to three hours from now.
  const at = new Date(NOW + 3 * H + 15 * 60e3);
  const local = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const part = (type) => local.find((p) => p.type === type).value;
  D.editSessions(
    state,
    {
      sessionId: dates[0].id,
      scope: "one",
      date: `${part("year")}-${part("month")}-${part("day")}`,
      time: `${part("hour")}:${part("minute")}`,
    },
    "dm",
    NOW,
  );
  assert.equal(D.nextSessionFor(state, "player", NOW).id, dates[0].id);
  const result = D.respond(state, { sessionId: dates[0].id, status: "skipping" }, "player", NOW);
  assert.equal(result.status, "skipping", "recorded, not blocked");
  assert.equal(result.late, true);
  assert.equal(Math.floor(result.hoursLeft), 3);
  assert.ok(content.isCampaignMember(state, "lanterns", "player"), "still a campaign member");
  assert.ok(
    state.actors.livia.campaignIds === undefined ||
      state.actors.livia.campaignIds.includes("lanterns"),
  );
  // The DM is told, with the late flag; un-skipping is always possible before the start.
  const notices = D.noticesFor(state, "dm", NOW);
  const skip = notices.find((n) => n.kind === "skip");
  assert.equal(skip.late, true);
  assert.equal(skip.hoursLeft, 3);
  assert.equal(
    D.respond(state, { sessionId: dates[0].id, status: "attending" }, "player", NOW).status,
    "attending",
  );
  assert.equal(D.noticesFor(state, "dm", NOW).filter((n) => n.kind === "skip").length, 0);
  // Organizers host and take no seat; nobody answers once the session started.
  assert.throws(
    () => D.respond(state, { sessionId: dates[1].id, status: "attending" }, "dm", NOW),
    /Organizers/,
  );
  assert.throws(
    () => D.respond(state, { sessionId: dates[0].id, status: "maybe" }, "player", NOW + 4 * H),
    /has started/,
  );
});

// ---------------------------------------------------------------------------------------
// (3) Seats and a FIFO waitlist with a notice when a seat opens

test("seats fill, the waitlist is first-in-first-out and a freed seat promotes with a notice", () => {
  const { state, dates } = withSeries();
  const sid = dates[1].id;
  assert.throws(
    () =>
      D.respondFor(
        state,
        { sessionId: sid, personId: "sim-greta", status: "attending" },
        "dm",
        NOW,
      ),
    /Say why/,
  );
  D.respondFor(
    state,
    { sessionId: sid, personId: "sim-greta", status: "attending", reason: "Su Discord" },
    "dm",
    NOW,
  );
  D.respondFor(
    state,
    { sessionId: sid, personId: "sim-tomas", status: "attending", reason: "Su Discord" },
    "dm",
    NOW + 1,
  );
  let counts = D.seatCounts(state, sid);
  assert.equal(counts.attending, 2);
  assert.equal(counts.free, 0);
  const player = D.respond(state, { sessionId: sid, status: "attending" }, "player", NOW + 2);
  assert.equal(player.status, "waitlist");
  assert.equal(player.position, 1);
  // A newly invited guest queues behind the player; nobody can reorder the queue.
  D.editSessions(
    state,
    { sessionId: sid, scope: "one", newGuest: "Marta Riva", guests: ["sim-greta", "sim-tomas"] },
    "dm",
    NOW + 3,
  );
  const marta = D.knownGuests(state).find((g) => g.name === "Marta Riva").id;
  D.respondFor(
    state,
    { sessionId: sid, personId: marta, status: "attending", reason: "Al telefono" },
    "dm",
    NOW + 4,
  );
  counts = D.seatCounts(state, sid);
  assert.deepEqual(counts.waitlist, ["player", marta]);
  const freed = D.respondFor(
    state,
    { sessionId: sid, personId: "sim-tomas", status: "skipping", reason: "Non riesce" },
    "dm",
    NOW + 5,
  );
  assert.deepEqual(freed.promoted, ["player"], "first come, first served");
  const session = sessions(state).find((s) => s.id === sid);
  assert.equal(D.answerOf(state, session, "player").status, "attending");
  assert.deepEqual(D.seatCounts(state, sid).waitlist, [marta]);
  const promoted = D.noticesFor(state, "player", NOW + 6).find((n) => n.kind === "promoted");
  assert.equal(promoted.session.id, sid);
  assert.equal(promoted.by, "dm");
  // More seats promote the next person too.
  D.editSessions(state, { sessionId: sid, scope: "one", seats: "3" }, "dm", NOW + 7);
  assert.equal(D.answerOf(state, session, marta).status, "attending");
  // The log keeps every step (Sesh SVC-061) with the reason for on-behalf answers.
  const log = D.sessionView(state, sid, "dm", NOW + 8).log;
  assert.ok(log.some((row) => row.kind === "promote" && row.personId === "player"));
  assert.ok(log.some((row) => row.kind === "rsvp" && row.reason === "Non riesce"));
  // Another player's view hides reasons that are not about them.
  assert.ok(
    D.sessionView(state, sid, "player", NOW + 8).log.every(
      (row) => row.personId === "player" || !row.reason,
    ),
  );
});

// ---------------------------------------------------------------------------------------
// Cancellation, restoring and correction

test("cancel one or all following dates, restore one, undo the ending", () => {
  const { state, id, dates } = withSeries();
  D.cancelSessions(state, { sessionId: dates[1].id, scope: "one", reason: "Festa" }, "dm", NOW);
  let after = bySeries(state, id);
  assert.equal(after[1].status, "cancelled");
  assert.equal(after[1].cancellationReason, "Festa");
  D.restoreSession(state, dates[1].id, "dm", NOW);
  assert.equal(bySeries(state, id)[1].status, "scheduled");
  const end = D.cancelSessions(state, { sessionId: dates[6].id, scope: "future" }, "dm", NOW);
  after = bySeries(state, id);
  assert.deepEqual(after.map((s) => s.status).slice(5), [
    "scheduled",
    "cancelled",
    "cancelled",
    "cancelled",
    "cancelled",
  ]);
  assert.equal(D.sliceOf(state).series[0].status, "ended");
  D.revertChange(state, end, "dm", NOW);
  assert.ok(bySeries(state, id).every((s) => s.status === "scheduled"));
  assert.equal(D.sliceOf(state).series[0].status, "active");
});

// ---------------------------------------------------------------------------------------
// (4) Attendance, recorded and corrected, visible in the recap

test("attendance is suggested from answers, recorded after the start and corrected with a reason", () => {
  const { state, dates } = withSeries();
  const sid = dates[0].id;
  D.respond(state, { sessionId: sid, status: "skipping" }, "player", NOW);
  D.respondFor(
    state,
    { sessionId: sid, personId: "sim-greta", status: "attending", reason: "Discord" },
    "dm",
    NOW,
  );
  assert.throws(
    () => D.recordAttendance(state, { sessionId: sid, records: {} }, "dm", NOW),
    /once the session starts/,
  );
  const later = Date.parse(dates[0].startsAt) + 3 * H;
  const draft = D.attendanceDraft(state, sid);
  assert.equal(draft.player.status, "absent", "a skip suggests absent");
  assert.equal(draft.dm.status, "present");
  assert.equal(draft["sim-greta"].status, "present");
  draft["sim-tomas"] = { status: "absent", note: "Influenza" };
  assert.throws(
    () =>
      D.recordAttendance(
        state,
        { sessionId: sid, records: { dm: { status: "present" } } },
        "dm",
        later,
      ),
    /present/,
  );
  assert.throws(
    () => D.recordAttendance(state, { sessionId: sid, records: draft }, "player", later),
    /Only whoever/,
  );
  assert.equal(D.recordAttendance(state, { sessionId: sid, records: draft }, "dm", later), 1);
  const fixed = { ...draft, "sim-tomas": { status: "present", note: "Arrivato alle 22" } };
  assert.throws(
    () => D.recordAttendance(state, { sessionId: sid, records: fixed }, "dm", later),
    /Say why/,
  );
  assert.equal(
    D.recordAttendance(
      state,
      { sessionId: sid, records: fixed, reason: "Era in ritardo" },
      "dm",
      later,
    ),
    2,
  );
  const dmView = D.attendanceFor(state, sid, "dm");
  assert.equal(dmView.corrections.length, 1);
  assert.equal(dmView.corrections[0].records["sim-tomas"].status, "absent");
  assert.equal(dmView.people.find((p) => p.id === "sim-tomas").note, "Arrivato alle 22");
  const playerView = D.attendanceFor(state, sid, "player");
  assert.equal(
    playerView.people.find((p) => p.id === "sim-tomas").note,
    "",
    "notes stay with organizers",
  );
  assert.equal(playerView.corrections[0].reason, "");
});

// ---------------------------------------------------------------------------------------
// Registry, real store, Campaign → Sessions and the recap

// A stand-in for B13's Members section, where "Leave campaign" lives.
const membersStub = (registry) =>
  registry.add("campaign-section", {
    id: "campaign-members",
    label: { it: "Membri", en: "Members" },
    render: () => "",
  });
function harness({ lang = "it", role = "dm" } = {}) {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry();
  assert.equal(registry.use("campaign-members", membersStub).status, "built");
  assert.equal(registry.use("sessions-plus", register).status, "built");
  let store = createStore({ storage });
  store.state.campaign.sessions = []; // without the example's «Il sigillo della torre», as fresh()
  registry.initState(store.state);
  const toasts = [];
  const dialogs = [];
  const navigations = [];
  const ctx = {
    role,
    lang,
    offline: false,
    view: { page: "campaign", id: "", tab: "sessions" },
    get state() {
      return store.state;
    },
    esc,
    t(it, en) {
      return this.lang === "it" ? it : en;
    },
    label(value) {
      return typeof value === "object" && value
        ? value[this.lang] || value.it || value.en || ""
        : String(value ?? "");
    },
    toast: (text, error = false) => toasts.push({ text, error }),
    navigate(page, params = {}) {
      navigations.push({ page, ...params });
    },
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {},
    commit(label, mutator, options = {}) {
      if (this.offline && !options.local) {
        const it = "Sei senza rete: questa modifica condivisa non può essere applicata.";
        throw Object.assign(Error(it), { it, en: "You are offline." });
      }
      const before = store.state;
      store.commit(label, mutator, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(this.role);
      registry.afterUndo(current, store.state);
      store.persist();
    },
    registry,
  };
  registry.attach(ctx);
  return {
    ctx,
    registry,
    toasts,
    dialogs,
    navigations,
    reload() {
      store = createStore({ storage });
      registry.initState(store.state);
    },
  };
}
// Minimal element double for bind(): parses buttons from rendered markup.
function mount(html, bind) {
  const nodes = [...html.matchAll(/<(button)\b([^>]*)>/g)].map(([, tag, attrsText]) => {
    const attrs = Object.fromEntries(
      [...attrsText.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v)]),
    );
    return {
      tagName: tag.toUpperCase(),
      attrs,
      dataset: Object.fromEntries(
        Object.entries(attrs)
          .filter(([k]) => k.startsWith("data-"))
          .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
      ),
      focused: false,
      focus() {
        this.focused = true;
      },
    };
  });
  const matches = (node, selector) =>
    [...selector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)].every(
      ([, key, value]) => key in node.attrs && (value === undefined || node.attrs[key] === value),
    );
  const root = {
    querySelectorAll: (selector) => nodes.filter((node) => matches(node, selector)),
    querySelector: (selector) => nodes.find((node) => matches(node, selector)) ?? null,
  };
  bind(root);
  return {
    root,
    click(selector) {
      const node = root.querySelector(selector);
      assert.ok(node, `Missing ${selector}`);
      node.onclick?.({ preventDefault() {} });
    },
  };
}
const formData = (entries) => {
  const form = new FormData();
  for (const [key, value] of entries) form.append(key, value);
  return form;
};
const isoDate = (ms) => new Date(ms).toISOString().slice(0, 10);

test("registry: slice seeded, preserved by gameplay Undo, and blocks inside Campaign → Sessions", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  resetCampaignView();
  const h = harness();
  const { ctx } = h;
  assert.deepEqual(ctx.state.ext["sessions-plus"].guests.lanterns.length, 2);
  // The sidebar never lists the inner blocks (no argument, `when` false).
  assert.deepEqual(
    h.registry.list("campaign-section", ctx).map((c) => c.id),
    ["campaign-members"],
  );
  // A gameplay change, then a series: Undo reverts the gameplay only.
  ctx.commit("HP", (draft) => {
    draft.actors.livia.hp -= 1;
  });
  ctx.commit("series", (draft) => D.createSeries(draft, series(), "dm", NOW), { undoable: false });
  ctx.undo();
  assert.equal(ctx.state.actors.livia.hp, 18);
  assert.equal(ctx.state.campaign.sessions.length, 10, "core sessions survive Undo");
  assert.equal(ctx.state.ext["sessions-plus"].series.length, 1, "the slice survives Undo");
  h.reload();
  assert.equal(ctx.state.ext["sessions-plus"].series.length, 1, "persisted across reload");
  const html = renderCampaign(ctx);
  assert.match(html, /data-ext-slot="campaign-section:sessions-plus.sessions"/);
  assert.equal(
    (html.match(/data-ext-slot="campaign-section:sessions-plus.session"/g) ?? []).length,
    10,
  );
  assert.match(html, /Serie ricorrenti/);
  assert.match(html, /data-sp-series=/);
  ctx.role = "player";
  const playerHtml = renderCampaign(ctx);
  assert.match(playerHtml, /La tua presenza/);
  assert.match(playerHtml, /Salto la prossima/);
  assert.match(playerHtml, /Esci dalla campagna/, "the leave path is a separate control");
  assert.doesNotMatch(playerHtml, /data-sp-act="edit"/, "no management controls for players");
});

test("UI: answer buttons, waitlist toast, on-behalf dialog, notices in both languages", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  const h = harness({ role: "dm" });
  const { ctx } = h;
  ctx.commit("series", (draft) => D.createSeries(draft, series(), "dm", NOW), { undoable: false });
  const [first, second] = ctx.state.ext["sessions-plus"].series[0].sessionIds;
  const row = (id) => ctx.state.campaign.sessions.find((s) => s.id === id);
  // DM records two guests on the second date through the dialog.
  let el = mount(UI.renderRow(ctx, row(second)), (root) => UI.bindArea(root, ctx));
  el.click(`[data-sp-act="behalf"][data-session="${second}"]`);
  const behalf = h.dialogs.at(-1);
  assert.match(behalf.body, /Motivo \(obbligatorio\)/);
  behalf.options.onSubmit(
    formData([
      ["person", "sim-greta"],
      ["status", "attending"],
      ["reason", "Discord"],
    ]),
  );
  behalf.options.onSubmit(
    formData([
      ["person", "sim-tomas"],
      ["status", "attending"],
      ["reason", "Discord"],
    ]),
  );
  assert.throws(
    () =>
      behalf.options.onSubmit(
        formData([
          ["person", "sim-tomas"],
          ["status", "maybe"],
          ["reason", " "],
        ]),
      ),
    /Say why/,
  );
  // The player answers with the Sesh buttons: full → waitlist, told by a toast.
  ctx.role = "player";
  el = mount(UI.renderRow(ctx, row(second)), (root) => UI.bindArea(root, ctx));
  el.click(`[data-sp-answer="attending"][data-session="${second}"]`);
  assert.match(h.toasts.at(-1).text, /lista d’attesa, 1°/);
  assert.equal(D.answerOf(ctx.state, row(second), "player").status, "waitlist");
  // Keyboard focus comes back to the pressed control after the re-render.
  el = mount(UI.renderRow(ctx, row(second)), (root) => UI.bindArea(root, ctx));
  assert.ok(el.root.querySelector(`[data-sp-focus="row-${second}-attending"]`).focused);
  // The DM frees a seat: the player is promoted and the B24 centre gets the notice.
  ctx.role = "dm";
  el = mount(UI.renderRow(ctx, row(second)), (root) => UI.bindArea(root, ctx));
  el.click(`[data-sp-act="behalf"][data-session="${second}"]`);
  h.dialogs.at(-1).options.onSubmit(
    formData([
      ["person", "sim-tomas"],
      ["status", "skipping"],
      ["reason", "Non riesce"],
    ]),
  );
  assert.match(h.toasts.at(-1).text, /Posto libero: Giocatore · Livia, Mira/);
  ctx.role = "player";
  const promoted = h.registry.notifications(ctx).find((n) => n.id.startsWith("promoted:"));
  assert.equal(promoted.category, "sessions");
  assert.match(promoted.title.it, /Si è liberato un posto/);
  assert.match(promoted.title.en, /A seat opened/);
  // Skipping the next date from the top card, then the DM's notice.
  el = mount(UI.renderOverview(ctx), (root) => UI.bindArea(root, ctx));
  el.click(`[data-sp-answer="skipping"][data-session="${first}"]`);
  assert.equal(D.answerOf(ctx.state, row(first), "player").status, "skipping");
  ctx.role = "dm";
  const skip = h.registry.notifications(ctx).find((n) => n.id.startsWith("skip:"));
  assert.match(skip.title.it, /salta/);
  assert.match(skip.title.en, /skips/);
  // Offline: a shared answer is refused with a readable message, nothing changes.
  ctx.role = "player";
  ctx.offline = true;
  el = mount(UI.renderRow(ctx, row(first)), (root) => UI.bindArea(root, ctx));
  el.click(`[data-sp-answer="maybe"][data-session="${first}"]`);
  assert.equal(h.toasts.at(-1).error, true);
  assert.equal(D.answerOf(ctx.state, row(first), "player").status, "skipping");
});

test("UI: new-series dialog, edit scope, attendance dialog and the recap block", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  resetCampaignView();
  const h = harness({ role: "dm", lang: "en" });
  const { ctx } = h;
  let el = mount(UI.renderOverview(ctx), (root) => UI.bindArea(root, ctx));
  el.click('[data-sp-act="new-series"]');
  const dialog = h.dialogs.at(-1);
  assert.equal(dialog.title, "New recurring series");
  assert.match(dialog.body, /Every two weeks/);
  const preview = UI.seriesPreviewHTML(ctx, series());
  assert.equal(
    (preview.match(/clock change UTC\+01:00/g) ?? []).length,
    1,
    "the badge marks only the first date after the change",
  );
  dialog.options.onSubmit(
    formData([
      ["title", "Thursday in Bruma"],
      ["startDate", isoDate(NOW + 7 * DAY)],
      ["time", "21:00"],
      ["timeZone", "Europe/Rome"],
      ["frequency", "weekly"],
      ["count", "10"],
      ["seats", ""],
      ["guests", "sim-greta"],
      ["newGuest", ""],
    ]),
  );
  assert.equal(ctx.state.campaign.sessions.length, 10);
  assert.equal(h.toasts.at(-1).text, "10 dates scheduled.");
  const ids = ctx.state.ext["sessions-plus"].series[0].sessionIds;
  el = mount(
    UI.renderRow(
      ctx,
      ctx.state.campaign.sessions.find((s) => s.id === ids[2]),
    ),
    (root) => UI.bindArea(root, ctx),
  );
  el.click(`[data-sp-act="edit"][data-session="${ids[2]}"]`);
  const edit = h.dialogs.at(-1);
  assert.match(edit.body, /This and all following \(8\)/);
  edit.options.onSubmit(
    formData([
      ["scope", "future"],
      ["title", "Thursday in Bruma"],
      ["date", isoDate(NOW + 21 * DAY)],
      ["time", "20:30"],
      ["seats", "4"],
      ["guests", "sim-greta"],
    ]),
  );
  const times = ids.map((id) =>
    ctx.state.campaign.sessions.find((s) => s.id === id).localTime.slice(11),
  );
  assert.deepEqual(times, ["21:00", "21:00", ...Array(8).fill("20:30")]);
  // The series card offers the explicit correction.
  el = mount(UI.renderOverview(ctx), (root) => UI.bindArea(root, ctx));
  el.click('[data-sp-act="revert"]');
  assert.ok(
    ids.every((id) =>
      ctx.state.campaign.sessions.find((s) => s.id === id).localTime.endsWith("21:00"),
    ),
  );
  // A played session (core "Record played session") takes attendance at once.
  ctx.commit(
    "played",
    (draft) => {
      appointments.createSessionDraft(draft, { id: "played-1", kind: "played" }, "dm");
      appointments.saveSessionDraft(draft, "played-1", { data: { title: "One-shot" } }, "dm");
      const p = appointments.previewSessionDraft(draft, "played-1", "dm");
      appointments.applySessionDraft(draft, "played-1", { reviewKey: p.reviewKey }, "dm");
    },
    { undoable: false },
  );
  const played = ctx.state.campaign.sessions.find((s) => s.id === "session-played-1");
  el = mount(UI.renderRow(ctx, played), (root) => UI.bindArea(root, ctx));
  el.click('[data-sp-act="attendance"][data-session="session-played-1"]');
  const sheet = h.dialogs.at(-1);
  assert.equal(sheet.title, "Record attendance");
  sheet.options.onSubmit(
    formData([
      ["status-dm", "present"],
      ["status-player", "absent"],
      ["note-player", "Travelling"],
    ]),
  );
  assert.equal(
    ctx.state.ext["sessions-plus"].attendance["session-played-1"].records.player.status,
    "absent",
  );
  // The recap linked to the session shows attendance.
  const html = UI.renderRecap(ctx, { kind: "recap", data: { sessionId: "session-played-1" } });
  assert.match(html, /Session attendance/);
  assert.match(html, /Absent:<\/strong> Player · Livia, Mira \(Travelling\)/);
  assert.ok(
    h.registry.get("campaign-section", "sessions-plus.entry", ctx, {
      kind: "recap",
      data: { sessionId: "session-played-1" },
    }),
  );
  ctx.role = "player";
  assert.doesNotMatch(
    UI.renderRecap(ctx, { kind: "recap", data: { sessionId: "session-played-1" } }),
    /Travelling/,
    "attendance notes stay with organizers",
  );
});

test("a message to the DM is read only by its author and organizers", () => {
  const { state, dates } = withSeries();
  // A second playing member (a simulated person admitted by B59/B13).
  state.campaign.members = [
    { id: "player", name: "Giocatore / Player", role: "player" },
    { id: "dm", name: "DM", role: "dm", canOrganize: true },
    { id: "sim-marta", name: "Marta Riva", role: "player", simulated: true },
  ];
  const sid = dates[0].id;
  assert.throws(
    () => D.setAnswerNote(state, { sessionId: sid, note: "x" }, "player", NOW),
    /Answer the session first/,
  );
  D.respond(state, { sessionId: sid, status: "skipping" }, "player", NOW);
  D.setAnswerNote(state, { sessionId: sid, note: "Lavoro fino a tardi" }, "player", NOW);
  const note = (viewer) =>
    D.sessionView(state, sid, viewer, NOW).people.find((p) => p.id === "player").answer.note;
  assert.equal(note("player"), "Lavoro fino a tardi");
  assert.equal(note("dm"), "Lavoro fino a tardi");
  assert.equal(note("sim-marta"), "", "another player never reads it");
  // Everyone still sees the answer itself, like Sesh's public RSVP list.
  assert.equal(
    D.sessionView(state, sid, "sim-marta", NOW).people.find((p) => p.id === "player").answer.status,
    "skipping",
  );
  assert.equal(D.sessionView(state, sid, "outsider", NOW), null, "non-members see nothing");
});

// ---------------------------------------------------------------------------------------
// Independent review (B51-rf): findings fixed test-first

test("review: an edit never moves a date into the past, and neither does a correction", () => {
  const { state, id, dates } = withSeries();
  const before = JSON.stringify(sessions(state));
  assert.throws(
    () =>
      D.editSessions(
        state,
        { sessionId: dates[0].id, scope: "one", date: "2026-09-01", time: "21:00" },
        "dm",
        NOW,
      ),
    /already passed/,
  );
  assert.throws(
    () =>
      D.editSessions(
        state,
        { sessionId: dates[1].id, scope: "future", date: "2026-09-02", time: "21:00" },
        "dm",
        NOW,
      ),
    /already passed/,
  );
  assert.equal(JSON.stringify(sessions(state)), before, "nothing moved");
  // A date moved later can no longer be put back once its earlier time has passed.
  const change = D.editSessions(
    state,
    { sessionId: dates[0].id, scope: "one", date: "2026-10-02", time: "21:00" },
    "dm",
    NOW,
  );
  const afterOriginal = Date.parse("2026-10-01T20:00:00Z");
  assert.match(D.revertBlocker(state, change, afterOriginal).en, /earlier date has passed/);
  assert.equal(D.revertibleChange(state, { seriesId: id }, afterOriginal), null);
  assert.equal(D.revertBlocker(state, change, NOW), null, "still correctable before then");
});

test("review: a restored date asks for answers again; undoing the restore ends the series again", () => {
  const { state, id, dates } = withSeries();
  const sid = dates[1].id;
  D.respond(state, { sessionId: sid, status: "attending" }, "player", NOW);
  D.cancelSessions(state, { sessionId: sid, scope: "one" }, "dm", NOW + 1);
  D.restoreSession(state, sid, "dm", NOW + 2);
  const row = () => sessions(state).find((s) => s.id === sid);
  const stale = D.answerOf(state, row(), "player");
  assert.equal(stale.status, null, "an answer given before the cancellation no longer counts");
  assert.equal(stale.stale, true);
  assert.equal(stale.previous, "attending");
  assert.equal(stale.why, "restored");
  assert.ok(
    D.noticesFor(state, "player", NOW + 3).some((n) => n.kind === "reask" && n.session.id === sid),
  );
  assert.equal(D.seatCounts(state, sid).attending, 0);
  D.respond(state, { sessionId: sid, status: "attending" }, "player", NOW + 3);
  assert.equal(D.answerOf(state, row(), "player").status, "attending");
  assert.equal(D.answerOf(state, row(), "player").stale, false);
  assert.ok(!D.noticesFor(state, "player", NOW + 4).some((n) => n.kind === "reask"));
  // Ending the series, restoring one date, then correcting that restore.
  D.cancelSessions(state, { sessionId: dates[4].id, scope: "future" }, "dm", NOW + 5);
  assert.equal(D.sliceOf(state).series[0].status, "ended");
  const restore = D.restoreSession(state, dates[6].id, "dm", NOW + 6);
  assert.equal(D.sliceOf(state).series[0].status, "active");
  D.revertChange(state, restore, "dm", NOW + 7);
  assert.equal(bySeries(state, id)[6].status, "cancelled");
  assert.equal(D.sliceOf(state).series[0].status, "ended", "back to how it was");
});

test("review: a cancellation reason declared visible to the group is shown to players", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  const h = harness({ role: "dm" });
  const { ctx } = h;
  ctx.commit("series", (draft) => D.createSeries(draft, series(), "dm", NOW), { undoable: false });
  const sid = ctx.state.ext["sessions-plus"].series[0].sessionIds[1];
  ctx.commit(
    "cancel",
    (draft) =>
      D.cancelSessions(draft, { sessionId: sid, scope: "one", reason: "Festa di Mira" }, "dm", NOW),
    { undoable: false },
  );
  ctx.role = "player";
  const log = D.sessionView(ctx.state, sid, "player", NOW).log.find((r) => r.kind === "cancel");
  assert.equal(log.reason, "Festa di Mira");
  const html = decode(
    UI.renderRow(
      ctx,
      ctx.state.campaign.sessions.find((s) => s.id === sid),
    ),
  );
  assert.match(html, /Motivo dell’annullamento: Festa di Mira/);
});

test("review: a full session offers the waitlist by name (Warhorn SVC-009) in both languages", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  const h = harness({ role: "dm" });
  const { ctx } = h;
  ctx.commit("series", (draft) => D.createSeries(draft, series(), "dm", NOW), { undoable: false });
  const sid = ctx.state.ext["sessions-plus"].series[0].sessionIds[0];
  const row = () => ctx.state.campaign.sessions.find((s) => s.id === sid);
  for (const person of ["sim-greta", "sim-tomas"])
    ctx.commit(
      "behalf",
      (draft) =>
        D.respondFor(
          draft,
          { sessionId: sid, personId: person, status: "attending", reason: "Discord" },
          "dm",
          NOW,
        ),
      { undoable: false },
    );
  ctx.role = "player";
  const button = (html) =>
    decode(
      html.match(
        new RegExp(`<button[^>]*data-sp-focus="row-${sid}-attending"[^>]*>([^<]*)</button>`),
      )[1],
    );
  assert.equal(button(UI.renderRow(ctx, row())), "Mettimi in lista d’attesa");
  assert.match(decode(UI.renderOverview(ctx)), />Mettimi in lista d’attesa</);
  const el = mount(UI.renderRow(ctx, row()), (root) => UI.bindArea(root, ctx));
  el.click(`[data-sp-answer="attending"][data-session="${sid}"]`);
  const html = UI.renderRow(ctx, row());
  assert.equal(button(html), "In lista d’attesa (1°)");
  assert.match(html, new RegExp(`aria-pressed="true" data-sp-answer="attending"`));
  ctx.lang = "en";
  assert.equal(button(UI.renderRow(ctx, row())), "Waitlisted (#1)");
});

test("review: the attendance sheet also reads the evening at the Table (B14 presence)", async () => {
  const sv = await import("../session-view.mjs");
  const { state, dates } = withSeries();
  state.ext["session-view"] = sv.seedSession();
  const sid = dates[0].id;
  D.respond(state, { sessionId: sid, status: "attending" }, "player", NOW);
  const at = Date.parse(dates[0].startsAt) + 60e3;
  // The player said "away" before the evening began and never came back.
  sv.setPresence(state, "player", "player", { status: "away", message: "Febbre" }, at - 5 * 60e3);
  const evening = sv.startSession(state, "dm", at);
  assert.equal(evening.campaignSessionId, sid, "B14 linked today's series date");
  const presence = D.tablePresence(state, sid);
  assert.equal(presence.player.present, false);
  assert.equal(presence.player.message, "Febbre");
  assert.equal(presence.dm.present, true);
  const draft = D.attendanceDraft(state, sid);
  assert.equal(draft.player.status, "absent", "the Table says away although the answer was yes");
  assert.equal(draft.dm.status, "present");
  assert.equal(draft["sim-greta"].status, "present", "guests are not at the Table: answers only");
  assert.equal(D.tablePresence(state, dates[1].id), null, "no evening, no Table facts");
  // B14's own story agrees.
  const facts = sv.sessionFacts(state, evening, at + 3600e3);
  assert.equal(facts.attendance.find((row) => row.memberId === "player").present, false);
});

test("review: B24 wording of late hours, and a player learns when the DM answers for them", (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  const h = harness({ role: "dm" });
  const { ctx } = h;
  ctx.commit("series", (draft) => D.createSeries(draft, series(), "dm", NOW), { undoable: false });
  const sid = ctx.state.ext["sessions-plus"].series[0].sessionIds[0];
  // Move the first date to 1 h 30 min from now, then the player skips it.
  const at = new Date(NOW + 90 * 60e3);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const p = (type) => parts.find((x) => x.type === type).value;
  ctx.commit(
    "move",
    (draft) =>
      D.editSessions(
        draft,
        {
          sessionId: sid,
          scope: "one",
          date: `${p("year")}-${p("month")}-${p("day")}`,
          time: `${p("hour")}:${p("minute")}`,
        },
        "dm",
        NOW,
      ),
    { undoable: false },
  );
  ctx.role = "player";
  ctx.commit(
    "skip",
    (draft) => D.respond(draft, { sessionId: sid, status: "skipping" }, "player", NOW),
    {
      undoable: false,
    },
  );
  ctx.role = "dm";
  const skip = h.registry.notifications(ctx).find((n) => n.id.startsWith("skip:"));
  assert.match(skip.body.it, /A ridosso: mancava 1 ora all’inizio/);
  assert.match(skip.body.en, /Late notice: 1 hour before the start/);
  // The DM records the player's answer on their behalf (SVC-054): the player is told.
  const second = ctx.state.ext["sessions-plus"].series[0].sessionIds[1];
  ctx.commit(
    "behalf",
    (draft) =>
      D.respondFor(
        draft,
        {
          sessionId: second,
          personId: "player",
          status: "skipping",
          reason: "Me l’ha detto al telefono",
        },
        "dm",
        NOW,
      ),
    { undoable: false },
  );
  ctx.role = "player";
  const told = h.registry.notifications(ctx).find((n) => n.id.startsWith("recorded:"));
  assert.ok(told, "the player gets a notice");
  assert.match(told.title.it, /Risposta registrata per te/);
  assert.match(told.body.it, /Salta.*Motivo: Me l’ha detto al telefono\. Se non è così/);
  assert.match(told.body.en, /Skipping.*Me l’ha detto al telefono/);
  // Answering again themselves clears it.
  ctx.commit(
    "again",
    (draft) => D.respond(draft, { sessionId: second, status: "maybe" }, "player", NOW),
    {
      undoable: false,
    },
  );
  assert.ok(!h.registry.notifications(ctx).some((n) => n.id.startsWith("recorded:")));
});

test("review: the new-series dialog quotes the session zero schedule only when there is one", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  const { seedSafety } = await import("../safety-domain.mjs");
  const h = harness({ role: "dm" });
  const { ctx } = h;
  let el = mount(UI.renderOverview(ctx), (root) => UI.bindArea(root, ctx));
  el.click('[data-sp-act="new-series"]');
  assert.doesNotMatch(
    h.dialogs.at(-1).body,
    /sessione zero/i,
    "no claim without session zero data",
  );
  ctx.commit("safety", (draft) => {
    draft.ext.safety = seedSafety();
  });
  el = mount(UI.renderOverview(ctx), (root) => UI.bindArea(root, ctx));
  el.click('[data-sp-act="new-series"]');
  assert.match(
    decode(h.dialogs.at(-1).body),
    /Dalla sessione zero · Frequenza e orario: «Venerdì sera, ogni due settimane\.»/,
  );
});

test("review: keyboard focus returns to the opener after a dialog, and a refused answer moves no focus", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: NOW });
  const h = harness({ role: "dm" });
  const { ctx } = h;
  ctx.commit("series", (draft) => D.createSeries(draft, series(), "dm", NOW), { undoable: false });
  const sid = ctx.state.ext["sessions-plus"].series[0].sessionIds[0];
  const row = () => ctx.state.campaign.sessions.find((s) => s.id === sid);
  const focused = [];
  const previous = globalThis.document;
  globalThis.document = {
    querySelector: (selector) => {
      const key = /data-sp-focus="([^"]+)"/.exec(selector)?.[1];
      return key === `row-${sid}-behalf` ? { focus: () => focused.push(key) } : null;
    },
  };
  t.after(() => {
    globalThis.document = previous;
  });
  let el = mount(UI.renderRow(ctx, row()), (root) => UI.bindArea(root, ctx));
  assert.ok(
    el.root.querySelector(`[data-sp-focus="row-${sid}-behalf"]`),
    "the opener has a focus key",
  );
  el.click(`[data-sp-act="behalf"][data-session="${sid}"]`);
  h.dialogs.at(-1).options.onSubmit(
    formData([
      ["person", "sim-greta"],
      ["status", "maybe"],
      ["reason", "Discord"],
    ]),
  );
  await Promise.resolve();
  assert.deepEqual(focused, [`row-${sid}-behalf`], "focus goes back after the dialog closes");
  // Offline, a refused answer leaves no pending focus for a later render.
  ctx.role = "player";
  ctx.offline = true;
  el = mount(UI.renderRow(ctx, row()), (root) => UI.bindArea(root, ctx));
  el.click(`[data-sp-answer="maybe"][data-session="${sid}"]`);
  assert.equal(h.toasts.at(-1).error, true);
  ctx.offline = false;
  el = mount(UI.renderRow(ctx, row()), (root) => UI.bindArea(root, ctx));
  assert.equal(el.root.querySelector(`[data-sp-focus="row-${sid}-maybe"]`).focused, false);
});
