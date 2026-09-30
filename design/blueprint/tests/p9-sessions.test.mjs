// P9 — sessions and recaps (CA-43, CA-21, SV-44): availability totals with the best date
// (Rallly, when2meet), answers carried into the session's RSVPs, the automatic recap draft
// and the assistant's recap from play events only. Pure domain functions, synthetic data.
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import * as S from "../campaign-sessions.mjs";
import * as SP from "../sessions-plus-domain.mjs";
import * as A from "../assistant-domain.mjs";

const inDays = (n) => new Date(Date.now() + n * 86400e3);
const local = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T21:00`;
function pollState() {
  const state = createInitialState();
  const draft = S.createSessionDraft(state, { id: "p1", kind: "poll" }, "dm");
  S.saveSessionDraft(
    state,
    "p1",
    {
      data: {
        title: "Serata",
        participants: ["player", "dm"],
        slots: [
          { id: "a", localTime: local(inDays(3)), timeZone: "Europe/Rome", selectedInstant: null },
          { id: "b", localTime: local(inDays(4)), timeZone: "Europe/Rome", selectedInstant: null },
        ],
      },
      expectedDraftRevision: draft.revision,
    },
    "dm",
  );
  const preview = S.previewSessionDraft(state, "p1", "dm");
  assert.ok(preview.canApply, JSON.stringify(preview.errors));
  const { pollId } = S.applySessionDraft(state, "p1", { reviewKey: preview.reviewKey }, "dm");
  return { state, pollId };
}
const answer = (state, pollId, who, slotId, response) => {
  const poll = S.listSessionPolls(state, state.campaign.id, who).find((row) => row.id === pollId);
  const slot = poll.slots.find((row) => row.id === slotId);
  S.setSessionAvailability(state, pollId, { slotId, slotRevision: slot.revision, response }, who);
};

test("availability totals per date and the best date: «Disponibile» first, «Se necessario» breaks ties (CA-43)", () => {
  const { state, pollId } = pollState();
  let poll = state.campaign.polls[0];
  assert.deepEqual(S.pollSummary(poll).best, [], "no answers: no best date");
  answer(state, pollId, "player", "a", "yes");
  answer(state, pollId, "player", "b", "maybe");
  answer(state, pollId, "dm", "b", "yes");
  poll = state.campaign.polls[0];
  let summary = S.pollSummary(poll);
  assert.deepEqual(
    summary.slots.map(({ id, yes, maybe, no, none }) => [id, yes, maybe, no, none]),
    [
      ["a", 1, 0, 0, 1],
      ["b", 1, 1, 0, 0],
    ],
  );
  assert.deepEqual(summary.best, ["b"], "a tie on «Disponibile» is broken by «Se necessario»");
  answer(state, pollId, "dm", "a", "yes");
  summary = S.pollSummary(state.campaign.polls[0]);
  assert.deepEqual(summary.best, ["a"]);
  assert.equal(summary.slots.find((row) => row.id === "a").best, true);
});

test("confirming a date carries each answer into the session's RSVP until the date moves (CA-43)", () => {
  const { state, pollId } = pollState();
  answer(state, pollId, "player", "a", "yes");
  const draft = S.createSessionDraft(state, { id: "c1", kind: "confirm", pollId, slotId: "a" }, "dm");
  const preview = S.previewSessionDraft(state, draft.id, "dm");
  const { sessionId } = S.applySessionDraft(state, draft.id, { reviewKey: preview.reviewKey }, "dm");
  const session = state.campaign.sessions.find((row) => row.id === sessionId);
  assert.deepEqual(session.pollAnswers, { player: "yes" });
  const carried = SP.answerOf(state, session, "player");
  assert.equal(carried.status, "attending");
  assert.equal(carried.fromPoll, true);
  assert.equal(SP.seatCounts(state, sessionId).attending, 1);
  // A moved date asks again (the carried answer lapses).
  session.startsAt = new Date(Date.parse(session.startsAt) + 3600e3).toISOString();
  assert.equal(SP.answerOf(state, session, "player").status, null);
});

test("administrative and system events are not play (CA-21, SV-44)", () => {
  const entry = (label, extra = {}) => ({ kind: "change", label, visibility: "shared", ...extra });
  for (const label of [
    "Impostazione aggiornata: Tema",
    "Discord collegato",
    "Moduli delle integrazioni salvati",
    "Preferenze proposte a un giocatore",
    "Eliminazione dell’account programmata",
    "Bozza privata salvata",
    "Integrazioni · Relay salvato",
  ])
    assert.equal(S.isPlayEvent(entry(label)), false, label);
  for (const label of ["Livia attacca il goblin", "Riposo breve completato", "Danno 7 a Goblin"])
    assert.equal(S.isPlayEvent(entry(label)), true, label);
  assert.equal(S.isPlayEvent(entry("Livia attacca", { visibility: "private" })), false);
});

test("«Prepara bozza automatica»: attendance, duration, scenes and play events only (CA-21)", () => {
  const state = createInitialState();
  const start = Date.now() - 3 * 3600e3;
  state.campaign.sessions = [
    {
      id: "s1",
      title: "La torre",
      status: "scheduled",
      revision: 1,
      startsAt: new Date(start).toISOString(),
      timeZone: "Europe/Rome",
      localTime: "2026-09-25T20:00",
    },
  ];
  state.ext = {
    "session-view": {
      sessions: [
        {
          id: "t1",
          number: 3,
          status: "ended",
          campaignSessionId: "s1",
          startedAt: start,
          endedAt: start + 2 * 3600e3,
          pauses: [{ from: start + 3600e3, to: start + 3600e3 + 10 * 60e3 }],
          scenes: [{ sceneId: "old-watch", name: "Il cortile", from: start, to: start + 2 * 3600e3 }],
          presence: [{ memberId: "player", status: "here", at: start }],
        },
      ],
    },
  };
  state.log = [
    { id: "l1", kind: "change", visibility: "shared", label: "Livia attacca il goblin", time: new Date(start + 600e3).toISOString() },
    { id: "l2", kind: "change", visibility: "shared", label: "Impostazione aggiornata: Tema", time: new Date(start + 700e3).toISOString() },
    { id: "l3", kind: "change", visibility: "shared", label: "Riposo breve completato", time: new Date(start + 5 * 3600e3).toISOString() },
  ];
  const draft = S.autoRecap(state, { sessionId: "s1" }, "dm", "it");
  assert.equal(draft.title, "Resoconto: La torre");
  assert.match(draft.body, /Presenze: Giocatore: presente/);
  assert.match(draft.body, /Durata: 2 h 00 min, di cui in pausa 10 min/);
  assert.match(draft.body, /Scene: Il cortile \(2 h 00 min\)/);
  assert.match(draft.body, /- Livia attacca il goblin/);
  assert.doesNotMatch(draft.body, /Impostazione/);
  assert.doesNotMatch(draft.body, /Riposo breve/, "outside the evening");
  const en = S.autoRecap(state, { sessionId: "s1" }, "dm", "en");
  assert.match(en.body, /Attendance: Player: present/);
});

test("the assistant's recap never reads settings or integrations; a day without play says so (SV-44)", () => {
  const state = createInitialState();
  const slice = A.seedAssistant();
  A.enableAssistant(state, slice, "dm");
  A.giveConsent(state, slice, "player");
  const at = (h) => `2026-09-17T${String(h).padStart(2, "0")}:00:00.000Z`;
  state.log = [
    { id: "x1", kind: "change", visibility: "shared", controller: "player", label: "Impostazione aggiornata: Tema", time: at(9) },
    { id: "x2", kind: "change", visibility: "shared", controller: "dm", label: "Moduli delle integrazioni salvati", time: at(10) },
    { id: "x3", kind: "change", visibility: "shared", controller: "dm", label: "Preferenze proposte a un giocatore", time: at(11) },
  ];
  const windows = A.recapWindows(state, slice, "dm");
  assert.ok(!windows.some((row) => row.id === "day:2026-09-17"), JSON.stringify(windows));
  assert.throws(
    () => A.createReview(state, slice, "dm", { windowId: "all" }),
    (error) => /Nessun evento di gioco/.test(error.it) && /No play event/.test(error.en),
  );
  state.log.push({ id: "x4", kind: "change", visibility: "shared", controller: "player", label: "Livia attacca la sentinella", time: at(20) });
  const review = A.createReview(state, slice, "dm", { windowId: "day:2026-09-17", id: "r1" });
  assert.deepEqual(review.sources.map((row) => row.key), ["log:x4"]);
  assert.match(review.summary.text, /Livia attacca la sentinella \[1\]/);
  assert.ok(!review.entities.some((row) => /Moduli|Preferenze/.test(row.name?.it ?? row.name)));
});
