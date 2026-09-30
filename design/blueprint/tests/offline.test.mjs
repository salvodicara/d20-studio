// B52 — chosen offline content and reconnection: domain rules, the app.mjs "offline:write"
// hook with the real store and registry, and the UI handlers (render + bind with the
// shared element double). Synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore, createInitialState } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import * as c from "../campaign-content.mjs";
import { mount } from "./home-harness.mjs";
import * as O from "../offline.mjs";

afterEach(() => O.resetOfflineMemory());

const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

// Real store + registry + this area, with a ctx whose commit mirrors app.mjs, including the
// B52 host hook: while offline "offline:write" may wrap the mutation and accept it locally.
function harness({ lang = "it", role = "player" } = {}) {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const device = new Map();
  const registry = createRegistry({
    deviceStorage: {
      getItem: (k) => device.get(k) ?? null,
      setItem: (k, v) => device.set(k, v),
      removeItem: (k) => device.delete(k),
    },
  });
  assert.equal(registry.use("offline", O.register).status, "built");
  let store = createStore({ storage });
  registry.initState(store.state);
  const toasts = [];
  const navigations = [];
  let offline = false;
  let renders = 0;
  const ctx = {
    role,
    lang,
    view: { page: "offline", id: "", tab: "" },
    get offline() {
      return offline;
    },
    get state() {
      return store.state;
    },
    esc,
    icon: () => "",
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
    openSheet: (id) => navigations.push({ page: "characters", id }),
    dialog() {},
    closeDialog() {},
    render() {
      renders++;
    },
    commit(title, mutator, options = {}) {
      if (offline) {
        const write = { title, local: Boolean(options.local), accept: false, wrap: null };
        registry.emit("offline:write", write);
        if (typeof write.wrap === "function") mutator = write.wrap(mutator);
        if (write.accept && !options.local)
          options = { ...options, local: true, visibility: "private" };
      }
      if (offline && !options.local) {
        const it = "Sei senza rete: questa modifica condivisa non può essere applicata.",
          en = "You are offline: this shared change cannot be applied.";
        throw Object.assign(Error(this.t(it, en)), { it, en });
      }
      const before = store.state;
      store.commit(title, mutator, this.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      if (options.newUndoVisit) store.history.length = 0;
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
    renders: () => renders,
    setOffline(value) {
      offline = value;
      registry.emit("offline-changed", { offline: value });
    },
    reload() {
      store = createStore({ storage });
      registry.initState(store.state);
    },
    store: () => store,
    slice: () => registry.slice(store.state, "offline"),
  };
}
// Sheet edit exactly as characters.mjs commits it: a shared change of the actor.
const setPotions = (h, quantity) =>
  h.ctx.commit("Oggetto corretto", (draft) => {
    draft.actors.livia.inventory.find((item) => item.id === "potion").quantity = quantity;
  });
const potions = (h) =>
  h.ctx.state.actors.livia.inventory.find((item) => item.id === "potion").quantity;
function note(state, id = "clue", who = "player") {
  const d = c.createCampaignDraft(state, { id, kind: "note", campaignId: "lanterns" }, who);
  c.saveCampaignDraft(
    state,
    id,
    {
      data: { ...d.data, title: "Indizi sul cartografo", body: "Una mappa della torre." },
      access: d.access,
      expectedDraftRevision: d.revision,
    },
    who,
  );
  const p = c.previewCampaignDraft(state, id, who);
  return c.applyCampaignDraft(state, id, { reviewKey: p.reviewKey }, who).entryId;
}

// ---------------------------------------------------------------------------------------

test("seed and normalize: idempotent, strict on newer versions, invalid rows dropped", () => {
  assert.deepEqual(O.seedOffline(), { identities: {} });
  const raw = {
    identities: {
      player: {
        items: [
          { kind: "sheet", id: "livia", savedAt: "2026-09-24T10:00:00.000Z", bytes: 10 },
          { kind: "sheet", id: "livia" },
          { kind: "map", id: "x" },
        ],
        queue: [
          { id: "q1", kind: "sheet", targetId: "livia", field: "ac", status: "pending" },
          { id: "q2", kind: "sheet", targetId: "livia", field: "ac", status: "weird" },
        ],
      },
      intruder: { items: [{ kind: "sheet", id: "doran" }] },
    },
  };
  const once = O.normalizeOffline(raw, 1);
  assert.equal(once.identities.player.items.length, 1, "duplicates and unknown kinds dropped");
  assert.deepEqual(
    once.identities.player.queue.map((e) => e.id),
    ["q1"],
  );
  assert.equal(once.identities.intruder, undefined, "only the two demo identities");
  assert.deepEqual(O.normalizeOffline(once, 1), once);
  assert.throws(() => O.normalizeOffline(raw, 2), /newer version/);
});

test("only your own sheets and notes can be made available, and only with the network", () => {
  const state = createInitialState();
  const noteId = note(state);
  const slice = O.seedOffline();
  const player = O.eligibleItems(state, "player").map((row) => `${row.kind}:${row.id}`);
  assert.ok(player.includes("sheet:livia") && player.includes(`note:${noteId}`));
  assert.ok(!player.includes("sheet:doran"), "the DM's sheet is not the player's");
  assert.ok(!O.eligibleItems(state, "dm").some((row) => row.id === noteId), "Solo io note");
  assert.throws(
    () =>
      O.makeAvailable(state, slice, "player", { kind: "sheet", id: "livia" }, { online: false }),
    /serve la rete/,
  );
  assert.throws(
    () => O.makeAvailable(state, slice, "player", { kind: "sheet", id: "doran" }),
    /solo le tue schede/,
  );
  assert.equal(O.makeAvailable(state, slice, "player", { kind: "sheet", id: "livia" }), true);
  assert.equal(O.makeAvailable(state, slice, "player", { kind: "sheet", id: "livia" }), false);
  assert.ok(O.identityOf(slice, "player").items[0].bytes > 1000, "size of the saved copy");
  assert.equal(O.identityOf(slice, "dm").items.length, 0, "per identity");
  assert.equal(O.makeAllAvailable(state, slice, "player"), player.length - 1);
  assert.deepEqual(O.removeAllAvailable(state, slice, "player"), {
    removed: player.length,
    kept: 0,
  });
});

test("an accepted offline change stays inside your offline sheets and outside Table state", () => {
  const before = createInitialState();
  const slice = O.seedOffline();
  O.makeAvailable(before, slice, "player", { kind: "sheet", id: "livia" });
  const run = (mutate) => {
    const draft = structuredClone(before);
    draft.ext = { offline: structuredClone(slice) };
    const was = structuredClone(draft);
    mutate(draft);
    return O.captureOfflineWrite(was, draft, draft.ext.offline, "player", {
      shared: true,
      title: "Prova",
    });
  };
  const changes = run((d) => {
    d.actors.livia.inventory.find((i) => i.id === "potion").quantity = 2;
    d.actors.livia.backstory = "Cresciuta a Bruma.";
  });
  assert.deepEqual(changes.map((row) => row.field).sort(), ["backstory", "inventory:potion"]);
  assert.throws(() => run((d) => (d.actors.livia.hp = 10)), /Punti ferita, condizioni/);
  assert.throws(() => run((d) => (d.actors.mira.ac = 15)), /«Mira» non è disponibile offline/);
  assert.throws(() => run((d) => (d.actors.doran.ac = 15)), /schede degli altri/);
  assert.throws(() => run((d) => (d.scenes[0].name = "X")), /tavolo o la campagna/);
  assert.throws(
    () => run((d) => (d.ext.chat = { messages: [1] })),
    /tavolo o la campagna/,
    "another area's shared data is not queued",
  );
  // Every refusal starts with the core sentence (other flows match it).
  assert.throws(() => run((d) => (d.scenes[0].name = "X")), /^Error: Sei senza rete/);
});

test("the queue coalesces a value and forgets it when it goes back to the start", () => {
  const before = createInitialState();
  const draft = structuredClone(before);
  draft.ext = { offline: O.seedOffline() };
  O.makeAvailable(draft, draft.ext.offline, "player", { kind: "sheet", id: "livia" });
  const step = (quantity) => {
    const was = structuredClone(draft);
    draft.actors.livia.inventory.find((i) => i.id === "potion").quantity = quantity;
    O.captureOfflineWrite(was, draft, draft.ext.offline, "player", { shared: true });
  };
  step(2);
  step(1);
  let queue = O.pendingEntries(draft.ext.offline, "player");
  assert.equal(queue.length, 1);
  assert.equal(queue[0].base.quantity, 3);
  assert.equal(queue[0].mine.quantity, 1);
  step(3);
  queue = O.pendingEntries(draft.ext.offline, "player");
  assert.equal(queue.length, 0, "no net change, nothing to send");
});

test("sync: synced, conflict kept with the other version, incoming, then choice and reopen", () => {
  const state = createInitialState();
  const slice = O.seedOffline();
  O.makeAvailable(state, slice, "player", { kind: "sheet", id: "livia" });
  const change = (mutate) => {
    const was = structuredClone(state);
    mutate(state);
    O.captureOfflineWrite(was, state, slice, "player", { shared: true });
  };
  change((s) => (s.actors.livia.inventory.find((i) => i.id === "potion").quantity = 2));
  change((s) => (s.actors.livia.backstory = "Offline."));
  change((s) => (s.actors.livia.notes = "Da chiedere al DM."));
  const [potion, story, notes] = O.pendingEntries(slice, "player");
  assert.throws(() => O.simulateRemoteChange(state, slice, "player", potion.id, "-1"), /intera/);
  O.simulateRemoteChange(state, slice, "player", potion.id, "5");
  O.simulateRemoteChange(state, slice, "player", notes.id, "Da chiedere al DM.");
  const result = O.syncIdentity(state, slice, "player");
  assert.deepEqual(result.conflicts, [potion.id]);
  assert.deepEqual(result.synced.sort(), [story.id, notes.id].sort(), "same value: no conflict");
  assert.equal(state.actors.livia.inventory.find((i) => i.id === "potion").quantity, 5);
  const conflict = O.conflictEntries(slice, "player")[0];
  assert.equal(conflict.mine.quantity, 2, "the offline version is kept, not lost");
  assert.equal(conflict.theirsBy, "dm");
  // Choice: keep mine; then reopen for correction; then keep theirs.
  O.resolveConflict(state, slice, "player", conflict.id, "mine");
  assert.equal(state.actors.livia.inventory.find((i) => i.id === "potion").quantity, 2);
  O.reopenConflict(state, slice, "player", conflict.id);
  assert.equal(state.actors.livia.inventory.find((i) => i.id === "potion").quantity, 5);
  assert.equal(O.conflictEntries(slice, "player").length, 1);
  O.resolveConflict(state, slice, "player", conflict.id, "theirs");
  assert.equal(state.actors.livia.inventory.find((i) => i.id === "potion").quantity, 5);
  // A later change blocks a reopen that would overwrite it.
  state.actors.livia.inventory.find((i) => i.id === "potion").quantity = 4;
  assert.throws(() => O.reopenConflict(state, slice, "player", conflict.id), /sovrascriverebbe/);
  assert.throws(() => O.resolveConflict(state, slice, "player", conflict.id, "mine"), /non è più/);
});

test("keep both for text; incoming change when your value went back to the start", () => {
  const state = createInitialState();
  const slice = O.seedOffline();
  O.makeAvailable(state, slice, "player", { kind: "sheet", id: "livia" });
  let was = structuredClone(state);
  state.actors.livia.backstory = "La mia versione.";
  O.captureOfflineWrite(was, state, slice, "player", { shared: true });
  const entry = O.pendingEntries(slice, "player")[0];
  O.simulateRemoteChange(state, slice, "player", entry.id, "La versione del DM.");
  O.syncIdentity(state, slice, "player");
  assert.equal(state.actors.livia.backstory, "La versione del DM.");
  assert.ok(O.canKeepBoth({ ...entry, theirs: state.actors.livia.backstory }));
  O.resolveConflict(state, slice, "player", entry.id, "both");
  assert.equal(state.actors.livia.backstory, "La versione del DM.\n\nLa mia versione.");
  // Went back to the start after the DM changed it: the DM's value simply arrives.
  was = structuredClone(state);
  state.actors.livia.ac = 13;
  O.captureOfflineWrite(was, state, slice, "player", { shared: true });
  const ac = O.pendingEntries(slice, "player")[0];
  O.simulateRemoteChange(state, slice, "player", ac.id, "14");
  was = structuredClone(state);
  state.actors.livia.ac = 12;
  O.captureOfflineWrite(was, state, slice, "player", { shared: true });
  const result = O.syncIdentity(state, slice, "player");
  assert.deepEqual(result.incoming, [ac.id]);
  assert.equal(state.actors.livia.ac, 14);
});

test("hook with the real store: queued offline, Undo together, blocked with reason, per identity", () => {
  const h = harness();
  const { ctx } = h;
  assert.equal(O.toggleAvailable(ctx, "sheet:livia", true), true);
  assert.equal(O.isAvailable(h.slice(), "player", "sheet", "livia"), true);
  h.reload();
  assert.equal(O.isAvailable(h.slice(), "player", "sheet", "livia"), true, "kept after reload");
  h.setOffline(true);
  assert.equal(O.indicatorText(ctx, "it"), "Senza rete — nessuna modifica in coda");
  setPotions(h, 2);
  assert.equal(potions(h), 2, "the sheet shows the change at once");
  const [entry] = O.pendingEntries(h.slice(), "player");
  assert.equal(entry.field, "inventory:potion");
  assert.equal(h.ctx.state.log.at(-1).visibility, "private", "not yet in the shared log");
  assert.equal(O.indicatorText(ctx, "en"), "Offline — 1 change queued");
  // Undo removes the change and its queued record together, also offline.
  ctx.undo();
  assert.equal(potions(h), 3);
  assert.equal(O.pendingEntries(h.slice(), "player").length, 0);
  setPotions(h, 2);
  // Shared change outside the offline content: refused with the reason, remembered here.
  assert.throws(
    () => ctx.commit("Scena rinominata", (d) => (d.scenes[0].name = "X")),
    /tavolo o la campagna/,
  );
  assert.throws(
    () => ctx.commit("Mira corretta", (d) => (d.actors.mira.ac = 16)),
    /«Mira» non è disponibile offline/,
  );
  assert.equal(O.offlineMemory().blocked.player.length, 2);
  assert.equal(h.ctx.state.scenes[0].name !== "X", true);
  // Without offline content the core rule is unchanged.
  ctx.role = "dm";
  assert.throws(
    () => ctx.commit("Doran", (d) => (d.actors.doran.ac = 16)),
    /^Error: Sei senza rete: questa modifica condivisa non può essere applicata\.$/,
  );
  assert.equal(O.indicatorText(ctx, "it"), "Senza rete — nessuna modifica in coda", "own queue");
  assert.equal(O.offlineMemory().blocked.dm.length, 1);
  ctx.role = "player";
  // Making something available needs the network.
  assert.equal(O.toggleAvailable(ctx, "sheet:mira", true), null);
  assert.match(h.toasts.at(-1).text, /serve la rete/);
  assert.equal(h.toasts.at(-1).error, true);
  // Removing an item with queued changes is refused.
  assert.equal(O.toggleAvailable(ctx, "sheet:livia", false), null);
  assert.match(h.toasts.at(-1).text, /modifiche in coda/);
});

test("reconnection: automatic after the delay, conflict to review, notification only to you", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const h = harness();
  const { ctx } = h;
  O.toggleAvailable(ctx, "sheet:livia", true);
  h.setOffline(true);
  setPotions(h, 2);
  ctx.commit("Storia aggiornata", (d) => (d.actors.livia.backstory = "Scritta senza rete."));
  const potion = O.pendingEntries(h.slice(), "player").find((e) => e.field === "inventory:potion");
  const html = O.renderOfflinePage(ctx);
  assert.match(html, /Nel frattempo al tavolo/);
  const view = mount(html, (el) => O.bindOffline(el, ctx), ctx);
  view.nodes
    .find((n) => n.attrs["data-offline-simulate"] === potion.id)
    .events.submit[0]({
      preventDefault() {},
      currentTarget: {
        dataset: { offlineSimulate: potion.id },
        querySelector: () => ({ value: "5" }),
      },
    });
  assert.equal(O.pendingEntries(h.slice(), "player")[0].remote.value.quantity, 5);
  h.setOffline(false);
  assert.equal(O.connectionPhase(ctx), "reconnecting");
  assert.equal(O.indicatorText(ctx, "it"), "Riconnessione in corso");
  t.mock.timers.tick(O.RECONNECT_MS);
  assert.equal(O.connectionPhase(ctx), "online");
  assert.equal(potions(h), 5, "the shared sheet shows the DM's version");
  assert.equal(ctx.state.actors.livia.backstory, "Scritta senza rete.", "no conflict: synced");
  assert.equal(O.indicatorText(ctx, "it"), "Da rivedere — 1 conflitto");
  assert.match(h.toasts.at(-1).text, /1 modifica sincronizzata e 1 conflitto da rivedere/);
  const log = ctx.state.log.at(-1);
  assert.equal(log.visibility, "shared");
  assert.match(
    log.label,
    /Sincronizzazione dopo la riconnessione: 2 modifiche fatte senza rete \(Livia\)/,
  );
  assert.equal(h.store().history.length, 0, "a new Undo visit after the sync");
  const notices = h.registry.notifications(ctx);
  assert.equal(notices.length, 1);
  assert.match(notices[0].title.it, /Livia · Pozione di guarigione/);
  ctx.role = "dm";
  assert.equal(h.registry.notifications(ctx).length, 0, "the DM never sees the player's queue");
  ctx.role = "player";
  // Compare and choose from the page: keep mine; Undo brings the conflict back.
  const page = O.renderOfflinePage(ctx);
  assert.match(
    decode(page),
    /Prima · valore di partenza[\s\S]*×3[\s\S]*×2[\s\S]*Il DM · al tavolo/,
  );
  const conflictId = O.conflictEntries(h.slice(), "player")[0].id;
  mount(page, (el) => O.bindOffline(el, ctx), ctx).click(
    `[data-offline-resolve="mine"][data-entry="${conflictId}"]`,
  );
  assert.equal(potions(h), 2);
  assert.match(
    ctx.state.log.at(-1).label,
    /Conflitto risolto: Livia · Pozione di guarigione, tenuta la versione offline/,
  );
  ctx.undo();
  assert.equal(potions(h), 5);
  assert.equal(O.conflictEntries(h.slice(), "player").length, 1);
  // Correction by reopening after a choice.
  mount(O.renderOfflinePage(ctx), (el) => O.bindOffline(el, ctx), ctx).click(
    `[data-offline-resolve="theirs"][data-entry="${conflictId}"]`,
  );
  assert.equal(potions(h), 5);
  mount(O.renderOfflinePage(ctx), (el) => O.bindOffline(el, ctx), ctx).click(
    `[data-offline-reopen="${conflictId}"]`,
  );
  assert.equal(O.conflictEntries(h.slice(), "player").length, 1);
  h.reload();
  assert.equal(O.conflictEntries(h.slice(), "player").length, 1, "kept after reload");
});

test("reopening the app with queued changes syncs them by itself", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const h = harness();
  O.toggleAvailable(h.ctx, "sheet:livia", true);
  h.setOffline(true);
  setPotions(h, 1);
  // Restart: the simulated outage ends, the queue is still on the device.
  h.reload();
  h.setOffline(false);
  O.resetOfflineMemory();
  h.registry.emit("navigate", { page: "home", id: "", tab: "", from: null });
  assert.equal(O.connectionPhase(h.ctx), "reconnecting");
  t.mock.timers.tick(O.RECONNECT_MS);
  assert.equal(O.pendingEntries(h.slice(), "player").length, 0);
  assert.equal(O.identityOf(h.slice(), "player").queue[0].status, "synced");
  assert.equal(potions(h), 1);
});

test("notes: switch on the entry, local change queued, kept across a gameplay Undo", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const h = harness();
  const { ctx } = h;
  let noteId;
  ctx.commit("Nota", (d) => (noteId = note(d)), {
    local: true,
    visibility: "private",
    undoable: false,
  });
  const entry = c.getCampaignEntry(ctx.state, noteId, "player");
  const section = h.registry.get("campaign-section", "offline.entry", ctx, entry);
  assert.ok(section, "shown on your own note");
  ctx.role = "dm";
  assert.equal(h.registry.get("campaign-section", "offline.entry", ctx, entry), null);
  ctx.role = "player";
  const html = O.renderEntrySection(ctx, entry);
  assert.match(html, /Disponibile offline/);
  mount(html, (el) => O.bindOffline(el, ctx), ctx).change(
    `[data-offline-toggle="note:${noteId}"]`,
    {
      checked: true,
    },
  );
  assert.equal(O.isAvailable(h.slice(), "player", "note", noteId), true);
  O.toggleAvailable(ctx, "sheet:livia", true);
  h.setOffline(true);
  setPotions(h, 2);
  // A private note edit is a local commit (campaign.mjs privateCommit), not undoable.
  ctx.commit(
    "Nota aggiornata",
    (d) => {
      const e = c.getCampaignEntry(d, noteId, "player");
      const draft = c.createCampaignDraft(
        d,
        { id: "clue-2", kind: "note", entryId: noteId },
        "player",
      );
      c.saveCampaignDraft(
        d,
        "clue-2",
        {
          data: { ...draft.data, title: e.data.title, body: "Aggiunto senza rete: la chiave." },
          access: draft.access,
          expectedDraftRevision: draft.revision,
        },
        "player",
      );
      const p = c.previewCampaignDraft(d, "clue-2", "player");
      c.applyCampaignDraft(d, "clue-2", { reviewKey: p.reviewKey }, "player", { online: false });
    },
    { local: true, visibility: "private", undoable: false },
  );
  const noteEntry = O.pendingEntries(h.slice(), "player").find((e) => e.kind === "note");
  assert.equal(noteEntry.mine.body, "Aggiunto senza rete: la chiave.");
  // Undo of the (earlier) sheet change: the note text stays, and so does its queued change.
  ctx.undo();
  assert.equal(potions(h), 3);
  assert.deepEqual(
    O.pendingEntries(h.slice(), "player").map((e) => e.kind),
    ["note"],
  );
  h.setOffline(false);
  t.mock.timers.tick(O.RECONNECT_MS);
  const synced = O.identityOf(h.slice(), "player").queue.find((e) => e.kind === "note");
  assert.equal(synced.status, "synced");
  assert.equal(synced.mine.body, undefined, "the synced history keeps only the title");
  assert.equal(ctx.state.log.at(-1).visibility, "private", "personal sync stays private");
});

test("page, sheet section, header label, search, command and settings", () => {
  const h = harness({ lang: "en" });
  const { ctx, registry } = h;
  let html = O.renderOfflinePage(ctx);
  assert.match(html, /Offline and sync/);
  assert.match(html, /Nothing is available offline yet/);
  const view = mount(html, (el) => O.bindOffline(el, ctx), ctx);
  view.click('[data-offline-add="sheet:livia"]');
  assert.equal(O.isAvailable(h.slice(), "player", "sheet", "livia"), true);
  html = O.renderOfflinePage(ctx);
  assert.match(decode(html), /1 item · [\d.]+ kB on this device/);
  mount(html, (el) => O.bindOffline(el, ctx), ctx).click('[data-offline-open="sheet:livia"]');
  assert.deepEqual(h.navigations.at(-1), { page: "characters", id: "livia" });
  // Sheet section: your own sheet only.
  const livia = ctx.state.actors.livia;
  assert.ok(registry.get("sheet-section", "offline-sheet", ctx, livia));
  assert.equal(registry.get("sheet-section", "offline-sheet", ctx, ctx.state.actors.doran), null);
  assert.match(O.renderSheetSection(ctx, livia), /Saved on this device at/);
  // Header indicator: label follows the state.
  const service = registry.get("service", "offline", ctx);
  assert.equal(registry.label(service, "en"), "Online — all synced");
  assert.equal(registry.label(service, "it"), "In linea — tutto sincronizzato");
  assert.equal(service.header, true);
  registry.run(service, ctx);
  assert.deepEqual(h.navigations.at(-1), { page: "offline" });
  // Search, palette command, device setting.
  assert.equal(registry.search(ctx, "sincronizzazione")[0].page, "offline");
  assert.equal(registry.search(ctx, "livia").length, 0);
  ctx.view = { page: "characters", id: "livia", tab: "actions" };
  const command = registry.get("command", "offline.toggle-sheet", ctx);
  registry.run(command, ctx);
  assert.equal(O.isAvailable(h.slice(), "player", "sheet", "livia"), false);
  assert.equal(registry.getSetting(ctx, "offline.auto"), false);
  // Remove everything; the page empty state returns.
  O.toggleAvailable(ctx, "sheet:livia", true);
  mount(O.renderOfflinePage(ctx), (el) => O.bindOffline(el, ctx), ctx).click(
    "[data-offline-remove-all]",
  );
  assert.equal(O.identityOf(h.slice(), "player").items.length, 0);
});

test("retry while offline records the attempt and keeps the queue", () => {
  const h = harness();
  const { ctx } = h;
  O.toggleAvailable(ctx, "sheet:livia", true);
  h.setOffline(true);
  setPotions(h, 2);
  const view = mount(O.renderOfflinePage(ctx), (el) => O.bindOffline(el, ctx), ctx);
  view.click("[data-offline-retry]");
  assert.equal(O.offlineMemory().attempts, 1);
  assert.match(h.toasts.at(-1).text, /Ancora senza rete/);
  assert.match(O.renderOfflinePage(ctx), /Tentativi di riconnessione: 1/);
  assert.equal(O.pendingEntries(h.slice(), "player").length, 1);
});

test("undo one queued sheet change from the list: value back, record gone", () => {
  const h = harness();
  const { ctx } = h;
  O.toggleAvailable(ctx, "sheet:livia", true);
  h.setOffline(true);
  setPotions(h, 2);
  ctx.commit("Corda", (d) => (d.actors.livia.inventory.find((i) => i.id === "rope").quantity = 4));
  const rope = O.pendingEntries(h.slice(), "player").find((e) => e.field === "inventory:rope");
  mount(O.renderOfflinePage(ctx), (el) => O.bindOffline(el, ctx), ctx).click(
    `[data-offline-discard="${rope.id}"]`,
  );
  assert.equal(ctx.state.actors.livia.inventory.find((i) => i.id === "rope").quantity, 1);
  assert.deepEqual(
    O.pendingEntries(h.slice(), "player").map((e) => e.field),
    ["inventory:potion"],
  );
  assert.match(h.toasts.at(-1).text, /Annullata: Livia · Corda/);
});

test("an absent text saved as an empty one is not a change", () => {
  assert.deepEqual(O.diffActor({ backstory: "a" }, { backstory: "a", description: "" }), []);
  assert.deepEqual(
    O.diffActor({ notes: "" }, { notes: "x" }).map((c) => c.field),
    ["notes"],
  );
});

test("device setting: sheets you open become available offline, online only", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const h = harness();
  const { ctx, registry } = h;
  registry.setSetting(ctx, "offline.auto", true);
  registry.emit("navigate", { page: "characters", id: "mira", tab: "", from: "characters" });
  t.mock.timers.tick(1);
  assert.equal(O.isAvailable(h.slice(), "player", "sheet", "mira"), true);
  registry.emit("navigate", { page: "characters", id: "doran", tab: "", from: "characters" });
  t.mock.timers.tick(1);
  assert.equal(O.isAvailable(h.slice(), "player", "sheet", "doran"), false, "not your sheet");
  h.setOffline(true);
  registry.emit("navigate", { page: "characters", id: "livia", tab: "", from: "characters" });
  t.mock.timers.tick(1);
  assert.equal(O.isAvailable(h.slice(), "player", "sheet", "livia"), false, "needs the network");
});

// ------------------------------------------------------------- review fixes (B52 review)

test("review: a real change by the other identity while you wait is a conflict, not a silent loss", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const h = harness();
  const { ctx } = h;
  O.toggleAvailable(ctx, "sheet:livia", true);
  h.setOffline(true);
  setPotions(h, 2);
  ctx.commit("Storia", (d) => (d.actors.livia.backstory = "La mia versione."));
  // The DM (another identity, back online) changes the same values for real, no simulation.
  ctx.role = "dm";
  h.setOffline(false);
  t.mock.timers.tick(O.RECONNECT_MS);
  setPotions(h, 5);
  ctx.commit("Storia del DM", (d) => (d.actors.livia.backstory = "La versione del DM."));
  // The player is active again: automatic sync.
  ctx.role = "player";
  h.registry.emit("role-changed", { role: "player" });
  t.mock.timers.tick(O.RECONNECT_MS);
  const conflicts = O.conflictEntries(h.slice(), "player");
  assert.deepEqual(conflicts.map((e) => e.field).sort(), ["backstory", "inventory:potion"]);
  assert.equal(potions(h), 5, "the shared sheet keeps the DM's version");
  const potion = conflicts.find((e) => e.field === "inventory:potion");
  assert.equal(potion.mine.quantity, 2, "yours is kept in the conflict");
  assert.equal(potion.theirs.quantity, 5);
  assert.equal(potion.theirsBy, "dm");
  assert.doesNotMatch(h.toasts.at(-1).text, /sincronizzat/, "nothing is reported as synced");
  assert.match(h.toasts.at(-1).text, /2 conflitti da rivedere/);
  // Keep both texts; keep yours for the potion.
  const story = conflicts.find((e) => e.field === "backstory");
  mount(O.renderOfflinePage(ctx), (el) => O.bindOffline(el, ctx), ctx).click(
    `[data-offline-resolve="both"][data-entry="${story.id}"]`,
  );
  assert.equal(ctx.state.actors.livia.backstory, "La versione del DM.\n\nLa mia versione.");
  mount(O.renderOfflinePage(ctx), (el) => O.bindOffline(el, ctx), ctx).click(
    `[data-offline-resolve="mine"][data-entry="${potion.id}"]`,
  );
  assert.equal(potions(h), 2);
});

test("review: the other identity's change arrives when your own value went back to the start", () => {
  const state = createInitialState();
  const slice = O.seedOffline();
  O.makeAvailable(state, slice, "player", { kind: "sheet", id: "livia" });
  let was = structuredClone(state);
  state.actors.livia.ac = 13;
  O.captureOfflineWrite(was, state, slice, "player", { shared: true });
  const entry = O.pendingEntries(slice, "player")[0];
  O.simulateRemoteChange(state, slice, "player", entry.id, "15");
  was = structuredClone(state);
  state.actors.livia.ac = 12;
  O.captureOfflineWrite(was, state, slice, "player", { shared: true });
  // Meanwhile a real change reached the shared sheet: it wins over the simulation.
  state.actors.livia.ac = 14;
  const result = O.syncIdentity(state, slice, "player");
  assert.deepEqual(result.incoming, [entry.id]);
  assert.equal(state.actors.livia.ac, 14, "the real change is never overwritten");
  // An empty text and an absent one are the same value: no conflict.
  was = structuredClone(state);
  state.actors.livia.description = "Occhi grigi.";
  O.captureOfflineWrite(was, state, slice, "player", { shared: true });
  assert.deepEqual(O.syncIdentity(state, slice, "player").synced.length, 1);
});

test("review: an offline dice roll on a sheet available offline stays refused", () => {
  const h = harness();
  const { ctx } = h;
  O.toggleAvailable(ctx, "sheet:livia", true);
  h.setOffline(true);
  // Exactly as characters.mjs records an ability check (digital or physical face).
  assert.throws(
    () =>
      ctx.commit("Prova: Forza · 12 +0 = 12", (d) => {
        d.actors.livia.lastCheck = { name: { it: "Forza", en: "Strength" }, face: 12, total: 12 };
      }),
    /^Error: Sei senza rete: questa modifica condivisa non può essere applicata\. I tiri/,
  );
  assert.equal(ctx.state.actors.livia.lastCheck, undefined);
  assert.equal(O.pendingEntries(h.slice(), "player").length, 0);
  assert.match(O.offlineMemory().blocked.player[0].reason.it, /I tiri/);
});

test("review: the shared sync entry counts only shared sheet changes, never private notes", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const h = harness();
  const { ctx } = h;
  let noteId;
  ctx.commit("Nota", (d) => (noteId = note(d)), { local: true, visibility: "private" });
  O.toggleAvailable(ctx, "sheet:livia", true);
  O.toggleAvailable(ctx, `note:${noteId}`, true);
  h.setOffline(true);
  setPotions(h, 2);
  ctx.commit(
    "Appunto",
    (d) => {
      const e = c.getCampaignEntry(d, noteId, "player");
      const draft = c.createCampaignDraft(
        d,
        { id: "clue-2", kind: "note", entryId: noteId },
        "player",
      );
      c.saveCampaignDraft(
        d,
        "clue-2",
        {
          data: { ...draft.data, title: e.data.title, body: "Segreto scritto senza rete." },
          access: draft.access,
          expectedDraftRevision: draft.revision,
        },
        "player",
      );
      const p = c.previewCampaignDraft(d, "clue-2", "player");
      c.applyCampaignDraft(d, "clue-2", { reviewKey: p.reviewKey }, "player", { online: false });
    },
    { local: true, visibility: "private", undoable: false },
  );
  assert.equal(O.pendingEntries(h.slice(), "player").length, 2);
  h.setOffline(false);
  t.mock.timers.tick(O.RECONNECT_MS);
  const shared = ctx.state.log.filter((e) => e.visibility === "shared").at(-1);
  assert.match(shared.label, /1 modifica fatta senza rete \(Livia\)$/);
});

test("review: undoing one queued change from the list is offline only, never over another's value", () => {
  const h = harness();
  const { ctx } = h;
  O.toggleAvailable(ctx, "sheet:livia", true);
  h.setOffline(true);
  setPotions(h, 2);
  const [entry] = O.pendingEntries(h.slice(), "player");
  assert.match(O.renderOfflinePage(ctx), /data-offline-discard/);
  h.setOffline(false);
  O.resetOfflineMemory();
  assert.doesNotMatch(O.renderOfflinePage(ctx), /data-offline-discard/);
  assert.equal(O.discardQueued(ctx, entry.id), null);
  assert.equal(potions(h), 2);
});

test("review: queued values are named in words, never by their internal key", () => {
  const ctx = { t: (it) => it, label: (v) => (typeof v === "object" ? v.it : v) };
  assert.equal(O.fieldLabel(ctx, { field: "hitDice" }), "Dadi Vita");
  assert.equal(O.fieldLabel(ctx, { field: "restProfile" }), "Altro valore della scheda");
});

test("review: the list shows the copy's live size, its download time online and last connection offline", () => {
  const h = harness();
  const { ctx } = h;
  O.toggleAvailable(ctx, "sheet:livia", true);
  const saved = O.identityOf(h.slice(), "player").items[0].bytes;
  ctx.commit("Storia lunga", (d) => (d.actors.livia.backstory = "x".repeat(4000)));
  const [row] = O.availableRows(ctx.state, h.slice(), "player");
  assert.ok(row.bytes > saved + 3900, "the size follows the content, not the download");
  assert.match(O.renderOfflinePage(ctx), /Sul dispositivo dalle/);
  assert.doesNotMatch(O.renderOfflinePage(ctx), /Copia delle/);
  h.setOffline(true);
  assert.match(O.renderOfflinePage(ctx), /Copia delle/);
});
