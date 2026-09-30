// B17 — Table chat, messages and archive: domain rules, registry integration with the real
// store, and the UI handlers (render + bind with a minimal element double). Synthetic data.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { canControlActor } from "../character-access.mjs";
import { esc } from "../ui.mjs";
import * as C from "../chat-domain.mjs";
import * as UI from "../chat.mjs";
import { useSampleClock } from "../sample-clock.mjs";

// The example's real-time stamps as authored (the week of Thursday 17 September 2026,
// sample-clock.mjs): pinned, so these checks never read the real date.
useSampleClock(() => Date.parse("2026-09-21T12:00:00Z"));

afterEach(() => {
  UI.resetChatView();
  UI.setMarkerStorage(null);
});

const NOW = "2026-09-24T20:00:00.000Z";
const later = (minutes) => new Date(Date.parse(NOW) + minutes * 60000).toISOString();
const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

// Real store + registry + this area, with a ctx shaped like the shell's (app.mjs).
function harness({ lang = "it", role = "player" } = {}) {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  UI.setMarkerStorage(null);
  const registry = createRegistry({ logger: null, document: null });
  assert.equal(registry.use("chat", UI.register).status, "built");
  let store = createStore({ storage });
  registry.initState(store.state);
  const toasts = [];
  const navigations = [];
  const dialogs = [];
  const ctx = {
    role,
    lang,
    offline: false,
    view: { page: "table", id: "", tab: "" },
    get state() {
      return store.state;
    },
    esc,
    // Detached-safe like the shell's helpers (areas destructure ctx.t).
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      typeof value === "object" && value
        ? value[ctx.lang] || value.it || value.en || ""
        : String(value ?? ""),
    canControl(actor) {
      return canControlActor(actor, this.role, store.state);
    },
    toast: (text, error = false) => toasts.push({ text, error }),
    navigate: (page, params = {}) => navigations.push({ page, ...params }),
    openSheet: (id, tab) => navigations.push({ page: "characters", id, tab }),
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
  const tableView = () => ({
    scene: store.state.scenes.find((s) => s.id === store.state.activeSceneId),
    selectedActorId: "livia",
    mode: "move",
    zoom: 1,
    pan: { x: 0, y: 0 },
  });
  return {
    ctx,
    registry,
    toasts,
    navigations,
    dialogs,
    slice: () => registry.slice(store.state, "chat"),
    panel: () => decode(registry.slot("table-panel", "log", ctx, tableView())),
    rawPanel: () => registry.slot("table-panel", "log", ctx, tableView()),
    section: (id) => decode(registry.slot("campaign-section", id, ctx)),
    reload() {
      store = createStore({ storage });
      registry.initState(store.state);
    },
    store: () => store,
  };
}
const as = (h, role) => {
  h.ctx.role = role;
  return h;
};
// Composes and stores one message directly through the domain (fixture helper).
function say(state, slice, role, input, at = NOW) {
  return C.postMessage(slice, C.composeMessage(state, role, input, { now: at }));
}

// Minimal element double for bind(): every tag with attributes becomes a node that
// answers attribute selectors and records listeners.
function mount(html) {
  const nodes = [...html.matchAll(/<([a-z0-9]+)\b([^<>]*)>/gi)].map(([, tag, attrsText]) => {
    const attrs = Object.fromEntries(
      [...attrsText.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v ?? "")]),
    );
    const listeners = {};
    const node = {
      tagName: tag.toUpperCase(),
      attrs,
      listeners,
      value: attrs.value ?? "",
      selectionStart: 0,
      selectionEnd: 0,
      scrollTop: 0,
      scrollHeight: 500,
      clientHeight: 300,
      hidden: "hidden" in attrs,
      isConnected: true,
      dataset: Object.fromEntries(
        Object.entries(attrs)
          .filter(([k]) => k.startsWith("data-"))
          .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
      ),
      addEventListener(type, fn) {
        (listeners[type] ??= []).push(fn);
      },
      focus() {
        root.focused = node;
      },
      setSelectionRange(a, b) {
        node.selectionStart = a;
        node.selectionEnd = b;
      },
      matches: (selector) => matches(node, selector),
      closest: (selector) => (matches(node, selector) ? node : null),
      fire(type, event = {}) {
        let prevented = false;
        const e = {
          target: node,
          currentTarget: node,
          key: "",
          preventDefault() {
            prevented = true;
          },
          stopPropagation() {},
          ...event,
        };
        for (const fn of listeners[type] ?? []) fn(e);
        return prevented;
      },
    };
    return node;
  });
  const matches = (node, selector) =>
    selector.split(",").some((part) => {
      const tagMatch = part.trim().match(/^([a-z]+)/i);
      if (tagMatch && node.tagName !== tagMatch[1].toUpperCase()) return false;
      return [...part.trim().matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)].every(
        ([, key, value]) => key in node.attrs && (value === undefined || node.attrs[key] === value),
      );
    });
  const root = {
    focused: null,
    nodes,
    querySelectorAll: (selector) => nodes.filter((node) => matches(node, selector)),
    querySelector: (selector) => nodes.find((node) => matches(node, selector)) ?? null,
    addEventListener() {},
    contains: () => true,
  };
  for (const node of nodes) {
    node.querySelector = root.querySelector;
    node.querySelectorAll = root.querySelectorAll;
    node.contains = () => true;
  }
  return root;
}
const formData = (entries) => {
  const form = new FormData();
  for (const [key, value] of entries) form.append(key, value);
  return form;
};

// ---------------------------------------------------------------------------------

test("seed and normalize: synthetic history, idempotent, strict on versions and whispers", () => {
  const seed = C.seedChat();
  const once = C.normalizeChat(seed, 1);
  assert.deepEqual(C.normalizeChat(once, 1), once);
  assert.equal(once.messages.length, 6);
  assert.equal(once.forum.threads.length, 2);
  assert.ok(once.forum.threads[0].pinned);
  assert.throws(() => C.normalizeChat(seed, 2), /newer version/);
  const tampered = C.normalizeChat(
    {
      messages: [
        { id: "x1", kind: "ic", at: NOW, text: "ok", readers: null },
        { id: "x2", kind: "ic", at: NOW, text: "whisper without readers", to: { type: "dm" } },
        { id: "x3", kind: "evil", at: NOW },
        { id: "x4", kind: "ic", at: NOW, image: { src: "javascript:alert(1)" } },
      ],
    },
    1,
  );
  assert.deepEqual(
    tampered.messages.map((m) => m.id),
    ["x1", "x4"],
  );
  assert.equal(tampered.messages[1].image, null, "only data:image URLs survive");
  assert.equal(C.normalizeChat(null, 0).messages.length, 0);
});

test("speak-as and whisper targets follow assigned control, never the DM's universal control", () => {
  const h = harness();
  const state = h.ctx.state;
  assert.deepEqual(
    C.speakerOptions(state, "player").map((s) => s.id),
    ["actor:livia", "actor:mira"],
  );
  const dm = C.speakerOptions(state, "dm").map((s) => s.id);
  assert.equal(dm[0], "actor:doran", "the DM's own sheets first");
  assert.ok(dm.includes("actor:goblin-1") && dm.includes("actor:livia") && dm.at(-1) === "npc");
  assert.deepEqual(
    C.whisperTargets(state, "player", "livia").map((t) => t.id),
    ["dm", "actor:doran", "actor:mira"],
  );
  assert.deepEqual(C.whisperReaders(state, "player", { type: "actor", actorId: "doran" }), [
    "player",
    "dm",
  ]);
  assert.deepEqual(C.whisperReaders(state, "player", { type: "actor", actorId: "mira" }), [
    "player",
  ]);
  assert.deepEqual(C.whisperReaders(state, "dm", { type: "self" }), ["dm"]);
});

test("message kinds and chat grammar: /ic /ooc /em /w /desc /as /emas /mood /vote /help", () => {
  const h = harness();
  const s = h.ctx.state;
  const livia = { speaker: "actor:livia", mode: "ic", to: "all" };
  const ic = C.composeMessage(s, "player", { ...livia, text: "Restiamo uniti." }, { now: NOW });
  assert.equal(ic.kind, "ic");
  assert.equal(ic.speaker.actorId, "livia");
  const ooc = C.composeMessage(s, "player", { ...livia, text: "/ooc Torno subito" }, { now: NOW });
  assert.equal(ooc.kind, "ooc");
  assert.deepEqual(ooc.speaker, { type: "user", id: "player" });
  const em = C.composeMessage(s, "player", { ...livia, text: "/em apre la porta." }, { now: NOW });
  assert.equal(em.kind, "emote");
  const w = C.composeMessage(
    s,
    "player",
    { ...livia, text: "/w doran Copri la porta" },
    { now: NOW },
  );
  assert.deepEqual(w.readers, ["player", "dm"]);
  assert.equal(w.text, "Copri la porta");
  const mood = C.composeMessage(
    s,
    "player",
    { ...livia, text: "/mood preoccupata Sentite?" },
    { now: NOW },
  );
  assert.equal(mood.mood, "preoccupata");
  const vote = C.composeMessage(s, "player", { ...livia, text: "/vote Entriamo?" }, { now: NOW });
  assert.equal(vote.kind, "vote");
  assert.equal(vote.vote.question, "Entriamo?");
  assert.deepEqual(C.composeMessage(s, "player", { ...livia, text: "/help" }, { now: NOW }), {
    help: true,
  });
  const desc = C.composeMessage(
    s,
    "dm",
    { mode: "ic", text: "/desc Cala la nebbia." },
    { now: NOW },
  );
  assert.equal(desc.kind, "desc");
  assert.deepEqual(desc.speaker, { type: "narrator" });
  const as = C.composeMessage(
    s,
    "dm",
    { mode: "ic", text: '/as "Guardia" Chi va là?' },
    { now: NOW },
  );
  assert.deepEqual(as.speaker, { type: "npc", name: "Guardia" });
  const emas = C.composeMessage(
    s,
    "dm",
    { mode: "ic", text: "/emas Guardia sbarra il passo." },
    { now: NOW },
  );
  assert.equal(emas.kind, "emote");
  assert.throws(
    () => C.composeMessage(s, "player", { ...livia, text: "/desc no" }, { now: NOW }),
    /Solo il DM/,
  );
  // /r opens the Table's free roll prefilled (review fix): never a second dice engine.
  assert.deepEqual(C.composeMessage(s, "player", { ...livia, text: "/r 1d20+5" }, { now: NOW }), {
    roll: { sides: 20, modifier: 5 },
  });
  assert.deepEqual(C.parseRollFormula("d8 − 1"), { sides: 8, modifier: -1 });
  assert.throws(() => C.parseRollFormula("2d6"), /un dado/);
  assert.throws(() => C.parseRollFormula("d7"), /d4, d6/);
  assert.throws(
    () => C.composeMessage(s, "player", { ...livia, text: "/boh" }, { now: NOW }),
    /sconosciuto/,
  );
  assert.throws(
    () => C.composeMessage(s, "player", { ...livia, text: "/w Nessuno ciao" }, { now: NOW }),
    /Nessun destinatario/,
  );
  assert.throws(
    () => C.composeMessage(s, "player", { ...livia, text: "   " }, { now: NOW }),
    /Scrivi un messaggio/,
  );
  assert.throws(
    () =>
      C.composeMessage(
        s,
        "player",
        { speaker: "actor:doran", mode: "ic", text: "x" },
        { now: NOW },
      ),
    /personaggio che puoi interpretare/,
  );
  assert.throws(
    () =>
      C.composeMessage(
        s,
        "dm",
        { speaker: "npc", mode: "ic", npcName: "", text: "x" },
        { now: NOW },
      ),
    /nome del PNG/,
  );
});

test("whispers reach only their readers: stream, archive export, search and notices", () => {
  const h = harness();
  const state = h.ctx.state;
  const slice = C.normalizeChat(C.seedChat());
  const toDoran = say(state, slice, "player", {
    speaker: "actor:livia",
    mode: "ic",
    to: "actor:doran",
    text: "Copri la porta, entro io.",
  });
  const toMira = say(state, slice, "player", {
    speaker: "actor:livia",
    mode: "ic",
    to: "actor:mira",
    text: "Passami la corda di nascosto.",
  });
  const dmToDoran = say(state, slice, "dm", {
    speaker: "actor:doran",
    mode: "desc",
    to: "actor:doran",
    text: "Doran, senti odore di zolfo.",
  });
  const ids = (role) => C.projectStream(state, slice, role).map((i) => i.id);
  assert.ok(ids("dm").includes(toDoran.id), "the DM controls Doran and reads it");
  assert.ok(!ids("dm").includes(toMira.id), "the DM is not included in Livia → Mira");
  assert.ok(!ids("player").includes(dmToDoran.id), "the player never reads DM → Doran");
  assert.ok(ids("player").includes(toMira.id) && ids("player").includes(toDoran.id));
  // The seeded DM → Livia whisper is readable by both.
  assert.ok(ids("player").includes("m6") && ids("dm").includes("m6"));
  const dmExport = C.exportTranscript(state, slice, "dm", { lang: "it" }).text;
  assert.ok(dmExport.includes("Copri la porta") && !dmExport.includes("Passami la corda"));
  const playerExport = C.exportTranscript(state, slice, "player", { lang: "it" }).text;
  assert.ok(!playerExport.includes("zolfo"));
  const hidden = C.exportTranscript(state, slice, "player", { lang: "it", includeWhispers: false });
  assert.ok(!hidden.text.includes("Copri la porta") && !hidden.text.includes("Passami la corda"));
  const found = C.searchChat(state, slice, "dm", "corda");
  assert.deepEqual(
    found.map((r) => r.params.id),
    ["m3", "t2"],
    "the seeded emote and the forum thread, never Livia → Mira",
  );
  assert.equal(C.searchChat(state, slice, "player", "zolfo").length, 0);
  assert.deepEqual(
    C.unreadItems(state, slice, "dm", "2026-01-01T00:00:00.000Z")
      .map((i) => i.id)
      .filter((id) => id === toMira.id),
    [],
  );
});

test("languages (Polyglot): scrambled for a character who does not know them; the DM reads all", () => {
  const h = harness();
  const state = h.ctx.state;
  const slice = C.normalizeChat(C.seedChat());
  const text = "Fermi! Chi vi manda alla torre?";
  const guard = say(state, slice, "dm", {
    speaker: "npc",
    npcName: "Guardia",
    mode: "ic",
    language: "elvish",
    text,
  });
  const asLivia = C.projectMessage(state, guard, "player", { perspective: "livia" });
  assert.equal(asLivia.text, text);
  assert.equal(asLivia.languageName, "Elfico");
  const asMira = C.projectMessage(state, guard, "player", { perspective: "mira", lang: "en" });
  assert.ok(asMira.scrambled);
  assert.notEqual(asMira.text, text);
  assert.equal(asMira.text.length, text.length);
  for (const word of ["Fermi", "manda", "torre"]) assert.ok(!asMira.text.includes(word));
  assert.equal(asMira.languageName, "Elvish");
  const dm = C.projectMessage(state, guard, "dm");
  assert.equal(dm.text, text);
  assert.deepEqual(dm.understoodBy, ["Livia"]);
  assert.equal(
    C.projectMessage(state, guard, "player", { perspective: "mira" }).understoodBy,
    null,
  );
  assert.equal(
    C.scramble(text, guard.id + ":elvish"),
    C.scramble(text, guard.id + ":elvish"),
    "stable across renders",
  );
  // Speakers use only languages they know; built characters' own lists win.
  assert.throws(
    () =>
      C.composeMessage(
        state,
        "player",
        { speaker: "actor:livia", mode: "ic", language: "goblin", text: "x" },
        { now: NOW },
      ),
    /non conosce/,
  );
  assert.deepEqual(C.knownLanguages({ actors: { x: { languages: ["common", "orc"] } } }, "x"), [
    "common",
    "orc",
  ]);
  assert.equal(C.knownLanguages({ actors: { y: {} } }, "y"), null, "nothing is invented");
  // Scrambled messages are not searchable by their content.
  assert.equal(C.searchChat(state, slice, "player", "manda", { perspective: "mira" }).length, 0);
  assert.equal(C.searchChat(state, slice, "player", "manda", { perspective: "livia" }).length, 1);
});

test("audible range (Theatre!): only identities with a character in range read it", () => {
  const h = harness();
  const state = h.ctx.state;
  const slice = C.normalizeChat(C.seedChat());
  const base = { speaker: "actor:goblin-1", mode: "ic", to: "all" };
  const whisper = say(state, slice, "dm", {
    ...base,
    range: "whisper",
    text: "Svegliati, idiota.",
  });
  assert.deepEqual(whisper.readers, ["dm"]);
  assert.equal(C.projectMessage(state, whisper, "player"), null);
  const shout = say(state, slice, "dm", { ...base, range: "shout", text: "Intrusi!" });
  assert.deepEqual(shout.readers.sort(), ["dm", "player"]);
  assert.deepEqual(shout.range.heard.sort(), ["doran", "livia", "mira"]);
  assert.equal(shout.range.source.kind, "app-default");
  assert.throws(
    () =>
      C.composeMessage(
        state,
        "player",
        { speaker: "actor:livia", mode: "ic", range: "talk", text: "x" },
        { now: NOW },
      ),
    /Solo il DM/,
  );
  assert.throws(
    () =>
      C.composeMessage(
        state,
        "dm",
        { ...base, to: "actor:livia", range: "talk", text: "x" },
        { now: NOW },
      ),
    /sussurro/,
  );
});

test("moderation: DM hides and shows; deletion wipes content and leaves a trace", () => {
  const h = harness();
  const state = h.ctx.state;
  const slice = C.normalizeChat(C.seedChat());
  const m = say(state, slice, "player", {
    speaker: "actor:livia",
    mode: "ic",
    text: "Spoiler del modulo!",
  });
  assert.throws(() => C.setHidden(slice, m.id, "player", true), /Solo il DM/);
  C.setHidden(slice, m.id, "dm", true);
  assert.ok(C.projectMessage(state, m, "player").hidden, "the author sees a trace");
  const other = say(state, slice, "dm", {
    speaker: "npc",
    npcName: "Guardia",
    mode: "ic",
    text: "Segreto",
  });
  C.setHidden(slice, other.id, "dm", true);
  assert.equal(C.projectMessage(state, other, "player"), null, "other players see nothing");
  C.setHidden(slice, other.id, "dm", false);
  assert.ok(C.projectMessage(state, other, "player"));
  assert.throws(() => C.removeMessage(slice, other.id, "player", "", NOW), /solo i tuoi/);
  C.removeMessage(slice, m.id, "dm", "spoiler", later(1));
  const trace = C.projectMessage(state, m, "player");
  assert.equal(trace.text, "");
  assert.deepEqual([trace.removed.byName, trace.removed.reason], ["DM", "spoiler"]);
  assert.equal(m.text, "", "content is gone from the stored message");
  assert.throws(() => C.removeMessage(slice, m.id, "dm", "", NOW), /già eliminato/);
  const own = say(state, slice, "player", { speaker: "actor:livia", mode: "ooc", text: "refuso" });
  C.removeMessage(slice, own.id, "player", "", NOW);
  assert.equal(C.projectMessage(state, own, "dm").removed.byName, "Giocatore");
});

test("votes (FG /vote): one ballot per identity, change until closed, outcome", () => {
  const h = harness();
  const state = h.ctx.state;
  const slice = C.normalizeChat(C.seedChat());
  const v = say(state, slice, "player", {
    kind: "vote",
    mode: "ooc",
    text: "Entriamo nella cripta stanotte?",
  });
  C.castVote(slice, v.id, "player", "no");
  C.castVote(slice, v.id, "player", "yes");
  C.castVote(slice, v.id, "dm", "yes");
  assert.deepEqual(C.voteTally(v.vote), { yes: 2, no: 0, total: 2, outcome: null });
  assert.throws(() => C.castVote(slice, v.id, "dm", "maybe"), /non valida/);
  C.closeVote(slice, v.id, "dm", NOW);
  assert.equal(C.voteTally(v.vote).outcome, "yes");
  assert.throws(() => C.castVote(slice, v.id, "player", "no"), /chiuso/);
  const tie = say(state, slice, "dm", { kind: "vote", mode: "ooc", text: "Pausa?" });
  C.castVote(slice, tie.id, "player", "yes");
  C.castVote(slice, tie.id, "dm", "no");
  assert.throws(() => C.closeVote(slice, tie.id, "player", NOW), /Solo chi ha aperto/);
  C.closeVote(slice, tie.id, "dm", NOW);
  assert.equal(C.projectMessage(state, tie, "player").vote.outcome, "tie");
  assert.throws(
    () => C.composeMessage(state, "player", { kind: "vote", to: "dm", text: "x" }, { now: NOW }),
    /tutto il gruppo/,
  );
});

test("share to chat (Shard): Burning Hands keeps its SRD 5.2.1 source; items too", () => {
  const h = harness();
  const state = h.ctx.state;
  const entries = C.shareableEntries(state.actors.livia).map((e) => e.id);
  assert.ok(entries.includes("spell:sample-burning-hands") && entries.includes("item:rope"));
  const card = C.buildCard(state, "player", "livia", "spell:sample-burning-hands");
  assert.equal(card.srdId, "srd2024:spell:burning-hands");
  assert.deepEqual(
    [card.source.revision, card.source.en.pages, card.source.it.pages],
    ["5.2.1", [114], [163]],
  );
  const it = C.cardLines(card, "it");
  assert.equal(it.title, "Mani brucianti");
  assert.equal(it.subtitle, "Incantesimo di 1º livello · Invocazione");
  assert.ok(it.facts.some(([k, v]) => k === "Gittata" && v.includes("cono 4,5 m")));
  assert.ok(it.facts.some(([k, v]) => k === "Danni" && v === "3d6 fuoco"));
  assert.equal(C.cardLines(card, "en").title, "Burning Hands");
  assert.throws(() => C.buildCard(state, "player", "doran", "item:x"), /tue schede/);
  const rope = C.cardLines(C.buildCard(state, "player", "livia", "item:rope"), "it");
  assert.deepEqual(rope.facts, [["Peso", "2,5 kg"]]);
  const message = C.composeMessage(
    state,
    "player",
    { card, mode: "ic", text: "Attenti al cono" },
    { now: NOW },
  );
  assert.equal(message.kind, "share");
  assert.equal(message.speaker.actorId, "livia");
});

test("the game log as cards: visible rolls, private rolls hidden, free-roll label, own labels skipped", () => {
  const h = harness();
  const state = structuredClone(h.ctx.state);
  const roll = (fields) => ({
    source: "combat",
    kind: "attack",
    actorName: "Livia",
    actionName: { it: "Dardo di fuoco", en: "Fire Bolt" },
    dice: [{ count: 1, sides: 20 }],
    values: [14],
    modifier: 5,
    total: 19,
    mode: "digital",
    ...fields,
  });
  state.log = [
    {
      id: "a",
      time: later(1),
      label: "Attacco",
      controller: "player",
      kind: "change",
      visibility: "shared",
      rolls: [roll({ visibility: "shared", owner: "player", controller: "player" })],
    },
    {
      id: "b",
      time: later(2),
      label: "Goblin",
      controller: "dm",
      kind: "change",
      visibility: "shared",
      rolls: [
        roll({ actorName: "Sentinella", visibility: "private", owner: "dm", controller: "dm" }),
      ],
    },
    {
      id: "c",
      time: later(3),
      label: "Livia · d20: 12 − 1 = 11 (fisico)",
      controller: "player",
      kind: "change",
      visibility: "shared",
      rolls: [],
    },
    {
      id: "d",
      time: later(4),
      label: C.LABEL_PREFIX + "messaggio",
      controller: "player",
      kind: "change",
      visibility: "shared",
      rolls: [],
    },
    {
      id: "e",
      time: later(5),
      label: "Livia si sposta",
      controller: "player",
      kind: "change",
      visibility: "shared",
      rolls: [],
    },
    {
      id: "f",
      time: later(6),
      label: "Nota privata del DM",
      controller: "dm",
      kind: "change",
      visibility: "private",
      rolls: [],
    },
  ];
  const player = C.projectLog(state, "player", { lang: "it" });
  assert.deepEqual(
    player.map((i) => i.id),
    ["log:a", "log:b", "log:c", "log:e"],
  );
  // A shared change keeps its visible label (as in the core log); its private roll does not.
  assert.deepEqual([player[1].type, player[1].rolls], ["event", undefined]);
  player.splice(1, 1);
  assert.equal(player[0].rolls[0].actionName, "Dardo di fuoco");
  assert.deepEqual(
    [
      player[1].rolls[0].mode,
      player[1].rolls[0].modifier,
      player[1].rolls[0].total,
      player[1].rolls[0].parsedFromLabel,
    ],
    ["physical", -1, 11, true],
  );
  const dm = C.projectLog(state, "dm", { lang: "en" });
  assert.deepEqual(
    dm.map((i) => i.id),
    ["log:a", "log:b", "log:c", "log:e", "log:f"],
  );
  assert.equal(dm[0].rolls[0].kindName, "Attack");
  // Others' rolls are unread for the DM; the DM's private roll never reaches the player.
  const slice = C.normalizeChat(C.seedChat());
  assert.deepEqual(
    C.unreadItems(state, slice, "dm", NOW)
      .filter((i) => i.type === "rolls")
      .map((i) => i.id),
    ["log:a", "log:c"],
  );
  assert.deepEqual(
    C.unreadItems(state, slice, "player", NOW).filter((i) => i.type === "rolls"),
    [],
  );
  assert.equal(C.parseFreeRoll("Mira · d6: 4 + 0 = 4 (digital)").actorName, "Mira");
  assert.equal(C.parseFreeRoll("Livia si sposta"), null);
});

test("archive: typed confirmation, DM only, permanent with a trace; log before it leaves the chat", () => {
  const h = harness();
  const state = structuredClone(h.ctx.state);
  state.log = [
    {
      id: "old",
      time: "2026-09-17T19:30:00.000Z",
      label: "Livia · d20: 12 + 0 = 12 (digitale)",
      controller: "player",
      kind: "change",
      visibility: "shared",
      rolls: [],
    },
  ];
  const slice = C.normalizeChat(C.seedChat());
  assert.throws(() => C.clearArchive(slice, "player", "ELIMINA CHAT", NOW), /Solo il DM/);
  assert.throws(() => C.clearArchive(slice, "dm", "elimina chat", NOW), /esattamente/);
  assert.equal(C.clearArchive(slice, "dm", "DELETE CHAT", NOW), 6);
  const stream = C.projectStream(state, slice, "player", { lang: "it" });
  assert.equal(stream.length, 1);
  assert.equal(stream[0].kind, "system");
  assert.match(stream[0].text, /svuotato l’archivio della chat \(6 messaggi\)/);
  assert.equal(slice.clearedAt, NOW);
  const exported = C.exportTranscript(state, slice, "dm", { lang: "en", now: NOW });
  assert.equal(exported.count, 1);
  assert.match(exported.text, /Exported by: DM/);
});

test("forum (Roll20): threads, replies, sticky/sink order, traces and unread posts", () => {
  const h = harness();
  const state = h.ctx.state;
  const slice = C.normalizeChat(C.seedChat());
  const thread = C.createThread(
    slice,
    "player",
    { title: "Resoconto di giovedì", text: "Chi lo scrive?" },
    later(1),
  );
  assert.equal(thread.id, "t4");
  C.replyThread(slice, "dm", thread.id, "Lo scrivo io.", later(2));
  assert.throws(() => C.setThreadFlag(slice, "player", thread.id, "pinned", true), /Solo il DM/);
  C.setThreadFlag(slice, "dm", "t2", "sunk", true);
  const order = C.projectThreads(state, slice, "player").map((t) => t.id);
  assert.deepEqual(order, ["t1", "t4", "t2"], "pinned first, sunk last");
  C.setThreadFlag(slice, "dm", thread.id, "pinned", true);
  assert.deepEqual(
    C.projectThreads(state, slice, "player")
      .slice(0, 2)
      .map((t) => t.id),
    ["t4", "t1"],
  );
  assert.deepEqual(
    C.unreadPosts(state, slice, "player", NOW).map((p) => p.text),
    ["Lo scrivo io."],
  );
  C.removePost(slice, "dm", thread.id, thread.posts[1].id, "doppio", later(3));
  assert.equal(C.projectThreads(state, slice, "player")[0].posts[1].removed.reason, "doppio");
  assert.throws(() => C.removeThread(slice, "player", "t1", "", NOW), /solo le tue/);
  C.removeThread(slice, "dm", "t2", "chiusa", NOW);
  const removed = C.projectThreads(state, slice, "player").find((t) => t.id === "t2");
  assert.deepEqual([removed.title, removed.posts.length, removed.removed.byName], ["", 0, "DM"]);
  assert.throws(() => C.replyThread(slice, "player", "t2", "x", NOW), /rimossa/);
  assert.throws(() => C.createThread(slice, "player", { title: "", text: "x" }, NOW), /titolo/);
});

test("UI: the composer sends, keeps the draft when offline or invalid, and shows /help", () => {
  const h = harness();
  const d = UI.composerDraft(h.ctx);
  assert.deepEqual([d.mode, d.speaker, d.to], ["ic", "actor:livia", "all"]);
  d.text = "Qualcuno l’ha riaccesa.";
  UI.sendDraft(h.ctx);
  const sent = h.slice().messages.at(-1);
  assert.deepEqual(
    [sent.kind, sent.speaker.actorId, sent.text],
    ["ic", "livia", "Qualcuno l’ha riaccesa."],
  );
  assert.equal(d.text, "");
  assert.ok(h.store().state.log.at(-1).label.startsWith(C.LABEL_PREFIX));
  // Offline: nothing is sent and the text stays in the composer with the reason.
  h.ctx.offline = true;
  d.text = "Da inviare dopo";
  UI.sendDraft(h.ctx);
  assert.equal(h.slice().messages.at(-1).id, sent.id);
  assert.equal(d.text, "Da inviare dopo");
  assert.match(d.error, /senza rete/);
  h.ctx.offline = false;
  UI.sendDraft(h.ctx);
  assert.equal(h.slice().messages.at(-1).text, "Da inviare dopo");
  d.text = "/help";
  UI.sendDraft(h.ctx);
  assert.equal(d.text, "");
  assert.ok(h.panel().includes('id="chat-help" >'), "help list opens");
  d.text = "/boh";
  UI.sendDraft(h.ctx);
  assert.equal(d.text, "/boh");
  assert.match(h.panel(), /Comando \/boh sconosciuto/);
  // Whispers are private commits: their audit label stays with the sender.
  d.text = "/w Mira Passami la corda";
  UI.sendDraft(h.ctx);
  assert.equal(h.store().state.log.at(-1).visibility, "private");
  assert.deepEqual(h.slice().messages.at(-1).readers, ["player"]);
});

test("UI: the panel renders only permitted projections, per role and language", () => {
  const h = harness();
  as(h, "dm");
  const d = UI.composerDraft(h.ctx);
  Object.assign(d, {
    mode: "ic",
    speaker: "npc",
    npcName: "Guardia",
    language: "elvish",
    text: "Chi vi manda alla torre?",
  });
  UI.sendDraft(h.ctx);
  Object.assign(d, { mode: "desc", to: "actor:doran", text: "Doran, senti odore di zolfo." });
  UI.sendDraft(h.ctx);
  const dmPanel = h.panel();
  assert.ok(dmPanel.includes("Chi vi manda alla torre?") && dmPanel.includes("Capiscono: Livia"));
  assert.ok(dmPanel.includes("zolfo"));
  assert.ok(dmPanel.includes("Narrazione") && dmPanel.includes('value="desc"'));
  as(h, "player");
  let panel = h.panel();
  assert.ok(panel.includes("Chi vi manda alla torre?"), "Livia knows Elvish");
  assert.ok(!panel.includes("zolfo"), "DM → Doran never reaches the player's markup");
  UI.composerDraft(h.ctx).speaker = "actor:mira";
  panel = h.panel();
  assert.ok(!panel.includes("Chi vi manda alla torre?"), "Mira reads scrambled text only");
  assert.ok(panel.includes("Mira non conosce questa lingua: Elfico"));
  assert.ok(!panel.includes('value="desc"'), "no narration mode for players");
  h.ctx.lang = "en";
  assert.ok(h.panel().includes("Mira does not know this language: Elvish"));
  assert.ok(h.panel().includes("Log and chat"));
});

test("UI: notices, badge category and read markers", async () => {
  const h = harness();
  as(h, "dm");
  const before = UI.collectNotifications(h.ctx);
  assert.deepEqual(before, [], "seeded history is not announced");
  // Markers compare ISO instants: the next message is strictly later than them.
  await new Promise((resolve) => setTimeout(resolve, 5));
  as(h, "player");
  const d = UI.composerDraft(h.ctx);
  d.text = "Io vado avanti.";
  UI.sendDraft(h.ctx);
  as(h, "dm");
  const m = h.slice().messages.at(-1);
  const notes = UI.collectNotifications(h.ctx);
  assert.deepEqual(
    notes.map((n) => [n.category, n.title]),
    [["table-log", "Livia"]],
  );
  assert.equal(notes[0].target.page, "table");
  assert.equal(notes[0].body, "Io vado avanti.");
  // The author never gets a notice for their own message.
  as(h, "player");
  assert.equal(UI.collectNotifications(h.ctx).length, 0);
  // Reading the open log (bind) marks it read for this identity only.
  as(h, "dm");
  const root = mount(h.rawPanel());
  h.registry.get("table-panel", "log").bind(root, h.ctx);
  assert.equal(UI.collectNotifications(h.ctx).length, 0);
  assert.equal(m.id, h.slice().messages.at(-1).id);
});

test("UI: bind routes Enter, Shift+Enter, ArrowUp recall, mode and whisper selection", () => {
  const h = harness();
  const bind = () => {
    const root = mount(h.rawPanel());
    h.registry.get("table-panel", "log").bind(root, h.ctx);
    return root;
  };
  let root = bind();
  let text = root.querySelector("[data-chat-text]");
  assert.equal(root.focused, text, "opening the log focuses the composer");
  text.value = "Prima riga";
  text.fire("input");
  assert.equal(
    text.fire("keydown", { key: "Enter", shiftKey: true }),
    false,
    "Shift+Enter keeps writing",
  );
  assert.equal(h.slice().messages.length, 6);
  assert.equal(text.fire("keydown", { key: "Enter" }), true);
  assert.equal(h.slice().messages.at(-1).text, "Prima riga");
  root = bind();
  text = root.querySelector("[data-chat-text]");
  text.fire("keydown", { key: "ArrowUp" });
  assert.equal(text.value, "Prima riga", "↑ recalls the last sent message");
  const emote = root.querySelector('input[value="emote"]');
  emote.fire("change");
  assert.equal(UI.composerDraft(h.ctx).mode, "emote");
  root = bind();
  const to = root.querySelector("[data-chat-to]");
  to.fire("change", { target: { value: "actor:doran" } });
  assert.equal(UI.composerDraft(h.ctx).to, "actor:doran");
  root = bind();
  root.querySelector("[data-chat-text]").value = "si avvicina a Doran.";
  root.querySelector("[data-chat-text]").fire("input");
  root.querySelector("[data-chat-composer]").fire("submit");
  const last = h.slice().messages.at(-1);
  assert.deepEqual(
    [last.kind, last.to.actorId, last.readers],
    ["emote", "doran", ["player", "dm"]],
  );
  // The Share, Vote and Snapshot dialogs open from the composer.
  UI.openVote(h.ctx);
  h.dialogs.at(-1).options.onSubmit(formData([["question", "Riposiamo qui?"]]));
  assert.equal(h.slice().messages.at(-1).kind, "vote");
  UI.openShare(h.ctx);
  assert.match(decode(h.dialogs.at(-1).body), /Mani brucianti/);
  assert.throws(() => h.dialogs.at(-1).options.onSubmit(formData([])), /Choose an entry/);
  UI.composerDraft(h.ctx).to = "all";
  h.dialogs.at(-1).options.onSubmit(
    formData([
      ["entry", "spell:sample-burning-hands"],
      ["comment", "Occhio al cono"],
    ]),
  );
  const card = h.slice().messages.at(-1);
  assert.deepEqual(
    [card.kind, card.card.srdId, card.text],
    ["share", "srd2024:spell:burning-hands", "Occhio al cono"],
  );
});

test("UI: snapshot shows the players' view, never hidden tokens", () => {
  const h = harness();
  as(h, "dm");
  const state = h.store().state;
  state.scenes[0].tokens.find((t) => t.actorId === "goblin-2").hidden = true;
  const snap = UI.snapshotSource(h.ctx);
  const svg = decodeURIComponent(snap.src.slice(snap.src.indexOf(",") + 1));
  assert.ok(svg.includes(">Sentinella<") && svg.includes(">Livia<"));
  assert.ok(!svg.includes("Esploratore"), "the hidden token is not in the image");
  assert.equal(snap.sceneName, "Il cortile dell’osservatorio");
  UI.openSnapshot(h.ctx);
  h.dialogs.at(-1).options.onSubmit(formData([["caption", "Prima della battaglia"]]));
  const posted = h.slice().messages.at(-1);
  assert.deepEqual(
    [posted.kind, posted.text, posted.snapshot.sceneId],
    ["snapshot", "Prima della battaglia", "old-watch"],
  );
  as(h, "player");
  assert.ok(h.panel().includes("Prima della battaglia"));
});

test("registry integration: the chat survives gameplay Undo and reload; reset reseeds", () => {
  const h = harness();
  h.ctx.commit("Livia si sposta", (draft) => {
    draft.actors.livia.movement = 6;
  });
  const d = UI.composerDraft(h.ctx);
  d.text = "Dopo lo spostamento.";
  UI.sendDraft(h.ctx);
  h.ctx.undo();
  assert.equal(h.store().state.actors.livia.movement, 9, "gameplay Undo applied");
  assert.equal(h.slice().messages.at(-1).text, "Dopo lo spostamento.", "chat preserved");
  h.reload();
  assert.equal(h.slice().messages.at(-1).text, "Dopo lo spostamento.");
  assert.ok(h.section("chat-archive").includes("Dopo lo spostamento."));
  assert.ok(h.section("chat-forum").includes("Calendario e regole del tavolo"));
  // Campaign search and palette commands.
  const results = h.registry.search(h.ctx, "spostamento");
  assert.deepEqual(
    results.map((r) => [r.page, r.params.tab]),
    [["campaign", "chat-archive"]],
  );
  h.registry.run(h.registry.get("command", "chat.forum"), h.ctx);
  assert.deepEqual(h.navigations.at(-1), { page: "campaign", tab: "chat-forum" });
  h.store().reset();
  h.registry.initState(h.store().state);
  assert.equal(h.slice().messages.length, 6);
});

test("names come from the published member record (account/members areas)", () => {
  const state = {
    campaign: {
      id: "lanterns",
      members: [
        { id: "player", name: "Chiara", role: "player" },
        { id: "dm", name: "Marco il Custode", role: "dm" },
        { id: "guest", name: { it: "Ospite", en: "Guest" }, role: "player" },
      ],
    },
  };
  assert.equal(C.memberName(state, "player"), "Chiara");
  assert.equal(C.memberName(state, "dm"), "Marco il Custode");
  assert.equal(C.memberName(state, "guest", "en"), "Guest");
  assert.equal(C.memberName({ campaign: { id: "x" } }, "dm"), "DM");
  assert.equal(C.memberName({ campaign: { id: "x" } }, "player", "en"), "Player");
});

test("closed-log notices: a personal choice, never doubled by the notification centre", () => {
  const h = harness();
  assert.equal(UI.closedLogNotices(h.ctx), true, "on by default");
  h.registry.setSetting(h.ctx, "chat-notices.closed-log", false);
  assert.equal(UI.closedLogNotices(h.ctx), false);
  h.registry.setSetting(h.ctx, "chat-notices.closed-log", true);
  // A stand-in for the B24 centre's chat category (same section and field ids).
  const centre = (registry) =>
    registry.add("settings", {
      id: "notifications",
      label: { it: "Notifiche", en: "Notifications" },
      scope: "personal",
      fields: [
        {
          id: "cat-chat",
          label: { it: "Chat", en: "Chat" },
          type: "choice",
          default: "tray",
          options: ["toast", "tray", "off"].map((value) => ({
            value,
            label: { it: value, en: value },
          })),
        },
      ],
    });
  assert.equal(h.registry.use("notifications", centre).status, "built");
  assert.equal(UI.closedLogNotices(h.ctx), true, "centre only: the Table still notifies");
  h.registry.setSetting(h.ctx, "notifications.cat-chat", "toast");
  assert.equal(UI.closedLogNotices(h.ctx), false, "the centre pops it: no second notice");
  h.registry.setSetting(h.ctx, "notifications.cat-chat", "off");
  assert.equal(UI.closedLogNotices(h.ctx), false);
});

// ---------------------------------------------------------------- review fixes (B17)

test("review: the DM's language note never names private or other-campaign sheets", () => {
  const h = harness();
  const state = structuredClone(h.ctx.state);
  const base = { kind: "character", owner: "player", className: "Guerriera", level: 1 };
  // A private sheet made with the guided builder, and a sheet of another campaign.
  state.actors.neris = {
    ...base,
    id: "neris",
    name: "Neris",
    visibility: "private",
    campaignIds: [],
    languages: ["common", "elvish", "dwarvish"],
  };
  state.actors.oswin = {
    ...base,
    id: "oswin",
    name: "Oswin",
    visibility: "campaign",
    campaignIds: ["other-campaign"],
    languages: ["common", "elvish"],
  };
  const slice = C.normalizeChat(C.seedChat());
  const guard = say(state, slice, "dm", {
    speaker: "npc",
    npcName: "Guardia",
    mode: "ic",
    language: "elvish",
    text: "Fermi, chi va là?",
  });
  assert.deepEqual(C.understoodBy(state, "elvish"), ["Livia"]);
  assert.deepEqual(C.projectMessage(state, guard, "dm").understoodBy, ["Livia"]);
  // Connected to this campaign, the same sheet is named.
  state.actors.oswin.campaignIds = ["lanterns"];
  assert.deepEqual(C.understoodBy(state, "elvish").sort(), ["Livia", "Oswin"]);
});

test("review: chat images and snapshots have a storage budget; a refusal keeps the draft", () => {
  const h = harness();
  const png = (chars) => ({ src: "data:image/png;base64," + "A".repeat(chars), name: "x.png" });
  const d = UI.composerDraft(h.ctx);
  // Two images of about 440 KB fit; the third would pass the chat's 1.5-million budget.
  for (const n of [1, 2]) {
    d.text = `Mappa ${n}`;
    d.image = png(600_000);
    UI.sendDraft(h.ctx);
    assert.equal(d.error, "", `image ${n} sent`);
  }
  assert.equal(C.attachmentsUsed(h.slice()), 1_200_000 + 2 * "data:image/png;base64,".length);
  const before = h.slice().messages.length;
  d.text = "Mappa 3";
  d.image = png(600_000);
  UI.sendDraft(h.ctx);
  assert.equal(h.slice().messages.length, before, "nothing stored");
  assert.match(d.error, /Spazio della chat esaurito: immagini e istantanee occupano 1,1 MB/);
  assert.equal(d.text, "Mappa 3", "the draft stays");
  assert.ok(d.image, "the image stays attached");
  // Deleting an old image frees its space (the content is gone, the trace stays).
  as(h, "player");
  const first = h.slice().messages.find((m) => m.text === "Mappa 1");
  h.ctx.commit(C.LABEL_PREFIX + "x", (draft) =>
    C.removeMessage(h.registry.slice(draft, "chat"), first.id, "player", "", NOW),
  );
  UI.sendDraft(h.ctx);
  assert.equal(d.error, "");
  assert.equal(h.slice().messages.at(-1).text, "Mappa 3");
  // The whole saved state keeps room for the rest of the game, in both languages.
  const big = { ...h.ctx.state, filler: "x".repeat(C.STATE_ROOM) };
  assert.throws(
    () => C.checkAttachmentRoom(big, { messages: [] }, 10),
    (error) => /Memoria locale quasi piena/.test(error.it) && /Local storage/.test(error.en),
  );
  assert.doesNotThrow(() => C.checkAttachmentRoom(big, { messages: [] }, 0), "text only");
  // A single image above 500 KB is refused by the per-file limit.
  assert.throws(
    () =>
      C.composeMessage(
        h.ctx.state,
        "player",
        { speaker: "actor:livia", mode: "ic", text: "", image: png(700_000) },
        { now: NOW },
      ),
    /massimo 500 KB/,
  );
});

test("review: notices and notifications open the log through the Table route, once", async () => {
  const h = harness();
  as(h, "dm");
  assert.deepEqual(UI.collectNotifications(h.ctx), []);
  as(h, "player");
  await new Promise((resolve) => setTimeout(resolve, 5));
  const d = UI.composerDraft(h.ctx);
  d.text = "Aspettatemi al portone.";
  UI.sendDraft(h.ctx);
  as(h, "dm");
  const [note] = UI.collectNotifications(h.ctx);
  assert.deepEqual(note.target, { page: "table", params: { tab: UI.LOG_ROUTE_TAB } });
  // Off the Table, "Open the log" goes to that route.
  h.ctx.view = { page: "campaign", id: "", tab: "" };
  UI.openLog(h.ctx);
  assert.deepEqual(h.navigations.at(-1), { page: "table", tab: "chat-log" });
  // On the Table route with the log closed, the Registro toggle is pressed once.
  let clicks = 0;
  const toggle = {
    isConnected: true,
    getAttribute: () => "false",
    click: () => clicks++,
    focus() {},
  };
  const table = { root: { querySelector: () => toggle } };
  const layer = h.registry.get("map-layer", "chat-bubbles");
  h.ctx.view = { page: "table", id: "", tab: "chat-log" };
  layer.svg(h.ctx, { scene: h.ctx.state.scenes[0] });
  layer.bind({}, h.ctx, table);
  await Promise.resolve();
  assert.equal(clicks, 1);
  // Closing it later on the same view keeps it closed; a new navigation opens it again.
  layer.svg(h.ctx, { scene: h.ctx.state.scenes[0] });
  layer.bind({}, h.ctx, table);
  await Promise.resolve();
  assert.equal(clicks, 1);
  h.ctx.view = { page: "table", id: "", tab: "chat-log" };
  layer.svg(h.ctx, { scene: h.ctx.state.scenes[0] });
  layer.bind({}, h.ctx, table);
  await Promise.resolve();
  assert.equal(clicks, 2);
});

test("review: keyboard focus stays on the message after hide, close vote and delete", async () => {
  const h = harness();
  as(h, "dm");
  const bind = () => {
    const root = mount(h.rawPanel());
    root.isConnected = true;
    h.registry.get("table-panel", "log").bind(root, h.ctx);
    return root;
  };
  let root = bind();
  const panel = root.querySelector("[data-chat-panel]");
  const hide = root.querySelector('[data-chat-hide="m2"]');
  panel.fire("click", { target: hide });
  assert.equal(h.slice().messages.find((m) => m.id === "m2").hidden, true);
  root = bind();
  assert.equal(root.focused?.attrs["data-chat-focus"], "menu-m2", "the same message's ⋯");
  // A closed vote moves focus to its outcome.
  UI.openVote(h.ctx);
  h.dialogs.at(-1).options.onSubmit(formData([["question", "Entriamo?"]]));
  const vote = h.slice().messages.at(-1);
  root = bind();
  root
    .querySelector("[data-chat-panel]")
    .fire("click", { target: root.querySelector(`[data-chat-close-vote="${vote.id}"]`) });
  root = bind();
  assert.equal(root.focused?.attrs["data-chat-focus"], `outcome-${vote.id}`);
  assert.equal(root.querySelector(`[data-chat-focus="outcome-${vote.id}"]`).attrs.tabindex, "-1");
  // Delete: after the dialog closes, focus goes to the trace left in place.
  UI.openRemove(h.ctx, "m4");
  h.dialogs.at(-1).options.onSubmit(formData([["reason", "fuori tema"]]));
  root = bind();
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(root.focused?.attrs["data-chat-focus"], "item-m4");
});

test("review: below the docking width the log is a modal sheet that keeps focus inside", () => {
  const h = harness();
  const saved = globalThis.matchMedia;
  try {
    globalThis.matchMedia = () => ({ matches: false });
    assert.doesNotMatch(h.rawPanel(), /aria-modal/, "docked: a non-modal region");
    globalThis.matchMedia = (query) => ({ matches: query === UI.SHEET_QUERY });
    const html = h.rawPanel();
    assert.match(html, /<section class="chat-panel"[^>]*role="dialog" aria-modal="true"/);
    // Tab from the last control wraps to the first one; Shift+Tab from the first to the last.
    const root = mount(html);
    h.registry.get("table-panel", "log").bind(root, h.ctx);
    const panel = root.querySelector("[data-chat-panel]");
    panel.getAttribute = (name) => panel.attrs[name] ?? null;
    panel.contains = () => true;
    const focusables = root.nodes.filter((node) =>
      ["BUTTON", "SELECT", "TEXTAREA", "INPUT", "SUMMARY"].includes(node.tagName),
    );
    for (const node of root.nodes) {
      node.getClientRects = () => (focusables.includes(node) ? [{}] : []);
      node.closest = () => null;
    }
    panel.querySelectorAll = () => focusables;
    const first = focusables[0];
    const last = focusables.at(-1);
    const saveDoc = globalThis.document;
    try {
      globalThis.document = { activeElement: last };
      assert.equal(panel.fire("keydown", { key: "Tab" }), true);
      assert.equal(root.focused, first);
      globalThis.document = { activeElement: first };
      assert.equal(panel.fire("keydown", { key: "Tab", shiftKey: true }), true);
      assert.equal(root.focused, last);
    } finally {
      globalThis.document = saveDoc;
    }
  } finally {
    globalThis.matchMedia = saved;
  }
});

test("review: share to chat from a sheet's details (Shard), with the recipient chosen there", () => {
  const h = harness();
  const command = (entry) => h.registry.get("command", "chat.share-entry", h.ctx, entry);
  const spell = { actorId: "livia", entryId: "spell:sample-burning-hands" };
  assert.ok(command(spell), "offered on Livia's spell for her player");
  assert.equal(command({ actorId: "doran", entryId: "item:x" }), null, "not on others' sheets");
  // A private sheet (not connected to the campaign) never reaches the campaign chat.
  h.ctx.commit("Scheda privata", (draft) => {
    draft.actors.neris = {
      ...structuredClone(draft.actors.livia),
      id: "neris",
      name: "Neris",
      visibility: "private",
      campaignIds: [],
    };
  });
  assert.equal(command({ actorId: "neris", entryId: "spell:sample-burning-hands" }), null);
  // From the palette on a sheet page the command uses the sheet in view.
  h.ctx.view = { page: "characters", id: "livia", tab: "spells" };
  assert.ok(h.registry.get("command", "chat.share-entry", h.ctx));
  h.ctx.view = { page: "campaign", id: "", tab: "" };
  assert.equal(h.registry.get("command", "chat.share-entry", h.ctx), null);
  // Running it opens the share dialog with the entry already chosen.
  assert.equal(h.registry.run(command(spell), h.ctx, spell), true);
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.body, /value="spell:sample-burning-hands" checked/);
  assert.match(decode(dialog.body), /<select name="to"><option value="all">Tutti<\/option>/);
  dialog.options.onSubmit(
    formData([
      ["entry", "spell:sample-burning-hands"],
      ["to", "dm"],
    ]),
  );
  const card = h.slice().messages.at(-1);
  assert.deepEqual(
    [card.kind, card.card.srdId, card.to.type, card.readers],
    ["share", "srd2024:spell:burning-hands", "dm", ["player", "dm"]],
  );
  assert.match(h.toasts.at(-1).text, /Condiviso nella chat: Mani brucianti · sussurro a DM/);
  // The DM's own-notes target keeps its name in the recipients list.
  as(h, "dm");
  h.registry.run(h.registry.get("command", "chat.share-entry", h.ctx, spell), h.ctx, spell);
  assert.match(decode(h.dialogs.at(-1).body), /Sussurro a Solo io \(DM\)/);
});

test("review: revealed handouts appear in the log as cards that open the material", async () => {
  await UI.neighboursReady;
  const H = await import("../handouts-domain.mjs");
  const h = harness();
  h.ctx.commit("Materiali", (draft) => {
    draft.ext.handouts = H.normalizeHandouts(H.seedHandouts(), 1);
  });
  const cardFor = (role) => {
    as(h, role);
    return h.panel().includes('data-chat-handout="material-crypt"');
  };
  assert.equal(cardFor("player"), false, "not shown yet");
  // Shown to Doran only (his controller is the DM): the player still has no card.
  h.ctx.commit("Mostra", (draft) =>
    H.showMaterial(draft, "material-crypt", { mode: "some", actorIds: ["doran"] }, "dm"),
  );
  assert.equal(cardFor("player"), false);
  assert.equal(cardFor("dm"), true);
  h.ctx.commit("Mostra a tutti", (draft) =>
    H.showMaterial(draft, "material-crypt", { mode: "all" }, "dm"),
  );
  assert.equal(cardFor("player"), true);
  assert.match(
    h.panel(),
    /Materiale mostrato[\s\S]*Cripta sotto l’osservatorio[\s\S]*Una scala di pietra/,
  );
  // Opening it goes to the material's route, where the handouts area opens it.
  const root = mount(h.rawPanel());
  h.registry.get("table-panel", "log").bind(root, h.ctx);
  root
    .querySelector("[data-chat-panel]")
    .fire("click", { target: root.querySelector('[data-chat-handout="material-crypt"]') });
  assert.deepEqual(h.navigations.at(-1), {
    page: "campaign",
    tab: "handouts",
    id: "material-crypt",
  });
  // The export lists it too; clearing the archive leaves it out like the rest of the log.
  const extra = [{ type: "handout", id: "handout:x", at: NOW, title: "Lettera", text: "" }];
  assert.match(
    C.exportTranscript(h.ctx.state, h.slice(), "player", { extra }).text,
    /Materiale mostrato: Lettera/,
  );
  const cleared = { ...h.slice(), clearedAt: later(1) };
  assert.equal(
    C.projectStream(h.ctx.state, cleared, "player", { extra }).filter((i) => i.type === "handout")
      .length,
    0,
  );
});

test("review: an undone roll is marked on its card and the correction says what it reversed", () => {
  const state = {
    campaign: { id: "lanterns" },
    actors: {},
    log: [
      {
        id: "e1",
        time: later(1),
        label: "Livia · d20: 14 + 5 = 19 (fisico)",
        controller: "player",
        kind: "commit",
        visibility: "shared",
        rolls: [],
      },
      {
        id: "e2",
        time: later(2),
        label: "Livia · d20: 14 + 5 = 19 (fisico)",
        controller: "player",
        kind: "correction",
        revertsId: "e1",
        visibility: "shared",
        rolls: [],
      },
    ],
  };
  const [card, event] = C.projectLog(state, "dm");
  assert.equal(card.type, "rolls");
  assert.equal(card.reversed, true);
  assert.equal(card.rolls[0].status, "reversed");
  assert.equal(event.type, "event");
  assert.equal(event.reverts, true);
  const h = harness();
  const html = decode(UI.itemHTML(h.ctx, card) + UI.itemHTML(h.ctx, event));
  assert.match(html, /chat-roll-reversed/);
  assert.match(html, /Annullato/);
  assert.match(html, /Annullato: Livia · d20: 14 \+ 5 = 19 \(fisico\)/);
  const text = C.exportTranscript(state, C.normalizeChat({}), "dm").text;
  assert.match(text, /= 19 \(fisico\) · annullato/);
  assert.match(text, /Correzione · Giocatore: Annullato: Livia/);
});

test("review: Tab completes /w names and /r opens the Table's free roll prefilled", () => {
  const h = harness();
  const s = h.ctx.state;
  assert.equal(C.completeWhisper(s, "player", "livia", "/w Do"), "/w Doran ");
  assert.equal(C.completeWhisper(s, "player", "livia", "/w d"), "/w dm ");
  assert.equal(C.completeWhisper(s, "player", "livia", "/w zz"), null, "Tab moves on");
  assert.equal(C.completeWhisper(s, "player", "livia", "ciao"), null);
  assert.equal(C.completeWhisper(s, "dm", null, "/w li"), "/w Livia ");
  // In the composer: Tab completes and keeps focus in the field.
  const root = mount(h.rawPanel());
  const clicks = [];
  const diceButton = { click: () => clicks.push("dice") };
  const table = {
    selectedActorId: "livia",
    select: (id) => clicks.push("select:" + id),
    root: { isConnected: true, querySelector: (sel) => (sel.includes("dice") ? diceButton : null) },
  };
  h.registry.get("table-panel", "log").bind(root, h.ctx, table);
  const text = root.querySelector("[data-chat-text]");
  text.value = "/w Mi";
  assert.equal(text.fire("keydown", { key: "Tab" }), true);
  assert.equal(text.value, "/w Mira ");
  text.value = "/w Mira ";
  assert.equal(text.fire("keydown", { key: "Tab" }), false, "nothing to complete");
  // /r d20+5 presses the Table's own "Roll dice" (the dialog is the core's).
  UI.composerDraft(h.ctx).text = "/r d20+5";
  UI.sendDraft(h.ctx);
  assert.deepEqual(clicks, ["dice"]);
  assert.equal(UI.composerDraft(h.ctx).text, "", "the command is consumed");
  assert.equal(h.slice().messages.length, 6, "no chat message and no roll of its own");
  // Off the Table it explains instead.
  h.ctx.view = { page: "campaign", id: "", tab: "" };
  UI.composerDraft(h.ctx).text = "/r d20";
  UI.sendDraft(h.ctx);
  assert.match(UI.composerDraft(h.ctx).error, /Apri il Tavolo/);
});

test("review: the Registro badge follows what the notification centre marked read", async () => {
  await UI.neighboursReady;
  const N = await import("../notifications.mjs");
  const h = harness();
  N.setNotificationsStorage?.(null);
  N.resetNotificationsMemory?.();
  assert.equal(h.registry.use("notifications", N.register).status, "built");
  as(h, "dm");
  assert.deepEqual(UI.collectNotifications(h.ctx), []);
  as(h, "player");
  await new Promise((resolve) => setTimeout(resolve, 5));
  const d = UI.composerDraft(h.ctx);
  for (const text of ["Primo", "Secondo"]) {
    d.text = text;
    UI.sendDraft(h.ctx);
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  as(h, "dm");
  const badge = () =>
    h.registry.notifications(h.ctx).filter((n) => n.category === "table-log").length;
  assert.equal(badge(), 2);
  assert.equal(UI.syncCentreReads(h.ctx), false, "nothing read yet");
  N.markAllNotificationsRead(h.ctx);
  assert.equal(UI.syncCentreReads(h.ctx), true);
  assert.equal(badge(), 0, "the badge and the bell agree");
});
