import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import {
  createCharacterDraft,
  saveCharacterDraft,
  getCharacterDraft,
  previewCharacterDraft,
  applyCharacterDraft,
} from "../character-build.mjs";
import {
  createHomebrewDraft,
  getHomebrewDraft,
  saveHomebrewDraft,
  previewHomebrewDraft,
  applyHomebrewDraft,
  shareHomebrewRevision,
  enableHomebrewRevision,
} from "../homebrew.mjs";
import {
  parseLibraryReturn,
  addHomebrewToCharacterDraft,
  applyLibraryDraftToCharacter,
  connectCharacterWithContent,
  validateLibraryCharacterChoice,
} from "../homebrew-integration.mjs";

function saveDefinition(state, id, { ref, max = 3, role = "player", type = "feature" } = {}) {
  createHomebrewDraft(state, { id, kind: ref ? "revise" : "create", type, ref }, role);
  const draft = getHomebrewDraft(state, id, role);
  saveHomebrewDraft(
    state,
    id,
    {
      expectedRevision: draft.revision,
      data: {
        ...draft.data,
        name: { it: "Luce della gilda", en: "Guild light" },
        description: { it: "Capacità originale di esempio", en: "Original example feature" },
        source: {
          kind: "authored",
          edition: "2024",
          label: "Synthetic original",
          reference: "",
          rights: { modify: true, share: true, export: true },
        },
        resource: { id: "light-uses", max, recovery: "manual" },
      },
    },
    role,
  );
  const preview = previewHomebrewDraft(state, id, role);
  assert.equal(preview.canApply, true, JSON.stringify(preview.errors));
  return applyHomebrewDraft(state, id, { reviewKey: preview.reviewKey }, role).ref;
}
function personalState() {
  const state = createInitialState();
  state.actors.livia.visibility = "private";
  state.actors.livia.campaignIds = [];
  return state;
}

test("typed library returns reject arbitrary routes and mismatched target sections", () => {
  assert.equal(parseLibraryReturn('{"page":"javascript:alert(1)"}'), null);
  assert.equal(
    parseLibraryReturn(
      '{"page":"builder","draftId":"d","section":"features","targetKind":"inventory"}',
    ),
    null,
  );
  assert.deepEqual(
    parseLibraryReturn(
      JSON.stringify({
        page: "builder",
        draftId: "d",
        section: "features",
        targetKind: "features",
        ignored: true,
      }),
    ),
    {
      page: "builder",
      draftId: "d",
      section: "features",
      targetKind: "features",
    },
  );
});

test("returning a library feature edits a private builder draft once, not the live sheet", () => {
  const state = personalState(),
    ref = saveDefinition(state, "definition");
  createCharacterDraft(state, { id: "build", kind: "revise", actorId: "livia" }, "player");
  const target = { page: "builder", draftId: "build", section: "features", targetKind: "features" };
  const before = structuredClone(state.actors.livia);
  const first = addHomebrewToCharacterDraft(state, ref, target, "player");
  const second = addHomebrewToCharacterDraft(state, ref, target, "player");
  assert.equal(first.instanceId, second.instanceId);
  assert.equal(getCharacterDraft(state, "build", "player").data.features.custom.length, 1);
  assert.deepEqual(state.actors.livia, before);
  assert.throws(() => addHomebrewToCharacterDraft(state, ref, target, "dm"));
});

test("joining a campaign rechecks content access and exact revision enablement before sharing", () => {
  const state = personalState(),
    ref = saveDefinition(state, "definition");
  createHomebrewDraft(state, { id: "assign", kind: "assign", ref, actorId: "livia" }, "player");
  const preview = previewHomebrewDraft(state, "assign", "player");
  applyLibraryDraftToCharacter(state, "assign", preview.reviewKey, "player");
  assert.throws(() => connectCharacterWithContent(state, "livia", "player"));
  assert.equal(state.actors.livia.visibility, "private");
  shareHomebrewRevision(state, ref, { readers: ["dm"], editors: [] }, "player");
  assert.throws(() => connectCharacterWithContent(state, "livia", "player"));
  enableHomebrewRevision(state, ref, { enabled: true }, "dm");
  connectCharacterWithContent(state, "livia", "player");
  assert.equal(state.actors.livia.visibility, "shared");
  assert.deepEqual(state.actors.livia.campaignIds, [state.campaign.id]);
});

test("updating a build-managed homebrew feature survives the next advancement draft", () => {
  const state = personalState(),
    ref = saveDefinition(state, "definition");
  createCharacterDraft(state, { id: "build", kind: "revise", actorId: "livia" }, "player");
  const selected = addHomebrewToCharacterDraft(
    state,
    ref,
    { page: "builder", draftId: "build", section: "features", targetKind: "features" },
    "player",
  );
  let preview = previewCharacterDraft(state, "build", "player");
  assert.equal(preview.canApply, true, JSON.stringify(preview.errors));
  applyCharacterDraft(
    state,
    "build",
    { operationId: "build-apply", reviewKey: preview.reviewKey, allowIncomplete: true },
    "player",
  );
  const actor = state.actors.livia;
  actor.features.find((row) => row.id === selected.instanceId).used = 2;
  const nextRef = saveDefinition(state, "revision-two", { ref, max: 4 });
  createHomebrewDraft(
    state,
    {
      id: "update",
      kind: "update",
      ref: nextRef,
      actorId: actor.id,
      instanceId: selected.instanceId,
    },
    "player",
  );
  preview = previewHomebrewDraft(state, "update", "player");
  assert.equal(preview.canApply, true, JSON.stringify(preview.errors));
  applyLibraryDraftToCharacter(state, "update", preview.reviewKey, "player");
  createCharacterDraft(state, { id: "advance", kind: "advance", actorId: actor.id }, "player");
  const draft = getCharacterDraft(state, "advance", "player");
  const custom = draft.data.features.custom.find((row) => row.id === selected.instanceId);
  assert.deepEqual(custom.homebrewRef, nextRef);
  preview = previewCharacterDraft(state, "advance", "player");
  const feature = preview.proposed.features.find((row) => row.id === selected.instanceId);
  assert.deepEqual(feature.homebrewRef, nextRef);
  assert.equal(feature.max, 4);
  assert.equal(feature.used, 2);
});

test("builder application rechecks access after a new library choice was saved", () => {
  const state = personalState();
  const ref = saveDefinition(state, "dm-definition", { role: "dm" });
  shareHomebrewRevision(state, ref, { readers: ["player"], editors: [] }, "dm");
  createCharacterDraft(state, { id: "new-build" }, "player");
  addHomebrewToCharacterDraft(
    state,
    ref,
    { page: "builder", draftId: "new-build", section: "features", targetKind: "features" },
    "player",
  );
  shareHomebrewRevision(state, ref, { readers: [], editors: [] }, "dm");
  const preview = previewCharacterDraft(state, "new-build", "player");
  assert.ok(preview.errors.some((error) => error.code === "homebrew-unavailable"));
});

test("sheet-context choices reject a mismatched section before creating any draft", () => {
  const state = personalState(),
    ref = saveDefinition(state, "definition");
  const before = structuredClone(state);
  assert.throws(() =>
    validateLibraryCharacterChoice(
      state,
      ref,
      { page: "characters", actorId: "livia", tab: "spells" },
      "player",
    ),
  );
  assert.throws(() =>
    validateLibraryCharacterChoice(
      state,
      ref,
      { page: "characters", actorId: "livia", tab: "features" },
      "dm",
    ),
  );
  assert.deepEqual(state, before);
  assert.deepEqual(
    validateLibraryCharacterChoice(
      state,
      ref,
      { page: "characters", actorId: "livia", tab: "features" },
      "player",
    ),
    { page: "characters", actorId: "livia", tab: "features" },
  );
});

test("an acquired homebrew snapshot survives source revocation in advancement without enabling new acquisition", () => {
  const state = personalState(),
    ref = saveDefinition(state, "dm-definition", { role: "dm" });
  shareHomebrewRevision(state, ref, { readers: ["player"], editors: [] }, "dm");
  createCharacterDraft(state, { id: "build", kind: "revise", actorId: "livia" }, "player");
  const selected = addHomebrewToCharacterDraft(
    state,
    ref,
    { page: "builder", draftId: "build", section: "features" },
    "player",
  );
  let preview = previewCharacterDraft(state, "build", "player");
  assert.equal(preview.canApply, true, JSON.stringify(preview.errors));
  applyCharacterDraft(
    state,
    "build",
    { operationId: "apply", reviewKey: preview.reviewKey, allowIncomplete: true },
    "player",
  );
  state.actors.livia.features.find((row) => row.id === selected.instanceId).used = 2;
  shareHomebrewRevision(state, ref, { readers: [], editors: [] }, "dm");
  createCharacterDraft(state, { id: "advance", kind: "advance", actorId: "livia" }, "player");
  const advancement = getCharacterDraft(state, "advance", "player");
  advancement.data.classes[0].level++;
  advancement.data.features.selected.push({
    id: "ability-score-improvement",
    grantId: "class:wizard:feat:4",
    bonuses: { int: 2 },
  });
  advancement.data.hp = {
    ...advancement.data.hp,
    mode: "manual",
    maxHp: state.actors.livia.maxHp + 4,
  };
  saveCharacterDraft(
    state,
    "advance",
    { data: advancement.data, expectedRevision: advancement.revision },
    "player",
  );
  preview = previewCharacterDraft(state, "advance", "player");
  assert.equal(preview.canApply, true, JSON.stringify(preview.errors));
  assert.ok(preview.warnings.some((row) => row.code === "homebrew-retained-copy"));
  const retained = preview.proposed.features.find((row) => row.id === selected.instanceId);
  assert.deepEqual(retained.homebrewRef, ref);
  assert.equal(retained.used, 2);
  assert.throws(() =>
    addHomebrewToCharacterDraft(
      state,
      ref,
      { page: "builder", draftId: "advance", section: "features" },
      "player",
    ),
  );
});

test("updating one homebrew spell grant preserves the other and current use counts through advancement", () => {
  const state = personalState(),
    ref = saveDefinition(state, "spell", { type: "spell" });
  createCharacterDraft(state, { id: "build", kind: "revise", actorId: "livia" }, "player");
  let draft = getCharacterDraft(state, "build", "player");
  draft.data.classes = [{ classId: "wizard", level: 1, subclassId: null }];
  draft.data.origin.backgroundId = "sage";
  draft.data.origin.backgroundBonuses = {};
  draft.data.origin.choices = { magicInitiateAbility: "wis" };
  draft.data.hp = {
    mode: "manual",
    maxHp: state.actors.livia.maxHp,
    perLevel: {},
    currentKnown: true,
  };
  saveCharacterDraft(
    state,
    "build",
    { data: draft.data, expectedRevision: draft.revision },
    "player",
  );
  const selected = addHomebrewToCharacterDraft(
    state,
    ref,
    { page: "builder", draftId: "build", section: "spells", grantId: "class:wizard" },
    "player",
  );
  draft = getCharacterDraft(state, "build", "player");
  draft.data.spells.selected.push({
    id: selected.instanceId,
    grantId: "background:magic-initiate",
  });
  saveCharacterDraft(
    state,
    "build",
    { data: draft.data, expectedRevision: draft.revision },
    "player",
  );
  let preview = previewCharacterDraft(state, "build", "player");
  assert.equal(preview.canApply, true, JSON.stringify(preview.errors));
  applyCharacterDraft(
    state,
    "build",
    { operationId: "apply", reviewKey: preview.reviewKey, allowIncomplete: true },
    "player",
  );
  let actor = state.actors.livia;
  const copies = actor.spells.filter((row) => row.homebrewRef?.contentId === ref.contentId);
  assert.equal(copies.length, 2);
  const first = copies.find((row) => row.grantId === "class:wizard");
  const second = copies.find((row) => row.grantId === "background:magic-initiate");
  first.used = 1;
  second.used = 2;
  const nextRef = saveDefinition(state, "revise-spell", { ref, type: "spell", max: 4 });
  createHomebrewDraft(
    state,
    { id: "update", kind: "update", ref: nextRef, actorId: "livia", instanceId: first.id },
    "player",
  );
  preview = previewHomebrewDraft(state, "update", "player");
  assert.equal(preview.canApply, true, JSON.stringify(preview.errors));
  const unchanged = structuredClone(second);
  applyLibraryDraftToCharacter(state, "update", preview.reviewKey, "player");
  assert.deepEqual(
    actor.spells.find((row) => row.id === second.id),
    unchanged,
  );
  actor.spells.find((row) => row.id === first.id).used = 3;
  createCharacterDraft(state, { id: "advance", kind: "advance", actorId: "livia" }, "player");
  const advancement = getCharacterDraft(state, "advance", "player");
  advancement.data.classes[0].level++;
  advancement.data.features.selected.push({ id: "arcana", grantId: "class:wizard:expertise" });
  advancement.data.hp = {
    ...advancement.data.hp,
    mode: "manual",
    maxHp: state.actors.livia.maxHp + 4,
  };
  saveCharacterDraft(
    state,
    "advance",
    { data: advancement.data, expectedRevision: advancement.revision },
    "player",
  );
  preview = previewCharacterDraft(state, "advance", "player");
  assert.equal(preview.canApply, true, JSON.stringify(preview.errors));
  const nextFirst = preview.proposed.spells.find((row) => row.id === first.id);
  const nextSecond = preview.proposed.spells.find((row) => row.id === second.id);
  assert.deepEqual(nextFirst.homebrewRef, nextRef);
  assert.equal(nextFirst.max, 4);
  assert.equal(nextFirst.used, 3);
  assert.deepEqual(nextSecond.homebrewRef, ref);
  assert.equal(nextSecond.used, 2);
  applyCharacterDraft(
    state,
    "advance",
    { operationId: "advance-apply", reviewKey: preview.reviewKey, allowIncomplete: true },
    "player",
  );
  assert.equal(actor.spells.find((row) => row.id === first.id).used, 3);
  assert.equal(actor.spells.find((row) => row.id === second.id).used, 2);
  createCharacterDraft(state, { id: "remove-spell", kind: "revise", actorId: "livia" }, "player");
  const removing = getCharacterDraft(state, "remove-spell", "player");
  const selectedRef = structuredClone(
    removing.data.spells.selected.find((entry) => entry.instanceId === first.id),
  );
  removing.data.spells.selected = removing.data.spells.selected.filter(
    (entry) => entry.instanceId !== first.id,
  );
  saveCharacterDraft(
    state,
    "remove-spell",
    { data: removing.data, expectedRevision: removing.revision },
    "player",
  );
  preview = previewCharacterDraft(state, "remove-spell", "player");
  assert.equal(preview.canApply, true, JSON.stringify(preview.errors));
  applyCharacterDraft(
    state,
    "remove-spell",
    { operationId: "remove", reviewKey: preview.reviewKey, allowIncomplete: true },
    "player",
  );
  assert.ok(!actor.spells.some((row) => row.id === first.id));
  createCharacterDraft(state, { id: "restore-spell", kind: "revise", actorId: "livia" }, "player");
  const restoring = getCharacterDraft(state, "restore-spell", "player");
  restoring.data.spells.selected.push({ id: selectedRef.id, grantId: selectedRef.grantId });
  saveCharacterDraft(
    state,
    "restore-spell",
    { data: restoring.data, expectedRevision: restoring.revision },
    "player",
  );
  preview = previewCharacterDraft(state, "restore-spell", "player");
  assert.equal(preview.canApply, true, JSON.stringify(preview.errors));
  assert.equal(preview.proposed.spells.find((row) => row.id === first.id).used, 3);
});

test("campaign connection cannot disclose a source whose audience was revoked after enablement", () => {
  const state = personalState(),
    ref = saveDefinition(state, "source");
  createHomebrewDraft(state, { id: "assign", kind: "assign", ref, actorId: "livia" }, "player");
  const preview = previewHomebrewDraft(state, "assign", "player");
  applyLibraryDraftToCharacter(state, "assign", preview.reviewKey, "player");
  shareHomebrewRevision(state, ref, { readers: ["dm"], editors: [] }, "player");
  enableHomebrewRevision(state, ref, { enabled: true }, "dm");
  shareHomebrewRevision(state, ref, { readers: [], editors: [] }, "player");
  const before = structuredClone(state.actors.livia);
  assert.throws(() => connectCharacterWithContent(state, "livia", "player"));
  assert.deepEqual(state.actors.livia, before);
});
