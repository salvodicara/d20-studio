import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState, moveActor } from "../state.mjs";
import { canViewActor, canControlActor } from "../character-access.mjs";
import { beginAttempt, resolveRoll, resolveAutomaticRolls, projectAttempts } from "../combat.mjs";
import { previewDoorInteraction, interactWithDoor } from "../table-spatial.mjs";

test("a personal companion joins only through its own explicit connection, with membership and historical privacy preserved", async () => {
  const forms = await import("../forms-companions.mjs");
  const { connectCharacterWithContent } = await import("../homebrew-integration.mjs");
  const { previewCompanionMapPlacement } = await import("../companion-map.mjs");
  const s = createInitialState();
  Object.assign(s.actors.livia, { visibility: "private", campaignIds: [] });
  const choice = { mode: "manual", name: "Private companion", profileId: "srd2024:cat" };
  const preview = forms.previewCompanionCreation(s, "livia", choice, "player");
  const { actorId } = forms.createCompanion(s, "livia", choice, "player", {
    operationId: "personal-pet",
    reviewKey: preview.reviewKey,
  });
  connectCharacterWithContent(s, "livia", "player");
  assert.equal(s.actors[actorId].visibility, "private");
  assert.equal(canViewActor(s.actors[actorId], "dm", s), false);
  assert.equal(
    previewCompanionMapPlacement(s, actorId, { x: 550, y: 500 }, "player").available,
    false,
  );
  assert.throws(() => connectCharacterWithContent(s, actorId, "dm"));
  const before = structuredClone(s);
  s.campaign.members.find((m) => m.id === "player").active = false;
  assert.throws(() => connectCharacterWithContent(s, actorId, "player"));
  assert.equal(s.actors[actorId].visibility, "private");
  s.campaign.members = before.campaign.members;
  connectCharacterWithContent(s, actorId, "player");
  assert.equal(canViewActor(s.actors[actorId], "dm", s), true);
  assert.equal(
    previewCompanionMapPlacement(s, actorId, { x: 550, y: 500 }, "player").available,
    true,
  );
  assert.deepEqual(s.actors.livia, before.actors.livia);
  assert.deepEqual(s.formsCompanions.events, before.formsCompanions.events);
  assert.equal(
    forms.getFormsHistory(s, actorId, "dm").some((e) => e.visibility === "private"),
    false,
  );
  assert.equal(
    s.scenes[0].tokens.some((t) => t.actorId === actorId),
    false,
  );
});

function fixture() {
  const s = createInitialState();
  const pet = {
    ...structuredClone(s.actors.livia),
    id: "pet",
    name: "Synthetic companion",
    kind: "npc",
    owner: "dm",
    controllers: ["player"],
    visibility: "shared",
    personalPlans: {},
  };
  s.actors.pet = pet;
  s.scenes[0].tokens.push({ id: "pet-token", actorId: "pet", x: 100, y: 100, visible: true });
  Object.assign(
    s.scenes[0].tokens.find((t) => t.actorId === "goblin-1"),
    { x: 140, y: 100 },
  );
  s.scenes[0].walls = [
    {
      id: "door",
      a: { x: 400, y: 200 },
      b: { x: 400, y: 250 },
      kind: "door",
      blocksMovement: true,
      blocksSight: true,
      blocksEffect: true,
      secret: false,
      doorState: "closed",
      playerOperable: true,
      interactionRangeMeters: 20,
      source: { kind: "authored-demo", revision: "test-v1" },
    },
  ];
  s.combat.active = true;
  s.combat.order = ["pet", "goblin-1"];
  s.combat.turn = 0;
  return s;
}

test("explicit controller can use a linked NPC without gaining ordinary NPC or private parent access", () => {
  const s = fixture();
  assert.equal(canViewActor(s.actors.pet, "player"), true);
  assert.equal(canControlActor(s.actors.pet, "player"), true);
  assert.equal(canControlActor(s.actors.pet, "dm"), true);
  assert.equal(canViewActor(s.actors["goblin-1"], "player"), false);
  s.actors.livia.visibility = "private";
  s.actors.livia.owner = "dm";
  assert.equal(canViewActor(s.actors.livia, "player"), false);
  moveActor(s, "pet", { x: 110, y: 100 }, "player");
  assert.equal(previewDoorInteraction(s, "door", "pet", "player").available, true);
  interactWithDoor(s, "door", "pet", "player", { expectedState: "closed" });
  const a = beginAttempt(
    s,
    {
      id: "pet-attack",
      actorId: "pet",
      actionId: "quarterstaff",
      selection: { targetIds: ["goblin-1"] },
      mode: "physical",
    },
    "player",
  );
  resolveRoll(s, a.id, a.requests[0].id, [18], "player");
  assert.equal(a.requests[0].status, "resolved");
  s.actors.pet.controllers = [];
  assert.throws(() => moveActor(s, "pet", { x: 120, y: 100 }, "player"));
  assert.equal(previewDoorInteraction(s, "door", "pet", "player").available, false);
  assert.throws(() =>
    resolveRoll(s, a.id, a.requests.find((r) => r.kind === "damage").id, [4], "player"),
  );
});

test("digital accepted controller is revalidated after revocation; private creatures are not DM authority", () => {
  const s = fixture();
  const a = beginAttempt(
    s,
    {
      id: "pet-digital",
      actorId: "pet",
      actionId: "quarterstaff",
      selection: { targetIds: ["goblin-1"] },
      mode: "digital",
    },
    "player",
  );
  s.actors.pet.controllers = [];
  let calls = 0;
  assert.deepEqual(
    resolveAutomaticRolls(s, () => {
      calls++;
      return 12;
    }),
    [],
  );
  assert.equal(calls, 0);
  assert.equal(a.requests[0].status, "pending");
  s.actors.pet.visibility = "private";
  s.actors.pet.owner = "player";
  assert.equal(canControlActor(s.actors.pet, "dm"), false);
  assert.throws(() => moveActor(s, "pet", { x: 120, y: 100 }, "dm"));
  assert.throws(() => resolveRoll(s, a.id, a.requests[0].id, [12], "dm"));
  const shown = projectAttempts(s, "dm");
  assert.ok(
    shown.every((a) => a.actorId !== "pet" && a.requests.every((r) => r.actorId !== "pet")),
  );
  assert.ok(!JSON.stringify(shown).includes("Synthetic companion"));
});

test("unavailable companions retain readable sheets but cannot act; familiars cannot attack with equipment", async () => {
  const { listActions, beginMovement } = await import("../combat.mjs");
  const { placeSceneToken, duplicateSceneNPC } = await import("../preparation.mjs");
  const s = fixture();
  s.actors.pet.companion = {
    parentActorId: "livia",
    kind: "familiar",
    lifecycle: "available",
    attacksAllowed: false,
  };
  assert.ok(!listActions(s, "pet").some((a) => a.kind === "attack"));
  assert.throws(() =>
    beginAttempt(
      s,
      {
        id: "illegal",
        actorId: "pet",
        actionId: "quarterstaff",
        selection: { targetIds: ["goblin-1"] },
        mode: "physical",
      },
      "player",
    ),
  );
  s.actors.pet.companion.lifecycle = "dismissed";
  assert.equal(canViewActor(s.actors.pet, "player"), true);
  assert.deepEqual(listActions(s, "pet"), []);
  assert.throws(() => moveActor(s, "pet", { x: 110, y: 100 }, "player"));
  assert.throws(() =>
    beginMovement(s, { id: "absent", actorId: "pet", point: { x: 110, y: 100 } }, "player"),
  );
  assert.equal(previewDoorInteraction(s, "door", "pet", "player").available, false);
  s.scenes[0].tokens = s.scenes[0].tokens.filter((t) => t.actorId !== "pet");
  assert.throws(() => placeSceneToken(s, s.scenes[0].id, "pet", { x: 300, y: 300 }, "new", "dm"));
  assert.throws(() => duplicateSceneNPC(s, "pet", "copy-pet", "Copy", "dm"));
  assert.ok(!s.actors["copy-pet"]);
});

test("campaign membership revocation invalidates companion movement, actions and pending dice", async () => {
  const { beginMovement } = await import("../combat.mjs");
  const s = fixture();
  s.actors.pet.companion = {
    kind: "manual",
    lifecycle: "available",
    attacksAllowed: true,
    parentActorId: "doran",
  };
  s.actors.pet.campaignIds = [s.campaign.id];
  const a = beginAttempt(
    s,
    {
      id: "before-removal",
      actorId: "pet",
      actionId: "quarterstaff",
      selection: { targetIds: ["goblin-1"] },
      mode: "digital",
    },
    "player",
  );
  s.campaign.members.find((m) => m.id === "player").active = false;
  assert.throws(() => moveActor(s, "pet", { x: 110, y: 100 }, "player"));
  assert.throws(() =>
    beginMovement(s, { id: "after-removal", actorId: "pet", point: { x: 110, y: 100 } }, "player"),
  );
  assert.throws(() => resolveRoll(s, a.id, a.requests[0].id, [18], "player"));
  assert.deepEqual(
    resolveAutomaticRolls(s, () => 18),
    [],
  );
  assert.equal(previewDoorInteraction(s, "door", "pet", "player").available, false);
});

test("personal combat roll evidence remains personal after campaign sharing, Undo and reload", async () => {
  const { createStore } = await import("../state.mjs");
  const { renderRollHistory } = await import("../combat-ui.mjs");
  let saved;
  const storage = {
    getItem: () => saved,
    setItem: (k, v) => {
      saved = v;
    },
  };
  const store = createStore({ storage });
  Object.assign(store.state, fixture());
  Object.assign(store.state.actors.pet, {
    visibility: "private",
    owner: "player",
    controllers: [],
  });
  store.commit(
    "attempt",
    (s) =>
      beginAttempt(
        s,
        {
          id: "personal",
          actorId: "pet",
          actionId: "quarterstaff",
          selection: { targetIds: ["goblin-1"] },
          mode: "physical",
        },
        "player",
      ),
    "player",
  );
  const req = store.state.combatAttempts.at(-1).requests[0].id;
  store.commit("die", (s) => resolveRoll(s, "personal", req, [18], "player"), "player");
  const roll = store.state.log.at(-1).rolls[0];
  assert.equal(roll.visibility, "private");
  assert.equal(roll.personal, true);
  const render = (state, role) =>
    renderRollHistory({ state, role, t: (it, en) => en, esc: String });
  assert.equal(render(store.state, "dm"), "");
  assert.match(render(store.state, "player"), /Synthetic companion/);
  store.undo("player");
  store.commit(
    "join",
    (s) => {
      s.actors.pet.visibility = "shared";
    },
    "player",
  );
  assert.equal(render(store.state, "dm"), "");
  const loaded = createStore({ storage });
  assert.equal(render(loaded.state, "dm"), "");
  assert.match(render(loaded.state, "player"), /18/);
});

test("sharing a personal actor does not reveal or delegate its original pending or resolved combat dice", () => {
  const s = fixture();
  Object.assign(s.actors.pet, { visibility: "private", owner: "player", controllers: [] });
  const a = beginAttempt(
    s,
    {
      id: "personal-before-share",
      actorId: "pet",
      actionId: "quarterstaff",
      selection: { targetIds: ["goblin-1"] },
      mode: "physical",
    },
    "player",
  );
  s.actors.pet.visibility = "shared";
  assert.throws(() => resolveRoll(s, a.id, a.requests[0].id, [18], "dm"));
  resolveRoll(s, a.id, a.requests[0].id, [18], "player");
  const shown = projectAttempts(s, "dm").find((x) => x.id === a.id);
  assert.ok(!shown.requests.some((r) => r.id === a.requests[0].id));
  assert.equal(projectAttempts(s, "player").find((x) => x.id === a.id).requests[0].values[0], 18);
});

function prepareShape(s, id = "pet") {
  const a = s.actors[id];
  a.tempHp = 0;
  a.features = [{ id: "shape-use", definitionId: "druid:wild-shape", max: 2, used: 0 }];
  a.formsProfile = {
    druidLevel: 3,
    wildShapeFeatureId: "shape-use",
    knownForms: ["srd2024:cat", "srd2024:rat", "srd2024:wolf"],
    knownFormsInitialized: true,
    savingThrowProficiencies: ["int", "wis"],
    skillProficiencies: [],
  };
  return {
    profileId: "srd2024:cat",
    tempHpChoice: "replace",
    equipment: a.inventory
      .filter((i) => i.quantity > 0)
      .map((i) => ({ itemId: i.id, disposition: "merge" })),
  };
}

test("the same actor uses effective natural attack, movement and defenses without overwriting base values", async () => {
  const forms = await import("../forms-companions.mjs");
  const { listActions, previewAction, beginMovement } = await import("../combat.mjs");
  const s = fixture(),
    a = s.actors.pet;
  a.ac = 18;
  const choice = prepareShape(s);
  const p = forms.previewWildShape(s, "pet", choice, "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  forms.applyWildShape(s, "pet", choice, "player", {
    operationId: "cat-form",
    reviewKey: p.reviewKey,
  });
  assert.equal(a.ac, 18);
  assert.equal(forms.getEffectiveActor(a).ac, 12);
  assert.ok(!listActions(s, "pet").some((x) => x.id === "quarterstaff" || x.id === "fire-bolt"));
  assert.ok(listActions(s, "pet").some((x) => x.id === "melee-attack" && x.fixedDamage === 1));
  beginMovement(s, { id: "cat-move", actorId: "pet", point: { x: 110, y: 100 } }, "player");
  assert.equal(a.speed, 9);
  assert.equal(a.movement, 11.7);
  const bite = beginAttempt(
    s,
    {
      id: "cat-scratch",
      actorId: "pet",
      actionId: "melee-attack",
      selection: { targetIds: ["goblin-1"] },
      mode: "physical",
    },
    "player",
  );
  resolveRoll(s, bite.id, bite.requests[0].id, [15], "player");
  assert.equal(bite.outcomes[0].damage, 1);
  s.combat.order = ["livia", "pet"];
  s.combat.turn = 0;
  Object.assign(
    s.scenes[0].tokens.find((t) => t.actorId === "livia"),
    { x: 40, y: 100 },
  );
  const incoming = previewAction(s, "livia", "fire-bolt", { targetIds: ["pet"] }, "player");
  assert.equal(incoming.available, true, JSON.stringify(incoming.reasons));
  const attack = beginAttempt(
    s,
    {
      id: "incoming",
      actorId: "livia",
      actionId: "fire-bolt",
      selection: { targetIds: ["pet"] },
      mode: "physical",
    },
    "player",
  );
  assert.equal(attack.targets[0].targetAC, 12);
});

test("placing a created companion is free, revalidates membership and cannot move an existing token for free", async () => {
  const forms = await import("../forms-companions.mjs");
  const { previewCompanionMapPlacement, placeCompanionOnMap } =
    await import("../companion-map.mjs");
  const s = fixture();
  const choice = { mode: "manual", profileId: "srd2024:cat", name: "Moss" };
  const p = forms.previewCompanionCreation(s, "livia", choice, "player");
  assert.equal(p.canApply, true, JSON.stringify(p.errors));
  const result = forms.createCompanion(s, "livia", choice, "player", {
    operationId: "manual-cat",
    reviewKey: p.reviewKey,
  });
  const id = result.actorId,
    before = structuredClone(s.actors.livia);
  assert.equal(previewCompanionMapPlacement(s, id, { x: 550, y: 300 }, "player").available, true);
  assert.throws(() =>
    placeCompanionOnMap(s, id, { x: 550, y: 300 }, "player", {
      sceneId: s.activeSceneId,
      tokenId: "cat-token",
      online: false,
    }),
  );
  placeCompanionOnMap(s, id, { x: 550, y: 300 }, "player", {
    sceneId: s.activeSceneId,
    tokenId: "cat-token",
  });
  assert.deepEqual(s.actors.livia, before);
  assert.equal(s.scenes[0].tokens.filter((t) => t.actorId === id).length, 1);
  assert.throws(() =>
    placeCompanionOnMap(s, id, { x: 600, y: 300 }, "player", {
      sceneId: s.activeSceneId,
      tokenId: "cat-token2",
    }),
  );
  s.campaign.members.find((m) => m.id === "player").active = false;
  assert.throws(() => previewCompanionMapPlacement(s, id, { x: 600, y: 300 }, "player"));
});

test("actual campaign clock expiry and concentration use effective form values", async () => {
  const forms = await import("../forms-companions.mjs"),
    rest = await import("../rest-time.mjs");
  const s = fixture();
  const choice = prepareShape(s);
  s.combat.active = false;
  const p = forms.previewWildShape(s, "pet", choice, "player");
  forms.applyWildShape(s, "pet", choice, "player", {
    operationId: "clock-cat",
    reviewKey: p.reviewKey,
  });
  s.actors.pet.concentration = { id: "hold", name: { it: "Prova", en: "Test" }, active: true };
  s.combat.active = true;
  s.combat.order = ["livia", "pet"];
  s.combat.turn = 0;
  const spell = beginAttempt(
    s,
    {
      id: "form-concentration",
      actorId: "livia",
      actionId: "magic-missile",
      selection: { allocations: [{ actorId: "pet", count: 3 }] },
      mode: "physical",
    },
    "player",
  );
  resolveRoll(s, spell.id, spell.requests[0].id, [1, 1, 1], "player");
  const saves = spell.requests.filter((r) => r.kind === "concentration");
  assert.equal(saves.length, 3);
  assert.ok(saves.every((r) => r.modifier === 0));
  for (const r of saves) resolveRoll(s, spell.id, r.id, [20], "player");
  s.combat.active = false;
  const input = { id: "real-clock", campaignId: s.campaign.id, seconds: 3600 };
  const time = rest.previewTimeAdvance(s, input, "dm");
  assert.equal(time.canApply, true);
  rest.advanceGameTime(s, input, "dm", { reviewKey: time.reviewKey });
  assert.equal(s.actors.pet.activeForm, null);
  assert.equal(s.actors.pet.features[0].used, 1);
});

test("a familiar disappearing on its own turn starts the next actual turn once and Undo restores both", async () => {
  const { createStore } = await import("../state.mjs");
  const store = createStore();
  Object.assign(store.state, fixture());
  const s = store.state;
  s.actors.pet.companion = {
    kind: "familiar",
    lifecycle: "available",
    attacksAllowed: false,
    parentActorId: "livia",
  };
  s.actors["goblin-1"].action = false;
  s.actors["goblin-1"].bonus = false;
  s.actors["goblin-1"].reaction = false;
  s.actors["goblin-1"].movement = 0;
  store.commit(
    "pet disappears",
    (d) => {
      d.actors.pet.hp = 0;
    },
    "dm",
  );
  assert.equal(store.state.actors.pet.companion.lifecycle, "destroyed");
  assert.equal(store.state.combat.order[store.state.combat.turn], "goblin-1");
  assert.equal(store.state.actors["goblin-1"].action, true);
  assert.equal(store.state.actors["goblin-1"].movement, 9);
  assert.equal(store.state.combat.pendingTurnStart, undefined);
  store.commit(
    "unrelated note",
    (d) => {
      d.actors["goblin-1"].action = false;
    },
    "dm",
  );
  assert.equal(store.state.actors["goblin-1"].action, false);
  store.undo("dm");
  store.undo("dm");
  assert.equal(store.state.actors.pet.companion.lifecycle, "available");
  assert.equal(store.state.combat.order[store.state.combat.turn], "pet");
  assert.equal(store.state.actors["goblin-1"].action, false);
});

test("verified wolf Pack Tactics and rat Agile affect actual attack dice and movement reactions", async () => {
  const forms = await import("../forms-companions.mjs");
  const { beginMovement } = await import("../combat.mjs");
  for (const profileId of ["srd2024:wolf", "srd2024:rat"]) {
    const s = fixture(),
      choice = { ...prepareShape(s), profileId };
    s.actors.pet.combatProfile.team = "party";
    s.actors.doran.combatProfile = { ...s.actors.doran.combatProfile, team: "party" };
    Object.assign(
      s.scenes[0].tokens.find((t) => t.actorId === "doran"),
      { x: 160, y: 110 },
    );
    const p = forms.previewWildShape(s, "pet", choice, "player");
    forms.applyWildShape(s, "pet", choice, "player", {
      operationId: "form-" + profileId,
      reviewKey: p.reviewKey,
    });
    if (profileId.endsWith("wolf")) {
      const attack = beginAttempt(
        s,
        {
          id: "wolf-attack",
          actorId: "pet",
          actionId: "melee-attack",
          selection: { targetIds: ["goblin-1"] },
          mode: "physical",
        },
        "player",
      );
      assert.equal(attack.requests[0].rollMode, "advantage");
      assert.equal(attack.requests[0].dice[0].count, 2);
    } else {
      const movement = beginMovement(
        s,
        { id: "rat-escape", actorId: "pet", point: { x: 20, y: 100 } },
        "player",
      );
      assert.equal(movement.status, "resolved");
      assert.equal(
        s.combatReactions?.filter((r) => r.type === "opportunity" && r.targetId === "pet").length ||
          0,
        0,
      );
    }
  }
});
