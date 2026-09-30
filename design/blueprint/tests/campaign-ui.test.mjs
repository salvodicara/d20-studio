import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import { esc } from "../ui.mjs";
import * as content from "../campaign-content.mjs";
import * as appointments from "../campaign-sessions.mjs";
import {
  renderCampaign,
  bindCampaign,
  startCampaignEntry,
  hasCampaignDraft,
  resetCampaignView,
  confirmCampaignNavigation,
  getCampaignSection,
} from "../campaign.mjs";

afterEach(() => resetCampaignView());
// The example always has «Il sigillo della torre» on the coming Thursday (sample-clock.mjs); the
// scheduling checks below read the appointments they create.
const created = (h, viewer) =>
  appointments
    .listCampaignSessions(h.ctx.state, h.ctx.state.campaign.id, viewer)
    .filter((row) => row.id !== "session-sample-13");
const decode = (value) =>
  String(value ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
function harness() {
  const errors = [],
    commits = [];
  const ctx = {
    state: createInitialState(),
    role: "player",
    lang: "en",
    offline: false,
    view: { page: "notes" },
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
    commit(label, mutate, options) {
      if (this.failCommit) throw new Error("Synthetic save failure. Retry.");
      if (this.offline && !options?.local) throw new Error("Offline shared write unavailable.");
      const next = structuredClone(this.state);
      mutate(next);
      this.state = next;
      commits.push({ label, options });
      this.render();
      return { applied: true, persisted: true };
    },
    dialog(title, body, options) {
      this.modal = { title, body, options };
    },
    closeDialog() {},
    render() {
      this.html = renderCampaign(this);
      const nodes = [
        ...this.html.matchAll(/<(input|button|select|textarea)\b([^>]*)(?:>([\s\S]*?)<\/\1>|>)/g),
        ...this.html.matchAll(/<(form|details)\b([^>]*)>/g),
      ].map(([, tag, source, inner]) => {
        const attrs = Object.fromEntries(
          [...source.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v)]),
        );
        const events = {};
        return {
          attrs,
          events,
          tagName: tag.toUpperCase(),
          type: attrs.type || "",
          dataset: Object.fromEntries(
            Object.entries(attrs)
              .filter(([k]) => k.startsWith("data-"))
              .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
          ),
          open: "open" in attrs,
          disabled: "disabled" in attrs,
          checked: "checked" in attrs,
          value:
            tag === "select"
              ? decode(inner?.match(/<option value="([^"]*)" selected/)?.[1])
              : tag === "textarea"
                ? decode(inner)
                : attrs.value || "",
          addEventListener(type, fn) {
            events[type] = fn;
          },
          focus() {},
          scrollIntoView() {},
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
      bindCampaign(this.root, this);
    },
  };
  const node = (selector) => {
    const n = ctx.root.querySelector(selector);
    assert.ok(n, `Missing ${selector}`);
    return n;
  };
  return {
    ctx,
    errors,
    commits,
    node,
    change(selector, value) {
      const n = node(selector);
      if (n.type === "checkbox") n.checked = value;
      else n.value = value;
      return n.events.change({ target: n });
    },
    click(selector) {
      const n = node(selector);
      assert.equal(n.disabled, false);
      return (n.onclick || n.events.click)?.({ preventDefault() {}, target: n });
    },
    input(path, value) {
      const n = node(`[data-campaign-path="${path}"]`);
      if (n.type === "checkbox") n.checked = value;
      else n.value = value;
      return n.events[n.tagName === "SELECT" || n.type === "checkbox" ? "change" : "input"]({
        target: n,
      });
    },
  };
}

test("a personal note is a private recoverable draft before explicit publication", () => {
  const h = harness();
  h.ctx.render();
  startCampaignEntry(h.ctx, { kind: "note", returnTo: { page: "table" } });
  const draftId = h.ctx.view.id;
  h.input("data.title", "Private <b>clue</b>");
  h.input("data.body", "A synthetic private suspicion.");
  assert.equal(hasCampaignDraft(), true);
  assert.equal(content.listCampaignEntries(h.ctx.state, { kind: "note" }, "player").length, 0);
  h.click("[data-campaign-save]");
  assert.equal(hasCampaignDraft(), false);
  resetCampaignView();
  h.ctx.render();
  assert.match(h.ctx.html, /Private &lt;b&gt;clue&lt;\/b&gt;/);
  assert.equal(content.getCampaignDraft(h.ctx.state, draftId, "player").status, "active");
  h.click("[data-campaign-apply]");
  assert.equal(content.listCampaignEntries(h.ctx.state, { kind: "note" }, "player").length, 1);
  assert.equal(content.listCampaignEntries(h.ctx.state, { kind: "note" }, "dm").length, 0);
  assert.ok(
    h.commits.every(
      ({ options }) =>
        options.undoable === false && options.local && options.visibility === "private",
    ),
  );
  assert.deepEqual(h.errors, []);
});

test("a failed save preserves dirty input through fresh controls and permits retry", () => {
  const h = harness();
  h.ctx.render();
  startCampaignEntry(h.ctx, { kind: "note" });
  h.input("data.body", "Keep this text after the error");
  h.ctx.failCommit = true;
  h.click("[data-campaign-save]");
  assert.equal(hasCampaignDraft(), true);
  assert.equal(h.node('[data-campaign-path="data.body"]').value, "Keep this text after the error");
  h.ctx.failCommit = false;
  h.click("[data-campaign-save]");
  assert.equal(hasCampaignDraft(), false);
  assert.equal(
    content.getCampaignDraft(h.ctx.state, h.ctx.view.id, "player").data.body,
    "Keep this text after the error",
  );
});

test("dirty navigation can save the draft without publishing and returning preserves Table context", () => {
  const h = harness();
  h.ctx.render();
  startCampaignEntry(h.ctx, { kind: "note", returnTo: { page: "table" } });
  h.input("data.body", "Private working text");
  let continued = false;
  confirmCampaignNavigation(h.ctx, () => {
    continued = true;
  });
  assert.equal(continued, false);
  h.ctx.modal.options.onSubmit();
  assert.equal(continued, true);
  assert.equal(content.listCampaignEntries(h.ctx.state, { kind: "note" }, "player").length, 0);
  h.click("[data-campaign-return]");
  assert.equal(h.ctx.view.page, "table");
});

test("a scheduled appointment needs preview and its own explicit confirmation", () => {
  const h = harness();
  h.ctx.role = "dm";
  h.ctx.navigate("campaign", { tab: "sessions" });
  h.click('[data-campaign-new-session="direct"]');
  h.input("data.title", "Synthetic Friday game");
  h.input("data.localTime", "2026-10-09T21:00");
  h.input("data.timeZone", "Europe/Rome");
  const actorBefore = structuredClone(h.ctx.state.actors);
  h.click("[data-campaign-save]");
  assert.equal(created(h, "player").length, 0);
  h.click("[data-campaign-apply]");
  const rows = created(h, "player");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].startsAt, "2026-10-09T19:00:00.000Z");
  assert.deepEqual(h.ctx.state.actors, actorBefore);
  assert.ok(h.commits.every(({ options }) => options.undoable === false));
  assert.deepEqual(h.errors, []);
});

function seedEntry(
  h,
  {
    id = "seed-entry",
    kind = "note",
    body = "Initial public body",
    access = { mode: "campaign", grants: [] },
    sections = [],
  } = {},
) {
  const d = content.createCampaignDraft(
    h.ctx.state,
    { id, kind, campaignId: h.ctx.state.campaign.id },
    "player",
  );
  content.saveCampaignDraft(
    h.ctx.state,
    id,
    { data: { ...d.data, body, sections }, access, expectedDraftRevision: d.revision },
    "player",
  );
  return content.applyCampaignDraft(
    h.ctx.state,
    id,
    { reviewKey: content.previewCampaignDraft(h.ctx.state, id, "player").reviewKey },
    "player",
  ).entryId;
}

test("standalone notes can stay campaign-free and explicitly gain a campaign context later", () => {
  const h = harness();
  h.ctx.render();
  startCampaignEntry(h.ctx, { kind: "note", campaignId: null });
  h.input("data.body", "Personal text without a required title");
  h.click("[data-campaign-save]");
  assert.equal(content.getCampaignDraft(h.ctx.state, h.ctx.view.id, "player").campaignId, null);
  assert.doesNotMatch(h.ctx.html, /<option value="campaign"/);
  h.change("[data-campaign-context]", h.ctx.state.campaign.id);
  assert.equal(
    h.node('[data-campaign-path="data.body"]').value,
    "Personal text without a required title",
  );
  h.change('[data-campaign-access-mode="access"]', "campaign");
  h.click("[data-campaign-save]");
  h.click("[data-campaign-apply]");
  assert.equal(
    content.getCampaignEntry(h.ctx.state, h.ctx.view.id, "dm").data.body,
    "Personal text without a required title",
  );
  assert.deepEqual(h.errors, []);
});

test("Notes preserves a Library choice return context through draft reload and return", () => {
  const h = harness();
  const target = {
    page: "library",
    id: "content1",
    revision: "revision1",
    returnTo: JSON.stringify({
      page: "builder",
      draftId: "build1",
      section: "spells",
      targetKind: "spells",
    }),
  };
  h.ctx.view = { page: "notes", returnTo: JSON.stringify(target) };
  h.ctx.render();
  h.click('[data-campaign-new="note"]');
  h.input("data.body", "Remember this spell.");
  h.click("[data-campaign-save]");
  resetCampaignView();
  h.ctx.render();
  h.click("[data-campaign-return]");
  assert.deepEqual(h.ctx.view, target);
});

test("recipient preview omits private sections and links without changing the actual identity", () => {
  const h = harness();
  h.ctx.render();
  const privateId = seedEntry(h, {
    id: "private-link",
    body: "Private destination",
    access: { mode: "private", grants: [] },
  });
  startCampaignEntry(h.ctx, { kind: "world" });
  h.input("data.body", "Visible world text");
  h.change('[data-campaign-access-mode="access"]', "campaign");
  h.click("[data-campaign-add-section]");
  h.input("data.sections.0.title", "Secret section title");
  h.input("data.sections.0.body", "Secret section body");
  h.node("[data-campaign-link-choice]").value = privateId;
  h.click("[data-campaign-add-link]");
  h.click("[data-campaign-save]");
  h.change("[data-campaign-preview-person]", "dm");
  const preview = h.ctx.html
    .split("data-campaign-recipient-preview>")[1]
    .split("</div><!-- recipient-preview -->")[0];
  assert.match(preview, /Visible world text/);
  assert.doesNotMatch(preview, /Secret section|Private destination/);
  assert.equal(h.ctx.role, "player");
  assert.equal(getCampaignSection(h.ctx), "world");
  assert.equal(hasCampaignDraft(), false);
});

test("delegated editors change visible text without gaining access or deleting hidden sections", () => {
  const h = harness();
  const id = seedEntry(h, {
    access: { mode: "selected", grants: [{ id: "dm", read: true, edit: true, invite: false }] },
    sections: [
      {
        id: "secret1",
        title: "Private section",
        body: "Owner only",
        access: { mode: "private", grants: [] },
      },
    ],
  });
  resetCampaignView();
  h.ctx.role = "dm";
  h.ctx.navigate("notes", { tab: "entry", id });
  assert.doesNotMatch(h.ctx.html, /Owner only|data-campaign-access|data-campaign-invite/);
  h.click("[data-campaign-edit]");
  assert.doesNotMatch(h.ctx.html, /Owner only|data-campaign-add-section|data-campaign-access-mode/);
  h.input("data.body", "Contributor change");
  h.click("[data-campaign-save]");
  h.click("[data-campaign-apply]");
  const entry = content.getCampaignEntry(h.ctx.state, id, "player");
  assert.equal(entry.data.body, "Contributor change");
  assert.equal(entry.data.sections[0].body, "Owner only");
  assert.equal(entry.history.at(-1).authorId, "dm");
  assert.deepEqual(h.errors, []);
});

test("content conflict keeps fresh input until explicit comparison and restore creates a new revision", () => {
  const h = harness();
  const id = seedEntry(h);
  h.ctx.navigate("notes", { tab: "entry", id });
  const first = content.getCampaignEntry(h.ctx.state, id, "player").revisionId;
  h.click("[data-campaign-edit]");
  h.input("data.body", "My local continuation");
  const other = content.createCampaignDraft(
    h.ctx.state,
    { id: "concurrent", kind: "note", entryId: id },
    "player",
  );
  content.saveCampaignDraft(
    h.ctx.state,
    other.id,
    { data: { ...other.data, body: "Other saved revision" } },
    "player",
  );
  content.applyCampaignDraft(
    h.ctx.state,
    other.id,
    { reviewKey: content.previewCampaignDraft(h.ctx.state, other.id, "player").reviewKey },
    "player",
  );
  h.click("[data-campaign-save]");
  assert.equal(h.node('[data-campaign-path="data.body"]').value, "My local continuation");
  assert.equal(h.node("[data-campaign-apply]").disabled, true);
  h.click("[data-campaign-rebase]");
  h.click("[data-campaign-apply]");
  assert.equal(
    content.getCampaignEntry(h.ctx.state, id, "player").data.body,
    "My local continuation",
  );
  // P9 CA-82: «Cronologia» in the header lists every version with its changes.
  h.click(`[data-campaign-timeline="${id}"]`);
  assert.match(h.ctx.modal.title, /^History/);
  assert.match(h.ctx.modal.body, new RegExp(`data-campaign-history="${first}"`));
  assert.match(h.ctx.modal.body, /diff-del[^>]*>− Initial public body/);
  assert.match(h.ctx.modal.body, /data-campaign-restore-now/);
  h.ctx.navigate("notes", { tab: "entry", id, revision: first });
  h.click("[data-campaign-restore]");
  const actors = structuredClone(h.ctx.state.actors);
  h.ctx.modal.options.onSubmit(new Map());
  const restored = content.getCampaignEntry(h.ctx.state, id, "player");
  assert.equal(restored.data.body, "Initial public body");
  assert.equal(restored.history.length, 4);
  assert.equal(restored.history.at(-1).restoredFrom, first, "«Ripristinata da…» marker");
  h.click(`[data-campaign-timeline="${id}"]`);
  assert.match(h.ctx.modal.body, /Restored from/);
  assert.deepEqual(h.ctx.state.actors, actors);
  assert.deepEqual(h.errors, []);
});

test("poll own response, withdrawal and organizer confirmation use real fresh controls", () => {
  const h = harness();
  h.ctx.role = "dm";
  h.ctx.navigate("campaign", { tab: "sessions" });
  h.click('[data-campaign-new-session="poll"]');
  h.input("data.title", "Choose a game night");
  h.click("[data-campaign-add-slot]");
  h.input("data.slots.0.localTime", "2026-10-09T21:00");
  h.input("data.slots.0.timeZone", "Europe/Rome");
  h.click("[data-campaign-save]");
  h.click("[data-campaign-apply]");
  const poll = appointments.listSessionPolls(h.ctx.state, h.ctx.state.campaign.id, "player")[0];
  resetCampaignView();
  h.ctx.role = "player";
  h.ctx.render();
  assert.doesNotMatch(h.ctx.html, /data-campaign-confirm-slot/);
  assert.equal(h.node(`[data-campaign-response="${poll.id}"]`).value, "");
  h.change(`[data-campaign-response="${poll.id}"]`, "yes");
  assert.equal(h.node(`[data-campaign-response="${poll.id}"]`).value, "yes");
  h.click(`[data-campaign-withdraw="${poll.id}"]`);
  assert.equal(h.node(`[data-campaign-response="${poll.id}"]`).value, "");
  assert.equal(created(h, "player").length, 0);
  resetCampaignView();
  h.ctx.role = "dm";
  h.ctx.render();
  h.click(`[data-campaign-confirm-slot="${poll.id}"]`);
  h.click("[data-campaign-apply]");
  assert.equal(created(h, "player").length, 1);
  assert.match(h.ctx.html, /Responses remain in history/);
  assert.deepEqual(h.errors, []);
});

test("a repeated wall-clock time stays blocked until the user selects the actual instant", () => {
  const h = harness();
  h.ctx.role = "dm";
  h.ctx.navigate("campaign", { tab: "sessions" });
  h.click('[data-campaign-new-session="direct"]');
  h.input("data.localTime", "2026-10-25T02:30");
  h.input("data.timeZone", "Europe/Rome");
  h.click("[data-campaign-save]");
  assert.equal(h.node("[data-campaign-apply]").disabled, true);
  assert.equal(h.node('[data-campaign-path="data.localTime"]').value, "2026-10-25T02:30");
  h.input("data.selectedInstant", "2026-10-25T01:30:00.000Z");
  h.click("[data-campaign-save]");
  h.click("[data-campaign-apply]");
  assert.equal(created(h, "player")[0].startsAt, "2026-10-25T01:30:00.000Z");
  assert.deepEqual(h.errors, []);
});

test("access management grants edit separately and shared writes fail without losing saved text", () => {
  const h = harness();
  const id = seedEntry(h, { access: { mode: "private", grants: [] } });
  h.ctx.navigate("notes", { tab: "entry", id });
  h.click("[data-campaign-access]");
  const form = new Map([
    ["mode", "selected"],
    ["grant-dm", "edit"],
  ]);
  h.ctx.offline = true;
  assert.equal(h.ctx.modal.options.onSubmit(form), false);
  assert.throws(() => content.getCampaignEntry(h.ctx.state, id, "dm"));
  h.ctx.offline = false;
  h.ctx.modal.options.onSubmit(form);
  const shared = content.getCampaignEntry(h.ctx.state, id, "dm");
  assert.equal(shared.permissions.canEdit, true);
  assert.equal(shared.permissions.canInvite, false);
  assert.equal(shared.permissions.canManageAccess, false);
  assert.equal(shared.data.body, "Initial public body");
  h.click("[data-campaign-access]");
  h.ctx.modal.options.onSubmit(new Map([["mode", "private"]]));
  assert.throws(() => content.getCampaignEntry(h.ctx.state, id, "dm"));
  assert.ok(h.commits.every(({ options }) => options.undoable === false));
});

test("revoked editing keeps the working draft text but blocks application", () => {
  const h = harness();
  const id = seedEntry(h, {
    access: { mode: "selected", grants: [{ id: "dm", read: true, edit: true, invite: false }] },
  });
  h.ctx.role = "dm";
  h.ctx.navigate("notes", { tab: "entry", id });
  h.click("[data-campaign-edit]");
  const draftId = h.ctx.view.id;
  h.input("data.body", "Keep the contributor's local paragraph");
  const entry = content.getCampaignEntry(h.ctx.state, id, "player");
  content.setCampaignEntryAccess(
    h.ctx.state,
    id,
    { access: { mode: "private", grants: [] }, expectedAccessRevision: entry.accessRevision },
    "player",
  );
  h.ctx.render();
  assert.equal(
    h.node('[data-campaign-path="data.body"]').value,
    "Keep the contributor's local paragraph",
  );
  h.click("[data-campaign-save]");
  assert.equal(
    content.getCampaignDraft(h.ctx.state, draftId, "dm").data.body,
    "Keep the contributor's local paragraph",
  );
  assert.equal(h.node("[data-campaign-apply]").disabled, true);
  assert.equal(
    content.getCampaignEntry(h.ctx.state, id, "player").data.body,
    "Initial public body",
  );
});

test("changing and cancelling an appointment preserve gameplay and cancellation history", () => {
  const h = harness();
  h.ctx.role = "dm";
  h.ctx.navigate("campaign", { tab: "sessions" });
  h.click('[data-campaign-new-session="direct"]');
  h.input("data.localTime", "2026-10-09T21:00");
  h.input("data.timeZone", "Europe/Rome");
  h.click("[data-campaign-save]");
  h.click("[data-campaign-apply]");
  const id = created(h, "dm")[0].id;
  const actors = structuredClone(h.ctx.state.actors);
  h.click(`[data-campaign-change-session="${id}"]`);
  h.input("data.localTime", "2026-10-10T20:00");
  h.click("[data-campaign-save]");
  const concurrent = appointments.createSessionDraft(
    h.ctx.state,
    { id: "other-change", kind: "change", sessionId: id },
    "dm",
  );
  appointments.saveSessionDraft(
    h.ctx.state,
    concurrent.id,
    { data: { ...concurrent.data, title: "Another organizer change" } },
    "dm",
  );
  appointments.applySessionDraft(
    h.ctx.state,
    concurrent.id,
    { reviewKey: appointments.previewSessionDraft(h.ctx.state, concurrent.id, "dm").reviewKey },
    "dm",
  );
  h.ctx.render();
  assert.equal(h.node("[data-campaign-apply]").disabled, true);
  h.click("[data-campaign-rebase]");
  assert.equal(h.node('[data-campaign-path="data.localTime"]').value, "2026-10-10T20:00");
  h.click("[data-campaign-apply]");
  assert.equal(created(h, "dm")[0].startsAt, "2026-10-10T18:00:00.000Z");
  h.click(`[data-campaign-cancel-session="${id}"]`);
  h.input("data.reason", "Synthetic cancellation");
  h.click("[data-campaign-save]");
  h.click("[data-campaign-apply]");
  const row = created(h, "player")[0];
  assert.equal(row.status, "cancelled");
  assert.equal(row.history.length, 4);
  assert.deepEqual(h.ctx.state.actors, actors);
  assert.deepEqual(h.errors, []);
});

test("an unavailable or completed draft does not bind commands to stale working data", () => {
  const h = harness();
  h.ctx.render();
  startCampaignEntry(h.ctx, { kind: "note" });
  h.input("data.body", "Draft retained");
  h.click("[data-campaign-save]");
  const id = h.ctx.view.id;
  content.discardCampaignDraft(h.ctx.state, id, "player");
  h.ctx.render();
  assert.match(h.ctx.html, /Content unavailable/);
  assert.equal(h.ctx.root.querySelector("[data-campaign-save]"), null);
  assert.equal(hasCampaignDraft(), false);
  resetCampaignView();
  h.ctx.role = "dm";
  h.ctx.render();
  assert.doesNotMatch(h.ctx.html, /Draft retained/);
});

test("expanded editor groups stay open after add, audience, remove and private save renders", () => {
  const h = harness();
  h.ctx.render();
  startCampaignEntry(h.ctx, { kind: "world" });
  h.node('[data-campaign-details="sections"]').open = true;
  h.click("[data-campaign-add-section]");
  assert.equal(h.node('[data-campaign-details="sections"]').open, true);
  h.input("data.sections.0.title", "New section");
  h.input("data.body", "World body");
  h.change('[data-campaign-access-mode="data.sections.0.access"]', "campaign");
  assert.equal(h.node('[data-campaign-details="sections"]').open, true);
  assert.equal(h.node('[data-campaign-path="data.sections.0.title"]').value, "New section");
  h.click("[data-campaign-save]");
  assert.equal(h.node('[data-campaign-details="sections"]').open, true);
  h.click('[data-campaign-remove-section="0"]');
  assert.equal(h.node('[data-campaign-details="sections"]').open, true);
  h.node('[data-campaign-details="links"]').open = true;
  h.click("[data-campaign-add-section]");
  assert.equal(h.node('[data-campaign-details="links"]').open, true);
});

test("a readable recap link returns to the recap after reload with a single bounded origin", () => {
  const h = harness();
  const worldId = seedEntry(h, { id: "linked-world", kind: "world", body: "A synthetic place" });
  const recapId = seedEntry(h, {
    id: "linked-recap",
    kind: "recap",
    body: "We arrived at the place",
  });
  h.ctx.navigate("campaign", { tab: "entry", id: recapId });
  h.click("[data-campaign-edit]");
  h.node("[data-campaign-link-choice]").value = worldId;
  h.click("[data-campaign-add-link]");
  h.click("[data-campaign-save]");
  h.click("[data-campaign-apply]");
  const link = h.ctx.root
    .querySelectorAll("[data-campaign-route]")
    .find((node) => JSON.parse(node.dataset.campaignRoute).id === worldId);
  assert.ok(link);
  link.onclick();
  assert.equal(h.ctx.view.id, worldId);
  resetCampaignView();
  h.ctx.render();
  h.click("[data-campaign-return]");
  assert.deepEqual(h.ctx.view, { page: "campaign", id: recapId, tab: "entry" });
});

test("session and poll times label the viewer timezone and preserve the original date across midnight", () => {
  const originalTimezone = process.env.TZ;
  process.env.TZ = "UTC";
  try {
    const h = harness();
    h.ctx.role = "dm";
    h.ctx.navigate("campaign", { tab: "sessions" });
    h.click('[data-campaign-new-session="direct"]');
    h.input("data.localTime", "2026-11-13T00:30");
    h.input("data.timeZone", "Europe/Rome");
    h.click("[data-campaign-save]");
    h.click("[data-campaign-apply]");
    assert.match(h.ctx.html, /12 Nov 2026, 23:30<\/time> · Your timezone \(UTC\)/);
    assert.match(h.ctx.html, /Agreed time: 13 Nov 2026, 00:30 · Europe\/Rome/);
    h.click('[data-campaign-new-session="poll"]');
    h.click("[data-campaign-add-slot]");
    h.input("data.slots.0.localTime", "2026-11-14T00:30");
    h.input("data.slots.0.timeZone", "Europe/Rome");
    h.click("[data-campaign-save]");
    h.click("[data-campaign-apply]");
    assert.match(h.ctx.html, /13 Nov 2026, 23:30<\/time> · Your timezone \(UTC\)/);
    // P9 CA-43: a date offered in a poll is a proposal, not an agreed time.
    assert.match(h.ctx.html, /Proposal: 14 Nov 2026, 00:30 · Europe\/Rome/);
    assert.deepEqual(h.errors, []);
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});

test("former members cannot browse campaign or party while keeping personal notes and private drafts", () => {
  const h = harness();
  h.ctx.render();
  startCampaignEntry(h.ctx, { kind: "note", campaignId: null });
  h.input("data.body", "My personal note remains readable");
  h.click("[data-campaign-save]");
  h.click("[data-campaign-apply]");
  const noteId = h.ctx.view.id;
  startCampaignEntry(h.ctx, { kind: "recap" });
  h.input("data.body", "My private recap draft remains recoverable");
  h.click("[data-campaign-save]");
  const draftId = h.ctx.view.id;
  h.ctx.state.campaign.members.find((member) => member.id === "player").active = false;
  h.ctx.state.scenes[0].revealed = true;
  h.ctx.state.scenes[0].publicDescription = "Former member scene marker";
  for (const tab of ["overview", "group", "sessions", "world", "journal", "settings"]) {
    h.ctx.navigate("campaign", { tab });
    assert.match(h.ctx.html, /Content unavailable/);
    assert.doesNotMatch(h.ctx.html, /Livia|Former member scene marker|data-public-scene/);
  }
  h.ctx.navigate("notes", { tab: "entry", id: noteId });
  assert.match(h.ctx.html, /My personal note remains readable/);
  h.ctx.navigate("campaign", { tab: "edit", id: draftId });
  assert.equal(
    h.node('[data-campaign-path="data.body"]').value,
    "My private recap draft remains recoverable",
  );
  assert.doesNotMatch(h.ctx.html, /Livia|Former member scene marker/);
  assert.equal(h.node("[data-campaign-apply]").disabled, true);
});

test("section permissions expose only readership and explain inherited editing", () => {
  const h = harness();
  h.ctx.render();
  startCampaignEntry(h.ctx, { kind: "world" });
  h.input("data.body", "World body");
  h.click("[data-campaign-add-section]");
  h.input("data.sections.0.body", "Section body");
  h.change('[data-campaign-access-mode="data.sections.0.access"]', "selected");
  const sectionHtml = h.ctx.html
    .split('<details data-campaign-details="sections"')[1]
    .split("</details>")[0];
  assert.doesNotMatch(sectionHtml, /<option value="edit"|data-campaign-grant-invite/);
  assert.match(sectionHtml, /Editors of the entry may edit every section they can read/);
  h.change('[data-access-path="data.sections.0.access"]', "read");
  h.click("[data-campaign-save]");
  assert.deepEqual(
    content.getCampaignDraft(h.ctx.state, h.ctx.view.id, "player").data.sections[0].access.grants,
    [{ id: "dm", read: true, edit: false, invite: false }],
  );
});
