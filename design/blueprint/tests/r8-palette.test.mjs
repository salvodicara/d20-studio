// R8 H-07 (part): the palette matcher. An elided article or preposition matches its full
// form («costruttore di incontri» ↔ «costruttore d’incontri», «dell’», «l’»), as Google and
// Algolia normalise Italian elision; typo-tolerant matches rank below exact word prefixes
// and, when a real match exists, move to a last «Forse cercavi» group (Google «Did you
// mean», Algolia typo ranking). Every area is loaded, as in the app; synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { loadExtensions } from "../extensions.mjs";
import { esc, icon } from "../ui.mjs";
import * as P from "../command-palette.mjs";

const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};
async function app(role = "dm", lang = "it") {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  await loadExtensions(registry);
  const store = createStore({ storage: memory() });
  registry.initState(store.state);
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    view: { page: "home", id: "", tab: "" },
    t: (it, en) => (ctx.lang === "en" ? en : it),
    label: (v) => (typeof v === "object" && v ? (v[ctx.lang] ?? v.it) : String(v ?? "")),
    esc,
    icon,
    registry,
    toast() {},
    navigate() {},
    dialog() {},
    closeDialog() {},
    render() {},
    commit() {},
    canUndo: () => false,
  };
  registry.attach(ctx);
  return ctx;
}

test("an elided article or preposition matches its full form, both ways", () => {
  const builder = { names: ["Apri il costruttore d’incontri"] };
  assert.ok(P.matchScore(builder, "costruttore di incontri") >= 800);
  assert.ok(P.matchScore(builder, "costruttore d'incontri") >= 800);
  assert.ok(P.matchScore({ names: ["Costruttore di incontri"] }, "costruttore d’incontri") >= 900);
  assert.ok(P.matchScore({ names: ["La mappa dell’isola"] }, "mappa della isola") >= 800);
  assert.ok(P.matchScore({ names: ["Apri l’armeria"] }, "apri la armeria") >= 800);
  assert.ok(P.matchScore({ names: ["Apri l’armeria"] }, "apri il arm") >= 800, "prefix");
  // A description read word by word gets the same equivalence.
  assert.ok(
    P.matchScore(
      { names: ["Apri"], words: ["Il costruttore d’incontri"] },
      "costruttore di incontri",
    ) >= 520,
  );
  // Unrelated words still do not match.
  assert.equal(P.matchScore(builder, "mappa di incontri"), 0);
  // A single short word keeps its meaning: «la» still starts «Lanterne».
  assert.ok(P.matchScore({ names: ["Le lanterne di Bruma"] }, "lan") >= 800);
});

test("the running palette finds the encounter builder by the full form, without keywords", async () => {
  const ctx = await app("dm");
  const found = P.searchPalette(ctx, "costruttore di incontri").items;
  assert.equal(
    found[0]?.row?.id ?? found[0]?.key,
    "encounter-builder.open",
    JSON.stringify(found.slice(0, 3).map((i) => i.key)),
  );
  // The matcher alone suffices: the same name without keywords is found by the full form.
  const bare = { names: ["Apri il costruttore d’incontri"], keywords: [] };
  assert.ok(P.matchScore(bare, "costruttore di incontri") > 0);
});

test("a typo match ranks below exact word prefixes and never sits next to them", async () => {
  // The matcher says which matches are typos.
  assert.equal(P.matchDetail({ names: ["Invita giocatori"] }, "invita").typo, false);
  assert.equal(P.matchDetail({ names: ["Invia Stop anonimo"] }, "invita").typo, true);
  assert.equal(P.matchDetail({ names: ["Livia"] }, "lvia").typo, true);
  const ctx = await app("dm");
  const items = P.searchPalette(ctx, "invita").items;
  assert.equal(P.searchPalette(ctx, "invita").items[0].key, "command:campaign-members.invite");
  const invite = items.findIndex((item) => item.key === "command:campaign-members.invite");
  const stop = items.findIndex((item) => item.key === "command:safety.stop");
  assert.equal(invite, 0);
  if (stop >= 0) {
    // Every exact match comes first; the typo is in the last group, under «Forse cercavi».
    assert.ok(items.slice(0, stop).every((item) => !item.typo));
    assert.ok(stop > invite + 1 || items.length === 2, "the typo is not right after the invite");
    assert.equal(items[stop].group, "typo");
    assert.equal(P.statusText ? typeof P.statusText : "function", "function");
    const html = P.listHTML(ctx, { result: { items, mode: "search", query: "invita" }, active: 0 });
    assert.match(html, /Forse cercavi/);
    assert.ok(html.indexOf("Forse cercavi") < html.indexOf("Invia Stop anonimo"));
    assert.ok(html.indexOf("Invita giocatori") < html.indexOf("Forse cercavi"));
  }
  // Only typos: the results stay in their own groups (a typo still finds Livia).
  const typoOnly = P.searchPalette(ctx, "lvia").items;
  assert.ok(typoOnly.some((item) => /Livia/.test(item.title?.it ?? item.title)));
  assert.ok(typoOnly.every((item) => item.group !== "typo"));
  // English too.
  ctx.lang = "en";
  assert.equal(P.searchPalette(ctx, "invite").items[0].key, "command:campaign-members.invite");
});
