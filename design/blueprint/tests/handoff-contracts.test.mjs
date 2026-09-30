// Hand-offs of audit round 2 — the joint checks of the contracts once both sides are in the
// tree: C1 (R7's «CD dei tiri» switch read by R1's cards and R2's Registro), C2 (R7's
// «I giocatori possono raggruppare le proprie pedine» read by R3's token menu) and C4 (R7's
// legacy switch read by R6's «Gestisci magie»). Real switches, no test seams. Synthetic data.
import test, { before } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { neighboursReady, enqueueRollRequest, resolveRoll, projectAttempts } from "../combat.mjs";
import * as CS from "../campaign-settings-domain.mjs";
import { projectLog, playerDisclosure, disclosureReady } from "../chat-domain.mjs";
import { playersMayGroup } from "../token-menu.mjs";
import * as L from "../character-library.mjs";
import * as IP from "../inventory-plus.mjs";
import * as SP from "../spells-plus.mjs";
import { harness } from "./p4-harness.mjs";

before(async () => {
  await neighboursReady;
  await disclosureReady;
});
const CID = "lanterns";
function withSettings() {
  const store = createStore({ storage: null });
  store.commit(
    "settings",
    (s) => {
      s.ext ??= {};
      s.ext[CS.ID] = CS.seedSlice();
    },
    "dm",
  );
  return store;
}

test("C1 joint: «CD dei tiri: Nascoste» hides a requested save's DC from the player in the card and the Registro", () => {
  const store = withSettings();
  store.commit(
    "CD nascoste",
    (s) => CS.setDisclosure(s, s.ext[CS.ID], CID, "dc", "hidden", "dm"),
    "dm",
  );
  assert.equal(playerDisclosure(store.state).dc, "hidden");
  let attemptId;
  store.commit(
    "Richiesta",
    (s) => {
      attemptId = enqueueRollRequest(
        s,
        {
          id: "req-dc",
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
  store.commit("TS", (s) => resolveRoll(s, attemptId, request.id, [15], "player"), "player");
  const card = (role) =>
    projectAttempts(store.state, role).find((a) => a.id === attemptId).requests[0];
  assert.equal(card("player").dc, undefined);
  assert.equal(card("player").dcHidden, true);
  assert.equal(card("dm").dc, 13);
  const logged = (role) =>
    projectLog(store.state, role)
      .filter((item) => item.type === "rolls")
      .flatMap((item) => item.rolls)
      .find((roll) => roll.attemptId === attemptId);
  assert.equal(logged("player").dc, null);
  assert.equal(logged("player").dcHidden, true);
  assert.equal(logged("dm").dc, 13);
});

test("C2 joint: the players' grouping permission reaches the token menu", () => {
  const store = withSettings();
  assert.equal(playersMayGroup(store.state), false, "off by default");
  store.commit(
    "Raggruppare",
    (s) => CS.setPermission(s, s.ext[CS.ID], CID, "playerGroup", true, "dm"),
    "dm",
  );
  assert.equal(playersMayGroup(store.state), true);
});

test("C4 joint: the legacy switch puts «Legacy 2014» beside «Dardo di fuoco» in «Gestisci magie»", () => {
  const h = harness({
    role: "player",
    areas: [
      ["character-library", L.register],
      ["inventory-plus", IP.register],
      ["spells-plus", SP.register],
    ],
    view: { page: "characters", id: "livia", tab: "spells" },
  });
  h.ctx.commit("settings", (s) => (s.ext[CS.ID] = CS.seedSlice()));
  SP.spellsPanel(h.ctx, "livia").manage = true;
  SP.spellsPanel(h.ctx, "livia").tab = "class";
  SP.spellsPanel(h.ctx, "livia").mSources = ["srd", "homebrew", "legacy"];
  assert.doesNotMatch(SP.renderClassList(h.ctx, "livia"), /data-spl-legacy-row/);
  h.ctx.role = "dm";
  h.ctx.commit("legacy", (s) => CS.setLegacySources(s, s.ext[CS.ID], CID, true, "dm"));
  h.ctx.role = "player";
  const page = SP.renderClassList(h.ctx, "livia");
  const at2024 = page.indexOf('data-spl-class-row="fire-bolt"');
  const at2014 = page.indexOf('data-spl-legacy-row="fire-bolt"');
  assert.ok(at2024 >= 0 && at2014 > at2024, "the 2014 row follows its 2024 row");
});

test("C3 joint (CA-57): the member the DM hands the session to runs it; taking it back ends every power at once", async () => {
  const { createInitialState } = await import("../state.mjs");
  const { createRegistry } = await import("../registry.mjs");
  const cm = await import("../campaign-members.mjs");
  const SV = await import("../session-view.mjs");
  const prep = await import("../preparation.mjs");
  const CT = await import("../combat-tracker-domain.mjs");
  const { sessionAuthority } = await import("../combat.mjs");
  const values = new Map();
  const memory = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const state = createInitialState();
  const reg = createRegistry({ logger: null, document: null, deviceStorage: memory });
  reg.use("campaign-members", cm.register);
  reg.use("session-view", SV.register);
  reg.initState(state);
  const at = Date.parse("2026-09-24T19:00:00Z");
  assert.throws(() => SV.switchScene(state, "player", "road-ambush", at), /Only the DM/);
  cm.startHandover(state, "lanterns", "player", "dm", at);
  assert.equal(SV.sessionRunner(state), "player");
  assert.equal(sessionAuthority(state, "player"), true, "the Table reads the runner's powers");
  // Scenes: the Session panel's switch and Preparation's activation, both.
  SV.switchScene(state, "player", "road-ambush", at);
  assert.equal(state.activeSceneId, "road-ambush");
  prep.activateScene(state, "old-watch", "player");
  prep.setSceneSharing(state, "road-ambush", true, "player");
  // Split party: the runner moves characters between scenes and regroups them.
  SV.moveToScene(state, "player", ["doran"], "road-ambush");
  SV.regroup(state, "player");
  // Combat: the runner starts it from the Table and it runs.
  const rows = CT.startCandidates(state, "old-watch").map((row) => ({
    ...row,
    included: true,
    natural: row.natural ?? 10,
  }));
  CT.startFromTable(state, "old-watch", rows, "player");
  assert.equal(state.combat.active, true);
  // The evening: started and ended by the runner (its story stays the DM's to write).
  SV.startSession(state, "player", at);
  const ended = SV.endSession(state, "player", at + 3600e3);
  assert.ok(ended);
  // Taking the role back: every session power leaves the player at once.
  cm.endHandover(state, "lanterns", "dm", at + 3600e3);
  assert.equal(sessionAuthority(state, "player"), false);
  assert.throws(() => prep.activateScene(state, "road-ambush", "player"), /unauthorized/);
  assert.throws(() => SV.switchScene(state, "player", "road-ambush", at), /Only the DM/);
});
