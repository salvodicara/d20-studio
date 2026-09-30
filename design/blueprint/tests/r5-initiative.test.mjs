// R5 TV-46 (C8): players roll their own initiative (D&D Beyond's sheet roll, Foundry's d20 on
// the player's own combatant row). Synthetic sample data only.
import test from "node:test";
import assert from "node:assert/strict";
import * as D from "../combat-tracker-domain.mjs";
import * as UI from "../combat-tracker.mjs";
import { recordInitiativeResult } from "../preparation.mjs";
import { harness, cmd } from "./p5-harness.mjs";

const SCENE = "old-watch";
const playerRow = (h) =>
  h.ctx.state.initiativeRolls.filter((r) => r.actorId === "livia" && r.controller === "player");
// The DM opens the start dialog: the scene's rows become the roll call. The DM's own
// creatures get typed faces so the order has totals to sort against.
function openCall(h, naturals = { "goblin-1": 5, doran: 10, "goblin-2": 3 }) {
  const rows = D.startCandidates(h.ctx.state, SCENE);
  for (const row of rows)
    if (Object.hasOwn(naturals, row.actorId)) row.natural = naturals[row.actorId];
  h.ctx.role = "dm";
  cmd(h, "call", (s) => D.openRollCall(s, SCENE, rows, "dm"));
  return rows;
}

test("r5 TV-46: a player's roll for their creature goes in the one ledger, shared, and sorts the order", () => {
  const h = harness();
  openCall(h);
  assert.equal(D.awaitsInitiative(h.ctx.state, "livia"), true);
  assert.equal(D.awaitsInitiative(h.ctx.state, "goblin-1"), false, "the DM typed its face");
  h.ctx.role = "player";
  let result;
  cmd(h, "own", (s, sl) => {
    result = D.rollOwn(s, sl, "livia", { mode: "physical", natural: 18 }, "player");
  });
  const bonus = D.initiativeBonus(h.ctx.state, "livia");
  assert.equal(result.total, 18 + bonus, "the bonus comes from the sheet");
  const [entry] = playerRow(h);
  assert.equal(entry.natural, 18);
  assert.equal(entry.visibility, "shared", "everyone saw the player's die");
  assert.equal(entry.controller, "player");
  const order = h.ctx.state.scenes
    .find((s) => s.id === SCENE)
    .encounter.participants.map((p) => p.actorId);
  assert.equal(order[0], "livia", "20 beats 12: Livia is first");
  assert.equal(D.awaitsInitiative(h.ctx.state, "livia"), false);
});

test("r5 TV-46: a player cannot roll for a DM creature, nor without a roll call", () => {
  const h = harness();
  h.ctx.role = "player";
  assert.throws(
    () => cmd(h, "early", (s, sl) => D.rollOwn(s, sl, "livia", { mode: "digital" }, "player")),
    (e) => e.code === "not-awaiting",
  );
  openCall(h, {});
  h.ctx.role = "player";
  assert.throws(
    () => cmd(h, "dm's", (s, sl) => D.rollOwn(s, sl, "goblin-1", { mode: "digital" }, "player")),
    (e) => e.code === "control",
  );
  assert.throws(
    () =>
      cmd(h, "ledger", (s) =>
        recordInitiativeResult(
          s,
          { sceneId: SCENE, actorId: "goblin-1", natural: 20, bonus: 0, mode: "physical" },
          "player",
        ),
      ),
    /unauthorized/,
  );
  // Doran is the DM's own character: the player cannot roll it either.
  assert.throws(
    () => cmd(h, "doran", (s, sl) => D.rollOwn(s, sl, "doran", { mode: "digital" }, "player")),
    (e) => e.code === "control",
  );
});

test("r5 TV-46: the DM's stale dialog keeps the player's roll and the start uses it once", () => {
  const h = harness();
  const rows = openCall(h);
  h.ctx.role = "player";
  cmd(h, "own", (s, sl) => D.rollOwn(s, sl, "livia", { mode: "physical", natural: 17 }, "player"));
  h.ctx.role = "dm";
  // The DM's rows were read before the roll: the NPC roll saves them without losing it.
  cmd(h, "npc", (s) => D.rollStartRows(s, SCENE, rows, ["goblin-2"], "dm"));
  const livia = rows.find((r) => r.actorId === "livia");
  assert.equal(livia.natural, 17, "merged into the dialog's rows");
  for (const row of rows) if (row.natural === null) row.included = false;
  const before = h.ctx.state.initiativeRolls.length;
  cmd(h, "start", (s) => D.startFromTable(s, SCENE, rows, "dm"));
  assert.equal(h.ctx.state.combat.active, true);
  // Sorted by total (the goblin's digital d20 may beat Livia's 17 + 2).
  const totals = h.ctx.state.combat.order.map((id) => D.initiativeOf(h.ctx.state, id));
  assert.deepEqual(
    totals,
    [...totals].sort((a, b) => b - a),
  );
  assert.equal(D.initiativeOf(h.ctx.state, "livia"), 17 + D.initiativeBonus(h.ctx.state, "livia"));
  assert.equal(
    h.ctx.state.initiativeRolls.filter((r) => r.actorId === "livia").length,
    1,
    "no second ledger entry for the player's roll",
  );
  assert.ok(h.ctx.state.initiativeRolls.length >= before);
  assert.equal(
    h.ctx.state.scenes.find((s) => s.id === SCENE).encounter.rollCall,
    undefined,
    "the roll call ends with the start",
  );
});

test("r5 TV-46: the DM can still correct a player's roll, and a correction is a new entry", () => {
  const h = harness();
  const rows = openCall(h);
  h.ctx.role = "player";
  cmd(h, "own", (s, sl) => D.rollOwn(s, sl, "livia", { mode: "physical", natural: 2 }, "player"));
  h.ctx.role = "dm";
  D.mergeSavedRolls(h.ctx.state, SCENE, rows);
  const livia = rows.find((r) => r.actorId === "livia");
  // The DM types another face in the dialog: it stays (a correction recorded at the start).
  Object.assign(livia, { natural: 19, mode: "physical" });
  delete livia.rollId;
  assert.deepEqual(D.mergeSavedRolls(h.ctx.state, SCENE, rows), [], "the typed value stays");
  for (const row of rows) if (row.natural === null) row.included = false;
  cmd(h, "start", (s) => D.startFromTable(s, SCENE, rows, "dm"));
  const entries = h.ctx.state.initiativeRolls.filter((r) => r.actorId === "livia");
  assert.deepEqual(
    entries.map((e) => [e.natural, e.controller]),
    [
      [2, "player"],
      [19, "dm"],
    ],
  );
});

test("r5 TV-46: in a running combat a player's waiting creature rolls and joins the order", () => {
  const h = harness();
  const rows = D.startCandidates(h.ctx.state, SCENE).map((r) => ({
    ...r,
    included: r.actorId !== "mira",
    natural: r.actorId === "mira" ? null : 10,
  }));
  cmd(h, "start", (s) => D.startFromTable(s, SCENE, rows, "dm"));
  const current = h.ctx.state.combat.order[h.ctx.state.combat.turn];
  cmd(h, "wait", (s, sl) => D.addPending(s, sl, ["mira"], "dm"));
  assert.equal(D.awaitsInitiative(h.ctx.state, "mira"), true);
  h.ctx.role = "player";
  let result;
  cmd(h, "own", (s, sl) => {
    result = D.rollOwn(s, sl, "mira", { mode: "physical", natural: 20 }, "player");
  });
  assert.equal(result.joined, true);
  assert.ok(h.ctx.state.combat.order.includes("mira"));
  assert.equal(h.ctx.state.combat.order[h.ctx.state.combat.turn], current, "turn kept");
  assert.equal(D.awaitsInitiative(h.ctx.state, "mira"), false);
  // A second roll by the player is refused; the DM corrects with «Correggi iniziativa».
  assert.throws(
    () => cmd(h, "again", (s, sl) => D.rollOwn(s, sl, "mira", { mode: "digital" }, "player")),
    (e) => e.code === "not-awaiting",
  );
});

test("r5 TV-46 UI: the player sees «Tira l’iniziativa» on their row only; the DM sees who rolled", () => {
  const h = harness();
  openCall(h, {});
  h.ctx.role = "player";
  const html = UI.renderTracker(h.ctx, {});
  assert.match(html, /data-ct-rollcall/);
  assert.match(html, /data-ct-own-roll="livia"[^>]*>[\s\S]*?Tira l’iniziativa/);
  assert.doesNotMatch(html, /data-ct-own-roll="(goblin-1|goblin-2|doran)"/);
  // The bell and the map alert ask the player too.
  const alert = UI.currentAlert(h.ctx);
  assert.equal(alert?.kind, "initiative");
  assert.ok(["livia", "mira"].includes(alert.actorId));
  h.ctx.lang = "en";
  assert.match(UI.renderTracker(h.ctx, {}), /Roll initiative/);
  h.ctx.lang = "it";
  // The player rolls through the exported command (C8).
  const result = UI.rollOwnInitiative(h.ctx, "livia", { mode: "physical", natural: 12 });
  assert.equal(result.natural, 12);
  assert.match(h.toasts.at(-1).text, /Livia: 12/);
  h.ctx.role = "dm";
  const dm = UI.renderTracker(h.ctx, {});
  assert.match(dm, /data-ct-rollcall-close/, "the DM can cancel the start");
  assert.match(dm, /Riprendi l’avvio/);
});
