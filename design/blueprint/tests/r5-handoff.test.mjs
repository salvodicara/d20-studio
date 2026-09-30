// R5 CA-57 part (C3, Owlbear's GM hand-off): the member the DM handed the session to runs
// Preparation, the start of combat, the order and its corrections, and the encounter builder;
// a player who does not run the session is refused. Synthetic sample data only.
import test from "node:test";
import assert from "node:assert/strict";
import * as D from "../combat-tracker-domain.mjs";
import * as UI from "../combat-tracker.mjs";
import * as ED from "../encounter-builder-domain.mjs";
import * as EB from "../encounter-builder.mjs";
import { register as registerCompendium } from "../compendium.mjs";
import {
  activateScene,
  saveSceneDraft,
  setSceneSharing,
  getPreparedEncounter,
} from "../preparation.mjs";
import { harness, cmd } from "./p5-harness.mjs";

const SCENE = "old-watch";
// The hand-off record the campaign members area writes (session-view.sessionRunner reads it),
// with the campaign's creatures entrusted to the recipient as campaign-members.startHandover
// does (controllers).
const handOver = (h, to) =>
  cmd(h, "handover", (s) => {
    for (const actor of Object.values(s.actors))
      if (actor.kind === "npc") actor.controllers = [...(actor.controllers ?? []), to];
    s.ext["campaign-members"] ??= { campaigns: {} };
    s.ext["campaign-members"].campaigns ??= {};
    s.ext["campaign-members"].campaigns[s.campaign.id] = {
      ...(s.ext["campaign-members"].campaigns[s.campaign.id] ?? {}),
      handover: { id: "h1", from: "dm", to, startedAt: "2026-09-27T10:00:00.000Z", npc: {} },
    };
  });
const startRows = (h) =>
  D.startCandidates(h.ctx.state, SCENE).map((r, i) => ({ ...r, included: true, natural: 10 + i }));

test("CA-57: the session runner activates the scene, edits Preparation and starts combat", () => {
  const h = harness();
  handOver(h, "player");
  h.ctx.role = "player";
  cmd(h, "share", (s) => setSceneSharing(s, SCENE, true, "player"));
  cmd(h, "activate", (s) => activateScene(s, SCENE, "player"));
  const scene = structuredClone(h.ctx.state.scenes.find((s) => s.id === SCENE));
  cmd(h, "save", (s) =>
    saveSceneDraft(s, { ...scene, name: "Cortile (preparato dal giocatore)" }, "player", scene),
  );
  assert.equal(
    h.ctx.state.scenes.find((s) => s.id === SCENE).name,
    "Cortile (preparato dal giocatore)",
  );
  cmd(h, "call", (s) => D.openRollCall(s, SCENE, startRows(h), "player"));
  const rows = startRows(h);
  cmd(h, "start", (s) => D.startFromTable(s, SCENE, rows, "player"));
  assert.equal(h.ctx.state.combat.active, true);
  assert.ok(getPreparedEncounter(h.ctx.state, SCENE, "player").ready);
  const goblin = h.ctx.state.combat.order.find((id) => id.startsWith("goblin"));
  cmd(h, "fix", (s, sl) =>
    D.correctInitiative(s, sl, goblin, { natural: 20, bonus: 0, reason: "dado caduto" }, "player"),
  );
  assert.equal(D.initiativeOf(h.ctx.state, goblin), 20);
  // The runner sees the tracker's DM controls.
  const html = UI.renderTracker(h.ctx, {});
  assert.match(html, /data-ct-finish/);
});

test("CA-57: a player who does not run the session is refused everywhere", () => {
  const h = harness();
  handOver(h, "someone-else");
  h.ctx.role = "player";
  assert.throws(() => cmd(h, "activate", (s) => activateScene(s, SCENE, "player")), /unauthorized/);
  const scene = structuredClone(h.ctx.state.scenes.find((s) => s.id === SCENE));
  assert.throws(
    () => cmd(h, "save", (s) => saveSceneDraft(s, { ...scene, name: "x" }, "player", scene)),
    /unauthorized/,
  );
  assert.throws(
    () => cmd(h, "call", (s) => D.openRollCall(s, SCENE, startRows(h), "player")),
    (e) => e.code === "dm",
  );
  assert.throws(
    () => cmd(h, "start", (s) => D.startFromTable(s, SCENE, startRows(h), "player")),
    (e) => e.code === "dm",
  );
  assert.doesNotMatch(UI.renderTracker(h.ctx, {}), /data-ct-start\b/);
});

test("CA-57: the encounter builder's scene commands follow the runner; identity data does not", () => {
  const h = harness();
  h.registry.use("compendium", registerCompendium);
  h.registry.use("encounter-builder", EB.register);
  h.registry.initState(h.ctx.state);
  assert.ok(h.ctx.state.ext["encounter-builder"]);
  handOver(h, "player");
  h.ctx.role = "player";
  // The builder's section and command are the runner's too.
  assert.ok(h.registry.get("preparation-section", "encounter-builder", h.ctx));
  assert.ok(EB.sceneEncounterReady(h.ctx));
  cmd(h, "tokens", (s) =>
    ED.encounterFromTokens(s, s.ext["encounter-builder"], SCENE, "player", "it"),
  );
  handOver(h, "someone-else");
  assert.equal(h.registry.get("preparation-section", "encounter-builder", h.ctx), null);
  assert.throws(
    () =>
      cmd(h, "tokens", (s) =>
        ED.encounterFromTokens(s, s.ext["encounter-builder"], SCENE, "player", "it"),
      ),
    /Only the DM prepares encounters/,
  );
});

test("CA-57: runner rights never open another identity's private sheet", () => {
  const h = harness();
  cmd(h, "private", (s) => {
    s.actors["dm-secret"] = {
      ...structuredClone(s.actors["goblin-1"]),
      id: "dm-secret",
      name: "Segreto del DM",
      kind: "character",
      owner: "dm",
      visibility: "private",
    };
  });
  handOver(h, "player");
  assert.equal(D.viewerSees(h.ctx.state, "dm-secret", "player"), false);
  assert.equal(D.viewerSees(h.ctx.state, "goblin-1", "player"), true);
});
