// R4 (fix round 2) — sample data: TV-52 (Improved Initiative plain labels), TV-59 (Mob Attack
// Tool) and TV-79 (dnd5e concentration request, Fantasy Grounds (C) effect). The real store,
// registry and areas; synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState, AMBUSH_SCENE_ID, AMBUSH_GOBLINS } from "../state.mjs";
import { listActions, applyConditionFollowUps } from "../combat.mjs";
import { applyVitalityEvent } from "../conditions.mjs";
import * as inv from "../inventory-plus.mjs";
import * as loot from "../loot.mjs";
import * as tracker from "../combat-tracker.mjs";
import * as TD from "../combat-tracker-domain.mjs";
// After the tracker: entering the preparation ↔ encounter-builder import cycle from the
// encounter builder's domain first fails at load (reported to R5 in fix2-R4.md).
import { initiativeKeyOf, sortParticipants } from "../encounter-builder-domain.mjs";
import * as spells from "../spells-plus.mjs";
import * as SPD from "../spells-plus-domain.mjs";
import * as library from "../character-library.mjs";
import { harness } from "./p4-harness.mjs";

const setup = (role = "dm") =>
  harness({
    role,
    areas: [
      ["loot", loot.register],
      ["character-library", library.register],
      ["inventory-plus", inv.register],
      ["spells-plus", spells.register],
      ["combat-tracker", tracker.register],
    ],
  });

test("TV-52: the default scene is untouched; «Agguato sulla strada» is an extra scene, not active", () => {
  const s = createInitialState();
  assert.equal(s.activeSceneId, "old-watch");
  assert.deepEqual(s.combat.order, ["livia", "goblin-1", "doran", "goblin-2"]);
  const watch = s.scenes.find((scene) => scene.id === "old-watch");
  assert.deepEqual(
    watch.tokens.map((t) => t.actorId),
    ["livia", "doran", "goblin-1", "goblin-2", "mira"],
  );
  assert.equal(s.scenes[0].id, "old-watch", "the default scene stays first");
  const ambush = s.scenes.find((scene) => scene.id === AMBUSH_SCENE_ID);
  assert.equal(ambush.name, "Agguato sulla strada");
  assert.deepEqual(
    ambush.tokens.map((t) => t.actorId),
    ["livia", "doran", "mira", ...AMBUSH_GOBLINS],
  );
  for (const token of ambush.tokens) {
    assert.ok(token.x > 20 && token.x < ambush.width - 20);
    assert.ok(token.y > 20 && token.y < ambush.height - 20);
  }
});

test("TV-52: two identical SRD Goblin Warriors with plain labels share one Initiative roll", () => {
  const s = createInitialState();
  const [a, b] = AMBUSH_GOBLINS.map((id) => s.actors[id]);
  assert.equal(a.name, "Goblin guerriero A");
  assert.equal(b.name, "Goblin guerriero B");
  for (const goblin of [a, b]) {
    assert.equal(goblin.kind, "npc");
    assert.equal(goblin.owner, "dm");
    assert.deepEqual([goblin.hp, goblin.maxHp, goblin.ac], [10, 10, 15]);
    assert.deepEqual(goblin.abilities, { str: 8, dex: 15, con: 10, int: 10, wis: 8, cha: 8 });
    assert.equal(goblin.compendiumRef.id, "srd2024:creature:goblin-warrior");
    assert.equal(goblin.combatProfile.team, "watch");
    assert.equal(goblin.vitalityPolicy.zeroHp, "death");
  }
  // One key for the pair (the SRD's one roll for identical creatures), its own for others.
  assert.equal(initiativeKeyOf(s, a.id), initiativeKeyOf(s, b.id));
  assert.notEqual(initiativeKeyOf(s, a.id), initiativeKeyOf(s, "goblin-1"));
  assert.equal(initiativeKeyOf(s, "livia"), "actor:livia");
  // Sorting a prepared order keeps the pair together with their shared total.
  const order = sortParticipants(s, [
    { actorId: a.id, natural: 12, bonus: 2 },
    { actorId: "livia", natural: 13, bonus: 2 },
    { actorId: b.id, natural: 12, bonus: 2 },
    { actorId: "doran", natural: 18, bonus: 0 },
  ]);
  assert.deepEqual(
    order.map((p) => p.actorId),
    ["doran", "livia", a.id, b.id],
  );
  // The tracker groups them by their plain name (house rule «Turno di gruppo»).
  assert.equal(TD.baseName(a.name), TD.baseName(b.name));
});

test("TV-59: each goblin carries its stat block's Scimitar and Shortbow at the Table", () => {
  const h = setup();
  for (const id of AMBUSH_GOBLINS) {
    const actions = listActions(h.store.state, id);
    const scimitar = actions.find((row) => row.id === "melee-attack");
    assert.equal(scimitar.name.en, "Scimitar");
    assert.equal(scimitar.attackModifier, 4);
    assert.deepEqual(scimitar.dice, [{ count: 1, sides: 6 }]);
    assert.equal(scimitar.damageModifier, 2);
    assert.equal(scimitar.damageType, "slashing");
    assert.equal(scimitar.source.kind, "srd");
    const shortbow = actions.find((row) => row.itemId === id + "-shortbow");
    assert.ok(shortbow, "the Shortbow is a Table attack");
    assert.equal(shortbow.attackType, "ranged");
    assert.equal(shortbow.attackModifier, 4);
    assert.equal(shortbow.damageModifier, 2);
    assert.deepEqual(shortbow.dice, [{ count: 1, sides: 6 }]);
    assert.equal(shortbow.damageType, "piercing");
    assert.equal(shortbow.rangeMeters, 24);
    assert.equal(shortbow.longRangeMeters, 96);
  }
});

function startAmbush(h, { groupTurns = false } = {}) {
  h.ctx.role = "dm";
  h.ctx.commit("setup", (s) => {
    const slice = TD.sliceOf(s);
    if (groupTurns)
      TD.setGroupTurns(
        s,
        slice,
        true,
        { title: "Turno di gruppo", text: "I goblin uguali agiscono insieme." },
        "dm",
      );
    const rows = TD.startCandidates(s, AMBUSH_SCENE_ID);
    const natural = { "goblin-warrior-a": 18, "goblin-warrior-b": 18, livia: 5, doran: 4, mira: 3 };
    for (const row of rows) {
      row.included = true;
      row.natural = natural[row.actorId];
      row.bonus = 0;
    }
    TD.startFromTable(s, AMBUSH_SCENE_ID, rows, "dm");
  });
}

test("TV-52: «Agguato sulla strada» starts at the Table with the party and both goblins", () => {
  const h = setup();
  const rows = TD.startCandidates(h.store.state, AMBUSH_SCENE_ID);
  assert.deepEqual(
    rows.map((r) => r.actorId).sort(),
    [...AMBUSH_GOBLINS, "doran", "livia", "mira"].sort(),
  );
  assert.ok(
    rows.every((r) => r.included),
    "every visible token is a candidate",
  );
  startAmbush(h);
  const s = h.store.state;
  assert.equal(s.activeSceneId, AMBUSH_SCENE_ID);
  assert.deepEqual(s.combat.order.slice(0, 2), AMBUSH_GOBLINS);
});

test("TV-59: «Attacco di gruppo» commands both goblins, one attack roll each", () => {
  const h = setup();
  startAmbush(h, { groupTurns: true });
  const s = h.store.state;
  const slice = TD.sliceOf(s);
  const { attackers, targets } = TD.mobCandidates(s, slice, "dm");
  assert.deepEqual(
    attackers.map((a) => a.actorId),
    AMBUSH_GOBLINS,
  );
  assert.ok(
    attackers.every((a) => a.actionId && !a.reason),
    "both have an attack ready",
  );
  assert.ok(targets.includes("livia"));
  const before = (s.combatAttempts ?? []).length;
  h.ctx.commit("Attacco di gruppo", (draft) =>
    TD.beginMobAttack(
      draft,
      TD.sliceOf(draft),
      { attackerIds: AMBUSH_GOBLINS, targetId: "livia", mode: "digital" },
      "dm",
    ),
  );
  const attempts = h.store.state.combatAttempts.slice(before);
  assert.deepEqual(
    attempts.map((a) => a.actorId),
    AMBUSH_GOBLINS,
  );
  assert.equal(new Set(attempts.map((a) => a.id)).size, 2, "one attempt per goblin");
});

test("TV-79: Mira prepares SRD Druid spells with her Druid 3 slots", () => {
  const s = createInitialState();
  const mira = s.actors.mira;
  const byLevel = (level) => mira.spells.filter((row) => row.level === level);
  assert.equal(byLevel(0).length, 2, "two Druid cantrips");
  const prepared = mira.spells.filter(
    (row) => row.level > 0 && row.prepared && !row.alwaysPrepared,
  );
  assert.equal(prepared.length, 6, "Druid 3 prepares six spells");
  for (const slug of ["faerie-fire", "entangle"]) {
    const row = mira.spells.find((r) => r.catalogId === slug);
    assert.equal(row.prepared, true);
    assert.equal(SPD.spellEntryFor(row).concentration, true);
  }
  const always = mira.spells.find((r) => r.catalogId === "speak-with-animals");
  assert.equal(always.alwaysPrepared, true, "Druidic: Speak with Animals always prepared");
  assert.deepEqual(mira.spellSlots, { 1: { max: 4, used: 1 }, 2: { max: 2, used: 0 } });
  assert.ok(mira.formsProfile, "her forms fixture stays");
});

test("TV-79: casting Faerie Fire from Mira's sheet sets Concentration; damage asks the CON save", () => {
  const h = setup("player");
  const row = h.store.state.actors.mira.spells.find((r) => r.catalogId === "faerie-fire");
  const input = { rowId: row.id, via: "slot", level: 1 };
  const preview = SPD.previewCast(h.store.state, "mira", input, "player");
  assert.equal(preview.ok, true, JSON.stringify(preview.errors));
  h.ctx.commit("Luminescenza", (draft) => SPD.castSpell(draft, "mira", input, "player"));
  const mira = h.store.state.actors.mira;
  assert.equal(mira.concentration.active, true);
  assert.equal(mira.concentration.name.en, "Faerie Fire");
  assert.equal(mira.spellSlots[1].used, 2, "one level 1 slot spent");
  h.ctx.role = "dm";
  h.ctx.commit("Danno", (draft) => {
    const result = applyVitalityEvent(draft, {
      eventId: "arrow",
      actorId: "mira",
      kind: "damage",
      amount: 5,
      source: { kind: "authored-demo", revision: "r4-test" },
    });
    applyConditionFollowUps(draft, result, { manual: true });
  });
  const request = h.store.state.combatAttempts
    .flatMap((a) => a.requests)
    .find((r) => r.kind === "concentration" && r.actorId === "mira");
  assert.ok(request, "damage asks the Constitution save");
  assert.equal(request.dc, 10);
  assert.equal(request.concentrationName.en, "Faerie Fire");
});
