// Sample-data freshness (hand-offs of audit round 2, item 4): the owner opens the example on
// an unknown date. The example campaign plays on Thursday evenings in Rome: its last session
// is the latest Thursday before the visit, its next one the coming Thursday at 20:30 local
// time, and every real-time stamp of the example keeps its distance from that session. The
// in-world calendar is independent (census C24). No test here reads the real clock.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import * as clock from "../sample-clock.mjs";
import { createInitialState } from "../state.mjs";

afterEach(() => clock.useSampleClock(null));
const at = (iso) => () => Date.parse(iso);

test("the authoring week keeps the authored dates; a later visit moves them by whole weeks", () => {
  // Monday 21 September 2026: the last session was Thursday 17, the next is Thursday 24.
  clock.useSampleClock(at("2026-09-21T10:00:00Z"));
  assert.equal(clock.sampleWeeks(), 0);
  assert.equal(clock.sampleDate("2026-09-17T21:40:00.000Z"), "2026-09-17T21:40:00.000Z");
  assert.equal(clock.sampleDay("2026-09-10"), "2026-09-10");
  // Tuesday 29 September 2026: one week later.
  clock.useSampleClock(at("2026-09-29T10:00:00Z"));
  assert.equal(clock.sampleWeeks(), 1);
  assert.equal(clock.sampleDate("2026-09-17T21:40:00.000Z"), "2026-09-24T21:40:00.000Z");
  assert.equal(clock.sampleDay("2026-09-10"), "2026-09-17");
  // A visit months later (winter time in Rome) still lands on a Thursday.
  clock.useSampleClock(at("2027-02-15T09:00:00Z"));
  const last = new Date(clock.sampleDate("2026-09-17T21:40:00.000Z"));
  assert.equal(last.getUTCDay(), 4, "Thursday");
  assert.ok(Date.parse("2027-02-15T09:00:00Z") - last.getTime() < 11 * 86400000);
  // Whatever the day of the visit, even right after a Thursday session, the latest authored
  // stamp (Sunday 20 September, 18:10 UTC) stays in the past.
  for (let hours = 0; hours < 24 * 14; hours += 5) {
    const now = Date.parse("2026-10-01T00:00:00Z") + hours * 3600000;
    clock.useSampleClock(() => now);
    assert.ok(Date.parse(clock.sampleDate("2026-09-20T18:10:00.000Z")) <= now, String(hours));
    assert.ok(Date.parse(clock.nextSampleSession().startsAt) > now);
  }
});

test("the next session is the coming Thursday at 20:30 in Rome, always after the visit", () => {
  for (const [now, local, startsAt] of [
    ["2026-09-29T10:00:00Z", "2026-10-01T20:30", "2026-10-01T18:30:00.000Z"],
    ["2026-12-03T19:00:00Z", "2026-12-03T20:30", "2026-12-03T19:30:00.000Z"],
    // Thursday evening after 20:30: the next Thursday.
    ["2026-12-03T20:00:00Z", "2026-12-10T20:30", "2026-12-10T19:30:00.000Z"],
  ]) {
    clock.useSampleClock(at(now));
    const next = clock.nextSampleSession();
    assert.equal(next.localTime, local, now);
    assert.equal(next.timeZone, "Europe/Rome");
    assert.equal(next.startsAt, startsAt, now);
    assert.ok(Date.parse(next.startsAt) > Date.parse(now));
    // The sample's last session (the authored Thursday, moved) is an earlier Thursday.
    const last = clock.sampleDay("2026-09-17");
    assert.equal(new Date(last).getUTCDay(), 4);
    assert.ok(Date.parse(last) < Date.parse(next.localTime.slice(0, 10)));
  }
});

test("a fresh example schedules «Il sigillo della torre» on the coming Thursday", () => {
  clock.useSampleClock(at("2027-03-10T12:00:00Z"));
  const state = createInitialState();
  const upcoming = state.campaign.sessions.filter(
    (s) => s.status === "scheduled" && Date.parse(s.startsAt) > Date.parse("2027-03-10T12:00:00Z"),
  );
  assert.equal(upcoming.length, 1);
  assert.equal(upcoming[0].title, "Il sigillo della torre");
  assert.equal(upcoming[0].localTime, "2027-03-11T20:30");
});

test("no seeded sample stamp is ever after the visit, even right after a Thursday session", async () => {
  const seeds = await Promise.all([
    import("../campaign-members.mjs").then((m) => (s) => m.seedSlice(s)),
    import("../campaign-settings-domain.mjs").then((m) => () => m.seedSlice()),
    import("../community-domain.mjs").then((m) => () => m.seedSlice()),
    import("../safety-domain.mjs").then((m) => () => m.seedSafety()),
    import("../session-prep.mjs").then((m) => () => m.seedPrep()),
    import("../media-domain.mjs").then((m) => () => m.seedMedia()),
    import("../annotations-domain.mjs").then((m) => () => m.seedAnnotations()),
    import("../inventory-plus-domain.mjs").then((m) => (s) => m.seedSlice(s)),
    import("../integrations-domain.mjs").then((m) => () => m.seedSlice()),
    import("../handouts-domain.mjs").then((m) => () => m.seedHandouts()),
    import("../encounter-builder-domain.mjs").then((m) => () => m.seedSlice()),
    import("../adventures.mjs").then((m) => () => m.seedSlice()),
    import("../journal-plus.mjs").then((m) => () => m.seedQuests()),
    import("../projects.mjs").then((m) => (s) => m.seedProjects(s)),
    import("../quickbar-domain.mjs").then((m) => (s) => m.seedQuickbar(s)),
    import("../chat-domain.mjs").then((m) => () => m.seedChat()),
    import("../character-library.mjs").then((m) => (s) => m.seedSlice(s)),
  ]);
  // A Thursday evening right after the session, a Sunday and a Wednesday months later.
  for (const now of ["2026-10-01T21:30:00Z", "2026-10-04T08:00:00Z", "2027-05-12T12:00:00Z"]) {
    const visit = Date.parse(now);
    clock.useSampleClock(() => visit);
    const state = createInitialState();
    const text = JSON.stringify([state, ...seeds.map((seed) => seed(state))]);
    const stamps = text.match(/20\d\d-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z/g) ?? [];
    const next = clock.nextSampleSession().startsAt;
    // A seed may stamp the real moment it runs (the visit itself in the app): not a sample stamp.
    const real = Date.now();
    const future = stamps.filter(
      (stamp) =>
        stamp !== next && Date.parse(stamp) > visit && Math.abs(Date.parse(stamp) - real) > 60000,
    );
    assert.deepEqual(future, [], now);
    assert.ok(stamps.length > 80, "the seeds carry their stamps");
    // Dates without a time (adventure logs) are past too.
    for (const day of text.match(/"20\d\d-\d\d-\d\d"/g) ?? [])
      assert.ok(Date.parse(day.slice(1, -1)) <= visit, day);
  }
});
