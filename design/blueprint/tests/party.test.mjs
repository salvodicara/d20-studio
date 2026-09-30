// B44 — party area: DM overview, shared spells, vehicles, role dashboards, session-start
// message and the registry integration, with the real store and registry. The UI handlers
// run on a minimal element double. Synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { connectCharacterToCampaign } from "../character-access.mjs";
import { register as registerLibrary } from "../character-library.mjs";
import { purseOf } from "../party-stash.mjs";
import * as P from "../party.mjs";

afterEach(() => {
  P.resetPartyView();
  P.forgetMotdSeen();
});

const decode = (s) =>
  String(s ?? "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
const plain = (html) =>
  decode(String(html).replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

function harness({ lang = "it", role = "player" } = {}) {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry();
  assert.equal(registry.use("character-library", registerLibrary).status, "built");
  assert.equal(registry.use("party", P.register).status, "built");
  let store = createStore({ storage });
  registry.initState(store.state);
  const toasts = [],
    navigations = [],
    dialogs = [],
    sheets = [];
  const ctx = {
    role,
    lang,
    offline: false,
    view: { page: "campaign", id: "", tab: "overview" },
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
    openSheet: (id, tab) => sheets.push({ id, tab }),
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {},
    undoLabel: () => {
      const last = store.history.at(-1);
      return last && last.controller === ctx.role ? last.label : "";
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
    sheets,
    slice: () => P.sliceOf(store.state),
    store: () => store,
    reload() {
      store = createStore({ storage });
      registry.initState(store.state);
    },
    connectIria() {
      ctx.commit("connect", (draft) => connectCharacterToCampaign(draft, "iria", "player"));
    },
  };
}

// Minimal element double: buttons/inputs/forms from markup, own listeners, delegated
// listeners on the root (event.target.closest finds the clicked node itself).
function mount(html, bind, ...args) {
  const nodes = [
    ...html.matchAll(/<(input|button|select|textarea|form)\b([^>]*)(?:>([\s\S]*?)<\/\1>|>)/g),
  ].map(([, tag, attrsText]) => {
    const attrs = Object.fromEntries(
      [...attrsText.matchAll(/([\w-]+)(?:="([^"]*)")?/g)].map(([, k, v]) => [k, decode(v)]),
    );
    const node = {
      tagName: tag.toUpperCase(),
      attrs,
      listeners: {},
      checked: "checked" in attrs,
      value: attrs.value ?? "",
      dataset: Object.fromEntries(
        Object.entries(attrs)
          .filter(([k]) => k.startsWith("data-"))
          .map(([k, v]) => [k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
      ),
      addEventListener(type, fn) {
        (node.listeners[type] ??= []).push(fn);
      },
      classList: { add() {}, remove() {} },
      closest: (selector) => (matches(node, selector) ? node : null),
    };
    return node;
  });
  const matches = (node, selector) =>
    selector.split(",").some((part) => {
      const tag = /^([a-z]+)/.exec(part.trim())?.[1];
      return (
        (!tag || node.tagName === tag.toUpperCase()) &&
        [...part.trim().matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)].every(
          ([, key, value]) =>
            key in node.attrs && (value === undefined || node.attrs[key] === value),
        )
      );
    });
  const rootListeners = {};
  const root = {
    querySelectorAll: (selector) => nodes.filter((node) => matches(node, selector)),
    querySelector: (selector) => nodes.find((node) => matches(node, selector)) ?? null,
    addEventListener(type, fn) {
      (rootListeners[type] ??= []).push(fn);
    },
    contains: () => true,
  };
  bind(root, ...args);
  const fire = (node, type) => {
    const event = { target: node, preventDefault() {}, stopPropagation() {} };
    for (const fn of node.listeners[type] ?? []) fn(event);
    for (const fn of rootListeners[type] ?? []) fn(event);
  };
  return {
    root,
    nodes,
    click(selector) {
      const node = root.querySelector(selector);
      assert.ok(node, `Missing ${selector}`);
      fire(node, "click");
    },
    toggle(selector, checked) {
      const node = root.querySelector(selector);
      assert.ok(node, `Missing ${selector}`);
      node.checked = checked;
      fire(node, "change");
    },
  };
}
const form = (entries) => {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
};
const section = (h, id) => h.registry.get("campaign-section", id, h.ctx);

// ---------------------------------------------------------------------------------

test("registration: slice seeded and normalized, core Overview and Party replaced, DM-only Table tab", () => {
  const h = harness();
  const slice = h.slice();
  assert.equal(slice.motd.enabled, false, "no message interrupts the Table by default");
  assert.equal(slice.vehicles[0].name.it, "Carro");
  assert.deepEqual(P.normalizeParty(P.normalizeParty(slice)), P.normalizeParty(slice));
  assert.throws(() => P.normalizeParty(slice, 2), /newer version/);
  assert.equal(section(h, "overview").extension, "party");
  assert.equal(section(h, "group").extension, "party");
  assert.equal(h.registry.get("table-panel", "party", h.ctx), null, "players have no party tab");
  h.ctx.role = "dm";
  assert.equal(h.registry.get("table-panel", "party", h.ctx).placement, "sidebar-tab");
  // Bastion tab only from the DM's level (Iria 5, Livia 3).
  h.ctx.role = "player";
  const tab = (id) => h.registry.get("sheet-tab", "party-bastion", h.ctx, h.ctx.state.actors[id]);
  assert.ok(tab("iria"));
  assert.equal(tab("livia"), null);
});

test("party overview values come from the sheets (2024 rules), private sheets stay out", () => {
  const h = harness();
  const ids = (role) => P.partyMembers(h.ctx.state, role).map((a) => a.id);
  assert.deepEqual(ids("player"), ["doran", "livia", "mira"]);
  assert.deepEqual(ids("dm"), ["doran", "livia", "mira"], "the DM never sees the private Iria");
  const livia = P.partyRow(h.ctx.state, h.ctx.state.actors.livia);
  assert.equal(livia.saves.int.value, 5, "Wizard: Int save proficiency (+3 +2)");
  assert.equal(livia.saves.int.proficient, true);
  assert.equal(livia.saves.str.value, 0);
  assert.equal(livia.passives.perception.value, 11);
  assert.equal(livia.passives.investigation.value, 13);
  assert.deepEqual(livia.languages, ["common", "elvish", "draconic"]);
  const doran = P.partyRow(h.ctx.state, h.ctx.state.actors.doran);
  assert.equal(doran.saves.con.value, 4, "Fighter: Con save proficiency");
  const mira = P.partyRow(h.ctx.state, h.ctx.state.actors.mira);
  assert.equal(mira.saves.wis.value, 5, "a recorded save wins");
  // Review: a recorded value keeps the first class's proficiency highlight (Druid: Int, Wis).
  assert.deepEqual(
    P.ABILITIES.filter((a) => mira.saves[a].proficient),
    ["int", "wis"],
  );
  assert.equal(mira.passives.perception.value, 15);
  h.connectIria();
  assert.deepEqual(ids("dm"), ["doran", "iria", "livia", "mira"]);
  const iria = P.partyRow(h.ctx.state, h.ctx.state.actors.iria);
  assert.equal(iria.passives.perception.value, 14, "recorded skill modifier +4");
  assert.equal(iria.passives.investigation.value, 17);
  assert.equal(iria.passives.insight.value, 11);
  assert.equal(iria.languages, null, "no invented languages");
  // A HP change on the sheet shows at once: nothing is copied.
  h.ctx.role = "dm";
  h.ctx.commit("hp", (draft) => {
    draft.actors.livia.hp = 9;
  });
  assert.equal(P.partyRow(h.ctx.state, h.ctx.state.actors.livia).hp, 9);
});

test("overview: the DM hides a player and chooses whether players see the full table", () => {
  const h = harness({ role: "dm" });
  h.ctx.view = { page: "campaign", tab: "group", id: "overview" };
  const render = () => section(h, "group").render(h.ctx);
  let html = render();
  assert.match(plain(html), /Percezione passiva/);
  assert.match(html, /data-party-hide="mira"/);
  let ui = mount(html, section(h, "group").bind, h.ctx);
  ui.click('[data-party-hide="mira"]');
  assert.deepEqual(h.slice().overview.hidden, ["mira"]);
  html = render();
  assert.doesNotMatch(html, /data-party-row="mira"/);
  assert.match(plain(html), /Nascosti dal riepilogo: Mira/);
  assert.match(plain(html), /Annulla: Mira nascosto dal riepilogo/);
  // Undo restores; the player cannot hide anyone.
  ui = mount(html, section(h, "group").bind, h.ctx);
  ui.click("[data-party-undo]");
  assert.deepEqual(h.slice().overview.hidden, []);
  h.ctx.role = "player";
  assert.throws(
    () => P.setHidden(h.ctx.state, h.slice(), "player", { actorId: "mira", hidden: true }),
    /Solo il DM/,
  );
  html = render();
  assert.match(html, /data-party-private-overview/);
  assert.doesNotMatch(html, /Percezione passiva/);
  assert.doesNotMatch(html, /data-party-hide/);
  // FG Party Sheet: the DM shares the summary with the players.
  h.ctx.role = "dm";
  ui = mount(render(), section(h, "group").bind, h.ctx);
  ui.toggle("[data-party-share]", true);
  assert.equal(h.slice().overview.shareWithPlayers, true);
  h.ctx.role = "player";
  html = render();
  assert.match(plain(html), /Percezione passiva/);
  assert.doesNotMatch(html, /data-party-hide/);
  // Sheets are reachable from the overview.
  ui = mount(html, section(h, "group").bind, h.ctx);
  ui.click('[data-party-sheet="livia"]');
  assert.deepEqual(h.sheets.at(-1), { id: "livia", tab: "actions" });
});

test("shared spells: grouped by level, who has prepared what, read-only, private sheets excluded", () => {
  const h = harness();
  let data = P.sharedSpells(h.ctx.state, "player");
  // R4 sample data (27/09/2026): Mira, the Druid, has her prepared spells (Moonbeam at 2nd).
  assert.deepEqual(
    data.levels.map((g) => g.level),
    [0, 1, 2],
  );
  assert.ok(data.levels.flatMap((g) => g.spells).every((s) => !s.shared));
  assert.deepEqual(
    data.without.map((a) => a.id),
    ["doran"],
  );
  h.connectIria();
  data = P.sharedSpells(h.ctx.state, "player");
  const missile = data.levels[1].spells.find((s) => s.key.startsWith("magic-missile"));
  assert.deepEqual(
    missile.casters.map((c) => c.actorId),
    ["iria", "livia"],
  );
  assert.equal(missile.shared, true);
  h.ctx.view = { page: "campaign", tab: "group", id: "spells" };
  const html = section(h, "group").render(h.ctx);
  assert.match(plain(html), /Trucchetti/);
  assert.match(plain(html), /In comune/);
  assert.doesNotMatch(html, /data-character-action|prepare-spell/, "no preparation control here");
  const ui = mount(html, section(h, "group").bind, h.ctx);
  const before = JSON.stringify(h.ctx.state.actors.iria.spells);
  ui.toggle('[data-party-spell-filter="shared"]', true);
  const filtered = plain(section(h, "group").render(h.ctx));
  assert.match(filtered, /Dardo incantato/);
  assert.doesNotMatch(filtered, /Mani brucianti/, "Livia alone: filtered out");
  ui.click('[data-party-sheet="iria"]');
  assert.deepEqual(h.sheets.at(-1), { id: "iria", tab: "spells" });
  assert.equal(JSON.stringify(h.ctx.state.actors.iria.spells), before);
});

test("vehicle: SRD pulling capacity, loading from and unloading to real inventories, seats", () => {
  const h = harness();
  const wagon = () => h.slice().vehicles[0];
  let stats = P.vehicleStats(wagon());
  assert.deepEqual(
    [stats.capacityKg, stats.pullKg, stats.maxCargoKg, stats.cargoKg, stats.speedM],
    [540, 2700, 2500, 80, 12],
  );
  const potions = () =>
    h.ctx.state.actors.livia.inventory.find((i) => i.id === "potion")?.quantity ?? 0;
  const run = (fn) => h.ctx.commit("t", (draft) => fn(draft, P.sliceOf(draft)));
  run((d, s) =>
    P.loadFromInventory(d, s, "player", {
      vehicleId: "wagon",
      actorId: "livia",
      itemId: "potion",
      quantity: 2,
    }),
  );
  assert.equal(potions(), 1);
  const cargo = wagon().cargo.find((c) => c.fromActorId === "livia");
  assert.equal(cargo.quantity, 2);
  assert.equal(P.vehicleStats(wagon()).cargoKg, 80.5);
  assert.throws(
    () =>
      run((d, s) =>
        P.loadFromInventory(d, s, "player", {
          vehicleId: "wagon",
          actorId: "livia",
          itemId: "staff",
          quantity: 1,
        }),
      ),
    /Togli l’oggetto di dosso/,
  );
  assert.throws(
    () =>
      run((d, s) =>
        P.loadFromInventory(d, s, "player", {
          vehicleId: "wagon",
          actorId: "doran",
          itemId: "x",
          quantity: 1,
        }),
      ),
    /non disponibile per te/,
    "the player does not control the DM's Doran",
  );
  run((d, s) =>
    P.unloadToInventory(d, s, "player", {
      vehicleId: "wagon",
      cargoId: cargo.id,
      actorId: "livia",
      quantity: 2,
    }),
  );
  assert.equal(potions(), 3);
  assert.equal(
    wagon().cargo.some((c) => c.id === cargo.id),
    false,
  );
  // Generic goods become a gear row; over capacity is reported, never auto-penalised.
  run((d, s) =>
    P.addGoods(d, s, "player", { vehicleId: "wagon", name: "Pietre", quantity: 1, weightKg: 2500 }),
  );
  stats = P.vehicleStats(wagon());
  assert.equal(stats.over, true);
  assert.equal(stats.speedM, 12, "no automatic speed penalty");
  // Seats and driver.
  assert.throws(
    () =>
      run((d, s) =>
        P.setAboard(d, s, "player", { vehicleId: "wagon", actorId: "livia", role: "driver" }),
      ),
    /già un conducente/,
  );
  run((d, s) =>
    P.setAboard(d, s, "player", { vehicleId: "wagon", actorId: "livia", role: "passenger" }),
  );
  assert.equal(P.vehicleStats(wagon()).aboard, 2);
  assert.throws(
    () =>
      run((d, s) =>
        P.setAboard(d, s, "player", { vehicleId: "wagon", actorId: "doran", role: null }),
      ),
    /solo i tuoi personaggi/,
  );
  // DM edits: weight in the viewer's unit is converted by the UI; DM only; reasons.
  assert.throws(
    () =>
      run((d, s) =>
        P.saveVehicle(d, s, "player", {
          vehicleId: "wagon",
          name: "Carro",
          vehicleWeightKg: 200,
          seats: 4,
          animals: 2,
          animalCapacityKg: 270,
          animalSpeedM: 12,
        }),
      ),
    /Solo il DM/,
  );
  h.ctx.role = "dm";
  run((d, s) =>
    P.saveVehicle(d, s, "dm", {
      vehicleId: "wagon",
      name: "Carro",
      vehicleWeightKg: 200,
      seats: 4,
      animals: 1,
      animalCapacityKg: 270,
      animalSpeedM: 12,
      speedM: "",
    }),
  );
  assert.deepEqual(
    [P.vehicleStats(wagon()).pullKg, P.vehicleStats(wagon()).maxCargoKg],
    [1350, 1150],
  );
  const stones = wagon().cargo.find((c) => c.name.it === "Pietre");
  assert.throws(
    () =>
      run((d, s) =>
        P.removeGoods(d, s, "dm", { vehicleId: "wagon", cargoId: stones.id, reason: "" }),
      ),
    /motivo/,
  );
  run((d, s) =>
    P.removeGoods(d, s, "dm", {
      vehicleId: "wagon",
      cargoId: stones.id,
      reason: "Scaricate al porto",
    }),
  );
  assert.equal(P.vehicleStats(wagon()).over, false);
});

test("vehicle view in English: pounds and feet from canonical kilograms and metres, SRD pages", () => {
  const h = harness({ lang: "en" });
  h.ctx.view = { page: "campaign", tab: "group", id: "vehicles" };
  const html = section(h, "group").render(h.ctx);
  assert.match(plain(html), /160 lb \/ 5000 lb/);
  assert.match(plain(html), /40 ft/);
  assert.match(plain(html), /SRD 5\.2\.1 EN 100 \/ IT 113–114/);
});

test("dashboard: different per role, the DM customises both, hidden sections drop their tiles", () => {
  const h = harness({ role: "dm" });
  h.ctx.view = { page: "campaign", tab: "overview" };
  const overview = section(h, "overview");
  let html = overview.render(h.ctx);
  assert.match(html, /data-party-dashboard="dm"/);
  assert.match(html, /data-party-dash="setup"/);
  assert.match(html, /<h1[^>]*>Panoramica<\/h1>/);
  const order = (s) => [...s.matchAll(/data-party-tile="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(order(html).slice(0, 3), ["party", "next", "bases"]);
  // Setup (Kanka "Dashboard setup"): move the players' "The party" tile up.
  let ui = mount(html, overview.bind, h.ctx);
  ui.click('[data-party-dash="setup"]');
  ui = mount(overview.render(h.ctx), overview.bind, h.ctx);
  ui.click('[data-party-dash-target="player"]');
  html = overview.render(h.ctx);
  assert.match(html, /data-party-setup="player"/);
  ui = mount(html, overview.bind, h.ctx);
  ui.click('[data-party-dash="up"][data-tile="party"]');
  assert.deepEqual(
    h.slice().dashboards.player.map((r) => r.id),
    ["motd", "recap", "party", "next", "revealed", "links"],
  );
  ui = mount(overview.render(h.ctx), overview.bind, h.ctx);
  ui.click('[data-party-dash="width"][data-tile="recap"]');
  assert.equal(h.slice().dashboards.player.find((r) => r.id === "recap").wide, true);
  ui = mount(overview.render(h.ctx), overview.bind, h.ctx);
  ui.click('[data-party-dash="remove"][data-tile="revealed"]');
  assert.equal(
    h.slice().dashboards.player.some((r) => r.id === "revealed"),
    false,
  );
  ui = mount(overview.render(h.ctx), overview.bind, h.ctx);
  ui.click('[data-party-dash="done"]');
  // Players see their own layout, without the setup command.
  h.ctx.role = "player";
  html = overview.render(h.ctx);
  assert.match(html, /data-party-dashboard="player"/);
  assert.doesNotMatch(html, /data-party-dash="setup"/);
  assert.deepEqual(order(html), ["recap", "party", "next", "links"], "empty message tile skipped");
  assert.throws(
    () => P.moveTile(h.ctx.state, h.slice(), "player", { target: "player", id: "party", to: 0 }),
    /Solo il DM/,
  );
  // B20 policy: a section turned off drops its tiles too.
  h.ctx.role = "dm";
  h.ctx.commit("hide", (draft) => {
    draft.ext["campaign-settings"] ??= {};
    draft.ext["campaign-settings"].campaigns ??= {};
    draft.ext["campaign-settings"].campaigns.lanterns = {
      policy: { hiddenSections: ["group", "journal"] },
    };
  });
  h.ctx.role = "player";
  assert.deepEqual(order(overview.render(h.ctx)), ["next", "links"]);
  // Moves persist across a reload; reset restores the default.
  h.reload();
  assert.equal(h.slice().dashboards.player[2].id, "party");
  h.ctx.role = "dm";
  h.ctx.commit("reset", (draft) =>
    P.resetDashboard(draft, P.sliceOf(draft), "dm", { target: "player" }),
  );
  assert.deepEqual(h.slice().dashboards.player, P.DEFAULT_DASHBOARDS.player);
});

test("session-start message: DM writes it, players get it once per version on the Table", () => {
  const h = harness({ role: "dm" });
  const run = (fn) => h.ctx.commit("m", (draft) => fn(draft, P.sliceOf(draft)));
  assert.throws(
    () => run((d, s) => P.setMotd(d, s, "dm", { enabled: true, text: " " })),
    /Scrivi il messaggio/,
  );
  assert.throws(
    () => run((d, s) => P.setMotd(d, s, "player", { enabled: true, text: "x" })),
    /Solo il DM/,
  );
  run((d, s) => P.setMotd(d, s, "dm", { enabled: true, text: "Stasera: la torre." }));
  assert.equal(h.slice().motd.revision, 1);
  assert.equal(P.motdDue(h.ctx.state, h.slice(), "dm", undefined), false, "not for the DM");
  assert.equal(P.motdDue(h.ctx.state, h.slice(), "player", undefined), true);
  assert.equal(P.motdDue(h.ctx.state, h.slice(), "player", 1), false, "seen revision");
  // The dashboard editor goes through the dialog and a commit.
  h.ctx.view = { page: "campaign", tab: "overview" };
  const overview = section(h, "overview");
  const ui = mount(overview.render(h.ctx), overview.bind, h.ctx);
  ui.click("[data-party-motd]");
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.body, /Stasera: la torre\./);
  dialog.options.onSubmit(form([["text", "Si parte all'alba."]]));
  assert.deepEqual(
    [h.slice().motd.enabled, h.slice().motd.text, h.slice().motd.revision],
    [false, "Si parte all'alba.", 2],
  );
  assert.equal(P.motdDue(h.ctx.state, h.slice(), "player", 1), false, "switched off");
  // Shown on entering the Table (the shell's dialog), then not again for this version.
  dialog.options.onSubmit(
    form([
      ["text", "Si parte all'alba."],
      ["enabled", "on"],
    ]),
  );
  h.ctx.role = "player";
  h.ctx.view = { page: "table" };
  const before = h.dialogs.length;
  P.showMotdIfDue(h.ctx);
  assert.equal(h.dialogs.length, before + 1);
  assert.match(h.dialogs.at(-1).body, /Si parte all&#39;alba\.|Si parte all'alba\./);
  P.showMotdIfDue(h.ctx);
  assert.equal(h.dialogs.length, before + 1, "once per version");
  // The player's dashboard keeps it.
  h.ctx.view = { page: "campaign", tab: "overview" };
  assert.match(plain(overview.render(h.ctx)), /Messaggio del DM Si parte all'alba\./);
});

test("bastion UI: order from the sheet tab, DM turn dialog, outcome and potion on the sheet", () => {
  const h = harness();
  h.connectIria();
  const actor = () => h.ctx.state.actors.iria;
  // Iria's coins as B26 records them on the sheet (Inventory › Coins).
  h.ctx.commit("coins", (draft) => {
    draft.actors.iria.currency = { gp: 40 };
  });
  const tab = h.registry.get("sheet-tab", "party-bastion", h.ctx, actor());
  h.ctx.view = { page: "characters", id: "iria", tab: "party-bastion" };
  let html = tab.render(h.ctx, actor());
  assert.match(plain(html), /Faro di Capo Sale/);
  assert.doesNotMatch(html, /data-bastion-private/, "connected: the DM can run its turn");
  let ui = mount(html, tab.bind, h.ctx, actor());
  ui.click('[data-bastion="order"][data-order="distil-healing"]');
  const base = () => h.slice().bastions.bases.find((b) => b.id === "bastion-iria");
  assert.equal(purseOf(actor()).gp, 15, "paid from Iria's purse, not from a second treasury");
  assert.match(plain(tab.render(h.ctx, actor())), /In corso · 1 turno/);
  assert.match(plain(tab.render(h.ctx, actor())), /Monete di Iria 15 mo/);
  assert.doesNotMatch(tab.render(h.ctx, actor()), /data-bastion="treasury"/);
  // The DM advances from Party › Bases with the dialog.
  h.ctx.role = "dm";
  h.ctx.view = { page: "campaign", tab: "group", id: "bases" };
  html = section(h, "group").render(h.ctx);
  assert.match(plain(html), /Avanza il turno delle basi/);
  ui = mount(html, section(h, "group").bind, h.ctx);
  ui.click('[data-bastion="advance"]');
  const dialog = h.dialogs.at(-1);
  assert.match(plain(dialog.body), /Consegna: Pozione di guarigione ×1/);
  const orderId = base().orders[0].id;
  dialog.options.onSubmit(
    form([
      [`deliver-${orderId}`, "on"],
      [`text-${orderId}`, "Ben riuscita."],
    ]),
  );
  assert.equal(h.slice().bastions.turn, 1);
  assert.equal(actor().inventory.find((i) => i.id === "iria-potion").quantity, 2);
  assert.match(h.toasts.at(-1).text, /Turno 1: 1 esiti nel registro/);
  // The outcome reaches the owner's notifications and the sheet log.
  h.ctx.role = "player";
  const notes = h.registry.notifications(h.ctx).filter((n) => n.source === "party-bases");
  assert.equal(notes.length, 1);
  assert.deepEqual(notes[0].target, {
    page: "characters",
    params: { id: "iria", tab: "party-bastion" },
  });
  h.ctx.view = { page: "characters", id: "iria", tab: "party-bastion" };
  assert.match(plain(tab.render(h.ctx, actor())), /Esito · Laboratorio d’erbe.*Ben riuscita\./);
  // Undo (the DM's) reverts the turn and the potion together.
  h.ctx.role = "dm";
  h.ctx.undo();
  assert.equal(h.slice().bastions.turn, 0);
  assert.equal(actor().inventory.find((i) => i.id === "iria-potion").quantity, 1);
});

test("a private bastion is changed as a local, private commit (works offline, hidden audit)", () => {
  const h = harness();
  const actor = h.ctx.state.actors.iria;
  const tab = h.registry.get("sheet-tab", "party-bastion", h.ctx, actor);
  h.ctx.view = { page: "characters", id: "iria", tab: "party-bastion" };
  h.ctx.commit(
    "coins",
    (draft) => {
      draft.actors.iria.currency = { gp: 40 };
    },
    { local: true },
  );
  const html = tab.render(h.ctx, actor);
  assert.match(html, /data-bastion-private/);
  h.ctx.offline = true;
  const ui = mount(html, tab.bind, h.ctx, actor);
  ui.click('[data-bastion="order"][data-order="search-records"]');
  assert.equal(h.toasts.filter((t) => t.error).length, 0);
  const entry = h.store().history.at(-1);
  assert.equal(entry.shared, false);
  assert.equal(purseOf(h.ctx.state.actors.iria).gp, 35);
  // A shared change is refused offline with the shell's message.
  h.ctx.role = "dm";
  h.ctx.view = { page: "campaign", tab: "group", id: "overview" };
  const party = mount(section(h, "group").render(h.ctx), section(h, "group").bind, h.ctx);
  party.click('[data-party-hide="mira"]');
  assert.match(h.toasts.at(-1).text, /senza rete/);
  assert.equal(h.toasts.at(-1).error, true);
});

test("DM Table tab: compact overview with selection on the map and the hidden rule", () => {
  const h = harness({ role: "dm" });
  const panel = h.registry.get("table-panel", "party", h.ctx);
  let html = panel.render(h.ctx);
  assert.match(plain(html), /Livia/);
  assert.match(plain(html), /PP/);
  const selected = [];
  const table = {
    scene: h.ctx.state.scenes[0],
    select: (id) => selected.push(id),
  };
  let ui = mount(html, panel.bind, h.ctx, table);
  ui.click('[data-party-select="livia"]');
  assert.deepEqual(selected, ["livia"]);
  h.connectIria();
  ui = mount(panel.render(h.ctx), panel.bind, h.ctx, table);
  ui.click('[data-party-select="iria"]');
  assert.match(h.toasts.at(-1).text, /non ha una pedina/);
  h.ctx.commit("hide", (d) =>
    P.setHidden(d, P.sliceOf(d), "dm", { actorId: "doran", hidden: true }),
  );
  html = panel.render(h.ctx);
  assert.doesNotMatch(html, /data-party-mini="doran"/);
});

// ------------------------------------------------------------------ review fixes

test("review: the DM's hidden list filters only the DM's overview; players keep every character", () => {
  const h = harness({ role: "dm" });
  h.ctx.view = { page: "campaign", tab: "group", id: "overview" };
  h.ctx.commit("hide", (d) =>
    P.setHidden(d, P.sliceOf(d), "dm", { actorId: "mira", hidden: true }),
  );
  const render = () => section(h, "group").render(h.ctx);
  assert.doesNotMatch(render(), /<tr data-party-row="mira"/, "hidden from the DM's table");
  h.ctx.role = "player";
  assert.match(render(), /data-party-row="mira"/, "the player's own Mira stays in the Party list");
  h.ctx.commit("share", (d) => {
    P.sliceOf(d).overview.shareWithPlayers = true;
  });
  assert.match(render(), /<tr data-party-row="mira"/, "the shared table is not the DM's filter");
});

test("review: companions connected to the campaign stay reachable from the Party page (core list)", () => {
  const h = harness();
  h.ctx.commit("owl", (draft) => {
    draft.actors["livia-owl"] = {
      id: "livia-owl",
      kind: "npc",
      name: "Gufo",
      owner: "player",
      hp: 1,
      maxHp: 1,
      ac: 11,
      campaignIds: ["lanterns"],
      companion: { parentActorId: "livia", lifecycle: "available", kind: "familiar" },
    };
  });
  h.ctx.view = { page: "campaign", tab: "group", id: "overview" };
  const html = section(h, "group").render(h.ctx);
  assert.match(plain(html), /Compagni Gufo · di Livia · 1 \/ 1 PF/);
  assert.doesNotMatch(html, /<tr data-party-row="livia-owl"/, "not a row of the party table");
  const ui = mount(html, section(h, "group").bind, h.ctx);
  ui.click('[data-party-sheet="livia-owl"]');
  assert.deepEqual(h.sheets.at(-1), { id: "livia-owl", tab: "actions" });
  // The Overview's party tile keeps them too, as the core overview did.
  h.ctx.view = { page: "campaign", tab: "overview" };
  const tile = section(h, "overview").render(h.ctx);
  assert.match(plain(tile), /Compagni: Gufo/);
  assert.match(tile, /data-party-sheet="livia-owl"/);
});

test("review: a spell with no recorded preparation reads as not prepared, like the sheet", () => {
  const h = harness();
  h.ctx.commit("spell", (draft) => {
    draft.actors.livia.spells.push({ id: "light-x", name: { it: "Luce", en: "Light" }, level: 1 });
  });
  const light = P.sharedSpells(h.ctx.state, "player")
    .levels.flatMap((g) => g.spells)
    .find((s) => s.key.startsWith("light"));
  assert.equal(light.casters[0].prepared, false);
});

test("review: the vehicle editor uses the viewer's units for speed too (feet in English)", () => {
  const h = harness({ lang: "en", role: "dm" });
  h.ctx.view = { page: "campaign", tab: "group", id: "vehicles" };
  const ui = mount(section(h, "group").render(h.ctx), section(h, "group").bind, h.ctx);
  ui.click('[data-party-vehicle="edit"]');
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.body, /Animal speed \(ft\)<input[^>]*value="40"/);
  assert.doesNotMatch(dialog.body, /\(m\)/);
  dialog.options.onSubmit(
    form([
      ["name", "Wagon"],
      ["vehicleWeight", "400"],
      ["seats", "4"],
      ["animals", "2"],
      ["animalKind", "Draft horse"],
      ["animalCapacity", "540"],
      ["animalSpeedM", "30"],
      ["speedM", ""],
    ]),
  );
  const wagon = h.slice().vehicles[0];
  assert.equal(wagon.animals[0].speedM, 9, "30 ft = 9 m (5 ft = 1.5 m)");
  assert.equal(wagon.animals[0].capacityKg, 270);
});

test("review: the session-start message returns at each login (FG), nothing stored on the device", async () => {
  const saved = new Map();
  globalThis.localStorage = {
    getItem: (k) => saved.get(k) ?? null,
    setItem: (k, v) => saved.set(k, String(v)),
    removeItem: (k) => saved.delete(k),
  };
  try {
    const h = harness({ role: "dm" });
    h.ctx.commit("m", (d) =>
      P.setMotd(d, P.sliceOf(d), "dm", { enabled: true, text: "Si parte all'alba." }),
    );
    h.ctx.role = "player";
    h.ctx.view = { page: "table" };
    const before = h.dialogs.length;
    P.showMotdIfDue(h.ctx);
    P.showMotdIfDue(h.ctx);
    assert.equal(h.dialogs.length, before + 1, "once while the player stays logged in");
    assert.equal(saved.size, 0, "no per-device record");
    // A new login is a fresh load of the app: FG shows the message again.
    const Fresh = await import("../party.mjs?login=2");
    Fresh.showMotdIfDue(h.ctx);
    assert.equal(h.dialogs.length, before + 2);
  } finally {
    delete globalThis.localStorage;
  }
});

test("review: with the Party section turned off (B20) its palette commands are not offered", () => {
  const h = harness({ role: "dm" });
  const ids = () => h.registry.list("command", h.ctx).map((c) => c.id);
  assert.ok(ids().includes("party.overview") && ids().includes("party.bases-turn"));
  h.ctx.commit("off", (draft) => {
    draft.ext["campaign-settings"] ??= {};
    draft.ext["campaign-settings"].campaigns ??= {};
    draft.ext["campaign-settings"].campaigns.lanterns = { policy: { hiddenSections: ["group"] } };
  });
  assert.ok(!ids().includes("party.overview") && !ids().includes("party.bases-turn"));
});
