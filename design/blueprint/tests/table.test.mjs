import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import { renderTable, resetTableView } from "../table.mjs";
import { esc, icon } from "../ui.mjs";
import { canControlActor, canViewActor } from "../character-access.mjs";
import { createCompanion, previewCompanionCreation } from "../forms-companions.mjs";
const context = (state) => ({
  state,
  role: "player",
  lang: "it",
  canControl: (a) => a?.owner === "player",
  t: (it) => it,
  label: (v) => (typeof v === "object" ? v?.it : v),
  esc,
  icon,
});
test("player table and initiative omit an uncontrolled hidden creature", () => {
  const state = createInitialState();
  state.combat.active = true;
  state.actors["goblin-1"].name = "PRIVATE-CREATURE-NAME";
  state.actors["goblin-1"].hidden = true;
  resetTableView();
  const html = renderTable(context(state));
  assert.ok(!html.includes("PRIVATE-CREATURE-NAME"));
  assert.ok(!html.includes('data-actor="goblin-1"'));
  assert.ok(!html.includes('data-select="goblin-1"'));
});
test("hidden own creature stays accessible to its controller", () => {
  const state = createInitialState();
  state.actors.livia.hidden = true;
  resetTableView();
  const html = renderTable(context(state));
  assert.ok(html.includes('data-actor="livia"'));
  assert.ok(html.includes("Scheda completa"));
});

test("a revoked member cannot observe a shared companion token or initiative label", () => {
  const state = createInitialState();
  const choice = { mode: "manual", name: "Revoked companion secret", profileId: "srd2024:cat" };
  const preview = previewCompanionCreation(state, "livia", choice, "player");
  const { actorId } = createCompanion(state, "livia", choice, "player", {
    operationId: "pet",
    reviewKey: preview.reviewKey,
  });
  state.scenes[0].tokens.push({ id: "pet-token", actorId, x: 500, y: 500 });
  state.combat.active = true;
  state.combat.order.push(actorId);
  state.campaign.members.find((m) => m.id === "player").active = false;
  assert.equal(canViewActor(state.actors[actorId], "player", state), false);
  const ctx = { ...context(state), canControl: (actor) => canControlActor(actor, "player", state) };
  resetTableView();
  const html = renderTable(ctx);
  assert.ok(!html.includes("Revoked companion secret"));
  assert.ok(!html.includes('data-actor="' + actorId + '"'));
  assert.ok(!html.includes('data-select="' + actorId + '"'));
  assert.ok(
    html.includes('data-actor="goblin-1"'),
    "Public NPC observation is a separate permission",
  );
});
