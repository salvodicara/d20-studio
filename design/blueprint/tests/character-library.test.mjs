// B21 — character library: domain rules, file formats, PDF/QR and UI handlers.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore, createInitialState } from "../state.mjs";
import { esc, icon } from "../ui.mjs";
import { createRegistry } from "../registry.mjs";
import { canViewActor, canControlActor } from "../character-access.mjs";
import * as members from "../campaign-members.mjs";
import * as L from "../character-library.mjs";
import * as X from "../character-export.mjs";
import { useSampleClock } from "../sample-clock.mjs";

// The example's real-time stamps as authored (the week of Thursday 17 September 2026,
// sample-clock.mjs): pinned, so these checks never read the real date.
useSampleClock(() => Date.parse("2026-09-21T12:00:00Z"));

afterEach(() => L.resetLibraryView());
const NOW = Date.parse("2026-09-24T10:00:00Z");

// Real store + registry + this area (and B13 when asked), with a ctx shaped like app.mjs.
function harness({ lang = "it", role = "player", withMembers = false } = {}) {
  const values = new Map();
  const storage = {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
    removeItem: (k) => values.delete(k),
  };
  const registry = createRegistry({ logger: null, document: null, deviceStorage: storage });
  if (withMembers) assert.equal(registry.use("campaign-members", members.register).status, "built");
  assert.equal(registry.use("character-library", L.register).status, "built");
  let store = createStore({ storage });
  registry.initState(store.state);
  store.persist();
  const toasts = [];
  const navigations = [];
  const dialogs = [];
  const ctx = {
    role,
    lang,
    offline: false,
    view: { page: "characters", id: "", tab: "" },
    get state() {
      return store.state;
    },
    esc,
    icon,
    // Arrow functions: the core destructures { t, esc } from ctx.
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      typeof value === "object" && value
        ? value[ctx.lang] || value.it || value.en || ""
        : String(value ?? ""),
    toast: (text, error = false) => toasts.push({ text, error }),
    navigate: (page, params = {}) => navigations.push({ page, ...params }),
    dialog: (title, body, options = {}) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {},
    // As app.mjs: the core access plus the B20 lock on DM edits of a player's sheet (PG-94).
    canControl(actor) {
      return (
        canControlActor(actor, this.role, store.state) &&
        !(
          this.role === "dm" &&
          this.view.page === "characters" &&
          actor?.owner &&
          actor.owner !== "dm" &&
          store.state.ext?.["campaign-settings"]?.campaigns?.[store.state.campaign?.id]?.policy
            ?.dmSheetEdit?.[actor.id] === false
        )
      );
    },
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
    canUndo() {
      return store.history.at(-1)?.controller === this.role;
    },
    undoLabel() {
      const last = store.history.at(-1);
      return last && last.controller === this.role ? last.label : "";
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
    dialogs,
    state: () => store.state,
    lib: () => store.state.ext["character-library"],
    reload() {
      store = createStore({ storage });
      registry.initState(store.state);
    },
    submit(index = -1, entries = []) {
      const dialog = dialogs.at(index);
      assert.ok(dialog, "dialog opened");
      const form = new FormData();
      for (const [k, v] of entries) form.append(k, v);
      return dialog.options.onSubmit(form);
    },
    // As app.mjs's dialog: a refused onSubmit keeps the dialog open and shows the error.
    submitLikeApp(index = -1, entries = []) {
      try {
        this.submit(index, entries);
        return { closed: true, error: null };
      } catch (error) {
        return { closed: false, error };
      }
    },
  };
}
const refusal = (fn, pattern) =>
  assert.throws(fn, (error) => {
    assert.ok(error.it && error.en, "refusal carries {it, en}");
    if (pattern) assert.match(error.it + " " + error.en, pattern);
    return true;
  });
function seeded(withMembers = false) {
  const registry = createRegistry({ logger: null, document: null });
  if (withMembers) registry.use("campaign-members", members.register);
  registry.use("character-library", L.register);
  const state = createInitialState();
  registry.initState(state);
  return state;
}
// Minimal element double: every start tag with attributes, attribute selectors only.
function mount(html) {
  const nodes = [...html.matchAll(/<([a-z0-9]+)\b([^>]*)>/g)].map(([, tag, attrsText]) => {
    const attrs = Object.fromEntries(
      [...attrsText.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, v ?? ""]),
    );
    const events = {};
    return {
      tagName: tag.toUpperCase(),
      attrs,
      events,
      dataset: Object.fromEntries(
        Object.entries(attrs)
          .filter(([k]) => k.startsWith("data-"))
          .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
      ),
      addEventListener(type, fn) {
        events[type] = fn;
      },
      querySelector: () => null,
      querySelectorAll: () => [],
      focus() {},
    };
  });
  const matches = (node, selector) =>
    [...selector.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)].every(
      ([, key, value]) => key in node.attrs && (value === undefined || node.attrs[key] === value),
    );
  return {
    nodes,
    querySelectorAll: (selector) => nodes.filter((node) => matches(node, selector)),
    querySelector: (selector) => nodes.find((node) => matches(node, selector)) ?? null,
    addEventListener() {},
    click(selector) {
      const node = nodes.find((n) => matches(n, selector));
      assert.ok(node, `Missing ${selector}`);
      node.events.click?.({ preventDefault() {}, target: node });
    },
  };
}

// ---------------------------------------------------------------- registration, seed

test("registration: characters route replaced, link/print routes, sheet tabs, settings, notifications", () => {
  const { registry, state } = harness();
  const route = registry.get("route", "characters");
  assert.equal(route.replaces, true);
  assert.ok(registry.get("route", L.ROUTE_LINK) && registry.get("route", L.ROUTE_PRINT));
  const ctx = { role: "player", lang: "it", state: state() };
  const livia = state().actors.livia;
  const goblin = state().actors["goblin-1"];
  assert.ok(registry.get("sheet-tab", L.TAB_LOG, ctx, livia));
  assert.ok(registry.get("sheet-tab", L.TAB_REVISIONS, ctx, livia));
  assert.equal(registry.get("sheet-tab", L.TAB_LOG, ctx, goblin), null, "no log on an NPC");
  assert.ok(registry.get("settings", "character-library"));
  assert.ok(registry.get("notifications", "character-library-transfers"));
  assert.equal(state().extVersions["character-library"], L.VERSION);
});

test("seed adds the library-only sample Iria once, with dates, revisions and logs", () => {
  const state = seeded();
  const iria = state.actors.iria;
  assert.equal(iria.owner, "player");
  assert.equal(iria.visibility, "private");
  assert.deepEqual(iria.campaignIds, []);
  assert.equal(iria.level, 5);
  assert.equal(canViewActor(iria, "dm", state), false, "a personal sheet is not the DM's");
  const flags = Object.fromEntries(
    iria.spells
      .map((s) => [s.catalogId, X.spellFlags(s)])
      .map(([k, f]) => [k, [f.concentration, f.ritual]]),
  );
  assert.deepEqual(flags["detect-magic"], [true, true]);
  assert.deepEqual(flags["find-familiar"], [false, true]);
  assert.deepEqual(flags.fly, [true, false]);
  assert.ok(iria.restProfile, "rest metadata derived from the build seed");
  const slice = state.ext["character-library"];
  assert.equal(slice.revisions.livia.length, 2);
  assert.equal(slice.revisions.livia[0].data.level, 2);
  assert.equal(slice.logs.livia.length, 2);
  // The level Iria would take into a campaign ("player and DM only"); while she is only in
  // the library the badge reads "Personal" and nobody else reads her (home-domain agrees).
  assert.equal(slice.entries.iria.privacy, "private");
  // SRD 5.2.1: a wizard gains a subclass at level 3, so the level-2 sample has none.
  assert.equal(slice.revisions.livia[0].data.buildSeed.classes[0].subclassId, undefined);
  assert.equal(slice.revisions.livia[1].data.buildSeed.classes[0].subclassId, "evoker");
  // Idempotent normalization; future versions refused; a missing state seeds an empty slice.
  const once = L.normalizeSlice(slice, 1);
  assert.deepEqual(L.normalizeSlice(once, 1), once);
  assert.throws(() => L.normalizeSlice(slice, 2), /newer version/);
  assert.deepEqual(L.seedSlice(), L.emptySlice());
  // A permanently deleted Iria is not re-added by a normal load (seed runs only once).
  delete state.actors.iria;
  const registry = createRegistry({ logger: null, document: null });
  registry.use("character-library", L.register);
  registry.initState(state);
  assert.equal(state.actors.iria, undefined);
});

// ---------------------------------------------------------------- list, search, sort

test("search by name, level, class, species and campaign; sort persisted per device", () => {
  const h = harness();
  const state = h.state();
  const names = (rows) => rows.map((row) => row.name);
  const mago = L.libraryRows(state, "player", { query: "mago", sort: "level-desc" });
  assert.deepEqual(names(mago.mine), ["Iria", "Livia"], "catalog class name finds both wizards");
  assert.deepEqual(names(L.libraryRows(state, "player", { query: "wizard" }).mine).sort(), [
    "Iria",
    "Livia",
  ]);
  assert.deepEqual(names(L.libraryRows(state, "player", { query: "elfo" }).mine), ["Iria"]);
  assert.deepEqual(names(L.libraryRows(state, "player", { query: "livello 5" }).mine), ["Iria"]);
  assert.deepEqual(
    names(L.libraryRows(state, "player", { query: "lanterne", sort: "name-asc" }).mine),
    ["Livia", "Mira"],
  );
  assert.deepEqual(names(L.libraryRows(state, "player", { sort: "name-desc" }).mine), [
    "Mira",
    "Livia",
    "Iria",
  ]);
  assert.deepEqual(names(L.libraryRows(state, "player", { sort: "created-desc" }).mine), [
    "Iria",
    "Mira",
    "Livia",
  ]);
  assert.deepEqual(names(L.libraryRows(state, "player", { sort: "created-asc" }).mine), [
    "Livia",
    "Mira",
    "Iria",
  ]);
  const levels = L.libraryRows(state, "player", { sort: "level-asc" }).mine.map((r) => r.level);
  assert.deepEqual(levels, [3, 3, 5]);
  // Modified: an observed change moves the sheet first.
  const observed = L.observe(state, NOW, {});
  const changed = structuredClone(state);
  changed.actors.mira.hp = 20;
  const later = L.observe(changed, NOW + 60000, observed);
  assert.equal(later.mira.at, new Date(NOW + 60000).toISOString());
  assert.equal(later.livia.at, null);
  assert.equal(
    L.libraryRows(changed, "player", { sort: "modified-desc", observed: later }).mine[0].name,
    "Mira",
  );
  // The DM's list: own sheet first, campaign sheets and creatures in the second group.
  const dm = L.libraryRows(state, "dm", { sort: "name-asc" });
  assert.deepEqual(names(dm.mine), ["Doran"]);
  assert.ok(!names(dm.others).includes("Iria"), "a personal sheet is never listed for the DM");
  // Sort choice: device setting through the registry (DDB "persisted per device").
  h.registry.setSetting(h.ctx, "character-library.sort", "level-desc");
  assert.equal(h.registry.getSetting(h.ctx, "character-library.sort"), "level-desc");
  const html = L.renderLibraryPage(h.ctx);
  assert.match(html, /<option value="level-desc" selected>/);
  assert.ok(html.indexOf('data-clib-card="iria"') < html.indexOf('data-clib-card="livia"'));
});

test("rendered list: cards with actions per ownership, query keeps hidden cards, trash section", () => {
  const h = harness();
  L.libraryView.query = "mago";
  const html = L.renderLibraryPage(h.ctx);
  assert.match(html, /data-clib-card="iria"[^>]*data-clib-haystack="[^"]*mago/);
  assert.match(html, /<article hidden class="panel clib-card" data-clib-card="mira"/);
  assert.match(html, /data-clib-act="copy" data-actor="iria"/);
  assert.doesNotMatch(
    html,
    /data-clib-act="copy" data-actor="doran"/,
    "no copy of another's sheet",
  );
  assert.match(html, /data-character-action="create"/);
  assert.match(html, /data-clib-import/);
  assert.match(html, /2 di 4 schede/, "the player reads 4 sheets: Iria, Mira, Livia, Doran");
  L.resetLibraryView();
  h.ctx.lang = "en";
  assert.match(L.renderLibraryPage(h.ctx), /My sheets/);
});

// ---------------------------------------------------------------- copy

test("copy: independent personal sheet; transient state, campaigns and plans not copied", () => {
  const state = seeded();
  state.actors.livia.personalPlans = { player: "private plan" };
  state.actors.livia.concentration = { id: "c1", active: true };
  state.actors.livia.conditions = [{ id: "poisoned" }];
  const id = L.copyCharacter(state, "livia", "player", { name: "Livia 2024", now: NOW });
  const copy = state.actors[id];
  assert.equal(copy.name, "Livia 2024");
  assert.equal(copy.visibility, "private");
  assert.deepEqual(copy.campaignIds, []);
  assert.equal(copy.personalPlans, undefined);
  assert.equal(copy.concentration, undefined);
  assert.deepEqual(copy.conditions, []);
  assert.deepEqual(copy.copiedFrom, {
    actorId: "livia",
    name: "Livia",
    at: new Date(NOW).toISOString(),
  });
  assert.equal(state.ext["character-library"].logs[id].length, 2, "adventure log copied");
  assert.equal(state.ext["character-library"].revisions[id][0].kind, "copy");
  // Independence both ways (I-125).
  copy.inventory.find((row) => row.id === "potion").quantity = 0;
  copy.level = 4;
  assert.equal(state.actors.livia.inventory.find((row) => row.id === "potion").quantity, 3);
  assert.equal(state.actors.livia.level, 3);
  state.actors.livia.hp = 5;
  assert.notEqual(copy.hp, 5);
  refusal(() => L.copyCharacter(state, "doran", "player"), /owner|possiede/);
  refusal(() => L.copyCharacter(state, "goblin-1", "dm"), /characters|personaggi/);
  refusal(() => L.copyCharacter(state, "livia", "player", { name: "x".repeat(61) }), /60/);
});

// ---------------------------------------------------------------- delete and trash

test("delete moves to the trash with tokens and order; restore brings them back; purge", () => {
  const state = seeded();
  const tokensBefore = structuredClone(state.scenes[0].tokens);
  const orderBefore = [...state.combat.order];
  const preview = L.deletePreview(state, "livia");
  // Every token of hers on every sample scene (R4 added a second scene with her token).
  const liviaTokens = state.scenes.flatMap((s) => s.tokens).filter((t) => t.actorId === "livia");
  assert.ok(liviaTokens.length >= 1);
  assert.equal(preview.tokens, liviaTokens.length);
  assert.deepEqual(preview.campaigns, ["Le lanterne di Bruma"]);
  refusal(() => L.deleteCharacter(state, "livia", "dm"), /owner|possiede/);
  const trashId = L.deleteCharacter(state, "livia", "player", NOW);
  assert.equal(state.actors.livia, undefined);
  assert.ok(!state.scenes[0].tokens.some((t) => t.actorId === "livia"));
  assert.ok(!state.combat.order.includes("livia"));
  assert.equal(L.libraryRows(state, "player").trash.length, 1);
  assert.equal(L.libraryRows(state, "dm").trash.length, 0, "the trash is the owner's");
  const id = L.restoreFromTrash(state, trashId, "player", NOW + 1);
  assert.equal(id, "livia");
  assert.deepEqual(state.scenes[0].tokens, tokensBefore);
  assert.deepEqual(state.combat.order, orderBefore);
  assert.equal(state.ext["character-library"].trash.length, 0);
  refusal(() => L.restoreFromTrash(state, trashId, "player"), /trash|cestino/);
  // Purge: gone with its revisions and log.
  const again = L.deleteCharacter(state, "iria", "player", NOW + 2);
  L.purgeFromTrash(state, again, "player");
  assert.equal(state.actors.iria, undefined);
  assert.equal(state.ext["character-library"].revisions.iria, undefined);
  assert.equal(state.ext["character-library"].logs.iria, undefined);
  // In a running encounter the sheet cannot be deleted.
  state.combat.active = true;
  refusal(() => L.deleteCharacter(state, "livia", "player"), /encounter|combattimento/);
});

// ---------------------------------------------------------------- privacy and link

test("privacy: three levels, audiences, link resolution, regeneration revokes, private hides", () => {
  const state = seeded();
  assert.equal(L.privacyOf(state, "livia"), "campaign");
  assert.deepEqual(L.audienceAccess(state, "livia"), {
    owner: "full",
    dm: "full",
    players: "read",
    link: "none",
  });
  L.setPrivacy(state, "livia", "private", "player", NOW);
  assert.deepEqual(L.audienceAccess(state, "livia"), {
    owner: "full",
    dm: "full",
    players: "summary",
    link: "none",
  });
  refusal(() => L.setPrivacy(state, "livia", "public", "dm"), /owner|possiede/);
  refusal(() => L.setPrivacy(state, "livia", "friends", "player"), /privacy/);
  L.setPrivacy(state, "livia", "public", "player", NOW);
  const code = state.ext["character-library"].entries.livia.link.code;
  assert.match(code, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  assert.deepEqual(L.resolveLink(state, code), { status: "ok", actorId: "livia" });
  assert.equal(L.audienceAccess(state, "livia").link, "read");
  assert.match(L.linkUrl(code, "http://x/"), /^http:\/\/x\/#character-library-link\?id=/);
  const fresh = L.regenerateLink(state, "livia", "player", NOW);
  assert.notEqual(fresh, code);
  assert.equal(L.resolveLink(state, code).status, "revoked");
  assert.equal(L.resolveLink(state, fresh).status, "ok");
  L.setPrivacy(state, "livia", "private", "player");
  assert.equal(L.resolveLink(state, fresh).status, "private");
  assert.equal(L.resolveLink(state, "NOPE").status, "unknown");
  // A personal sheet: nobody else but the link audience.
  assert.deepEqual(L.audienceAccess(state, "iria"), {
    owner: "full",
    dm: "none",
    players: "none",
    link: "none",
  });
});

test("link page renders the read-only projection without commands or private data", () => {
  const h = harness();
  h.state().actors.livia.personalPlans = { player: "SEGRETO-PIANO" };
  h.ctx.commit("p", (draft) => L.setPrivacy(draft, "livia", "public", "player"));
  const code = h.lib().entries.livia.link.code;
  h.ctx.view = { page: L.ROUTE_LINK, id: code, tab: "" };
  const html = L.renderLinkPage(h.ctx);
  assert.match(html, /data-clib-link="ok"/);
  assert.match(html, /Sola lettura/);
  assert.match(html, /Trova Famiglio/);
  assert.doesNotMatch(html, /<button/, "no commands on the shared sheet");
  assert.doesNotMatch(html, /SEGRETO-PIANO/);
  h.ctx.commit("p", (draft) => L.setPrivacy(draft, "livia", "campaign", "player"));
  assert.match(L.renderLinkPage(h.ctx), /data-clib-link="private"/);
  h.ctx.view = { page: L.ROUTE_LINK, id: "ZZZZ", tab: "" };
  assert.match(L.renderLinkPage(h.ctx), /data-clib-link="unknown"/);
});

// ---------------------------------------------------------------- campaign

test("link vs bring a copy; leave campaign keeps the sheet in the library", () => {
  const state = seeded();
  const copyId = L.bringCopyToCampaign(state, "iria", "player", { name: "Iria (Bruma)", now: NOW });
  const copy = state.actors[copyId];
  assert.deepEqual(copy.campaignIds, ["lanterns"]);
  assert.equal(copy.visibility, "shared");
  assert.equal(copy.copiedFrom.snapshotFor, "lanterns");
  assert.equal(state.actors.iria.visibility, "private", "the original stays in the library");
  assert.equal(canViewActor(copy, "dm", state), true);
  assert.equal(canViewActor(state.actors.iria, "dm", state), false);
  L.linkToCampaign(state, "iria", "player");
  assert.deepEqual(state.actors.iria.campaignIds, ["lanterns"]);
  assert.equal(canViewActor(state.actors.iria, "dm", state), true, "live link: same sheet");
  refusal(() => L.linkToCampaign(state, "iria", "player"), /already|già/);
  const liviaTokens = state.scenes.flatMap((s) => s.tokens).filter((t) => t.actorId === "livia");
  const result = L.leaveCampaign(state, "livia", "player", NOW);
  assert.equal(result.tokens, liviaTokens.length);
  assert.ok(!state.scenes.some((s) => s.tokens.some((t) => t.actorId === "livia")));
  assert.equal(state.actors.livia.visibility, "private");
  assert.deepEqual(state.actors.livia.campaignIds, []);
  assert.equal(canViewActor(state.actors.livia, "dm", state), false);
  refusal(() => L.leaveCampaign(state, "livia", "player"), /not in|non è/);
});

test("release: the campaign keeps an unassigned sheet another player can claim; copy kept", () => {
  const state = seeded(true);
  refusal(
    () => L.releaseCharacter(state, "doran", "dm"),
    /run this campaign|DM di questa campagna/,
  );
  const { copyId, owner } = L.releaseCharacter(state, "mira", "player", {
    keepCopy: true,
    now: NOW,
  });
  assert.equal(owner, "dm");
  assert.equal(state.actors.mira.owner, "dm");
  assert.equal(state.actors.mira.released.by, "player");
  const row = members.rosterOf(state, "lanterns").find((seat) => seat.actorId === "mira");
  assert.equal(row.status, "unassigned");
  assert.equal(state.actors[copyId].owner, "player");
  assert.equal(state.actors[copyId].visibility, "private");
  assert.equal(state.actors[copyId].copiedFrom.actorId, "mira");
  // The player can claim it back through B13, like any other player.
  members.claimSeat(state, "lanterns", "mira", "player", NOW + 1);
  assert.equal(
    members.rosterOf(state, "lanterns").find((s) => s.actorId === "mira").status,
    "active",
  );
});

test("transfer to another campaign waits for the destination DM; accept moves the sheet", () => {
  const state = seeded(true);
  assert.deepEqual(L.transferTargets(state, "livia", "player"), []);
  const ruins = members.createCampaign(state, { name: "Rovine di Vetro" }, "dm", NOW);
  const invite = members.inviteIdentity(state, ruins, { to: "player", role: "player" }, "dm", NOW);
  members.joinCampaign(
    state,
    { code: invite.code, path: "premade", premadeId: "premade-fighter", name: "Brenna" },
    "player",
    NOW,
  );
  assert.deepEqual(L.transferTargets(state, "livia", "player"), [
    { id: ruins, name: "Rovine di Vetro" },
  ]);
  const id = L.requestTransfer(state, "livia", ruins, "player", NOW);
  refusal(() => L.requestTransfer(state, "livia", ruins, "player", NOW), /pending|attesa/);
  assert.equal(L.incomingTransfers(state, "dm").length, 1);
  assert.equal(L.incomingTransfers(state, "player").length, 0);
  refusal(() => L.answerTransfer(state, id, true, "player"), /destination|destinazione/);
  L.answerTransfer(state, id, true, "dm", NOW + 1);
  assert.deepEqual(state.actors.livia.campaignIds, [ruins]);
  assert.ok(!state.scenes[0].tokens.some((t) => t.actorId === "livia"), "leaves the old maps");
  assert.ok(!members.rosterOf(state, "lanterns").some((s) => s.actorId === "livia"));
  assert.ok(members.rosterOf(state, ruins).some((s) => s.actorId === "livia"));
  // Declined and withdrawn requests change nothing.
  const other = L.requestTransfer(state, "mira", ruins, "player", NOW);
  L.withdrawTransfer(state, other, "player", NOW);
  assert.deepEqual(state.actors.mira.campaignIds, ["lanterns"]);
  const third = L.requestTransfer(state, "mira", ruins, "player", NOW);
  L.answerTransfer(state, third, false, "dm", NOW);
  assert.deepEqual(state.actors.mira.campaignIds, ["lanterns"]);
});

// ---------------------------------------------------------------- revisions and log

test("revisions: compare, restore as a new revision keeping live play state", () => {
  const state = seeded();
  const livia = state.actors.livia;
  livia.hp = 20;
  livia.spellSlots[1].used = 3;
  const [first] = L.revisionsOf(state, "livia");
  const diff = L.compareSheets(first.data, X.sheetData(livia));
  const keys = diff.map((row) => row.key);
  assert.ok(keys.includes("level") && keys.includes("maxHp"));
  assert.ok(diff.some((row) => row.change === "added" && row.key.startsWith("spells.")));
  assert.ok(diff.some((row) => row.change === "quantity" && row.key === "inventory.potion"));
  assert.ok(diff.some((row) => row.change === "added" && row.key === "inventory.rope"));
  const restored = L.restoreRevision(state, "livia", first.id, "player", NOW);
  assert.equal(livia.level, 2);
  assert.equal(livia.maxHp, 16);
  assert.equal(livia.hp, 16, "current HP within the restored maximum");
  assert.equal(livia.spellSlots[1].max, 3);
  assert.equal(livia.spellSlots[1].used, 3, "spent slots stay recorded");
  assert.equal(livia.spellSlots[2].max, 0, "a removed pool keeps its spent uses at max 0");
  const list = L.revisionsOf(state, "livia");
  assert.equal(list.length, 4, "auto-save before + restore after; none removed");
  assert.equal(list[2].kind, "auto");
  assert.equal(list[2].data.level, 3, "the pre-restore sheet is kept");
  assert.equal(restored.kind, "restore");
  // Restoring the auto revision brings level 3 back.
  L.restoreRevision(state, "livia", list[2].id, "player", NOW + 10);
  assert.equal(livia.level, 3);
  refusal(() => L.restoreRevision(state, "livia", "nope", "player"), /not found|trovata/);
  refusal(() => L.saveRevision(state, "iria", "dm"), /cannot|Non puoi/);
  const saved = L.saveRevision(state, "livia", "player", {
    label: "Prima della sessione 13",
    now: NOW,
  });
  assert.equal(saved.label, "Prima della sessione 13");
});

test("adventure log: owner adds, corrects, deletes; totals; strict validation", () => {
  const state = seeded();
  const id = L.addLogEntry(state, "iria", "player", {
    date: "2026-09-20",
    title: "La biblioteca sommersa",
    dm: "Ospite",
    levels: "1",
    gold: "-12.5",
    downtime: "3",
    items: "Pergamena di Volare",
    notes: "",
  });
  assert.deepEqual(L.logTotals(L.logOf(state, "iria")), {
    entries: 2,
    levels: 1,
    gold: 67.5,
    downtime: 8,
  });
  L.updateLogEntry(state, "iria", id, "player", {
    title: "La biblioteca sommersa (parte 1)",
    levels: 0,
    gold: 10,
    downtime: 0,
  });
  assert.equal(L.logOf(state, "iria")[1].title, "La biblioteca sommersa (parte 1)");
  refusal(() => L.addLogEntry(state, "iria", "player", { title: "" }), /title|titolo/);
  refusal(
    () => L.addLogEntry(state, "iria", "player", { title: "x", levels: "1.5" }),
    /whole|interi/,
  );
  refusal(() => L.addLogEntry(state, "iria", "player", { title: "x", date: "ieri" }), /date|Data/);
  refusal(() => L.addLogEntry(state, "livia", "dm", { title: "x" }), /owner|possiede/);
  L.deleteLogEntry(state, "iria", id, "player");
  assert.equal(L.logOf(state, "iria").length, 1);
});

// ---------------------------------------------------------------- files

test("export JSON round-trips through import as a new sheet; malformed files change nothing", () => {
  const state = seeded();
  const file = X.exportCharacter(state.actors.iria, { log: L.logOf(state, "iria"), now: NOW });
  assert.equal(file.format, "d20-studio.character");
  assert.equal(file.character.personalPlans, undefined);
  assert.equal(file.character.owner, undefined);
  assert.equal(X.exportFileName(state.actors.iria), "d20-studio-iria.json");
  const parsed = X.parseCharacterFile(JSON.stringify(file));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.preview.counts.spells, 14);
  assert.deepEqual(parsed.preview.ignored, []);
  const before = Object.keys(state.actors).length;
  const id = L.importCharacter(state, parsed, "player", {
    name: "Iria (importata)",
    fileName: "d20-studio-iria.json",
    now: NOW,
  });
  assert.equal(Object.keys(state.actors).length, before + 1, "a new sheet, nothing replaced");
  const copy = state.actors[id];
  assert.equal(copy.visibility, "private");
  assert.deepEqual(
    X.sheetData({ ...copy, name: "Iria" }),
    X.sheetData({ ...state.actors.iria, buildSeed: copy.buildSeed }),
  );
  assert.equal(L.logOf(state, id).length, 1);
  // Distinct messages: malformed, other format, newer version, insufficient, too large.
  assert.equal(X.parseCharacterFile("{nope").kind, "malformed");
  // PG-92: a Foundry dnd5e character is mapped (an empty one lacks the data); another
  // Foundry document is refused, naming Foundry.
  assert.equal(
    X.parseCharacterFile(JSON.stringify({ type: "character", system: {} })).kind,
    "insufficient",
  );
  assert.equal(
    X.parseCharacterFile(JSON.stringify({ type: "npc", system: {} })).kind,
    "unsupported",
  );
  assert.match(X.parseCharacterFile(JSON.stringify({ type: "npc", system: {} })).en, /Foundry/);
  assert.match(
    X.parseCharacterFile(JSON.stringify({ format: "d20-studio-library" })).en,
    /Library/,
  );
  assert.equal(X.parseCharacterFile(JSON.stringify({ ...file, formatVersion: 2 })).kind, "newer");
  const thin = X.parseCharacterFile(
    JSON.stringify({ ...file, character: { name: "", level: 99 } }),
  );
  assert.equal(thin.kind, "insufficient");
  assert.match(thin.it, /nome/);
  assert.equal(X.parseCharacterFile("x", { bytes: X.MAX_IMPORT_BYTES + 1 }).kind, "too-large");
  // Unknown and unsafe fields are listed, never imported.
  const extra = X.parseCharacterFile(
    JSON.stringify({
      ...file,
      character: { ...file.character, owner: "dm", visibility: "shared", hack: "<script>" },
    }),
  );
  assert.deepEqual(extra.preview.ignored.sort(), ["hack", "owner", "visibility"]);
  assert.equal(extra.character.owner, undefined);
});

test("PDF: fillable fields, spell table with concentration and ritual, adventure log", () => {
  const state = seeded();
  const sheet = X.readSheet(state.actors.iria, { log: L.logOf(state, "iria") });
  const bytes = X.characterPdf(sheet, "it", { now: NOW });
  const text = String.fromCharCode(...bytes);
  assert.ok(text.startsWith("%PDF-1.4"));
  assert.ok(text.trimEnd().endsWith("%%EOF"));
  assert.match(text, /\/AcroForm << \/Fields \[/);
  assert.match(text, /\/T \(ability_int\)/);
  assert.match(text, /\(Individuazione del magico\) Tj/);
  assert.match(
    text,
    /\/F2 10 Tf 0 g [\d.]+ [\d.]+ Td \(C\) Tj/,
    "bold C flag for a concentration spell",
  );
  assert.match(text, /\(Il faro spento \(avventura da una sera\)\)|faro spento/);
  // Cross-reference offsets point at their objects.
  const xref = Number(text.match(/startxref\n(\d+)/)[1]);
  assert.ok(text.slice(xref).startsWith("xref"));
  const offsets = [...text.slice(xref).matchAll(/^(\d{10}) 00000 n $/gm)].map((m) => Number(m[1]));
  offsets.forEach((offset, index) =>
    assert.ok(text.slice(offset).startsWith(`${index + 1} 0 obj`)),
  );
  assert.equal(X.characterPdf(sheet, "en").length > 1000, true);
});

test("QR code: version, finder patterns, format information and quiet zone", () => {
  const matrix = X.qrMatrix("http://127.0.0.1:8879/#character-library-link?id=ABCD-EFGH-JKLM");
  assert.equal(matrix.length, 37, "version 5 for a 66-byte link at level M");
  const finder = (x0, y0) =>
    [0, 1, 2, 3, 4, 5, 6].every(
      (i) => matrix[y0][x0 + i] && matrix[y0 + 6][x0 + i] && matrix[y0 + i][x0],
    );
  assert.ok(finder(0, 0) && finder(30, 0) && finder(0, 30));
  assert.equal(matrix[37 - 8][8], true, "dark module");
  for (let i = 8; i < 29; i += 1) assert.equal(matrix[6][i], i % 2 === 0, "timing pattern");
  assert.equal(X.qrMatrix("HELLO").length, 21);
  assert.throws(() => X.qrMatrix("x".repeat(400)), /too long/);
  const svg = X.qrSvg("HELLO", { label: 'QR "Livia"' });
  assert.match(svg, /role="img" aria-label="QR &quot;Livia&quot;"/);
  assert.match(svg, /viewBox="0 0 29 29"/);
});

// ---------------------------------------------------------------- UI handlers

test("UI: copy, delete with confirmation, restore from the notice; undo reverts the copy", () => {
  const h = harness();
  L.runAction(h.ctx, "copy", { actor: "iria" });
  assert.equal(h.dialogs.at(-1).title, "Copia Iria");
  assert.match(h.dialogs.at(-1).options.submitLabel, /Crea la copia/);
  h.submit(-1, [
    ["name", "Iria (copia)"],
    ["log", "on"],
  ]);
  const copy = Object.values(h.state().actors).find((a) => a.name === "Iria (copia)");
  assert.ok(copy);
  assert.equal(L.libraryView.notice.kind, "copied");
  assert.match(
    L.renderLibraryPage(h.ctx),
    /data-clib-notice><span>Copia creata[^]*data-clib-act="undo"/,
  );
  L.runAction(h.ctx, "undo", {});
  assert.ok(
    !Object.values(h.state().actors).some((a) => a.name === "Iria (copia)"),
    "Undo (from the notice) removes the copy",
  );
  assert.equal(L.libraryView.notice, null);
  L.runAction(h.ctx, "copy", { actor: "iria" });
  h.submit(-1, [["name", "Iria (copia)"]]);
  const id = Object.values(h.state().actors).find((a) => a.name === "Iria (copia)").id;
  L.runAction(h.ctx, "delete", { actor: id });
  assert.match(h.dialogs.at(-1).body, /Cestino/);
  h.submit(-1);
  assert.equal(h.state().actors[id], undefined);
  assert.equal(L.libraryView.notice.kind, "trashed");
  const html = L.renderLibraryPage(h.ctx);
  assert.match(html, /è nel cestino/);
  assert.match(html, /data-clib-trash/);
  L.runAction(h.ctx, "restore", { trash: L.libraryView.notice.trashId });
  assert.ok(h.state().actors[id], "restored");
  // After a reload the library keeps the copy (persisted state).
  h.reload();
  assert.ok(h.state().actors[id]);
});

test("UI: privacy dialog saves; share dialog shows link and QR; DM cannot change it", () => {
  const h = harness();
  L.runAction(h.ctx, "privacy", { actor: "livia" });
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.body, /data-clib-audience/);
  assert.match(dialog.body, /chi gioca Doran/);
  h.submit(-1, [["privacy", "private"]]);
  assert.equal(L.privacyOf(h.state(), "livia"), "private");
  L.runAction(h.ctx, "privacy", { actor: "livia" });
  assert.match(h.dialogs.at(-1).body, /data-access="summary"/);
  h.submit(-1, [["privacy", "public"]]);
  L.runAction(h.ctx, "share", { actor: "livia" });
  assert.match(h.dialogs.at(-1).body, /<svg[^>]+role="img"/);
  assert.match(h.dialogs.at(-1).body, /#character-library-link\?id=/);
  h.ctx.role = "dm";
  const opened = h.dialogs.length;
  L.runAction(h.ctx, "manage", { actor: "livia" });
  assert.equal(h.dialogs.length, opened, "only the owner manages (privacy, files, copy)");
  assert.equal(h.toasts.at(-1).error, true);
  L.runAction(h.ctx, "manage", { actor: "doran" });
  assert.match(h.dialogs.at(-1).body, /data-clib-act="leave"/);
  assert.doesNotMatch(
    h.dialogs.at(-1).body,
    /data-clib-act="release"/,
    "the campaign's DM has no one to release to",
  );
  // Offline: a shared change is refused with its message; nothing changes.
  h.ctx.role = "player";
  h.ctx.offline = true;
  L.runAction(h.ctx, "privacy", { actor: "livia" });
  assert.throws(() => h.submit(-1, [["privacy", "campaign"]]), /senza rete/);
  assert.equal(L.privacyOf(h.state(), "livia"), "public");
  // A personal sheet changes privately even offline.
  L.runAction(h.ctx, "privacy", { actor: "iria" });
  h.submit(-1, [["privacy", "public"]]);
  assert.equal(L.privacyOf(h.state(), "iria"), "public");
});

test("UI: transfer request, DM accept from the list and the notification", () => {
  const h = harness({ withMembers: true });
  L.runAction(h.ctx, "transfer", { actor: "livia" });
  assert.match(h.dialogs.at(-1).body, /Non giochi in altre campagne/);
  h.ctx.commit("fixture", (draft) => {
    const ruins = members.createCampaign(draft, { name: "Rovine di Vetro" }, "dm", NOW);
    const invite = members.inviteIdentity(
      draft,
      ruins,
      { to: "player", role: "player" },
      "dm",
      NOW,
    );
    members.joinCampaign(
      draft,
      { code: invite.code, path: "premade", premadeId: "premade-fighter", name: "Brenna" },
      "player",
      NOW,
    );
  });
  L.runAction(h.ctx, "transfer", { actor: "livia" });
  const ruins = members
    .listCampaigns(h.state(), "player")
    .find((c) => c.name === "Rovine di Vetro").id;
  h.submit(-1, [["to", ruins]]);
  assert.match(L.renderLibraryPage(h.ctx), /In attesa di Rovine di Vetro/);
  h.ctx.role = "dm";
  const notes = h.registry.notifications(h.ctx);
  assert.ok(notes.some((n) => n.id.startsWith("character-library-transfer")));
  const html = L.renderLibraryPage(h.ctx);
  const transferId = html.match(/data-clib-act="accept-transfer" data-transfer="([^"]+)"/)[1];
  L.runAction(h.ctx, "accept-transfer", { transfer: transferId });
  assert.deepEqual(h.state().actors.livia.campaignIds, [ruins]);
  assert.match(h.toasts.at(-1).text, /Rovine di Vetro/);
});

test("UI: import preview then new sheet; malformed file shows the error and changes nothing", async () => {
  const h = harness();
  const good = JSON.stringify(X.exportCharacter(h.state().actors.livia, { now: NOW }));
  const input = (text, name = "livia.json") => ({
    value: "C:\\fakepath\\" + name,
    files: [{ name, size: text.length, text: async () => text }],
  });
  const before = JSON.stringify(h.state().actors);
  await L.handleImportFile(h.ctx, input("{broken", "rotto.json"));
  assert.equal(JSON.stringify(h.state().actors), before);
  assert.match(L.libraryView.importError.it, /rotto\.json: Il file non è un JSON leggibile/);
  assert.match(L.renderLibraryPage(h.ctx), /role="alert" data-clib-import-error/);
  const file = input(good);
  await L.handleImportFile(h.ctx, file);
  assert.equal(file.value, "", "the same file can be chosen again");
  const preview = h.dialogs.at(-1);
  assert.match(preview.body, /data-clib-import-preview/);
  assert.match(preview.body, /Livia \(importata\)/, "an existing name gets a distinct suggestion");
  h.submit(-1, [["name", "Livia (importata)"]]);
  const imported = Object.values(h.state().actors).find((a) => a.name === "Livia (importata)");
  assert.equal(imported.owner, "player");
  assert.equal(imported.inventory.length, h.state().actors.livia.inventory.length);
  assert.equal(L.libraryView.notice.kind, "imported");
  assert.equal(L.libraryView.importError, null);
});

test("UI: sheet tabs — log add/delete and revision restore through their dialogs", () => {
  const h = harness();
  const livia = h.state().actors.livia;
  const log = mount(L.renderLogTab(h.ctx, livia));
  L.bindLogTab(log, h.ctx, livia);
  log.click("[data-clib-log-add]");
  h.submit(-1, [
    ["date", "2026-09-24"],
    ["title", "Sessione 13"],
    ["levels", "0"],
    ["gold", "5"],
    ["downtime", "1"],
  ]);
  assert.equal(L.logOf(h.state(), "livia").length, 3);
  const row = L.logOf(h.state(), "livia").at(-1);
  const again = mount(L.renderLogTab(h.ctx, h.state().actors.livia));
  L.bindLogTab(again, h.ctx, h.state().actors.livia);
  again.click(`[data-clib-log-delete="${row.id}"]`);
  h.submit(-1);
  assert.equal(L.logOf(h.state(), "livia").length, 2);
  const noticed = L.renderLogTab(h.ctx, h.state().actors.livia);
  assert.match(
    noticed,
    /data-clib-tab-notice>Voce eliminata: Sessione 13\. <button[^>]*data-clib-act="undo"/,
  );
  L.runAction(h.ctx, "undo", {});
  assert.equal(L.logOf(h.state(), "livia").length, 3, "Undo from the notice restores the entry");
  // DM reads the log without commands.
  h.ctx.role = "dm";
  assert.doesNotMatch(
    L.renderLogTab(h.ctx, h.state().actors.livia),
    /data-clib-log-add|data-clib-log-delete/,
  );
  h.ctx.role = "player";
  const [first] = L.revisionsOf(h.state(), "livia");
  const revs = mount(L.renderRevisionsTab(h.ctx, h.state().actors.livia));
  L.bindRevisionsTab(revs, h.ctx, h.state().actors.livia);
  revs.click(`[data-clib-rev-restore="${first.id}"]`);
  assert.match(h.dialogs.at(-1).body, /Cosa cambia/);
  assert.match(h.dialogs.at(-1).body, /data-change="removed"/);
  h.submit(-1);
  assert.equal(h.state().actors.livia.level, 2);
  assert.equal(L.revisionsOf(h.state(), "livia").length, 4);
  h.ctx.undo();
  assert.equal(h.state().actors.livia.level, 3, "Undo reverts the restore");
});

test("print and sheet bar: printable view, manage control injected in the breadcrumb", () => {
  const h = harness();
  h.ctx.view = { page: L.ROUTE_PRINT, id: "iria", tab: "" };
  const print = L.renderPrintPage(h.ctx);
  assert.match(print, /data-clib-print-now/);
  assert.match(print, /Individuazione del magico/);
  h.ctx.role = "dm";
  assert.match(
    L.renderPrintPage(h.ctx),
    /Scheda non disponibile/,
    "a personal sheet is not printable by others",
  );
  h.ctx.role = "player";
  h.ctx.view = { page: "characters", id: "livia", tab: "" };
  const sheet = L.renderCharactersRoute(h.ctx);
  assert.match(
    sheet,
    /character-breadcrumb">[^]*?clib-sheet-bar[^]*?Gestisci personaggio<\/button><\/span><\/div>/,
  );
  // B62: the log and the revisions are sub-sections of the sheet's Notes category (D&D
  // Beyond's sheet sections); the category is in the strip, its sub-sections under it.
  assert.match(sheet, /data-character-tab="notes"/);
  h.ctx.view = { page: "characters", id: "livia", tab: "notes" };
  const notes = L.renderCharactersRoute(h.ctx);
  assert.match(notes, /data-character-tab="character-library-log"/);
  assert.match(notes, /data-character-tab="character-library-revisions"/);
});

// ---------------------------------------------------------------- review fixes (B21 review)

test("review: a 'player and DM only' sheet shows other players the summary only, everywhere", () => {
  // Roles swapped (limit of two identities): the DM owns Doran and restricts it; the player
  // is "another player" for Doran.
  const h = harness({ role: "dm" });
  h.ctx.commit("fixture", (draft) => L.setPrivacy(draft, "doran", "private", "dm"));
  const state = h.state();
  assert.equal(L.sheetAccess(state, state.actors.doran, "player"), "summary");
  assert.equal(L.sheetAccess(state, state.actors.doran, "dm"), "full");
  assert.equal(L.sheetAccess(state, state.actors.livia, "player"), "full");
  assert.equal(L.sheetAccess(state, state.actors.livia, "dm"), "full", "the DM reads the party");
  assert.equal(L.sheetAccess(state, state.actors.iria, "dm"), "none", "personal sheet");
  assert.equal(L.audienceAccess(state, "doran").players, "summary", "what the dialog promised");
  h.ctx.role = "player";
  const row = L.libraryRows(state, "player").others.find((r) => r.id === "doran");
  assert.equal(row.access, "summary");
  assert.equal(row.hp, null);
  assert.equal(row.ac, null);
  const list = L.renderLibraryPage(h.ctx);
  const card = list.match(/<article[^>]*data-clib-card="doran"[^]*?<\/article>/)[0];
  assert.match(card, /Doran/);
  assert.match(card, /Guerriero · Livello 3/);
  assert.doesNotMatch(card, /data-character-action="open"|data-clib-act="manage"|27\/31|CA 16/);
  // The sheet route, the printable view, files and the history tabs stay closed.
  h.ctx.view = { page: "characters", id: "doran", tab: "" };
  const sheet = L.renderCharactersRoute(h.ctx);
  assert.match(sheet, /data-clib-summary-page/);
  assert.doesNotMatch(sheet, /data-character-tab|Inventario|27 \/ 31/);
  assert.equal(h.registry.get("sheet-tab", L.TAB_REVISIONS, h.ctx, state.actors.doran), null);
  assert.equal(h.registry.get("sheet-tab", L.TAB_LOG, h.ctx, state.actors.doran), null);
  h.ctx.view = { page: L.ROUTE_PRINT, id: "doran", tab: "" };
  assert.match(L.renderPrintPage(h.ctx), /Scheda non disponibile/);
  for (const act of ["export", "pdf", "manage"]) {
    const before = h.dialogs.length;
    L.runAction(h.ctx, act, { actor: "doran" });
    assert.equal(h.toasts.at(-1).error, true, `${act} refused`);
    assert.equal(h.dialogs.length, before);
  }
  // Back to "campaign only": the player reads the sheet again (read only, no Manage).
  h.ctx.role = "dm";
  h.ctx.commit("fixture", (draft) => L.setPrivacy(draft, "doran", "campaign", "dm"));
  h.ctx.role = "player";
  assert.equal(L.sheetAccess(h.state(), h.state().actors.doran, "player"), "read");
  h.ctx.view = { page: "characters", id: "doran", tab: "" };
  assert.doesNotMatch(L.renderCharactersRoute(h.ctx), /data-clib-summary-page/);
  h.ctx.view = { page: "characters", id: "", tab: "" };
  const readCard = L.renderLibraryPage(h.ctx).match(
    /<article[^>]*data-clib-card="doran"[^]*?<\/article>/,
  )[0];
  assert.match(readCard, /data-character-action="open"/);
  assert.doesNotMatch(readCard, /data-clib-act="manage"/);
});

test("review: revisions follow the B20 lock on DM edits (PG-94) in the tab and the domain", () => {
  const h = harness();
  const lock = (value) =>
    h.ctx.commit("fixture", (draft) => {
      draft.ext["campaign-settings"] = {
        campaigns: { lanterns: { policy: { dmSheetEdit: value ? { livia: false } : {} } } },
      };
    });
  lock(true);
  h.ctx.role = "dm";
  const [first] = L.revisionsOf(h.state(), "livia");
  const html = L.renderRevisionsTab(h.ctx, h.state().actors.livia);
  assert.doesNotMatch(html, /data-clib-rev-restore|data-clib-rev-save/);
  assert.match(html, /Modifica riservata a chi gioca Livia/);
  assert.match(html, /data-clib-rev-compare/, "the DM still compares");
  const tab = mount(html);
  L.bindRevisionsTab(tab, h.ctx, h.state().actors.livia);
  tab.click("[data-clib-go-access]");
  assert.deepEqual(h.navigations.at(-1), { page: "characters", id: "livia", tab: "actions" });
  const draft = structuredClone(h.state());
  refusal(() => L.restoreRevision(draft, "livia", first.id, "dm"), /autorizz|allow/);
  refusal(() => L.saveRevision(draft, "livia", "dm"), /autorizz|allow/);
  assert.equal(draft.actors.livia.level, 3);
  // The owner is never locked; once allowed again, the DM restores.
  assert.equal(L.restoreRevision(draft, "livia", first.id, "player").kind, "restore");
  h.ctx.role = "player";
  lock(false);
  h.ctx.role = "dm";
  assert.match(L.renderRevisionsTab(h.ctx, h.state().actors.livia), /data-clib-rev-restore/);
});

test("review: revisions saved before linking, transfer or release stay with their owner", () => {
  const state = seeded(true);
  const secret = L.saveRevision(state, "iria", "player", { label: "bozza privata", now: NOW });
  state.actors.iria.backstory = "Una storia innocua.";
  L.linkToCampaign(state, "iria", "player", NOW + 1);
  const seen = (who) => L.visibleRevisions(state, "iria", who).map((row) => row.id);
  assert.ok(seen("player").includes(secret.id), "the owner keeps the whole history");
  assert.ok(!seen("dm").includes(secret.id), "the DM never sees pre-link revisions");
  assert.deepEqual(
    L.visibleRevisions(state, "iria", "dm").map((row) => row.kind),
    ["link"],
    "a shared history starts at the link",
  );
  refusal(() => L.restoreRevision(state, "iria", secret.id, "dm"), /not found|trovata/);
  // Transfer: history saved in the old campaign stays with the owner.
  const ruins = members.createCampaign(state, { name: "Rovine di Vetro" }, "dm", NOW);
  const invite = members.inviteIdentity(state, ruins, { to: "player", role: "player" }, "dm", NOW);
  members.joinCampaign(
    state,
    { code: invite.code, path: "premade", premadeId: "premade-fighter", name: "Brenna" },
    "player",
    NOW,
  );
  const liviaBefore = L.revisionsOf(state, "livia").map((row) => row.id);
  const request = L.requestTransfer(state, "livia", ruins, "player", NOW + 2);
  L.answerTransfer(state, request, true, "dm", NOW + 3);
  const dmSees = L.visibleRevisions(state, "livia", "dm");
  assert.ok(
    dmSees.every((row) => !liviaBefore.includes(row.id)),
    "old campaign history hidden",
  );
  assert.deepEqual(
    dmSees.map((row) => row.kind),
    ["transfer"],
  );
  assert.equal(L.visibleRevisions(state, "livia", "player").length, liviaBefore.length + 1);
  // Release: the campaign's DM becomes the owner but never gets the personal history.
  const { copyId } = L.releaseCharacter(state, "iria", "player", { now: NOW + 4 });
  assert.equal(state.actors.iria.owner, "dm");
  assert.ok(!seen("dm").includes(secret.id));
  assert.ok(seen("player").includes(secret.id));
  assert.equal(L.visibleRevisions(state, copyId, "dm").length, 0, "the kept copy is personal");
});

test("review: a refused commit (offline) leaves no success notice behind", () => {
  const h = harness();
  h.ctx.offline = true;
  const livia = () => h.state().actors.livia;
  const log = mount(L.renderLogTab(h.ctx, livia()));
  L.bindLogTab(log, h.ctx, livia());
  log.click("[data-clib-log-add]");
  const added = h.submitLikeApp(-1, [["title", "Sessione offline"]]);
  assert.match(added.error?.it ?? "", /senza rete/);
  assert.equal(L.logOf(h.state(), "livia").length, 2);
  assert.doesNotMatch(L.renderLogTab(h.ctx, livia()), /data-clib-tab-notice/);
  const row = L.logOf(h.state(), "livia")[0];
  const again = mount(L.renderLogTab(h.ctx, livia()));
  L.bindLogTab(again, h.ctx, livia());
  again.click(`[data-clib-log-edit="${row.id}"]`);
  assert.ok(h.submitLikeApp(-1, [["title", "x"]]).error);
  again.click(`[data-clib-log-delete="${row.id}"]`);
  assert.ok(h.submitLikeApp(-1).error);
  assert.doesNotMatch(L.renderLogTab(h.ctx, livia()), /data-clib-tab-notice/);
  const revs = mount(L.renderRevisionsTab(h.ctx, livia()));
  L.bindRevisionsTab(revs, h.ctx, livia());
  revs.click("[data-clib-rev-save]");
  assert.ok(h.submitLikeApp(-1, [["label", "offline"]]).error);
  const [first] = L.revisionsOf(h.state(), "livia");
  revs.click(`[data-clib-rev-restore="${first.id}"]`);
  assert.ok(h.submitLikeApp(-1).error);
  assert.equal(livia().level, 3);
  assert.equal(L.revisionsOf(h.state(), "livia").length, 2);
  assert.doesNotMatch(L.renderRevisionsTab(h.ctx, livia()), /data-clib-tab-notice/);
  // A personal sheet changes privately offline, and then the notice is true.
  const iria = h.state().actors.iria;
  const own = mount(L.renderLogTab(h.ctx, iria));
  L.bindLogTab(own, h.ctx, iria);
  own.click("[data-clib-log-add]");
  assert.equal(h.submitLikeApp(-1, [["title", "Offline ma privata"]]).closed, true);
  assert.match(L.renderLogTab(h.ctx, h.state().actors.iria), /data-clib-tab-notice>Voce aggiunta/);
});

test("review: only the owner manages, exports, prints or downloads; names say what they mean", () => {
  const h = harness();
  // The player on the DM's Doran (campaign only: readable), the DM on the player's Livia.
  for (const [role, id] of [
    ["player", "doran"],
    ["dm", "livia"],
  ]) {
    h.ctx.role = role;
    h.ctx.view = { page: "characters", id: "", tab: "" };
    const card = L.renderLibraryPage(h.ctx).match(
      new RegExp(`<article[^>]*data-clib-card="${id}"[^]*?</article>`),
    )[0];
    assert.match(card, /data-character-action="open"/);
    assert.doesNotMatch(card, /data-clib-act="manage"/);
    h.ctx.view = { page: "characters", id, tab: "" };
    assert.doesNotMatch(L.renderCharactersRoute(h.ctx), /Gestisci personaggio/);
    h.ctx.view = { page: L.ROUTE_PRINT, id, tab: "" };
    assert.match(L.renderPrintPage(h.ctx), /Scheda non disponibile/);
    for (const act of ["manage", "export", "pdf"]) {
      const toasts = h.toasts.length;
      L.runAction(h.ctx, act, { actor: id });
      assert.equal(h.toasts.length, toasts + 1);
      assert.equal(h.toasts.at(-1).error, true, `${role} ${act} ${id}`);
    }
  }
  h.ctx.role = "player";
  h.ctx.view = { page: "characters", id: "", tab: "" };
  L.runAction(h.ctx, "manage", { actor: "livia" });
  assert.match(h.dialogs.at(-1).body, /data-clib-act="export"/, "the owner exports");
  // A library-only sheet is "Personal"; the restricted campaign level says who reads it.
  let html = L.renderLibraryPage(h.ctx);
  assert.match(
    html,
    /data-clib-card="iria"[^]*?data-privacy="personal"[^>]*>[^<]*<[^>]*>[^<]*<\/span> Personale/,
  );
  h.ctx.commit("fixture", (draft) => L.setPrivacy(draft, "livia", "private", "player"));
  html = L.renderLibraryPage(h.ctx);
  assert.match(html, /data-clib-card="livia"[^]*?data-privacy="private"[^]*?Solo giocatore e DM/);
  L.runAction(h.ctx, "privacy", { actor: "livia" });
  assert.match(h.dialogs.at(-1).body, /chi gioca Doran/);
  h.ctx.role = "dm";
  L.runAction(h.ctx, "privacy", { actor: "doran" });
  assert.doesNotMatch(h.dialogs.at(-1).body, /chi gioca Doran/, "never the managed sheet itself");
  assert.match(h.dialogs.at(-1).body, /chi gioca (Livia|Mira)/);
  // A link whose sheet is no longer public says so, not "private again".
  h.ctx.role = "player";
  h.ctx.commit("fixture", (draft) => L.setPrivacy(draft, "livia", "public", "player"));
  const code = h.lib().entries.livia.link.code;
  h.ctx.commit("fixture", (draft) => L.setPrivacy(draft, "livia", "campaign", "player"));
  h.ctx.view = { page: L.ROUTE_LINK, id: code, tab: "" };
  const link = L.renderLinkPage(h.ctx);
  assert.match(link, /non condivide più questa scheda con un link/);
  assert.doesNotMatch(link, /privata/);
});

test("review: search matches a level only with its number ('liv' finds Livia)", () => {
  const state = seeded();
  const names = (query) =>
    [...L.libraryRows(state, "player", { query, sort: "name-asc" }).mine]
      .concat(L.libraryRows(state, "player", { query, sort: "name-asc" }).others)
      .map((row) => row.name)
      .sort();
  assert.deepEqual(names("liv"), ["Livia"]);
  assert.deepEqual(names("lev"), [], "no name, class or campaign contains 'lev'");
  assert.deepEqual(names("livello 5"), ["Iria"]);
  assert.deepEqual(names("level 5"), ["Iria"]);
  assert.deepEqual(names("5"), ["Iria"]);
  assert.deepEqual(names("liv 3"), ["Doran", "Livia", "Mira"]);
  assert.deepEqual(names("mago 3"), ["Livia"]);
  assert.deepEqual(names("mago"), ["Iria", "Livia"]);
  assert.deepEqual(names("le lanterne"), ["Doran", "Livia", "Mira"]);
  assert.equal(L.matchesQuery(L.searchText(state, state.actors.iria), 5, "livello"), false);
});

test("review: release keeps the player's private plans on their copy; badge clears on reclaim", () => {
  const h = harness({ withMembers: true });
  h.ctx.commit("fixture", (draft) => {
    draft.actors.mira.personalPlans = { player: "PIANO-GIOCATORE", dm: "PIANO-DM" };
    draft.actors.mira.futurePlan = "PIANO-FUTURO";
  });
  L.runAction(h.ctx, "release", { actor: "mira" });
  const body = h.dialogs.at(-1).body;
  assert.match(body, /piani privati/);
  assert.match(body, /name="name"[^>]*value="Mira \(copia\)"/);
  h.submit(-1, [
    ["keep", "on"],
    ["name", "Mira (copia)"],
  ]);
  const state = h.state();
  assert.deepEqual(state.actors.mira.personalPlans, { dm: "PIANO-DM" }, "the DM's own plan stays");
  assert.equal(state.actors.mira.futurePlan, undefined);
  const kept = Object.values(state.actors).find((a) => a.name === "Mira (copia)");
  assert.deepEqual(kept.personalPlans, { player: "PIANO-GIOCATORE" });
  assert.equal(kept.futurePlan, "PIANO-FUTURO");
  assert.equal(L.libraryView.notice.kind, "released");
  const page = L.renderLibraryPage(h.ctx);
  assert.match(page, /data-clib-notice>[^]*Mira resta in Le lanterne di Bruma[^]*Mira \(copia\)/);
  assert.match(page, /data-clib-card="mira"[^]*?Rilasciata da/);
  h.ctx.commit("claim", (draft) => members.claimSeat(draft, "lanterns", "mira", "player"));
  assert.equal(L.rowOf(h.state(), h.state().actors.mira, "player").released, null);
  assert.doesNotMatch(
    L.renderLibraryPage(h.ctx).match(/<article[^>]*data-clib-card="mira"[^]*?<\/article>/)[0],
    /Rilasciata da/,
  );
});
