// B29 — account, profile and personal data: domain rules and UI handlers.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import { esc, icon } from "../ui.mjs";
import { createRegistry } from "../registry.mjs";
import * as content from "../campaign-content.mjs";
import * as conditions from "../conditions.mjs";
import * as members from "../campaign-members.mjs";
import * as chat from "../chat-domain.mjs";
import * as chatUI from "../chat.mjs";
import * as N from "../notifications.mjs";
import { seedSafety } from "../safety-domain.mjs";
import * as account from "../account.mjs";

afterEach(() => account.resetAccountView());
const NOW = Date.parse("2026-09-24T10:00:00Z");
const DAY = 24 * 3600 * 1000;
const SRD = { kind: "srd", edition: "2024", revision: "srd-5.2.1" };

// The account area with the campaign membership area (B13) it reads campaigns from.
function makeState({ notifications = false, areas = [] } = {}) {
  const registry = createRegistry({ logger: null, document: null });
  registry.use("account", account.register);
  registry.use(members.ID, members.register);
  if (notifications) registry.use("notifications", N.register);
  for (const [id, register] of areas) registry.use(id, register);
  const state = createInitialState();
  registry.initState(state);
  return { state, registry };
}
function note(state, id, body, who) {
  const d = content.createCampaignDraft(state, { id, kind: "note" }, who);
  content.saveCampaignDraft(
    state,
    id,
    { data: { ...d.data, title: id, body }, access: d.access, expectedDraftRevision: d.revision },
    who,
  );
  const preview = content.previewCampaignDraft(state, id, who);
  assert.equal(preview.canApply, true, JSON.stringify(preview.errors));
  content.applyCampaignDraft(state, id, { reviewKey: preview.reviewKey }, who);
}
let operation = 0;
function condition(state, actorId, selection, who) {
  const preview = conditions.previewConditionChange(state, actorId, selection, who);
  assert.equal(preview.canApply, true, JSON.stringify(preview.errors));
  conditions.applyConditionChange(state, actorId, selection, who, {
    operationId: `account-op-${++operation}`,
    reviewKey: preview.reviewKey,
  });
}
const apply = (conditionId, extra = {}) => ({
  kind: "apply",
  conditionId,
  source: SRD,
  term: { kind: "manual" },
  mode: "record",
  ...extra,
});
const refusal = (fn, pattern) =>
  assert.throws(fn, (error) => {
    assert.ok(error.it && error.en, "refusal carries {it, en}");
    if (pattern) assert.match(error.it + " " + error.en, pattern);
    return true;
  });
const deletionInput = (extra = {}) => ({
  typed: "ELIMINA ACCOUNT",
  acknowledged: true,
  confirmWith: "email",
  now: NOW,
  ...extra,
});

test("registration: page, header service, home notice, search, commands, guard, slice", () => {
  const { state, registry } = makeState();
  assert.equal(registry.report().failed.length, 0);
  assert.ok(registry.get("route", "account"));
  const service = registry.get("service", "account");
  assert.equal(service.header, true);
  assert.equal(service.order, 50);
  assert.ok(registry.get("home-widget", "account-status"));
  assert.ok(registry.get("draft-guard", "account-name"));
  assert.ok(registry.get("command", "account.open") && registry.get("command", "account.export"));
  assert.deepEqual(Object.keys(state.ext.account.profiles).sort(), ["dm", "player"]);
  assert.equal(state.extVersions.account, account.SLICE_VERSION);
  // Seeding changes nothing outside the slice: member names stay the core ones.
  assert.deepEqual(
    state.campaign.members.map((m) => m.name),
    ["Giocatore / Player", "DM"],
  );
  const ctx = { role: "player", lang: "it", state };
  const results = registry.search(ctx, "esporta");
  assert.deepEqual(
    results.map((r) => [r.page, r.params.tab]),
    [["account", "data"]],
  );
});

test("normalize keeps valid data, drops malformed avatars, closes an old trial and refuses a future version", () => {
  const seed = account.seedAccount(NOW);
  seed.profiles.player.avatars.push(
    { id: "bad", kind: "image", src: "javascript:alert(1)" },
    { id: "ok", kind: "emblem", color: "rose", glyph: "sword" },
  );
  seed.profiles.player.activeAvatarId = "bad";
  // A "trial visit" saved by the first version was not a sandbox: it reopens signed out.
  seed.profiles.player.session = "guest";
  seed.profiles.player.guestName = "Ospite";
  delete seed.profiles.dm;
  const out = account.normalizeAccount(seed, 1, NOW);
  assert.deepEqual(
    out.profiles.player.avatars.map((a) => a.id),
    ["initials", "ok"],
  );
  assert.equal(out.profiles.player.activeAvatarId, "initials");
  assert.equal(out.profiles.player.session, "signed-out");
  assert.equal("guestName" in out.profiles.player, false);
  assert.ok(out.profiles.dm, "missing identity reseeded");
  assert.deepEqual(account.normalizeAccount(out, 1, NOW), out, "idempotent");
  assert.throws(() => account.normalizeAccount(out, 2, NOW), /newer version/);
});

test("display name: validation, publication to every campaign, journal author, restore", () => {
  const { state } = makeState();
  // A second campaign the DM owns but has not launched (B13 parks it).
  const tower = members.createCampaign(state, { name: "La torre di sale" }, "dm", NOW);
  refusal(() => account.setDisplayName(state, "dm", " M "), /2 a 32/);
  refusal(() => account.setDisplayName(state, "dm", "!!!"), /lettera/);
  refusal(() => account.setDisplayName(state, "dm", "DM"), /già questo/);
  // "Save" on the unchanged default, in either language, is no change (review P3).
  refusal(() => account.setDisplayName(state, "player", " Giocatore "), /già questo/);
  refusal(() => account.setDisplayName(state, "player", "Player"), /già questo/);
  assert.equal(account.profileOf(state, "player").nameHistory.length, 0);
  // " / " separates the bilingual default; role words would read as the DM in chat.
  refusal(() => account.setDisplayName(state, "player", "Anna / Annie"), /separa/);
  for (const word of ["DM", "gm", "Dungeon Master", "Co-DM", "Account eliminato"])
    refusal(() => account.setDisplayName(state, "player", word), /ruolo/);
  account.setDisplayName(state, "dm", "  Marco   il Custode ", { now: NOW });
  assert.equal(account.displayNameOf(state, "dm"), "Marco il Custode");
  const current = content.getCampaignMembers(state, "lanterns", "player");
  const dm = current.find((m) => m.id === "dm");
  assert.equal(dm.name, "Marco il Custode");
  assert.equal("avatar" in dm, false, "the avatar is read from the account, not copied");
  assert.deepEqual(account.publishedAvatar(state, "dm"), { kind: "initials", color: "gold" });
  // The parked campaign's member record carries the new name too (chat reads it there
  // once the campaign is launched).
  assert.equal(members.memberOf(state, tower, "dm").name, "Marco il Custode");
  // The legacy recap is authored by the DM: the member list names the author.
  const recap = content.listCampaignEntries(state, {}, "player").find((e) => e.kind === "recap");
  assert.equal(current.find((m) => m.id === recap.ownerId).name, "Marco il Custode");
  assert.equal(chat.memberName(state, "dm", "it"), "Marco il Custode");
  // Correction: restore the original member name, then restore the restore.
  const [first] = account.profileOf(state, "dm").nameHistory;
  assert.equal(first.displayName, null);
  assert.equal(first.memberName, "DM");
  account.restoreDisplayName(state, "dm", first.id, { now: NOW + 1000 });
  assert.equal(content.getCampaignMembers(state, "lanterns", "dm")[1].name, "DM");
  assert.equal(members.memberOf(state, tower, "dm").name, "DM");
  assert.equal(account.profileOf(state, "dm").displayName, null);
  const back = account.profileOf(state, "dm").nameHistory.at(-1);
  assert.equal(back.displayName, "Marco il Custode");
  account.restoreDisplayName(state, "dm", back.id, { now: NOW + 2000 });
  assert.equal(content.getCampaignMembers(state, "lanterns", "dm")[1].name, "Marco il Custode");
  // The bilingual demo default is split by language, as B13 and the chat show it.
  assert.equal(account.displayNameOf(state, "player", "it"), "Giocatore");
  assert.equal(account.displayNameOf(state, "player", "en"), "Player");
  // Another member's name (in either language, any case) is not available.
  refusal(() => account.setDisplayName(state, "player", "marco il custode"), /altro membro/);
  refusal(() => account.setDisplayName(state, "dm", "Player"), /altro membro/);
  account.setDisplayName(state, "player", "Chiara", { now: NOW });
  assert.equal(chat.memberName(state, "player", "en"), "Chiara");
  // Restoring an earlier name is refused when someone else took it meanwhile.
  account.setDisplayName(state, "dm", "Oswin", { now: NOW + 3000 });
  const marco = account
    .profileOf(state, "dm")
    .nameHistory.findLast((h) => h.displayName === "Marco il Custode");
  account.setDisplayName(state, "player", "Marco il Custode", { now: NOW + 4000 });
  refusal(() => account.restoreDisplayName(state, "dm", marco.id), /altro membro/);
});

test("avatars: several kept, switch, delete with restore, fallback and limits", () => {
  const { state } = makeState();
  const emblem = account.addAvatar(state, "player", {
    kind: "emblem",
    color: "rose",
    glyph: "sword",
  });
  const image = account.addAvatar(state, "player", {
    kind: "image",
    src: "data:image/png;base64,iVBORw0KGgo=",
  });
  let p = account.profileOf(state, "player");
  assert.equal(p.activeAvatarId, image.id, "a new avatar is used at once");
  assert.equal(account.publishedAvatar(state, "player").kind, "image");
  account.selectAvatar(state, "player", emblem.id);
  assert.deepEqual(account.publishedAvatar(state, "player"), {
    kind: "emblem",
    color: "rose",
    glyph: "sword",
  });
  refusal(() => account.selectAvatar(state, "player", emblem.id), /già/);
  refusal(() => account.removeAvatar(state, "player", "initials"), /riserva/);
  account.removeAvatar(state, "player", emblem.id, { now: NOW });
  p = account.profileOf(state, "player");
  assert.equal(p.activeAvatarId, "initials");
  assert.equal(account.publishedAvatar(state, "player").kind, "initials");
  account.restoreRemovedAvatar(state, "player");
  p = account.profileOf(state, "player");
  assert.equal(p.activeAvatarId, emblem.id, "restore brings back the one in use");
  assert.equal(p.removedAvatar, null);
  refusal(() => account.restoreRemovedAvatar(state, "player"), /Nessun avatar/);
  refusal(
    () => account.addAvatar(state, "player", { kind: "image", src: "https://example.test/a.png" }),
    /non validi/,
  );
  for (let i = 0; i < 3; i++)
    account.addAvatar(state, "player", { kind: "emblem", color: "sky", glyph: "map" });
  refusal(
    () => account.addAvatar(state, "player", { kind: "emblem", color: "sky", glyph: "map" }),
    /6 avatar/,
  );
  refusal(() => account.validateAvatarFile({ type: "image/svg+xml", size: 10 }), /Formato/);
  refusal(
    () => account.validateAvatarFile({ type: "image/png", size: 3.4 * 1024 * 1024 }),
    /3,4 MB/,
  );
  refusal(() => account.validateAvatarFile({ type: "image/png", size: 0 }), /vuoto/);
  assert.equal(account.validateAvatarFile({ type: "image/webp", size: 2048 }), true);
});

test("avatar markup: B13 initials, escaping, safe images and another area's own box", () => {
  // Same initials as the campaign member list (B13): first two words, or two letters.
  assert.match(account.avatarHTML(null, "Chiara Rossi"), />CR</);
  assert.match(account.avatarHTML(null, "Marco il Custode"), />MI</);
  assert.match(account.avatarHTML(null, "Giocatore"), />GI</);
  assert.match(account.avatarHTML(null, "élodie / ümit"), />ÉÜ</);
  assert.match(account.avatarHTML(null, "<b>"), />B</);
  assert.match(account.avatarHTML(null, "!!"), />\?</);
  assert.match(account.avatarHTML(null, "DM"), />DM</);
  const unsafe = account.avatarHTML({ kind: "image", src: 'x" onerror="alert(1)' }, "Livia");
  assert.doesNotMatch(unsafe, /onerror/);
  assert.match(account.avatarHTML({ kind: "emblem", glyph: "dice", color: "gold" }, "X"), /<svg/);
  // Inside B13's "cm-avatar" box: that class keeps size and border, the colour is inline.
  const boxed = account.avatarHTML({ kind: "emblem", glyph: "sword", color: "violet" }, "M", {
    className: 'cm-avatar" onclick="x',
  });
  assert.match(
    boxed,
    /^<span class="cm-avatar onclickx account-avatar-in" style="background:#bba3dc;/,
  );
  assert.match(boxed, /<svg/);
});

test("member list (B13) and chat (B17) draw the published name and avatar", () => {
  const { state, registry } = makeState();
  account.setDisplayName(state, "dm", "Marco il Custode");
  account.addAvatar(state, "dm", { kind: "emblem", glyph: "sword", color: "violet" });
  const ctx = {
    state,
    role: "player",
    lang: "it",
    view: { page: "campaign", tab: members.ID },
    registry,
    esc,
    icon,
    t: (it) => it,
    label: (v) => (typeof v === "object" && v ? v.it : String(v ?? "")),
  };
  const row = members
    .renderMembersSection(ctx)
    .match(/<li class="cm-member">(?:(?!<\/li>)[\s\S])*Marco il Custode[\s\S]*?<\/li>/)?.[0];
  assert.ok(row, "B13 lists the DM under the published name");
  assert.match(
    row,
    /class="cm-avatar account-avatar-in" style="background:#bba3dc;[^"]*"[^>]*><svg/,
  );
  const message = {
    id: "m-account",
    seq: 1,
    at: new Date(NOW).toISOString(),
    kind: "ooc",
    author: "dm",
    speaker: { type: "user", id: "dm" },
    text: "Ci fermiamo alle 23.",
  };
  const line = chatUI.itemHTML(ctx, chat.projectMessage(state, message, "player", { lang: "it" }));
  assert.match(line, /class="chat-avatar chat-avatar-user account-avatar-in"[^>]*><svg/);
  assert.match(line, /<strong>Marco il Custode<\/strong>/);
  // The account preview "Come ti vedono gli altri" uses the same two sources.
  const shown = account.memberDisplay(state, "dm", "player");
  assert.equal(shown.name, "Marco il Custode");
  assert.deepEqual(shown.avatar, account.publishedAvatar(state, "dm"));
});

test("sign-in methods are a demonstration list; Discord is a linked service, never a login", () => {
  const { state } = makeState();
  assert.equal(Object.hasOwn(account.PROVIDERS, "discord"), false);
  refusal(
    () =>
      account.addSignInMethod(state, "dm", "google", {}) &&
      account.addSignInMethod(state, "dm", "google"),
    /già collegato/,
  );
  refusal(() => account.addSignInMethod(state, "dm", "email", { label: "x" }), /già collegato/);
  const dm = account.profileOf(state, "dm");
  assert.deepEqual(
    dm.signIn.map((m) => m.provider),
    ["email", "google"],
  );
  assert.equal(account.maskedLabel(dm.signIn[0]), "d•••@example.test");
  account.removeSignInMethod(state, "dm", dm.signIn[1].id);
  refusal(() => account.removeSignInMethod(state, "dm", dm.signIn[0].id), /unico metodo/);
  // DM has Discord linked in the example; unlinking keeps every sign-in method.
  account.unlinkService(state, "dm", "discord");
  assert.equal(account.profileOf(state, "dm").signIn.length, 1);
  refusal(() => account.linkService(state, "player", "discord", "Bad Name!"), /non valido/);
  account.linkService(state, "player", "discord", "@chiara_d20", { now: NOW });
  assert.equal(account.profileOf(state, "player").linked[0].handle, "chiara_d20");
  // Signing in with Discord is impossible: it is not a provider of the account.
  account.signOut(state, "player");
  refusal(() => account.setDisplayName(state, "player", "Chiara"), /Accedi prima/);
  refusal(() => account.signIn(state, "player", "discord"), /Nessun account/);
  refusal(() => account.signIn(state, "player", "apple"), /Nessun account/);
  account.signIn(state, "player", "google", { now: NOW });
  assert.equal(account.profileOf(state, "player").session, "account");
  assert.equal(account.profileOf(state, "player").lastSeenAt, new Date(NOW).toISOString());
});

test("last access: the campaign's own record (B13), shown to others only with consent", () => {
  const { state } = makeState();
  const seen = () => account.memberDisplay(state, "dm", "player");
  const campaignAccess = members.metaOf(state, "lanterns").lastAccess.dm;
  assert.ok(campaignAccess, "B13 seeds the DM's last access to the campaign");
  assert.equal(account.profileOf(state, "dm").privacy.showLastSeen, false);
  assert.equal(seen().lastSeenAt, null);
  assert.equal(members.lastSeenVisible(state, "dm", "player"), false, "B13 agrees");
  assert.equal(account.memberDisplay(state, "dm", "dm").lastSeenAt, campaignAccess);
  account.setLastSeenSharing(state, "dm", true);
  // One value for one viewer: the same timestamp B13's member row shows.
  assert.equal(seen().lastSeenAt, campaignAccess);
  assert.notEqual(seen().lastSeenAt, account.profileOf(state, "dm").lastSeenAt);
  assert.equal(members.lastSeenVisible(state, "dm", "player"), true);
  refusal(() => account.setLastSeenSharing(state, "dm", true), /già/);
  account.setLastSeenSharing(state, "dm", false);
  assert.equal(seen().lastSeenAt, null);
  // Private account data never reaches the member projection.
  assert.deepEqual(Object.keys(seen()).sort(), [
    "avatar",
    "id",
    "lastSeenAt",
    "name",
    "role",
    "self",
    "sharesLastSeen",
  ]);
  assert.equal(seen().role, "owner");
});

test("deletion: every campaign, transfers, identity check, typed confirmation, recovery window", () => {
  const { state } = makeState();
  note(state, "player-secret", "Solo mio: la chiave è sotto il ponte.", "player");
  const player = account.deletionConsequences(state, "player");
  assert.deepEqual(
    player.campaigns.map((c) => [c.id, c.role, c.transfer]),
    [["lanterns", "player", false]],
  );
  assert.deepEqual(
    player.characters.map((c) => [c.name, c.inCampaign, c.newDm]),
    [
      ["Livia", true, false],
      ["Mira", true, false],
    ],
  );
  assert.equal(player.privateNotes, 1);
  // The DM also owns a parked campaign with nobody else in it (B13).
  const tower = members.createCampaign(state, { name: "La torre di sale" }, "dm", NOW);
  const dm = account.deletionConsequences(state, "dm");
  assert.deepEqual(
    dm.campaigns.map((c) => [c.id, c.role, c.transfer, c.deletedWithAccount]),
    [
      ["lanterns", "owner", true, false],
      [tower, "owner", false, true],
    ],
  );
  assert.deepEqual(dm.campaigns[0].candidates, [{ id: "player", name: "Giocatore" }]);
  assert.deepEqual(
    dm.characters.map((c) => [c.name, c.inCampaign, c.newDm]),
    [["Doran", true, true]],
  );
  assert.deepEqual(dm.linked, ["Discord"]);
  assert.deepEqual(dm.methods, ["email"]);
  const base = deletionInput();
  refusal(
    () => account.requestDeletion(state, "dm", { ...base, acknowledged: false }),
    /conseguenze/,
  );
  refusal(() => account.requestDeletion(state, "dm", base), /trasferire/);
  refusal(
    () => account.requestDeletion(state, "dm", { ...base, transfers: { lanterns: "dm" } }),
    /trasferire/,
  );
  const transfers = { lanterns: "player" };
  // Identity check with one of the account's own methods (DDB-188).
  refusal(
    () => account.requestDeletion(state, "dm", { ...base, transfers, confirmWith: undefined }),
    /identità/,
  );
  refusal(
    () => account.requestDeletion(state, "dm", { ...base, transfers, confirmWith: "google" }),
    /identità/,
  );
  refusal(
    () => account.requestDeletion(state, "dm", { ...base, transfers, typed: "elimina account" }),
    /ELIMINA ACCOUNT/,
  );
  const deletion = account.requestDeletion(state, "dm", {
    ...base,
    lang: "en",
    typed: "DELETE ACCOUNT",
    transfers,
  });
  assert.equal(Date.parse(deletion.recoverUntil) - NOW, 30 * DAY);
  assert.deepEqual(deletion.transfers, { lanterns: "player" });
  assert.equal(deletion.confirmedWith, "email");
  // The planned transfer is B13's own offer (VTL-040): the new DM finds it in Campaigns
  // and in the bell, and decides; the DM stays owner until then.
  const offer = members.metaOf(state, "lanterns").transfer;
  assert.deepEqual([offer.status, offer.from, offer.to], ["pending", "dm", "player"]);
  assert.deepEqual(deletion.offers, { lanterns: { id: offer.id, existing: false } });
  assert.deepEqual(
    members.incomingFor(state, "player").map((item) => [item.kind, item.campaignId]),
    [["transfer", "lanterns"]],
  );
  assert.equal(account.transferStatus(state, "dm", "lanterns"), "pending");
  // Nothing else changed: the campaigns, their DM and the characters are intact meanwhile.
  assert.equal(state.campaign.members.find((m) => m.id === "dm").role, "dm");
  assert.equal(members.roleOf(state, "lanterns", "dm"), "owner");
  assert.equal(members.roleOf(state, tower, "dm"), "owner");
  assert.ok(state.actors.doran);
  refusal(() => account.setDisplayName(state, "dm", "Nuovo nome"), /in eliminazione/);
  refusal(() => account.requestDeletion(state, "dm", base), /già programmata/);
  refusal(() => account.cancelDeletion(state, "dm", { now: NOW + 31 * DAY }), /scaduta/);
  // Cancelling revokes the offer this request made.
  assert.equal(account.cancelDeletion(state, "dm", { now: NOW + DAY }), 1);
  assert.equal(account.profileOf(state, "dm").deletion, null);
  assert.equal(members.metaOf(state, "lanterns").transfer.status, "revoked");
  assert.deepEqual(members.incomingFor(state, "player"), []);
  account.setDisplayName(state, "dm", "Nuovo nome");
  // An offer the DM had already made is reused and survives a cancelled deletion.
  members.proposeTransfer(state, "lanterns", "player", "dm", NOW + 2 * DAY);
  assert.equal(account.deletionConsequences(state, "dm").campaigns[0].pendingTo, "player");
  account.requestDeletion(state, "dm", { ...base, transfers });
  assert.equal(account.profileOf(state, "dm").deletion.offers.lanterns.existing, true);
  assert.equal(account.cancelDeletion(state, "dm", { now: NOW + DAY }), 0);
  assert.equal(members.metaOf(state, "lanterns").transfer.status, "pending");
  // An offer waiting for someone else must be chosen again or revoked first.
  members.metaOf(state, "lanterns").transfer.to = "ghost";
  refusal(() => account.requestDeletion(state, "dm", { ...base, transfers }), /già una proposta/);
  members.revokeTransfer(state, "lanterns", "dm", NOW + 3 * DAY);
  // An accepted offer is final: the player now owns the campaign.
  account.requestDeletion(state, "dm", { ...base, transfers });
  members.answerTransfer(state, "lanterns", true, "player", NOW + 4 * DAY);
  assert.equal(account.transferStatus(state, "dm", "lanterns"), "accepted");
  assert.equal(members.roleOf(state, "lanterns", "player"), "owner");
  assert.equal(account.cancelDeletion(state, "dm", { now: NOW + 5 * DAY }), 0);
});

test("deletion: only an active campaign with a co-DM or player to receive it is handed over", () => {
  const { state } = makeState();
  const tower = members.createCampaign(state, { name: "La torre di sale" }, "dm", NOW);
  members.setCampaignStatus(state, tower, "archived", "dm", NOW);
  const dm = account.deletionConsequences(state, "dm");
  assert.deepEqual(
    dm.campaigns.map((c) => [c.id, c.status, c.transfer, c.deletedWithAccount]),
    [
      ["lanterns", "active", true, false],
      [tower, "archived", false, true],
    ],
  );
  // B13 never hands ownership to an observer: with only an observer left, the campaign
  // (and the DM's own sheets in it) goes with the account.
  members.setMemberRole(state, "lanterns", "player", "observer", "dm", NOW);
  const alone = account.deletionConsequences(state, "dm");
  assert.deepEqual(alone.campaigns[0].candidates, []);
  assert.equal(alone.campaigns[0].deletedWithAccount, true);
  assert.deepEqual(
    alone.characters.map((c) => [c.name, c.inCampaign, c.withCampaign]),
    [["Doran", false, true]],
  );
});

test("deletion: a removed player's sheets still in the campaign stay there, not deleted", () => {
  const { state } = makeState();
  members.removeMember(state, "lanterns", "player", { reason: "" }, "dm", NOW);
  const player = account.deletionConsequences(state, "player");
  assert.deepEqual(player.campaigns, []);
  assert.deepEqual(
    player.characters.map((c) => [c.name, c.inCampaign, c.withCampaign]),
    [
      ["Livia", true, false],
      ["Mira", true, false],
    ],
  );
});

test("export: the personal safety profile (B27) belongs to its owner's file only", () => {
  const { state } = makeState();
  state.ext.safety = seedSafety();
  const dm = account.buildPersonalExport(state, "dm", { now: NOW });
  assert.deepEqual(
    [dm.safety.lines.map((l) => l.topic), dm.safety.veils.map((v) => v.topic)],
    [["child-harm"], ["torture"]],
  );
  assert.equal(account.exportSummary(state, "dm").safety, 2);
  const player = account.buildPersonalExport(state, "player", { now: NOW });
  assert.equal(player.safety, null);
  assert.doesNotMatch(JSON.stringify(player), /child-harm|torture/);
  assert.equal(dm.notIncluded.includes("safety"), false);
});

test("export contains only the identity's own data, as that identity sees it", () => {
  const { state } = makeState();
  note(state, "dm-secret", "Il traditore è Oswin.", "dm");
  note(state, "player-note", "Chiedere a Doran del faro.", "player");
  state.actors.livia.personalPlans = { player: ["Salire sulla torre"], dm: ["Imboscata DM"] };
  state.actors.doran.personalPlans = { player: ["Chiedere il faro"], dm: ["Tradire"] };
  // The DM applies a private condition and a condition whose origin stays private.
  condition(
    state,
    "livia",
    apply("charmed", { visibility: "private", origin: { label: "SECRET-CHARM" } }),
    "dm",
  );
  condition(
    state,
    "livia",
    apply("frightened", {
      sourceVisibility: "private",
      source: { kind: "homebrew", revision: "SECRET-REV" },
      origin: { actorId: "goblin-1", label: "Veleno segreto di Oswin" },
    }),
    "dm",
  );
  state.characterDrafts = [
    { id: "d-player", owner: "player", status: "active" },
    { id: "d-dm", owner: "dm", status: "active" },
  ];
  state.ext["core-settings"] = {
    personal: { player: { a: 1 }, dm: { secret: true } },
    campaign: {},
  };
  state.log.push(
    {
      id: "l1",
      time: "t",
      label: "Player did",
      controller: "player",
      kind: "change",
      visibility: "private",
    },
    {
      id: "l2",
      time: "t",
      label: "DM hid a trap",
      controller: "dm",
      kind: "change",
      visibility: "private",
    },
  );
  const data = account.buildPersonalExport(state, "player", { now: NOW });
  const text = JSON.stringify(data);
  assert.equal(data.format, "d20-studio-personal-data");
  assert.deepEqual(
    data.characters.map((c) => c.id),
    ["livia", "mira"],
  );
  assert.match(text, /Chiedere a Doran del faro/);
  assert.match(text, /Salire sulla torre/);
  assert.deepEqual(data.plansOnOtherSheets, [{ actorId: "doran", plans: ["Chiedere il faro"] }]);
  // The visible condition is there, with its private origin and source withheld.
  const livia = data.characters[0];
  const frightened = livia.conditions.instances.find((i) => i.id === "frightened");
  assert.equal(frightened.sourceHidden, true);
  assert.equal(frightened.origin, null);
  assert.equal(frightened.source, null);
  assert.equal(livia.sheet.name, "Livia");
  for (const foreign of [
    "Il traditore è Oswin",
    "Imboscata DM",
    "Tradire",
    "DM hid a trap",
    "d-dm",
    "secret",
    "dm@example.test",
    "custode_bruma",
    "SECRET-CHARM",
    "charmed",
    "Veleno segreto di Oswin",
    "SECRET-REV",
    "goblin-1",
  ])
    assert.equal(text.includes(foreign), false, `export leaks ${foreign}`);
  // The DM still sees both applications on the sheet: the export hid them, not the game.
  assert.ok(conditions.hasCondition(state.actors.livia, "charmed"));
  assert.deepEqual(data.personalSettings, { a: 1 });
  assert.deepEqual(
    data.activity.map((a) => a.label),
    ["Player did"],
  );
  assert.deepEqual(
    data.memberships.map((m) => [m.campaignId, m.role]),
    [["lanterns", "player"]],
  );
  assert.equal(
    account.exportFileName("player", NOW),
    "d20-studio-dati-personali-player-2026-09-24.json",
  );
  assert.equal(
    account.exportFileName("player", NOW, "en"),
    "d20-studio-personal-data-player-2026-09-24.json",
  );
  const summary = account.exportSummary(state, "player");
  assert.equal(summary.notes, 1);
  assert.deepEqual(summary.characters, ["Livia", "Mira"]);
  // Every campaign the DM belongs to is listed, parked ones included.
  const tower = members.createCampaign(state, { name: "La torre di sale" }, "dm", NOW);
  assert.deepEqual(
    account.buildPersonalExport(state, "dm").memberships.map((m) => [m.campaignId, m.role]),
    [
      ["lanterns", "owner"],
      [tower, "owner"],
    ],
  );
});

test("the pending-deletion notice reaches the bell of the person who requested it (B24)", () => {
  N.resetNotificationsMemory();
  N.setNotificationsStorage(null);
  const { state, registry } = makeState({ notifications: true });
  const ctx = {
    state,
    role: "dm",
    lang: "it",
    view: { page: "account" },
    registry,
    esc,
    icon,
    t: (it) => it,
    label: (v) => (typeof v === "object" && v ? v.it : String(v ?? "")),
    toast() {},
  };
  registry.attach(ctx);
  N.observeNotifications(ctx, { announce: false });
  account.requestDeletion(state, "dm", deletionInput({ transfers: { lanterns: "player" } }));
  // The change is the DM's own: B24 records the arrival as caused by the DM.
  N.observeNotifications(ctx, { by: "dm", announce: false });
  const item = N.centreModel(ctx).items.find((i) => i.key.includes("account-deletion"));
  assert.ok(item, "the requester sees the notice in the centre");
  assert.equal(item.by, null);
  assert.equal(item.category, "other");
  assert.deepEqual(item.target, { page: "account", params: { tab: "data" } });
  N.resetNotificationsMemory();
});

// ---------------------------------------------------------------- UI handlers

const decode = (value) =>
  String(value ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
// A small host for the page handlers. Like app.mjs it asks the registry's access gate
// before every commit and render (review fix: the shell-level "sign in to continue").
function harness({ role = "player", lang = "it", tab = "", areas = [] } = {}) {
  const { state, registry } = makeState({ areas });
  const toasts = [],
    commits = [],
    events = [];
  registry.on("account:profile-changed", (payload) => events.push(payload));
  const ctx = {
    state,
    role,
    lang,
    offline: false,
    view: { page: "account", tab },
    registry,
    esc,
    icon,
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) => (typeof v === "object" && v ? v[ctx.lang] || v.it || "" : String(v ?? "")),
    toast: (text, error = false) => toasts.push({ text, error }),
    navigate(page, params = {}) {
      this.view = { page, ...params };
      this.render();
    },
    commit(label, mutate, options = {}) {
      const gate = registry.accessGate(this);
      if (gate) throw Object.assign(new Error(gate.message.en), { ...gate.message });
      if (this.offline && !options.local)
        throw Object.assign(new Error("offline"), {
          it: "Sei senza rete: questa modifica condivisa non può essere applicata.",
          en: "You are offline: this shared change cannot be applied.",
        });
      const next = structuredClone(this.state);
      mutate(next);
      this.state = next;
      commits.push({ label, options });
      this.render();
      return { applied: true, persisted: true };
    },
    dialog(title, body, options) {
      this.modal = { title, body, options };
    },
    closeDialog() {},
    render() {
      const gate = registry.accessGate(this);
      if (gate && this.view.page !== gate.page)
        this.view = { page: gate.page, requested: this.view };
      if (this.view.page !== "account") {
        this.html = "";
        return;
      }
      this.html = account.renderAccount(this);
      const nodes = [
        ...this.html.matchAll(
          /<(input|button|select|textarea|h1)\b([^>]*)(?:>([\s\S]*?)<\/\1>|>)/g,
        ),
        ...this.html.matchAll(/<(form)\b([^>]*)>/g),
      ].map(([, tag, source]) => {
        const attrs = Object.fromEntries(
          [...source.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v)]),
        );
        const handlers = {};
        const node = {
          attrs,
          handlers,
          type: attrs.type || "",
          dataset: Object.fromEntries(
            Object.entries(attrs)
              .filter(([k]) => k.startsWith("data-"))
              .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
          ),
          disabled: "disabled" in attrs,
          checked: "checked" in attrs,
          value: attrs.value || "",
          addEventListener(type, fn) {
            handlers[type] = fn;
          },
          focus() {
            ctx.focused = node;
          },
        };
        return node;
      });
      this.root = {
        querySelectorAll(selector) {
          const m = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
          return m
            ? nodes.filter((n) => m[1] in n.attrs && (m[2] === undefined || n.attrs[m[1]] === m[2]))
            : [];
        },
        querySelector(selector) {
          return this.querySelectorAll(selector)[0] || null;
        },
      };
      account.bindAccount(this.root, this);
    },
  };
  registry.attach(ctx);
  ctx.render();
  const node = (selector) => {
    const n = ctx.root.querySelector(selector);
    assert.ok(n, `Missing ${selector}`);
    return n;
  };
  const click = (selector) => {
    const n = node(selector);
    assert.equal(n.disabled, false, `${selector} is disabled`);
    return (n.onclick || n.handlers.click)({ preventDefault() {}, currentTarget: n, target: n });
  };
  const submit = (fields = {}) => {
    const data = new FormData();
    for (const [k, v] of Object.entries(fields)) data.append(k, v);
    return ctx.modal.options.onSubmit(data);
  };
  return { ctx, toasts, commits, events, node, click, submit };
}
const tick = () => new Promise((resolve) => queueMicrotask(resolve));

test("UI: saving the display name publishes it (shared, private audit label) and survives the guard", () => {
  const h = harness({ role: "dm" });
  assert.match(h.ctx.html, /Account e profilo/);
  assert.match(h.ctx.html, /data-account-tab="profile" class="active" aria-current="page"/);
  const input = h.node("[data-account-name]");
  input.value = "Marco";
  input.handlers.input();
  const guard = h.ctx.registry.get("draft-guard", "account-name");
  assert.equal(guard.hasDraft(h.ctx, { page: "campaign" }), true, "leaving asks first");
  assert.equal(guard.hasDraft(h.ctx, { page: "account" }), false, "re-render keeps it");
  assert.equal(guard.hasDraft(h.ctx, { page: "account", tab: "data" }), true, "tab change asks");
  h.node("[data-account-name-form]").handlers.submit({ preventDefault() {} });
  assert.equal(h.commits.at(-1).label, "Nome visualizzato aggiornato");
  // A shared write (needs the network) whose log label only the owner reads.
  assert.deepEqual(h.commits.at(-1).options, { visibility: "private", undoable: false });
  assert.equal(guard.hasDraft(h.ctx, { page: "campaign" }), false);
  assert.equal(h.ctx.state.campaign.members[1].name, "Marco");
  assert.deepEqual(h.events, [{ identityId: "dm" }]);
  assert.match(h.ctx.html, /Nomi precedenti/);
  assert.match(h.ctx.html, /data-account-preview-name>Marco</);
  assert.match(h.ctx.html, /stesso nome e avatar che gli altri vedono/i);
  // Correction from the history.
  h.click("[data-account-restore-name]");
  assert.equal(h.ctx.state.campaign.members[1].name, "DM");
});

test("UI: offline refusals keep typed text; sign-in and sign-out explain the network need", () => {
  const h = harness({ role: "player" });
  h.ctx.offline = true;
  const input = h.node("[data-account-name]");
  input.value = "Chiara";
  input.handlers.input();
  h.node("[data-account-name-form]").handlers.submit({ preventDefault() {} });
  assert.match(h.toasts.at(-1).text, /senza rete/);
  assert.equal(h.toasts.at(-1).error, true);
  assert.equal(h.ctx.registry.get("draft-guard", "account-name").hasDraft(h.ctx, null), true);
  // Signing out offline would leave no way back in: refused with that reason.
  const before = h.commits.length;
  h.click("[data-account-signout]");
  assert.match(h.toasts.at(-1).text, /per rientrare serve la rete/);
  assert.equal(h.commits.length, before);
  h.ctx.offline = false;
  h.click("[data-account-signout]");
  assert.equal(h.commits.at(-1).options.local, true, "this browser's own change");
  assert.match(h.ctx.html, /Accedi a d20 Studio/);
  assert.match(h.ctx.html, /Non hai effettuato l’accesso/);
  // Signed out, the page shows no account data; IN-10: «Prova senza account» opens a
  // separate trial copy (state.mjs sandbox), never this account's data.
  assert.doesNotMatch(h.ctx.html, /data-account-heading-name|Giocatore ·/);
  assert.match(h.ctx.html, /data-account-trial-start[^>]*>Prova senza account/);
  assert.doesNotMatch(h.ctx.html, /data-account-signin="discord"/);
  assert.match(h.ctx.html, /Discord non è un metodo d’accesso/);
  h.ctx.offline = true;
  h.click('[data-account-signin="google"]');
  assert.match(h.toasts.at(-1).text, /per accedere serve la connessione/);
  assert.equal(account.profileOf(h.ctx.state, "player").session, "signed-out");
  h.ctx.offline = false;
  h.click('[data-account-signin="apple"]');
  assert.match(h.toasts.at(-1).text, /Nessun account con Apple/);
  h.click('[data-account-signin="google"]');
  assert.equal(account.profileOf(h.ctx.state, "player").session, "account");
  assert.equal(h.ctx.focused?.attrs["data-account-heading"], "", "focus on the heading");
});

// Another area with a command, a search provider, notifications and settings, standing
// for the palette's quick create, B21's character search and B13's invitations.
const probe = { runs: 0, tool: [] };
const L = (it, en) => ({ it, en });
function registerProbe(api) {
  api.add("command", {
    id: "probe.note",
    label: L("Nota rapida", "Quick note"),
    run: (ctx) => {
      probe.runs++;
      ctx.commit("Nota", (draft) => (draft.probeNotes = [...(draft.probeNotes ?? []), "n"]), {
        local: true,
      });
    },
  });
  api.add("table-tool", {
    id: "probe-tool",
    label: L("Strumento", "Tool"),
    activate: () => probe.tool.push("on"),
    deactivate: () => probe.tool.push("off"),
  });
  api.add("search", {
    id: "probe",
    label: L("Prova", "Probe"),
    search: () => [
      { title: "Iria · Maga · Personale", page: "characters", params: { id: "iria" } },
    ],
  });
  api.add("notifications", {
    id: "probe",
    label: L("Prova", "Probe"),
    collect: () => [
      { id: "probe-1", title: L("Candidatura non accettata", "Application declined") },
    ],
  });
  api.add("settings", {
    id: "probe",
    label: L("Prova", "Probe"),
    scope: "personal",
    fields: [{ id: "on", label: L("Attivo", "On"), type: "boolean", default: false }],
  });
  api.add("settings", {
    id: "probe-device",
    label: L("Dispositivo", "Device"),
    scope: "device",
    fields: [{ id: "on", label: L("Attivo", "On"), type: "boolean", default: false }],
  });
}

test("access gate: signed out, only the sign-in page; other areas' actions, results and notices withheld", () => {
  probe.runs = 0;
  probe.tool = [];
  const h = harness({ role: "player", areas: [["probe", registerProbe]] });
  const reg = h.ctx.registry;
  const command = reg.get("command", "probe.note");
  // Signed in, everything works.
  assert.equal(reg.accessGate(h.ctx), null);
  assert.equal(reg.search(h.ctx, "Iria").length, 1);
  assert.equal(reg.notifications(h.ctx).length, 1);
  assert.equal(reg.run(command, h.ctx), true);
  assert.equal(probe.runs, 1);
  h.click("[data-account-signout]");
  // Signed out: the gate names the page and the reason.
  const gate = reg.accessGate(h.ctx);
  assert.equal(gate.page, "account");
  assert.match(gate.message.it, /Accedi per continuare/);
  assert.match(h.ctx.html, /Accedi a d20 Studio/);
  assert.match(h.ctx.html, /la ricerca, le notifiche e i comandi restano chiusi/);
  // Search (the header's and the palette's providers): nothing of another area.
  assert.deepEqual(reg.search(h.ctx, "Iria"), []);
  assert.deepEqual(
    reg.search(h.ctx, "esporta").map((r) => r.provider),
    ["account-pages"],
  );
  // The bell: no notifications (the account's own are hidden too while signed out).
  assert.deepEqual(reg.notifications(h.ctx), []);
  // Commands and services of other areas are refused with the reason; nothing is written.
  assert.equal(reg.run(command, h.ctx), false);
  assert.equal(probe.runs, 1);
  assert.match(h.toasts.at(-1).text, /Accedi per continuare/);
  assert.deepEqual(h.ctx.state.probeNotes, ["n"]);
  // Any other commit (a page handler, a local private note) is refused by the host.
  assert.throws(
    () => h.ctx.commit("Nota", (d) => (d.probeNotes = []), { local: true }),
    (e) => /Accedi per continuare/.test(e.it),
  );
  // A Table tool may not start, but its teardown always runs (the shell leaves the Table).
  const tool = reg.get("table-tool", "probe-tool");
  assert.equal(reg.invoke(tool, "activate", h.ctx), false);
  assert.equal(reg.invoke(tool, "deactivate", h.ctx), true);
  assert.deepEqual(probe.tool, ["off"]);
  // Settings: this device's may change (language, offline), personal ones may not.
  assert.deepEqual(reg.setSetting(h.ctx, "probe-device.on", true), {
    applied: true,
    persisted: true,
  });
  assert.throws(
    () => reg.setSetting(h.ctx, "probe.on", true),
    (e) => /Accedi/.test(e.it),
  );
  // The account's own command and service stay available and say why.
  assert.equal(account.exportMyData(h.ctx), null);
  assert.match(h.toasts.at(-1).text, /Accedi per esportare/);
  // Any page (navigation, a typed address) shows the sign-in page and keeps the request.
  h.ctx.navigate("characters", { id: "livia", tab: "actions" });
  assert.equal(h.ctx.view.page, "account");
  assert.deepEqual(h.ctx.view.requested, { page: "characters", id: "livia", tab: "actions" });
  assert.match(h.ctx.html, /Accedi a d20 Studio/);
  // Another identity still signed in is not affected.
  h.ctx.role = "dm";
  assert.equal(reg.accessGate(h.ctx), null);
  assert.equal(reg.search(h.ctx, "Iria").length, 1);
  h.ctx.role = "player";
  // Signing in is the one change let through; then the requested page opens.
  h.click('[data-account-signin="email"]');
  assert.equal(account.profileOf(h.ctx.state, "player").session, "account");
  assert.deepEqual(h.ctx.view, { page: "characters", id: "livia", tab: "actions" });
  assert.equal(reg.accessGate(h.ctx), null);
  assert.equal(reg.run(command, h.ctx), true);
});

test("access gate: a gate that throws stays open and is reported; one gate per area", () => {
  const registry = createRegistry({ logger: null, document: null });
  registry.use("broken", (api) => {
    api.add("route", { id: "broken", label: L("Rotto", "Broken"), render: () => "" });
    api.registerAccessGate({
      page: "broken",
      refusal: () => {
        throw Error("boom");
      },
    });
  });
  assert.equal(registry.accessGate({ role: "player", state: {} }), null);
  assert.equal(registry.warnings().at(-1).point, "gate");
  const twice = registry.use("twice", (api) => {
    api.registerAccessGate({ page: "twice", refusal: () => null });
    api.registerAccessGate({ page: "twice", refusal: () => null });
  });
  assert.equal(twice.status, "failed");
  const foreign = registry.use("foreign", (api) =>
    api.registerAccessGate({ page: "account", refusal: () => null }),
  );
  assert.equal(foreign.status, "failed", "the page must be the area's own route");
});

test("UI: entering the page focuses its heading; moving between sections keeps the section", () => {
  const h = harness({ role: "player", tab: "access" });
  h.ctx.view = { page: "account", tab: "" };
  h.ctx.registry.emit("navigate", { page: "account", from: "home" });
  h.ctx.render();
  assert.equal(h.ctx.focused?.attrs["data-account-heading"], "");
  h.click('[data-account-tab="privacy"]');
  assert.equal(h.ctx.focused?.attrs["data-account-tab"], "privacy");
});

test("UI: emblem dialog, avatar switch, delete and restore", () => {
  const h = harness({ role: "player" });
  h.click("[data-account-emblem]");
  assert.match(h.ctx.modal.body, /name="glyph" value="dice" checked/);
  h.submit({ glyph: "sword", color: "violet" });
  let p = account.profileOf(h.ctx.state, "player");
  assert.equal(activeKind(p), "emblem:sword");
  h.click('[data-account-use-avatar="initials"]');
  p = account.profileOf(h.ctx.state, "player");
  assert.equal(p.activeAvatarId, "initials");
  const emblemId = p.avatars[1].id;
  h.click(`[data-account-remove-avatar="${emblemId}"]`);
  assert.match(h.ctx.html, /Avatar eliminato/);
  h.click("[data-account-restore-avatar]");
  assert.equal(account.profileOf(h.ctx.state, "player").avatars.length, 2);
  assert.ok(h.commits.every((c) => c.options.undoable === false));
  assert.ok(
    h.commits.every((c) => !c.options.local),
    "profile changes are shared",
  );
});
const activeKind = (p) => {
  const a = account.activeAvatar(p);
  return `${a.kind}:${a.glyph ?? a.color}`;
};

test("UI: sign-in methods, Discord link and privacy toggle", () => {
  const h = harness({ role: "player", tab: "access" });
  assert.match(h.ctx.html, /Un servizio collegato non è un metodo d’accesso/);
  assert.match(h.ctx.html, /g•••@example\.test/);
  assert.match(h.ctx.html, /Ultimo accesso all’account \(lo vedi solo tu\)/);
  h.click('[data-account-add-method="passkey"]');
  h.submit();
  assert.deepEqual(
    account.profileOf(h.ctx.state, "player").signIn.map((m) => m.provider),
    ["email", "google", "passkey"],
  );
  assert.equal(h.commits.at(-1).options.visibility, "private", "account changes stay private");
  h.click('[data-account-link="discord"]');
  assert.match(h.ctx.modal.body, /solo nome utente e ID/);
  assert.equal(h.submit({ handle: "NO SPACES" }), false, "invalid handle keeps the dialog");
  h.submit({ handle: "giocatore_d20" });
  assert.match(h.ctx.html, /Collegato come @giocatore_d20/);
  h.click('[data-account-unlink="discord"]');
  h.submit();
  assert.equal(account.profileOf(h.ctx.state, "player").linked.length, 0);
  // Privacy as DM: consent reveals the last access to the campaign to the player.
  const dm = harness({ role: "dm", tab: "privacy" });
  assert.doesNotMatch(dm.ctx.html, /data-account-lastseen checked/);
  const box = dm.node("[data-account-lastseen]");
  box.handlers.change({ currentTarget: { checked: true } });
  assert.equal(account.profileOf(dm.ctx.state, "dm").privacy.showLastSeen, true);
  dm.ctx.role = "player";
  dm.ctx.render();
  assert.match(dm.ctx.html, /data-account-member="dm"[\s\S]*?data-account-last-seen/);
  // In English the bilingual default name is split, as in B13 and the chat.
  dm.ctx.lang = "en";
  dm.ctx.render();
  assert.match(dm.ctx.html, /data-account-heading-name>Player</);
  assert.doesNotMatch(dm.ctx.html, /Giocatore \/ Player/);
});

test("UI: deletion dialog lists every consequence, validates in place and can be cancelled", () => {
  const h = harness({ role: "dm", tab: "data" });
  assert.match(h.ctx.html, /Esporta i miei dati/);
  // The DM's export note speaks of the DM's own preparation, honestly not yet included.
  assert.match(h.ctx.html, /Non include ancora la preparazione delle tue campagne/);
  h.click("[data-account-delete]");
  assert.match(h.ctx.modal.body, /Trasferisci «Le lanterne di Bruma» a/);
  assert.match(h.ctx.modal.body, /Doran: resta nella campagna senza proprietario; il nuovo DM/);
  assert.match(h.ctx.modal.body, /Conferma la tua identità con/);
  assert.match(h.ctx.modal.body, /Per confermare scrivi ELIMINA ACCOUNT/);
  assert.throws(
    () => h.submit({ acknowledged: "on", typed: "ELIMINA ACCOUNT", confirmWith: "email" }),
    (e) => /trasferire/.test(e.it),
  );
  assert.throws(
    () => h.submit({ acknowledged: "on", typed: "ELIMINA ACCOUNT", "transfer:lanterns": "player" }),
    (e) => /identità/.test(e.it),
  );
  assert.equal(account.profileOf(h.ctx.state, "dm").deletion, null, "no change when invalid");
  h.submit({
    acknowledged: "on",
    typed: "ELIMINA ACCOUNT",
    confirmWith: "email",
    "transfer:lanterns": "player",
  });
  assert.equal(h.commits.at(-1).options.visibility, "private");
  assert.match(h.toasts.at(-1).text, /La proposta di trasferimento è arrivata al nuovo DM/);
  assert.match(h.ctx.html, /Eliminazione programmata/);
  assert.match(
    h.ctx.html,
    /data-account-transfer="lanterns">Trasferimento previsto[\s\S]*?proposta in attesa di risposta/,
  );
  const notices = h.ctx.registry.notifications(h.ctx);
  assert.equal(notices.length, 1);
  assert.equal(notices[0].by, null, "a system notice for its own requester");
  assert.equal(notices[0].target.params.tab, "data");
  h.click("[data-account-cancel-deletion]");
  assert.equal(account.profileOf(h.ctx.state, "dm").deletion, null);
  assert.match(h.toasts.at(-1).text, /La proposta di trasferimento è stata revocata/);
  assert.equal(members.metaOf(h.ctx.state, "lanterns").transfer.status, "revoked");
  assert.equal(h.ctx.registry.notifications(h.ctx).length, 0);
  // An offer made earlier from Campaigns is preselected in the dialog.
  members.proposeTransfer(h.ctx.state, "lanterns", "player", "dm", NOW);
  h.click("[data-account-delete]");
  assert.match(h.ctx.modal.body, /<option value="player" selected>/);
});

test("UI: heading without a repeated role, the account menu and the safety link", () => {
  const safetyRoute = (api) =>
    api.add("route", { id: "safety-profile", label: { it: "S", en: "S" }, render: () => "" });
  const h = harness({ role: "player", tab: "privacy", areas: [["safety", safetyRoute]] });
  // "Giocatore · Giocatore" was repeated: the role appears only when it differs.
  assert.match(h.ctx.html, /data-account-heading-name>Giocatore<\/span> · <span class="badge"/);
  assert.match(
    h.ctx.html,
    /data-account-member="player"[\s\S]*?<small><span data-account-last-seen>/,
    "own member row without a repeated role",
  );
  assert.match(h.ctx.html, /<strong>DM<\/strong><small>Ultimo accesso non condiviso<\/small>/);
  const dm = harness({ role: "dm" });
  assert.doesNotMatch(dm.ctx.html, /data-account-heading-role/);
  account.setDisplayName(dm.ctx.state, "dm", "Marco", { now: NOW });
  dm.ctx.render();
  assert.match(dm.ctx.html, /Marco<\/span> · <span data-account-heading-role>DM<\/span>/);
  // Header control (DDB avatar menu): the sections and "Esci", with the published avatar.
  h.ctx.registry.run(h.ctx.registry.get("service", "account"), h.ctx);
  assert.equal(h.ctx.modal.title, "Account e profilo");
  assert.deepEqual(
    [...h.ctx.modal.body.matchAll(/data-account-menu="([a-z]+)"/g)].map((m) => m[1]),
    ["profile", "access", "privacy", "data"],
  );
  assert.match(h.ctx.modal.body, /data-account-menu-signout>Esci</);
  assert.match(h.ctx.modal.body, /account-avatar/);
  // Alchemy Profile → Safety (SVC-073): a way to B27's personal profile when it exists.
  assert.match(h.ctx.html, /Apri il mio profilo di sicurezza/);
  h.click("[data-account-safety]");
  assert.equal(h.ctx.view.page, "safety-profile");
  const without = harness({ role: "player", tab: "privacy" });
  assert.doesNotMatch(without.ctx.html, /data-account-safety/);
  without.ctx.view = { page: "account", tab: "" };
  without.ctx.render();
  assert.match(
    without.ctx.html,
    /data-account-preview-name>Giocatore<\/strong><small>Le lanterne di Bruma<\/small>/,
  );
});

test("UI: the home notice appears only for a pending deletion", () => {
  const h = harness({ role: "player" });
  const widget = h.ctx.registry.get("home-widget", "account-status");
  assert.equal(
    h.ctx.registry.list("home-widget", h.ctx).filter((w) => w.id === widget.id).length,
    0,
  );
  account.requestDeletion(h.ctx.state, "player", {
    typed: "ELIMINA ACCOUNT",
    acknowledged: true,
    confirmWith: "google",
  });
  assert.match(widget.render(h.ctx), /Eliminazione dell’account programmata/);
  h.ctx.lang = "en";
  assert.match(widget.render(h.ctx), /Account deletion scheduled/);
  account.signOut(h.ctx.state, "player");
  assert.equal(widget.render(h.ctx), "", "signed out, the sign-in screen replaces Home");
});
