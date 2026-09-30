# Increment 6 — independent homebrew domain review

Reviewer: `review_journey`, inherited model and effort, 23/09/2026. Worktree:
`~/Workspace/Codex/d20-studio-interview-01`. This report is the reviewer's only
written file in this review. Implementation and tests belong to other authors.
This is a dirty local prototype review, not approval of a commit, the entire
homebrew contract, production security or the complete blueprint.

## Scope and status

Read `homebrew.mjs`, its tests and domain evidence against
[HOMEBREW_FLOW](../../docs/interview/HOMEBREW_FLOW.md) and
[the primary-source research](blueprint-homebrew-research.md). Read the root
bridge and its tests as dependency context; a different reviewer owns the
bridge review. Library UI review belongs to `blueprint_characters`; no browser
was used by this reviewer.

The review covers immutable revisions, independent copies, exact campaign
enablement, private drafts and source/dependency access, assignment/update,
resource reconciliation, source capabilities, local import/export and retries.
The author's initial readable-but-unenabled comparison fix was included:
comparison remains possible while applying requires current authority and exact
revision availability. No automatic enablement or sharing is introduced.

**Result:** three reproducible P2 findings, all independently rechecked as
fixed in the snapshot below. No remaining P1/P2 was found in this bounded
domain review. This conclusion does not replace the separate UI/bridge review
or the coordinator's browser checks.

## Findings and recheck

### R1 — new assignment could disclose a revoked source to another sheet reader

Initial location: `homebrewAvailability` / `permissions`, consumed by
`materializeHomebrewCopy` and `mergeInstance` in `homebrew.mjs`.

Independent Node reproduction: the player creates a feature, shares its exact
revision with DM, DM enables it, then the player revokes DM. A new assignment
to shared Livia was still allowed: `sourceReadableByDM=false`,
`actorVisibleToDM=true`, `canApply=true`. Applying put the complete new text on
the shared sheet. This was a new acquisition after revocation, not preservation
of an already-owned copy. The existing campaign-connection guard did not cover
this alternate entry point.

**Rechecked fixed:** availability with `actorId` validates the source and its
dependencies for every current reader of the actor. New materialization and
assignment fail after revocation, including a previously opened draft. A
readable update still returns a comparison but cannot apply while the audience
lacks access. Private personal use remains possible. Independently executed
domain and bridge tests passed **31/31** at this correction checkpoint.

### R2 — owner could not revoke an existing ACL when sharing was restricted

Initial location: `shareHomebrewRevision` and the permission projection in
`homebrew.mjs`.

Independent Node reproduction: player creates a revision and delegates DM as
editor; DM makes a new revision with `source.rights.share=false`. The new
revision gives DM explicit reader/editor access. The owner then calls
`shareHomebrewRevision(..., {readers:[],editors:[]}, 'player')`; it fails with
`Sharing unavailable` because the function requires `canShare` even when only
removing permissions. The owner cannot revoke that new revision's editor.

Necessary distinction: authority to manage/reduce existing access versus
capability to grant additional access. Removing access need not solve the
separate future policy for retained copies.

**Rechecked fixed:** `canManageAccess` is distinct from `canShare`; only the
owner manages the ACL. With sharing restricted, an existing editor can be
downgraded to reader or removed. New access and promotion back to editor are
rejected. The projection exposes the owner-visible ACL without granting that
authority to the external author or delegated editor. Verified with the new
regression and an independent Node reproduction.

### R3 — restoring the same resource silently discarded preserved corrections

Initial location: `mergeInstance` resource history and field reconciliation in
`homebrew.mjs`.

Independent Node reproduction: source resource has maximum 3/manual recovery;
the live instance has maximum 5/short-rest recovery and 2 uses spent. The next
revision removes that resource. In the update choose `keep-local` for maximum
and recovery plus `retain-history`. The removed row correctly retains those
corrections in `manualOverrides` and `resourceHistory`. Updating back to a
revision containing the same resource ID then proposes maximum 3/manual,
deletes the overrides and allows Apply without conflict. Only the 2 uses spent
survive.

The previously selected corrections must survive or receive an explicit
conflict resolution when the same resource returns. They must not be carried
to an unrelated resource identity.

**Rechecked fixed:** retained resource history includes the original field
baseline and correction provenance. Reintroduction of the same resource
preserves maximum/recovery when the definition has not changed; competing
source changes create explicit conflicts. A different resource does not
inherit those corrections. Independent reproduction also verified mixed
`keep-local`/`use-new` choices after JSON reload, unknown consumption remaining
`null`, and the immutable original source staying unchanged.

## Bounded conclusions and policy distinction

The existing acquired actor snapshot may survive advancement after source
revocation if its instance identity and exact revision remain unchanged. That
does not authorize reading new source text, another acquisition, a revision
update, or sharing with a new audience. This distinction is consistent with
HB's independent copy and no silent loss of progress; full revocation and
distribution policy remains incomplete.

The domain's current revision data are copied at publication, projection,
export and materialization; definition edits do not mutate existing instances.
Import attribution does not grant the external author local access. Import
does not enable campaigns or assign actors; same-identity/different-data
collisions are rejected. Applied private drafts retain their result for retry
after JSON reload. Review keys are re-evaluated against relevant live state.

Global undo uses a coherent previous store snapshot. No new archival system
is required by this review: restored states must retain complete acquired
copies and avoid operational references to missing definitions. An unused
revision may disappear with the snapshot that created it. This is distinct
from already required persistent dice/consequence evidence. No claim of
complete import migrations, distributed undo or remote authorization is made.

## Verification limits

Independently executed:

- `node --test design/blueprint/tests/homebrew.test.mjs design/blueprint/tests/homebrew-integration.test.mjs`:
  **34/34 pass** (25 domain, 9 root bridge tests).
- Additional in-memory Node reproductions of the three failures before their
  fixes, then ACL reduction/no-regrant and retained resource conflict resolution
  with JSON reload after their fixes. No additional test file was written.
- Read the typed import `returnTo` addition and its regression: importing does
  not perform the contextual selection before Apply; its consumer remains
  responsible for revalidating the typed destination.

Actual SHA-256 values at the final domain recheck, not a Git candidate SHA:

| File                                                   | Scope                                                           | SHA-256                                                            |
| ------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------ |
| `design/blueprint/homebrew.mjs`                        | Reviewed domain                                                 | `61af01e0248514310f13cd0e10118088639df3247b692cfabcd69a6e4278e989` |
| `design/blueprint/tests/homebrew.test.mjs`             | Read and executed domain tests                                  | `e9622b9a58393b770f384530d780983770547b5932cdf14f46a7da5c656b3cab` |
| `design/blueprint/homebrew-integration.mjs`            | Dependency context; separately reviewed by another agent        | `765e02bd3e6c5b8e9e457e6129f54aafcee59120e9ba05f45b186a93a0673da6` |
| `design/blueprint/tests/homebrew-integration.test.mjs` | Read and executed bridge tests                                  | `1127ddbb5a8567ec19cdbac719ea5a69c119864a5e139b55dc6fc2079720250d` |
| `design/blueprint/character-access.mjs`                | Read actor permission dependency                                | `070fb85f35dfe9040500f53804e1cacef6a4375a84b37690b51dd4ae715f5a9a` |
| `design/blueprint/character-build.mjs`                 | Runtime dependency, not a renewed whole-module review           | `02ead4c0e00adc146efa5dada0ea60d8b7fca1aade37e31a82329025a03b1828` |
| `design/blueprint/state.mjs`                           | Store/undo dependency, read only the relevant snapshot behavior | `1f9f3152da9f5a685d197fc95ea7f48f193b6f95a1052705b849471329ee8a0b` |

Independent checks used Node only, including the reproductions above. No
browser, network service, private account or competitor runtime was exercised.
The source research distinguishes published capabilities from adaptations.
Classes and other unsupported consumers, automated activities/passive effects,
publication, complete revocation policy and remote collaboration remain open
product work; their explicitly stated absence is not counted as a defect in
this bounded increment.
