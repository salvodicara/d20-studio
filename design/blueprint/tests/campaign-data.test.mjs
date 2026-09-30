// B50 — Campaign data: copy, archive, snapshots, export and trash. Domain commands, the
// registry integration, the real store (Undo, persistence, reload) and the UI handlers.
import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState, createStore } from "../state.mjs";
import { esc, icon } from "../ui.mjs";
import { createRegistry } from "../registry.mjs";
import * as c from "../campaign-content.mjs";
import * as cm from "../campaign-members.mjs";
import * as D from "../campaign-data-domain.mjs";
import * as ui from "../campaign-data.mjs";

const NOW = Date.parse("2026-09-24T10:00:00.000Z");
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;
// The loaded area slices of the app (name and version), as registry.slices() lists them.
const SLICES = [
  { name: "handouts", version: 1 },
  { name: "handouts-prep", version: 1 },
  { name: "random-tables", version: 1 },
  { name: "loot", version: 1 },
  { name: "encounter-builder", version: 1 },
];
const memory = () => {
  const values = new Map();
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
  };
};
function makeRegistry() {
  const registry = createRegistry({ logger: null, document: null, deviceStorage: memory() });
  registry.use(cm.ID, cm.register);
  registry.use(ui.ID, ui.register);
  return registry;
}
// Seed plus a little synthetic area data, as the real areas would seed it.
function seeded() {
  const state = createInitialState();
  makeRegistry().initState(state);
  state.ext.handouts = {
    materials: [{ id: "material-crypt", title: "Cripta", playerText: "Scala di pietra" }],
  };
  state.extVersions.handouts = 1;
  state.ext["random-tables"] = {
    tables: [{ id: "swamp", name: { it: "Palude", en: "Swamp" }, results: [] }],
  };
  state.extVersions["random-tables"] = 1;
  state.ext["encounter-builder"] = {
    encounters: [{ id: "enc-1", name: "Lanterna", campaignId: "lanterns", rows: [] }],
  };
  state.extVersions["encounter-builder"] = 1;
  return state;
}
// A journal entry written through the real campaign-content commands.
function writeEntry(state, who, id, title, access, kind = "note") {
  const d = c.createCampaignDraft(state, { id, kind, campaignId: "lanterns" }, who);
  c.saveCampaignDraft(
    state,
    id,
    { data: { ...d.data, title, body: `${title} — testo` }, access, expectedDraftRevision: 0 },
    who,
  );
  const preview = c.previewCampaignDraft(state, id, who);
  assert.equal(preview.canApply, true, JSON.stringify(preview.errors));
  return c.applyCampaignDraft(state, id, { reviewKey: preview.reviewKey }, who).entryId;
}
const PRIVATE = { mode: "private", grants: [] };
const SHARED = { mode: "campaign", grants: [] };
const refusal = (fn, pattern) =>
  assert.throws(
    fn,
    (error) => Boolean(error.it && error.en) && (!pattern || pattern.test(error.it)),
  );
const parked = (state, id) => state.ext[cm.ID].parked[id];
function otherCampaign(state, name = "Rovine di Vetro") {
  return cm.createCampaign(state, { name }, "dm", NOW);
}

test("register adds the DM section, the export notice, three commands and a preserved slice", () => {
  const registry = makeRegistry();
  assert.equal(registry.report().failed.length, 0);
  const state = createInitialState();
  registry.initState(state);
  assert.deepEqual(state.ext[D.ID], { snapshots: [], exports: [], log: [], missing: {} });
  const slice = registry.slices().find((s) => s.name === D.ID);
  assert.equal(slice.undo, "preserve");
  const dm = { state, role: "dm", lang: "it", t: (it) => it };
  const player = { ...dm, role: "player" };
  assert.ok(registry.get("campaign-section", "campaign-data", dm));
  assert.equal(registry.get("campaign-section", "campaign-data", player), null);
  assert.ok(registry.get("notifications", "campaign-data-ready"));
  for (const id of ["snapshot", "export", "trash"])
    assert.ok(registry.get("command", `campaign-data.${id}`), id);
  assert.throws(() => D.normalizeSlice({}, D.VERSION + 1));
  assert.deepEqual(D.normalizeSlice(null), D.seedSlice());
});

test("capture: only managers of an active campaign; nobody else's Only me note ever enters", () => {
  const state = seeded();
  const theirs = writeEntry(state, "player", "player-secret", "Segreto di Livia", PRIVATE);
  const shared = writeEntry(state, "player", "player-shared", "Diario di Livia", SHARED);
  const mine = writeEntry(state, "dm", "dm-private", "Appunti del DM", PRIVATE);
  refusal(() => D.captureBundle(state, "lanterns", "player", { slices: SLICES }), /DM o un co-DM/);
  const bundle = D.captureBundle(state, "lanterns", "dm", { slices: SLICES });
  const ids = bundle.entries.map((e) => e.id);
  assert.ok(!ids.includes(theirs), "another member's private note is never captured");
  assert.ok(ids.includes(shared), "a shared entry of another member is readable");
  assert.ok(!ids.includes(mine), "own private notes stay out by default");
  assert.equal(bundle.left.ownPrivate, 1);
  const withMine = D.captureBundle(state, "lanterns", "dm", {
    slices: SLICES,
    includeOwnPrivate: true,
  });
  assert.ok(withMine.entries.some((e) => e.id === mine));
  assert.ok(!JSON.stringify(withMine).includes("Segreto di Livia"));
  // Creatures: NPCs and the DM's own sheet; players' sheets are only listed.
  // R4 sample data (27/09/2026): the ambush scene adds two goblin warriors.
  assert.deepEqual(bundle.creatures.map((a) => a.id).sort(), [
    "doran",
    "goblin-1",
    "goblin-2",
    "goblin-warrior-a",
    "goblin-warrior-b",
  ]);
  assert.deepEqual(bundle.characters.map((a) => a.id).sort(), ["livia", "mira"]);
  assert.ok(!JSON.stringify(bundle).includes('"iria"'), "a private sheet is never read");
  assert.deepEqual(Object.keys(bundle.areas).sort(), [
    "encounter-builder",
    "handouts",
    "random-tables",
  ]);
  assert.equal(bundle.rules.edition, "2024");
});

test("Copy Game: chosen components into a new, independent campaign owned by the copier", () => {
  const state = seeded();
  writeEntry(state, "player", "player-shared", "Diario di Livia", SHARED);
  const before = structuredClone(state.scenes);
  const { campaignId: id, report } = D.copyCampaign(
    state,
    "lanterns",
    { name: "Lanterne — seconda tavola", components: D.COMPONENT_IDS },
    "dm",
    NOW,
    { slices: SLICES },
  );
  assert.equal(cm.roleOf(state, id, "dm"), "owner");
  assert.equal(cm.roleOf(state, id, "player"), "player", "players copied with their role");
  assert.ok(cm.listCampaigns(state, "player").some((row) => row.id === id));
  const copy = parked(state, id);
  assert.equal(copy.campaign.name, "Lanterne — seconda tavola");
  // Its own scene id (other areas key data by it), descending from the original.
  assert.notEqual(copy.scenes[0].id, "old-watch");
  assert.equal(copy.scenes[0].dataCopy.root, "old-watch");
  assert.equal(copy.activeSceneId, copy.scenes[0].id);
  // Players' tokens stay out; creatures are new sheets of the copy.
  // R4 sample data (27/09/2026): the ambush scene adds two goblin warriors.
  assert.equal(report.droppedTokens, 4);
  const actorIds = copy.scenes[0].tokens.map((t) => t.actorId);
  assert.equal(actorIds.length, 3);
  for (const actorId of actorIds) {
    const actor = state.actors[actorId];
    assert.deepEqual(actor.campaignIds, [id]);
    assert.equal(actor.owner, "dm");
    assert.notEqual(actor.dataCopy.from, actorId);
  }
  // Independent: changing the copy leaves the original alone, and vice versa.
  copy.scenes[0].tokens[0].x = 5;
  state.actors[actorIds[0]].hp = 1;
  assert.deepEqual(state.scenes, before);
  assert.equal(state.actors[state.actors[actorIds[0]].dataCopy.from].hp > 1, true);
  // Journal: the player's shared entry travels with the player, still theirs.
  const entries = state.campaignContent.entries.filter((e) => e.campaignId === id);
  assert.ok(entries.some((e) => e.ownerId === "player"));
  assert.deepEqual(Object.keys(copy.ext).sort(), [
    "core-settings",
    "encounter-builder",
    "handouts",
    "random-tables",
  ]);
  assert.equal(
    copy.ext["encounter-builder"].value.encounters[0].campaignId,
    id,
    "area references to the source campaign follow the copy",
  );
  assert.equal(state.campaign.id, "lanterns", "the campaign in play did not change");
  assert.equal(D.activityFor(state, "dm")[0].kind, "copy");
});

test("Copy Game without players or scenes: nobody is added and the starter scene stays", () => {
  const state = seeded();
  writeEntry(state, "player", "player-shared", "Diario di Livia", SHARED);
  const { campaignId: id, report } = D.copyCampaign(
    state,
    "lanterns",
    { name: "Solo per me", components: ["creatures", "journal", "tables"] },
    "dm",
    NOW,
    { slices: SLICES },
  );
  assert.equal(cm.roleOf(state, id, "player"), null);
  assert.ok(!cm.listCampaigns(state, "player").some((row) => row.id === id));
  assert.equal(parked(state, id).scenes[0].name, "Scena iniziale");
  assert.equal(report.skippedEntries, 1, "another member's entry needs that member");
  assert.deepEqual(Object.keys(parked(state, id).ext).sort(), ["core-settings", "random-tables"]);
});

test("Snapshot before the battle, change, diff, restore as copy without overwriting", () => {
  const state = seeded();
  D.takeSnapshot(state, "lanterns", { name: "Prima della battaglia" }, "dm", NOW, {
    slices: SLICES,
  });
  refusal(() => D.takeSnapshot(state, "lanterns", { name: "  " }, "dm", NOW), /nome/);
  const [snapshot] = D.listSnapshots(state, "lanterns");
  assert.equal(snapshot.name, "Prima della battaglia");
  // The battle: the goblin moves and is hurt, a new scene appears.
  const goblin = state.scenes[0].tokens.find((t) => t.actorId === "goblin-1");
  goblin.x = 400;
  state.actors["goblin-1"].hp = 2;
  state.scenes.push({ ...structuredClone(state.scenes[0]), id: "tower", name: "La torre" });
  const now = D.captureBundle(state, "lanterns", "dm", { slices: SLICES });
  const rows = D.diffBundles(snapshot.bundle, now).map((row) => row.it);
  assert.ok(
    rows.some((row) => /Sentinella spostato \(620, 250\) → \(400, 250\)/.test(row)),
    rows,
  );
  assert.ok(rows.includes("Sentinella: PF 7/7 → 2/7"), rows);
  assert.ok(rows.includes("Scena nuova: «La torre»"), rows);
  const { campaignId: id } = D.restoreSnapshotAsCopy(
    state,
    snapshot.id,
    { name: "Lanterne — prima della battaglia" },
    "dm",
    NOW + MINUTE,
    { slices: SLICES },
  );
  const copy = parked(state, id);
  // R4 sample data (27/09/2026): the ambush scene adds two goblin warriors.
  assert.equal(copy.scenes.length, 2);
  const restored = copy.scenes[0].tokens.find(
    (t) => state.actors[t.actorId].dataCopy?.from === "goblin-1",
  );
  assert.equal(restored.x, 620, "the copy is as it was before the battle");
  assert.equal(state.actors[restored.actorId].hp, 7);
  assert.equal(goblin.x, 400, "the campaign in play keeps the battle");
  assert.equal(state.actors["goblin-1"].hp, 2);
  D.deleteSnapshot(state, snapshot.id, "dm", NOW);
  assert.equal(D.listSnapshots(state, "lanterns").length, 0);
});

test("Snapshots keep the last 14 per campaign; players cannot take them", () => {
  const state = seeded();
  for (let i = 0; i < 15; i++)
    D.takeSnapshot(state, "lanterns", { name: `S${i}` }, "dm", NOW + i * MINUTE);
  const names = D.listSnapshots(state, "lanterns").map((row) => row.name);
  assert.equal(names.length, D.SNAPSHOT_KEEP);
  assert.ok(!names.includes("S0"));
  assert.equal(names[0], "S14");
  refusal(() => D.takeSnapshot(state, "lanterns", { name: "x" }, "player", NOW), /DM o un co-DM/);
});

test("Export: JSON re-imports, Markdown reads; ready for 120 minutes, only to who asked", () => {
  const state = seeded();
  writeEntry(state, "player", "player-secret", "Segreto di Livia", PRIVATE);
  writeEntry(state, "dm", "dm-private", "Appunti del DM", PRIVATE);
  D.prepareExport(state, "lanterns", { format: "json" }, "dm", NOW, { slices: SLICES });
  D.prepareExport(state, "lanterns", { format: "markdown", lang: "it" }, "dm", NOW, {
    slices: SLICES,
  });
  const ready = D.readyExports(state, "dm", NOW + MINUTE);
  assert.equal(ready.length, 2);
  assert.equal(D.readyExports(state, "player", NOW).length, 0);
  const json = D.exportFile(state, ready.find((r) => r.format === "json").id, "dm", NOW);
  assert.match(json.name, /^le-lanterne-di-bruma-2026-09-24\.d20campaign\.json$/);
  assert.ok(!json.content.includes("Segreto di Livia"), "another member's Only me note");
  assert.ok(!json.content.includes("Appunti del DM"), "own private note without opt-in");
  const md = D.exportFile(state, ready.find((r) => r.format === "markdown").id, "dm", NOW);
  assert.match(md.content, /^# Le lanterne di Bruma/);
  assert.match(md.content, /## Scene e mappe/);
  assert.match(md.content, /1,5 m per casella/);
  assert.match(md.content, /\| Sentinella \| PNG \| 3 \| 7\/7 \| 13 \|/);
  assert.ok(!md.content.includes("Segreto di Livia"));
  D.prepareExport(state, "lanterns", { format: "json", includeOwnPrivate: true }, "dm", NOW);
  assert.ok(D.readyExports(state, "dm", NOW)[0].content.includes("Appunti del DM"));
  refusal(() => D.exportFile(state, json.id ?? ready[0].id, "dm", NOW + 121 * MINUTE), /120/);
  refusal(() => D.prepareExport(state, "lanterns", { format: "pdf" }, "dm", NOW), /Formato/);
  // Kanka's "export ready" notice, for the DM only (it reads the real clock).
  D.prepareExport(state, "lanterns", { format: "json" }, "dm", Date.now());
  D.prepareExport(state, "lanterns", { format: "markdown" }, "dm", Date.now());
  const registry = makeRegistry();
  const notices = registry
    .get("notifications", "campaign-data-ready")
    .collect({ state, role: "dm", lang: "it" });
  assert.ok(notices.length >= 2);
  assert.deepEqual(notices[0].target, { page: "campaign", params: { tab: "campaign-data" } });
  assert.equal(
    registry.get("notifications", "campaign-data-ready").collect({ state, role: "player" }).length,
    0,
  );
});

test("Import: invalid files refused readably; preview; a new campaign owned by the importer", () => {
  const state = seeded();
  writeEntry(state, "player", "player-shared", "Diario di Livia", SHARED);
  refusal(() => D.parseImportText("# Le lanterne di Bruma"), /JSON/);
  refusal(() => D.parseImportText(JSON.stringify({ format: "other" })), /esportazione/);
  refusal(
    () => D.parseImportText(JSON.stringify({ format: D.FORMAT, formatVersion: 99, profile: {} })),
    /più recente/,
  );
  D.prepareExport(state, "lanterns", { format: "json" }, "dm", NOW, { slices: SLICES });
  const file = D.exportFile(state, D.readyExports(state, "dm", NOW)[0].id, "dm", NOW);
  const raw = JSON.parse(file.content);
  raw.profile.image = "javascript:alert(1)";
  raw.areas["mystery-area"] = { version: 1, value: {} };
  raw.scenes.push({ id: "broken", name: "Rotta", width: -1, height: 2, tokens: [] });
  const parsed = D.parseImportText(JSON.stringify(raw));
  const preview = D.previewImport(parsed.bundle, { slices: SLICES.slice(0, 2) });
  const warnings = [...parsed.warnings, ...preview.warnings].map((w) => w.it).join(" | ");
  assert.match(warnings, /Immagine della campagna non valida/);
  assert.match(warnings, /mystery-area/);
  assert.match(warnings, /Scena «Rotta» non valida/);
  assert.match(warnings, /random-tables/, "an area not loaded here is ignored");
  assert.match(warnings, /I giocatori del file non entrano/);
  // R4 sample data (27/09/2026): the ambush scene adds two goblin warriors.
  assert.equal(preview.counts.scenes, 2);
  const { campaignId: id, report } = D.importCampaign(
    state,
    parsed.bundle,
    { name: "Lanterne importate" },
    "player",
    NOW,
    { slices: SLICES.slice(0, 2) },
  );
  assert.equal(cm.roleOf(state, id, "player"), "owner");
  assert.equal(cm.roleOf(state, id, "dm"), null, "the file's members never join");
  assert.equal(report.members, 0);
  assert.equal(cm.metaOf(state, id).image, null);
  const entries = state.campaignContent.entries.filter((e) => e.campaignId === id);
  assert.ok(entries.length >= 2 && entries.every((e) => e.ownerId === "player"));
  assert.deepEqual(report.skippedAreas, ["random-tables", "encounter-builder"]);
  assert.equal(state.campaign.id, "lanterns");
});

test("Archive lists and enforces what stays blocked; Restore brings it back", () => {
  const state = seeded();
  const id = otherCampaign(state);
  refusal(() => D.archiveCampaign(state, id, "player", NOW), /proprietario/);
  D.archiveCampaign(state, id, "dm", NOW);
  assert.equal(cm.metaOf(state, id).status, "archived");
  assert.equal(D.ARCHIVE_BLOCKS.length, 5);
  refusal(() => cm.launchCampaign(state, id, "dm", NOW), /archiviata/);
  refusal(() => cm.createInviteLink(state, id, { role: "player" }, "dm", NOW), /archiviata/);
  refusal(() => D.captureBundle(state, id, "dm"), /archiviata/);
  refusal(
    () => D.copySceneTo(state, { sceneId: "old-watch", targetId: id }, "dm", NOW),
    /destinazione è archiviata/,
  );
  assert.deepEqual(
    D.copyTargets(state, "dm").map((row) => [row.id, row.status]),
    [[id, "archived"]],
  );
  D.restoreArchived(state, id, "dm", NOW);
  assert.equal(cm.metaOf(state, id).status, "active");
  refusal(() => D.restoreArchived(state, id, "dm", NOW), /non è archiviata/);
});

test("Delete by typing the name, 30-day trash, recover, then purge for good", () => {
  const state = seeded();
  const { campaignId: id } = D.copyCampaign(
    state,
    "lanterns",
    { name: "Copia da buttare" },
    "dm",
    NOW,
    { slices: SLICES },
  );
  const copies = Object.values(state.actors).filter((a) => a.dataCopy?.campaignId === id);
  // R4 sample data (27/09/2026): the ambush scene adds two goblin warriors.
  assert.equal(copies.length, 5);
  refusal(() => D.deleteCampaign(state, id, "copia da buttare!", "dm", NOW), /nome della campagna/);
  D.deleteCampaign(state, id, "Copia da buttare", "dm", NOW);
  let [row] = D.listTrash(state, "dm", NOW + DAY);
  assert.equal(row.id, id);
  assert.equal(row.trash.daysLeft, 29);
  assert.equal(D.listTrash(state, "player", NOW).length, 0);
  D.recoverCampaign(state, id, "dm", NOW + DAY);
  assert.equal(cm.metaOf(state, id).status, "active");
  D.deleteCampaign(state, id, "Copia da buttare", "dm", NOW + 2 * DAY);
  refusal(() => D.recoverCampaign(state, id, "dm", NOW + 33 * DAY), /30 giorni è scaduto/);
  refusal(() => D.purgeCampaign(state, id, "sbagliato", "dm", NOW), /nome della campagna/);
  // Writing done while the copy was in play: a player's note and a DM world entry.
  const note = writeEntry(state, "player", "player-note", "Nota di Livia", SHARED);
  const world = writeEntry(state, "dm", "dm-world", "La torre", SHARED, "world");
  for (const entryId of [note, world])
    state.campaignContent.entries.find((e) => e.id === entryId).campaignId = id;
  const result = D.purgeCampaign(state, id, "Copia da buttare", "dm", NOW + 3 * DAY);
  assert.deepEqual(result, { creatures: 5, notesKept: 1 });
  const kept = state.campaignContent.entries.find((e) => e.id === note);
  assert.equal(kept.campaignId, null, "a note stays with its author, without campaign");
  assert.deepEqual(kept.access, { mode: "private", grants: [] });
  assert.equal(c.getCampaignEntry(state, note, "player").data.title, "Nota di Livia");
  assert.ok(!state.campaignContent.entries.some((e) => e.id === world), "world entry removed");
  assert.equal(cm.metaOf(state, id), null);
  assert.equal(parked(state, id), undefined);
  for (const actor of copies) assert.equal(state.actors[actor.id], undefined);
  assert.ok(state.actors.livia && state.actors["goblin-1"], "originals and players' sheets stay");
  // A campaign past its window leaves at the next data command.
  const other = otherCampaign(state, "Vecchia");
  D.deleteCampaign(state, other, "Vecchia", "dm", NOW);
  assert.deepEqual(D.purgeExpired(state, NOW + 29 * DAY), []);
  assert.deepEqual(D.purgeExpired(state, NOW + 31 * DAY), ["Vecchia"]);
  assert.equal(cm.metaOf(state, other), null);
  assert.equal(D.activityFor(state, "dm")[0].kind, "purged-expired");
});

test("Copy a scene to another own campaign: tokens of players stay out, overwrite warning", () => {
  const state = seeded();
  const target = otherCampaign(state);
  refusal(() => D.previewSceneCopy(state, { sceneId: "old-watch", targetId: "lanterns" }, "dm"));
  refusal(
    () => D.previewSceneCopy(state, { sceneId: "old-watch", targetId: target }, "player"),
    /DM o un co-DM/,
  );
  const first = D.previewSceneCopy(state, { sceneId: "old-watch", targetId: target }, "dm");
  assert.equal(first.existing, null);
  assert.deepEqual(first.dropped.sort(), ["Livia", "Mira"]);
  assert.deepEqual(first.kept.sort(), ["Doran", "Esploratore", "Sentinella"]);
  D.copySceneTo(state, { sceneId: "old-watch", targetId: target, mode: "new" }, "dm", NOW);
  const scenes = parked(state, target).scenes;
  assert.equal(scenes.length, 2);
  // Its own id in the target (other areas key data by scene id), descending from old-watch.
  const copied = scenes.find((s) => s.dataCopy?.root === "old-watch");
  assert.notEqual(copied.id, "old-watch");
  assert.ok(copied.tokens.every((t) => t.actorId.endsWith(`--${target}`)));
  assert.deepEqual(state.actors[`goblin-1--${target}`].campaignIds, [target]);
  // Same object again: warning by object ID, and the choice is required.
  state.actors["goblin-1"].hp = 3;
  const second = D.previewSceneCopy(state, { sceneId: "old-watch", targetId: target }, "dm");
  assert.equal(second.existing.name, "Il cortile dell’osservatorio");
  assert.ok(second.creatures.every((row) => row.exists));
  refusal(
    () => D.copySceneTo(state, { sceneId: "old-watch", targetId: target, mode: "?" }, "dm", NOW),
    /sostituire/,
  );
  D.copySceneTo(state, { sceneId: "old-watch", targetId: target, mode: "new" }, "dm", NOW);
  const second2 = parked(state, target).scenes.at(-1);
  assert.equal(second2.name, "Il cortile dell’osservatorio (2)");
  assert.equal(second2.dataCopy.root, second2.id, "a separate scene from now on");
  assert.equal(state.actors[`goblin-1--${target}`].hp, 7, "keeping both leaves the copy alone");
  const result = D.copySceneTo(
    state,
    { sceneId: "old-watch", targetId: target, mode: "replace" },
    "dm",
    NOW,
    { slices: SLICES },
  );
  assert.equal(result.replaced, true);
  assert.equal(state.actors[`goblin-1--${target}`].hp, 3, "replacing overwrites the copy");
  const [auto] = D.listSnapshots(state, target);
  assert.equal(auto.kind, "auto");
  assert.match(auto.label.it, /Prima della copia/);
  const lineage = parked(state, target).scenes.filter((s) => s.dataCopy?.root === "old-watch");
  assert.deepEqual(
    lineage.map((s) => s.id),
    [copied.id],
    "replaced in place",
  );
});

// The shell's commit and undo (app.mjs) with the real store and registry hooks.
function shell() {
  const storage = memory();
  const registry = makeRegistry();
  let store = createStore({ storage });
  registry.initState(store.state);
  store.persist();
  return {
    get state() {
      return store.state;
    },
    commit(label, mutator, options = {}, role = "dm") {
      store.commit(label, mutator, role, {
        shared: !options.local,
        visibility: options.visibility,
        undoable: options.undoable,
      });
      if (options.rebaseHistory)
        for (const entry of store.history) options.rebaseHistory(entry.before);
    },
    undo(role = "dm") {
      const current = store.state;
      store.undo(role);
      registry.afterUndo(current, store.state);
      store.persist();
    },
    reload() {
      store = createStore({ storage });
      registry.initState(store.state);
    },
  };
}

test("Real store: data commands survive gameplay Undo and reload", () => {
  const app = shell();
  app.commit("hp", (draft) => {
    draft.actors["goblin-1"].hp = 3;
  });
  let id;
  const options = { undoable: false, visibility: "private" };
  app.commit(
    "copy",
    (draft) => {
      const before = { actors: structuredClone(draft.actors), scenes: [] };
      id = D.copyCampaign(draft, "lanterns", { name: "Copia" }, "dm", NOW).campaignId;
      D.takeSnapshot(draft, "lanterns", { name: "Prima della battaglia" }, "dm", NOW);
      const delta = cm.membershipDelta(before, draft);
      options.rebaseHistory = (snapshot) => cm.applyMembershipDelta(snapshot, delta);
    },
    options,
  );
  app.undo();
  assert.equal(app.state.actors["goblin-1"].hp, 7, "the gameplay change is undone");
  assert.ok(cm.metaOf(app.state, id), "the copy stays");
  const copies = Object.values(app.state.actors).filter((a) => a.dataCopy?.campaignId === id);
  // R4 sample data (27/09/2026): the ambush scene adds two goblin warriors.
  assert.equal(copies.length, 5, "its creatures stay too");
  assert.equal(D.listSnapshots(app.state, "lanterns").length, 1);
  app.reload();
  assert.equal(D.listSnapshots(app.state, "lanterns")[0].name, "Prima della battaglia");
  assert.equal(parked(app.state, id).campaign.name, "Copia");
});

// ---------------------------------------------------------------- UI handlers

function harness({ role = "dm", lang = "it", state = seeded(), registry = makeRegistry() } = {}) {
  const toasts = [];
  const commits = [];
  const ctx = {
    state,
    role,
    lang,
    offline: false,
    view: { page: "campaign", id: "", tab: "campaign-data" },
    t: (it, en) => (ctx.lang === "en" ? en : it),
    label: (value) =>
      typeof value === "object" && value ? value[ctx.lang] || value.it : String(value ?? ""),
    esc,
    icon,
    toasts,
    commits,
    toast: (text, error = false) => toasts.push({ text, error }),
    render() {
      ctx.html = ui.renderSection(ctx);
    },
    navigate(page, params = {}) {
      ctx.view = { page, id: "", tab: "", ...params };
    },
    commit(label, mutator, options = {}) {
      if (ctx.offline && !options.local)
        throw Object.assign(Error("offline"), { it: "Sei senza rete.", en: "You are offline." });
      const draft = structuredClone(ctx.state);
      mutator(draft);
      ctx.state = draft;
      commits.push({ label, options });
      ctx.render();
      return { applied: true, persisted: true };
    },
    dialog(title, body, options = {}) {
      ctx.modal = { title, body, options };
    },
    closeDialog() {},
  };
  ctx.registry = registry;
  registry.attach(ctx);
  return ctx;
}
const form = (entries) => {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
};

test("UI: the DM sees every block; a player gets the reserved notice; English text", () => {
  const ctx = harness();
  ctx.render();
  for (const text of [
    "Dati della campagna",
    "Istantanee",
    "Copia la campagna…",
    "Esporta e importa",
    "Copia in un’altra campagna",
    "Archivio e cestino",
    "Cestino (30 giorni)",
    "Attività sui dati",
  ])
    assert.ok(ctx.html.includes(text), text);
  ctx.role = "player";
  ctx.render();
  assert.match(ctx.html, /Riservato al DM e ai co-DM/);
  ctx.role = "dm";
  ctx.lang = "en";
  ctx.render();
  assert.match(ctx.html, /Campaign data/);
  assert.match(ctx.html, /Take snapshot…/);
});

test("UI: snapshot, copy with a checklist, delete to the trash and recover", () => {
  const ctx = harness();
  ui.handleAction(ctx, "snapshot");
  assert.equal(ctx.modal.title, "Crea un’istantanea");
  ctx.modal.options.onSubmit(form([["name", "Prima della battaglia"]]));
  assert.match(ctx.html, /Prima della battaglia/);
  assert.deepEqual(ctx.commits.at(-1).options.undoable, false);
  assert.equal(ctx.commits.at(-1).options.visibility, "private");
  ui.handleAction(ctx, "copy");
  assert.equal(ctx.modal.title, "Copia la campagna");
  assert.match(ctx.modal.body, /value="scenes" checked/);
  assert.match(ctx.modal.body, /Cosa non si copia mai/);
  ctx.modal.options.onSubmit(
    form([
      ["name", "Seconda tavola"],
      ["component", "scenes"],
      ["component", "creatures"],
    ]),
  );
  const copy = cm.listCampaigns(ctx.state, "dm").find((row) => row.name === "Seconda tavola");
  assert.ok(copy);
  assert.equal(typeof ctx.commits.at(-1).options.rebaseHistory, "function");
  assert.match(ctx.html, /is-new/);
  assert.match(ctx.toasts.at(-1).text, /Copia creata: «Seconda tavola»/);
  ui.handleAction(ctx, "delete-campaign", { id: copy.id });
  assert.throws(
    () => ctx.modal.options.onSubmit(form([["confirmName", "seconda"]])),
    /Type the campaign name/,
  );
  ctx.modal.options.onSubmit(form([["confirmName", "Seconda tavola"]]));
  assert.match(ctx.html, new RegExp(`data-cd-trash="${copy.id}"`));
  assert.match(ctx.html, /recuperabile fino al/);
  ui.handleAction(ctx, "recover", { id: copy.id });
  assert.equal(cm.metaOf(ctx.state, copy.id).status, "active");
  // Offline: the shared command is refused with a readable message.
  ctx.offline = true;
  ui.handleAction(ctx, "archive", { id: copy.id });
  assert.match(ctx.modal.body, /Avviare la campagna ed entrare al Tavolo/);
  assert.throws(() => ctx.modal.options.onSubmit(form([])), /offline/);
  assert.equal(cm.metaOf(ctx.state, copy.id).status, "active");
  ctx.offline = false;
  ctx.modal.options.onSubmit(form([]));
  assert.equal(cm.metaOf(ctx.state, copy.id).status, "archived");
  assert.match(ctx.html, /Bloccato finché non la ripristini \(5\)/);
  ui.handleAction(ctx, "restore-archived", { id: copy.id });
  assert.equal(cm.metaOf(ctx.state, copy.id).status, "active");
});

test("UI: export form, download, diff dialog, scene copy preview and import preview", async () => {
  const ctx = harness();
  ui.handleForm(ctx, "export", form([["format", "markdown"]]));
  assert.match(ctx.html, /data-cd="download"/);
  const row = D.readyExports(ctx.state, "dm")[0];
  const file = ui.handleAction(ctx, "download", { id: row.id });
  assert.match(file.name, /\.md$/);
  assert.equal(ctx.toasts.at(-1).error, true, "no document in Node: download unavailable");
  ui.handleAction(ctx, "snapshot");
  ctx.modal.options.onSubmit(form([["name", "Prima"]]));
  const snapshot = D.listSnapshots(ctx.state, "lanterns")[0];
  ctx.state.actors["goblin-1"].hp = 1;
  ui.handleAction(ctx, "diff", { id: snapshot.id });
  assert.match(ctx.modal.title, /Differenze da «Prima»/);
  assert.match(ctx.modal.body, /Sentinella: PF 7\/7 → 1\/7/);
  const target = cm.createCampaign(ctx.state, { name: "Altra" }, "dm", NOW);
  ctx.render();
  assert.match(ctx.html, /data-cd-form="scene-copy"/);
  ui.handleForm(
    ctx,
    "scene-copy",
    form([
      ["sceneId", "old-watch"],
      ["targetId", target],
    ]),
  );
  assert.match(ctx.modal.body, /Pedine che restano fuori/);
  ctx.modal.options.onSubmit(form([["mode", "new"]]));
  assert.ok(
    ctx.state.ext[cm.ID].parked[target].scenes.some((s) => s.dataCopy?.root === "old-watch"),
  );
  ui.handleForm(
    ctx,
    "scene-copy",
    form([
      ["sceneId", "old-watch"],
      ["targetId", target],
    ]),
  );
  assert.match(ctx.modal.body, /ha già questa scena/);
  // Import: a JSON export read from a file-like object.
  ui.handleForm(ctx, "export", form([["format", "json"]]));
  const json = D.exportFile(ctx.state, D.readyExports(ctx.state, "dm")[0].id, "dm");
  await ui.importFile(ctx, {
    name: json.name,
    size: json.content.length,
    text: async () => json.content,
  });
  assert.equal(ctx.modal.title, "Importa come nuova campagna");
  assert.match(ctx.modal.body, /value="members" disabled/);
  ctx.modal.options.onSubmit(
    form([
      ["name", "Importata"],
      ["component", "scenes"],
    ]),
  );
  assert.ok(cm.listCampaigns(ctx.state, "dm").some((r) => r.name === "Importata"));
  await ui.importFile(ctx, { name: "x.md", size: 5, text: async () => "# ciao" });
  assert.match(ctx.toasts.at(-1).text, /non è JSON leggibile/);
});

// ---------------------------------------------------------------- review fixes (B50-rf)

// The app's areas whose data lives outside B13's parked record: B35 fog and vision (per
// scene and token), B28 media (scene image, token look), B43 missions and archive and B42
// world map (per campaign id).
async function areaRegistry() {
  const registry = makeRegistry();
  for (const id of ["fog-vision", "media", "quests", "world-map", "token-menu"])
    registry.use(id, (await import(`../${id}.mjs`)).register);
  return registry;
}
async function areaState() {
  const registry = await areaRegistry();
  const state = createInitialState();
  registry.initState(state);
  const slices = [...SLICES, ...registry.slices()];
  return { registry, state, slices };
}
const launch = (state, id) => {
  cm.launchCampaign(state, id, "dm", NOW);
  cm.completeLaunch(state);
};

test("Review: another identity's Only me plans never leave in an export, snapshot or copy", () => {
  const state = seeded();
  // The DM gives Doran to Livia's player (B13 seat); she writes her Only me plan on it,
  // exactly as the sheet's "Edit plan" command does (personalPlans[role], local commit).
  cm.assignSeat(state, "lanterns", "doran", "player", "dm", NOW);
  assert.deepEqual(state.actors.doran.controllers, ["player"]);
  state.actors.doran.personalPlans = { player: "PIANO DI LIVIA" };
  state.actors["goblin-1"].personalPlans = { dm: "Piano del DM" };
  state.actors["goblin-2"].futurePlan = "Vecchio piano del DM";
  assert.equal(D.ownPrivateCount(state, "lanterns", "dm"), 2);
  assert.equal(D.ownPrivateCount(state, "lanterns", "player"), 1);
  D.prepareExport(state, "lanterns", { format: "json" }, "dm", NOW, { slices: SLICES });
  let json = D.readyExports(state, "dm", NOW)[0].content;
  for (const text of ["PIANO DI LIVIA", "Piano del DM", "Vecchio piano del DM"])
    assert.ok(!json.includes(text), text);
  assert.equal(JSON.parse(json).left.ownPrivate, 2, "own plans left out are counted");
  D.prepareExport(state, "lanterns", { format: "json", includeOwnPrivate: true }, "dm", NOW);
  json = D.readyExports(state, "dm", NOW)[0].content;
  assert.ok(json.includes("Piano del DM") && json.includes("Vecchio piano del DM"));
  assert.ok(!json.includes("PIANO DI LIVIA"), "another identity's plan never, even on opt-in");
  D.takeSnapshot(state, "lanterns", { name: "Prima" }, "dm", NOW, { slices: SLICES });
  const stored = JSON.stringify(D.listSnapshots(state, "lanterns")[0].bundle);
  for (const text of ["PIANO DI LIVIA", "Piano del DM", "Vecchio piano del DM"])
    assert.ok(!stored.includes(text), `snapshot holds ${text}`);
  // A co-DM's copy never takes the owner's plans, whatever they choose.
  cm.setMemberRole(state, "lanterns", "player", "co-dm", "dm", NOW);
  const { campaignId } = D.copyCampaign(
    state,
    "lanterns",
    { name: "Copia di Livia", includeOwnPrivate: true },
    "player",
    NOW,
    { slices: SLICES },
  );
  const copies = Object.values(state.actors).filter((a) => a.dataCopy?.campaignId === campaignId);
  assert.ok(copies.length >= 3);
  const text = JSON.stringify(copies);
  assert.ok(!text.includes("Piano del DM") && !text.includes("Vecchio piano del DM"));
  assert.ok(text.includes("PIANO DI LIVIA"), "the copier's own plan travels on request");
  // Scene copy into a campaign of the co-DM: the owner's legacy plan stays behind.
  const target = cm.createCampaign(state, { name: "Tavolo di Livia" }, "player", NOW);
  D.copySceneTo(state, { sceneId: "old-watch", targetId: target }, "player", NOW, {
    slices: SLICES,
  });
  const goblin2 = Object.values(state.actors).find(
    (a) => a.dataCopy?.from === "goblin-2" && a.campaignIds.includes(target),
  );
  assert.equal(goblin2.futurePlan, undefined);
});

test("Review: copies get their own scene ids, so fog, lights and looks change per campaign", async () => {
  const { state, slices } = await areaState();
  const tower = state.scenes.find((s) => s.id === "lantern-tower");
  assert.ok(tower, "the fog-vision area adds its tower scene");
  // B12 token settings: a red ring on the sentry's token, a disguised name.
  state.ext["token-menu"].tokens["token-goblin-1"] = { ring: "red", size: "tiny" };
  state.ext["token-menu"].names["goblin-1"] = { hidden: true, trueName: "Sentinella" };
  const { campaignId: id } = D.copyCampaign(state, "lanterns", { name: "Copia" }, "dm", NOW, {
    slices,
  });
  const copyScenes = parked(state, id).scenes;
  assert.equal(copyScenes.length, state.scenes.length);
  for (const scene of copyScenes) {
    assert.ok(!state.scenes.some((s) => s.id === scene.id), `${scene.id} reused`);
    assert.ok(state.scenes.some((s) => s.id === scene.dataCopy.root));
  }
  const copyTower = copyScenes.find((s) => s.dataCopy.root === "lantern-tower");
  const fog = state.ext["fog-vision"];
  assert.deepEqual(fog.scenes[copyTower.id], fog.scenes["lantern-tower"], "lights travel");
  const copyGoblin = Object.values(state.actors).find(
    (a) => a.dataCopy?.from === "goblin-1" && a.campaignIds.includes(id),
  );
  assert.deepEqual(state.ext.media.looks[copyGoblin.id], state.ext.media.looks["goblin-1"]);
  const tokenMenu = parked(state, id).ext["token-menu"].value;
  assert.deepEqual(tokenMenu.tokens["token-goblin-1"], { ring: "red", size: "tiny" });
  assert.deepEqual(tokenMenu.names[copyGoblin.id], { hidden: true, trueName: "Sentinella" });
  const world = state.ext["world-map"].campaigns[id];
  const oldWatch = copyScenes.find((s) => s.dataCopy.root === "old-watch");
  assert.ok(
    world.pins.some((p) => p.sceneId === oldWatch.id),
    "a pin opens the copy's scene",
  );
  // Play the copy: its torch goes out; back in the original, the torch still burns.
  const fogDomain = await import("../fog-vision-domain.mjs");
  launch(state, id);
  fogDomain.toggleLight(state, "dm", copyTower.id, "tower-torch");
  launch(state, "lanterns");
  const torch = (sceneId) =>
    state.ext["fog-vision"].scenes[sceneId].lights.find((l) => l.id === "tower-torch").on;
  assert.equal(torch("lantern-tower"), true, "the original's light did not change");
  assert.equal(torch(copyTower.id), false);
  // Transmogrifier: the same scene again is recognised through its origin, not its id.
  const preview = D.previewSceneCopy(state, { sceneId: "old-watch", targetId: id }, "dm");
  assert.equal(preview.existing.id, oldWatch.id);
  assert.ok(
    preview.creatures.every((c) => c.exists),
    "creature copies found by origin",
  );
  D.copySceneTo(state, { sceneId: "old-watch", targetId: id, mode: "replace" }, "dm", NOW, {
    slices,
  });
  const lineage = parked(state, id).scenes.filter((s) => s.dataCopy?.root === "old-watch");
  assert.deepEqual(
    lineage.map((s) => s.id),
    [oldWatch.id],
  );
  D.copySceneTo(state, { sceneId: "lantern-tower", targetId: id, mode: "new" }, "dm", NOW, {
    slices,
  });
  const added = parked(state, id).scenes.at(-1);
  assert.notEqual(added.id, copyTower.id);
  assert.equal(added.dataCopy.root, added.id, "kept as a new, separate scene");
  assert.deepEqual(fog.scenes[added.id].lights.length, fog.scenes["lantern-tower"].lights.length);
});

test("Review: missions, archive and world map travel with the copy; nobody else's Only me", async () => {
  const { state, slices } = await areaState();
  const quests = state.ext.quests.campaigns.lanterns;
  quests.notes = {
    player: { "page-guild": { text: "NOTA DI LIVIA" } },
    dm: { "page-guild": { text: "NOTA DEL DM" } },
  };
  quests.views.push({
    id: "view-dm-own",
    name: "Vista mia",
    owner: "dm",
    shared: false,
    source: "all",
    statuses: [],
    layout: "table",
    columns: ["title"],
    sort: "title",
  });
  const world = state.ext["world-map"].campaigns.lanterns;
  const playerEvent = world.events.find((e) => e.visibility === "private" && e.owner === "player");
  assert.ok(playerEvent, "the seed has a player's private event");
  const bundle = D.captureBundle(state, "lanterns", "dm", { slices });
  const pageCount = quests.pages.length;
  assert.equal(D.summarizeBundle(bundle).pages, pageCount);
  const { campaignId: id } = D.copyCampaign(state, "lanterns", { name: "Copia" }, "dm", NOW, {
    slices,
  });
  const copied = state.ext.quests.campaigns[id];
  assert.equal(copied.pages.length, pageCount, "every mission and archive page");
  assert.deepEqual(copied.notes, {}, "no Only me notes without the choice");
  assert.ok(copied.views.every((v) => v.shared));
  const text = JSON.stringify(copied);
  const goblinCopy = Object.values(state.actors).find(
    (a) => a.dataCopy?.from === "goblin-1" && a.campaignIds.includes(id),
  );
  assert.ok(text.includes(`"id":"${goblinCopy.id}"`), "actor references follow the copy");
  assert.ok(!text.includes('"kind":"scene","id":"old-watch"'), "scene references follow");
  const copiedWorld = state.ext["world-map"].campaigns[id];
  assert.ok(!copiedWorld.events.some((e) => e.id === playerEvent.id), "player's private event");
  assert.equal(copiedWorld.pins.length, world.pins.length);
  // With the choice: the DM's own note and view travel; Livia's never.
  const mine = D.copyCampaign(
    state,
    "lanterns",
    { name: "Copia con note", includeOwnPrivate: true },
    "dm",
    NOW,
    { slices },
  ).campaignId;
  const withMine = JSON.stringify(state.ext.quests.campaigns[mine]);
  assert.ok(withMine.includes("NOTA DEL DM") && withMine.includes("view-dm-own"));
  assert.ok(!withMine.includes("NOTA DI LIVIA"));
  assert.ok(!state.ext["world-map"].campaigns[mine].events.some((e) => e.id === playerEvent.id));
  // Export: missions and world go in the file, the media library references never.
  D.prepareExport(state, "lanterns", { format: "json" }, "dm", NOW, { slices });
  const file = JSON.parse(D.readyExports(state, "dm", NOW)[0].content);
  assert.ok(file.linked.quests && file.linked["world-map"] && file.linked["fog-vision"]);
  assert.equal(file.linked.media, undefined);
  assert.ok(!JSON.stringify(file).includes("NOTA DI LIVIA"));
  D.prepareExport(state, "lanterns", { format: "markdown" }, "dm", NOW, { slices });
  const md = D.readyExports(state, "dm", NOW)[0].content;
  assert.match(md, /## Missioni e archivio/);
  assert.match(md, new RegExp(quests.pages.find((p) => p.type === "quest").title));
  // Import: the missions come back, normalised by their own area, for the importer only.
  const parsed = D.parseImportText(JSON.stringify(file));
  const imported = D.importCampaign(state, parsed.bundle, { name: "Importata" }, "player", NOW, {
    slices,
  }).campaignId;
  assert.equal(state.ext.quests.campaigns[imported].pages.length, pageCount);
  assert.ok(state.ext["world-map"].campaigns[imported].maps.length > 0);
  // Show changes: a mission edited after the snapshot.
  D.takeSnapshot(state, "lanterns", { name: "Prima" }, "dm", NOW, { slices });
  quests.pages[0].title = "Titolo cambiato";
  const now = D.captureBundle(state, "lanterns", "dm", { slices });
  const rows = D.diffBundles(D.listSnapshots(state, "lanterns")[0].bundle, now).map((r) => r.it);
  assert.ok(rows.includes("Missioni e archivio: modificati"), rows);
});

test("Review: gameplay Undo after a copy keeps the copy's missions, lights and looks", async () => {
  const registry = await areaRegistry();
  const storage = memory();
  const store = createStore({ storage });
  registry.initState(store.state);
  const ctx = harness({ state: store.state, registry });
  // The shell's commit on the real store, with the history rebase of app.mjs.
  ctx.commit = (label, mutator, options = {}) => {
    store.commit(label, mutator, "dm", {
      shared: !options.local,
      visibility: options.visibility,
      undoable: options.undoable,
    });
    if (options.rebaseHistory)
      for (const entry of store.history) options.rebaseHistory(entry.before);
    ctx.state = store.state;
    ctx.render();
    return { applied: true, persisted: true };
  };
  ctx.commit("hp", (draft) => {
    draft.actors["goblin-1"].hp = 3;
  });
  ui.handleAction(ctx, "copy");
  ctx.modal.options.onSubmit(
    form([["name", "Seconda tavola"], ...D.COMPONENT_IDS.map((id) => ["component", id])]),
  );
  const copy = cm.listCampaigns(ctx.state, "dm").find((row) => row.name === "Seconda tavola");
  const current = store.state;
  store.undo("dm");
  registry.afterUndo(current, store.state);
  const state = store.state;
  assert.equal(state.actors["goblin-1"].hp, 7, "the gameplay change is undone");
  assert.ok(state.ext.quests.campaigns[copy.id], "the copy's missions stay");
  assert.ok(state.ext["world-map"].campaigns[copy.id]);
  const tower = parked(state, copy.id).scenes.find((s) => s.dataCopy.root === "lantern-tower");
  assert.ok(state.ext["fog-vision"].scenes[tower.id], "the copy's lights stay");
  const goblin = Object.values(state.actors).find(
    (a) => a.dataCopy?.from === "goblin-1" && a.campaignIds.includes(copy.id),
  );
  assert.ok(state.ext.media.looks[goblin.id], "the copy's token look stays");
});

test("Review: purge removes the campaign's missions, lights and looks, never the original's", async () => {
  const { state, slices } = await areaState();
  const { campaignId: id } = D.copyCampaign(state, "lanterns", { name: "Da buttare" }, "dm", NOW, {
    slices,
  });
  const tower = parked(state, id).scenes.find((s) => s.dataCopy.root === "lantern-tower");
  D.deleteCampaign(state, id, "Da buttare", "dm", NOW);
  D.purgeCampaign(state, id, "Da buttare", "dm", NOW);
  assert.equal(state.ext.quests.campaigns[id], undefined);
  assert.equal(state.ext["world-map"].campaigns[id], undefined);
  assert.equal(state.ext["fog-vision"].scenes[tower.id], undefined);
  assert.ok(state.ext["fog-vision"].scenes["lantern-tower"], "the original keeps its lights");
  assert.ok(state.ext.quests.campaigns.lanterns && state.ext.media.looks["goblin-1"]);
});

test("Review: palette commands are for the campaign's DM and co-DMs only", () => {
  const registry = makeRegistry();
  const state = createInitialState();
  registry.initState(state);
  const dm = { state, role: "dm", lang: "it", t: (it) => it };
  const player = { ...dm, role: "player" };
  for (const id of ["snapshot", "export", "trash"]) {
    assert.ok(registry.get("command", `campaign-data.${id}`, dm), id);
    assert.equal(registry.get("command", `campaign-data.${id}`, player), null, id);
  }
});

test("Review: the campaign's enabled homebrew travels with a copy, not with an import", () => {
  const state = seeded();
  state.campaign.enabledContent = [{ id: "hb-lantern-oil", revisionId: "r1" }];
  const { campaignId: id } = D.copyCampaign(state, "lanterns", { name: "Copia" }, "dm", NOW, {
    slices: SLICES,
  });
  assert.deepEqual(parked(state, id).campaign.enabledContent, state.campaign.enabledContent);
  D.prepareExport(state, "lanterns", { format: "json" }, "dm", NOW, { slices: SLICES });
  const parsed = D.parseImportText(D.readyExports(state, "dm", NOW)[0].content);
  const preview = D.previewImport(parsed.bundle, { slices: SLICES });
  assert.ok(preview.warnings.some((w) => /Homebrew/.test(w.it)));
  const imported = D.importCampaign(state, parsed.bundle, { name: "I" }, "dm", NOW, {
    slices: SLICES,
  }).campaignId;
  assert.equal(parked(state, imported).campaign.enabledContent, undefined);
});
