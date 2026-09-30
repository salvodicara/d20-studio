// Hand-offs of audit round 2 — P1 privacy. The combat roll evidence carries the attack's
// audience (TV-89, Foundry roll modes, DDB «Roll to»), its riders (PG-47) and its DC (C1), so
// the Registro, the 3D dice, the Table's roll history and the Discord forwarding never show a
// «Solo il DM» or «Io e il DM» roll to whoever may not read it, name Bless on the card, and
// never leak a disguised creature's true name (TV-141). Synthetic demo data only.
import test, { before, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createInitialState, createStore } from "../state.mjs";
import { neighboursReady, beginAttempt, resolveRoll, enqueueRollRequest } from "../combat.mjs";
import { neighboursReady as uiReady, renderRollHistory, resetCombatUI } from "../combat-ui.mjs";
import * as SP from "../sheet-plus-domain.mjs";
import * as TD from "../dice-tray-domain.mjs";
import * as CS from "../campaign-settings-domain.mjs";
import { projectLog, disclosureReady, useDisclosureReader } from "../chat-domain.mjs";
import { describeRoll, recentRolls } from "../dice-3d-domain.mjs";
import { logItems } from "../integrations-domain.mjs";
import { getEntry, srdMeleeProfile } from "../srd-compendium.mjs";
import { harness } from "./p5-harness.mjs";

before(async () => {
  await neighboursReady;
  await uiReady;
  await disclosureReady;
});
afterEach(() => {
  useDisclosureReader(null);
  resetCombatUI();
});

// Livia next to the Sentinella (goblin-1) in combat, on her turn.
function fixture(s) {
  s.ext ??= {};
  s.ext[SP.ID] = SP.seedSlice(s);
  s.ext[TD.ID] = TD.seedSlice();
  s.ext[CS.ID] = CS.seedSlice();
  s.combat.active = true;
  s.combat.order = ["livia", "goblin-1", "doran", "goblin-2"];
  s.combat.turn = 0;
  const place = (id, x, y) =>
    Object.assign(
      s.scenes[0].tokens.find((t) => t.actorId === id),
      { x, y },
    );
  place("livia", 100, 100);
  place("goblin-1", 150, 100);
  place("doran", 300, 300);
  place("goblin-2", 400, 400);
  for (const actor of Object.values(s.actors)) {
    actor.hp = 40;
    actor.maxHp = 40;
    actor.ac = 12;
  }
}
function table(setup) {
  const store = createStore({ storage: null });
  store.commit(
    "Fixture",
    (s) => {
      Object.assign(s, createInitialState());
      fixture(s);
      setup?.(s);
    },
    "dm",
  );
  return store;
}
// Livia's quarterstaff on the Sentinella, committed as the Table does (a «Solo io» roll is a
// private commit, combat-ui commitOptionsFor), and the accepted log roll of the attack.
function attack(store, selection = {}, faces = [15]) {
  const options = selection.audience === "self" ? { visibility: "private" } : {};
  store.commit(
    "Attacco",
    (s) =>
      beginAttempt(
        s,
        {
          id: "a-" + (s.combatAttempts?.length ?? 0),
          actorId: "livia",
          actionId: "quarterstaff",
          selection: { targetIds: ["goblin-1"], ...selection },
          mode: "physical",
        },
        "player",
      ),
    "player",
    options,
  );
  const attempt = store.state.combatAttempts.at(-1);
  const request = attempt.requests.find((r) => r.kind === "attack");
  store.commit(
    "Tentativo registrato",
    (s) => resolveRoll(s, attempt.id, request.id, faces, "player"),
    "player",
    options,
  );
  return store.state.log.flatMap((e) => e.rolls ?? []).find((r) => r.requestId === request.id);
}
const viewsOf = (state, role, roll) =>
  projectLog(state, role)
    .filter((item) => item.type === "rolls")
    .flatMap((item) => item.rolls)
    .filter((view) => view.id === roll.id);

test("TV-89: a «Solo il DM» attack keeps its audience in the evidence; the roller reads no face anywhere", () => {
  const store = table();
  const roll = attack(store, { audience: "blind" });
  assert.equal(roll.audience, "blind");
  assert.equal(roll.acceptedBy, "player");
  assert.equal(roll.visibility, "private", "a hidden audience is a private roll (the tray's rule)");
  const state = store.state;
  // Registro: the roller keeps a card without dice or total, «Risultato riservato al DM».
  const mine = viewsOf(state, "player", roll);
  assert.equal(mine.length, 1);
  assert.equal(mine[0].hiddenResult, "blind");
  assert.deepEqual(mine[0].values, []);
  assert.equal(mine[0].total, null);
  assert.equal(mine[0].faces, null);
  const dm = viewsOf(state, "dm", roll);
  assert.deepEqual(dm[0].values, [15]);
  assert.equal(dm[0].hiddenResult, undefined);
  // Another identity at the table never sees the card.
  assert.equal(viewsOf(state, "spectator", roll).length, 0);
  // 3D dice and their recent list.
  assert.equal(describeRoll(state, roll, "player"), null);
  assert.ok(describeRoll(state, roll, "dm"));
  assert.ok(!recentRolls(state, "player").some((item) => item.key === roll.id));
  // Discord forwards public rolls only.
  const forwarded = logItems(state, null, "it").items.filter((item) => item.kind === "roll");
  assert.equal(forwarded.length, 0);
});

test("TV-89: «Io e il DM» reaches the roller and the DM, nobody else; «Tutti» stays shared", () => {
  const store = table();
  const roll = attack(store, { audience: "gm" });
  assert.equal(roll.audience, "gm");
  const state = store.state;
  assert.deepEqual(viewsOf(state, "player", roll)[0].values, [15]);
  assert.deepEqual(viewsOf(state, "dm", roll)[0].values, [15]);
  assert.equal(viewsOf(state, "spectator", roll).length, 0);
  assert.ok(describeRoll(state, roll, "player"));
  assert.ok(describeRoll(state, roll, "dm"));
  assert.equal(describeRoll(state, roll, "spectator"), null);
  assert.equal(logItems(state, null, "it").items.filter((i) => i.kind === "roll").length, 0);
  const open = attack(table(), {});
  assert.equal(open.audience, undefined);
  assert.equal(open.visibility, "shared");
});

test("TV-89: the Table's roll history reads the evidence's audience, even after the attempt is gone", () => {
  const h = harness({ role: "player" });
  h.ctx.commit("setup", (s) => fixture(s));
  let attemptId;
  h.ctx.commit("attempt", (s) => {
    attemptId = beginAttempt(
      s,
      {
        id: "a-blind",
        actorId: "livia",
        actionId: "quarterstaff",
        selection: { targetIds: ["goblin-1"], audience: "blind" },
        mode: "physical",
      },
      "player",
    ).id;
  });
  const request = h.ctx.state.combatAttempts.find((a) => a.id === attemptId).requests[0];
  h.ctx.commit("roll", (s) => resolveRoll(s, attemptId, request.id, [17], "player"));
  // The attempt leaves the live list (a reset of the encounter): the log evidence stays.
  h.ctx.commit("drop", (s) => {
    s.combatAttempts = [];
  });
  h.ctx.role = "player";
  assert.doesNotMatch(renderRollHistory(h.ctx), /\b17\b/);
  h.ctx.role = "dm";
  assert.match(renderRollHistory(h.ctx), /\b17\b/);
});

test("PG-47: the Registro names the Bless die of an attack («1d20 + 1d4 (Benedizione)»)", () => {
  const store = table((s) => SP.toggleEffect(s, "livia", "bless", true, "player"));
  const roll = attack(store, {}, [11, 2]);
  assert.equal(roll.riders?.[0]?.id, "bless");
  assert.deepEqual(roll.riderRolls?.[0]?.faces, [2]);
  const view = viewsOf(store.state, "player", roll)[0];
  assert.match(view.dice, /1d20 \+ 1d4 \(Benedizione\)/);
  assert.deepEqual(
    view.faces.map((f) => [f.value, f.label]),
    [
      [11, ""],
      [2, "Benedizione"],
    ],
  );
  assert.equal(view.total, roll.total);
  // Bane subtracts its die: the dice line says so.
  const bane = table((s) => SP.toggleEffect(s, "livia", "bane", true, "player"));
  const cursed = attack(bane, {}, [11, 2]);
  assert.match(viewsOf(bane.state, "dm", cursed)[0].dice, /1d20 − 1d4 \(Anatema\)/);
});

test("C1: a requested save carries its DC into the Registro, hidden from players when the campaign hides DCs", () => {
  const store = table();
  let attemptId;
  store.commit(
    "Richiesta",
    (s) => {
      attemptId = enqueueRollRequest(
        s,
        {
          id: "req-1",
          actorId: "livia",
          kind: "save",
          ability: "dex",
          modifier: 2,
          dc: 13,
          label: { it: "TS su Destrezza", en: "Dexterity save" },
        },
        "dm",
      ).id;
    },
    "dm",
  );
  const request = store.state.combatAttempts.find((a) => a.id === attemptId).requests[0];
  store.commit("TS", (s) => resolveRoll(s, attemptId, request.id, [9], "player"), "player");
  const roll = store.state.log
    .flatMap((e) => e.rolls ?? [])
    .find((r) => r.requestId === request.id);
  assert.equal(roll.dc, 13);
  assert.equal(viewsOf(store.state, "player", roll)[0].dc, 13);
  useDisclosureReader(() => ({ dc: "hidden" }));
  const hidden = viewsOf(store.state, "player", roll)[0];
  assert.equal(hidden.dc, null);
  assert.equal(hidden.dcHidden, true);
  assert.equal(viewsOf(store.state, "dm", roll)[0].dc, 13);
});

test("TV-141: a disguised creature's roll never names it to other viewers in the Registro or the 3D dice", () => {
  const store = table();
  const roll = attack(store, {}, [12]);
  // Livia travels under an alias (knowledge identities): older rolls read the alias too.
  store.commit(
    "Travestimento",
    (s) => {
      s.ext.knowledge = { ...(s.ext.knowledge ?? {}) };
      s.ext.knowledge.identities = { livia: { trueName: "Livia", alias: "Viandante" } };
      s.actors.livia.name = "Viandante";
    },
    "dm",
  );
  const state = store.state;
  const other = viewsOf(state, "spectator", roll);
  assert.equal(other.length, 1);
  assert.doesNotMatch(JSON.stringify(other), /Livia/);
  assert.doesNotMatch(JSON.stringify(describeRoll(state, roll, "spectator")), /Livia/);
  assert.match(JSON.stringify(describeRoll(state, roll, "spectator")), /Viandante/);
  assert.match(JSON.stringify(describeRoll(state, roll, "dm")), /Livia/);
  // A DM creature's attack stays out of the players' Registro and dice altogether.
  const dmRoll = table((s) => {
    s.combat.turn = 1;
    s.actors["goblin-1"].combatProfile = {
      ...(s.actors["goblin-1"].combatProfile ?? {}),
      team: "watch",
      meleeAttack: srdMeleeProfile(getEntry("srd2024:creature:goblin-warrior")),
    };
  });
  dmRoll.commit(
    "Attacco della Sentinella",
    (s) => {
      const attempt = beginAttempt(
        s,
        {
          id: "g-1",
          actorId: "goblin-1",
          actionId: "melee-attack",
          selection: { targetIds: ["livia"] },
          mode: "physical",
        },
        "dm",
      );
      resolveRoll(s, attempt.id, attempt.requests[0].id, [12], "dm");
    },
    "dm",
  );
  const goblin = dmRoll.state.log.flatMap((e) => e.rolls ?? []).find((r) => r.attemptId === "g-1");
  assert.equal(viewsOf(dmRoll.state, "player", goblin).length, 0);
  assert.equal(describeRoll(dmRoll.state, goblin, "player"), null);
});
