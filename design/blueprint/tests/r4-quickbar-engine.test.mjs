// R4 (fix round 2) — H-02 (D&D Beyond: one roll engine) and PG-77 part / C9 (BG3 class
// actions on the hotbar). The quick bar's checks, saves and skills are the sheet's D20 Tests
// (sheet-plus-domain rollProfile + effectiveRollMode: Poisoned, Exhaustion, Bless and Bane),
// as in the dice tray; a class feature is a slot with its uses left, and Wild Shape opens the
// forms (and «Torna alla forma originale» once transformed). Synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import * as QD from "../quickbar-domain.mjs";
import * as quickbar from "../quickbar.mjs";
import * as sheetPlus from "../sheet-plus.mjs";
import * as SD from "../sheet-plus-domain.mjs";
import { harness } from "./p4-harness.mjs";

const scripted = (...values) => {
  const queue = [...values];
  return (sides) => {
    const value = queue.shift();
    assert.ok(Number.isInteger(value), `No scripted face left for a d${sides}`);
    assert.ok(value >= 1 && value <= sides, `Scripted face ${value} outside d${sides}`);
    return value;
  };
};
const setup = (role = "player") => {
  quickbar.resetQuickbarUI();
  return harness({
    role,
    areas: [
      ["sheet-plus", sheetPlus.register],
      ["quickbar", quickbar.register],
    ],
    view: { page: "table", id: "", tab: "" },
  });
};
const NOW = "2026-09-27T12:00:00.000Z";
function runCheck(h, actorId, ref, die, options = {}) {
  let result;
  h.ctx.commit("tiro", (draft) => {
    const slice = draft.ext[QD.ID];
    const rolls = draft.ext[QD.ROLLS];
    const { slot } = QD.addSlot(draft, slice, h.ctx.role, actorId, { kind: "check", ref });
    const run = QD.startRun(draft, slice, h.ctx.role, actorId, slot.id, {
      mode: "digital",
      now: NOW,
      ...options,
    });
    result = QD.runSteps(draft, slice, rolls, h.ctx.role, run.id, { die, now: NOW });
  });
  return result.records[0];
}

test("H-02: a Poisoned Athletics check on the quick bar rolls 2d20 keep-lowest, like the tray", () => {
  const h = setup();
  h.ctx.commit("veleno", (s) => (s.actors.livia.conditions = ["poisoned"]));
  const step = { type: "check", ability: "str", checkType: "skill", skill: "athletics" };
  const plan = QD.stepPlan(h.store.state, h.store.state.ext[QD.ID], "livia", step);
  assert.equal(plan.mode, "disadvantage");
  assert.equal(plan.dice.length, 2);
  assert.match(QD.planText(plan, "it"), /2d20.*svantaggio/);
  assert.ok(plan.reasons.some((r) => r.name.it === "Avvelenato" && r.mode === "disadvantage"));
  const record = runCheck(
    h,
    "livia",
    { ability: "str", type: "skill", skill: "athletics" },
    scripted(16, 7),
  );
  const profile = SD.rollProfile(h.store.state, "livia", "skill", "athletics");
  assert.equal(record.rollMode, "disadvantage");
  assert.equal(record.natural, 7);
  assert.equal(record.total, 7 + profile.modifier);
  // A plain ability check (Initiative is one too) follows the same rule.
  const dex = QD.stepPlan(h.store.state, h.store.state.ext[QD.ID], "livia", {
    type: "check",
    ability: "dex",
    checkType: "check",
  });
  assert.equal(dex.mode, "disadvantage");
  // Advantage chosen on the bar and the condition's Disadvantage cancel out (SRD EN 7–8).
  const both = QD.stepPlan(h.store.state, h.store.state.ext[QD.ID], "livia", step, {
    rollMode: "advantage",
  });
  assert.equal(both.mode, "normal");
  assert.equal(both.dice.length, 1);
});

test("H-02: Exhaustion lowers the quick bar's plain check as it does on the sheet", () => {
  const h = setup();
  h.ctx.commit("indebolimento", (s) => (s.actors.livia.exhaustion = 2));
  const plan = QD.stepPlan(h.store.state, h.store.state.ext[QD.ID], "livia", {
    type: "check",
    ability: "int",
    checkType: "check",
  });
  const profile = SD.rollProfile(h.store.state, "livia", "check", "int");
  assert.equal(plan.modifier, profile.modifier);
  assert.equal(plan.modifier, 3 - 4, "INT +3, Exhaustion 2 −4");
});

test("H-02: Bless adds its 1d4 to a quick bar save and Bane takes 1d4 away", () => {
  const h = setup();
  h.ctx.commit("benedizione", (s) => SD.toggleEffect(s, "livia", "bless", true, "player"));
  const step = { type: "check", ability: "wis", checkType: "save" };
  const plan = QD.stepPlan(h.store.state, h.store.state.ext[QD.ID], "livia", step);
  assert.deepEqual(
    plan.dice.map((d) => d.sides),
    [20, 4],
  );
  assert.match(QD.planText(plan, "it"), /1d20.*\+ 1d4 \(Benedizione\)/);
  const record = runCheck(h, "livia", { ability: "wis", type: "save" }, scripted(10, 3));
  const base = SD.rollProfile(h.store.state, "livia", "save", "wis").modifier;
  assert.equal(record.natural, 10);
  assert.equal(record.total, 10 + base + 3);
  assert.deepEqual(record.values, [10, 3]);
  h.ctx.commit("anatema", (s) => {
    SD.toggleEffect(s, "livia", "bless", false, "player");
    SD.toggleEffect(s, "livia", "bane", true, "player");
  });
  const bane = runCheck(h, "livia", { ability: "wis", type: "save" }, scripted(10, 3));
  assert.equal(bane.total, 10 + base - 3);
});

test("H-02: a save the conditions fail automatically is refused on the bar with its reason", () => {
  const h = setup();
  h.ctx.commit("paralizzata", (s) => (s.actors.livia.conditions = ["paralyzed"]));
  assert.throws(
    () =>
      QD.stepPlan(h.store.state, h.store.state.ext[QD.ID], "livia", {
        type: "check",
        ability: "dex",
        checkType: "save",
      }),
    (error) => /fallisce automaticamente/.test(error.it) && /automatically fails/.test(error.en),
  );
});

// ---------------------------------------------------------------- PG-77 part (C9)

test("C9: Mira's hotbar carries Wild Shape with its uses left; spent features are greyed", () => {
  const h = setup();
  const slice = h.store.state.ext[QD.ID];
  const mira = QD.barOf(slice, "player", "mira").pages[0].slots;
  const wild = mira.find((slot) => slot?.kind === "feature");
  assert.equal(wild.id, "qb-mira-wild-shape");
  assert.equal(QD.slotName(h.store.state, slice, "mira", wild).it, "Forma Selvatica");
  assert.deepEqual(QD.featureUses(h.store.state, "mira", wild), { left: 1, max: 2 });
  assert.equal(QD.slotStatus(h.store.state, slice, "mira", wild).available, true);
  const dock = quickbar.renderDock(h.ctx, { selectedActorId: "mira" });
  assert.match(dock, /data-qb-slot="qb-mira-wild-shape"[^>]*data-qb-kind="feature"/);
  assert.match(dock, /Forma Selvatica · capacità di classe · 1 di 2 usi/);
  assert.match(dock, /<span class="qb-uses" aria-hidden="true">1\/2<\/span>/);
  // Doran's Second Wind and Action Surge (both spent in the sample) go on his bar from the
  // tray's «Capacità di classe» group and read greyed with the reason.
  h.ctx.role = "dm";
  h.ctx.commit("barra", (draft) => {
    for (const featureId of ["sample-second-wind", "sample-action-surge"])
      QD.addSlot(draft, draft.ext[QD.ID], "dm", "doran", { kind: "feature", ref: { featureId } });
  });
  const doran = QD.barOf(h.store.state.ext[QD.ID], "dm", "doran").pages[0].slots.filter(
    (s) => s?.kind === "feature",
  );
  assert.deepEqual(
    doran.map((slot) => QD.slotName(h.store.state, slice, "doran", slot).en),
    ["Second Wind", "Action Surge"],
  );
  for (const slot of doran) {
    const status = QD.slotStatus(h.store.state, h.store.state.ext[QD.ID], "doran", slot);
    assert.equal(status.available, false);
    assert.match(status.reason.it, /Nessun uso rimasto/);
  }
});

test("C9: the Wild Shape slot opens the forms; transformed, it reads and runs the return", async () => {
  const forms = await import("../forms-companions.mjs");
  const h = setup();
  const opened = [];
  h.ctx.openForms = (actorId, tab) => opened.push({ actorId, tab });
  quickbar.useSlot(h.ctx, null, "mira", "qb-mira-wild-shape");
  assert.deepEqual(opened, [{ actorId: "mira", tab: "forms" }]);
  // Transform Mira into a wolf through the forms domain (the use is spent by the form).
  h.ctx.commit("Forma Selvatica", (s) => {
    forms.initializeFormsCompanions(s);
    const mira = s.actors.mira;
    const choice = {
      profileId: "srd2024:wolf",
      tempHpChoice: "replace",
      equipment: mira.inventory
        .filter((i) => i.quantity > 0)
        .map((i) => ({ itemId: i.id, disposition: "merge" })),
    };
    const p = forms.previewWildShape(s, "mira", choice, "player");
    assert.equal(p.canApply, true, JSON.stringify(p.errors));
    forms.applyWildShape(s, "mira", choice, "player", {
      operationId: "r4",
      reviewKey: p.reviewKey,
    });
  });
  const slice = h.store.state.ext[QD.ID];
  const wild = QD.barOf(slice, "player", "mira").pages[0].slots.find((s) => s?.kind === "feature");
  assert.equal(QD.slotName(h.store.state, slice, "mira", wild).it, "Torna alla forma originale");
  assert.equal(QD.slotStatus(h.store.state, slice, "mira", wild).available, true);
  const dock = quickbar.renderDock(h.ctx, { selectedActorId: "mira" });
  assert.match(dock, /<span class="qb-label">Torna alla forma originale<\/span>/);
  assert.doesNotMatch(
    dock.split('data-qb-slot="qb-mira-wild-shape"')[1].split("</button>")[0],
    /qb-uses/,
  );
  const before = h.dialogs.length;
  quickbar.useSlot(h.ctx, null, "mira", "qb-mira-wild-shape");
  assert.equal(opened.length, 1, "no second picker: the return opens instead");
  assert.equal(h.dialogs.length, before + 1, "the forms panel opens with the return previewed");
});

test("C9: Second Wind from the bar spends one use of the sheet's counter", () => {
  const h = setup("dm");
  let slotId = null;
  h.ctx.commit("riposo", (s) => {
    for (const f of s.actors.doran.features) f.used = 0;
    slotId = QD.addSlot(s, s.ext[QD.ID], "dm", "doran", {
      kind: "feature",
      ref: { featureId: "sample-second-wind" },
    }).slot.id;
  });
  quickbar.useSlot(h.ctx, null, "doran", slotId);
  const wind = h.store.state.actors.doran.features.find((f) => f.id === "sample-second-wind");
  assert.equal(wind.used, 1);
  assert.match(h.toasts.at(-1).text, /Recuperare Energie: 1 di 2 usi rimasti/);
  // The add dialog and the tray offer the class features in their own group.
  const items = QD.availableItems(h.store.state, h.store.state.ext[QD.ID], "doran");
  assert.deepEqual(
    items.filter((i) => i.group === "features").map((i) => i.key),
    ["feature:sample-second-wind", "feature:sample-action-surge"],
  );
});
