# Increment 6 — reusable content domain

Status: implemented domain checkpoint; independent review corrections verified. This is not an attestation that all HB flows or the complete blueprint are finished.

Owner: `/root/blueprint_characters`, inherited model/effort. Reserved files: `design/blueprint/homebrew.mjs`, `design/blueprint/tests/homebrew.test.mjs`, this file. Other authors own UI and existing consumers; do not revert their work. Worktree: `~/Workspace/Codex/d20-studio-interview-01`.

## Stable shared API

All mutation commands receive state and run inside caller-owned `ctx.commit`. Preview, projection, export and materialization are pure. Bilingual reasons have `{code,it,en,path?}`. Ref always means `{contentId,revisionId}`; no implicit latest revision.

```js
getHomebrewTypes(); // [{id,name:{it,en},targetKind:null|'features'|'spells'|'inventory'}]
createHomebrewDraft(state, {id,kind='create',type,ref,actorId,instanceId,returnTo}, role);
getHomebrewDraft(state,id,role); // copy, private owner
listHomebrewDrafts(state,role); // active private copies
saveHomebrewDraft(state,id,{data,expectedRevision},role); // whole data replacement
discardHomebrewDraft(state,id,role);
previewHomebrewDraft(state,id,role);
applyHomebrewDraft(state,id,{reviewKey},role); // draft.result is the idempotence record
listHomebrew(state,role); // permitted content summaries only
getHomebrewRevision(state,ref,role); // copied revision plus content summary and permission projection
homebrewAvailability(state,ref,{actorId,campaignId},role);
shareHomebrewRevision(state,ref,{readers,editors},role);
enableHomebrewRevision(state,ref,{enabled},role); // current campaign, DM authority
materializeHomebrewCopy(state,ref,role,{id,actorId,grantId}); // pure canonical row, never inserts
exportHomebrewBundle(state,refs,role); // JSON-compatible format-1 object
createHomebrewImportDraft(state,{id,bundle,returnTo?},role); // no usable content inserted before Apply
collectHomebrewRevision(state,ref,{collected},role); // personal collection, no copy or grant
```

`createHomebrewDraft` kinds are `create`, `duplicate`, `revise`, `assign`, `update`; `import` is created by the import entry. Duplicate creates an independent content identity with `originRef`. Revise appends a revision of the same content. Assign/update require actorId; update also requires instanceId. Return context is `{page:'builder',draftId,section,grantId?,targetKind?}` or `{page:'characters',actorId,tab,instanceId?}` and is validated again by its consuming root command. Arbitrary URLs/routes are not accepted.

Preview shape:

```js
{
  draft, canApply, reviewKey, errors:[], warnings:[],
  proposed, // definition or instance; import summary for import drafts
  diff:[{path,label:{it,en},base,candidate,current,conflict,choice}],
  conflicts:[], permissions, automation:{supported:[],manual:[],reasons:[]},
  returnTo
}
```

Application result contains `{draftId,kind,ref,returnTo}` and, for actor operations, `{actorId,instanceId,targetKind}`. Root uses that result to synchronise a build-managed instance's corresponding builder source in the same atomic commit. Updating one spell grant never updates other copies of the same definition.

## State schema

```js
state.library = [
  {
    id,
    owner,
    type,
    createdAt,
    originRef: null | ref,
    revisions: [{ id, contentId, parentRevisionId, author, createdAt, data }],
    accessByRevision: { [revisionId]: { readers: [], editors: [] } },
  },
];
state.libraryDrafts = [
  {
    id,
    owner,
    kind,
    status: "active" | "applied" | "discarded",
    revision,
    contentId,
    baseRef: null | ref,
    actorId: null,
    instanceId: null,
    createdAt,
    updatedAt,
    data,
    returnTo: null,
    result: null,
  },
];
state.campaign.enabledContent = [ref];
state.libraryCollections = { player: [ref], dm: [ref] };
```

Content ownership and explicit revision access are separate from immutable revision data. Owner always reads their content; another identity, including DM, needs explicit read access. Editors may revise that content from a permitted revision but cannot silently share or change actors. Sharing is scoped to one revision, does not enable it, and is not inherited by later revisions. Enabling needs DM authority and an already-readable revision. There is no publication service in this local increment.

An editor who saves a new revision receives explicit read/edit access to that revision; this is recorded in its new ACL, not inferred from author attribution. Import preserves attribution but imports no ACL: an external `author:'player'` never grants that local role access to a DM's imported private content. Permission projection has `readable,canUse,canShare,canManageAccess,canExport,reasons,canRevise,canDuplicate,canEnable,canCollect,canAssign,targetKind`. Revision detail returns current `access:{readers,editors}` only when `canManageAccess`; lists omit ACL and unreadable sibling revisions. Collection stores exact refs and changes none of these permissions. An owner can reduce or revoke existing access even when source capabilities prohibit new sharing. With `canShare:false`, additions and reader-to-editor promotions are rejected; editor-to-reader downgrade remains possible.

`homebrewAvailability` returns `{readable,canUse,canShare,canManageAccess,canExport,reasons}`. `campaignId` explicitly overrides inference from actor membership, so root can test a prospective personal-to-campaign connection before changing membership. Use in a campaign requires the exact enabled ref; saving/sharing alone never satisfies it. Dependencies are checked transitively for permission and availability, without leaking private names/text through errors. New materialization, assignment and update on an existing shared actor also revalidate source and dependency access for every identity that can currently view that actor. Existing acquired snapshots remain separate from permission for new acquisition. A controlled instance's readable candidate revision can be compared before campaign enablement or audience permission is available; Apply remains blocked.

Definition draft data:

```js
{
  name:{it:'',en:''}, description:{it:'',en:''},
  source:{kind:'authored'|'reconstruction',edition:'2024'|'unknown',label:'',reference:'',
          rights:{modify:true,share:true,export:true}},
  fields:{level:0,school:'',kind:'gear',weight:0,value:null},
  resource:null|{id,max,recovery:'manual'|'short-rest'|'long-rest'},
  activities:[], dependencies:[ref]
}
```

At least one language for the name is required. Missing translations remain missing; UI uses available fallback and labels the gap. Source rights are declared local capabilities, not proof of a legal licence. Unknown/reconstructed provenance never acquires an SRD citation. Metadata fields for the chosen type are explicit; unsupported activities remain visibly manual and are never inferred from description.

Types remain named: class, subclass, species, background, feat, feature, spell, item, weapon, armor, consumable, creature, condition, counter, skill. This increment materializes real feature/feat/counter, spell and inventory rows; other types remain consultable manual definitions until their consumers are connected, not renamed as feats or injected into a UI-only class catalogue.

Assign/update draft data:

```js
{
  instance:{quantity:1,used:0,equipped:false,prepared:false},
  resolutions:{[fieldPath]:'keep-local'|'use-new',resource:'retain-history'}
}
```

Resource identity is stable across revisions. Instance rows keep `id`, `homebrewRef`, `baseDefinition`, `manualOverrides`; live quantities, preparation, equipment and consumption do not belong to saved definitions. Update compares the old source, candidate source and current instance. Independent edits are preserved; conflicting definition/local edits require field-level choice. Removing/replacing a resource requires an explicit retained-history decision. Resource history keeps usage, maximum, recovery, source, the resource baseline and its manual overrides. Restoring that same identity preserves local corrections when its baseline is unchanged, or requires reconciliation with changed candidate values. A different identity does not inherit those corrections. Spent counts may exceed reduced max and unknown stays unknown. Pending dependent gameplay blocks structural replacement without consuming or answering anything.

Export format is `{format:'d20-studio-library',version:1,contents:[{id,type,originRef,revisions:[...]}]}`. It contains only explicitly exported readable/redistributable definitions and their permitted dependencies; no access grants, private drafts, actor state, notes, counters-in-use or file fetches. Import validates before application, preserves identities/provenance, treats identical revisions as existing, rejects identity collisions, and grants no campaign enablement or actor assignment.

## Plan and sources

Implement permission/projection and immutable revision tests first; then actor materialization/update preservation; then import/export validation and idempotence. Reuse [blueprint-homebrew-research.md](blueprint-homebrew-research.md), HB-01–12 and the existing CRE/ADV merge contract. Ordinary technical choices are delegated; no additional product approval gate is introduced.

## Implemented and checked

The module implements all commands in the API above. Definitions and dependency references use immutable content/revision identities. Commands revalidate before mutation; Apply records a result in the private draft and returns that same result on retry after JSON reload. No parallel operation registry was introduced.

Assignments copy one supported definition to one controlled actor. Updates compare the source baseline, new definition and live instance field by field, with explicit choices only for conflicting edits. Existing `id`, `grantId`, `catalogId`, `buildManaged`, preparation, equipment, quantity, consumption and unrelated actor state survive. `baseDefinition` holds the complete canonical row definition, excluding instance consumption. `manualOverrides` records preserved sheet corrections separately. Resource removal/replacement requires `retain-history`; reintroducing the same resource identity recovers its recorded consumption. A different resource's unknown consumption stays `null`, rather than implying a rest. Source revision creation never mutates existing copies.

Relevant open reactions, attempts, movement and actor-local physical healing block replacement. A pending throw on another actor does not. The review key covers the actual proposed update, diff and permissions; unrelated actor notes/HP and another library definition do not invalidate it. New live consumption or an applicable access change does invalidate it.

Import validates the complete bundle, identities, typed data and dependency graph before application. It rejects same-identity/different-data collisions, cyclic/missing dependencies, code activities and embedded access records. Export includes only definitions and permitted dependencies; no actors, private drafts, current uses or ACL. Definition source capabilities cannot be broadened by duplicate/revise. Revoked private dependencies prevent materialization/use/export and are omitted from readable detail projection, with an unavailable count.

Verification at the final domain review handoff:

- `node --test design/blueprint/tests/homebrew.test.mjs design/blueprint/tests/homebrew-integration.test.mjs`: **34/34 pass** (25 owned domain tests, 9 coordinator integration tests).
- TDD red observations: missing initial module; import incorrectly inferred access from external author; physical-healing pending state initially looked at the wrong location; pure materialization initially accepted an uncontrolled private actor. Regressions were observed failing and then passed after correcting their causes.
- Review regressions also cover comparison before enablement, shared-actor audience revocation, reduction of ACL despite disabled sharing, retained resource corrections and import return context across reload. The ACL regression was observed red with `canManageAccess` undefined; retained-resource regression was observed red with max 3 instead of the explicitly retained 5; import context was observed red with null instead of its typed target.
- Domain SHA-256: `61af01e0248514310f13cd0e10118088639df3247b692cfabcd69a6e4278e989`.
- Owned tests SHA-256: `e9622b9a58393b770f384530d780983770547b5932cdf14f46a7da5c656b3cab`.

Root owns browser verification, existing consumers, the builder source synchronization and global undo. The separate domain reviewer independently repeated the shared-audience check, ACL downgrade/revocation without regrant, resource restore conflicts with mixed choices and unknown consumption through JSON reload; R1–R3 passed at these hashes. Import drafts preserve the validated typed return context without automatically choosing or assigning the imported content. The hashes above identify this concrete snapshot only.

## Remaining product work, not implied by this checkpoint

The type catalogue preserves classes, subclasses, species and other types, but their granting/progression consumers are not implemented by this module. Manual activities are labelled as manual; there is no parser/evaluator for prose, conditional reputation advantages, passive effects, attacks, durations or automatic recovery. HB-03/04/05/06/10/11 and full passive-effect update propagation remain later connected work, not a claim of automated behavior. The current preview exercises definitions, copy availability and resource deltas; it is not a complete fictional combat simulator.

This local blueprint simulates two identities; it does not establish server security, remote collaboration, licensing adjudication or publication/moderation. Rights fields record declared capabilities. The JSON format is this app's versioned format, not a promise of direct compatibility with Foundry/Beyond/Shard exports. Source evidence is the research file above; the full preservation merge and immutable private revisions are the app's explicit contract adaptations, not a claimed competitor feature.
