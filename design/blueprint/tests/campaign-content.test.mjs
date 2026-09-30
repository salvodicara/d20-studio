import test from "node:test";
import assert from "node:assert/strict";
const c = await import("../campaign-content.mjs").catch(() => ({}));
const api = () =>
  assert.equal(typeof c.createCampaignDraft, "function", "content domain API is implemented");
function fixture() {
  return {
    actors: {
      hero: {
        id: "hero",
        kind: "character",
        owner: "alice",
        visibility: "private",
        hp: 4,
        notes: "private actor text",
      },
    },
    campaign: {
      id: "camp",
      name: "Synthetic campaign",
      members: [
        { id: "alice", name: "Alice", role: "player" },
        { id: "bob", name: "Bob", role: "player" },
        { id: "cara", name: "Cara", role: "player" },
        { id: "dm", name: "DM", role: "dm" },
        { id: "drew", name: "Drew", role: "co-dm" },
      ],
      sessions: [],
    },
    scenes: [],
    library: [],
    log: [],
    combat: { active: true, round: 2 },
  };
}
const selected = (grants) => ({ mode: "selected", grants });
const grant = (id, edit = false, invite = false) => ({ id, read: true, edit, invite });
function draft(
  state,
  id,
  { kind = "note", campaignId = "camp", entryId, restoreRevisionId } = {},
  who = "alice",
) {
  return c.createCampaignDraft(state, { id, kind, campaignId, entryId, restoreRevisionId }, who);
}
function save(state, d, data = {}, who = "alice", access = d.access) {
  return c.saveCampaignDraft(
    state,
    d.id,
    { data: { ...d.data, ...data }, access, expectedDraftRevision: d.revision },
    who,
  );
}
function apply(state, id, who = "alice", options = {}) {
  const p = c.previewCampaignDraft(state, id, who);
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  return c.applyCampaignDraft(state, id, { reviewKey: p.reviewKey }, who, options);
}
function entry(state, id = "first", access = { mode: "private", grants: [] }) {
  const d = draft(state, id);
  save(state, d, { title: "Clue", body: "Initial text" }, "alice", access);
  return apply(state, id).entryId;
}
test("private entries and drafts are invisible to DM, readers and actor controllers", () => {
  api();
  const s = fixture(),
    id = entry(s);
  assert.equal(c.listCampaignEntries(s, {}, "alice").length, 1);
  for (const viewer of ["bob", "cara", "dm", "drew"]) {
    assert.deepEqual(c.listCampaignEntries(s, { query: "Clue" }, viewer), []);
    assert.deepEqual(c.listCampaignDrafts(s, viewer), []);
    assert.throws(() => c.getCampaignEntry(s, id, viewer), /unavailable/i);
    assert.throws(() => c.getCampaignDraft(s, "first", viewer), /unavailable/i);
  }
  const p = c.previewCampaignDraft(s, draft(s, "personal", { campaignId: null }).id, "alice");
  assert.equal(p.commit.local, true);
});
test("read, edit and delegated invitation are distinct and never follow DM status", () => {
  api();
  const s = fixture(),
    id = entry(s, "permissions", selected([grant("bob"), grant("cara", true)]));
  assert.equal(c.getCampaignEntry(s, id, "bob").permissions.canEdit, false);
  assert.throws(() => draft(s, "reader-edit", { entryId: id }, "bob"));
  assert.throws(() =>
    c.inviteCampaignReader(s, id, { memberId: "dm", expectedAccessRevision: 0 }, "cara"),
  );
  const p = c.getCampaignEntry(s, id, "alice");
  c.setCampaignEntryAccess(
    s,
    id,
    {
      access: selected([grant("bob"), grant("cara", true, true)]),
      expectedAccessRevision: p.accessRevision,
    },
    "alice",
  );
  c.inviteCampaignReader(
    s,
    id,
    { memberId: "dm", expectedAccessRevision: c.getCampaignEntry(s, id, "cara").accessRevision },
    "cara",
  );
  assert.equal(c.getCampaignEntry(s, id, "dm").permissions.canRead, true);
  assert.equal(c.getCampaignEntry(s, id, "dm").permissions.canEdit, false);
  assert.equal(c.getCampaignEntry(s, id, "dm").permissions.canInvite, false);
  assert.throws(() =>
    c.setCampaignEntryAccess(s, id, { access: { mode: "campaign", grants: [] } }, "cara"),
  );
});
test("revoking an editor preserves saved contributions and their current unsaved private draft", () => {
  api();
  const s = fixture(),
    id = entry(s, "revoke", selected([grant("cara", true)]));
  let d = draft(s, "contribute", { entryId: id }, "cara");
  save(s, d, { body: "Saved contribution" }, "cara");
  apply(s, d.id, "cara");
  d = draft(s, "working", { entryId: id }, "cara");
  save(s, d, { body: "Unpublished work" }, "cara");
  c.setCampaignEntryAccess(
    s,
    id,
    {
      access: { mode: "private", grants: [] },
      expectedAccessRevision: c.getCampaignEntry(s, id, "alice").accessRevision,
    },
    "alice",
  );
  assert.equal(c.getCampaignEntry(s, id, "alice").data.body, "Saved contribution");
  assert.equal(c.getCampaignDraft(s, d.id, "cara").data.body, "Unpublished work");
  const p = c.previewCampaignDraft(s, d.id, "cara");
  assert.equal(p.canApply, false);
  assert.equal(p.current, null);
  assert.throws(() => c.applyCampaignDraft(s, d.id, { reviewKey: p.reviewKey }, "cara"));
});
test("history uses revision audience and current access; sharing current text does not reveal earlier private versions", () => {
  api();
  const s = fixture(),
    id = entry(s, "history");
  const first = c.getCampaignEntry(s, id, "alice").revisionId;
  const d = draft(s, "second", { entryId: id });
  save(s, d, { body: "Current shareable text" });
  apply(s, d.id);
  c.setCampaignEntryAccess(
    s,
    id,
    {
      access: selected([grant("bob")]),
      expectedAccessRevision: c.getCampaignEntry(s, id, "alice").accessRevision,
    },
    "alice",
  );
  const visible = c.getCampaignEntry(s, id, "bob");
  assert.equal(visible.data.body, "Current shareable text");
  assert.equal(
    visible.history.some((r) => r.id === first),
    false,
  );
  assert.throws(() => c.getCampaignEntry(s, id, "bob", { revisionId: first }));
  c.setCampaignEntryAccess(
    s,
    id,
    { access: { mode: "private", grants: [] }, expectedAccessRevision: visible.accessRevision },
    "alice",
  );
  assert.throws(() => c.getCampaignEntry(s, id, "bob", { revisionId: visible.revisionId }));
});
test("dynamic DM group does not give a newly appointed DM previous private history", () => {
  api();
  const s = fixture(),
    id = entry(s, "dms", { mode: "dms", grants: [] });
  const old = c.getCampaignEntry(s, id, "dm").revisionId;
  s.campaign.members.find((x) => x.id === "bob").role = "dm";
  const d = draft(s, "later", { entryId: id });
  save(s, d, { body: "For the current DMs" });
  apply(s, d.id);
  assert.equal(c.getCampaignEntry(s, id, "bob").data.body, "For the current DMs");
  assert.throws(() => c.getCampaignEntry(s, id, "bob", { revisionId: old }));
});
test("secret sections and link destinations are projected before search and cannot be erased by an editor", () => {
  api();
  const s = fixture(),
    secret = entry(s, "destination");
  const d = draft(s, "public");
  save(
    s,
    d,
    {
      title: "Visible",
      body: "Public body",
      links: [{ kind: "entry", id: secret }],
      sections: [
        {
          id: "hidden",
          title: "Secret title",
          body: "hidden-password",
          access: { mode: "private", grants: [] },
        },
        {
          id: "common",
          title: "Shared detail",
          body: "Visible detail",
          access: { mode: "campaign", grants: [] },
        },
      ],
    },
    "alice",
    selected([grant("bob"), grant("cara", true)]),
  );
  const id = apply(s, d.id).entryId;
  const view = c.getCampaignEntry(s, id, "cara");
  assert.equal(view.data.sections.length, 1);
  assert.deepEqual(view.data.links, []);
  assert.deepEqual(c.listCampaignEntries(s, { query: "hidden-password" }, "bob"), []);
  assert.deepEqual(
    c.resolveCampaignLinks(
      s,
      [
        { kind: "entry", id: secret },
        { kind: "actor", id: "hero" },
      ],
      "bob",
    ),
    [],
  );
  const edit = draft(s, "edit-visible", { entryId: id }, "cara");
  edit.data.sections[0].body = "Edited detail";
  save(s, edit, { body: "Edited common body" }, "cara");
  apply(s, edit.id, "cara");
  const owner = c.getCampaignEntry(s, id, "alice");
  assert.equal(owner.data.sections.find((x) => x.id === "hidden").body, "hidden-password");
  assert.equal(owner.data.sections.find((x) => x.id === "common").body, "Edited detail");
});
test("an editor cannot add secret sections or widen section access", () => {
  api();
  const s = fixture(),
    id = entry(s, "section-authority", selected([grant("cara", true)]));
  const d = draft(s, "inject", { entryId: id }, "cara");
  save(
    s,
    d,
    {
      sections: [
        { id: "new", title: "New", body: "Injected", access: { mode: "campaign", grants: [] } },
      ],
    },
    "cara",
  );
  assert.equal(c.previewCampaignDraft(s, d.id, "cara").canApply, false);
});
test("concurrent edits preserve input and require explicit rebase; unrelated HP does not invalidate preview", () => {
  api();
  const s = fixture(),
    id = entry(s, "conflict", selected([grant("cara", true)]));
  const a = draft(s, "a", { entryId: id }),
    b = draft(s, "b", { entryId: id }, "cara");
  save(s, a, { body: "First writer" });
  save(s, b, { body: "Second writer" }, "cara");
  apply(s, a.id);
  let p = c.previewCampaignDraft(s, b.id, "cara");
  assert.equal(p.canApply, false);
  assert.equal(p.current.data.body, "First writer");
  assert.equal(p.draft.data.body, "Second writer");
  const saved = c.getCampaignDraft(s, b.id, "cara");
  c.saveCampaignDraft(
    s,
    b.id,
    {
      data: saved.data,
      baseRevisionId: p.current.revisionId,
      expectedDraftRevision: saved.revision,
    },
    "cara",
  );
  p = c.previewCampaignDraft(s, b.id, "cara");
  assert.equal(p.canApply, true);
  s.actors.hero.hp = 1;
  assert.equal(c.previewCampaignDraft(s, b.id, "cara").reviewKey, p.reviewKey);
  apply(s, b.id, "cara");
  assert.equal(c.getCampaignEntry(s, id, "alice").data.body, "Second writer");
});
test("restoring text appends one revision and never rolls back ACL or gameplay, including reload retry", () => {
  api();
  let s = fixture();
  const id = entry(s, "restore"),
    old = c.getCampaignEntry(s, id, "alice").revisionId;
  let d = draft(s, "changed", { entryId: id });
  save(s, d, { body: "Changed text" });
  apply(s, d.id);
  c.setCampaignEntryAccess(
    s,
    id,
    {
      access: selected([grant("bob")]),
      expectedAccessRevision: c.getCampaignEntry(s, id, "alice").accessRevision,
    },
    "alice",
  );
  const game = JSON.stringify({ actors: s.actors, combat: s.combat });
  d = draft(s, "restore-now", { entryId: id, restoreRevisionId: old });
  const result = apply(s, d.id);
  s = JSON.parse(JSON.stringify(s));
  assert.deepEqual(c.applyCampaignDraft(s, d.id, { reviewKey: "retry" }, "alice"), result);
  assert.equal(c.getCampaignEntry(s, id, "alice").history.length, 3);
  assert.equal(c.getCampaignEntry(s, id, "bob").data.body, "Initial text");
  assert.equal(JSON.stringify({ actors: s.actors, combat: s.combat }), game);
});
test("recap hub, world/quest types and search use only saved readable entries", () => {
  api();
  const s = fixture();
  let d = draft(s, "recap", { kind: "recap" });
  save(s, d, { body: "The old tower" }, "alice", { mode: "campaign", grants: [] });
  const result = apply(s, d.id);
  d = draft(s, "later-secret", { kind: "recap" });
  save(s, d, { body: "Secret later recap" });
  apply(s, d.id);
  d = draft(s, "unpublished", { kind: "recap" });
  save(s, d, { body: "Not published" });
  const hub = c.getCampaignHub(s, "camp", "bob");
  assert.equal(hub.latestRecap.id, result.entryId);
  assert.equal(hub.counts.recaps, 1);
  d = draft(s, "quest", { kind: "quest" });
  save(s, d, { title: "Find a key", body: "No reward", questStatus: "completed" }, "alice", {
    mode: "campaign",
    grants: [],
  });
  const before = JSON.stringify(s.actors);
  apply(s, d.id);
  assert.equal(JSON.stringify(s.actors), before);
});
test("offline publication and access changes fail while private drafts and personal publication remain possible", () => {
  api();
  const s = fixture();
  let d = draft(s, "offline");
  save(s, d, { body: "Private local" });
  apply(s, d.id, "alice", { online: false });
  d = draft(s, "shared-offline");
  save(s, d, { body: "Share" }, "alice", { mode: "campaign", grants: [] });
  let p = c.previewCampaignDraft(s, d.id, "alice");
  assert.equal(p.commit.local, false);
  assert.throws(() =>
    c.applyCampaignDraft(s, d.id, { reviewKey: p.reviewKey }, "alice", { online: false }),
  );
  const id = c.getCampaignDraft(s, "offline", "alice").result.entryId;
  assert.throws(() =>
    c.setCampaignEntryAccess(
      s,
      id,
      { access: { mode: "campaign", grants: [] }, expectedAccessRevision: 0 },
      "alice",
      { online: false },
    ),
  );
});
test("one-time migration preserves legacy private owners and recap content without keeping duplicate sources", () => {
  api();
  const s = fixture();
  delete s.campaign.members;
  s.notes = [{ owner: "player", body: "Original private" }];
  s.campaign.summary = "Original summary";
  s.campaign.journal = [{ title: "Legacy title", body: "Legacy recap" }];
  c.migrateCampaignContent(s);
  const snapshot = JSON.stringify(s);
  c.migrateCampaignContent(s);
  assert.equal(JSON.stringify(s), snapshot);
  assert.equal(Object.hasOwn(s, "notes"), false);
  assert.equal(Object.hasOwn(s.campaign, "journal"), false);
  assert.equal(Object.hasOwn(s.campaign, "summary"), false);
  assert.equal(
    c.listCampaignEntries(s, { kind: "note" }, "player")[0].data.body,
    "Original private",
  );
  assert.deepEqual(c.listCampaignEntries(s, { kind: "note" }, "dm"), []);
  assert.equal(c.listCampaignEntries(s, { kind: "recap" }, "player").length, 2);
});
test("revoked editor preview cannot disclose newly changed recipients", () => {
  api();
  const s = fixture(),
    id = entry(s, "leak", selected([grant("cara", true)])),
    d = draft(s, "revoked-copy", { entryId: id }, "cara");
  save(s, d, { body: "Still my work" }, "cara");
  c.setCampaignEntryAccess(
    s,
    id,
    { access: selected([grant("bob")]), expectedAccessRevision: 0 },
    "alice",
  );
  const p = c.previewCampaignDraft(s, d.id, "cara");
  assert.deepEqual(p.audience, []);
  assert.equal(p.proposed, null);
  assert.equal(p.current, null);
});
test("recipient preview is restricted to the draft and intersects caller and recipient visibility", () => {
  api();
  const s = fixture(),
    d = draft(s, "preview");
  save(
    s,
    d,
    {
      body: "Shared body",
      sections: [
        {
          id: "secret",
          title: "Owner only",
          body: "Never reveal",
          access: { mode: "private", grants: [] },
        },
      ],
    },
    "alice",
    selected([grant("bob"), grant("cara", true)]),
  );
  let p = c.previewCampaignAudience(s, d.id, "bob", "alice");
  assert.equal(p.data.body, "Shared body");
  assert.deepEqual(p.data.sections, []);
  assert.throws(() => c.previewCampaignAudience(s, d.id, "dm", "alice"));
  const id = apply(s, d.id).entryId,
    edit = draft(s, "editor-preview", { entryId: id }, "cara");
  p = c.previewCampaignAudience(s, edit.id, "alice", "cara");
  assert.deepEqual(p.data.sections, []);
  assert.equal(JSON.stringify(p).includes("Never reveal"), false);
});
test("typed return retains builder and library choice context but rejects arbitrary nested routes", () => {
  api();
  const s = fixture();
  for (const [id, returnTo] of [
    ["builder", { page: "builder", id: "character-draft", tab: "spells" }],
    [
      "library",
      {
        page: "library",
        id: "definition",
        revision: "revision-one",
        returnTo: JSON.stringify({
          page: "builder",
          draftId: "character-draft",
          section: "spells",
          grantId: "class:wizard",
        }),
      },
    ],
  ]) {
    const d = c.createCampaignDraft(s, { id, returnTo }, "alice");
    assert.deepEqual(d.returnTo, returnTo);
  }
  assert.throws(() =>
    c.createCampaignDraft(
      s,
      {
        id: "bad-route",
        returnTo: { page: "library", returnTo: JSON.stringify({ page: "javascript:alert(1)" }) },
      },
      "alice",
    ),
  );
});
test("migration distinguishes unknown legacy authors and dates from administrative ownership", () => {
  api();
  const s = fixture();
  s.campaign.journal = [
    { title: "Unknown author", body: "Kept text" },
    {
      id: "known",
      title: "Known author",
      body: "Player text",
      owner: "alice",
      author: "cara",
      createdAt: "2025-01-02T10:00:00.000Z",
    },
  ];
  c.migrateCampaignContent(s);
  const entries = c.listCampaignEntries(s, { kind: "recap" }, "alice");
  const unknown = entries.find((e) => e.data.title === "Unknown author"),
    known = entries.find((e) => e.data.title === "Known author");
  assert.equal(unknown.history[0].authorId, null);
  assert.equal(unknown.history[0].createdAt, null);
  assert.equal(known.ownerId, "alice");
  assert.equal(known.history[0].authorId, "cara");
  assert.equal(known.history[0].createdAt, "2025-01-02T10:00:00.000Z");
  assert.equal(
    s.campaignContent.entries.find((e) => e.id === unknown.id).revisions[0].provenance.kind,
    "legacy",
  );
});
test("a personal note can join a campaign context as the same entry without implicitly sharing", () => {
  api();
  const s = fixture(),
    d = draft(s, "alone", { campaignId: null });
  save(s, d, { body: "My own note" });
  const id = apply(s, d.id).entryId;
  const edit = draft(s, "connect-note", { entryId: id });
  c.saveCampaignDraft(
    s,
    edit.id,
    { data: edit.data, campaignId: "camp", expectedDraftRevision: edit.revision },
    "alice",
  );
  apply(s, edit.id);
  assert.equal(c.getCampaignEntry(s, id, "alice").campaignId, "camp");
  assert.deepEqual(c.listCampaignEntries(s, {}, "dm"), []);
  assert.equal(s.campaignContent.entries.length, 1);
});
test("unrecognized legacy data is rejected before any mutation or migrated flag", () => {
  api();
  for (const corrupt of [
    { notes: {} },
    { notes: [{ owner: "alice", body: { text: "Keep original" } }] },
    { journal: [{ body: 12 }] },
    { summary: { body: "Original" } },
  ]) {
    const s = fixture();
    if (Object.hasOwn(corrupt, "notes")) s.notes = corrupt.notes;
    if (Object.hasOwn(corrupt, "journal")) s.campaign.journal = corrupt.journal;
    if (Object.hasOwn(corrupt, "summary")) s.campaign.summary = corrupt.summary;
    const before = JSON.stringify(s);
    assert.throws(() => c.migrateCampaignContent(s));
    assert.equal(JSON.stringify(s), before);
  }
});
test("section history intersects current section access and restoring old text cannot restore its old ACL", () => {
  api();
  const s = fixture(),
    d = draft(s, "section-history");
  save(
    s,
    d,
    {
      body: "Body",
      sections: [
        {
          id: "s",
          title: "Section",
          body: "Initially shared",
          access: { mode: "campaign", grants: [] },
        },
      ],
    },
    "alice",
    selected([grant("bob"), grant("cara", true)]),
  );
  const id = apply(s, d.id).entryId,
    old = c.getCampaignEntry(s, id, "alice").revisionId;
  const change = draft(s, "make-secret", { entryId: id });
  change.data.sections[0].body = "Current secret";
  change.data.sections[0].access = { mode: "private", grants: [] };
  save(s, change);
  apply(s, change.id);
  assert.deepEqual(c.getCampaignEntry(s, id, "bob", { revisionId: old }).data.sections, []);
  const restore = draft(s, "restore-section", { entryId: id, restoreRevisionId: old });
  assert.equal(restore.data.sections[0].access.mode, "private");
  apply(s, restore.id);
  assert.deepEqual(c.getCampaignEntry(s, id, "bob").data.sections, []);
  assert.equal(c.getCampaignEntry(s, id, "alice").data.sections[0].body, "Initially shared");
});
test("editing visible text does not erase a narrator reference hidden from that editor", () => {
  api();
  const s = fixture(),
    d = draft(s, "narrator");
  save(s, d, { body: "Recap", narratorActorId: "hero" }, "alice", selected([grant("cara", true)]));
  const id = apply(s, d.id).entryId;
  const edit = draft(s, "edit-narrator", { entryId: id }, "cara");
  assert.equal(edit.data.narratorActorId, null);
  save(s, edit, { body: "Edited only body" }, "cara");
  apply(s, edit.id, "cara");
  assert.equal(c.getCampaignEntry(s, id, "alice").data.narratorActorId, "hero");
});
test("same access retry is idempotent without granting stale different recipients", () => {
  api();
  const s = fixture(),
    id = entry(s, "access-retry"),
    access = selected([grant("bob")]);
  c.setCampaignEntryAccess(s, id, { access, expectedAccessRevision: 0 }, "alice");
  assert.doesNotThrow(() =>
    c.setCampaignEntryAccess(s, id, { access, expectedAccessRevision: 0 }, "alice"),
  );
  assert.equal(c.getCampaignEntry(s, id, "alice").accessRevision, 1);
  assert.throws(() =>
    c.setCampaignEntryAccess(
      s,
      id,
      { access: selected([grant("cara")]), expectedAccessRevision: 0 },
      "alice",
    ),
  );
});

test("restoring a removed historical section brings back text privately and retains newer sections", () => {
  api();
  const s = fixture(),
    d = draft(s, "old-section");
  save(
    s,
    d,
    {
      body: "Body",
      sections: [
        {
          id: "old",
          title: "Old",
          body: "Old section text",
          access: { mode: "campaign", grants: [] },
        },
      ],
    },
    "alice",
    { mode: "campaign", grants: [] },
  );
  const id = apply(s, d.id).entryId,
    old = c.getCampaignEntry(s, id, "alice").revisionId;
  const replacement = draft(s, "new-sections", { entryId: id });
  save(s, replacement, {
    sections: [
      { id: "new", title: "New", body: "Keep new text", access: { mode: "private", grants: [] } },
    ],
  });
  apply(s, replacement.id);
  const restore = draft(s, "restore-removed", { entryId: id, restoreRevisionId: old });
  apply(s, restore.id);
  const own = c.getCampaignEntry(s, id, "alice");
  assert.equal(own.data.sections.find((section) => section.id === "old")?.body, "Old section text");
  assert.equal(own.data.sections.find((section) => section.id === "old").access.mode, "private");
  assert.equal(own.data.sections.find((section) => section.id === "new").body, "Keep new text");
  assert.deepEqual(c.getCampaignEntry(s, id, "bob").data.sections, []);
});

test("migration rejects unknown nonempty appointment shapes instead of inventing times", () => {
  api();
  const s = fixture();
  s.campaign.sessions = [{ id: "old", date: "Friday at nine" }];
  const before = JSON.stringify(s);
  assert.throws(() => c.migrateCampaignContent(s));
  assert.equal(JSON.stringify(s), before);
});
test("a session reference cannot be attached outside its readable campaign context", () => {
  api();
  const s = fixture();
  s.campaign.sessions = [{ id: "game" }];
  const d = draft(s, "foreign-session", { campaignId: null });
  save(s, d, { body: "Personal note", sessionId: "game" });
  assert.equal(c.previewCampaignDraft(s, d.id, "alice").canApply, false);
});
