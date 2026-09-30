# Verification — integrated visual blueprint, increment 1

23/09/2026. Candidate is dirty local work in `codex/interview-01`; no candidate
SHA, PR, integration, deployment, or final contract approval is asserted.
Full Goal remains active. Root coordinates one shared browser; workers own
only their modules. Model/effort are inherited unchanged.

## Automated and browser evidence

- `node --test design/blueprint/tests/*.test.mjs`: **32/32 pass**, including
  state atomicity/storage/privacy/turn refresh, character consumption and
  scene authority/drafts/copy/reveal invariants.
- Six browser scripts preserved in [blueprint-checks](blueprint-checks/README.md):
  core (13 named checks), preparation (9), gestures/views (8), browser Back (4),
  measurement (2), visual fixes (5 plus label typography assertion).
  These are assertions within linked visits, not counts of completed features.
- Core, preparation, gestures, Back and visual-fixes report empty `pageerror`
  arrays. Measurement reports both invariants passed. Final loaded browser
  had no console errors/warnings when checked after the modules were ready.
- Early browser loads during parallel development found a missing CSS/module
  export before the worker finished; after integration/reload those errors
  did not recur. A failed initial upload test used unavailable `Buffer` in
  the CLI runtime; corrected to a real text fixture, then passed.
- Browser paths, retained scripts and screenshot reproduction are documented
  in the checks README. Artifacts are outside the checkout under
  `~/Workspace/Codex/d20-blueprint-evidence/2026-09-23`.

## Separate reviews and fixes

`review_journey` reviewed root behavior and found six P2s: pointercancel pan,
offline shared combat/undo, unavailable storage, empty-scene keyboard,
skip-link routing, initial combat reaction refresh. Root fixed them with
relevant tests; reviewer confirmed all six resolved.

Fresh `blueprint_module_review` reviewed characters/preparation and found
two P2s: private future plans exposed by DM control permission, and browser
Back bypassing preparation draft protection. Fixed per-identity plans and
hash navigation guard; reviewer rechecked with 22 module tests passing and
no residual substantive finding. Root exercised Back/cancel/discard in browser.

Visual review by `review_journey` covered six desktop/mobile screenshots.
Found duplicate active sidebar sections in Preparation and undersized map
controls/tokens on mobile. Root fixed active-section logic, measured 46px
mobile token circles/13px names, 40px map controls, and touch selection.
Final screenshots and focused browser assertions were refreshed.

Root also found measurement incorrectly inheriting the movement budget
visualization. A browser regression failed before the fix and passed after:
full distance line, no reachability ghost, no shared mutation on click.

## Scope and limits

[BLUEPRINT_STATUS](../../docs/interview/BLUEPRINT_STATUS.md) maps demonstrated
journeys to contracts/references and remaining work. The modules themselves
list deeper gaps. This is not full CRE/ADV/INV/MAG/HB/TABLE coverage.

Laptop 1440×1000 and mobile 390×844 were exercised. Phone coverage proves
navigation/dialog taps and token selection, not every direct map gesture,
orientation, screen reader, OS/browser or input method. EN inventory and
shared labels were observed; authored content remains in its authored language.

Impeccable detector returned no findings but **degraded**: optional parsers
htmlparser2/css-select/css-tree/domutils unavailable. No complete contrast or
selector audit is claimed. No dependencies were installed to repeat it.
Source formatting/syntax and whitespace checks are run after final edits and
recorded in task.md. Neither source review nor simulated roles prove backend
security, real multiplayer, exhaustive 2024 rules or distributed undo.

## Increment 2 — 23/09/2026

Added combat.mjs/combat-ui.mjs, action palette and contextual inspector,
actual prepared encounters and durable roll evidence. Same worktree/app/state;
no final candidate approval or production readiness is implied.

Final Node suite: **74/74 pass** (21 combat domain, 1 combat projection/UI,
24 preparation, 15 state, 11 characters, 2 table privacy).

Observed browser runs in the existing named browser, sequentially:

- combat: **10 named checks**, physical attempt/critical/damage/undo/reload;
  accepted faces survive correction and reload with visible reversal.
- area: **8 checks**, freely arranged tokens, cone placement including ally,
  pointer movement after placement, common damage and individual saves.
- multi/self: **6 checks**, repeated dart assignment and contributions,
  slot cost, clicked Dash destination, actions without modal, Dodge expiry.
- English/touch combat: **10 checks**, direct digital click, physical natural
  1 miss, ordinary movement after acting, toolbar cancel, responsive palette,
  persistent map/detail shortcuts and no horizontal overflow.
- encounter lifecycle: **11 checks**, staged NPC creation/clone, token removal
  preserves actor, save vs activation/start, digital and physical initiative,
  reroll, discard/undo evidence and offline no-roll.
- regression core: **13 checks**; regression gestures/views: **8 checks**.
  Both scripts now use the actual prepare/save/start workflow. Repeated because
  shared state, table and layout changed. Unchanged first-increment-only
  scripts were retained without indiscriminate reruns.

All runs above returned empty pageerror arrays. Responsive test additionally
collects window error events and waits for two animation frames after changing
viewport. This caught the class of ResizeObserver delivery warning surfaced
by screenshot review, which Playwright pageerror alone did not report.

Separate review `blueprint_module_review` found and rechecked: numeric
combat inputs could coerce missing values; hidden source/controller projection
could hide permitted saves; physical mode could reset on resumed pending rolls;
cone placement followed hover while reaching Cast; shared audit labels could
reveal private names. Fixed with domain, projection and real browser checks.
It also reviewed Dash I017 (no P1/P2), then mobile selection-to-cast travel.
Root moved the mobile palette next to the map and added persistent map/detail
access; reviewer closed the P2 from refreshed screenshots. A remaining
ResizeObserver warning was fixed by moving responsive reparenting to a
matchMedia change handler; screenshot and browser window-error check are clean.

Separate `review_journey` found initiative rolls were lost on scene discard,
then on snapshot undo. Workers separated durable evidence from preparation,
recorded reversal links, prevented silent reuse of reversed initiative and
retained accepted combat faces. Root exposed permitted evidence in the common
results UI. Reviewer reran state/preparation/combat-ui **40/40**, found no
residual P1/P2 in that bounded scope; root browser confirmed discard, undo and
reload. These are reviews of dirty current files, not SHA approval.

Current desktop captures include 1440×1000 and 1366×900; touch390×844.
Screenshots are provisional UI and synthetic data. Geometry still uses a flat
open scene and token centres for cones. Reactions, approach-then-attack,
concentration, full NPC/character action configuration and the remaining
families are not complete. Immutable roll evidence is persisted locally;
the undo stack is not restored across reload or shared across participants.

Final source syntax, formatting, whitespace, local Markdown links and the
I/R identifier sequences are checked after documentation updates in task.md.

## Increment 3 — linked reactions, movement and concentration

23/09/2026, same isolated dirty worktree, no candidate commit or integration
approval. Research is `blueprint-reactions-research.md`; adoption I-220/R187.
The prototype remains incomplete as a whole.

Final domain/module suite: **110/110 pass**: combat21, reactions23,
preparation34, state15, characters11, character-reaction handlers2,
combat UI/projection2 and table2. Tests verify original accepted authority
for resumed digital damage, hidden sources, neutral relations, explicit death,
slot limits, no fake concentration dice, instance replacement/linked effects,
stale requests and custom NPC creation/save/opportunity. Data is synthetic.

Browser journeys, real controls with localStorage used for assertions only:

- `reactions-journey.js`: **8 checks**, configured NPC, reach-boundary stop,
  pending reload, controller privacy, physical attack, Shield before damage,
  Esc leaves unanswered, use once and automatic same-path resume.
- `concentration-journey.js`: **10 checks**, manual effect cancel/save without
  casting costs, decline without spending, damage before CON, visible CD10
  and modifier, Esc/reload pending, failed save ends its instance, Change
  retains spent movement/damage and permits a new strategy.
- `simultaneous-reactions-journey.js`: **6 checks**, symmetric exit via actual
  keyboard movement, explicit order with no spending, only the first linked
  response actionable, English390×844 request without horizontal overflow,
  sequential declines and automatic resumption. Browser window errors are
  collected in addition to Playwright pageerrors after responsive settling.
- `new-npc-reaction-journey.js`: **4 checks**, new NPC neutral by default,
  explicit hostile melee configuration, save/start and a real opportunity
  from that new actor, physical miss spends reaction and resumes.

Early failures were retained in the work history and resolved before the
successful runs: moving the pointer to a rounded screen coordinate was not
an exactly symmetric geometric exit, so the simultaneous test now uses the
actual keyboard path; Create-and-place's next-frame map focus could scroll
between screen-coordinate read and click, so placement waits for that frame
and scrolls the target into view. Neither test injects a favorable saved state.
Module cache was disabled through Playwright routing because the live static
server could otherwise serve stale code on iterative reload.

Separate reviews and their hashes:

- `blueprint-reactions-review.md`: closed missing disposition for newly
  configured NPCs and movement after explicit death; independent fresh
  creation/save/serialization confirms hostile versus neutral/allied behavior.
- `blueprint-reactions-ui-review.md`: closed concentration reconciliation and
  cleanup, corrected an impossible player ordering form involving a hidden
  source to explicit DM coordination; checked digital continuation retains
  the accepted DM authority. No P1/P2 remained in the bounded scopes.

Root inspected desktop Shield/CON and mobile EN images. Displaying full
geometric precision in the movement stat caused wrapping; display now uses
at most two locale digits, without changing domain values. The pending roll
close action is labeled Minimize request, not an implied refund/cancel.

No claim of runtime testing competitors, backend permissions, multi-client
network reconciliation, wall/path geometry, every concentration spell or
full reaction repertoire. Local pending work persists; undo history remains
session-local and is not a production distributed correction protocol.

Final related browser regressions after the new request/automatic-roll code:
`combat-journey.js` **10/10** and `combat-mobile-journey.js` **10/10** passed,
including physical critical/undo/reload, digital target click without an extra
dialog, English touch input and movement after spending an action. New reaction
and concentration journeys were rerun after disposition/display fixes; their
8+10+6 checks remained green. The new-NPC4 checks also passed. No pageerrors;
responsive check includes window-error capture. Final syntax32, Markdown local
links50, I-001–220/R001–187 continuity, source Prettier and git diff --check
all passed. No full-contract completion or integration authority is implied.

## Increment 4 — geometry, path and approach

23/09/2026, same dirty worktree and static server; no commit, integration,
publication or owner baseline approval. I-221/R188 preserve primary sources
and adaptations. Full contract remains incomplete and the Goal remains active.

Root's full Node suite after spatial/UI fixes: **144/144** before the final
pointer-focus regression fix below. The source reports distinguish pure
geometry, domain commands, editor event handlers and rendered projections.
Separate reviewers found and checked fixes for door operation through walls,
melee reach >1.5 m hiding prepared path selection, unauthorized direct physical
attack becoming approach, cross-scene draft contamination, authored content
misattributed to SRD, and Escape outside the SVG. Review hashes identify dirty
files, not a fictional candidate SHA.

Actual browser journeys, run sequentially against live modules:

- `spatial-journey.js`: **8 checks**, creates/saves an actual scene from UI;
  wall/door/terrain, draw cancellation and calibration, prepared initiative,
  blocked path with no spend, door first interaction, editable waypoints,
  terrain distance4.5m versus cost6m, execution/undo, keyboard add/Escape.
- `approach-journey.js`: **7 checks**, hover shows path/cost; physical arrival
  moves but spends no action, minimize/reload preserves request; Change keeps
  position/action; real physical throw spends once, miss and result/attempt
  undo are distinct; subsequent digital attack remains operational.
- `spatial-mobile-journey.js`: **6 checks**, separate 390×844 touch context
  initialized with an unchanged copy of the preceding synthetic UI fixture.
  English action-bar Escape, 42px door control, Utilize cost and undo,
  waypoint/cancel/offline, touch target click performs digital approach and
  attack without extra dialog, responsive/window-error/overflow assertions.

All three successful runs returned no page/window errors. Root inspected
`spatial-path-preview.png` and `spatial-mobile-en.png` under the external
23/09 evidence directory. Crowded adjacent token names on the small viewport
remain a recorded design gap: passing touch interactions and zero horizontal
overflow are not a claim of complete mobile legibility or overlap selection.

Early failures were investigated, not converted into coverage: the test
changed visit role before hash navigation reached the Table, so it now waits
for that page; a proposed melee route fractionally exceeded budget due to
screen-coordinate rounding, correctly rejecting all movement, and the fixture
now places the target with margin inside reach. An intended touch waypoint
landed in the visible door hit area and correctly opened the door; the test
now taps a free part of the map. A genuine focus loss after adding a waypoint
was fixed by focusing the newly rendered SVG rather than a detached root.

CLI run-code rejects a leading wrapper semicolon as well as a trailing one;
formatter-added leading separators were removed from journey entry points.
This does not modify the assertions or app behavior. Existing optional CLI
upgrade notice remains ignored; no dependency installation was needed.

The reaction regression then exposed a real map-drag issue: pointerdown
focused the preparation SVG and scrolled it before converting subsequent
screen coordinates. Pointer gestures now require preventScroll focus in
both token and geometry editors; final regression evidence follows below.

Limitations stay explicit: Euclidean center-point geometry and discrete
approach candidates, no complete footprints/grid metric/lighting/fog/senses,
partial cover, full 2024 catalogue, distributed authorization or production
networking. The image never supplies executable geometry implicitly.

Final late-fix verification: **145/145 Node**, pointerdown focus spies and
actual `reactions-journey.js` **8/8** pass. Livia's authored start is preserved,
movement pauses before leaving reach, and Shield still resumes the original
route. `combat-mobile-journey.js` **10/10** also passes after these changes:
digital target click, physical roll, ordinary/Dash costs, EN touch and layout.
No page/window errors. Separate spatial review renewed for the exact two-line
focus delta and added test; its updated 21 hashes match the current files.

Final static checks: syntax **25 mjs modules +18 browser scripts**, source
Prettier, git diff --check, **55 Markdown documents** with no missing local
links, contiguous I-001–221 and R001–188, observation24 exactly once. UI review
hashes remain valid; no semantic source changes occurred afterward. The
complete-product Goal is not fulfilled by these bounded checks.

## Increment 5 — guided characters and live-sheet preservation

23/09/2026. Same dirty worktree, synthetic local data, no commit/integration,
model or effort change, publication or production evidence.

- Root full Node run: **188/188**, exit0, evidence external
  `2026-09-23/increment5-tests.tap`. This is the checkpoint before the final
  independent UI review fixes described below; final count is appended later.
- Real browser creation5: dirty navigation/save/reload, complete fighter1
  selections, optional story, manual equipment, personal resource correction
  offline, DM privacy and explicit campaign connection. The same sheet is
  used throughout; no automatic placement or initiative.
- Advancement3: fighter1→2, maxHP12→20, currentHP edited4→2 while draft exists
  stays2 on apply; spent Second Wind1, edited biography, inventory and shared
  membership preserved after reload. Partial catalogue acknowledged explicitly.
- Reconstruction3: wizard3 with8/22 HP, temp2, used slots2/1 and HitDie1;
  explicit incomplete-data acknowledgment, no equipment or dice invented;
  reducing second-level slots maximum below usage retains overuse after reload.
- Dice5: point-buy overspend rejected; physical faces required;6/5/2/1→13;
  digital four-face outcome, private audit and reload; dirty role change keeps
  saved draft private; English390px layout without page overflow.
- Regression core 13 and reactions8 passed. Latest reactions run follows the
  canonical unknown-slot defense changes, preserving physical opportunity,
  Shield cost, Escape and resumed path. No page/window errors in new journeys.
- Desktop advancement/review and English mobile screenshots inspected.
  This mobile builder evidence uses a narrow viewport; no new touch exercise
  is claimed. Existing combat touch checks remain in previous increments.

Runnable scripts are in [blueprint-checks](blueprint-checks/README.md).
The reconstruction harness initially used URLSearchParams outside the browser
sandbox and failed; moving URL parsing to page.evaluate fixed the harness.
Two earlier immediate hash-navigation assertions read the previous view;
waiting for destination headings corrected those test races. These are not
product findings. The previous incomplete reconstruction omitted an explicit
manual-equipment confirmation; the journey now makes that choice visibly.

Separate review reports: [domain](blueprint-build-domain-review.md),
[shell](blueprint-character-shell-review.md),
[UI](blueprint-builder-ui-review.md), plus earlier
[integration](blueprint-character-integration-review.md).
Domain R2–R6 and shell findings were corrected and rechecked on recorded dirty
hashes: shared membership, prior and concurrent live edits, historical dice,
feature counters/manual text, spell preparation, visible story and duplicate
grant behavior. Unknown consumed slots stay unknown, not full and castable.
Domain reviewer58/58 and shell reviewer117/117 are independently reported
subsets, not counts to add to the full188.

The final UI review found three additional recoverability cases: changing
Wizard to Fighter left invisible obsolete spell selections; changing background
left incompatible readonly bonuses; invalid physical faces were cleared by
render before validation. All three were corrected by the UI author, independently reproduced on the
new snapshot by blueprint_characters, and verified through the actual browser
by root. Obsolete spells/preparations have an explicit removal command;
incompatible bonuses can be cleared; invalid physical faces survive and
entering only the missing face resolves the pending result once.

Limitations: class names and structural progression do not certify all
features/subclasses/species magic. Missing content and manually resolved
abilities stay visible; partial acknowledgment does not complete the catalogue.
Homebrew revisions, future plans, full spell/feature execution, imports and
shared networking remain separate obligations. No backend security or
synchronization is demonstrated by role selectors and localStorage.

Final increment5 checkpoint: **191/191 Node**, exit0, root run saved externally
as `increment5-final-tests.tap`; `builder-recovery-journey.js` **3/3**, no
page/window errors. Initial harness assumed the optional build-roll ledger
already existed before any accepted result; treating absence as an empty
ledger fixed that test assumption. No product change was needed for it.
The independently reviewed builder source is `0e288337ddb8915edd8669bfa54800d56c18670e27c70b8a0fda0b2ad00b6d7b`.

[Increment5 manifest](blueprint-increment5-manifest.json) identifies 39 files
in the dirty demonstration at this checkpoint. It is neither a Git commit
attestation nor the final app baseline. Later increments change these files
and receive their own reviews; the manifest preserves what was checked.
No P1/P2 remains open in the bounded domain/shell/UI review scopes.

Local document links: 67 Markdown files, no missing targets; I-001–222 and
R001–190 contiguous. Syntax check before the final extra browser script
covered 39 module/journey files; final static pass is recorded below. Task
Observer 25 saved once externally; no installed skill changed. Full product
Goal remains active. Increment6 research and domain/UI work are underway.

## Increment 6 — final bounded verification, 23/09/2026

Library, homebrew copies and explicit revisions are connected to the same
shell, actor state and private character drafts. This checkpoint does not
complete HB's executable activities, class progressions, publication or the
full product contract. Research is `blueprint-homebrew-research.md` (R190),
with documented competitor patterns and the app's merge adaptations separated.

Root final command `node --test --test-reporter=tap design/blueprint/tests/*.test.mjs`
reported **245/245 pass,0 fail**. Complete TAP is external
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-23/increment6-final-tests.tap`.
This includes25 homebrew,20 Library UI and9 new bridge tests in addition to
previous coverage. No backend/security/real multiplayer claim follows.

All six final browser journeys passed sequentially after the fixes, using
Playwright0.1.18 and the existing local server; **15 named groups**:

- Library3: private draft/save, access/enable/use separation, explicit revision
  comparison and update without restoring the2 uses already spent.
- Builder3: contextual creation/return, reload/retry without duplicate choice,
  appropriate type filter that can be disabled for consultation.
- Files2: actual local download, malformed/unsupported input, preview and
  idempotent import; private offline creation versus blocked shared mutation.
- EN/touch3: actual taps, authoring/revision/dirty recovery,390/1440px layout.
- Spell recovery2: domain-generated two-grant fixture, real removal/reload/
  reselect payload; same updated instance/used3, other copy stillused2.
- Import recovery2: real deferred File.text interrupted by another dirty
  editor, plus typed return preserved through import/reload/application/choice.

Every final journey reported no page/window errors. Root inspected refreshed
Library desktop/mobile detail/editor screenshots and the Italian update
comparison; content and commands remain reachable. This is not a screen-reader
review or final aesthetic approval. Evidence filenames, setup and scripts are
in `blueprint-checks/README.md`; raw files remain in the external evidence path.

Independent bounded reviews:

- `blueprint-homebrew-integration-review.md`: two P2 closed. Removed/reselected
  spells retain identity/consumption even with the actual UI's minimal payload;
  sharing a personal character rechecks the destination audience's source access.
- `blueprint-homebrew-domain-review.md`: three P2 closed. New copies/updates
  recheck actor audience and dependencies; reducing access works without a
  capability to expand sharing; restoring a resource preserves or explicitly
  reconciles prior local corrections, unknown uses and recovery behavior.
- `blueprint-library-review.md`: one P1 and one P2 closed. Obsolete asynchronous
  file completion cannot discard unrelated unsaved input; contextual import
  preserves its return destination. Permission management adapter rechecked.

The earlier browser finding preventing comparison of a readable, unenabled
revision was also corrected: comparison opens, Apply remains unavailable.
The tests keep state/authority distinctions rather than auto-enabling content.
Intermediate harness failures (missing Buffer, repeated display names and an
incorrect expectation of an alert instead of a disabled import preview) were
fixed in the scripts; they are not counted as application defects or passes.

Final code hashes are pinned by `blueprint-increment6-manifest.json`. This is
a dirty worktree snapshot, not a reviewed Git candidate SHA, integration or
owner acceptance. Source models/effort remained inherited; no installs,
deployment, spending, production changes or modifications to d20 Folio.

Increment6 final static checks: manifest pins 46 files at the bounded checkpoint;
67 JavaScript modules/scripts pass `node --check`, including 29 retained browser
scripts. Local Markdown links resolve across 80 documents; I-001–223 and
R001–191 are continuous. `git diff --check` is clean. Subsequent increment7
work does not mutate this historical manifest or extend its verification claim.

## Increment 7 — final bounded verification, 23/09/2026

Campaign hub, readable recap, linked world entries, private notes and real
appointments are connected to the same app. I-224/R191 record delegated adoption
and published reference patterns. R192 prepares rests/time without claiming they
are implemented. The complete visual contract remains unfinished and unapproved.

Root full Node run: **304/304 pass, 0 fail**; log saved externally as
`increment7-tests.log`. Six new browser scripts pass **14 named groups**:
Notes3, World2, Sessions2, Sharing3, Mobile2, Integration2. The updated core
journey passes its13 existing regression groups, including physical dice,
shared HP, two-stage Undo, keyboard movement and offline preview. All final
scripts report empty page-error arrays. These counts are checks, not features.

The browser tests include actual dirty departure/Escape/save/reload, private
note non-disclosure, text restoration without changing gameplay, Home → recap
→ place → contextual return → Table, direct appointment/change/cancellation,
optional poll/change/withdraw/explicit confirmation, sharing/history/revocation,
offline private draft recovery and explicit conflict rebase. The conflicting
revision fixture is generated through the domain API, not remote networking.
An isolated revoked-member fixture tests new hub/list/shell/search projections
and retained own notes. A real builder → notes → return and Library → notes →
reload → Library round trip retains the original nested choice destination.

An isolated English touch context at390px in America/New_York verifies actual
taps, repeated-hour selection and missing-hour rejection for Europe/Rome, plus
standalone notes. Timezone labels match their rendered times across a date
boundary. Root inspected desktop notes/campaign/session and mobile note/session
screenshots. No screen-reader or final-aesthetic approval is asserted.

Independent report `blueprint-campaign-review.md` closes R1–R5: historical
section permission/restoration, hidden narrator preservation, timezone labels,
nonmember hub/group disclosure and misleading section-level edit/invite controls.
It records75 targeted and304 full tests, independent probes and exact dirty
hashes. Root browser also exposed collapsed link/section editing and missing
linked-entry return; UI fixes are rechecked. The shell search membership delta
is independently read on app104955119c175d60c2faccf1dfc68ddcf0a8889dcdea43cb78ef658fa8670fb3.

Intermediate harness failures (two matching Close controls, wrong overview H1,
search-input Escape behavior and duplicate dialog acceptance) were corrected;
they are not product findings or passing assertions. Final scripts are retained
in `blueprint-checks`; raw screenshots/logs remain outside the checkout.

`blueprint-increment7-manifest.json` pins this bounded dirty snapshot. No Git
candidate, full product completion or owner acceptance is implied. Remaining
roles/invites, distributed revocation, media, world maps/calendars, richer
collaboration and all other inventoried families remain part of the Goal.

Increment7 static closure: manifest pins54 files;80 module/browser scripts pass
`node --check`; `git diff --check` is clean. Historical manifest is not rewritten
when increment8 changes the app.

## Increment 8 — integrated rests and game time

Root full suite: **375/375 pass** after domain/UI handoff. Four new browser
journeys pass **11 named groups** (shared3, time3, mobile-personal4, reversed1);
core regression13 passes. Each browser journey reports no pageerrors. Source
and linked behavior are synthetic local demonstration, not production services.

- Entry controls on the same sheet/Table, partial party, start/time/completion
  separation, physical/digital dice, pending/reload, invalid value retention,
  accepted result after Undo, Arcane Recovery and first-level slot alias.
- Actual prepared initiative interrupts long rest and grants earned short
  benefits; sleep conditions/concentration, full long recovery and16h boundary.
  Four actual turns advance shared clock once by6seconds; Undo restores it.
- 390px English touch: personal offline time without campaign clock, optional
  quick recovery waits for physical faces and respects total cap, reasoned
  correction, no horizontal dialog overflow, shared denial/private DM exclusion.
- Five actual Undo commands remove the parent rest; known reversed face remains
  accessible after reload without a result-application command. This rechecks R4.

Independent review R1–R4 found and closed: membership revocation at existing
rest operations, actual Trance duration, personal-to-campaign elapsed interval,
and inaccessible orphan dice evidence. Additional probes cover historic private
commit metadata and audit after joining, filtered participation disclosure and
canonical Arcane resource counters. Reports retain scope and file hashes.

Inspected screenshots: `rest-physical-desktop-it.png`,
`rest-interrupted-desktop-it.png`, `rest-mobile-en.png`; all under the dated
external evidence directory. The mobile capture is a scrolled panel, not a
whole-panel fit claim. No screen reader, remote concurrency or full catalog
verification is asserted. Final manifest pins current sources and evidence
records; historical manifests are not rewritten.

Final static closure8:92 JavaScript module/browser scripts parse;92 Markdown
files have valid local targets; I-001–225 and R001–193 are contiguous without
duplicates. `git diff --check` passes. `blueprint-increment8-manifest.json`
records the reviewed dirty snapshot. This is not a self-attested commit SHA.

## Increment 9 — linked forms, companions and familiar casting

23/09/2026, same dirty isolated worktree. Full Goal remains active; this is a
bounded checkpoint, not full product approval. I-226/R193 and
FORMS_COMPANIONS_FLOW preserve provenance and limits. No deployment or new cost.

Final Node suite: **461/461 pass**. New lifecycle tests use actual APIs, store
and Table End Turn handler (DOM primitives adapted), including own versus other
Long Rest, six-second rounds, wrapped removal, Undo/reload and merged/dropped
potion rejection. Real browser evidence uses the root-exclusive named browser:

- `companion-map-journey.js`:2 groups; create manually without a token, real
  text-blur→profile-click, cancel placement, free direct click, same sheet/reload.
- `forms-journey.js`:2 groups; free preview/Escape, canonical use/temp HP,
  effective speed and natural fixed-damage preview, merged weapon unavailable,
  direct movement, live HP correction, return/Undo/reload without refunds.
- `familiar-journey.js`:3 groups; actual start, persistent pending activity,
  DM game-time hour, out-of-range rejection/Escape, slot/incense only on Apply,
  separate later placement and own nonattacking familiar sheet.
- `forms-mobile-journey.js`:3 groups; English390px touch and keyboard, selected
  slot instead of Wild Shape use, placement/dismiss/reappear, cancellation,
  shared offline denial, no horizontal overflow or window/page errors.
- `companion-personal-journey.js`:2 groups; explicit personal-parent fixture,
  then real creation/connection/cancel/reload/DM privacy/free placement. The
  fixture does not assert that a personal-parent creation workflow was tested.
- Related regressions: core13, actual builder creation5 and advancement3
  groups pass. The builder fixture is now Neris, distinct from seeded Mira;
  actor identity comes from the applied draft. A collection navigation check
  waits for the actual heading before asserting privacy.

All above browser runs returned empty page-error arrays. The mobile journey
also records window errors. Screenshots live in the external evidence folder.
Root inspected companion placement, familiar completion and mobile captures;
an independent visual review found no material P1/P2 in those three images,
without inferring offscreen button reachability from a screenshot. Actual touch
Apply and following consequences are proven by the browser journey.

Review records remain distinct:

- Domain review closes D1–D4 (components, personal time in initiative, unknown
  mental data, manual HP/max invariants); later terminal-state/live-access
  changes are rechecked in the profile review.
- Profile review closes F1/F2: multiple acquired spell grants are aggregated,
  and explicit maximum corrections survive same-level revision/removal/return.
  Current spell preparation/book access is checked at use, not cached.
- UI review closes dropped/zero-quantity equipment and old companion context
  leaking into a new appearance selection;23 UI tests and70-test review group.
- Root review closes personal companions lacking their own campaign connection
  and Table reads after membership revocation. Independent handler/store/SSR
  probes verify same actor, private parent, current authority and Undo. The
  reviewer also checked effective projection purity and canonical correction.
- Root pre-review had already closed original-personal dice exposure after
  sharing/Undo/reload and delegated commands after membership removal.

The corresponding reports carry exact hashes and bounded approval; none
self-attests a nonexistent candidate commit. A dirty snapshot is retained in
`blueprint-increment9-manifest.json`. Manifest8 remains unchanged.

Early failures were resolved rather than omitted: the real name-field blur
rebuilt the next clicked control (UI fixed); a screen-coordinate click raced
the map layout (test now waits for stable geometry); assertions now allow
subpixel rounding. Seeded Ritual Adept invalidated three old Library test
assumptions about an empty feature list: tests now select the target instance
and assert unrelated features unchanged. Initial incomplete-author failures
were not reported as final regressions or final passes.

Remaining: full creature catalog, forms beyond this Wild Shape policy, mounted
combat, remote senses/fog, telepathy, touch-spell delivery and special anatomy.
Wolf Pack Tactics and Rat Agile are connected; Wolf Bite's Prone consequence is
explicitly marked not automated in its action preview and is next-block work.
All roles/network/storage are local simulations; no server security, real
multiplayer, final visual style or exhaustive rules engine is claimed.

## Increment 10 — conditions, survival and dice correction

24/09/2026, same dirty isolated worktree. Full Goal remains active; this is a
bounded record of an **open** checkpoint, not full product approval.
I-228/I-229/R194 and `docs/interview/CONDITIONS_FLOW.md` preserve provenance
and limits. No deployment, commit or new cost.

Node suite history, all from `node --test design/blueprint/tests/*.test.mjs`:

- baseline before the increment: 472 tests, 466 pass (6 expected failures in
  `conditions-ui.test.mjs`, module absent);
- dice-correction fix: 482 tests, 476 pass (same 6 expected failures);
- root integration: 544 tests, 543 pass (outdated reactions boundary test);
- UX review run: 561 tests, 560 pass (same reactions test);
- fixes candidate: **621/621 pass** (`increment10-fixes-suite.log`), repeated
  on 24/09 during contract synchronization: **621/621 pass**, with
  `conditions.mjs` `cdf107854eb9`, `conditions-ui.mjs` `ab9f8b0960ab`,
  `conditions-ui.css` `500444cf083b`, `combat.mjs` `7b02f163ccc1`,
  `state.mjs` `24ed3b2c852e` equal to the fixes report.

New or extended test files at that run: `conditions` 29/29,
`conditions-ui` 30/30, `conditions-integration` 20/20,
`increment10-review` 31/31, `combat-evidence` 12/12. The fixes author states
which review cases were seen failing before the fix and which were written
right after reproducing the finding with a Node probe or browser log.

Real browser, `http://127.0.0.1:8879/`, session `d20-conditions-check`, logs
`increment10-fixes-<script>.log` in the dated evidence folder; every run
returned empty page-error arrays:

- `conditions-journey.js` 11/11: two Poisoned origins with one penalty and
  Undo of a single origin; keyboard Exhaustion stepper (−4 d20, −3 m, 9→6 m);
  Escape/Cancel leave state identical; reload; Prone reasons at 1.5 m and
  14.8 m; ranged-in-melee plus Prone shown as a normal roll with both reasons;
  real 1.5 m crawl drag costs 3 m; Stand up 6→1.5 m, action and Dash unchanged.
- `conditions-death-journey.js` 7/7: panel damage to 0 HP without an immediate
  roll; one death save per real turn start in the common queue, physical and
  digital; Medicine 15 makes Livia Stable and spends Mira's action; heal ends
  Unconscious and leaves Prone; natural 1 plus damage at 0 kills Doran on token
  and sheet with Heal disabled; reload.
- `conditions-fixes-journey.js` 7/7: single sheet entry; Temporary HP
  keep/replace; field-level error; Incapacitated potion refusal; return to the
  panel after a death save; Stand up disabled at Speed 0 and `1,5 m / casella`;
  private DM origin absent from the DOM after switching role.
- `conditions-mobile-journey.js` 3/3: 390 px English touch, no overflow.
- `dice-correction-journey.js` 7/7: two Undo keep the attempt; reasoned
  correction 15→20 keeps face 2 across 1d10→2d10 and asks only the missing die;
  history survives reload; digital attack as two commits; identical retry
  reuses faces (`Riusato`) with no free reroll.
- Earlier root journey `conditions-integration-journey.js` 9/9 (knockout,
  crawl preview, Stand up, death-save queue, Undo, 390 px) at the integration
  checkpoint, before the fixes.
- Regressions after the fixes: combat 10/10, core 13/13, reactions 8/8,
  multi-self 6/6, concentration 10/10, rest-time 3/3, rest-shared 3/3.

Review records remain distinct:

- Independent rules review: 1 P1, 4 P2, 12 P3, all P1/P2 reproduced with Node
  tests on the working tree.
- Independent UX review: no P1, 5 P2, 16 P3, with a separate browser session.
- Fixes report (author, not a review): 37 of 38 legible findings fixed; the
  ranged-in-melee finding was only a missing visible reason. Open: P2 on
  `blueprint-checks/forms-journey.js` line 50 and
  `builder-advance-journey.js` lines 25–30, which still use the removed sheet
  HP correction; both, and `builder-journey.js`, were not rerun. The fixes
  report received a truncated findings list and says so.

Not yet done, so the checkpoint is not closed: separate review of the fixes
candidate, the two script updates and reruns, `blueprint-increment10-manifest.json`,
DEVELOPMENT/README/TABLE_ACTIONS alignment, builder characters with an explicit
zero-HP policy, dedicated token badge style. Manifests 8 and 9 stay unchanged.

Remaining: potion administered to an ally, Frightened on ability checks,
pickup spending the object interaction, automatic initiative effects, aid
distance, Grappled drag, damage immunities/resistances, periodic damage,
resurrection, full cause catalog. Roles, network and storage are local
simulations; no server security, real multiplayer, final visual style or
exhaustive rules engine is claimed.
