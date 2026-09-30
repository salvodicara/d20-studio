// Hand-off of audit round 2 (R4 note): importing the encounter builder's domain before
// Preparation used to throw «Cannot access 'ID' before initialization» (the cycle
// encounter-builder-domain → preparation → encounter-builder). The domain is imported first
// here, in a process of its own.
import test from "node:test";
import assert from "node:assert/strict";
import * as domain from "../encounter-builder-domain.mjs";

test("encounter-builder-domain loads first without the Preparation cycle failing", async () => {
  assert.equal(domain.ID, "encounter-builder");
  const ui = await import("../encounter-builder.mjs");
  assert.equal(typeof ui.register, "function");
});
