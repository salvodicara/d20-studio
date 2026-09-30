// B13 — Campaigns: creation, invitations, joining and members (Campaign area).
//
// Patterns copied (IDs from docs/interview/CAPABILITY_CENSUS.md and
// changes/interview-01/market-census/*.md):
// - "My Games" list with search, tags, Launch, member avatars, last played and a role
//   badge (Roll20 R20-001), active/inactive campaigns (DDB-071), list filters (CMP-03).
// - Create World: name, image, description, the game system fixed after creation and a
//   Next Session date (Foundry FVT-001); campaign profile image (Roll20 SVC-025).
// - One active world at a time, launched from the list (Foundry FVT-001/FVT-003): the
//   prototype keeps one current campaign in its single local state and parks the others.
// - Invite links with role, expiry and number of uses, never the owner role, with a copy
//   button beside each link (Kanka SVC-038); the player link changes when someone is
//   removed and the co-DM link is single-use for 48 h (Roll20 SVC-028/SVC-029, R20-050).
// - Join by link, then the creator approves or denies (Owlbear VTL-036, SVC-035); a
//   removed member must request access again (SVC-037).
// - Join page with four character paths (DDB-073, SVC-013); unassigned characters and
//   Claim (DDB-074); the DM never seizes a sheet (DDB-075); several characters per player
//   (FG R20-045, decision I-040).
// - Roles: DM (owner), co-DM with a published power list (Roll20 SVC-030/R20-051, Foundry
//   Assistant GM SVC-044/FVT-046), player, observer (TTS VTL-046, decision I-135).
// - Kick and Leave (Roll20 SVC-031/R20-070, Quest Portal VTL-039) with an in-app notice
//   (Kanka SVC-039); Deactivate a character (DDB-075).
// - Ownership transfer pending → Revoke, or Accept in the invite bell (Quest Portal
//   VTL-040, VTL-007). Owlbear's GM handover (SVC-036) is only partly adopted: the owner
//   entrusts the campaign's creatures and session organizing for one session; the DM
//   tools of Table and Preparation follow the demo identity (see the evidence report).
// - Roster online/offline (Owlbear SVC-037) sorted by DMs first, name, joined, last seen
//   (Roll20 R20-052); another member's last access only with consent when the account
//   area records it (Kanka SVC-043).
//
// Rules baseline: every campaign uses D&D 2024 (SRD 5.2.1, EN/IT), fixed at creation.
// Synthetic data only. Identities are the shell's demonstration identities ("Visita
// come"); there is no authentication, network delivery or backend authorization.

import { isCampaignActor, canViewActor, canControlActor } from "./character-access.mjs";
import { resolveSessionTime } from "./campaign-sessions.mjs";
import { startCharacterBuilder } from "./character-builder.mjs";
import { avatarHTML, publishedAvatar } from "./account-avatar.mjs";
import { getCampaignHub } from "./campaign-content.mjs";
import { listHomebrew } from "./homebrew.mjs";
import { sampleDate } from "./sample-clock.mjs";

export const ID = "campaign-members";
export const VERSION = 1;
export const LEGACY_CAMPAIGN = "lanterns";
// The shell's demonstration identities ("Visita come").
export const IDENTITIES = Object.freeze(["player", "dm"]);
export const LINK_ROLES = Object.freeze(["player", "observer", "co-dm"]);
// 0 means no expiry / no use limit (Kanka SVC-038 offers both).
export const EXPIRY_HOURS = Object.freeze([1, 24, 48, 168, 0]);
export const USE_LIMITS = Object.freeze([1, 5, 10, 0]);
export const MAX_IMAGE_BYTES = 1024 * 1024;
const IMAGE_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMAGE_CHARS = Math.ceil((MAX_IMAGE_BYTES * 4) / 3) + 100;
export const RULES = Object.freeze({
  edition: "2024",
  srd: "5.2.1",
  en: "https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf",
  it: "https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf",
});
// "Create from Premade" (DDB-073): an independent copy of a synthetic sample sheet.
export const PREMADES = Object.freeze([
  Object.freeze({
    id: "premade-fighter",
    base: "doran",
    name: "Brenna",
    title: Object.freeze({ it: "Guerriera di 3° livello", en: "Level 3 fighter" }),
    summary: Object.freeze({
      it: "Copia indipendente della scheda d’esempio del guerriero: punti ferita pieni, risorse ricaricate.",
      en: "Independent copy of the sample fighter sheet: full hit points, resources recharged.",
    }),
  }),
]);
const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
// Per-campaign data. Each Foundry world keeps its own chat log, journal, roll tables and
// playlists (FVT-001); each Roll20 game its own chat archive, handouts and decks (R20-001).
// Launch parks these with the campaign and brings back the launched campaign's own copy,
// so the members of one campaign never read another campaign's chat, materials, stash,
// marks, tables or rolls. Area slices keyed by campaign id (settings, safety, community,
// assistant) and account-level ones (library, media assets, preferences) stay shared.
export const CAMPAIGN_SCOPED_SLICES = Object.freeze([
  "chat",
  "handouts",
  "handouts-seen",
  "handouts-prep",
  "annotations",
  "token-menu",
  "session-view",
  "session-view-stories",
  "encounter-builder",
  "random-tables",
  "random-tables-history",
  "loot",
  "dice-3d",
  "compendium-rolls",
]);
// Core Table records of the campaign in play: the shared log with its dice evidence,
// rests and game time, combat attempts, reactions, movements and initiative rolls.
export const CAMPAIGN_SCOPED_CORE = Object.freeze([
  "log",
  "restTime",
  "combatAttempts",
  "combatReactions",
  "movements",
  "initiativeRolls",
]);
// Settings declared with scope "campaign" live in the registry's core settings slice.
const SETTINGS_SLICE = "core-settings";

const clone = (value) => structuredClone(value);
const iso = (ms) => new Date(ms).toISOString();
const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const refuse = (it, en) => {
  throw Object.assign(new Error(en), { it, en });
};
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
// 12 unambiguous characters (32 symbols: no modulo bias on a byte), shown as XXXX-XXXX-XXXX.
export function randomCode() {
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  const chars = [...bytes].map((byte) => ALPHABET[byte % 32]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8)}`;
}
const newId = (prefix) => `${prefix}-${randomCode().replace(/-/g, "").toLowerCase()}`;

// ---------------------------------------------------------------- state slice

function blankMeta(id, ownerId, createdAt) {
  return {
    id,
    ownerId,
    createdAt,
    status: "active",
    archivedAt: null,
    deletedAt: null,
    image: null,
    description: "",
    tags: [],
    rules: { ...RULES },
    approval: false,
    links: [],
    directInvites: [],
    requests: [],
    seats: {},
    joined: {},
    lastAccess: {},
    removed: {},
    transfer: null,
    handover: null,
    contentAsks: [],
    audit: [],
  };
}
export function seedSlice() {
  const lanterns = blankMeta(LEGACY_CAMPAIGN, "dm", sampleDate("2026-05-02T18:00:00.000Z"));
  lanterns.description =
    "Il gruppo esplora il vecchio osservatorio di Bruma, dove qualcuno ha riacceso la lanterna sulla torre.";
  lanterns.tags = ["2024", "settimanale"];
  lanterns.joined = {
    dm: { at: sampleDate("2026-05-02T18:00:00.000Z"), via: "creator" },
    player: { at: sampleDate("2026-05-03T20:10:00.000Z"), via: "link" },
  };
  lanterns.lastAccess = {
    dm: sampleDate("2026-09-17T21:40:00.000Z"),
    player: sampleDate("2026-09-17T21:35:00.000Z"),
  };
  return { campaigns: { [LEGACY_CAMPAIGN]: lanterns }, parked: {}, joinReturns: {}, dismissed: {} };
}
const arrayOf = (value) => (Array.isArray(value) ? value : []);
const objectOf = (value) => (isObject(value) ? value : {});
export function normalizeSlice(slice, fromVersion = VERSION) {
  if (fromVersion > VERSION) throw Error("Campaign membership data comes from a newer version");
  if (!isObject(slice)) return seedSlice();
  const campaigns = {};
  for (const [id, raw] of Object.entries(objectOf(slice.campaigns))) {
    if (!isObject(raw) || typeof id !== "string") continue;
    const base = blankMeta(id, typeof raw.ownerId === "string" ? raw.ownerId : "dm", null);
    campaigns[id] = {
      ...base,
      ...raw,
      id,
      tags: arrayOf(raw.tags).filter((tag) => typeof tag === "string"),
      links: arrayOf(raw.links).filter(isObject),
      directInvites: arrayOf(raw.directInvites).filter(isObject),
      requests: arrayOf(raw.requests).filter(isObject),
      seats: objectOf(raw.seats),
      joined: objectOf(raw.joined),
      lastAccess: objectOf(raw.lastAccess),
      removed: objectOf(raw.removed),
      audit: arrayOf(raw.audit).filter(isObject),
      transfer: isObject(raw.transfer) ? raw.transfer : null,
      handover: isObject(raw.handover) ? raw.handover : null,
      contentAsks: arrayOf(raw.contentAsks).filter(isObject),
    };
  }
  if (!Object.keys(campaigns).length) return seedSlice();
  const parked = {};
  for (const [id, raw] of Object.entries(objectOf(slice.parked)))
    if (isObject(raw?.campaign) && Array.isArray(raw.scenes)) parked[id] = raw;
  return {
    campaigns,
    parked,
    joinReturns: objectOf(slice.joinReturns),
    dismissed: objectOf(slice.dismissed),
    // A launch whose core records are still to be swapped (completeLaunch) keeps them.
    ...(isObject(slice.pendingLaunch) ? { pendingLaunch: slice.pendingLaunch } : {}),
  };
}
const sliceOf = (state) => state?.ext?.[ID] ?? null;
function mutableSlice(state) {
  const slice = state?.ext?.[ID];
  if (!slice) throw Error("Campaign membership state is not initialized");
  return slice;
}

// ---------------------------------------------------------------- core accessors

// The core campaign record: the current one lives in state.campaign, the others are
// parked with their scenes and combat until launched.
export function coreCampaign(state, campaignId) {
  if (!campaignId) return null;
  if (state?.campaign?.id === campaignId) return state.campaign;
  return sliceOf(state)?.parked?.[campaignId]?.campaign ?? null;
}
function allCampaignIds(state) {
  const slice = sliceOf(state);
  return [
    ...new Set(
      [
        state?.campaign?.id,
        ...Object.keys(slice?.campaigns ?? {}),
        ...Object.keys(slice?.parked ?? {}),
      ].filter(Boolean),
    ),
  ].filter((id) => coreCampaign(state, id));
}
// Same default as campaign-content.mjs campaignMembers() for a record without members.
export function membersOf(state, campaignId) {
  const campaign = coreCampaign(state, campaignId);
  if (!campaign) return [];
  return (
    campaign.members ?? [
      { id: "player", name: "Giocatore / Player", role: "player" },
      { id: "dm", name: "DM", role: "dm", canOrganize: true },
    ]
  ).filter((member) => member.active !== false);
}
export function metaOf(state, campaignId) {
  const stored = sliceOf(state)?.campaigns?.[campaignId];
  if (stored) return stored;
  if (!coreCampaign(state, campaignId)) return null;
  const owner = membersOf(state, campaignId).find((member) => member.role === "dm")?.id ?? "dm";
  return { ...blankMeta(campaignId, owner, null), derived: true };
}
function mutableMeta(state, campaignId) {
  const slice = mutableSlice(state);
  if (!slice.campaigns[campaignId]) {
    const derived = metaOf(state, campaignId);
    if (!derived) refuse("Campagna non disponibile.", "Campaign unavailable.");
    delete derived.derived;
    slice.campaigns[campaignId] = derived;
  }
  return slice.campaigns[campaignId];
}
function mutableCore(state, campaignId) {
  const campaign = coreCampaign(state, campaignId);
  if (!campaign) refuse("Campagna non disponibile.", "Campaign unavailable.");
  campaign.members ??= clone(membersOf(state, campaignId));
  return campaign;
}
export function memberOf(state, campaignId, who) {
  return membersOf(state, campaignId).find((member) => member.id === who) ?? null;
}
// "owner" | "co-dm" | "player" | "observer" | null. A core "dm" who is not the owner
// acts as a co-DM.
export function roleOf(state, campaignId, who) {
  const meta = metaOf(state, campaignId);
  const member = memberOf(state, campaignId, who);
  if (!meta || !member) return null;
  if (meta.ownerId === who) return "owner";
  return member.role === "dm" ? "co-dm" : member.role;
}
export const canManage = (state, campaignId, who) =>
  ["owner", "co-dm"].includes(roleOf(state, campaignId, who));
const isOwner = (state, campaignId, who) => roleOf(state, campaignId, who) === "owner";
function requireManager(state, campaignId, who) {
  if (!canManage(state, campaignId, who))
    refuse(
      "Solo il DM o un co-DM può farlo in questa campagna.",
      "Only the DM or a co-DM can do this in this campaign.",
    );
}
function requireOwner(state, campaignId, who) {
  if (!isOwner(state, campaignId, who))
    refuse(
      "Solo il proprietario della campagna può farlo.",
      "Only the campaign owner can do this.",
    );
}
function requireActive(meta) {
  if (meta.status !== "active")
    refuse(
      "La campagna è archiviata o eliminata: ripristinala prima.",
      "The campaign is archived or deleted: restore it first.",
    );
}

// The name others see: the account display name (B29) when set, otherwise the member
// record name; the legacy bilingual record name is shown in the current language.
const LEGACY_NAMES = { "Giocatore / Player": { it: "Giocatore", en: "Player" } };
export function personName(state, id, lang = "it") {
  const display = state?.ext?.account?.profiles?.[id]?.displayName;
  if (typeof display === "string" && display.trim()) return display;
  for (const campaignId of allCampaignIds(state)) {
    const name = coreCampaign(state, campaignId).members?.find((m) => m.id === id)?.name;
    if (typeof name === "string" && name) return LEGACY_NAMES[name]?.[lang] ?? name;
  }
  if (id === "dm") return "DM";
  if (id === "player") return lang === "en" ? "Player" : "Giocatore";
  return String(id ?? "");
}
function memberRecordName(state, id) {
  const display = state?.ext?.account?.profiles?.[id]?.displayName;
  if (typeof display === "string" && display.trim()) return display;
  return id === "dm" ? "DM" : "Giocatore / Player";
}
// Another member's last access is shown only with consent when the account area exists.
export function lastSeenVisible(state, id, viewer) {
  if (id === viewer) return true;
  const account = state?.ext?.account;
  if (!account) return true;
  return account.profiles?.[id]?.privacy?.showLastSeen === true;
}
// Can Organize follows the role, plus a session DM handover (SVC-036).
function syncOrganize(state, meta) {
  const campaign = coreCampaign(state, meta.id);
  for (const member of campaign?.members ?? []) {
    const organize =
      member.role === "dm" || member.role === "co-dm" || meta.handover?.to === member.id;
    if (organize) member.canOrganize = true;
    else delete member.canOrganize;
  }
}
function audit(meta, now, by, kind, data = {}) {
  meta.audit.push({ id: newId("event"), at: iso(now), by, kind, data });
  if (meta.audit.length > 120) meta.audit.splice(0, meta.audit.length - 120);
}

// ---------------------------------------------------------------- characters

// Undefined campaignIds is legacy membership of the original campaign (see
// DEVELOPMENT.md); once a second campaign exists it is written out explicitly.
function inCampaign(actor, campaignId) {
  return Array.isArray(actor?.campaignIds)
    ? actor.campaignIds.includes(campaignId)
    : campaignId === LEGACY_CAMPAIGN;
}
export function materializeLegacy(state, campaignId = state.campaign?.id) {
  if (!campaignId) return 0;
  let changed = 0;
  for (const actor of Object.values(state.actors ?? {})) {
    if (!actor || actor.campaignIds !== undefined || actor.visibility === "private") continue;
    actor.campaignIds = [campaignId];
    changed++;
  }
  return changed;
}
function addCampaignId(actor, campaignId) {
  const current = Array.isArray(actor.campaignIds) ? actor.campaignIds : [LEGACY_CAMPAIGN];
  actor.campaignIds = [...new Set([...current, campaignId])];
}
function scenesOf(state, campaignId) {
  if (state.campaign?.id === campaignId) return state.scenes ?? [];
  return sliceOf(state)?.parked?.[campaignId]?.scenes ?? [];
}
function combatOf(state, campaignId) {
  if (state.campaign?.id === campaignId) return state.combat;
  return sliceOf(state)?.parked?.[campaignId]?.combat ?? null;
}
// Leaving a campaign's tools also leaves its maps: tokens of that sheet are removed
// from that campaign's scenes (the sheet itself is kept).
function removeCampaignId(state, actor, campaignId) {
  const current = Array.isArray(actor.campaignIds) ? actor.campaignIds : [LEGACY_CAMPAIGN];
  actor.campaignIds = current.filter((id) => id !== campaignId);
  let removed = 0;
  for (const scene of scenesOf(state, campaignId)) {
    const before = scene.tokens?.length ?? 0;
    scene.tokens = (scene.tokens ?? []).filter((token) => token.actorId !== actor.id);
    removed += before - scene.tokens.length;
  }
  return removed;
}
function addController(actor, who) {
  actor.controllers = [
    ...new Set([...(Array.isArray(actor.controllers) ? actor.controllers : []), who]),
  ];
}
function removeController(actor, who) {
  if (!Array.isArray(actor?.controllers)) return;
  actor.controllers = actor.controllers.filter((id) => id !== who);
}
function playable(actor) {
  return Boolean(actor) && actor.kind === "character" && !actor.companion;
}
// Seats: who plays each campaign character. A sheet without a seat record is played by
// its owner when the owner is a member, otherwise it is unassigned (DDB-074).
export function rosterOf(state, campaignId) {
  const meta = metaOf(state, campaignId);
  if (!meta) return [];
  const members = membersOf(state, campaignId);
  const ids = new Set(Object.keys(meta.seats ?? {}));
  for (const actor of Object.values(state.actors ?? {}))
    if (playable(actor) && inCampaign(actor, campaignId)) ids.add(actor.id);
  return [...ids]
    .filter((id) => playable(state.actors?.[id]))
    .map((id) => {
      const actor = state.actors[id];
      const seat = meta.seats?.[id];
      const memberId = seat
        ? (seat.memberId ?? null)
        : members.some((m) => m.id === actor.owner)
          ? actor.owner
          : null;
      return {
        actorId: id,
        memberId,
        status: seat?.status === "inactive" ? "inactive" : memberId ? "active" : "unassigned",
        ownerId: actor.owner,
        grantedControl: Boolean(seat?.grantedControl),
        since: seat?.since ?? null,
        previousMemberId: seat?.previousMemberId ?? null,
      };
    });
}
function seatRow(state, campaignId, actorId) {
  return rosterOf(state, campaignId).find((row) => row.actorId === actorId) ?? null;
}
function takeSeat(state, meta, actorId, memberId, now) {
  const actor = state.actors[actorId];
  const previous = meta.seats[actorId];
  if (previous?.grantedControl && previous.memberId && previous.memberId !== memberId)
    removeController(actor, previous.memberId);
  const granted = Boolean(memberId) && actor.owner !== memberId;
  if (granted) addController(actor, memberId);
  meta.seats[actorId] = {
    memberId,
    status: "active",
    since: iso(now),
    previousMemberId: previous?.memberId ?? null,
    grantedControl: granted,
  };
  if (!inCampaign(actor, meta.id)) addCampaignId(actor, meta.id);
}

// "Create from premade": an independent copy (decision I-125) of a synthetic sheet.
export function createPremadeActor(state, premadeId, name, who, campaignId, now = Date.now()) {
  const premade = PREMADES.find((row) => row.id === premadeId);
  const base = premade && state.actors[premade.base];
  if (!base) refuse("Personaggio pronto non disponibile.", "Ready-made character unavailable.");
  const actor = clone(base);
  const id = newId("character");
  for (const key of [
    "personalPlans",
    "activeForm",
    "pendingHealing",
    "deathSaves",
    "concentration",
    "companionIds",
  ])
    delete actor[key];
  Object.assign(actor, {
    id,
    name,
    owner: who,
    controllers: [],
    visibility: "shared",
    campaignIds: [campaignId],
    hp: actor.maxHp,
    tempHp: 0,
    movement: actor.speed,
    movementSpent: 0,
    dashCount: 0,
    action: true,
    bonus: true,
    reaction: true,
    conditions: [],
    exhaustion: 0,
    dead: false,
    notes: "",
    premade: { id: premade.id, copiedFrom: premade.base, at: iso(now) },
    source: {
      kind: "authored-demo",
      edition: "2024",
      revision: "blueprint-b13-premade",
      note: "Independent copy of a synthetic sample sheet; not an official premade.",
    },
  });
  for (const die of Object.values(actor.hitDice ?? {})) if (die) die.used = 0;
  for (const feature of actor.features ?? []) if (Number.isFinite(feature.used)) feature.used = 0;
  for (const slot of Object.values(actor.spellSlots ?? {})) if (slot) slot.used = 0;
  if (actor.pactSlots) actor.pactSlots.used = 0;
  if (actor.slots) actor.slots = actor.spellSlots?.[1] ?? { ...actor.slots, used: 0 };
  state.actors[id] = actor;
  return id;
}

// ---------------------------------------------------------------- queries

export function nextSessionOf(state, campaignId, now = Date.now()) {
  return (
    (coreCampaign(state, campaignId)?.sessions ?? [])
      .filter((s) => s.status === "scheduled" && s.startsAt && Date.parse(s.startsAt) >= now)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? null
  );
}
export function campaignSummary(state, campaignId, who, now = Date.now()) {
  const core = coreCampaign(state, campaignId);
  const meta = metaOf(state, campaignId);
  if (!core || !meta) return null;
  return {
    id: campaignId,
    name: core.name,
    image: meta.image,
    description: meta.description,
    tags: meta.tags,
    status: meta.status,
    role: roleOf(state, campaignId, who),
    current: state.campaign?.id === campaignId,
    members: membersOf(state, campaignId),
    lastAccess: meta.lastAccess?.[who] ?? null,
    nextSession: nextSessionOf(state, campaignId, now),
    ownerId: meta.ownerId,
    approval: meta.approval,
    createdAt: meta.createdAt,
  };
}
// My Games: campaigns this identity belongs to, by status. Deleted ones are listed for
// their owner only (recoverable, like Roll20's restore window R20-069).
export function listCampaigns(state, who, { status = "active" } = {}, now = Date.now()) {
  return allCampaignIds(state)
    .map((id) => campaignSummary(state, id, who, now))
    .filter(
      (row) =>
        row && row.status === status && row.role && (status !== "deleted" || row.role === "owner"),
    )
    .sort(
      (a, b) =>
        Number(b.current) - Number(a.current) ||
        String(b.lastAccess ?? "").localeCompare(String(a.lastAccess ?? "")) ||
        a.name.localeCompare(b.name),
    );
}
export function linkState(link, now = Date.now()) {
  if (link.status === "revoked") return link.revokeReason === "rotated" ? "rotated" : "revoked";
  if (link.expiresAt && Date.parse(link.expiresAt) <= now) return "expired";
  if (link.maxUses && link.uses >= link.maxUses) return "used-up";
  return "active";
}
// Accepts a full invite URL or the bare code, in any case, with or without dashes.
export function normalizeCode(value) {
  const text = String(value ?? "").trim();
  const fromUrl = /[?&]id=([A-Za-z0-9-]+)/.exec(text)?.[1] ?? text;
  const compact = fromUrl.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return compact.length === 12
    ? `${compact.slice(0, 4)}-${compact.slice(4, 8)}-${compact.slice(8)}`
    : compact;
}
function findCode(state, code) {
  const wanted = normalizeCode(code);
  if (!wanted) return null;
  for (const meta of Object.values(sliceOf(state)?.campaigns ?? {})) {
    const link = meta.links.find((row) => row.code === wanted);
    if (link) return { meta, kind: "link", link };
    const invite = meta.directInvites.find((row) => row.code === wanted);
    if (invite) return { meta, kind: "direct", invite };
  }
  return null;
}
function codeTaken(state, code) {
  return Object.values(sliceOf(state)?.campaigns ?? {}).some(
    (meta) =>
      meta.links.some((row) => row.code === code) ||
      meta.directInvites.some((row) => row.code === code),
  );
}
function uniqueCode(state) {
  let code = randomCode();
  while (codeTaken(state, code)) code = randomCode();
  return code;
}
// What an invite code means for this identity now. `status` is "ok" when joining is
// possible; any other value is a reason the page explains (inviteProblem).
export function inspectInvite(state, code, who, now = Date.now()) {
  const found = findCode(state, code);
  if (!found) return { status: "unknown", code: normalizeCode(code) };
  const { meta, kind } = found;
  const campaignId = meta.id;
  const core = coreCampaign(state, campaignId);
  const link = found.link ?? null;
  const invite = found.invite ?? null;
  const viaId = link?.id ?? invite?.id;
  const mine = meta.requests.filter((row) => row.who === who && row.via === viaId);
  const base = {
    code: normalizeCode(code),
    kind,
    campaignId,
    name: core?.name ?? "",
    image: meta.image,
    description: meta.description,
    ownerId: meta.ownerId,
    // Managers join without approval; a direct invitation is itself the DM's approval.
    approval: meta.approval && kind === "link" && !canManage(state, campaignId, who),
    role: link?.role ?? invite?.role,
    link: link ? clone(link) : null,
    invite: invite ? clone(invite) : null,
    memberRole: roleOf(state, campaignId, who),
    pending: meta.requests.find((row) => row.who === who && row.status === "pending") ?? null,
    decision:
      [...mine].reverse().find((row) => ["approved", "denied"].includes(row.status)) ?? null,
  };
  if (!core) return { ...base, status: "unknown" };
  if (meta.status !== "active") return { ...base, status: `campaign-${meta.status}` };
  if (kind === "direct") {
    if (invite.to !== who) return { ...base, status: "not-yours" };
    if (invite.status !== "pending") return { ...base, status: `invite-${invite.status}` };
  } else {
    const linkStatus = linkState(link, now);
    if (linkStatus !== "active") return { ...base, status: linkStatus };
  }
  if (base.memberRole === "owner") return { ...base, status: "owner" };
  if (base.pending) return { ...base, status: "pending" };
  if (base.memberRole && base.role !== "player") return { ...base, status: "member" };
  return { ...base, status: "ok" };
}
const whenIn = (value, lang) =>
  value
    ? new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "it-IT", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "";
// The reason an invite cannot be used, in both languages.
export function inviteProblem(inspection) {
  const link = inspection.link;
  switch (inspection.status) {
    case "rotated":
      return {
        it: "Questo link non funziona più: è stato sostituito dopo una rimozione dal gruppo. Chiedi al DM il link nuovo.",
        en: "This link no longer works: it was replaced after someone was removed from the group. Ask the DM for the new link.",
      };
    case "revoked":
      return { it: "Il DM ha revocato questo link.", en: "The DM revoked this link." };
    case "expired":
      return {
        it: `Questo link è scaduto il ${whenIn(link?.expiresAt, "it")}. Chiedi al DM un nuovo link.`,
        en: `This link expired on ${whenIn(link?.expiresAt, "en")}. Ask the DM for a new link.`,
      };
    case "used-up":
      return {
        it: `Questo link è già stato usato ${link?.uses} ${link?.uses === 1 ? "volta" : "volte"} su ${link?.maxUses}. Chiedi al DM un nuovo link.`,
        en: `This link has already been used ${link?.uses} of ${link?.maxUses} ${link?.maxUses === 1 ? "time" : "times"}. Ask the DM for a new link.`,
      };
    case "campaign-archived":
      return {
        it: "La campagna è archiviata e non accetta nuovi membri.",
        en: "The campaign is archived and does not accept new members.",
      };
    case "campaign-deleted":
      return { it: "La campagna è stata eliminata.", en: "The campaign was deleted." };
    case "not-yours":
      return {
        it: "Questo invito è destinato a un’altra persona.",
        en: "This invitation is meant for someone else.",
      };
    case "invite-accepted":
      return {
        it: "Hai già accettato questo invito.",
        en: "You already accepted this invitation.",
      };
    case "invite-declined":
      return { it: "Hai rifiutato questo invito.", en: "You declined this invitation." };
    case "invite-cancelled":
      return { it: "Il DM ha annullato questo invito.", en: "The DM cancelled this invitation." };
    case "owner":
      return {
        it: "Sei il proprietario di questa campagna: condividi il link con chi vuoi invitare.",
        en: "You own this campaign: share the link with the people you want to invite.",
      };
    case "member":
      return { it: "Fai già parte di questa campagna.", en: "You are already in this campaign." };
    case "pending":
      return {
        it: "La tua richiesta d’ingresso è in attesa dell’approvazione del DM.",
        en: "Your request to join is waiting for the DM’s approval.",
      };
    default:
      return {
        it: "Link d’invito non riconosciuto. Controlla di averlo copiato per intero o chiedine uno nuovo.",
        en: "Invite link not recognised. Check that you copied all of it, or ask for a new one.",
      };
  }
}
function refuseInvite(inspection) {
  const reason = inviteProblem(inspection);
  refuse(reason.it, reason.en);
}
// The four DDB paths need a character for a player; observers and co-DMs join without.
function validateChoice(state, meta, role, input, who) {
  const path = input?.path;
  if (role !== "player") {
    if (path && path !== "none")
      refuse(
        "Questo invito non prevede un personaggio.",
        "This invitation does not include a character.",
      );
    return { path: "none" };
  }
  if (path === "own") {
    const actor = state.actors?.[input.actorId];
    if (!playable(actor) || actor.owner !== who)
      refuse("Scegli uno dei tuoi personaggi.", "Choose one of your characters.");
    if (seatRow(state, meta.id, actor.id))
      refuse(
        "Questo personaggio è già nella campagna: se è non assegnato, reclamalo.",
        "This character is already in the campaign: if it is unassigned, claim it.",
      );
    return { path, actorId: actor.id };
  }
  if (path === "premade") {
    const premade = PREMADES.find((row) => row.id === input.premadeId);
    if (!premade || !state.actors?.[premade.base])
      refuse("Scegli un personaggio pronto.", "Choose a ready-made character.");
    const name = String(input.name ?? "").trim();
    if (!name || name.length > 60)
      refuse(
        "Dai un nome al personaggio (massimo 60 caratteri).",
        "Name the character (60 characters at most).",
      );
    return { path, premadeId: premade.id, name };
  }
  if (path === "claim") {
    const row = seatRow(state, meta.id, input.actorId);
    if (!row || row.status !== "unassigned")
      refuse(
        "Questo personaggio non è più disponibile da reclamare.",
        "This character is no longer available to claim.",
      );
    return { path, actorId: row.actorId };
  }
  refuse("Scegli come entrare con un personaggio.", "Choose how to join with a character.");
}
function campaignsOfActor(state, actor) {
  return allCampaignIds(state).filter((id) => inCampaign(actor, id));
}
// Recipient preview before joining: who will see the sheet, what stays private.
export function previewJoin(state, input, who, now = Date.now()) {
  const inspection = inspectInvite(state, input?.code, who, now);
  if (inspection.status !== "ok") refuseInvite(inspection);
  const campaignId = inspection.campaignId;
  const meta = metaOf(state, campaignId);
  const choice = validateChoice(state, meta, inspection.role, input, who);
  const actor = choice.actorId ? state.actors[choice.actorId] : null;
  const premade = choice.premadeId ? PREMADES.find((row) => row.id === choice.premadeId) : null;
  return {
    campaignId,
    campaignName: inspection.name,
    role: inspection.role,
    approval: inspection.approval && !canManage(state, campaignId, who),
    path: choice.path,
    characterName: actor?.name ?? choice.name ?? null,
    premade,
    becomesShared: actor?.visibility === "private",
    sheetOwner: choice.path === "claim" ? actor.owner : who,
    alsoIn: actor ? campaignsOfActor(state, actor).filter((id) => id !== campaignId) : [],
    audience: membersOf(state, campaignId)
      .filter((member) => member.id !== who)
      .map((member) => {
        const role = roleOf(state, campaignId, member.id);
        return {
          id: member.id,
          role,
          access: ["owner", "co-dm"].includes(role) ? "manage" : "view",
        };
      }),
  };
}

// ---------------------------------------------------------------- required content (CA-75)

// R7 CA-75 (BG3 mod verification window: the host's save lists every mod it needs and what
// the joining player lacks): before joining, the homebrew the campaign uses and the homebrew
// the joining character uses, one row each with its state and action.
const sameRef = (a, b) => a?.contentId === b?.contentId && a?.revisionId === b?.revisionId;
const refKey = (ref) => `${ref.contentId}@${ref.revisionId}`;
function libraryName(state, ref, who) {
  const content = listHomebrew(state, who).find((row) => row.id === ref.contentId);
  const revision = content?.revisions.find((row) => row.id === ref.revisionId);
  return revision ? clone(revision.name ?? content.name) : null;
}
function holds(state, ref, who) {
  return listHomebrew(state, who).some(
    (row) => row.id === ref.contentId && row.revisions.some((r) => r.id === ref.revisionId),
  );
}
/** The homebrew references a character's sheet uses (features, spells, inventory). */
export function characterContent(actor) {
  const out = [];
  for (const key of ["features", "spells", "inventory"])
    for (const row of Array.isArray(actor?.[key]) ? actor[key] : []) {
      const ref = row?.homebrewRef;
      if (!ref || typeof ref.contentId !== "string" || typeof ref.revisionId !== "string") continue;
      if (out.some((item) => sameRef(item.ref, ref))) continue;
      const name =
        row.name && typeof row.name === "object"
          ? { it: row.name.it ?? row.name.en ?? "", en: row.name.en ?? row.name.it ?? "" }
          : typeof row.name === "string"
            ? { it: row.name, en: row.name }
            : null;
      out.push({ ref: { contentId: ref.contentId, revisionId: ref.revisionId }, name });
    }
  return out;
}
const askFor = (meta, who, ref) =>
  (meta?.contentAsks ?? []).find(
    (ask) => ask.by === who && sameRef(ask.ref, ref) && ask.status === "pending",
  ) ?? null;
/**
 * «Contenuti richiesti» of a join: `arrives` (enabled in the campaign and held by its DM),
 * `campaign-missing` (enabled but missing from the DM's Library) and `character` (used by
 * the joining sheet, not enabled in the campaign). The joiner reads a name only when their
 * Library can read it; `action` is "ask" («Chiedi al DM») or null (ready).
 */
export function joinContentCheck(state, input, who, now = Date.now()) {
  const inspection = inspectInvite(state, input?.code, who, now);
  if (inspection.status !== "ok") return [];
  const campaignId = inspection.campaignId;
  const meta = metaOf(state, campaignId);
  const enabled = arrayOf(coreCampaign(state, campaignId)?.enabledContent).filter(
    (ref) => typeof ref?.contentId === "string" && typeof ref?.revisionId === "string",
  );
  const rows = enabled.map((ref) => {
    const held = holds(state, ref, meta.ownerId);
    return {
      group: held ? "arrives" : "campaign-missing",
      ref: { contentId: ref.contentId, revisionId: ref.revisionId },
      name: libraryName(state, ref, who),
      action: held ? null : "ask",
      asked: Boolean(askFor(meta, who, ref)),
    };
  });
  const actor =
    ["own", "claim"].includes(input?.path) && input?.actorId ? state.actors?.[input.actorId] : null;
  if (actor)
    for (const item of characterContent(actor)) {
      if (enabled.some((ref) => sameRef(ref, item.ref))) continue;
      rows.push({
        group: "character",
        ref: item.ref,
        name: libraryName(state, item.ref, who) ?? item.name,
        action: "ask",
        asked: Boolean(askFor(meta, who, item.ref)),
        actorId: actor.id,
      });
    }
  return rows;
}
/**
 * «Chiedi al DM»: the joiner asks the campaign's DM to enable a revision. When the joiner
 * owns that content, asking also lets the DM read that exact revision (the dialog says so),
 * so the DM can enable it; nothing else of the joiner's Library is shared.
 */
export function askForContent(state, campaignId, input, who, now = Date.now()) {
  const meta = mutableMeta(state, campaignId);
  requireActive(meta);
  const member = Boolean(memberOf(state, campaignId, who));
  const invited = input?.code && inspectInvite(state, input.code, who, now).status === "ok";
  if (!member && !invited)
    refuse(
      "Serve un invito valido per questa campagna.",
      "You need a valid invitation to this campaign.",
    );
  const ref = {
    contentId: String(input?.contentId ?? ""),
    revisionId: String(input?.revisionId ?? ""),
  };
  const check = invited
    ? joinContentCheck(
        state,
        { code: input.code, path: input.actorId ? "own" : "none", actorId: input.actorId },
        who,
        now,
      )
    : [];
  const row = check.find((item) => sameRef(item.ref, ref) && item.action === "ask");
  if (!row)
    refuse("Questo contenuto non manca alla campagna.", "The campaign does not lack this content.");
  if (askFor(meta, who, ref))
    refuse(
      "L’hai già chiesto al DM: aspetta che lo abiliti.",
      "You already asked the DM: wait for them to enable it.",
    );
  const library = state.library ?? [];
  const content = library.find((item) => item.id === ref.contentId);
  let shared = false;
  if (content?.owner === who && !holds(state, ref, meta.ownerId)) {
    const access = (content.accessByRevision ??= {});
    const current = access[ref.revisionId] ?? { readers: [], editors: [] };
    const rights = content.revisions.find((r) => r.id === ref.revisionId)?.data?.source?.rights;
    if (rights?.share === true) {
      access[ref.revisionId] = {
        readers: [...new Set([...(current.readers ?? []), meta.ownerId])],
        editors: [...(current.editors ?? [])],
      };
      shared = true;
    }
  }
  const ask = {
    id: newId("ask"),
    by: who,
    ref,
    name: row.name ? clone(row.name) : null,
    group: row.group,
    actorId: row.actorId ?? null,
    at: iso(now),
    status: "pending",
    shared,
  };
  meta.contentAsks.push(ask);
  audit(meta, now, who, "content-ask", { contentId: ref.contentId });
  return ask;
}
/**
 * Pending asks the DM can act on in campaigns this identity runs: until the revision is both
 * enabled in the campaign and held by its DM's Library (a «Manca alla campagna» row is
 * already enabled: it settles when the DM adds it to the Library).
 */
export function contentAsksFor(state, who) {
  return Object.values(sliceOf(state)?.campaigns ?? {}).flatMap((meta) =>
    canManage(state, meta.id, who) && meta.status === "active"
      ? arrayOf(meta.contentAsks)
          .filter(
            (ask) =>
              ask.status === "pending" &&
              !(
                arrayOf(coreCampaign(state, meta.id)?.enabledContent).some((ref) =>
                  sameRef(ref, ask.ref),
                ) && holds(state, ask.ref, meta.ownerId)
              ),
          )
          .map((ask) => ({
            ask,
            campaignId: meta.id,
            name: coreCampaign(state, meta.id)?.name ?? "",
            readable: holds(state, ask.ref, who),
          }))
      : [],
  );
}
/** «Abilita»: the DM enables the asked revision in that campaign (in play or parked). */
export function enableAskedContent(state, campaignId, askId, who, now = Date.now()) {
  requireManager(state, campaignId, who);
  const meta = mutableMeta(state, campaignId);
  requireActive(meta);
  const ask = arrayOf(meta.contentAsks).find((row) => row.id === askId && row.status === "pending");
  if (!ask) refuse("Richiesta non più in attesa.", "Request no longer pending.");
  if (!holds(state, ask.ref, who))
    refuse(
      "La tua Biblioteca non ha questa revisione: aggiungila alla Biblioteca, poi abilitala.",
      "Your Library does not hold this revision: add it to the Library, then enable it.",
    );
  const campaign = coreCampaign(state, campaignId);
  campaign.enabledContent = [
    ...arrayOf(campaign.enabledContent).filter((ref) => !sameRef(ref, ask.ref)),
    { contentId: ask.ref.contentId, revisionId: ask.ref.revisionId },
  ];
  ask.status = "enabled";
  ask.decidedBy = who;
  ask.decidedAt = iso(now);
  audit(meta, now, who, "content-enabled", { contentId: ask.ref.contentId });
  return ask;
}

// Notices for one identity: incoming invitations and transfers (VTL-007), request
// decisions and removal notices (SVC-039). Decisions and notices can be dismissed.
export function incomingFor(state, who) {
  const slice = sliceOf(state);
  const dismissed = new Set(slice?.dismissed?.[who] ?? []);
  const items = [];
  for (const meta of Object.values(slice?.campaigns ?? {})) {
    const name = coreCampaign(state, meta.id)?.name ?? "";
    if (meta.transfer?.status === "pending" && meta.transfer.to === who)
      items.push({
        key: `transfer:${meta.transfer.id}`,
        kind: "transfer",
        campaignId: meta.id,
        name,
        from: meta.transfer.from,
        at: meta.transfer.createdAt,
        id: meta.transfer.id,
      });
    for (const invite of meta.directInvites)
      if (invite.to === who && invite.status === "pending" && meta.status === "active")
        items.push({
          key: `invite:${invite.id}`,
          kind: "invite",
          campaignId: meta.id,
          name,
          from: invite.createdBy,
          at: invite.createdAt,
          role: invite.role,
          code: invite.code,
          id: invite.id,
        });
    for (const request of meta.requests)
      if (request.who === who && ["approved", "denied"].includes(request.status))
        items.push({
          key: `decision:${request.id}`,
          kind: request.status,
          campaignId: meta.id,
          name,
          from: request.decidedBy,
          at: request.decidedAt,
          message: request.message ?? "",
          id: request.id,
        });
    const removed = meta.removed?.[who];
    if (removed && !memberOf(state, meta.id, who))
      items.push({
        key: `removed:${meta.id}:${removed.at}`,
        kind: "removed",
        campaignId: meta.id,
        name,
        from: removed.by,
        at: removed.at,
        message: removed.reason ?? "",
      });
  }
  // R7 CA-75: what joiners asked the DM to enable (the DM's «Abilita»).
  for (const row of contentAsksFor(state, who))
    items.push({
      key: `content-ask:${row.ask.id}`,
      kind: "content-ask",
      campaignId: row.campaignId,
      name: row.name,
      from: row.ask.by,
      at: row.ask.at,
      id: row.ask.id,
      ref: clone(row.ask.ref),
      contentName: row.ask.name ? clone(row.ask.name) : null,
      actorId: row.ask.actorId,
      readable: row.readable,
    });
  return items
    .filter((item) => !dismissed.has(item.key))
    .sort((a, b) => String(b.at ?? "").localeCompare(String(a.at ?? "")));
}
// Pending join requests in campaigns this identity manages.
export function managerQueue(state, who) {
  return Object.values(sliceOf(state)?.campaigns ?? {}).flatMap((meta) =>
    canManage(state, meta.id, who) && meta.status === "active"
      ? meta.requests
          .filter((row) => row.status === "pending")
          .map((request) => ({
            campaignId: meta.id,
            name: coreCampaign(state, meta.id)?.name ?? "",
            request,
          }))
      : [],
  );
}
export function outgoingFor(state, who) {
  return Object.values(sliceOf(state)?.campaigns ?? {}).flatMap((meta) =>
    meta.requests
      .filter((row) => row.who === who && row.status === "pending")
      .map((request) => ({
        campaignId: meta.id,
        name: coreCampaign(state, meta.id)?.name ?? "",
        request,
      })),
  );
}

// ---------------------------------------------------------------- commands (draft state)

function validateProfile(input) {
  const name = String(input?.name ?? "").trim();
  if (!name || name.length > 80)
    refuse(
      "Dai un nome alla campagna (massimo 80 caratteri).",
      "Name the campaign (80 characters at most).",
    );
  const description = String(input?.description ?? "").trim();
  if (description.length > 1000)
    refuse(
      "La descrizione supera i 1000 caratteri.",
      "The description is longer than 1000 characters.",
    );
  const tags = [
    ...new Set(
      (Array.isArray(input?.tags) ? input.tags : String(input?.tags ?? "").split(","))
        .map((tag) => String(tag).trim())
        .filter(Boolean),
    ),
  ];
  if (tags.length > 8 || tags.some((tag) => tag.length > 24))
    refuse("Al massimo 8 etichette di 24 caratteri.", "At most 8 tags of 24 characters each.");
  const image = input?.image ?? null;
  if (
    image !== null &&
    (typeof image !== "string" || !IMAGE_PATTERN.test(image) || image.length > MAX_IMAGE_CHARS)
  )
    refuse(
      "Scegli un file PNG, JPG o WebP di massimo 1 MB.",
      "Choose a PNG, JPG or WebP file up to 1 MB.",
    );
  return { name, description, tags, image };
}
function starterScene(id, name) {
  return {
    id,
    name,
    description: "",
    publicDescription: "",
    width: 1000,
    height: 650,
    gridSize: 50,
    metersPerCell: 1.5,
    gridOffsetX: 0,
    gridOffsetY: 0,
    gridVisible: true,
    gridSnap: false,
    template: "blank",
    background: null,
    imageName: "",
    imageWidth: 0,
    imageHeight: 0,
    revealed: false,
    revealedTo: [],
    tokens: [],
    walls: [],
    terrain: [],
  };
}
// Create World (FVT-001): the creator becomes owner and DM; the system is fixed to D&D
// 2024; the optional next session becomes a real scheduled session of the campaign.
export function createCampaign(state, input, who, now = Date.now()) {
  if (!IDENTITIES.includes(who)) refuse("Identità non valida.", "Invalid identity.");
  const profile = validateProfile(input);
  let session = null;
  if (input?.nextLocal) {
    const timeZone = String(input.timeZone ?? "").trim();
    const resolution = resolveSessionTime({ localTime: input.nextLocal, timeZone });
    if (!resolution.valid) refuse(resolution.errors[0].it, resolution.errors[0].en);
    if (Date.parse(resolution.startsAt) <= now)
      refuse(
        "La prossima sessione deve essere nel futuro.",
        "The next session must be in the future.",
      );
    const snapshot = {
      revision: 1,
      title: "",
      startsAt: resolution.startsAt,
      timeZone,
      localTime: input.nextLocal,
      status: "scheduled",
      played: false,
      cancellationReason: null,
      changedBy: who,
      createdAt: iso(now),
    };
    session = {
      id: `session-${newId("first")}`,
      title: "",
      startsAt: resolution.startsAt,
      timeZone,
      localTime: input.nextLocal,
      status: "scheduled",
      played: false,
      revision: 1,
      organizerId: who,
      createdAt: iso(now),
      history: [snapshot],
    };
  }
  const slice = mutableSlice(state);
  const id = newId("campaign");
  // The original campaign's implicit membership is written out now that a second exists.
  materializeLegacy(state, state.campaign?.id);
  const sceneId = `${id}-scene`;
  const sceneName = String(input?.sceneName ?? "").trim() || "Scena iniziale";
  slice.parked[id] = {
    campaign: {
      id,
      name: profile.name,
      members: [{ id: who, name: memberRecordName(state, who), role: "dm", canOrganize: true }],
      sessions: session ? [session] : [],
      polls: [],
      sessionDrafts: [],
    },
    scenes: [starterScene(sceneId, sceneName)],
    activeSceneId: sceneId,
    combat: { active: false, round: 1, turn: 0, order: [] },
  };
  slice.campaigns[id] = {
    ...blankMeta(id, who, iso(now)),
    image: profile.image,
    description: profile.description,
    tags: profile.tags,
    joined: { [who]: { at: iso(now), via: "creator" } },
    lastAccess: { [who]: iso(now) },
  };
  audit(slice.campaigns[id], now, who, "created", { name: profile.name });
  return id;
}
function pendingRollsExist(state) {
  return (state.combatAttempts ?? []).some((attempt) =>
    (attempt.requests ?? []).some((request) => request.status === "pending"),
  );
}
// Area slices travel as {value, version}; campaign-scope settings as {value}.
function parkExt(state, specs) {
  const saved = {};
  for (const spec of specs)
    if (Object.hasOwn(state.ext ?? {}, spec.name))
      saved[spec.name] = {
        value: state.ext[spec.name],
        version: state.extVersions?.[spec.name] ?? spec.version,
      };
  const settings = state.ext?.[SETTINGS_SLICE];
  if (isObject(settings?.campaign)) saved[SETTINGS_SLICE] = { value: settings.campaign };
  return saved;
}
function restoreExt(state, saved, specs) {
  state.ext ??= {};
  state.extVersions ??= {};
  for (const spec of specs) {
    const entry = saved?.[spec.name];
    let value;
    try {
      value = !entry
        ? spec.fresh()
        : entry.version === spec.version
          ? entry.value
          : spec.normalize(entry.value, entry.version ?? 0);
    } catch {
      refuse(
        "I dati di un’area di questa campagna non si possono caricare: nulla è cambiato.",
        "Data of an area of this campaign cannot be loaded: nothing changed.",
      );
    }
    if (value === undefined) continue;
    state.ext[spec.name] = value;
    state.extVersions[spec.name] = spec.version;
  }
  const settings = state.ext[SETTINGS_SLICE];
  if (isObject(settings))
    settings.campaign = isObject(saved?.[SETTINGS_SLICE]?.value) ? saved[SETTINGS_SLICE].value : {};
}
// Launch (FVT-001 world launch, R20-001 Launch): the chosen campaign becomes the current
// one for Home, Campaign and Table; the previous one is parked with its scenes, combat
// and per-campaign area data. `slices` lists the loaded CAMPAIGN_SCOPED_SLICES as
// {name, version, fresh(), normalize(value, fromVersion)} (see scopedSliceSpecs). The
// core records (CAMPAIGN_SCOPED_CORE) follow in completeLaunch, right after the commit:
// inside a commit the store rebuilds the log from the previous state.
export function launchCampaign(state, campaignId, who, now = Date.now(), { slices = [] } = {}) {
  const meta = mutableMeta(state, campaignId);
  if (!roleOf(state, campaignId, who))
    refuse("Non fai parte di questa campagna.", "You are not a member of this campaign.");
  requireActive(meta);
  const from = state.campaign?.id ?? null;
  // Only a GM launches a world; players join the one in play (Foundry FVT-001/FVT-003).
  if (from !== campaignId && !canManage(state, campaignId, who))
    refuse(
      "Solo il DM o un co-DM avvia la campagna: potrai entrare al Tavolo quando la avvierà.",
      "Only the DM or a co-DM launches the campaign: you can enter the Table once they do.",
    );
  meta.lastAccess[who] = iso(now);
  if (from === campaignId) return { switched: false, from, to: campaignId };
  if (state.combat?.active)
    refuse(
      "Concludi il combattimento in corso prima di cambiare campagna.",
      "End the current combat before switching campaign.",
    );
  if (pendingRollsExist(state))
    refuse(
      "Risolvi o ritira i tiri in sospeso prima di cambiare campagna.",
      "Resolve or withdraw the pending rolls before switching campaign.",
    );
  const slice = mutableSlice(state);
  const target = slice.parked[campaignId];
  if (!target) refuse("Campagna non disponibile.", "Campaign unavailable.");
  // A launch left half-done by a shell without the post-commit step is finished first.
  completeLaunch(state);
  materializeLegacy(state, from);
  // A session handover (SVC-036) lasts for the session: leaving the campaign ends it and
  // its creatures go back to their previous controllers.
  const fromMeta = from ? slice.campaigns[from] : null;
  if (fromMeta?.handover) {
    const to = fromMeta.handover.to;
    endHandoverIn(state, fromMeta);
    audit(fromMeta, now, who, "handover-end", { to });
  }
  if (from)
    slice.parked[from] = {
      campaign: state.campaign,
      scenes: state.scenes,
      activeSceneId: state.activeSceneId,
      combat: state.combat,
      ext: parkExt(state, slices),
    };
  state.campaign = target.campaign;
  state.scenes = target.scenes;
  state.activeSceneId = target.activeSceneId;
  state.combat = target.combat;
  restoreExt(state, target.ext, slices);
  slice.pendingLaunch = { from, to: campaignId, core: target.core ?? {} };
  delete slice.parked[campaignId];
  return { switched: true, from, to: campaignId };
}
// Second half of a launch, on the committed state (app.mjs runs it after the commit's
// events): the previous campaign keeps its log, rests, attempts and movements; the
// launched one gets its own back, or none when it was never played.
export function completeLaunch(state) {
  const slice = sliceOf(state);
  const pending = slice?.pendingLaunch;
  if (!isObject(pending)) return false;
  const parked = pending.from ? slice.parked?.[pending.from] : null;
  if (parked) {
    const core = {};
    for (const key of CAMPAIGN_SCOPED_CORE) if (Object.hasOwn(state, key)) core[key] = state[key];
    parked.core = core;
  }
  for (const key of CAMPAIGN_SCOPED_CORE) {
    if (Object.hasOwn(pending.core ?? {}, key)) state[key] = pending.core[key];
    else if (key === "log") state.log = [];
    else delete state[key];
  }
  delete slice.pendingLaunch;
  return true;
}
export function touchAccess(state, campaignId, who, now = Date.now()) {
  if (!roleOf(state, campaignId, who)) return;
  mutableMeta(state, campaignId).lastAccess[who] = iso(now);
}
export function updateCampaignProfile(state, campaignId, input, who, now = Date.now()) {
  requireOwner(state, campaignId, who);
  const meta = mutableMeta(state, campaignId);
  const keepImage = input?.image === undefined;
  const profile = validateProfile({ ...input, image: keepImage ? null : input.image });
  mutableCore(state, campaignId).name = profile.name;
  if (!keepImage) meta.image = profile.image;
  meta.description = profile.description;
  meta.tags = profile.tags;
  audit(meta, now, who, "profile", {});
}
// P10 CA-85 (Foundry typed title, normalised): the typed confirmation ignores case, extra
// spaces, the kind of dash and quotation marks, so an em dash can be typed as "-" on any
// keyboard or phone; anything else must match.
export function normalizeCampaignName(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase("it")
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-")
    .replace(/["'`\u00AB\u00BB\u00B4\u2018-\u201F\u2032\u2033\u2039\u203A]/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*/g, "-")
    .trim();
}
export function sameCampaignName(typed, name) {
  const wanted = normalizeCampaignName(name);
  return Boolean(wanted) && normalizeCampaignName(typed) === wanted;
}
export function setCampaignStatus(state, campaignId, next, who, now = Date.now(), options = {}) {
  requireOwner(state, campaignId, who);
  if (!["active", "archived", "deleted"].includes(next))
    refuse("Stato non valido.", "Invalid status.");
  const meta = mutableMeta(state, campaignId);
  // P10 CA-84 (Roll20 cold storage, any game): the campaign in play can be archived too; it
  // stays open read-only here, the Table closed until it is restored. Deleting it needs the
  // explicit step of archiving it first (CA-85).
  if (next === "deleted" && state.campaign?.id === campaignId && meta.status !== "archived")
    refuse(
      "È la campagna in corso: archiviala prima, poi potrai eliminarla.",
      "It is the campaign in play: archive it first, then you can delete it.",
    );
  if (
    next === "deleted" &&
    !sameCampaignName(options.confirmName, coreCampaign(state, campaignId).name)
  )
    refuse(
      "Scrivi esattamente il nome della campagna per confermare (trattini, virgolette, spazi e maiuscole non contano).",
      "Type the campaign name exactly to confirm (dashes, quotes, spaces and capitals do not matter).",
    );
  const previous = meta.status;
  meta.status = next;
  meta.archivedAt = next === "archived" ? iso(now) : null;
  meta.deletedAt = next === "deleted" ? iso(now) : null;
  audit(meta, now, who, next === "active" ? "restored" : next, { previous });
}
export function setApproval(state, campaignId, on, who, now = Date.now()) {
  requireManager(state, campaignId, who);
  const meta = mutableMeta(state, campaignId);
  meta.approval = Boolean(on);
  audit(meta, now, who, meta.approval ? "approval-on" : "approval-off");
}
export function createInviteLink(state, campaignId, input, who, now = Date.now()) {
  requireManager(state, campaignId, who);
  const meta = mutableMeta(state, campaignId);
  requireActive(meta);
  const role = input?.role;
  let hours = Number(input?.hours);
  let uses = Number(input?.uses);
  if (!LINK_ROLES.includes(role))
    refuse("Scegli il ruolo dell’invito.", "Choose the invitation role.");
  if (role === "co-dm") {
    requireOwner(state, campaignId, who);
    // Roll20 SVC-029: a co-DM link works once and expires after 48 hours.
    hours = 48;
    uses = 1;
  }
  if (!EXPIRY_HOURS.includes(hours) || !USE_LIMITS.includes(uses))
    refuse("Scegli scadenza e numero d’usi.", "Choose expiry and number of uses.");
  const link = {
    id: newId("link"),
    code: uniqueCode(state),
    role,
    createdAt: iso(now),
    createdBy: who,
    expiresAt: hours ? iso(now + hours * HOUR) : null,
    maxUses: uses || null,
    uses: 0,
    usedBy: [],
    status: "active",
    revokedAt: null,
    revokedBy: null,
    revokeReason: null,
    replacedBy: null,
  };
  meta.links.push(link);
  audit(meta, now, who, "link-created", { role, code: link.code });
  return clone(link);
}
export function revokeInviteLink(state, campaignId, linkId, who, now = Date.now()) {
  requireManager(state, campaignId, who);
  const meta = mutableMeta(state, campaignId);
  const link = meta.links.find((row) => row.id === linkId);
  if (!link || link.status === "revoked") refuse("Link già revocato.", "Link already revoked.");
  if (link.role === "co-dm") requireOwner(state, campaignId, who);
  Object.assign(link, {
    status: "revoked",
    revokedAt: iso(now),
    revokedBy: who,
    revokeReason: "manual",
  });
  audit(meta, now, who, "link-revoked", { code: link.code });
}
// Roll20 SVC-028: after a removal the reusable join links change; old codes stop working.
function rotateLinks(state, meta, who, now) {
  let rotated = 0;
  for (const link of [...meta.links]) {
    if (link.role === "co-dm" || linkState(link, now) !== "active") continue;
    const next = {
      ...clone(link),
      id: newId("link"),
      code: uniqueCode(state),
      createdAt: iso(now),
      createdBy: who,
      uses: 0,
      usedBy: [],
      replaces: link.id,
    };
    Object.assign(link, {
      status: "revoked",
      revokedAt: iso(now),
      revokedBy: who,
      revokeReason: "rotated",
      replacedBy: next.id,
    });
    meta.links.push(next);
    rotated++;
  }
  return rotated;
}
// In-app invitation by account (Quest Portal VTL-039), answered in the bell (VTL-007).
export function inviteIdentity(state, campaignId, input, who, now = Date.now()) {
  requireManager(state, campaignId, who);
  const meta = mutableMeta(state, campaignId);
  requireActive(meta);
  const to = input?.to;
  const role = input?.role;
  if (!IDENTITIES.includes(to) || to === who)
    refuse("Scegli chi invitare.", "Choose who to invite.");
  if (!["player", "observer"].includes(role))
    refuse("Scegli il ruolo dell’invito.", "Choose the invitation role.");
  if (memberOf(state, campaignId, to))
    refuse(
      "Questa persona fa già parte della campagna.",
      "This person is already in the campaign.",
    );
  if (meta.directInvites.some((row) => row.to === to && row.status === "pending"))
    refuse(
      "C’è già un invito in attesa per questa persona.",
      "There is already a pending invitation for this person.",
    );
  const invite = {
    id: newId("invite"),
    code: uniqueCode(state),
    to,
    role,
    createdAt: iso(now),
    createdBy: who,
    status: "pending",
    answeredAt: null,
  };
  meta.directInvites.push(invite);
  audit(meta, now, who, "invite-sent", { to, role });
  return clone(invite);
}
export function cancelDirectInvite(state, campaignId, inviteId, who, now = Date.now()) {
  requireManager(state, campaignId, who);
  const meta = mutableMeta(state, campaignId);
  const invite = meta.directInvites.find((row) => row.id === inviteId && row.status === "pending");
  if (!invite) refuse("Invito non più in attesa.", "Invitation no longer pending.");
  invite.status = "cancelled";
  invite.answeredAt = iso(now);
  audit(meta, now, who, "invite-cancelled", { to: invite.to });
}
export function declineDirectInvite(state, campaignId, inviteId, who, now = Date.now()) {
  const meta = mutableMeta(state, campaignId);
  const invite = meta.directInvites.find(
    (row) => row.id === inviteId && row.to === who && row.status === "pending",
  );
  if (!invite) refuse("Invito non più in attesa.", "Invitation no longer pending.");
  invite.status = "declined";
  invite.answeredAt = iso(now);
  audit(meta, now, who, "invite-declined", { to: who });
}
function applyJoin(state, meta, request, now) {
  const campaign = mutableCore(state, meta.id);
  const who = request.who;
  const member = campaign.members.find((row) => row.id === who && row.active !== false);
  if (!member) {
    campaign.members = campaign.members.filter((row) => row.id !== who);
    campaign.members.push({ id: who, name: memberRecordName(state, who), role: request.role });
    meta.joined[who] = { at: iso(now), via: request.via ?? null };
    delete meta.removed[who];
  } else if (member.role === "observer" && request.role !== "observer") member.role = request.role;
  let actorId = null;
  if (request.path === "own") {
    const actor = state.actors[request.actorId];
    if (actor.visibility === "private") actor.visibility = "shared";
    takeSeat(state, meta, actor.id, who, now);
    actorId = actor.id;
  } else if (request.path === "premade") {
    actorId = createPremadeActor(state, request.premadeId, request.name, who, meta.id, now);
    takeSeat(state, meta, actorId, who, now);
  } else if (request.path === "claim") {
    takeSeat(state, meta, request.actorId, who, now);
    actorId = request.actorId;
  }
  syncOrganize(state, meta);
  meta.lastAccess[who] = iso(now);
  audit(meta, now, who, "joined", { who, actorId, role: request.role, path: request.path });
  return { joined: true, actorId };
}
// A person without an account of this demo (a simulated applicant a manager accepted in
// B59) joins as a player with no character, with the same join record, audit entry and
// organize flags as applyJoin. Added for B59; nothing in this area calls it.
export function admitMember(state, campaignId, input, who, now = Date.now()) {
  requireManager(state, campaignId, who);
  const meta = mutableMeta(state, campaignId);
  requireActive(meta);
  const id = String(input?.id ?? "");
  const name = String(input?.name ?? "").trim();
  if (!id || IDENTITIES.includes(id) || !name) refuse("Persona non valida.", "Invalid person.");
  if (memberOf(state, campaignId, id))
    refuse(
      "Questa persona fa già parte della campagna.",
      "This person is already in the campaign.",
    );
  const campaign = mutableCore(state, campaignId);
  campaign.members = campaign.members.filter((row) => row.id !== id);
  campaign.members.push({ id, name, role: "player", simulated: true });
  meta.joined[id] = { at: iso(now), via: input.via ?? null };
  delete meta.removed[id];
  syncOrganize(state, meta);
  audit(meta, now, id, "joined", { who: id, actorId: null, role: "player", path: "none" });
}
// One use of a link (or the direct invitation) per pass; with approval active the pass
// becomes a pending request (Owlbear VTL-036). Direct invitations are the DM's approval.
export function joinCampaign(state, input, who, now = Date.now()) {
  const inspection = inspectInvite(state, input?.code, who, now);
  if (inspection.status !== "ok") refuseInvite(inspection);
  const meta = mutableMeta(state, inspection.campaignId);
  const choice = validateChoice(state, meta, inspection.role, input, who);
  const via = inspection.link?.id ?? inspection.invite.id;
  if (inspection.kind === "link") {
    const link = meta.links.find((row) => row.id === via);
    link.uses += 1;
    link.usedBy.push({ who, at: iso(now) });
  } else {
    const invite = meta.directInvites.find((row) => row.id === via);
    invite.status = "accepted";
    invite.answeredAt = iso(now);
  }
  const slice = mutableSlice(state);
  delete slice.joinReturns[who];
  if (inspection.approval && !canManage(state, meta.id, who)) {
    const request = {
      id: newId("request"),
      who,
      role: inspection.role,
      ...choice,
      via,
      createdAt: iso(now),
      status: "pending",
      message: "",
      decidedAt: null,
      decidedBy: null,
    };
    meta.requests.push(request);
    audit(meta, now, who, "requested", { who });
    return { pending: true, requestId: request.id, campaignId: meta.id };
  }
  return {
    ...applyJoin(state, meta, { who, role: inspection.role, ...choice, via }, now),
    campaignId: meta.id,
  };
}
export function decideRequest(state, campaignId, requestId, decision, who, now = Date.now()) {
  requireManager(state, campaignId, who);
  const meta = mutableMeta(state, campaignId);
  requireActive(meta);
  const request = meta.requests.find((row) => row.id === requestId && row.status === "pending");
  if (!request) refuse("Richiesta non più in attesa.", "Request no longer pending.");
  if (decision?.approve) {
    // What was asked is checked again: the sheet or seat may have changed meanwhile.
    const choice = validateChoice(state, meta, request.role, request, request.who);
    applyJoin(state, meta, { ...request, ...choice }, now);
    request.status = "approved";
  } else {
    const message = String(decision?.message ?? "").trim();
    if (message.length > 300)
      refuse("Il messaggio supera i 300 caratteri.", "The message is longer than 300 characters.");
    request.status = "denied";
    request.message = message;
  }
  request.decidedAt = iso(now);
  request.decidedBy = who;
  audit(meta, now, who, request.status, { who: request.who });
  return clone(request);
}
export function withdrawRequest(state, campaignId, requestId, who, now = Date.now()) {
  const meta = mutableMeta(state, campaignId);
  const request = meta.requests.find(
    (row) => row.id === requestId && row.who === who && row.status === "pending",
  );
  if (!request) refuse("Richiesta non più in attesa.", "Request no longer pending.");
  request.status = "withdrawn";
  request.decidedAt = iso(now);
  request.decidedBy = who;
  audit(meta, now, who, "withdrawn", { who });
}
function endHandoverIn(state, meta) {
  const handover = meta.handover;
  if (!handover) return;
  for (const [actorId, had] of Object.entries(handover.npc ?? {})) {
    const npc = state.actors?.[actorId];
    if (!npc || had) continue;
    removeController(npc, handover.to);
    if (Array.isArray(npc.controllers) && !npc.controllers.length) delete npc.controllers;
  }
  meta.handover = null;
  syncOrganize(state, meta);
}
// A member leaves the group (kick or leave). Their seats become unassigned, keeping the
// sheet with its owner (DDB-074/DDB-075); with takeCharacters their own sheets leave too.
function departMember(state, meta, target, now, { takeCharacters = false } = {}) {
  const campaignId = meta.id;
  if (meta.handover?.to === target) endHandoverIn(state, meta);
  if (meta.transfer?.status === "pending" && meta.transfer.to === target) {
    meta.transfer.status = "revoked";
    meta.transfer.decidedAt = iso(now);
  }
  for (const row of rosterOf(state, campaignId)) {
    if (row.memberId !== target) continue;
    const actor = state.actors[row.actorId];
    if (row.grantedControl) removeController(actor, target);
    if (takeCharacters && actor.owner === target) {
      removeCampaignId(state, actor, campaignId);
      delete meta.seats[row.actorId];
      continue;
    }
    meta.seats[row.actorId] = {
      memberId: null,
      status: row.status === "inactive" ? "inactive" : "active",
      since: iso(now),
      previousMemberId: target,
      grantedControl: false,
    };
  }
  const campaign = mutableCore(state, campaignId);
  campaign.members = campaign.members.filter((row) => row.id !== target);
  for (const request of meta.requests)
    if (request.who === target && request.status === "pending") {
      request.status = "withdrawn";
      request.decidedAt = iso(now);
    }
  for (const invite of meta.directInvites)
    if (invite.to === target && invite.status === "pending") {
      invite.status = "cancelled";
      invite.answeredAt = iso(now);
    }
}
export function removeMember(state, campaignId, target, input, who, now = Date.now()) {
  const role = roleOf(state, campaignId, who);
  const targetRole = roleOf(state, campaignId, target);
  requireManager(state, campaignId, who);
  if (!targetRole) refuse("Questa persona non è più membro.", "This person is no longer a member.");
  if (target === who)
    refuse("Per uscire usa «Esci dalla campagna».", "To leave, use “Leave campaign”.");
  if (targetRole === "owner")
    refuse("Il proprietario non può essere espulso.", "The owner cannot be removed.");
  if (targetRole === "co-dm" && role !== "owner")
    refuse("Solo il proprietario può espellere un co-DM.", "Only the owner can remove a co-DM.");
  const reason = String(input?.reason ?? "").trim();
  if (reason.length > 300)
    refuse("Il motivo supera i 300 caratteri.", "The reason is longer than 300 characters.");
  const meta = mutableMeta(state, campaignId);
  departMember(state, meta, target, now);
  meta.removed[target] = { at: iso(now), by: who, reason };
  const rotated = rotateLinks(state, meta, who, now);
  audit(meta, now, who, "removed", { who: target, rotated });
  return { rotated };
}
export function leaveCampaign(state, campaignId, input, who, now = Date.now()) {
  const role = roleOf(state, campaignId, who);
  if (!role) refuse("Non fai parte di questa campagna.", "You are not a member of this campaign.");
  if (role === "owner")
    refuse("Trasferisci la proprietà prima di uscire.", "Transfer ownership before leaving.");
  const takeCharacters = Boolean(input?.takeCharacters);
  if (takeCharacters && combatOf(state, campaignId)?.active)
    refuse(
      "Durante un combattimento le schede restano nella campagna: esci senza portarle via o attendi la fine.",
      "During combat the sheets stay in the campaign: leave without taking them or wait for the end.",
    );
  const meta = mutableMeta(state, campaignId);
  departMember(state, meta, who, now, { takeCharacters });
  audit(meta, now, who, "left", { who, takeCharacters });
}
// Roll20 SVC-030: only the creator promotes or demotes GMs; managers switch players and
// observers. An observer plays no character (I-135), so its seats become unassigned.
export function setMemberRole(state, campaignId, target, nextRole, who, now = Date.now()) {
  const role = roleOf(state, campaignId, who);
  const current = roleOf(state, campaignId, target);
  requireManager(state, campaignId, who);
  if (!current) refuse("Questa persona non è più membro.", "This person is no longer a member.");
  if (current === "owner")
    refuse(
      "Il ruolo del proprietario cambia solo con un trasferimento.",
      "The owner’s role changes only through a transfer.",
    );
  if (!["co-dm", "player", "observer"].includes(nextRole))
    refuse("Ruolo non valido.", "Invalid role.");
  if ((nextRole === "co-dm" || current === "co-dm") && role !== "owner")
    refuse(
      "Solo il proprietario nomina o revoca i co-DM.",
      "Only the owner appoints or revokes co-DMs.",
    );
  if (current === nextRole) return;
  const meta = mutableMeta(state, campaignId);
  const member = mutableCore(state, campaignId).members.find((row) => row.id === target);
  member.role = nextRole;
  if (nextRole === "observer") {
    if (meta.handover?.to === target) endHandoverIn(state, meta);
    // An observer cannot become owner (proposeTransfer refuses them too).
    if (meta.transfer?.status === "pending" && meta.transfer.to === target) {
      meta.transfer.status = "revoked";
      meta.transfer.decidedAt = iso(now);
    }
    for (const row of rosterOf(state, campaignId))
      if (row.memberId === target) {
        if (row.grantedControl) removeController(state.actors[row.actorId], target);
        meta.seats[row.actorId] = {
          memberId: null,
          status: row.status === "inactive" ? "inactive" : "active",
          since: iso(now),
          previousMemberId: target,
          grantedControl: false,
        };
      }
  }
  syncOrganize(state, meta);
  audit(meta, now, who, "role", { who: target, from: current, to: nextRole });
}
export function assignSeat(state, campaignId, actorId, memberId, who, now = Date.now()) {
  requireManager(state, campaignId, who);
  const row = seatRow(state, campaignId, actorId);
  if (!row) refuse("Personaggio non presente nella campagna.", "Character not in this campaign.");
  if (row.status === "inactive")
    refuse(
      "Riattiva il personaggio prima di assegnarlo.",
      "Reactivate the character before assigning it.",
    );
  const targetRole = roleOf(state, campaignId, memberId);
  if (!targetRole || targetRole === "observer")
    refuse("Scegli un membro che gioca.", "Choose a playing member.");
  const meta = mutableMeta(state, campaignId);
  takeSeat(state, meta, actorId, memberId, now);
  audit(meta, now, who, "seat-assigned", { actorId, who: memberId });
}
export function unassignSeat(state, campaignId, actorId, who, now = Date.now()) {
  const row = seatRow(state, campaignId, actorId);
  if (!row || row.status !== "active")
    refuse("Il personaggio non è assegnato.", "The character is not assigned.");
  if (!canManage(state, campaignId, who) && row.memberId !== who)
    refuse("Puoi liberare solo i tuoi personaggi.", "You can only release your own characters.");
  const meta = mutableMeta(state, campaignId);
  if (row.grantedControl) removeController(state.actors[actorId], row.memberId);
  meta.seats[actorId] = {
    memberId: null,
    status: "active",
    since: iso(now),
    previousMemberId: row.memberId,
    grantedControl: false,
  };
  audit(meta, now, who, "seat-unassigned", { actorId, who: row.memberId });
}
export function claimSeat(state, campaignId, actorId, who, now = Date.now()) {
  const role = roleOf(state, campaignId, who);
  if (!role || role === "observer")
    refuse(
      "Solo chi gioca può reclamare un personaggio.",
      "Only playing members can claim a character.",
    );
  const row = seatRow(state, campaignId, actorId);
  if (!row || row.status !== "unassigned")
    refuse(
      "Questo personaggio non è più disponibile da reclamare.",
      "This character is no longer available to claim.",
    );
  const meta = mutableMeta(state, campaignId);
  takeSeat(state, meta, actorId, who, now);
  audit(meta, now, who, "seat-claimed", { actorId, who });
}
// DDB-075 Deactivate: the sheet is kept but leaves the campaign's tools and maps.
export function setSeatActive(state, campaignId, actorId, active, who, now = Date.now()) {
  requireManager(state, campaignId, who);
  const row = seatRow(state, campaignId, actorId);
  if (!row) refuse("Personaggio non presente nella campagna.", "Character not in this campaign.");
  if (combatOf(state, campaignId)?.active)
    refuse("Attendi la fine del combattimento.", "Wait for combat to end.");
  const meta = mutableMeta(state, campaignId);
  const actor = state.actors[actorId];
  if (!active) {
    if (row.status === "inactive") return;
    removeCampaignId(state, actor, campaignId);
    meta.seats[actorId] = {
      memberId: row.memberId,
      status: "inactive",
      since: iso(now),
      previousMemberId: row.previousMemberId,
      grantedControl: row.grantedControl,
    };
  } else {
    if (row.status !== "inactive") return;
    addCampaignId(actor, campaignId);
    meta.seats[actorId] = { ...meta.seats[actorId], status: "active", since: iso(now) };
  }
  audit(meta, now, who, active ? "seat-active" : "seat-inactive", { actorId });
}
// Quest Portal VTL-040: pending with Revoke; the recipient accepts in the invite bell.
export function proposeTransfer(state, campaignId, to, who, now = Date.now()) {
  requireOwner(state, campaignId, who);
  const meta = mutableMeta(state, campaignId);
  requireActive(meta);
  const targetRole = roleOf(state, campaignId, to);
  if (!targetRole || targetRole === "owner" || targetRole === "observer")
    refuse(
      "Scegli un co-DM o un giocatore della campagna.",
      "Choose a co-DM or player of the campaign.",
    );
  if (meta.transfer?.status === "pending")
    refuse("C’è già un trasferimento in attesa.", "A transfer is already pending.");
  meta.transfer = {
    id: newId("transfer"),
    from: who,
    to,
    status: "pending",
    createdAt: iso(now),
    decidedAt: null,
  };
  audit(meta, now, who, "transfer-proposed", { to });
}
export function revokeTransfer(state, campaignId, who, now = Date.now()) {
  requireOwner(state, campaignId, who);
  const meta = mutableMeta(state, campaignId);
  if (meta.transfer?.status !== "pending")
    refuse("Nessun trasferimento in attesa.", "No pending transfer.");
  meta.transfer.status = "revoked";
  meta.transfer.decidedAt = iso(now);
  audit(meta, now, who, "transfer-revoked", { to: meta.transfer.to });
}
export function answerTransfer(state, campaignId, accept, who, now = Date.now()) {
  const meta = mutableMeta(state, campaignId);
  const transfer = meta.transfer;
  if (transfer?.status !== "pending" || transfer.to !== who)
    refuse("Nessun trasferimento in attesa per te.", "No pending transfer for you.");
  if (!memberOf(state, campaignId, who))
    refuse("Non fai più parte della campagna.", "You are no longer in the campaign.");
  if (accept && roleOf(state, campaignId, who) === "observer")
    refuse(
      "Un osservatore non può diventare proprietario: chiedi di tornare giocatore.",
      "An observer cannot become owner: ask to be made a player again.",
    );
  transfer.decidedAt = iso(now);
  if (!accept) {
    transfer.status = "declined";
    audit(meta, now, who, "transfer-declined", { to: who });
    return;
  }
  transfer.status = "accepted";
  endHandoverIn(state, meta);
  const campaign = mutableCore(state, campaignId);
  for (const member of campaign.members) {
    if (member.id === who) member.role = "dm";
    else if (member.id === transfer.from) member.role = "co-dm";
  }
  meta.ownerId = who;
  syncOrganize(state, meta);
  audit(meta, now, who, "transfer-accepted", { from: transfer.from, to: who });
}
// Owlbear SVC-036 (GM handover): the owner hands the DM role over for the session in
// progress. The recipient controls the campaign's creatures (their `controllers`) and, through
// contract C3 (`session-view.runsSession(state, role)`, read by combat, the Table, Preparation,
// fog, requests and the encounter tools), runs the whole session. Identity-private data (private
// notes, personal plans, private sheets, drafts) stays with its owner.
export function startHandover(state, campaignId, to, who, now = Date.now()) {
  requireOwner(state, campaignId, who);
  if (state.campaign?.id !== campaignId)
    refuse(
      "Puoi cedere il ruolo solo nella campagna in corso.",
      "You can hand over the role only in the current campaign.",
    );
  const meta = mutableMeta(state, campaignId);
  if (meta.handover)
    refuse(
      "Le creature sono già affidate per questa sessione.",
      "The creatures are already entrusted for this session.",
    );
  const targetRole = roleOf(state, campaignId, to);
  if (!targetRole || targetRole === "owner" || targetRole === "observer")
    refuse(
      "Scegli un co-DM o un giocatore della campagna.",
      "Choose a co-DM or player of the campaign.",
    );
  const npc = {};
  for (const actor of Object.values(state.actors ?? {})) {
    if (actor?.kind !== "npc" || !isCampaignActor(actor, campaignId)) continue;
    const had = Array.isArray(actor.controllers) && actor.controllers.includes(to);
    npc[actor.id] = had;
    if (!had) addController(actor, to);
  }
  meta.handover = { id: newId("handover"), from: who, to, startedAt: iso(now), npc };
  syncOrganize(state, meta);
  audit(meta, now, who, "handover-start", { to });
}
export function endHandover(state, campaignId, who, now = Date.now()) {
  const meta = mutableMeta(state, campaignId);
  if (!meta.handover)
    refuse(
      "Le creature non sono affidate a nessuno.",
      "The creatures are not entrusted to anyone.",
    );
  if (!isOwner(state, campaignId, who) && meta.handover.to !== who)
    refuse(
      "Solo il proprietario o chi ha ricevuto le creature può farlo.",
      "Only the owner or whoever received the creatures can do this.",
    );
  const to = meta.handover.to;
  endHandoverIn(state, meta);
  audit(meta, now, who, "handover-end", { to });
}
export function dismissNotice(state, key, who) {
  const slice = mutableSlice(state);
  const list = (slice.dismissed[who] ??= []);
  if (!list.includes(key)) list.push(key);
  if (list.length > 200) list.splice(0, list.length - 200);
}
export function rememberJoinReturn(state, code, who, now = Date.now()) {
  mutableSlice(state).joinReturns[who] = { code: normalizeCode(code), at: iso(now) };
}
// The characters this identity plays in a campaign (active seats), for Home and the Table.
export function playedBy(state, campaignId, who) {
  return rosterOf(state, campaignId)
    .filter((row) => row.memberId === who && row.status === "active")
    .map((row) => row.actorId);
}
// DDB-075: a sheet the DM deactivated stays out until the DM reactivates it (the core
// "Connect to campaign" path checks the same seat, see character-access.mjs).
export function isDeactivated(state, campaignId, actorId) {
  return sliceOf(state)?.campaigns?.[campaignId]?.seats?.[actorId]?.status === "inactive";
}
// Why this identity's own sheet is view-only in a campaign (character-access.mjs applies
// the seat rule): not a member any more, an observer, unassigned, or played by someone
// else. Null when the sheet is usable or the rule does not apply.
export function seatBlock(state, actor, who) {
  if (!playable(actor) || who === "dm" || actor.visibility === "private") return null;
  const mine =
    actor.owner === who || (Array.isArray(actor.controllers) && actor.controllers.includes(who));
  if (!mine || canControlActor(actor, who, state)) return null;
  const current = state.campaign?.id;
  const ids = Array.isArray(actor.campaignIds) ? actor.campaignIds : [current];
  const campaignId = ids.includes(current) ? current : ids[0];
  if (!campaignId) return null;
  const role = roleOf(state, campaignId, who);
  const row = seatRow(state, campaignId, actor.id);
  const reason = !role
    ? "left"
    : role === "observer"
      ? "observer"
      : row?.status === "unassigned"
        ? "unassigned"
        : "other";
  return { campaignId, reason, holder: row?.memberId ?? null };
}
// Gameplay Undo restores a snapshot of the core state (registry slice hook afterUndo).
// Campaign names are administration written only by this area, like the members the
// store already keeps; and once a second campaign exists, a shared sheet whose implicit
// membership was written out (materializeLegacy) keeps it, so an Undo never puts the
// original campaign's sheets back into every campaign.
export function reconcileAfterUndo(current, restored) {
  if (restored?.campaign && current?.campaign && restored.campaign.id === current.campaign.id)
    restored.campaign.name = current.campaign.name;
  const slice = restored?.ext?.[ID];
  const campaigns = Object.keys(slice?.campaigns ?? {}).length;
  if (!restored?.actors || campaigns + Object.keys(slice?.parked ?? {}).length < 2) return;
  for (const [id, actor] of Object.entries(restored.actors)) {
    const now = current?.actors?.[id]?.campaignIds;
    if (
      actor &&
      actor.campaignIds === undefined &&
      actor.visibility !== "private" &&
      Array.isArray(now)
    )
      actor.campaignIds = [...now];
  }
}

// What a membership command changed on sheets (created, deleted, fields; lists such as
// campaignIds and controllers as added/removed items) and which tokens it removed from
// the scenes of the campaign in play. Null when it changed neither.
const primitiveList = (value) =>
  Array.isArray(value) && value.every((item) => item === null || typeof item !== "object");
const tokenKey = (token) => token?.id ?? token?.actorId;
export function membershipDelta(before, after) {
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const actors = {};
  const ids = new Set([...Object.keys(before.actors ?? {}), ...Object.keys(after.actors ?? {})]);
  for (const id of ids) {
    const a = before.actors?.[id];
    const b = after.actors?.[id];
    if (same(a, b)) continue;
    if (!a) actors[id] = { created: clone(b) };
    else if (!b) actors[id] = { deleted: true };
    else {
      const fields = {};
      for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (same(a[key], b[key])) continue;
        if (!Object.hasOwn(b, key)) fields[key] = { absent: true };
        else if (primitiveList(a[key]) && primitiveList(b[key]))
          fields[key] = {
            add: b[key].filter((item) => !a[key].includes(item)),
            remove: a[key].filter((item) => !b[key].includes(item)),
          };
        else fields[key] = { value: clone(b[key]) };
      }
      actors[id] = { fields };
    }
  }
  const tokens = {};
  const previous = new Map((before.scenes ?? []).map((scene) => [scene.id, scene]));
  for (const scene of after.scenes ?? []) {
    const old = previous.get(scene.id);
    if (!old) continue;
    const kept = new Set((scene.tokens ?? []).map(tokenKey));
    const removed = (old.tokens ?? []).map(tokenKey).filter((key) => !kept.has(key));
    if (removed.length) tokens[scene.id] = removed;
  }
  return Object.keys(actors).length || Object.keys(tokens).length ? { actors, tokens } : null;
}
// Replays a membership delta on an older snapshot of the same campaign in play.
export function applyMembershipDelta(snapshot, delta) {
  if (!snapshot || !delta) return;
  snapshot.actors ??= {};
  for (const [id, change] of Object.entries(delta.actors)) {
    if (change.created) {
      if (!snapshot.actors[id]) snapshot.actors[id] = clone(change.created);
      continue;
    }
    if (change.deleted) {
      delete snapshot.actors[id];
      continue;
    }
    const actor = snapshot.actors[id];
    if (!actor) continue;
    for (const [key, field] of Object.entries(change.fields)) {
      if (field.absent) delete actor[key];
      else if (field.add) {
        const base = primitiveList(actor[key]) ? actor[key] : [];
        actor[key] = [
          ...base.filter((item) => !field.remove.includes(item)),
          ...field.add.filter((item) => !base.includes(item)),
        ];
      } else actor[key] = clone(field.value);
    }
  }
  for (const scene of snapshot.scenes ?? []) {
    const removed = delta.tokens[scene.id];
    if (removed)
      scene.tokens = (scene.tokens ?? []).filter((token) => !removed.includes(tokenKey(token)));
  }
}

// ---------------------------------------------------------------- presentation helpers

const ROLE_NAMES = {
  owner: ["DM · proprietario", "DM · owner"],
  "co-dm": ["Co-DM", "Co-DM"],
  player: ["Giocatore", "Player"],
  observer: ["Osservatore", "Observer"],
};
const LINK_ROLE_NAMES = {
  player: ["Giocatore", "Player"],
  observer: ["Osservatore", "Observer"],
  "co-dm": ["Co-DM", "Co-DM"],
};
const roleName = (ctx, role) => ctx.t(...(ROLE_NAMES[role] ?? ["—", "—"]));
const linkRoleName = (ctx, role) => ctx.t(...(LINK_ROLE_NAMES[role] ?? ["—", "—"]));
const locale = (ctx) => (ctx.lang === "en" ? "en-GB" : "it-IT");
function when(ctx, value) {
  if (!value) return ctx.t("mai", "never");
  return new Intl.DateTimeFormat(locale(ctx), { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}
function ago(ctx, value, now = Date.now()) {
  if (!value) return ctx.t("mai", "never");
  const diff = Date.parse(value) - now;
  const size = Math.abs(diff);
  const [unit, step] =
    size < HOUR
      ? ["minute", 60000]
      : size < DAY
        ? ["hour", HOUR]
        : size < 45 * DAY
          ? ["day", DAY]
          : ["month", 30 * DAY];
  return new Intl.RelativeTimeFormat(locale(ctx), { numeric: "auto" }).format(
    Math.round(diff / step),
    unit,
  );
}
function sessionText(ctx, session) {
  if (!session?.startsAt) return ctx.t("Nessuna data", "No date");
  let text;
  try {
    text = new Intl.DateTimeFormat(locale(ctx), {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: session.timeZone || undefined,
    }).format(new Date(session.startsAt));
  } catch {
    text = when(ctx, session.startsAt);
  }
  return `${text} · ${session.timeZone || "UTC"}`;
}
const errorText = (ctx, error) =>
  error?.it && error?.en
    ? ctx.label({ it: error.it, en: error.en })
    : String(error?.message ?? error);
function perform(ctx, fn) {
  try {
    return fn();
  } catch (error) {
    ctx.toast(errorText(ctx, error), true);
    return undefined;
  }
}
function initials(name) {
  const words = String(name ?? "")
    .split(/[\s/._-]+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word));
  if (!words.length) return "?";
  return (words.length === 1 ? [...words[0]].slice(0, 2) : [words[0][0], words[1][0]])
    .join("")
    .toLocaleUpperCase();
}
function cover(ctx, image, name, size = "") {
  return image
    ? `<span class="cm-cover ${size}"><img src="${ctx.esc(image)}" alt=""></span>`
    : `<span class="cm-cover cm-monogram ${size}" aria-hidden="true">${ctx.esc(initials(name))}</span>`;
}
// A person's avatar: the one chosen in the account (B29, DDB-189) when `id` names an
// identity with an account, otherwise the monogram. Seats pass a character name only.
const avatar = (ctx, name, id) => {
  const published = id ? publishedAvatar(ctx.state, id) : null;
  return published
    ? avatarHTML(published, name, { className: "cm-avatar", esc: ctx.esc })
    : `<span class="cm-avatar" aria-hidden="true">${ctx.esc(initials(name))}</span>`;
};
export function inviteUrl(code) {
  const base =
    globalThis.location && /^https?:/.test(globalThis.location.href)
      ? globalThis.location.origin + globalThis.location.pathname
      : "http://127.0.0.1:8879/";
  return `${base}#campaigns?tab=join&id=${code}`;
}

// Per-visit presentation state (filters, sort, chosen join path). Never shared data.
const ui = { status: "active", tag: "", query: "", sort: "dm", join: null };
export function resetCampaignMembersView() {
  ui.status = "active";
  ui.tag = "";
  ui.query = "";
  ui.sort = "dm";
  ui.join = null;
}
// Shared membership commands are not gameplay: global Undo keeps them (the slice is
// "preserve", the core keeps campaign members, reconcileAfterUndo keeps names) and each
// has an explicit correction. Their log line is private to whoever acted: administration
// of one campaign (often a parked one) never reaches another campaign's shared Table log;
// the area's own "Member activity" keeps the record. What a command changed on sheets and
// on the tokens of the campaign in play is replayed on every snapshot still in the undo
// stack (app.mjs `rebaseHistory`), so anyone's Undo of an earlier move keeps joins, seats
// and removals and nobody loses their Undo. Only a launch, which replaces the campaign in
// play, starts a new undo visit (`newUndoVisit`). `afterCommit` runs on the committed
// state after the commit's events (app.mjs), see completeLaunch.
function shared(ctx, label, mutator, { quiet = false, afterCommit = null, newVisit = false } = {}) {
  let result;
  const options = { undoable: false, visibility: "private" };
  if (afterCommit) options.afterCommit = afterCommit;
  ctx.commit(
    label,
    (draft) => {
      const before = {
        campaignId: draft.campaign?.id ?? null,
        actors: clone(draft.actors ?? {}),
        scenes: clone(draft.scenes ?? []),
      };
      result = mutator(draft);
      if (newVisit || (draft.campaign?.id ?? null) !== before.campaignId) {
        options.newUndoVisit = true;
        return;
      }
      const delta = membershipDelta(before, draft);
      if (delta) options.rebaseHistory = (snapshot) => applyMembershipDelta(snapshot, delta);
    },
    options,
  );
  if (!quiet) ctx.toast(label);
  return result;
}
// The loaded CAMPAIGN_SCOPED_SLICES with their declared version and normalization.
function scopedSliceSpecs(ctx) {
  return (ctx.registry?.slices?.() ?? [])
    .filter((def) => CAMPAIGN_SCOPED_SLICES.includes(def.name))
    .map((def) => ({
      name: def.name,
      version: def.version,
      fresh: () => def.normalize({}, def.version),
      normalize: (value, fromVersion) => def.normalize(clone(value), fromVersion),
    }));
}
function personal(ctx, label, mutator) {
  ctx.commit(label, mutator, { local: true, visibility: "private", undoable: false });
}
const nameOf = (ctx, id) => personName(ctx.state, id, ctx.lang);
const campaignName = (ctx, id) => coreCampaign(ctx.state, id)?.name ?? "";

// ---------------------------------------------------------------- pages: My Games

function incomingPanel(ctx) {
  const items = incomingFor(ctx.state, ctx.role);
  const outgoing = outgoingFor(ctx.state, ctx.role);
  const queue = managerQueue(ctx.state, ctx.role);
  if (!items.length && !outgoing.length && !queue.length) return "";
  const row = (body, actions) =>
    `<li class="cm-inbox-row"><div>${body}</div><div class="toolbar">${actions}</div></li>`;
  const entries = items.map((item) => {
    const who = ctx.esc(nameOf(ctx, item.from));
    const name = `<strong>${ctx.esc(item.name)}</strong>`;
    if (item.kind === "transfer")
      return row(
        `${ctx.t(`${who} ti propone la proprietà di ${name}.`, `${who} offers you ownership of ${name}.`)}<small>${ctx.t("Diventerai DM proprietario; gli appunti «Solo io» restano dei loro autori.", "You will become the owner DM; “Only me” notes stay with their authors.")} · ${ctx.esc(ago(ctx, item.at))}</small>`,
        `<button class="button primary" data-cm="transfer-accept" data-id="${ctx.esc(item.campaignId)}">${ctx.t("Accetta", "Accept")}</button><button class="button" data-cm="transfer-decline" data-id="${ctx.esc(item.campaignId)}">${ctx.t("Rifiuta", "Decline")}</button>`,
      );
    if (item.kind === "invite")
      return row(
        `${ctx.t(`${who} ti invita in ${name} come ${linkRoleName(ctx, item.role).toLowerCase()}.`, `${who} invites you to ${name} as ${linkRoleName(ctx, item.role).toLowerCase()}.`)}<small>${ctx.esc(ago(ctx, item.at))}</small>`,
        `<button class="button primary" data-cm="accept-invite" data-code="${ctx.esc(item.code)}">${ctx.t("Accetta", "Accept")}</button><button class="button" data-cm="decline-invite" data-id="${ctx.esc(item.campaignId)}" data-invite="${ctx.esc(item.id)}">${ctx.t("Rifiuta", "Decline")}</button>`,
      );
    const dismiss = `<button class="button quiet" data-cm="dismiss" data-key="${ctx.esc(item.key)}">${ctx.t("Segna come letto", "Mark as read")}</button>`;
    if (item.kind === "denied")
      return row(
        `${ctx.t(`Richiesta per ${name} rifiutata da ${who}.`, `Request for ${name} declined by ${who}.`)}${item.message ? `<q class="cm-quote">${ctx.esc(item.message)}</q>` : ""}<small>${ctx.esc(ago(ctx, item.at))}</small>`,
        dismiss,
      );
    if (item.kind === "approved")
      return row(
        `${ctx.t(`Sei entrato in ${name}: ${who} ha approvato la richiesta.`, `You joined ${name}: ${who} approved the request.`)}<small>${ctx.esc(ago(ctx, item.at))}</small>`,
        `<button class="button" data-cm="details" data-id="${ctx.esc(item.campaignId)}">${ctx.t("Apri", "Open")}</button>${dismiss}`,
      );
    if (item.kind === "content-ask") {
      // R7 CA-75: the DM's «Abilita» for what a joiner asked (BG3 mod verification).
      const content = item.contentName
        ? `«${ctx.esc(ctx.label(item.contentName))}»`
        : ctx.t(
            `una revisione che non è in nessuna Biblioteca (${ctx.esc(item.ref.contentId)})`,
            `a revision that is in no Library (${ctx.esc(item.ref.contentId)})`,
          );
      const character = item.actorId ? ctx.state.actors?.[item.actorId]?.name : null;
      const why = `cm-ask-why-${ctx.esc(item.id)}`;
      return row(
        `${ctx.t(`${who} chiede di abilitare ${content} in ${name}`, `${who} asks you to enable ${content} in ${name}`)}${character ? ctx.t(`: la usa ${ctx.esc(character)}.`, `: ${ctx.esc(character)} uses it.`) : "."}<small>${ctx.esc(ago(ctx, item.at))}</small>${item.readable ? "" : `<small class="cm-reason" id="${why}">${ctx.t("La tua Biblioteca non ha questa revisione. Aggiungila alla Biblioteca, poi abilitala.", "Your Library does not hold this revision. Add it to the Library, then enable it.")}</small>`}`,
        item.readable
          ? `<button class="button primary" data-cm="content-enable" data-id="${ctx.esc(item.campaignId)}" data-ask="${ctx.esc(item.id)}">${ctx.t("Abilita", "Enable")}</button>${dismiss}`
          : `<button class="button" data-cm="open-library" aria-describedby="${why}">${ctx.t("Aggiungila alla Biblioteca", "Add it to the Library")}</button>${dismiss}`,
      );
    }
    return row(
      `${ctx.t(`${who} ti ha rimosso da ${name}.`, `${who} removed you from ${name}.`)}${item.message ? `<q class="cm-quote">${ctx.esc(item.message)}</q>` : ""}<small>${ctx.t("Per rientrare serve un nuovo invito.", "You need a new invitation to rejoin.")} · ${ctx.esc(ago(ctx, item.at))}</small>`,
      dismiss,
    );
  });
  const waiting = outgoing.map(({ campaignId, name, request }) =>
    row(
      `${ctx.t(`Richiesta d’ingresso in <strong>${ctx.esc(name)}</strong> in attesa del DM.`, `Request to join <strong>${ctx.esc(name)}</strong> waiting for the DM.`)}<small>${ctx.esc(ago(ctx, request.createdAt))}</small>`,
      `<button class="button" data-cm="withdraw" data-id="${ctx.esc(campaignId)}" data-request="${ctx.esc(request.id)}">${ctx.t("Ritira richiesta", "Withdraw request")}</button>`,
    ),
  );
  const toDecide = queue.map(({ campaignId, name, request }) =>
    row(
      `${ctx.t(`<strong>${ctx.esc(nameOf(ctx, request.who))}</strong> chiede di entrare in ${ctx.esc(name)}.`, `<strong>${ctx.esc(nameOf(ctx, request.who))}</strong> asks to join ${ctx.esc(name)}.`)}<small>${ctx.esc(requestSummary(ctx, request))}</small>`,
      `<button class="button" data-cm="details" data-id="${ctx.esc(campaignId)}" data-tab="invites">${ctx.t("Decidi", "Decide")}</button>`,
    ),
  );
  return `<section class="cm-inbox panel" aria-labelledby="cm-inbox-title"><h2 id="cm-inbox-title">${ctx.t("Inviti e richieste", "Invitations and requests")}</h2><ul>${[...entries, ...toDecide, ...waiting].join("")}</ul></section>`;
}
function requestSummary(ctx, request) {
  const character =
    request.path === "own" || request.path === "claim"
      ? ctx.state.actors?.[request.actorId]?.name
      : request.path === "premade"
        ? request.name
        : null;
  const how = {
    own: ctx.t("con un suo personaggio", "with their own character"),
    claim: ctx.t("reclamando un personaggio", "claiming a character"),
    premade: ctx.t("da un personaggio pronto", "from a ready-made character"),
    none: linkRoleName(ctx, request.role),
  }[request.path];
  return [character, how, ago(ctx, request.createdAt)].filter(Boolean).join(" · ");
}
// Only a manager launches a campaign (Foundry FVT-001/003: the GM launches the world,
// players join the one in play); a player or observer sees why it is not in play.
function launchControl(ctx, campaignId, role, text, className = "button primary") {
  return ["owner", "co-dm"].includes(role)
    ? `<button class="${className}" data-cm="launch" data-id="${ctx.esc(campaignId)}">${text}</button>`
    : `<p class="cm-waiting" role="note">${ctx.t("Non in corso: la avvia il DM, poi entri al Tavolo da qui.", "Not in play: the DM launches it, then you enter the Table from here.")}</p>`;
}
function campaignCard(ctx, row) {
  const people = row.members.slice(0, 5);
  const search = [row.name, ...row.tags, row.description].join(" ").toLocaleLowerCase();
  const action = row.current
    ? `<button class="button primary" data-cm="enter-table" data-id="${ctx.esc(row.id)}">${ctx.t("Entra al Tavolo", "Enter table")}</button>`
    : row.status === "active"
      ? launchControl(ctx, row.id, row.role, ctx.t("Avvia", "Launch"))
      : row.role === "owner"
        ? `<button class="button primary" data-cm="restore" data-id="${ctx.esc(row.id)}">${ctx.t("Ripristina", "Restore")}</button>`
        : "";
  return `<article class="cm-card" data-cm-card data-search="${ctx.esc(search)}">${cover(ctx, row.image, row.name)}<div class="cm-card-body"><div class="cm-badges"><span class="badge cm-role">${ctx.esc(roleName(ctx, row.role))}</span>${row.current ? `<span class="badge cm-live">${ctx.t("In corso", "Current")}</span>` : ""}${row.status === "archived" ? `<span class="badge">${ctx.t("Archiviata", "Archived")}</span>` : ""}${row.status === "deleted" ? `<span class="badge cm-danger">${ctx.t("Eliminata", "Deleted")}</span>` : ""}</div><h2><button type="button" class="cm-title" data-cm="details" data-id="${ctx.esc(row.id)}">${ctx.esc(row.name)}</button></h2>${row.description ? `<p class="cm-desc">${ctx.esc(row.description)}</p>` : ""}<dl class="cm-facts"><div><dt>${ctx.t("Prossima sessione", "Next session")}</dt><dd>${row.nextSession ? ctx.esc(sessionText(ctx, row.nextSession)) : ctx.t("Da fissare", "Not scheduled")}</dd></div><div><dt>${ctx.t("Il tuo ultimo accesso", "Your last access")}</dt><dd>${ctx.esc(row.lastAccess ? ago(ctx, row.lastAccess) : ctx.t("mai", "never"))}</dd></div></dl><div class="cm-people"><span class="cm-avatars">${people.map((m) => avatar(ctx, nameOf(ctx, m.id), m.id)).join("")}</span><span class="muted">${row.members.length} ${row.members.length === 1 ? ctx.t("membro", "member") : ctx.t("membri", "members")}: ${ctx.esc(row.members.map((m) => nameOf(ctx, m.id)).join(", "))}</span></div>${row.tags.length ? `<p class="cm-tags">${row.tags.map((tag) => `<span>#${ctx.esc(tag)}</span>`).join("")}</p>` : ""}<div class="toolbar">${action}<button class="button" data-cm="details" data-id="${ctx.esc(row.id)}">${ctx.t("Dettagli e membri", "Details and members")}</button></div></div></article>`;
}
function renderList(ctx) {
  const counts = Object.fromEntries(
    ["active", "archived", "deleted"].map((status) => [
      status,
      listCampaigns(ctx.state, ctx.role, { status }).length,
    ]),
  );
  if (!["active", "archived", "deleted"].includes(ui.status)) ui.status = "active";
  const rows = listCampaigns(ctx.state, ctx.role, { status: ui.status });
  const tagCounts = new Map();
  for (const row of rows)
    for (const tag of row.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  if (ui.tag && !tagCounts.has(ui.tag)) ui.tag = "";
  const visible = ui.tag ? rows.filter((row) => row.tags.includes(ui.tag)) : rows;
  const statusButton = (status, it, en) =>
    counts[status] || status !== "deleted"
      ? `<button type="button" class="cm-seg" data-cm="status" data-status="${status}" aria-pressed="${ui.status === status}">${ctx.t(it, en)} <span class="cm-count">${counts[status]}</span></button>`
      : "";
  const empty =
    ui.status === "active"
      ? `<div class="empty-state"><h2>${ctx.t("Nessuna campagna attiva", "No active campaign")}</h2><p>${ctx.t("Crea una campagna o apri il link d’invito che ti ha mandato il DM.", "Create a campaign or open the invite link your DM sent you.")}</p></div>`
      : `<div class="empty-state"><h2>${ui.status === "archived" ? ctx.t("Nessuna campagna archiviata", "No archived campaign") : ctx.t("Nessuna campagna eliminata", "No deleted campaign")}</h2></div>`;
  return `<section class="cm-page"><div class="page-heading"><div><h1>${ctx.t("Campagne", "Campaigns")}</h1><p>${ctx.t("I tuoi gruppi: avvia una campagna, invita chi gioca e gestisci i membri.", "Your groups: launch a campaign, invite players and manage members.")}</p></div><div class="toolbar">${/* B59 "Join a Game" on My Games (Roll20 SVC-003), only while that area is on. */ ctx.registry?.get("route", "community", ctx) ? `<button class="button" data-nav="community">${ctx.icon("search")} ${ctx.t("Trova un tavolo", "Join a game")}</button>` : ""}<button class="button" data-cm="paste-link">${ctx.t("Ho un link d’invito", "I have an invite link")}</button><button class="button primary" data-cm="create">${ctx.icon("plus")} ${ctx.t("Crea campagna", "Create campaign")}</button></div></div>${incomingPanel(ctx)}<div class="cm-filters"><div class="cm-segments" role="group" aria-label="${ctx.t("Stato delle campagne", "Campaign status")}">${statusButton("active", "Attive", "Active")}${statusButton("archived", "Archiviate", "Archived")}${statusButton("deleted", "Eliminate", "Deleted")}</div><label class="field cm-search"><span>${ctx.t("Cerca per nome, etichetta o descrizione", "Search by name, tag or description")}</span><input type="search" data-cm-search value="${ctx.esc(ui.query)}"></label>${tagCounts.size ? `<div class="cm-tagbar" role="group" aria-label="${ctx.t("Le mie etichette", "My tags")}"><span class="muted">${ctx.t("Le mie etichette", "My tags")}</span>${[...tagCounts].map(([tag, n]) => `<button type="button" class="cm-chip" data-cm="tag" data-tag="${ctx.esc(tag)}" aria-pressed="${ui.tag === tag}">#${ctx.esc(tag)} <span class="cm-count">${n}</span></button>`).join("")}</div>` : ""}</div>${visible.length ? `<div class="cm-grid">${visible.map((row) => campaignCard(ctx, row)).join("")}</div><p class="empty-state" data-cm-no-results hidden>${ctx.t("Nessuna campagna corrisponde alla ricerca.", "No campaign matches the search.")}</p>` : empty}</section>`;
}

// ---------------------------------------------------------------- pages: Game Details

// Only powers the app applies to the co-DM role (Roll20 SVC-030 publishes its list).
const CO_DM_POWERS = [
  ["Avviare la campagna per il gruppo", "Launch the campaign for the group"],
  [
    "Muovere e far agire le creature della campagna al Tavolo",
    "Move and act with the campaign’s creatures at the Table",
  ],
  ["Organizzare sessioni e raccolte di disponibilità", "Organize sessions and availability polls"],
  ["Leggere le voci della campagna riservate ai DM", "Read campaign entries reserved for DMs"],
  [
    "Invitare, approvare ed espellere giocatori e osservatori; gestire i link",
    "Invite, approve and remove players and observers; manage links",
  ],
  [
    "Assegnare, liberare, disattivare e riattivare i personaggi",
    "Assign, release, deactivate and reactivate characters",
  ],
];
const OWNER_ONLY = [
  [
    "Trasferire la proprietà ed eliminare o archiviare la campagna",
    "Transfer ownership and delete or archive the campaign",
  ],
  [
    "Nominare o revocare i co-DM e creare link per co-DM",
    "Appoint or revoke co-DMs and create co-DM links",
  ],
  ["Modificare nome, immagine e descrizione", "Edit name, image and description"],
  ["Cedere il ruolo di DM per una sessione", "Hand over the DM role for a session"],
];
function powersHTML(ctx) {
  return `<div class="cm-powers"><h3>${ctx.t("Un co-DM può", "A co-DM can")}</h3><ul>${CO_DM_POWERS.map(([it, en]) => `<li>${ctx.icon("check")}<span>${ctx.t(it, en)}</span></li>`).join("")}</ul><h3>${ctx.t("Solo il proprietario può", "Only the owner can")}</h3><ul>${OWNER_ONLY.map(([it, en]) => `<li>${ctx.icon("close")}<span>${ctx.t(it, en)}</span></li>`).join("")}</ul></div>`;
}
function detailTabs(ctx, campaignId, tab, mode) {
  const manage = canManage(ctx.state, campaignId, ctx.role);
  const tabs = [
    ["members", "Membri", "Members"],
    ["characters", "Personaggi", "Characters"],
    ...(manage ? [["invites", "Inviti", "Invitations"]] : []),
    ["manage", "Gestione", "Management"],
  ];
  const queue = metaOf(ctx.state, campaignId).requests.filter((r) => r.status === "pending").length;
  return `<nav class="tabs cm-tabs" aria-label="${ctx.t("Sezioni della campagna", "Campaign sections")}">${tabs.map(([id, it, en]) => `<button type="button" class="${tab === id ? "active" : ""}" data-cm="tab" data-id="${ctx.esc(campaignId)}" data-tab="${id}" data-mode="${mode}" ${tab === id ? 'aria-current="page"' : ""}>${ctx.t(it, en)}${id === "invites" && queue ? ` <span class="cm-count">${queue}</span>` : ""}</button>`).join("")}</nav>`;
}
function presence(ctx, id) {
  if (id === ctx.role)
    return `<span class="cm-presence is-online">${ctx.t("In linea · questa visita", "Online · this visit")}</span>`;
  return `<span class="cm-presence">${ctx.t("Non in linea", "Offline")}</span>`;
}
function sortMembers(ctx, campaignId, members) {
  const meta = metaOf(ctx.state, campaignId);
  const rank = { owner: 0, "co-dm": 1, player: 2, observer: 3 };
  const name = (m) => nameOf(ctx, m.id).toLocaleLowerCase();
  const seen = (m) =>
    lastSeenVisible(ctx.state, m.id, ctx.role) ? (meta.lastAccess?.[m.id] ?? "") : "";
  const sorters = {
    dm: (a, b) =>
      rank[roleOf(ctx.state, campaignId, a.id)] - rank[roleOf(ctx.state, campaignId, b.id)] ||
      name(a).localeCompare(name(b)),
    name: (a, b) => name(a).localeCompare(name(b)),
    joined: (a, b) =>
      String(meta.joined?.[a.id]?.at ?? "").localeCompare(String(meta.joined?.[b.id]?.at ?? "")),
    seen: (a, b) => seen(b).localeCompare(seen(a)),
  };
  return [...members].sort(sorters[ui.sort] ?? sorters.dm);
}
function membersTab(ctx, campaignId) {
  const meta = metaOf(ctx.state, campaignId);
  const viewer = roleOf(ctx.state, campaignId, ctx.role);
  const roster = rosterOf(ctx.state, campaignId);
  const members = sortMembers(ctx, campaignId, membersOf(ctx.state, campaignId));
  const id = ctx.esc(campaignId);
  const rows = members.map((m) => {
    const role = roleOf(ctx.state, campaignId, m.id);
    const name = nameOf(ctx, m.id);
    const characters = roster
      .filter((row) => row.memberId === m.id && row.status !== "inactive")
      .map((row) => ctx.state.actors[row.actorId]?.name);
    const actions = [];
    const target = `data-id="${id}" data-target="${ctx.esc(m.id)}"`;
    if (m.id !== ctx.role && role !== "owner") {
      if (viewer === "owner" && role === "player")
        actions.push(
          `<button class="button" data-cm="role" ${target} data-role="co-dm">${ctx.t("Promuovi a co-DM", "Promote to co-DM")}</button>`,
        );
      if (viewer === "owner" && role === "co-dm")
        actions.push(
          `<button class="button" data-cm="role" ${target} data-role="player">${ctx.t("Riporta a giocatore", "Demote to player")}</button>`,
        );
      if (["owner", "co-dm"].includes(viewer) && role === "player")
        actions.push(
          `<button class="button quiet" data-cm="role" ${target} data-role="observer">${ctx.t("Rendi osservatore", "Make observer")}</button>`,
        );
      if (["owner", "co-dm"].includes(viewer) && role === "observer")
        actions.push(
          `<button class="button" data-cm="role" ${target} data-role="player">${ctx.t("Rendi giocatore", "Make player")}</button>`,
        );
      if (viewer === "owner" || (viewer === "co-dm" && role !== "co-dm"))
        actions.push(
          `<button class="button danger" data-cm="remove" ${target}>${ctx.t("Espelli…", "Remove…")}</button>`,
        );
    }
    if (m.id === ctx.role && role !== "owner")
      actions.push(
        `<button class="button danger" data-cm="leave" data-id="${id}">${ctx.t("Esci dalla campagna…", "Leave campaign…")}</button>`,
      );
    // P10 CA-60 (Kanka "View as" in the member menu) and CA-57 (Owlbear GM hand-off from the
    // roster): on the row of the member, for the campaign in play.
    const inPlay = ctx.state.campaign?.id === campaignId;
    if (
      inPlay &&
      m.id !== ctx.role &&
      ["owner", "co-dm"].includes(viewer) &&
      ["player", "observer"].includes(role)
    )
      actions.unshift(
        `<button class="button" data-cm="view-as" ${target}>${ctx.icon("eye")} ${ctx.t("Vedi come", "View as")}</button>`,
      );
    if (
      inPlay &&
      viewer === "owner" &&
      m.id !== ctx.role &&
      ["co-dm", "player"].includes(role) &&
      !meta.handover
    )
      actions.push(
        `<button class="button" data-cm="handover" ${target}>${ctx.t("Cedi il ruolo di DM…", "Hand over the DM role…")}</button>`,
      );
    const seen = lastSeenVisible(ctx.state, m.id, ctx.role)
      ? ctx.t(
          `Ultimo accesso ${ago(ctx, meta.lastAccess?.[m.id])}`,
          `Last access ${ago(ctx, meta.lastAccess?.[m.id])}`,
        )
      : ctx.t("Ultimo accesso non condiviso", "Last access not shared");
    return `<li class="cm-member">${avatar(ctx, name, m.id)}<div class="cm-member-main"><p class="cm-member-name"><strong>${ctx.esc(name)}</strong>${m.id === ctx.role ? ` <span class="muted">(${ctx.t("tu", "you")})</span>` : ""} <span class="badge cm-role">${ctx.esc(roleName(ctx, role))}</span>${meta.handover?.to === m.id ? ` <span class="badge cm-live">${ctx.t("DM per la sessione", "DM for the session")}</span>` : ""}</p><p class="cm-member-meta">${presence(ctx, m.id)} · ${ctx.esc(seen)} · ${ctx.t("entrato", "joined")} ${ctx.esc(meta.joined?.[m.id]?.at ? when(ctx, meta.joined[m.id].at) : ctx.t("data non registrata", "date not recorded"))}</p><p class="cm-member-meta">${characters.length ? `${ctx.t("Gioca", "Plays")}: ${ctx.esc(characters.join(", "))}` : role === "observer" ? ctx.t("Segue senza personaggio", "Follows without a character") : ctx.t("Nessun personaggio assegnato", "No assigned character")}</p></div>${actions.length ? `<div class="toolbar cm-member-actions">${actions.join("")}</div>` : ""}</li>`;
  });
  return `<div class="section-heading cm-roster-head"><h2>${ctx.t("Membri", "Members")} <span class="cm-count">${members.length}</span></h2><label class="cm-sort">${ctx.t("Ordina per", "Sort by")} <select data-cm-sort><option value="dm" ${ui.sort === "dm" ? "selected" : ""}>${ctx.t("DM prima", "DMs first")}</option><option value="name" ${ui.sort === "name" ? "selected" : ""}>${ctx.t("Nome", "Name")}</option><option value="joined" ${ui.sort === "joined" ? "selected" : ""}>${ctx.t("Data d’ingresso", "Date joined")}</option><option value="seen" ${ui.sort === "seen" ? "selected" : ""}>${ctx.t("Ultimo accesso", "Last access")}</option></select></label></div><p class="muted cm-note">${ctx.t("Presenza simulata: in questo browser è in linea solo l’identità che stai usando.", "Simulated presence: in this browser only the identity you are using is online.")}</p><ul class="cm-roster">${rows.join("")}</ul><details class="cm-details"><summary>${ctx.t("Ruoli e poteri", "Roles and powers")}</summary>${powersHTML(ctx)}<p class="muted">${ctx.t("Osservatore: segue scene e contenuti condivisi senza controllare personaggi. Giocatore: controlla i personaggi che gli sono assegnati.", "Observer: follows shared scenes and content without controlling characters. Player: controls the characters assigned to them.")}</p></details>`;
}
function charactersTab(ctx, campaignId) {
  const viewer = roleOf(ctx.state, campaignId, ctx.role);
  const manage = ["owner", "co-dm"].includes(viewer);
  const players = membersOf(ctx.state, campaignId).filter((m) =>
    ["owner", "co-dm", "player"].includes(roleOf(ctx.state, campaignId, m.id)),
  );
  const roster = rosterOf(ctx.state, campaignId);
  const id = ctx.esc(campaignId);
  const rows = roster.map((row) => {
    const actor = ctx.state.actors[row.actorId];
    const a = `data-id="${id}" data-actor="${ctx.esc(row.actorId)}"`;
    const actions = [];
    // Players claim (DDB-074); managers use Reassign, which can also name themselves.
    if (row.status === "unassigned" && viewer === "player")
      actions.push(
        `<button class="button primary" data-cm="claim" ${a}>${ctx.t("Reclama", "Claim")}</button>`,
      );
    if (manage && row.status !== "inactive")
      actions.push(
        `<form class="cm-assign" data-cm-form="assign" ${a}><label><span class="cm-sr">${ctx.t(`Assegna ${actor.name} a`, `Assign ${actor.name} to`)}</span><select name="member">${players.map((m) => `<option value="${ctx.esc(m.id)}" ${m.id === row.memberId ? "selected" : ""}>${ctx.esc(nameOf(ctx, m.id))}</option>`).join("")}</select></label><button class="button">${ctx.t("Riassegna", "Reassign")}</button></form>`,
      );
    if (row.status === "active" && (manage || row.memberId === ctx.role))
      actions.push(
        `<button class="button quiet" data-cm="unassign" ${a}>${ctx.t("Rendi non assegnato", "Unassign")}</button>`,
      );
    if (manage)
      actions.push(
        row.status === "inactive"
          ? `<button class="button" data-cm="reactivate" ${a}>${ctx.t("Riattiva", "Reactivate")}</button>`
          : `<button class="button quiet" data-cm="deactivate" ${a}>${ctx.t("Disattiva", "Deactivate")}</button>`,
      );
    if (canViewActor(actor, ctx.role, ctx.state))
      actions.push(
        `<button class="button quiet" data-open-sheet="${ctx.esc(row.actorId)}">${ctx.t("Apri scheda", "Open sheet")}</button>`,
      );
    const state =
      row.status === "inactive"
        ? `<span class="badge">${ctx.t("Disattivato", "Deactivated")}</span>`
        : row.status === "unassigned"
          ? `<span class="badge cm-warn">${ctx.t("Non assegnato", "Unassigned")}</span>`
          : `<span class="badge cm-role">${ctx.t("Giocato da", "Played by")} ${ctx.esc(nameOf(ctx, row.memberId))}</span>`;
    return `<li class="cm-seat">${avatar(ctx, actor.name)}<div class="cm-member-main"><p class="cm-member-name"><strong>${ctx.esc(actor.name)}</strong> ${state}</p><p class="cm-member-meta">${ctx.esc(ctx.label(actor.className))} · ${ctx.t("livello", "level")} ${ctx.esc(actor.level)} · ${ctx.t("scheda di", "sheet of")} ${ctx.esc(nameOf(ctx, row.ownerId))}${row.grantedControl ? ` · ${ctx.t("controllo condiviso", "shared control")}` : ""}${row.status === "unassigned" && row.previousMemberId ? ` · ${ctx.t("prima", "previously")}: ${ctx.esc(nameOf(ctx, row.previousMemberId))}` : ""}</p></div>${actions.length ? `<div class="toolbar cm-member-actions">${actions.join("")}</div>` : ""}</li>`;
  });
  return `<div class="section-heading"><h2>${ctx.t("Personaggi", "Characters")} <span class="cm-count">${roster.length}</span></h2></div><p class="muted cm-note">${ctx.t("La scheda resta sempre del suo proprietario: assegnare o reclamare dà il controllo in gioco; disattivare la toglie da strumenti e mappe della campagna senza cancellarla.", "A sheet always stays with its owner: assigning or claiming gives in-game control; deactivating removes it from the campaign’s tools and maps without deleting it.")}</p>${rows.length ? `<ul class="cm-roster">${rows.join("")}</ul>` : `<p class="empty-state">${ctx.t("Nessun personaggio ancora. I giocatori scelgono il loro dalla pagina d’ingresso del link.", "No characters yet. Players pick theirs on the invite link’s join page.")}</p>`}`;
}
function linkRow(ctx, campaignId, link, now) {
  const state = linkState(link, now);
  const labels = {
    active: ctx.t("Attivo", "Active"),
    revoked: ctx.t("Revocato", "Revoked"),
    rotated: ctx.t("Sostituito dopo un’espulsione", "Replaced after a removal"),
    expired: ctx.t("Scaduto", "Expired"),
    "used-up": ctx.t("Usi esauriti", "No uses left"),
  };
  const url = inviteUrl(link.code);
  const uses = link.maxUses ? `${link.uses}/${link.maxUses}` : `${link.uses}/∞`;
  return `<li class="cm-link ${state === "active" ? "" : "is-closed"}"><div class="cm-link-main"><p class="cm-member-name"><strong>${ctx.esc(linkRoleName(ctx, link.role))}</strong> <span class="badge ${state === "active" ? "cm-live" : ""}">${ctx.esc(labels[state])}</span></p><p class="cm-member-meta">${ctx.t("Scade", "Expires")}: ${ctx.esc(link.expiresAt ? when(ctx, link.expiresAt) : ctx.t("mai", "never"))} · ${ctx.t("usi", "uses")} ${ctx.esc(uses)} · ${ctx.t("creato", "created")} ${ctx.esc(ago(ctx, link.createdAt))}</p>${state === "active" ? `<div class="cm-copy"><label><span class="cm-sr">${ctx.t("Link d’invito", "Invite link")}</span><input readonly value="${ctx.esc(url)}" data-cm-url="${ctx.esc(link.code)}"></label><button class="button" data-cm="copy" data-code="${ctx.esc(link.code)}">${ctx.t("Copia", "Copy")}</button></div>` : `<p class="cm-member-meta cm-code">${ctx.esc(link.code)}</p>`}</div>${state === "active" ? `<div class="toolbar"><button class="button quiet danger" data-cm="revoke-link" data-id="${ctx.esc(campaignId)}" data-link="${ctx.esc(link.id)}">${ctx.t("Revoca", "Revoke")}</button></div>` : ""}</li>`;
}
function invitesTab(ctx, campaignId) {
  const meta = metaOf(ctx.state, campaignId);
  const now = Date.now();
  const id = ctx.esc(campaignId);
  const owner = isOwner(ctx.state, campaignId, ctx.role);
  const pending = meta.requests.filter((r) => r.status === "pending");
  const open = meta.links.filter((link) => linkState(link, now) === "active").reverse();
  const closed = meta.links.filter((link) => linkState(link, now) !== "active").reverse();
  const candidates = IDENTITIES.filter(
    (who) => who !== ctx.role && !memberOf(ctx.state, campaignId, who),
  );
  const direct = meta.directInvites.filter((row) => row.status === "pending");
  const option = (value, label, selected) =>
    `<option value="${value}" ${selected ? "selected" : ""}>${label}</option>`;
  const archived = meta.status !== "active";
  return `${archived ? `<p class="cm-note panel" id="cm-archived-why">${ctx.t("La campagna non è attiva: i link non accettano ingressi. Ripristinala da «Gestione» per invitare.", "The campaign is not active: links accept no joins. Restore it from “Manage” to invite.")}</p>` : ""}<section class="cm-block"><div class="section-heading"><h2>${ctx.t("Richieste d’ingresso", "Join requests")} <span class="cm-count">${pending.length}</span></h2></div><label class="check-field cm-approval"><input type="checkbox" data-cm-approval="${id}" ${meta.approval ? "checked" : ""}> ${ctx.t("Approva ogni ingresso dal link prima che la persona entri", "Approve every join from a link before the person enters")}</label>${pending.length ? `<ul class="cm-roster">${pending.map((r) => `<li class="cm-member">${avatar(ctx, nameOf(ctx, r.who), r.who)}<div class="cm-member-main"><p class="cm-member-name"><strong>${ctx.esc(nameOf(ctx, r.who))}</strong> <span class="badge">${ctx.esc(linkRoleName(ctx, r.role))}</span></p><p class="cm-member-meta">${ctx.esc(requestSummary(ctx, r))}</p></div><div class="toolbar cm-member-actions"><button class="button primary" data-cm="approve" data-id="${id}" data-request="${ctx.esc(r.id)}">${ctx.t("Approva", "Approve")}</button><button class="button danger" data-cm="deny" data-id="${id}" data-request="${ctx.esc(r.id)}">${ctx.t("Rifiuta…", "Decline…")}</button></div></li>`).join("")}</ul>` : `<p class="muted">${ctx.t("Nessuna richiesta in attesa.", "No pending request.")}</p>`}</section><section class="cm-block"><div class="section-heading"><h2>${ctx.t("Link d’invito", "Invite links")}</h2></div><form class="cm-link-form" data-cm-form="link" data-id="${id}"><label class="field">${ctx.t("Ruolo", "Role")}<select name="role">${option("player", ctx.t("Giocatore", "Player"), true)}${option("observer", ctx.t("Osservatore", "Observer"))}${owner ? option("co-dm", ctx.t("Co-DM · un uso, 48 ore", "Co-DM · single use, 48 hours")) : ""}</select></label><label class="field">${ctx.t("Scadenza", "Expiry")}<select name="hours">${option(1, ctx.t("1 ora", "1 hour"))}${option(24, ctx.t("24 ore", "24 hours"))}${option(48, ctx.t("48 ore", "48 hours"), true)}${option(168, ctx.t("7 giorni", "7 days"))}${option(0, ctx.t("Nessuna", "Never"))}</select></label><label class="field">${ctx.t("Usi", "Uses")}<select name="uses">${option(1, "1", true)}${option(5, "5")}${option(10, "10")}${option(0, ctx.t("Illimitati", "Unlimited"))}</select></label><button class="button primary" ${archived ? 'disabled aria-describedby="cm-archived-why"' : ""}>${ctx.t("Crea link", "Create link")}</button></form><p class="muted cm-note">${ctx.t("Un link co-DM vale una volta e per 48 ore: condividilo solo con una persona di fiducia. Il ruolo di proprietario non si assegna mai con un link. Quando espelli qualcuno i link giocatore e osservatore vengono sostituiti.", "A co-DM link works once and for 48 hours: share it only with someone you trust. The owner role is never granted by a link. When you remove someone, player and observer links are replaced.")}</p>${open.length ? `<ul class="cm-links">${open.map((link) => linkRow(ctx, campaignId, link, now)).join("")}</ul>` : `<p class="muted">${ctx.t("Nessun link attivo.", "No active link.")}</p>`}${closed.length ? `<details class="cm-details"><summary>${ctx.t("Link non più validi", "Links no longer valid")} (${closed.length})</summary><ul class="cm-links">${closed.map((link) => linkRow(ctx, campaignId, link, now)).join("")}</ul></details>` : ""}</section><section class="cm-block"><div class="section-heading"><h2>${ctx.t("Invita una persona dell’app", "Invite someone in the app")}</h2></div>${candidates.length ? `<form class="cm-link-form" data-cm-form="direct" data-id="${id}"><label class="field">${ctx.t("Persona", "Person")}<select name="to">${candidates.map((who) => option(who, ctx.esc(nameOf(ctx, who)))).join("")}</select></label><label class="field">${ctx.t("Ruolo", "Role")}<select name="role">${option("player", ctx.t("Giocatore", "Player"), true)}${option("observer", ctx.t("Osservatore", "Observer"))}</select></label><button class="button" ${archived ? 'disabled aria-describedby="cm-archived-why"' : ""}>${ctx.t("Invia invito", "Send invitation")}</button></form>` : `<p class="muted">${ctx.t("Tutte le identità della dimostrazione fanno già parte della campagna.", "Every demonstration identity is already in the campaign.")}</p>`}${direct.length ? `<ul class="cm-roster">${direct.map((row) => `<li class="cm-member">${avatar(ctx, nameOf(ctx, row.to), row.to)}<div class="cm-member-main"><p class="cm-member-name"><strong>${ctx.esc(nameOf(ctx, row.to))}</strong> <span class="badge">${ctx.esc(linkRoleName(ctx, row.role))}</span></p><p class="cm-member-meta">${ctx.t("In attesa di risposta", "Waiting for an answer")} · ${ctx.esc(ago(ctx, row.createdAt))}</p></div><div class="toolbar"><button class="button quiet" data-cm="cancel-invite" data-id="${id}" data-invite="${ctx.esc(row.id)}">${ctx.t("Annulla invito", "Cancel invitation")}</button></div></li>`).join("")}</ul>` : ""}</section>`;
}
const AUDIT_TEXT = {
  created: ["ha creato la campagna", "created the campaign"],
  profile: ["ha modificato il profilo", "edited the profile"],
  archived: ["ha archiviato la campagna", "archived the campaign"],
  deleted: ["ha eliminato la campagna", "deleted the campaign"],
  restored: ["ha ripristinato la campagna", "restored the campaign"],
  "approval-on": ["ha attivato l’approvazione degli ingressi", "turned join approval on"],
  "approval-off": ["ha disattivato l’approvazione degli ingressi", "turned join approval off"],
  "link-created": ["ha creato un link d’invito", "created an invite link"],
  "link-revoked": ["ha revocato un link", "revoked a link"],
  "invite-sent": ["ha inviato un invito", "sent an invitation"],
  "invite-cancelled": ["ha annullato un invito", "cancelled an invitation"],
  "invite-declined": ["ha rifiutato un invito", "declined an invitation"],
  requested: ["ha chiesto di entrare", "asked to join"],
  approved: ["ha approvato una richiesta", "approved a request"],
  denied: ["ha rifiutato una richiesta", "declined a request"],
  withdrawn: ["ha ritirato la richiesta", "withdrew the request"],
  joined: ["è entrato nella campagna", "joined the campaign"],
  removed: [
    "ha espulso un membro; i link sono stati sostituiti",
    "removed a member; links were replaced",
  ],
  left: ["è uscito dalla campagna", "left the campaign"],
  role: ["ha cambiato un ruolo", "changed a role"],
  "seat-assigned": ["ha assegnato un personaggio", "assigned a character"],
  "seat-unassigned": ["ha reso non assegnato un personaggio", "unassigned a character"],
  "seat-claimed": ["ha reclamato un personaggio", "claimed a character"],
  "seat-inactive": ["ha disattivato un personaggio", "deactivated a character"],
  "seat-active": ["ha riattivato un personaggio", "reactivated a character"],
  "transfer-proposed": [
    "ha proposto il trasferimento della proprietà",
    "proposed an ownership transfer",
  ],
  "transfer-revoked": ["ha revocato il trasferimento", "revoked the transfer"],
  "transfer-accepted": ["ha accettato la proprietà", "accepted ownership"],
  "transfer-declined": ["ha rifiutato la proprietà", "declined ownership"],
  "handover-start": [
    "ha ceduto il ruolo di DM per la sessione",
    "handed over the DM role for the session",
  ],
  "handover-end": ["ha ripreso il ruolo di DM", "took the DM role back"],
};
function auditLine(ctx, entry) {
  const text = AUDIT_TEXT[entry.kind] ?? [entry.kind, entry.kind];
  const subject =
    entry.data?.who && entry.data.who !== entry.by ? ` (${nameOf(ctx, entry.data.who)})` : "";
  const character = entry.data?.actorId ? ctx.state.actors?.[entry.data.actorId]?.name : null;
  return `<li><span>${ctx.esc(when(ctx, entry.at))}</span> <strong>${ctx.esc(nameOf(ctx, entry.by))}</strong> ${ctx.esc(ctx.t(...text))}${ctx.esc(subject)}${character ? ` · ${ctx.esc(character)}` : ""}</li>`;
}
function manageTab(ctx, campaignId) {
  const meta = metaOf(ctx.state, campaignId);
  const role = roleOf(ctx.state, campaignId, ctx.role);
  const owner = role === "owner";
  const id = ctx.esc(campaignId);
  const current = ctx.state.campaign?.id === campaignId;
  const candidates = membersOf(ctx.state, campaignId).filter((m) =>
    ["co-dm", "player"].includes(roleOf(ctx.state, campaignId, m.id)),
  );
  const transfer = meta.transfer?.status === "pending" ? meta.transfer : null;
  const handover = meta.handover;
  const blocks = [];
  blocks.push(
    `<section class="cm-block"><h2>${ctx.t("Profilo della campagna", "Campaign profile")}</h2><p>${ctx.t("Regole", "Rules")}: <span class="badge">D&amp;D 2024 · SRD ${RULES.srd}</span> <span class="muted">${ctx.t("fissate alla creazione", "fixed at creation")}</span></p><p class="muted">${ctx.t("Creata", "Created")} ${ctx.esc(meta.createdAt ? when(ctx, meta.createdAt) : ctx.t("prima della registrazione", "before records began"))} · ${ctx.t("proprietario", "owner")}: ${ctx.esc(nameOf(ctx, meta.ownerId))}</p>${owner ? `<button class="button" data-cm="profile" data-id="${id}">${ctx.t("Modifica nome, immagine e descrizione…", "Edit name, image and description…")}</button>` : ""}</section>`,
  );
  if (owner)
    blocks.push(
      `<section class="cm-block"><h2>${ctx.t("Proprietà", "Ownership")}</h2>${transfer ? `<p>${ctx.t(`Trasferimento a <strong>${ctx.esc(nameOf(ctx, transfer.to))}</strong> in attesa di risposta.`, `Transfer to <strong>${ctx.esc(nameOf(ctx, transfer.to))}</strong> waiting for an answer.`)} <span class="muted">${ctx.esc(ago(ctx, transfer.createdAt))}</span></p><button class="button" data-cm="transfer-revoke" data-id="${id}">${ctx.t("Revoca il trasferimento", "Revoke the transfer")}</button>` : `<p class="muted">${ctx.t("Passa la gestione a un altro membro: diventerà proprietario e tu resterai co-DM, libero di uscire.", "Pass management to another member: they become owner and you stay as co-DM, free to leave.")}</p><button class="button" data-cm="transfer" data-id="${id}" ${candidates.length ? "" : 'disabled aria-describedby="cm-transfer-why"'}>${ctx.t("Trasferisci la proprietà…", "Transfer ownership…")}</button>${candidates.length ? "" : `<p class="muted" id="cm-transfer-why">${ctx.t("Serve almeno un co-DM o giocatore. Invitane uno da «Inviti».", "At least one co-DM or player is needed. Invite one from “Invitations”.")}</p>`}`}</section>`,
    );
  else
    blocks.push(
      `<section class="cm-block"><h2>${ctx.t("Proprietà", "Ownership")}</h2><p>${ctx.t("Proprietario", "Owner")}: <strong>${ctx.esc(nameOf(ctx, meta.ownerId))}</strong></p>${transfer?.to === ctx.role ? `<div class="toolbar"><button class="button primary" data-cm="transfer-accept" data-id="${id}">${ctx.t("Accetta la proprietà", "Accept ownership")}</button><button class="button" data-cm="transfer-decline" data-id="${id}">${ctx.t("Rifiuta", "Decline")}</button></div>` : ""}</section>`,
    );
  const handoverBody = handover
    ? `<p>${ctx.t(`<strong>${ctx.esc(nameOf(ctx, handover.to))}</strong> fa da DM per la sessione dal ${ctx.esc(when(ctx, handover.startedAt))}: guida tutta la sessione, dal combattimento alle scene e alla Preparazione, muove e fa agire le creature, chiede i tiri e organizza le sessioni.`, `<strong>${ctx.esc(nameOf(ctx, handover.to))}</strong> is DM for the session since ${ctx.esc(when(ctx, handover.startedAt))}: runs the whole session, from combat to scenes and Preparation, moves and acts with the creatures, asks for rolls and organizes sessions.`)}</p><p class="muted">${ctx.t(`Gli appunti privati, i piani personali, le schede personali e le bozze di ${ctx.esc(nameOf(ctx, handover.from))} restano suoi.`, `${ctx.esc(nameOf(ctx, handover.from))}’s private notes, personal plans, personal sheets and drafts stay theirs.`)}</p>${owner ? `<button class="button primary" data-cm="handover-end" data-id="${id}">${ctx.t("Riprendi il ruolo di DM", "Take the DM role back")}</button>` : handover.to === ctx.role ? `<button class="button" data-cm="handover-end" data-id="${id}">${ctx.t("Restituisci il ruolo di DM", "Give the DM role back")}</button>` : ""}`
    : !current
      ? `<p class="muted">${ctx.t("Disponibile quando questa è la campagna in corso.", "Available when this is the current campaign.")}</p>`
      : owner
        ? `<p class="muted">${ctx.t("Chi lo riceve guida tutta la sessione al Tavolo (combattimento, scene, Preparazione, pausa, conto alla rovescia, orologi), muove e fa agire le creature e organizza le sessioni finché non lo riprendi. Lo trovi anche su ogni giocatore dell’elenco «Gruppo» al Tavolo.", "The recipient runs the whole session at the Table (combat, scenes, Preparation, pause, countdown, clocks), moves and acts with the creatures and organizes sessions until you take it back. It is also on each player of the Table’s “Party” list.")}</p><button class="button" data-cm="handover" data-id="${id}" ${candidates.length ? "" : 'disabled aria-describedby="cm-handover-why"'}>${ctx.t("Cedi il ruolo di DM per la sessione…", "Hand over the DM role for the session…")}</button>${candidates.length ? "" : `<p class="muted" id="cm-handover-why">${ctx.t("Serve almeno un co-DM o giocatore a cui cederlo. Invitane uno da «Inviti».", "At least one co-DM or player is needed to hand it to. Invite one from “Invitations”.")}</p>`}`
        : `<p class="muted">${ctx.t("Solo il proprietario può cedere il ruolo di DM per una sessione.", "Only the owner can hand over the DM role for a session.")}</p>`;
  blocks.push(
    `<section class="cm-block" id="cm-handover"><h2>${ctx.t("DM per la sessione", "DM for the session")}</h2>${handoverBody}</section>`,
  );
  if (owner)
    blocks.push(
      `<section class="cm-block"><h2>${ctx.t("Archivio ed eliminazione", "Archive and deletion")}</h2>${current ? `<p class="muted">${ctx.t("È la campagna in corso: puoi archiviarla quando è finita (il Tavolo si chiude finché non la ripristini) e, dopo, eliminarla.", "It is the campaign in play: you can archive it when it is over (the Table closes until you restore it) and then delete it.")}</p><div class="toolbar"><button class="button" data-cm="data-section">${ctx.t("Archivia o elimina…", "Archive or delete…")}</button></div>` : meta.status === "active" ? `<div class="toolbar"><button class="button" data-cm="archive" data-id="${id}">${ctx.t("Archivia", "Archive")}</button><button class="button danger" data-cm="delete" data-id="${id}">${ctx.t("Elimina…", "Delete…")}</button></div>` : `<button class="button primary" data-cm="restore" data-id="${id}">${ctx.t("Ripristina", "Restore")}</button>`}</section>`,
    );
  if (role && !owner)
    blocks.push(
      `<section class="cm-block"><h2>${ctx.t("Uscire", "Leave")}</h2><p class="muted">${ctx.t("La campagna sparirà dal tuo elenco; per rientrare servirà un nuovo invito.", "The campaign disappears from your list; you will need a new invitation to rejoin.")}</p><button class="button danger" data-cm="leave" data-id="${id}">${ctx.t("Esci dalla campagna…", "Leave campaign…")}</button></section>`,
    );
  const log = [...meta.audit].reverse().slice(0, 15);
  blocks.push(
    `<section class="cm-block"><h2>${ctx.t("Attività dei membri", "Member activity")}</h2>${log.length ? `<ol class="cm-audit">${log.map((entry) => auditLine(ctx, entry)).join("")}</ol>` : `<p class="muted">${ctx.t("Nessuna attività registrata.", "No activity recorded.")}</p>`}</section>`,
  );
  return blocks.join("");
}
function renderDetails(ctx, campaignId, tab, mode) {
  const summary = campaignSummary(ctx.state, campaignId, ctx.role);
  const back =
    mode === "page"
      ? `<button type="button" class="button quiet cm-back" data-cm="back">${ctx.icon("arrow")} ${ctx.t("Tutte le campagne", "All campaigns")}</button>`
      : "";
  if (!summary || !summary.role || (summary.status === "deleted" && summary.role !== "owner")) {
    const meta = metaOf(ctx.state, campaignId);
    const removed = meta?.removed?.[ctx.role];
    return `<section class="cm-page">${back}<div class="empty-state"><h1>${ctx.t("Non fai parte di questa campagna", "You are not in this campaign")}</h1><p>${removed ? ctx.t(`Sei stato rimosso il ${ctx.esc(when(ctx, removed.at))}. Per rientrare serve un nuovo invito.`, `You were removed on ${ctx.esc(when(ctx, removed.at))}. You need a new invitation to rejoin.`) : ctx.t("Serve un invito del DM per vederne membri e dettagli.", "You need an invitation from the DM to see its members and details.")}</p><button class="button" data-cm="back">${ctx.t("Le tue campagne", "Your campaigns")}</button></div></section>`;
  }
  const valid = ["members", "characters", "invites", "manage"];
  let current = valid.includes(tab) ? tab : "members";
  if (current === "invites" && !canManage(ctx.state, campaignId, ctx.role)) current = "members";
  const meta = metaOf(ctx.state, campaignId);
  const primary = summary.current
    ? `<button class="button primary" data-cm="enter-table" data-id="${ctx.esc(campaignId)}">${ctx.icon("play")} ${ctx.t("Entra al Tavolo", "Enter table")}</button>${mode === "page" ? `<button class="button" data-cm="open-hub">${ctx.t("Apri campagna", "Open campaign")}</button>` : ""}`
    : summary.status === "active"
      ? launchControl(
          ctx,
          campaignId,
          summary.role,
          `${ctx.icon("play")} ${ctx.t("Avvia la campagna", "Launch campaign")}`,
        )
      : summary.role === "owner"
        ? `<button class="button primary" data-cm="restore" data-id="${ctx.esc(campaignId)}">${ctx.t("Ripristina", "Restore")}</button>`
        : "";
  const body = {
    members: membersTab,
    characters: charactersTab,
    invites: invitesTab,
    manage: manageTab,
  }[current](ctx, campaignId);
  const banner = meta.handover
    ? `<p class="cm-banner" role="status">${ctx.t(`Per questa sessione ${ctx.esc(nameOf(ctx, meta.handover.from))} ha ceduto il ruolo di DM a <strong>${ctx.esc(nameOf(ctx, meta.handover.to))}</strong>.`, `For this session ${ctx.esc(nameOf(ctx, meta.handover.from))} handed the DM role over to <strong>${ctx.esc(nameOf(ctx, meta.handover.to))}</strong>.`)}</p>`
    : "";
  const heading = mode === "page" ? "h1" : "h2";
  return `<section class="cm-page cm-details-page">${back}<header class="cm-hero">${cover(ctx, summary.image, summary.name, "is-large")}<div class="cm-hero-main"><div class="cm-badges"><span class="badge cm-role">${ctx.esc(roleName(ctx, summary.role))}</span>${summary.current ? `<span class="badge cm-live">${ctx.t("In corso", "Current")}</span>` : ""}${summary.status !== "active" ? `<span class="badge">${summary.status === "archived" ? ctx.t("Archiviata", "Archived") : ctx.t("Eliminata", "Deleted")}</span>` : ""}<span class="badge">D&amp;D 2024 · SRD ${RULES.srd}</span></div><${heading} class="cm-hero-title">${ctx.esc(summary.name)}</${heading}>${summary.description ? `<p class="cm-desc">${ctx.esc(summary.description)}</p>` : ""}<p class="cm-member-meta">${ctx.t("Prossima sessione", "Next session")}: ${ctx.esc(summary.nextSession ? sessionText(ctx, summary.nextSession) : ctx.t("da fissare", "not scheduled"))} · ${summary.members.length} ${summary.members.length === 1 ? ctx.t("membro", "member") : ctx.t("membri", "members")}</p><div class="toolbar">${primary}</div></div></header>${banner}${detailTabs(ctx, campaignId, current, mode)}<div class="cm-tab-body">${body}</div></section>`;
}

// ---------------------------------------------------------------- pages: join

function ownCandidates(ctx, campaignId) {
  return Object.values(ctx.state.actors ?? {}).filter(
    (actor) =>
      playable(actor) && actor.owner === ctx.role && !seatRow(ctx.state, campaignId, actor.id),
  );
}
function unassignedCandidates(ctx, campaignId) {
  return rosterOf(ctx.state, campaignId).filter((row) => row.status === "unassigned");
}
function choiceList(ctx, name, rows, label) {
  return `<div class="cm-choices" role="radiogroup" aria-label="${ctx.esc(label)}">${rows
    .map(
      (row, i) =>
        `<label class="cm-choice"><input type="radio" name="${name}" value="${ctx.esc(row.value)}" ${i === 0 ? "checked" : ""} required><span><strong>${ctx.esc(row.title)}</strong><small>${ctx.esc(row.detail)}</small></span></label>`,
    )
    .join("")}</div>`;
}
function joinPanel(ctx, inspection) {
  const code = ctx.esc(inspection.code);
  const path = ui.join?.code === inspection.code ? ui.join.path : null;
  const own = ownCandidates(ctx, inspection.campaignId);
  const unassigned = unassignedCandidates(ctx, inspection.campaignId);
  const tiles = [
    [
      "create",
      "Crea un personaggio",
      "Create a character",
      "Apri il costruttore guidato 2024.",
      "Open the guided 2024 builder.",
      null,
    ],
    [
      "premade",
      "Da un personaggio pronto",
      "Create from a ready-made",
      "Una copia indipendente da personalizzare.",
      "An independent copy to customise.",
      PREMADES.length,
    ],
    [
      "claim",
      "Reclama un personaggio",
      "Claim a character",
      "Una scheda della campagna senza giocatore.",
      "A campaign sheet without a player.",
      unassigned.length,
    ],
    [
      "own",
      "Entra con un tuo personaggio",
      "Join with your character",
      "Una delle tue schede, anche personale.",
      "One of your sheets, personal ones included.",
      own.length,
    ],
  ];
  const tileHTML = tiles
    .map(
      ([id, it, en, dit, den, count]) =>
        `<button type="button" class="cm-path" data-cm="join-path" data-code="${code}" data-path="${id}" aria-pressed="${path === id}"><strong>${ctx.t(it, en)}</strong><span>${ctx.t(dit, den)}</span>${count === null ? "" : `<span class="cm-count">${count} ${ctx.t(count === 1 ? "disponibile" : "disponibili", "available")}</span>`}</button>`,
    )
    .join("");
  const submit = `<button class="button primary">${ctx.t("Controlla chi vedrà la scheda", "Check who will see the sheet")}</button>`;
  let panel = `<p class="muted">${ctx.t("Scegli una delle quattro strade: ognuna fa entrare un personaggio.", "Pick one of the four paths: each one brings in one character.")}</p>`;
  if (path === "create")
    panel = `<div class="cm-path-panel"><p>${ctx.t("Il costruttore crea una scheda personale. Quando è pronta torna a questo invito dal riquadro «Le tue campagne» in Inizio o riaprendo il link: la troverai in «Entra con un tuo personaggio».", "The builder creates a personal sheet. When it is ready, come back to this invitation from “Your campaigns” on Home or by reopening the link: you will find it under “Join with your character”.")}</p><button class="button primary" data-cm="join-builder" data-code="${code}">${ctx.t("Apri il costruttore", "Open the builder")}</button></div>`;
  if (path === "premade")
    panel = `<form class="cm-path-panel" data-cm-form="join" data-code="${code}" data-path="premade">${choiceList(
      ctx,
      "premadeId",
      PREMADES.map((row) => ({
        value: row.id,
        title: ctx.label(row.title),
        detail: ctx.label(row.summary),
      })),
      ctx.t("Personaggi pronti", "Ready-made characters"),
    )}<label class="field">${ctx.t("Nome del personaggio", "Character name")}<input name="name" maxlength="60" required value="${ctx.esc(PREMADES[0].name)}"></label>${submit}</form>`;
  if (path === "claim")
    panel = unassigned.length
      ? `<form class="cm-path-panel" data-cm-form="join" data-code="${code}" data-path="claim">${choiceList(
          ctx,
          "actorId",
          unassigned.map((row) => {
            const actor = ctx.state.actors[row.actorId];
            return {
              value: row.actorId,
              title: actor.name,
              detail: `${ctx.label(actor.className)} · ${ctx.t("livello", "level")} ${actor.level} · ${ctx.t("scheda di", "sheet of")} ${nameOf(ctx, row.ownerId)}`,
            };
          }),
          ctx.t("Personaggi da reclamare", "Characters to claim"),
        )}${submit}</form>`
      : `<div class="cm-path-panel"><p>${ctx.t("Nessun personaggio non assegnato in questa campagna. Il DM può liberarne uno, oppure scegli un’altra strada.", "No unassigned character in this campaign. The DM can release one, or pick another path.")}</p></div>`;
  if (path === "own")
    panel = own.length
      ? `<form class="cm-path-panel" data-cm-form="join" data-code="${code}" data-path="own">${choiceList(
          ctx,
          "actorId",
          own.map((actor) => ({
            value: actor.id,
            title: actor.name,
            detail: `${ctx.label(actor.className)} · ${ctx.t("livello", "level")} ${actor.level}${actor.visibility === "private" ? ` · ${ctx.t("personale: diventerà consultabile dal gruppo", "personal: the group will be able to view it")}` : ""}`,
          })),
          ctx.t("I tuoi personaggi", "Your characters"),
        )}${submit}</form>`
      : `<div class="cm-path-panel"><p>${ctx.t("Non hai personaggi liberi per questa campagna. Creane uno o scegli un personaggio pronto.", "You have no free characters for this campaign. Create one or pick a ready-made character.")}</p></div>`;
  return `<h2>${ctx.t("Come vuoi entrare?", "How do you want to join?")}</h2><div class="cm-paths">${tileHTML}</div>${panel}`;
}
function renderJoin(ctx, code) {
  const now = Date.now();
  const inspection = inspectInvite(ctx.state, code, ctx.role, now);
  const back = `<button type="button" class="button quiet cm-back" data-cm="back">${ctx.icon("arrow")} ${ctx.t("Le tue campagne", "Your campaigns")}</button>`;
  // A link that no longer works discloses nothing about the campaign to someone with no
  // relation to it (not a member, no request made through it).
  const reveal =
    inspection.status === "ok" ||
    Boolean(inspection.memberRole || inspection.pending || inspection.decision);
  if (inspection.status === "unknown" || !reveal)
    return `<section class="cm-page cm-join">${back}<div class="cm-problem panel" role="alert"><h1>${inspection.status === "unknown" ? ctx.t("Invito non valido", "Invalid invitation") : ctx.t("Non puoi usare questo invito", "You cannot use this invitation")}</h1><p>${ctx.esc(ctx.label(inviteProblem(inspection)))}</p><button class="button" data-cm="paste-link">${ctx.t("Incolla un altro link", "Paste another link")}</button></div></section>`;
  const link = inspection.link;
  const facts = [
    `${ctx.t("DM", "DM")}: ${ctx.esc(nameOf(ctx, inspection.ownerId))}`,
    `${ctx.t("Entri come", "You join as")}: ${ctx.esc(linkRoleName(ctx, inspection.role))}`,
    link
      ? `${ctx.t("Scade", "Expires")}: ${ctx.esc(link.expiresAt ? when(ctx, link.expiresAt) : ctx.t("mai", "never"))}`
      : ctx.t("Invito personale", "Personal invitation"),
    link?.maxUses
      ? `${ctx.t("Usi rimasti", "Uses left")}: ${Math.max(0, link.maxUses - link.uses)}/${link.maxUses}`
      : "",
    inspection.approval ? ctx.t("Il DM approva ogni ingresso", "The DM approves every join") : "",
    "D&amp;D 2024 · SRD " + RULES.srd,
  ].filter(Boolean);
  const hero = `<header class="cm-hero">${cover(ctx, inspection.image, inspection.name, "is-large")}<div class="cm-hero-main"><p class="muted">${ctx.t("Sei invitato in", "You are invited to")}</p><h1 class="cm-hero-title">${ctx.esc(inspection.name)}</h1>${inspection.description ? `<p class="cm-desc">${ctx.esc(inspection.description)}</p>` : ""}<ul class="cm-facts-line">${facts.map((fact) => `<li>${fact}</li>`).join("")}</ul></div></header>`;
  const decision = inspection.decision;
  const decisionHTML =
    decision?.status === "denied"
      ? `<div class="cm-problem panel" role="alert"><h2>${ctx.t("Richiesta rifiutata", "Request declined")}</h2><p>${ctx.t(`${ctx.esc(nameOf(ctx, decision.decidedBy))} ha rifiutato la tua richiesta.`, `${ctx.esc(nameOf(ctx, decision.decidedBy))} declined your request.`)}</p>${decision.message ? `<q class="cm-quote">${ctx.esc(decision.message)}</q>` : ""}</div>`
      : decision?.status === "approved" && inspection.memberRole
        ? `<p class="cm-banner" role="status">${ctx.t("Richiesta approvata: sei nella campagna.", "Request approved: you are in the campaign.")}</p>`
        : "";
  if (inspection.status !== "ok") {
    const pending = inspection.pending;
    const actions = [
      inspection.memberRole
        ? `<button class="button primary" data-cm="details" data-id="${ctx.esc(inspection.campaignId)}">${ctx.t("Apri la campagna", "Open the campaign")}</button>`
        : "",
      pending
        ? `<button class="button" data-cm="withdraw" data-id="${ctx.esc(inspection.campaignId)}" data-request="${ctx.esc(pending.id)}">${ctx.t("Ritira richiesta", "Withdraw request")}</button>`
        : "",
      `<button class="button" data-cm="paste-link">${ctx.t("Incolla un altro link", "Paste another link")}</button>`,
    ].join("");
    const problem = inviteProblem(inspection);
    return `<section class="cm-page cm-join">${back}${hero}${decisionHTML}<div class="cm-problem panel" role="alert"><h2>${inspection.status === "pending" ? ctx.t("In attesa del DM", "Waiting for the DM") : ctx.t("Non puoi usare questo invito", "You cannot use this invitation")}</h2><p>${ctx.esc(ctx.label(problem))}</p>${pending && inspection.status !== "pending" ? `<p>${ctx.t("La tua richiesta precedente è ancora in attesa del DM.", "Your earlier request is still waiting for the DM.")}</p>` : ""}${pending ? `<p class="muted">${ctx.esc(requestSummary(ctx, pending))}</p>` : ""}<div class="toolbar">${actions}</div></div></section>`;
  }
  // A personal invitation (VTL-007/VTL-039) is accepted by joining here or declined.
  const declineDirect =
    inspection.kind === "direct"
      ? `<div class="toolbar cm-decline"><button class="button" data-cm="decline-invite" data-id="${ctx.esc(inspection.campaignId)}" data-invite="${ctx.esc(inspection.invite.id)}">${ctx.t("Rifiuta l’invito", "Decline the invitation")}</button></div>`
      : "";
  const body =
    inspection.role === "player"
      ? joinPanel(ctx, inspection)
      : `<div class="cm-path-panel"><p>${inspection.role === "observer" ? ctx.t("Da osservatore segui scene e contenuti condivisi senza controllare personaggi.", "As an observer you follow shared scenes and content without controlling characters.") : ctx.t("Da co-DM organizzi le sessioni e gestisci inviti, membri e personaggi con il DM, che resta il proprietario.", "As co-DM you organize sessions and manage invitations, members and characters with the DM, who stays the owner.")}</p><button class="button primary" data-cm="join-none" data-code="${ctx.esc(inspection.code)}">${inspection.role === "observer" ? ctx.t("Entra come osservatore…", "Join as observer…") : ctx.t("Entra come co-DM…", "Join as co-DM…")}</button></div>`;
  return `<section class="cm-page cm-join">${back}${hero}${decisionHTML}${declineDirect}${body}</section>`;
}

export function renderCampaignsPage(ctx) {
  if (ctx.view.tab === "join") return renderJoin(ctx, ctx.view.id);
  if (ctx.view.id) return renderDetails(ctx, ctx.view.id, ctx.view.tab, "page");
  return renderList(ctx);
}
export function renderMembersSection(ctx) {
  return renderDetails(ctx, ctx.state.campaign?.id, ctx.view.id, "section");
}
// Home "Your character" (core block "summary", which always shows the sample sheet
// Livia) while the campaign in play is one Livia is not in, or while a playing member
// does not play her there (observer, unassigned seat, Livia reassigned): the characters
// this identity plays here (DDB campaign page lists "your characters" per campaign),
// then the recap. The seat decides, as it does at the Table (character-access.mjs).
export function showsHomeSummary(ctx) {
  const campaignId = ctx.state.campaign?.id;
  if (!campaignId || !getCampaignHub(ctx.state, campaignId, ctx.role).permissions.canRead)
    return false;
  if (!isCampaignActor(ctx.state.actors?.livia, campaignId)) return true;
  return (
    !canManage(ctx.state, campaignId, ctx.role) &&
    !playedBy(ctx.state, campaignId, ctx.role).includes("livia")
  );
}
export function renderHomeSummary(ctx) {
  const campaignId = ctx.state.campaign?.id;
  const role = roleOf(ctx.state, campaignId, ctx.role);
  const recap = getCampaignHub(ctx.state, campaignId, ctx.role).latestRecap;
  const sheets = playedBy(ctx.state, campaignId, ctx.role)
    .map((id) => ctx.state.actors[id])
    .filter((actor) => canViewActor(actor, ctx.role, ctx.state));
  const none =
    role === "observer"
      ? ctx.t(
          "Segui questa campagna senza personaggio.",
          "You follow this campaign without a character.",
        )
      : role === "owner" || role === "co-dm"
        ? ctx.t(
            "Non giochi un personaggio in questa campagna: la conduci.",
            "You play no character in this campaign: you run it.",
          )
        : ctx.t(
            "Nessun personaggio assegnato a te in questa campagna.",
            "No character is assigned to you in this campaign.",
          );
  const characters = sheets.length
    ? sheets
        .map(
          (actor) =>
            `<button class="character-resume" data-open-sheet="${ctx.esc(actor.id)}"><span class="portrait">${ctx.esc(initials(actor.name).slice(0, 1))}</span><span><strong>${ctx.esc(actor.name)}</strong><small>${ctx.esc(ctx.label(actor.className))} · ${ctx.t("Livello", "Level")} ${ctx.esc(actor.level)}</small></span><span class="hp-small">${ctx.esc(actor.hp)} / ${ctx.esc(actor.maxHp)}<small>${ctx.t("Punti ferita", "Hit points")}</small></span>${ctx.icon("book")}</button>`,
        )
        .join("")
    : `<p>${none}</p>${role === "player" ? `<button class="button" data-cm="details" data-id="${ctx.esc(campaignId)}" data-tab="characters">${ctx.t("Personaggi della campagna", "Campaign characters")}</button>` : ""}`;
  const previously = recap
    ? `<h3>${ctx.esc(recap.data.title || ctx.t("Resoconto senza titolo", "Untitled recap"))}</h3><p>${ctx.esc(String(recap.data.body ?? "").slice(0, 240))}</p><button class="text-button" data-home-recap="${ctx.esc(recap.id)}">${ctx.t("Leggi il resoconto", "Read recap")}</button>`
    : `<p>${ctx.t("Nessun resoconto disponibile. Puoi comunque giocare.", "No recap available. You can still play.")}</p><button class="text-button" data-campaign-tab="journal">${ctx.t("Apri il diario", "Open the journal")}</button>`;
  return `<div class="home-bottom cm-home-summary"><section><div class="section-heading"><h2>${ctx.t(sheets.length > 1 ? "I tuoi personaggi" : "Il tuo personaggio", sheets.length > 1 ? "Your characters" : "Your character")}</h2></div>${characters}</section><section><div class="section-heading"><h2>${ctx.t("Dove eravamo rimasti", "Previously")}</h2></div>${previously}</section></div>`;
}
// On the sheet: a character the DM deactivated in the campaign in play says so, and why
// "Connect to campaign" is refused until the DM reactivates it (DDB-075).
export function renderDeactivatedNotice(ctx, actor) {
  const campaignId = ctx.state.campaign?.id;
  const manage = canManage(ctx.state, campaignId, ctx.role);
  return `<section class="panel cm-deactivated" role="status"><h3>${ctx.t("Disattivato in questa campagna", "Deactivated in this campaign")}</h3><p>${ctx.t(`Il DM ha disattivato ${ctx.esc(actor.name)} in «${ctx.esc(campaignName(ctx, campaignId))}»: la scheda resta tua ma è fuori da strumenti e mappe finché il DM non la riattiva.`, `The DM deactivated ${ctx.esc(actor.name)} in “${ctx.esc(campaignName(ctx, campaignId))}”: the sheet stays yours but is out of the campaign’s tools and maps until the DM reactivates it.`)}</p>${manage ? `<button class="button" data-cm="details" data-id="${ctx.esc(campaignId)}" data-tab="characters">${ctx.t("Apri i personaggi della campagna", "Open the campaign characters")}</button>` : ""}</section>`;
}
// On the sheet: why your own sheet is view-only in a campaign, with the way back where
// there is one (Claim, DDB-074). The sheet stays yours (DDB-075).
export function renderSeatNotice(ctx, actor) {
  const block = seatBlock(ctx.state, actor, ctx.role);
  if (!block) return "";
  const name = ctx.esc(actor.name);
  const campaign = ctx.esc(campaignName(ctx, block.campaignId));
  const text = {
    left: [
      `Non fai più parte di «${campaign}», dove ${name} resta: la scheda è tua ma è in sola consultazione finché resta in quella campagna. Il DM può riassegnarla o toglierla dalla campagna (Disattiva).`,
      `You are no longer in “${campaign}”, where ${name} stays: the sheet is yours but view-only while it stays in that campaign. The DM can reassign it or take it out of the campaign (Deactivate).`,
    ],
    observer: [
      `Sei osservatore in «${campaign}»: segui senza personaggio. Se il DM ti rende giocatore puoi reclamare ${name}.`,
      `You are an observer in “${campaign}”: you follow without a character. If the DM makes you a player you can claim ${name}.`,
    ],
    unassigned: [
      `${name} non è assegnato a nessuno in «${campaign}»: reclamalo per giocarlo di nuovo.`,
      `${name} is not assigned to anyone in “${campaign}”: claim it to play it again.`,
    ],
    other: [
      `In «${campaign}» ${name} è giocato da ${ctx.esc(nameOf(ctx, block.holder))}: la scheda resta tua, ma in quella campagna la usa solo chi la gioca.`,
      `In “${campaign}” ${name} is played by ${ctx.esc(nameOf(ctx, block.holder))}: the sheet stays yours, but in that campaign only whoever plays it uses it.`,
    ],
  }[block.reason];
  const claim =
    block.reason === "unassigned"
      ? `<button class="button primary" data-cm="claim" data-id="${ctx.esc(block.campaignId)}" data-actor="${ctx.esc(actor.id)}">${ctx.t("Reclama", "Claim")}</button>`
      : block.reason !== "left"
        ? `<button class="button" data-cm="details" data-id="${ctx.esc(block.campaignId)}" data-tab="characters">${ctx.t("Personaggi della campagna", "Campaign characters")}</button>`
        : "";
  return `<section class="panel cm-deactivated" role="status"><h3>${ctx.t("Sola consultazione in questa campagna", "View-only in this campaign")}</h3><p>${ctx.t(...text)}</p>${claim}</section>`;
}
// P10 CA-84 (Roll20 cold storage): while the campaign in play is archived or in the trash
// its Table is closed for everyone; the owner reopens it from here in one step.
export function closedStatus(ctx) {
  const status = metaOf(ctx.state, ctx.state.campaign?.id)?.status;
  return status === "archived" || status === "deleted" ? status : null;
}
export function renderClosedCover(ctx) {
  const id = ctx.state.campaign?.id;
  const status = closedStatus(ctx);
  const owner = isOwner(ctx.state, id, ctx.role);
  const title =
    status === "archived"
      ? ctx.t("Campagna archiviata", "Campaign archived")
      : ctx.t("Campagna nel cestino", "Campaign in the trash");
  const body =
    status === "archived"
      ? ctx.t(
          "Il Tavolo resta chiuso finché la campagna non viene ripristinata. Diario, Mondo e schede restano da leggere.",
          "The Table stays closed until the campaign is restored. Journal, World and sheets stay readable.",
        )
      : ctx.t(
          "La campagna è nel cestino: si recupera entro 30 giorni.",
          "The campaign is in the trash: it can be recovered within 30 days.",
        );
  const action = owner
    ? status === "archived"
      ? `<button class="button primary" data-cm="restore" data-id="${ctx.esc(id)}">${ctx.t("Ripristina la campagna", "Restore the campaign")}</button>`
      : `<button class="button primary" data-cm="data-section">${ctx.t("Apri il cestino", "Open the trash")}</button>`
    : "";
  return `<section class="cm-closed-cover" data-cm-closed="${status}" role="status"><h1>${ctx.esc(title)}</h1><p class="cm-desc">${ctx.esc(campaignName(ctx, id))}</p><p>${body}</p><div class="toolbar">${action}<button class="button" data-nav="campaigns">${ctx.t("Le tue campagne", "Your campaigns")}</button></div></section>`;
}
export function renderHomeWidget(ctx) {
  const others = listCampaigns(ctx.state, ctx.role).filter((row) => !row.current);
  const incoming = incomingFor(ctx.state, ctx.role);
  const queue = managerQueue(ctx.state, ctx.role);
  const pendingJoin = sliceOf(ctx.state)?.joinReturns?.[ctx.role];
  const joinTarget = pendingJoin ? inspectInvite(ctx.state, pendingJoin.code, ctx.role) : null;
  const rows = others
    .map(
      (row) =>
        `<li class="cm-home-row">${cover(ctx, row.image, row.name, "is-small")}<div><strong>${ctx.esc(row.name)}</strong><small>${ctx.esc(roleName(ctx, row.role))} · ${ctx.esc(row.nextSession ? sessionText(ctx, row.nextSession) : ctx.t("prossima sessione da fissare", "next session not scheduled"))}${canManage(ctx.state, row.id, ctx.role) ? "" : ` · ${ctx.t("non in corso: la avvia il DM", "not in play: the DM launches it")}`}</small></div>${canManage(ctx.state, row.id, ctx.role) ? `<button class="button" data-cm="launch" data-id="${ctx.esc(row.id)}">${ctx.t("Avvia", "Launch")}</button>` : `<button class="button" data-cm="details" data-id="${ctx.esc(row.id)}">${ctx.t("Dettagli", "Details")}</button>`}</li>`,
    )
    .join("");
  const current = ctx.state.campaign?.id;
  const invite =
    current &&
    canManage(ctx.state, current, ctx.role) &&
    metaOf(ctx.state, current)?.status === "active"
      ? `<li class="cm-home-row cm-home-invite"><span class="cm-dot is-invite" aria-hidden="true"></span><div><strong>${ctx.esc(campaignName(ctx, current))}</strong><small>${ctx.t("Manda un link ai tuoi giocatori: scelgono il personaggio ed entrano.", "Send a link to your players: they pick a character and join.")}</small></div>${inviteButton(ctx, "button primary", "cm")}</li>`
      : "";
  const notices = [
    invite,
    incoming.length || queue.length
      ? `<li class="cm-home-row"><span class="cm-dot" aria-hidden="true"></span><div><strong>${ctx.t(`${incoming.length + queue.length} tra inviti e richieste`, `${incoming.length + queue.length} invitations and requests`)}</strong><small>${ctx.t("Accetta, rifiuta o decidi dalla pagina Campagne.", "Accept, decline or decide from the Campaigns page.")}</small></div><button class="button" data-nav="campaigns">${ctx.t("Apri", "Open")}</button></li>`
      : "",
    pendingJoin && joinTarget?.status === "ok"
      ? `<li class="cm-home-row"><span class="cm-dot" aria-hidden="true"></span><div><strong>${ctx.t(`Continua l’ingresso in ${ctx.esc(joinTarget.name)}`, `Continue joining ${ctx.esc(joinTarget.name)}`)}</strong><small>${ctx.t("Scegli il personaggio appena creato.", "Pick the character you just created.")}</small></div><button class="button primary" data-cm="continue-join" data-code="${ctx.esc(pendingJoin.code)}">${ctx.t("Continua", "Continue")}</button></li>`
      : "",
  ].join("");
  return `<section class="cm-home" aria-labelledby="cm-home-title"><div class="section-heading"><h2 id="cm-home-title">${ctx.t("Le tue campagne", "Your campaigns")}</h2><button class="text-button" data-nav="campaigns">${ctx.t("Tutte le campagne", "All campaigns")}</button></div>${notices || rows ? `<ul class="cm-home-list">${notices}${rows}</ul>` : `<p class="muted">${ctx.t("Nessun’altra campagna. Puoi crearne una o unirti con un link d’invito.", "No other campaign. You can create one or join with an invite link.")}</p><div class="toolbar"><button class="button" data-cm="create">${ctx.t("Crea campagna", "Create campaign")}</button><button class="button" data-cm="paste-link">${ctx.t("Ho un link d’invito", "I have an invite link")}</button></div>`}</section>`;
}

// ---------------------------------------------------------------- dialogs and actions

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read"));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
// The image field reads the file when chosen; the form submits synchronously.
function watchImage(ctx, holder) {
  const input = globalThis.document?.querySelector("#dialog [data-cm-image]");
  const status = globalThis.document?.querySelector("#dialog [data-cm-image-status]");
  if (!input) return;
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    holder.error = "";
    holder.value = undefined;
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      !file.size ||
      file.size > MAX_IMAGE_BYTES
    ) {
      holder.error = ctx.t(
        "Scegli un file PNG, JPG o WebP di massimo 1 MB.",
        "Choose a PNG, JPG or WebP file up to 1 MB.",
      );
      input.value = "";
      if (status) status.textContent = holder.error;
      return;
    }
    holder.loading = true;
    if (status) status.textContent = ctx.t("Lettura dell’immagine…", "Reading the image…");
    try {
      holder.value = await readImageFile(file);
      if (status)
        status.textContent = ctx.t(`Immagine pronta: ${file.name}`, `Image ready: ${file.name}`);
    } catch {
      holder.error = ctx.t("Il file non si può leggere.", "The file cannot be read.");
      if (status) status.textContent = holder.error;
    } finally {
      holder.loading = false;
    }
  });
}
function imageFromHolder(ctx, holder) {
  if (holder.loading) refuse("Attendi la lettura dell’immagine.", "Wait for the image to be read.");
  if (holder.error)
    throw Object.assign(new Error(holder.error), { it: holder.error, en: holder.error });
  return holder.value;
}
const localZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};
function profileFields(ctx, values = {}) {
  return `<label class="field">${ctx.t("Nome della campagna", "Campaign name")}<input name="name" required maxlength="80" autocomplete="off" value="${ctx.esc(values.name ?? "")}"></label><label class="field">${ctx.t("Immagine (PNG, JPG o WebP, massimo 1 MB)", "Image (PNG, JPG or WebP, up to 1 MB)")}<input type="file" name="image" accept="image/png,image/jpeg,image/webp" data-cm-image></label><p class="muted" data-cm-image-status aria-live="polite"></p>${values.image ? `<label class="check-field"><input type="checkbox" name="removeImage"> ${ctx.t("Rimuovi l’immagine attuale", "Remove the current image")}</label>` : ""}<label class="field">${ctx.t("Descrizione", "Description")}<textarea name="description" maxlength="1000">${ctx.esc(values.description ?? "")}</textarea></label><label class="field">${ctx.t("Etichette, separate da virgole", "Tags, separated by commas")}<input name="tags" maxlength="200" value="${ctx.esc((values.tags ?? []).join(", "))}"></label>`;
}
// `afterCreate(id)`: where to go once the campaign exists (R7 CA-88: back to the copy).
function openCreateDialog(ctx, { afterCreate = null } = {}) {
  const holder = {};
  // P8 BI-41 (Roll20 «Create game with module»): start from an adventure of the Library;
  // the adventures area's command creates the campaign with its content.
  const fromAdventure = ctx.registry?.get?.("command", "adventures.create-campaign", ctx);
  const adventures = fromAdventure ? (ctx.state.ext?.adventures?.adventures ?? []) : [];
  const startFrom = adventures.length
    ? `<label class="field">${ctx.t("Parti da", "Start from")}<select name="adventure"><option value="">${ctx.t("Campagna vuota", "Empty campaign")}</option>${adventures.map((a) => `<option value="${ctx.esc(a.id)}">${ctx.t("Parti da un’avventura", "Start from an adventure")}: ${ctx.esc(a.title)}</option>`).join("")}</select></label>`
    : "";
  ctx.dialog(
    ctx.t("Crea campagna", "Create campaign"),
    `${startFrom}${profileFields(ctx)}<p class="cm-rules"><span class="badge">D&amp;D 2024 · SRD ${RULES.srd}</span> ${ctx.t("Le regole si fissano alla creazione, come il sistema di un mondo Foundry.", "Rules are fixed at creation, like a Foundry world’s system.")}</p><fieldset class="cm-fieldset"><legend>${ctx.t("Prossima sessione (facoltativa)", "Next session (optional)")}</legend><div class="form-grid"><label class="field">${ctx.t("Data e ora", "Date and time")}<input type="datetime-local" name="nextLocal"></label><label class="field">${ctx.t("Fuso orario IANA", "IANA time zone")}<input name="timeZone" value="${ctx.esc(localZone())}" autocomplete="off"></label></div></fieldset>`,
    {
      submitLabel: ctx.t("Crea campagna", "Create campaign"),
      onSubmit(data) {
        if (fromAdventure && data.get("adventure"))
          return void ctx.registry.run(fromAdventure, ctx, {
            adventureId: String(data.get("adventure")),
            name: data.get("name"),
            description: data.get("description"),
          });
        const image = imageFromHolder(ctx, holder) ?? null;
        let id;
        shared(
          ctx,
          ctx.t("Campagna creata", "Campaign created"),
          (draft) => {
            id = createCampaign(
              draft,
              {
                name: data.get("name"),
                description: data.get("description"),
                tags: data.get("tags"),
                image,
                nextLocal: data.get("nextLocal") || "",
                timeZone: data.get("timeZone"),
                sceneName: ctx.t("Scena iniziale", "Opening scene"),
              },
              ctx.role,
              Date.now(),
            );
          },
          // The legacy membership written out on the first creation is replayed on the
          // undo stack (and kept by reconcileAfterUndo): everyone's Undo stays.
        );
        ctx.toast(
          ctx.t(
            "Campagna creata. Invita i giocatori o avviala quando vuoi.",
            "Campaign created. Invite players or launch it whenever you like.",
          ),
        );
        if (typeof afterCreate === "function") return void afterCreate(id);
        ctx.navigate("campaigns", { id, tab: "invites" });
      },
    },
  );
  watchImage(ctx, holder);
}
function openProfileDialog(ctx, campaignId) {
  const summary = campaignSummary(ctx.state, campaignId, ctx.role);
  const holder = {};
  ctx.dialog(ctx.t("Profilo della campagna", "Campaign profile"), profileFields(ctx, summary), {
    submitLabel: ctx.t("Salva profilo", "Save profile"),
    onSubmit(data) {
      const chosen = imageFromHolder(ctx, holder);
      const image = data.has("removeImage") ? null : chosen === undefined ? undefined : chosen;
      shared(ctx, ctx.t("Profilo della campagna aggiornato", "Campaign profile updated"), (draft) =>
        updateCampaignProfile(
          draft,
          campaignId,
          {
            name: data.get("name"),
            description: data.get("description"),
            tags: data.get("tags"),
            image,
          },
          ctx.role,
          Date.now(),
        ),
      );
    },
  });
  watchImage(ctx, holder);
}
function openPasteDialog(ctx) {
  ctx.dialog(
    ctx.t("Apri un link d’invito", "Open an invite link"),
    `<label class="field">${ctx.t("Incolla il link o il codice ricevuto", "Paste the link or code you received")}<input name="link" required autocomplete="off" placeholder="…#campaigns?tab=join&amp;id=ABCD-EFGH-JKLM"></label>`,
    {
      submitLabel: ctx.t("Apri invito", "Open invitation"),
      onSubmit(data) {
        const code = normalizeCode(data.get("link"));
        if (!code) refuse("Incolla un link o un codice.", "Paste a link or a code.");
        ui.join = null;
        ctx.navigate("campaigns", { tab: "join", id: code });
      },
    },
  );
}
function audienceHTML(ctx, preview) {
  const rows = preview.audience.map(
    (row) =>
      `<li><span>${ctx.esc(nameOf(ctx, row.id))} <small class="muted">${ctx.esc(roleName(ctx, row.role))}</small></span><span class="badge">${row.access === "manage" ? ctx.t("Può consultarla e gestirla", "Can view and manage it") : ctx.t("Può consultarla", "Can view it")}</span></li>`,
  );
  rows.push(
    `<li><span>${ctx.esc(nameOf(ctx, ctx.role))} <small class="muted">${ctx.t("tu", "you")}</small></span><span class="badge cm-live">${ctx.t("La controlli", "You control it")}</span></li>`,
  );
  return `<ul class="cm-audience">${rows.join("")}</ul>`;
}
// R7 CA-75: «Contenuti richiesti» in the join preview, one row per homebrew revision.
const CONTENT_GROUPS = {
  arrives: ["Arriva con la campagna", "Comes with the campaign"],
  "campaign-missing": ["Manca alla campagna", "Missing from the campaign"],
  character: ["La campagna non la usa ancora", "The campaign does not use it yet"],
};
function requiredContentHTML(ctx, input, preview) {
  const rows = joinContentCheck(ctx.state, input, ctx.role);
  if (!rows.length) return "";
  const owner = ctx.esc(nameOf(ctx, metaOf(ctx.state, preview.campaignId)?.ownerId));
  const items = rows.map((row, i) => {
    const name = row.name
      ? ctx.esc(ctx.label(row.name))
      : row.group === "arrives"
        ? ctx.t("Contenuto homebrew del DM", "The DM’s homebrew content")
        : ctx.t("Revisione non disponibile in nessuna Biblioteca", "Revision held by no Library");
    const detail =
      row.group === "arrives"
        ? row.name
          ? ctx.t(
              "Pronto: la campagna lo usa e il DM lo ha.",
              "Ready: the campaign uses it and the DM holds it.",
            )
          : ctx.t(
              "Pronto: lo vedrai quando il DM lo condivide con te.",
              "Ready: you will see it when the DM shares it with you.",
            )
        : row.group === "campaign-missing"
          ? ctx.t(
              `La campagna la usa ma la Biblioteca di ${owner} non ce l’ha: il DM deve aggiungerla.`,
              `The campaign uses it but ${owner}’s Library does not hold it: the DM must add it.`,
            )
          : ctx.t(
              `La usa ${ctx.esc(ctx.state.actors?.[row.actorId]?.name ?? "")}: il DM deve abilitarla. Chiedere gli fa leggere questa revisione, così può abilitarla.`,
              `${ctx.esc(ctx.state.actors?.[row.actorId]?.name ?? "")} uses it: the DM must enable it. Asking lets the DM read this revision, so they can enable it.`,
            );
    const why = `cm-content-why-${i}`;
    const action = !row.action
      ? `<span class="badge cm-live">${ctx.t("Pronto", "Ready")}</span>`
      : row.asked
        ? `<button type="button" class="button" disabled aria-describedby="${why}">${ctx.t("Chiesto al DM", "Asked the DM")}</button><small class="cm-reason" id="${why}">${ctx.t("Già chiesto: il DM la vede tra inviti e richieste.", "Already asked: the DM sees it among invitations and requests.")}</small>`
        : `<button type="button" class="button" data-cm-content-ask="${ctx.esc(`${row.ref.contentId}@${row.ref.revisionId}`)}" data-id="${ctx.esc(preview.campaignId)}" data-code="${ctx.esc(input.code)}" data-content="${ctx.esc(row.ref.contentId)}" data-revision="${ctx.esc(row.ref.revisionId)}" data-actor="${ctx.esc(row.actorId ?? "")}">${ctx.t("Chiedi al DM", "Ask the DM")}</button>`;
    const [it, en] = CONTENT_GROUPS[row.group];
    return `<li class="cm-content-row is-${row.group}" data-cm-content-row="${ctx.esc(row.group)}"><span class="cm-content-main"><span class="cm-content-title"><strong>${name}</strong> <span class="badge">${ctx.t(it, en)}</span></span><small>${detail}</small></span><span class="toolbar">${action}</span></li>`;
  });
  return `<h3>${ctx.t("Contenuti richiesti", "Required content")}</h3><p class="muted">${ctx.t("I contenuti homebrew che servono per giocare qui, come la verifica delle mod di BG3 prima di entrare.", "The homebrew needed to play here, like BG3’s mod check before joining.")}</p><ul class="cm-content-list">${items.join("")}</ul>`;
}
function openJoinPreview(ctx, input) {
  const preview = previewJoin(ctx.state, input, ctx.role, Date.now());
  const character = preview.characterName;
  const lines = [];
  if (preview.path === "none")
    lines.push(
      `<p>${ctx.t(`Entrerai in <strong>${ctx.esc(preview.campaignName)}</strong> come ${ctx.esc(linkRoleName(ctx, preview.role).toLowerCase())}, senza personaggio.`, `You will join <strong>${ctx.esc(preview.campaignName)}</strong> as ${ctx.esc(linkRoleName(ctx, preview.role).toLowerCase())}, without a character.`)}</p><h3>${ctx.t("Chi saprà che sei entrato", "Who will see that you joined")}</h3>${audienceHTML(ctx, preview)}`,
    );
  else {
    lines.push(
      `<p>${ctx.t(`<strong>${ctx.esc(character)}</strong> entrerà in <strong>${ctx.esc(preview.campaignName)}</strong> come tuo personaggio.`, `<strong>${ctx.esc(character)}</strong> will join <strong>${ctx.esc(preview.campaignName)}</strong> as your character.`)}</p><h3>${ctx.t("Chi potrà vedere la scheda", "Who will see the sheet")}</h3>${audienceHTML(ctx, preview)}`,
    );
    if (preview.path === "premade")
      lines.push(
        `<p>${ctx.t("Verrà creata una copia indipendente: le modifiche non toccano la scheda d’origine.", "An independent copy will be created: changes do not touch the original sheet.")}</p>`,
      );
    if (preview.path === "claim" && preview.sheetOwner !== ctx.role)
      lines.push(
        `<p>${ctx.t(`La scheda resta di ${ctx.esc(nameOf(ctx, preview.sheetOwner))}: tu ne ricevi il controllo in questa campagna.`, `The sheet stays with ${ctx.esc(nameOf(ctx, preview.sheetOwner))}: you receive control of it in this campaign.`)}</p>`,
      );
    if (preview.becomesShared)
      lines.push(
        `<p>${ctx.t("Ora la scheda è personale: entrando diventa consultabile dai membri della campagna.", "The sheet is personal now: joining makes it viewable by the campaign’s members.")}</p>`,
      );
    if (preview.alsoIn.length)
      lines.push(
        `<p>${ctx.t(`La stessa scheda resta anche in: ${ctx.esc(preview.alsoIn.map((id) => campaignName(ctx, id)).join(", "))}. Punti ferita, risorse e inventario sono gli stessi nelle due campagne.`, `The same sheet also stays in: ${ctx.esc(preview.alsoIn.map((id) => campaignName(ctx, id)).join(", "))}. Hit points, resources and inventory are the same in both campaigns.`)}</p>`,
      );
  }
  lines.push(requiredContentHTML(ctx, input, preview));
  lines.push(
    `<p class="muted">${ctx.t("Gli appunti «Solo io», le bozze e le registrazioni private restano solo tuoi.", "“Only me” notes, drafts and private records stay yours only.")}</p>`,
  );
  if (preview.approval)
    lines.push(
      `<p class="cm-note">${ctx.t("Il DM deve approvare l’ingresso: fino ad allora nulla cambia nella campagna. L’uso del link viene conteggiato ora.", "The DM must approve the join: until then nothing changes in the campaign. The link use is counted now.")}</p>`,
    );
  ctx.dialog(ctx.t("Prima di entrare", "Before joining"), lines.join(""), {
    submitLabel: preview.approval
      ? ctx.t("Invia richiesta", "Send request")
      : ctx.t("Entra nella campagna", "Join the campaign"),
    onSubmit() {
      const result = shared(
        ctx,
        preview.approval
          ? ctx.t(
              `Richiesta d’ingresso inviata · ${preview.campaignName}`,
              `Join request sent · ${preview.campaignName}`,
            )
          : ctx.t(
              `Ingresso nella campagna · ${preview.campaignName}`,
              `Joined campaign · ${preview.campaignName}`,
            ),
        (draft) => joinCampaign(draft, input, ctx.role, Date.now()),
      );
      ui.join = null;
      if (result.pending) {
        ctx.toast(
          ctx.t(
            "Richiesta inviata: il DM la vedrà tra le richieste.",
            "Request sent: the DM will see it among the requests.",
          ),
        );
        return;
      }
      ctx.toast(
        ctx.t(`Sei entrato in ${preview.campaignName}.`, `You joined ${preview.campaignName}.`),
      );
      ctx.navigate("campaigns", { id: result.campaignId, tab: "characters" });
    },
  });
  globalThis.document?.querySelectorAll?.("#dialog [data-cm-content-ask]").forEach((button) => {
    button.onclick = () =>
      perform(ctx, () =>
        handleAction(ctx, "content-ask", {
          id: button.dataset.id,
          code: button.dataset.code,
          content: button.dataset.content,
          revision: button.dataset.revision,
          actor: button.dataset.actor,
        }),
      );
  });
}
function confirmDialog(ctx, title, body, submitLabel, run) {
  ctx.dialog(title, body, { submitLabel, onSubmit: (data) => run(data) });
}
function launch(ctx, campaignId) {
  const name = campaignName(ctx, campaignId);
  const result = shared(
    ctx,
    ctx.t(`Campagna avviata · ${name}`, `Campaign launched · ${name}`),
    (draft) =>
      launchCampaign(draft, campaignId, ctx.role, Date.now(), { slices: scopedSliceSpecs(ctx) }),
    { newVisit: true, afterCommit: completeLaunch },
  );
  if (result?.switched) {
    ctx.registry?.emit?.(`${ID}:switched`, { from: result.from, to: result.to });
    ctx.toast(ctx.t(`${name} è ora la campagna in corso.`, `${name} is now the current campaign.`));
  }
  // The Table opens on the character this identity plays here (none for a DM or an
  // observer without one): never on a sheet of the campaign just left.
  const mine = playedBy(ctx.state, campaignId, ctx.role)[0];
  ctx.navigate("table", mine ? { id: mine } : {});
  focusTable();
}
// Keyboard focus follows the page change to the Table's main landmark (the skip-link
// target), not the document body. The shell renders a new hash on hashchange.
function focusTable() {
  const doc = globalThis.document;
  if (!doc?.querySelector) return;
  const focus = () => {
    if (doc.querySelector(".workspace.is-table"))
      doc.querySelector("#content")?.focus?.({ preventScroll: true });
  };
  if (doc.querySelector(".workspace.is-table")) focus();
  else globalThis.addEventListener?.("hashchange", focus, { once: true });
}
function enterTable(ctx, campaignId) {
  // The last access is recorded at most every ten minutes, so entering does not fill the
  // shared log with repeated lines.
  const last = metaOf(ctx.state, campaignId)?.lastAccess?.[ctx.role];
  if (last && Date.now() - Date.parse(last) < 10 * 60000) {
    ctx.navigate("table");
    return focusTable();
  }
  try {
    shared(
      ctx,
      ctx.t(
        `Accesso al Tavolo · ${campaignName(ctx, campaignId)}`,
        `Table access · ${campaignName(ctx, campaignId)}`,
      ),
      (draft) => touchAccess(draft, campaignId, ctx.role, Date.now()),
      { quiet: true },
    );
  } catch {
    // Offline: the last access is not recorded, the Table still opens.
  }
  ctx.navigate("table");
  focusTable();
}
// P10 CA-49 (Roll20 "Invite players", Owlbear "Share" in the header): one button in the
// campaign header, on Home and in the palette. The dialog shows the active link to copy and
// creates a new one (role, expiry, uses) in one step: a link in at most three interactions.
/** The header / Home button that opens the invite dialog (only for the DM and co-DMs). */
export function inviteButton(ctx, className = "button", binding = "campaign") {
  const id = ctx.state.campaign?.id;
  if (!id || !canManage(ctx.state, id, ctx.role)) return "";
  const attrs =
    binding === "cm" ? `data-cm="invite" data-id="${ctx.esc(id)}"` : "data-campaign-invite";
  return `<button type="button" class="${className}" ${attrs}>${ctx.icon("person")} ${ctx.t("Invita giocatori", "Invite players")}</button>`;
}
export function openInvite(ctx, campaignId = ctx.state.campaign?.id) {
  if (!campaignId || !canManage(ctx.state, campaignId, ctx.role)) {
    ctx.toast(
      ctx.t("Solo il DM o un co-DM invita giocatori.", "Only the DM or a co-DM invites players."),
      true,
    );
    return false;
  }
  const meta = metaOf(ctx.state, campaignId);
  if (meta.status !== "active") {
    ctx.toast(
      ctx.t(
        "La campagna non è attiva: ripristinala per invitare.",
        "The campaign is not active: restore it to invite.",
      ),
      true,
    );
    return false;
  }
  const now = Date.now();
  const owner = isOwner(ctx.state, campaignId, ctx.role);
  const active = meta.links
    .filter((link) => linkState(link, now) === "active" && link.role !== "co-dm")
    .at(-1);
  const option = (value, text, selected) =>
    `<option value="${value}" ${selected ? "selected" : ""}>${text}</option>`;
  const existing = active
    ? `<div class="cm-copy cm-invite-current"><p class="cm-member-meta">${ctx.t("Link attivo", "Active link")} · ${ctx.esc(linkRoleName(ctx, active.role))} · ${ctx.t("scade", "expires")} ${ctx.esc(active.expiresAt ? when(ctx, active.expiresAt) : ctx.t("mai", "never"))}</p><label><span class="cm-sr">${ctx.t("Link d’invito", "Invite link")}</span><input readonly value="${ctx.esc(inviteUrl(active.code))}" data-cm-url="${ctx.esc(active.code)}"></label><button type="button" class="button" data-cm-dialog-copy="${ctx.esc(active.code)}">${ctx.t("Copia", "Copy")}</button></div><p class="muted">${ctx.t("Oppure creane uno nuovo:", "Or create a new one:")}</p>`
    : "";
  ctx.dialog(
    ctx.t("Invita giocatori", "Invite players"),
    `${existing}<div class="form-grid cm-invite-form"><label class="field">${ctx.t("Ruolo", "Role")}<select name="role">${option("player", ctx.t("Giocatore", "Player"), true)}${option("observer", ctx.t("Osservatore", "Observer"))}${owner ? option("co-dm", ctx.t("Co-DM · un uso, 48 ore", "Co-DM · single use, 48 hours")) : ""}</select></label><label class="field">${ctx.t("Scadenza", "Expiry")}<select name="hours">${option(24, ctx.t("24 ore", "24 hours"))}${option(48, ctx.t("48 ore", "48 hours"))}${option(168, ctx.t("7 giorni", "7 days"), true)}${option(0, ctx.t("Nessuna", "Never"))}</select></label><label class="field">${ctx.t("Usi", "Uses")}<select name="uses">${option(1, "1")}${option(5, "5", true)}${option(10, "10")}${option(0, ctx.t("Illimitati", "Unlimited"))}</select></label></div><p class="muted">${ctx.t("Chi apre il link sceglie o crea il personaggio ed entra. Puoi revocarlo in Membri › Inviti.", "Whoever opens the link picks or creates a character and joins. You can revoke it in Members › Invitations.")}</p>`,
    {
      submitLabel: ctx.t("Crea link", "Create link"),
      onSubmit: (data) => {
        const link = shared(
          ctx,
          ctx.t(
            `Link d’invito creato · ${campaignName(ctx, campaignId)}`,
            `Invite link created · ${campaignName(ctx, campaignId)}`,
          ),
          (draft) =>
            createInviteLink(
              draft,
              campaignId,
              {
                role: data.get("role"),
                hours: Number(data.get("hours")),
                uses: Number(data.get("uses")),
              },
              ctx.role,
              Date.now(),
            ),
          { quiet: true },
        );
        showInviteLink(ctx, link);
      },
    },
  );
  bindDialogCopy(ctx);
  return true;
}
function showInviteLink(ctx, link) {
  ctx.dialog(
    ctx.t("Link d’invito pronto", "Invite link ready"),
    `<p>${ctx.t("Mandalo ai tuoi giocatori.", "Send it to your players.")} ${ctx.esc(linkRoleName(ctx, link.role))} · ${ctx.t("scade", "expires")} ${ctx.esc(link.expiresAt ? when(ctx, link.expiresAt) : ctx.t("mai", "never"))} · ${ctx.t("usi", "uses")} ${link.maxUses || "∞"}</p><div class="cm-copy"><label><span class="cm-sr">${ctx.t("Link d’invito", "Invite link")}</span><input readonly value="${ctx.esc(inviteUrl(link.code))}" data-cm-url="${ctx.esc(link.code)}" data-cm-ready-link></label><button type="button" class="button primary" data-cm-dialog-copy="${ctx.esc(link.code)}">${ctx.t("Copia link", "Copy link")}</button></div>`,
    { cancelLabel: ctx.t("Fatto", "Done") },
  );
  bindDialogCopy(ctx);
}
function bindDialogCopy(ctx) {
  globalThis.document
    ?.querySelectorAll?.("#dialog [data-cm-dialog-copy]")
    .forEach(
      (button) => (button.onclick = () => copyLink(ctx, button.dataset.cmDialogCopy, button)),
    );
}
function copyLink(ctx, code, control) {
  const url = inviteUrl(code);
  const input =
    control?.closest?.(".cm-copy")?.querySelector("input") ??
    globalThis.document?.querySelector?.(`#dialog [data-cm-url="${code}"]`);
  const manual = () => {
    input?.focus?.();
    input?.select?.();
    ctx.toast(
      ctx.t("Copia manuale: il link è selezionato.", "Copy manually: the link is selected."),
    );
  };
  const clipboard = globalThis.navigator?.clipboard;
  if (!clipboard?.writeText) return manual();
  clipboard
    .writeText(url)
    .then(
      () => ctx.toast(ctx.t("Link copiato negli appunti.", "Link copied to the clipboard.")),
      manual,
    );
}
export function handleAction(ctx, action, data = {}, control = null) {
  const who = ctx.role;
  const id = data.id;
  const label = (it, en) =>
    ctx.t(`${it} · ${campaignName(ctx, id)}`, `${en} · ${campaignName(ctx, id)}`);
  switch (action) {
    case "create":
      return openCreateDialog(ctx, { afterCreate: data.afterCreate ?? null });
    case "content-ask": {
      const target = coreCampaign(ctx.state, id)?.name ?? "";
      const done = perform(ctx, () =>
        shared(
          ctx,
          label("Contenuto chiesto al DM", "Content asked of the DM"),
          (draft) =>
            askForContent(
              draft,
              id,
              {
                code: data.code,
                contentId: data.content,
                revisionId: data.revision,
                actorId: data.actor || null,
              },
              who,
              Date.now(),
            ),
          { quiet: true },
        ),
      );
      if (done) {
        ctx.toast(
          ctx.t(
            `Richiesta inviata al DM di ${target}: la vede tra inviti e richieste.`,
            `Request sent to the DM of ${target}: they see it among invitations and requests.`,
          ),
        );
        // The open join preview shows the row as asked.
        const button = globalThis.document?.querySelector?.(
          `#dialog [data-cm-content-ask="${data.content}@${data.revision}"]`,
        );
        if (button) {
          button.disabled = true;
          button.textContent = ctx.t("Chiesto al DM", "Asked the DM");
        }
      }
      return done;
    }
    case "content-enable":
      return shared(
        ctx,
        label("Contenuto abilitato nella campagna", "Content enabled in the campaign"),
        (draft) => enableAskedContent(draft, id, data.ask, who, Date.now()),
      );
    case "open-library":
      return ctx.navigate("library", { tab: "available" });
    case "paste-link":
      return openPasteDialog(ctx);
    case "status":
      ui.status = data.status;
      ui.tag = "";
      return ctx.render();
    case "tag":
      ui.tag = ui.tag === data.tag ? "" : data.tag;
      return ctx.render();
    case "details":
      return ctx.navigate("campaigns", data.tab ? { id, tab: data.tab } : { id });
    case "back":
      return ctx.navigate("campaigns");
    case "tab":
      return data.mode === "section"
        ? ctx.navigate("campaign", { tab: ID, id: data.tab })
        : ctx.navigate("campaigns", { id, tab: data.tab });
    case "launch":
      return launch(ctx, id);
    case "enter-table":
      return enterTable(ctx, id);
    case "open-hub":
      return ctx.navigate("campaign");
    case "copy":
      return copyLink(ctx, data.code, control);
    case "revoke-link":
      return shared(ctx, label("Link d’invito revocato", "Invite link revoked"), (draft) =>
        revokeInviteLink(draft, id, data.link, who, Date.now()),
      );
    case "approve":
      return shared(
        ctx,
        label("Richiesta d’ingresso approvata", "Join request approved"),
        (draft) => decideRequest(draft, id, data.request, { approve: true }, who, Date.now()),
      );
    case "deny":
      return confirmDialog(
        ctx,
        ctx.t("Rifiuta la richiesta", "Decline the request"),
        `<label class="field">${ctx.t("Messaggio per chi ha chiesto (facoltativo)", "Message for the requester (optional)")}<textarea name="message" maxlength="300"></textarea></label>`,
        ctx.t("Rifiuta", "Decline"),
        (form) =>
          shared(ctx, label("Richiesta d’ingresso rifiutata", "Join request declined"), (draft) =>
            decideRequest(
              draft,
              id,
              data.request,
              { approve: false, message: form.get("message") },
              who,
              Date.now(),
            ),
          ),
      );
    case "withdraw":
      return shared(ctx, label("Richiesta ritirata", "Request withdrawn"), (draft) =>
        withdrawRequest(draft, id, data.request, who, Date.now()),
      );
    case "cancel-invite":
      return shared(ctx, label("Invito annullato", "Invitation cancelled"), (draft) =>
        cancelDirectInvite(draft, id, data.invite, who, Date.now()),
      );
    case "decline-invite":
      return shared(ctx, label("Invito rifiutato", "Invitation declined"), (draft) =>
        declineDirectInvite(draft, id, data.invite, who, Date.now()),
      );
    case "accept-invite":
    case "continue-join":
      ui.join = null;
      return ctx.navigate("campaigns", { tab: "join", id: data.code });
    case "role": {
      const target = data.target;
      const title =
        data.role === "co-dm"
          ? ctx.t(
              `Promuovi ${nameOf(ctx, target)} a co-DM`,
              `Promote ${nameOf(ctx, target)} to co-DM`,
            )
          : ctx.t(`Nuovo ruolo per ${nameOf(ctx, target)}`, `New role for ${nameOf(ctx, target)}`);
      const body =
        data.role === "co-dm"
          ? powersHTML(ctx)
          : `<p>${ctx.t(`${ctx.esc(nameOf(ctx, target))} diventerà ${ctx.esc(roleName(ctx, data.role).toLowerCase())}.`, `${ctx.esc(nameOf(ctx, target))} will become ${ctx.esc(roleName(ctx, data.role).toLowerCase())}.`)}</p>${data.role === "observer" ? `<p>${ctx.t("I suoi personaggi diventano non assegnati: potrà reclamarli tornando giocatore.", "Their characters become unassigned: they can claim them again as a player.")}</p>` : ""}`;
      return confirmDialog(ctx, title, body, ctx.t("Conferma ruolo", "Confirm role"), () =>
        shared(ctx, label("Ruolo cambiato", "Role changed"), (draft) =>
          setMemberRole(draft, id, target, data.role, who, Date.now()),
        ),
      );
    }
    case "remove": {
      const target = data.target;
      return confirmDialog(
        ctx,
        ctx.t(`Espelli ${nameOf(ctx, target)}`, `Remove ${nameOf(ctx, target)}`),
        `<p>${ctx.t("Perderà l’accesso alla campagna. I link giocatore e osservatore attivi verranno sostituiti: i vecchi smetteranno di funzionare. I suoi personaggi diventano non assegnati, restano nella campagna e si possono riassegnare o reclamare; la scheda resta sua.", "They lose access to the campaign. Active player and observer links will be replaced: the old ones stop working. Their characters become unassigned, stay in the campaign and can be reassigned or claimed; the sheet stays theirs.")}</p><label class="field">${ctx.t("Motivo, visibile a chi viene espulso (facoltativo)", "Reason, shown to the removed person (optional)")}<textarea name="reason" maxlength="300"></textarea></label>`,
        ctx.t("Espelli", "Remove"),
        (form) => {
          const result = shared(ctx, label("Membro espulso", "Member removed"), (draft) =>
            removeMember(draft, id, target, { reason: form.get("reason") }, who, Date.now()),
          );
          ctx.toast(
            ctx.t(
              `${nameOf(ctx, target)} espulso. Link sostituiti: ${result.rotated}.`,
              `${nameOf(ctx, target)} removed. Links replaced: ${result.rotated}.`,
            ),
          );
        },
      );
    }
    case "leave":
      return confirmDialog(
        ctx,
        ctx.t("Esci dalla campagna", "Leave the campaign"),
        `<p>${ctx.t("La campagna sparirà dal tuo elenco. Per rientrare servirà un nuovo invito.", "The campaign disappears from your list. You will need a new invitation to rejoin.")}</p><label class="check-field"><input type="checkbox" name="takeCharacters"> ${ctx.t("Porta via le mie schede (altrimenti restano al gruppo come non assegnate)", "Take my sheets with me (otherwise they stay with the group, unassigned)")}</label>`,
        ctx.t("Esci", "Leave"),
        (form) => {
          shared(ctx, label("Uscita dalla campagna", "Left the campaign"), (draft) =>
            leaveCampaign(
              draft,
              id,
              { takeCharacters: form.has("takeCharacters") },
              who,
              Date.now(),
            ),
          );
          ctx.navigate("campaigns");
        },
      );
    case "claim":
      return shared(ctx, label("Personaggio reclamato", "Character claimed"), (draft) =>
        claimSeat(draft, id, data.actor, who, Date.now()),
      );
    case "unassign":
      return shared(ctx, label("Personaggio non assegnato", "Character unassigned"), (draft) =>
        unassignSeat(draft, id, data.actor, who, Date.now()),
      );
    case "deactivate":
    case "reactivate":
      return shared(
        ctx,
        action === "deactivate"
          ? label("Personaggio disattivato", "Character deactivated")
          : label("Personaggio riattivato", "Character reactivated"),
        (draft) => setSeatActive(draft, id, data.actor, action === "reactivate", who, Date.now()),
      );
    case "transfer":
    case "handover": {
      const candidates = membersOf(ctx.state, id).filter((m) =>
        ["co-dm", "player"].includes(roleOf(ctx.state, id, m.id)),
      );
      // Residual (re-audit 3, CA-57): a member reads as the party list names them — by
      // their characters (Owlbear's one name per player) — with the role only when it
      // adds something («Giocatore · Giocatore» said the account name and the role twice).
      const memberText = (m) => {
        const who =
          playedBy(ctx.state, id, m.id)
            .map((actorId) => ctx.state.actors?.[actorId]?.name)
            .filter(Boolean)
            .join(", ") || nameOf(ctx, m.id);
        const role = roleName(ctx, roleOf(ctx.state, id, m.id));
        return who === role ? who : `${who} · ${role}`;
      };
      const select = `<label class="field">${ctx.t("Membro", "Member")}<select name="to">${candidates.map((m) => `<option value="${ctx.esc(m.id)}" ${m.id === data.target ? "selected" : ""}>${ctx.esc(memberText(m))}</option>`).join("")}</select></label>`;
      return action === "transfer"
        ? confirmDialog(
            ctx,
            ctx.t("Trasferisci la proprietà", "Transfer ownership"),
            `${select}<p>${ctx.t("Il trasferimento resta in attesa finché la persona non accetta; puoi revocarlo prima. Dopo l’accettazione diventi co-DM e potrai uscire. Gli appunti «Solo io» restano dei loro autori.", "The transfer stays pending until the person accepts; you can revoke it before. After acceptance you become co-DM and can leave. “Only me” notes stay with their authors.")}</p>`,
            ctx.t("Proponi trasferimento", "Propose transfer"),
            (form) =>
              shared(ctx, label("Trasferimento proposto", "Transfer proposed"), (draft) =>
                proposeTransfer(draft, id, form.get("to"), who, Date.now()),
              ),
          )
        : confirmDialog(
            ctx,
            ctx.t("Cedi il ruolo di DM per la sessione", "Hand over the DM role for the session"),
            `${select}<p>${ctx.t("Chi lo riceve guida tutta la sessione come DM: avvia e conclude il combattimento, fa avanzare i turni, attiva le scene, modifica la Preparazione, muove e fa agire le creature della campagna, chiede i tiri, mette in pausa, usa conto alla rovescia e orologi e organizza le sessioni.", "The recipient runs the whole session as DM: starts and ends combat, advances turns, activates scenes, edits Preparation, moves and acts with the campaign’s creatures, asks for rolls, pauses, uses the countdown and clocks and organizes sessions.")}</p><p>${ctx.t("Vede ciò che il tuo Tavolo mostra per la sessione (pedine nascoste, nebbia, tiri e turni solo DM), mai i tuoi appunti privati, i piani personali, le schede personali o le bozze non salvate.", "They see what your Table shows for the session (hidden tokens, fog, DM-only rolls and turns), never your private notes, personal plans, personal sheets or unsaved drafts.")}</p><p class="muted">${ctx.t("«Riprendi il ruolo di DM» ti restituisce tutto in un colpo.", "“Take the DM role back” returns everything to you at once.")}</p>`,
            ctx.t("Cedi il ruolo", "Hand over"),
            (form) =>
              shared(
                ctx,
                label("Ruolo di DM ceduto per la sessione", "DM role handed over for the session"),
                (draft) => startHandover(draft, id, form.get("to"), who, Date.now()),
              ),
          );
    }
    case "handover-end":
      return shared(ctx, label("Ruolo di DM ripreso", "DM role taken back"), (draft) =>
        endHandover(draft, id, who, Date.now()),
      );
    case "data-section":
      return ctx.navigate("campaign", { tab: "campaign-data" });
    case "view-as":
      // Kanka "View as": the member's own pages, read only (campaign-settings.mjs route).
      return ctx.navigate("campaign", { tab: "campaign-settings-view", id: data.target });
    case "invite":
      return openInvite(ctx, id);
    case "transfer-revoke":
      return shared(ctx, label("Trasferimento revocato", "Transfer revoked"), (draft) =>
        revokeTransfer(draft, id, who, Date.now()),
      );
    case "transfer-accept":
    case "transfer-decline":
      return shared(
        ctx,
        action === "transfer-accept"
          ? label("Proprietà accettata", "Ownership accepted")
          : label("Proprietà rifiutata", "Ownership declined"),
        (draft) => answerTransfer(draft, id, action === "transfer-accept", who, Date.now()),
      );
    case "profile":
      return openProfileDialog(ctx, id);
    case "archive":
      return shared(ctx, label("Campagna archiviata", "Campaign archived"), (draft) =>
        setCampaignStatus(draft, id, "archived", who, Date.now()),
      );
    case "restore":
      return shared(ctx, label("Campagna ripristinata", "Campaign restored"), (draft) =>
        setCampaignStatus(draft, id, "active", who, Date.now()),
      );
    case "delete":
      return confirmDialog(
        ctx,
        ctx.t("Elimina la campagna", "Delete the campaign"),
        `<p>${ctx.t("Sparisce dall’elenco di tutti i membri; resta recuperabile dal filtro «Eliminate» solo per te. Per confermare scrivi il nome della campagna.", "It disappears from every member’s list; it stays recoverable from the “Deleted” filter for you only. To confirm, type the campaign name.")}</p><p><strong>${ctx.esc(campaignName(ctx, id))}</strong></p><label class="field">${ctx.t("Nome della campagna", "Campaign name")}<input name="confirmName" required autocomplete="off"></label>`,
        ctx.t("Elimina", "Delete"),
        (form) =>
          shared(ctx, label("Campagna eliminata", "Campaign deleted"), (draft) =>
            setCampaignStatus(draft, id, "deleted", who, Date.now(), {
              confirmName: form.get("confirmName"),
            }),
          ),
      );
    case "join-path":
      ui.join = { code: data.code, path: data.path };
      ctx.render();
      // The page is rebuilt: keyboard focus stays on the chosen path, whose panel follows.
      globalThis.document
        ?.querySelector?.(
          `#content .cm-path[data-path="${String(data.path).replace(/[^a-z]/g, "")}"]`,
        )
        ?.focus?.();
      return undefined;
    case "join-builder":
      personal(
        ctx,
        ctx.t("Ingresso da completare dopo la creazione", "Join to complete after creation"),
        (draft) => rememberJoinReturn(draft, data.code, who, Date.now()),
      );
      return startCharacterBuilder(ctx, { kind: "create" });
    case "join-none":
      return openJoinPreview(ctx, { code: data.code, path: "none" });
    case "dismiss":
      return personal(ctx, ctx.t("Notifica letta", "Notice read"), (draft) =>
        dismissNotice(draft, data.key, who),
      );
    default:
      return undefined;
  }
}
export function handleForm(ctx, form, data, element = null) {
  const who = ctx.role;
  const id = element?.dataset?.id;
  const label = (it, en) =>
    ctx.t(`${it} · ${campaignName(ctx, id)}`, `${en} · ${campaignName(ctx, id)}`);
  if (form === "link") {
    const link = shared(ctx, label("Link d’invito creato", "Invite link created"), (draft) =>
      createInviteLink(
        draft,
        id,
        {
          role: data.get("role"),
          hours: Number(data.get("hours")),
          uses: Number(data.get("uses")),
        },
        who,
        Date.now(),
      ),
    );
    ctx.toast(ctx.t(`Link creato: ${link.code}`, `Link created: ${link.code}`));
    return link;
  }
  if (form === "direct")
    return shared(ctx, label("Invito inviato", "Invitation sent"), (draft) =>
      inviteIdentity(draft, id, { to: data.get("to"), role: data.get("role") }, who, Date.now()),
    );
  if (form === "assign")
    return shared(ctx, label("Personaggio riassegnato", "Character reassigned"), (draft) =>
      assignSeat(draft, id, element.dataset.actor, data.get("member"), who, Date.now()),
    );
  if (form === "join")
    return openJoinPreview(ctx, {
      code: element.dataset.code,
      path: element.dataset.path,
      actorId: data.get("actorId") ?? undefined,
      premadeId: data.get("premadeId") ?? undefined,
      name: data.get("name") ?? undefined,
    });
  return undefined;
}
function filterCards(root, value) {
  const query = String(value ?? "")
    .trim()
    .toLocaleLowerCase();
  let shown = 0;
  for (const card of root.querySelectorAll("[data-cm-card]")) {
    const hit = !query || card.dataset.search.includes(query);
    card.hidden = !hit;
    if (hit) shown++;
  }
  const none = root.querySelector("[data-cm-no-results]");
  if (none) none.hidden = shown > 0 || !root.querySelector("[data-cm-card]");
}
export function bindArea(el, ctx) {
  el.addEventListener("click", (event) => {
    const control = event.target.closest?.("[data-cm]");
    if (!control || !el.contains(control) || control.disabled) return;
    event.preventDefault();
    perform(ctx, () => handleAction(ctx, control.dataset.cm, { ...control.dataset }, control));
  });
  el.addEventListener("change", (event) => {
    const target = event.target;
    if (target.matches?.("[data-cm-sort]")) {
      ui.sort = target.value;
      ctx.render();
    }
    if (target.matches?.("[data-cm-approval]")) {
      const applied = perform(ctx, () => {
        shared(
          ctx,
          ctx.t(
            target.checked
              ? "Approvazione degli ingressi attivata"
              : "Approvazione degli ingressi disattivata",
            target.checked ? "Join approval turned on" : "Join approval turned off",
          ),
          (draft) =>
            setApproval(draft, target.dataset.cmApproval, target.checked, ctx.role, Date.now()),
        );
        return true;
      });
      // A refused change (offline, no longer a manager) leaves the box as the setting is.
      if (!applied) target.checked = !target.checked;
    }
  });
  el.addEventListener("input", (event) => {
    if (!event.target.matches?.("[data-cm-search]")) return;
    ui.query = event.target.value;
    filterCards(el, ui.query);
  });
  el.addEventListener("submit", (event) => {
    const form = event.target.closest?.("form[data-cm-form]");
    if (!form) return;
    event.preventDefault();
    perform(ctx, () => handleForm(ctx, form.dataset.cmForm, new FormData(form), form));
  });
  if (ui.query) filterCards(el, ui.query);
}

// ---------------------------------------------------------------- registration

export function register(registry) {
  registry.registerStateSlice(ID, {
    version: VERSION,
    // Membership, links and requests are campaign administration: gameplay Undo keeps
    // them, like the core keeps campaign members; corrections are explicit commands.
    undo: "preserve",
    seed: seedSlice,
    normalize: normalizeSlice,
    afterUndo: reconcileAfterUndo,
  });
  registry.registerStyles(new URL("./campaign-members.css", import.meta.url));
  registry.add("route", {
    id: "campaigns",
    replaces: true,
    label: { it: "Campagne", en: "Campaigns" },
    icon: "campaign",
    render: renderCampaignsPage,
    bind: bindArea,
  });
  registry.add("campaign-section", {
    id: ID,
    group: "manage",
    label: { it: "Membri", en: "Members" },
    order: 22,
    render: renderMembersSection,
    bind: bindArea,
  });
  registry.add("table-panel", {
    id: `${ID}-closed`,
    label: { it: "Campagna chiusa", en: "Campaign closed" },
    placement: "cover",
    order: 1,
    when: (ctx) => Boolean(closedStatus(ctx)),
    render: renderClosedCover,
    bind: bindArea,
  });
  registry.add("home-widget", {
    id: `${ID}-home`,
    label: { it: "Le tue campagne", en: "Your campaigns" },
    order: 35,
    render: renderHomeWidget,
    bind: bindArea,
  });
  // The core "Your character" block shows the sample Livia; in a campaign she is not in,
  // this one shows the characters the viewer plays there.
  registry.add("home-widget", {
    id: "summary",
    replaces: true,
    label: { it: "Il tuo personaggio", en: "Your character" },
    when: showsHomeSummary,
    render: renderHomeSummary,
    bind: bindArea,
  });
  registry.add("sheet-section", {
    id: `${ID}-deactivated`,
    tab: "actions",
    label: { it: "Disattivato in questa campagna", en: "Deactivated in this campaign" },
    order: 5,
    when: (ctx, actor) => isDeactivated(ctx.state, ctx.state.campaign?.id, actor?.id),
    render: renderDeactivatedNotice,
    bind: bindArea,
  });
  // Your own sheet is view-only where its seat is not yours (observer, unassigned,
  // removed, reassigned): the sheet says why and offers Claim when it applies.
  registry.add("sheet-section", {
    id: `${ID}-seat`,
    tab: "actions",
    label: { it: "Sola consultazione in questa campagna", en: "View-only in this campaign" },
    order: 6,
    when: (ctx, actor) => Boolean(seatBlock(ctx.state, actor, ctx.role)),
    render: renderSeatNotice,
    bind: bindArea,
  });
  registry.add("notifications", {
    id: `${ID}-inbox`,
    label: { it: "Campagne", en: "Campaigns" },
    collect(ctx) {
      const incoming = incomingFor(ctx.state, ctx.role).map((item) => {
        const who = personName(ctx.state, item.from, "it");
        const whoEn = personName(ctx.state, item.from, "en");
        const titles = {
          transfer: [`Proprietà proposta · ${item.name}`, `Ownership offered · ${item.name}`],
          invite: [`Invito · ${item.name}`, `Invitation · ${item.name}`],
          denied: [`Richiesta rifiutata · ${item.name}`, `Request declined · ${item.name}`],
          approved: [`Richiesta approvata · ${item.name}`, `Request approved · ${item.name}`],
          removed: [`Rimosso da ${item.name}`, `Removed from ${item.name}`],
          "content-ask": [
            `Contenuto da abilitare · ${item.name}`,
            `Content to enable · ${item.name}`,
          ],
        }[item.kind];
        const content = item.contentName ?? { it: "un contenuto homebrew", en: "a homebrew item" };
        return {
          id: item.key,
          title: { it: titles[0], en: titles[1] },
          body:
            item.kind === "content-ask"
              ? {
                  it: `${who} chiede di abilitare «${content.it}»`,
                  en: `${whoEn} asks you to enable “${content.en}”`,
                }
              : item.message
                ? { it: `${who}: ${item.message}`, en: `${whoEn}: ${item.message}` }
                : item.kind === "invite"
                  ? {
                      it: `Da ${who} · apri per accettare o rifiutare`,
                      en: `From ${whoEn} · open to accept or decline`,
                    }
                  : { it: `Da ${who}`, en: `From ${whoEn}` },
          time: item.at,
          // B24 files these under Invitations and hides a notice from its own originator.
          category: "invites",
          by: item.from ?? null,
          target:
            item.kind === "invite"
              ? { page: "campaigns", params: { tab: "join", id: item.code } }
              : item.kind === "approved"
                ? { page: "campaigns", params: { id: item.campaignId } }
                : { page: "campaigns" },
        };
      });
      const queue = managerQueue(ctx.state, ctx.role).map(({ campaignId, name, request }) => ({
        id: `request:${request.id}`,
        title: { it: `Richiesta d’ingresso · ${name}`, en: `Join request · ${name}` },
        body: {
          it: `${personName(ctx.state, request.who, "it")} chiede di entrare`,
          en: `${personName(ctx.state, request.who, "en")} asks to join`,
        },
        time: request.createdAt,
        category: "invites",
        by: request.who,
        target: { page: "campaigns", params: { id: campaignId, tab: "invites" } },
      }));
      return [...incoming, ...queue];
    },
  });
  registry.add("search", {
    id: `${ID}-search`,
    label: { it: "Campagne", en: "Campaigns" },
    search(ctx, query) {
      const text = String(query ?? "")
        .trim()
        .toLocaleLowerCase();
      if (!text) return [];
      return listCampaigns(ctx.state, ctx.role)
        .filter((row) => [row.name, ...row.tags].join(" ").toLocaleLowerCase().includes(text))
        .map((row) => ({
          title: row.name,
          excerpt: { it: "Campagna", en: "Campaign" },
          page: "campaigns",
          params: { id: row.id },
        }));
    },
  });
  registry.add("command", {
    id: `${ID}.invite`,
    label: { it: "Invita giocatori", en: "Invite players" },
    description: {
      it: "Link d’invito con ruolo, scadenza e numero d’usi",
      en: "Invite link with role, expiry and number of uses",
    },
    group: "campaign",
    keywords: [
      { it: "invito", en: "invitation" },
      { it: "link d’invito", en: "invite link" },
      { it: "condividi", en: "share" },
      { it: "aggiungi giocatori", en: "add players" },
    ],
    when: (ctx) => canManage(ctx.state, ctx.state.campaign?.id, ctx.role),
    run: (ctx) => openInvite(ctx),
  });
  registry.add("command", {
    id: `${ID}.handover`,
    label: {
      it: "Cedi il ruolo di DM per la sessione",
      en: "Hand over the DM role for the session",
    },
    description: {
      it: "Un altro membro guida la sessione da DM: combattimento, scene, Preparazione, creature, tiri",
      en: "Another member runs the session as DM: combat, scenes, Preparation, creatures, rolls",
    },
    group: "campaign",
    keywords: [
      { it: "co-dm", en: "co-DM" },
      { it: "cedi il ruolo", en: "hand over" },
      { it: "passa il ruolo di master", en: "pass the GM role" },
      { it: "affida le creature", en: "entrust the creatures" },
    ],
    when: (ctx) => roleOf(ctx.state, ctx.state.campaign?.id, ctx.role) === "owner",
    run(ctx) {
      const id = ctx.state.campaign.id;
      if (metaOf(ctx.state, id).handover)
        return ctx.navigate("campaign", { tab: ID, id: "manage" });
      return handleAction(ctx, "handover", { id });
    },
  });
  registry.add("command", {
    id: `${ID}.create`,
    label: { it: "Crea campagna", en: "Create campaign" },
    group: "campaign",
    run(ctx) {
      ctx.navigate("campaigns");
      openCreateDialog(ctx);
    },
  });
  // The previous identity's join choice and filters never carry over.
  registry.on("role-changed", () => {
    ui.join = null;
  });
  registry.on("reset", () => resetCampaignMembersView());
}
