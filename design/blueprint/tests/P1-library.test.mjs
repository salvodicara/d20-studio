// P1 character library: link, copy and transfer to any campaign (PG-85, PG-89), copy with
// target rules (PG-88), one «Condividi» (PG-93), whose sheet and who may edit it (PG-94).
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import * as members from "../campaign-members.mjs";
import * as L from "../character-library.mjs";
import { legacyRecord, claimPremade } from "../builder-plus-domain.mjs";
import { sheetEditStatus, dmMayEditSheet } from "../character-access.mjs";

const NOW = Date.parse("2026-09-26T10:00:00Z");
function seeded() {
  const registry = createRegistry({ logger: null, document: null });
  registry.use("campaign-members", members.register);
  registry.use("character-library", L.register);
  const state = createInitialState();
  registry.initState(state);
  return { state, registry };
}

test("PG-85: link and copy offer every campaign of the identity, the one in play first", () => {
  const { state } = seeded();
  const crypt = members.createCampaign(state, { name: "Cripta di prova" }, "player", NOW);
  const targets = L.linkTargets(state, "iria", "player");
  assert.deepEqual(
    targets.map((row) => row.name),
    ["Le lanterne di Bruma", "Cripta di prova"],
  );
  assert.equal(targets[0].current, true);
  // Linking to the other campaign leaves the one in play alone.
  L.linkToCampaign(state, "iria", "player", NOW, { campaignId: crypt });
  assert.deepEqual(state.actors.iria.campaignIds, [crypt]);
  assert.equal(state.actors.iria.visibility, "shared");
  assert.deepEqual(
    L.linkTargets(state, "iria", "player").map((row) => row.id),
    ["lanterns"],
  );
  // A copy can go to any campaign of mine.
  const copyId = L.bringCopyToCampaign(state, "iria", "player", { campaignId: crypt, now: NOW });
  assert.deepEqual(state.actors[copyId].campaignIds, [crypt]);
  assert.equal(state.actors[copyId].copiedFrom.snapshotFor, crypt);
  assert.throws(
    () => L.linkToCampaign(state, "iria", "player", NOW, { campaignId: "nowhere" }),
    /campagna|campaign/,
  );
});

test("PG-89: a transfer to a campaign I run happens at once; pending ones stay answerable", () => {
  const { state } = seeded();
  const crypt = members.createCampaign(state, { name: "Cripta di prova" }, "player", NOW);
  assert.ok(L.transferTargets(state, "livia", "player").some((row) => row.id === crypt));
  const id = L.requestTransfer(state, "livia", crypt, "player", NOW);
  const row = L.sliceOf(state).transfers.find((entry) => entry.id === id);
  assert.equal(row.status, "accepted");
  assert.deepEqual(state.actors.livia.campaignIds, [crypt]);
  // A request left pending to a campaign the requester runs is listed for them to answer.
  L.sliceOf(state).transfers.push({ ...row, id: "legacy-pending", status: "pending" });
  assert.ok(L.incomingTransfers(state, "player").some((entry) => entry.id === "legacy-pending"));
});

test("PG-88: the copy's target rules drop 2014 options for 2024 and list what changes", () => {
  const { state } = seeded();
  const id = claimPremade(state, "brann", "player", {
    operationId: "op-brann",
    allowIncomplete: true,
  });
  const actor = state.actors[id];
  assert.ok(actor.characterBuild?.data, "a built character");
  const legacy = legacyRecord("legacy-2014:grappler", NOW);
  actor.characterBuild.data.features.custom = [
    ...(actor.characterBuild.data.features.custom ?? []),
    legacy,
  ];
  actor.features = [...(actor.features ?? []), { ...legacy, buildManaged: true }];
  const strict = L.copyRulesPreview(state, id, "player", "2024", NOW);
  assert.equal(strict.checked, true);
  assert.deepEqual(strict.removed, [legacy.name]);
  const kept = L.copyRulesPreview(state, id, "player", "2024-legacy", NOW);
  assert.deepEqual(kept.removed, []);
  const copyId = L.copyCharacter(state, id, "player", { rules: "2024", now: NOW });
  const copy = state.actors[copyId];
  assert.equal(copy.copiedFrom.rules, "2024");
  assert.ok(!copy.features.some((row) => row.id === legacy.id));
  assert.equal(copy.characterBuild.data.sources.legacy2014, false);
  // The original is untouched.
  assert.ok(actor.features.some((row) => row.id === legacy.id));
  assert.throws(() => L.copyCharacter(state, id, "player", { rules: "1985" }), /regole|rules/);
});

test("PG-93: «Condividi» is a palette command with its synonyms and a sheet service", () => {
  const { registry, state } = seeded();
  const ctx = { role: "player", lang: "it", state, view: { page: "characters", id: "" } };
  const command = registry.list("command", ctx).find((row) => row.id === "character-library.share");
  assert.ok(command);
  for (const word of ["condividi", "QR", "link"])
    assert.match(JSON.stringify(command.description), new RegExp(word, "i"));
  assert.ok(registry.get("service", "character-library-share", ctx));
  assert.ok(registry.get("service", "character-library-add-own", ctx));
});

test("PG-94: whose sheet and whether the DM may change it from the sheet", () => {
  const { state } = seeded();
  const mira = state.actors.mira;
  assert.equal(dmMayEditSheet(state, mira), true);
  let status = sheetEditStatus(state, mira, "dm");
  assert.equal(status.player, true);
  assert.equal(status.own, false);
  assert.equal(status.canEdit, true);
  state.ext["campaign-settings"] ??= { campaigns: {} };
  state.ext["campaign-settings"].campaigns ??= {};
  state.ext["campaign-settings"].campaigns.lanterns = {
    ...(state.ext["campaign-settings"].campaigns.lanterns ?? {}),
    policy: { dmSheetEdit: { mira: false } },
  };
  status = sheetEditStatus(state, mira, "dm");
  assert.equal(status.dmAllowed, false);
  assert.equal(status.canEdit, false, "the DM proposes instead of writing");
  assert.equal(sheetEditStatus(state, mira, mira.owner).canEdit, true);
});
