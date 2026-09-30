import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import { esc } from "../ui.mjs";
import * as hb from "../homebrew.mjs";
import {
  renderLibrary,
  bindLibrary,
  startHomebrew,
  hasLibraryDraft,
  resetLibraryView,
  confirmLibraryNavigation,
} from "../library.mjs";

afterEach(() => resetLibraryView());
function harness() {
  const errors = [],
    commits = [];
  const ctx = {
    state: createInitialState(),
    role: "player",
    lang: "en",
    view: { page: "library" },
    esc,
    t: (it, en) => en,
    label: (v) => (typeof v === "object" && v ? v.en || v.it || "" : String(v ?? "")),
    toast(text, error) {
      if (error) errors.push(text);
    },
    navigate(page, params = {}) {
      this.view = { page, ...params };
      this.render();
    },
    commit(title, fn, options) {
      const copy = structuredClone(this.state);
      const result = fn(copy);
      this.state = copy;
      commits.push({ title, options });
      this.render();
      return result;
    },
    dialog(title, body, options) {
      this.modal = { title, body, options };
    },
    closeDialog() {},
    canControl(actor) {
      return actor.owner === this.role || this.role === "dm";
    },
    render() {
      this.html = renderLibrary(this);
      const nodes = [
        ...this.html.matchAll(/<(input|button|select|textarea)\b([^>]*)(?:>([\s\S]*?)<\/\1>|>)/g),
        ...this.html.matchAll(/<(form)\b([^>]*)>/g),
      ].map(([, tag, source, inner]) => {
        const attrs = Object.fromEntries(
          [...source.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, v ?? ""]),
        );
        const dataset = Object.fromEntries(
          Object.entries(attrs)
            .filter(([k]) => k.startsWith("data-"))
            .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
        );
        const events = {};
        return {
          attrs,
          dataset,
          events,
          tagName: tag.toUpperCase(),
          type: attrs.type || "",
          disabled: "disabled" in attrs,
          checked: "checked" in attrs,
          value:
            tag === "select"
              ? inner?.match(/<option value="([^"]*)" selected/)?.[1] || ""
              : tag === "textarea"
                ? inner || ""
                : attrs.value || "",
          addEventListener(type, callback) {
            events[type] = callback;
          },
        };
      });
      this.root = {
        querySelectorAll(selector) {
          const m = selector.match(/^\[([^=\]]+)(?:="([^"]*)")?\]$/);
          return m
            ? nodes.filter((n) => m[1] in n.attrs && (m[2] === undefined || n.attrs[m[1]] === m[2]))
            : [];
        },
        querySelector(selector) {
          return this.querySelectorAll(selector)[0] || null;
        },
      };
      bindLibrary(this.root, this);
    },
  };
  const node = (selector) => {
    const n = ctx.root.querySelector(selector);
    assert.ok(n, `Missing rendered control ${selector}`);
    return n;
  };
  return {
    ctx,
    errors,
    commits,
    node,
    click(selector) {
      const n = node(selector);
      assert.equal(n.disabled, false);
      return (n.onclick || n.events.click)?.({ preventDefault() {} });
    },
    input(path, value) {
      const n = node(`[data-library-path="${path}"]`);
      if (n.type === "checkbox") n.checked = value;
      else n.value = value;
      return n.events[n.tagName === "SELECT" || n.type === "checkbox" ? "change" : "input"]({
        target: n,
      });
    },
  };
}
function savedContent(h, name = "Synthetic guild feature", extra = {}, type = "feature") {
  const id = `seed-${h.ctx.state.library?.length || 0}`;
  const draft = hb.createHomebrewDraft(h.ctx.state, { id, type }, "player");
  hb.saveHomebrewDraft(
    h.ctx.state,
    id,
    {
      data: {
        ...draft.data,
        name: { en: name },
        source: { ...draft.data.source, label: "Synthetic authored fixture" },
        ...extra,
      },
      expectedRevision: draft.revision,
    },
    "player",
  );
  const preview = hb.previewHomebrewDraft(h.ctx.state, id, "player");
  return hb.applyHomebrewDraft(h.ctx.state, id, { reviewKey: preview.reviewKey }, "player").ref;
}

test("authoring is a private draft and applying requires a current preview", () => {
  const h = harness();
  h.ctx.render();
  startHomebrew(h.ctx, { type: "feature" });
  const id = h.ctx.view.id;
  h.input("name.en", "Guild <em>reputation</em>");
  h.input("source.label", "Original synthetic rule");
  assert.equal(hasLibraryDraft(), true);
  assert.equal(h.ctx.state.library?.length || 0, 0);
  h.click("[data-library-preview]");
  assert.equal(hasLibraryDraft(), false);
  assert.match(h.ctx.html, /Guild &lt;em&gt;reputation&lt;\/em&gt;/);
  h.click("[data-library-apply]");
  assert.equal(h.ctx.state.library.length, 1);
  assert.equal(h.ctx.view.revision, h.ctx.state.library[0].revisions[0].id);
  assert.equal(hb.getHomebrewDraft(h.ctx.state, id, "player").status, "applied");
  assert.ok(h.commits.every((c) => c.options.local && c.options.visibility === "private"));
  assert.deepEqual(h.errors, []);
});

function revision(h, ref, data) {
  const draft = hb.createHomebrewDraft(
    h.ctx.state,
    { id: `revision-${h.ctx.state.libraryDrafts.length}`, kind: "revise", ref },
    "player",
  );
  hb.saveHomebrewDraft(
    h.ctx.state,
    draft.id,
    { data: { ...draft.data, ...data }, expectedRevision: draft.revision },
    "player",
  );
  const preview = hb.previewHomebrewDraft(h.ctx.state, draft.id, "player");
  return hb.applyHomebrewDraft(h.ctx.state, draft.id, { reviewKey: preview.reviewKey }, "player")
    .ref;
}
function ownedCopy(h, ref) {
  Object.assign(h.ctx.state.actors.livia, { visibility: "private", campaignIds: [] });
  const draft = hb.createHomebrewDraft(
    h.ctx.state,
    { id: "assignment", kind: "assign", ref, actorId: "livia" },
    "player",
  );
  const p = hb.previewHomebrewDraft(h.ctx.state, draft.id, "player");
  const result = hb.applyHomebrewDraft(h.ctx.state, draft.id, { reviewKey: p.reviewKey }, "player");
  h.ctx.applyLibraryDraft = (id, key) =>
    h.ctx.commit(
      "Apply to current sheet",
      (state) => hb.applyHomebrewDraft(state, id, { reviewKey: key }, h.ctx.role),
      { local: true, visibility: "private" },
    );
  return h.ctx.state.actors.livia.features.find((row) => row.id === result.instanceId);
}
test("an instance return opens an update for its exact copy and preserves spent uses", () => {
  const h = harness(),
    first = savedContent(h, "Guild favour", {
      resource: { id: "favour", max: 3, recovery: "manual" },
    });
  const row = ownedCopy(h, first);
  const otherFeatures = structuredClone(
    h.ctx.state.actors.livia.features.filter((f) => f.id !== row.id),
  );
  row.used = 2;
  const next = revision(h, first, { resource: { id: "favour", max: 4, recovery: "manual" } });
  h.ctx.view = {
    page: "library",
    id: next.contentId,
    revision: next.revisionId,
    returnTo: JSON.stringify({
      page: "characters",
      actorId: "livia",
      tab: "features",
      instanceId: row.id,
    }),
  };
  h.ctx.render();
  h.click("[data-library-update]");
  const draft = hb.getHomebrewDraft(h.ctx.state, h.ctx.view.id, "player");
  assert.equal(draft.kind, "update");
  assert.equal(draft.instanceId, row.id);
  assert.match(h.ctx.html, /data-library-resource-available>2</);
  h.click("[data-library-apply]");
  const current = h.ctx.state.actors.livia.features.find((f) => f.id === row.id);
  assert.equal(current.used, 2);
  assert.equal(current.max, 4);
  assert.deepEqual(
    h.ctx.state.actors.livia.features.filter((f) => f.id !== row.id),
    otherFeatures,
  );
});
test("removing a resource has a reachable explicit history resolution", () => {
  const h = harness(),
    first = savedContent(h, "Guild favour", {
      resource: { id: "favour", max: 3, recovery: "manual" },
    });
  const row = ownedCopy(h, first);
  row.used = 2;
  const next = revision(h, first, { resource: null });
  h.ctx.render();
  startHomebrew(h.ctx, { kind: "update", ref: next, actorId: "livia", instanceId: row.id });
  const resolution = h.node('[data-library-resolution="resource"]');
  resolution.value = "retain-history";
  resolution.events.change({ target: resolution });
  h.click("[data-library-preview]");
  h.click("[data-library-apply]");
  assert.equal(
    h.ctx.state.actors.livia.features.find((f) => f.id === row.id).resourceHistory.favour.used,
    2,
  );
});

test("private details and drafts cannot be read by switching to DM", () => {
  const h = harness(),
    ref = savedContent(h, "Private synthetic secret");
  h.ctx.view = { page: "library", id: ref.contentId, revision: ref.revisionId };
  h.ctx.render();
  assert.match(h.ctx.html, /Private synthetic secret/);
  h.ctx.role = "dm";
  resetLibraryView();
  h.ctx.render();
  assert.doesNotMatch(h.ctx.html, /Private synthetic secret/);
  assert.doesNotMatch(h.ctx.html, /data-library-share/);
});

test("leaving a dirty draft can stay or save and continue without applying", () => {
  const h = harness();
  h.ctx.render();
  startHomebrew(h.ctx, { type: "feature" });
  h.input("name.en", "Unfinished feature");
  let continued = false;
  confirmLibraryNavigation(h.ctx, () => {
    continued = true;
  });
  assert.equal(continued, false);
  h.ctx.modal.options.onSubmit();
  assert.equal(continued, true);
  assert.equal(h.ctx.state.library?.length || 0, 0);
  resetLibraryView();
  h.ctx.render();
  assert.match(h.ctx.html, /Unfinished feature/);
});

test("revision detail and consumer return preserve the exact ref", () => {
  const h = harness(),
    ref = savedContent(h);
  const returnTo = {
    page: "builder",
    draftId: "builder-owned-draft",
    section: "features",
    targetKind: "features",
  };
  let selected;
  h.ctx.chooseLibraryContent = (value, target) => {
    selected = { value, target };
  };
  h.ctx.view = {
    page: "library",
    id: ref.contentId,
    revision: ref.revisionId,
    returnTo: JSON.stringify(returnTo),
  };
  h.ctx.render();
  h.click("[data-library-choose]");
  assert.deepEqual(selected, { value: ref, target: returnTo });
  assert.equal(
    (h.ctx.state.actors["livia"].features || []).some((f) => f.homebrewRef),
    false,
  );
});

test("revision labels use local date and time and never fall back to an opaque identity", () => {
  const h = harness(),
    ref = savedContent(h),
    saved = h.ctx.state.library[0].revisions[0];
  saved.createdAt = "2026-09-23T11:04:05.678Z";
  h.ctx.navigate("library", { id: ref.contentId, revision: ref.revisionId });
  const label = () =>
    h.ctx.html.match(/<select data-library-revision>[\s\S]*?<option[^>]*>([^<]*)<\/option>/)?.[1];
  assert.match(label(), /23 Sept 2026/);
  assert.doesNotMatch(label(), /\.678|T11:04|Z$/);
  h.ctx.lang = "it";
  h.ctx.render();
  assert.match(label(), /23 set 2026/);
  saved.createdAt = "";
  h.ctx.render();
  assert.equal(label(), "1 · Date unavailable");
  assert.equal(h.node("[data-library-revision]").value, ref.revisionId);
});

test("invalid local import explains the error and does not create usable content", async () => {
  const h = harness();
  h.ctx.render();
  const input = h.node("[data-library-import]");
  await input.events.change({
    target: { files: [{ size: 12, text: async () => "not JSON" }], value: "file.json" },
  });
  assert.equal(h.ctx.state.library?.length || 0, 0);
  assert.equal(h.ctx.state.libraryDrafts?.length || 0, 0);
  assert.ok(h.errors.length);
  assert.match(h.ctx.html, /JSON/);
});

test("search filters survive opening a detail and returning to results", () => {
  const h = harness(),
    first = savedContent(h, "Visible guild rule");
  savedContent(h, "Different synthetic rule");
  h.ctx.render();
  h.node("[data-library-query]").value = "guild";
  h.node("[data-library-search]").onsubmit({ preventDefault() {} });
  assert.match(h.ctx.html, /Visible guild rule/);
  assert.doesNotMatch(h.ctx.html, /Different synthetic rule/);
  h.click(`[data-library-open="${first.contentId}"]`);
  h.click("[data-library-back]");
  assert.equal(h.node("[data-library-query]").value, "guild");
  assert.doesNotMatch(h.ctx.html, /Different synthetic rule/);
  h.click("[data-library-clear]");
  assert.match(h.ctx.html, /Different synthetic rule/);
});

test("a duplicate is independent and revision editing leaves its saved base untouched", () => {
  const h = harness(),
    ref = savedContent(h, "Saved original");
  h.ctx.navigate("library", { id: ref.contentId, revision: ref.revisionId });
  h.click("[data-library-duplicate]");
  h.input("name.en", "Independent copy");
  h.click("[data-library-preview]");
  h.click("[data-library-apply]");
  assert.equal(h.ctx.state.library.length, 2);
  assert.notEqual(h.ctx.view.id, ref.contentId);
  const copiedRef = { contentId: h.ctx.view.id, revisionId: h.ctx.view.revision };
  h.click("[data-library-revise]");
  h.input("name.en", "Copy new revision");
  assert.equal(
    hb.getHomebrewRevision(h.ctx.state, copiedRef, "player").data.name.en,
    "Independent copy",
  );
  h.click("[data-library-preview]");
  h.click("[data-library-apply]");
  assert.equal(h.ctx.state.library.length, 2);
  assert.equal(hb.getHomebrewRevision(h.ctx.state, ref, "player").data.name.en, "Saved original");
  assert.equal(
    h.ctx.state.library.find((entry) => entry.id === copiedRef.contentId).revisions.length,
    2,
  );
});

test("sharing access, enabling a revision and collecting remain separate commands", () => {
  const h = harness(),
    ref = savedContent(h);
  const originalFeatures = structuredClone(h.ctx.state.actors.livia.features);
  h.ctx.navigate("library", { id: ref.contentId, revision: ref.revisionId });
  h.click("[data-library-share]");
  const form = new FormData();
  form.set("read-dm", "on");
  h.ctx.modal.options.onSubmit(form);
  assert.deepEqual(h.ctx.state.campaign.enabledContent || [], []);
  assert.equal(
    hb.getHomebrewRevision(h.ctx.state, ref, "dm").data.name.en,
    "Synthetic guild feature",
  );
  h.ctx.role = "dm";
  resetLibraryView();
  h.ctx.render();
  h.click("[data-library-collect]");
  assert.deepEqual(h.ctx.state.campaign.enabledContent || [], []);
  h.click("[data-library-enable]");
  assert.deepEqual(h.ctx.state.campaign.enabledContent, [ref]);
  assert.deepEqual(h.ctx.state.actors.livia.features, originalFeatures);
});

test("valid import stays in preview until Apply and duplicate import adds no revision", async () => {
  const source = harness(),
    ref = savedContent(source);
  const bundle = hb.exportHomebrewBundle(source.ctx.state, [ref], "player");
  const h = harness();
  for (let attempt = 0; attempt < 2; attempt++) {
    h.ctx.navigate("library");
    await h.node("[data-library-import]").events.change({
      target: { files: [{ size: 512, text: async () => JSON.stringify(bundle) }] },
    });
    assert.equal(h.ctx.state.library?.length || 0, attempt ? 1 : 0);
    assert.match(h.ctx.html, /New revisions/);
    h.click("[data-library-apply]");
    assert.equal(h.ctx.state.library.length, 1);
    assert.equal(h.ctx.state.library[0].revisions.length, 1);
  }
});

test("a delayed file read cannot replace a new unsaved draft", async () => {
  const source = harness(),
    ref = savedContent(source),
    bundle = hb.exportHomebrewBundle(source.ctx.state, [ref], "player"),
    h = harness();
  let finishRead;
  h.ctx.render();
  const pending = h.node("[data-library-import]").events.change({
    target: {
      files: [
        {
          size: 512,
          text: () =>
            new Promise((resolve) => {
              finishRead = resolve;
            }),
        },
      ],
    },
  });
  startHomebrew(h.ctx, { type: "feature" });
  const draftId = h.ctx.view.id;
  h.input("name.en", "Keep this unsaved text");
  const commits = h.commits.length;
  finishRead(JSON.stringify(bundle));
  await pending;
  assert.equal(h.ctx.view.id, draftId);
  assert.equal(h.commits.length, commits);
  assert.equal(hasLibraryDraft(), true);
  h.ctx.render();
  assert.equal(h.node('[data-library-path="name.en"]').value, "Keep this unsaved text");
  assert.equal(
    h.ctx.state.libraryDrafts.some((draft) => draft.kind === "import"),
    false,
  );
  assert.deepEqual(h.errors, []);
});

test("a superseded or departed file read cannot navigate or report a stale error", async () => {
  const source = harness(),
    ref = savedContent(source),
    bundle = hb.exportHomebrewBundle(source.ctx.state, [ref], "player"),
    h = harness();
  let finishRead;
  h.ctx.render();
  const pending = h.node("[data-library-import]").events.change({
    target: {
      files: [
        {
          size: 512,
          text: () =>
            new Promise((resolve) => {
              finishRead = resolve;
            }),
        },
      ],
    },
  });
  await h.node("[data-library-import]").events.change({
    target: { files: [{ size: 512, text: async () => JSON.stringify(bundle) }] },
  });
  const importedId = h.ctx.view.id;
  finishRead("obsolete invalid JSON");
  await pending;
  assert.equal(h.ctx.view.id, importedId);
  assert.equal(h.ctx.state.libraryDrafts.length, 1);
  assert.deepEqual(h.errors, []);
  h.ctx.navigate("library");
  const departed = h.node("[data-library-import]").events.change({
    target: {
      files: [
        {
          size: 512,
          text: () =>
            new Promise((resolve) => {
              finishRead = resolve;
            }),
        },
      ],
    },
  });
  h.ctx.navigate("characters", { id: "livia", tab: "features" });
  finishRead(JSON.stringify(bundle));
  await departed;
  assert.equal(h.ctx.view.page, "characters");
  assert.equal(h.ctx.state.libraryDrafts.length, 1);
  assert.deepEqual(h.errors, []);
});

test("contextual imports preserve preview cancellation, reload, application and typed choice", async () => {
  for (const target of [
    {
      page: "builder",
      draftId: "builder-draft",
      section: "spells",
      targetKind: "spells",
      grantId: "class:wizard",
    },
    { page: "characters", actorId: "livia", tab: "inventory" },
  ]) {
    resetLibraryView();
    const source = harness(),
      type = target.page === "builder" ? "spell" : "item",
      ref = savedContent(source, `Imported ${type}`, {}, type),
      bundle = hb.exportHomebrewBundle(source.ctx.state, [ref], "player"),
      h = harness();
    Object.assign(h.ctx.state.actors.livia, { visibility: "private", campaignIds: [] });
    h.ctx.navigate("library", { returnTo: JSON.stringify(target) });
    await h.node("[data-library-import]").events.change({
      target: { files: [{ size: 512, text: async () => JSON.stringify(bundle) }] },
    });
    const draftId = h.ctx.view.id,
      draftRoute = structuredClone(h.ctx.view);
    assert.deepEqual(hb.getHomebrewDraft(h.ctx.state, draftId, "player").returnTo, target);
    assert.deepEqual(JSON.parse(h.ctx.view.returnTo), target);
    h.click("[data-library-cancel-choice]");
    assert.equal(h.ctx.view.page, target.page);
    assert.equal(h.ctx.view.tab, target.section || target.tab);
    resetLibraryView();
    h.ctx.view = draftRoute;
    h.ctx.render();
    h.click("[data-library-apply]");
    assert.deepEqual(JSON.parse(h.ctx.view.returnTo), target);
    assert.equal(h.node("[data-library-context-only]").checked, true);
    let selected;
    h.ctx.chooseLibraryContent = (value, returnTo) => {
      selected = { value, returnTo };
    };
    h.click(`[data-library-open="${ref.contentId}"]`);
    if (target.page === "builder") {
      h.click("[data-library-choose]");
      assert.deepEqual(selected, { value: ref, returnTo: target });
    } else {
      h.click("[data-library-assign-target]");
      assert.deepEqual(hb.getHomebrewDraft(h.ctx.state, h.ctx.view.id, "player").returnTo, target);
    }
    assert.deepEqual(h.errors, []);
  }
});

test("an owner can reduce existing access when the revision forbids new sharing", () => {
  const h = harness(),
    original = savedContent(h);
  hb.shareHomebrewRevision(h.ctx.state, original, { readers: ["dm"], editors: ["dm"] }, "player");
  const draft = hb.createHomebrewDraft(
    h.ctx.state,
    { id: "restricted-revision", kind: "revise", ref: original },
    "dm",
  );
  draft.data.source.rights.share = false;
  hb.saveHomebrewDraft(
    h.ctx.state,
    draft.id,
    { data: draft.data, expectedRevision: draft.revision },
    "dm",
  );
  const preview = hb.previewHomebrewDraft(h.ctx.state, draft.id, "dm");
  const ref = hb.applyHomebrewDraft(
    h.ctx.state,
    draft.id,
    { reviewKey: preview.reviewKey },
    "dm",
  ).ref;
  h.ctx.navigate("library", { id: ref.contentId, revision: ref.revisionId });
  h.click("[data-library-share]");
  assert.match(h.ctx.modal.body, /only reduce or remove existing access/);
  const downgrade = new FormData();
  downgrade.set("read-dm", "on");
  h.ctx.modal.options.onSubmit(downgrade);
  assert.deepEqual(hb.getHomebrewRevision(h.ctx.state, ref, "player").access, {
    readers: ["dm"],
    editors: [],
  });
  h.click("[data-library-share]");
  assert.match(h.ctx.modal.body, /name="edit-dm"[^>]*disabled/);
  h.ctx.modal.options.onSubmit(new FormData());
  assert.deepEqual(hb.getHomebrewRevision(h.ctx.state, ref, "player").access, {
    readers: [],
    editors: [],
  });
  h.click("[data-library-share]");
  assert.match(h.ctx.modal.body, /name="read-dm"[^>]*disabled/);
  assert.match(h.ctx.modal.body, /name="edit-dm"[^>]*disabled/);
  assert.deepEqual(h.errors, []);
});

test("the campaign collection opens the enabled revision rather than a later unenabled revision", () => {
  const h = harness(),
    first = savedContent(h, "Campaign approved revision");
  revision(h, first, { name: { en: "Later personal revision" } });
  hb.shareHomebrewRevision(h.ctx.state, first, { readers: ["dm"], editors: [] }, "player");
  hb.enableHomebrewRevision(h.ctx.state, first, { enabled: true }, "dm");
  h.ctx.navigate("library", { tab: "campaign" });
  assert.match(h.ctx.html, /Campaign approved revision/);
  assert.doesNotMatch(h.ctx.html, /Later personal revision/);
  h.click(`[data-library-open="${first.contentId}"]`);
  assert.equal(h.ctx.view.revision, first.revisionId);
});

test("contextual collections default to compatible content and allow browsing all without choosing a wrong type", () => {
  for (const [page, section, kind] of [
    ["builder", "features", "feature"],
    ["builder", "spells", "spell"],
    ["builder", "equipment", "item"],
    ["characters", "features", "feature"],
    ["characters", "spells", "spell"],
    ["characters", "inventory", "item"],
  ]) {
    resetLibraryView();
    const h = harness();
    const refs = Object.fromEntries(
      ["feature", "spell", "item"].map((type) => [
        type,
        savedContent(h, `Synthetic ${type}`, {}, type),
      ]),
    );
    const target =
      page === "builder"
        ? { page, draftId: "draft-target", section }
        : { page, actorId: "livia", tab: section };
    let choices = 0;
    h.ctx.chooseLibraryContent = () => {
      choices++;
    };
    h.ctx.navigate("library", { returnTo: JSON.stringify(target) });
    assert.deepEqual(
      h.ctx.root.querySelectorAll("[data-library-open]").map((node) => node.dataset.libraryOpen),
      [refs[kind].contentId],
    );
    const filter = h.node("[data-library-context-only]");
    assert.equal(filter.checked, true);
    filter.checked = false;
    filter.events.change({ target: filter });
    assert.equal(h.ctx.root.querySelectorAll("[data-library-open]").length, 3);
    const wrong = refs[kind === "feature" ? "spell" : "feature"];
    h.click(`[data-library-open="${wrong.contentId}"]`);
    assert.match(h.ctx.html, /cannot be used in this section/);
    assert.equal(h.ctx.root.querySelector("[data-library-choose]"), null);
    assert.equal(h.ctx.root.querySelector("[data-library-assign-target]"), null);
    assert.equal(choices, 0);
    assert.equal(h.ctx.state.libraryDrafts.filter((draft) => draft.status === "active").length, 0);
    h.click("[data-library-cancel-choice]");
    assert.equal(h.ctx.view.page, page);
    assert.equal(h.ctx.view.tab, section);
  }
});

test("a previously bound compatible choice rechecks the current destination before invoking its consumer", () => {
  const h = harness(),
    ref = savedContent(h);
  let choices = 0;
  h.ctx.chooseLibraryContent = () => {
    choices++;
  };
  h.ctx.navigate("library", {
    id: ref.contentId,
    revision: ref.revisionId,
    returnTo: JSON.stringify({ page: "builder", draftId: "draft-target", section: "features" }),
  });
  const choice = h.node("[data-library-choose]");
  h.ctx.view.returnTo = JSON.stringify({
    page: "builder",
    draftId: "draft-target",
    section: "spells",
  });
  choice.events.click();
  assert.equal(choices, 0);
  assert.match(h.errors.at(-1), /cannot be used in this section/);
});

test("general assignment retains the proper sheet tab when returning without applying", () => {
  for (const [type, tab] of [
    ["feature", "features"],
    ["spell", "spells"],
    ["item", "inventory"],
  ]) {
    resetLibraryView();
    const h = harness(),
      ref = savedContent(h, `Synthetic ${type}`, {}, type);
    Object.assign(h.ctx.state.actors.livia, { visibility: "private", campaignIds: [] });
    h.ctx.navigate("library", { id: ref.contentId, revision: ref.revisionId });
    h.node("[data-library-actor]").value = "livia";
    h.click("[data-library-assign]");
    assert.equal(hb.getHomebrewDraft(h.ctx.state, h.ctx.view.id, "player").returnTo.tab, tab);
    h.click("[data-library-back]");
    h.click("[data-library-cancel-choice]");
    assert.deepEqual(h.ctx.view, { page: "characters", id: "livia", tab });
  }
});
