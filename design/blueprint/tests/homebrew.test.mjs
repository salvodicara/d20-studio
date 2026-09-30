import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import {
  createHomebrewDraft,
  getHomebrewDraft,
  listHomebrewDrafts,
  saveHomebrewDraft,
  previewHomebrewDraft,
  applyHomebrewDraft,
  listHomebrew,
  getHomebrewRevision,
  shareHomebrewRevision,
  enableHomebrewRevision,
  homebrewAvailability,
  materializeHomebrewCopy,
  exportHomebrewBundle,
  createHomebrewImportDraft,
  collectHomebrewRevision,
} from "../homebrew.mjs";

function definition(
  state,
  {
    id = "guild",
    role = "player",
    type = "feature",
    resource = { id: "favour", max: 3, recovery: "manual" },
  } = {},
) {
  const d = createHomebrewDraft(state, { id, type }, role);
  saveHomebrewDraft(
    state,
    d.id,
    {
      expectedRevision: d.revision,
      data: {
        ...d.data,
        name: { it: "Favore della gilda", en: "Guild favour" },
        description: { it: "Descrizione originale", en: "Original description" },
        source: { ...d.data.source, label: "Original synthetic homebrew" },
        resource,
      },
    },
    role,
  );
  const p = previewHomebrewDraft(state, id, role);
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  return applyHomebrewDraft(state, id, { reviewKey: p.reviewKey }, role).ref;
}
function apply(state, id, role = "player") {
  const p = previewHomebrewDraft(state, id, role);
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  return applyHomebrewDraft(state, id, { reviewKey: p.reviewKey }, role);
}
function personal(state) {
  state.actors.livia.visibility = "private";
  state.actors.livia.campaignIds = [];
  return state.actors.livia;
}

test("private drafts and revisions are not DM-visible and saving never assigns, shares or enables", () => {
  const state = createInitialState(),
    actors = structuredClone(state.actors);
  const ref = definition(state);
  assert.deepEqual(state.actors, actors);
  assert.deepEqual(listHomebrew(state, "dm"), []);
  assert.deepEqual(listHomebrewDrafts(state, "dm"), []);
  assert.throws(() => getHomebrewDraft(state, "guild", "dm"));
  assert.throws(() => getHomebrewRevision(state, ref, "dm"));
  assert.equal(homebrewAvailability(state, ref, {}, "dm").readable, false);
  assert.deepEqual(state.campaign.enabledContent ?? [], []);
});
test("revision identities are immutable and copying is independent, including reload and repeated Apply", () => {
  let state = createInitialState();
  const ref = definition(state),
    old = getHomebrewRevision(state, ref, "player");
  createHomebrewDraft(state, { id: "revision", kind: "revise", ref }, "player");
  const d = getHomebrewDraft(state, "revision", "player");
  saveHomebrewDraft(
    state,
    d.id,
    { data: { ...d.data, name: { it: "Nuovo nome", en: "New name" } } },
    "player",
  );
  state = JSON.parse(JSON.stringify(state));
  const next = apply(state, "revision");
  assert.equal(next.ref.contentId, ref.contentId);
  assert.notEqual(next.ref.revisionId, ref.revisionId);
  assert.deepEqual(getHomebrewRevision(state, ref, "player").data, old.data);
  assert.deepEqual(applyHomebrewDraft(state, "revision", { reviewKey: "retry" }, "player"), next);
  createHomebrewDraft(state, { id: "copy", kind: "duplicate", ref }, "player");
  const duplicate = apply(state, "copy");
  assert.notEqual(duplicate.ref.contentId, ref.contentId);
});
test("share, revision enablement and prospective campaign membership are distinct permissions", () => {
  const state = createInitialState(),
    ref = definition(state);
  personal(state);
  assert.equal(homebrewAvailability(state, ref, { actorId: "livia" }, "player").canUse, true);
  assert.equal(
    homebrewAvailability(state, ref, { actorId: "livia", campaignId: state.campaign.id }, "player")
      .canUse,
    false,
  );
  assert.throws(() => enableHomebrewRevision(state, ref, { enabled: true }, "player"));
  shareHomebrewRevision(state, ref, { readers: ["dm"], editors: [] }, "player");
  assert.equal(homebrewAvailability(state, ref, {}, "dm").readable, true);
  enableHomebrewRevision(state, ref, { enabled: true }, "dm");
  assert.equal(
    homebrewAvailability(state, ref, { actorId: "livia", campaignId: state.campaign.id }, "player")
      .canUse,
    true,
  );
  createHomebrewDraft(state, { id: "next", kind: "revise", ref }, "player");
  const next = apply(state, "next").ref;
  assert.equal(
    homebrewAvailability(state, next, { campaignId: state.campaign.id }, "player").canUse,
    false,
  );
  assert.equal(homebrewAvailability(state, next, {}, "dm").readable, false);
});
test("assignment is explicit and idempotent, preserves live state, and only supports connected kinds", () => {
  const state = createInitialState(),
    actor = personal(state),
    ref = definition(state),
    before = structuredClone(actor);
  const copy = materializeHomebrewCopy(state, ref, "player", {
    id: "copy-only",
    actorId: actor.id,
  });
  assert.equal(copy.targetKind, "features");
  assert.deepEqual(actor, before);
  createHomebrewDraft(state, { id: "assign", kind: "assign", ref, actorId: actor.id }, "player");
  const result = apply(state, "assign");
  assert.equal(actor.features.filter((f) => f.id === result.instanceId).length, 1);
  assert.equal(actor.hp, before.hp);
  assert.deepEqual(actor.inventory, before.inventory);
  assert.equal(actor.features.at(-1).used, 0);
  applyHomebrewDraft(state, "assign", { reviewKey: "retry" }, "player");
  assert.equal(actor.features.filter((f) => f.id === result.instanceId).length, 1);
  const subclass = definition(state, { id: "subclass", type: "subclass", resource: null });
  assert.equal(getHomebrewRevision(state, subclass, "player").type, "subclass");
  assert.throws(() =>
    materializeHomebrewCopy(state, subclass, "player", { id: "bad", actorId: actor.id }),
  );
});
test("updates compare live corrections, preserve consumption including overuse, and never reset other fields", () => {
  const state = createInitialState(),
    actor = personal(state),
    ref = definition(state);
  createHomebrewDraft(state, { id: "assign", kind: "assign", ref, actorId: actor.id }, "player");
  const assigned = apply(state, "assign");
  const row = actor.features.find((f) => f.id === assigned.instanceId);
  row.used = 2;
  row.description = "Local table correction";
  createHomebrewDraft(state, { id: "revision", kind: "revise", ref }, "player");
  let d = getHomebrewDraft(state, "revision", "player");
  d.data.resource.max = 1;
  d.data.description.en = "New definition text";
  saveHomebrewDraft(state, d.id, { data: d.data }, "player");
  const next = apply(state, d.id).ref;
  createHomebrewDraft(
    state,
    { id: "update", kind: "update", ref: next, actorId: actor.id, instanceId: row.id },
    "player",
  );
  let p = previewHomebrewDraft(state, "update", "player");
  assert.equal(p.canApply, false);
  assert.ok(p.conflicts.some((c) => c.path === "description"));
  d = getHomebrewDraft(state, "update", "player");
  d.data.resolutions.description = "keep-local";
  saveHomebrewDraft(state, d.id, { data: d.data }, "player");
  p = previewHomebrewDraft(state, d.id, "player");
  assert.equal(p.proposed.used, 2);
  assert.equal(p.proposed.max, 1);
  row.used = 3;
  assert.throws(
    () => applyHomebrewDraft(state, d.id, { reviewKey: p.reviewKey }, "player"),
    /review|changed/i,
  );
  apply(state, d.id);
  assert.equal(row.id, assigned.instanceId);
  const updated = actor.features.find((f) => f.id === row.id);
  assert.equal(updated.used, 3);
  assert.equal(updated.max, 1);
  assert.equal(updated.description, "Local table correction");
  assert.equal(updated.homebrewRef.revisionId, next.revisionId);
});
test("import/export has no actor or access payload, detects collisions before mutation and deduplicates revisions", () => {
  const state = createInitialState(),
    ref = definition(state);
  shareHomebrewRevision(state, ref, { readers: ["dm"], editors: [] }, "player");
  const bundle = exportHomebrewBundle(state, [ref], "player");
  assert.equal(bundle.format, "d20-studio-library");
  assert.equal(bundle.version, 1);
  assert.equal(JSON.stringify(bundle).includes("accessByRevision"), false);
  assert.equal(JSON.stringify(bundle).includes("actors"), false);
  const destination = createInitialState();
  createHomebrewImportDraft(destination, { id: "import", bundle }, "player");
  assert.equal(destination.library.length, 0);
  apply(destination, "import");
  createHomebrewImportDraft(destination, { id: "import-again", bundle }, "player");
  apply(destination, "import-again");
  assert.equal(destination.library.length, 1);
  assert.equal(destination.library[0].revisions.length, 1);
  const collision = structuredClone(bundle);
  collision.contents[0].revisions[0].data.name.en = "Different same identity";
  createHomebrewImportDraft(destination, { id: "collision", bundle: collision }, "player");
  const before = JSON.stringify(destination.library);
  assert.equal(previewHomebrewDraft(destination, "collision", "player").canApply, false);
  assert.throws(() => apply(destination, "collision"));
  assert.equal(JSON.stringify(destination.library), before);
});
test("private dependencies cannot be leaked by materialization or export through a readable wrapper", () => {
  const state = createInitialState(),
    secret = definition(state, { id: "secret", role: "dm" });
  shareHomebrewRevision(state, secret, { readers: ["player"], editors: [] }, "dm");
  const wrapper = createHomebrewDraft(state, { id: "wrapper", type: "feature" }, "player");
  wrapper.data.name = { en: "Wrapper", it: "Contenitore" };
  wrapper.data.source.label = "Original";
  wrapper.data.dependencies = [secret];
  saveHomebrewDraft(state, wrapper.id, { data: wrapper.data }, "player");
  const ref = apply(state, "wrapper").ref;
  shareHomebrewRevision(state, secret, { readers: [], editors: [] }, "dm");
  assert.equal(homebrewAvailability(state, ref, {}, "player").canUse, false);
  assert.throws(() => materializeHomebrewCopy(state, ref, "player", { id: "no-leak" }));
  assert.throws(() => exportHomebrewBundle(state, [ref], "player"));
  assert.equal(JSON.stringify(listHomebrew(state, "player")).includes("content-secret"), false);
});

test("import retains attribution without granting the external author local access", () => {
  const source = createInitialState(),
    ref = definition(source),
    bundle = exportHomebrewBundle(source, [ref], "player");
  const state = createInitialState();
  createHomebrewImportDraft(state, { id: "import", bundle }, "dm");
  apply(state, "import", "dm");
  assert.equal(getHomebrewRevision(state, ref, "dm").author, "player");
  assert.deepEqual(listHomebrew(state, "player"), []);
  assert.equal(homebrewAvailability(state, ref, {}, "player").readable, false);
});

test("a revision editor receives only the new revision, not share authority or private sibling revisions", () => {
  const state = createInitialState(),
    ref = definition(state, { role: "dm" });
  shareHomebrewRevision(state, ref, { readers: [], editors: ["player"] }, "dm");
  createHomebrewDraft(state, { id: "edited", kind: "revise", ref }, "player");
  const next = apply(state, "edited").ref;
  assert.equal(getHomebrewRevision(state, next, "player").permissions.canShare, false);
  assert.equal(getHomebrewRevision(state, next, "player").data.name.en, "Guild favour");
  assert.throws(() =>
    shareHomebrewRevision(state, next, { readers: ["dm"], editors: [] }, "player"),
  );
  assert.equal(getHomebrewRevision(state, next, "dm").permissions.canShare, true);
  createHomebrewDraft(state, { id: "private-sibling", kind: "revise", ref }, "dm");
  const privateRef = apply(state, "private-sibling", "dm").ref;
  assert.throws(() => getHomebrewRevision(state, privateRef, "player"));
  assert.equal(
    JSON.stringify(listHomebrew(state, "player")).includes(privateRef.revisionId),
    false,
  );
});

test("collecting an exact revision does not duplicate, grant, enable or share it", () => {
  const state = createInitialState(),
    ref = definition(state, { role: "dm" });
  shareHomebrewRevision(state, ref, { readers: ["player"], editors: [] }, "dm");
  const actors = structuredClone(state.actors);
  collectHomebrewRevision(state, ref, { collected: true }, "player");
  collectHomebrewRevision(state, ref, { collected: true }, "player");
  assert.equal(state.libraryCollections.player.length, 1);
  assert.equal(listHomebrew(state, "player")[0].collected, true);
  assert.equal(state.library.length, 1);
  assert.deepEqual(state.actors, actors);
  assert.deepEqual(state.campaign.enabledContent ?? [], []);
  collectHomebrewRevision(state, ref, { collected: false }, "player");
  assert.equal(listHomebrew(state, "player")[0].collected, false);
});

test("resource removal retains consumption and reintroduction of the same identity does not reset it", () => {
  const state = createInitialState(),
    actor = personal(state),
    ref = definition(state);
  createHomebrewDraft(state, { id: "assign", kind: "assign", ref, actorId: actor.id }, "player");
  const assigned = apply(state, "assign");
  actor.features.find((r) => r.id === assigned.instanceId).used = 2;
  createHomebrewDraft(state, { id: "remove-resource", kind: "revise", ref }, "player");
  let d = getHomebrewDraft(state, "remove-resource", "player");
  d.data.resource = null;
  saveHomebrewDraft(state, d.id, { data: d.data }, "player");
  const removed = apply(state, d.id).ref;
  createHomebrewDraft(
    state,
    {
      id: "update-remove",
      kind: "update",
      ref: removed,
      actorId: actor.id,
      instanceId: assigned.instanceId,
    },
    "player",
  );
  assert.equal(previewHomebrewDraft(state, "update-remove", "player").canApply, false);
  d = getHomebrewDraft(state, "update-remove", "player");
  d.data.resolutions.resource = "retain-history";
  saveHomebrewDraft(state, d.id, { data: d.data }, "player");
  apply(state, d.id);
  const row = actor.features.find((r) => r.id === assigned.instanceId);
  assert.equal(row.resourceHistory.favour.used, 2);
  assert.equal(Object.hasOwn(row, "used"), false);
  createHomebrewDraft(
    state,
    {
      id: "restore-resource",
      kind: "update",
      ref,
      actorId: actor.id,
      instanceId: assigned.instanceId,
    },
    "player",
  );
  apply(state, "restore-resource");
  assert.equal(actor.features.find((r) => r.id === assigned.instanceId).used, 2);
});

test("unknown consumption and another spell grant remain untouched during one instance update", () => {
  const state = createInitialState(),
    actor = personal(state),
    ref = definition(state, { type: "spell" });
  for (const id of ["first", "second"]) {
    createHomebrewDraft(state, { id, kind: "assign", ref, actorId: actor.id }, "player");
    apply(state, id);
  }
  const row = actor.spells.find((r) => r.id === "instance-first");
  row.used = null;
  row.prepared = true;
  row.grantId = "class:wizard";
  row.buildManaged = true;
  const second = structuredClone(actor.spells.find((r) => r.id === "instance-second"));
  createHomebrewDraft(state, { id: "next", kind: "revise", ref }, "player");
  const d = getHomebrewDraft(state, "next", "player");
  d.data.resource.max = 1;
  saveHomebrewDraft(state, d.id, { data: d.data }, "player");
  const next = apply(state, d.id).ref;
  createHomebrewDraft(
    state,
    { id: "update", kind: "update", ref: next, actorId: actor.id, instanceId: row.id },
    "player",
  );
  apply(state, "update");
  const updated = actor.spells.find((r) => r.id === row.id);
  assert.equal(updated.used, null);
  assert.equal(updated.prepared, true);
  assert.equal(updated.grantId, "class:wizard");
  assert.equal(updated.buildManaged, true);
  assert.deepEqual(
    actor.spells.find((r) => r.id === second.id),
    second,
  );
});

test("pending consequences and actor privacy are checked again at Apply with no partial mutation", () => {
  const state = createInitialState(),
    actor = personal(state),
    ref = definition(state);
  shareHomebrewRevision(state, ref, { readers: ["dm"], editors: [] }, "player");
  assert.throws(() =>
    createHomebrewDraft(state, { id: "intruder", kind: "assign", ref, actorId: actor.id }, "dm"),
  );
  createHomebrewDraft(state, { id: "assign", kind: "assign", ref, actorId: actor.id }, "player");
  const assigned = apply(state, "assign");
  createHomebrewDraft(state, { id: "next", kind: "revise", ref }, "player");
  const next = apply(state, "next").ref;
  createHomebrewDraft(
    state,
    { id: "update", kind: "update", ref: next, actorId: actor.id, instanceId: assigned.instanceId },
    "player",
  );
  const p = previewHomebrewDraft(state, "update", "player");
  state.combatReactions = [{ id: "reaction", actorId: actor.id, status: "pending" }];
  const before = structuredClone(actor);
  assert.equal(previewHomebrewDraft(state, "update", "player").canApply, false);
  assert.throws(() => applyHomebrewDraft(state, "update", { reviewKey: p.reviewKey }, "player"));
  assert.deepEqual(actor, before);
  state.combatReactions[0].status = "declined";
  apply(state, "update");
  assert.equal(
    actor.features.find((r) => r.id === assigned.instanceId).homebrewRef.revisionId,
    next.revisionId,
  );
});

test("malformed and circular imports produce review errors without accepting authority or code", () => {
  const original = createInitialState(),
    ref = definition(original),
    bundle = exportHomebrewBundle(original, [ref], "player");
  for (const [id, change] of [
    [
      "bad-number",
      (b) => {
        b.contents[0].revisions[0].data.resource.max = "3";
      },
    ],
    [
      "code",
      (b) => {
        b.contents[0].revisions[0].data.activities = [
          {
            id: "eval",
            name: { en: "Run" },
            description: { en: "" },
            kind: "script",
            code: "throw 1",
          },
        ];
      },
    ],
    [
      "cycle",
      (b) => {
        b.contents[0].revisions[0].data.dependencies = [ref];
      },
    ],
    [
      "access",
      (b) => {
        b.contents[0].accessByRevision = {};
      },
    ],
  ]) {
    const state = createInitialState(),
      bad = structuredClone(bundle);
    change(bad);
    createHomebrewImportDraft(state, { id, bundle: bad }, "player");
    const p = previewHomebrewDraft(state, id, "player");
    assert.equal(p.canApply, false, id);
    assert.throws(() => applyHomebrewDraft(state, id, { reviewKey: p.reviewKey }, "player"));
    assert.deepEqual(state.library, []);
  }
});

test("a physical healing throw already pending blocks only its actor's structural update", () => {
  const state = createInitialState(),
    actor = personal(state),
    ref = definition(state);
  createHomebrewDraft(state, { id: "assign", kind: "assign", ref, actorId: actor.id }, "player");
  const assigned = apply(state, "assign");
  createHomebrewDraft(state, { id: "next", kind: "revise", ref }, "player");
  const next = apply(state, "next").ref;
  createHomebrewDraft(
    state,
    { id: "update", kind: "update", ref: next, actorId: actor.id, instanceId: assigned.instanceId },
    "player",
  );
  state.actors.doran.pendingHealing = { id: "other", itemId: "potion", mode: "physical" };
  assert.equal(previewHomebrewDraft(state, "update", "player").canApply, true);
  actor.pendingHealing = { id: "own", itemId: "potion", mode: "physical" };
  assert.equal(previewHomebrewDraft(state, "update", "player").canApply, false);
  actor.pendingHealing = null;
  apply(state, "update");
  assert.equal(state.actors.doran.pendingHealing.id, "other");
});

test("a pure materialization cannot target an uncontrolled private actor", () => {
  const state = createInitialState(),
    ref = definition(state);
  personal(state);
  shareHomebrewRevision(state, ref, { readers: ["dm"], editors: [] }, "player");
  assert.throws(() => materializeHomebrewCopy(state, ref, "dm", { id: "copy", actorId: "livia" }));
});

test("an unrelated note or library definition does not invalidate the reviewed instance update", () => {
  const state = createInitialState(),
    actor = personal(state),
    ref = definition(state);
  createHomebrewDraft(state, { id: "assign", kind: "assign", ref, actorId: actor.id }, "player");
  const assigned = apply(state, "assign");
  createHomebrewDraft(state, { id: "next", kind: "revise", ref }, "player");
  const next = apply(state, "next").ref;
  createHomebrewDraft(
    state,
    { id: "update", kind: "update", ref: next, actorId: actor.id, instanceId: assigned.instanceId },
    "player",
  );
  const p = previewHomebrewDraft(state, "update", "player");
  actor.notes = "An unrelated live note";
  actor.hp = 2;
  definition(state, { id: "other", role: "dm" });
  assert.equal(previewHomebrewDraft(state, "update", "player").reviewKey, p.reviewKey);
  applyHomebrewDraft(state, "update", { reviewKey: p.reviewKey }, "player");
  assert.equal(actor.notes, "An unrelated live note");
  assert.equal(actor.hp, 2);
});

test("read access and revision edit access cannot broaden restricted source capabilities", () => {
  const state = createInitialState();
  const d = createHomebrewDraft(state, { id: "limited", type: "feature" }, "player");
  d.data.name = { en: "Limited", it: "Limitato" };
  d.data.source.label = "Reconstruction with declared restrictions";
  d.data.source.kind = "reconstruction";
  d.data.source.rights = { modify: true, share: false, export: false };
  saveHomebrewDraft(state, d.id, { data: d.data }, "player");
  const ref = apply(state, d.id).ref;
  assert.throws(() =>
    shareHomebrewRevision(state, ref, { readers: ["dm"], editors: [] }, "player"),
  );
  assert.throws(() => exportHomebrewBundle(state, [ref], "player"));
  createHomebrewDraft(state, { id: "copy", kind: "duplicate", ref }, "player");
  const copyDraft = getHomebrewDraft(state, "copy", "player");
  copyDraft.data.source.rights.export = true;
  saveHomebrewDraft(state, copyDraft.id, { data: copyDraft.data }, "player");
  assert.equal(previewHomebrewDraft(state, copyDraft.id, "player").canApply, false);
  copyDraft.data.source.rights.export = false;
  saveHomebrewDraft(state, copyDraft.id, { data: copyDraft.data }, "player");
  const duplicate = apply(state, copyDraft.id).ref;
  assert.equal(homebrewAvailability(state, duplicate, {}, "player").canExport, false);
});

test("a readable update can be compared before its exact campaign revision is enabled", () => {
  const state = createInitialState(),
    actor = state.actors.livia;
  const ref = definition(state);
  shareHomebrewRevision(state, ref, { readers: ["dm"], editors: [] }, "player");
  enableHomebrewRevision(state, ref, { enabled: true }, "dm");
  createHomebrewDraft(state, { id: "assign", kind: "assign", ref, actorId: actor.id }, "player");
  const assigned = apply(state, "assign");
  actor.features.find((row) => row.id === assigned.instanceId).used = 2;
  createHomebrewDraft(state, { id: "next", kind: "revise", ref }, "player");
  const revisionDraft = getHomebrewDraft(state, "next", "player");
  revisionDraft.data.resource.max = 4;
  saveHomebrewDraft(state, revisionDraft.id, { data: revisionDraft.data }, "player");
  const next = apply(state, "next").ref;
  const before = structuredClone(actor),
    enabledBefore = structuredClone(state.campaign.enabledContent);
  createHomebrewDraft(
    state,
    {
      id: "update",
      kind: "update",
      ref: next,
      actorId: actor.id,
      instanceId: assigned.instanceId,
    },
    "player",
  );
  const blocked = previewHomebrewDraft(state, "update", "player");
  assert.equal(blocked.canApply, false);
  assert.equal(blocked.permissions.canAssign, false);
  assert.equal(blocked.proposed.max, 4);
  assert.equal(blocked.proposed.used, 2);
  assert.ok(
    blocked.diff.some((entry) => entry.path === "max" && entry.base === 3 && entry.candidate === 4),
  );
  assert.ok(blocked.errors.some((entry) => entry.code === "context-unavailable"));
  assert.throws(() =>
    applyHomebrewDraft(state, "update", { reviewKey: blocked.reviewKey }, "player"),
  );
  assert.deepEqual(actor, before);
  assert.deepEqual(state.campaign.enabledContent, enabledBefore);
  assert.equal(homebrewAvailability(state, next, {}, "dm").readable, false);
  assert.throws(() =>
    createHomebrewDraft(
      state,
      {
        id: "assign-unavailable",
        kind: "assign",
        ref: next,
        actorId: actor.id,
      },
      "player",
    ),
  );
  assert.throws(() =>
    materializeHomebrewCopy(state, next, "player", { id: "copy", actorId: actor.id }),
  );
  assert.throws(() =>
    createHomebrewDraft(
      state,
      {
        id: "other-instance",
        kind: "update",
        ref: next,
        actorId: actor.id,
        instanceId: "not-matching",
      },
      "player",
    ),
  );
  shareHomebrewRevision(state, next, { readers: ["dm"], editors: [] }, "player");
  enableHomebrewRevision(state, next, { enabled: true }, "dm");
  assert.throws(() =>
    applyHomebrewDraft(state, "update", { reviewKey: blocked.reviewKey }, "player"),
  );
  apply(state, "update");
  const updated = actor.features.find((row) => row.id === assigned.instanceId);
  assert.equal(updated.max, 4);
  assert.equal(updated.used, 2);
  assert.deepEqual(updated.homebrewRef, next);
});

test("comparison permission never grants access to an unreadable candidate or an uncontrolled actor", () => {
  const state = createInitialState(),
    actor = state.actors.livia;
  const ref = definition(state, { role: "dm" });
  shareHomebrewRevision(state, ref, { readers: ["player"], editors: [] }, "dm");
  enableHomebrewRevision(state, ref, { enabled: true }, "dm");
  createHomebrewDraft(state, { id: "assign", kind: "assign", ref, actorId: actor.id }, "player");
  const assigned = apply(state, "assign");
  createHomebrewDraft(state, { id: "next", kind: "revise", ref }, "dm");
  const next = apply(state, "next", "dm").ref;
  const request = {
    id: "update",
    kind: "update",
    ref: next,
    actorId: actor.id,
    instanceId: assigned.instanceId,
  };
  assert.throws(() => createHomebrewDraft(state, request, "player"));
  shareHomebrewRevision(state, next, { readers: ["player"], editors: [] }, "dm");
  createHomebrewDraft(state, request, "player");
  assert.ok(previewHomebrewDraft(state, "update", "player").proposed);
  shareHomebrewRevision(state, next, { readers: [], editors: [] }, "dm");
  const denied = previewHomebrewDraft(state, "update", "player");
  assert.equal(denied.proposed, null);
  assert.deepEqual(denied.diff, []);
  assert.equal(denied.canApply, false);
  assert.throws(() =>
    applyHomebrewDraft(state, "update", { reviewKey: denied.reviewKey }, "player"),
  );
  actor.visibility = "private";
  actor.campaignIds = [];
  assert.throws(() => createHomebrewDraft(state, { ...request, id: "uncontrolled" }, "dm"));
});

test("new copies on shared actors require current source access for the actor's entire audience", () => {
  const state = createInitialState(),
    actor = state.actors.livia,
    ref = definition(state);
  shareHomebrewRevision(state, ref, { readers: ["dm"], editors: [] }, "player");
  enableHomebrewRevision(state, ref, { enabled: true }, "dm");
  createHomebrewDraft(
    state,
    { id: "assign-before-revocation", kind: "assign", ref, actorId: actor.id },
    "player",
  );
  shareHomebrewRevision(state, ref, { readers: [], editors: [] }, "player");
  const before = structuredClone(actor);
  assert.equal(homebrewAvailability(state, ref, { actorId: actor.id }, "player").canUse, false);
  assert.throws(() =>
    materializeHomebrewCopy(state, ref, "player", { id: "unsafe", actorId: actor.id }),
  );
  assert.throws(() =>
    createHomebrewDraft(
      state,
      { id: "assign-after", kind: "assign", ref, actorId: actor.id },
      "player",
    ),
  );
  const pending = previewHomebrewDraft(state, "assign-before-revocation", "player");
  assert.equal(pending.canApply, false);
  assert.throws(() =>
    applyHomebrewDraft(
      state,
      "assign-before-revocation",
      { reviewKey: pending.reviewKey },
      "player",
    ),
  );
  assert.deepEqual(actor, before);
  actor.visibility = "private";
  actor.campaignIds = [];
  assert.equal(homebrewAvailability(state, ref, { actorId: actor.id }, "player").canUse, true);
  assert.equal(
    materializeHomebrewCopy(state, ref, "player", { id: "personal", actorId: actor.id }).targetKind,
    "features",
  );
});

test("a shared actor update remains comparable but cannot expose a candidate or dependency to a revoked audience", () => {
  const state = createInitialState(),
    actor = state.actors.livia,
    ref = definition(state);
  shareHomebrewRevision(state, ref, { readers: ["dm"], editors: [] }, "player");
  enableHomebrewRevision(state, ref, { enabled: true }, "dm");
  createHomebrewDraft(state, { id: "assign", kind: "assign", ref, actorId: actor.id }, "player");
  const assigned = apply(state, "assign");
  actor.features.find((row) => row.id === assigned.instanceId).used = 2;
  const dependency = definition(state, { id: "dependency" });
  shareHomebrewRevision(state, dependency, { readers: ["dm"], editors: [] }, "player");
  enableHomebrewRevision(state, dependency, { enabled: true }, "dm");
  createHomebrewDraft(state, { id: "next", kind: "revise", ref }, "player");
  const d = getHomebrewDraft(state, "next", "player");
  d.data.resource.max = 4;
  d.data.dependencies = [dependency];
  saveHomebrewDraft(state, d.id, { data: d.data }, "player");
  const next = apply(state, d.id).ref;
  shareHomebrewRevision(state, next, { readers: ["dm"], editors: [] }, "player");
  enableHomebrewRevision(state, next, { enabled: true }, "dm");
  shareHomebrewRevision(state, dependency, { readers: [], editors: [] }, "player");
  const before = structuredClone(actor);
  createHomebrewDraft(
    state,
    { id: "update", kind: "update", ref: next, actorId: actor.id, instanceId: assigned.instanceId },
    "player",
  );
  const p = previewHomebrewDraft(state, "update", "player");
  assert.equal(p.canApply, false);
  assert.equal(p.proposed.max, 4);
  assert.equal(p.proposed.used, 2);
  assert.ok(p.diff.some((entry) => entry.path === "max"));
  assert.throws(() => applyHomebrewDraft(state, "update", { reviewKey: p.reviewKey }, "player"));
  assert.deepEqual(actor, before);
  shareHomebrewRevision(state, dependency, { readers: ["dm"], editors: [] }, "player");
  apply(state, "update");
  assert.equal(actor.features.find((row) => row.id === assigned.instanceId).max, 4);
  shareHomebrewRevision(state, next, { readers: [], editors: [] }, "player");
  assert.equal(actor.features.find((row) => row.id === assigned.instanceId).used, 2);
  assert.deepEqual(actor.features.find((row) => row.id === assigned.instanceId).homebrewRef, next);
});

test("the owner may reduce existing access after a revision disables sharing without granting new privileges", () => {
  const state = createInitialState(),
    ref = definition(state);
  shareHomebrewRevision(state, ref, { readers: [], editors: ["dm"] }, "player");
  createHomebrewDraft(state, { id: "restricted", kind: "revise", ref }, "dm");
  const draft = getHomebrewDraft(state, "restricted", "dm");
  draft.data.source.rights.share = false;
  saveHomebrewDraft(state, draft.id, { data: draft.data }, "dm");
  const next = apply(state, draft.id, "dm").ref;
  const projection = getHomebrewRevision(state, next, "player");
  assert.equal(projection.permissions.canShare, false);
  assert.equal(projection.permissions.canManageAccess, true);
  assert.deepEqual(projection.access.editors, ["dm"]);
  shareHomebrewRevision(state, next, { readers: ["dm"], editors: [] }, "player");
  assert.equal(getHomebrewRevision(state, next, "dm").permissions.canRevise, false);
  assert.throws(() =>
    shareHomebrewRevision(state, next, { readers: ["dm"], editors: ["dm"] }, "player"),
  );
  shareHomebrewRevision(state, next, { readers: [], editors: [] }, "player");
  assert.equal(homebrewAvailability(state, next, {}, "dm").readable, false);
  assert.throws(() =>
    shareHomebrewRevision(state, next, { readers: ["dm"], editors: [] }, "player"),
  );
  assert.equal(getHomebrewRevision(state, next, "player").permissions.canManageAccess, true);
  assert.throws(() => shareHomebrewRevision(state, next, { readers: [], editors: [] }, "dm"));
});

test("reintroducing the same retained resource preserves its local maxima and recovery corrections", () => {
  const state = createInitialState(),
    actor = personal(state),
    ref = definition(state);
  createHomebrewDraft(state, { id: "assign", kind: "assign", ref, actorId: actor.id }, "player");
  const assigned = apply(state, "assign");
  const row = actor.features.find((entry) => entry.id === assigned.instanceId);
  row.used = 2;
  row.max = 5;
  row.recovery = "short-rest";
  createHomebrewDraft(state, { id: "removed", kind: "revise", ref }, "player");
  let draft = getHomebrewDraft(state, "removed", "player");
  draft.data.resource = null;
  saveHomebrewDraft(state, draft.id, { data: draft.data }, "player");
  const removed = apply(state, draft.id).ref;
  createHomebrewDraft(
    state,
    { id: "remove", kind: "update", ref: removed, actorId: actor.id, instanceId: row.id },
    "player",
  );
  draft = getHomebrewDraft(state, "remove", "player");
  draft.data.resolutions = {
    max: "keep-local",
    recovery: "keep-local",
    resource: "retain-history",
  };
  saveHomebrewDraft(state, draft.id, { data: draft.data }, "player");
  apply(state, draft.id);
  createHomebrewDraft(
    state,
    { id: "restore", kind: "update", ref, actorId: actor.id, instanceId: row.id },
    "player",
  );
  const p = previewHomebrewDraft(state, "restore", "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  assert.equal(p.proposed.used, 2);
  assert.equal(p.proposed.max, 5);
  assert.equal(p.proposed.recovery, "short-rest");
  createHomebrewDraft(state, { id: "changed-same-pool", kind: "revise", ref }, "player");
  let changed = getHomebrewDraft(state, "changed-same-pool", "player");
  changed.data.resource.max = 4;
  changed.data.resource.recovery = "long-rest";
  saveHomebrewDraft(state, changed.id, { data: changed.data }, "player");
  const changedRef = apply(state, changed.id).ref;
  createHomebrewDraft(
    state,
    {
      id: "restore-conflict",
      kind: "update",
      ref: changedRef,
      actorId: actor.id,
      instanceId: row.id,
    },
    "player",
  );
  const conflicting = previewHomebrewDraft(state, "restore-conflict", "player");
  assert.equal(conflicting.canApply, false);
  assert.deepEqual(conflicting.conflicts.map((entry) => entry.path).sort(), ["max", "recovery"]);
  assert.equal(conflicting.proposed.used, 2);
  apply(state, "restore");
  createHomebrewDraft(state, { id: "different", kind: "revise", ref }, "player");
  draft = getHomebrewDraft(state, "different", "player");
  draft.data.resource = { id: "different-pool", max: 7, recovery: "long-rest" };
  saveHomebrewDraft(state, draft.id, { data: draft.data }, "player");
  const other = apply(state, draft.id).ref;
  createHomebrewDraft(
    state,
    { id: "replace", kind: "update", ref: other, actorId: actor.id, instanceId: row.id },
    "player",
  );
  draft = getHomebrewDraft(state, "replace", "player");
  draft.data.resolutions.resource = "retain-history";
  saveHomebrewDraft(state, draft.id, { data: draft.data }, "player");
  const replacement = previewHomebrewDraft(state, "replace", "player");
  assert.equal(replacement.canApply, true, JSON.stringify(replacement.errors));
  assert.equal(replacement.proposed.max, 7);
  assert.equal(replacement.proposed.recovery, "long-rest");
  assert.equal(replacement.proposed.used, null);
});

test("an import draft retains a typed return context across reload without returning before Apply", () => {
  const source = createInitialState(),
    ref = definition(source),
    bundle = exportHomebrewBundle(source, [ref], "player");
  let state = createInitialState();
  const returnTo = {
    page: "builder",
    draftId: "build",
    section: "features",
    targetKind: "features",
  };
  createHomebrewImportDraft(state, { id: "import", bundle, returnTo }, "player");
  state = JSON.parse(JSON.stringify(state));
  assert.deepEqual(getHomebrewDraft(state, "import", "player").returnTo, returnTo);
  assert.deepEqual(state.library, []);
  assert.deepEqual(apply(state, "import").returnTo, returnTo);
  assert.throws(() =>
    createHomebrewImportDraft(
      state,
      { id: "bad-return", bundle, returnTo: { page: "javascript:alert(1)" } },
      "player",
    ),
  );
});
