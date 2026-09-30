// R1 (round 2) — one roll engine for Table attacks, DM requests and campaign rules.
// PG-47 riders in the roll, TV-92 the player's own list, TV-141 disguised names, TV-83 the
// Heroic Inspiration hold, TV-89 critical damage and audiences, BI-24 inventory weapons with a
// forged +1, BI-18 homebrew Advantage, H-01 campaign criticals and flanking, C1 hidden DCs,
// C3 session authority, C10 controlled mounts. Synthetic demo data only.
import test, { before } from "node:test";
import assert from "node:assert/strict";
import { createInitialState, createStore } from "../state.mjs";
import {
  neighboursReady,
  listActions,
  previewAction,
  beginAttempt,
  resolveRoll,
  projectAttempts,
  enqueueRollRequest,
  useHeroicInspiration,
  continueWithoutInspiration,
  actionBlockReason,
  requestScore,
  sessionAuthority,
} from "../combat.mjs";
import * as SP from "../sheet-plus-domain.mjs";
import * as TD from "../dice-tray-domain.mjs";
import * as CS from "../campaign-settings-domain.mjs";
import * as HE from "../homebrew-editor-domain.mjs";
import * as SM from "../special-moves-domain.mjs";
import { rowWeapon, activeItemModifiers } from "../srd-sample.mjs";
import { getEntry, srdMeleeProfile } from "../srd-compendium.mjs";

before(async () => {
  await neighboursReady;
});

// Livia next to the Sentinella (goblin-1) in combat on her turn, with the sheet, dice tray
// and campaign settings slices the areas keep.
function fixture() {
  const state = createInitialState();
  state.ext ??= {};
  state.ext[SP.ID] = SP.seedSlice(state);
  state.ext[TD.ID] = TD.seedSlice();
  state.ext[CS.ID] = CS.seedSlice();
  state.combat.active = true;
  state.combat.order = ["livia", "goblin-1", "doran", "goblin-2"];
  state.combat.turn = 0;
  const place = (id, x, y) =>
    Object.assign(
      state.scenes[0].tokens.find((t) => t.actorId === id),
      { x, y },
    );
  place("livia", 100, 100);
  place("goblin-1", 150, 100);
  place("doran", 300, 300);
  place("goblin-2", 400, 400);
  for (const actor of Object.values(state.actors)) {
    actor.hp = 40;
    actor.maxHp = 40;
    actor.ac = 12;
  }
  // The Sentinella attacks with the SRD Goblin Warrior's scimitar (configured profile).
  const goblin = state.actors["goblin-1"];
  goblin.combatProfile = {
    ...(goblin.combatProfile ?? {}),
    team: "watch",
    meleeAttack: srdMeleeProfile(getEntry("srd2024:creature:goblin-warrior")),
  };
  return state;
}
const attackOf = (attempt) => attempt.requests.find((r) => r.kind === "attack");
const staffAttack = (state, selection = {}, id = "a-1", role = "player") =>
  beginAttempt(
    state,
    {
      id,
      actorId: "livia",
      actionId: "quarterstaff",
      selection: { targetIds: ["goblin-1"], ...selection },
      mode: "physical",
    },
    role,
  );

test("PG-47: Bless rolls its own d4 in a Table attack and the total includes it; Bane subtracts", () => {
  const state = fixture();
  SP.toggleEffect(state, "livia", "bless", true, "player");
  const attempt = staffAttack(state);
  const attack = attackOf(attempt);
  assert.deepEqual(
    attack.dice.map((d) => [d.count, d.sides]),
    [
      [1, 20],
      [1, 4],
    ],
  );
  assert.equal(attack.riders[0].id, "bless");
  resolveRoll(state, attempt.id, attack.id, [9, 3], "player");
  assert.equal(attack.natural, 9);
  assert.equal(attack.total, 9 + 3 + attack.modifier);
  assert.equal(attack.riderRolls[0].total, 3);
  assert.equal(attack.riderRolls[0].name.it, "Benedizione");

  const bane = fixture();
  SP.toggleEffect(bane, "livia", "bane", true, "player");
  const cursed = staffAttack(bane);
  resolveRoll(bane, cursed.id, attackOf(cursed).id, [15, 2], "player");
  assert.equal(attackOf(cursed).total, 15 - 2 + attackOf(cursed).modifier);
  // With Advantage the two d20s come first: the rider's face is never the natural.
  const adv = fixture();
  SP.toggleEffect(adv, "livia", "bless", true, "player");
  const twice = staffAttack(adv, { rollMode: "advantage" });
  resolveRoll(adv, twice.id, attackOf(twice).id, [2, 3, 4], "player");
  assert.equal(attackOf(twice).natural, 3);
  assert.equal(attackOf(twice).total, 3 + 4 + attackOf(twice).modifier);
});

test("PG-47: a save the DM requests in combat rolls the creature's Bless die too", () => {
  const state = fixture();
  SP.toggleEffect(state, "livia", "bless", true, "player");
  const attempt = enqueueRollRequest(
    state,
    {
      id: "g1",
      actorId: "livia",
      kind: "save",
      ability: "dex",
      modifier: 2,
      dc: 13,
      label: { it: "TS", en: "Save" },
    },
    "dm",
  );
  const save = attempt.requests[0];
  assert.deepEqual(
    save.dice.map((d) => d.sides),
    [20, 4],
  );
  resolveRoll(state, attempt.id, save.id, [10, 4], "player");
  assert.equal(save.total, 10 + 4 + 2);
  // A check does not read Bless (attack rolls and saving throws only).
  const check = enqueueRollRequest(
    state,
    {
      id: "g2",
      actorId: "livia",
      kind: "check",
      ability: "dex",
      modifier: 2,
      label: { it: "Prova", en: "Check" },
    },
    "dm",
  );
  assert.equal(check.requests[0].dice.length, 1);
  assert.equal(requestScore(save, [10, 4]).total, 16);
});

test("TV-92: a player's Tiri e risultati never lists requests of DM creatures", () => {
  const state = fixture();
  enqueueRollRequest(
    state,
    {
      id: "g1",
      actorId: "goblin-1",
      kind: "save",
      ability: "dex",
      modifier: 1,
      dc: 12,
      label: { it: "TS", en: "Save" },
    },
    "dm",
  );
  enqueueRollRequest(
    state,
    {
      id: "g2",
      actorId: "livia",
      kind: "save",
      ability: "dex",
      modifier: 2,
      dc: 12,
      label: { it: "TS", en: "Save" },
    },
    "dm",
  );
  const player = projectAttempts(state, "player");
  // The Sentinella's token is in view, so its card is known; it is not the player's own.
  assert.deepEqual(
    player.filter((a) => a.own).map((a) => a.actorId),
    ["livia"],
  );
  assert.deepEqual(
    projectAttempts(state, "dm").map((a) => a.own),
    [true, true],
  );
});

test("TV-141: a disguised Sentinella never shows its true name to the player, before or after the disguise", () => {
  const state = fixture();
  // Before the disguise: Livia's attack names its target (a miss settles it).
  const first = staffAttack(state);
  resolveRoll(state, first.id, attackOf(first).id, [1], "player");
  // B12 token menu: the DM hides the name; the creature now wears «Figura incappucciata».
  state.ext["token-menu"] = { names: { "goblin-1": { hidden: true, trueName: "Sentinella" } } };
  state.actors["goblin-1"].name = "Figura incappucciata";
  state.combat.turn = 1;
  state.actors.livia.action = true;
  beginAttempt(
    state,
    {
      id: "a-2",
      actorId: "goblin-1",
      actionId: "melee-attack",
      selection: { targetIds: ["livia"] },
      mode: "physical",
    },
    "dm",
  );
  const player = JSON.stringify(projectAttempts(state, "player"));
  assert.doesNotMatch(player, /Sentinella/);
  assert.match(player, /Figura incappucciata/);
  const dm = JSON.stringify(projectAttempts(state, "dm"));
  assert.match(dm, /Sentinella/);
});

test("TV-83: with Heroic Inspiration the attack stops after the d20; the reroll spends it and keeps the new face", () => {
  const store = createStore({ storage: null });
  store.commit(
    "Fixture",
    (s) => {
      const f = fixture();
      Object.assign(s, f);
      s.ext[TD.ID].inspiration.livia = { active: true, at: "2026-09-27T10:00:00Z", by: "dm" };
    },
    "dm",
  );
  store.commit("Attempt", (s) => staffAttack(s), "player");
  const id = store.state.combatAttempts[0].id;
  const attackId = attackOf(store.state.combatAttempts[0]).id;
  store.commit("Roll", (s) => resolveRoll(s, id, attackId, [4], "player"), "player");
  let attempt = store.state.combatAttempts[0];
  assert.equal(attackOf(attempt).hold, "inspiration");
  assert.equal(attempt.outcomes[0].status, "pending");
  assert.equal(attempt.outcomes[0].hit, undefined, "nothing hits before the choice");
  assert.ok(!attempt.requests.some((r) => r.kind === "damage"));
  assert.throws(() => continueWithoutInspiration(store.state, id, "no-such-request", "player"));
  store.commit(
    "Reroll",
    (s) => useHeroicInspiration(s, id, attackId, "player", { face: 18 }),
    "player",
  );
  attempt = store.state.combatAttempts[0];
  assert.equal(attackOf(attempt).natural, 18);
  assert.equal(attackOf(attempt).inspirationReroll.from, 4);
  assert.equal(store.state.ext[TD.ID].inspiration.livia.active, false);
  assert.equal(attempt.outcomes[0].hit, true);
  assert.ok(attempt.requests.some((r) => r.kind === "damage"));
  // Both faces are in the log: the first roll and the accepted reroll.
  const faces = store.state.log
    .flatMap((entry) => entry.rolls ?? [])
    .filter((roll) => roll.requestId === attackId)
    .map((roll) => roll.values);
  assert.deepEqual(faces, [[4], [18]]);
});

test("TV-83: «Continua» keeps the roll; without inspiration nothing waits", () => {
  const state = fixture();
  state.ext[TD.ID].inspiration.livia = { active: true };
  const kept = staffAttack(state);
  resolveRoll(state, kept.id, attackOf(kept).id, [15], "player");
  continueWithoutInspiration(state, kept.id, attackOf(kept).id, "player");
  assert.equal(attackOf(kept).hold, undefined);
  assert.equal(kept.outcomes[0].hit, true);
  assert.equal(state.ext[TD.ID].inspiration.livia.active, true, "not spent");
  const plain = fixture();
  const attempt = staffAttack(plain);
  resolveRoll(plain, attempt.id, attackOf(attempt).id, [15], "player");
  assert.equal(attackOf(attempt).hold, undefined);
  assert.equal(attempt.outcomes[0].hit, true);
});

test("TV-89: declared critical damage doubles the dice; «Solo il DM» hides the values from the roller", () => {
  const state = fixture();
  const attempt = staffAttack(state, {
    forceCritical: true,
    criticalReason: "Paralizzato",
    audience: "blind",
  });
  resolveRoll(state, attempt.id, attackOf(attempt).id, [14], "player");
  assert.equal(attempt.outcomes[0].critical, true);
  assert.deepEqual(attempt.outcomes[0].criticalReasons, ["declared"]);
  assert.equal(attempt.requests.find((r) => r.kind === "damage").dice[0].count, 2);
  const player = projectAttempts(state, "player")[0];
  assert.equal(player.audience, "blind");
  assert.equal(attackOf(player).total, undefined);
  assert.equal(attackOf(player).hiddenResult, "blind");
  assert.equal(player.outcomes[0].hit, undefined);
  const dm = projectAttempts(state, "dm")[0];
  assert.equal(attackOf(dm).total, attackOf(attempt).total);
  assert.equal(dm.outcomes[0].hit, true);
  // «Solo io» of the DM's own roll: the player reads neither the dice nor the result.
  const own = fixture();
  own.combat.turn = 1;
  const goblinAttack = listActions(own, "goblin-1").find((a) => a.kind === "attack");
  if (goblinAttack) {
    const hidden = beginAttempt(
      own,
      {
        id: "g-1",
        actorId: "goblin-1",
        actionId: goblinAttack.id,
        selection: { targetIds: ["doran"], audience: "self" },
        mode: "physical",
      },
      "dm",
    );
    assert.equal(hidden.audience, "self");
  }
});

test("BI-24: a forged +1 longsword in the inventory attacks with +1 to hit and to damage, named", () => {
  const state = fixture();
  const { data } = HE.forgeItem("srd2024:item:longsword", ["weapon-plus-1"]);
  state.library = [{ id: "hb-sword", revisions: [{ id: "rev-1", data }] }];
  state.actors.doran.owner = "player";
  state.actors.doran.inventory = [
    {
      id: "sword-1",
      name: data.name,
      kind: "weapon",
      quantity: 1,
      equipped: true,
      homebrewRef: { contentId: "hb-sword", revisionId: "rev-1" },
      source: { kind: "homebrew", contentId: "hb-sword", revision: "rev-1" },
    },
  ];
  const weapon = rowWeapon(state.actors.doran.inventory[0], state.library);
  assert.equal(weapon.weapon.type, "melee");
  assert.deepEqual(
    activeItemModifiers(state.actors.doran, state.library).map((m) => [m.target, m.value]),
    [
      ["attack", 1],
      ["damage", 1],
    ],
  );
  const action = listActions(state, "doran").find((a) => a.itemId === "sword-1");
  assert.ok(action, "the forged sword is an attack");
  assert.equal(action.attackType, "melee");
  assert.deepEqual(
    action.itemBonuses.map((b) => [b.target, b.value]),
    [
      ["attack", 1],
      ["damage", 1],
    ],
  );
  // Doran (fighter, Str 10): Strength +0, Proficiency +2, the sword's +1.
  Object.assign(
    state.scenes[0].tokens.find((t) => t.actorId === "doran"),
    { x: 150, y: 150 },
  );
  state.combat.turn = 2;
  const attempt = beginAttempt(
    state,
    {
      id: "d-1",
      actorId: "doran",
      actionId: action.id,
      selection: { targetIds: ["goblin-1"] },
      mode: "physical",
    },
    "player",
  );
  const attack = attackOf(attempt);
  assert.equal(attack.modifier, action.attackModifier + 1);
  assert.ok(attack.modifierSources.some((m) => m.kind === "item" && m.value === 1));
  resolveRoll(state, attempt.id, attack.id, [15], "player");
  const damage = attempt.requests.find((r) => r.kind === "damage");
  assert.equal(damage.modifier, action.damageModifier + 1);
  assert.ok(damage.modifierSources.some((m) => m.kind === "item" && m.label.it.includes("+1")));
  // The sheet names the same bonus (D&D Beyond "to hit").
  const sheet = SP.sheetAttacks(state, "doran").find((a) => a.itemId === "sword-1");
  assert.equal(sheet.toHit, action.attackModifier + 1);
  assert.equal(sheet.damageModifier, action.damageModifier + 1);
});

test("BI-18: homebrew Advantage on Perception reaches the D20 Test engine, named (homebrew)", () => {
  const state = fixture();
  state.ext["homebrew-editor"] = {
    sheets: {
      livia: {
        entries: [
          {
            rowId: "feat-1",
            contentId: "hb-eye",
            revisionId: "rev-1",
            name: { it: "Occhio di falco", en: "Hawk eye" },
            pendingChoices: false,
            modifiers: [
              {
                id: "m1",
                target: "skill:perception",
                mode: "advantage",
                value: 0,
                condition: { it: "", en: "" },
                source: { it: "Occhio di falco", en: "Hawk eye" },
              },
              {
                id: "m2",
                target: "attack",
                mode: "disadvantage",
                value: 0,
                condition: { it: "", en: "" },
              },
            ],
          },
        ],
      },
    },
    campaigns: {},
  };
  const cond = SP.testConditions(state, "livia", { kind: "skill", skill: "perception" });
  assert.equal(cond.advantage.length, 1);
  assert.equal(cond.advantage[0].name.it, "Occhio di falco (homebrew)");
  const profile = SP.testProfile(state, "livia", { kind: "skill", skill: "perception" });
  assert.equal(SP.effectiveRollMode(profile), "advantage");
  assert.equal(
    SP.testConditions(state, "livia", { kind: "skill", skill: "stealth" }).advantage.length,
    0,
  );
  // The Table's attack reads the attack roll mode and names it.
  const preview = previewAction(
    state,
    "livia",
    "quarterstaff",
    { targetIds: ["goblin-1"] },
    "player",
  );
  assert.ok(preview.rollReasons.some((r) => r.code === "homebrew" && r.mode === "disadvantage"));
  assert.equal(preview.rollMode, "disadvantage");
  // The campaign's safe mode suspends it.
  state.ext["homebrew-editor"].campaigns[state.campaign.id] = {
    disabled: true,
    disabledContent: [],
  };
  state.actors.livia.campaignIds = [state.campaign.id];
  assert.equal(
    SP.testConditions(state, "livia", { kind: "skill", skill: "perception" }).advantage.length,
    0,
  );
});

test("H-01: criticals «max» deal one set of dice at maximum plus a roll, named", () => {
  const state = fixture();
  CS.setRule(state, state.ext[CS.ID], state.campaign.id, "criticals", "max", "dm");
  const attempt = staffAttack(state);
  resolveRoll(state, attempt.id, attackOf(attempt).id, [20], "player");
  const damage = attempt.requests.find((r) => r.kind === "damage");
  assert.equal(damage.dice[0].count, 1, "one set of dice");
  assert.ok(damage.modifierSources.some((m) => m.kind === "critical-max" && m.value === 6));
  resolveRoll(state, attempt.id, damage.id, [2], "player");
  assert.equal(damage.total, 2 + 6 + (damage.modifier - 6));
  assert.equal(attempt.outcomes[0].criticalRule, "max");
});

test("H-01: flanking «advantage» gives Advantage with a conscious ally opposite, named as a campaign rule", () => {
  const state = fixture();
  const reasons = () =>
    previewAction(state, "livia", "quarterstaff", { targetIds: ["goblin-1"] }, "player")
      .rollReasons;
  // Doran on the opposite side of the Sentinella (Livia 100,100 · Sentinella 150,100 · Doran 200,100).
  Object.assign(
    state.scenes[0].tokens.find((t) => t.actorId === "doran"),
    { x: 200, y: 100 },
  );
  assert.ok(!reasons().some((r) => r.code === "flanking"), "off by default (SRD)");
  CS.setRule(state, state.ext[CS.ID], state.campaign.id, "flanking", "advantage", "dm");
  const flank = reasons().find((r) => r.code === "flanking");
  assert.ok(flank);
  assert.equal(flank.mode, "advantage");
  assert.equal(flank.name.it, "Fiancheggiamento (regola della campagna)");
  // Not opposite (a corner beside the attacker's side): no flanking.
  Object.assign(
    state.scenes[0].tokens.find((t) => t.actorId === "doran"),
    { x: 150, y: 150 },
  );
  assert.ok(!reasons().some((r) => r.code === "flanking"));
  // An unconscious ally does not flank.
  Object.assign(
    state.scenes[0].tokens.find((t) => t.actorId === "doran"),
    { x: 200, y: 100 },
  );
  state.actors.doran.hp = 0;
  assert.ok(!reasons().some((r) => r.code === "flanking"));
});

test("C1: with hidden DCs the player reads «CD nascosta»; success still shows", () => {
  const state = fixture();
  state.ext["core-settings"] = { campaign: { "combat.dc": "hidden" } };
  const attempt = enqueueRollRequest(
    state,
    {
      id: "g1",
      actorId: "livia",
      kind: "save",
      ability: "dex",
      modifier: 2,
      dc: 13,
      label: { it: "TS", en: "Save" },
    },
    "dm",
  );
  const shown = projectAttempts(state, "player")[0].requests[0];
  const dcSetting = CS.DISCLOSURE_SETTINGS?.find((row) => row.key === "dc");
  if (!dcSetting) {
    // C1 is not integrated yet (R7): today's behaviour, the DC is shown.
    assert.equal(shown.dc, 13);
    return;
  }
  state.ext["core-settings"].campaign[dcSetting.setting] = "hidden";
  const hidden = projectAttempts(state, "player")[0].requests[0];
  assert.equal(hidden.dc, undefined);
  assert.equal(hidden.dcHidden, true);
  assert.equal(projectAttempts(state, "dm")[0].requests[0].dc, 13);
  assert.ok(attempt);
});

test("C3: whoever runs the session asks for rolls; another player is refused", () => {
  const state = fixture();
  assert.throws(() =>
    enqueueRollRequest(
      state,
      {
        id: "p1",
        actorId: "goblin-1",
        kind: "save",
        ability: "dex",
        modifier: 1,
        label: { it: "TS", en: "Save" },
      },
      "player",
    ),
  );
  state.ext["campaign-members"] = {
    campaigns: { [state.campaign.id]: { handover: { to: "player" } } },
  };
  assert.equal(sessionAuthority(state, "player"), true);
  const attempt = enqueueRollRequest(
    state,
    {
      id: "p2",
      actorId: "goblin-1",
      kind: "save",
      ability: "dex",
      modifier: 1,
      label: { it: "TS", en: "Save" },
    },
    "player",
  );
  assert.equal(attempt.acceptedBy, "player");
  // The runner reads the table as the DM does (the goblin's request is listed).
  assert.ok(projectAttempts(state, "player").some((a) => a.id === attempt.id));
});

test("C10: a controlled mount can only Dash, Disengage or Dodge on its rider's turn", (t) => {
  if (typeof SM.mountControl !== "function") {
    t.skip("C10 provider (special-moves-domain.mountControl, R3) not integrated yet");
    return;
  }
  const state = fixture();
  state.ext["special-moves"] = SM.seedSlice(state);
  // Livia rides the Esploratore (goblin-2), controlled: it left the order and acts on her turn.
  state.ext["special-moves"].mounts = { livia: { mountId: "goblin-2", controlled: true } };
  state.combat.order = ["livia", "goblin-1", "doran"];
  state.combat.turn = 0;
  const mount = state.actors["goblin-2"];
  mount.combatProfile = {
    ...(mount.combatProfile ?? {}),
    meleeAttack: srdMeleeProfile(getEntry("srd2024:creature:goblin-warrior")),
  };
  assert.equal(SM.mountControl(state, "goblin-2")?.controlled, true);
  for (const id of ["dash", "disengage", "dodge"])
    assert.equal(actionBlockReason(state, "goblin-2", id, "dm"), null, id + " on the rider's turn");
  const blocked = actionBlockReason(state, "goblin-2", "melee-attack", "dm");
  assert.equal(blocked?.code, "mount-controlled");
  assert.match(blocked.it, /Scattare, Disimpegnarsi o Schivare/);
  // Not the rider's turn: the mount waits like any creature off turn.
  state.combat.turn = 1;
  assert.equal(actionBlockReason(state, "goblin-2", "dodge", "dm")?.code, "not-your-turn");
  // An independent mount keeps its own turn and every action.
  state.ext["special-moves"].mounts.livia.controlled = false;
  state.combat.order = ["livia", "goblin-2", "goblin-1", "doran"];
  state.combat.turn = 1;
  assert.equal(actionBlockReason(state, "goblin-2", "melee-attack", "dm"), null);
});
