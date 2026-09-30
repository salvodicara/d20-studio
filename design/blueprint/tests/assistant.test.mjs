// B60 — Simulated AI assistant: domain rules (sources, consent, Ask, writing, Session
// Review), registry integration with the real store, and the UI actions and render/bind
// handlers the page uses. Synthetic data only; no network, no model.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import {
  applyCampaignDraft,
  createCampaignDraft,
  discardCampaignDraft,
  getCampaignDraft,
  listCampaignEntries,
  previewCampaignDraft,
  saveCampaignDraft,
} from "../campaign-content.mjs";
import { composeMessage, normalizeChat, postMessage, seedChat } from "../chat-domain.mjs";
import {
  endSession,
  normalizeSession,
  seedSession,
  startSession,
  writeStory,
} from "../session-view.mjs";
import { normalizeHandouts, saveMaterial, seedHandouts } from "../handouts-domain.mjs";
import * as D from "../assistant-domain.mjs";
import {
  actions,
  beatLevelOnTab,
  bindAssistant,
  editorKeys,
  register,
  renderAssistant,
  resetAssistantView,
  slashAt,
} from "../assistant.mjs";
import { useSampleClock } from "../sample-clock.mjs";

// The example's real-time stamps as authored (the week of Thursday 17 September 2026,
// sample-clock.mjs): pinned, so these checks never read the real date.
useSampleClock(() => Date.parse("2026-09-21T12:00:00Z"));

afterEach(() => resetAssistantView());

const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

// Real store + registry + this area, with a ctx shaped like the shell's (app.mjs). The chat
// and handouts slices are seeded with their own areas' synthetic data (B17, B15).
function harness({ lang = "it", role = "player" } = {}) {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry();
  assert.equal(registry.use("assistant", register).status, "built");
  let store = createStore({ storage });
  registry.initState(store.state);
  store.commit("seed other areas", (draft) => {
    draft.ext.chat = normalizeChat(seedChat());
    draft.ext.handouts = normalizeHandouts(seedHandouts(), 1);
  });
  const toasts = [];
  const navigations = [];
  const dialogs = [];
  const ctx = {
    role,
    lang,
    offline: false,
    view: { page: "campaign", id: "", tab: "assistant", returnTo: "" },
    get state() {
      return store.state;
    },
    esc,
    icon: (name) => `<svg data-icon="${name}"></svg>`,
    t(it, en) {
      return this.lang === "it" ? it : en;
    },
    label(value) {
      return typeof value === "object" && value
        ? value[this.lang] || value.it || value.en || ""
        : String(value ?? "");
    },
    toast: (text, error = false) => toasts.push({ text, error }),
    navigate(page, params = {}) {
      navigations.push({ page, ...params });
    },
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {},
    commit(label, mutator, options = {}) {
      if (this.offline && !options.local) {
        const it = "Sei senza rete: questa modifica condivisa non può essere applicata.";
        throw Object.assign(Error(it), { it, en: "You are offline." });
      }
      const before = store.state;
      store.commit(label, mutator, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      registry.emitStateEvents(before, store.state);
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(this.role);
      registry.afterUndo(current, store.state);
      store.persist();
    },
    registry,
  };
  registry.attach(ctx);
  return {
    ctx,
    registry,
    toasts,
    navigations,
    dialogs,
    slice: () => registry.slice(store.state, "assistant"),
    as(nextRole) {
      ctx.role = nextRole;
      registry.emit("role-changed", { role: nextRole });
    },
    reload() {
      store = createStore({ storage });
      registry.initState(store.state);
    },
    store: () => store,
  };
}
// Direct domain fixture on a detached state (for pure rules).
function world() {
  const h = harness();
  const state = structuredClone(h.ctx.state);
  const slice = D.seedAssistant();
  return { state, slice };
}
function addEntry(
  state,
  viewer,
  { kind = "world", title, body, access = { mode: "campaign", grants: [] } },
) {
  const id = `t-${Math.random().toString(36).slice(2)}`;
  const created = createCampaignDraft(state, { id, kind, campaignId: state.campaign.id }, viewer);
  saveCampaignDraft(state, id, { data: { ...created.data, title, body }, access }, viewer);
  const preview = previewCampaignDraft(state, id, viewer);
  assert.ok(preview.canApply, JSON.stringify(preview.errors));
  return applyCampaignDraft(state, id, { reviewKey: preview.reviewKey }, viewer).entryId;
}
const refusal = (fragment) => (error) => {
  assert.ok(
    `${error.it} ${error.en} ${error.message}`.includes(fragment),
    `${error.it} / ${error.en}`,
  );
  return true;
};

// Minimal element double for bind(): buttons, inputs and selects with data attributes.
function mount(html, ctx) {
  const nodes = [...html.matchAll(/<(input|button|select|textarea|form|details)\b([^>]*)>/g)].map(
    ([, tag, attrsText]) => {
      const attrs = Object.fromEntries(
        [...attrsText.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v)]),
      );
      return {
        tagName: tag.toUpperCase(),
        attrs,
        value: attrs.value ?? "",
        checked: "checked" in attrs,
        dataset: Object.fromEntries(
          Object.entries(attrs)
            .filter(([k]) => k.startsWith("data-"))
            .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
        ),
        addEventListener() {},
        querySelectorAll: () => [],
        querySelector: () => null,
        focus() {},
      };
    },
  );
  const matches = (node, selector) =>
    selector
      .split(",")
      .some((part) =>
        [...part.trim().matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)].every(
          ([, key, value]) =>
            key in node.attrs && (value === undefined || node.attrs[key] === value),
        ),
      );
  const root = {
    querySelectorAll: (selector) => nodes.filter((node) => matches(node, selector)),
    querySelector: (selector) => nodes.find((node) => matches(node, selector)) ?? null,
  };
  bindAssistant(root, ctx);
  return {
    click(selector) {
      const node = root.querySelector(selector);
      assert.ok(node, `Missing ${selector}`);
      node.onclick({ preventDefault() {} });
    },
    has: (selector) => Boolean(root.querySelector(selector)),
    node: (selector) => root.querySelector(selector),
  };
}

// ---------------------------------------------------------------------------------

test("seed and normalize: idempotent, per-campaign record, newer versions refused", () => {
  const seed = D.seedAssistant();
  assert.deepEqual(seed, { campaigns: {}, history: {}, reviews: [] });
  const once = D.normalizeAssistant(
    {
      campaigns: {
        lanterns: {
          enabled: true,
          sources: { log: false },
          consent: { player: { status: "given" }, x: { status: "?" } },
        },
      },
    },
    1,
  );
  assert.deepEqual(D.normalizeAssistant(once, 1), once);
  assert.equal(once.campaigns.lanterns.sources.log, false);
  assert.equal(once.campaigns.lanterns.sources.chat, true);
  assert.deepEqual(Object.keys(once.campaigns.lanterns.consent), ["player"]);
  assert.throws(() => D.normalizeAssistant(seed, 2), /newer version/);
  assert.equal(D.campaignRecord(seed, "lanterns").enabled, false, "off until the DM turns it on");
});

test("consent per campaign: only the DM enables; the DM's own consent is recorded; players choose", () => {
  const { state, slice } = world();
  assert.throws(() => D.enableAssistant(state, slice, "player"), refusal("Solo il DM"));
  assert.throws(() => D.ask(state, slice, "player", "lanterna"), refusal("non è attivo"));
  D.enableAssistant(state, slice, "dm", { sources: { log: false } });
  const record = D.campaignRecord(slice, "lanterns");
  assert.equal(record.enabled, true);
  assert.equal(record.sources.log, false);
  assert.equal(D.consentOf(slice, "lanterns", "dm"), "given");
  assert.equal(D.consentOf(slice, "lanterns", "player"), "pending");
  assert.throws(
    () => D.setSources(state, slice, "player", { journal: true }),
    refusal("Solo il DM"),
  );
  assert.throws(
    () =>
      D.setSources(state, slice, "dm", {
        journal: false,
        materials: false,
        chat: false,
        log: false,
        rules: false,
      }),
    refusal("almeno un tipo"),
  );
  D.giveConsent(state, slice, "player");
  D.revokeConsent(state, slice, "player", { reason: "Preferisco di no" });
  assert.equal(D.consentOf(slice, "lanterns", "player"), "revoked");
  assert.deepEqual(
    D.campaignRecord(slice, "lanterns").events.map((e) => e.kind),
    ["enabled", "consent", "revoked"],
  );
  assert.throws(() => D.ask(state, slice, "stranger", "lanterna"), refusal("membri"));
});

test("sources: 'Only me' and private items never read; DM notes only for the DM; consent gates authors", () => {
  const { state, slice } = world();
  D.enableAssistant(state, slice, "dm");
  const secret = addEntry(state, "player", {
    kind: "note",
    title: "Segreto",
    body: "Il medaglione è nascosto sotto il letto.",
    access: { mode: "private", grants: [] },
  });
  const dmOnly = addEntry(state, "dm", {
    title: "Il custode",
    body: "Il custode Oben è un revenant.",
    access: { mode: "dms", grants: [] },
  });
  const player = D.collectSources(state, slice, "player");
  const keys = player.sources.map((s) => s.key);
  assert.ok(!keys.includes(`entry:${secret}`), "a 'Solo io' note is excluded for its own owner");
  assert.equal(player.excluded.personal, 1);
  assert.ok(!keys.includes(`entry:${dmOnly}`), "a DM-only entry is not the player's");
  assert.ok(!keys.some((k) => k.endsWith(":dm")), "no DM handout notes for the player");
  assert.ok(!keys.includes("material:material-crypt"), "an unshown handout is not the player's");
  assert.ok(!keys.includes("chat:m2"), "the player's own message waits for consent");
  assert.equal(player.excluded.consent.player, 3);
  assert.ok(keys.includes("chat:m6"), "a whisper to Livia is readable by her player");
  const dm = D.collectSources(state, slice, "dm");
  const dmKeys = dm.sources.map((s) => s.key);
  assert.ok(dmKeys.includes(`entry:${dmOnly}`) && dmKeys.includes("material:material-crypt:dm"));
  assert.ok(!dmKeys.includes(`entry:${secret}`), "the DM never reads the player's private note");
  assert.equal(dm.sources.find((s) => s.key === "material:material-crypt:dm").restricted, "dm");
  // Shared recap audience: public, in character, readable by every member.
  D.giveConsent(state, slice, "player");
  const shared = D.collectSources(state, slice, "dm", { audience: "campaign" });
  const sharedKeys = shared.sources.map((s) => s.key);
  for (const key of ["chat:m4", "chat:m5", "chat:m6", `entry:${dmOnly}`, "material:material-crypt"])
    assert.ok(!sharedKeys.includes(key), `${key} must stay out of a shared recap`);
  assert.ok(sharedKeys.includes("chat:m2"), "after consent the player's IC line enters");
  assert.ok(
    shared.excluded.whisper >= 1 &&
      shared.excluded.offTable >= 2 &&
      shared.excluded.restricted >= 2,
  );
});

test("sources: shared uncorrected log events only; own labels and private events never read", () => {
  const h = harness({ role: "dm" });
  actions.enable(h.ctx, { journal: true, materials: true, chat: true, log: true });
  h.ctx.commit("Livia apre il portone della torre", () => {});
  h.ctx.commit("Bozza privata della DM", () => {}, { local: true, visibility: "private" });
  h.ctx.commit("Doran sposta la lanterna nella torre", () => {});
  h.ctx.undo();
  const texts = D.collectSources(h.ctx.state, h.slice(), "dm")
    .sources.filter((s) => s.kind === "log")
    .map((s) => s.text);
  assert.ok(texts.includes("Livia apre il portone della torre"));
  assert.ok(
    !texts.includes("Doran sposta la lanterna nella torre"),
    "an undone event is not a fact",
  );
  assert.ok(!texts.includes("Bozza privata della DM"), "private log events are excluded");
  assert.ok(
    !texts.some((t) => t.startsWith("Assistente · ")),
    "the assistant never reads its own labels",
  );
});

test("Ask: extractive answer with numbered citations, deterministic retries, never invents", () => {
  const { state, slice } = world();
  D.enableAssistant(state, slice, "dm");
  D.giveConsent(state, slice, "player");
  const row = D.ask(state, slice, "player", "Chi ha riacceso la lanterna?", { id: "q1" });
  assert.equal(row.answer.found, true);
  const quotes = row.answer.parts.filter((p) => p.q);
  assert.equal(quotes.length, 3);
  assert.equal(quotes[0].q, "Qualcuno ha riacceso la lanterna sulla torre.");
  assert.deepEqual(
    row.citations.map((c) => c.key),
    ["entry:legacy-recap-summary", "material:material-notice", "chat:m2"],
  );
  assert.ok(
    quotes.every((q) => q.cites.length === 1 && row.citations.some((c) => c.n === q.cites[0])),
  );
  // The same question gives the same answer; Try again moves to other sentences, then a short form.
  const again = D.ask(state, slice, "player", "Chi ha riacceso la lanterna?", { id: "q2" });
  assert.deepEqual(again.answer, row.answer);
  const second = D.retry(state, slice, "player", "q1");
  assert.equal(second.attempt, 1);
  assert.notDeepEqual(second.answer.parts, row.answer.parts);
  const third = D.retry(state, slice, "player", "q1");
  assert.equal(third.answer.variant, "short");
  const none = D.ask(state, slice, "player", "Dove si trova il drago d'argento?");
  assert.equal(none.answer.found, false);
  assert.deepEqual(none.citations, []);
  assert.match(none.answer.parts[0].t.it, /non inventa/);
  assert.throws(() => D.ask(state, slice, "player", "   "), refusal("Scrivi una domanda"));
  assert.throws(() => D.ask(state, slice, "player", "chi è?"), refusal("parola significativa"));
  assert.throws(() => D.ask(state, slice, "player", "x".repeat(301)), refusal("300"));
  // Scope: the DM note answers the DM only.
  const mine = D.ask(state, slice, "player", "Cosa c'è nel sarcofago?");
  assert.equal(mine.answer.found, false);
  const dm = D.ask(state, slice, "dm", "Cosa c'è nel sarcofago?");
  assert.ok(
    dm.citations.some((c) => c.restricted === "dm" && c.excerpt.join(" ").includes("Oben")),
  );
  assert.equal(slice.history.player.length, 4);
  assert.equal(slice.history.dm.length, 1, "histories are per identity");
});

test("stored answers are re-checked: a source no longer accessible hides its part and excerpt", () => {
  const { state, slice } = world();
  D.enableAssistant(state, slice, "dm");
  const row = D.ask(state, slice, "player", "Chi ha riacceso la lanterna?");
  const before = D.projectHistoryRow(row, D.accessibleKeys(state, slice, "player"));
  assert.equal(before.answer.hidden, 0);
  D.setSources(state, slice, "dm", { journal: false, materials: true, chat: true, log: true });
  const after = D.projectHistoryRow(row, D.accessibleKeys(state, slice, "player"));
  assert.equal(after.answer.hidden, 1);
  assert.ok(!JSON.stringify(after).includes("riacceso la lanterna sulla torre"));
  assert.equal(after.citations.find((c) => c.n === 1).gone, true);
});

test("own model (SVC-099): prompt with accessible sources only; pasted citations are checked", () => {
  const { state, slice } = world();
  D.enableAssistant(state, slice, "dm");
  const player = D.buildPrompt(state, slice, "player", "Chi è Maestro Oben?");
  assert.match(player.prompt, /SOLO le fonti numerate/);
  assert.match(player.prompt, /Rivolgersi a Maestro Oben/);
  assert.ok(
    !player.prompt.includes("revenant") && !player.prompt.includes("È vuoto"),
    "no DM notes in a player prompt",
  );
  const row = D.startExternal(state, slice, "player", "Chi è Maestro Oben?", {
    id: "ext",
    lang: "en",
  });
  assert.match(row.prompt, /ONLY the numbered sources/);
  assert.throws(() => D.keep(slice, "player", "ext"), refusal("Incolla"));
  assert.throws(() => D.retry(state, slice, "player", "ext"), refusal("tuo modello"));
  const recorded = D.recordExternal(
    slice,
    "player",
    "ext",
    "Oben is the lantern keeper [1] and a wizard [7].",
  );
  assert.deepEqual(recorded.answer.issues, [{ code: "unknown", numbers: [7] }]);
  assert.deepEqual(recorded.answer.parts[0].cites, [1]);
  const plain = D.recordExternal(slice, "player", "ext", "Oben is the keeper.");
  assert.deepEqual(plain.answer.issues, [{ code: "uncited" }]);
  assert.throws(() => D.recordExternal(slice, "player", "ext", " "), refusal("Incolla"));
});

test("assisted writing: themes with citations, NPC never invents stats, discard and restore", () => {
  const { state, slice } = world();
  D.enableAssistant(state, slice, "dm");
  const hook = D.write(state, slice, "player", { theme: "hook" }, { id: "w1" });
  const text = D.rowText(hook, "it");
  assert.match(text, /Si riparte da: Qualcuno ha riacceso la lanterna sulla torre\. \[1\]/);
  assert.match(text, /Proposto dall’assistente \(simulazione\)/);
  const npc = D.write(state, slice, "dm", {
    theme: "npc",
    prompt: "Maestro Oben, custode della torre",
  });
  const npcText = D.rowText(npc, "en");
  assert.match(npcText, /Role \(from your request\): custode della torre/);
  assert.match(npcText, /does not invent them/);
  assert.ok(npc.citations.length >= 2, "facts come from the notice and the DM note");
  assert.throws(() => D.write(state, slice, "dm", { theme: "npc", prompt: "" }), refusal("nome"));
  assert.throws(() => D.write(state, slice, "dm", { theme: "poem" }), refusal("tema"));
  assert.throws(
    () =>
      D.write(state, slice, "player", { theme: "summary", keys: ["material:material-crypt:dm"] }),
    refusal("non sono più accessibili"),
  );
  D.discard(slice, "player", "w1");
  assert.equal(slice.history.player[0].status, "discarded");
  assert.throws(() => D.keep(slice, "player", "w1"), refusal("Ripristina"));
  D.restore(slice, "player", "w1");
  assert.equal(slice.history.player[0].status, "proposed");
  assert.equal(D.clearHistory(slice, "player"), 1);
  assert.equal(slice.history.player, undefined);
  assert.equal(slice.history.dm.length, 1, "clearing one history leaves the others");
});

test("Session Review: shared-only sources, beats on three levels, entities, summary re-run", () => {
  const { state, slice } = world();
  D.enableAssistant(state, slice, "dm");
  assert.throws(
    () => D.createReview(state, slice, "player", { windowId: "all" }),
    refusal("Solo il DM"),
  );
  const windows = D.recapWindows(state, slice, "dm");
  const day = windows.find((w) => w.id === "day:2026-09-17");
  assert.ok(day, JSON.stringify(windows));
  assert.equal(day.count, 2, "m1 and m3 before the player's consent");
  D.giveConsent(state, slice, "player");
  const review = D.createReview(state, slice, "dm", { windowId: day.id, id: "r1" });
  assert.deepEqual(
    review.sources.map((c) => c.key),
    ["chat:m1", "chat:m2", "chat:m3"],
  );
  assert.deepEqual(
    review.beats.map((b) => b.level),
    [0, 1, 1],
  );
  assert.deepEqual(
    review.entities.map((e) => e.name),
    ["Doran", "Livia"],
  );
  assert.ok(!JSON.stringify(review).includes("simbolo inciso"), "the whisper stays out");
  assert.ok(
    !JSON.stringify(review).includes("chiudere alle 23"),
    "out-of-character talk stays out",
  );
  const edited = D.saveReview(
    slice,
    "dm",
    "r1",
    {
      title: "La lanterna riaccesa",
      beats: [
        ...review.beats,
        { level: 2, text: "Doran lega la corda alla ringhiera.", cites: [3, 99] },
      ],
      entities: [{ ...review.entities[0], kind: "person" }],
    },
    { expectedRevision: review.revision },
  );
  assert.deepEqual(edited.beats.at(-1).cites, [3], "unknown citation numbers are dropped");
  assert.equal(edited.entities.length, 1);
  assert.throws(
    () => D.saveReview(slice, "dm", "r1", {}, { expectedRevision: 1 }),
    refusal("cambiata"),
  );
  const rerun = D.regenerateSummary(state, slice, "dm", "r1", { prompt: "corda" });
  assert.match(rerun.summary.text, /^Doran controlla la corda e annuisce\. \[3\]/);
  assert.equal(rerun.beats.length, 4, "re-running the summary keeps the edited beats");
  const quick = D.regenerateSummary(state, slice, "dm", "r1", { prompt: "", format: "quick" });
  assert.match(quick.summary.text, /^• /);
  const rebuilt = D.rebuildReview(state, slice, "dm", "r1", { excludedKeys: ["chat:m2"] });
  assert.deepEqual(
    rebuilt.sources.map((c) => c.key),
    ["chat:m1", "chat:m3"],
  );
  assert.throws(
    () =>
      D.rebuildReview(state, slice, "dm", "r1", {
        excludedKeys: ["chat:m1", "chat:m2", "chat:m3"],
      }),
    refusal("escluso tutte"),
  );
  const body = D.recapBody(rebuilt, "it");
  assert.match(body, /Momenti principali\n• Al calar della sera/);
  assert.match(body, /rivista dal DM prima della condivisione/);
  D.discardReview(slice, "dm", "r1");
  assert.throws(() => D.publishCheck(state, slice, "dm", "r1"), refusal("già pubblicato"));
  D.restoreReview(slice, "dm", "r1");
  assert.equal(D.publishCheck(state, slice, "dm", "r1").audience.length, 2);
});

test("Session Review: a cited source that is no longer shared blocks publishing", () => {
  const { state, slice } = world();
  D.enableAssistant(state, slice, "dm");
  D.giveConsent(state, slice, "player");
  D.createReview(state, slice, "dm", { windowId: "day:2026-09-17", id: "r2" });
  D.revokeConsent(state, slice, "player");
  assert.throws(() => D.publishCheck(state, slice, "dm", "r2"), refusal("[2]"));
});

test("UI actions: Ask, Try again, Keep into a private note draft, Discard and Restore", () => {
  const h = harness({ role: "dm" });
  actions.enable(h.ctx, { journal: true, materials: true, chat: true, log: true });
  h.as("player");
  let html = renderAssistant(h.ctx);
  assert.match(html, /Simulazione/);
  assert.match(html, /Il DM ha attivato l’assistente/);
  assert.ok(!html.includes('data-assistant-tab="review"'), "players have no recap tab");
  mount(html, h.ctx).click('[data-assistant-act="consent"]');
  assert.equal(D.consentOf(h.slice(), "lanterns", "player"), "given");
  const id = actions.ask(h.ctx, "Chi ha riacceso la lanterna?");
  html = renderAssistant(h.ctx);
  assert.match(html, /Qualcuno ha riacceso la lanterna sulla torre\./);
  assert.match(html, /data-assistant-cite="1"/);
  assert.match(html, /Apri la fonte/);
  const ui = mount(html, h.ctx);
  ui.click(`[data-assistant-act="retry"][data-row="${id}"]`);
  assert.equal(h.slice().history.player[0].attempt, 1);
  const draftId = actions.keep(h.ctx, id);
  assert.deepEqual(h.navigations.at(-1).page, "notes");
  assert.equal(h.navigations.at(-1).tab, "edit");
  const draft = h.ctx.state.campaignContent.drafts.find((d) => d.id === draftId);
  assert.equal(draft.ownerId, "player");
  assert.equal(draft.access.mode, "private", "kept text starts as a private note");
  assert.match(draft.data.body, /Fonti:\n\[1\]/);
  assert.equal(h.slice().history.player[0].status, "kept");
  h.as("dm");
  const dmHtml = renderAssistant(h.ctx);
  assert.ok(
    !dmHtml.includes(id) && !dmHtml.includes(">Chi ha riacceso la lanterna?<"),
    "the DM never sees the player's questions",
  );
  h.as("player");
  actions.discard(h.ctx, id);
  assert.match(renderAssistant(h.ctx), /Risposta scartata\./);
  actions.restore(h.ctx, id);
  assert.equal(h.slice().history.player[0].status, "kept", "restore returns to the previous state");
});

test("UI actions: offline keeps personal questions, refuses shared changes; Undo preserves the slice", () => {
  const h = harness({ role: "dm" });
  actions.enable(h.ctx, null);
  h.ctx.offline = true;
  assert.throws(() => actions.disable(h.ctx), refusal("senza rete"));
  actions.ask(h.ctx, "Chi è Maestro Oben?");
  assert.equal(h.slice().history.dm.length, 1, "a private question works offline");
  h.ctx.offline = false;
  h.ctx.commit("Livia apre il portone", () => {});
  h.ctx.undo();
  assert.equal(h.slice().history.dm.length, 1, "gameplay Undo never rewrites the assistant");
  assert.equal(D.campaignRecord(h.slice(), "lanterns").enabled, true);
  h.reload();
  assert.equal(h.slice().history.dm.length, 1, "history persists across reload");
});

test("UI actions: Session Review publish to the journal, withdraw with reason, publish again", () => {
  const h = harness({ role: "dm" });
  actions.enable(h.ctx, null);
  h.as("player");
  actions.consent(h.ctx);
  h.as("dm");
  h.ctx.view = { page: "campaign", tab: "assistant", id: "review" };
  const reviewId = actions.createReview(h.ctx, "day:2026-09-17");
  let html = renderAssistant(h.ctx);
  assert.match(html, /Tab e Maiusc\+Tab/);
  assert.match(html, /Rivedi e pubblica/);
  actions.editReview(h.ctx, {
    title: "La lanterna riaccesa",
    summary: "La lanterna brilla di nuovo. [1]",
  });
  assert.equal(
    h.registry.pendingDraft(h.ctx, { page: "campaign", tab: "journal" })?.id,
    "assistant-review",
  );
  assert.equal(
    h.registry.pendingDraft(h.ctx, { page: "campaign", tab: "assistant", id: "review" }),
    null,
  );
  actions.saveReview(h.ctx);
  assert.equal(h.registry.pendingDraft(h.ctx, { page: "campaign", tab: "journal" }), null);
  h.ctx.offline = true;
  assert.throws(() => actions.publish(h.ctx, reviewId), refusal("senza rete"));
  h.ctx.offline = false;
  // The review dialog lists the audience and previews the text; publishing is its submit
  // (round-2 P3: no attestation checkbox, as in the inline Session Review, SVC-088).
  mount(renderAssistant(h.ctx), h.ctx).click('[data-assistant-act="publish"]');
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.body, /Giocatore · Livia, DM/);
  assert.ok(!dialog.body.includes('name="reviewed"'), "no required attestation box");
  dialog.options.onSubmit(new FormData());
  const published = h.slice().reviews.find((r) => r.id === reviewId);
  assert.equal(published.status, "published");
  const forPlayer = listCampaignEntries(
    h.ctx.state,
    { campaignId: "lanterns", kind: "recap" },
    "player",
  );
  const recap = forPlayer.find((e) => e.id === published.publishedEntryId);
  assert.equal(recap.data.title, "La lanterna riaccesa");
  // Round-2 P3: the journal text reads as prose (no raw inline markers); the numbered
  // source list closes it.
  assert.match(recap.data.body, /^La lanterna brilla di nuovo\.\n/);
  assert.match(recap.data.body, /\nFonti\n\[1\] /);
  assert.throws(() => actions.withdraw(h.ctx, reviewId, "no"), refusal("motivo"));
  actions.withdraw(h.ctx, reviewId, "Contiene un dettaglio sbagliato");
  assert.ok(
    !listCampaignEntries(h.ctx.state, { campaignId: "lanterns" }, "player").some(
      (e) => e.id === published.publishedEntryId,
    ),
    "withdrawn: players no longer read it",
  );
  assert.match(renderAssistant(h.ctx), /Ritirato il .*Contiene un dettaglio sbagliato/);
  actions.republish(h.ctx, reviewId);
  assert.ok(
    listCampaignEntries(h.ctx.state, { campaignId: "lanterns" }, "player").some(
      (e) => e.id === published.publishedEntryId,
    ),
  );
  assert.deepEqual(
    D.campaignRecord(h.slice(), "lanterns").events.map((e) => e.kind),
    ["enabled", "consent", "published", "withdrawn", "republished"],
  );
});

test("registry: sections, entry panel, drawer, setting, notifications, command, search", () => {
  const h = harness({ role: "dm" });
  const ids = (point, ...args) => h.registry.list(point, h.ctx, ...args).map((c) => c.id);
  assert.ok(ids("campaign-section").includes("assistant"));
  assert.ok(!ids("table-panel").includes("assistant"), "no drawer while the assistant is off");
  assert.deepEqual(h.registry.notifications(h.ctx), []);
  actions.enable(h.ctx, null);
  assert.ok(ids("table-panel").includes("assistant"));
  assert.ok(ids("command").includes("assistant.ask"));
  assert.equal(h.registry.search(h.ctx, "assistente")[0].params.tab, "assistant");
  assert.equal(h.registry.getSetting(h.ctx, "assistant-engine.engine"), "demo");
  actions.setEngine(h.ctx, "external");
  assert.equal(h.registry.getSetting(h.ctx, "assistant-engine.engine"), "external");
  actions.ask(h.ctx, "Chi è Maestro Oben?");
  assert.equal(h.slice().history.dm[0].engine, "external");
  h.as("player");
  assert.equal(
    h.registry.getSetting(h.ctx, "assistant-engine.engine"),
    "demo",
    "the engine is personal",
  );
  const notice = h.registry.notifications(h.ctx).find((n) => n.id === "assistant-consent");
  assert.equal(notice.target.params.id, "consent");
  // An ended Table session (B14) asks the DM for a recap, like Archivist's /end.
  h.store().commit("session", (draft) => {
    draft.ext["session-view"] = {
      sessions: [
        {
          id: "s1",
          number: 1,
          status: "ended",
          startedAt: "2026-09-17T18:00:00.000Z",
          endedAt: "2026-09-17T22:00:00.000Z",
        },
      ],
    };
  });
  h.as("dm");
  assert.ok(h.registry.notifications(h.ctx).some((n) => n.id === "assistant-review-session:s1"));
  const windows = D.recapWindows(h.ctx.state, h.slice(), "dm");
  assert.equal(windows[0].id, "session:s1");
  // Entry panel: "Only me" notes say they are excluded; shared entries offer the actions.
  const note = { id: "n1", access: { mode: "private", grants: [] } };
  const section = h.registry.get("campaign-section", "assistant.entry", h.ctx, note);
  assert.match(section.render(h.ctx, note), /Solo io/);
  const recap = listCampaignEntries(h.ctx.state, { campaignId: "lanterns" }, "dm")[0];
  assert.match(section.render(h.ctx, recap), /Riassumi questa voce/);
  const rowId = actions.entryWrite(h.ctx, recap.id, "summary");
  assert.match(section.render(h.ctx, recap), new RegExp(`data-row="${rowId}"`));
  assert.match(section.render(h.ctx, recap), /Il gruppo ha raggiunto il vecchio osservatorio\./);
});

test("EN: labels, answers and the review render in English on the same data", () => {
  const h = harness({ role: "dm", lang: "en" });
  actions.enable(h.ctx, null);
  actions.ask(h.ctx, "Who is Oben?");
  const html = renderAssistant(h.ctx);
  assert.match(html, /Simulation/);
  assert.match(html, /From the sources you can read:/);
  assert.match(html, /Try again/);
  assert.ok(!/Riprova|Simulazione/.test(html), "no Italian labels in the English view");
});

test("re-reading kept answers and recaps: markers, bullets, source lists and provenance are not facts", () => {
  const body = [
    "La lanterna brilla di nuovo. [1]",
    "",
    "Momenti principali",
    "• Al calar della sera il gruppo raggiunge l’osservatorio. [1]",
    "  – Doran controlla la corda. [3]",
    "",
    "Persone, luoghi e cose: Doran (persona)",
    "",
    "Fonti",
    "[1] Chat · narrazione · 17/09/26, 21:02",
    "",
    "Bozza preparata dall’assistente (simulazione) e rivista dal DM prima della condivisione.",
  ].join("\n");
  assert.equal(
    D.entryText(body),
    "La lanterna brilla di nuovo.\nAl calar della sera il gruppo raggiunge l’osservatorio.\nDoran controlla la corda.",
  );
  const { state, slice } = world();
  D.enableAssistant(state, slice, "dm");
  const id = addEntry(state, "dm", { kind: "recap", title: "Resoconto", body });
  const row = D.write(state, slice, "player", { theme: "summary", keys: [`entry:${id}`] });
  const text = D.rowText(row, "it");
  assert.ok(
    !/Momenti principali|Fonti:\n\[1\] Chat|simulazione\) e rivista/.test(
      text.split("\n\nFonti:")[0],
    ),
  );
  // One quote and one marker for consecutive sentences of the same entry.
  assert.match(text, /Riassunto: La lanterna brilla di nuovo\. Al calar della sera[^[]*\[1\]/);
  const windows = D.recapWindows(state, slice, "dm");
  assert.ok(
    !D.collectSources(state, slice, "dm", { audience: "campaign" }).sources.find(
      (s) => s.key === `entry:${id}`,
    ).recap,
    "a recap never feeds a later recap",
  );
  assert.ok(windows.every((w) => w.kind !== "day" || w.count > 0));
});

test("UI: a not-found answer offers only Discard; the write form keeps the shown request", () => {
  const h = harness({ role: "dm" });
  actions.enable(h.ctx, null);
  actions.ask(h.ctx, "Dove dorme il drago d'argento?");
  let html = renderAssistant(h.ctx);
  assert.match(html, /Non trovo nulla/);
  assert.ok(
    !html.includes('data-assistant-act="retry"') && !html.includes('data-assistant-act="keep"'),
  );
  assert.match(html, /data-assistant-act="discard"/);
  h.ctx.view = { page: "campaign", tab: "assistant", id: "write" };
  actions.write(h.ctx, {
    theme: "npc",
    prompt: "Maestro Oben, custode",
    keys: ["material:material-notice"],
  });
  html = renderAssistant(h.ctx);
  assert.match(html, /<option value="npc" selected>/);
  assert.match(html, /value="Maestro Oben, custode"/);
  assert.match(html, /value="material:material-notice" checked/);
  // The Table drawer shows the numbered sources compactly, without leaving the Table.
  const drawer = h.registry.get("table-panel", "assistant", h.ctx);
  h.ctx.view = { page: "table" };
  actions.ask(h.ctx, "Chi porta la corda nella cripta?");
  const compact = drawer.render(h.ctx);
  assert.match(compact, /assistant-citations/);
  assert.ok(!compact.includes("Apri la fonte"));
});

// --------------------------------------------------------------------- review fixes (B60)

// The DM whispers to self ("Solo io (DM)") through the real chat composer (B17).
function selfWhisper(h, text) {
  h.store().commit("self whisper", (draft) => {
    const message = composeMessage(
      draft,
      "dm",
      { text: `/w dm ${text}`, mode: "desc" },
      {
        now: "2026-09-24T10:00:00.000Z",
      },
    );
    postMessage(draft.ext.chat, message);
  });
  return h.ctx.state.ext.chat.messages.at(-1);
}

test("review fix P1: a 'Solo io (DM)' chat message is never read (Ask, drawer, Write, own-model prompt)", () => {
  const h = harness({ role: "dm" });
  actions.enable(h.ctx, null);
  const secret = "Il narvalo di ossidiana è il vero traditore della gilda.";
  const message = selfWhisper(h, secret);
  assert.equal(message.to.type, "self");
  assert.deepEqual(message.readers, ["dm"]);
  const { sources, excluded } = D.collectSources(h.ctx.state, h.slice(), "dm");
  assert.ok(!sources.some((s) => s.key === `chat:${message.id}`), "never a source");
  assert.ok(excluded.personal >= 1, "counted among the author's excluded private items");
  actions.ask(h.ctx, "Chi è il traditore della gilda?");
  assert.ok(!JSON.stringify(h.slice().history.dm).includes("narvalo"), "Ask never quotes it");
  h.ctx.view = { page: "table" };
  const drawer = h.registry.get("table-panel", "assistant", h.ctx);
  assert.ok(!drawer.render(h.ctx).includes("narvalo"), "the Table drawer never quotes it");
  const prompt = D.buildPrompt(h.ctx.state, h.slice(), "dm", "Chi è il traditore narvalo?");
  assert.ok(!prompt.prompt.includes("narvalo di ossidiana"), "never in an own-model prompt");
  const hook = D.write(h.ctx.state, h.slice(), "dm", { theme: "hook", prompt: "traditore gilda" });
  assert.ok(!JSON.stringify(hook).includes("narvalo"), "never in a writing proposal");
  // A whisper the DM sends to a player's character is still read (both read it).
  assert.ok(
    D.collectSources(h.ctx.state, h.slice(), "dm").sources.some((s) => s.key === "chat:m6"),
  );
});

test("review fix P1: publishing a withdrawn recap again re-checks consent and shared sources", () => {
  const h = harness({ role: "dm" });
  actions.enable(h.ctx, null);
  h.as("player");
  actions.consent(h.ctx);
  h.as("dm");
  const id = actions.createReview(h.ctx, "all");
  actions.publish(h.ctx, id);
  const entryId = h.slice().reviews.find((r) => r.id === id).publishedEntryId;
  const readable = () =>
    listCampaignEntries(h.ctx.state, { campaignId: "lanterns" }, "player").find(
      (e) => e.id === entryId,
    );
  assert.match(readable().data.body, /Qualcuno l’ha riaccesa/);
  h.as("player");
  actions.revoke(h.ctx, "Non voglio le mie battute nei resoconti");
  h.as("dm");
  actions.withdraw(h.ctx, id, "Rispetto la revoca di Livia");
  assert.equal(readable(), undefined);
  assert.throws(() => actions.republish(h.ctx, id), refusal("non si ripubblica"));
  assert.equal(readable(), undefined, "refused: the player still cannot read it");
  assert.equal(h.slice().reviews.find((r) => r.id === id).status, "withdrawn");
  const html = renderAssistant({
    ...h.ctx,
    view: { page: "campaign", tab: "assistant", id: "review" },
  });
  assert.match(html, /Non si ripubblica: \[\d+\]/);
  assert.ok(!html.includes('data-assistant-act="republish"'), "no Publish again while blocked");
  // Consent given again: the same recap may be shared again.
  h.as("player");
  actions.consent(h.ctx);
  h.as("dm");
  actions.republish(h.ctx, id);
  assert.ok(readable());
});

test("review fix P2: Tab moves focus through the Session Review; it indents only at the start of a worked beat", () => {
  const beat = { level: 1 };
  assert.equal(beatLevelOnTab(beat, false, { armed: false, start: 0, end: 0 }), null);
  assert.equal(beatLevelOnTab(beat, false, { armed: true, start: 0, end: 12 }), null);
  assert.equal(beatLevelOnTab(beat, false, { armed: true, start: 4, end: 4 }), null);
  assert.equal(beatLevelOnTab(beat, false, { armed: true, start: 0, end: 0 }), 2);
  assert.equal(beatLevelOnTab(beat, true, { armed: true, start: 0, end: 0 }), 0);
  assert.equal(beatLevelOnTab({ level: 2 }, false, { armed: true, start: 0, end: 0 }), null);
  assert.equal(beatLevelOnTab({ level: 0 }, true, { armed: true, start: 0, end: 0 }), null);
  const h = harness({ role: "dm" });
  actions.enable(h.ctx, null);
  h.ctx.view = { page: "campaign", tab: "assistant", id: "review" };
  actions.createReview(h.ctx, "all");
  const html = renderAssistant(h.ctx);
  assert.match(html, /Con il cursore all’inizio del testo di un momento/);
  assert.match(html, /aria-live="polite" data-assistant-live/);
});

test("review fix P2: exclusions are saved with the draft and block publishing until rebuilt", () => {
  const h = harness({ role: "dm" });
  actions.enable(h.ctx, null);
  h.as("player");
  actions.consent(h.ctx);
  h.as("dm");
  h.ctx.view = { page: "campaign", tab: "assistant", id: "review" };
  const id = actions.createReview(h.ctx, "all");
  actions.editReview(h.ctx, { excludedKeys: ["chat:m2"] });
  assert.match(renderAssistant(h.ctx), /Escluse ma ancora nel testo: \[\d+\]/);
  actions.saveReview(h.ctx);
  const saved = h.slice().reviews.find((r) => r.id === id);
  assert.deepEqual(saved.excludedKeys, ["chat:m2"], "the exclusion survives Save");
  assert.match(renderAssistant(h.ctx), /value="chat:m2" >/, "the box stays unticked");
  assert.throws(() => actions.publish(h.ctx, id), refusal("ancora nel testo"));
  actions.rebuild(h.ctx);
  const rebuilt = h.slice().reviews.find((r) => r.id === id);
  assert.ok(!rebuilt.sources.some((c) => c.key === "chat:m2"));
  actions.publish(h.ctx, id);
  const entry = listCampaignEntries(h.ctx.state, { campaignId: "lanterns" }, "player").find(
    (e) => e.id === h.slice().reviews.find((r) => r.id === id).publishedEntryId,
  );
  assert.ok(!entry.data.body.includes("riaccesa"), "the excluded line is not published");
});

test("review fix P2: a hook from a world entry starts from that entry; empty proposals offer only Discard", () => {
  const { state, slice } = world();
  D.enableAssistant(state, slice, "dm");
  const tower = addEntry(state, "dm", {
    kind: "world",
    title: "Torre del porto",
    body: "La torre domina il porto di Bruma. Di notte una luce verde lampeggia in cima.",
  });
  const hook = D.write(state, slice, "player", { theme: "hook", keys: [`entry:${tower}`] });
  assert.equal(hook.answer.found, true);
  const text = D.rowText(hook, "it");
  assert.match(text, /Si riparte da: Di notte una luce verde lampeggia in cima\. \[1\]/);
  assert.match(text, /Domanda per il tavolo/);
  const retried = D.retry(state, slice, "player", hook.id);
  assert.match(D.rowText(retried, "it"), /Si riparte da: La torre domina il porto di Bruma\./);
  // A proposal with nothing found: only Discard (as for Ask).
  const h = harness({ role: "dm" });
  actions.enable(h.ctx, null);
  h.ctx.view = { page: "campaign", tab: "assistant", id: "write" };
  actions.write(h.ctx, { theme: "summary", prompt: "drago d’argento" });
  const html = renderAssistant(h.ctx);
  assert.match(html, /Nessuna fonte accessibile corrisponde alla richiesta/);
  assert.ok(
    !html.includes('data-assistant-act="keep"') && !html.includes('data-assistant-act="retry"'),
  );
  assert.match(html, /data-assistant-act="discard"/);
});

test("review fix P2: one recap per Table session: the review completes B14's story draft", () => {
  const h = harness({ role: "dm" });
  actions.enable(h.ctx, null);
  h.as("player");
  actions.consent(h.ctx);
  h.as("dm");
  let story;
  h.store().commit("session", (draft) => {
    draft.ext["session-view"] = normalizeSession(seedSession());
    startSession(draft, "dm", Date.parse("2026-09-17T18:30:00.000Z"));
    endSession(draft, "dm", Date.parse("2026-09-17T22:00:00.000Z"));
    const sessionId = draft.ext["session-view"].sessions[0].id;
    story = writeStory(draft, "dm", sessionId, { draftId: "story-1", at: Date.now() });
  });
  const sessionId = story.sessionId;
  // B14 already announces its draft: the assistant adds no second notification.
  assert.ok(
    !h.registry.notifications(h.ctx).some((n) => n.id === `assistant-review-session:${sessionId}`),
  );
  // The story draft's editor offers the Session Review of that session.
  const draft = getCampaignDraft(h.ctx.state, "story-1", "dm");
  const panel = h.registry
    .list("campaign-section", h.ctx, draft)
    .find((c) => c.id === "assistant.editor");
  assert.match(panel.render(h.ctx, draft), /resoconto dell’assistente \(sessione 1\)/);
  const reviewId = actions.storyReview(h.ctx, sessionId);
  assert.deepEqual(h.navigations.at(-1), { page: "campaign", tab: "assistant", id: "review" });
  assert.equal(actions.storyReview(h.ctx, sessionId), reviewId, "the same review reopens");
  const recapsBefore = listCampaignEntries(
    h.ctx.state,
    { campaignId: "lanterns", kind: "recap" },
    "dm",
  ).length;
  actions.publish(h.ctx, reviewId);
  const recaps = listCampaignEntries(
    h.ctx.state,
    { campaignId: "lanterns", kind: "recap" },
    "player",
  );
  assert.equal(recaps.length, recapsBefore + 1, "exactly one new recap for the session");
  const published = h.slice().reviews.find((r) => r.id === reviewId);
  const entry = recaps.find((e) => e.id === published.publishedEntryId);
  assert.match(entry.data.body, /Presenze:[\s\S]*Cosa è successo:\n[\s\S]*Momenti principali/);
  assert.equal(getCampaignDraft(h.ctx.state, "story-1", "dm").status, "applied");
  assert.ok(!h.registry.notifications(h.ctx).some((n) => n.id === "story-1"));
  assert.deepEqual(D.sessionsToReview(h.ctx.state, h.slice(), "dm"), []);
  const windows = D.recapWindows(h.ctx.state, h.slice(), "dm");
  assert.equal(windows.find((w) => w.id === `session:${sessionId}`).recapped, true);
});

test("review fix P2: rules questions cite the SRD 5.2.1 compendium and enabled homebrew", () => {
  const { state, slice } = world();
  D.enableAssistant(state, slice, "dm");
  const prone = D.ask(state, slice, "player", "Cosa fa la condizione Prono?");
  assert.equal(prone.answer.found, true);
  assert.equal(prone.citations[0].key, "rule:srd2024:condition:prone");
  assert.match(prone.citations[0].location.it, /SRD 5\.2\.1 IT p\. 212/);
  assert.equal(prone.citations[0].edition, "2024");
  assert.deepEqual(prone.citations[0].route, {
    page: "library",
    tab: "compendium",
    revision: "srd2024:condition:prone",
  });
  const dash = D.ask(state, slice, "player", "Come funziona l'azione Scatto?");
  assert.equal(dash.citations[0].key, "rule:srd2024:rule:dash");
  const missile = D.ask(state, slice, "player", "Quanti danni fa Dardo incantato?");
  assert.equal(missile.citations[0].key, "rule:srd2024:spell:magic-missile");
  assert.match(missile.answer.parts[1].q, /1d4 \+ 1/);
  const en = D.ask(state, slice, "player", "What does Prone do?", { lang: "en" });
  assert.match(en.answer.parts[1].q, /^Prone: Crawls or stands/);
  // A campaign question is not answered with SRD entries that share one word.
  const lantern = D.ask(state, slice, "player", "Chi ha riacceso la lanterna?");
  assert.ok(!lantern.citations.some((c) => c.kind === "rule"));
  // Homebrew enabled in the campaign is a rules source; a disabled revision is not.
  const content = (id, name, description) => ({
    id,
    owner: "dm",
    type: "condition",
    revisions: [
      {
        id: `${id}-r1`,
        createdAt: "2026-09-20T10:00:00.000Z",
        data: {
          name: { it: name, en: name },
          description: { it: description, en: description },
          source: {
            kind: "authored",
            edition: "2024",
            label: "Regola della casa",
            reference: "",
            rights: { modify: true, share: true, export: true },
          },
          fields: {},
          resource: null,
          activities: [],
          dependencies: [],
        },
      },
    ],
    accessByRevision: { [`${id}-r1`]: { readers: ["player"], editors: [] } },
  });
  state.library = [
    content("hb-nebbia", "Nebbia di Bruma", "La vista è limitata a 3 metri finché dura la nebbia."),
    content("hb-gelo", "Gelo notturno", "Chi dorme all'aperto perde un Dado Vita."),
  ];
  state.campaign.enabledContent = [{ contentId: "hb-nebbia", revisionId: "hb-nebbia-r1" }];
  const fog = D.ask(state, slice, "player", "Come funziona la Nebbia di Bruma?");
  assert.equal(fog.citations[0].key, "rule:homebrew:hb-nebbia/hb-nebbia-r1");
  assert.match(fog.citations[0].type.it, /Homebrew della campagna/);
  assert.equal(D.ask(state, slice, "player", "Cosa fa il Gelo notturno?").answer.found, false);
  // The DM can turn rules off like any other kind of source.
  D.setSources(state, slice, "dm", {
    journal: true,
    materials: true,
    chat: true,
    log: true,
    rules: false,
  });
  assert.equal(D.ask(state, slice, "player", "Cosa fa la condizione Prono?").answer.found, false);
});

test("review fix P2: assisted writing inside the note editor inserts at the cursor (VTL-217)", () => {
  const h = harness({ role: "dm" });
  actions.enable(h.ctx, null);
  h.as("player");
  actions.consent(h.ctx);
  const recap = listCampaignEntries(h.ctx.state, { campaignId: "lanterns" }, "player").find(
    (e) => e.kind === "recap",
  );
  h.store().commit("note draft", (draft) => {
    const created = createCampaignDraft(
      draft,
      { id: "note-1", kind: "note", campaignId: "lanterns" },
      "player",
    );
    saveCampaignDraft(
      draft,
      "note-1",
      { data: { ...created.data, links: [{ kind: "entry", id: recap.id }] } },
      "player",
    );
  });
  const draft = getCampaignDraft(h.ctx.state, "note-1", "player");
  h.ctx.view = { page: "notes", tab: "edit", id: "note-1" };
  const panels = h.registry
    .list("campaign-section", h.ctx, draft)
    .filter((c) => c.id.endsWith(".editor"));
  assert.deepEqual(
    panels.map((c) => c.id),
    ["assistant.editor"],
  );
  let html = panels[0].render(h.ctx, draft);
  assert.match(html, /Il testo non salvato di questa bozza non viene letto/);
  assert.ok(!/<form/.test(html), "no nested form inside the editor's form");
  assert.deepEqual(editorKeys(h.ctx, draft), [`entry:${recap.id}`]);
  const rowId = actions.editorWrite(h.ctx, draft, { theme: "summary" });
  html = panels[0].render(h.ctx, draft);
  assert.match(html, /data-assistant-act="insert"/);
  assert.match(html, /In una nuova nota/);
  const events = [];
  const field = {
    value: "Primo paragrafo.\nSecondo.",
    dispatchEvent: (event) => events.push(event.type),
  };
  const { value } = actions.insert(h.ctx, rowId, field, "note-1", { start: 16, end: 16 });
  assert.match(
    value,
    /^Primo paragrafo\.\n\nRiassunto: [\s\S]*simulazione\): rivedilo prima di condividerlo\.\nSecondo\.$/,
  );
  assert.deepEqual(events, ["input"], "the editor's own input handling records the change");
  const row = h.slice().history.player.find((r) => r.id === rowId);
  assert.equal(row.status, "kept");
  assert.equal(row.keptDraftId, "note-1");
  assert.equal(
    getCampaignDraft(h.ctx.state, "note-1", "player").data.body,
    "",
    "nothing is saved until the author saves the note",
  );
  // Without a known cursor the text is appended at the end.
  const other = actions.editorWrite(h.ctx, draft, { theme: "hook" });
  const end = { value: "Fine.", dispatchEvent() {} };
  assert.match(
    actions.insert(h.ctx, other, end, "note-1", null).value,
    /^Fine\.\n\nGancio proposto:/,
  );
});

test("review fix P3: citations open their source (chat by message); inline consent error offline; reasons say who reads them", () => {
  const h = harness({ role: "dm" });
  actions.enable(h.ctx, null);
  h.as("player");
  // Offline: the consent refusal is shown inside the banner, not only as a toast.
  h.ctx.offline = true;
  mount(renderAssistant(h.ctx), h.ctx).click('[data-assistant-act="consent"]');
  assert.match(
    renderAssistant(h.ctx),
    /assistant-consent-banner[\s\S]*<p class="error" role="alert">Sei senza rete/,
  );
  h.ctx.offline = false;
  actions.consent(h.ctx);
  actions.ask(h.ctx, "Chi ha riacceso la lanterna?");
  const chat = h.slice().history.player[0].citations.find((c) => c.key === "chat:m2");
  assert.deepEqual(chat.route, { page: "campaign", tab: "chat-archive", id: "m2" });
  const html = renderAssistant(h.ctx);
  assert.match(html, /data-assistant-cite="\d" data-row="[^"]+" data-assistant-source=/);
  assert.match(html, /aria-label="Apri la fonte 1:/);
  h.ctx.view = { page: "table" };
  const compact = h.registry.get("table-panel", "assistant", h.ctx).render(h.ctx);
  assert.ok(!/data-assistant-cite="\d" data-row="[^"]+" data-assistant-source=/.test(compact));
  h.ctx.view = { page: "campaign", tab: "assistant", id: "consent" };
  mount(renderAssistant(h.ctx), h.ctx).click('[data-assistant-act="revoke"]');
  assert.match(h.dialogs.at(-1).body, /visibile a tutti i membri nel registro del consenso/);
});

test("review fix P2: a rules entry answers only when named word by word (no stem collisions)", () => {
  const { state, slice } = world();
  D.enableAssistant(state, slice, "dm");
  const hidden = D.ask(state, slice, "player", "Dove è nascosto il medaglione d’argento?");
  assert.ok(!hidden.citations.some((c) => c.key === "rule:srd2024:rule:hide"), "not 'Nascondersi'");
  const hide = D.ask(state, slice, "player", "Come si fa a Nascondersi?");
  assert.equal(hide.citations[0].key, "rule:srd2024:rule:hide");
  const plural = D.ask(state, slice, "player", "Quanti dardi incantati lancio?");
  assert.equal(plural.citations[0].key, "rule:srd2024:spell:magic-missile", "endings tolerated");
  const prompt = D.buildPrompt(state, slice, "player", "Dove è nascosto il medaglione?");
  assert.ok(!prompt.prompt.includes("Nascondersi"));
});

// ------------------------------------------------------------------ review round 2

// An entry with one section (the audience of the section is its own).
function addSectioned(state, viewer, { kind = "world", title, body, section }) {
  const id = `t-${Math.random().toString(36).slice(2)}`;
  const created = createCampaignDraft(state, { id, kind, campaignId: state.campaign.id }, viewer);
  saveCampaignDraft(
    state,
    id,
    {
      data: {
        ...created.data,
        title,
        body,
        sections: [
          {
            id: "s1",
            title: section.title,
            body: section.body,
            access: { mode: section.mode ?? "campaign", grants: [] },
          },
        ],
      },
      access: { mode: "campaign", grants: [] },
    },
    viewer,
  );
  const preview = previewCampaignDraft(state, id, viewer);
  assert.ok(preview.canApply, JSON.stringify(preview.errors));
  return applyCampaignDraft(state, id, { reviewKey: preview.reviewKey }, viewer).entryId;
}
// The author changes the audience of every section of an entry (the editor's select).
function setSectionMode(state, viewer, entryId, mode) {
  const id = `e-${Math.random().toString(36).slice(2)}`;
  const created = createCampaignDraft(state, { id, entryId }, viewer);
  const sections = created.data.sections.map((s) => ({ ...s, access: { mode, grants: [] } }));
  saveCampaignDraft(state, id, { data: { ...created.data, sections } }, viewer);
  const preview = previewCampaignDraft(state, id, viewer);
  assert.ok(preview.canApply, JSON.stringify(preview.errors));
  applyCampaignDraft(state, id, { reviewKey: preview.reviewKey }, viewer);
}

test("round 2 P1: a section made 'Solo io' after an answer leaves stored answers, Keep, the drawer and own-model prompts", () => {
  const h = harness({ role: "dm" });
  actions.enable(h.ctx, null);
  const secret = "Il custode Oben nasconde una chiave di ossidiana sotto il faro.";
  let entryId;
  h.store().commit("world entry", (draft) => {
    entryId = addSectioned(draft, "dm", {
      title: "Torre di Oben",
      body: "La torre sorge sul colle di Bruma.",
      section: { title: "Segreto del custode", body: secret },
    });
  });
  h.as("player");
  actions.consent(h.ctx);
  const rowId = actions.ask(h.ctx, "Cosa sai della torre di Oben e della chiave di ossidiana?");
  assert.ok(renderAssistant(h.ctx).includes("sotto il faro"), "quoted while the group reads it");
  assert.ok(renderAssistant(h.ctx).includes("sorge sul colle"), "and the body sentence");
  const onlySecret = actions.ask(h.ctx, "Dove nasconde la chiave di ossidiana?");
  h.ctx.view = { page: "campaign", tab: "assistant", id: "" };
  actions.setEngine(h.ctx, "external");
  const extId = actions.ask(h.ctx, "Dove nasconde la chiave di ossidiana?");
  assert.ok(
    h
      .slice()
      .history.player.find((r) => r.id === extId)
      .prompt.includes("sotto il faro"),
  );
  actions.setEngine(h.ctx, "demo");
  // The DM corrects a mistaken share: the section becomes "Solo io".
  h.store().commit("section private", (draft) => setSectionMode(draft, "dm", entryId, "private"));
  const raw = h.slice().history.player.find((r) => r.id === rowId);
  const map = D.accessibleKeys(h.ctx.state, h.slice(), "player");
  assert.ok(map.has(`entry:${entryId}`), "the entry itself is still readable");
  // Before the fix only keys were compared: the key-only projection still shows it.
  assert.ok(
    JSON.stringify(D.projectHistoryRow(raw, new Set(map.keys()))).includes("sotto il faro"),
  );
  const now = D.projectHistoryRow(raw, map);
  assert.ok(!JSON.stringify(now).includes("sotto il faro"), "neither quote nor excerpt");
  assert.equal(now.answer.hidden, 1);
  // Every surface that shows or copies the stored answer uses that projection.
  h.ctx.view = { page: "campaign", tab: "assistant", id: "" };
  mount(renderAssistant(h.ctx), h.ctx).click(`[data-assistant-act="show"][data-row="${rowId}"]`);
  const html = renderAssistant(h.ctx);
  assert.ok(!html.includes("sotto il faro"));
  assert.match(html, /non dice più quel testo/);
  h.ctx.view = { page: "table" };
  const drawer = h.registry.get("table-panel", "assistant", h.ctx).render(h.ctx);
  assert.ok(!drawer.includes("sotto il faro"));
  h.ctx.view = { page: "campaign", tab: "assistant", id: "" };
  const kept = actions.keep(h.ctx, rowId);
  const keptBody = getCampaignDraft(h.ctx.state, kept, "player").data.body;
  assert.ok(!keptBody.includes("sotto il faro"), "Keep copies only what is still readable");
  assert.ok(keptBody.includes("sorge sul colle"));
  // An answer left with nothing readable offers Try again and Discard, never Keep.
  h.ctx.view = { page: "campaign", tab: "assistant", id: "" };
  mount(renderAssistant(h.ctx), h.ctx).click(
    `[data-assistant-act="show"][data-row="${onlySecret}"]`,
  );
  const emptied = renderAssistant(h.ctx);
  assert.ok(!emptied.includes(`data-assistant-act="keep" data-row="${onlySecret}"`));
  assert.match(emptied, new RegExp(`data-assistant-act="retry" data-row="${onlySecret}"`));
  assert.throws(() => actions.keep(h.ctx, onlySecret), refusal("non contiene più testo"));
  // The own-model prompt that quoted it is withheld, not shown again.
  const ext = D.projectHistoryRow(
    h.slice().history.player.find((r) => r.id === extId),
    D.accessibleKeys(h.ctx.state, h.slice(), "player"),
  );
  assert.equal(ext.prompt, null);
  assert.equal(ext.promptWithheld, true);
  h.ctx.view = { page: "campaign", tab: "assistant", id: "" };
  mount(renderAssistant(h.ctx), h.ctx).click(`[data-assistant-act="show"][data-row="${extId}"]`);
  assert.match(renderAssistant(h.ctx), /Il prompt citava un testo che non puoi più leggere/);
  // A new question finds nothing; the DM (author) still reads the section in the journal.
  const again = D.ask(h.ctx.state, h.slice(), "player", "Dove nasconde la chiave di ossidiana?");
  assert.ok(!JSON.stringify(again).includes("sotto il faro"));
});

test("round 2 P1: a handout text changed after an answer hides the withdrawn sentence", () => {
  const { state, slice } = world();
  D.enableAssistant(state, slice, "dm");
  const row = D.ask(state, slice, "player", "Quanto paga la gilda ai custodi?");
  assert.ok(JSON.stringify(row).includes("10 monete d’oro"));
  const notice = state.ext.handouts.materials.find((m) => m.id === "material-notice");
  saveMaterial(
    state,
    {
      ...structuredClone(notice),
      playerText:
        "Cercasi custodi per la lanterna del vecchio osservatorio. Rivolgersi a Maestro Oben, alla torre.",
    },
    "dm",
  );
  const now = D.projectHistoryRow(row, D.accessibleKeys(state, slice, "player"));
  assert.ok(!JSON.stringify(now).includes("10 monete d’oro"), "gone from quote and excerpt");
  assert.ok(JSON.stringify(now).includes("Cercasi custodi"), "what it still says stays");
  assert.ok(now.answer.hidden >= 1);
  // An SRD 5.2.1 answer keeps its quote in either language (public reference).
  const en = D.ask(state, slice, "player", "What does Prone do?", { lang: "en" });
  const enNow = D.projectHistoryRow(en, D.accessibleKeys(state, slice, "player"));
  assert.equal(enNow.answer.hidden, 0);
});

test("round 2 P1: a member's section made 'Solo io' after the recap draft is hidden from the DM and never published", () => {
  const h = harness({ role: "dm" });
  actions.enable(h.ctx, null);
  h.as("player");
  actions.consent(h.ctx);
  const fear = "Livia teme il buio della cripta più di ogni mostro.";
  let noteId;
  h.store().commit("player note", (draft) => {
    noteId = addSectioned(draft, "player", {
      kind: "note",
      title: "Diario di Livia",
      body: "Livia esplora la cripta sotto la torre.",
      section: { title: "Paura", body: fear },
    });
  });
  h.as("dm");
  h.ctx.view = { page: "campaign", tab: "assistant", id: "review" };
  const reviewId = actions.createReview(h.ctx, "all");
  actions.regen(h.ctx, "buio cripta mostro");
  const draft = () => h.slice().reviews.find((r) => r.id === reviewId);
  assert.ok(JSON.stringify(draft().summary).includes(fear), "the summary quotes the section");
  assert.ok(renderAssistant(h.ctx).includes(fear), "the DM reads it while it is shared");
  // The player (author) makes the section "Solo io".
  h.as("player");
  h.store().commit("privatize", (d) => setSectionMode(d, "player", noteId, "private"));
  h.as("dm");
  h.ctx.view = { page: "campaign", tab: "assistant", id: "review" };
  const stale = D.reviewStaleness(h.ctx.state, h.slice(), "dm", draft());
  assert.equal(stale.rows[0].reason, "changed");
  assert.ok(stale.withdrawn.includes(fear));
  const html = renderAssistant(h.ctx);
  assert.ok(!html.includes("teme il buio"), "the editor never renders the withdrawn text");
  assert.match(html, /Riassunto nascosto/);
  assert.match(html, /è cambiata o non è più condivisa con tutto il gruppo/);
  // Publishing (button or command) is refused: no dialog shows it, nothing is published.
  const dialogs = h.dialogs.length;
  mount(html, h.ctx).click('[data-assistant-act="publish"]');
  assert.equal(h.dialogs.length, dialogs, "no publish dialog");
  assert.throws(() => actions.publish(h.ctx, reviewId), refusal("è cambiata"));
  assert.equal(draft().status, "draft");
  // Re-running the summary uses what the group reads now; then it can be shared.
  actions.regen(h.ctx, "");
  const beats = draft().beats.filter((beat) =>
    D.staleIn(D.reviewStaleness(h.ctx.state, h.slice(), "dm", draft()), beat.text, beat.cites),
  );
  actions.editReview(h.ctx, {
    beats: draft().beats.filter((beat) => !beats.includes(beat)),
  });
  actions.saveReview(h.ctx);
  actions.publish(h.ctx, reviewId);
  const entry = listCampaignEntries(h.ctx.state, { campaignId: "lanterns" }, "player").find(
    (e) => e.id === draft().publishedEntryId,
  );
  assert.ok(!entry.data.body.includes("teme il buio") && !entry.data.body.includes("Paura"));
});

test("round 2 P1: a published recap whose source changed is flagged, and once withdrawn cannot return", () => {
  const h = harness({ role: "dm" });
  actions.enable(h.ctx, null);
  h.as("player");
  actions.consent(h.ctx);
  const fear = "Livia teme il buio della cripta più di ogni mostro.";
  let noteId;
  h.store().commit("player note", (draft) => {
    noteId = addSectioned(draft, "player", {
      kind: "note",
      title: "Diario di Livia",
      body: "Livia esplora la cripta sotto la torre.",
      section: { title: "Paura", body: fear },
    });
  });
  h.as("dm");
  h.ctx.view = { page: "campaign", tab: "assistant", id: "review" };
  const reviewId = actions.createReview(h.ctx, "all");
  actions.regen(h.ctx, "buio cripta mostro");
  actions.publish(h.ctx, reviewId);
  h.as("player");
  h.store().commit("privatize", (d) => setSectionMode(d, "player", noteId, "private"));
  h.as("dm");
  h.ctx.view = { page: "campaign", tab: "assistant", id: "review" };
  assert.match(renderAssistant(h.ctx), /Dopo la pubblicazione \[\d+\]/);
  actions.withdraw(h.ctx, reviewId, "Livia ha reso privata la sezione");
  assert.throws(() => actions.republish(h.ctx, reviewId), refusal("non si ripubblica"));
});

test("round 2 P2: consent can be declined as easily as given, and changed later", () => {
  const h = harness({ role: "dm" });
  actions.enable(h.ctx, null);
  h.as("player");
  h.ctx.view = { page: "campaign", tab: "assistant", id: "" };
  let html = renderAssistant(h.ctx);
  assert.match(html, /assistant-consent-banner[\s\S]*data-assistant-act="decline"/);
  assert.match(html, /può copiarne estratti in uno strumento esterno/, "own-model disclosure");
  const note = h.registry.notifications(h.ctx).find((n) => n.id === "assistant-consent");
  assert.match(note.title.it, /dai o nega il consenso/);
  h.ctx.view = { page: "campaign", tab: "assistant", id: "consent" };
  html = renderAssistant(h.ctx);
  assert.match(html, /Do il consenso[\s\S]*Non do il consenso/, "both choices in the member row");
  mount(html, h.ctx).click('[data-assistant-act="decline"]');
  assert.equal(D.consentOf(h.slice(), "lanterns", "player"), "declined");
  h.ctx.view = { page: "campaign", tab: "assistant", id: "" };
  assert.ok(!renderAssistant(h.ctx).includes("assistant-consent-banner"), "banner dismissed");
  assert.ok(!h.registry.notifications(h.ctx).some((n) => n.id === "assistant-consent"));
  const keys = D.collectSources(h.ctx.state, h.slice(), "dm").sources.map((s) => s.key);
  assert.ok(!keys.includes("chat:m2"), "declined content stays out");
  assert.ok(
    D.campaignRecord(h.slice(), "lanterns").events.some((e) => e.kind === "declined"),
    "the consent log records the choice",
  );
  h.ctx.view = { page: "campaign", tab: "assistant", id: "consent" };
  html = renderAssistant(h.ctx);
  assert.match(html, /Consenso non dato/);
  assert.equal(
    D.normalizeAssistant(h.slice()).campaigns.lanterns.consent.player.status,
    "declined",
  );
  actions.consent(h.ctx);
  assert.equal(D.consentOf(h.slice(), "lanterns", "player"), "given", "changeable later");
});

test("round 2 P2: own-model use is disclosed, shown per member, and a member can keep content out of external prompts", () => {
  const h = harness({ role: "dm" });
  mount(
    renderAssistant({ ...h.ctx, view: { page: "campaign", tab: "assistant", id: "consent" } }),
    h.ctx,
  ).click('[data-assistant-act="enable"]');
  assert.match(h.dialogs.at(-1).body, /fuori da queste promesse/, "enable dialog says it");
  const kinds = new FormData();
  for (const kind of D.SOURCE_KINDS) kinds.append(`source-${kind}`, "on");
  h.dialogs.at(-1).options.onSubmit(kinds);
  actions.setEngine(h.ctx, "external");
  h.as("player");
  actions.consent(h.ctx);
  h.ctx.view = { page: "campaign", tab: "assistant", id: "consent" };
  let html = renderAssistant(h.ctx);
  assert.match(html, /DM<\/strong><small>Consenso dato[^<]*motore: il suo modello/);
  assert.match(html, /fuori dalle promesse di conservazione/);
  assert.match(html, /lì valgono le regole di quello strumento/, "retention card says it");
  // The DM's prompt carries the player's consented line until the player opts out.
  const question = "Chi ha riacceso la lanterna?";
  assert.match(
    D.buildPrompt(h.ctx.state, h.slice(), "dm", question).prompt,
    /Qualcuno l’ha riaccesa/,
  );
  // The card's own checkbox runs the opt-out (bind), not the pasted-answer field.
  const box = mount(html, h.ctx).node("[data-assistant-external-consent]");
  box.checked = false;
  box.onchange();
  assert.equal(D.campaignRecord(h.slice(), "lanterns").consent.player.external, false);
  html = renderAssistant(h.ctx);
  assert.match(html, /esclude i propri contenuti dai prompt esterni/);
  assert.ok(
    !D.buildPrompt(h.ctx.state, h.slice(), "dm", question).prompt.includes(
      "Qualcuno l’ha riaccesa",
    ),
  );
  assert.ok(
    D.collectSources(h.ctx.state, h.slice(), "dm").sources.some((s) => s.key === "chat:m2"),
    "the demo generator (in this browser) still reads it",
  );
  const external = D.collectSources(h.ctx.state, h.slice(), "dm", { external: true });
  assert.ok(external.excluded.external.player >= 1, "counted as kept out");
  // Typing a model's answer never touches consent (distinct attribute from the opt-out).
  actions.setEngine(h.ctx, "external");
  h.ctx.view = { page: "campaign", tab: "assistant", id: "" };
  actions.ask(h.ctx, "Chi è Maestro Oben?");
  const answerField = mount(renderAssistant(h.ctx), h.ctx).node("[data-assistant-external]");
  assert.equal(answerField.tagName, "TEXTAREA");
  assert.equal(answerField.onchange, undefined, "the answer field is not a consent control");
  // Consent withdrawn and given again keeps the opt-out.
  actions.revoke(h.ctx, "");
  actions.consent(h.ctx);
  assert.equal(D.campaignRecord(h.slice(), "lanterns").consent.player.external, false);
});

test("round 2 P2: an NPC idea proposes an SRD 5.2.1 stat block and the DM creates the NPC", () => {
  const h = harness({ role: "dm" });
  actions.enable(h.ctx, null);
  h.ctx.view = { page: "campaign", tab: "assistant", id: "write" };
  const rowId = actions.write(h.ctx, { theme: "npc", prompt: "Maestro Oben, custode della torre" });
  const row = h.slice().history.dm.find((r) => r.id === rowId);
  assert.equal(row.npc.creatureId, "srd2024:creature:guard");
  const text = D.rowText(row, "it");
  assert.match(
    text,
    /Profilo di gioco proposto \(SRD 5\.2\.1, da confermare\): Guardia · GS 1\/8 · CA 16 · PF 11 \[\d+\]/,
  );
  const block = row.citations.find((c) => c.key === "rule:srd2024:creature:guard");
  assert.deepEqual(block.route, {
    page: "library",
    tab: "compendium",
    revision: "srd2024:creature:guard",
  });
  assert.match(block.location.it, /SRD 5\.2\.1 IT p\. \d+/);
  let html = renderAssistant(h.ctx);
  assert.match(html, /data-assistant-act="npc"/);
  mount(html, h.ctx).click('[data-assistant-act="npc"]');
  const dialog = h.dialogs.at(-1);
  assert.match(
    dialog.body,
    /value="srd2024:creature:guard" selected>Guardia · GS 1\/8 · CA 16 · PF 11 · proposto/,
  );
  assert.match(dialog.body, /Proposto dal ruolo «custode della torre»/);
  const form = new FormData();
  form.append("name", "Maestro Oben");
  form.append("block", "srd2024:creature:mage");
  form.append("team", "neutral");
  form.append("scene", "old-watch");
  form.append("hidden", "on");
  dialog.options.onSubmit(form);
  const actorId = h.slice().history.dm.find((r) => r.id === rowId).npcActorId;
  const actor = h.ctx.state.actors[actorId];
  assert.equal(actor.kind, "npc");
  assert.equal(actor.name, "Maestro Oben");
  assert.equal(actor.compendiumRef.id, "srd2024:creature:mage", "the DM's choice wins");
  assert.equal(actor.provenance.revision, "5.2.1");
  assert.match(actor.notes, /Nome: Maestro Oben/);
  const token = h.ctx.state.scenes
    .find((s) => s.id === "old-watch")
    .tokens.find((t) => t.actorId === actorId);
  assert.equal(token.hidden, true, "arrives hidden from players");
  html = renderAssistant(h.ctx);
  assert.match(html, /PNG creato/);
  assert.match(html, /data-assistant-act="open-npc" data-actor="/);
  // Undo removes the NPC like any gameplay change; the proposal offers it again.
  h.ctx.undo();
  assert.equal(h.ctx.state.actors[actorId], undefined);
  assert.match(renderAssistant(h.ctx), /data-assistant-act="npc"/);
  // Players see the proposed block and its compendium link, never the create command.
  h.as("player");
  actions.consent(h.ctx);
  h.ctx.view = { page: "campaign", tab: "assistant", id: "write" };
  actions.write(h.ctx, { theme: "npc", prompt: "Sorella Ilde, sacerdotessa" });
  html = renderAssistant(h.ctx);
  assert.match(html, /Sacerdote · GS 2 · CA 13 · PF 38/);
  assert.ok(!html.includes('data-assistant-act="npc"'));
  assert.throws(
    () => actions.createNpc(h.ctx, h.slice().history.player.at(-1).id, {}),
    refusal("Solo il DM"),
  );
});

test("round 2 P3: recap links, neutral copy, withdraw while off, empty Ask text, kept state, '/' in the editor", () => {
  const h = harness({ role: "dm" });
  actions.enable(h.ctx, null);
  h.ctx.view = { page: "campaign", tab: "assistant", id: "review" };
  const reviewId = actions.createReview(h.ctx, "all");
  let html = renderAssistant(h.ctx);
  assert.ok(!/Archivist|Saga20|Quest Portal/.test(html), "no product names in the UI");
  actions.publish(h.ctx, reviewId);
  const entryId = h.slice().reviews.find((r) => r.id === reviewId).publishedEntryId;
  const entry = listCampaignEntries(h.ctx.state, { campaignId: "lanterns" }, "player").find(
    (e) => e.id === entryId,
  );
  assert.ok(!/\S \[\d+\]/.test(entry.data.body.split("\nFonti\n")[0]), "no inline markers");
  // The entry page lists the recap's sources as links that open them.
  h.as("player");
  const panel = h.registry
    .list("campaign-section", h.ctx, entry)
    .find((c) => c.id === "assistant.entry");
  assert.match(
    panel.render(h.ctx, entry),
    /Fonti del resoconto[\s\S]*data-assistant-source="\{&quot;page&quot;/,
  );
  // Off: the published recap can still be withdrawn.
  h.as("dm");
  actions.disable(h.ctx, "");
  h.ctx.view = { page: "campaign", tab: "assistant", id: "review" };
  html = renderAssistant(h.ctx);
  assert.match(html, /non è attivo/);
  assert.match(html, /data-assistant-act="withdraw"/);
  assert.ok(!html.includes('data-assistant-act="republish"'));
  // A newer draft exists: the button still withdraws the recap shown next to it.
  actions.enable(h.ctx, null);
  h.ctx.view = { page: "campaign", tab: "assistant", id: "review" };
  actions.createReview(h.ctx, "all");
  actions.disable(h.ctx, "");
  resetAssistantView();
  mount(renderAssistant(h.ctx), h.ctx).click('[data-assistant-act="withdraw"]');
  assert.match(h.dialogs.at(-1).title, /Ritirare il resoconto/);
  const form = new FormData();
  form.append("reason", "Assistente spento, lo ritiro");
  h.dialogs.at(-1).options.onSubmit(form);
  assert.equal(h.slice().reviews.find((r) => r.id === reviewId).status, "withdrawn");
  assert.ok(!renderAssistant(h.ctx).includes('data-assistant-act="republish"'), "not while off");
  actions.enable(h.ctx, null);
  // Ask: after Discard the empty text does not claim there were no questions.
  h.ctx.view = { page: "campaign", tab: "assistant", id: "" };
  const asked = actions.ask(h.ctx, "Chi è Maestro Oben?");
  actions.discard(h.ctx, asked);
  assert.ok(!renderAssistant(h.ctx).includes("Nessuna domanda finora"));
  // Kept state follows the note draft: inserted, then the draft discarded.
  h.store().commit("note", (draft) => {
    createCampaignDraft(draft, { id: "note-9", kind: "note", campaignId: "lanterns" }, "dm");
  });
  const draft = getCampaignDraft(h.ctx.state, "note-9", "dm");
  const rowId = actions.editorWrite(h.ctx, draft, { theme: "summary" });
  // "/" alone on an empty line opens the assistant; the proposal replaces it.
  assert.equal(slashAt("Riga.\n/", 7), 6);
  assert.equal(slashAt("a / b", 3), null, "a slash inside prose is a character");
  assert.equal(slashAt("/x", 1), null);
  const field = { value: "Riga.\n/", dispatchEvent() {} };
  const bind = h.registry
    .list("campaign-section", h.ctx, draft)
    .find((c) => c.id === "assistant.editor");
  assert.match(bind.render(h.ctx, draft), /«\/» su una riga vuota porta qui/);
  // The editor's input handler records the "/" (bind); the kept proposal replaces it.
  assert.equal(actions.slash(h.ctx, "note-9", field.value, 7), 6);
  const inserted = actions.insert(h.ctx, rowId, field, "note-9", { start: 7, end: 7 });
  assert.match(inserted.value, /^Riga\.\n\nRiassunto:/);
  assert.ok(!inserted.value.includes("/"), "the '/' is replaced by the proposal");
  h.ctx.view = { page: "notes", tab: "edit", id: "note-9" };
  assert.match(bind.render(h.ctx, draft), /Inserita nella bozza della nota/);
  h.store().commit("discard", (d) => discardCampaignDraft(d, "note-9", "dm"));
  h.ctx.view = { page: "campaign", tab: "assistant", id: "write" };
  assert.match(renderAssistant(h.ctx), /Bozza scartata/);
});
