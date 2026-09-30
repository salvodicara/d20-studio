// B62 independent review (26/09/2026): where commands live once all 48 areas exist, fixes
// found in the running app with a strict reachability audit (1440 × 900, 1366 × 768, 390 × 844
// touch; DM and player; IT and EN). P2: at 1366 × 768 in combat B40's «Mosse» fell into a
// third row that only scrolling the hotbar revealed; on a phone the token menu sheet hid
// its last submenus (DM: Visibility, Loot, DM tools) below its fold, and the DM tools group
// ran under the pinned hotbar (B41 Regions and traps, B45 Search point covered). P3: the
// Table sidebar put Journal before Items, not in Foundry's order (FVT-007). Patterns copied:
// BG3's hotbar keeps its common actions in view beside the scrolling slots (CRP-098); Material
// bottom sheets grow to the content up to the screen; Foundry's scene controls show the
// active control's tools in a column from the top of the toolbar. Synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createStore } from "../state.mjs";
import { createRegistry, TABLE_SIDEBAR_SECTIONS } from "../registry.mjs";
import { esc, icon } from "../ui.mjs";
import { renderTable, resetTableView } from "../table.mjs";
import { expireTurnEffects } from "../combat.mjs";
import * as D from "../special-moves-domain.mjs";
import * as UI from "../special-moves.mjs";

const css = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const rule = (source, selector) => {
  const at = source.indexOf(selector + " {");
  assert.ok(at >= 0, "missing rule " + selector);
  return source.slice(at, source.indexOf("}", at));
};
const media = (source, query) => {
  const at = source.indexOf(`@media ${query} {`);
  assert.ok(at >= 0, "missing @media " + query);
  // The block ends at the first line that closes it (a "}" at the start of a line).
  const end = source.indexOf("\n}", at);
  return source.slice(at, end);
};

afterEach(() => {
  UI.resetSpecialMovesView();
  resetTableView({ forget: true });
});

function harness(role = "player") {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry({ logger: null });
  assert.equal(registry.use(D.ID, UI.register).status, "built");
  const store = createStore({ storage });
  registry.initState(store.state);
  const ctx = {
    role,
    lang: "it",
    offline: false,
    view: { page: "table", id: "", tab: "" },
    get state() {
      return store.state;
    },
    esc,
    icon,
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      typeof value === "object" && value ? value[ctx.lang] || value.it : String(value),
    canControl: (actor) => !!actor && (ctx.role === "dm" || actor.owner === ctx.role),
    toast() {},
    dialog() {},
    closeDialog() {},
    render() {},
    navigate() {},
    commit: () => ({ applied: true, persisted: true }),
    registry,
  };
  registry.attach(ctx);
  store.commit(
    "setup",
    (s) => {
      const order = ["livia", "goblin-1", "doran", "goblin-2"];
      s.combat = { active: true, round: 1, turn: 0, order, encounterId: "enc-b62-review" };
      for (const id of order)
        Object.assign(s.actors[id], {
          movement: s.actors[id].speed,
          movementSpent: 0,
          dashCount: 0,
          action: true,
          bonus: true,
          reaction: true,
        });
      expireTurnEffects(s, "livia", "start");
    },
    "dm",
  );
  return { ctx, store };
}

test("R-1: B40's Moves is pinned beside the actions, never inside their scrolling rows", () => {
  const { ctx } = harness();
  resetTableView();
  const html = renderTable(ctx);
  const actionsAt = html.indexOf('<div class="combat-actions">');
  const dockAt = html.indexOf('<div class="combat-dock">');
  assert.ok(actionsAt > 0, "the actions list");
  assert.ok(dockAt > actionsAt, "a dock column after the actions list");
  const actions = html.slice(actionsAt, dockAt);
  assert.doesNotMatch(actions, /data-sm-tray/, "Moves is not one of the scrolling actions");
  assert.match(actions, /data-combat-action="disengage"/, "Dash, Dodge and Disengage stay there");
  const dock = html.slice(dockAt, html.indexOf('<div class="toolbar">', dockAt));
  assert.match(dock, /data-sm-tray/, "Moves in the pinned dock column");
  // Without dock commands (B40 absent) there is no empty column.
  const bare = createRegistry({ logger: null });
  ctx.registry = bare;
  bare.attach(ctx);
  resetTableView();
  assert.doesNotMatch(renderTable(ctx), /class="combat-dock"/);

  const styles = css("styles.css");
  // Desktop: actions | dock | dice mode and rolls; only the actions scroll.
  assert.match(
    rule(styles, ".table-hotbar .combat-bar"),
    /grid-template-columns: minmax\(0, 1fr\) auto auto;/,
  );
  assert.match(rule(styles, ".table-hotbar .combat-bar-heading"), /grid-column: 3;/);
  const dockRule = rule(styles, ".table-hotbar .combat-dock");
  assert.match(dockRule, /grid-column: 2;/);
  assert.doesNotMatch(dockRule, /overflow/);
  // 1280–1499 px: the portrait gives its width to the actions (the name and the resources
  // stay); below 1440 the dice mode and the rolls queue keep their control and bell, as on a
  // phone. Livia's seven actions keep two rows beside the pinned Moves at 1366 × 768.
  const wide = media(styles, "(min-width: 1280px) and (max-width: 1499px)");
  assert.match(wide, /\.table-hotbar \.hotbar-portrait \{\s*display: none;/);
  const laptop = media(styles, "(min-width: 1280px) and (max-width: 1439px)");
  assert.match(laptop, /\.table-hotbar \.combat-bar-heading \.text-button \{\s*font-size: 0;/);
  assert.match(laptop, /\.table-hotbar \.combat-bar-heading > label \{\s*font-size: 0;/);
  // Phone: the actions strip, then Moves, then the dice mode, on one row.
  const phone = styles.slice(
    styles.lastIndexOf("@media (max-width: 720px) {\n  /* Phone: a compact bar"),
  );
  assert.match(rule(phone, ".table-hotbar .combat-dock"), /grid-column: 2;\s*grid-row: 2;/);
  assert.match(rule(phone, ".table-hotbar .combat-bar-heading"), /grid-column: 3;/);
  // B40's own sizing follows the button into the dock column.
  const sm = css("special-moves.css");
  assert.match(sm, /\.combat-dock \.sm-dock-toggle \{/);
  assert.doesNotMatch(sm, /\.combat-actions \.sm-dock-toggle/);
});

test("R-2: on a phone the token menu sheet grows to its content up to the screen", () => {
  const sheet = rule(css("token-menu.css"), ".token-menu.sheet");
  assert.doesNotMatch(sheet, /max-height: 72vh/);
  assert.match(sheet, /max-height: calc\(100dvh - 24px - env\(safe-area-inset-top, 0px\)\);/);
});

test("R-3: the active group's tools stand in a column from the toolbar's top (Foundry)", () => {
  const styles = css("styles.css");
  // The cluster no longer anchors the column: the toolbar (absolutely placed) does.
  assert.match(rule(styles, ".map-tool-cluster"), /position: static;/);
  assert.match(rule(styles, ".map-toolbar"), /position: absolute;/);
  const column = rule(styles, ".map-subtools");
  assert.match(column, /top: -1px;/);
  assert.match(column, /left: calc\(100% \+ 7px\);/);
});

test("P3: the Table sidebar keeps Foundry's order — Items before Journal (FVT-007)", () => {
  const ids = TABLE_SIDEBAR_SECTIONS.map((s) => s.id);
  assert.ok(ids.indexOf("items") < ids.indexOf("journal"), ids.join());
  assert.deepEqual(ids, [
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
});
