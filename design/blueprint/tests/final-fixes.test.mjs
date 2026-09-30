// Final review fixes (30/09/2026), one writer: the P1/P2/P3 findings of the final reviews
// (completeness, privacy, UX). Each block names its finding and the market pattern copied.
// Synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { canControlActor, canViewActor } from "../character-access.mjs";
import * as cm from "../campaign-members.mjs";
import { readFileSync } from "node:fs";

const cssOf = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
/** Declarations of every rule whose selector list contains `selector` exactly, last wins. */
function declarations(css, selector) {
  const out = {};
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const match of plain.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(",").map((part) => part.trim().replace(/\s+/g, " "));
    if (!selectors.includes(selector)) continue;
    for (const decl of match[2].split(";")) {
      const at = decl.indexOf(":");
      if (at > 0) out[decl.slice(0, at).trim()] = decl.slice(at + 1).trim();
    }
  }
  return out;
}

const NOW = Date.parse("2026-09-24T10:00:00.000Z");
const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
};
function seededMembers() {
  const state = createInitialState();
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  registry.use(cm.ID, cm.register);
  registry.initState(state);
  return state;
}

// ---------------------------------------------------------------- privacy P1: removed member

test("privacy P1: after «Espelli…» the removed player no longer reads the campaign's sheets", () => {
  const state = seededMembers();
  assert.equal(canViewActor(state.actors.doran, "player", state), true, "a member reads Doran");
  cm.removeMember(state, "lanterns", "player", {}, "dm", NOW);
  assert.equal(canViewActor(state.actors.doran, "player", state), false);
  assert.equal(canControlActor(state.actors.doran, "player", state), false);
  // Roll20 SVC-031: the owner keeps a read-only copy of their own sheet (variant b).
  assert.equal(canViewActor(state.actors.livia, "player", state), true);
  assert.equal(canControlActor(state.actors.livia, "player", state), false);
  // The DM still reads every sheet of the campaign.
  assert.equal(canViewActor(state.actors.doran, "dm", state), true);
  assert.equal(canViewActor(state.actors.livia, "dm", state), true);
});

// ---------------------------------------------------------------- UX P1: Table menus

test("UX P1 (Owlbear/Foundry context menu): the bestiary header keeps Back as an icon beside the title", () => {
  const head = declarations(cssOf("token-menu.css"), ".token-menu-head > .token-menu-back");
  assert.equal(head.width, "40px");
  assert.equal(head.flex, "none");
});

test("UX P1 (Owlbear room menu above the HUD): the «Sessione» menu opens in the top layer", () => {
  // The HUD is inside the map's SVG (a stacking context under the turn order, z 4): no
  // z-index lifts it, so the open menu becomes a popover placed under its button.
  const source = readFileSync(new URL("../session-view.mjs", import.meta.url), "utf8");
  const bind = source.slice(
    source.indexOf("function bindSessionMenu"),
    source.indexOf("function bindHud"),
  );
  assert.match(bind, /setAttribute\("popover", "manual"\)/);
  assert.match(bind, /showPopover\(\)/);
  assert.match(bind, /hidePopover\(\)/);
  const layer = declarations(cssOf("session-view.css"), ".session-view-menu[popover]");
  assert.equal(layer.position, "fixed");
  assert.equal(layer.inset, "auto");
});

// ---------------------------------------------------------------- UX P1: page scroll (F4)

test("UX P1 (D&D Beyond, Kanka): a new page starts at the top; Back restores the position", async () => {
  const { isNewPage, createScrollMemory } = await import("../ui.mjs");
  assert.equal(isNewPage({ page: "home", id: "" }, { page: "characters", id: "livia" }), true);
  assert.equal(
    isNewPage({ page: "characters", id: "livia" }, { page: "characters", id: "doran" }),
    true,
  );
  assert.equal(
    isNewPage(
      { page: "characters", id: "livia", tab: "" },
      { page: "characters", id: "livia", tab: "spells" },
    ),
    false,
  );
  assert.equal(
    isNewPage(null, { page: "home" }),
    false,
    "the first render keeps the browser's place",
  );
  const memory = createScrollMemory(2);
  memory.remember("a", 400);
  memory.remember("b", 120);
  assert.equal(memory.recall("a"), 400);
  assert.equal(memory.recall("zzz"), null);
  memory.remember("c", 10);
  assert.equal(memory.recall("a"), null, "the oldest entry is forgotten past the limit");
  // Pages that bring their title into view no longer push the app header out of sight.
  const campaign = readFileSync(new URL("../campaign.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(
    campaign,
    /title\?\.scrollIntoView\(\{ block: "start", behavior: "instant" \}\)/,
  );
  const builder = readFileSync(new URL("../character-builder.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(builder, /heading\.scrollIntoView\(\{ block: "start" \}\)/);
  const app = readFileSync(new URL("../app.mjs", import.meta.url), "utf8");
  assert.match(app, /scrollRestoration = "manual"/);
});

// ---------------------------------------------------------------- UX P1 F5 / TV-53: turn start

test("UX P1 F5 / TV-53 (BG3): when a turn starts the viewer's acting creature takes the hotbar", async () => {
  const { renderTable, resetTableView, setSelectedActor } = await import("../table.mjs");
  const { esc, icon } = await import("../ui.mjs");
  const state = createInitialState();
  state.combat = { active: true, round: 1, turn: 0, order: ["livia", "goblin-1", "mira", "doran"] };
  const ctx = {
    state,
    role: "player",
    lang: "it",
    canControl: (a) => a?.owner === "player",
    t: (it) => it,
    label: (v) => (typeof v === "object" ? v?.it : v),
    esc,
    icon,
  };
  const hotbarName = (html) => html.match(/class="hotbar-name"><strong>([^<]+)</)?.[1];
  resetTableView();
  assert.equal(hotbarName(renderTable(ctx)), "Livia");
  state.combat.turn = 2; // Mira's turn starts
  assert.equal(hotbarName(renderTable(ctx)), "Mira");
  setSelectedActor("livia"); // switching by hand stays possible during the turn
  assert.equal(hotbarName(renderTable(ctx)), "Livia");
  state.combat.turn = 3; // Doran's turn: not the player's, the selection stays
  assert.equal(hotbarName(renderTable(ctx)), "Livia");
  state.combat.round = 2;
  state.combat.turn = 2; // Mira again in the next round
  assert.equal(hotbarName(renderTable(ctx)), "Mira");
});

// ---------------------------------------------------------------- UX P1 F6: the map's status line

test("UX P1 F6 (BG3 action hints above the resource row): the status line sits over the measured HUD", async () => {
  const { captionLift } = await import("../table.mjs");
  // Map container 106–900; hotbar 681–889, resource row 650–676, dice plate 646–676.
  assert.equal(captionLift({ bottom: 900 }, [681, 650, 646]), 262);
  // Nothing measured (phone layout, hidden HUD): the stylesheet's own place stays.
  assert.equal(captionLift({ bottom: 900 }, []), null);
  assert.equal(captionLift({ bottom: 900 }, [NaN, 0]), null);
});

// ---------------------------------------------------------------- UX P1 F1: level up

test("UX P1 F1 (D&D Beyond Manage Level Up, BG3 level up): only the new level changes the sheet", async () => {
  const cb = await import("../character-build.mjs");
  const { levelChanges } = await import("../character-builder.mjs");
  const { knownLanguages } = await import("../chat-domain.mjs");
  const { initiativeBonus } = await import("../combat-tracker-domain.mjs");
  const { statValue } = await import("../sheet-plus-domain.mjs");
  const state = createInitialState();
  const before = structuredClone(state.actors.livia);
  const languages = knownLanguages(state, "livia");
  cb.createCharacterDraft(state, { id: "up", kind: "advance", actorId: "livia" }, "player");
  let d = cb.prepareLevelUp(state, "up", "player");
  let p = cb.previewCharacterDraft(state, "up", "player");
  // Only the level-4 choice is asked: no empty «Maestria» of level 2, no origin or skill
  // warnings about choices the sheet made long ago.
  assert.deepEqual(
    p.choices.grants.map((g) => g.id),
    ["class:wizard:feat:4"],
  );
  assert.deepEqual(
    p.warnings.filter((w) => ["origin", "skills"].includes(w.section)).map((w) => w.code),
    [],
  );
  const features = structuredClone(d.data.features);
  features.selected = [{ id: "alert", grantId: "class:wizard:feat:4" }];
  cb.saveCharacterDraft(
    state,
    "up",
    { data: { features }, expectedRevision: d.revision },
    "player",
  );
  p = cb.previewCharacterDraft(state, "up", "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  assert.equal(p.incomplete, false, "no confirmation of unrelated warnings");
  const changes = levelChanges(state.actors.livia, p.proposed);
  assert.deepEqual(
    changes.gained.map((f) => f.name.it),
    ["Allerta"],
  );
  cb.applyCharacterDraft(state, "up", { operationId: "op-up", reviewKey: p.reviewKey }, "player");
  const after = state.actors.livia;
  assert.equal(after.level, 4);
  assert.deepEqual(after.className, before.className, "«Maga» stays «Maga»");
  assert.deepEqual(knownLanguages(state, "livia"), languages, "Common, Elvish, Draconic stay");
  assert.deepEqual(
    after.features.map((f) => f.name.it),
    [...before.features.map((f) => f.name.it), "Allerta"],
  );
  assert.deepEqual(
    after.spells.map((s) => s.id),
    before.spells.map((s) => s.id),
  );
  // SRD 5.2.1 Alert: Initiative Proficiency (+PB). One derived value for every surface.
  assert.equal(initiativeBonus(state, "livia"), 2 + 2);
  assert.equal(statValue(state, "livia", "initiative").total, 2 + 2);
  // A second level up stays a level up (the recorded sheet does not rebuild levels 1–4).
  cb.createCharacterDraft(state, { id: "up5", kind: "advance", actorId: "livia" }, "player");
  cb.prepareLevelUp(state, "up5", "player");
  const p5 = cb.previewCharacterDraft(state, "up5", "player");
  const gained5 = levelChanges(state.actors.livia, p5.proposed).gained.map((f) => f.name.it);
  assert.ok(
    !gained5.includes("Adepto dei rituali") && !gained5.includes("Allerta"),
    gained5.join(),
  );
});

// ---------------------------------------------------------------- UX P2 F13: one derived value

test("UX P2 F13 (D&D Beyond: one derived value on every surface): the character card's AC is the sheet's", async () => {
  const { rowOf } = await import("../character-library.mjs");
  const { getEffectiveActor } = await import("../forms-companions.mjs");
  const state = createInitialState();
  // A worn, attuned Cloak of Protection (+1 AC), as the inventory area seeds it.
  state.actors.livia.inventory.push({
    id: "cloak",
    srdId: "srd2024:item:cloak-of-protection",
    name: { it: "Mantello della protezione", en: "Cloak of Protection" },
    quantity: 1,
    weight: 0.5,
    equipped: true,
    attuned: true,
    kind: "gear",
  });
  const effective = getEffectiveActor(state.actors.livia).ac;
  assert.equal(effective, 13);
  assert.equal(rowOf(state, state.actors.livia, "player").ac, effective);
});

test("UX P2 F13: a monster without spellcasting shows no spell slots", () => {
  const state = createInitialState();
  for (const id of ["goblin-1", "goblin-2"]) {
    const slots = state.actors[id].slots;
    assert.ok(!slots || !slots.max, `${id} has no slots (${JSON.stringify(slots)})`);
  }
  assert.equal(state.actors.livia.slots.max, 4, "the wizard keeps hers");
});

// ---------------------------------------------------------------- P2: Surprise at combat start

test("P2 Surprise (SRD 5.2.1 EN 189 / IT 216; BG3 and Solasta ambushes): a surprised creature rolls Initiative with Disadvantage", async () => {
  const CT = await import("../combat-tracker-domain.mjs");
  const UI = await import("../combat-tracker.mjs");
  const { AMBUSH_SCENE_ID, AMBUSH_GOBLINS } = await import("../state.mjs");
  const { harness } = await import("./p5-harness.mjs");
  const h = harness({ role: "dm" });
  const rows = CT.startCandidates(h.ctx.state, AMBUSH_SCENE_ID);
  // The start dialog offers «Sorpreso» on every row, with the rule's source.
  UI.openTableInitiative(h.ctx, AMBUSH_SCENE_ID);
  const body = h.dialogs.at(-1).body;
  assert.match(body, /data-ct-start-surprise="livia"/);
  assert.match(body, /Sorpres/);
  assert.match(body, /EN 189 \/ IT 216/);
  // The party is caught unaware: Livia's die is the lower of two.
  CT.markSurprised(rows, ["livia"], true);
  h.ctx.commit("roll", (draft) => {
    CT.rollStartRows(draft, AMBUSH_SCENE_ID, rows, ["livia"], "dm");
  });
  const record = h.ctx.state.initiativeRolls.findLast((r) => r.actorId === "livia");
  assert.equal(record.rollMode, "disadvantage");
  assert.equal(record.faces.length, 2);
  assert.equal(record.natural, Math.min(...record.faces));
  // The mark is saved with the prepared encounter and read back by the next start.
  const again = CT.startCandidates(h.ctx.state, AMBUSH_SCENE_ID);
  assert.equal(again.find((r) => r.actorId === "livia").surprised, true);
  assert.notEqual(again.find((r) => r.actorId === AMBUSH_GOBLINS[0]).surprised, true);
  // Marking a creature already rolled digitally clears that die: it rolls again, surprised.
  const goblin = rows.find((r) => r.actorId === AMBUSH_GOBLINS[0]);
  Object.assign(goblin, { included: true, natural: 12, mode: "digital", rollId: "x" });
  CT.markSurprised(rows, [goblin.actorId], true);
  assert.equal(goblin.natural, null);
  // A typed physical die stays: the DM typed the lower of the two.
  Object.assign(goblin, { natural: 7, mode: "physical" });
  CT.markSurprised(rows, [goblin.actorId], false);
  assert.equal(goblin.natural, 7);
});

// ---------------------------------------------------------------- P2 X-09: arithmetic in the HP field

test("P2 X-09 (Owl Trackers, the token menu's HP field): the sheet's HP amount takes -5, +3, =12 and chains", async () => {
  const { amountPlan } = await import("../hp-widget.mjs");
  assert.deepEqual(amountPlan("-5", 18), { kind: "damage", amount: 5, raw: "-5" });
  assert.deepEqual(amountPlan("+2", 18), { kind: "heal", amount: 2, raw: "+2" });
  assert.deepEqual(amountPlan("=15", 18), { kind: "set", amount: 15, raw: "=15" });
  assert.deepEqual(amountPlan("18-3+1", 18), { kind: "damage", amount: 2, raw: "18-3+1" });
  // A plain number keeps D&D Beyond's meaning with the buttons: the amount to heal or deal.
  assert.deepEqual(amountPlan("2+3", 18, "damage"), { kind: "damage", amount: 5, raw: "2+3" });
  assert.deepEqual(amountPlan("7", 18, "heal"), { kind: "heal", amount: 7, raw: "7" });
  assert.throws(
    () => amountPlan("abc", 18),
    (e) => /non è un valore valido/.test(e.it),
  );
  const source = readFileSync(new URL("../hp-widget.mjs", import.meta.url), "utf8");
  assert.match(source, /class="dt-amount" data-dt-amount="[^"]*" type="text"/);
});

// ---------------------------------------------------------------- P2 X-06: context menus

test("P2 X-06 (Owlbear Rodeo, Fantasy Grounds): characters, inventory rows and spells carry a labelled context menu", async () => {
  const { contextItems } = await import("../context-menu.mjs");
  // The menu lists the row's own commands, by their accessible names, once each; disabled
  // and hidden commands stay out.
  assert.deepEqual(
    contextItems([
      { label: "  Apri scheda ", disabled: false, hidden: false },
      { label: "Gestisci", disabled: false, hidden: false },
      { label: "Copia", disabled: true, hidden: false },
      { label: "Elimina", disabled: false, hidden: true },
      { label: "Gestisci", disabled: false, hidden: false },
      { label: "", disabled: false, hidden: false },
    ]).map((item) => item.label),
    ["Apri scheda", "Gestisci"],
  );
  for (const [file, pattern] of [
    ["character-library.mjs", /data-clib-card="\$\{ctx\.esc\(row\.id\)\}" data-context-menu=/],
    ["inventory-plus.mjs", /data-invp-row="\$\{id\}" data-context-menu=/],
    ["spells-plus.mjs", /data-spl-row="\$\{ctx\.esc\(row\.id\)\}" data-context-menu=/],
  ])
    assert.match(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), pattern, file);
  assert.match(
    readFileSync(new URL("../app.mjs", import.meta.url), "utf8"),
    /installContextMenus\(/,
  );
});

// ---------------------------------------------------------------- P2 X-07: drag and drop

test("P2 X-07 (Foundry, Fantasy Grounds: drag from the compendium to the map or a sheet)", async () => {
  const C = await import("../compendium.mjs");
  const data = await import("../srd-compendium.mjs");
  const goblin = data.searchEntries("goblin", "it").find((e) => e.kind === "creature");
  const potion = data.searchEntries("pozione di guarigione", "it").find((e) => e.kind === "item");
  // A creature carries the bestiary type the Table map already accepts; every entry carries
  // its id for a sheet and its name for a text field.
  assert.deepEqual(Object.keys(C.dragPayload(goblin)).sort(), [
    "application/x-d20-creature",
    "application/x-d20-entry",
    "text/plain",
  ]);
  assert.deepEqual(Object.keys(C.dragPayload(potion)).sort(), [
    "application/x-d20-entry",
    "text/plain",
  ]);
  // Dropped on Livia's sheet, the entry opens «Aggiungi all'inventario» on Livia.
  const { harness } = await import("./p5-harness.mjs");
  const h = harness({ role: "player" });
  assert.equal(C.dropOnSheet(h.ctx, potion.id, "livia"), true);
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.title, /inventario/);
  assert.match(dialog.body, /<option value="livia" selected>/);
  // A rule or a creature is not something a sheet holds: the drop is refused, nothing opens.
  const count = h.dialogs.length;
  assert.equal(C.dropOnSheet(h.ctx, goblin.id, "livia"), false);
  assert.equal(h.dialogs.length, count);
  // The browse rows are draggable, and the sheet and the Creature tab accept the drop.
  const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
  assert.match(src("compendium.mjs"), /draggable="true" data-compendium-drag=/);
  assert.match(
    src("compendium.mjs"),
    /<li class="compendium-row \$\{open \? "open" : ""\}"\$\{drag\}>/,
  );
  assert.match(src("characters.mjs"), /application\/x-d20-entry/);
  assert.match(src("table.mjs"), /bindEntryDrop\(root\.querySelector\("\.table-inspector"\)/);
});

// ---------------------------------------------------------------- P2 X-10: pop-out panels

async function allAreas({ role = "dm", tab = "" } = {}) {
  const { loadExtensions } = await import("../extensions.mjs");
  const { createStore } = await import("../state.mjs");
  const { esc, icon } = await import("../ui.mjs");
  const { resetTableView } = await import("../table.mjs");
  const knowledge = await import("../knowledge.mjs");
  resetTableView({ forget: true });
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  await loadExtensions(registry);
  await knowledge.neighboursReady;
  const store = createStore({ storage: memory() });
  registry.initState(store.state);
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang: "it",
    offline: false,
    view: { page: "table", id: "", tab },
    t: (it, en) => (ctx.lang === "en" ? en : it),
    label: (v) => (typeof v === "object" && v ? (v[ctx.lang] ?? v.it) : String(v ?? "")),
    esc,
    icon,
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    toast() {},
    render() {},
    navigate() {},
    dialog() {},
    closeDialog() {},
    registry,
  };
  registry.attach(ctx);
  return ctx;
}

test("P2 X-10 (Foundry V14 pop-out windows): a Table panel opens alone in its own window", async () => {
  const { renderTable, tablePanelsMenu } = await import("../table.mjs");
  // «Tutti i pannelli» offers «Stacca» beside an area panel.
  const ctx = await allAreas({ role: "dm" });
  const menu = tablePanelsMenu(
    ctx,
    [],
    [
      {
        id: "chat",
        name: "Chat",
        hideable: true,
        shown: true,
        items: [{ id: "dice-tray", name: "Dadi", glyph: "", popout: true }],
      },
    ],
  );
  assert.match(menu, /data-table-panel-popout="dice-tray"/);
  assert.match(menu, /Stacca/);
  // The window's route shows that panel only, without the map.
  const win = await allAreas({ role: "dm", tab: "window:dice-tray" });
  const html = renderTable(win);
  assert.match(html, /class="table-window" data-table-window="dice-tray"/);
  assert.match(html, /data-dtray-form/);
  assert.doesNotMatch(html, /id="battle-map"/);
  // A panel this identity may not open stays closed in its window too.
  const player = await allAreas({ role: "player", tab: "window:encounter-builder" });
  assert.doesNotMatch(renderTable(player), /data-table-window="encounter-builder"/);
});

// ---------------------------------------------------------------- P2 X-05: one confirmation surface

test("P2 X-05 (Owlbear SDK modal over its surface): cancelling a confirmation returns to where it came from", () => {
  const app = readFileSync(new URL("../app.mjs", import.meta.url), "utf8");
  // The shell's dialog takes onCancel, called once when closed without submitting.
  assert.match(
    app,
    /function dialog\(title, body, \{ submitLabel, onSubmit, cancelLabel, onCancel \} = \{\}\)/,
  );
  const prefs = readFileSync(new URL("../preferences.mjs", import.meta.url), "utf8");
  const reset = prefs.slice(
    prefs.indexOf("function openResetDialog"),
    prefs.indexOf(
      "// ---------------------------------------------------------------- Table: sheet-only mode",
    ),
  );
  assert.match(reset, /onCancel: \(\) => openPreferences\(\)/);
});

test("P2 X-09: «Correggi i punti ferita» takes arithmetic too (18-3, +2, =20)", async () => {
  const { resolveNumber } = await import("../hp-widget.mjs");
  assert.equal(resolveNumber("18-3", 18), 15);
  assert.equal(resolveNumber("+2", 18), 20);
  assert.equal(resolveNumber("-2", 18), 16);
  assert.equal(resolveNumber("=20", 18), 20);
  assert.equal(resolveNumber("22", 18), "22", "a plain number goes through as typed");
  assert.equal(resolveNumber("", 18), "", "an empty field stays empty for the domain's own check");
  assert.equal(resolveNumber("abc", 18), "abc", "an unreadable value reaches the domain's message");
  const source = readFileSync(new URL("../hp-widget.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /data-dt-fix="(hp|maxHp|tempHp)" type="number"/);
});

// ---------------------------------------------------------------- P2 F9: sub-tabs on one row

test("P2 F9 (D&D Beyond filters on one scrolling row, one row of tabs in Foundry)", () => {
  const rule = declarations(cssOf("styles.css"), ".table-sidebar-panel > .table-subtabs");
  assert.equal(rule["flex-wrap"], "nowrap");
  assert.equal(rule["overflow-x"], "auto");
  const table = readFileSync(new URL("../table.mjs", import.meta.url), "utf8");
  assert.match(table, /scrollIntoStrip\(\s*root\.querySelector\("\.table-subtabs"\)/);
});

test("P2 F8 (Foundry v13 compact chat composer): touch keeps 40 px targets", () => {
  const css = cssOf("chat.css");
  const touch = css.match(/@media \(pointer: coarse\), \(max-width: 720px\) \{([\s\S]*?)\n\}/);
  assert.ok(touch, "a touch and phone block follows the compact rule");
  assert.equal(
    declarations(css.slice(0, touch.index), ".table-sidebar-panel .chat-actions .button")[
      "min-height"
    ],
    "36px",
  );
  assert.equal(
    declarations(touch[1], ".table-sidebar-panel .chat-actions .button")["min-height"],
    "40px",
  );
});

// ---------------------------------------------------------------- P2 F14: roll notifications

test("P2 F14 (notifications stacked above the sidebar's foot): roll cards never cover «Termina turno»", () => {
  const rule = declarations(cssOf("chat.css"), "body:has(.workspace.is-table) .chat-toasts");
  assert.equal(rule.bottom, "calc(var(--table-foot, 118px) + 14px)");
});

// ---------------------------------------------------------------- P2 F15: target and panel agree

test("P2 F15 (BG3: the target shows the roll's Advantage or Disadvantage): Prone Livia aims with Disadvantage", async () => {
  const { createStore } = await import("../state.mjs");
  const { applyConditionEvent } = await import("../conditions.mjs");
  const { bindCombatUI, resetCombatUI, previewRollMode } = await import("../combat-ui.mjs");
  const store = createStore({ storage: null });
  store.commit(
    "Fixture",
    (s) => {
      Object.assign(s.combat, { active: true, order: ["livia", "goblin-1", "goblin-2"], turn: 0 });
      applyConditionEvent(s, {
        eventId: "prone-livia",
        kind: "apply",
        actorId: "livia",
        conditionId: "prone",
        source: { kind: "authored-demo", revision: "ui" },
        immunityConfirmed: true,
      });
    },
    "dm",
  );
  const element = {
    querySelectorAll: () => [],
    querySelector: () => null,
    outerHTML: "",
    innerHTML: "",
  };
  globalThis.document = { querySelector: () => element, querySelectorAll: () => [] };
  try {
    const ui = {
      role: "player",
      lang: "it",
      get state() {
        return store.state;
      },
      t: (it) => it,
      esc: (value) => String(value),
      label: (value) => (typeof value === "object" && value ? value.it : String(value ?? "")),
      icon: () => "",
      canControl: (a) => canControlActor(a, "player", store.state),
      commit: (label, mutator, options = {}) => {
        store.commit(label, mutator, "player", { shared: !options.local });
        return { applied: true, persisted: false };
      },
      render() {},
      toast() {},
      dialog() {},
    };
    resetCombatUI();
    const button = { dataset: { combatAction: "fire-bolt" } };
    bindCombatUI(
      {
        querySelectorAll: (s) => (s === "[data-combat-action]" ? [button] : []),
        querySelector: () => null,
      },
      ui,
      "livia",
    );
    button.onclick();
    const mode = previewRollMode(ui, "livia", "goblin-1");
    assert.equal(mode.mode, "disadvantage");
    assert.ok(
      mode.reasons.some((name) => /Prono/.test(name)),
      JSON.stringify(mode.reasons),
    );
    const knowledge = readFileSync(new URL("../knowledge.mjs", import.meta.url), "utf8");
    assert.match(knowledge, /previewRollMode\(ctx, attackerId, targetId\)/);
  } finally {
    delete globalThis.document;
  }
});

// ---------------------------------------------------------------- P2 F16: DM tools where the DM looks

test("P2 F16 (Foundry /award after combat): the Table's «Concludi incontro» offers XP and loot", async () => {
  const ctx = await allAreas({ role: "dm" });
  assert.equal(ctx.registry.get("command", "combat-tracker.finish", ctx), null, "only in combat");
  ctx.state.combat.active = true;
  const finish = ctx.registry.get("command", "combat-tracker.finish", ctx);
  assert.ok(finish, "the tracker's finish flow is a command");
  const dialogs = [];
  ctx.dialog = (title, body, options) => dialogs.push({ title, body, options });
  ctx.registry.run(finish, ctx);
  assert.match(dialogs.at(-1).body, /Sconfitti e PE/);
  assert.match(dialogs.at(-1).body, /bottino/i);
  const table = readFileSync(new URL("../table.mjs", import.meta.url), "utf8");
  assert.match(table, /get\("command", "combat-tracker\.finish", ctx\)/);
});

test("P2 F16 (Foundry and Roll20: the roll request and the GM-only roll beside the chat; palette synonyms)", async () => {
  const ctx = await allAreas({ role: "dm" });
  const request = ctx.registry.get("command", "dice-tray.request", ctx);
  const secret = ctx.registry.get("command", "dice-tray.secret", ctx);
  assert.ok(request && secret);
  const words = (c) =>
    [c.label.it, ...(c.keywords ?? []).map((k) => (typeof k === "object" ? k.it : k))].join(" ");
  assert.match(words(secret), /segreto/);
  assert.match(words(request), /prova contrapposta/);
  const award = ctx.registry.get("command", "loot-award", ctx);
  assert.match(words(award), /bottino/);
  const { searchPalette } = await import("../command-palette.mjs");
  const top = (q) =>
    searchPalette(ctx, q)
      .items.map((i) => i.key)
      .slice(0, 3);
  assert.ok(top("bottino").includes("command:loot-award"), top("bottino").join());
  assert.ok(top("segreto").includes("command:dice-tray.secret"), top("segreto").join());
  // The chat composer of the DM carries «Chiedi un tiro».
  const chat = readFileSync(new URL("../chat.mjs", import.meta.url), "utf8");
  assert.match(chat, /data-chat-request/);
});

// ---------------------------------------------------------------- P2 F20: campaign overview

test("P2 F20 (Kanka: the campaign's commands live in its sidebar): the overview does not repeat «Entra al Tavolo»", async () => {
  const party = await import("../party.mjs");
  const ctx = await allAreas({ role: "dm" });
  ctx.view = { page: "campaign", id: "", tab: "" };
  assert.doesNotMatch(party.renderDashboard(ctx), /Entra al Tavolo/);
  ctx.role = "player";
  assert.doesNotMatch(party.renderDashboard(ctx), /Entra al Tavolo/);
  // On a phone the header card names the campaign; the sidebar above it does not repeat it.
  const css = cssOf("styles.css");
  assert.match(css, /\.workspace\.with-sidebar:has\(\.party-dashboard\) \.campaign-sidebar > h2/);
});

// ---------------------------------------------------------------- P2 F22: the DM's Home

test("P2 F22 (Roll20 «My Games»: the game with Launch and the GM's tools): the DM's Home speaks to the DM", async () => {
  const { renderHome } = await import("../home-ui.mjs");
  const dm = await allAreas({ role: "dm" });
  dm.view = { page: "home", id: "", tab: "" };
  const html = renderHome(dm);
  assert.doesNotMatch(html, /Ritrova il tuo personaggio/);
  assert.match(html, /data-nav="preparation"/);
  const player = await allAreas({ role: "player" });
  player.view = { page: "home", id: "", tab: "" };
  assert.match(renderHome(player), /Ritrova il tuo personaggio/);
});

// ---------------------------------------------------------------- P2 F21: player-facing words

test("P2 F21 (D&D Beyond's tone: action sentences, the technical note behind «Perché?»)", () => {
  const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
  const visible = [
    ["combat.mjs", /Preview disponibile/],
    ["characters.mjs", /"Concessione annotata"/],
    ["spells-plus.mjs", /"Concessione annotata"/],
    ["character-builder.mjs", /Deroga esplicita/],
    ["app.mjs", /Correzione registrata\./],
    ["campaign.mjs", /Voci accessibili/],
  ];
  for (const [file, pattern] of visible) assert.doesNotMatch(src(file), pattern, file);
  // The builder's technical note stays, folded behind a question.
  assert.match(src("character-builder.mjs"), /Perché alcune capacità non agiscono da sole\?/);
});

// ---------------------------------------------------------------- P2 F10: a number rolls on click

test("P2 F10 (D&D Beyond: clicking a modifier rolls; Advantage from the right-click menu)", async () => {
  const { harness } = await import("./p2-harness.mjs");
  const sheet = await import("../sheet-plus.mjs");
  const h = harness();
  h.ctx.rollDie = () => 9;
  const record = sheet.rollFromNumber(h.ctx, "livia", "skill", "perception");
  assert.equal(record.values[0], 9);
  assert.equal(h.dialogs.length, 0, "a plain click rolls at once");
  // Physical dice keep the window (the faces are typed there).
  const physical = sheet.rollFromNumber(h.ctx, "livia", "skill", "perception", { physical: true });
  assert.equal(physical, null);
  assert.equal(h.dialogs.length, 1);
  const source = readFileSync(new URL("../sheet-plus.mjs", import.meta.url), "utf8");
  assert.match(source, /if \(action === "roll"\)[\s\S]{0,200}rollFromNumber\(/);
  assert.match(source, /\[data-shp="use"\]\[data-fav\], \[data-shp="roll"\]/);
});

test("P2 F10 (D&D Beyond Spells: the list right under the tabs): the preamble is compact", async () => {
  const { harness } = await import("./p4-harness.mjs");
  const SP = await import("../spells-plus.mjs");
  const L = await import("../character-library.mjs");
  const IP = await import("../inventory-plus.mjs");
  const h = harness({
    role: "player",
    areas: [
      ["character-library", L.register],
      ["inventory-plus", IP.register],
      ["spells-plus", SP.register],
    ],
    view: { page: "characters", id: "livia", tab: "spells" },
  });
  const html = SP.renderSpellsTab(h.ctx, h.ctx.state.actors.livia);
  assert.ok(html, "the Spells tab renders");
  // A closed preparation window is one line; its explanation sits behind «Perché?».
  assert.match(html, /class="spl-window is-closed"[\s\S]*?<details class="spl-window-why">/);
  // No concentration: one line with its command.
  assert.match(html, /class="concentration-summary spl-concentration is-idle"/);
});

test("P2 F10 (D&D Beyond Inventory: the items under the tabs, the encumbrance rule in settings)", async () => {
  const { harness } = await import("./p4-harness.mjs");
  const IP = await import("../inventory-plus.mjs");
  const L = await import("../character-library.mjs");
  const h = harness({
    role: "player",
    areas: [
      ["character-library", L.register],
      ["inventory-plus", IP.register],
    ],
    view: { page: "characters", id: "livia", tab: "inventory" },
  });
  IP.resetViews();
  const html = IP.renderTab(h.ctx, h.ctx.state.actors.livia);
  // The encumbrance choice sits with its rule, folded; the view options fold too.
  assert.match(
    html,
    /<details class="invp-details invp-rule"><summary>[^<]*<\/summary>[\s\S]*?data-invp-encumbrance/,
    "folded by default",
  );
  assert.match(
    html,
    /<details class="invp-view"[^>]*><summary>[\s\S]*?data-invp-rarity[\s\S]*?data-invp-sort/,
  );
  // The filters and the search stay in sight.
  assert.match(html, /class="invp-toolbar" role="search"><label class="field invp-search">/);
});

test("P2 F10: an option changed right after opening «Visualizzazione» keeps it open (no toggle race)", async () => {
  const IP = await import("../inventory-plus.mjs");
  IP.resetViews();
  const listeners = [];
  const on = (target) => (type, fn, capture) => listeners.push({ target, type, fn, capture });
  const details = { open: true, addEventListener: () => {} }; // opened; «toggle» not yet fired
  const rule = { open: false, addEventListener: () => {} };
  const rarity = { value: "rare" };
  rarity.addEventListener = on(rarity);
  const el = {
    querySelector: (sel) =>
      ({ "details.invp-view": details, "details.invp-rule": rule, "[data-invp-rarity]": rarity })[
        sel
      ] ?? null,
    contains: () => true,
  };
  el.addEventListener = on(el);
  let seen = null;
  const ctx = { render: () => (seen = IP.viewOf("livia").optionsOpen), state: { actors: {} } };
  IP.bindTab(el, ctx, { id: "livia" });
  const event = { type: "change", target: rarity };
  for (const l of listeners.filter((x) => x.type === "change" && x.target === el && x.capture))
    l.fn(event);
  for (const l of listeners.filter((x) => x.type === "change" && x.target === rarity)) l.fn(event);
  assert.equal(seen, true, "the redraw keeps the options open");
});

// ---------------------------------------------------------------- P2 F11: the sheet on a phone

test("P2 F11 (D&D Beyond mobile: one-line header, quick boxes on the main page only)", async () => {
  const { renderCharacters } = await import("../characters.mjs");
  const ctx = await allAreas({ role: "player" });
  ctx.view = { page: "characters", id: "livia", tab: "skills" };
  const html = renderCharacters(ctx);
  assert.match(
    html,
    /class="character-sheet" data-character-page="skills" data-character-category="[a-z-]+"/,
  );
  const css = cssOf("characters.css");
  // The quick boxes stay on «Caratteristiche» and on the Actions page, not above the others.
  assert.match(
    css.replace(/\s+/g, " "),
    /\.character-sheet:not\(\[data-character-page="abilities"\]\):not\( ?\[data-character-page="tab"\]\[data-character-category="actions"\] ?\)/,
  );
  // Close review 01/10 (exposure P2): on a phone the breadcrumb and the sheet's commands wrap
  // instead of scrolling out of the screen, so «Gestisci personaggio» stays in view.
  assert.match(css, /\.character-breadcrumb \{[^}]*flex-wrap: wrap/);
  assert.doesNotMatch(css, /\.character-breadcrumb \{[^}]*overflow-x: auto/);
});

test("P2 F11: a strip scrolled to its open tab never cuts the first visible tab (whole tabs, as D&D Beyond)", async () => {
  const { scrollIntoStrip } = await import("../ui.mjs");
  // A 240 px strip holding tabs of 140, 80, 76 and 73 px; the open one (third) ends at 296.
  const widths = [140, 80, 76, 73];
  const starts = widths.map((_, i) => widths.slice(0, i).reduce((a, b) => a + b, 0));
  const strip = {
    scrollLeft: 0,
    scrollTop: 0,
    getBoundingClientRect: () => ({ left: 0, right: 240, top: 0, bottom: 44 }),
  };
  const tabs = widths.map((w, i) => ({
    getBoundingClientRect: () => ({
      left: starts[i] - strip.scrollLeft,
      right: starts[i] + w - strip.scrollLeft,
      top: 0,
      bottom: 44,
    }),
  }));
  strip.children = tabs;
  scrollIntoStrip(strip, tabs[2]);
  assert.equal(strip.scrollLeft, 140, "scrolled to the start of the next whole tab");
  assert.ok(tabs[2].getBoundingClientRect().right <= 240);
});

// ---------------------------------------------------------------- P2 F18: the Table on a phone

test("P2 F18 (Owlbear: the map first, the hint as a snackbar; BG3's map on entering)", () => {
  const css = cssOf("styles.css");
  // The phone's map message is a snackbar above the action bar, shown while fresh.
  const phoneNote =
    /@media \(max-width: 720px\) \{[\s\S]*?\.map-container > \.map-caption > #map-message \{([^}]*)\}/.exec(
      css,
    )?.[1] ?? "";
  assert.match(phoneNote, /position: fixed/);
  assert.match(phoneNote, /bottom: var\(--map-message-bottom/);
  assert.match(css, /#map-message\.is-fresh/);
  assert.doesNotMatch(
    css,
    /\.table-layout:has\(> \.initiative\) \.map-container > \.map-caption > #map-message \{\s*top: 116px;/,
  );
  const table = readFileSync(new URL("../table.mjs", import.meta.url), "utf8");
  // Entering the Table on a phone brings the map into view once (the map link does the same).
  assert.match(table, /phoneMapShown/);
  // Tab labels in the phone bar are ellipsised, so whole tabs fit (no «Sce»).
  const labels = [...css.matchAll(/\.table-tab-label \{([^}]*)\}/g)].map((m) => m[1]);
  assert.ok(labels.some((rule) => /text-overflow: ellipsis/.test(rule)));
});

test("P2 F19 (Kanka mobile: one navigation bar, the rest in the menu): Preparation on a phone", () => {
  const css = cssOf("styles.css");
  assert.match(
    css,
    /\.workspace\.with-sidebar:has\(\.prep-groups\) \.campaign-sidebar \.campaign-sections > nav \{\s*display: none;/,
  );
  assert.match(css, /\.workspace\.with-sidebar \.campaign-sidebar > h2,/);
});

// ---------------------------------------------------------------- P2 F17 / P3 F23: one dice control, one result

test("P2 F17 / P3 F23: the potion asks digital or physical dice as the roll window does, and says what it healed", async () => {
  const { harness } = await import("./p2-harness.mjs");
  const { usePotion } = await import("../characters.mjs");
  const h = harness();
  h.ctx.rollDie = () => 3;
  const potion = h.ctx.state.actors.livia.inventory.find((row) => row.healing);
  assert.ok(potion, "Livia carries a healing potion");
  usePotion(h.ctx, "livia", potion.id);
  const dialog = h.dialogs.at(-1);
  assert.match(dialog.body, /<input type="radio" name="mode" value="digital" checked>/);
  assert.doesNotMatch(dialog.body, /<select name="mode">/);
  const before = h.ctx.state.actors.livia.hp;
  const data = new FormData();
  data.append("mode", "digital");
  dialog.options.onSubmit(data);
  const after = h.ctx.state.actors.livia.hp;
  const toast = h.toasts.at(-1)?.text ?? "";
  assert.match(toast, new RegExp(`PF ${before} → ${after}`), toast);
  // The heading pairs, one name per concept (F17).
  const { TABLE_SIDEBAR_SECTIONS, CAMPAIGN_SECTION_GROUPS, PREPARATION_GROUPS } =
    await import("../registry.mjs");
  const name = (list, id) =>
    list.find((row) => row.id === id)?.label?.it ?? list.find((row) => row.id === id)?.it;
  assert.notEqual(name(TABLE_SIDEBAR_SECTIONS, "journal"), "Diario");
  assert.notEqual(name(CAMPAIGN_SECTION_GROUPS, "world"), "Mondo");
  assert.doesNotMatch(String(name(PREPARATION_GROUPS, "sessions")), /Sessioni/);
});

// ---------------------------------------------------------------- P3: no research codes on screen

test("P3 (integrations.withoutIds): no research code reaches a visible string", () => {
  const code = /\b(?:CRP|R20|FVT|CMP|DDB|VTL|SVC)-\d{2,3}\b/;
  for (const file of ["knowledge.mjs", "encounter-builder.mjs"]) {
    const visible = readFileSync(new URL(`../${file}`, import.meta.url), "utf8")
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\*|\/\*\*)/.test(line));
    const hits = visible.filter((line) => code.test(line) && /(t\(|`|")/.test(line));
    assert.deepEqual(
      hits.map((l) => l.trim().slice(0, 80)),
      [],
      file,
    );
  }
});

test("P3 (CA-57 playedBy, Owlbear one name per player): a whisper names its readers by the characters they play", async () => {
  const { readerLabel } = await import("../chat-domain.mjs");
  const state = seededMembers();
  assert.equal(readerLabel(state, "player", "it"), "Livia, Mira · Giocatore");
  assert.equal(readerLabel(state, "dm", "it"), "DM");
});

test("P3 (state.mjs acceptedRolls convention): a tray roll «Io e il DM» reaches the DM's 3D history too", async () => {
  const domain = await import("../dice-tray-domain.mjs");
  const { rollVisibleTo } = await import("../registry.mjs");
  const base = {
    id: "r1",
    kind: "free",
    by: "player",
    actorId: "livia",
    actorName: "Livia",
    mode: "digital",
    groups: [{ sides: 20, faces: [{ value: 13, kept: true }] }],
    values: [13],
    constant: 0,
    stack: [],
    natural: 13,
    total: 13,
  };
  const gm = domain.rollEvent({ ...base, audience: "gm" });
  assert.equal(rollVisibleTo(gm, "player"), true, "the roller sees it");
  assert.equal(rollVisibleTo(gm, "dm"), true, "the DM sees it");
  const blind = domain.rollEvent({ ...base, audience: "blind" });
  assert.equal(rollVisibleTo(blind, "player"), false);
  assert.equal(rollVisibleTo(blind, "dm"), true);
  const self = domain.rollEvent({ ...base, audience: "self" });
  assert.equal(rollVisibleTo(self, "dm"), false, "«Solo io» stays the roller's");
});

test("P3 TV-14 (Foundry and Roll20: double-click a token opens its sheet)", () => {
  const table = readFileSync(new URL("../table.mjs", import.meta.url), "utf8");
  // Close review 01/10: the double press is read on the map itself (openFromToken), and the
  // browser's dblclick stays as a second way in; both open the same thing.
  const bind = table.slice(table.indexOf("openFromToken = (id) =>"));
  assert.ok(bind.length > 0, "the map opens a token on a double press");
  assert.match(bind.slice(0, 900), /openSheetOverlay\(ctx, id, "actions"\)/);
  assert.match(bind.slice(0, 900), /showTab\("creature"/);
  assert.match(table, /svg\.addEventListener\?\.\("dblclick"/);
});

test("P3 F26 (DESIGN §2: labels in all-small-caps, never text-transform)", async () => {
  const { readdirSync } = await import("node:fs");
  const dir = new URL("../", import.meta.url);
  const offenders = readdirSync(dir)
    .filter((f) => f.endsWith(".css"))
    .filter((f) => /text-transform:\s*uppercase/.test(readFileSync(new URL(f, dir), "utf8")));
  assert.deepEqual(offenders, []);
});

test("P3 F26 C2-4 (Foundry «Game Settings»: the scope once, as the group heading)", () => {
  const prefs = readFileSync(new URL("../preferences.mjs", import.meta.url), "utf8");
  const block = prefs.slice(
    prefs.indexOf("heading.insertAdjacentHTML"),
    prefs.indexOf("heading.insertAdjacentHTML") + 200,
  );
  assert.match(
    block,
    /visually-hidden/,
    "the category heading's chip is for assistive technology only",
  );
});

test("P3 F26 C2-3 (D&D Beyond: the HP number opens HP management): the sheet's HP box loses its extra line", async () => {
  const W = await import("../hp-widget.mjs");
  const ctx = await allAreas({ role: "player" });
  const box = W.hpWidgetHTML(ctx, "livia", { surface: "sheet", compact: true });
  assert.match(box, /data-dt-heal/);
  assert.doesNotMatch(box, /data-dt-manage/);
  const chars = readFileSync(new URL("../characters.mjs", import.meta.url), "utf8");
  const hp = chars.slice(
    chars.indexOf('if (action === "hp-correct")'),
    chars.indexOf('if (action === "hp-correct")') + 300,
  );
  assert.doesNotMatch(hp, /mode: "correct"/, "the number opens the full HP management");
  // A change's message is transient (a notice, not a line that stays after a level up).
  assert.match(readFileSync(new URL("../hp-widget.mjs", import.meta.url), "utf8"), /STATUS_TTL/);
});

test("P3 F26 C2-5 (D&D Beyond «My Characters», Kanka cards: each card its own height)", () => {
  const rule = declarations(cssOf("home.css"), ".home-page .home-bottom");
  assert.equal(rule["align-items"], "start");
});

test("P3 F27 (Foundry and Owlbear menu rows carry real icons): area rows show their icon, not «⋯»", async () => {
  const TM = await import("../token-menu.mjs");
  assert.equal(typeof TM.menuIconFor, "function");
  const more = TM.menuIconFor({ id: "unknown-area-row" });
  assert.notEqual(TM.menuIconFor({ id: "damage-tray-hp" }), more, "Punti ferita…");
  assert.notEqual(TM.menuIconFor({ id: "knowledge-examine" }), more, "Esamina");
  assert.notEqual(TM.menuIconFor({ id: "regions-search", icon: "search" }), more, "Cerca");
  assert.notEqual(TM.menuIconFor({ id: "loot-open", icon: "bag" }), more, "Bottino");
});

test("P3 F28: the encounter budget labels wrap between words, never «INCON-TRO»", () => {
  const rule = declarations(cssOf("encounter-builder.css"), ".eb-budget dt");
  assert.notEqual(rule.hyphens, "auto");
});

test("P3 F24 (Owlbear and Foundry: the distance beside the dragged token)", async () => {
  const { dragDistanceLabel } = await import("../table.mjs");
  const svg = dragDistanceLabel({ target: { x: 300, y: 200 }, distance: 7.5 }, "it");
  assert.match(svg, /data-drag-distance/);
  assert.match(svg, />7,5 m</);
  // Above the token, clear of its name (drawn under the token).
  assert.match(svg, /y="16[0-9]"/);
});

// ---------------------------------------------------------------- P3 SV-02/SV-03: natural words

test("P3 SV-02/SV-03 (Alchemy OmniSearch aliases, Kanka search words): natural Italian searches find the function", async () => {
  const { searchPalette } = await import("../command-palette.mjs");
  const dm = await allAreas({ role: "dm" });
  const player = await allAreas({ role: "player" });
  const first = (ctx, q) => searchPalette(ctx, q).items.find((i) => i.type !== "filter");
  const words = [
    "veicoli",
    "sintonia",
    "contenitore",
    "non identificato",
    "trascrivi",
    "multiclasse",
    "salire di livello",
    "prova contrapposta",
    "dadi 3D",
    "sondaggio",
    "presenze",
    "lista d'attesa",
    "rinforzi",
    "azioni leggendarie",
    "linee e veli",
    "elimina account",
    "candidatura",
    "aiutare",
    "preparare un'azione",
    "cadere",
    "turni di guardia",
    "schermo fisico",
    "istantanea della scena",
    "pedine numerate",
    "immagini alternative",
    "posizioni della camera",
    "incontro casuale",
    "magie condivise",
  ];
  const missing = words.filter((q) => !first(dm, q) && !first(player, q));
  assert.deepEqual(missing, []);
  // «saltare» finds jumping first, not «Salvare i morenti».
  const jump = first(player, "saltare");
  assert.doesNotMatch(JSON.stringify(jump.title), /Salvare i morenti/);
});
