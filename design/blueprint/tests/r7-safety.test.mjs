// R7 H-05 (part) — the campaign safety panel marks a World or Journal entry's topics, beside
// maps and handouts (BG3 content switch, P10 CA-68): «Marca una voce» stores a content mark
// of kind "entry"; the viewer's personal filter reads it through filterFor(...).topicsFor
// ("entry", id), which R8 renders as the veil. Synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc, icon } from "../ui.mjs";
import {
  createCampaignDraft,
  saveCampaignDraft,
  previewCampaignDraft,
  applyCampaignDraft,
} from "../campaign-content.mjs";
import * as D from "../safety-domain.mjs";
import * as UI from "../safety-ui.mjs";
import { register as registerSafety } from "../safety.mjs";

afterEach(() => UI.resetSafetyView());

const memory = () => {
  const values = new Map();
  return {
    getItem: (k) => (values.has(k) ? values.get(k) : null),
    setItem: (k, v) => values.set(k, String(v)),
    removeItem: (k) => values.delete(k),
  };
};
const plain = (html) =>
  String(html)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function harness() {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  assert.equal(registry.use("safety", registerSafety).status, "built");
  const store = createStore({ storage: memory() });
  registry.initState(store.state);
  const dialogs = [];
  const toasts = [];
  const ctx = {
    role: "dm",
    lang: "it",
    offline: false,
    view: { page: "campaign", tab: "safety", id: "agreements" },
    get state() {
      return store.state;
    },
    esc,
    icon,
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) => (v && typeof v === "object" ? v[ctx.lang] || v.it || "" : String(v ?? "")),
    toast: (text, error = false) => toasts.push({ text, error }),
    navigate() {},
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {},
    commit(label, mutator, options = {}) {
      const before = store.state;
      store.commit(label, mutator, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      return { applied: true, persisted: true };
    },
    registry,
  };
  registry.attach(ctx);
  const api = { slice: (state) => state.ext.safety, ctx: () => ctx };
  return { ctx, dialogs, toasts, api };
}
function worldEntry(h, id, title, mode = "campaign") {
  h.ctx.commit("entry", (draft) => {
    createCampaignDraft(draft, { id, kind: "world", campaignId: "lanterns" }, "dm");
    saveCampaignDraft(
      draft,
      id,
      {
        data: {
          title,
          body: "Ragnatele ovunque.",
          worldType: "place",
          questStatus: "open",
          sessionId: null,
          narratorActorId: null,
          links: [],
          sections: [],
        },
        access: { mode, grants: [] },
      },
      "dm",
    );
    const { reviewKey } = previewCampaignDraft(draft, id, "dm");
    applyCampaignDraft(draft, id, { reviewKey }, "dm");
  });
}

test("H-05: «Marca una voce» beside «Marca una dispensa»: an entry's topics veil it for the filter", () => {
  const h = harness();
  worldEntry(h, "crypt-entry", "La cripta dei ragni");
  worldEntry(h, "dm-secret", "Il segreto del DM", "private");
  const panel = UI.renderCampaignSafety(h.ctx, h.api);
  assert.match(panel, /data-safety-dialog="mark-entry"/);
  assert.match(plain(panel), /Marca una voce/);
  // The dialog lists the entries the DM reads, marked like a map.
  UI.openSafetyDialog(h.ctx, h.api, "mark-entry", {});
  const dialog = h.dialogs.at(-1);
  assert.equal(dialog.title, "Marca una voce");
  assert.match(dialog.body, /value="entry-crypt-entry"/);
  const form = new FormData();
  form.set("target", "entry-crypt-entry");
  form.append("topics", "spiders");
  dialog.options.onSubmit(form);
  const mark = D.contentMarkOf(h.ctx.state.ext.safety, "lanterns", "entry", "entry-crypt-entry");
  assert.deepEqual(
    mark.topics.map((t) => t.topic),
    ["spiders"],
  );
  // The player with the Spiders line: the entry is veiled for them (R8 renders the veil).
  h.ctx.role = "player";
  h.ctx.commit("line", (s) => D.addLimit(s.ext.safety, "player", "lines", "Ragni"), {
    local: true,
  });
  h.ctx.commit("filter", (s) => D.setContentFilter(s.ext.safety, "player", { enabled: true }), {
    local: true,
  });
  assert.equal(
    D.filterFor(h.ctx.state, "player").topicsFor("entry", "entry-crypt-entry").topics[0].topic,
    "spiders",
  );
  // The player's list names the marked entry they can read, never the DM's private one.
  const seen = plain(UI.renderCampaignSafety(h.ctx, h.api));
  assert.match(seen, /Voci marcate/);
  assert.match(seen, /La cripta dei ragni/);
  assert.doesNotMatch(seen, /Il segreto del DM/);
  assert.doesNotMatch(UI.renderCampaignSafety(h.ctx, h.api), /data-safety-dialog="mark-entry"/);
  // Only the DM marks; an unknown kind is refused.
  assert.throws(() =>
    D.markContent(
      structuredClone(h.ctx.state),
      structuredClone(h.ctx.state.ext.safety),
      "lanterns",
      "player",
      "entry",
      "entry-crypt-entry",
      [{ topic: "spiders" }],
    ),
  );
  assert.throws(() =>
    D.markContent(
      structuredClone(h.ctx.state),
      structuredClone(h.ctx.state.ext.safety),
      "lanterns",
      "dm",
      "scene",
      "old-watch",
      [{ topic: "spiders" }],
    ),
  );
  h.ctx.lang = "en";
  h.ctx.role = "dm";
  assert.match(plain(UI.renderCampaignSafety(h.ctx, h.api)), /Mark an entry/);
});
