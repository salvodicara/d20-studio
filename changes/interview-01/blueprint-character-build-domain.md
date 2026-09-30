# Increment 5 — character-building domain checkpoint

Date: 2026-09-23. Worktree: `~/Workspace/Codex/d20-studio-interview-01`.
Author role: `/root/blueprint_characters`, inherited owner-selected model and effort.
This checkpoint implements a bounded, executable builder domain. It does not close all CRE/ADV requirements or claim a complete class, feat, spell or equipment catalogue.

## Reserved files

- `design/blueprint/character-build.mjs`: private draft commands, validation, previews, dice and application.
- `design/blueprint/character-rules.mjs`: source-labelled catalogue and verified structural calculations.
- `design/blueprint/tests/character-build.test.mjs`: domain regressions.
- This evidence file.

Root owns persistence, sheet, routing and browser verification. The separate UI author owns `character-builder.mjs` and its tests. No browser session, deployment, installation, commit or external write was performed by this role.

## API and state contract

All command functions mutate the provided state inside the caller's atomic `ctx.commit`; previews and catalogue queries are pure. Permission checks use `character-access.mjs`. Drafts belong to their creator identity, including when a DM can control the underlying shared character.

| Export                                                                       | Responsibility                                                                                                                                   |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createCharacterDraft(state, {id,kind,actorId}, role)`                       | Create or resume one idempotent private draft; kinds `create`, `reconstruct`, `advance`, `revise`.                                               |
| `getCharacterDraft`, `listCharacterDrafts`                                   | Return copied drafts visible to the current identity.                                                                                            |
| `saveCharacterDraft(state,id,{section,data,expectedRevision},role)`          | Save recognised data sections; reject stale draft revision and attempts to overwrite accepted dice.                                              |
| `discardCharacterDraft`                                                      | Close a draft while preserving its evidence.                                                                                                     |
| `previewCharacterDraft`                                                      | Return `sections`, bilingual `errors`/`warnings`, `canApply`, `incomplete`, `reviewKey`, `proposed`, `breakdown` and source-specific `choices`.  |
| `beginCharacterRoll`, `resolveCharacterRoll`                                 | Durable physical/digital 4d6 groups and later-level Hit Dice; explicit natural faces, immutable accepted results, explained rerolls/corrections. |
| `applyCharacterDraft(state,id,{operationId,reviewKey,allowIncomplete},role)` | Apply once after current preview validation; partial reconciliation requires an explicit acknowledgement.                                        |
| `getCharacterCatalog`, `BUILD_SECTIONS`                                      | Presentable catalogue and section IDs/names; no UI-only inference of rule eligibility.                                                           |

`state.characterDrafts[]` stores ownership, draft/revision/status, data, dice, base structural key, live ability/HP/preparation/story baselines and the resulting operation. `state.characterBuildOperations[]` records application identities. Applied drafts retain their result and a repeated application returns that same character instead of creating a duplicate.

`state.characterBuildRolls[]` contains accepted rolls only, appended by resolution. A roll records id, draftId, kind, group/level index, mode, owner/controller, natural values, dice, modifier, discarded minimum (4d6), total, source, timestamps and any correction link/reason. The store's separate undo implementation preserves this ledger and marks reversed records. Domain reads check that ledger and never reactivate a reversed id. Applied characters retain historical accepted roll references for future advancement without rerolling or copying new ledger entries.

## Implemented behaviour

- Name and story are optional. Creation stays private, outside campaign membership and unplaced on the Table; joining a campaign is a separate root-owned action. Advancement preserves current sharing.
- Six ability scores from standard array, point buy, 4d6 drop the lowest, or sourced manual values. Empty values remain unknown. Base score, background increases, selected feat increases and explicit manual effective replacement remain separate in the preview.
- Twelve class structures, class level order, nine species, four SRD backgrounds, selected feats and mandatory choice grants. Initial class saves/skill selections are distinct from additional class entry; later classes do not grant their complete saving-throw proficiency list.
- Multiclass prerequisites use effective scores. Feat prerequisite overrides do not grant extra feat slots or waive multiclass prerequisites. Nonrepeatable feats cannot be selected twice through different grants.
- Max HP uses per-level class Hit Die, later fixed/manual/accepted-roll choices, Constitution and Dwarf contribution. Advancement uses current maximum plus verified level delta and retroactive Constitution difference. It preserves current HP, temporary HP, zero HP, conditions and other live state rather than performing a rest.
- Canonical ordinary slot pools are `actor.spellSlots[level]={max,used}`; `actor.slots` aliases level 1. Pact Magic is separate `{level,max,used,source}`. Spent counts can exceed a reduced maximum; unknown live consumption stays unknown. Changing Pact slot level with spent uses requires explicit reconciliation instead of inventing a refund.
- Base cantrip/prepared quotas follow each verified class table. Wizard spellbook and prepared selections are distinct. Multiclass higher-level slot capacity does not unlock higher-level individual-class spells.
- Equipment has sourced manual records and verified starting-gold alternatives. Advancing/revising preserves current inventory and currency and does not grant another initial loadout or equip items automatically.
- Generated feature instances have unique `id=grantId+":"+definitionId`, retain `definitionId` and `grantId`, and preserve recorded `max`/`used` counters. Corrected names and descriptions survive as explicit `manualOverrides` with their own manual provenance; `baseDefinition` retains the source definition separately. `actor.featureUsageLedger` retains removed managed instances so reintroducing the same grant cannot reset spent uses or erase these corrections. Manual item identities are preserved.
- Preparation merges changes against the opening baseline: distinct builder/live toggles both survive; invalid combined quotas remain visible validation errors. Shared feature counters, preparation and resources participate in stale-review detection.
- Story uses field-level baseline comparison. Untouched fields preserve live edits, distinct edits merge, and competing edits to the same field produce a concrete conflict. Shared `actor.notes` is untouched.
- Structural changes are rejected while that actor has connected pending attempts/reactions/movement or pending healing. Consulting and saving the private draft remain possible.

## Sources and rule boundaries

The primary research is [blueprint-character-builder-research.md](blueprint-character-builder-research.md). Official immutable sources are [SRD 5.2.1 EN](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf) and [SRD 5.2.1 IT](https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf).

- EN SHA256: `8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`.
- IT SHA256: `a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718`.
- Core creation EN19–23; multiclass EN24–26; class core tables EN28,31,36,41,47,49,53,57,61,64,70,77; backgrounds EN83, species EN84–86, feats EN87–88. Per-class progression arrays retain their verified table values, including Wizard's differing later preparation counts.
- Combined Paladin/Ranger levels are summed before rounding their half contribution up. Paladin 1/Ranger 1 yields caster level 1, not 2. Ranger 3/Sorcerer 3 gives caster level 5; Warlock 2 adds a separate two-slot Pact pool of level 1.
- Fighter's 155 GP choice is option C. Dueling and Protection are not attributed to this SRD. Only Archery, Defense, Great Weapon Fighting and Two-Weapon Fighting are present in the selected SRD fighting-style catalogue.
- Every one of the 34 selected spell headings/class lists was checked against the local official EN text. Incorrect page pointers were corrected; Detect Magic includes Warlock. Thorn Whip and Armor of Agathys were removed because neither appears in this SRD, independently confirmed by the research reviewer. Manual entries remain a distinct sourced channel.
- Creation/advancement merge rules, privacy, operation IDs, partial acknowledgement and counter preservation implement the product contract; they are not attributed to the SRD.

## Deliberate incomplete coverage

This is a stable increment, not a universal D&D character engine. The preview explicitly reports partial catalogue reconciliation where relevant and the resulting character remains marked partial until the future coverage work is complete.

- Class feature records currently enumerate initial features and selected later choice grants. Full level 2–20/subclass feature catalogues, all invocation options, class-specific resource calculations, armour alternatives, expertise mechanics and additional multiclass entry skill/tool grants are not complete. Selecting a class/subclass name does not claim that these have been implemented.
- Species spell grants, Magic Initiate chosen through additional feat grants, Skilled's internal choices, order bonus cantrips, always-prepared feature spells and free-cast uses need further source-specific registration. Base quota validation is labelled separately; these extras must never be silently counted against base class quotas.
- The spell catalogue is selected level 0/1 content. Higher-level and unlisted spells require manual entries with provenance. Four spells connect to existing Table commands; this does not automate all spells, alternative casting abilities, all Pact slot interchange or racial/feat free casts.
- Equipment packs, starting-pack alternatives, shopping, ready-made character templates, import adapters, homebrew class/species/background builders, XP distribution and future-level planning remain later increments. Only verified gold alternatives and manual equipment are implemented here; no unavailable pack is fabricated from its name.
- Some recorded class/species feature labels remain English in both locales. The domain's controls, reasons and validation messages are bilingual; exhaustive official Italian content localization remains open.
- A structural conflict asks for a fresh draft; there is no general conflict-resolution editor. A spent Pact pool changing spell level is deliberately blocked pending its dedicated reconciliation flow.
- Unknown resource use blocks a new reconstruction application rather than assigning zero. Existing unknown uses are preserved. This increment does not yet provide every contract-permitted partial reconstruction route.
- Browser results belong to the root evidence. Automated fixtures are synthetic and do not constitute a human playtest.

## Verification and review

TDD regressions first reproduced manual live value loss, missing historical dice, pending-consequence application, feature counter reset, missing saving-throw application and story replacement; implementation then made those cases pass. Reviewer-reproduced preparation loss gained a regression covering live changes and stale review. The independent reviewer additionally exercised concurrent preparation edits and historical HP dice after JSON reload.

Latest domain run: `node --test design/blueprint/tests/character-build.test.mjs` — **19/19 pass**. Formatting: Prettier on the three owned modules/test files. After the UI author adjusted the advancement fixture to exercise the explicit partial-catalogue acknowledgement, `node --test design/blueprint/tests/*.test.mjs` passed **188/188 tests**. Root records browser interaction evidence separately.

Separate review: [blueprint-build-domain-review.md](blueprint-build-domain-review.md), reviewer `/root/review_journey`, closed with no remaining P1/P2 in the reviewed scope and 58/58 targeted tests passing. Reviewed source hashes match the delivered modules: build `83d53f49eaa6c278bfc67518aeedff93fff1f525b11f3ff47f2c7936b0f31d70`, rules `ade09c26b6ca426fd2808521c71f41ed824bfe78f612c7cf056f43a0977fb969`. No commit SHA is claimed for this dirty worktree checkpoint.
