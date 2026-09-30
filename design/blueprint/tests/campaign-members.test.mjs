// B13 — Campaigns: creation, invitations, joining and members. Domain commands, the
// registry integration, the real store (Undo, persistence) and the UI handlers.
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState, createStore } from "../state.mjs";
import { esc, icon } from "../ui.mjs";
import { createRegistry } from "../registry.mjs";
import { canControlActor, canViewActor, connectCharacterToCampaign } from "../character-access.mjs";
import { readFileSync } from "node:fs";
import { getCampaignHub, canOrganizeSessions } from "../campaign-content.mjs";
import * as cm from "../campaign-members.mjs";

const NOW = Date.parse("2026-09-24T10:00:00.000Z");
const HOUR = 3600 * 1000;
const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
  };
};
function makeRegistry() {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  registry.use(cm.ID, cm.register);
  return registry;
}
function seeded() {
  const state = createInitialState();
  makeRegistry().initState(state);
  return state;
}
const slice = (state) => state.ext[cm.ID];
function withCampaign(extra = {}) {
  const state = seeded();
  const id = cm.createCampaign(
    state,
    {
      name: "Rovine di Vetro",
      description: "Una città di vetro nero.",
      tags: "vetro, 2024",
      nextLocal: "2026-10-01T20:30",
      timeZone: "Europe/Rome",
      sceneName: "Scena iniziale",
      ...extra,
    },
    "dm",
    NOW,
  );
  return { state, id };
}
const refusal = (fn, pattern) =>
  assert.throws(
    fn,
    (error) => Boolean(error.it && error.en) && (!pattern || pattern.test(error.it)),
  );

test("register adds the campaigns page, the Members section, a home box, notices, search and a command", () => {
  const registry = makeRegistry();
  assert.equal(registry.report().failed.length, 0);
  const route = registry.get("route", "campaigns");
  assert.equal(route.replaces, true);
  assert.ok(registry.get("campaign-section", cm.ID));
  assert.ok(registry.get("home-widget", `${cm.ID}-home`));
  assert.ok(registry.get("notifications", `${cm.ID}-inbox`));
  assert.ok(registry.get("search", `${cm.ID}-search`));
  assert.ok(registry.get("command", `${cm.ID}.create`));
  const state = createInitialState();
  registry.initState(state);
  assert.deepEqual(Object.keys(slice(state).campaigns), ["lanterns"]);
  assert.equal(slice(state).campaigns.lanterns.ownerId, "dm");
  // Normalization is idempotent and refuses data from a newer version.
  assert.deepEqual(cm.normalizeSlice(structuredClone(slice(state)), 1), slice(state));
  assert.throws(() => cm.normalizeSlice(slice(state), 2));
  assert.deepEqual(Object.keys(cm.normalizeSlice(null, 0).campaigns), ["lanterns"]);
});

test("Create World: validation, a parked second campaign with scene and next session, lanterns intact", () => {
  const state = seeded();
  const lanterns = structuredClone({ campaign: state.campaign, scenes: state.scenes });
  refusal(() => cm.createCampaign(state, { name: "  " }, "dm", NOW), /nome/);
  refusal(
    () => cm.createCampaign(state, { name: "X", image: "data:text/plain;base64,AAAA" }, "dm", NOW),
    /PNG/,
  );
  refusal(
    () =>
      cm.createCampaign(
        state,
        { name: "X", nextLocal: "2026-01-01T20:00", timeZone: "Europe/Rome" },
        "dm",
        NOW,
      ),
    /futuro/,
  );
  refusal(() =>
    cm.createCampaign(
      state,
      { name: "X", nextLocal: "2026-12-01T20:00", timeZone: "Mars/Olympus" },
      "dm",
      NOW,
    ),
  );
  refusal(
    () => cm.createCampaign(state, { name: "X", tags: "a,b,c,d,e,f,g,h,i" }, "dm", NOW),
    /etichette/,
  );
  const image = "data:image/png;base64,iVBORw0KGgo=";
  const id = cm.createCampaign(
    state,
    {
      name: "Rovine di Vetro",
      image,
      tags: "vetro, 2024, vetro",
      nextLocal: "2026-10-01T20:30",
      timeZone: "Europe/Rome",
    },
    "dm",
    NOW,
  );
  const parked = slice(state).parked[id];
  assert.equal(parked.campaign.name, "Rovine di Vetro");
  assert.deepEqual(parked.campaign.members, [
    { id: "dm", name: "DM", role: "dm", canOrganize: true },
  ]);
  assert.equal(parked.scenes.length, 1);
  assert.equal(parked.scenes[0].tokens.length, 0);
  assert.equal(parked.activeSceneId, parked.scenes[0].id);
  assert.equal(parked.campaign.sessions[0].startsAt, "2026-10-01T18:30:00.000Z");
  assert.equal(parked.campaign.sessions[0].timeZone, "Europe/Rome");
  const meta = slice(state).campaigns[id];
  assert.deepEqual(meta.tags, ["vetro", "2024"]);
  assert.equal(meta.image, image);
  assert.equal(meta.rules.edition, "2024");
  assert.equal(meta.rules.srd, "5.2.1");
  // Lanterns stays the current campaign and its legacy members are now explicit.
  assert.deepEqual({ campaign: state.campaign, scenes: state.scenes }, lanterns);
  for (const actor of ["livia", "doran", "goblin-1", "goblin-2"])
    assert.deepEqual(state.actors[actor].campaignIds, ["lanterns"], actor);
  const dm = cm.listCampaigns(state, "dm", {}, NOW);
  assert.deepEqual(
    dm.map((row) => [row.name, row.role, row.current]),
    [
      ["Le lanterne di Bruma", "owner", true],
      ["Rovine di Vetro", "owner", false],
    ],
  );
  assert.equal(dm[1].nextSession.startsAt, "2026-10-01T18:30:00.000Z");
  assert.deepEqual(
    cm.listCampaigns(state, "player", {}, NOW).map((row) => row.name),
    ["Le lanterne di Bruma"],
  );
});

test("Launch swaps the current campaign for Home, Campaign and Table and back without loss", () => {
  const { state, id } = withCampaign();
  state.log = [{ id: "l1", label: "Movimento confermato", controller: "dm", visibility: "shared" }];
  const lanterns = structuredClone({
    campaign: state.campaign,
    scenes: state.scenes,
    activeSceneId: state.activeSceneId,
    combat: state.combat,
    log: state.log,
  });
  refusal(() => cm.launchCampaign(state, id, "player", NOW), /Non fai parte/);
  const result = cm.launchCampaign(state, id, "dm", NOW);
  assert.deepEqual(result, { switched: true, from: "lanterns", to: id });
  // The shell finishes the launch after the commit (app.mjs afterCommit).
  assert.equal(cm.completeLaunch(state), true);
  assert.deepEqual(state.log, [], "the launched campaign has its own, empty log");
  assert.equal(state.campaign.id, id);
  assert.equal(state.scenes[0].name, "Scena iniziale");
  assert.equal(getCampaignHub(state, id, "dm").campaign.name, "Rovine di Vetro");
  assert.equal(
    getCampaignHub(state, id, "dm", NOW).upcomingSession.startsAt,
    "2026-10-01T18:30:00.000Z",
  );
  // The player is not a member of the current campaign: the hub is closed to them.
  assert.equal(getCampaignHub(state, id, "player").permissions.canRead, false);
  assert.ok(slice(state).parked.lanterns);
  state.combat.active = true;
  refusal(() => cm.launchCampaign(state, "lanterns", "dm", NOW), /combattimento/);
  state.combat.active = false;
  cm.launchCampaign(state, "lanterns", "dm", NOW + 1000);
  cm.completeLaunch(state);
  assert.deepEqual(
    {
      campaign: state.campaign,
      scenes: state.scenes,
      activeSceneId: state.activeSceneId,
      combat: state.combat,
      log: state.log,
    },
    lanterns,
  );
  assert.deepEqual(slice(state).parked[id].core, { log: [] });
  assert.equal(slice(state).campaigns[id].lastAccess.dm, new Date(NOW).toISOString());
  assert.equal(cm.launchCampaign(state, "lanterns", "dm", NOW).switched, false);
});

test("Invite links: role, expiry, uses, co-DM single use, revoke and link parsing", () => {
  const { state, id } = withCampaign();
  refusal(
    () => cm.createInviteLink(state, id, { role: "player", hours: 48, uses: 1 }, "player", NOW),
    /Solo il DM/,
  );
  refusal(() => cm.createInviteLink(state, id, { role: "owner", hours: 48, uses: 1 }, "dm", NOW));
  refusal(() => cm.createInviteLink(state, id, { role: "player", hours: 3, uses: 1 }, "dm", NOW));
  const link = cm.createInviteLink(state, id, { role: "player", hours: 48, uses: 1 }, "dm", NOW);
  assert.match(link.code, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.equal(link.expiresAt, new Date(NOW + 48 * HOUR).toISOString());
  const gm = cm.createInviteLink(state, id, { role: "co-dm", hours: 0, uses: 0 }, "dm", NOW);
  assert.equal(gm.maxUses, 1);
  assert.equal(gm.expiresAt, new Date(NOW + 48 * HOUR).toISOString());
  assert.equal(cm.linkState(link, NOW), "active");
  assert.equal(cm.linkState(link, NOW + 49 * HOUR), "expired");
  assert.equal(cm.inspectInvite(state, link.code, "player", NOW + 49 * HOUR).status, "expired");
  assert.match(
    cm.inviteProblem(cm.inspectInvite(state, link.code, "player", NOW + 49 * HOUR)).it,
    /scaduto/,
  );
  const url = `http://127.0.0.1:8879/#campaigns?tab=join&id=${link.code}`;
  assert.equal(cm.normalizeCode(url), link.code);
  assert.equal(cm.normalizeCode(link.code.toLowerCase().replace(/-/g, "")), link.code);
  assert.equal(cm.inspectInvite(state, "NOPE-NOPE-NOPE", "player", NOW).status, "unknown");
  assert.equal(cm.inspectInvite(state, link.code, "dm", NOW).status, "owner");
  cm.revokeInviteLink(state, id, link.id, "dm", NOW);
  assert.equal(cm.inspectInvite(state, link.code, "player", NOW).status, "revoked");
  refusal(() => cm.revokeInviteLink(state, id, link.id, "dm", NOW), /già revocato/);
});

test("Join page: Mira joins with the recipient preview; the second use of a one-use link is refused", () => {
  const { state, id } = withCampaign();
  const link = cm.createInviteLink(state, id, { role: "player", hours: 48, uses: 1 }, "dm", NOW);
  refusal(
    () => cm.previewJoin(state, { code: link.code, path: "own", actorId: "doran" }, "player", NOW),
    /tuoi/,
  );
  refusal(
    () => cm.previewJoin(state, { code: link.code, path: "wander" }, "player", NOW),
    /come entrare/,
  );
  const preview = cm.previewJoin(
    state,
    { code: link.code, path: "own", actorId: "mira" },
    "player",
    NOW,
  );
  assert.equal(preview.characterName, "Mira");
  assert.deepEqual(preview.alsoIn, ["lanterns"]);
  assert.deepEqual(preview.audience, [{ id: "dm", role: "owner", access: "manage" }]);
  assert.equal(preview.approval, false);
  const result = cm.joinCampaign(
    state,
    { code: link.code, path: "own", actorId: "mira" },
    "player",
    NOW,
  );
  assert.deepEqual(result, { joined: true, actorId: "mira", campaignId: id });
  assert.deepEqual(state.actors.mira.campaignIds, ["lanterns", id]);
  assert.equal(cm.roleOf(state, id, "player"), "player");
  assert.deepEqual(
    cm.rosterOf(state, id).map((row) => [row.actorId, row.memberId, row.status]),
    [["mira", "player", "active"]],
  );
  const again = cm.inspectInvite(state, link.code, "player", NOW);
  assert.equal(again.status, "used-up");
  assert.match(cm.inviteProblem(again).it, /1 volta su 1/);
  assert.match(cm.inviteProblem(again).en, /1 of 1 time/);
  refusal(
    () => cm.joinCampaign(state, { code: link.code, path: "own", actorId: "livia" }, "player", NOW),
    /già stato usato/,
  );
  // A multi-use link lets the same player add a second character (R20-045, DDB-073).
  const multi = cm.createInviteLink(state, id, { role: "player", hours: 0, uses: 0 }, "dm", NOW);
  refusal(
    () => cm.joinCampaign(state, { code: multi.code, path: "own", actorId: "mira" }, "player", NOW),
    /già nella campagna/,
  );
  cm.joinCampaign(state, { code: multi.code, path: "own", actorId: "livia" }, "player", NOW);
  assert.deepEqual(
    cm
      .rosterOf(state, id)
      .map((row) => row.actorId)
      .sort(),
    ["livia", "mira"],
  );
});

test("Create from premade: an independent recharged copy owned by the joiner", () => {
  const { state, id } = withCampaign();
  const doran = structuredClone(state.actors.doran);
  const link = cm.createInviteLink(state, id, { role: "player", hours: 24, uses: 5 }, "dm", NOW);
  refusal(
    () =>
      cm.joinCampaign(
        state,
        { code: link.code, path: "premade", premadeId: "premade-fighter", name: "" },
        "player",
        NOW,
      ),
    /nome/,
  );
  const { actorId } = cm.joinCampaign(
    state,
    { code: link.code, path: "premade", premadeId: "premade-fighter", name: "Brenna" },
    "player",
    NOW,
  );
  const copy = state.actors[actorId];
  assert.notEqual(actorId, "doran");
  assert.equal(copy.name, "Brenna");
  assert.equal(copy.owner, "player");
  assert.equal(copy.visibility, "shared");
  assert.deepEqual(copy.campaignIds, [id]);
  assert.equal(copy.hp, copy.maxHp);
  assert.ok(copy.features.every((feature) => !feature.used));
  assert.ok(Object.values(copy.hitDice).every((die) => die.used === 0));
  assert.equal(copy.premade.copiedFrom, "doran");
  assert.deepEqual(state.actors.doran, { ...doran, campaignIds: ["lanterns"] });
  assert.equal(canControlActor(copy, "player", state), true);
});

test("Approval: the join waits, a refusal carries its message, an approval re-checks and applies", () => {
  const { state, id } = withCampaign();
  cm.setApproval(state, id, true, "dm", NOW);
  refusal(() => cm.setApproval(state, id, false, "player", NOW));
  const link = cm.createInviteLink(state, id, { role: "player", hours: 24, uses: 5 }, "dm", NOW);
  const pending = cm.joinCampaign(
    state,
    { code: link.code, path: "own", actorId: "mira" },
    "player",
    NOW,
  );
  assert.equal(pending.pending, true);
  assert.equal(cm.roleOf(state, id, "player"), null);
  assert.deepEqual(state.actors.mira.campaignIds, ["lanterns"], "nothing changes before approval");
  assert.equal(cm.inspectInvite(state, link.code, "player", NOW).status, "pending");
  assert.equal(cm.managerQueue(state, "dm").length, 1);
  assert.equal(cm.outgoingFor(state, "player").length, 1);
  refusal(() => cm.decideRequest(state, id, pending.requestId, { approve: true }, "player", NOW));
  cm.decideRequest(
    state,
    id,
    pending.requestId,
    { approve: false, message: "Siamo al completo per ora." },
    "dm",
    NOW,
  );
  const notice = cm.incomingFor(state, "player").find((item) => item.kind === "denied");
  assert.equal(notice.message, "Siamo al completo per ora.");
  assert.equal(cm.inspectInvite(state, link.code, "player", NOW).decision.status, "denied");
  cm.dismissNotice(state, notice.key, "player");
  assert.equal(
    cm.incomingFor(state, "player").some((item) => item.kind === "denied"),
    false,
  );
  // A new request is approved: membership and seat appear only now.
  const second = cm.joinCampaign(
    state,
    { code: link.code, path: "own", actorId: "mira" },
    "player",
    NOW,
  );
  cm.decideRequest(state, id, second.requestId, { approve: true }, "dm", NOW);
  assert.equal(cm.roleOf(state, id, "player"), "player");
  assert.ok(state.actors.mira.campaignIds.includes(id));
  // Withdrawal of a pending request by its author.
  const third = cm.joinCampaign(
    state,
    { code: link.code, path: "own", actorId: "livia" },
    "player",
    NOW,
  );
  cm.withdrawRequest(state, id, third.requestId, "player", NOW);
  assert.equal(cm.managerQueue(state, "dm").length, 0);
});

function joined() {
  const { state, id } = withCampaign();
  const link = cm.createInviteLink(state, id, { role: "player", hours: 48, uses: 5 }, "dm", NOW);
  const gm = cm.createInviteLink(state, id, { role: "co-dm", hours: 48, uses: 1 }, "dm", NOW);
  cm.joinCampaign(state, { code: link.code, path: "own", actorId: "mira" }, "player", NOW);
  return { state, id, link, gm };
}

test("Removal: links rotate, the old code fails, the sheet becomes unassigned, then reassigned or claimed", () => {
  const { state, id, link, gm } = joined();
  refusal(() => cm.removeMember(state, id, "dm", {}, "dm", NOW), /uscire/);
  refusal(() => cm.removeMember(state, id, "dm", {}, "player", NOW), /Solo il DM/);
  const { rotated } = cm.removeMember(
    state,
    id,
    "player",
    { reason: "Cambio di gruppo" },
    "dm",
    NOW,
  );
  assert.equal(rotated, 1);
  assert.equal(cm.roleOf(state, id, "player"), null);
  const old = cm.inspectInvite(state, link.code, "player", NOW);
  assert.equal(old.status, "rotated");
  assert.match(cm.inviteProblem(old).it, /sostituito dopo una rimozione/);
  assert.equal(
    cm.inspectInvite(state, gm.code, "player", NOW).status,
    "ok",
    "co-DM links do not rotate",
  );
  const fresh = slice(state).campaigns[id].links.find((row) => row.replaces === link.id);
  assert.notEqual(fresh.code, link.code);
  assert.equal(fresh.maxUses, link.maxUses);
  assert.deepEqual(
    cm
      .rosterOf(state, id)
      .map((row) => [row.actorId, row.memberId, row.status, row.previousMemberId]),
    [["mira", null, "unassigned", "player"]],
  );
  assert.equal(state.actors.mira.owner, "player", "the DM never seizes the sheet");
  const removed = cm.incomingFor(state, "player").find((item) => item.kind === "removed");
  assert.equal(removed.message, "Cambio di gruppo");
  // Reassign to the DM (shared control), release again, then the player rejoins and claims.
  cm.assignSeat(state, id, "mira", "dm", "dm", NOW);
  assert.deepEqual(state.actors.mira.controllers, ["dm"]);
  cm.unassignSeat(state, id, "mira", "dm", NOW);
  assert.deepEqual(state.actors.mira.controllers, []);
  assert.equal(cm.inspectInvite(state, fresh.code, "player", NOW).status, "ok");
  cm.joinCampaign(state, { code: fresh.code, path: "claim", actorId: "mira" }, "player", NOW);
  assert.deepEqual(
    cm.rosterOf(state, id).map((row) => [row.actorId, row.memberId, row.status]),
    [["mira", "player", "active"]],
  );
  assert.equal(
    cm.incomingFor(state, "player").some((item) => item.kind === "removed"),
    false,
  );
});

test("Seats: deactivate leaves tools and maps, reactivate returns; claims need a playing member", () => {
  const { state, id } = joined();
  cm.launchCampaign(state, id, "dm", NOW);
  state.scenes[0].tokens.push({ id: "token-mira-2", actorId: "mira", x: 100, y: 100 });
  cm.setSeatActive(state, id, "mira", false, "dm", NOW);
  assert.deepEqual(state.actors.mira.campaignIds, ["lanterns"]);
  assert.equal(state.scenes[0].tokens.length, 0);
  assert.equal(cm.rosterOf(state, id)[0].status, "inactive");
  refusal(() => cm.assignSeat(state, id, "mira", "player", "dm", NOW), /Riattiva/);
  cm.setSeatActive(state, id, "mira", true, "dm", NOW);
  assert.ok(state.actors.mira.campaignIds.includes(id));
  refusal(() => cm.claimSeat(state, id, "mira", "player", NOW), /reclamare/);
  refusal(() => cm.setSeatActive(state, id, "mira", false, "player", NOW), /Solo il DM/);
  // Lanterns kept Mira's token: only the deactivated campaign's maps changed.
  cm.launchCampaign(state, "lanterns", "dm", NOW);
  assert.ok(state.scenes[0].tokens.some((token) => token.actorId === "mira"));
});

test("Roles: co-DM power list is real where connected; transfer and delete stay with the owner", () => {
  const { state, id } = joined();
  refusal(() => cm.setMemberRole(state, id, "player", "co-dm", "player", NOW));
  cm.setMemberRole(state, id, "player", "co-dm", "dm", NOW);
  assert.equal(cm.roleOf(state, id, "player"), "co-dm");
  cm.launchCampaign(state, id, "dm", NOW);
  assert.equal(canOrganizeSessions(state, id, "player"), true);
  // Manager powers: links and approvals; owner-only powers refused.
  cm.createInviteLink(state, id, { role: "observer", hours: 24, uses: 1 }, "player", NOW);
  refusal(
    () => cm.createInviteLink(state, id, { role: "co-dm", hours: 48, uses: 1 }, "player", NOW),
    /proprietario/,
  );
  refusal(() => cm.proposeTransfer(state, id, "dm", "player", NOW), /proprietario/);
  refusal(() => cm.setCampaignStatus(state, id, "archived", "player", NOW), /proprietario/);
  refusal(() => cm.updateCampaignProfile(state, id, { name: "X" }, "player", NOW), /proprietario/);
  refusal(() => cm.removeMember(state, id, "dm", {}, "player", NOW), /proprietario/);
  cm.setMemberRole(state, id, "player", "player", "dm", NOW);
  assert.equal(canOrganizeSessions(state, id, "player"), false);
  cm.setMemberRole(state, id, "player", "observer", "dm", NOW);
  assert.equal(cm.rosterOf(state, id)[0].status, "unassigned", "observers play no character");
  refusal(() => cm.claimSeat(state, id, "mira", "player", NOW), /Solo chi gioca/);
});

test("Transfer: pending, revoke, then acceptance from the incoming invitations", () => {
  const { state, id } = joined();
  cm.proposeTransfer(state, id, "player", "dm", NOW);
  assert.equal(cm.incomingFor(state, "player")[0].kind, "transfer");
  refusal(() => cm.proposeTransfer(state, id, "player", "dm", NOW), /già un trasferimento/);
  cm.revokeTransfer(state, id, "dm", NOW);
  assert.equal(
    cm.incomingFor(state, "player").some((item) => item.kind === "transfer"),
    false,
  );
  refusal(() => cm.answerTransfer(state, id, true, "player", NOW), /Nessun trasferimento/);
  cm.proposeTransfer(state, id, "player", "dm", NOW);
  cm.answerTransfer(state, id, true, "player", NOW);
  assert.equal(cm.roleOf(state, id, "player"), "owner");
  assert.equal(cm.roleOf(state, id, "dm"), "co-dm");
  assert.equal(slice(state).campaigns[id].ownerId, "player");
  refusal(
    () => cm.setCampaignStatus(state, id, "deleted", "dm", NOW, { confirmName: "Rovine di Vetro" }),
    /proprietario/,
  );
  // The new owner may now leave only after passing ownership on; the old owner can leave.
  refusal(() => cm.leaveCampaign(state, id, {}, "player", NOW), /Trasferisci/);
  cm.leaveCampaign(state, id, {}, "dm", NOW);
  assert.equal(cm.roleOf(state, id, "dm"), null);
});

test("Session handover: the recipient controls the campaign creatures until the owner takes it back", () => {
  const state = seeded();
  const goblin = state.actors["goblin-1"];
  assert.equal(canControlActor(goblin, "player", state), false);
  refusal(() => cm.startHandover(state, "lanterns", "player", "player", NOW), /proprietario/);
  cm.startHandover(state, "lanterns", "player", "dm", NOW);
  assert.equal(canViewActor(goblin, "player", state), true);
  assert.equal(canControlActor(state.actors["goblin-1"], "player", state), true);
  assert.equal(canControlActor(state.actors["goblin-2"], "player", state), true);
  assert.equal(canOrganizeSessions(state, "lanterns", "player"), true);
  refusal(() => cm.startHandover(state, "lanterns", "player", "dm", NOW), /già affidate/);
  cm.endHandover(state, "lanterns", "dm", NOW);
  assert.equal(state.actors["goblin-1"].controllers, undefined);
  assert.equal(canControlActor(state.actors["goblin-1"], "player", state), false);
  assert.equal(canOrganizeSessions(state, "lanterns", "player"), false);
  // Only the current campaign can be handed over.
  const id = cm.createCampaign(state, { name: "Altrove" }, "dm", NOW);
  refusal(() => cm.startHandover(state, id, "player", "dm", NOW), /in corso/);
});

test("Archive, delete with the typed name, restore; the current campaign needs an explicit step", () => {
  const { state, id } = withCampaign();
  // P10 CA-84/85: the campaign in play can be archived (Roll20 cold storage) and is deleted
  // only after that explicit step.
  refusal(
    () =>
      cm.setCampaignStatus(state, "lanterns", "deleted", "dm", NOW, {
        confirmName: "Le lanterne di Bruma",
      }),
    /archiviala prima/,
  );
  cm.setCampaignStatus(state, id, "archived", "dm", NOW);
  assert.deepEqual(
    cm.listCampaigns(state, "dm", { status: "archived" }, NOW).map((row) => row.id),
    [id],
  );
  refusal(() => cm.launchCampaign(state, id, "dm", NOW), /archiviata/);
  refusal(
    () => cm.setCampaignStatus(state, id, "deleted", "dm", NOW, { confirmName: "rovine" }),
    /nome/,
  );
  cm.setCampaignStatus(state, id, "deleted", "dm", NOW, { confirmName: "Rovine di Vetro" });
  assert.deepEqual(
    cm.listCampaigns(state, "dm", { status: "deleted" }, NOW).map((row) => row.id),
    [id],
  );
  cm.setCampaignStatus(state, id, "active", "dm", NOW);
  assert.equal(cm.listCampaigns(state, "dm", {}, NOW).length, 2);
});

test("Direct invitations: incoming with Accept (join page) or Decline; only the addressee can use them", () => {
  const { state, id } = withCampaign();
  const invite = cm.inviteIdentity(state, id, { to: "player", role: "observer" }, "dm", NOW);
  refusal(
    () => cm.inviteIdentity(state, id, { to: "player", role: "player" }, "dm", NOW),
    /già un invito/,
  );
  assert.equal(cm.incomingFor(state, "player")[0].kind, "invite");
  assert.equal(cm.inspectInvite(state, invite.code, "dm", NOW).status, "not-yours");
  const look = cm.inspectInvite(state, invite.code, "player", NOW);
  assert.equal(look.status, "ok");
  assert.equal(look.approval, false, "a direct invitation is the DM's own approval");
  cm.setApproval(state, id, true, "dm", NOW);
  const result = cm.joinCampaign(state, { code: invite.code, path: "none" }, "player", NOW);
  assert.equal(result.joined, true);
  assert.equal(cm.roleOf(state, id, "player"), "observer");
  assert.equal(cm.inspectInvite(state, invite.code, "player", NOW).status, "invite-accepted");
  cm.removeMember(state, id, "player", {}, "dm", NOW);
  const second = cm.inviteIdentity(state, id, { to: "player", role: "player" }, "dm", NOW);
  cm.declineDirectInvite(state, id, second.id, "player", NOW);
  assert.equal(cm.inspectInvite(state, second.code, "player", NOW).status, "invite-declined");
});

test("Leaving with sheets removes them and their tokens from that campaign only", () => {
  const state = seeded();
  assert.ok(state.scenes[0].tokens.some((token) => token.actorId === "mira"));
  cm.leaveCampaign(state, "lanterns", { takeCharacters: true }, "player", NOW);
  assert.equal(getCampaignHub(state, "lanterns", "player").permissions.canRead, false);
  assert.ok(!state.scenes[0].tokens.some((token) => ["mira", "livia"].includes(token.actorId)));
  assert.deepEqual(state.actors.mira.campaignIds, []);
});

// The shell's commit and undo (app.mjs) with the real store and registry hooks.
function shell() {
  const storage = memory();
  const registry = makeRegistry();
  let store = createStore({ storage });
  registry.initState(store.state);
  store.persist();
  const api = {
    get state() {
      return store.state;
    },
    get history() {
      return store.history;
    },
    commit(label, mutator, options = {}, role = "dm") {
      store.commit(label, mutator, role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      if (options.newUndoVisit) store.history.length = 0;
      if (options.rebaseHistory)
        for (const entry of store.history) options.rebaseHistory(entry.before);
      if (options.afterCommit) {
        options.afterCommit(store.state);
        store.persist();
      }
    },
    undo(role = "dm") {
      const current = store.state;
      store.undo(role);
      registry.afterUndo(current, store.state);
      store.persist();
    },
    reload() {
      store = createStore({ storage });
      registry.initState(store.state);
    },
  };
  return api;
}

test("Real store: membership survives gameplay Undo; switching campaign starts a new undo visit; reload keeps both campaigns", () => {
  const app = shell();
  let id;
  app.commit(
    "create",
    (draft) => {
      id = cm.createCampaign(draft, { name: "Rovine di Vetro" }, "dm", NOW);
    },
    { undoable: false, newUndoVisit: true },
  );
  app.commit("hp", (draft) => {
    draft.actors["goblin-1"].hp = 3;
  });
  app.commit(
    "promote",
    (draft) => cm.setMemberRole(draft, "lanterns", "player", "co-dm", "dm", NOW),
    { undoable: false },
  );
  app.undo();
  assert.equal(app.state.actors["goblin-1"].hp, 7, "gameplay change undone");
  assert.equal(cm.roleOf(app.state, "lanterns", "player"), "co-dm", "membership preserved");
  assert.ok(app.state.ext[cm.ID].campaigns[id], "slice preserved");
  app.commit("hp again", (draft) => {
    draft.actors["goblin-1"].hp = 2;
  });
  assert.equal(app.history.length, 1);
  app.commit("launch", (draft) => cm.launchCampaign(draft, id, "dm", NOW), {
    undoable: false,
    newUndoVisit: true,
  });
  assert.equal(app.history.length, 0, "no snapshot from the previous campaign can be restored");
  assert.equal(app.state.campaign.id, id);
  app.reload();
  assert.equal(app.state.campaign.id, id);
  assert.equal(app.state.campaign.name, "Rovine di Vetro");
  assert.equal(app.state.ext[cm.ID].parked.lanterns.campaign.name, "Le lanterne di Bruma");
  assert.equal(app.state.ext[cm.ID].parked.lanterns.scenes[0].tokens.length, 5);
  assert.equal(cm.roleOf(app.state, "lanterns", "player"), "co-dm");
});

// ---------------------------------------------------------------- UI handlers

function harness({
  role = "dm",
  lang = "it",
  state = seeded(),
  view = {},
  registry = makeRegistry(),
} = {}) {
  const toasts = [];
  const commits = [];
  const ctx = {
    state,
    role,
    lang,
    offline: false,
    view: { page: "campaigns", id: "", tab: "", ...view },
    t: (it, en) => (ctx.lang === "en" ? en : it),
    label: (value) =>
      typeof value === "object" && value ? value[ctx.lang] || value.it : String(value ?? ""),
    esc,
    icon,
    toasts,
    commits,
    toast: (text, error = false) => toasts.push({ text, error }),
    render() {
      ctx.html = cm.renderCampaignsPage(ctx);
    },
    navigate(page, params = {}) {
      ctx.view = { page, id: "", tab: "", ...params };
      ctx.render();
    },
    commit(label, mutator, options = {}) {
      if (ctx.offline && !options.local)
        throw Object.assign(Error("offline"), { it: "Sei senza rete.", en: "You are offline." });
      const draft = structuredClone(ctx.state);
      mutator(draft);
      ctx.state = draft;
      if (options.afterCommit) options.afterCommit(ctx.state);
      commits.push({ label, options });
      ctx.render();
      return { applied: true, persisted: true };
    },
    dialog(title, body, options = {}) {
      ctx.modal = { title, body, options };
    },
    closeDialog() {},
  };
  ctx.registry = registry;
  registry.attach(ctx);
  return ctx;
}
const form = (entries) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
};

test("UI: My Games list with filters, create dialog, details tabs by role and EN text", () => {
  const ctx = harness();
  ctx.render();
  assert.match(ctx.html, /data-cm="create"/);
  assert.match(ctx.html, /Le lanterne di Bruma/);
  assert.match(ctx.html, /data-cm="status" data-status="archived"/);
  assert.doesNotMatch(ctx.html, /data-status="deleted"/, "the trash filter appears only when used");
  assert.match(ctx.html, /#settimanale/);
  cm.handleAction(ctx, "create");
  assert.equal(ctx.modal.title, "Crea campagna");
  ctx.modal.options.onSubmit(
    form({
      name: "Rovine di Vetro",
      description: "",
      tags: "vetro",
      nextLocal: "",
      timeZone: "Europe/Rome",
    }),
  );
  const created = cm.listCampaigns(ctx.state, "dm").find((row) => row.name === "Rovine di Vetro");
  assert.ok(created);
  // Administration is private in the shared log; creating keeps everyone's Undo (the
  // legacy membership it writes out is replayed on the undo stack).
  const options = ctx.commits.at(-1).options;
  assert.equal(options.undoable, false);
  assert.equal(options.visibility, "private");
  assert.equal(options.newUndoVisit, undefined);
  assert.equal(typeof options.rebaseHistory, "function");
  assert.deepEqual(ctx.view, { page: "campaigns", id: created.id, tab: "invites" });
  assert.match(ctx.html, /data-cm-form="link"/);
  assert.match(ctx.html, />Inviti</);
  // A player sees no Invitations tab and cannot open it.
  ctx.role = "player";
  ctx.navigate("campaigns", { id: "lanterns", tab: "invites" });
  assert.doesNotMatch(ctx.html, /data-tab="invites"/);
  assert.match(ctx.html, /Esci dalla campagna/);
  ctx.lang = "en";
  ctx.render();
  assert.match(ctx.html, /Leave campaign/);
  assert.match(ctx.html, /Simulated presence/);
});

test("UI: link form, join page paths, preview dialog, join and refused second use", () => {
  const ctx = harness();
  const id = cm.createCampaign(ctx.state, { name: "Rovine di Vetro" }, "dm", NOW);
  const element = { dataset: { id } };
  const link = cm.handleForm(
    ctx,
    "link",
    form({ role: "player", hours: "48", uses: "1" }),
    element,
  );
  assert.match(ctx.toasts.at(-1).text, new RegExp(link.code));
  ctx.navigate("campaigns", { id, tab: "invites" });
  assert.match(ctx.html, new RegExp(`#campaigns\\?tab=join&amp;id=${link.code}`));
  ctx.role = "player";
  ctx.navigate("campaigns", { tab: "join", id: link.code });
  for (const path of ["create", "premade", "claim", "own"])
    assert.match(ctx.html, new RegExp(`data-path="${path}"`));
  cm.handleAction(ctx, "join-path", { code: link.code, path: "own" });
  assert.match(ctx.html, /data-cm-form="join"[^>]*data-path="own"/);
  assert.match(ctx.html, /value="mira"/);
  cm.handleForm(ctx, "join", form({ actorId: "mira" }), {
    dataset: { code: link.code, path: "own" },
  });
  assert.equal(ctx.modal.title, "Prima di entrare");
  assert.match(ctx.modal.body, /Le lanterne di Bruma/);
  assert.match(ctx.modal.body, /Solo io/);
  ctx.modal.options.onSubmit(form({}));
  assert.equal(cm.roleOf(ctx.state, id, "player"), "player");
  assert.deepEqual(ctx.view, { page: "campaigns", id, tab: "characters" });
  ctx.navigate("campaigns", { tab: "join", id: link.code });
  assert.match(ctx.html, /già stato usato 1 volta su 1/);
});

test("UI: offline shared commands are refused with a toast and nothing changes", () => {
  const ctx = harness({ view: { id: "lanterns", tab: "invites" } });
  ctx.render();
  ctx.offline = true;
  const handlers = {};
  const el = {
    addEventListener: (type, fn) => (handlers[type] = fn),
    querySelector: () => null,
    contains: () => true,
  };
  cm.bindArea(el, ctx);
  const control = { dataset: { cm: "approve", id: "lanterns", request: "none" }, disabled: false };
  handlers.click({ target: { closest: () => control }, preventDefault() {} });
  assert.equal(ctx.toasts.at(-1).error, true);
  const before = JSON.stringify(ctx.state);
  const formEl = { dataset: { cmForm: "link", id: "lanterns" } };
  const OriginalFormData = globalThis.FormData;
  globalThis.FormData = class extends OriginalFormData {
    constructor() {
      super();
      this.append("role", "player");
      this.append("hours", "48");
      this.append("uses", "1");
    }
  };
  try {
    handlers.submit({ target: { closest: () => formEl }, preventDefault() {} });
  } finally {
    globalThis.FormData = OriginalFormData;
  }
  assert.equal(ctx.toasts.at(-1).text, "Sei senza rete.");
  assert.equal(JSON.stringify(ctx.state), before);
});

test("Notices and search through the registry; home box lists other campaigns", () => {
  const ctx = harness();
  const id = cm.createCampaign(ctx.state, { name: "Rovine di Vetro", tags: "vetro" }, "dm", NOW);
  cm.setApproval(ctx.state, id, true, "dm", NOW);
  const link = cm.createInviteLink(
    ctx.state,
    id,
    { role: "player", hours: 48, uses: 1 },
    "dm",
    NOW,
  );
  cm.joinCampaign(ctx.state, { code: link.code, path: "own", actorId: "mira" }, "player", NOW);
  const notices = ctx.registry.notifications(ctx);
  assert.equal(notices.length, 1);
  assert.equal(notices[0].title.it, "Richiesta d’ingresso · Rovine di Vetro");
  assert.deepEqual(notices[0].target, { page: "campaigns", params: { id, tab: "invites" } });
  const found = ctx.registry.search(ctx, "vetro");
  assert.deepEqual(
    found.map((row) => [row.title, row.page, row.params.id]),
    [["Rovine di Vetro", "campaigns", id]],
  );
  const home = cm.renderHomeWidget(ctx);
  assert.match(home, /Rovine di Vetro/);
  assert.match(home, /data-cm="launch"/);
  assert.match(home, /1 tra inviti e richieste/);
  ctx.role = "player";
  assert.equal(
    ctx.registry.search(ctx, "vetro").length,
    0,
    "no search results for campaigns you are not in",
  );
});

test("UI: in-app invitation accepted from the incoming list joins as observer; declined one closes", () => {
  const ctx = harness();
  const id = cm.createCampaign(ctx.state, { name: "Rovine di Vetro" }, "dm", NOW);
  cm.handleForm(ctx, "direct", form({ to: "player", role: "observer" }), { dataset: { id } });
  assert.equal(ctx.toasts.at(-1).text, "Invito inviato · Rovine di Vetro");
  ctx.role = "player";
  ctx.navigate("campaigns");
  assert.match(ctx.html, /ti invita in <strong>Rovine di Vetro<\/strong> come osservatore/);
  const code = cm.incomingFor(ctx.state, "player")[0].code;
  cm.handleAction(ctx, "accept-invite", { code });
  assert.deepEqual(ctx.view, { page: "campaigns", id: code, tab: "join" });
  assert.match(ctx.html, /data-cm="join-none"/);
  assert.doesNotMatch(ctx.html, /data-path="own"/, "an observer joins without a character");
  cm.handleAction(ctx, "join-none", { code });
  assert.match(ctx.modal.body, /senza personaggio/);
  ctx.modal.options.onSubmit(form({}));
  assert.equal(cm.roleOf(ctx.state, id, "player"), "observer");
  // A second invitation is declined from the list and can no longer be used.
  ctx.role = "dm";
  cm.removeMember(ctx.state, id, "player", {}, "dm", NOW);
  const again = cm.inviteIdentity(ctx.state, id, { to: "player", role: "player" }, "dm", NOW);
  ctx.role = "player";
  cm.handleAction(ctx, "decline-invite", { id, invite: again.id });
  assert.equal(cm.inspectInvite(ctx.state, again.code, "player", NOW).status, "invite-declined");
});

test("UI: “Crea un personaggio” opens the real builder and Home offers to continue the join", () => {
  const ctx = harness({ role: "player" });
  const id = cm.createCampaign(ctx.state, { name: "Rovine di Vetro" }, "dm", NOW);
  const link = cm.createInviteLink(
    ctx.state,
    id,
    { role: "player", hours: 48, uses: 5 },
    "dm",
    Date.now(), // UI renders read the real clock
  );
  ctx.navigate("campaigns", { tab: "join", id: link.code });
  cm.handleAction(ctx, "join-path", { code: link.code, path: "create" });
  assert.match(ctx.html, /data-cm="join-builder"/);
  cm.handleAction(ctx, "join-builder", { code: link.code });
  assert.equal(ctx.state.ext[cm.ID].joinReturns.player.code, link.code);
  assert.equal(ctx.view.page, "builder");
  assert.equal(
    ctx.state.characterDrafts.at(-1).ownerId ?? ctx.state.characterDrafts.at(-1).owner,
    "player",
  );
  assert.ok(
    ctx.commits.every((row) => row.options.local),
    "builder start and join memo are private",
  );
  const home = cm.renderHomeWidget(ctx);
  assert.match(home, /Continua l’ingresso in Rovine di Vetro/);
  // Joining clears the reminder.
  cm.joinCampaign(ctx.state, { code: link.code, path: "own", actorId: "livia" }, "player", NOW);
  assert.equal(ctx.state.ext[cm.ID].joinReturns.player, undefined);
});

test("A link that no longer works does not disclose the campaign to an unrelated identity", () => {
  const ctx = harness({ role: "player" });
  const id = cm.createCampaign(
    ctx.state,
    { name: "Rovine di Vetro", description: "Segreto" },
    "dm",
    NOW,
  );
  const link = cm.createInviteLink(
    ctx.state,
    id,
    { role: "player", hours: 48, uses: 1 },
    "dm",
    NOW,
  );
  cm.revokeInviteLink(ctx.state, id, link.id, "dm", NOW);
  ctx.navigate("campaigns", { tab: "join", id: link.code });
  assert.match(ctx.html, /Il DM ha revocato questo link/);
  assert.doesNotMatch(ctx.html, /Rovine di Vetro|Segreto/);
});

// ---------------------------------------------------------------- review fixes (B13 review)

// Two per-campaign areas loaded like the real ones (names from CAMPAIGN_SCOPED_SLICES).
function registryWithAreas() {
  const registry = makeRegistry();
  registry.use("chat", (r) =>
    r.registerStateSlice("chat", {
      version: 1,
      undo: "preserve",
      seed: () => ({ messages: [{ id: "m1", text: "Narrazione alle lanterne" }] }),
      normalize: (value) => ({ messages: Array.isArray(value?.messages) ? value.messages : [] }),
    }),
  );
  registry.use("handouts", (r) =>
    r.registerStateSlice("handouts", {
      version: 2,
      seed: () => ({ materials: [{ id: "h1", title: "Avviso della gilda delle lanterne" }] }),
      // Version 1 called the list "items".
      normalize: (value, from) => ({
        materials:
          from < 2 ? (value?.items ?? []) : Array.isArray(value?.materials) ? value.materials : [],
      }),
    }),
  );
  return registry;
}
// A ctx over the real store with app.mjs commit/undo and the same B13 hooks.
function storeCtx(registry = registryWithAreas()) {
  const storage = memory();
  let store = createStore({ storage });
  registry.initState(store.state);
  store.persist();
  const ctx = {
    role: "dm",
    lang: "it",
    view: { page: "campaigns", id: "", tab: "" },
    get state() {
      return store.state;
    },
    get history() {
      return store.history;
    },
    t: (it, en) => (ctx.lang === "en" ? en : it),
    label: (value) =>
      typeof value === "object" && value ? value[ctx.lang] || value.it : String(value ?? ""),
    esc,
    icon,
    toast() {},
    render() {},
    navigate(page, params = {}) {
      ctx.view = { page, id: "", tab: "", ...params };
    },
    dialog(title, body, options = {}) {
      ctx.modal = { title, body, options };
    },
    closeDialog() {},
    commit(label, mutator, options = {}) {
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      if (options.newUndoVisit) store.history.length = 0;
      if (options.rebaseHistory)
        for (const entry of store.history) options.rebaseHistory(entry.before);
      if (options.afterCommit) {
        options.afterCommit(store.state);
        store.persist();
      }
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(ctx.role);
      registry.afterUndo(current, store.state);
      store.persist();
    },
    reload() {
      store = createStore({ storage });
      registry.initState(store.state);
    },
  };
  ctx.registry = registry;
  registry.attach(ctx);
  return ctx;
}
const createThroughDialog = (ctx, name) => {
  cm.handleAction(ctx, "create");
  ctx.modal.options.onSubmit(
    form({ name, description: "", tags: "", nextLocal: "", timeZone: "Europe/Rome" }),
  );
  return cm.listCampaigns(ctx.state, ctx.role).find((row) => row.name === name).id;
};

test("Review P1: launching parks chat, materials, log, rests and campaign settings with their campaign", () => {
  const registry = registryWithAreas();
  const state = createInitialState();
  registry.initState(state);
  state.log = [{ id: "l1", label: "Sussurro a Livia", controller: "dm", visibility: "shared" }];
  state.restTime = { version: 1, clocks: {}, rests: [{ id: "r1" }], rolls: [], events: [] };
  state.ext["core-settings"].campaign = { "session-view-campaign": { idle: 30 } };
  const ctx = harness({ state, registry });
  const id = cm.createCampaign(ctx.state, { name: "Rovine di Vetro" }, "dm", NOW);
  const link = cm.createInviteLink(
    ctx.state,
    id,
    { role: "player", hours: 48, uses: 5 },
    "dm",
    NOW,
  );
  cm.joinCampaign(ctx.state, { code: link.code, path: "own", actorId: "mira" }, "player", NOW);
  cm.handleAction(ctx, "launch", { id });
  assert.equal(ctx.state.campaign.id, id);
  assert.deepEqual(ctx.state.ext.chat, { messages: [] }, "no lanterns chat in Rovine");
  assert.deepEqual(ctx.state.ext.handouts, { materials: [] }, "no lanterns handout in Rovine");
  assert.deepEqual(ctx.state.log, [], "no lanterns log line in Rovine");
  assert.equal(ctx.state.restTime, undefined);
  assert.deepEqual(ctx.state.ext["core-settings"].campaign, {});
  // The DM plays no character in Rovine: the Table opens without a preselected sheet.
  assert.equal(ctx.view.page, "table");
  assert.equal(ctx.view.id, "");
  // What is said in Rovine stays in Rovine.
  ctx.state.ext.chat.messages.push({ id: "m2", text: "Solo nelle Rovine" });
  ctx.state.log.push({ id: "l2", label: "Tiro nelle Rovine", controller: "player" });
  cm.handleAction(ctx, "launch", { id: "lanterns" });
  assert.deepEqual(
    ctx.state.ext.chat.messages.map((m) => m.id),
    ["m1"],
  );
  assert.equal(ctx.state.ext.handouts.materials[0].title, "Avviso della gilda delle lanterne");
  assert.deepEqual(
    ctx.state.log.map((e) => e.id),
    ["l1"],
  );
  assert.equal(ctx.state.restTime.rests[0].id, "r1");
  assert.deepEqual(ctx.state.ext["core-settings"].campaign, {
    "session-view-campaign": { idle: 30 },
  });
  // A parked slice saved by an older area version is normalized when it comes back.
  ctx.state.ext[cm.ID].parked[id].ext.handouts = { value: { items: [{ id: "old" }] }, version: 1 };
  // Review round 2 (P2): a player never switches the campaign in play (Foundry FVT-001);
  // a co-DM launches like the owner.
  ctx.role = "player";
  assert.throws(
    () => cm.handleAction(ctx, "launch", { id }),
    (error) => /Solo il DM o un co-DM avvia/.test(error.it),
  );
  assert.equal(ctx.state.campaign.id, "lanterns");
  cm.setMemberRole(ctx.state, id, "player", "co-dm", "dm", NOW);
  cm.handleAction(ctx, "launch", { id });
  assert.deepEqual(ctx.state.ext.handouts, { materials: [{ id: "old" }] });
  assert.equal(ctx.state.extVersions.handouts, 2);
  assert.deepEqual(
    ctx.state.ext.chat.messages.map((m) => m.id),
    ["m2"],
  );
  assert.deepEqual(
    ctx.state.log.map((e) => e.id),
    ["l2"],
  );
  // The player's Table opens on Mira, the character they play in Rovine, not on Livia.
  assert.deepEqual([ctx.view.page, ctx.view.id], ["table", "mira"]);
  assert.deepEqual(cm.playedBy(ctx.state, id, "player"), ["mira"]);
});

test("Review P1/P2/P3: real store — logs travel with their campaign, admin lines are private, rename and creation keep Undo", () => {
  const ctx = storeCtx();
  ctx.commit("Movimento confermato", (draft) => {
    draft.actors["goblin-1"].hp = 3;
  });
  const id = createThroughDialog(ctx, "Campagna segreta del giovedì");
  assert.equal(ctx.history.length, 1, "creating a campaign keeps the gameplay Undo");
  cm.handleForm(ctx, "link", form({ role: "observer", hours: "48", uses: "1" }), {
    dataset: { id },
  });
  const admin = ctx.state.log.slice(1);
  assert.deepEqual(
    admin.map((entry) => entry.label),
    ["Campagna creata", "Link d’invito creato · Campagna segreta del giovedì"],
  );
  assert.ok(
    admin.every((entry) => entry.visibility === "private" && entry.controller === "dm"),
    "another campaign's administration never reaches the shared log",
  );
  // Undo of the earlier move: the legacy membership written out on creation stays.
  ctx.undo();
  assert.equal(ctx.state.actors["goblin-1"].hp, 7);
  assert.deepEqual(ctx.state.actors["goblin-1"].campaignIds, ["lanterns"]);
  // Rename, then Undo of a move made before it: the goblin reverts, the name stays new.
  ctx.commit("Movimento confermato", (draft) => {
    draft.actors["goblin-1"].hp = 2;
  });
  cm.handleAction(ctx, "profile", { id: "lanterns" });
  ctx.modal.options.onSubmit(
    form({ name: "Le lanterne di Bruma II", description: "Descrizione nuova", tags: "" }),
  );
  assert.equal(ctx.history.length, 1, "renaming keeps the gameplay Undo");
  ctx.undo();
  assert.equal(ctx.state.actors["goblin-1"].hp, 7);
  assert.equal(ctx.state.campaign.name, "Le lanterne di Bruma II");
  assert.equal(cm.metaOf(ctx.state, "lanterns").description, "Descrizione nuova");
  // Launch: new undo visit, the secret campaign starts with its own empty log and chat.
  const lanternsLog = ctx.state.log.map((entry) => entry.id);
  cm.handleAction(ctx, "launch", { id });
  assert.equal(ctx.history.length, 0);
  assert.deepEqual(ctx.state.log, []);
  assert.deepEqual(ctx.state.ext.chat.messages, []);
  ctx.commit("Detto nella campagna segreta", (draft) => {
    draft.ext.chat.messages.push({ id: "m9", text: "segreto" });
  });
  ctx.reload();
  assert.equal(ctx.state.campaign.id, id);
  assert.deepEqual(
    ctx.state.log.map((entry) => entry.label),
    ["Detto nella campagna segreta"],
  );
  cm.handleAction(ctx, "launch", { id: "lanterns" });
  assert.deepEqual(
    ctx.state.log.slice(0, lanternsLog.length).map((e) => e.id),
    lanternsLog,
  );
  assert.ok(!ctx.state.log.some((entry) => entry.label === "Detto nella campagna segreta"));
  assert.deepEqual(
    ctx.state.ext.chat.messages.map((m) => m.id),
    ["m1"],
  );
  assert.equal(ctx.state.ext[cm.ID].pendingLaunch, undefined);
  assert.deepEqual(
    ctx.state.ext[cm.ID].parked[id].core.log.map((entry) => entry.label),
    ["Detto nella campagna segreta", "Campagna avviata · Le lanterne di Bruma II"],
  );
});

test("Review P2: a sheet the DM deactivated cannot be connected back by its owner; the sheet says why", () => {
  const { state, id } = joined();
  cm.launchCampaign(state, id, "dm", NOW);
  cm.completeLaunch(state);
  cm.setSeatActive(state, id, "mira", false, "dm", NOW);
  assert.equal(cm.isDeactivated(state, id, "mira"), true);
  assert.throws(
    () => connectCharacterToCampaign(state, "mira", "player"),
    (error) => /disattivato/.test(error.it) && /deactivated/.test(error.en),
  );
  assert.ok(!state.actors.mira.campaignIds.includes(id));
  const ctx = harness({ state, role: "player" });
  const notice = ctx.registry
    .list("sheet-section", ctx, state.actors.mira)
    .find((c) => c.id === `${cm.ID}-deactivated`);
  assert.ok(notice, "the sheet explains the deactivation");
  assert.match(cm.renderDeactivatedNotice(ctx, state.actors.mira), /Il DM ha disattivato Mira/);
  assert.equal(
    ctx.registry.list("sheet-section", ctx, state.actors.livia).length,
    0,
    "no notice on an active sheet",
  );
  cm.setSeatActive(state, id, "mira", true, "dm", NOW);
  assert.equal(cm.isDeactivated(state, id, "mira"), false);
  connectCharacterToCampaign(state, "mira", "player");
  assert.ok(state.actors.mira.campaignIds.includes(id));
});

test("Review P2: the co-DM power list shows only powers the app applies", () => {
  const ctx = harness();
  cm.handleAction(ctx, "role", { id: "lanterns", target: "player", role: "co-dm" });
  assert.match(ctx.modal.body, /Organizzare sessioni/);
  assert.doesNotMatch(ctx.modal.body, /Nel prototipo|condurre al Tavolo/);
});

test("Review P2: Home shows the characters played in the campaign in play, never Livia outside hers", () => {
  const { state, id } = joined();
  const ctx = harness({ state, role: "player" });
  const summary = () =>
    ctx.registry
      .merge("home-widget", [{ id: "summary", html: "core" }], ctx)
      .find((item) => item.id === "summary");
  assert.equal(summary().core, true, "in the lanterns the core block stays");
  cm.launchCampaign(ctx.state, id, "dm", NOW);
  cm.completeLaunch(ctx.state);
  assert.equal(summary().core, undefined);
  const html = cm.renderHomeSummary(ctx);
  assert.match(html, /data-open-sheet="mira"/);
  assert.doesNotMatch(html, /Livia/);
  ctx.role = "dm";
  assert.match(cm.renderHomeSummary(ctx), /la conduci/);
});

test("Review P3: an observer cannot accept ownership; a handover ends when its campaign is parked", () => {
  const { state, id } = joined();
  cm.proposeTransfer(state, id, "player", "dm", NOW);
  cm.setMemberRole(state, id, "player", "observer", "dm", NOW);
  assert.equal(slice(state).campaigns[id].transfer.status, "revoked");
  refusal(() => cm.answerTransfer(state, id, true, "player", NOW), /Nessun trasferimento/);
  assert.equal(cm.roleOf(state, id, "player"), "observer");
  // Handover in the lanterns, then Rovine is launched: the goblins go back to the DM.
  const other = seeded();
  const rovine = cm.createCampaign(other, { name: "Rovine di Vetro" }, "dm", NOW);
  cm.startHandover(other, "lanterns", "player", "dm", NOW);
  assert.equal(canControlActor(other.actors["goblin-1"], "player", other), true);
  cm.launchCampaign(other, rovine, "dm", NOW);
  cm.completeLaunch(other);
  assert.equal(other.actors["goblin-1"].controllers, undefined);
  assert.equal(slice(other).campaigns.lanterns.handover, null);
  assert.equal(slice(other).campaigns.lanterns.audit.at(-1).kind, "handover-end");
});

test("Review P3: a personal invitation opened from the bell can be declined on the join page", () => {
  const ctx = harness();
  const id = cm.createCampaign(ctx.state, { name: "Rovine di Vetro" }, "dm", NOW);
  const invite = cm.inviteIdentity(ctx.state, id, { to: "player", role: "player" }, "dm", NOW);
  ctx.role = "player";
  const bell = ctx.registry.notifications(ctx).find((n) => n.id === `invite:${invite.id}`);
  assert.deepEqual(bell.target, { page: "campaigns", params: { tab: "join", id: invite.code } });
  assert.match(bell.body.it, /accettare o rifiutare/);
  ctx.navigate("campaigns", bell.target.params);
  assert.match(ctx.html, /data-cm="decline-invite"/);
  assert.match(ctx.html, /data-path="own"/, "accepting is joining on the same page");
  cm.handleAction(ctx, "decline-invite", { id, invite: invite.id });
  assert.match(ctx.html, /Hai rifiutato questo invito/);
  assert.equal(cm.incomingFor(ctx.state, "player").length, 0);
});

test("Review P3: the shell keeps the B13 hooks this area relies on", () => {
  // The store tests above mirror app.mjs; these checks fail if the shared lines go away.
  const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const app = read("app.mjs");
  assert.match(app, /if \(options\.newUndoVisit\) store\.history\.length = 0;/);
  assert.match(
    app,
    /if \(options\.afterCommit\) \{\s*options\.afterCommit\(store\.state\);\s*store\.persist\(\);/,
  );
  assert.match(
    app,
    /if \(options\.rebaseHistory\) for \(const entry of store\.history\) options\.rebaseHistory\(entry\.before\);/,
  );
  assert.match(
    app,
    /!campaignAccess && \["table", "preparation", "session-view-display"\]\.includes\(view\.page\)/,
  );
  assert.match(app, /const routeSlot = outsider \? null : extRoute;/);
  assert.match(read("table.mjs"), /!canObserve\(selected\) \|\| !inPlay\(selected\)/);
  const access = read("character-access.mjs");
  assert.match(access, /seats\?\.\[actorId\]\?\.status ===\s*"inactive"/);
  assert.match(access, /assignedController\(actor, role\) && playsFromSeat\(actor, role, state\)/);
});

// ---------------------------------------------------------------- review round 2

test("Review 2 P1: an observer or an unassigned owner does not control the sheet until a Claim", () => {
  const state = seeded();
  const ctx = harness({ state, role: "player" });
  const livia = () => ctx.state.actors.livia;
  assert.equal(canControlActor(livia(), "player", ctx.state), true, "the sample seat");
  cm.setMemberRole(ctx.state, "lanterns", "player", "observer", "dm", NOW);
  assert.equal(canViewActor(livia(), "player", ctx.state), true, "the sheet stays readable");
  assert.equal(canControlActor(livia(), "player", ctx.state), false, "observer: no Table move");
  assert.equal(canControlActor(ctx.state.actors.mira, "player", ctx.state), false);
  assert.equal(canControlActor(livia(), "dm", ctx.state), true, "the DM keeps the core authority");
  assert.equal(cm.seatBlock(ctx.state, livia(), "player").reason, "observer");
  assert.equal(cm.showsHomeSummary(ctx), true, "Home no longer says «Il tuo personaggio: Livia»");
  assert.match(cm.renderHomeSummary(ctx), /Segui questa campagna senza personaggio/);
  // Player again: Livia stays unassigned until claimed (DDB-074).
  cm.setMemberRole(ctx.state, "lanterns", "player", "player", "dm", NOW);
  assert.equal(canControlActor(livia(), "player", ctx.state), false);
  assert.equal(cm.seatBlock(ctx.state, livia(), "player").reason, "unassigned");
  const notice = ctx.registry
    .list("sheet-section", ctx, livia())
    .find((c) => c.id === `${cm.ID}-seat`);
  assert.ok(notice, "the sheet explains why it is view-only");
  assert.match(cm.renderSeatNotice(ctx, livia()), /data-cm="claim" data-id="lanterns"/);
  assert.match(cm.renderHomeSummary(ctx), /Nessun personaggio assegnato a te/);
  cm.handleAction(ctx, "claim", { id: "lanterns", actor: "livia" });
  assert.equal(canControlActor(livia(), "player", ctx.state), true);
  assert.equal(cm.seatBlock(ctx.state, livia(), "player"), null);
  assert.equal(cm.showsHomeSummary(ctx), false, "back to the core «Il tuo personaggio»");
  // The owner's own Unassign also takes the sheet off their hands until they claim it.
  cm.unassignSeat(ctx.state, "lanterns", "livia", "player", NOW);
  assert.equal(canControlActor(livia(), "player", ctx.state), false);
  ctx.lang = "en";
  assert.match(cm.renderSeatNotice(ctx, livia()), /claim it to play it again/);
});

test("Review 2 P2: a removed owner cannot edit a sheet that stays in the campaign; the DM never seizes it", () => {
  const { state, id } = joined();
  const ctx = harness({ state, role: "player" });
  // Livia in the lanterns (in play), Mira in the lanterns and in Rovine.
  cm.removeMember(state, "lanterns", "player", { reason: "" }, "dm", NOW);
  assert.equal(canControlActor(state.actors.livia, "player", state), false);
  assert.equal(cm.seatBlock(state, state.actors.livia, "player").reason, "left");
  assert.match(cm.renderSeatNotice(ctx, state.actors.livia), /Non fai più parte di «Le lanterne/);
  cm.assignSeat(state, "lanterns", "livia", "dm", "dm", NOW);
  assert.equal(state.actors.livia.owner, "player", "the sheet stays its owner's (DDB-075)");
  assert.equal(canControlActor(state.actors.livia, "player", state), false);
  // Mira: not in the lanterns any more for the player, still theirs to play in Rovine.
  assert.equal(canControlActor(state.actors.mira, "player", state), false, "lanterns in play");
  cm.launchCampaign(state, id, "dm", NOW);
  cm.completeLaunch(state);
  assert.equal(canControlActor(state.actors.mira, "player", state), true, "seated in Rovine");
  assert.equal(
    canControlActor(state.actors.livia, "player", state),
    false,
    "Livia stays view-only while she stays in a campaign the player left",
  );
  cm.launchCampaign(state, "lanterns", "dm", NOW);
  cm.completeLaunch(state);
  // The DM takes Livia out of the lanterns (Deactivate): the sheet is fully the owner's again.
  cm.setSeatActive(state, "lanterns", "livia", false, "dm", NOW);
  assert.equal(canControlActor(state.actors.livia, "player", state), true);
  assert.equal(cm.seatBlock(state, state.actors.livia, "player"), null);
});

test("Review 2 P2: a co-DM moves the campaign creatures; private creatures stay private", () => {
  const state = seeded();
  const goblin = () => state.actors["goblin-1"];
  assert.equal(canControlActor(goblin(), "player", state), false);
  cm.setMemberRole(state, "lanterns", "player", "co-dm", "dm", NOW);
  assert.equal(canViewActor(goblin(), "player", state), true);
  assert.equal(canControlActor(goblin(), "player", state), true);
  state.actors.secret = { ...structuredClone(goblin()), id: "secret", visibility: "private" };
  assert.equal(canViewActor(state.actors.secret, "player", state), false);
  cm.setMemberRole(state, "lanterns", "player", "player", "dm", NOW);
  assert.equal(canControlActor(goblin(), "player", state), false);
  const ctx = harness();
  cm.handleAction(ctx, "role", { id: "lanterns", target: "player", role: "co-dm" });
  assert.match(ctx.modal.body, /Muovere e far agire le creature della campagna al Tavolo/);
  assert.match(ctx.modal.body, /Avviare la campagna/);
});

test("Review 2 P2: only a DM or co-DM launches; players see why a campaign is not in play", () => {
  const { state, id } = joined();
  refusal(() => cm.launchCampaign(state, id, "player", NOW), /Solo il DM o un co-DM avvia/);
  assert.equal(state.campaign.id, "lanterns");
  const ctx = harness({ state, role: "player" });
  ctx.render();
  const card = ctx.html.slice(ctx.html.indexOf("Rovine di Vetro") - 2000);
  assert.doesNotMatch(ctx.html, new RegExp(`data-cm="launch" data-id="${id}"`));
  assert.match(card, /la avvia il DM/);
  assert.match(ctx.html, /data-cm="enter-table" data-id="lanterns"/, "the one in play opens");
  const home = cm.renderHomeWidget(ctx);
  assert.doesNotMatch(home, /data-cm="launch"/);
  assert.match(home, new RegExp(`data-cm="details" data-id="${id}"`));
  ctx.navigate("campaigns", { id });
  assert.match(ctx.html, /Non in corso: la avvia il DM/);
  ctx.role = "dm";
  ctx.render();
  assert.match(ctx.html, new RegExp(`data-cm="launch" data-id="${id}"`));
});

test("Review 2 P2: membership commands keep everyone's Undo and an earlier Undo keeps them", () => {
  const ctx = storeCtx();
  const token = (actorId) =>
    ctx.state.scenes[0].tokens.find((entry) => entry.actorId === actorId) ?? null;
  const id = createThroughDialog(ctx, "Rovine di Vetro");
  const link = cm.handleForm(ctx, "link", form({ role: "player", hours: "48", uses: "5" }), {
    dataset: { id },
  });
  ctx.commit("Movimento confermato", (draft) => {
    draft.scenes[0].tokens.find((entry) => entry.actorId === "goblin-1").x = 570;
  });
  assert.equal(ctx.history.length, 1);
  // The player joins the parked Rovine with Mira.
  ctx.role = "player";
  cm.handleForm(ctx, "join", form({ actorId: "mira" }), {
    dataset: { code: link.code, path: "own" },
  });
  ctx.modal.options.onSubmit(form({}));
  assert.ok(ctx.state.actors.mira.campaignIds.includes(id));
  assert.equal(ctx.history.length, 1, "joining keeps the DM's Undo");
  // The DM deactivates Doran in the lanterns: his token leaves the map.
  ctx.role = "dm";
  cm.handleAction(ctx, "deactivate", { id: "lanterns", actor: "doran" });
  assert.equal(token("doran"), null);
  ctx.undo();
  assert.equal(token("goblin-1").x, 620, "the move is undone");
  assert.ok(ctx.state.actors.mira.campaignIds.includes(id), "the join stays");
  assert.deepEqual(cm.playedBy(ctx.state, id, "player"), ["mira"]);
  assert.equal(token("doran"), null, "the deactivation stays");
  assert.ok(!ctx.state.actors.doran.campaignIds.includes("lanterns"));
  // A premade created by a join survives an earlier Undo too.
  ctx.commit("Movimento confermato", (draft) => {
    draft.scenes[0].tokens.find((entry) => entry.actorId === "goblin-2").x = 700;
  });
  ctx.role = "player";
  cm.handleForm(ctx, "join", form({ premadeId: "premade-fighter", name: "Brenna" }), {
    dataset: { code: link.code, path: "premade" },
  });
  ctx.modal.options.onSubmit(form({}));
  const brenna = Object.values(ctx.state.actors).find((actor) => actor.name === "Brenna");
  ctx.role = "dm";
  ctx.undo();
  assert.equal(token("goblin-2").x, 740);
  assert.ok(ctx.state.actors[brenna.id], "the premade stays");
  // A launch still starts a new visit.
  cm.handleAction(ctx, "launch", { id });
  assert.equal(ctx.history.length, 0);
});

test("Review 2 P2: membership delta replays list changes, created sheets and removed tokens", () => {
  const before = {
    actors: { a: { id: "a", controllers: ["dm"], campaignIds: ["lanterns"], hp: 5 } },
    scenes: [
      {
        id: "s",
        tokens: [
          { id: "t1", actorId: "a" },
          { id: "t2", actorId: "b" },
        ],
      },
    ],
  };
  const after = structuredClone(before);
  after.actors.a.controllers = ["dm", "player"];
  after.actors.a.campaignIds = [];
  after.actors.n = { id: "n", name: "Nuova" };
  after.scenes[0].tokens = [{ id: "t2", actorId: "b" }];
  const delta = cm.membershipDelta(before, after);
  const snapshot = structuredClone(before);
  snapshot.actors.a.hp = 9;
  snapshot.actors.a.controllers = ["dm", "other"];
  cm.applyMembershipDelta(snapshot, delta);
  assert.deepEqual(snapshot.actors.a, {
    id: "a",
    controllers: ["dm", "other", "player"],
    campaignIds: [],
    hp: 9,
  });
  assert.deepEqual(snapshot.actors.n, { id: "n", name: "Nuova" });
  assert.deepEqual(
    snapshot.scenes[0].tokens.map((entry) => entry.id),
    ["t2"],
  );
  assert.equal(cm.membershipDelta(before, structuredClone(before)), null);
});

test("Review 2 P1/P3: the owner entrusts creatures (not a full DM handover); refused approval unticks; labelled choices", () => {
  const ctx = harness({ view: { id: "lanterns", tab: "manage" } });
  ctx.render();
  // P10 CA-57: the Owlbear GM hand-off label; R7: the recipient runs the whole session.
  assert.match(ctx.html, /Cedi il ruolo di DM per la sessione…/);
  assert.match(
    ctx.html,
    /guida tutta la sessione al Tavolo \(combattimento, scene, Preparazione, pausa, conto alla rovescia, orologi\)/,
  );
  // Offline: the approval box is put back as the setting is.
  ctx.offline = true;
  const handlers = {};
  cm.bindArea(
    {
      addEventListener: (type, fn) => (handlers[type] = fn),
      querySelector: () => null,
      contains: () => true,
    },
    ctx,
  );
  const box = {
    checked: true,
    dataset: { cmApproval: "lanterns" },
    matches: (selector) => selector === "[data-cm-approval]",
  };
  handlers.change({ target: box });
  assert.equal(box.checked, false);
  assert.equal(cm.metaOf(ctx.state, "lanterns").approval, false);
  assert.equal(ctx.toasts.at(-1).error, true);
  // Join choices are a named radio group.
  ctx.offline = false;
  const id = cm.createCampaign(ctx.state, { name: "Rovine di Vetro" }, "dm", NOW);
  const link = cm.createInviteLink(
    ctx.state,
    id,
    { role: "player", hours: 48, uses: 5 },
    "dm",
    Date.now(), // UI renders read the real clock
  );
  ctx.role = "player";
  ctx.navigate("campaigns", { tab: "join", id: link.code });
  cm.handleAction(ctx, "join-path", { code: link.code, path: "own" });
  assert.match(ctx.html, /role="radiogroup" aria-label="I tuoi personaggi"/);
});
