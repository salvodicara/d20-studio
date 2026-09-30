// B25 decks: domain (shuffle with the shared dice source, deal, private hands, play face up
// or down, reveal, discard, pass, recall, authoring) and the Table drawer handlers for DM and
// player with the real store and registry. Synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import * as rt from "../random-tables.mjs";
import * as decks from "../decks.mjs";

afterEach(rt.resetRandomTablesUI);

const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
function fakeRoot(html) {
  const nodes = [
    ...html.matchAll(/<(input|button|select|textarea)\b([^>]*)(?:>([\s\S]*?)<\/\1>|>)/g),
  ].map(([, tag, attrsText, inner]) => {
    const attrs = Object.fromEntries(
      [...attrsText.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v)]),
    );
    const events = {};
    return {
      attrs,
      events,
      inner,
      tagName: tag.toUpperCase(),
      type: attrs.type || "",
      dataset: Object.fromEntries(
        Object.entries(attrs)
          .filter(([k]) => k.startsWith("data-"))
          .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
      ),
      value:
        tag === "select"
          ? decode(
              inner?.match(/<option value="([^"]*)"[^>]*selected/)?.[1] ??
                inner?.match(/<option value="([^"]*)"/)?.[1],
            )
          : attrs.value || "",
      checked: "checked" in attrs,
      disabled: "disabled" in attrs,
      addEventListener(type, fn) {
        events[type] = fn;
      },
      focus() {},
    };
  });
  return {
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
}
const form = (values) => ({
  get: (k) => (Array.isArray(values[k]) ? values[k][0] : (values[k] ?? null)),
  getAll: (k) =>
    Array.isArray(values[k]) ? values[k] : values[k] === undefined ? [] : [values[k]],
});
// A deterministic "dice source": rollDie(n) → n (Fisher–Yates then reverses nothing),
// or a scripted list.
const sequence =
  (...values) =>
  (n) => {
    const v = values.length ? values.shift() : n;
    assert.ok(v >= 1 && v <= n, `face ${v} outside d${n}`);
    return v;
  };

function harness({ role = "dm", lang = "it", die = (n) => n } = {}) {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const store = createStore({ storage });
  const registry = createRegistry({ document: undefined, logger: null, deviceStorage: storage });
  assert.equal(registry.use("random-tables", rt.register).status, "built");
  registry.initState(store.state);
  const errors = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    view: { page: "table", id: "", tab: "" },
    registry,
    esc,
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) =>
      typeof v === "object" && v ? v[ctx.lang] || v.it || v.en || "" : String(v ?? ""),
    icon: () => "",
    rollDie: die,
    toast(text, error) {
      if (error) errors.push(text);
    },
    dialog(title, body, options = {}) {
      this.dialogState = { title, body, options };
    },
    closeDialog() {
      this.dialogState = null;
    },
    navigate(page) {
      this.navigated = page;
    },
    commit(label, mutate, options = {}) {
      if (this.offline && !options.local)
        throw Object.assign(Error("offline"), { it: "Sei senza rete.", en: "You are offline." });
      store.commit(label, mutate, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      this.render();
    },
    canUndo: () => store.history.at(-1)?.controller === ctx.role,
    undoLabel: () => "",
    undo() {
      const current = store.state;
      store.undo(this.role);
      registry.afterUndo(current, store.state);
      this.render();
    },
    render() {
      rt.uiState().drawerTab = "decks";
      this.html = rt.renderDrawer(this);
      this.root = fakeRoot(this.html);
      rt.bindDrawer(this.root, this, null);
    },
  };
  registry.attach(ctx);
  const node = (selector) => {
    const n = ctx.root.querySelector(selector);
    assert.ok(n, `Missing ${selector}`);
    return n;
  };
  return {
    ctx,
    store,
    registry,
    errors,
    node,
    deck: () => store.state.ext["random-tables"].decks.find((d) => d.id === "fate"),
    has: (selector) => Boolean(ctx.root.querySelector(selector)),
    click(selector) {
      const n = node(selector);
      assert.equal(n.disabled, false, `${selector} is disabled`);
      n.events.click?.({ target: n });
    },
    submit(values) {
      assert.ok(ctx.dialogState, "No dialog open");
      ctx.dialogState.options.onSubmit(form(values));
      ctx.dialogState = null;
    },
    as(nextRole) {
      ctx.role = nextRole;
      ctx.render();
    },
  };
}
const state = () => {
  const store = createStore({ storage: null });
  return store.state;
};

test("seeded Fate deck starts in authored order with private-hand defaults", () => {
  const [deck] = decks.seedDecks();
  assert.equal(deck.cards.length, 8);
  assert.deepEqual(
    deck.pile,
    deck.cards.map((c) => c.id),
  );
  assert.equal(deck.shuffled, false);
  assert.deepEqual(deck.settings, {
    showToPlayers: true,
    playersMayDraw: true,
    dmSeesHands: false,
  });
  assert.deepEqual(decks.normalizeDeck(structuredClone(deck)), deck);
});

test("shuffle uses the dice source (Fisher–Yates) and only the DM shuffles", () => {
  const [deck] = decks.seedDecks();
  const before = [...deck.pile];
  // rollDie(i+1) = 1 at every step swaps each position with the top card.
  decks.shuffleDeck(deck, "dm", () => 1);
  assert.notDeepEqual(deck.pile, before);
  assert.deepEqual([...deck.pile].sort(), [...before].sort());
  assert.equal(deck.shuffled, true);
  assert.throws(() => decks.shuffleDeck(deck, "player", () => 1), /Solo il DM/);
});

test("deal round by round, private hands, face-up play, reveal, discard, pass, recall", () => {
  const s = state();
  const [deck] = decks.seedDecks();
  const dealt = decks.dealCards(
    s,
    deck,
    { recipients: ["livia", "mira"], count: 2 },
    "dm",
    () => 1,
  );
  assert.deepEqual(dealt.livia, ["fate-lantern", "fate-tide"], "round-robin from the top");
  assert.deepEqual(dealt.mira, ["fate-raven", "fate-key"]);
  assert.equal(deck.pile.length, 4);
  assert.throws(
    () => decks.dealCards(s, deck, { recipients: ["livia"], count: 5 }, "dm", () => 1),
    /restano 4/,
  );
  assert.throws(
    () => decks.dealCards(s, deck, { recipients: ["goblin-1"], count: 1 }, "dm", () => 1),
    /non può ricevere/,
  );
  // The player sees Livia's faces; the DM sees only the count (deck setting off).
  const player = decks.projectDeck(s, deck, "player").hands.find((h) => h.actorId === "livia");
  const dm = decks.projectDeck(s, deck, "dm").hands.find((h) => h.actorId === "livia");
  assert.equal(player.visible, true);
  assert.equal(player.cards.length, 2);
  assert.equal(dm.visible, false);
  assert.equal(dm.count, 2);
  assert.deepEqual(dm.cards, []);
  deck.settings.dmSeesHands = true;
  assert.equal(
    decks.projectDeck(s, deck, "dm").hands.find((h) => h.actorId === "livia").cards.length,
    2,
  );
  deck.settings.dmSeesHands = false;
  // The DM cannot play from Livia's hand.
  assert.throws(
    () => decks.playCard(s, deck, "livia", "fate-lantern", true, "dm"),
    /Solo chi gioca/,
  );
  decks.playCard(s, deck, "livia", "fate-lantern", true, "player");
  decks.playCard(s, deck, "livia", "fate-tide", false, "player");
  const table = decks.projectDeck(s, deck, "dm").table;
  assert.equal(table[0].card.id, "fate-lantern");
  assert.equal(table[1].card, null, "face-down card hidden from the DM");
  assert.equal(
    decks.projectDeck(s, deck, "player").table[1].card.id,
    "fate-tide",
    "the player who played it knows it",
  );
  decks.flipCard(s, deck, "fate-tide", "player");
  assert.equal(decks.projectDeck(s, deck, "dm").table[1].card.id, "fate-tide");
  decks.discardCard(s, deck, "fate-lantern", "player");
  assert.deepEqual(deck.discard, [{ cardId: "fate-lantern", faceUp: true }]);
  decks.passCard(s, deck, "mira", "fate-raven", "livia", "player");
  assert.deepEqual(deck.hands.livia, ["fate-raven"]);
  decks.discardCard(s, deck, "fate-raven", "player");
  assert.deepEqual(
    deck.discard.at(-1),
    { cardId: "fate-raven", faceUp: false },
    "discarded from a hand face down",
  );
  assert.equal(decks.projectDeck(s, deck, "dm").discard.faceUp.length, 1);
  const back = decks.recallCards(deck, { includeHands: false, shuffle: true }, "dm", () => 1);
  assert.equal(back, 3);
  assert.equal(deck.table.length + deck.discard.length, 0);
  assert.deepEqual(deck.hands.mira, ["fate-key"], "hands stay unless included");
  decks.recallCards(deck, { includeHands: true }, "dm", () => 1);
  assert.equal(deck.pile.length, 8);
  assert.equal(decks.deckCounts(deck).hands, 0);
});

test("players draw only when allowed, into their own characters' hands", () => {
  const s = state();
  const [deck] = decks.seedDecks();
  decks.drawCard(s, deck, "livia", "player");
  assert.equal(deck.hands.livia.length, 1);
  assert.throws(() => decks.drawCard(s, deck, "doran", "player"), /Solo chi gioca/);
  deck.settings.playersMayDraw = false;
  assert.throws(() => decks.drawCard(s, deck, "livia", "player"), /non permette/);
  deck.settings.playersMayDraw = true;
  deck.settings.showToPlayers = false;
  assert.throws(() => decks.drawCard(s, deck, "livia", "player"), /non ha mostrato/);
  decks.drawCard(s, deck, "doran", "dm");
  assert.equal(deck.hands.doran.length, 1);
});

test("authoring: bulk cards, rename, removal only from the deck, delete guarded", () => {
  const s = state();
  const slice = { decks: decks.seedDecks() };
  const draft = decks.deckDraft(slice.decks[0], "en");
  assert.equal(draft.name, "Fate");
  draft.cards.push(...decks.parseBulkCards("The Bell — Someone calls you by name.\n\nThe Well"));
  assert.deepEqual(
    draft.cards.slice(-2).map((c) => [c.name, c.text]),
    [
      ["The Bell", "Someone calls you by name."],
      ["The Well", ""],
    ],
  );
  const deck = decks.applyDeckDraft(slice, draft, "dm");
  assert.equal(typeof deck.name, "object", "untouched bilingual name kept");
  assert.equal(deck.cards.length, 10);
  assert.equal(deck.pile.length, 10, "new cards join the deck");
  decks.dealCards(s, deck, { recipients: ["livia"], count: 1 }, "dm", () => 1);
  const without = decks.deckDraft(deck, "it");
  without.cards = without.cards.filter((c) => c.id !== deck.hands.livia[0]);
  // A card in Livia's private hand: refused without saying which card or where (review r2).
  assert.throws(
    () => decks.applyDeckDraft(slice, without, "dm", s),
    (error) => /mani private o coperte/.test(error.it) && !/Lanterna/.test(error.it),
  );
  assert.throws(() => decks.deleteDeck(slice, deck.id, "dm"), /richiamale/);
  const renamed = decks.deckDraft(deck, "it");
  renamed.name = "Presagi";
  decks.applyDeckDraft(slice, renamed, "dm");
  assert.equal(deck.name, "Presagi");
  const other = decks.deckDraft(null, "it");
  other.name = "presagi";
  other.cards = [{ id: null, name: "A", text: "" }];
  assert.throws(() => decks.applyDeckDraft(slice, other, "dm"), /Esiste già/);
  assert.throws(() => decks.applyDeckDraft(slice, renamed, "player"), /Solo il DM/);
});

test("Table drawer: DM shuffles and deals two cards to Livia; Livia plays, discards; DM recalls", () => {
  const h = harness({ role: "dm", die: sequence(1, 1, 1, 1, 1, 1, 1) });
  const { ctx, store } = h;
  ctx.render();
  assert.match(ctx.html, /ordine di creazione, non mescolato/);
  h.click("[data-rt-deck-shuffle]");
  assert.equal(h.deck().shuffled, true);
  h.click("[data-rt-deck-deal]");
  assert.match(ctx.dialogState.body, /Destinatari/);
  h.submit({ count: "2", from: "top", recipient: ["livia"] });
  assert.equal(h.deck().hands.livia.length, 2);
  assert.equal(store.state.log.at(-1).visibility, "shared");
  assert.match(store.state.log.at(-1).label, /2 carte a Livia/);
  // DM: count only, no play controls for Livia.
  assert.match(ctx.html, /Livia · 2 carte/);
  assert.match(ctx.html, /Mano privata/);
  assert.ok(!h.has("[data-rt-card-play]"));
  // Player: faces and actions; a notification for the received cards.
  h.as("player");
  const [first, second] = h.deck().hands.livia;
  assert.ok(h.has(`[data-rt-card-play="${first}"]`));
  const notes = h.registry.notifications(ctx);
  assert.equal(notes.length, 1);
  assert.match(notes[0].title.it, /Livia: 2 carte \(Destino\)/);
  h.click(`[data-rt-card-play="${first}"]`);
  assert.deepEqual(h.deck().table, [{ cardId: first, faceUp: true, by: "livia" }]);
  h.click(`[data-rt-card-discard="${second}"]`);
  assert.deepEqual(h.deck().discard, [{ cardId: second, faceUp: false }]);
  // Undo the discard (the player's own change), then discard again.
  ctx.undo();
  assert.deepEqual(h.deck().hands.livia, [second]);
  h.click(`[data-rt-card-discard="${second}"]`);
  // DM sees the played face and recalls everything with a shuffle.
  h.as("dm");
  assert.match(ctx.html, new RegExp(ctx.label(decks.cardById(h.deck(), first).name)));
  h.click("[data-rt-deck-recall]");
  h.submit({ shuffle: "on" });
  assert.equal(h.deck().pile.length, 8);
  assert.equal(h.deck().table.length, 0);
});

test("Table drawer: player draw, pass dialog, English labels, offline refusal", () => {
  const h = harness({ role: "player", lang: "en" });
  const { ctx } = h;
  ctx.render();
  assert.match(ctx.html, /Draw a card/);
  assert.ok(!h.has("[data-rt-deck-shuffle]"), "players do not manage the deck");
  h.click("[data-rt-deck-draw]");
  const [card] = h.deck().hands.livia;
  assert.ok(card);
  h.click(`[data-rt-card-pass="${card}"]`);
  h.submit({ to: "mira" });
  assert.deepEqual(h.deck().hands.mira, [card]);
  ctx.offline = true;
  h.click("[data-rt-deck-draw]");
  assert.match(h.errors.at(-1), /offline/);
});

test("sheet box shows the hand: faces for the owner, count for the DM", () => {
  const h = harness({ role: "dm" });
  const s = h.store.state;
  decks.dealCards(s, h.deck(), { recipients: ["livia"], count: 2 }, "dm", () => 1);
  const section = h.registry.get("sheet-section", "random-tables-hand");
  const dmHTML = section.render({ ...h.ctx, role: "dm" }, s.actors.livia);
  assert.match(dmHTML, /2 carte/);
  assert.match(dmHTML, /Mano privata/);
  assert.doesNotMatch(dmHTML, /La Lanterna/);
  const playerHTML = section.render({ ...h.ctx, role: "player" }, s.actors.livia);
  assert.match(playerHTML, /La Lanterna/);
  assert.equal(section.when(h.ctx, s.actors.mira), false, "no box without cards");
});

test("a new Preparation deck is hidden: players neither see nor draw it until shown (review P1)", () => {
  const h = harness({ role: "dm" });
  const { ctx, store, registry } = h;
  const draft = decks.deckDraft(null, "it");
  assert.deepEqual(draft.settings, {
    showToPlayers: false,
    playersMayDraw: false,
    dmSeesHands: false,
  });
  draft.name = "Tarocchi del traditore";
  draft.cards = decks.parseBulkCards("Il Tradimento — Il capitano Oben vi venderà ai goblin");
  let traitor = null;
  ctx.commit("save", (d) => (traitor = decks.applyDeckDraft(d.ext["random-tables"], draft, "dm")));
  const secret = /Tradimento|Tarocchi del traditore/;
  // The DM sees it, marked hidden.
  rt.uiState().deckId = traitor.id;
  ctx.render();
  assert.match(ctx.html, /Nascosto ai giocatori/);
  // The player: no select option, no search hit, no draw, no card text.
  h.as("player");
  assert.doesNotMatch(ctx.html, secret);
  assert.ok(!h.has("[data-rt-deck]"), "only the shown Destino deck: no deck select");
  assert.equal(
    registry.search(ctx, "Tarocchi").length,
    0,
    "hidden decks stay out of the player's search",
  );
  const hidden = () => store.state.ext["random-tables"].decks.find((d) => d.id === traitor.id);
  assert.throws(() => decks.drawCard(store.state, hidden(), "livia", "player"), /non ha mostrato/);
  assert.equal(decks.canViewDeck(store.state, hidden(), "player"), false);
  // Dealt a card from the hidden deck, the player sees that card, not the deck's pile.
  h.as("dm");
  ctx.commit("deal", (d) =>
    decks.dealCards(
      d,
      d.ext["random-tables"].decks.find((x) => x.id === traitor.id),
      { recipients: ["livia"], count: 1 },
      "dm",
      () => 1,
    ),
  );
  h.as("player");
  assert.match(ctx.html, /<select data-rt-deck>/);
  rt.uiState().deckId = traitor.id;
  ctx.render();
  assert.match(ctx.html, /Il capitano Oben vi venderà ai goblin/, "own card");
  assert.match(ctx.html, /Mazzo non mostrato ai giocatori/);
  assert.doesNotMatch(ctx.html, /nel mazzo ·/, "no pile count");
  assert.ok(!h.has("[data-rt-deck-draw]"), "no draw from a hidden deck");
  // Shown, but "players may draw" still off: visible, not drawable; then both on.
  h.as("dm");
  const shown = decks.deckDraft(hidden(), "it");
  shown.settings.showToPlayers = true;
  ctx.commit("show", (d) => decks.applyDeckDraft(d.ext["random-tables"], shown, "dm"));
  h.as("player");
  assert.ok(!h.has("[data-rt-deck-draw]"));
  assert.equal(registry.search(ctx, "Tarocchi").length, 1);
  h.as("dm");
  const drawable = decks.deckDraft(hidden(), "it");
  drawable.settings.playersMayDraw = true;
  ctx.commit("draw on", (d) => decks.applyDeckDraft(d.ext["random-tables"], drawable, "dm"));
  h.as("player");
  assert.ok(h.has("[data-rt-deck-draw]"));
});

test("Italian singulars: 1 carta, 1 scarto, recall dialog (review P3)", () => {
  const h = harness({ role: "dm" });
  const { ctx } = h;
  ctx.render();
  h.click("[data-rt-deck-deal]");
  h.submit({ count: "1", from: "top", recipient: ["livia"] });
  h.as("player");
  const [card] = h.deck().hands.livia;
  h.click(`[data-rt-card-discard="${card}"]`);
  assert.match(ctx.html, /7 nel mazzo · 1 scarto/);
  assert.match(ctx.html, /<h3 id="rt-zone-discard">Scarti<\/h3><p>1 carta<\/p>/);
  assert.doesNotMatch(ctx.html, /1 carte|1 scarti/);
  h.as("dm");
  h.click("[data-rt-deck-recall]");
  assert.match(ctx.dialogState.body, /sul tavolo \(0 carte\) e negli scarti \(1 carta\)/);
  assert.doesNotMatch(ctx.dialogState.body, /1 carte/);
});

// ---------------------------------------------------------------------------------------
// Review round 2.

const editorHTML = (ctx, deck) =>
  decks.renderDeckEditor(
    ctx,
    { slice: (s) => s.ext["random-tables"] },
    { draft: decks.deckDraft(deck, ctx.lang) },
  );

test("the Preparation deck editor never tells the DM which private card is where (review r2 P1)", () => {
  const h = harness({ role: "dm" });
  const { ctx, store } = h;
  ctx.render();
  h.click("[data-rt-deck-deal]");
  h.submit({ count: "2", from: "top", recipient: ["livia"] });
  const held = h.deck().hands.livia.map((id) => ctx.label(decks.cardById(h.deck(), id).name));
  assert.deepEqual(held, ["La Lanterna", "Il Corvo"]);
  let html = editorHTML(ctx, h.deck());
  // No card is paired with its holder, and pile cards are not marked either (their
  // complement would name Livia's hand): only counts per zone.
  assert.doesNotMatch(html, /in mano a Livia<\/span>|nel mazzo<\/span>|sul tavolo<\/span>/);
  assert.equal((html.match(/<span class="badge">/g) ?? []).length, 0);
  assert.match(html, /Nel mazzo 6 · in mano a Livia 2 · sul tavolo 0 · scarti 0/);
  assert.match(html, /non sono indicate una per una/);
  // A card Livia plays face down, or discards from her hand, is still not named.
  h.as("player");
  h.click(`[data-rt-card-play-hidden="${h.deck().hands.livia[0]}"]`);
  h.click(`[data-rt-card-discard="${h.deck().hands.livia[0]}"]`);
  h.as("dm");
  html = editorHTML(ctx, h.deck());
  assert.equal((html.match(/<span class="badge">/g) ?? []).length, 0);
  assert.match(html, /sul tavolo 1 \(coperte 1\) · scarti 1 \(coperti 1\)/);
  // Removing any card is refused with the same message wherever it is: no probing.
  const slice = store.state.ext["random-tables"];
  for (const id of [decks.cardById(h.deck(), "fate-lantern").id, "fate-key"]) {
    const draft = decks.deckDraft(h.deck(), "it");
    draft.cards = draft.cards.filter((c) => c.id !== id);
    assert.throws(
      () => decks.applyDeckDraft(structuredClone(slice), draft, "dm", store.state),
      (error) => /mani private o coperte/.test(error.it) && !/Lanterna|Chiave/.test(error.it),
    );
  }
  // Revealed, the card is named where it is (the table sees it too).
  h.click(`[data-rt-card-flip="fate-lantern"]`);
  html = editorHTML(ctx, h.deck());
  assert.match(html, /<span class="badge">sul tavolo<\/span>/);
  // With "The DM sees the faces in hands" on, hand cards are named by holder.
  const open = decks.deckDraft(h.deck(), "it");
  open.settings.dmSeesHands = true;
  ctx.commit("open hands", (d) => decks.applyDeckDraft(d.ext["random-tables"], open, "dm", d));
  ctx.commit("recall", (d) =>
    decks.recallCards(d.ext["random-tables"].decks[0], { shuffle: false }, "dm", () => 1),
  );
  h.click("[data-rt-deck-deal]");
  h.submit({ count: "1", from: "top", recipient: ["livia"] });
  html = editorHTML(ctx, h.deck());
  assert.match(html, /<span class="badge">in mano a Livia<\/span>/);
  assert.match(html, /<span class="badge">nel mazzo<\/span>/);
  // Every card placed where the DM can see it: a pile card can be removed again.
  const trim = decks.deckDraft(h.deck(), "it");
  trim.cards = trim.cards.filter((c) => c.id !== "fate-key");
  ctx.commit("trim", (d) => decks.applyDeckDraft(d.ext["random-tables"], trim, "dm", d));
  assert.equal(h.deck().cards.length, 7);
});

test("hidden deck: shared labels never name it; its table cards reach every player (review r2 P2/P3)", () => {
  const h = harness({ role: "dm" });
  const { ctx, store } = h;
  const draft = decks.deckDraft(null, "it");
  draft.name = "Presagi del DM";
  draft.cards = decks.parseBulkCards(
    "La Cometa — un segno nel cielo\nIl Lupo — qualcuno vi segue\nLa Brina — il freddo arriva",
  );
  let hidden = null;
  ctx.commit(
    "save",
    (d) => (hidden = decks.applyDeckDraft(d.ext["random-tables"], draft, "dm", d)),
    { visibility: "private" },
  );
  rt.uiState().deckId = hidden.id;
  ctx.render();
  const from = store.state.log.length;
  h.click("[data-rt-deck-shuffle]");
  h.click("[data-rt-deck-deal]");
  h.submit({ count: "1", from: "top", recipient: ["doran", "livia"] });
  const deck = () => store.state.ext["random-tables"].decks.find((d) => d.id === hidden.id);
  const [doranCard] = deck().hands.doran;
  h.click(`[data-rt-card-play="${doranCard}"]`);
  h.click("[data-rt-deck-draw]");
  const [second] = deck().hands.doran;
  h.click(`[data-rt-card-play-hidden="${second}"]`);
  h.click(`[data-rt-card-flip="${second}"]`);
  // Livia (player) passes her card to Mira.
  h.as("player");
  const [liviaCard] = deck().hands.livia;
  h.click(`[data-rt-card-pass="${liviaCard}"]`);
  h.submit({ to: "mira" });
  h.as("dm");
  h.click(`[data-rt-card-discard="${doranCard}"]`);
  const entries = store.state.log.slice(from);
  assert.ok(entries.length >= 8);
  for (const entry of entries)
    if (entry.visibility !== "private")
      assert.doesNotMatch(
        entry.label,
        /Presagi/,
        `shared label names the hidden deck: ${entry.label}`,
      );
  const byLabel = (re) => entries.find((e) => re.test(e.label));
  assert.equal(byLabel(/mescolato/).visibility, "private");
  assert.equal(byLabel(/1 carta a Doran, Livia/).visibility, "private");
  assert.equal(byLabel(/pesca una carta/).visibility, "private");
  assert.equal(byLabel(/Doran gioca scoperta/).visibility, "shared");
  assert.equal(byLabel(/passa una carta a Mira/).visibility, "shared");
  // A player who holds nothing from the deck sees its table cards, not its name or pile.
  store.state.actors.mira.owner = "dm";
  h.as("player");
  rt.uiState().deckId = null;
  ctx.render();
  const html = ctx.html;
  assert.match(html, /Altre carte sul tavolo/);
  assert.doesNotMatch(html, /Presagi del DM/);
  const flipped = ctx.label(decks.cardById(deck(), second).name);
  assert.match(html, new RegExp(flipped), "the revealed card");
  assert.match(html, /Giocata da Doran/);
  assert.doesNotMatch(html, /data-rt-card-(flip|discard)/, "no controls on others' cards");
});
