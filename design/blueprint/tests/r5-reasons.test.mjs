// R5 SV-37 (Roll20's errors that name cause and fix): every disabled control in the R5 files
// that can be rendered here is described (aria-describedby) by a visible sentence saying why
// and what to do. Synthetic sample data only.
import test from "node:test";
import assert from "node:assert/strict";
import * as D from "../combat-tracker-domain.mjs";
import * as UI from "../combat-tracker.mjs";
import * as EB from "../encounter-builder.mjs";
import { register as registerCompendium } from "../compendium.mjs";
import { register as registerSceneAssets } from "../scene-assets.mjs";
import { renderPanel } from "../scene-assets-table.mjs";
import { renderSheet, seedPrep } from "../session-prep.mjs";
import { harness, cmd } from "./p5-harness.mjs";

// Each described control points at an element with that id and some text.
function assertDescribed(html, selectorPattern, label) {
  const tags = [...html.matchAll(new RegExp(`<[^>]*${selectorPattern}[^>]*>`, "g"))].map(
    (m) => m[0],
  );
  assert.ok(tags.length, `${label}: control rendered`);
  for (const tag of tags) {
    if (!/\sdisabled|aria-disabled="true"/.test(tag)) continue;
    const id = /aria-describedby="([^"]+)"/.exec(tag)?.[1];
    assert.ok(id, `${label}: disabled without aria-describedby: ${tag.slice(0, 120)}`);
    const note = new RegExp(`id="${id}"[^>]*>([^<]{8,})`).exec(html);
    assert.ok(note, `${label}: no sentence for ${id}`);
  }
}

test("SV-37 tracker: a row left out of the start and the waiting lane say why", () => {
  const h = harness();
  cmd(h, "prepare", (s) => {
    s.scenes[0].encounter = {
      name: "Prova",
      participants: [{ actorId: "livia", natural: null, bonus: 2, mode: "physical" }],
    };
  });
  UI.openTableInitiative(h.ctx, "old-watch");
  const body = h.dialogs.at(-1).body;
  assertDescribed(body, "data-ct-start-natural=", "start d20");
  assertDescribed(body, "data-ct-start-roll-one=", "start roll");
  assert.match(body, /Non partecipa: spunta il nome per includerla e tirare\./);
  // Waiting lane: nothing rolled yet, then a rolled row's advantage buttons.
  const rows = D.startCandidates(h.ctx.state, "old-watch").map((r) => ({
    ...r,
    included: r.actorId !== "mira",
    natural: r.actorId === "mira" ? null : 12,
  }));
  cmd(h, "start", (s) => D.startFromTable(s, "old-watch", rows, "dm"));
  cmd(h, "wait", (s, sl) => D.addPending(s, sl, ["mira"], "dm"));
  let html = UI.renderTracker(h.ctx, {});
  assertDescribed(html, "data-ct-pending-add", "add to combat");
  cmd(h, "roll", (s, sl) => D.rollPending(s, sl, "mira", { mode: "physical", natural: 9 }, "dm"));
  html = UI.renderTracker(h.ctx, {});
  assertDescribed(html, 'data-ct-pending-adv="mira"', "advantage after the roll");
});

test("SV-37 builder: the pasted-line confirm and a held hand-off name their reason", () => {
  const h = harness();
  h.registry.use("compendium", registerCompendium);
  h.registry.use("encounter-builder", EB.register);
  h.registry.initState(h.ctx.state);
  const panel = h.registry.get("table-panel", "encounter-builder-npc", h.ctx, {
    selectedActorId: "goblin-1",
  });
  const html = panel.render(h.ctx, { selectedActorId: "goblin-1" });
  assertDescribed(html, "data-eb-npc-confirm=", "paste confirm");
  const scene = EB.renderSceneEncounter(h.ctx, "old-watch", { blocked: "x" });
  assert.match(scene, /Nuovo incontro per questa scena/);
});

test("SV-37 scenes at the Table: floor steps and empty views say why", () => {
  const h = harness();
  h.registry.use("scene-assets", registerSceneAssets);
  h.registry.initState(h.ctx.state);
  const scene = h.ctx.state.scenes.find((s) => s.id === "old-watch");
  const html = renderPanel(h.ctx, { scene });
  assertDescribed(html, "data-sa-view-load=", "empty view slot");
  if (/data-sa-step=/.test(html)) assertDescribed(html, "data-sa-step=", "floor step");
});

test("SV-37 session sheet: a closed sheet's controls point at the read-only sentence", () => {
  const h = harness();
  const sheet = seedPrep().sheets.find((s) => s.status === "closed");
  const html = renderSheet(h.ctx, sheet, { readOnly: true });
  assertDescribed(html, "data-hs-prep-secret=", "closed sheet secret");
  assert.match(html, /Scheda di una sessione chiusa/);
});
