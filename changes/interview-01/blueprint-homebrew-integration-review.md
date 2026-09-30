# Increment 6 — independent integration review

23 September 2026. Reviewer `/root/blueprint_characters`, inherited model and effort. Read-only source review in `~/Workspace/Codex/d20-studio-interview-01`; only this report written. No browser, installs, commits, real data or modifications to another author's source/test files.

Scope: coordinator-authored library integration and connector changes in the builder, sheet and app. The homebrew domain written by this reviewer is explicitly **excluded** from the independent verdict. The previous character-builder domain was also authored by this reviewer; this review addresses the coordinator's increment-6 permission checks and instance retention changes, not an independent reapproval of increment 5.

Status: **R1 and R2 closed after independent recheck. No remaining P1/P2 findings in this bounded integration review.**

## Candidate read

| File                                                   | SHA-256 at initial review                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| `design/blueprint/homebrew-integration.mjs`            | `4bcc0e5326d3c1a4ed15e56266056fbd9ee423534d6808222c19026bfae0e0ba` |
| `design/blueprint/character-build.mjs`                 | `5a31258f7c42f4c2f86d349c5832f40371e297602b6749a4380b6934066cc671` |
| `design/blueprint/app.mjs`                             | `4a9aa379efcf6c78e184c80234fff8867791d7c0bf588738d39c07f9fd081246` |
| `design/blueprint/characters.mjs`                      | `766bd617c42fa2650b7cb898a0388b0f5a2d0556f9cdde77bf79788a0d3a7bee` |
| `design/blueprint/character-builder.mjs`               | `fa304869c5eab73ed01374bc8ab2fc0386b7e75be050bd519fbcd1ecda091804` |
| `design/blueprint/tests/homebrew-integration.test.mjs` | `a3b4703b1e1688dc33937eb289e35b62d044566ca40648c1385c07914279074c` |

The increment-5 manifest provides the previous hash boundary; the reviewed source seams are `retainedInstanceEdits`, `checkHomebrew`, spell instance construction, library choice/return routing, sheet connection and `syncBuildSource`. This dirty snapshot is not an approved commit SHA.

## R1 — P2: removing and reselecting a spell resets the same resource

Locations in the initial candidate: `character-build.mjs:455–460`, `character-build.mjs:1640–1645`, `character-build.mjs:1669`.

`retainedInstanceEdits` finds a removed instance in `featureUsageLedger` only for features. The new homebrew spell path retains consumption while the spell is still on the actor, but `Apply` removes a deselected build-managed spell without retaining its resource state. Reselecting the same custom spell under the same grant then reads the definition's old `used:0` again.

Independent Node reproduction, using only the public commands and a synthetic Livia fixture:

1. Make Livia personal, create a homebrew cantrip with resource `{id:'uses',max:3,recovery:'manual'}`.
2. Add it to a revision draft under `class:wizard`, apply, and record the live instance's actual `used=3`.
3. Open another revision, deselect that spell while retaining the custom definition, and apply.
4. Open another revision and reselect the same catalog ID under the same grant.

Observed preview: `canApply:true`, no errors, identical instance ID before and after, **`used:0` instead of `used:3`**. Applying would refill the same resource without a rest or correction. This violates the existing ADV preservation rule: changing choices does not make an old resource new. It does not require implementing a new catalogue or spell effect.

Requested correction: preserve spent/unknown uses and instance corrections for the removed spell identity, then reuse them when that same identity is reintroduced. Keep different grants' resources separate. The coordinator accepted this finding and is adding a spell instance ledger plus regression.

First recheck: `character-build.mjs` at `e96b609fb0b8285f52c68bf53063aa3eefa70ce0cb1e2d8b4cbb2597f789ac84` adds `spellUsageLedger` and fixes a reselect that keeps the explicit instance ID. However, the real checkbox handler in `character-builder.mjs:1170` creates `{id,grantId}`, dropping `instanceId`. After updating one of two grants, `syncBuildSource` has given that copy a separate catalog ID while preserving its older instance ID. Deselecting/reselecting via the real UI payload therefore computes a new ID, misses the ledger and resets consumption to the stale custom record's value.

Independent recheck reused the coordinator's two-grant test **in memory only**, replacing `restoring.data.spells.selected.push(selectedRef)` with `restoring.data.spells.selected.push({id:selectedRef.id,grantId:selectedRef.grantId})`, exactly as the handler does. Observed: selected grant's `used` becomes **1 instead of 3**, its instance ID changes, and the other grant correctly remains at 2. The full stored test passed because it retained the hidden `instanceId` field. No source/test file was changed by this reviewer. R1 remains open until identity survives the actual return/reselect path, including reload.

Final recheck **closed** at `character-build.mjs` SHA-256 `02ead4c0e00adc146efa5dada0ea60d8b7fca1aade37e31a82329025a03b1828`. A homebrew spell selection now recovers its previously acquired identity by exact catalog ID, grant ID and content/revision ref from either live instances or the spell ledger. The updated stored regression uses only `{id,grantId}`, matching the actual handler. An independent in-memory variant additionally serialized/restored the state after removal and before reselecting: the original instance ID and `used:3` survived, and the other grant retained `used:2`. This closes the actual UI-payload failure rather than only the full hidden-record path.

## R2 — P2: campaign connection ignores the new audience's revoked source access

Location in the initial candidate: `homebrew-integration.mjs:167–187`.

`connectCharacterWithContent` checks the acting owner's source availability and campaign enablement. It does not recheck whether the identities who will newly receive the shared actor can still access its copied definition/dependencies. An old enablement ref can outlive a later read-access revocation.

Independent Node reproduction:

1. Player owns a private definition already copied to a personal actor.
2. Share its exact revision with DM; DM enables that revision in the campaign.
3. Revoke DM's read access before connecting the personal actor.
4. Call `connectCharacterWithContent` as player.

Observed: connection succeeds, `visibility:'shared'`, `campaignIds:['lanterns']`; the actor now contains the copied definition and baseline readable by DM, although the source access was revoked before this audience expansion. Current owner access plus historical enablement is insufficient for that new sharing operation.

Requested correction: before expanding a personal actor's audience, validate current source/dependency use access for the demo roles that will receive that actor. Do not conflate this with deleting an already acquired actor snapshot after a previous valid sharing event; that broader revocation policy remains separate. The coordinator accepted this finding.

Recheck **closed** at integration SHA-256 `765e02bd3e6c5b8e9e457e6129f54aafcee59120e9ba05f45b186a93a0673da6`: connection checks `canUse` for the demo roles that can see the prospective shared actor, which also checks dependent refs. The new revoked-audience regression rejects connection and preserves the actor without mutating its ACL or membership. Existing valid-join regression remains green.

## Positive checks and limits

- Existing checks reject arbitrary return routes, mismatched target sections, other identities' private drafts and uncontrolled actor choices.
- Library choice edits the intended private builder draft once; it does not grant an immediate live benefit. Direct sheet application rechecks control and the exact candidate revision.
- Feature update synchronizes its builder custom record. The existing two-grant spell regression preserves the nonselected copy, grant IDs, preparation and the selected copy's current consumption through ordinary advancement.
- A previously acquired exact snapshot can remain during advancement when its source is unavailable, while a newly selected unavailable ref is blocked. R2 concerns the separate expansion to a new audience.
- Dirty navigation, role switching and typed return connectors were read in source. No independent browser interaction is claimed for these connectors; the coordinator owns runtime testing.
- No new catalogue, passive-effect evaluator or publication behavior was inferred or tested.

Executed independently against the initial candidate:

```text
node --test design/blueprint/tests/homebrew-integration.test.mjs \
  design/blueprint/tests/character-build.test.mjs \
  design/blueprint/tests/character-builder-ui.test.mjs \
  design/blueprint/tests/character-integration.test.mjs \
  design/blueprint/tests/characters.test.mjs
64 tests, 64 pass
```

The passing initial tests did not cover R1/R2; both failures above were reproduced separately with direct Node module calls. The first fix snapshot ran **65/65 passing stored tests**, with integration test SHA-256 `d37fa6a23117de5026221a3111d94fbd9d348585ec111c3a71ae20ad9f0474fb`; the independent UI-payload variant still reproduced R1 as detailed above.

## Final candidate and verdict

The final group rerun passed **65/65**. The independent JSON-reload/UI-payload variant passed **9/9** integration tests in memory, without editing tracked or untracked test/source files. The review found no remaining P1/P2 issue within the specified integration paths after R1/R2 were corrected. Browser behavior, server security, complete catalog coverage and the reviewer-authored homebrew module remain outside this verdict.

| Changed file                                           | Final reviewed SHA-256                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------ |
| `design/blueprint/homebrew-integration.mjs`            | `765e02bd3e6c5b8e9e457e6129f54aafcee59120e9ba05f45b186a93a0673da6` |
| `design/blueprint/character-build.mjs`                 | `02ead4c0e00adc146efa5dada0ea60d8b7fca1aade37e31a82329025a03b1828` |
| `design/blueprint/tests/homebrew-integration.test.mjs` | `1127ddbb5a8567ec19cdbac719ea5a69c119864a5e139b55dc6fc2079720250d` |

The sheet and builder UI connector hashes remain identical to the initial table. Findings and fixes are limited to this dirty snapshot; this document does not attest a future commit or complete product approval.

### Final app wording recheck

Renewed bounded review of `app.mjs` SHA-256 `f96aac841ae55d364796c5586590472763025813c349b65854c68408890637bd`: read the updated “Cosa è pronto / What is ready” paragraph at line 466. Its added Library sentence describes creation, independent copying, revisions, updates to a sheet or its draft, and preservation of spent uses. Those claims match the connected paths reviewed above; the following paragraph still explicitly labels the blueprint incomplete and networking/security/multiplayer simulated. It does not claim a complete catalogue or executable rules inferred from homebrew prose.

The coordinator identified this wording as the only post-connector-review app change. Navigation, hash-change and role-change guards were also reread at this exact hash during the separate Library UI review and remain consistent with the reviewed dirty-state lifecycle. No source edit or new behavioral test was necessary for this explanatory text. The coordinator reports 245/245 complete Node tests and six actual Library journeys with 15 groups passing; those broader runtime results are coordinator evidence, not tests rerun by this reviewer. No new finding from this wording recheck.
