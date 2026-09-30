// Hand-off of audit round 2 — PG-79: casting Polymorph (SRD 5.2.1, EN 153–154 / IT 164: a
// level 4 Transmutation, casting time an Action, Concentration) through the Transform dialog
// spends the caster's spell slot of level 4 or higher and, in combat, the caster's Action,
// as BG3 and the dnd5e sheet spend them when the spell is cast. A caster without such a slot
// is refused with the reason and the remedy; «Nessuno» (an effect the DM decides) spends
// nothing. The unwilling target's save is asked after the same cast. Synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import * as forms from "../forms-companions.mjs";
import * as D from "../special-moves-domain.mjs";
import * as UI from "../special-moves.mjs";
import * as media from "../media.mjs";
import { harness, op, answer } from "./r3-harness.mjs";

afterEach(() => UI.resetSpecialMovesView());
const areas = [
  [D.ID, UI.register],
  ["media", media.register],
];
const polymorph = { preset: "polymorph", profileId: "srd2024:wolf", casterId: "livia" };
const giveSlots = (h, slots) =>
  h.cmd(
    "slots",
    (d) => (d.actors.livia.spellSlots = { ...d.actors.livia.spellSlots, ...slots }),
    "dm",
  );

test("PG-79: a caster without a level 4+ slot cannot cast Polymorph; the reason names the remedy", () => {
  const h = harness({ areas, role: "dm" });
  const p = forms.previewTransform(h.s, "goblin-1", polymorph, "dm");
  assert.equal(p.canApply, false);
  const error = p.errors.find((e) => e.code === "slot");
  assert.ok(error, JSON.stringify(p.errors));
  assert.match(error.it, /Livia non ha uno slot libero di 4° livello o superiore/);
  assert.match(error.it, /«Nessuno»/);
  // Without a caster nothing is spent (an effect the DM decides, as before).
  const free = forms.previewTransform(h.s, "goblin-1", { ...polymorph, casterId: undefined }, "dm");
  assert.equal(free.canApply, true);
  assert.equal(free.costs.length, 0);
});

test("PG-79: casting spends the lowest free slot of level 4+ (or the chosen one) and, in combat, the Action", () => {
  const h = harness({ areas, role: "dm" });
  giveSlots(h, { 4: { used: 0, max: 1 }, 5: { used: 0, max: 1 } });
  h.cmd(
    "combat",
    (d) => {
      d.combat.active = true;
      d.combat.order = ["livia", "goblin-1", "doran", "goblin-2"];
      d.combat.turn = 0;
      d.actors.livia.action = true;
    },
    "dm",
  );
  const p = forms.previewTransform(h.s, "goblin-1", polymorph, "dm");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  assert.deepEqual(
    p.costs.map((c) => [c.kind, c.level ?? null, c.before, c.after]),
    [
      ["slot", 4, 1, 0],
      ["action", null, 1, 0],
    ],
  );
  h.cmd(
    "cast",
    (d) =>
      forms.applyTransform(d, "goblin-1", polymorph, "dm", {
        operationId: "tf-cast",
        reviewKey: p.reviewKey,
      }),
    "dm",
  );
  const livia = h.s.actors.livia;
  assert.equal(livia.spellSlots[4].used, 1);
  assert.equal(livia.spellSlots[5].used, 0);
  assert.equal(livia.action, false);
  assert.equal(livia.concentration.name.it, "Metamorfosi");
  // A chosen higher slot is the one spent; a spent Action refuses the cast.
  const again = harness({ areas, role: "dm" });
  giveSlots(again, { 4: { used: 0, max: 1 }, 5: { used: 0, max: 1 } });
  const chosen = { ...polymorph, slotLevel: 5 };
  const q = forms.previewTransform(again.s, "goblin-1", chosen, "dm");
  again.cmd(
    "cast 5",
    (d) =>
      forms.applyTransform(d, "goblin-1", chosen, "dm", {
        operationId: "tf-cast-5",
        reviewKey: q.reviewKey,
      }),
    "dm",
  );
  assert.deepEqual(
    [again.s.actors.livia.spellSlots[4].used, again.s.actors.livia.spellSlots[5].used],
    [0, 1],
  );
  const busy = harness({ areas, role: "dm" });
  giveSlots(busy, { 4: { used: 0, max: 1 } });
  busy.cmd(
    "spent",
    (d) => {
      d.combat.active = true;
      d.actors.livia.action = false;
    },
    "dm",
  );
  const refused = forms.previewTransform(busy.s, "goblin-1", polymorph, "dm");
  assert.equal(refused.canApply, false);
  assert.match(refused.errors.find((e) => e.code === "action").it, /Azione/);
});

test("PG-79: an unwilling target: the slot is spent when the save is asked, not again on a failure", () => {
  const h = harness({ areas, role: "dm" });
  giveSlots(h, { 4: { used: 0, max: 2 } });
  const attempt = h.cmd(
    "polymorph save",
    (d) =>
      D.commitTransformSave(
        d,
        { actorId: "goblin-1", dc: 13, selection: polymorph },
        "dm",
        op("tfs"),
      ),
    "dm",
  );
  assert.equal(h.s.actors.livia.spellSlots[4].used, 1, "spent with the cast");
  h.cmd("save", (d) => answer(d, attempt.id, [2], "dm"), "dm");
  assert.equal(h.s.actors["goblin-1"].activeForm.profileId, "srd2024:wolf");
  assert.equal(h.s.actors.livia.spellSlots[4].used, 1, "not spent twice");
});
