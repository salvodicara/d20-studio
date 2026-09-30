# Prototype module contract

All modules are local ES modules. No new dependencies. Root owns shared state/shell. All visible strings use ctx.t(Italian, English). Escape dynamic HTML through ctx.esc(value). HTML in trusted render templates only; user data never raw HTML.

Module exports: `renderCharacters(ctx)` and `bindCharacters(root, ctx)` in characters.mjs; `renderPreparation(ctx)` and `bindPreparation(root, ctx)` in preparation.mjs. Root passes #content as root; handlers attach only under it, which is replaced each render. Own styles live in matching CSS file imported by index.html.

`ctx.state` is current mutable state (read only outside commit); `ctx.view` is {page, id, tab}; `ctx.role` is 'player' or 'dm'; `ctx.lang` is 'it' or 'en'. `ctx.t(it,en)` returns locale text; `ctx.label(value)` handles {it,en} or string; `ctx.esc`, `ctx.icon(name)`. `ctx.navigate(page, {id,tab})`, `ctx.render()`, `ctx.toast(text, isError=false)`.

`ctx.commit(label, mutator, options = {})` clones state, invokes synchronous `mutator(draft)`, records prior state for undo and audit label, persists local state, renders. Throw Error for invalid operation; framework shows message and no mutation. `ctx.undo()` restores last permitted local mutation and adds correction record. `ctx.canControl(actor)` uses character-access: a private actor is only visible/controllable by its owner; a campaign actor can be controlled by the DM or its owner. `ctx.dialog(title, bodyHTML, {submitLabel, onSubmit(formData, form), cancelLabel})` opens a native form dialog; callback onSubmit returns false to keep open (validation) or otherwise closes, may commit. Native Cancel/ESC discards drafts. Body may include fields/details; submit omitted for read-only dialogs. `ctx.closeDialog()` available. `ctx.openSheet(id, tab)` navigates characters detail; return-to-table maintained by shell.

State shape (version 1):

- actors: object keyed 'livia', 'doran', 'goblin-1', 'goblin-2'. Each {id,kind:'character'|'npc',name,className:{it,en},level,owner:'player'|'dm',hp,maxHp,ac,speed,action,bonus,reaction,movement,abilities:{str,dex,con,int,wis,cha},slots:{used,max},inventory:[{id,name:{it,en}|string,quantity,weight,equipped,description:{it,en}|string,kind:'weapon'|'consumable'|'gear',healing?:number}],notes:string}.
- campaign: {id:'lanterns', name:'Le lanterne di Bruma', summary:string, journal:[], sessions:[]}
- scenes: [{id,name,description,gridSize:50,metersPerCell:1.5,width:1000,height:650,background:null|string,revealed:false,tokens:[{id,actorId,x,y}],walls:[]}]. Background can be data URL from image local upload; max file limit and readable error required. Default scene id 'old-watch'; no retired map reused. Optional new scene fields okay if renderer handles defaults.
- activeSceneId:'old-watch', combat:{active:false,round:1,turn:0,order:['livia','goblin-1','doran','goblin-2']}, log:[], notes:[], library:[]
- UI preferences/demo role/language and route are not part of shared persisted simulation data.

Use existing shared classes: page-heading, page-heading h1, muted, button (.primary/.quiet/.danger), toolbar, tabs, active, split-layout, panel, field, form-grid, empty-state, item-list, item-row, badge, stats, stat, section-heading, error, table-wrap. All controls minimum 40px and visible focus. No fake disabled placeholder features counted as complete. Display local in-construction limits honestly; keep them outside normal product controls when possible.

English source/comments; Italian default/English alternate. No external assets/SDK, no new applications, no production promises. Workers preserve others' edits and write evidence to their own changes/interview-01/blueprint-<area>-evidence.md.

## Integrated API additions

`commit` returns `{applied:true,persisted:boolean}`. `ctx.storageError` is a
getter; an applied memory-only change must not be repeated as a new mutation.
`{local:true}` records a private change for the current identity and is allowed
in simulated offline mode. Shared writes and shared undo are blocked offline.
Private future plans are `actor.personalPlans[ctx.role]`; control permission
is not authority to read another identity's private fields.

`ctx.openNotes()` opens the common private-notes service. Preparation exports
`renderSceneBase`, `hasPreparationDraft`, `confirmPreparationNavigation` and
`resetPreparationDraft`; shell protects global and browser-history departure.
Table uses the same scene base, grid visibility/offsets and snap option.
Scene optional fields and module behavior are listed in the preparation evidence.
Dialog callbacks may open another dialog; the shell closes only the original
form after submit. Returning false keeps the current form open.

## Combat and encounter additions — increment 2

`combat.mjs` owns pure previews, accepted attempts and rule-specific resolution;
`combat-ui.mjs` binds the shared table, dialog and request service. API, source
revision and example limitations are in `changes/interview-01/blueprint-combat-domain.md`.
No rule is inferred from an arbitrary editable class name. `request.dice.count`
already includes advantage/disadvantage or critical dice; UI must not double it.

`ctx.startEncounter(sceneId)` opens preparation if rolls are incomplete, or
shows the saved explicit roster before activation/start. Preparation saves
staged actors/tokens/initiative without automatically activating or starting.
`getPreparedEncounter` validates readiness; `startPreparedEncounter` preserves
order and refreshes only the first creature at its own turn start.

`ctx.commit(...,{visibility:'private'})` is still a shared mutation requiring
online authority; it only hides its audit label. This differs from `{local:true}`.
Commit entries/history have stable `id` and `rolls[]` with newly accepted
initiative/combat evidence. Corrections have `revertsId`; accepted dice remain
in the immutable log across snapshot undo and reload. Initiative ledger entries
also survive with `status:'reversed'` and reversal metadata; saving a stale
reversed roll requires a new explicit result. The undo stack itself remains
session-local. Old removed dice cannot be reconstructed from historical labels.

Render only permitted projections and permitted roll evidence. Never recover
hidden names from the raw actor registry merely because a pending request is
visible. Shared audit labels must not reveal a hidden source. Record each
resolved request's physical/digital mode; do not infer another actor's save
mode from the caster's preference. No backend security is implied by these
local visibility checks.

## Reactions and interrupted movement — increment 3

`reaction-ui.mjs` renders authorized persistent offers and movement decisions.
`combat.mjs` exports `beginMovement`, `projectMovements`, `resumeMovement`,
`changeMovement`, `setReactionOrder`, `projectReactions`, `resolveReaction`,
`refreshConsequences`, `hasBlockingConsequences`, `resolveAutomaticRolls`.
`hasBlockingConsequences` defaults to the current actor; ending the whole
encounter checks every actor. See reactions-domain evidence for each shape.

An automatic roll continuation only resolves attack/damage requests of an
already accepted digital attempt using its original `acceptedBy`; it never
answers a reaction or rolls concentration/saves. Invoke within the atomic
command that unlocks the request. Character mutations reconcile consequences;
replacing/ending concentration removes only effects linked to the previous
instance. Missing defensive data stays pending and requests an explicit fix.

Preparation `npcTeam` records party/neutral/watch, independent of ownership.
The demonstration only considers party and watch opposed; unknown/neutral
is not inferred hostile. Custom melee profile source is authored-demo with
its own immutable revision. Prototype path geometry remains flat/straight.

## Guided characters — increment 5

`character-builder.mjs` exports start/render/bind, dirty navigation confirmation,
view reset and dirty predicate. The shell mounts route `builder?id=<draft-id>`;
optional `tab` opens a section. The selected section persists in the draft.
Working form data is private and separate from committed draft data. App exit,
Back/hash, role change and beforeunload protect unsaved edits. Role reset never
makes another identity's private draft visible.

`character-build.mjs` owns drafts, previews, application and build rolls;
`character-rules.mjs` owns the explicit catalog and rule provenance. The
presence of a class name does not certify its complete progression or automate
its features. Rule-specific choices and unsupported commands stay distinct.
No source selection bypasses ownership or grants a commercial-content license.

Drafts are `state.characterDrafts[]`, owner-scoped, with kind, section, revision,
status active/applied/discarded, data, roll references and structural baseline.
A saved draft is not a created actor or applied level. Private draft commits
use local/private metadata; applying a campaign character is a shared mutation.
`characterBuildRolls[]` retains accepted physical/digital faces append-only;
undo marks the reverted result and retains evidence in the private audit.
There is no backend sync, identity authentication or distributed undo here.

New actors have explicit `visibility` and `campaignIds`. Campaign connection
is a separate command from creation, token placement and initiative inclusion.
Legacy sample actors without `campaignIds` keep their original membership.
`character-access.mjs` centralizes visible/controllable/membership projections.
Personal-sheet mutations inherit local/private metadata; explicit connection
is a shared mutation with a disclosure before applying.

Canonical spell resources are `spellSlots[level]`; `slots` is legacy level1
fallback. The sheet setter maintains both when correcting level1. JSON reload
breaks shared references, so readers prefer the canonical pool. Pact Magic is
separate `pactSlots:{level,max,used,source}`. Spent uses above a reduced maximum
remain recorded; available is zero, never negative and never implicitly reset.

## Library and content consumers — increment 6

The shell mounts `library` with explicit `id`, `revision`, `tab` and serialized
`returnTo`; navigation, browser Back, role switches and beforeunload protect
unsaved Library form data. `homebrew.mjs` owns immutable definitions, private
drafts, exact revision access, campaign enablement and actor-copy reconciliation.
Its API/schema and evidence are in the homebrew domain report; it imports no UI.
`library.mjs` owns collection/detail/editor/compare/file controls in the same shell.

`homebrew-integration.mjs` validates typed returns to a private builder draft or
controlled actor section. A contextual selection cannot insert an inventory
item into spell choices. Returning from Library to a builder saves only its
private draft; the deterministic choice identity prevents repeated insertion.
Applying that builder rechecks any new source/dependency access. The exact
already-acquired live snapshot can remain if the source is no longer available;
that does not permit new acquisition, reading newer content or an update.

`ctx.applyLibraryDraft(draftId, reviewKey)` applies one assignment/update and
synchronizes a build-managed row's builder source in the same atomic command.
Updating a spell received from one granting feature preserves other copies from
other grants. Existing and removed/reselected homebrew spell identities retain
consumption through `spellUsageLedger`, including after a JSON reload. Restoring
a selection is not a rest. Source definitions do not contain live use counts.

Connecting a personal actor to the campaign checks source/dependency access for
the actual demo audience before changing visibility. Existing source enablement
alone is insufficient after access revocation. Shared writes remain blocked in
the offline simulation; private authoring drafts and content can be saved locally.
These local identities/projections are not backend authentication or distributed
revocation. The broader revocation policy remains product work.

Create/copy/revise preserve named homebrew types. Only current feature, spell
and inventory consumers are connected; classes/progressions and executable
activities are still incomplete. Manual text never becomes a combat action by
inference. File transfer uses this app's format-1 JSON, not an asserted importer
for any competitor. Export includes permitted definitions/dependencies only.

## Campaign continuity — increment 7

`campaign-content.mjs` owns authored entries, owner-scoped drafts, append-only
text revisions, access projection and the one-time legacy adapter.
`campaign-sessions.mjs` owns real appointments, availability polls and IANA
local-time resolution. `campaign.mjs` renders both inside the existing shell.
Personal notes use route `notes`, including when no campaign is accessible.
Typed returns preserve builder sections and nested Library selection context.

Narrative commands use `undoable:false`. Text restoration appends a revision;
sharing uses its own access revision. Global gameplay Undo preserves current
campaignContent, sessions, polls, sessionDrafts and membership. It cannot restore
an old permission or erase writing performed after the game action being undone.
Legacy malformed data is rejected before partial migration; storage recovery
preserves the original serialized value. Unknown author/date stay unknown.

Only projected readable entries feed lists, search, links, history and previews.
A DM has no universal access to private notes. Editors preserve hidden sections;
section audience controls visibility, while editing is inherited from the entry.
Sharing now does not reveal earlier private revisions. Historical section access
requires both the historical and current audience. Restoring text retains current
access. Participant preview is the caller/recipient intersection, not impersonation.

Sessions store an explicit instant plus its original IANA zone. Render the same
zone named by the primary local-time label and separately show the agreed time.
Reject missing local times; repeated times require explicit instant selection.
No answer is distinct from No. Poll consensus never confirms an appointment:
the organizer confirms, changes or cancels explicitly. Cancellation retains the
record and answers. Scheduling changes no game time, rest, HP or narrative text.

This is a local two-identity demonstration. Cross-tab concurrency is simulated
with domain-generated stale revisions; there is no remote collaboration, calendar
sync or notification delivery. Membership gating of the campaign hub and new
shell consumers does not certify complete authorization in every older module.

## Rest and game-time integration (increment 8)

`rest-time.mjs` owns `state.restTime`: campaign-relative clocks, participant
records, persistent Hit Die attempts and stable events. `rest-profile.mjs`
projects verified builder choices into recovery metadata. Actor resources remain
canonical; first-level `slots` and `spellSlots[1]` are synchronized after JSON.
Arcane Recovery binds to the actual verified feature counter where available;
unknown and removed resource usage is not silently reset.

`rest-ui.mjs` uses the common dialog through `ctx.openRest(actorId?)` and
`ctx.openGameTime()`. Sheet/Table entry controls open the same state. `render`
refreshes an open rest panel; role/example reset clears its transient inputs.
Start, time advance and completion each have a reviewable consequence. Closing
or Escape preserves recorded rests and pending rolls. No real-time timer runs.

Combat/preparation/state adapters report only actual authorized events to
`observeRestEvent`: initiative, damage, leveled spell or activity. Movement
closes a recovery window without inventing an hour of exertion. A wrapped round
calls `advanceRoundTime` once for six seconds. Previews never trigger these seams.
Digital dice are generated inside the committed attempt, not during rendering.

Normal Undo restores gameplay atomically while accepted Hit Die faces remain
immutable. Removed attempts become reversed evidence, still visible through the
rest panel after the rest is removed. Narrative records retain their established
Undo independence. A personal roll retains private provenance even if its actor
joins a campaign before resolution. Shared authority is revalidated after
membership changes; local actor ownership is not campaign membership.

See the [API](../../changes/interview-01/blueprint-rest-api.md),
[contract](../../docs/interview/REST_TIME_FLOW.md) and independent review for
precise rules and limitations. There is no complete effect/calendar engine,
distributed security, or inferred recovery from arbitrary prose.

## Forms and companions integration (increment 9)

`forms-companions.mjs` owns sourced profiles, pure effective-actor projection,
known forms, lifecycle commands, long-casting records and domain observations.
`forms-profile.mjs` binds structured character choices to the existing feature
pool and rest metadata. It does not create another resource balance. Explicit
corrections and spent uses survive rebuilding; familiar access is derived from
current acquired grants, preparation and the readable spellbook, not stale flags.

`forms-ui.mjs` opens the shared dialog from Extras/Table. `companion-map.mjs`
temporarily owns map pointer/keyboard input for appearance or later placement.
Both revalidate geometry. Appearance records the spell constraint, while placing
an existing actor adds only a token; neither implies joining initiative.
Connecting a personal companion is explicit from its own sheet, uses the same
source-availability checks, and does not share its parent or siblings.

Never assign `getEffectiveActor` back to state. Sheet, collection, actions,
defenses, movement and concentration consume its values; commands mutate the
canonical actor. Track movement spent and Dash count separately from remaining
movement, preserving the actual cost across speed changes. Temporary HP absorb
damage without erasing the damage's concentration consequences. Fixed natural
damage does not invent dice or double its value on a critical hit.

Store/combat/rest/Table report actual status, damage, concentration, time and
turn events. Removing the current companion advances the next actual turn once;
a wrapped round advances six seconds once. Undo restores the connected event,
while previously accepted dice retain their historical audience and faces.
No personal-time command may skip initiative actions.

See [API](../../changes/interview-01/blueprint-forms-api.md),
[contract](../../docs/interview/FORMS_COMPANIONS_FLOW.md) and separate domain,
profile, UI, root and visual reports. Three profiles and local two-role state
are a sample, not a complete creature catalog, effect engine or backend ACL.

## Increment 10 — conditions and survival

`conditions.mjs` owns the 15 SRD 5.2.1 conditions, instances with several origins
and terms, vital state (0 HP policy, death saves, Stable, Dead, knockout), pure
previews and the event ledger. `conditions-ui.mjs` renders the one panel, opened
by `ctx.openConditions(actorId, tab)` from the sheet HP card and the Table
inspector summary. Vital rolls use the existing Requests queue;
`ctx.openConditionRoll(id, {returnTo})` returns to the panel. `ctx.undoLabel()`
names the change Undo reverts. Contract: [CONDITIONS_FLOW](../../docs/interview/CONDITIONS_FLOW.md);
signatures: [API](../../changes/interview-01/blueprint-conditions-api.md) and
[seams](../../changes/interview-01/blueprint-conditions-seams.md).

- Every HP change is a vitality event. Commands preview first
  (`previewVitalityChange`, `previewConditionChange`); trusted adapters that
  already authorized the fact (combat damage, healing, rest) call
  `applyVitalityEvent(s, event)` with a stable `eventId`. Hit Die healing
  (`resolveHitDie`) and long-rest HP recovery use it too (`healing`), so they end
  a knockout, keep Prone and are logged. Never write `actor.hp` elsewhere:
  `patchCharacter` stops at 1 HP; the rest correction refuses 0 HP, leaving 0 HP
  and Exhaustion; Correct HP and status refuses a fall to 0 HP (see below).
- Conditions change only through `applyConditionEvent` (trusted `exhaustion`
  event included; `temp-hp` is a vitality event). Sleep is Unconscious with a
  sleep cause and `restId`; waking ends it with `{kind:"end", restId}` and Prone
  remains.
- The 0 HP policy is explicit per creature in `actor.vitalityPolicy.zeroHp`
  (`death-saves`, `death`, `disappear`, `manual`), never inferred from an NPC's
  look. Builder characters receive `characterZeroHpPolicy()` (`character-rules.mjs`,
  `death-saves`, SRD EN 17–18 / IT 19–20) on creation; advancement sets it only
  if missing, so a DM correction survives. No policy means a visible 0 HP
  reconciliation, not an invented outcome.
- Turn identity is `combatTurnKey(combat)` = `encounter:round:actor`, shared by
  combat, conditions and forms; one death save per real turn start.
  `expireTurnEffects(state, actorId, phase, {turnKey})` expires terms on the
  named turn. Removing the current companion records
  `combat.pendingTurnStart.previousTurnKey`; `reconcileFormsAfterMutation`
  (`state.mjs`) ends that turn with it. Markers saved without the field keep the
  older behaviour.
- Readers: `canReadVitals(s, actor, viewer)` — whoever reads the sheet sees HP,
  counts and vital rolls; others see the token's public state.
  `projectConditionReasons` shows a private application as "Effetto riservato".
  `rollReasons` and `conditionFacts` show advantage/disadvantage reasons with
  source and ask an explicit yes/no when a Frightened or grappling source is unknown.
- Dice evidence (I-229, [review](../../changes/interview-01/blueprint-dice-correction-review.md)).
  `rollEvidence[id]` keeps `dice`, `personal` and `owner`.
  `knownEvidence(evidence, request)` (`combat.mjs`) reuses every face for an
  identical profile; for a recomputed one (hit ↔ critical) it keeps, per group
  of equal-sided dice, the first faces in original order (`knownValues`, `null` for missing dice) and moves
  the rest to `supersededValues` in `recomputedFrom`; history gets a
  `status:"superseded"` entry. `resolveAutomaticRolls` rolls only the missing dice
  and never re-rolls a known face; known physical faces keep the request waiting.
  Undo withdraws (`withdrawn`): a digital attempt and its dice are two commits, and
  an identical retry (`retryKey`) reuses withdrawn faces once (`reusedFrom`,
  shown as "Riusato"), vital rolls included.
- Token badge: `table.mjs` renders `.map-token .token-status[data-token-status]`;
  its style lives in `conditions-ui.css` (rim badge, one colour per state). Only
  shared applications are counted. Checked in Chromium only.
- `formatNumber(lang, value, digits = 1)` in `ui.mjs` formats Table decimals.

Tests: `tests/conditions*.test.mjs`, `tests/increment10-review.test.mjs`,
`tests/combat-evidence.test.mjs`; browser: `conditions-*-journey.js`,
`dice-correction-journey.js` (see blueprint-checks README). Not covered yet:
see the Frontiera of CONDITIONS_FLOW.

## Areas and registry (B11)

`registry.mjs` is the shared extension registry; `app.mjs` creates it and exposes
it as `ctx.registry`. `extensions.mjs` already lists every planned area B12–B60
(`PLANNED_EXTENSIONS`, B31 is CSS only): builders never edit it. An area is one
entry module `design/blueprint/<id>.mjs` exporting a synchronous
`register(registry)`; the area id is the file name. `loadExtensions` probes each
module with `HEAD` (4 s `probeTimeout`) and imports it: a missing file is "not
built", an import or registration error is "failed". Failures stay contained
in their own slot and are listed in "Cosa è pronto".

- Inside `register` only: `add(point, def)` for contributions,
  `registerStateSlice(name, {version, seed, normalize, undo})` for
  `state.ext.<id>` (`undo: "snapshot"` by default, `"preserve"` for chat/journal
  style data with `{undoable:false}` commits), `registerStyles(url)` for the
  area's own prefixed CSS, `on(event, handler)`. Contribution ids equal the area
  id or start with `<id>-`/`<id>.`; a core id only with `replaces: true`.
- Mutate only through `ctx.commit` on the own slice (`registry.slice(draft)`);
  throw a plain `Error` to refuse (shown as a refusal, not an area warning).
- Touch the DOM only inside the element given to `bind` (exception: a global
  overlay such as B56 creates its own prefixed element under `document.body`).
  Import pure functions of existing modules; never import `app.mjs`; never edit
  shared files or `state.mjs`. Labels are `{it, en}`; dynamic HTML via `ctx.esc`.
- Seams prepared for specific areas: `table.menuTarget(actorId)` and
  `table.tokenMenu(actorId)` (B12); `ctx.registry.list("command", ctx)`, `run`,
  `conflicts()` (B23).
- Development only, on `127.0.0.1`/`localhost`: `?fixture=sample-extension`
  (`tests/fixtures/sample-extension.mjs`, one contribution per point, the full
  example module) and `?fixture=failing-extension`, comma-separated (max 4).
- Each area adds `tests/<area>.test.mjs` and
  `changes/interview-01/blueprint-checks/<area>-journey.js`; parallel-build rules
  are in [CAPABILITY_CENSUS §d](../../docs/interview/CAPABILITY_CENSUS.md#d-backlog-di-costruzione-del-blueprint).

API reference: [registry plan](../../changes/interview-01/blueprint-registry-plan.md)
§1–2; where each extension point appears in the app, choices and evidence:
[integration](../../changes/interview-01/blueprint-registry-integration.md).
Core tests: `tests/registry.test.mjs`, `tests/registry-shell.test.mjs` (with no
areas the core markup is byte-identical); browser: `registry-smoke-journey.js`.

## Review fixes — area shell (B11b) and conditions (increment 10)

Contract changes from `changes/interview-01/blueprint-b11b-inc10-fixes.md`,
on top of the two sections above.

- Refusals: the offline refusal of `ctx.commit` carries `{it, en}` (its message
  stays in the current language); a plain `Error` thrown by a mutator is
  re-thrown with `refusal: true`. `registry.run`/`invoke` show both as the
  message, without a contained warning; TypeError and other bugs stay warnings.
  An area page handler outside `registry.run` catches and shows a refusal itself.
- Keys: plain Enter/Space and Mod+A/C/V/X are reserved core shortcuts in every
  context. The shell never runs an area command for plain Enter/Space on a
  focused control, nor for Mod+A/C/V/X/Z/Y/Shift+Z while typing in a field.
- Table tools: `activate(ctx, table)` runs after the bind of the Table that stays
  on screen whenever the mode names that tool (chip, `table.setMode`, a reset to
  Move); `deactivate` runs when the mode changes, on `leaveTable()` (the shell
  renders another page) and on `resetTableView()` (role change, Reset). A visible
  replacement of `measure` or `pointer` shows its own label and icon.
- Drafts: `navigate(page, params, "core")` means a core draft was confirmed and
  still asks an area draft guard; `true` means everything was confirmed. A role
  change does the same. A registered campaign section hidden from the current
  role says it is unavailable, with a way back.
- Owner report: a registry warning refreshes the strip notice at once; the notice
  opens the report in view; each area lists its warnings as plain sentences with
  the technical text as detail. `loadExtensions` reports a probe that does not
  answer within `probeTimeout` (4 s) as a failed area; `index.html` shows a
  loading line until the first render. Preferences write device settings before
  changing language and offline mode.
- Vital rolls reuse withdrawn faces like attacks (I-229): the retry key is kind,
  roller, subject, aid kind, the subject's 0-HP (or knockout) instance and, in
  initiative, the death save's or Help action's turn. Withdrawn faces are reused
  once: a later accepted roll with the same key (attacks included) consumes them.
- A personal vital roll's `outcome.vitality` (natural, total, d4 hours) is
  projected only to its owner or resolver, also after the sheet joins a campaign.
- A death save requested outside initiative expires once the creature is in the
  order; a turn-bound one outside its running encounter. Turn starts expire them.
- `reconcileFormsAfterMutation` ends a removed creature's turn with
  `pendingTurnStart.previousTurnKey`.
- Correct HP and status refuses a fall to 0 HP (`zero-by-correction`: use Damage)
  and a 0 HP maximum (`max-hp-zero`, SRD EN 17 / IT 19: record Dead instead).

Tests: `tests/review-fixes-b11b-inc10.test.mjs`; browser:
`changes/interview-01/blueprint-checks/b11b-inc10-fixes-journey.js`.

## Table structure (B61)

Where commands live at the Table (evidence and measurements:
[table structure](../../changes/interview-01/blueprint-table-structure-evidence.md); builder rule:
[registry plan §5](../../changes/interview-01/blueprint-registry-plan.md)).

- Layout (`table.mjs`, `.table-layout`): top line with the scene title and the core scene
  commands only (DM: start/end combat, Scenes, Time; everyone: Rests); turn portraits; the map
  with the left tool column; the right sidebar (`.table-sidebar-panel` + `.table-sidebar-rail`);
  the combat bar and the action dock at the bottom. On a phone (≤ 720 px) the panel follows the
  map and the tabs are a bar pinned at the bottom under the action dock, with «Mappa» first.
- `table-panel` placements: `inspector` (the Creature tab, default), `sidebar-tab` (its own tab:
  `icon`, `order`, `roles`, `when`; the old `drawer` is an alias), `cover`. Core tabs: Creature
  (0) and Log (10, replaceable by B17). An area tab's panel is `#table-drawer` with its close
  button `[data-table-drawer-close]`; any control with `data-table-drawer="<id>"` toggles the tab.
- `table-tool` `group` (`TABLE_TOOL_GROUPS` in `registry.mjs`): `select`, `measure`, `draw`, `fog`,
  `ping`, `dm`, `more` (default). A group with one visible tool shows the tool itself; otherwise a
  group button (`[data-tool-group]`) and, for the active group, its tools beside it
  (`[data-tool-group-tools]`, hidden for the other groups but still in the markup). Zoom and fit
  are `.map-zoom` at the map's bottom right.
- Sidebar memory per identity in `localStorage` (`d20-studio-table-sidebar`, `{tab, collapsed}`);
  `resetTableView()` re-reads it, `resetTableView({ forget: true })` (Reset example) clears it.
  Selecting a token never changes the tab; an action preview or a planned path opens the
  Creature tab once. Free roll and Undo are in the action dock with the resources.
- Tab content must work at 300–420 px: the panel content is a container named `table-panel`
  (`@container table-panel (max-width: 600px)` repeats an area's phone rules; done for B14, B26,
  B27, B56).
- B56: the modal BG3 check screen is only for a d20 check/save with a DC that the viewer started
  outside combat (`source !== "combat"`); every other roll tumbles with pointer events passing
  through; Esc still skips and closes. B30: a Table tip that finds no free map corner becomes a
  one-row bar (title, Read, Got it); on a phone it docks above the action dock, off the map.

Tests: `tests/registry-shell.test.mjs`, `tests/dice-3d.test.mjs`; browser:
`changes/interview-01/blueprint-checks/b61-table-structure-journey.js` and the rewritten
`registry-smoke-journey.js`.

Review fixes (B61 review, same day; evidence in the same file, «Revisione e correzioni»):

- The rail has «Tutti i pannelli» (`[data-table-panels]`, `aria-haspopup="dialog"`): a list of
  every tab (`tablePanelsMenu(ctx, items)` in `table.mjs`, entries `[data-table-panel-jump]`);
  choosing one opens that tab and never toggles it closed. Only `.table-tabs` scrolls: the
  collapse control and All panels (desktop, above the tabs) and Map and All panels (phone, at
  the two ends of the bar) stay in place. Desktop tabs are 40 × 40 with 2 px gaps, so the DM's
  rail fits a 1366 × 768 window.
- After each bind the open tab is scrolled into view inside its strip with
  `scrollIntoStrip(strip, item)` (`ui.mjs`; also used for the campaign sections).
- Phone action dock: the commands wrap instead of scrolling sideways; Cancel preview shows its
  icon (`close`) with its words in `.dock-text` (hidden on a phone, the accessible name keeps
  «Esc · Annulla preparazione»); on a wide screen the icon is hidden.
- Campaign sidebar on a phone: the section strip sits in `.campaign-sections` beside «Tutte le
  sezioni» (`[data-campaign-sections]`, hidden above 720 px), which lists every section; the
  open section stays in view.
- Enlarged interface (`data-pref-scaled`, B22): the map toolbar scrolls inside the map, so the
  active group's tools stand in the column under their group button (`.map-subtools` static,
  `preferences.css`) instead of beside it, where the scroll box cut them off.

Tests: `tests/review-fixes-b61.test.mjs`; browser: `b61-review-fixes-journey.js`.

## W2b1 integration (B33, B34, B36, B37, B38, B40)

Contract changes from `changes/interview-01/blueprint-w2b1-integration.md`.

- `table-panel` `placement: "dock"` (B40's «Mosse») renders at the end of the combat action
  bar, after Dash, Dodge and Disengage (BG3 hotbar common actions), through
  `renderCombatBar(ctx, actorId, extra = "")`; the bottom dock keeps only the core commands
  (registry plan §5.1) and stays one row at 1440 in combat. On a phone that bar scrolls
  sideways and «Mosse» is pinned at its end. `dock-row` (B53) is unchanged.
- B40 intercepts a plain Move only: `coreClaimsMapInput(ctx, table)` leaves the map to an
  action preview being aimed and to a companion placement (`mapPlacementActive()` in
  `companion-map.mjs`); a Move released beyond the movement left stops where it runs out.
- Tray rolls (B34) are withdrawn from the tray's recent rolls («Ritira», with a reason), never
  by the gameplay Undo. A tray record keeps its `logLabel`; the chat (B17) turns that line
  into the roll's card and counts it in the Registro badge, the bell and the closed-log
  notices (`rollFor`). B56's `recentRolls(state, role, limit, { tray })` lists tray rolls with
  the tray's own audience (`canSeeResult`) and event shape (`rollEvent`).
- The relay (B55) reads a tray roll's log line as that roll too (IA regression, 26/09/2026):
  `relayPreview(state, slice, cid, { rollFor })` passes `rollFor(entry)` to `logItems`, and
  `integrations.mjs` builds it with `trayRollFor(ctx)` (the chat's `logLabel` pairing, without
  the viewer: a channel posts what the roll's audience makes public). A public tray roll is a
  roll in the Discord preview (under «Public rolls») and on a linked Avrae channel; «Solo DM»,
  blind and «Solo io» rolls stay out and count for their owner; a withdrawn one is reversed.
- Optional neighbours are loaded by dynamic import and stay null when their area is absent
  (`chat.mjs`, `dice-3d.mjs` and `integrations.mjs` export `neighboursReady` for tests); a
  static import of another area's module would make one area fail when the other is not built.

Tests: `tests/w2b1-integration.test.mjs`; browser: `w2b1-shell-journey.js`.

## Information architecture (B62)

Where commands live once all 48 areas exist (evidence and before/after measurements:
[IA consolidation](../../changes/interview-01/blueprint-ia-consolidation-evidence.md); builder
rule: [registry plan §5.3](../../changes/interview-01/blueprint-registry-plan.md)). Placement is
registry metadata validated against closed taxonomies in `registry.mjs`; an unknown value fails
the area's registration, a missing one keeps the pre-B62 separate entry.

- Table sidebar (`table-panel.section`, `TABLE_SIDEBAR_SECTIONS`, Foundry sidebar FVT-007):
  one rail tab per section (`data-table-section`, `data-table-tab="<section>"`); a section's
  panels are sub-tabs (`.table-subtabs [data-table-subtab]`, area panels keep
  `data-table-drawer`/`data-table-tab`). Panels not shown as sub-tabs keep a hidden handle in
  `.table-panel-index`, so code pressing `[data-table-drawer="<id>"]` still opens them. Sidebar
  memory adds `sections` (last panel per section), `hidden` (sections out of the rail, per
  identity) and `hotbar` (page). `tablePanelsMenu(ctx, items, groups)` renders All panels grouped.
- Bottom (`.action-dock.table-hotbar`, BG3 CRP-098/099): identity and resources, the pages
  «Azioni» (`renderCombatBar` + `dock` panels) and «Barra rapida» (`dock-row` panels) as a
  tablist (`[data-hotbar-page]`), then the turn commands. There is no stand-alone `.combat-bar`
  any more; `arrangeActions` only moves a layout-level one. From 721 px the actions keep at
  most two rows (more scroll inside the bar) and End turn spans both command rows, so the bar
  keeps one height whatever is selected; in combat the map gives the turn-order row its height
  back (`.table-layout:has(> .initiative) .table-stage`), so the Table fits 1440 × 900 without
  a page scroll. Phone rules that hide `.dock-text` apply to the commands only
  (`.action-dock > .toolbar`), so B40's «Mosse» keeps its label and sticky end.
- Campaign rail (`campaign-section.group`, `rail-groups.mjs`): collapsible Kanka groups
  (`[data-campaign-group-toggle]`), remembered per identity (`d20-studio-campaign-rail`, cleared
  by Reset example); the open section's group is always open; no group → «Altro».
- Preparation (`preparation-section.group`, `prepSectionModel`): groups strip plus the open
  group's sections (`.prep-sections.is-sub`); a single group keeps the flat strip.
- Sheet (`sheet-tab.category`, `sheetCategories`): D&D Beyond's seven categories; area tabs are
  sub-sections (`.character-subtabs`); `tab=` accepts a category or a member id.
- Token menu (`token-menu.submenu`, `menuRows`): direct commands on top, labelled submenus
  (`data-token-menu-category`, view `cat:<id>`, ArrowRight/ArrowLeft/Esc); a one-command
  submenu shows the command itself; shortcuts stay global `command`s.
- One Search (SRD 5.2.1 EN 187 / IT 212): B46 `openSearch` rolls once and passes the accepted
  roll to `searchForTrapsWithRoll` (regions-domain, B41) and `searchPointsWithRoll`
  (travel-domain, B45, exploration only); B41/B45 hide their own buttons when B46 is built.
  The toast names only what this roll discovered (an open crate in plain sight is not news).
- B30 first-occurrence tips default to off (`home-tips.enabled` false); help stays on request.

Tests: `tests/ia-consolidation.test.mjs` (all areas loaded); browser: `b62-ia-journey.js`.

Review fixes (B62 review, 26/09/2026; evidence in the same file, «Revisione e correzioni»):

- Dock commands (`table-panel` `placement: "dock"`, B40's «Mosse») render in `.combat-dock`, a
  column of `renderCombatBar` beside `.combat-actions`: desktop actions | dock | dice mode and
  rolls queue; phone strip | dock | dice mode. Only the actions list scrolls, so a dock command is
  never in a hidden row. From 1280 to 1499 px the hotbar portrait is hidden (name, turn line and
  resources stay); from 1280 to 1439 px the dice mode and the rolls queue show their control and
  bell only (their words stay the accessible names). At 1366 × 768 Livia's seven actions keep
  two rows beside «Mosse».
- Phone token menu sheet: `max-height: calc(100dvh - 24px - env(safe-area-inset-top))` (was
  72vh, which hid the DM's last submenus below its fold).
- Map toolbar: the active group's tools start at the toolbar's top (Foundry scene controls):
  `.map-tool-cluster` is static and `.map-toolbar` anchors `.map-subtools`. On a phone the DM
  tools no longer run under the pinned hotbar.
- `TABLE_SIDEBAR_SECTIONS`: Items (50) before Journal (60), Foundry's order (FVT-007).
- Sheet and Preparation strips: after a category, sub-section, group, section or «Tutte» jump
  the page redraws and the focus returns to the chosen control (`focusAfterDraw` in
  `characters.mjs` and `preparation.mjs`), instead of falling to the document.

Tests: `tests/review-fixes-b62.test.mjs`; browser: `b62-review-fixes-journey.js`.

## IA regression after W2b1 and B62 (26/09/2026)

Full regression (evidence: [IA regression](../../changes/interview-01/blueprint-ia-regression.md)).
Besides the relay seam above (B34 × B55), one layout rule for every sheet category:

- `.character-tab-content` is one `minmax(0, 1fr)` track: an automatic track grew to its widest
  item's min-content and, at 150 % text and 125 % interface on a 390 px phone, widened the page
  (B40's generic actions table, B34's roll rows, B43's standing select). Area grids inside a
  sheet use `minmax(min(<size>, 100%), 1fr)` (B37 `.shp-generic`) and headers that pair a
  one-word title with a button wrap (B37 `.shp-note-head`).

Tests: `tests/phone-scale-fit.test.mjs`, `tests/w2b1-integration.test.mjs` (B34 × B55); browser:
`preferences-journey.js`, `integrations-journey.js`.

## Reconciliation after the audit fix packages (27/09/2026)

Evidence and decisions: [reconcile](../../changes/interview-01/audit/reconcile.md). The IA of
B62 holds with these integrated changes:

- Preparation «Scene» group: the core scene list and editor (P7: folders, archive, objects,
  levels, variants, lights) plus the area sections Regions and Special moves. `scene-assets`
  registers no `preparation-section`; its old route `tab=scene-assets` opens the editor's
  Objects tab.
- Sheet «Note» category: `sheet-plus-notes` (D&D Beyond's section notes) first, then the
  adventure log and the revisions (P2 PG-43).
- Action bar cost filter (`renderCombatBar`): a cost filter only when it narrows the list,
  «Tutte» only beside two or more filters, a lone filter is a toggle and pressing the active
  filter returns to every action. Livia's seven actions keep two rows at 1366 and 1440.
- Hotbar identity from 721 px: turn line, slot pips and resources at line height 1.3 with
  tighter spacing, so the combat hotbar is 115 px and the Table does not scroll at 1440 × 900.
- Phone Preparation (≤ 760 px): a scene row's «Altre azioni» menu spans the row's actions
  (`.prep-scene-actions` is its anchor) and never leaves the screen.
- B30 tips: `home-tips.enabled` defaults to off again (owner decision I-236, point 3; SV-48 had
  turned it on). SV-48's «Non mostrare più», archive, reset and the «Mostra i suggerimenti»
  switch in the help of every page stay.

Tests: `tests/reconcile-ia.test.mjs`, `tests/ia-consolidation.test.mjs`,
`tests/w2b2-integration.test.mjs`, `tests/p5-actionbar.test.mjs`, `tests/help.test.mjs`;
browser: `handouts-journey.js`, `compendium-journey.js`, `core-journey.js`,
`b62-review-fixes-journey.js`, `p1-first-use-journey.js`.

## Audit round 2: contracts and hand-offs (27–29/09/2026)

Packages R1–R8 ([triage 2](../../changes/interview-01/audit/triage2.md)) met through the
contracts C1–C14; the hand-offs they left are applied in one pass
([hand-offs](../../changes/interview-01/audit/handoffs.md)). What other areas code against:

- **Session runner (C3, CA-57).** `session-view.runsSession(state, role)` is the one authority
  predicate for the DM's session powers: true for the core DM identity (`"dm"`) and, while
  campaign-members' `campaigns[<campaign in play>].handover.to === role`, for that member
  (`sessionRunner(state)` returns the runner's id or `null`). Every check that stands for the
  DM running the session accepts it: combat order, start and end of combat, next turn, scene
  activation (Preparation, the Table's scene commands and the Session panel's scene switch and
  split party), Preparation editing, adding creatures, fog, hidden tokens, roll requests and
  the Session panel. Identity checks never use it: ownership (`actor.owner === role`, personal
  sheets), private notes, personal plans, drafts, «Vedi come» and the evening's story stay with
  their owner. Areas where session-view is optional import it dynamically with the default
  `role === "dm"` (`combat.sessionAuthority`, `table-spatial.runsSession`/`sessionGated`,
  `chat-domain.runsSessionFor`). Regions, the world map and scene objects keep `roles: ["dm"]`.
- **C1** `campaign-settings-domain.disclosureOf(state)` has `dc` (`"shown"`/`"hidden"`) and
  `passiveFailures` (`"hidden"`/`"shown"`); **C2** `PERMISSIONS` row `playerGroup`; **C4**
  `setLegacySources` and `sourceStates` row `legacy-2014`; **C5**
  `campaign-data.openCopyTo(ctx, "<kind>:<id>")` for every `ITEM_KINDS` kind (`entry`,
  `creature`, `handout`, `table`, `deck`, `homebrew`, `page` — an Archive page starts unseen in
  the other campaign) or `scene`, also with no other campaign (it explains and offers «Crea una
  campagna»); **C6** `dice-tray.hasConnectedDie(ctx, sides)` and
  `awaitConnectedFaces(ctx, {actorId, sides, count, label})`, used by the attempt dialog and
  the sheet's roll window; **C7** `policyOf(...)` `criticals`, `flanking`, `potions` are
  computed; **C8** `combat-tracker.rollOwnInitiative`, `combat-tracker-domain.awaitsInitiative`;
  **C10** `special-moves-domain.mountControl`; **C12**
  `loot.openAward(ctx, {xp, coins, reason})` fills its own fields.
- **Roll evidence of an attack** (`state.mjs acceptedRolls`): besides dice and values, a
  combat roll keeps its request's `riders`/`riderRolls` (Bless, Bane) and `dc`, and a hidden
  audience: `audience` (`gm`, `blind`, `self`) with `acceptedBy` (the roller). A hidden
  audience is a private roll; «Io e il DM» and «Solo il DM» are owned by the DM, and a blind
  roll's controller is the DM, so `registry.rollVisibleTo` already keeps it from its roller.
  Readers apply `combat.canSeeAttemptValues(state, roll, role)` too: the Registro
  (`chat-domain.projectLog`, a blind roll's roller gets a card without values,
  `hiddenResult`), the 3D dice (`dice-3d-domain.describeRoll`), the Table's roll history. The
  Registro names riders («1d20 + 1d4 (Benedizione)»).
- `combat.requestScore(request, faces)` is the one reading of a D20 request's faces (natural,
  riders, total): `roll-requests.rerollRequest` (Heroic Inspiration may reroll any die, each
  within its sides) uses it. Physical-face dialogs label every die by its sides and name.
- Start dialog (`combat-tracker-domain`): each row has `groupKey`
  (`encounter-builder-domain.initiativeKeyOf`); rows sharing a key (`sharedKey`) show as one
  row «Goblin guerriero A, B» and roll one d20, recorded for each member.
- Polymorph cast from the Transform dialog (`forms-companions`): with a caster, a slot of
  level 4 or higher (`polymorphSlots`, `selection.slotLevel`) and, in combat, the caster's
  Action are spent once (`spendPolymorphCast`, also when an unwilling target's save is asked);
  without one it is refused with the remedy. «Nessuno» spends nothing.
- A forged homebrew weapon row carries `weaponType` and `weapon` (the base's, with the
  forge's damage, properties and mastery), never the base's `srdId`.
- **Sample freshness** (`sample-clock.mjs`): the example is authored around Thursday 17
  September 2026 and moved by whole weeks at seed or reset (`sampleDate`, `sampleDay`), so no
  stamp is ever after the visit; «Il sigillo della torre» (`sampleSessions`) is the coming Thursday at
  20:30 in Rome. The in-world calendar is independent (census C24); provenance, build and
  revision dates are not sample stamps. Tests pin `useSampleClock` or pass a fixed clock
  (`getCampaignHub(state, id, viewer, now)`); none depends on the run date (the suite passes
  with the clock moved by 0–400 days).

- Other seams the package reports describe in full (fix2-R1 … fix2-R8): R1 `combat`
  `requestScore`, `canSeeAttemptValues`, `ROLL_AUDIENCES`, `useHeroicInspiration`,
  `continueWithoutInspiration`, `dcShownTo`, `displayName`, `maskedFor`, `campaignRules`;
  `srd-sample.rowWeapon`, `activeItemModifiers(actor, library)`;
  `sheet-plus-domain.homebrewRollModes`. R3 transformations (`forms-companions`
  `previewTransform`/`applyTransform`/`imposeTransformation`, `TRANSFORM_PRESETS`,
  `KEEP_SWITCHES`, `formTokenName`), mounts (`special-moves` `rideFor`, `bringMount`,
  `commitTransformSave`), wall `sightMode` (`"limited"`, `"proximity"` with
  `proximityMeters`), group `movers` (`token-menu.setGroupMovers`, `groupMoveRefusal`), the
  toast lets taps through. R4 `state.AMBUSH_SCENE_ID`, `AMBUSH_GOBLINS`, `seedDemoSpells`,
  `seedDemoAmbush`; `inventory-plus-domain.potionCost`/`potionBlock`;
  `characters.beginHealing(..., {cost})`, `usePotion`; quick bar slot kind `feature`. R5
  `scene.encounter.rollCall = {openedAt, by}`, players' initiative entries `visibility:
"shared"`, `encounter-builder` `renderSceneEncounter`/`bindSceneEncounter`,
  `combat-tracker.refreshTableInitiative`. R8 `registry.registerModuleGate({disabled})`,
  `switchedOff(ctx)`; `ui.canCopyToCampaign`/`copyToCampaign`; `journal-plus.filterContent`,
  `filterExcerpt`; `campaign.editCampaignEntry`; `command-palette.matchDetail`;
  `integrations-domain.FEATURE_AREAS`, `saveFeatures`; `assistant-domain.localEndpointCheck`.

Tests: `tests/handoff-*.test.mjs`, `tests/sample-clock.test.mjs`; browser:
`handoffs-journey.js`.

## Round-2 regression (29/09/2026)

Full regression after the hand-offs (evidence:
[round-2 regression](../../changes/interview-01/blueprint-round2-regression.md)). Two seams fixed:

- The sheet's roll window (`sheet-plus` `rollDialog`, the one engine behind the sheet's
  numbers since P3 PG-23) opens on the viewer's remembered dice for rolls in place, the dice
  tray's personal setting `dice-tray.dice` (`"physical"` preselects «Fisici» and shows the
  face fields; review P2-6 of B34, as D&D Beyond's dice setting and Foundry's manual dice).
  Without the dice tray it stays digital. The choice is per roll: «Digitali» stays one click
  away.
- The roll log (`state.mjs acceptedRolls`) records a Heroic Inspiration reroll
  (`request.inspirationReroll`, set by `combat.useHeroicInspiration`) as a new roll even when
  it lands on the same face: the history keeps the first roll and the reroll, as
  `useHeroicInspiration` promises. Before, an identical face was taken for the same roll.
- Browser checks that serve a throwaway area through `page.route` or guard outside requests
  with `context.route` block service workers (`serviceWorkers: "block"`): the app's
  pass-through `sw.js` (P1 IN-11) answers requests before the route sees them.

Tests: `tests/r2-regression.test.mjs`; browser: `dice-tray-review-journey.js`,
`r1-attack-journey.js`.

## Residuals of re-audit 3 (29/09/2026)

The last audit residuals, closed by one writer (evidence and decisions:
[residuals](../../changes/interview-01/audit/residuals.md)). What other areas code against:

- **Compatibility packs, read side (BI-45).** `compat-packs.mjs` (core, no imports) reads B49's
  `state.ext["adventures-packs"]`: `enabledPacks`, `readablePacks`, `packCreatures` and
  `packCreature` (bestiary entries with `pack`, ids `pack:<pack>:creature:<entry>`),
  `packCreatureNpc` (createSceneNPC input; a patch with `provenance.kind: "compat-pack"` and
  `packRef`; the first attack as the melee profile), `packSubclasses` (builder rows with
  `pack: true`) and `searchPackEntries`. Consumers: the bestiary in `token-menu`
  (`creatureMatches` takes `state` as its fourth argument; `addCreatureAt`),
  `compendium.addCreatureToScene` (an entry with `pack`), `classesFor` in `character-build`, the
  Library search (`[data-library-pack]`) and B49's palette source `adventures-packs`.
  `combat.isValidMeleeProfile` accepts a `compat-pack` source with its `packId` and pages. Only
  packs the DM enabled in the campaign in play reach the bestiary and the builder; the owner's
  content decision stays open (simulation, I-233).
- **Homebrew use on a sheet (X-A1).** `homebrew.homebrewUseSteps(state, ref, context, role)` lists
  what is missing before `role` may use a revision on the sheet `context.actorId` (`enable`,
  `share`, `dependency`, each `{it, en}` named as the button that does it). `applyToSheet` refuses
  with those steps; the dialog lists them per sheet. `homebrew.mjs` refusals carry `it`/`en`.
- **Group turn (TV-59).** `setGroupTurns` enabled during a group leader's turn starts the group
  turn at once (`beginGroupTurn`), as Mob Attack Tool; on another turn it starts at the leader's
  next turn.
- **Shared initiative of placed copies (TV-52).** In `encounter-builder-domain`, `copyKeyOf` is the
  key copies could share and `setSharedInitiative(state, rowId, shared, role)` records the choice
  (an encounter row's `individualInitiative`, else the slice's `individualRows`). Start rows carry
  `shareKey`; `combat-tracker-domain.setShareInitiative` and `applyShareChoice` back the start
  dialog's «Un solo tiro per il gruppo».
- **Proficiency (BI-24).** `combat.profileFor` treats an empty effective `combatProfile` as no
  profile; an inventory weapon attack uses the recorded Proficiency Bonus, else the level's.
- **Language (X-A2).** Class-table feature names carry the Italian SRD 5.2.1 names
  (`FEATURE_NAMES_IT` in `character-rules`); weapon mastery reads «Padronanza» (the Italian SRD's
  term; «Maestria» is Expertise); «anteprima», «Dispensa»; `forgeItem` takes the author's `lang`
  for the provenance line; decimals through `formatNumber`.
- **Class template (X-A3).** «Struttura del … (SRD)» fills one grant per class-table level with
  the feature names (no SRD text) plus the level-4 Ability Score Improvement.

Tests: `tests/residuals.test.mjs`; browser: `residuals-a-journey.js`, `residuals-b-journey.js`.

## Visual regressions (30/09/2026)

Two full journey regressions after the visual passes (evidence:
[visual regression](../../changes/interview-01/blueprint-visual-regression.md),
[visual regression 2](../../changes/interview-01/blueprint-visual2-regression.md); 188/188 each).
Three rules other areas code against:

- **Map gestures read the SVG's content box.** The phone Table pads the map (120 px at the bottom
  for portraits and zoom), so pinch and two-finger pan (`token-menu.mjs`) convert pointer
  positions with `mapViewport(svg)`, the SVG's inner box, never its border box; fingers that do
  not move leave the view where it is. HUD layers that must cover the whole map
  (`annotations.mjs`, `lighting-editor.mjs`, `media-table.mjs`, `session-view.mjs` `layoutHud`)
  keep combining the CTM with the outer box on purpose.
- **The latest ledger roll wins.** `combat-tracker-domain.mergeSavedRolls(state, sceneId, rows)`
  copies a saved participant's roll into a start-dialog row only when that roll is more recent in
  the initiative ledger than the row's own: a d20 typed or rerolled in the dialog is the one combat
  uses, and a roll made elsewhere afterwards (a player from the sheet) still enters.
- **Door reach tolerates 1 cm.** `table-spatial.mjs` `previewDoorInteraction` compares the
  distance with `interactionRangeMeters + REACH_TOLERANCE_METERS` (0.01 m), as the Regions' door
  reach already did: a click on a free (unsnapped) grid carries rounding (1.5000009 m for a
  1.5 m reach) and must not ask the creature to walk 0.3 m.

Tests: `tests/visual-regression.test.mjs`, `tests/visual2-regression.test.mjs`; browser:
`encounter-lifecycle.js`, `spatial-journey.js`, `token-menu-journey.js`.

## Final review fixes (30/09/2026)

One writer closed the findings of the three final reviews (completeness, privacy, UX; evidence and
decisions: [final fixes](../../changes/interview-01/final-fixes.md)). What other areas code against:

- **Membership reads sheets (privacy P1, Roll20 SVC-031).** `character-access.canViewActor`: a
  shared character is read by its owner or controller and by a member of one of its campaigns
  (`campaignIds`, none recorded = the campaign in play); a removed member keeps only their own
  sheet, read-only. NPCs keep the DM / controller / co-DM rules.
- **Page changes (F4, D&D Beyond, Kanka).** The shell keys each history entry
  (`history.state.d20Entry`, `scrollRestoration = "manual"`): a new page or record
  (`ui.isNewPage`) starts at the top and, when the focus was lost, focuses `#content h1`; Back and
  Forward restore the remembered position (`ui.createScrollMemory`). Pages that bring a title
  into view use `block: "nearest"`.
- **Shell dialog.** `ctx.dialog(title, body, { onCancel })`: `onCancel` runs once, after the
  dialog closed without a submit (Cancel, ×, Escape), never on a programmatic close (X-05).
- **Context menus (X-06).** `context-menu.mjs` (core): a row marked `data-context-menu="<name>"`
  gets a menu of its own visible commands by right-click, long press or Shift+F10; an area that
  already handles `contextmenu` (and prevents the default) keeps it. Marked today: character cards,
  inventory rows, spell rows.
- **Drag and drop (X-07).** `compendium.dragPayload(entry)` sets `application/x-d20-entry` (every
  entry), `application/x-d20-creature` (creatures, the map's existing bestiary drop) and
  `text/plain`; `compendium.dropOnSheet(ctx, entryId, actorId)` opens «Aggiungi…» for that sheet
  (items and spells). Drop targets: the Table map (creatures, DM), a token (items and spells),
  `characters.bindEntryDrop(el, ctx, actorId)` on the sheet and the Creature tab. The browser is
  also a Table panel `compendium-browse` in the «reference» section, for every role.
- **Pop-out panels (X-10, Foundry V14).** `table.openPanelWindow(ctx, panelId)` opens
  `#table?tab=window:<panel id>`; `renderTable` then renders that panel alone (as the viewer may
  open it) and the shell hides its chrome; the window name `d20-panel-<role>-<id>` carries the
  demo identity. «Tutti i pannelli» offers «Stacca» beside every area panel.
- **Turn start (F5/TV-53, BG3).** `renderTable` follows `combatTurnKey`: when a new turn starts,
  the viewer's acting creature (controllable, on the scene) becomes the selection once.
- **Hotbar-measured HUD (F6).** `table.captionLift(containerRect, hudTops)` places the map status
  line 8 px over the highest measured HUD top; on a phone the message is a transient snackbar
  above the action dock (`--map-message-bottom`, `.is-fresh`, 4.5 s) and entering the Table
  scrolls the map into view once (`phoneMapShown`, reset by `leaveTable`).
- **Level up of an unrecorded sheet (F1, D&D Beyond Manage Level Up).** `previewCharacterDraft`
  returns `levelUpOnly` for an `advance` draft on a sheet without `characterBuild` (or one applied
  in that mode): grants and features of levels already on the sheet are neither asked nor
  proposed (per class: `baseClassLevel`), origin/skill/spell-count reviews stay quiet, the class
  label and languages are kept (`languages` undefined leaves the sheet's own), skills merge, and
  `incomplete` is false. `applyCharacterDraft` records `characterBuild.levelUpOnly`.
- **Derived values.** `character-rules.initiativeProficiency(actor)` (SRD 5.2.1 Alert) feeds
  `combat-tracker-domain.initiativeBonus` and the sheet's `naturalBase("initiative")`; library
  cards read `getEffectiveActor(actor).ac`; sample creatures without spellcasting have
  `slots: {used: 0, max: 0}`.
- **Surprise (SRD 5.2.1 EN 189 / IT 216).** Start rows carry `surprised`, saved in
  `scene.encounter.participants`; `combat-tracker-domain.markSurprised(rows, ids, on)` (clears a
  digital die, keeps a typed one); `rollStartRows` rolls two d20s and keeps the lower, the ledger
  record gets `rollMode: "disadvantage"`, `faces` and `surprised`.
- **Commands for the DM (F16).** `combat-tracker.finish` (the Table's «Concludi incontro» runs it
  when present: XP and loot), `dice-tray.request`, `dice-tray.secret`
  (`dice-tray.openTraySection(ctx, section, focus, { audience })`), `chat.snapshot`; the chat
  composer shows «Chiedi un tiro» to the DM.
- **Search aliases (SV-02/SV-03).** `command-palette` `COMMAND_ALIASES` (extra keywords by command
  id) and `aliasPages(ctx)` (destinations without a command: the viewer's sheet tabs, campaign
  sessions and safety, the Table's actions).
- **Numbers.** `hp-widget.amountPlan(raw, current, kind)` (the sheet's HP amount: -5, +3, =12,
  chains; «set» goes through `token-menu.applyHp`), `hp-widget.resolveNumber(raw, current)` for
  «Correggi i punti ferita». A widget status is a notice (`STATUS_TTL` 12 s).
- **Sheet rolls (F10).** `sheet-plus.rollFromNumber(ctx, actorId, kind, subject)`: a click rolls
  digitally at once; physical dice remembered or a paired die open the roll window; right-click
  or a long press always opens it.
- **Readers and rolls.** `chat-domain.readerLabel(state, id, lang)` («Livia, Mira · Giocatore»);
  `dice-tray-domain.rollEvent`: «Io e il DM» is owned by the DM and controlled by the roller.
- **Strips.** `ui.scrollIntoStrip` scrolls to the start of a whole tab when it must move right;
  the Table's sub-tabs are one scrolling row.
- **Folded sections that survive a redraw.** `details` fires `toggle` a task after the click, so
  a change made at once would redraw it closed: the inventory reads the live `open` state in a
  capture-phase `change`/`click` listener before any redraw (`view.optionsOpen`, `ruleOpen`).
- **Projection before transmission (privacy P3).** The local blueprint keeps every identity's
  state on one device and filters at render time. A server product must instead send each
  identity only its own projection: other identities' private fields, unseen or hidden creatures
  (today hidden by `fog-vision` with CSS and listed in `data-fv-hidden-tokens`), campaign exports
  (today kept in `state.ext["campaign-data"].exports[].content` for 120 minutes), per-member safety
  profiles and ICS feed tokens never reach another client, and an anonymous signal stays anonymous
  in the audit log too (today the commit's log entry names the `player` controller about 1 ms
  after the signal). Local visibility checks are not backend security.

- **Top layer for menus inside the map (F3, Owlbear room menu).** The session HUD lives inside
  the map's SVG, a stacking context under the turn order, so no `z-index` lifts it: the open
  «Sessione» menu becomes a `popover="manual"` (`showPopover`/`hidePopover`) placed under its
  button (`.session-view-menu[popover]` is `position: fixed`). Use the same for any menu opened
  from inside the map.
- **Visible text.** Research codes (`CRP-`, `R20-`, `FVT-`, `CMP-`, `DDB-`, `VTL-`, `SVC-`) never
  reach a visible string: provenance stays in the documents. Labels use
  `font-variant-caps: all-small-caps`, never `text-transform: uppercase` in any area CSS (DESIGN
  §2); one filled primary button per view (DESIGN §3); a technical explanation sits behind a
  folded «Perché?».
- **Dice tray order (F7, Owlbear).** Who, formula, dice, physical dice, who sees, «Tira»; mode,
  help, DC and stack after it, so «Tira» is never below the fold.

Tests: `tests/final-fixes.test.mjs`; the tests of the areas above; browser probes in the evidence
folder of the report.

## Close review fixes (01/10/2026)

One writer closed the functional, privacy, exposure and findability findings of the three
closing reviews and built the ten census capabilities left open (evidence and decisions:
[final fixes](../../changes/interview-01/final-fixes.md#chiusura-delle-funzioni-01102026)). What
other areas code against:

- **One sight rule (privacy P1-1/P1-2/P2-5, Foundry hides unseen tokens).**
  `fog-vision-domain.unseenTokens(state, sceneId, role, { asParty })` is the set of creatures an
  identity cannot see (manual fog, darkness, walls), empty for whoever runs the session and for a
  scene with neither fog nor vision; cached per state. `tokenSight(state, scene, view)` is the
  computation behind it and behind `fog-vision.model`; `viewOf(state, sceneId, role)` builds the
  view from the state alone; `sightMask(state, sceneId, role)` gives the dark cell runs of a
  picture. Every "does this viewer see this token" check uses it: `table.mjs canObserve` (token,
  turn order, selection), `token-menu.observesToken`, `annotations-domain.observable` (badges,
  distances), `special-moves-domain.observes` (labels), `media-table.canObserve` (portraits),
  `session-view.visibleTokens` (spectator), chat bubbles and speaker links, the sheet-only list and
  `chat.snapshotSource` (the DM's picture is the party's).
- **Hidden creatures (privacy P1-3).** `character-access.hiddenFromPlayers(state, actorId)`: the
  actor or its token on the active scene is hidden. A roll the session runner makes for such a
  creature starts «Solo DM» (`dice-tray` default audience, `sheet-plus-domain.recordRoll`, the sheet's
  click-to-roll commit is private); a Compendium item or spell dropped on it is a private line.
- **DM requests.** `dice-tray.commitRequest(ctx, input, origin)` is the one way a request is sent
  (tray and journal embed): the shared line names only the targets players see and the DC as they
  may read it (C1), carries `logLabel` (TV-92 card), and stays private for hidden-only targets or
  a contest with a hidden side. `input.audience` is `"public"` or `"blind"`
  (`roll-requests.REQUEST_AUDIENCES`, Foundry blind GM roll): a blind request sets
  `attempt.audience = "blind"`, the player rolls and reads no value (`requestGroups` row
  `readable: false`), the answer's line has no value.
- **Fail closed.** `dice-tray-domain.prepareRoll` refuses an audience the role may not use
  (`code: "audience"`) instead of widening it to everyone.
- **Pop-out windows (X-10, Foundry V14).** `table.RELAYED_CONTROLS` names the panel controls that
  act on the map or sidebar (`[data-chat-show-token]`, `[data-chat-request]`, `[data-sv="clean"]`,
  `[data-sv="home"]`); in a `window:` route they post `{type: "d20-table-relay", panel, control,
value}` to the opener, which opens the panel and presses the same control (never a selector from
  the message: `relayedSelector` validates the value). The panel's close button closes the window.
- **Double press on a token (TV-14).** The first press redraws the map, so the browser never fires
  `dblclick`: two left presses on the same `data-actor` within `DOUBLE_PRESS_MS` (400 ms) in Move, by the
  same identity and with at most one map redraw between them (`mapBinds`), open it
  (`openFromToken`); `resetTableView` forgets the last press; the browser's `dblclick` stays as a
  second way in.
- **Search (SV-02/SV-03).** `command-palette.labelIndex(ctx)` indexes, by their labels, the Table's
  sidebar panels and map tools, the core scene commands (rests, time, combat), token-menu commands
  (opened on the viewer's token), the sheet sections and the shops (`Bottega: <name>`; closed ones
  for the DM); `pageControls(ctx)` lists the named controls on screen as «Su questa pagina» (a tab
  or fold opens, any other control is focused and framed, `.cmdk-found`, and waits for Enter).
- **Conditions on the sheet.** `conditions-ui.quickEnd(ctx, actorId, conditionId)` ends every
  endable application in one change with a recorded reason; a controller's chip opens the quick
  list, where an active condition is pressed and one click ends it.
- **New Table capabilities.** Targets (TV-150): `token-menu.targetsOf/toggleTarget/clearTargets`,
  slice field `targets[role]`, keys T and Shift+T, map layer `token-menu-targets`;
  `combat-ui.targetedSelection` starts a single- or multi-target preview on them and a preview
  keeps them as `pinned` (hover previews another creature, «sul bersaglio» executes). Bars
  (TV-152): `token-menu.barOptions/setTokenBars`, token entry `bar2`/`bar3` `{attr, show}`, layer
  `token-menu-bars`. Inline rolls (TV-151): `chat-domain.inlineFormulas`, message `inlineRolls`
  rolled once by `chat.rollInline` before composing; `composeMessage` keeps only results matching
  the text. Video maps (TV-153): `preparation.backgroundKind`, `VIDEO_PATTERN`, `MAX_VIDEO_BYTES`
  (2 MB), `renderSceneBase` draws a muted looping `<video>` (still with reduced motion). Scene
  weather (TV-154): `travel-domain.SCENE_WEATHER/setSceneWeather/mapWeatherFor`, animated layer
  `travel-weather`. Shared device (TV-155): device setting `session-view-device.shared`, cover panel
  `session-view-handoff`, `handoffTo(ctx)`, `turnIdentity(state)`. Karmic dice (TV-156): campaign
  setting `dice-tray-campaign.karmic` (off), `dice-tray-domain.karmicDraw`, slice `karma[role]`,
  record `karmic` and the log line name each rethrow.
- **Macros with code (X-12).** `chat-domain.parseMacro/runMacro/saveMacro/deleteMacro/macrosOf`:
  a line language (tira, imposta, se … allora, di, sussurra, `@attributes`), parsed by its own
  parser, never evaluated as JavaScript; at most 30 lines and 6 rolls; slice `macros[role]`
  (private, local). `chat.runMacroNow` posts the result with every roll as inline rolls.
- **Account (SV-56, SV-28).** `account.beginTwoFactor/confirmTwoFactor/disableTwoFactor/
verifySecondStep/demoCode` (simulated authenticator, 10 single-use recovery codes; `signIn`
  returns `{secondStep}` and keeps the session signed out until the code);
  `account.declareAge/requestParentConsent/answerParentConsent/agePolicy` (only the age band is
  kept; consent age 14). `community` reads `agePolicy` through its optional neighbour.
- **Other seams.** `session-view` chip `not-started` («Avvia ora», «Non ora») and command
  `session-view.lifecycle`; `encounter-builder` dock panel `encounter-builder-dock-load`
  («Carica statistiche» in the action bar of a creature with no attack); builder level up:
  class spell grants carry `levelUp {from, to, cantrips, known, onSheet}` and the warning
  `levelup-spells`; build sections carry `warnings` (the reason of «Da rivedere»);
  `levelChanges().spellsGained`; the action bar's dice mode follows `dice-tray.dice`; the
  Magic Missile preview names its darts and the assigned count; creature loot started from the
  token gets the stat block's gear; campaign editors re-enable their main button on any edit.

Tests: `tests/close-fixes.test.mjs`; the tests of the areas above; browser probes in the evidence
folder of the report.

## Regressions around the close review (01/10/2026)

Browser journeys, not unit tests, found these; they are recorded so the next writer starts from
them (evidence outside the checkout, `~/Workspace/Codex/d20-blueprint-evidence/2026-10-01/`).

- **Full run after the final fixes, before the closing reviews** (`regress/results-sweep1.txt`):
  184/189 green, 1497 `passed`. Red: `rest-time`, `b61-table-structure`, `spells-plus`,
  `spells-plus-review`, `w2a1-shell`.
- **After the close review fixes**: the 40 journeys of the touched areas are green
  (`close-fix/logs/journeys.log`). Rerun of the five reds (`feature-map/logs/journeys.log`):
  `rest-time` and `b61-table-structure` green (timing on a loaded machine); still red and not
  diagnosed: `spells-plus` («closed message missing»: after confirming a preparation the spell
  window does not show «Preparazione non modificabile ora»), `spells-plus-review` («the player
  is not told who can grant an exception»: no «chiedi al DM»; both depend on whether the
  preparation window is open, `spells-plus.mjs` `window.open`) and `w2a1-shell` (at 1440 a
  campaign section is neither in the rail nor reachable through `[data-campaign-sections]`,
  which is not visible at that width). Diagnose each test-first: decide whether the behaviour or the
  journey's expectation is out of date before changing either.
- **What the close fixes changed for checks.** A creature the viewer cannot see is **not drawn**
  (no badge, distance row, label or portrait in the DOM), instead of being hidden with CSS:
  checks accept `count() === 0` or a hidden element (`fog-vision-journey`,
  `fog-vision-review-journey`). The session chip's button is «Avvia ora», so it no longer shares
  the accessible name «Avvia sessione» with the «Sessione» panel. A double press opens the sheet
  only for the same identity with at most one map redraw between the presses, so two separate
  clicks on the same token in a journey are not a double press (`knowledge-journey`). Journeys
  that read sample files from their evidence folder need those files copied first.
- A full run of all 189 journeys after the close fixes has not been done yet.
