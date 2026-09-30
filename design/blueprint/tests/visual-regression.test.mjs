// Regression after the visual pass (30/09/2026): seams the browser journeys found red.
// Synthetic sample data only (the lantern campaign sample).
import test from "node:test";
import assert from "node:assert/strict";
import * as D from "../combat-tracker-domain.mjs";
import { createInitialState } from "../state.mjs";
import { previewDoorInteraction } from "../table-spatial.mjs";
import { harness, cmd } from "./p5-harness.mjs";

const SCENE = "old-watch";
const participants = (h) =>
  h.ctx.state.scenes.find((s) => s.id === SCENE).encounter?.participants ?? [];
// The start dialog's rows with only the given creatures taking part.
function startRows(h, ids) {
  const rows = D.startCandidates(h.ctx.state, SCENE);
  for (const row of rows) row.included = ids.includes(row.actorId);
  return rows;
}

test("visual regression: a d20 the DM types over an earlier digital roll is the one combat uses", () => {
  // encounter-lifecycle-journey: the DM rolled a digital d20 for a creature in the start
  // dialog, then typed physical faces and pressed «Attiva e avvia». The typed face is
  // recorded in the ledger (a correction at the start) and must also be the order's value.
  const h = harness();
  cmd(h, "roll", (s) => D.rollStartRows(s, SCENE, startRows(h, ["goblin-1"]), ["goblin-1"], "dm"));
  const digital = participants(h).find((p) => p.actorId === "goblin-1");
  assert.equal(digital.mode, "digital");
  const typed = digital.natural === 1 ? 2 : 1;
  const rows = startRows(h, ["goblin-1", "livia"]);
  for (const [id, natural] of [
    ["goblin-1", typed],
    ["livia", 20],
  ]) {
    const row = rows.find((r) => r.actorId === id);
    // What the dialog's d20 field does on input.
    Object.assign(row, { natural, mode: "physical" });
    delete row.rollId;
  }
  cmd(h, "start", (s) => D.startFromTable(s, SCENE, rows, "dm"));
  const goblin = participants(h).find((p) => p.actorId === "goblin-1");
  assert.equal(goblin.natural, typed, "the typed face is the saved participant's");
  assert.equal(goblin.mode, "physical");
  assert.equal(
    D.initiativeOf(h.ctx.state, "goblin-1"),
    typed + D.initiativeBonus(h.ctx.state, "goblin-1"),
  );
  assert.deepEqual(h.ctx.state.combat.order, ["livia", "goblin-1"]);
  const ledger = h.ctx.state.initiativeRolls.filter((r) => r.actorId === "goblin-1");
  assert.deepEqual(
    ledger.map((r) => [r.natural, r.mode]),
    [
      [digital.natural, "digital"],
      [typed, "physical"],
    ],
    "both rolls stay in the ledger",
  );
});

test("visual regression: a reroll in the start dialog replaces the saved participant's roll", () => {
  const h = harness();
  const rows = startRows(h, ["goblin-1"]);
  cmd(h, "roll", (s) => D.rollStartRows(s, SCENE, rows, ["goblin-1"], "dm"));
  const first = h.ctx.state.initiativeRolls.at(-1);
  cmd(h, "reroll", (s) => D.rollStartRows(s, SCENE, rows, ["goblin-1"], "dm"));
  const second = h.ctx.state.initiativeRolls.at(-1);
  assert.notEqual(second.id, first.id);
  const saved = participants(h).find((p) => p.actorId === "goblin-1");
  assert.equal(saved.rollId, second.id, "the saved row follows the latest roll");
  assert.equal(saved.natural, second.natural);
});

test("visual regression: a roll saved elsewhere after the dialog read its rows still enters them", () => {
  // TV-46 (unchanged): a newer saved roll replaces the dialog's older one.
  const h = harness();
  const stale = startRows(h, ["goblin-1"]);
  cmd(h, "roll", (s) => D.rollStartRows(s, SCENE, stale, ["goblin-1"], "dm"));
  const older = stale.find((r) => r.actorId === "goblin-1");
  const reader = startRows(h, ["goblin-1"]);
  cmd(h, "reroll elsewhere", (s) => D.rollStartRows(s, SCENE, reader, ["goblin-1"], "dm"));
  const newer = h.ctx.state.initiativeRolls.at(-1);
  assert.notEqual(older.rollId, newer.id);
  assert.deepEqual(D.mergeSavedRolls(h.ctx.state, SCENE, stale), ["goblin-1"]);
  assert.equal(older.rollId, newer.id);
});

test("visual regression: a creature one cell from a door, give or take pointer rounding, is in reach", () => {
  // spatial-journey: with grid snapping off, a click turned into scene units carries float
  // noise (a token at x 299.99997, a scale of 50.00001 per cell after calibration). The door
  // dialog then showed «Distanza: 1,5 m · Portata: 1,5 m» and still asked to walk there first.
  const s = createInitialState();
  s.combat.active = true;
  const scene = s.scenes.find((x) => x.id === s.activeSceneId);
  scene.gridSize = 50.0000114440918;
  scene.walls = [
    {
      id: "door",
      a: { x: 350, y: 299.9999694824219 },
      b: { x: 350, y: 400 },
      kind: "door",
      blocksMovement: true,
      blocksSight: true,
      blocksEffect: true,
      secret: false,
      doorState: "closed",
      playerOperable: true,
      interactionRangeMeters: 1.5,
      source: { kind: "authored-demo", revision: "test-v1" },
    },
  ];
  const livia = scene.tokens.find((t) => t.actorId === "livia");
  Object.assign(livia, { x: 299.9999694824219, y: 350 });
  const near = previewDoorInteraction(s, "door", "livia", "player");
  assert.equal(near.available, true, JSON.stringify(near.reasons));
  // A real shortfall still counts: 0,3 m beyond the reach is out of it.
  livia.x = 290;
  const far = previewDoorInteraction(s, "door", "livia", "player");
  assert.equal(far.available, false);
  assert.ok(far.distance > 1.5);
});
