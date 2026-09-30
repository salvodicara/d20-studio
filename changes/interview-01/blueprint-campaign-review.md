# Increment 7 — independent review

23 September 2026. Reviewer: `/root/blueprint_characters`, inherited model/effort. Worktree: `~/Workspace/Codex/d20-studio-interview-01`. Reserved output: this report only. Domain author: `/root/review_journey`; UI author: `/root/blueprint_module_review`; coordinator owns shell, Home/search/notes entry points, migration and browser checks.

**Status: independent review complete for the final file snapshot below; no unresolved P1/P2 within this increment's reviewed scope. R1–R5 independently closed.** The checklist below was prepared before implementation. Findings and verification snapshots are recorded separately. No source/test edits or browser access were performed by this reviewer. Coordinator runtime checks remain separately attributed.

## Authority and evidence boundary

Read R191's [campaign research](blueprint-campaign-research.md), the last section of [build plan](blueprint-build-plan.md), the conceptual [Campaign page](../../docs/interview/pages/campaign.md), NAV-09/10 and the relevant decisions I-044–051, I-094 and I-117. R191 already distinguishes published competitor behavior from the delegated application design. This review does not elevate its proposed ACL/history/scheduling details into historical owner decisions or claim hands-on competitor testing.

Reference snapshots at preparation:

- `blueprint-campaign-research.md`: `00b650857f332988a91772f78ebd0d039efdaed6621f9653361f497b707f05d4`.
- `blueprint-build-plan.md`: `c426ed8f3a4edffcce6b24ae9bfeef54573e9eecd414eb1aa839869838f847dc`.

The two demo identities remain `player` and `dm`. Domain fixtures can use separate synthetic author, reader, editor, delegated inviter and organizer identities to verify distinctions without presenting the demo role selector as complete authentication. Any missing sections, administrative roles or services must remain explicit gaps, not fake controls.

## Highest-value checks at stable handoff

| ID  | Boundary and concrete probe                                                                                                                                                                                                         | Required observable result                                                                                                                                                                                                                                                                                                                                                 |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C01 | Save a personal note with a unique secret title/body, link it to a controlled actor, then query as DM, another controller and an unrelated identity. Repeat with its known ID and after JSON reload.                                | No private title, body, snippet, author detail, link target, raw row or revealing count in list/detail/search/Home/history/log projection. Actor control and campaign role do not grant personal-note access.                                                                                                                                                              |
| C02 | Give reader and editor distinct grants. Try writing as reader; inviting as editor without delegation; then inviting with delegation and submitting a forged editor/owner/delegation upgrade.                                        | Reader cannot write. Ordinary editor cannot invite. Delegated invitation grants only its documented limited access and cannot promote the inviter, transfer ownership or create a delegation chain. Current campaign membership is validated, not accepted from form data.                                                                                                 |
| C03 | Save an editor contribution, open a second edit draft, revoke that editor, then try preview/save/apply/retry and query history. Also remove an individual grant while campaign-group access still exists.                           | Saved contribution remains attributed; revoked access blocks new publication/read of later source revisions. Already typed local work is not silently deleted. Effective group access is honestly shown rather than falsely declaring total revocation. Private drafts remain owned by their writer.                                                                       |
| C04 | Create private revision A, publish a deliberately chosen current revision B to more people, then request A through history, comparison, restore and guessed IDs. Add a new campaign member or DM after that.                        | Current access is insufficient to open formerly private history. Historical audience must be frozen to authorized identities or protected by an equivalent explicit model; resolving a historic group against today's members must not silently broaden it. Current `Io e i DM` access remains distinct from access to older revisions.                                    |
| C05 | Two authorized editors draft from the same revision. Save one, then apply the other's old review. Repeat with ACL changed after preview and with unrelated HP or note changes.                                                      | Source or relevant permission changes block stale publication and retain the local input for comparison/reconciliation. Unrelated gameplay/text changes do not create a false conflict. Repeated Apply after reload creates one result, not duplicate revisions/recaps.                                                                                                    |
| C06 | Public entry references a private actor, scene, Library revision or narrative entry; a readable entry contains a restricted section if supported. Exercise detail, search, autocomplete, back-links, history and recipient preview. | Each target uses its own access projection. Author-entered free text is not falsely promised semantic spoiler filtering, but structural links/sections cannot leak names or raw data. Recipient preview cannot be used to query unrelated content as that identity. Unsupported secret sections must be declared absent.                                                   |
| C07 | Restore an old text revision while HP, slots, equipment, pending physical rolls, initiative, ACL and appointment state have changed. Then exercise the existing global gameplay Undo after narrative/ACL operations.                | Text restoration appends a new attributed revision and does not restore obsolete ACL or any gameplay snapshot. Global snapshot Undo cannot accidentally resurrect revoked access or erase narrative revisions while undoing a Table action. If narrative commands are excluded from that undo path, the exclusion must be effective, not only UI wording.                  |
| C08 | Migrate legacy notes and journal once, reload and migrate again, add another legacy-shaped item if supported, and reset the demo. Include missing author/date/title and an existing synthetic recap.                                | Stable identities, one authoritative text store and no duplicates. Personal ownership/privacy survives. Missing metadata is unknown, not invented. A restart does not resurrect old text over newer edits. Migration errors do not partially widen access.                                                                                                                 |
| C09 | Hub has a newer private draft/recap and an older readable saved recap, a cancelled appointment and an unconfirmed unanimously available poll. Enter/leave Table and reopen the hub.                                                 | Hub selects from permitted saved content and confirmed appointments only. No recap is fabricated; missing recap/date does not block play. Navigation does not change game time, resources, initiative, session completion or attendance.                                                                                                                                   |
| C10 | Create a direct appointment in an explicit IANA zone; display the same instant in another zone crossing midnight. Try an invalid civil date, DST gap and DST overlap; change the browser/system zone.                               | UTC instant and chosen zone are explicit and consistent. Impossible dates are rejected; ambiguous times require a visible choice of instant, and nonexistent times are not silently shifted. Appointments remain independent from world dates, rests and encounter turns. Suggested runtime fixtures: Europe/Rome `2026-03-29 02:30`, `2026-10-25 02:30`, and February 30. |
| C11 | Respond yes/maybe/no and withdraw for oneself; forge another responder ID. Change an alternative's time after responses; confirm twice, reload and confirm again; cancel/change the appointment.                                    | Missing response differs from No. Responses belong to the authenticated caller and the exact alternative revision. Changed times do not reuse stale approvals. Only authorized organizer confirms; one session is created and the poll outcome remains readable. Cancellation preserves linked recaps and does not close the Table or send external messages.              |
| C12 | Type unsaved content; trigger validation error, stale conflict, revocation, offline save and render. Exercise Back, hash navigation, section/campaign/role switch, dialog Esc and reload of saved draft.                            | Input survives failed publication and replacement DOM nodes. Save draft is private/local and distinct from sharing. Staying, saving or explicit discard have separate effects. Role switch clears the old editor view. Reconnection revalidates source and access. No success message claims remote confirmation in this local simulation.                                 |

## Integration emphasis sent to the authors

The most fragile seams are projection **before** aggregation, historical audience versus dynamic role membership, and a global store Undo that predates append-only narrative records. A filtering renderer alone cannot protect raw query results, search snippets, commit labels, backup history or relationship metadata. Tests should assert exact absence of secret markers in returned projections/logs as well as ordinary permission booleans.

Tests for conflict recovery should exercise the actual UI payload and reacquire controls after every render, rather than calling only lower-level commands with fields unavailable to a real handler. This caught a false-green identity regression in increment 6. Scheduling tests should pin explicit clock/zone inputs and compare unrelated game-state snapshots; waiting for wall-clock time is unnecessary.

Idempotence should be checked with the same saved draft/result across JSON reload. Permission checks still precede any new side effect; returning an old result must not expose newly inaccessible narrative data. A cancelled or edited poll outcome is a state change to review, not a reason to erase already written session reports.

## Planned independent verification and handoff

At stable handoff, read domain/API evidence and the final code, run the authors' relevant tests, then add non-persisted independent reproductions for the concrete seams above. Record actionable findings with file/line, minimal fixture, exact observation and expected invariant. Do not classify missing out-of-scope future families as newly discovered implementation bugs.

Root will exercise the connected Campaign → recap → linked world entry → Table → new recap → next real appointment journey and the independent personal Notes path in the browser. The independent source review will distinguish tests rerun here from coordinator browser evidence. Final report will include precise hashes and remaining limitations; there is no implementation acceptance yet.

Preparation update from coordinator: the Undo seam was reproduced and two integration tests went red → green with `options.undoable:false`, preservation of narrative/session/poll/member state during gameplay undo, and shell forwarding of the flag. This is author-reported progress, not a recheck performed here. C07 remains on the stable-handoff review list, including the existing state/shell delta; migration and consumers are still in progress.

## Early review checkpoint — content domain and existing store/shell seams

Requested by the coordinator while the author builds sessions. This checkpoint intentionally excludes unfinished session/UI behavior and does not duplicate the already assigned Notes return-context, legacy metadata/malformed-data, revoked-preview audience or recipient-preview work. The author accepted both findings below and is adding regressions. They remain open until independent recheck.

Snapshot read and independently exercised:

| File                                                   | SHA-256                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| `design/blueprint/campaign-content.mjs`                | `9ca4dca6f134d7fecb4ee7ac8be4565935fae73b2aee6761b13f545ce5913aec` |
| `design/blueprint/state.mjs`                           | `9fb40b8f6b97a6487c19adf96b2167bfa5f1bb220a2d2f9e5233818beff38f3c` |
| `design/blueprint/app.mjs`                             | `a9728efb1e57115c25c46be2defdf73dcf1865d7601ec009984894eb46271f63` |
| `design/blueprint/tests/campaign-content.test.mjs`     | `974051e1e6f9f44aee6530c994f11389213ec23b16d4825be94fc5ed097cd5e8` |
| `design/blueprint/tests/campaign-integration.test.mjs` | `2ee27a74eb76065608960e7205d8b9999c9442f0216dcd064c3ce7298988bcad` |

The existing focused group passed **38/38**: `node --test design/blueprint/tests/campaign-content.test.mjs design/blueprint/tests/campaign-integration.test.mjs design/blueprint/tests/state.test.mjs`. This includes malformed legacy recovery, narrative exclusion from gameplay undo, and preservation of text/ACL/session records during gameplay correction. Neither new finding was covered by those tests at this snapshot. Shell inspection confirmed that `commit` forwards `undoable`/visibility, and search obtains projected entries before constructing escaped titles/snippets; no browser claim is made.

### R1 — P2: section revocation and text restoration use obsolete section permissions

Locations at the snapshot: `campaign-content.mjs:108` (`sectionReadable`), `:152` (restore draft from old projected data), `:196` (publish that data).

Minimal public-API reproduction:

1. Alice creates a campaign note shared with Bob. Section `secret` has `access:{mode:'campaign',grants:[]}` and body `SECRET-MARKER`. Record its revision ID.
2. Alice saves a new revision with that same section ID and `access:{mode:'private',grants:[]}`; parent note sharing remains unchanged.
3. `getCampaignEntry(state,id,'bob').data.sections` is `[]`, but `getCampaignEntry(state,id,'bob',{revisionId:first}).data.sections` contains `SECRET-MARKER`.
4. Alice creates/applies a restore draft using `restoreRevisionId:first`, without any ACL choice. Bob's **current** projection now contains the section again.

The old section ACL is consulted for history, and the restore payload copies it back into the current revision. Current section access must also govern historical queries. Text restoration must preserve current section ACL, just as the existing parent-entry restoration preserves current access; a historically deleted section needs an explicit safe policy rather than automatically restoring its former recipients. Already downloaded knowledge is outside this claim: the defect is new reads and renewed current access after revocation.

Author response: accepted. Planned regressions cover history as historical audience intersected with current section ACL, restoration preserving current ACL, missing historical sections returning privately, and retention of newer restricted sections.

### R2 — P2: an editor's hidden narrator projection becomes destructive input

Locations at the snapshot: `campaign-content.mjs:118` (private narrator becomes `null`), `:196`–`:200` (merge retains hidden links/sections, but not narrator).

Minimal public-API reproduction:

1. Alice owns a private character `hero` and saves a note with `narratorActorId:'hero'`, granting Bob edit access to the note.
2. Bob's entry/edit draft correctly projects `narratorActorId:null`.
3. Bob changes only `body`, saves the draft and applies its valid preview.
4. Alice's current entry now also has `narratorActorId:null`.

The collaborator cannot distinguish an absent narrator from a hidden one. Publishing unrelated text must preserve the hidden current reference, analogous to the existing hidden-link and section merge. A deliberate change to a visible narrator remains a separate authorized edit.

Author response: accepted; regression and merge correction in progress.

These probes used separate synthetic Alice/Bob identities and only public domain APIs in an ephemeral Node process. No persisted source/test fixtures or browser state were changed. There is no final increment-7 acceptance at this checkpoint.

## Stable-handoff review and renewed checks

The coordinator expanded review to content/session domains, the Campaign UI/CSS, the existing store/shell/index integration and relevant tests. The candidate is a dirty worktree snapshot; no commit SHA is invented.

Initial stable handoff:

| File                                  | SHA-256                                                            |
| ------------------------------------- | ------------------------------------------------------------------ |
| `campaign-content.mjs`                | `3ff8c273749a5b2db54dc44025469c29344f82c9ccf0db6831216e889005678b` |
| `campaign-sessions.mjs`               | `e96aa8f6fcb8dcae1900e2bdd5da4e4b8ec553265bece688b254ae17202aaafe` |
| `campaign.mjs`                        | `a344897f091efdef8593a7dffd9d528c184b39487a55ba5aa69e3e10a5557972` |
| `campaign.css`                        | `d2bda7dab5c2144f6085cd9948cac2977f3e3238f20a9b66a39d6697ebdc389f` |
| `index.html`                          | `ed155bf1dde8c379dff7cb837432f0578d079b0af0cc63bb34085b4f20c75b24` |
| `tests/campaign-content.test.mjs`     | `ab36627b959894d11fe4601eafb14cd8a2384cf2a83167b32d2bf31300f5b264` |
| `tests/campaign-sessions.test.mjs`    | `7443047d72ca1ce5af51fc0a7945a11f4fdc8498bd236daee9aa1c5fd282c3aa` |
| `tests/campaign-ui.test.mjs`          | `09fa18b0c0c1799157a293b19f17414989601985d114beb85a83f653628462e8` |
| `tests/campaign-integration.test.mjs` | `a72b86eff9ec4037c2039cca4c8667d09190f42dfb8c5b792cce8b47f9f4029b` |

`state.mjs` and `app.mjs` retained the hashes in the early snapshot. The integration undo fixture now creates real narrative revisions, a created/cancelled session, poll, availability response and drafts through public APIs, instead of using malformed stand-ins.

### R1/R2 independently closed

The exact ephemeral reproductions above were rerun against content hash `3ff8c273…`: Bob's current and historical section lists stay empty after section revocation and after owner text restoration; the hidden narrator ID remains `hero` after Bob edits only the body. Both pass. The added author regressions also verify that restoring a deleted section brings it back privately and retains newer sections. This closes the concrete findings without claiming that downloaded knowledge can be revoked.

The five-file test group (content, sessions, UI, integration, state) passed **72/72** at this stable handoff. Additional independent probes passed:

- A poll response arriving after a confirmation preview invalidates that preview. Removing the organizer's membership preserves the owned draft while returning `current:null`, `proposed:null`, `canApply:false`.
- `Australia/Lord_Howe` rejects the missing `2026-10-04 02:15` and returns two explicit candidates for repeated `2026-04-05 01:45`; the half-hour transition is handled. `Asia/Kathmandu` accepts its quarter-hour-offset civil time. These extend the authors' Rome gap/fold and cross-date-zone tests.
- Source review confirmed that session date changes append history, poll confirmation retains responses and is idempotent after JSON reload, and these commands do not touch gameplay time/HP/resources. Session lists are member-gated at the domain boundary.

### R3 — P2: displayed appointment timezone does not match the displayed clock time

Initial UI location: `campaign.mjs:554` and `:568` (`sessionList`, sessions and poll alternatives), hash `a344897f…`.

An ephemeral Node process with `TZ=UTC` creates an appointment at `2026-11-12T20:00` in `Europe/Rome`, then renders Sessions. Observed markup is `<time datetime="2026-11-12T19:00:00.000Z">12 Nov 2026, 19:00</time> · Europe/Rome`. The time was converted to the viewer's zone while the adjacent label names the organizer's zone. Poll alternatives use the same mismatched pattern. The coordinator independently observed this in the browser too.

Expected: label the local time with its actual viewer zone, and show the agreed original-zone time separately, or display the time in the named original zone. Author's first fix introduces `appointmentTimes` for those distinct rows and a midnight-crossing UTC/Rome regression; hash `12983d28c5ec0e9e40b70a4f04f51e1ffb8cb816077357f419b9c049bfba4660` precedes R4/R5 changes. Final recheck pending.

### R4 — P2: new Campaign views bypass current campaign membership for party/maps

Initial UI locations: `campaign.mjs:171` (`actorRows`/`group`), `:190` (`revealedScenes`), `:196` (`overview`) and direct `group` route. Confirmed against the original UI handoff; unaffected by the first timezone fix.

Reproduction: start from `createInitialState()`, set the player member's `active=false`, and set a revealed scene's `publicDescription='EX-MEMBER-CAMPAIGN-MARKER'`. `getCampaignHub(state,campaignId,'player').permissions.canRead` correctly returns `false`, but `renderCampaign` for Overview still includes Livia's party information/HP and the map marker. The Group route also calls the ungated party helper.

Expected: newly introduced campaign consultation views and their party pickers honor current membership. Owned personal Notes and recoverable private drafts remain separate; the requested correction does not expand into a rewrite of the earlier Table's simulated authentication. Author accepted and is adding view/handler regressions.

### R5 — P2: section controls promise independent edit/invite permissions that do not exist

Initial UI locations: generic `accessFields` at `campaign.mjs:399`, reused by section fields at `:471`.

The agreed domain intentionally gives sections their own **audience**, while edit permission comes from the parent entry. The UI nevertheless offers section-level `Read`, `Edit` and `May invite` controls. Public-API reproduction: Bob has parent edit permission and only section `read:true,edit:false,invite:false`; his section text edit still has `preview.canApply:true`, as intended by the domain. Selecting section Edit cannot independently grant parent edit authority either.

Expected: section UI exposes visibility/readers, explains inherited editing rights and does not offer inert independent privilege controls. The author confirmed no such explanation was present and is correcting UI only; this finding does not request a new ACL model or change domain authority.

Final UI hashes, renewed tests and independent finding closure will be appended after the combined author correction. No final verdict yet.

### Combined UI correction independently rechecked

Final Campaign UI handoff: `campaign.mjs` **`31fadc55773acad2ddfe70c2d8f9905c5b4175693a96c0a0814072f58b8cc3bf`**; `tests/campaign-ui.test.mjs` **`fb32c2787981533641feac36dee0b7481bd347117a0ff4de60a33def4eca6070`**. CSS is unchanged.

- **R3 closed:** the independent UTC fixture creates both a session and poll alternative for `2026-11-13 00:30 Europe/Rome`. Both rendered results now explicitly show `12 Nov 2026, 23:30 · Your timezone (UTC)` and a separate `Agreed time: 13 Nov 2026, 00:30 · Europe/Rome`. The date transition and labels agree. Hub uses the same helper; preview names the viewer zone too.
- **R4 closed for Campaign UI:** with the player inactive, independent renders of Overview, World, Group, Sessions and Settings omit the unique scene marker, Livia and appointment/poll markers. The author's regression also keeps personal Notes and private drafts recoverable while blocking shared apply. Party-picker source now checks membership before returning actors.
- **R5 closed:** a fresh-controls handler probe creates a section, changes its audience, chooses DM readership and saves. Its selector has no `Edit` option, the UI explains inherited parent edit permission, and the saved grant is exactly `{id:'dm',read:true,edit:false,invite:false}`. Parent edit/delegation controls remain distinct.

The renewed focused group passed **75/75**. The complete blueprint command `node --test design/blueprint/tests/*.test.mjs` then passed **304/304** independently. No additional P1/P2 was found within the reviewed domains and Campaign UI.

The coordinator additionally gates the new Home/Campaigns consumers, campaign sidebar and campaign-name return bar after membership removal. Their delta was read at intermediate app hash `71cd96783e3ae91c497eef7e8af80b2df961769070c58194182e2dc7b8adc913`; Home also labels appointment time with the same viewer zone used to format it. Final shell hash confirmation and the coordinator's browser recheck remain to be recorded below.

Review limits remain explicit: this is a local two-identity blueprint, not production authentication, remote delivery, a timezone database certification or a human playtest. Full membership administration and global access enforcement in earlier Table/sheet code are separate work; R4 does not claim a complete production revocation system. No media upload, external scheduling service or automatic world-time/rest transition was added by this increment. The broader product contract is still being built.

## Final snapshot and verdict

The coordinator froze `app.mjs` at **`104955119c175d60c2faccf1dfc68ddcf0a8889dcdea43cb78ef658fa8670fb3`**. The renewed source check read its last delta: Search excludes shared actors from campaign results after membership removal, retaining an accessible actor owned by the current identity. Home/Campaigns, the sidebar and the campaign-name return bar use current hub membership. Neutral page navigation and personal Notes remain available. No additional finding arose from this delta. Node syntax check and Prettier check passed for the app and final domain/UI sources.

Authoritative reviewed file hashes:

| File under `design/blueprint/`        | SHA-256                                                            |
| ------------------------------------- | ------------------------------------------------------------------ |
| `campaign-content.mjs`                | `3ff8c273749a5b2db54dc44025469c29344f82c9ccf0db6831216e889005678b` |
| `campaign-sessions.mjs`               | `e96aa8f6fcb8dcae1900e2bdd5da4e4b8ec553265bece688b254ae17202aaafe` |
| `campaign.mjs`                        | `31fadc55773acad2ddfe70c2d8f9905c5b4175693a96c0a0814072f58b8cc3bf` |
| `campaign.css`                        | `d2bda7dab5c2144f6085cd9948cac2977f3e3238f20a9b66a39d6697ebdc389f` |
| `state.mjs`                           | `9fb40b8f6b97a6487c19adf96b2167bfa5f1bb220a2d2f9e5233818beff38f3c` |
| `app.mjs`                             | `104955119c175d60c2faccf1dfc68ddcf0a8889dcdea43cb78ef658fa8670fb3` |
| `index.html`                          | `ed155bf1dde8c379dff7cb837432f0578d079b0af0cc63bb34085b4f20c75b24` |
| `tests/campaign-content.test.mjs`     | `ab36627b959894d11fe4601eafb14cd8a2384cf2a83167b32d2bf31300f5b264` |
| `tests/campaign-sessions.test.mjs`    | `7443047d72ca1ce5af51fc0a7945a11f4fdc8498bd236daee9aa1c5fd282c3aa` |
| `tests/campaign-ui.test.mjs`          | `fb32c2787981533641feac36dee0b7481bd347117a0ff4de60a33def4eca6070` |
| `tests/campaign-integration.test.mjs` | `a72b86eff9ec4037c2039cca4c8667d09190f42dfb8c5b792cce8b47f9f4029b` |

Independent evidence is the **75/75 focused tests**, **304/304 complete blueprint tests**, the concrete additional reproductions above, final source reads and formatting/syntax checks. The complete test run preceded only the final app Search-filter delta, which was separately reread and syntax-checked; the Node tests do not pretend to drive the browser shell. Report links and whitespace were validated.

**Verdict: no remaining P1/P2 in the reviewed increment-7 domain, UI and named integration changes.** This is an independent implementation review of the recorded dirty snapshot, not approval of the whole product contract, a production release or an invented commit SHA. Coordinator browser journeys, visual checks and final evidence packaging remain the coordinator's separate responsibility; any subsequent semantic source edit needs a renewed delta review.
