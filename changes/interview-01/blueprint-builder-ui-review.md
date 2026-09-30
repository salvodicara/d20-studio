# Independent builder UI review — Increment 5

Date: 2026-09-23. Reviewer: `/root/blueprint_characters`, inherited model/effort.
Worktree: `~/Workspace/Codex/d20-studio-interview-01`.

Scope: `character-builder.mjs`, `character-builder.css`, `tests/character-builder-ui.test.mjs`, with read-only checks of the already-established root navigation/commit/dialog contract. The reviewer did not author the UI and did not review their own character-building domain implementation. No source/test changes, browser ownership, catalogue expansion or installs.

## Reviewed initial snapshot

| File                                                   | SHA256                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| `design/blueprint/character-builder.mjs`               | `e8fbcd022bffedea85ff50279e1159295b80f6c67ae13141c72de411d7ebdcfc` |
| `design/blueprint/character-builder.css`               | `714c2a95963c77edce425989d3b4bcc2570f03f648f49ede6257ae0418099266` |
| `design/blueprint/tests/character-builder-ui.test.mjs` | `270198dadc58b90c646c462ef5b8b183dff0171614b555697017d73c8e96e849` |

## Findings

### R1 — P2 — obsolete spell grants become impossible to remove from the current section

Location: `character-builder.mjs:599–633`, selected/prepared handlers at `1071–1079`.

Reproduction using exported renderer and bound controls:

1. Create a private Wizard 1 draft with Shield selected and prepared under `class:wizard`.
2. Change the class selector to Fighter and save.
3. Open Spells. The previous selections remain stored, causing `spell-source`, but the UI maps only current grants. It renders no Shield selection, preparation checkbox or obsolete-grant removal command.

The user cannot reconcile the reported error in the indicated section. Returning temporarily to the old class to uncheck entries is an undisclosed workaround, not a working revision flow. Related cases are deselecting a prepared spell while retaining its hidden preparation record and deleting a custom spell while keeping references to its removed definition.

Expected correction: expose stale grant/definition records with an explicit removal/reconciliation command, and keep selected/prepared references coherent when the user removes a spell. Do not silently transfer a spell to another granting source.

Node reproduction result: `class changed, old class:wizard Shield still saved and blocking, no Shield selection/preparation removal control rendered`. This came from real `bindCharacterBuilder` handlers, not from duplicating their logic.

Status: **closed after independent reproduction on the corrected snapshot below**.

### R2 — P2 — changing background locks an invalid previous ability increase

Location: `character-builder.mjs:335`.

Reproduction:

1. In Origin choose Criminal with background increases DEX +2, CON +1.
2. Change the background to Sage through its bound select handler.
3. DEX +2 remains in `origin.backgroundBonuses`, but the DEX field is now `readonly` because Sage does not grant DEX. Preview reports `background-bonus`.

The currently displayed UI cannot clear the invalid increase. This prevents a routine change of mind without switching back to the old background first.

Expected correction: retain an explicit way to clear/reassign incompatible previous increases when the source changes, while keeping ordinary disallowed empty choices unavailable.

Node reproduction asserted both the blocking validation error and generated markup `data-builder-path="origin.backgroundBonuses.dex" … value="2" … readonly` after the actual change/save handlers.

Status: **closed after independent reproduction on the corrected snapshot below**.

### R3 — P2 — rejected physical-roll input loses the valid faces already entered

Location: `character-builder.mjs:1014–1033`; test blind spot at `tests/character-builder-ui.test.mjs:195–206`.

Reproduction:

1. Start a physical 4d6 ability group.
2. Enter `6, 5, 3, [empty]` and click Record natural faces.
3. The handler collects those values, then unconditionally calls `persist(ctx)`. Root's commit contract rerenders the page immediately. `renderRoll` creates empty input fields. Only afterwards does resolution reject the missing face.

Observed result: pending request retained, zero accepted rolls, error `Enter all valid natural die faces.`, but current input fields are `['', '', '', '']`, and the builder reports no unsaved changes. The player must re-enter valid physical evidence because an incomplete field erased the rest.

The existing test passes because it retains the old `faces` objects after a render, fills their fourth value, then invokes the old callback. A real DOM replacement has already detached those fields. The independent harness reproduced root behaviour by reconstructing inputs from each new HTML render.

Expected correction: preserve pending input values through rendering/error handling, or validate before the destructive save/render while ensuring draft changes remain safe. The regression must operate on fresh post-render controls and demonstrate that fixing only the incomplete field succeeds.

Status: **closed after independent reproduction on the corrected snapshot below**.

## Checks and limits

- `node --test design/blueprint/tests/character-builder-ui.test.mjs`: **16/16 pass** on the initial hashes; these tests do not cover the three failures above.
- Read-only review covered dirty-session save/error restoration, navigation prompts, current role checks, private commit options, review-key application, operation IDs, section reachability, source escaping and source links.
- Independent dirty-navigation harness passed: a concurrent saved draft revision makes Save and continue fail without invoking navigation or losing unsaved local input; explicit Discard unsaved then continues exactly once.
- CSS includes desktop and small-screen layout rules and focusable section headings. This review makes no new pixel-layout or touch-runtime claim; root owns browser verification.
- No additional P1/P2 identified in the inspected entry, permission or source-handling paths. This statement is limited to the reviewed UI, not complete CRE/ADV coverage or the D&D catalogue.

## Final recheck — closed

The author corrected the UI and added regressions without changing the domain or CSS. The reviewer independently repeated all three failures through the real bound handlers:

- R1: the changed-class spell now has an explicit removal command. It removes both the stale selection and preparation and clears the corresponding source error.
- R2: the old incompatible DEX increase stays editable. Clearing it writes zero, so an empty legacy increase cannot become another locked invalid value.
- R3: invalid physical input remains `6,5,3,empty` after both rejection and a fresh render. Reacquiring the replacement controls, entering only the missing `1`, and submitting accepts exactly `[6,5,3,1]` once.

Fresh focused command: `node --test design/blueprint/tests/character-builder-ui.test.mjs` — **19/19 pass**. No remaining P1/P2 in this reviewed scope.

| Corrected file                                         | SHA256                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| `design/blueprint/character-builder.mjs`               | `0e288337ddb8915edd8669bfa54800d56c18670e27c70b8a0fda0b2ad00b6d7b` |
| `design/blueprint/character-builder.css` (unchanged)   | `714c2a95963c77edce425989d3b4bcc2570f03f648f49ede6257ae0418099266` |
| `design/blueprint/tests/character-builder-ui.test.mjs` | `99fbc7a62abdb2f74f52d733ca87ee5ea4136ec9149b4a77e0b2e4403c447e48` |

The approval applies to this corrected file snapshot, not an unreviewed future edit. No commit SHA is claimed in this dirty worktree. Broader catalogue and product completeness remain outside this review.
