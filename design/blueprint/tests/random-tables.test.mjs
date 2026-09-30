// B25 random tables: domain (implied ranges, Normalize, replacement, variables, subtables,
// templates, outputs, history, undo) and the Table drawer / Preparation handlers through a
// small fake DOM, with the real store and the real registry. Synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import * as content from "../campaign-content.mjs";
import * as rt from "../random-tables.mjs";
import * as loot from "../loot.mjs";
import * as encounterUI from "../encounter-builder.mjs";
import * as chatUI from "../chat.mjs";

afterEach(rt.resetRandomTablesUI);

const faces = (...values) => {
  const queue = [...values];
  return (sides) => {
    const value = queue.shift();
    assert.ok(Number.isInteger(value), `No scripted face left for a d${sides}`);
    assert.ok(value >= 1 && value <= sides, `Scripted face ${value} outside d${sides}`);
    return value;
  };
};
const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

function parseNodes(html) {
  return [...html.matchAll(/<(input|button|select|textarea)\b([^>]*)(?:>([\s\S]*?)<\/\1>|>)/g)].map(
    ([, tag, attrsText, inner]) => {
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
            : tag === "textarea"
              ? decode(inner)
              : attrs.value || "",
        checked: "checked" in attrs,
        disabled: "disabled" in attrs,
        addEventListener(type, fn) {
          events[type] = fn;
        },
        getAttribute: (k) => attrs[k] ?? null,
        focus() {},
      };
    },
  );
}
function fakeRoot(html) {
  const nodes = parseNodes(html);
  return {
    html,
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

/** Real store + real registry with the area registered; `view` picks what is rendered. */
function harness({ role = "dm", view = "drawer", lang = "it", die = null, areas = [] } = {}) {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const store = createStore({ storage });
  const registry = createRegistry({ document: undefined, logger: null, deviceStorage: storage });
  const row = registry.use("random-tables", rt.register);
  assert.equal(row.status, "built", row.error ?? "");
  // Neighbouring areas the outputs write to (B26 loot parcels, B19 encounters).
  if (areas.includes("loot")) registry.use("loot", loot.register);
  if (areas.includes("encounters")) registry.use("encounter-builder", encounterUI.register);
  if (areas.includes("chat")) registry.use("chat", chatUI.register);
  registry.initState(store.state);
  const errors = [];
  const toasts = [];
  const emitted = [];
  registry.on?.("roll-accepted", (payload) => emitted.push(payload));
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    view: {
      page: view === "prep" ? "preparation" : "table",
      id: "",
      tab: view === "prep" ? "random-tables" : "",
    },
    registry,
    esc,
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (v) =>
      typeof v === "object" && v ? v[ctx.lang] || v.it || v.en || "" : String(v ?? ""),
    icon: () => "",
    rollDie: die,
    toast(text, error) {
      (error ? errors : toasts).push(text);
    },
    dialog(title, body, options = {}) {
      this.dialogState = { title, body, options };
    },
    closeDialog() {
      this.dialogState = null;
    },
    navigate(page, params = {}) {
      this.navigated = { page, params };
    },
    commit(label, mutate, options = {}) {
      if (this.offline && !options.local) {
        const it = "Sei senza rete: questa modifica condivisa non può essere applicata.";
        throw Object.assign(Error(it), {
          it,
          en: "You are offline: this shared change cannot be applied.",
        });
      }
      store.commit(label, mutate, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      this.render();
      return { applied: true, persisted: true };
    },
    canUndo: () => store.history.at(-1)?.controller === ctx.role,
    undoLabel: () => store.history.at(-1)?.label ?? "",
    undo() {
      const current = store.state;
      store.undo(this.role);
      registry.afterUndo(current, store.state);
      this.render();
    },
    render() {
      if (this.view.page === "table") {
        this.html = rt.renderDrawer(this);
        this.root = fakeRoot(this.html);
        rt.bindDrawer(this.root, this, null);
      } else {
        this.html = rt.renderPrep(this);
        this.root = fakeRoot(this.html);
        rt.bindPrep(this.root, this);
      }
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
    toasts,
    emitted,
    node,
    slice: () => store.state.ext["random-tables"],
    history: () => store.state.ext["random-tables-history"],
    has: (selector) => Boolean(ctx.root.querySelector(selector)),
    click(selector) {
      const n = node(selector);
      assert.equal(n.disabled, false, `${selector} is disabled`);
      n.events.click?.({ preventDefault() {}, target: n });
    },
    change(selector, value) {
      const n = node(selector);
      if (n.type === "checkbox") n.checked = value;
      else n.value = value;
      n.events.change?.({ target: n });
    },
    input(selector, value) {
      const n = node(selector);
      n.value = value;
      n.events.input?.({ target: n });
    },
    submit(values) {
      const state = ctx.dialogState;
      assert.ok(state, "No dialog open");
      const result = state.options.onSubmit(form(values));
      if (result !== false) ctx.dialogState = null;
      return result;
    },
  };
}
const swamp = (slice) => rt.getTable(slice, "swamp-encounters");

test("seeded d8 swamp table: implied ranges, subtable, variable and normalized die", () => {
  const slice = rt.seedSlice();
  const table = swamp(slice);
  assert.equal(table.sides, 8);
  assert.deepEqual(rt.impliedRanges(table).map(rt.rangeText), ["1–2", "3", "4–5", "6", "7", "8"]);
  assert.equal(rt.tableStatus(table).normalized, true);
  assert.equal(table.results[2].subtableId, "patrol-strength");
  assert.deepEqual(
    table.variables.map((v) => v.id),
    ["season"],
  );
  assert.equal(table.replacement, false);
  // Normalize (Foundry): weights 10 on a d8 → unreachable results, then formula d10.
  table.results.push({
    id: "extra",
    text: "Airone",
    weight: 2,
    drawn: false,
    subtableId: null,
    values: {},
  });
  const status = rt.tableStatus(table);
  assert.equal(status.total, 10);
  assert.equal(status.normalized, false);
  assert.deepEqual(status.unreachable, ["extra"]);
  assert.equal(
    rt.availableRows(table).some((r) => r.id === "extra"),
    false,
    "unreachable rows are never offered",
  );
  rt.normalizeTable(table);
  assert.equal(table.sides, 10);
  assert.equal(rt.tableStatus(table).normalized, true);
  // Fewer weights than faces: the uncovered faces are rerolled.
  table.sides = 12;
  assert.deepEqual(rt.tableStatus(table).uncovered, { from: 11, to: 12 });
  const session = rt.beginSession(slice, { kind: "table", tableId: table.id });
  assert.deepEqual(rt.resolveFace(slice, session, 12, "physical"), {
    status: "reroll",
    reason: "none",
    rowId: null,
  });
});

test("physical chain with Season filter, no replacement, reroll on drawn face and Reset", () => {
  const slice = rt.seedSlice();
  const history = { entries: [] };
  const session = rt.beginSession(slice, {
    kind: "table",
    tableId: "swamp-encounters",
    variables: { season: "winter" },
  });
  // 8 is the summer-only midges: excluded by the variable, roll again.
  assert.equal(rt.resolveFace(slice, session, 8, "physical").reason, "filtered");
  assert.throws(() => rt.resolveFace(slice, session, 9, "physical"), /1 a 8|1 to 8/);
  assert.equal(rt.resolveFace(slice, session, 4, "physical").status, "accepted");
  assert.equal(session.done, false);
  assert.equal(rt.pendingStep(slice, session).sides, 4, "subtable d4 pending");
  rt.resolveFace(slice, session, 3, "physical");
  assert.equal(session.done, true);
  assert.equal(rt.sessionText(session, "it"), "Pattuglia di goblin: tre goblin e un lupo");
  assert.equal(rt.sessionText(session, "en"), "Goblin patrol: three goblins and a wolf");
  const entry = rt.recordSession(slice, history, session, { role: "dm" });
  assert.equal(entry.steps[0].rerolls[0].reason, "filtered");
  assert.deepEqual(
    entry.variables.map((v) => v.value.it),
    ["Inverno"],
  );
  assert.equal(swamp(slice).results[2].drawn, true, "patrol drawn without replacement");
  assert.equal(
    rt.getTable(slice, "patrol-strength").results.some((r) => r.drawn),
    false,
    "subtable has replacement",
  );
  // Without replacement: 5 lands on the drawn patrol and is rolled again.
  const next = rt.beginSession(slice, { kind: "table", tableId: "swamp-encounters" });
  assert.equal(rt.resolveFace(slice, next, 5, "physical").reason, "drawn");
  rt.resolveFace(slice, next, 1, "physical");
  rt.recordSession(slice, history, next, { role: "dm" });
  assert.equal(rt.resetDrawn(slice, "swamp-encounters", "dm"), 2);
  assert.equal(
    swamp(slice).results.some((r) => r.drawn),
    false,
  );
  assert.throws(() => rt.resetDrawn(slice, "swamp-encounters", "player"), /DM/);
});

test("digital dice reroll unusable faces, choose entry is not a roll, exhausted tables refuse", () => {
  const slice = rt.seedSlice();
  const history = { entries: [] };
  const table = swamp(slice);
  table.results.forEach((r) => (r.drawn = r.id !== "swamp-lantern"));
  const session = rt.beginSession(slice, { kind: "table", tableId: table.id });
  rt.rollAll(slice, session, faces(1, 8, 6));
  assert.deepEqual(
    session.steps[0].rerolls.map((r) => [r.face, r.reason, r.mode]),
    [
      [1, "drawn", "digital"],
      [8, "drawn", "digital"],
    ],
  );
  assert.equal(session.steps[0].resultId, "swamp-lantern");
  rt.recordSession(slice, history, session, { role: "dm" });
  assert.throws(
    () => rt.beginSession(slice, { kind: "table", tableId: table.id }),
    /Nessuna voce disponibile/,
  );
  rt.resetDrawn(slice, table.id, "dm");
  const chosen = rt.beginSession(slice, {
    kind: "table",
    tableId: table.id,
    variables: { season: "summer" },
  });
  assert.throws(
    () => rt.chooseRow(slice, chosen, "swamp-ice"),
    /non è disponibile/,
    "winter row excluded in summer",
  );
  rt.chooseRow(slice, chosen, "swamp-patrol");
  assert.equal(chosen.steps[0].mode, "chosen");
  assert.equal(chosen.steps[0].face, null);
  rt.rollCurrent(slice, chosen, faces(2));
  assert.equal(chosen.steps[1].face, 2);
  assert.equal(rt.sessionHasDigital(chosen), true);
});

test("variables propagate to subtables with the same variable id", () => {
  const slice = rt.seedSlice();
  const patrol = rt.getTable(slice, "patrol-strength");
  patrol.variables = [structuredClone(swamp(slice).variables[0])];
  patrol.results[0].values = { season: "summer" };
  const session = rt.beginSession(slice, {
    kind: "table",
    tableId: "swamp-encounters",
    variables: { season: "winter" },
  });
  rt.resolveFace(slice, session, 4, "physical");
  assert.equal(rt.resolveFace(slice, session, 1, "physical").reason, "filtered");
  assert.deepEqual(
    rt.sourceVariables(slice, ["swamp-encounters"]).map((v) => v.id),
    ["season"],
  );
});

test("templates draw each [Table] reference in order, in both languages, and refuse broken refs", () => {
  const slice = rt.seedSlice();
  const session = rt.beginSession(slice, { kind: "template", templateId: "marsh-hook" }, "it");
  rt.rollAll(slice, session, faces(6, 2));
  assert.equal(
    rt.sessionText(session, "it"),
    "Lungo il guado: Una lanterna spenta galleggia tra le canne. Più tardi, alla locanda, qualcuno sussurra: «Qualcuno accende lanterne nella palude dopo mezzanotte.»",
  );
  assert.match(
    rt.sessionText(session, "en"),
    /^Along the ford: An unlit lantern floats among the reeds\./,
  );
  const entry = rt.recordSession(slice, { entries: [] }, session, { role: "dm" });
  assert.equal(typeof entry.text, "object");
  slice.templates.push({ id: "broken", name: "Rotto", text: "Vedi [Tabella che non esiste]" });
  assert.throws(
    () => rt.beginSession(slice, { kind: "template", templateId: "broken" }),
    /Tabella che non esiste/,
  );
  assert.deepEqual(
    rt.parseTemplate("A [x] b").map((p) => p.kind),
    ["text", "ref", "text"],
  );
});

test("a result changes nothing until chat, journal or loot; outputs reach log, journal and sheet", () => {
  const h = harness({ role: "dm", die: faces(6) });
  const { ctx, store } = h;
  ctx.render();
  const inventoryBefore = JSON.stringify(store.state.actors.livia.inventory);
  const entriesBefore = store.state.campaignContent?.entries.length ?? 0;
  h.click('[data-rt-start="digital"]');
  const entry = h.history().entries.at(-1);
  assert.equal(entry.text.it, "Una lanterna spenta galleggia tra le canne");
  assert.equal(JSON.stringify(store.state.actors.livia.inventory), inventoryBefore);
  assert.equal(store.state.campaignContent?.entries.length ?? 0, entriesBefore);
  const drawLog = store.state.log.at(-1);
  assert.equal(drawLog.visibility, "private", "the draw is private to the DM");
  assert.equal(h.emitted.at(-1).roll.natural, 6);
  assert.equal(h.emitted.at(-1).roll.mode, "digital");
  // Result card offers the three destinations.
  assert.ok(h.has(`[data-rt-chat="${entry.id}"]`));
  assert.ok(h.has(`[data-rt-journal="${entry.id}"]`));
  assert.ok(h.has(`[data-rt-loot="${entry.id}"]`));
  // Player cannot read it yet.
  assert.equal(rt.projectHistory(h.slice(), h.history(), "player").length, 0);
  // Chat: a shared log entry, and the player now reads the draw.
  h.click(`[data-rt-chat="${entry.id}"]`);
  assert.equal(store.state.log.at(-1).visibility, "shared");
  assert.match(store.state.log.at(-1).label, /Una lanterna spenta/);
  assert.equal(rt.projectHistory(h.slice(), h.history(), "player").length, 1);
  assert.ok(!h.has(`[data-rt-chat="${entry.id}"]`), "already shared");
  // Loot into Livia's inventory, then Undo removes it and marks the output reversed.
  h.click(`[data-rt-loot="${entry.id}"]`);
  assert.doesNotMatch(ctx.dialogState.body, /value="parcel"/, "no parcel without the loot area");
  h.submit({ destination: "actor:livia", quantity: "1", name: "Lanterna spenta" });
  const item = store.state.actors.livia.inventory.at(-1);
  assert.equal(item.name, "Lanterna spenta");
  assert.match(item.description.it, /Incontri nella palude/);
  ctx.undo();
  assert.equal(JSON.stringify(store.state.actors.livia.inventory), inventoryBefore);
  const loot = rt
    .projectHistory(h.slice(), h.history(), "dm")[0]
    .outputs.find((o) => o.kind === "loot");
  assert.equal(loot.status, "reversed");
  // Journal: a private recap in the campaign, readable by the DM only.
  h.click(`[data-rt-journal="${entry.id}"]`);
  h.submit({
    title: "Lanterna nella palude",
    body: "Galleggiava tra le canne.",
    access: "private",
  });
  const recap = content
    .listCampaignEntries(store.state, { campaignId: store.state.campaign.id }, "dm")
    .find((e) => e.data.title === "Lanterna nella palude");
  assert.ok(recap, "recap created");
  assert.equal(recap.kind, "recap");
  assert.equal(
    content
      .listCampaignEntries(store.state, { campaignId: store.state.campaign.id }, "player")
      .some((e) => e.data.title === "Lanterna nella palude"),
    false,
  );
  const projected = rt.projectHistory(h.slice(), h.history(), "dm")[0];
  assert.equal(projected.outputs.find((o) => o.kind === "journal").campaignEntryId, recap.id);
  assert.equal(
    rt
      .projectHistory(h.slice(), h.history(), "player")[0]
      .outputs.some((o) => o.kind === "journal"),
    false,
    "the player does not see the DM's private journal destination",
  );
});

test("physical step UI: variable, filtered face notice, subtable die, then undo reverses the draw", () => {
  const h = harness({ role: "dm" });
  const { ctx, store } = h;
  ctx.render();
  h.change('[data-rt-var="season"]', "winter");
  h.click('[data-rt-start="physical"]');
  assert.ok(h.has("[data-rt-face]"));
  assert.ok(h.has("[data-rt-choose-row]"), "the DM may choose an entry");
  h.node("[data-rt-face]").value = "8";
  h.click("[data-rt-physical]");
  assert.match(ctx.html, /Faccia 8: esclusa dalle variabili/);
  h.node("[data-rt-face]").value = "4";
  h.click("[data-rt-physical]");
  assert.match(ctx.html, /Ora: d4 · Consistenza della pattuglia/);
  h.node("[data-rt-face]").value = "0";
  h.click("[data-rt-physical]");
  assert.match(h.errors.at(-1), /da 1 a 4/);
  h.node("[data-rt-face]").value = "3";
  h.click("[data-rt-physical]");
  const entry = h.history().entries.at(-1);
  assert.deepEqual(
    entry.steps.map((s) => [s.face, s.mode]),
    [
      [4, "physical"],
      [3, "physical"],
    ],
  );
  assert.match(ctx.html, /Pattuglia di goblin: tre goblin e un lupo/);
  assert.equal(swamp(h.slice()).results[2].drawn, true);
  // Undo: the drawn mark returns, the evidence stays in the history as reversed.
  h.click("[data-rt-undo]");
  assert.equal(swamp(h.slice()).results[2].drawn, false);
  assert.equal(h.history().entries.length, 1);
  assert.equal(rt.projectHistory(h.slice(), h.history(), "dm")[0].status, "reversed");
  assert.equal(store.state.log.at(-1).kind, "correction");
  // Reload keeps the reversed evidence.
  const reloaded = createStore({
    storage: { getItem: () => JSON.stringify(store.state), setItem() {} },
  });
  assert.equal(reloaded.state.ext["random-tables-history"].entries.length, 1);
});

test("cancelling after a digital face keeps an interrupted entry; a physical-only cancel keeps nothing", () => {
  const h = harness({ role: "dm", die: faces(4) });
  const { ctx } = h;
  ctx.render();
  h.click('[data-rt-start="physical"]');
  h.click("[data-rt-cancel]");
  assert.equal(h.history().entries.length, 0);
  h.click('[data-rt-start="physical"]');
  h.click("[data-rt-digital]");
  assert.match(ctx.html, /Ora: d4/);
  h.click("[data-rt-cancel]");
  const entry = rt.projectHistory(h.slice(), h.history(), "dm")[0];
  assert.equal(entry.status, "incomplete");
  assert.equal(swamp(h.slice()).results[2].drawn, false, "an interrupted draw marks nothing");
});

test("player: only shared tables, no Choose entry, own draws readable by the DM, personal notes", () => {
  const h = harness({ role: "player", die: faces(2) });
  const { ctx } = h;
  ctx.render();
  const options = h.node("[data-rt-source]").inner;
  assert.match(options, /Voci alla Lanterna/);
  assert.doesNotMatch(options, /Incontri nella palude/);
  assert.ok(!h.has('[data-rt-start="choose"]'));
  h.click('[data-rt-start="digital"]');
  const entry = h.history().entries.at(-1);
  assert.equal(entry.tableId, "lantern-rumours");
  assert.deepEqual(entry.visibleTo, ["player", "dm"]);
  assert.ok(!h.has(`[data-rt-loot="${entry.id}"]`), "loot is a DM destination");
  assert.ok(h.has(`[data-rt-chat="${entry.id}"]`));
  h.node(`[data-rt-note-input="${entry.id}"]`).value = "Chiedere al fabbro";
  h.click(`[data-rt-note="${entry.id}"]`);
  assert.equal(
    rt.projectHistory(h.slice(), h.history(), "player")[0].notes[0].text,
    "Chiedere al fabbro",
  );
  assert.equal(
    rt.projectHistory(h.slice(), h.history(), "dm")[0].notes.length,
    0,
    "notes are personal",
  );
  // Offline: the player's draw on a shared table is refused before any die is rolled.
  ctx.offline = true;
  ctx.rollDie = () => assert.fail("no digital die may be rolled offline for a shared draw");
  ctx.render();
  assert.match(ctx.html, /questa estrazione è condivisa e attende la connessione/);
  const start = h.node('[data-rt-start="digital"]');
  assert.equal(start.disabled, true, "digital draw disabled offline");
  assert.equal(h.node('[data-rt-start="physical"]').disabled, true);
  start.events.click();
  assert.match(h.errors.at(-1), /Senza rete/);
  assert.equal(h.history().entries.length, 1, "nothing rolled, nothing shown, nothing kept");
  assert.ok(!h.has("[data-rt-finish]"));
});

test("offline: a finished draw with digital faces is never dropped by cancel (review P2)", () => {
  const h = harness({ role: "dm", die: faces(4) });
  const { ctx } = h;
  // The subtable is shared with players: the whole draw becomes shared data.
  rt.getTable(h.slice(), "patrol-strength").playersCanUse = true;
  ctx.render();
  h.click('[data-rt-start="physical"]');
  h.click("[data-rt-digital]");
  assert.match(ctx.html, /Ora: d4 · Consistenza della pattuglia/);
  ctx.offline = true;
  ctx.render();
  assert.equal(h.node("[data-rt-digital]").disabled, true, "the shared d4 waits offline");
  h.node("[data-rt-face]").value = "3";
  h.click("[data-rt-physical]");
  assert.ok(h.has("[data-rt-finish]"), "finished, not recorded while offline");
  assert.match(ctx.html, /Non usarla \(resta nello storico\)/);
  h.click("[data-rt-cancel]");
  assert.match(h.errors.at(-1), /I dadi digitali già mostrati restano/);
  assert.ok(h.has("[data-rt-finish]"), "cancel keeps the digital faces on screen");
  assert.equal(h.history().entries.length, 0);
  ctx.offline = false;
  h.click("[data-rt-finish]");
  const entry = h.history().entries.at(-1);
  assert.deepEqual(
    entry.steps.map((s) => [s.face, s.mode]),
    [
      [4, "digital"],
      [3, "physical"],
    ],
    "the same digital face is recorded",
  );
  // Online, a finished digital draw that cannot be recorded (the table changed meanwhile)
  // is kept as interrupted evidence by "Do not use it", never dropped.
  const other = harness({ role: "dm", die: faces(4) });
  other.ctx.render();
  other.click('[data-rt-start="physical"]');
  other.click("[data-rt-digital]");
  other.store.commit(
    "Another tab draws the patrol",
    (draft) => (draft.ext["random-tables"].tables[0].results[2].drawn = true),
    "dm",
  );
  other.node("[data-rt-face]").value = "2";
  other.click("[data-rt-physical]");
  assert.match(other.errors.at(-1), /La tabella è cambiata/);
  assert.ok(other.has("[data-rt-finish]"), "done, waiting to be recorded");
  other.click("[data-rt-cancel]");
  const kept = rt.projectHistory(other.slice(), other.history(), "dm")[0];
  assert.equal(kept.status, "incomplete");
  assert.equal(kept.steps[0].face, 4);
});

test("DM offline: private draws still record; chat waits for the connection", () => {
  const h = harness({ role: "dm", die: faces(1) });
  const { ctx } = h;
  ctx.offline = true;
  ctx.render();
  h.click('[data-rt-start="digital"]');
  const entry = h.history().entries.at(-1);
  assert.equal(entry.steps[0].resultId, "swamp-fog");
  h.click(`[data-rt-chat="${entry.id}"]`);
  assert.match(h.errors.at(-1), /senza rete/);
  assert.equal(rt.projectHistory(h.slice(), h.history(), "player").length, 0);
});

test("Preparation editor: weights, Normalize, variable values, save, guard and validation", () => {
  const h = harness({ role: "dm", view: "prep" });
  const { ctx, registry } = h;
  ctx.render();
  assert.match(ctx.html, /Incontri nella palude/);
  assert.ok(
    h.has('[data-rt-select="table:swamp-encounters"][aria-current="true"]') ||
      /aria-current="true"/.test(ctx.html),
  );
  h.click("[data-rt-row-add]");
  const last = ui().editor.draft.results.length - 1;
  h.input(`[data-rt-row-field="text"]`, "Nebbia fitta: si vede a pochi passi");
  // Type into the new row.
  const textInputs = ctx.root
    .querySelectorAll("[data-rt-row-field]")
    .filter((n) => n.dataset.rtRowField === "text");
  textInputs[last].value = "Un airone di pietra sul guado";
  textInputs[last].events.input({ target: textInputs[last] });
  const weights = ctx.root
    .querySelectorAll("[data-rt-row-field]")
    .filter((n) => n.dataset.rtRowField === "weight");
  weights[last].value = "2";
  weights[last].events.input({ target: weights[last] });
  assert.equal(ui().editor.dirty, true);
  assert.ok(registry.pendingDraft(ctx, { page: "campaign" }), "leaving asks about unsaved edits");
  assert.equal(registry.pendingDraft(ctx, { page: "preparation", tab: "random-tables" }), null);
  ctx.render();
  assert.match(ctx.html, /Pesi 10 su d8/);
  h.click("[data-rt-normalize]");
  assert.equal(ui().editor.draft.sides, 10);
  assert.match(ctx.html, /Pesi 10 = d10/);
  h.click("[data-rt-save]");
  const saved = swamp(h.slice());
  assert.equal(saved.sides, 10);
  assert.equal(saved.results.at(-1).text, "Un airone di pietra sul guado");
  assert.equal(saved.results.at(-1).weight, 2);
  assert.equal(typeof saved.name, "object", "untouched bilingual name stays bilingual");
  assert.equal(h.store.state.log.at(-1).visibility, "private");
  // Validation: a duplicate name is refused with a readable message.
  ctx.render();
  h.input('[data-rt-field="name"]', "Voci alla Lanterna");
  h.click("[data-rt-save]");
  assert.match(ctx.html, /Esiste già una tabella con questo nome/);
  // Deleting a table used as a subtable is refused.
  assert.throws(() => rt.deleteTable(h.slice(), "patrol-strength", "dm"), /Incontri nella palude/);
});

test("new table starts like a Chartopia chart; subtable loops are refused", () => {
  const h = harness({ role: "dm", view: "prep" });
  const { ctx } = h;
  ctx.render();
  h.click('[data-rt-new="table"]');
  h.submit({ name: "Bottino del guado", sides: "6" });
  assert.equal(ui().editor.draft.results.length, 6);
  assert.equal(rt.tableStatus(ui().editor.draft).normalized, true);
  h.click("[data-rt-save]");
  const created = h.slice().tables.find((t) => t.name === "Bottino del guado");
  assert.ok(created);
  const slice = h.slice();
  const draft = rt.tableDraft(rt.getTable(slice, "patrol-strength"));
  draft.results[0].subtableId = "swamp-encounters";
  assert.throws(() => rt.validateTableDraft(slice, draft), /giro di sottotabelle/);
});

test("multi-sided token: placed from a table, random and chosen sides recorded", () => {
  const slice = rt.seedSlice();
  const history = { entries: [] };
  const token = rt.placeToken(
    slice,
    { tableId: "marsh-weather", sceneId: "old-watch", x: 500, y: 300 },
    "dm",
  );
  assert.equal(token.resultId, "weather-mist", "starts on side 1");
  assert.throws(
    () =>
      rt.placeToken(
        slice,
        { tableId: "marsh-weather", sceneId: "old-watch", x: 1, y: 1 },
        "player",
      ),
    /DM/,
  );
  const session = rt.beginSession(slice, {
    kind: "token",
    tableId: "marsh-weather",
    tokenId: token.id,
  });
  rt.resolveFace(slice, session, 2, "physical");
  rt.recordSession(slice, history, session, { role: "dm" });
  assert.equal(slice.tokens[0].resultId, "weather-drizzle");
  const chosen = rt.beginSession(slice, {
    kind: "token",
    tableId: "marsh-weather",
    tokenId: token.id,
  });
  rt.chooseRow(slice, chosen, "weather-clear");
  rt.recordSession(slice, history, chosen, { role: "dm" });
  assert.equal(slice.tokens[0].resultId, "weather-clear");
  assert.throws(() => rt.deleteTable(slice, "marsh-weather", "dm"), /pedina/);
  rt.removeToken(slice, token.id, "dm");
  assert.equal(slice.tokens.length, 0);
});

test("state slices: seed, idempotent normalize, newer versions refused; registration points", () => {
  const seeded = rt.seedSlice();
  assert.deepEqual(rt.normalizeSlice(structuredClone(seeded), 1), seeded);
  assert.throws(() => rt.normalizeSlice(seeded, 2), /newer/);
  assert.deepEqual(rt.normalizeHistory({ entries: [{ id: 1 }] }, 1), { entries: [] });
  const h = harness({ role: "dm" });
  const points = {
    "preparation-section": "random-tables",
    "table-panel": "random-tables",
    "table-tool": "random-tables-place",
    "map-layer": "random-tables-tokens",
    "sheet-section": "random-tables-hand",
    command: "random-tables.open",
    search: "random-tables-search",
    notifications: "random-tables-cards",
    "draft-guard": "random-tables-editor",
  };
  for (const [point, id] of Object.entries(points)) assert.ok(h.registry.get(point, id), point);
  assert.equal(
    h.registry
      .list("preparation-section", { ...h.ctx, role: "player" })
      .some((c) => c.id === "random-tables"),
    false,
  );
  const found = h.registry.search(h.ctx, "palude").map((r) => r.title.it ?? r.title);
  assert.ok(found.includes("Incontri nella palude"));
  const playerFound = h.registry
    .search({ ...h.ctx, role: "player" }, "palude")
    .map((r) => r.title.it ?? r.title);
  assert.equal(
    playerFound.includes("Incontri nella palude"),
    false,
    "private tables stay out of player search",
  );
});

test("English drawer labels", () => {
  const h = harness({ role: "dm", lang: "en" });
  h.ctx.render();
  assert.match(h.ctx.html, /Draw with digital dice/);
  assert.match(h.ctx.html, /Enter physical roll/);
  assert.match(h.ctx.html, /Choose entry/);
  assert.match(h.ctx.html, /Swamp encounters/);
});

const ui = () => rt.uiState();

// ---------------------------------------------------------------------------------------
// Review fixes (24/09): one test per finding, reproduced first.

test("multi-column table: output column, all columns, text filter on a column (PR-59)", () => {
  const slice = rt.seedSlice();
  const table = rt.getTable(slice, "ford-travellers");
  assert.deepEqual(
    table.columns.map((c) => c.id),
    ["wants", "knows"],
  );
  const all = rt.beginSession(slice, { kind: "table", tableId: table.id });
  rt.resolveFace(slice, all, 3, "physical");
  assert.equal(
    rt.sessionText(all, "it"),
    "Un mercante di corde · Cosa vuole: compagnia fino a Bruma · Cosa sa: i goblin pagano in monete antiche",
  );
  const knows = rt.beginSession(slice, { kind: "table", tableId: table.id, column: "knows" });
  rt.resolveFace(slice, knows, 2, "physical");
  assert.equal(rt.sessionText(knows, "en"), "lights in the marsh after midnight");
  // Chartopia filter_cols: only rows whose "Knows" column mentions goblins.
  const filtered = rt.beginSession(slice, {
    kind: "table",
    tableId: table.id,
    filter: { text: "goblin", column: "knows" },
  });
  assert.equal(rt.resolveFace(slice, filtered, 1, "physical").reason, "text");
  assert.equal(rt.resolveFace(slice, filtered, 6, "physical").status, "accepted");
  const entry = rt.recordSession(slice, { entries: [] }, filtered, { role: "dm" });
  assert.deepEqual(entry.filter, { text: "goblin", column: "knows" });
  assert.equal(entry.column, "all");
  assert.equal(entry.steps[0].rerolls[0].reason, "text");
  // Templates and subtables use the first column only.
  assert.equal(
    rt.stepText({ kind: "template", column: "all" }, entry.steps[0], "it"),
    "Un vecchio con un corvo",
  );
});

test("drawer: column select and filter before rolling, shown in the card and the range table", () => {
  const h = harness({ role: "dm", die: faces(1, 3) });
  const { ctx } = h;
  ctx.render();
  h.change("[data-rt-source]", "table:ford-travellers");
  assert.match(ctx.html, /<table class="rt-col-table">/);
  assert.match(ctx.html, /<th scope="col">Cosa sa<\/th>/);
  // Typing and choosing update the draw state in place: no re-render, so the next click
  // reaches its button and Tab moves on (review r2).
  const before = ctx.root;
  h.change("[data-rt-column]", "knows");
  h.input("[data-rt-filter-text]", "goblin");
  h.change("[data-rt-filter-text]", "goblin");
  h.change("[data-rt-filter-column]", "knows");
  assert.equal(ctx.root, before, "no re-render while choosing");
  assert.deepEqual(ui().filter, { tableId: "ford-travellers", text: "goblin", column: "knows" });
  ctx.render();
  assert.equal((ctx.html.match(/Esclusa dal filtro/g) ?? []).length, 4);
  h.click('[data-rt-start="digital"]');
  const entry = h.history().entries.at(-1);
  assert.equal(entry.text.it, "i goblin pagano in monete antiche");
  assert.match(ctx.html, /Colonna: Cosa sa · Filtro «goblin» \(Cosa sa\)/);
  assert.match(ctx.html, /Faccia 1 \(dado digitale\): esclusa dal filtro, ritirata/);
  // The filter belongs to its table: another table in Preparation is not filtered by it.
  ctx.view = { page: "preparation", tab: "random-tables", id: "" };
  ctx.render();
  assert.match(ctx.html, /data-rt-filter-text maxlength="40" value=""/);
  assert.doesNotMatch(ctx.html, /Esclusa dal filtro/);
  assert.doesNotMatch(ctx.html, /Viandanti al guado<\/strong>/, "no card from another table");
  ctx.view = { page: "table", tab: "", id: "" };
  ctx.render();
  assert.equal(ui().filter.text, "goblin", "back on its table, the filter is still there");
  h.click("[data-rt-filter-clear]");
  assert.equal(ui().filter.text, "");
});

test("editor: named columns and cells are saved; a removed column drops its cells", () => {
  const h = harness({ role: "dm", view: "prep" });
  const { ctx } = h;
  ctx.render();
  h.click('[data-rt-select="table:marsh-weather"]');
  h.input("[data-rt-main-column]", "Cielo");
  h.click("[data-rt-col-add]");
  h.input('[data-rt-col-name="0"]', "Effetto");
  const cells = ctx.root.querySelectorAll("[data-rt-row-cell]");
  assert.equal(cells.length, 4);
  cells[0].value = "si vede a 9 metri";
  cells[0].events.input({ target: cells[0] });
  h.click("[data-rt-save]");
  const saved = rt.getTable(h.slice(), "marsh-weather");
  assert.equal(saved.mainColumn, "Cielo");
  assert.equal(saved.columns.length, 1);
  assert.match(saved.columns[0].id, /^col-/);
  assert.equal(saved.results[0].cells[saved.columns[0].id], "si vede a 9 metri");
  assert.deepEqual(rt.normalizeSlice(structuredClone(h.slice()), 1).tables[3], saved);
  ctx.render();
  h.click('[data-rt-col-remove="0"]');
  h.click("[data-rt-save]");
  assert.deepEqual(rt.getTable(h.slice(), "marsh-weather").results[0].cells, {});
});

test("variable ids follow the typed names: a subtable's own variable is offered and filters", () => {
  const slice = rt.seedSlice();
  const variable = (name, values) => ({
    id: "variabile-1",
    name,
    any: false,
    options: values.map((v) => ({ value: v, label: v })),
  });
  const draftFor = (name, vari, rows) => ({
    kind: "table",
    id: null,
    lang: "it",
    name,
    sides: rows.length,
    replacement: true,
    playersCanUse: false,
    variables: [vari],
    columns: [],
    mainColumn: null,
    results: rows.map((r, i) => ({
      id: `r${i}`,
      text: r.text,
      weight: 1,
      values: r.values ?? {},
      subtableId: r.sub ?? null,
    })),
  });
  const hour = rt.applyTableDraft(
    slice,
    draftFor("Ora del giorno", variable("Momento", ["giorno", "notte"]), [
      { text: "Rane che cantano", values: { "variabile-1": "notte" } },
      { text: "Aironi al sole", values: { "variabile-1": "giorno" } },
    ]),
    "dm",
  );
  const terrain = rt.applyTableDraft(
    slice,
    draftFor("Terreni", variable("Terreno", ["palude", "bosco"]), [
      { text: "Acqua ferma", values: { "variabile-1": "palude" }, sub: hour.id },
      { text: "Radici", values: { "variabile-1": "bosco" } },
    ]),
    "dm",
  );
  assert.equal(hour.variables[0].id, "momento");
  assert.equal(terrain.variables[0].id, "terreno");
  assert.deepEqual(hour.results[0].values, { momento: "notte" }, "row values follow the new id");
  assert.deepEqual(
    rt.sourceVariables(slice, [terrain.id]).map((v) => labelIt(v.name)),
    ["Terreno", "Momento"],
  );
  // Default is the first authored value (Chartopia): palude, and giorno in the subtable.
  const session = rt.beginSession(slice, { kind: "table", tableId: terrain.id });
  assert.deepEqual(session.variables, { terreno: "palude", momento: "giorno" });
  rt.resolveFace(slice, session, 1, "physical");
  assert.equal(rt.resolveFace(slice, session, 1, "physical").reason, "filtered");
  // A variable named like another table's one shares its id: values propagate by name.
  const again = rt.applyTableDraft(
    slice,
    draftFor("Luoghi", variable("terreno", ["palude"]), [{ text: "Canneto" }]),
    "dm",
  );
  assert.equal(again.variables[0].id, "terreno");
  assert.throws(
    () =>
      rt.applyTableDraft(
        slice,
        {
          ...draftFor("Doppia", variable("A", ["x"]), [{ text: "x" }]),
          variables: [variable("A", ["x"]), { ...variable("a", ["y"]), id: "v2" }],
        },
        "dm",
      ),
    /Due variabili si chiamano/,
  );
});

test("variables: no «Any» unless the author puts it first; the seeded Season keeps it", () => {
  const h = harness({ role: "dm", view: "prep" });
  const { ctx } = h;
  ctx.render();
  h.click("[data-rt-var-add]");
  h.input('[data-rt-var-name="1"]', "Luce");
  h.change('[data-rt-var-options="1"]', "Giorno, Notte");
  h.click("[data-rt-save]");
  const table = swamp(h.slice());
  const light = table.variables.find((v) => v.name === "Luce");
  assert.equal(light.id, "luce", "the id comes from the typed name");
  assert.equal(light.any, false);
  assert.equal(rt.variableValue(light, {}), "giorno", "first authored value by default");
  assert.equal(rt.variableValue(table.variables[0], {}), rt.ANY, "Season: Any is its first value");
  const drawer = harness({ role: "dm" });
  drawer.ctx.render();
  const season = drawer.node('[data-rt-var="season"]');
  assert.match(season.inner, /^<option value="any" selected>Qualsiasi/);
  // An author variable without "Any" offers only its values.
  rt.getTable(drawer.slice(), "swamp-encounters").variables[0].any = false;
  drawer.ctx.render();
  assert.doesNotMatch(drawer.node('[data-rt-var="season"]').inner, /Qualsiasi/);
  assert.equal(drawer.node('[data-rt-var="season"]').value, "spring");
});

test("loot goes to a hidden B26 parcel of the scene by default, or to a sheet (review P2)", () => {
  const h = harness({ role: "dm", die: faces(6), areas: ["loot"] });
  const { ctx, store } = h;
  ctx.render();
  const inventory = JSON.stringify(store.state.actors.livia.inventory);
  h.click('[data-rt-start="digital"]');
  const entry = h.history().entries.at(-1);
  h.click(`[data-rt-loot="${entry.id}"]`);
  assert.match(ctx.dialogState.body, /<option value="parcel">Pacchetto nascosto della scena/);
  h.submit({ destination: "parcel", quantity: "2", name: "Lanterna spenta", value: "0.5" });
  const parcels = store.state.ext.loot.parcels;
  assert.equal(parcels.length, 1);
  assert.equal(parcels[0].sceneId, "old-watch");
  assert.equal(parcels[0].revealed, false, "hidden until the DM shows it");
  assert.equal(parcels[0].items[0].name.it, "Lanterna spenta");
  assert.equal(parcels[0].items[0].quantity, 2);
  assert.equal(parcels[0].items[0].value, 50);
  assert.equal(JSON.stringify(store.state.actors.livia.inventory), inventory, "no sheet change");
  assert.equal(store.state.log.at(-1).visibility, "private");
  assert.match(ctx.html, /nel pacchetto «Da tabelle casuali» \(nascosto finché non lo mostri\)/);
  assert.equal(
    rt.projectHistory(h.slice(), h.history(), "player").length,
    0,
    "the DM draw stays private",
  );
  h.click("[data-rt-chat]");
  assert.equal(
    rt.projectHistory(h.slice(), h.history(), "player")[0].outputs.some((o) => o.kind === "loot"),
    false,
    "a shared draw does not reveal the hidden parcel",
  );
  h.click("[data-rt-open-loot]");
  assert.deepEqual(ctx.navigated, { page: "preparation", params: { tab: "loot" } });
  ctx.undo(); // chat
  ctx.undo(); // parcel item
  assert.equal(store.state.ext.loot.parcels.length, 0);
  assert.equal(
    rt.projectHistory(h.slice(), h.history(), "dm")[0].outputs.find((o) => o.kind === "loot")
      .status,
    "reversed",
  );
});

test("encounter output: a new B19 encounter with the result as its note, no creature inferred", () => {
  const h = harness({ role: "dm", die: faces(4, 4), areas: ["loot", "encounters"] });
  const { ctx, store } = h;
  ctx.render();
  h.click('[data-rt-start="digital"]');
  const entry = h.history().entries.at(-1);
  assert.equal(entry.text.it, "Pattuglia di goblin: cinque goblin guidati da un capo");
  h.click(`[data-rt-encounter="${entry.id}"]`);
  assert.match(ctx.dialogState.body, /Nessuna creatura viene aggiunta in automatico/);
  h.submit({ encounter: "", name: "Pattuglia al guado", summary: entry.text.it });
  const builder = store.state.ext["encounter-builder"];
  const created = builder.encounters.find((e) => e.name === "Pattuglia al guado");
  assert.ok(created, "encounter created");
  assert.equal(created.notes.summary, "Pattuglia di goblin: cinque goblin guidati da un capo");
  assert.equal(created.rows.length, 0, "no creature inferred from the text");
  assert.match(ctx.html, /Nuovo incontro: «Pattuglia al guado»/);
  // Appending to an existing encounter adds to its note.
  h.click(`[data-rt-encounter="${entry.id}"]`);
  h.submit({ encounter: created.id, name: "", summary: "Rinforzi al tramonto" });
  assert.match(
    store.state.ext["encounter-builder"].encounters.find((e) => e.id === created.id).notes.summary,
    /cinque goblin guidati da un capo\n\nRinforzi al tramonto$/,
  );
  h.click(`[data-rt-open-encounter="${created.id}"]`);
  assert.deepEqual(ctx.navigated, { page: "preparation", params: { tab: "encounter-builder" } });
  assert.equal(encounterUI.uiState(ctx).openId, created.id);
  assert.equal(
    rt.projectHistory(h.slice(), h.history(), "player").length,
    0,
    "encounters are DM preparation",
  );
  ctx.undo();
  ctx.undo();
  assert.equal(
    store.state.ext["encounter-builder"].encounters.some((e) => e.id === created.id),
    false,
  );
  assert.throws(
    () =>
      rt.addEncounterOutput(
        store.state,
        h.slice(),
        h.history(),
        entry.id,
        { name: "X", summary: "y" },
        "player",
      ),
    /Solo il DM/,
  );
});

test("Undo shows its target and refuses a draw already in the journal (review P2)", () => {
  const h = harness({ role: "dm", die: faces(2) });
  const { ctx } = h;
  ctx.render();
  h.click('[data-rt-start="digital"]');
  const entry = h.history().entries.at(-1);
  assert.match(ctx.html, /Annullerebbe: Estrazione: Incontri nella palude → Nebbia fitta/);
  h.click(`[data-rt-journal="${entry.id}"]`);
  h.submit({ title: "Nebbia", body: "Nebbia fitta.", access: "campaign" });
  h.click("[data-rt-undo]");
  assert.match(h.errors.at(-1), /già nel diario della campagna/);
  assert.equal(rt.projectHistory(h.slice(), h.history(), "dm")[0].status, "accepted");
  assert.equal(swamp(h.slice()).results[0].drawn, true, "the draw still counts");
  // Another undoable change on top is undone normally.
  h.click(`[data-rt-chat="${entry.id}"]`);
  h.click("[data-rt-undo]");
  assert.equal(rt.projectHistory(h.slice(), h.history(), "dm")[0].shared, false);
});

test("deck and template editors show unsaved changes live and enable Discard (review P2)", () => {
  const h = harness({ role: "dm", view: "prep" });
  const { ctx } = h;
  ctx.render();
  h.click('[data-rt-select="deck:fate"]');
  assert.equal(h.node("[data-rt-discard]").disabled, true);
  h.input('[data-rt-field="name"]', "Destino antico");
  assert.equal(ui().editor.dirty, true);
  assert.equal(h.node("[data-rt-discard]").disabled, false, "deck name");
  ctx.render();
  h.click("[data-rt-discard]");
  h.submit({});
  h.change('[data-rt-setting="dmSeesHands"]', true);
  assert.equal(h.node("[data-rt-discard]").disabled, false, "deck setting");
  ctx.render();
  h.click("[data-rt-discard]");
  h.submit({});
  h.click('[data-rt-select="template:marsh-hook"]');
  assert.equal(h.node("[data-rt-discard]").disabled, true);
  h.input('[data-rt-field="name"]', "Spunto del guado");
  assert.equal(h.node("[data-rt-discard]").disabled, false, "template name");
});

test("renaming a table updates the [references] of its text templates", () => {
  const h = harness({ role: "dm", view: "prep" });
  const { ctx } = h;
  ctx.render();
  h.input('[data-rt-field="name"]', "Incontri al guado");
  h.click("[data-rt-save]");
  const template = rt.getTemplate(h.slice(), "marsh-hook");
  assert.match(template.text.it, /^Lungo il guado: \[Incontri al guado\]\./);
  assert.match(template.text.en, /^Along the ford: \[Incontri al guado\]\./);
  assert.match(h.toasts.at(-1), /Nome aggiornato anche nei modelli di testo \(1\)/);
  const session = rt.beginSession(h.slice(), { kind: "template", templateId: "marsh-hook" });
  assert.equal(session.queue[0].tableId, "swamp-encounters");
});

test("search opens the matched item; a player's hit opens the drawer tab (review P3)", () => {
  const h = harness({ role: "dm", view: "prep" });
  const { ctx, registry } = h;
  const [hit] = registry.search(ctx, "Meteo");
  assert.deepEqual(hit.params, { tab: "random-tables", id: "table:marsh-weather" });
  ctx.view = { page: "preparation", tab: "random-tables", id: "table:marsh-weather" };
  ctx.render();
  assert.equal(ui().editor.draft.id, "marsh-weather");
  // The DM then picks another item: the route does not pull the selection back.
  h.click('[data-rt-select="deck:fate"]');
  ctx.render();
  assert.equal(ui().editor.kind, "deck");
  // Following the same hit again is a new navigation: the table opens again.
  ctx.view = { page: "preparation", tab: "random-tables", id: "table:marsh-weather" };
  ctx.render();
  assert.equal(ui().editor.draft.id, "marsh-weather");
  const [deckHit] = registry.search({ ...ctx, role: "player" }, "Destino");
  assert.deepEqual(deckHit, {
    ...deckHit,
    page: "table",
    params: { tab: rt.ROUTE_TAB.decks },
  });
});

test("the Cards received notification and the route tab open the drawer on Decks (review P3)", async () => {
  const h = harness({ role: "player" });
  const { ctx, registry, store } = h;
  store.commit(
    "deal",
    (draft) => {
      draft.ext["random-tables"].decks[0].hands.livia = ["fate-lantern"];
      draft.ext["random-tables"].decks[0].events.push({
        id: "e1",
        at: new Date().toISOString(),
        kind: "deal",
        actorId: "livia",
        count: 1,
        by: "dm",
      });
    },
    "dm",
  );
  const [note] = registry.notifications(ctx);
  assert.equal(note.title.it, "Livia: 1 carta (Destino)");
  assert.deepEqual(note.target, { page: "table", params: { tab: rt.ROUTE_TAB.decks } });
  let clicked = 0;
  const button = { getAttribute: () => "false", click: () => clicked++ };
  const table = { root: { querySelector: () => button }, scene: store.state.scenes[0] };
  ctx.view = { page: "table", tab: rt.ROUTE_TAB.decks, id: "" };
  const layer = registry.get("map-layer", "random-tables-tokens");
  layer.bind({ querySelectorAll: () => [], querySelector: () => null }, ctx, table);
  await Promise.resolve();
  assert.equal(ui().drawerTab, "decks");
  assert.equal(clicked, 1, "the drawer opens");
  // The same route does not reopen the drawer on every render.
  layer.bind({ querySelectorAll: () => [], querySelector: () => null }, ctx, table);
  await Promise.resolve();
  assert.equal(clicked, 1);
});

test("multi-sided token: drag and arrow keys move it, hidden from players, explicit table", () => {
  const h = harness({ role: "dm" });
  const { ctx, registry, store } = h;
  const layer = registry.get("map-layer", "random-tables-tokens");
  const tool = registry.get("table-tool", "random-tables-place");
  const messages = [];
  const scene = store.state.scenes.find((s) => s.id === "old-watch");
  const table = {
    scene,
    root: { querySelector: () => null },
    message: (text) => messages.push(text),
    setMode: () => {},
    point: (event) => ({ x: event.clientX, y: event.clientY }),
  };
  // No table chosen: the tool asks for one instead of using the first table.
  tool.activate(ctx, table);
  tool.onClick(ctx, { clientX: 100, clientY: 100 }, table);
  assert.match(messages.at(-1), /Scegli prima la tabella/);
  assert.equal(h.slice().tokens.length, 0);
  ctx.render();
  h.change("[data-rt-source]", "table:marsh-weather");
  tool.onClick(ctx, { clientX: 300, clientY: 200 }, table);
  const [token] = h.slice().tokens;
  assert.equal(token.tableId, "marsh-weather");
  const handlers = {};
  const node = {
    dataset: { rtToken: token.id },
    classList: { add() {} },
    setAttribute() {},
    setPointerCapture() {},
    releasePointerCapture() {},
    addEventListener: (type, fn) => (handlers[type] = fn),
    focus() {},
  };
  const el = { querySelectorAll: () => [node], querySelector: () => node };
  layer.bind(el, ctx, table);
  const ev = (x, y) => ({
    clientX: x,
    clientY: y,
    button: 0,
    pointerId: 1,
    stopPropagation() {},
    preventDefault() {},
  });
  handlers.pointerdown(ev(300, 200));
  handlers.pointermove(ev(360, 240));
  handlers.pointerup(ev(420, 260));
  assert.deepEqual([h.slice().tokens[0].x, h.slice().tokens[0].y], [420, 260]);
  let opened = false;
  const dialog = ctx.dialog;
  ctx.dialog = () => (opened = true);
  handlers.click(ev(420, 260));
  assert.equal(opened, false, "the click after a drag does not open the sides");
  layer.bind(el, ctx, table);
  handlers.keydown({ key: "ArrowLeft", stopPropagation() {}, preventDefault() {} });
  assert.equal(h.slice().tokens[0].x, 420 - (scene.gridSize ?? 50));
  handlers.keydown({ key: "Enter", stopPropagation() {}, preventDefault() {} });
  assert.equal(opened, true);
  ctx.dialog = dialog;
  // Hidden from players: absent from their map; DM sees it marked.
  rt.setTokenHidden(h.slice(), token.id, true, "dm");
  assert.match(layer.svg(ctx, { scene }), /is-hidden/);
  assert.equal(layer.svg({ ...ctx, role: "player" }, { scene }), "");
  assert.throws(() => rt.setTokenHidden(h.slice(), token.id, false, "player"), /Solo il DM/);
  assert.throws(() => rt.moveToken(h.slice(), token.id, { x: 1, y: 1 }, "player"), /Solo il DM/);
  const clamped = rt.moveToken(h.slice(), token.id, { x: -40, y: 99999 }, "dm", scene);
  assert.deepEqual([clamped.x, clamped.y], [0, scene.height]);
});

const labelIt = (value) => (typeof value === "object" ? value.it : value);

// ---------------------------------------------------------------------------------------
// Review round 2.

test("multi-sided token: any side at any time; the table is never consumed (review r2 P2)", () => {
  const slice = rt.seedSlice();
  const history = { entries: [] };
  const table = swamp(slice);
  assert.equal(table.replacement, false, "the seed table draws without replacement");
  const token = rt.placeToken(
    slice,
    { tableId: table.id, sceneId: "old-watch", x: 10, y: 10 },
    "dm",
  );
  const side = (fn) => {
    const session = rt.beginSession(slice, { kind: "token", tableId: table.id, tokenId: token.id });
    fn(session);
    rt.recordSession(slice, history, session, { role: "dm" });
    return slice.tokens[0].resultId;
  };
  // Roll20 "Choose side": back and forth, and a side a normal draw already used.
  assert.equal(
    side((s) => rt.chooseRow(slice, s, "swamp-fog")),
    "swamp-fog",
  );
  assert.equal(
    side((s) => rt.chooseRow(slice, s, "swamp-heron")),
    "swamp-heron",
  );
  assert.equal(
    side((s) => rt.chooseRow(slice, s, "swamp-fog")),
    "swamp-fog",
  );
  const draw = rt.beginSession(slice, { kind: "table", tableId: table.id });
  rt.resolveFace(slice, draw, 3, "physical"); // swamp-heron (fog 1-2, heron 3)
  rt.recordSession(slice, history, draw, { role: "dm" });
  assert.deepEqual(
    table.results.filter((r) => r.drawn).map((r) => r.id),
    ["swamp-heron"],
    "only the ordinary draw marks its row",
  );
  assert.equal(
    side((s) => rt.chooseRow(slice, s, "swamp-heron")),
    "swamp-heron",
  );
  // Variables never hide a side ("Winter ice" is a winter row), and every face works.
  assert.equal(
    side((s) => rt.chooseRow(slice, s, "swamp-ice")),
    "swamp-ice",
  );
  for (let face = 1; face <= table.sides; face++)
    side((s) => assert.equal(rt.resolveFace(slice, s, face, "physical").status, "accepted"));
  // "Random side" with a digital die many times over, still never exhausting the table.
  for (let i = 0; i < 20; i++) side((s) => rt.rollAll(slice, s, () => 1 + (i % 8)));
  assert.deepEqual(
    table.results.filter((r) => r.drawn).map((r) => r.id),
    ["swamp-heron"],
  );
});

test("token tool: Enter on the map places the chosen table's token at the centre (review r2 P2)", () => {
  const h = harness({ role: "dm" });
  const { ctx, registry, store } = h;
  const tool = registry.get("table-tool", "random-tables-place");
  const layer = registry.get("map-layer", "random-tables-tokens");
  assert.equal(tool.icon, "dice", "not the pointer's flag");
  const scene = store.state.scenes.find((s) => s.id === "old-watch");
  const messages = [];
  let mode = "random-tables-place";
  const table = {
    scene,
    root: { querySelector: () => null },
    message: (text) => messages.push(text),
    setMode: (next) => (mode = next),
    point: (event) => ({ x: event.clientX, y: event.clientY }),
  };
  ctx.render();
  h.change("[data-rt-source]", "table:marsh-weather");
  tool.activate(ctx, table);
  assert.match(messages.at(-1), /oppure Invio al centro della scena/);
  const key = (target) => ({ key: "Enter", target, preventDefault() {} });
  // Enter on a creature token keeps the Table's own meaning (select it).
  tool.onKeyDown(ctx, key({ closest: () => ({}) }), table);
  assert.equal(h.slice().tokens.length, 0);
  tool.onKeyDown(ctx, key({ closest: () => null }), table);
  const [token] = h.slice().tokens;
  assert.deepEqual([token.tableId, token.x, token.y], ["marsh-weather", 500, 325]);
  assert.equal(mode, "move");
  // The new token takes the focus, ready for the arrow keys.
  let focused = null;
  const node = {
    dataset: { rtToken: token.id },
    addEventListener() {},
    focus: () => (focused = token.id),
  };
  layer.bind({ querySelectorAll: () => [node], querySelector: () => node }, ctx, table);
  assert.equal(focused, token.id);
  // Escape leaves the tool.
  mode = "random-tables-place";
  tool.onKeyDown(ctx, { key: "Escape" }, table);
  assert.equal(mode, "move");
});

test("right-click on a multi-sided token opens its sides, not the scene menu (review r2 P3)", () => {
  const h = harness({ role: "dm" });
  const { ctx, registry, store } = h;
  const layer = registry.get("map-layer", "random-tables-tokens");
  const token = rt.placeToken(
    h.slice(),
    { tableId: "marsh-weather", sceneId: "old-watch", x: 5, y: 5 },
    "dm",
  );
  const handlers = {};
  const node = {
    dataset: { rtToken: token.id },
    addEventListener: (type, fn) => (handlers[type] = fn),
    focus() {},
  };
  const scene = store.state.scenes[0];
  layer.bind({ querySelectorAll: () => [node], querySelector: () => null }, ctx, { scene });
  let stopped = false;
  let prevented = false;
  handlers.contextmenu({
    preventDefault: () => (prevented = true),
    stopPropagation: () => (stopped = true),
  });
  assert.ok(stopped && prevented);
  assert.match(ctx.dialogState.title, /Pedina: Meteo sulla palude/);
  assert.match(ctx.dialogState.body, /Lato casuale/);
  assert.match(ctx.dialogState.body, /Scegli lato/);
});

test("editor: weights, variable values and template text never re-render; one click saves (review r2 P2/P3)", () => {
  const h = harness({ role: "dm", view: "prep" });
  const { ctx } = h;
  ctx.render();
  let root = ctx.root;
  const weight = ctx.root
    .querySelectorAll("[data-rt-row-field]")
    .filter((n) => n.dataset.rtRowField === "weight")[1];
  weight.value = "3";
  weight.events.input({ target: weight });
  assert.equal(weight.events.change, undefined, "no re-render when the field loses focus");
  assert.equal(ctx.root, root);
  h.click("[data-rt-save]");
  assert.equal(swamp(h.slice()).results[1].weight, 3, "the first click saves");
  // Variable values: the row selects are patched in place.
  ctx.render();
  root = ctx.root;
  const values = h.node('[data-rt-var-options="0"]');
  values.value = values.value + ", Monsone, Monsone";
  values.events.change({ target: values });
  assert.equal(ctx.root, root);
  assert.match(values.value, /Inverno, Monsone$/, "shown as saved, duplicates merged");
  const rowSelect = ctx.root.querySelectorAll('[data-rt-row-var="season"]')[0];
  assert.match(rowSelect.innerHTML, /Monsone/);
  h.click("[data-rt-save]");
  assert.ok(swamp(h.slice()).variables[0].options.some((o) => o.label === "Monsone"));
  // Template text: references follow the typing; the first click saves.
  ctx.render();
  h.click('[data-rt-select="template:marsh-hook"]');
  root = ctx.root;
  const text = h.node('[data-rt-field="text"]');
  assert.equal(text.events.change, undefined);
  h.input('[data-rt-field="text"]', text.value + " Fine.");
  assert.equal(ctx.root, root);
  h.click("[data-rt-save]");
  assert.match(labelIt(rt.getTemplate(h.slice(), "marsh-hook").text), /Fine\.$/);
});

test("history visibility badge speaks to its viewer (review r2 P3)", () => {
  const h = harness({ role: "player", die: faces(2) });
  const { ctx } = h;
  ctx.render();
  h.click('[data-rt-start="digital"]');
  assert.match(ctx.html, /Tu e il DM/);
  ctx.role = "dm";
  rt.uiState().drawerTab = "history";
  ctx.render();
  assert.match(ctx.html, /Giocatore e DM/);
  assert.doesNotMatch(ctx.html, /Tu e il DM/);
});

test("send to chat: a B17 card with die and faces, to everyone or whispered (review r2 P3)", () => {
  const h = harness({ role: "dm", die: faces(3), areas: ["chat"] });
  const { ctx, store } = h;
  assert.ok(store.state.ext.chat, "B17 chat slice present");
  ctx.render();
  h.change("[data-rt-source]", "table:swamp-encounters");
  h.click('[data-rt-start="digital"]');
  const entry = h.history().entries.at(-1);
  assert.match(h.node(`[data-rt-chat="${entry.id}"]`).inner, /Invia in chat…/);
  const undoBefore = store.history.length;
  h.click(`[data-rt-chat="${entry.id}"]`);
  const { body } = ctx.dialogState;
  assert.match(body, /Incontri nella palude · d8: 3 \(dado digitale\) → Un airone/);
  assert.match(body, /<option value="all">Tutti<\/option>/);
  assert.match(body, /value="actor:livia">Livia/);
  assert.doesNotMatch(body, /actor:doran/, "the DM does not whisper to their own character");
  // Whisper to Livia: a B17 message only its readers see; the history follows it.
  h.submit({ to: "actor:livia" });
  const message = store.state.ext.chat.messages.at(-1);
  assert.equal(message.kind, "ooc");
  assert.deepEqual([...message.readers].sort(), ["dm", "player"]);
  assert.match(message.text, /d8: 3 \(dado digitale\)/);
  const log = store.state.log.at(-1);
  assert.match(log.label, /^Chat · /);
  assert.equal(log.visibility, "private");
  assert.equal(store.history.length, undoBefore, "a sent message is not undone from here");
  const out = h.history().entries.at(-1).outputs.at(-1);
  assert.equal(out.messageId, message.id);
  assert.equal(rt.outputStatus(h.slice(), out), "applied");
  assert.equal(
    rt.canReadEntry(h.slice(), h.history().entries.at(-1), "player"),
    true,
    "the whispered player reads the draw",
  );
  rt.uiState().drawerTab = "history";
  ctx.render();
  assert.match(ctx.html, /Sussurrata a Livia/);
  // Then to everyone: a public message; the entry is shared.
  h.click(`[data-rt-chat="${entry.id}"]`);
  assert.doesNotMatch(ctx.dialogState.body, /actor:livia/, "already whispered to Livia");
  h.submit({ to: "all" });
  assert.equal(store.state.ext.chat.messages.at(-1).readers, null);
  assert.equal(store.state.log.at(-1).visibility, "shared");
  ctx.render();
  assert.match(ctx.html, /Condivisa in chat/);
  assert.ok(!h.has(`[data-rt-chat="${entry.id}"]`), "nothing left to send");
  // A player whispers their own draw to the DM only.
  ctx.role = "player";
  rt.uiState().drawerTab = "tables";
  ctx.rollDie = faces(1);
  ctx.render();
  h.click('[data-rt-start="digital"]');
  const own = h.history().entries.at(-1);
  h.click(`[data-rt-chat="${own.id}"]`);
  assert.match(ctx.dialogState.body, /value="dm">Solo il DM/);
  h.submit({ to: "dm" });
  assert.deepEqual([...store.state.ext.chat.messages.at(-1).readers].sort(), ["dm", "player"]);
  assert.equal(rt.projectHistory(h.slice(), h.history(), "dm")[0].outputs.at(-1).to.type, "dm");
});
