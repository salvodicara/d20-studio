// B59 — Public tables, group finder and moderation: domain rules on the real state and
// B13/B27 slices, registry integration with the real store (reload, gameplay Undo,
// offline), and the UI handlers (render, delegated clicks, dialogs). Synthetic data only.
import { useSampleClock } from "../sample-clock.mjs";
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createInitialState, createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc, icon } from "../ui.mjs";
import * as cm from "../campaign-members.mjs";
import * as safety from "../safety.mjs";
import * as D from "../community-domain.mjs";
import * as UI from "../community.mjs";
import * as content from "../campaign-content.mjs";

const NOW = Date.parse("2026-09-24T10:00:00.000Z");
const DAY = 24 * 3600e3;
const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
  };
};
function makeRegistry() {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  assert.equal(registry.use(cm.ID, cm.register).status, "built");
  assert.equal(registry.use("safety", safety.register).status, "built");
  assert.equal(registry.use(D.ID, UI.register).status, "built");
  return registry;
}
// The example's next session and dates follow the visit (sample-clock.mjs): pinned to NOW
// here, so these domain checks never read the real date.
function seeded() {
  useSampleClock(() => NOW);
  try {
    const state = createInitialState();
    makeRegistry().initState(state);
    return state;
  } finally {
    useSampleClock(null);
  }
}
const community = (state) => state.ext[D.ID];
const refusal = (fn, pattern) =>
  assert.throws(
    fn,
    (error) => Boolean(error.it && error.en) && (!pattern || pattern.test(error.it)),
  );
// A scheduled session for the current campaign, `days` from NOW.
// UI checks read the real clock, so they pass `from = Date.now()` (never a fixed date).
function schedule(state, days = 7, from = NOW) {
  const startsAt = new Date(from + days * DAY).toISOString();
  state.campaign.sessions = [
    {
      id: "session-test",
      title: "",
      startsAt,
      timeZone: "Europe/Rome",
      localTime: "",
      status: "scheduled",
      played: false,
      revision: 1,
      history: [],
    },
  ];
  return startsAt;
}
afterEach(() => {
  UI.resetCommunityView();
  UI.setViewerZone(null);
});

// ---------------------------------------------------------------- seed and search

test("the seed is coherent: lanterns listing live with its next session, hidden without one, strangers listed", () => {
  const state = seeded();
  const slice = community(state);
  const lanterns = slice.listings["listing-lanterns"];
  assert.equal(lanterns.campaignId, "lanterns");
  // The example's «Il sigillo della torre» is the coming Thursday: the listing is in the search.
  assert.equal(D.listingState(state, slice, lanterns, NOW), "live");
  assert.deepEqual(D.listingProblems(state, slice, lanterns, NOW), []);
  assert.ok(
    D.searchListings(state, slice, "player", {}, NOW, "Europe/Rome").rows.some(
      (row) => row.listing.id === "listing-lanterns",
    ),
  );
  // Without a next session it is hidden until one is scheduled (SVC-067).
  state.campaign.sessions = [];
  assert.equal(D.listingState(state, slice, lanterns, NOW), "hidden");
  assert.deepEqual(
    D.listingProblems(state, slice, lanterns, NOW).map((p) => p.id),
    ["session"],
  );
  assert.deepEqual(D.listingProblems(state, slice, lanterns, NOW)[0].fix, {
    page: "campaign",
    params: { tab: "sessions" },
  });
  // Players of lanterns: the "player" identity only (B13 roles); 2 of 3 seats free.
  const seats = D.seatInfo(state, slice, lanterns);
  assert.equal(seats.members, 1);
  assert.equal(seats.free, 2);
  const result = D.searchListings(state, slice, "player", {}, NOW, "Europe/Rome");
  assert.deepEqual(result.rows.map((row) => row.listing.id).sort(), [
    "listing-cripta",
    "listing-faro",
    "listing-paludi",
    "listing-salt",
  ]);
  assert.equal(result.hiddenMature, 1);
  // Sorted by next session; every row has a next occurrence in the future.
  const starts = result.rows.map((row) => row.next.startsAt);
  assert.deepEqual([...starts].sort(), starts);
  assert.ok(starts.every((value) => Date.parse(value) > NOW));
});

test("Roll20 filters: language, format, newcomers, 18+ opt-in, day and band in the viewer's zone, keyword", () => {
  const state = seeded();
  const slice = community(state);
  const ids = (filters, zone = "Europe/Rome") =>
    D.searchListings(state, slice, "player", filters, NOW, zone)
      .rows.map((row) => row.listing.id)
      .sort();
  assert.deepEqual(ids({ language: "en" }), ["listing-salt"]);
  assert.deepEqual(ids({ language: "en", mature: true }), ["listing-hymns", "listing-salt"]);
  assert.deepEqual(ids({ format: "one-shot" }), ["listing-cripta"]);
  assert.deepEqual(ids({ newcomers: true }), ["listing-cripta", "listing-lanterns"]);
  assert.deepEqual(ids({ q: "owen" }), ["listing-salt"]);
  assert.deepEqual(ids({ q: "nebbiafonda" }), ["listing-paludi"]);
  // Salt Road: Wednesday 19:30 London = 20:30 Rome (evening) on Wednesday.
  assert.deepEqual(ids({ day: "3", band: "evening" }), ["listing-salt"]);
  // Midnight Hymns: Friday 22:00 New York is Saturday 04:00 in Rome (night band).
  assert.deepEqual(ids({ mature: true, day: "6", band: "night" }), ["listing-hymns"]);
  assert.deepEqual(ids({ mature: true, day: "5", band: "evening" }, "America/New_York"), [
    "listing-hymns",
  ]);
  assert.deepEqual(ids({ band: "morning" }), []);
});

test("a scheduled session makes the listing live; more than 3 months ahead hides it again", () => {
  const state = seeded();
  const slice = community(state);
  const listing = slice.listings["listing-lanterns"];
  schedule(state, 8);
  assert.equal(D.listingState(state, slice, listing, NOW), "live");
  assert.ok(
    D.searchListings(state, slice, "player", {}, NOW, "Europe/Rome").rows.some(
      (row) => row.listing.id === "listing-lanterns",
    ),
  );
  schedule(state, D.HORIZON_DAYS + 5);
  assert.equal(D.listingState(state, slice, listing, NOW), "hidden");
  assert.deepEqual(
    D.listingProblems(state, slice, listing, NOW).map((p) => p.id),
    ["horizon"],
  );
});

// ---------------------------------------------------------------- applications

test("Kanka applications: apply with message and conduct, edit, withdraw, apply again", () => {
  const state = seeded();
  const slice = community(state);
  refusal(
    () =>
      D.applyToListing(
        state,
        slice,
        "listing-paludi",
        { message: "", conduct: true },
        "player",
        NOW,
      ),
    /messaggio/,
  );
  refusal(
    () =>
      D.applyToListing(
        state,
        slice,
        "listing-paludi",
        { message: "Ciao", conduct: false },
        "player",
        NOW,
      ),
    /codice di condotta/,
  );
  const application = D.applyToListing(
    state,
    slice,
    "listing-paludi",
    { message: "Ho giocato due campagne.", conduct: true },
    "player",
    NOW,
  );
  assert.equal(application.status, "pending");
  refusal(
    () =>
      D.applyToListing(
        state,
        slice,
        "listing-paludi",
        { message: "Di nuovo", conduct: true },
        "player",
        NOW,
      ),
    /già una candidatura aperta/,
  );
  D.editApplication(
    state,
    slice,
    application.id,
    { message: "Tengo volentieri un diario." },
    "player",
    NOW,
  );
  assert.equal(
    slice.applications.find((row) => row.id === application.id).message,
    "Tengo volentieri un diario.",
  );
  refusal(() => D.editApplication(state, slice, application.id, { message: "x" }, "dm", NOW));
  D.withdrawApplication(state, slice, application.id, "player", NOW);
  assert.equal(slice.applications.find((row) => row.id === application.id).status, "withdrawn");
  refusal(
    () => D.withdrawApplication(state, slice, application.id, "player", NOW),
    /non è più aperta/,
  );
  const again = D.applyToListing(
    state,
    slice,
    "listing-paludi",
    { message: "Riprovo.", conduct: true },
    "player",
    NOW,
  );
  assert.equal(again.status, "pending");
});

test("18+ tables ask for a declared age; members and managers cannot apply to their own table", () => {
  const state = seeded();
  const slice = community(state);
  refusal(
    () =>
      D.applyToListing(
        state,
        slice,
        "listing-hymns",
        { message: "Hi", conduct: true },
        "player",
        NOW,
      ),
    /18 anni/,
  );
  const adult = D.applyToListing(
    state,
    slice,
    "listing-hymns",
    { message: "Hi", conduct: true, adult: true },
    "player",
    NOW,
  );
  assert.equal(adult.adult, true);
  schedule(state, 8);
  const lanterns = slice.listings["listing-lanterns"];
  assert.match(D.applyBlocker(state, slice, lanterns, "player", NOW).it, /Fai già parte/);
  assert.match(D.applyBlocker(state, slice, lanterns, "dm", NOW).it, /tuo annuncio/);
});

test("Warhorn waitlist: a full table queues in arrival order, nobody reorders, leaving frees the place", () => {
  const state = seeded();
  const slice = community(state);
  const application = D.applyToListing(
    state,
    slice,
    "listing-salt",
    { message: "Wednesday works for me.", conduct: true },
    "player",
    NOW,
  );
  assert.equal(application.status, "waitlisted");
  assert.equal(D.waitlistPosition(slice, application), 3);
  assert.deepEqual(
    D.waitlist(slice, "listing-salt").map((row) => row.who),
    ["sim-ines", "sim-joel", "player"],
  );
  D.withdrawApplication(state, slice, application.id, "player", NOW);
  assert.equal(D.waitlist(slice, "listing-salt").length, 2);
  // Without a waitlist a full table refuses (Il Faro: 3 of 4 taken, no waitlist).
  slice.listings["listing-faro"].taken = 4;
  assert.equal(D.listingState(state, slice, slice.listings["listing-faro"], NOW), "hidden");
});

test("DM decisions: a simulated person joins the campaign (Kanka); full tables refuse; replies notify", () => {
  const state = seeded();
  const slice = community(state);
  refusal(() => D.decideApplication(state, slice, "app-tomas", { approve: true }, "player", NOW));
  const approved = D.decideApplication(
    state,
    slice,
    "app-tomas",
    { approve: true, reply: "Benvenuto! Venerdì ti presento il gruppo." },
    "dm",
    NOW,
  );
  assert.equal(approved.status, "approved");
  // Coherent with B13: the person is a player of the campaign (Members tab reads this).
  const member = cm.membersOf(state, "lanterns").find((row) => row.id === "sim-tomas");
  assert.deepEqual(
    { name: member.name, role: member.role, simulated: member.simulated },
    { name: "Tomas Ferri", role: "player", simulated: true },
  );
  assert.equal(cm.roleOf(state, "lanterns", "sim-tomas"), "player");
  const listing = slice.listings["listing-lanterns"];
  assert.equal(D.seatInfo(state, slice, listing).free, 1);
  // Seats 2 → full; Greta cannot be approved, only declined.
  listing.seats = 2;
  refusal(
    () => D.decideApplication(state, slice, "app-greta", { approve: true }, "dm", NOW),
    /completo/,
  );
  refusal(
    () => D.decideApplication(state, slice, "app-greta", { reply: "x".repeat(301) }, "dm", NOW),
    /300/,
  );
  const declined = D.decideApplication(
    state,
    slice,
    "app-greta",
    { approve: false, reply: "Per ora siamo al completo." },
    "dm",
    NOW,
  );
  assert.equal(declined.reply, "Per ora siamo al completo.");
  refusal(
    () => D.decideApplication(state, slice, "app-greta", { approve: true }, "dm", NOW),
    /non è più in attesa/,
  );
  // The DM's queue now has nothing waiting; the decided list keeps both.
  const queue = D.queueFor(state, slice, "listing-lanterns", "dm");
  assert.equal(queue.pending.length, 0);
  assert.deepEqual(queue.decided.map((row) => row.who).sort(), ["sim-greta", "sim-tomas"]);
});

test("waitlist head only: approving the second in line is refused until the first is decided", () => {
  const state = seeded();
  const slice = community(state);
  schedule(state, 8);
  const listing = slice.listings["listing-lanterns"];
  listing.seats = 1; // the player identity already fills it
  const queued = (id, who, at) =>
    slice.applications.push({
      id,
      listingId: listing.id,
      who,
      message: "In coda",
      status: "waitlisted",
      reply: "",
      conduct: true,
      adult: false,
      createdAt: at,
      updatedAt: at,
      decidedAt: null,
      decidedBy: null,
    });
  queued("app-w1", "sim-ines", "2026-09-20T10:00:00.000Z");
  queued("app-w2", "sim-joel", "2026-09-21T10:00:00.000Z");
  refusal(
    () => D.decideApplication(state, slice, "app-w1", { approve: true }, "dm", NOW),
    /completo/,
  );
  listing.seats = 3;
  assert.ok(D.noticesFor(state, slice, "dm", NOW).some((item) => item.key === "waitlist:app-w1"));
  refusal(
    () => D.decideApplication(state, slice, "app-w2", { approve: true }, "dm", NOW),
    /ordine d’arrivo/,
  );
  D.decideApplication(state, slice, "app-w1", { approve: true }, "dm", NOW);
  assert.equal(
    D.decideApplication(state, slice, "app-w2", { approve: true }, "dm", NOW).status,
    "approved",
  );
});

test("an identity accepted by the DM receives the B13 invitation; the seat is reserved; notices both ways", () => {
  const state = seeded();
  const slice = community(state);
  const campaignId = cm.createCampaign(
    state,
    {
      name: "Una notte a Bruma",
      description: "One-shot al porto.",
      nextLocal: "2026-10-02T21:00",
      timeZone: "Europe/Rome",
    },
    "dm",
    NOW,
  );
  const listingId = D.createListing(state, slice, campaignId, "dm", NOW);
  const listing = slice.listings[listingId];
  assert.equal(listing.status, "draft");
  assert.equal(listing.pitch, "One-shot al porto.");
  assert.equal(listing.tools.length, 0); // no safety sheet for the new campaign yet
  refusal(
    () => D.publishListing(state, slice, listingId, { conduct: true }, "dm", NOW),
    /strumento di sicurezza/,
  );
  D.saveListing(
    state,
    slice,
    listingId,
    {
      title: "Una notte a Bruma",
      pitch: "One-shot al porto.",
      language: "it",
      format: "one-shot",
      frequency: "once",
      seats: 1,
      tools: ["stop"],
      warnings: [],
      waitlist: false,
    },
    "dm",
    NOW,
  );
  refusal(() => D.publishListing(state, slice, listingId, {}, "dm", NOW), /Codice di condotta/);
  D.publishListing(state, slice, listingId, { conduct: true }, "dm", NOW);
  assert.equal(D.listingState(state, slice, listing, NOW), "live");
  const application = D.applyToListing(
    state,
    slice,
    listingId,
    { message: "Posso venire con Livia.", conduct: true },
    "player",
    NOW,
  );
  assert.ok(
    D.noticesFor(state, slice, "dm", NOW).some(
      (item) => item.key === `application:${application.id}`,
    ),
  );
  D.decideApplication(
    state,
    slice,
    application.id,
    { approve: true, reply: "Ti aspetto!" },
    "dm",
    NOW,
  );
  const stored = slice.applications.find((row) => row.id === application.id);
  const invite = cm
    .metaOf(state, campaignId)
    .directInvites.find((row) => row.id === stored.inviteId);
  assert.deepEqual(
    { to: invite.to, role: invite.role, status: invite.status },
    { to: "player", role: "player", status: "pending" },
  );
  assert.equal(D.approvalStage(state, slice, stored), "invited");
  // Reserved seat: 1 of 1 → without a waitlist the listing turns off by itself (SVC-067).
  assert.equal(D.seatInfo(state, slice, listing).reserved, 1);
  assert.equal(listing.status, "disabled");
  assert.equal(listing.disabledReason, "full");
  const notice = D.noticesFor(state, slice, "player", NOW).find((item) => item.kind === "approved");
  assert.equal(notice.reply, "Ti aspetto!");
  assert.ok(
    cm
      .incomingFor(state, "player")
      .some((item) => item.kind === "invite" && item.campaignId === campaignId),
  );
});

test("listing text rules: no off-site or payment links, bounded seats, known tools and warnings", () => {
  const state = seeded();
  const slice = community(state);
  const base = {
    title: "Le lanterne di Bruma",
    pitch: "Venite su discord.gg/bruma",
    language: "it",
    format: "campaign",
    frequency: "weekly",
    seats: 3,
    tools: ["stop"],
    warnings: [],
  };
  refusal(() => D.saveListing(state, slice, "listing-lanterns", base, "dm", NOW), /link esterni/);
  refusal(
    () =>
      D.saveListing(
        state,
        slice,
        "listing-lanterns",
        { ...base, pitch: "Ok", seats: 9 },
        "dm",
        NOW,
      ),
    /da 1 a 8/,
  );
  refusal(() =>
    D.saveListing(
      state,
      slice,
      "listing-lanterns",
      { ...base, pitch: "Ok", tools: ["x"] },
      "dm",
      NOW,
    ),
  );
  refusal(
    () => D.saveListing(state, slice, "listing-lanterns", { ...base, pitch: "Ok" }, "player", NOW),
    /Solo il DM/,
  );
  const saved = D.saveListing(
    state,
    slice,
    "listing-lanterns",
    { ...base, pitch: "Aperto a tutti.", mature: true },
    "dm",
    NOW,
  );
  assert.equal(saved.mature, true);
  assert.ok(D.hasExternalLink("paypal.me/x"));
  assert.ok(!D.hasExternalLink("Il venerdì alle 21."));
  // The B27 expectations sheet of the campaign is the source the form copies.
  const safetySheet = D.campaignSafety(state, "lanterns");
  assert.deepEqual(safetySheet.warnings, ["spiders"]);
  assert.ok(safetySheet.tools.includes("stop"));
  assert.equal(safetySheet.shared, false);
});

test("disable and enable: enable re-checks the prerequisites", () => {
  const state = seeded();
  const slice = community(state);
  state.campaign.sessions = []; // no next session: a prerequisite is missing
  D.disableListing(state, slice, "listing-lanterns", "dm", NOW);
  assert.equal(D.listingState(state, slice, slice.listings["listing-lanterns"], NOW), "disabled");
  refusal(
    () => D.publishListing(state, slice, "listing-lanterns", {}, "dm", NOW),
    /Prossima sessione/,
  );
  schedule(state, 5);
  D.publishListing(state, slice, "listing-lanterns", {}, "dm", NOW);
  assert.equal(D.listingState(state, slice, slice.listings["listing-lanterns"], NOW), "live");
});

// ---------------------------------------------------------------- moderation

// Roll20 SVC-149: a block stops private messages; LFG posts stay visible. Here the private
// contact is applications and invitations to apply, both ways; nothing is hidden or closed.
// A second published campaign whose next session is nine days after `now` (21:00 in Rome):
// NOW for the domain checks, the real clock for the UI ones.
const romeDay = (ms) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ms);
function publishedSecond(state, slice, name = "Altra", now = NOW) {
  const campaignId = cm.createCampaign(
    state,
    { name, nextLocal: `${romeDay(now + 9 * DAY)}T21:00`, timeZone: "Europe/Rome" },
    "dm",
    now,
  );
  const id = D.createListing(state, slice, campaignId, "dm", now);
  D.saveListing(
    state,
    slice,
    id,
    {
      title: name,
      pitch: "Test",
      language: "it",
      format: "campaign",
      frequency: "weekly",
      seats: 3,
      tools: ["stop"],
      warnings: [],
      waitlist: true,
    },
    "dm",
    now,
  );
  D.publishListing(state, slice, id, { conduct: true }, "dm", now);
  return id;
}
test("Roll20 block (SVC-149): listings stay visible, private contact stops both ways, unblock in place", () => {
  const state = seeded();
  const slice = community(state);
  D.blockPerson(state, slice, "player", "sim-owen", NOW);
  const result = D.searchListings(state, slice, "player", {}, NOW, "Europe/Rome");
  assert.equal(result.hiddenByBlock, undefined);
  const salt = result.rows.find((row) => row.listing.id === "listing-salt");
  assert.equal(salt.blocked, true);
  assert.equal(result.rows.find((row) => row.listing.id === "listing-paludi").blocked, false);
  // One's own block is explained, with the way out.
  assert.match(
    D.applyBlocker(state, slice, slice.listings["listing-salt"], "player", NOW).it,
    /Hai bloccato .*sbloccalo per candidarti/,
  );
  refusal(
    () =>
      D.applyToListing(
        state,
        slice,
        "listing-salt",
        { message: "Ciao", conduct: true },
        "player",
        NOW,
      ),
    /sbloccalo/,
  );
  refusal(() => D.blockPerson(state, slice, "player", "sim-owen", NOW), /già bloccato/);
  D.unblockPerson(state, slice, "player", "sim-owen", NOW);
  assert.equal(D.applyBlocker(state, slice, slice.listings["listing-salt"], "player", NOW), null);
  // The DM blocks an applicant: the open application is neither closed nor hidden; it can
  // be declined, not accepted, until unblocked. Notices keep it.
  D.blockPerson(state, slice, "dm", "sim-greta", NOW);
  const greta = slice.applications.find((row) => row.id === "app-greta");
  assert.equal(greta.status, "pending");
  const queue = D.queueFor(state, slice, "listing-lanterns", "dm");
  assert.deepEqual(
    queue.pending.map((row) => [row.who, row.blocked]),
    [
      ["sim-tomas", false],
      ["sim-greta", true],
    ],
  );
  assert.ok(D.noticesFor(state, slice, "dm", NOW).some((item) => item.from === "sim-greta"));
  refusal(
    () => D.decideApplication(state, slice, "app-greta", { approve: true }, "dm", NOW),
    /sbloccala per accettarla/,
  );
  D.unblockPerson(state, slice, "dm", "sim-greta", NOW);
  assert.equal(
    D.decideApplication(state, slice, "app-greta", { approve: true }, "dm", NOW).status,
    "approved",
  );
  // Directory rows stay listed and marked; the blocker cannot invite them.
  schedule(state, 8);
  D.blockPerson(state, slice, "dm", "sim-nadia", NOW);
  const nadia = D.directoryFor(state, slice, "dm").find((row) => row.id === "sim-nadia");
  assert.equal(nadia.blocked, true);
  refusal(
    () => D.inviteToApply(state, slice, "listing-lanterns", "sim-nadia", "dm", NOW),
    /sbloccala per invitarla/,
  );
  // The owner blocked the player: a neutral refusal that never names the block.
  const id = publishedSecond(state, slice);
  D.blockPerson(state, slice, "dm", "player", NOW);
  assert.match(
    D.applyBlocker(state, slice, slice.listings[id], "player", NOW).it,
    /non accetta la tua candidatura/,
  );
  assert.doesNotMatch(D.applyBlocker(state, slice, slice.listings[id], "player", NOW).it, /blocc/);
  D.unblockPerson(state, slice, "dm", "player", NOW);
  // The player blocked the DM: the DM's invitation is recorded (no disclosure) but never
  // reaches the player, and reaches them again once unblocked.
  D.setDirectoryEntry(
    state,
    slice,
    "player",
    { format: "any", language: "it", availability: "Sabato" },
    NOW,
  );
  D.blockPerson(state, slice, "player", "dm", NOW);
  const ask = D.inviteToApply(state, slice, id, "player", "dm", NOW);
  assert.equal(ask.status, "sent");
  assert.deepEqual(D.invitationsFor(slice, "player"), []);
  assert.ok(!D.noticesFor(state, slice, "player", NOW).some((item) => item.kind === "ask"));
  D.unblockPerson(state, slice, "player", "dm", NOW);
  assert.equal(D.invitationsFor(slice, "player").length, 1);
});

test("reports: reason required, description for Other, no duplicates, visible only to the author", () => {
  const state = seeded();
  const slice = community(state);
  refusal(
    () =>
      D.reportContent(state, slice, "player", { kind: "listing", targetId: "listing-hymns" }, NOW),
    /motivo/,
  );
  refusal(
    () =>
      D.reportContent(
        state,
        slice,
        "player",
        { kind: "listing", targetId: "listing-hymns", reason: "other" },
        NOW,
      ),
    /Descrivi/,
  );
  const report = D.reportContent(
    state,
    slice,
    "player",
    {
      kind: "listing",
      targetId: "listing-hymns",
      personId: "sim-sam",
      reason: "unmarked-mature",
      details: "",
    },
    NOW,
  );
  assert.equal(report.status, "received");
  refusal(
    () =>
      D.reportContent(
        state,
        slice,
        "player",
        { kind: "listing", targetId: "listing-hymns", reason: "unmarked-mature" },
        NOW,
      ),
    /già inviato/,
  );
  assert.equal(D.reportsBy(slice, "player").length, 1);
  assert.equal(D.reportsBy(slice, "dm").length, 0);
});

// ---------------------------------------------------------------- directory and public page

test("Roll20 player directory: opt in, opt out, invitation to apply reaches the identity", () => {
  const state = seeded();
  const slice = community(state);
  state.campaign.sessions = []; // the lanterns listing waits for a next session
  refusal(
    () =>
      D.setDirectoryEntry(
        state,
        slice,
        "player",
        { format: "any", language: "it", availability: "" },
        NOW,
      ),
    /quando puoi giocare/,
  );
  D.setDirectoryEntry(
    state,
    slice,
    "player",
    { format: "one-shot", language: "it", availability: "Sabato", intro: "Maga di 3° livello" },
    NOW,
  );
  assert.ok(D.directoryFor(state, slice, "dm").some((row) => row.id === "player"));
  // The lanterns listing is not live (no session): inviting is refused.
  refusal(
    () => D.inviteToApply(state, slice, "listing-lanterns", "sim-nadia", "dm", NOW),
    /Pubblica/,
  );
  schedule(state, 8);
  refusal(
    () => D.inviteToApply(state, slice, "listing-lanterns", "player", "dm", NOW),
    /fa già parte/,
  );
  const invitation = D.inviteToApply(state, slice, "listing-lanterns", "sim-nadia", "dm", NOW);
  assert.equal(invitation.status, "sent");
  refusal(
    () => D.inviteToApply(state, slice, "listing-lanterns", "sim-nadia", "dm", NOW),
    /già invitato/,
  );
  D.leaveDirectory(state, slice, "player", NOW);
  assert.ok(!D.directoryFor(state, slice, "dm").some((row) => row.id === "player"));
  // Invitation to an identity: a notice with the listing, dismissable.
  const other = cm.createCampaign(
    state,
    { name: "Seconda", nextLocal: "2026-10-03T21:00", timeZone: "Europe/Rome" },
    "dm",
    NOW,
  );
  const id = D.createListing(state, slice, other, "dm", NOW);
  D.saveListing(
    state,
    slice,
    id,
    {
      title: "Seconda",
      pitch: "Test",
      language: "it",
      format: "campaign",
      frequency: "weekly",
      seats: 3,
      tools: ["stop"],
      warnings: [],
      waitlist: true,
    },
    "dm",
    NOW,
  );
  D.publishListing(state, slice, id, { conduct: true }, "dm", NOW);
  D.setDirectoryEntry(
    state,
    slice,
    "player",
    { format: "any", language: "it", availability: "Sabato" },
    NOW,
  );
  const ask = D.inviteToApply(state, slice, id, "player", "dm", NOW);
  assert.ok(D.noticesFor(state, slice, "player", NOW).some((item) => item.key === `ask:${ask.id}`));
  D.applyToListing(state, slice, id, { message: "Eccomi", conduct: true }, "player", NOW);
  assert.equal(slice.invitations.find((row) => row.id === ask.id).status, "applied");
});

test("Kanka public page: off by default, warning when it would show nothing, only campaign-wide content", () => {
  const state = seeded();
  const slice = community(state);
  const eligible = D.publicEligibleEntries(state, "lanterns");
  assert.deepEqual(
    eligible.map((row) => row.id),
    ["legacy-recap-summary"],
  );
  assert.equal(D.publicPageView(state, slice, "lanterns").enabled, false);
  refusal(
    () => D.setPublicPage(state, slice, "lanterns", { enabled: true }, "player", NOW),
    /Solo il DM/,
  );
  D.setPublicPage(state, slice, "lanterns", { enabled: true, entryIds: [] }, "dm", NOW);
  assert.equal(D.publicPageEmpty(state, slice, "lanterns"), true);
  refusal(
    () =>
      D.setPublicPage(state, slice, "lanterns", { enabled: true, entryIds: ["secret"] }, "dm", NOW),
    /condivise con tutta/,
  );
  D.setPublicPage(
    state,
    slice,
    "lanterns",
    { enabled: true, entryIds: ["legacy-recap-summary"] },
    "dm",
    NOW,
  );
  assert.equal(D.publicPageEmpty(state, slice, "lanterns"), false);
  const view = D.publicPageView(state, slice, "lanterns");
  assert.equal(view.entries[0].body.includes("osservatorio"), true);
  // A section limited to the DMs never reaches the visitor; a private entry drops out.
  const entry = state.campaignContent.entries[0];
  const revision = entry.revisions.find((row) => row.id === entry.currentRevisionId);
  revision.data.sections = [
    { id: "s-open", title: "Per tutti", body: "Il faro", access: { mode: "campaign", grants: [] } },
    { id: "s-dm", title: "Segreto", body: "Il traditore", access: { mode: "dms", grants: [] } },
  ];
  assert.deepEqual(
    D.publicPageView(state, slice, "lanterns").entries[0].sections.map((s) => s.title),
    ["Per tutti"],
  );
  entry.access = { mode: "private", grants: [] };
  const hidden = D.publicPageView(state, slice, "lanterns");
  assert.equal(hidden.entries.length, 0);
  assert.equal(hidden.dropped, 1);
});

// A campaign-wide world entry written through campaign-content by `who`.
function sharedEntry(state, who, title) {
  const id = `draft-${who}-${title.length}`;
  const draft = content.createCampaignDraft(
    state,
    { id, kind: "world", campaignId: "lanterns" },
    who,
  );
  content.saveCampaignDraft(
    state,
    id,
    {
      data: { ...draft.data, title, body: `${title}: testo` },
      access: { mode: "campaign", grants: [] },
    },
    who,
  );
  const { reviewKey } = content.previewCampaignDraft(state, id, who);
  return content.applyCampaignDraft(state, id, { reviewKey }, who).entryId;
}
test("public page: a player's campaign-wide entry is never eligible; a DM's is, with its author", () => {
  const state = seeded();
  const slice = community(state);
  const livia = sharedEntry(state, "player", "Il mio passato (Livia)");
  const dm = sharedEntry(state, "dm", "La torre dell’osservatorio");
  const eligible = D.publicEligibleEntries(state, "lanterns");
  assert.ok(!eligible.some((row) => row.id === livia));
  assert.deepEqual(
    eligible.filter((row) => row.id === dm).map((row) => row.ownerId),
    ["dm"],
  );
  refusal(
    () =>
      D.setPublicPage(state, slice, "lanterns", { enabled: true, entryIds: [livia] }, "dm", NOW),
    /DM o co-DM/,
  );
  // Chosen while its author was a co-DM, dropped once they are only a player.
  const campaign = state.campaign;
  campaign.members = cm.membersOf(state, "lanterns").map((row) => ({ ...row }));
  campaign.members.find((row) => row.id === "player").role = "dm";
  assert.ok(D.publicEligibleEntries(state, "lanterns").some((row) => row.id === livia));
  D.setPublicPage(state, slice, "lanterns", { enabled: true, entryIds: [livia, dm] }, "dm", NOW);
  campaign.members.find((row) => row.id === "player").role = "player";
  const view = D.publicPageView(state, slice, "lanterns");
  assert.deepEqual(
    view.entries.map((row) => row.id),
    [dm],
  );
  assert.equal(view.dropped, 1);
});

test("Warhorn FIFO: with people waiting a newcomer queues even for a free seat; later arrivals wait", () => {
  const state = seeded();
  const slice = community(state);
  const id = publishedSecond(state, slice);
  const listing = slice.listings[id];
  listing.seats = 1;
  const at = (hours) => new Date(NOW - hours * 3600e3).toISOString();
  const row = (appId, who, status, createdAt) => ({
    id: appId,
    listingId: id,
    who,
    message: "Ciao",
    status,
    reply: "",
    conduct: true,
    adult: false,
    createdAt,
    updatedAt: createdAt,
    decidedAt: null,
    decidedBy: null,
  });
  // Marta waits (the table was full), then the DM adds a seat.
  slice.applications.push(row("app-marta", "sim-marta", "waitlisted", at(48)));
  assert.equal(D.joinsWaitlist(state, slice, listing), true);
  const mine = D.applyToListing(
    state,
    slice,
    id,
    { message: "Posso il venerdì.", conduct: true },
    "player",
    NOW,
  );
  assert.equal(mine.status, "waitlisted");
  assert.equal(D.waitlistPosition(slice, mine), 2);
  // A pending application that arrived after Marta (older data) cannot overtake her.
  slice.applications.push(row("app-late", "sim-tomas", "pending", at(24)));
  assert.equal(D.waitingAhead(slice, slice.applications.at(-1)).id, "app-marta");
  refusal(
    () => D.decideApplication(state, slice, "app-late", { approve: true }, "dm", NOW),
    /arrivato prima/,
  );
  // One who arrived before Marta keeps their place in the review.
  slice.applications.push(row("app-early", "sim-greta", "pending", at(72)));
  assert.equal(D.waitingAhead(slice, slice.applications.at(-1)), null);
  D.decideApplication(state, slice, "app-marta", { approve: true }, "dm", NOW);
  // Marta took the seat: the table is full again, the late one still cannot be accepted.
  refusal(
    () => D.decideApplication(state, slice, "app-late", { approve: true }, "dm", NOW),
    /completo|arrivato prima/,
  );
  // With nobody waiting ahead, a free seat takes a new applicant as pending.
  D.withdrawApplication(state, slice, mine.id, "player", NOW);
  listing.seats = 3;
  assert.equal(D.waitlist(slice, id).length, 0);
  assert.equal(D.joinsWaitlist(state, slice, listing), false);
});

test("B13 join record: an accepted simulated person has a join date, via and a history entry", () => {
  const state = seeded();
  const slice = community(state);
  D.decideApplication(state, slice, "app-tomas", { approve: true }, "dm", NOW);
  const meta = cm.metaOf(state, "lanterns");
  assert.deepEqual(meta.joined["sim-tomas"], { at: new Date(NOW).toISOString(), via: "app-tomas" });
  const entry = meta.audit.at(-1);
  assert.deepEqual(
    [entry.kind, entry.by, entry.data.who, entry.data.role],
    ["joined", "sim-tomas", "sim-tomas", "player"],
  );
  assert.equal(cm.memberOf(state, "lanterns", "sim-tomas").simulated, true);
  // A manager only; an identity is never admitted this way.
  refusal(() =>
    cm.admitMember(state, "lanterns", { id: "sim-greta", name: "Greta Lind" }, "player", NOW),
  );
  refusal(() => cm.admitMember(state, "lanterns", { id: "player", name: "X" }, "dm", NOW));
});

test("reports: the target must exist; a person can be reported from the directory", () => {
  const state = seeded();
  const slice = community(state);
  refusal(
    () =>
      D.reportContent(
        state,
        slice,
        "player",
        { kind: "listing", targetId: "nope", reason: "spam" },
        NOW,
      ),
    /non esiste più/,
  );
  refusal(
    () =>
      D.reportContent(
        state,
        slice,
        "player",
        { kind: "person", targetId: "player", reason: "spam" },
        NOW,
      ),
    /non esiste più/,
  );
  refusal(
    () =>
      D.reportContent(state, slice, "dm", { kind: "thread", targetId: "x", reason: "spam" }, NOW),
    /Scegli cosa/,
  );
  const report = D.reportContent(
    state,
    slice,
    "dm",
    { kind: "person", targetId: "sim-nadia", reason: "harassment" },
    NOW,
  );
  assert.equal(report.personId, "sim-nadia");
  assert.ok(
    D.reportContent(
      state,
      slice,
      "player",
      { kind: "public-page", targetId: "lanterns", reason: "spam" },
      NOW,
    ),
  );
});

test("status box: every fixable requirement links to its place, with the field to focus", () => {
  const state = seeded();
  const slice = community(state);
  const listing = slice.listings["listing-lanterns"];
  schedule(state, 8);
  Object.assign(listing, { tools: [], pitch: "Scrivici su discord.gg/bruma", seats: 1 });
  listing.waitlist = false;
  const fixes = Object.fromEntries(
    D.listingProblems(state, slice, listing, NOW).map((row) => [row.id, row.fix]),
  );
  const form = (field) => ({
    page: "campaign",
    params: { tab: "community", id: "listing" },
    field,
  });
  assert.deepEqual(fixes.tools, form("tools"));
  assert.deepEqual(fixes.links, form("pitch"));
  assert.deepEqual(fixes.full, form("seats"));
  listing.title = "";
  assert.deepEqual(
    D.listingProblems(state, slice, listing, NOW).find((row) => row.id === "text").fix,
    form("title"),
  );
  // Another campaign: the My listings tab of that campaign.
  const id = publishedSecond(state, slice);
  const other = slice.listings[id];
  other.tools = [];
  assert.deepEqual(
    D.listingProblems(state, slice, other, NOW).find((row) => row.id === "tools").fix,
    { page: "community", params: { tab: "manage-listing", id: other.campaignId }, field: "tools" },
  );
});

// ---------------------------------------------------------------- store, registry and UI

function harness({ role = "player", lang = "it" } = {}) {
  const storage = memory();
  const registry = makeRegistry();
  let store = createStore({ storage });
  registry.initState(store.state);
  store.persist();
  const toasts = [];
  const navigations = [];
  const dialogs = [];
  let renders = 0;
  const ctx = {
    role,
    lang,
    offline: false,
    view: { page: "community", id: "", tab: "" },
    get state() {
      return store.state;
    },
    esc,
    icon,
    t(it, en) {
      return this.lang === "it" ? it : en;
    },
    label(value) {
      return typeof value === "object" && value
        ? value[this.lang] || value.it || ""
        : String(value ?? "");
    },
    toast: (text, error = false) => toasts.push({ text, error }),
    navigate: (page, params = {}) => navigations.push({ page, ...params }),
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render: () => renders++,
    commit(label, mutator, options = {}) {
      if (this.offline && !options.local) {
        const it = "Sei senza rete: questa modifica condivisa non può essere applicata.";
        throw Object.assign(Error(it), {
          it,
          en: "You are offline: this shared change cannot be applied.",
        });
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
  const api = { slice: (state) => registry.slice(state, D.ID), ctx: () => ctx };
  return {
    ctx,
    api,
    registry,
    toasts,
    navigations,
    dialogs,
    renders: () => renders,
    slice: () => registry.slice(store.state, D.ID),
    reload() {
      store = createStore({ storage });
      registry.initState(store.state);
    },
    store: () => store,
  };
}
// The community slice of a commit draft (the registry keeps it under state.ext).
const registrySlice = (h, draft) => h.registry.slice(draft, D.ID);
const form = (values) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};
// Delegated handlers: a root that records listeners, a target with dataset/closest.
function mount(bind) {
  const listeners = {};
  const root = {
    addEventListener: (type, fn) => (listeners[type] = fn),
    contains: () => true,
    querySelector: () => null,
  };
  bind(root);
  const click = (dataset) => listeners.click({ target: { closest: () => ({ dataset }) } });
  return { click, listeners };
}

test("register: route, DM-only recruiting section, home widget, notices, search, commands; seed persists", () => {
  const h = harness();
  const { registry, ctx } = h;
  assert.ok(registry.get("route", "community"));
  assert.equal(
    registry.list("campaign-section", ctx).some((row) => row.id === "community"),
    false,
  );
  ctx.role = "dm";
  assert.equal(
    registry.list("campaign-section", ctx).some((row) => row.id === "community"),
    true,
  );
  assert.ok(registry.list("home-widget", ctx).some((row) => row.id === "community-home"));
  assert.ok(registry.list("command", ctx).some((row) => row.id === "community.recruit"));
  const found = registry.search(ctx, "salt");
  assert.ok(found.some((row) => row.params?.id === "listing-salt"));
  // DM notices: the two seeded applications to lanterns.
  const notices = registry
    .notifications(ctx)
    .filter((row) => String(row.id).startsWith("community-"));
  assert.equal(notices.length, 2);
  assert.deepEqual(notices[0].target, { page: "campaign", params: { tab: "community" } });
  ctx.role = "player";
  const mine = registry.notifications(ctx).filter((row) => String(row.id).startsWith("community-"));
  assert.equal(mine.length, 1);
  assert.match(mine[0].title.it, /non accettata · Il Faro Spento/);
  assert.match(mine[0].body.it, /Luca Dini: Grazie!/);
});

test("UI: apply through the dialog, reload keeps it, gameplay Undo never removes it, offline is refused", () => {
  const h = harness();
  const { ctx, api, dialogs, toasts } = h;
  UI.setViewerZone("Europe/Rome");
  ctx.view = { page: "community", tab: "listing", id: "listing-paludi" };
  const html = UI.renderCommunityPage(ctx, api);
  assert.match(html, /Le Paludi di Nebbiafonda/);
  assert.match(html, /data-community-act="apply" data-listing="listing-paludi"/);
  assert.match(html, /Annegamento e soffocamento/);
  const { click } = mount((root) => UI.bindCommunity(root, ctx, api));
  click({ communityAct: "apply", listing: "listing-paludi" });
  assert.equal(dialogs.length, 1);
  assert.match(dialogs[0].title, /Candidati · Le Paludi/);
  // Validation inside the dialog: the error is thrown back to the dialog, nothing stored.
  assert.throws(
    () => dialogs[0].options.onSubmit(form({ message: "Ciao" })),
    (e) => /codice di condotta/.test(e.it),
  );
  dialogs[0].options.onSubmit(form({ message: "Tengo un diario di viaggio.", conduct: "on" }));
  const stored = h
    .slice()
    .applications.find((row) => row.who === "player" && row.listingId === "listing-paludi");
  assert.equal(stored.status, "pending");
  assert.match(toasts.at(-1).text, /Candidatura inviata/);
  const entry = ctx.state.log.at(-1);
  assert.equal(entry.visibility, "private");
  assert.match(UI.renderCommunityPage(ctx, api), /In attesa del DM/);
  // Reload: the slice is in local storage.
  h.reload();
  assert.equal(h.slice().applications.find((row) => row.id === stored.id).status, "pending");
  // A gameplay change then Undo: the application stays (slice undo: "preserve").
  ctx.commit("Livia beve una pozione", (draft) => (draft.actors.livia.hp = 20));
  ctx.undo();
  assert.equal(ctx.state.actors.livia.hp, 18);
  assert.equal(h.slice().applications.find((row) => row.id === stored.id).status, "pending");
  // Offline: withdrawing is a shared change and is refused with the shell message.
  ctx.offline = true;
  click({ communityAct: "withdraw", application: stored.id });
  assert.throws(
    () => dialogs.at(-1).options.onSubmit(form({})),
    (e) => /senza rete/.test(e.it),
  );
  assert.equal(h.slice().applications.find((row) => row.id === stored.id).status, "pending");
  assert.match(UI.renderCommunityPage(ctx, api), /Sei offline/);
  ctx.offline = false;
  dialogs.at(-1).options.onSubmit(form({}));
  assert.equal(h.slice().applications.find((row) => row.id === stored.id).status, "withdrawn");
});

test("UI: DM decides from the recruiting section; the applicant is a member; filters and navigation", () => {
  const h = harness({ role: "dm" });
  const { ctx, api, dialogs, navigations } = h;
  ctx.view = { page: "campaign", tab: "community", id: "" };
  // Without the example's next session the status box names the missing session.
  ctx.commit("Nessuna sessione in programma", (draft) => {
    draft.campaign.sessions = [];
  });
  const html = UI.renderCampaignSection(ctx, api);
  assert.match(html, /Reclutamento/);
  assert.match(html, /Prossima sessione in programma/);
  assert.match(html, /data-community-fix-page="campaign" data-community-fix-tab="sessions"/);
  assert.match(html, /Tomas Ferri/);
  const { click } = mount((root) => UI.bindCommunity(root, ctx, api));
  click({ communityAct: "approve", application: "app-tomas" });
  assert.match(dialogs.at(-1).title, /Accetta Tomas Ferri/);
  dialogs.at(-1).options.onSubmit(form({ reply: "Benvenuto!" }));
  assert.ok(cm.membersOf(ctx.state, "lanterns").some((row) => row.id === "sim-tomas"));
  click({ communityAct: "decline", application: "app-greta" });
  dialogs.at(-1).options.onSubmit(form({ reply: "" }));
  assert.equal(h.slice().applications.find((row) => row.id === "app-greta").status, "declined");
  // The status box link goes to the campaign sessions; sub tabs stay in the section.
  click({ communityFixPage: "campaign", communityFixTab: "sessions", communityFixId: "" });
  assert.deepEqual(navigations.at(-1), { page: "campaign", tab: "sessions" });
  click({ communitySub: "public", communityBase: "campaign" });
  assert.deepEqual(navigations.at(-1), { page: "campaign", tab: "community", id: "public" });
  click({ communityOpen: "listing-lanterns" });
  assert.deepEqual(navigations.at(-1), {
    page: "community",
    tab: "listing",
    id: "listing-lanterns",
  });
  // Public page settings show the Kanka warning once enabled with nothing chosen.
  UI.perform(ctx, api, "public-page", { campaignId: "lanterns", enabled: true, entryIds: [] });
  ctx.view = { page: "campaign", tab: "community", id: "public" };
  assert.match(UI.renderCampaignSection(ctx, api), /non mostrerebbe nulla/);
  // The player never sees the manage tab and cannot read the DM queue.
  ctx.role = "player";
  ctx.view = { page: "community", tab: "manage", id: "" };
  const player = UI.renderCommunityPage(ctx, api);
  assert.doesNotMatch(player, /I miei annunci/);
  assert.doesNotMatch(player, /Tomas Ferri/);
});

test("UI: filters apply, the 18+ box reveals adult listings, block and unblock from the listing page", () => {
  const h = harness({ lang: "en" });
  const { ctx, api, dialogs } = h;
  UI.setViewerZone("Europe/London");
  ctx.view = { page: "community", tab: "", id: "" };
  let html = UI.renderCommunityPage(ctx, api);
  assert.match(html, /5 tables are looking for players/);
  assert.match(html, /1 adult listing hidden/);
  UI.viewState().filters.mature = true;
  html = UI.renderCommunityPage(ctx, api);
  assert.match(html, /Midnight Hymns/);
  assert.match(html, /your time · 22:00 in America\/New_York/);
  ctx.view = { page: "community", tab: "listing", id: "listing-hymns" };
  const { click } = mount((root) => UI.bindCommunity(root, ctx, api));
  click({ communityAct: "block", person: "sim-sam" });
  assert.match(dialogs.at(-1).title, /Block Sam Keller/);
  dialogs.at(-1).options.onSubmit(form({}));
  assert.match(UI.renderCommunityPage(ctx, api), /You blocked who published this listing/);
  click({ communityAct: "unblock", person: "sim-sam" });
  assert.equal(D.hasBlocked(h.slice(), "player", "sim-sam"), false);
  click({
    communityAct: "report",
    kind: "listing",
    target: "listing-hymns",
    person: "sim-sam",
    label: "Midnight Hymns",
  });
  dialogs.at(-1).options.onSubmit(form({ reason: "harassment", details: "" }));
  ctx.view = { page: "community", tab: "conduct", id: "" };
  html = UI.renderCommunityPage(ctx, api);
  assert.match(html, /Harassment or insults/);
  assert.match(html, /Requirement to be set for the real product/);
  // Clear filters from the empty state.
  click({ communityAct: "clear-filters" });
  assert.equal(UI.viewState().filters.mature, false);
});

test("UI: home widget counts listings and open applications; the manage tab creates a listing", () => {
  const h = harness({ role: "dm" });
  const { ctx, api } = h;
  const home = UI.renderHomeWidget(ctx, api);
  assert.match(home, /Trova un tavolo/);
  assert.match(home, /2 candidature da decidere/);
  // A second managed campaign without a listing: the manage tab offers Create.
  ctx.commit("Nuova campagna", (draft) => {
    cm.createCampaign(draft, { name: "Una notte a Bruma" }, "dm", NOW);
  });
  const second = cm
    .listCampaigns(ctx.state, "dm")
    .find((row) => row.name === "Una notte a Bruma").id;
  UI.viewState().campaign = second;
  ctx.view = { page: "community", tab: "manage", id: "" };
  const html = UI.renderCommunityPage(ctx, api);
  assert.match(html, /Una notte a Bruma non ha un annuncio/);
  const { click } = mount((root) => UI.bindCommunity(root, ctx, api));
  click({ communityAct: "create-listing", campaign: second });
  const listing = D.listingForCampaign(h.slice(), second);
  assert.equal(listing.status, "draft");
  assert.match(UI.renderCommunityPage(ctx, api), /Bozza · non pubblicato/);
});

test("draft guard: typed listing changes ask before leaving, not on the same view; discard clears", () => {
  const h = harness({ role: "dm" });
  const { ctx, api, registry, dialogs } = h;
  ctx.view = { page: "campaign", tab: "community", id: "listing" };
  const { listeners } = mount((root) => UI.bindCommunity(root, ctx, api));
  const form = { dataset: { communityForm: "listing" } };
  listeners.input({ target: { closest: () => form } });
  assert.ok(registry.pendingDraft(ctx, { page: "home" }));
  assert.ok(registry.pendingDraft(ctx, { page: "campaign", tab: "community", id: "status" }));
  assert.ok(registry.pendingDraft(ctx, null));
  assert.ok(!registry.pendingDraft(ctx, { page: "campaign", tab: "community", id: "listing" }));
  // Another identity has no draft of this one.
  ctx.role = "player";
  assert.ok(!UI.hasCommunityDraft(ctx, { page: "home" }));
  ctx.role = "dm";
  let proceeded = false;
  registry.pendingDraft(ctx, { page: "home" }).confirm(ctx, () => (proceeded = true));
  assert.match(dialogs.at(-1).title, /Modifiche non salvate/);
  dialogs.at(-1).options.onSubmit(new FormData());
  assert.equal(proceeded, true);
  assert.ok(!registry.pendingDraft(ctx, { page: "home" }));
  // The search filters are not a draft.
  listeners.input({ target: { closest: () => null } });
  assert.ok(!registry.pendingDraft(ctx, { page: "home" }));
});

// ---------------------------------------------------------------- review fixes (UI)

test("UI: an acceptance followed by a declined invitation shows it and offers Apply again", () => {
  const h = harness({ role: "dm" });
  const { ctx, api } = h;
  let listingId;
  ctx.commit("Seconda campagna", (draft) => {
    listingId = publishedSecond(draft, registrySlice(h, draft), "Seconda", Date.now());
  });
  const id = listingId;
  ctx.role = "player";
  UI.perform(ctx, api, "apply", { listingId: id, message: "Ci sono", conduct: true });
  const application = h.slice().applications.find((row) => row.listingId === id);
  ctx.role = "dm";
  UI.perform(ctx, api, "decide", { applicationId: application.id, approve: true, reply: "" });
  ctx.role = "player";
  ctx.view = { page: "community", tab: "listing", id };
  assert.match(UI.renderCommunityPage(ctx, api), /Apri l’invito/);
  const stored = h.slice().applications.find((row) => row.id === application.id);
  const campaignId = h.slice().listings[id].campaignId;
  ctx.commit("Rifiuta invito", (draft) =>
    cm.declineDirectInvite(draft, campaignId, stored.inviteId, "player", NOW),
  );
  const html = UI.renderCommunityPage(ctx, api);
  assert.match(html, /Hai rifiutato l’invito alla campagna/);
  assert.match(html, /data-community-act="apply" data-listing="[^"]+">Candidati di nuovo/);
  assert.doesNotMatch(html, /Apri l’invito/);
});

test("UI: keywords typed but not searched survive a change of another filter", () => {
  const h = harness();
  const { ctx, api } = h;
  UI.setViewerZone("Europe/Rome");
  const { listeners } = mount((root) => UI.bindCommunity(root, ctx, api));
  const filters = { dataset: { communityForm: "filters" } };
  const box = {
    name: "q",
    value: "cripta",
    closest: (selector) => (/filters/.test(selector) ? filters : null),
  };
  listeners.input({ target: box });
  // A select change re-renders the form (onChange needs a real form for FormData; the
  // browser journey covers it): the render keeps the typed text, not yet applied.
  assert.equal(UI.viewState().typedQ, "cripta");
  assert.equal(UI.viewState().filters.q, "");
  let html = UI.renderCommunityPage(ctx, api);
  assert.match(html, /name="q" value="cripta"/);
  // Search applies it; the typed copy is no longer needed.
  UI.viewState().filters.q = "cripta";
  UI.viewState().typedQ = null;
  html = UI.renderCommunityPage(ctx, api);
  assert.match(html, /name="q" value="cripta"/);
  assert.match(html, /1 tavolo cerca giocatori/);
});

test("UI: See it as others do opens the visitor's view with inactive buttons and a way back", () => {
  const h = harness({ role: "dm" });
  const { ctx, api, navigations } = h;
  schedule(ctx.state, 8, Date.now());
  ctx.view = { page: "campaign", tab: "community", id: "" };
  const status = UI.renderCampaignSection(ctx, api);
  assert.match(status, /data-community-preview="listing-lanterns"/);
  const { click } = mount((root) => UI.bindCommunity(root, ctx, api));
  click({ communityPreview: "listing-lanterns" });
  assert.deepEqual(navigations.at(-1), {
    page: "community",
    tab: "preview",
    id: "listing-lanterns",
  });
  ctx.view = { page: "community", tab: "preview", id: "listing-lanterns" };
  const html = UI.renderCommunityPage(ctx, api);
  assert.match(html, /Anteprima come visitatore/);
  assert.match(html, /data-community-manage="lanterns"/);
  // R7 SV-37: the inactive buttons say why, linked by aria-describedby.
  assert.match(
    html,
    /<button class="button primary" type="button" disabled aria-describedby="community-preview-why">Candidati<\/button>/,
  );
  assert.match(
    html,
    /type="button" disabled aria-describedby="community-preview-moderation-why">.*Segnala annuncio/,
  );
  assert.doesNotMatch(html, /È il tuo annuncio/);
  // A player never gets the preview: the ordinary page.
  ctx.role = "player";
  assert.doesNotMatch(UI.renderCommunityPage(ctx, api), /Anteprima come visitatore/);
});

test("UI: queue rows explain FIFO and blocks; directory rows report and block; public list names authors", () => {
  const h = harness({ role: "dm" });
  const { ctx, api, dialogs } = h;
  schedule(ctx.state, 8, Date.now());
  ctx.commit("Marta in coda", (draft) => {
    registrySlice(h, draft).applications.push({
      id: "app-marta",
      listingId: "listing-lanterns",
      who: "sim-marta",
      message: "In coda",
      status: "waitlisted",
      reply: "",
      conduct: true,
      adult: false,
      createdAt: "2026-09-08T08:00:00.000Z",
      updatedAt: "2026-09-08T08:00:00.000Z",
      decidedAt: null,
      decidedBy: null,
    });
  });
  ctx.view = { page: "campaign", tab: "community", id: "" };
  let html = UI.renderCampaignSection(ctx, api);
  // Tomas and Greta arrived after Marta: no Accept, the reason names her.
  assert.doesNotMatch(html, /data-community-act="approve" data-application="app-tomas"/);
  assert.match(html, /Marta Riva aspetta in lista da prima/);
  assert.match(html, /data-community-act="approve" data-application="app-marta"/);
  UI.perform(ctx, api, "block", { personId: "sim-greta" });
  html = UI.renderCampaignSection(ctx, api);
  assert.match(html, /Bloccata da te/);
  assert.match(html, /data-community-act="unblock" data-person="sim-greta"/);
  // Directory: Report and Block on every row; a blocked person stays, not invitable.
  ctx.view = { page: "campaign", tab: "community", id: "players" };
  UI.perform(ctx, api, "block", { personId: "sim-nadia" });
  html = UI.renderCampaignSection(ctx, api);
  assert.match(html, /data-community-directory-row="sim-nadia"/);
  assert.match(html, /Bloccata da te: sbloccala per invitarla/);
  assert.match(html, /data-kind="person" data-target="sim-priya"/);
  assert.match(html, /data-community-act="block" data-person="sim-priya"/);
  const { click } = mount((root) => UI.bindCommunity(root, ctx, api));
  click({
    communityAct: "report",
    kind: "person",
    target: "sim-priya",
    person: "sim-priya",
    label: "Priya Shah",
  });
  dialogs.at(-1).options.onSubmit(form({ reason: "spam", details: "" }));
  assert.equal(D.reportsBy(h.slice(), "dm")[0].personId, "sim-priya");
  // Public page settings: each eligible entry names its author.
  ctx.view = { page: "campaign", tab: "community", id: "public" };
  assert.match(UI.renderCampaignSection(ctx, api), /· di DM<\/span>/);
});

test("UI: home widget singular; the status box Fix focuses the missing field; Campaigns offers Join a game", () => {
  const h = harness({ role: "player" });
  const { ctx, api, registry } = h;
  for (const person of ["sim-owen", "sim-luca", "sim-chiara"])
    UI.perform(ctx, api, "block", { personId: person });
  // Blocking hides nothing: still five listings (the example's own is live with its session).
  assert.match(UI.renderHomeWidget(ctx, api), /5 tavoli pubblici cercano giocatori/);
  ctx.commit("Solo uno", (draft) => {
    const slice = registrySlice(h, draft);
    for (const id of ["listing-salt", "listing-paludi", "listing-faro", "listing-lanterns"])
      slice.listings[id].status = "disabled";
  });
  assert.match(UI.renderHomeWidget(ctx, api), /1 tavolo pubblico cerca giocatori/);
  ctx.lang = "en";
  assert.match(UI.renderHomeWidget(ctx, api), /1 public table is looking for players/);
  ctx.lang = "it";
  // Fix link: navigates to the listing form and focuses the field there.
  ctx.role = "dm";
  const { click } = mount((root) => UI.bindCommunity(root, ctx, api));
  click({
    communityFixPage: "campaign",
    communityFixTab: "community",
    communityFixId: "listing",
    communityFixField: "tools",
  });
  assert.deepEqual(h.navigations.at(-1), { page: "campaign", tab: "community", id: "listing" });
  assert.equal(UI.viewState().focus, '[data-community-form="listing"] [name="tools"]');
  // B13 Campaigns (My Games) shows "Trova un tavolo" while this area is registered.
  ctx.view = { page: "campaigns", tab: "", id: "" };
  assert.match(cm.renderCampaignsPage(ctx), /data-nav="community"[^>]*>.*Trova un tavolo/);
  const bare = { ...ctx, registry: undefined, state: ctx.state };
  assert.doesNotMatch(cm.renderCampaignsPage(bare), /data-nav="community"/);
  assert.equal(registry.get("route", "community", ctx).id, "community");
});

// ---------------------------------------------------------------- review round 2

// A tiny valid image as a data URL (PNG signature + IHDR start), and one of `bytes` size.
const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82];
const pngData = (bytes = 64) => {
  const raw = new Uint8Array(bytes);
  raw.set(PNG_HEAD);
  return `data:image/png;base64,${Buffer.from(raw).toString("base64")}`;
};

test("archived campaign: the status box names it, its queue stays reachable until answered", () => {
  const state = seeded();
  const slice = community(state);
  const id = publishedSecond(state, slice, "Una notte a Bruma");
  const listing = slice.listings[id];
  const cid = listing.campaignId;
  const application = D.applyToListing(
    state,
    slice,
    id,
    { message: "Posso venire?", conduct: true },
    "player",
    NOW,
  );
  // Someone already on the waitlist with a seat free: the "seat free" notice exists now.
  slice.applications.push({
    ...application,
    id: "app-waiting",
    who: "sim-marta",
    status: "waitlisted",
    createdAt: "2026-09-20T08:00:00.000Z",
  });
  assert.ok(D.noticesFor(state, slice, "dm", NOW).some((item) => item.kind === "waitlist"));
  cm.setCampaignStatus(state, cid, "archived", "dm", NOW);
  assert.equal(D.listingState(state, slice, listing, NOW), "hidden");
  const problem = D.listingProblems(state, slice, listing, NOW).find((p) => p.id === "campaign");
  assert.deepEqual(problem.fix, { page: "campaigns", params: { id: cid } });
  // Reachable from My listings while applications wait; the bell keeps only the answers due.
  assert.deepEqual(
    D.managedCampaigns(state, slice, "dm", NOW).map((row) => [row.id, row.status]),
    [
      ["lanterns", "active"],
      [cid, "archived"],
    ],
  );
  const notices = D.noticesFor(state, slice, "dm", NOW).filter((item) => item.listingId === id);
  assert.deepEqual(
    notices.map((item) => item.kind),
    ["application"],
  );
  // Nobody is accepted into an archived campaign; declining with a reply still answers.
  refusal(
    () => D.decideApplication(state, slice, application.id, { approve: true }, "dm", NOW),
    /archiviata o eliminata: ripristinala/,
  );
  D.decideApplication(
    state,
    slice,
    application.id,
    { approve: false, reply: "La campagna è in pausa." },
    "dm",
    NOW,
  );
  D.decideApplication(state, slice, "app-waiting", { approve: false }, "dm", NOW);
  assert.equal(
    D.noticesFor(state, slice, "player", NOW).find((item) => item.listingId === id).reply,
    "La campagna è in pausa.",
  );
  // Every applicant answered: the archived campaign leaves My listings.
  assert.deepEqual(
    D.managedCampaigns(state, slice, "dm", NOW).map((row) => row.id),
    ["lanterns"],
  );
  // Restored in B13: the listing is live again.
  cm.setCampaignStatus(state, cid, "active", "dm", NOW);
  assert.equal(D.listingState(state, slice, listing, NOW), "live");
  // Deleted (B13 trash): the same for its owner while an application waits.
  D.applyToListing(state, slice, id, { message: "Di nuovo", conduct: true }, "player", NOW);
  cm.setCampaignStatus(state, cid, "deleted", "dm", NOW, { confirmName: "Una notte a Bruma" });
  assert.deepEqual(
    D.managedCampaigns(state, slice, "dm", NOW).map((row) => [row.id, row.status]),
    [
      ["lanterns", "active"],
      [cid, "deleted"],
    ],
  );
});

test("UI: the bell opens the archived campaign's own queue; Fix leads to Campaigns; no Accept", () => {
  const h = harness({ role: "dm" });
  const { ctx, api, registry } = h;
  let id;
  ctx.commit("Seconda campagna", (draft) => {
    id = publishedSecond(draft, registrySlice(h, draft), "Una notte a Bruma", Date.now());
  });
  const cid = h.slice().listings[id].campaignId;
  ctx.role = "player";
  const application = UI.perform(ctx, api, "apply", {
    listingId: id,
    message: "Porto Livia.",
    conduct: true,
  });
  ctx.role = "dm";
  ctx.commit("Archivia", (draft) => cm.setCampaignStatus(draft, cid, "archived", "dm", NOW));
  const notice = registry
    .notifications(ctx)
    .find((row) => row.id === `community-application:${application.id}`);
  assert.deepEqual(notice.target, { page: "community", params: { tab: "manage", id: cid } });
  ctx.view = { page: "community", tab: "manage", id: cid };
  const html = UI.renderCommunityPage(ctx, api);
  assert.match(html, /<strong>Una notte a Bruma<\/strong>/);
  assert.match(html, /Una notte a Bruma \(archiviata\)/);
  assert.match(
    html,
    /class="is-missing">.*?Campagna attiva \(non archiviata né eliminata\).*?data-community-fix-page="campaigns"/,
  );
  assert.doesNotMatch(
    html,
    new RegExp(`data-community-act="approve" data-application="${application.id}"`),
  );
  assert.match(
    html,
    new RegExp(`data-community-act="decline" data-application="${application.id}"`),
  );
  assert.match(html, /ripristinala in Campagne per accettare/);
  ctx.view = { page: "community", tab: "manage-players", id: cid };
  assert.match(
    UI.renderCommunityPage(ctx, api),
    /La campagna non è attiva\. Ripristinala in Campagne per poter invitare/,
  );
  // A route to a campaign that is not manageable says so instead of showing another one.
  ctx.view = { page: "community", tab: "manage", id: "missing-campaign" };
  assert.match(UI.renderCommunityPage(ctx, api), /non ha più un reclutamento che puoi gestire/);
  // Home widget: the queue still to decide opens that campaign.
  assert.match(UI.renderHomeWidget(ctx, api), new RegExp(`data-community-manage="${cid}"`));
});

test("directory: a player already accepted, with the B13 invitation pending, is not invited again", () => {
  const h = harness({ role: "dm" });
  const { ctx, api } = h;
  let id;
  ctx.commit("Seconda campagna", (draft) => {
    id = publishedSecond(draft, registrySlice(h, draft), "Una notte a Bruma", Date.now());
  });
  const cid = h.slice().listings[id].campaignId;
  ctx.role = "player";
  UI.perform(ctx, api, "directory", { format: "any", language: "it", availability: "Sabato" });
  const application = UI.perform(ctx, api, "apply", {
    listingId: id,
    message: "Eccomi.",
    conduct: true,
  });
  ctx.role = "dm";
  ctx.view = { page: "community", tab: "manage-players", id: cid };
  let html = UI.renderCommunityPage(ctx, api);
  assert.match(html, /Si è già candidato: decidi nella coda/);
  UI.perform(ctx, api, "decide", { applicationId: application.id, approve: true });
  html = UI.renderCommunityPage(ctx, api);
  const row = html.match(/data-community-directory-row="player".*?<\/li>/s)[0];
  assert.match(row, /Già accettato: invito alla campagna in attesa/);
  assert.doesNotMatch(row, /data-community-act="invite-apply"/);
  assert.throws(
    () => UI.perform(ctx, api, "invite-apply", { listingId: id, personId: "player" }),
    (error) => /già stata accettata/.test(error.it),
  );
  assert.equal(h.slice().invitations.filter((row) => row.to === "player").length, 0);
});

test("status badge: turned off when full, it says a seat is free again after a B13 removal", () => {
  const h = harness({ role: "dm" });
  const { ctx, api } = h;
  schedule(ctx.state, 8, Date.now());
  ctx.commit("Senza lista d’attesa", (draft) => {
    registrySlice(h, draft).listings["listing-lanterns"].waitlist = false;
  });
  UI.perform(ctx, api, "decide", { applicationId: "app-tomas", approve: true });
  UI.perform(ctx, api, "decide", { applicationId: "app-greta", approve: true });
  assert.equal(h.slice().listings["listing-lanterns"].disabledReason, "full");
  ctx.view = { page: "campaign", tab: "community", id: "" };
  assert.match(UI.renderCampaignSection(ctx, api), /Disattivato da solo: tavolo completo/);
  ctx.commit("Espelli Tomas", (draft) =>
    cm.removeMember(draft, "lanterns", "sim-tomas", { reason: "" }, "dm", NOW),
  );
  const html = UI.renderCampaignSection(ctx, api);
  assert.doesNotMatch(html, /tavolo completo/);
  assert.match(html, /si è liberato un posto: riattivalo/);
  assert.match(html, /2 di 3|1 posto libero su 3/);
  UI.perform(ctx, api, "publish", { listingId: "listing-lanterns" });
  assert.equal(h.slice().listings["listing-lanterns"].status, "live");
});

test("EN waitlist position uses #n, never an Italian ordinal", () => {
  const h = harness({ role: "player", lang: "en" });
  const { ctx, api } = h;
  UI.perform(ctx, api, "apply", {
    listingId: "listing-salt",
    message: "Happy to wait.",
    conduct: true,
  });
  ctx.view = { page: "community", tab: "mine", id: "" };
  const html = UI.renderCommunityPage(ctx, api);
  assert.match(html, /On the waitlist · #3/);
  assert.doesNotMatch(html, /\d°/);
  ctx.lang = "it";
  assert.match(UI.renderCommunityPage(ctx, api), /In lista d’attesa · 3°/);
});

test("public page prose: line breaks kept and @Embed markers rendered as on the campaign page", async () => {
  const embeds = await import("../text-embeds.mjs");
  embeds.registerTextEmbed({
    id: "b59-test",
    accepts: (ref) => ref === "srd-test:wolf",
    render: () => "<p>Blocco del lupo</p>",
  });
  try {
    const h = harness({ role: "dm" });
    const { ctx, api } = h;
    let entryId;
    ctx.commit("Voce del DM", (draft) => {
      const draftId = "draft-embed";
      const created = content.createCampaignDraft(
        draft,
        { id: draftId, kind: "world", campaignId: "lanterns" },
        "dm",
      );
      content.saveCampaignDraft(
        draft,
        draftId,
        {
          data: {
            ...created.data,
            title: "Il bosco",
            body: "Prima riga\nSeconda riga\n@Embed[srd-test:wolf]",
          },
          access: { mode: "campaign", grants: [] },
        },
        "dm",
      );
      const { reviewKey } = content.previewCampaignDraft(draft, draftId, "dm");
      entryId = content.applyCampaignDraft(draft, draftId, { reviewKey }, "dm").entryId;
    });
    UI.perform(ctx, api, "public-page", {
      campaignId: "lanterns",
      enabled: true,
      entryIds: [entryId],
    });
    ctx.role = "player";
    ctx.view = { page: "community", tab: "public", id: "lanterns" };
    const html = UI.renderCommunityPage(ctx, api);
    assert.match(
      html,
      /<div class="campaign-prose">Prima riga\nSeconda riga\n<div class="text-embed" data-text-embed="b59-test"/,
    );
    assert.match(html, /Blocco del lupo/);
    assert.doesNotMatch(html, /@Embed\[/);
  } finally {
    embeds.unregisterTextEmbed("b59-test");
  }
});

test("reports keep an optional screenshot checked like a media upload, within a budget", () => {
  const state = seeded();
  const slice = community(state);
  const base = { kind: "listing", targetId: "listing-salt", reason: "spam" };
  const report = D.reportContent(
    state,
    slice,
    "player",
    { ...base, screenshot: { src: pngData(), name: "annuncio.png" } },
    NOW,
  );
  assert.equal(report.screenshot.name, "annuncio.png");
  assert.match(report.screenshot.src, /^data:image\/png;base64,/);
  // Wrong type, content that does not match the type, or too large: refused, nothing stored.
  const refused = (screenshot, pattern = /PNG, JPEG o WebP di massimo 500 KB/, reason = "links") =>
    refusal(
      () => D.reportContent(state, slice, "player", { ...base, reason, screenshot }, NOW),
      pattern,
    );
  refused({ src: "data:text/html;base64,PGI+", name: "x.html" });
  refused({ src: pngData().replace("image/png", "image/jpeg"), name: "x.jpg" });
  refused({ src: pngData(D.LIMITS.screenshot + 1), name: "big.png" });
  // All report images of this browser together stay within the budget.
  D.reportContent(
    state,
    slice,
    "player",
    {
      ...base,
      reason: "links",
      screenshot: { src: pngData(D.LIMITS.screenshots - 100), name: "b.png" },
    },
    NOW,
  );
  refused({ src: pngData(), name: "c.png" }, /superano i 500 KB in tutto/, "safety");
  assert.equal(D.reportsBy(slice, "player").length, 2);
  // Without an image the report works as before.
  assert.equal(
    D.reportContent(state, slice, "player", { ...base, reason: "harassment" }, NOW).screenshot,
    undefined,
  );
});

test("UI: the report dialog offers the screenshot; My reports shows it only to its author", () => {
  const h = harness({ role: "player" });
  const { ctx, api, dialogs } = h;
  const { click } = mount((root) => UI.bindCommunity(root, ctx, api));
  click({ communityAct: "report", kind: "listing", target: "listing-salt", label: "Salt Road" });
  const dialog = dialogs.at(-1);
  assert.match(
    dialog.body,
    /type="file" name="screenshot" accept="image\/png,image\/jpeg,image\/webp"/,
  );
  assert.match(dialog.body, /Screenshot \(facoltativo/);
  dialog.options.onSubmit(form({ reason: "spam", details: "" }));
  UI.perform(ctx, api, "report", {
    kind: "listing",
    targetId: "listing-faro",
    reason: "links",
    screenshot: { src: pngData(), name: "faro.png" },
  });
  ctx.view = { page: "community", tab: "conduct", id: "" };
  const html = UI.renderCommunityPage(ctx, api);
  assert.match(html, /<img src="data:image\/png;base64,[^"]+" alt="Screenshot allegato: faro.png"/);
  ctx.role = "dm";
  assert.doesNotMatch(UI.renderCommunityPage(ctx, api), /faro\.png/);
});
