// B62 part A — where commands live once all 48 areas exist. Market taxonomies copied:
// Foundry's sidebar document tabs (FVT-007) and D&D Beyond Maps panel tabs (DDB-133) for the
// Table sidebar; Kanka module groups (CMP-23) for the campaign rail; Foundry directories /
// Roll20 page toolbar for Preparation; D&D Beyond sheet sections (DDB-027/053) for the sheet;
// Foundry Token HUD (FVT-119) and D&D Beyond's token menu (DDB-117) for the token menu; BG3's
// hotbar (CRP-098/099) for the bottom bar; SRD 5.2.1 "Search [Action]" (EN 187 / IT 212) for
// one Search. Every area is loaded, as in the app; synthetic data only.
import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createStore } from "../state.mjs";
import {
  createRegistry,
  TABLE_SIDEBAR_SECTIONS,
  CAMPAIGN_SECTION_GROUPS,
  PREPARATION_GROUPS,
  SHEET_CATEGORIES,
  TOKEN_MENU_SUBMENUS,
} from "../registry.mjs";
import { loadExtensions } from "../extensions.mjs";
import { esc, icon } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import { applyConditionFollowUps } from "../combat.mjs";
import { renderTable, resetTableView } from "../table.mjs";
import { menuMarkup, resetTokenMenu } from "../token-menu.mjs";
import { campaignGroups, CORE_CAMPAIGN_GROUPS, resetCampaignRail } from "../rail-groups.mjs";
import { prepSectionModel, renderPreparation } from "../preparation.mjs";
import { renderCharacters, sheetCategories } from "../characters.mjs";
import * as RD from "../regions-domain.mjs";
import * as TD from "../travel-domain.mjs";
import * as knowledge from "../knowledge.mjs";

const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};

async function app({ role = "dm", lang = "it" } = {}) {
  resetTokenMenu();
  resetTableView({ forget: true });
  resetCampaignRail({ forget: true });
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  const rows = await loadExtensions(registry);
  assert.deepEqual(
    rows.filter((row) => row.status !== "built").map((row) => `${row.id}: ${row.error}`),
    [],
  );
  await knowledge.neighboursReady;
  const store = createStore({ storage: memory() });
  registry.initState(store.state);
  const dialogs = [];
  const toasts = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    view: { page: "table", id: "", tab: "" },
    t: (it, en) => (ctx.lang === "en" ? en : it),
    label: (v) => (typeof v === "object" && v ? (v[ctx.lang] ?? v.it) : String(v ?? "")),
    esc,
    icon,
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    toast: (text, error = false) => toasts.push({ text, error }),
    render: () => {},
    navigate: () => {},
    dialog: (title, body, options = {}) => dialogs.push({ title, body, options }),
    closeDialog: () => {},
    openSheet: () => {},
    openConditions: () => {},
    commit(label, mutator, options = {}) {
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
        afterCommit: options.afterCommit,
      });
      return { applied: true, persisted: true };
    },
    undo: () => store.undo(ctx.role),
    canUndo: () => store.history.at(-1)?.controller === ctx.role,
    applyConditionFollowUps: (state, result) =>
      applyConditionFollowUps(state, result, { manual: true }),
    registry,
  };
  registry.attach(ctx);
  return { registry, store, ctx, dialogs, toasts };
}
beforeEach(() => resetTableView({ forget: true }));

const ids = (list) => list.map((entry) => entry.id);
const target = (ctx, actorId) => ({
  actorId,
  tokenId:
    ctx.state.scenes
      .find((s) => s.id === ctx.state.activeSceneId)
      ?.tokens.find((t) => t.actorId === actorId)?.id ?? null,
  sceneId: ctx.state.activeSceneId,
});

test("B62 taxonomies: a placement names a known entry; an unknown one is refused", () => {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  const cases = [
    ["table-panel", "section", "journal", { placement: "sidebar-tab" }],
    ["campaign-section", "group", "story", {}],
    ["preparation-section", "group", "materials", {}],
    ["sheet-tab", "category", "extras", {}],
    ["token-menu", "submenu", "look", {}],
  ];
  for (const [point, field, good, extra] of cases) {
    const def = (value, id) => ({
      id,
      label: { it: "Prova", en: "Probe" },
      ...(point === "token-menu" ? { run() {} } : { render: () => "" }),
      ...extra,
      [field]: value,
    });
    const bad = registry.use(`probe-bad-${field}-${point.length}`, (api) =>
      api.add(point, def("nowhere", `probe-bad-${field}-${point.length}`)),
    );
    assert.equal(bad.status, "failed", `${point}.${field} accepted an unknown value`);
    assert.match(bad.error, new RegExp(`${field} must be one of`));
    const ok = registry.use(`probe-ok-${field}-${point.length}`, (api) =>
      api.add(point, def(good, `probe-ok-${field}-${point.length}`)),
    );
    assert.equal(ok.status, "built", `${point}.${field} refused ${good}`);
  }
  // The taxonomies are the market's: Foundry sidebar, Kanka groups, DDB sheet, token HUD.
  // (B62 review: Items before Journal, Foundry's order.)
  assert.deepEqual(ids(TABLE_SIDEBAR_SECTIONS), [
    "creature",
    "chat",
    "combat",
    "scene",
    "exploration",
    "items",
    "journal",
    "tables",
    "reference",
  ]);
  assert.deepEqual(ids(CAMPAIGN_SECTION_GROUPS), ["campaign", "story", "world", "play", "manage"]);
  assert.deepEqual(ids(PREPARATION_GROUPS), ["scenes", "encounters", "materials", "sessions"]);
  assert.deepEqual(ids(SHEET_CATEGORIES), [
    "actions",
    "spells",
    "inventory",
    "features",
    "story",
    "notes",
    "extras",
  ]);
  assert.deepEqual(ids(TOKEN_MENU_SUBMENUS), ["actions", "look", "visibility", "items", "dm"]);
});

test("every area names where its commands live (sidebar tab, rail group, Preparation group, sheet category)", async () => {
  const { registry } = await app();
  const expect = (point, field, map) => {
    for (const [id, value] of Object.entries(map))
      assert.equal(registry.get(point, id)?.[field], value, `${point} ${id}`);
  };
  expect("table-panel", "section", {
    party: "creature",
    "dice-tray": "chat",
    "dice-3d": "chat",
    safety: "chat",
    "combat-tracker": "combat",
    "encounter-builder": "combat",
    "special-moves-rules": "combat",
    "scene-assets-panel": "scene",
    "session-view-controls": "scene",
    "annotations-list": "scene",
    "fog-vision-panel": "scene",
    "world-map-calendar": "exploration",
    travel: "exploration",
    "handouts-panel": "journal",
    "quests-tracker": "journal",
    "media-dock": "journal",
    loot: "items",
    "loot-shop": "items",
    "random-tables": "tables",
    "compendium-screen": "reference",
    assistant: "reference",
  });
  expect("campaign-section", "group", {
    "campaign-members": "manage",
    community: "manage",
    projects: "play",
    quests: "story",
    "quests-archive": "campaign",
    handouts: "world",
    "chat-forum": "story",
    "chat-archive": "story",
    media: "world",
    "world-map": "world",
    loot: "play",
    safety: "play",
    "campaign-settings-rules": "play",
    "campaign-settings-view": "manage",
    "homebrew-editor": "play",
    integrations: "manage",
    "campaign-data": "manage",
    assistant: "manage",
  });
  // P7 (Foundry's scene directory and scene configuration, Roll20's page menu): «Scene
  // avanzate» is no section of its own; folders, archive, objects, levels and variants live
  // in the core scene list and editor of the «Scene» group.
  assert.equal(registry.get("preparation-section", "scene-assets"), null);
  expect("preparation-section", "group", {
    regions: "scenes",
    "special-moves": "scenes",
    "encounter-builder": "encounters",
    handouts: "materials",
    "handouts-session": "sessions",
    "random-tables": "materials",
    loot: "materials",
    "loot-merchants": "materials",
    adventures: "sessions",
  });
  expect("sheet-tab", "category", {
    "home-levelup": "features",
    projects: "extras",
    "projects-track": "features",
    media: "story",
    // P2 PG-43 (D&D Beyond's Notes tab: organizations, allies, enemies…).
    "sheet-plus-notes": "notes",
    "character-library-log": "notes",
    "character-library-revisions": "notes",
    "party-bastion": "extras",
  });
  // No sidebar panel of an area is left without a section (it would add a tab of its own).
  const sectionIds = new Set(ids(TABLE_SIDEBAR_SECTIONS));
  for (const id of [
    "party",
    "dice-tray",
    "safety",
    "combat-tracker",
    "loot",
    "random-tables",
    "assistant",
  ])
    assert.ok(sectionIds.has(registry.get("table-panel", id).section), id);
});

const railTabs = (html) =>
  [
    ...html
      .slice(html.indexOf('<div class="table-tabs"'))
      .matchAll(/role="tab" id="table-tab-([a-z0-9.-]+)"/g),
  ].map((m) => m[1]);

test("Table sidebar: nine DM tabs and eight player tabs; the panels of a tab are its sub-tabs", async () => {
  const dm = await app({ role: "dm" });
  const dmHtml = renderTable(dm.ctx);
  assert.deepEqual(railTabs(dmHtml), [
    "creature",
    "chat",
    "combat",
    "scene",
    "exploration",
    "items",
    "journal",
    "tables",
    "reference",
  ]);
  // Closed sections keep a hidden handle per area panel, so `[data-table-drawer="<id>"]`
  // still opens it (area code and HUD buttons press it).
  const index = dmHtml.slice(dmHtml.indexOf('<div class="table-panel-index" hidden>'));
  for (const id of ["dice-tray", "encounter-builder", "loot", "random-tables", "compendium-screen"])
    assert.match(
      index,
      new RegExp(`data-table-drawer="${id}" data-table-section-of="[a-z]+" aria-expanded="false"`),
      id,
    );
  // The Creature tab holds the party summary as its second sub-tab (DM).
  assert.match(
    dmHtml,
    /<div class="table-subtabs" role="tablist" aria-label="Creatura">[^]*data-table-subtab="creature"[^]*data-table-subtab="party" data-table-drawer="party" data-table-tab="party"/,
  );
  const player = await app({ role: "player" });
  const playerHtml = renderTable(player.ctx);
  assert.deepEqual(railTabs(playerHtml), [
    "creature",
    "chat",
    "combat",
    "scene",
    "exploration",
    "journal",
    "tables",
    // Final review X-07: the compendium browser (Foundry's sidebar compendium) for everyone.
    "reference",
  ]);
  assert.doesNotMatch(playerHtml, /data-table-drawer="encounter-builder"/, "DM panel hidden");
});

test("opening a panel opens its tab with its sub-tabs; the log badge and handles stay", async () => {
  const { ctx } = await app({ role: "player" });
  globalThis.localStorage = memory();
  try {
    globalThis.localStorage.setItem(
      "d20-studio-table-sidebar",
      JSON.stringify({ player: { tab: "dice-tray" } }),
    );
    resetTableView();
    const html = renderTable(ctx);
    assert.match(html, /data-table-section="chat" data-table-tab="chat"[^>]*aria-selected="true"/);
    const sub = html.slice(html.indexOf('<div class="table-subtabs"'));
    assert.match(sub, /^<div class="table-subtabs" role="tablist" aria-label="Chat">/);
    assert.match(sub, /data-table-subtab="log" data-table-tab="log" aria-selected="false"/);
    assert.match(
      sub,
      /data-table-subtab="dice-tray" data-table-drawer="dice-tray" data-table-tab="dice-tray" aria-selected="true"/,
    );
    assert.match(sub, /data-table-subtab="safety" data-table-drawer="safety"/);
    assert.match(html, /data-table-panel="dice-tray" data-table-section="chat"/);
    assert.match(html, /id="table-drawer"[^]*<h2 id="table-drawer-title">Dadi<\/h2>/);
    // The open section's panels are sub-tabs, so the hidden index does not repeat them.
    const index = html.slice(html.indexOf('<div class="table-panel-index" hidden>'));
    assert.doesNotMatch(index.slice(0, index.indexOf("</div>")), /data-table-drawer="dice-tray"/);
    // A hidden section leaves the rail but stays reachable (All panels, index handles).
    globalThis.localStorage.setItem(
      "d20-studio-table-sidebar",
      JSON.stringify({ player: { tab: "creature", hidden: ["tables"] } }),
    );
    resetTableView();
    const hidden = renderTable(ctx);
    assert.ok(!railTabs(hidden).includes("tables"));
    assert.match(hidden, /class="table-panel-index" hidden>[^]*data-table-drawer="random-tables"/);
  } finally {
    delete globalThis.localStorage;
    resetTableView();
  }
});

test("one BG3 hotbar: identity and resources, action pages, turn commands; no second bar", async () => {
  const { ctx } = await app({ role: "player" });
  const html = renderTable(ctx);
  assert.equal(html.match(/class="combat-bar"/g)?.length, 1);
  assert.equal(html.match(/<div class="action-dock/g)?.length, 1);
  const hotbar = html.slice(html.indexOf('<div class="action-dock table-hotbar'));
  const identity = hotbar.indexOf('class="hotbar-identity"');
  const pages = hotbar.indexOf('class="hotbar-pages" role="tablist"');
  const actions = hotbar.indexOf('id="hotbar-panel-actions"');
  const quick = hotbar.indexOf('id="hotbar-panel-quickbar"');
  const commands = hotbar.indexOf('<div class="toolbar">');
  assert.ok(identity > 0 && identity < pages && pages < actions && actions < quick);
  assert.ok(quick < commands, "the turn commands close the bar");
  assert.match(hotbar, /id="hotbar-panel-actions"[^>]*role="tabpanel"[^>]*>/);
  assert.match(hotbar, /id="hotbar-panel-quickbar"[^>]*hidden>/, "the quick bar is page two");
  assert.match(hotbar, /data-hotbar-page="actions" aria-selected="true"/);
  assert.match(hotbar, /data-hotbar-page="quickbar" aria-selected="false"/);
  // Nothing of the bar is outside it (the combat bar used to be a row of its own).
  assert.equal(html.indexOf('class="combat-bar"') > html.indexOf("table-hotbar"), true);
});

test("token menu: at most twelve top-level commands; the rest in labelled submenus with shortcuts", async () => {
  const dm = await app({ role: "dm" });
  const top = (html) =>
    html.slice(html.indexOf('<ul class="token-menu-list"')).match(/role="menuitem"/g)?.length ?? 0;
  const goblin = menuMarkup(dm.ctx, { ...target(dm.ctx, "goblin-1"), view: "main", hp: null });
  assert.ok(top(goblin) <= 12, `DM goblin: ${top(goblin)}`);
  for (const category of ["actions", "look", "visibility", "dm"])
    assert.match(goblin, new RegExp(`data-token-menu-category="${category}"[^>]*aria-haspopup`));
  // A single-command group is not a submenu: the command is on top.
  assert.match(goblin, /data-token-menu-item="loot-open"/);
  assert.doesNotMatch(goblin, /data-token-menu-category="items"/);
  // Shortcuts are kept in the submenus.
  const tools = menuMarkup(dm.ctx, { ...target(dm.ctx, "goblin-1"), view: "cat:dm", hp: null });
  assert.match(tools, /data-token-menu-back/);
  assert.match(tools, /id="token-menu-subtitle">Strumenti DM</);
  for (const [id, key] of [
    ["token-menu-lock", "Maiusc\\+L"],
    ["token-menu-copy", "Ctrl\\+C|Cmd\\+C"],
    ["token-menu-remove", "Canc|Delete"],
  ])
    assert.match(tools, new RegExp(`data-token-menu-item="${id}"[^]*?<kbd>(${key})</kbd>`), id);
  const player = await app({ role: "player" });
  const livia = menuMarkup(player.ctx, { ...target(player.ctx, "livia"), view: "main", hp: null });
  assert.ok(top(livia) <= 12, `player Livia: ${top(livia)}`);
  // The player's last submenu is "More", not "DM tools".
  const more = menuMarkup(player.ctx, { ...target(player.ctx, "livia"), view: "main" });
  assert.doesNotMatch(more, />Strumenti DM</);
});

test("one Search: the token menu and the Creature tab offer «Cerca» once; B41/B45 buttons give way", async () => {
  const player = await app({ role: "player" });
  const menu = menuMarkup(player.ctx, {
    ...target(player.ctx, "livia"),
    view: "main",
    hp: null,
  });
  assert.equal(menu.match(/class="token-menu-label">Cerca</g)?.length, 1);
  assert.doesNotMatch(menu, /Cerca trappole/);
  const html = renderTable(player.ctx);
  const creature = html.slice(html.indexOf('id="table-sidebar-panel"'));
  assert.equal(
    creature.slice(0, creature.indexOf('<div class="table-sidebar-rail">')).match(/>Cerca</g)
      ?.length,
    1,
  );
  assert.doesNotMatch(html, /data-regions-search=|data-travel-search=/);
});

test("one Search roll finds hidden creatures, traps and search points with the same total", async () => {
  const { ctx, store, dialogs, toasts, registry } = await app({ role: "player" });
  const s = store.state;
  const scene = s.scenes.find((x) => x.id === s.activeSceneId);
  const trap = RD.regionsIn(s, scene.id).find((r) => r.trap && !r.status.discovered);
  assert.ok(trap, "the courtyard has a hidden trap");
  const at = RD.center(trap.shape);
  // Livia stands on the trap and the DM hid a search point beside her (fixture setup).
  store.commit(
    "fixture",
    (d) => {
      Object.assign(
        d.scenes.find((x) => x.id === scene.id).tokens.find((t) => t.actorId === "livia"),
        at,
      );
      const slice = d.ext[TD.ID];
      slice.points ??= {};
      (slice.points[scene.id] ??= []).push({
        id: "point-probe",
        kind: "object",
        name: { it: "Anello nascosto", en: "Hidden ring" },
        x: at.x,
        y: at.y,
        dc: 12,
        found: false,
        items: [],
      });
      // An open crate in plain sight beside her: found already, so never news.
      slice.points[scene.id].push({
        id: "point-open",
        kind: "container",
        name: { it: "Cassa aperta", en: "Open crate" },
        x: at.x,
        y: at.y,
        dc: null,
        found: true,
        items: [],
      });
    },
    "dm",
    { shared: true },
  );
  const logBefore = store.state.log.length;
  const knowledgeRolls = () => store.state.ext["knowledge-rolls"]?.rolls?.length ?? 0;
  const before = knowledgeRolls();
  registry.run(
    registry.get("token-menu", "knowledge-search", ctx, target(ctx, "livia")),
    ctx,
    target(ctx, "livia"),
  );
  const dialog = dialogs.at(-1);
  assert.match(dialog.title, /^Cerca · Livia/);
  assert.match(dialog.body, /data-knowledge-search-covers>Un solo tiro trova/);
  assert.match(dialog.body, /trappole nascoste entro 3 m/);
  const form = new Map([
    ["diceMode", "physical"],
    ["face0", "20"],
  ]);
  dialog.options.onSubmit(form);
  // One roll, one log line: the same total reached the trap and the search point.
  assert.equal(knowledgeRolls(), before + 1);
  assert.equal(store.state.log.length, logBefore + 1);
  assert.equal(RD.regionOf(store.state, trap.id).status.discovered, true);
  const check = RD.sliceOf(store.state).checks.at(-1);
  assert.equal(check.kind, "search");
  assert.ok(check.sharedFrom, "the trap check points at the Search roll");
  assert.deepEqual(RD.rollsOf(store.state).rolls.find((r) => r.id === check.rollId).values, [20]);
  const point = TD.pointsOf(store.state.ext[TD.ID], scene.id).find((p) => p.id === "point-probe");
  assert.equal(point.found, true);
  assert.match(toasts.at(-1).text, /Trovato: .*Anello nascosto/);
  assert.doesNotMatch(toasts.at(-1).text, /Cassa aperta/);
  // The shared roll never spends an action twice: outside combat nothing was spent.
  assert.equal(store.state.actors.livia.action, true);
});

test("searchForTrapsWithRoll and searchPointsWithRoll compare the given total, never roll", async () => {
  const { store } = await app({ role: "player" });
  const s = structuredClone(store.state);
  const scene = s.scenes.find((x) => x.id === s.activeSceneId);
  const trap = RD.regionsIn(s, scene.id).find((r) => r.trap && !r.status.discovered);
  Object.assign(
    scene.tokens.find((t) => t.actorId === "livia"),
    RD.center(trap.shape),
  );
  const low = RD.searchForTrapsWithRoll(
    s,
    {
      actorId: "livia",
      roll: {
        id: "r-low",
        mode: "digital",
        values: [1],
        natural: 1,
        modifier: 1,
        total: 2,
        rollMode: "normal",
      },
    },
    "player",
  );
  assert.deepEqual(low.found, []);
  assert.ok(low.examined.includes(trap.id));
  const high = RD.searchForTrapsWithRoll(
    s,
    {
      actorId: "livia",
      roll: {
        id: "r-high",
        mode: "physical",
        values: [19],
        natural: 19,
        modifier: 1,
        total: 20,
        rollMode: "normal",
      },
    },
    "player",
  );
  assert.deepEqual(high.found, [trap.id]);
  assert.equal(high.mode, "physical");
  assert.throws(
    () =>
      RD.searchForTrapsWithRoll(
        s,
        { actorId: "goblin-1", roll: { id: "x", values: [10], total: 10 } },
        "player",
      ),
    /control/i,
  );
  // Search points: exploration only (B45's own rule).
  s.combat.active = true;
  assert.equal(
    TD.searchPointsWithRoll(
      s,
      s.ext[TD.ID],
      { id: "s1", actorId: "livia", roll: { id: "r", values: [20], total: 21 } },
      "player",
    ),
    null,
  );
});

test("campaign rail: five Kanka groups, the most used open, the open section's group always open", async () => {
  for (const role of ["dm", "player"]) {
    const { registry, ctx } = await app({ role });
    const core = Object.entries(CORE_CAMPAIGN_GROUPS).map(([id, group]) => ({
      id,
      group,
      it: id,
      en: id,
      roles: ["preparation", "settings"].includes(id) ? ["dm"] : undefined,
    }));
    const items = registry.merge("campaign-section", core, ctx);
    const groups = campaignGroups(items, { role, active: "overview", open: {} });
    assert.deepEqual(ids(groups), ["campaign", "story", "world", "play", "manage"]);
    assert.deepEqual(
      groups.filter((g) => g.open).map((g) => g.id),
      ["campaign"],
    );
    const first = ids(groups[0].items);
    assert.ok(first.length >= 5 && first.length <= 7, `${role}: ${first.length}`);
    assert.equal(first.includes("preparation"), role === "dm");
    // Every section appears once, nothing lost.
    const all = groups.flatMap((g) => ids(g.items));
    assert.equal(new Set(all).size, all.length);
    assert.equal(all.length, items.length);
    // The group holding the open section opens; a remembered state is kept.
    const story = campaignGroups(items, { role, active: "quests", open: { world: true } });
    assert.deepEqual(
      story.filter((g) => g.open).map((g) => g.id),
      ["campaign", "story", "world"],
    );
    assert.equal(
      groups.find((g) => g.id === "manage").label.it,
      role === "dm" ? "Gestione DM" : "Strumenti",
    );
  }
});

test("Preparation: four groups in a first strip, the open group's sections in a second", async () => {
  const { ctx } = await app({ role: "dm" });
  ctx.view = { page: "preparation", id: "", tab: "loot" };
  const model = prepSectionModel(ctx);
  assert.deepEqual(
    model.groups.map((g) => [g.id, g.sections.map((s) => s.id)]),
    [
      // P7: «Scene avanzate» (scene-assets) folded into the core scene list and editor.
      ["scenes", ["scenes", "regions", "special-moves"]],
      ["encounters", ["encounter-builder"]],
      ["materials", ["handouts", "random-tables", "loot", "loot-merchants"]],
      ["sessions", ["handouts-session", "adventures"]],
    ],
  );
  const html = renderPreparation(ctx);
  assert.match(html, /<nav class="tabs prep-groups"/);
  assert.match(html, /class="active" data-prep-group="materials" aria-current="page"/);
  // A group of one section is that section's own handle.
  assert.match(html, /data-prep-group="encounters" data-prep-section="encounter-builder"/);
  const sub = html.slice(html.indexOf('<nav class="prep-sections is-sub"'));
  assert.match(sub, /data-prep-section="handouts"/);
  assert.match(sub, /class="active" data-prep-section="loot" aria-current="page"/);
  assert.doesNotMatch(sub.slice(0, sub.indexOf("</nav>")), /data-prep-section="regions"/);
  // The «Scene» group opens on the core scene list with the areas' scene sections beside it.
  ctx.view = { page: "preparation", id: "", tab: "" };
  const scenes = renderPreparation(ctx);
  assert.match(scenes, /class="active" data-prep-group="scenes" aria-current="page"/);
  const strip = scenes.slice(scenes.indexOf('<nav class="prep-sections is-sub"'));
  assert.deepEqual(
    [...strip.slice(0, strip.indexOf("</nav>")).matchAll(/data-prep-section="([a-z-]+)"/g)].map(
      (m) => m[1],
    ),
    ["scenes", "regions", "special-moves"],
  );
});

test("sheet: D&D Beyond's seven sections; area tabs are sub-sections of their category", async () => {
  const { ctx, registry } = await app({ role: "player" });
  ctx.view = { page: "characters", id: "livia", tab: "media" };
  const actor = ctx.state.actors.livia;
  const coreTabs = ["actions", "inventory", "spells", "features", "story", "extras"].map((id) => ({
    id,
    names: [id, id],
  }));
  const categories = sheetCategories(ctx, registry.merge("sheet-tab", coreTabs, ctx, actor));
  assert.deepEqual(ids(categories), [
    "actions",
    "spells",
    "inventory",
    "features",
    "story",
    "notes",
    "extras",
  ]);
  const members = Object.fromEntries(categories.map((c) => [c.id, ids(c.members)]));
  assert.deepEqual(members.story, ["story", "media"]);
  // P2 PG-43: D&D Beyond's Notes tab opens on the section notes (organizations, allies,
  // enemies…), before the adventure log and the revisions.
  assert.deepEqual(members.notes, [
    "sheet-plus-notes",
    "character-library-log",
    "character-library-revisions",
  ]);
  assert.ok(members.extras.includes("projects"));
  assert.ok(members.features.includes("projects-track"));
  const html = renderCharacters(ctx);
  assert.equal(
    html.match(/<nav class="tabs character-tabs"[^]*?<\/nav>/)[0].match(/data-character-tab=/g)
      .length,
    7,
  );
  assert.match(html, /class="active" data-character-tab="story" aria-current="page"/);
  assert.match(
    html,
    /<nav class="character-subtabs" aria-label="Storia"><button type="button" class="" data-character-subtab="story">/,
  );
  assert.match(html, /class="active" data-character-subtab="media" data-character-tab="media"/);
});

// Review of the browser runs: the hotbar must keep one height whatever creature is selected
// (a taller bar under a scrolled page moved the turn order between the two clicks of a
// double-click), and the Table must fit 1440 × 900 in combat; B40's «Mosse» keeps its label
// and sticky end on a phone inside the merged bar; a rail group folds without a re-render.
test("hotbar geometry: two rows of actions at most, End turn spans the commands, combat fits", () => {
  const css = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const styles = css("styles.css");
  const desk = styles.slice(
    styles.indexOf("@media (min-width: 721px) {\n  .table-hotbar .combat-actions"),
  );
  assert.match(
    desk,
    /\.table-hotbar \.combat-actions \{[^}]*max-height: calc\(2 \* 44px[^}]*overflow-y: auto;/,
  );
  assert.match(
    styles,
    /\.action-dock\.table-hotbar > \.toolbar > \[data-table="end-turn"\] \{\s*grid-column: 4;\s*grid-row: 1 \/ span 2;/,
  );
  assert.match(
    css("combat.css"),
    /\.table-layout:has\(> \.initiative\) \.table-stage \{\s*height: clamp\(360px, calc\(100dvh - 390px\), 680px\);/,
  );
  // Phone: the dock rules that hide words and reposition buttons apply to the commands only.
  assert.doesNotMatch(styles, /^\s*\.action-dock \.button:has\(\.dock-text\) \{/m);
  assert.match(
    styles,
    /\.action-dock > \.toolbar \.button:has\(\.dock-text\) \{\s*position: relative;/,
  );
  // The rail group toggle folds in place (an unsaved draft on the page survives).
  const app = css("app.mjs");
  const toggle = app.slice(app.indexOf('querySelectorAll("[data-campaign-group-toggle]")'));
  const handler = toggle.slice(0, toggle.indexOf("}),"));
  assert.match(handler, /items\.hidden = !open/);
  assert.doesNotMatch(handler, /render\(\)/);
});
