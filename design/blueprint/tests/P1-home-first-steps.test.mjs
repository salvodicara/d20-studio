// P1 IN-07 (Roll20 Quick Start, Foundry starter): «Primi passi» leads Home while a
// character or a campaign is missing, folds otherwise; the paths always end in an action.
import test from "node:test";
import assert from "node:assert/strict";
import * as D from "../home-domain.mjs";
import { harness, slotHTML } from "./home-harness.mjs";

test("IN-07: first steps lead Home without an own character, and fold once both exist", async () => {
  const h = await harness();
  assert.equal(D.needsFirstSteps(h.ctx.state, "player"), false);
  let html = slotHTML(h.registry, "route", "home", h.ctx);
  assert.match(html, /data-home-lead="false"/);
  assert.match(html, /<details class="home-start home-start-fold"/);
  assert.match(html, /data-home-path="join"[^>]*>Unisciti con un invito/);
  // No own character: the paths come first, above the game blocks.
  h.mutate((state) => {
    for (const actor of Object.values(state.actors))
      if (actor.owner === "player" && actor.kind === "character") actor.owner = "dm";
  });
  h.reload();
  assert.equal(D.needsFirstSteps(h.ctx.state, "player"), true);
  html = slotHTML(h.registry, "route", "home", h.ctx);
  assert.match(html, /data-home-lead="true"/);
  assert.ok(html.indexOf("data-home-start") < html.indexOf("home-layout"), "first steps lead");
  assert.doesNotMatch(html, /home-start-fold/);
  // The DM's map path uploads a map (Roll20 Quick Start), not the generic Preparation list.
  h.ctx.role = "dm";
  html = slotHTML(h.registry, "route", "home", h.ctx);
  assert.match(html, /data-home-path="map"/);
});
