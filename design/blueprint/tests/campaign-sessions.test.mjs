import test from "node:test";
import assert from "node:assert/strict";
const c = await import("../campaign-sessions.mjs").catch(() => ({}));
const api = () =>
  assert.equal(typeof c.resolveSessionTime, "function", "session domain API is implemented");
function state() {
  return {
    campaign: {
      id: "camp",
      members: [
        { id: "owner", name: "Owner", role: "dm" },
        { id: "organizer", name: "Organizer", role: "player", canOrganize: true },
        { id: "reader", name: "Reader", role: "player" },
        { id: "other", name: "Other", role: "player" },
      ],
      sessions: [],
      polls: [],
      sessionDrafts: [],
    },
    actors: { hero: { hp: 3 } },
    combat: { active: true, round: 5 },
    log: [],
  };
}
const time = (localTime = "2026-11-12T20:00", timeZone = "Europe/Rome") => ({
  localTime,
  timeZone,
  selectedInstant: null,
});
function save(s, d, data, viewer = "owner") {
  return c.saveSessionDraft(s, d.id, { data, expectedDraftRevision: d.revision }, viewer);
}
function apply(s, id, viewer = "owner", options = {}) {
  const p = c.previewSessionDraft(s, id, viewer);
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  return c.applySessionDraft(s, id, { reviewKey: p.reviewKey }, viewer, options);
}
function poll(s, id = "poll") {
  let d = c.createSessionDraft(s, { id, kind: "poll" }, "owner");
  save(s, d, {
    title: "Next game",
    participants: ["reader", "other"],
    slots: [
      { id: "first", ...time() },
      { id: "second", ...time("2026-11-13T20:00") },
    ],
  });
  return apply(s, id).pollId;
}
test("timezone resolver rejects invalid calendar dates and daylight saving gaps without coercion", () => {
  api();
  for (const value of [
    time("2026-02-30T12:00"),
    time("2026-03-29T02:30"),
    time("2026-03-29T02:30", "Missing/Zone"),
  ]) {
    const r = c.resolveSessionTime(value);
    assert.equal(r.valid, false);
    assert.equal(r.startsAt, null);
    assert.ok(r.errors.length);
  }
});
test("daylight saving fold requires an explicit instant and preserves both candidates", () => {
  api();
  const ambiguous = time("2026-10-25T02:30");
  let r = c.resolveSessionTime(ambiguous);
  assert.equal(r.valid, false);
  assert.equal(r.candidates.length, 2);
  assert.deepEqual(
    r.candidates.map((x) => x.startsAt),
    ["2026-10-25T00:30:00.000Z", "2026-10-25T01:30:00.000Z"],
  );
  for (const candidate of r.candidates) {
    const chosen = c.resolveSessionTime({ ...ambiguous, selectedInstant: candidate.startsAt });
    assert.equal(chosen.valid, true);
    assert.equal(chosen.startsAt, candidate.startsAt);
  }
  assert.equal(
    c.resolveSessionTime({ ...ambiguous, selectedInstant: "2026-10-25T02:30:00.000Z" }).valid,
    false,
  );
});
test("the same instant is preserved in zones whose calendar dates differ", () => {
  api();
  const a = c.resolveSessionTime(time("2026-11-13T08:00", "Pacific/Auckland")),
    b = c.resolveSessionTime(time("2026-11-12T14:00", "America/New_York"));
  assert.equal(a.valid, true);
  assert.equal(a.startsAt, b.startsAt);
});
test("direct appointment has private draft then explicit idempotent confirmation, no gameplay effect", () => {
  api();
  let s = state();
  const gameplay = JSON.stringify({ actors: s.actors, combat: s.combat });
  const d = c.createSessionDraft(s, { id: "direct", kind: "direct" }, "owner");
  save(s, d, { title: "Agreed elsewhere", ...time() });
  assert.deepEqual(c.listSessionDrafts(s, "reader"), []);
  assert.equal(c.listCampaignSessions(s, "camp", "reader").length, 0);
  const r = apply(s, d.id);
  s = JSON.parse(JSON.stringify(s));
  assert.deepEqual(c.applySessionDraft(s, d.id, { reviewKey: "retry" }, "owner"), r);
  assert.equal(s.campaign.sessions.length, 1);
  assert.equal(s.campaign.sessions[0].startsAt, "2026-11-12T19:00:00.000Z");
  assert.equal(JSON.stringify({ actors: s.actors, combat: s.combat }), gameplay);
});
test("only current organizers schedule; a revoked organizer keeps draft input but cannot confirm", () => {
  api();
  const s = state();
  assert.throws(() => c.createSessionDraft(s, { id: "denied", kind: "direct" }, "reader"));
  const d = c.createSessionDraft(s, { id: "delegated", kind: "direct" }, "organizer");
  save(s, d, { title: "My plan", ...time() }, "organizer");
  s.campaign.members.find((x) => x.id === "organizer").canOrganize = false;
  const p = c.previewSessionDraft(s, d.id, "organizer");
  assert.equal(p.canApply, false);
  assert.equal(p.draft.data.title, "My plan");
  assert.throws(() => c.applySessionDraft(s, d.id, { reviewKey: p.reviewKey }, "organizer"));
});
test("optional poll records only own responses and withdrawal; consensus does not confirm", () => {
  api();
  const s = state(),
    id = poll(s);
  let p = c.listSessionPolls(s, "camp", "reader")[0];
  assert.equal(p.responses.reader?.first ?? null, null);
  assert.equal(p.permissions.canRespond, true);
  const args = { slotId: "first", slotRevision: p.slots[0].revision, response: "yes" };
  c.setSessionAvailability(s, id, args, "reader");
  c.setSessionAvailability(s, id, args, "other");
  assert.equal(s.campaign.sessions.length, 0);
  assert.equal(c.listSessionPolls(s, "camp", "reader")[0].status, "open");
  c.setSessionAvailability(s, id, { ...args, response: null }, "reader");
  p = c.listSessionPolls(s, "camp", "reader")[0];
  assert.equal(p.responses.reader?.first ?? null, null);
  assert.equal(p.responses.other.first.response, "yes");
  assert.throws(() => c.setSessionAvailability(s, id, args, "owner"));
  assert.throws(() => c.setSessionAvailability(s, id, { ...args, slotRevision: 100 }, "reader"));
});
test("organizer confirms a particular poll option once while other confirm previews become stale", () => {
  api();
  let s = state(),
    id = poll(s);
  assert.throws(() =>
    c.createSessionDraft(s, { id: "bad", kind: "confirm", pollId: id, slotId: "first" }, "reader"),
  );
  const a = c.createSessionDraft(
      s,
      { id: "a", kind: "confirm", pollId: id, slotId: "first" },
      "owner",
    ),
    b = c.createSessionDraft(
      s,
      { id: "b", kind: "confirm", pollId: id, slotId: "second" },
      "organizer",
    );
  const before = c.previewSessionDraft(s, b.id, "organizer");
  const result = apply(s, a.id);
  assert.throws(() => c.applySessionDraft(s, b.id, { reviewKey: before.reviewKey }, "organizer"));
  s = JSON.parse(JSON.stringify(s));
  assert.deepEqual(c.applySessionDraft(s, a.id, { reviewKey: "retry" }, "owner"), result);
  assert.equal(s.campaign.sessions.length, 1);
  assert.equal(c.listSessionPolls(s, "camp", "reader")[0].confirmedSessionId, result.sessionId);
  assert.equal(c.listSessionPolls(s, "camp", "reader")[0].status, "confirmed");
});
test("changing and cancelling an appointment preserves old responses, past versions and gameplay", () => {
  api();
  const s = state(),
    id = poll(s);
  const slot = c.listSessionPolls(s, "camp", "reader")[0].slots[0];
  c.setSessionAvailability(
    s,
    id,
    { slotId: slot.id, slotRevision: slot.revision, response: "yes" },
    "reader",
  );
  let d = c.createSessionDraft(
    s,
    { id: "confirm", kind: "confirm", pollId: id, slotId: slot.id },
    "owner",
  );
  const r = apply(s, d.id);
  const beforePoll = JSON.stringify(s.campaign.polls[0].responses),
    game = JSON.stringify(s.combat);
  d = c.createSessionDraft(s, { id: "change", kind: "change", sessionId: r.sessionId }, "owner");
  save(s, d, { title: "Changed time", ...time("2026-11-15T21:30") });
  apply(s, d.id);
  assert.equal(s.campaign.sessions[0].revision, 2);
  assert.equal(JSON.stringify(s.campaign.polls[0].responses), beforePoll);
  d = c.createSessionDraft(s, { id: "cancel", kind: "cancel", sessionId: r.sessionId }, "owner");
  save(s, d, { reason: "Another date needed" });
  apply(s, d.id);
  assert.equal(s.campaign.sessions[0].status, "cancelled");
  assert.equal(s.campaign.sessions[0].history.length, 3);
  assert.equal(JSON.stringify(s.combat), game);
});
test("unscheduled played record does not invent an appointment or close combat", () => {
  api();
  const s = state(),
    d = c.createSessionDraft(s, { id: "played", kind: "played" }, "reader");
  save(s, d, { title: "" }, "reader");
  const r = apply(s, d.id, "reader");
  const session = c.listCampaignSessions(s, "camp", "reader").find((x) => x.id === r.sessionId);
  assert.equal(session.startsAt, null);
  assert.equal(session.status, "unscheduled");
  assert.equal(session.played, true);
  assert.equal(s.combat.active, true);
});
test("invalid draft input survives saving; offline shared apply and availability are blocked", () => {
  api();
  const s = state(),
    d = c.createSessionDraft(s, { id: "invalid", kind: "direct" }, "owner");
  save(s, d, { title: "Keep me", ...time("2026-02-30T02:30") });
  assert.equal(c.previewSessionDraft(s, d.id, "owner").canApply, false);
  assert.equal(c.getSessionDraft(s, d.id, "owner").data.localTime, "2026-02-30T02:30");
  const updated = c.getSessionDraft(s, d.id, "owner");
  save(s, updated, { title: "Keep me", ...time() });
  const p = c.previewSessionDraft(s, d.id, "owner");
  assert.throws(() =>
    c.applySessionDraft(s, d.id, { reviewKey: p.reviewKey }, "owner", { online: false }),
  );
  const id = poll(s);
  assert.throws(() =>
    c.setSessionAvailability(
      s,
      id,
      { slotId: "first", slotRevision: 1, response: "no" },
      "reader",
      { online: false },
    ),
  );
  assert.deepEqual(c.listCampaignSessions(s, "camp", "outsider"), []);
  assert.deepEqual(c.listSessionPolls(s, "camp", "outsider"), []);
});
test("an organizer can explicitly review a newer poll base without losing their saved confirmation draft", () => {
  api();
  const s = state(),
    pollId = poll(s),
    d = c.createSessionDraft(
      s,
      { id: "confirm-later", kind: "confirm", pollId, slotId: "first" },
      "owner",
    );
  c.setSessionAvailability(
    s,
    pollId,
    { slotId: "first", slotRevision: 1, response: "yes" },
    "reader",
  );
  const p = c.previewSessionDraft(s, d.id, "owner");
  assert.equal(p.canApply, false);
  c.saveSessionDraft(
    s,
    d.id,
    { data: d.data, baseRevision: p.current.revision, expectedDraftRevision: d.revision },
    "owner",
  );
  assert.equal(c.previewSessionDraft(s, d.id, "owner").canApply, true);
  apply(s, d.id);
});
