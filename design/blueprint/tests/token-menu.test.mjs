// B12: token menu, selection and visibility. Domain rules and the same handlers the menu
// runs, against the real store, registry, conditions and preparation commands.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { esc, icon } from "../ui.mjs";
import { createRegistry } from "../registry.mjs";
import { canControlActor } from "../character-access.mjs";
import { applyConditionFollowUps } from "../combat.mjs";
import { getConditionOverview, hasCondition } from "../conditions.mjs";
import { renderTable, resetTableView } from "../table.mjs";
import { renderCharacters } from "../characters.mjs";
import {
  register,
  resetTokenMenu,
  parseHpInput,
  hpSelection,
  applyHp,
  toggleCondition,
  observesToken,
  seesAsAudience,
  setVisibility,
  visibilityMode,
  partyCharacters,
  groupTokens,
  ungroupTokens,
  expandGroups,
  setLocked,
  isLocked,
  copyTokens,
  pasteTokens,
  copyName,
  tokensInBox,
  renameCreature,
  restoreName,
  setNameHidden,
  trueNameOf,
  normalizeSlice,
  seedSlice,
  displaySize,
  setSize,
  setRing,
  menuMarkup,
  conditionPalette,
  pickedActors,
  clipboardSize,
  TOKEN_SIZES,
  RING_COLOURS,
  applyHpMany,
  toggleConditionMany,
  rotateTokens,
  rotationOf,
  normalRotation,
  removeTokens,
  viewAround,
  nameAlias,
  nameProjections,
  projectNames,
  aliasNumber,
  lockBlocksMovement,
  stepHpInput,
  hiddenName,
  activateMenuItem,
  openMenu,
  menuState,
} from "../token-menu.mjs";

const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
  };
};
const L = (it, en) => ({ it, en });

// A host like app.mjs: real store commits, Undo, registry with the area loaded.
function makeApp({ role = "dm", lang = "it", extra = [] } = {}) {
  resetTokenMenu();
  resetTableView();
  const storage = memory();
  const store = createStore({ storage });
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  registry.use("token-menu", register);
  for (const [id, fn] of extra) registry.use(id, fn);
  registry.initState(store.state);
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
    dialog: () => {},
    closeDialog: () => {},
    openSheet: () => {},
    openConditions: () => {},
    commit(label, mutator, options = {}) {
      if (ctx.offline && !options.local)
        throw Object.assign(Error("offline"), {
          it: "Sei senza rete: questa modifica condivisa non può essere applicata.",
          en: "You are offline: this shared change cannot be applied.",
        });
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
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
  return { store, registry, ctx, toasts, storage };
}
const target = (ctx, actorId) => ({
  actorId,
  tokenId: ctx.state.scenes[0].tokens.find((t) => t.actorId === actorId)?.id ?? null,
  sceneId: ctx.state.activeSceneId,
});
const run = (app, itemId, actorId) => {
  const t = target(app.ctx, actorId);
  const item = app.registry.get("token-menu", itemId, app.ctx, t);
  assert.ok(item, `${itemId} visible for ${app.ctx.role} on ${actorId}`);
  return item.run(app.ctx, t);
};
const slice = (app) => app.store.state.ext["token-menu"];
const token = (app, actorId) => app.store.state.scenes[0].tokens.find((t) => t.actorId === actorId);
// The area's style text is HTML-escaped inside the SVG (the parser decodes it): decode here.
const decode = (html) =>
  html.replace(
    /&(quot|gt|lt|#39|amp);/g,
    (m, k) => ({ quot: '"', gt: ">", lt: "<", "#39": "'", amp: "&" })[k],
  );
const tableAs = (app, role) => {
  app.ctx.role = role;
  resetTableView();
  return decode(renderTable(app.ctx));
};

test("the area registers its menu items, layers, tool, panel, slice and hotkeys", () => {
  const { registry, ctx, store } = makeApp();
  const row = registry.extensions().find((r) => r.id === "token-menu");
  assert.equal(row.status, "built");
  assert.deepEqual(store.state.ext["token-menu"], seedSlice());
  const dm = registry.list("token-menu", ctx, target(ctx, "goblin-1")).map((c) => c.id);
  assert.deepEqual(dm, [
    // Close review 01/10 TV-150 (Foundry Target): in the «Azioni» submenu, key T.
    "token-menu-target",
    "token-menu-conditions",
    "token-menu-sheet",
    "token-menu-center",
    "token-menu-pick",
    // R3 PG-79: «Trasforma…» (dnd5e Transform) on any creature for the DM.
    "token-menu-transform",
    "token-menu-hide",
    "token-menu-audience",
    "token-menu-rename",
    "token-menu-hide-name",
    // Close review 01/10 TV-152 (Foundry bars, Roll20 three bars).
    "token-menu-bars",
    "token-menu-ring",
    "token-menu-size",
    "token-menu-rotate",
    "token-menu-lock",
    "token-menu-copy",
    "token-menu-remove",
  ]);
  ctx.role = "player";
  // A player observing a DM creature: only what an observer may do.
  assert.deepEqual(
    registry.list("token-menu", ctx, target(ctx, "goblin-1")).map((c) => c.id),
    ["token-menu-target", "token-menu-center", "token-menu-pick"],
  );
  // Own character: HP-bearing commands but no DM-only ones, and no copying of a PC.
  assert.deepEqual(
    registry.list("token-menu", ctx, target(ctx, "livia")).map((c) => c.id),
    [
      "token-menu-target",
      "token-menu-conditions",
      "token-menu-sheet",
      "token-menu-center",
      "token-menu-pick",
      "token-menu-transform",
      "token-menu-bars",
      "token-menu-ring",
      "token-menu-size",
      "token-menu-rotate",
    ],
  );
  const commands = registry.list("command", { ...ctx, role: "dm" });
  const shortcuts = Object.fromEntries(
    commands.filter((c) => c.extension === "token-menu").map((c) => [c.id, c.shortcut]),
  );
  assert.deepEqual(shortcuts, {
    "token-menu.hide": "Shift+H",
    "token-menu.lock": "Shift+L",
    "token-menu.group": "Shift+G",
    "token-menu.select-tool": "V",
    "token-menu.open": "Shift+F10",
    // P6: zoom keys (TV-05); Find my token (TV-26), the scene list (TV-106) and Add a
    // creature (TV-21) are found by their words in the search.
    "token-menu.zoom-in": "+",
    "token-menu.zoom-out": "-",
    "token-menu.find-mine": null,
    "token-menu.scenes": null,
    "token-menu.add-creature": null,
    // R3 PG-79: transformations, found by «metamorfosi», «trasforma», «forma originale».
    "token-menu.polymorph": null,
    "token-menu.transform": null,
    "token-menu.revert-form": null,
    // Close review 01/10 TV-150 (Foundry: T targets, Shift+T adds).
    "token-menu.target": "T",
    "token-menu.target-add": "Shift+T",
  });
  assert.deepEqual(
    registry.conflicts().filter((c) => c.dropped.startsWith("token-menu")),
    [],
  );
  assert.ok(registry.get("table-tool", "token-menu-select"));
  assert.ok(registry.get("table-panel", "token-menu-panel"));
  assert.ok(registry.get("map-layer", "token-menu-marks"));
  assert.ok(registry.get("map-layer", "token-menu-ghosts").interactive);
});

test("items registered by other areas appear in the same labelled menu, in order", () => {
  const other = (api) =>
    api.add("token-menu", {
      id: "loot-probe",
      label: L("Saccheggia", "Loot"),
      order: 45,
      group: "loot",
      when: (ctx, t) => ctx.state.actors[t.actorId]?.kind === "npc",
      run: () => {},
    });
  const app = makeApp({ extra: [["loot-probe", other]] });
  const html = menuMarkup(app.ctx, {
    actorId: "goblin-1",
    sceneId: "old-watch",
    view: "main",
    hp: null,
  });
  const labels = [...html.matchAll(/class="token-menu-label">([^<]+)</g)].map((m) => m[1]);
  assert.ok(labels.indexOf("Saccheggia") > labels.indexOf("Aggiungi alla selezione"));
  // B62: the DM's visibility commands sit in the labelled «Visibilità» submenu, after the
  // direct commands (Foundry Token HUD, D&D Beyond token menu).
  assert.ok(labels.indexOf("Saccheggia") < labels.indexOf("Visibilità"));
  assert.match(html, /data-token-menu-item="loot-probe"/);
  // Header: HP field for a controller, labelled shortcuts, separators between groups.
  assert.match(html, /id="token-menu-hp-input"[^>]*value="7"/);
  assert.match(html, /role="separator"/);
  assert.match(html, /role="menu" aria-label="Comandi della pedina"/);
  const visibility = menuMarkup(app.ctx, {
    actorId: "goblin-1",
    sceneId: "old-watch",
    view: "cat:visibility",
    hp: null,
  });
  assert.match(visibility, /Nascondi ai giocatori[^]*?<kbd>Maiusc\+H<\/kbd>/);
  assert.match(visibility, /data-token-menu-back/);
  // Livia's menu has no loot command: the other area's `when` still applies.
  const livia = menuMarkup(app.ctx, { actorId: "livia", sceneId: "old-watch", view: "main" });
  assert.doesNotMatch(livia, /loot-probe/);
  // With a bound Table the menu uses its B11 API (table.menuTarget / table.tokenMenu).
  const calls = [];
  const table = {
    scene: app.ctx.state.scenes[0],
    menuTarget: (actorId) => (calls.push(["target", actorId]), target(app.ctx, actorId)),
    tokenMenu: (actorId) => (
      calls.push(["menu", actorId]),
      app.registry.list("token-menu", app.ctx, target(app.ctx, actorId))
    ),
  };
  const none = { querySelector: () => null, querySelectorAll: () => [] };
  app.registry.get("table-panel", "token-menu-panel").bind(none, app.ctx, table);
  assert.match(
    menuMarkup(app.ctx, { actorId: "goblin-1", sceneId: "old-watch", view: "main" }),
    /data-token-menu-item="loot-probe"/,
  );
  assert.deepEqual(calls, [
    ["target", "goblin-1"],
    ["menu", "goblin-1"],
  ]);
  resetTokenMenu();
  // English labels and shortcuts.
  app.ctx.lang = "en";
  const en = menuMarkup(app.ctx, { actorId: "goblin-1", sceneId: "old-watch", view: "main" });
  assert.match(en, />Visibility</);
  assert.match(en, />Loot</);
  // B62: the «Visibility» submenu keeps the command and its shortcut.
  const enVisibility = menuMarkup(app.ctx, {
    actorId: "goblin-1",
    sceneId: "old-watch",
    view: "cat:visibility",
  });
  assert.match(enVisibility, />Hide from players</);
  assert.match(enVisibility, /<kbd>Shift\+H<\/kbd>/);
  // The player observing the goblin gets no HP field and no sheet data.
  app.ctx.role = "player";
  app.ctx.lang = "it";
  const observed = menuMarkup(app.ctx, { actorId: "goblin-1", sceneId: "old-watch", view: "main" });
  assert.doesNotMatch(observed, /token-menu-hp-input/);
  assert.match(observed, /Controllata dal DM/);
});

test("HP arithmetic: -5, +3, =12 and a plain number; invalid values are explained", () => {
  assert.deepEqual(parseHpInput("-5"), { op: "damage", amount: 5, text: "-5" });
  assert.deepEqual(parseHpInput(" + 3 "), { op: "heal", amount: 3, text: "+3" });
  assert.deepEqual(parseHpInput("=12"), { op: "set", amount: 12, text: "=12" });
  assert.deepEqual(parseHpInput("12"), { op: "set", amount: 12, text: "12" });
  assert.deepEqual(parseHpInput("−4"), { op: "damage", amount: 4, text: "-4" });
  for (const bad of ["abc", "5.5", "--2", "+-3", "=", "12a"])
    assert.throws(
      () => parseHpInput(bad),
      (e) => e.code === "hp-format" && /-5/.test(e.it),
    );
  assert.throws(
    () => parseHpInput(""),
    (e) => e.code === "hp-empty",
  );
  assert.throws(
    () => parseHpInput("+0"),
    (e) => e.code === "hp-zero-change",
  );
  const actor = { hp: 7, maxHp: 7 };
  assert.throws(
    () => hpSelection(parseHpInput("+2"), actor, "r"),
    (e) => e.code === "hp-full",
  );
  assert.throws(
    () => hpSelection(parseHpInput("=7"), actor, "r"),
    (e) => e.code === "hp-same",
  );
  assert.throws(
    () => hpSelection(parseHpInput("=0"), actor, "r"),
    (e) => e.code === "hp-set-zero" && e.it.includes("-7"),
  );
  assert.deepEqual(hpSelection(parseHpInput("=3"), actor, "r").patch, { hp: 3 });
});

test("the HP field updates sheet, token and log through the conditions domain; Undo restores", () => {
  const app = makeApp();
  const { ctx, store } = app;
  assert.deepEqual(applyHp(ctx, "livia", "-5"), { before: 18, after: 13, op: "damage" });
  assert.equal(store.state.actors.livia.hp, 13);
  assert.match(store.state.log.at(-1).label, /^Livia: danno 5 \(menu della pedina\)$/);
  assert.equal(store.state.log.at(-1).visibility, "shared");
  assert.deepEqual(applyHp(ctx, "livia", "+3"), { before: 13, after: 16, op: "heal" });
  assert.deepEqual(applyHp(ctx, "livia", "=12"), { before: 16, after: 12, op: "set" });
  // The correction is recorded by the conditions domain with this app's manual source.
  const event = store.state.conditionEvents.at(-1);
  assert.equal(event.kind, "vitality-correct");
  assert.equal(event.source.revision, "token-menu-1");
  assert.match(event.reason, /=12/);
  // Sheet and Table read the same actor.
  ctx.view = { page: "characters", id: "livia", tab: "actions" };
  assert.match(renderCharacters(ctx), /12/);
  ctx.view = { page: "table", id: "", tab: "" };
  assert.match(tableAs(app, "player"), /aria-label="Livia, 12 punti ferita/);
  ctx.role = "dm";
  // Invalid and refused values change nothing.
  const before = JSON.stringify(store.state.actors.livia);
  assert.throws(
    () => applyHp(ctx, "livia", "abc"),
    (e) => e.code === "hp-format",
  );
  assert.throws(
    () => applyHp(ctx, "livia", "=0"),
    (e) => e.code === "hp-set-zero",
  );
  assert.equal(JSON.stringify(store.state.actors.livia), before);
  // Undo restores step by step.
  ctx.undo();
  assert.equal(store.state.actors.livia.hp, 16);
  ctx.undo();
  assert.equal(store.state.actors.livia.hp, 13);
  // Damage to 0 goes through the 0-HP rules (death saves for a character).
  applyHp(ctx, "livia", "-13");
  assert.equal(store.state.actors.livia.hp, 0);
  assert.equal(hasCondition(store.state.actors.livia, "unconscious"), true);
  // A player cannot change a DM creature's HP.
  ctx.role = "player";
  assert.throws(() => applyHp(ctx, "goblin-1", "-2"));
  // Offline: the shared change is refused with its message.
  ctx.role = "dm";
  ctx.offline = true;
  assert.throws(
    () => applyHp(ctx, "goblin-1", "-2"),
    (e) => /senza rete/.test(e.it),
  );
  assert.equal(store.state.actors["goblin-1"].hp, 7);
});

test("conditions toggled from the menu are the sheet's conditions (DDB-145)", () => {
  const app = makeApp();
  const { ctx, store } = app;
  assert.equal(toggleCondition(ctx, "goblin-1", "poisoned"), true);
  assert.equal(hasCondition(store.state.actors["goblin-1"], "poisoned"), true);
  const overview = getConditionOverview(store.state, "goblin-1", "dm");
  assert.deepEqual(
    overview.active.map((g) => g.id),
    ["poisoned"],
  );
  assert.match(store.state.log.at(-1).label, /Sentinella: condizione Avvelenato/);
  // Menu header and palette show it; the token gets its status icon.
  const html = menuMarkup(ctx, { actorId: "goblin-1", sceneId: "old-watch", view: "conditions" });
  assert.match(html, /data-token-menu-condition="poisoned"[^>]*|aria-checked="true"/);
  assert.match(
    html,
    /aria-checked="true" class="token-menu-toggle" data-token-menu-condition="poisoned"/,
  );
  assert.match(tableAs(app, "dm"), /data-token-menu-icon="poisoned"/);
  // The player observing the goblin sees the same public icon.
  assert.match(tableAs(app, "player"), /data-token-menu-icon="poisoned"/);
  ctx.role = "dm";
  // Paralyzed implies Incapacitated: shown as implied, not separately endable.
  toggleCondition(ctx, "goblin-1", "paralyzed");
  const palette = conditionPalette(store.state, "goblin-1", "dm");
  const incapacitated = palette.rows.find((r) => r.id === "incapacitated");
  assert.equal(incapacitated.implied, true);
  assert.equal(incapacitated.active, true);
  // Toggling again ends every visible application with a reason.
  assert.equal(toggleCondition(ctx, "goblin-1", "poisoned"), false);
  assert.equal(hasCondition(store.state.actors["goblin-1"], "poisoned"), false);
  assert.equal(store.state.conditionEvents.at(-1).reason, "Dal menu della pedina");
  ctx.undo();
  assert.equal(hasCondition(store.state.actors["goblin-1"], "poisoned"), true);
  // A player toggles a condition on their own character only.
  ctx.role = "player";
  toggleCondition(ctx, "livia", "prone");
  assert.equal(hasCondition(store.state.actors.livia, "prone"), true);
  assert.throws(() => toggleCondition(ctx, "goblin-1", "prone"));
});

test("hide and reveal: players lose token and turn-order row, the DM sees it faded", () => {
  const app = makeApp();
  const { ctx, store } = app;
  store.state.combat.active = true;
  run(app, "token-menu-hide", "goblin-2");
  assert.equal(token(app, "goblin-2").hidden, true);
  assert.equal(visibilityMode(slice(app), token(app, "goblin-2")), "dm");
  // DM-only audit label: the players' log does not learn about it.
  assert.equal(store.state.log.at(-1).visibility, "private");
  const player = tableAs(app, "player");
  assert.doesNotMatch(player, /data-actor="goblin-2"/);
  assert.doesNotMatch(player, /data-select="goblin-2"/);
  assert.doesNotMatch(player, /Esploratore/);
  const dm = tableAs(app, "dm");
  assert.match(dm, /data-actor="goblin-2"/);
  assert.match(dm, /data-select="goblin-2"/);
  assert.match(
    dm,
    /\.map-token\[data-actor="goblin-2"\] > \.token-display\{filter:grayscale\(1\);opacity:\.5\}/,
  );
  assert.match(dm, /hidden-badge/);
  // Reload keeps it (serialized state), Reveal brings it back.
  const reloaded = createStore({ storage: app.storage });
  assert.equal(reloaded.state.scenes[0].tokens.find((t) => t.actorId === "goblin-2").hidden, true);
  run(app, "token-menu-hide", "goblin-2");
  assert.equal(token(app, "goblin-2").hidden, false);
  assert.match(tableAs(app, "player"), /data-actor="goblin-2"/);
  ctx.role = "dm";
  ctx.undo();
  assert.equal(token(app, "goblin-2").hidden, true);
  // The player never controls hide/reveal.
  ctx.role = "player";
  assert.equal(
    app.registry.get("token-menu", "token-menu-hide", ctx, target(ctx, "goblin-1")),
    null,
  );
  assert.throws(
    () => setVisibility(store.state, slice(app), ["token-goblin-1"], "dm", [], "player"),
    (e) => e.code === "dm-only",
  );
});

test("per-player visibility: visible only to Livia, Doran's player does not see it (VTL-143)", () => {
  const app = makeApp();
  const { ctx, store } = app;
  assert.deepEqual(
    partyCharacters(store.state).map((a) => a.id),
    ["livia", "doran", "mira"],
  );
  ctx.commit("audience", (draft) =>
    setVisibility(draft, draft.ext["token-menu"], ["token-goblin-1"], "some", ["livia"], "dm"),
  );
  const s = slice(app);
  const t1 = token(app, "goblin-1");
  assert.equal(t1.hidden, true);
  assert.equal(visibilityMode(s, t1), "some");
  // Livia's player sees a local copy; the core token stays hidden for every other reader.
  assert.equal(seesAsAudience(store.state, s, t1, "player"), true);
  assert.equal(observesToken(store.state, t1, "player"), false);
  const player = tableAs(app, "player");
  assert.match(
    player,
    /data-token-menu-ghost="goblin-1"[^>]*aria-label="Sentinella, visibile solo a te e al DM"/,
  );
  assert.doesNotMatch(player, /data-actor="goblin-1"/);
  // Doran's player: a viewer who controls Doran and not Livia sees nothing.
  const state = structuredClone(store.state);
  state.actors.doran.owner = "doran-player";
  state.campaign.members = [
    { id: "player", name: "Livia", role: "player" },
    { id: "doran-player", name: "Doran", role: "player" },
    { id: "dm", name: "DM", role: "dm" },
  ];
  assert.equal(seesAsAudience(state, s, t1, "doran-player"), false);
  assert.equal(observesToken(state, t1, "doran-player"), false);
  assert.equal(seesAsAudience(state, s, t1, "player"), true);
  // The DM sees the real token, faded, with who can see it.
  const dm = tableAs(app, "dm");
  assert.match(dm, /data-actor="goblin-1"/);
  assert.match(dm, /class="token-menu-caption"[^>]*>solo Livia</);
  assert.doesNotMatch(dm, /data-token-menu-ghost/);
  // Only Doran: the player (Livia, Mira) does not see it.
  ctx.commit("audience", (draft) =>
    setVisibility(draft, draft.ext["token-menu"], ["token-goblin-1"], "some", ["doran"], "dm"),
  );
  assert.doesNotMatch(tableAs(app, "player"), /goblin-1/);
  // An empty audience is refused.
  assert.throws(
    () => setVisibility(store.state, slice(app), ["token-goblin-1"], "some", [], "dm"),
    (e) => e.code === "audience-empty",
  );
  // "All" clears the audience.
  ctx.role = "dm";
  ctx.commit("all", (draft) =>
    setVisibility(draft, draft.ext["token-menu"], ["token-goblin-1"], "all", [], "dm"),
  );
  assert.equal(token(app, "goblin-1").hidden, false);
  assert.equal(slice(app).tokens["token-goblin-1"], undefined);
});

test("box and Shift selection, group, lock, copy and paste give independent sheets", () => {
  const app = makeApp();
  const { ctx, store } = app;
  // A first paste makes a third NPC (the demo has two).
  run(app, "token-menu-copy", "goblin-1");
  assert.equal(clipboardSize(), 1);
  const [third] = (() => {
    const t = target(ctx, "goblin-1");
    return app.registry.get("token-menu", "token-menu-paste", ctx, t).run(ctx, t) ?? pickedActors();
  })();
  assert.equal(store.state.actors[third].name, "Sentinella B");
  assert.equal(copyName(store.state, "Sentinella B"), "Sentinella C");
  // Box select around the goblins, then Shift adds the third.
  const scene = store.state.scenes[0];
  // The copy landed one cell right of the Sentinel (DDB pastes beside the source).
  assert.deepEqual(
    [token(app, third).x, token(app, third).y],
    [token(app, "goblin-1").x + 50, token(app, "goblin-1").y],
  );
  const inside = tokensInBox(store.state, slice(app), { x1: 600, y1: 230, x2: 760, y2: 360 }, "dm");
  assert.deepEqual(inside.sort(), ["goblin-1", "goblin-2", third].sort());
  assert.deepEqual(
    tokensInBox(store.state, slice(app), { x1: 760, y1: 360, x2: 600, y2: 300 }, "dm"),
    ["goblin-2"],
  );
  // Pasted copies come out selected (DDB); start a new selection from scratch.
  assert.deepEqual(pickedActors(), [third]);
  run(app, "token-menu-pick", third);
  assert.deepEqual(pickedActors(), []);
  run(app, "token-menu-pick", "goblin-1");
  run(app, "token-menu-pick", "goblin-2");
  run(app, "token-menu-pick", third);
  assert.deepEqual(pickedActors().sort(), ["goblin-1", "goblin-2", third].sort());
  // Group (Shift+G) and lock (Shift+L) apply to the whole selection.
  run(app, "token-menu-group", "goblin-1");
  const members = expandGroups(slice(app), ["token-goblin-1"]);
  assert.equal(members.length, 3);
  run(app, "token-menu-lock", "goblin-2");
  for (const id of members) assert.equal(isLocked(slice(app), id), true);
  // Copy and paste the group: three new creatures, grouped, unlocked, independent.
  run(app, "token-menu-copy", "goblin-1");
  assert.equal(clipboardSize(), 3);
  const t = target(ctx, "goblin-1");
  const created = app.registry.get("token-menu", "token-menu-paste", ctx, t).run(ctx, t);
  assert.equal(created.length, 3);
  const names = created.map((id) => store.state.actors[id].name).sort();
  assert.deepEqual(names, ["Esploratore B", "Sentinella C", "Sentinella D"]);
  const copies = created.map((id) => scene.tokens.find((x) => x.actorId === id) ?? token(app, id));
  assert.equal(new Set(copies.map((c) => expandGroups(slice(app), [c.id]).length)).size, 1);
  assert.equal(expandGroups(slice(app), [copies[0].id]).length, 3);
  for (const c of copies) assert.equal(isLocked(slice(app), c.id), false);
  // Independent sheets: damage to a copy leaves the original untouched.
  const copyOfSentinel = created.find((id) => store.state.actors[id].name === "Sentinella C");
  applyHp(ctx, copyOfSentinel, "-4");
  assert.equal(store.state.actors[copyOfSentinel].hp, 3);
  assert.equal(store.state.actors["goblin-1"].hp, 7);
  assert.notEqual(store.state.actors[copyOfSentinel], store.state.actors["goblin-1"]);
  // Undo removes the damage, then the pasted copies.
  ctx.undo();
  ctx.undo();
  for (const id of created) assert.equal(store.state.actors[id], undefined);
  // Characters are never copied; ungroup removes the group.
  assert.throws(
    () => copyTokens(store.state, slice(app), ["token-livia"], "dm"),
    (e) => e.code === "copy-none",
  );
  ctx.commit("ungroup", (draft) =>
    ungroupTokens(draft.ext["token-menu"], ["token-goblin-1"], "dm"),
  );
  assert.equal(expandGroups(slice(app), ["token-goblin-1"]).length, 1);
  assert.throws(
    () => groupTokens(slice(app), "old-watch", ["token-goblin-1"], "dm"),
    (e) => e.code === "group-size",
  );
  assert.throws(
    () => setLocked(slice(app), ["token-goblin-1"], true, "player"),
    (e) => e.code === "dm-only",
  );
});

test("rename with revert and hidden names never reach the players (SVC-167)", () => {
  const app = makeApp();
  const { ctx, store } = app;
  ctx.commit("rename", (d) =>
    renameCreature(d, d.ext["token-menu"], "goblin-1", "Capo goblin", "dm"),
  );
  assert.equal(store.state.actors["goblin-1"].name, "Capo goblin");
  assert.equal(slice(app).names["goblin-1"].original, "Sentinella");
  assert.throws(
    () => renameCreature(store.state, slice(app), "goblin-1", "x".repeat(129), "dm"),
    (e) => e.code === "name-length",
  );
  ctx.commit("restore", (d) => restoreName(d, d.ext["token-menu"], "goblin-1", "dm"));
  assert.equal(store.state.actors["goblin-1"].name, "Sentinella");
  assert.equal(slice(app).names["goblin-1"], undefined);
  // Hide the name: players read a neutral alias everywhere, the DM keeps the real one.
  run(app, "token-menu-hide-name", "goblin-1");
  assert.equal(store.state.actors["goblin-1"].name, "Creatura sconosciuta 1");
  assert.equal(trueNameOf(store.state, slice(app), "goblin-1"), "Sentinella");
  assert.equal(store.state.log.at(-1).visibility, "private");
  const player = tableAs(app, "player");
  assert.match(player, /aria-label="Creatura sconosciuta 1"/);
  assert.doesNotMatch(player, /Sentinella/);
  const dm = tableAs(app, "dm");
  assert.match(dm, /class="token-menu-caption"[^>]*>Sentinella</);
  // Every other DM screen gets "alias · real name" from the name projection (below).
  assert.deepEqual(
    nameProjections(store.state, "dm", "it").map(({ from, to }) => [from, to]),
    [
      ["Creatura sconosciuta 1", "Creatura sconosciuta 1 · Sentinella"],
      ["Unknown creature 1", "Creatura sconosciuta 1 · Sentinella"],
    ],
  );
  // A hostile name cannot break out of the style element (escaped for SVG foreign content).
  ctx.commit("rename", (d) =>
    renameCreature(d, d.ext["token-menu"], "goblin-1", 'Vedetta</style><b>"x"', "dm"),
  );
  const raw = (() => {
    ctx.role = "dm";
    resetTableView();
    return renderTable(ctx);
  })();
  assert.doesNotMatch(raw, /<\/style><b>/);
  assert.match(raw, /Vedetta&lt;\/style&gt;&lt;b&gt;/);
  ctx.commit("rename", (d) =>
    renameCreature(d, d.ext["token-menu"], "goblin-1", "Sentinella", "dm"),
  );
  const header = menuMarkup(ctx, { actorId: "goblin-1", sceneId: "old-watch", view: "main" });
  assert.match(
    header,
    /Sentinella <small class="token-menu-alias">i giocatori vedono «Creatura sconosciuta 1»/,
  );
  // Renaming while hidden changes the real name only.
  ctx.commit("rename", (d) => renameCreature(d, d.ext["token-menu"], "goblin-1", "Vedetta", "dm"));
  assert.equal(store.state.actors["goblin-1"].name, "Creatura sconosciuta 1");
  run(app, "token-menu-hide-name", "goblin-1");
  assert.equal(store.state.actors["goblin-1"].name, "Vedetta");
  // Only DM creatures.
  assert.throws(
    () => setNameHidden(store.state, slice(app), "livia", true, "dm"),
    (e) => e.code === "npc-only",
  );
});

test("border colour, token size and the per-token marks drawn on the map", () => {
  const app = makeApp();
  const { ctx, store } = app;
  assert.equal(RING_COLOURS.length, 12);
  assert.deepEqual(
    TOKEN_SIZES.map(([id]) => id),
    ["tiny", "small", "medium", "large", "huge", "gargantuan"],
  );
  assert.equal(displaySize(store.state, slice(app), token(app, "goblin-1")), "small");
  ctx.commit("look", (d) => {
    setRing(d.ext["token-menu"], ["token-goblin-1"], "red");
    setSize(d.ext["token-menu"], ["token-goblin-1"], "large");
  });
  const dm = tableAs(app, "dm");
  assert.match(dm, /data-actor="goblin-1"\] \.token-display > circle:first-child\{stroke:#e0625c/);
  assert.match(dm, /data-actor="goblin-1"\] > \.token-display\{scale:2\}/);
  assert.throws(() => setRing(slice(app), ["token-goblin-1"], "chartreuse"));
  // The marks never draw anything for a token the viewer cannot see.
  ctx.role = "dm";
  run(app, "token-menu-hide", "goblin-1");
  const player = tableAs(app, "player");
  assert.doesNotMatch(player, /goblin-1/);
});

test("the slice survives reload and repairs malformed data", () => {
  assert.deepEqual(normalizeSlice(null), seedSlice());
  const fixed = normalizeSlice({
    tokens: { a: { locked: true, ring: "nope", size: "large", audience: ["livia", 3] }, b: {} },
    groups: {
      g: { sceneId: "old-watch", tokenIds: ["a"] },
      h: { sceneId: "s", tokenIds: ["a", "b"] },
    },
    names: { x: { hidden: true }, y: { original: "Sentinella" } },
  });
  assert.deepEqual(fixed, {
    tokens: { a: { locked: true, size: "large", audience: ["livia"] } },
    groups: { h: { sceneId: "s", tokenIds: ["a", "b"] } },
    names: { y: { original: "Sentinella" } },
  });
  const app = makeApp();
  run(app, "token-menu-lock", "goblin-1");
  const reloaded = createStore({ storage: app.storage });
  assert.equal(reloaded.state.ext["token-menu"].tokens["token-goblin-1"].locked, true);
});

// ---------------------------------------------------------------- review fixes (B12)

test("the quick HP field never stands in for healing or a resurrection (SRD EN 17 / IT 19)", () => {
  const app = makeApp({ role: "player" });
  const { ctx, store } = app;
  const livia = () => store.state.actors.livia;
  applyHp(ctx, "livia", "-18");
  assert.equal(livia().hp, 0);
  assert.equal(hasCondition(livia(), "unconscious"), true);
  // "=5" or "5" at 0 HP would leave Unconscious with HP: refused, with the way to heal.
  for (const raw of ["=5", "5"])
    assert.throws(
      () => applyHp(ctx, "livia", raw),
      (e) => e.code === "hp-zero-set" && e.it.includes("+5") && e.fullPanel === true,
    );
  assert.equal(livia().hp, 0);
  // Healing ends Unconscious (the 0-HP rules of the conditions domain).
  applyHp(ctx, "livia", "+5");
  assert.equal(livia().hp, 5);
  assert.equal(hasCondition(livia(), "unconscious"), false);
  // Above the maximum: an explicit limit, not "no valid correction".
  assert.throws(
    () => applyHp(ctx, "livia", "=50"),
    (e) => e.code === "hp-over-max" && e.it.includes("22"),
  );
  // Dead: neither a set nor healing brings the creature back from the menu.
  ctx.role = "dm";
  applyHp(ctx, "goblin-1", "-100");
  assert.equal(store.state.actors["goblin-1"].dead, true);
  assert.throws(
    () => applyHp(ctx, "goblin-1", "=5"),
    (e) => e.code === "hp-dead" && e.fullPanel === true,
  );
  assert.throws(() => applyHp(ctx, "goblin-1", "+5"));
  assert.equal(store.state.actors["goblin-1"].hp, 0);
  assert.equal(store.state.actors["goblin-1"].dead, true);
});

test("with several tokens selected, HP and conditions reach every controlled token", () => {
  const app = makeApp();
  const { ctx, store } = app;
  run(app, "token-menu-pick", "goblin-1");
  run(app, "token-menu-pick", "goblin-2");
  assert.deepEqual(pickedActors().sort(), ["goblin-1", "goblin-2"]);
  // The header says which commands apply to all; those items carry "×2" (B62: in the
  // «Visibilità» submenu, where the DM's hide and rename commands live).
  const html = menuMarkup(ctx, {
    actorId: "goblin-2",
    sceneId: "old-watch",
    view: "cat:visibility",
  });
  assert.match(
    html,
    /2 pedine selezionate: PF e voci con ×2 valgono per tutte quelle che controlli/,
  );
  assert.match(html, /data-token-menu-item="token-menu-hide"[^]*?token-menu-many[^>]*>×2</);
  assert.doesNotMatch(
    html.match(/data-token-menu-item="token-menu-rename"[^]*?<\/button>/)[0],
    /token-menu-many/,
  );
  // The fireball case: -3 on the group damages both, in one record and one Undo.
  const before = store.state.log.length;
  const result = applyHpMany(ctx, ["goblin-2", "goblin-1"], "-3");
  assert.deepEqual(
    result.changes.map((c) => [c.actorId, c.before, c.after]),
    [
      ["goblin-2", 9, 6],
      ["goblin-1", 7, 4],
    ],
  );
  assert.equal(store.state.log.length, before + 1);
  assert.equal(
    store.state.log.at(-1).label,
    "Danno 3 (menu della pedina): Esploratore, Sentinella",
  );
  ctx.undo();
  assert.deepEqual([store.state.actors["goblin-2"].hp, store.state.actors["goblin-1"].hp], [9, 7]);
  // A creature the value cannot apply to is named and left out; the others change.
  const healed = applyHpMany(ctx, ["goblin-1", "goblin-2"], "=8");
  assert.deepEqual(
    healed.changes.map((c) => c.actorId),
    ["goblin-2"],
  );
  assert.match(healed.skipped[0].reason, /massimo è 7/);
  // A hidden creature's change stays in a DM-only record, the visible one is shared.
  ctx.commit("hide", (d) =>
    setVisibility(d, d.ext["token-menu"], ["token-goblin-1"], "dm", [], "dm"),
  );
  applyHpMany(ctx, ["goblin-2", "goblin-1"], "-1");
  const [shared, hidden] = store.state.log.slice(-2);
  assert.deepEqual(
    [shared.label, shared.visibility],
    ["Esploratore: danno 1 (menu della pedina)", "shared"],
  );
  assert.deepEqual(
    [hidden.label, hidden.visibility],
    ["Sentinella: danno 1 (menu della pedina)", "private"],
  );
  // Conditions: the clicked token decides; Prone goes on both, then ends on both.
  const applied = toggleConditionMany(ctx, ["goblin-2", "goblin-1"], "prone", "goblin-2");
  assert.equal(applied.applied, true);
  for (const id of ["goblin-1", "goblin-2"])
    assert.equal(hasCondition(store.state.actors[id], "prone"), true);
  const ended = toggleConditionMany(ctx, ["goblin-2", "goblin-1"], "prone", "goblin-2");
  assert.equal(ended.applied, false);
  for (const id of ["goblin-1", "goblin-2"])
    assert.equal(hasCondition(store.state.actors[id], "prone"), false);
});

test("scene menu, remove from the scene and rotation (R20-129, DDB-117, FVT-200)", () => {
  const app = makeApp();
  const { ctx, store } = app;
  // The empty-map menu lists Paste only as a command; opening it changes nothing.
  run(app, "token-menu-copy", "goblin-1");
  const actors = Object.keys(store.state.actors).length;
  const scene = menuMarkup(ctx, {
    kind: "scene",
    sceneId: "old-watch",
    doorId: null,
    view: "main",
    point: { x: 850, y: 180 },
  });
  assert.match(scene, /data-token-menu-scene="paste"[^>]*>[^]*?Incolla qui \(1\)/);
  assert.match(scene, /data-token-menu-scene="select-all"/);
  assert.match(scene, /data-token-menu-scene="fit"/);
  assert.equal(Object.keys(store.state.actors).length, actors);
  ctx.role = "player";
  assert.doesNotMatch(
    menuMarkup(ctx, { kind: "scene", sceneId: "old-watch", view: "main" }),
    /data-token-menu-scene="paste"/,
  );
  ctx.role = "dm";
  // Remove from the scene: the sheet stays, the area's marks go, Undo restores.
  ctx.commit("look", (d) => {
    setRing(d.ext["token-menu"], ["token-goblin-2"], "red");
    groupTokens(d.ext["token-menu"], "old-watch", ["token-goblin-1", "token-goblin-2"], "dm", "g1");
  });
  run(app, "token-menu-remove", "goblin-2");
  assert.equal(token(app, "goblin-2"), undefined);
  assert.equal(store.state.actors["goblin-2"].name, "Esploratore");
  assert.equal(slice(app).tokens["token-goblin-2"], undefined);
  assert.deepEqual(slice(app).groups, {});
  assert.match(store.state.log.at(-1).label, /^Tolte dalla scena: Esploratore$/);
  ctx.undo();
  assert.ok(token(app, "goblin-2"));
  assert.equal(slice(app).tokens["token-goblin-2"].ring, "red");
  // Not while the creature is in a running turn order; never for a player.
  const busy = structuredClone(store.state);
  busy.combat = { ...busy.combat, active: true, order: ["goblin-2"] };
  assert.throws(
    () => removeTokens(busy, busy.ext["token-menu"], ["token-goblin-2"], "dm"),
    (e) => e.code === "remove-in-combat" && e.it.includes("Esploratore"),
  );
  assert.throws(
    () => removeTokens(store.state, slice(app), ["token-goblin-2"], "player"),
    (e) => e.code === "dm-only",
  );
  // Rotation: 45° steps, normalized, drawn as a turned portrait plus a facing arrow.
  ctx.commit("turn", (d) => rotateTokens(d.ext["token-menu"], ["token-goblin-1"], { delta: -45 }));
  assert.equal(rotationOf(slice(app), "token-goblin-1"), 315);
  assert.equal(normalRotation(370), 15);
  const dm = tableAs(app, "dm");
  assert.match(
    dm,
    /data-actor="goblin-1"\] > \.token-display > circle:first-child,[^{]*\{rotate:315deg\}/,
  );
  assert.match(dm, /class="token-menu-facing"[^>]*transform="rotate\(315\)"/);
  // The player sees the same facing on the goblin it observes.
  assert.match(tableAs(app, "player"), /class="token-menu-facing"/);
  ctx.role = "dm";
  ctx.commit("reset", (d) =>
    rotateTokens(d.ext["token-menu"], ["token-goblin-1"], { absolute: 0 }),
  );
  assert.equal(slice(app).tokens["token-goblin-1"], undefined);
  assert.deepEqual(normalizeSlice({ tokens: { a: { rotation: 100 } } }).tokens, {
    a: { rotation: 105 },
  });
});

test("pinch keeps the scene point under the fingers (TV-06, TouchVTT FVT-200)", () => {
  const scene = { width: 1000, height: 650 };
  // A 390 × 460 map: the whole scene fits the width (scale 0.39), centred vertically.
  const rect = { left: 0, top: 100, width: 390, height: 460 };
  const k1 = 390 / 1000;
  const anchor = { x: 500, y: 325 };
  const client = { x: 195, y: 100 + (460 - 650 * k1) / 2 + 325 * k1 };
  // Zoom 1 around the centre: the view is the whole scene.
  const same = viewAround(scene, rect, 1, anchor, client);
  assert.ok(Math.abs(same.pan.x) < 1e-9 && Math.abs(same.pan.y) < 1e-9);
  // Fingers spread ×2 and move 40 px right: the anchor follows the midpoint.
  const zoomed = viewAround(scene, rect, 2, anchor, { x: client.x + 40, y: client.y });
  assert.equal(zoomed.zoom, 2);
  const w = 1000 / 2,
    h = 650 / 2,
    k = Math.min(390 / w, 460 / h);
  const offY = (460 - h * k) / 2;
  assert.ok(Math.abs(zoomed.pan.x + (client.x + 40 - 0) / k - anchor.x) < 1e-9);
  assert.ok(Math.abs(zoomed.pan.y + (client.y - 100 - offY) / k - anchor.y) < 1e-9);
  // Zoom follows the Table's own bounds.
  assert.equal(viewAround(scene, rect, 9, anchor, client).zoom, 3);
  assert.equal(viewAround(scene, rect, 0.1, anchor, client).zoom, 0.6);
});

test("hidden names: aliases per language, the DM keeps the real name (SVC-167)", () => {
  const app = makeApp();
  const { ctx, store } = app;
  run(app, "token-menu-hide-name", "goblin-1");
  assert.equal(store.state.actors["goblin-1"].name, "Creatura sconosciuta 1");
  // A second alias hidden in English never takes a number already used in Italian.
  ctx.lang = "en";
  run(app, "token-menu-hide-name", "goblin-2");
  assert.equal(store.state.actors["goblin-2"].name, "Unknown creature 2");
  assert.equal(nameAlias(store.state, "it"), "Creatura sconosciuta 3");
  assert.equal(aliasNumber("Unknown creature 12"), 12);
  // A player reads each alias in their own language; the DM also reads the real name.
  const it = nameProjections(store.state, "player", "it");
  assert.equal(
    projectNames("Unknown creature 2 attacca Creatura sconosciuta 1", it),
    "Creatura sconosciuta 2 attacca Creatura sconosciuta 1",
  );
  const en = nameProjections(store.state, "player", "en");
  assert.equal(projectNames("Creatura sconosciuta 1: danno 5", en), "Unknown creature 1: danno 5");
  assert.doesNotMatch(JSON.stringify(en.map((p) => p.to)), /Sentinella|Esploratore/);
  const dm = nameProjections(store.state, "dm", "it");
  const once = projectNames("Creatura sconosciuta 1 · Unknown creature 2", dm);
  assert.equal(once, "Creatura sconosciuta 1 · Sentinella · Creatura sconosciuta 2 · Esploratore");
  // Idempotent: projecting twice changes nothing; "1" never rewrites the start of "12".
  assert.equal(projectNames(once, dm), once);
  assert.equal(projectNames("Creatura sconosciuta 12", dm), "Creatura sconosciuta 12");
  // Two copies of the same creature stay distinguishable for the DM.
  ctx.lang = "it";
  run(app, "token-menu-copy", "goblin-1");
  const t = target(ctx, "goblin-1");
  const [copyId] = app.registry.get("token-menu", "token-menu-paste", ctx, t).run(ctx, t);
  const names = nameProjections(store.state, "dm", "it")
    .filter((p) => p.from.startsWith("Creatura"))
    .map((p) => p.to)
    .sort();
  assert.deepEqual(names, [
    "Creatura sconosciuta 1 · Sentinella",
    "Creatura sconosciuta 2 · Esploratore",
    "Creatura sconosciuta 3 · Sentinella B",
  ]);
  assert.equal(slice(app).names[copyId].trueName, "Sentinella B");
});

test("a lock set by the DM is shown to the token's controller with its own message", () => {
  const app = makeApp();
  const { ctx } = app;
  run(app, "token-menu-lock", "livia");
  ctx.role = "player";
  const html = menuMarkup(ctx, { actorId: "livia", sceneId: "old-watch", view: "main" });
  assert.match(html, /Bloccata dal DM/);
  const player = tableAs(app, "player");
  assert.match(player, /class="token-menu-badge"[^>]*><title>Bloccata dal DM<\/title>/);
  // A player observing a locked DM creature learns nothing about it.
  ctx.role = "dm";
  run(app, "token-menu-lock", "goblin-1");
  ctx.role = "player";
  const observed = menuMarkup(ctx, { actorId: "goblin-1", sceneId: "old-watch", view: "main" });
  assert.doesNotMatch(observed, /Bloccata/);
  assert.doesNotMatch(
    tableAs(app, "player").match(/data-token-menu-deco="goblin-1"[^]*?<\/g><\/g>/)?.[0] ?? "",
    /Bloccata/,
  );
});

// ---------------------------------------------------------------- second review (B12)

test("a lock also refuses Plan path: every Table tool that moves the token (TV-20)", () => {
  const app = makeApp();
  const { store } = app;
  run(app, "token-menu-lock", "livia");
  for (const mode of ["move", "plan"])
    assert.equal(lockBlocksMovement(store.state, "livia", mode), true, mode);
  // Measuring, panning, the pointer and area tools never move the token.
  for (const mode of ["measure", "pan", "pointer", "token-menu-select"])
    assert.equal(lockBlocksMovement(store.state, "livia", mode), false, mode);
  assert.equal(lockBlocksMovement(store.state, "doran", "plan"), false);
  run(app, "token-menu-lock", "livia");
  assert.equal(lockBlocksMovement(store.state, "livia", "plan"), false);
});

test("the menu's Undo only follows a change the command itself committed", () => {
  const app = makeApp();
  const { ctx, store } = app;
  assert.equal(openMenu(ctx, "goblin-2"), true);
  // An earlier shared change on another creature (the reviewer's -3 on Sentinella).
  applyHp(ctx, "goblin-1", "-3");
  assert.equal(store.state.actors["goblin-1"].hp, 4);
  activateMenuItem(ctx, "token-menu-pick", target(ctx, "goblin-2"));
  assert.match(menuState().status.text, /^Selezionate: /);
  assert.equal(menuState().status.undo, null);
  activateMenuItem(ctx, "token-menu-copy", target(ctx, "goblin-2"));
  assert.equal(menuState().status.undo, null);
  // A committing command offers Undo named by its own record, which Undo would revert.
  activateMenuItem(ctx, "token-menu-hide", target(ctx, "goblin-2"));
  assert.equal(menuState().status.undo, "Nascosta ai giocatori: Esploratore");
  assert.equal(ctx.undoLabel?.() ?? store.history.at(-1).label, menuState().status.undo);
  activateMenuItem(ctx, "token-menu-pick", target(ctx, "goblin-2"));
  assert.equal(menuState().status.undo, null);
  assert.equal(store.state.actors["goblin-1"].hp, 4);
});

test("HP chains and arrow steps (VTL-234: Owl Trackers, Battle Board, GMG)", () => {
  assert.deepEqual(parseHpInput("-3-2"), { op: "damage", amount: 5, text: "-3-2" });
  assert.deepEqual(parseHpInput("+5-2"), { op: "heal", amount: 3, text: "+5-2" });
  assert.deepEqual(parseHpInput("-3+2"), { op: "damage", amount: 1, text: "-3+2" });
  assert.deepEqual(parseHpInput("=25-3+2"), { op: "set", amount: 24, text: "=25-3+2" });
  assert.deepEqual(parseHpInput("25-3+2", 7), { op: "set", amount: 24, text: "25-3+2" });
  // A chain from the current HP is a change of it: damage or healing, never a correction.
  assert.deepEqual(parseHpInput("18-5", 18), { op: "damage", amount: 5, text: "18-5" });
  assert.deepEqual(parseHpInput("12+4", 12), { op: "heal", amount: 4, text: "12+4" });
  assert.deepEqual(parseHpInput("18", 18), { op: "set", amount: 18, text: "18" });
  assert.throws(
    () => parseHpInput("7-3+3", 7),
    (e) => e.code === "hp-zero-change",
  );
  assert.throws(
    () => parseHpInput("5-9"),
    (e) => e.code === "hp-negative",
  );
  assert.throws(
    () => parseHpInput("-3--2"),
    (e) => e.code === "hp-format",
  );
  assert.equal(stepHpInput("12", 1, 18), "13");
  assert.equal(stepHpInput("=12", -1, 18), "=11");
  assert.equal(stepHpInput("-5", 1, 18), "-4");
  assert.equal(stepHpInput("-1", 1, 18), "+1");
  assert.equal(stepHpInput("+2", -10, 18), "-8");
  assert.equal(stepHpInput("", -1, 18), "17");
  assert.equal(stepHpInput("0", -1, 18), "0");
  assert.equal(stepHpInput("25-3", 1, 18), null);
  // Through the conditions domain: "7-3" on a 7-HP creature is recorded as damage.
  const app = makeApp();
  const result = applyHp(app.ctx, "goblin-1", "7-3");
  assert.deepEqual(result, { before: 7, after: 4, op: "damage" });
  assert.equal(app.store.state.log.at(-1).label, "Sentinella: danno 3 (menu della pedina)");
  // Several tokens: each reads the chain against its own HP.
  const many = applyHpMany(app.ctx, ["goblin-1", "goblin-2"], "4-1");
  assert.deepEqual(
    many.changes.map((c) => [c.actorId, c.after]),
    [
      ["goblin-1", 3],
      ["goblin-2", 3],
    ],
  );
  assert.equal(
    app.store.state.log.at(-1).label,
    "Sentinella: danno 1, Esploratore: PF impostati a 3 (menu della pedina)",
  );
});

test("a copy of a 128-character name fits Preparation's Duplicate (100 characters)", () => {
  const app = makeApp();
  const { ctx, store } = app;
  const long = "Sentinella dei cancelli di Bruma".padEnd(123, "a");
  ctx.commit("rename", (d) => renameCreature(d, d.ext["token-menu"], "goblin-1", long, "dm"));
  assert.equal(store.state.actors["goblin-1"].name.length, 123);
  const clip = copyTokens(store.state, slice(app), ["token-goblin-1"], "dm");
  let created;
  ctx.commit("paste", (d) => {
    created = pasteTokens(d, d.ext["token-menu"], clip, { x: 600, y: 300 }, "dm");
  });
  const name = store.state.actors[created[0]].name;
  assert.ok(name.length <= 100, name.length);
  assert.match(name, / B$/);
  assert.equal(copyName(store.state, long).length <= 100, true);
});

test("a name changed on the sheet ends the hidden name; it never brings back the old one", () => {
  const app = makeApp();
  const { ctx, store } = app;
  run(app, "token-menu-hide-name", "goblin-1");
  assert.equal(hiddenName(store.state, slice(app), "goblin-1").trueName, "Sentinella");
  // The DM renames the creature on its sheet (a plain shared-name change).
  ctx.commit("sheet rename", (d) => {
    d.actors["goblin-1"].name = "Capo";
  });
  assert.equal(hiddenName(store.state, slice(app), "goblin-1"), null);
  assert.equal(trueNameOf(store.state, slice(app), "goblin-1"), "Capo");
  assert.deepEqual(
    nameProjections(store.state, "dm", "it").filter((p) => p.actorId === "goblin-1"),
    [],
  );
  const t = target(ctx, "goblin-1");
  const item = app.registry.get("token-menu", "token-menu-hide-name", ctx, t);
  assert.ok(item);
  // The menu offers to hide "Capo", not to restore "Sentinella" (B62: «Visibilità» submenu).
  const html = menuMarkup(ctx, {
    actorId: "goblin-1",
    sceneId: "old-watch",
    view: "cat:visibility",
  });
  assert.match(html, /Nascondi il nome ai giocatori/);
  assert.doesNotMatch(html, /Sentinella/);
  run(app, "token-menu-hide-name", "goblin-1");
  assert.equal(store.state.actors["goblin-1"].name, "Creatura sconosciuta 1");
  assert.equal(slice(app).names["goblin-1"].trueName, "Capo");
  run(app, "token-menu-hide-name", "goblin-1");
  assert.equal(store.state.actors["goblin-1"].name, "Capo");
});

test("players' visible token changes are logged for everyone; secrets stay with the DM", () => {
  const app = makeApp();
  const { ctx, store } = app;
  const last = () => store.state.log.at(-1);
  run(app, "token-menu-lock", "livia");
  assert.equal(last().visibility, "shared");
  run(app, "token-menu-hide", "goblin-1");
  assert.equal(last().visibility, "private");
  run(app, "token-menu-lock", "goblin-1");
  assert.equal(last().visibility, "private");
  run(app, "token-menu-hide", "goblin-1");
  assert.equal(last().visibility, "shared");
  // Groups are a DM-only arrangement.
  ctx.commit("pick", () => {});
  ctx.commit("group", (d) =>
    groupTokens(d.ext["token-menu"], "old-watch", ["token-goblin-1", "token-goblin-2"], "dm"),
  );
  run(app, "token-menu-hide-name", "goblin-2");
  assert.equal(last().visibility, "private");
  run(app, "token-menu-hide-name", "goblin-2");
  assert.equal(last().visibility, "shared");
  // The Visible only to… dialog's copy names no other product.
  let body = "";
  ctx.dialog = (title, html) => {
    body = html;
  };
  run(app, "token-menu-audience", "goblin-1");
  assert.match(body, /Una pedina nascosta può restare visibile ad alcuni personaggi/);
  assert.doesNotMatch(body, /Owlbear|Smoke|Spectre/);
});

test("V switches the Table to the Select tool; without a Table it explains", () => {
  const app = makeApp();
  const command = app.registry.commandForKey({ key: "v" }, app.ctx);
  assert.equal(command?.id, "token-menu.select-tool");
  assert.throws(
    () => command.run(app.ctx),
    (e) => e.it === "Apri il Tavolo.",
  );
});
