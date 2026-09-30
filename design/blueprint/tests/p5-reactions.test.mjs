// P5 fix package — TV-80: two simultaneous opportunity attacks are answered one at a time
// (D&D Beyond: one reaction prompt at a time) and reach follows the scene's distance rule,
// so Mira, diagonally next to the Esploratore, gets her opportunity. Synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import {
  beginMovement,
  projectMovements,
  projectReactions,
  resolveReaction,
  setReactionOrder,
  expireTurnEffects,
} from "../combat.mjs";
import { startPreparedEncounter } from "../preparation.mjs";
import { renderReactionRequests } from "../reaction-ui.mjs";
import { harness, row } from "./p5-harness.mjs";

function scenario(mira = { x: 350, y: 350 }, livia = { x: 450, y: 300 }) {
  const h = harness();
  h.ctx.commit("setup", (s) => {
    const tokens = s.scenes[0].tokens;
    const at = (id, x, y) =>
      Object.assign(
        tokens.find((t) => t.actorId === id),
        { x, y },
      );
    // The Esploratore stands in the middle; each test places Livia and Mira around it.
    at("goblin-2", 400, 300);
    at("livia", livia.x, livia.y);
    at("mira", mira.x, mira.y);
    at("goblin-1", 900, 600);
    at("doran", 100, 600);
    s.scenes[0].encounter = {
      name: "Cortile",
      participants: [row("goblin-2", 20), row("livia", 12), row("mira", 8), row("goblin-1", 5)],
    };
    startPreparedEncounter(s, "old-watch", "dm");
    expireTurnEffects(s, s.combat.order[0], "start");
  });
  return h;
}

test("TV-80: Mira's reach counts a diagonal neighbour (SRD grid), like every range check", () => {
  const h = scenario({ x: 350, y: 350 }, { x: 900, y: 100 });
  h.ctx.commit("flee", (s) =>
    beginMovement(s, { id: "flee", actorId: "goblin-2", point: { x: 400, y: 100 } }, "dm"),
  );
  const offered = projectReactions(h.ctx.state, "dm")
    .concat(projectReactions(h.ctx.state, "player"))
    .filter((r) => r.type === "opportunity");
  const names = new Set(offered.map((r) => r.actorName));
  assert.ok(names.has("Mira"), "Mira, diagonally adjacent, is offered an opportunity attack");
});

test("TV-80: two simultaneous opportunity attacks wait for the order, then come one at a time", () => {
  const h = scenario({ x: 350, y: 300 }, { x: 450, y: 300 });
  h.ctx.commit("flee", (s) =>
    beginMovement(s, { id: "flee", actorId: "goblin-2", point: { x: 400, y: 100 } }, "dm"),
  );
  const movement = projectMovements(h.ctx.state, "dm")[0];
  assert.equal(movement.phase, "order", "simultaneous: the turn controller orders them");
  assert.equal(movement.orderCandidates.length, 2);
  const ids = movement.orderCandidates.map((c) => c.reactionId);
  h.ctx.commit("order", (s) => setReactionOrder(s, "flee", ids, "dm"));
  // One prompt: the first in order is a card, the other waits in line, named.
  h.ctx.role = "player";
  const first = renderReactionRequests(h.ctx);
  assert.equal((first.match(/data-reaction-open=/g) ?? []).length, 1, "one reaction card");
  assert.match(first, /data-reaction-queue="1"/);
  assert.match(first, /Poi, una alla volta/);
  h.ctx.commit("first", (s) => resolveReaction(s, ids[0], { use: false }, "player"));
  const second = renderReactionRequests(h.ctx);
  assert.equal((second.match(/data-reaction-open=/g) ?? []).length, 1);
  assert.doesNotMatch(second, /data-reaction-queue/);
  h.ctx.commit("second", (s) => resolveReaction(s, ids[1], { use: false }, "player"));
  assert.equal(
    projectReactions(h.ctx.state, "player").filter((r) => r.status === "pending").length,
    0,
  );
});
