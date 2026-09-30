// Visual pass 2 (30/09/2026) — Table HUD re-layout copying BG3's combat HUD and Owlbear's map
// chrome: party portraits, the hotbar's resource row, a compact Creature tab without the HP
// and resources the HUD shows, and the DM's single «Sessione» menu on the map. Synthetic
// sample data only.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createInitialState, createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { renderTable, resetTableView } from "../table.mjs";
import { esc, icon } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import * as sv from "../session-view.mjs";

const context = (state, role = "player") => ({
  state,
  role,
  lang: "it",
  canControl: (actor) => canControlActor(actor, role, state),
  t: (it) => it,
  label: (value) => (typeof value === "object" ? value?.it : value),
  esc,
  icon,
});
const between = (html, start, end) => {
  const at = html.indexOf(start);
  assert.ok(at >= 0, "missing " + start);
  return html.slice(at, html.indexOf(end, at + start.length));
};

test("BG3 party portraits: the scene's characters, own HP only, their own select handle", () => {
  const state = createInitialState();
  resetTableView();
  const html = renderTable(context(state));
  const party = between(html, '<nav class="table-party"', "</nav>");
  // In the stage, over the map, after the tool column.
  assert.ok(html.indexOf('<nav class="table-party"') > html.indexOf('id="map-toolbar"'));
  assert.ok(html.indexOf('<nav class="table-party"') < html.indexOf('class="map-container"'));
  const members = [...party.matchAll(/data-party-select="([^"]+)"/g)].map(([, id]) => id);
  assert.ok(members.includes("livia") && members.includes("doran"), members.join());
  assert.ok(!members.some((id) => id.startsWith("goblin")), "creatures are not party members");
  // `data-select` stays unique to the turn order (journeys press `[data-select=livia]`).
  assert.doesNotMatch(party, /data-select=/);
  // The player's own character shows its HP bar and names its hit points; another player's
  // character shows neither (the map token draws the HP bar only for its controller).
  const own = between(party, 'data-party-select="livia"', "</button>");
  assert.match(own, /aria-pressed="true"/);
  assert.match(own, /punti ferita su/);
  assert.match(own, /class="table-party-hp/);
  const other = between(party, 'data-party-select="doran"', "</button>");
  assert.doesNotMatch(other, /table-party-hp|punti ferita/);
});

test("the hotbar's resource row sits above its middle; words stay, commands are icons", () => {
  const state = createInitialState();
  resetTableView();
  const html = renderTable(context(state));
  const hotbar = html.slice(html.indexOf('<div class="action-dock table-hotbar'));
  const identity = between(hotbar, '<div class="hotbar-identity">', '<div class="hotbar-center">');
  assert.doesNotMatch(identity, /class="resources"|hotbar-slots/, "resources left the identity");
  const center = hotbar.indexOf('<div class="hotbar-center"><div class="hotbar-resources">');
  assert.ok(center > 0, "the resource row opens the hotbar's middle");
  assert.ok(center < hotbar.indexOf('<div class="hotbar-page" id="hotbar-panel-actions"'));
  assert.match(
    hotbar,
    /<span class="available movement"><span class="resource-word">Movimento<\/span> 9 m<\/span>/,
  );
  const commands = hotbar.slice(hotbar.indexOf('<div class="toolbar">'));
  assert.match(
    commands,
    /data-tool="move" title="Muovi">[^]*?<span class="dock-text">Muovi<\/span><\/button>/,
  );
  assert.match(
    commands,
    /data-table="actions" title="Azioni della scheda">[^]*?<span class="dock-text">Azioni della scheda<\/span>/,
  );
});

test("the Creature tab keeps AC and conditions, not the HP and movement the hotbar shows", () => {
  const state = createInitialState();
  resetTableView();
  const html = renderTable(context(state));
  const inspector = between(
    html,
    '<div class="table-inspector">',
    '<div class="table-sidebar-rail">',
  );
  assert.doesNotMatch(inspector, /health-track/);
  assert.doesNotMatch(inspector, /<div class="stat"><strong>9 m<\/strong>/);
  assert.doesNotMatch(inspector, /conditions-summary-hp/, "no second HP line");
  assert.match(inspector, /<span class="inspector-ac"><small>CA<\/small><strong>\d+<\/strong>/);
  assert.match(inspector, /data-conditions-entry="livia"/);
  assert.match(inspector, /data-table="sheet"/);
});

// The session HUD against the real store and registry, as tests/session-view.test.mjs.
function hud(role) {
  const memory = () => {
    const values = new Map();
    return {
      getItem: (key) => (values.has(key) ? values.get(key) : null),
      setItem: (key, value) => values.set(key, String(value)),
    };
  };
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  registry.use("session-view", sv.register);
  const store = createStore({ storage: memory() });
  registry.initState(store.state);
  const ctx = {
    state: store.state,
    role,
    lang: "it",
    view: { page: "table", id: "", tab: "" },
    t: (it) => it,
    label: (value) => (typeof value === "object" && value ? value.it : String(value ?? "")),
    esc,
    icon,
    canControl: (actor) => canControlActor(actor, role, store.state),
    toast: () => {},
    render: () => {},
    registry,
  };
  registry.attach(ctx);
  const layer = registry.get("map-layer", "session-view-hud", ctx);
  return () => layer.svg(ctx, { scene: store.state.scenes[0], zoom: 1, pan: { x: 0, y: 0 } });
}

test("Owlbear's one row: the DM's session commands in one «Sessione» menu", () => {
  sv.resetUI();
  const html = hud("dm")();
  const bar = between(
    html,
    '<div class="session-view-hud-bar">',
    '<div class="session-view-hud-stack">',
  );
  assert.match(
    bar,
    /<button type="button" class="session-view-hud-button session-view-menu-button" data-session-menu aria-expanded="false" aria-controls="session-view-menu" aria-label="Sessione · comandi della sessione" title="Sessione · comandi della sessione">/,
  );
  const menu = between(bar, '<div class="session-view-menu"', "</div></span>");
  assert.match(menu, /role="group" aria-label="Comandi della sessione" hidden>/);
  for (const hook of [
    'data-table-drawer="session-view-controls" aria-controls="table-drawer"',
    'data-sv="pause"',
    'data-sv="hide"',
    'data-sv="focus-timer"',
    'data-sv="focus-clocks"',
    'data-sv="group"',
  ])
    assert.ok(menu.includes(hook), hook);
  // The row: the menu, then Hide interface (the safety area adds its signals between them).
  const row = bar.replace(menu, "");
  assert.equal(row.match(/data-sv="group"/g), null, "no second Party button in the row");
  assert.match(row, /data-sv="clean"/);
  // Opened, the menu keeps its commands in place (Pause and Hide scene keep it open).
  sv.uiState.menu = true;
  const open = hud("dm")();
  assert.match(open, /data-session-menu aria-expanded="true"/);
  assert.match(open, /aria-label="Comandi della sessione">/);
  sv.resetUI();
  assert.equal(sv.uiState.menu, false);
});

test("players keep Party in the row; no session menu", () => {
  sv.resetUI();
  const html = hud("player")();
  assert.doesNotMatch(html, /data-session-menu|session-view-menu/);
  assert.match(html, /data-sv="group"/);
});

test("Table HUD CSS: the map fills the Table, the phone block keeps the B61 anchor", () => {
  const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const at = css.indexOf(
    "/* ------------------------------------------------------------------ Visual pass 2: Table HUD",
  );
  assert.ok(at > 0, "the Table HUD block");
  const block = css.slice(at);
  assert.match(block, /#app:has\(> \.workspace\.is-table\) \{\s*display: flex;/);
  assert.match(block, /\.table-layout > \.table-stage \{\s*grid-row: 2 \/ 4;/);
  assert.match(block, /\.table-layout > \.action-dock \{\s*grid-row: 3;\s*grid-column: 1 \/ 3;/);
  assert.match(block, /\.table-layout > \.table-sidebar-panel \{\s*grid-row: 1 \/ 3;/);
  // The map's box is the free area between the floating controls (fit, off-map arrows and
  // the areas' map HUDs use it); the canvas runs under the controls.
  assert.match(
    block,
    /\.table-stage #battle-map \{\s*width: auto;\s*margin: 0 76px 152px 88px;\s*overflow: visible;/,
  );
  // The phone overrides use «screen and»: the last plain phone block stays the B61 one that
  // tests/review-fixes-b61.test.mjs reads (rail and tab strip that do not scroll together).
  assert.doesNotMatch(block, /@media \(max-width: 720px\)/);
  assert.match(block, /@media screen and \(max-width: 720px\)/);
  const phone = css.slice(css.lastIndexOf("@media (max-width: 720px)"));
  assert.ok(phone.includes(".table-layout > .table-sidebar-rail {"));
});
