// R8 CA-10: «Modifica» on an entry that already has a private draft of the same person
// offers «Riprendi la bozza» (the draft where it was) or «Nuova bozza» (the old one stays
// under «Bozze private»), as D&D Beyond's editing lock and Google Docs / Notion draft resume
// do. The two-tab conflict path is unchanged: a resumed stale draft still goes to compare.
// Real campaign-content domain and campaign UI with a string DOM; synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import { esc } from "../ui.mjs";
import * as content from "../campaign-content.mjs";
import {
  renderCampaign,
  bindCampaign,
  resetCampaignView,
  pendingEntryDraft,
} from "../campaign.mjs";

afterEach(() => {
  resetCampaignView();
  delete globalThis.document;
});
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

function worldEntry(h) {
  return content.createCampaignEntryNow(
    h.ctx.state,
    {
      id: "entry-orvel",
      kind: "world",
      worldType: "person",
      title: "Mastro Orvel",
      body: "Fabbro del porto.",
      access: { mode: "campaign", grants: [] },
    },
    "dm",
  ).entryId;
}
// The dialog's «Nuova bozza» button, as the real dialog would bind it.
function dialogButtons() {
  const buttons = {};
  globalThis.document = {
    querySelector(selector) {
      const name = selector.match(/^\[([^\]]+)\]$/)?.[1];
      if (!name) return null;
      buttons[name] ??= {
        handlers: {},
        addEventListener(type, fn) {
          this.handlers[type] = fn;
        },
      };
      return buttons[name];
    },
  };
  return buttons;
}

test("Modifica with a pending draft offers Riprendi la bozza or Nuova bozza (CA-10)", () => {
  const h = harness();
  h.ctx.role = "dm";
  const id = worldEntry(h);
  h.ctx.navigate("campaign", { tab: "entry", id });
  // First «Modifica»: no draft yet, the editor opens on a new private draft.
  h.click("[data-campaign-edit]");
  assert.equal(h.ctx.view.tab, "edit");
  const first = h.ctx.view.id;
  h.input("data.body", "Fabbro del porto, debitore della gilda.");
  h.click("[data-campaign-save]");
  assert.equal(pendingEntryDraft(h.ctx.state, id, "dm").id, first);
  // Leave without applying; later «Modifica» asks instead of starting a second draft.
  resetCampaignView();
  h.ctx.navigate("campaign", { tab: "entry", id });
  const buttons = dialogButtons();
  h.click("[data-campaign-edit]");
  assert.equal(h.ctx.modal.title, "You already have a draft of this entry");
  assert.equal(h.ctx.modal.options.submitLabel, "Resume the draft");
  assert.match(h.ctx.modal.body, /data-campaign-new-draft[^>]*>New draft/);
  assert.match(h.ctx.modal.body, /the old one stays in “Private drafts”/);
  assert.equal(
    content.listCampaignDrafts(h.ctx.state, "dm").length,
    1,
    "no draft created by asking",
  );
  // «Riprendi la bozza» opens the same draft with its text.
  h.ctx.modal.options.onSubmit(new Map());
  assert.deepEqual([h.ctx.view.tab, h.ctx.view.id], ["edit", first]);
  assert.equal(
    h.node('[data-campaign-path="data.body"]').value,
    "Fabbro del porto, debitore della gilda.",
  );
  // «Nuova bozza» starts from the current text; the old draft stays listed.
  resetCampaignView();
  h.ctx.navigate("campaign", { tab: "entry", id });
  h.ctx.modal = null;
  h.click("[data-campaign-edit]");
  buttons["data-campaign-new-draft"].handlers.click();
  assert.equal(h.ctx.view.tab, "edit");
  assert.notEqual(h.ctx.view.id, first);
  assert.equal(h.node('[data-campaign-path="data.body"]').value, "Fabbro del porto.");
  const drafts = content.listCampaignDrafts(h.ctx.state, "dm").map((d) => d.id);
  assert.ok(drafts.includes(first) && drafts.includes(h.ctx.view.id));
  resetCampaignView();
  h.ctx.navigate("campaign", { tab: "world" });
  assert.match(h.ctx.html, new RegExp(`data-campaign-resume="${first}"`));
  assert.deepEqual(h.errors, []);
});

test("a resumed draft of a changed entry still goes to compare and resume (two-tab path)", () => {
  const h = harness();
  h.ctx.role = "dm";
  h.ctx.lang = "en";
  const id = worldEntry(h);
  h.ctx.navigate("campaign", { tab: "entry", id });
  h.click("[data-campaign-edit]");
  const mine = h.ctx.view.id;
  h.input("data.body", "VERSIONE A");
  h.click("[data-campaign-save]");
  // Another tab of the same person saves the entry meanwhile.
  const other = content.createCampaignDraft(
    h.ctx.state,
    { id: "tab-b", kind: "world", entryId: id },
    "dm",
  );
  content.saveCampaignDraft(
    h.ctx.state,
    other.id,
    { data: { ...other.data, body: "VERSIONE B" } },
    "dm",
  );
  content.applyCampaignDraft(
    h.ctx.state,
    other.id,
    { reviewKey: content.previewCampaignDraft(h.ctx.state, other.id, "dm").reviewKey },
    "dm",
  );
  resetCampaignView();
  h.ctx.navigate("campaign", { tab: "entry", id });
  dialogButtons();
  h.click("[data-campaign-edit]");
  assert.match(h.ctx.modal.body, /The entry changed after the draft/);
  h.ctx.modal.options.onSubmit(new Map());
  assert.equal(h.ctx.view.id, mine);
  // The existing conflict path: apply is blocked until the texts are compared.
  assert.equal(h.node("[data-campaign-apply]").disabled, true);
  h.click("[data-campaign-rebase]");
  h.click("[data-campaign-apply]");
  const entry = content.getCampaignEntry(h.ctx.state, id, "dm");
  assert.equal(entry.data.body, "VERSIONE A");
  assert.equal(entry.history.length, 3, "original, B and A are all kept");
});

test("another identity's draft is never offered: drafts stay with their owner", () => {
  const h = harness();
  h.ctx.role = "dm";
  const id = worldEntry(h);
  const entry = content.getCampaignEntry(h.ctx.state, id, "dm");
  content.setCampaignEntryAccess(
    h.ctx.state,
    id,
    {
      access: {
        mode: "campaign",
        grants: [{ id: "player", read: true, edit: true, invite: false }],
      },
      expectedAccessRevision: entry.accessRevision,
    },
    "dm",
  );
  content.createCampaignDraft(
    h.ctx.state,
    { id: "player-draft", kind: "world", entryId: id },
    "player",
  );
  assert.equal(pendingEntryDraft(h.ctx.state, id, "player").id, "player-draft");
  assert.equal(pendingEntryDraft(h.ctx.state, id, "dm"), null);
  h.ctx.navigate("campaign", { tab: "entry", id });
  h.click("[data-campaign-edit]");
  assert.equal(h.ctx.modal, undefined, "the DM is not asked about the player's draft");
  assert.equal(h.ctx.view.tab, "edit");
  assert.notEqual(h.ctx.view.id, "player-draft");
});
