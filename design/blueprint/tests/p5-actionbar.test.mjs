// P5 fix package — the action bar (TV-67 groups and cost filters, TV-74 greyed actions
// with the reason), the creature panel's active effects (TV-85), the attack detail's
// ammunition choice and bonus (PG-69, TV-83) and the source text of every action (PG-69).
// Synthetic data only.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { beginAttempt, previewAction, expireTurnEffects } from "../combat.mjs";
import { startPreparedEncounter } from "../preparation.mjs";
import {
  renderCombatBar,
  renderActiveEffects,
  renderActionSource,
  renderCombatInspector,
  bindCombatUI,
  prepareCombatAction,
  resetCombatUI,
  sourcePages,
} from "../combat-ui.mjs";
import * as UI from "../combat-tracker.mjs";
import { harness, row } from "./p5-harness.mjs";

afterEach(() => {
  resetCombatUI();
  UI.resetTrackerView();
});

const combat = (h) =>
  h.ctx.commit("start", (s) => {
    s.scenes[0].encounter = {
      name: "Cortile",
      participants: [row("livia", 15), row("goblin-1", 10), row("doran", 5)],
    };
    startPreparedEncounter(s, "old-watch", "dm");
    expireTurnEffects(s, s.combat.order[0], "start");
  });

test("PG-69: an action's source reads as text whether its pages are a list or one list per language", () => {
  const h = harness();
  const ctx = h.ctx;
  const perLanguage = {
    source: { kind: "srd", revision: "5.2.1", edition: "2024", pages: { en: [96], it: [111] } },
  };
  assert.doesNotThrow(() => renderActionSource(ctx, perLanguage));
  assert.match(renderActionSource(ctx, perLanguage), /pagine 111/);
  ctx.lang = "en";
  assert.match(renderActionSource(ctx, perLanguage), /pages 96/);
  assert.deepEqual(sourcePages({ pages: [7, 16] }), [7, 16]);
  assert.deepEqual(sourcePages({ en: { pages: [5] }, it: { pages: [6] } }, "it"), [6]);
  assert.deepEqual(sourcePages({}), []);
});

test("TV-67: the action bar groups actions by theme and filters by cost; Reactions lists the creature's reactions", () => {
  const h = harness({ role: "player" });
  const html = renderCombatBar(h.ctx, "livia");
  const at = (text) => html.indexOf(text);
  for (const label of ["Armi", "Incantesimi", "Comuni"])
    assert.ok(at(`class="combat-group-tag" aria-hidden="true">${label}<`) > 0, label);
  assert.ok(at('data-combat-action="quarterstaff"') < at('data-combat-action="fire-bolt"'));
  assert.ok(at('data-combat-action="fire-bolt"') < at('data-combat-action="dash"'));
  assert.match(html, /<div class="combat-actions">/, "the list the hotbar scrolls stays");
  // Reconcile (27/09): every one of Livia's actions costs an action, so «Tutte» and «Solo
  // azioni» would filter nothing; her lone filter is the Reactions toggle. With two or more
  // filters «Tutte» comes back (tests/reconcile-ia.test.mjs).
  assert.doesNotMatch(html, /data-combat-filter="(all|action)"/);
  assert.match(html, /data-combat-filter="reaction" aria-pressed="false"/);
  assert.match(html, /combat-cost combat-cost-action/, "each action shows its cost");
  assert.match(
    html,
    /data-combat-action="fire-bolt"[^>]*>(?:(?!<\/button>).)*<span>Dardo di fuoco<\/span>/,
    "the name stays the label",
  );
  // The Reactions filter shows Livia's reactions and how each answers.
  let rendered = "";
  const button = { dataset: { combatFilter: "reaction" } };
  bindCombatUI(
    {
      querySelectorAll: (selector) => (selector === "[data-combat-filter]" ? [button] : []),
      querySelector: () => null,
    },
    { ...h.ctx, render: () => (rendered = renderCombatBar(h.ctx, "livia")) },
    "livia",
  );
  button.onclick();
  assert.match(rendered, /data-combat-reaction="shield"/);
  assert.match(rendered, /data-combat-reaction="opportunity"/);
  assert.doesNotMatch(rendered, /data-combat-action="dash"/);
});

test("TV-74: spent or impossible actions are greyed with the reason before any click; a click says why", () => {
  const h = harness({ role: "player" });
  combat(h);
  h.ctx.commit("dodge", (s) =>
    beginAttempt(
      s,
      { id: "d-1", actorId: "livia", actionId: "dodge", selection: {}, mode: "digital" },
      "player",
    ),
  );
  let html = renderCombatBar(h.ctx, "livia");
  assert.match(
    html,
    /data-combat-action="fire-bolt"[^>]*aria-disabled="true" data-combat-blocked="Azione già spesa\."/,
  );
  // At 0 HP every attack is greyed with its reason (PG-27, PG-46).
  h.ctx.commit("down", (s) => (s.actors.livia.hp = 0));
  html = renderCombatBar(h.ctx, "livia");
  const blocked = [
    ...html.matchAll(/data-combat-action="([^"]+)"[^>]*data-combat-blocked="([^"]+)"/g),
  ];
  assert.ok(blocked.some(([, id]) => id === "quarterstaff"));
  assert.ok(
    blocked.every(([, , why]) => /0 punti ferita/.test(why)),
    "the reason names 0 HP",
  );
  const toasts = [];
  const button = {
    dataset: { combatAction: "quarterstaff", combatBlocked: "A 0 punti ferita non puoi agire" },
  };
  bindCombatUI(
    {
      querySelectorAll: (selector) => (selector === "[data-combat-action]" ? [button] : []),
      querySelector: () => null,
    },
    { ...h.ctx, toast: (text, error) => toasts.push({ text, error }), render() {} },
    "livia",
  );
  button.onclick();
  assert.deepEqual(toasts, [{ text: "A 0 punti ferita non puoi agire", error: true }]);
  // Off turn the preview stays available (compare moves), with a hint only.
  const h2 = harness({ role: "player" });
  combat(h2);
  h2.ctx.commit("next", (s) => (s.combat.turn = 1));
  const off = renderCombatBar(h2.ctx, "livia");
  assert.match(
    off,
    /data-combat-action="fire-bolt"[^>]*is-off-turn|class="combat-action is-off-turn" data-combat-action="fire-bolt"/,
  );
  assert.doesNotMatch(off, /data-combat-action="fire-bolt"[^>]*aria-disabled/);
});

test("TV-85 and TV-64: the creature panel lists active effects with icon, source and duration", () => {
  const h = harness({ role: "player" });
  combat(h);
  assert.equal(renderActiveEffects(h.ctx, "livia"), "");
  h.ctx.commit("dodge", (s) =>
    beginAttempt(
      s,
      { id: "d-1", actorId: "livia", actionId: "dodge", selection: {}, mode: "digital" },
      "player",
    ),
  );
  h.ctx.commit("shield", (s) =>
    s.actors.livia.combatEffects.push({ type: "shield", actorId: "livia", expires: "start" }),
  );
  const html = renderActiveEffects(h.ctx, "livia");
  assert.match(html, /data-active-effect="dodge"/);
  assert.match(html, /Schivata/);
  assert.match(html, /fino all’inizio del suo prossimo turno/);
  assert.match(html, /SRD 5\.2\.1/);
  assert.match(html, /CA 12 \+ 5/);
  assert.match(html, /<svg viewBox="0 0 24 24"><path d="/);
  h.ctx.lang = "en";
  assert.match(renderActiveEffects(h.ctx, "livia"), /Dodge.*until the start of its next turn/s);
});

test("TV-83 and PG-69: the attack detail offers «Aggiungi bonus»; the added bonus reaches the attack roll", () => {
  const h = harness({ role: "player" });
  combat(h);
  prepareCombatAction(h.ctx, "livia", "fire-bolt", { targetIds: ["goblin-1"] });
  const html = renderCombatInspector(h.ctx, "livia");
  assert.match(html, /data-combat-param="situationalBonus"/);
  assert.match(html, /Aggiungi bonus al tiro per colpire/);
  const base = previewAction(
    h.ctx.state,
    "livia",
    "fire-bolt",
    { targetIds: ["goblin-1"] },
    "player",
  );
  assert.equal(base.available, true);
  let plain, bonus;
  h.ctx.commit("plain", (s) => {
    plain = beginAttempt(
      s,
      {
        id: "a-1",
        actorId: "livia",
        actionId: "fire-bolt",
        selection: { targetIds: ["goblin-1"] },
        mode: "physical",
      },
      "player",
    );
  });
  const h2 = harness({ role: "player" });
  combat(h2);
  h2.ctx.commit("bonus", (s) => {
    bonus = beginAttempt(
      s,
      {
        id: "a-2",
        actorId: "livia",
        actionId: "fire-bolt",
        selection: { targetIds: ["goblin-1"], situationalBonus: 2 },
        mode: "physical",
      },
      "player",
    );
  });
  const attackOf = (attempt) => attempt.requests.find((r) => r.kind === "attack");
  assert.equal(attackOf(bonus).modifier, attackOf(plain).modifier + 2);
  assert.ok(attackOf(bonus).modifierSources.some((m) => m.kind === "situational" && m.value === 2));
});

test("TV-54: the failed save's card offers «Usa resistenza leggendaria» to the DM", async () => {
  const { resolveRoll } = await import("../combat.mjs");
  const { openCombatRequests } = await import("../combat-ui.mjs");
  const D = await import("../combat-tracker-domain.mjs");
  const { addGoblin } = await import("./p5-harness.mjs");
  const h = harness();
  h.ctx.commit("setup", (s) => {
    addGoblin(s, "boss", "Capo", { x: 330, y: 380 });
    Object.assign(
      s.scenes[0].tokens.find((t) => t.actorId === "livia"),
      { x: 250, y: 380 },
    );
    s.scenes[0].encounter = { name: "Boss", participants: [row("livia", 15), row("boss", 10)] };
    startPreparedEncounter(s, "old-watch", "dm");
    expireTurnEffects(s, s.combat.order[0], "start");
  });
  h.ctx.commit("config", (s) =>
    D.configureMonster(
      s,
      D.sliceOf(s),
      "boss",
      { legendary: 0, resistance: 2, recharge: [] },
      "dm",
    ),
  );
  h.ctx.role = "player";
  h.ctx.commit("cast", (s) =>
    beginAttempt(
      s,
      {
        id: "bh-1",
        actorId: "livia",
        actionId: "burning-hands",
        selection: { point: { x: 330, y: 380 } },
        mode: "physical",
        applyMode: "assisted",
      },
      "player",
    ),
  );
  const live = () => h.ctx.state.combatAttempts.find((a) => a.id === "bh-1");
  h.ctx.commit("damage", (s) =>
    resolveRoll(
      s,
      "bh-1",
      live().requests.find((r) => r.kind === "damage").id,
      [6, 6, 6],
      "player",
    ),
  );
  h.ctx.role = "dm";
  h.ctx.commit("save", (s) =>
    resolveRoll(
      s,
      "bh-1",
      live().requests.find((r) => r.kind === "save" && r.actorId === "boss").id,
      [2],
      "dm",
    ),
  );
  const saved = globalThis.document;
  const node = { querySelectorAll: () => [], querySelector: () => null };
  globalThis.document = { querySelectorAll: () => [], querySelector: () => node };
  try {
    openCombatRequests(h.ctx, "bh-1");
    assert.match(
      h.dialogs.at(-1).body,
      /data-use-resistance="boss"[^>]*>Usa resistenza leggendaria \(2\/2\)/,
    );
    h.ctx.role = "player";
    openCombatRequests(h.ctx, "bh-1");
    assert.doesNotMatch(h.dialogs.at(-1).body, /data-use-resistance/);
  } finally {
    globalThis.document = saved;
  }
});

test("TV-74: with the action spent, Dash stays usable for the remaining movement (a hint, not greyed)", () => {
  const h = harness({ role: "player" });
  combat(h);
  h.ctx.commit("dodge", (s) =>
    beginAttempt(
      s,
      { id: "d-2", actorId: "livia", actionId: "dodge", selection: {}, mode: "digital" },
      "player",
    ),
  );
  const html = renderCombatBar(h.ctx, "livia");
  assert.doesNotMatch(html, /data-combat-action="dash"[^>]*aria-disabled/);
  assert.match(html, /data-combat-action="dash"[^>]*title="Azione già spesa\."/);
  assert.match(html, /data-combat-action="fire-bolt"[^>]*aria-disabled="true"/);
});
