import { isCampaignMember } from "./campaign-content.mjs";
const assignedController = (actor, role) =>
  actor.owner === role || (Array.isArray(actor.controllers) && actor.controllers.includes(role));

export function canViewActor(actor, role, state) {
  if (!actor) return false;
  if (actor.visibility === "private") return actor.owner === role;
  if (
    state &&
    actor.companion &&
    (!isCampaignActor(actor, state.campaign?.id) ||
      !isCampaignMember(state, state.campaign?.id, role))
  )
    return false;
  if (actor.kind !== "npc")
    return assignedController(actor, role) || memberOfActorCampaign(actor, role, state);
  return (
    role === "dm" || assignedController(actor, role) || runsCampaignCreature(actor, role, state)
  );
}

// Final review privacy P1 (Roll20 SVC-031, CA-54): a shared sheet is read by its owner or
// controller and by the members of one of its campaigns (none recorded: the campaign in
// play). A removed or departed member keeps only their own sheet, read-only.
function memberOfActorCampaign(actor, role, state) {
  if (!state?.campaign) return true;
  const ids = actor.campaignIds ?? [state.campaign.id];
  return ids.some((id) => campaignMembersOf(state, id)?.some((member) => member.id === role));
}

export function canControlActor(actor, role, state) {
  return (
    canViewActor(actor, role, state) &&
    (role === "dm" ||
      (assignedController(actor, role) && playsFromSeat(actor, role, state)) ||
      runsCampaignCreature(actor, role, state))
  );
}

// B13 (campaign-members) seats and roles, read from its state slice when present.
// A campaign's member record: the one in play, or a parked campaign's.
const DEFAULT_MEMBERS = [
  { id: "player", role: "player" },
  { id: "dm", role: "dm" },
];
function campaignMembersOf(state, campaignId) {
  const record =
    state.campaign?.id === campaignId
      ? state.campaign
      : state.ext?.["campaign-members"]?.parked?.[campaignId]?.campaign;
  return record ? (record.members ?? DEFAULT_MEMBERS).filter((m) => m.active !== false) : null;
}
// A co-DM (Roll20 SVC-030, Foundry Assistant GM SVC-044) controls the creatures of the
// campaign in play, like its owner; DM-private creatures stay private (checked above).
function runsCampaignCreature(actor, role, state) {
  if (!state?.campaign || actor.kind !== "npc" || !isCampaignActor(actor, state.campaign.id))
    return false;
  const member = campaignMembersOf(state, state.campaign.id)?.find((m) => m.id === role);
  return member?.role === "dm" || member?.role === "co-dm";
}
// In a campaign a playable character is played from its seat: an observer plays none
// (I-135), an unassigned sheet waits for a Claim (DDB-074) and a member who was removed
// or left no longer plays it (Roll20 SVC-031). The campaign in play decides; a sheet
// outside it needs a seat in one of its campaigns. Without a seat record the owner (or a
// controller) plays it while a member. The "dm" identity keeps the core's authority.
function seatedIn(actor, role, state, campaignId) {
  const members = campaignMembersOf(state, campaignId);
  if (!members) return true;
  const member = members.find((m) => m.id === role);
  if (!member || member.role === "observer") return false;
  const seat = state.ext?.["campaign-members"]?.campaigns?.[campaignId]?.seats?.[actor.id];
  return seat ? seat.status !== "inactive" && seat.memberId === role : true;
}
function playsFromSeat(actor, role, state) {
  if (
    !state?.campaign ||
    actor.kind !== "character" ||
    actor.companion ||
    actor.visibility === "private"
  )
    return true;
  const ids = actor.campaignIds ?? [state.campaign.id];
  if (!ids.length) return true;
  if (ids.includes(state.campaign.id)) return seatedIn(actor, role, state, state.campaign.id);
  return ids.some((id) => seatedIn(actor, role, state, id));
}

export function isCampaignActor(actor, campaignId) {
  return actor && (actor.campaignIds === undefined || actor.campaignIds.includes(campaignId));
}

export function connectCharacterToCampaign(state, actorId, role) {
  const actor = state.actors[actorId];
  if (
    !canControlActor(actor, role, state) ||
    (actor.kind !== "character" && !actor.companion) ||
    !isCampaignMember(state, state.campaign?.id, role)
  )
    throw new Error("Character unavailable");
  // B13 Deactivate (DDB-075): a sheet the DM deactivated in this campaign comes back only
  // when the DM reactivates it (campaign-members seat record).
  if (
    state.ext?.["campaign-members"]?.campaigns?.[state.campaign.id]?.seats?.[actorId]?.status ===
    "inactive"
  )
    throw Object.assign(new Error("The DM deactivated this character in this campaign"), {
      it: "Il DM ha disattivato questo personaggio in questa campagna: può riattivarlo solo il DM, da Campagne › Personaggi.",
      en: "The DM deactivated this character in this campaign: only the DM can reactivate it, from Campaigns › Characters.",
    });
  actor.campaignIds = [...new Set([...(actor.campaignIds || []), state.campaign.id])];
  actor.visibility = "shared";
}

export function isActorAvailable(actor) {
  return !!actor && (!actor.companion || actor.companion.lifecycle === "available");
}

// PG-94 (World Anvil «Edit Sheet» permission, Demiplane visible change author): whose sheet
// this is and whether this viewer may change it from the sheet page. The owner's switch
// «Il DM può modificare questa scheda» lives in each campaign's settings (dmSheetEdit,
// default allowed); a sheet the owner reserved stays read-only for the DM in every one of
// its campaigns, and the DM asks instead of writing.
export function dmMayEditSheet(state, actor) {
  const campaigns = state?.ext?.["campaign-settings"]?.campaigns ?? {};
  const ids = actor?.campaignIds ?? (state?.campaign?.id ? [state.campaign.id] : []);
  return !ids.some((id) => campaigns[id]?.policy?.dmSheetEdit?.[actor.id] === false);
}
export function sheetEditStatus(state, actor, viewer) {
  if (!actor) return null;
  const player = actor.kind === "character" && actor.owner && actor.owner !== "dm";
  const own = actor.owner === viewer;
  const dmAllowed = dmMayEditSheet(state, actor);
  const canEdit =
    canControlActor(actor, viewer, state) && !(viewer === "dm" && player && !own && !dmAllowed);
  return { owner: actor.owner ?? null, own, player, dmAllowed, canEdit };
}

/**
 * Close review 01/10 (privacy P1-3): a creature hidden from the players, by its own flag or by
 * its token on the active scene (the token menu's «Nascondi», B12). What the DM does on it
 * stays out of shared lines (Fantasy Grounds hides GM rolls; Roll20 whispers NPC rolls).
 */
export function hiddenFromPlayers(state, actorId) {
  const actor = state?.actors?.[actorId];
  if (!actor) return false;
  const scene = state.scenes?.find((entry) => entry.id === state.activeSceneId);
  const token = scene?.tokens?.find((entry) => entry.actorId === actorId);
  return Boolean(actor.hidden || token?.hidden || token?.visible === false);
}
