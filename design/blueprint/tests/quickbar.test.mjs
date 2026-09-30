// B53 — Personal commands and quick bar. Pure domain (formulas, bars, runs, permissions,
// sharing, custom actions) and the UI handlers the bound controls call, on the real store
// and registry (seed, commit, Undo with preserved roll evidence, reload). Synthetic data.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore, createInitialState } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import * as D from "../quickbar-domain.mjs";
import * as Q from "../quickbar.mjs";

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
// Faces the "digital dice" return, in order (the core service is replaced in tests only).
function dice(...faces) {
  const queue = [...faces];
  return (sides) => {
    const face = queue.length ? queue.shift() : 1;
    assert.ok(face >= 1 && face <= sides, `test face ${face} for d${sides}`);
    return face;
  };
}
function harness({ role = "player", lang = "it" } = {}) {
  const storage = memory();
  const emitted = [];
  const boot = () => {
    const registry = createRegistry();
    registry.use("quickbar", Q.register);
    registry.on("roll-accepted", (payload) => emitted.push(payload));
    const store = createStore({ storage });
    if (registry.initState(store.state).changed) store.persist();
    return { registry, store };
  };
  let { registry, store } = boot();
  const toasts = [],
    dialogs = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    offline: false,
    view: { page: "table" },
    t: (it, en) => (ctx.lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object"
        ? (value[ctx.lang] ?? value.it ?? value.en ?? "")
        : String(value ?? ""),
    esc,
    icon: (name) => `<i data-icon="${name}"></i>`,
    toast: (text, error = false) => toasts.push({ text, error }),
    dialog: (title, body, options = {}) => dialogs.push({ title, body, options }),
    closeDialog() {},
    render() {
      ctx.rendered = (ctx.rendered ?? 0) + 1;
    },
    openSheet(id, tab) {
      ctx.opened = { id, tab };
    },
    canControl: (actor) => canControlActor(actor, ctx.role, store.state),
    commit(label, mutator, options = {}) {
      if (ctx.offline && !options.local)
        throw Object.assign(Error("You are offline"), {
          it: "Sei senza rete: questa modifica condivisa non può essere applicata.",
          en: "You are offline: this shared change cannot be applied.",
        });
      store.commit(label, mutator, ctx.role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      if (options.afterCommit) {
        options.afterCommit(store.state);
        store.persist();
      }
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
  const h = {
    ctx,
    toasts,
    dialogs,
    emitted,
    get store() {
      return store;
    },
    get slice() {
      return store.state.ext.quickbar;
    },
    get rolls() {
      return store.state.ext["quickbar-rolls"].rolls;
    },
    reload() {
      ({ registry, store } = boot());
    },
    submit(fields) {
      const dialog = dialogs.at(-1);
      assert.ok(dialog, "no dialog open");
      return dialog.options.onSubmit(form(fields));
    },
    as(next) {
      ctx.role = next;
      Q.resetQuickbarUI();
      return h;
    },
    bar(actorId = "livia") {
      return D.barOf(store.state.ext.quickbar, ctx.role, actorId);
    },
    slotAt(index, actorId = "livia", page = 0) {
      return h.bar(actorId).pages[page].slots[index];
    },
    // A bound Table as table.mjs hands it to the dock's bind (keys 1–0 read it).
    table(actorId = "livia", clicked = []) {
      const table = {
        selectedActorId: actorId,
        root: {
          isConnected: true,
          // The Table's action buttons; no dice selector unless a test provides one.
          querySelector: (selector) =>
            selector === "[data-combat-mode]" ? null : { click: () => clicked.push(selector) },
        },
      };
      Q.bindDock({ querySelector: () => null }, ctx, table);
      return table;
    },
  };
  Q.resetQuickbarUI();
  Q.setQuickbarPrefs(role, { dice: "digital", d20: "normal", hidden: false, page: {} });
  return h;
}
const errorsOf = (h) => h.toasts.filter((t) => t.error).map((t) => t.text);
function startCombat(h, turnActor = "livia") {
  const role = h.ctx.role;
  h.ctx.role = "dm";
  h.ctx.commit("Combattimento", (s) => {
    s.combat.active = true;
    s.combat.turn = s.combat.order.indexOf(turnActor);
    for (const id of s.combat.order) {
      s.actors[id].action = true;
      s.actors[id].bonus = true;
      s.actors[id].reaction = true;
    }
  });
  h.ctx.role = role;
}

// ------------------------------------------------------------------ domain

test("formulas are validated live like Dice+: incomplete, wrong die, d20 test or sum", () => {
  assert.equal(D.parseFormula("1d20+").ok, false);
  assert.match(D.parseFormula("1d20+").error.it, /incompleta/);
  assert.match(D.parseFormula("1d7+2").error.en, /d7 does not exist/);
  assert.equal(D.parseFormula("-1d6").ok, false);
  assert.equal(D.parseFormula("5").ok, false);
  assert.equal(D.parseFormula("1d6+1d6+1d6+1d6+1d6").ok, false, "at most 4 groups");
  assert.equal(D.parseFormula("21d6").ok, false);
  const d20 = D.parseFormula(" d20 − 1 ");
  assert.deepEqual([d20.ok, d20.d20, d20.text], [true, true, "1d20-1"]);
  const sum = D.parseFormula("2d6+1d4+3");
  assert.deepEqual([sum.d20, sum.modifier, sum.groups.length], [false, 3, 2]);
});

test("seed: Livia's combat page, Mira's nature rolls, Doran's checks and his longsword", () => {
  const slice = D.seedQuickbar(createInitialState());
  const livia = slice.bars.player.livia.pages[0];
  assert.equal(livia.slots.length, D.SLOT_COUNT);
  assert.deepEqual(
    livia.slots.filter(Boolean).map((s) => s.ref.actionId),
    ["fire-bolt", "magic-missile", "quarterstaff"],
  );
  assert.equal(slice.bars.player.mira.pages[0].slots[0].ref.formula, "1d20+5");
  assert.equal(slice.bars.dm.doran.pages[0].slots[0].ref.type, "save");
  const sword = slice.customActions.doran[0];
  assert.equal(sword.name, "Attacco con spada");
  assert.equal(sword.srdId, "srd2024:item:longsword");
  // Normalisation is idempotent and refuses a future version.
  assert.deepEqual(D.normalizeQuickbar(D.normalizeQuickbar(slice)), D.normalizeQuickbar(slice));
  assert.throws(() => D.normalizeQuickbar(slice, D.VERSION + 1));
});

test("custom actions: DDB-style to-hit and damage from the sheet; SRD templates; control", () => {
  const state = createInitialState();
  const slice = D.seedQuickbar(state);
  const sword = D.customView(state, "doran", slice.customActions.doran[0]);
  // Doran: Strength 10 (+0), proficiency +2 → +2 to hit, 1d8 slashing.
  assert.equal(sword.toHit, 2);
  assert.equal(sword.summary.it, "+2 per colpire · 1d8 taglienti");
  const grasp = D.templateAction(state, "livia", "srd2024:spell:shocking-grasp");
  assert.equal(grasp.attack.ability, "int", "a spell uses the spellcasting ability");
  assert.equal(grasp.damage.dice, "1d8");
  assert.equal(grasp.damage.type, "lightning");
  assert.equal(D.customView(state, "livia", grasp).toHit, 5, "INT +3, proficiency +2");
  assert.throws(() => D.validateCustomAction({ name: "", activation: "action" }), /Name/);
  assert.throws(
    () =>
      D.validateCustomAction({
        name: "X",
        activation: "action",
        damage: { dice: "1d7", type: "fire" },
      }),
    /Invalid damage dice/,
  );
  assert.throws(
    () => D.saveCustomAction(state, slice, "player", "doran", grasp, { now: "t" }),
    /only sheets you control/,
  );
  const saved = D.saveCustomAction(
    state,
    slice,
    "player",
    "livia",
    { ...grasp, name: "Stretta folgorante" },
    { now: "t" },
  );
  assert.equal(slice.customActions.livia[0].id, saved.id);
});

test("bars: add, swap on move, rename and colour, remove; each identity has its own bar", () => {
  const state = createInitialState();
  const slice = D.seedQuickbar(state);
  const added = D.addSlot(state, slice, "player", "livia", {
    kind: "check",
    ref: { ability: "dex", type: "check" },
  });
  assert.equal(added.index, 3, "first free slot");
  assert.throws(
    () =>
      D.addSlot(state, slice, "player", "livia", {
        kind: "roll",
        ref: { formula: "1d20+" },
        label: "X",
      }),
    /Incomplete formula/,
  );
  assert.throws(
    () =>
      D.addSlot(
        state,
        slice,
        "player",
        "livia",
        { kind: "check", ref: { ability: "dex", type: "check" } },
        { index: 0 },
      ),
    /slot is taken/,
  );
  const dex = added.slot.id;
  assert.equal(D.moveSlot(state, slice, "player", "livia", dex, { page: 0, index: 0 }), true);
  const slots = slice.bars.player.livia.pages[0].slots;
  assert.equal(slots[0].id, dex);
  assert.equal(slots[3].ref.actionId, "fire-bolt", "Foundry/Roll20 swap the two buttons");
  D.updateSlot(state, slice, "player", "livia", dex, { label: "Agilità", color: "blue" });
  assert.deepEqual([slots[0].label, slots[0].color], ["Agilità", "blue"]);
  assert.throws(
    () => D.updateSlot(state, slice, "player", "livia", dex, { color: "pink" }),
    /Invalid colour/,
  );
  D.removeSlot(state, slice, "player", "livia", dex);
  assert.equal(slots[0], null);
  // The player cannot touch Doran's bar; the DM's bar for Livia is a different bar.
  assert.throws(
    () =>
      D.addSlot(state, slice, "player", "doran", {
        kind: "check",
        ref: { ability: "str", type: "check" },
      }),
    /do not control Doran/,
  );
  assert.ok(D.barOf(slice, "dm", "livia").virtual, "the DM has no bar for Livia yet");
  assert.equal(D.barOf(slice, "dm", "livia").pages[0].slots.filter(Boolean).length, 0);
  // Pages: at most five; the last one cannot be removed.
  for (let i = 0; i < 4; i++) D.addPage(state, slice, "player", "livia", `P${i + 2}`);
  assert.throws(() => D.addPage(state, slice, "player", "livia", "P6"), /At most 5 pages/);
  while (slice.bars.player.livia.pages.length > 1) D.removePage(state, slice, "player", "livia", 1);
  assert.throws(() => D.removePage(state, slice, "player", "livia", 0), /at least one page/);
});

test("availability: an unequipped staff or a removed custom action marks the slot, with the reason", () => {
  const state = createInitialState();
  const slice = D.seedQuickbar(state);
  const staff = slice.bars.player.livia.pages[0].slots[2];
  assert.equal(D.slotStatus(state, slice, "livia", staff).available, true);
  state.actors.livia.inventory.find((i) => i.id === "staff").equipped = false;
  const status = D.slotStatus(state, slice, "livia", staff);
  assert.equal(status.available, false);
  assert.match(status.reason.it, /non disponibile/);
  const sword = D.addSlot(state, slice, "dm", "doran", {
    kind: "custom",
    ref: { customId: "qb-doran-longsword" },
  });
  D.removeCustomAction(state, slice, "dm", "doran", "qb-doran-longsword");
  assert.match(D.slotStatus(state, slice, "doran", sword.slot).reason.en, /removed from the sheet/);
});

test("runs: attack then damage; a natural 20 doubles the damage dice (SRD 5.2.1 EN 179 / IT 205)", () => {
  const state = createInitialState();
  const slice = D.seedQuickbar(state);
  const rolls = D.emptyRolls();
  const { slot } = D.addSlot(state, slice, "dm", "doran", {
    kind: "custom",
    ref: { customId: "qb-doran-longsword" },
  });
  const run = D.startRun(state, slice, "dm", "doran", slot.id, { mode: "digital", now: "t" });
  const { records } = D.runSteps(state, slice, rolls, "dm", run.id, {
    die: dice(20, 3, 5),
    now: "t",
  });
  assert.equal(run.status, "done");
  assert.deepEqual(
    records.map((r) => r.rollKind),
    ["attack", "damage"],
  );
  assert.equal(records[0].total, 22);
  assert.equal(records[1].plan.dice.length, 2, "two d8 on a critical hit");
  assert.equal(records[1].total, 8);
  const log = D.logRollOf(state, records[1]);
  assert.deepEqual(
    [log.source, log.kind, log.critical, log.dice[0].count],
    ["quickbar", "damage", true, 2],
  );
});

test("permissions per step: one Action per turn, not your turn, Incapacitated; the Action is spent", () => {
  const state = createInitialState();
  const slice = D.seedQuickbar(state);
  const rolls = D.emptyRolls();
  const customId = D.saveCustomAction(
    state,
    slice,
    "player",
    "livia",
    {
      ...D.templateAction(state, "livia", "srd2024:spell:shocking-grasp"),
      name: "Stretta folgorante",
    },
    { now: "t" },
  ).id;
  const { slot } = D.addSlot(state, slice, "player", "livia", {
    kind: "sequence",
    label: "Doppia stretta",
    ref: {
      steps: [
        { kind: "custom", customId },
        { kind: "custom", customId },
      ],
    },
  });
  state.combat.active = true;
  state.combat.turn = 0; // Livia
  const run = D.startRun(state, slice, "player", "livia", slot.id, { mode: "digital", now: "t" });
  D.runSteps(state, slice, rolls, "player", run.id, { die: dice(12, 4), now: "t" });
  assert.equal(run.status, "blocked");
  assert.deepEqual(
    run.steps.map((s) => s.status),
    ["done", "done", "blocked", "skipped"],
  );
  assert.match(run.steps[2].reason.it, /Azione già usata/);
  assert.equal(state.actors.livia.action, false, "the first attack spent the Action");
  // Not Livia's turn.
  state.actors.livia.action = true;
  state.combat.turn = 1;
  const other = D.startRun(state, slice, "player", "livia", slot.id, { mode: "digital", now: "t" });
  D.runSteps(state, slice, rolls, "player", other.id, { die: dice(10), now: "t" });
  assert.match(other.steps[0].reason.en, /not Livia's turn/);
  // Incapacitated (SRD 5.2.1 EN 184 / IT 208): no actions at all.
  state.combat.active = false;
  state.actors.livia.conditions = ["incapacitated"];
  const third = D.startRun(state, slice, "player", "livia", slot.id, { mode: "digital", now: "t" });
  D.runSteps(state, slice, rolls, "player", third.id, { die: dice(10), now: "t" });
  assert.match(third.steps[0].reason.it, /Incapacitato.*EN 184 \/ IT 208/);
});

test("physical steps wait for faces; stop needs a reason; digital faces cannot be corrected", () => {
  const state = createInitialState();
  const slice = D.seedQuickbar(state);
  const rolls = D.emptyRolls();
  const { slot } = D.addSlot(state, slice, "player", "livia", {
    kind: "sequence",
    label: "Agguato",
    ref: {
      steps: [
        { kind: "check", ability: "dex", type: "check" },
        { kind: "roll", formula: "1d20+5", label: "Arcano" },
        { kind: "check", ability: "wis", type: "save" },
      ],
    },
  });
  const run = D.startRun(state, slice, "player", "livia", slot.id, { mode: "physical", now: "t" });
  assert.throws(
    () => D.runSteps(state, slice, rolls, "player", run.id, { faces: [21], now: "t" }),
    /physical die face/,
  );
  D.runSteps(state, slice, rolls, "player", run.id, { faces: [13], now: "t" });
  assert.deepEqual([run.status, run.current, run.steps[0].total], ["running", 1, 15]);
  assert.throws(
    () => D.startRun(state, slice, "player", "livia", slot.id, { mode: "digital", now: "t" }),
    /already under way/,
  );
  assert.throws(() => D.stopRun(slice, "player", run.id, "  ", "t"), /Write why you stop/);
  D.stopRun(slice, "player", run.id, "Il DM chiede di fermarsi", "t");
  assert.deepEqual(
    run.steps.map((s) => s.status),
    ["done", "skipped", "skipped"],
  );
  // Reasoned correction of the physical face; the earlier face stays on record.
  const record = rolls.rolls[0];
  assert.throws(
    () => D.correctRoll(slice, rolls, "player", record.id, [9], "", "t"),
    /Write the reason/,
  );
  D.correctRoll(slice, rolls, "player", record.id, [9], "letto male", "t");
  assert.deepEqual([record.values, record.total, record.corrections[0].values], [[9], 11, [13]]);
  const log = D.logRollOf(state, record);
  assert.deepEqual(
    [log.status, log.correctionReason, log.previousValues],
    ["corrected", "letto male", [13]],
  );
  const d = D.startRun(state, slice, "player", "livia", slot.id, { mode: "digital", now: "t" });
  D.runSteps(state, slice, rolls, "player", d.id, { die: dice(5, 6, 7), now: "t" });
  assert.throws(
    () => D.correctRoll(slice, rolls, "player", rolls.rolls.at(-1).id, [1], "x", "t"),
    /Digital faces cannot be edited/,
  );
});

test("sharing a page with Doran is a copy for his player; sheet actions stay; text copy and import", () => {
  const state = createInitialState();
  const slice = D.seedQuickbar(state);
  D.addSlot(state, slice, "player", "livia", {
    kind: "roll",
    ref: { formula: "1d20+5" },
    label: "Arcano",
  });
  D.addSlot(state, slice, "player", "livia", {
    kind: "check",
    ref: { ability: "dex", type: "check" },
  });
  const targets = D.shareTargets(state, "player", "livia").map((a) => a.id);
  assert.ok(targets.includes("doran") && targets.includes("mira") && !targets.includes("goblin-1"));
  const preview = D.sharePreview(state, slice, "player", "livia", 0);
  assert.deepEqual([preview.copied.length, preview.skipped.length], [2, 3]);
  const result = D.sharePage(state, slice, "player", "livia", 0, "doran", "t");
  assert.deepEqual(result.recipients, ["dm"]);
  const copy = slice.bars.dm.doran.pages.at(-1);
  assert.equal(copy.sharedFrom.actorName, "Livia");
  assert.deepEqual(
    copy.slots.filter(Boolean).map((s) => s.kind),
    ["roll", "check"],
  );
  // A copy: renaming Livia's slot does not change Doran's.
  const original = slice.bars.player.livia.pages[0].slots[3];
  D.updateSlot(state, slice, "player", "livia", original.id, { label: "Arcano +" });
  assert.equal(copy.slots[0].label, "Arcano");
  assert.notEqual(copy.slots[0].id, original.id);
  // The check reads the recipient's sheet when it runs.
  state.actors.doran.abilities.dex = 16;
  assert.equal(D.checkBonus(state, "doran", "dex"), 3);
  assert.equal(D.receivedPages(slice, "dm").length, 1);
  // Copy as text and import (Dice+).
  const text = D.pageText(state, slice, "player", "livia", 0, "it");
  assert.equal(text, "Arcano + = 1d20+5");
  assert.throws(() => D.parsePageText("Arcano = 1d20+"), /Line 1 is invalid/);
  const index = D.importPage(
    state,
    slice,
    "player",
    "mira",
    "Da Livia",
    "Arcano = 1d20+5\nFuoco: 2d6",
  );
  assert.deepEqual(
    slice.bars.player.mira.pages[index].slots.filter(Boolean).map((s) => [s.label, s.ref.formula]),
    [
      ["Arcano", "1d20+5"],
      ["Fuoco", "2d6"],
    ],
  );
  // A full recipient bar refuses the copy.
  for (let i = slice.bars.dm.doran.pages.length; i < D.MAX_PAGES; i++)
    D.addPage(state, slice, "dm", "doran", `P${i}`);
  assert.throws(
    () => D.sharePage(state, slice, "player", "livia", 0, "doran", "t"),
    /already has 5 pages/,
  );
});

// ------------------------------------------------------------------ UI handlers

test("dock: the selected creature's bar, keys 1–0, an observer note, the DM never sees the player's bar", () => {
  const h = harness();
  const html = Q.renderDock(h.ctx, { selectedActorId: "livia" });
  assert.equal((html.match(/class="qb-slot[ "]/g) ?? []).length, 10);
  assert.match(html, /aria-keyshortcuts="0"/);
  assert.match(html, /Dardo di fuoco/);
  assert.match(html, /1\/1<\/span><span class="qb-page-label">Combattimento/);
  const mira = Q.renderDock(h.ctx, { selectedActorId: "mira" });
  assert.match(mira, /Percezione/);
  assert.doesNotMatch(mira, /Dardo di fuoco/);
  assert.match(
    Q.renderDock(h.ctx, { selectedActorId: "goblin-1" }),
    /non è sotto il tuo controllo/,
  );
  h.as("dm");
  const dmLivia = Q.renderDock(h.ctx, { selectedActorId: "livia" });
  assert.doesNotMatch(dmLivia, /Dardo di fuoco/, "the player's bar stays the player's");
  assert.match(Q.renderDock(h.ctx, { selectedActorId: "doran" }), /Tiro salvezza su Costituzione/);
  h.ctx.lang = "en";
  assert.match(Q.renderDock(h.ctx, { selectedActorId: "doran" }), /Constitution saving throw/);
});

test("add dialog: live refusal keeps it open; a saved roll becomes a private personal change", () => {
  const h = harness();
  Q.openAdd(h.ctx, "livia", { index: 5 });
  assert.match(h.dialogs.at(-1).body, /Stretta|Dardo di fuoco/);
  assert.throws(
    () =>
      h.submit({ item: "new:roll", rollName: "Arcano", formula: "1d20+", index: 5, color: "gold" }),
    /Incomplete formula/,
  );
  assert.equal(h.slotAt(5), null);
  h.submit({ item: "new:roll", rollName: "Arcano", formula: "1d20+5", index: 5, color: "purple" });
  assert.deepEqual(
    [h.slotAt(5).label, h.slotAt(5).ref.formula, h.slotAt(5).color],
    ["Arcano", "1d20+5", "purple"],
  );
  const entry = h.store.state.log.at(-1);
  assert.equal(entry.visibility, "private", "bar edits are the identity's own");
  // Offline: bar edits still work (local); a shared roll does not.
  h.ctx.offline = true;
  Q.openAdd(h.ctx, "livia", { index: 6 });
  h.submit({ item: "check:dex:check", index: 6, color: "gold", label: "" });
  assert.equal(h.slotAt(6).kind, "check");
  const table = h.table();
  Q.useSlot(h.ctx, table, "livia", h.slotAt(5).id);
  assert.match(errorsOf(h).at(-1), /senza rete/);
  h.ctx.offline = false;
});

test("digital roll: record, log roll, roll-accepted, toast; Undo withdraws and the same attempt reuses faces", () => {
  const h = harness();
  const { slot } = D.addSlot(h.store.state, h.slice, "player", "livia", {
    kind: "roll",
    ref: { formula: "1d20+5" },
    label: "Arcano",
  });
  h.store.persist();
  const table = h.table();
  h.ctx.rollDie = dice(12);
  Q.useSlot(h.ctx, table, "livia", slot.id);
  const record = h.rolls.at(-1);
  assert.deepEqual([record.values, record.total, record.mode], [[12], 17, "digital"]);
  const entry = h.store.state.log.at(-1);
  assert.equal(entry.label, "Livia · Arcano: 1d20 + 5 → [12] = 17 (dadi digitali)");
  assert.equal(entry.rolls[0].source, "quickbar");
  assert.equal(h.emitted.at(-1).roll.total, 17);
  assert.match(h.toasts.at(-1).text, /= 17/);
  h.ctx.undo();
  assert.equal(D.rollStatus(h.slice, h.rolls.at(-1)), "withdrawn", "evidence kept, withdrawn");
  h.ctx.rollDie = dice(20);
  Q.useSlot(h.ctx, table, "livia", slot.id);
  const again = h.rolls.at(-1);
  assert.deepEqual([again.values, again.status, again.reusedFrom], [[12], "reused", record.id]);
  h.ctx.rollDie = dice(3);
  Q.useSlot(h.ctx, table, "livia", slot.id);
  assert.deepEqual(h.rolls.at(-1).values, [3], "the next attempt rolls fresh");
  // Reload keeps bar, rolls and statuses.
  h.reload();
  assert.equal(h.rolls.length, 3);
  assert.equal(D.rollStatus(h.slice, h.rolls[0]), "withdrawn");
});

test("physical roll and d20 advantage: faces dialog, then a reasoned correction", () => {
  const h = harness();
  Q.setQuickbarPrefs("player", { dice: "physical", d20: "advantage" });
  const { slot } = D.addSlot(h.store.state, h.slice, "player", "livia", {
    kind: "check",
    ref: { ability: "int", type: "check" },
  });
  h.store.persist();
  Q.useSlot(h.ctx, h.table(), "livia", slot.id);
  assert.match(h.dialogs.at(-1).body, /Vantaggio: tira due d20/);
  assert.throws(() => h.submit({ face0: 6, face1: 25 }), /physical die face/);
  h.submit({ face0: 6, face1: 15 });
  const record = h.rolls.at(-1);
  assert.deepEqual(
    [record.values, record.natural, record.total, record.rollMode],
    [[6, 15], 15, 18, "advantage"],
  );
  assert.match(Q.renderDock(h.ctx, { selectedActorId: "livia" }), /data-qb-correct=/);
  Q.correctDialog(h.ctx, record.id);
  assert.throws(() => h.submit({ face0: 6, face1: 11, reason: "" }), /Write the reason/);
  h.submit({ face0: 6, face1: 11, reason: "letto male" });
  assert.deepEqual([h.rolls.at(-1).total, h.rolls.at(-1).status], [14, "corrected"]);
  const entry = h.store.state.log.at(-1);
  assert.match(entry.label, /Correzione del tiro.*= 14 · Motivo: letto male/);
  assert.deepEqual(
    [entry.rolls[0].correctionReason, entry.rolls[0].previousValues],
    ["letto male", [6, 15]],
  );
  Q.setQuickbarPrefs("player", { dice: "digital", d20: "normal" });
});

test("sequence at the Table: blocked step with its reason; physical run stopped with a reason", () => {
  const h = harness();
  const table = h.table();
  Q.openCustom(h.ctx, "livia");
  h.submit({
    template: "srd2024:spell:shocking-grasp",
    srdId: "srd2024:spell:shocking-grasp",
    name: "Stretta folgorante",
    activation: "action",
    hasAttack: "on",
    attackAbility: "int",
    proficient: "on",
    attackBonus: 0,
    hasDamage: "on",
    damageDice: "1d8",
    damageBonus: 0,
    damageType: "lightning",
    notes: "",
  });
  const grasp = D.customActionsOf(h.slice, "livia")[0];
  assert.equal(
    D.customView(h.store.state, "livia", grasp).summary.it,
    "+5 per colpire · 1d8 fulmine",
  );
  Q.openAdd(h.ctx, "livia", { preset: "sequence" });
  h.submit({
    item: "new:sequence",
    seqName: "Doppia stretta",
    step0: `custom:${grasp.id}`,
    step1: `custom:${grasp.id}`,
    index: 3,
    color: "blue",
  });
  startCombat(h, "livia");
  h.ctx.rollDie = dice(14, 6);
  Q.useSlot(h.ctx, table, "livia", h.slotAt(3).id);
  const run = D.latestRun(h.slice, "player", "livia");
  assert.equal(run.status, "blocked");
  assert.match(h.store.state.log.at(-1).label, /fermata: Azione già usata/);
  assert.match(Q.renderDock(h.ctx, { selectedActorId: "livia" }), /data-qb-run-status="blocked"/);
  assert.equal(h.store.state.actors.livia.action, false);
  h.ctx.undo();
  assert.equal(h.store.state.actors.livia.action, true, "Undo gives the Action back");
  // Physical sequence, stopped with a reason after the first step.
  Q.setQuickbarPrefs("player", { dice: "physical" });
  Q.openAdd(h.ctx, "livia", { preset: "sequence" });
  h.submit({
    item: "new:sequence",
    seqName: "Agguato",
    step0: "check:dex:check",
    step1: "check:wis:save",
    index: 4,
    color: "green",
  });
  Q.useSlot(h.ctx, table, "livia", h.slotAt(4).id);
  h.submit({ face0: 11 });
  assert.equal(D.runningRun(h.slice, "player", "livia").current, 1);
  assert.match(Q.renderDock(h.ctx, { selectedActorId: "livia" }), /data-qb-run-stop/);
  // Next step: faces through the same dialog; then a motivated interruption.
  Q.stopDialog(h.ctx, "livia");
  assert.throws(() => h.submit({ reason: " " }), /Write why you stop/);
  h.submit({ reason: "Il goblin è fuggito" });
  const stopped = D.latestRun(h.slice, "player", "livia");
  assert.deepEqual([stopped.status, stopped.stopReason], ["stopped", "Il goblin è fuggito"]);
  assert.match(h.store.state.log.at(-1).label, /sequenza interrotta — Il goblin è fuggito/);
  Q.setQuickbarPrefs("player", { dice: "digital" });
});

test("keys 1–0 and Alt pages run the open page; empty slot and no Table are explained", () => {
  const h = harness();
  assert.throws(() => Q.runKey({ ...h.ctx, view: { page: "home" } }, 0), /Open the Table/);
  const clicked = [];
  h.table("livia", clicked);
  Q.runKey(h.ctx, 0);
  assert.match(
    clicked[0],
    /data-combat-action="fire-bolt"/,
    "a sheet action runs the Table's own action",
  );
  Q.runKey(h.ctx, 9);
  assert.match(h.toasts.at(-1).text, /Casella 0 vuota/);
  h.ctx.commit(
    "p",
    (draft) => D.addPage(draft, draft.ext.quickbar, "player", "livia", "Esplorazione"),
    { local: true },
  );
  h.ctx.commit(
    "r",
    (draft) =>
      D.addSlot(
        draft,
        draft.ext.quickbar,
        "player",
        "livia",
        { kind: "roll", ref: { formula: "1d20+5" }, label: "Arcano" },
        { page: 1, index: 0 },
      ),
    { local: true },
  );
  Q.openPage(h.ctx, 1);
  assert.match(
    Q.renderDock(h.ctx, { selectedActorId: "livia" }),
    /2\/2<\/span><span class="qb-page-label">Esplorazione/,
  );
  h.ctx.rollDie = dice(9);
  Q.runKey(h.ctx, 0);
  assert.equal(h.rolls.at(-1).total, 14);
  Q.openPage(h.ctx, 4);
  assert.match(errorsOf(h).at(-1), /non ha la pagina 5/);
});

test("sharing from the dialog notifies Doran's player; the copy runs on Doran's sheet", () => {
  const h = harness();
  h.ctx.commit(
    "r",
    (draft) =>
      D.addSlot(draft, draft.ext.quickbar, "player", "livia", {
        kind: "check",
        ref: { ability: "dex", type: "check" },
      }),
    { local: true },
  );
  h.ctx.commit("share", (draft) =>
    D.sharePage(draft, draft.ext.quickbar, "player", "livia", 0, "doran", "2026-09-24T10:00:00Z"),
  );
  h.as("dm");
  const notes = h.ctx.registry.notifications(h.ctx);
  const note = notes.find((n) => n.id.startsWith("quickbar-shared-"));
  assert.ok(note, "the DM (Doran's player here) is notified");
  assert.deepEqual(note.target, { page: "table", params: { id: "doran" } });
  h.as("player");
  assert.equal(
    h.ctx.registry.notifications(h.ctx).filter((n) => n.id.startsWith("quickbar-shared-")).length,
    0,
  );
  h.as("dm");
  const copy = D.barOf(h.slice, "dm", "doran").pages.at(-1);
  h.ctx.rollDie = dice(10);
  Q.setQuickbarPrefs("dm", { dice: "digital", d20: "normal", hidden: true });
  Q.useSlot(h.ctx, h.table("doran"), "doran", copy.slots[0].id);
  const record = h.rolls.at(-1);
  assert.equal(record.total, 12, "Doran's Dexterity 14 (+2)");
  assert.equal(record.visibility, "private", "the DM's hidden roll");
  assert.equal(h.store.state.log.at(-1).visibility, "private");
  Q.setQuickbarPrefs("dm", { hidden: false });
});

test("sheet section: Doran's longsword read-only for the player, editable by the DM; add to bar", () => {
  const h = harness();
  const doran = h.store.state.actors.doran;
  const playerView = Q.renderCustomSection(h.ctx, doran);
  assert.match(playerView, /Attacco con spada/);
  assert.match(playerView, /\+2 per colpire · 1d8 taglienti · SRD 5\.2\.1: Spada lunga/);
  assert.doesNotMatch(playerView, /data-qb-custom-new/);
  h.as("dm");
  assert.match(Q.renderCustomSection(h.ctx, doran), /data-qb-custom-bar="qb-doran-longsword"/);
  const listeners = {};
  Q.bindCustomSection(
    { addEventListener: (type, fn) => (listeners[type] = fn), contains: () => true },
    h.ctx,
    doran,
  );
  const button = { dataset: { qbCustomBar: "qb-doran-longsword" } };
  listeners.click({ target: { closest: () => button } });
  const placed = h.bar("doran").pages[0].slots[2];
  assert.equal(placed.kind, "custom");
  assert.match(h.toasts.at(-1).text, /casella 3/);
});

test("registration: dock row, sheet section, twenty key commands without conflicts", () => {
  const registry = createRegistry();
  registry.use("quickbar", Q.register);
  const panel = registry.get("table-panel", "quickbar");
  assert.equal(panel.placement, "dock-row");
  assert.equal(registry.get("sheet-section", "quickbar-custom").tab, "actions");
  const commands = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"].map((k) =>
    registry.get("command", `quickbar.slot-${k}`),
  );
  assert.ok(commands.every((c) => c && c.context === "table"));
  assert.equal(registry.get("command", "quickbar.page-2").shortcut, "Alt+2");
  assert.deepEqual(registry.conflicts(), []);
});

// ------------------------------------------------------------------ review fixes (B53 review)

// The options a dialog body marks as selected, per select name (what the browser submits).
function selectedSteps(body) {
  const out = {};
  for (const [, name, inner] of body.matchAll(/<select name="(step\d)"[^>]*>(.*?)<\/select>/gs)) {
    const chosen = inner.match(/<option value="([^"]*)" selected>/);
    out[name] = chosen ? chosen[1].replace(/&amp;/g, "&") : "";
  }
  return out;
}

test("review: a sequence keeps a step whose saved roll was renamed, also in the other language", () => {
  const h = harness();
  Q.openAdd(h.ctx, "livia", { index: 4, preset: "roll" });
  h.submit({ item: "new:roll", rollName: "Arcano", formula: "1d20+5", index: 4, color: "gold" });
  Q.openAdd(h.ctx, "livia", { index: 5, preset: "sequence" });
  h.submit({
    item: "new:sequence",
    seqName: "Studio",
    step0: "roll:1d20+5:Arcano",
    step1: "check:int:check",
    index: 5,
    color: "gold",
  });
  const seq = h.slotAt(5).id;
  // Rename the saved roll (Roll20 Shift+click), then edit only the sequence's colour.
  Q.openEdit(h.ctx, "livia", h.slotAt(4).id);
  h.submit({ label: "Arcano+", color: "gold", formula: "1d20+5", page: 0, index: 4 });
  Q.openEdit(h.ctx, "livia", seq);
  const chosen = selectedSteps(h.dialogs.at(-1).body);
  assert.equal(chosen.step0, "roll:1d20+5:Arcano", "the renamed roll step stays selected");
  h.submit({ label: "Studio", color: "blue", page: 0, index: 5, ...chosen });
  assert.deepEqual(
    h.slotAt(5).ref.steps.map((s) => s.kind),
    ["roll", "check"],
  );
  assert.equal(h.slotAt(5).color, "blue");
  // A seeded {it, en} saved roll put in a sequence in English, edited in Italian.
  h.ctx.lang = "en";
  Q.openAdd(h.ctx, "mira", { index: 4, preset: "sequence" });
  h.submit({
    item: "new:sequence",
    seqName: "Watch",
    step0: "roll:1d20+5:Perception",
    step1: "check:wis:save",
    index: 4,
    color: "green",
  });
  h.ctx.lang = "it";
  Q.openEdit(h.ctx, "mira", h.slotAt(4, "mira").id);
  const again = selectedSteps(h.dialogs.at(-1).body);
  assert.equal(again.step0, "roll:1d20+5:Perception");
  assert.equal(again.step1, "check:wis:save");
});

test("review: correcting a physical attack face updates the waiting damage (critical or not)", () => {
  const state = createInitialState();
  const slice = D.seedQuickbar(state);
  const rolls = D.emptyRolls();
  const { slot } = D.addSlot(state, slice, "dm", "doran", {
    kind: "custom",
    ref: { customId: "qb-doran-longsword" },
  });
  const run = D.startRun(state, slice, "dm", "doran", slot.id, { mode: "physical", now: "t" });
  D.runSteps(state, slice, rolls, "dm", run.id, { faces: [20], now: "t" });
  assert.equal(D.pendingPlan(state, slice, run).dice.length, 2, "a natural 20: two d8");
  D.correctRoll(slice, rolls, "dm", rolls.rolls[0].id, [12], "letto male", "t");
  assert.deepEqual([run.steps[0].natural, run.steps[0].total], [12, 14]);
  assert.equal(D.pendingPlan(state, slice, run).dice.length, 1, "no longer a Critical Hit");
  D.correctRoll(slice, rolls, "dm", rolls.rolls[0].id, [20], "era un 20", "t");
  assert.equal(D.pendingPlan(state, slice, run).critical, true, "a corrected 20 is critical");
  D.runSteps(state, slice, rolls, "dm", run.id, { faces: [3, 5], now: "t" });
  assert.equal(rolls.rolls.at(-1).total, 8);
});

test("review: saves and skills read the sheet's effective values (class proficiency included)", async () => {
  const { statValue } = await import("../sheet-plus-domain.mjs");
  const state = createInitialState();
  const slice = D.seedQuickbar(state);
  for (const id of ["doran", "livia", "mira"])
    for (const ability of Object.keys(D.ABILITIES))
      assert.equal(
        D.checkBonus(state, id, ability, "save"),
        statValue(state, id, `save:${ability}`).total,
        `${id} ${ability} save`,
      );
  // Doran is a Fighter (Strength and Constitution saves, SRD 5.2.1): +4 like his sheet.
  assert.equal(D.checkBonus(state, "doran", "con", "save"), 4);
  // Skills (Roll20/Foundry: any sheet roll can go on the bar): Mira's Perception +5.
  assert.equal(D.checkBonus(state, "mira", "wis", "skill", "perception"), 5);
  const items = D.availableItems(state, slice, "mira");
  const perception = items.find((i) => i.key === "check:wis:skill:perception");
  assert.ok(perception, "skills are offered");
  assert.equal(perception.group, "skills");
  assert.deepEqual(
    [perception.name.it, perception.detail.it, perception.detail.en],
    ["Percezione", "Sag · d20 + 5", "Wis · d20 + 5"],
  );
  assert.equal(D.checkName("wis", "skill", "perception").en, "Wisdom (Perception) check");
  const { slot } = D.addSlot(state, slice, "player", "mira", {
    kind: "check",
    ref: { ability: "wis", type: "skill", skill: "perception" },
  });
  assert.equal(D.slotFace(state, slice, "mira", slot).it, "Percezione");
  const rolls = D.emptyRolls();
  const run = D.startRun(state, slice, "player", "mira", slot.id, { mode: "digital", now: "t" });
  D.runSteps(state, slice, rolls, "player", run.id, { die: dice(11), now: "t" });
  assert.deepEqual([rolls.rolls[0].total, rolls.rolls[0].rollKind], [16, "check"]);
  assert.throws(
    () =>
      D.addSlot(state, slice, "player", "mira", {
        kind: "check",
        ref: { ability: "str", type: "skill", skill: "perception" },
      }),
    /Invalid check/,
  );
});

test("review: a physical first step not permitted asks no faces and records the stop", () => {
  const h = harness();
  const table = h.table();
  Q.openCustom(h.ctx, "livia");
  h.submit({
    ...D.templateAction(h.store.state, "livia", "srd2024:spell:shocking-grasp"),
    name: "Stretta folgorante",
    activation: "action",
    hasAttack: "on",
    attackAbility: "int",
    proficient: "on",
    attackBonus: 0,
    hasDamage: "on",
    damageDice: "1d8",
    damageBonus: 0,
    damageType: "lightning",
    srdId: "srd2024:spell:shocking-grasp",
  });
  const grasp = D.customActionsOf(h.slice, "livia")[0];
  const { slot } = D.addSlot(h.store.state, h.slice, "player", "livia", {
    kind: "custom",
    ref: { customId: grasp.id },
  });
  h.store.persist();
  startCombat(h, "goblin-1");
  Q.setQuickbarPrefs("player", { dice: "physical" });
  const before = h.dialogs.length;
  Q.useSlot(h.ctx, table, "livia", slot.id);
  assert.equal(h.dialogs.length, before, "no faces asked for a step that cannot run");
  const run = D.latestRun(h.slice, "player", "livia");
  assert.equal(run.status, "blocked");
  assert.match(run.steps[0].reason.it, /Non è il turno di Livia/);
  assert.equal(h.rolls.length, 0);
  Q.setQuickbarPrefs("player", { dice: "digital" });
});

test("review: a sheet-action slot runs the Table action with the bar's dice mode", () => {
  const h = harness();
  const clicked = [];
  const mode = {
    value: "digital",
    events: [],
    dispatchEvent(event) {
      this.events.push(event.type);
    },
  };
  const table = {
    selectedActorId: "livia",
    root: {
      isConnected: true,
      querySelector: (selector) =>
        selector === "[data-combat-mode]" ? mode : { click: () => clicked.push(selector) },
    },
  };
  Q.bindDock({ querySelector: () => null }, h.ctx, table);
  Q.setQuickbarPrefs("player", { dice: "physical" });
  Q.useSlot(h.ctx, table, "livia", h.slotAt(0).id);
  assert.deepEqual([mode.value, mode.events], ["physical", ["change"]]);
  assert.match(clicked[0], /fire-bolt/);
  Q.useSlot(h.ctx, table, "livia", h.slotAt(0).id);
  assert.deepEqual(mode.events, ["change"], "no change event when the mode already matches");
  Q.setQuickbarPrefs("player", { dice: "digital" });
});

test("review: a page shared from a personal sheet does not reveal that sheet's name", () => {
  const h = harness();
  h.ctx.commit(
    "personal",
    (draft) => {
      draft.actors.nyx = {
        ...structuredClone(draft.actors.livia),
        id: "nyx",
        name: "Nyx",
        owner: "player",
        visibility: "private",
        campaignIds: [],
      };
    },
    { local: true },
  );
  h.ctx.commit(
    "r",
    (draft) =>
      D.addSlot(draft, draft.ext.quickbar, "player", "nyx", {
        kind: "roll",
        ref: { formula: "1d20+2" },
        label: "Fortuna",
      }),
    { local: true },
  );
  h.ctx.commit("share", (draft) =>
    D.sharePage(draft, draft.ext.quickbar, "player", "nyx", 0, "doran", "2026-09-24T10:00:00Z"),
  );
  h.as("dm");
  const note = h.ctx.registry.notifications(h.ctx).find((n) => n.id.startsWith("quickbar-shared-"));
  assert.ok(note);
  assert.doesNotMatch(JSON.stringify(note), /Nyx/);
  assert.match(note.body.it, /Un giocatore ha condiviso/);
  const copy = D.barOf(h.slice, "dm", "doran").pages.at(-1);
  assert.doesNotMatch(JSON.stringify(copy), /Nyx/);
  assert.doesNotMatch(Q.renderDock(h.ctx, { selectedActorId: "doran" }), /Nyx/);
});

test("review: names typed by another identity are escaped in the bar's HTML", () => {
  const h = harness();
  h.as("dm");
  h.ctx.commit("rename", (draft) => {
    draft.actors["goblin-1"].name = "<img src=x onerror=alert(1)>";
  });
  h.as("player");
  const note = Q.renderDock(h.ctx, { selectedActorId: "goblin-1" });
  assert.doesNotMatch(note, /<img/);
  assert.match(note, /&lt;img src=x/);
  // A page name (it can come from another identity's shared copy) in the delete dialog.
  h.ctx.commit(
    "page",
    (draft) => D.renamePage(draft, draft.ext.quickbar, "player", "livia", 0, "<b>Boom</b>"),
    { local: true },
  );
  Q.deletePageDialog(h.ctx, "livia", 0);
  assert.doesNotMatch(h.dialogs.at(-1).body, /<b>/);
  assert.match(h.dialogs.at(-1).body, /&lt;b&gt;Boom/);
  // A custom action name written on Doran's sheet by the DM, removed from the sheet.
  h.as("dm");
  Q.openCustom(h.ctx, "doran", "qb-doran-longsword");
  h.submit({
    name: "<script>x</script>",
    activation: "action",
    hasAttack: "on",
    attackAbility: "str",
    proficient: "on",
    attackBonus: 0,
  });
  const listeners = {};
  Q.bindCustomSection(
    { addEventListener: (type, fn) => (listeners[type] = fn), contains: () => true },
    h.ctx,
    h.store.state.actors.doran,
  );
  listeners.click({
    target: { closest: () => ({ dataset: { qbCustomRemove: "qb-doran-longsword" } }) },
  });
  assert.doesNotMatch(h.dialogs.at(-1).body, /<script>/);
  assert.match(h.dialogs.at(-1).body, /&lt;script&gt;/);
});

test("review: skills are listed in the language's alphabetical order, like the sheet", () => {
  const h = harness();
  Q.openAdd(h.ctx, "mira");
  const it = h.dialogs.at(-1).body;
  const at = (body, name) => {
    const index = body.indexOf(`<span>${name} <small>`);
    assert.ok(index >= 0, `${name} listed`);
    return index;
  };
  assert.ok(at(it, "Furtività") < at(it, "Inganno"), "IT: Furtività before Inganno");
  assert.match(it, /Percezione <small>Sag · d20 \+ 5<\/small>/);
  h.ctx.lang = "en";
  Q.openAdd(h.ctx, "mira");
  const en = h.dialogs.at(-1).body;
  assert.ok(at(en, "Deception") < at(en, "Stealth"), "EN: Deception before Stealth");
});
