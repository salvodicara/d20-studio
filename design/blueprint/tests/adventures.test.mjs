// B49 — Adventures and reusable packages: domain (package, relink, update, requirements,
// new campaign, export) with the real store and the real neighbouring areas (B13 campaigns,
// B15 materials, B25 tables, B19 encounters), and the page handlers through the registry.
import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc, icon } from "../ui.mjs";
import * as adv from "../adventures.mjs";
import * as cm from "../campaign-members.mjs";
import * as handouts from "../handouts.mjs";
import * as hd from "../handouts-domain.mjs";
import * as rt from "../random-tables.mjs";
import * as eb from "../encounter-builder.mjs";
import * as hb from "../homebrew.mjs";

afterEach(adv.resetAdventuresUI);

const AREAS = [
  ["campaign-members", cm.register],
  ["handouts", handouts.register],
  ["random-tables", rt.register],
  ["encounter-builder", eb.register],
  ["adventures", adv.register],
];

/** Real store + registry with the areas, and a ctx whose commit/undo follow app.mjs. */
function harness({ role = "dm", lang = "it", areas = AREAS } = {}) {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const store = createStore({ storage });
  const registry = createRegistry({ document: undefined, logger: null, deviceStorage: storage });
  for (const [id, register] of areas) {
    const row = registry.use(id, register);
    assert.equal(row.status, "built", `${id}: ${row.error ?? ""}`);
  }
  registry.initState(store.state);
  store.persist();
  const toasts = [];
  const dialogs = [];
  const ctx = {
    get state() {
      return store.state;
    },
    role,
    lang,
    view: { page: "adventures", id: "", tab: "" },
    t: (it, en) => (ctx.lang === "en" ? en : it),
    label: (v) =>
      typeof v === "object" && v ? v[ctx.lang] || v.it || v.en || "" : String(v ?? ""),
    esc,
    icon,
    registry,
    toast: (text, error = false) => toasts.push({ text, error }),
    navigate: (page, params = {}) => {
      ctx.view = { page, id: params.id ?? "", tab: params.tab ?? "" };
    },
    render() {},
    dialog: (title, body, options) => dialogs.push({ title, body, options }),
    commit(label, mutator, options = {}) {
      const before = store.state;
      try {
        store.commit(label, mutator, ctx.role, {
          shared: !options.local,
          visibility: options.visibility,
          undoable: options.undoable,
        });
      } catch (error) {
        if (error?.constructor === Error) error.refusal = true;
        throw error;
      }
      if (options.newUndoVisit) store.history.length = 0;
      if (options.rebaseHistory)
        for (const entry of store.history) options.rebaseHistory(entry.before);
      registry.emitStateEvents(before, store.state);
      if (options.afterCommit) options.afterCommit(store.state);
      return { applied: true, persisted: true };
    },
    undo() {
      const current = store.state;
      store.undo(ctx.role);
      registry.afterUndo(current, store.state);
      store.persist();
    },
    canUndo: () => store.history.at(-1)?.controller === ctx.role,
    undoLabel: () => store.history.at(-1)?.label ?? "",
  };
  const specs = Object.fromEntries(
    registry.slices().map((d) => [d.name, { version: d.version, normalize: d.normalize }]),
  );
  return { store, registry, ctx, toasts, dialogs, specs };
}
const slice = (state) => state.ext[adv.ID];
const refusal = (fn, pattern) =>
  assert.throws(fn, (error) => Boolean(error.it) && (!pattern || pattern.test(error.it)));
const CRYPT_PICKS = [
  "scene:old-watch",
  "material:material-crypt",
  "material:material-notice",
  "table:swamp-encounters",
  "encounter:enc-lantern",
];
function createCrypt(h) {
  return adv.submitCreate(h.ctx, {
    title: "La cripta",
    summary: "Il cortile, la cripta e chi ha riacceso la lanterna.",
    startSceneKey: "scene:old-watch",
    introKey: "material:material-notice",
    picks: CRYPT_PICKS,
  });
}
/** B13 "Create campaign": a second, parked campaign run by the DM. */
function secondCampaign(h, name = "Gruppo del giovedì") {
  let id;
  h.ctx.commit("create", (draft) => {
    id = cm.createCampaign(draft, { name }, "dm");
  });
  return id;
}
const parked = (state, id) => state.ext[cm.ID].parked[id];
const parkedExt = (state, id, name) => parked(state, id).ext?.[name]?.value;

test("register: Library section, page, Preparation section, notices, search and a guard for the DM only", () => {
  const h = harness();
  const { registry, ctx } = h;
  assert.ok(registry.get("library-section", adv.ID));
  assert.ok(registry.get("route", adv.ID));
  assert.ok(registry.get("preparation-section", adv.ID));
  assert.ok(registry.get("notifications", `${adv.ID}-updates`));
  assert.ok(registry.get("search", adv.ID));
  assert.ok(registry.get("draft-guard", `${adv.ID}-editor`));
  // R6 BI-45: the player's only section of this area is the compatibility packs (read only
  // for campaign packs; enabling stays with the DM).
  assert.deepEqual(
    registry.list("library-section", { ...ctx, role: "player" }).map((s) => s.id),
    [adv.PACKS],
  );
  assert.equal(registry.get("route", adv.ID, { ...ctx, role: "player" }), null);
  // Seed: the sample package received ready-made, with its homebrew bundle.
  const seeded = slice(ctx.state);
  assert.deepEqual(
    seeded.adventures.map((a) => a.id),
    ["adv-faro"],
  );
  assert.equal(adv.latest(seeded.adventures[0]).requires.length, 1);
  assert.deepEqual(adv.normalizeSlice(structuredClone(seeded), 1), seeded);
  assert.throws(() => adv.normalizeSlice(seeded, 2));
  assert.deepEqual(adv.normalizeSlice(null, 0).adventures[0].id, "adv-faro");
});

test("(1) La cripta: scenes, NPCs, handouts, tables and encounter with dependencies listed", () => {
  const h = harness();
  const pack = adv.collectPackage(h.ctx.state, "lanterns", CRYPT_PICKS, h.specs, {
    startSceneKey: "scene:old-watch",
  });
  // Required links are added and explained (Scene Packer): token NPCs and the subtable.
  assert.deepEqual(pack.auto.map((a) => [a.key, a.because]).sort(), [
    ["npc:goblin-1", "scene:old-watch"],
    ["npc:goblin-2", "scene:old-watch"],
    ["table:patrol-strength", "table:swamp-encounters"],
  ]);
  assert.deepEqual(pack.external.map((e) => `${e.kind}:${e.id}`).sort(), [
    "art:art-crypt",
    "art:art-notice",
    "srd:srd2024:creature:cultist",
    "srd:srd2024:creature:priest",
  ]);
  assert.equal(pack.external.find((e) => e.kind === "srd").source.revision, "5.2.1");
  // Player characters never travel: their tokens are listed as excluded.
  assert.deepEqual(
    pack.excluded.map((e) => [e.kind, e.name]),
    [
      ["pc-token", "Livia"],
      ["pc-token", "Doran"],
      ["pc-token", "Mira"],
    ],
  );
  const id = createCrypt(h);
  assert.equal(h.ctx.view.id, id);
  const adventure = adv.adventureOf(h.ctx.state, id);
  const v1 = adv.latest(adventure);
  assert.equal(v1.number, 1);
  assert.equal(v1.items.length, 8);
  assert.equal(v1.startSceneKey, "scene:old-watch");
  assert.equal(v1.introKey, "material:material-notice");
  // The initial state: hidden scene, handout never shown, full HP.
  const scene = v1.items.find((i) => i.key === "scene:old-watch").data;
  assert.equal(scene.revealed, false);
  assert.deepEqual(
    scene.tokens.map((t) => t.actorKey),
    ["npc:goblin-1", "npc:goblin-2"],
  );
  assert.equal(scene.pins[0].label, "Pozzo del cortile");
  const notice = v1.items.find((i) => i.key === "material:material-notice").data;
  assert.equal(notice.shows.length, 0);
  assert.equal(notice.access.mode, "none");
  // Package-private: a local commit whose label stays out of the shared log.
  assert.equal(h.ctx.state.log.at(-1).visibility, "private");
  // Refusals: a player, and an empty selection.
  refusal(
    () =>
      adv.createAdventure(
        structuredClone(h.ctx.state),
        { title: "X", picks: CRYPT_PICKS },
        "player",
        h.specs,
      ),
    /Solo il DM/,
  );
  refusal(
    () =>
      adv.createAdventure(structuredClone(h.ctx.state), { title: "X", picks: [] }, "dm", h.specs),
    /almeno un contenuto/,
  );
  refusal(
    () =>
      adv.createAdventure(
        structuredClone(h.ctx.state),
        { title: " ", picks: CRYPT_PICKS },
        "dm",
        h.specs,
      ),
    /Titolo/,
  );
});

test("(2) Import into another campaign by type: relinked references, overwrite warning, separate progress", () => {
  const h = harness();
  const id = createCrypt(h);
  const other = secondCampaign(h);
  const originScenes = () =>
    h.ctx.state.scenes.map((s) => ({ id: s.id, tokens: s.tokens.map((t) => t.actorId) }));
  const before = originScenes();
  const types = ["scene", "npc", "material", "encounter"];
  let plan = adv.planImport(h.ctx.state, id, { campaignId: other, types }, "dm", h.specs);
  assert.equal(plan.blocked, null);
  assert.equal(plan.overwrite, 0);
  assert.deepEqual(new Set(plan.rows.map((r) => r.action)), new Set(["create"]));
  const relinks = adv.previewRelinks(h.ctx.state, id, { campaignId: other, types }, "dm", h.specs);
  assert.ok(relinks.relinks.filter((r) => r.kind === "token").every((r) => r.ok));
  // Tables unchecked: nothing written there; the origin is not a target.
  const report = adv.submitImport(h.ctx, id, {
    campaign: other,
    types,
    startScene: false,
    intro: false,
    copies: {},
  });
  assert.equal(report.created.length, 6);
  const state = h.ctx.state;
  const scene = parked(state, other).scenes.find((s) => s.adventure?.id === id);
  assert.ok(scene && scene.id !== "old-watch");
  const npcIds = scene.tokens.map((t) => t.actorId);
  assert.equal(npcIds.length, 2);
  for (const npcId of npcIds) {
    assert.deepEqual(state.actors[npcId].campaignIds, [other]);
    assert.equal(state.actors[npcId].hp, state.actors[npcId].maxHp);
  }
  const materials = parkedExt(state, other, "handouts").materials;
  assert.equal(materials.find((m) => m.title.startsWith("Cripta")).sceneIds[0], scene.id);
  const pins = parkedExt(state, other, "handouts").pins;
  assert.equal(pins.filter((p) => p.sceneId === scene.id).length, 1);
  assert.equal(parkedExt(state, other, "random-tables"), undefined);
  assert.equal(parkedExt(state, other, "encounter-builder").encounters[0].campaignId, other);
  // The origin campaign kept its own content untouched (whatever sample scenes it has).
  assert.deepEqual(originScenes(), before);
  assert.deepEqual(
    state.scenes[0].tokens.map((t) => t.actorId),
    ["livia", "doran", "goblin-1", "goblin-2", "mira"],
  );
  plan = adv.planImport(state, id, { campaignId: "lanterns" }, "dm", h.specs);
  assert.match(plan.blocked.it, /campagna d’origine/);
  // Re-import with every type: Foundry's overwrite warning for the six entries already here.
  plan = adv.planImport(state, id, { campaignId: other }, "dm", h.specs);
  assert.equal(plan.overwrite, 6);
  assert.deepEqual(
    plan.rows.filter((r) => r.action === "create").map((r) => r.key),
    ["table:swamp-encounters", "table:patrol-strength"],
  );
  adv.submitImport(h.ctx, id, {
    campaign: other,
    types: adv.TYPES,
    startScene: false,
    intro: false,
    copies: {},
  });
  const tables = parkedExt(h.ctx.state, other, "random-tables").tables;
  const swamp = tables.find((t) => t.name.it === "Incontri nella palude");
  const patrol = tables.find((t) => t.name.it === "Consistenza della pattuglia");
  assert.equal(swamp.results.find((r) => r.id === "swamp-patrol").subtableId, patrol.id);
  // Same ids after the overwrite: the entries were replaced, not duplicated.
  assert.equal(parked(h.ctx.state, other).scenes.filter((s) => s.adventure?.id === id).length, 1);
  // Progress in the other campaign never reaches the adventure or the origin.
  const copy = parked(h.ctx.state, other).scenes.find((s) => s.adventure?.id === id);
  copy.tokens[0].x = 10;
  assert.equal(adv.latest(adv.adventureOf(h.ctx.state, id)).items[0].data.tokens[0].x, 620);
  assert.equal(h.ctx.state.scenes[0].tokens[2].x, 620);
  const usage = adv.adventureUsage(h.ctx.state, adv.adventureOf(h.ctx.state, id), h.specs);
  assert.deepEqual(
    usage.map((u) => [u.campaignId, u.version, u.modified]),
    [[other, 1, 1]],
  );
});

test("Undo of an import: the campaign in play and a parked campaign both return to their state", () => {
  const h = harness();
  const id = createCrypt(h);
  const other = secondCampaign(h);
  const before = structuredClone(parked(h.ctx.state, other));
  adv.submitImport(h.ctx, id, {
    campaign: other,
    types: adv.TYPES,
    startScene: true,
    intro: true,
    copies: {},
  });
  assert.equal(h.ctx.undoLabel(), "Avventura importata · La cripta");
  assert.notEqual(parked(h.ctx.state, other).scenes.length, before.scenes.length);
  h.ctx.undo();
  // B13 preserves its slice on Undo; the area puts the parked campaign back.
  assert.deepEqual(parked(h.ctx.state, other).scenes, before.scenes);
  assert.equal(parked(h.ctx.state, other).activeSceneId, before.activeSceneId);
  assert.equal(parkedExt(h.ctx.state, other, "handouts"), undefined);
  assert.equal(adv.recordOf(h.ctx.state, other, id), null);
  // The seeded package into the campaign in play: requirements first, then Undo.
  const faro = adv.adventureOf(h.ctx.state, "adv-faro");
  adv.runRequirement(h.ctx, "adv-faro", "install", adv.latest(faro).requires[0], "lanterns");
  adv.runRequirement(h.ctx, "adv-faro", "enable", adv.latest(faro).requires[0], "lanterns");
  const materials = h.ctx.state.ext.handouts.materials.length;
  adv.submitImport(h.ctx, "adv-faro", {
    campaign: "lanterns",
    types: adv.TYPES,
    startScene: false,
    intro: true,
    copies: {},
  });
  assert.equal(h.ctx.state.ext.handouts.materials.length, materials + 1);
  h.ctx.undo();
  assert.equal(h.ctx.state.ext.handouts.materials.length, materials);
  assert.equal(adv.recordOf(h.ctx.state, "lanterns", "adv-faro"), null);
});

test("(3) New version with differences; the update keeps changed entries and offers a copy", () => {
  const h = harness();
  const id = createCrypt(h);
  const other = secondCampaign(h);
  adv.submitImport(h.ctx, id, { campaign: other, types: adv.TYPES, copies: {} });
  // The DM changes the origin: scene description, a new table row; adds a table, drops the encounter.
  h.ctx.commit("edit origin", (draft) => {
    draft.scenes[0].description = "Il cortile è allagato: la pioggia ha riempito il pozzo.";
    draft.ext["random-tables"].tables
      .find((t) => t.id === "swamp-encounters")
      .results.push({
        id: "swamp-heron-stone",
        text: "Un airone di pietra sul guado",
        weight: 1,
        drawn: false,
        subtableId: null,
        values: {},
        cells: {},
      });
  });
  const picks = [
    ...CRYPT_PICKS.filter((k) => k !== "encounter:enc-lantern"),
    "table:lantern-rumours",
  ];
  const preview = adv.rebuildPreview(
    h.ctx.state,
    id,
    { picks, startSceneKey: "scene:old-watch", introKey: "material:material-notice" },
    h.specs,
  );
  assert.deepEqual(
    preview.diff.added.map((i) => i.key),
    ["table:lantern-rumours"],
  );
  assert.deepEqual(
    preview.diff.removed.map((i) => i.key),
    ["encounter:enc-lantern"],
  );
  assert.deepEqual(
    preview.diff.changed.map((i) => [i.key, i.fields]),
    [
      ["scene:old-watch", ["description"]],
      ["table:swamp-encounters", ["results"]],
    ],
  );
  refusal(
    () =>
      adv.publishVersion(
        structuredClone(h.ctx.state),
        id,
        {
          picks,
          startSceneKey: "scene:old-watch",
          introKey: "material:material-notice",
          notes: "",
        },
        "dm",
        h.specs,
      ),
    /Note della versione/,
  );
  assert.equal(
    adv.submitPublish(h.ctx, id, {
      picks,
      startSceneKey: "scene:old-watch",
      introKey: "material:material-notice",
      notes: "Cortile allagato, nuove voci.",
    }),
    2,
  );
  // Unchanged republish is refused: nothing to publish.
  refusal(
    () =>
      adv.publishVersion(
        structuredClone(h.ctx.state),
        id,
        {
          picks,
          startSceneKey: "scene:old-watch",
          introKey: "material:material-notice",
          notes: "x",
        },
        "dm",
        h.specs,
      ),
    /Nessuna differenza/,
  );
  // The other campaign renames its copy of the scene (a local change).
  const copyScene = () =>
    parked(h.ctx.state, other).scenes.find(
      (s) => s.adventure?.id === id && !s.name.includes("(v2)"),
    );
  h.ctx.commit("rename", (draft) => {
    draft.ext[cm.ID].parked[other].scenes.find((s) => s.adventure?.id === id).name =
      "Il cortile (giovedì)";
  });
  const plan = adv.planImport(h.ctx.state, id, { campaignId: other }, "dm", h.specs);
  const row = (key) => plan.rows.find((r) => r.key === key);
  assert.equal(plan.fromVersion, 1);
  assert.deepEqual(
    plan.notes.map((v) => v.notes),
    ["Cortile allagato, nuove voci."],
  );
  assert.equal(row("scene:old-watch").action, "keep");
  assert.equal(row("scene:old-watch").copy, true);
  assert.equal(row("table:swamp-encounters").action, "update");
  assert.equal(row("table:lantern-rumours").action, "create");
  assert.equal(row("npc:goblin-1").action, "same");
  assert.deepEqual(
    plan.orphans.map((o) => o.key),
    ["encounter:enc-lantern"],
  );
  const report = adv.submitImport(h.ctx, id, { campaign: other, types: adv.TYPES, copies: {} });
  assert.equal(report.copies.length, 1);
  const scenes = parked(h.ctx.state, other).scenes.filter((s) => s.adventure?.id === id);
  assert.equal(copyScene().name, "Il cortile (giovedì)");
  assert.equal(
    copyScene().description,
    "Un cortile aperto, senza ostacoli di regole nel primo scenario dimostrativo.",
  );
  const v2copy = scenes.find((s) => s.name === "Il cortile dell’osservatorio (v2)");
  assert.match(v2copy.description, /allagato/);
  // The copy's tokens point at this campaign's NPCs, not at the origin's.
  assert.ok(v2copy.tokens.every((t) => h.ctx.state.actors[t.actorId].campaignIds[0] === other));
  const swamp = parkedExt(h.ctx.state, other, "random-tables").tables.find(
    (t) => t.name.it === "Incontri nella palude",
  );
  assert.ok(swamp.results.some((r) => r.id === "swamp-heron-stone"));
  assert.equal(parkedExt(h.ctx.state, other, "encounter-builder").encounters.length, 1);
  assert.equal(adv.recordOf(h.ctx.state, other, id).version, 2);
  // Declining the copy keeps it on offer; the choice is explicit per entry.
  const again = adv.planImport(h.ctx.state, id, { campaignId: other }, "dm", h.specs);
  assert.equal(again.rows.find((r) => r.key === "scene:old-watch").copy, false);
});

test("(4) Missing homebrew on entry: one action per entry, import unlocked only when ready", () => {
  const h = harness();
  const faro = adv.adventureOf(h.ctx.state, "adv-faro");
  const version = adv.latest(faro);
  let status = adv.requirementStatus(h.ctx.state, version, "lanterns", "dm", h.specs);
  assert.deepEqual(
    status.map((r) => [r.status, r.action]),
    [["missing", "install"]],
  );
  let plan = adv.planImport(h.ctx.state, "adv-faro", { campaignId: "lanterns" }, "dm", h.specs);
  assert.match(plan.blocked.it, /contenuti richiesti/);
  refusal(
    () =>
      adv.applyImport(
        structuredClone(h.ctx.state),
        "adv-faro",
        { campaignId: "lanterns" },
        "dm",
        h.specs,
      ),
    /contenuti richiesti/,
  );
  adv.runRequirement(h.ctx, "adv-faro", "install", status[0].ref, "lanterns");
  // Installed through the Library's own import review, owned by the DM, both revisions.
  const content = h.ctx.state.library.find((c) => c.id === "content-faro-lanterna");
  assert.deepEqual(
    content.revisions.map((r) => r.id),
    ["revision-faro-lanterna-1", "revision-faro-lanterna-2"],
  );
  status = adv.requirementStatus(h.ctx.state, version, "lanterns", "dm", h.specs);
  assert.deepEqual(
    status.map((r) => [r.status, r.action]),
    [["disabled", "enable"]],
  );
  adv.runRequirement(h.ctx, "adv-faro", "enable", status[0].ref, "lanterns");
  assert.deepEqual(h.ctx.state.campaign.enabledContent, [status[0].ref]);
  plan = adv.planImport(
    h.ctx.state,
    "adv-faro",
    { campaignId: "lanterns", intro: true },
    "dm",
    h.specs,
  );
  assert.equal(plan.blocked, null);
  const report = adv.submitImport(h.ctx, "adv-faro", {
    campaign: "lanterns",
    types: adv.TYPES,
    startScene: false,
    intro: true,
    copies: {},
  });
  assert.ok(report.introId);
  // The NPC carries the homebrew lantern; the intro is shown to the players (not its DM notes).
  const npc = Object.values(h.ctx.state.actors).find((a) => a.name === "Custode annegato");
  assert.equal(npc.inventory[0].homebrewRef.revisionId, "revision-faro-lanterna-2");
  const diary = h.ctx.state.ext.handouts.materials.find((m) => m.id === report.introId);
  assert.ok(hd.canReadMaterial(h.ctx.state, diary, "player"));
  assert.ok(hd.unseenShows(h.ctx.state, "player").some((s) => s.materialId === diary.id));
  const projected = hd.projectMaterial(h.ctx.state, diary.id, "player");
  assert.equal(JSON.stringify(projected).includes("Sotto il telo"), false);
  // The pin inside the package was relinked to the imported diary's heading.
  const pin = h.ctx.state.ext.handouts.pins.find((p) => p.label === "La grande lente");
  assert.equal(pin.link.materialId, diary.id);
  // Active scene unchanged (start scene not requested).
  assert.equal(h.ctx.state.activeSceneId, "old-watch");
  // A parked campaign: enabling records an entry that Undo reverts there too.
  const other = secondCampaign(h);
  status = adv.requirementStatus(h.ctx.state, version, other, "dm", h.specs);
  assert.equal(status[0].status, "disabled");
  adv.runRequirement(h.ctx, "adv-faro", "enable", status[0].ref, other);
  assert.equal(parked(h.ctx.state, other).campaign.enabledContent.length, 1);
  h.ctx.undo();
  assert.equal(parked(h.ctx.state, other).campaign.enabledContent, undefined);
});

test("(5) New campaign from the adventure: optional start scene and introduction, enabled homebrew", () => {
  const h = harness();
  adv.runRequirement(
    h.ctx,
    "adv-faro",
    "install",
    adv.latest(adv.adventureOf(h.ctx.state, "adv-faro")).requires[0],
    null,
  );
  // An earlier undoable change stays undoable and keeps the new campaign's creatures.
  h.ctx.commit("earlier", (draft) => {
    draft.actors["goblin-1"].hp = 3;
  });
  const result = adv.submitCampaign(h.ctx, "adv-faro", {
    name: "Il faro · one-shot",
    description: "",
    startScene: true,
    intro: true,
  });
  assert.equal(h.ctx.view.page, "campaigns");
  assert.equal(h.ctx.view.id, result.campaignId);
  const record = parked(h.ctx.state, result.campaignId);
  assert.equal(record.scenes.length, 1);
  assert.equal(record.activeSceneId, record.scenes[0].id);
  assert.equal(record.scenes[0].revealed, true);
  assert.deepEqual(record.campaign.enabledContent, [
    { contentId: "content-faro-lanterna", revisionId: "revision-faro-lanterna-2" },
  ]);
  const diary = record.ext.handouts.value.materials[0];
  assert.equal(diary.access.mode, "all");
  assert.equal(diary.shows.length, 1);
  assert.ok(cm.listCampaigns(h.ctx.state, "dm").some((c) => c.id === result.campaignId));
  const npcId = record.scenes[0].tokens[0].actorId;
  h.ctx.undo();
  assert.equal(h.ctx.state.actors["goblin-1"].hp, 7);
  assert.ok(h.ctx.state.actors[npcId], "the new campaign's NPC survives an earlier Undo");
  assert.ok(adv.recordOf(h.ctx.state, result.campaignId, "adv-faro"));
  // Without the optional actions the empty starter scene stays in play.
  const plain = adv.submitCampaign(h.ctx, "adv-faro", {
    name: "Senza scena",
    startScene: false,
    intro: false,
  });
  const second = parked(h.ctx.state, plain.campaignId);
  assert.equal(second.scenes.length, 2);
  assert.equal(second.activeSceneId, `${plain.campaignId}-scene`);
  assert.equal(second.ext.handouts.value.materials[0].shows.length, 0);
  // Missing homebrew blocks creation until installed.
  const fresh = harness();
  refusal(
    () =>
      adv.createCampaignFromAdventure(
        structuredClone(fresh.ctx.state),
        "adv-faro",
        { name: "X" },
        "dm",
        fresh.specs,
      ),
    /contenuti richiesti/,
  );
});

test("(6) Printable HTML export, with or without DM notes, escaped", () => {
  const h = harness();
  const id = createCrypt(h);
  const adventure = adv.adventureOf(h.ctx.state, id);
  const version = adv.latest(adventure);
  const full = adv.adventureHTML(adventure, version, { lang: "it", dmNotes: true });
  assert.match(full, /^<!doctype html>/);
  assert.match(full, /<h1>La cripta<\/h1>/);
  for (const text of [
    "Scene",
    "PNG",
    "Materiali",
    "Tabelle",
    "Incontri",
    "Sacerdote × 1",
    "Pozzo del cortile",
    "Lastra a pressione",
    "1–2",
  ])
    assert.ok(full.includes(text), text);
  assert.ok(full.includes("System Reference Document 5.2.1"), "SRD attribution");
  const players = adv.adventureHTML(adventure, version, { lang: "en", dmNotes: false });
  assert.match(players, /players’ edition/);
  for (const secret of [
    "Lastra a pressione",
    "Sentinella",
    "Sacerdote",
    "Priest",
    "chiave d’ottone",
  ])
    assert.equal(players.includes(secret), false, secret);
  assert.ok(players.includes("Una scala di pietra scende sotto il cortile."));
  const hostile = { ...adventure, title: "<script>alert(1)</script>" };
  assert.equal(adv.adventureHTML(hostile, version).includes("<script>alert"), false);
  assert.equal(
    adv.exportFileName({ title: "La cripta · Città" }, { number: 2 }),
    "la-cripta-citta-v2.html",
  );
});

test("Blocked imports: combat in the target, a player, a campaign the DM does not run", () => {
  const h = harness();
  const id = createCrypt(h);
  const other = secondCampaign(h);
  const state = structuredClone(h.ctx.state);
  parked(state, other).combat.active = true;
  assert.match(
    adv.planImport(state, id, { campaignId: other }, "dm", h.specs).blocked.it,
    /combattimento/,
  );
  refusal(
    () =>
      adv.applyImport(structuredClone(h.ctx.state), id, { campaignId: other }, "player", h.specs),
    /Solo il DM/,
  );
  assert.deepEqual(
    adv
      .importTargets(h.ctx.state, "dm", adv.adventureOf(h.ctx.state, id))
      .map((t) => [t.id, t.origin]),
    [
      ["lanterns", true],
      [other, false],
    ],
  );
  // Without B13 the only target is the campaign in play.
  const alone = harness({ areas: AREAS.filter(([name]) => name !== "campaign-members") });
  assert.deepEqual(
    adv.importTargets(alone.ctx.state, "dm").map((t) => t.id),
    ["lanterns"],
  );
});

test("Pages: list, editor preview, detail, import plan, Preparation, notices and the draft guard", () => {
  const h = harness();
  const { registry, ctx } = h;
  const library = registry.get("library-section", adv.ID, ctx).render(ctx);
  assert.match(library, /Il faro sommerso/);
  assert.match(library, /data-adv-new/);
  ctx.view = { page: "adventures", id: "", tab: "new" };
  const route = registry.get("route", adv.ID, ctx);
  const editor = route.render(ctx);
  assert.match(editor, /data-adv-form="create"/);
  assert.match(editor, /value="scene:old-watch"/);
  assert.match(editor, /Ancora niente/);
  const id = createCrypt(h);
  ctx.view = { page: "adventures", id, tab: "" };
  let detail = route.render(ctx);
  for (const marker of [
    'data-adv-go="import"',
    'data-adv-go="campaign"',
    'data-adv-go="rebuild"',
    'data-adv-go="print"',
    "Sacerdote",
    "Pedina di Livia",
    "data-adv-undo",
  ])
    assert.ok(detail.includes(marker), marker);
  assert.match(detail, /Ultima modifica: «Avventura creata · La cripta»/);
  const other = secondCampaign(h);
  adv.adventuresUI.forms[`import:${id}`] = {
    campaign: other,
    types: adv.TYPES,
    startScene: false,
    intro: false,
    copies: {},
  };
  ctx.view = { page: "adventures", id, tab: "import" };
  let page = route.render(ctx);
  assert.match(page, /Collegamenti ricostruiti/);
  assert.doesNotMatch(page, /data-adv-overwrite/);
  adv.submitImport(ctx, id, { campaign: other, types: adv.TYPES, copies: {} });
  detail = route.render(ctx);
  assert.match(detail, /data-adv-report/);
  assert.match(detail, /Gruppo del giovedì/);
  adv.adventuresUI.forms[`import:${id}`] = {
    campaign: other,
    types: adv.TYPES,
    startScene: false,
    intro: false,
    copies: {},
  };
  ctx.view = { page: "adventures", id, tab: "import" };
  page = route.render(ctx);
  assert.match(page, /data-adv-overwrite/);
  ctx.view = { page: "adventures", id, tab: "print" };
  assert.match(route.render(ctx), /srcdoc="&lt;!doctype html&gt;/);
  ctx.view = { page: "adventures", id, tab: "rebuild" };
  assert.match(route.render(ctx), /Nessuna differenza/);
  // Preparation lists the adventure created from this campaign.
  ctx.view = { page: "preparation", id: "", tab: adv.ID };
  assert.match(
    registry.get("preparation-section", adv.ID, ctx).render(ctx),
    /Creata da questa campagna/,
  );
  // Draft guard: unsaved choices on the editor page ask before leaving.
  adv.adventuresUI.dirty = true;
  ctx.view = { page: "adventures", id: "", tab: "new" };
  const guard = registry.get("draft-guard", `${adv.ID}-editor`);
  assert.equal(guard.hasDraft(ctx, { page: "home" }), true);
  let proceeded = false;
  guard.confirm(ctx, () => (proceeded = true));
  h.dialogs.at(-1).options.onSubmit();
  assert.equal(proceeded, true);
  assert.equal(adv.adventuresUI.dirty, false);
  // Update notice for the DM once a new version exists (Roll20 patch notice).
  h.ctx.commit("origin", (draft) => {
    draft.scenes[0].name = "Il cortile di notte";
  });
  adv.submitPublish(ctx, id, {
    picks: CRYPT_PICKS,
    startSceneKey: "scene:old-watch",
    introKey: "material:material-notice",
    notes: "Notte.",
  });
  const notices = registry.get("notifications", `${adv.ID}-updates`).collect(ctx);
  assert.equal(notices.length, 1);
  assert.match(notices[0].title.it, /La cripta v2/);
  assert.deepEqual(notices[0].target, { page: adv.ID, params: { id } });
  // Search finds packages by title.
  assert.equal(registry.get("search", adv.ID).search(ctx, "cripta")[0].params.id, id);
});

test("Persistence: adventures, versions and import records survive a reload of the store", () => {
  const h = harness();
  const id = createCrypt(h);
  const other = secondCampaign(h);
  adv.submitImport(h.ctx, id, { campaign: other, types: adv.TYPES, copies: {} });
  const saved = JSON.parse(JSON.stringify(h.store.state));
  const values = new Map([["d20-studio-blueprint-v1", JSON.stringify(saved)]]);
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const reloaded = createStore({ storage });
  const registry = createRegistry({ document: undefined, logger: null, deviceStorage: storage });
  for (const [name, register] of AREAS) registry.use(name, register);
  registry.initState(reloaded.state);
  const record = adv.recordOf(reloaded.state, other, id);
  assert.equal(record.version, 1);
  const specs = Object.fromEntries(
    registry.slices().map((d) => [d.name, { version: d.version, normalize: d.normalize }]),
  );
  const usage = adv.adventureUsage(reloaded.state, adv.adventureOf(reloaded.state, id), specs);
  assert.deepEqual(
    usage.map((u) => u.modified),
    [0],
    "no spurious local change after a reload",
  );
});

// ---------------------------------------------------------------- review fixes (B49-rf)

test("Review: a change on the import form keeps the DM's choices; only a new target resets them", () => {
  const h = harness();
  const other = secondCampaign(h);
  // The first change on a freshly opened page (nothing stored yet) must not re-apply the
  // defaults: unticking the introduction stays unticked.
  const kept = adv.importFormChange(h.ctx.state, "adv-faro", "lanterns", {
    campaign: "lanterns",
    types: adv.TYPES,
    startScene: true,
    intro: false,
    copies: {},
  });
  assert.equal(kept.rerender, false);
  assert.deepEqual([kept.values.startScene, kept.values.intro], [true, false]);
  // Another target campaign: its own defaults (optional actions only on a first import).
  const moved = adv.importFormChange(h.ctx.state, "adv-faro", "lanterns", {
    campaign: other,
    types: ["scene"],
    startScene: false,
    intro: false,
    copies: { "scene:faro-sala": true },
  });
  assert.equal(moved.rerender, true);
  assert.deepEqual(
    [moved.values.startScene, moved.values.intro, moved.values.copies, moved.values.types],
    [true, true, {}, ["scene"]],
  );
  // The page states the campaign it shows, so the form tells a new target from a first change.
  h.ctx.view = { page: "adventures", id: "adv-faro", tab: "import" };
  const page = h.registry.get("route", adv.ID, h.ctx).render(h.ctx);
  assert.match(page, /data-adv-shown-campaign="lanterns"/);
});

/** Adds homebrew requirements to the sample package, shaped like its lantern. */
function addRequirements(h, entries) {
  h.ctx.commit("requirements", (draft) => {
    const version = adv.latest(adv.adventureOf(draft, "adv-faro"));
    const lantern = version.homebrew.contents[0];
    for (const { id, name, dependsOn = null } of entries) {
      const content = structuredClone(lantern);
      content.id = id;
      content.revisions.forEach((revision, i) => {
        revision.id = `${id}-r${i + 1}`;
        revision.contentId = id;
        revision.parentRevisionId = i ? `${id}-r1` : null;
        revision.data.name = { it: name, en: name };
        revision.data.dependencies = dependsOn ? [dependsOn] : [];
      });
      version.homebrew.contents.push(content);
      version.requires.push({
        contentId: id,
        revisionId: `${id}-r2`,
        name: { it: name, en: name },
        via: "Custode annegato",
      });
    }
  });
}

test("Review: Install fixes only its own entry (BG3 one action per entry), with its dependencies", () => {
  const h = harness();
  addRequirements(h, [
    { id: "content-faro-corda", name: "Corda" },
    {
      id: "content-faro-chiave",
      name: "Chiave",
      dependsOn: { contentId: "content-faro-lanterna", revisionId: "revision-faro-lanterna-2" },
    },
  ]);
  const status = () =>
    adv
      .requirementStatus(
        h.ctx.state,
        adv.latest(adv.adventureOf(h.ctx.state, "adv-faro")),
        "lanterns",
        "dm",
        h.specs,
      )
      .map((r) => [r.ref.contentId, r.status]);
  assert.deepEqual(status(), [
    ["content-faro-lanterna", "missing"],
    ["content-faro-corda", "missing"],
    ["content-faro-chiave", "missing"],
  ]);
  adv.runRequirement(
    h.ctx,
    "adv-faro",
    "install",
    { contentId: "content-faro-corda", revisionId: "content-faro-corda-r2" },
    "lanterns",
  );
  assert.deepEqual(status(), [
    ["content-faro-lanterna", "missing"],
    ["content-faro-corda", "disabled"],
    ["content-faro-chiave", "missing"],
  ]);
  // The key needs the lantern: installing the key brings the lantern it depends on.
  adv.runRequirement(
    h.ctx,
    "adv-faro",
    "install",
    { contentId: "content-faro-chiave", revisionId: "content-faro-chiave-r2" },
    "lanterns",
  );
  assert.deepEqual(status(), [
    ["content-faro-lanterna", "disabled"],
    ["content-faro-corda", "disabled"],
    ["content-faro-chiave", "disabled"],
  ]);
});

test("Review: Upgrade adds the required revision to an older copy in the Library", () => {
  const h = harness();
  const version = adv.latest(adv.adventureOf(h.ctx.state, "adv-faro"));
  const ref = version.requires[0];
  h.ctx.commit(
    "older lantern",
    (draft) => {
      const bundle = structuredClone(version.homebrew);
      bundle.contents[0].revisions = bundle.contents[0].revisions.slice(0, 1);
      hb.createHomebrewImportDraft(draft, { id: "older-lantern", bundle }, "dm");
      const preview = hb.previewHomebrewDraft(draft, "older-lantern", "dm");
      hb.applyHomebrewDraft(draft, "older-lantern", { reviewKey: preview.reviewKey }, "dm");
    },
    { local: true },
  );
  let status = adv.requirementStatus(h.ctx.state, version, "lanterns", "dm", h.specs);
  assert.deepEqual(
    status.map((r) => [r.status, r.action]),
    [["outdated", "upgrade"]],
  );
  adv.runRequirement(h.ctx, "adv-faro", "upgrade", status[0].ref, "lanterns");
  assert.equal(h.toasts.at(-1).error, false, h.toasts.at(-1).text);
  assert.deepEqual(
    h.ctx.state.library.find((c) => c.id === ref.contentId).revisions.map((r) => r.id),
    ["revision-faro-lanterna-1", "revision-faro-lanterna-2"],
  );
  status = adv.requirementStatus(h.ctx.state, version, "lanterns", "dm", h.specs);
  assert.deepEqual(
    status.map((r) => [r.status, r.action]),
    [["disabled", "enable"]],
  );
});
