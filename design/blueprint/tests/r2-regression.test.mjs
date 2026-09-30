// Round-2 regression (29/09/2026): defects the full browser regression found after the audit
// hand-offs. Synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";

// Review P2-6 of B34 (D&D Beyond's dice setting, Foundry's manual dice configuration): the
// remembered «Dadi per i tiri sul posto» choice applies to rolls in place on the sheet too.
// Since P3 PG-23 the sheet's numbers roll through the sheet's own roll window, which always
// opened on «Digitali», so a player who rolls physical dice had to switch on every roll.
test("the sheet's roll window opens on the remembered dice choice for rolls in place", async () => {
  const { harness } = await import("./p4-harness.mjs");
  const tray = await import("../dice-tray.mjs");
  const sheetPlus = await import("../sheet-plus.mjs");
  const h = harness({
    role: "player",
    areas: [
      ["dice-tray", tray.register],
      ["sheet-plus", sheetPlus.register],
    ],
    view: { page: "characters", id: "livia", tab: "" },
  });
  sheetPlus._test.setConnectedDice(null);
  const modes = (body) =>
    [...body.matchAll(/name="mode" value="(\w+)"( checked)?/g)].map(
      (m) => m[1] + (m[2] ? "*" : ""),
    );
  // Default: digital dice, the face fields hidden.
  sheetPlus._test.rollDialog(h.ctx, "livia", "save", "wis");
  let body = h.dialogs.at(-1).body;
  assert.deepEqual(modes(body), ["digital*", "physical"]);
  assert.match(body, /data-shp-faces hidden/);
  // Remembered «Fisici: chiedi le facce»: the window opens on physical dice with the faces.
  h.registry.setSetting(h.ctx, "dice-tray.dice", "physical");
  sheetPlus._test.rollDialog(h.ctx, "livia", "save", "wis");
  body = h.dialogs.at(-1).body;
  assert.deepEqual(modes(body), ["digital", "physical*"]);
  assert.doesNotMatch(body, /data-shp-faces hidden/);
  await h.submit({ rollMode: "normal", mode: "physical", face0: "9" });
  assert.deepEqual(h.errors(), []);
  const roll = h.store.state.ext["sheet-plus-rolls"].rolls.at(-1);
  assert.deepEqual([roll.mode, roll.values, roll.natural], ["physical", [9], 9]);
  // The player can still choose digital dice for this one roll.
  sheetPlus._test.rollDialog(h.ctx, "livia", "save", "wis");
  await h.submit({ rollMode: "normal", mode: "digital" });
  assert.equal(h.store.state.ext["sheet-plus-rolls"].rolls.at(-1).mode, "digital");
  sheetPlus._test.setConnectedDice(undefined);
});

// TV-83 (BG3 reroll with Heroic Inspiration): the log records the first roll and the reroll
// as two accepted rolls. A reroll that lands on the same face is still a new roll: the
// history kept only one when the faces matched (1 in 20 digital rerolls; found by
// r1-attack-journey in the final run of this regression).
test("a Heroic Inspiration reroll that lands on the same face is still logged as the second roll", async () => {
  const { createInitialState, createStore } = await import("../state.mjs");
  const combat = await import("../combat.mjs");
  const SP = await import("../sheet-plus-domain.mjs");
  const TD = await import("../dice-tray-domain.mjs");
  const CS = await import("../campaign-settings-domain.mjs");
  const { getEntry, srdMeleeProfile } = await import("../srd-compendium.mjs");
  await combat.neighboursReady;
  const store = createStore({ storage: null });
  store.commit(
    "Fixture",
    (s) => {
      const f = createInitialState();
      f.ext ??= {};
      f.ext[SP.ID] = SP.seedSlice(f);
      f.ext[TD.ID] = TD.seedSlice();
      f.ext[CS.ID] = CS.seedSlice();
      f.combat.active = true;
      f.combat.order = ["livia", "goblin-1", "doran", "goblin-2"];
      f.combat.turn = 0;
      const place = (id, x, y) =>
        Object.assign(
          f.scenes[0].tokens.find((t) => t.actorId === id),
          { x, y },
        );
      place("livia", 100, 100);
      place("goblin-1", 150, 100);
      place("doran", 300, 300);
      place("goblin-2", 400, 400);
      for (const actor of Object.values(f.actors))
        Object.assign(actor, { hp: 40, maxHp: 40, ac: 12 });
      f.actors["goblin-1"].combatProfile = {
        ...(f.actors["goblin-1"].combatProfile ?? {}),
        team: "watch",
        meleeAttack: srdMeleeProfile(getEntry("srd2024:creature:goblin-warrior")),
      };
      f.ext[TD.ID].inspiration.livia = { active: true, at: "2026-09-27T10:00:00Z", by: "dm" };
      Object.assign(s, f);
    },
    "dm",
  );
  const attackOf = (attempt) => attempt.requests.find((r) => r.kind === "attack");
  store.commit(
    "Attempt",
    (s) =>
      combat.beginAttempt(
        s,
        {
          id: "a-1",
          actorId: "livia",
          actionId: "quarterstaff",
          selection: { targetIds: ["goblin-1"] },
          mode: "physical",
        },
        "player",
      ),
    "player",
  );
  const id = store.state.combatAttempts[0].id;
  const attackId = attackOf(store.state.combatAttempts[0]).id;
  store.commit("Roll", (s) => combat.resolveRoll(s, id, attackId, [4], "player"), "player");
  assert.equal(attackOf(store.state.combatAttempts[0]).hold, "inspiration");
  store.commit(
    "Reroll",
    (s) => combat.useHeroicInspiration(s, id, attackId, "player", { face: 4 }),
    "player",
  );
  const attack = attackOf(store.state.combatAttempts[0]);
  assert.deepEqual([attack.inspirationReroll.from, attack.inspirationReroll.to], [4, 4]);
  assert.equal(store.state.ext[TD.ID].inspiration.livia.active, false, "inspiration spent");
  const faces = store.state.log
    .flatMap((entry) => entry.rolls ?? [])
    .filter((roll) => roll.requestId === attackId)
    .map((roll) => roll.values);
  assert.deepEqual(faces, [[4], [4]], "both rolls are in the log");
});
