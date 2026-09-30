# Integrated visual blueprint implementation plan

> Agentic execution: coordinated native implementation with independent bounded workers and a separate review. Owner D-013/I-218 explicitly delegates ordinary choices and authorizes prototype code now; no repeated plan-reading gate.

**Goal:** One locally navigable visual app matching BLUEPRINT_CONTRACT, expanded until all included paths have demonstrated behavior and corresponding Markdown.
**Architecture:** Dependency-free browser ES modules, semantic HTML and shared CSS. One synthetic state across routes, local persistence, explicit reversible mutations and an audit trail. No backend, remote service or production data.
**Tech stack:** HTML, CSS, browser JavaScript modules, Node built-in tests; existing Playwright tooling for browser verification.
**Spec:** docs/interview/BLUEPRINT_CONTRACT.md; NAVIGATION, TABLE_MOVEMENT, TABLE_ACTIONS, INVENTORY_FLOW, CHARACTER_CREATION, preparation page.

## Constraints and visual direction

Preserve full goal; first increment is not completion. Existing interview worktree is isolated; root coordinates all changes. EN/IT labels, English source/comments. No installations, public hosting, copied proprietary assets, final branding or production claims. Use established reference patterns from the retained source tables; verify new uncertain details separately.

Provisional Operate direction: deep blue-grey surfaces for evening laptop play, warm brass for selection and parchment-white text. Georgia serif headings for the fantasy material; system sans for dense operational controls. Geometry on the map is a functional grid, not illustrated artwork. Clear global/local navigation and contextual table tools. Final aesthetic design remains open.

## Files and interfaces

Root owns index.html, app.mjs, state.mjs, ui.mjs, table.mjs, styles.css, tests/state.test.mjs and integration evidence. Worker characters owns characters.mjs, characters.css and its focused tests/evidence. Worker preparation owns preparation.mjs, preparation.css and its focused tests/evidence. No shared edits by workers. All files are under design/blueprint unless stated.

Module contract is in design/blueprint/DEVELOPMENT.md. Workers are not alone and preserve other edits. Each component renders into the shared app shell and mutates the same state through ctx.commit, with no independent app or data store.

## First integrated increment

- [x] Pin meaningful state tests: preview cannot mutate, movement budget respected, consume/undo retains audit, persistence failures surfaced, character/table identity shared.
- [x] Implement shell, routing, local state, dialogs, history and demonstrator controls outside the product view.
- [x] Character collection/sheet/inventory connected to table; item add/edit/equip/consume and corrections.
- [x] Preparation collection and scene edit/import/scale/save/reveal/activate; draft cancellation and role checks.
- [x] Table direct movement with preview/ESC/undo, pan/zoom, active creature, resources, dice example and sheet access.
- [x] Mount in browser and test linked journeys, reload, role restriction, keyboard, EN/IT and laptop/mobile layouts. Capture artifacts only after state assertions and zero-console-error check.
- [x] Separate review of code, interactions and screenshots; repair actual defects. Record demonstrated subset and all outstanding work without treating navigation entries as completion.

## Subsequent increments retaining the full goal

Extend the same artifact with creation/advancement/homebrew, complete combat and reactions, spellcasting, encounter preparation, roles/invites, diary/world/session scheduling, library/assets/import/export, requests/notes/preferences and all remaining capability families in REFERENCE_COVERAGE. Each capability maps to role/state, control/outcome, Markdown/reference and observed test. New market gaps extend the inventory. Owner-dependent Q161 remains separate, never silently included or dropped.

## Review focus

1. Cancel/undo versus consequences: no preview consumption; undo logged and permission-aware.
2. Cross-route identity: no duplicated or reset character/inventory/scene state.
3. Role and private content: DM tools absent for player and mutation checks repeat; simulated authorization is not security evidence.
4. Unsupported geometry/rules: example limitations visible, not a fabricated complete engine.
5. Reload/offline/storage error: unsaved state never falsely described as saved; local simulation not synchronization.

## Completion

The full goal requires the candidate and evidence for every included capability; this increment is only a connected foundation. The owner visits and explicitly approves an identifiable candidate before visual/Markdown baseline freeze. No autoapproval or production promotion.

## First-increment result

The checked items refer only to the bounded increment above. Full goal remains
active; see BLUEPRINT_STATUS for demonstrated behavior and gaps. Verification
and independent review records are in blueprint-verification.md. No production
readiness, candidate SHA approval or baseline freeze is asserted.

## Increment 2 — combat and prepared encounters

Previous Goal turn classification: **progress**. It changed the authoritative
prototype, added shared journeys and generated browser/review evidence. Goal
continues without a new approval gate.

- Root owns combat-ui.mjs/combat.css and integrations in table/app/state,
  browser evidence, shared Markdown and final verification.
- blueprint_characters owns combat.mjs, combat.test.mjs and combat-domain
  evidence; source verification by review_journey in combat-research.md.
- blueprint_encounters owns preparation.mjs/CSS/tests and encounters evidence.
  Workers preserve each other's files and share the existing isolated worktree.
- Research gates executable 2024 rules; source provenance is retained per action.
  UI follows retained TABLE/MAG/NAV source mappings. No new brand decision.
- Build action choice and pure private preview; direct single-target click,
  free cone aiming with explicit cast, multiple selection, no-target actions.
  Persist attempts/roll requests and consume once at rule-specific attempt.
- Physical and digital rolls share natural-face breakdowns; missing responses
  remain pending and reopening cannot duplicate consumption or damage.
- Prepare/place actors and distinct NPCs, initiative input and encounter order;
  save preparation separate from activation/start. Same table/state afterwards.
- Browser checks for changed journeys plus independent review before reporting.
  Reactions, geometry, other capability families remain Goal work, not exclusions.

## Increment 2 result

Bounded combat/prepared-encounter work is integrated and verified: 74 Node
checks, five new browser journeys, two related regressions and separate domain,
audit and layout review. Root temporarily assigned state.mjs/tests ownership
to blueprint_characters for immutable roll evidence; preparation worker handled
its reversed-roll UI. Ownership then returned to root. Review and browser
results are in blueprint-verification.md; full coverage remains BLUEPRINT_STATUS.

Next autonomous block: reactions/interruptions/causal request ordering tied to
the existing actions, followed by remaining movement, preparation and other
capability families. This is progress against the active Goal, not completion.

## Increment 3 — reactions and interrupted movement

Previous Goal turn classification: **progress**. Authoritative prototype,
74 passing checks, browser journeys and synchronized source/contract changed.
The local server was revalidated with HTTP200; it was not restarted.

- Root owns reaction-ui.mjs and common request/table integration, characters
  concentration UI and explicit seed profile, styles, browser and shared docs.
- blueprint_characters owns combat domain/reactions/movement functions and
  focused domain tests; no shared state/UI edits. Domain API agreed before UI.
- blueprint_encounters owns preparation NPC melee profile editing, validation
  and tests; explicit authored source, no ability inference from creature name.
- review_journey verifies immutable 2024 rules and primary interaction sources,
  then reviews consequences/permission boundaries independently.
- Build Shield timing, opportunity before leaving reach, nested requests,
  partial traveled cost, automatic unchanged continuation or post-damage choice,
  concentration requests when explicit active concentration actually requires one.
- Default Ask, no cost on offer/decline/close, physical/digital faces, persistence,
  no auto decline, no network-FIFO for simultaneous effects. All on existing app.
- Browser actual movement/role/requests/undo paths, then bounded independent
  review. Full goal, later reactions/conditions/other pages remain open.

## Increment 3 result

Integrated and verified, not full-Goal completion. 110 Node tests, four new
browser journeys (28 named checks), related combat and EN-touch regressions
(20 checks), separate domain and UI reviews with all bounded P1/P2 findings
closed. Added explicit neutral/allied/hostile NPC disposition after review;
blueprint_characters temporarily owned preparation for that small connector,
then returned ownership. No commit or release approval claimed.

Root inspected refreshed desktop/mobile captures. Source syntax32, local
Markdown links50, identifier continuity and formatting are clean. See
blueprint-verification.md and BLUEPRINT_STATUS. Next block follows NEXT:
movement/approach, geometry and scene/integration detail, then the remaining
product branches. Goal stays active with the full included scope.

## Increment 4 — authored geometry and approach paths

Previous Goal turn: **progress**. Authoritative source and Markdown changed,
110 tests and actual reaction/NPC/mobile journeys passed. Static server now
revalidated HTTP200; no restart. Goal remains the whole visual contract.

- Root owns table path/door UI, combat approach UI and request integration,
  related styles/tests, browser, shared docs. New table-spatial.mjs groups
  door commands and map presentation without rebuilding the state store.
- blueprint_characters owns pure spatial.mjs, movement delegates in state.mjs,
  combat geometry/path/approach domain and corresponding tests/evidence.
- blueprint_module_review owns preparation/spatial-editor UI, draft geometry,
  two-point calibration, validation/save conflicts and tests/evidence.
- review_journey owns primary-source research, then independent review.
  The UI author of the previous increment is an author here, not its reviewer.
- Shared wall segment has independent movement, sight and effect blocking,
  door state/secret/operability and original provenance. Difficult-terrain
  rectangles are authored explicitly; overlapping difficult terrain does not
  multiply repeatedly. Map artwork never generates rules implicitly.
- Waypoints are optional, editable and cancelable; execution uses shown route,
  cumulative terrain cost and existing reactions. Geometry edits invalidate
  a stale accepted preview. Hidden data cannot leak through paths/messages.
- Melee target click preserves I-016: preview approach and attack together,
  no automatic Dash, no silent partial move if the full attack is impossible.
  Digital attack continues under original authority; physical dice are only
  requested on arrival. Interruption/cancellation retains prior travel costs.
- Source reading precedes rule choices. Wall/door controls and alignment use
  Foundry/Owlbear/Roll20 references, with two-point calibration explicitly
  marked as an adaptation. Free Euclidean distance is not mislabeled the
  optional D&D grid counting rule.
- Test pure geometry and causal integration, then real UI drawing/calibration,
  save/cancel/offline, doors, blocked paths, terrain, approach and interrupts;
  obtain separate review and synchronize coverage, preserving remaining scope.

Increment4 checkpoint: geometry/editor/path/door/approach connected. Seven
bounded review/runtime findings closed, 145 tests and actual browser21 new
checks plus reactions8 and EN/touch combat10 pass. Goal remains active. Next
bounded implementation moves to guided character creation/advancement and
usable resulting sheets, preserving outstanding tactical/scene/other families
in BLUEPRINT_STATUS instead of extending only the original Livia sample.

## Increment 5 — guided creation and character advancement

Previous Goal turn: **progress**. Increment4 changed authoritative source,
contracts and verification evidence; 145 tests and live spatial/approach/touch
journeys plus reaction regressions passed. Current server HTTP200 revalidated.
Full product Goal remains active; no scope reduction to the four increments.

Use CRE/ADV as authority, preserving personal use, reconstruction, blank
narrative fields, provisional identity, manual totals, both dice methods and
private saved drafts. A new sheet is not automatically placed on a scene or
added to initiative. Changes apply structurally to the current actor; no
implicit rest, inventory reset, free starting equipment on advancement or
rewind of accepted dice. Every executable definition retains its provenance.

- Root owns app/character entry points, current-sheet/slot presentation,
  character-access, browser journeys and shared documentation.
- blueprint_module_review owns new character-builder.mjs/CSS and UI tests;
  exports render/bind/start, dirty guard and view reset. It coordinates directly
  with the domain author. No shared browser use or existing-file edits.
- character_integration_map independently maps current source seams read-only.
- review_journey owns current primary-source builder/advancement research, then
  a distinct bounded review. Existing full CRE/ADV research remains available.
- Domain author will own new character-build/character-rules modules and pure
  creation/advancement/draft tests. Agree public schema/API before integrating;
  one owner per source file, no shared-browser use by workers.
- Build an integrated step-based, directly navigable flow: identity/sources,
  classes/levels, background/species, ability methods and contribution breakdown,
  skills/features, magic, equipment, optional story, review/apply. Source access,
  requirements and missing automation must remain distinct from manual input.
- Saved drafts survive navigation/reload with private identity; invalid inputs
  cannot create a falsely verified sheet. Reconstruction can preserve unknown
  history explicitly. Advancement previews differences and applies once while
  retaining intervening live resources; conflicting structural edits require
  revised review. Plan and respec remain separate from a live applied level.
- First collect primary-source rule data, implement/test the domain, integrate
  the real UI, then run complete creation-to-sheet-to-preparation journeys and
  advancement/resource-preservation checks, independent review and coverage.
  The level of catalog/rule coverage must be stated honestly and expanded toward
  the complete contract, never inferred from a class name in a selection menu.

Increment5 checkpoint: creation, reconstruction, advancement and live-sheet
preservation are connected. Final191 tests and five browser journeys5+3+5+3+3,
core13/reactions8 pass. Domain/shell/UI reviews closed; three recoverability
findings were corrected and rechecked before manifest5. The whole Goal remains
active and the rule catalogue is explicitly partial.

## Increment 6 — reusable library content and explicit revisions

Next bounded objective: Library → create/copy → saved revision → use on an
existing sheet or character draft → compare revision → explicitly update the
live instance. Keep one integrated artifact; no separate homebrew demo.

- Domain author owns new homebrew.mjs (and a separate pure activity module
  only if justified), domain tests and evidence. UI author owns library.mjs,
  library.css, focused UI tests and evidence. Root owns existing app/state/
  character/build/combat integration and shared documentation. Research then
  independent review remains a distinct agent; all inherit selected settings.
- Definitions have stable content identity and immutable revision IDs. Mutable
  access/collections are outside revision data. Owner-private drafts remain
  separate from usable revisions. Ref everywhere is contentId+revisionId.
- Source describes original authored vs reconstruction and explicit edition,
  reference and rights. Unknown or original source never receives a fake SRD
  citation. Descriptive text never grants inferred executable behavior.
- Copy/duplicate is new identity; revise appends to the existing identity.
  Share, enable in campaign, collect, assign to character and publish are
  different commands and authority. Saving does none of them implicitly.
- Retain existing actor.features/spells/inventory rows, adding homebrewRef,
  baseDefinition and manualOverrides; do not create a parallel actor model.
  Live used/quantity/preparation/equipped are instance data, not definitions.
- Update compares old/new definitions against current live state, preserves
  independent local edits and spends, asks reconciliation for real conflicts
  or removed/non-equivalent resource. It never grants a rest or rewrites
  resolved dice/temporary effect instances. Apply idempotent and revalidated.
- Typed returnTo preserves builder/sheet context across reload and validates
  destination again. A UI-only catalog entry that domain cannot apply is not
  coverage. Start with genuine reusable feature/spell/item integration; other
  types remain correctly named and explicitly manual until their structured
  contracts are connected, without dropping them from the full product.
- JSON export/import uses local user-selected files, preview/validation and
  explicit unsupported dependencies; no claimed compatibility with third-party
  formats. No external publishing service or commercial content imports.
- Verify permissions, drafts, revisions, used counters/overuse, live edits,
  malformed inputs, no duplicate applications, reload and actual linked UI
  journeys. Research/HB retain limits and counter-evidence from competitors.

Increment5 final closure: three UI findings independently rechecked and actual
browser recovery3/3 passed; full191/191 Node. Domain/shell/UI bounded reviews
closed, dirty39file manifest retained. Increment6 authoring is now active
with separate new-file owners; root alone edits existing integration files.


Increment6 verification is in progress. Library is mounted and actual browser
journeys connect private definition → access → exact campaign enablement → live
copy → immutable revision → explicit update with spent uses retained, plus the
round trip from a private character draft. Root integration review corrected
spell removal/reselection identity/consumption and campaign joining after source
revocation; the recheck includes real UI selection payload after JSON reload.
Independent domain/UI review and remaining browser file/layout checks continue.
Next-family research for campaign/journal/world/session paths runs independently;
it does not change these authors' reserved source files or close this checkpoint.

## Increment 6 result and increment 7 — campaign continuity

Increment6 is a verified bounded checkpoint:245 Node tests, six browser
journeys/15 named groups, separate domain/integration/UI reviews. The immutable
manifest retains the exact source. The whole Goal remains active and incomplete.

Next objective: one connected Campaign hub → readable previous recap → linked
world entries → Table → new recap → next real appointment. Notes remain an
independent service available without a campaign. Preserve all other outstanding
families; this is sequencing, not an MVP exclusion. Use R191 and the campaign
research report, existing campaign page, NAV-09 and I-044–051/094/099/100/117.

- Root owns shell/routes/Home/search/notes-entry integration, state migration,
  browser, shared documentation and the final snapshot. No new app/store.
- `review_journey` owns new `campaign-content.mjs`, `campaign-sessions.mjs`
  only if a separate file makes the state responsibilities clearer, their
  domain tests and `blueprint-campaign-domain.md`. It is an author for7, not
  its independent reviewer. Agree schemas/API with root/UI before consumers.
- `blueprint_module_review` owns new `campaign.mjs`/CSS, UI handler tests and
  `blueprint-campaign-ui.md`. Preserve shared modules and test browser exclusivity.
- `blueprint_characters` reviews the new domain/UI/consumer work independently
  after stable handoffs; it did not author these new modules.
- Private saved drafts precede publication; revision conflicts preserve local
  input. Restoring text creates a new revision, never a global gameplay undo.
  Permissions are projected before lists/snippets/links/search/counts/history.
  Owner, reader, editor and invite delegation are distinct; no universal DM
  authority over personal notes or other private authored content.
- Journal recap, person/place/faction/quest entries share applicable editing
  behavior but retain meaningful types and links. Optional title/date/details,
  clear audience preview, actual empty/error/no-access states. No fabricated
  automatic recap and no quest reward triggered by narrative status alone.
- Real sessions support a directly agreed date and optional availability poll,
  personal response/withdrawal, explicit organizer confirmation/change/cancel.
  Persist instants and display timezone; do not let a silent clock/DST coercion
  choose a different appointment. Real dates, world dates and rests are separate.
  No external calendar, reminder delivery, Discord voice/music or new service.
- Legacy notes/journal/session data are migrated once through a documented
  adapter into the authoritative model, preserving ownership and old visible
  synthetic content. Do not maintain parallel old/new text stores.
- The current two-identity demo must not be called a complete roles system.
  Domain tests cover distinct authored roles; integration may extend the demo
  only with consistent identity projection across the app, not an impersonation
  switch that reveals private sheets or other services.
- Run meaningful domain tests first, actual handler recovery, then linked
  browser journeys (research checklist1–12 as applicable), independent review
  and synchronized coverage. Explicitly track remaining administration, invites,
  maps/calendar of the world, media and real-time collaboration.


## Increment 8 — rests, visible recovery and narrative time

Increment7 is verified (304 tests, six browser journeys/14 groups, core13,
independent review closed). Goal remains active and broader than this increment.
Use R192, I-085–092 and immutable SRD5.2.1 provenance. Do not copy videogame
recovery rules, food requirements or short-rest caps into the2024 baseline.

Ownership: review_journey owns new rest-time.mjs, its domain tests and API/report;
blueprint_module_review owns new rest-ui.mjs/CSS and handler tests/report after
finishing its two campaign Markdown files. Root owns app/state/characters/table/
combat integration, canonical resource metadata, browser and shared documents.
blueprint_characters reviews independently; root exclusively drives d20-blueprint.
No author reverts concurrent changes or writes another owner's reserved files.

- One state.restTime domain with campaign-relative seconds, per-participant rest
  records, persistent Hit Die attempts and explicit events. Keep actor resources
  canonical. No second store, wall-clock timer or generic calendar engine.
- Sheet/Table contextual entry, individual or partial-party rest; start does not
  heal. Participation/control is explicit, no controller operates private actors.
  The DM advances shared time once. Standalone actors can record a completed
  rest with explicit elapsed duration without changing an absent campaign clock.
- Preview/apply, interruption/resume, short/long completion and corrected result
  use stable commands and revalidate pertinent resources/authority. Unrelated
  writing does not invalidate a rest preview. Pending causal dice/decisions stay
  unresolved; unrelated actors can continue. Sleep is an explicit activity.
- Source-based recovery for current/max HP, Hit Dice, ordinary and Pact slots,
  Second Wind, Action Surge and separately selected Arcane Recovery; preserve
  unknown consumption and inactive resource identity. No automation inferred
  from localized name or homebrew prose. Unknown cases remain explicit obligations.
- Physical Hit Die spends once at confirmed attempt, remains pending through
  close/reload, resolves once with face+CON/minimum/effective-healing breakdown.
  Digital uses the same resolution. Optional quick recovery preserves chosen
  die order, personal cap and acquired stopping rule; physical never invents faces.
- Normal global Undo remains atomic for game resources, clock and rest records.
  Do not clear older history or silently introduce an undo barrier. Root extends
  accepted dice preservation: a restored pending attempt keeps its known face
  and can only reapply that outcome; a removed attempt retains historical evidence
  marked reversed. Narrative/ACL and real scheduling remain independent of Undo.
  Explicit result corrections operate on current deltas with a recorded reason.
- Time-based effects require exact metadata; never equate a next-turn expiration
  with elapsed six seconds. Combat interruption/round adapters are explicit and
  must respect specific source timing. An event described in text alone does not
  interrupt a rest or resolve a choice. Date appointments remain untouched.
- Test meaningful boundaries first: partial group,0HP,16h eligibility, long
  interruptions before/after1h, Trance4h, full2024HD, unknown/partial recovery,
  physical pending/reload/retry, rapid cap, stale preview, offline/authority,
  accepted dice after Undo. Browser actual linked journeys in IT/EN/touch plus
  separate review. No completion claim until these are observed.

API/schema handoff is `blueprint-rest-api.md`; update it before consumer changes.
Future catalog completeness, complex activities, downtime/calendar/events and
all other inventoried families remain included. This stage does not freeze the
contract or request a routine owner vote.

## Increment 9 — forms and linked creatures in the same app

Increment8 is closed with375 tests, four browser journeys/11 groups, core13,
independent R1–R4 closure and manifest8. Continue the active Goal under I-218;
no new owner approval or model change. Research R193 and acquired I-040/041,
I-110/111 govern this bounded slice; all remaining policies stay in coverage.

Objective: Extras → persistent linked creature → later free map placement →
same creature sheet/Table/control, and sourced Wild Shape → known form/preview →
apply → actual play → ordinary return without healing or undoing lived events.
Include an ordinary familiar lifecycle and Wild Companion's shared resource;
distinguish the spell's long casting/material cost from a manual recording.
No transformation engine is declared complete from the Wild Shape example.

- Reuse canonical actors, resources, turn order, tokens, campaign clock, dice,
  commit/Undo and contextual dialogs. No parallel store or generic rule language.
- Freeze a small domain API before UI coding. `review_journey` owns new
  `forms-companions.mjs`, its tests, `blueprint-forms-api.md` and domain report.
  `blueprint_module_review` owns `forms-ui.mjs`, CSS/tests and UI report, starting
  from its isolated Markdown plan. Root owns app/state/characters/table/combat/
  preparation/character-access/build/rest-profile seams and browser/shared docs.
  `blueprint_characters` performs independent review; no author undoes another's
  edits. All work remains in interview-01, not a second checkout or production.
- Referenced profiles have explicit SRD revision and EN/IT source. A deliberately
  small verified catalog is a sample, not the entire creature library. Manual
  records remain usable and visibly distinguished from automated source rules.
- A form modifies one actor's effective stats; it does not create another turn or
  replace HP, Hit Dice, spell slots, notes and event history with a beast snapshot.
  Ordinary return restores only form-owned substitutions and keeps lived damage,
  resources, conditions and concentration. A source-specific end is not Undo.
- Wild Shape uses druid level, known-form eligibility, bonus action/counter,
  sourced duration and explicit temporary-HP choice. Equipment drop/merge/wear is
  individual; no silent stack of temp HP or invented2014 beast HP pool. Model
  pending consequences and spell restrictions honestly; never silently reroll.
- A companion has its own actor identity and lifecycle, linked to its source
  character. Creation does not require a token. Placement is a direct map gesture
  performed later without paying twice. Two instances never share live HP merely
  because they share a definition. Removing from initiative is not deleting it.
- Familiar: own initiative/reaction, no attacks; ordinary casting duration and
  material consumption recorded; one familiar, changed form instead of duplicate.
  Temporary dismissal/return differ from destruction and new casting. Wild
  Companion spends exactly the selected slot or Wild Shape use and expires on
  its summoner's long rest. Sense-sharing does not grant hidden-map authority.
- Extend explicit companion control without exposing ordinary hidden NPCs or
  private parent records. Selection, ownership, delegated control and visibility
  are distinct. Revalidate current authority and private origin at application,
  including join/revoke; preserve current owner when adding another controller.
- Test derived values, source/cost and duration, no-mutation previews, consumed
  resource across return, temp HP overflow, concentration/pending dice, individual
  instances, own turn, direct placement, dismissal/destruction, controller change,
  offline/privacy, keyboard/touch EN/IT, save/reload/Undo and existing regressions.
  Root alone drives the shared browser. Review actual hashes before closure.

Polymorph needs its own caster/target/save/concentration/temp-HP policy and
mounted combat its own actions/initiative proof; intangible2024 summons are not
NPC packs. These, other companions, sense/fog geometry, catalog completion and
stacked effects remain required follow-on work, never an exclusion by omission.


## Increment 9 result

Integrated bounded checkpoint:461 Node tests; five new browser journeys/12
named groups, core13, builder5 and advancement3; separate domain/profile/UI/root
reviews and visual review closed in their scopes. Original private history,
current membership, explicit companion connection, effective stats and clock
turn boundaries are preserved. Manifest9 pins the dirty snapshot; not a commit
or a full-product approval. All remaining forms/companions obligations remain.

Next independent research: conditions and survival, including Prone/standing/
crawling and0HP/death saves/stabilization/healing. Existing sources/contracts
first, immutable2024 rules before a new API. No second app, store or dice queue.


## Increment 10 — conditions and survival

Previous Goal turn: progress. Checkpoint9 is verified and frozen in manifest9;
this extends the same app under I-180/I-181/I-218, without another permission
gate or any change to model/effort. Research is blueprint-conditions-research.md.

### Objective and boundary

One linked path: apply/view conditions → crawl or stand → suffer damage at0HP
→ due physical/digital death save → stabilize/recover/heal → correct/Undo.
The sheet and Table present the same creature, its current state, provenance,
duration and available controls. No new main navigation page or separate app.
The full15-condition catalog is accessible with a truthful automation status;
unknown sight, immunity, anatomy or source-specific behavior is never fabricated.

### Ownership and approach

- review_journey owns new conditions.mjs, focused tests, API and domain report.
  Propose the API before implementation, receiving root acceptance first. Domain
  includes condition instances/projection, vitality commands and pure roll
  descriptors/outcomes; no private dice queue or second resource store.
- blueprint_module_review owns new conditions-ui.mjs/CSS/tests and UI plan,
  after its read-only seams report. UI consumes domain projections and existing
  shell callbacks; it does not duplicate formulas or directly mutate actors.
- Root owns adapters in existing modules, shared roll requests/results, movement,
  app/sheet/Table/rest/forms integration, relevant regression tests, browser and
  shared docs. Existing sources are not edited by the new-module authors.
- blueprint_characters reviews domain and UI independently after research.
  Another writer may review root adapters, never its own UI source. Workers are
  not alone: preserve all other changes and coordinate file ownership.

Prefer the existing actor.conditions collection and canonical exhaustion field
over parallel truth. A definition and its applications are different: two
Poisoned origins impose one condition, and ending one does not erase the other.
Legacy string/object values remain readable; missing provenance is unknown.
Expired instances/history and current effective state remain distinguishable.
Unconscious ends Concentration, supplies incapacity/immobility and causes Prone;
waking removes only its own source and leaves Prone. Rest sleep already uses
restId: do not flatten it into one global toggle. Unknown held items require
explicit reconciliation, not dropping worn armor by guessing.

### Commands and presentation

- Source/term-aware condition manager from near HP and contextual Table/token
  controls, with compact authorized status. Apply/remove/reasoned correction
  have preview, current authority and atomic consequences. Custom labels have
  no inferred rules. Per-instance hidden source detail never leaks via badges.
- Terms: manual, narrative-clock expiry, specific source/target turn boundary,
  pertinent rest or linked Concentration. Use explicit event identity and next
  occurrence semantics; closing combat never invents a completed duration.
- Stand spends half effective Speed, not half remaining movement, and no action.
  Canonical rule rounding uses feet with D&D conversion1ft=0.3m; the current
  metric store is retained. Convert for this rounding only:30ft→15ft→4.5m;
 25ft→12ft→3.6m. Round numerical noise before flooring, not actual fractions.
  No hidden Dash, no stand atSpeed0. Crawling adds1 distance unit to normal
  terrain and2 to difficult terrain:2×/3×, not multiplying to4×.
- Apply supported condition effects through one projection: Incapacitated and
  Stunned2024 do not alone zero Speed. Prone attack modifiers use actual1.5m
  distance. Unconscious/Paralyzed automatic STR/DEX save failure has no fake
  die, and proximity critical still needs a hit. Wolf Bite now applies its
  sourced Prone consequence at a hit on an eligible target.
- Explicit0HP policy: death saves for characters, normal monster death, specific
  familiar disappearance or a declared manual exception. Control/appearance as
  an NPC is not the policy. No deleting actor/token or ending encounter merely
  because an actor is dying/dead. DM/owner correction remains possible.
- Damage, healing and correction are distinct.0HP transition precedes irrelevant
  concentration requests. Massive damage, damage already at0, tempHP absorption,
  stable state and ordinary healing respect the source; normal healing cannot
  resurrect. Correction records what was corrected, not invented damage/dice.
- Death save requests live in the existing combat attempt/request/results path,
  tied to an actual turn-start or an explicit outside-initiative request. Natural
 1/20, DC10, sourced modifiers and3 successes/failures are distinct. Closing,
  reload and Undo preserve accepted faces and original audience. If healing
  makes a pending request unnecessary, close it without inventing a result.
- Stabilizing uses the acting creature's Help action and MedicineDC10; target
  remains0HP/unconscious. Stabilized recovery1d4 hours uses that same result
  surface and the narrative clock. Two requests to the same controller remain
  distinct, without replacing an already-open input or silently resolving it.
- Knockout2024 is an explicit melee choice:1HP and its own Unconscious/short
  rest cause. Healing, successful appropriate first aid or completion of that
  rest ends only that cause. Never reuse stable0 behavior. Show resource and
  target consequences before executing, while retaining direct attack grammar.

### Verification

TDD on meaningful domain and cross-module invariants from researchT01–T16.
Replace the old deliberate no-policy-at0 boundary with the explicit policy,
not an unexplained changed assertion. Browser: same sheet/Table, physical pending
input and digital results, sources/durations, crawl/stand, death/stability/cure,
Undo/reload, roles/hidden origins, EN/IT and touch/keyboard/offline. Independently
review actual hashes, correct material issues, then checkpoint and document all
remaining scope. Full perception, grappling mechanics, every immunity/source,
resurrection spell and periodic effect remain obligations, not complete from
a condition toggle.
