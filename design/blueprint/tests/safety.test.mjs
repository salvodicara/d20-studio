// B27 — Table safety: domain rules, registry integration with the real store, and the
// UI handlers (render + bind with a minimal element double). Synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import * as D from "../safety-domain.mjs";
import * as UI from "../safety-ui.mjs";
import { register } from "../safety.mjs";
import * as N from "../notifications.mjs";

afterEach(() => {
  UI.resetSafetyView();
  UI.clearSafetyDevice();
});

const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

// Real store + registry + this area, with a ctx shaped like the shell's (app.mjs).
function harness({ lang = "it", areas = [] } = {}) {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry();
  for (const [name, area] of areas) assert.equal(registry.use(name, area).status, "built");
  assert.equal(registry.use("safety", register).status, "built");
  let store = createStore({ storage });
  registry.initState(store.state);
  const toasts = [];
  const navigations = [];
  const dialogs = [];
  const ctx = {
    role: "player",
    lang,
    offline: false,
    view: { page: "campaign", id: "", tab: "safety", returnTo: "" },
    get state() {
      return store.state;
    },
    esc,
    t(it, en) {
      return this.lang === "it" ? it : en;
    },
    label(value) {
      return typeof value === "object" && value
        ? value[this.lang] || value.it || value.en || ""
        : String(value ?? "");
    },
    toast: (text, error = false) => toasts.push({ text, error }),
    navigate: (page, params = {}) => navigations.push({ page, ...params }),
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
  const api = { slice: (state) => registry.slice(state, "safety"), ctx: () => ctx };
  return {
    ctx,
    api,
    registry,
    toasts,
    navigations,
    dialogs,
    slice: () => registry.slice(store.state, "safety"),
    reload() {
      store = createStore({ storage });
      registry.initState(store.state);
    },
    storeRef: () => store,
  };
}

// Minimal element double for bind(): parses buttons/inputs from rendered markup.
function mount(html, bind) {
  const nodes = [
    ...html.matchAll(/<(input|button|select|textarea)\b([^>]*)(?:>([\s\S]*?)<\/\1>|>)/g),
  ].map(([, tag, attrsText]) => {
    const attrs = Object.fromEntries(
      [...attrsText.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v)]),
    );
    const events = {};
    return {
      tagName: tag.toUpperCase(),
      attrs,
      events,
      value: attrs.value ?? "",
      checked: "checked" in attrs,
      dataset: Object.fromEntries(
        Object.entries(attrs)
          .filter(([k]) => k.startsWith("data-"))
          .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
      ),
      addEventListener(type, fn) {
        events[type] = fn;
      },
      focus() {},
    };
  });
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
  bind(root);
  return {
    root,
    click(selector) {
      const node = root.querySelector(selector);
      assert.ok(node, `Missing ${selector}`);
      (node.onclick ?? node.events.click)?.({ preventDefault() {}, stopPropagation() {} });
    },
    set(selector, value) {
      const node = root.querySelector(selector);
      assert.ok(node, `Missing ${selector}`);
      if (typeof value === "boolean") node.checked = value;
      else node.value = value;
      node.onchange?.({ target: node });
    },
  };
}
const formData = (entries) => {
  const form = new FormData();
  for (const [key, value] of entries) form.append(key, value);
  return form;
};

// ---------------------------------------------------------------------------------

test("seed and normalize: synthetic data for 'lanterns', idempotent, strict on versions", () => {
  const seed = D.seedSafety();
  assert.equal(seed.campaigns.lanterns.expectations.shared, false);
  assert.equal(seed.profiles.player, undefined, "the player's profile starts empty");
  const once = D.normalizeSafety(seed, 1);
  assert.deepEqual(D.normalizeSafety(once, 1), once);
  assert.throws(() => D.normalizeSafety(seed, 2), /newer version/);
  // A stored signal never keeps a sender field, even from older or tampered data.
  const tampered = D.normalizeSafety(
    {
      campaigns: { lanterns: { signals: [{ id: "s1", kind: "stop", at: "x", sender: "player" }] } },
    },
    1,
  );
  assert.deepEqual(Object.keys(tampered.campaigns.lanterns.signals[0]).sort(), [
    "at",
    "id",
    "kind",
  ]);
  assert.deepEqual(D.normalizeSafety(null, 0).campaigns.lanterns.rounds.length, 1);
  // A valid withdraw hash survives normalization; anything else is dropped.
  const hash = D.sha256("token-token-token");
  const kept = D.normalizeSafety(
    {
      campaigns: {
        lanterns: {
          signals: [
            { id: "s1", kind: "stop", at: "x", withdrawHash: hash },
            { id: "s2", kind: "go", at: "x", withdrawHash: "not-a-hash" },
          ],
        },
      },
    },
    1,
  ).campaigns.lanterns.signals;
  assert.equal(kept[0].withdrawHash, hash);
  assert.equal("withdrawHash" in kept[1], false);
});

test("sha256: matches node:crypto on edge lengths and non-ASCII text", () => {
  for (const value of ["", "abc", "x".repeat(55), "x".repeat(56), "x".repeat(64), "è€𝄞".repeat(40)])
    assert.equal(D.sha256(value), createHash("sha256").update(value).digest("hex"));
});

test("profile: lines and veils from presets (any language, any case) or custom text", () => {
  const slice = D.seedSafety();
  assert.deepEqual(D.parseTopic("  ragni "), { topic: "spiders" });
  assert.deepEqual(D.parseTopic("GRAPHIC BLOOD AND WOUNDS"), { topic: "gore" });
  assert.deepEqual(D.parseTopic("Annegamento prolungato"), { custom: "Annegamento prolungato" });
  assert.throws(
    () => D.parseTopic("   "),
    (e) => e.en === "Type or choose a topic.",
  );
  assert.throws(() => D.parseTopic("x".repeat(81)), /troppo lungo/);
  assert.throws(() => D.parseTopic("<b>"), /non ammessi/);
  const line = D.addLimit(slice, "player", "lines", "Ragni");
  D.addLimit(slice, "player", "veils", "Annegamento prolungato");
  assert.throws(() => D.addLimit(slice, "player", "lines", "spiders"), /già tra le tue linee/);
  assert.throws(() => D.addLimit(slice, "player", "veils", "Spiders"), /toglilo da lì/);
  D.removeLimit(slice, "player", "lines", line.id);
  assert.throws(() => D.removeLimit(slice, "player", "lines", line.id), /già tolto/);
  D.addLimit(slice, "player", "veils", "ragni"); // moved after removal
  assert.deepEqual(
    D.profileOf(slice, "player").veils.map((e) => e.topic ?? e.custom),
    ["Annegamento prolungato", "spiders"],
  );
});

test("combined lines and veils: every member, no names or ids, a line wins over a veil", () => {
  const h = harness();
  const slice = D.seedSafety();
  D.addLimit(slice, "player", "lines", "Ragni");
  D.addLimit(slice, "player", "veils", "Tortura"); // the DM keeps torture as a veil
  D.addLimit(slice, "player", "veils", "Violenza sui bambini"); // the DM keeps it as a line
  slice.profiles.stranger = { lines: [{ id: "x", topic: "sexual" }], veils: [], filter: {} };
  const combined = D.combinedLimits(h.ctx.state, slice, "lanterns");
  assert.deepEqual(combined.lines.map((e) => e.topic).sort(), ["child-harm", "spiders"]);
  assert.deepEqual(combined.veils, [{ topic: "torture" }]);
  const text = JSON.stringify(combined);
  for (const leak of ["player", "dm", "id", "stranger", "sexual"])
    assert.ok(
      !text.includes(`"${leak}"`) && !text.includes(leak + '"'),
      `combined list leaks ${leak}`,
    );
  assert.deepEqual(D.combinedLimits(h.ctx.state, slice, "other-campaign"), {
    lines: [],
    veils: [],
  });
});

test("expectations sheet: DM only, Stop always declared, drafts hidden from players", () => {
  const h = harness();
  const state = h.ctx.state;
  const slice = D.seedSafety();
  assert.throws(() => D.saveExpectations(state, slice, "lanterns", "player", {}), /Solo il DM/);
  assert.throws(
    () => D.saveExpectations(state, slice, "lanterns", "dm", { tools: ["boom"] }),
    /sconosciuto/,
  );
  assert.throws(
    () => D.saveExpectations(state, slice, "lanterns", "dm", { remind: true, tools: ["stop"] }),
    /richiede aspettative condivise/,
  );
  assert.equal(D.expectationsFor(state, slice, "lanterns", "player"), null);
  assert.equal(D.checklistFor(state, slice, "lanterns", "player"), null);
  assert.ok(D.expectationsFor(state, slice, "lanterns", "dm"), "the DM reads the draft");
  // Unticking every tool never removes the anonymous Stop (Alchemy, Roll20) nor the
  // group's lines and veils, which come from each member's profile (Alchemy, SVC-073).
  const bare = D.saveExpectations(state, slice, "lanterns", "dm", { shared: true, tools: [] });
  assert.deepEqual(bare.tools, ["stop", "lines"]);
  assert.deepEqual(D.enabledTools(slice, "lanterns"), ["stop", "lines"]);
  assert.ok(D.sendSignal(state, slice, "lanterns", "player", "stop").id);
  const saved = D.saveExpectations(state, slice, "lanterns", "dm", {
    tone: "Mistero",
    lines: [{ topic: "sexual" }, "Crudeltà gratuita"],
    veils: ["sexual", { topic: "gore" }],
    warnings: [{ topic: "spiders" }],
    tools: ["hand"],
    shared: true,
    remind: true,
  });
  assert.equal(saved.revision, 3);
  assert.deepEqual(
    saved.veils.map((e) => e.topic),
    ["gore"],
    "a campaign line is not also a veil",
  );
  assert.equal(D.expectationsFor(state, slice, "lanterns", "player").tone, "Mistero");
  assert.deepEqual(D.enabledTools(slice, "lanterns"), ["stop", "hand", "lines"]);
  const reminder = D.reminderFor(state, slice, "lanterns", "player");
  assert.equal(reminder.key, "lanterns:3");
  assert.ok(
    reminder.lines.some((e) => e.topic === "child-harm"),
    "group lines are reminded",
  );
  assert.ok(reminder.lines.some((e) => e.custom === "Crudeltà gratuita"));
  assert.ok(!JSON.stringify(reminder).includes('"id"'), "reminder carries no ids");
  assert.throws(
    () => D.sendSignal(state, slice, "lanterns", "player", "pace"),
    /non è fra quelli concordati/,
  );
  assert.throws(() => D.openRound(state, slice, "lanterns", "dm"), /non è fra gli strumenti/);
  assert.throws(() => D.saveChecklist(state, slice, "lanterns", "player", {}), /Solo il DM/);
  D.saveChecklist(state, slice, "lanterns", "dm", {
    absence: { done: true, note: "Il DM guida il personaggio assente." },
    unknown: { done: true },
  });
  assert.deepEqual(Object.keys(D.checklistFor(state, slice, "lanterns", "player")), ["absence"]);
});

test("anonymous signals: no sender stored, DM acknowledges, only the DM can", () => {
  const h = harness();
  const state = h.ctx.state;
  const slice = D.seedSafety();
  const { id, token } = D.sendSignal(state, slice, "lanterns", "player", "stop");
  const [record] = D.activeSignals(state, slice, "lanterns", "dm");
  assert.deepEqual(Object.keys(record).sort(), ["at", "id", "kind"], "no hash in the projection");
  assert.ok(!JSON.stringify(slice.campaigns.lanterns.signals).includes("player"));
  assert.ok(!JSON.stringify(slice.campaigns.lanterns.signals).includes(token), "token not stored");
  assert.equal(slice.campaigns.lanterns.signals[0].withdrawHash, D.sha256(token));
  assert.throws(() => D.acknowledgeSignal(state, slice, "lanterns", "player", id), /Solo il DM/);
  assert.throws(() => D.sendSignal(state, slice, "lanterns", "guest", "stop"), /Solo i membri/);
  assert.throws(() => D.sendSignal(state, slice, "lanterns", "player", "boom"), /sconosciuto/);
  assert.equal(D.acknowledgeSignal(state, slice, "lanterns", "dm", id), "stop");
  assert.throws(
    () => D.withdrawSignal(state, slice, "lanterns", "player", id, token),
    /già stato gestito/,
  );
  const second = D.sendSignal(state, slice, "lanterns", "player", "pace");
  D.withdrawSignal(state, slice, "lanterns", "player", second.id, second.token);
  assert.equal(D.activeSignals(state, slice, "lanterns", "dm").length, 0);
});

test("withdrawal needs the sender's token: other members cannot remove a signal or entry", () => {
  const h = harness();
  const state = h.ctx.state;
  const slice = D.seedSafety();
  // Review reproduction: the DM's Stop, withdrawn by the player with the visible id.
  const stop = D.sendSignal(state, slice, "lanterns", "dm", "stop");
  const visibleId = D.activeSignals(state, slice, "lanterns", "player")[0].id;
  for (const token of [undefined, "", "guess-guess-guess-guess", D.sha256(stop.token)])
    assert.throws(
      () => D.withdrawSignal(state, slice, "lanterns", "player", visibleId, token),
      (e) => /Solo chi ha inviato/.test(e.it) && /Only whoever sent/.test(e.en),
    );
  assert.equal(D.activeSignals(state, slice, "lanterns", "dm").length, 1, "the Stop stays");
  D.withdrawSignal(state, slice, "lanterns", "dm", visibleId, stop.token);
  assert.equal(D.activeSignals(state, slice, "lanterns", "dm").length, 0);

  // Stars and wishes: the DM's unsigned entry, the player's signed one.
  const round = D.openRound(state, slice, "lanterns", "dm");
  const unsigned = D.addStarWish(state, slice, "lanterns", "dm", round, { star: "Il ponte" });
  const signed = D.addStarWish(state, slice, "lanterns", "player", round, {
    wish: "Più enigmi",
    signed: true,
  });
  const visible = D.roundsFor(state, slice, "lanterns", "player").at(-1).entries;
  assert.ok(
    visible.every((entry) => !("withdrawHash" in entry)),
    "no hash in the projection",
  );
  assert.throws(
    () => D.withdrawStarWish(state, slice, "lanterns", "player", round, unsigned.id),
    /Solo chi ha scritto/,
  );
  assert.throws(
    () => D.withdrawStarWish(state, slice, "lanterns", "dm", round, signed.id),
    /Solo chi ha scritto/,
  );
  D.withdrawStarWish(state, slice, "lanterns", "player", round, signed.id); // the signer
  D.withdrawStarWish(state, slice, "lanterns", "dm", round, unsigned.id, unsigned.token);
  assert.equal(D.roundsFor(state, slice, "lanterns", "dm").at(-1).entries.length, 0);

  // Through the UI: the sending identity's device keeps the token; the DM's has none.
  UI.perform(h.ctx, h.api, "signal", { kind: "stop" });
  const id = UI.deviceIds("sent", "player")[0];
  h.ctx.role = "dm";
  assert.throws(() => UI.perform(h.ctx, h.api, "withdraw-signal", { id }), /Solo chi ha inviato/);
  assert.equal(h.slice().campaigns.lanterns.signals.length, 1);
  h.ctx.role = "player";
  UI.perform(h.ctx, h.api, "withdraw-signal", { id });
  assert.equal(h.slice().campaigns.lanterns.signals.length, 0);
});

test("raise-hand queue: named, one hand per person, DM gives the floor and reorders", () => {
  const h = harness();
  const state = h.ctx.state;
  state.campaign.members = [
    { id: "player", name: "Giocatore / Player", role: "player" },
    { id: "iria-player", name: "Sara", role: "player" },
    { id: "dm", name: "DM", role: "dm", canOrganize: true },
  ];
  const slice = D.seedSafety();
  const first = D.raiseHand(state, slice, "lanterns", "player");
  assert.throws(() => D.raiseHand(state, slice, "lanterns", "player"), /già la mano alzata/);
  assert.throws(() => D.raiseHand(state, slice, "lanterns", "dm"), /Il DM gestisce/);
  const second = D.raiseHand(state, slice, "lanterns", "iria-player");
  assert.deepEqual(
    D.handQueue(state, slice, "lanterns", "dm").map((h) => h.memberId),
    ["player", "iria-player"],
  );
  assert.throws(
    () => D.moveHand(state, slice, "lanterns", "player", second, "front"),
    /Solo il DM/,
  );
  assert.deepEqual(D.moveHand(state, slice, "lanterns", "dm", second, "front"), [second, first]);
  assert.deepEqual(D.moveHand(state, slice, "lanterns", "dm", second, "back"), [first, second]);
  assert.equal(D.giveFloor(state, slice, "lanterns", "dm", first), "player");
  assert.throws(() => D.lowerHand(state, slice, "lanterns", "player"), /non è alzata/);
  D.lowerHand(state, slice, "lanterns", "iria-player");
  assert.equal(D.handQueue(state, slice, "lanterns", "dm").length, 0);
  assert.equal(UI.memberDisplay(h.ctx, "player"), "Giocatore · Livia");
  assert.equal(UI.memberDisplay(h.ctx, "iria-player"), "Sara");
  assert.equal(UI.memberDisplay(h.ctx, "dm"), "DM");
});

test("stars and wishes: optional, anonymous unless signed, one open collection", () => {
  const h = harness();
  const state = h.ctx.state;
  const slice = D.seedSafety();
  assert.throws(() => D.openRound(state, slice, "lanterns", "player"), /Solo il DM/);
  const round = D.openRound(state, slice, "lanterns", "dm");
  assert.throws(() => D.openRound(state, slice, "lanterns", "dm"), /già una raccolta aperta/);
  assert.throws(
    () => D.addStarWish(state, slice, "lanterns", "player", round, {}),
    /Puoi anche non rispondere/,
  );
  const anonymous = D.addStarWish(state, slice, "lanterns", "player", round, { star: "Il duello" });
  const signed = D.addStarWish(state, slice, "lanterns", "player", round, {
    wish: "Più enigmi",
    signed: true,
  });
  const entries = D.roundsFor(state, slice, "lanterns", "dm").at(-1).entries;
  assert.equal(entries.find((e) => e.id === anonymous.id).signedBy, null);
  assert.equal(entries.find((e) => e.id === signed.id).signedBy, "player");
  D.withdrawStarWish(state, slice, "lanterns", "player", round, anonymous.id, anonymous.token);
  D.closeRound(state, slice, "lanterns", "dm", round);
  assert.throws(
    () => D.addStarWish(state, slice, "lanterns", "player", round, { star: "x" }),
    /chiusa/,
  );
  assert.throws(
    () => D.withdrawStarWish(state, slice, "lanterns", "player", round, signed.id, signed.token),
    /chiusa/,
  );
});

test("marks and personal filters: DM marks a map; only filters that match blur it", () => {
  const h = harness();
  const state = h.ctx.state;
  const slice = D.seedSafety();
  assert.throws(
    () => D.markScene(state, slice, "lanterns", "player", "old-watch", ["gore"]),
    /Solo il DM/,
  );
  assert.throws(
    () => D.markScene(state, slice, "lanterns", "dm", "nowhere", ["gore"]),
    /non trovata/,
  );
  assert.throws(
    () => D.markScene(state, slice, "lanterns", "dm", "old-watch", []),
    /almeno un argomento/,
  );
  const mark = D.markScene(state, slice, "lanterns", "dm", "old-watch", [
    { topic: "gore" },
    "Annegamento prolungato",
  ]);
  assert.deepEqual(D.filteredTopics(state, slice, "lanterns", "player", "old-watch").topics, []);
  D.addLimit(slice, "player", "veils", "Annegamento prolungato");
  D.setContentFilter(slice, "player", { enabled: true });
  assert.deepEqual(D.filteredTopics(state, slice, "lanterns", "player", "old-watch").topics, [
    { custom: "Annegamento prolungato" },
  ]);
  D.setContentFilter(slice, "player", { extra: ["gore"] });
  assert.equal(D.filteredTopics(state, slice, "lanterns", "player", "old-watch").topics.length, 2);
  assert.throws(() => D.setContentFilter(slice, "player", { extra: ["nope"] }), /non valido/);
  // An unrevealed, inactive scene's mark is never disclosed to a player.
  state.scenes.push({ id: "crypt", name: "La cripta", revealed: false, tokens: [], walls: [] });
  D.markScene(state, slice, "lanterns", "dm", "crypt", ["spiders"]);
  assert.deepEqual(
    D.marksFor(state, slice, "lanterns", "player").map((m) => m.sceneId),
    ["old-watch"],
  );
  assert.equal(D.marksFor(state, slice, "lanterns", "dm").length, 2);
  const again = D.markScene(state, slice, "lanterns", "dm", "old-watch", ["gore"]);
  assert.equal(again.id, mark.id);
  assert.equal(again.revision, 2);
  D.unmarkScene(state, slice, "lanterns", "dm", mark.id);
  assert.deepEqual(D.filteredTopics(state, slice, "lanterns", "player", "old-watch").topics, []);
});

test("registry: contributions, slice seeded, private audit for anonymous sends, Undo keeps safety", () => {
  const h = harness();
  const ids = (point) => h.registry.list(point, h.ctx).map((c) => c.id);
  assert.deepEqual(ids("campaign-section"), ["safety"]);
  assert.deepEqual(ids("route"), ["safety-profile"]);
  assert.deepEqual(ids("table-panel"), ["safety"]);
  // B61: a tab of the Table's right sidebar (the old "drawer" placement).
  assert.equal(h.registry.list("table-panel", h.ctx)[0].placement, "sidebar-tab");
  assert.deepEqual(ids("map-layer"), ["safety-veil"]);
  assert.ok(ids("command").includes("safety.hand"));
  h.ctx.role = "dm";
  assert.ok(!ids("command").includes("safety.hand"), "the DM has no raise-hand command");
  h.ctx.role = "player";
  assert.equal(h.slice().campaigns.lanterns.expectations.revision, 1);

  // A gameplay change, then an anonymous Stop, then Undo of the gameplay change.
  h.ctx.commit("Livia si sposta", (draft) => {
    draft.actors.livia.movement = 3;
  });
  const signalId = UI.perform(h.ctx, h.api, "signal", { kind: "stop" });
  const store = h.storeRef();
  const entry = store.state.log.at(-1);
  assert.equal(entry.visibility, "private", "the log hides the anonymous send from others");
  assert.deepEqual(UI.deviceIds("sent", "player"), [signalId]);
  h.ctx.undo();
  assert.equal(store.state.actors.livia.movement, 9, "Undo restored the gameplay change");
  assert.equal(h.slice().campaigns.lanterns.signals.length, 1, "Undo never removes a Stop");
  // Reload keeps it; the DM's log view never shows the private label.
  h.reload();
  assert.equal(h.slice().campaigns.lanterns.signals[0].id, signalId);
  const dmVisible = h
    .storeRef()
    .state.log.filter((l) => l.visibility !== "private" || l.controller === "dm");
  assert.ok(!dmVisible.some((l) => /segnale anonimo/i.test(l.label)));
});

test("offline: shared safety actions are refused, the personal profile still saves", () => {
  const h = harness();
  h.ctx.offline = true;
  assert.throws(() => UI.perform(h.ctx, h.api, "signal", { kind: "stop" }), /senza rete/);
  assert.equal(h.slice().campaigns.lanterns.signals.length, 0);
  UI.perform(h.ctx, h.api, "add-limit", { list: "lines", text: "Ragni" });
  assert.equal(D.profileOf(h.slice(), "player").lines.length, 1);
  assert.equal(h.storeRef().state.log.at(-1).visibility, "private");
});

test("UI: campaign section shows the combined list without names; DM edits the sheet", () => {
  const h = harness();
  UI.perform(h.ctx, h.api, "add-limit", { list: "lines", text: "Ragni" });
  UI.perform(h.ctx, h.api, "add-limit", { list: "veils", text: "Annegamento prolungato" });
  const html = UI.renderCampaignSafety(h.ctx, h.api);
  const combined = html.slice(
    html.indexOf("data-safety-combined"),
    html.indexOf("safety-expectations-title"),
  );
  for (const topic of ["Ragni", "Annegamento prolungato", "Violenza sui bambini", "Tortura"])
    assert.ok(combined.includes(topic), `combined list misses ${topic}`);
  for (const name of ["Livia", "Giocatore", "DM"])
    assert.ok(!combined.includes(name), `name ${name} shown`);
  assert.ok(html.includes("Il DM non ha ancora condiviso"));
  assert.ok(!html.includes('data-safety-dialog="expectations"'), "players cannot edit the sheet");

  h.ctx.role = "dm";
  const dmView = mount(UI.renderCampaignSafety(h.ctx, h.api), (root) =>
    UI.bindSafety(root, h.ctx, h.api),
  );
  dmView.click('[data-safety-dialog="expectations"]');
  const dialog = h.dialogs.at(-1);
  assert.ok(dialog.body.includes('name="tone"') && dialog.body.includes("Mistero e avventura"));
  // Stop and lines/veils are shown ticked and locked; the note says why and what
  // unticking any other tool does.
  assert.match(dialog.body, /value="stop" checked disabled/);
  assert.match(dialog.body, /value="lines" checked disabled/);
  assert.ok(dialog.body.includes("sparisce dalle carte Sicurezza di tutto il gruppo"));
  assert.ok(dialog.body.includes("nessun foglio li nasconde al tavolo"));
  dialog.options.onSubmit(formData([["shared", "on"]]));
  assert.deepEqual(h.slice().campaigns.lanterns.expectations.tools, ["stop", "lines"]);
  dialog.options.onSubmit(
    formData([
      ["tone", "Mistero e avventura"],
      ["welcome", "Intrighi"],
      ["lines", "sexual"],
      ["warnings", "spiders"],
      ["warnings-custom", "Cadaveri, Crolli"],
      ["tools", "stop"],
      ["tools", "pace"],
      ["tools", "hand"],
      ["tools", "stars"],
      ["shared", "on"],
      ["remind", "on"],
      ["sessionWarnings", "Una scena in una cripta."],
    ]),
  );
  const e = h.slice().campaigns.lanterns.expectations;
  assert.equal(e.shared && e.remind, true);
  assert.deepEqual(
    e.warnings.map((w) => w.topic ?? w.custom),
    ["spiders", "Cadaveri", "Crolli"],
  );
  h.ctx.role = "player";
  const playerHtml = UI.renderCampaignSafety(h.ctx, h.api);
  assert.ok(playerHtml.includes("Condivise con il gruppo") && playerHtml.includes("Cadaveri"));
  assert.ok(playerHtml.includes("Sessione zero"), "the outline is shared with the sheet");
});

test("UI handlers: profile add/remove, filters, signals, hand, tabs and reminder", () => {
  const h = harness();
  h.ctx.view = { page: "safety-profile", id: "", tab: "", returnTo: "table" };
  let page = mount(UI.renderProfilePage(h.ctx, h.api), (root) => UI.bindSafety(root, h.ctx, h.api));
  page.set('[data-safety-input="lines"]', "Ragni");
  page.click('[data-safety-act="add-limit"][data-list="lines"]');
  page.set('[data-safety-input="veils"]', "ragni");
  page.click('[data-safety-act="add-limit"][data-list="veils"]');
  assert.equal(h.toasts.at(-1).error, true, "the same topic cannot be a line and a veil");
  page = mount(UI.renderProfilePage(h.ctx, h.api), (root) => UI.bindSafety(root, h.ctx, h.api));
  const own = D.profileOf(h.slice(), "player").lines[0];
  page.click(`[data-safety-act="remove-limit"][data-id="${own.id}"]`);
  assert.equal(D.profileOf(h.slice(), "player").lines.length, 0);
  page = mount(UI.renderProfilePage(h.ctx, h.api), (root) => UI.bindSafety(root, h.ctx, h.api));
  page.set('[data-safety-filter="enabled"]', true);
  page = mount(UI.renderProfilePage(h.ctx, h.api), (root) => UI.bindSafety(root, h.ctx, h.api));
  page.set('[data-safety-filter="extra"][value="gore"]', true);
  assert.deepEqual(D.profileOf(h.slice(), "player").filter, {
    enabled: true,
    extra: ["gore"],
    profanity: false,
    images: false,
  });
  page.click("[data-safety-back]");
  assert.deepEqual(h.navigations.at(-1), { page: "table" });

  h.ctx.view = { page: "table", id: "", tab: "", returnTo: "" };
  let drawer = mount(UI.renderTableDrawer(h.ctx, h.api, { scene: h.ctx.state.scenes[0] }), (root) =>
    UI.bindSafety(root, h.ctx, h.api),
  );
  drawer.click('[data-safety-act="signal"][data-kind="stop"]');
  assert.match(h.toasts.at(-1).text, /forma anonima/);
  drawer.click('[data-safety-act="raise-hand"]');
  drawer = mount(UI.renderTableDrawer(h.ctx, h.api, { scene: h.ctx.state.scenes[0] }), (root) =>
    UI.bindSafety(root, h.ctx, h.api),
  );
  assert.ok(
    drawer.root.querySelector('[data-safety-act="withdraw-signal"]'),
    "sender can withdraw",
  );
  assert.ok(drawer.root.querySelector('[data-safety-act="lower-hand"]'));
  drawer.click('[data-safety-go="profile"]');
  assert.deepEqual(h.navigations.at(-1), { page: "safety-profile", returnTo: "table" });

  // The DM: the X-card overlay names nobody and is the overlay's only content; the
  // named hand reaches the DM through the notification collector (B24), not the overlay.
  h.ctx.role = "dm";
  const overlay = UI.renderOverlay(h.ctx, h.api);
  assert.ok(overlay.includes("safety-xcard") && overlay.includes('role="alert"'));
  assert.ok(!/Livia|Giocatore/.test(overlay), "the X-card never names the sender");
  assert.ok(!overlay.includes("alzato la mano"), "no second surface for the hand");
  assert.ok(
    h.registry
      .notifications(h.ctx)
      .some((n) => n.title.it === "Giocatore · Livia ha alzato la mano"),
  );
  const dmDrawer = mount(
    UI.renderTableDrawer(h.ctx, h.api, { scene: h.ctx.state.scenes[0] }),
    (root) => UI.bindSafety(root, h.ctx, h.api),
  );
  assert.ok(
    !dmDrawer.root.querySelector('[data-safety-act="withdraw-signal"]'),
    "not the DM's signal",
  );
  dmDrawer.click('[data-safety-act="ack-signal"]');
  dmDrawer.click('[data-safety-act="give-floor"]');
  assert.equal(h.slice().campaigns.lanterns.signals.length, 0);
  assert.equal(h.slice().campaigns.lanterns.hands.length, 0);
  assert.equal(UI.renderOverlay(h.ctx, h.api).includes("safety-xcard"), false);

  // The player never sees their own signal announced back; another sender's is, through
  // the collector, without a name; the player's overlay stays empty.
  UI.perform(h.ctx, h.api, "signal", { kind: "pace" });
  assert.ok(
    !h.registry.notifications(h.ctx).some((n) => n.id.startsWith("safety-signal-")),
    "the DM's own Slow down is not echoed",
  );
  h.ctx.role = "player";
  const [pace] = h.registry.notifications(h.ctx).filter((n) => n.id.startsWith("safety-signal-"));
  assert.equal(pace.title.it, "Rallenta · anonimo");
  assert.match(pace.body.it, /meno intensità/);
  assert.equal(pace.by, null);
  assert.equal(UI.renderOverlay(h.ctx, h.api), "");

  // Tabs navigate within the section.
  h.ctx.view = { page: "campaign", id: "", tab: "safety", returnTo: "" };
  const section = mount(UI.renderCampaignSafety(h.ctx, h.api), (root) =>
    UI.bindSafety(root, h.ctx, h.api),
  );
  section.click('[data-safety-tab="after"]');
  assert.deepEqual(h.navigations.at(-1), { page: "campaign", tab: "safety", id: "after" });

  // Reminder: shown once per device/day/revision when joining the Table, then quiet.
  h.ctx.role = "dm";
  UI.perform(h.ctx, h.api, "expectations", { tools: ["stop"], shared: true, remind: true });
  h.ctx.role = "player";
  h.ctx.view = { page: "table", id: "", tab: "", returnTo: "" };
  assert.equal(UI.maybeRemind(h.ctx, h.api), true);
  h.dialogs.at(-1).options.onSubmit(formData([]));
  assert.equal(UI.maybeRemind(h.ctx, h.api), false, "already read today on this device");
  assert.ok(!JSON.stringify(h.slice()).includes("reminded"), "reading leaves no shared trace");
});

test("UI: map veil only for a matching filter, Show and Blur again per visit", () => {
  const h = harness();
  const scene = h.ctx.state.scenes[0];
  const view = { scene, zoom: 1, pan: { x: 0, y: 0 } };
  h.ctx.role = "dm";
  UI.perform(h.ctx, h.api, "mark", { sceneId: scene.id, topics: [{ topic: "gore" }] });
  h.ctx.role = "player";
  assert.equal(UI.renderVeil(h.ctx, h.api, view), "", "no filter, no veil");
  UI.perform(h.ctx, h.api, "filter", { enabled: true, extra: ["gore"] });
  const veil = UI.renderVeil(h.ctx, h.api, view);
  assert.ok(veil.includes("data-safety-veil") && veil.includes("Sangue e ferite esplicite"));
  let rendered = 0;
  h.ctx.render = () => rendered++;
  const handlers = {};
  const button = {
    dataset: { safetyVeilAct: "show", key: veil.match(/data-key="([^"]+)"/)[1] },
    addEventListener: (type, fn) => (handlers[type] = fn),
  };
  const el = {
    querySelectorAll: (s) => (s === "[data-safety-veil-act]" ? [button] : []),
    querySelector: () => null,
  };
  UI.bindVeil(el, h.ctx, { svg: { getScreenCTM: () => ({ a: 0.5 }) } });
  handlers.keydown({ key: "Enter", preventDefault() {}, stopPropagation() {} });
  assert.equal(rendered, 1);
  const shown = UI.renderVeil(h.ctx, h.api, view);
  assert.ok(shown.includes("data-safety-veil-shown") && !shown.includes("data-safety-veil "));
  h.ctx.role = "dm";
  assert.equal(UI.renderVeil(h.ctx, h.api, view), "", "the DM's own filter is off");
});

test("notifications and search: names only where chosen, keywords in both languages", () => {
  const h = harness({ lang: "en" });
  h.ctx.role = "dm";
  UI.perform(h.ctx, h.api, "signal", { kind: "stop" });
  h.ctx.role = "player";
  UI.perform(h.ctx, h.api, "raise-hand");
  // The group is told of a Stop without names (Alchemy, SVC-110).
  const told = h.registry.notifications(h.ctx).find((n) => n.id.startsWith("safety-signal-"));
  assert.deepEqual(told.title, {
    it: "Stop (carta X) · anonimo",
    en: "Stop (X-card) · anonymous",
  });
  assert.match(told.body.en, /The DM has been told; no name is shown/);
  UI.perform(h.ctx, h.api, "signal", { kind: "stop" });
  h.ctx.role = "dm";
  const notes = h.registry.notifications(h.ctx);
  assert.ok(
    !notes.some((n) => n.id.startsWith("safety-signal-")),
    "the DM's pending Stop is the X-card's alone",
  );
  assert.equal(UI.overlayItems(h.ctx, h.api).xcard.length, 1);
  assert.ok(notes.some((n) => /Player · Livia raised a hand/.test(n.title.en)));
  UI.perform(h.ctx, h.api, "open-round");
  h.ctx.role = "player";
  assert.ok(h.registry.notifications(h.ctx).some((n) => n.id.startsWith("safety-round-")));
  const results = h.registry.search(h.ctx, "veils");
  assert.ok(results.some((r) => r.page === "safety-profile"));
  assert.ok(results.some((r) => r.params?.tab === "safety"));
  assert.deepEqual(h.registry.search(h.ctx, "goblin"), []);
});

test("reminder waits for a pending X-card; after Ricevuto it opens", () => {
  const h = harness();
  h.ctx.role = "dm";
  UI.perform(h.ctx, h.api, "expectations", { tools: ["stop"], shared: true, remind: true });
  h.ctx.role = "player";
  UI.perform(h.ctx, h.api, "signal", { kind: "stop" });
  // Review reproduction: the DM joins the Table with a Stop pending.
  h.ctx.role = "dm";
  h.ctx.view = { page: "table", id: "", tab: "", returnTo: "" };
  const dialogs = h.dialogs.length;
  assert.equal(UI.overlayItems(h.ctx, h.api).xcard.length, 1);
  assert.equal(UI.maybeRemind(h.ctx, h.api), false, "no dialog on top of a pending X-card");
  assert.equal(h.dialogs.length, dialogs);
  const drawer = mount(
    UI.renderTableDrawer(h.ctx, h.api, { scene: h.ctx.state.scenes[0] }),
    (root) => UI.bindTableDrawer(root, h.ctx, h.api),
  );
  drawer.click('[data-safety-act="ack-signal"]');
  assert.match(h.toasts.at(-1).text, /sparisce per tutti/);
  assert.equal(UI.overlayItems(h.ctx, h.api).xcard.length, 0);
  assert.equal(UI.maybeRemind(h.ctx, h.api), true, "the reminder follows Ricevuto");
  assert.equal(h.dialogs.at(-1).title, "Prima di giocare");
});

test("feedback: every drawer and section action confirms; closing a collection asks first", () => {
  const h = harness();
  h.ctx.view = { page: "campaign", id: "after", tab: "safety", returnTo: "" };
  const section = (role) => {
    h.ctx.role = role;
    return mount(UI.renderCampaignSafety(h.ctx, h.api), (root) =>
      UI.bindSafety(root, h.ctx, h.api),
    );
  };
  section("dm").click('[data-safety-act="open-round"]');
  const round = D.openRoundOf(h.slice(), "lanterns");
  UI.perform(h.ctx, h.api, "star-wish", { roundId: round.id, star: "Il ponte" });
  h.ctx.role = "player";
  UI.perform(h.ctx, h.api, "star-wish", { roundId: round.id, star: "prova sbagliata" });
  section("player").click('[data-safety-act="withdraw-star"]');
  assert.match(h.toasts.at(-1).text, /Voce ritirata/);
  assert.equal(D.openRoundOf(h.slice(), "lanterns").entries.length, 1, "only the DM's remains");

  // Closing: a confirmation dialog first; cancelling leaves it open.
  section("dm").click('[data-safety-act="close-round"]');
  const confirm = h.dialogs.at(-1);
  assert.equal(confirm.title, "Chiudere la raccolta?");
  assert.equal(confirm.options.cancelLabel, "Lascia aperta");
  assert.ok(D.openRoundOf(h.slice(), "lanterns"), "still open until confirmed");
  confirm.options.onSubmit(formData([]));
  assert.equal(D.openRoundOf(h.slice(), "lanterns"), null);
  assert.match(h.toasts.at(-1).text, /Raccolta chiusa/);

  // Queue: raise, reorder, give the floor; marks: remove.
  h.ctx.state.campaign.members = [
    { id: "player", name: "Giocatore / Player", role: "player" },
    { id: "iria-player", name: "Sara", role: "player" },
    { id: "dm", name: "DM", role: "dm", canOrganize: true },
  ];
  h.ctx.view = { page: "campaign", id: "play", tab: "safety", returnTo: "" };
  section("player").click('[data-safety-act="raise-hand"]');
  assert.match(h.toasts.at(-1).text, /Mano alzata/);
  h.ctx.role = "iria-player";
  UI.perform(h.ctx, h.api, "raise-hand");
  const [first, second] = D.handQueue(h.ctx.state, h.slice(), "lanterns", "dm");
  section("dm").click(`[data-safety-act="move-hand"][data-id="${second.id}"]`);
  assert.equal(h.toasts.at(-1).text, "Sara è ora in testa alla coda.");
  section("dm").click(`[data-safety-act="give-floor"][data-id="${first.id}"]`);
  assert.equal(h.toasts.at(-1).text, "La parola a Giocatore · Livia.");
  UI.perform(h.ctx, h.api, "mark", { sceneId: "old-watch", topics: [{ topic: "gore" }] });
  h.ctx.view = { page: "campaign", id: "", tab: "safety", returnTo: "" };
  section("dm").click('[data-safety-act="unmark"]');
  assert.match(h.toasts.at(-1).text, /Marcatura tolta/);
  h.ctx.view = { page: "safety-profile", id: "", tab: "", returnTo: "" };
  h.ctx.role = "player";
  UI.perform(h.ctx, h.api, "add-limit", { list: "lines", text: "Ragni" });
  mount(UI.renderProfilePage(h.ctx, h.api), (root) => UI.bindSafety(root, h.ctx, h.api)).click(
    '[data-safety-act="remove-limit"]',
  );
  assert.equal(h.toasts.at(-1).text, "Linea tolta dal tuo profilo.");
});

test("notifications: anonymous signals declare no originator and never echo to the sender", () => {
  const h = harness();
  UI.perform(h.ctx, h.api, "signal", { kind: "go" });
  const own = h.registry.notifications(h.ctx).filter((n) => n.id.startsWith("safety-signal-"));
  assert.deepEqual(own, [], "the sender's device lists nothing for its own signal");
  h.ctx.role = "dm";
  const [signal] = h.registry.notifications(h.ctx).filter((n) => n.id.startsWith("safety-signal-"));
  assert.equal(signal.by, null, "declared anonymous, never the committing identity");
});

// ---------------------------------------------------------------------------------
// Second review (24/09): one notification surface, map marks, offline profile edits,
// a stable X-card node.

test("review 2: safety notices use B24's one surface and its settings; the X-card stays", () => {
  const h = harness({ areas: [["notifications", N.register]] });
  const toastsFor = (prefix) =>
    N.notificationSurfaceLog().filter(
      (entry) => entry.kind === "toast" && entry.key.startsWith(prefix),
    );
  const switchTo = (role) => {
    h.ctx.role = role;
    h.registry.emit("role-changed", { role });
  };
  N.observeNotifications(h.ctx, { announce: false });
  // Probe p5 reproduction: the DM turns "Sicurezza del tavolo" off, then a hand is raised.
  switchTo("dm");
  h.registry.setSetting(h.ctx, "notifications.cat-safety", "off");
  switchTo("player");
  UI.perform(h.ctx, h.api, "raise-hand");
  switchTo("dm");
  assert.equal(UI.renderOverlay(h.ctx, h.api), "", "no B27 notice: the setting is respected");
  assert.ok(!N.centreModel(h.ctx).items.some((item) => item.category === "safety"));
  assert.deepEqual(toastsFor("safety-alerts:"), []);
  // "In the centre and as a pop-up": Slow down arrives once, as B24's pop-up.
  h.registry.setSetting(h.ctx, "notifications.cat-safety", "toast");
  switchTo("player");
  UI.perform(h.ctx, h.api, "signal", { kind: "pace" });
  switchTo("dm");
  const pace = toastsFor("safety-alerts:safety-signal-");
  assert.equal(pace.length, 1, "one pop-up for one Slow down");
  assert.equal(UI.renderOverlay(h.ctx, h.api), "", "and no second notice drawn by B27");
  // A Stop: the X-card always shows for the DM, whatever the setting, and B24 does not
  // repeat it; the rest of the group is told through B24 without names.
  h.registry.setSetting(h.ctx, "notifications.cat-safety", "off");
  switchTo("player");
  UI.perform(h.ctx, h.api, "signal", { kind: "stop" });
  switchTo("dm");
  assert.equal(UI.overlayItems(h.ctx, h.api).xcard.length, 1);
  assert.match(UI.renderOverlay(h.ctx, h.api), /safety-xcard/);
  h.registry.setSetting(h.ctx, "notifications.cat-safety", "toast");
  assert.equal(toastsFor("safety-alerts:safety-signal-").length, 1, "still only Slow down");
  assert.ok(
    !N.centreModel(h.ctx).items.some((item) => item.title?.it?.startsWith("Stop")),
    "the DM's Stop is the X-card's alone",
  );
});

test("review 2: choosing another map in 'Marca una mappa' loads that map's own mark", () => {
  const h = harness();
  h.ctx.role = "dm";
  h.storeRef().state.scenes.push({ id: "crypt", name: "La cripta", revealed: false });
  UI.perform(h.ctx, h.api, "mark", { sceneId: "crypt", topics: [{ topic: "spiders" }] });
  UI.perform(h.ctx, h.api, "mark", {
    sceneId: "old-watch",
    topics: [{ topic: "gore" }, { custom: "Crolli" }],
  });
  // The generic dialog opens on the active map, with its own mark.
  UI.openSafetyDialog(h.ctx, h.api, "mark");
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.body, /value="gore" checked/);
  assert.match(dialog.body, /già marcata: Sangue e ferite esplicite, Crolli/);
  // A form double built from the dialog markup; the DM switches to the crypt.
  const inputs = [...dialog.body.matchAll(/<input ([^>]*)>/g)].map(([, attrs]) => ({
    name: /name="([^"]*)"/.exec(attrs)?.[1],
    value: decode(/value="([^"]*)"/.exec(attrs)?.[1] ?? ""),
    checked: / checked/.test(attrs),
  }));
  const status = { textContent: "" };
  const select = {
    value: "old-watch",
    listeners: {},
    addEventListener(type, fn) {
      this.listeners[type] = fn;
    },
  };
  const form = {
    querySelector: (selector) =>
      selector === "[data-safety-mark-scene]"
        ? select
        : selector === "[data-safety-mark-state]"
          ? status
          : (inputs.find((input) => `input[name="${input.name}"]` === selector) ?? null),
    querySelectorAll: (selector) =>
      inputs.filter((input) => `input[name="${input.name}"]` === selector),
  };
  const topicsOf = (id) =>
    D.campaignData(h.slice(), "lanterns").marks.find((mark) => mark.sceneId === id)?.topics ?? [];
  const stored = (id) => topicsOf(id).map((entry) => entry.topic ?? entry.custom);
  UI.bindMarkForm(form, h.ctx, topicsOf);
  select.value = "crypt";
  select.listeners.change();
  const ticked = inputs.filter((input) => input.name === "topics" && input.checked);
  assert.deepEqual(
    ticked.map((input) => input.value),
    ["spiders"],
    "the crypt's Ragni, not the courtyard's gore",
  );
  assert.equal(inputs.find((input) => input.name === "topics-custom").value, "");
  assert.match(status.textContent, /già marcata: Ragni/);
  // Saving what the form now holds keeps the crypt's mark.
  dialog.options.onSubmit(
    formData([["scene", select.value], ...ticked.map((input) => ["topics", input.value])]),
  );
  assert.deepEqual(stored("crypt"), ["spiders"]);
  assert.deepEqual(stored("old-watch"), ["gore", "Crolli"]);
  // A map without a mark says so and starts empty.
  h.storeRef().state.scenes.push({ id: "bridge", name: "Il ponte", revealed: true });
  select.value = "bridge";
  select.listeners.change();
  assert.ok(!inputs.some((input) => input.name === "topics" && input.checked));
  assert.equal(status.textContent, "Questa mappa non è ancora marcata.");
});

test("review 2: an offline profile edit reaches the group only when its device is back online", () => {
  const h = harness();
  const group = () => D.combinedLimits(h.ctx.state, h.slice(), "lanterns");
  const names = (list) => list.map((entry) => entry.topic ?? entry.custom).sort();
  UI.perform(h.ctx, h.api, "add-limit", { list: "veils", text: "Annegamento prolungato" });
  h.ctx.offline = true;
  h.ctx.view = { page: "safety-profile", id: "", tab: "", returnTo: "" };
  const page = mount(UI.renderProfilePage(h.ctx, h.api), (root) =>
    UI.bindSafety(root, h.ctx, h.api),
  );
  page.set('[data-safety-input="lines"]', "Ragni");
  page.click('[data-safety-act="add-limit"][data-list="lines"]');
  assert.equal(
    h.toasts.at(-1).text,
    "Linea aggiunta al tuo profilo. Arriva al gruppo quando torni in rete.",
  );
  const veil = D.profileOf(h.slice(), "player").veils[0];
  UI.perform(h.ctx, h.api, "remove-limit", { list: "veils", id: veil.id });
  // The device has the edit; the group (the DM's combined list, drawer and reminder)
  // still has the version sent before going offline.
  assert.deepEqual(names(D.profileOf(h.slice(), "player").lines), ["spiders"]);
  assert.deepEqual(names(group().lines), ["child-harm"]);
  assert.ok(names(group().veils).includes("Annegamento prolungato"));
  assert.match(UI.renderProfilePage(h.ctx, h.api), /Fino ad allora il gruppo vede/);
  assert.equal(h.storeRef().state.log.at(-1).visibility, "private");
  // Another identity (device) online does not send the player's edit.
  h.ctx.role = "dm";
  h.ctx.offline = false;
  assert.equal(UI.syncProfile(h.ctx, h.api), false);
  assert.deepEqual(names(group().lines), ["child-harm"]);
  // Reload keeps the held version.
  h.reload();
  assert.ok(D.profileHeld(h.slice(), "player"));
  // The player's device back online: the group receives it, once.
  h.ctx.role = "player";
  assert.equal(UI.syncProfile(h.ctx, h.api), true);
  assert.match(h.toasts.at(-1).text, /Di nuovo in rete/);
  assert.deepEqual(names(group().lines), ["child-harm", "spiders"]);
  assert.ok(!names(group().veils).includes("Annegamento prolungato"));
  assert.equal(UI.syncProfile(h.ctx, h.api), false, "nothing left to send");
  // Online edits reach the group at once, as before.
  UI.perform(h.ctx, h.api, "add-limit", { list: "veils", text: "Insetti" });
  assert.ok(names(group().veils).includes("insects") || names(group().veils).includes("Insetti"));
});

test("review 2: the X-card node is replaced only when its content changes", () => {
  const h = harness();
  const writes = [];
  const overlay = {
    className: "",
    hidden: true,
    parentNode: null,
    style: { setProperty() {} },
    classList: { toggle() {} },
    setAttribute() {},
    addEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    contains: () => false,
    set innerHTML(value) {
      writes.push(value);
    },
  };
  const doc = {
    body: {
      insertBefore(el) {
        el.parentNode = doc.body;
      },
    },
    activeElement: null,
    createElement: () => overlay,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
  };
  overlay.ownerDocument = doc;
  const previous = globalThis.document;
  globalThis.document = doc;
  try {
    UI.perform(h.ctx, h.api, "signal", { kind: "stop" });
    h.ctx.role = "dm";
    UI.refreshOverlay(h.ctx, h.api);
    const shown = writes.length;
    assert.match(writes.at(-1), /role="alert"/);
    // Probe p1: on the DM's device, a hand and a Slow down arriving from the player's
    // device (each commit refreshes the overlay) and time passing no longer rebuild it.
    const fromPlayer = (fn) =>
      h.ctx.commit("from the player's device", (draft) => fn(draft, h.api.slice(draft)), {
        undoable: false,
      });
    fromPlayer((draft, slice) => D.raiseHand(draft, slice, "lanterns", "player"));
    fromPlayer((draft, slice) => D.sendSignal(draft, slice, "lanterns", "player", "pace"));
    UI.refreshOverlay(h.ctx, h.api);
    assert.equal(writes.length, shown, "same X-card, same node: no second announcement");
    // Another language is new content.
    h.ctx.lang = "en";
    UI.refreshOverlay(h.ctx, h.api);
    assert.equal(writes.length, shown + 1);
    assert.match(writes.at(-1), /Stop · X-card/);
  } finally {
    globalThis.document = previous;
  }
});
