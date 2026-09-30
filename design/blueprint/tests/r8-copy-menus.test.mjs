// R8 CA-88 (part): «Copia in un’altra campagna…» in the item's own menus — handouts, World
// and Journal entries, random tables and card decks — opens campaign-data's one copy entry
// with the item picked (contract C5, `openCopyTo(ctx, "<kind>:<id>")`; Roll20
// Transmogrifier). Offered only to whoever may run the copy (the campaign's manager); works
// with no other campaign (C5 explains and offers «Crea una campagna»). Every area loaded.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import * as content from "../campaign-content.mjs";
import { copyableItems } from "../campaign-data-domain.mjs";
import { renderCampaign, resetCampaignView } from "../campaign.mjs";
import { canCopyToCampaign, copyToCampaign } from "../ui.mjs";
import { app } from "./r8-harness.mjs";

afterEach(() => resetCampaignView());

async function world(role = "dm") {
  const h = await app({ role: "dm", lang: "it" });
  let entryId;
  h.ctx.commit("voce", (draft) => {
    entryId = content.createCampaignEntryNow(
      draft,
      {
        kind: "world",
        worldType: "place",
        title: "Il ponte di Bruma",
        body: "Il ponte crolla alla prima piena.",
        access: { mode: "campaign", grants: [] },
      },
      "dm",
    ).entryId;
  });
  h.ctx.role = role;
  return { ...h, entryId };
}

test("an entry's «Altro» offers the copy to the DM who owns it; never to a player", async () => {
  const h = await world("dm");
  assert.equal(canCopyToCampaign(h.ctx), true);
  h.ctx.view = { page: "campaign", tab: "entry", id: h.entryId };
  const html = renderCampaign(h.ctx);
  assert.match(
    html,
    new RegExp(`data-campaign-copy-to="${h.entryId}">Copia in un’altra campagna…`),
  );
  // The picked item is one campaign-data can copy.
  assert.ok(
    copyableItems(h.ctx.state, "dm").some((row) => row.kind === "entry" && row.id === h.entryId),
  );
  h.ctx.role = "player";
  assert.equal(canCopyToCampaign(h.ctx), false);
  assert.doesNotMatch(renderCampaign(h.ctx), /data-campaign-copy-to/);
});

test("handouts, tables and decks carry the copy in their own actions", async () => {
  const h = await world("dm");
  h.ctx.view = { page: "preparation", tab: "handouts", id: "" };
  const handouts = h.registry.slot("preparation-section", "handouts", h.ctx);
  const material = h.ctx.state.ext.handouts.materials[0];
  assert.match(
    handouts,
    new RegExp(`data-hs-copy-to="${material.id}">Copia in un’altra campagna…`),
  );
  const table = h.ctx.state.ext["random-tables"].tables[0];
  h.ctx.view = { page: "preparation", tab: "random-tables", id: `table:${table.id}` };
  assert.match(
    h.registry.slot("preparation-section", "random-tables", h.ctx),
    new RegExp(`data-rt-copy-to="table:${table.id}">Copia in un’altra campagna…`),
  );
  const deck = h.ctx.state.ext["random-tables"].decks[0];
  h.ctx.view = { page: "preparation", tab: "random-tables", id: `deck:${deck.id}` };
  assert.match(
    h.registry.slot("preparation-section", "random-tables", h.ctx),
    new RegExp(`data-rt-copy-to="deck:${deck.id}">`),
  );
  // Every pick names an item campaign-data lists for this DM.
  const rows = copyableItems(h.ctx.state, "dm");
  for (const [kind, id] of [
    ["handout", material.id],
    ["table", table.id],
    ["deck", deck.id],
  ])
    assert.ok(
      rows.some((row) => row.kind === kind && row.id === id),
      `${kind}:${id}`,
    );
});

test("the copy opens campaign-data with the item picked, also with no other campaign (C5)", async () => {
  const h = await world("dm");
  await copyToCampaign(h.ctx, `entry:${h.entryId}`);
  assert.deepEqual(h.log.navigations.at(-1), {
    page: "campaign",
    params: { tab: "campaign-data" },
  });
  const html = h.registry.slot("campaign-section", "campaign-data", h.ctx);
  // With another campaign the item is preselected; with none, C5 explains and offers one.
  const other = /data-cd-form="scene-copy"/.test(html);
  if (other) assert.match(html, new RegExp(`value="entry:${h.entryId}" selected`));
  else assert.match(h.log.dialogs.at(-1).body, /Il ponte di Bruma/);
  // A failing load is said plainly, never silent.
  await copyToCampaign(h.ctx, "entry:x", () => Promise.reject(new Error("offline")));
  assert.match(h.log.toasts.at(-1).text, /copia tra campagne non è disponibile/);
});
