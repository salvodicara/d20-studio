import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { beginMovement, projectReactions } from "../combat.mjs";
import {
  validateSceneDraft,
  saveSceneDraft,
  duplicateScene,
  deleteScene,
  setSceneSharing,
  activateScene,
  renderPreparation,
  renderSceneBase,
  createSceneNPC,
  duplicateSceneNPC,
  placeSceneToken,
  removeSceneToken,
  getPreparedEncounter,
  startPreparedEncounter,
  rollInitiativeForDraft,
  resetPreparationDraft,
} from "../preparation.mjs";

const scene = () => ({
  id: "a",
  name: "Court",
  description: "DM secret",
  publicDescription: "Old stone",
  width: 1000,
  height: 650,
  gridSize: 50,
  metersPerCell: 1.5,
  background: null,
  revealed: false,
  tokens: [{ id: "t", actorId: "livia", x: 800, y: 500 }],
  walls: [],
});
const state = () => ({
  scenes: [scene()],
  activeSceneId: "a",
  actors: { livia: { hp: 9 } },
  combat: { active: true, round: 3 },
});

test("invalid dimensions and unsafe image inputs are rejected before save", () => {
  assert.deepEqual(
    validateSceneDraft({
      ...scene(),
      width: 0,
      gridSize: NaN,
      background: "javascript:alert(1)",
    }).map((e) => e.field),
    ["width", "gridSize", "background"],
  );
});

test("new preparation stays private and does not activate or reset the game", () => {
  const s = state();
  saveSceneDraft(s, { ...scene(), id: "b", revealed: true }, "dm", null);
  assert.equal(s.scenes[1].revealed, false);
  assert.equal(s.activeSceneId, "a");
  assert.equal(s.actors.livia.hp, 9);
  assert.equal(s.combat.round, 3);
});

test("saving metadata keeps positions modified during preparation", () => {
  const s = state();
  const original = scene();
  s.scenes[0].tokens[0].x = 850;
  saveSceneDraft(s, { ...original, name: "New court" }, "dm", original);
  assert.equal(s.scenes[0].name, "New court");
  assert.equal(s.scenes[0].tokens[0].x, 850);
});

test("stale editor cannot overwrite a newer map configuration", () => {
  const s = state();
  const original = scene();
  s.scenes[0].name = "Changed elsewhere";
  assert.throws(
    () => saveSceneDraft(s, { ...original, name: "Old edit" }, "dm", original),
    /conflict/,
  );
  assert.equal(s.scenes[0].name, "Changed elsewhere");
});

test("shrinking a scene cannot hide an existing token beyond its new bounds", () => {
  const s = state();
  assert.throws(() => saveSceneDraft(s, { ...scene(), width: 500 }, "dm", scene()), /token-bounds/);
  assert.equal(s.scenes[0].width, 1000);
});

test("every scene mutation rejects a player even with a known private id", () => {
  const s = state();
  for (const op of [
    () => saveSceneDraft(s, scene(), "player", scene()),
    () => duplicateScene(s, "a", "b", "Copy", "player"),
    () => deleteScene(s, "a", "player"),
    () => setSceneSharing(s, "a", true, "player"),
    () => activateScene(s, "a", "player"),
  ])
    assert.throws(op, /unauthorized/);
  assert.deepEqual(s, state());
});

test("copying creates an independent private map without live token or actor copies", () => {
  const s = state();
  s.scenes[0].revealed = true;
  duplicateScene(s, "a", "b", "Second court", "dm");
  const copy = s.scenes[1];
  assert.equal(copy.name, "Second court");
  assert.equal(copy.revealed, false);
  assert.deepEqual(copy.tokens, []);
  copy.description = "Other secret";
  assert.equal(s.scenes[0].description, "DM secret");
  assert.deepEqual(Object.keys(s.actors), ["livia"]);
});

test("reveal changes access but not the table; activation changes table but not initiative", () => {
  const s = state();
  duplicateScene(s, "a", "b", "Second", "dm");
  setSceneSharing(s, "b", true, "dm");
  assert.equal(s.activeSceneId, "a");
  assert.equal(s.scenes[1].revealed, true);
  activateScene(s, "b", "dm");
  assert.equal(s.activeSceneId, "b");
  assert.deepEqual(s.combat, { active: true, round: 3 });
});

test("active scene cannot be deleted; inactive deletion leaves the game intact", () => {
  const s = state();
  assert.throws(() => deleteScene(s, "a", "dm"), /active/);
  duplicateScene(s, "a", "b", "Second", "dm");
  deleteScene(s, "b", "dm");
  assert.deepEqual(s, state());
});

test("player routes never render private scene names, notes or uploaded images", () => {
  const s = state();
  s.scenes[0].name = "PRIVATE-SCENE-NAME";
  s.scenes[0].background = "data:image/png;base64,aGVsbG8=";
  const html = renderPreparation({
    state: s,
    role: "player",
    view: { id: "a" },
    t: (it, en) => en,
  });
  assert.ok(!html.includes("PRIVATE-SCENE-NAME"));
  assert.ok(!html.includes("DM secret"));
  assert.ok(!html.includes("aGVsbG8="));
});

test("authored scene labels are escaped and an external background URL cannot render", () => {
  const escape = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  const s = state();
  s.scenes[0].name = "<img src=x onerror=alert(1)>";
  s.scenes[0].background = "https://external.example/private-image.png";
  s.campaign = { name: "Test campaign" };
  const ctx = { state: s, role: "dm", view: {}, t: (it, en) => en, esc: escape };
  const html = renderPreparation(ctx);
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("&lt;img src=x"));
  assert.ok(!renderSceneBase(s.scenes[0], ctx).includes("external.example"));
});

test("NPC creation and duplication have independent health and validate permission", () => {
  const s = state();
  assert.throws(
    () => createSceneNPC(s, { id: "n", name: "Scout", hp: 8, ac: 12, speed: 9 }, "player"),
    /unauthorized/,
  );
  createSceneNPC(s, { id: "n", name: "Scout", hp: 8, ac: 12, speed: 9 }, "dm");
  duplicateSceneNPC(s, "n", "n2", "Scout two", "dm");
  s.actors.n2.hp = 3;
  s.actors.n2.inventory.push({ name: "Rope" });
  assert.equal(s.actors.n.hp, 8);
  assert.equal(s.actors.n.inventory.length, 0);
  assert.throws(
    () => createSceneNPC(s, { id: "bad", name: "Bad", hp: -1, ac: 12, speed: 9 }, "dm"),
    /invalid/,
  );
});

test("token placement is bounded and snapping is independent from grid visibility", () => {
  const s = state();
  s.actors.guard = { name: "Guard" };
  s.scenes[0].gridSnap = true;
  s.scenes[0].gridVisible = false;
  s.scenes[0].gridOffsetX = 10;
  placeSceneToken(s, "a", "guard", { x: 120, y: 96 }, "tg", "dm");
  assert.deepEqual(s.scenes[0].tokens[1], { id: "tg", actorId: "guard", x: 135, y: 75 });
  assert.throws(
    () => placeSceneToken(s, "a", "guard", { x: 40, y: 40 }, "duplicate", "dm"),
    /already-placed/,
  );
  assert.throws(
    () => placeSceneToken(s, "a", "missing", { x: 40, y: 40 }, "bad", "dm"),
    /actor-missing/,
  );
});

test("removing a token also removes its prepared initiative but preserves its actor", () => {
  const s = state();
  s.scenes[0].encounter = {
    participants: [{ actorId: "livia", natural: 12, bonus: 2, mode: "physical" }],
  };
  removeSceneToken(s, "a", "t", "dm");
  assert.deepEqual(s.scenes[0].tokens, []);
  assert.deepEqual(s.scenes[0].encounter.participants, []);
  assert.equal(s.actors.livia.hp, 9);
});

test("a token draft cannot overwrite movement made after editing began", () => {
  const s = state();
  const original = scene();
  const draft = structuredClone(original);
  draft.tokens[0].x = 400;
  s.scenes[0].tokens[0].x = 850;
  assert.throws(() => saveSceneDraft(s, draft, "dm", original), /token-conflict/);
  assert.equal(s.scenes[0].tokens[0].x, 850);
});

test("saved token draft and new NPCs apply together without starting or revealing", () => {
  const s = state();
  const original = scene();
  const draft = structuredClone(original);
  draft.tokens.push({ id: "tn", actorId: "n", x: 125, y: 125 });
  draft.encounter = {
    name: "Ambush",
    participants: [{ actorId: "n", natural: null, bonus: 2, mode: "physical" }],
  };
  const pending = {};
  createSceneNPC({ actors: pending }, { id: "n", name: "Scout", hp: 8, ac: 12, speed: 9 }, "dm");
  saveSceneDraft(s, draft, "dm", original, pending);
  assert.equal(s.scenes[0].tokens[1].actorId, "n");
  assert.equal(s.actors.n.hp, 8);
  assert.equal(s.combat.round, 3);
  assert.equal(s.scenes[0].revealed, false);
  assert.equal(getPreparedEncounter(s, "a", "dm").ready, false);
});

test("prepared encounter preserves explicit order and rolls; starting refreshes only first actor", () => {
  const s = state();
  s.combat.active = false;
  s.actors.livia = { hp: 9, speed: 9, movement: 0, action: false, bonus: false, reaction: false };
  s.actors.guard = { hp: 8, speed: 6, movement: 0, action: false, bonus: false, reaction: false };
  s.scenes[0].tokens.push({ id: "tg", actorId: "guard", x: 40, y: 40 });
  s.scenes[0].encounter = {
    name: "Test",
    participants: [
      { actorId: "guard", natural: 10, bonus: 2, mode: "digital" },
      { actorId: "livia", natural: 12, bonus: 0, mode: "physical" },
    ],
  };
  const plan = getPreparedEncounter(s, "a", "dm");
  assert.equal(plan.ready, true);
  assert.deepEqual(plan.order, ["guard", "livia"]);
  s.actors.guard.objectInteractionUsed = true;
  s.actors.livia.objectInteractionUsed = true;
  startPreparedEncounter(s, "a", "dm");
  assert.equal(s.combat.turn, 0);
  assert.equal(s.combat.round, 1);
  assert.equal(s.combat.initiative[0].natural, 10);
  assert.equal(s.actors.guard.movement, 6);
  assert.equal(s.actors.guard.reaction, true);
  assert.equal(s.actors.guard.objectInteractionUsed, false);
  assert.equal(s.actors.livia.objectInteractionUsed, true);
  assert.equal(s.actors.livia.reaction, false);
  assert.equal(s.actors.livia.hp, 9);
  assert.throws(() => startPreparedEncounter(s, "a", "dm"), /combat-active/);
});

test("encounter start rejects missing rolls, remote scenes and player authority", () => {
  const s = state();
  s.combat.active = false;
  s.scenes[0].encounter = {
    participants: [{ actorId: "livia", natural: null, bonus: 2, mode: "physical" }],
  };
  assert.throws(() => startPreparedEncounter(s, "a", "dm"), /initiative-incomplete/);
  s.scenes[0].encounter.participants[0].natural = 13;
  s.activeSceneId = "other";
  assert.throws(() => startPreparedEncounter(s, "a", "dm"), /scene-inactive/);
  assert.throws(() => getPreparedEncounter(s, "a", "player"), /unauthorized/);
});

test("each started encounter has a new identity so previous turn consumption cannot collide", () => {
  const s = state();
  s.combat.active = false;
  s.actors.livia.speed = 9;
  s.scenes[0].encounter = {
    participants: [{ actorId: "livia", natural: 12, bonus: 2, mode: "physical" }],
  };
  startPreparedEncounter(s, "a", "dm");
  const first = s.combat.encounterId;
  assert.equal(typeof first, "string");
  s.combat.active = false;
  startPreparedEncounter(s, "a", "dm");
  assert.notEqual(s.combat.encounterId, first);
});

test("digital initiative and explicit rerolls survive discarding scene organization", () => {
  const store = createStore();
  const saved = structuredClone(store.state.scenes[0]);
  const draft = structuredClone(saved);
  draft.name = "Unsaved title";
  draft.encounter = {
    participants: [{ actorId: "livia", natural: null, bonus: 2, mode: "physical" }],
  };
  const ctx = {
    role: "dm",
    state: store.state,
    t: (it, en) => en,
    commit(label, mutation, options) {
      assert.equal(options.visibility, "private");
      assert.notEqual(options.local, true);
      store.commit(label, mutation, "dm", { shared: true, visibility: options.visibility });
      this.state = store.state;
    },
  };
  rollInitiativeForDraft(ctx, draft, "livia");
  const first = store.state.initiativeRolls[0];
  assert.ok(first.natural >= 1 && first.natural <= 20);
  assert.equal(first.total, first.natural + 2);
  assert.equal(draft.encounter.participants[0].rollId, first.id);
  rollInitiativeForDraft(ctx, draft, "livia");
  const second = store.state.initiativeRolls[1];
  assert.notEqual(second.id, first.id);
  assert.equal(second.replacesId, first.id);
  assert.equal(first.visibility, "private");
  assert.equal(second.controller, "dm");
  resetPreparationDraft();
  assert.equal(store.state.initiativeRolls.length, 2);
  assert.deepEqual(store.state.scenes[0], saved);
  const html = renderPreparation({
    state: store.state,
    role: "dm",
    view: {},
    t: (it, en) => en,
    esc: (value) => String(value),
  });
  assert.ok(html.includes("Unsaved title"));
  assert.ok(html.includes(`${first.natural} + (2) = ${first.total}`));
});

test("failed offline initiative commit produces no roll and preserves the working draft", () => {
  const s = state();
  const draft = {
    ...scene(),
    encounter: { participants: [{ actorId: "livia", natural: null, bonus: 2, mode: "physical" }] },
  };
  const before = structuredClone(draft);
  assert.throws(
    () =>
      rollInitiativeForDraft(
        {
          state: s,
          role: "dm",
          t: (it, en) => en,
          commit() {
            throw new Error("offline");
          },
        },
        draft,
        "livia",
      ),
    /offline/,
  );
  assert.deepEqual(draft, before);
  assert.equal(s.initiativeRolls, undefined);
});

test("physical initiative becomes durable on save without duplicate entries on metadata saves", () => {
  const s = state();
  const original = structuredClone(s.scenes[0]);
  const draft = structuredClone(original);
  draft.encounter = {
    participants: [{ actorId: "livia", natural: 15, bonus: 2, mode: "physical" }],
  };
  saveSceneDraft(s, draft, "dm", original);
  assert.equal(s.initiativeRolls.length, 1);
  assert.equal(s.initiativeRolls[0].natural, 15);
  assert.equal(s.initiativeRolls[0].total, 17);
  assert.equal(s.initiativeRolls[0].mode, "physical");
  const next = structuredClone(s.scenes[0]);
  saveSceneDraft(s, { ...next, name: "Renamed" }, "dm", next);
  assert.equal(s.initiativeRolls.length, 1);
});

test("a reversed initiative result cannot silently become active through saving or starting", () => {
  const s = state();
  s.combat.active = false;
  s.initiativeRolls = [
    {
      id: "old-roll",
      sceneId: "a",
      actorId: "livia",
      actorName: "Livia",
      sceneName: "Court",
      natural: 15,
      bonus: 2,
      total: 17,
      mode: "digital",
      controller: "dm",
      visibility: "private",
      status: "reversed",
    },
  ];
  const original = structuredClone(s.scenes[0]);
  const draft = {
    ...structuredClone(original),
    encounter: {
      participants: [
        { actorId: "livia", natural: 15, bonus: 2, mode: "digital", rollId: "old-roll" },
      ],
    },
  };
  assert.throws(() => saveSceneDraft(s, draft, "dm", original), /initiative-reversed/);
  assert.equal(s.initiativeRolls.length, 1);
  assert.equal(s.scenes[0].encounter, undefined);
  s.scenes[0].encounter = structuredClone(draft.encounter);
  assert.equal(getPreparedEncounter(s, "a", "dm").ready, false);
  assert.throws(() => startPreparedEncounter(s, "a", "dm"), /initiative-incomplete/);
  const previous = structuredClone(s.scenes[0]);
  const replacement = structuredClone(previous);
  delete replacement.encounter.participants[0].rollId;
  replacement.encounter.participants[0].mode = "physical";
  saveSceneDraft(s, replacement, "dm", previous);
  assert.equal(s.initiativeRolls.length, 2);
  assert.notEqual(s.scenes[0].encounter.participants[0].rollId, "old-roll");
  assert.equal(s.initiativeRolls[0].status, "reversed");
});

test("initiative history distinguishes a reversed result from an accepted result", () => {
  const s = state();
  s.campaign = { name: "Test" };
  s.initiativeRolls = [
    {
      id: "old-roll",
      sceneId: "a",
      actorId: "livia",
      actorName: "Livia",
      sceneName: "Court",
      natural: 15,
      bonus: 2,
      total: 17,
      mode: "digital",
      controller: "dm",
      visibility: "private",
      status: "reversed",
    },
  ];
  const html = renderPreparation({
    state: s,
    role: "dm",
    view: {},
    t: (it, en) => en,
    esc: (value) => String(value),
  });
  assert.ok(html.includes("Reversed — result retained"));
  assert.ok(html.includes("15 + (2) = 17"));
});

test("authored melee profile requires actual numeric attack data and supported dice", async () => {
  const { buildMeleeProfile } = await import("../preparation.mjs");
  const valid = {
    name: "Punta di rame",
    reachMeters: 1.5,
    attackBonus: 4,
    damageCount: 1,
    damageSides: 6,
    damageModifier: 2,
    damageType: "piercing",
  };
  const profile = buildMeleeProfile(valid);
  assert.deepEqual(profile.name, { it: "Punta di rame", en: "Punta di rame" });
  assert.equal(profile.attackBonus, 4);
  assert.deepEqual(profile.damageDice, [{ count: 1, sides: 6 }]);
  assert.equal(profile.source.kind, "authored-demo");
  assert.ok(profile.source.revision);
  for (const patch of [
    { attackBonus: null },
    { attackBonus: "4" },
    { damageModifier: NaN },
    { reachMeters: 0 },
    { damageCount: 0 },
    { damageCount: 21 },
    { damageSides: 7 },
    { name: "" },
  ]) {
    assert.throws(() => buildMeleeProfile({ ...valid, ...patch }), /attack-invalid/);
  }
  assert.notEqual(buildMeleeProfile(valid).source.revision, profile.source.revision);
});

test("staging and discarding an NPC attack never changes its live sheet", async () => {
  const { buildMeleeProfile, stageNPCAttack } = await import("../preparation.mjs");
  const s = state();
  s.actors.n = {
    id: "n",
    name: "Guard",
    kind: "npc",
    hp: 8,
    maxHp: 10,
    combatProfile: { team: "watch" },
  };
  const draftEditor = { pendingActors: {}, actorPatches: {} };
  const profile = buildMeleeProfile({
    name: "Spear",
    reachMeters: 1.5,
    attackBonus: 3,
    damageCount: 1,
    damageSides: 6,
    damageModifier: 1,
    damageType: "piercing",
  });
  assert.throws(() => stageNPCAttack(draftEditor, s, "n", profile, "player"), /unauthorized/);
  stageNPCAttack(draftEditor, s, "n", profile, "dm");
  assert.equal(s.actors.n.combatProfile.meleeAttack, undefined);
  assert.equal(draftEditor.actorPatches.n.value.attackBonus, 3);
  draftEditor.actorPatches = {};
  assert.equal(s.actors.n.hp, 8);
  assert.equal(s.actors.n.combatProfile.meleeAttack, undefined);
});

test("saving only the NPC attack preserves live damage resources and other combat profile fields", async () => {
  const { buildMeleeProfile, stageNPCAttack } = await import("../preparation.mjs");
  const s = state();
  s.actors.n = {
    id: "n",
    name: "Guard",
    kind: "npc",
    hp: 8,
    maxHp: 10,
    action: true,
    reaction: true,
    combatProfile: { team: "watch", spells: [] },
  };
  const original = structuredClone(s.scenes[0]);
  const staged = { pendingActors: {}, actorPatches: {} };
  const profile = buildMeleeProfile({
    name: "Spear",
    reachMeters: 1.5,
    attackBonus: 3,
    damageCount: 1,
    damageSides: 6,
    damageModifier: 1,
    damageType: "piercing",
  });
  stageNPCAttack(staged, s, "n", profile, "dm");
  s.actors.n.hp = 2;
  s.actors.n.action = false;
  s.actors.n.reaction = false;
  s.actors.n.combatProfile.team = "allies";
  saveSceneDraft(s, original, "dm", original, {}, staged.actorPatches);
  assert.equal(s.actors.n.hp, 2);
  assert.equal(s.actors.n.action, false);
  assert.equal(s.actors.n.reaction, false);
  assert.equal(s.actors.n.combatProfile.team, "allies");
  assert.equal(s.actors.n.combatProfile.meleeAttack.attackBonus, 3);
});

test("a competing attack edit rejects all staged changes instead of overwriting a new profile", async () => {
  const { buildMeleeProfile, stageNPCAttack } = await import("../preparation.mjs");
  const s = state();
  s.actors.n = { id: "n", name: "Guard", kind: "npc", hp: 8 };
  const original = structuredClone(s.scenes[0]);
  const staged = { pendingActors: {}, actorPatches: {} };
  const profile = buildMeleeProfile({
    name: "Spear",
    reachMeters: 1.5,
    attackBonus: 3,
    damageCount: 1,
    damageSides: 6,
    damageModifier: 1,
    damageType: "piercing",
  });
  stageNPCAttack(staged, s, "n", profile, "dm");
  s.actors.n.combatProfile = { meleeAttack: { ...profile, attackBonus: 5 } };
  assert.throws(
    () =>
      saveSceneDraft(
        s,
        { ...original, name: "Changed scene" },
        "dm",
        original,
        {},
        staged.actorPatches,
      ),
    /actor-conflict/,
  );
  assert.equal(s.scenes[0].name, "Court");
  assert.equal(s.actors.n.combatProfile.meleeAttack.attackBonus, 5);
});

test("optional NPC attack inputs reject missing bonuses instead of inventing zero", async () => {
  const { meleeProfileFromForm } = await import("../preparation.mjs");
  const form = new FormData();
  assert.equal(meleeProfileFromForm(form), null);
  for (const [key, value] of Object.entries({
    meleeEnabled: "on",
    meleeName: "Spear",
    meleeReach: "1.5",
    meleeAttackBonus: "3",
    meleeDamageCount: "1",
    meleeDamageSides: "6",
    meleeDamageModifier: "0",
    meleeDamageType: "piercing",
  }))
    form.set(key, value);
  assert.equal(meleeProfileFromForm(form).damageModifier, 0);
  form.set("meleeAttackBonus", "");
  assert.throws(() => meleeProfileFromForm(form), /attack-invalid/);
  form.set("meleeAttackBonus", "0");
  assert.equal(meleeProfileFromForm(form).attackBonus, 0);
  form.delete("meleeDamageModifier");
  assert.throws(() => meleeProfileFromForm(form), /attack-invalid/);
});

test("new NPC attack is saved with the actor and clearing an existing attack preserves its other data", async () => {
  const { buildMeleeProfile, stageNPCAttack } = await import("../preparation.mjs");
  const s = state();
  const original = structuredClone(s.scenes[0]);
  const actor = createSceneNPC(
    { ...s, actors: { ...s.actors } },
    { id: "guard", name: "Guard", hp: 12, ac: 13, speed: 9 },
    "dm",
  );
  const pending = { pendingActors: { guard: actor }, actorPatches: {} };
  const profile = buildMeleeProfile({
    name: "Spear",
    reachMeters: 1.5,
    attackBonus: 3,
    damageCount: 1,
    damageSides: 6,
    damageModifier: 1,
    damageType: "piercing",
  });
  stageNPCAttack(pending, s, "guard", profile, "dm");
  assert.equal(s.actors.guard, undefined);
  saveSceneDraft(s, original, "dm", original, pending.pendingActors, pending.actorPatches);
  assert.equal(s.actors.guard.combatProfile.meleeAttack.attackBonus, 3);
  const next = { pendingActors: {}, actorPatches: {} };
  stageNPCAttack(next, s, "guard", null, "dm");
  const before = structuredClone(s.actors.guard);
  assert.equal(s.actors.guard.combatProfile.meleeAttack.attackBonus, 3);
  saveSceneDraft(s, original, "dm", original, {}, next.actorPatches);
  assert.deepEqual(s.actors.guard, {
    ...before,
    combatProfile: { ...before.combatProfile, meleeAttack: null },
  });
});

test("new NPC disposition is neutral by default, explicit and separate from DM ownership", () => {
  const s = state();
  const base = { name: "Guard", hp: 12, ac: 13, speed: 9 };
  assert.equal(createSceneNPC(s, { ...base, id: "neutral" }, "dm").combatProfile?.team, "neutral");
  for (const team of ["party", "neutral", "watch"]) {
    const actor = createSceneNPC(s, { ...base, id: team + "-npc", team }, "dm");
    assert.equal(actor.combatProfile.team, team);
    assert.equal(actor.owner, "dm");
  }
  assert.throws(
    () => createSceneNPC(s, { ...base, id: "bad", team: "unknown" }, "dm"),
    /team-invalid/,
  );
  assert.equal(s.actors.bad, undefined);
});

test("saving a staged disposition preserves live resources and clearing an attack preserves disposition", async () => {
  const { buildMeleeProfile, stageNPCAttack } = await import("../preparation.mjs");
  const s = state();
  createSceneNPC(s, { id: "guard", name: "Guard", hp: 12, ac: 13, speed: 9 }, "dm");
  s.actors.guard.combatProfile.spells = ["shield"];
  const original = structuredClone(s.scenes[0]);
  const staged = { pendingActors: {}, actorPatches: {} };
  const profile = buildMeleeProfile({
    name: "Spear",
    reachMeters: 1.5,
    attackBonus: 3,
    damageCount: 1,
    damageSides: 6,
    damageModifier: 1,
    damageType: "piercing",
  });
  assert.throws(
    () => stageNPCAttack(staged, s, "guard", profile, "player", "watch"),
    /unauthorized/,
  );
  assert.throws(() => stageNPCAttack(staged, s, "guard", profile, "dm", "unknown"), /team-invalid/);
  stageNPCAttack(staged, s, "guard", profile, "dm", "watch");
  assert.equal(s.actors.guard.combatProfile.team, "neutral");
  s.actors.guard.hp = 4;
  s.actors.guard.reaction = false;
  s.actors.guard.slots = { used: 2, max: 3 };
  saveSceneDraft(s, original, "dm", original, {}, staged.actorPatches);
  assert.equal(s.actors.guard.combatProfile.team, "watch");
  assert.deepEqual(s.actors.guard.combatProfile.spells, ["shield"]);
  assert.equal(s.actors.guard.hp, 4);
  assert.equal(s.actors.guard.reaction, false);
  assert.deepEqual(s.actors.guard.slots, { used: 2, max: 3 });
  const removal = { pendingActors: {}, actorPatches: {} };
  stageNPCAttack(removal, s, "guard", null, "dm");
  saveSceneDraft(s, original, "dm", original, {}, removal.actorPatches);
  assert.equal(s.actors.guard.combatProfile.team, "watch");
  assert.equal(s.actors.guard.combatProfile.meleeAttack, null);
});

test("disposition conflicts reject the whole scene save and NPC duplication can choose an independent disposition", async () => {
  const { stageNPCAttack } = await import("../preparation.mjs");
  const s = state();
  createSceneNPC(s, { id: "guard", name: "Guard", hp: 12, ac: 13, speed: 9, team: "watch" }, "dm");
  const original = structuredClone(s.scenes[0]);
  const staged = { pendingActors: {}, actorPatches: {} };
  stageNPCAttack(staged, s, "guard", null, "dm", "party");
  s.actors.guard.combatProfile.team = "neutral";
  assert.throws(
    () => saveSceneDraft(s, { ...original, name: "New" }, "dm", original, {}, staged.actorPatches),
    /actor-conflict/,
  );
  assert.equal(s.scenes[0].name, "Court");
  assert.equal(s.actors.guard.combatProfile.team, "neutral");
  const duplicate = duplicateSceneNPC(s, "guard", "copy", "Copy", "dm", "watch");
  assert.equal(duplicate.combatProfile.team, "watch");
  assert.equal(s.actors.guard.combatProfile.team, "neutral");
  assert.equal(duplicate.owner, "dm");
});

test("a new explicitly hostile NPC configured in preparation actually offers an opportunity at the table", async () => {
  const { buildMeleeProfile, stageNPCAttack } = await import("../preparation.mjs");
  const store = createStore();
  const s = store.state;
  const original = structuredClone(s.scenes[0]);
  const draft = structuredClone(original);
  const pendingState = { actors: {} };
  const guard = createSceneNPC(
    pendingState,
    { id: "custom-guard", name: "Guard", hp: 12, ac: 13, speed: 9, team: "watch" },
    "dm",
  );
  const staged = { pendingActors: { [guard.id]: guard }, actorPatches: {} };
  const profile = buildMeleeProfile({
    name: "Spear",
    reachMeters: 1.5,
    attackBonus: 3,
    damageCount: 1,
    damageSides: 6,
    damageModifier: 1,
    damageType: "piercing",
  });
  stageNPCAttack(staged, s, guard.id, profile, "dm", "watch");
  draft.tokens = [
    { id: "l", actorId: "livia", x: 200, y: 200 },
    { id: "g", actorId: guard.id, x: 200, y: 200 },
  ];
  saveSceneDraft(s, draft, "dm", original, staged.pendingActors, staged.actorPatches);
  s.combat.active = true;
  s.combat.order = ["livia", guard.id];
  s.combat.turn = 0;
  beginMovement(s, { id: "configured-oa", actorId: "livia", point: { x: 400, y: 200 } }, "player");
  const opportunity = projectReactions(s, "dm").find((entry) => entry.type === "opportunity");
  assert.equal(opportunity?.actorId, guard.id);
  assert.equal(s.scenes[0].tokens[0].x, 250);
  assert.equal(s.actors[guard.id].reaction, true);
});
