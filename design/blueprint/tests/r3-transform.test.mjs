// R3 PG-79 (transformations, delegated simulation I-233) and PG-77 (the token shows the form):
// dnd5e's Transform dialog presets and keep switches (FVT-034), SRD 5.2.1 Polymorph (EN
// 153–154 / IT 164): a Beast of CR up to the target's CR or level, game statistics replaced,
// personality, creature type and Hit Points kept, Temporary HP equal to the form's HP, no
// speech or spells; it ends at 0 Temporary HP, at death or when the caster's Concentration
// ends. An unwilling target makes a Wisdom save through a roll request.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import * as forms from "../forms-companions.mjs";
import * as D from "../special-moves-domain.mjs";
import * as UI from "../special-moves.mjs";
import { applyVitalityEvent } from "../conditions.mjs";
import { tokenArt } from "../media-domain.mjs";
import * as media from "../media.mjs";
import { harness, op, answer } from "./r3-harness.mjs";

afterEach(() => UI.resetSpecialMovesView());
const areas = [
  [D.ID, UI.register],
  ["media", media.register],
];
function transform(h, actorId, selection, role = "dm", id = "tf-" + actorId) {
  return h.cmd(
    "transform",
    (d) => {
      const p = forms.previewTransform(d, actorId, selection, role);
      assert.equal(p.canApply, true, JSON.stringify(p.errors));
      return forms.applyTransform(d, actorId, selection, role, {
        operationId: id,
        reviewKey: p.reviewKey,
      });
    },
    role,
  );
}

test("R3 PG-79: Metamorfosi on the Sentinella: the wolf's statistics, Temporary HP, same HP and personality", () => {
  const h = harness({ areas, role: "dm" });
  const before = structuredClone(h.s.actors["goblin-1"]);
  transform(h, "goblin-1", { preset: "polymorph", profileId: "srd2024:wolf" });
  const a = h.s.actors["goblin-1"];
  const e = forms.getEffectiveActor(a);
  assert.equal(a.activeForm.kind, "polymorph");
  // Game statistics replaced, mental scores included (not like Wild Shape).
  assert.deepEqual(e.abilities, { str: 14, dex: 15, con: 12, int: 3, wis: 12, cha: 6 });
  assert.deepEqual([e.ac, e.speed, e.size], [12, 12, "medium"]);
  assert.equal(e.skillModifiers.perception, 5);
  assert.equal(e.combatProfile.meleeAttack.attackBonus, 4);
  assert.deepEqual(e.combatProfile.spells, []);
  assert.match(forms.formLimitsText(a).it, /non può parlare né lanciare incantesimi/i);
  // Hit Points, name and creature type are kept; the form's HP arrive as Temporary HP.
  assert.deepEqual([a.hp, a.maxHp, a.name], [before.hp, before.maxHp, "Sentinella"]);
  assert.deepEqual([a.tempHp, a.tempHpSource.id], [11, a.activeForm.id]);
  assert.equal(forms.formTokenName(a, "it"), "Lupo (Sentinella)");
  assert.equal(forms.formTokenName(a, "en"), "Wolf (Sentinella)");
  // PG-77: the token shows the form (the media seed has no wolf art: the form emblem).
  const art = tokenArt(h.s, "goblin-1");
  assert.deepEqual(
    [art.source, art.label, art.emblem?.slug],
    ["form", "Lupo (Sentinella)", "wolf"],
  );
});

test("R3 PG-79: the Polymorph form ends when its Temporary HP are gone", () => {
  const h = harness({ areas, role: "dm" });
  transform(h, "goblin-1", { preset: "polymorph", profileId: "srd2024:wolf" });
  h.cmd(
    "bite",
    (d) =>
      applyVitalityEvent(d, {
        eventId: "r3-tf-damage",
        actorId: "goblin-1",
        kind: "damage",
        amount: 11,
        source: { kind: "authored", revision: "r3" },
      }),
    "dm",
  );
  const a = h.s.actors["goblin-1"];
  assert.equal(a.activeForm, null, "no Temporary HP left: back to the original form");
  assert.equal(a.hp, 7, "the excess did not reach the real Hit Points");
  // PG-77: the Sentinella's own token art is back at once.
  assert.deepEqual(
    [tokenArt(h.s, "goblin-1").source, tokenArt(h.s, "goblin-1").label],
    ["variant", "Sentinella"],
  );
});

test("R3 PG-79: the form ends when the caster's Concentration ends; leftover Temporary HP vanish", () => {
  const h = harness({ areas, role: "dm" });
  // Casting Polymorph spends a level 4 slot (hand-off PG-79): Livia holds one for this test.
  h.cmd("slot", (d) => (d.actors.livia.spellSlots = { 4: { used: 0, max: 1 } }), "dm");
  transform(h, "goblin-1", {
    preset: "polymorph",
    profileId: "srd2024:wolf",
    casterId: "livia",
  });
  const conc = h.s.actors.livia.concentration;
  assert.deepEqual([conc.active, conc.name.it], [true, "Metamorfosi"]);
  assert.equal(h.s.actors["goblin-1"].activeForm.concentrationId, conc.id);
  h.cmd("lose concentration", (d) => (d.actors.livia.concentration.active = false), "dm");
  const a = h.s.actors["goblin-1"];
  assert.equal(a.activeForm, null);
  assert.equal(a.tempHp, 0, "the spell's Temporary HP vanish when it ends");
});

test("R3 PG-79: Polymorph lists Beasts up to the target's CR (or level) and says why the others are out", () => {
  const h = harness({ areas, role: "dm" });
  h.cmd("cr", (d) => (d.actors["goblin-2"].cr = 0.25), "dm");
  const rows = forms.listTransformProfiles(h.s, "goblin-2", "dm", { preset: "polymorph" });
  const wolf = rows.find((r) => r.id === "srd2024:wolf");
  const dire = rows.find((r) => r.id === "srd2024:dire-wolf");
  assert.equal(wolf.eligible, true);
  assert.equal(dire.eligible, false);
  assert.match(dire.reasons[0].it, /GS 1 .*oltre.*1\/4/);
  assert.ok(rows.every((r) => r.creatureType === "beast"));
  assert.ok(rows.length >= 8, "the SRD sample bestiary's Beasts");
  const p = forms.previewTransform(
    h.s,
    "goblin-2",
    { preset: "polymorph", profileId: "srd2024:dire-wolf" },
    "dm",
  );
  assert.equal(p.canApply, false);
});

test("R3 PG-79: DM custom transformation keeps what its switches keep; players cannot use it", () => {
  const h = harness({ areas, role: "dm" });
  const selection = {
    preset: "custom",
    profileId: "srd2024:black-bear",
    keep: { physical: false, mental: true, saves: true, skills: false, classFeatures: true },
    hp: "own",
  };
  const refused = forms.previewTransform(h.s, "livia", selection, "player");
  assert.equal(refused.canApply, false);
  assert.equal(refused.errors[0].code, "custom-dm");
  const tempBefore = h.s.actors.livia.tempHp ?? 0;
  transform(h, "livia", selection);
  const livia = h.s.actors.livia;
  const e = forms.getEffectiveActor(livia);
  assert.deepEqual(
    [e.abilities.str, e.abilities.dex, e.abilities.int, e.abilities.wis],
    [15, 12, 16, 12],
    "bear body, Livia's mind",
  );
  assert.deepEqual([e.ac, e.speed], [11, 9]);
  assert.ok(e.combatProfile.spells.includes("fire-bolt"), "class features kept");
  assert.equal(livia.tempHp ?? 0, tempBefore, "own HP: no form Temporary HP");
  assert.equal(forms.formTokenName(livia, "it"), "Orso nero (Livia)");
  // A custom form with own HP does not end on Temporary HP; the DM reverts it.
  h.cmd(
    "revert",
    (d) => {
      const p = forms.previewFormReturn(d, "livia", { mode: "normal" }, "dm");
      assert.equal(p.canApply, true, JSON.stringify(p.errors));
      return forms.returnToNormalForm(d, "livia", { mode: "normal" }, "dm", {
        operationId: "rv-livia",
        reviewKey: p.reviewKey,
      });
    },
    "dm",
  );
  assert.equal(h.s.actors.livia.activeForm, null);
  assert.equal(h.s.actors.livia.bonus, true, "ending a transformation spends no Bonus Action");
});

test("R3 PG-79: players transform only creatures they control", () => {
  const h = harness({ areas, role: "player" });
  const enemy = forms.previewTransform(
    h.s,
    "goblin-1",
    { preset: "polymorph", profileId: "srd2024:cat" },
    "player",
  );
  assert.equal(enemy.canApply, false);
  assert.equal(enemy.errors[0].code, "permission");
  transform(h, "livia", { preset: "polymorph", profileId: "srd2024:cat" }, "player");
  assert.equal(forms.formTokenName(h.s.actors.livia, "en"), "Cat (Livia)");
});

test("R3 PG-79: an unwilling target makes a Wisdom save through a roll request; a failure transforms it", () => {
  const h = harness({ areas, role: "dm" });
  const selection = { preset: "polymorph", profileId: "srd2024:rat", casterId: "livia" };
  // Casting Polymorph spends a level 4 slot (hand-off PG-79): Livia holds one for this test.
  h.cmd("slot", (d) => (d.actors.livia.spellSlots = { 4: { used: 0, max: 1 } }), "dm");
  const attempt = h.cmd(
    "polymorph save",
    (d) => D.commitTransformSave(d, { actorId: "goblin-1", dc: 13, selection }, "dm", op("tfs")),
    "dm",
  );
  const request = h.s.combatAttempts.find((a) => a.id === attempt.id).requests[0];
  assert.deepEqual([request.actorId, request.kind, request.dc], ["goblin-1", "save", 13]);
  assert.match(request.label.it, /Metamorfosi/);
  assert.equal(h.s.actors["goblin-1"].activeForm ?? null, null, "nothing happens before the save");
  h.cmd("save", (d) => answer(d, attempt.id, [2], "dm"), "dm");
  assert.equal(h.s.actors["goblin-1"].activeForm.profileId, "srd2024:rat");
  assert.equal(h.s.actors.livia.concentration.active, true);
  // A success leaves the target as it is.
  const h2 = harness({ areas, role: "dm" });
  h2.cmd("slot", (d) => (d.actors.livia.spellSlots = { 4: { used: 0, max: 1 } }), "dm");
  const again = h2.cmd(
    "polymorph save",
    (d) => D.commitTransformSave(d, { actorId: "goblin-1", dc: 5, selection }, "dm", op("tfs2")),
    "dm",
  );
  h2.cmd("save", (d) => answer(d, again.id, [19], "dm"), "dm");
  assert.equal(h2.s.actors["goblin-1"].activeForm ?? null, null);
});
