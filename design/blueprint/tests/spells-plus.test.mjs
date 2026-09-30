// B38 — Spells: management, lists, comparison, rituals and items. Real store and registry
// (seed, commit, Undo, reload), the same handlers the bound controls call, and the domain.
// Synthetic demo data only (Iria from B21, Livia and the sample campaign).
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import * as L from "../character-library.mjs";
import * as IP from "../inventory-plus.mjs";
import * as SP from "../spells-plus.mjs";
import * as D from "../spells-plus-domain.mjs";
import { prepareCombatAction, hasCombatPreview, resetCombatUI } from "../combat-ui.mjs";

function memory() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
function form(fields = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields))
    for (const entry of [].concat(value)) data.append(key, String(entry));
  return data;
}
function harness({ role = "player", lang = "it" } = {}) {
  const storage = memory();
  const boot = () => {
    const registry = createRegistry({ logger: null, document: null, deviceStorage: storage });
    assert.equal(registry.use("character-library", L.register).status, "built");
    assert.equal(registry.use("inventory-plus", IP.register).status, "built");
    assert.equal(registry.use("spells-plus", SP.register).status, "built");
    const store = createStore({ storage });
    if (registry.initState(store.state).changed) store.persist();
    return { registry, store };
  };
  let { registry, store } = boot();
  const toasts = [];
  const dialogs = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    view: { page: "characters", id: "iria", tab: "spells" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object"
        ? (value[ctx.lang] ?? value.it ?? value.en ?? "")
        : String(value ?? ""),
    esc,
    icon: () => "",
    toast: (text, error = false) => toasts.push({ text, error }),
    dialog: (title, body, options = {}) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {},
    navigate(page, params) {
      ctx.navigated = { page, params };
    },
    openForms(actorId, tab) {
      ctx.forms = { actorId, tab };
    },
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    canUndo: () => store.history.at(-1)?.controller === ctx.role,
    undoLabel: () => store.history.at(-1)?.label ?? "",
    commit(label, mutator, options = {}) {
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(ctx.role);
      registry.afterUndo(current, store.state);
      store.persist();
    },
  };
  Object.defineProperty(ctx, "registry", { get: () => registry });
  return {
    ctx,
    toasts,
    dialogs,
    get store() {
      return store;
    },
    get registry() {
      return registry;
    },
    reload() {
      ({ registry, store } = boot());
    },
    submit(fields = {}) {
      const dialog = dialogs.at(-1);
      assert.ok(dialog, "no dialog open");
      return dialog.options.onSubmit(form(fields));
    },
    run: (actorId, action, data = {}) => SP.handleSpellsAction(ctx, actorId, action, data),
    errors: () => toasts.filter((t) => t.error).map((t) => t.text),
  };
}
const iria = (h) => h.ctx.state.actors.iria;
const row = (actor, slug) => actor.spells.find((r) => D.spellEntryFor(r)?.slug === slug);
const personal = (h) => h.ctx.state.restTime?.clocks?.["personal:iria"]?.seconds ?? 0;
const html = (h, id = "iria") => SP.renderSpellsTab(h.ctx, h.ctx.state.actors[id]);

test("seed: Iria's SRD lineage spells, spellbook, focus, scroll and purse; the tab replaces the core one", () => {
  const h = harness();
  const a = iria(h);
  assert.equal(row(a, "detect-magic").alwaysPrepared, true);
  assert.equal(row(a, "misty-step").alwaysPrepared, true);
  assert.equal(row(a, "prestidigitation").grantId, "species:elf");
  assert.deepEqual(a.inventory.find((r) => r.id === "iria-spellbook").spellbook.spellIds.sort(), [
    "counterspell",
    "find-familiar",
    "fireball",
    "fly",
    "invisibility",
    "mage-armor",
    "magic-missile",
    "shield",
  ]);
  assert.equal(a.inventory.find((r) => r.id === "iria-focus").spellFocus, "arcane");
  assert.ok(a.inventory.some((r) => r.spellScroll?.spellId === "srd2024:spell:web"));
  assert.deepEqual(a.currency, { gp: 150 });
  const profile = D.casterProfile(a);
  assert.equal(profile.attack, 7);
  assert.equal(profile.dc, 15);
  assert.deepEqual(
    (({ prepared, quota, always, cantrips, cantripQuota, book, bookPicks }) => ({
      prepared,
      quota,
      always,
      cantrips,
      cantripQuota,
      book,
      bookPicks,
    }))(D.preparationCounts(a, profile)),
    { prepared: 7, quota: 9, always: 2, cantrips: 3, cantripQuota: 4, book: 8, bookPicks: 6 },
  );
  const tab = h.registry.list("sheet-tab", h.ctx, a).find((c) => c.id === "spells");
  assert.equal(tab.replaces, true);
  const page = html(h);
  for (const text of [
    "Magie",
    "Registra concentrazione",
    "Cerca nella Biblioteca",
    "Slot di livello 2: 3 / 3",
    "Dettagli",
    "Gestisci magie",
    "Attacco con incantesimo",
    "Sempre preparata",
    "Come rituale",
  ])
    assert.ok(page.includes(text), "missing " + text);
  assert.ok(page.includes('data-character-action="slots" data-pool="2"'));
  // Reload keeps the seed without seeding again.
  h.reload();
  assert.equal(iria(h).inventory.filter((r) => r.id === "iria-scroll-web").length, 1);
});

test("(1) Iria adds from her class list, prepares and unprepares; always prepared stays; message when not changeable", () => {
  const h = harness();
  const ctx = h.ctx;
  SP.spellsPanel(ctx, "iria").manage = true;
  SP.spellsPanel(ctx, "iria").tab = "class";
  let page = html(h);
  assert.ok(page.includes("Lista di classe") && page.includes("Aggiungi al libro"));
  assert.ok(
    !page.includes('data-spl-class-row="cure-wounds"'),
    "class list not filtered to the Wizard",
  );
  assert.ok(page.includes('data-spl-class-row="sleep"'));
  h.run("iria", "add-book", { entry: "srd2024:spell:sleep" });
  const sleep = row(iria(h), "sleep");
  assert.equal(sleep.grantId, "class:wizard");
  assert.equal(sleep.bookOrigin, "level");
  assert.ok(
    iria(h)
      .inventory.find((r) => r.id === "iria-spellbook")
      .spellbook.spellIds.includes("sleep"),
  );
  // Prepare Sleep (8/9), unprepare Mage Armor (7/9) in the draft.
  h.run("iria", "toggle", { key: sleep.id, want: "1" });
  h.run("iria", "toggle", { key: row(iria(h), "mage-armor").id, want: "0" });
  let p = D.previewPreparation(ctx.state, "iria", "player");
  assert.deepEqual(
    p.added.map((x) => x.name.en),
    ["Sleep"],
  );
  assert.deepEqual(
    p.removed.map((x) => x.name.en),
    ["Mage Armor"],
  );
  assert.equal(p.count, 7);
  assert.equal(row(iria(h), "sleep").prepared, false, "draft applied before confirmation");
  // Always prepared cannot be removed.
  h.run("iria", "toggle", { key: row(iria(h), "detect-magic").id, want: "0" });
  assert.match(h.errors().at(-1), /Sempre preparata/);
  page = html(h);
  assert.ok(page.includes("Modifiche non confermate") && page.includes("Conferma preparazione"));
  h.run("iria", "confirm");
  assert.equal(row(iria(h), "sleep").prepared, true);
  assert.equal(row(iria(h), "mage-armor").prepared, false);
  assert.equal(row(iria(h), "detect-magic").prepared, true);
  assert.equal(D.draftFor(ctx.state, "iria", "player"), null);
  // Now closed: the BG3 message, and toggles refused.
  const window = D.preparationWindow(ctx.state, "iria");
  assert.equal(window.open, false);
  page = html(h);
  assert.ok(page.includes("Preparazione non modificabile ora"));
  assert.ok(page.includes("Le magie preparate si cambiano al termine di un riposo lungo"));
  h.run("iria", "toggle", { key: row(iria(h), "mage-armor").id, want: "1" });
  assert.match(h.errors().at(-1), /non modificabile/);
  // Undo reverts the confirmation (window open again, rows back).
  ctx.undo();
  assert.equal(row(iria(h), "mage-armor").prepared, true);
  assert.equal(D.preparationWindow(ctx.state, "iria").open, true);
  // Persistence.
  h.run("iria", "confirm");
  h.reload();
  assert.equal(row(iria(h), "sleep").prepared, true);
  assert.equal(D.preparationWindow(h.ctx.state, "iria").open, false);
});

test("(1) quota, level limit, a new Long Rest reopens; DM exception on a campaign sheet, owner correction on a personal one", () => {
  const h = harness();
  const ctx = h.ctx;
  // Quota: 9 already after preparing two more.
  h.run("iria", "add-book", { entry: "srd2024:spell:sleep" });
  h.run("iria", "add-book", { entry: "srd2024:spell:web" });
  h.run("iria", "toggle", { key: row(iria(h), "sleep").id, want: "1" });
  h.run("iria", "toggle", { key: row(iria(h), "web").id, want: "1" });
  h.run("iria", "toggle", { key: row(iria(h), "find-familiar").id, want: "1" });
  assert.match(h.errors().at(-1), /9 magie preparate su 9/);
  // Level 4 spell out of reach.
  assert.throws(
    () => ctx.commit("x", (d) => D.addToBook(d, "iria", "srd2024:spell:polymorph", "player")),
    /level 4/,
  );
  h.run("iria", "confirm");
  assert.equal(D.preparationWindow(ctx.state, "iria").open, false);
  // A completed Long Rest (rest-time benefit) opens it again.
  ctx.commit(
    "rest",
    (d) => {
      d.restTime ??= { version: 1, clocks: {}, rests: [], rolls: [], events: [] };
      d.restTime.rests.push({
        id: "r1",
        kind: "long",
        campaignId: null,
        participants: [
          { actorId: "iria", benefits: [{ id: "r1:iria:complete", kind: "long", applied: true }] },
        ],
      });
    },
    { local: true, visibility: "private" },
  );
  const w = D.preparationWindow(ctx.state, "iria");
  assert.equal(w.open, true);
  assert.equal(w.kind, "long-rest");
  // Livia (campaign): closed; the player cannot grant an exception, the DM can.
  assert.equal(D.preparationWindow(ctx.state, "livia").open, false);
  h.run("livia", "exception");
  assert.throws(() => h.submit({ reason: "Riposo non registrato" }), /Only the DM/);
  ctx.role = "dm";
  h.run("livia", "exception");
  h.submit({ reason: "Riposo lungo non registrato ieri" });
  assert.equal(D.preparationWindow(ctx.state, "livia").kind, "exception");
  // Iria's owner records her own correction; the DM cannot even read her sheet.
  assert.throws(
    () => ctx.commit("x", (d) => D.openException(d, "iria", "prova", "dm")),
    /Sheet unavailable/,
  );
});

test("(2) the list «Esplorazione» is saved and recalled as a proposal with differences; an open draft is never discarded silently", () => {
  const h = harness();
  const ctx = h.ctx;
  // Exploration: swap Fireball for Mage Armor… as a draft, save it, then discard the draft.
  h.run("iria", "toggle", { key: row(iria(h), "fireball").id, want: "0" });
  SP.spellsPanel(ctx, "iria").manage = true;
  SP.spellsPanel(ctx, "iria").tab = "lists";
  assert.ok(html(h).includes("Salva le preparate come lista"));
  ctx.commit("save", (d) => D.saveList(d, "iria", "Esplorazione", "player"), D.PERSONAL);
  assert.throws(
    () => ctx.commit("dup", (d) => D.saveList(d, "iria", "esplorazione", "player"), D.PERSONAL),
    /exists/,
  );
  const list = D.listsFor(ctx.state, "iria", "player")[0];
  assert.equal(list.refs.length, 6);
  assert.ok(!list.refs.includes("srd2024:spell:detect-magic"), "always prepared inside a list");
  h.run("iria", "discard");
  assert.equal(D.draftFor(ctx.state, "iria", "player"), null);
  assert.equal(row(iria(h), "fireball").prepared, true, "saving a list changed the preparation");
  // Recall: Fireball removed as a proposal, nothing applied yet.
  const p = D.proposalFromList(ctx.state, "iria", list.id, "player");
  assert.deepEqual(
    p.removed.map((x) => x.name.en),
    ["Fireball"],
  );
  assert.equal(p.added.length, 0);
  h.run("iria", "list-recall", { list: list.id });
  assert.ok(
    h.dialogs.at(-1).body.includes("Da togliere") &&
      h.dialogs.at(-1).body.includes("Palla di fuoco"),
  );
  h.submit({});
  assert.equal(D.draftFor(ctx.state, "iria", "player").origin.name, "Esplorazione");
  assert.equal(row(iria(h), "fireball").prepared, true);
  // With a draft open, recalling asks: keep (default) or replace.
  h.run("iria", "toggle", { key: row(iria(h), "fly").id, want: "0" });
  assert.throws(
    () => ctx.commit("x", (d) => D.recallList(d, "iria", list.id, "player")),
    /unconfirmed changes/,
  );
  h.run("iria", "list-recall", { list: list.id });
  assert.ok(h.dialogs.at(-1).body.includes("Mantieni le modifiche attuali"));
  h.submit({ draft: "keep" });
  assert.ok(
    !D.draftFor(ctx.state, "iria", "player").keys.includes(row(iria(h), "fly").id),
    "kept draft replaced",
  );
  h.run("iria", "list-recall", { list: list.id });
  h.submit({ draft: "replace" });
  assert.ok(D.draftFor(ctx.state, "iria", "player").keys.includes(row(iria(h), "fly").id));
  // An entry no longer on the sheet is shown as unavailable, never skipped silently.
  ctx.commit(
    "drop",
    (d) => {
      d.actors.iria.spells = d.actors.iria.spells.filter((r) => r.catalogId !== "counterspell");
    },
    { local: true, visibility: "private" },
  );
  const q = D.proposalFromList(ctx.state, "iria", list.id, "player");
  assert.equal(q.unavailable.length, 1);
  assert.equal(q.unavailable[0].reason.it, "non è nel libro");
  // Lists are personal: the DM (who cannot read Iria) sees none.
  assert.equal(D.listsFor(ctx.state, "iria", "dm").length, 0);
  // Update and delete.
  h.run("iria", "list-update", { list: list.id });
  h.run("iria", "list-delete", { list: list.id });
  h.submit({});
  assert.equal(D.listsFor(ctx.state, "iria", "player").length, 0);
});

test("(3) side-by-side comparison with the same criteria, no winner, nothing changed; back to the choice", () => {
  const h = harness();
  const ctx = h.ctx;
  const before = JSON.stringify(ctx.state);
  h.run("iria", "compare", { key: row(iria(h), "shield").id });
  h.run("iria", "compare", { key: "srd:burning-hands" });
  assert.ok(html(h).includes("Confronto (2)"));
  const { items, rows } = SP.compareRows(ctx, iria(h), SP.spellsPanel(ctx, "iria").compare);
  assert.deepEqual(
    items.map((i) => i.entry.slug),
    ["shield", "burning-hands"],
  );
  const byLabel = Object.fromEntries(rows.map((r) => [r.label, r.values]));
  assert.deepEqual(byLabel["Tempo di lancio"], ["1 reazione", "1 azione"]);
  assert.deepEqual(byLabel["Danni o cure"], ["non disponibile", "3d6 Fuoco"]);
  assert.deepEqual(byLabel["Area / bersagli"], ["non disponibile", "Cono 4,5 m"]);
  h.run("iria", "compare-open");
  assert.equal(h.dialogs.at(-1).options.cancelLabel, "Torna alla scelta");
  assert.equal(JSON.stringify(ctx.state), before, "comparing changed the state");
  ctx.lang = "en";
  assert.deepEqual(
    SP.compareRows(ctx, iria(h), SP.spellsPanel(ctx, "iria").compare).rows.find(
      (r) => r.label === "Damage or healing",
    ).values,
    ["not available", "3d6 Fire"],
  );
});

test("(4) Detect Magic as a Ritual: +10 minutes on the clock, no slot, Concentration starts", () => {
  const h = harness();
  const ctx = h.ctx;
  const slots = JSON.stringify(iria(h).spellSlots);
  const detect = row(iria(h), "detect-magic");
  h.run("iria", "cast", { row: detect.id, via: "ritual", level: "1" });
  const dialog = h.dialogs.at(-1);
  assert.equal(dialog.options.submitLabel, "Lancia come rituale");
  assert.ok(dialog.body.includes("Orologio personale") && dialog.body.includes("00:10"));
  h.submit({ variant: "ritual:1" });
  assert.equal(personal(h), 600);
  assert.equal(JSON.stringify(iria(h).spellSlots), slots, "a Ritual spent a slot");
  assert.equal(iria(h).concentration.name.en, "Detect Magic");
  const cast = D.readSlice(ctx.state).casts.at(-1);
  assert.equal(cast.via, "ritual");
  assert.equal(cast.time.after, 600);
  // Find Familiar (in the book, unprepared) is a Ritual Adept option reading from the book,
  // and it routes to the existing Forms and companions flow.
  const variants = D.castVariants(ctx.state, "iria", row(iria(h), "find-familiar").id);
  assert.equal(variants.find((v) => v.via === "ritual").fromBook, true);
  h.run("iria", "cast", { row: row(iria(h), "find-familiar").id, via: "ritual", level: "1" });
  assert.ok(h.dialogs.at(-1).body.includes("Apri Trova Famiglio"));
  // Undo returns the clock and the Concentration.
  ctx.undo();
  assert.equal(personal(h), 0);
  assert.ok(!iria(h).concentration || iria(h).concentration.active === false);
});

test("(4) a campaign sheet's Ritual asks the DM for shared time; the DM advances the campaign clock", () => {
  const h = harness();
  const ctx = h.ctx;
  ctx.role = "dm";
  h.run("livia", "exception");
  h.submit({ reason: "Preparazione di prova" });
  ctx.commit("book", (d) => D.addToBook(d, "livia", "srd2024:spell:detect-magic", "dm"));
  const detect = row(ctx.state.actors.livia, "detect-magic");
  h.run("livia", "toggle", { key: detect.id, want: "1" });
  h.run("livia", "confirm");
  assert.equal(row(ctx.state.actors.livia, "detect-magic").prepared, true);
  ctx.role = "player";
  h.run("livia", "cast", { row: detect.id, via: "ritual", level: "1" });
  assert.ok(h.dialogs.at(-1).body.includes("richiesta al DM"));
  h.submit({ variant: "ritual:1" });
  const request = D.pendingTimeRequests(ctx.state)[0];
  assert.equal(request.seconds, 600);
  assert.equal(ctx.state.restTime?.clocks?.lanterns?.seconds ?? 0, 0);
  // The player's notification list stays clean; the DM receives it.
  const notice = (role) => {
    ctx.role = role;
    return h.registry.notifications(ctx).filter((n) => n.id.startsWith("spells-plus-time"));
  };
  assert.equal(notice("player").length, 0);
  assert.equal(notice("dm").length, 1);
  assert.ok(html(h, "livia").includes("Avanza di 10 min"));
  h.run("livia", "time-apply", { request: request.id });
  assert.equal(ctx.state.restTime.clocks.lanterns.seconds, 600);
  assert.equal(D.pendingTimeRequests(ctx.state).length, 0);
});

test("(5) one cast icon with its available levels; slot spending and the usage dialog", () => {
  const h = harness();
  const ctx = h.ctx;
  const missile = row(iria(h), "magic-missile");
  const variants = D.castVariants(ctx.state, "iria", missile.id);
  assert.deepEqual(
    variants.map((v) => `${v.via}:${v.level}:${v.remaining}`),
    ["slot:1:4", "slot:2:3", "slot:3:2"],
  );
  const page = html(h);
  assert.ok(page.includes(`data-spl="variants" data-row="${missile.id}"`));
  assert.ok(page.includes("2° · 3/3"));
  assert.ok(
    D.castVariants(ctx.state, "iria", row(iria(h), "misty-step").id).some(
      (v) => v.via === "free" && v.available,
    ),
  );
  // Cast at level 2: slot 2 goes 3 → 2, nothing else.
  h.run("iria", "cast", { row: missile.id, via: "slot", level: "2" });
  assert.ok(h.dialogs.at(-1).body.includes("Slot di livello 2: 3 → 2"));
  h.submit({ variant: "slot:2" });
  assert.equal(iria(h).spellSlots[2].used, 1);
  assert.equal(iria(h).spellSlots[1].used, 0);
  // Free lineage cast of Misty Step: no slot, then used until the next Long Rest.
  const misty = row(iria(h), "misty-step");
  h.run("iria", "cast", { row: misty.id, via: "free", level: "2" });
  h.submit({ variant: "free:2" });
  assert.equal(iria(h).spellSlots[2].used, 1);
  assert.equal(D.freeUseAvailable(ctx.state, "iria", row(iria(h), "misty-step")), false);
  // Table spells route to the existing combat preview with the chosen level.
  resetCombatUI();
  ctx.role = "player";
  prepareCombatAction(ctx, "livia", "magic-missile", { slotLevel: 2 });
  assert.equal(hasCombatPreview(ctx, "livia"), true);
});

test("(6) Livia's wand casts Magic Missile with the item's charges, never slots; last charge d20 and Undo reuse", () => {
  const h = harness();
  const ctx = h.ctx;
  const livia = () => ctx.state.actors.livia;
  const wand = () => livia().inventory.find((r) => r.id === "invp-wand");
  assert.deepEqual([wand().charges.value, wand().charges.max], [3, 7]);
  const page = html(h, "livia");
  assert.ok(
    page.includes("Incantesimi dagli oggetti") && page.includes("Bacchetta di dardi incantati"),
  );
  assert.ok(page.includes("1–3 cariche"));
  const slots = JSON.stringify(livia().spellSlots);
  h.run("livia", "cast-item", { item: "invp-wand", activity: "magic-missile" });
  const dialog = h.dialogs.at(-1);
  assert.ok(dialog.body.includes("Cariche da spendere") && dialog.body.includes("4 dardi"));
  assert.ok(dialog.body.includes("Dadi dell'effetto"));
  // Two charges: level 2, four darts (4d4 + 4), physical faces.
  h.submit({ charges: "2", mode: "physical", face0: "1", face1: "2", face2: "3", face3: "4" });
  assert.equal(h.errors().length, 0, h.errors().join());
  assert.equal(wand().charges.value, 1);
  assert.equal(JSON.stringify(livia().spellSlots), slots, "the wand spent a slot");
  const cast = D.readSlice(ctx.state).casts.at(-1);
  assert.deepEqual([cast.via, cast.level, cast.charges, cast.roll.total], ["item", 2, 2, 14]);
  assert.ok(html(h, "livia").includes("4d4 + 4: 1, 2, 3, 4 = <strong>14</strong>"));
  // More than the charges left is refused with the reason.
  const p = D.previewCast(
    ctx.state,
    "livia",
    { via: "item", itemId: "invp-wand", charges: 2 },
    "player",
  );
  assert.match(p.errors[0].it, /Cariche insufficienti/);
  // The last charge: a warning, then a pending d20 that blocks new uses.
  const q = D.previewCast(
    ctx.state,
    "livia",
    { via: "item", itemId: "invp-wand", charges: 1 },
    "player",
  );
  assert.equal(
    q.warnings.find((w) => w.code === "last-charge").it.startsWith("È l'ultima carica"),
    true,
  );
  h.run("livia", "cast-item", { item: "invp-wand", activity: "magic-missile" });
  h.submit({ charges: "1", mode: "digital" });
  assert.equal(wand().charges.lastCharge, "pending");
  assert.ok(html(h, "livia").includes("Tira il d20"));
  assert.equal(
    h.registry.notifications(ctx).filter((n) => n.id.startsWith("spells-plus-charge")).length,
    1,
  );
  h.run("livia", "last-charge", { item: "invp-wand" });
  assert.throws(() => h.submit({ mode: "physical", face: "0" }), /d20/);
  h.submit({ mode: "physical", face: "1" });
  assert.equal(wand(), undefined, "a 1 destroys the wand");
  // Undo: the wand is back with the check pending.
  ctx.undo();
  assert.equal(wand().charges.lastCharge, "pending");
  // The Staff of Fire's Wall of Fire (4 charges): the item's charges, and the caster must
  // concentrate (SRD, spells cast from items).
  const staff = () => livia().inventory.find((r) => r.id === "invp-staff-fire");
  h.run("livia", "cast-item", { item: "invp-staff-fire", activity: "wall-of-fire" });
  h.submit({ mode: "digital" });
  assert.equal(staff().charges.value, 6);
  assert.equal(livia().concentration.name.en, "Wall of Fire");
  assert.equal(JSON.stringify(livia().spellSlots), slots);
});

test("(7) a new Concentration spell warns that it ends the current one, then ends it", () => {
  const h = harness();
  const ctx = h.ctx;
  h.run("iria", "cast", { row: row(iria(h), "detect-magic").id, via: "ritual", level: "1" });
  h.submit({ variant: "ritual:1" });
  const fly = row(iria(h), "fly");
  const p = D.previewCast(ctx.state, "iria", { rowId: fly.id, via: "slot", level: 3 }, "player");
  assert.equal(p.warnings[0].it, "Interromperà la concentrazione su Individuazione del magico.");
  h.run("iria", "cast", { row: fly.id, via: "slot", level: "3" });
  const dialog = h.dialogs.at(-1);
  assert.equal(dialog.options.submitLabel, "Lancia e termina la concentrazione");
  assert.ok(dialog.body.includes("Interromperà la concentrazione su"));
  // Reading the details of a Concentration spell shows no such warning.
  h.run("iria", "detail", { row: row(iria(h), "invisibility").id });
  assert.ok(!h.dialogs.at(-1).body.includes("Interromperà"));
  h.run("iria", "cast", { row: fly.id, via: "slot", level: "3" });
  h.submit({ variant: "slot:3" });
  assert.equal(iria(h).concentration.name.en, "Fly");
  const cast = D.readSlice(ctx.state).casts.at(-1);
  assert.equal(cast.replaced.name.en, "Detect Magic");
  assert.ok(html(h).includes("termina la concentrazione su Individuazione del magico"));
});

test("(8) copying Web from the scroll: time, cost, Arcana check, scroll destroyed; Undo keeps the face", () => {
  const h = harness();
  const ctx = h.ctx;
  SP.spellsPanel(ctx, "iria").manage = true;
  SP.spellsPanel(ctx, "iria").tab = "copy";
  assert.ok(html(h).includes("Trascrivi dalla pergamena"));
  h.run("iria", "transcribe", { entry: "srd2024:spell:web", scroll: "iria-scroll-web" });
  const dialog = h.dialogs.at(-1);
  assert.ok(
    dialog.body.includes("4 ore") &&
      dialog.body.includes("100 mo") &&
      dialog.body.includes("CD</dt>") === false,
  );
  assert.ok(dialog.body.includes("contro CD 12"));
  h.submit({ mode: "physical", face: "10" });
  const a = iria(h);
  assert.equal(a.currency.gp, 50);
  assert.equal(personal(h), 4 * 3600);
  assert.equal(
    a.inventory.some((r) => r.id === "iria-scroll-web"),
    false,
  );
  assert.equal(row(a, "web").bookOrigin, "transcribed");
  assert.ok(a.inventory.find((r) => r.id === "iria-spellbook").spellbook.spellIds.includes("web"));
  const record = D.readSlice(ctx.state).transcriptions.at(-1);
  assert.deepEqual([record.check.face, record.check.total, record.success], [10, 17, true]);
  // Undo: coins, time, scroll and row back; the accepted face stays and is reused.
  ctx.undo();
  assert.equal(iria(h).currency.gp, 150);
  assert.equal(personal(h), 0);
  assert.equal(row(iria(h), "web"), undefined);
  assert.equal(D.readRolls(ctx.state).rolls.length, 1);
  h.run("iria", "transcribe", { entry: "srd2024:spell:web", scroll: "iria-scroll-web" });
  h.submit({ mode: "digital" });
  assert.equal(D.readSlice(ctx.state).transcriptions.at(-1).check.face, 10);
  assert.equal(D.readSlice(ctx.state).transcriptions.at(-1).check.reused, true);
  // Not enough coins for a level 3 copy from another source.
  const p = D.previewTranscription(ctx.state, "iria", { entryId: "srd2024:spell:haste" }, "player");
  assert.match(p.errors.map((e) => e.it).join(" "), /Servono 150 mo: ne hai 50/);
});

test("(8) a failed copy: the scroll is destroyed, coins and time spent, no spell", () => {
  const h = harness();
  h.run("iria", "transcribe", { entry: "srd2024:spell:web", scroll: "iria-scroll-web" });
  h.submit({ mode: "physical", face: "1" });
  const a = iria(h);
  assert.equal(row(a, "web"), undefined);
  assert.equal(a.currency.gp, 50);
  assert.equal(
    a.inventory.some((r) => r.id === "iria-scroll-web"),
    false,
  );
  assert.equal(h.toasts.at(-1).error, true);
});

test("(9) missing focus or material is flagged before casting; the table rule and the DM exception", () => {
  const h = harness();
  const ctx = h.ctx;
  const fly = row(iria(h), "fly");
  h.run("iria", "hold", { item: "iria-focus", "aria-pressed": "true" });
  assert.equal(iria(h).inventory.find((r) => r.id === "iria-focus").equipped, false);
  let p = D.previewCast(ctx.state, "iria", { rowId: fly.id, via: "slot", level: 3 }, "player");
  assert.equal(p.ok, false);
  assert.match(
    p.errors[0].it,
    /Serve un focus impugnato \(focus arcano o libro degli incantesimi\)/,
  );
  assert.match(p.errors[0].it, /Cristallo \(focus arcano\) non è impugnato/);
  h.run("iria", "cast", { row: fly.id, via: "slot", level: "3" });
  assert.ok(h.dialogs.at(-1).body.includes("Impugna il focus"));
  // Declaring the material satisfies a free material component.
  p = D.previewCast(
    ctx.state,
    "iria",
    { rowId: fly.id, via: "slot", level: 3, materialDeclared: true },
    "player",
  );
  assert.equal(p.ok, true);
  // Holding the spellbook works too for a Wizard.
  h.run("iria", "hold", { item: "iria-spellbook", "aria-pressed": "false" });
  assert.equal(
    D.previewCast(ctx.state, "iria", { rowId: fly.id, via: "slot", level: 3 }, "player").ok,
    true,
  );
  // A costly consumed material: Find Familiar's incense.
  const status = D.componentStatus(
    ctx.state,
    iria(h),
    D.spellBySlug("find-familiar"),
    D.casterProfile(iria(h)),
    {},
  );
  assert.match(status.issues[0].it, /incenso acceso del valore di almeno 10 mo, consumato/);
  h.run("iria", "material");
  h.submit({
    name: "Incenso per Trova Famiglio",
    value: "10",
    quantity: "1",
    origin: "Comprato a Bruma",
  });
  const incense = iria(h).inventory.find((r) => r.materialValueGp === 10);
  const ok = D.componentStatus(
    ctx.state,
    iria(h),
    D.spellBySlug("find-familiar"),
    D.casterProfile(iria(h)),
    { materialItemId: incense.id, materialConfirmed: true },
  );
  assert.equal(ok.issues.length, 0);
  // Items need no components.
  assert.equal(
    D.previewCast(ctx.state, "livia", { via: "item", itemId: "invp-wand", charges: 1 }, "player")
      .components.issues.length,
    0,
  );
  // Table rule off (Solasta II option): nothing checked.
  const off = D.componentStatus(
    ctx.state,
    iria(h),
    D.spellBySlug("fireball"),
    D.casterProfile(iria(h)),
    {},
    "off",
  );
  assert.equal(off.issues.length, 0);
  // DM exception on a campaign sheet (Livia has no focus): allowed with a reason, recorded.
  ctx.role = "dm";
  ctx.commit("book", (d) => {
    d.actors.livia.spells.push({
      id: "livia-sleep",
      catalogId: "sleep",
      name: { it: "Sonno", en: "Sleep" },
      level: 1,
      prepared: true,
    });
  });
  const blocked = D.previewCast(
    ctx.state,
    "livia",
    { rowId: "livia-sleep", via: "slot", level: 1 },
    "dm",
  );
  assert.equal(blocked.errors[0].code, "focus");
  assert.equal(blocked.canOverride, true);
  const allowed = D.previewCast(
    ctx.state,
    "livia",
    { rowId: "livia-sleep", via: "slot", level: 1, override: { reason: "Ha raccolto la sabbia" } },
    "dm",
  );
  assert.equal(allowed.ok, true);
  ctx.commit("cast", (d) =>
    D.castSpell(
      d,
      "livia",
      {
        rowId: "livia-sleep",
        via: "slot",
        level: 1,
        override: { reason: "Ha raccolto la sabbia" },
      },
      "dm",
    ),
  );
  assert.equal(D.readSlice(ctx.state).casts.at(-1).override.reason, "Ha raccolto la sabbia");
  // A player cannot override.
  ctx.role = "player";
  assert.equal(
    D.previewCast(
      ctx.state,
      "livia",
      { rowId: "livia-sleep", via: "slot", level: 1, override: { reason: "x y z" } },
      "player",
    ).canOverride,
    false,
  );
});

test("combat: the turn, the action and one spell slot per turn; Reactions stay at the Table", () => {
  const h = harness();
  const ctx = h.ctx;
  ctx.role = "dm";
  ctx.commit("combat", (d) => {
    d.combat.active = true;
    d.combat.turn = 1; // goblin-1
    d.actors.livia.spells.push({
      id: "livia-sleep",
      catalogId: "sleep",
      name: { it: "Sonno", en: "Sleep" },
      level: 1,
      prepared: true,
    });
  });
  const input = { rowId: "livia-sleep", via: "slot", level: 1, materialDeclared: true };
  assert.equal(D.previewCast(ctx.state, "livia", input, "dm").errors[0].code, "turn");
  ctx.commit("turn", (d) => (d.combat.turn = 0));
  assert.equal(D.previewCast(ctx.state, "livia", input, "dm").ok, true);
  ctx.commit("cast", (d) => D.castSpell(d, "livia", input, "dm"));
  const livia = ctx.state.actors.livia;
  assert.equal(livia.action, false);
  const again = D.previewCast(ctx.state, "livia", input, "dm").errors.map((e) => e.code);
  assert.ok(again.includes("slot-per-turn") && again.includes("action"));
  const shield = livia.spells.find((r) => r.combatActionId === "shield");
  assert.equal(
    D.previewCast(ctx.state, "livia", { rowId: shield.id, via: "slot", level: 1 }, "dm").errors[0]
      .code,
    "reaction",
  );
});

test("privacy and roles: the DM cannot read Iria's spells; a player reads Livia but a Doran sheet has no caster", () => {
  const h = harness();
  const ctx = h.ctx;
  ctx.role = "dm";
  assert.equal(
    D.previewCast(ctx.state, "iria", { rowId: "iria-fly", via: "slot", level: 3 }, "dm").errors[0]
      .code,
    "permission",
  );
  assert.throws(
    () => ctx.commit("x", (d) => D.toggleDraft(d, "iria", "iria-fly", false, "dm")),
    /Sheet unavailable/,
  );
  ctx.role = "player";
  const doran = html(h, "doran");
  assert.ok(doran.includes("Nessuna classe incantatrice registrata"));
  assert.ok(!doran.includes("Gestisci magie"));
  // English rendering.
  ctx.lang = "en";
  assert.ok(html(h, "livia").includes("Spells from items"));
  const page = html(h);
  for (const text of ["Spells", "Manage spells", "Spell attack", "As Ritual", "Always prepared"])
    assert.ok(page.includes(text), "missing " + text);
});

// ---------------------------------------------------------------- independent review (B38-rf)

test("review: a real Long Rest (rest-time) reopens Iria's preparation and returns the lineage casting", async () => {
  const r = await import("../rest-time.mjs");
  const h = harness();
  const ctx = h.ctx;
  const misty = row(iria(h), "misty-step");
  h.run("iria", "cast", { row: misty.id, via: "free", level: "2" });
  h.submit({ variant: "free:2" });
  assert.equal(D.freeUseAvailable(ctx.state, "iria", row(iria(h), "misty-step")), false);
  h.run("iria", "toggle", { key: row(iria(h), "mage-armor").id, want: "0" });
  h.run("iria", "confirm");
  assert.equal(D.preparationWindow(ctx.state, "iria").open, false);
  ctx.commit(
    "long rest",
    (d) => {
      const input = {
        id: "rest-b38",
        kind: "long",
        actorIds: ["iria"],
        campaignId: null,
        activityByActor: { iria: "trance" },
      };
      const p = r.previewRest(d, input, "player");
      r.startRest(d, input, "player", { reviewKey: p.reviewKey });
      r.recordPersonalRestTime(
        d,
        "rest-b38",
        { id: "el", actorId: "iria", seconds: 4 * 3600 },
        "player",
      );
      const c = r.previewRestCompletion(d, "rest-b38", { actorIds: ["iria"] }, "player");
      assert.equal(c.canApply, true, JSON.stringify(c.errors));
      r.completeRest(d, "rest-b38", { id: "done", actorIds: ["iria"] }, "player", {
        reviewKey: c.reviewKey,
      });
    },
    D.PERSONAL,
  );
  const w = D.preparationWindow(ctx.state, "iria");
  assert.deepEqual([w.open, w.kind], [true, "long-rest"]);
  assert.equal(D.freeUseAvailable(ctx.state, "iria", row(iria(h), "misty-step")), true);
});

test("review: a campaign Ritual's log line follows the DM's answer (applied, then declined)", () => {
  const h = harness();
  const ctx = h.ctx;
  ctx.role = "dm";
  h.run("livia", "exception");
  h.submit({ reason: "Preparazione di prova" });
  ctx.commit("book", (d) => D.addToBook(d, "livia", "srd2024:spell:detect-magic", "dm"));
  const detect = row(ctx.state.actors.livia, "detect-magic");
  h.run("livia", "toggle", { key: detect.id, want: "1" });
  h.run("livia", "confirm");
  ctx.role = "player";
  h.run("livia", "cast", { row: detect.id, via: "ritual", level: "1" });
  h.submit({ variant: "ritual:1" });
  assert.ok(html(h, "livia").includes("richiesti al DM"));
  ctx.role = "dm";
  h.run("livia", "time-apply", { request: D.pendingTimeRequests(ctx.state)[0].id });
  ctx.role = "player";
  let page = html(h, "livia");
  assert.ok(!page.includes("richiesti al DM"), "the log still says the time is pending");
  assert.ok(page.includes("applicati dal DM"), "the applied time is not shown");
  // A second Ritual, declined by the DM with a reason: the player reads the answer.
  h.run("livia", "cast", { row: detect.id, via: "ritual", level: "1" });
  h.submit({ variant: "ritual:1" });
  ctx.role = "dm";
  h.run("livia", "time-dismiss", { request: D.pendingTimeRequests(ctx.state)[0].id });
  h.submit({ reason: "Il tempo è già contato nella scena" });
  ctx.role = "player";
  page = html(h, "livia");
  assert.ok(page.includes("rifiutati dal DM"), "the declined request is not shown");
  assert.ok(page.includes("Il tempo è già contato nella scena"));
  assert.ok(!page.includes("richiesti al DM"));
  // The player is told who can open a closed preparation on a campaign sheet (EN too).
  assert.ok(page.includes("chiedi al DM"));
  ctx.lang = "en";
  page = html(h, "livia");
  assert.ok(page.includes("declined by the DM") && page.includes("applied by the DM"));
  assert.ok(page.includes("ask the DM"));
});

test("review: in combat a Table spell is cast at the Table (targets, rolls, damage), never spent from the sheet", () => {
  const h = harness();
  const ctx = h.ctx;
  ctx.role = "dm";
  ctx.commit("combat", (d) => {
    d.combat.active = true;
    d.combat.turn = 0; // Livia
  });
  ctx.role = "player";
  const bolt = row(ctx.state.actors.livia, "fire-bolt");
  const p = D.previewCast(
    ctx.state,
    "livia",
    { rowId: bolt.id, via: "cantrip", level: 0 },
    "player",
  );
  assert.ok(
    p.errors.some((e) => e.code === "table"),
    JSON.stringify(p.errors),
  );
  h.run("livia", "cast", { row: bolt.id, via: "cantrip", level: "0" });
  const body = h.dialogs.at(-1).body;
  assert.ok(body.includes("Prepara al Tavolo") && body.includes("si lancia al Tavolo"));
  assert.throws(() => h.submit({ variant: "cantrip:0" }), /Table/);
  assert.equal(ctx.state.actors.livia.action, true, "the action was spent without an attack");
  // Out of combat the sheet's Cast records it as D&D Beyond does.
  ctx.role = "dm";
  ctx.commit("end", (d) => (d.combat.active = false));
  assert.equal(
    D.previewCast(ctx.state, "livia", { rowId: bolt.id, via: "cantrip", level: 0 }, "dm").ok,
    true,
  );
});

test("review: spells outside class preparation keep the core «Registra preparazione» correction", () => {
  const h = harness();
  const ctx = h.ctx;
  ctx.role = "dm"; // Doran is the DM's fighter: no spellcasting class
  ctx.commit("feat", (d) => {
    d.actors.doran.spells = [
      { id: "doran-bless", name: "Benedizione", level: 1, prepared: false, source: "Talento" },
    ];
  });
  assert.ok(
    html(h, "doran").includes('data-character-action="prepare-spell" data-spell="doran-bless"'),
    "a non-caster's recorded spell can never be prepared or cast",
  );
  ctx.role = "player";
  ctx.commit(
    "feat",
    (d) => {
      d.actors.iria.spells.push({
        id: "iria-feat-bless",
        name: { it: "Benedizione", en: "Bless" },
        level: 1,
        prepared: false,
        grantId: "feat:magic-initiate",
      });
    },
    D.PERSONAL,
  );
  const page = html(h);
  assert.ok(page.includes('data-character-action="prepare-spell" data-spell="iria-feat-bless"'));
  // Class rows go through Manage spells; always-prepared rows have nothing to record.
  assert.ok(!page.includes('data-spell="iria-fly"'));
  assert.ok(!page.includes('data-spell="iria-detect-magic"'));
});

test("review: no inert source picker; comparison keeps four and says which one left", () => {
  SP.resetSpellsUI(); // panel state is per identity and module-wide: start clean
  const h = harness();
  const ctx = h.ctx;
  SP.spellsPanel(ctx, "iria").manage = true;
  SP.spellsPanel(ctx, "iria").tab = "class";
  const page = html(h);
  assert.ok(!page.includes("data-spl-source"), "a one-option select that filters nothing");
  assert.ok(page.includes("SRD 5.2.1 · 2024"));
  for (const slug of ["shield", "fly", "fireball", "mage-armor"])
    h.run("iria", "compare", { key: row(iria(h), slug).id });
  assert.equal(h.toasts.length, 0);
  h.run("iria", "compare", { key: row(iria(h), "invisibility").id });
  assert.equal(SP.spellsPanel(ctx, "iria").compare.length, 4);
  assert.ok(!SP.spellsPanel(ctx, "iria").compare.includes(row(iria(h), "shield").id));
  assert.match(h.toasts.at(-1).text, /massimo 4.*Scudo/);
});

test("review: the palette's Manage spells command only appears on a sheet you control", () => {
  const h = harness();
  const ctx = h.ctx;
  ctx.view = { page: "characters", id: "iria", tab: "actions" };
  assert.ok(h.registry.get("command", "spells-plus.manage", ctx));
  ctx.role = "dm";
  assert.equal(h.registry.get("command", "spells-plus.manage", ctx), null);
  ctx.view = { page: "characters", id: "livia", tab: "actions" };
  assert.ok(h.registry.get("command", "spells-plus.manage", ctx));
});
