// P10 — campaign data: the running campaign archived and restored (CA-84), deleted after an
// explicit step with a normalised typed name (CA-85), the dependency check on a JSON import
// (CA-75), any item copied to another campaign (CA-88). Synthetic data only.
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import * as cm from "../campaign-members.mjs";
import * as D from "../campaign-data-domain.mjs";
import * as ui from "../campaign-data.mjs";
import * as S from "../campaign-settings-domain.mjs";
import * as hb from "../homebrew.mjs";

const NOW = Date.parse("2026-09-26T10:00:00Z");
const SLICES = [
  { name: "handouts", version: 1, normalize: (v) => ({ materials: [], ...v }) },
  { name: "random-tables", version: 1, normalize: (v) => ({ tables: [], decks: [], ...v }) },
];
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
  state.ext.handouts = {
    materials: [{ id: "material-crypt", title: "Cripta", playerText: "Scala", shows: [{ at: 1 }] }],
  };
  state.extVersions.handouts = 1;
  state.ext["random-tables"] = {
    tables: [{ id: "swamp", name: { it: "Palude", en: "Swamp" }, results: [] }],
    decks: [
      {
        id: "fate",
        name: { it: "Destino", en: "Fate" },
        cards: [{ id: "c1" }, { id: "c2" }],
        pile: ["c2"],
        hands: { livia: ["c1"] },
        table: [],
        discard: [],
        settings: {},
        events: [{ at: 1 }],
      },
    ],
  };
  state.extVersions["random-tables"] = 1;
  return { state, registry };
}
const refusal = (fn, pattern) =>
  assert.throws(fn, (error) => Boolean(error.it && error.en) && (!pattern || pattern.test(error.it)));

test("CA-85 typed-name normalisation: dashes, quotes, spaces and capitals do not matter", () => {
  const name = "Le lanterne di Bruma — Prima della cripta";
  for (const typed of [
    "Le lanterne di Bruma - Prima della cripta",
    "le lanterne di bruma – prima della cripta",
    "Le lanterne  di Bruma-Prima della cripta ",
    "Le lanterne di Bruma — Prima della cripta",
  ])
    assert.ok(cm.sameCampaignName(typed, name), typed);
  assert.ok(cm.sameCampaignName("La torre", "«La torre»"));
  assert.ok(cm.sameCampaignName("L'isola", "L’isola"));
  for (const typed of ["Le lanterne", "Le lanterne di Bruma Prima della cripta!", ""])
    assert.equal(cm.sameCampaignName(typed, name), false, typed);
  assert.equal(cm.sameCampaignName("", ""), false, "an empty name never confirms");
  // Through the delete command of a copy whose name holds an em dash.
  const { state } = seeded();
  const id = cm.createCampaign(state, { name }, "dm", NOW);
  D.deleteCampaign(state, id, "le lanterne di bruma - prima della cripta", "dm", NOW);
  assert.equal(cm.metaOf(state, id).status, "deleted");
});

test("CA-84 the running campaign is archived (Table closed) and restored; blocks still listed", () => {
  const { state, registry } = seeded();
  refusal(() => D.archiveCampaign(state, "lanterns", "player", NOW), /proprietario/);
  D.archiveCampaign(state, "lanterns", "dm", NOW);
  assert.equal(cm.metaOf(state, "lanterns").status, "archived");
  assert.equal(state.campaign.id, "lanterns", "it stays open read-only here");
  refusal(() => cm.createInviteLink(state, "lanterns", { role: "player" }, "dm", NOW), /archiviata/);
  // The Table shows the closed cover to everyone; the owner restores in one step.
  const ctx = (role) => ({
    state,
    role,
    lang: "it",
    t: (it) => it,
    esc: (v) => String(v),
    icon: () => "",
    label: (v) => (typeof v === "object" ? v.it : v),
  });
  const cover = registry.get("table-panel", "campaign-members-closed", ctx("player"));
  assert.ok(cover);
  assert.match(cm.renderClosedCover(ctx("player")), /Campagna archiviata/);
  assert.doesNotMatch(cm.renderClosedCover(ctx("player")), /data-cm="restore"/);
  assert.match(cm.renderClosedCover(ctx("dm")), /data-cm="restore"/);
  D.restoreArchived(state, "lanterns", "dm", NOW);
  assert.equal(cm.metaOf(state, "lanterns").status, "active");
  assert.equal(registry.get("table-panel", "campaign-members-closed", ctx("dm")), null);
  // Palette: «archivia campagna» is the campaign, not the missions archive.
  const archive = registry.get("command", "campaign-data.archive", ctx("dm"));
  assert.ok(archive.keywords.some((k) => k.it === "archivia campagna"));
});

test("CA-85 the running campaign is deleted only after the explicit step, then recovered", () => {
  const { state } = seeded();
  refusal(
    () => D.deleteCampaign(state, "lanterns", "Le lanterne di Bruma", "dm", NOW),
    /archiviala prima/,
  );
  refusal(
    () => D.deleteCampaign(state, "lanterns", "Bruma", "dm", NOW, { closeCurrent: true }),
    /nome della campagna/,
  );
  assert.equal(cm.metaOf(state, "lanterns").status, "active", "a wrong name changes nothing");
  D.deleteCampaign(state, "lanterns", "le lanterne di bruma", "dm", NOW, { closeCurrent: true });
  assert.equal(cm.metaOf(state, "lanterns").status, "deleted");
  refusal(() => D.purgeCampaign(state, "lanterns", "Le lanterne di Bruma", "dm", NOW), /in corso/);
  D.recoverCampaign(state, "lanterns", "dm", NOW + 1000);
  assert.equal(cm.metaOf(state, "lanterns").status, "active");
});

test("CA-75 dependency check on JSON import: ready enabled, missing remembered for Fonti", () => {
  const { state } = seeded();
  // One homebrew content in the DM's Library.
  hb.createHomebrewDraft(state, { id: "beam", kind: "create", type: "feature" }, "dm");
  const draft = hb.getHomebrewDraft(state, "beam", "dm");
  hb.saveHomebrewDraft(
    state,
    "beam",
    {
      expectedRevision: draft.revision,
      data: {
        ...draft.data,
        name: { it: "Raggio di lanterna", en: "Lantern beam" },
        description: { it: "Capacità originale", en: "Original feature" },
        source: {
          kind: "authored",
          edition: "2024",
          label: "Synthetic original",
          reference: "",
          rights: { modify: true, share: true, export: true },
        },
      },
    },
    "dm",
  );
  const preview = hb.previewHomebrewDraft(state, "beam", "dm");
  const { ref } = hb.applyHomebrewDraft(state, "beam", { reviewKey: preview.reviewKey }, "dm");
  state.campaign.enabledContent = [ref, { contentId: "ghost", revisionId: "g1" }];
  D.prepareExport(state, "lanterns", { format: "json" }, "dm", NOW, { slices: SLICES });
  const file = D.exportFile(state, D.readyExports(state, "dm", NOW)[0].id, "dm", NOW);
  const parsed = D.parseImportText(file.content);
  const deps = D.importDependencies(state, parsed.bundle.homebrew, "dm");
  assert.deepEqual(
    deps.map((row) => [row.ref.contentId, row.status, row.action]),
    [
      [ref.contentId, "ready", null],
      ["ghost", "missing", "library"],
    ],
  );
  const { campaignId: id, dependencies } = D.importCampaign(
    state,
    parsed.bundle,
    { name: "Lanterne importate" },
    "dm",
    NOW,
    { slices: SLICES },
  );
  assert.equal(dependencies.length, 2);
  assert.deepEqual(
    state.ext[cm.ID].parked[id].campaign.enabledContent.map((r) => r.contentId),
    [ref.contentId],
    "what the Library holds is enabled in the new campaign",
  );
  assert.deepEqual(
    D.missingDependencies(state, id).map((r) => r.contentId),
    ["ghost"],
  );
  // In the new campaign, Fonti lists the missing one as «mancante».
  cm.launchCampaign(state, id, "dm", NOW + 1000);
  cm.completeLaunch(state);
  const rows = S.homebrewSources(state, "dm");
  assert.ok(rows.some((row) => row.contentId === "ghost" && row.status === "missing"));
  assert.ok(rows.some((row) => row.contentId === ref.contentId && row.status === "on"));
});

test("CA-88 any item to another campaign: entry, creature, handout, table, deck, homebrew", () => {
  const { state } = seeded();
  const other = cm.createCampaign(state, { name: "Rovine di Vetro" }, "dm", NOW);
  const items = D.copyableItems(state, "dm");
  const kinds = new Set(items.map((row) => row.kind));
  for (const kind of ["entry", "creature", "handout", "table", "deck"]) assert.ok(kinds.has(kind), kind);
  refusal(() => D.copyableItems(state, "player").length || D.previewItemCopy(state, { kind: "table", id: "swamp", targetId: other }, "player"));
  // Handout: a fresh copy, not shown yet, in the parked campaign's own data.
  let preview = D.previewItemCopy(state, { kind: "handout", id: "material-crypt", targetId: other }, "dm", { slices: SLICES });
  assert.equal(preview.exists, false);
  D.copyItemTo(state, { kind: "handout", id: "material-crypt", targetId: other }, "dm", NOW, { slices: SLICES });
  const parkedExt = state.ext[cm.ID].parked[other].ext;
  const material = parkedExt.handouts.value.materials.at(-1);
  assert.equal(material.copiedFrom, "material-crypt");
  assert.deepEqual(material.shows, []);
  preview = D.previewItemCopy(state, { kind: "handout", id: "material-crypt", targetId: other }, "dm", { slices: SLICES });
  assert.equal(preview.exists, true, "Transmogrifier warns about a copy already there");
  // Deck: every card back in the pile, no hands.
  D.copyItemTo(state, { kind: "deck", id: "fate", targetId: other }, "dm", NOW, { slices: SLICES });
  const deck = parkedExt["random-tables"].value.decks.at(-1);
  assert.deepEqual(deck.hands, {});
  assert.equal(deck.pile.length, 2);
  // Table.
  D.copyItemTo(state, { kind: "table", id: "swamp", targetId: other }, "dm", NOW, { slices: SLICES });
  assert.equal(parkedExt["random-tables"].value.tables.at(-1).copiedFrom, "swamp");
  // Creature: an independent copy in the other campaign, controlled by nobody else.
  const result = D.copyItemTo(state, { kind: "creature", id: "goblin-1", targetId: other }, "dm", NOW, { slices: SLICES });
  const copy = state.actors[result.copyId];
  assert.deepEqual(copy.campaignIds, [other]);
  assert.deepEqual(copy.controllers, []);
  // Journal entry: a new entry of the other campaign.
  const entry = items.find((row) => row.kind === "entry");
  D.copyItemTo(state, { kind: "entry", id: entry.id, targetId: other }, "dm", NOW, { slices: SLICES });
  assert.ok(
    state.campaignContent.entries.some((row) => row.campaignId === other && row.kind === "recap"),
  );
  // Logged in the data activity.
  assert.ok(state.ext[D.ID].log.some((row) => row.kind === "item-copy" && row.itemKind === "deck"));
});
