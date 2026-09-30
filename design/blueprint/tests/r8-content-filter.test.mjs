// R8 H-05 (BG3 content toggles; the P10 CA-68 «Contenuto filtrato» contract): Journal and
// World entries and Archive pages render through the viewer's own content filter
// (safety-domain.filterFor): swear words masked, pictures blurred, a topic the DM marked on
// the entry veiled behind «Mostra» (filteredContentTopics(…, "entry", id)). The marking UI
// is R7's. Only the filtering viewer's screen changes. Every area loaded; synthetic data.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import * as content from "../campaign-content.mjs";
import * as S from "../safety-domain.mjs";
import * as jp from "../journal-plus.mjs";
import { renderCampaign, resetCampaignView } from "../campaign.mjs";
import { app } from "./r8-harness.mjs";

afterEach(() => {
  resetCampaignView();
  jp.resetContentFilter();
});

async function world({ lang = "it" } = {}) {
  const h = await app({ role: "dm", lang });
  const cid = h.ctx.state.campaign.id;
  const ids = {};
  h.ctx.commit("voci", (draft) => {
    ids.nest = content.createCampaignEntryNow(
      draft,
      {
        id: "entry-nest",
        kind: "world",
        worldType: "place",
        title: "Il nido sotto il ponte",
        body: "Ragni grandi come cani tessono tra le travi.",
        access: { mode: "campaign", grants: [] },
      },
      "dm",
    ).entryId;
    ids.oben = content.createCampaignEntryNow(
      draft,
      {
        id: "entry-oben",
        kind: "world",
        worldType: "person",
        title: "Mastro Oben",
        body: "Oben borbotta: merda, i ponti sono crollati.",
        access: { mode: "campaign", grants: [] },
      },
      "dm",
    ).entryId;
    // The DM marks the nest with a topic (R7's «Marca una voce», kind "entry").
    S.markContent(draft, draft.ext.safety, cid, "dm", "entry", ids.nest, [{ topic: "spiders" }]);
  });
  // The player filters spiders and swear words, on this identity only.
  h.ctx.role = "player";
  h.ctx.commit(
    "filtro",
    (draft) =>
      S.setContentFilter(draft.ext.safety, "player", {
        enabled: true,
        profanity: true,
        extra: ["spiders"],
      }),
    { local: true, visibility: "private", undoable: false },
  );
  return { ...h, ids };
}
const open = (h, id) => {
  h.ctx.view = { page: "campaign", tab: "entry", id };
  return renderCampaign(h.ctx);
};
// A root with the rendered «Mostra» buttons, clicked like the browser would.
function press(h, html) {
  const buttons = [...html.matchAll(/data-jp-filter-show="([^"]+)"/g)].map(([, key]) => ({
    dataset: { jpFilterShow: key.replace(/&amp;/g, "&") },
  }));
  let rendered = 0;
  h.ctx.render = () => rendered++;
  jp.bindContentFilter(
    { querySelectorAll: (sel) => (sel === "[data-jp-filter-show]" ? buttons : []) },
    h.ctx,
  );
  buttons[0].onclick({ preventDefault() {} });
  return rendered;
}

test("a World entry with a marked topic is veiled with «Mostra» for a player who filters it", async () => {
  const h = await world();
  const html = open(h, h.ids.nest);
  assert.match(html, /class="safety-content is-veiled"/);
  assert.match(html, /Sfumata dal tuo filtro<\/strong> · Ragni/);
  assert.match(html, /data-jp-filter-show="[^"]+">Mostra<\/button>/);
  assert.match(html, /class="safety-content-body" aria-hidden="true" inert>/);
  // The list excerpt does not give the content away either.
  h.ctx.view = { page: "campaign", tab: "world" };
  const list = renderCampaign(h.ctx);
  assert.match(list, /Sfumata dal tuo filtro · Ragni/);
  assert.doesNotMatch(list, /tessono tra le travi/);
  // «Mostra» reveals it for this visit, on this screen only.
  assert.equal(press(h, html), 1);
  const shown = open(h, h.ids.nest);
  assert.doesNotMatch(shown, /is-veiled/);
  assert.match(shown, /tessono tra le travi/);
  // The DM, without a filter, reads it as it is; the reveal key belongs to the player.
  h.ctx.role = "dm";
  assert.doesNotMatch(open(h, h.ids.nest), /is-veiled|Sfumata/);
  // Another visit (reload) veils it again.
  jp.resetContentFilter();
  h.ctx.role = "player";
  assert.match(open(h, h.ids.nest), /is-veiled/);
});

test("swear words are masked for the filtering viewer only, IT and EN", async () => {
  const h = await world({ lang: "en" });
  const html = open(h, h.ids.oben);
  assert.match(html, /borbotta: m•••• i ponti|borbotta: m••••, i ponti/);
  assert.doesNotMatch(html, /merda/);
  const veiled = open(h, h.ids.nest);
  assert.match(veiled, /Blurred by your filter<\/strong> · Spiders/);
  assert.match(veiled, />Show<\/button>/);
  h.ctx.role = "dm";
  assert.match(open(h, h.ids.oben), /merda/);
});

test("an Archive page goes through the same filter", async () => {
  const h = await world();
  const cid = h.ctx.state.campaign.id;
  h.ctx.role = "dm";
  h.ctx.commit("marca", (draft) =>
    S.markContent(draft, draft.ext.safety, cid, "dm", "entry", "page-oben", [{ topic: "spiders" }]),
  );
  h.ctx.role = "player";
  h.ctx.view = { page: "campaign", tab: "quests-archive", id: "p:page-oben" };
  const html = renderCampaign(h.ctx);
  assert.match(html, /data-jp-filter="player:page:page-oben/);
  assert.match(html, /Sfumata dal tuo filtro<\/strong> · Ragni/);
  // Without a mark the page is only masked, never veiled.
  const plain = jp.filterContent(h.ctx, "page", "page-other", "<p>Che merda di tempo</p>");
  assert.doesNotMatch(plain, /is-veiled/);
  assert.match(plain, /m••••/);
  // A viewer with the filter off sees the markup unchanged.
  h.ctx.role = "dm";
  assert.equal(jp.filterContent(h.ctx, "page", "page-oben", "<p>x</p>"), "<p>x</p>");
});
