// B23 — search, command palette, quick create, guide and shortcut editor with the real
// store, registry and campaign-content domain. UI handlers are driven through the palette
// controller and the editor handlers, with a fake shell ctx (dialog, navigate, toast).
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import * as content from "../campaign-content.mjs";
import * as compendium from "../compendium.mjs";
import * as chat from "../chat.mjs";
import * as hb from "../homebrew.mjs";
import * as P from "../command-palette.mjs";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}
// A tiny area with its own permitted search results and a DM-only command.
function fakeArea(api) {
  api.add("search", {
    id: "lore-search",
    label: { it: "Cronache", en: "Chronicles" },
    search: (ctx, query) =>
      ["Lanterna di Bruma", "Diario della torre"]
        .filter((title) => title.toLowerCase().includes(String(query).toLowerCase()))
        .map((title) => ({ title, page: "campaign", params: { tab: "lore", id: title.length } })),
  });
  api.add("command", {
    id: "lore.secret",
    label: { it: "Prepara il segreto", en: "Prepare the secret" },
    roles: ["dm"],
    run: () => {},
  });
}
function world({ areas = [["compendium", compendium.register]], storage = memoryStorage() } = {}) {
  const registry = createRegistry({ document: null, logger: null, deviceStorage: memoryStorage() });
  for (const [id, register] of areas) registry.use(id, register);
  registry.use("lore", fakeArea);
  registry.use("command-palette", P.register);
  const store = createStore({ storage });
  registry.initState(store.state);
  const log = { navigate: [], toasts: [], dialogs: [], closed: 0 };
  const make = (role = "player", view = {}, lang = "it") => {
    const ctx = {
      get state() {
        return store.state;
      },
      role,
      lang,
      offline: false,
      view: { page: "home", id: "", tab: "", ...view },
      registry,
      t: (it, en) => (ctx.lang === "it" ? it : en),
      esc: (v) => String(v),
      label: (v) => (typeof v === "object" ? v[ctx.lang] : v),
      icon: () => "",
      commit(label, mutator, options = {}) {
        if (ctx.offline && !options.local)
          throw Object.assign(Error("offline"), { it: "senza rete", en: "offline" });
        store.commit(label, mutator, role, {
          shared: !options.local,
          visibility: options.visibility,
          undoable: options.undoable,
        });
        return { applied: true, persisted: true };
      },
      toast: (text, error = false) => log.toasts.push({ text, error }),
      navigate: (page, params = {}) => log.navigate.push({ page, params }),
      dialog: (title, body, options) => log.dialogs.push({ title, body, options }),
      closeDialog: () => log.closed++,
      canUndo: () => false,
      undo: () => {},
      openRest: (actorId) => log.navigate.push({ page: "rest", params: { actorId } }),
    };
    return ctx;
  };
  registry.attach(make());
  return { registry, store, log, make };
}
const titles = (items, lang = "it") =>
  items.map((item) => (typeof item.title === "object" ? item.title[lang] : item.title));
const form = (fields) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};
const keydown = (key, extra = {}) => {
  const event = {
    key,
    code: extra.code ?? "",
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    defaultPrevented: false,
    preventDefault() {
      event.defaultPrevented = true;
    },
    ...extra,
  };
  return event;
};

beforeEach(() => P.clearMemory());

test("the area replaces the header Search, registers its commands and a personal slice", () => {
  const { registry, make } = world();
  const report = registry.extensions().find((row) => row.id === "command-palette");
  assert.equal(report.status, "built");
  const search = registry.get("service", "search", make());
  assert.equal(search.replaces, true);
  assert.equal(search.header, true);
  const byId = Object.fromEntries(registry.list("command", make("dm")).map((c) => [c.id, c]));
  assert.equal(byId["command-palette.open"].shortcut, "Mod+K");
  assert.equal(byId["command-palette.create"].shortcut, "N");
  assert.equal(byId["command-palette.guide"].shortcut, "?");
  assert.equal(byId["command-palette.rests"].shortcut, "Y");
  assert.equal(byId["command-palette.encounter"].shortcut, "Alt+R");
  assert.equal(byId["command-palette.end-turn"].context, "table");
  assert.ok(
    !registry.list("command", make("player")).some((c) => c.id === "command-palette.encounter"),
  );
  assert.deepEqual(registry.conflicts(), []);
  assert.deepEqual(make().state.ext["command-palette"], { bindings: { player: {}, dm: {} } });
});

test("the header Search service opens the palette in the common dialog", () => {
  const { registry, make, log } = world();
  const ctx = make("player");
  assert.equal(registry.run(registry.get("service", "search", ctx), ctx), true);
  assert.equal(log.dialogs.at(-1).title, "Cerca e comandi");
  assert.equal(log.dialogs.at(-1).options.submitLabel, "Apri");
  assert.ok(P.paletteSession(), "the controller of the open palette");
});

test("fuzzy matching: prefixes, words, typos from four letters, full text", () => {
  const item = (names, text = "") => ({ names, text });
  assert.equal(P.matchScore(item(["Livia"]), "livia"), 1000);
  assert.equal(P.matchScore(item(["Livia"]), "liv"), 900);
  assert.equal(P.matchScore(item(["Appunti di Livia"]), "liv"), 800);
  assert.equal(P.matchScore(item(["Vai a: Tavolo"]), "tavolo"), 850, "whole word");
  // SV-03: text inside a word counts only from five letters ("api" is not "rapier").
  assert.equal(P.matchScore(item(["Oblivion"]), "liv"), 0);
  assert.equal(P.matchScore(item(["Oblivion"]), "blivi"), 600);
  assert.equal(P.matchScore(item(["Dardo incantato"]), "dar inc"), 650);
  assert.equal(P.matchScore(item(["Concentrazione"]), "concentrazoine"), 400);
  assert.equal(P.matchScore(item(["Livia"]), "lvia"), 400);
  assert.equal(P.matchScore(item(["Livia"]), "lvi"), 0, "no typo tolerance under four letters");
  assert.equal(P.matchScore(item(["Città"]), "citta"), 1000, "accents are folded");
  assert.equal(P.matchScore(item(["Torre"], "La lanterna brilla"), "lanterna"), 300);
  assert.equal(P.osa("oi", "io"), 1);
  assert.deepEqual(P.snippet("Una lanterna illumina il cortile", "LANTERNA").match, "lanterna");
});

test("prefix grammar: > commands, ? help, @filter with or without a query", () => {
  assert.deepEqual(P.parseQuery("> fine"), { mode: "commands", query: "fine" });
  assert.equal(P.parseQuery("?").mode, "help");
  assert.deepEqual(P.parseQuery("@inc"), { mode: "filters", query: "inc" });
  const parsed = P.parseQuery("@incantesimi dardo");
  assert.equal(parsed.filter.id, "spells");
  assert.equal(parsed.query, "dardo");
  assert.equal(parsed.consumed, "@incantesimi ".length);
  assert.equal(P.parseQuery("@spells fire").filter.id, "spells", "English names work too");
  assert.equal(P.parseQuery("@note ").filter.id, "notes");
  assert.equal(P.parseQuery("@zzz abc").mode, "filters");
  assert.equal(P.matchFilter("magie").id, "spells");
});

test("'liv' finds Livia first with type badges; a typo still finds Concentrazione", () => {
  const { make } = world();
  const ctx = make("player");
  const liv = P.searchPalette(ctx, "liv");
  assert.equal(liv.items[0].type, "character");
  assert.equal(liv.items[0].title, "Livia");
  assert.equal(liv.items[0].target.page, "characters");
  assert.ok(
    liv.items.some((item) => item.type === "item"),
    "Livia's inventory is searchable",
  );
  const typo = P.searchPalette(ctx, "concentrazoine");
  assert.equal(titles(typo.items)[0], "Concentrazione");
  assert.equal(typo.items[0].type, "rule");
  assert.deepEqual(typo.items[0].target, {
    page: "library",
    params: { tab: "compendium", revision: "srd2024:rule:concentration" },
  });
  // Area providers are searched through their own permitted results.
  const lore = P.searchPalette(ctx, "lanterna");
  assert.ok(
    lore.items.some((i) => i.provider === "lore-search" && i.title === "Lanterna di Bruma"),
  );
  // English interface, English names.
  const en = P.searchPalette(make("player", {}, "en"), "fire bolt");
  assert.ok(en.items.some((i) => i.type === "spell" && i.title.en === "Fire Bolt"));
});

test("> lists only the commands this identity may run; @ filters the entries", () => {
  const { make } = world();
  const player = P.searchPalette(make("player"), ">");
  const dm = P.searchPalette(make("dm"), ">");
  assert.equal(player.mode, "commands");
  assert.ok(player.items.every((item) => item.type === "command"));
  const has = (result, it) => titles(result.items).includes(it);
  assert.ok(has(dm, "Prepara il segreto") && !has(player, "Prepara il segreto"));
  assert.ok(has(dm, "Avvia o concludi il combattimento"));
  assert.ok(!has(player, "Avvia o concludi il combattimento"));
  assert.ok(has(player, "Vai a: Tavolo") && has(player, "Creazione rapida"));
  assert.ok(
    !has(player, "Vai a: Campagna · Preparazione") && has(dm, "Vai a: Campagna · Preparazione"),
  );
  const filters = P.searchPalette(make("player"), "@");
  assert.equal(filters.mode, "filters");
  assert.ok(titles(filters.items).includes("Incantesimi"));
  assert.ok(titles(filters.items).includes("Cronache"), "one filter per area provider");
  const spells = P.searchPalette(make("player"), "@incantesimi dardo");
  assert.ok(spells.items.length >= 2 && spells.items.every((item) => item.type === "spell"));
  const lore = P.searchPalette(make("player"), "@cronache torre");
  assert.deepEqual(titles(lore.items), ["Diario della torre"]);
});

test("from the Spells tab the palette opens already filtered to spells (Quick Insert context)", () => {
  const { make } = world();
  const ctx = make("player", { page: "characters", id: "livia", tab: "spells" });
  assert.equal(P.contextFilter(ctx.view), "spells");
  const palette = P.createPalette(ctx);
  assert.equal(palette.state.filter, "spells");
  assert.equal(palette.state.text, "");
  const first = palette.state.result.items.slice(0, 4);
  assert.ok(first.every((item) => item.type === "spell" && item.contextual));
  assert.ok(first.some((item) => item.title.it === "Dardo di fuoco"));
  // Removing the filter searches everything again.
  palette.setFilter(null);
  palette.setText("livia");
  assert.equal(palette.state.result.items[0].type, "character");
  // The scoped search is not remembered for the next palette opened elsewhere.
  assert.equal(P.createPalette(make("player")).state.filter, null);
  assert.equal(P.createPalette(make("player")).state.text, "");
});

test("N quick create: one private entry, same view, found by 'liv', never by the DM", () => {
  const { make, log, store } = world();
  const player = make("player", { page: "table" });
  const result = P.submitQuickCreate(
    player,
    form({
      kind: "note",
      title: "Livia ha visto il simbolo",
      body: "Sul portone, inciso di recente.",
    }),
  );
  assert.equal(log.navigate.length, 0, "the view does not change: back to the context");
  assert.match(log.toasts.at(-1).text, /solo tu la vedi/);
  const entry = content.getCampaignEntry(store.state, result.entryId, "player");
  assert.equal(entry.kind, "note");
  assert.equal(entry.access.mode, "private");
  assert.equal(store.state.log.at(-1).visibility, "private");
  const liv = P.searchPalette(player, "liv");
  const note = liv.items.find((item) => item.key === "entry:" + result.entryId);
  assert.equal(note.type, "note");
  assert.equal(note.scope.it, "Solo io");
  assert.ok(liv.items.findIndex((i) => i === note) > 0, "the character stays first");
  // Full text: the body is searchable with a highlighted snippet.
  assert.ok(P.searchPalette(player, "portone").items.some((i) => i.key === note.key));
  // The DM never sees the personal note, even by its words.
  assert.ok(!P.searchPalette(make("dm"), "simbolo").items.some((i) => i.key === note.key));
  // It is the first recent destination of the player only.
  assert.equal(P.loadMemory("player").recent[0].key, note.key);
  assert.equal(P.loadMemory("dm").recent.length, 0);
  // World entries of the campaign too; offline works because it is private.
  player.offline = true;
  const place = P.submitQuickCreate(player, form({ kind: "place", title: "Torre Grigia" }));
  assert.equal(
    content.getCampaignEntry(store.state, place.entryId, "player").data.worldType,
    "place",
  );
  assert.throws(() => P.submitQuickCreate(player, form({ kind: "note", title: "  " })), /title/);
  assert.throws(() => P.submitQuickCreate(player, form({ kind: "dragon", title: "x" })), /type/);
});

test("quick create dialog offers only personal notes without a campaign", () => {
  const { make, log, store } = world();
  const ctx = make("player");
  P.openQuickCreate(ctx, { title: "Da ricordare" });
  const body = log.dialogs.at(-1).body;
  assert.match(body, /value="place"/);
  assert.match(body, /value="Da ricordare"/);
  store.state.campaign.members = store.state.campaign.members.filter((m) => m.id !== "player");
  P.openQuickCreate(ctx);
  assert.doesNotMatch(log.dialogs.at(-1).body, /value="place"/);
  assert.throws(
    () => P.createQuickEntry(store.state, { kind: "quest", title: "x", id: "q1" }, "player"),
    /campaign/,
  );
});

test("controller: arrows wrap, Enter opens, the query and the way back are remembered", () => {
  const { make, log } = world();
  const ctx = make("player", { page: "table" });
  const palette = P.createPalette(ctx);
  palette.setText("liv");
  const n = palette.state.result.items.length;
  palette.move(-1);
  assert.equal(palette.state.active, n - 1);
  palette.move(1);
  assert.equal(palette.state.active, 0);
  assert.equal(palette.choose(), "open");
  assert.deepEqual(log.navigate.at(-1), {
    page: "characters",
    params: { id: "livia", tab: "actions" },
  });
  // Reopened: the last search and the context we came from are there (I-184).
  const sheet = make("player", { page: "characters", id: "livia", tab: "actions" });
  const again = P.createPalette(sheet);
  assert.equal(again.state.text, "liv");
  again.setText("");
  const back = again.state.result.items[0];
  assert.equal(back.origin, true);
  assert.equal(back.title.it, "Torna a: Tavolo");
  assert.equal(again.choose(0), "open");
  assert.equal(log.navigate.at(-1).page, "table");
  // Recents list Livia, re-checked against current access.
  const home = P.createPalette(make("player"), { text: "" });
  assert.ok(home.state.result.items.some((i) => i.group === "recent" && i.title === "Livia"));
  // Filters and help rows keep the palette open.
  const f = P.createPalette(make("player"), { text: "@inc" });
  assert.equal(f.choose(0), "stay");
  assert.equal(f.state.filter, "spells");
  assert.equal(f.state.text, "");
  const h = P.createPalette(make("player"), { text: "?" });
  assert.equal(h.choose(0), "stay");
  assert.equal(h.state.text, ">");
  // Typing "@note " applies the filter and strips it from the text.
  const typed = P.createPalette(make("player"), { text: "" });
  typed.setText("@note liv");
  assert.equal(typed.state.filter, "notes");
  assert.equal(typed.state.text, "liv");
});

test("revocation: a shared place disappears from search and recents once unshared", () => {
  const { make, store } = world();
  const dm = make("dm");
  const created = P.submitQuickCreate(
    dm,
    form({ kind: "place", title: "Torre Grigia", body: "Rovina a nord." }),
  );
  const player = make("player");
  assert.ok(
    !P.searchPalette(player, "torre grigia").items.some(
      (i) => i.key === "entry:" + created.entryId,
    ),
  );
  const share = (mode) =>
    dm.commit("share", (s) => {
      const entry = content.getCampaignEntry(s, created.entryId, "dm");
      content.setCampaignEntryAccess(
        s,
        created.entryId,
        { access: { mode, grants: [] }, expectedAccessRevision: entry.accessRevision },
        "dm",
      );
    });
  share("campaign");
  const palette = P.createPalette(player, { text: "torre grigia" });
  const found = palette.state.result.items.find((i) => i.key === "entry:" + created.entryId);
  assert.equal(found.type, "place");
  assert.equal(found.scope.it, "Campagna");
  palette.choose(palette.state.result.items.indexOf(found));
  share("private");
  assert.ok(!P.searchPalette(player, "torre").items.some((i) => i.key === found.key));
  const recent = P.resolveRecent(player);
  assert.equal(recent[0].type, "gone");
  assert.equal(recent[0].title.it, "Voce non più disponibile");
  assert.ok(!JSON.stringify(recent[0].title).includes("Torre"), "the old title is not shown");
  const cleanup = P.createPalette(player, { text: "" });
  const gone = cleanup.state.result.items.findIndex((i) => i.gone);
  assert.equal(cleanup.choose(gone), "stay");
  assert.equal(P.loadMemory("player").recent.length, 0);
  assert.ok(store.state.campaignContent.entries.some((e) => e.id === created.entryId));
});

test("private sheets stay private in search", () => {
  const { make, store } = world();
  store.state.actors.livia.visibility = "private";
  assert.ok(P.searchPalette(make("player"), "liv").items.some((i) => i.key === "character:livia"));
  const dm = P.searchPalette(make("dm"), "liv").items;
  assert.ok(!dm.some((i) => i.key === "character:livia" || i.key.startsWith("item:livia")));
  assert.ok(P.searchPalette(make("dm"), "sentinella").items.some((i) => i.type === "npc"));
  assert.ok(!P.searchPalette(make("player"), "sentinella").items.some((i) => i.type === "npc"));
});

test("key dispatch: Mod+K anywhere, N not while typing, table keys only on the Table", () => {
  const { make, log } = world();
  const home = make("player");
  assert.equal(P.handleKeydown(keydown("k", { ctrlKey: true }), home), "command-palette.open");
  assert.equal(log.dialogs.at(-1).title, "Cerca e comandi");
  const typing = { closest: () => ({}) };
  assert.equal(P.handleKeydown(keydown("n", { target: typing }), home), null);
  assert.equal(
    P.handleKeydown(keydown("k", { metaKey: true, target: typing }), home),
    "command-palette.open",
  );
  assert.equal(P.handleKeydown(keydown("c", { ctrlKey: true, target: typing }), home), null);
  assert.equal(P.handleKeydown(keydown("n"), home), "command-palette.create");
  assert.equal(log.dialogs.at(-1).title, "Creazione rapida");
  assert.equal(P.handleKeydown(keydown("?"), home), "command-palette.guide");
  // Alt+R on a Mac arrives as "®": the physical key decides (DM only, Table only).
  const dm = make("dm", { page: "table" });
  assert.equal(P.handleKeydown(keydown("®", { altKey: true, code: "KeyR" }), make("dm")), null);
  assert.equal(
    P.handleKeydown(keydown("®", { altKey: true, code: "KeyR" }), dm),
    "command-palette.encounter",
  );
  assert.equal(
    P.handleKeydown(
      keydown("r", { altKey: true, code: "KeyR" }),
      make("player", { page: "table" }),
    ),
    null,
  );
  // Already handled elsewhere: untouched.
  const handled = keydown("k", { ctrlKey: true });
  handled.defaultPrevented = true;
  assert.equal(P.handleKeydown(handled, home), null);
});

test("editor: E conflict, move, reload persistence, refusal of reserved keys, reset", () => {
  const storage = memoryStorage();
  const first = world({ storage });
  const table = first.make("player", { page: "table" });
  P.openControls(table);
  assert.equal(first.log.dialogs.at(-1).title, "Configura le scorciatoie");
  const state = P.controlsState();
  // Y belongs to Rests (BG3); ask for it on End turn.
  state.capture = "command-palette.end-turn";
  assert.equal(P.captureKey(table, keydown("Shift")), "waiting");
  assert.equal(P.captureKey(table, keydown("y")), "conflict");
  assert.match(state.notice.html, /Riposi/);
  assert.match(P.controlsHTML(table), /data-control-confirm/);
  P.cancelPending(table);
  assert.equal(P.rowsFor(table).find((r) => r.id === "command-palette.end-turn").shortcut, null);
  state.capture = "command-palette.end-turn";
  P.captureKey(table, keydown("y"));
  assert.equal(P.confirmPending(table), true);
  let rows = P.rowsFor(table);
  assert.equal(rows.find((r) => r.id === "command-palette.end-turn").shortcut, "Y");
  assert.equal(rows.find((r) => r.id === "command-palette.rests").shortcut, null);
  // The key now ends the turn on the Table (refused: no combat) and does nothing elsewhere.
  assert.equal(P.handleKeydown(keydown("y"), table), "command-palette.end-turn");
  assert.equal(first.log.toasts.at(-1).text, "Nessun combattimento in corso.");
  const home = keydown("y");
  assert.equal(P.handleKeydown(home, first.make("player")), "suppressed");
  assert.equal(home.defaultPrevented, true, "the shell no longer runs the moved default");
  // Reserved keys are refused; Esc cancels a capture.
  state.capture = "command-palette.log";
  assert.equal(P.captureKey(table, keydown("Enter")), "reserved");
  assert.match(state.notice.html, /riservata/);
  state.capture = "command-palette.log";
  assert.equal(P.captureKey(table, keydown("Escape")), "cancelled");
  // Personal: the DM keeps the defaults; a reload keeps the player's choice.
  assert.equal(
    P.rowsFor(first.make("dm")).find((r) => r.id === "command-palette.rests").shortcut,
    "Y",
  );
  const second = world({ storage });
  const reloaded = second.make("player", { page: "table" });
  assert.equal(P.rowsFor(reloaded).find((r) => r.id === "command-palette.end-turn").shortcut, "Y");
  // Gameplay Undo never reverts personal shortcuts (preserved slice).
  const snapshot = structuredClone(second.store.state);
  snapshot.ext["command-palette"] = { bindings: { player: {}, dm: {} } };
  second.registry.afterUndo(second.store.state, snapshot);
  assert.equal(snapshot.ext["command-palette"].bindings.player["command-palette.end-turn"], "Y");
  // Guide marks the custom key; reset one, then everything with confirmation.
  assert.match(P.guideHTML(reloaded), /personalizzata/);
  P.resetRowBinding(reloaded, "command-palette.end-turn");
  assert.equal(P.rowsFor(reloaded).find((r) => r.id === "command-palette.end-turn").shortcut, null);
  P.clearRowBinding(reloaded, "command-palette.open");
  assert.equal(P.rowsFor(reloaded).find((r) => r.id === "command-palette.open").shortcut, null);
  assert.equal(P.resetAll(reloaded), 2);
  rows = P.rowsFor(reloaded);
  assert.equal(rows.find((r) => r.id === "command-palette.rests").shortcut, "Y");
  assert.equal(rows.find((r) => r.id === "command-palette.open").shortcut, "Mod+K");
  assert.equal(second.store.state.log.at(-1).visibility, "private");
});

test("the guide is generated per identity and reports load-time conflicts", () => {
  const takesN = (api) =>
    api.add("command", {
      id: "early.note",
      label: { it: "Nota veloce di prova", en: "Test quick note" },
      shortcut: "N",
      run: () => {},
    });
  const { make, registry } = world({ areas: [["early", takesN]] });
  assert.equal(registry.conflicts()[0].dropped, "command-palette/command-palette.create");
  const player = P.guideHTML(make("player"));
  assert.match(player, /Creazione rapida/);
  assert.match(player, /non ha la scorciatoia predefinita/);
  assert.doesNotMatch(player, /Avvia o concludi il combattimento/);
  assert.match(P.guideHTML(make("dm")), /Avvia o concludi il combattimento/);
  assert.match(P.guideHTML(make("player", {}, "en")), /Keyboard|Everywhere/);
  // The first area loaded keeps N: pressing it runs that area's command.
  assert.equal(P.handleKeydown(keydown("n"), make("player")), "early.note");
});

test("palette markup: combobox, listbox options with badges, status and footer", () => {
  const { make } = world();
  const ctx = make("player");
  const palette = P.createPalette(ctx, { text: "liv" });
  const html = P.paletteHTML(ctx, palette.state);
  assert.match(html, /role="combobox"/);
  assert.match(html, /role="listbox"/);
  assert.match(html, /aria-activedescendant="cmdk-opt-0"/);
  assert.match(html, /<span class="cmdk-type">Personaggio<\/span>/);
  assert.match(html, /<mark>Liv<\/mark>ia/);
  assert.match(html, /data-cmdk-create/);
  assert.match(P.statusText(ctx, palette.state), /risultati/);
  ctx.offline = true;
  assert.match(P.statusText(ctx, palette.state), /senza rete/);
  palette.setText("zzzzqqq");
  assert.match(P.listHTML(ctx, palette.state), /Nessun risultato/);
});

// ------------------------------------------------------------------ review fixes (24/09)

test("a query that matches nothing finds nothing, also in a context; Enter then does nothing", () => {
  const { make, log } = world();
  const table = make("player", { page: "table" });
  assert.deepEqual(P.searchPalette(table, "qqqzzzxx").items, []);
  assert.deepEqual(P.searchPalette(table, "gobbllin zzz").items, []);
  const palette = P.createPalette(table, { text: "gobbllin zzz" });
  assert.equal(palette.choose(), "stay", "Enter after a typo runs nothing");
  assert.equal(log.navigate.length, 0);
  assert.equal(log.toasts.length, 0);
  assert.match(P.listHTML(table, palette.state), /Nessun risultato/);
  // On the sheet's Spells tab: nonsense finds no spell, a real word keeps the sheet first.
  const spells = P.createPalette(
    make("player", { page: "characters", id: "livia", tab: "spells" }),
  );
  spells.setText("qqqzzzxx");
  assert.deepEqual(spells.state.result.items, []);
  spells.setFilter(null);
  assert.deepEqual(spells.state.result.items, []);
  spells.setText("dardo");
  assert.equal(spells.state.result.items[0].contextual, true, "the sheet's own spell first");
  // A matching Table command still gets the context bonus.
  assert.equal(P.searchPalette(table, "termina").items[0].row.id, "command-palette.end-turn");
});

test("revoked membership: no campaign chat or campaign-page area result reaches the search", () => {
  const { make, store } = world({
    areas: [
      ["compendium", compendium.register],
      ["chat", chat.register],
    ],
  });
  const player = make("player");
  assert.ok(
    P.searchPalette(player, "lanterna").items.some((i) => i.provider === "lore-search"),
    "a member finds the area's campaign results",
  );
  const s = store.state;
  s.campaign.members = [
    { id: "player", name: "Player", role: "player", active: false },
    { id: "dm", name: "DM", role: "dm", active: true },
  ];
  s.actors.doran.owner = "dm";
  s.actors.doran.name = "Nome del compagno riservato";
  assert.deepEqual(titles(P.searchPalette(player, "Nome del compagno").items), []);
  assert.ok(!P.searchPalette(player, "lanterna").items.some((i) => i.provider === "lore-search"));
  assert.ok(!JSON.stringify(P.searchPalette(player, "corda").items).includes("riservato"));
  // The DM still finds the chat.
  assert.ok(P.searchPalette(make("dm"), "Nome del compagno").items.some((i) => i.provider));
});

test("a failing source is reported, never shown as 'no result'", () => {
  const broken = (api) =>
    api.add("search", {
      id: "broken-search",
      label: { it: "Fonte guasta", en: "Broken source" },
      search: () => {
        throw Error("on purpose");
      },
    });
  const { make } = world({
    areas: [
      ["compendium", compendium.register],
      ["broken", broken],
    ],
  });
  const ctx = make("player");
  const palette = P.createPalette(ctx, { text: "zzqqxx" });
  assert.deepEqual(palette.state.result.failed, ["Fonte guasta"]);
  assert.match(P.statusText(ctx, palette.state), /non hanno risposto: Fonte guasta/);
  assert.match(P.listHTML(ctx, palette.state), /non hanno risposto/);
  // Other results still arrive.
  assert.ok(P.searchPalette(ctx, "livia").items.some((i) => i.title === "Livia"));
});

test("sheet spell rows open the sheet; homebrew and entries of another campaign are scoped", () => {
  const { make, store } = world();
  const player = make("player");
  const livia = P.searchPalette(player, "dardo di fuoco").items.find((i) =>
    i.key.startsWith("spell:livia:"),
  );
  assert.deepEqual(livia.target, {
    page: "characters",
    params: { id: "livia", tab: "spells" },
  });
  // A readable homebrew definition is searchable and opens in the Library.
  const s = store.state;
  hb.createHomebrewDraft(s, { id: "oath", kind: "create", type: "feature" }, "player");
  const draft = hb.getHomebrewDraft(s, "oath", "player");
  hb.saveHomebrewDraft(
    s,
    "oath",
    {
      expectedRevision: draft.revision,
      data: {
        ...draft.data,
        name: { it: "Giuramento della lanterna", en: "Lantern oath" },
        description: { it: "Capacità originale di esempio", en: "Original example feature" },
        source: {
          kind: "authored",
          edition: "2024",
          label: "Synthetic original",
          reference: "",
          rights: { modify: true, share: true, export: true },
        },
      },
    },
    "player",
  );
  const preview = hb.previewHomebrewDraft(s, "oath", "player");
  assert.equal(preview.canApply, true, JSON.stringify(preview.errors));
  const ref = hb.applyHomebrewDraft(s, "oath", { reviewKey: preview.reviewKey }, "player").ref;
  const found = P.searchPalette(player, "giuramento").items.find(
    (i) => i.key === "homebrew:" + ref.contentId,
  );
  assert.ok(found, "homebrew found");
  assert.equal(found.scope.it, "Personale");
  assert.equal(found.badge.it, "Capacità");
  assert.deepEqual(found.target, {
    page: "library",
    params: { id: ref.contentId, revision: ref.revisionId, tab: "available" },
  });
  assert.ok(P.searchPalette(player, "lantern oath").items.some((i) => i.key === found.key));
  assert.ok(!P.searchPalette(make("dm"), "giuramento").items.some((i) => i.key === found.key));
});

test("a category is never sticky (SV-03); the query is kept everywhere", () => {
  const { make } = world();
  const home = P.createPalette(make("player"), { text: "" });
  home.setFilter("characters");
  home.setText("liv");
  const elsewhere = P.createPalette(make("player", { page: "library" }));
  assert.equal(elsewhere.state.filter, null, "no stale category on another page");
  assert.equal(elsewhere.state.text, "liv");
  const back = P.createPalette(make("player"));
  assert.equal(back.state.filter, null, "not even back on the same page");
});

test("Mac labels on Chromium; effective keys feed tooltips and aria-keyshortcuts", () => {
  const { make } = world();
  const dm = make("dm", { page: "table" });
  assert.equal(P.effectiveShortcut(dm, "command-palette.open"), "Mod+K");
  assert.equal(P.effectiveShortcut(dm, "missing.command"), null);
  // A fake DOM with the controls the palette decorates.
  const el = (attrs = {}, text = "") => {
    const a = new Map(Object.entries(attrs));
    return {
      dataset: {},
      textContent: text,
      getAttribute: (k) => (a.has(k) ? a.get(k) : null),
      setAttribute: (k, v) => a.set(k, String(v)),
      removeAttribute: (k) => a.delete(k),
      hasAttribute: (k) => a.has(k),
    };
  };
  const search = el({ title: "Cerca", "aria-label": "Cerca" });
  const combat = el({}, "Avvia combattimento");
  const root = {
    querySelectorAll: (sel) =>
      sel.includes('data-service="search"')
        ? [search]
        : sel.includes('data-table="combat"')
          ? [combat]
          : [],
  };
  P.decorateControls(root, dm, { mac: false });
  assert.equal(search.getAttribute("title"), "Cerca (Ctrl+K)");
  assert.equal(search.getAttribute("aria-keyshortcuts"), "Control+K");
  assert.equal(combat.getAttribute("title"), "Avvia combattimento (Alt+R)");
  P.decorateControls(root, dm, { mac: true });
  assert.equal(search.getAttribute("title"), "Cerca (⌘K)", "never appended twice");
  assert.equal(search.getAttribute("aria-keyshortcuts"), "Meta+K");
  // A rebind or a removal shows at once.
  P.openControls(dm);
  P.controlsState().capture = "command-palette.open";
  assert.equal(P.captureKey(dm, keydown("j", { ctrlKey: true })), "saved");
  P.decorateControls(root, dm, { mac: false });
  assert.equal(search.getAttribute("title"), "Cerca (Ctrl+J)");
  P.clearRowBinding(dm, "command-palette.open");
  P.decorateControls(root, dm, { mac: false });
  assert.equal(search.getAttribute("title"), "Cerca");
  assert.equal(search.hasAttribute("aria-keyshortcuts"), false);
  assert.equal(P.effectiveShortcut(dm, "command-palette.open"), null);
});

test("the guide also lists the core's fixed keys, localized, marked as not editable", () => {
  const { make } = world();
  const html = P.guideHTML(make("player", { page: "table" }));
  assert.match(html, /data-guide-locked="undo"/);
  assert.match(html, /data-guide-locked="arrowup"/);
  assert.match(html, /data-guide-locked="cancel"/);
  assert.match(html, /<kbd class="cmdk-kbd">↑<\/kbd>/);
  assert.match(html, /fisso/);
  assert.match(P.guideHTML(make("player", {}, "en")), /fixed/);
  // Conflict wording follows the key holder rule.
  assert.doesNotMatch(html, /più recente/);
});

test("editor refuses browser and Table element keys; context names and order are localized", () => {
  const { make } = world();
  const table = make("player", { page: "table" });
  P.openControls(table);
  const state = P.controlsState();
  state.capture = "command-palette.create";
  assert.equal(P.captureKey(table, keydown("r", { ctrlKey: true })), "reserved");
  assert.match(state.notice.html, /browser/);
  state.capture = "command-palette.log";
  assert.equal(P.captureKey(table, keydown("Delete")), "reserved");
  assert.match(state.notice.html, /Tavolo/);
  assert.equal(P.rowsFor(table).find((r) => r.id === "command-palette.create").shortcut, "N");
  // Context names come from the page names, not raw ids.
  const lib = (api) =>
    api.add("command", {
      id: "libcmd.reader",
      label: { it: "Leggi", en: "Read" },
      context: "library",
      shortcut: "Shift+L",
      run: () => {},
    });
  const second = world({ areas: [["libcmd", lib]] });
  const guide = P.guideHTML(second.make("player"));
  assert.match(guide, /Nella pagina Biblioteca/);
  assert.doesNotMatch(guide, /Nella pagina library/);
  // Empty '>' in English: sorted by English label, not by Italian title length.
  const en = P.searchPalette(make("player", { page: "home" }, "en"), ">").items;
  const plain = en.filter((i) => !i.row.command.page).map((i) => i.title.en);
  assert.deepEqual(
    plain,
    [...plain].sort((a, b) => a.localeCompare(b)),
  );
  assert.ok(
    en.findIndex((i) => i.row.command.page) > en.findIndex((i) => !i.row.command.page),
    "page navigation after the commands",
  );
});
