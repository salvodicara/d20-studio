// P5 fix package — initiative, start at the Table, turn order, turn-based mode, hidden
// turns and expiring effects. Synthetic data only (the lantern campaign sample).
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { advanceTurn, beginAttempt, expireTurnEffects } from "../combat.mjs";
import { createSceneNPC, placeSceneToken, startPreparedEncounter } from "../preparation.mjs";
import { projectLog } from "../chat-domain.mjs";
import * as D from "../combat-tracker-domain.mjs";
import * as UI from "../combat-tracker.mjs";
import { harness, addGoblin, row, cmd, current } from "./p5-harness.mjs";

afterEach(() => UI.resetTrackerView());

const start = (h) =>
  h.ctx.commit("Combattimento avviato", (s) => {
    startPreparedEncounter(s, "old-watch", "dm");
    expireTurnEffects(s, s.combat.order[0], "start");
  });
const endTurn = (h, label = "Turno concluso", options = {}) =>
  h.ctx.commit(label, (s) => advanceTurn(s), options);

test("TV-50: a creature joining after «Correggi iniziativa» is inserted by the corrected total (Sentinella A 20 before B 11)", () => {
  const h = harness();
  h.ctx.commit("setup", (s) => {
    s.scenes[0].encounter = {
      name: "Cortile",
      participants: [row("livia", 13, 2), row("goblin-1", 3, 2), row("doran", 8, 2)],
    };
  });
  start(h);
  cmd(h, "fix", (s, sl) =>
    D.correctInitiative(
      s,
      sl,
      "goblin-1",
      { natural: 18, bonus: 2, reason: "dado letto male" },
      "dm",
    ),
  );
  assert.equal(h.ctx.state.combat.order[0], "goblin-1", "the correction re-sorts: 20 first");
  h.ctx.commit("arrive", (s) => {
    const npc = createSceneNPC(
      s,
      { id: "sentinel-b", name: "Sentinella", hp: 7, ac: 13, speed: 9, team: "watch" },
      "dm",
    );
    npc.abilities = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    placeSceneToken(s, "old-watch", "sentinel-b", { x: 700, y: 300 }, "token-sentinel-b", "dm");
  });
  cmd(h, "join", (s, sl) => {
    D.addPending(s, sl, ["sentinel-b"], "dm");
    D.assignLetters(s, sl);
  });
  cmd(h, "roll", (s, sl) =>
    D.rollPending(s, sl, "sentinel-b", { mode: "physical", natural: 11, bonus: 0 }, "dm"),
  );
  cmd(h, "add", (s, sl) => D.addPendingToCombat(s, sl, "dm"));
  const order = h.ctx.state.combat.order;
  const names = order.map((id) => h.ctx.state.actors[id].name);
  assert.equal(names[0], "Sentinella A");
  assert.ok(order.indexOf("goblin-1") < order.indexOf("sentinel-b"), names.join(", "));
  assert.deepEqual(
    order.map((id) => D.initiativeOf(h.ctx.state, id)),
    [20, 15, 11, 10],
    "the order reads by total",
  );
  const prepared = h.ctx.state.scenes[0].encounter.participants.map((p) => p.actorId);
  assert.equal(prepared.at(-1), "doran", "the prepared order is sorted on join too");
});

test("PR-32: the Table start sorts the order by total on start; ties keep the DM's order", () => {
  const h = harness();
  const rows = D.startCandidates(h.ctx.state, "old-watch");
  assert.deepEqual(
    rows.map((r) => r.actorId),
    ["livia", "doran", "goblin-1", "goblin-2", "mira"],
  );
  const set = (id, natural) =>
    Object.assign(
      rows.find((r) => r.actorId === id),
      { natural },
    );
  set("livia", 5);
  set("doran", 16);
  set("goblin-1", 12);
  set("goblin-2", 12);
  rows.find((r) => r.actorId === "mira").included = false;
  cmd(h, "start", (s) => D.startFromTable(s, "old-watch", rows, "dm"));
  const combat = h.ctx.state.combat;
  assert.equal(combat.active, true);
  assert.deepEqual(combat.order, ["doran", "goblin-1", "goblin-2", "livia"]);
  assert.equal(combat.turn, 0);
  const prepared = h.ctx.state.scenes[0].encounter.participants.map((p) => p.actorId);
  assert.deepEqual(prepared, combat.order, "the saved order is the sorted one");
  const ledger = h.ctx.state.initiativeRolls.filter((r) => r.sceneId === "old-watch");
  assert.equal(ledger.length, 4, "typed physical d20s are recorded in the ledger");
  assert.ok(ledger.every((r) => r.mode === "physical"));
});

test("TV-46: one bonus source (the sheet), «Tira PNG» and «Tira tutti» fill the missing rolls and save at once", () => {
  const h = harness();
  const rows = D.startCandidates(h.ctx.state, "old-watch");
  const livia = rows.find((r) => r.actorId === "livia");
  assert.equal(livia.bonus, 2, "Livia's sheet Initiative (Dex 14) is +2, not 0");
  assert.equal(livia.bonus, D.initiativeBonus(h.ctx.state, "livia"));
  assert.ok(
    rows.every((r) => r.included),
    "visible tokens are chosen by default",
  );
  cmd(h, "npc", (s) => D.rollStartRows(s, "old-watch", rows, "npc", "dm"));
  assert.ok(rows.filter((r) => r.npc).every((r) => Number.isInteger(r.natural)));
  assert.ok(rows.filter((r) => !r.npc).every((r) => r.natural === null));
  let participants = h.ctx.state.scenes[0].encounter.participants;
  assert.equal(participants.length, rows.length, "the dialog saves on its own");
  assert.throws(
    () => cmd(h, "start", (s) => D.startFromTable(s, "old-watch", rows, "dm")),
    (error) => /Livia/.test(error.it) && /Doran/.test(error.it),
    "the missing rolls are named",
  );
  cmd(h, "all", (s) => D.rollStartRows(s, "old-watch", rows, "all", "dm"));
  assert.ok(rows.every((r) => Number.isInteger(r.natural) && r.mode === "digital"));
  participants = h.ctx.state.scenes[0].encounter.participants;
  const totals = participants.map((p) => p.natural + p.bonus);
  assert.deepEqual(
    totals,
    [...totals].sort((a, b) => b - a),
    "saved sorted by total",
  );
  const before = h.ctx.state.initiativeRolls.length;
  cmd(h, "start", (s) => D.startFromTable(s, "old-watch", rows, "dm"));
  assert.equal(
    h.ctx.state.initiativeRolls.length,
    before,
    "digital results already in the ledger are not recorded twice",
  );
  assert.equal(h.ctx.state.combat.active, true);
});

test("TV-46: a hidden token is left out by default and a prepared encounter keeps its rows and bonus", () => {
  const h = harness();
  h.ctx.commit("setup", (s) => {
    addGoblin(s, "gob-h", "Goblin", { x: 500, y: 500 }, { hidden: true });
    s.scenes[0].encounter = { name: "Agguato", participants: [row("livia", 14, 5)] };
  });
  let rows = D.startCandidates(h.ctx.state, "old-watch");
  assert.deepEqual(
    rows.filter((r) => r.included).map((r) => r.actorId),
    ["livia"],
  );
  assert.equal(rows[0].bonus, 5, "a recorded result keeps its own bonus");
  h.ctx.commit("clear", (s) => delete s.scenes[0].encounter);
  rows = D.startCandidates(h.ctx.state, "old-watch");
  assert.equal(rows.find((r) => r.actorId === "gob-h").included, false);
});

test("TV-48: a hidden creature's end of turn is a DM-only log line", () => {
  const h = harness();
  h.ctx.commit("setup", (s) => {
    addGoblin(s, "gob-h", "Goblin", { x: 500, y: 500 }, { hidden: true });
    s.scenes[0].encounter = {
      name: "Agguato",
      participants: [row("gob-h", 20), row("livia", 10), row("doran", 5)],
    };
  });
  start(h);
  assert.equal(current(h), "gob-h");
  assert.deepEqual(D.turnLogOptions(h.ctx.state), { visibility: "private" });
  endTurn(h, "Turno concluso", D.turnLogOptions(h.ctx.state));
  assert.deepEqual(D.turnLogOptions(h.ctx.state), {});
  endTurn(h, "Turno concluso", D.turnLogOptions(h.ctx.state));
  const player = projectLog(h.ctx.state, "player").filter((i) => i.label === "Turno concluso");
  const dm = projectLog(h.ctx.state, "dm").filter((i) => i.label === "Turno concluso");
  assert.equal(player.length, 1, "the player reads only Livia's end of turn");
  assert.equal(dm.length, 2);
});

test("TV-129: BG3 turn-based mode orders the party without initiative and gives way to combat", () => {
  const h = harness({ role: "player" });
  assert.deepEqual(D.turnModeCandidates(h.ctx.state), ["livia", "doran", "mira"]);
  cmd(h, "turns", (s) => D.startTurnMode(s, "player", "doran"));
  const combat = h.ctx.state.combat;
  assert.equal(combat.active, true);
  assert.equal(combat.turnMode, true);
  assert.deepEqual(combat.order, ["doran", "livia", "mira"], "the chosen character starts");
  assert.equal(D.initiativeOf(h.ctx.state, "doran"), null, "no initiative");
  endTurn(h);
  assert.equal(current(h), "livia");
  h.ctx.role = "dm";
  const rows = D.startCandidates(h.ctx.state, "old-watch");
  rows.forEach((r, i) => (r.natural = 10 + i));
  cmd(h, "combat", (s) => D.startFromTable(s, "old-watch", rows, "dm"));
  assert.equal(h.ctx.state.combat.turnMode, undefined, "a real combat replaces the turns");
  assert.equal(h.ctx.state.combat.order.length, rows.length);
  cmd(h, "finish", (s) => {
    s.combat.active = false;
  });
  cmd(h, "turns again", (s) => D.startTurnMode(s, "dm"));
  cmd(h, "end", (s) => D.endTurnMode(s, "dm"));
  assert.equal(h.ctx.state.combat.active, false);
});

test("TV-84 and TV-64: Dodge leaves a timed effect that expires at the next turn start and waits to be announced", () => {
  const h = harness();
  h.ctx.commit("setup", (s) => {
    s.scenes[0].encounter = {
      name: "Cortile",
      participants: [row("livia", 15), row("doran", 10)],
    };
  });
  start(h);
  h.ctx.role = "player";
  h.ctx.commit("Schivata", (s) =>
    beginAttempt(
      s,
      { id: "dodge-1", actorId: "livia", actionId: "dodge", selection: {}, mode: "digital" },
      "player",
    ),
  );
  assert.ok(h.ctx.state.actors.livia.combatEffects.some((e) => e.type === "dodge"));
  h.ctx.role = "dm";
  endTurn(h);
  assert.equal(D.pendingExpiries(h.slice()).length, 0, "Dodge lasts through Doran's turn");
  endTurn(h);
  assert.ok(!h.ctx.state.actors.livia.combatEffects.some((e) => e.type === "dodge"));
  const expired = h.slice().combat.expired;
  assert.equal(expired.length, 1);
  assert.equal(expired[0].type, "dodge");
  assert.equal(expired[0].actorId, "livia");
  // Announced once: a log line for everyone and a toast (Clash! expiry notice).
  assert.equal(D.pendingExpiries(h.slice()).length, 0);
  const lines = projectLog(h.ctx.state, "player").filter((i) =>
    /Schivata di Livia è terminata/.test(i.label),
  );
  assert.equal(lines.length, 1);
  assert.ok(h.toasts.some((t) => /Schivata di Livia è terminata/.test(t.text)));
});

test("TV-84 and TV-48: a hidden creature's expiring effect is announced to the DM only", () => {
  const h = harness();
  h.ctx.commit("setup", (s) => {
    addGoblin(s, "gob-h", "Goblin", { x: 500, y: 500 }, { hidden: true });
    s.scenes[0].encounter = {
      name: "Agguato",
      participants: [row("gob-h", 20), row("livia", 10)],
    };
  });
  start(h);
  h.ctx.commit("Schivata", (s) =>
    beginAttempt(
      s,
      { id: "dodge-h", actorId: "gob-h", actionId: "dodge", selection: {}, mode: "digital" },
      "dm",
    ),
  );
  endTurn(h, "Turno concluso", D.turnLogOptions(h.ctx.state));
  endTurn(h);
  const text = /Schivata di Goblin/;
  assert.equal(projectLog(h.ctx.state, "player").filter((i) => text.test(i.label)).length, 0);
  assert.equal(projectLog(h.ctx.state, "dm").filter((i) => text.test(i.label)).length, 1);
});

test("TV-82: a readied Magic Missile spends its slot now, holds Concentration and is cast once on the trigger", () => {
  const h = harness();
  h.ctx.commit("setup", (s) => {
    s.scenes[0].encounter = {
      name: "Cortile",
      participants: [row("livia", 15), row("goblin-1", 10), row("doran", 5)],
    };
  });
  start(h);
  h.ctx.role = "player";
  const options = D.readyOptions(h.ctx.state, "livia");
  const missile = options.actions.find((a) => a.id === "magic-missile");
  assert.ok(missile?.slotLevels?.length, "a slot spell can be readied");
  assert.ok(
    options.blocked.some((a) => a.id === "burning-hands"),
    "an area spell stays out",
  );
  const used =
    h.ctx.state.actors.livia.spellSlots?.[1]?.used ?? h.ctx.state.actors.livia.slots.used;
  cmd(h, "ready", (s, sl) =>
    D.readyAction(
      s,
      sl,
      "livia",
      { response: "magic-missile", trigger: "casts", slotLevel: 1 },
      "player",
    ),
  );
  const livia = () => h.ctx.state.actors.livia;
  const slotUsed = () => livia().spellSlots?.[1]?.used ?? livia().slots.used;
  assert.equal(slotUsed(), used + 1, "the slot is spent when readying");
  assert.equal(livia().concentration?.active, true, "the spell is held with Concentration");
  h.ctx.role = "dm";
  endTurn(h);
  h.ctx.role = "player";
  cmd(h, "fire", (s, sl) =>
    D.resolveReady(
      s,
      sl,
      "livia",
      { decision: "use", targetId: "goblin-1", mode: "physical" },
      "player",
    ),
  );
  assert.equal(slotUsed(), used + 1, "the cast does not spend a second slot");
  assert.equal(livia().concentration.active, false, "the held Concentration is released");
  const attempt = h.ctx.state.combatAttempts.at(-1);
  assert.equal(attempt.actionId, "magic-missile");
  assert.equal(h.slice().readied.livia.status, "used");
});

test("TV-82: a readied spell is lost when its Concentration breaks", () => {
  const h = harness();
  h.ctx.commit("setup", (s) => {
    s.scenes[0].encounter = {
      name: "Cortile",
      participants: [row("livia", 15), row("goblin-1", 10)],
    };
  });
  start(h);
  h.ctx.role = "player";
  cmd(h, "ready", (s, sl) =>
    D.readyAction(s, sl, "livia", { response: "magic-missile", trigger: "enters-range" }, "player"),
  );
  h.ctx.commit("broken", (s) => (s.actors.livia.concentration.active = false));
  assert.throws(
    () =>
      cmd(h, "fire", (s, sl) =>
        D.resolveReady(s, sl, "livia", { decision: "use", targetId: "goblin-1" }, "player"),
      ),
    /Concentration was broken/,
  );
  cmd(h, "ignore", (s, sl) => D.resolveReady(s, sl, "livia", { decision: "ignore" }, "player"));
  assert.equal(h.slice().readied.livia.status, "ignored");
});

test("TV-54: legendary uses are prefilled from a linked custom block's traits", () => {
  const h = harness();
  h.ctx.commit("setup", (s) => {
    addGoblin(s, "boss", "Capo", { x: 500, y: 500 });
    s.actors.boss.encounterBlock = { blockId: "block-boss" };
    s.ext["encounter-builder"] = {
      ...(s.ext["encounter-builder"] ?? {}),
      blocks: [
        {
          id: "block-boss",
          traits: [
            {
              name: { it: "Resistenza leggendaria (3/giorno)", en: "Legendary Resistance (3/Day)" },
            },
          ],
          actions: [
            { name: { it: "Usi delle azioni leggendarie: 2", en: "Legendary Action Uses: 2" } },
          ],
        },
      ],
    };
  });
  assert.deepEqual(D.blockLegendary(h.ctx.state, "boss"), { legendary: 2, resistance: 3 });
  assert.equal(D.blockLegendary(h.ctx.state, "goblin-1"), null);
});

test("TV-59 and TV-52: Mob attack explains the group-turn house rule and names the identical creatures; no census codes", () => {
  const h = harness();
  h.ctx.commit("setup", (s) => {
    addGoblin(s, "gob-a", "Goblin", { x: 300, y: 380 });
    addGoblin(s, "gob-b", "Goblin", { x: 250, y: 330 });
    s.scenes[0].encounter = {
      name: "Pattuglia",
      participants: [row("gob-a", 15), row("gob-b", 15), row("livia", 10)],
    };
  });
  start(h);
  UI.openMobAttack(h.ctx);
  const body = h.dialogs.at(-1).body;
  assert.match(body, /Ora agisce solo Goblin A/);
  assert.match(body, /anche Goblin B serve la regola della casa «turno di gruppo»/);
  assert.match(body, /data-ct-mob-rule/);
  // The tracker settings name the rule in plain words (no internal codes).
  const handlers = {};
  const node = {
    dataset: {},
    addEventListener: (type, fn) => (handlers[type] = fn),
  };
  UI.bindTracker(
    {
      querySelectorAll: (selector) => (selector === "[data-ct-settings]" ? [node] : []),
      querySelector: () => null,
    },
    h.ctx,
    null,
  );
  handlers.click({});
  const settings = h.dialogs.at(-1).body;
  assert.match(settings, /Turno di gruppo|turno di gruppo/i);
  assert.doesNotMatch(settings, /VTL-|FVT-|CMP-|R20-/);
  assert.doesNotMatch(UI.renderTracker(h.ctx, null), /VTL-|FVT-|CMP-|R20-/);
});
