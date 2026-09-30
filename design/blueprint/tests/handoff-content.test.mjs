// Hand-offs of audit round 2 — content (CA-88, H-05). C5 gains the Archive page kind: the
// DM copies a page to another campaign (Roll20 Transmogrifier), starting unseen there, and
// the page header offers «Copia in un’altra campagna…»; the safety panel's «Marca una voce»
// lists Archive pages too, so the veil R8 draws on pages can be set from the UI (BG3 content
// toggles). Synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import * as cm from "../campaign-members.mjs";
import * as D from "../campaign-data-domain.mjs";
import * as ui from "../campaign-data.mjs";
import * as JP from "../journal-plus.mjs";

const NOW = Date.parse("2026-09-26T10:00:00Z");
const SLICES = [{ name: JP.SLICE, version: JP.VERSION, normalize: JP.normalizeQuests }];
const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
  };
};
function seeded() {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  registry.use(cm.ID, cm.register);
  registry.use(ui.ID, ui.register);
  const state = createInitialState();
  registry.initState(state);
  state.ext[JP.SLICE] = JP.seedQuests();
  state.extVersions[JP.SLICE] = JP.VERSION;
  return { state, registry };
}

test("CA-88: an Archive page is a copyable item (C5 «page») and lands unseen in the other campaign", () => {
  const { state } = seeded();
  const other = cm.createCampaign(state, { name: "Rovine di Vetro" }, "dm", NOW);
  assert.ok(D.ITEM_KINDS.some((row) => row.kind === "page"));
  const pages = D.copyableItems(state, "dm").filter((row) => row.kind === "page");
  assert.ok(pages.some((row) => row.id === "page-tessa" && row.name === "Tessa Varro"));
  assert.equal(
    D.copyableItems(state, "player").filter((row) => row.kind === "page").length,
    0,
    "players do not copy the DM's archive",
  );
  // Tessa: nested under Casa Varro; one secret revealed to a chosen character.
  const tessa = state.ext[JP.SLICE].campaigns.lanterns.pages.find((p) => p.id === "page-tessa");
  tessa.access = { mode: "some", actorIds: ["livia"] };
  tessa.blocks.push({
    id: "b-secret",
    kind: "secret",
    text: "Debiti con la gilda",
    reveal: { mode: "all", actorIds: [] },
    revealedAt: "2026-09-20T10:00:00Z",
  });
  tessa.elements = [{ kind: "actor", id: "livia" }];
  let preview = D.previewItemCopy(
    state,
    { kind: "page", id: "page-tessa", targetId: other },
    "dm",
    { slices: SLICES },
  );
  assert.equal(preview.exists, false);
  const result = D.copyItemTo(
    state,
    { kind: "page", id: "page-tessa", targetId: other },
    "dm",
    NOW,
    { slices: SLICES },
  );
  const archive = state.ext[cm.ID].parked[other].ext[JP.SLICE].value.campaigns[other];
  const copy = archive.pages.find((p) => p.id === result.copyId);
  assert.ok(copy, "the page is in the other campaign's archive");
  assert.equal(copy.title, "Tessa Varro");
  assert.equal(copy.copiedFrom, "page-tessa");
  assert.equal(copy.parentId, null, "no link back to this campaign's pages");
  assert.deepEqual(copy.elements, []);
  assert.deepEqual(copy.access, { mode: "none", actorIds: [] }, "chosen characters stay here");
  assert.equal(copy.blocks.find((b) => b.kind === "secret").reveal.mode, "none", "starts unseen");
  // The source page is unchanged.
  assert.equal(tessa.parentId, "page-varro");
  preview = D.previewItemCopy(state, { kind: "page", id: "page-tessa", targetId: other }, "dm", {
    slices: SLICES,
  });
  assert.equal(preview.exists, true, "Transmogrifier warns about a copy already there");
  assert.ok(state.ext[D.ID].log.some((row) => row.kind === "item-copy" && row.itemKind === "page"));
});

test("CA-88: the Archive page header offers «Copia in un’altra campagna…» to the DM only", async () => {
  const { state, registry } = seeded();
  const ctx = {
    state,
    role: "dm",
    lang: "it",
    registry,
    t: (it) => it,
    esc: (v) => String(v ?? ""),
    label: (v) => (typeof v === "object" && v ? v.it : String(v ?? "")),
    icon: () => "",
  };
  registry.attach(ctx);
  const env = { suggestionsOn: () => false };
  const tabs = { bookmarks: [], open: [], active: null };
  const page = JP.readPage(state, "page-tessa", "dm");
  const html = JP._test.pageView(ctx, env, page, tabs);
  assert.match(html, /data-jp-copy-to="page:page-tessa"/);
  assert.match(html, /Copia in un’altra campagna…/);
  ctx.role = "player";
  const reader = JP._test.pageView(ctx, env, JP.readPage(state, "page-tessa", "player"), tabs);
  assert.doesNotMatch(reader, /data-jp-copy-to/);
});

test("H-05: «Marca una voce» lists the Archive pages beside World and Journal entries", async () => {
  const { state } = seeded();
  const safety = await import("../safety-ui.mjs");
  const ctx = {
    state,
    role: "dm",
    lang: "it",
    t: (it) => it,
    esc: (v) => String(v ?? ""),
    label: (v) => (typeof v === "object" && v ? v.it : String(v ?? "")),
  };
  const rows = safety._test.entriesOf(ctx);
  const page = rows.find((row) => row.id === "page-observatory");
  assert.ok(page, "an Archive page is offered");
  assert.match(safety._test.entryTitle(ctx, page), /^Archivio · Il vecchio osservatorio$/);
  assert.ok(
    rows.some((row) => row.kind === "world" || row.kind === "recap" || row.kind === "quest"),
  );
});

test("H-06 (C12): the party award reads the reward's coins from the prefill (Foundry /award)", async () => {
  const loot = await import("../loot.mjs");
  const { harness } = await import("./p4-harness.mjs");
  const h = harness({ role: "dm", areas: [["loot", loot.register]] });
  loot.openAward(h.ctx, { xp: 0, coins: { gp: 50, sp: 3 }, reason: "Ricompensa: 50 mo" });
  const { body } = h.dialogs.at(-1);
  assert.match(body, /name="coin-gp"[^>]*value="50"/);
  assert.match(body, /name="coin-sp"[^>]*value="3"/);
  assert.match(body, /name="coin-cp"[^>]*value="0"/);
  // A prefill without coins keeps them at zero; a malformed amount is ignored.
  loot.openAward(h.ctx, { xp: 10, coins: { gp: -4, pp: "x" } });
  assert.match(h.dialogs.at(-1).body, /name="coin-gp"[^>]*value="0"/);
  assert.match(h.dialogs.at(-1).body, /name="coin-pp"[^>]*value="0"/);
});
