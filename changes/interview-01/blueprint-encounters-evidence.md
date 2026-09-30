# Scene tokens and prepared encounters — blueprint increment

23/09/2026. Writer `blueprint_encounters`, existing interview worktree,
owner-selected model and effort unchanged. Local demonstration only. Reserved
files: `design/blueprint/preparation.mjs`, `preparation.css`,
`tests/preparation.test.mjs`, this evidence. Other modules belong to the
coordinator and other workers. No installation, deployment, production changes,
new external assets or paid service.

## Delivered behavior

The existing private scene editor now connects preparation to actual table
actors and tokens. The DM chooses an existing campaign creature, arms Place on
map, and clicks a freely chosen point. Existing tokens can be dragged; Escape
cancels an in-progress drag. The token list provides selection without precise
pointing; map focus supports arrow keys, and Enter places an armed creature at
the centre before keyboard adjustment. Grid snapping follows the scene setting
and offsets, separately from whether grid lines are visible. Preparation never
spends movement.

Create NPC captures a name, HP, AC and speed. The dialog declares the synthetic
ability-score defaults and incomplete ability repertoire. Duplicate NPC copies
current statistics/resources into a distinct actor identity, so later damage
and inventory changes are independent; it does not promise to reconstruct an
unknown original stat block. Private personal-plan fields are not copied.
Remove token removes only that scene representation and its prepared initiative
entry, preserving the creature sheet.

All these edits stay in the existing scene draft. Saving commits new actors,
token positions and prepared encounter together. Discard leaves shared state
unchanged. The existing active-scene confirmation now names token changes too.
Metadata-only saves still preserve token positions changed at the table; a draft
that changes tokens rejects a newer table movement instead of overwriting it.
Save does not reveal, activate or begin combat. Browser-storage and offline
behavior remains the shared shell's responsibility.

Incontro preparato / Prepared encounter exposes participant checkboxes, natural
d20 and explicit total bonus, digital d20 rolling, arithmetic breakdown, sort by
initiative and Earlier/Later controls. Missing dice remain missing; no zero is
silently substituted. Manual natural results record physical mode. Sorting is
explicit and stable for ties. Copy identifies the order as recorded by the DM
after table adjudication, not an automatic new D&D tie rule. The final arranged
order survives saving. Initiative bonuses are entered rather than inferred from
an incomplete character sheet.

The saved-scene actions call `ctx.startEncounter(sceneId)` when the shell
provides it. The shell owns the explicit activation-and-start dialog. Existing
Activate scene remains a separate command. Beginning an encounter requires
complete saved participants/rolls and an active matching scene, rejects an
already active fight, and refreshes only the actor whose first turn starts.
Each actual start creates a new encounter identity; prior turn consumption
cannot collide with round 1 of a later fight.

## Integration API and state

- `scene.encounter = {name, participants:[{actorId, natural:null|1..20,
bonus:-100..100, mode:'physical'|'digital'}]}`. Array order is the explicit
  prepared order. One prepared encounter per scene is this increment's current
  limit, not a product exclusion.
- `getPreparedEncounter(state, sceneId, role)` requires DM and returns
  `{sceneId,name,ready,reasons,order,participants}`. Incomplete plans have
  `ready:false`, with `no-participants` or `initiative-incomplete`; reading does
  not mutate state and returns copies of rows.
- `startPreparedEncounter(state, sceneId, role)` requires no active combat,
  the matching active scene and a ready plan. Creates
  `{active:true,sceneId,encounterId,round:1,turn:0,order,initiative}` and refreshes
  only the first actor. The shell wraps this inside shared atomic commit/log.
- `saveSceneDraft` accepts an optional fifth `pendingActors` object. New NPCs
  and cloned NPCs are staged there until save. Existing actor resources are
  never rewritten by a scene save.
- `createSceneNPC`, `duplicateSceneNPC`, `placeSceneToken`, `removeSceneToken`
  are role-checked domain helpers, used against the staged editor state and
  exercised directly by tests. Same actor has one token in each scene in this
  increment; duplicate NPC creates another independent actor. Multiple linked
  representations remain a gap.

## Pattern provenance

Primary documentation revisited **23/09/2026**, without login or competitor
runtime. These are published capabilities, not a human usability study or proof
of optimality. Pages expose no uniform immutable release number.

| Decision                                                                                          | Published precedent                                                                                                                                                             | Adaptation and limit                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Create a creature separately from its scene representation; duplicate as independent identity     | [Foundry Actors](https://foundryvtt.com/article/actors/) describes actor creation, sheets, duplication and prototype/placed token separation.                                   | The blueprint uses a compact custom statline and stages creation with scene save. Foundry's system-specific sheet/autosave is not claimed as our implementation.                                                                                                                                                                                                                     |
| Directly place/select/move tokens; keep independent generic NPC resources                         | [Foundry Tokens](https://foundryvtt.com/article/tokens/) distinguishes scene tokens, coordinate/movement controls and linked versus independent resources.                      | This increment has free click placement and direct drag plus keyboard alternatives, with explicit NPC actor duplication instead of a complete prototype-token inheritance system. Removing a token retains its actor.                                                                                                                                                                |
| Choose combatants, prepare initiative, then start; expose numeric editing and corrective ordering | [Foundry Combat Encounters](https://foundryvtt.com/article/combat/) separates adding combatants, initiative rolling and Begin Combat; includes manual initiative configuration. | Physical natural-plus-bonus follows the owner's physical-dice requirement. The explicit DM ordering controls adapt manual editing without inventing a default D&D tie-break. Our combined activation/start dialog belongs to the shell; saving remains separate. Multiple simultaneous encounters, hidden/defeated combatants and participant-owned initiative requests remain open. |

Existing `scene-editor-research.md`, NAV-06 and preparation page remain relevant
for scene/configuration, reveal and activation separation. No Foundry source
code, art or creature text is copied. The geometry bases remain authored
synthetic examples; background artwork does not create collision geometry.

## Verification and remaining review

TDD: the initial seven new behavior cases failed against absent implementations
(then no-op stubs), followed by passing implementation; a later unique-encounter
identity case failed before its fix. `node --test
 design/blueprint/tests/preparation.test.mjs`: **19/19 passed**. Cases include
existing privacy/configuration guards, independent NPC health/inventory,
snapping, token-removal scope, token conflict, atomic draft save, no auto-start,
missing initiative, inactive-scene and role rejection, first-turn-only refresh,
and unique later-encounter identity.

A concurrent full-suite snapshot was 50/52: only the other worker's in-progress
combat missile distribution and ranged-proximity tests failed. Reported to the
coordinator; no edits made to that worker's module. The coordinator reruns the
integrated suite when those changes land. Syntax and formatter checks pass for
this module. Browser and independent review are the coordinator's next checks;
this note does not claim those have run.

Suggested browser journey: DM → Preparazione → create a blank scene → save →
choose Livia → Place on map → click freely → create a custom scout → click freely
→ select scout → duplicate → click another point → drag and Escape, then drag
and release → choose all three as encounter participants → enter one physical
d20/bonus, digitally roll another → sort, reorder tie → save → activate and start
through the shell → inspect the same positions, independent HP and initiative
at the table. Reopen saved preparation without auto-restarting; remove one token
and confirm that its actor remains. Test draft discard, offline save rejection,
active-scene confirmation, EN labels and keyboard/mobile placement separately.

Remaining scope includes multiple encounters per scene, initiative requests to
players, delayed/held initiative, hidden/defeated combatants, complete NPC
editors/stat blocks, actor/token prototype link controls, reusable encounter
libraries, live-combat roster corrections, fog/visibility, groups and scene
geometry. This increment is not completion of F-005/F-012/F-036/F-050/F-060.

## Review correction — durable initiative results

The independent review found that digital initiative lived only in the scene
organization draft: rerolling silently replaced a natural result, and discarding
the draft erased already rolled dice. Fixed in the preparation module using the
coordinator's `ctx.commit(..., {visibility:'private'})` audit extension. This is
still a shared mutation and remains blocked offline; `local:true` is not used.

`state.initiativeRolls` now retains individual entries with immutable IDs,
scene/actor identities and name snapshots, natural d20, explicit bonus, total,
digital/physical mode, controller, private visibility, timestamp and previous
entry reference. Digital generation occurs inside the commit callback, after
the shell's offline check. The result is immediately durable independently of
the scene draft. The UI changes Tira d20 to Rilancia d20, shows previous/new totals
on a reroll and keeps the complete initiative history in both the scene editor
and preparation collection. Thus even dice from a discarded _new_ scene or NPC
remain visible to the DM. The discard dialog names this distinction.

Entered physical values remain form data until Save preparation; that boundary
is stated beside the initiative controls. Saving valid physical values adds a
history entry. Subsequent metadata saves do not duplicate it. Changing a
recorded bonus or natural result adds a new entry, retaining prior evidence.
Organization and saved actor/token data are unchanged by the immediate digital
roll commits. Shared audit visibility/undo policy belongs to the shell/store.

Three meaningful regressions failed before the fix, then passed: digital
roll → explicit reroll → discard preserves both results and collection history;
offline rejection produces no new roll and preserves the draft; physical save
records the result once and a later metadata-only save does not add duplicates.
Preparation tests: **22/22 passed**. Coordinator browser/review follow-up remains
separate evidence; the worker did not operate the shared browser.

Integrated suite after the correction and other workers' updates:
`node --test design/blueprint/tests/*.test.mjs` **65/65 passed**. This supersedes
the earlier concurrent 50/52 snapshot; the two formerly failing combat cases
now pass. No shared-browser operation was performed by this worker.

## Review correction — visible reversal without evidence reuse

Coordinated with the separate store writer. Initiative entries now retain the
immutable result while undo marks `status:'reversed'`, `reversedAt`,
`reversedBy` and `reversedByLogId`; no status means accepted for existing data.
The preparation history displays **Annullato — risultato conservato / Reversed —
result retained** ahead of the original roll/reroll label. The editor marks a
selected reversed result as unusable. Saving a stale row that still references
its reversed `rollId` fails before any scene or ledger mutation. Encounter
readiness also rejects that reference, so starting cannot reuse it. An explicit
new natural input clears the reference; saving it or explicitly rerolling
creates a new entry rather than reviving the reversed ID.

Two further regressions failed before this change and pass afterward: reversed
result cannot be reused by Save or Start, while a new explicit physical entry
gets a new identity; history retains the arithmetic and exposes the reversal.
Preparation tests: **24/24 passed** before the coordinator's runtime pass.

A new reproducible browser journey is available at
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-23/encounter-lifecycle.js` for
the coordinator's owned browser. It uses actual UI controls and gestures,
including the visible demo reset; it only reads persisted state for assertions
and never injects it. It covers custom NPC creation/independent clone, direct
placement, removal versus sheet retention, immediate digital roll, explicit
reroll, discard retention, undo with visible reversal, offline rejection,
physical values at save, and activation with the saved roster/order. It captures
`encounter-history-desktop.png`. Writing/checking the script is not a browser
pass; execution and rendered evidence remain the coordinator's responsibility.

## Coordinator runtime result and conceptual-page synchronization

The coordinator reported `encounter-lifecycle.js` **PASS: 11 checks, errors[]**
on the live integrated blueprint. The CLI expression wrapper required removal
of the trailing semicolon; the script itself had passed JavaScript syntax
checking. The worker did not operate the coordinator's browser. The successful
run covers the assigned encounter lifecycle, including retained/reversed
initiative history, and does not establish exhaustive device coverage.

`docs/interview/pages/preparation.md` now appends the dated increment-2 raccordo:
actual controls, NPC/actor identity, token placement/removal, physical/digital
initiative boundaries, explicit rerolls, durable reversal, save/reveal/activate/
start separation, offline behavior, source provenance and remaining gaps.
Pre-existing sections and the coordinator's NEXT were preserved. This is a
synchronized partial contract, not complete owner approval.
