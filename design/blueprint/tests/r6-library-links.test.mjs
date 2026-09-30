// R6 H-06 (Foundry `/award`, C12) and CA-88 part (C5, Roll20 Transmogrifier): the @Embed
// reward card opens the party award prefilled, and a Library homebrew entry enabled in the
// campaign offers «Copia in un’altra campagna…» through campaign-data's one entry.
// Synthetic demo data only.
import test from "node:test";
import assert from "node:assert/strict";
import * as compendium from "../compendium.mjs";
import * as loot from "../loot.mjs";
import * as hb from "../homebrew.mjs";
import { renderLibrary, copyToCampaign, resetLibraryView } from "../library.mjs";
import { xpView } from "../sheet-plus-domain.mjs";
import { harness } from "./p4-harness.mjs";

test("H-06: «Assegna al gruppo» opens the award prefilled with the reward's XP", async () => {
  const h = harness({
    role: "dm",
    areas: [
      ["compendium", compendium.register],
      ["loot", loot.register],
    ],
    view: { page: "campaign", tab: "journal" },
  });
  const prefill = await compendium.awardReward(h.ctx, "reward:xp:100");
  assert.deepEqual(prefill.coins, {});
  const dialog = h.dialogs.at(-1);
  assert.equal(dialog.title, "Assegna PE e monete al gruppo");
  assert.match(dialog.body, /name="xp"[^>]*value="100"/);
  assert.match(dialog.body, /value="Ricompensa: 100 PE"/);
  // Submitting reaches the sheets through the award itself (not a log line only).
  const recipients = [...dialog.body.matchAll(/name="recipient" value="([^"]+)"/g)].map(
    (m) => m[1],
  );
  assert.ok(recipients.length > 0, "the party is listed");
  const data = new FormData();
  data.append("xp", "100");
  data.append("mode", "each");
  for (const id of recipients) data.append("recipient", id);
  const xpBefore = xpView(h.store.state, recipients[0]).xp;
  dialog.options.onSubmit(data);
  assert.equal(xpView(h.store.state, recipients[0]).xp, xpBefore + 100);
  // Coins: the prefill carries them for the award's fields.
  assert.deepEqual(compendium.rewardPrefill(h.ctx, "reward:gp:50").coins, { gp: 50 });
  assert.equal(compendium.rewardPrefill(h.ctx, "reward:gp:50").xp, 0);
  // A player never awards.
  h.ctx.role = "player";
  assert.equal(await compendium.awardReward(h.ctx, "reward:xp:100"), null);
});

test("H-06: without the loot area the reward is recorded in the log, as before", async () => {
  const h = harness({ role: "dm", areas: [["compendium", compendium.register]] });
  const before = h.store.state.log.length;
  assert.equal(await compendium.awardReward(h.ctx, "reward:xp:100"), null);
  assert.equal(h.store.state.log.length, before + 1);
  assert.match(h.store.state.log.at(-1).label, /Ricompensa al gruppo: 100 PE/);
});

test("CA-88 (C5): an enabled homebrew entry offers «Copia in un’altra campagna…» to the DM", async () => {
  resetLibraryView();
  const h = harness({ role: "dm", areas: [["compendium", compendium.register]] });
  const d = hb.createHomebrewDraft(h.store.state, { id: "d1", type: "feat" }, "dm");
  hb.saveHomebrewDraft(
    h.store.state,
    "d1",
    {
      expectedRevision: d.revision,
      data: {
        ...d.data,
        name: { it: "Occhio di falco", en: "Hawk eye" },
        source: { ...d.data.source, label: "Original synthetic homebrew" },
      },
    },
    "dm",
  );
  const p = hb.previewHomebrewDraft(h.store.state, "d1", "dm");
  const { ref } = hb.applyHomebrewDraft(h.store.state, "d1", { reviewKey: p.reviewKey }, "dm");
  const copyCommand = { id: "campaign-data.copy-to" };
  const registry = h.ctx.registry;
  const ctx = Object.create(h.ctx, {
    registry: {
      value: {
        ...registry,
        get: (point, id, c) =>
          point === "command" && id === copyCommand.id ? copyCommand : registry.get(point, id, c),
        list: (...args) => registry.list(...args),
        slot: (...args) => registry.slot(...args),
      },
    },
  });
  ctx.view = { page: "library", id: ref.contentId, revision: ref.revisionId, tab: "personal" };
  // Not enabled in the campaign yet: nothing to copy.
  assert.doesNotMatch(renderLibrary(ctx), /data-library-copy-to/);
  hb.enableHomebrewRevision(h.store.state, ref, { enabled: true }, "dm");
  assert.match(renderLibrary(ctx), /data-library-copy-to>Copia in un’altra campagna…/);
  // Without the campaign-data command (a player, or no such area) the button is absent.
  ctx.registry.get = (point, id, c) => registry.get(point, id, c);
  assert.doesNotMatch(renderLibrary(ctx), /data-library-copy-to/);
  // The one entry: campaign-data's openCopyTo with "homebrew:<id>".
  const navigated = [];
  const target = { ...h.ctx, navigate: (page, params) => navigated.push({ page, params }) };
  await copyToCampaign(target, ref);
  assert.deepEqual(navigated.at(-1), { page: "campaign", params: { tab: "campaign-data" } });
});
