# Increment 7 — campaign content and real sessions domain

Author: `review_journey`, inherited model/effort, 23/09/2026. Worktree
`~/Workspace/Codex/d20-studio-interview-01`. Reserved files: new
`campaign-content.mjs`, `campaign-sessions.mjs`, their tests and this evidence.
Other authors own existing modules, UI, browser and independent review.

Status: implemented domain snapshot handed to a distinct reviewer; browser and
final integration checks remain with root.
This is an authorized local blueprint increment, not production, full campaign
administration or approval of the whole application.

## Plan and authority

Follow [build plan](blueprint-build-plan.md),
[primary research R191](blueprint-campaign-research.md), I-044–051/094/099/100/117
and the campaign page. Root accepted the schema before consumers were written.
Reuse the central store, no new database, dependency, authentication or service.
Superpowers/TDD is applied within the existing owner authorization.

1. Tests first for private drafts, distinct reader/editor/invite permissions,
   current and historical projection, secret sections/links, conflict recovery,
   append-only restore and idempotence. Implement content domain and migration.
2. Tests first for timezone gaps/folds, direct appointments and optional polls,
   own responses, explicit organizer confirmation/change/cancel and retries.
3. Run focused and complete blueprint tests, hand off actual hashes for a
   distinct reviewer. Root alone runs shared-browser journeys.

## Content API and state

`state.campaignContent = {version:1, entries:[], drafts:[]}` is the sole
narrative store. `state.campaign.members` contains `{id,name,role,canOrganize}`;
the migration provides the existing player/DM demo when absent. Domain tests
use independent owner, reader, editor and DM identities. A DM role never opens
another person's private note. Membership and role are resolved from state,
not accepted from a form's claimed identity.

Entry: `{id,kind,campaignId,ownerId,currentRevisionId,revisions,access,
accessRevision,historyAccess}`. Kinds remain `note/world/quest/recap`.
Revision: `{id,parentRevisionId,authorId,createdAt,data,audience}`. Access is
outside revision data; restore appends text without restoring ACL or gameplay.
Audience expansion grants the explicitly selected current version, not the
entire earlier history. History requires both a current read permission and
permission to that version. Section audiences are projected independently.

Data: `{title,body,worldType,questStatus,sessionId,narratorActorId,links,sections}`.
User text is not automatically translated. Title is optional; body or title
must identify a usable saved entry. `worldType` is `person/place/faction/other`;
quest state is descriptive `open/completed/failed/abandoned`, with no rewards.
Section: `{id,title,body,access}`. Only the entry owner adds/removes sections or
changes their audience; editors can edit sections they can read. Invisible
sections are retained from current state, not included in an editor projection.

Access: `{mode:'private'|'dms'|'selected'|'campaign',
grants:[{id,read,edit,invite}]}`. `invite` requires `edit`. Delegated invitation
only adds current campaign members as readers; no privilege escalation or
onward invitation. Revocation leaves saved contributions intact.

```js
getCampaignMembers(state, campaignId, viewer);
getCampaignHub(state, campaignId, viewer);
listCampaignEntries(state, { campaignId, kind, worldType, query }, viewer);
getCampaignEntry(state, id, viewer, { revisionId });
previewCampaignAudience(state, draftId, recipientId, viewer);
resolveCampaignLinks(state, refs, viewer);
createCampaignDraft(
  state,
  { id, kind, entryId, campaignId, sessionId, restoreRevisionId, returnTo },
  viewer,
);
getCampaignDraft(state, id, viewer);
listCampaignDrafts(state, viewer);
saveCampaignDraft(state, id, { data, access, expectedDraftRevision, baseRevisionId }, viewer);
discardCampaignDraft(state, id, viewer);
previewCampaignDraft(state, id, viewer);
applyCampaignDraft(state, id, { reviewKey }, viewer, { online });
setCampaignEntryAccess(state, id, { access, expectedAccessRevision }, viewer, { online });
inviteCampaignReader(state, id, { memberId, expectedAccessRevision }, viewer, { online });
migrateCampaignContent(state);
```

Optional arguments may be omitted. Projection returns `data`, permissions
`canRead/canEdit/canManageAccess/canInvite/canRestore`, history summaries and
owner-only ACL. Links are `{kind:'entry'|'actor'|'scene',id}` or
`{kind:'homebrew',ref:{contentId,revisionId}}`; resolved results contain a label
and typed route only if the destination is accessible. Filtering precedes
search, snippets, counts, links and history. No private-title error messages.

Draft owner is distinct from entry owner. Draft saves remain local/private,
including incomplete input; conflicts preserve the draft. Explicitly setting
`baseRevisionId` acknowledges a new visible base after reviewing the conflict;
this is not an automatic text merge. Preview returns
`{draft,proposed,audience,errors,conflicts,current,canApply,reviewKey,commit}`.
Apply result is `{draftId,entryId,revisionId,returnTo}` and remains retrievable
after reload/retry. Irrelevant gameplay changes do not invalidate review keys.

## Real session API

Sessions and polls live in `state.campaign.sessions/polls/sessionDrafts`.
They are separate from fictional time, rests, initiative and a played-state
declaration. Missing availability is not `no`; reaching a consensus does not
confirm a session automatically. Existing campaign membership controls reading;
DM/co-DM and explicitly designated organizers can schedule. A member can record
a past unscheduled game; doing so does not terminate any current gameplay.

```js
resolveSessionTime({ localTime, timeZone, selectedInstant });
listCampaignSessions(state, campaignId, viewer);
listSessionPolls(state, campaignId, viewer);
createSessionDraft(state, { id, kind, sessionId, pollId, slotId, returnTo }, viewer);
getSessionDraft(state, id, viewer);
listSessionDrafts(state, viewer);
saveSessionDraft(state, id, { data, expectedDraftRevision, baseRevision }, viewer);
discardSessionDraft(state, id, viewer);
previewSessionDraft(state, id, viewer);
applySessionDraft(state, id, { reviewKey }, viewer, { online });
setSessionAvailability(state, pollId, { slotId, slotRevision, response }, viewer, { online });
```

Kinds: `direct/poll/change/cancel/confirm/played`. Direct/change data:
`{title,localTime:'YYYY-MM-DDTHH:mm',timeZone,selectedInstant}`. Poll data:
`{title,participants:[id],slots:[{id,localTime,timeZone,selectedInstant}]}`.
Cancel data `{reason}`; confirm identifies existing poll/slot; played has a
title and no invented appointment date. Response is `yes/maybe/no/null`, where
null withdraws only the caller's answer. Answers retain slot revision identity.

Time resolution returns `{valid,startsAt,candidates:[{startsAt,offsetLabel}],
errors}`. Invalid calendar dates and nonexistent local times are rejected.
An ambiguous local time requires explicit selection of one candidate instant.
Date conversion uses the platform's IANA timezone data, not silent `Date`
coercion of local input. The persistence records UTC plus declared timezone.

## Integration and limits

All mutations run inside root `ctx.commit`. Preview supplies
`commit:{local,visibility,undoable:false}`. Domain apply/access/session commands
reject `{online:false}` for shared changes. Missing transport context is not
claimed to establish production network authority. Root independently guards
shared commits and protects narrative/session state from gameplay snapshot undo.
Private commit log messages must remain neutral; narrative attribution is in
the permitted revision history.

The migration converts legacy notes/journal/summary once, preserving owner and
existing synthetic text, then removes obsolete text sources. Session migration
does not guess a timezone or turn an unknown date into an appointment. Migration
is local data adaptation, not publication or a real-data migration service.

Full administration/invitations/guest history, multiplayer identity/security,
real-time co-writing, external calendars/reminders, media, world maps/time and
recovery across devices remain product work. The two-identity UI is an explicit
demo limitation, not the authority model tested by this domain.

## Implemented details and checks

`saveCampaignDraft` also accepts an optional `campaignId` for the entry owner.
A standalone note can gain campaign context without becoming a second note or
being shared implicitly. Non-owner editors cannot change the context or ACL.

Historical sections intersect their original audience with current section
permissions. Restoring text preserves current section access and newer sections;
a removed historical section returns privately, without reviving its old ACL.
An editor's update retains invisible sections, links and a hidden narrator
reference. Audience preview is restricted to a proposed recipient and the
intersection of caller-visible and recipient-visible draft content. It does not
recompose invisible sections for an editor or impersonate a viewer elsewhere.

Return context includes builder/campaigns and the existing nested Library
selection context, validated by `parseLibraryReturn`. It is not a URL redirect.
Session drafts accept explicit `baseRevision` revalidation after a conflict;
answers that changed in the meantime require a fresh review. Draft data are
retained. Poll consensus does not schedule anything; changed appointments do not
reinterpret the earlier poll answers as answers to the new time.

Migration distinguishes an administrative legacy owner from authorship. An
unknown author/date stays `null` with legacy provenance; known values survive.
Malformed legacy note/journal/summary or unknown nonempty appointment shapes
throw before changing any source or marker, allowing the store's recovery path
to preserve the original save. The preceding demo had no authored nonempty
legacy appointment format; this adapter does not invent one. Source-less current
session references are rejected outside a readable campaign context.

TDD observations: the first content/session groups failed on the missing domain
API. Later regressions were observed failing before fixes for revoked-preview
audience, typed nested returns, legacy attribution and invalid-source recovery,
section history/restore ACL, invisible narrator loss, access retry and explicit
session conflict rebase. The latter privacy cases include concrete findings from
the distinct reviewer; that reviewer owns closure, not this author.

- Owned domain tests: **35/35 pass** (24 content, 11 session).
- Full blueprint suite rerun by this author: **301/301 pass**. The intermediate
  root integration failure used a noncanonical appointment stub on reload;
  root replaced that fixture with actual content/session/poll API operations.
  The stronger migration validation remains in place.
- Prettier applied to the four owned source/test files. No browser, external
  service, account mutation, deployment or commit performed by this author.

Actual SHA-256 values at the independent-review handoff, not a commit SHA:

| File                                                | SHA-256                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------ |
| `design/blueprint/campaign-content.mjs`             | `3ff8c273749a5b2db54dc44025469c29344f82c9ccf0db6831216e889005678b` |
| `design/blueprint/campaign-sessions.mjs`            | `e96aa8f6fcb8dcae1900e2bdd5da4e4b8ec553265bece688b254ae17202aaafe` |
| `design/blueprint/tests/campaign-content.test.mjs`  | `ab36627b959894d11fe4601eafb14cd8a2384cf2a83167b32d2bf31300f5b264` |
| `design/blueprint/tests/campaign-sessions.test.mjs` | `7443047d72ca1ce5af51fc0a7945a11f4fdc8498bd236daee9aa1c5fd282c3aa` |
