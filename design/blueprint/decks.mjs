// Card decks for B25 (PR-61): authored decks, draw pile, private hands, cards played on the
// table and a discard pile. Patterns: Foundry Cards (FVT-099: deal dialog with count, draw
// mode and recipients; draw, play, pass, shuffle, reset to deck), Roll20 Collections decks
// and card play (R20-105/R20-149: "show to players" and "players may draw" deck settings,
// hand visibility for the GM, play face up or face down, Recall with automatic shuffle) and
// Owlbear Decked! (VTL-098: a deck starts in its authored order until someone shuffles it).
// A new deck is hidden from players until the DM shows it (Roll20 deck settings); a player
// still sees the cards dealt to their own characters from a hidden deck. Shuffling and random draws use the same
// dice source as every other roll (state.mjs rollDie), passed in by the caller.
//
// A card never has a game consequence by itself (F-059 boundary): drawing, dealing or
// playing only moves the card and records who did it.

import { isActorAvailable, isCampaignActor } from "./character-access.mjs";

const L = (it, en) => ({ it, en });
const clone = (value) => structuredClone(value);
const newId = (prefix) => `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
export const refuse = (it, en) => Object.assign(new Error(`${it} / ${en}`), { it, en });
const textOf = (value, lang = "it") =>
  typeof value === "object" && value
    ? value[lang] || value.it || value.en || ""
    : String(value ?? "");

export const DECK_LIMITS = Object.freeze({ name: 80, text: 300, cards: 100, deal: 10, events: 30 });

// Synthetic, original demo content: narrative omens without any automatic effect.
const FATE_CARDS = [
  [
    "lantern",
    L("La Lanterna", "The Lantern"),
    L(
      "Una luce lontana indica una via che nessuno aveva notato.",
      "A distant light points out a path no one had noticed.",
    ),
  ],
  [
    "raven",
    L("Il Corvo", "The Raven"),
    L("Un messaggio arriva da chi non ti aspettavi.", "A message arrives from someone unexpected."),
  ],
  [
    "tide",
    L("La Marea", "The Tide"),
    L("Ciò che è sepolto torna in superficie.", "What was buried comes back to the surface."),
  ],
  [
    "key",
    L("La Chiave", "The Key"),
    L("Una porta chiusa troverà il suo momento.", "A closed door will find its moment."),
  ],
  [
    "mirror",
    L("Lo Specchio", "The Mirror"),
    L("Un alleato mostra un volto diverso.", "An ally shows a different face."),
  ],
  [
    "tower",
    L("La Torre spezzata", "The Broken Tower"),
    L("Un piano ben fatto si incrina.", "A well-made plan cracks."),
  ],
  [
    "thread",
    L("Il Filo", "The Thread"),
    L("Due destini si legano per una notte.", "Two fates are tied for one night."),
  ],
  [
    "morning-star",
    L("La Stella del mattino", "The Morning Star"),
    L("Dopo la notte più lunga, una tregua.", "After the longest night, a respite."),
  ],
];

export function seedDecks() {
  const cards = FATE_CARDS.map(([id, name, text]) => ({ id: `fate-${id}`, name, text }));
  return [
    {
      id: "fate",
      name: L("Destino", "Fate"),
      origin: "authored-demo",
      cards,
      // Authored order, top first: nobody has shuffled it yet (VTL-098).
      pile: cards.map((card) => card.id),
      hands: {},
      table: [],
      discard: [],
      // The demo deck is meant for the table: shown to players, who may draw from it.
      settings: { showToPlayers: true, playersMayDraw: true, dmSeesHands: false },
      shuffled: false,
      events: [],
    },
  ];
}

// Every setting is off unless it was explicitly turned on: a deck never becomes visible or
// drawable to players by omission.
const normalizeSettings = (settings) => ({
  showToPlayers: settings?.showToPlayers === true,
  playersMayDraw: settings?.playersMayDraw === true,
  dmSeesHands: settings?.dmSeesHands === true,
});

// Tolerant reader for saved decks: unknown or broken entries are dropped, never invented.
export function normalizeDeck(deck) {
  if (!deck || typeof deck !== "object" || typeof deck.id !== "string") return null;
  const cards = (Array.isArray(deck.cards) ? deck.cards : []).filter(
    (card) => card && typeof card.id === "string",
  );
  const known = new Set(cards.map((card) => card.id));
  const seen = new Set();
  const keep = (id) => known.has(id) && !seen.has(id) && seen.add(id);
  const hands = {};
  for (const [actorId, list] of Object.entries(deck.hands ?? {}))
    if (Array.isArray(list)) hands[actorId] = list.filter(keep);
  const table = (Array.isArray(deck.table) ? deck.table : []).filter((entry) =>
    keep(entry?.cardId),
  );
  const discard = (Array.isArray(deck.discard) ? deck.discard : []).filter((entry) =>
    keep(entry?.cardId),
  );
  const pile = (Array.isArray(deck.pile) ? deck.pile : []).filter(keep);
  // A card lost from every zone returns to the bottom of the pile.
  for (const card of cards) if (!seen.has(card.id)) pile.push(card.id);
  return {
    id: deck.id,
    name: deck.name ?? deck.id,
    origin: deck.origin ?? "user",
    cards,
    pile,
    hands,
    table,
    discard,
    settings: normalizeSettings(deck.settings),
    shuffled: deck.shuffled === true,
    events: Array.isArray(deck.events) ? deck.events.slice(-DECK_LIMITS.events) : [],
  };
}

// ---------------------------------------------------------------------------------------
// Permissions and projections

/** Campaign characters that can hold a hand (not personal sheets, not companions). */
export function deckRecipients(state) {
  return Object.values(state.actors ?? {}).filter(
    (actor) =>
      actor.kind === "character" &&
      !actor.companion &&
      actor.visibility !== "private" &&
      isCampaignActor(actor, state.campaign?.id) &&
      isActorAvailable(actor),
  );
}
export const ownsActor = (actor, role) =>
  Boolean(actor) &&
  (actor.owner === role || (Array.isArray(actor.controllers) && actor.controllers.includes(role)));
/** The faces of a hand: its owner, or the DM only when the deck allows it (R20-105). */
export const canSeeHand = (deck, actor, role) =>
  ownsActor(actor, role) || (role === "dm" && deck.settings?.dmSeesHands === true);
/** Roll20 "Show deck to players". */
export const deckShown = (deck) => deck?.settings?.showToPlayers === true;
/** Players draw only from a deck they can see and that allows drawing. */
export const playersCanDraw = (deck) => deckShown(deck) && deck.settings.playersMayDraw === true;
/** Cards of one identity's characters in hands or played on the table. */
function holdsCards(state, deck, role) {
  return (
    Object.entries(deck.hands ?? {}).some(
      ([actorId, list]) => list.length && ownsActor(state.actors?.[actorId], role),
    ) || (deck.table ?? []).some((entry) => ownsActor(state.actors?.[entry.by], role))
  );
}
/** The DM sees every deck; a player a shown deck, or a hidden one they hold cards from. */
export const canViewDeck = (state, deck, role) =>
  role === "dm" || deckShown(deck) || holdsCards(state, deck, role);
export const visibleDecks = (state, decks, role) =>
  decks.filter((deck) => canViewDeck(state, deck, role));
/**
 * Roll20 cards on the tabletop (R20-149): a card played on the table is seen by everyone,
 * face up or as a back, even from a deck the players cannot see (its name, pile and hands
 * stay hidden). Returns the table entries of the decks this identity cannot view.
 */
export function otherTableCards(state, decks, role) {
  return decks
    .filter((deck) => !canViewDeck(state, deck, role) && deck.table.length)
    .flatMap((deck) => projectDeck(state, deck, role).table);
}

export function cardById(deck, cardId) {
  return deck.cards.find((card) => card.id === cardId) ?? null;
}
export function locateCard(deck, cardId) {
  const pile = deck.pile.indexOf(cardId);
  if (pile >= 0) return { zone: "pile", index: pile };
  for (const [actorId, list] of Object.entries(deck.hands)) {
    const index = list.indexOf(cardId);
    if (index >= 0) return { zone: "hand", actorId, index };
  }
  const table = deck.table.findIndex((entry) => entry.cardId === cardId);
  if (table >= 0) return { zone: "table", index: table, entry: deck.table[table] };
  const discard = deck.discard.findIndex((entry) => entry.cardId === cardId);
  if (discard >= 0) return { zone: "discard", index: discard, entry: deck.discard[discard] };
  return null;
}
/**
 * Where one identity may know a card is, or null: a hand only when its faces are visible
 * (canSeeHand), the table when the card is face up or was played by that identity's
 * character, the discard pile when face up. The pile is face down: its cards are known
 * only by count, like projectDeck.
 */
export function knownPlace(state, deck, cardId, role) {
  const place = locateCard(deck, cardId);
  if (place?.zone === "hand")
    return canSeeHand(deck, state?.actors?.[place.actorId], role) ? place : null;
  if (place?.zone === "table")
    return place.entry.faceUp || ownsActor(state?.actors?.[place.entry.by], role) ? place : null;
  if (place?.zone === "discard") return place.entry.faceUp ? place : null;
  return null;
}
/** Cards outside the pile whose place this identity cannot know (private or face down). */
export function unseenOutside(state, deck, role) {
  return deck.cards.filter(
    (card) => locateCard(deck, card.id)?.zone !== "pile" && !knownPlace(state, deck, card.id, role),
  ).length;
}
export function deckCounts(deck) {
  const inHands = Object.values(deck.hands).reduce((sum, list) => sum + list.length, 0);
  return {
    pile: deck.pile.length,
    hands: inHands,
    table: deck.table.length,
    discard: deck.discard.length,
    total: deck.cards.length,
  };
}

/**
 * What one identity may see of a deck: counts for everyone, faces only where permitted.
 * A face-down card on the table shows its face only to the one who played it.
 */
export function projectDeck(state, deck, role) {
  const recipients = deckRecipients(state);
  const face = (cardId) => clone(cardById(deck, cardId));
  return {
    id: deck.id,
    name: deck.name,
    settings: clone(deck.settings),
    shown: deckShown(deck),
    // A player holding cards from a hidden deck sees those cards, not the deck itself.
    pileHidden: role !== "dm" && !deckShown(deck),
    shuffled: deck.shuffled,
    counts: deckCounts(deck),
    hands: recipients.map((actor) => {
      const list = deck.hands[actor.id] ?? [];
      const visible = canSeeHand(deck, actor, role);
      return {
        actorId: actor.id,
        name: actor.name,
        count: list.length,
        visible,
        own: ownsActor(actor, role),
        cards: visible ? list.map(face) : [],
      };
    }),
    table: deck.table.map((entry) => {
      const by = state.actors?.[entry.by];
      const known = entry.faceUp || ownsActor(by, role);
      return {
        cardId: entry.cardId,
        faceUp: entry.faceUp,
        by: entry.by ?? null,
        byName: by?.name ?? "DM",
        card: known ? face(entry.cardId) : null,
        canFlip: !entry.faceUp && (role === "dm" || ownsActor(by, role)),
        canDiscard: role === "dm" || ownsActor(by, role),
      };
    }),
    discard: {
      count: deck.discard.length,
      faceUp: deck.discard.filter((entry) => entry.faceUp).map((entry) => face(entry.cardId)),
    },
    canManage: role === "dm",
    drawers: recipients
      .filter((actor) => ownsActor(actor, role) && (role === "dm" || playersCanDraw(deck)))
      .map((actor) => ({ actorId: actor.id, name: actor.name })),
  };
}

// ---------------------------------------------------------------------------------------
// Commands. Each validates authority and mutates the deck of a commit draft.

const dmOnly = (role) => {
  if (role !== "dm")
    throw refuse("Solo il DM può gestire il mazzo.", "Only the DM can manage the deck.");
};
function recipient(state, actorId) {
  const actor = deckRecipients(state).find((entry) => entry.id === actorId);
  if (!actor)
    throw refuse(
      "Questo personaggio non può ricevere carte.",
      "This character cannot receive cards.",
    );
  return actor;
}
function ownHand(state, deck, actorId, role) {
  const actor = recipient(state, actorId);
  if (!ownsActor(actor, role))
    throw refuse(
      "Solo chi gioca il personaggio usa le sue carte.",
      "Only the character's player uses its cards.",
    );
  return (deck.hands[actorId] ??= []);
}
function pushEvent(deck, event) {
  deck.events.push({ id: newId("deck-event"), at: new Date().toISOString(), ...event });
  if (deck.events.length > DECK_LIMITS.events)
    deck.events.splice(0, deck.events.length - DECK_LIMITS.events);
}
function takeFromPile(deck, from, rollDie) {
  if (!deck.pile.length) throw refuse("Il mazzo è vuoto.", "The deck is empty.");
  if (from === "bottom") return deck.pile.pop();
  if (from === "random") return deck.pile.splice(rollDie(deck.pile.length) - 1, 1)[0];
  return deck.pile.shift();
}

/** Fisher–Yates with the shared dice source: rollDie(n) is a fair integer in 1..n. */
export function shuffleDeck(deck, role, rollDie) {
  dmOnly(role);
  for (let i = deck.pile.length - 1; i > 0; i--) {
    const j = rollDie(i + 1) - 1;
    [deck.pile[i], deck.pile[j]] = [deck.pile[j], deck.pile[i]];
  }
  deck.shuffled = true;
  pushEvent(deck, { kind: "shuffle", by: role });
  return deck.pile.length;
}

/** Foundry deal dialog: count per recipient, top/bottom/random, dealt round by round. */
export function dealCards(
  state,
  deck,
  { recipients = [], count = 1, from = "top" } = {},
  role,
  rollDie,
) {
  dmOnly(role);
  const ids = [...new Set(recipients)];
  if (!ids.length) throw refuse("Scegli almeno un destinatario.", "Choose at least one recipient.");
  if (!Number.isInteger(count) || count < 1 || count > DECK_LIMITS.deal)
    throw refuse(
      `Distribuisci da 1 a ${DECK_LIMITS.deal} carte a testa.`,
      `Deal 1 to ${DECK_LIMITS.deal} cards each.`,
    );
  if (!["top", "bottom", "random"].includes(from))
    throw refuse("Modo di pesca non valido.", "Invalid draw mode.");
  ids.forEach((id) => recipient(state, id));
  const needed = ids.length * count;
  if (needed > deck.pile.length)
    throw refuse(
      `Servono ${needed} carte ma nel mazzo ${deck.pile.length === 1 ? "ne resta 1" : `ne restano ${deck.pile.length}`}.`,
      `${needed} cards are needed but only ${deck.pile.length} ${deck.pile.length === 1 ? "remains" : "remain"} in the deck.`,
    );
  const dealt = Object.fromEntries(ids.map((id) => [id, []]));
  for (let round = 0; round < count; round++)
    for (const id of ids) {
      const cardId = takeFromPile(deck, from, rollDie);
      (deck.hands[id] ??= []).push(cardId);
      dealt[id].push(cardId);
    }
  for (const id of ids) pushEvent(deck, { kind: "deal", actorId: id, count, by: role });
  return dealt;
}

/** Roll20: click the deck to draw one card into your own hand, if players may draw. */
export function drawCard(state, deck, actorId, role) {
  if (role !== "dm" && !deckShown(deck))
    throw refuse("Il DM non ha mostrato questo mazzo.", "The DM has not shown this deck.");
  if (role !== "dm" && !playersCanDraw(deck))
    throw refuse(
      "Il DM non permette di pescare da questo mazzo.",
      "The DM does not allow drawing from this deck.",
    );
  const hand = ownHand(state, deck, actorId, role);
  const cardId = takeFromPile(deck, "top");
  hand.push(cardId);
  pushEvent(deck, { kind: "draw", actorId, count: 1, by: role });
  return cardId;
}

export function playCard(state, deck, actorId, cardId, faceUp, role) {
  const hand = ownHand(state, deck, actorId, role);
  const index = hand.indexOf(cardId);
  if (index < 0)
    throw refuse("La carta non è più in questa mano.", "The card is no longer in this hand.");
  hand.splice(index, 1);
  deck.table.push({ cardId, faceUp: faceUp === true, by: actorId });
  pushEvent(deck, {
    kind: faceUp ? "play" : "play-hidden",
    actorId,
    count: 1,
    by: role,
    cardId: faceUp ? cardId : null,
  });
  return deck.table.at(-1);
}

export function flipCard(state, deck, cardId, role) {
  const entry = deck.table.find((item) => item.cardId === cardId);
  if (!entry || entry.faceUp)
    throw refuse("Nessuna carta coperta da scoprire.", "No face-down card to reveal.");
  if (role !== "dm" && !ownsActor(state.actors?.[entry.by], role))
    throw refuse(
      "Solo chi l’ha giocata o il DM la scopre.",
      "Only whoever played it or the DM reveals it.",
    );
  entry.faceUp = true;
  pushEvent(deck, { kind: "reveal", actorId: entry.by, cardId, by: role });
  return entry;
}

/** From a hand (face down, only its owner knew it) or from the table (keeps its side). */
export function discardCard(state, deck, cardId, role) {
  const place = locateCard(deck, cardId);
  if (place?.zone === "hand") {
    ownHand(state, deck, place.actorId, role).splice(place.index, 1);
    deck.discard.push({ cardId, faceUp: false });
    pushEvent(deck, { kind: "discard", actorId: place.actorId, by: role });
    return place;
  }
  if (place?.zone === "table") {
    const by = state.actors?.[place.entry.by];
    if (role !== "dm" && !ownsActor(by, role))
      throw refuse(
        "Solo chi l’ha giocata o il DM la scarta.",
        "Only whoever played it or the DM discards it.",
      );
    deck.table.splice(place.index, 1);
    deck.discard.push({ cardId, faceUp: place.entry.faceUp });
    pushEvent(deck, { kind: "discard", actorId: place.entry.by, by: role });
    return place;
  }
  throw refuse("La carta non si può scartare da qui.", "The card cannot be discarded from here.");
}

/** Foundry "pass": the owner hands a card to another character. */
export function passCard(state, deck, fromActorId, cardId, toActorId, role) {
  if (fromActorId === toActorId)
    throw refuse("Scegli un altro personaggio.", "Choose another character.");
  const hand = ownHand(state, deck, fromActorId, role);
  recipient(state, toActorId);
  const index = hand.indexOf(cardId);
  if (index < 0)
    throw refuse("La carta non è più in questa mano.", "The card is no longer in this hand.");
  hand.splice(index, 1);
  (deck.hands[toActorId] ??= []).push(cardId);
  pushEvent(deck, { kind: "pass", actorId: toActorId, fromActorId, count: 1, by: role });
}

/** Roll20 Recall (with automatic shuffle) / Foundry reset: cards go back to the deck. */
export function recallCards(deck, { includeHands = false, shuffle = true } = {}, role, rollDie) {
  dmOnly(role);
  const back = [...deck.table, ...deck.discard].map((entry) => entry.cardId);
  deck.table = [];
  deck.discard = [];
  if (includeHands) {
    for (const list of Object.values(deck.hands)) back.push(...list);
    deck.hands = {};
  }
  deck.pile.push(...back);
  pushEvent(deck, { kind: "recall", count: back.length, includeHands, by: role });
  if (shuffle) shuffleDeck(deck, role, rollDie);
  return back.length;
}

// ---------------------------------------------------------------------------------------
// Authoring (Preparation). A draft is {id|null, name, cards:[{id|null, name, text}], settings}.

export function deckDraft(deck, lang = "it") {
  return deck
    ? {
        id: deck.id,
        lang,
        name: textOf(deck.name, lang),
        nameValue: clone(deck.name),
        cards: deck.cards.map((card) => ({
          id: card.id,
          name: clone(card.name),
          text: clone(card.text),
        })),
        settings: clone(deck.settings),
      }
    : {
        id: null,
        lang,
        name: "",
        cards: [],
        // Roll20: a new deck stays hidden until the DM chooses to show it.
        settings: normalizeSettings({}),
      };
}
/** "Name — text" per line (Roll20: add cards in bulk). Empty lines are ignored. */
export function parseBulkCards(text) {
  return String(text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, ...rest] = line.split(/\s+[—–-]\s+/);
      return { id: null, name: name.trim(), text: rest.join(" — ").trim() };
    });
}
const plain = (value) => (typeof value === "string" ? value.trim() : value);
export function validateDeckDraft(slice, draft) {
  const name = String(draft.name ?? "").trim();
  if (!name || name.length > DECK_LIMITS.name)
    throw refuse(
      "Dai al mazzo un nome fino a 80 caratteri.",
      "Give the deck a name up to 80 characters.",
    );
  const clash = slice.decks.find(
    (deck) =>
      deck.id !== draft.id &&
      [deck.name?.it, deck.name?.en, typeof deck.name === "string" ? deck.name : null]
        .filter(Boolean)
        .some((value) => value.toLowerCase() === name.toLowerCase()),
  );
  if (clash)
    throw refuse("Esiste già un mazzo con questo nome.", "A deck with this name already exists.");
  if (!draft.cards.length) throw refuse("Aggiungi almeno una carta.", "Add at least one card.");
  if (draft.cards.length > DECK_LIMITS.cards)
    throw refuse(`Al massimo ${DECK_LIMITS.cards} carte.`, `At most ${DECK_LIMITS.cards} cards.`);
  draft.cards.forEach((card, i) => {
    const cardName = textOf(card.name).trim();
    if (!cardName || cardName.length > DECK_LIMITS.name)
      throw refuse(`La carta ${i + 1} non ha un nome valido.`, `Card ${i + 1} has no valid name.`);
    if (textOf(card.text).length > DECK_LIMITS.text)
      throw refuse(
        `Il testo della carta ${i + 1} è troppo lungo.`,
        `Card ${i + 1} text is too long.`,
      );
  });
}
/**
 * Creates or updates a deck from a draft; removed cards must be back in the deck. The
 * refusal never tells the DM where a private card is: while any card sits in a private
 * hand or face down, removing a card whose place the DM cannot see is refused the same
 * way wherever that card really is (so a removal cannot be used to probe a hand).
 * `state` (the commit draft) gives the characters for hand ownership.
 */
export function applyDeckDraft(slice, draft, role, state = null) {
  dmOnly(role);
  validateDeckDraft(slice, draft);
  const existing = draft.id ? slice.decks.find((deck) => deck.id === draft.id) : null;
  if (draft.id && !existing) throw refuse("Il mazzo non esiste più.", "The deck no longer exists.");
  const deck = existing ?? {
    id: newId("deck"),
    origin: "user",
    cards: [],
    pile: [],
    hands: {},
    table: [],
    discard: [],
    shuffled: false,
    events: [],
  };
  const kept = new Set(draft.cards.filter((card) => card.id).map((card) => card.id));
  const removed = deck.cards.filter((card) => !kept.has(card.id));
  const known = removed.filter((card) => knownPlace(state, deck, card.id, role));
  if (known.length)
    throw refuse(
      `Richiama prima nel mazzo: ${known.map((card) => textOf(card.name, "it")).join(", ")}.`,
      `Recall to the deck first: ${known.map((card) => textOf(card.name, "en")).join(", ")}.`,
    );
  if (removed.length && unseenOutside(state, deck, role))
    throw refuse(
      "Ci sono carte in mani private o coperte: per rimuovere carte richiama prima tutte le carte nel mazzo (Richiama e mescola…, mani comprese).",
      "Cards are in private hands or face down: to remove cards, first recall every card to the deck (Recall and shuffle…, hands included).",
    );
  // An untouched bilingual name stays bilingual; an edited one is the author's text.
  deck.name =
    draft.nameValue && textOf(draft.nameValue, draft.lang) === String(draft.name).trim()
      ? clone(draft.nameValue)
      : String(draft.name).trim();
  deck.settings = normalizeSettings(draft.settings);
  deck.pile = deck.pile.filter((id) => kept.has(id));
  deck.cards = draft.cards.map((card) => {
    const id =
      card.id && deck.cards.some((entry) => entry.id === card.id) ? card.id : newId("card");
    if (!card.id || id !== card.id) deck.pile.push(id);
    return { id, name: plain(card.name), text: plain(card.text) };
  });
  if (!existing) slice.decks.push(deck);
  return deck;
}
export function deleteDeck(slice, deckId, role) {
  dmOnly(role);
  const deck = slice.decks.find((entry) => entry.id === deckId);
  if (!deck) throw refuse("Il mazzo non esiste più.", "The deck no longer exists.");
  const counts = deckCounts(deck);
  if (counts.hands || counts.table)
    throw refuse(
      "Ci sono carte in mano o sul tavolo: richiamale prima di eliminare il mazzo.",
      "Cards are in hands or on the table: recall them before deleting the deck.",
    );
  slice.decks.splice(slice.decks.indexOf(deck), 1);
}

// ---------------------------------------------------------------------------------------
// UI. `api` comes from random-tables.mjs: {slice(state), act(ctx, label, fn, options),
// rollDie, deckId(ctx), setDeckId(id), editor(), markDirty(), focus(selector)}.

const cardHTML = (ctx, card, extra = "") =>
  `<div class="rt-card"><strong>${ctx.esc(ctx.label(card.name))}</strong>${card.text ? `<p>${ctx.esc(ctx.label(card.text))}</p>` : ""}${extra}</div>`;
/** "1 carta" / "2 carte" (the singular is chosen by the count, never "1 carte"). */
export const cardsText = (ctx, count) =>
  `${count} ${count === 1 ? ctx.t("carta", "card") : ctx.t("carte", "cards")}`;
/** Audit labels of DM actions on a hidden deck stay private (the name can be a spoiler). */
export const deckCommitOptions = (deck) => (deckShown(deck) ? {} : { visibility: "private" });
/**
 * The log label of a command. A shown deck names itself; a hidden deck never does in a
 * shared label. Moves players see anyway (a card played, revealed, discarded or passed)
 * keep a shared, nameless trace; everything else on a hidden deck stays private.
 */
export function deckLabel(ctx, deck, [it, en], { seen = false } = {}) {
  const name = ctx.label(deck.name);
  if (deckShown(deck)) return { label: ctx.t(`${it} (${name})`, `${en} (${name})`), options: {} };
  return seen
    ? { label: ctx.t(it, en), options: {} }
    : { label: ctx.t(`${it} (${name})`, `${en} (${name})`), options: { visibility: "private" } };
}

function currentDeck(ctx, api) {
  const decks = visibleDecks(ctx.state, api.slice(ctx.state).decks, ctx.role);
  return decks.find((deck) => deck.id === api.deckId()) ?? decks[0] ?? null;
}

/** A card on the table: its face where known, otherwise its back, and who played it. */
function tableCardHTML(ctx, entry, actions = "") {
  const { t, esc } = ctx;
  const by = `<small class="muted">${esc(t("Giocata da ", "Played by ") + entry.byName)}${entry.faceUp ? "" : " · " + t("coperta", "face down")}</small>`;
  const tools = actions ? `<div class="rt-card-actions">${actions}</div>` : "";
  return entry.card
    ? cardHTML(ctx, entry.card, `${by}${tools}`)
    : `<div class="rt-card rt-card-back-face"><strong>${t("Carta coperta", "Face-down card")}</strong>${by}${tools}</div>`;
}
/** Cards played on the table from decks this identity cannot see: no name, pile or hands. */
function otherTableHTML(ctx, api) {
  const cards = otherTableCards(ctx.state, api.slice(ctx.state).decks, ctx.role);
  if (!cards.length) return "";
  const { t } = ctx;
  return `<section class="rt-zone" aria-labelledby="rt-zone-other"><h3 id="rt-zone-other">${t("Altre carte sul tavolo", "Other cards on the table")}</h3><div class="rt-card-row">${cards.map((entry) => tableCardHTML(ctx, entry)).join("")}</div></section>`;
}

export function renderDeckPanel(ctx, api) {
  const { t, esc } = ctx;
  const decks = visibleDecks(ctx.state, api.slice(ctx.state).decks, ctx.role);
  const deck = currentDeck(ctx, api);
  const others = otherTableHTML(ctx, api);
  if (!deck)
    return ctx.role === "dm"
      ? `<div class="empty-state"><h3>${t("Nessun mazzo", "No decks")}</h3><p>${t("Prepara i mazzi in Preparazione › Tabelle e mazzi.", "Prepare decks in Preparation › Tables and decks.")}</p></div>`
      : `<div class="rt-decks">${others}<div class="empty-state"><h3>${t("Nessun mazzo mostrato", "No deck shown")}</h3><p>${t("Il DM non ha ancora mostrato mazzi ai giocatori.", "The DM has not shown any deck to players yet.")}</p></div></div>`;
  const view = projectDeck(ctx.state, deck, ctx.role);
  const recipients = view.hands;
  const select =
    decks.length > 1
      ? `<label class="field rt-inline-field">${t("Mazzo", "Deck")}<select data-rt-deck>${decks.map((entry) => `<option value="${esc(entry.id)}" ${entry.id === deck.id ? "selected" : ""}>${esc(ctx.label(entry.name))}</option>`).join("")}</select></label>`
      : "";
  const manage = view.canManage
    ? `<button type="button" class="button" data-rt-deck-shuffle>${ctx.icon("dice")} ${t("Mescola", "Shuffle")}</button><button type="button" class="button primary" data-rt-deck-deal>${t("Distribuisci…", "Deal…")}</button><button type="button" class="button" data-rt-deck-recall>${t("Richiama e mescola…", "Recall and shuffle…")}</button>`
    : "";
  const draw = view.drawers.length
    ? `<label class="field rt-inline-field">${t("Pesca per", "Draw for")}<select data-rt-deck-drawer>${view.drawers.map((entry) => `<option value="${esc(entry.actorId)}">${esc(entry.name)}</option>`).join("")}</select></label><button type="button" class="button" data-rt-deck-draw ${view.counts.pile ? "" : 'disabled aria-describedby="rt-deck-empty-why"'}>${t("Pesca una carta", "Draw a card")}</button>${view.counts.pile ? "" : `<p class="muted rt-why" id="rt-deck-empty-why">${view.canManage ? t("Il mazzo è vuoto: premi «Richiama e mescola…» per rimettere le carte nel mazzo.", "The deck is empty: press “Recall and shuffle…” to put the cards back.") : t("Il mazzo è vuoto: il DM può rimescolare le carte.", "The deck is empty: the DM can reshuffle the cards.")}</p>`}`
    : "";
  const tableCards = view.table.length
    ? view.table
        .map((entry) =>
          tableCardHTML(
            ctx,
            entry,
            `${entry.canFlip ? `<button type="button" class="button" data-rt-card-flip="${esc(entry.cardId)}">${t("Scopri", "Reveal")}</button>` : ""}${entry.canDiscard ? `<button type="button" class="button quiet" data-rt-card-discard="${esc(entry.cardId)}">${t("Scarta", "Discard")}</button>` : ""}`,
          ),
        )
        .join("")
    : `<p class="muted">${t("Nessuna carta giocata.", "No cards played.")}</p>`;
  const hands = recipients
    .filter((hand) => !view.pileHidden || hand.own)
    .map((hand) => {
      const heading = `<h4>${esc(hand.name)} · ${cardsText(ctx, hand.count)}</h4>`;
      if (!hand.count)
        return `<article class="rt-hand">${heading}<p class="muted">${t("Mano vuota.", "Empty hand.")}</p></article>`;
      if (!hand.visible)
        return `<article class="rt-hand">${heading}<div class="rt-hand-backs" aria-hidden="true">${'<span class="rt-card-back"></span>'.repeat(Math.min(hand.count, 8))}</div><p class="muted">${t("Mano privata: le facce sono visibili solo a chi gioca il personaggio.", "Private hand: faces are visible only to the character's player.")}</p></article>`;
      const cards = hand.cards
        .map((card) =>
          cardHTML(
            ctx,
            card,
            hand.own
              ? `<div class="rt-card-actions"><button type="button" class="button primary" data-rt-card-play="${esc(card.id)}" data-actor="${esc(hand.actorId)}">${t("Gioca scoperta", "Play face up")}</button><button type="button" class="button" data-rt-card-play-hidden="${esc(card.id)}" data-actor="${esc(hand.actorId)}">${t("Gioca coperta", "Play face down")}</button><button type="button" class="button quiet" data-rt-card-discard="${esc(card.id)}">${t("Scarta", "Discard")}</button><button type="button" class="button quiet" data-rt-card-pass="${esc(card.id)}" data-actor="${esc(hand.actorId)}">${t("Passa…", "Pass…")}</button></div>`
              : `<small class="muted">${t("Visibile al DM per scelta del mazzo", "Visible to the DM by deck setting")}</small>`,
          ),
        )
        .join("");
      return `<article class="rt-hand rt-hand-open">${heading}<div class="rt-card-row">${cards}</div></article>`;
    })
    .join("");
  const discardFaces = view.discard.faceUp.map((card) => esc(ctx.label(card.name))).join(", ");
  const discarded =
    view.counts.discard === 1
      ? t("1 scarto", "1 discarded")
      : t(`${view.counts.discard} scarti`, `${view.counts.discard} discarded`);
  const visibility = view.shown
    ? `<span class="badge">${t("Mostrato ai giocatori", "Shown to players")}${view.settings.playersMayDraw ? "" : " · " + t("pesca solo il DM", "only the DM draws")}</span>`
    : `<span class="badge rt-badge-warn">${t("Nascosto ai giocatori", "Hidden from players")}</span><small class="muted rt-deck-note">${t("Le carte giocate sul tavolo le vedono tutti, senza il nome del mazzo.", "Cards played on the table are seen by everyone, without the deck's name.")}</small>`;
  const summary = view.pileHidden
    ? `<span>${t("Mazzo non mostrato ai giocatori: vedi solo le carte dei tuoi personaggi.", "Deck not shown to players: you see only your characters' cards.")}</span>`
    : `<span>${view.counts.pile} ${t("nel mazzo", "in the deck")} · ${discarded}${view.shuffled ? "" : " · " + t("ordine di creazione, non mescolato", "authored order, not shuffled")}</span>`;
  return `<div class="rt-decks">${select}
    <div class="rt-deck-summary"><div class="rt-pile" aria-label="${esc(view.pileHidden ? ctx.label(deck.name) : t(`Mazzo ${ctx.label(deck.name)}: ${cardsText(ctx, view.counts.pile)}`, `${ctx.label(deck.name)} deck: ${cardsText(ctx, view.counts.pile)}`))}"><span class="rt-card-back" aria-hidden="true"></span><div><strong>${esc(ctx.label(deck.name))}</strong>${summary}${ctx.role === "dm" ? visibility : ""}</div></div><div class="toolbar">${manage}${draw}</div></div>
    <section class="rt-zone" aria-labelledby="rt-zone-table"><h3 id="rt-zone-table">${t("Sul tavolo", "On the table")}</h3><div class="rt-card-row">${tableCards}</div></section>${others}
    <section class="rt-zone" aria-labelledby="rt-zone-hands"><h3 id="rt-zone-hands">${t("Mani", "Hands")}</h3><div class="rt-hands">${hands}</div></section>
    ${view.pileHidden ? "" : `<section class="rt-zone" aria-labelledby="rt-zone-discard"><h3 id="rt-zone-discard">${t("Scarti", "Discard pile")}</h3><p>${view.counts.discard ? `${cardsText(ctx, view.counts.discard)}${discardFaces ? ` · ${t("scoperte", "face up")}: ${discardFaces}` : ""}` : t("Nessuno scarto.", "Nothing discarded.")}</p></section>`}
    <p class="muted rt-boundary">${t("Le carte non applicano effetti: il loro significato resta una decisione del tavolo.", "Cards apply no effects: their meaning stays a table decision.")}</p></div>`;
}

export function bindDeckPanel(root, ctx, api) {
  const deck = () => currentDeck(ctx, api);
  const act = (label, fn, options) =>
    api.act(
      ctx,
      label,
      (draft) =>
        fn(
          api.slice(draft).decks.find((entry) => entry.id === deck().id),
          draft,
        ),
      options,
    );
  const on = (selector, handler) =>
    root
      .querySelectorAll(selector)
      .forEach((el) => el.addEventListener("click", () => handler(el)));
  root.querySelectorAll("[data-rt-deck]").forEach((el) =>
    el.addEventListener("change", () => {
      api.setDeckId(el.value);
      ctx.render();
    }),
  );
  const name = () => ctx.label(deck().name);
  // Every command's label and visibility come from deckLabel: a hidden deck's name never
  // reaches a shared log line or the chat (B17 reads the same log).
  const move = (parts, fn, { seen = false, focus } = {}) => {
    const { label, options } = deckLabel(ctx, deck(), parts, { seen });
    return act(label, fn, { focus, ...options });
  };
  const actorName = (id) => ctx.state.actors[id]?.name ?? "";
  const cardName = (id) => ctx.label(cardById(deck(), id)?.name);
  on("[data-rt-deck-shuffle]", () =>
    act(
      ctx.t(`Mazzo ${name()} mescolato`, `${name()} deck shuffled`),
      (entry) => shuffleDeck(entry, ctx.role, api.rollDie),
      { focus: "[data-rt-deck-deal]", ...deckCommitOptions(deck()) },
    ),
  );
  on("[data-rt-deck-draw]", () => {
    const actorId = root.querySelector("[data-rt-deck-drawer]")?.value;
    move(
      [`${actorName(actorId)} pesca una carta`, `${actorName(actorId)} draws a card`],
      (entry, draft) => drawCard(draft, entry, actorId, ctx.role),
      { focus: "[data-rt-deck-draw]" },
    );
  });
  on("[data-rt-card-play]", (el) =>
    move(
      [
        `${actorName(el.dataset.actor)} gioca scoperta: ${cardName(el.dataset.rtCardPlay)}`,
        `${actorName(el.dataset.actor)} plays face up: ${cardName(el.dataset.rtCardPlay)}`,
      ],
      (entry, draft) =>
        playCard(draft, entry, el.dataset.actor, el.dataset.rtCardPlay, true, ctx.role),
      { seen: true },
    ),
  );
  on("[data-rt-card-play-hidden]", (el) =>
    move(
      [
        `${actorName(el.dataset.actor)} gioca una carta coperta`,
        `${actorName(el.dataset.actor)} plays a card face down`,
      ],
      (entry, draft) =>
        playCard(draft, entry, el.dataset.actor, el.dataset.rtCardPlayHidden, false, ctx.role),
      { seen: true },
    ),
  );
  on("[data-rt-card-flip]", (el) =>
    move(
      [
        `Carta scoperta: ${cardName(el.dataset.rtCardFlip)}`,
        `Card revealed: ${cardName(el.dataset.rtCardFlip)}`,
      ],
      (entry, draft) => flipCard(draft, entry, el.dataset.rtCardFlip, ctx.role),
      { seen: true },
    ),
  );
  on("[data-rt-card-discard]", (el) =>
    move(
      ["Una carta va negli scarti", "A card goes to the discard pile"],
      (entry, draft) => discardCard(draft, entry, el.dataset.rtCardDiscard, ctx.role),
      { seen: true },
    ),
  );
  on("[data-rt-card-pass]", (el) =>
    openPassDialog(ctx, api, deck(), el.dataset.actor, el.dataset.rtCardPass),
  );
  on("[data-rt-deck-deal]", () => openDealDialog(ctx, api, deck()));
  on("[data-rt-deck-recall]", () => openRecallDialog(ctx, api, deck()));
}

function openDealDialog(ctx, api, deck) {
  const { t, esc } = ctx;
  const recipients = deckRecipients(ctx.state);
  ctx.dialog(
    t(`Distribuisci: ${ctx.label(deck.name)}`, `Deal: ${ctx.label(deck.name)}`),
    `<p class="muted">${t(`Nel mazzo ${deck.pile.length === 1 ? "resta 1 carta" : `restano ${deck.pile.length} carte`}. Ogni destinatario riceve le carte nella propria mano privata.`, `${cardsText(ctx, deck.pile.length)} ${deck.pile.length === 1 ? "remains" : "remain"} in the deck. Each recipient gets them in their private hand.`)}</p><div class="form-grid"><label class="field">${t("Carte a testa", "Cards each")}<input type="number" name="count" min="1" max="${DECK_LIMITS.deal}" value="1" required></label><label class="field">${t("Da dove", "Draw from")}<select name="from"><option value="top">${t("Dall’alto", "Top")}</option><option value="bottom">${t("Dal fondo", "Bottom")}</option><option value="random">${t("A caso", "Random")}</option></select></label></div><fieldset class="rt-fieldset"><legend>${t("Destinatari", "Recipients")}</legend>${recipients.map((actor) => `<label class="check-field"><input type="checkbox" name="recipient" value="${esc(actor.id)}"> ${esc(actor.name)}</label>`).join("")}</fieldset>`,
    {
      submitLabel: t("Distribuisci", "Deal"),
      onSubmit: (data) => {
        const ids = data.getAll("recipient");
        const count = Number(data.get("count"));
        const names = ids.map((id) => ctx.state.actors[id]?.name).join(", ");
        const { label, options } = deckLabel(ctx, deck, [
          `${count} ${count === 1 ? "carta" : "carte"} a ${names}`,
          `${count} ${count === 1 ? "card" : "cards"} to ${names}`,
        ]);
        api.act(
          ctx,
          label,
          (draft) =>
            dealCards(
              draft,
              api.slice(draft).decks.find((entry) => entry.id === deck.id),
              { recipients: ids, count, from: data.get("from") },
              ctx.role,
              api.rollDie,
            ),
          { throwErrors: true, ...options },
        );
      },
    },
  );
}

function openRecallDialog(ctx, api, deck) {
  const { t } = ctx;
  const counts = deckCounts(deck);
  ctx.dialog(
    t(`Richiama: ${ctx.label(deck.name)}`, `Recall: ${ctx.label(deck.name)}`),
    `<p>${t(`Tornano nel mazzo le carte sul tavolo (${cardsText(ctx, counts.table)}) e negli scarti (${cardsText(ctx, counts.discard)}).`, `Cards on the table (${cardsText(ctx, counts.table)}) and in the discard pile (${cardsText(ctx, counts.discard)}) return to the deck.`)}</p><label class="check-field"><input type="checkbox" name="hands"> ${t(`Richiama anche le carte nelle mani (${cardsText(ctx, counts.hands)})`, `Also recall the cards in hands (${cardsText(ctx, counts.hands)})`)}</label><label class="check-field"><input type="checkbox" name="shuffle" checked> ${t("Mescola dopo il richiamo", "Shuffle after recalling")}</label>`,
    {
      submitLabel: t("Richiama", "Recall"),
      onSubmit: (data) =>
        api.act(
          ctx,
          t(`Mazzo ${ctx.label(deck.name)} richiamato`, `${ctx.label(deck.name)} deck recalled`),
          (draft) =>
            recallCards(
              api.slice(draft).decks.find((entry) => entry.id === deck.id),
              { includeHands: data.get("hands") === "on", shuffle: data.get("shuffle") === "on" },
              ctx.role,
              api.rollDie,
            ),
          { throwErrors: true, ...deckCommitOptions(deck) },
        ),
    },
  );
}

function openPassDialog(ctx, api, deck, fromActorId, cardId) {
  const { t, esc } = ctx;
  const others = deckRecipients(ctx.state).filter((actor) => actor.id !== fromActorId);
  ctx.dialog(
    t("Passa la carta", "Pass the card"),
    `<p>${esc(ctx.label(cardById(deck, cardId)?.name))}</p><label class="field">${t("A chi", "To whom")}<select name="to">${others.map((actor) => `<option value="${esc(actor.id)}">${esc(actor.name)}</option>`).join("")}</select></label><p class="muted">${t("La carta entra coperta nella mano privata del destinatario.", "The card enters the recipient's private hand face down.")}</p>`,
    {
      submitLabel: t("Passa", "Pass"),
      onSubmit: (data) => {
        const { label, options } = deckLabel(
          ctx,
          deck,
          [
            `${ctx.state.actors[fromActorId]?.name} passa una carta a ${ctx.state.actors[data.get("to")]?.name}`,
            `${ctx.state.actors[fromActorId]?.name} passes a card to ${ctx.state.actors[data.get("to")]?.name}`,
          ],
          { seen: true },
        );
        api.act(
          ctx,
          label,
          (draft) =>
            passCard(
              draft,
              api.slice(draft).decks.find((entry) => entry.id === deck.id),
              fromActorId,
              cardId,
              data.get("to"),
              ctx.role,
            ),
          { throwErrors: true, ...options },
        );
      },
    },
  );
}

/** Deck editor for Preparation (DM). `editor.draft` is a deckDraft(). */
export function renderDeckEditor(ctx, api, editor) {
  const { t, esc } = ctx;
  const draft = editor.draft;
  const deck = draft.id ? api.slice(ctx.state).decks.find((entry) => entry.id === draft.id) : null;
  const counts = deck ? deckCounts(deck) : null;
  // A card is placed one by one only where the DM may see it (knownPlace): private hands
  // and face-down cards are counts, never names, and while any exists the pile's cards are
  // not marked either (the complement would reveal them).
  const unseen = deck ? unseenOutside(ctx.state, deck, ctx.role) : 0;
  const where = (cardId) => {
    if (!deck || !cardId || !locateCard(deck, cardId)) return t("nuova", "new");
    const place = knownPlace(ctx.state, deck, cardId, ctx.role);
    if (!place) return unseen ? "" : t("nel mazzo", "in the deck");
    if (place.zone === "hand")
      return t(
        `in mano a ${ctx.state.actors[place.actorId]?.name}`,
        `in ${ctx.state.actors[place.actorId]?.name}'s hand`,
      );
    const faceDown = place.entry.faceUp ? "" : t(" (coperta)", " (face down)");
    return place.zone === "table"
      ? t("sul tavolo", "on the table") + faceDown
      : t("negli scarti", "discarded");
  };
  const zones = deck
    ? [
        `${t("Nel mazzo", "In the deck")} ${counts.pile}`,
        ...Object.entries(deck.hands)
          .filter(([, list]) => list.length)
          .map(
            ([actorId, list]) =>
              `${t("in mano a", "in the hand of")} ${ctx.state.actors[actorId]?.name ?? "?"} ${list.length}`,
          ),
        `${t("sul tavolo", "on the table")} ${counts.table}${deck.table.some((e) => !e.faceUp) ? ` (${t("coperte", "face down")} ${deck.table.filter((e) => !e.faceUp).length})` : ""}`,
        `${t("scarti", "discard")} ${counts.discard}${deck.discard.some((e) => !e.faceUp) ? ` (${t("coperti", "face down")} ${deck.discard.filter((e) => !e.faceUp).length})` : ""}`,
      ].join(" · ")
    : "";
  const rows = draft.cards
    .map((card, i) => {
      const badge = where(card.id);
      return `<li class="rt-edit-card"><label class="field">${t("Nome", "Name")} ${i + 1}<input data-rt-card-field="name" data-index="${i}" maxlength="${DECK_LIMITS.name}" value="${esc(ctx.label(card.name))}"></label><label class="field">${t("Testo", "Text")}<input data-rt-card-field="text" data-index="${i}" maxlength="${DECK_LIMITS.text}" value="${esc(ctx.label(card.text))}"></label>${badge ? `<span class="badge">${esc(badge)}</span>` : ""}<button type="button" class="button quiet" data-rt-card-remove="${i}" aria-label="${esc(t(`Rimuovi la carta ${i + 1}`, `Remove card ${i + 1}`))}">${ctx.icon("close")}</button></li>`;
    })
    .join("");
  return `<div class="rt-editor-body">
    <div class="form-grid"><label class="field">${t("Nome del mazzo", "Deck name")}<input data-rt-field="name" maxlength="${DECK_LIMITS.name}" value="${esc(draft.name)}" required></label>
    <fieldset class="rt-fieldset"><legend>${t("Impostazioni del mazzo", "Deck settings")}</legend><label class="check-field"><input type="checkbox" data-rt-setting="showToPlayers" ${draft.settings.showToPlayers ? "checked" : ""}> ${t("Mostra ai giocatori", "Show to players")}</label><label class="check-field"><input type="checkbox" data-rt-setting="playersMayDraw" ${draft.settings.playersMayDraw ? "checked" : ""} ${draft.settings.showToPlayers ? "" : 'disabled aria-describedby="rt-deck-hidden-note"'}> ${t("I giocatori possono pescare", "Players may draw")}</label><label class="check-field"><input type="checkbox" data-rt-setting="dmSeesHands" ${draft.settings.dmSeesHands ? "checked" : ""}> ${t("Il DM vede le facce nelle mani", "The DM sees the faces in hands")}</label>${draft.settings.showToPlayers ? "" : `<p class="muted" id="rt-deck-hidden-note">${t("Nascosto: i giocatori non vedono il mazzo né le sue carte, tranne quelle che ricevono e quelle giocate sul tavolo (senza il nome del mazzo).", "Hidden: players see neither the deck nor its cards, except the ones they receive and the ones played on the table (without the deck's name).")}</p>`}</fieldset></div>
    ${counts ? `<p class="muted" data-rt-deck-zones>${esc(zones)}</p>${unseen ? `<p class="muted">${t("Le carte in mani private o coperte non sono indicate una per una: le facce restano di chi le tiene.", "Cards in private hands or face down are not shown one by one: their faces stay with whoever holds them.")}</p>` : ""}` : ""}
    <h3>${t("Carte", "Cards")} (${draft.cards.length})</h3><ol class="rt-edit-cards">${rows}</ol>
    <label class="field">${t("Aggiungi carte in blocco: una per riga, «Nome — testo»", "Add cards in bulk: one per line, “Name — text”")}<textarea data-rt-bulk rows="3" placeholder="${esc(t("La Campana — Qualcuno ti chiama per nome.", "The Bell — Someone calls you by name."))}"></textarea></label>
    <div class="toolbar"><button type="button" class="button" data-rt-card-add>${ctx.icon("plus")} ${t("Aggiungi una carta", "Add a card")}</button><button type="button" class="button" data-rt-bulk-add>${t("Aggiungi le righe", "Add the lines")}</button></div></div>`;
}

export function bindDeckEditor(root, ctx, api) {
  const editor = api.editor();
  const draft = editor.draft;
  root.querySelectorAll("[data-rt-field]").forEach((el) =>
    el.addEventListener("input", () => {
      draft.name = el.value;
      api.markDirty();
    }),
  );
  root.querySelectorAll("[data-rt-setting]").forEach((el) =>
    el.addEventListener("change", () => {
      draft.settings[el.dataset.rtSetting] = el.checked;
      api.markDirty();
      // "Players may draw" only applies to a shown deck: the editor re-renders to say so.
      if (el.dataset.rtSetting === "showToPlayers") {
        api.focus('[data-rt-setting="showToPlayers"]');
        ctx.render();
      }
    }),
  );
  root.querySelectorAll("[data-rt-card-field]").forEach((el) =>
    el.addEventListener("input", () => {
      draft.cards[Number(el.dataset.index)][el.dataset.rtCardField] = el.value;
      api.markDirty();
    }),
  );
  root.querySelectorAll("[data-rt-card-remove]").forEach((el) =>
    el.addEventListener("click", () => {
      draft.cards.splice(Number(el.dataset.rtCardRemove), 1);
      api.markDirty(true);
      api.focus("[data-rt-card-add]");
      ctx.render();
    }),
  );
  root.querySelectorAll("[data-rt-card-add]").forEach((el) =>
    el.addEventListener("click", () => {
      draft.cards.push({ id: null, name: "", text: "" });
      api.markDirty(true);
      api.focus(`[data-rt-card-field="name"][data-index="${draft.cards.length - 1}"]`);
      ctx.render();
    }),
  );
  root.querySelectorAll("[data-rt-bulk-add]").forEach((el) =>
    el.addEventListener("click", () => {
      const lines = parseBulkCards(root.querySelector("[data-rt-bulk]")?.value);
      if (!lines.length) {
        ctx.toast(ctx.t("Scrivi almeno una riga.", "Write at least one line."), true);
        return;
      }
      draft.cards.push(...lines);
      api.markDirty(true);
      api.focus("[data-rt-bulk]");
      ctx.render();
    }),
  );
}

/** Sheet box (Extras): the character's cards; faces only where the hand is visible. */
export function renderHandSection(ctx, actor, api) {
  const { t, esc } = ctx;
  const decks = api.slice(ctx.state).decks.filter((deck) => (deck.hands[actor.id] ?? []).length);
  if (!decks.length) return "";
  return `<section class="rt-sheet-hand"><h3>${t("Carte in mano", "Cards in hand")}</h3>${decks
    .map((deck) => {
      const list = deck.hands[actor.id];
      const visible = canSeeHand(deck, actor, ctx.role);
      return `<div><p><strong>${esc(ctx.label(deck.name))}</strong> · ${cardsText(ctx, list.length)}</p>${visible ? `<div class="rt-card-row">${list.map((id) => cardHTML(ctx, cardById(deck, id))).join("")}</div>` : `<p class="muted">${t("Mano privata di chi gioca il personaggio.", "Private hand of the character's player.")}</p>`}</div>`;
    })
    .join(
      "",
    )}<button type="button" class="button" data-rt-hand-table>${t("Gioca le carte al Tavolo", "Play cards at the Table")}</button></section>`;
}
