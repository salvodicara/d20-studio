// P9 fixes to the search and command palette (SV-02, SV-03): commands matched by their
// description and keywords, tighter typo tolerance, results grouped by type with the exact
// match first, a category that is a removable, non-sticky chip, merged categories, Quick
// Insert while writing and settings indexed as commands. Real store, registry, SRD
// compendium and preferences area; a fake shell ctx.
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import * as compendium from "../compendium.mjs";
import * as preferences from "../preferences.mjs";
import * as quests from "../quests.mjs";
import * as P from "../command-palette.mjs";
import { insertAtCaret } from "../ui.mjs";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}
// Another package's commands: synonyms in the description (triage rule 3) or in keywords.
function otherArea(api) {
  api.add("command", {
    id: "loot-award",
    label: { it: "Assegna tesoro al gruppo", en: "Award treasure to the party" },
    description: {
      it: "PE, punti esperienza, ricompense e monete al gruppo",
      en: "XP, experience points, rewards and coins for the party",
    },
    run: () => {},
  });
  api.add("command", {
    id: "loot-members",
    label: { it: "Vedi come un membro", en: "View as a member" },
    keywords: ["permessi", { it: "controlla i permessi", en: "check permissions" }],
    run: () => {},
  });
}
function world() {
  const registry = createRegistry({ document: null, logger: null, deviceStorage: memoryStorage() });
  registry.use("compendium", compendium.register);
  registry.use("preferences", preferences.register);
  registry.use("quests", quests.register);
  registry.use("loot", otherArea);
  registry.use("command-palette", P.register);
  const store = createStore({ storage: memoryStorage() });
  registry.initState(store.state);
  const log = { navigate: [], toasts: [], dialogs: [] };
  const make = (role = "dm", view = {}, lang = "it") => {
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
      closeDialog: () => {},
      canUndo: () => false,
    };
    return ctx;
  };
  registry.attach(make());
  return { registry, store, log, make };
}
const title = (item, lang = "it") => (typeof item.title === "object" ? item.title[lang] : item.title);
const ids = (items) => items.map((item) => item.row?.id ?? item.key);

beforeEach(() => P.clearMemory());

test("registry: commands accept optional keywords (strings or labels) and refuse bad ones", () => {
  const registry = createRegistry({ document: null, logger: null, deviceStorage: memoryStorage() });
  registry.use("good", (api) =>
    api.add("command", { id: "good", label: { it: "A", en: "A" }, keywords: ["x", { it: "y", en: "y" }], run() {} }),
  );
  registry.use("bad", (api) =>
    api.add("command", { id: "bad", label: { it: "B", en: "B" }, keywords: [""], run() {} }),
  );
  const rows = Object.fromEntries(registry.extensions().map((row) => [row.id, row.status]));
  assert.equal(rows.good, "built");
  assert.equal(rows.bad, "failed");
});

test("a command is found by a synonym in its description or keywords (SV-02)", () => {
  const { make } = world();
  const ctx = make("dm");
  const pe = P.searchPalette(ctx, "PE");
  assert.equal(pe.items[0].row?.id, "loot-award", "«PE» is a whole word of the description");
  const xp = P.searchPalette(make("dm", {}, "en"), "experience");
  assert.ok(ids(xp.items).includes("loot-award"));
  const perm = P.searchPalette(ctx, "permessi");
  assert.equal(perm.items[0].row?.id, "loot-members", "keywords rank like a name");
  // A short query must be a whole word of a description, not any word it starts.
  assert.ok(!ids(P.searchPalette(ctx, "pu").items).includes("loot-award"));
});

test("settings are commands: tema, lingua, daltonismo, promemoria (SV-02, CA-47)", () => {
  const { make } = world();
  const ctx = make("player");
  const first = (query) => P.searchPalette(ctx, query).items.find((i) => i.type === "command");
  const theme = P.searchPalette(ctx, "tema").items.slice(0, 2).map((i) => i.row?.id);
  assert.deepEqual(theme.sort(), ["preferences.theme", "preferences.toggle-theme"]);
  assert.equal(first("lingua").row.id, "preferences.language");
  assert.equal(first("daltonismo").row.id, "preferences.colours");
  assert.equal(first("promemoria").row.id, "preferences.notifications");
  assert.ok(ids(P.searchPalette(ctx, "scuro").items).includes("preferences.toggle-theme"));
});

test("command subtitles use the interface's words, never an area's build title", () => {
  const { make } = world();
  const items = P.searchPalette(make("dm"), ">archivio").items;
  const archive = items.find((i) => i.row?.id === "quests.open-archive");
  assert.ok(archive);
  assert.equal(archive.excerpt.it, "Campagna · missioni e archivio");
});

test("typos are tighter for short queries: «api» and «ical» do not drift (SV-03)", () => {
  const { make } = world();
  const ctx = make("player");
  const api = P.searchPalette(ctx, "api").items.map((i) => title(i));
  assert.ok(!api.some((t) => /stocco|rapier/i.test(t)), api.join(", "));
  const ical = P.searchPalette(ctx, "ical").items.map((i) => title(i));
  assert.ok(!ical.some((t) => /critic/i.test(t)), ical.join(", "));
  // Longer typos still work.
  assert.ok(P.searchPalette(ctx, "palla di fucoo").items.some((i) => title(i) === "Palla di fuoco"));
});

test("results are grouped by type and an exact title comes first (SV-03)", () => {
  const { make } = world();
  const result = P.searchPalette(make("player"), "palla di fuoco");
  assert.equal(title(result.items[0]), "Palla di fuoco");
  assert.equal(result.items[0].group, "exact");
  assert.equal(result.items[0].groupTitle.it, "Corrispondenza esatta");
  // Every result sits in one contiguous group.
  const seen = [];
  for (const item of result.items)
    if (seen.at(-1) !== item.group) {
      assert.ok(!seen.includes(item.group), `group ${item.group} split`);
      seen.push(item.group);
    }
  const html = P.listHTML(make("player"), { active: 0, filter: null, result });
  assert.match(html, /cmdk-group[^>]*>Corrispondenza esatta/);
});

test("the category is a removable chip; an empty filtered search offers everything (SV-03)", () => {
  const { make } = world();
  const ctx = make("player", { page: "characters", id: "livia", tab: "spells" });
  const palette = P.createPalette(ctx);
  assert.equal(palette.state.filter, "spells", "the Spells tab still starts filtered");
  assert.match(P.paletteHTML(ctx, palette.state), /data-cmdk-chip[^>]*aria-label="Togli il filtro Incantesimi"/);
  palette.setText("tema");
  const offer = palette.state.result.items.at(-1);
  assert.equal(offer.unfilter, true);
  assert.equal(palette.choose(palette.state.result.items.length - 1), "stay");
  assert.equal(palette.state.filter, null);
  assert.ok(palette.state.result.items.some((i) => i.row?.id === "preferences.theme"));
  // Not sticky: the next opening elsewhere starts with no category.
  assert.equal(P.createPalette(make("player")).state.filter, null);
});

test("overlapping categories are merged into one choice each (SV-03)", () => {
  const { make } = world();
  const filters = P.searchPalette(make("dm"), "@").items.map((i) => i.filter);
  assert.ok(filters.includes("quests"));
  assert.ok(!filters.includes("p-quests-search"), "«Missioni e archivio» is the quests category");
  // The merged category finds the archive's pages (a provider) and core quests.
  const found = P.searchPalette(make("dm"), "@missioni oben").items;
  assert.ok(found.some((i) => i.provider === "quests-search"), found.map((i) => title(i)).join());
});

test("Quick Insert: while writing, a chosen entry becomes a [[link]] (SV-02)", () => {
  const { make, log } = world();
  const ctx = make("dm", { page: "campaign", tab: "journal" });
  const palette = P.createPalette(ctx, { insert: true });
  assert.equal(palette.state.text, "", "no remembered query while inserting");
  palette.setText("livia");
  const index = palette.state.result.items.findIndex((i) => i.type === "character");
  assert.ok(index >= 0);
  assert.equal(palette.choose(index), "insert");
  assert.equal(palette.state.inserted, "[[Livia]]");
  assert.equal(log.navigate.length, 0, "no navigation away from the draft");
  // A command still runs normally.
  palette.setText("tema");
  const cmd = palette.state.result.items.findIndex((i) => i.row?.id === "preferences.theme");
  assert.equal(palette.choose(cmd), "run");
  // The text goes at the cursor and the field hears an input event.
  let heard = 0;
  const field = {
    value: "Incontro con  alla porta",
    selectionStart: 13,
    selectionEnd: 13,
    focus() {},
    setSelectionRange(a) {
      this.selectionStart = this.selectionEnd = a;
    },
    dispatchEvent() {
      heard++;
    },
  };
  insertAtCaret(field, "[[Livia]]", { start: 13, end: 13 });
  assert.equal(field.value, "Incontro con [[Livia]] alla porta");
  assert.equal(field.selectionStart, 22);
  assert.equal(heard, 1);
});
