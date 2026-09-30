import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import { bindCharacters } from "../characters.mjs";
import { beginAttempt, resolveRoll, listActions } from "../combat.mjs";
import { esc, icon } from "../ui.mjs";
function harness(state) {
  let click, dialog;
  const ctx = {
    state,
    view: { id: "livia", tab: "spells" },
    role: "player",
    t: (it) => it,
    esc,
    icon,
    label: (v) => (typeof v === "object" ? v.it : v),
    canControl: (a) => a.owner === "player",
    toast: (message) => {
      throw Error(message);
    },
    commit: (title, mutate) => mutate(state),
    dialog: (title, body, options) => {
      dialog = { title, body, options };
    },
  };
  bindCharacters(
    {
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: (type, handler) => {
        if (type === "click") click = handler;
      },
    },
    ctx,
  );
  return {
    click: (action, extra = {}) =>
      click({
        target: {
          closest: (selector) =>
            selector === "[data-character-action]"
              ? { dataset: { characterAction: action, ...extra } }
              : null,
        },
      }),
    submit: (values) => {
      const form = new FormData();
      for (const [key, value] of Object.entries(values)) form.set(key, value);
      dialog.options.onSubmit(form);
    },
  };
}
test("sheet concentration replacement expires the old pending save and only removes effects from that instance", () => {
  const state = createInitialState();
  state.combat.active = true;
  state.combat.turn = 1;
  state.actors.livia.reaction = false;
  state.actors.livia.concentration = { id: "old-instance", name: "Old blessing", active: true };
  state.actors.doran.combatEffects = [
    { type: "blessing", concentrationId: "old-instance" },
    { type: "other", concentrationId: "unrelated" },
  ];
  state.actors["goblin-1"].combatProfile = {
    spellcastingAbility: "int",
    proficiencyBonus: 2,
    spells: ["fire-bolt"],
    componentsAvailable: true,
    team: "watch",
  };
  const attempt = beginAttempt(
    state,
    {
      id: "hit",
      actorId: "goblin-1",
      actionId: "fire-bolt",
      mode: "physical",
      selection: { targetIds: ["livia"] },
    },
    "dm",
  );
  resolveRoll(state, attempt.id, attempt.requests[0].id, [15], "dm");
  resolveRoll(state, attempt.id, attempt.requests.find((r) => r.kind === "damage").id, [3], "dm");
  const concentration = attempt.requests.find((r) => r.kind === "concentration");
  assert.equal(concentration.status, "pending");
  const priorSlots = state.actors.livia.slots.used,
    priorHP = state.actors.livia.hp;
  const ui = harness(state);
  ui.click("record-concentration");
  ui.submit({ effectName: "New blessing", effectSource: "Recorded correction" });
  assert.equal(concentration.status, "expired");
  assert.equal(state.actors.livia.concentration.name, "New blessing");
  assert.notEqual(state.actors.livia.concentration.id, "old-instance");
  assert.deepEqual(state.actors.doran.combatEffects, [
    { type: "other", concentrationId: "unrelated" },
  ]);
  assert.equal(state.actors.livia.slots.used, priorSlots);
  assert.equal(state.actors.livia.hp, priorHP);
  const currentId = state.actors.livia.concentration.id;
  state.actors.doran.combatEffects.push({ type: "blessing", concentrationId: currentId });
  ui.click("end-concentration");
  assert.equal(state.actors.livia.concentration, null);
  assert.deepEqual(state.actors.doran.combatEffects, [
    { type: "other", concentrationId: "unrelated" },
  ]);
});
test("preparation changes the explicit sample spell repertoire but does not infer a spell from free text", () => {
  const state = createInitialState();
  const ui = harness(state),
    spell = state.actors.livia.spells.find((s) => s.combatActionId === "burning-hands");
  ui.click("prepare-spell", { spell: spell.id });
  ui.submit({ prepared: "no" });
  assert.equal(
    listActions(state, "livia").some((a) => a.id === "burning-hands"),
    false,
  );
  ui.click("prepare-spell", { spell: spell.id });
  ui.submit({ prepared: "yes" });
  assert.equal(
    listActions(state, "livia").some((a) => a.id === "burning-hands"),
    true,
  );
  state.actors.livia.spells.push({
    id: "freeform",
    name: "Meteor Swarm",
    level: 9,
    prepared: false,
  });
  ui.click("prepare-spell", { spell: "freeform" });
  ui.submit({ prepared: "yes" });
  assert.equal(state.actors.livia.combatProfile.spells.includes("meteor-swarm"), false);
});
