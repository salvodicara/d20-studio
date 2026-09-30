// R1 (round 2) SV-37 — every disabled confirm control of the Table's attack detail and of the
// reaction requests names its cause and remedy through aria-describedby (Roll20 errors that
// name the fix). Synthetic data only.
import test, { before } from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import { neighboursReady, beginMovement } from "../combat.mjs";
import { prepareCombatAction, renderCombatInspector, resetCombatUI } from "../combat-ui.mjs";
import { bindReactionRequests } from "../reaction-ui.mjs";
import { harness } from "./p5-harness.mjs";

before(async () => {
  await neighboursReady;
});

// Every disabled button in `html` points at an element whose text is its reason.
function describedDisabled(html) {
  const buttons = [...html.matchAll(/<button[^>]*\sdisabled[^>]*>/g)].map((m) => m[0]);
  assert.ok(buttons.length, "a disabled control is rendered");
  for (const button of buttons) {
    const id = /aria-describedby="([^"]+)"/.exec(button)?.[1];
    assert.ok(id, "aria-describedby on " + button);
    const reason = new RegExp(`id="${id}"[^>]*>(.+?)</`).exec(html)?.[1] ?? "";
    assert.ok(reason.replace(/<[^>]+>/g, "").trim().length > 10, "reason text for " + id);
  }
  return buttons;
}

test("SV-37: «Lancia Mani brucianti» disabled until aimed says what is missing", () => {
  resetCombatUI();
  const h = harness({ role: "player" });
  prepareCombatAction(h.ctx, "livia", "burning-hands", {});
  const html = renderCombatInspector(h.ctx, "livia");
  const [button] = describedDisabled(html);
  assert.match(button, /data-combat-execute/);
  assert.match(html, /id="combat-execute-reason"[^>]*><li>Punta una direzione sulla mappa\.<\/li>/);
  resetCombatUI();
});

test("SV-37: the order of simultaneous opportunities names why the ends cannot move", () => {
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
        source: { kind: "authored-demo", edition: "2024", revision: "r1-reasons" },
      },
    };
  beginMovement(state, { id: "both", actorId: "livia", point: { x: 450, y: 200 } }, "player");
  const dialogs = [];
  const ctx = {
    role: "dm",
    lang: "it",
    state,
    t: (it) => it,
    esc: (value) => String(value),
    label: (value) => (typeof value === "object" ? value.it : value),
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    toast() {},
  };
  const open = { dataset: { orderOpen: "both" } };
  const previous = globalThis.document;
  globalThis.document = { querySelectorAll: () => [], querySelector: () => null };
  try {
    bindReactionRequests(
      { querySelectorAll: (selector) => (selector === "[data-order-open]" ? [open] : []) },
      ctx,
      { mode: () => "digital", refresh() {}, accepted() {} },
    );
    open.onclick();
  } finally {
    globalThis.document = previous;
  }
  const body = dialogs.at(-1).body;
  const buttons = describedDisabled(body);
  assert.equal(buttons.length, 2, "the first «Anticipa» and the last «Posticipa»");
  assert.match(body, /id="reaction-order-ends">La prima occasione non può anticipare/);
});
