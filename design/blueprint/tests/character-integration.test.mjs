import test from "node:test";
import assert from "node:assert/strict";
import { spellSlotPools, setSpellSlotPool, bindCharacters } from "../characters.mjs";
import {
  canViewActor,
  canControlActor,
  isCampaignActor,
  connectCharacterToCampaign,
} from "../character-access.mjs";
import { placeSceneToken } from "../preparation.mjs";
import { createInitialState } from "../state.mjs";
import { listActions, previewAction } from "../combat.mjs";

test("unknown reconstructed slot consumption is not treated as a fresh full pool", () => {
  const state = createInitialState();
  state.actors.livia.spellSlots = { 1: { max: 4, used: null } };
  const action = listActions(state, "livia").find((entry) => entry.id === "magic-missile");
  assert.equal(action.slotLevels[0].remaining, null);
  const preview = previewAction(
    state,
    "livia",
    "magic-missile",
    { slotLevel: 1, allocations: [{ actorId: "goblin-1", count: 3 }] },
    "player",
  );
  assert.equal(preview.available, false);
  assert.ok(preview.reasons.some((reason) => reason.code === "slot-state-unknown"));
  const pool = spellSlotPools(state.actors.livia)[0];
  assert.equal(pool.available, null);
  assert.equal(pool.overused, null);
});

test("a personal-sheet physical check inherits local private mutation and audit metadata", () => {
  const state = createInitialState();
  state.actors.livia.visibility = "private";
  state.actors.livia.campaignIds = [];
  let click, dialog, committed;
  const ctx = {
    state,
    role: "player",
    view: { id: "livia" },
    t: (_, en) => en,
    esc: String,
    label: String,
    canControl: (actor) => canControlActor(actor, "player"),
    dialog: (title, body, options) => {
      dialog = options;
    },
    commit: (title, mutation, options) => {
      committed = options;
      mutation(state);
    },
    toast: (message) => {
      throw new Error(message);
    },
  };
  bindCharacters(
    {
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: (_, handler) => {
        click = handler;
      },
    },
    ctx,
  );
  click({
    target: {
      closest: (selector) =>
        selector === "[data-character-action]"
          ? { dataset: { characterAction: "check", ability: "str" } }
          : null,
    },
  });
  const form = new FormData();
  form.set("mode", "physical");
  form.set("face", "10");
  dialog.onSubmit(form);
  assert.equal(committed.local, true);
  assert.equal(committed.visibility, "private");
  assert.equal(state.actors.livia.lastCheck.face, 10);
});

test("removing preparation from one grant preserves another prepared grant of the same action", () => {
  const state = createInitialState();
  state.actors.livia.spells = [
    { id: "class-shield", combatActionId: "shield", prepared: true, spellcastingAbility: "int" },
    {
      id: "background-shield",
      combatActionId: "shield",
      prepared: true,
      spellcastingAbility: "int",
    },
  ];
  state.actors.livia.combatProfile.spells = ["shield"];
  let click, dialog;
  const ctx = {
    state,
    role: "player",
    view: { id: "livia" },
    t: (_, en) => en,
    esc: String,
    label: String,
    canControl: (actor) => canControlActor(actor, "player"),
    dialog: (title, body, options) => {
      dialog = options;
    },
    commit: (title, mutation) => mutation(state),
    toast: (message) => {
      throw Error(message);
    },
  };
  bindCharacters(
    {
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: (_, handler) => {
        click = handler;
      },
    },
    ctx,
  );
  const unprepare = (id) => {
    click({
      target: {
        closest: (selector) =>
          selector === "[data-character-action]"
            ? { dataset: { characterAction: "prepare-spell", spell: id } }
            : null,
      },
    });
    const form = new FormData();
    form.set("prepared", "no");
    dialog.onSubmit(form);
  };
  unprepare("background-shield");
  assert.deepEqual(state.actors.livia.combatProfile.spells, ["shield"]);
  unprepare("class-shield");
  assert.deepEqual(state.actors.livia.combatProfile.spells, []);
});

test("personal characters stay outside the campaign and DM access until an explicit connection", () => {
  const actor = {
    id: "new",
    kind: "character",
    owner: "player",
    visibility: "private",
    campaignIds: [],
  };
  const state = {
    actors: { new: actor },
    campaign: { id: "campaign" },
    scenes: [{ tokens: [] }],
    combat: { order: [] },
  };
  assert.equal(canViewActor(actor, "dm"), false);
  assert.equal(canControlActor(actor, "dm"), false);
  assert.equal(isCampaignActor(actor, "campaign"), false);
  assert.throws(() => connectCharacterToCampaign(state, "new", "dm"));
  connectCharacterToCampaign(state, "new", "player");
  connectCharacterToCampaign(state, "new", "player");
  assert.deepEqual(actor.campaignIds, ["campaign"]);
  assert.equal(canViewActor(actor, "dm"), true);
  assert.equal(canControlActor(actor, "dm"), true);
  assert.deepEqual(state.scenes[0].tokens, []);
  assert.deepEqual(state.combat.order, []);
  assert.equal(isCampaignActor({ id: "legacy" }, "campaign"), true);
});

test("knowing a personal character id does not let preparation place it before connection", () => {
  const state = createInitialState();
  state.actors.new = {
    id: "new",
    kind: "character",
    owner: "player",
    visibility: "private",
    campaignIds: [],
  };
  const scene = state.scenes[0];
  assert.throws(
    () => placeSceneToken(state, scene.id, "new", { x: 200, y: 200 }, "new-token", "dm"),
    /actor-missing/,
  );
  connectCharacterToCampaign(state, "new", "player");
  placeSceneToken(state, scene.id, "new", { x: 200, y: 200 }, "new-token", "dm");
  assert.equal(scene.tokens.at(-1).actorId, "new");
});

test("sheet slot corrections keep canonical level-one combat pool and legacy alias coherent after reload", () => {
  const actor = JSON.parse(
    JSON.stringify({
      slots: { max: 3, used: 1 },
      spellSlots: { 1: { max: 4, used: 2 }, 2: { max: 2, used: 1 } },
    }),
  );
  assert.deepEqual(
    spellSlotPools(actor).map(({ level, max, used }) => [level, max, used]),
    [
      [1, 4, 2],
      [2, 2, 1],
    ],
  );
  setSpellSlotPool(actor, 1, { max: 2, used: 3 });
  assert.equal(actor.slots, actor.spellSlots[1]);
  assert.equal(actor.spellSlots[2].used, 1);
  assert.equal(spellSlotPools(actor)[0].available, 0);
  assert.equal(spellSlotPools(actor)[0].overused, 1);
  actor.spellSlots[1].used++;
  assert.equal(actor.slots.used, 4);
});

test("legacy slots remain visible while invalid slot corrections leave resources untouched", () => {
  const actor = { slots: { max: 3, used: 2 } };
  assert.equal(spellSlotPools(actor)[0].available, 1);
  const before = structuredClone(actor);
  for (const level of [0, 10, 1.5])
    assert.throws(() => setSpellSlotPool(actor, level, { max: 2, used: 0 }));
  for (const used of [-1, 0.5, NaN])
    assert.throws(() => setSpellSlotPool(actor, 2, { max: 2, used }));
  assert.deepEqual(actor, before);
  setSpellSlotPool(actor, 2, { max: 2, used: 1 });
  assert.deepEqual(
    spellSlotPools(actor).map(({ level, available }) => [level, available]),
    [
      [1, 1],
      [2, 1],
    ],
  );
});
