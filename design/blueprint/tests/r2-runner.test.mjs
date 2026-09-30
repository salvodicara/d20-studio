// R2 CA-57 part (C3, Owlbear GM hand-off) — the member the DM hands the session to creates
// roll requests and reads the session's DM-only roll lines and hidden rolls; a player who
// does not run the session is refused, and identity-private data (the DM's own lines, a
// personal sheet's rolls, drafts) stays with its owner. Synthetic data only.
import test, { afterEach, before } from "node:test";
import assert from "node:assert/strict";
import { createStore, createInitialState } from "../state.mjs";
import * as chatDomain from "../chat-domain.mjs";
import * as domain from "../dice-tray-domain.mjs";
import * as tray from "../dice-tray.mjs";
import * as dice3d from "../dice-3d.mjs";
import * as requests from "../roll-requests.mjs";
import { trayHarness, scripted, plain, click } from "./r2-harness.mjs";

before(() => chatDomain.disclosureReady);
afterEach(() => {
  tray.resetTrayUI();
  dice3d.clearDice();
  dice3d.resetDiceUI();
});
const handOver = (state, to = "player") => {
  state.ext ??= {};
  state.ext["campaign-members"] ??= { campaigns: {} };
  state.ext["campaign-members"].campaigns ??= {};
  state.ext["campaign-members"].campaigns[state.campaign.id] = {
    ...(state.ext["campaign-members"].campaigns[state.campaign.id] ?? {}),
    handover: { to },
  };
};
const saveDex13 = { kind: "save", ability: "dex", dc: 13, actorIds: ["livia", "goblin-1"] };

test("C3: a player refused; the session runner asks rolls, closes and reopens the card", () => {
  const s = createInitialState();
  assert.equal(chatDomain.runsSessionFor(s, "player"), false);
  assert.throws(() => requests.createRequest(s, saveDex13, "player", { id: "g0" }), /Only the DM/);
  handOver(s);
  assert.equal(chatDomain.runsSessionFor(s, "player"), true);
  assert.equal(chatDomain.runsSessionFor(s, "spectator"), false);
  const { attemptIds } = requests.createRequest(s, saveDex13, "player", { id: "g1", now: "t0" });
  assert.equal(attemptIds.length, 2);
  const meta = s.combatAttempts[0].rollRequest;
  assert.equal(meta.requestedBy, "player", "the card remembers who asked");
  requests.closeRequest({}, "g1", "player", s);
  assert.equal(s.combatAttempts[0].rollRequest.closed, true);
  requests.reopenRequest({}, "g1", "player", s);
  assert.equal(s.combatAttempts[0].rollRequest.closed, false);
  // Without the state (no way to check the hand-off) the player is refused.
  assert.throws(() => requests.closeRequest({}, "g1", "player"), /Only the DM/);
});

test("C3: the runner reads a DM creature's answer and its true name; others do not", () => {
  const s = createInitialState();
  requests.createRequest(s, saveDex13, "dm", { id: "g1", now: "t0" });
  const goblin = s.combatAttempts.find((a) => a.actorId === "goblin-1");
  requests.answerRequest(s, goblin.id, goblin.requests[0].id, [4], "dm", { mode: "digital" });
  const row = (role) =>
    requests.requestGroups(s, null, role)[0].rows.find((r) => r.actorId === "goblin-1");
  assert.deepEqual([row("player").readable, row("player").total], [false, null]);
  handOver(s);
  assert.equal(row("player").readable, true, "the session's hidden roll");
  assert.equal(row("player").total, goblin.requests[0].total);
  assert.equal(row("player").canRoll, false, "reading is not rolling for the DM's creature");
});

test("C3: in the log the runner reads the DM's hidden session rolls, never the DM's own lines", () => {
  const values = new Map();
  const store = createStore({
    storage: { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) },
  });
  store.commit(
    "Richiesta del DM",
    (draft) => requests.createRequest(draft, saveDex13, "dm", { id: "g1", now: "t0" }),
    "dm",
  );
  const goblin = store.state.combatAttempts.find((a) => a.actorId === "goblin-1");
  store.commit(
    "Sentinella · Tiro salvezza su Destrezza: [4] + 1 = 5 · fallimento",
    (draft) =>
      requests.answerRequest(draft, goblin.id, goblin.requests[0].id, [4], "dm", {
        mode: "digital",
      }),
    "dm",
    { visibility: "private" },
  );
  // The DM's own private lines: a private note, a personal roll (local, no session roll).
  store.commit("Nota privata del DM: il traditore è Doran", () => {}, "dm", {
    visibility: "private",
  });
  store.commit("Solo per me · DM · 1d20: [17] = 17", () => {}, "dm", { shared: false });
  const labels = (role) =>
    chatDomain
      .projectLog(store.state, role, { lang: "it" })
      .flatMap((i) => [i.label ?? "", ...(i.rolls ?? []).map((r) => `${r.actorName}:${r.total}`)]);
  const before = labels("player").join("|");
  assert.doesNotMatch(before, /Sentinella/, "a player reads no hidden roll");
  const next = structuredClone(store.state);
  handOver(next);
  const runner = chatDomain
    .projectLog(next, "player", { lang: "it" })
    .flatMap((i) => [i.label ?? "", ...(i.rolls ?? []).map((r) => `${r.actorName}:${r.total}`)])
    .join("|");
  assert.match(runner, /Sentinella · Tiro salvezza su Destrezza: \[4\]/);
  assert.match(runner, /Sentinella:\d+/);
  assert.doesNotMatch(runner, /traditore/, "the DM's private note stays the DM's");
  assert.doesNotMatch(runner, /Solo per me/, "the DM's personal roll stays the DM's");
});

test("C3: the runner reads rolls sent to the DM (blind, «Io e il DM»), not the DM's own", () => {
  const s = createInitialState();
  const slice = domain.seedSlice();
  const draw = scripted(12, 8, 15);
  const blind = domain.recordRoll(slice, s, { formula: "1d20", audience: "blind" }, "player", {
    draw,
  });
  const dmSelf = domain.recordRoll(slice, s, { formula: "1d20", audience: "self" }, "dm", { draw });
  const gm = domain.recordRoll(slice, s, { formula: "1d20", audience: "gm" }, "player", { draw });
  assert.equal(domain.canSeeResult(blind, "player", s), false);
  handOver(s);
  assert.equal(domain.canSeeResult(blind, "player", s), true);
  assert.equal(domain.canSeeResult(gm, "player", s), true);
  assert.equal(domain.canSeeResult(dmSelf, "player", s), false, "the DM's own hidden roll");
});

test("C3: the runner's Dice › Requests has the request form; sending asks the roll", () => {
  const h = trayHarness({ die: scripted(10) });
  h.section("requests");
  assert.doesNotMatch(plain(h.ctx.html), /Chiedi un tiro/);
  h.store.commit("Ruolo di DM ceduto", (draft) => handOver(draft), "dm");
  h.ctx.render();
  assert.match(plain(h.ctx.html), /Chiedi un tiro/);
  h.ctx.root.querySelector("[data-dtray-request-form]").onsubmit({ preventDefault() {} });
  const attempts = h.store.state.combatAttempts.filter((a) => a.kind === "roll-request");
  assert.ok(attempts.length >= 1, "the runner's request is queued");
  assert.equal(attempts[0].rollRequest.requestedBy, "player");
  assert.match(h.store.state.log.at(-1).label, /^Richiesta del DM: /);
  click(h.ctx.root, "[data-dtray-request-close]");
  assert.equal(
    h.store.state.combatAttempts.find((a) => a.kind === "roll-request").rollRequest.closed,
    true,
  );
});
