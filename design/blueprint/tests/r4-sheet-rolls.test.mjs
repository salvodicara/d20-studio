// R4 (fix round 2) — H-03 (D&D Beyond: the roll window opens with the engine's mode; the
// stat tooltip and window list what the conditions add) and TV-46 part / C8 (D&D Beyond:
// clicking the sheet's Initiative while the combat waits for it rolls into the turn order).
// The real store and areas; synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import * as sheetPlus from "../sheet-plus.mjs";
import { harness } from "./p4-harness.mjs";

const setup = (role = "player") =>
  harness({
    role,
    areas: [["sheet-plus", sheetPlus.register]],
    view: { page: "characters", id: "livia", tab: "actions" },
  });
const second = (body) => body.match(/<label class="field" data-shp-second[^>]*>/)?.[0] ?? "";

test("H-03: under Poisoned the roll window opens on Disadvantage with both d20 fields", () => {
  const h = setup();
  h.ctx.commit("veleno", (s) => (s.actors.livia.conditions = ["poisoned"]));
  sheetPlus._test.rollDialog(h.ctx, "livia", "skill", "athletics");
  const { body } = h.dialogs.at(-1);
  assert.match(body, /value="disadvantage" checked/);
  assert.doesNotMatch(body, /value="normal" checked/);
  assert.ok(second(body), "the second d20 field exists");
  assert.doesNotMatch(second(body), /hidden/, "and is shown at once");
  assert.match(body, /Avvelenato: svantaggio/);
  assert.match(body, /Scelto dalla scheda: svantaggio/);
  // Physical faces for the preset mode are accepted as they are (two d20, keep-lowest).
  h.submit({ rollMode: "disadvantage", mode: "physical", face0: "15", face1: "4" });
  assert.deepEqual(h.errors(), []);
  const roll = h.store.state.ext["sheet-plus-rolls"].rolls.at(-1);
  assert.equal(roll.rollMode, "disadvantage");
  assert.equal(roll.natural, 4);
});

test("H-03: without conditions the window stays on Normal with one d20 field", () => {
  const h = setup();
  sheetPlus._test.rollDialog(h.ctx, "livia", "save", "dex");
  const { body } = h.dialogs.at(-1);
  assert.match(body, /value="normal" checked/);
  assert.match(second(body), /hidden/);
  assert.doesNotMatch(body, /Scelto dalla scheda/);
});

test("H-03: Exhaustion is listed in the stat tooltip and in the stat window", () => {
  const h = setup();
  h.ctx.commit("indebolimento", (s) => (s.actors.livia.exhaustion = 1));
  const derived = sheetPlus._test.renderDerived(h.ctx, h.store.state.actors.livia);
  const tip = derived.split('id="shp-tip-save-int"')[1].split("</div>")[0];
  assert.match(tip, /Indebolimento 1/);
  sheetPlus._test.statDialog(h.ctx, "livia", "save:int");
  assert.match(h.dialogs.at(-1).body, /Indebolimento 1/);
  assert.match(h.dialogs.at(-1).body, /Oggetti indossati e condizioni/);
});

test("C8: without the tracker's contract the Initiative stays a sheet stat and roll", () => {
  const h = setup();
  sheetPlus._test.setTracker(null);
  sheetPlus._test.openStat(h.ctx, "livia", "initiative");
  assert.match(h.dialogs.at(-1).title, /^Iniziativa · Livia/);
  assert.match(h.dialogs.at(-1).body, /data-shp-stat-dialog="initiative"/);
});

test("C8: while the combat awaits Livia's Initiative, the sheet's Initiative rolls into it", () => {
  const h = setup();
  const calls = [];
  sheetPlus._test.setTracker({
    awaitsInitiative: (state, actorId) => actorId === "livia",
    rollOwnInitiative: (ctx, actorId, options) => calls.push({ actorId, options }),
  });
  try {
    sheetPlus._test.openStat(h.ctx, "livia", "initiative");
    const dialog = h.dialogs.at(-1);
    assert.match(dialog.body, /data-shp-initiative-encounter/);
    assert.match(dialog.body, /entra nell’ordine dei turni/);
    assert.equal(dialog.options.submitLabel, "Tira l’iniziativa");
    h.submit({ rollMode: "normal", mode: "physical", face0: "14" });
    assert.deepEqual(calls, [
      { actorId: "livia", options: { mode: "physical", natural: 14, advantage: "normal" } },
    ]);
    // Under Poisoned (Initiative is a Dexterity check) the window opens on Disadvantage and
    // the kept physical face is the lower one.
    h.ctx.commit("veleno", (s) => (s.actors.livia.conditions = ["poisoned"]));
    sheetPlus._test.openStat(h.ctx, "livia", "initiative");
    assert.match(h.dialogs.at(-1).body, /value="disadvantage" checked/);
    h.submit({ rollMode: "disadvantage", mode: "physical", face0: "15", face1: "6" });
    assert.deepEqual(calls.at(-1).options, {
      mode: "physical",
      natural: 6,
      advantage: "disadvantage",
    });
    h.ctx.commit("guarita", (s) => (s.actors.livia.conditions = []));
    assert.equal(
      h.store.state.ext["sheet-plus-rolls"].rolls.length,
      0,
      "no separate sheet roll is recorded",
    );
    // A favourite Initiative rolls at once, digital, into the tracker too.
    sheetPlus.quickRoll(h.ctx, "livia", "initiative", "initiative");
    assert.deepEqual(calls.at(-1), {
      actorId: "livia",
      options: { mode: "digital", advantage: "normal" },
    });
    // Another creature the tracker does not wait for keeps the details window.
    sheetPlus._test.openStat(h.ctx, "mira", "initiative");
    assert.match(h.dialogs.at(-1).body, /data-shp-stat-dialog="initiative"/);
  } finally {
    sheetPlus._test.setTracker(null);
  }
});

test("C8 with the real tracker: the DM's roll call, then Livia's sheet Initiative joins it", async () => {
  const tracker = await import("../combat-tracker.mjs");
  const TD = await import("../combat-tracker-domain.mjs");
  const h = harness({
    role: "dm",
    areas: [
      ["sheet-plus", sheetPlus.register],
      ["combat-tracker", tracker.register],
    ],
    view: { page: "characters", id: "livia", tab: "actions" },
  });
  await sheetPlus._test.reloadNeighbours();
  h.ctx.commit("Avvia combattimento", (s) => {
    const rows = TD.startCandidates(s, s.activeSceneId);
    TD.openRollCall(s, s.activeSceneId, rows, "dm");
  });
  h.ctx.role = "player";
  assert.equal(TD.awaitsInitiative(h.store.state, "livia"), true);
  sheetPlus._test.openStat(h.ctx, "livia", "initiative");
  assert.match(h.dialogs.at(-1).body, /data-shp-initiative-encounter/);
  h.submit({ rollMode: "normal", mode: "physical", face0: "17" });
  const row = h.store.state.scenes[0].encounter.participants.find((p) => p.actorId === "livia");
  assert.equal(row.natural, 17);
  assert.equal(TD.awaitsInitiative(h.store.state, "livia"), false);
  // Rolled: the Initiative is the sheet's detail again.
  sheetPlus._test.openStat(h.ctx, "livia", "initiative");
  assert.match(h.dialogs.at(-1).body, /data-shp-stat-dialog="initiative"/);
});
