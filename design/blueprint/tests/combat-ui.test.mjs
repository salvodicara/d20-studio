import test from "node:test";
import assert from "node:assert/strict";
import { renderRollHistory, renderActionSource, openRoll } from "../combat-ui.mjs";
const ctx = (role) => ({
  role,
  state: {
    log: [
      {
        id: "first",
        time: "2026-09-23T12:00:00Z",
        rolls: [
          {
            source: "combat",
            attemptId: "attempt",
            kind: "save",
            actorName: "Livia",
            owner: "player",
            controller: "dm",
            visibility: "private",
            values: [6, 17],
            modifier: 2,
            total: 19,
            rollMode: "advantage",
          },
          {
            source: "combat",
            attemptId: "attempt",
            kind: "attack",
            actorName: "Hidden sentinel",
            owner: "dm",
            controller: "dm",
            visibility: "private",
            values: [19],
            modifier: 4,
            total: 23,
          },
        ],
      },
      { kind: "correction", revertsId: "first" },
    ],
  },
  t: (it, en) => en,
  esc: (value) => String(value),
  label: (value) => (typeof value === "object" ? value.en : value),
});
test("roll evidence stays readable after undo while hidden NPC rolls remain private", () => {
  const html = renderRollHistory(ctx("player"));
  assert.match(html, /Livia/);
  assert.match(html, /max\(6, 17\) \+ 2 = 19/);
  assert.match(html, /Reversed/);
  assert.doesNotMatch(html, /Hidden sentinel|23/);
  assert.match(renderRollHistory(ctx("dm")), /Hidden sentinel/);
  assert.equal(renderRollHistory(ctx("player"), "unrelated"), "");
});

test("simultaneous hidden opportunity requests direct the player to DM coordination without an impossible order form", async () => {
  const { createInitialState } = await import("../state.mjs");
  const { beginMovement } = await import("../combat.mjs");
  const { renderReactionRequests } = await import("../reaction-ui.mjs");
  const state = createInitialState();
  state.combat.active = true;
  state.scenes[0].gridSnap = false;
  state.scenes[0].tokens = [
    { actorId: "livia", x: 200, y: 200 },
    { actorId: "goblin-1", x: 225, y: 180 },
    { actorId: "goblin-2", x: 225, y: 220 },
  ];
  for (const id of ["goblin-1", "goblin-2"])
    state.actors[id].combatProfile = {
      team: "watch",
      meleeAttack: {
        name: { it: "Lama", en: "Blade" },
        reachMeters: 1.5,
        attackBonus: 4,
        damageDice: [{ count: 1, sides: 6 }],
        damageModifier: 2,
        damageType: "slashing",
        source: { kind: "authored-demo", edition: "2024", revision: "review-case" },
      },
    };
  state.actors["goblin-2"].hidden = true;
  beginMovement(
    state,
    { id: "simultaneous", actorId: "livia", point: { x: 450, y: 200 } },
    "player",
  );
  const playerHTML = renderReactionRequests({ ...ctx("player"), state });
  assert.match(playerHTML, /DM needs to coordinate/);
  assert.doesNotMatch(playerHTML, /data-order-open|Esploratore|goblin-2/);
  const dmHTML = renderReactionRequests({ ...ctx("dm"), state });
  assert.match(dmHTML, /data-order-open/);
  assert.match(dmHTML, /Esploratore/);
});

test("authored NPC actions do not inherit an SRD attribution or a fake source link", () => {
  const html = renderActionSource(ctx("dm"), {
    source: { kind: "authored-demo", edition: "2024", revision: "npc-revision" },
  });
  assert.match(html, /Original demonstration content.*npc-revision/);
  assert.doesNotMatch(html, /SRD|href=/);
  const official = renderActionSource(ctx("dm"), {
    source: {
      kind: "srd",
      edition: "2024",
      revision: "5.2.1",
      pages: [13],
      url: "https://example.org/rule",
    },
  });
  assert.match(official, /SRD 5.2.1/);
  assert.match(official, /href="https:/);
});

test("roll history explains corrections, reused faces and faces superseded by a new dice profile", () => {
  const state = {
    log: [
      {
        id: "correction-commit",
        rolls: [
          {
            source: "combat",
            attemptId: "attempt",
            kind: "attack",
            actorName: "Livia",
            owner: "player",
            controller: "player",
            visibility: "shared",
            values: [20],
            modifier: 2,
            total: 22,
            previousValues: [19],
            correctionReason: "The d20 showed twenty",
          },
          {
            source: "combat",
            attemptId: "attempt",
            kind: "damage",
            status: "superseded",
            actorName: "Livia",
            owner: "player",
            controller: "player",
            visibility: "shared",
            dice: [{ count: 2, sides: 6 }],
            newDice: [{ count: 1, sides: 6 }],
            values: [3, 4],
            keptValues: [3],
            supersededValues: [4],
          },
          {
            source: "combat",
            attemptId: "attempt",
            kind: "damage",
            actorName: "Livia",
            owner: "player",
            controller: "player",
            visibility: "shared",
            values: [3],
            modifier: 0,
            total: 3,
            knownValues: [3],
            recomputedFrom: { dice: [{ count: 2, sides: 6 }], values: [3, 4] },
          },
        ],
      },
    ],
  };
  const html = renderRollHistory({ ...ctx("dm"), state });
  assert.match(html, /Corrects 19 · Reason: The d20 showed twenty/);
  assert.match(html, /2d6 → 1d6/);
  assert.match(html, /Superseded by the new dice profile: 4 · kept: 3/);
  assert.match(html, /Already recorded faces: 3/);
  assert.doesNotMatch(html, /undefined/);
});

test("a recomputed physical request shows the known face and asks only for the missing die", async () => {
  const { createStore } = await import("../state.mjs");
  const { beginAttempt, resolveRoll } = await import("../combat.mjs");
  const store = createStore({ storage: null });
  store.commit("Fixture", (s) => {
    s.combat.active = true;
    s.combat.order = ["livia", "goblin-1"];
    s.scenes[0].tokens = [
      { actorId: "livia", x: 100, y: 100 },
      { actorId: "goblin-1", x: 140, y: 100 },
    ];
    s.actors["goblin-1"].hp = s.actors["goblin-1"].maxHp = 30;
  });
  store.commit("Attempt", (s) =>
    beginAttempt(
      s,
      {
        id: "ui-attempt",
        actorId: "livia",
        actionId: "quarterstaff",
        selection: { targetIds: ["goblin-1"] },
        mode: "physical",
      },
      "player",
    ),
  );
  const attackId = store.state.combatAttempts[0].requests[0].id;
  store.commit("Attack", (s) => resolveRoll(s, "ui-attempt", attackId, [19], "player"));
  const damageId = store.state.combatAttempts[0].requests[1].id;
  store.commit("Damage", (s) => resolveRoll(s, "ui-attempt", damageId, [3], "player"));
  store.undo();
  store.undo();
  store.commit("Critical", (s) =>
    resolveRoll(s, "ui-attempt", attackId, [20], "player", { correctionReason: "Misread" }),
  );
  const dialogs = [];
  const element = { querySelectorAll: () => [], querySelector: () => element };
  globalThis.document = { querySelector: () => element, querySelectorAll: () => [] };
  const ui = {
    ...ctx("player"),
    get state() {
      return store.state;
    },
    lang: "en",
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    commit: (label, mutator) => store.commit(label, mutator),
    toast: () => {},
  };
  try {
    openRoll(ui, "ui-attempt", damageId);
    const [dialog] = dialogs;
    assert.match(dialog.title, /Complete the roll/);
    assert.match(dialog.body, /1d6 → 2d6/);
    assert.match(dialog.body, /Die 1 · d6: <strong>3<\/strong> · already recorded/);
    assert.doesNotMatch(dialog.body, /name="face0"/);
    assert.match(dialog.body, /name="face1"/);
    const form = new Map([
      ["diceMode", "physical"],
      ["face1", "5"],
      ["correctionReason", ""],
    ]);
    dialog.options.onSubmit({ get: (name) => form.get(name) ?? null });
    const damage = store.state.combatAttempts[0].requests[1];
    assert.deepEqual(damage.values, [3, 5]);
    assert.equal(damage.mode, "physical");
    assert.equal(store.state.actors["goblin-1"].hp, 22);
  } finally {
    delete globalThis.document;
  }
});

// ---------------------------------------------------------------- review 10 (combat UI)

async function tableUI({ prepare = () => {} } = {}) {
  const { createStore } = await import("../state.mjs");
  const { canControlActor } = await import("../character-access.mjs");
  const store = createStore({ storage: null });
  store.commit(
    "Fixture",
    (s) => {
      Object.assign(s.combat, { active: true, order: ["livia", "goblin-1", "goblin-2"], turn: 0 });
      prepare(s);
    },
    "dm",
  );
  const element = {
    querySelectorAll: () => [],
    querySelector: () => null,
    outerHTML: "",
    innerHTML: "",
  };
  globalThis.document = { querySelector: () => element, querySelectorAll: () => [] };
  const commits = [],
    dialogs = [];
  const ui = {
    role: "player",
    lang: "en",
    get state() {
      return store.state;
    },
    t: (it, en) => en,
    esc: (value) => String(value),
    label: (value) => (typeof value === "object" && value ? value.en : String(value ?? "")),
    icon: () => "",
    canControl: (a) => canControlActor(a, "player", store.state),
    commit: (label, mutator) => {
      commits.push(label);
      store.commit(label, mutator, "player");
    },
    render() {},
    toast() {},
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
  };
  return { store, ui, commits, dialogs };
}
function prepareAction(ui, actionId) {
  const button = { dataset: { combatAction: actionId } };
  return import("../combat-ui.mjs").then(({ bindCombatUI }) => {
    bindCombatUI(
      {
        querySelectorAll: (selector) => (selector === "[data-combat-action]" ? [button] : []),
        querySelector: () => null,
      },
      ui,
      "livia",
    );
    button.onclick();
  });
}

test("review 10: a digital click-to-attack commits the attempt and its dice separately; Undo keeps it spent", async () => {
  const { handleCombatMap, resetCombatUI } = await import("../combat-ui.mjs");
  const { store, ui, commits } = await tableUI();
  try {
    resetCombatUI();
    await prepareAction(ui, "fire-bolt");
    const goblin = store.state.scenes[0].tokens.find((t) => t.actorId === "goblin-1");
    handleCombatMap(ui, "livia", "click", { x: goblin.x, y: goblin.y }, "goblin-1");
    assert.deepEqual(commits, ["Attempt recorded", "Digital dice rolled"]);
    const faces = store.state.combatAttempts.at(-1).requests[0].values;
    store.undo("player");
    const attempt = store.state.combatAttempts.at(-1);
    assert.equal(store.state.actors.livia.action, false, "the attempt stays spent");
    assert.deepEqual(attempt.requests[0].acceptedValues, faces);
    assert.equal(attempt.requests[0].withdrawn, true);
  } finally {
    delete globalThis.document;
  }
});

test("review 10: the attack preview lists sourced roll reasons and says when they cancel out", async () => {
  const { handleCombatMap, renderCombatInspector, resetCombatUI } =
    await import("../combat-ui.mjs");
  const { applyConditionEvent } = await import("../conditions.mjs");
  const { store, ui } = await tableUI({
    prepare: (s) => {
      Object.assign(
        s.scenes[0].tokens.find((t) => t.actorId === "goblin-1"),
        { x: 285, y: 380 },
      );
      applyConditionEvent(s, {
        eventId: "prone-goblin",
        kind: "apply",
        actorId: "goblin-1",
        conditionId: "prone",
        source: { kind: "authored-demo", revision: "ui" },
        immunityConfirmed: true,
      });
    },
  });
  try {
    resetCombatUI();
    await prepareAction(ui, "fire-bolt");
    handleCombatMap(ui, "livia", "move", { x: 285, y: 380 }, "goblin-1");
    const html = renderCombatInspector(ui, "livia");
    assert.match(html, /Normal roll: Advantage and Disadvantage cancel out/);
    assert.match(
      html,
      /Disadvantage: Ranged attack with an enemy within 1.5 m who can see you · SRD 5.2.1 p. 15/,
    );
    assert.match(html, /Advantage: Prone \(target\)/);
    assert.ok(store.state.actors.livia.action, "a preview spends nothing");
  } finally {
    delete globalThis.document;
  }
});

test("review 10: an unknown Frightened source asks an explicit question before the attack", async () => {
  const { handleCombatMap, renderCombatInspector, resetCombatUI } =
    await import("../combat-ui.mjs");
  const { applyConditionEvent } = await import("../conditions.mjs");
  const { ui } = await tableUI({
    prepare: (s) =>
      applyConditionEvent(s, {
        eventId: "fear",
        kind: "apply",
        actorId: "livia",
        conditionId: "frightened",
        source: { kind: "authored-demo", revision: "ui" },
        immunityConfirmed: true,
      }),
  });
  try {
    resetCombatUI();
    await prepareAction(ui, "fire-bolt");
    handleCombatMap(ui, "livia", "move", { x: 620, y: 250 }, "goblin-1");
    const html = renderCombatInspector(ui, "livia");
    assert.match(html, /Is the source of fear within the attacker's line of sight\?/);
    assert.match(html, /data-combat-fact="source-sight"/);
    assert.match(html, /Answer the condition question/);
  } finally {
    delete globalThis.document;
  }
});

test("review 10: a completion mixing a known digital face and a typed die labels each die", () => {
  const html = renderRollHistory({
    ...ctx("player"),
    state: {
      log: [
        {
          id: "mixed",
          rolls: [
            {
              source: "combat",
              attemptId: "a",
              kind: "damage",
              actorName: "Livia",
              owner: "player",
              controller: "player",
              visibility: "shared",
              values: [8, 3],
              modifier: 0,
              total: 11,
              mode: "mixed",
              faceModes: ["digital", "physical"],
            },
          ],
        },
      ],
    },
  });
  assert.match(html, /Digital \(die 1\) \+ Physical \(die 2\)/);
  assert.doesNotMatch(html, /Recorded · Physical</);
});

test("review 10: the vital roll result offers the way back to Conditions and status", async () => {
  const { openCombatRequests } = await import("../combat-ui.mjs");
  const { ui, dialogs } = await tableUI();
  const buttons = {};
  const empty = { querySelectorAll: () => [], querySelector: () => null };
  globalThis.document = {
    querySelector: (selector) =>
      selector === "[data-return-conditions]" ? (buttons.back ??= {}) : empty,
    querySelectorAll: () => [],
  };
  try {
    let returned = 0;
    openCombatRequests(ui, "", { returnTo: () => returned++ });
    assert.match(dialogs.at(-1).body, /Back to Conditions and status/);
    buttons.back.onclick();
    assert.equal(returned, 1);
    openCombatRequests(ui);
    assert.doesNotMatch(dialogs.at(-1).body, /Back to Conditions and status/);
  } finally {
    delete globalThis.document;
  }
});
