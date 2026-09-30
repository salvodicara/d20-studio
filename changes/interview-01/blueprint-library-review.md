# Increment 6 — independent Library UI review

Reviewer: `/root/blueprint_characters`, inherited model/effort. Worktree: `~/Workspace/Codex/d20-studio-interview-01`. Review ownership is this report only; no Library UI, CSS, shell or UI test implementation was edited by the reviewer. The reviewer authored the homebrew domain, which is explicitly outside this independent review and was reviewed separately by `/root/review_journey`.

Verdict at the final hashes below: **the two reproducible UI findings are closed; no remaining P1/P2 identified in this bounded review**. This is not acceptance of the complete blueprint, a visual polish review, a human playtest or a claim of production security.

## Scope and method

Read `library.mjs`, `library.css`, its UI tests, and the shell's navigation, hash-change, role-change and unload guards. Checked draft save/discard/apply/error paths, typed return contexts, private-role projection, exact revision choices, permissions and delayed imports. The UI harness rebuilds controls from rendered HTML and rebinds handlers; independent probes used that harness without changing test files. Root owns all actual browser interaction, downloads, screen sizes and keyboard verification.

Applied the installed Impeccable audit guidance. Its detector returned `[]` for these two UI files. That is only a heuristic result: no numeric accessibility/contrast score was inferred. Native labels, buttons, selects, alerts and shared focus styling are present in the reviewed source, as are narrow-width layout rules. Content is escaped; bilingual labels and local revision date formatting are visible in code. Full assistive-technology and visual checks remain outside this source review.

## Findings and independent recheck

### R1 — P1: delayed import discarded unrelated unsaved work — closed

Initial candidate: `library.mjs` SHA-256 `477110772bef09f36aeb26d2f34d6193261db7fbb60fa30f86ff4dcfd4bd42d8`.

Reproduction: start a file read whose `text()` promise has not resolved; create another private feature draft and enter an unsaved name; resolve the earlier read. The original handler captured the role but not the request/view lifecycle. It committed an import, cleared the shared editor session, and navigated to the import. The shell then saw no dirty session to protect. Independent output showed `dirtyBefore:true`, `dirtyAfter:false`, a different current draft, and the unsaved name absent from both saved state and visible controls.

The corrected import handler (`library.mjs:734`) captures generation, route, role and editor session. Rebinding or resetting the view invalidates old reads; both completion and failure check that lifecycle before mutation or navigation. Independent recheck at the final candidate kept the original draft, dirty flag and exact unsaved text, with no import commit. An additional identity-away-and-back probe resolved obsolete invalid JSON: zero drafts, zero stale errors and no navigation occurred. The test suite also covers a newer import superseding an earlier read and navigation away before completion.

### R2 — P2: contextual import lost its destination — closed

On the initial candidate, entering the Library from a builder section and importing valid content created a draft with `returnTo:null`. Applying navigated to the personal collection without the destination or a return control. This broke the import-then-choose journey despite preserving the imported definition itself.

The UI now passes its captured typed return context into the import command, carries it on the edit route, and retains it after Apply. `renderEditor` exposes the same return control as the collection/detail. The companion domain support was authored by this reviewer and independently checked by the domain reviewer; this review covers only the UI's use of that contract.

Independent UI recheck used a sheet return containing `actorId`, `tab` and an exact `instanceId`. After JSON reload and Apply, the saved draft and final route both retained the identical target and the return control was present. Author tests also cover builder grant context, preview cancellation, compatible typed selection and sheet assignment after import. Import still requires Apply and does not automatically choose or assign a definition.

### ACL UI adaptation — checked

The owner-facing access command is shown using `permissions.canManageAccess`. When `canShare` is false, existing read/editor access remains removable or reducible, while new grants and promotions are disabled with an explanation. The dialog reads current ACL before presenting it and submits the normal domain command, which revalidates authority. The UI regression performs editor-to-reader downgrade, full revocation and then checks disabled regrant/promotion controls. Source management remains distinct from collection, campaign enablement and actor assignment.

## Verification

- `node --test design/blueprint/tests/library-ui.test.mjs design/blueprint/tests/homebrew.test.mjs design/blueprint/tests/homebrew-integration.test.mjs`: **54/54 pass**, including 20 Library UI tests. The 25 domain tests are regression context, not independent review of the reviewer's own domain.
- Independent, non-persisted handler probes: delayed import versus another dirty draft; role changed away and back before an obsolete read failed; exact-copy return context across JSON reload and Apply. All produced the expected preservation/no-mutation results.
- Shell guards were reread at the final app hash: ordinary navigation, browser hash changes, role switching and unload consult the dirty state; role change closes dialogs and resets Library sessions. No replacement browser session was used.
- UI source and tests were modified only by their author. Root separately verifies actual browser journeys and file behavior.

## Reviewed file identities

| File                                           | SHA-256                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------ |
| `design/blueprint/library.mjs`                 | `f13ac7e3fbb8ca037a7e5e457c2abfb7ad7731993270d83e0cd26741d12106c0` |
| `design/blueprint/library.css`                 | `06d74223751c37fcd1be661417cab8cfb938a86c9f10b2aaf3b320b18dec1626` |
| `design/blueprint/tests/library-ui.test.mjs`   | `075c47a082288b82caf0e43215980f77126d4fb0983681db4d3fcdcb618f6892` |
| `design/blueprint/app.mjs` — shell guards only | `f96aac841ae55d364796c5586590472763025813c349b65854c68408890637bd` |

No source changes are proposed by this report beyond the two corrections already made and independently rechecked. These identities define the reviewed snapshot; later semantic changes require their own review.
